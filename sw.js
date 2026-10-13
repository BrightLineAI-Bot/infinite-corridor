const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_e4443929095d426aaa92e9bd_3f52b698e764055d`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/proving-ground.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/proving-ground-fixtures.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/proving-ground-labs.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/dungeon-variation.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/dungeon-completion.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/enemy-patterns.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/monster-pack.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/monster-render.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/landscape.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/landscape-render.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/combat-visuals.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/dungeon-framework.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/elites.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/random.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/types.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/story.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/foundry.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/world.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/deep-dungeons.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/scenes.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/arenas.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/items.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/combat.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/interactions.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/persistence.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/input.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/game.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
    "./src/renderer.js?v=icp_e4443929095d426aaa92e9bd_3f52b698e764055d",
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
