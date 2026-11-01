const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v643`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=643",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=643",
    "./src/proving-ground.js?v=643",
    "./src/proving-ground-fixtures.js?v=643",
    "./src/proving-ground-labs.js?v=643",
    "./src/dungeon-variation.js?v=643",
    "./src/dungeon-completion.js?v=643",
    "./src/enemy-patterns.js?v=643",
    "./src/monster-pack.js?v=643",
    "./src/monster-render.js?v=643",
    "./src/astral-worm.js?v=643",
    "./src/astral-worm-render.js?v=643",
    "./src/astral-worm-retreat.js?v=643",
    "./src/astral-worm-mount.js?v=643",
    "./src/lightning-giant-render.js?v=643",
    "./src/astral-encounters.js?v=643",
    "./src/astral-world-retreat.js?v=643",
    "./src/landscape.js?v=643",
    "./src/landscape-render.js?v=643",
    "./src/underlands.js?v=643",
    "./src/pattern-dungeons.js?v=643",
    "./src/relay-network.js?v=643",
    "./src/glyphs.js?v=643",
    "./src/echoes.js?v=643",
    "./src/constellation.js?v=643",
    "./src/water-traversal.js?v=643",
    "./src/open-sea.js?v=643",
    "./src/boats.js?v=643",
    "./src/sea-creatures.js?v=643",
    "./src/diving.js?v=643",
    "./src/grottoes.js?v=643",
    "./src/spell-slots.js?v=643",
    "./src/settlements.js?v=643",
    "./src/skirmishes.js?v=643",
    "./src/travelers.js?v=643",
    "./src/diagnostic-probe.js?v=643",
    "./src/questing-beast.js?v=643",
    "./src/recitations.js?v=643",
    "./src/lore.js?v=643",
    "./src/glimpses.js?v=643",
    "./src/glimpse-render.js?v=643",
    "./src/glimpse-paint.js?v=643",
    "./src/glimpse-scenes.js?v=643",
    "./src/glimpse-horror.js?v=643",
    "./src/glimpse-legend.js?v=643",
    "./src/glimpse-hand.js?v=643",
    "./src/atlas-view.js?v=643",
    "./src/strange.js?v=643",
    "./src/linked-dungeons.js?v=643",
    "./src/digging.js?v=643",
    "./src/building.js?v=643",
    "./src/refuge-lands.js?v=643",
    "./src/revenant-horde.js?v=643",
    "./src/stages.js?v=643",
    "./src/watcher.js?v=643",
    "./src/vehicle-gates.js?v=643",
    "./src/dungeon-ladder.js?v=643",
    "./src/potions.js?v=643",
    "./src/transit-lattice.js?v=643",
    "./src/late-spells.js?v=643",
    "./src/brawler-spells.js?v=643",
    "./src/orbit-volley.js?v=643",
    "./src/tool-forms.js?v=643",
    "./src/sling.js?v=643",
    "./src/atlas-colors.js?v=643",
    "./src/skylands.js?v=643",
    "./src/surveyor.js?v=643",
    "./src/torn-pages.js?v=643",
    "./src/threads.js?v=643",
    "./src/lattice-fields.js?v=643",
    "./src/dungeon-traps.js?v=643",
    "./src/listener-mirror.js?v=643",
    "./src/hometowns.js?v=643",
    "./src/listener-arena.js?v=643",
    "./src/listener-morph.js?v=643",
    "./src/build-presets.js?v=643",
    "./src/smithy.js?v=643",
    "./src/ilse.js?v=643",
    "./src/bells.js?v=643",
    "./src/meals.js?v=643",
    "./src/margins.js?v=643",
    "./src/marginalia.js?v=643",
    "./src/tyrant-hunt.js?v=643",
    "./src/world-beasts.js?v=643",
    "./src/elders.js?v=643",
    "./src/far-array.js?v=643",
    "./src/combat-visuals.js?v=643",
    "./src/dungeon-framework.js?v=643",
    "./src/elites.js?v=643",
    "./src/random.js?v=643",
    "./src/types.js?v=643",
    "./src/story.js?v=643",
    "./src/foundry.js?v=643",
    "./src/world.js?v=643",
    "./src/deep-dungeons.js?v=643",
    "./src/scenes.js?v=643",
    "./src/arenas.js?v=643",
    "./src/items.js?v=643",
    "./src/combat.js?v=643",
    "./src/interactions.js?v=643",
    "./src/persistence.js?v=643",
    "./src/input.js?v=643",
    "./src/game.js?v=643",
    "./src/renderer.js?v=643",
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
// Release 643 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
