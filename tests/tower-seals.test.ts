// Tower seals (Tim, 2026-11-06): "For the keeps with courtyards, with the tower in the center... unless you are climbing those
// towers to access a lever or something, you need a key to enter it. So you can't just hop down with the rope, with the drone,
// and then just finish the level by getting on the roof somehow. Sometimes that's okay, but that shouldn't be a way to
// circumvent all the mazes." Compounds from version 2 and Great Castles from version 3 (new ground only): the central tower's
// ways in are sealed until its key, earned deep in the maze; its airspace is closed; a share have a real climb to a lever.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, generatePinnedDungeon } from '../src/game.ts';
import { hashSeed } from '../src/random.ts';
import { canStep, sectionRegion, LANDSCAPE_VERSION, LETHAL_KINDS } from '../src/landscape.ts';
import { exitsOpen } from '../src/keeps.ts';
import { TOWER_SEAL, towerUnsealed, planTowerClimb } from '../src/great-buildings.ts';
import { COMPOUNDS, compoundHere, compoundTopology, placeCompound, generateCompoundFloor, parseCompoundId } from '../src/compounds.ts';
import { CASTLES, castleTopology, castleLayout, quarterSection, placeCastleQuarter, castlePartPlan, generateCastleFloor, castleSeal } from '../src/castles.ts';
import { DRONE_FIZZLE, DRONE_LIFT, droneZoneOf, droneForbiddenAt } from '../src/vehicle-gates.ts';
import { dungeonHistory } from '../src/interactions.ts';

const sha = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const I = (x, y) => y * 32 + x, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Synthetic ground: open grass with a few lakes (so smaller layouts get used too) and lanes at hashed places.
const synth = (seed, rx, ry, flat = false) => { const h = (k) => hashSeed(`${seed}:synth:${rx}:${ry}:${k}`), lakes = flat ? [] : Array.from({ length: h('n') % 4 }, (_, i) => ({ x: h(`lx${i}`) % 32, y: h(`ly${i}`) % 32, r: 1 + h(`lr${i}`) % 5 })), tiles = [];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const wet = lakes.some((l) => Math.hypot(x - l.x, y - l.y) <= l.r) && Math.hypot(x - 16, y - 16) > 4; tiles.push({ x, y, kind: wet ? 'lake' : 'grass', blocked: false, elev: 0 }); }
  return { tiles, landscape: { version: 14 }, exits: { north: 6 + h('en') % 20, south: 6 + h('es') % 20, west: 6 + h('ew') % 20, east: 6 + h('ee') % 20 }, objects: [], enemySpawns: [] }; };
const STYLES = ['keep', 'apartment', 'hive'], SEEDS = ['TIM1', 'SW', 'CORRIDOR-MUHAPQHU', 'Q7', 'DEEPER', 'NIOH'];

// ---------------------------------------------------------------------------------------------------------- the solver
// States: `${sec}|t${k}` (standing on tile k of a section) and `p|${base}` (inside a building part: its floors are joined by
// ladders, as tests/compounds.test.ts and tests/castles.test.ts check). Moves:
//   on foot: a 4-step the landscape allows the Wayfarer (canStep, jumping), never a drop of `fatal` levels or more; plus the stone
//     blocks (building.ts: two stacked, so from buildable ground one may stand 2 higher and jump 1 more);
//   by air (when `air`): from any open tile to any other open tile of the same airspace: the 4-connected tiles that are not in a
//     drone fizzle zone (DRONE_FIZZLE; the glider is held off the same zones), whatever their heights (an over-estimate of the
//     drone's DRONE_LIFT.max and of any glide);
//   doors: a door object (an entrance) on a tile one stands on leads into its part, unless sealed (no key); a part lets you out on
//     each of its exits; the lever, reached from a tile beside it no more than a level under it, gives the key.
const buildable = (t) => !!t && !t.blocked && !t.structure && !t.slope && !t.door && !LETHAL_KINDS.has(t.kind) && !['canyon', 'river', 'dungeonWater', 'seaIce', 'shallows', 'lake'].includes(t.kind);
const me = { isPlayer: true, jumping: true };
function footMoves(m, k) { const x = k % 32, y = (k / 32) | 0, a = m.tiles[k], ea = a.elev || 0, stand = ea + (buildable(a) ? 2 : 0), out = [];
  for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > 31 || ny > 31) continue; const n = I(nx, ny), b = m.tiles[n]; if (!b || b.blocked) continue; const eb = b.elev || 0;
    if (ea - eb >= TOWER_SEAL.climb.fatal) continue; // a fatal drop is no way on
    if (canStep(me, m, 32, x, y, nx, ny) || eb <= stand + 1) out.push(n); }
  return out; }
function airspace(m) { const comp = new Int32Array(1024).fill(-1); let c = 0;
  for (let s = 0; s < 1024; s++) { if (comp[s] >= 0 || droneZoneOf(m.tiles[s])) continue; const q = [s]; comp[s] = c;
    while (q.length) { const k = q.pop(), x = k % 32, y = (k / 32) | 0; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > 31 || ny > 31) continue; const n = I(nx, ny); if (comp[n] < 0 && !droneZoneOf(m.tiles[n])) { comp[n] = c; q.push(n); } } } c++; }
  return comp; }
// world: { maps: { sec: map }, parts: { base: [{ sec, x, y }] (its exits) }, doors: [{ sec, x, y, base, seal }], lever: [{ sec, x, y, elev }], keyPart }
function solve(world, starts, { air = false, key = false } = {}) {
  const seen = new Set(), q = [], push = (s) => { if (!seen.has(s)) { seen.add(s); q.push(s); } };
  const comps = {}; for (const [sec, m] of Object.entries(world.maps)) comps[sec] = airspace(m);
  let haveKey = key, rescanned = key; const airDone = new Set();
  for (const s of starts) push(s);
  for (let i = 0; i < q.length; i++) { const s = q[i];
    if (haveKey && !rescanned) { rescanned = true; for (const t of seen) q.push(t); } // the key opens doors already passed: look again
    if (s.startsWith('p|')) { const base = s.slice(2); if (base === world.keyPart) haveKey = true; for (const e of world.parts[base] || []) push(`${e.sec}|t${I(e.x, e.y)}`); continue; }
    const [sec, ts] = s.split('|'), k = Number(ts.slice(1)), m = world.maps[sec], x = k % 32, y = (k / 32) | 0;
    for (const n of footMoves(m, k)) push(`${sec}|t${n}`);
    for (const d of world.doors) if (d.sec === sec && d.x === x && d.y === y && (!d.seal || haveKey)) push(`p|${d.base}`);
    for (const L of world.lever || []) if (L.sec === sec && Math.max(Math.abs(L.x - x), Math.abs(L.y - y)) <= 1 && (m.tiles[k].elev || 0) >= L.elev - 1) haveKey = true;
    if (air && !droneZoneOf(m.tiles[k])) { const c = comps[sec][k], tag = `${sec}:${c}`; if (!airDone.has(tag)) { airDone.add(tag); for (let n = 0; n < 1024; n++) if (comps[sec][n] === c && !m.tiles[n].blocked) push(`${sec}|t${n}`); } }
    if (haveKey && !rescanned) { rescanned = true; for (const t of seen) q.push(t); }
  }
  return { seen, haveKey };
}
// Every state of `from` can get back to the land (`home`) on foot and through doors, with or without the key as given.
function stranded(world, from, home, key) {
  const back = new Map(); const edge = (a, b) => { if (!back.has(b)) back.set(b, []); back.get(b).push(a); };
  for (const s of from) { if (s.startsWith('p|')) { for (const e of world.parts[s.slice(2)] || []) edge(s, `${e.sec}|t${I(e.x, e.y)}`); continue; }
    const [sec, ts] = s.split('|'), k = Number(ts.slice(1)), m = world.maps[sec], x = k % 32, y = (k / 32) | 0;
    for (const n of footMoves(m, k)) edge(s, `${sec}|t${n}`);
    for (const d of world.doors) if (d.sec === sec && d.x === x && d.y === y && (!d.seal || key)) edge(s, `p|${d.base}`); }
  const ok = new Set(home), q = [...home]; while (q.length) { const s = q.pop(); for (const a of back.get(s) || []) if (!ok.has(a)) { ok.add(a); q.push(a); } }
  return [...from].filter((s) => !ok.has(s));
}
const land = (sec, m) => { const seen = new Set([I(16, 16)]), q = [I(16, 16)]; while (q.length) { const k = q.pop(); for (const n of footMoves(m, k)) { const t = m.tiles[n]; if (!seen.has(n) && !t.greatBuilding && !t.courtyard && !t.causeway) { seen.add(n); q.push(n); } } } return [...seen].map((k) => `${sec}|t${k}`); };

// ---------------------------------------------------------------------------------------------------------- compounds
function compoundWorld(seed, rx, ry, m) {
  const sec = `${rx},${ry}`, doors = [], parts = {}, gb = m.greatBuilding;
  for (const o of m.objects) if (o.compoundDoor) { const base = o.dungeonId.replace(/:f\d+$/, ''), rec = o.buildingDoors; doors.push({ sec, x: o.x, y: o.y, base, seal: o.towerSeal || null, hatch: !!o.roofHatch });
    parts[base] = [...Object.values(rec.exits), ...(rec.hatch && parseCompoundId(o.dungeonId).roof ? [rec.hatch] : [])].map((e) => ({ sec, ...e })); }
  const lever = m.objects.filter((o) => o.kind === 'towerLever').map((o) => ({ sec, x: o.x, y: o.y, elev: o.elev }));
  const T = compoundTopology(seed, rx, ry, gb.style, gb.version), keyPart = T.seal ? doors.find((d) => d.base.includes(`:w${T.seal.wing}:`))?.base : null;
  return { maps: { [sec]: m }, doors, parts, lever, keyPart, sec, T, tower: gb.seal?.base };
}
const placed = []; // [seed, rx, ry, style, map] v2 compounds on synthetic ground
for (const seed of SEEDS) for (let i = 0; i < 160; i++) { const rx = (i % 16) - 8 + (i % 3 ? 20 : 6), ry = Math.floor(i / 16) * 5 - 25, style = STYLES[hashSeed(`${seed}:${rx}:${ry}:style`) % 3], m = synth(seed, rx, ry, i % 7 === 0);
  if (placeCompound(m, seed, rx, ry, { style }, exitsOpen, null, 2)) placed.push([seed, rx, ry, style, m]); }

test('the table: tower seals from compound version 2 and castle version 3; the tower zone closes the air; climbs are ledges one jump apart', () => {
  assert.equal(COMPOUNDS.version, 2); assert.equal(CASTLES.version, 3); assert.equal(TOWER_SEAL.compound, 2); assert.equal(TOWER_SEAL.castle, 3);
  assert.ok(TOWER_SEAL.climb.share > .1 && TOWER_SEAL.climb.share < .2, 'about 15%');
  assert.deepEqual(TOWER_SEAL.climb.ledges.map((e, i, a) => i ? e - a[i - 1] : e), [1, 1, 1, 1], 'each ledge one jump above the last, the first one above the court');
  assert.equal(TOWER_SEAL.climb.ledges.at(-1) + 1, COMPOUNDS.elev, 'the top ledge one jump under the tower top'); assert.equal(COMPOUNDS.elev, CASTLES.roof.elev);
  const Z = DRONE_FIZZLE.zones.find((z) => z.id === 'tower'); assert.ok(Z && Z.message && Z.glide);
  assert.equal(droneZoneOf({ towerAir: true, elev: 5 })?.id, 'tower'); assert.equal(droneZoneOf({ structure: 'buildingRoof', elev: 5 }), null, 'other roofs stay open air');
  assert.ok(DRONE_LIFT.max >= COMPOUNDS.elev, 'without the zone the drone would reach the tower top from the court (the bypass this closes)');
});

test(`solver, compounds: ${placed.length} version-2 compounds over ${SEEDS.length} seeds: key reachable without the tower, the tower with it, never without it (air included), and always a way back out`, (t) => {
  assert.ok(placed.length >= 600, `${placed.length} placed`); const bad = [], tally = { maze: 0, simple: 0, climb: 0, crumbled: 0 };
  for (const [seed, rx, ry, style, m] of placed) { const W = compoundWorld(seed, rx, ry, m), sec = W.sec, home = land(sec, m), tag = `${seed} ${rx},${ry} ${style}`;
    tally[W.T.maze ? 'maze' : 'simple']++; if (m.greatBuilding.seal.climb) tally.climb++;
    // every way into the tower is sealed with its key; the tower's tiles are closed to the air
    const into = W.doors.filter((d) => d.base === W.tower); if (!into.length || !into.every((d) => d.seal && d.seal.base === W.tower && d.seal.key === TOWER_SEAL.key.id)) bad.push(`${tag}: an unsealed way in`);
    if (!into.some((d) => d.hatch)) bad.push(`${tag}: no tower hatch`);
    const towerCells = m.objects.find((o) => o.compound).blocks.find((b) => b.part === 't').cells; if (!towerCells.every((c) => m.tiles[I(c.x, c.y)].towerAir)) bad.push(`${tag}: tower air open`);
    // 1. without the key, by foot, stones, the drone and the glider: never inside the tower; never on its top or a ledge by air
    const noKey = solve({ ...W, lever: [], keyPart: null }, home, { air: true }); if (noKey.seen.has(`p|${W.tower}`)) bad.push(`${tag}: into the tower without the key`);
    const climbTiles = m.tiles.filter((t) => t.towerClimb), Z = new Set([...towerCells.map((c) => I(c.x, c.y)), ...climbTiles.map((t) => I(t.x, t.y))]);
    if (!climbTiles.length && [...Z].some((k) => noKey.seen.has(`${sec}|t${k}`))) bad.push(`${tag}: onto the sealed tower's top`);
    // the climb is the only way up: the tower top and the top ledge are entered only from the climb itself
    for (const k of Z) { const t = m.tiles[k]; if (!t.towerClimb && !towerCells.some((c) => I(c.x, c.y) === k)) continue; if (t.towerClimb && t.elev < TOWER_SEAL.climb.ledges.at(-1)) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = k + dy * 32 + dx, u = m.tiles[n]; if (!u || Z.has(n) || u.blocked) continue; const stand = (u.elev || 0) + (buildable(u) ? 2 : 0);
        if (stand + 1 >= t.elev || ((u.elev || 0) > t.elev && (u.elev || 0) - t.elev < TOWER_SEAL.climb.fatal)) bad.push(`${tag}: ${t.towerClimb ? 'top ledge' : 'tower top'} reached from outside the climb`); } }
    if (climbTiles.length) { tally.crumbled += m.objects.find((o) => o.compound).crumbled.length;
      const L = W.lever[0]; if (!L || m.tiles[I(L.x, L.y)].towerAir !== true) bad.push(`${tag}: lever not on the tower top`);
      const top = climbTiles.find((t) => t.elev === TOWER_SEAL.climb.ledges.at(-1)); if (!top || Math.abs(top.x - L.x) + Math.abs(top.y - L.y) !== 1) bad.push(`${tag}: lever not at the top of the climb`);
      const viaClimb = solve(W, home, { air: true }); if (!viaClimb.haveKey || !viaClimb.seen.has(`p|${W.tower}`)) bad.push(`${tag}: the climb does not reach the lever`);
      const noLedges = solve({ ...W, keyPart: null, maps: { [sec]: { ...m, tiles: m.tiles.map((t) => t.towerClimb ? { ...t, blocked: true } : t) } } }, home, { air: true }); if (noLedges.haveKey && !noLedges.seen.has(`p|${W.keyPart}`)) bad.push(`${tag}: the lever without the climb`); }
    // 2. the key, on foot alone, without the tower
    const walk = solve({ ...W, lever: [] }, home); if (!walk.seen.has(`p|${W.keyPart}`)) bad.push(`${tag}: key wing not reached on foot`);
    if (W.keyPart === W.tower) bad.push(`${tag}: key in the tower`);
    // 3. with it, the tower, on foot
    if (!walk.seen.has(`p|${W.tower}`)) bad.push(`${tag}: tower not reached with the key`);
    // 4. no softlock: from everywhere reached (on foot, with the key; and every tile of the tower and its climb) back to the land on foot
    const all = solve(W, home, { key: true }); const lost = stranded(W, new Set([...all.seen, ...[...Z].map((k) => `${sec}|t${k}`)]), home, true); if (lost.length) bad.push(`${tag}: stranded at ${lost.slice(0, 3)}`);
  }
  assert.deepEqual(bad.slice(0, 20), []); assert.ok(tally.maze > 100 && tally.simple > 50, JSON.stringify(tally));
  const share = tally.climb / placed.length; t.diagnostic(`compounds: ${JSON.stringify(tally)}, climbs ${(share * 100).toFixed(1)}%`); assert.ok(share > .08 && share < .2, `climbs ${(share * 100).toFixed(1)}% (${JSON.stringify(tally)})`);
});

test('compounds, inside: the key lies on an inner floor of the key wing (the middle of three in a maze, the top in a simple one), reachable, with its warden; no key anywhere else', () => {
  const bad = []; let keys = 0;
  for (const [seed, rx, ry, style] of placed.slice(0, 260)) { const T = compoundTopology(seed, rx, ry, style, 2);
    for (const p of T.parts) { const base = `compound:${seed}:${rx}:${ry}:${style}:${p.part}:${p.floors}${p.hatch ? 'r' : ''}`;
      for (let f = 1; f <= p.floors; f++) for (const iv of [1, 2]) { const m = generateCompoundFloor(seed, `${base}:f${f}`, iv, 2), k = m.objects.filter((o) => o.kind === 'labKey'), want = p.part === `w${T.seal.wing}` && f === T.seal.floor;
        if (k.length !== (want ? 1 : 0)) { bad.push(`${base} f${f}: ${k.length} keys`); continue; } if (!want) continue; keys++;
        if (T.maze ? !(f > 1 && f < p.floors) : f !== p.floors) bad.push(`${base}: key floor ${f}`);
        if (!T.maze && p.hatch) bad.push(`${base}: a simple compound's key wing has a hatch`);
        const W = m.width, start = f === 1 ? m.entry : m.objects.find((o) => o.dir === 'down'), q = [start], reach = new Set([start.y * W + start.x]);
        while (q.length) { const c = q.pop(); for (const [dx, dy] of N4) { const x = c.x + dx, y = c.y + dy, n = y * W + x, t = m.tiles[n]; if (!t || reach.has(n) || t.blocked || t.hole) continue; reach.add(n); q.push({ x, y }); } }
        if (!reach.has(k[0].y * W + k[0].x)) bad.push(`${base} f${f}: key cut off`);
        if (!m.enemySpawns.some((e) => e.keyKeeper && e.buildingGuardian && Math.hypot(e.x - k[0].x, e.y - k[0].y) <= 3.01)) bad.push(`${base}: no warden`);
        if (k[0].keyBase !== `compound:${seed}:${rx}:${ry}:${style}:t:${T.tower.floors}r`) bad.push(`${base}: kept on the wrong history`); } } }
  assert.deepEqual(bad.slice(0, 10), []); assert.ok(keys >= 400, `${keys}`);
});

// ---------------------------------------------------------------------------------------------------------- castles
function castleWorld(seed, X, Y, V = 3) {
  const T = castleTopology(seed, X, Y), maps = {}, doors = [], parts = {}, lever = [];
  for (let q = 0; q < 4; q++) { const s = quarterSection(X, Y, q), sec = `${s.rx},${s.ry}`, m = synth(seed, s.rx, s.ry, true); placeCastleQuarter(m, seed, X, Y, q, V); maps[sec] = m;
    for (const o of m.objects) { if (o.castleDoor) doors.push({ sec, x: o.x, y: o.y, base: o.dungeonId.replace(/:f\d+$/, ''), seal: o.towerSeal || null }); if (o.kind === 'towerLever') lever.push({ sec, x: o.x, y: o.y, elev: o.elev }); } }
  for (const base of new Set(doors.map((d) => d.base))) { const P = castlePartPlan(base, 2); parts[base] = [...P.doors.map((d) => ({ sec: `${d.to.rx},${d.to.ry}`, x: d.to.x, y: d.to.y })), ...(P.keep ? [{ sec: `${P.gate.rx},${P.gate.ry}`, x: P.gate.x, y: P.gate.y }] : [])]; }
  const seal = castleSeal(seed, X, Y, V), keyPart = seal ? doors.find((d) => d.base.includes(`:w${seal.wing}:`))?.base : null;
  return { maps, doors, parts, lever, keyPart, tower: doors.find((d) => /:k:\d+$/.test(d.base)).base, T, seal };
}
const corners = []; for (const seed of SEEDS) for (let i = 0; i < 50; i++) corners.push([seed, ((i % 10) - 5) * 3 + 21, (Math.floor(i / 10) - 3) * 3]);

test(`solver, castles: ${corners.length} version-3 castles: the Keep Key in the maze, the keep with it, never without it (air included), the climb the only other way, and always a way back out`, (t) => {
  const bad = []; let climbs = 0;
  for (const [seed, X, Y] of corners) { const W = castleWorld(seed, X, Y), tag = `${seed} ${X},${Y}`, kq = quarterSection(X, Y, W.T.k), ksec = `${kq.rx},${kq.ry}`;
    const home = Object.entries(W.maps).flatMap(([sec, m]) => land(sec, m));
    if (!W.doors.filter((d) => d.base === W.tower).every((d) => d.seal && d.seal.base === W.tower)) bad.push(`${tag}: keep unsealed`);
    if (W.lever.length) climbs++;
    const noKey = solve({ ...W, lever: [], keyPart: null }, home, { air: true }); if (noKey.seen.has(`p|${W.tower}`)) bad.push(`${tag}: into the keep without the key`);
    const walk = solve({ ...W, lever: [] }, home); if (!walk.seen.has(`p|${W.keyPart}`)) bad.push(`${tag}: key wing not reached`); if (!walk.seen.has(`p|${W.tower}`)) bad.push(`${tag}: keep not reached with the key`);
    // the keep's court is reached only through the maze, even by air (its walls fizzle the drone and turn the glider away)
    const court = W.maps[ksec].tiles.filter((t) => t.courtyard).map((t) => `${ksec}|t${I(t.x, t.y)}`), byAir = solve({ ...W, keyPart: null, doors: W.doors.filter((d) => !d.base.includes(`:w${W.T.b}:`)), lever: [] }, home, { air: true });
    if (court.some((s) => byAir.seen.has(s))) bad.push(`${tag}: into the keep's court round the maze`);
    if (W.lever.length) { const m = W.maps[ksec], noLedges = solve({ ...W, keyPart: null, maps: { ...W.maps, [ksec]: { ...m, tiles: m.tiles.map((t) => t.towerClimb ? { ...t, blocked: true } : t) } } }, home, { air: true }); if (noLedges.haveKey && !noLedges.seen.has(`p|${W.keyPart}`)) bad.push(`${tag}: lever without the climb`);
      const via = solve({ ...W, doors: W.doors }, home, { air: true }); if (!via.haveKey) bad.push(`${tag}: climb does not reach the lever`); }
    const all = solve(W, home, { key: true }), extra = W.lever.length ? W.maps[ksec].tiles.filter((t) => t.towerAir).map((t) => `${ksec}|t${I(t.x, t.y)}`) : [];
    const lost = stranded(W, new Set([...all.seen, ...extra]), home, true); if (lost.length) bad.push(`${tag}: stranded ${lost.slice(0, 3)}`);
    // the key lies on the top floor of the wing between, with its warden
    const b = W.T.wings[W.T.b], f = generateCastleFloor(seed, `castle:${seed}:${X}:${Y}:w${W.T.b}:${b.floors}:f${b.floors}`, 2, 3), k = f.objects.find((o) => o.kind === 'labKey');
    if (!k || k.keyBase !== W.tower || !f.enemySpawns.some((e) => e.keyKeeper)) bad.push(`${tag}: no Keep Key with its warden`);
    for (const w of W.T.wings) for (let fl = 1; fl <= w.floors; fl++) if ((w.q !== W.T.b || fl !== w.floors) && generateCastleFloor(seed, `castle:${seed}:${X}:${Y}:w${w.q}:${w.floors}:f${fl}`, 2, 3).objects.some((o) => o.kind === 'labKey')) bad.push(`${tag}: a stray key`); }
  assert.deepEqual(bad.slice(0, 20), []); const share = climbs / corners.length; t.diagnostic(`castles: ${climbs} climbs of ${corners.length} (${(share * 100).toFixed(1)}%)`); assert.ok(share > .05 && share < .25, `castle climbs ${(share * 100).toFixed(1)}%`);
});

// ---------------------------------------------------------------------------------------------------------- old versions
test('old versions regenerate byte for byte: version-1 compounds and version-1/2 castles, outside and in (gold hashes from release 786)', () => {
  const parts = []; let n = 0;
  for (const seed of ['TIM1', 'SW', 'CORRIDOR-MUHAPQHU']) for (let i = 0; i < 40; i++) { const rx = (i % 9) - 4 + 7, ry = Math.floor(i / 9) * 3 - 6, style = STYLES[hashSeed(`${seed}:${rx}:${ry}`) % 3], m = synth(seed, rx, ry);
    if (placeCompound(m, seed, rx, ry, { style }, exitsOpen)) n++; parts.push(sha([m.tiles, m.objects, m.enemySpawns, m.greatBuilding || null]));
    const T = compoundTopology(seed, rx, ry, style); if (i % 4 === 0) for (const p of T.parts) for (const iv of [1, 2]) { const base = `compound:${seed}:${rx}:${ry}:${style}:${p.part}:${p.floors}${p.hatch ? 'r' : ''}`; for (let f = 1; f <= p.floors; f++) parts.push(sha(generateCompoundFloor(seed, `${base}:f${f}`, iv))); } }
  assert.equal(n, 109); assert.equal(sha(parts), 'd56b993025e0b186', 'compounds, version 1');
  const cp = [];
  for (const seed of ['TIM1', 'SW', 'CORRIDOR-MUHAPQHU']) for (let i = 0; i < 12; i++) { const X = (i % 4) * 3 + 9, Y = Math.floor(i / 4) * 3 - 3;
    for (const V of [1, 2]) for (let q = 0; q < 4; q++) { const m = synth(seed, X * 10 + q, Y); placeCastleQuarter(m, seed, X, Y, q, V); cp.push(sha([V, m.tiles, m.objects, m.enemySpawns, m.greatBuilding || null])); }
    const T = castleTopology(seed, X, Y); if (i % 3 === 0) for (const p of [...T.wings, T.keep]) for (const iv of [1, 2]) { const base = `castle:${seed}:${X}:${Y}:${p.part}:${p.floors}`; for (let f = 1; f <= p.floors; f++) cp.push(sha(generateCastleFloor(seed, `${base}:f${f}`, iv))); } }
  assert.equal(sha(cp), 'acf200acfaca392d', 'castles, versions 1 and 2');
  // and the version arguments default to the old behaviour
  assert.equal(compoundTopology('TIM1', 9, 2, 'keep').seal, undefined); assert.equal(castleSeal('TIM1', 9, 3, 2), null);
});

test('generation cost: version 2 placement stays within a small factor of version 1 (and the climb search is bounded)', (t) => {
  const maps = placed.slice(0, 120).map(([seed, rx, ry, style]) => [seed, rx, ry, style]), time = (V) => { const t0 = performance.now(); for (const [seed, rx, ry, style] of maps) placeCompound(synth(seed, rx, ry), seed, rx, ry, { style }, exitsOpen, null, V); return performance.now() - t0; };
  time(1); time(2); const v1 = time(1), v2 = time(2), c2 = (() => { const t0 = performance.now(); for (const [seed, X, Y] of corners.slice(0, 60)) for (let q = 0; q < 4; q++) placeCastleQuarter(synth(seed, X, q), seed, X, Y, q, 2); return performance.now() - t0; })(), c3 = (() => { const t0 = performance.now(); for (const [seed, X, Y] of corners.slice(0, 60)) for (let q = 0; q < 4; q++) placeCastleQuarter(synth(seed, X, q), seed, X, Y, q, 3); return performance.now() - t0; })();
  t.diagnostic(`compounds: v1 ${(v1 / maps.length).toFixed(3)} ms, v2 ${(v2 / maps.length).toFixed(3)} ms a section; castle quarters: v2 ${(c2 / 240).toFixed(3)} ms, v3 ${(c3 / 240).toFixed(3)} ms`);
  assert.ok(v2 < v1 * 2 + 30, `compounds ${v1.toFixed(1)} → ${v2.toFixed(1)} ms`); assert.ok(c3 < c2 * 2 + 30, `castles ${c2.toFixed(1)} → ${c3.toFixed(1)} ms`);
  // the search is bounded: a court with no room tries at most `climb.tries` chains and gives up
  const m = synth('X', 0, 0, true), tower = [{ x: 10, y: 10 }], court = [{ x: 9, y: 10 }, { x: 11, y: 10 }]; assert.equal(planTowerClimb(m, tower, court, [], [], 'k'), null);
});

// ---------------------------------------------------------------------------------------------------------- in the game
const SEED = 'TIM1';
const visit = (rx, ry, save = null) => { const s = save || freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
const act = (g, o, a) => { g.player.x = o.x; g.player.y = o.y; return g.interact(a, o.id); };
const memo = {};
// a maze compound without a climb, or any compound with one (version 2, new ground)
const findCompound = (climb) => memo[`c${climb}`] ||= (() => { for (let d = COMPOUNDS.minRing; d < 30; d++) for (let x = -d; x <= d; x++) for (const y of [d - Math.abs(x), Math.abs(x) - d]) { const p = compoundHere(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION)), T = p && compoundTopology(SEED, x, y, p.style, 2); if (!T || T.seal.climb !== climb || (!climb && !T.maze)) continue; const gb = visit(x, y).map.greatBuilding; if (gb?.compound && gb.seal && !!gb.seal.climb === climb) return { x, y }; } return null; })();

test('in the game: a new compound\'s tower is sealed at its courtyard door and its hatch; the drone fizzles over it; the key, taken on the way down the maze, opens it for good (through a save)', () => {
  const at = findCompound(false), g = visit(at.x, at.y), seal = g.map.greatBuilding.seal; assert.ok(seal && !seal.climb);
  assert.equal(g.save.atlas[`${at.x},${at.y}`].compoundVersion, 2, 'pinned on new ground');
  const tdoor = g.map.objects.find((o) => o.compoundDoor && o.towerSeal && o.enterAt === 'court'), hatch = g.map.objects.find((o) => o.compoundDoor && o.towerSeal && o.roofHatch);
  let r = act(g, tdoor, 'enter'); assert.ok(!r.ok && r.sealed, r.message); assert.match(r.message, /Tower Key|Keycard|Sigil/); assert.equal(g.area, 'overworld');
  const tc = g.map.objects.find((o) => o.compound).blocks.find((b) => b.part === 't').cells[0]; assert.equal(droneForbiddenAt(g.map, 32, tc.x, tc.y)?.id, 'tower', 'the drone fizzles over the tower');
  g.player.x = hatch.x; g.player.y = hatch.y; r = g.interact(null, hatch.id); assert.ok(!r.ok && r.sealed, 'the hatch is sealed too');
  // the way through: in by the outer door, up, along the wall walk, down the key wing (the key on its middle floor), into the court
  const od = g.map.objects.find((o) => o.compoundDoor && o.enterAt === 'outer'); assert.ok(act(g, od, 'enter').ok);
  for (let i = 0; i < 8; i++) { const up = g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'up'); if (!up) break; assert.ok(act(g, up, 'climb').ok); }
  assert.ok(act(g, g.map.objects.find((o) => o.dir === 'roof'), 'climb').ok); assert.equal(g.area, 'overworld');
  const T = compoundTopology(SEED, at.x, at.y, g.map.greatBuilding.style, 2), kh = g.map.objects.find((o) => o.roofHatch && o.id.includes(`-w${T.seal.wing}-`)); assert.ok(act(g, kh, 'enter').ok);
  let key = null; for (let i = 0; i < 8 && !key; i++) { key = g.map.objects.find((o) => o.kind === 'labKey'); if (!key) assert.ok(act(g, g.map.objects.find((o) => o.dir === 'down'), 'descend').ok); }
  assert.ok(key, 'the key on the way down'); assert.equal(g.map.building.floor, T.seal.floor); const floorId = g.areaId();
  r = act(g, key, 'take'); assert.ok(r.ok, r.message); assert.ok(towerUnsealed(g.save, tdoor.towerSeal)); assert.ok(!g.map.objects.some((o) => o.kind === 'labKey'), 'gone');
  assert.ok(!generatePinnedDungeon(g.save, floorId).objects.some((o) => o.kind === 'labKey'), 'never laid again');
  while (g.map.objects.some((o) => o.dir === 'down')) assert.ok(act(g, g.map.objects.find((o) => o.dir === 'down'), 'descend').ok);
  assert.ok(act(g, g.map.objects.find((o) => o.id === 'building-exit-court'), 'exit').ok); assert.ok(g.map.tiles[Math.round(g.player.y) * 32 + Math.round(g.player.x)].courtyard, 'in the courtyard');
  const s2 = migrateSave(JSON.parse(JSON.stringify(g.save))), g2 = visit(at.x, at.y, s2), d2 = g2.map.objects.find((o) => o.id === tdoor.id); r = act(g2, d2, 'enter'); assert.ok(r.ok, r.message); assert.equal(g2.map.building.part, 't');
  assert.equal((s2.consequences.dungeons[`${tdoor.towerSeal.base}:f1`].labKeys || []).length, 1, 'one key, kept once');
});

test('in the game: a tower with a climb: the lever answers only from the top of the climb; pulled, it unseals the tower as the key does, and stays pulled', () => {
  const at = findCompound(true); assert.ok(at, 'a compound with a climb'); const g = visit(at.x, at.y), lever = g.map.objects.find((o) => o.kind === 'towerLever'), sign = g.map.objects.find((o) => o.towerClimbSign);
  assert.ok(lever && sign, 'the lever and the sign at the climb\'s foot'); assert.equal(g.map.tiles[I(sign.x, sign.y)].courtyard, true);
  const ledges = g.map.tiles.filter((t) => t.towerClimb).sort((a, b) => a.elev - b.elev); assert.deepEqual(ledges.map((t) => t.elev), TOWER_SEAL.climb.ledges);
  for (const t of ledges) assert.equal(droneForbiddenAt(g.map, 32, t.x, t.y)?.id, 'tower', 'the climb is closed to the air');
  // from the court below: out of reach
  const below = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => g.map.tiles[I(lever.x + dx, lever.y + dy)]).find((t) => t?.courtyard);
  if (below) { g.player.x = below.x; g.player.y = below.y; const r = g.interact('pull', lever.id); assert.ok(!r.ok, 'not from the court'); }
  const top = ledges.at(-1); g.player.x = top.x; g.player.y = top.y; const r = g.interact('pull', lever.id); assert.ok(r.ok, r.message); assert.equal(lever.state, 'pulled');
  const door = g.map.objects.find((o) => o.towerSeal && o.compoundDoor && o.enterAt === 'court'); assert.ok(towerUnsealed(g.save, door.towerSeal));
  assert.equal(g.map.objects.find((o) => o.compound).lever.state, 'pulled', 'drawn pulled');
  const g2 = visit(at.x, at.y, migrateSave(JSON.parse(JSON.stringify(g.save)))); assert.equal(g2.map.objects.find((o) => o.kind === 'towerLever').state, 'pulled', 'stays pulled');
  assert.ok(act(g2, g2.map.objects.find((o) => o.id === door.id), 'enter').ok, 'the tower opens');
});

test('in the game: a new castle\'s keep wants the Keep Key, which lies with its warden on the top floor of the wing between', () => {
  const g0 = visit(0, 0); let c = null; for (let d = 3; d < 60 && !c; d += 3) for (let X = -d; X <= d && !c; X += 3) for (const Y of [d - Math.abs(X), Math.abs(X) - d]) if (g0.castleHere(X, Y)) { c = { X, Y }; break; }
  const T = castleTopology(SEED, c.X, c.Y), ks = quarterSection(c.X, c.Y, T.k), g = visit(ks.rx, ks.ry), kd = g.map.objects.find((o) => o.castleDoor && o.dungeonId.includes(':k:'));
  assert.ok(kd.towerSeal); const r = act(g, kd, 'enter'); assert.ok(!r.ok && r.sealed); assert.match(r.message, /Keep Key/);
  const b = T.wings[T.b], id = `castle:${SEED}:${c.X}:${c.Y}:w${T.b}:${b.floors}:f${b.floors}`; g.save.session.activeDungeonId = id; g.save.session.dungeonReturn = { rx: ks.rx, ry: ks.ry, x: kd.x, y: kd.y };
  g.loadArea('dungeon'); const key = g.map.objects.find((o) => o.kind === 'labKey'); assert.ok(key && key.name === 'Keep Key'); assert.ok(g.enemies.some((e) => e.packName === TOWER_SEAL.keeper.name), 'its warden');
  assert.ok(act(g, key, 'take').ok); assert.ok(towerUnsealed(g.save, kd.towerSeal));
  const g2 = visit(ks.rx, ks.ry, g.save); assert.ok(act(g2, g2.map.objects.find((o) => o.id === kd.id), 'enter').ok, 'the keep opens');
});

test('old ground keeps its open tower: a section pinned to compound version 1 has no seals, no tower air, no key', () => {
  const at = findCompound(false), first = visit(at.x, at.y), s = freshSave(); s.seed = SEED; s.atlas = { [`${at.x},${at.y}`]: { ...first.save.atlas[`${at.x},${at.y}`], compoundVersion: 1 } };
  const g = visit(at.x, at.y, s); assert.equal(g.map.greatBuilding.version, 1); assert.ok(!g.map.objects.some((o) => o.towerSeal || o.kind === 'towerLever')); assert.ok(!g.map.tiles.some((t) => t.towerAir || t.towerClimb));
  const td = g.map.objects.find((o) => o.compoundDoor && /:t:/.test(o.dungeonId) && o.enterAt === 'court'); if (td) assert.ok(act(g, td, 'enter').ok, 'walks straight in, as before');
});
