# India Brazil – indiabrazil.com.br

Marketplace B2B (modelo concierge): fornecedores indianos se cadastram e recebem
pedidos de orçamento (RFQs) de compradores brasileiros.

## Estrutura
- index.html – landing page para fornecedores indianos (em inglês)
- register.html – cadastro em 4 etapas, grava no Supabase (tabela `suppliers`, bucket `catalogues`)
- assets/logo – logos SVG (globo laranja/verde com seta, texto branco)
- docs/supabase-setup.sql – schema do banco (não é servido no site)
- vercel.json – configuração da hospedagem (cleanUrls: /register)

## Regras
- Site estático hospedado na Vercel; deploy automático a cada push na branch main.
- Usar apenas a publishable key do Supabase no front-end. NUNCA a secret/service_role.
- Textos do site em inglês indiano formal (catalogue, enquiry, ₹ crore). Explicações ao dono em português, simples.
- Fonte: IBM Plex Sans. Cores: navy #0F1A3D, verde #0B7A55 / #00C853, laranja #FF9100.
- Antes de cada push, testar localmente e mostrar o que mudou.
