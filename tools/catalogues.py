#!/usr/bin/env python3
"""India Brazil – catálogos dos fornecedores (uso interno, roda só no computador).

Precisa de um arquivo .env na raiz do projeto com:
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_SECRET_KEY=sb_secret_...

Comandos:
    python3 tools/catalogues.py pending          # cadastros com catálogo e sem resumo
    python3 tools/catalogues.py download IB-XXX  # baixa para catalogues/IB-XXX/
    python3 tools/catalogues.py save IB-XXX resumo.json
"""
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from xml.etree import ElementTree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "catalogues")
BUCKET = "catalogues"


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


def call(method, path, body=None, headers=None, raw=False):
    h = {"apikey": KEY}
    if KEY.startswith("eyJ"):  # chave service_role antiga (JWT)
        h["Authorization"] = "Bearer " + KEY
    h.update(headers or {})
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(URL + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
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


def cmd_save(ref, path):
    s = supplier(ref)
    summary = json.load(open(path, encoding="utf-8"))
    row = {"supplier_id": s["id"], "reference": ref, "summary": summary,
           "source_files": summary.get("source_files") or [], "generated_by": summary.get("generated_by"),
           "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    call("POST", "/rest/v1/catalogue_summaries?on_conflict=supplier_id", [row],
         {"Prefer": "resolution=merge-duplicates,return=minimal"})
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
    else:
        sys.exit(__doc__)
