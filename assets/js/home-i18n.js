/*
  Idiomas da página inicial (index.html): English (padrão), हिन्दी, Português (BR) e Español.
  A página é escrita em inglês; aqui fica a tradução de cada texto, na ordem [hi, pt, es].
  Ao trocar o idioma, os textos da página são substituídos (a chave é o texto em inglês, com espaços normalizados).
  Textos que o formulário cria na hora usam window.I18N.t("texto em inglês").
  Se mudar um texto em inglês no index.html, mude a chave aqui também (senão ele fica em inglês nos outros idiomas).
*/
(function(){
  var D={
  // Topo e menu
  "India Brazil | Receive Quotation Requests from Brazilian Buyers":["India Brazil | ब्राज़ील के खरीदारों से कोटेशन अनुरोध पाएँ","India Brazil | Receba pedidos de cotação de compradores brasileiros","India Brazil | Reciba solicitudes de cotización de compradores brasileños"],
  "Market":["बाज़ार","Mercado","Mercado"],
  "Quotation requests":["कोटेशन अनुरोध","Pedidos de cotação","Solicitudes de cotización"],
  "How it works":["यह कैसे काम करता है","Como funciona","Cómo funciona"],
  "FAQ":["सवाल-जवाब","Dúvidas","Preguntas"],
  "Get 6 months free":["6 महीने मुफ़्त पाएँ","Ganhe 6 meses grátis","Obtenga 6 meses gratis"],
  "For Indian manufacturers · India × Brazil trade facilitation":["भारतीय निर्माताओं के लिए · भारत × ब्राज़ील व्यापार सुविधा","Para fabricantes indianos · Facilitação comercial Índia × Brasil","Para fabricantes indios · Facilitación comercial India × Brasil"],
  "The BRICS bridge to sell to Brazil: no trade fair, no agent, no upfront fee.":["ब्राज़ील में बेचने के लिए BRICS सेतु: न ट्रेड फ़ेयर, न एजेंट, न शुरुआती शुल्क।","A ponte BRICS para vender ao Brasil: sem feira, sem agente, sem taxa inicial.","El puente BRICS para vender a Brasil: sin ferias, sin agentes, sin costo inicial."],
  "We connect Indian industry with Brazilian buyers. Tell us what you make, see the real demand in Brazil and receive matching quotation requests (RFQs) on WhatsApp and email.":["हम भारतीय उद्योग को ब्राज़ील के खरीदारों से जोड़ते हैं। बताइए आप क्या बनाते हैं, ब्राज़ील में असली माँग देखिए और WhatsApp व ईमेल पर मेल खाते कोटेशन अनुरोध (RFQ) पाइए।","Conectamos a indústria indiana a compradores brasileiros. Diga o que você fabrica, veja a demanda real no Brasil e receba pedidos de cotação (RFQs) compatíveis no WhatsApp e por e-mail.","Conectamos la industria india con compradores brasileños. Díganos qué fabrica, vea la demanda real en Brasil y reciba solicitudes de cotización (RFQ) compatibles por WhatsApp y correo."],
  "See demand for my product →":["मेरे उत्पाद की माँग देखें →","Ver a demanda do meu produto →","Ver la demanda de mi producto →"],
  "Start on WhatsApp":["WhatsApp पर शुरू करें","Começar pelo WhatsApp","Empezar por WhatsApp"],
  "Free for 6 months":["6 महीने मुफ़्त","Grátis por 6 meses","Gratis por 6 meses"],
  "No card required":["कार्ड की ज़रूरत नहीं","Sem cartão","Sin tarjeta"],
  "RFQs in English":["RFQ अंग्रेज़ी में","RFQs em inglês","RFQ en inglés"],
  // Formulário do topo
  "See the demand for your product in Brazil":["ब्राज़ील में अपने उत्पाद की माँग देखें","Veja a demanda do seu produto no Brasil","Vea la demanda de su producto en Brasil"],
  "Step 1 of 3":["चरण 1 / 3","Passo 1 de 3","Paso 1 de 3"],
  "Step 2 of 3":["चरण 2 / 3","Passo 2 de 3","Paso 2 de 3"],
  "Takes 60 seconds":["60 सेकंड लगते हैं","Leva 60 segundos","Toma 60 segundos"],
  "Step 1 · Your product":["चरण 1 · आपका उत्पाद","Etapa 1 · Seu produto","Etapa 1 · Su producto"],
  "What do you manufacture?":["आप क्या बनाते हैं?","O que você fabrica?","¿Qué fabrica?"],
  "Chemicals & dyes":["रसायन और डाई","Químicos e corantes","Químicos y colorantes"],
  "Fuels & oils":["ईंधन और तेल","Combustíveis e óleos","Combustibles y aceites"],
  "Machinery & boilers":["मशीनरी और बॉयलर","Máquinas e caldeiras","Maquinaria y calderas"],
  "Auto parts & vehicles":["ऑटो पार्ट्स और वाहन","Autopeças e veículos","Autopartes y vehículos"],
  "Pharma & APIs":["फ़ार्मा और API","Farmacêuticos e APIs","Farmacéuticos y API"],
  "Rubber & plastics":["रबर और प्लास्टिक","Borracha e plásticos","Caucho y plásticos"],
  "Electrical equipment":["विद्युत उपकरण","Equipamentos elétricos","Equipos eléctricos"],
  "Iron, steel & metals":["लोहा, स्टील और धातु","Ferro, aço e metais","Hierro, acero y metales"],
  "Textiles & yarn":["कपड़ा और धागा","Têxteis e fios","Textiles e hilados"],
  "Other products":["अन्य उत्पाद","Outros produtos","Otros productos"],
  "Continue →":["आगे बढ़ें →","Continuar →","Continuar →"],
  "Step 2 · Demand in Brazil":["चरण 2 · ब्राज़ील में माँग","Etapa 2 · Demanda no Brasil","Etapa 2 · Demanda en Brasil"],
  "Where should we send matching RFQs?":["मेल खाते RFQ हम कहाँ भेजें?","Para onde enviamos as RFQs compatíveis?","¿Adónde enviamos las RFQ compatibles?"],
  "Your main product":["आपका मुख्य उत्पाद","Seu produto principal","Su producto principal"],
  "WhatsApp number":["WhatsApp नंबर","Número de WhatsApp","Número de WhatsApp"],
  "Business email":["व्यावसायिक ईमेल","E-mail da empresa","Correo de la empresa"],
  "(optional)":["(वैकल्पिक)","(opcional)","(opcional)"],
  "Get my free RFQs →":["मेरे मुफ़्त RFQ पाएँ →","Receber minhas RFQs grátis →","Recibir mis RFQ gratis →"],
  "← Change product":["← उत्पाद बदलें","← Trocar produto","← Cambiar producto"],
  "One field at a time · 6 months free · No card":["एक बार में एक फ़ील्ड · 6 महीने मुफ़्त · कोई कार्ड नहीं","Um campo por vez · 6 meses grátis · Sem cartão","Un campo a la vez · 6 meses gratis · Sin tarjeta"],
  "e.g. stainless steel ball valves":["जैसे: स्टेनलेस स्टील बॉल वाल्व","ex.: válvulas esfera de aço inox","ej.: válvulas de bola de acero inoxidable"],
  "10-digit mobile":["10 अंकों का मोबाइल","celular com 10 dígitos","móvil de 10 dígitos"],
  "Mobile number":["मोबाइल नंबर","Número do celular","Número de móvil"],
  "Search country or code":["देश या कोड खोजें","Buscar país ou código","Buscar país o código"],
  "No country found":["कोई देश नहीं मिला","Nenhum país encontrado","No se encontró el país"],
  "Choose what you manufacture.":["चुनिए कि आप क्या बनाते हैं।","Escolha o que você fabrica.","Elija qué fabrica."],
  "Please enter your 10-digit WhatsApp number.":["कृपया अपना 10 अंकों का WhatsApp नंबर लिखें।","Informe seu WhatsApp com 10 dígitos.","Ingrese su WhatsApp de 10 dígitos."],
  "Please enter a valid WhatsApp number, digits only.":["कृपया सही WhatsApp नंबर लिखें, केवल अंक।","Informe um WhatsApp válido, só números.","Ingrese un WhatsApp válido, solo números."],
  "Please check the email address.":["कृपया ईमेल पता जाँचें।","Confira o endereço de e-mail.","Revise la dirección de correo."],
  "Source: UN COMTRADE.":["स्रोत: UN COMTRADE।","Fonte: UN COMTRADE.","Fuente: UN COMTRADE."],
  "Indian chemical products (US$ 1.07 bn) and organic chemicals (US$ 715 mn) exported to Brazil in 2024.":["2024 में भारत से ब्राज़ील को निर्यात हुए रासायनिक उत्पाद (US$ 1.07 अरब) और कार्बनिक रसायन (US$ 71.5 करोड़)।","Produtos químicos (US$ 1,07 bi) e químicos orgânicos (US$ 715 mi) exportados pela Índia ao Brasil em 2024.","Productos químicos (US$ 1.070 M) y químicos orgánicos (US$ 715 M) exportados por India a Brasil en 2024."],
  "Indian mineral fuels and oils exported to Brazil in 2024.":["2024 में भारत से ब्राज़ील को निर्यात हुए खनिज ईंधन और तेल।","Combustíveis minerais e óleos exportados pela Índia ao Brasil em 2024.","Combustibles minerales y aceites exportados por India a Brasil en 2024."],
  "Indian rubber products exported to Brazil in 2024, besides plastics.":["2024 में भारत से ब्राज़ील को निर्यात हुए रबर उत्पाद, प्लास्टिक के अलावा।","Produtos de borracha exportados pela Índia ao Brasil em 2024, além de plásticos.","Productos de caucho exportados por India a Brasil en 2024, además de plásticos."],
  "Indian machinery and boilers exported to Brazil in 2024.":["2024 में भारत से ब्राज़ील को निर्यात हुई मशीनरी और बॉयलर।","Máquinas e caldeiras exportadas pela Índia ao Brasil em 2024.","Maquinaria y calderas exportadas por India a Brasil en 2024."],
  "Indian vehicles and auto parts exported to Brazil in 2024.":["2024 में भारत से ब्राज़ील को निर्यात हुए वाहन और ऑटो पार्ट्स।","Veículos e autopeças exportados pela Índia ao Brasil em 2024.","Vehículos y autopartes exportados por India a Brasil en 2024."],
  "Indian pharmaceuticals exported to Brazil in 2024.":["2024 में भारत से ब्राज़ील को निर्यात हुई दवाइयाँ।","Farmacêuticos exportados pela Índia ao Brasil em 2024.","Farmacéuticos exportados por India a Brasil en 2024."],
  "Indian iron and steel exported to Brazil in 2024.":["2024 में भारत से ब्राज़ील को निर्यात हुआ लोहा और स्टील।","Ferro e aço exportados pela Índia ao Brasil em 2024.","Hierro y acero exportados por India a Brasil en 2024."],
  "Indian electrical equipment exported to Brazil in 2024.":["2024 में भारत से ब्राज़ील को निर्यात हुए विद्युत उपकरण।","Equipamentos elétricos exportados pela Índia ao Brasil em 2024.","Equipos eléctricos exportados por India a Brasil en 2024."],
  "Indian synthetic filaments exported to Brazil in 2024, besides cotton yarn, fabrics and apparel.":["2024 में भारत से ब्राज़ील को निर्यात हुए सिंथेटिक फ़िलामेंट, सूती धागे, कपड़े और परिधान के अलावा।","Filamentos sintéticos exportados pela Índia ao Brasil em 2024, além de fios de algodão, tecidos e roupas.","Filamentos sintéticos exportados por India a Brasil en 2024, además de hilo de algodón, telas y ropa."],
  "Total Indian exports to Brazil in 2024, across many categories.":["2024 में भारत से ब्राज़ील को कुल निर्यात, कई श्रेणियों में।","Total exportado pela Índia ao Brasil em 2024, em muitas categorias.","Total exportado por India a Brasil en 2024, en muchas categorías."],
  // Faixa de 6 meses grátis
  "months free":["महीने मुफ़्त","meses grátis","meses gratis"],
  "Start free today. No joining fee, no card, no commission.":["आज ही मुफ़्त शुरू करें। न जॉइनिंग शुल्क, न कार्ड, न कमीशन।","Comece grátis hoje. Sem taxa de adesão, sem cartão, sem comissão.","Empiece gratis hoy. Sin cuota de alta, sin tarjeta, sin comisión."],
  "Receive and answer as many Brazilian RFQs as you want for 6 months. After that, a simple plan with the price told in advance, and you decide if you continue.":["6 महीने तक जितने चाहें ब्राज़ीलियाई RFQ पाएँ और उनका जवाब दें। उसके बाद एक सरल प्लान, जिसकी कीमत पहले बताई जाएगी, और आगे जारी रखना आपका फ़ैसला।","Receba e responda quantas RFQs brasileiras quiser por 6 meses. Depois, um plano simples com o valor informado antes, e você decide se continua.","Reciba y responda todas las RFQ brasileñas que quiera durante 6 meses. Después, un plan simple con el precio informado de antemano, y usted decide si continúa."],
  "Claim my 6 free months →":["मेरे 6 मुफ़्त महीने पाएँ →","Garantir meus 6 meses grátis →","Obtener mis 6 meses gratis →"],
  // Números
  "Brazil is already buying from India. The question is whether it buys from you.":["ब्राज़ील पहले से भारत से खरीद रहा है। सवाल यह है कि क्या वह आपसे खरीदता है।","O Brasil já compra da Índia. A questão é se ele compra de você.","Brasil ya compra a India. La pregunta es si le compra a usted."],
  "The trade corridor between India and Brazil is large, growing and getting easier.":["भारत और ब्राज़ील के बीच व्यापार गलियारा बड़ा है, बढ़ रहा है और आसान होता जा रहा है।","O corredor comercial entre Índia e Brasil é grande, está crescendo e ficando mais fácil.","El corredor comercial entre India y Brasil es grande, crece y es cada vez más fácil."],
  "US$ 6.4 bn":["US$ 6.4 अरब","US$ 6,4 bi","US$ 6.400 M"],
  "Indian exports to Brazil in 2024":["2024 में भारत का ब्राज़ील को निर्यात","Exportações da Índia ao Brasil em 2024","Exportaciones de India a Brasil en 2024"],
  "US$ 21 bn":["US$ 21 अरब","US$ 21 bi","US$ 21.000 M"],
  "Brazil imports US$ 280 billion a year. India supplies only 3%.":["ब्राज़ील हर साल US$ 280 अरब का आयात करता है। भारत केवल 3% देता है।","O Brasil importa US$ 280 bilhões por ano. A Índia fornece só 3%.","Brasil importa US$ 280.000 millones al año. India suministra solo el 3%."],
  "Brazilian companies buy machinery, chemicals, auto parts, pharma and much more from the world. Every dollar still bought from other countries is an opportunity for Indian suppliers.":["ब्राज़ील की कंपनियाँ दुनिया से मशीनरी, केमिकल, ऑटो पार्ट्स, फ़ार्मा और बहुत कुछ खरीदती हैं। दूसरे देशों से खरीदा जा रहा हर डॉलर भारतीय सप्लायरों के लिए एक अवसर है।","Empresas brasileiras compram do mundo máquinas, químicos, autopeças, fármacos e muito mais. Cada dólar ainda comprado de outros países é uma oportunidade para fornecedores indianos.","Las empresas brasileñas compran al mundo maquinaria, químicos, autopartes, fármacos y mucho más. Cada dólar que aún se compra a otros países es una oportunidad para los proveedores indios."],
  "US$ 280 bn":["US$ 280 अरब","US$ 280 bi","US$ 280.000 M"],
  "Brazil’s imports from the world in 2025":["2025 में ब्राज़ील का दुनिया से आयात","Importações do Brasil do mundo em 2025","Importaciones de Brasil desde el mundo en 2025"],
  "India · US$ 8.4 bn (3%)":["भारत · US$ 8.4 अरब (3%)","Índia · US$ 8,4 bi (3%)","India · US$ 8.400 M (3%)"],
  "Rest of the world · US$ 272 bn (97%)":["बाकी दुनिया · US$ 272 अरब (97%)","Resto do mundo · US$ 272 bi (97%)","Resto del mundo · US$ 272.000 M (97%)"],
  "US$ 8.4 bn":["US$ 8.4 अरब","US$ 8,4 bi","US$ 8.400 M"],
  "Brazil’s imports from India in 2025, up 21% on 2024":["2025 में ब्राज़ील का भारत से आयात, 2024 से 21% अधिक","Importações do Brasil da Índia em 2025, alta de 21% sobre 2024","Importaciones de Brasil desde India en 2025, un 21% más que en 2024"],
  "Sources: Secex/MDIC, Government of Brazil; ApexBrasil; Ministry of Commerce & Industry, Government of India; India–Mercosur PTA.":["स्रोत: Secex/MDIC, ब्राज़ील सरकार; ApexBrasil; वाणिज्य एवं उद्योग मंत्रालय, भारत सरकार; भारत–मर्कोसुर PTA।","Fontes: Secex/MDIC, Governo do Brasil; ApexBrasil; Ministério do Comércio e Indústria da Índia; ACP Índia–Mercosul.","Fuentes: Secex/MDIC, Gobierno de Brasil; ApexBrasil; Ministerio de Comercio e Industria de India; ACP India–Mercosur."],
  "India–Mercosur bilateral trade in 2025":["2025 में भारत–मर्कोसुर द्विपक्षीय व्यापार","Comércio bilateral Índia–Mercosul em 2025","Comercio bilateral India–Mercosur en 2025"],
  "tariff lines with duty preference for India under the India–Mercosur PTA, with cuts of 10% to 100%":["भारत–मर्कोसुर PTA के तहत भारत के लिए शुल्क रियायत वाली टैरिफ़ लाइनें, 10% से 100% तक की कटौती","linhas tarifárias com preferência para a Índia no acordo Índia–Mercosul (PTA), com reduções de 10% a 100%","líneas arancelarias con preferencia para India en el acuerdo India–Mercosur (PTA), con reducciones del 10% al 100%"],
  "215 million":["21.5 करोड़","215 milhões","215 millones"],
  "consumers in Brazil, Latin America’s largest economy":["उपभोक्ता ब्राज़ील में, लैटिन अमेरिका की सबसे बड़ी अर्थव्यवस्था","consumidores no Brasil, a maior economia da América Latina","consumidores en Brasil, la mayor economía de América Latina"],
  "Sources: UN COMTRADE; Ministry of Commerce & Industry, Government of India; India–Mercosur PTA.":["स्रोत: UN COMTRADE; वाणिज्य एवं उद्योग मंत्रालय, भारत सरकार; भारत–मर्कोसुर PTA।","Fontes: UN COMTRADE; Ministério do Comércio e Indústria da Índia; acordo Índia–Mercosul (PTA).","Fuentes: UN COMTRADE; Ministerio de Comercio e Industria de India; acuerdo India–Mercosur (PTA)."],
  "What Brazil buys from India":["ब्राज़ील भारत से क्या खरीदता है","O que o Brasil compra da Índia","Qué compra Brasil a India"],
  "Top Indian export categories to Brazil in 2024. If your products are in these sectors, Brazilian companies are already looking for suppliers like you.":["2024 में ब्राज़ील को भारत के प्रमुख निर्यात वर्ग। अगर आपके उत्पाद इन क्षेत्रों में हैं, तो ब्राज़ील की कंपनियाँ पहले से आप जैसे आपूर्तिकर्ताओं को ढूँढ रही हैं।","Principais categorias exportadas pela Índia ao Brasil em 2024. Se seus produtos estão nesses setores, empresas brasileiras já procuram fornecedores como você.","Principales categorías exportadas por India a Brasil en 2024. Si sus productos están en estos sectores, empresas brasileñas ya buscan proveedores como usted."],
  "Chemical products":["रासायनिक उत्पाद","Produtos químicos","Productos químicos"],
  "Mineral fuels and oils":["खनिज ईंधन और तेल","Combustíveis minerais e óleos","Combustibles minerales y aceites"],
  "Organic chemicals":["कार्बनिक रसायन","Químicos orgânicos","Químicos orgánicos"],
  "Machinery and boilers":["मशीनरी और बॉयलर","Máquinas e caldeiras","Maquinaria y calderas"],
  "Vehicles and auto parts":["वाहन और ऑटो पार्ट्स","Veículos e autopeças","Vehículos y autopartes"],
  "Pharmaceuticals":["दवाइयाँ","Farmacêuticos","Farmacéuticos"],
  "Rubber products":["रबर उत्पाद","Produtos de borracha","Productos de caucho"],
  "Iron and steel":["लोहा और स्टील","Ferro e aço","Hierro y acero"],
  "Synthetic filaments":["सिंथेटिक फ़िलामेंट","Filamentos sintéticos","Filamentos sintéticos"],
  "$1.07 bn":["$1.07 अरब","$1,07 bi","$1.070 M"],
  "$792 mn":["$79.2 करोड़","$792 mi","$792 M"],
  "$715 mn":["$71.5 करोड़","$715 mi","$715 M"],
  "$674 mn":["$67.4 करोड़","$674 mi","$674 M"],
  "$650 mn":["$65 करोड़","$650 mi","$650 M"],
  "$472 mn":["$47.2 करोड़","$472 mi","$472 M"],
  "$211 mn":["$21.1 करोड़","$211 mi","$211 M"],
  "$186 mn":["$18.6 करोड़","$186 mi","$186 M"],
  "$155 mn":["$15.5 करोड़","$155 mi","$155 M"],
  "$144 mn":["$14.4 करोड़","$144 mi","$144 M"],
  "See demand →":["माँग देखें →","Ver demanda →","Ver demanda →"],
  "Source: UN COMTRADE, India exports to Brazil, 2024 (US$).":["स्रोत: UN COMTRADE, भारत का ब्राज़ील को निर्यात, 2024 (US$)।","Fonte: UN COMTRADE, exportações da Índia ao Brasil, 2024 (US$).","Fuente: UN COMTRADE, exportaciones de India a Brasil, 2024 (US$)."],
  "Don’t see your sector?":["आपका क्षेत्र नहीं दिख रहा?","Seu setor não aparece?","¿No ve su sector?"],
  "Register anyway. We receive requests across many other categories, from textiles and steel to food and handicrafts.":["फिर भी रजिस्टर करें। हमें कई अन्य श्रेणियों में अनुरोध मिलते हैं, कपड़ा और स्टील से लेकर खाद्य और हस्तशिल्प तक।","Cadastre-se mesmo assim. Recebemos pedidos de muitas outras categorias, de têxteis e aço a alimentos e artesanato.","Regístrese de todos modos. Recibimos solicitudes de muchas otras categorías, de textiles y acero a alimentos y artesanías."],
  // RFQ de exemplo
  "You don’t look for buyers. We bring the quotations to you.":["आपको खरीदार नहीं ढूँढने पड़ते। कोटेशन अनुरोध हम आप तक लाते हैं।","Você não procura compradores. Nós levamos as cotações até você.","Usted no busca compradores. Nosotros le llevamos las cotizaciones."],
  "Our team in Brazil works with importers, distributors and industries every day. When they need a product, we prepare the request and send it to the right Indian suppliers.":["ब्राज़ील में हमारी टीम हर दिन आयातकों, वितरकों और उद्योगों के साथ काम करती है। जब उन्हें कोई उत्पाद चाहिए, हम अनुरोध तैयार करके सही भारतीय आपूर्तिकर्ताओं को भेजते हैं।","Nossa equipe no Brasil trabalha todos os dias com importadores, distribuidores e indústrias. Quando eles precisam de um produto, preparamos o pedido e enviamos aos fornecedores indianos certos.","Nuestro equipo en Brasil trabaja a diario con importadores, distribuidores e industrias. Cuando necesitan un producto, preparamos la solicitud y la enviamos a los proveedores indios adecuados."],
  "Complete requirements.":["पूरी जानकारी।","Pedido completo.","Requisitos completos."],
  "Product, specification, quantity, Incoterm, destination port and delivery date.":["उत्पाद, विनिर्देश, मात्रा, Incoterm, गंतव्य बंदरगाह और डिलीवरी की तारीख।","Produto, especificação, quantidade, Incoterm, porto de destino e prazo de entrega.","Producto, especificación, cantidad, Incoterm, puerto de destino y fecha de entrega."],
  "Verified buyers only.":["केवल सत्यापित खरीदार।","Só compradores verificados.","Solo compradores verificados."],
  "We check every Brazilian company before sending you an RFQ.":["RFQ भेजने से पहले हम हर ब्राज़ीलियाई कंपनी की जाँच करते हैं।","Verificamos cada empresa brasileira antes de enviar uma RFQ a você.","Verificamos cada empresa brasileña antes de enviarle una RFQ."],
  "Not a lead, a purchase request.":["लीड नहीं, खरीद का अनुरोध।","Não é lead, é pedido de compra.","No es un lead, es una solicitud de compra."],
  "No paid leads: for 6 months you pay nothing to receive or answer RFQs.":["कोई पेड लीड नहीं: 6 महीने तक RFQ पाने या जवाब देने का कोई शुल्क नहीं।","Sem leads pagos: por 6 meses você não paga nada para receber ou responder RFQs.","Sin leads pagados: durante 6 meses no paga nada por recibir o responder RFQ."],
  "In English.":["अंग्रेज़ी में।","Em inglês.","En inglés."],
  "We translate from Portuguese and support the conversation when needed.":["हम पुर्तगाली से अनुवाद करते हैं और ज़रूरत पड़ने पर बातचीत में मदद करते हैं।","Traduzimos do português e apoiamos a conversa quando necessário.","Traducimos del portugués y apoyamos la conversación cuando hace falta."],
  "Get RFQs like this →":["ऐसे RFQ पाएँ →","Receber RFQs como esta →","Recibir RFQ como esta →"],
  "New quotation request":["नया कोटेशन अनुरोध","Novo pedido de cotação","Nueva solicitud de cotización"],
  "Product":["उत्पाद","Produto","Producto"],
  "Stainless steel ball valves, ASTM A351 CF8M":["स्टेनलेस स्टील बॉल वाल्व, ASTM A351 CF8M","Válvulas esfera em aço inox, ASTM A351 CF8M","Válvulas de bola de acero inoxidable, ASTM A351 CF8M"],
  "Reactive dyes for cotton: Red 195, Yellow 145, Blue 221":["कॉटन के लिए रिएक्टिव डाई: Red 195, Yellow 145, Blue 221","Corantes reativos para algodão: Red 195, Yellow 145, Blue 221","Colorantes reactivos para algodón: Red 195, Yellow 145, Blue 221"],
  "Packing":["पैकिंग","Embalagem","Embalaje"],
  "25 kg HDPE bags, COA and SDS per lot":["25 किलो HDPE बैग, हर लॉट के साथ COA और SDS","Sacos HDPE de 25 kg, COA e FISPQ por lote","Sacos HDPE de 25 kg, COA y FDS por lote"],
  "12 metric tonnes":["12 मीट्रिक टन","12 toneladas","12 toneladas"],
  "CFR Itajaí, Brazil":["CFR इताजाई, ब्राज़ील","CFR Itajaí, Brasil","CFR Itajaí, Brasil"],
  "Within 45 days of PO":["PO के 45 दिनों के भीतर","Até 45 dias após o pedido (PO)","Dentro de 45 días tras la orden (PO)"],
  "Textile dyeing mill, Santa Catarina":["टेक्सटाइल डाइंग मिल, सांता कैटरीना","Tinturaria têxtil, Santa Catarina","Tintorería textil, Santa Catarina"],
  "Base oil SN 150 and SN 500, Group I":["बेस ऑयल SN 150 और SN 500, ग्रुप I","Óleo básico SN 150 e SN 500, Grupo I","Aceite base SN 150 y SN 500, Grupo I"],
  "Flexitanks in 20' containers":["20' कंटेनरों में फ्लेक्सीटैंक","Flexitanks em contêineres de 20'","Flexitanques en contenedores de 20'"],
  "400 metric tonnes per quarter":["हर तिमाही 400 मीट्रिक टन","400 toneladas por trimestre","400 toneladas por trimestre"],
  "CIF Paranaguá, Brazil":["CIF पारानागुआ, ब्राज़ील","CIF Paranaguá, Brasil","CIF Paranaguá, Brasil"],
  "Within 30 days of PO":["PO के 30 दिनों के भीतर","Até 30 dias após o pedido (PO)","Dentro de 30 días tras la orden (PO)"],
  "Lubricant blender, Paraná":["लुब्रिकेंट ब्लेंडर, पराना","Fabricante de lubrificantes, Paraná","Fabricante de lubricantes, Paraná"],
  "Centrifugal pumps, cast iron, 5 to 50 HP":["सेंट्रीफ्यूगल पंप, कास्ट आयरन, 5 से 50 HP","Bombas centrífugas em ferro fundido, 5 a 50 HP","Bombas centrífugas de hierro fundido, 5 a 50 HP"],
  "Standard":["मानक","Norma","Norma"],
  "ISO 2858, IE3 motors, 220/380 V, 60 Hz":["ISO 2858, IE3 मोटर, 220/380 V, 60 Hz","ISO 2858, motores IE3, 220/380 V, 60 Hz","ISO 2858, motores IE3, 220/380 V, 60 Hz"],
  "120 units":["120 यूनिट","120 unidades","120 unidades"],
  "FOB Nhava Sheva, India":["FOB न्हावा शेवा, भारत","FOB Nhava Sheva, Índia","FOB Nhava Sheva, India"],
  "Within 75 days of PO":["PO के 75 दिनों के भीतर","Até 75 dias após o pedido (PO)","Dentro de 75 días tras la orden (PO)"],
  "Brake pads and brake shoes for light commercial vehicles":["हल्के कमर्शियल वाहनों के लिए ब्रेक पैड और ब्रेक शू","Pastilhas e lonas de freio para veículos comerciais leves","Pastillas y zapatas de freno para vehículos comerciales ligeros"],
  "Specification":["विनिर्देश","Especificação","Especificación"],
  "OEM cross-reference list provided by buyer":["खरीदार द्वारा दी गई OEM क्रॉस-रेफ़रेंस सूची","Lista de referência cruzada OEM enviada pelo comprador","Lista de referencias cruzadas OEM enviada por el comprador"],
  "20,000 sets":["20,000 सेट","20.000 jogos","20.000 juegos"],
  "CIF Itajaí, Brazil":["CIF इताजाई, ब्राज़ील","CIF Itajaí, Brasil","CIF Itajaí, Brasil"],
  "Auto parts distributor, Minas Gerais":["ऑटो पार्ट्स वितरक, मिनास जेराइस","Distribuidor de autopeças, Minas Gerais","Distribuidor de autopartes, Minas Gerais"],
  "Paracetamol API, BP/USP grade":["पैरासिटामोल API, BP/USP ग्रेड","IFA paracetamol, grau BP/USP","API de paracetamol, grado BP/USP"],
  "Documents":["दस्तावेज़","Documentos","Documentos"],
  "GMP certificate, DMF and COA required":["GMP प्रमाणपत्र, DMF और COA आवश्यक","Certificado GMP, DMF e COA obrigatórios","Se requieren certificado GMP, DMF y COA"],
  "5 metric tonnes":["5 मीट्रिक टन","5 toneladas","5 toneladas"],
  "CIP Viracopos airport, Brazil":["CIP विराकोपोस एयरपोर्ट, ब्राज़ील","CIP aeroporto de Viracopos, Brasil","CIP aeropuerto de Viracopos, Brasil"],
  "Pharmaceutical manufacturer, Goiás":["दवा निर्माता, गोयास","Indústria farmacêutica, Goiás","Fabricante farmacéutico, Goiás"],
  "HDPE electrofusion pipe fittings, PE100":["HDPE इलेक्ट्रोफ्यूज़न पाइप फ़िटिंग, PE100","Conexões de eletrofusão em PEAD, PE100","Accesorios de electrofusión en PEAD, PE100"],
  "20 mm to 315 mm":["20 mm से 315 mm","20 mm a 315 mm","20 mm a 315 mm"],
  "8,000 pieces":["8,000 पीस","8.000 peças","8.000 piezas"],
  "CIF Salvador, Brazil":["CIF सल्वाडोर, ब्राज़ील","CIF Salvador, Brasil","CIF Salvador, Brasil"],
  "Water utility contractor, Bahia":["जल आपूर्ति ठेकेदार, बाहिया","Empreiteira de saneamento, Bahia","Contratista de agua y saneamiento, Bahía"],
  "LED street lights, 100 W and 150 W":["LED स्ट्रीट लाइट, 100 W और 150 W","Luminárias públicas LED, 100 W e 150 W","Luminarias LED para alumbrado público, 100 W y 150 W"],
  "IP66, 5,000 K, 220 V / 60 Hz":["IP66, 5,000 K, 220 V / 60 Hz","IP66, 5.000 K, 220 V / 60 Hz","IP66, 5.000 K, 220 V / 60 Hz"],
  "3,000 units":["3,000 यूनिट","3.000 unidades","3.000 unidades"],
  "CIF Suape, Brazil":["CIF सुआपे, ब्राज़ील","CIF Suape, Brasil","CIF Suape, Brasil"],
  "Electrical wholesaler, Pernambuco":["इलेक्ट्रिकल थोक विक्रेता, पेर्नाम्बुको","Atacadista de material elétrico, Pernambuco","Mayorista de material eléctrico, Pernambuco"],
  "Stainless steel sheets, grade 304 and 316L, cold rolled":["स्टेनलेस स्टील शीट, ग्रेड 304 और 316L, कोल्ड रोल्ड","Chapas de aço inox 304 e 316L, laminadas a frio","Chapas de acero inoxidable 304 y 316L, laminadas en frío"],
  "Thickness":["मोटाई","Espessura","Espesor"],
  "0.5 mm to 3 mm, 2B finish":["0.5 mm से 3 mm, 2B फ़िनिश","0,5 mm a 3 mm, acabamento 2B","0,5 mm a 3 mm, acabado 2B"],
  "60 metric tonnes":["60 मीट्रिक टन","60 toneladas","60 toneladas"],
  "Metal service centre, São Paulo":["मेटल सर्विस सेंटर, साओ पाउलो","Centro de serviços de aço, São Paulo","Centro de servicios de acero, São Paulo"],
  "Polyester filament yarn, 150D/48F, dope dyed black":["पॉलिएस्टर फ़िलामेंट यार्न, 150D/48F, डोप डाइड ब्लैक","Fio de filamento de poliéster 150D/48F, tinto na massa preto","Hilo de filamento de poliéster 150D/48F, teñido en masa negro"],
  "Paper cones on pallets":["पैलेट पर पेपर कोन","Cones de papel em paletes","Conos de papel en palés"],
  "24 metric tonnes":["24 मीट्रिक टन","24 toneladas","24 toneladas"],
  "CFR Navegantes, Brazil":["CFR नवेगांतेस, ब्राज़ील","CFR Navegantes, Brasil","CFR Navegantes, Brasil"],
  "Knitting mill, Santa Catarina":["निटिंग मिल, सांता कैटरीना","Malharia, Santa Catarina","Tejeduría de punto, Santa Catarina"],
  "Sizes":["आकार","Tamanhos","Tamaños"],
  "1/2\" to 4\", flanged":["1/2\" से 4\", फ़्लैंज्ड","1/2\" a 4\", flangeadas","1/2\" a 4\", bridadas"],
  "Quantity":["मात्रा","Quantidade","Cantidad"],
  "5,000 pieces":["5,000 पीस","5.000 peças","5.000 piezas"],
  "CIF Santos, Brazil":["CIF सैंटोस, ब्राज़ील","CIF Santos, Brasil","CIF Santos, Brasil"],
  "Delivery":["डिलीवरी","Entrega","Entrega"],
  "Within 60 days of PO":["PO के 60 दिनों के भीतर","Até 60 dias após o pedido (PO)","Dentro de 60 días tras la orden (PO)"],
  "Buyer":["खरीदार","Comprador","Comprador"],
  "Industrial distributor, São Paulo":["औद्योगिक वितरक, साओ पाउलो","Distribuidor industrial, São Paulo","Distribuidor industrial, São Paulo"],
  "✓ Verified":["✓ सत्यापित","✓ Verificado","✓ Verificado"],
  "Quote by":["कोटेशन की अंतिम तिथि","Cotar até","Cotizar antes de"],
  "7 working days":["7 कार्य दिवस","7 dias úteis","7 días hábiles"],
  "Send quotation":["कोटेशन भेजें","Enviar cotação","Enviar cotización"],
  "Reply on WhatsApp":["WhatsApp पर जवाब दें","Responder no WhatsApp","Responder por WhatsApp"],
  "Example of an RFQ as you will receive it.":["RFQ का उदाहरण, जैसे आपको मिलेगा।","Exemplo de RFQ como você vai receber.","Ejemplo de RFQ tal como la recibirá."],
  // Como funciona
  "From first click to first quotation in four steps":["पहले क्लिक से पहले कोटेशन तक, चार चरणों में","Do primeiro clique à primeira cotação em quatro passos","Del primer clic a la primera cotización en cuatro pasos"],
  "We work as a trade facilitator. We do not buy or resell your goods, and payments go directly between you and the buyer. During the 6 free months you never pay to receive or answer an RFQ.":["हम व्यापार सुविधाकर्ता के रूप में काम करते हैं। हम आपका माल न खरीदते हैं, न बेचते हैं, और भुगतान सीधे आपके और खरीदार के बीच होता है। 6 मुफ़्त महीनों में RFQ पाने या जवाब देने का कोई शुल्क नहीं।","Atuamos como facilitadores comerciais. Não compramos nem revendemos seus produtos, e o pagamento é feito direto entre você e o comprador. Nos 6 meses grátis, você não paga para receber nem para responder RFQs.","Actuamos como facilitadores comerciales. No compramos ni revendemos sus productos, y el pago es directo entre usted y el comprador. En los 6 meses gratis no paga por recibir ni responder RFQ."],
  "Mumbai, India":["मुंबई, भारत","Mumbai, Índia","Bombay, India"],
  "Your factory":["आपकी फ़ैक्ट्री","Sua fábrica","Su fábrica"],
  "RFQs delivered to you":["RFQ सीधे आप तक","RFQs entregues a você","RFQ entregadas a usted"],
  "São Paulo, Brazil":["साओ पाउलो, ब्राज़ील","São Paulo, Brasil","São Paulo, Brasil"],
  "Your new customers":["आपके नए ग्राहक","Seus novos clientes","Sus nuevos clientes"],
  "Tell us your product":["अपना उत्पाद बताइए","Conte qual é seu produto","Cuéntenos su producto"],
  "Use the demand check or WhatsApp, then complete your profile and catalogue. 2 to 5 minutes.":["माँग जाँच या WhatsApp से शुरू करें, फिर अपनी प्रोफ़ाइल और कैटलॉग पूरा करें। 2 से 5 मिनट।","Use o teste de demanda ou o WhatsApp e depois complete seu perfil e catálogo. De 2 a 5 minutos.","Use la prueba de demanda o WhatsApp y luego complete su perfil y catálogo. De 2 a 5 minutos."],
  "We publish your profile":["हम आपकी प्रोफ़ाइल प्रकाशित करते हैं","Publicamos seu perfil","Publicamos su perfil"],
  "We verify your IEC and present your products to Brazilian buyers.":["हम आपका IEC सत्यापित करते हैं और आपके उत्पाद ब्राज़ील के खरीदारों के सामने रखते हैं।","Verificamos seu IEC e apresentamos seus produtos a compradores brasileiros.","Verificamos su IEC y presentamos sus productos a compradores brasileños."],
  "Buyers request quotations":["खरीदार कोटेशन माँगते हैं","Compradores pedem cotações","Los compradores piden cotizaciones"],
  "Brazilian companies tell us what they need, and we qualify each request.":["ब्राज़ील की कंपनियाँ बताती हैं कि उन्हें क्या चाहिए, और हम हर अनुरोध की जाँच करते हैं।","Empresas brasileiras dizem o que precisam, e nós qualificamos cada pedido.","Empresas brasileñas nos dicen qué necesitan y calificamos cada solicitud."],
  "You receive the RFQ":["आपको RFQ मिलता है","Você recebe a RFQ","Usted recibe la RFQ"],
  "We send the full requirement to you. You quote and close the deal directly.":["हम पूरी ज़रूरत आपको भेजते हैं। आप कोटेशन देते हैं और सौदा सीधे करते हैं।","Enviamos o pedido completo a você. Você cota e fecha o negócio diretamente.","Le enviamos el requisito completo. Usted cotiza y cierra el negocio directamente."],
  // Por que nós + comparação
  "Why suppliers choose India Brazil":["आपूर्तिकर्ता India Brazil क्यों चुनते हैं","Por que os fornecedores escolhem a India Brazil","Por qué los proveedores eligen India Brazil"],
  "A team inside Brazil":["ब्राज़ील में मौजूद टीम","Uma equipe dentro do Brasil","Un equipo dentro de Brasil"],
  "We speak Portuguese, know Brazilian import rules and meet buyers locally. You get the market access of a local office, without opening one.":["हम पुर्तगाली बोलते हैं, ब्राज़ील के आयात नियम जानते हैं और खरीदारों से स्थानीय रूप से मिलते हैं। आपको स्थानीय ऑफ़िस जैसी बाज़ार पहुँच मिलती है, बिना ऑफ़िस खोले।","Falamos português, conhecemos as regras de importação do Brasil e encontramos os compradores no local. Você tem o acesso de um escritório local, sem precisar abrir um.","Hablamos portugués, conocemos las reglas de importación de Brasil y nos reunimos con compradores en el lugar. Usted tiene el acceso de una oficina local sin abrir una."],
  "Real buyers, not leads for sale":["असली खरीदार, बिकाऊ लीड नहीं","Compradores reais, não leads à venda","Compradores reales, no leads a la venta"],
  "No bidding for leads, no shared lists sold to hundreds of sellers. Each RFQ goes to a small group of matching suppliers.":["लीड के लिए बोली नहीं, सैकड़ों विक्रेताओं को बेची गई साझा सूचियाँ नहीं। हर RFQ मेल खाते आपूर्तिकर्ताओं के छोटे समूह को जाता है।","Sem leilão de leads, sem listas vendidas a centenas de vendedores. Cada RFQ vai para um grupo pequeno de fornecedores compatíveis.","Sin subastas de leads ni listas vendidas a cientos de vendedores. Cada RFQ va a un grupo pequeño de proveedores compatibles."],
  "6 months free, then your choice":["6 महीने मुफ़्त, फिर आपकी मर्ज़ी","6 meses grátis, depois você escolhe","6 meses gratis, luego usted decide"],
  "No joining fee, no card and no commission. After 6 months we show you a simple plan with the price in advance. Nothing is charged without your decision.":["न जॉइनिंग शुल्क, न कार्ड, न कमीशन। 6 महीने बाद हम एक सरल प्लान उसकी कीमत के साथ पहले से दिखाते हैं। आपकी मंज़ूरी के बिना कुछ भी चार्ज नहीं होता।","Sem taxa de adesão, sem cartão e sem comissão. Depois de 6 meses mostramos um plano simples com o valor antes. Nada é cobrado sem a sua decisão.","Sin cuota de alta, sin tarjeta y sin comisión. Después de 6 meses le mostramos un plan simple con el precio por adelantado. Nada se cobra sin su decisión."],
  "Four ways to find a Brazilian buyer. Only one starts free, today.":["ब्राज़ीलियाई खरीदार ढूँढने के चार तरीके। सिर्फ़ एक आज, मुफ़्त शुरू होता है।","Quatro formas de encontrar um comprador brasileiro. Só uma começa grátis, hoje.","Cuatro formas de encontrar un comprador brasileño. Solo una empieza gratis, hoy."],
  "Trade fair in Brazil":["ब्राज़ील में ट्रेड फ़ेयर","Feira no Brasil","Feria en Brasil"],
  "Local agent":["स्थानीय एजेंट","Agente local","Agente local"],
  "Paid lead portals":["पेड लीड पोर्टल","Portais de lead pago","Portales de leads pagados"],
  "Upfront cost":["शुरुआती लागत","Custo inicial","Costo inicial"],
  "Travel, stand, samples":["यात्रा, स्टॉल, सैंपल","Viagem, estande, amostras","Viaje, stand, muestras"],
  "Retainer or joining fee":["रिटेनर या जॉइनिंग शुल्क","Mensalidade ou taxa de adesão","Honorarios o cuota de alta"],
  "Subscription or pay per lead":["सब्सक्रिप्शन या प्रति लीड भुगतान","Assinatura ou pagamento por lead","Suscripción o pago por lead"],
  "Free for 6 months, no card":["6 महीने मुफ़्त, कोई कार्ड नहीं","Grátis por 6 meses, sem cartão","Gratis por 6 meses, sin tarjeta"],
  "Who qualifies the buyer":["खरीदार की जाँच कौन करता है","Quem qualifica o comprador","Quién califica al comprador"],
  "You, at the stand":["आप, स्टॉल पर","Você, no estande","Usted, en el stand"],
  "The agent":["एजेंट","O agente","El agente"],
  "Often nobody":["अक्सर कोई नहीं","Muitas vezes, ninguém","A menudo, nadie"],
  "We do, before the RFQ reaches you":["हम, RFQ आप तक पहुँचने से पहले","Nós, antes de a RFQ chegar a você","Nosotros, antes de que la RFQ le llegue"],
  "Language":["भाषा","Idioma","Idioma"],
  "Portuguese needed":["पुर्तगाली ज़रूरी","Exige português","Requiere portugués"],
  "Agent translates":["एजेंट अनुवाद करता है","O agente traduz","El agente traduce"],
  "Varies":["अलग-अलग","Varia","Varía"],
  "English. We translate.":["अंग्रेज़ी। अनुवाद हम करते हैं।","Inglês. Nós traduzimos.","Inglés. Nosotros traducimos."],
  "Time to first conversation":["पहली बातचीत तक का समय","Tempo até a primeira conversa","Tiempo hasta la primera conversación"],
  "Months of planning":["महीनों की योजना","Meses de planejamento","Meses de planificación"],
  "Weeks to find an agent":["एजेंट ढूँढने में हफ़्ते","Semanas para achar um agente","Semanas para encontrar un agente"],
  "Depends on the lead":["लीड पर निर्भर","Depende do lead","Depende del lead"],
  "Starts when you register":["रजिस्टर करते ही शुरू","Começa no cadastro","Empieza al registrarse"],
  "Typical models. Individual providers may differ.":["सामान्य मॉडल। हर प्रदाता अलग हो सकता है।","Modelos típicos. Cada fornecedor pode ser diferente.","Modelos típicos. Cada proveedor puede variar."],
  // Momento + cadastro
  "The right moment to enter Brazil":["ब्राज़ील में प्रवेश का सही समय","O momento certo de entrar no Brasil","El momento justo para entrar en Brasil"],
  "India and Mercosur launched negotiations to expand their Preferential Trade Agreement towards a wider free trade deal, and signed a protocol accepting electronic Certificates of Origin. Suppliers who build relationships with Brazilian buyers now will be first in line.":["भारत और मर्कोसुर ने अपने वरीयता व्यापार समझौते को व्यापक मुक्त व्यापार समझौते की ओर बढ़ाने की बातचीत शुरू की है, और इलेक्ट्रॉनिक मूल प्रमाणपत्र (Certificate of Origin) स्वीकार करने वाले प्रोटोकॉल पर हस्ताक्षर किए हैं। जो आपूर्तिकर्ता अभी ब्राज़ीलियाई खरीदारों से रिश्ते बनाएँगे, वे सबसे आगे रहेंगे।","Índia e Mercosul iniciaram negociações para ampliar o acordo de preferências tarifárias rumo a um acordo de livre comércio mais amplo, e assinaram um protocolo que aceita certificados de origem eletrônicos. Quem construir relações com compradores brasileiros agora chega primeiro.","India y Mercosur iniciaron negociaciones para ampliar su acuerdo de preferencias arancelarias hacia un acuerdo de libre comercio más amplio, y firmaron un protocolo que acepta certificados de origen electrónicos. Quien construya relaciones con compradores brasileños ahora llegará primero."],
  "14 Sep 2026":["14 सितंबर 2026","14 set 2026","14 sept 2026"],
  "India–Mercosur expansion talks launched":["भारत–मर्कोसुर विस्तार वार्ता शुरू","Início das negociações de ampliação Índia–Mercosul","Inicio de las negociaciones de ampliación India–Mercosur"],
  "Start receiving quotation requests":["कोटेशन अनुरोध पाना शुरू करें","Comece a receber pedidos de cotação","Empiece a recibir solicitudes de cotización"],
  "Register in four short steps. Our team in Brazil reviews every registration and contacts you within 2 working days.":["चार छोटे चरणों में रजिस्टर करें। ब्राज़ील में हमारी टीम हर पंजीकरण देखती है और 2 कार्य दिवसों में आपसे संपर्क करती है।","Cadastre-se em quatro passos curtos. Nossa equipe no Brasil revisa cada cadastro e fala com você em até 2 dias úteis.","Regístrese en cuatro pasos cortos. Nuestro equipo en Brasil revisa cada registro y lo contacta en hasta 2 días hábiles."],
  "Company":["कंपनी","Empresa","Empresa"],
  "Name, location and IEC":["नाम, स्थान और IEC","Nome, local e IEC","Nombre, ubicación e IEC"],
  "Contact":["संपर्क","Contato","Contacto"],
  "Who receives the RFQs":["RFQ किसे मिलेंगे","Quem recebe as RFQs","Quién recibe las RFQ"],
  "Products":["उत्पाद","Produtos","Productos"],
  "Categories and certifications":["श्रेणियाँ और प्रमाणपत्र","Categorias e certificações","Categorías y certificaciones"],
  "Catalogue":["कैटलॉग","Catálogo","Catálogo"],
  "Upload and submit":["अपलोड करें और भेजें","Envie e conclua","Suba y envíe"],
  "6 months free":["6 महीने मुफ़्त","6 meses grátis","6 meses gratis"],
  "No joining fee. No card. No commission. About 5 minutes.":["न जॉइनिंग शुल्क। न कार्ड। न कमीशन। लगभग 5 मिनट।","Sem taxa de adesão. Sem cartão. Sem comissão. Cerca de 5 minutos.","Sin cuota de alta. Sin tarjeta. Sin comisión. Unos 5 minutos."],
  "Register your company":["अपनी कंपनी रजिस्टर करें","Cadastre sua empresa","Registre su empresa"],
  "Questions first?":["पहले कुछ पूछना है?","Dúvidas antes?","¿Preguntas antes?"],
  "Talk to us on WhatsApp":["WhatsApp पर बात करें","Fale conosco no WhatsApp","Hable con nosotros por WhatsApp"],
  // Perguntas frequentes
  "Common questions":["आम सवाल","Perguntas frequentes","Preguntas frecuentes"],
  "Is it really free?":["क्या सच में मुफ़्त है?","É mesmo grátis?","¿De verdad es gratis?"],
  "Yes, for 6 months: no joining fee, no card details and no commission, as long as your registration is valid (a verifiable company and contact).":["हाँ, 6 महीने तक: न जॉइनिंग शुल्क, न कार्ड विवरण, न कमीशन, बशर्ते आपका पंजीकरण वैध हो (सत्यापन योग्य कंपनी और संपर्क)।","Sim, por 6 meses: sem taxa de adesão, sem dados de cartão e sem comissão, desde que o cadastro seja válido (empresa e contato verificáveis).","Sí, por 6 meses: sin cuota de alta, sin datos de tarjeta y sin comisión, siempre que su registro sea válido (empresa y contacto verificables)."],
  "What happens after 6 months?":["6 महीने बाद क्या होगा?","O que acontece depois de 6 meses?","¿Qué pasa después de 6 meses?"],
  "We tell you in advance and show you the plan and its price. If you don’t want to continue, nothing is charged and your profile can be removed. Since we never ask for a card, nothing is charged without your decision.":["हम पहले से बताते हैं और प्लान व उसकी कीमत दिखाते हैं। अगर आप जारी नहीं रखना चाहते, तो कुछ भी चार्ज नहीं होता और आपकी प्रोफ़ाइल हटाई जा सकती है। हम कभी कार्ड नहीं माँगते, इसलिए आपकी मंज़ूरी के बिना कुछ भी चार्ज नहीं होता।","Avisamos com antecedência e mostramos o plano e o valor. Se você não quiser continuar, nada é cobrado e o perfil pode ser removido. Como nunca pedimos cartão, nada é cobrado sem a sua decisão.","Le avisamos con antelación y le mostramos el plan y su precio. Si no quiere continuar, no se cobra nada y su perfil puede eliminarse. Como nunca pedimos tarjeta, nada se cobra sin su decisión."],
  "How many RFQs will I receive?":["मुझे कितने RFQ मिलेंगे?","Quantas RFQs vou receber?","¿Cuántas RFQ recibiré?"],
  "It depends on your product category and on demand from Brazilian buyers. We only send requests that match your products, so you spend time on real opportunities.":["यह आपके उत्पाद की श्रेणी और ब्राज़ीलियाई खरीदारों की माँग पर निर्भर है। हम केवल आपके उत्पादों से मेल खाते अनुरोध भेजते हैं, ताकि आपका समय असली अवसरों पर लगे।","Depende da categoria do seu produto e da demanda dos compradores brasileiros. Só enviamos pedidos compatíveis com seus produtos, para você gastar tempo com oportunidades reais.","Depende de la categoría de su producto y de la demanda de los compradores brasileños. Solo enviamos solicitudes que coinciden con sus productos, para que dedique tiempo a oportunidades reales."],
  "Does India Brazil buy my products?":["क्या India Brazil मेरे उत्पाद खरीदता है?","A India Brazil compra meus produtos?","¿India Brazil compra mis productos?"],
  "No. We are a sourcing concierge. You sell directly to the Brazilian buyer and agree price, payment terms and shipping with them.":["नहीं। हम सोर्सिंग कंसीयर्ज हैं। आप सीधे ब्राज़ीलियाई खरीदार को बेचते हैं और कीमत, भुगतान शर्तें और शिपिंग उनसे तय करते हैं।","Não. Somos um concierge de compras. Você vende direto ao comprador brasileiro e combina com ele preço, pagamento e frete.","No. Somos un concierge de abastecimiento. Usted vende directamente al comprador brasileño y acuerda con él precio, pago y envío."],
  "How are payments made?":["भुगतान कैसे होता है?","Como é feito o pagamento?","¿Cómo se hacen los pagos?"],
  "Directly between you and the buyer, on the terms you agree, such as advance TT or Letter of Credit. India Brazil never collects money on your behalf.":["सीधे आपके और खरीदार के बीच, तय शर्तों पर, जैसे एडवांस TT या लेटर ऑफ़ क्रेडिट। India Brazil कभी आपकी ओर से पैसे नहीं लेता।","Direto entre você e o comprador, nas condições que combinarem, como TT antecipado ou carta de crédito. A India Brazil nunca recebe dinheiro em seu nome.","Directamente entre usted y el comprador, en las condiciones que acuerden, como TT anticipado o carta de crédito. India Brazil nunca cobra dinero en su nombre."],
  "Do I need Brazilian certifications?":["क्या मुझे ब्राज़ीलियाई प्रमाणपत्र चाहिए?","Preciso de certificações brasileiras?","¿Necesito certificaciones brasileñas?"],
  "Not to register. Some categories, such as pharma, food, cosmetics and medical devices, need Brazilian approvals before sale. We will tell you what applies to your products.":["रजिस्टर करने के लिए नहीं। कुछ श्रेणियों, जैसे फ़ार्मा, खाद्य, कॉस्मेटिक्स और चिकित्सा उपकरणों, को बिक्री से पहले ब्राज़ीलियाई मंज़ूरी चाहिए। आपके उत्पादों पर क्या लागू होता है, हम बताएँगे।","Não para se cadastrar. Algumas categorias, como farmacêuticos, alimentos, cosméticos e dispositivos médicos, exigem aprovações brasileiras antes da venda. Avisamos o que se aplica aos seus produtos.","No para registrarse. Algunas categorías, como farmacéuticos, alimentos, cosméticos y dispositivos médicos, requieren aprobaciones brasileñas antes de la venta. Le diremos qué aplica a sus productos."],
  // Final e rodapé
  "The BRICS moment is now. Brazil already buys from India: make sure it finds you.":["BRICS का समय अभी है। ब्राज़ील पहले से भारत से खरीदता है: सुनिश्चित करें कि वह आपको ढूँढे।","O momento BRICS é agora. O Brasil já compra da Índia: garanta que ele encontre você.","El momento BRICS es ahora. Brasil ya compra a India: asegúrese de que lo encuentre a usted."],
  "Free for 6 months · No card · No joining fee":["6 महीने मुफ़्त · कोई कार्ड नहीं · कोई जॉइनिंग शुल्क नहीं","Grátis por 6 meses · Sem cartão · Sem taxa de adesão","Gratis por 6 meses · Sin tarjeta · Sin cuota de alta"],
  "Privacy policy":["गोपनीयता नीति","Política de privacidade","Política de privacidad"],
  "India Brazil is a private trade facilitation initiative and does not represent BRICS or any government.":["India Brazil एक निजी व्यापार सुविधा पहल है और BRICS या किसी सरकार का प्रतिनिधित्व नहीं करती।","A India Brazil é uma iniciativa privada de facilitação comercial e não representa o BRICS nem governos.","India Brazil es una iniciativa privada de facilitación comercial y no representa al BRICS ni a ningún gobierno."]
  };
  var LANGS=[["en","English","EN","en-IN"],["hi","हिन्दी","हिं","hi-IN"],["pt","Português (BR)","PT","pt-BR"],["es","Español","ES","es"]];
  var COL={hi:0,pt:1,es:2};
  var listeners=[], current="en";

  function norm(s){return s.replace(/\s+/g," ").trim();}
  function t(s){var r=current!=="en"&&D[norm(s)];return r?r[COL[current]]:s;}

  // Troca os textos: guarda o original em inglês em cada nó para poder voltar
  function apply(){
    var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      var p=n.parentNode&&n.parentNode.nodeName;
      return p==="SCRIPT"||p==="STYLE"||(n.parentNode.closest&&n.parentNode.closest(".lang-sw,[data-no-i18n]"))?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
    for(var n=w.nextNode();n;n=w.nextNode()){
      if(n.__en===undefined){if(!/[A-Za-z]/.test(n.nodeValue))continue;n.__en=n.nodeValue;}
      var m=n.__en.match(/^(\s*)([\s\S]*?)(\s*)$/),r=current!=="en"&&D[norm(m[2])];
      n.nodeValue=r?m[1]+r[COL[current]]+m[3]:n.__en;
    }
    document.querySelectorAll("[placeholder]").forEach(function(el){
      if(el.closest(".lang-sw"))return;
      if(el.__enPh===undefined)el.__enPh=el.getAttribute("placeholder");
      el.setAttribute("placeholder",t(el.__enPh));
    });
    if(document.__enTitle===undefined)document.__enTitle=document.title;
    document.title=t(document.__enTitle);
    document.documentElement.lang=LANGS.find(function(l){return l[0]===current;})[3];
  }

  function set(lang,save){
    if(!LANGS.some(function(l){return l[0]===lang;}))lang="en";
    current=lang;
    if(save)try{localStorage.setItem("ib-lang",lang);}catch(e){}
    apply();
    var cur=LANGS.find(function(l){return l[0]===lang;});
    var code=document.getElementById("langCode");if(code)code.textContent=cur[2];
    document.querySelectorAll(".lang-menu [data-lang]").forEach(function(b){b.setAttribute("aria-checked",b.dataset.lang===lang?"true":"false");});
    listeners.forEach(function(cb){cb(lang);});
  }

  // Idioma inicial: ?lang= na URL, depois o escolhido antes, depois o idioma do navegador; padrão inglês
  function initial(){
    var q=new URLSearchParams(location.search).get("lang");if(q)return q;
    try{var s=localStorage.getItem("ib-lang");if(s)return s;}catch(e){}
    var b=(navigator.language||"en").slice(0,2).toLowerCase();
    return COL[b]!==undefined?b:"en";
  }

  // Seletor pequeno no topo
  function mount(){
    var host=document.getElementById("langSw");if(!host)return;
    var btn=host.querySelector("button"),menu=host.querySelector(".lang-menu");
    LANGS.forEach(function(l){
      var b=document.createElement("button");b.type="button";b.setAttribute("role","menuitemradio");b.dataset.lang=l[0];b.lang=l[3];b.textContent=l[1];
      b.addEventListener("click",function(){set(l[0],true);close(true);});
      menu.appendChild(b);
    });
    function open(){menu.hidden=false;btn.setAttribute("aria-expanded","true");var on=menu.querySelector('[aria-checked="true"]')||menu.firstChild;on.focus();}
    function close(focus){menu.hidden=true;btn.setAttribute("aria-expanded","false");if(focus)btn.focus();}
    btn.addEventListener("click",function(){if(menu.hidden)open();else close();});
    menu.addEventListener("keydown",function(e){
      var items=Array.prototype.slice.call(menu.children),i=items.indexOf(document.activeElement);
      if(e.key==="ArrowDown"){e.preventDefault();items[(i+1)%items.length].focus();}
      else if(e.key==="ArrowUp"){e.preventDefault();items[(i-1+items.length)%items.length].focus();}
      else if(e.key==="Escape"){e.preventDefault();close(true);}
    });
    document.addEventListener("mousedown",function(e){if(!menu.hidden&&!host.contains(e.target))close();});
  }

  window.I18N={t:t,set:set,lang:function(){return current;},onChange:function(cb){listeners.push(cb);}};
  document.addEventListener("DOMContentLoaded",function(){mount();set(initial(),false);});
})();
