const VERSION = "0.0.1";
const CACHE_NAME = `quiz-cache-${VERSION}`;
const APP_STATIC_RES = [
  "/notQuizlet/",
  "/notQuizlet/index.html",
  "/notQuizlet/compress.css",
  "/notQuizlet/import.css",
  "/notQuizlet/style.css",
  "/notQuizlet/js/app.js",
  "/notQuizlet/js/importer.js",
  "/notQuizlet/img/add.svg",
  "/notQuizlet/img/back.svg",
  "/notQuizlet/img/cards.svg",
  "/notQuizlet/img/close.svg",
  "/notQuizlet/img/copy-file.svg",
  "/notQuizlet/img/download.svg",
  "/notQuizlet/img/edit.svg",
  "/notQuizlet/img/icon.svg",
  "/notQuizlet/img/icon-512.png",
  "/notQuizlet/img/info.svg",
  "/notQuizlet/img/logo.svg",
  "/notQuizlet/img/pref.svg",
  "/notQuizlet/img/quiz.svg",
  "/notQuizlet/img/quizlet-logo.svg",
  "/notQuizlet/img/save.svg",
  "/notQuizlet/img/settings.svg",
  "/notQuizlet/img/star.svg",
  "/notQuizlet/img/star-fill.svg",
  "/notQuizlet/img/upload.svg",
  "/notQuizlet/img/write.svg",
]

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      cache.addAll(APP_STATIC_RES);
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
          return undefined;
        }),
      );
      await clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  // when seeking an HTML page
  if (event.request.mode === "navigate") {
    // Return to the index.html page
    event.respondWith(caches.match("/"));
    return;
  }

  // For every other request type
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request.url);
      if (cachedResponse) {
        // Return the cached response if it's available.
        return cachedResponse;
      }
      // Respond with an HTTP 404 response status.
      return new Response(null, { status: 404 });
    })(),
  );
});
