const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v533`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=533",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=533",
    "./src/proving-ground.js?v=533",
    "./src/proving-ground-fixtures.js?v=533",
    "./src/proving-ground-labs.js?v=533",
    "./src/dungeon-variation.js?v=533",
    "./src/dungeon-completion.js?v=533",
    "./src/enemy-patterns.js?v=533",
    "./src/monster-pack.js?v=533",
    "./src/monster-render.js?v=533",
    "./src/astral-worm.js?v=533",
    "./src/astral-worm-render.js?v=533",
    "./src/astral-worm-retreat.js?v=533",
    "./src/astral-worm-mount.js?v=533",
    "./src/lightning-giant-render.js?v=533",
    "./src/astral-encounters.js?v=533",
    "./src/astral-world-retreat.js?v=533",
    "./src/landscape.js?v=533",
    "./src/landscape-render.js?v=533",
    "./src/underlands.js?v=533",
    "./src/pattern-dungeons.js?v=533",
    "./src/relay-network.js?v=533",
    "./src/glyphs.js?v=533",
    "./src/echoes.js?v=533",
    "./src/constellation.js?v=533",
    "./src/water-traversal.js?v=533",
    "./src/open-sea.js?v=533",
    "./src/boats.js?v=533",
    "./src/sea-creatures.js?v=533",
    "./src/diving.js?v=533",
    "./src/grottoes.js?v=533",
    "./src/spell-slots.js?v=533",
    "./src/settlements.js?v=533",
    "./src/skirmishes.js?v=533",
    "./src/travelers.js?v=533",
    "./src/diagnostic-probe.js?v=533",
    "./src/questing-beast.js?v=533",
    "./src/recitations.js?v=533",
    "./src/lore.js?v=533",
    "./src/glimpses.js?v=533",
    "./src/glimpse-render.js?v=533",
    "./src/glimpse-paint.js?v=533",
    "./src/glimpse-scenes.js?v=533",
    "./src/glimpse-horror.js?v=533",
    "./src/glimpse-legend.js?v=533",
    "./src/glimpse-hand.js?v=533",
    "./src/atlas-view.js?v=533",
    "./src/strange.js?v=533",
    "./src/linked-dungeons.js?v=533",
    "./src/digging.js?v=533",
    "./src/building.js?v=533",
    "./src/refuge-lands.js?v=533",
    "./src/revenant-horde.js?v=533",
    "./src/stages.js?v=533",
    "./src/watcher.js?v=533",
    "./src/vehicle-gates.js?v=533",
    "./src/dungeon-ladder.js?v=533",
    "./src/potions.js?v=533",
    "./src/transit-lattice.js?v=533",
    "./src/late-spells.js?v=533",
    "./src/brawler-spells.js?v=533",
    "./src/orbit-volley.js?v=533",
    "./src/tool-forms.js?v=533",
    "./src/surveyor.js?v=533",
    "./src/lattice-fields.js?v=533",
    "./src/dungeon-traps.js?v=533",
    "./src/listener-mirror.js?v=533",
    "./src/hometowns.js?v=533",
    "./src/listener-arena.js?v=533",
    "./src/listener-morph.js?v=533",
    "./src/build-presets.js?v=533",
    "./src/smithy.js?v=533",
    "./src/ilse.js?v=533",
    "./src/bells.js?v=533",
    "./src/meals.js?v=533",
    "./src/margins.js?v=533",
    "./src/marginalia.js?v=533",
    "./src/tyrant-hunt.js?v=533",
    "./src/world-beasts.js?v=533",
    "./src/elders.js?v=533",
    "./src/far-array.js?v=533",
    "./src/combat-visuals.js?v=533",
    "./src/dungeon-framework.js?v=533",
    "./src/elites.js?v=533",
    "./src/random.js?v=533",
    "./src/types.js?v=533",
    "./src/story.js?v=533",
    "./src/foundry.js?v=533",
    "./src/world.js?v=533",
    "./src/deep-dungeons.js?v=533",
    "./src/scenes.js?v=533",
    "./src/arenas.js?v=533",
    "./src/items.js?v=533",
    "./src/combat.js?v=533",
    "./src/interactions.js?v=533",
    "./src/persistence.js?v=533",
    "./src/input.js?v=533",
    "./src/game.js?v=533",
    "./src/renderer.js?v=533",
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
