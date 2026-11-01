const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v689`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=689",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=689",
    "./src/proving-ground.js?v=689",
    "./src/proving-ground-fixtures.js?v=689",
    "./src/proving-ground-labs.js?v=689",
    "./src/dungeon-variation.js?v=689",
    "./src/dungeon-completion.js?v=689",
    "./src/enemy-patterns.js?v=689",
    "./src/monster-pack.js?v=689",
    "./src/monster-render.js?v=689",
    "./src/astral-worm.js?v=689",
    "./src/astral-worm-render.js?v=689",
    "./src/astral-worm-retreat.js?v=689",
    "./src/astral-worm-mount.js?v=689",
    "./src/lightning-giant-render.js?v=689",
    "./src/astral-encounters.js?v=689",
    "./src/astral-world-retreat.js?v=689",
    "./src/landscape.js?v=689",
    "./src/landscape-render.js?v=689",
    "./src/underlands.js?v=689",
    "./src/pattern-dungeons.js?v=689",
    "./src/relay-network.js?v=689",
    "./src/glyphs.js?v=689",
    "./src/echoes.js?v=689",
    "./src/constellation.js?v=689",
    "./src/water-traversal.js?v=689",
    "./src/open-sea.js?v=689",
    "./src/boats.js?v=689",
    "./src/sea-creatures.js?v=689",
    "./src/diving.js?v=689",
    "./src/grottoes.js?v=689",
    "./src/spell-slots.js?v=689",
    "./src/settlements.js?v=689",
    "./src/skirmishes.js?v=689",
    "./src/travelers.js?v=689",
    "./src/diagnostic-probe.js?v=689",
    "./src/questing-beast.js?v=689",
    "./src/recitations.js?v=689",
    "./src/lore.js?v=689",
    "./src/glimpses.js?v=689",
    "./src/glimpse-render.js?v=689",
    "./src/glimpse-paint.js?v=689",
    "./src/glimpse-scenes.js?v=689",
    "./src/glimpse-horror.js?v=689",
    "./src/glimpse-legend.js?v=689",
    "./src/glimpse-hand.js?v=689",
    "./src/atlas-view.js?v=689",
    "./src/strange.js?v=689",
    "./src/linked-dungeons.js?v=689",
    "./src/digging.js?v=689",
    "./src/building.js?v=689",
    "./src/refuge-lands.js?v=689",
    "./src/revenant-horde.js?v=689",
    "./src/stages.js?v=689",
    "./src/watcher.js?v=689",
    "./src/vehicle-gates.js?v=689",
    "./src/dungeon-ladder.js?v=689",
    "./src/potions.js?v=689",
    "./src/transit-lattice.js?v=689",
    "./src/late-spells.js?v=689",
    "./src/brawler-spells.js?v=689",
    "./src/orbit-volley.js?v=689",
    "./src/tool-forms.js?v=689",
    "./src/trees.js?v=689",
    "./src/fractured.js?v=689",
    "./src/affixes.js?v=689",
    "./src/boss-kit.js?v=689",
    "./src/stalker.js?v=689",
    "./src/stalker-render.js?v=689",
    "./src/deep-annex.js?v=689",
    "./src/the-deep.js?v=689",
    "./src/seasons.js?v=689",
    "./src/keeps.js?v=689",
    "./src/canyon.js?v=689",
    "./src/wonders.js?v=689",
    "./src/sling.js?v=689",
    "./src/atlas-colors.js?v=689",
    "./src/skylands.js?v=689",
    "./src/surveyor.js?v=689",
    "./src/torn-pages.js?v=689",
    "./src/threads.js?v=689",
    "./src/lattice-fields.js?v=689",
    "./src/dungeon-traps.js?v=689",
    "./src/listener-mirror.js?v=689",
    "./src/hometowns.js?v=689",
    "./src/listener-arena.js?v=689",
    "./src/listener-morph.js?v=689",
    "./src/build-presets.js?v=689",
    "./src/smithy.js?v=689",
    "./src/ilse.js?v=689",
    "./src/bells.js?v=689",
    "./src/meals.js?v=689",
    "./src/margins.js?v=689",
    "./src/marginalia.js?v=689",
    "./src/tyrant-hunt.js?v=689",
    "./src/world-beasts.js?v=689",
    "./src/elders.js?v=689",
    "./src/far-array.js?v=689",
    "./src/combat-visuals.js?v=689",
    "./src/dungeon-framework.js?v=689",
    "./src/elites.js?v=689",
    "./src/random.js?v=689",
    "./src/types.js?v=689",
    "./src/story.js?v=689",
    "./src/foundry.js?v=689",
    "./src/world.js?v=689",
    "./src/deep-dungeons.js?v=689",
    "./src/scenes.js?v=689",
    "./src/arenas.js?v=689",
    "./src/items.js?v=689",
    "./src/combat.js?v=689",
    "./src/interactions.js?v=689",
    "./src/persistence.js?v=689",
    "./src/input.js?v=689",
    "./src/game.js?v=689",
    "./src/renderer.js?v=689",
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
