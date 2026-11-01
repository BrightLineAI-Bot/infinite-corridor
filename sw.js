const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v678`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=678",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=678",
    "./src/proving-ground.js?v=678",
    "./src/proving-ground-fixtures.js?v=678",
    "./src/proving-ground-labs.js?v=678",
    "./src/dungeon-variation.js?v=678",
    "./src/dungeon-completion.js?v=678",
    "./src/enemy-patterns.js?v=678",
    "./src/monster-pack.js?v=678",
    "./src/monster-render.js?v=678",
    "./src/astral-worm.js?v=678",
    "./src/astral-worm-render.js?v=678",
    "./src/astral-worm-retreat.js?v=678",
    "./src/astral-worm-mount.js?v=678",
    "./src/lightning-giant-render.js?v=678",
    "./src/astral-encounters.js?v=678",
    "./src/astral-world-retreat.js?v=678",
    "./src/landscape.js?v=678",
    "./src/landscape-render.js?v=678",
    "./src/underlands.js?v=678",
    "./src/pattern-dungeons.js?v=678",
    "./src/relay-network.js?v=678",
    "./src/glyphs.js?v=678",
    "./src/echoes.js?v=678",
    "./src/constellation.js?v=678",
    "./src/water-traversal.js?v=678",
    "./src/open-sea.js?v=678",
    "./src/boats.js?v=678",
    "./src/sea-creatures.js?v=678",
    "./src/diving.js?v=678",
    "./src/grottoes.js?v=678",
    "./src/spell-slots.js?v=678",
    "./src/settlements.js?v=678",
    "./src/skirmishes.js?v=678",
    "./src/travelers.js?v=678",
    "./src/diagnostic-probe.js?v=678",
    "./src/questing-beast.js?v=678",
    "./src/recitations.js?v=678",
    "./src/lore.js?v=678",
    "./src/glimpses.js?v=678",
    "./src/glimpse-render.js?v=678",
    "./src/glimpse-paint.js?v=678",
    "./src/glimpse-scenes.js?v=678",
    "./src/glimpse-horror.js?v=678",
    "./src/glimpse-legend.js?v=678",
    "./src/glimpse-hand.js?v=678",
    "./src/atlas-view.js?v=678",
    "./src/strange.js?v=678",
    "./src/linked-dungeons.js?v=678",
    "./src/digging.js?v=678",
    "./src/building.js?v=678",
    "./src/refuge-lands.js?v=678",
    "./src/revenant-horde.js?v=678",
    "./src/stages.js?v=678",
    "./src/watcher.js?v=678",
    "./src/vehicle-gates.js?v=678",
    "./src/dungeon-ladder.js?v=678",
    "./src/potions.js?v=678",
    "./src/transit-lattice.js?v=678",
    "./src/late-spells.js?v=678",
    "./src/brawler-spells.js?v=678",
    "./src/orbit-volley.js?v=678",
    "./src/tool-forms.js?v=678",
    "./src/trees.js?v=678",
    "./src/fractured.js?v=678",
    "./src/affixes.js?v=678",
    "./src/boss-kit.js?v=678",
    "./src/stalker.js?v=678",
    "./src/stalker-render.js?v=678",
    "./src/deep-annex.js?v=678",
    "./src/the-deep.js?v=678",
    "./src/wonders.js?v=678",
    "./src/sling.js?v=678",
    "./src/atlas-colors.js?v=678",
    "./src/skylands.js?v=678",
    "./src/surveyor.js?v=678",
    "./src/torn-pages.js?v=678",
    "./src/threads.js?v=678",
    "./src/lattice-fields.js?v=678",
    "./src/dungeon-traps.js?v=678",
    "./src/listener-mirror.js?v=678",
    "./src/hometowns.js?v=678",
    "./src/listener-arena.js?v=678",
    "./src/listener-morph.js?v=678",
    "./src/build-presets.js?v=678",
    "./src/smithy.js?v=678",
    "./src/ilse.js?v=678",
    "./src/bells.js?v=678",
    "./src/meals.js?v=678",
    "./src/margins.js?v=678",
    "./src/marginalia.js?v=678",
    "./src/tyrant-hunt.js?v=678",
    "./src/world-beasts.js?v=678",
    "./src/elders.js?v=678",
    "./src/far-array.js?v=678",
    "./src/combat-visuals.js?v=678",
    "./src/dungeon-framework.js?v=678",
    "./src/elites.js?v=678",
    "./src/random.js?v=678",
    "./src/types.js?v=678",
    "./src/story.js?v=678",
    "./src/foundry.js?v=678",
    "./src/world.js?v=678",
    "./src/deep-dungeons.js?v=678",
    "./src/scenes.js?v=678",
    "./src/arenas.js?v=678",
    "./src/items.js?v=678",
    "./src/combat.js?v=678",
    "./src/interactions.js?v=678",
    "./src/persistence.js?v=678",
    "./src/input.js?v=678",
    "./src/game.js?v=678",
    "./src/renderer.js?v=678",
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
// Release 677 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
