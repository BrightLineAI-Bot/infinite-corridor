const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r183-41a3bdd9b25e`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r183-41a3bdd9b25e",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r183-41a3bdd9b25e",
    "./src/proving-ground.js?v=r183-41a3bdd9b25e",
    "./src/proving-ground-fixtures.js?v=r183-41a3bdd9b25e",
    "./src/proving-ground-labs.js?v=r183-41a3bdd9b25e",
    "./src/dungeon-variation.js?v=r183-41a3bdd9b25e",
    "./src/dungeon-completion.js?v=r183-41a3bdd9b25e",
    "./src/enemy-patterns.js?v=r183-41a3bdd9b25e",
    "./src/monster-pack.js?v=r183-41a3bdd9b25e",
    "./src/monster-render.js?v=r183-41a3bdd9b25e",
    "./src/landscape.js?v=r183-41a3bdd9b25e",
    "./src/landscape-render.js?v=r183-41a3bdd9b25e",
    "./src/underlands.js?v=r183-41a3bdd9b25e",
    "./src/pattern-dungeons.js?v=r183-41a3bdd9b25e",
    "./src/relay-network.js?v=r183-41a3bdd9b25e",
    "./src/glyphs.js?v=r183-41a3bdd9b25e",
    "./src/echoes.js?v=r183-41a3bdd9b25e",
    "./src/constellation.js?v=r183-41a3bdd9b25e",
    "./src/water-traversal.js?v=r183-41a3bdd9b25e",
    "./src/open-sea.js?v=r183-41a3bdd9b25e",
    "./src/boats.js?v=r183-41a3bdd9b25e",
    "./src/sea-creatures.js?v=r183-41a3bdd9b25e",
    "./src/diving.js?v=r183-41a3bdd9b25e",
    "./src/grottoes.js?v=r183-41a3bdd9b25e",
    "./src/spell-slots.js?v=r183-41a3bdd9b25e",
    "./src/settlements.js?v=r183-41a3bdd9b25e",
    "./src/skirmishes.js?v=r183-41a3bdd9b25e",
    "./src/travelers.js?v=r183-41a3bdd9b25e",
    "./src/diagnostic-probe.js?v=r183-41a3bdd9b25e",
    "./src/questing-beast.js?v=r183-41a3bdd9b25e",
    "./src/recitations.js?v=r183-41a3bdd9b25e",
    "./src/far-array.js?v=r183-41a3bdd9b25e",
    "./src/combat-visuals.js?v=r183-41a3bdd9b25e",
    "./src/dungeon-framework.js?v=r183-41a3bdd9b25e",
    "./src/elites.js?v=r183-41a3bdd9b25e",
    "./src/random.js?v=r183-41a3bdd9b25e",
    "./src/types.js?v=r183-41a3bdd9b25e",
    "./src/story.js?v=r183-41a3bdd9b25e",
    "./src/foundry.js?v=r183-41a3bdd9b25e",
    "./src/world.js?v=r183-41a3bdd9b25e",
    "./src/deep-dungeons.js?v=r183-41a3bdd9b25e",
    "./src/scenes.js?v=r183-41a3bdd9b25e",
    "./src/arenas.js?v=r183-41a3bdd9b25e",
    "./src/items.js?v=r183-41a3bdd9b25e",
    "./src/combat.js?v=r183-41a3bdd9b25e",
    "./src/interactions.js?v=r183-41a3bdd9b25e",
    "./src/persistence.js?v=r183-41a3bdd9b25e",
    "./src/input.js?v=r183-41a3bdd9b25e",
    "./src/game.js?v=r183-41a3bdd9b25e",
    "./src/renderer.js?v=r183-41a3bdd9b25e",
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
