const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v283`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=283",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=283",
    "./src/proving-ground.js?v=283",
    "./src/proving-ground-fixtures.js?v=283",
    "./src/proving-ground-labs.js?v=283",
    "./src/dungeon-variation.js?v=283",
    "./src/dungeon-completion.js?v=283",
    "./src/enemy-patterns.js?v=283",
    "./src/monster-pack.js?v=283",
    "./src/monster-render.js?v=283",
    "./src/astral-worm.js?v=283",
    "./src/astral-worm-render.js?v=283",
    "./src/astral-worm-retreat.js?v=283",
    "./src/astral-worm-mount.js?v=283",
    "./src/lightning-giant-render.js?v=283",
    "./src/astral-encounters.js?v=283",
    "./src/astral-world-retreat.js?v=283",
    "./src/landscape.js?v=283",
    "./src/landscape-render.js?v=283",
    "./src/underlands.js?v=283",
    "./src/pattern-dungeons.js?v=283",
    "./src/relay-network.js?v=283",
    "./src/glyphs.js?v=283",
    "./src/echoes.js?v=283",
    "./src/constellation.js?v=283",
    "./src/water-traversal.js?v=283",
    "./src/open-sea.js?v=283",
    "./src/boats.js?v=283",
    "./src/sea-creatures.js?v=283",
    "./src/diving.js?v=283",
    "./src/grottoes.js?v=283",
    "./src/spell-slots.js?v=283",
    "./src/settlements.js?v=283",
    "./src/skirmishes.js?v=283",
    "./src/travelers.js?v=283",
    "./src/diagnostic-probe.js?v=283",
    "./src/questing-beast.js?v=283",
    "./src/recitations.js?v=283",
    "./src/lore.js?v=283",
    "./src/glimpses.js?v=283",
    "./src/glimpse-render.js?v=283",
    "./src/glimpse-paint.js?v=283",
    "./src/glimpse-scenes.js?v=283",
    "./src/glimpse-horror.js?v=283",
    "./src/glimpse-legend.js?v=283",
    "./src/glimpse-hand.js?v=283",
    "./src/atlas-view.js?v=283",
    "./src/strange.js?v=283",
    "./src/linked-dungeons.js?v=283",
    "./src/digging.js?v=283",
    "./src/building.js?v=283",
    "./src/refuge-lands.js?v=283",
    "./src/revenant-horde.js?v=283",
    "./src/stages.js?v=283",
    "./src/tyrant-hunt.js?v=283",
    "./src/world-beasts.js?v=283",
    "./src/elders.js?v=283",
    "./src/far-array.js?v=283",
    "./src/combat-visuals.js?v=283",
    "./src/dungeon-framework.js?v=283",
    "./src/elites.js?v=283",
    "./src/random.js?v=283",
    "./src/types.js?v=283",
    "./src/story.js?v=283",
    "./src/foundry.js?v=283",
    "./src/world.js?v=283",
    "./src/deep-dungeons.js?v=283",
    "./src/scenes.js?v=283",
    "./src/arenas.js?v=283",
    "./src/items.js?v=283",
    "./src/combat.js?v=283",
    "./src/interactions.js?v=283",
    "./src/persistence.js?v=283",
    "./src/input.js?v=283",
    "./src/game.js?v=283",
    "./src/renderer.js?v=283",
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
