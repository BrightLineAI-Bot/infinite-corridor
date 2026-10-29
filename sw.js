const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v565`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=565",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=565",
    "./src/proving-ground.js?v=565",
    "./src/proving-ground-fixtures.js?v=565",
    "./src/proving-ground-labs.js?v=565",
    "./src/dungeon-variation.js?v=565",
    "./src/dungeon-completion.js?v=565",
    "./src/enemy-patterns.js?v=565",
    "./src/monster-pack.js?v=565",
    "./src/monster-render.js?v=565",
    "./src/astral-worm.js?v=565",
    "./src/astral-worm-render.js?v=565",
    "./src/astral-worm-retreat.js?v=565",
    "./src/astral-worm-mount.js?v=565",
    "./src/lightning-giant-render.js?v=565",
    "./src/astral-encounters.js?v=565",
    "./src/astral-world-retreat.js?v=565",
    "./src/landscape.js?v=565",
    "./src/landscape-render.js?v=565",
    "./src/underlands.js?v=565",
    "./src/pattern-dungeons.js?v=565",
    "./src/relay-network.js?v=565",
    "./src/glyphs.js?v=565",
    "./src/echoes.js?v=565",
    "./src/constellation.js?v=565",
    "./src/water-traversal.js?v=565",
    "./src/open-sea.js?v=565",
    "./src/boats.js?v=565",
    "./src/sea-creatures.js?v=565",
    "./src/diving.js?v=565",
    "./src/grottoes.js?v=565",
    "./src/spell-slots.js?v=565",
    "./src/settlements.js?v=565",
    "./src/skirmishes.js?v=565",
    "./src/travelers.js?v=565",
    "./src/diagnostic-probe.js?v=565",
    "./src/questing-beast.js?v=565",
    "./src/recitations.js?v=565",
    "./src/lore.js?v=565",
    "./src/glimpses.js?v=565",
    "./src/glimpse-render.js?v=565",
    "./src/glimpse-paint.js?v=565",
    "./src/glimpse-scenes.js?v=565",
    "./src/glimpse-horror.js?v=565",
    "./src/glimpse-legend.js?v=565",
    "./src/glimpse-hand.js?v=565",
    "./src/atlas-view.js?v=565",
    "./src/strange.js?v=565",
    "./src/linked-dungeons.js?v=565",
    "./src/digging.js?v=565",
    "./src/building.js?v=565",
    "./src/refuge-lands.js?v=565",
    "./src/revenant-horde.js?v=565",
    "./src/stages.js?v=565",
    "./src/watcher.js?v=565",
    "./src/vehicle-gates.js?v=565",
    "./src/dungeon-ladder.js?v=565",
    "./src/potions.js?v=565",
    "./src/transit-lattice.js?v=565",
    "./src/late-spells.js?v=565",
    "./src/brawler-spells.js?v=565",
    "./src/orbit-volley.js?v=565",
    "./src/tool-forms.js?v=565",
    "./src/sling.js?v=565",
    "./src/atlas-colors.js?v=565",
    "./src/surveyor.js?v=565",
    "./src/lattice-fields.js?v=565",
    "./src/dungeon-traps.js?v=565",
    "./src/listener-mirror.js?v=565",
    "./src/hometowns.js?v=565",
    "./src/listener-arena.js?v=565",
    "./src/listener-morph.js?v=565",
    "./src/build-presets.js?v=565",
    "./src/smithy.js?v=565",
    "./src/ilse.js?v=565",
    "./src/bells.js?v=565",
    "./src/meals.js?v=565",
    "./src/margins.js?v=565",
    "./src/marginalia.js?v=565",
    "./src/tyrant-hunt.js?v=565",
    "./src/world-beasts.js?v=565",
    "./src/elders.js?v=565",
    "./src/far-array.js?v=565",
    "./src/combat-visuals.js?v=565",
    "./src/dungeon-framework.js?v=565",
    "./src/elites.js?v=565",
    "./src/random.js?v=565",
    "./src/types.js?v=565",
    "./src/story.js?v=565",
    "./src/foundry.js?v=565",
    "./src/world.js?v=565",
    "./src/deep-dungeons.js?v=565",
    "./src/scenes.js?v=565",
    "./src/arenas.js?v=565",
    "./src/items.js?v=565",
    "./src/combat.js?v=565",
    "./src/interactions.js?v=565",
    "./src/persistence.js?v=565",
    "./src/input.js?v=565",
    "./src/game.js?v=565",
    "./src/renderer.js?v=565",
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
