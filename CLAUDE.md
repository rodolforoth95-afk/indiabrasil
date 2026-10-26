# India Brazil – indiabrazil.com.br

Marketplace B2B (modelo concierge): fornecedores indianos se cadastram e recebem
pedidos de orçamento (RFQs) de compradores brasileiros.

## Estrutura
- index.html – landing page para fornecedores indianos (em inglês)
- register.html – cadastro em 4 etapas, grava no Supabase (tabela `suppliers`, bucket `catalogues`)
- admin.html – área do administrador (/admin): login Supabase Auth, só para quem está em `public.admins`
- tools/catalogues.py – baixa catálogos e salva resumos (usa SUPABASE_SECRET_KEY do .env, nunca vai para o site)
- assets/logo – logos SVG (globo laranja/verde com seta, texto branco)
- docs/supabase-setup.sql – schema do banco (não é servido no site)
- docs/admin-setup.sql – admins, regras de acesso do /admin e tabela `catalogue_summaries`
- vercel.json – configuração da hospedagem (cleanUrls: /register)

## Regras
- Site estático hospedado na Vercel; deploy automático a cada push na branch main.
- Usar apenas a publishable key do Supabase no front-end. NUNCA a secret/service_role.
- Textos do site em inglês indiano formal (catalogue, enquiry, ₹ crore). Explicações ao dono em português, simples.
- Fonte: IBM Plex Sans. Cores: navy #0F1A3D, verde #0B7A55 / #00C853, laranja #FF9100.
- Antes de cada push, testar localmente e mostrar o que mudou.

## Resumo de catálogos ("resuma o catálogo IB-XXXX")
1. `python3 tools/catalogues.py pending` lista quem tem catálogo sem resumo.
2. `python3 tools/catalogues.py download IB-XXXX` baixa para `catalogues/IB-XXXX/` (pasta fora do git).
   Planilhas (.xlsx) e apresentações (.pptx) ganham um `.txt` ao lado; PDFs e imagens: ler direto.
   Se houver `catalogue_link`, tentar abrir (Drive/Dropbox públicos); se não abrir, anotar em `missing_info`.
3. Ler TODO o catálogo e escrever o JSON abaixo num arquivo temporário (no scratchpad, não no projeto).
4. `python3 tools/catalogues.py save IB-XXXX arquivo.json` grava em `catalogue_summaries`; aparece em /admin.

Formato (textos em português; nomes de produto, SKUs e atributos como no catálogo; não inventar dados,
o que não estiver no catálogo fica null e vai para `missing_info`):
```json
{
  "generated_by": "Claude <modelo>", "source_files": ["1-catalogue.pdf"],
  "overview": "2-3 frases sobre a empresa e a linha de produtos",
  "currency": "USD | INR | null", "categories": ["..."],
  "totals": {"products": 0, "variants": 0, "with_price": 0},
  "terms": {"moq": null, "payment": null, "incoterms": null, "lead_time": null, "packaging": null, "samples": null},
  "certifications": ["..."],
  "products": [{
    "name": "...", "category": "...", "description": "...",
    "price_min": 0.0, "price_max": 0.0, "price_unit": "kg | pc | m ...",
    "moq": null, "hs_code": null, "packaging": null, "certifications": [], "source": "p. 4",
    "specs": {"Material": "..."},
    "variants": [{"name": "...", "attributes": {"Size": "...", "Color": "..."}, "sku": null, "price": null, "unit": null}]
  }],
  "missing_info": ["o que falta para publicar no marketplace"],
  "notes": null
}
```
