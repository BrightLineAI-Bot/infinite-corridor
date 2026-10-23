const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v369`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=369",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=369",
    "./src/proving-ground.js?v=369",
    "./src/proving-ground-fixtures.js?v=369",
    "./src/proving-ground-labs.js?v=369",
    "./src/dungeon-variation.js?v=369",
    "./src/dungeon-completion.js?v=369",
    "./src/enemy-patterns.js?v=369",
    "./src/monster-pack.js?v=369",
    "./src/monster-render.js?v=369",
    "./src/astral-worm.js?v=369",
    "./src/astral-worm-render.js?v=369",
    "./src/astral-worm-retreat.js?v=369",
    "./src/astral-worm-mount.js?v=369",
    "./src/lightning-giant-render.js?v=369",
    "./src/astral-encounters.js?v=369",
    "./src/astral-world-retreat.js?v=369",
    "./src/landscape.js?v=369",
    "./src/landscape-render.js?v=369",
    "./src/underlands.js?v=369",
    "./src/pattern-dungeons.js?v=369",
    "./src/relay-network.js?v=369",
    "./src/glyphs.js?v=369",
    "./src/echoes.js?v=369",
    "./src/constellation.js?v=369",
    "./src/water-traversal.js?v=369",
    "./src/open-sea.js?v=369",
    "./src/boats.js?v=369",
    "./src/sea-creatures.js?v=369",
    "./src/diving.js?v=369",
    "./src/grottoes.js?v=369",
    "./src/spell-slots.js?v=369",
    "./src/settlements.js?v=369",
    "./src/skirmishes.js?v=369",
    "./src/travelers.js?v=369",
    "./src/diagnostic-probe.js?v=369",
    "./src/questing-beast.js?v=369",
    "./src/recitations.js?v=369",
    "./src/lore.js?v=369",
    "./src/glimpses.js?v=369",
    "./src/glimpse-render.js?v=369",
    "./src/glimpse-paint.js?v=369",
    "./src/glimpse-scenes.js?v=369",
    "./src/glimpse-horror.js?v=369",
    "./src/glimpse-legend.js?v=369",
    "./src/glimpse-hand.js?v=369",
    "./src/atlas-view.js?v=369",
    "./src/strange.js?v=369",
    "./src/linked-dungeons.js?v=369",
    "./src/digging.js?v=369",
    "./src/building.js?v=369",
    "./src/refuge-lands.js?v=369",
    "./src/revenant-horde.js?v=369",
    "./src/stages.js?v=369",
    "./src/watcher.js?v=369",
    "./src/vehicle-gates.js?v=369",
    "./src/dungeon-ladder.js?v=369",
    "./src/potions.js?v=369",
    "./src/transit-lattice.js?v=369",
    "./src/late-spells.js?v=369",
    "./src/listener-mirror.js?v=369",
    "./src/tyrant-hunt.js?v=369",
    "./src/world-beasts.js?v=369",
    "./src/elders.js?v=369",
    "./src/far-array.js?v=369",
    "./src/combat-visuals.js?v=369",
    "./src/dungeon-framework.js?v=369",
    "./src/elites.js?v=369",
    "./src/random.js?v=369",
    "./src/types.js?v=369",
    "./src/story.js?v=369",
    "./src/foundry.js?v=369",
    "./src/world.js?v=369",
    "./src/deep-dungeons.js?v=369",
    "./src/scenes.js?v=369",
    "./src/arenas.js?v=369",
    "./src/items.js?v=369",
    "./src/combat.js?v=369",
    "./src/interactions.js?v=369",
    "./src/persistence.js?v=369",
    "./src/input.js?v=369",
    "./src/game.js?v=369",
    "./src/renderer.js?v=369",
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
