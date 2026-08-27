// Enkel service worker för Skarp-appen.
// Strategi: NÄTVERK FÖRST, och tvingat FÖRBI webbläsarens vanliga HTTP-cache
// (cache: "no-store") - annars kan en "network first"-hämtning ändå råka
// returnera en gammal, mellanlagrad version istället för den senaste filen
// från GitHub Pages. Appen uppdateras ofta, så vi vill alltid ha senaste
// versionen när man är online - den lokala cachen används bara som reserv
// om man råkar vara offline (t.ex. dåligt mottagning på en skjutbana).

const CACHE_NAME = "skarp-cache-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  // Bara GET-förfrågningar hanteras - Firebase/API-anrop passerar som vanligt.
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then(function (response) {
        // Spara en färsk kopia i cachen för offline-fallback nästa gång.
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      })
      .catch(function () {
        // Offline eller nätverksfel - försök svara med cachad version istället.
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match("./index.html");
        });
      })
  );
});
