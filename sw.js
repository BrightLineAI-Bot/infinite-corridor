const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v671`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=671",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=671",
    "./src/proving-ground.js?v=671",
    "./src/proving-ground-fixtures.js?v=671",
    "./src/proving-ground-labs.js?v=671",
    "./src/dungeon-variation.js?v=671",
    "./src/dungeon-completion.js?v=671",
    "./src/enemy-patterns.js?v=671",
    "./src/monster-pack.js?v=671",
    "./src/monster-render.js?v=671",
    "./src/astral-worm.js?v=671",
    "./src/astral-worm-render.js?v=671",
    "./src/astral-worm-retreat.js?v=671",
    "./src/astral-worm-mount.js?v=671",
    "./src/lightning-giant-render.js?v=671",
    "./src/astral-encounters.js?v=671",
    "./src/astral-world-retreat.js?v=671",
    "./src/landscape.js?v=671",
    "./src/landscape-render.js?v=671",
    "./src/underlands.js?v=671",
    "./src/pattern-dungeons.js?v=671",
    "./src/relay-network.js?v=671",
    "./src/glyphs.js?v=671",
    "./src/echoes.js?v=671",
    "./src/constellation.js?v=671",
    "./src/water-traversal.js?v=671",
    "./src/open-sea.js?v=671",
    "./src/boats.js?v=671",
    "./src/sea-creatures.js?v=671",
    "./src/diving.js?v=671",
    "./src/grottoes.js?v=671",
    "./src/spell-slots.js?v=671",
    "./src/settlements.js?v=671",
    "./src/skirmishes.js?v=671",
    "./src/travelers.js?v=671",
    "./src/diagnostic-probe.js?v=671",
    "./src/questing-beast.js?v=671",
    "./src/recitations.js?v=671",
    "./src/lore.js?v=671",
    "./src/glimpses.js?v=671",
    "./src/glimpse-render.js?v=671",
    "./src/glimpse-paint.js?v=671",
    "./src/glimpse-scenes.js?v=671",
    "./src/glimpse-horror.js?v=671",
    "./src/glimpse-legend.js?v=671",
    "./src/glimpse-hand.js?v=671",
    "./src/atlas-view.js?v=671",
    "./src/strange.js?v=671",
    "./src/linked-dungeons.js?v=671",
    "./src/digging.js?v=671",
    "./src/building.js?v=671",
    "./src/refuge-lands.js?v=671",
    "./src/revenant-horde.js?v=671",
    "./src/stages.js?v=671",
    "./src/watcher.js?v=671",
    "./src/vehicle-gates.js?v=671",
    "./src/dungeon-ladder.js?v=671",
    "./src/potions.js?v=671",
    "./src/transit-lattice.js?v=671",
    "./src/late-spells.js?v=671",
    "./src/brawler-spells.js?v=671",
    "./src/orbit-volley.js?v=671",
    "./src/tool-forms.js?v=671",
    "./src/trees.js?v=671",
    "./src/fractured.js?v=671",
    "./src/affixes.js?v=671",
    "./src/boss-kit.js?v=671",
    "./src/sling.js?v=671",
    "./src/atlas-colors.js?v=671",
    "./src/skylands.js?v=671",
    "./src/surveyor.js?v=671",
    "./src/torn-pages.js?v=671",
    "./src/threads.js?v=671",
    "./src/lattice-fields.js?v=671",
    "./src/dungeon-traps.js?v=671",
    "./src/listener-mirror.js?v=671",
    "./src/hometowns.js?v=671",
    "./src/listener-arena.js?v=671",
    "./src/listener-morph.js?v=671",
    "./src/build-presets.js?v=671",
    "./src/smithy.js?v=671",
    "./src/ilse.js?v=671",
    "./src/bells.js?v=671",
    "./src/meals.js?v=671",
    "./src/margins.js?v=671",
    "./src/marginalia.js?v=671",
    "./src/tyrant-hunt.js?v=671",
    "./src/world-beasts.js?v=671",
    "./src/elders.js?v=671",
    "./src/far-array.js?v=671",
    "./src/combat-visuals.js?v=671",
    "./src/dungeon-framework.js?v=671",
    "./src/elites.js?v=671",
    "./src/random.js?v=671",
    "./src/types.js?v=671",
    "./src/story.js?v=671",
    "./src/foundry.js?v=671",
    "./src/world.js?v=671",
    "./src/deep-dungeons.js?v=671",
    "./src/scenes.js?v=671",
    "./src/arenas.js?v=671",
    "./src/items.js?v=671",
    "./src/combat.js?v=671",
    "./src/interactions.js?v=671",
    "./src/persistence.js?v=671",
    "./src/input.js?v=671",
    "./src/game.js?v=671",
    "./src/renderer.js?v=671",
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
// Release 671 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
