const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v699`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=699",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=699",
    "./src/proving-ground.js?v=699",
    "./src/proving-ground-fixtures.js?v=699",
    "./src/proving-ground-labs.js?v=699",
    "./src/dungeon-variation.js?v=699",
    "./src/dungeon-completion.js?v=699",
    "./src/enemy-patterns.js?v=699",
    "./src/monster-pack.js?v=699",
    "./src/monster-render.js?v=699",
    "./src/astral-worm.js?v=699",
    "./src/astral-worm-render.js?v=699",
    "./src/astral-worm-retreat.js?v=699",
    "./src/astral-worm-mount.js?v=699",
    "./src/lightning-giant-render.js?v=699",
    "./src/astral-encounters.js?v=699",
    "./src/astral-world-retreat.js?v=699",
    "./src/landscape.js?v=699",
    "./src/landscape-render.js?v=699",
    "./src/underlands.js?v=699",
    "./src/pattern-dungeons.js?v=699",
    "./src/relay-network.js?v=699",
    "./src/glyphs.js?v=699",
    "./src/echoes.js?v=699",
    "./src/constellation.js?v=699",
    "./src/water-traversal.js?v=699",
    "./src/open-sea.js?v=699",
    "./src/boats.js?v=699",
    "./src/sea-creatures.js?v=699",
    "./src/diving.js?v=699",
    "./src/grottoes.js?v=699",
    "./src/spell-slots.js?v=699",
    "./src/settlements.js?v=699",
    "./src/skirmishes.js?v=699",
    "./src/travelers.js?v=699",
    "./src/diagnostic-probe.js?v=699",
    "./src/questing-beast.js?v=699",
    "./src/recitations.js?v=699",
    "./src/lore.js?v=699",
    "./src/glimpses.js?v=699",
    "./src/glimpse-render.js?v=699",
    "./src/glimpse-paint.js?v=699",
    "./src/glimpse-scenes.js?v=699",
    "./src/glimpse-horror.js?v=699",
    "./src/glimpse-legend.js?v=699",
    "./src/glimpse-hand.js?v=699",
    "./src/atlas-view.js?v=699",
    "./src/strange.js?v=699",
    "./src/linked-dungeons.js?v=699",
    "./src/digging.js?v=699",
    "./src/building.js?v=699",
    "./src/refuge-lands.js?v=699",
    "./src/revenant-horde.js?v=699",
    "./src/stages.js?v=699",
    "./src/watcher.js?v=699",
    "./src/vehicle-gates.js?v=699",
    "./src/dungeon-ladder.js?v=699",
    "./src/potions.js?v=699",
    "./src/transit-lattice.js?v=699",
    "./src/late-spells.js?v=699",
    "./src/brawler-spells.js?v=699",
    "./src/orbit-volley.js?v=699",
    "./src/tool-forms.js?v=699",
    "./src/trees.js?v=699",
    "./src/fractured.js?v=699",
    "./src/affixes.js?v=699",
    "./src/boss-kit.js?v=699",
    "./src/stalker.js?v=699",
    "./src/stalker-render.js?v=699",
    "./src/deep-annex.js?v=699",
    "./src/the-deep.js?v=699",
    "./src/seasons.js?v=699",
    "./src/keeps.js?v=699",
    "./src/canyon.js?v=699",
    "./src/wonders.js?v=699",
    "./src/sling.js?v=699",
    "./src/atlas-colors.js?v=699",
    "./src/skylands.js?v=699",
    "./src/surveyor.js?v=699",
    "./src/torn-pages.js?v=699",
    "./src/threads.js?v=699",
    "./src/lattice-fields.js?v=699",
    "./src/dungeon-traps.js?v=699",
    "./src/listener-mirror.js?v=699",
    "./src/hometowns.js?v=699",
    "./src/listener-arena.js?v=699",
    "./src/listener-morph.js?v=699",
    "./src/build-presets.js?v=699",
    "./src/smithy.js?v=699",
    "./src/ilse.js?v=699",
    "./src/bells.js?v=699",
    "./src/meals.js?v=699",
    "./src/margins.js?v=699",
    "./src/marginalia.js?v=699",
    "./src/tyrant-hunt.js?v=699",
    "./src/world-beasts.js?v=699",
    "./src/elders.js?v=699",
    "./src/far-array.js?v=699",
    "./src/combat-visuals.js?v=699",
    "./src/dungeon-framework.js?v=699",
    "./src/elites.js?v=699",
    "./src/random.js?v=699",
    "./src/types.js?v=699",
    "./src/story.js?v=699",
    "./src/foundry.js?v=699",
    "./src/world.js?v=699",
    "./src/deep-dungeons.js?v=699",
    "./src/scenes.js?v=699",
    "./src/arenas.js?v=699",
    "./src/items.js?v=699",
    "./src/combat.js?v=699",
    "./src/interactions.js?v=699",
    "./src/persistence.js?v=699",
    "./src/input.js?v=699",
    "./src/game.js?v=699",
    "./src/renderer.js?v=699",
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
