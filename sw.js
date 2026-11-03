const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v704`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=704",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=704",
    "./src/proving-ground.js?v=704",
    "./src/proving-ground-fixtures.js?v=704",
    "./src/proving-ground-labs.js?v=704",
    "./src/dungeon-variation.js?v=704",
    "./src/dungeon-completion.js?v=704",
    "./src/enemy-patterns.js?v=704",
    "./src/monster-pack.js?v=704",
    "./src/monster-render.js?v=704",
    "./src/astral-worm.js?v=704",
    "./src/astral-worm-render.js?v=704",
    "./src/astral-worm-retreat.js?v=704",
    "./src/astral-worm-mount.js?v=704",
    "./src/lightning-giant-render.js?v=704",
    "./src/astral-encounters.js?v=704",
    "./src/astral-world-retreat.js?v=704",
    "./src/landscape.js?v=704",
    "./src/landscape-render.js?v=704",
    "./src/underlands.js?v=704",
    "./src/pattern-dungeons.js?v=704",
    "./src/relay-network.js?v=704",
    "./src/glyphs.js?v=704",
    "./src/echoes.js?v=704",
    "./src/constellation.js?v=704",
    "./src/water-traversal.js?v=704",
    "./src/open-sea.js?v=704",
    "./src/boats.js?v=704",
    "./src/sea-creatures.js?v=704",
    "./src/diving.js?v=704",
    "./src/grottoes.js?v=704",
    "./src/spell-slots.js?v=704",
    "./src/settlements.js?v=704",
    "./src/skirmishes.js?v=704",
    "./src/travelers.js?v=704",
    "./src/diagnostic-probe.js?v=704",
    "./src/questing-beast.js?v=704",
    "./src/recitations.js?v=704",
    "./src/lore.js?v=704",
    "./src/glimpses.js?v=704",
    "./src/glimpse-render.js?v=704",
    "./src/glimpse-paint.js?v=704",
    "./src/glimpse-scenes.js?v=704",
    "./src/glimpse-horror.js?v=704",
    "./src/glimpse-legend.js?v=704",
    "./src/glimpse-hand.js?v=704",
    "./src/atlas-view.js?v=704",
    "./src/strange.js?v=704",
    "./src/linked-dungeons.js?v=704",
    "./src/digging.js?v=704",
    "./src/building.js?v=704",
    "./src/refuge-lands.js?v=704",
    "./src/revenant-horde.js?v=704",
    "./src/stages.js?v=704",
    "./src/watcher.js?v=704",
    "./src/vehicle-gates.js?v=704",
    "./src/dungeon-ladder.js?v=704",
    "./src/potions.js?v=704",
    "./src/transit-lattice.js?v=704",
    "./src/late-spells.js?v=704",
    "./src/brawler-spells.js?v=704",
    "./src/orbit-volley.js?v=704",
    "./src/tool-forms.js?v=704",
    "./src/trees.js?v=704",
    "./src/fractured.js?v=704",
    "./src/affixes.js?v=704",
    "./src/boss-kit.js?v=704",
    "./src/stalker.js?v=704",
    "./src/stalker-render.js?v=704",
    "./src/deep-annex.js?v=704",
    "./src/the-deep.js?v=704",
    "./src/seasons.js?v=704",
    "./src/keeps.js?v=704",
    "./src/canyon.js?v=704",
    "./src/ascendancy.js?v=704",
    "./src/wonders.js?v=704",
    "./src/sling.js?v=704",
    "./src/atlas-colors.js?v=704",
    "./src/skylands.js?v=704",
    "./src/surveyor.js?v=704",
    "./src/torn-pages.js?v=704",
    "./src/threads.js?v=704",
    "./src/lattice-fields.js?v=704",
    "./src/dungeon-traps.js?v=704",
    "./src/listener-mirror.js?v=704",
    "./src/hometowns.js?v=704",
    "./src/listener-arena.js?v=704",
    "./src/listener-morph.js?v=704",
    "./src/build-presets.js?v=704",
    "./src/smithy.js?v=704",
    "./src/ilse.js?v=704",
    "./src/bells.js?v=704",
    "./src/meals.js?v=704",
    "./src/margins.js?v=704",
    "./src/marginalia.js?v=704",
    "./src/tyrant-hunt.js?v=704",
    "./src/world-beasts.js?v=704",
    "./src/elders.js?v=704",
    "./src/far-array.js?v=704",
    "./src/combat-visuals.js?v=704",
    "./src/dungeon-framework.js?v=704",
    "./src/elites.js?v=704",
    "./src/random.js?v=704",
    "./src/types.js?v=704",
    "./src/story.js?v=704",
    "./src/foundry.js?v=704",
    "./src/world.js?v=704",
    "./src/deep-dungeons.js?v=704",
    "./src/scenes.js?v=704",
    "./src/arenas.js?v=704",
    "./src/items.js?v=704",
    "./src/combat.js?v=704",
    "./src/interactions.js?v=704",
    "./src/persistence.js?v=704",
    "./src/input.js?v=704",
    "./src/game.js?v=704",
    "./src/renderer.js?v=704",
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
