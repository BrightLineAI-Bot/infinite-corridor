const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/proving-ground.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/proving-ground-fixtures.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/proving-ground-labs.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/dungeon-variation.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/dungeon-completion.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/enemy-patterns.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/monster-pack.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/monster-render.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/landscape.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/landscape-render.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/underlands.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/relay-network.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/glyphs.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/echoes.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/constellation.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/water-traversal.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/boats.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/sea-creatures.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/diving.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/grottoes.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/spell-slots.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/settlements.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/skirmishes.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/travelers.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/questing-beast.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/combat-visuals.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/dungeon-framework.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/elites.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/random.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/types.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/story.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/foundry.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/world.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/deep-dungeons.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/scenes.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/arenas.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/items.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/combat.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/interactions.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/persistence.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/input.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/game.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
    "./src/renderer.js?v=icp_d775f6a4f88f46a9b47357fa_4dc2be196603cf94",
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
