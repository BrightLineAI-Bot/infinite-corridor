const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v695`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=695",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=695",
    "./src/proving-ground.js?v=695",
    "./src/proving-ground-fixtures.js?v=695",
    "./src/proving-ground-labs.js?v=695",
    "./src/dungeon-variation.js?v=695",
    "./src/dungeon-completion.js?v=695",
    "./src/enemy-patterns.js?v=695",
    "./src/monster-pack.js?v=695",
    "./src/monster-render.js?v=695",
    "./src/astral-worm.js?v=695",
    "./src/astral-worm-render.js?v=695",
    "./src/astral-worm-retreat.js?v=695",
    "./src/astral-worm-mount.js?v=695",
    "./src/lightning-giant-render.js?v=695",
    "./src/astral-encounters.js?v=695",
    "./src/astral-world-retreat.js?v=695",
    "./src/landscape.js?v=695",
    "./src/landscape-render.js?v=695",
    "./src/underlands.js?v=695",
    "./src/pattern-dungeons.js?v=695",
    "./src/relay-network.js?v=695",
    "./src/glyphs.js?v=695",
    "./src/echoes.js?v=695",
    "./src/constellation.js?v=695",
    "./src/water-traversal.js?v=695",
    "./src/open-sea.js?v=695",
    "./src/boats.js?v=695",
    "./src/sea-creatures.js?v=695",
    "./src/diving.js?v=695",
    "./src/grottoes.js?v=695",
    "./src/spell-slots.js?v=695",
    "./src/settlements.js?v=695",
    "./src/skirmishes.js?v=695",
    "./src/travelers.js?v=695",
    "./src/diagnostic-probe.js?v=695",
    "./src/questing-beast.js?v=695",
    "./src/recitations.js?v=695",
    "./src/lore.js?v=695",
    "./src/glimpses.js?v=695",
    "./src/glimpse-render.js?v=695",
    "./src/glimpse-paint.js?v=695",
    "./src/glimpse-scenes.js?v=695",
    "./src/glimpse-horror.js?v=695",
    "./src/glimpse-legend.js?v=695",
    "./src/glimpse-hand.js?v=695",
    "./src/atlas-view.js?v=695",
    "./src/strange.js?v=695",
    "./src/linked-dungeons.js?v=695",
    "./src/digging.js?v=695",
    "./src/building.js?v=695",
    "./src/refuge-lands.js?v=695",
    "./src/revenant-horde.js?v=695",
    "./src/stages.js?v=695",
    "./src/watcher.js?v=695",
    "./src/vehicle-gates.js?v=695",
    "./src/dungeon-ladder.js?v=695",
    "./src/potions.js?v=695",
    "./src/transit-lattice.js?v=695",
    "./src/late-spells.js?v=695",
    "./src/brawler-spells.js?v=695",
    "./src/orbit-volley.js?v=695",
    "./src/tool-forms.js?v=695",
    "./src/trees.js?v=695",
    "./src/fractured.js?v=695",
    "./src/affixes.js?v=695",
    "./src/boss-kit.js?v=695",
    "./src/stalker.js?v=695",
    "./src/stalker-render.js?v=695",
    "./src/deep-annex.js?v=695",
    "./src/the-deep.js?v=695",
    "./src/seasons.js?v=695",
    "./src/keeps.js?v=695",
    "./src/canyon.js?v=695",
    "./src/wonders.js?v=695",
    "./src/sling.js?v=695",
    "./src/atlas-colors.js?v=695",
    "./src/skylands.js?v=695",
    "./src/surveyor.js?v=695",
    "./src/torn-pages.js?v=695",
    "./src/threads.js?v=695",
    "./src/lattice-fields.js?v=695",
    "./src/dungeon-traps.js?v=695",
    "./src/listener-mirror.js?v=695",
    "./src/hometowns.js?v=695",
    "./src/listener-arena.js?v=695",
    "./src/listener-morph.js?v=695",
    "./src/build-presets.js?v=695",
    "./src/smithy.js?v=695",
    "./src/ilse.js?v=695",
    "./src/bells.js?v=695",
    "./src/meals.js?v=695",
    "./src/margins.js?v=695",
    "./src/marginalia.js?v=695",
    "./src/tyrant-hunt.js?v=695",
    "./src/world-beasts.js?v=695",
    "./src/elders.js?v=695",
    "./src/far-array.js?v=695",
    "./src/combat-visuals.js?v=695",
    "./src/dungeon-framework.js?v=695",
    "./src/elites.js?v=695",
    "./src/random.js?v=695",
    "./src/types.js?v=695",
    "./src/story.js?v=695",
    "./src/foundry.js?v=695",
    "./src/world.js?v=695",
    "./src/deep-dungeons.js?v=695",
    "./src/scenes.js?v=695",
    "./src/arenas.js?v=695",
    "./src/items.js?v=695",
    "./src/combat.js?v=695",
    "./src/interactions.js?v=695",
    "./src/persistence.js?v=695",
    "./src/input.js?v=695",
    "./src/game.js?v=695",
    "./src/renderer.js?v=695",
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
