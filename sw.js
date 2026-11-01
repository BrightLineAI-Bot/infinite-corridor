const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r684-436ff24739ec`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r684-436ff24739ec",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r684-436ff24739ec",
    "./src/proving-ground.js?v=r684-436ff24739ec",
    "./src/proving-ground-fixtures.js?v=r684-436ff24739ec",
    "./src/proving-ground-labs.js?v=r684-436ff24739ec",
    "./src/dungeon-variation.js?v=r684-436ff24739ec",
    "./src/dungeon-completion.js?v=r684-436ff24739ec",
    "./src/enemy-patterns.js?v=r684-436ff24739ec",
    "./src/monster-pack.js?v=r684-436ff24739ec",
    "./src/monster-render.js?v=r684-436ff24739ec",
    "./src/astral-worm.js?v=r684-436ff24739ec",
    "./src/astral-worm-render.js?v=r684-436ff24739ec",
    "./src/astral-worm-retreat.js?v=r684-436ff24739ec",
    "./src/astral-worm-mount.js?v=r684-436ff24739ec",
    "./src/lightning-giant-render.js?v=r684-436ff24739ec",
    "./src/astral-encounters.js?v=r684-436ff24739ec",
    "./src/astral-world-retreat.js?v=r684-436ff24739ec",
    "./src/landscape.js?v=r684-436ff24739ec",
    "./src/landscape-render.js?v=r684-436ff24739ec",
    "./src/underlands.js?v=r684-436ff24739ec",
    "./src/pattern-dungeons.js?v=r684-436ff24739ec",
    "./src/relay-network.js?v=r684-436ff24739ec",
    "./src/glyphs.js?v=r684-436ff24739ec",
    "./src/echoes.js?v=r684-436ff24739ec",
    "./src/constellation.js?v=r684-436ff24739ec",
    "./src/water-traversal.js?v=r684-436ff24739ec",
    "./src/open-sea.js?v=r684-436ff24739ec",
    "./src/boats.js?v=r684-436ff24739ec",
    "./src/sea-creatures.js?v=r684-436ff24739ec",
    "./src/diving.js?v=r684-436ff24739ec",
    "./src/grottoes.js?v=r684-436ff24739ec",
    "./src/spell-slots.js?v=r684-436ff24739ec",
    "./src/settlements.js?v=r684-436ff24739ec",
    "./src/skirmishes.js?v=r684-436ff24739ec",
    "./src/travelers.js?v=r684-436ff24739ec",
    "./src/diagnostic-probe.js?v=r684-436ff24739ec",
    "./src/questing-beast.js?v=r684-436ff24739ec",
    "./src/recitations.js?v=r684-436ff24739ec",
    "./src/lore.js?v=r684-436ff24739ec",
    "./src/glimpses.js?v=r684-436ff24739ec",
    "./src/glimpse-render.js?v=r684-436ff24739ec",
    "./src/glimpse-paint.js?v=r684-436ff24739ec",
    "./src/glimpse-scenes.js?v=r684-436ff24739ec",
    "./src/glimpse-horror.js?v=r684-436ff24739ec",
    "./src/glimpse-legend.js?v=r684-436ff24739ec",
    "./src/glimpse-hand.js?v=r684-436ff24739ec",
    "./src/atlas-view.js?v=r684-436ff24739ec",
    "./src/strange.js?v=r684-436ff24739ec",
    "./src/linked-dungeons.js?v=r684-436ff24739ec",
    "./src/digging.js?v=r684-436ff24739ec",
    "./src/building.js?v=r684-436ff24739ec",
    "./src/refuge-lands.js?v=r684-436ff24739ec",
    "./src/revenant-horde.js?v=r684-436ff24739ec",
    "./src/stages.js?v=r684-436ff24739ec",
    "./src/watcher.js?v=r684-436ff24739ec",
    "./src/vehicle-gates.js?v=r684-436ff24739ec",
    "./src/dungeon-ladder.js?v=r684-436ff24739ec",
    "./src/potions.js?v=r684-436ff24739ec",
    "./src/transit-lattice.js?v=r684-436ff24739ec",
    "./src/late-spells.js?v=r684-436ff24739ec",
    "./src/brawler-spells.js?v=r684-436ff24739ec",
    "./src/orbit-volley.js?v=r684-436ff24739ec",
    "./src/tool-forms.js?v=r684-436ff24739ec",
    "./src/trees.js?v=r684-436ff24739ec",
    "./src/fractured.js?v=r684-436ff24739ec",
    "./src/affixes.js?v=r684-436ff24739ec",
    "./src/boss-kit.js?v=r684-436ff24739ec",
    "./src/stalker.js?v=r684-436ff24739ec",
    "./src/stalker-render.js?v=r684-436ff24739ec",
    "./src/deep-annex.js?v=r684-436ff24739ec",
    "./src/the-deep.js?v=r684-436ff24739ec",
    "./src/seasons.js?v=r684-436ff24739ec",
    "./src/keeps.js?v=r684-436ff24739ec",
    "./src/wonders.js?v=r684-436ff24739ec",
    "./src/sling.js?v=r684-436ff24739ec",
    "./src/atlas-colors.js?v=r684-436ff24739ec",
    "./src/skylands.js?v=r684-436ff24739ec",
    "./src/surveyor.js?v=r684-436ff24739ec",
    "./src/torn-pages.js?v=r684-436ff24739ec",
    "./src/threads.js?v=r684-436ff24739ec",
    "./src/lattice-fields.js?v=r684-436ff24739ec",
    "./src/dungeon-traps.js?v=r684-436ff24739ec",
    "./src/listener-mirror.js?v=r684-436ff24739ec",
    "./src/hometowns.js?v=r684-436ff24739ec",
    "./src/listener-arena.js?v=r684-436ff24739ec",
    "./src/listener-morph.js?v=r684-436ff24739ec",
    "./src/build-presets.js?v=r684-436ff24739ec",
    "./src/smithy.js?v=r684-436ff24739ec",
    "./src/ilse.js?v=r684-436ff24739ec",
    "./src/bells.js?v=r684-436ff24739ec",
    "./src/meals.js?v=r684-436ff24739ec",
    "./src/margins.js?v=r684-436ff24739ec",
    "./src/marginalia.js?v=r684-436ff24739ec",
    "./src/tyrant-hunt.js?v=r684-436ff24739ec",
    "./src/world-beasts.js?v=r684-436ff24739ec",
    "./src/elders.js?v=r684-436ff24739ec",
    "./src/far-array.js?v=r684-436ff24739ec",
    "./src/combat-visuals.js?v=r684-436ff24739ec",
    "./src/dungeon-framework.js?v=r684-436ff24739ec",
    "./src/elites.js?v=r684-436ff24739ec",
    "./src/random.js?v=r684-436ff24739ec",
    "./src/types.js?v=r684-436ff24739ec",
    "./src/story.js?v=r684-436ff24739ec",
    "./src/foundry.js?v=r684-436ff24739ec",
    "./src/world.js?v=r684-436ff24739ec",
    "./src/deep-dungeons.js?v=r684-436ff24739ec",
    "./src/scenes.js?v=r684-436ff24739ec",
    "./src/arenas.js?v=r684-436ff24739ec",
    "./src/items.js?v=r684-436ff24739ec",
    "./src/combat.js?v=r684-436ff24739ec",
    "./src/interactions.js?v=r684-436ff24739ec",
    "./src/persistence.js?v=r684-436ff24739ec",
    "./src/input.js?v=r684-436ff24739ec",
    "./src/game.js?v=r684-436ff24739ec",
    "./src/renderer.js?v=r684-436ff24739ec",
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
