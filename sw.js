const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r199-cfbe397a7e7e`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r199-cfbe397a7e7e",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r199-cfbe397a7e7e",
    "./src/proving-ground.js?v=r199-cfbe397a7e7e",
    "./src/proving-ground-fixtures.js?v=r199-cfbe397a7e7e",
    "./src/proving-ground-labs.js?v=r199-cfbe397a7e7e",
    "./src/dungeon-variation.js?v=r199-cfbe397a7e7e",
    "./src/dungeon-completion.js?v=r199-cfbe397a7e7e",
    "./src/enemy-patterns.js?v=r199-cfbe397a7e7e",
    "./src/monster-pack.js?v=r199-cfbe397a7e7e",
    "./src/monster-render.js?v=r199-cfbe397a7e7e",
    "./src/landscape.js?v=r199-cfbe397a7e7e",
    "./src/landscape-render.js?v=r199-cfbe397a7e7e",
    "./src/underlands.js?v=r199-cfbe397a7e7e",
    "./src/pattern-dungeons.js?v=r199-cfbe397a7e7e",
    "./src/relay-network.js?v=r199-cfbe397a7e7e",
    "./src/glyphs.js?v=r199-cfbe397a7e7e",
    "./src/echoes.js?v=r199-cfbe397a7e7e",
    "./src/constellation.js?v=r199-cfbe397a7e7e",
    "./src/water-traversal.js?v=r199-cfbe397a7e7e",
    "./src/open-sea.js?v=r199-cfbe397a7e7e",
    "./src/boats.js?v=r199-cfbe397a7e7e",
    "./src/sea-creatures.js?v=r199-cfbe397a7e7e",
    "./src/diving.js?v=r199-cfbe397a7e7e",
    "./src/grottoes.js?v=r199-cfbe397a7e7e",
    "./src/spell-slots.js?v=r199-cfbe397a7e7e",
    "./src/settlements.js?v=r199-cfbe397a7e7e",
    "./src/skirmishes.js?v=r199-cfbe397a7e7e",
    "./src/travelers.js?v=r199-cfbe397a7e7e",
    "./src/diagnostic-probe.js?v=r199-cfbe397a7e7e",
    "./src/questing-beast.js?v=r199-cfbe397a7e7e",
    "./src/recitations.js?v=r199-cfbe397a7e7e",
    "./src/lore.js?v=r199-cfbe397a7e7e",
    "./src/glimpses.js?v=r199-cfbe397a7e7e",
    "./src/glimpse-render.js?v=r199-cfbe397a7e7e",
    "./src/elders.js?v=r199-cfbe397a7e7e",
    "./src/far-array.js?v=r199-cfbe397a7e7e",
    "./src/combat-visuals.js?v=r199-cfbe397a7e7e",
    "./src/dungeon-framework.js?v=r199-cfbe397a7e7e",
    "./src/elites.js?v=r199-cfbe397a7e7e",
    "./src/random.js?v=r199-cfbe397a7e7e",
    "./src/types.js?v=r199-cfbe397a7e7e",
    "./src/story.js?v=r199-cfbe397a7e7e",
    "./src/foundry.js?v=r199-cfbe397a7e7e",
    "./src/world.js?v=r199-cfbe397a7e7e",
    "./src/deep-dungeons.js?v=r199-cfbe397a7e7e",
    "./src/scenes.js?v=r199-cfbe397a7e7e",
    "./src/arenas.js?v=r199-cfbe397a7e7e",
    "./src/items.js?v=r199-cfbe397a7e7e",
    "./src/combat.js?v=r199-cfbe397a7e7e",
    "./src/interactions.js?v=r199-cfbe397a7e7e",
    "./src/persistence.js?v=r199-cfbe397a7e7e",
    "./src/input.js?v=r199-cfbe397a7e7e",
    "./src/game.js?v=r199-cfbe397a7e7e",
    "./src/renderer.js?v=r199-cfbe397a7e7e",
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
