/*
  India Brasil – jornada do pedido depois da negociação (comprador ↔ fornecedor, equipe acompanhando).
  Usado em /comprador (português), /portal (inglês) e /admin-orcamentos (equipe, português).
    OrderFlow.has(rfq)                 → true se o banco já tem a jornada (docs/order-journey.sql) e o pedido está nela
    OrderFlow.status(rfq, me)          → {k, t, c, turn} para listas e etiquetas (k: neg | order | done)
    OrderFlow.bar(rfq, me, pre)        → etapas da barra [{label, state, sub}]; pre = {replied, quoted}
    OrderFlow.mount({sb, rfq, me, chat, onChange, onError}) → {el} cartão "próximo passo" + resumo + documentos
  me: "buyer" | "supplier" | "team". Cada passo chama a função order_action() do banco,
  que confere a vez de cada um e grava um aviso no chat (com o anexo).
  Os arquivos vão para o bucket privado rfq-files, como os anexos do chat.
*/
(function(){
  "use strict";

  var ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.txt,.csv";
  var MAX = 15 * 1024 * 1024;
  var CUR = ["USD","INR","EUR","BRL"], INCO = ["FOB","CIF","CFR","EXW","FCA","DAP","DDP"];
  // De quem é a vez em cada etapa (vazio = negociando: o fornecedor manda a proforma)
  var TURN = {"":"supplier", pi_sent:"buyer", pi_changes:"supplier", awaiting_advance:"buyer", advance_sent:"supplier",
    in_production:"supplier", ready:"buyer", ready_to_ship:"supplier", awaiting_balance:"buyer", balance_sent:"supplier", in_transit:"buyer"};
  var STAGES = ["","pi_sent","pi_changes","awaiting_advance","advance_sent","in_production","ready","ready_to_ship",
    "awaiting_balance","balance_sent","in_transit","completed","cancelled"];

  var T = {
    pt: {
      bar: ["Pedido enviado","Cotação","Negociação","Pedido confirmado","Sinal","Produção","Embarque","Saldo","Recebido"],
      stage: {"":"Em negociação", pi_sent:"Proforma enviada", pi_changes:"Ajuste na proforma", awaiting_advance:"Aguardando sinal",
        advance_sent:"Sinal informado", in_production:"Em produção", ready:"Mercadoria pronta", ready_to_ship:"Aprovada para embarque",
        awaiting_balance:"Aguardando saldo", balance_sent:"Saldo informado", in_transit:"A caminho", completed:"Concluído", cancelled:"Cancelado"},
      pill: {"":"Em negociação", pi_sent:"Aprovar proforma", pi_changes:"Ajuste solicitado", awaiting_advance:"Pagar sinal",
        advance_sent:"Sinal informado", in_production:"Em produção", ready:"Aprovar mercadoria", ready_to_ship:"Aguardando embarque",
        awaiting_balance:"Pagar saldo", balance_sent:"Saldo informado", in_transit:"A caminho", completed:"Concluído", cancelled:"Cancelado"},
      yourTurn:"Sua vez", waiting:"Aguardando", supplier:"Fornecedor", buyer:"Comprador", turnOf:"Vez de",
      next:"Próximo passo", summary:"Resumo do pedido", docs:"Documentos e arquivos", noDocs:"Os documentos enviados (proforma, comprovantes, fotos, BL) aparecem aqui.",
      total:"Valor total", advance:"Sinal", balance:"Saldo", lead:"Prazo de produção", days:"dias", incoterm:"Incoterm", terms:"Condições de pagamento",
      confirmed:"Pedido confirmado em", readyBy:"Previsão de produção pronta", carrier:"Transportadora / navio", tracking:"BL / AWB", etd:"Embarque (ETD)", eta:"Chegada prevista (ETA)",
      rating:"Avaliação", issue:"Problema relatado: a equipe India Brasil está cuidando e fala com você pelo chat.",
      report:"Relatar um problema", cancel:"Cancelar pedido", send:"Confirmar", back:"Voltar", sending:"Enviando…",
      remind:"Lembrar o fornecedor", remindTxt:"Olá! Pode me atualizar sobre o próximo passo do pedido?",
      remindS:"Lembrar o comprador", remindSTxt:"Olá! Pode me atualizar sobre o próximo passo do pedido?",
      fileBig:"arquivo maior que 15 MB", needFile:"Anexe o arquivo.", more:"Ver todos no chat",
      teamTools:"Ferramentas da equipe", setStage:"Mudar etapa para", apply:"Aplicar", resolve:"Marcar problema como resolvido",
      onBehalf:"Os botões abaixo agem em nome", cancelled:"Pedido cancelado.", done:"Pedido concluído. Obrigado!"
    },
    en: {
      bar: ["Enquiry received","Quotation","Negotiation","Order confirmed","Advance","Production","Shipment","Balance","Delivered"],
      stage: {"":"In negotiation", pi_sent:"Proforma sent", pi_changes:"Changes requested", awaiting_advance:"Awaiting advance",
        advance_sent:"Advance reported", in_production:"In production", ready:"Goods ready", ready_to_ship:"Approved for shipment",
        awaiting_balance:"Awaiting balance", balance_sent:"Balance reported", in_transit:"In transit", completed:"Completed", cancelled:"Cancelled"},
      pill: {"":"Send proforma", pi_sent:"Proforma sent", pi_changes:"Revise proforma", awaiting_advance:"Awaiting advance",
        advance_sent:"Confirm advance", in_production:"In production", ready:"Awaiting approval", ready_to_ship:"Ship the goods",
        awaiting_balance:"Awaiting balance", balance_sent:"Confirm balance", in_transit:"In transit", completed:"Completed", cancelled:"Cancelled"},
      yourTurn:"Your turn", waiting:"Waiting", supplier:"Supplier", buyer:"Buyer", turnOf:"Turn of",
      next:"Next step", summary:"Order summary", docs:"Documents & files", noDocs:"Documents shared in this order (proforma, payment proofs, photos, BL) appear here.",
      total:"Order total", advance:"Advance", balance:"Balance", lead:"Production time", days:"days", incoterm:"Incoterm", terms:"Payment terms",
      confirmed:"Order confirmed on", readyBy:"Goods expected ready by", carrier:"Carrier / vessel", tracking:"BL / AWB", etd:"Shipped (ETD)", eta:"Expected arrival (ETA)",
      rating:"Buyer rating", issue:"Problem reported: the India Brazil team is handling it and will contact you in the chat.",
      report:"Report a problem", cancel:"Cancel order", send:"Confirm", back:"Back", sending:"Sending…",
      remind:"Remind the buyer", remindTxt:"Hello! Could you update me on the next step of this order?",
      fileBig:"file larger than 15 MB", needFile:"Please attach the file.", more:"See all in the chat",
      cancelled:"Order cancelled.", done:"Order completed. Thank you!"
    }
  };

  // Textos de cada etapa, para quem está vendo: [ícone, título, explicação]
  var GUIDE = {
    buyer: {
      "": ["🤝","Em negociação","Combine os detalhes no chat (preço final, quantidade, embalagem, prazo). Quando estiver tudo certo, o fornecedor envia a proforma com o valor final para você aprovar aqui."],
      pi_sent: ["📄","Aprove a proforma","Confira valor total, sinal, prazo e Incoterm. Antes de aprovar, confirme com seu despachante o NCM, os impostos e se o produto precisa de licença de importação (LI). Aprovar confirma o pedido."],
      pi_changes: ["✏️","Ajuste solicitado","O fornecedor vai enviar uma proforma nova com o que você pediu."],
      awaiting_advance: ["💸","Pague o sinal","Faça o câmbio para os dados bancários da proforma e informe aqui, com o comprovante (contrato de câmbio ou SWIFT). A produção começa quando o fornecedor confirmar."],
      advance_sent: ["⏳","Aguardando o fornecedor confirmar o sinal","Transferências internacionais levam de 1 a 3 dias úteis."],
      in_production: ["🏭","Em produção","O fornecedor envia fotos da mercadoria pronta e embalada para você aprovar antes do embarque."],
      ready: ["📦","Aprove a mercadoria","Veja as fotos ou o relatório de inspeção. Aprove para o fornecedor embarcar, ou peça uma correção. Se quiser uma inspeção independente, fale com a nossa equipe."],
      ready_to_ship: ["🚢","Aguardando o embarque","O fornecedor vai embarcar e enviar BL/AWB, fatura comercial, packing list e certificado de origem."],
      awaiting_balance: ["💸","Pague o saldo","A mercadoria foi embarcada. Pague o saldo e informe aqui com o comprovante: o fornecedor então libera os documentos originais (ou telex release) para o desembaraço."],
      balance_sent: ["⏳","Aguardando o fornecedor confirmar o saldo","Assim que confirmar, ele libera os documentos para o desembaraço."],
      in_transit: ["🛳️","A caminho","Acompanhe com seu despachante. Quando a mercadoria chegar e for conferida, confirme o recebimento e avalie o fornecedor."],
      completed: ["🎉","Pedido concluído","Obrigado! Para comprar de novo, peça uma nova cotação a este fornecedor."],
      cancelled: ["✖️","Pedido cancelado","A conversa continua disponível para consulta."]
    },
    supplier: {
      "": ["🤝","Send the proforma invoice","The buyer accepted your quotation. Agree the final details in the chat, then send the proforma invoice with the final total, advance and production time. The buyer approves it here."],
      pi_sent: ["⏳","Waiting for the buyer to approve the proforma","You can send a revised proforma if anything changes."],
      pi_changes: ["✏️","The buyer asked for changes","Read the request in the chat and send a revised proforma invoice."],
      awaiting_advance: ["🎉","Order confirmed! Waiting for the advance","The buyer will pay the advance and upload the payment proof here. Do not start production before you confirm the payment."],
      advance_sent: ["💰","Confirm the advance payment","The buyer reported the payment. Check your bank account and confirm once the money is credited: production starts."],
      in_production: ["🏭","In production","When the goods are ready, upload photos (or an inspection report) of the finished goods and packing so the buyer can approve the shipment."],
      ready: ["⏳","Waiting for the buyer to approve the goods","The buyer is reviewing your photos. Ship only after approval."],
      ready_to_ship: ["🚢","Ship the goods","Book the shipment and report it here with the BL/AWB number, dates and documents (commercial invoice, packing list, certificate of origin)."],
      awaiting_balance: ["⏳","Waiting for the balance payment","Keep the original documents until the balance is confirmed."],
      balance_sent: ["💰","Confirm the balance payment","Check your bank account. Once credited, confirm and release the original documents (or telex release)."],
      in_transit: ["🛳️","In transit","The buyer confirms receipt and rates the order when the goods arrive."],
      completed: ["🎉","Order completed","Thank you! Good service brings repeat orders."],
      cancelled: ["✖️","Order cancelled","The conversation stays available for reference."]
    }
  };

  // Ações: quem faz, em quais etapas, formulário e a mensagem que vai para o chat (no idioma de quem faz)
  var ACT = {
    send_pi: {by:"supplier", at:["","pi_sent","pi_changes"], kind:"btn",
      label:{en:"Send proforma invoice", pt:"Enviar proforma"}, relabel:{at:["pi_sent"], en:"Send a revised proforma", pt:"Enviar proforma revisada"},
      fields:["total","currency","advance_pct","lead_days","incoterm","payment_terms","file!:pi","note"]},
    approve_pi: {by:"buyer", at:["pi_sent"], kind:"btn btn-green", label:{pt:"Aprovar proforma e confirmar pedido"}, fields:[],
      confirm:{pt:"Aprovar a proforma? Isso confirma o pedido com o fornecedor."}},
    request_changes: {by:"buyer", at:["pi_sent"], kind:"btn btn-ghost", label:{pt:"Pedir ajuste"}, fields:["note!"]},
    advance_paid: {by:"buyer", at:["awaiting_advance"], kind:"btn btn-green", label:{pt:"Informar pagamento do sinal"}, fields:["amount","paid_on","file:proof","note"]},
    confirm_advance: {by:"supplier", at:["advance_sent"], kind:"btn btn-green", label:{en:"Payment received – start production", pt:"Sinal recebido"}, fields:["ready_by","note"]},
    payment_not_received: {by:"supplier", at:["advance_sent","balance_sent"], kind:"btn btn-ghost", label:{en:"Not received yet", pt:"Pagamento não chegou"}, fields:["note!"]},
    goods_ready: {by:"supplier", at:["in_production"], kind:"btn", label:{en:"Goods ready – send photos", pt:"Mercadoria pronta"}, fields:["file!:photos","note"]},
    approve_goods: {by:"buyer", at:["ready"], kind:"btn btn-green", label:{pt:"Aprovar para embarque"}, fields:[],
      confirm:{pt:"Aprovar a mercadoria para embarque?"}},
    request_fix: {by:"buyer", at:["ready"], kind:"btn btn-ghost", label:{pt:"Pedir correção"}, fields:["note!"]},
    shipped: {by:"supplier", at:["ready_to_ship"], kind:"btn", label:{en:"Report shipment", pt:"Informar embarque"}, fields:["carrier","tracking","etd","eta","file:docs","note"]},
    balance_paid: {by:"buyer", at:["awaiting_balance"], kind:"btn btn-green", label:{pt:"Informar pagamento do saldo"}, fields:["amount","paid_on","file:proof","note"]},
    confirm_balance: {by:"supplier", at:["balance_sent"], kind:"btn btn-green", label:{en:"Balance received – release documents", pt:"Saldo recebido"}, fields:["note"]},
    received: {by:"buyer", at:["in_transit"], kind:"btn btn-green", label:{pt:"Confirmar recebimento"}, fields:["rating","comment"]},
    cancel: {by:"both", at:["","pi_sent","pi_changes","awaiting_advance"], kind:"of-danger", label:{pt:"Cancelar pedido", en:"Cancel order"}, fields:["note!"]},
    report_issue: {by:"both", at:STAGES.filter(function(s){ return s !== "completed" && s !== "cancelled"; }), kind:"of-link",
      label:{pt:"Relatar um problema à equipe", en:"Report a problem to our team"}, fields:["note!"]}
  };

  // Campos dos formulários: [rótulo pt, rótulo en, tipo, extra]
  var F = {
    total:["Valor total do pedido","Order total","number"], currency:["Moeda","Currency","select",CUR],
    advance_pct:["Sinal (% do total)","Advance (% of total)","number",{min:0,max:100,value:30,hint:{en:"0 = full payment at shipment. 100 = full payment in advance.",pt:"0 = tudo no embarque. 100 = tudo antecipado."}}],
    lead_days:["Prazo de produção (dias)","Production time (days)","number",{min:0,max:730}], incoterm:["Incoterm","Incoterm","select",INCO],
    payment_terms:["Condições de pagamento","Payment terms","text",{ph:{en:"e.g. 30% T/T advance, 70% against copy of BL",pt:"ex.: 30% T/T antecipado, 70% contra cópia do BL"}}],
    amount:["Valor pago","Amount paid","number"], paid_on:["Data do pagamento","Payment date","date"],
    ready_by:["Previsão da mercadoria pronta","Goods expected ready by","date"],
    carrier:["Transportadora / navio","Carrier / vessel","text"], tracking:["Número do BL / AWB","BL / AWB number","text",{req:true}],
    etd:["Data do embarque (ETD)","Shipment date (ETD)","date"], eta:["Chegada prevista (ETA)","Expected arrival (ETA)","date"],
    rating:["Avaliação do fornecedor","Rate the supplier","rating"], comment:["Comentário (opcional)","Comment (optional)","textarea"],
    note:["Observação (opcional)","Note (optional)","textarea"]
  };
  var FILE = {pi:["Proforma invoice (PDF)","Proforma invoice (PDF)"], proof:["Comprovante (câmbio / SWIFT)","Payment proof"],
    photos:["Fotos ou relatório de inspeção","Photos or inspection report"], docs:["Documentos do embarque (BL, fatura, packing list…)","Shipping documents (BL, invoice, packing list…)"]};
  var NOTE_REQ = {request_changes:["O que precisa mudar?","What needs to change?"], payment_not_received:["Explique para o comprador","Explain to the buyer"],
    request_fix:["O que precisa ser corrigido?","What needs to be fixed?"], cancel:["Motivo do cancelamento","Reason for cancelling"],
    report_issue:["Descreva o problema","Describe the problem"]};

  var CSS = [
    ".of-card h3{display:flex;gap:.5rem;align-items:flex-start;margin:.2rem 0 .4rem}",
    ".of-turn{display:inline-block;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:.15rem .5rem;border-radius:99px;background:var(--chip,#EEF1F6);color:var(--muted,#5A6178)}",
    ".of-turn.me{background:rgba(255,145,0,.18);color:#B45F00}",
    ".of-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:.9rem}",
    ".of-acts .btn{white-space:normal;text-align:left}",
    ".of-minor{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:.8rem;font-size:.85rem}",
    ".of-link,.of-danger{background:none;border:0;padding:0;font:inherit;cursor:pointer;text-decoration:underline;color:var(--muted,#5A6178)}",
    ".of-danger{color:var(--error,#B42318)}",
    ".of-form{margin-top:.9rem;border-top:1px solid var(--line,#DCE0E8);padding-top:.9rem}",
    ".of-form .of-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(160px,100%),1fr));gap:0 12px}",
    ".of-form .of-grid>*{min-width:0}.of-form .of-full{grid-column:1/-1}",
    ".of-form label{display:block;font-weight:600;font-size:.88rem;margin-bottom:.3rem}",
    ".of-form input,.of-form select,.of-form textarea{width:100%;box-sizing:border-box}",
    ".of-form textarea{min-height:76px}",
    ".of-stars{display:flex;gap:4px}.of-stars button{font-size:1.6rem;line-height:1;background:none;border:0;cursor:pointer;color:var(--line,#DCE0E8);padding:0 2px}",
    ".of-stars button.on{color:#FF9100}",
    ".of-issue{background:rgba(180,35,24,.08);border:1px solid rgba(180,35,24,.25);color:var(--error,#B42318);border-radius:10px;padding:.6rem .8rem;font-size:.9rem;margin-bottom:.8rem}",
    ".of-docs{list-style:none;margin:0;padding:0;display:grid;gap:6px}",
    ".of-docs button{background:none;border:0;padding:0;font:inherit;color:var(--info,#2F6FED);cursor:pointer;text-align:left;overflow-wrap:anywhere}",
    ".of-docs small{display:block;color:var(--muted,#5A6178);font-size:.78rem}",
    ".of-team{margin-top:1rem;border-top:1px dashed var(--line,#DCE0E8);padding-top:.8rem;display:grid;gap:.6rem;font-size:.9rem}",
    ".of-team .row2{display:flex;gap:8px;flex-wrap:wrap;align-items:center}",
    ".of-sub{display:block;font-weight:400;color:var(--muted,#5A6178);font-size:.72rem;margin-top:2px}",
    ".of-bar{overflow-x:auto!important}"
  ].join("\n");

  function h(tag, attrs, kids){
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function(k){
      if (k === "class") e.className = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    });
    [].concat(kids == null ? [] : kids).flat(Infinity).forEach(function(c){
      if (c == null || c === false) return;
      e.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
    });
    return e;
  }
  function langOf(me){ return me === "supplier" ? "en" : "pt"; }
  function stageOf(r){ return r.order_stage || ""; }
  function money(v, cur, lang){
    if (v == null || v === "" || isNaN(v)) return null;
    try { return new Intl.NumberFormat(lang === "pt" ? "pt-BR" : "en-IN", {style:"currency", currency:cur || "USD", maximumFractionDigits:2}).format(v); }
    catch (e) { return v + " " + (cur || ""); }
  }
  function day(v, lang){
    if (!v) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) v += "T00:00:00";
    return new Date(v).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-IN", {day:"numeric", month:"short", year:"numeric"});
  }
  function uid(){ return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); }
  function safe(n){ return n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-80); }
  function stars(n){ n = +n || 0; return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }

  // O pedido está na jornada? (precisa do SQL rodado: a coluna order_stage existe)
  function has(r){
    if (!r || !("order_stage" in r)) return false;
    return !!r.order_stage || r.status === "negotiating";
  }
  function pi(r){ return (r.order_data || {}).pi || null; }

  function status(r, me){
    if (!has(r)) return null;
    var s = stageOf(r), L = T[langOf(me)], turn = TURN[s];
    // Produção e transporte levam semanas: não ficam como "precisa da sua atenção" nas listas
    var mine = me !== "team" && turn === me && s !== "in_production" && s !== "in_transit";
    var k = s === "completed" || s === "cancelled" ? "done" : (s === "" || s === "pi_sent" || s === "pi_changes") ? "neg" : "order";
    var c = s === "completed" ? "good" : s === "cancelled" ? "" : r.order_issue ? "bad" : mine ? "warn" : "info";
    var t = me === "team" ? T.pt.stage[s] : L.pill[s];
    if (r.order_issue && s !== "completed" && s !== "cancelled") t = (me === "supplier" ? "Problem · " : "Problema · ") + t;
    return {k:k, t:t, c:c, turn:mine, stage:s};
  }

  // Barra de etapas: do pedido enviado até o recebimento (pula sinal/saldo quando a proforma não tem)
  function bar(r, me, pre){
    var L = T[langOf(me)], p = pi(r), adv = p ? +p.advance_pct : null, s = stageOf(r);
    var keys = ["sent","quote","neg","confirmed","advance","production","shipment","balance","delivered"];
    var items = keys.map(function(k, i){ return {key:k, label:L.bar[i]}; }).filter(function(x){
      if (x.key === "advance" && adv === 0) return false;
      if (x.key === "balance" && adv === 100) return false;
      return true;
    });
    var at = {"":"neg", pi_sent:"neg", pi_changes:"neg", awaiting_advance:"advance", advance_sent:"advance",
      in_production:"production", ready:"production", ready_to_ship:"shipment", awaiting_balance:"balance", balance_sent:"balance", in_transit:"delivered"};
    var now;
    if (has(r)) now = s === "completed" ? null : s === "cancelled" ? "x" : at[s];
    else if (r.status === "won") now = null;
    else if (["lost","closed"].indexOf(r.status) > -1) now = "x";
    else now = pre && pre.quoted ? "neg" : "quote";
    // Sem sinal, "pedido confirmado" já leva direto à produção
    if (now === "advance" && adv === 0) now = "production";
    var idx = now == null ? items.length : now === "x" ? -1 : items.findIndex(function(x){ return x.key === now; });
    var reached = {sent:true, quote:!!(pre && (pre.quoted || pre.replied))};
    return items.map(function(x, i){
      var state = idx === -1 ? (i === 0 || reached[x.key] ? "done" : "") : i < idx ? "done" : i === idx ? "now" : "";
      if (idx === -1 && x.key === "quote" && !reached.quote) state = "";
      var sub = state === "now" && has(r) ? L.stage[s] : null;
      return {label:x.label, state:state, sub:sub};
    });
  }

  function mount(o){
    if (!document.getElementById("of-css")) document.head.appendChild(h("style", {id:"of-css"}, CSS));
    var sb = o.sb, r = o.rfq, me = o.me, lang = langOf(me), L = T[lang];
    var fail = o.onError || function(e){ console.error(e); };
    var s = stageOf(r), p = pi(r), od = r.order_data || {}, turn = TURN[s];
    var el = h("div", {class:"of"});

    // ---------- cartão "próximo passo" ----------
    // A equipe vê a etapa em português e age em nome de quem está na vez
    var g = me === "team"
      ? [GUIDE.buyer[s][0], T.pt.stage[s], turn ? T.pt.onBehalf + (turn === "supplier" ? " do fornecedor" : " do comprador") + " (quando ele pedir por WhatsApp ou e-mail, por exemplo)." : ""]
      : GUIDE[me][s] || ["ℹ️", L.stage[s] || "", ""];
    var card = h("div", {class:"card next of-card"});
    var tag = s === "completed" || s === "cancelled" ? null
      : me === "team" ? h("span", {class:"of-turn me"}, T.pt.turnOf + ": " + T.pt[turn])
      : h("span", {class:"of-turn" + (turn === me ? " me" : "")}, turn === me ? L.yourTurn : L.waiting + ": " + L[turn]);
    card.appendChild(h("div", null, tag));
    if (r.order_issue && s !== "completed" && s !== "cancelled") card.appendChild(h("div", {class:"of-issue", role:"status"}, "⚠️ " + L.issue));
    card.appendChild(h("h3", null, [h("span", null, g[0]), g[1]]));
    card.appendChild(h("p", {style:"margin:0"}, g[2]));
    var piInCard = s === "pi_sent" && p && me !== "supplier";  // quem aprova vê a proforma no próprio cartão
    if (piInCard) card.appendChild(piBox(p));

    var area = h("div");
    card.appendChild(area);
    el.appendChild(card);

    // Botões disponíveis para quem está vendo
    function can(a){
      var x = ACT[a];
      if (x.at.indexOf(s) < 0) return false;
      if (me === "team") return x.by === "both" ? false : x.by === turn;
      return x.by === me || x.by === "both";
    }
    function label(a){
      var x = ACT[a], l = x.relabel && x.relabel.at.indexOf(s) > -1 ? x.relabel : x.label;
      return l[lang] || l.pt || l.en;
    }
    function drawActs(){
      area.textContent = "";
      var main = Object.keys(ACT).filter(function(a){ return can(a) && ACT[a].kind.indexOf("btn") === 0; })
        .sort(function(a, b){ return (ACT[a].kind.indexOf("ghost") > -1) - (ACT[b].kind.indexOf("ghost") > -1); });
      var minor = Object.keys(ACT).filter(function(a){ return can(a) && ACT[a].kind.indexOf("btn") !== 0; });
      if (main.length) area.appendChild(h("div", {class:"of-acts"}, main.map(function(a){
        return h("button", {class:ACT[a].kind + " btn-sm", type:"button", onclick:function(){ open(a); }}, label(a));
      })));
      // Na vez do outro lado: lembrete pronto no chat
      var other = me !== "team" && turn && turn !== me && o.chat;
      var links = minor.map(function(a){ return h("button", {class:ACT[a].kind, type:"button", onclick:function(){ open(a); }}, label(a)); });
      if (other) links.unshift(h("button", {class:"of-link", type:"button", onclick:function(){
        o.chat.write(me === "buyer" ? T.pt.remindTxt : T.en.remindTxt);
        var ta = document.querySelector(".rc textarea"); if (ta) ta.scrollIntoView({behavior:"smooth", block:"center"});
      }}, me === "buyer" ? T.pt.remind : T.en.remind));
      if (links.length) area.appendChild(h("div", {class:"of-minor"}, links));
      if (me === "team") area.appendChild(teamTools());
    }

    // ---------- formulários ----------
    function open(a){
      var x = ACT[a];
      if (!x.fields.length) {
        var c = x.confirm && (x.confirm[lang] || x.confirm.pt);
        if (c && !confirm(c)) return;
        return run(a, {}, []);
      }
      area.textContent = "";
      var vals = {}, files = [], err = h("p", {class:"err", role:"alert"});
      var grid = h("div", {class:"of-grid"});
      x.fields.forEach(function(f){
        var req = /!/.test(f), name = f.replace("!", "");
        if (name.indexOf("file:") === 0) {
          var kind = name.slice(5), fi = h("input", {type:"file", accept:ACCEPT, multiple:true});
          fi.addEventListener("change", function(){ files = Array.prototype.slice.call(fi.files); });
          grid.appendChild(h("div", {class:"field of-full"}, [h("label", null, FILE[kind][lang === "pt" ? 0 : 1] + (req ? " *" : "")), fi,
            h("p", {class:"hint"}, lang === "pt" ? "PDF, fotos ou planilhas, até 15 MB cada. Vários arquivos de uma vez." : "PDF, photos or spreadsheets, up to 15 MB each. You can pick several files.")]));
          vals["__file"] = req;
          return;
        }
        if (name === "note" && NOTE_REQ[a]) {
          var ta0 = h("textarea", {maxlength:"2000", required:req}); vals.note = ta0;
          grid.appendChild(h("div", {class:"field of-full"}, [h("label", null, NOTE_REQ[a][lang === "pt" ? 0 : 1] + (req ? " *" : "")), ta0]));
          return;
        }
        var d = F[name], lab = d[lang === "pt" ? 0 : 1], type = d[2], ex = d[3] || {}, input;
        if (type === "select") {
          input = h("select", null, ex.map(function(v){ return h("option", {value:v}, v); }));
          if (name === "currency") input.value = (p && p.currency) || r.currency || "USD";
          if (name === "incoterm") input.value = (p && p.incoterm) || r.incoterm || "FOB";
        } else if (type === "textarea") {
          input = h("textarea", {maxlength:"2000"});
        } else if (type === "rating") {
          var val = 0, wrap = h("div", {class:"of-stars", role:"radiogroup", "aria-label":lab});
          for (var i = 1; i <= 5; i++) (function(n){
            wrap.appendChild(h("button", {type:"button", role:"radio", "aria-label":n + " / 5", onclick:function(){
              val = n; Array.prototype.forEach.call(wrap.children, function(b, j){ b.className = j < n ? "on" : ""; b.setAttribute("aria-checked", j === n - 1); });
            }}, "★"));
          })(i);
          vals[name] = {get value(){ return val ? String(val) : ""; }};
          grid.appendChild(h("div", {class:"field of-full"}, [h("label", null, lab), wrap]));
          return;
        } else {
          input = h("input", {type:type, step:type === "number" ? "any" : null, inputmode:type === "number" ? "decimal" : null,
            min:ex.min, max:ex.max, placeholder:ex.ph ? ex.ph[lang] : null,
            required:name === "total" || ex.req || null});
          if (ex.value != null) input.value = p && p[name] != null ? p[name] : ex.value;
          else if (p && p[name] != null && a === "send_pi") input.value = p[name];
          if (name === "amount" && p) {
            var part = a === "advance_paid" ? +p.advance_pct : 100 - (+p.advance_pct);
            input.value = Math.round(p.total * part) / 100;
          }
          if (name === "paid_on" || name === "etd") input.value = new Date().toISOString().slice(0, 10);
        }
        vals[name] = input;
        grid.appendChild(h("div", {class:"field" + (type === "textarea" ? " of-full" : "")}, [h("label", null, lab + (input.required ? " *" : "")), input,
          ex.hint ? h("p", {class:"hint"}, ex.hint[lang]) : null]));
      });
      var go = h("button", {class:"btn btn-sm " + (x.kind === "of-danger" ? "btn-ghost" : "btn-green"), type:"submit"}, label(a));
      var form = h("form", {class:"of-form"}, [h("h3", {style:"margin:0 0 .6rem"}, label(a)), grid,
        h("div", {class:"of-acts", style:"margin-top:0"}, [go, h("button", {class:"btn btn-ghost btn-sm", type:"button", onclick:drawActs}, L.back)]), err]);
      form.addEventListener("submit", async function(ev){
        ev.preventDefault(); err.textContent = "";
        if (vals.__file && !files.length) { err.textContent = L.needFile; return; }
        var big = files.filter(function(f){ return f.size > MAX; });
        if (big.length) { err.textContent = big[0].name + ": " + L.fileBig; return; }
        if (vals.rating && a === "received" && !vals.rating.value) { err.textContent = lang === "pt" ? "Escolha de 1 a 5 estrelas." : "Choose 1 to 5 stars."; return; }
        var v = {};
        Object.keys(vals).forEach(function(k){ if (k !== "__file") v[k] = (vals[k].value || "").trim(); });
        go.disabled = true; go.textContent = L.sending;
        var ok = await run(a, v, files);
        if (!ok) { go.disabled = false; go.textContent = label(a); }
      });
      area.appendChild(form);
      var first = form.querySelector("input,select,textarea"); if (first) first.focus();
    }

    // ---------- executa um passo ----------
    async function run(a, v, files){
      try {
        var uploaded = [];
        for (var i = 0; i < files.length; i++) {
          var f = files[i], path = r.id + "/" + uid() + "-" + safe(f.name || "file");
          var up = await sb.storage.from("rfq-files").upload(path, f, {contentType:f.type || undefined, upsert:false});
          if (up.error) throw up.error;
          uploaded.push({path:path, name:f.name, size:f.size});
        }
        var data = {};
        ["currency","incoterm","payment_terms","carrier","tracking","etd","eta","paid_on","ready_by","comment"].forEach(function(k){ if (v[k]) data[k] = v[k]; });
        ["total","advance_pct","lead_days","amount","rating"].forEach(function(k){ if (v[k] !== undefined && v[k] !== "") data[k] = +v[k]; });
        if (a === "set_stage") data.stage = v.stage;
        var actor = me, al = actor === "supplier" ? "en" : "pt";
        var att = uploaded[0] || {};
        var res = await sb.rpc("order_action", {p_rfq:r.id, p_action:a, p_message:message(a, data, v.note, al, actor, uploaded.length), p_note:v.note || null, p_data:data,
          p_attachment_path:att.path || null, p_attachment_name:att.name || null, p_attachment_size:att.size || null});
        if (res.error) throw res.error;
        // Arquivos extras vão como mensagens do chat (cada mensagem leva um arquivo)
        for (var j = 1; j < uploaded.length; j++) {
          var row = {rfq_id:r.id, sender_role:me === "team" ? "team" : me, body:"📎 " + uploaded[j].name, lang:al,
            attachment_path:uploaded[j].path, attachment_name:uploaded[j].name, attachment_size:uploaded[j].size};
          if (me === "team") row.sender_name = "India Brasil team";
          var m = await sb.from("rfq_messages").insert(row);
          if (m.error) throw m.error;
        }
        if (o.onChange) o.onChange(a, res.data);
        return true;
      } catch (e) { fail(e); return false; }
    }

    // Texto que aparece no chat (o outro lado lê traduzido)
    function message(a, d, note, l, actor, nfiles){
      var attPt = nfiles ? " Comprovante em anexo." : "", docPt = nfiles ? " Documentos em anexo." : "", docEn = nfiles ? " Documents attached." : "";
      var cur = d.currency || (p && p.currency) || r.currency || "USD";
      var M = function(v){ return money(v, cur, l); }, D = function(v){ return day(v, l); };
      var n = note ? (l === "pt" ? "\nObservação: " : "\nNote: ") + note : "";
      var pre = actor === "team" ? "Equipe India Brasil: " : "";
      if (a === "send_pi") {
        var adv = +d.advance_pct, t = +d.total;
        return l === "pt"
          ? pre + "📄 Proforma: total " + M(t) + " · sinal " + adv + "% (" + M(t * adv / 100) + ") · saldo " + (100 - adv) + "% (" + M(t * (100 - adv) / 100) + ")" +
            (d.lead_days != null ? " · produção em " + d.lead_days + " dias" : "") + (d.incoterm ? " · " + d.incoterm : "") + (d.payment_terms ? "\nPagamento: " + d.payment_terms : "") +
            "\nConfira e aprove na página do pedido." + n
          : "📄 Proforma invoice: total " + M(t) + " · advance " + adv + "% (" + M(t * adv / 100) + ") · balance " + (100 - adv) + "% (" + M(t * (100 - adv) / 100) + ")" +
            (d.lead_days != null ? " · production " + d.lead_days + " days" : "") + (d.incoterm ? " · " + d.incoterm : "") + (d.payment_terms ? "\nPayment terms: " + d.payment_terms : "") +
            "\nPlease review and approve it on the order page." + n;
      }
      var pt = {
        approve_pi: "✅ Aprovei a proforma. Pedido confirmado!",
        request_changes: "✏️ Pedi ajuste na proforma: " + note,
        advance_paid: "💸 Paguei o sinal" + (d.amount ? " de " + M(d.amount) : "") + (d.paid_on ? " em " + D(d.paid_on) : "") + "." + attPt + n,
        confirm_advance: "✅ Sinal recebido. Produção iniciada" + (d.ready_by ? " (previsão: " + D(d.ready_by) + ")" : "") + "." + n,
        payment_not_received: "⚠️ O pagamento ainda não chegou: " + note,
        goods_ready: "📦 Mercadoria pronta. Fotos em anexo para aprovação do embarque." + n,
        approve_goods: "✅ Aprovei a mercadoria. Pode embarcar.",
        request_fix: "🔧 Antes do embarque, preciso de correção: " + note,
        shipped: "🚢 Mercadoria embarcada" + (d.carrier ? " (" + d.carrier + ")" : "") + " · BL/AWB " + (d.tracking || "–") + (d.etd ? " · embarque " + D(d.etd) : "") + (d.eta ? " · chegada prevista " + D(d.eta) : "") + "." + docPt + n,
        balance_paid: "💸 Paguei o saldo" + (d.amount ? " de " + M(d.amount) : "") + (d.paid_on ? " em " + D(d.paid_on) : "") + "." + attPt + n,
        confirm_balance: "✅ Saldo recebido. Documentos originais liberados." + n,
        received: "🎉 Recebi a mercadoria. Avaliação: " + stars(d.rating) + (d.comment ? "\n" + d.comment : ""),
        cancel: "✖️ Pedido cancelado. Motivo: " + note,
        report_issue: "⚠️ Problema relatado à equipe India Brasil: " + note,
        resolve_issue: "✔️ Problema resolvido." + n,
        set_stage: "ℹ️ Etapa do pedido atualizada para: " + (T.pt.stage[d.stage || ""] || d.stage) + "." + n
      };
      var en = {
        confirm_advance: "✅ Advance payment received. Production has started" + (d.ready_by ? " – goods expected ready by " + D(d.ready_by) : "") + "." + n,
        payment_not_received: "⚠️ We have not received the payment yet: " + note,
        goods_ready: "📦 The goods are ready. Photos attached – please review and approve the shipment." + n,
        shipped: "🚢 Goods shipped" + (d.carrier ? " (" + d.carrier + ")" : "") + " · BL/AWB " + (d.tracking || "–") + (d.etd ? " · ETD " + D(d.etd) : "") + (d.eta ? " · ETA " + D(d.eta) : "") + "." + docEn + n,
        confirm_balance: "✅ Balance payment received. Original documents released." + n,
        cancel: "✖️ Order cancelled. Reason: " + note,
        report_issue: "⚠️ Problem reported to the India Brazil team: " + note
      };
      return l === "pt" ? pre + (pt[a] || a) : (en[a] || pt[a] || a);
    }

    // ---------- equipe: mudar etapa e resolver problema ----------
    function teamTools(){
      var sel = h("select", {"aria-label":T.pt.setStage}, STAGES.map(function(x){ return h("option", {value:x}, T.pt.stage[x]); }));
      sel.value = s;
      var box = h("div", {class:"of-team"}, [h("b", null, T.pt.teamTools),
        h("div", {class:"row2"}, [h("span", null, T.pt.setStage), sel, h("button", {class:"btn btn-ghost btn-sm", type:"button", onclick:function(){
          if (sel.value === s) return;
          if (confirm("Mudar a etapa para “" + T.pt.stage[sel.value] + "”? Os dois lados verão a mudança no chat.")) run("set_stage", {stage:sel.value}, []);
        }}, T.pt.apply)]),
        r.order_issue ? h("div", null, h("button", {class:"btn btn-sm", type:"button", onclick:function(){ run("resolve_issue", {}, []); }}, T.pt.resolve)) : null
      ]);
      return box;
    }

    function piBox(pp){
      var cur = pp.currency || "USD", a = +pp.advance_pct;
      return h("dl", {class:"kv", style:"margin-top:.8rem"}, [
        h("dt", null, L.total), h("dd", null, h("b", null, money(pp.total, cur, lang))),
        h("dt", null, L.advance), h("dd", null, a + "% · " + money(pp.total * a / 100, cur, lang)),
        h("dt", null, L.balance), h("dd", null, (100 - a) + "% · " + money(pp.total * (100 - a) / 100, cur, lang)),
        pp.lead_days != null ? [h("dt", null, L.lead), h("dd", null, pp.lead_days + " " + L.days)] : null,
        pp.incoterm ? [h("dt", null, L.incoterm), h("dd", null, pp.incoterm)] : null,
        pp.payment_terms ? [h("dt", null, L.terms), h("dd", null, pp.payment_terms)] : null
      ]);
    }

    // ---------- resumo e documentos ----------
    if ((p && !piInCard) || od.confirmed_at || od.shipping || od.review) {
      var sh = od.shipping || {}, rv = od.review || null;
      var rows = [];
      if (p && !piInCard) rows.push(piBox(p));
      var more = [
        od.confirmed_at ? [L.confirmed, day(od.confirmed_at, lang)] : null,
        od.ready_by ? [L.readyBy, day(od.ready_by, lang)] : null,
        sh.carrier ? [L.carrier, sh.carrier] : null, sh.tracking ? [L.tracking, sh.tracking] : null,
        sh.etd ? [L.etd, day(sh.etd, lang)] : null, sh.eta ? [L.eta, day(sh.eta, lang)] : null,
        rv ? [L.rating, stars(rv.rating) + (rv.comment ? " – " + rv.comment : "")] : null
      ].filter(Boolean);
      if (more.length) rows.push(h("dl", {class:"kv", style:"margin-top:.6rem"}, more.map(function(x){ return [h("dt", null, x[0]), h("dd", null, x[1])]; })));
      el.appendChild(h("div", {class:"card", style:"margin-top:14px"}, [h("h2", null, L.summary), rows]));
    }
    var docs = h("ul", {class:"of-docs"});
    var docCard = h("div", {class:"card", style:"margin-top:14px"}, [h("h2", null, L.docs), docs]);
    sb.from("rfq_messages").select("id,created_at,sender_role,attachment_path,attachment_name").eq("rfq_id", r.id).not("attachment_path", "is", null)
      .order("created_at", {ascending:false}).limit(12).then(function(x){
        if (x.error || !x.data.length) { docs.replaceWith(h("p", {class:"muted", style:"margin:0;font-size:.9rem"}, L.noDocs)); return; }
        x.data.forEach(function(m){
          docs.appendChild(h("li", null, [h("button", {type:"button", onclick:async function(){
            var u = await sb.storage.from("rfq-files").createSignedUrl(m.attachment_path, 300, {download:m.attachment_name || true});
            if (u.error) return fail(u.error);
            window.open(u.data.signedUrl, "_blank", "noopener");
          }}, "📄 " + (m.attachment_name || "file")), h("small", null, (m.sender_role === "team" ? "India Brasil" : L[m.sender_role]) + " · " + day(m.created_at, lang))]));
        });
      });
    el.appendChild(docCard);

    drawActs();
    return {el:el};
  }

  window.OrderFlow = {has:has, status:status, bar:bar, mount:mount, TURN:TURN};
})();
