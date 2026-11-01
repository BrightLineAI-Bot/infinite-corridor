const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v649`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=649",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=649",
    "./src/proving-ground.js?v=649",
    "./src/proving-ground-fixtures.js?v=649",
    "./src/proving-ground-labs.js?v=649",
    "./src/dungeon-variation.js?v=649",
    "./src/dungeon-completion.js?v=649",
    "./src/enemy-patterns.js?v=649",
    "./src/monster-pack.js?v=649",
    "./src/monster-render.js?v=649",
    "./src/astral-worm.js?v=649",
    "./src/astral-worm-render.js?v=649",
    "./src/astral-worm-retreat.js?v=649",
    "./src/astral-worm-mount.js?v=649",
    "./src/lightning-giant-render.js?v=649",
    "./src/astral-encounters.js?v=649",
    "./src/astral-world-retreat.js?v=649",
    "./src/landscape.js?v=649",
    "./src/landscape-render.js?v=649",
    "./src/underlands.js?v=649",
    "./src/pattern-dungeons.js?v=649",
    "./src/relay-network.js?v=649",
    "./src/glyphs.js?v=649",
    "./src/echoes.js?v=649",
    "./src/constellation.js?v=649",
    "./src/water-traversal.js?v=649",
    "./src/open-sea.js?v=649",
    "./src/boats.js?v=649",
    "./src/sea-creatures.js?v=649",
    "./src/diving.js?v=649",
    "./src/grottoes.js?v=649",
    "./src/spell-slots.js?v=649",
    "./src/settlements.js?v=649",
    "./src/skirmishes.js?v=649",
    "./src/travelers.js?v=649",
    "./src/diagnostic-probe.js?v=649",
    "./src/questing-beast.js?v=649",
    "./src/recitations.js?v=649",
    "./src/lore.js?v=649",
    "./src/glimpses.js?v=649",
    "./src/glimpse-render.js?v=649",
    "./src/glimpse-paint.js?v=649",
    "./src/glimpse-scenes.js?v=649",
    "./src/glimpse-horror.js?v=649",
    "./src/glimpse-legend.js?v=649",
    "./src/glimpse-hand.js?v=649",
    "./src/atlas-view.js?v=649",
    "./src/strange.js?v=649",
    "./src/linked-dungeons.js?v=649",
    "./src/digging.js?v=649",
    "./src/building.js?v=649",
    "./src/refuge-lands.js?v=649",
    "./src/revenant-horde.js?v=649",
    "./src/stages.js?v=649",
    "./src/watcher.js?v=649",
    "./src/vehicle-gates.js?v=649",
    "./src/dungeon-ladder.js?v=649",
    "./src/potions.js?v=649",
    "./src/transit-lattice.js?v=649",
    "./src/late-spells.js?v=649",
    "./src/brawler-spells.js?v=649",
    "./src/orbit-volley.js?v=649",
    "./src/tool-forms.js?v=649",
    "./src/trees.js?v=649",
    "./src/sling.js?v=649",
    "./src/atlas-colors.js?v=649",
    "./src/skylands.js?v=649",
    "./src/surveyor.js?v=649",
    "./src/torn-pages.js?v=649",
    "./src/threads.js?v=649",
    "./src/lattice-fields.js?v=649",
    "./src/dungeon-traps.js?v=649",
    "./src/listener-mirror.js?v=649",
    "./src/hometowns.js?v=649",
    "./src/listener-arena.js?v=649",
    "./src/listener-morph.js?v=649",
    "./src/build-presets.js?v=649",
    "./src/smithy.js?v=649",
    "./src/ilse.js?v=649",
    "./src/bells.js?v=649",
    "./src/meals.js?v=649",
    "./src/margins.js?v=649",
    "./src/marginalia.js?v=649",
    "./src/tyrant-hunt.js?v=649",
    "./src/world-beasts.js?v=649",
    "./src/elders.js?v=649",
    "./src/far-array.js?v=649",
    "./src/combat-visuals.js?v=649",
    "./src/dungeon-framework.js?v=649",
    "./src/elites.js?v=649",
    "./src/random.js?v=649",
    "./src/types.js?v=649",
    "./src/story.js?v=649",
    "./src/foundry.js?v=649",
    "./src/world.js?v=649",
    "./src/deep-dungeons.js?v=649",
    "./src/scenes.js?v=649",
    "./src/arenas.js?v=649",
    "./src/items.js?v=649",
    "./src/combat.js?v=649",
    "./src/interactions.js?v=649",
    "./src/persistence.js?v=649",
    "./src/input.js?v=649",
    "./src/game.js?v=649",
    "./src/renderer.js?v=649",
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
// Release 649 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
