/* Dawm push service worker */
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener("push", (event) => {
  let data = { title: "داوم", body: "تذكير جديد", url: "/" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      dir: "rtl",
      lang: "ar",
      data: { url: data.url || "/" },
    })
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