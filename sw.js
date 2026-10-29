const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v567`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=567",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=567",
    "./src/proving-ground.js?v=567",
    "./src/proving-ground-fixtures.js?v=567",
    "./src/proving-ground-labs.js?v=567",
    "./src/dungeon-variation.js?v=567",
    "./src/dungeon-completion.js?v=567",
    "./src/enemy-patterns.js?v=567",
    "./src/monster-pack.js?v=567",
    "./src/monster-render.js?v=567",
    "./src/astral-worm.js?v=567",
    "./src/astral-worm-render.js?v=567",
    "./src/astral-worm-retreat.js?v=567",
    "./src/astral-worm-mount.js?v=567",
    "./src/lightning-giant-render.js?v=567",
    "./src/astral-encounters.js?v=567",
    "./src/astral-world-retreat.js?v=567",
    "./src/landscape.js?v=567",
    "./src/landscape-render.js?v=567",
    "./src/underlands.js?v=567",
    "./src/pattern-dungeons.js?v=567",
    "./src/relay-network.js?v=567",
    "./src/glyphs.js?v=567",
    "./src/echoes.js?v=567",
    "./src/constellation.js?v=567",
    "./src/water-traversal.js?v=567",
    "./src/open-sea.js?v=567",
    "./src/boats.js?v=567",
    "./src/sea-creatures.js?v=567",
    "./src/diving.js?v=567",
    "./src/grottoes.js?v=567",
    "./src/spell-slots.js?v=567",
    "./src/settlements.js?v=567",
    "./src/skirmishes.js?v=567",
    "./src/travelers.js?v=567",
    "./src/diagnostic-probe.js?v=567",
    "./src/questing-beast.js?v=567",
    "./src/recitations.js?v=567",
    "./src/lore.js?v=567",
    "./src/glimpses.js?v=567",
    "./src/glimpse-render.js?v=567",
    "./src/glimpse-paint.js?v=567",
    "./src/glimpse-scenes.js?v=567",
    "./src/glimpse-horror.js?v=567",
    "./src/glimpse-legend.js?v=567",
    "./src/glimpse-hand.js?v=567",
    "./src/atlas-view.js?v=567",
    "./src/strange.js?v=567",
    "./src/linked-dungeons.js?v=567",
    "./src/digging.js?v=567",
    "./src/building.js?v=567",
    "./src/refuge-lands.js?v=567",
    "./src/revenant-horde.js?v=567",
    "./src/stages.js?v=567",
    "./src/watcher.js?v=567",
    "./src/vehicle-gates.js?v=567",
    "./src/dungeon-ladder.js?v=567",
    "./src/potions.js?v=567",
    "./src/transit-lattice.js?v=567",
    "./src/late-spells.js?v=567",
    "./src/brawler-spells.js?v=567",
    "./src/orbit-volley.js?v=567",
    "./src/tool-forms.js?v=567",
    "./src/sling.js?v=567",
    "./src/atlas-colors.js?v=567",
    "./src/surveyor.js?v=567",
    "./src/lattice-fields.js?v=567",
    "./src/dungeon-traps.js?v=567",
    "./src/listener-mirror.js?v=567",
    "./src/hometowns.js?v=567",
    "./src/listener-arena.js?v=567",
    "./src/listener-morph.js?v=567",
    "./src/build-presets.js?v=567",
    "./src/smithy.js?v=567",
    "./src/ilse.js?v=567",
    "./src/bells.js?v=567",
    "./src/meals.js?v=567",
    "./src/margins.js?v=567",
    "./src/marginalia.js?v=567",
    "./src/tyrant-hunt.js?v=567",
    "./src/world-beasts.js?v=567",
    "./src/elders.js?v=567",
    "./src/far-array.js?v=567",
    "./src/combat-visuals.js?v=567",
    "./src/dungeon-framework.js?v=567",
    "./src/elites.js?v=567",
    "./src/random.js?v=567",
    "./src/types.js?v=567",
    "./src/story.js?v=567",
    "./src/foundry.js?v=567",
    "./src/world.js?v=567",
    "./src/deep-dungeons.js?v=567",
    "./src/scenes.js?v=567",
    "./src/arenas.js?v=567",
    "./src/items.js?v=567",
    "./src/combat.js?v=567",
    "./src/interactions.js?v=567",
    "./src/persistence.js?v=567",
    "./src/input.js?v=567",
    "./src/game.js?v=567",
    "./src/renderer.js?v=567",
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
