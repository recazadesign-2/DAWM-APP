/* Dawm Service Worker — Push + Offline-first cache */
const VERSION = "v2";
const APP_SHELL_CACHE = `dawm-shell-${VERSION}`;
const RUNTIME_CACHE = `dawm-runtime-${VERSION}`;
const QURAN_CACHE = `dawm-quran-${VERSION}`;
const OFFLINE_URL = "/offline.html";

const APP_SHELL = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((c) => c.addAll(APP_SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("dawm-") && !k.endsWith(VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isQuranPage(url) {
  // Cache Quran page images (common CDNs and any /quran-pages/ path)
  return (
    /\/quran-pages\//i.test(url.pathname) ||
    /quran\.ksu\.edu\.sa/.test(url.hostname) ||
    /everyayah\.com/.test(url.hostname) ||
    /\.(png|jpg|jpeg|webp)$/i.test(url.pathname) && /quran|mushaf|page/i.test(url.pathname)
  );
}

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    /\.(js|css|woff2?|ttf|otf|svg|ico)$/i.test(url.pathname)
  );
}

function isApi(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/~oauth") ||
    /supabase\.co/.test(url.hostname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache APIs / auth / supabase
  if (isApi(url)) return;

  // HTML navigations → NetworkFirst with offline fallback
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(req);
          return cached || (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
    return;
  }

  // Quran page images → CacheFirst (long-lived)
  if (isQuranPage(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(QURAN_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Built static assets → StaleWhileRevalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
  }
});

/* Push notifications */
self.addEventListener("push", (event) => {
  let data = { title: "داوم", body: "تذكير جديد", url: "/" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      dir: "rtl",
      lang: "ar",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.matchAll({ type: "window" }).then((wins) => {
    for (const w of wins) { if ("focus" in w) return w.navigate(url).then(() => w.focus()); }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});

/* Allow the page to ask SW to sync now */
self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
