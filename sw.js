const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v617`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=617",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=617",
    "./src/proving-ground.js?v=617",
    "./src/proving-ground-fixtures.js?v=617",
    "./src/proving-ground-labs.js?v=617",
    "./src/dungeon-variation.js?v=617",
    "./src/dungeon-completion.js?v=617",
    "./src/enemy-patterns.js?v=617",
    "./src/monster-pack.js?v=617",
    "./src/monster-render.js?v=617",
    "./src/astral-worm.js?v=617",
    "./src/astral-worm-render.js?v=617",
    "./src/astral-worm-retreat.js?v=617",
    "./src/astral-worm-mount.js?v=617",
    "./src/lightning-giant-render.js?v=617",
    "./src/astral-encounters.js?v=617",
    "./src/astral-world-retreat.js?v=617",
    "./src/landscape.js?v=617",
    "./src/landscape-render.js?v=617",
    "./src/underlands.js?v=617",
    "./src/pattern-dungeons.js?v=617",
    "./src/relay-network.js?v=617",
    "./src/glyphs.js?v=617",
    "./src/echoes.js?v=617",
    "./src/constellation.js?v=617",
    "./src/water-traversal.js?v=617",
    "./src/open-sea.js?v=617",
    "./src/boats.js?v=617",
    "./src/sea-creatures.js?v=617",
    "./src/diving.js?v=617",
    "./src/grottoes.js?v=617",
    "./src/spell-slots.js?v=617",
    "./src/settlements.js?v=617",
    "./src/skirmishes.js?v=617",
    "./src/travelers.js?v=617",
    "./src/diagnostic-probe.js?v=617",
    "./src/questing-beast.js?v=617",
    "./src/recitations.js?v=617",
    "./src/lore.js?v=617",
    "./src/glimpses.js?v=617",
    "./src/glimpse-render.js?v=617",
    "./src/glimpse-paint.js?v=617",
    "./src/glimpse-scenes.js?v=617",
    "./src/glimpse-horror.js?v=617",
    "./src/glimpse-legend.js?v=617",
    "./src/glimpse-hand.js?v=617",
    "./src/atlas-view.js?v=617",
    "./src/strange.js?v=617",
    "./src/linked-dungeons.js?v=617",
    "./src/digging.js?v=617",
    "./src/building.js?v=617",
    "./src/refuge-lands.js?v=617",
    "./src/revenant-horde.js?v=617",
    "./src/stages.js?v=617",
    "./src/watcher.js?v=617",
    "./src/vehicle-gates.js?v=617",
    "./src/dungeon-ladder.js?v=617",
    "./src/potions.js?v=617",
    "./src/transit-lattice.js?v=617",
    "./src/late-spells.js?v=617",
    "./src/brawler-spells.js?v=617",
    "./src/orbit-volley.js?v=617",
    "./src/tool-forms.js?v=617",
    "./src/sling.js?v=617",
    "./src/atlas-colors.js?v=617",
    "./src/skylands.js?v=617",
    "./src/surveyor.js?v=617",
    "./src/torn-pages.js?v=617",
    "./src/lattice-fields.js?v=617",
    "./src/dungeon-traps.js?v=617",
    "./src/listener-mirror.js?v=617",
    "./src/hometowns.js?v=617",
    "./src/listener-arena.js?v=617",
    "./src/listener-morph.js?v=617",
    "./src/build-presets.js?v=617",
    "./src/smithy.js?v=617",
    "./src/ilse.js?v=617",
    "./src/bells.js?v=617",
    "./src/meals.js?v=617",
    "./src/margins.js?v=617",
    "./src/marginalia.js?v=617",
    "./src/tyrant-hunt.js?v=617",
    "./src/world-beasts.js?v=617",
    "./src/elders.js?v=617",
    "./src/far-array.js?v=617",
    "./src/combat-visuals.js?v=617",
    "./src/dungeon-framework.js?v=617",
    "./src/elites.js?v=617",
    "./src/random.js?v=617",
    "./src/types.js?v=617",
    "./src/story.js?v=617",
    "./src/foundry.js?v=617",
    "./src/world.js?v=617",
    "./src/deep-dungeons.js?v=617",
    "./src/scenes.js?v=617",
    "./src/arenas.js?v=617",
    "./src/items.js?v=617",
    "./src/combat.js?v=617",
    "./src/interactions.js?v=617",
    "./src/persistence.js?v=617",
    "./src/input.js?v=617",
    "./src/game.js?v=617",
    "./src/renderer.js?v=617",
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
