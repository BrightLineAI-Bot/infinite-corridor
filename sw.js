const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v633`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=633",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=633",
    "./src/proving-ground.js?v=633",
    "./src/proving-ground-fixtures.js?v=633",
    "./src/proving-ground-labs.js?v=633",
    "./src/dungeon-variation.js?v=633",
    "./src/dungeon-completion.js?v=633",
    "./src/enemy-patterns.js?v=633",
    "./src/monster-pack.js?v=633",
    "./src/monster-render.js?v=633",
    "./src/astral-worm.js?v=633",
    "./src/astral-worm-render.js?v=633",
    "./src/astral-worm-retreat.js?v=633",
    "./src/astral-worm-mount.js?v=633",
    "./src/lightning-giant-render.js?v=633",
    "./src/astral-encounters.js?v=633",
    "./src/astral-world-retreat.js?v=633",
    "./src/landscape.js?v=633",
    "./src/landscape-render.js?v=633",
    "./src/underlands.js?v=633",
    "./src/pattern-dungeons.js?v=633",
    "./src/relay-network.js?v=633",
    "./src/glyphs.js?v=633",
    "./src/echoes.js?v=633",
    "./src/constellation.js?v=633",
    "./src/water-traversal.js?v=633",
    "./src/open-sea.js?v=633",
    "./src/boats.js?v=633",
    "./src/sea-creatures.js?v=633",
    "./src/diving.js?v=633",
    "./src/grottoes.js?v=633",
    "./src/spell-slots.js?v=633",
    "./src/settlements.js?v=633",
    "./src/skirmishes.js?v=633",
    "./src/travelers.js?v=633",
    "./src/diagnostic-probe.js?v=633",
    "./src/questing-beast.js?v=633",
    "./src/recitations.js?v=633",
    "./src/lore.js?v=633",
    "./src/glimpses.js?v=633",
    "./src/glimpse-render.js?v=633",
    "./src/glimpse-paint.js?v=633",
    "./src/glimpse-scenes.js?v=633",
    "./src/glimpse-horror.js?v=633",
    "./src/glimpse-legend.js?v=633",
    "./src/glimpse-hand.js?v=633",
    "./src/atlas-view.js?v=633",
    "./src/strange.js?v=633",
    "./src/linked-dungeons.js?v=633",
    "./src/digging.js?v=633",
    "./src/building.js?v=633",
    "./src/refuge-lands.js?v=633",
    "./src/revenant-horde.js?v=633",
    "./src/stages.js?v=633",
    "./src/watcher.js?v=633",
    "./src/vehicle-gates.js?v=633",
    "./src/dungeon-ladder.js?v=633",
    "./src/potions.js?v=633",
    "./src/transit-lattice.js?v=633",
    "./src/late-spells.js?v=633",
    "./src/brawler-spells.js?v=633",
    "./src/orbit-volley.js?v=633",
    "./src/tool-forms.js?v=633",
    "./src/sling.js?v=633",
    "./src/atlas-colors.js?v=633",
    "./src/skylands.js?v=633",
    "./src/surveyor.js?v=633",
    "./src/torn-pages.js?v=633",
    "./src/threads.js?v=633",
    "./src/lattice-fields.js?v=633",
    "./src/dungeon-traps.js?v=633",
    "./src/listener-mirror.js?v=633",
    "./src/hometowns.js?v=633",
    "./src/listener-arena.js?v=633",
    "./src/listener-morph.js?v=633",
    "./src/build-presets.js?v=633",
    "./src/smithy.js?v=633",
    "./src/ilse.js?v=633",
    "./src/bells.js?v=633",
    "./src/meals.js?v=633",
    "./src/margins.js?v=633",
    "./src/marginalia.js?v=633",
    "./src/tyrant-hunt.js?v=633",
    "./src/world-beasts.js?v=633",
    "./src/elders.js?v=633",
    "./src/far-array.js?v=633",
    "./src/combat-visuals.js?v=633",
    "./src/dungeon-framework.js?v=633",
    "./src/elites.js?v=633",
    "./src/random.js?v=633",
    "./src/types.js?v=633",
    "./src/story.js?v=633",
    "./src/foundry.js?v=633",
    "./src/world.js?v=633",
    "./src/deep-dungeons.js?v=633",
    "./src/scenes.js?v=633",
    "./src/arenas.js?v=633",
    "./src/items.js?v=633",
    "./src/combat.js?v=633",
    "./src/interactions.js?v=633",
    "./src/persistence.js?v=633",
    "./src/input.js?v=633",
    "./src/game.js?v=633",
    "./src/renderer.js?v=633",
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
// Release 633 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
