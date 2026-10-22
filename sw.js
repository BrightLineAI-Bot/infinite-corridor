const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v303`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=303",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=303",
    "./src/proving-ground.js?v=303",
    "./src/proving-ground-fixtures.js?v=303",
    "./src/proving-ground-labs.js?v=303",
    "./src/dungeon-variation.js?v=303",
    "./src/dungeon-completion.js?v=303",
    "./src/enemy-patterns.js?v=303",
    "./src/monster-pack.js?v=303",
    "./src/monster-render.js?v=303",
    "./src/astral-worm.js?v=303",
    "./src/astral-worm-render.js?v=303",
    "./src/astral-worm-retreat.js?v=303",
    "./src/astral-worm-mount.js?v=303",
    "./src/lightning-giant-render.js?v=303",
    "./src/astral-encounters.js?v=303",
    "./src/astral-world-retreat.js?v=303",
    "./src/landscape.js?v=303",
    "./src/landscape-render.js?v=303",
    "./src/underlands.js?v=303",
    "./src/pattern-dungeons.js?v=303",
    "./src/relay-network.js?v=303",
    "./src/glyphs.js?v=303",
    "./src/echoes.js?v=303",
    "./src/constellation.js?v=303",
    "./src/water-traversal.js?v=303",
    "./src/open-sea.js?v=303",
    "./src/boats.js?v=303",
    "./src/sea-creatures.js?v=303",
    "./src/diving.js?v=303",
    "./src/grottoes.js?v=303",
    "./src/spell-slots.js?v=303",
    "./src/settlements.js?v=303",
    "./src/skirmishes.js?v=303",
    "./src/travelers.js?v=303",
    "./src/diagnostic-probe.js?v=303",
    "./src/questing-beast.js?v=303",
    "./src/recitations.js?v=303",
    "./src/lore.js?v=303",
    "./src/glimpses.js?v=303",
    "./src/glimpse-render.js?v=303",
    "./src/glimpse-paint.js?v=303",
    "./src/glimpse-scenes.js?v=303",
    "./src/glimpse-horror.js?v=303",
    "./src/glimpse-legend.js?v=303",
    "./src/glimpse-hand.js?v=303",
    "./src/atlas-view.js?v=303",
    "./src/strange.js?v=303",
    "./src/linked-dungeons.js?v=303",
    "./src/digging.js?v=303",
    "./src/building.js?v=303",
    "./src/refuge-lands.js?v=303",
    "./src/revenant-horde.js?v=303",
    "./src/stages.js?v=303",
    "./src/watcher.js?v=303",
    "./src/tyrant-hunt.js?v=303",
    "./src/world-beasts.js?v=303",
    "./src/elders.js?v=303",
    "./src/far-array.js?v=303",
    "./src/combat-visuals.js?v=303",
    "./src/dungeon-framework.js?v=303",
    "./src/elites.js?v=303",
    "./src/random.js?v=303",
    "./src/types.js?v=303",
    "./src/story.js?v=303",
    "./src/foundry.js?v=303",
    "./src/world.js?v=303",
    "./src/deep-dungeons.js?v=303",
    "./src/scenes.js?v=303",
    "./src/arenas.js?v=303",
    "./src/items.js?v=303",
    "./src/combat.js?v=303",
    "./src/interactions.js?v=303",
    "./src/persistence.js?v=303",
    "./src/input.js?v=303",
    "./src/game.js?v=303",
    "./src/renderer.js?v=303",
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
