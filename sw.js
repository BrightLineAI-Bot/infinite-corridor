const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v702`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=702",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=702",
    "./src/proving-ground.js?v=702",
    "./src/proving-ground-fixtures.js?v=702",
    "./src/proving-ground-labs.js?v=702",
    "./src/dungeon-variation.js?v=702",
    "./src/dungeon-completion.js?v=702",
    "./src/enemy-patterns.js?v=702",
    "./src/monster-pack.js?v=702",
    "./src/monster-render.js?v=702",
    "./src/astral-worm.js?v=702",
    "./src/astral-worm-render.js?v=702",
    "./src/astral-worm-retreat.js?v=702",
    "./src/astral-worm-mount.js?v=702",
    "./src/lightning-giant-render.js?v=702",
    "./src/astral-encounters.js?v=702",
    "./src/astral-world-retreat.js?v=702",
    "./src/landscape.js?v=702",
    "./src/landscape-render.js?v=702",
    "./src/underlands.js?v=702",
    "./src/pattern-dungeons.js?v=702",
    "./src/relay-network.js?v=702",
    "./src/glyphs.js?v=702",
    "./src/echoes.js?v=702",
    "./src/constellation.js?v=702",
    "./src/water-traversal.js?v=702",
    "./src/open-sea.js?v=702",
    "./src/boats.js?v=702",
    "./src/sea-creatures.js?v=702",
    "./src/diving.js?v=702",
    "./src/grottoes.js?v=702",
    "./src/spell-slots.js?v=702",
    "./src/settlements.js?v=702",
    "./src/skirmishes.js?v=702",
    "./src/travelers.js?v=702",
    "./src/diagnostic-probe.js?v=702",
    "./src/questing-beast.js?v=702",
    "./src/recitations.js?v=702",
    "./src/lore.js?v=702",
    "./src/glimpses.js?v=702",
    "./src/glimpse-render.js?v=702",
    "./src/glimpse-paint.js?v=702",
    "./src/glimpse-scenes.js?v=702",
    "./src/glimpse-horror.js?v=702",
    "./src/glimpse-legend.js?v=702",
    "./src/glimpse-hand.js?v=702",
    "./src/atlas-view.js?v=702",
    "./src/strange.js?v=702",
    "./src/linked-dungeons.js?v=702",
    "./src/digging.js?v=702",
    "./src/building.js?v=702",
    "./src/refuge-lands.js?v=702",
    "./src/revenant-horde.js?v=702",
    "./src/stages.js?v=702",
    "./src/watcher.js?v=702",
    "./src/vehicle-gates.js?v=702",
    "./src/dungeon-ladder.js?v=702",
    "./src/potions.js?v=702",
    "./src/transit-lattice.js?v=702",
    "./src/late-spells.js?v=702",
    "./src/brawler-spells.js?v=702",
    "./src/orbit-volley.js?v=702",
    "./src/tool-forms.js?v=702",
    "./src/trees.js?v=702",
    "./src/fractured.js?v=702",
    "./src/affixes.js?v=702",
    "./src/boss-kit.js?v=702",
    "./src/stalker.js?v=702",
    "./src/stalker-render.js?v=702",
    "./src/deep-annex.js?v=702",
    "./src/the-deep.js?v=702",
    "./src/seasons.js?v=702",
    "./src/keeps.js?v=702",
    "./src/canyon.js?v=702",
    "./src/ascendancy.js?v=702",
    "./src/wonders.js?v=702",
    "./src/sling.js?v=702",
    "./src/atlas-colors.js?v=702",
    "./src/skylands.js?v=702",
    "./src/surveyor.js?v=702",
    "./src/torn-pages.js?v=702",
    "./src/threads.js?v=702",
    "./src/lattice-fields.js?v=702",
    "./src/dungeon-traps.js?v=702",
    "./src/listener-mirror.js?v=702",
    "./src/hometowns.js?v=702",
    "./src/listener-arena.js?v=702",
    "./src/listener-morph.js?v=702",
    "./src/build-presets.js?v=702",
    "./src/smithy.js?v=702",
    "./src/ilse.js?v=702",
    "./src/bells.js?v=702",
    "./src/meals.js?v=702",
    "./src/margins.js?v=702",
    "./src/marginalia.js?v=702",
    "./src/tyrant-hunt.js?v=702",
    "./src/world-beasts.js?v=702",
    "./src/elders.js?v=702",
    "./src/far-array.js?v=702",
    "./src/combat-visuals.js?v=702",
    "./src/dungeon-framework.js?v=702",
    "./src/elites.js?v=702",
    "./src/random.js?v=702",
    "./src/types.js?v=702",
    "./src/story.js?v=702",
    "./src/foundry.js?v=702",
    "./src/world.js?v=702",
    "./src/deep-dungeons.js?v=702",
    "./src/scenes.js?v=702",
    "./src/arenas.js?v=702",
    "./src/items.js?v=702",
    "./src/combat.js?v=702",
    "./src/interactions.js?v=702",
    "./src/persistence.js?v=702",
    "./src/input.js?v=702",
    "./src/game.js?v=702",
    "./src/renderer.js?v=702",
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
