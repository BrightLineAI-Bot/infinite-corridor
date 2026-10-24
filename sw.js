const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r421-45929eb37a4e`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r421-45929eb37a4e",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r421-45929eb37a4e",
    "./src/proving-ground.js?v=r421-45929eb37a4e",
    "./src/proving-ground-fixtures.js?v=r421-45929eb37a4e",
    "./src/proving-ground-labs.js?v=r421-45929eb37a4e",
    "./src/dungeon-variation.js?v=r421-45929eb37a4e",
    "./src/dungeon-completion.js?v=r421-45929eb37a4e",
    "./src/enemy-patterns.js?v=r421-45929eb37a4e",
    "./src/monster-pack.js?v=r421-45929eb37a4e",
    "./src/monster-render.js?v=r421-45929eb37a4e",
    "./src/astral-worm.js?v=r421-45929eb37a4e",
    "./src/astral-worm-render.js?v=r421-45929eb37a4e",
    "./src/astral-worm-retreat.js?v=r421-45929eb37a4e",
    "./src/astral-worm-mount.js?v=r421-45929eb37a4e",
    "./src/lightning-giant-render.js?v=r421-45929eb37a4e",
    "./src/astral-encounters.js?v=r421-45929eb37a4e",
    "./src/astral-world-retreat.js?v=r421-45929eb37a4e",
    "./src/landscape.js?v=r421-45929eb37a4e",
    "./src/landscape-render.js?v=r421-45929eb37a4e",
    "./src/underlands.js?v=r421-45929eb37a4e",
    "./src/pattern-dungeons.js?v=r421-45929eb37a4e",
    "./src/relay-network.js?v=r421-45929eb37a4e",
    "./src/glyphs.js?v=r421-45929eb37a4e",
    "./src/echoes.js?v=r421-45929eb37a4e",
    "./src/constellation.js?v=r421-45929eb37a4e",
    "./src/water-traversal.js?v=r421-45929eb37a4e",
    "./src/open-sea.js?v=r421-45929eb37a4e",
    "./src/boats.js?v=r421-45929eb37a4e",
    "./src/sea-creatures.js?v=r421-45929eb37a4e",
    "./src/diving.js?v=r421-45929eb37a4e",
    "./src/grottoes.js?v=r421-45929eb37a4e",
    "./src/spell-slots.js?v=r421-45929eb37a4e",
    "./src/settlements.js?v=r421-45929eb37a4e",
    "./src/skirmishes.js?v=r421-45929eb37a4e",
    "./src/travelers.js?v=r421-45929eb37a4e",
    "./src/diagnostic-probe.js?v=r421-45929eb37a4e",
    "./src/questing-beast.js?v=r421-45929eb37a4e",
    "./src/recitations.js?v=r421-45929eb37a4e",
    "./src/lore.js?v=r421-45929eb37a4e",
    "./src/glimpses.js?v=r421-45929eb37a4e",
    "./src/glimpse-render.js?v=r421-45929eb37a4e",
    "./src/glimpse-paint.js?v=r421-45929eb37a4e",
    "./src/glimpse-scenes.js?v=r421-45929eb37a4e",
    "./src/glimpse-horror.js?v=r421-45929eb37a4e",
    "./src/glimpse-legend.js?v=r421-45929eb37a4e",
    "./src/glimpse-hand.js?v=r421-45929eb37a4e",
    "./src/atlas-view.js?v=r421-45929eb37a4e",
    "./src/strange.js?v=r421-45929eb37a4e",
    "./src/linked-dungeons.js?v=r421-45929eb37a4e",
    "./src/digging.js?v=r421-45929eb37a4e",
    "./src/building.js?v=r421-45929eb37a4e",
    "./src/refuge-lands.js?v=r421-45929eb37a4e",
    "./src/revenant-horde.js?v=r421-45929eb37a4e",
    "./src/stages.js?v=r421-45929eb37a4e",
    "./src/watcher.js?v=r421-45929eb37a4e",
    "./src/vehicle-gates.js?v=r421-45929eb37a4e",
    "./src/dungeon-ladder.js?v=r421-45929eb37a4e",
    "./src/potions.js?v=r421-45929eb37a4e",
    "./src/transit-lattice.js?v=r421-45929eb37a4e",
    "./src/late-spells.js?v=r421-45929eb37a4e",
    "./src/listener-mirror.js?v=r421-45929eb37a4e",
    "./src/hometowns.js?v=r421-45929eb37a4e",
    "./src/listener-arena.js?v=r421-45929eb37a4e",
    "./src/listener-morph.js?v=r421-45929eb37a4e",
    "./src/build-presets.js?v=r421-45929eb37a4e",
    "./src/smithy.js?v=r421-45929eb37a4e",
    "./src/ilse.js?v=r421-45929eb37a4e",
    "./src/tyrant-hunt.js?v=r421-45929eb37a4e",
    "./src/world-beasts.js?v=r421-45929eb37a4e",
    "./src/elders.js?v=r421-45929eb37a4e",
    "./src/far-array.js?v=r421-45929eb37a4e",
    "./src/combat-visuals.js?v=r421-45929eb37a4e",
    "./src/dungeon-framework.js?v=r421-45929eb37a4e",
    "./src/elites.js?v=r421-45929eb37a4e",
    "./src/random.js?v=r421-45929eb37a4e",
    "./src/types.js?v=r421-45929eb37a4e",
    "./src/story.js?v=r421-45929eb37a4e",
    "./src/foundry.js?v=r421-45929eb37a4e",
    "./src/world.js?v=r421-45929eb37a4e",
    "./src/deep-dungeons.js?v=r421-45929eb37a4e",
    "./src/scenes.js?v=r421-45929eb37a4e",
    "./src/arenas.js?v=r421-45929eb37a4e",
    "./src/items.js?v=r421-45929eb37a4e",
    "./src/combat.js?v=r421-45929eb37a4e",
    "./src/interactions.js?v=r421-45929eb37a4e",
    "./src/persistence.js?v=r421-45929eb37a4e",
    "./src/input.js?v=r421-45929eb37a4e",
    "./src/game.js?v=r421-45929eb37a4e",
    "./src/renderer.js?v=r421-45929eb37a4e",
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
