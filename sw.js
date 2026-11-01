const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v673`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=673",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=673",
    "./src/proving-ground.js?v=673",
    "./src/proving-ground-fixtures.js?v=673",
    "./src/proving-ground-labs.js?v=673",
    "./src/dungeon-variation.js?v=673",
    "./src/dungeon-completion.js?v=673",
    "./src/enemy-patterns.js?v=673",
    "./src/monster-pack.js?v=673",
    "./src/monster-render.js?v=673",
    "./src/astral-worm.js?v=673",
    "./src/astral-worm-render.js?v=673",
    "./src/astral-worm-retreat.js?v=673",
    "./src/astral-worm-mount.js?v=673",
    "./src/lightning-giant-render.js?v=673",
    "./src/astral-encounters.js?v=673",
    "./src/astral-world-retreat.js?v=673",
    "./src/landscape.js?v=673",
    "./src/landscape-render.js?v=673",
    "./src/underlands.js?v=673",
    "./src/pattern-dungeons.js?v=673",
    "./src/relay-network.js?v=673",
    "./src/glyphs.js?v=673",
    "./src/echoes.js?v=673",
    "./src/constellation.js?v=673",
    "./src/water-traversal.js?v=673",
    "./src/open-sea.js?v=673",
    "./src/boats.js?v=673",
    "./src/sea-creatures.js?v=673",
    "./src/diving.js?v=673",
    "./src/grottoes.js?v=673",
    "./src/spell-slots.js?v=673",
    "./src/settlements.js?v=673",
    "./src/skirmishes.js?v=673",
    "./src/travelers.js?v=673",
    "./src/diagnostic-probe.js?v=673",
    "./src/questing-beast.js?v=673",
    "./src/recitations.js?v=673",
    "./src/lore.js?v=673",
    "./src/glimpses.js?v=673",
    "./src/glimpse-render.js?v=673",
    "./src/glimpse-paint.js?v=673",
    "./src/glimpse-scenes.js?v=673",
    "./src/glimpse-horror.js?v=673",
    "./src/glimpse-legend.js?v=673",
    "./src/glimpse-hand.js?v=673",
    "./src/atlas-view.js?v=673",
    "./src/strange.js?v=673",
    "./src/linked-dungeons.js?v=673",
    "./src/digging.js?v=673",
    "./src/building.js?v=673",
    "./src/refuge-lands.js?v=673",
    "./src/revenant-horde.js?v=673",
    "./src/stages.js?v=673",
    "./src/watcher.js?v=673",
    "./src/vehicle-gates.js?v=673",
    "./src/dungeon-ladder.js?v=673",
    "./src/potions.js?v=673",
    "./src/transit-lattice.js?v=673",
    "./src/late-spells.js?v=673",
    "./src/brawler-spells.js?v=673",
    "./src/orbit-volley.js?v=673",
    "./src/tool-forms.js?v=673",
    "./src/trees.js?v=673",
    "./src/fractured.js?v=673",
    "./src/affixes.js?v=673",
    "./src/boss-kit.js?v=673",
    "./src/deep-annex.js?v=673",
    "./src/sling.js?v=673",
    "./src/atlas-colors.js?v=673",
    "./src/skylands.js?v=673",
    "./src/surveyor.js?v=673",
    "./src/torn-pages.js?v=673",
    "./src/threads.js?v=673",
    "./src/lattice-fields.js?v=673",
    "./src/dungeon-traps.js?v=673",
    "./src/listener-mirror.js?v=673",
    "./src/hometowns.js?v=673",
    "./src/listener-arena.js?v=673",
    "./src/listener-morph.js?v=673",
    "./src/build-presets.js?v=673",
    "./src/smithy.js?v=673",
    "./src/ilse.js?v=673",
    "./src/bells.js?v=673",
    "./src/meals.js?v=673",
    "./src/margins.js?v=673",
    "./src/marginalia.js?v=673",
    "./src/tyrant-hunt.js?v=673",
    "./src/world-beasts.js?v=673",
    "./src/elders.js?v=673",
    "./src/far-array.js?v=673",
    "./src/combat-visuals.js?v=673",
    "./src/dungeon-framework.js?v=673",
    "./src/elites.js?v=673",
    "./src/random.js?v=673",
    "./src/types.js?v=673",
    "./src/story.js?v=673",
    "./src/foundry.js?v=673",
    "./src/world.js?v=673",
    "./src/deep-dungeons.js?v=673",
    "./src/scenes.js?v=673",
    "./src/arenas.js?v=673",
    "./src/items.js?v=673",
    "./src/combat.js?v=673",
    "./src/interactions.js?v=673",
    "./src/persistence.js?v=673",
    "./src/input.js?v=673",
    "./src/game.js?v=673",
    "./src/renderer.js?v=673",
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
// Release 673 (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
