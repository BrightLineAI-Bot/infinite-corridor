const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v711`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=711",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=711",
    "./src/proving-ground.js?v=711",
    "./src/proving-ground-fixtures.js?v=711",
    "./src/proving-ground-labs.js?v=711",
    "./src/dungeon-variation.js?v=711",
    "./src/dungeon-completion.js?v=711",
    "./src/enemy-patterns.js?v=711",
    "./src/monster-pack.js?v=711",
    "./src/monster-render.js?v=711",
    "./src/astral-worm.js?v=711",
    "./src/astral-worm-render.js?v=711",
    "./src/astral-worm-retreat.js?v=711",
    "./src/astral-worm-mount.js?v=711",
    "./src/lightning-giant-render.js?v=711",
    "./src/briar-stag-render.js?v=711",
    "./src/ashen-moth-render.js?v=711",
    "./src/crimson-dragon.js?v=711",
    "./src/crimson-dragon-render.js?v=711",
    "./src/doom-chaser-render.js?v=711",
    "./src/astral-encounters.js?v=711",
    "./src/astral-world-retreat.js?v=711",
    "./src/landscape.js?v=711",
    "./src/landscape-render.js?v=711",
    "./src/underlands.js?v=711",
    "./src/pattern-dungeons.js?v=711",
    "./src/relay-network.js?v=711",
    "./src/glyphs.js?v=711",
    "./src/echoes.js?v=711",
    "./src/constellation.js?v=711",
    "./src/water-traversal.js?v=711",
    "./src/open-sea.js?v=711",
    "./src/boats.js?v=711",
    "./src/sea-creatures.js?v=711",
    "./src/diving.js?v=711",
    "./src/grottoes.js?v=711",
    "./src/spell-slots.js?v=711",
    "./src/settlements.js?v=711",
    "./src/skirmishes.js?v=711",
    "./src/travelers.js?v=711",
    "./src/diagnostic-probe.js?v=711",
    "./src/questing-beast.js?v=711",
    "./src/recitations.js?v=711",
    "./src/lore.js?v=711",
    "./src/glimpses.js?v=711",
    "./src/glimpse-render.js?v=711",
    "./src/glimpse-paint.js?v=711",
    "./src/glimpse-scenes.js?v=711",
    "./src/glimpse-horror.js?v=711",
    "./src/glimpse-legend.js?v=711",
    "./src/glimpse-hand.js?v=711",
    "./src/atlas-view.js?v=711",
    "./src/strange.js?v=711",
    "./src/linked-dungeons.js?v=711",
    "./src/digging.js?v=711",
    "./src/building.js?v=711",
    "./src/refuge-lands.js?v=711",
    "./src/revenant-horde.js?v=711",
    "./src/stages.js?v=711",
    "./src/watcher.js?v=711",
    "./src/vehicle-gates.js?v=711",
    "./src/dungeon-ladder.js?v=711",
    "./src/potions.js?v=711",
    "./src/transit-lattice.js?v=711",
    "./src/late-spells.js?v=711",
    "./src/brawler-spells.js?v=711",
    "./src/orbit-volley.js?v=711",
    "./src/tool-forms.js?v=711",
    "./src/trees.js?v=711",
    "./src/fractured.js?v=711",
    "./src/affixes.js?v=711",
    "./src/boss-kit.js?v=711",
    "./src/stalker.js?v=711",
    "./src/stalker-render.js?v=711",
    "./src/deep-annex.js?v=711",
    "./src/the-deep.js?v=711",
    "./src/seasons.js?v=711",
    "./src/keeps.js?v=711",
    "./src/great-buildings.js?v=711",
    "./src/canyon.js?v=711",
    "./src/ascendancy.js?v=711",
    "./src/wonders.js?v=711",
    "./src/sling.js?v=711",
    "./src/atlas-colors.js?v=711",
    "./src/skylands.js?v=711",
    "./src/surveyor.js?v=711",
    "./src/torn-pages.js?v=711",
    "./src/threads.js?v=711",
    "./src/lattice-fields.js?v=711",
    "./src/dungeon-traps.js?v=711",
    "./src/listener-mirror.js?v=711",
    "./src/hometowns.js?v=711",
    "./src/listener-arena.js?v=711",
    "./src/listener-morph.js?v=711",
    "./src/build-presets.js?v=711",
    "./src/smithy.js?v=711",
    "./src/ilse.js?v=711",
    "./src/bells.js?v=711",
    "./src/meals.js?v=711",
    "./src/margins.js?v=711",
    "./src/marginalia.js?v=711",
    "./src/tyrant-hunt.js?v=711",
    "./src/world-beasts.js?v=711",
    "./src/elders.js?v=711",
    "./src/far-array.js?v=711",
    "./src/combat-visuals.js?v=711",
    "./src/dungeon-framework.js?v=711",
    "./src/elites.js?v=711",
    "./src/random.js?v=711",
    "./src/types.js?v=711",
    "./src/story.js?v=711",
    "./src/foundry.js?v=711",
    "./src/world.js?v=711",
    "./src/deep-dungeons.js?v=711",
    "./src/scenes.js?v=711",
    "./src/arenas.js?v=711",
    "./src/items.js?v=711",
    "./src/combat.js?v=711",
    "./src/interactions.js?v=711",
    "./src/persistence.js?v=711",
    "./src/input.js?v=711",
    "./src/game.js?v=711",
    "./src/renderer.js?v=711",
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
