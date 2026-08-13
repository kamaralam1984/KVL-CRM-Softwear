/*!
 * KVL CRM — Standalone embed script (Phase 17, Wave 10 — Multi-Tenant Embed)
 *
 *   <script src="https://YOUR-KVL-DOMAIN/kvl-embed.js" data-site-id="KVL-SITE-XXXXXXXX" async></script>
 *
 * Dependency-free vanilla JS — no build step, served as-is from /public.
 * Hand-maintained subset of lib/tracking/sdk/client.ts's feature set for use
 * on a THIRD-PARTY page (no bundler exists yet to share code between the two
 * — see docs/ACQUISITION_ENGINE_ROADMAP.md Wave 10 for the tradeoff). Keep
 * behavior in sync with client.ts when either changes.
 *
 * Public API once loaded:
 *   window.kvl.track("cta_click", { location: "hero" })
 *   window.kvl.identify({ name, email, phone })   // only after voluntary submission
 *   window.kvl.setConsent("granted" | "denied")
 *
 * Auto-initializes on load using this <script> tag's own data-site-id and
 * src origin (so /api/analytics/* calls always target KVL's API, regardless
 * of what domain this script is embedded on).
 */
(function () {
  "use strict";
  if (typeof window === "undefined" || window.kvl) return;

  var VISITOR_KEY = "kvl_visitor_id";
  var CONSENT_KEY = "kvl_consent";
  var SESSION_KEY = "kvl_session";
  var QUEUE_KEY = "kvl_embed_queue";
  var FLUSH_INTERVAL_MS = 4000;
  var BATCH_SIZE = 10;
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;

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

  function readJSON(storage, key) {
    try {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeJSON(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable or full — degrade silently */
    }
  }

  function consentGranted() {
    try {
      return localStorage.getItem(CONSENT_KEY) !== "denied";
    } catch {
      return true;
    }
  }

  var visitorId = "";
  var sessionId = "";
  var lastPageUrl = "";
  var queue = [];
  var trackingDisabled = false;

  function post(path, body, useBeacon) {
    var payload = JSON.stringify(body);
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(api(path), new Blob([payload], { type: "application/json" }));
      return;
    }
    fetch(api(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(function () {});
  }

  function flush(useBeacon) {
    if (!queue.length) return;
    var batch = queue.splice(0, BATCH_SIZE);
    writeJSON(sessionStorage, QUEUE_KEY, queue);
    post(
      "/api/analytics/collect",
      { visitor_id: visitorId, site_id: siteId, session_id: sessionId, events: batch },
      useBeacon
    );
  }

  function enqueue(name, properties) {
    if (trackingDisabled || !consentGranted()) return;
    queue.push({ name: name, page_url: window.location.href, properties: properties || {}, ts: Date.now() });
    writeJSON(sessionStorage, QUEUE_KEY, queue);
    if (queue.length >= BATCH_SIZE) flush(false);
  }

  function startSession() {
    if (!consentGranted()) return;
    post("/api/analytics/session", {
      visitor_id: visitorId,
      site_id: siteId,
      session_id: sessionId,
      phase: "start",
      page_url: window.location.href,
      landing_page: window.location.href,
      referrer: document.referrer,
      device: {
        device: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
        browser: "",
        os: "",
        language: navigator.language,
        timezone: (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : "",
      },
    });
  }

  // Mirrors lib/tracking/sdk/client.ts's ensureSession()/touchSession() — a
  // 30-min-idle tab gets a fresh session_id (matches applyVisitBonus's
  // returning-visitor scoring), not one session for the tab's entire lifetime.
  function ensureSession() {
    var now = Date.now();
    var stored = readJSON(sessionStorage, SESSION_KEY);
    if (stored && now - stored.lastActivity < SESSION_TIMEOUT_MS) {
      sessionId = stored.sessionId;
      return;
    }
    sessionId = "KV-S-" + shortHex();
    writeJSON(sessionStorage, SESSION_KEY, { sessionId: sessionId, lastActivity: now });
    startSession();
  }

  function touchSession() {
    writeJSON(sessionStorage, SESSION_KEY, { sessionId: sessionId, lastActivity: Date.now() });
  }

  // Mirrors client.ts's page() — fires on the initial load and on every
  // client-side route change (history.pushState/replaceState/popstate),
  // de-duped against repeat calls for the same URL. Without this, a
  // third-party single-page app would only ever record one page_view for its
  // entire visit.
  function trackPageView() {
    ensureSession();
    var url = window.location.href;
    if (url === lastPageUrl) return;
    lastPageUrl = url;
    touchSession();
    enqueue("page_view");
  }

  function patchHistoryMethod(name) {
    var original = history[name];
    if (typeof original !== "function") return;
    history[name] = function () {
      var result = original.apply(this, arguments);
      trackPageView();
      return result;
    };
  }

  function init() {
    if (!siteId || !apiBase) {
      console.warn("[kvl-embed] missing data-site-id or script src — tracking disabled");
      trackingDisabled = true;
      return;
    }

    try {
      visitorId = localStorage.getItem(VISITOR_KEY) || ("KV-V-" + shortHex());
      localStorage.setItem(VISITOR_KEY, visitorId);
    } catch {
      visitorId = "KV-V-" + shortHex();
    }

    queue = readJSON(sessionStorage, QUEUE_KEY) || [];

    fetch(api("/api/analytics/config?site_id=" + encodeURIComponent(siteId)))
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && data.trackingEnabled === false) trackingDisabled = true;
      })
      .catch(function () {});

    setInterval(function () { flush(false); }, FLUSH_INTERVAL_MS);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") onPageHide();
    });

    patchHistoryMethod("pushState");
    patchHistoryMethod("replaceState");
    window.addEventListener("popstate", trackPageView);

    trackPageView();
  }

  var pageHideFired = false;
  function onPageHide() {
    if (pageHideFired) return;
    pageHideFired = true;
    flush(true);
    post(
      "/api/analytics/session",
      { visitor_id: visitorId, site_id: siteId, session_id: sessionId, phase: "end", exit_page: window.location.href },
      true
    );
  }

  window.kvl = {
    track: function (name, properties) {
      if (trackingDisabled) return;
      ensureSession();
      touchSession();
      enqueue(name, properties);
    },
    identify: function (traits) {
      if (trackingDisabled || !consentGranted()) return;
      post("/api/analytics/identify", {
        visitor_id: visitorId,
        site_id: siteId,
        session_id: sessionId,
        page_url: window.location.href,
        traits: traits || {},
      });
    },
    setConsent: function (status, categories) {
      try {
        localStorage.setItem(CONSENT_KEY, status);
      } catch {
        /* ignore */
      }
      post("/api/analytics/consent", { visitor_id: visitorId, site_id: siteId, status: status, categories: categories || {} });
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
