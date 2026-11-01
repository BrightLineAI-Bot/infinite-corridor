// Canyon dungeons (Tim, 2026-10-30, and 2026-11-01: "the chasm dungeons... have those blocks that I can destroy"). Each is the
// crater where something divine fell from the sky: "mostly blocks... like dirt clods... the entire dungeon is filled with dirt
// clods that you can dig through... the longer you press, the more [it] drills... green... caution... yellow... red... the
// block can change from yellow to red depending on how you interact with it... a red block can be a local cave-in... 2, maybe
// 3 red blocks, then the chasm collapses and you can't go to that dungeon anymore and it won't show a shiny on the map", with
// "some open areas... caves and caverns... a lava pool or lava stream... an underground pool or river... large bridge
// sections spanning underground ravines". At the deepest point lies the wreck of the fallen thing; pulling the Divine Viscera
// from it is the prize (spent in the Skylands, skylands.ts VISCERA).
//
// - Clods are drilled only by the robot's auger (Tim: "the robot was supposed to have an auger attachment that you could hold
//   to drill longer"): in the robot, push into a clod and hold; the longer you hold, the further it drills.
// - Most clods are plain (stable: drill them as you like). The rest are unstable, ringed with their state: green, then yellow,
//   then red. Drilling an unstable clod strains it; past `strain.limit` it goes up a colour (green → yellow → red) and the strain
//   starts again; strain settles while you pause, so short bursts with pauses keep it from climbing. A red clod caves in when it
//   breaks: "you're not supposed to drill clods that are red... just find another path". The third cave-in kills you and seals
//   the crater for good (its entrance shows no way in).
// - Caverns, a lava stream and an underground pool (each with a crossing), a ravine spanned by a bridge, the wreck in the
//   deepest cavern, creatures in the caverns. The outer rock cannot be drilled.
// Save: additive at schema 14 (the crater's dungeon history: `canyon` { caveIns, sealed, drilled: [tile indexes] }).
import { hashSeed, rng } from "./random.ts";

export const CANYON = {
  version: 1,
  chance: .025, minRing: 6, // of sections first seen from this release
  size: 44,
  tempers: { plain: .52, green: .3, yellow: .12 }, // the rest start red
  clod: { hp: { clodPlain: 1.2, clodGreen: 1.6, clodYellow: 1.6, clodRed: 1.6 }, drill: 2.2, strain: { rise: 2.2, settle: 2.4, limit: .6 } }, // hp, hp/s the robot's auger drills; held without a pause an unstable clod climbs green → yellow → red before it breaks
  caveIn: { damage: .22, radius: 1.5, limit: 3, refill: true }, // damage as a share of max health
  caverns: [6, 9], cavernRadius: [2, 4],
  viscera: 2,
  maxDrilled: 2000,
  creatures: { cavern: ["earthGolem", "crystalCrab", "crystalCrab"], perCavern: [1, 2], warden: "earthGolem" }, // the warden, a golem in its boss form, guards the wreck
  // Some clods hide something (hashed per clod): a golem asleep in it that bursts out when you drill it open, or a find.
  secrets: { golem: .035, find: .07 },
  finds: [{ id: "stone", name: "stone", n: [1, 3], weight: 5 }, { id: "lumenDust", name: "lumen dust", n: [1, 2], weight: 3 }, { id: "cinderIron", name: "cinder iron", n: [1, 1], weight: 1 }],
  name: "Canyon Crater",
  kinds: { plain: "clodPlain", green: "clodGreen", yellow: "clodYellow", red: "clodRed", wall: "craterWall", floor: "craterFloor" },
  messages: {
    entrance: "A crater gapes here: something fell from the sky and drove deep into the earth. The Canyon below is packed with clods you can drill through.",
    enter: "Call up the robot and push into a clod to drill it with the auger. Ringed clods are unstable: drill them in short bursts or they go green, yellow, red. Red caves in: find another way.",
    needRobot: "The clods are too dense to dig by hand. Call up the robot: its auger drills them.",
    toYellow: "The clod groans: it has gone yellow. Drill in short bursts.",
    yellowToRed: "The clod cracks red. Break it and the ceiling comes down: find another way.",
    caveIn: (n, limit) => `The ceiling caves in! (${n} of ${limit}: one more and the crater may collapse)`,
    collapse: "The crater collapses on you. The Canyon seals itself for good.",
    wreck: "Deep in the crater lies the wreck of something that fell from the sky: a vast fossil, not of any living thing. Its viscera still glow.",
    pulled: (n) => `You pull ${n} Divine Viscera from the wreck. In the Skylands it can shape the Divine Challenge.`,
    golem: "The clod heaves: an Earth Golem bursts out of it!",
    find: (n, name) => `Something glints in the broken clod: +${n} ${name}.`,
  },
};

export const canyonIdFor = (seed, rx, ry) => `canyon:${seed}:${rx}:${ry}`;
export const isCanyonId = (id) => String(id || "").startsWith("canyon:");
export const canyonHere = (seed, rx, ry) => Math.abs(rx) + Math.abs(ry) >= CANYON.minRing && (hashSeed(`${seed}:canyon-crater:v1:${rx}:${ry}`) % 10000) / 10000 < CANYON.chance;
export const isClod = (t) => !!t && (t.kind === CANYON.kinds.plain || t.kind === CANYON.kinds.green || t.kind === CANYON.kinds.yellow || t.kind === CANYON.kinds.red);
const UP = { clodGreen: "clodYellow", clodYellow: "clodRed" };
// What a clod hides, hashed from the seed, the crater and the tile: "golem", a find { id, name, n }, or null.
export function clodSecret(seed, id, x, y) {
  const S = CANYON.secrets, h = hashSeed(`${seed}:${id}:clod-secret:v1:${x}:${y}`), v = (h % 10000) / 10000;
  if (v < S.golem) return "golem";
  if (v >= S.golem + S.find) return null;
  const F = CANYON.finds, total = F.reduce((a, f) => a + f.weight, 0); let pick = (h >>> 14) % total, f = F[0];
  for (const q of F) { if (pick < q.weight) { f = q; break; } pick -= q.weight; }
  return { id: f.id, name: f.name, n: f.n[0] + (h >>> 7) % (f.n[1] - f.n[0] + 1) };
}
export function ensureCanyonHistory(h) { const c = h.canyon && typeof h.canyon === "object" ? h.canyon : {}; if (Number.isInteger(c.caveIns) && c.caveIns >= 0 && Array.isArray(c.drilled) && Array.isArray(c.strained) && typeof c.sealed === "boolean" && typeof c.pulled === "boolean") return c; // already sound: keep it (drilled every frame)
  const list = (v) => Array.isArray(v) ? v.filter(Number.isInteger).slice(-CANYON.maxDrilled) : []; h.canyon = { caveIns: Math.max(0, Math.floor(Number(c.caveIns) || 0)), sealed: c.sealed === true, pulled: c.pulled === true, drilled: list(c.drilled), strained: list(c.strained) }; return h.canyon; }

// The crater, generated from the seed and its id (the same each time); `drilled` tiles are opened again over it.
export function generateCanyon(seed, id, drilled = [], strained = []) {
  const C = CANYON, W = C.size, H = C.size, r = rng(`${seed}:canyon:v1:${id}`), K = C.kinds, tiles = [];
  const T = C.tempers, stab = (x, y) => { const v = (hashSeed(`${seed}:${id}:clod:${x}:${y}`) % 1000) / 1000; return v < T.plain ? "plain" : v < T.plain + T.green ? "green" : v < T.plain + T.green + T.yellow ? "yellow" : "red"; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const edge = x < 2 || y < 2 || x >= W - 2 || y >= H - 2;
    tiles.push(edge ? { x, y, kind: K.wall, blocked: true, landscape: "underlands", detail: (x + y) % 4 } : { x, y, kind: K[stab(x, y)], blocked: true, clod: true, landscape: "underlands", detail: (x * 3 + y) % 4 }); }
  const at = (x, y) => tiles[y * W + x], open = (x, y, kind = K.floor, extra = {}) => { if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return; Object.assign(at(x, y), { kind, blocked: false, clod: false, ...extra }); };
  const blob = (cx, cy, rad, kind, extra) => { for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad + 1) open(cx + x, cy + y, kind, extra); };
  // the way in: a shaft at the top
  const entry = { x: W >> 1, y: 4 }; blob(entry.x, entry.y, 2);
  // caverns, the deepest one (farthest from the way in) holds the wreck
  const caverns = [], n = C.caverns[0] + Math.floor(r() * (C.caverns[1] - C.caverns[0] + 1));
  for (let i = 0; i < n; i++) { const c = { x: 6 + Math.floor(r() * (W - 12)), y: 10 + Math.floor(r() * (H - 16)), rad: C.cavernRadius[0] + Math.floor(r() * (C.cavernRadius[1] - C.cavernRadius[0] + 1)) }; caverns.push(c); blob(c.x, c.y, c.rad); }
  const deep = caverns.reduce((a, c) => Math.hypot(c.x - entry.x, c.y - entry.y) > Math.hypot(a.x - entry.x, a.y - entry.y) ? c : a, caverns[0]);
  // the ravine: a band of abyss across the crater above the deepest cavern, spanned by one bridge
  const ry0 = Math.max(12, Math.min(H - 10, deep.y - deep.rad - 4)), bx = Math.max(4, Math.min(W - 5, deep.x));
  for (let x = 2; x < W - 2; x++) for (const y of [ry0, ry0 + 1]) open(x, y, "abyss", { environment: "abyss", chasm: true });
  for (const y of [ry0, ry0 + 1]) open(bx, y, "skyBridge", { bridgeAxis: "y", environment: undefined, chasm: false });
  for (const y of [ry0 - 1, ry0 + 2]) for (const x of [bx - 1, bx, bx + 1]) open(x, y); // landings at both ends of the bridge
  // a lava stream and an underground pool in two caverns clear of the ravine (not the deepest), each with dry ground round it
  const others = caverns.filter((c) => c !== deep && Math.abs(c.y - (ry0 + .5)) > c.rad + 1.5);
  const lavaC = others[0], poolC = others[1];
  if (lavaC) for (let x = -lavaC.rad + 1; x <= lavaC.rad - 1; x++) open(lavaC.x + x, lavaC.y, "lava", { environment: "lava", volcanic: true });
  if (poolC) blob(poolC.x, poolC.y, Math.max(1, poolC.rad - 2), "lakeWater", { environment: "water" });
  // drilled clods stay drilled
  for (const i of strained) { const t = tiles[i]; if (t && UP[t.kind]) t.kind = UP[t.kind]; } // each time a clod was strained a colour higher
  for (const i of drilled) { const t = tiles[i]; if (t && isClod(t)) Object.assign(t, { kind: K.floor, blocked: false, clod: false, drilledOut: true }); }
  const objects = [{ id: "dungeon-exit", kind: "exit", x: entry.x, y: entry.y - 1, state: "open", actions: ["exit"] },
    { id: "canyon-wreck", kind: "divineWreck", name: "Wreck of the Fallen", x: deep.x, y: deep.y, state: "intact", actions: ["pull"], lore: C.messages.wreck }];
  const enemySpawns = [], M = C.creatures; caverns.forEach((c, i) => { if (c === lavaC || c === poolC || c === deep) return; const h = hashSeed(`${seed}:${id}:cav${i}`), n = M.perCavern[0] + (h >>> 9) % (M.perCavern[1] - M.perCavern[0] + 1);
    for (let j = 0; j < n; j++) { const x = c.x + (j ? -1 : 1), y = c.y + (j ? 1 : 0); if (at(x, y)?.blocked) continue; enemySpawns.push({ id: `${id}:cav${i}:${j}`, kind: M.cavern[(h >>> (j * 3)) % M.cavern.length], x, y }); } });
  { const x = deep.x + (deep.x + 2 < W - 2 ? 2 : -2), y = deep.y; if (!at(x, y).blocked) enemySpawns.push({ id: `${id}:warden`, kind: M.warden, x, y, boss: true, dungeonRole: "canyonWarden" }); else enemySpawns.push({ id: `${id}:warden`, kind: M.warden, x: deep.x, y: deep.y + 1, boss: true, dungeonRole: "canyonWarden" }); }
  return { seed, id, recipe: "canyon", name: C.name, identity: "a crater where something divine fell", danger: "cave-ins", width: W, height: H, tiles, entry, exit: { x: entry.x, y: entry.y - 1 }, objects, enemySpawns, canyon: { version: C.version, deep: { x: deep.x, y: deep.y } }, landscape: { biome: "underlands" }, theme: "canyon", generatorVersion: 1, sizeProfile: "canyon" };
}

// One frame of the robot's auger on clod `t` (held into it for `dt` s). `state` is the game's runtime drill state (strain and
// progress per tile). Returns { broke, caveIn, climbed } (climbed: the colour it went up to, or null).
export function drillClod(t, state, dt) {
  const C = CANYON.clod, k = `${t.x},${t.y}`, s = (state[k] ||= { progress: 0, strain: 0 });
  s.progress += C.drill * dt; s.touched = true; let climbed = null;
  if (UP[t.kind]) { s.strain += C.strain.rise * dt; if (s.strain >= C.strain.limit) { t.kind = UP[t.kind]; s.strain = 0; climbed = t.kind; } }
  if (s.progress < (C.hp[t.kind] ?? 1)) return { broke: false, climbed };
  const caveIn = t.kind === CANYON.kinds.red; delete state[k];
  Object.assign(t, { kind: CANYON.kinds.floor, blocked: false, clod: false, drilledOut: true });
  return { broke: true, caveIn, climbed };
}
// Strain settles on every clod not drilled this frame.
export function settleClods(state, dt) { for (const [k, s] of Object.entries(state)) { if (s.touched) { s.touched = false; continue; } s.strain = Math.max(0, s.strain - CANYON.clod.strain.settle * dt); } }
