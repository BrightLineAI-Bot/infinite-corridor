const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v301`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=301",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=301",
    "./src/proving-ground.js?v=301",
    "./src/proving-ground-fixtures.js?v=301",
    "./src/proving-ground-labs.js?v=301",
    "./src/dungeon-variation.js?v=301",
    "./src/dungeon-completion.js?v=301",
    "./src/enemy-patterns.js?v=301",
    "./src/monster-pack.js?v=301",
    "./src/monster-render.js?v=301",
    "./src/astral-worm.js?v=301",
    "./src/astral-worm-render.js?v=301",
    "./src/astral-worm-retreat.js?v=301",
    "./src/astral-worm-mount.js?v=301",
    "./src/lightning-giant-render.js?v=301",
    "./src/astral-encounters.js?v=301",
    "./src/astral-world-retreat.js?v=301",
    "./src/landscape.js?v=301",
    "./src/landscape-render.js?v=301",
    "./src/underlands.js?v=301",
    "./src/pattern-dungeons.js?v=301",
    "./src/relay-network.js?v=301",
    "./src/glyphs.js?v=301",
    "./src/echoes.js?v=301",
    "./src/constellation.js?v=301",
    "./src/water-traversal.js?v=301",
    "./src/open-sea.js?v=301",
    "./src/boats.js?v=301",
    "./src/sea-creatures.js?v=301",
    "./src/diving.js?v=301",
    "./src/grottoes.js?v=301",
    "./src/spell-slots.js?v=301",
    "./src/settlements.js?v=301",
    "./src/skirmishes.js?v=301",
    "./src/travelers.js?v=301",
    "./src/diagnostic-probe.js?v=301",
    "./src/questing-beast.js?v=301",
    "./src/recitations.js?v=301",
    "./src/lore.js?v=301",
    "./src/glimpses.js?v=301",
    "./src/glimpse-render.js?v=301",
    "./src/glimpse-paint.js?v=301",
    "./src/glimpse-scenes.js?v=301",
    "./src/glimpse-horror.js?v=301",
    "./src/glimpse-legend.js?v=301",
    "./src/glimpse-hand.js?v=301",
    "./src/atlas-view.js?v=301",
    "./src/strange.js?v=301",
    "./src/linked-dungeons.js?v=301",
    "./src/digging.js?v=301",
    "./src/building.js?v=301",
    "./src/refuge-lands.js?v=301",
    "./src/revenant-horde.js?v=301",
    "./src/stages.js?v=301",
    "./src/watcher.js?v=301",
    "./src/tyrant-hunt.js?v=301",
    "./src/world-beasts.js?v=301",
    "./src/elders.js?v=301",
    "./src/far-array.js?v=301",
    "./src/combat-visuals.js?v=301",
    "./src/dungeon-framework.js?v=301",
    "./src/elites.js?v=301",
    "./src/random.js?v=301",
    "./src/types.js?v=301",
    "./src/story.js?v=301",
    "./src/foundry.js?v=301",
    "./src/world.js?v=301",
    "./src/deep-dungeons.js?v=301",
    "./src/scenes.js?v=301",
    "./src/arenas.js?v=301",
    "./src/items.js?v=301",
    "./src/combat.js?v=301",
    "./src/interactions.js?v=301",
    "./src/persistence.js?v=301",
    "./src/input.js?v=301",
    "./src/game.js?v=301",
    "./src/renderer.js?v=301",
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
