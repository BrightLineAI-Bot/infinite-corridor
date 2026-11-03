const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v705`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=705",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=705",
    "./src/proving-ground.js?v=705",
    "./src/proving-ground-fixtures.js?v=705",
    "./src/proving-ground-labs.js?v=705",
    "./src/dungeon-variation.js?v=705",
    "./src/dungeon-completion.js?v=705",
    "./src/enemy-patterns.js?v=705",
    "./src/monster-pack.js?v=705",
    "./src/monster-render.js?v=705",
    "./src/astral-worm.js?v=705",
    "./src/astral-worm-render.js?v=705",
    "./src/astral-worm-retreat.js?v=705",
    "./src/astral-worm-mount.js?v=705",
    "./src/lightning-giant-render.js?v=705",
    "./src/briar-stag-render.js?v=705",
    "./src/astral-encounters.js?v=705",
    "./src/astral-world-retreat.js?v=705",
    "./src/landscape.js?v=705",
    "./src/landscape-render.js?v=705",
    "./src/underlands.js?v=705",
    "./src/pattern-dungeons.js?v=705",
    "./src/relay-network.js?v=705",
    "./src/glyphs.js?v=705",
    "./src/echoes.js?v=705",
    "./src/constellation.js?v=705",
    "./src/water-traversal.js?v=705",
    "./src/open-sea.js?v=705",
    "./src/boats.js?v=705",
    "./src/sea-creatures.js?v=705",
    "./src/diving.js?v=705",
    "./src/grottoes.js?v=705",
    "./src/spell-slots.js?v=705",
    "./src/settlements.js?v=705",
    "./src/skirmishes.js?v=705",
    "./src/travelers.js?v=705",
    "./src/diagnostic-probe.js?v=705",
    "./src/questing-beast.js?v=705",
    "./src/recitations.js?v=705",
    "./src/lore.js?v=705",
    "./src/glimpses.js?v=705",
    "./src/glimpse-render.js?v=705",
    "./src/glimpse-paint.js?v=705",
    "./src/glimpse-scenes.js?v=705",
    "./src/glimpse-horror.js?v=705",
    "./src/glimpse-legend.js?v=705",
    "./src/glimpse-hand.js?v=705",
    "./src/atlas-view.js?v=705",
    "./src/strange.js?v=705",
    "./src/linked-dungeons.js?v=705",
    "./src/digging.js?v=705",
    "./src/building.js?v=705",
    "./src/refuge-lands.js?v=705",
    "./src/revenant-horde.js?v=705",
    "./src/stages.js?v=705",
    "./src/watcher.js?v=705",
    "./src/vehicle-gates.js?v=705",
    "./src/dungeon-ladder.js?v=705",
    "./src/potions.js?v=705",
    "./src/transit-lattice.js?v=705",
    "./src/late-spells.js?v=705",
    "./src/brawler-spells.js?v=705",
    "./src/orbit-volley.js?v=705",
    "./src/tool-forms.js?v=705",
    "./src/trees.js?v=705",
    "./src/fractured.js?v=705",
    "./src/affixes.js?v=705",
    "./src/boss-kit.js?v=705",
    "./src/stalker.js?v=705",
    "./src/stalker-render.js?v=705",
    "./src/deep-annex.js?v=705",
    "./src/the-deep.js?v=705",
    "./src/seasons.js?v=705",
    "./src/keeps.js?v=705",
    "./src/canyon.js?v=705",
    "./src/ascendancy.js?v=705",
    "./src/wonders.js?v=705",
    "./src/sling.js?v=705",
    "./src/atlas-colors.js?v=705",
    "./src/skylands.js?v=705",
    "./src/surveyor.js?v=705",
    "./src/torn-pages.js?v=705",
    "./src/threads.js?v=705",
    "./src/lattice-fields.js?v=705",
    "./src/dungeon-traps.js?v=705",
    "./src/listener-mirror.js?v=705",
    "./src/hometowns.js?v=705",
    "./src/listener-arena.js?v=705",
    "./src/listener-morph.js?v=705",
    "./src/build-presets.js?v=705",
    "./src/smithy.js?v=705",
    "./src/ilse.js?v=705",
    "./src/bells.js?v=705",
    "./src/meals.js?v=705",
    "./src/margins.js?v=705",
    "./src/marginalia.js?v=705",
    "./src/tyrant-hunt.js?v=705",
    "./src/world-beasts.js?v=705",
    "./src/elders.js?v=705",
    "./src/far-array.js?v=705",
    "./src/combat-visuals.js?v=705",
    "./src/dungeon-framework.js?v=705",
    "./src/elites.js?v=705",
    "./src/random.js?v=705",
    "./src/types.js?v=705",
    "./src/story.js?v=705",
    "./src/foundry.js?v=705",
    "./src/world.js?v=705",
    "./src/deep-dungeons.js?v=705",
    "./src/scenes.js?v=705",
    "./src/arenas.js?v=705",
    "./src/items.js?v=705",
    "./src/combat.js?v=705",
    "./src/interactions.js?v=705",
    "./src/persistence.js?v=705",
    "./src/input.js?v=705",
    "./src/game.js?v=705",
    "./src/renderer.js?v=705",
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
