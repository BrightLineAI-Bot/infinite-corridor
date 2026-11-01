const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v686`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=686",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=686",
    "./src/proving-ground.js?v=686",
    "./src/proving-ground-fixtures.js?v=686",
    "./src/proving-ground-labs.js?v=686",
    "./src/dungeon-variation.js?v=686",
    "./src/dungeon-completion.js?v=686",
    "./src/enemy-patterns.js?v=686",
    "./src/monster-pack.js?v=686",
    "./src/monster-render.js?v=686",
    "./src/astral-worm.js?v=686",
    "./src/astral-worm-render.js?v=686",
    "./src/astral-worm-retreat.js?v=686",
    "./src/astral-worm-mount.js?v=686",
    "./src/lightning-giant-render.js?v=686",
    "./src/astral-encounters.js?v=686",
    "./src/astral-world-retreat.js?v=686",
    "./src/landscape.js?v=686",
    "./src/landscape-render.js?v=686",
    "./src/underlands.js?v=686",
    "./src/pattern-dungeons.js?v=686",
    "./src/relay-network.js?v=686",
    "./src/glyphs.js?v=686",
    "./src/echoes.js?v=686",
    "./src/constellation.js?v=686",
    "./src/water-traversal.js?v=686",
    "./src/open-sea.js?v=686",
    "./src/boats.js?v=686",
    "./src/sea-creatures.js?v=686",
    "./src/diving.js?v=686",
    "./src/grottoes.js?v=686",
    "./src/spell-slots.js?v=686",
    "./src/settlements.js?v=686",
    "./src/skirmishes.js?v=686",
    "./src/travelers.js?v=686",
    "./src/diagnostic-probe.js?v=686",
    "./src/questing-beast.js?v=686",
    "./src/recitations.js?v=686",
    "./src/lore.js?v=686",
    "./src/glimpses.js?v=686",
    "./src/glimpse-render.js?v=686",
    "./src/glimpse-paint.js?v=686",
    "./src/glimpse-scenes.js?v=686",
    "./src/glimpse-horror.js?v=686",
    "./src/glimpse-legend.js?v=686",
    "./src/glimpse-hand.js?v=686",
    "./src/atlas-view.js?v=686",
    "./src/strange.js?v=686",
    "./src/linked-dungeons.js?v=686",
    "./src/digging.js?v=686",
    "./src/building.js?v=686",
    "./src/refuge-lands.js?v=686",
    "./src/revenant-horde.js?v=686",
    "./src/stages.js?v=686",
    "./src/watcher.js?v=686",
    "./src/vehicle-gates.js?v=686",
    "./src/dungeon-ladder.js?v=686",
    "./src/potions.js?v=686",
    "./src/transit-lattice.js?v=686",
    "./src/late-spells.js?v=686",
    "./src/brawler-spells.js?v=686",
    "./src/orbit-volley.js?v=686",
    "./src/tool-forms.js?v=686",
    "./src/trees.js?v=686",
    "./src/fractured.js?v=686",
    "./src/affixes.js?v=686",
    "./src/boss-kit.js?v=686",
    "./src/stalker.js?v=686",
    "./src/stalker-render.js?v=686",
    "./src/deep-annex.js?v=686",
    "./src/the-deep.js?v=686",
    "./src/seasons.js?v=686",
    "./src/keeps.js?v=686",
    "./src/wonders.js?v=686",
    "./src/sling.js?v=686",
    "./src/atlas-colors.js?v=686",
    "./src/skylands.js?v=686",
    "./src/surveyor.js?v=686",
    "./src/torn-pages.js?v=686",
    "./src/threads.js?v=686",
    "./src/lattice-fields.js?v=686",
    "./src/dungeon-traps.js?v=686",
    "./src/listener-mirror.js?v=686",
    "./src/hometowns.js?v=686",
    "./src/listener-arena.js?v=686",
    "./src/listener-morph.js?v=686",
    "./src/build-presets.js?v=686",
    "./src/smithy.js?v=686",
    "./src/ilse.js?v=686",
    "./src/bells.js?v=686",
    "./src/meals.js?v=686",
    "./src/margins.js?v=686",
    "./src/marginalia.js?v=686",
    "./src/tyrant-hunt.js?v=686",
    "./src/world-beasts.js?v=686",
    "./src/elders.js?v=686",
    "./src/far-array.js?v=686",
    "./src/combat-visuals.js?v=686",
    "./src/dungeon-framework.js?v=686",
    "./src/elites.js?v=686",
    "./src/random.js?v=686",
    "./src/types.js?v=686",
    "./src/story.js?v=686",
    "./src/foundry.js?v=686",
    "./src/world.js?v=686",
    "./src/deep-dungeons.js?v=686",
    "./src/scenes.js?v=686",
    "./src/arenas.js?v=686",
    "./src/items.js?v=686",
    "./src/combat.js?v=686",
    "./src/interactions.js?v=686",
    "./src/persistence.js?v=686",
    "./src/input.js?v=686",
    "./src/game.js?v=686",
    "./src/renderer.js?v=686",
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
