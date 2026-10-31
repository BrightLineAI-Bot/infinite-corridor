const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v615`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=615",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=615",
    "./src/proving-ground.js?v=615",
    "./src/proving-ground-fixtures.js?v=615",
    "./src/proving-ground-labs.js?v=615",
    "./src/dungeon-variation.js?v=615",
    "./src/dungeon-completion.js?v=615",
    "./src/enemy-patterns.js?v=615",
    "./src/monster-pack.js?v=615",
    "./src/monster-render.js?v=615",
    "./src/astral-worm.js?v=615",
    "./src/astral-worm-render.js?v=615",
    "./src/astral-worm-retreat.js?v=615",
    "./src/astral-worm-mount.js?v=615",
    "./src/lightning-giant-render.js?v=615",
    "./src/astral-encounters.js?v=615",
    "./src/astral-world-retreat.js?v=615",
    "./src/landscape.js?v=615",
    "./src/landscape-render.js?v=615",
    "./src/underlands.js?v=615",
    "./src/pattern-dungeons.js?v=615",
    "./src/relay-network.js?v=615",
    "./src/glyphs.js?v=615",
    "./src/echoes.js?v=615",
    "./src/constellation.js?v=615",
    "./src/water-traversal.js?v=615",
    "./src/open-sea.js?v=615",
    "./src/boats.js?v=615",
    "./src/sea-creatures.js?v=615",
    "./src/diving.js?v=615",
    "./src/grottoes.js?v=615",
    "./src/spell-slots.js?v=615",
    "./src/settlements.js?v=615",
    "./src/skirmishes.js?v=615",
    "./src/travelers.js?v=615",
    "./src/diagnostic-probe.js?v=615",
    "./src/questing-beast.js?v=615",
    "./src/recitations.js?v=615",
    "./src/lore.js?v=615",
    "./src/glimpses.js?v=615",
    "./src/glimpse-render.js?v=615",
    "./src/glimpse-paint.js?v=615",
    "./src/glimpse-scenes.js?v=615",
    "./src/glimpse-horror.js?v=615",
    "./src/glimpse-legend.js?v=615",
    "./src/glimpse-hand.js?v=615",
    "./src/atlas-view.js?v=615",
    "./src/strange.js?v=615",
    "./src/linked-dungeons.js?v=615",
    "./src/digging.js?v=615",
    "./src/building.js?v=615",
    "./src/refuge-lands.js?v=615",
    "./src/revenant-horde.js?v=615",
    "./src/stages.js?v=615",
    "./src/watcher.js?v=615",
    "./src/vehicle-gates.js?v=615",
    "./src/dungeon-ladder.js?v=615",
    "./src/potions.js?v=615",
    "./src/transit-lattice.js?v=615",
    "./src/late-spells.js?v=615",
    "./src/brawler-spells.js?v=615",
    "./src/orbit-volley.js?v=615",
    "./src/tool-forms.js?v=615",
    "./src/sling.js?v=615",
    "./src/atlas-colors.js?v=615",
    "./src/skylands.js?v=615",
    "./src/surveyor.js?v=615",
    "./src/torn-pages.js?v=615",
    "./src/lattice-fields.js?v=615",
    "./src/dungeon-traps.js?v=615",
    "./src/listener-mirror.js?v=615",
    "./src/hometowns.js?v=615",
    "./src/listener-arena.js?v=615",
    "./src/listener-morph.js?v=615",
    "./src/build-presets.js?v=615",
    "./src/smithy.js?v=615",
    "./src/ilse.js?v=615",
    "./src/bells.js?v=615",
    "./src/meals.js?v=615",
    "./src/margins.js?v=615",
    "./src/marginalia.js?v=615",
    "./src/tyrant-hunt.js?v=615",
    "./src/world-beasts.js?v=615",
    "./src/elders.js?v=615",
    "./src/far-array.js?v=615",
    "./src/combat-visuals.js?v=615",
    "./src/dungeon-framework.js?v=615",
    "./src/elites.js?v=615",
    "./src/random.js?v=615",
    "./src/types.js?v=615",
    "./src/story.js?v=615",
    "./src/foundry.js?v=615",
    "./src/world.js?v=615",
    "./src/deep-dungeons.js?v=615",
    "./src/scenes.js?v=615",
    "./src/arenas.js?v=615",
    "./src/items.js?v=615",
    "./src/combat.js?v=615",
    "./src/interactions.js?v=615",
    "./src/persistence.js?v=615",
    "./src/input.js?v=615",
    "./src/game.js?v=615",
    "./src/renderer.js?v=615",
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
