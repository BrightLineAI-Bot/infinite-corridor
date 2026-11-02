const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r694-3e3a13d70a9b`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r694-3e3a13d70a9b",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r694-3e3a13d70a9b",
    "./src/proving-ground.js?v=r694-3e3a13d70a9b",
    "./src/proving-ground-fixtures.js?v=r694-3e3a13d70a9b",
    "./src/proving-ground-labs.js?v=r694-3e3a13d70a9b",
    "./src/dungeon-variation.js?v=r694-3e3a13d70a9b",
    "./src/dungeon-completion.js?v=r694-3e3a13d70a9b",
    "./src/enemy-patterns.js?v=r694-3e3a13d70a9b",
    "./src/monster-pack.js?v=r694-3e3a13d70a9b",
    "./src/monster-render.js?v=r694-3e3a13d70a9b",
    "./src/astral-worm.js?v=r694-3e3a13d70a9b",
    "./src/astral-worm-render.js?v=r694-3e3a13d70a9b",
    "./src/astral-worm-retreat.js?v=r694-3e3a13d70a9b",
    "./src/astral-worm-mount.js?v=r694-3e3a13d70a9b",
    "./src/lightning-giant-render.js?v=r694-3e3a13d70a9b",
    "./src/astral-encounters.js?v=r694-3e3a13d70a9b",
    "./src/astral-world-retreat.js?v=r694-3e3a13d70a9b",
    "./src/landscape.js?v=r694-3e3a13d70a9b",
    "./src/landscape-render.js?v=r694-3e3a13d70a9b",
    "./src/underlands.js?v=r694-3e3a13d70a9b",
    "./src/pattern-dungeons.js?v=r694-3e3a13d70a9b",
    "./src/relay-network.js?v=r694-3e3a13d70a9b",
    "./src/glyphs.js?v=r694-3e3a13d70a9b",
    "./src/echoes.js?v=r694-3e3a13d70a9b",
    "./src/constellation.js?v=r694-3e3a13d70a9b",
    "./src/water-traversal.js?v=r694-3e3a13d70a9b",
    "./src/open-sea.js?v=r694-3e3a13d70a9b",
    "./src/boats.js?v=r694-3e3a13d70a9b",
    "./src/sea-creatures.js?v=r694-3e3a13d70a9b",
    "./src/diving.js?v=r694-3e3a13d70a9b",
    "./src/grottoes.js?v=r694-3e3a13d70a9b",
    "./src/spell-slots.js?v=r694-3e3a13d70a9b",
    "./src/settlements.js?v=r694-3e3a13d70a9b",
    "./src/skirmishes.js?v=r694-3e3a13d70a9b",
    "./src/travelers.js?v=r694-3e3a13d70a9b",
    "./src/diagnostic-probe.js?v=r694-3e3a13d70a9b",
    "./src/questing-beast.js?v=r694-3e3a13d70a9b",
    "./src/recitations.js?v=r694-3e3a13d70a9b",
    "./src/lore.js?v=r694-3e3a13d70a9b",
    "./src/glimpses.js?v=r694-3e3a13d70a9b",
    "./src/glimpse-render.js?v=r694-3e3a13d70a9b",
    "./src/glimpse-paint.js?v=r694-3e3a13d70a9b",
    "./src/glimpse-scenes.js?v=r694-3e3a13d70a9b",
    "./src/glimpse-horror.js?v=r694-3e3a13d70a9b",
    "./src/glimpse-legend.js?v=r694-3e3a13d70a9b",
    "./src/glimpse-hand.js?v=r694-3e3a13d70a9b",
    "./src/atlas-view.js?v=r694-3e3a13d70a9b",
    "./src/strange.js?v=r694-3e3a13d70a9b",
    "./src/linked-dungeons.js?v=r694-3e3a13d70a9b",
    "./src/digging.js?v=r694-3e3a13d70a9b",
    "./src/building.js?v=r694-3e3a13d70a9b",
    "./src/refuge-lands.js?v=r694-3e3a13d70a9b",
    "./src/revenant-horde.js?v=r694-3e3a13d70a9b",
    "./src/stages.js?v=r694-3e3a13d70a9b",
    "./src/watcher.js?v=r694-3e3a13d70a9b",
    "./src/vehicle-gates.js?v=r694-3e3a13d70a9b",
    "./src/dungeon-ladder.js?v=r694-3e3a13d70a9b",
    "./src/potions.js?v=r694-3e3a13d70a9b",
    "./src/transit-lattice.js?v=r694-3e3a13d70a9b",
    "./src/late-spells.js?v=r694-3e3a13d70a9b",
    "./src/brawler-spells.js?v=r694-3e3a13d70a9b",
    "./src/orbit-volley.js?v=r694-3e3a13d70a9b",
    "./src/tool-forms.js?v=r694-3e3a13d70a9b",
    "./src/trees.js?v=r694-3e3a13d70a9b",
    "./src/fractured.js?v=r694-3e3a13d70a9b",
    "./src/affixes.js?v=r694-3e3a13d70a9b",
    "./src/boss-kit.js?v=r694-3e3a13d70a9b",
    "./src/stalker.js?v=r694-3e3a13d70a9b",
    "./src/stalker-render.js?v=r694-3e3a13d70a9b",
    "./src/deep-annex.js?v=r694-3e3a13d70a9b",
    "./src/the-deep.js?v=r694-3e3a13d70a9b",
    "./src/seasons.js?v=r694-3e3a13d70a9b",
    "./src/keeps.js?v=r694-3e3a13d70a9b",
    "./src/canyon.js?v=r694-3e3a13d70a9b",
    "./src/wonders.js?v=r694-3e3a13d70a9b",
    "./src/sling.js?v=r694-3e3a13d70a9b",
    "./src/atlas-colors.js?v=r694-3e3a13d70a9b",
    "./src/skylands.js?v=r694-3e3a13d70a9b",
    "./src/surveyor.js?v=r694-3e3a13d70a9b",
    "./src/torn-pages.js?v=r694-3e3a13d70a9b",
    "./src/threads.js?v=r694-3e3a13d70a9b",
    "./src/lattice-fields.js?v=r694-3e3a13d70a9b",
    "./src/dungeon-traps.js?v=r694-3e3a13d70a9b",
    "./src/listener-mirror.js?v=r694-3e3a13d70a9b",
    "./src/hometowns.js?v=r694-3e3a13d70a9b",
    "./src/listener-arena.js?v=r694-3e3a13d70a9b",
    "./src/listener-morph.js?v=r694-3e3a13d70a9b",
    "./src/build-presets.js?v=r694-3e3a13d70a9b",
    "./src/smithy.js?v=r694-3e3a13d70a9b",
    "./src/ilse.js?v=r694-3e3a13d70a9b",
    "./src/bells.js?v=r694-3e3a13d70a9b",
    "./src/meals.js?v=r694-3e3a13d70a9b",
    "./src/margins.js?v=r694-3e3a13d70a9b",
    "./src/marginalia.js?v=r694-3e3a13d70a9b",
    "./src/tyrant-hunt.js?v=r694-3e3a13d70a9b",
    "./src/world-beasts.js?v=r694-3e3a13d70a9b",
    "./src/elders.js?v=r694-3e3a13d70a9b",
    "./src/far-array.js?v=r694-3e3a13d70a9b",
    "./src/combat-visuals.js?v=r694-3e3a13d70a9b",
    "./src/dungeon-framework.js?v=r694-3e3a13d70a9b",
    "./src/elites.js?v=r694-3e3a13d70a9b",
    "./src/random.js?v=r694-3e3a13d70a9b",
    "./src/types.js?v=r694-3e3a13d70a9b",
    "./src/story.js?v=r694-3e3a13d70a9b",
    "./src/foundry.js?v=r694-3e3a13d70a9b",
    "./src/world.js?v=r694-3e3a13d70a9b",
    "./src/deep-dungeons.js?v=r694-3e3a13d70a9b",
    "./src/scenes.js?v=r694-3e3a13d70a9b",
    "./src/arenas.js?v=r694-3e3a13d70a9b",
    "./src/items.js?v=r694-3e3a13d70a9b",
    "./src/combat.js?v=r694-3e3a13d70a9b",
    "./src/interactions.js?v=r694-3e3a13d70a9b",
    "./src/persistence.js?v=r694-3e3a13d70a9b",
    "./src/input.js?v=r694-3e3a13d70a9b",
    "./src/game.js?v=r694-3e3a13d70a9b",
    "./src/renderer.js?v=r694-3e3a13d70a9b",
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
