const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v683`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=683",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=683",
    "./src/proving-ground.js?v=683",
    "./src/proving-ground-fixtures.js?v=683",
    "./src/proving-ground-labs.js?v=683",
    "./src/dungeon-variation.js?v=683",
    "./src/dungeon-completion.js?v=683",
    "./src/enemy-patterns.js?v=683",
    "./src/monster-pack.js?v=683",
    "./src/monster-render.js?v=683",
    "./src/astral-worm.js?v=683",
    "./src/astral-worm-render.js?v=683",
    "./src/astral-worm-retreat.js?v=683",
    "./src/astral-worm-mount.js?v=683",
    "./src/lightning-giant-render.js?v=683",
    "./src/astral-encounters.js?v=683",
    "./src/astral-world-retreat.js?v=683",
    "./src/landscape.js?v=683",
    "./src/landscape-render.js?v=683",
    "./src/underlands.js?v=683",
    "./src/pattern-dungeons.js?v=683",
    "./src/relay-network.js?v=683",
    "./src/glyphs.js?v=683",
    "./src/echoes.js?v=683",
    "./src/constellation.js?v=683",
    "./src/water-traversal.js?v=683",
    "./src/open-sea.js?v=683",
    "./src/boats.js?v=683",
    "./src/sea-creatures.js?v=683",
    "./src/diving.js?v=683",
    "./src/grottoes.js?v=683",
    "./src/spell-slots.js?v=683",
    "./src/settlements.js?v=683",
    "./src/skirmishes.js?v=683",
    "./src/travelers.js?v=683",
    "./src/diagnostic-probe.js?v=683",
    "./src/questing-beast.js?v=683",
    "./src/recitations.js?v=683",
    "./src/lore.js?v=683",
    "./src/glimpses.js?v=683",
    "./src/glimpse-render.js?v=683",
    "./src/glimpse-paint.js?v=683",
    "./src/glimpse-scenes.js?v=683",
    "./src/glimpse-horror.js?v=683",
    "./src/glimpse-legend.js?v=683",
    "./src/glimpse-hand.js?v=683",
    "./src/atlas-view.js?v=683",
    "./src/strange.js?v=683",
    "./src/linked-dungeons.js?v=683",
    "./src/digging.js?v=683",
    "./src/building.js?v=683",
    "./src/refuge-lands.js?v=683",
    "./src/revenant-horde.js?v=683",
    "./src/stages.js?v=683",
    "./src/watcher.js?v=683",
    "./src/vehicle-gates.js?v=683",
    "./src/dungeon-ladder.js?v=683",
    "./src/potions.js?v=683",
    "./src/transit-lattice.js?v=683",
    "./src/late-spells.js?v=683",
    "./src/brawler-spells.js?v=683",
    "./src/orbit-volley.js?v=683",
    "./src/tool-forms.js?v=683",
    "./src/trees.js?v=683",
    "./src/fractured.js?v=683",
    "./src/affixes.js?v=683",
    "./src/boss-kit.js?v=683",
    "./src/stalker.js?v=683",
    "./src/stalker-render.js?v=683",
    "./src/deep-annex.js?v=683",
    "./src/the-deep.js?v=683",
    "./src/seasons.js?v=683",
    "./src/keeps.js?v=683",
    "./src/wonders.js?v=683",
    "./src/sling.js?v=683",
    "./src/atlas-colors.js?v=683",
    "./src/skylands.js?v=683",
    "./src/surveyor.js?v=683",
    "./src/torn-pages.js?v=683",
    "./src/threads.js?v=683",
    "./src/lattice-fields.js?v=683",
    "./src/dungeon-traps.js?v=683",
    "./src/listener-mirror.js?v=683",
    "./src/hometowns.js?v=683",
    "./src/listener-arena.js?v=683",
    "./src/listener-morph.js?v=683",
    "./src/build-presets.js?v=683",
    "./src/smithy.js?v=683",
    "./src/ilse.js?v=683",
    "./src/bells.js?v=683",
    "./src/meals.js?v=683",
    "./src/margins.js?v=683",
    "./src/marginalia.js?v=683",
    "./src/tyrant-hunt.js?v=683",
    "./src/world-beasts.js?v=683",
    "./src/elders.js?v=683",
    "./src/far-array.js?v=683",
    "./src/combat-visuals.js?v=683",
    "./src/dungeon-framework.js?v=683",
    "./src/elites.js?v=683",
    "./src/random.js?v=683",
    "./src/types.js?v=683",
    "./src/story.js?v=683",
    "./src/foundry.js?v=683",
    "./src/world.js?v=683",
    "./src/deep-dungeons.js?v=683",
    "./src/scenes.js?v=683",
    "./src/arenas.js?v=683",
    "./src/items.js?v=683",
    "./src/combat.js?v=683",
    "./src/interactions.js?v=683",
    "./src/persistence.js?v=683",
    "./src/input.js?v=683",
    "./src/game.js?v=683",
    "./src/renderer.js?v=683",
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
