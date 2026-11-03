const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r708-3316faf45579`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r708-3316faf45579",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r708-3316faf45579",
    "./src/proving-ground.js?v=r708-3316faf45579",
    "./src/proving-ground-fixtures.js?v=r708-3316faf45579",
    "./src/proving-ground-labs.js?v=r708-3316faf45579",
    "./src/dungeon-variation.js?v=r708-3316faf45579",
    "./src/dungeon-completion.js?v=r708-3316faf45579",
    "./src/enemy-patterns.js?v=r708-3316faf45579",
    "./src/monster-pack.js?v=r708-3316faf45579",
    "./src/monster-render.js?v=r708-3316faf45579",
    "./src/astral-worm.js?v=r708-3316faf45579",
    "./src/astral-worm-render.js?v=r708-3316faf45579",
    "./src/astral-worm-retreat.js?v=r708-3316faf45579",
    "./src/astral-worm-mount.js?v=r708-3316faf45579",
    "./src/lightning-giant-render.js?v=r708-3316faf45579",
    "./src/briar-stag-render.js?v=r708-3316faf45579",
    "./src/ashen-moth-render.js?v=r708-3316faf45579",
    "./src/astral-encounters.js?v=r708-3316faf45579",
    "./src/astral-world-retreat.js?v=r708-3316faf45579",
    "./src/landscape.js?v=r708-3316faf45579",
    "./src/landscape-render.js?v=r708-3316faf45579",
    "./src/underlands.js?v=r708-3316faf45579",
    "./src/pattern-dungeons.js?v=r708-3316faf45579",
    "./src/relay-network.js?v=r708-3316faf45579",
    "./src/glyphs.js?v=r708-3316faf45579",
    "./src/echoes.js?v=r708-3316faf45579",
    "./src/constellation.js?v=r708-3316faf45579",
    "./src/water-traversal.js?v=r708-3316faf45579",
    "./src/open-sea.js?v=r708-3316faf45579",
    "./src/boats.js?v=r708-3316faf45579",
    "./src/sea-creatures.js?v=r708-3316faf45579",
    "./src/diving.js?v=r708-3316faf45579",
    "./src/grottoes.js?v=r708-3316faf45579",
    "./src/spell-slots.js?v=r708-3316faf45579",
    "./src/settlements.js?v=r708-3316faf45579",
    "./src/skirmishes.js?v=r708-3316faf45579",
    "./src/travelers.js?v=r708-3316faf45579",
    "./src/diagnostic-probe.js?v=r708-3316faf45579",
    "./src/questing-beast.js?v=r708-3316faf45579",
    "./src/recitations.js?v=r708-3316faf45579",
    "./src/lore.js?v=r708-3316faf45579",
    "./src/glimpses.js?v=r708-3316faf45579",
    "./src/glimpse-render.js?v=r708-3316faf45579",
    "./src/glimpse-paint.js?v=r708-3316faf45579",
    "./src/glimpse-scenes.js?v=r708-3316faf45579",
    "./src/glimpse-horror.js?v=r708-3316faf45579",
    "./src/glimpse-legend.js?v=r708-3316faf45579",
    "./src/glimpse-hand.js?v=r708-3316faf45579",
    "./src/atlas-view.js?v=r708-3316faf45579",
    "./src/strange.js?v=r708-3316faf45579",
    "./src/linked-dungeons.js?v=r708-3316faf45579",
    "./src/digging.js?v=r708-3316faf45579",
    "./src/building.js?v=r708-3316faf45579",
    "./src/refuge-lands.js?v=r708-3316faf45579",
    "./src/revenant-horde.js?v=r708-3316faf45579",
    "./src/stages.js?v=r708-3316faf45579",
    "./src/watcher.js?v=r708-3316faf45579",
    "./src/vehicle-gates.js?v=r708-3316faf45579",
    "./src/dungeon-ladder.js?v=r708-3316faf45579",
    "./src/potions.js?v=r708-3316faf45579",
    "./src/transit-lattice.js?v=r708-3316faf45579",
    "./src/late-spells.js?v=r708-3316faf45579",
    "./src/brawler-spells.js?v=r708-3316faf45579",
    "./src/orbit-volley.js?v=r708-3316faf45579",
    "./src/tool-forms.js?v=r708-3316faf45579",
    "./src/trees.js?v=r708-3316faf45579",
    "./src/fractured.js?v=r708-3316faf45579",
    "./src/affixes.js?v=r708-3316faf45579",
    "./src/boss-kit.js?v=r708-3316faf45579",
    "./src/stalker.js?v=r708-3316faf45579",
    "./src/stalker-render.js?v=r708-3316faf45579",
    "./src/deep-annex.js?v=r708-3316faf45579",
    "./src/the-deep.js?v=r708-3316faf45579",
    "./src/seasons.js?v=r708-3316faf45579",
    "./src/keeps.js?v=r708-3316faf45579",
    "./src/canyon.js?v=r708-3316faf45579",
    "./src/ascendancy.js?v=r708-3316faf45579",
    "./src/wonders.js?v=r708-3316faf45579",
    "./src/sling.js?v=r708-3316faf45579",
    "./src/atlas-colors.js?v=r708-3316faf45579",
    "./src/skylands.js?v=r708-3316faf45579",
    "./src/surveyor.js?v=r708-3316faf45579",
    "./src/torn-pages.js?v=r708-3316faf45579",
    "./src/threads.js?v=r708-3316faf45579",
    "./src/lattice-fields.js?v=r708-3316faf45579",
    "./src/dungeon-traps.js?v=r708-3316faf45579",
    "./src/listener-mirror.js?v=r708-3316faf45579",
    "./src/hometowns.js?v=r708-3316faf45579",
    "./src/listener-arena.js?v=r708-3316faf45579",
    "./src/listener-morph.js?v=r708-3316faf45579",
    "./src/build-presets.js?v=r708-3316faf45579",
    "./src/smithy.js?v=r708-3316faf45579",
    "./src/ilse.js?v=r708-3316faf45579",
    "./src/bells.js?v=r708-3316faf45579",
    "./src/meals.js?v=r708-3316faf45579",
    "./src/margins.js?v=r708-3316faf45579",
    "./src/marginalia.js?v=r708-3316faf45579",
    "./src/tyrant-hunt.js?v=r708-3316faf45579",
    "./src/world-beasts.js?v=r708-3316faf45579",
    "./src/elders.js?v=r708-3316faf45579",
    "./src/far-array.js?v=r708-3316faf45579",
    "./src/combat-visuals.js?v=r708-3316faf45579",
    "./src/dungeon-framework.js?v=r708-3316faf45579",
    "./src/elites.js?v=r708-3316faf45579",
    "./src/random.js?v=r708-3316faf45579",
    "./src/types.js?v=r708-3316faf45579",
    "./src/story.js?v=r708-3316faf45579",
    "./src/foundry.js?v=r708-3316faf45579",
    "./src/world.js?v=r708-3316faf45579",
    "./src/deep-dungeons.js?v=r708-3316faf45579",
    "./src/scenes.js?v=r708-3316faf45579",
    "./src/arenas.js?v=r708-3316faf45579",
    "./src/items.js?v=r708-3316faf45579",
    "./src/combat.js?v=r708-3316faf45579",
    "./src/interactions.js?v=r708-3316faf45579",
    "./src/persistence.js?v=r708-3316faf45579",
    "./src/input.js?v=r708-3316faf45579",
    "./src/game.js?v=r708-3316faf45579",
    "./src/renderer.js?v=r708-3316faf45579",
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
