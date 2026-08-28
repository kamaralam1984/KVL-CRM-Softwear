/*!
 * KVL CRM — Live Chat Widget (Phase 23 — Public Live-Chat Widget)
 *
 *   <script src="https://YOUR-KVL-DOMAIN/kvl-chat.js" data-site-id="KVL-SITE-XXXXXXXX" async></script>
 *
 * Dependency-free vanilla JS — no build step, same convention as
 * public/kvl-embed.js (self-contained, auto-inits from its own <script>
 * tag's data-site-id and src origin). Renders a floating chat bubble; a
 * visitor's messages land in the same conversations/messages tables
 * lib/actions/conversations.ts uses (channel="webchat"), visible to agents
 * via components/crm/sections/KVlHelpdesk.tsx's Live Chat tab.
 *
 * No websocket/Realtime infra exists in this codebase, so new agent replies
 * arrive via polling while the panel is open — same honest tradeoff already
 * documented for the Acquisition dashboard's Live Activity tab.
 */
(function () {
  "use strict";
  if (typeof window === "undefined" || window.kvlChat) return;

  var VISITOR_KEY = "kvl_visitor_id"; // shared with kvl-embed.js if both are loaded
  var CONV_KEY = "kvl_chat_conversation_id";
  var POLL_INTERVAL_MS = 4000;

  var thisScript = document.currentScript;
  var siteId = (thisScript && thisScript.getAttribute("data-site-id")) || "";
  var apiBase = "";
  try {
    apiBase = thisScript ? new URL(thisScript.src).origin : "";
  } catch {
    apiBase = "";
  }
  function api(path) {
    return apiBase + path;
  }

  function shortHex() {
    var bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    var out = "";
    for (var j = 0; j < bytes.length; j++) out += ("0" + bytes[j].toString(16)).slice(-2);
    return out.toUpperCase();
  }

  function getOrCreateVisitorId() {
    try {
      var existing = localStorage.getItem(VISITOR_KEY);
      if (existing) return existing;
      var id = "KV-V-" + shortHex();
      localStorage.setItem(VISITOR_KEY, id);
      return id;
    } catch {
      return "KV-V-" + shortHex();
    }
  }

  var visitorId = getOrCreateVisitorId();
  var conversationId = "";
  try { conversationId = localStorage.getItem(CONV_KEY) || ""; } catch { conversationId = ""; }
  var lastPolledAt = new Date(0).toISOString();
  var pollTimer = null;
  var panelOpen = false;

  // ── Minimal DOM/CSS, no external assets ──────────────────────────────
  var style = document.createElement("style");
  style.textContent =
    "#kvl-chat-bubble{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;" +
    "background:#0B6E4F;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;" +
    "box-shadow:0 4px 16px rgba(0,0,0,.25);z-index:999999;font:16px system-ui,sans-serif}" +
    "#kvl-chat-panel{position:fixed;bottom:86px;right:20px;width:320px;max-width:calc(100vw - 40px);height:420px;" +
    "background:#fff;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.3);display:none;flex-direction:column;" +
    "overflow:hidden;z-index:999999;font:13px system-ui,sans-serif;color:#111}" +
    "#kvl-chat-panel.open{display:flex}" +
    "#kvl-chat-head{background:#0B6E4F;color:#fff;padding:12px 14px;font-weight:600}" +
    "#kvl-chat-msgs{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;background:#F6F7F2}" +
    ".kvl-chat-msg{max-width:80%;padding:7px 10px;border-radius:10px;line-height:1.4;word-wrap:break-word}" +
    ".kvl-chat-msg.in{align-self:flex-start;background:#fff;border:1px solid #E2E5DE}" +
    ".kvl-chat-msg.out{align-self:flex-end;background:#0B6E4F;color:#fff}" +
    "#kvl-chat-form{display:flex;border-top:1px solid #E2E5DE;padding:8px;gap:6px}" +
    "#kvl-chat-input{flex:1;border:1px solid #E2E5DE;border-radius:8px;padding:7px 9px;font:13px system-ui,sans-serif;outline:none}" +
    "#kvl-chat-send{background:#0B6E4F;color:#fff;border:none;border-radius:8px;padding:0 12px;cursor:pointer;font-weight:600}";
  document.head.appendChild(style);

  var bubble = document.createElement("div");
  bubble.id = "kvl-chat-bubble";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.textContent = "💬";

  var panel = document.createElement("div");
  panel.id = "kvl-chat-panel";
  panel.innerHTML =
    '<div id="kvl-chat-head">Chat with us</div>' +
    '<div id="kvl-chat-msgs"></div>' +
    '<form id="kvl-chat-form">' +
    '<input id="kvl-chat-input" type="text" placeholder="Type a message…" autocomplete="off" />' +
    '<button id="kvl-chat-send" type="submit">Send</button>' +
    "</form>";

  document.addEventListener("DOMContentLoaded", mount);
  if (document.readyState !== "loading") mount();

  function mount() {
    document.body.appendChild(bubble);
    document.body.appendChild(panel);
    bubble.addEventListener("click", togglePanel);
    panel.querySelector("#kvl-chat-form").addEventListener("submit", onSubmit);
  }

  function togglePanel() {
    panelOpen = !panelOpen;
    panel.classList.toggle("open", panelOpen);
    if (panelOpen) {
      startPolling();
      var input = panel.querySelector("#kvl-chat-input");
      if (input) input.focus();
    } else {
      stopPolling();
    }
  }

  function addMessage(direction, text) {
    var msgs = panel.querySelector("#kvl-chat-msgs");
    var el = document.createElement("div");
    el.className = "kvl-chat-msg " + (direction === "outbound" ? "out" : "in");
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function onSubmit(e) {
    e.preventDefault();
    var input = panel.querySelector("#kvl-chat-input");
    var text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    addMessage("outbound", text);

    fetch(api("/api/webchat/message"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: siteId, visitor_id: visitorId, body: text }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok && data.conversation_id) {
          conversationId = data.conversation_id;
          try { localStorage.setItem(CONV_KEY, conversationId); } catch {}
        }
      })
      .catch(function () {});
  }

  function startPolling() {
    if (pollTimer || !conversationId) return;
    pollTimer = setInterval(poll, POLL_INTERVAL_MS);
  }
  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function poll() {
    if (!conversationId) return;
    var url = api("/api/webchat/poll") +
      "?site_id=" + encodeURIComponent(siteId) +
      "&visitor_id=" + encodeURIComponent(visitorId) +
      "&conversation_id=" + encodeURIComponent(conversationId) +
      "&since=" + encodeURIComponent(lastPolledAt);
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok || !data.messages) return;
        data.messages.forEach(function (m) {
          // Server-side "outbound" = agent → visitor; render on the "in" side
          // here since this is the visitor's own chat window.
          if (m.direction === "outbound") addMessage("agent", m.body);
          lastPolledAt = m.created_at;
        });
      })
      .catch(function () {});
  }

  // Re-check for a conversation id periodically in case it was set after
  // the panel was already opened (first message just sent).
  setInterval(function () {
    if (panelOpen && !pollTimer && conversationId) startPolling();
  }, 2000);

  window.kvlChat = { open: function () { if (!panelOpen) togglePanel(); } };
})();
