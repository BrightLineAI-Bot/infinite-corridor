const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r703-af870d78ba3b`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r703-af870d78ba3b",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r703-af870d78ba3b",
    "./src/proving-ground.js?v=r703-af870d78ba3b",
    "./src/proving-ground-fixtures.js?v=r703-af870d78ba3b",
    "./src/proving-ground-labs.js?v=r703-af870d78ba3b",
    "./src/dungeon-variation.js?v=r703-af870d78ba3b",
    "./src/dungeon-completion.js?v=r703-af870d78ba3b",
    "./src/enemy-patterns.js?v=r703-af870d78ba3b",
    "./src/monster-pack.js?v=r703-af870d78ba3b",
    "./src/monster-render.js?v=r703-af870d78ba3b",
    "./src/astral-worm.js?v=r703-af870d78ba3b",
    "./src/astral-worm-render.js?v=r703-af870d78ba3b",
    "./src/astral-worm-retreat.js?v=r703-af870d78ba3b",
    "./src/astral-worm-mount.js?v=r703-af870d78ba3b",
    "./src/lightning-giant-render.js?v=r703-af870d78ba3b",
    "./src/astral-encounters.js?v=r703-af870d78ba3b",
    "./src/astral-world-retreat.js?v=r703-af870d78ba3b",
    "./src/landscape.js?v=r703-af870d78ba3b",
    "./src/landscape-render.js?v=r703-af870d78ba3b",
    "./src/underlands.js?v=r703-af870d78ba3b",
    "./src/pattern-dungeons.js?v=r703-af870d78ba3b",
    "./src/relay-network.js?v=r703-af870d78ba3b",
    "./src/glyphs.js?v=r703-af870d78ba3b",
    "./src/echoes.js?v=r703-af870d78ba3b",
    "./src/constellation.js?v=r703-af870d78ba3b",
    "./src/water-traversal.js?v=r703-af870d78ba3b",
    "./src/open-sea.js?v=r703-af870d78ba3b",
    "./src/boats.js?v=r703-af870d78ba3b",
    "./src/sea-creatures.js?v=r703-af870d78ba3b",
    "./src/diving.js?v=r703-af870d78ba3b",
    "./src/grottoes.js?v=r703-af870d78ba3b",
    "./src/spell-slots.js?v=r703-af870d78ba3b",
    "./src/settlements.js?v=r703-af870d78ba3b",
    "./src/skirmishes.js?v=r703-af870d78ba3b",
    "./src/travelers.js?v=r703-af870d78ba3b",
    "./src/diagnostic-probe.js?v=r703-af870d78ba3b",
    "./src/questing-beast.js?v=r703-af870d78ba3b",
    "./src/recitations.js?v=r703-af870d78ba3b",
    "./src/lore.js?v=r703-af870d78ba3b",
    "./src/glimpses.js?v=r703-af870d78ba3b",
    "./src/glimpse-render.js?v=r703-af870d78ba3b",
    "./src/glimpse-paint.js?v=r703-af870d78ba3b",
    "./src/glimpse-scenes.js?v=r703-af870d78ba3b",
    "./src/glimpse-horror.js?v=r703-af870d78ba3b",
    "./src/glimpse-legend.js?v=r703-af870d78ba3b",
    "./src/glimpse-hand.js?v=r703-af870d78ba3b",
    "./src/atlas-view.js?v=r703-af870d78ba3b",
    "./src/strange.js?v=r703-af870d78ba3b",
    "./src/linked-dungeons.js?v=r703-af870d78ba3b",
    "./src/digging.js?v=r703-af870d78ba3b",
    "./src/building.js?v=r703-af870d78ba3b",
    "./src/refuge-lands.js?v=r703-af870d78ba3b",
    "./src/revenant-horde.js?v=r703-af870d78ba3b",
    "./src/stages.js?v=r703-af870d78ba3b",
    "./src/watcher.js?v=r703-af870d78ba3b",
    "./src/vehicle-gates.js?v=r703-af870d78ba3b",
    "./src/dungeon-ladder.js?v=r703-af870d78ba3b",
    "./src/potions.js?v=r703-af870d78ba3b",
    "./src/transit-lattice.js?v=r703-af870d78ba3b",
    "./src/late-spells.js?v=r703-af870d78ba3b",
    "./src/brawler-spells.js?v=r703-af870d78ba3b",
    "./src/orbit-volley.js?v=r703-af870d78ba3b",
    "./src/tool-forms.js?v=r703-af870d78ba3b",
    "./src/trees.js?v=r703-af870d78ba3b",
    "./src/fractured.js?v=r703-af870d78ba3b",
    "./src/affixes.js?v=r703-af870d78ba3b",
    "./src/boss-kit.js?v=r703-af870d78ba3b",
    "./src/stalker.js?v=r703-af870d78ba3b",
    "./src/stalker-render.js?v=r703-af870d78ba3b",
    "./src/deep-annex.js?v=r703-af870d78ba3b",
    "./src/the-deep.js?v=r703-af870d78ba3b",
    "./src/seasons.js?v=r703-af870d78ba3b",
    "./src/keeps.js?v=r703-af870d78ba3b",
    "./src/canyon.js?v=r703-af870d78ba3b",
    "./src/ascendancy.js?v=r703-af870d78ba3b",
    "./src/wonders.js?v=r703-af870d78ba3b",
    "./src/sling.js?v=r703-af870d78ba3b",
    "./src/atlas-colors.js?v=r703-af870d78ba3b",
    "./src/skylands.js?v=r703-af870d78ba3b",
    "./src/surveyor.js?v=r703-af870d78ba3b",
    "./src/torn-pages.js?v=r703-af870d78ba3b",
    "./src/threads.js?v=r703-af870d78ba3b",
    "./src/lattice-fields.js?v=r703-af870d78ba3b",
    "./src/dungeon-traps.js?v=r703-af870d78ba3b",
    "./src/listener-mirror.js?v=r703-af870d78ba3b",
    "./src/hometowns.js?v=r703-af870d78ba3b",
    "./src/listener-arena.js?v=r703-af870d78ba3b",
    "./src/listener-morph.js?v=r703-af870d78ba3b",
    "./src/build-presets.js?v=r703-af870d78ba3b",
    "./src/smithy.js?v=r703-af870d78ba3b",
    "./src/ilse.js?v=r703-af870d78ba3b",
    "./src/bells.js?v=r703-af870d78ba3b",
    "./src/meals.js?v=r703-af870d78ba3b",
    "./src/margins.js?v=r703-af870d78ba3b",
    "./src/marginalia.js?v=r703-af870d78ba3b",
    "./src/tyrant-hunt.js?v=r703-af870d78ba3b",
    "./src/world-beasts.js?v=r703-af870d78ba3b",
    "./src/elders.js?v=r703-af870d78ba3b",
    "./src/far-array.js?v=r703-af870d78ba3b",
    "./src/combat-visuals.js?v=r703-af870d78ba3b",
    "./src/dungeon-framework.js?v=r703-af870d78ba3b",
    "./src/elites.js?v=r703-af870d78ba3b",
    "./src/random.js?v=r703-af870d78ba3b",
    "./src/types.js?v=r703-af870d78ba3b",
    "./src/story.js?v=r703-af870d78ba3b",
    "./src/foundry.js?v=r703-af870d78ba3b",
    "./src/world.js?v=r703-af870d78ba3b",
    "./src/deep-dungeons.js?v=r703-af870d78ba3b",
    "./src/scenes.js?v=r703-af870d78ba3b",
    "./src/arenas.js?v=r703-af870d78ba3b",
    "./src/items.js?v=r703-af870d78ba3b",
    "./src/combat.js?v=r703-af870d78ba3b",
    "./src/interactions.js?v=r703-af870d78ba3b",
    "./src/persistence.js?v=r703-af870d78ba3b",
    "./src/input.js?v=r703-af870d78ba3b",
    "./src/game.js?v=r703-af870d78ba3b",
    "./src/renderer.js?v=r703-af870d78ba3b",
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
