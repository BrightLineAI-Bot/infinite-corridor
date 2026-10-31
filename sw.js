const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v625`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=625",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=625",
    "./src/proving-ground.js?v=625",
    "./src/proving-ground-fixtures.js?v=625",
    "./src/proving-ground-labs.js?v=625",
    "./src/dungeon-variation.js?v=625",
    "./src/dungeon-completion.js?v=625",
    "./src/enemy-patterns.js?v=625",
    "./src/monster-pack.js?v=625",
    "./src/monster-render.js?v=625",
    "./src/astral-worm.js?v=625",
    "./src/astral-worm-render.js?v=625",
    "./src/astral-worm-retreat.js?v=625",
    "./src/astral-worm-mount.js?v=625",
    "./src/lightning-giant-render.js?v=625",
    "./src/astral-encounters.js?v=625",
    "./src/astral-world-retreat.js?v=625",
    "./src/landscape.js?v=625",
    "./src/landscape-render.js?v=625",
    "./src/underlands.js?v=625",
    "./src/pattern-dungeons.js?v=625",
    "./src/relay-network.js?v=625",
    "./src/glyphs.js?v=625",
    "./src/echoes.js?v=625",
    "./src/constellation.js?v=625",
    "./src/water-traversal.js?v=625",
    "./src/open-sea.js?v=625",
    "./src/boats.js?v=625",
    "./src/sea-creatures.js?v=625",
    "./src/diving.js?v=625",
    "./src/grottoes.js?v=625",
    "./src/spell-slots.js?v=625",
    "./src/settlements.js?v=625",
    "./src/skirmishes.js?v=625",
    "./src/travelers.js?v=625",
    "./src/diagnostic-probe.js?v=625",
    "./src/questing-beast.js?v=625",
    "./src/recitations.js?v=625",
    "./src/lore.js?v=625",
    "./src/glimpses.js?v=625",
    "./src/glimpse-render.js?v=625",
    "./src/glimpse-paint.js?v=625",
    "./src/glimpse-scenes.js?v=625",
    "./src/glimpse-horror.js?v=625",
    "./src/glimpse-legend.js?v=625",
    "./src/glimpse-hand.js?v=625",
    "./src/atlas-view.js?v=625",
    "./src/strange.js?v=625",
    "./src/linked-dungeons.js?v=625",
    "./src/digging.js?v=625",
    "./src/building.js?v=625",
    "./src/refuge-lands.js?v=625",
    "./src/revenant-horde.js?v=625",
    "./src/stages.js?v=625",
    "./src/watcher.js?v=625",
    "./src/vehicle-gates.js?v=625",
    "./src/dungeon-ladder.js?v=625",
    "./src/potions.js?v=625",
    "./src/transit-lattice.js?v=625",
    "./src/late-spells.js?v=625",
    "./src/brawler-spells.js?v=625",
    "./src/orbit-volley.js?v=625",
    "./src/tool-forms.js?v=625",
    "./src/sling.js?v=625",
    "./src/atlas-colors.js?v=625",
    "./src/skylands.js?v=625",
    "./src/surveyor.js?v=625",
    "./src/torn-pages.js?v=625",
    "./src/lattice-fields.js?v=625",
    "./src/dungeon-traps.js?v=625",
    "./src/listener-mirror.js?v=625",
    "./src/hometowns.js?v=625",
    "./src/listener-arena.js?v=625",
    "./src/listener-morph.js?v=625",
    "./src/build-presets.js?v=625",
    "./src/smithy.js?v=625",
    "./src/ilse.js?v=625",
    "./src/bells.js?v=625",
    "./src/meals.js?v=625",
    "./src/margins.js?v=625",
    "./src/marginalia.js?v=625",
    "./src/tyrant-hunt.js?v=625",
    "./src/world-beasts.js?v=625",
    "./src/elders.js?v=625",
    "./src/far-array.js?v=625",
    "./src/combat-visuals.js?v=625",
    "./src/dungeon-framework.js?v=625",
    "./src/elites.js?v=625",
    "./src/random.js?v=625",
    "./src/types.js?v=625",
    "./src/story.js?v=625",
    "./src/foundry.js?v=625",
    "./src/world.js?v=625",
    "./src/deep-dungeons.js?v=625",
    "./src/scenes.js?v=625",
    "./src/arenas.js?v=625",
    "./src/items.js?v=625",
    "./src/combat.js?v=625",
    "./src/interactions.js?v=625",
    "./src/persistence.js?v=625",
    "./src/input.js?v=625",
    "./src/game.js?v=625",
    "./src/renderer.js?v=625",
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
// Release 625 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
