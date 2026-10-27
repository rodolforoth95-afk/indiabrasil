#!/usr/bin/env python3
"""India Brazil – catálogos dos fornecedores (uso interno, roda só no computador).

Precisa de um arquivo .env na raiz do projeto com:
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_SECRET_KEY=sb_secret_...

Comandos:
    python3 tools/catalogues.py pending          # cadastros com catálogo e sem resumo
    python3 tools/catalogues.py download IB-XXX  # baixa para catalogues/IB-XXX/
    python3 tools/catalogues.py save IB-XXX resumo.json
    python3 tools/catalogues.py render IB-XXX    # PDFs -> páginas em JPG + texto (para ler)
    python3 tools/catalogues.py queue            # pedidos do botão "Processar com IA" do /admin
    python3 tools/catalogues.py job IB-XXX processing|error ["mensagem"]
    python3 tools/catalogues.py images IB-XXX    # fotos dos produtos (página do catálogo) -> marketplace
    python3 tools/catalogues.py sitemap          # gera sitemap.xml com os produtos publicados (commit + push)
"""
import datetime
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.parse
import subprocess
import urllib.request
import zipfile
from xml.etree import ElementTree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "catalogues")
BUCKET = "catalogues"
# O Python do python.org no Mac não vem com certificados; usa os do sistema
SSL = ssl.create_default_context(cafile="/etc/ssl/cert.pem") if os.path.exists("/etc/ssl/cert.pem") else None


def env():
    vals = {}
    path = os.path.join(ROOT, ".env")
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                vals[k.strip()] = v.strip().strip('"').strip("'")
    url = vals.get("SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = vals.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        sys.exit("Faltam SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo .env")
    return url.rstrip("/"), key


URL, KEY = None, None


def call(method, path, body=None, headers=None, raw=False, data=None):
    h = {"apikey": KEY}
    if KEY.startswith("eyJ"):  # chave service_role antiga (JWT)
        h["Authorization"] = "Bearer " + KEY
    h.update(headers or {})
    if body is not None:
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(URL + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=120, context=SSL) as r:
            content = r.read()
    except urllib.error.HTTPError as e:
        sys.exit("Erro do Supabase (%s): %s" % (e.code, e.read().decode(errors="replace")[:300]))
    return content if raw else json.loads(content or b"null")


def supplier(ref):
    rows = call("GET", "/rest/v1/suppliers?reference=eq." + urllib.parse.quote(ref) + "&select=*")
    if not rows:
        sys.exit("Referência não encontrada: " + ref)
    return rows[0]


# --- Conversão de planilhas e apresentações para texto (Claude lê PDF e imagem direto) ---

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "a": "http://schemas.openxmlformats.org/drawingml/2006/main"}


def col_index(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def xlsx_to_text(path):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ElementTree.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ElementTree.fromstring(z.read("xl/workbook.xml"))
    names = [s.get("name") for s in wb.find("m:sheets", NS)]
    out = []
    sheets = sorted((n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n)),
                    key=lambda n: int(re.search(r"(\d+)", n.rsplit("/", 1)[1]).group()))
    for i, name in enumerate(sheets):
        out.append("### Sheet: " + (names[i] if i < len(names) else name))
        for row in ElementTree.fromstring(z.read(name)).iter("{%s}row" % NS["m"]):
            cells = {}
            for c in row.findall("m:c", NS):
                v = c.find("m:v", NS)
                if c.get("t") == "s" and v is not None:
                    val = shared[int(v.text)]
                elif c.get("t") == "inlineStr":
                    val = "".join(t.text or "" for t in c.iter("{%s}t" % NS["m"]))
                else:
                    val = v.text if v is not None else ""
                cells[col_index(c.get("r"))] = (val or "").replace("\t", " ").replace("\n", " ")
            if any(cells.values()):
                out.append("\t".join(cells.get(j, "") for j in range(max(cells) + 1)))
    return "\n".join(out)


def pptx_to_text(path):
    z = zipfile.ZipFile(path)
    slides = sorted((n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)),
                    key=lambda n: int(re.search(r"(\d+)", n.rsplit("/", 1)[1]).group()))
    out = []
    for i, name in enumerate(slides, 1):
        root = ElementTree.fromstring(z.read(name))
        lines = ["".join(t.text or "" for t in p.iter("{%s}t" % NS["a"])) for p in root.iter("{%s}p" % NS["a"])]
        out.append("### Slide %d\n%s" % (i, "\n".join(l for l in lines if l.strip())))
    return "\n\n".join(out)


# --- Comandos ---

def cmd_pending():
    rows = call("GET", "/rest/v1/suppliers?select=id,reference,created_at,company_name,catalogue_files,catalogue_link"
                       "&order=created_at.desc")
    done = {r["supplier_id"] for r in call("GET", "/rest/v1/catalogue_summaries?select=supplier_id")}
    todo = [r for r in rows if r["id"] not in done and (r["catalogue_files"] or r["catalogue_link"])]
    if not todo:
        print("Nenhum catálogo pendente.")
    for r in todo:
        n = len(r["catalogue_files"] or [])
        what = "%d arquivo(s)" % n if n else ""
        if r["catalogue_link"]:
            what += (" + " if r["catalogue_files"] else "") + "link " + r["catalogue_link"]
        print("%s  %s  %s  (%s)" % (r["reference"], r["created_at"][:10], r["company_name"], what))


def cmd_download(ref):
    s = supplier(ref)
    folder = os.path.join(OUT, ref)
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, "supplier.json"), "w", encoding="utf-8") as f:
        json.dump(s, f, ensure_ascii=False, indent=2)
    for p in s["catalogue_files"] or []:
        data = call("GET", "/storage/v1/object/%s/%s" % (BUCKET, urllib.parse.quote(p)), raw=True)
        dest = os.path.join(folder, os.path.basename(p))
        with open(dest, "wb") as f:
            f.write(data)
        print("baixado: " + os.path.relpath(dest, ROOT))
        ext = dest.lower().rsplit(".", 1)[-1]
        try:
            text = xlsx_to_text(dest) if ext == "xlsx" else pptx_to_text(dest) if ext == "pptx" else None
        except Exception as e:  # arquivo corrompido ou formato inesperado
            print("  aviso: não consegui converter para texto (%s)" % e)
            text = None
        if text is not None:
            with open(dest + ".txt", "w", encoding="utf-8") as f:
                f.write(text)
            print("  texto: " + os.path.relpath(dest + ".txt", ROOT))
    if s["catalogue_link"]:
        print("link do catálogo: " + s["catalogue_link"])


def utcnow():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def set_job(ref, status, error=None):
    body = {"status": status, "error": error}
    if status == "processing":
        body["started_at"] = utcnow()
    else:
        body["finished_at"] = utcnow()
    call("PATCH", "/rest/v1/catalogue_jobs?reference=eq." + urllib.parse.quote(ref), body,
         {"Prefer": "return=minimal"})


def cmd_queue():
    # "processing" há mais de 2 h = execução anterior travou; volta para a fila
    rows = call("GET", "/rest/v1/catalogue_jobs?select=reference,status,requested_at,started_at"
                       "&status=in.(queued,processing)&order=requested_at")
    limit = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)
    todo = [r["reference"] for r in rows if r["status"] == "queued" or
            (r["started_at"] and datetime.datetime.fromisoformat(r["started_at"]) < limit)]
    print("\n".join(todo) if todo else "Fila vazia.")


def cmd_job(ref, status, error=None):
    if status not in ("processing", "error"):
        sys.exit("status deve ser processing ou error")
    set_job(ref, status, error)
    print("%s: %s" % (ref, status))


def cmd_render(ref):
    folder = os.path.join(OUT, ref)
    pdfs = [f for f in sorted(os.listdir(folder)) if f.lower().endswith(".pdf")] if os.path.isdir(folder) else []
    if not pdfs:
        print("Nenhum PDF em " + os.path.relpath(folder, ROOT) + " (rode download antes).")
    for f in pdfs:
        dest = os.path.join(folder, "pages-" + f[:-4])
        os.makedirs(dest, exist_ok=True)
        out = subprocess.run(["osascript", "-l", "JavaScript", os.path.join(ROOT, "tools", "pdf2png.js"),
                              os.path.join(folder, f), dest, "1000"], capture_output=True, text=True)
        if out.returncode:
            sys.exit("Erro ao converter %s: %s" % (f, out.stderr.strip()))
        print("%s: %s -> %s (páginas pNNN.jpg + text.txt)" % (f, out.stdout.strip(), os.path.relpath(dest, ROOT)))


def cmd_images(ref):
    """Envia a foto de cada produto para o bucket público product-images e grava o caminho em
    products[].image no resumo salvo. A foto é a página do catálogo indicada em source ("p. N"),
    renderizada em alta resolução e recortada por image_crop = [x, y, largura, altura] em frações
    da página (no produto ou no resumo inteiro); sem image_crop, vai a página inteira."""
    row = call("GET", "/rest/v1/catalogue_summaries?reference=eq." + urllib.parse.quote(ref) + "&select=summary")
    if not row:
        sys.exit("Sem resumo salvo para " + ref)
    summary = row[0]["summary"]
    folder = os.path.join(OUT, ref)
    pdfs = [f for f in sorted(os.listdir(folder)) if f.lower().endswith(".pdf")] if os.path.isdir(folder) else []
    if not pdfs:
        sys.exit("Rode antes: python3 tools/catalogues.py download " + ref)
    out = os.path.join(folder, "marketplace")
    os.makedirs(out, exist_ok=True)
    sent, done = 0, {}
    for prod in summary.get("products", []):
        m = re.search(r"(\d+)", prod.get("source") or "")
        if not m:
            continue
        pdf = prod.get("source_file") or pdfs[0]
        hd = os.path.join(folder, "pages-hd-" + pdf[:-4])
        if not os.path.isdir(hd):
            os.makedirs(hd)
            subprocess.run(["osascript", "-l", "JavaScript", os.path.join(ROOT, "tools", "pdf2png.js"),
                            os.path.join(folder, pdf), hd, "2000"], capture_output=True, check=True)
        page = os.path.join(hd, "p%03d.jpg" % int(m.group(1)))
        if not os.path.exists(page):
            continue
        crop = prod.get("image_crop") or summary.get("image_crop")
        name = "%s-p%03d%s.jpg" % (pdf[:-4][:40], int(m.group(1)), "-c" if crop else "")
        local = os.path.join(out, re.sub(r"[^\w.\-]+", "_", name))
        if crop:
            dims = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", page], capture_output=True, text=True).stdout
            w, h = [int(x) for x in re.findall(r"pixel(?:Width|Height): (\d+)", dims)]
            x, y, cw, ch = crop
            subprocess.run(["sips", "-c", str(int(ch * h)), str(int(cw * w)), "--cropOffset", str(int(y * h)), str(int(x * w)),
                            page, "--out", local], capture_output=True, check=True)
        else:
            subprocess.run(["sips", "-s", "formatOptions", "80", page, "--out", local], capture_output=True, check=True)
        dest = "%s/%s" % (ref, os.path.basename(local))
        if dest not in done:
            call("POST", "/storage/v1/object/product-images/" + urllib.parse.quote(dest),
                 headers={"Content-Type": "image/jpeg", "x-upsert": "true"}, data=open(local, "rb").read())
            done[dest] = 1
            sent += 1
        prod["image"] = dest
    call("PATCH", "/rest/v1/catalogue_summaries?reference=eq." + urllib.parse.quote(ref),
         {"summary": summary, "updated_at": utcnow()}, {"Prefer": "return=minimal"})
    print("%s: %d imagens enviadas, %d produtos com foto" % (ref, sent, sum(1 for p in summary.get("products", []) if p.get("image"))))


SITE = "https://www.indiabrasil.com.br"


def slug(text):
    import unicodedata
    text = unicodedata.normalize("NFD", text or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:80]


def cmd_sitemap():
    """Gera sitemap.xml (páginas públicas + produtos e vitrines publicados) para o Google."""
    prods = call("GET", "/rest/v1/products?select=id,name,supplier_id,created_at&published=eq.true&order=created_at")
    urls = [(SITE + "/", None), (SITE + "/register", None), (SITE + "/marketplace", None)]
    for sid in sorted({p["supplier_id"] for p in prods}):
        urls.append((SITE + "/marketplace/fornecedor/" + sid, None))
    for p in prods:
        urls.append((SITE + "/marketplace/produto/%s/%s" % (p["id"], slug(p["name"])), p["created_at"][:10]))
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, mod in urls:
        xml.append("  <url><loc>%s</loc>%s</url>" % (loc, "<lastmod>%s</lastmod>" % mod if mod else ""))
    xml.append("</urlset>")
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write("\n".join(xml) + "\n")
    print("sitemap.xml: %d endereços (%d produtos)" % (len(urls), len(prods)))


def cmd_save(ref, path):
    s = supplier(ref)
    summary = json.load(open(path, encoding="utf-8"))
    row = {"supplier_id": s["id"], "reference": ref, "summary": summary,
           "source_files": summary.get("source_files") or [], "generated_by": summary.get("generated_by"),
           "updated_at": utcnow()}
    call("POST", "/rest/v1/catalogue_summaries?on_conflict=supplier_id", [row],
         {"Prefer": "resolution=merge-duplicates,return=minimal"})
    set_job(ref, "done")  # se veio do botão do /admin; sem pedido na fila, não muda nada
    print("resumo salvo: " + ref)


if __name__ == "__main__":
    a = sys.argv[1:]
    URL, KEY = env()
    if a[:1] == ["pending"]:
        cmd_pending()
    elif a[:1] == ["download"] and len(a) == 2:
        cmd_download(a[1])
    elif a[:1] == ["save"] and len(a) == 3:
        cmd_save(a[1], a[2])
    elif a[:1] == ["render"] and len(a) == 2:
        cmd_render(a[1])
    elif a[:1] == ["images"] and len(a) == 2:
        cmd_images(a[1])
    elif a[:1] == ["sitemap"]:
        cmd_sitemap()
    elif a[:1] == ["queue"]:
        cmd_queue()
    elif a[:1] == ["job"] and len(a) in (3, 4):
        cmd_job(a[1], a[2], a[3] if len(a) == 4 else None)
    else:
        sys.exit(__doc__)
