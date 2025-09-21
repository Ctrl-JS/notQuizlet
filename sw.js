const VERSION = "0.0.8";
const CACHE_NAME = `quiz-cache-${VERSION}`;
const APP_STATIC_RES = [
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

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        console.log('Opened cache');
        APP_STATIC_RES.forEach((item) => {
          cache.add(item).catch(console.error);
        });
      })
  );
  return self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.match(event.request, {ignoreVary: true})
        .then(function(response) {
          if (response) {
          console.log('SERVED FROM CACHE');
            return response;
          }
          return fetch(event.request).then(function(response){
              console.log('Response from network is:', response);
              return response;
          });
        }
      )
    })
  );
});
