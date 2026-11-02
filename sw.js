const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r696-e26c69802a93`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r696-e26c69802a93",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r696-e26c69802a93",
    "./src/proving-ground.js?v=r696-e26c69802a93",
    "./src/proving-ground-fixtures.js?v=r696-e26c69802a93",
    "./src/proving-ground-labs.js?v=r696-e26c69802a93",
    "./src/dungeon-variation.js?v=r696-e26c69802a93",
    "./src/dungeon-completion.js?v=r696-e26c69802a93",
    "./src/enemy-patterns.js?v=r696-e26c69802a93",
    "./src/monster-pack.js?v=r696-e26c69802a93",
    "./src/monster-render.js?v=r696-e26c69802a93",
    "./src/astral-worm.js?v=r696-e26c69802a93",
    "./src/astral-worm-render.js?v=r696-e26c69802a93",
    "./src/astral-worm-retreat.js?v=r696-e26c69802a93",
    "./src/astral-worm-mount.js?v=r696-e26c69802a93",
    "./src/lightning-giant-render.js?v=r696-e26c69802a93",
    "./src/astral-encounters.js?v=r696-e26c69802a93",
    "./src/astral-world-retreat.js?v=r696-e26c69802a93",
    "./src/landscape.js?v=r696-e26c69802a93",
    "./src/landscape-render.js?v=r696-e26c69802a93",
    "./src/underlands.js?v=r696-e26c69802a93",
    "./src/pattern-dungeons.js?v=r696-e26c69802a93",
    "./src/relay-network.js?v=r696-e26c69802a93",
    "./src/glyphs.js?v=r696-e26c69802a93",
    "./src/echoes.js?v=r696-e26c69802a93",
    "./src/constellation.js?v=r696-e26c69802a93",
    "./src/water-traversal.js?v=r696-e26c69802a93",
    "./src/open-sea.js?v=r696-e26c69802a93",
    "./src/boats.js?v=r696-e26c69802a93",
    "./src/sea-creatures.js?v=r696-e26c69802a93",
    "./src/diving.js?v=r696-e26c69802a93",
    "./src/grottoes.js?v=r696-e26c69802a93",
    "./src/spell-slots.js?v=r696-e26c69802a93",
    "./src/settlements.js?v=r696-e26c69802a93",
    "./src/skirmishes.js?v=r696-e26c69802a93",
    "./src/travelers.js?v=r696-e26c69802a93",
    "./src/diagnostic-probe.js?v=r696-e26c69802a93",
    "./src/questing-beast.js?v=r696-e26c69802a93",
    "./src/recitations.js?v=r696-e26c69802a93",
    "./src/lore.js?v=r696-e26c69802a93",
    "./src/glimpses.js?v=r696-e26c69802a93",
    "./src/glimpse-render.js?v=r696-e26c69802a93",
    "./src/glimpse-paint.js?v=r696-e26c69802a93",
    "./src/glimpse-scenes.js?v=r696-e26c69802a93",
    "./src/glimpse-horror.js?v=r696-e26c69802a93",
    "./src/glimpse-legend.js?v=r696-e26c69802a93",
    "./src/glimpse-hand.js?v=r696-e26c69802a93",
    "./src/atlas-view.js?v=r696-e26c69802a93",
    "./src/strange.js?v=r696-e26c69802a93",
    "./src/linked-dungeons.js?v=r696-e26c69802a93",
    "./src/digging.js?v=r696-e26c69802a93",
    "./src/building.js?v=r696-e26c69802a93",
    "./src/refuge-lands.js?v=r696-e26c69802a93",
    "./src/revenant-horde.js?v=r696-e26c69802a93",
    "./src/stages.js?v=r696-e26c69802a93",
    "./src/watcher.js?v=r696-e26c69802a93",
    "./src/vehicle-gates.js?v=r696-e26c69802a93",
    "./src/dungeon-ladder.js?v=r696-e26c69802a93",
    "./src/potions.js?v=r696-e26c69802a93",
    "./src/transit-lattice.js?v=r696-e26c69802a93",
    "./src/late-spells.js?v=r696-e26c69802a93",
    "./src/brawler-spells.js?v=r696-e26c69802a93",
    "./src/orbit-volley.js?v=r696-e26c69802a93",
    "./src/tool-forms.js?v=r696-e26c69802a93",
    "./src/trees.js?v=r696-e26c69802a93",
    "./src/fractured.js?v=r696-e26c69802a93",
    "./src/affixes.js?v=r696-e26c69802a93",
    "./src/boss-kit.js?v=r696-e26c69802a93",
    "./src/stalker.js?v=r696-e26c69802a93",
    "./src/stalker-render.js?v=r696-e26c69802a93",
    "./src/deep-annex.js?v=r696-e26c69802a93",
    "./src/the-deep.js?v=r696-e26c69802a93",
    "./src/seasons.js?v=r696-e26c69802a93",
    "./src/keeps.js?v=r696-e26c69802a93",
    "./src/canyon.js?v=r696-e26c69802a93",
    "./src/wonders.js?v=r696-e26c69802a93",
    "./src/sling.js?v=r696-e26c69802a93",
    "./src/atlas-colors.js?v=r696-e26c69802a93",
    "./src/skylands.js?v=r696-e26c69802a93",
    "./src/surveyor.js?v=r696-e26c69802a93",
    "./src/torn-pages.js?v=r696-e26c69802a93",
    "./src/threads.js?v=r696-e26c69802a93",
    "./src/lattice-fields.js?v=r696-e26c69802a93",
    "./src/dungeon-traps.js?v=r696-e26c69802a93",
    "./src/listener-mirror.js?v=r696-e26c69802a93",
    "./src/hometowns.js?v=r696-e26c69802a93",
    "./src/listener-arena.js?v=r696-e26c69802a93",
    "./src/listener-morph.js?v=r696-e26c69802a93",
    "./src/build-presets.js?v=r696-e26c69802a93",
    "./src/smithy.js?v=r696-e26c69802a93",
    "./src/ilse.js?v=r696-e26c69802a93",
    "./src/bells.js?v=r696-e26c69802a93",
    "./src/meals.js?v=r696-e26c69802a93",
    "./src/margins.js?v=r696-e26c69802a93",
    "./src/marginalia.js?v=r696-e26c69802a93",
    "./src/tyrant-hunt.js?v=r696-e26c69802a93",
    "./src/world-beasts.js?v=r696-e26c69802a93",
    "./src/elders.js?v=r696-e26c69802a93",
    "./src/far-array.js?v=r696-e26c69802a93",
    "./src/combat-visuals.js?v=r696-e26c69802a93",
    "./src/dungeon-framework.js?v=r696-e26c69802a93",
    "./src/elites.js?v=r696-e26c69802a93",
    "./src/random.js?v=r696-e26c69802a93",
    "./src/types.js?v=r696-e26c69802a93",
    "./src/story.js?v=r696-e26c69802a93",
    "./src/foundry.js?v=r696-e26c69802a93",
    "./src/world.js?v=r696-e26c69802a93",
    "./src/deep-dungeons.js?v=r696-e26c69802a93",
    "./src/scenes.js?v=r696-e26c69802a93",
    "./src/arenas.js?v=r696-e26c69802a93",
    "./src/items.js?v=r696-e26c69802a93",
    "./src/combat.js?v=r696-e26c69802a93",
    "./src/interactions.js?v=r696-e26c69802a93",
    "./src/persistence.js?v=r696-e26c69802a93",
    "./src/input.js?v=r696-e26c69802a93",
    "./src/game.js?v=r696-e26c69802a93",
    "./src/renderer.js?v=r696-e26c69802a93",
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
// Release 679 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
