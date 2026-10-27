# India Brazil – indiabrasil.com.br

Marketplace B2B (modelo concierge): fornecedores indianos se cadastram e recebem
pedidos de orçamento (RFQs) de compradores brasileiros.

## Estrutura
- index.html – landing page para fornecedores indianos (em inglês)
- register.html – cadastro em 4 etapas, grava no Supabase (tabela `suppliers`, bucket `catalogues`)
- admin.html – área do administrador (/admin): login Supabase Auth, só para quem está em `public.admins`
- portal.html – portal do fornecedor (/portal, em inglês): conta ligada ao cadastro pelo e-mail confirmado,
  2FA por app autenticador obrigatório, cadastro, catálogos, orçamentos (RFQs), cotações e chat
- admin-orcamentos.html – time cria RFQs, vê cotações e conversa no chat (/admin-orcamentos, mesmo login do /admin)
- marketplace.html – vitrine pública B2B (/marketplace, português; endereços reais /marketplace/produto/<id>/<nome>, ver rewrite no vercel.json): busca, categorias, produto com cotação rápida, lista de cotação, vitrine do fornecedor
  (o comprador vê "Fornecedor IB-XXXX", nunca nome/contato: o meio de campo é da India Brasil)
- comprador.html – "Minha conta" do comprador (/comprador): criar conta (nome, empresa, WhatsApp, e-mail, senha) → confirmar e-mail
  → completar empresa → painel (novidades, pedidos por situação, mensagens, sob medida, lista, dados, login e segurança).
  Cada pedido tem um espaço com linha do tempo, chat, cotações (aceitar e negociar / pedir ajuste) e próximo passo.
  O marketplace lê a mesma sessão (storageKey ib-buyer-auth) para mostrar "Olá, …" no topo.
- docs/buyer-account.sql – `rfq_reads` (lido/não lido), `buyer_inbox()`, `buyer_set_rfq_status()`, `buyers.job_title`
- docs/marketplace-benchmark.md – referências B2B (Alibaba, IndiaMART…), o que adotamos e próximas fases
- sitemap.xml / robots.txt – gerar de novo com `python3 tools/catalogues.py sitemap` sempre que publicar produtos
- assets/js/rfq-chat.js – conversa B2B compartilhada (portal, comprador, admin-orcamentos): tempo real + anexos
- tools/catalogues.py – baixa catálogos e salva resumos (usa SUPABASE_SECRET_KEY do .env, nunca vai para o site)
- assets/logo – logos SVG (globo laranja/verde com seta, texto branco)
- docs/supabase-setup.sql – schema do banco (não é servido no site)
- docs/admin-setup.sql – admins, regras de acesso do /admin e tabela `catalogue_summaries`
- docs/marketplace-setup.sql – `products`, vitrine `marketplace_suppliers`, `publish_catalogue()`, compradores com conta, anexos (`rfq-files`)
- docs/portal-setup.sql – portal: `my_supplier_ids()`, `has_2fa()`, tabelas `buyers`, `rfqs`, `rfq_quotes`, `rfq_messages`
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
   Planilhas (.xlsx) e apresentações (.pptx) ganham um `.txt` ao lado; imagens: ler direto.
   PDFs: `python3 tools/catalogues.py render IB-XXXX` gera `pages-<arquivo>/pNNN.jpg` + `text.txt`
   (o Read de PDF não funciona neste Mac, falta poppler). Ler o text.txt inteiro e as páginas em JPG
   onde há informação visual (cores, tabelas de medidas, preços em imagem).
   Se houver `catalogue_link`, tentar abrir (Drive/Dropbox públicos); se não abrir, anotar em `missing_info`.
3. Ler TODO o catálogo e escrever o JSON abaixo num arquivo temporário (no scratchpad, não no projeto).
4. `python3 tools/catalogues.py save IB-XXXX arquivo.json` grava em `catalogue_summaries`; aparece em /admin.
5. Fotos para o marketplace: `python3 tools/catalogues.py images IB-XXXX` renderiza a página de cada produto
   (campo source "p. N") em alta resolução, recorta por `image_crop` [x, y, largura, altura] em frações da página
   (no produto ou no resumo inteiro – conferir num JPG onde fica a foto) e grava `products[].image`.
6. No /admin, botão "Publicar no marketplace" (função `publish_catalogue`) copia o resumo para `products`.

Botão "Processar com IA" do /admin: grava um pedido em `catalogue_jobs` (status queued). Nada roda sozinho:
o dono clica em Run now na tarefa "processar-catalogos-ia" (app Claude no Mac, sem agendamento) ou pede
"processe a fila" numa conversa. Ela roda `python3 tools/catalogues.py queue`,
marca `job IB-XXXX processing`, faz os passos 2–4 (o `save` marca done) e, se falhar, `job IB-XXXX error "motivo"`.

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
    "source_file": "só se houver mais de um PDF", "image": "preenchido pelo comando images",
    "specs": {"Material": "..."},
    "variants": [{"name": "...", "attributes": {"Size": "...", "Color": "..."}, "sku": null, "price": null, "unit": null}]
  }],
  "missing_info": ["o que falta para publicar no marketplace"],
  "notes": null
}
```
