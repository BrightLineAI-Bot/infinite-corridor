const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r511-87890decf80f`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r511-87890decf80f",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r511-87890decf80f",
    "./src/proving-ground.js?v=r511-87890decf80f",
    "./src/proving-ground-fixtures.js?v=r511-87890decf80f",
    "./src/proving-ground-labs.js?v=r511-87890decf80f",
    "./src/dungeon-variation.js?v=r511-87890decf80f",
    "./src/dungeon-completion.js?v=r511-87890decf80f",
    "./src/enemy-patterns.js?v=r511-87890decf80f",
    "./src/monster-pack.js?v=r511-87890decf80f",
    "./src/monster-render.js?v=r511-87890decf80f",
    "./src/astral-worm.js?v=r511-87890decf80f",
    "./src/astral-worm-render.js?v=r511-87890decf80f",
    "./src/astral-worm-retreat.js?v=r511-87890decf80f",
    "./src/astral-worm-mount.js?v=r511-87890decf80f",
    "./src/lightning-giant-render.js?v=r511-87890decf80f",
    "./src/astral-encounters.js?v=r511-87890decf80f",
    "./src/astral-world-retreat.js?v=r511-87890decf80f",
    "./src/landscape.js?v=r511-87890decf80f",
    "./src/landscape-render.js?v=r511-87890decf80f",
    "./src/underlands.js?v=r511-87890decf80f",
    "./src/pattern-dungeons.js?v=r511-87890decf80f",
    "./src/relay-network.js?v=r511-87890decf80f",
    "./src/glyphs.js?v=r511-87890decf80f",
    "./src/echoes.js?v=r511-87890decf80f",
    "./src/constellation.js?v=r511-87890decf80f",
    "./src/water-traversal.js?v=r511-87890decf80f",
    "./src/open-sea.js?v=r511-87890decf80f",
    "./src/boats.js?v=r511-87890decf80f",
    "./src/sea-creatures.js?v=r511-87890decf80f",
    "./src/diving.js?v=r511-87890decf80f",
    "./src/grottoes.js?v=r511-87890decf80f",
    "./src/spell-slots.js?v=r511-87890decf80f",
    "./src/settlements.js?v=r511-87890decf80f",
    "./src/skirmishes.js?v=r511-87890decf80f",
    "./src/travelers.js?v=r511-87890decf80f",
    "./src/diagnostic-probe.js?v=r511-87890decf80f",
    "./src/questing-beast.js?v=r511-87890decf80f",
    "./src/recitations.js?v=r511-87890decf80f",
    "./src/lore.js?v=r511-87890decf80f",
    "./src/glimpses.js?v=r511-87890decf80f",
    "./src/glimpse-render.js?v=r511-87890decf80f",
    "./src/glimpse-paint.js?v=r511-87890decf80f",
    "./src/glimpse-scenes.js?v=r511-87890decf80f",
    "./src/glimpse-horror.js?v=r511-87890decf80f",
    "./src/glimpse-legend.js?v=r511-87890decf80f",
    "./src/glimpse-hand.js?v=r511-87890decf80f",
    "./src/atlas-view.js?v=r511-87890decf80f",
    "./src/strange.js?v=r511-87890decf80f",
    "./src/linked-dungeons.js?v=r511-87890decf80f",
    "./src/digging.js?v=r511-87890decf80f",
    "./src/building.js?v=r511-87890decf80f",
    "./src/refuge-lands.js?v=r511-87890decf80f",
    "./src/revenant-horde.js?v=r511-87890decf80f",
    "./src/stages.js?v=r511-87890decf80f",
    "./src/watcher.js?v=r511-87890decf80f",
    "./src/vehicle-gates.js?v=r511-87890decf80f",
    "./src/dungeon-ladder.js?v=r511-87890decf80f",
    "./src/potions.js?v=r511-87890decf80f",
    "./src/transit-lattice.js?v=r511-87890decf80f",
    "./src/late-spells.js?v=r511-87890decf80f",
    "./src/brawler-spells.js?v=r511-87890decf80f",
    "./src/orbit-volley.js?v=r511-87890decf80f",
    "./src/surveyor.js?v=r511-87890decf80f",
    "./src/listener-mirror.js?v=r511-87890decf80f",
    "./src/hometowns.js?v=r511-87890decf80f",
    "./src/listener-arena.js?v=r511-87890decf80f",
    "./src/listener-morph.js?v=r511-87890decf80f",
    "./src/build-presets.js?v=r511-87890decf80f",
    "./src/smithy.js?v=r511-87890decf80f",
    "./src/ilse.js?v=r511-87890decf80f",
    "./src/bells.js?v=r511-87890decf80f",
    "./src/meals.js?v=r511-87890decf80f",
    "./src/margins.js?v=r511-87890decf80f",
    "./src/marginalia.js?v=r511-87890decf80f",
    "./src/tyrant-hunt.js?v=r511-87890decf80f",
    "./src/world-beasts.js?v=r511-87890decf80f",
    "./src/elders.js?v=r511-87890decf80f",
    "./src/far-array.js?v=r511-87890decf80f",
    "./src/combat-visuals.js?v=r511-87890decf80f",
    "./src/dungeon-framework.js?v=r511-87890decf80f",
    "./src/elites.js?v=r511-87890decf80f",
    "./src/random.js?v=r511-87890decf80f",
    "./src/types.js?v=r511-87890decf80f",
    "./src/story.js?v=r511-87890decf80f",
    "./src/foundry.js?v=r511-87890decf80f",
    "./src/world.js?v=r511-87890decf80f",
    "./src/deep-dungeons.js?v=r511-87890decf80f",
    "./src/scenes.js?v=r511-87890decf80f",
    "./src/arenas.js?v=r511-87890decf80f",
    "./src/items.js?v=r511-87890decf80f",
    "./src/combat.js?v=r511-87890decf80f",
    "./src/interactions.js?v=r511-87890decf80f",
    "./src/persistence.js?v=r511-87890decf80f",
    "./src/input.js?v=r511-87890decf80f",
    "./src/game.js?v=r511-87890decf80f",
    "./src/renderer.js?v=r511-87890decf80f",
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
