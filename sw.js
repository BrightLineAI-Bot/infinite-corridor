const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v627`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=627",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=627",
    "./src/proving-ground.js?v=627",
    "./src/proving-ground-fixtures.js?v=627",
    "./src/proving-ground-labs.js?v=627",
    "./src/dungeon-variation.js?v=627",
    "./src/dungeon-completion.js?v=627",
    "./src/enemy-patterns.js?v=627",
    "./src/monster-pack.js?v=627",
    "./src/monster-render.js?v=627",
    "./src/astral-worm.js?v=627",
    "./src/astral-worm-render.js?v=627",
    "./src/astral-worm-retreat.js?v=627",
    "./src/astral-worm-mount.js?v=627",
    "./src/lightning-giant-render.js?v=627",
    "./src/astral-encounters.js?v=627",
    "./src/astral-world-retreat.js?v=627",
    "./src/landscape.js?v=627",
    "./src/landscape-render.js?v=627",
    "./src/underlands.js?v=627",
    "./src/pattern-dungeons.js?v=627",
    "./src/relay-network.js?v=627",
    "./src/glyphs.js?v=627",
    "./src/echoes.js?v=627",
    "./src/constellation.js?v=627",
    "./src/water-traversal.js?v=627",
    "./src/open-sea.js?v=627",
    "./src/boats.js?v=627",
    "./src/sea-creatures.js?v=627",
    "./src/diving.js?v=627",
    "./src/grottoes.js?v=627",
    "./src/spell-slots.js?v=627",
    "./src/settlements.js?v=627",
    "./src/skirmishes.js?v=627",
    "./src/travelers.js?v=627",
    "./src/diagnostic-probe.js?v=627",
    "./src/questing-beast.js?v=627",
    "./src/recitations.js?v=627",
    "./src/lore.js?v=627",
    "./src/glimpses.js?v=627",
    "./src/glimpse-render.js?v=627",
    "./src/glimpse-paint.js?v=627",
    "./src/glimpse-scenes.js?v=627",
    "./src/glimpse-horror.js?v=627",
    "./src/glimpse-legend.js?v=627",
    "./src/glimpse-hand.js?v=627",
    "./src/atlas-view.js?v=627",
    "./src/strange.js?v=627",
    "./src/linked-dungeons.js?v=627",
    "./src/digging.js?v=627",
    "./src/building.js?v=627",
    "./src/refuge-lands.js?v=627",
    "./src/revenant-horde.js?v=627",
    "./src/stages.js?v=627",
    "./src/watcher.js?v=627",
    "./src/vehicle-gates.js?v=627",
    "./src/dungeon-ladder.js?v=627",
    "./src/potions.js?v=627",
    "./src/transit-lattice.js?v=627",
    "./src/late-spells.js?v=627",
    "./src/brawler-spells.js?v=627",
    "./src/orbit-volley.js?v=627",
    "./src/tool-forms.js?v=627",
    "./src/sling.js?v=627",
    "./src/atlas-colors.js?v=627",
    "./src/skylands.js?v=627",
    "./src/surveyor.js?v=627",
    "./src/torn-pages.js?v=627",
    "./src/threads.js?v=627",
    "./src/lattice-fields.js?v=627",
    "./src/dungeon-traps.js?v=627",
    "./src/listener-mirror.js?v=627",
    "./src/hometowns.js?v=627",
    "./src/listener-arena.js?v=627",
    "./src/listener-morph.js?v=627",
    "./src/build-presets.js?v=627",
    "./src/smithy.js?v=627",
    "./src/ilse.js?v=627",
    "./src/bells.js?v=627",
    "./src/meals.js?v=627",
    "./src/margins.js?v=627",
    "./src/marginalia.js?v=627",
    "./src/tyrant-hunt.js?v=627",
    "./src/world-beasts.js?v=627",
    "./src/elders.js?v=627",
    "./src/far-array.js?v=627",
    "./src/combat-visuals.js?v=627",
    "./src/dungeon-framework.js?v=627",
    "./src/elites.js?v=627",
    "./src/random.js?v=627",
    "./src/types.js?v=627",
    "./src/story.js?v=627",
    "./src/foundry.js?v=627",
    "./src/world.js?v=627",
    "./src/deep-dungeons.js?v=627",
    "./src/scenes.js?v=627",
    "./src/arenas.js?v=627",
    "./src/items.js?v=627",
    "./src/combat.js?v=627",
    "./src/interactions.js?v=627",
    "./src/persistence.js?v=627",
    "./src/input.js?v=627",
    "./src/game.js?v=627",
    "./src/renderer.js?v=627",
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
// Release 627 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
