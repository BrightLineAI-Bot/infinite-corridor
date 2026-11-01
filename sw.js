const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v651`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=651",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=651",
    "./src/proving-ground.js?v=651",
    "./src/proving-ground-fixtures.js?v=651",
    "./src/proving-ground-labs.js?v=651",
    "./src/dungeon-variation.js?v=651",
    "./src/dungeon-completion.js?v=651",
    "./src/enemy-patterns.js?v=651",
    "./src/monster-pack.js?v=651",
    "./src/monster-render.js?v=651",
    "./src/astral-worm.js?v=651",
    "./src/astral-worm-render.js?v=651",
    "./src/astral-worm-retreat.js?v=651",
    "./src/astral-worm-mount.js?v=651",
    "./src/lightning-giant-render.js?v=651",
    "./src/astral-encounters.js?v=651",
    "./src/astral-world-retreat.js?v=651",
    "./src/landscape.js?v=651",
    "./src/landscape-render.js?v=651",
    "./src/underlands.js?v=651",
    "./src/pattern-dungeons.js?v=651",
    "./src/relay-network.js?v=651",
    "./src/glyphs.js?v=651",
    "./src/echoes.js?v=651",
    "./src/constellation.js?v=651",
    "./src/water-traversal.js?v=651",
    "./src/open-sea.js?v=651",
    "./src/boats.js?v=651",
    "./src/sea-creatures.js?v=651",
    "./src/diving.js?v=651",
    "./src/grottoes.js?v=651",
    "./src/spell-slots.js?v=651",
    "./src/settlements.js?v=651",
    "./src/skirmishes.js?v=651",
    "./src/travelers.js?v=651",
    "./src/diagnostic-probe.js?v=651",
    "./src/questing-beast.js?v=651",
    "./src/recitations.js?v=651",
    "./src/lore.js?v=651",
    "./src/glimpses.js?v=651",
    "./src/glimpse-render.js?v=651",
    "./src/glimpse-paint.js?v=651",
    "./src/glimpse-scenes.js?v=651",
    "./src/glimpse-horror.js?v=651",
    "./src/glimpse-legend.js?v=651",
    "./src/glimpse-hand.js?v=651",
    "./src/atlas-view.js?v=651",
    "./src/strange.js?v=651",
    "./src/linked-dungeons.js?v=651",
    "./src/digging.js?v=651",
    "./src/building.js?v=651",
    "./src/refuge-lands.js?v=651",
    "./src/revenant-horde.js?v=651",
    "./src/stages.js?v=651",
    "./src/watcher.js?v=651",
    "./src/vehicle-gates.js?v=651",
    "./src/dungeon-ladder.js?v=651",
    "./src/potions.js?v=651",
    "./src/transit-lattice.js?v=651",
    "./src/late-spells.js?v=651",
    "./src/brawler-spells.js?v=651",
    "./src/orbit-volley.js?v=651",
    "./src/tool-forms.js?v=651",
    "./src/trees.js?v=651",
    "./src/fractured.js?v=651",
    "./src/sling.js?v=651",
    "./src/atlas-colors.js?v=651",
    "./src/skylands.js?v=651",
    "./src/surveyor.js?v=651",
    "./src/torn-pages.js?v=651",
    "./src/threads.js?v=651",
    "./src/lattice-fields.js?v=651",
    "./src/dungeon-traps.js?v=651",
    "./src/listener-mirror.js?v=651",
    "./src/hometowns.js?v=651",
    "./src/listener-arena.js?v=651",
    "./src/listener-morph.js?v=651",
    "./src/build-presets.js?v=651",
    "./src/smithy.js?v=651",
    "./src/ilse.js?v=651",
    "./src/bells.js?v=651",
    "./src/meals.js?v=651",
    "./src/margins.js?v=651",
    "./src/marginalia.js?v=651",
    "./src/tyrant-hunt.js?v=651",
    "./src/world-beasts.js?v=651",
    "./src/elders.js?v=651",
    "./src/far-array.js?v=651",
    "./src/combat-visuals.js?v=651",
    "./src/dungeon-framework.js?v=651",
    "./src/elites.js?v=651",
    "./src/random.js?v=651",
    "./src/types.js?v=651",
    "./src/story.js?v=651",
    "./src/foundry.js?v=651",
    "./src/world.js?v=651",
    "./src/deep-dungeons.js?v=651",
    "./src/scenes.js?v=651",
    "./src/arenas.js?v=651",
    "./src/items.js?v=651",
    "./src/combat.js?v=651",
    "./src/interactions.js?v=651",
    "./src/persistence.js?v=651",
    "./src/input.js?v=651",
    "./src/game.js?v=651",
    "./src/renderer.js?v=651",
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
// Release 651 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
