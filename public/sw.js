const CACHE_NAME = "iko-journal-v1";
const API_CACHE = "iko-api-v1";

// Ресурсы для кэширования при установке
const PRECACHE_URLS = [
  "/",
  "/login",
  "/index.html",
];

// Установка — кэшируем основные страницы
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

// Активация — удаляем старые кэши
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Перехват запросов
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API запросы (functions.poehali.dev) — Network First
  if (url.hostname === "functions.poehali.dev") {
    event.respondWith(
      fetch(event.request.clone())
        .then((res) => {
          if (res.ok && event.request.method === "GET") {
            const resClone = res.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, resClone));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || new Response(JSON.stringify({ error: "Офлайн" }), { headers: { "Content-Type": "application/json" } })))
    );
    return;
  }

  // CDN (изображения, шрифты) — Cache First
  if (url.hostname === "cdn.poehali.dev" || url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Всё остальное (JS, CSS, HTML) — Cache First с fallback на сеть
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      });
      return cached || network;
    })
  );
});
