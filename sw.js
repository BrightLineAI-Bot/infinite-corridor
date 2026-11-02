const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r697-e2e463537af2`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r697-e2e463537af2",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r697-e2e463537af2",
    "./src/proving-ground.js?v=r697-e2e463537af2",
    "./src/proving-ground-fixtures.js?v=r697-e2e463537af2",
    "./src/proving-ground-labs.js?v=r697-e2e463537af2",
    "./src/dungeon-variation.js?v=r697-e2e463537af2",
    "./src/dungeon-completion.js?v=r697-e2e463537af2",
    "./src/enemy-patterns.js?v=r697-e2e463537af2",
    "./src/monster-pack.js?v=r697-e2e463537af2",
    "./src/monster-render.js?v=r697-e2e463537af2",
    "./src/astral-worm.js?v=r697-e2e463537af2",
    "./src/astral-worm-render.js?v=r697-e2e463537af2",
    "./src/astral-worm-retreat.js?v=r697-e2e463537af2",
    "./src/astral-worm-mount.js?v=r697-e2e463537af2",
    "./src/lightning-giant-render.js?v=r697-e2e463537af2",
    "./src/astral-encounters.js?v=r697-e2e463537af2",
    "./src/astral-world-retreat.js?v=r697-e2e463537af2",
    "./src/landscape.js?v=r697-e2e463537af2",
    "./src/landscape-render.js?v=r697-e2e463537af2",
    "./src/underlands.js?v=r697-e2e463537af2",
    "./src/pattern-dungeons.js?v=r697-e2e463537af2",
    "./src/relay-network.js?v=r697-e2e463537af2",
    "./src/glyphs.js?v=r697-e2e463537af2",
    "./src/echoes.js?v=r697-e2e463537af2",
    "./src/constellation.js?v=r697-e2e463537af2",
    "./src/water-traversal.js?v=r697-e2e463537af2",
    "./src/open-sea.js?v=r697-e2e463537af2",
    "./src/boats.js?v=r697-e2e463537af2",
    "./src/sea-creatures.js?v=r697-e2e463537af2",
    "./src/diving.js?v=r697-e2e463537af2",
    "./src/grottoes.js?v=r697-e2e463537af2",
    "./src/spell-slots.js?v=r697-e2e463537af2",
    "./src/settlements.js?v=r697-e2e463537af2",
    "./src/skirmishes.js?v=r697-e2e463537af2",
    "./src/travelers.js?v=r697-e2e463537af2",
    "./src/diagnostic-probe.js?v=r697-e2e463537af2",
    "./src/questing-beast.js?v=r697-e2e463537af2",
    "./src/recitations.js?v=r697-e2e463537af2",
    "./src/lore.js?v=r697-e2e463537af2",
    "./src/glimpses.js?v=r697-e2e463537af2",
    "./src/glimpse-render.js?v=r697-e2e463537af2",
    "./src/glimpse-paint.js?v=r697-e2e463537af2",
    "./src/glimpse-scenes.js?v=r697-e2e463537af2",
    "./src/glimpse-horror.js?v=r697-e2e463537af2",
    "./src/glimpse-legend.js?v=r697-e2e463537af2",
    "./src/glimpse-hand.js?v=r697-e2e463537af2",
    "./src/atlas-view.js?v=r697-e2e463537af2",
    "./src/strange.js?v=r697-e2e463537af2",
    "./src/linked-dungeons.js?v=r697-e2e463537af2",
    "./src/digging.js?v=r697-e2e463537af2",
    "./src/building.js?v=r697-e2e463537af2",
    "./src/refuge-lands.js?v=r697-e2e463537af2",
    "./src/revenant-horde.js?v=r697-e2e463537af2",
    "./src/stages.js?v=r697-e2e463537af2",
    "./src/watcher.js?v=r697-e2e463537af2",
    "./src/vehicle-gates.js?v=r697-e2e463537af2",
    "./src/dungeon-ladder.js?v=r697-e2e463537af2",
    "./src/potions.js?v=r697-e2e463537af2",
    "./src/transit-lattice.js?v=r697-e2e463537af2",
    "./src/late-spells.js?v=r697-e2e463537af2",
    "./src/brawler-spells.js?v=r697-e2e463537af2",
    "./src/orbit-volley.js?v=r697-e2e463537af2",
    "./src/tool-forms.js?v=r697-e2e463537af2",
    "./src/trees.js?v=r697-e2e463537af2",
    "./src/fractured.js?v=r697-e2e463537af2",
    "./src/affixes.js?v=r697-e2e463537af2",
    "./src/boss-kit.js?v=r697-e2e463537af2",
    "./src/stalker.js?v=r697-e2e463537af2",
    "./src/stalker-render.js?v=r697-e2e463537af2",
    "./src/deep-annex.js?v=r697-e2e463537af2",
    "./src/the-deep.js?v=r697-e2e463537af2",
    "./src/seasons.js?v=r697-e2e463537af2",
    "./src/keeps.js?v=r697-e2e463537af2",
    "./src/canyon.js?v=r697-e2e463537af2",
    "./src/wonders.js?v=r697-e2e463537af2",
    "./src/sling.js?v=r697-e2e463537af2",
    "./src/atlas-colors.js?v=r697-e2e463537af2",
    "./src/skylands.js?v=r697-e2e463537af2",
    "./src/surveyor.js?v=r697-e2e463537af2",
    "./src/torn-pages.js?v=r697-e2e463537af2",
    "./src/threads.js?v=r697-e2e463537af2",
    "./src/lattice-fields.js?v=r697-e2e463537af2",
    "./src/dungeon-traps.js?v=r697-e2e463537af2",
    "./src/listener-mirror.js?v=r697-e2e463537af2",
    "./src/hometowns.js?v=r697-e2e463537af2",
    "./src/listener-arena.js?v=r697-e2e463537af2",
    "./src/listener-morph.js?v=r697-e2e463537af2",
    "./src/build-presets.js?v=r697-e2e463537af2",
    "./src/smithy.js?v=r697-e2e463537af2",
    "./src/ilse.js?v=r697-e2e463537af2",
    "./src/bells.js?v=r697-e2e463537af2",
    "./src/meals.js?v=r697-e2e463537af2",
    "./src/margins.js?v=r697-e2e463537af2",
    "./src/marginalia.js?v=r697-e2e463537af2",
    "./src/tyrant-hunt.js?v=r697-e2e463537af2",
    "./src/world-beasts.js?v=r697-e2e463537af2",
    "./src/elders.js?v=r697-e2e463537af2",
    "./src/far-array.js?v=r697-e2e463537af2",
    "./src/combat-visuals.js?v=r697-e2e463537af2",
    "./src/dungeon-framework.js?v=r697-e2e463537af2",
    "./src/elites.js?v=r697-e2e463537af2",
    "./src/random.js?v=r697-e2e463537af2",
    "./src/types.js?v=r697-e2e463537af2",
    "./src/story.js?v=r697-e2e463537af2",
    "./src/foundry.js?v=r697-e2e463537af2",
    "./src/world.js?v=r697-e2e463537af2",
    "./src/deep-dungeons.js?v=r697-e2e463537af2",
    "./src/scenes.js?v=r697-e2e463537af2",
    "./src/arenas.js?v=r697-e2e463537af2",
    "./src/items.js?v=r697-e2e463537af2",
    "./src/combat.js?v=r697-e2e463537af2",
    "./src/interactions.js?v=r697-e2e463537af2",
    "./src/persistence.js?v=r697-e2e463537af2",
    "./src/input.js?v=r697-e2e463537af2",
    "./src/game.js?v=r697-e2e463537af2",
    "./src/renderer.js?v=r697-e2e463537af2",
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
