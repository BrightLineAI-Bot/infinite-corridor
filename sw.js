const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v706`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=706",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=706",
    "./src/proving-ground.js?v=706",
    "./src/proving-ground-fixtures.js?v=706",
    "./src/proving-ground-labs.js?v=706",
    "./src/dungeon-variation.js?v=706",
    "./src/dungeon-completion.js?v=706",
    "./src/enemy-patterns.js?v=706",
    "./src/monster-pack.js?v=706",
    "./src/monster-render.js?v=706",
    "./src/astral-worm.js?v=706",
    "./src/astral-worm-render.js?v=706",
    "./src/astral-worm-retreat.js?v=706",
    "./src/astral-worm-mount.js?v=706",
    "./src/lightning-giant-render.js?v=706",
    "./src/briar-stag-render.js?v=706",
    "./src/ashen-moth-render.js?v=706",
    "./src/astral-encounters.js?v=706",
    "./src/astral-world-retreat.js?v=706",
    "./src/landscape.js?v=706",
    "./src/landscape-render.js?v=706",
    "./src/underlands.js?v=706",
    "./src/pattern-dungeons.js?v=706",
    "./src/relay-network.js?v=706",
    "./src/glyphs.js?v=706",
    "./src/echoes.js?v=706",
    "./src/constellation.js?v=706",
    "./src/water-traversal.js?v=706",
    "./src/open-sea.js?v=706",
    "./src/boats.js?v=706",
    "./src/sea-creatures.js?v=706",
    "./src/diving.js?v=706",
    "./src/grottoes.js?v=706",
    "./src/spell-slots.js?v=706",
    "./src/settlements.js?v=706",
    "./src/skirmishes.js?v=706",
    "./src/travelers.js?v=706",
    "./src/diagnostic-probe.js?v=706",
    "./src/questing-beast.js?v=706",
    "./src/recitations.js?v=706",
    "./src/lore.js?v=706",
    "./src/glimpses.js?v=706",
    "./src/glimpse-render.js?v=706",
    "./src/glimpse-paint.js?v=706",
    "./src/glimpse-scenes.js?v=706",
    "./src/glimpse-horror.js?v=706",
    "./src/glimpse-legend.js?v=706",
    "./src/glimpse-hand.js?v=706",
    "./src/atlas-view.js?v=706",
    "./src/strange.js?v=706",
    "./src/linked-dungeons.js?v=706",
    "./src/digging.js?v=706",
    "./src/building.js?v=706",
    "./src/refuge-lands.js?v=706",
    "./src/revenant-horde.js?v=706",
    "./src/stages.js?v=706",
    "./src/watcher.js?v=706",
    "./src/vehicle-gates.js?v=706",
    "./src/dungeon-ladder.js?v=706",
    "./src/potions.js?v=706",
    "./src/transit-lattice.js?v=706",
    "./src/late-spells.js?v=706",
    "./src/brawler-spells.js?v=706",
    "./src/orbit-volley.js?v=706",
    "./src/tool-forms.js?v=706",
    "./src/trees.js?v=706",
    "./src/fractured.js?v=706",
    "./src/affixes.js?v=706",
    "./src/boss-kit.js?v=706",
    "./src/stalker.js?v=706",
    "./src/stalker-render.js?v=706",
    "./src/deep-annex.js?v=706",
    "./src/the-deep.js?v=706",
    "./src/seasons.js?v=706",
    "./src/keeps.js?v=706",
    "./src/canyon.js?v=706",
    "./src/ascendancy.js?v=706",
    "./src/wonders.js?v=706",
    "./src/sling.js?v=706",
    "./src/atlas-colors.js?v=706",
    "./src/skylands.js?v=706",
    "./src/surveyor.js?v=706",
    "./src/torn-pages.js?v=706",
    "./src/threads.js?v=706",
    "./src/lattice-fields.js?v=706",
    "./src/dungeon-traps.js?v=706",
    "./src/listener-mirror.js?v=706",
    "./src/hometowns.js?v=706",
    "./src/listener-arena.js?v=706",
    "./src/listener-morph.js?v=706",
    "./src/build-presets.js?v=706",
    "./src/smithy.js?v=706",
    "./src/ilse.js?v=706",
    "./src/bells.js?v=706",
    "./src/meals.js?v=706",
    "./src/margins.js?v=706",
    "./src/marginalia.js?v=706",
    "./src/tyrant-hunt.js?v=706",
    "./src/world-beasts.js?v=706",
    "./src/elders.js?v=706",
    "./src/far-array.js?v=706",
    "./src/combat-visuals.js?v=706",
    "./src/dungeon-framework.js?v=706",
    "./src/elites.js?v=706",
    "./src/random.js?v=706",
    "./src/types.js?v=706",
    "./src/story.js?v=706",
    "./src/foundry.js?v=706",
    "./src/world.js?v=706",
    "./src/deep-dungeons.js?v=706",
    "./src/scenes.js?v=706",
    "./src/arenas.js?v=706",
    "./src/items.js?v=706",
    "./src/combat.js?v=706",
    "./src/interactions.js?v=706",
    "./src/persistence.js?v=706",
    "./src/input.js?v=706",
    "./src/game.js?v=706",
    "./src/renderer.js?v=706",
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
