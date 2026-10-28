const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v535`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=535",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=535",
    "./src/proving-ground.js?v=535",
    "./src/proving-ground-fixtures.js?v=535",
    "./src/proving-ground-labs.js?v=535",
    "./src/dungeon-variation.js?v=535",
    "./src/dungeon-completion.js?v=535",
    "./src/enemy-patterns.js?v=535",
    "./src/monster-pack.js?v=535",
    "./src/monster-render.js?v=535",
    "./src/astral-worm.js?v=535",
    "./src/astral-worm-render.js?v=535",
    "./src/astral-worm-retreat.js?v=535",
    "./src/astral-worm-mount.js?v=535",
    "./src/lightning-giant-render.js?v=535",
    "./src/astral-encounters.js?v=535",
    "./src/astral-world-retreat.js?v=535",
    "./src/landscape.js?v=535",
    "./src/landscape-render.js?v=535",
    "./src/underlands.js?v=535",
    "./src/pattern-dungeons.js?v=535",
    "./src/relay-network.js?v=535",
    "./src/glyphs.js?v=535",
    "./src/echoes.js?v=535",
    "./src/constellation.js?v=535",
    "./src/water-traversal.js?v=535",
    "./src/open-sea.js?v=535",
    "./src/boats.js?v=535",
    "./src/sea-creatures.js?v=535",
    "./src/diving.js?v=535",
    "./src/grottoes.js?v=535",
    "./src/spell-slots.js?v=535",
    "./src/settlements.js?v=535",
    "./src/skirmishes.js?v=535",
    "./src/travelers.js?v=535",
    "./src/diagnostic-probe.js?v=535",
    "./src/questing-beast.js?v=535",
    "./src/recitations.js?v=535",
    "./src/lore.js?v=535",
    "./src/glimpses.js?v=535",
    "./src/glimpse-render.js?v=535",
    "./src/glimpse-paint.js?v=535",
    "./src/glimpse-scenes.js?v=535",
    "./src/glimpse-horror.js?v=535",
    "./src/glimpse-legend.js?v=535",
    "./src/glimpse-hand.js?v=535",
    "./src/atlas-view.js?v=535",
    "./src/strange.js?v=535",
    "./src/linked-dungeons.js?v=535",
    "./src/digging.js?v=535",
    "./src/building.js?v=535",
    "./src/refuge-lands.js?v=535",
    "./src/revenant-horde.js?v=535",
    "./src/stages.js?v=535",
    "./src/watcher.js?v=535",
    "./src/vehicle-gates.js?v=535",
    "./src/dungeon-ladder.js?v=535",
    "./src/potions.js?v=535",
    "./src/transit-lattice.js?v=535",
    "./src/late-spells.js?v=535",
    "./src/brawler-spells.js?v=535",
    "./src/orbit-volley.js?v=535",
    "./src/tool-forms.js?v=535",
    "./src/surveyor.js?v=535",
    "./src/lattice-fields.js?v=535",
    "./src/dungeon-traps.js?v=535",
    "./src/listener-mirror.js?v=535",
    "./src/hometowns.js?v=535",
    "./src/listener-arena.js?v=535",
    "./src/listener-morph.js?v=535",
    "./src/build-presets.js?v=535",
    "./src/smithy.js?v=535",
    "./src/ilse.js?v=535",
    "./src/bells.js?v=535",
    "./src/meals.js?v=535",
    "./src/margins.js?v=535",
    "./src/marginalia.js?v=535",
    "./src/tyrant-hunt.js?v=535",
    "./src/world-beasts.js?v=535",
    "./src/elders.js?v=535",
    "./src/far-array.js?v=535",
    "./src/combat-visuals.js?v=535",
    "./src/dungeon-framework.js?v=535",
    "./src/elites.js?v=535",
    "./src/random.js?v=535",
    "./src/types.js?v=535",
    "./src/story.js?v=535",
    "./src/foundry.js?v=535",
    "./src/world.js?v=535",
    "./src/deep-dungeons.js?v=535",
    "./src/scenes.js?v=535",
    "./src/arenas.js?v=535",
    "./src/items.js?v=535",
    "./src/combat.js?v=535",
    "./src/interactions.js?v=535",
    "./src/persistence.js?v=535",
    "./src/input.js?v=535",
    "./src/game.js?v=535",
    "./src/renderer.js?v=535",
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
