// Tall towers: the Upwells (Tim, 2026-11-13, TALL TOWERS v1): "bite-size vertical explorations scattered across the open
// world... much smaller commitments than a Pentagon". Each is mostly a hollow shaft, 8 to 15 levels tall, with ledges along its
// walls and a few platforms floating in the middle. Falling is the threat (the ordinary fall table: two levels hurt, four kill).
// The climb is the vertical toolkit the Wayfarer already has: a jump (one level), an aimed Rift Step (up to two levels, across a
// gap) and the drone, whose lift is capped below the top in here (`drone.below`), so it cannot simply fly up. The glider never
// opens indoors. Some towers have their door at the foot; others have it a few levels up the face, reached by a short run of
// floating steps outside. At the top: a cache paid once (by tier), a lookout that charts the sections round it on the Atlas,
// and the Long Rope, a safe way down: the climb is the challenge, not the descent.
//
// Lore (narrative-bible.md, the river and its eddies): someone built a well the wrong way up, to draw the distance down.
//
// Placement: new ground only. A section first seen from this release is pinned `towerVersion` on the atlas (game.ts loadArea);
// one seen before is never given a tower. A roll a section (`chance`, past `minRing`), the tier by distance from the Refuge
// (taller further out; `tiers`), and a spot of flat dry open ground clear of the exit lanes and the plaza (`placeTower`).
// Inside, the tower is one area (a dungeon id: `tower:<seed>:<rx>:<ry>:<tier>:<levels>:<door level>`), laid from the id alone
// (`generateTowerInterior`) as a versioned interior heightfield (landscape.ts interiorTerrain). Its progress lives on its own
// dungeon history (`towerCache`, `towerLookout`, `towerDoors`); the sections the lookouts charted live in `save.towerSight`
// (additive, schema 14, `ensureTowerSight`). Every layout is checked by the same solver the tests use (`towerClimb`): the top
// is reached from the bottom and from the raised door with the base kit, and every place reached can get back down.
import { hashSeed, byHash } from "./random.js?v=r948-c8651a95a1b1";

const f = Object.freeze;
export const TALL_TOWERS = f({
  version: 1, // the generation namespace; a section pins it on the atlas as `towerVersion`
  name: "Upwell",
  lore: "Someone built a well the wrong way up, to draw the distance down. From its lip the Corridor shows what it has not yet decided.",
  chance: .12, // of a section past `minRing`; a third to a half of the rolls find room (flat dry ground, no town, sea, great building or great tree): about one tower in every 15 to 25 sections (tests/tall-towers.test.ts)
  minRing: 3, // never at the Refuge or its doorstep
  footprint: 4, // tiles a side, outside
  margin: 1, // open ground kept round the footprint
  spots: 220, tries: 6, // spots tried in hashed order; rejected layouts before giving up
  // By distance from the Refuge (|rx| + |ry|, from `ring`): the tower's height in levels, the shaft's size (walls included),
  // the Rift Step gaps along its ledges, how wide its ledges run (share two tiles wide), the platforms floating in the middle,
  // the creatures on its walls, the cache, the lookout's reach (sections, Chebyshev) and the creatures' scaling.
  tiers: f([
    f({ tier: 1, ring: 3, name: "Low Upwell", levels: f([8, 9]), size: 11, gaps: f([0, 0]), wide: 1, floats: 1, dwellers: f([1, 1]),
      cache: f({ items: 1, cinderIron: 2, lumenDust: 1 }), lookout: 2, scale: f({ hp: 1, damage: 1 }) }),
    f({ tier: 2, ring: 12, name: "Upwell", levels: f([10, 12]), size: 13, gaps: f([1, 2]), wide: .7, floats: 2, dwellers: f([2, 3]),
      cache: f({ items: 2, cinderIron: 3, lumenDust: 2 }), lookout: 2, scale: f({ hp: 1.15, damage: 1.08 }) }),
    f({ tier: 3, ring: 30, name: "High Upwell", levels: f([13, 15]), size: 13, gaps: f([2, 3]), wide: .45, floats: 3, dwellers: f([3, 4]),
      cache: f({ items: 3, cinderIron: 5, lumenDust: 3 }), lookout: 3, scale: f({ hp: 1.3, damage: 1.15 }) }),
  ]),
  maxLevels: 15, // no taller tower anywhere: there is no infinite tower
  raised: f({ share: .45, levels: f([2, 4]) }), // towers whose door is up the face, and how high
  reachLevels: .75, // a thing inside (a door out, the cache, the lookout, the rope) is reached only from its own level, within this
  kit: f({ jump: 1, riftReach: 3, riftRise: 2, fatal: 4 }), // the base kit the solver assumes (game.ts JUMP; constellation.ts RIFT rank 1, RIFT_AIM.rise; landscape.ts fallDamage)
  drone: f({ below: 3 }), // the drone's lift tops out this many levels under the top: the last of the climb is on foot
  hall: f({ headroom: 3, backdrop: "paleWell" }), // tiles of open air over the top (Close View), and what is seen overhead
  slab: 1, // a ledge or a platform is drawn this many levels thick, hollow beneath (Close View; landscape heights unchanged)
  dwellerKinds: f({ perch: "roofGargoyle", flier: "slateRook" }), // from the existing pack (roof-dwellers.ts): one keeps its ledge, one flies the shaft
  dwellerClear: 3, // tiles kept between a creature and a door, the summit or another creature
  exteriorStep: "skyPlatform", // the floating steps up to a raised door (the Sky Stairs' kind)
  messages: f({
    arrive: "An Upwell stands here: a tower hollow to the sky.",
    raised: "The Upwell's door is up the face. Climb the floating steps to it: jump from one to the next.",
    enter: "Inside, the tower is hollow all the way up. Ledges climb its walls; the floor is a long way down from any of them.",
    sealed: "The Upwell's lower door opens only from inside.",
    top: "The lip of the Upwell.",
    lookout: "From the lip you see the land round the tower laid out below. It is charted on your Atlas.",
    lookedOut: "You have looked out from here before; the land below is already charted.",
    lift: "You take the Long Rope down the outside of the tower, hand over hand, to the ground.",
    cacheOpened: "The cache is empty: you emptied it before.",
    door: "You step back out of the tower.",
    postern: "The low door lets you out at the tower's foot and swings shut behind you.",
    reach: "That is on another level from where you stand.",
  }),
});

// ------------------------------------------------------------------------------------------------ ids and the roll
const ID = /^tower:(.+):(-?\d+):(-?\d+):([123]):(\d+):(\d)$/;
export const isTowerId = (id) => ID.test(String(id || ""));
export function parseTowerId(id) {
  const m = String(id || "").match(ID); if (!m) return null;
  const tier = Number(m[4]), levels = Number(m[5]), door = Number(m[6]);
  if (levels < 2 || levels > TALL_TOWERS.maxLevels || door > 4) return null;
  return { seed: m[1], rx: Number(m[2]), ry: Number(m[3]), tier, levels, door };
}
export const towerId = (seed, rx, ry, plan) => `tower:${seed}:${rx}:${ry}:${plan.tier}:${plan.levels}:${plan.door}`;
export const towerTier = (rx, ry) => { const d = Math.abs(rx) + Math.abs(ry); let T = TALL_TOWERS.tiers[0]; for (const q of TALL_TOWERS.tiers) if (d >= q.ring) T = q; return T; };
const roll = (seed, rx, ry, k) => (hashSeed(`${seed}:tall-tower:v${TALL_TOWERS.version}:${rx}:${ry}:${k}`) % 10000) / 10000;
// Does an Upwell stand in this section (by the roll alone; `placeTower` still needs room)? { tier, levels, door } or null.
export function towerHere(seed, rx, ry) {
  if (Math.abs(rx) + Math.abs(ry) < TALL_TOWERS.minRing) return null;
  if (roll(seed, rx, ry, "roll") >= TALL_TOWERS.chance) return null;
  const T = towerTier(rx, ry), levels = Math.min(TALL_TOWERS.maxLevels, T.levels[0] + Math.floor(roll(seed, rx, ry, "levels") * (T.levels[1] - T.levels[0] + 1)));
  const R = TALL_TOWERS.raised, door = roll(seed, rx, ry, "raised") < R.share ? R.levels[0] + Math.floor(roll(seed, rx, ry, "door") * (R.levels[1] - R.levels[0] + 1)) : 0;
  return { tier: T.tier, levels, door };
}
export const tierOf = (tier) => TALL_TOWERS.tiers.find((q) => q.tier === tier) || TALL_TOWERS.tiers[0];
// The drawn height of the tower outside, in tiles: a level is LIFT tiles (landscape.ts LIFT_PER_LEVEL), plus a crown.
const LIFT = .34; // landscape.ts LIFT_PER_LEVEL (not imported, so this module stays free of the landscape)
export const towerDrawnHeight = (levels) => Math.min(7, 1.2 + levels * LIFT);

// ------------------------------------------------------------------------------------------------ outside, on the overworld
const I = (x, y) => y * 32 + x, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const WET = /ocean|Ocean|lake|Lake|swamp|Swamp|toxic|Toxic|water|Water|lava|abyss|river|canyon|mire|Mire|shallows|pool|Pool|ice|Ice|chasm|void|Void/;
// Lay an Upwell into `map` (a 32x32 overworld section with a landscape layer): a footprint of blocked tower stone, the
// `tallTower` object that draws it, its door (a `dungeon` object) and, for a raised door, the floating steps up to it.
// `exitsOpen(map)` (keeps.ts) checks the section's ways out; `core(map)` (landscape.ts coherenceCore) the ground joined to the
// plaza: the door, or the foot of the steps, must stand on it. Returns the record or null.
export function placeTower(map, seed, rx, ry, plan, exitsOpen, core = null) {
  if (!map?.tiles?.length || map.tiles.length !== 1024 || !map.landscape || map.keep || map.castle || map.canopy || map.greatBuilding || map.pentagon || map.tallTower || map.openSea || map.settlement || map.hamlet) return null;
  const K = TALL_TOWERS, F = K.footprint, M = K.margin, ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1;
  const between = (v, c) => Number.isFinite(c) && v >= Math.min(c, 16) - 1 && v <= Math.max(c, 16) + 1;
  const lane = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16) || (Math.abs(y - 16) <= 1 && (between(x, ex.north) || between(x, ex.south))) || (Math.abs(x - 16) <= 1 && (between(y, ex.west) || between(y, ex.east))) || (x >= 12 && x <= 20 && y >= 12 && y <= 20);
  const objAt = (x, y) => (map.objects || []).some((o) => !o.decor && !o.environmental && Math.round(o.x) === x && Math.round(o.y) === y);
  const ground = (x, y) => { if (x < 1 || y < 1 || x > 30 || y > 30) return false; const t = map.tiles[I(x, y)]; return !!t && !t.blocked && !t.slope && !(t.elev > 0) && !t.structure && !t.buildingId && !t.canopy && !t.keep && !t.greatBuilding && !t.skyPlatform && !t.mushroom && !WET.test(t.kind || "") && !(t.environment && t.environment !== "tree") && !lane(x, y) && !objAt(x, y); };
  const h = (k) => hashSeed(`${seed}:tall-tower-spot:v${K.version}:${rx}:${ry}:${k}`);
  const spots = []; for (let oy = 3; oy <= 29 - F; oy++) for (let ox = 3; ox <= 29 - F; ox++) spots.push([ox, oy]);
  spots.sort(byHash((p) => `${seed}:tall-tower-spot:v${K.version}:${rx}:${ry}:${p}`));
  let tries = 0;
  for (const [ox, oy] of spots.slice(0, K.spots)) {
    let fits = true; for (let y = oy - M; y < oy + F + M && fits; y++) for (let x = ox - M; x < ox + F + M && fits; x++) fits = ground(x, y);
    if (!fits) continue;
    const south = oy + F / 2 < 16, dir = south ? 1 : -1, dx = ox + (F >> 1), dy = south ? oy + F - 1 : oy, out = { x: dx, y: dy + dir }; // the door faces the section's middle
    const beside = (x, y) => x >= ox - 1 && x <= ox + F && y >= oy - 1 && y <= oy + F && !(south ? y === oy + F : y === oy - 1); // the footprint, its sides and back (not the row before the door)
    // the raised door's floating steps: down from the ledge before the door, a level a step, sideways along the face or out
    // from it, each a tile on or a gap tile over (a hop from one to the next keeps its height: game.ts skyAir)
    let steps = [], foot = out;
    if (plan.door > 0) {
      steps = [{ x: out.x, y: out.y, elev: plan.door }]; const taken = new Set([I(out.x, out.y)]);
      const side = h("side") & 1 ? 1 : -1; let ok = true;
      for (let e = plan.door - 1; e >= 1 && ok; e--) {
        const last = steps[steps.length - 1], moves = [[side * 2, 0, true], [side, 0, false], [0, dir * 2, true], [0, dir, false], [-side * 2, 0, true], [-side, 0, false]];
        const pick = moves.slice().sort(byHash((m) => `${seed}:tall-tower-step:${rx}:${ry}:${e}:${m}`));
        ok = false;
        for (const [mx, my, gap] of pick) {
          const nx = last.x + mx, ny = last.y + my, gx = last.x + Math.sign(mx), gy = last.y + Math.sign(my);
          if (taken.has(I(nx, ny)) || !ground(nx, ny) || beside(nx, ny) || (gap && (taken.has(I(gx, gy)) || !ground(gx, gy) || beside(gx, gy)))) continue; // never against the tower's sides or back
          if (N4.some(([ax, ay]) => taken.has(I(nx + ax, ny + ay)) && !(nx + ax === last.x && ny + ay === last.y))) continue; // no step beside an earlier one (only the one before)
          steps.push({ x: nx, y: ny, elev: e }); taken.add(I(nx, ny)); if (gap) taken.add(I(gx, gy)); ok = true; break;
        }
      }
      const last = steps[steps.length - 1];
      foot = ok ? N4.map(([ax, ay]) => ({ x: last.x + ax, y: last.y + ay })).sort(byHash((p) => `${seed}:tall-tower-foot:${rx}:${ry}:${p.x},${p.y}`)).find((p) => ground(p.x, p.y) && !beside(p.x, p.y) && !taken.has(I(p.x, p.y)) && !N4.some(([ax, ay]) => steps.some((s, i) => i < steps.length - 1 && s.x === p.x + ax && s.y === p.y + ay))) : null;
      if (!ok || !foot) { if (++tries >= K.tries) return null; continue; }
    } else if (!ground(out.x, out.y)) continue;
    const tiles = map.tiles.slice(), before = exitsOpen(map), footprint = [], H = towerDrawnHeight(plan.levels);
    for (let y = oy; y < oy + F; y++) for (let x = ox; x < ox + F; x++) { footprint.push({ x, y }); const i = I(x, y);
      map.tiles[i] = { ...map.tiles[i], x, y, kind: "towerStone", blocked: true, slope: false, elev: 0, tallTower: true, towerH: H, environment: undefined, canopy: undefined }; }
    for (const s of steps) { const i = I(s.x, s.y), t = map.tiles[i]; map.tiles[i] = { ...t, x: s.x, y: s.y, kind: K.exteriorStep, elev: s.elev, slope: false, blocked: false, skyPlatform: true, towerStep: true, landscape: t.landscape || "sky", environment: undefined }; }
    const after = exitsOpen(map), joined = !core || !!core(map)[I(foot.x, foot.y)];
    if (!before.every((o, i) => !o || after[i]) || !joined) { map.tiles = tiles; if (++tries >= K.tries) return null; continue; }
    const id = `tall-tower-${rx}-${ry}`, dungeonId = towerId(seed, rx, ry, plan), T = tierOf(plan.tier);
    const inBox = (o) => (o.x >= ox - M - .5 && o.x < ox + F + M - .5 && o.y >= oy - M - .5 && o.y < oy + F + M - .5) || steps.some((s) => Math.round(o.x) === s.x && Math.round(o.y) === s.y);
    map.objects = (map.objects || []).filter((o) => !inBox(o));
    map.enemySpawns = (map.enemySpawns || []).filter((e) => !inBox(e));
    const doors = { rx, ry, front: plan.door ? null : { ...out }, raised: plan.door ? { ...out } : null, foot: { ...foot } };
    const rec = { id, kind: "tallTower", name: T.name, tier: plan.tier, levels: plan.levels, x: dx, y: oy + F - 1, bounds: { x: ox, y: oy, w: F, h: F }, footprint, door: { x: dx, y: dy, side: south ? "south" : "north", raised: plan.door }, steps, faceH: H, grain: h("grain") % 97, state: "closed", actions: [] };
    map.objects.push(rec);
    map.objects.push({ id: `${id}-door`, kind: "dungeon", towerDoor: true, towerDoors: doors, dungeonId, dungeonType: "tallTower", name: T.name, identity: `${plan.levels} levels, hollow to the sky`, x: out.x, y: out.y, ...(plan.door ? { elev: plan.door, atLevel: plan.door, enterAt: "raised" } : {}), state: "open", actions: ["enter"], landmark: true, lore: `${T.name}: ${plan.levels} levels. ${K.lore}` });
    map.tallTower = { id, base: dungeonId, tier: plan.tier, levels: plan.levels, door: plan.door, version: K.version };
    return rec;
  }
  return null;
}

// ------------------------------------------------------------------------------------------------ inside: the shaft
// The base kit's moves on a tower interior (a heightfield: one level a tile; walls blocked). From tile a:
//   walk or jump to a 4-neighbour b no more than `jump` higher, never a drop of `fatal` levels or more;
//   with `rift`, an aimed Rift Step to any open tile b within `riftReach` (tile middles) no more than `riftRise` higher, along a
//   line no wall crosses, never a fatal drop.
// Returns the tiles reached (Uint8Array) from `starts` ([{ x, y }]). Pure; bounded (the map is at most 13x13).
export function towerReach(map, starts, { rift = true, reverse = false } = {}) {
  const W = map.width, H = map.height, T = map.tiles, K = TALL_TOWERS.kit, seen = new Uint8Array(W * H), q = [];
  const lev = (k) => Number(T[k]?.elev) || 0, open = (k) => !!T[k] && !T[k].blocked;
  const ok = (a, b) => { const up = lev(b) - lev(a); return up <= K.jump && -up < K.fatal; }; // walking a -> b
  const okRift = (a, b) => { const up = lev(b) - lev(a); return up <= K.riftRise && -up < K.fatal; };
  const clear = (a, b) => { const ax = a % W + .5, ay = ((a / W) | 0) + .5, bx = b % W + .5, by = ((b / W) | 0) + .5, n = Math.ceil(Math.hypot(bx - ax, by - ay) / .25);
    for (let i = 1; i < n; i++) { const x = Math.floor(ax + (bx - ax) * i / n), y = Math.floor(ay + (by - ay) * i / n); if (T[y * W + x]?.blocked) return false; } return true; };
  for (const s of starts) { const k = s.y * W + s.x; if (open(k) && !seen[k]) { seen[k] = 1; q.push(k); } }
  const R = K.riftReach, Ri = Math.floor(R);
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0;
    for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, n = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[n] || !open(n)) continue; if (!(reverse ? ok(n, k) : ok(k, n))) continue; seen[n] = 1; q.push(n); }
    if (rift) for (let ny = Math.max(0, y - Ri); ny <= Math.min(H - 1, y + Ri); ny++) for (let nx = Math.max(0, x - Ri); nx <= Math.min(W - 1, x + Ri); nx++) { const n = ny * W + nx;
      if (seen[n] || !open(n) || Math.hypot(nx - x, ny - y) > R + 1e-9) continue; if (!(reverse ? okRift(n, k) : okRift(k, n)) || !clear(k, n)) continue; seen[n] = 1; q.push(n); } }
  return seen;
}
// The whole check on one interior: { top, fromRaised, back, jumpOnly, reached }. `top`: the summit is reached from the bottom;
// `fromRaised`: and from the raised door's ledge (true without one); `back`: every tile reached from either can get back to the
// bottom or on to the summit (no softlock); `jumpOnly`: the summit is reached without Rift Step.
export function towerClimb(map) {
  const C = map?.tallTower; if (!C) return null; const W = map.width, at = (p) => p.y * W + p.x;
  const bottom = towerReach(map, [C.bottom]), raised = C.raisedAt ? towerReach(map, [C.raisedAt]) : null, summit = at(C.summit);
  const home = towerReach(map, [C.bottom, C.summit], { reverse: true });
  let back = true; for (let k = 0; k < bottom.length; k++) if ((bottom[k] || raised?.[k]) && !home[k]) { back = false; break; }
  let reached = 0; for (let k = 0; k < bottom.length; k++) if (bottom[k] || raised?.[k]) reached++;
  return { top: !!bottom[summit], fromRaised: raised ? !!raised[summit] : true, back, jumpOnly: !!towerReach(map, [C.bottom], { rift: false })[summit], reached };
}

// Lay one tower's interior from its id. The shaft is `size` square inside its walls; the climb runs once round the walls from
// beside the bottom door (east along the south wall, up the east, back along the north, down the west) to the summit, a 3x3
// block in the south-west corner at the top level. Along it each ledge tile is level with the one before or a level up (a
// jump); a gap (a ledge tile left out) is crossed by an aimed Rift Step, up to two levels. A raised door's ledge is the climb's
// tile at the door's level on the south wall. Platforms float in the middle, a Rift Step from a ledge. Layouts are tried in
// hashed order until the solver accepts one (the first of the plain climbs, with no gaps, always passes).
export function generateTowerInterior(seed, id) {
  const P = parseTowerId(id); if (!P) return null; const T = tierOf(P.tier), K = TALL_TOWERS;
  for (let attempt = 0; attempt < 8; attempt++) { const map = layTower(P, T, id, seed, attempt); if (map) return map; }
  return layTower(P, T, id, seed, -1); // the plain climb: every link a jump
}
function layTower(P, T, id, seed, attempt) {
  const K = TALL_TOWERS, S = T.size, W = S, H = S, n = S - 2, mid = S >> 1, yb = S - 2, top = P.levels;
  const h = (k) => hashSeed(`${id}:tall-tower-interior:v${K.version}:${attempt}:${k}`), u = (k) => (h(k) % 10000) / 10000;
  const tiles = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const wall = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    tiles.push(wall ? { x, y, kind: "towerWall", blocked: true, elev: 0, slope: false, detail: (x * 3 + y) % 4 } : { x, y, kind: "towerFloor", blocked: false, elev: 0, slope: false, detail: (x * 7 + y * 3) % 4 }); }
  const at = (x, y) => tiles[y * W + x];
  // the climb's tiles, in order round the walls
  const ring = []; for (let x = mid + 1; x <= n; x++) ring.push([x, yb]); for (let y = yb - 1; y >= 1; y--) ring.push([n, y]); for (let x = n - 1; x >= 1; x--) ring.push([x, 1]); for (let y = 2; y <= yb - 3; y++) ring.push([1, y]);
  const corner = ([x, y]) => (x === 1 || x === n) && (y === 1 || y === yb);
  const L = ring.length, door = P.door, rises = top - 2; // ring[0] stands at level 1, the last at top - 1, the summit at top
  // links between consecutive climb tiles (link i joins i and i + 1); a gap removes a tile: its link joins i and i + 2
  const gapsWanted = attempt < 0 ? 0 : T.gaps[0] + (h("gaps") % (T.gaps[1] - T.gaps[0] + 1)), gap = new Set();
  const gapOk = (i) => i > door + 1 && i < L - 3 && !corner(ring[i]) && !corner(ring[i - 1]) && !corner(ring[i + 1]) && ![i - 2, i - 1, i + 1, i + 2].some((j) => gap.has(j));
  const order = Array.from({ length: L }, (_, i) => i).sort(byHash((i) => `${id}:tall-tower-gap:${attempt}:${i}`));
  for (const i of order) { if (gap.size >= gapsWanted) break; if (gapOk(i)) gap.add(i); }
  const climb = ring.map((p, i) => i).filter((i) => !gap.has(i)); // indices kept
  const links = climb.slice(1).map((i, k) => ({ from: climb[k], to: i, rift: i - climb[k] > 1, rise: 0 }));
  let left = rises;
  for (let k = 0; k < Math.min(Math.max(0, door - 1), links.length); k++) { links[k].rise = 1; left--; } // up to the raised door: a level a step
  for (const l of links) if (l.rift && left > 0) { const r = Math.min(K.kit.riftRise, left, 1 + (h(`rr${l.from}`) & 1)); l.rise = r; left -= r; }
  const free = links.filter((l, k) => !l.rift && k >= Math.max(0, door - 1)).sort(byHash((l) => `${id}:tall-tower-rise:${attempt}:${l.from}`));
  // spread the remaining rises: every other free link first, so flat runs stand between the steps where there is room
  for (const pass of [0, 1]) for (const l of free) { if (left <= 0) break; if (l.rise) continue; if (pass === 0 && links.some((m) => m !== l && m.rise && !m.rift && (m.to === l.from || m.from === l.to))) continue; l.rise = 1; left--; }
  if (left > 0) return null; // not enough room for the climb's rises (never for the table's sizes)
  const level = new Map([[climb[0], 1]]); for (const l of links) level.set(l.to, level.get(l.from) + l.rise);
  const ledge = (x, y, e) => Object.assign(at(x, y), { kind: "towerLedge", elev: e, towerSlab: K.slab });
  for (const i of climb) { const [x, y] = ring[i]; ledge(x, y, level.get(i)); }
  // widen: the tile inward from a ledge tile (not at a corner, not beside a gap) runs at the same level
  for (const i of climb) { const [x, y] = ring[i]; if (corner(ring[i]) || gap.has(i - 1) || gap.has(i + 1) || u(`wide${i}`) >= T.wide) continue;
    const ix = x === 1 ? 2 : x === n ? n - 1 : x, iy = y === 1 ? 2 : y === yb ? yb - 1 : y, q = at(ix, iy); if (q.elev > 0 || (ix >= 1 && ix <= 3 && iy >= yb - 3)) continue; ledge(ix, iy, level.get(i)); }
  // the summit
  for (let y = yb - 2; y <= yb; y++) for (let x = 1; x <= 3; x++) Object.assign(at(x, y), { kind: "towerSummit", elev: top, towerSlab: K.slab });
  // platforms floating in the middle: each a Rift Step from a ledge, a level or two over it; a shortcut where one fits
  const raisedTiles = () => tiles.filter((t) => !t.blocked && t.elev > 0);
  const idx = new Map(ring.map((p, i) => [`${p[0]},${p[1]}`, i]));
  const centre = []; for (let y = 4; y <= S - 5; y++) for (let x = 4; x <= S - 5; x++) centre.push([x, y]);
  centre.sort(byHash((p) => `${id}:tall-tower-float:${attempt}:${p}`));
  const floats = []; const R = K.kit.riftReach;
  for (const [x, y] of centre) { if (floats.length >= (attempt < 0 ? 1 : T.floats)) break;
    if (floats.some(([fx, fy]) => Math.abs(fx - x) + Math.abs(fy - y) < 2)) continue;
    const near = raisedTiles().filter((t) => Math.hypot(t.x - x, t.y - y) <= R && t.kind === "towerLedge");
    if (!near.length) continue;
    near.sort((a, b) => a.elev - b.elev || a.y - b.y || a.x - b.x);
    let best = null; for (const a of near) for (const r of [2, 1]) { const e = a.elev + r, ai = idx.get(`${a.x},${a.y}`) ?? -1;
      const onward = near.some((b) => b.elev > e && b.elev <= e + K.kit.riftRise && (idx.get(`${b.x},${b.y}`) ?? -1) > ai + 3);
      if (!best || (onward && !best.onward)) best = { e, onward }; if (best.onward) break; }
    if (!best || best.e >= top) continue;
    Object.assign(at(x, y), { kind: "towerPlatform", elev: best.e, towerSlab: K.slab, towerFloat: true }); floats.push([x, y]); }
  // doors, the summit's things
  const objects = [], bottom = { x: mid, y: yb }, raisedAt = door ? { x: mid + door, y: yb } : null;
  if (raisedAt && at(raisedAt.x, raisedAt.y).elev !== door) return null;
  if (door) { objects.push({ id: "tower-raised-door", kind: "exit", towerExit: "raised", name: "The door out", x: raisedAt.x, y: S - 1, atLevel: door, state: "open", actions: ["exit"] });
    objects.push({ id: "tower-postern", kind: "exit", towerExit: "postern", name: "The low door (out only)", x: mid, y: S - 1, atLevel: 0, state: "open", actions: ["exit"] }); }
  else objects.push({ id: "tower-door", kind: "exit", towerExit: "door", name: "The door out", x: mid, y: S - 1, atLevel: 0, state: "open", actions: ["exit"] });
  const summit = { x: 1, y: yb - 2 };
  objects.push({ id: "tower-cache", kind: "chest", towerCache: true, name: `${T.name} Cache`, x: 3, y: yb - 2, atLevel: top, state: "closed", actions: ["open"], rewardSource: `tower-cache-${P.tier}` });
  objects.push({ id: "tower-lookout", kind: "towerLookout", name: "The lookout", x: 1, y: yb, atLevel: top, state: "ready", actions: ["look"], lore: K.messages.top });
  objects.push({ id: "tower-rope", kind: "towerRope", name: "The Long Rope (down)", x: 3, y: yb, atLevel: top, state: "open", actions: ["descend"] });
  // creatures: a perched one on a flat run of ledge, fliers over the shaft; never near a door, the summit or each other
  const want = T.dwellers[0] + (h("dwellers") % (T.dwellers[1] - T.dwellers[0] + 1)), enemySpawns = [], C = K.dwellerClear;
  const keep = [bottom, raisedAt, { x: 2, y: yb - 1 }].filter(Boolean);
  const spots = tiles.filter((t) => t.kind === "towerLedge" && t.elev >= 3 && t.elev <= top - 2).sort(byHash((t) => `${id}:tall-tower-dweller:${t.x},${t.y}`));
  for (const t of spots) { if (enemySpawns.length >= want) break;
    if (keep.some((p) => Math.abs(p.x - t.x) + Math.abs(p.y - t.y) < C) || enemySpawns.some((e) => Math.abs(e.x - t.x) + Math.abs(e.y - t.y) < C)) continue;
    const flat = N4.some(([dx, dy]) => { const q = at(t.x + dx, t.y + dy); return q && !q.blocked && q.elev === t.elev; }), perch = enemySpawns.length % 2 === 0 && flat; // a perched one wants a run of ledge; else a flier
    enemySpawns.push({ id: `${id}:d${enemySpawns.length}`, kind: perch ? K.dwellerKinds.perch : K.dwellerKinds.flier, x: t.x, y: t.y, towerDweller: P.tier, buildingGuard: false }); }
  const name = `${T.name} · ${top} levels`;
  const map = {
    seed, id, recipe: "tallTower", name, identity: `${T.name}: a hollow tower, ${top} levels to its lip`, danger: "long falls", width: W, height: H, tiles, entry: { ...bottom }, exit: { x: mid, y: S - 1 }, objects, enemySpawns,
    building: { base: id, style: "tower", tallTower: true, floor: 1, floors: 1, tier: P.tier, entries: raisedAt ? { raised: { ...raisedAt } } : {} },
    tallTower: { id, tier: P.tier, levels: top, door, size: S, bottom, raisedAt, summit, droneCeiling: top - K.drone.below, floats: floats.length, gaps: gap.size, attempt },
    hall: { type: "tower", name: T.name, tall: true, ceiling: "open", ceilingHeight: top * LIFT + K.hall.headroom, open: true, sky: true, backdrop: K.hall.backdrop },
    landscape: { version: 0, biome: null, name: null, interior: true }, interiorTerrain: { version: 1, maxLevel: top },
    layoutVersion: 1, themePool: 0,
  };
  const check = towerClimb(map);
  if (!check.top || !check.fromRaised || !check.back) return null;
  return map;
}

// ------------------------------------------------------------------------------------------------ the sighted sections
// What the lookouts have charted: `save.towerSight` { "rx,ry": 1 } (additive at schema 14). Normalised here (types.ts calls it).
export function ensureTowerSight(save) {
  if (!save || typeof save !== "object") return {};
  const raw = save.towerSight && typeof save.towerSight === "object" && !Array.isArray(save.towerSight) ? save.towerSight : {}, out = {};
  for (const [k, v] of Object.entries(raw)) if (v && /^-?\d+,-?\d+$/.test(k)) out[k] = 1;
  save.towerSight = out; return out;
}
// The sections a lookout at (rx, ry) charts: within `radius` (Chebyshev), the tower's own section included. Returns the keys
// newly charted (neither explored nor charted before).
export function lookOut(save, rx, ry, radius) {
  const sight = ensureTowerSight(save), explored = save.explored || {}, added = [];
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) { const k = `${rx + dx},${ry + dy}`; if (explored[k] || sight[k]) continue; sight[k] = 1; added.push(k); }
  return added;
}
// The cache's pay, by tier (TALL_TOWERS.tiers[*].cache).
export const towerCachePay = (tier) => tierOf(tier).cache;
