// The Listener's arena (release 375; Tim, 2026-10-23: "the listener should have his own specific arena, so that I have to
// complete the tasks or trials. A teleportation dais appears and you get into it and you go to the listener's arena...
// design something unique... it should be cool. There should be no fog... just go there and see the listener... we don't
// have to do it for this dungeon. [For] the next...").
//
// From the second Listener on (a Listener has fallen before), when the Gate stands whole at the current Mouth, the
// Listener's Dais rises beside it, and the Mouth's own runs never hold the Listener. The dais carries the Wayfarer to the
// Listening Hall: a round hall of dark glass over the night sky, ringed by eight relay pylons (cover from the mirror's
// thrown shots), the Listener waiting on the far side of the central dais, with nothing hidden: no fog, no residents,
// no other rooms. The hall is an Array run (id `far-array:<seed>:arena<n>`), so the Listener is spawned, tuned, felled
// and rewarded exactly as in a Mouth run. A Return Dais at the entry leaves at any time.
export const LISTENER_ARENA = { size: 32, radius: 13, inner: 3.6, band: 8, pylonRadius: 9, pylons: 8, entry: { x: 16, y: 27 }, boss: { x: 16, y: 8 } };

// The dais shows only while the Listener is due (the Gate whole, at the current Mouth, after a first Listener).
export const daisDue = (f) => !!f && (f.listeners || 0) >= 1 && !f.quiet && f.pieces >= 2 + f.gate;
export const isArenaRun = (id) => /^far-array:.*:arena\d+$/.test(String(id || ""));

export function generateListenerArena(seed, id) {
  const A = LISTENER_ARENA, W = A.size, c = W / 2, tiles = [];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x + .5 - c, y + .5 - c), detail = (x * 7 + y * 13) % 997;
    if (d > A.radius) tiles.push({ x, y, kind: "starVoid", blocked: true, landscape: "dream", detail }); // the night under the hall
    else if (d <= A.inner) tiles.push({ x, y, kind: "templeMosaic", blocked: false, landscape: "underlands", detail: (x & 1) + (y & 1) * 2 }); // the listening dais
    else if (d <= A.band) tiles.push({ x, y, kind: "geodeFloor", blocked: false, landscape: "underlands", detail });
    else tiles.push({ x, y, kind: "dreamMarble", blocked: false, landscape: "dream", detail });
  }
  for (let k = 0; k < A.pylons; k++) { // relay pylons, off the straight line between the entry and the Listener
    const a = (k + .5) * Math.PI * 2 / A.pylons, x = Math.round(c - .5 + Math.cos(a) * A.pylonRadius), y = Math.round(c - .5 + Math.sin(a) * A.pylonRadius);
    tiles[y * W + x] = { x, y, kind: "crystalSpire", blocked: true, landscape: "underlands", detail: k };
  }
  const entry = { ...A.entry };
  return {
    seed, id, recipe: "listener-arena", arena: true, arenaKind: "listener", listenerArena: true, name: "The Listener's Hall", identity: "the Listener's own hall",
    width: W, height: W, tiles, entry, exit: entry, weather: "petals",
    objects: [{ id: "listener-arena-return", kind: "exit", name: "Return Dais", x: entry.x, y: entry.y, state: "open", actions: ["exit"] }],
    enemySpawns: [{ id: `${id}:boss`, kind: "listener", x: A.boss.x, y: A.boss.y, boss: true, dungeonRole: "finalBoss" }],
  };
}
