const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v684`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=684",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=684",
    "./src/proving-ground.js?v=684",
    "./src/proving-ground-fixtures.js?v=684",
    "./src/proving-ground-labs.js?v=684",
    "./src/dungeon-variation.js?v=684",
    "./src/dungeon-completion.js?v=684",
    "./src/enemy-patterns.js?v=684",
    "./src/monster-pack.js?v=684",
    "./src/monster-render.js?v=684",
    "./src/astral-worm.js?v=684",
    "./src/astral-worm-render.js?v=684",
    "./src/astral-worm-retreat.js?v=684",
    "./src/astral-worm-mount.js?v=684",
    "./src/lightning-giant-render.js?v=684",
    "./src/astral-encounters.js?v=684",
    "./src/astral-world-retreat.js?v=684",
    "./src/landscape.js?v=684",
    "./src/landscape-render.js?v=684",
    "./src/underlands.js?v=684",
    "./src/pattern-dungeons.js?v=684",
    "./src/relay-network.js?v=684",
    "./src/glyphs.js?v=684",
    "./src/echoes.js?v=684",
    "./src/constellation.js?v=684",
    "./src/water-traversal.js?v=684",
    "./src/open-sea.js?v=684",
    "./src/boats.js?v=684",
    "./src/sea-creatures.js?v=684",
    "./src/diving.js?v=684",
    "./src/grottoes.js?v=684",
    "./src/spell-slots.js?v=684",
    "./src/settlements.js?v=684",
    "./src/skirmishes.js?v=684",
    "./src/travelers.js?v=684",
    "./src/diagnostic-probe.js?v=684",
    "./src/questing-beast.js?v=684",
    "./src/recitations.js?v=684",
    "./src/lore.js?v=684",
    "./src/glimpses.js?v=684",
    "./src/glimpse-render.js?v=684",
    "./src/glimpse-paint.js?v=684",
    "./src/glimpse-scenes.js?v=684",
    "./src/glimpse-horror.js?v=684",
    "./src/glimpse-legend.js?v=684",
    "./src/glimpse-hand.js?v=684",
    "./src/atlas-view.js?v=684",
    "./src/strange.js?v=684",
    "./src/linked-dungeons.js?v=684",
    "./src/digging.js?v=684",
    "./src/building.js?v=684",
    "./src/refuge-lands.js?v=684",
    "./src/revenant-horde.js?v=684",
    "./src/stages.js?v=684",
    "./src/watcher.js?v=684",
    "./src/vehicle-gates.js?v=684",
    "./src/dungeon-ladder.js?v=684",
    "./src/potions.js?v=684",
    "./src/transit-lattice.js?v=684",
    "./src/late-spells.js?v=684",
    "./src/brawler-spells.js?v=684",
    "./src/orbit-volley.js?v=684",
    "./src/tool-forms.js?v=684",
    "./src/trees.js?v=684",
    "./src/fractured.js?v=684",
    "./src/affixes.js?v=684",
    "./src/boss-kit.js?v=684",
    "./src/stalker.js?v=684",
    "./src/stalker-render.js?v=684",
    "./src/deep-annex.js?v=684",
    "./src/the-deep.js?v=684",
    "./src/seasons.js?v=684",
    "./src/keeps.js?v=684",
    "./src/wonders.js?v=684",
    "./src/sling.js?v=684",
    "./src/atlas-colors.js?v=684",
    "./src/skylands.js?v=684",
    "./src/surveyor.js?v=684",
    "./src/torn-pages.js?v=684",
    "./src/threads.js?v=684",
    "./src/lattice-fields.js?v=684",
    "./src/dungeon-traps.js?v=684",
    "./src/listener-mirror.js?v=684",
    "./src/hometowns.js?v=684",
    "./src/listener-arena.js?v=684",
    "./src/listener-morph.js?v=684",
    "./src/build-presets.js?v=684",
    "./src/smithy.js?v=684",
    "./src/ilse.js?v=684",
    "./src/bells.js?v=684",
    "./src/meals.js?v=684",
    "./src/margins.js?v=684",
    "./src/marginalia.js?v=684",
    "./src/tyrant-hunt.js?v=684",
    "./src/world-beasts.js?v=684",
    "./src/elders.js?v=684",
    "./src/far-array.js?v=684",
    "./src/combat-visuals.js?v=684",
    "./src/dungeon-framework.js?v=684",
    "./src/elites.js?v=684",
    "./src/random.js?v=684",
    "./src/types.js?v=684",
    "./src/story.js?v=684",
    "./src/foundry.js?v=684",
    "./src/world.js?v=684",
    "./src/deep-dungeons.js?v=684",
    "./src/scenes.js?v=684",
    "./src/arenas.js?v=684",
    "./src/items.js?v=684",
    "./src/combat.js?v=684",
    "./src/interactions.js?v=684",
    "./src/persistence.js?v=684",
    "./src/input.js?v=684",
    "./src/game.js?v=684",
    "./src/renderer.js?v=684",
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
