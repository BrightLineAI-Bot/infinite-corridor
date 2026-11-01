const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v669`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=669",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=669",
    "./src/proving-ground.js?v=669",
    "./src/proving-ground-fixtures.js?v=669",
    "./src/proving-ground-labs.js?v=669",
    "./src/dungeon-variation.js?v=669",
    "./src/dungeon-completion.js?v=669",
    "./src/enemy-patterns.js?v=669",
    "./src/monster-pack.js?v=669",
    "./src/monster-render.js?v=669",
    "./src/astral-worm.js?v=669",
    "./src/astral-worm-render.js?v=669",
    "./src/astral-worm-retreat.js?v=669",
    "./src/astral-worm-mount.js?v=669",
    "./src/lightning-giant-render.js?v=669",
    "./src/astral-encounters.js?v=669",
    "./src/astral-world-retreat.js?v=669",
    "./src/landscape.js?v=669",
    "./src/landscape-render.js?v=669",
    "./src/underlands.js?v=669",
    "./src/pattern-dungeons.js?v=669",
    "./src/relay-network.js?v=669",
    "./src/glyphs.js?v=669",
    "./src/echoes.js?v=669",
    "./src/constellation.js?v=669",
    "./src/water-traversal.js?v=669",
    "./src/open-sea.js?v=669",
    "./src/boats.js?v=669",
    "./src/sea-creatures.js?v=669",
    "./src/diving.js?v=669",
    "./src/grottoes.js?v=669",
    "./src/spell-slots.js?v=669",
    "./src/settlements.js?v=669",
    "./src/skirmishes.js?v=669",
    "./src/travelers.js?v=669",
    "./src/diagnostic-probe.js?v=669",
    "./src/questing-beast.js?v=669",
    "./src/recitations.js?v=669",
    "./src/lore.js?v=669",
    "./src/glimpses.js?v=669",
    "./src/glimpse-render.js?v=669",
    "./src/glimpse-paint.js?v=669",
    "./src/glimpse-scenes.js?v=669",
    "./src/glimpse-horror.js?v=669",
    "./src/glimpse-legend.js?v=669",
    "./src/glimpse-hand.js?v=669",
    "./src/atlas-view.js?v=669",
    "./src/strange.js?v=669",
    "./src/linked-dungeons.js?v=669",
    "./src/digging.js?v=669",
    "./src/building.js?v=669",
    "./src/refuge-lands.js?v=669",
    "./src/revenant-horde.js?v=669",
    "./src/stages.js?v=669",
    "./src/watcher.js?v=669",
    "./src/vehicle-gates.js?v=669",
    "./src/dungeon-ladder.js?v=669",
    "./src/potions.js?v=669",
    "./src/transit-lattice.js?v=669",
    "./src/late-spells.js?v=669",
    "./src/brawler-spells.js?v=669",
    "./src/orbit-volley.js?v=669",
    "./src/tool-forms.js?v=669",
    "./src/trees.js?v=669",
    "./src/fractured.js?v=669",
    "./src/affixes.js?v=669",
    "./src/boss-kit.js?v=669",
    "./src/sling.js?v=669",
    "./src/atlas-colors.js?v=669",
    "./src/skylands.js?v=669",
    "./src/surveyor.js?v=669",
    "./src/torn-pages.js?v=669",
    "./src/threads.js?v=669",
    "./src/lattice-fields.js?v=669",
    "./src/dungeon-traps.js?v=669",
    "./src/listener-mirror.js?v=669",
    "./src/hometowns.js?v=669",
    "./src/listener-arena.js?v=669",
    "./src/listener-morph.js?v=669",
    "./src/build-presets.js?v=669",
    "./src/smithy.js?v=669",
    "./src/ilse.js?v=669",
    "./src/bells.js?v=669",
    "./src/meals.js?v=669",
    "./src/margins.js?v=669",
    "./src/marginalia.js?v=669",
    "./src/tyrant-hunt.js?v=669",
    "./src/world-beasts.js?v=669",
    "./src/elders.js?v=669",
    "./src/far-array.js?v=669",
    "./src/combat-visuals.js?v=669",
    "./src/dungeon-framework.js?v=669",
    "./src/elites.js?v=669",
    "./src/random.js?v=669",
    "./src/types.js?v=669",
    "./src/story.js?v=669",
    "./src/foundry.js?v=669",
    "./src/world.js?v=669",
    "./src/deep-dungeons.js?v=669",
    "./src/scenes.js?v=669",
    "./src/arenas.js?v=669",
    "./src/items.js?v=669",
    "./src/combat.js?v=669",
    "./src/interactions.js?v=669",
    "./src/persistence.js?v=669",
    "./src/input.js?v=669",
    "./src/game.js?v=669",
    "./src/renderer.js?v=669",
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
// Release 669 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
