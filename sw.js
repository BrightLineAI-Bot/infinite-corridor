const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v269`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=269",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=269",
    "./src/proving-ground.js?v=269",
    "./src/proving-ground-fixtures.js?v=269",
    "./src/proving-ground-labs.js?v=269",
    "./src/dungeon-variation.js?v=269",
    "./src/dungeon-completion.js?v=269",
    "./src/enemy-patterns.js?v=269",
    "./src/monster-pack.js?v=269",
    "./src/monster-render.js?v=269",
    "./src/astral-worm.js?v=269",
    "./src/astral-worm-render.js?v=269",
    "./src/astral-worm-retreat.js?v=269",
    "./src/astral-worm-mount.js?v=269",
    "./src/lightning-giant-render.js?v=269",
    "./src/astral-encounters.js?v=269",
    "./src/astral-world-retreat.js?v=269",
    "./src/landscape.js?v=269",
    "./src/landscape-render.js?v=269",
    "./src/underlands.js?v=269",
    "./src/pattern-dungeons.js?v=269",
    "./src/relay-network.js?v=269",
    "./src/glyphs.js?v=269",
    "./src/echoes.js?v=269",
    "./src/constellation.js?v=269",
    "./src/water-traversal.js?v=269",
    "./src/open-sea.js?v=269",
    "./src/boats.js?v=269",
    "./src/sea-creatures.js?v=269",
    "./src/diving.js?v=269",
    "./src/grottoes.js?v=269",
    "./src/spell-slots.js?v=269",
    "./src/settlements.js?v=269",
    "./src/skirmishes.js?v=269",
    "./src/travelers.js?v=269",
    "./src/diagnostic-probe.js?v=269",
    "./src/questing-beast.js?v=269",
    "./src/recitations.js?v=269",
    "./src/lore.js?v=269",
    "./src/glimpses.js?v=269",
    "./src/glimpse-render.js?v=269",
    "./src/glimpse-paint.js?v=269",
    "./src/glimpse-scenes.js?v=269",
    "./src/glimpse-horror.js?v=269",
    "./src/glimpse-legend.js?v=269",
    "./src/glimpse-hand.js?v=269",
    "./src/atlas-view.js?v=269",
    "./src/strange.js?v=269",
    "./src/linked-dungeons.js?v=269",
    "./src/digging.js?v=269",
    "./src/building.js?v=269",
    "./src/refuge-lands.js?v=269",
    "./src/revenant-horde.js?v=269",
    "./src/tyrant-hunt.js?v=269",
    "./src/world-beasts.js?v=269",
    "./src/elders.js?v=269",
    "./src/far-array.js?v=269",
    "./src/combat-visuals.js?v=269",
    "./src/dungeon-framework.js?v=269",
    "./src/elites.js?v=269",
    "./src/random.js?v=269",
    "./src/types.js?v=269",
    "./src/story.js?v=269",
    "./src/foundry.js?v=269",
    "./src/world.js?v=269",
    "./src/deep-dungeons.js?v=269",
    "./src/scenes.js?v=269",
    "./src/arenas.js?v=269",
    "./src/items.js?v=269",
    "./src/combat.js?v=269",
    "./src/interactions.js?v=269",
    "./src/persistence.js?v=269",
    "./src/input.js?v=269",
    "./src/game.js?v=269",
    "./src/renderer.js?v=269",
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
