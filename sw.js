const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v710`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=710",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=710",
    "./src/proving-ground.js?v=710",
    "./src/proving-ground-fixtures.js?v=710",
    "./src/proving-ground-labs.js?v=710",
    "./src/dungeon-variation.js?v=710",
    "./src/dungeon-completion.js?v=710",
    "./src/enemy-patterns.js?v=710",
    "./src/monster-pack.js?v=710",
    "./src/monster-render.js?v=710",
    "./src/astral-worm.js?v=710",
    "./src/astral-worm-render.js?v=710",
    "./src/astral-worm-retreat.js?v=710",
    "./src/astral-worm-mount.js?v=710",
    "./src/lightning-giant-render.js?v=710",
    "./src/briar-stag-render.js?v=710",
    "./src/ashen-moth-render.js?v=710",
    "./src/crimson-dragon.js?v=710",
    "./src/crimson-dragon-render.js?v=710",
    "./src/astral-encounters.js?v=710",
    "./src/astral-world-retreat.js?v=710",
    "./src/landscape.js?v=710",
    "./src/landscape-render.js?v=710",
    "./src/underlands.js?v=710",
    "./src/pattern-dungeons.js?v=710",
    "./src/relay-network.js?v=710",
    "./src/glyphs.js?v=710",
    "./src/echoes.js?v=710",
    "./src/constellation.js?v=710",
    "./src/water-traversal.js?v=710",
    "./src/open-sea.js?v=710",
    "./src/boats.js?v=710",
    "./src/sea-creatures.js?v=710",
    "./src/diving.js?v=710",
    "./src/grottoes.js?v=710",
    "./src/spell-slots.js?v=710",
    "./src/settlements.js?v=710",
    "./src/skirmishes.js?v=710",
    "./src/travelers.js?v=710",
    "./src/diagnostic-probe.js?v=710",
    "./src/questing-beast.js?v=710",
    "./src/recitations.js?v=710",
    "./src/lore.js?v=710",
    "./src/glimpses.js?v=710",
    "./src/glimpse-render.js?v=710",
    "./src/glimpse-paint.js?v=710",
    "./src/glimpse-scenes.js?v=710",
    "./src/glimpse-horror.js?v=710",
    "./src/glimpse-legend.js?v=710",
    "./src/glimpse-hand.js?v=710",
    "./src/atlas-view.js?v=710",
    "./src/strange.js?v=710",
    "./src/linked-dungeons.js?v=710",
    "./src/digging.js?v=710",
    "./src/building.js?v=710",
    "./src/refuge-lands.js?v=710",
    "./src/revenant-horde.js?v=710",
    "./src/stages.js?v=710",
    "./src/watcher.js?v=710",
    "./src/vehicle-gates.js?v=710",
    "./src/dungeon-ladder.js?v=710",
    "./src/potions.js?v=710",
    "./src/transit-lattice.js?v=710",
    "./src/late-spells.js?v=710",
    "./src/brawler-spells.js?v=710",
    "./src/orbit-volley.js?v=710",
    "./src/tool-forms.js?v=710",
    "./src/trees.js?v=710",
    "./src/fractured.js?v=710",
    "./src/affixes.js?v=710",
    "./src/boss-kit.js?v=710",
    "./src/stalker.js?v=710",
    "./src/stalker-render.js?v=710",
    "./src/deep-annex.js?v=710",
    "./src/the-deep.js?v=710",
    "./src/seasons.js?v=710",
    "./src/keeps.js?v=710",
    "./src/great-buildings.js?v=710",
    "./src/canyon.js?v=710",
    "./src/ascendancy.js?v=710",
    "./src/wonders.js?v=710",
    "./src/sling.js?v=710",
    "./src/atlas-colors.js?v=710",
    "./src/skylands.js?v=710",
    "./src/surveyor.js?v=710",
    "./src/torn-pages.js?v=710",
    "./src/threads.js?v=710",
    "./src/lattice-fields.js?v=710",
    "./src/dungeon-traps.js?v=710",
    "./src/listener-mirror.js?v=710",
    "./src/hometowns.js?v=710",
    "./src/listener-arena.js?v=710",
    "./src/listener-morph.js?v=710",
    "./src/build-presets.js?v=710",
    "./src/smithy.js?v=710",
    "./src/ilse.js?v=710",
    "./src/bells.js?v=710",
    "./src/meals.js?v=710",
    "./src/margins.js?v=710",
    "./src/marginalia.js?v=710",
    "./src/tyrant-hunt.js?v=710",
    "./src/world-beasts.js?v=710",
    "./src/elders.js?v=710",
    "./src/far-array.js?v=710",
    "./src/combat-visuals.js?v=710",
    "./src/dungeon-framework.js?v=710",
    "./src/elites.js?v=710",
    "./src/random.js?v=710",
    "./src/types.js?v=710",
    "./src/story.js?v=710",
    "./src/foundry.js?v=710",
    "./src/world.js?v=710",
    "./src/deep-dungeons.js?v=710",
    "./src/scenes.js?v=710",
    "./src/arenas.js?v=710",
    "./src/items.js?v=710",
    "./src/combat.js?v=710",
    "./src/interactions.js?v=710",
    "./src/persistence.js?v=710",
    "./src/input.js?v=710",
    "./src/game.js?v=710",
    "./src/renderer.js?v=710",
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
