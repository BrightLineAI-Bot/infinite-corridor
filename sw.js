const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r649-75bd8abf2c15`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r649-75bd8abf2c15",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r649-75bd8abf2c15",
    "./src/proving-ground.js?v=r649-75bd8abf2c15",
    "./src/proving-ground-fixtures.js?v=r649-75bd8abf2c15",
    "./src/proving-ground-labs.js?v=r649-75bd8abf2c15",
    "./src/dungeon-variation.js?v=r649-75bd8abf2c15",
    "./src/dungeon-completion.js?v=r649-75bd8abf2c15",
    "./src/enemy-patterns.js?v=r649-75bd8abf2c15",
    "./src/monster-pack.js?v=r649-75bd8abf2c15",
    "./src/monster-render.js?v=r649-75bd8abf2c15",
    "./src/astral-worm.js?v=r649-75bd8abf2c15",
    "./src/astral-worm-render.js?v=r649-75bd8abf2c15",
    "./src/astral-worm-retreat.js?v=r649-75bd8abf2c15",
    "./src/astral-worm-mount.js?v=r649-75bd8abf2c15",
    "./src/lightning-giant-render.js?v=r649-75bd8abf2c15",
    "./src/astral-encounters.js?v=r649-75bd8abf2c15",
    "./src/astral-world-retreat.js?v=r649-75bd8abf2c15",
    "./src/landscape.js?v=r649-75bd8abf2c15",
    "./src/landscape-render.js?v=r649-75bd8abf2c15",
    "./src/underlands.js?v=r649-75bd8abf2c15",
    "./src/pattern-dungeons.js?v=r649-75bd8abf2c15",
    "./src/relay-network.js?v=r649-75bd8abf2c15",
    "./src/glyphs.js?v=r649-75bd8abf2c15",
    "./src/echoes.js?v=r649-75bd8abf2c15",
    "./src/constellation.js?v=r649-75bd8abf2c15",
    "./src/water-traversal.js?v=r649-75bd8abf2c15",
    "./src/open-sea.js?v=r649-75bd8abf2c15",
    "./src/boats.js?v=r649-75bd8abf2c15",
    "./src/sea-creatures.js?v=r649-75bd8abf2c15",
    "./src/diving.js?v=r649-75bd8abf2c15",
    "./src/grottoes.js?v=r649-75bd8abf2c15",
    "./src/spell-slots.js?v=r649-75bd8abf2c15",
    "./src/settlements.js?v=r649-75bd8abf2c15",
    "./src/skirmishes.js?v=r649-75bd8abf2c15",
    "./src/travelers.js?v=r649-75bd8abf2c15",
    "./src/diagnostic-probe.js?v=r649-75bd8abf2c15",
    "./src/questing-beast.js?v=r649-75bd8abf2c15",
    "./src/recitations.js?v=r649-75bd8abf2c15",
    "./src/lore.js?v=r649-75bd8abf2c15",
    "./src/glimpses.js?v=r649-75bd8abf2c15",
    "./src/glimpse-render.js?v=r649-75bd8abf2c15",
    "./src/glimpse-paint.js?v=r649-75bd8abf2c15",
    "./src/glimpse-scenes.js?v=r649-75bd8abf2c15",
    "./src/glimpse-horror.js?v=r649-75bd8abf2c15",
    "./src/glimpse-legend.js?v=r649-75bd8abf2c15",
    "./src/glimpse-hand.js?v=r649-75bd8abf2c15",
    "./src/atlas-view.js?v=r649-75bd8abf2c15",
    "./src/strange.js?v=r649-75bd8abf2c15",
    "./src/linked-dungeons.js?v=r649-75bd8abf2c15",
    "./src/digging.js?v=r649-75bd8abf2c15",
    "./src/building.js?v=r649-75bd8abf2c15",
    "./src/refuge-lands.js?v=r649-75bd8abf2c15",
    "./src/revenant-horde.js?v=r649-75bd8abf2c15",
    "./src/stages.js?v=r649-75bd8abf2c15",
    "./src/watcher.js?v=r649-75bd8abf2c15",
    "./src/vehicle-gates.js?v=r649-75bd8abf2c15",
    "./src/dungeon-ladder.js?v=r649-75bd8abf2c15",
    "./src/potions.js?v=r649-75bd8abf2c15",
    "./src/transit-lattice.js?v=r649-75bd8abf2c15",
    "./src/late-spells.js?v=r649-75bd8abf2c15",
    "./src/brawler-spells.js?v=r649-75bd8abf2c15",
    "./src/orbit-volley.js?v=r649-75bd8abf2c15",
    "./src/tool-forms.js?v=r649-75bd8abf2c15",
    "./src/trees.js?v=r649-75bd8abf2c15",
    "./src/sling.js?v=r649-75bd8abf2c15",
    "./src/atlas-colors.js?v=r649-75bd8abf2c15",
    "./src/skylands.js?v=r649-75bd8abf2c15",
    "./src/surveyor.js?v=r649-75bd8abf2c15",
    "./src/torn-pages.js?v=r649-75bd8abf2c15",
    "./src/threads.js?v=r649-75bd8abf2c15",
    "./src/lattice-fields.js?v=r649-75bd8abf2c15",
    "./src/dungeon-traps.js?v=r649-75bd8abf2c15",
    "./src/listener-mirror.js?v=r649-75bd8abf2c15",
    "./src/hometowns.js?v=r649-75bd8abf2c15",
    "./src/listener-arena.js?v=r649-75bd8abf2c15",
    "./src/listener-morph.js?v=r649-75bd8abf2c15",
    "./src/build-presets.js?v=r649-75bd8abf2c15",
    "./src/smithy.js?v=r649-75bd8abf2c15",
    "./src/ilse.js?v=r649-75bd8abf2c15",
    "./src/bells.js?v=r649-75bd8abf2c15",
    "./src/meals.js?v=r649-75bd8abf2c15",
    "./src/margins.js?v=r649-75bd8abf2c15",
    "./src/marginalia.js?v=r649-75bd8abf2c15",
    "./src/tyrant-hunt.js?v=r649-75bd8abf2c15",
    "./src/world-beasts.js?v=r649-75bd8abf2c15",
    "./src/elders.js?v=r649-75bd8abf2c15",
    "./src/far-array.js?v=r649-75bd8abf2c15",
    "./src/combat-visuals.js?v=r649-75bd8abf2c15",
    "./src/dungeon-framework.js?v=r649-75bd8abf2c15",
    "./src/elites.js?v=r649-75bd8abf2c15",
    "./src/random.js?v=r649-75bd8abf2c15",
    "./src/types.js?v=r649-75bd8abf2c15",
    "./src/story.js?v=r649-75bd8abf2c15",
    "./src/foundry.js?v=r649-75bd8abf2c15",
    "./src/world.js?v=r649-75bd8abf2c15",
    "./src/deep-dungeons.js?v=r649-75bd8abf2c15",
    "./src/scenes.js?v=r649-75bd8abf2c15",
    "./src/arenas.js?v=r649-75bd8abf2c15",
    "./src/items.js?v=r649-75bd8abf2c15",
    "./src/combat.js?v=r649-75bd8abf2c15",
    "./src/interactions.js?v=r649-75bd8abf2c15",
    "./src/persistence.js?v=r649-75bd8abf2c15",
    "./src/input.js?v=r649-75bd8abf2c15",
    "./src/game.js?v=r649-75bd8abf2c15",
    "./src/renderer.js?v=r649-75bd8abf2c15",
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
// Release r649-75bd8abf2c15 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
