const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v551`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=551",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=551",
    "./src/proving-ground.js?v=551",
    "./src/proving-ground-fixtures.js?v=551",
    "./src/proving-ground-labs.js?v=551",
    "./src/dungeon-variation.js?v=551",
    "./src/dungeon-completion.js?v=551",
    "./src/enemy-patterns.js?v=551",
    "./src/monster-pack.js?v=551",
    "./src/monster-render.js?v=551",
    "./src/astral-worm.js?v=551",
    "./src/astral-worm-render.js?v=551",
    "./src/astral-worm-retreat.js?v=551",
    "./src/astral-worm-mount.js?v=551",
    "./src/lightning-giant-render.js?v=551",
    "./src/astral-encounters.js?v=551",
    "./src/astral-world-retreat.js?v=551",
    "./src/landscape.js?v=551",
    "./src/landscape-render.js?v=551",
    "./src/underlands.js?v=551",
    "./src/pattern-dungeons.js?v=551",
    "./src/relay-network.js?v=551",
    "./src/glyphs.js?v=551",
    "./src/echoes.js?v=551",
    "./src/constellation.js?v=551",
    "./src/water-traversal.js?v=551",
    "./src/open-sea.js?v=551",
    "./src/boats.js?v=551",
    "./src/sea-creatures.js?v=551",
    "./src/diving.js?v=551",
    "./src/grottoes.js?v=551",
    "./src/spell-slots.js?v=551",
    "./src/settlements.js?v=551",
    "./src/skirmishes.js?v=551",
    "./src/travelers.js?v=551",
    "./src/diagnostic-probe.js?v=551",
    "./src/questing-beast.js?v=551",
    "./src/recitations.js?v=551",
    "./src/lore.js?v=551",
    "./src/glimpses.js?v=551",
    "./src/glimpse-render.js?v=551",
    "./src/glimpse-paint.js?v=551",
    "./src/glimpse-scenes.js?v=551",
    "./src/glimpse-horror.js?v=551",
    "./src/glimpse-legend.js?v=551",
    "./src/glimpse-hand.js?v=551",
    "./src/atlas-view.js?v=551",
    "./src/strange.js?v=551",
    "./src/linked-dungeons.js?v=551",
    "./src/digging.js?v=551",
    "./src/building.js?v=551",
    "./src/refuge-lands.js?v=551",
    "./src/revenant-horde.js?v=551",
    "./src/stages.js?v=551",
    "./src/watcher.js?v=551",
    "./src/vehicle-gates.js?v=551",
    "./src/dungeon-ladder.js?v=551",
    "./src/potions.js?v=551",
    "./src/transit-lattice.js?v=551",
    "./src/late-spells.js?v=551",
    "./src/brawler-spells.js?v=551",
    "./src/orbit-volley.js?v=551",
    "./src/tool-forms.js?v=551",
    "./src/sling.js?v=551",
    "./src/surveyor.js?v=551",
    "./src/lattice-fields.js?v=551",
    "./src/dungeon-traps.js?v=551",
    "./src/listener-mirror.js?v=551",
    "./src/hometowns.js?v=551",
    "./src/listener-arena.js?v=551",
    "./src/listener-morph.js?v=551",
    "./src/build-presets.js?v=551",
    "./src/smithy.js?v=551",
    "./src/ilse.js?v=551",
    "./src/bells.js?v=551",
    "./src/meals.js?v=551",
    "./src/margins.js?v=551",
    "./src/marginalia.js?v=551",
    "./src/tyrant-hunt.js?v=551",
    "./src/world-beasts.js?v=551",
    "./src/elders.js?v=551",
    "./src/far-array.js?v=551",
    "./src/combat-visuals.js?v=551",
    "./src/dungeon-framework.js?v=551",
    "./src/elites.js?v=551",
    "./src/random.js?v=551",
    "./src/types.js?v=551",
    "./src/story.js?v=551",
    "./src/foundry.js?v=551",
    "./src/world.js?v=551",
    "./src/deep-dungeons.js?v=551",
    "./src/scenes.js?v=551",
    "./src/arenas.js?v=551",
    "./src/items.js?v=551",
    "./src/combat.js?v=551",
    "./src/interactions.js?v=551",
    "./src/persistence.js?v=551",
    "./src/input.js?v=551",
    "./src/game.js?v=551",
    "./src/renderer.js?v=551",
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
