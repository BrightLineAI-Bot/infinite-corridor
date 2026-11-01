const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v690`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=690",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=690",
    "./src/proving-ground.js?v=690",
    "./src/proving-ground-fixtures.js?v=690",
    "./src/proving-ground-labs.js?v=690",
    "./src/dungeon-variation.js?v=690",
    "./src/dungeon-completion.js?v=690",
    "./src/enemy-patterns.js?v=690",
    "./src/monster-pack.js?v=690",
    "./src/monster-render.js?v=690",
    "./src/astral-worm.js?v=690",
    "./src/astral-worm-render.js?v=690",
    "./src/astral-worm-retreat.js?v=690",
    "./src/astral-worm-mount.js?v=690",
    "./src/lightning-giant-render.js?v=690",
    "./src/astral-encounters.js?v=690",
    "./src/astral-world-retreat.js?v=690",
    "./src/landscape.js?v=690",
    "./src/landscape-render.js?v=690",
    "./src/underlands.js?v=690",
    "./src/pattern-dungeons.js?v=690",
    "./src/relay-network.js?v=690",
    "./src/glyphs.js?v=690",
    "./src/echoes.js?v=690",
    "./src/constellation.js?v=690",
    "./src/water-traversal.js?v=690",
    "./src/open-sea.js?v=690",
    "./src/boats.js?v=690",
    "./src/sea-creatures.js?v=690",
    "./src/diving.js?v=690",
    "./src/grottoes.js?v=690",
    "./src/spell-slots.js?v=690",
    "./src/settlements.js?v=690",
    "./src/skirmishes.js?v=690",
    "./src/travelers.js?v=690",
    "./src/diagnostic-probe.js?v=690",
    "./src/questing-beast.js?v=690",
    "./src/recitations.js?v=690",
    "./src/lore.js?v=690",
    "./src/glimpses.js?v=690",
    "./src/glimpse-render.js?v=690",
    "./src/glimpse-paint.js?v=690",
    "./src/glimpse-scenes.js?v=690",
    "./src/glimpse-horror.js?v=690",
    "./src/glimpse-legend.js?v=690",
    "./src/glimpse-hand.js?v=690",
    "./src/atlas-view.js?v=690",
    "./src/strange.js?v=690",
    "./src/linked-dungeons.js?v=690",
    "./src/digging.js?v=690",
    "./src/building.js?v=690",
    "./src/refuge-lands.js?v=690",
    "./src/revenant-horde.js?v=690",
    "./src/stages.js?v=690",
    "./src/watcher.js?v=690",
    "./src/vehicle-gates.js?v=690",
    "./src/dungeon-ladder.js?v=690",
    "./src/potions.js?v=690",
    "./src/transit-lattice.js?v=690",
    "./src/late-spells.js?v=690",
    "./src/brawler-spells.js?v=690",
    "./src/orbit-volley.js?v=690",
    "./src/tool-forms.js?v=690",
    "./src/trees.js?v=690",
    "./src/fractured.js?v=690",
    "./src/affixes.js?v=690",
    "./src/boss-kit.js?v=690",
    "./src/stalker.js?v=690",
    "./src/stalker-render.js?v=690",
    "./src/deep-annex.js?v=690",
    "./src/the-deep.js?v=690",
    "./src/seasons.js?v=690",
    "./src/keeps.js?v=690",
    "./src/canyon.js?v=690",
    "./src/wonders.js?v=690",
    "./src/sling.js?v=690",
    "./src/atlas-colors.js?v=690",
    "./src/skylands.js?v=690",
    "./src/surveyor.js?v=690",
    "./src/torn-pages.js?v=690",
    "./src/threads.js?v=690",
    "./src/lattice-fields.js?v=690",
    "./src/dungeon-traps.js?v=690",
    "./src/listener-mirror.js?v=690",
    "./src/hometowns.js?v=690",
    "./src/listener-arena.js?v=690",
    "./src/listener-morph.js?v=690",
    "./src/build-presets.js?v=690",
    "./src/smithy.js?v=690",
    "./src/ilse.js?v=690",
    "./src/bells.js?v=690",
    "./src/meals.js?v=690",
    "./src/margins.js?v=690",
    "./src/marginalia.js?v=690",
    "./src/tyrant-hunt.js?v=690",
    "./src/world-beasts.js?v=690",
    "./src/elders.js?v=690",
    "./src/far-array.js?v=690",
    "./src/combat-visuals.js?v=690",
    "./src/dungeon-framework.js?v=690",
    "./src/elites.js?v=690",
    "./src/random.js?v=690",
    "./src/types.js?v=690",
    "./src/story.js?v=690",
    "./src/foundry.js?v=690",
    "./src/world.js?v=690",
    "./src/deep-dungeons.js?v=690",
    "./src/scenes.js?v=690",
    "./src/arenas.js?v=690",
    "./src/items.js?v=690",
    "./src/combat.js?v=690",
    "./src/interactions.js?v=690",
    "./src/persistence.js?v=690",
    "./src/input.js?v=690",
    "./src/game.js?v=690",
    "./src/renderer.js?v=690",
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
