const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v693`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=693",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=693",
    "./src/proving-ground.js?v=693",
    "./src/proving-ground-fixtures.js?v=693",
    "./src/proving-ground-labs.js?v=693",
    "./src/dungeon-variation.js?v=693",
    "./src/dungeon-completion.js?v=693",
    "./src/enemy-patterns.js?v=693",
    "./src/monster-pack.js?v=693",
    "./src/monster-render.js?v=693",
    "./src/astral-worm.js?v=693",
    "./src/astral-worm-render.js?v=693",
    "./src/astral-worm-retreat.js?v=693",
    "./src/astral-worm-mount.js?v=693",
    "./src/lightning-giant-render.js?v=693",
    "./src/astral-encounters.js?v=693",
    "./src/astral-world-retreat.js?v=693",
    "./src/landscape.js?v=693",
    "./src/landscape-render.js?v=693",
    "./src/underlands.js?v=693",
    "./src/pattern-dungeons.js?v=693",
    "./src/relay-network.js?v=693",
    "./src/glyphs.js?v=693",
    "./src/echoes.js?v=693",
    "./src/constellation.js?v=693",
    "./src/water-traversal.js?v=693",
    "./src/open-sea.js?v=693",
    "./src/boats.js?v=693",
    "./src/sea-creatures.js?v=693",
    "./src/diving.js?v=693",
    "./src/grottoes.js?v=693",
    "./src/spell-slots.js?v=693",
    "./src/settlements.js?v=693",
    "./src/skirmishes.js?v=693",
    "./src/travelers.js?v=693",
    "./src/diagnostic-probe.js?v=693",
    "./src/questing-beast.js?v=693",
    "./src/recitations.js?v=693",
    "./src/lore.js?v=693",
    "./src/glimpses.js?v=693",
    "./src/glimpse-render.js?v=693",
    "./src/glimpse-paint.js?v=693",
    "./src/glimpse-scenes.js?v=693",
    "./src/glimpse-horror.js?v=693",
    "./src/glimpse-legend.js?v=693",
    "./src/glimpse-hand.js?v=693",
    "./src/atlas-view.js?v=693",
    "./src/strange.js?v=693",
    "./src/linked-dungeons.js?v=693",
    "./src/digging.js?v=693",
    "./src/building.js?v=693",
    "./src/refuge-lands.js?v=693",
    "./src/revenant-horde.js?v=693",
    "./src/stages.js?v=693",
    "./src/watcher.js?v=693",
    "./src/vehicle-gates.js?v=693",
    "./src/dungeon-ladder.js?v=693",
    "./src/potions.js?v=693",
    "./src/transit-lattice.js?v=693",
    "./src/late-spells.js?v=693",
    "./src/brawler-spells.js?v=693",
    "./src/orbit-volley.js?v=693",
    "./src/tool-forms.js?v=693",
    "./src/trees.js?v=693",
    "./src/fractured.js?v=693",
    "./src/affixes.js?v=693",
    "./src/boss-kit.js?v=693",
    "./src/stalker.js?v=693",
    "./src/stalker-render.js?v=693",
    "./src/deep-annex.js?v=693",
    "./src/the-deep.js?v=693",
    "./src/seasons.js?v=693",
    "./src/keeps.js?v=693",
    "./src/canyon.js?v=693",
    "./src/wonders.js?v=693",
    "./src/sling.js?v=693",
    "./src/atlas-colors.js?v=693",
    "./src/skylands.js?v=693",
    "./src/surveyor.js?v=693",
    "./src/torn-pages.js?v=693",
    "./src/threads.js?v=693",
    "./src/lattice-fields.js?v=693",
    "./src/dungeon-traps.js?v=693",
    "./src/listener-mirror.js?v=693",
    "./src/hometowns.js?v=693",
    "./src/listener-arena.js?v=693",
    "./src/listener-morph.js?v=693",
    "./src/build-presets.js?v=693",
    "./src/smithy.js?v=693",
    "./src/ilse.js?v=693",
    "./src/bells.js?v=693",
    "./src/meals.js?v=693",
    "./src/margins.js?v=693",
    "./src/marginalia.js?v=693",
    "./src/tyrant-hunt.js?v=693",
    "./src/world-beasts.js?v=693",
    "./src/elders.js?v=693",
    "./src/far-array.js?v=693",
    "./src/combat-visuals.js?v=693",
    "./src/dungeon-framework.js?v=693",
    "./src/elites.js?v=693",
    "./src/random.js?v=693",
    "./src/types.js?v=693",
    "./src/story.js?v=693",
    "./src/foundry.js?v=693",
    "./src/world.js?v=693",
    "./src/deep-dungeons.js?v=693",
    "./src/scenes.js?v=693",
    "./src/arenas.js?v=693",
    "./src/items.js?v=693",
    "./src/combat.js?v=693",
    "./src/interactions.js?v=693",
    "./src/persistence.js?v=693",
    "./src/input.js?v=693",
    "./src/game.js?v=693",
    "./src/renderer.js?v=693",
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
