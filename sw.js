const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r623-2501e60705f7`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r623-2501e60705f7",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r623-2501e60705f7",
    "./src/proving-ground.js?v=r623-2501e60705f7",
    "./src/proving-ground-fixtures.js?v=r623-2501e60705f7",
    "./src/proving-ground-labs.js?v=r623-2501e60705f7",
    "./src/dungeon-variation.js?v=r623-2501e60705f7",
    "./src/dungeon-completion.js?v=r623-2501e60705f7",
    "./src/enemy-patterns.js?v=r623-2501e60705f7",
    "./src/monster-pack.js?v=r623-2501e60705f7",
    "./src/monster-render.js?v=r623-2501e60705f7",
    "./src/astral-worm.js?v=r623-2501e60705f7",
    "./src/astral-worm-render.js?v=r623-2501e60705f7",
    "./src/astral-worm-retreat.js?v=r623-2501e60705f7",
    "./src/astral-worm-mount.js?v=r623-2501e60705f7",
    "./src/lightning-giant-render.js?v=r623-2501e60705f7",
    "./src/astral-encounters.js?v=r623-2501e60705f7",
    "./src/astral-world-retreat.js?v=r623-2501e60705f7",
    "./src/landscape.js?v=r623-2501e60705f7",
    "./src/landscape-render.js?v=r623-2501e60705f7",
    "./src/underlands.js?v=r623-2501e60705f7",
    "./src/pattern-dungeons.js?v=r623-2501e60705f7",
    "./src/relay-network.js?v=r623-2501e60705f7",
    "./src/glyphs.js?v=r623-2501e60705f7",
    "./src/echoes.js?v=r623-2501e60705f7",
    "./src/constellation.js?v=r623-2501e60705f7",
    "./src/water-traversal.js?v=r623-2501e60705f7",
    "./src/open-sea.js?v=r623-2501e60705f7",
    "./src/boats.js?v=r623-2501e60705f7",
    "./src/sea-creatures.js?v=r623-2501e60705f7",
    "./src/diving.js?v=r623-2501e60705f7",
    "./src/grottoes.js?v=r623-2501e60705f7",
    "./src/spell-slots.js?v=r623-2501e60705f7",
    "./src/settlements.js?v=r623-2501e60705f7",
    "./src/skirmishes.js?v=r623-2501e60705f7",
    "./src/travelers.js?v=r623-2501e60705f7",
    "./src/diagnostic-probe.js?v=r623-2501e60705f7",
    "./src/questing-beast.js?v=r623-2501e60705f7",
    "./src/recitations.js?v=r623-2501e60705f7",
    "./src/lore.js?v=r623-2501e60705f7",
    "./src/glimpses.js?v=r623-2501e60705f7",
    "./src/glimpse-render.js?v=r623-2501e60705f7",
    "./src/glimpse-paint.js?v=r623-2501e60705f7",
    "./src/glimpse-scenes.js?v=r623-2501e60705f7",
    "./src/glimpse-horror.js?v=r623-2501e60705f7",
    "./src/glimpse-legend.js?v=r623-2501e60705f7",
    "./src/glimpse-hand.js?v=r623-2501e60705f7",
    "./src/atlas-view.js?v=r623-2501e60705f7",
    "./src/strange.js?v=r623-2501e60705f7",
    "./src/linked-dungeons.js?v=r623-2501e60705f7",
    "./src/digging.js?v=r623-2501e60705f7",
    "./src/building.js?v=r623-2501e60705f7",
    "./src/refuge-lands.js?v=r623-2501e60705f7",
    "./src/revenant-horde.js?v=r623-2501e60705f7",
    "./src/stages.js?v=r623-2501e60705f7",
    "./src/watcher.js?v=r623-2501e60705f7",
    "./src/vehicle-gates.js?v=r623-2501e60705f7",
    "./src/dungeon-ladder.js?v=r623-2501e60705f7",
    "./src/potions.js?v=r623-2501e60705f7",
    "./src/transit-lattice.js?v=r623-2501e60705f7",
    "./src/late-spells.js?v=r623-2501e60705f7",
    "./src/brawler-spells.js?v=r623-2501e60705f7",
    "./src/orbit-volley.js?v=r623-2501e60705f7",
    "./src/tool-forms.js?v=r623-2501e60705f7",
    "./src/sling.js?v=r623-2501e60705f7",
    "./src/atlas-colors.js?v=r623-2501e60705f7",
    "./src/skylands.js?v=r623-2501e60705f7",
    "./src/surveyor.js?v=r623-2501e60705f7",
    "./src/torn-pages.js?v=r623-2501e60705f7",
    "./src/lattice-fields.js?v=r623-2501e60705f7",
    "./src/dungeon-traps.js?v=r623-2501e60705f7",
    "./src/listener-mirror.js?v=r623-2501e60705f7",
    "./src/hometowns.js?v=r623-2501e60705f7",
    "./src/listener-arena.js?v=r623-2501e60705f7",
    "./src/listener-morph.js?v=r623-2501e60705f7",
    "./src/build-presets.js?v=r623-2501e60705f7",
    "./src/smithy.js?v=r623-2501e60705f7",
    "./src/ilse.js?v=r623-2501e60705f7",
    "./src/bells.js?v=r623-2501e60705f7",
    "./src/meals.js?v=r623-2501e60705f7",
    "./src/margins.js?v=r623-2501e60705f7",
    "./src/marginalia.js?v=r623-2501e60705f7",
    "./src/tyrant-hunt.js?v=r623-2501e60705f7",
    "./src/world-beasts.js?v=r623-2501e60705f7",
    "./src/elders.js?v=r623-2501e60705f7",
    "./src/far-array.js?v=r623-2501e60705f7",
    "./src/combat-visuals.js?v=r623-2501e60705f7",
    "./src/dungeon-framework.js?v=r623-2501e60705f7",
    "./src/elites.js?v=r623-2501e60705f7",
    "./src/random.js?v=r623-2501e60705f7",
    "./src/types.js?v=r623-2501e60705f7",
    "./src/story.js?v=r623-2501e60705f7",
    "./src/foundry.js?v=r623-2501e60705f7",
    "./src/world.js?v=r623-2501e60705f7",
    "./src/deep-dungeons.js?v=r623-2501e60705f7",
    "./src/scenes.js?v=r623-2501e60705f7",
    "./src/arenas.js?v=r623-2501e60705f7",
    "./src/items.js?v=r623-2501e60705f7",
    "./src/combat.js?v=r623-2501e60705f7",
    "./src/interactions.js?v=r623-2501e60705f7",
    "./src/persistence.js?v=r623-2501e60705f7",
    "./src/input.js?v=r623-2501e60705f7",
    "./src/game.js?v=r623-2501e60705f7",
    "./src/renderer.js?v=r623-2501e60705f7",
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
// Release r623-2501e60705f7 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
// Ground and the previews are left to their own workers, and only a page load falls back to the cached index.html.
const LAB_PATHS = /^(proving-ground|previews)\//;
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url), scope = new URL(self.registration.scope), same = url.origin === scope.origin;
  if (same && url.pathname.startsWith(scope.pathname) && LAB_PATHS.test(url.pathname.slice(scope.pathname.length))) return;
  e.respondWith(
    caches.match(e.request).then(
      (r) =>
        r ||
        fetch(e.request)
          .then((n) => {
            if (n.ok && same) { const c = n.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); }
            return n;
          })
          .catch(() => (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())),
    ),
  );
});
