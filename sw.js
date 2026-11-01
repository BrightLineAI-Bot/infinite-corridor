const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v685`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=685",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=685",
    "./src/proving-ground.js?v=685",
    "./src/proving-ground-fixtures.js?v=685",
    "./src/proving-ground-labs.js?v=685",
    "./src/dungeon-variation.js?v=685",
    "./src/dungeon-completion.js?v=685",
    "./src/enemy-patterns.js?v=685",
    "./src/monster-pack.js?v=685",
    "./src/monster-render.js?v=685",
    "./src/astral-worm.js?v=685",
    "./src/astral-worm-render.js?v=685",
    "./src/astral-worm-retreat.js?v=685",
    "./src/astral-worm-mount.js?v=685",
    "./src/lightning-giant-render.js?v=685",
    "./src/astral-encounters.js?v=685",
    "./src/astral-world-retreat.js?v=685",
    "./src/landscape.js?v=685",
    "./src/landscape-render.js?v=685",
    "./src/underlands.js?v=685",
    "./src/pattern-dungeons.js?v=685",
    "./src/relay-network.js?v=685",
    "./src/glyphs.js?v=685",
    "./src/echoes.js?v=685",
    "./src/constellation.js?v=685",
    "./src/water-traversal.js?v=685",
    "./src/open-sea.js?v=685",
    "./src/boats.js?v=685",
    "./src/sea-creatures.js?v=685",
    "./src/diving.js?v=685",
    "./src/grottoes.js?v=685",
    "./src/spell-slots.js?v=685",
    "./src/settlements.js?v=685",
    "./src/skirmishes.js?v=685",
    "./src/travelers.js?v=685",
    "./src/diagnostic-probe.js?v=685",
    "./src/questing-beast.js?v=685",
    "./src/recitations.js?v=685",
    "./src/lore.js?v=685",
    "./src/glimpses.js?v=685",
    "./src/glimpse-render.js?v=685",
    "./src/glimpse-paint.js?v=685",
    "./src/glimpse-scenes.js?v=685",
    "./src/glimpse-horror.js?v=685",
    "./src/glimpse-legend.js?v=685",
    "./src/glimpse-hand.js?v=685",
    "./src/atlas-view.js?v=685",
    "./src/strange.js?v=685",
    "./src/linked-dungeons.js?v=685",
    "./src/digging.js?v=685",
    "./src/building.js?v=685",
    "./src/refuge-lands.js?v=685",
    "./src/revenant-horde.js?v=685",
    "./src/stages.js?v=685",
    "./src/watcher.js?v=685",
    "./src/vehicle-gates.js?v=685",
    "./src/dungeon-ladder.js?v=685",
    "./src/potions.js?v=685",
    "./src/transit-lattice.js?v=685",
    "./src/late-spells.js?v=685",
    "./src/brawler-spells.js?v=685",
    "./src/orbit-volley.js?v=685",
    "./src/tool-forms.js?v=685",
    "./src/trees.js?v=685",
    "./src/fractured.js?v=685",
    "./src/affixes.js?v=685",
    "./src/boss-kit.js?v=685",
    "./src/stalker.js?v=685",
    "./src/stalker-render.js?v=685",
    "./src/deep-annex.js?v=685",
    "./src/the-deep.js?v=685",
    "./src/seasons.js?v=685",
    "./src/keeps.js?v=685",
    "./src/canyon.js?v=685",
    "./src/wonders.js?v=685",
    "./src/sling.js?v=685",
    "./src/atlas-colors.js?v=685",
    "./src/skylands.js?v=685",
    "./src/surveyor.js?v=685",
    "./src/torn-pages.js?v=685",
    "./src/threads.js?v=685",
    "./src/lattice-fields.js?v=685",
    "./src/dungeon-traps.js?v=685",
    "./src/listener-mirror.js?v=685",
    "./src/hometowns.js?v=685",
    "./src/listener-arena.js?v=685",
    "./src/listener-morph.js?v=685",
    "./src/build-presets.js?v=685",
    "./src/smithy.js?v=685",
    "./src/ilse.js?v=685",
    "./src/bells.js?v=685",
    "./src/meals.js?v=685",
    "./src/margins.js?v=685",
    "./src/marginalia.js?v=685",
    "./src/tyrant-hunt.js?v=685",
    "./src/world-beasts.js?v=685",
    "./src/elders.js?v=685",
    "./src/far-array.js?v=685",
    "./src/combat-visuals.js?v=685",
    "./src/dungeon-framework.js?v=685",
    "./src/elites.js?v=685",
    "./src/random.js?v=685",
    "./src/types.js?v=685",
    "./src/story.js?v=685",
    "./src/foundry.js?v=685",
    "./src/world.js?v=685",
    "./src/deep-dungeons.js?v=685",
    "./src/scenes.js?v=685",
    "./src/arenas.js?v=685",
    "./src/items.js?v=685",
    "./src/combat.js?v=685",
    "./src/interactions.js?v=685",
    "./src/persistence.js?v=685",
    "./src/input.js?v=685",
    "./src/game.js?v=685",
    "./src/renderer.js?v=685",
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
