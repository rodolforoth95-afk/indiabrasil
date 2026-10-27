/*
  India Brasil – jornada do pedido até o pedido confirmado (comprador ↔ fornecedor, equipe acompanhando).
  Cotação aceita → proforma do fornecedor → comprador aprova (pedido confirmado). Depois disso, só o chat.
  Usado em /comprador (português), /portal (inglês) e /admin-orcamentos (equipe, português).
    OrderFlow.has(rfq)                 → true se o banco já tem a jornada (docs/order-journey.sql) e o pedido está nela
    OrderFlow.status(rfq, me)          → {k, t, c, turn} para listas e etiquetas (k: neg | order = confirmado | done)
    OrderFlow.bar(rfq, me, pre)        → etapas da barra [{label, state, sub}]; pre = {replied, quoted}
    OrderFlow.mount({sb, rfq, me, chat, onChange, onError}) → {el} cartão "próximo passo" + proforma + documentos
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
  var TURN = {"":"supplier", pi_sent:"buyer", pi_changes:"supplier"};
  // A jornada termina no pedido confirmado (completed); daí em diante pagamento, produção e embarque seguem só pelo chat
  var STAGES = ["","pi_sent","pi_changes","completed","cancelled"];

  var T = {
    pt: {
      bar: ["Pedido enviado","Cotação","Negociação","Pedido confirmado"],
      stage: {"":"Em negociação", pi_sent:"Proforma enviada", pi_changes:"Ajuste na proforma", completed:"Pedido confirmado", cancelled:"Cancelado"},
      pill: {"":"Em negociação", pi_sent:"Aprovar proforma", pi_changes:"Ajuste solicitado", completed:"Pedido confirmado", cancelled:"Cancelado"},
      yourTurn:"Sua vez", waiting:"Aguardando", supplier:"Fornecedor", buyer:"Comprador", turnOf:"Vez de",
      summary:"Proforma aprovada", docs:"Documentos e arquivos", noDocs:"Os arquivos enviados no pedido (proforma, fotos, documentos) aparecem aqui.",
      total:"Valor total", advance:"Sinal", balance:"Saldo", lead:"Prazo de produção", days:"dias", incoterm:"Incoterm", terms:"Condições de pagamento",
      confirmed:"Pedido confirmado em", issue:"Problema relatado: a equipe India Brasil está cuidando e fala com você pelo chat.",
      back:"Voltar", sending:"Enviando…", remind:"Lembrar o fornecedor", remindTxt:"Olá! Pode me atualizar sobre o próximo passo do pedido?",
      fileBig:"arquivo maior que 15 MB", needFile:"Anexe o arquivo.",
      teamTools:"Ferramentas da equipe", setStage:"Mudar etapa para", apply:"Aplicar", resolve:"Marcar problema como resolvido",
      onBehalf:"Os botões abaixo agem em nome"
    },
    en: {
      bar: ["Enquiry received","Quotation","Negotiation","Order confirmed"],
      stage: {"":"In negotiation", pi_sent:"Proforma sent", pi_changes:"Changes requested", completed:"Order confirmed", cancelled:"Cancelled"},
      pill: {"":"Send proforma", pi_sent:"Proforma sent", pi_changes:"Revise proforma", completed:"Order confirmed", cancelled:"Cancelled"},
      yourTurn:"Your turn", waiting:"Waiting", supplier:"Supplier", buyer:"Buyer", turnOf:"Turn of",
      summary:"Approved proforma", docs:"Documents & files", noDocs:"Files shared in this order (proforma, photos, documents) appear here.",
      total:"Order total", advance:"Advance", balance:"Balance", lead:"Production time", days:"days", incoterm:"Incoterm", terms:"Payment terms",
      confirmed:"Order confirmed on", issue:"Problem reported: the India Brazil team is handling it and will contact you in the chat.",
      back:"Back", sending:"Sending…", remind:"Remind the buyer", remindTxt:"Hello! Could you update me on the next step of this order?",
      fileBig:"file larger than 15 MB", needFile:"Please attach the file."
    }
  };

  // Textos de cada etapa, para quem está vendo: [ícone, título, explicação]
  var GUIDE = {
    buyer: {
      "": ["🤝","Em negociação","Combine os detalhes no chat (preço final, quantidade, embalagem, prazo). Quando estiver tudo certo, o fornecedor envia a proforma com o valor final para você aprovar aqui."],
      pi_sent: ["📄","Aprove a proforma","Confira valor total, sinal, prazo e Incoterm. Antes de aprovar, confirme com seu despachante o NCM, os impostos e se o produto precisa de licença de importação (LI). Aprovar confirma o pedido."],
      pi_changes: ["✏️","Ajuste solicitado","O fornecedor vai enviar uma proforma nova com o que você pediu."],
      completed: ["✅","Pedido confirmado","Você aprovou a proforma. Pagamento, produção e embarque agora são combinados pelo chat com o fornecedor; a equipe India Brasil acompanha e ajuda."],
      cancelled: ["✖️","Pedido cancelado","A conversa continua disponível para consulta."]
    },
    supplier: {
      "": ["🤝","Send the proforma invoice","The buyer accepted your quotation. Agree the final details in the chat, then send the proforma invoice with the final total, advance and production time. The buyer approves it here."],
      pi_sent: ["⏳","Waiting for the buyer to approve the proforma","You can send a revised proforma if anything changes."],
      pi_changes: ["✏️","The buyer asked for changes","Read the request in the chat and send a revised proforma invoice."],
      completed: ["✅","Order confirmed","The buyer approved your proforma invoice. Agree payment, production and shipment in the chat; the India Brazil team follows and supports you."],
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
    cancel: {by:"both", at:["","pi_sent","pi_changes"], kind:"of-danger", label:{pt:"Cancelar pedido", en:"Cancel order"}, fields:["note!"]},
    report_issue: {by:"both", at:["","pi_sent","pi_changes"], kind:"of-link",
      label:{pt:"Relatar um problema à equipe", en:"Report a problem to our team"}, fields:["note!"]}
  };

  // Campos dos formulários: [rótulo pt, rótulo en, tipo, extra]
  var F = {
    total:["Valor total do pedido","Order total","number"], currency:["Moeda","Currency","select",CUR],
    advance_pct:["Sinal (% do total)","Advance (% of total)","number",{min:0,max:100,value:30,hint:{en:"0 = full payment at shipment. 100 = full payment in advance.",pt:"0 = tudo no embarque. 100 = tudo antecipado."}}],
    lead_days:["Prazo de produção (dias)","Production time (days)","number",{min:0,max:730}], incoterm:["Incoterm","Incoterm","select",INCO],
    payment_terms:["Condições de pagamento","Payment terms","text",{ph:{en:"e.g. 30% T/T advance, 70% against copy of BL",pt:"ex.: 30% T/T antecipado, 70% contra cópia do BL"}}],
    note:["Observação (opcional)","Note (optional)","textarea"]
  };
  var FILE = {pi:["Proforma invoice (PDF)","Proforma invoice (PDF)"]};
  var NOTE_REQ = {request_changes:["O que precisa mudar?","What needs to change?"], cancel:["Motivo do cancelamento","Reason for cancelling"],
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
  // Etapas antigas depois da proforma aprovada (sinal, produção…) contam como pedido confirmado
  function stageOf(r){ var s = r.order_stage || ""; return STAGES.indexOf(s) > -1 ? s : "completed"; }
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

  // O pedido está na jornada? (precisa do SQL rodado: a coluna order_stage existe)
  function has(r){
    if (!r || !("order_stage" in r)) return false;
    return !!r.order_stage || r.status === "negotiating";
  }
  function pi(r){ return (r.order_data || {}).pi || null; }

  function status(r, me){
    if (!has(r)) return null;
    var s = stageOf(r), L = T[langOf(me)], turn = TURN[s];
    var mine = me !== "team" && turn === me;
    var k = s === "cancelled" ? "done" : s === "completed" ? "order" : "neg";
    var c = s === "completed" ? "good" : s === "cancelled" ? "" : r.order_issue ? "bad" : mine ? "warn" : "info";
    var t = me === "team" ? T.pt.stage[s] : L.pill[s];
    if (r.order_issue && s !== "completed" && s !== "cancelled") t = (me === "supplier" ? "Problem · " : "Problema · ") + t;
    return {k:k, t:t, c:c, turn:mine, stage:s};
  }

  // Barra de etapas: do pedido enviado até o pedido confirmado
  function bar(r, me, pre){
    var L = T[langOf(me)], s = stageOf(r);
    var keys = ["sent","quote","neg","confirmed"];
    var now;
    if (has(r)) now = s === "completed" ? null : s === "cancelled" ? "x" : "neg";
    else if (r.status === "won") now = null;
    else if (["lost","closed"].indexOf(r.status) > -1) now = "x";
    else now = pre && pre.quoted ? "neg" : "quote";
    var idx = now == null ? keys.length : now === "x" ? -1 : keys.indexOf(now);
    var reached = {sent:true, quote:!!(pre && (pre.quoted || pre.replied))};
    return keys.map(function(k, i){
      var state = idx === -1 ? (reached[k] ? "done" : "") : i < idx ? "done" : i === idx ? "now" : "";
      return {label:L.bar[i], state:state, sub:state === "now" && has(r) ? L.stage[s] : null};
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
        } else {
          input = h("input", {type:type, step:type === "number" ? "any" : null, inputmode:type === "number" ? "decimal" : null,
            min:ex.min, max:ex.max, placeholder:ex.ph ? ex.ph[lang] : null,
            required:name === "total" || ex.req || null});
          if (ex.value != null) input.value = p && p[name] != null ? p[name] : ex.value;
          else if (p && p[name] != null && a === "send_pi") input.value = p[name];
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
        ["currency","incoterm","payment_terms"].forEach(function(k){ if (v[k]) data[k] = v[k]; });
        ["total","advance_pct","lead_days"].forEach(function(k){ if (v[k] !== undefined && v[k] !== "") data[k] = +v[k]; });
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
      var cur = d.currency || (p && p.currency) || r.currency || "USD";
      var M = function(v){ return money(v, cur, l); };
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
        approve_pi: "✅ Aprovei a proforma. Pedido confirmado! Vamos seguir pelo chat com pagamento, produção e embarque.",
        request_changes: "✏️ Pedi ajuste na proforma: " + note,
        cancel: "✖️ Pedido cancelado. Motivo: " + note,
        report_issue: "⚠️ Problema relatado à equipe India Brasil: " + note,
        resolve_issue: "✔️ Problema resolvido." + n,
        set_stage: "ℹ️ Etapa do pedido atualizada para: " + (T.pt.stage[d.stage || ""] || d.stage) + "." + n
      };
      var en = {
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
    // Pedido confirmado: a proforma aprovada fica de referência para a conversa
    if (s === "completed" && p) {
      el.appendChild(h("div", {class:"card", style:"margin-top:14px"}, [h("h2", null, L.summary), piBox(p),
        od.confirmed_at ? h("p", {class:"muted", style:"margin:.6rem 0 0;font-size:.88rem"}, L.confirmed + " " + day(od.confirmed_at, lang)) : null]));
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
