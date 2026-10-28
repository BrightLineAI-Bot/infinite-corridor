const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v553`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=553",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=553",
    "./src/proving-ground.js?v=553",
    "./src/proving-ground-fixtures.js?v=553",
    "./src/proving-ground-labs.js?v=553",
    "./src/dungeon-variation.js?v=553",
    "./src/dungeon-completion.js?v=553",
    "./src/enemy-patterns.js?v=553",
    "./src/monster-pack.js?v=553",
    "./src/monster-render.js?v=553",
    "./src/astral-worm.js?v=553",
    "./src/astral-worm-render.js?v=553",
    "./src/astral-worm-retreat.js?v=553",
    "./src/astral-worm-mount.js?v=553",
    "./src/lightning-giant-render.js?v=553",
    "./src/astral-encounters.js?v=553",
    "./src/astral-world-retreat.js?v=553",
    "./src/landscape.js?v=553",
    "./src/landscape-render.js?v=553",
    "./src/underlands.js?v=553",
    "./src/pattern-dungeons.js?v=553",
    "./src/relay-network.js?v=553",
    "./src/glyphs.js?v=553",
    "./src/echoes.js?v=553",
    "./src/constellation.js?v=553",
    "./src/water-traversal.js?v=553",
    "./src/open-sea.js?v=553",
    "./src/boats.js?v=553",
    "./src/sea-creatures.js?v=553",
    "./src/diving.js?v=553",
    "./src/grottoes.js?v=553",
    "./src/spell-slots.js?v=553",
    "./src/settlements.js?v=553",
    "./src/skirmishes.js?v=553",
    "./src/travelers.js?v=553",
    "./src/diagnostic-probe.js?v=553",
    "./src/questing-beast.js?v=553",
    "./src/recitations.js?v=553",
    "./src/lore.js?v=553",
    "./src/glimpses.js?v=553",
    "./src/glimpse-render.js?v=553",
    "./src/glimpse-paint.js?v=553",
    "./src/glimpse-scenes.js?v=553",
    "./src/glimpse-horror.js?v=553",
    "./src/glimpse-legend.js?v=553",
    "./src/glimpse-hand.js?v=553",
    "./src/atlas-view.js?v=553",
    "./src/strange.js?v=553",
    "./src/linked-dungeons.js?v=553",
    "./src/digging.js?v=553",
    "./src/building.js?v=553",
    "./src/refuge-lands.js?v=553",
    "./src/revenant-horde.js?v=553",
    "./src/stages.js?v=553",
    "./src/watcher.js?v=553",
    "./src/vehicle-gates.js?v=553",
    "./src/dungeon-ladder.js?v=553",
    "./src/potions.js?v=553",
    "./src/transit-lattice.js?v=553",
    "./src/late-spells.js?v=553",
    "./src/brawler-spells.js?v=553",
    "./src/orbit-volley.js?v=553",
    "./src/tool-forms.js?v=553",
    "./src/sling.js?v=553",
    "./src/surveyor.js?v=553",
    "./src/lattice-fields.js?v=553",
    "./src/dungeon-traps.js?v=553",
    "./src/listener-mirror.js?v=553",
    "./src/hometowns.js?v=553",
    "./src/listener-arena.js?v=553",
    "./src/listener-morph.js?v=553",
    "./src/build-presets.js?v=553",
    "./src/smithy.js?v=553",
    "./src/ilse.js?v=553",
    "./src/bells.js?v=553",
    "./src/meals.js?v=553",
    "./src/margins.js?v=553",
    "./src/marginalia.js?v=553",
    "./src/tyrant-hunt.js?v=553",
    "./src/world-beasts.js?v=553",
    "./src/elders.js?v=553",
    "./src/far-array.js?v=553",
    "./src/combat-visuals.js?v=553",
    "./src/dungeon-framework.js?v=553",
    "./src/elites.js?v=553",
    "./src/random.js?v=553",
    "./src/types.js?v=553",
    "./src/story.js?v=553",
    "./src/foundry.js?v=553",
    "./src/world.js?v=553",
    "./src/deep-dungeons.js?v=553",
    "./src/scenes.js?v=553",
    "./src/arenas.js?v=553",
    "./src/items.js?v=553",
    "./src/combat.js?v=553",
    "./src/interactions.js?v=553",
    "./src/persistence.js?v=553",
    "./src/input.js?v=553",
    "./src/game.js?v=553",
    "./src/renderer.js?v=553",
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
