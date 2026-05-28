const CACHE = "iko-v2";
const STATIC = ["/", "/login", "/index.html"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.hostname === "functions.poehali.dev") return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/index.html")));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
self.addEventListener("push", e => {
  let data = { title: "🥋 ИКО Журнал", body: "Напоминание", url: "/" };
  try {
    if (e.data) {
      const parsed = JSON.parse(e.data.text());
      data = { ...data, ...parsed };
    }
  } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/files/45e6e2d6-5894-40cf-800e-23896cecec30.jpg",
      badge: "https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/files/45e6e2d6-5894-40cf-800e-23896cecec30.jpg",
      tag: "iko-journal",
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
