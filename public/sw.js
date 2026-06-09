// Service Worker — Ammar Cell Kasir PWA v2
const CACHE = "ammar-cell-v2";

// Install: skip waiting langsung aktif
self.addEventListener("install", () => self.skipWaiting());

// Activate: hapus cache lama, claim clients
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: network first, jangan cache HTML (biar selalu fresh)
self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  // Supabase & API: jangan di-cache
  if(e.request.url.includes("supabase.co")) return;
  // HTML: selalu dari network
  if(e.request.headers.get("accept")?.includes("text/html")) {
    e.respondWith(fetch(e.request).catch(() => caches.match("/")));
    return;
  }
  // Assets lain: network first
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
