const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r537-da8aeff88eba`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r537-da8aeff88eba",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r537-da8aeff88eba",
    "./src/proving-ground.js?v=r537-da8aeff88eba",
    "./src/proving-ground-fixtures.js?v=r537-da8aeff88eba",
    "./src/proving-ground-labs.js?v=r537-da8aeff88eba",
    "./src/dungeon-variation.js?v=r537-da8aeff88eba",
    "./src/dungeon-completion.js?v=r537-da8aeff88eba",
    "./src/enemy-patterns.js?v=r537-da8aeff88eba",
    "./src/monster-pack.js?v=r537-da8aeff88eba",
    "./src/monster-render.js?v=r537-da8aeff88eba",
    "./src/astral-worm.js?v=r537-da8aeff88eba",
    "./src/astral-worm-render.js?v=r537-da8aeff88eba",
    "./src/astral-worm-retreat.js?v=r537-da8aeff88eba",
    "./src/astral-worm-mount.js?v=r537-da8aeff88eba",
    "./src/lightning-giant-render.js?v=r537-da8aeff88eba",
    "./src/astral-encounters.js?v=r537-da8aeff88eba",
    "./src/astral-world-retreat.js?v=r537-da8aeff88eba",
    "./src/landscape.js?v=r537-da8aeff88eba",
    "./src/landscape-render.js?v=r537-da8aeff88eba",
    "./src/underlands.js?v=r537-da8aeff88eba",
    "./src/pattern-dungeons.js?v=r537-da8aeff88eba",
    "./src/relay-network.js?v=r537-da8aeff88eba",
    "./src/glyphs.js?v=r537-da8aeff88eba",
    "./src/echoes.js?v=r537-da8aeff88eba",
    "./src/constellation.js?v=r537-da8aeff88eba",
    "./src/water-traversal.js?v=r537-da8aeff88eba",
    "./src/open-sea.js?v=r537-da8aeff88eba",
    "./src/boats.js?v=r537-da8aeff88eba",
    "./src/sea-creatures.js?v=r537-da8aeff88eba",
    "./src/diving.js?v=r537-da8aeff88eba",
    "./src/grottoes.js?v=r537-da8aeff88eba",
    "./src/spell-slots.js?v=r537-da8aeff88eba",
    "./src/settlements.js?v=r537-da8aeff88eba",
    "./src/skirmishes.js?v=r537-da8aeff88eba",
    "./src/travelers.js?v=r537-da8aeff88eba",
    "./src/diagnostic-probe.js?v=r537-da8aeff88eba",
    "./src/questing-beast.js?v=r537-da8aeff88eba",
    "./src/recitations.js?v=r537-da8aeff88eba",
    "./src/lore.js?v=r537-da8aeff88eba",
    "./src/glimpses.js?v=r537-da8aeff88eba",
    "./src/glimpse-render.js?v=r537-da8aeff88eba",
    "./src/glimpse-paint.js?v=r537-da8aeff88eba",
    "./src/glimpse-scenes.js?v=r537-da8aeff88eba",
    "./src/glimpse-horror.js?v=r537-da8aeff88eba",
    "./src/glimpse-legend.js?v=r537-da8aeff88eba",
    "./src/glimpse-hand.js?v=r537-da8aeff88eba",
    "./src/atlas-view.js?v=r537-da8aeff88eba",
    "./src/strange.js?v=r537-da8aeff88eba",
    "./src/linked-dungeons.js?v=r537-da8aeff88eba",
    "./src/digging.js?v=r537-da8aeff88eba",
    "./src/building.js?v=r537-da8aeff88eba",
    "./src/refuge-lands.js?v=r537-da8aeff88eba",
    "./src/revenant-horde.js?v=r537-da8aeff88eba",
    "./src/stages.js?v=r537-da8aeff88eba",
    "./src/watcher.js?v=r537-da8aeff88eba",
    "./src/vehicle-gates.js?v=r537-da8aeff88eba",
    "./src/dungeon-ladder.js?v=r537-da8aeff88eba",
    "./src/potions.js?v=r537-da8aeff88eba",
    "./src/transit-lattice.js?v=r537-da8aeff88eba",
    "./src/late-spells.js?v=r537-da8aeff88eba",
    "./src/brawler-spells.js?v=r537-da8aeff88eba",
    "./src/orbit-volley.js?v=r537-da8aeff88eba",
    "./src/tool-forms.js?v=r537-da8aeff88eba",
    "./src/surveyor.js?v=r537-da8aeff88eba",
    "./src/lattice-fields.js?v=r537-da8aeff88eba",
    "./src/dungeon-traps.js?v=r537-da8aeff88eba",
    "./src/listener-mirror.js?v=r537-da8aeff88eba",
    "./src/hometowns.js?v=r537-da8aeff88eba",
    "./src/listener-arena.js?v=r537-da8aeff88eba",
    "./src/listener-morph.js?v=r537-da8aeff88eba",
    "./src/build-presets.js?v=r537-da8aeff88eba",
    "./src/smithy.js?v=r537-da8aeff88eba",
    "./src/ilse.js?v=r537-da8aeff88eba",
    "./src/bells.js?v=r537-da8aeff88eba",
    "./src/meals.js?v=r537-da8aeff88eba",
    "./src/margins.js?v=r537-da8aeff88eba",
    "./src/marginalia.js?v=r537-da8aeff88eba",
    "./src/tyrant-hunt.js?v=r537-da8aeff88eba",
    "./src/world-beasts.js?v=r537-da8aeff88eba",
    "./src/elders.js?v=r537-da8aeff88eba",
    "./src/far-array.js?v=r537-da8aeff88eba",
    "./src/combat-visuals.js?v=r537-da8aeff88eba",
    "./src/dungeon-framework.js?v=r537-da8aeff88eba",
    "./src/elites.js?v=r537-da8aeff88eba",
    "./src/random.js?v=r537-da8aeff88eba",
    "./src/types.js?v=r537-da8aeff88eba",
    "./src/story.js?v=r537-da8aeff88eba",
    "./src/foundry.js?v=r537-da8aeff88eba",
    "./src/world.js?v=r537-da8aeff88eba",
    "./src/deep-dungeons.js?v=r537-da8aeff88eba",
    "./src/scenes.js?v=r537-da8aeff88eba",
    "./src/arenas.js?v=r537-da8aeff88eba",
    "./src/items.js?v=r537-da8aeff88eba",
    "./src/combat.js?v=r537-da8aeff88eba",
    "./src/interactions.js?v=r537-da8aeff88eba",
    "./src/persistence.js?v=r537-da8aeff88eba",
    "./src/input.js?v=r537-da8aeff88eba",
    "./src/game.js?v=r537-da8aeff88eba",
    "./src/renderer.js?v=r537-da8aeff88eba",
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
