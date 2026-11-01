// Canyon dungeons (Tim, 2026-10-30, and 2026-11-01: "the chasm dungeons... have those blocks that I can destroy"). Each is the
// crater where something divine fell from the sky: "mostly blocks... like dirt clods... the entire dungeon is filled with dirt
// clods that you can dig through... the longer you press, the more [it] drills... green... caution... yellow... red... the
// block can change from yellow to red depending on how you interact with it... a red block can be a local cave-in... 2, maybe
// 3 red blocks, then the chasm collapses and you can't go to that dungeon anymore and it won't show a shiny on the map", with
// "some open areas... caves and caverns... a lava pool or lava stream... an underground pool or river... large bridge
// sections spanning underground ravines". At the deepest point lies the wreck of the fallen thing; pulling the Divine Viscera
// from it is the prize (spent in the Skylands, skylands.ts VISCERA).
//
// - Clods (`canyonClod` + its stability): drilled by pushing into them (the Wayfarer's auger; the robot's is `robot`× faster).
//   Green: drill as hard as you like. Yellow: strain rises while you drill and settles while you pause; past `strain.limit` it
//   turns red. Red: it caves in when it breaks (damage round it, and the cave-in counts). `caveIn.limit` cave-ins collapse the
//   crater: you are thrown out and it is sealed for good (its entrance shows no shine).
// - Caverns, a lava stream and an underground pool (each with a crossing), a ravine spanned by a bridge, the wreck in the
//   deepest cavern, creatures in the caverns. The outer rock cannot be drilled.
// Save: additive at schema 14 (the crater's dungeon history: `canyon` { caveIns, sealed, drilled: [tile indexes] }).
import { hashSeed, rng } from "./random.ts";

export const CANYON = {
  version: 1,
  chance: .025, minRing: 6, // of sections first seen from this release
  size: 44,
  stability: { green: .62, yellow: .3 }, // the rest are red
  clod: { hp: { clodGreen: 1, clodYellow: 1.6, clodRed: 1 }, drill: 1.25, robot: 2, strain: { rise: 1.6, settle: 1.6, limit: 1 } }, // hp by stability, hp/s drilled; a yellow clod drilled without a pause turns red before it breaks
  caveIn: { damage: .22, radius: 1.5, limit: 3, refill: true }, // damage as a share of max health
  caverns: [6, 9], cavernRadius: [2, 4],
  viscera: 2,
  maxDrilled: 2000,
  creatures: ["rootBrute", "glassMite", "ashenHound", "coilStalker"],
  name: "Canyon Crater",
  kinds: { green: "clodGreen", yellow: "clodYellow", red: "clodRed", wall: "craterWall", floor: "craterFloor" },
  messages: {
    entrance: "A crater gapes here: something fell from the sky and drove deep into the earth. The Canyon below is packed with clods you can drill through.",
    enter: "Push into a clod to drill it. Green is safe. Yellow strains if you drill too long: pause to let it settle. Red caves in.",
    yellowToRed: "The clod groans and cracks red. It will cave in if you break it.",
    caveIn: (n, limit) => `The ceiling caves in! (${n} of ${limit}: one more and the crater may collapse)`,
    collapse: "The crater collapses around you. You claw your way out as the Canyon seals itself for good.",
    wreck: "Deep in the crater lies the wreck of something that fell from the sky: a vast fossil, not of any living thing. Its viscera still glow.",
    pulled: (n) => `You pull ${n} Divine Viscera from the wreck. In the Skylands it can shape the Divine Challenge.`,
  },
};

export const canyonIdFor = (seed, rx, ry) => `canyon:${seed}:${rx}:${ry}`;
export const isCanyonId = (id) => String(id || "").startsWith("canyon:");
export const canyonHere = (seed, rx, ry) => Math.abs(rx) + Math.abs(ry) >= CANYON.minRing && (hashSeed(`${seed}:canyon-crater:v1:${rx}:${ry}`) % 10000) / 10000 < CANYON.chance;
export const isClod = (t) => !!t && (t.kind === CANYON.kinds.green || t.kind === CANYON.kinds.yellow || t.kind === CANYON.kinds.red);
export function ensureCanyonHistory(h) { const c = h.canyon && typeof h.canyon === "object" ? h.canyon : {}; if (Number.isInteger(c.caveIns) && c.caveIns >= 0 && Array.isArray(c.drilled) && Array.isArray(c.reddened) && typeof c.sealed === "boolean" && typeof c.pulled === "boolean") return c; // already sound: keep it (drilled every frame)
  const list = (v) => Array.isArray(v) ? v.filter(Number.isInteger).slice(-CANYON.maxDrilled) : []; h.canyon = { caveIns: Math.max(0, Math.floor(Number(c.caveIns) || 0)), sealed: c.sealed === true, pulled: c.pulled === true, drilled: list(c.drilled), reddened: list(c.reddened) }; return h.canyon; }

// The crater, generated from the seed and its id (the same each time); `drilled` tiles are opened again over it.
export function generateCanyon(seed, id, drilled = [], reddened = []) {
  const C = CANYON, W = C.size, H = C.size, r = rng(`${seed}:canyon:v1:${id}`), K = C.kinds, tiles = [];
  const stab = (x, y) => { const v = (hashSeed(`${seed}:${id}:clod:${x}:${y}`) % 1000) / 1000; return v < C.stability.green ? "green" : v < C.stability.green + C.stability.yellow ? "yellow" : "red"; };
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
  for (const i of reddened) { const t = tiles[i]; if (t && t.kind === K.yellow) t.kind = K.red; } // strained too far, once
  for (const i of drilled) { const t = tiles[i]; if (t && isClod(t)) Object.assign(t, { kind: K.floor, blocked: false, clod: false, drilledOut: true }); }
  const objects = [{ id: "dungeon-exit", kind: "exit", x: entry.x, y: entry.y - 1, state: "open", actions: ["exit"] },
    { id: "canyon-wreck", kind: "divineWreck", name: "Wreck of the Fallen", x: deep.x, y: deep.y, state: "intact", actions: ["pull"], lore: C.messages.wreck }];
  const enemySpawns = []; caverns.forEach((c, i) => { if (c === lavaC || c === poolC) return; const kind = C.creatures[hashSeed(`${seed}:${id}:cav${i}`) % C.creatures.length]; enemySpawns.push({ id: `${id}:cav${i}`, kind, x: c.x + 1, y: c.y }); });
  return { seed, id, recipe: "canyon", name: C.name, identity: "a crater where something divine fell", danger: "cave-ins", width: W, height: H, tiles, entry, exit: { x: entry.x, y: entry.y - 1 }, objects, enemySpawns, canyon: { version: C.version, deep: { x: deep.x, y: deep.y } }, landscape: { biome: "underlands" }, theme: "canyon", generatorVersion: 1, sizeProfile: "canyon" };
}

// One frame of drilling the clod `t` (pushing into it for `dt` s). `state` is the game's runtime drill state (strain per tile,
// progress). Returns { broke, caveIn, turnedRed }.
export function drillClod(t, state, dt, robot) {
  const C = CANYON.clod, k = `${t.x},${t.y}`, s = (state[k] ||= { progress: 0, strain: 0 });
  s.progress += C.drill * (robot ? CANYON.clod.robot : 1) * dt; s.touched = true; let turnedRed = false;
  if (t.kind === CANYON.kinds.yellow) { s.strain += C.strain.rise * dt; if (s.strain >= C.strain.limit) { t.kind = CANYON.kinds.red; turnedRed = true; } }
  if (s.progress < (C.hp[t.kind] ?? 1)) return { broke: false, turnedRed };
  const caveIn = t.kind === CANYON.kinds.red; delete state[k];
  Object.assign(t, { kind: CANYON.kinds.floor, blocked: false, clod: false, drilledOut: true });
  return { broke: true, caveIn, turnedRed };
}
// Strain settles on every yellow clod not drilled this frame.
export function settleClods(state, dt) { for (const [k, s] of Object.entries(state)) { if (s.touched) { s.touched = false; continue; } s.strain = Math.max(0, s.strain - CANYON.clod.strain.settle * dt); if (s.strain <= 0 && s.progress <= 0) delete state[k]; } }
