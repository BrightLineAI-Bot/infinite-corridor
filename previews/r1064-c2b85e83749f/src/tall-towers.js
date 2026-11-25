// Tall towers: the Upwells (Tim, 2026-11-13, TALL TOWERS v1): "bite-size vertical explorations scattered across the open
// world... much smaller commitments than a Pentagon". Each is mostly a hollow shaft, 8 to 15 levels tall, with ledges along its
// walls and a few platforms floating in the middle. Falling is the threat (the ordinary fall table: two levels hurt, four kill).
// The climb is the vertical toolkit the Wayfarer already has: a jump (one level), an aimed Rift Step (up to two levels, across a
// gap) and the drone, whose lift is capped below the top in here (`drone.below`), so it cannot simply fly up. The glider never
// opens indoors. Some towers have their door at the foot; others have it a few levels up the face, reached by a short run of
// floating steps outside. At the top: a cache paid once (by tier), a lookout that charts the sections round it on the Atlas (and glimpses a seed to hunt: `seedHunt`),
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
import { hashSeed, byHash } from "./random.js?v=r1064-c2b85e83749f";

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
  dwellerBoost: f({ roofGargoyle: f({ hp: 2, damage: 2 }) }), // Tim, 2026-11-14: the Eave Gargoyle on a tower's walls has twice the health and damage of its kind at that ring and tier (on top of the tier scale); other dwellers none
  dwellerVitals: 3, // how the creatures' health and damage were derived: 1 (releases 937 to 949) took the region's threat twice (about 30x the health and 15x the damage of their kind at ring 200); 2 (unreleased) took it once, as every creature does; 3 adds `dwellerBoost`. A dweller saved under 1 is mended on load (game.ts)
  exteriorStep: "skyPlatform", // the floating steps up to a raised door (the Sky Stairs' kind)
  // The seed hunt (Tim, 2026-11-18: "if you find one of these towers and climb to the top of it, it'll direct you to the location
  // of a seed... somewhere in an undiscovered section... not too far, not too close... a guaranteed seed hunt"). Looking out
  // from the lip starts one hunt per tower (`save.seedHunts`, keyed by the tower's id): a section not yet explored, `band`
  // sections off (Chebyshev), in an order hashed from the journey's seed and the tower's id; the first of at most `loads`
  // previewed whose ground can hold a find (game.ts seedHuntGround) is the one. The seed's kind is drawn by the travel seeds'
  // own overworld weights (skylands.ts SEED_FINDS.overworld), so the rare kinds stay rare. Where in that section it lies is
  // chosen when the section is first loaded with the hunt on, from what it offers (`where`, weighted; a kind it lacks drops
  // out) and kept on the hunt: on open ground, on a great tree's platforms (reached by climbing), or inside the section's
  // ordinary crossing, on the entry's own level, `crossingSteps` walking steps in. It is an object laid over the place as
  // loaded, never a tile or a generator change, so every pinned layout stays as it was.
  seedHunt: f({
    version: 1,
    band: f([3, 8]), // sections off from the tower (Chebyshev): not too close, not too far
    loads: 24, // the most candidate sections previewed for ground before the hunt gives up (a sea of nothing)
    where: f([f(["ground", 3]), f(["tree", 2]), f(["crossing", 2])]), // the kinds of spot, weighted; one the section lacks drops out
    crossingSteps: f([3, 18]), // walking steps from a crossing's entry (on its own level) a seed inside lies within
    groundFrom: 3, // tiles kept between an open-ground seed and the ground the section's reach is measured from
    marker: "#ffd36a", // its pin on the Atlas (main.ts drawAtlasPins), whatever the seed
    // Higher in the great trees (Tim, 2026-11-19: seeds may sit higher in great trees, including spots reached by hopping). A tree
    // spot is any great-tree platform the Wayfarer can reach from the section's edge-joined ground and come back down from by the
    // real movement rules with the hops the trees are laid for (game.ts huntTreeReach): walks and one-level jumps that never hurt
    // (a drop of at most `treeDrop` levels), and from a sky platform the sky jump over `treeGap` tile of open ground onto a canopy
    // tile no lower than a level under it. Only a spot not yet chosen uses it: a hunt keeps the spot it already has.
    treeHops: true, treeGap: 1, treeDrop: 1,
    // The compass (Tim, 2026-11-19): each live hunt is one of the quests the compass cycles through when tapped (main.ts
    // navigationTargets), named `compassLabel`; tracked, it points at the hunt's section and, inside it, at the seed or its door.
    compassLabel: "Seed hunt · {seed}",
    // Tim (2026-11-18): the Abyssal seed (the Bizarro world's) joins the hunt as its rarest kind. These are added to the travel
    // seeds' overworld weights only for a hunt, and only once the kind exists (skylands.ts SEEDS[kind]); until then they are inert.
    rare: f([f(["abyssal", 1])]),
    messages: f({
      glimpse: "From the lip you glimpse a glint far off to the {dir}, {n} sections away: {a} {seed}, lying somewhere in the land at {rx},{ry} that you have not yet walked. You mark it on your Atlas.",
      lore: "The well draws the distance down, and sometimes what the distance was keeping.",
      none: "You look for a glint in the land round the tower, but the distance keeps its seeds today.",
      already: "The glint you saw from here still waits at {rx},{ry}.",
      arrive: "The glint the Upwell showed you is somewhere in this section.",
      arriveTree: "The glint the Upwell showed you is high in the great tree here.",
      arriveCrossing: "The glint the Upwell showed you is below ground, in the crossing here.",
      inside: "The glint the Upwell showed you is somewhere on this level.",
      found: "You found the {seed} the Upwell at {tx},{ty} showed you, {where}.",
      wheres: f({ ground: "lying in the open", tree: "caught high in a great tree", crossing: "inside a crossing" }),
    }),
  }),
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

// ------------------------------------------------------------------------------------------------ the seed hunts
// `save.seedHunts` { [tower id]: hunt } (additive at schema 14; normalised here, types.ts calls it). A hunt: { v, tower, from:
// { rx, ry }, rx, ry, kind, state: "active" | "found", where?, x?, y?, elev?, dungeonId?, door? }. A malformed entry is dropped
// (it could never be found); unknown fields on a good one are kept.
const HUNT_STATES = new Set(["active", "found"]), HUNT_WHERE = new Set(["ground", "tree", "crossing"]);
export function ensureSeedHunts(save, kinds = null) {
  if (!save || typeof save !== "object") return {};
  const raw = save.seedHunts && typeof save.seedHunts === "object" && !Array.isArray(save.seedHunts) ? save.seedHunts : {}, out = {};
  for (const [id, q] of Object.entries(raw)) {
    if (!isTowerId(id) || !q || typeof q !== "object" || Array.isArray(q) || !Number.isSafeInteger(q.rx) || !Number.isSafeInteger(q.ry) || typeof q.kind !== "string" || !q.kind || (kinds && !kinds.includes(q.kind))) continue;
    const h = Object.assign(q, { v: 1, tower: id, state: HUNT_STATES.has(q.state) ? q.state : "active" }); // in place: a hunt held elsewhere stays the one kept
    if (!(q.from && Number.isSafeInteger(q.from.rx) && Number.isSafeInteger(q.from.ry))) { const P = parseTowerId(id); h.from = { rx: P.rx, ry: P.ry }; }
    if (h.where !== undefined && !HUNT_WHERE.has(h.where)) { delete h.where; delete h.x; delete h.y; delete h.elev; delete h.dungeonId; delete h.door; }
    out[id] = h;
  }
  save.seedHunts = out; return out;
}
// The sections a tower's hunt may aim at, in the hunt's own hashed order: `band` sections off (Chebyshev), none explored, none
// another live hunt already aims at. Pure: the same seed, tower, explored set and hunts give the same list.
export function seedHuntCandidates(seed, id, rx, ry, explored = {}, busy = new Set()) {
  const [lo, hi] = TALL_TOWERS.seedHunt.band, out = [];
  for (let dy = -hi; dy <= hi; dy++) for (let dx = -hi; dx <= hi; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < lo) continue; const k = `${rx + dx},${ry + dy}`;
    if (explored?.[k] || busy.has(k)) continue; out.push({ rx: rx + dx, ry: ry + dy, k: hashSeed(`${seed}:seed-hunt:v${TALL_TOWERS.seedHunt.version}:${id}:${k}`) });
  }
  return out.sort((a, b) => a.k - b.k || a.ry - b.ry || a.rx - b.rx).map(({ rx, ry }) => ({ rx, ry }));
}
// A weighted draw from `[[name, weight], ...]` by `key` (the seed's kind by the travel seeds' weights; the spot by `where`).
export function huntDraw(key, weights) {
  const list = (weights || []).filter(([, w]) => w > 0), total = list.reduce((n, [, w]) => n + w, 0); if (!total) return null;
  let r = hashSeed(key) % total; for (const [k, w] of list) { if (r < w) return k; r -= w; } return list[0][0];
}
export const seedHuntWeights = (base, seeds) => [...(base || []), ...TALL_TOWERS.seedHunt.rare.filter(([k]) => seeds?.[k] && !(base || []).some(([b]) => b === k))];
export const seedHuntKind = (seed, id, weights) => huntDraw(`${seed}:seed-hunt-kind:v${TALL_TOWERS.seedHunt.version}:${id}`, weights);
// Which kind of spot the hunt's seed lies in, among those the section offers ({ ground, tree, crossing }: true where offered).
export const seedHuntWhere = (seed, id, offered) => huntDraw(`${seed}:seed-hunt-where:v${TALL_TOWERS.seedHunt.version}:${id}`, TALL_TOWERS.seedHunt.where.filter(([k]) => offered[k]));
export const seedHuntPick = (seed, id, what, n) => n > 0 ? hashSeed(`${seed}:seed-hunt-at:v${TALL_TOWERS.seedHunt.version}:${id}:${what}`) % n : -1;
// The live hunts, and the one (if any) aiming at a section.
export const activeSeedHunts = (save) => Object.values(save?.seedHunts || {}).filter((q) => q?.state === "active" && Number.isSafeInteger(q.rx) && Number.isSafeInteger(q.ry));
export const seedHuntAt = (save, rx, ry) => activeSeedHunts(save).filter((q) => q.rx === rx && q.ry === ry).sort((a, b) => (a.tower < b.tower ? -1 : a.tower > b.tower ? 1 : 0));
// The hunt nearest (rx, ry), for the compass; ties by tower id.
export function nearestSeedHunt(save, rx, ry) {
  let best = null, d0 = Infinity; const all = save?.seedHunts; if (!all) return null;
  for (const id in all) { const q = all[id]; if (q?.state !== "active" || !Number.isSafeInteger(q.rx) || !Number.isSafeInteger(q.ry)) continue; const d = Math.max(Math.abs(q.rx - rx), Math.abs(q.ry - ry)); if (d < d0 || (d === d0 && best && q.tower < best.tower)) { best = q; d0 = d; } }
  return best;
}
export const huntHeading = (dx, dy) => `${dy < 0 ? "north" : dy > 0 ? "south" : ""}${dx && dy ? "-" : ""}${dx > 0 ? "east" : dx < 0 ? "west" : ""}` || "here";
export const huntText = (template, vars) => String(template).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
