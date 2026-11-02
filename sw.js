const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r695-bbf3bb21143d`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r695-bbf3bb21143d",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r695-bbf3bb21143d",
    "./src/proving-ground.js?v=r695-bbf3bb21143d",
    "./src/proving-ground-fixtures.js?v=r695-bbf3bb21143d",
    "./src/proving-ground-labs.js?v=r695-bbf3bb21143d",
    "./src/dungeon-variation.js?v=r695-bbf3bb21143d",
    "./src/dungeon-completion.js?v=r695-bbf3bb21143d",
    "./src/enemy-patterns.js?v=r695-bbf3bb21143d",
    "./src/monster-pack.js?v=r695-bbf3bb21143d",
    "./src/monster-render.js?v=r695-bbf3bb21143d",
    "./src/astral-worm.js?v=r695-bbf3bb21143d",
    "./src/astral-worm-render.js?v=r695-bbf3bb21143d",
    "./src/astral-worm-retreat.js?v=r695-bbf3bb21143d",
    "./src/astral-worm-mount.js?v=r695-bbf3bb21143d",
    "./src/lightning-giant-render.js?v=r695-bbf3bb21143d",
    "./src/astral-encounters.js?v=r695-bbf3bb21143d",
    "./src/astral-world-retreat.js?v=r695-bbf3bb21143d",
    "./src/landscape.js?v=r695-bbf3bb21143d",
    "./src/landscape-render.js?v=r695-bbf3bb21143d",
    "./src/underlands.js?v=r695-bbf3bb21143d",
    "./src/pattern-dungeons.js?v=r695-bbf3bb21143d",
    "./src/relay-network.js?v=r695-bbf3bb21143d",
    "./src/glyphs.js?v=r695-bbf3bb21143d",
    "./src/echoes.js?v=r695-bbf3bb21143d",
    "./src/constellation.js?v=r695-bbf3bb21143d",
    "./src/water-traversal.js?v=r695-bbf3bb21143d",
    "./src/open-sea.js?v=r695-bbf3bb21143d",
    "./src/boats.js?v=r695-bbf3bb21143d",
    "./src/sea-creatures.js?v=r695-bbf3bb21143d",
    "./src/diving.js?v=r695-bbf3bb21143d",
    "./src/grottoes.js?v=r695-bbf3bb21143d",
    "./src/spell-slots.js?v=r695-bbf3bb21143d",
    "./src/settlements.js?v=r695-bbf3bb21143d",
    "./src/skirmishes.js?v=r695-bbf3bb21143d",
    "./src/travelers.js?v=r695-bbf3bb21143d",
    "./src/diagnostic-probe.js?v=r695-bbf3bb21143d",
    "./src/questing-beast.js?v=r695-bbf3bb21143d",
    "./src/recitations.js?v=r695-bbf3bb21143d",
    "./src/lore.js?v=r695-bbf3bb21143d",
    "./src/glimpses.js?v=r695-bbf3bb21143d",
    "./src/glimpse-render.js?v=r695-bbf3bb21143d",
    "./src/glimpse-paint.js?v=r695-bbf3bb21143d",
    "./src/glimpse-scenes.js?v=r695-bbf3bb21143d",
    "./src/glimpse-horror.js?v=r695-bbf3bb21143d",
    "./src/glimpse-legend.js?v=r695-bbf3bb21143d",
    "./src/glimpse-hand.js?v=r695-bbf3bb21143d",
    "./src/atlas-view.js?v=r695-bbf3bb21143d",
    "./src/strange.js?v=r695-bbf3bb21143d",
    "./src/linked-dungeons.js?v=r695-bbf3bb21143d",
    "./src/digging.js?v=r695-bbf3bb21143d",
    "./src/building.js?v=r695-bbf3bb21143d",
    "./src/refuge-lands.js?v=r695-bbf3bb21143d",
    "./src/revenant-horde.js?v=r695-bbf3bb21143d",
    "./src/stages.js?v=r695-bbf3bb21143d",
    "./src/watcher.js?v=r695-bbf3bb21143d",
    "./src/vehicle-gates.js?v=r695-bbf3bb21143d",
    "./src/dungeon-ladder.js?v=r695-bbf3bb21143d",
    "./src/potions.js?v=r695-bbf3bb21143d",
    "./src/transit-lattice.js?v=r695-bbf3bb21143d",
    "./src/late-spells.js?v=r695-bbf3bb21143d",
    "./src/brawler-spells.js?v=r695-bbf3bb21143d",
    "./src/orbit-volley.js?v=r695-bbf3bb21143d",
    "./src/tool-forms.js?v=r695-bbf3bb21143d",
    "./src/trees.js?v=r695-bbf3bb21143d",
    "./src/fractured.js?v=r695-bbf3bb21143d",
    "./src/affixes.js?v=r695-bbf3bb21143d",
    "./src/boss-kit.js?v=r695-bbf3bb21143d",
    "./src/stalker.js?v=r695-bbf3bb21143d",
    "./src/stalker-render.js?v=r695-bbf3bb21143d",
    "./src/deep-annex.js?v=r695-bbf3bb21143d",
    "./src/the-deep.js?v=r695-bbf3bb21143d",
    "./src/seasons.js?v=r695-bbf3bb21143d",
    "./src/keeps.js?v=r695-bbf3bb21143d",
    "./src/canyon.js?v=r695-bbf3bb21143d",
    "./src/wonders.js?v=r695-bbf3bb21143d",
    "./src/sling.js?v=r695-bbf3bb21143d",
    "./src/atlas-colors.js?v=r695-bbf3bb21143d",
    "./src/skylands.js?v=r695-bbf3bb21143d",
    "./src/surveyor.js?v=r695-bbf3bb21143d",
    "./src/torn-pages.js?v=r695-bbf3bb21143d",
    "./src/threads.js?v=r695-bbf3bb21143d",
    "./src/lattice-fields.js?v=r695-bbf3bb21143d",
    "./src/dungeon-traps.js?v=r695-bbf3bb21143d",
    "./src/listener-mirror.js?v=r695-bbf3bb21143d",
    "./src/hometowns.js?v=r695-bbf3bb21143d",
    "./src/listener-arena.js?v=r695-bbf3bb21143d",
    "./src/listener-morph.js?v=r695-bbf3bb21143d",
    "./src/build-presets.js?v=r695-bbf3bb21143d",
    "./src/smithy.js?v=r695-bbf3bb21143d",
    "./src/ilse.js?v=r695-bbf3bb21143d",
    "./src/bells.js?v=r695-bbf3bb21143d",
    "./src/meals.js?v=r695-bbf3bb21143d",
    "./src/margins.js?v=r695-bbf3bb21143d",
    "./src/marginalia.js?v=r695-bbf3bb21143d",
    "./src/tyrant-hunt.js?v=r695-bbf3bb21143d",
    "./src/world-beasts.js?v=r695-bbf3bb21143d",
    "./src/elders.js?v=r695-bbf3bb21143d",
    "./src/far-array.js?v=r695-bbf3bb21143d",
    "./src/combat-visuals.js?v=r695-bbf3bb21143d",
    "./src/dungeon-framework.js?v=r695-bbf3bb21143d",
    "./src/elites.js?v=r695-bbf3bb21143d",
    "./src/random.js?v=r695-bbf3bb21143d",
    "./src/types.js?v=r695-bbf3bb21143d",
    "./src/story.js?v=r695-bbf3bb21143d",
    "./src/foundry.js?v=r695-bbf3bb21143d",
    "./src/world.js?v=r695-bbf3bb21143d",
    "./src/deep-dungeons.js?v=r695-bbf3bb21143d",
    "./src/scenes.js?v=r695-bbf3bb21143d",
    "./src/arenas.js?v=r695-bbf3bb21143d",
    "./src/items.js?v=r695-bbf3bb21143d",
    "./src/combat.js?v=r695-bbf3bb21143d",
    "./src/interactions.js?v=r695-bbf3bb21143d",
    "./src/persistence.js?v=r695-bbf3bb21143d",
    "./src/input.js?v=r695-bbf3bb21143d",
    "./src/game.js?v=r695-bbf3bb21143d",
    "./src/renderer.js?v=r695-bbf3bb21143d",
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
