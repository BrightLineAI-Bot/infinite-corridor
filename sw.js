const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v701`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=701",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=701",
    "./src/proving-ground.js?v=701",
    "./src/proving-ground-fixtures.js?v=701",
    "./src/proving-ground-labs.js?v=701",
    "./src/dungeon-variation.js?v=701",
    "./src/dungeon-completion.js?v=701",
    "./src/enemy-patterns.js?v=701",
    "./src/monster-pack.js?v=701",
    "./src/monster-render.js?v=701",
    "./src/astral-worm.js?v=701",
    "./src/astral-worm-render.js?v=701",
    "./src/astral-worm-retreat.js?v=701",
    "./src/astral-worm-mount.js?v=701",
    "./src/lightning-giant-render.js?v=701",
    "./src/astral-encounters.js?v=701",
    "./src/astral-world-retreat.js?v=701",
    "./src/landscape.js?v=701",
    "./src/landscape-render.js?v=701",
    "./src/underlands.js?v=701",
    "./src/pattern-dungeons.js?v=701",
    "./src/relay-network.js?v=701",
    "./src/glyphs.js?v=701",
    "./src/echoes.js?v=701",
    "./src/constellation.js?v=701",
    "./src/water-traversal.js?v=701",
    "./src/open-sea.js?v=701",
    "./src/boats.js?v=701",
    "./src/sea-creatures.js?v=701",
    "./src/diving.js?v=701",
    "./src/grottoes.js?v=701",
    "./src/spell-slots.js?v=701",
    "./src/settlements.js?v=701",
    "./src/skirmishes.js?v=701",
    "./src/travelers.js?v=701",
    "./src/diagnostic-probe.js?v=701",
    "./src/questing-beast.js?v=701",
    "./src/recitations.js?v=701",
    "./src/lore.js?v=701",
    "./src/glimpses.js?v=701",
    "./src/glimpse-render.js?v=701",
    "./src/glimpse-paint.js?v=701",
    "./src/glimpse-scenes.js?v=701",
    "./src/glimpse-horror.js?v=701",
    "./src/glimpse-legend.js?v=701",
    "./src/glimpse-hand.js?v=701",
    "./src/atlas-view.js?v=701",
    "./src/strange.js?v=701",
    "./src/linked-dungeons.js?v=701",
    "./src/digging.js?v=701",
    "./src/building.js?v=701",
    "./src/refuge-lands.js?v=701",
    "./src/revenant-horde.js?v=701",
    "./src/stages.js?v=701",
    "./src/watcher.js?v=701",
    "./src/vehicle-gates.js?v=701",
    "./src/dungeon-ladder.js?v=701",
    "./src/potions.js?v=701",
    "./src/transit-lattice.js?v=701",
    "./src/late-spells.js?v=701",
    "./src/brawler-spells.js?v=701",
    "./src/orbit-volley.js?v=701",
    "./src/tool-forms.js?v=701",
    "./src/trees.js?v=701",
    "./src/fractured.js?v=701",
    "./src/affixes.js?v=701",
    "./src/boss-kit.js?v=701",
    "./src/stalker.js?v=701",
    "./src/stalker-render.js?v=701",
    "./src/deep-annex.js?v=701",
    "./src/the-deep.js?v=701",
    "./src/seasons.js?v=701",
    "./src/keeps.js?v=701",
    "./src/canyon.js?v=701",
    "./src/ascendancy.js?v=701",
    "./src/wonders.js?v=701",
    "./src/sling.js?v=701",
    "./src/atlas-colors.js?v=701",
    "./src/skylands.js?v=701",
    "./src/surveyor.js?v=701",
    "./src/torn-pages.js?v=701",
    "./src/threads.js?v=701",
    "./src/lattice-fields.js?v=701",
    "./src/dungeon-traps.js?v=701",
    "./src/listener-mirror.js?v=701",
    "./src/hometowns.js?v=701",
    "./src/listener-arena.js?v=701",
    "./src/listener-morph.js?v=701",
    "./src/build-presets.js?v=701",
    "./src/smithy.js?v=701",
    "./src/ilse.js?v=701",
    "./src/bells.js?v=701",
    "./src/meals.js?v=701",
    "./src/margins.js?v=701",
    "./src/marginalia.js?v=701",
    "./src/tyrant-hunt.js?v=701",
    "./src/world-beasts.js?v=701",
    "./src/elders.js?v=701",
    "./src/far-array.js?v=701",
    "./src/combat-visuals.js?v=701",
    "./src/dungeon-framework.js?v=701",
    "./src/elites.js?v=701",
    "./src/random.js?v=701",
    "./src/types.js?v=701",
    "./src/story.js?v=701",
    "./src/foundry.js?v=701",
    "./src/world.js?v=701",
    "./src/deep-dungeons.js?v=701",
    "./src/scenes.js?v=701",
    "./src/arenas.js?v=701",
    "./src/items.js?v=701",
    "./src/combat.js?v=701",
    "./src/interactions.js?v=701",
    "./src/persistence.js?v=701",
    "./src/input.js?v=701",
    "./src/game.js?v=701",
    "./src/renderer.js?v=701",
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
