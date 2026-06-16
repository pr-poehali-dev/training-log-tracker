const CACHE = "branchlee-v5";
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

  // HTML, манифест и иконки — всегда из сети (network-first), чтобы обновления доходили сразу
  const isFresh =
    e.request.mode === "navigate" ||
    url.pathname.endsWith("/manifest.json") ||
    url.pathname.endsWith("/index.html");

  if (isFresh) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then(c => c || caches.match("/index.html"))));
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
const NOTIF_ICON = "https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/85e11de5-baef-45b0-ba14-8a09de6ef09c.jpg";
const NOTIF_BADGE = "https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/files/96dd529d-3c24-4144-adef-dbe2295b2386.jpg";
const NOTIF_IMAGE = "https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/files/e1d8f1e9-d480-42f1-8bb1-21f6812b91b2.jpg";

self.addEventListener("push", e => {
  let data = { title: "Branch Lee", body: "Напоминание", url: "/" };
  try {
    if (e.data) {
      const parsed = JSON.parse(e.data.text());
      data = { ...data, ...parsed };
    }
  } catch {}

  const options = {
    body: data.body,
    icon: NOTIF_ICON,
    badge: NOTIF_BADGE,
    image: data.image !== false ? (data.image || NOTIF_IMAGE) : undefined,
    tag: "iko-journal",
    renotify: true,
    requireInteraction: true,
    vibrate: [120, 60, 120, 60, 200],
    silent: false,
    timestamp: Date.now(),
    data: { url: data.url },
    actions: [
      { action: "open", title: "Открыть журнал" },
      { action: "dismiss", title: "Позже" },
    ],
  };

  e.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  if (e.action === "dismiss") return;

  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});