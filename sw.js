const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v700`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=700",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=700",
    "./src/proving-ground.js?v=700",
    "./src/proving-ground-fixtures.js?v=700",
    "./src/proving-ground-labs.js?v=700",
    "./src/dungeon-variation.js?v=700",
    "./src/dungeon-completion.js?v=700",
    "./src/enemy-patterns.js?v=700",
    "./src/monster-pack.js?v=700",
    "./src/monster-render.js?v=700",
    "./src/astral-worm.js?v=700",
    "./src/astral-worm-render.js?v=700",
    "./src/astral-worm-retreat.js?v=700",
    "./src/astral-worm-mount.js?v=700",
    "./src/lightning-giant-render.js?v=700",
    "./src/astral-encounters.js?v=700",
    "./src/astral-world-retreat.js?v=700",
    "./src/landscape.js?v=700",
    "./src/landscape-render.js?v=700",
    "./src/underlands.js?v=700",
    "./src/pattern-dungeons.js?v=700",
    "./src/relay-network.js?v=700",
    "./src/glyphs.js?v=700",
    "./src/echoes.js?v=700",
    "./src/constellation.js?v=700",
    "./src/water-traversal.js?v=700",
    "./src/open-sea.js?v=700",
    "./src/boats.js?v=700",
    "./src/sea-creatures.js?v=700",
    "./src/diving.js?v=700",
    "./src/grottoes.js?v=700",
    "./src/spell-slots.js?v=700",
    "./src/settlements.js?v=700",
    "./src/skirmishes.js?v=700",
    "./src/travelers.js?v=700",
    "./src/diagnostic-probe.js?v=700",
    "./src/questing-beast.js?v=700",
    "./src/recitations.js?v=700",
    "./src/lore.js?v=700",
    "./src/glimpses.js?v=700",
    "./src/glimpse-render.js?v=700",
    "./src/glimpse-paint.js?v=700",
    "./src/glimpse-scenes.js?v=700",
    "./src/glimpse-horror.js?v=700",
    "./src/glimpse-legend.js?v=700",
    "./src/glimpse-hand.js?v=700",
    "./src/atlas-view.js?v=700",
    "./src/strange.js?v=700",
    "./src/linked-dungeons.js?v=700",
    "./src/digging.js?v=700",
    "./src/building.js?v=700",
    "./src/refuge-lands.js?v=700",
    "./src/revenant-horde.js?v=700",
    "./src/stages.js?v=700",
    "./src/watcher.js?v=700",
    "./src/vehicle-gates.js?v=700",
    "./src/dungeon-ladder.js?v=700",
    "./src/potions.js?v=700",
    "./src/transit-lattice.js?v=700",
    "./src/late-spells.js?v=700",
    "./src/brawler-spells.js?v=700",
    "./src/orbit-volley.js?v=700",
    "./src/tool-forms.js?v=700",
    "./src/trees.js?v=700",
    "./src/fractured.js?v=700",
    "./src/affixes.js?v=700",
    "./src/boss-kit.js?v=700",
    "./src/stalker.js?v=700",
    "./src/stalker-render.js?v=700",
    "./src/deep-annex.js?v=700",
    "./src/the-deep.js?v=700",
    "./src/seasons.js?v=700",
    "./src/keeps.js?v=700",
    "./src/canyon.js?v=700",
    "./src/ascendancy.js?v=700",
    "./src/wonders.js?v=700",
    "./src/sling.js?v=700",
    "./src/atlas-colors.js?v=700",
    "./src/skylands.js?v=700",
    "./src/surveyor.js?v=700",
    "./src/torn-pages.js?v=700",
    "./src/threads.js?v=700",
    "./src/lattice-fields.js?v=700",
    "./src/dungeon-traps.js?v=700",
    "./src/listener-mirror.js?v=700",
    "./src/hometowns.js?v=700",
    "./src/listener-arena.js?v=700",
    "./src/listener-morph.js?v=700",
    "./src/build-presets.js?v=700",
    "./src/smithy.js?v=700",
    "./src/ilse.js?v=700",
    "./src/bells.js?v=700",
    "./src/meals.js?v=700",
    "./src/margins.js?v=700",
    "./src/marginalia.js?v=700",
    "./src/tyrant-hunt.js?v=700",
    "./src/world-beasts.js?v=700",
    "./src/elders.js?v=700",
    "./src/far-array.js?v=700",
    "./src/combat-visuals.js?v=700",
    "./src/dungeon-framework.js?v=700",
    "./src/elites.js?v=700",
    "./src/random.js?v=700",
    "./src/types.js?v=700",
    "./src/story.js?v=700",
    "./src/foundry.js?v=700",
    "./src/world.js?v=700",
    "./src/deep-dungeons.js?v=700",
    "./src/scenes.js?v=700",
    "./src/arenas.js?v=700",
    "./src/items.js?v=700",
    "./src/combat.js?v=700",
    "./src/interactions.js?v=700",
    "./src/persistence.js?v=700",
    "./src/input.js?v=700",
    "./src/game.js?v=700",
    "./src/renderer.js?v=700",
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
