/*
  Conversa B2B de um pedido de orçamento (RFQ) – usada no /portal (fornecedor, inglês),
  /comprador (comprador, português) e /admin-orcamentos (time, português).
  - Mensagens em tempo real (Supabase Realtime).
  - Idioma: cada pessoa escolhe em que idioma escreve e lê (English, हिन्दी, Português, Español).
    A mensagem é salva no idioma de quem escreveu (coluna lang) e mostrada traduzida para quem lê em outro
    idioma, com "Ver original". Tradução pelo serviço gratuito MyMemory, com cache neste navegador.
  - Fotos e arquivos: botões de foto e de arquivo, colar imagem (Ctrl/Cmd+V) e arrastar para o chat.
    Fotos aparecem dentro da conversa. Arquivos ficam no bucket privado rfq-files.

  var chat = RfqChat.mount({sb, rfq, me: "supplier"|"buyer"|"team", lang: "en"|"pt",
                            pickRole: false, supplierLabel: "...", onError: fn, onNew: fn(msg)});
  container.appendChild(chat.el);  ...  chat.write("texto"); chat.stop();
  onNew é chamado para cada mensagem mostrada (histórico e novas), por exemplo para marcar como lida.
*/
(function(){
  var MAX = 15 * 1024 * 1024;
  var ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.txt,.csv";
  var IMG_RE = /\.(jpe?g|png|webp|gif)$/i;
  var LANGS = {en:"English", hi:"हिन्दी", pt:"Português", es:"Español"};
  var MM = {en:"en-GB", hi:"hi-IN", pt:"pt-BR", es:"es-ES"};            // códigos do MyMemory
  var ROLE_LANG = {supplier:"en", buyer:"pt", team:"pt"};                 // idioma das mensagens antigas, sem lang
  var T = {
    en: {you:"You", supplier:"Supplier", buyer:"Buyer", team:"India Brasil team", empty:"No messages yet. Say hello!",
         ph:"Write a message…", send:"Send", attach:"Attach file", photo:"Send photos", big:"File is larger than 15 MB.", file:"File",
         asBuyer:"As buyer", asTeam:"As India Brasil team", uploading:"Uploading…", lang:"I write and read in",
         auto:"Messages are translated automatically for the other side.", from:"Translated from", orig:"See original", tr:"See translation",
         translating:"Translating…", drop:"Drop files here", remove:"Remove", img:"Photo"},
    pt: {you:"Você", supplier:"Fornecedor", buyer:"Comprador", team:"Equipe India Brasil", empty:"Nenhuma mensagem ainda. Comece a conversa!",
         ph:"Escreva uma mensagem…", send:"Enviar", attach:"Anexar arquivo", photo:"Enviar fotos", big:"O arquivo passa de 15 MB.", file:"Arquivo",
         asBuyer:"Como comprador", asTeam:"Como equipe India Brasil", uploading:"Enviando…", lang:"Escrevo e leio em",
         auto:"As mensagens são traduzidas automaticamente para o outro lado.", from:"Traduzido do", orig:"Ver original", tr:"Ver tradução",
         translating:"Traduzindo…", drop:"Solte os arquivos aqui", remove:"Remover", img:"Foto"}
  };
  var LANG_NAME_PT = {en:"inglês", hi:"hindi", pt:"português", es:"espanhol"};
  var CSS = ".rc{display:flex;flex-direction:column;height:560px;position:relative}" +
    ".rc-top{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;padding:0 0 10px;border-bottom:1px solid var(--line);margin-bottom:8px;font-size:.85rem;color:var(--muted)}" +
    ".rc-top select{width:auto;padding:.3rem .5rem;font-size:.85rem;border-radius:8px}" +
    ".rc-top .rc-auto{flex-basis:100%;font-size:.78rem}" +
    ".rc-msgs{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:.6rem;padding:4px 2px 10px}" +
    ".rc-msg{max-width:82%;padding:.55rem .8rem;border-radius:12px;background:var(--chip);overflow-wrap:anywhere}" +
    ".rc-msg.mine{align-self:flex-end;background:var(--mine,#E7F4EE)}" +
    ".rc-msg.team{border:1px dashed var(--orange,#FF9100)}" +
    ".rc-body{white-space:pre-wrap}" +
    ".rc-who{display:block;font-size:.75rem;color:var(--muted);margin-bottom:.15rem}" +
    ".rc-tr{display:block;font-size:.74rem;color:var(--muted);margin-top:.3rem}" +
    ".rc-tr button{background:none;border:0;padding:0;font:inherit;color:var(--green,#0B7A55);cursor:pointer;text-decoration:underline;margin-left:.3rem}" +
    ".rc-file{display:inline-flex;align-items:center;gap:.4rem;margin-top:.35rem;padding:.35rem .6rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:.88rem;cursor:pointer;text-align:left}" +
    ".rc-file:hover{border-color:var(--green)}" +
    ".rc-img{display:block;margin-top:.35rem;border:0;padding:0;background:var(--img,#EEF1F5);border-radius:10px;overflow:hidden;cursor:zoom-in;max-width:260px;min-height:60px}" +
    ".rc-img img{display:block;max-width:260px;max-height:260px;width:auto;height:auto}" +
    ".rc-empty{color:var(--muted);text-align:center;margin:auto 0}" +
    ".rc-send{display:flex;gap:.5rem;align-items:flex-end;border-top:1px solid var(--line);padding-top:10px;flex-wrap:wrap}" +
    ".rc-send textarea{flex:1 1 200px;min-height:2.8rem;height:2.8rem;resize:vertical}" +
    ".rc-send select{width:auto}" +
    ".rc-clip{font:inherit;font-size:1.05rem;cursor:pointer;border:1.5px solid var(--line);background:transparent;color:var(--ink);border-radius:8px;padding:.5rem .65rem;line-height:1}" +
    ".rc-clip:hover{border-color:var(--orange,#FF9100)}" +
    ".rc-pending{flex-basis:100%;display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:.85rem;color:var(--muted)}" +
    ".rc-chip{display:inline-flex;align-items:center;gap:.4rem;border:1px solid var(--line);border-radius:8px;padding:.25rem .45rem;background:var(--surface)}" +
    ".rc-chip img{width:40px;height:40px;object-fit:cover;border-radius:6px}" +
    ".rc-chip button{background:none;border:0;color:var(--error,#B42318);cursor:pointer;font:inherit;font-size:1rem;line-height:1}" +
    ".rc-dropzone{position:absolute;inset:0;border:2px dashed var(--orange,#FF9100);border-radius:12px;background:rgba(255,145,0,.08);display:grid;place-items:center;font-weight:700;color:var(--ink);pointer-events:none;z-index:2}" +
    ".rc-light{position:fixed;inset:0;background:rgba(5,8,20,.88);display:grid;place-items:center;z-index:80;padding:20px;cursor:zoom-out}" +
    ".rc-light img{max-width:100%;max-height:100%;border-radius:8px;background:#fff}";

  function h(tag, attrs, kids){
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function(k){
      if (k === "class") e.className = attrs[k];
      else if (k.slice(0,2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    });
    [].concat(kids == null ? [] : kids).forEach(function(c){ if (c == null || c === false) return; e.appendChild(typeof c === "object" ? c : document.createTextNode(String(c))); });
    return e;
  }
  function size(b){ return b > 1048576 ? (b/1048576).toFixed(1) + " MB" : Math.ceil(b/1024) + " KB"; }
  function safe(n){ return n.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^\w.\-]+/g,"_").slice(-80); }
  function uid(){ return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); }
  function store(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch(e){ return null; } }

  // Tradução com cache neste navegador (o texto vai para o serviço gratuito MyMemory, limite de ~500 bytes por chamada)
  var pending = {}, enc = new TextEncoder();
  function chunks(text){
    var parts = text.split(/(?<=[.!?।\n])\s*/), out = [], cur = "";
    parts.forEach(function(p){
      while (enc.encode(p).length > 450) {           // frase muito longa: corta por tamanho
        var n = p.length; while (enc.encode(p.slice(0, n)).length > 450) n = Math.floor(n * 0.8);
        if (cur) { out.push(cur); cur = ""; } out.push(p.slice(0, n)); p = p.slice(n);
      }
      if (enc.encode(cur + " " + p).length > 450) { if (cur) out.push(cur); cur = p; } else cur = cur ? cur + " " + p : p;
    });
    if (cur) out.push(cur);
    return out;
  }
  function translate(text, from, to){
    var parts = chunks(text);
    if (parts.length > 1) return Promise.all(parts.map(function(p){ return translateOne(p, from, to); })).then(function(a){ return a.join(" "); });
    return translateOne(text, from, to);
  }
  function translateOne(text, from, to){
    var key = "ib-tr:" + from + ":" + to + ":" + text;
    var hit = store(key); if (hit) return Promise.resolve(hit);
    if (pending[key]) return pending[key];
    var url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=" + MM[from] + "|" + MM[to];
    pending[key] = fetch(url).then(function(r){ return r.json(); }).then(function(d){
      var t = d && d.responseStatus == 200 && d.responseData && d.responseData.translatedText;
      if (!t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) throw new Error("translation unavailable");
      var el = document.createElement("textarea"); el.innerHTML = t; t = el.value;   // desfaz &#39; etc.
      store(key, t); return t;
    }).finally(function(){ delete pending[key]; });
    return pending[key];
  }

  function mount(o){
    if (!document.getElementById("rc-css")) document.head.appendChild(h("style", {id:"rc-css"}, CSS));
    var t = T[o.lang] || T.en, sb = o.sb, rfq = o.rfq, seen = {}, msgs = [], files = [];
    var fail = o.onError || function(e){ console.error(e); };
    var when = function(v){ return new Date(v).toLocaleString(o.lang === "pt" ? "pt-BR" : "en-IN", {day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"}); };
    var LKEY = "ib-chat-lang-" + o.me;
    var myLang = store(LKEY) || ROLE_LANG[o.me] || "en";
    var langName = function(code){ return o.lang === "pt" ? LANG_NAME_PT[code] : LANGS[code]; };

    // Idioma de leitura e escrita
    var langSel = h("select", {"aria-label": t.lang}, Object.keys(LANGS).map(function(k){ return h("option", {value:k}, LANGS[k]); }));
    langSel.value = myLang;
    langSel.addEventListener("change", function(){ myLang = langSel.value; store(LKEY, myLang); redraw(); ta.placeholder = t.ph + " (" + LANGS[myLang] + ")"; });
    var top = h("div", {class:"rc-top"}, [h("span", null, "🌐 " + t.lang + ":"), langSel, h("span", {class:"rc-auto"}, t.auto)]);

    var list = h("div", {class:"rc-msgs", "aria-live":"polite"});
    var ta = h("textarea", {maxlength:"4000", placeholder:t.ph + " (" + LANGS[myLang] + ")", "aria-label":t.ph});
    var fileIn = h("input", {type:"file", accept:ACCEPT, multiple:true, hidden:true});
    var photoIn = h("input", {type:"file", accept:"image/*", multiple:true, hidden:true});
    var clip = h("button", {class:"rc-clip", type:"button", title:t.attach, "aria-label":t.attach, onclick:function(){ fileIn.click(); }}, "📎");
    var cam = h("button", {class:"rc-clip", type:"button", title:t.photo, "aria-label":t.photo, onclick:function(){ photoIn.click(); }}, "📷");
    var role = o.pickRole ? h("select", {"aria-label":"Role"}, [h("option", {value:"team"}, t.asTeam), h("option", {value:"buyer"}, t.asBuyer)]) : null;
    var btn = h("button", {class:"btn", type:"submit"}, t.send);
    var info = h("div", {class:"rc-pending", hidden:true});
    var form = h("form", {class:"rc-send"}, [role, cam, clip, ta, btn, fileIn, photoIn, info]);
    var el = h("div", {class:"rc"}, [top, list, form]);

    // Cada lado vê só o necessário: o comprador não vê o nome da empresa do fornecedor (o meio de campo é nosso)
    function who(m){
      var r = m.sender_role;
      if (o.me === "team") return t[r] + (m.sender_name ? " – " + m.sender_name : "");
      if (r === o.me) return t.you;
      if (r === "team") return t.team;
      if (r === "supplier") return o.supplierLabel || t.supplier;
      return m.sender_name || t.buyer;
    }
    function zoom(src){ var l = h("div", {class:"rc-light", role:"dialog", onclick:function(){ l.remove(); }}, h("img", {src:src, alt:""})); document.body.appendChild(l); }

    function bubble(m){
      var mine = m.sender_role === o.me;
      var body = m.body, isAttachText = m.attachment_path && body === "📎 " + m.attachment_name;
      var from = m.lang || ROLE_LANG[m.sender_role] || "en";
      var bodyEl = isAttachText ? null : h("div", {class:"rc-body"}, body);
      var trEl = null;
      // Traduz o que veio em outro idioma (as minhas próprias mensagens ficam como escrevi)
      if (bodyEl && !mine && from !== myLang && body.trim()) {
        trEl = h("span", {class:"rc-tr"}, t.translating);
        translate(body, from, myLang).then(function(tx){
          var showing = "tr";
          bodyEl.textContent = tx;
          var b = h("button", {type:"button", onclick:function(){
            showing = showing === "tr" ? "orig" : "tr";
            bodyEl.textContent = showing === "tr" ? tx : body;
            b.textContent = showing === "tr" ? t.orig : t.tr;
          }}, t.orig);
          trEl.textContent = t.from + " " + langName(from) + " ·";
          trEl.appendChild(b);
        }).catch(function(){ trEl.remove(); });
      }
      var att = null;
      if (m.attachment_path) {
        if (IMG_RE.test(m.attachment_name || m.attachment_path)) {
          var img = h("img", {alt:m.attachment_name || t.img, loading:"lazy"});
          att = h("button", {class:"rc-img", type:"button", title:m.attachment_name || t.img}, img);
          sb.storage.from("rfq-files").createSignedUrl(m.attachment_path, 3600).then(function(r){
            if (r.error) return; img.src = r.data.signedUrl; att.onclick = function(){ zoom(r.data.signedUrl); };
            img.onload = function(){ list.scrollTop = list.scrollHeight; };
          });
        } else {
          att = h("div", null, h("button", {class:"rc-file", type:"button", onclick:function(){ download(m); }},
            "📄 " + (m.attachment_name || t.file) + (m.attachment_size ? " (" + size(m.attachment_size) + ")" : "")));
        }
      }
      return h("div", {class:"rc-msg" + (mine ? " mine" : "") + (m.sender_role === "team" && o.me !== "team" ? " team" : "")},
        [h("span", {class:"rc-who"}, who(m) + " · " + when(m.created_at)), bodyEl, att, trEl]);
    }
    function add(m){
      if (seen[m.id]) return; seen[m.id] = 1; msgs.push(m);
      var e = list.querySelector(".rc-empty"); if (e) e.remove();
      list.appendChild(bubble(m));
      list.scrollTop = list.scrollHeight;
      if (o.onNew) o.onNew(m);
    }
    function redraw(){
      list.textContent = "";
      if (!msgs.length) list.appendChild(h("p", {class:"rc-empty"}, t.empty));
      msgs.forEach(function(m){ list.appendChild(bubble(m)); });
      list.scrollTop = list.scrollHeight;
    }
    async function download(m){
      var r = await sb.storage.from("rfq-files").createSignedUrl(m.attachment_path, 300, {download: m.attachment_name || true});
      if (r.error) return fail(r.error);
      window.open(r.data.signedUrl, "_blank", "noopener");
    }

    // Arquivos e fotos escolhidos, colados ou arrastados: ficam aguardando o "Enviar"
    function addFiles(list2){
      Array.prototype.forEach.call(list2, function(f){
        if (f.size > MAX) { info.hidden = false; info.appendChild(h("span", null, f.name + ": " + t.big)); return; }
        files.push(f);
      });
      drawPending();
    }
    function drawPending(){
      info.textContent = ""; info.hidden = !files.length;
      files.forEach(function(f, i){
        var thumb = /^image\//.test(f.type) ? h("img", {src:URL.createObjectURL(f), alt:""}) : h("span", null, "📄");
        info.appendChild(h("span", {class:"rc-chip"}, [thumb, h("span", null, f.name.length > 28 ? f.name.slice(0, 25) + "…" : f.name),
          h("button", {type:"button", "aria-label":t.remove + " " + f.name, onclick:function(){ files.splice(i, 1); drawPending(); }}, "×")]));
      });
    }
    fileIn.addEventListener("change", function(){ addFiles(fileIn.files); fileIn.value = ""; });
    photoIn.addEventListener("change", function(){ addFiles(photoIn.files); photoIn.value = ""; });
    ta.addEventListener("paste", function(e){
      var items = (e.clipboardData && e.clipboardData.files) || [];
      if (items.length) { e.preventDefault(); addFiles(items); }
    });
    var dz = null;
    el.addEventListener("dragover", function(e){ e.preventDefault(); if (!dz) { dz = h("div", {class:"rc-dropzone"}, t.drop); el.appendChild(dz); } });
    el.addEventListener("dragleave", function(e){ if (dz && !el.contains(e.relatedTarget)) { dz.remove(); dz = null; } });
    el.addEventListener("drop", function(e){ e.preventDefault(); if (dz) { dz.remove(); dz = null; } addFiles(e.dataTransfer.files); });

    form.addEventListener("submit", async function(ev){
      ev.preventDefault();
      var body = ta.value.trim();
      if (!body && !files.length) return;
      btn.disabled = true;
      var base = {rfq_id: rfq.id, sender_role: role ? role.value : o.me, lang: myLang};
      if (role && role.value === "buyer") base.sender_name = rfq.buyer_label;
      if (role && role.value === "team") base.sender_name = "India Brasil team";
      try {
        // Uma mensagem por arquivo; o texto vai junto com o primeiro (ou sozinho, sem arquivos)
        var queue = files.length ? files.slice() : [null];
        for (var i = 0; i < queue.length; i++) {
          var row = Object.assign({}, base, {body: i === 0 ? body : ""}), f = queue[i];
          if (f) {
            info.hidden = false; info.textContent = t.uploading + " " + (i + 1) + "/" + queue.length;
            var path = rfq.id + "/" + uid() + "-" + safe(f.name || "foto.png");
            var up = await sb.storage.from("rfq-files").upload(path, f, {contentType: f.type || undefined, upsert: false});
            if (up.error) throw up.error;
            row.attachment_path = path; row.attachment_name = f.name || "foto.png"; row.attachment_size = f.size;
            if (!row.body) row.body = "📎 " + row.attachment_name;
          }
          var r = await sb.from("rfq_messages").insert(row).select().single();
          if (r.error) throw r.error;
          add(r.data);
        }
        ta.value = ""; files = []; drawPending();
      } catch (e) { fail(e); drawPending(); }
      btn.disabled = false;
    });
    ta.addEventListener("keydown", function(e){ if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });

    sb.from("rfq_messages").select("*").eq("rfq_id", rfq.id).order("created_at").then(function(r){
      if (r.error) return fail(r.error);
      if (!r.data.length) list.appendChild(h("p", {class:"rc-empty"}, t.empty));
      r.data.forEach(add);
    });
    var chan = sb.channel("rfq-" + rfq.id + "-" + o.me)
      .on("postgres_changes", {event:"INSERT", schema:"public", table:"rfq_messages", filter:"rfq_id=eq." + rfq.id}, function(p){ add(p.new); })
      .subscribe();

    return {el: el, stop: function(){ sb.removeChannel(chan); },
      // Coloca um texto pronto na caixa de mensagem (ex.: "Pedir ajuste na cotação")
      write: function(text){ ta.value = text; ta.focus(); ta.setSelectionRange(text.length, text.length); }};
  }

  window.RfqChat = {mount: mount};
})();
