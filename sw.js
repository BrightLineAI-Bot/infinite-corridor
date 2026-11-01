const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v675`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=675",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=675",
    "./src/proving-ground.js?v=675",
    "./src/proving-ground-fixtures.js?v=675",
    "./src/proving-ground-labs.js?v=675",
    "./src/dungeon-variation.js?v=675",
    "./src/dungeon-completion.js?v=675",
    "./src/enemy-patterns.js?v=675",
    "./src/monster-pack.js?v=675",
    "./src/monster-render.js?v=675",
    "./src/astral-worm.js?v=675",
    "./src/astral-worm-render.js?v=675",
    "./src/astral-worm-retreat.js?v=675",
    "./src/astral-worm-mount.js?v=675",
    "./src/lightning-giant-render.js?v=675",
    "./src/astral-encounters.js?v=675",
    "./src/astral-world-retreat.js?v=675",
    "./src/landscape.js?v=675",
    "./src/landscape-render.js?v=675",
    "./src/underlands.js?v=675",
    "./src/pattern-dungeons.js?v=675",
    "./src/relay-network.js?v=675",
    "./src/glyphs.js?v=675",
    "./src/echoes.js?v=675",
    "./src/constellation.js?v=675",
    "./src/water-traversal.js?v=675",
    "./src/open-sea.js?v=675",
    "./src/boats.js?v=675",
    "./src/sea-creatures.js?v=675",
    "./src/diving.js?v=675",
    "./src/grottoes.js?v=675",
    "./src/spell-slots.js?v=675",
    "./src/settlements.js?v=675",
    "./src/skirmishes.js?v=675",
    "./src/travelers.js?v=675",
    "./src/diagnostic-probe.js?v=675",
    "./src/questing-beast.js?v=675",
    "./src/recitations.js?v=675",
    "./src/lore.js?v=675",
    "./src/glimpses.js?v=675",
    "./src/glimpse-render.js?v=675",
    "./src/glimpse-paint.js?v=675",
    "./src/glimpse-scenes.js?v=675",
    "./src/glimpse-horror.js?v=675",
    "./src/glimpse-legend.js?v=675",
    "./src/glimpse-hand.js?v=675",
    "./src/atlas-view.js?v=675",
    "./src/strange.js?v=675",
    "./src/linked-dungeons.js?v=675",
    "./src/digging.js?v=675",
    "./src/building.js?v=675",
    "./src/refuge-lands.js?v=675",
    "./src/revenant-horde.js?v=675",
    "./src/stages.js?v=675",
    "./src/watcher.js?v=675",
    "./src/vehicle-gates.js?v=675",
    "./src/dungeon-ladder.js?v=675",
    "./src/potions.js?v=675",
    "./src/transit-lattice.js?v=675",
    "./src/late-spells.js?v=675",
    "./src/brawler-spells.js?v=675",
    "./src/orbit-volley.js?v=675",
    "./src/tool-forms.js?v=675",
    "./src/trees.js?v=675",
    "./src/fractured.js?v=675",
    "./src/affixes.js?v=675",
    "./src/boss-kit.js?v=675",
    "./src/deep-annex.js?v=675",
    "./src/wonders.js?v=675",
    "./src/sling.js?v=675",
    "./src/atlas-colors.js?v=675",
    "./src/skylands.js?v=675",
    "./src/surveyor.js?v=675",
    "./src/torn-pages.js?v=675",
    "./src/threads.js?v=675",
    "./src/lattice-fields.js?v=675",
    "./src/dungeon-traps.js?v=675",
    "./src/listener-mirror.js?v=675",
    "./src/hometowns.js?v=675",
    "./src/listener-arena.js?v=675",
    "./src/listener-morph.js?v=675",
    "./src/build-presets.js?v=675",
    "./src/smithy.js?v=675",
    "./src/ilse.js?v=675",
    "./src/bells.js?v=675",
    "./src/meals.js?v=675",
    "./src/margins.js?v=675",
    "./src/marginalia.js?v=675",
    "./src/tyrant-hunt.js?v=675",
    "./src/world-beasts.js?v=675",
    "./src/elders.js?v=675",
    "./src/far-array.js?v=675",
    "./src/combat-visuals.js?v=675",
    "./src/dungeon-framework.js?v=675",
    "./src/elites.js?v=675",
    "./src/random.js?v=675",
    "./src/types.js?v=675",
    "./src/story.js?v=675",
    "./src/foundry.js?v=675",
    "./src/world.js?v=675",
    "./src/deep-dungeons.js?v=675",
    "./src/scenes.js?v=675",
    "./src/arenas.js?v=675",
    "./src/items.js?v=675",
    "./src/combat.js?v=675",
    "./src/interactions.js?v=675",
    "./src/persistence.js?v=675",
    "./src/input.js?v=675",
    "./src/game.js?v=675",
    "./src/renderer.js?v=675",
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
// Release 675 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
