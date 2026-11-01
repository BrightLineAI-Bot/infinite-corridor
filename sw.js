const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v668`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=668",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=668",
    "./src/proving-ground.js?v=668",
    "./src/proving-ground-fixtures.js?v=668",
    "./src/proving-ground-labs.js?v=668",
    "./src/dungeon-variation.js?v=668",
    "./src/dungeon-completion.js?v=668",
    "./src/enemy-patterns.js?v=668",
    "./src/monster-pack.js?v=668",
    "./src/monster-render.js?v=668",
    "./src/astral-worm.js?v=668",
    "./src/astral-worm-render.js?v=668",
    "./src/astral-worm-retreat.js?v=668",
    "./src/astral-worm-mount.js?v=668",
    "./src/lightning-giant-render.js?v=668",
    "./src/astral-encounters.js?v=668",
    "./src/astral-world-retreat.js?v=668",
    "./src/landscape.js?v=668",
    "./src/landscape-render.js?v=668",
    "./src/underlands.js?v=668",
    "./src/pattern-dungeons.js?v=668",
    "./src/relay-network.js?v=668",
    "./src/glyphs.js?v=668",
    "./src/echoes.js?v=668",
    "./src/constellation.js?v=668",
    "./src/water-traversal.js?v=668",
    "./src/open-sea.js?v=668",
    "./src/boats.js?v=668",
    "./src/sea-creatures.js?v=668",
    "./src/diving.js?v=668",
    "./src/grottoes.js?v=668",
    "./src/spell-slots.js?v=668",
    "./src/settlements.js?v=668",
    "./src/skirmishes.js?v=668",
    "./src/travelers.js?v=668",
    "./src/diagnostic-probe.js?v=668",
    "./src/questing-beast.js?v=668",
    "./src/recitations.js?v=668",
    "./src/lore.js?v=668",
    "./src/glimpses.js?v=668",
    "./src/glimpse-render.js?v=668",
    "./src/glimpse-paint.js?v=668",
    "./src/glimpse-scenes.js?v=668",
    "./src/glimpse-horror.js?v=668",
    "./src/glimpse-legend.js?v=668",
    "./src/glimpse-hand.js?v=668",
    "./src/atlas-view.js?v=668",
    "./src/strange.js?v=668",
    "./src/linked-dungeons.js?v=668",
    "./src/digging.js?v=668",
    "./src/building.js?v=668",
    "./src/refuge-lands.js?v=668",
    "./src/revenant-horde.js?v=668",
    "./src/stages.js?v=668",
    "./src/watcher.js?v=668",
    "./src/vehicle-gates.js?v=668",
    "./src/dungeon-ladder.js?v=668",
    "./src/potions.js?v=668",
    "./src/transit-lattice.js?v=668",
    "./src/late-spells.js?v=668",
    "./src/brawler-spells.js?v=668",
    "./src/orbit-volley.js?v=668",
    "./src/tool-forms.js?v=668",
    "./src/trees.js?v=668",
    "./src/fractured.js?v=668",
    "./src/affixes.js?v=668",
    "./src/boss-kit.js?v=668",
    "./src/sling.js?v=668",
    "./src/atlas-colors.js?v=668",
    "./src/skylands.js?v=668",
    "./src/surveyor.js?v=668",
    "./src/torn-pages.js?v=668",
    "./src/threads.js?v=668",
    "./src/lattice-fields.js?v=668",
    "./src/dungeon-traps.js?v=668",
    "./src/listener-mirror.js?v=668",
    "./src/hometowns.js?v=668",
    "./src/listener-arena.js?v=668",
    "./src/listener-morph.js?v=668",
    "./src/build-presets.js?v=668",
    "./src/smithy.js?v=668",
    "./src/ilse.js?v=668",
    "./src/bells.js?v=668",
    "./src/meals.js?v=668",
    "./src/margins.js?v=668",
    "./src/marginalia.js?v=668",
    "./src/tyrant-hunt.js?v=668",
    "./src/world-beasts.js?v=668",
    "./src/elders.js?v=668",
    "./src/far-array.js?v=668",
    "./src/combat-visuals.js?v=668",
    "./src/dungeon-framework.js?v=668",
    "./src/elites.js?v=668",
    "./src/random.js?v=668",
    "./src/types.js?v=668",
    "./src/story.js?v=668",
    "./src/foundry.js?v=668",
    "./src/world.js?v=668",
    "./src/deep-dungeons.js?v=668",
    "./src/scenes.js?v=668",
    "./src/arenas.js?v=668",
    "./src/items.js?v=668",
    "./src/combat.js?v=668",
    "./src/interactions.js?v=668",
    "./src/persistence.js?v=668",
    "./src/input.js?v=668",
    "./src/game.js?v=668",
    "./src/renderer.js?v=668",
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
// Release 668 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
