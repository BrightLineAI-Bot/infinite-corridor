const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/proving-ground.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/proving-ground-fixtures.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/proving-ground-labs.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/dungeon-variation.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/dungeon-completion.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/enemy-patterns.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/combat-visuals.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/dungeon-framework.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/elites.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/random.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/types.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/story.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/foundry.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/world.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/deep-dungeons.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/scenes.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/arenas.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/items.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/combat.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/interactions.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/persistence.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/input.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/game.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
    "./src/renderer.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8",
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
