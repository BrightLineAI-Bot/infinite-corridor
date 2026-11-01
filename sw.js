const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v661`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=661",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=661",
    "./src/proving-ground.js?v=661",
    "./src/proving-ground-fixtures.js?v=661",
    "./src/proving-ground-labs.js?v=661",
    "./src/dungeon-variation.js?v=661",
    "./src/dungeon-completion.js?v=661",
    "./src/enemy-patterns.js?v=661",
    "./src/monster-pack.js?v=661",
    "./src/monster-render.js?v=661",
    "./src/astral-worm.js?v=661",
    "./src/astral-worm-render.js?v=661",
    "./src/astral-worm-retreat.js?v=661",
    "./src/astral-worm-mount.js?v=661",
    "./src/lightning-giant-render.js?v=661",
    "./src/astral-encounters.js?v=661",
    "./src/astral-world-retreat.js?v=661",
    "./src/landscape.js?v=661",
    "./src/landscape-render.js?v=661",
    "./src/underlands.js?v=661",
    "./src/pattern-dungeons.js?v=661",
    "./src/relay-network.js?v=661",
    "./src/glyphs.js?v=661",
    "./src/echoes.js?v=661",
    "./src/constellation.js?v=661",
    "./src/water-traversal.js?v=661",
    "./src/open-sea.js?v=661",
    "./src/boats.js?v=661",
    "./src/sea-creatures.js?v=661",
    "./src/diving.js?v=661",
    "./src/grottoes.js?v=661",
    "./src/spell-slots.js?v=661",
    "./src/settlements.js?v=661",
    "./src/skirmishes.js?v=661",
    "./src/travelers.js?v=661",
    "./src/diagnostic-probe.js?v=661",
    "./src/questing-beast.js?v=661",
    "./src/recitations.js?v=661",
    "./src/lore.js?v=661",
    "./src/glimpses.js?v=661",
    "./src/glimpse-render.js?v=661",
    "./src/glimpse-paint.js?v=661",
    "./src/glimpse-scenes.js?v=661",
    "./src/glimpse-horror.js?v=661",
    "./src/glimpse-legend.js?v=661",
    "./src/glimpse-hand.js?v=661",
    "./src/atlas-view.js?v=661",
    "./src/strange.js?v=661",
    "./src/linked-dungeons.js?v=661",
    "./src/digging.js?v=661",
    "./src/building.js?v=661",
    "./src/refuge-lands.js?v=661",
    "./src/revenant-horde.js?v=661",
    "./src/stages.js?v=661",
    "./src/watcher.js?v=661",
    "./src/vehicle-gates.js?v=661",
    "./src/dungeon-ladder.js?v=661",
    "./src/potions.js?v=661",
    "./src/transit-lattice.js?v=661",
    "./src/late-spells.js?v=661",
    "./src/brawler-spells.js?v=661",
    "./src/orbit-volley.js?v=661",
    "./src/tool-forms.js?v=661",
    "./src/trees.js?v=661",
    "./src/fractured.js?v=661",
    "./src/affixes.js?v=661",
    "./src/sling.js?v=661",
    "./src/atlas-colors.js?v=661",
    "./src/skylands.js?v=661",
    "./src/surveyor.js?v=661",
    "./src/torn-pages.js?v=661",
    "./src/threads.js?v=661",
    "./src/lattice-fields.js?v=661",
    "./src/dungeon-traps.js?v=661",
    "./src/listener-mirror.js?v=661",
    "./src/hometowns.js?v=661",
    "./src/listener-arena.js?v=661",
    "./src/listener-morph.js?v=661",
    "./src/build-presets.js?v=661",
    "./src/smithy.js?v=661",
    "./src/ilse.js?v=661",
    "./src/bells.js?v=661",
    "./src/meals.js?v=661",
    "./src/margins.js?v=661",
    "./src/marginalia.js?v=661",
    "./src/tyrant-hunt.js?v=661",
    "./src/world-beasts.js?v=661",
    "./src/elders.js?v=661",
    "./src/far-array.js?v=661",
    "./src/combat-visuals.js?v=661",
    "./src/dungeon-framework.js?v=661",
    "./src/elites.js?v=661",
    "./src/random.js?v=661",
    "./src/types.js?v=661",
    "./src/story.js?v=661",
    "./src/foundry.js?v=661",
    "./src/world.js?v=661",
    "./src/deep-dungeons.js?v=661",
    "./src/scenes.js?v=661",
    "./src/arenas.js?v=661",
    "./src/items.js?v=661",
    "./src/combat.js?v=661",
    "./src/interactions.js?v=661",
    "./src/persistence.js?v=661",
    "./src/input.js?v=661",
    "./src/game.js?v=661",
    "./src/renderer.js?v=661",
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
// Release 661 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
