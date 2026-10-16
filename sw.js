const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/proving-ground.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/proving-ground-fixtures.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/proving-ground-labs.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/dungeon-variation.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/dungeon-completion.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/enemy-patterns.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/monster-pack.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/monster-render.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/landscape.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/landscape-render.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/underlands.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/pattern-dungeons.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/relay-network.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/glyphs.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/echoes.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/constellation.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/water-traversal.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/open-sea.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/boats.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/sea-creatures.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/diving.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/grottoes.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/spell-slots.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/settlements.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/skirmishes.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/travelers.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/questing-beast.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/recitations.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/far-array.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/combat-visuals.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/dungeon-framework.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/elites.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/random.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/types.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/story.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/foundry.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/world.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/deep-dungeons.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/scenes.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/arenas.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/items.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/combat.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/interactions.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/persistence.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/input.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/game.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
    "./src/renderer.js?v=icp_c62d8d025d534cfc9db83a33_8e553f843f4ef9a5",
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
self.addEventListener("fetch", (e) => {
  if (e.request.method === "GET")
    e.respondWith(
      caches.match(e.request).then(
        (r) =>
          r ||
          fetch(e.request)
            .then((n) => {
              const c = n.clone();
              caches.open(CACHE).then((x) => x.put(e.request, c));
              return n;
            })
            .catch(() => caches.match("./index.html")),
      ),
    );
});
