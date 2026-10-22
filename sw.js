const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r285-d5a533b38404`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r285-d5a533b38404",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r285-d5a533b38404",
    "./src/proving-ground.js?v=r285-d5a533b38404",
    "./src/proving-ground-fixtures.js?v=r285-d5a533b38404",
    "./src/proving-ground-labs.js?v=r285-d5a533b38404",
    "./src/dungeon-variation.js?v=r285-d5a533b38404",
    "./src/dungeon-completion.js?v=r285-d5a533b38404",
    "./src/enemy-patterns.js?v=r285-d5a533b38404",
    "./src/monster-pack.js?v=r285-d5a533b38404",
    "./src/monster-render.js?v=r285-d5a533b38404",
    "./src/astral-worm.js?v=r285-d5a533b38404",
    "./src/astral-worm-render.js?v=r285-d5a533b38404",
    "./src/astral-worm-retreat.js?v=r285-d5a533b38404",
    "./src/astral-worm-mount.js?v=r285-d5a533b38404",
    "./src/lightning-giant-render.js?v=r285-d5a533b38404",
    "./src/astral-encounters.js?v=r285-d5a533b38404",
    "./src/astral-world-retreat.js?v=r285-d5a533b38404",
    "./src/landscape.js?v=r285-d5a533b38404",
    "./src/landscape-render.js?v=r285-d5a533b38404",
    "./src/underlands.js?v=r285-d5a533b38404",
    "./src/pattern-dungeons.js?v=r285-d5a533b38404",
    "./src/relay-network.js?v=r285-d5a533b38404",
    "./src/glyphs.js?v=r285-d5a533b38404",
    "./src/echoes.js?v=r285-d5a533b38404",
    "./src/constellation.js?v=r285-d5a533b38404",
    "./src/water-traversal.js?v=r285-d5a533b38404",
    "./src/open-sea.js?v=r285-d5a533b38404",
    "./src/boats.js?v=r285-d5a533b38404",
    "./src/sea-creatures.js?v=r285-d5a533b38404",
    "./src/diving.js?v=r285-d5a533b38404",
    "./src/grottoes.js?v=r285-d5a533b38404",
    "./src/spell-slots.js?v=r285-d5a533b38404",
    "./src/settlements.js?v=r285-d5a533b38404",
    "./src/skirmishes.js?v=r285-d5a533b38404",
    "./src/travelers.js?v=r285-d5a533b38404",
    "./src/diagnostic-probe.js?v=r285-d5a533b38404",
    "./src/questing-beast.js?v=r285-d5a533b38404",
    "./src/recitations.js?v=r285-d5a533b38404",
    "./src/lore.js?v=r285-d5a533b38404",
    "./src/glimpses.js?v=r285-d5a533b38404",
    "./src/glimpse-render.js?v=r285-d5a533b38404",
    "./src/glimpse-paint.js?v=r285-d5a533b38404",
    "./src/glimpse-scenes.js?v=r285-d5a533b38404",
    "./src/glimpse-horror.js?v=r285-d5a533b38404",
    "./src/glimpse-legend.js?v=r285-d5a533b38404",
    "./src/glimpse-hand.js?v=r285-d5a533b38404",
    "./src/atlas-view.js?v=r285-d5a533b38404",
    "./src/strange.js?v=r285-d5a533b38404",
    "./src/linked-dungeons.js?v=r285-d5a533b38404",
    "./src/digging.js?v=r285-d5a533b38404",
    "./src/building.js?v=r285-d5a533b38404",
    "./src/refuge-lands.js?v=r285-d5a533b38404",
    "./src/revenant-horde.js?v=r285-d5a533b38404",
    "./src/stages.js?v=r285-d5a533b38404",
    "./src/tyrant-hunt.js?v=r285-d5a533b38404",
    "./src/world-beasts.js?v=r285-d5a533b38404",
    "./src/elders.js?v=r285-d5a533b38404",
    "./src/far-array.js?v=r285-d5a533b38404",
    "./src/combat-visuals.js?v=r285-d5a533b38404",
    "./src/dungeon-framework.js?v=r285-d5a533b38404",
    "./src/elites.js?v=r285-d5a533b38404",
    "./src/random.js?v=r285-d5a533b38404",
    "./src/types.js?v=r285-d5a533b38404",
    "./src/story.js?v=r285-d5a533b38404",
    "./src/foundry.js?v=r285-d5a533b38404",
    "./src/world.js?v=r285-d5a533b38404",
    "./src/deep-dungeons.js?v=r285-d5a533b38404",
    "./src/scenes.js?v=r285-d5a533b38404",
    "./src/arenas.js?v=r285-d5a533b38404",
    "./src/items.js?v=r285-d5a533b38404",
    "./src/combat.js?v=r285-d5a533b38404",
    "./src/interactions.js?v=r285-d5a533b38404",
    "./src/persistence.js?v=r285-d5a533b38404",
    "./src/input.js?v=r285-d5a533b38404",
    "./src/game.js?v=r285-d5a533b38404",
    "./src/renderer.js?v=r285-d5a533b38404",
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
