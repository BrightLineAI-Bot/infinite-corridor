const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v657`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=657",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=657",
    "./src/proving-ground.js?v=657",
    "./src/proving-ground-fixtures.js?v=657",
    "./src/proving-ground-labs.js?v=657",
    "./src/dungeon-variation.js?v=657",
    "./src/dungeon-completion.js?v=657",
    "./src/enemy-patterns.js?v=657",
    "./src/monster-pack.js?v=657",
    "./src/monster-render.js?v=657",
    "./src/astral-worm.js?v=657",
    "./src/astral-worm-render.js?v=657",
    "./src/astral-worm-retreat.js?v=657",
    "./src/astral-worm-mount.js?v=657",
    "./src/lightning-giant-render.js?v=657",
    "./src/astral-encounters.js?v=657",
    "./src/astral-world-retreat.js?v=657",
    "./src/landscape.js?v=657",
    "./src/landscape-render.js?v=657",
    "./src/underlands.js?v=657",
    "./src/pattern-dungeons.js?v=657",
    "./src/relay-network.js?v=657",
    "./src/glyphs.js?v=657",
    "./src/echoes.js?v=657",
    "./src/constellation.js?v=657",
    "./src/water-traversal.js?v=657",
    "./src/open-sea.js?v=657",
    "./src/boats.js?v=657",
    "./src/sea-creatures.js?v=657",
    "./src/diving.js?v=657",
    "./src/grottoes.js?v=657",
    "./src/spell-slots.js?v=657",
    "./src/settlements.js?v=657",
    "./src/skirmishes.js?v=657",
    "./src/travelers.js?v=657",
    "./src/diagnostic-probe.js?v=657",
    "./src/questing-beast.js?v=657",
    "./src/recitations.js?v=657",
    "./src/lore.js?v=657",
    "./src/glimpses.js?v=657",
    "./src/glimpse-render.js?v=657",
    "./src/glimpse-paint.js?v=657",
    "./src/glimpse-scenes.js?v=657",
    "./src/glimpse-horror.js?v=657",
    "./src/glimpse-legend.js?v=657",
    "./src/glimpse-hand.js?v=657",
    "./src/atlas-view.js?v=657",
    "./src/strange.js?v=657",
    "./src/linked-dungeons.js?v=657",
    "./src/digging.js?v=657",
    "./src/building.js?v=657",
    "./src/refuge-lands.js?v=657",
    "./src/revenant-horde.js?v=657",
    "./src/stages.js?v=657",
    "./src/watcher.js?v=657",
    "./src/vehicle-gates.js?v=657",
    "./src/dungeon-ladder.js?v=657",
    "./src/potions.js?v=657",
    "./src/transit-lattice.js?v=657",
    "./src/late-spells.js?v=657",
    "./src/brawler-spells.js?v=657",
    "./src/orbit-volley.js?v=657",
    "./src/tool-forms.js?v=657",
    "./src/trees.js?v=657",
    "./src/fractured.js?v=657",
    "./src/affixes.js?v=657",
    "./src/sling.js?v=657",
    "./src/atlas-colors.js?v=657",
    "./src/skylands.js?v=657",
    "./src/surveyor.js?v=657",
    "./src/torn-pages.js?v=657",
    "./src/threads.js?v=657",
    "./src/lattice-fields.js?v=657",
    "./src/dungeon-traps.js?v=657",
    "./src/listener-mirror.js?v=657",
    "./src/hometowns.js?v=657",
    "./src/listener-arena.js?v=657",
    "./src/listener-morph.js?v=657",
    "./src/build-presets.js?v=657",
    "./src/smithy.js?v=657",
    "./src/ilse.js?v=657",
    "./src/bells.js?v=657",
    "./src/meals.js?v=657",
    "./src/margins.js?v=657",
    "./src/marginalia.js?v=657",
    "./src/tyrant-hunt.js?v=657",
    "./src/world-beasts.js?v=657",
    "./src/elders.js?v=657",
    "./src/far-array.js?v=657",
    "./src/combat-visuals.js?v=657",
    "./src/dungeon-framework.js?v=657",
    "./src/elites.js?v=657",
    "./src/random.js?v=657",
    "./src/types.js?v=657",
    "./src/story.js?v=657",
    "./src/foundry.js?v=657",
    "./src/world.js?v=657",
    "./src/deep-dungeons.js?v=657",
    "./src/scenes.js?v=657",
    "./src/arenas.js?v=657",
    "./src/items.js?v=657",
    "./src/combat.js?v=657",
    "./src/interactions.js?v=657",
    "./src/persistence.js?v=657",
    "./src/input.js?v=657",
    "./src/game.js?v=657",
    "./src/renderer.js?v=657",
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
// Release 657 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
