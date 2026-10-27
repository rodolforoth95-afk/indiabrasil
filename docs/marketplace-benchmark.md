# Marketplace India Brasil – referências B2B e jornada de conversão

Pesquisa de 27/10/2026. Referências: Alibaba, IndiaMART, Made-in-China, Global Sources e boas práticas de
formulários de cotação B2B. A maioria dos números públicos sobre conversão vem de blogs de fornecedores de
software, então entram aqui como direção, não como dado comprovado.

## O que as referências fazem e o que adotamos

| Padrão nas referências | Onde aparece | Como ficou na India Brasil |
|---|---|---|
| Busca como centro da página inicial, categorias logo abaixo | Alibaba, Made-in-China | Busca no topo e no destaque, categorias com contagem |
| "Get Best Price" / RFQ na página do produto, uma pergunta de cada vez | IndiaMART (formulário em estilo chat) | Cotação rápida ao lado do produto: só quantidade e detalhes, sem login |
| Pedir antes de criar conta (não perder o lead) | IndiaMART, Alibaba | Rascunho guardado no navegador; conta e envio vêm depois, com tudo preenchido |
| Pedido de compra livre (Buying Request / BuyLead) | Alibaba RFQ, IndiaMART BuyLeads | "Pedido de cotação" sem produto: a equipe busca fornecedores e envia RFQs |
| Cesta de consultas a vários fornecedores | Made-in-China (inquiry basket) | Lista de cotação: vários produtos, um envio |
| Amostra antes do pedido grande | Alibaba (samples) | Tipo "Amostra" no pedido |
| Selos de verificação e informação do fornecedor perto do botão | Alibaba Verified, Global Sources | Selo "Verificado", dados da empresa e "Por que pedir pela India Brasil" ao lado do formulário |
| Mensageiro com contexto do pedido e anexos | Alibaba Message Center | Conversa com anexos, cotações e resumo do pedido lado a lado |
| Responder rápido converte mais | IndiaMART, guias de vendedores | Funil e conversas no /admin-orcamentos (avisos por e-mail/WhatsApp ficam para a fase 2) |
| Páginas de produto indexáveis | Todos | Endereços reais /marketplace/produto/…, título, descrição, dados estruturados e sitemap.xml |

## Diferencial para o comprador brasileiro
- Tudo em português, com a equipe fazendo a ponte com o fornecedor (tradução, especificações, documentos).
- Os dois lados não veem o contato do outro: a negociação passa pela India Brasil.
- Sem pagamento na plataforma, o que diminui a barreira para o primeiro pedido.

## Medição (tabela `marketplace_events`, tela "Funil" em /admin-orcamentos)
Visitas → viram produto → começaram orçamento → enviaram orçamento/amostra, além de pedidos livres,
contas criadas e o que mais buscam. Use as buscas sem resultado para decidir quais fornecedores trazer.

## Próximas fases (ordem sugerida)
1. **Aviso de nova mensagem e de nova cotação** por e-mail e WhatsApp, para comprador, fornecedor e equipe.
   É o que mais pesa no tempo de resposta. Precisa de SMTP próprio e, para WhatsApp, de uma API oficial.
2. **Tradução automática** nas conversas (português ⇄ inglês), mostrando o texto original junto.
3. **Tempo médio de resposta do fornecedor** na página do produto, calculado das conversas.
4. **Preço por faixa de quantidade e prazo de produção** no resumo do catálogo, quando o fornecedor informar.
5. **Simulador de custo de importação** (frete, II, IPI, PIS/COFINS, ICMS por NCM e estado), com aviso
   de que é estimativa e validação de um despachante antes de publicar.
6. **Comparação de cotações** lado a lado quando um pedido livre recebe várias respostas.
7. **Avaliações** depois de negócios fechados.

## Fontes
- IndiaMART, formulário de requisito em estilo chat: https://help.indiamart.com/knowledge-base/now-you-can-provide-your-requirement-through-chat
- Alibaba RFQ para vendedores: https://seller.alibaba.com/mx/rfq
- Uso de RFQs no Alibaba: https://activity.alibaba.com/ggs/how_to_use_rfqs_to_attract_more_buyers_2.html
- Resposta a RFQ com planilha de especificações: https://www.sizemarker.com/blog/alibaba-rfq-spec-sheet
- Taxa de resposta de RFQ (métrica): https://docs.vortexiq.ai/nerve-centre/kpi-cards/alibaba/rfq-response-rate-30d
- Velocidade de resposta a leads do IndiaMART: https://vedain.com/kb/indiamart-lead-management-how-to-respond-faster-and-convert-more-enquiries-into-customers
- Made-in-China e Global Sources (comparativo): https://www.globalsources.com/knowledge/is-made-in-china-com-legit/
- Campos de formulário de cotação: https://orbitforms.ai/blog/quote-request-form-best-practices
- Sinais de confiança perto do formulário: https://www.lowcode.agency/blog/b2b-website-trust-signals
- Impostos de importação no Brasil: https://www.omie.com.br/blog/impostos-sobre-produtos-importados/
