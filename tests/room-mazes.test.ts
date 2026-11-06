// Room mazes (Tim, 2026-11-06): labyrinths of rooms over four floors, joined by doorways, corridors, stairs and ladders, where
// what the ground floor cannot cross (holes, lava, a chasm, a collapsed hall, a barred door) is crossed on another floor: over
// it on the upper floor or the roof, or under it in the undercroft, up a ladder in a far corner of the cut-off ground.
// The solver below walks the whole multi-floor graph as a player with base movement would (no robot, no Tidemantle, no Aerial
// Step): walking, every stair and ladder both ways, the green-rimmed drops (one way down), and barred doors that open only from
// their far side. It proves, over thousands of mazes, that the vault is reachable, that nothing reachable strands you (every
// tile you can reach can walk back to the front door, at every stage of doors opened), and that each barrier cannot be crossed
// on any floor but the one its crossing is on, even with a generous jump.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { buildingArrival } from '../src/great-buildings.ts';
import { sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { LABYRINTHS, ROOM_MAZES, roomMazePlan, roomFloorOf, generateLabyrinthChamber, generateRoomMazeFloor, parseLabyrinthId, isLabyrinthId, labyrinthForm, roomVaultOf, labyrinthHere, labyrinthPlan, placeLabyrinth, holeDrops, safeDropAt } from '../src/labyrinths.ts';

const LETHAL = new Set(['canyon', 'river', 'dungeonWater', 'lava', 'abyss', 'deepWater', 'deepOcean', 'ocean', 'lakeWater']);
const STYLES = ['keep', 'apartment', 'hive'];
const baseOf = (i, tag = 'R', v = ROOM_MAZES.version) => `labyrinth:${tag}${i}:${(i * 7) % 23 - 11}:${(i * 5) % 19 - 9}:${STYLES[i % 3]}~r${v}`;
const F = roomFloorOf(ROOM_MAZES.levels[1]);
const floorsOf = (base) => { const seed = parseLabyrinthId(`${base}:f1`).seed; return Array.from({ length: F }, (_, i) => generateLabyrinthChamber(seed, `${base}:f${i + 1}`)); };

// ------------------------------------------------------------------------------------------------ the solver
function solve(base) {
  const maps = floorsOf(base), W = maps[0].width, H = maps[0].height, WH = W * H, N = WH * F;
  for (const m of maps) assert.ok(m.width === W && m.height === H, 'every floor stands over the same footprint');
  const fOf = (id) => Number(id.match(/:f(\d+)$/)[1]) - 1;
  const gates = maps.flatMap((m, f) => m.objects.filter((o) => o.kind === 'labGate').map((o) => ({ f, o })));
  const walk = (open, f, x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return false; const t = maps[f].tiles[y * W + x]; if (!t) return false;
    if (t.gate) return open.has(`${f}:${x},${y}`); return !t.blocked && !t.hole && !LETHAL.has(t.kind) && !t.environment; };
  // an object is used from any tile within reach (game.ts interact: reachOf < 1.5)
  const near = (o) => { const out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push([o.x + dx, o.y + dy]); return out; };
  const edges = (open) => { const fw = Array.from({ length: N }, () => []);
    for (let f = 0; f < F; f++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!walk(open, f, x, y)) continue; const k = f * WH + y * W + x;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (walk(open, f, x + dx, y + dy)) fw[k].push(f * WH + (y + dy) * W + x + dx);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, t = maps[f].tiles[ny * W + nx]; // a step into a safe drop: one way down, onto the same spot
        if (t?.hole && safeDropAt(maps[f], nx, ny)) { assert.ok(f > 0, 'a drop has a floor below'); assert.ok(walk(open, f - 1, nx, ny), `${base}: a drop lands on open floor`); fw[k].push((f - 1) * WH + ny * W + nx); } } }
    for (let f = 0; f < F; f++) for (const o of maps[f].objects) { if (o.kind !== 'buildingStair') continue; const tf = fOf(o.toId), at = buildingArrival(maps[tf], o.toX, o.toY);
      assert.ok(walk(open, tf, at.x, at.y), `${base}: ${o.name} arrives on open floor`); for (const [x, y] of near(o)) if (walk(open, f, x, y)) fw[f * WH + y * W + x].push(tf * WH + at.y * W + at.x); }
    return fw; };
  const bfs = (adj, starts) => { const seen = new Uint8Array(N), q = [...starts]; for (const s of q) seen[s] = 1; for (let i = 0; i < q.length; i++) for (const n of adj[q[i]]) if (!seen[n]) { seen[n] = 1; q.push(n); } return seen; };
  const reverse = (fw) => { const rv = Array.from({ length: N }, () => []); fw.forEach((ns, k) => { for (const n of ns) rv[n].push(k); }); return rv; };
  const ground = roomFloorOf(0) - 1, entry = maps[ground].entry, start = ground * WH + entry.y * W + entry.x;
  assert.ok(walk(new Set(), ground, entry.x, entry.y), 'the front door opens onto floor');
  // stages: doors opened from the far side open for good; each stage's reachable ground must lead back to the front door
  const open = new Set(), stages = []; let seen;
  for (let guard = 0; guard < 8; guard++) { const fw = edges(open); seen = bfs(fw, [start]); const back = bfs(reverse(fw), [start]);
    let strand = -1; for (let k = 0; k < N; k++) if (seen[k] && !back[k]) { strand = k; break; }
    stages.push({ open: open.size, strand: strand < 0 ? null : { f: Math.floor(strand / WH), x: strand % W, y: Math.floor((strand % WH) / W) } });
    let more = false; for (const { f, o } of gates) { const key = `${f}:${o.x},${o.y}`; if (open.has(key)) continue; if ([[o.x + 1, o.y]].some(([x, y]) => seen[f * WH + y * W + x])) { open.add(key); more = true; } }
    if (!more) break; }
  const reached = (f, x, y) => !!seen[f * WH + y * W + x], usable = (f, o) => near(o).some(([x, y]) => x >= 0 && y >= 0 && x < W && y < H && reached(f, x, y));
  return { maps, W, H, reached, usable, stages, gates, open };
}
// A floor on its own, from every open tile west of a barrier, with a generous jump (up to ROOM_MAZES.jump hazard tiles in a
// straight line, any of eight ways, landing on open floor): does any open tile east of it come within reach?
function crossesOnFloor(m, b) {
  const W = m.width, H = m.height, J = ROOM_MAZES.jump, ok = (x, y) => { const t = x >= 0 && y >= 0 && x < W && y < H ? m.tiles[y * W + x] : null; return !!t && !t.blocked && !t.hole && !LETHAL.has(t.kind) && !t.environment; };
  const pass = (x, y) => { const t = x >= 0 && y >= 0 && x < W && y < H ? m.tiles[y * W + x] : null; return !!t && !t.blocked; }; // a jump passes over holes and lava, never through walls
  const seen = new Uint8Array(W * H), q = []; for (let y = 0; y < H; y++) for (let x = 0; x < b.x0; x++) if (ok(x, y)) { seen[y * W + x] = 1; q.push(y * W + x); }
  for (let i = 0; i < q.length; i++) { const x0 = q[i] % W, y0 = (q[i] / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let s = 1; s <= J + 1; s++) { const x = x0 + dx * s, y = y0 + dy * s; if (!pass(x, y)) break;
      if (ok(x, y)) { const k = y * W + x; if (!seen[k]) { seen[k] = 1; q.push(k); } break; } } }
  for (let y = 0; y < H; y++) for (let x = b.x1 + 1; x < W; x++) if (seen[y * W + x] && ok(x, y)) return true;
  return false;
}
const crossLevel = { upper: 1, roof: 2, under: -1 };

// ------------------------------------------------------------------------------------------------ the proof
const MAZES = Number(process.env.ROOM_MAZE_PROOF) || 1200; // ROOM_MAZE_PROOF=5000 for a longer run
function proof(version, MAZES) {
  const bad = [], tally = { crossings: {}, obstacles: {}, rooms: 0, floors: 0, deadEnds: 0, drops: 0, gates: 0, loops: 0, caches: 0, maxRooms: 0, maxTiles: 0, vaults: { roof: 0, ground: 0, under: 0 }, known: 0 };
  for (let i = 0; i < MAZES; i++) { const base = baseOf(i, 'R', version), P = roomMazePlan(base), S = solve(base), { maps, reached, usable } = S;
    const g = roomFloorOf(0) - 1, vf = maps.findIndex((m) => m.building.vault), vaultMap = maps[vf], chest = vaultMap?.objects.find((o) => o.id === 'building-cache'), out = vaultMap?.objects.find((o) => o.id === 'building-exit-vault');
    if (maps.filter((m) => m.building.vault).length !== 1) bad.push(`${base}: not one vault floor`);
    tally.vaults[{ 2: 'roof', 0: 'ground', [-1]: 'under' }[vf + ROOM_MAZES.levels[0]]]++; if (P.vaultPlace?.known) tally.known++;
    if (version >= 2) { const want = ROOM_MAZES.vault.levels[P.vaultPlace.place]; if (vaultMap.building.level !== want) bad.push(`${base}: the vault is not where its name says`); if (!vaultMap.building.vaultLine) bad.push(`${base}: no vault line`); }
    else if (vf !== g) bad.push(`${base}: generator 1 puts the vault on the ground`);
    // the vault lies beyond every barrier (in the last segment), so the way to it needs every crossing (each only on its own floor, below)
    if (chest && !(chest.x > Math.max(...maps[g].building.barriers.map((b) => b.x1)))) bad.push(`${base}: the vault short of the last barrier`);
    if (!chest || !usable(vf, chest)) bad.push(`${base}: the vault's treasure out of reach`);
    if (!out || !usable(vf, out)) bad.push(`${base}: the vault's way out out of reach`);
    if (!vaultMap.enemySpawns.some((e) => e.buildingGuardian)) bad.push(`${base}: no guardian in the vault`);
    maps.forEach((m, f) => { for (const o of m.objects) if (!usable(f, o)) bad.push(`${base} f${f + 1}: ${o.kind} ${o.name} out of reach`);
      for (const e of m.enemySpawns) if (!reached(f, e.x, e.y)) bad.push(`${base} f${f + 1}: a creature out of reach`);
      if (m.building.roofSpot && !reached(f, m.building.roofSpot.x, m.building.roofSpot.y)) bad.push(`${base}: the roof exit's spot out of reach`);
      const open = m.tiles.filter((t) => !t.blocked && !t.hole).length; if (open && !m.tiles.some((t, k) => !t.blocked && !t.hole && !t.environment && reached(f, k % m.width, (k / m.width) | 0))) bad.push(`${base} f${f + 1}: a floor with rooms no one can reach`); });
    for (const st of S.stages) if (st.strand) bad.push(`${base}: stranded at f${st.strand.f + 1} ${st.strand.x},${st.strand.y} (doors open ${st.open})`);
    for (const b of maps[0].building.barriers) for (let f = 0; f < F; f++) { const L = f + ROOM_MAZES.levels[0], crosses = crossesOnFloor(maps[f], b), should = crossLevel[b.crossing] === L;
      if (crosses !== should) bad.push(`${base}: ${b.obstacle} barrier ${should ? 'not crossed' : 'crossed'} on level ${L}`); }
    for (const b of P.barriers) { const far = maps[g].tiles.findIndex((t, k) => (k % P.W) > P.xs[b.col] + P.wi[b.col] - 1 && !t.blocked && !t.hole && !t.environment);
      if (far < 0 || !reached(g, far % P.W, (far / P.W) | 0)) bad.push(`${base}: the ground beyond a barrier never reached`); tally.crossings[b.crossing] = (tally.crossings[b.crossing] || 0) + 1; tally.obstacles[b.obstacle] = (tally.obstacles[b.obstacle] || 0) + 1; }
    // the way weaves: the ground floor alone never reaches the vault
    if (vf === g) { const m = maps[g], W = m.width, seen = new Uint8Array(m.tiles.length), q = [m.entry.y * W + m.entry.x]; seen[q[0]] = 1;
      for (let j = 0; j < q.length; j++) { const x = q[j] % W, y = (q[j] / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (y + dy) * W + x + dx, t = m.tiles[n]; if (t && !seen[n] && !t.blocked && !t.hole && !t.environment) { seen[n] = 1; q.push(n); } } }
      if (seen[chest.y * W + chest.x] || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(chest.y + dy) * W + chest.x + dx])) bad.push(`${base}: the vault reached without leaving the ground floor`); }
    for (const z of P.zones.values()) { tally.rooms += z.rooms.size; for (const q of z.rooms.values()) { if (q.dead) tally.deadEnds++; if (q.cache) tally.caches++; } }
    tally.loops += P.stairs.filter((s) => s.extra).length; tally.drops += P.drops.length; tally.gates += S.gates.length; tally.floors += maps.filter((m) => m.objects.length || m.tiles.some((t) => !t.blocked)).length;
    tally.maxRooms = Math.max(tally.maxRooms, [...P.zones.values()].reduce((a, z) => a + z.rooms.size, 0)); tally.maxTiles = Math.max(tally.maxTiles, P.W * P.H); }
  assert.deepEqual(bad.slice(0, 20), []);
  return tally; }
test(`room mazes are solvable (generator ${ROOM_MAZES.version}): over ${MAZES} mazes the vault, on whichever floor its name says, is reached from the front door with base movement, nothing reachable strands you, and every barrier is crossed only on its crossing's floor`, () => {
  const tally = proof(ROOM_MAZES.version, MAZES);
  console.log(`# vaults: ${JSON.stringify(tally.vaults)} of ${MAZES}; known ${tally.known}`);
  for (const k of ['roof', 'ground', 'under']) assert.ok(tally.vaults[k] > MAZES * .2, `${k} vaults: ${tally.vaults[k]}`);
  assert.ok(Math.abs(tally.known / MAZES - (1 - ROOM_MAZES.vault.unknown)) < .04, `the rule kept: ${tally.known}`);
  for (const k of ['upper', 'roof', 'under']) assert.ok(tally.crossings[k] > MAZES * .15, `${k} crossings: ${tally.crossings[k]}`);
  for (const k of Object.keys(ROOM_MAZES.obstacles)) assert.ok(tally.obstacles[k] > MAZES * .08, `${k} barriers: ${tally.obstacles[k]}`);
  assert.ok(tally.deadEnds > MAZES * 2, `dead ends: ${tally.deadEnds}`); assert.ok(tally.drops > MAZES * .5, `drops: ${tally.drops}`); assert.ok(tally.loops > MAZES * .5, `second stairs: ${tally.loops}`); assert.ok(tally.caches > MAZES, `caches: ${tally.caches}`);
  // bounded for mobile: rooms, floors and tiles a floor
  assert.ok(tally.maxRooms <= ROOM_MAZES.cols[1] * ROOM_MAZES.rows[1] * F, `rooms ≤ ${tally.maxRooms}`); assert.ok(tally.maxTiles <= 47 * 29, `tiles a floor ${tally.maxTiles}`);
});
test('room mazes of generator 1 (released in 784) still prove out: every vault on the ground beyond the last barrier', () => {
  const tally = proof(1, 400); assert.equal(tally.vaults.ground, 400); assert.equal(tally.known, 0);
});

test('the barriers are impassable on their own floor: wider than any jump, holes and lava kill (no safe drop over a barrier), a barred door is shut from the near side', () => {
  const M = ROOM_MAZES; assert.ok(M.band >= M.jump + 3 && M.wide - 2 === M.band && M.band - 2 * M.stub >= M.jump + 1, 'a stretch, and a broken walkway, too far to jump');
  let lava = 0, holes = 0, gates = 0;
  for (let i = 0; i < 200; i++) { const base = baseOf(i, 'B'), maps = floorsOf(base);
    for (const m of maps) { const drops = holeDrops(m); for (const b of m.building.barriers) for (let y = 0; y < m.height; y++) for (let x = b.x0; x <= b.x1; x++) { const t = m.tiles[y * m.width + x]; if (t.hole) { holes++; assert.ok(!(drops && drops[y * m.width + x]), 'a hole over a barrier is never a safe drop'); } if (t.kind === 'lava') lava++; }
      for (let k = 0; k < m.tiles.length; k++) if (m.tiles[k].drop) { assert.equal(m.building.level, 1, 'drops are only from the upper floor'); assert.ok(drops[k]); } }
    const g = maps[roomFloorOf(0) - 1]; for (const o of g.objects.filter((q) => q.kind === 'labGate')) { gates++; const t = g.tiles[o.y * g.width + o.x]; assert.ok(t.blocked && t.gate && t.door, 'shut, and never dug'); } }
  assert.ok(lava > 0 && holes > 0 && gates > 0);
});

test('deterministic: the same base lays out the same floors, every time, whatever was generated in between', () => {
  const pick = [3, 17, 404, 911].map((i) => baseOf(i)), first = pick.map((b) => JSON.stringify(floorsOf(b)));
  for (let i = 0; i < 40; i++) roomMazePlan(baseOf(5000 + i)); // past the plan cache
  assert.deepEqual(pick.map((b) => JSON.stringify(floorsOf(b))), first);
  const t0 = performance.now(); for (let i = 0; i < 100; i++) floorsOf(baseOf(7000 + i)); const ms = (performance.now() - t0) / 100;
  assert.ok(ms < 60, `a whole maze (four floors) in ${ms.toFixed(1)} ms`);
});

test('version pinning: mazes of chambers (labyrinth versions 1 and 2, the Shell-Labyrinth) and their placement regenerate byte for byte as released', () => {
  const h = createHash('sha256');
  for (let i = 0; i < 24; i++) { const base = `labyrinth:G${i}:${i}:${-i}:${['keep', 'apartment', 'hive', 'shell'][i % 4]}`, P = labyrinthPlan(base);
    for (const V of [1, 2]) for (const q of P.nodes) h.update(JSON.stringify(generateLabyrinthChamber(`G${i}`, `${base}:f${q.n + 1}`, V))); }
  const flat = () => ({ tiles: Array.from({ length: 1024 }, (_, k) => ({ x: k % 32, y: (k / 32) | 0, kind: 'grass', blocked: false })), objects: [], enemySpawns: [], exits: { north: 16, south: 16 } });
  for (let i = 0; i < 30; i++) for (const V of [1, 2]) { const m = flat(); if (V === 2) m.landscape = true; const rec = placeLabyrinth(m, `P${i}`, i, 7, { style: STYLES[i % 3] }, () => [true], null, V); h.update(JSON.stringify([rec, m])); }
  let n = 0; for (let x = -40; x < 40; x++) for (let y = -40; y < 40; y++) if (labyrinthHere('TIM1', x, y, null)) { n++; h.update(`${x},${y}`); }
  assert.equal(n, 401); assert.equal(h.digest('hex'), 'd338a4b3ce8d26823de4a2d1fdd1c1e483b73a73be0846ec1f36974130412cf1', 'the digest taken from release 782 before room mazes');
  // old ids parse as they did; a room maze's carries its generator version
  assert.deepEqual(parseLabyrinthId('labyrinth:S:1:-2:keep:f3'), { seed: 'S', rx: 1, ry: -2, style: 'keep', rooms: 0, node: 2, base: 'labyrinth:S:1:-2:keep' });
  assert.deepEqual(parseLabyrinthId('labyrinth:S~shell2:1:-2:shell:f1').base, 'labyrinth:S~shell2:1:-2:shell');
  assert.deepEqual(parseLabyrinthId('labyrinth:S:1:-2:hive~r1:f2'), { seed: 'S', rx: 1, ry: -2, style: 'hive', rooms: 1, node: 1, base: 'labyrinth:S:1:-2:hive~r1' });
  assert.ok(isLabyrinthId('labyrinth:S:1:-2:hive~r1:f4')); assert.equal(labyrinthPlan('labyrinth:S:1:-2:hive~r1'), null); assert.equal(roomMazePlan('labyrinth:S:1:-2:hive'), null);
});

test('version pinning: room mazes of generator 1 (~r1, release 784) and their placement at labyrinth version 3 regenerate byte for byte', () => {
  const h = createHash('sha256');
  for (let i = 0; i < 300; i++) { const base = `labyrinth:P${i}:${i % 11 - 5}:${i % 7 - 3}:${STYLES[i % 3]}~r1`; for (let f = 1; f <= F; f++) h.update(JSON.stringify(generateLabyrinthChamber(`P${i}`, `${base}:f${f}`))); }
  assert.equal(h.digest('hex'), '229c0d48ea1ef9280288910c4fe86024096d7712d4e0153328a085fdf7a0c0f4', 'the digest taken from main 92e47889 before generator 2');
  const k = createHash('sha256'), flat = () => ({ tiles: Array.from({ length: 1024 }, (_, q) => ({ x: q % 32, y: (q / 32) | 0, kind: 'grass', blocked: false })), objects: [], enemySpawns: [], exits: { north: 16, south: 16 }, landscape: true });
  for (let i = 0; i < 60; i++) { const m = flat(), rec = placeLabyrinth(m, `Q${i}`, i, -3, { style: STYLES[i % 3] }, () => [true], null, 3); k.update(JSON.stringify([rec, m]));
    const d = m.objects.find((o) => o.labyrinthDoor); if (/~r1:/.test(d.dungeonId)) for (let f = 1; f <= 4; f++) k.update(JSON.stringify(generateLabyrinthChamber(`Q${i}`, d.dungeonId.replace(/:f\d+$/, `:f${f}`)))); }
  assert.equal(k.digest('hex'), '3281fec3f67f52f455b0d6471dca6973a643e5473b1b0e9f761df9839e637dbc', 'labyrinth version 3 places exactly as main 92e47889 did');
});

test(`the share of room mazes: about ${ROOM_MAZES.share} of labyrinths placed at labyrinth versions 3 (~r1) and 4 (~r2), none before`, () => {
  assert.equal(LABYRINTHS.version, 4);
  let rooms = 0, n = 0; for (let x = -60; x < 60; x++) for (let y = -60; y < 60; y++) { n++; if (labyrinthForm('SHARE', x, y) === 'rooms') rooms++; }
  assert.ok(Math.abs(rooms / n - ROOM_MAZES.share) < .02, `room mazes ${(rooms / n).toFixed(3)} of ${n}`);
  const flat = () => ({ tiles: Array.from({ length: 1024 }, (_, k) => ({ x: k % 32, y: (k / 32) | 0, kind: 'grass', blocked: false })), objects: [], enemySpawns: [], exits: { north: 16, south: 16 }, landscape: true });
  const placed = { 1: 0, 2: 0, 3: 0, 4: 0 }; let all = 0;
  for (let i = 0; i < 300; i++) for (const V of [1, 2, 3, 4]) { const m = flat(); placeLabyrinth(m, 'SH', i, -i, { style: STYLES[i % 3] }, () => [true], null, V); const d = m.objects.find((o) => o.labyrinthDoor); if (V === 3) all++;
    if (/~r\d+:f\d+$/.test(d.dungeonId)) { placed[V]++; assert.equal(d.dungeonId, `${m.greatBuilding.base}:f${roomFloorOf(ROOM_MAZES.entryLevel)}`, 'the door opens onto the ground floor'); assert.equal(d.roomMaze, V >= 4 ? 2 : 1); assert.equal(parseLabyrinthId(d.dungeonId).rooms, V >= 4 ? 2 : 1);
      if (V >= 4) { const P = roomVaultOf(m.greatBuilding.base); assert.equal(d.name, P.name, 'the name tells the place'); assert.ok(d.identity.includes(P.line) && d.lore.includes(P.line.slice(1)), 'the door says where the vault lies'); } } }
  assert.equal(placed[1], 0); assert.equal(placed[2], 0); assert.equal(placed[3], placed[4], 'the same labyrinths are room mazes at 3 and 4'); assert.ok(Math.abs(placed[3] / all - ROOM_MAZES.share) < .08, `placed at version 3: ${placed[3]} of ${all}`);
});

// ------------------------------------------------------------------------------------------------ in the game
const idle = { state: { x: 0, y: 0 }, held: () => false, consume: () => false };
const onFloor = (seed, id) => { const s = freshSave(); s.seed = seed; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 7, ry: 7, x: 16, y: 16 }; const g = new Game(s, 0); g.loadArea('dungeon', false); g.enemies = []; return g; };
const findBase = (want) => { for (let i = 0; i < 400; i++) { const base = baseOf(i, 'G'), P = roomMazePlan(base); if (want(P)) return { base, P, seed: P.seed }; } return null; };

test('in the game: a hole or lava on a room maze\'s floor is a death that wakes you where you came onto that floor; a green-rimmed drop falls to the ground beneath', () => {
  for (const ob of ['holes', 'lava']) { const F0 = findBase((P) => P.barriers[0].obstacle === ob); assert.ok(F0, ob); const id = `${F0.base}:f${roomFloorOf(0)}`, g = onFloor(F0.seed, id), s = g.save;
    g.update(.016, idle, 1000); const entry = { ...s.session.floorEntry }; assert.equal(entry.id, id);
    const b = g.map.building.barriers[0], x = b.x0 + 3, y = 2; assert.ok(ob === 'lava' ? g.map.tiles[y * g.map.width + x].kind === 'lava' : g.map.tiles[y * g.map.width + x].hole);
    g.player.x = x - .4; g.player.y = y; for (let t = 0; t < 30 && !s.worldFlags.deaths; t++) g.update(.05, { state: { x: 1, y: 0 }, held: () => false, consume: () => false }, 1100 + t * 50);
    assert.equal(s.worldFlags.deaths, 1, `${ob}: a death`); assert.equal(g.area, 'dungeon'); assert.equal(g.areaId(), id, `${ob}: still on the same floor`);
    assert.deepEqual([Math.round(g.player.x), Math.round(g.player.y)], [entry.x, entry.y], `${ob}: where you came onto it`); assert.ok(!s.consequences.dungeons[id]?.abandoned, `${ob}: the maze is not abandoned`); }
  const D = findBase((P) => P.drops.length > 0), d = D.P.drops[0], up = `${D.base}:f${roomFloorOf(1)}`, g = onFloor(D.seed, up); g.update(.016, idle, 1000);
  const t = g.map.tiles.findIndex((q) => q.drop); assert.ok(t >= 0 && safeDropAt(g.map, t % g.map.width, (t / g.map.width) | 0)); assert.ok(d);
  g.player.x = t % g.map.width; g.player.y = (t / g.map.width) | 0; g.update(.016, idle, 1016);
  assert.equal(g.areaId(), `${D.base}:f${roomFloorOf(0)}`, 'down to the ground'); assert.ok(!g.save.worldFlags.deaths);
});

test('in the game: the door opens onto the ground floor; stairs and ladders carry you both ways; a barred door opens only from its far side and stays open', () => {
  const B = findBase((P) => P.barriers.some((b) => b.obstacle === 'barred')), ground = `${B.base}:f${roomFloorOf(0)}`, g = onFloor(B.seed, ground);
  assert.ok(g.map.building.labyrinth && g.map.building.roomMaze); assert.equal(g.map.building.vault, B.P.vaultLevel === 0); assert.match(g.labyrinthProgress(), /1 of 4 floors found/);
  const gate = g.map.objects.find((o) => o.kind === 'labGate'); g.player.x = gate.x - 1; g.player.y = gate.y;
  const no = g.interact('open', gate.id); assert.ok(!no.ok); assert.match(no.message, /Barred from the other side/); assert.ok(g.map.tiles[gate.y * g.map.width + gate.x].blocked);
  g.player.x = gate.x + 1; const yes = g.interact('open', gate.id); assert.ok(yes.ok, yes.message); assert.ok(!g.map.tiles[gate.y * g.map.width + gate.x].blocked, 'open');
  const stair = g.map.objects.find((o) => o.kind === 'buildingStair'); g.player.x = stair.x; g.player.y = stair.y; const r = g.interact(stair.actions[0], stair.id); assert.ok(r.ok, r.message);
  assert.equal(g.areaId(), stair.toId); const back = g.map.objects.find((o) => o.kind === 'buildingStair' && o.toId === ground && o.toX === stair.x && o.toY === stair.y); assert.ok(back, 'the same stair, from the other end');
  g.player.x = back.x; g.player.y = back.y; assert.ok(g.interact(back.actions[0], back.id).ok); assert.equal(g.areaId(), ground);
  const again = g.map.objects.find((o) => o.kind === 'labGate'); assert.equal(again.state, 'open', 'stays open'); assert.ok(!g.map.tiles[again.y * g.map.width + again.x].blocked);
  // from the overworld: a version-3 labyrinth door leads to a room maze's ground floor
  const m = { tiles: Array.from({ length: 1024 }, (_, k) => ({ x: k % 32, y: (k / 32) | 0, kind: 'grass', blocked: false })), objects: [], enemySpawns: [], exits: {}, landscape: true };
  let door = null; for (let i = 0; i < 40 && !door; i++) { const mm = structuredClone(m); placeLabyrinth(mm, 'DOOR', i, 3, { style: 'keep' }, () => [true], null, LABYRINTHS.version); door = mm.objects.find((o) => o.labyrinthDoor && o.roomMaze); }
  assert.ok(door); const P = parseLabyrinthId(door.dungeonId); assert.equal(P.rooms, ROOM_MAZES.version); assert.equal(P.node + 1, roomFloorOf(0));
  assert.equal(generateRoomMazeFloor(P.seed, door.dungeonId).building.level, 0);
});

test('on new ground: a room maze stands on the overworld; its door opens onto the ground floor; its vault has a roof exit, sealed while the guardian stands, and a way out at the front', () => {
  const SEED = 'TIM1', visit = (x, y, s = null) => { const sv = s || freshSave(); sv.seed = SEED; const g = new Game(sv, 0); g.rx = x; g.ry = y; g.loadArea('overworld', false); return g; };
  let at = null; for (let d = LABYRINTHS.minRing; d < 40 && !at; d++) for (let x = -d; x <= d && !at; x++) for (const y of [d - Math.abs(x), Math.abs(x) - d]) { if (!labyrinthHere(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION)) || labyrinthForm(SEED, x, y) !== 'rooms') continue; if (visit(x, y).map.objects.some((o) => o.labyrinthDoor && o.roomMaze && o.vaultPlace === 'ground')) { at = { x, y }; break; } }
  assert.ok(at, 'a room maze on TIM1'); const g = visit(at.x, at.y), door = g.map.objects.find((o) => o.labyrinthDoor); assert.ok(g.map.greatBuilding.roomMaze);
  g.player.x = door.x; g.player.y = door.y; const r = g.interact('enter', door.id); assert.ok(r.ok, r.message);
  assert.equal(g.areaId(), door.dungeonId); assert.ok(g.map.building.roomMaze && g.map.building.level === 0); assert.match(g.defeatNotice.detail, /floors found/); assert.ok(g.defeatNotice.detail.startsWith(ROOM_MAZES.vault.lines.ground), 'the door line, inside too');
  const exit = g.map.objects.find((o) => o.dir === 'roofExit'), spot = g.map.building.roofSpot; assert.ok(exit, 'a roof exit in the vault'); assert.deepEqual([exit.x, exit.y], [spot.x, spot.y]);
  const vault = g.map.building.rooms.find((q) => q.vault); assert.ok(exit.x >= vault.x0 && exit.x <= vault.x1 && exit.y >= vault.y0 && exit.y <= vault.y1, 'in the vault\'s room');
  g.player.x = exit.x; g.player.y = exit.y; if (g.enemies.some((e) => e.id.endsWith(':guardian') && !e.dead)) assert.ok(!g.interact(exit.actions[0], exit.id).ok, 'sealed while the guardian stands');
  const out = g.map.objects.find((o) => o.id === 'building-exit-vault'); g.player.x = out.x; g.player.y = out.y; assert.ok(g.interact('exit', out.id).ok);
  assert.equal(g.area, 'overworld'); assert.deepEqual([g.player.x, g.player.y], [door.x, door.y], 'out at the front');
  console.log(`# a room maze on seed ${SEED}: section (${at.x},${at.y}), ${door.name}, ${door.dungeonId}`);
});

test('generator 2: a vault on the roof or in the undercroft holds its treasure, its guardian, its way out and its roof exit; the door and the floors are named for it', () => {
  for (const place of ['roof', 'under']) { let base = null; for (let i = 0; i < 400 && !base; i++) { const b = baseOf(i, 'V'); if (roomVaultOf(b).place === place && roomVaultOf(b).known) base = b; }
    assert.ok(base, place); const P = roomMazePlan(base), L = ROOM_MAZES.vault.levels[place], id = `${base}:f${roomFloorOf(L)}`, s = freshSave(); s.seed = P.seed;
    s.consequences.dungeons[`${base}:f1`] = { buildingDoors: { rx: P.rx, ry: P.ry, front: { x: 16, y: 20 }, exits: {}, hatch: null, roofTop: true } };
    s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: P.rx, ry: P.ry, x: 16, y: 20 }; const g = new Game(s, 0); g.loadArea('dungeon', false);
    const B = g.map.building; assert.ok(B.vault && B.level === L, `${place}: the vault's floor`); assert.equal(B.vaultLine, ROOM_MAZES.vault.lines[place]); assert.ok(g.map.name.startsWith(ROOM_MAZES.vault.names[P.style][place]));
    assert.ok(g.map.objects.some((o) => o.id === 'building-cache') && g.enemies.some((e) => e.id.endsWith(':guardian')), `${place}: treasure and guardian`);
    const ex = g.map.objects.find((o) => o.dir === 'roofExit'); assert.ok(ex, `${place}: a roof exit`); assert.deepEqual([ex.x, ex.y], [B.roofSpot.x, B.roofSpot.y]);
    const ground = generateRoomMazeFloor(P.seed, `${base}:f${roomFloorOf(0)}`); assert.ok(!ground.building.vault && !ground.objects.some((o) => o.id === 'building-cache'), 'no vault on the ground');
    const out = g.map.objects.find((o) => o.id === 'building-exit-vault'); g.enemies = []; g.player.x = out.x; g.player.y = out.y; assert.ok(g.interact('exit', out.id).ok); assert.equal(g.area, 'overworld'); }
});
