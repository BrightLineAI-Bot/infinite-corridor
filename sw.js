const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r669-637cc97f06cd`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r669-637cc97f06cd",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r669-637cc97f06cd",
    "./src/proving-ground.js?v=r669-637cc97f06cd",
    "./src/proving-ground-fixtures.js?v=r669-637cc97f06cd",
    "./src/proving-ground-labs.js?v=r669-637cc97f06cd",
    "./src/dungeon-variation.js?v=r669-637cc97f06cd",
    "./src/dungeon-completion.js?v=r669-637cc97f06cd",
    "./src/enemy-patterns.js?v=r669-637cc97f06cd",
    "./src/monster-pack.js?v=r669-637cc97f06cd",
    "./src/monster-render.js?v=r669-637cc97f06cd",
    "./src/astral-worm.js?v=r669-637cc97f06cd",
    "./src/astral-worm-render.js?v=r669-637cc97f06cd",
    "./src/astral-worm-retreat.js?v=r669-637cc97f06cd",
    "./src/astral-worm-mount.js?v=r669-637cc97f06cd",
    "./src/lightning-giant-render.js?v=r669-637cc97f06cd",
    "./src/astral-encounters.js?v=r669-637cc97f06cd",
    "./src/astral-world-retreat.js?v=r669-637cc97f06cd",
    "./src/landscape.js?v=r669-637cc97f06cd",
    "./src/landscape-render.js?v=r669-637cc97f06cd",
    "./src/underlands.js?v=r669-637cc97f06cd",
    "./src/pattern-dungeons.js?v=r669-637cc97f06cd",
    "./src/relay-network.js?v=r669-637cc97f06cd",
    "./src/glyphs.js?v=r669-637cc97f06cd",
    "./src/echoes.js?v=r669-637cc97f06cd",
    "./src/constellation.js?v=r669-637cc97f06cd",
    "./src/water-traversal.js?v=r669-637cc97f06cd",
    "./src/open-sea.js?v=r669-637cc97f06cd",
    "./src/boats.js?v=r669-637cc97f06cd",
    "./src/sea-creatures.js?v=r669-637cc97f06cd",
    "./src/diving.js?v=r669-637cc97f06cd",
    "./src/grottoes.js?v=r669-637cc97f06cd",
    "./src/spell-slots.js?v=r669-637cc97f06cd",
    "./src/settlements.js?v=r669-637cc97f06cd",
    "./src/skirmishes.js?v=r669-637cc97f06cd",
    "./src/travelers.js?v=r669-637cc97f06cd",
    "./src/diagnostic-probe.js?v=r669-637cc97f06cd",
    "./src/questing-beast.js?v=r669-637cc97f06cd",
    "./src/recitations.js?v=r669-637cc97f06cd",
    "./src/lore.js?v=r669-637cc97f06cd",
    "./src/glimpses.js?v=r669-637cc97f06cd",
    "./src/glimpse-render.js?v=r669-637cc97f06cd",
    "./src/glimpse-paint.js?v=r669-637cc97f06cd",
    "./src/glimpse-scenes.js?v=r669-637cc97f06cd",
    "./src/glimpse-horror.js?v=r669-637cc97f06cd",
    "./src/glimpse-legend.js?v=r669-637cc97f06cd",
    "./src/glimpse-hand.js?v=r669-637cc97f06cd",
    "./src/atlas-view.js?v=r669-637cc97f06cd",
    "./src/strange.js?v=r669-637cc97f06cd",
    "./src/linked-dungeons.js?v=r669-637cc97f06cd",
    "./src/digging.js?v=r669-637cc97f06cd",
    "./src/building.js?v=r669-637cc97f06cd",
    "./src/refuge-lands.js?v=r669-637cc97f06cd",
    "./src/revenant-horde.js?v=r669-637cc97f06cd",
    "./src/stages.js?v=r669-637cc97f06cd",
    "./src/watcher.js?v=r669-637cc97f06cd",
    "./src/vehicle-gates.js?v=r669-637cc97f06cd",
    "./src/dungeon-ladder.js?v=r669-637cc97f06cd",
    "./src/potions.js?v=r669-637cc97f06cd",
    "./src/transit-lattice.js?v=r669-637cc97f06cd",
    "./src/late-spells.js?v=r669-637cc97f06cd",
    "./src/brawler-spells.js?v=r669-637cc97f06cd",
    "./src/orbit-volley.js?v=r669-637cc97f06cd",
    "./src/tool-forms.js?v=r669-637cc97f06cd",
    "./src/trees.js?v=r669-637cc97f06cd",
    "./src/fractured.js?v=r669-637cc97f06cd",
    "./src/affixes.js?v=r669-637cc97f06cd",
    "./src/boss-kit.js?v=r669-637cc97f06cd",
    "./src/sling.js?v=r669-637cc97f06cd",
    "./src/atlas-colors.js?v=r669-637cc97f06cd",
    "./src/skylands.js?v=r669-637cc97f06cd",
    "./src/surveyor.js?v=r669-637cc97f06cd",
    "./src/torn-pages.js?v=r669-637cc97f06cd",
    "./src/threads.js?v=r669-637cc97f06cd",
    "./src/lattice-fields.js?v=r669-637cc97f06cd",
    "./src/dungeon-traps.js?v=r669-637cc97f06cd",
    "./src/listener-mirror.js?v=r669-637cc97f06cd",
    "./src/hometowns.js?v=r669-637cc97f06cd",
    "./src/listener-arena.js?v=r669-637cc97f06cd",
    "./src/listener-morph.js?v=r669-637cc97f06cd",
    "./src/build-presets.js?v=r669-637cc97f06cd",
    "./src/smithy.js?v=r669-637cc97f06cd",
    "./src/ilse.js?v=r669-637cc97f06cd",
    "./src/bells.js?v=r669-637cc97f06cd",
    "./src/meals.js?v=r669-637cc97f06cd",
    "./src/margins.js?v=r669-637cc97f06cd",
    "./src/marginalia.js?v=r669-637cc97f06cd",
    "./src/tyrant-hunt.js?v=r669-637cc97f06cd",
    "./src/world-beasts.js?v=r669-637cc97f06cd",
    "./src/elders.js?v=r669-637cc97f06cd",
    "./src/far-array.js?v=r669-637cc97f06cd",
    "./src/combat-visuals.js?v=r669-637cc97f06cd",
    "./src/dungeon-framework.js?v=r669-637cc97f06cd",
    "./src/elites.js?v=r669-637cc97f06cd",
    "./src/random.js?v=r669-637cc97f06cd",
    "./src/types.js?v=r669-637cc97f06cd",
    "./src/story.js?v=r669-637cc97f06cd",
    "./src/foundry.js?v=r669-637cc97f06cd",
    "./src/world.js?v=r669-637cc97f06cd",
    "./src/deep-dungeons.js?v=r669-637cc97f06cd",
    "./src/scenes.js?v=r669-637cc97f06cd",
    "./src/arenas.js?v=r669-637cc97f06cd",
    "./src/items.js?v=r669-637cc97f06cd",
    "./src/combat.js?v=r669-637cc97f06cd",
    "./src/interactions.js?v=r669-637cc97f06cd",
    "./src/persistence.js?v=r669-637cc97f06cd",
    "./src/input.js?v=r669-637cc97f06cd",
    "./src/game.js?v=r669-637cc97f06cd",
    "./src/renderer.js?v=r669-637cc97f06cd",
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
// Release r669-637cc97f06cd (system audit): only good same-origin responses are cached (no 404s, no opaque cross-origin ones), the Proving
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
