const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v655`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=655",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=655",
    "./src/proving-ground.js?v=655",
    "./src/proving-ground-fixtures.js?v=655",
    "./src/proving-ground-labs.js?v=655",
    "./src/dungeon-variation.js?v=655",
    "./src/dungeon-completion.js?v=655",
    "./src/enemy-patterns.js?v=655",
    "./src/monster-pack.js?v=655",
    "./src/monster-render.js?v=655",
    "./src/astral-worm.js?v=655",
    "./src/astral-worm-render.js?v=655",
    "./src/astral-worm-retreat.js?v=655",
    "./src/astral-worm-mount.js?v=655",
    "./src/lightning-giant-render.js?v=655",
    "./src/astral-encounters.js?v=655",
    "./src/astral-world-retreat.js?v=655",
    "./src/landscape.js?v=655",
    "./src/landscape-render.js?v=655",
    "./src/underlands.js?v=655",
    "./src/pattern-dungeons.js?v=655",
    "./src/relay-network.js?v=655",
    "./src/glyphs.js?v=655",
    "./src/echoes.js?v=655",
    "./src/constellation.js?v=655",
    "./src/water-traversal.js?v=655",
    "./src/open-sea.js?v=655",
    "./src/boats.js?v=655",
    "./src/sea-creatures.js?v=655",
    "./src/diving.js?v=655",
    "./src/grottoes.js?v=655",
    "./src/spell-slots.js?v=655",
    "./src/settlements.js?v=655",
    "./src/skirmishes.js?v=655",
    "./src/travelers.js?v=655",
    "./src/diagnostic-probe.js?v=655",
    "./src/questing-beast.js?v=655",
    "./src/recitations.js?v=655",
    "./src/lore.js?v=655",
    "./src/glimpses.js?v=655",
    "./src/glimpse-render.js?v=655",
    "./src/glimpse-paint.js?v=655",
    "./src/glimpse-scenes.js?v=655",
    "./src/glimpse-horror.js?v=655",
    "./src/glimpse-legend.js?v=655",
    "./src/glimpse-hand.js?v=655",
    "./src/atlas-view.js?v=655",
    "./src/strange.js?v=655",
    "./src/linked-dungeons.js?v=655",
    "./src/digging.js?v=655",
    "./src/building.js?v=655",
    "./src/refuge-lands.js?v=655",
    "./src/revenant-horde.js?v=655",
    "./src/stages.js?v=655",
    "./src/watcher.js?v=655",
    "./src/vehicle-gates.js?v=655",
    "./src/dungeon-ladder.js?v=655",
    "./src/potions.js?v=655",
    "./src/transit-lattice.js?v=655",
    "./src/late-spells.js?v=655",
    "./src/brawler-spells.js?v=655",
    "./src/orbit-volley.js?v=655",
    "./src/tool-forms.js?v=655",
    "./src/trees.js?v=655",
    "./src/fractured.js?v=655",
    "./src/sling.js?v=655",
    "./src/atlas-colors.js?v=655",
    "./src/skylands.js?v=655",
    "./src/surveyor.js?v=655",
    "./src/torn-pages.js?v=655",
    "./src/threads.js?v=655",
    "./src/lattice-fields.js?v=655",
    "./src/dungeon-traps.js?v=655",
    "./src/listener-mirror.js?v=655",
    "./src/hometowns.js?v=655",
    "./src/listener-arena.js?v=655",
    "./src/listener-morph.js?v=655",
    "./src/build-presets.js?v=655",
    "./src/smithy.js?v=655",
    "./src/ilse.js?v=655",
    "./src/bells.js?v=655",
    "./src/meals.js?v=655",
    "./src/margins.js?v=655",
    "./src/marginalia.js?v=655",
    "./src/tyrant-hunt.js?v=655",
    "./src/world-beasts.js?v=655",
    "./src/elders.js?v=655",
    "./src/far-array.js?v=655",
    "./src/combat-visuals.js?v=655",
    "./src/dungeon-framework.js?v=655",
    "./src/elites.js?v=655",
    "./src/random.js?v=655",
    "./src/types.js?v=655",
    "./src/story.js?v=655",
    "./src/foundry.js?v=655",
    "./src/world.js?v=655",
    "./src/deep-dungeons.js?v=655",
    "./src/scenes.js?v=655",
    "./src/arenas.js?v=655",
    "./src/items.js?v=655",
    "./src/combat.js?v=655",
    "./src/interactions.js?v=655",
    "./src/persistence.js?v=655",
    "./src/input.js?v=655",
    "./src/game.js?v=655",
    "./src/renderer.js?v=655",
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
// Release 655 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
