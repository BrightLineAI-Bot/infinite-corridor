const CACHE = "infinite-corridor-v87",
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=87",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=87",
    "./src/elites.js?v=87",
    "./src/random.js?v=87",
    "./src/types.js?v=87",
    "./src/story.js?v=87",
    "./src/foundry.js?v=87",
    "./src/world.js?v=87",
    "./src/deep-dungeons.js?v=87",
    "./src/scenes.js?v=87",
    "./src/arenas.js?v=87",
    "./src/items.js?v=87",
    "./src/combat.js?v=87",
    "./src/interactions.js?v=87",
    "./src/persistence.js?v=87",
    "./src/input.js?v=87",
    "./src/game.js?v=87",
    "./src/renderer.js?v=87",
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
