/*
  Conversa B2B de um pedido de orçamento (RFQ) – usada no /portal (fornecedor, inglês),
  /comprador (comprador, português) e /admin-orcamentos (time, português).
  Mensagens em tempo real (Supabase Realtime) e anexos no bucket privado rfq-files.

  var chat = RfqChat.mount({sb, rfq, me: "supplier"|"buyer"|"team", lang: "en"|"pt",
                            pickRole: false, onError: fn});
  container.appendChild(chat.el);  ...  chat.stop();
*/
(function(){
  var MAX = 15 * 1024 * 1024;
  var ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.txt,.csv";
  var T = {
    en: {you:"You", supplier:"Supplier", buyer:"Buyer", team:"India Brasil team", empty:"No messages yet. Say hello!",
         ph:"Write a message…", send:"Send", attach:"Attach file", big:"File is larger than 15 MB.", file:"File",
         asBuyer:"As buyer", asTeam:"As India Brasil team", uploading:"Uploading…"},
    pt: {you:"Você", supplier:"Fornecedor", buyer:"Comprador", team:"Equipe India Brasil", empty:"Nenhuma mensagem ainda. Comece a conversa!",
         ph:"Escreva uma mensagem…", send:"Enviar", attach:"Anexar arquivo", big:"O arquivo passa de 15 MB.", file:"Arquivo",
         asBuyer:"Como comprador", asTeam:"Como equipe India Brasil", uploading:"Enviando…"}
  };
  var CSS = ".rc{display:flex;flex-direction:column;height:520px}" +
    ".rc-msgs{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:.6rem;padding:4px 2px 10px}" +
    ".rc-msg{max-width:82%;padding:.55rem .8rem;border-radius:12px;background:var(--chip);overflow-wrap:anywhere;white-space:pre-wrap}" +
    ".rc-msg.mine{align-self:flex-end;background:var(--mine,#E7F4EE)}" +
    ".rc-msg.team{border:1px dashed var(--orange,#FF9100)}" +
    ".rc-who{display:block;font-size:.75rem;color:var(--muted);margin-bottom:.15rem;white-space:normal}" +
    ".rc-file{display:inline-flex;align-items:center;gap:.4rem;margin-top:.35rem;padding:.35rem .6rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:.88rem;cursor:pointer;text-align:left}" +
    ".rc-file:hover{border-color:var(--green)}" +
    ".rc-empty{color:var(--muted);text-align:center;margin:auto 0}" +
    ".rc-send{display:flex;gap:.5rem;align-items:flex-end;border-top:1px solid var(--line);padding-top:10px;flex-wrap:wrap}" +
    ".rc-send textarea{flex:1 1 200px;min-height:2.8rem;height:2.8rem;resize:vertical}" +
    ".rc-send select{width:auto}" +
    ".rc-clip{font:inherit;cursor:pointer;border:1.5px solid var(--line);background:transparent;color:var(--ink);border-radius:8px;padding:.55rem .7rem}" +
    ".rc-pending{flex-basis:100%;font-size:.85rem;color:var(--muted)}" +
    ".rc-pending button{margin-left:.4rem;background:none;border:0;color:var(--error);cursor:pointer;font:inherit}";

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

  function mount(o){
    if (!document.getElementById("rc-css")) document.head.appendChild(h("style", {id:"rc-css"}, CSS));
    var t = T[o.lang] || T.en, sb = o.sb, rfq = o.rfq, seen = {}, pending = null;
    var fail = o.onError || function(e){ console.error(e); };
    var when = function(v){ return new Date(v).toLocaleString(o.lang === "pt" ? "pt-BR" : "en-IN", {day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"}); };

    var list = h("div", {class:"rc-msgs", "aria-live":"polite"});
    var ta = h("textarea", {maxlength:"4000", placeholder:t.ph, "aria-label":t.ph});
    var file = h("input", {type:"file", accept:ACCEPT, hidden:true});
    var clip = h("button", {class:"rc-clip", type:"button", title:t.attach, "aria-label":t.attach, onclick:function(){ file.click(); }}, "📎");
    var role = o.pickRole ? h("select", {"aria-label":"Role"}, [h("option", {value:"team"}, t.asTeam), h("option", {value:"buyer"}, t.asBuyer)]) : null;
    var btn = h("button", {class:"btn", type:"submit"}, t.send);
    var info = h("div", {class:"rc-pending", hidden:true});
    var form = h("form", {class:"rc-send"}, [role, clip, ta, btn, file, info]);
    var el = h("div", {class:"rc"}, [list, form]);

    // Cada lado vê só o necessário: o comprador não vê o nome da empresa do fornecedor (o meio de campo é nosso)
    function who(m){
      var r = m.sender_role;
      if (o.me === "team") return t[r] + (m.sender_name ? " – " + m.sender_name : "");
      if (r === o.me) return t.you;
      if (r === "team") return t.team;
      if (r === "supplier") return o.supplierLabel || t.supplier;
      return m.sender_name || t.buyer;
    }
    function add(m){
      if (seen[m.id]) return; seen[m.id] = 1;
      var e = list.querySelector(".rc-empty"); if (e) e.remove();
      var mine = m.sender_role === o.me;
      var body = m.body;
      if (m.attachment_path && body === "📎 " + m.attachment_name) body = null;
      list.appendChild(h("div", {class:"rc-msg" + (mine ? " mine" : "") + (m.sender_role === "team" && o.me !== "team" ? " team" : "")}, [
        h("span", {class:"rc-who"}, who(m) + " · " + when(m.created_at)),
        body,
        m.attachment_path ? h("div", null, h("button", {class:"rc-file", type:"button", onclick:function(){ download(m); }},
          "📄 " + (m.attachment_name || t.file) + (m.attachment_size ? " (" + size(m.attachment_size) + ")" : ""))) : null
      ]));
      list.scrollTop = list.scrollHeight;
    }
    async function download(m){
      var r = await sb.storage.from("rfq-files").createSignedUrl(m.attachment_path, 300, {download: m.attachment_name || true});
      if (r.error) return fail(r.error);
      window.open(r.data.signedUrl, "_blank", "noopener");
    }

    file.addEventListener("change", function(){
      var f = file.files[0]; file.value = "";
      if (!f) return;
      if (f.size > MAX) { info.hidden = false; info.textContent = t.big; pending = null; return; }
      pending = f; info.hidden = false; info.textContent = "📎 " + f.name + " (" + size(f.size) + ")";
      info.appendChild(h("button", {type:"button", "aria-label":"Remove", onclick:function(){ pending = null; info.hidden = true; }}, "✕"));
    });

    form.addEventListener("submit", async function(ev){
      ev.preventDefault();
      var body = ta.value.trim();
      if (!body && !pending) return;
      btn.disabled = true;
      var row = {rfq_id: rfq.id, sender_role: role ? role.value : o.me, body: body};
      if (role && role.value === "buyer") row.sender_name = rfq.buyer_label;
      if (role && role.value === "team") row.sender_name = "India Brasil team";
      if (pending) {
        info.textContent = t.uploading;
        var path = rfq.id + "/" + uid() + "-" + safe(pending.name);
        var up = await sb.storage.from("rfq-files").upload(path, pending, {contentType: pending.type || undefined, upsert: false});
        if (up.error) { btn.disabled = false; info.textContent = up.error.message; return fail(up.error); }
        row.attachment_path = path; row.attachment_name = pending.name; row.attachment_size = pending.size;
        if (!body) row.body = "📎 " + pending.name;
      }
      var r = await sb.from("rfq_messages").insert(row).select().single();
      btn.disabled = false;
      if (r.error) return fail(r.error);
      ta.value = ""; pending = null; info.hidden = true; add(r.data);
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

    return {el: el, stop: function(){ sb.removeChannel(chan); }};
  }

  window.RfqChat = {mount: mount};
})();
