const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r711-23055c964fc8`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r711-23055c964fc8",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r711-23055c964fc8",
    "./src/proving-ground.js?v=r711-23055c964fc8",
    "./src/proving-ground-fixtures.js?v=r711-23055c964fc8",
    "./src/proving-ground-labs.js?v=r711-23055c964fc8",
    "./src/dungeon-variation.js?v=r711-23055c964fc8",
    "./src/dungeon-completion.js?v=r711-23055c964fc8",
    "./src/enemy-patterns.js?v=r711-23055c964fc8",
    "./src/monster-pack.js?v=r711-23055c964fc8",
    "./src/monster-render.js?v=r711-23055c964fc8",
    "./src/astral-worm.js?v=r711-23055c964fc8",
    "./src/astral-worm-render.js?v=r711-23055c964fc8",
    "./src/astral-worm-retreat.js?v=r711-23055c964fc8",
    "./src/astral-worm-mount.js?v=r711-23055c964fc8",
    "./src/lightning-giant-render.js?v=r711-23055c964fc8",
    "./src/briar-stag-render.js?v=r711-23055c964fc8",
    "./src/ashen-moth-render.js?v=r711-23055c964fc8",
    "./src/crimson-dragon.js?v=r711-23055c964fc8",
    "./src/crimson-dragon-render.js?v=r711-23055c964fc8",
    "./src/doom-chaser-render.js?v=r711-23055c964fc8",
    "./src/astral-encounters.js?v=r711-23055c964fc8",
    "./src/astral-world-retreat.js?v=r711-23055c964fc8",
    "./src/landscape.js?v=r711-23055c964fc8",
    "./src/landscape-render.js?v=r711-23055c964fc8",
    "./src/underlands.js?v=r711-23055c964fc8",
    "./src/pattern-dungeons.js?v=r711-23055c964fc8",
    "./src/relay-network.js?v=r711-23055c964fc8",
    "./src/glyphs.js?v=r711-23055c964fc8",
    "./src/echoes.js?v=r711-23055c964fc8",
    "./src/constellation.js?v=r711-23055c964fc8",
    "./src/water-traversal.js?v=r711-23055c964fc8",
    "./src/open-sea.js?v=r711-23055c964fc8",
    "./src/boats.js?v=r711-23055c964fc8",
    "./src/sea-creatures.js?v=r711-23055c964fc8",
    "./src/diving.js?v=r711-23055c964fc8",
    "./src/grottoes.js?v=r711-23055c964fc8",
    "./src/spell-slots.js?v=r711-23055c964fc8",
    "./src/settlements.js?v=r711-23055c964fc8",
    "./src/skirmishes.js?v=r711-23055c964fc8",
    "./src/travelers.js?v=r711-23055c964fc8",
    "./src/diagnostic-probe.js?v=r711-23055c964fc8",
    "./src/questing-beast.js?v=r711-23055c964fc8",
    "./src/recitations.js?v=r711-23055c964fc8",
    "./src/lore.js?v=r711-23055c964fc8",
    "./src/glimpses.js?v=r711-23055c964fc8",
    "./src/glimpse-render.js?v=r711-23055c964fc8",
    "./src/glimpse-paint.js?v=r711-23055c964fc8",
    "./src/glimpse-scenes.js?v=r711-23055c964fc8",
    "./src/glimpse-horror.js?v=r711-23055c964fc8",
    "./src/glimpse-legend.js?v=r711-23055c964fc8",
    "./src/glimpse-hand.js?v=r711-23055c964fc8",
    "./src/atlas-view.js?v=r711-23055c964fc8",
    "./src/strange.js?v=r711-23055c964fc8",
    "./src/linked-dungeons.js?v=r711-23055c964fc8",
    "./src/digging.js?v=r711-23055c964fc8",
    "./src/building.js?v=r711-23055c964fc8",
    "./src/refuge-lands.js?v=r711-23055c964fc8",
    "./src/revenant-horde.js?v=r711-23055c964fc8",
    "./src/stages.js?v=r711-23055c964fc8",
    "./src/watcher.js?v=r711-23055c964fc8",
    "./src/vehicle-gates.js?v=r711-23055c964fc8",
    "./src/dungeon-ladder.js?v=r711-23055c964fc8",
    "./src/potions.js?v=r711-23055c964fc8",
    "./src/transit-lattice.js?v=r711-23055c964fc8",
    "./src/late-spells.js?v=r711-23055c964fc8",
    "./src/brawler-spells.js?v=r711-23055c964fc8",
    "./src/orbit-volley.js?v=r711-23055c964fc8",
    "./src/tool-forms.js?v=r711-23055c964fc8",
    "./src/trees.js?v=r711-23055c964fc8",
    "./src/fractured.js?v=r711-23055c964fc8",
    "./src/affixes.js?v=r711-23055c964fc8",
    "./src/boss-kit.js?v=r711-23055c964fc8",
    "./src/stalker.js?v=r711-23055c964fc8",
    "./src/stalker-render.js?v=r711-23055c964fc8",
    "./src/deep-annex.js?v=r711-23055c964fc8",
    "./src/the-deep.js?v=r711-23055c964fc8",
    "./src/seasons.js?v=r711-23055c964fc8",
    "./src/keeps.js?v=r711-23055c964fc8",
    "./src/great-buildings.js?v=r711-23055c964fc8",
    "./src/canyon.js?v=r711-23055c964fc8",
    "./src/ascendancy.js?v=r711-23055c964fc8",
    "./src/wonders.js?v=r711-23055c964fc8",
    "./src/sling.js?v=r711-23055c964fc8",
    "./src/atlas-colors.js?v=r711-23055c964fc8",
    "./src/skylands.js?v=r711-23055c964fc8",
    "./src/surveyor.js?v=r711-23055c964fc8",
    "./src/torn-pages.js?v=r711-23055c964fc8",
    "./src/threads.js?v=r711-23055c964fc8",
    "./src/lattice-fields.js?v=r711-23055c964fc8",
    "./src/dungeon-traps.js?v=r711-23055c964fc8",
    "./src/listener-mirror.js?v=r711-23055c964fc8",
    "./src/hometowns.js?v=r711-23055c964fc8",
    "./src/listener-arena.js?v=r711-23055c964fc8",
    "./src/listener-morph.js?v=r711-23055c964fc8",
    "./src/build-presets.js?v=r711-23055c964fc8",
    "./src/smithy.js?v=r711-23055c964fc8",
    "./src/ilse.js?v=r711-23055c964fc8",
    "./src/bells.js?v=r711-23055c964fc8",
    "./src/meals.js?v=r711-23055c964fc8",
    "./src/margins.js?v=r711-23055c964fc8",
    "./src/marginalia.js?v=r711-23055c964fc8",
    "./src/tyrant-hunt.js?v=r711-23055c964fc8",
    "./src/world-beasts.js?v=r711-23055c964fc8",
    "./src/elders.js?v=r711-23055c964fc8",
    "./src/far-array.js?v=r711-23055c964fc8",
    "./src/combat-visuals.js?v=r711-23055c964fc8",
    "./src/dungeon-framework.js?v=r711-23055c964fc8",
    "./src/elites.js?v=r711-23055c964fc8",
    "./src/random.js?v=r711-23055c964fc8",
    "./src/types.js?v=r711-23055c964fc8",
    "./src/story.js?v=r711-23055c964fc8",
    "./src/foundry.js?v=r711-23055c964fc8",
    "./src/world.js?v=r711-23055c964fc8",
    "./src/deep-dungeons.js?v=r711-23055c964fc8",
    "./src/scenes.js?v=r711-23055c964fc8",
    "./src/arenas.js?v=r711-23055c964fc8",
    "./src/items.js?v=r711-23055c964fc8",
    "./src/combat.js?v=r711-23055c964fc8",
    "./src/interactions.js?v=r711-23055c964fc8",
    "./src/persistence.js?v=r711-23055c964fc8",
    "./src/input.js?v=r711-23055c964fc8",
    "./src/game.js?v=r711-23055c964fc8",
    "./src/renderer.js?v=r711-23055c964fc8",
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
