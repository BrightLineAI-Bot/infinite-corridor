const CACHE = "infinite-corridor-v32",
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=32",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js",
    "./src/random.js",
    "./src/types.js",
    "./src/world.js",
    "./src/items.js",
    "./src/combat.js",
    "./src/interactions.js",
    "./src/persistence.js",
    "./src/input.js",
    "./src/game.js",
    "./src/renderer.js",
  ];
self.addEventListener("install", (e) =>
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((ks) =>
        Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  if (e.request.method === "GET")
    e.respondWith(
      caches.match(e.request).then(
        (r) =>
          r ||
          fetch(e.request)
            .then((n) => {
              const c = n.clone();
              caches.open(CACHE).then((x) => x.put(e.request, c));
              return n;
            })
            .catch(() => caches.match("./index.html")),
      ),
    );
});
