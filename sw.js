const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r597-fb99c6531765`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r597-fb99c6531765",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r597-fb99c6531765",
    "./src/proving-ground.js?v=r597-fb99c6531765",
    "./src/proving-ground-fixtures.js?v=r597-fb99c6531765",
    "./src/proving-ground-labs.js?v=r597-fb99c6531765",
    "./src/dungeon-variation.js?v=r597-fb99c6531765",
    "./src/dungeon-completion.js?v=r597-fb99c6531765",
    "./src/enemy-patterns.js?v=r597-fb99c6531765",
    "./src/monster-pack.js?v=r597-fb99c6531765",
    "./src/monster-render.js?v=r597-fb99c6531765",
    "./src/astral-worm.js?v=r597-fb99c6531765",
    "./src/astral-worm-render.js?v=r597-fb99c6531765",
    "./src/astral-worm-retreat.js?v=r597-fb99c6531765",
    "./src/astral-worm-mount.js?v=r597-fb99c6531765",
    "./src/lightning-giant-render.js?v=r597-fb99c6531765",
    "./src/astral-encounters.js?v=r597-fb99c6531765",
    "./src/astral-world-retreat.js?v=r597-fb99c6531765",
    "./src/landscape.js?v=r597-fb99c6531765",
    "./src/landscape-render.js?v=r597-fb99c6531765",
    "./src/underlands.js?v=r597-fb99c6531765",
    "./src/pattern-dungeons.js?v=r597-fb99c6531765",
    "./src/relay-network.js?v=r597-fb99c6531765",
    "./src/glyphs.js?v=r597-fb99c6531765",
    "./src/echoes.js?v=r597-fb99c6531765",
    "./src/constellation.js?v=r597-fb99c6531765",
    "./src/water-traversal.js?v=r597-fb99c6531765",
    "./src/open-sea.js?v=r597-fb99c6531765",
    "./src/boats.js?v=r597-fb99c6531765",
    "./src/sea-creatures.js?v=r597-fb99c6531765",
    "./src/diving.js?v=r597-fb99c6531765",
    "./src/grottoes.js?v=r597-fb99c6531765",
    "./src/spell-slots.js?v=r597-fb99c6531765",
    "./src/settlements.js?v=r597-fb99c6531765",
    "./src/skirmishes.js?v=r597-fb99c6531765",
    "./src/travelers.js?v=r597-fb99c6531765",
    "./src/diagnostic-probe.js?v=r597-fb99c6531765",
    "./src/questing-beast.js?v=r597-fb99c6531765",
    "./src/recitations.js?v=r597-fb99c6531765",
    "./src/lore.js?v=r597-fb99c6531765",
    "./src/glimpses.js?v=r597-fb99c6531765",
    "./src/glimpse-render.js?v=r597-fb99c6531765",
    "./src/glimpse-paint.js?v=r597-fb99c6531765",
    "./src/glimpse-scenes.js?v=r597-fb99c6531765",
    "./src/glimpse-horror.js?v=r597-fb99c6531765",
    "./src/glimpse-legend.js?v=r597-fb99c6531765",
    "./src/glimpse-hand.js?v=r597-fb99c6531765",
    "./src/atlas-view.js?v=r597-fb99c6531765",
    "./src/strange.js?v=r597-fb99c6531765",
    "./src/linked-dungeons.js?v=r597-fb99c6531765",
    "./src/digging.js?v=r597-fb99c6531765",
    "./src/building.js?v=r597-fb99c6531765",
    "./src/refuge-lands.js?v=r597-fb99c6531765",
    "./src/revenant-horde.js?v=r597-fb99c6531765",
    "./src/stages.js?v=r597-fb99c6531765",
    "./src/watcher.js?v=r597-fb99c6531765",
    "./src/vehicle-gates.js?v=r597-fb99c6531765",
    "./src/dungeon-ladder.js?v=r597-fb99c6531765",
    "./src/potions.js?v=r597-fb99c6531765",
    "./src/transit-lattice.js?v=r597-fb99c6531765",
    "./src/late-spells.js?v=r597-fb99c6531765",
    "./src/brawler-spells.js?v=r597-fb99c6531765",
    "./src/orbit-volley.js?v=r597-fb99c6531765",
    "./src/tool-forms.js?v=r597-fb99c6531765",
    "./src/sling.js?v=r597-fb99c6531765",
    "./src/atlas-colors.js?v=r597-fb99c6531765",
    "./src/skylands.js?v=r597-fb99c6531765",
    "./src/surveyor.js?v=r597-fb99c6531765",
    "./src/torn-pages.js?v=r597-fb99c6531765",
    "./src/lattice-fields.js?v=r597-fb99c6531765",
    "./src/dungeon-traps.js?v=r597-fb99c6531765",
    "./src/listener-mirror.js?v=r597-fb99c6531765",
    "./src/hometowns.js?v=r597-fb99c6531765",
    "./src/listener-arena.js?v=r597-fb99c6531765",
    "./src/listener-morph.js?v=r597-fb99c6531765",
    "./src/build-presets.js?v=r597-fb99c6531765",
    "./src/smithy.js?v=r597-fb99c6531765",
    "./src/ilse.js?v=r597-fb99c6531765",
    "./src/bells.js?v=r597-fb99c6531765",
    "./src/meals.js?v=r597-fb99c6531765",
    "./src/margins.js?v=r597-fb99c6531765",
    "./src/marginalia.js?v=r597-fb99c6531765",
    "./src/tyrant-hunt.js?v=r597-fb99c6531765",
    "./src/world-beasts.js?v=r597-fb99c6531765",
    "./src/elders.js?v=r597-fb99c6531765",
    "./src/far-array.js?v=r597-fb99c6531765",
    "./src/combat-visuals.js?v=r597-fb99c6531765",
    "./src/dungeon-framework.js?v=r597-fb99c6531765",
    "./src/elites.js?v=r597-fb99c6531765",
    "./src/random.js?v=r597-fb99c6531765",
    "./src/types.js?v=r597-fb99c6531765",
    "./src/story.js?v=r597-fb99c6531765",
    "./src/foundry.js?v=r597-fb99c6531765",
    "./src/world.js?v=r597-fb99c6531765",
    "./src/deep-dungeons.js?v=r597-fb99c6531765",
    "./src/scenes.js?v=r597-fb99c6531765",
    "./src/arenas.js?v=r597-fb99c6531765",
    "./src/items.js?v=r597-fb99c6531765",
    "./src/combat.js?v=r597-fb99c6531765",
    "./src/interactions.js?v=r597-fb99c6531765",
    "./src/persistence.js?v=r597-fb99c6531765",
    "./src/input.js?v=r597-fb99c6531765",
    "./src/game.js?v=r597-fb99c6531765",
    "./src/renderer.js?v=r597-fb99c6531765",
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
