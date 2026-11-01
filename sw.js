const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v674`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=674",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=674",
    "./src/proving-ground.js?v=674",
    "./src/proving-ground-fixtures.js?v=674",
    "./src/proving-ground-labs.js?v=674",
    "./src/dungeon-variation.js?v=674",
    "./src/dungeon-completion.js?v=674",
    "./src/enemy-patterns.js?v=674",
    "./src/monster-pack.js?v=674",
    "./src/monster-render.js?v=674",
    "./src/astral-worm.js?v=674",
    "./src/astral-worm-render.js?v=674",
    "./src/astral-worm-retreat.js?v=674",
    "./src/astral-worm-mount.js?v=674",
    "./src/lightning-giant-render.js?v=674",
    "./src/astral-encounters.js?v=674",
    "./src/astral-world-retreat.js?v=674",
    "./src/landscape.js?v=674",
    "./src/landscape-render.js?v=674",
    "./src/underlands.js?v=674",
    "./src/pattern-dungeons.js?v=674",
    "./src/relay-network.js?v=674",
    "./src/glyphs.js?v=674",
    "./src/echoes.js?v=674",
    "./src/constellation.js?v=674",
    "./src/water-traversal.js?v=674",
    "./src/open-sea.js?v=674",
    "./src/boats.js?v=674",
    "./src/sea-creatures.js?v=674",
    "./src/diving.js?v=674",
    "./src/grottoes.js?v=674",
    "./src/spell-slots.js?v=674",
    "./src/settlements.js?v=674",
    "./src/skirmishes.js?v=674",
    "./src/travelers.js?v=674",
    "./src/diagnostic-probe.js?v=674",
    "./src/questing-beast.js?v=674",
    "./src/recitations.js?v=674",
    "./src/lore.js?v=674",
    "./src/glimpses.js?v=674",
    "./src/glimpse-render.js?v=674",
    "./src/glimpse-paint.js?v=674",
    "./src/glimpse-scenes.js?v=674",
    "./src/glimpse-horror.js?v=674",
    "./src/glimpse-legend.js?v=674",
    "./src/glimpse-hand.js?v=674",
    "./src/atlas-view.js?v=674",
    "./src/strange.js?v=674",
    "./src/linked-dungeons.js?v=674",
    "./src/digging.js?v=674",
    "./src/building.js?v=674",
    "./src/refuge-lands.js?v=674",
    "./src/revenant-horde.js?v=674",
    "./src/stages.js?v=674",
    "./src/watcher.js?v=674",
    "./src/vehicle-gates.js?v=674",
    "./src/dungeon-ladder.js?v=674",
    "./src/potions.js?v=674",
    "./src/transit-lattice.js?v=674",
    "./src/late-spells.js?v=674",
    "./src/brawler-spells.js?v=674",
    "./src/orbit-volley.js?v=674",
    "./src/tool-forms.js?v=674",
    "./src/trees.js?v=674",
    "./src/fractured.js?v=674",
    "./src/affixes.js?v=674",
    "./src/boss-kit.js?v=674",
    "./src/wonders.js?v=674",
    "./src/sling.js?v=674",
    "./src/atlas-colors.js?v=674",
    "./src/skylands.js?v=674",
    "./src/surveyor.js?v=674",
    "./src/torn-pages.js?v=674",
    "./src/threads.js?v=674",
    "./src/lattice-fields.js?v=674",
    "./src/dungeon-traps.js?v=674",
    "./src/listener-mirror.js?v=674",
    "./src/hometowns.js?v=674",
    "./src/listener-arena.js?v=674",
    "./src/listener-morph.js?v=674",
    "./src/build-presets.js?v=674",
    "./src/smithy.js?v=674",
    "./src/ilse.js?v=674",
    "./src/bells.js?v=674",
    "./src/meals.js?v=674",
    "./src/margins.js?v=674",
    "./src/marginalia.js?v=674",
    "./src/tyrant-hunt.js?v=674",
    "./src/world-beasts.js?v=674",
    "./src/elders.js?v=674",
    "./src/far-array.js?v=674",
    "./src/combat-visuals.js?v=674",
    "./src/dungeon-framework.js?v=674",
    "./src/elites.js?v=674",
    "./src/random.js?v=674",
    "./src/types.js?v=674",
    "./src/story.js?v=674",
    "./src/foundry.js?v=674",
    "./src/world.js?v=674",
    "./src/deep-dungeons.js?v=674",
    "./src/scenes.js?v=674",
    "./src/arenas.js?v=674",
    "./src/items.js?v=674",
    "./src/combat.js?v=674",
    "./src/interactions.js?v=674",
    "./src/persistence.js?v=674",
    "./src/input.js?v=674",
    "./src/game.js?v=674",
    "./src/renderer.js?v=674",
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
// Release 671 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
