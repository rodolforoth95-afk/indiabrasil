#!/usr/bin/env python3
"""Dados de DEMONSTRAÇÃO do marketplace (fornecedores IB-DEMO01…06 e 15 produtos).

Servem para ver o marketplace cheio antes dos primeiros fornecedores reais.
Fotos livres do Wikimedia Commons (créditos em tools/demo_photos.json e na página do produto).
Os preços, os pedidos mínimos e as empresas são fictícios.

    python3 tools/demo_data.py add      # cria (ou recria) os fornecedores e produtos de demonstração
    python3 tools/demo_data.py remove   # apaga tudo o que é de demonstração (fazer antes do lançamento)
"""
import json
import os
import sys
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogues as c  # noqa: E402

PHOTOS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "demo_photos.json"), encoding="utf-8"))

SUPPLIERS = [
    ("IB-DEMO01", "DEMO Kerala Spice Exports", "Kochi", "Kerala", "Manufacturer and exporter", 2004, ["FSSAI", "ISO 9001"], "₹10–50 crore"),
    ("IB-DEMO02", "DEMO Punjab Agro Foods", "Amritsar", "Punjab", "Manufacturer and exporter", 1998, ["FSSAI", "MAPA (Brazil)"], "₹50–100 crore"),
    ("IB-DEMO03", "DEMO Jaipur Home Crafts", "Jaipur", "Rajasthan", "Manufacturer", 2011, ["RCMC (EPC / FIEO)"], "₹1–10 crore"),
    ("IB-DEMO04", "DEMO Ayur Naturals", "Dehradun", "Uttarakhand", "Manufacturer", 2015, ["ISO 9001", "WHO-GMP"], "₹1–10 crore"),
    ("IB-DEMO05", "DEMO Agra Leather Works", "Agra", "Uttar Pradesh", "Manufacturer and exporter", 1992, ["ISO 9001"], "₹10–50 crore"),
    ("IB-DEMO06", "DEMO Rajkot Engineering", "Rajkot", "Gujarat", "Manufacturer", 2001, ["ISO 9001", "CE", "INMETRO (Brazil)"], "₹10–50 crore"),
]

# (fornecedor, foto, nome, categoria, descrição, preço mín/máx, unidade, MOQ, faixas [de, até, preço], prazo, selos, specs, variações)
PRODUCTS = [
    ("IB-DEMO01", "turmeric", "Cúrcuma em pó (açafrão-da-terra) – curcumina 3–5%", "Especiarias e alimentos",
     "Cúrcuma moída de Erode, limpa a vapor, sem corantes. Embalagem a granel ou com a sua marca.",
     2.10, 2.80, "kg", "500 kg", [[500, 999, 2.80], [1000, 4999, 2.45], [5000, None, 2.10]], "15–20 dias",
     ["Marca própria", "Amostra grátis"], {"Origem": "Erode, Tamil Nadu", "Curcumina": "3–5%", "Umidade": "máx. 10%", "Embalagem": "Sacos de 25 kg ou pacotes de 100 g a 1 kg"},
     ["Pó fino 60 mesh", "Pó 80 mesh", "Raiz inteira seca"]),
    ("IB-DEMO01", "cumin", "Cominho em grão – Singapore / Europe quality", "Especiarias e alimentos",
     "Cominho de Gujarat e Rajasthan, limpo por separação a máquina, pureza 99%.",
     3.20, 3.90, "kg", "1 t", [[1000, 4999, 3.90], [5000, 9999, 3.55], [10000, None, 3.20]], "10–15 dias",
     ["Amostra grátis"], {"Pureza": "98–99,5%", "Umidade": "máx. 9%", "Embalagem": "Sacos de juta ou PP de 25/50 kg"},
     ["Singapore 98%", "Europe 99%", "Europe 99,5%"]),
    ("IB-DEMO01", "cardamom", "Cardamomo verde – 7 a 8 mm", "Especiarias e alimentos",
     "Cardamomo verde graúdo de Idukki, colheita da safra atual, cor verde intensa.",
     18.50, 24.00, "kg", "100 kg", [[100, 499, 24.00], [500, 999, 21.00], [1000, None, 18.50]], "7–10 dias",
     ["Safra atual"], {"Calibre": "6–7, 7–8 e 8 mm+", "Origem": "Idukki, Kerala", "Embalagem": "Caixas de 10 kg com saco interno"},
     ["6–7 mm", "7–8 mm", "8 mm+ (bold)"]),
    ("IB-DEMO01", "cashew", "Castanha de caju W320 – inteira, branca", "Especiarias e alimentos",
     "Castanha de caju processada em Kollam, classificação AFI, embalada a vácuo em latas.",
     7.40, 8.60, "kg", "1 contêiner de 20 pés", [[1000, 4999, 8.60], [5000, 9999, 7.95], [10000, None, 7.40]], "20–25 dias",
     ["Exporta para a América Latina"], {"Classificação": "W180, W240, W320, W450", "Embalagem": "Latas de 2 × 11,34 kg a vácuo", "Validade": "12 meses"},
     ["W180", "W240", "W320", "W450", "Pedaços (LWP)"]),
    ("IB-DEMO02", "basmati", "Arroz basmati 1121 – grão extralongo", "Especiarias e alimentos",
     "Basmati 1121 envelhecido 12 meses, grão médio de 8,35 mm, cozimento até 22 mm.",
     1.05, 1.35, "kg", "25 t", [[25000, 49999, 1.35], [50000, 99999, 1.18], [100000, None, 1.05]], "20–30 dias",
     ["Marca própria", "Exporta para a América Latina"], {"Comprimento médio": "8,35 mm", "Envelhecimento": "12 meses", "Embalagem": "Sacos de 1, 5, 10, 25 kg ou marca própria"},
     ["Branco (sella)", "Golden sella", "Steam", "Integral"]),
    ("IB-DEMO02", "tea", "Chá preto Assam CTC / ortodoxo", "Especiarias e alimentos",
     "Chá preto de jardins de Assam, encorpado, ideal para blends e chá com leite.",
     3.60, 6.80, "kg", "500 kg", [[500, 1999, 6.80], [2000, 4999, 5.10], [5000, None, 3.60]], "15–20 dias",
     ["Amostra grátis"], {"Origem": "Assam", "Tipos": "CTC BOP, ortodoxo FTGFOP", "Embalagem": "Sacos multicamada de 50 kg ou sachês com sua marca"},
     ["CTC BOP", "Ortodoxo FTGFOP", "Sachês (marca própria)"]),
    ("IB-DEMO03", "ceramic", "Vasos de cerâmica azul de Jaipur – pintados à mão", "Casa e decoração",
     "Peças artesanais em blue pottery de Jaipur, cada uma pintada à mão. Ideal para lojas de decoração.",
     6.50, 38.00, "peça", "50 peças por modelo", [[50, 199, 38.00], [200, 499, 29.00], [500, None, 22.00]], "30–45 dias",
     ["Feito à mão", "Personalizável"], {"Técnica": "Blue pottery (quartzo e vidro)", "Alturas": "10 a 45 cm", "Embalagem": "Caixa individual com proteção"},
     ["Vaso 15 cm", "Vaso 25 cm", "Vaso 40 cm", "Jarra decorativa", "Conjunto de 3"]),
    ("IB-DEMO03", "sheets", "Jogo de lençol 100% algodão 300 fios", "Casa e decoração",
     "Jogo de lençol em percal de algodão penteado, tingimento reativo, acabamento hoteleiro.",
     9.80, 16.50, "jogo", "300 jogos", [[300, 999, 16.50], [1000, 2999, 13.20], [3000, None, 9.80]], "35–45 dias",
     ["Marca própria", "Personalizável"], {"Tecido": "Percal 300 fios, 100% algodão", "Tamanhos": "Solteiro, casal, queen, king", "Certificação": "OEKO-TEX (sob pedido)"},
     ["Solteiro", "Casal", "Queen", "King", "Branco", "Cru", "Cinza", "Azul"]),
    ("IB-DEMO03", "incense", "Incenso natural em varetas – massala", "Casa e decoração",
     "Incenso artesanal com resinas e óleos naturais, sem carvão. Caixas de 15 g com a sua marca.",
     0.18, 0.32, "caixa de 15 g", "5.000 caixas", [[5000, 19999, 0.32], [20000, 49999, 0.24], [50000, None, 0.18]], "20–30 dias",
     ["Marca própria", "Amostra grátis"], {"Aromas": "Sândalo, lavanda, rosa, nag champa e outros 20", "Duração": "40–50 min por vareta"},
     ["Sândalo", "Lavanda", "Rosa", "Nag champa", "Patchouli", "Mirra"]),
    ("IB-DEMO04", "oil", "Óleos essenciais 100% puros – linha completa", "Cosméticos naturais",
     "Óleos essenciais destilados a vapor, com laudo GC-MS por lote. Granel ou frascos com a sua marca.",
     12.00, 95.00, "kg", "5 kg por óleo", [[5, 24, 95.00], [25, 99, 48.00], [100, None, 12.00]], "10–20 dias",
     ["Laudo por lote", "Marca própria"], {"Extração": "Destilação a vapor", "Laudo": "GC-MS e MSDS por lote", "Embalagem": "Tambores de alumínio ou frascos de 10/30 ml"},
     ["Lavanda", "Eucalipto", "Hortelã-pimenta", "Capim-limão", "Tea tree", "Laranja"]),
    ("IB-DEMO04", "soap", "Sabonete artesanal ayurvédico – processo a frio", "Cosméticos naturais",
     "Sabonetes vegetais com neem, cúrcuma e óleo de coco, feitos a frio e curados por 4 semanas.",
     0.55, 0.95, "unidade de 100 g", "2.000 unidades", [[2000, 4999, 0.95], [5000, 19999, 0.72], [20000, None, 0.55]], "25–30 dias",
     ["Marca própria", "Vegano"], {"Peso": "75, 100 ou 125 g", "Base": "Óleos vegetais, sem sebo animal", "Embalagem": "Papel kraft ou caixa com a sua marca"},
     ["Neem", "Cúrcuma", "Sândalo", "Carvão ativado", "Leite de cabra"]),
    ("IB-DEMO05", "shoes", "Bota masculina de couro legítimo – solado de borracha", "Calçados e couro",
     "Bota em couro bovino integral, costura reforçada e solado de borracha antiderrapante.",
     18.00, 26.00, "par", "300 pares", [[300, 999, 26.00], [1000, 2999, 22.00], [3000, None, 18.00]], "45–60 dias",
     ["Marca própria", "Personalizável"], {"Couro": "Bovino integral 1,8–2,0 mm", "Solado": "Borracha vulcanizada", "Numeração": "37 a 46 (BR)"},
     ["Preto", "Marrom café", "Caramelo", "Cano curto", "Cano médio"]),
    ("IB-DEMO06", "pump", "Bomba centrífuga monobloco 2 a 10 cv", "Máquinas e ferramentas",
     "Bomba centrífuga com motor elétrico, rotor em ferro fundido, para irrigação e uso industrial.",
     145.00, 620.00, "unidade", "20 unidades", [[20, 49, 620.00], [50, 99, 520.00], [100, None, 145.00]], "30–40 dias",
     ["Garantia de 12 meses"], {"Potência": "2, 3, 5, 7,5 e 10 cv", "Tensão": "220/380 V trifásico", "Vazão": "até 90 m³/h"},
     ["2 cv", "3 cv", "5 cv", "7,5 cv", "10 cv"]),
    ("IB-DEMO06", "wrench", "Kit de ferramentas com 108 peças – cromo-vanádio", "Máquinas e ferramentas",
     "Jogo de soquetes e chaves em aço cromo-vanádio, maleta plástica injetada. Atende oficinas e varejo.",
     22.00, 31.00, "kit", "200 kits", [[200, 499, 31.00], [500, 1999, 26.50], [2000, None, 22.00]], "30–45 dias",
     ["Marca própria"], {"Material": "Aço cromo-vanádio", "Peças": "108", "Encaixes": "1/4\" e 1/2\""},
     ["108 peças", "94 peças", "46 peças"]),
    ("IB-DEMO06", "bearing", "Esferas de aço e cerâmica para rolamentos", "Máquinas e ferramentas",
     "Esferas de precisão em aço cromo (AISI 52100), inox e zircônia, grau G10 a G100.",
     0.01, 0.35, "unidade", "10.000 unidades", [[10000, 49999, 0.35], [50000, 199999, 0.08], [200000, None, 0.01]], "20–30 dias",
     ["Laudo por lote"], {"Materiais": "Aço 52100, inox 440C, zircônia (ZrO2)", "Diâmetros": "1 a 50 mm", "Grau": "G10 a G100"},
     ["Aço cromo", "Inox 440C", "Zircônia"]),
]


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": "IndiaBrasilDemo/1.0 (rodolforoth95@gmail.com)"})
    return urllib.request.urlopen(req, timeout=60, context=c.SSL).read()


def remove():
    sups = c.call("GET", "/rest/v1/suppliers?reference=like.IB-DEMO*&select=id")
    if sups:
        ids = ",".join(s["id"] for s in sups)
        c.call("DELETE", "/rest/v1/suppliers?id=in.(%s)" % ids, headers={"Prefer": "return=minimal"})
    files = c.call("POST", "/storage/v1/object/list/product-images", {"prefix": "DEMO", "limit": 1000})
    if files:
        c.call("DELETE", "/storage/v1/object/product-images", {"prefixes": ["DEMO/" + f["name"] for f in files]})
    print("Demonstração removida: %d fornecedores, %d fotos" % (len(sups), len(files or [])))


def add():
    remove()
    ids = {}
    for i, (ref, name, city, state, btype, year, certs, turnover) in enumerate(SUPPLIERS, 1):
        row = {"reference": ref, "company_name": name, "city": city, "state": state, "business_type": btype,
               "year_established": year, "certifications": certs, "export_turnover": turnover, "status": "published",
               "iec": "DEMO%06d" % i, "contact_name": "Demo", "email": "demo%02d@indiabrasil.com.br" % i,
               "mobile": "+9190000000%02d" % i, "consent": True, "consent_text": "Dados de demonstração",
               "categories": [], "main_products": "Demonstração", "latam_experience": "Yes"}
        ids[ref] = c.call("POST", "/rest/v1/suppliers", [row], {"Prefer": "return=representation"})[0]["id"]
    rows = []
    for ref, photo, name, cat, desc, pmin, pmax, unit, moq, tiers, lead, tags, specs, variants in PRODUCTS:
        path = "DEMO/%s.jpg" % photo
        c.call("POST", "/storage/v1/object/product-images/" + path, headers={"Content-Type": "image/jpeg", "x-upsert": "true"},
               data=download(PHOTOS[photo]["url"]))
        specs = dict(specs, _tiers=tiers, _lead_time=lead, _tags=tags,
                     _credit=PHOTOS[photo]["credit"], _credit_url=PHOTOS[photo]["page"])
        rows.append({"supplier_id": ids[ref], "reference": ref, "name": name, "category": cat, "description": desc,
                     "image_path": path, "price_min": pmin, "price_max": pmax, "currency": "USD", "price_unit": unit,
                     "moq": moq, "specs": specs, "variants": [{"name": v, "attributes": {"Opção": v}} for v in variants],
                     "variant_count": len(variants), "certifications": [], "source": "Demonstração"})
    c.call("POST", "/rest/v1/products", rows, {"Prefer": "return=minimal"})
    print("Demonstração criada: %d fornecedores, %d produtos" % (len(SUPPLIERS), len(rows)))


if __name__ == "__main__":
    c.URL, c.KEY = c.env()
    {"add": add, "remove": remove}.get((sys.argv[1:] or [""])[0], lambda: sys.exit(__doc__))()
