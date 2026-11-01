const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v694`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=694",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=694",
    "./src/proving-ground.js?v=694",
    "./src/proving-ground-fixtures.js?v=694",
    "./src/proving-ground-labs.js?v=694",
    "./src/dungeon-variation.js?v=694",
    "./src/dungeon-completion.js?v=694",
    "./src/enemy-patterns.js?v=694",
    "./src/monster-pack.js?v=694",
    "./src/monster-render.js?v=694",
    "./src/astral-worm.js?v=694",
    "./src/astral-worm-render.js?v=694",
    "./src/astral-worm-retreat.js?v=694",
    "./src/astral-worm-mount.js?v=694",
    "./src/lightning-giant-render.js?v=694",
    "./src/astral-encounters.js?v=694",
    "./src/astral-world-retreat.js?v=694",
    "./src/landscape.js?v=694",
    "./src/landscape-render.js?v=694",
    "./src/underlands.js?v=694",
    "./src/pattern-dungeons.js?v=694",
    "./src/relay-network.js?v=694",
    "./src/glyphs.js?v=694",
    "./src/echoes.js?v=694",
    "./src/constellation.js?v=694",
    "./src/water-traversal.js?v=694",
    "./src/open-sea.js?v=694",
    "./src/boats.js?v=694",
    "./src/sea-creatures.js?v=694",
    "./src/diving.js?v=694",
    "./src/grottoes.js?v=694",
    "./src/spell-slots.js?v=694",
    "./src/settlements.js?v=694",
    "./src/skirmishes.js?v=694",
    "./src/travelers.js?v=694",
    "./src/diagnostic-probe.js?v=694",
    "./src/questing-beast.js?v=694",
    "./src/recitations.js?v=694",
    "./src/lore.js?v=694",
    "./src/glimpses.js?v=694",
    "./src/glimpse-render.js?v=694",
    "./src/glimpse-paint.js?v=694",
    "./src/glimpse-scenes.js?v=694",
    "./src/glimpse-horror.js?v=694",
    "./src/glimpse-legend.js?v=694",
    "./src/glimpse-hand.js?v=694",
    "./src/atlas-view.js?v=694",
    "./src/strange.js?v=694",
    "./src/linked-dungeons.js?v=694",
    "./src/digging.js?v=694",
    "./src/building.js?v=694",
    "./src/refuge-lands.js?v=694",
    "./src/revenant-horde.js?v=694",
    "./src/stages.js?v=694",
    "./src/watcher.js?v=694",
    "./src/vehicle-gates.js?v=694",
    "./src/dungeon-ladder.js?v=694",
    "./src/potions.js?v=694",
    "./src/transit-lattice.js?v=694",
    "./src/late-spells.js?v=694",
    "./src/brawler-spells.js?v=694",
    "./src/orbit-volley.js?v=694",
    "./src/tool-forms.js?v=694",
    "./src/trees.js?v=694",
    "./src/fractured.js?v=694",
    "./src/affixes.js?v=694",
    "./src/boss-kit.js?v=694",
    "./src/stalker.js?v=694",
    "./src/stalker-render.js?v=694",
    "./src/deep-annex.js?v=694",
    "./src/the-deep.js?v=694",
    "./src/seasons.js?v=694",
    "./src/keeps.js?v=694",
    "./src/canyon.js?v=694",
    "./src/wonders.js?v=694",
    "./src/sling.js?v=694",
    "./src/atlas-colors.js?v=694",
    "./src/skylands.js?v=694",
    "./src/surveyor.js?v=694",
    "./src/torn-pages.js?v=694",
    "./src/threads.js?v=694",
    "./src/lattice-fields.js?v=694",
    "./src/dungeon-traps.js?v=694",
    "./src/listener-mirror.js?v=694",
    "./src/hometowns.js?v=694",
    "./src/listener-arena.js?v=694",
    "./src/listener-morph.js?v=694",
    "./src/build-presets.js?v=694",
    "./src/smithy.js?v=694",
    "./src/ilse.js?v=694",
    "./src/bells.js?v=694",
    "./src/meals.js?v=694",
    "./src/margins.js?v=694",
    "./src/marginalia.js?v=694",
    "./src/tyrant-hunt.js?v=694",
    "./src/world-beasts.js?v=694",
    "./src/elders.js?v=694",
    "./src/far-array.js?v=694",
    "./src/combat-visuals.js?v=694",
    "./src/dungeon-framework.js?v=694",
    "./src/elites.js?v=694",
    "./src/random.js?v=694",
    "./src/types.js?v=694",
    "./src/story.js?v=694",
    "./src/foundry.js?v=694",
    "./src/world.js?v=694",
    "./src/deep-dungeons.js?v=694",
    "./src/scenes.js?v=694",
    "./src/arenas.js?v=694",
    "./src/items.js?v=694",
    "./src/combat.js?v=694",
    "./src/interactions.js?v=694",
    "./src/persistence.js?v=694",
    "./src/input.js?v=694",
    "./src/game.js?v=694",
    "./src/renderer.js?v=694",
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
