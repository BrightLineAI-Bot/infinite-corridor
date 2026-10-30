const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v595`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=595",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=595",
    "./src/proving-ground.js?v=595",
    "./src/proving-ground-fixtures.js?v=595",
    "./src/proving-ground-labs.js?v=595",
    "./src/dungeon-variation.js?v=595",
    "./src/dungeon-completion.js?v=595",
    "./src/enemy-patterns.js?v=595",
    "./src/monster-pack.js?v=595",
    "./src/monster-render.js?v=595",
    "./src/astral-worm.js?v=595",
    "./src/astral-worm-render.js?v=595",
    "./src/astral-worm-retreat.js?v=595",
    "./src/astral-worm-mount.js?v=595",
    "./src/lightning-giant-render.js?v=595",
    "./src/astral-encounters.js?v=595",
    "./src/astral-world-retreat.js?v=595",
    "./src/landscape.js?v=595",
    "./src/landscape-render.js?v=595",
    "./src/underlands.js?v=595",
    "./src/pattern-dungeons.js?v=595",
    "./src/relay-network.js?v=595",
    "./src/glyphs.js?v=595",
    "./src/echoes.js?v=595",
    "./src/constellation.js?v=595",
    "./src/water-traversal.js?v=595",
    "./src/open-sea.js?v=595",
    "./src/boats.js?v=595",
    "./src/sea-creatures.js?v=595",
    "./src/diving.js?v=595",
    "./src/grottoes.js?v=595",
    "./src/spell-slots.js?v=595",
    "./src/settlements.js?v=595",
    "./src/skirmishes.js?v=595",
    "./src/travelers.js?v=595",
    "./src/diagnostic-probe.js?v=595",
    "./src/questing-beast.js?v=595",
    "./src/recitations.js?v=595",
    "./src/lore.js?v=595",
    "./src/glimpses.js?v=595",
    "./src/glimpse-render.js?v=595",
    "./src/glimpse-paint.js?v=595",
    "./src/glimpse-scenes.js?v=595",
    "./src/glimpse-horror.js?v=595",
    "./src/glimpse-legend.js?v=595",
    "./src/glimpse-hand.js?v=595",
    "./src/atlas-view.js?v=595",
    "./src/strange.js?v=595",
    "./src/linked-dungeons.js?v=595",
    "./src/digging.js?v=595",
    "./src/building.js?v=595",
    "./src/refuge-lands.js?v=595",
    "./src/revenant-horde.js?v=595",
    "./src/stages.js?v=595",
    "./src/watcher.js?v=595",
    "./src/vehicle-gates.js?v=595",
    "./src/dungeon-ladder.js?v=595",
    "./src/potions.js?v=595",
    "./src/transit-lattice.js?v=595",
    "./src/late-spells.js?v=595",
    "./src/brawler-spells.js?v=595",
    "./src/orbit-volley.js?v=595",
    "./src/tool-forms.js?v=595",
    "./src/sling.js?v=595",
    "./src/atlas-colors.js?v=595",
    "./src/skylands.js?v=595",
    "./src/surveyor.js?v=595",
    "./src/torn-pages.js?v=595",
    "./src/lattice-fields.js?v=595",
    "./src/dungeon-traps.js?v=595",
    "./src/listener-mirror.js?v=595",
    "./src/hometowns.js?v=595",
    "./src/listener-arena.js?v=595",
    "./src/listener-morph.js?v=595",
    "./src/build-presets.js?v=595",
    "./src/smithy.js?v=595",
    "./src/ilse.js?v=595",
    "./src/bells.js?v=595",
    "./src/meals.js?v=595",
    "./src/margins.js?v=595",
    "./src/marginalia.js?v=595",
    "./src/tyrant-hunt.js?v=595",
    "./src/world-beasts.js?v=595",
    "./src/elders.js?v=595",
    "./src/far-array.js?v=595",
    "./src/combat-visuals.js?v=595",
    "./src/dungeon-framework.js?v=595",
    "./src/elites.js?v=595",
    "./src/random.js?v=595",
    "./src/types.js?v=595",
    "./src/story.js?v=595",
    "./src/foundry.js?v=595",
    "./src/world.js?v=595",
    "./src/deep-dungeons.js?v=595",
    "./src/scenes.js?v=595",
    "./src/arenas.js?v=595",
    "./src/items.js?v=595",
    "./src/combat.js?v=595",
    "./src/interactions.js?v=595",
    "./src/persistence.js?v=595",
    "./src/input.js?v=595",
    "./src/game.js?v=595",
    "./src/renderer.js?v=595",
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
