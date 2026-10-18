const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r181-7ce813c6684e`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r181-7ce813c6684e",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r181-7ce813c6684e",
    "./src/proving-ground.js?v=r181-7ce813c6684e",
    "./src/proving-ground-fixtures.js?v=r181-7ce813c6684e",
    "./src/proving-ground-labs.js?v=r181-7ce813c6684e",
    "./src/dungeon-variation.js?v=r181-7ce813c6684e",
    "./src/dungeon-completion.js?v=r181-7ce813c6684e",
    "./src/enemy-patterns.js?v=r181-7ce813c6684e",
    "./src/monster-pack.js?v=r181-7ce813c6684e",
    "./src/monster-render.js?v=r181-7ce813c6684e",
    "./src/landscape.js?v=r181-7ce813c6684e",
    "./src/landscape-render.js?v=r181-7ce813c6684e",
    "./src/underlands.js?v=r181-7ce813c6684e",
    "./src/pattern-dungeons.js?v=r181-7ce813c6684e",
    "./src/relay-network.js?v=r181-7ce813c6684e",
    "./src/glyphs.js?v=r181-7ce813c6684e",
    "./src/echoes.js?v=r181-7ce813c6684e",
    "./src/constellation.js?v=r181-7ce813c6684e",
    "./src/water-traversal.js?v=r181-7ce813c6684e",
    "./src/open-sea.js?v=r181-7ce813c6684e",
    "./src/boats.js?v=r181-7ce813c6684e",
    "./src/sea-creatures.js?v=r181-7ce813c6684e",
    "./src/diving.js?v=r181-7ce813c6684e",
    "./src/grottoes.js?v=r181-7ce813c6684e",
    "./src/spell-slots.js?v=r181-7ce813c6684e",
    "./src/settlements.js?v=r181-7ce813c6684e",
    "./src/skirmishes.js?v=r181-7ce813c6684e",
    "./src/travelers.js?v=r181-7ce813c6684e",
    "./src/diagnostic-probe.js?v=r181-7ce813c6684e",
    "./src/questing-beast.js?v=r181-7ce813c6684e",
    "./src/recitations.js?v=r181-7ce813c6684e",
    "./src/far-array.js?v=r181-7ce813c6684e",
    "./src/combat-visuals.js?v=r181-7ce813c6684e",
    "./src/dungeon-framework.js?v=r181-7ce813c6684e",
    "./src/elites.js?v=r181-7ce813c6684e",
    "./src/random.js?v=r181-7ce813c6684e",
    "./src/types.js?v=r181-7ce813c6684e",
    "./src/story.js?v=r181-7ce813c6684e",
    "./src/foundry.js?v=r181-7ce813c6684e",
    "./src/world.js?v=r181-7ce813c6684e",
    "./src/deep-dungeons.js?v=r181-7ce813c6684e",
    "./src/scenes.js?v=r181-7ce813c6684e",
    "./src/arenas.js?v=r181-7ce813c6684e",
    "./src/items.js?v=r181-7ce813c6684e",
    "./src/combat.js?v=r181-7ce813c6684e",
    "./src/interactions.js?v=r181-7ce813c6684e",
    "./src/persistence.js?v=r181-7ce813c6684e",
    "./src/input.js?v=r181-7ce813c6684e",
    "./src/game.js?v=r181-7ce813c6684e",
    "./src/renderer.js?v=r181-7ce813c6684e",
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
        Promise.all(
          ks.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k)),
        ),
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
