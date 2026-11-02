const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v703`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=703",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=703",
    "./src/proving-ground.js?v=703",
    "./src/proving-ground-fixtures.js?v=703",
    "./src/proving-ground-labs.js?v=703",
    "./src/dungeon-variation.js?v=703",
    "./src/dungeon-completion.js?v=703",
    "./src/enemy-patterns.js?v=703",
    "./src/monster-pack.js?v=703",
    "./src/monster-render.js?v=703",
    "./src/astral-worm.js?v=703",
    "./src/astral-worm-render.js?v=703",
    "./src/astral-worm-retreat.js?v=703",
    "./src/astral-worm-mount.js?v=703",
    "./src/lightning-giant-render.js?v=703",
    "./src/astral-encounters.js?v=703",
    "./src/astral-world-retreat.js?v=703",
    "./src/landscape.js?v=703",
    "./src/landscape-render.js?v=703",
    "./src/underlands.js?v=703",
    "./src/pattern-dungeons.js?v=703",
    "./src/relay-network.js?v=703",
    "./src/glyphs.js?v=703",
    "./src/echoes.js?v=703",
    "./src/constellation.js?v=703",
    "./src/water-traversal.js?v=703",
    "./src/open-sea.js?v=703",
    "./src/boats.js?v=703",
    "./src/sea-creatures.js?v=703",
    "./src/diving.js?v=703",
    "./src/grottoes.js?v=703",
    "./src/spell-slots.js?v=703",
    "./src/settlements.js?v=703",
    "./src/skirmishes.js?v=703",
    "./src/travelers.js?v=703",
    "./src/diagnostic-probe.js?v=703",
    "./src/questing-beast.js?v=703",
    "./src/recitations.js?v=703",
    "./src/lore.js?v=703",
    "./src/glimpses.js?v=703",
    "./src/glimpse-render.js?v=703",
    "./src/glimpse-paint.js?v=703",
    "./src/glimpse-scenes.js?v=703",
    "./src/glimpse-horror.js?v=703",
    "./src/glimpse-legend.js?v=703",
    "./src/glimpse-hand.js?v=703",
    "./src/atlas-view.js?v=703",
    "./src/strange.js?v=703",
    "./src/linked-dungeons.js?v=703",
    "./src/digging.js?v=703",
    "./src/building.js?v=703",
    "./src/refuge-lands.js?v=703",
    "./src/revenant-horde.js?v=703",
    "./src/stages.js?v=703",
    "./src/watcher.js?v=703",
    "./src/vehicle-gates.js?v=703",
    "./src/dungeon-ladder.js?v=703",
    "./src/potions.js?v=703",
    "./src/transit-lattice.js?v=703",
    "./src/late-spells.js?v=703",
    "./src/brawler-spells.js?v=703",
    "./src/orbit-volley.js?v=703",
    "./src/tool-forms.js?v=703",
    "./src/trees.js?v=703",
    "./src/fractured.js?v=703",
    "./src/affixes.js?v=703",
    "./src/boss-kit.js?v=703",
    "./src/stalker.js?v=703",
    "./src/stalker-render.js?v=703",
    "./src/deep-annex.js?v=703",
    "./src/the-deep.js?v=703",
    "./src/seasons.js?v=703",
    "./src/keeps.js?v=703",
    "./src/canyon.js?v=703",
    "./src/ascendancy.js?v=703",
    "./src/wonders.js?v=703",
    "./src/sling.js?v=703",
    "./src/atlas-colors.js?v=703",
    "./src/skylands.js?v=703",
    "./src/surveyor.js?v=703",
    "./src/torn-pages.js?v=703",
    "./src/threads.js?v=703",
    "./src/lattice-fields.js?v=703",
    "./src/dungeon-traps.js?v=703",
    "./src/listener-mirror.js?v=703",
    "./src/hometowns.js?v=703",
    "./src/listener-arena.js?v=703",
    "./src/listener-morph.js?v=703",
    "./src/build-presets.js?v=703",
    "./src/smithy.js?v=703",
    "./src/ilse.js?v=703",
    "./src/bells.js?v=703",
    "./src/meals.js?v=703",
    "./src/margins.js?v=703",
    "./src/marginalia.js?v=703",
    "./src/tyrant-hunt.js?v=703",
    "./src/world-beasts.js?v=703",
    "./src/elders.js?v=703",
    "./src/far-array.js?v=703",
    "./src/combat-visuals.js?v=703",
    "./src/dungeon-framework.js?v=703",
    "./src/elites.js?v=703",
    "./src/random.js?v=703",
    "./src/types.js?v=703",
    "./src/story.js?v=703",
    "./src/foundry.js?v=703",
    "./src/world.js?v=703",
    "./src/deep-dungeons.js?v=703",
    "./src/scenes.js?v=703",
    "./src/arenas.js?v=703",
    "./src/items.js?v=703",
    "./src/combat.js?v=703",
    "./src/interactions.js?v=703",
    "./src/persistence.js?v=703",
    "./src/input.js?v=703",
    "./src/game.js?v=703",
    "./src/renderer.js?v=703",
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
