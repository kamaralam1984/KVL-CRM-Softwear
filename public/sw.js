// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 9 (Growth & Re-engagement Channels)
// Minimal Web Push service worker — receives push events and renders a
// notification.
//
// Phase 34 — PWA hardening. Extended (not rewritten) with a deliberately
// conservative offline fallback: this is a CRM showing live sales data, so
// there is NO cache-first strategy for pages or API calls — that would risk
// showing stale leads/deals when the user is actually online. The only thing
// cached is a minimal app-shell for the true-offline case (network request
// fails entirely), and only navigations fall back to it; everything else
// (JS/CSS/API/data) always goes to the network, uncached.

const SHELL_CACHE = "kvl-shell-v1";
const SHELL_URLS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // only handle page navigations, never API/data/asset requests
  event.respondWith(
    fetch(event.request).catch(() => caches.match("/").then((cached) => cached || Response.error()))
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "KVl CRM", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* non-JSON payload — fall back to defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
