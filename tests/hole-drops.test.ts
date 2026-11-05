// Holes that kill, holes that drop (Tim, 2026-11-05: "if you go through a hole in the floor, on most floors you should just die,
// and then respawn at the ladder, or wherever you entered that floor... the border should be green if you can go through a
// floor and it won't kill you, and you won't know the border is green until you get kind of close to it").
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { generateBuildingFloor, buildingPlan } from '../src/great-buildings.ts';
import { generateCompoundFloor, compoundTopology } from '../src/compounds.ts';
import { generateCastleFloor, castleTopology } from '../src/castles.ts';
import { HOLE_DROPS, holeDrops, safeDropAt, labyrinthPlan, generateLabyrinthChamber, ensureHoleSession } from '../src/labyrinths.ts';
import { drawSafeDropRims } from '../src/renderer.ts';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Base movement: walk, and (in a gallery, as the generator assumes) jump a one-tile hole. A hole is never stepped in.
const reach = (m, from, jump) => { const W = m.width, H = m.height, ok = (x, y) => { const t = x >= 0 && y >= 0 && x < W && y < H ? m.tiles[y * W + x] : null; return !!t && !t.blocked && !t.hole; };
  const seen = new Uint8Array(W * H), st = [from.y * W + from.x]; if (!ok(from.x, from.y)) return seen; seen[st[0]] = 1;
  while (st.length) { const k = st.pop(), px = k % W, py = (k / W) | 0; for (const [dx, dy] of N4) { let x = px + dx, y = py + dy; const t = x >= 0 && y >= 0 && x < W && y < H ? m.tiles[y * W + x] : null; if (!t || t.blocked) continue; if (t.hole) { if (!jump) continue; x += dx; y += dy; if (!ok(x, y)) continue; } const q = y * W + x; if (!seen[q]) { seen[q] = 1; st.push(q); } } }
  return seen; };
const stepOff = (m, p) => { for (const [dx, dy] of [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const t = m.tiles[(p.y + dy) * m.width + p.x + dx]; if (t && !t.blocked && !t.hole) return { x: p.x + dx, y: p.y + dy }; } return null; };

// Every interior kind with fall-through holes, across seeds, styles, floor counts and both interior versions.
function* floors() {
  for (let i = 0; i < 40; i++) for (const V of [1, 2]) {
    const seed = `HD${i}`;
    for (const style of ['keep', 'apartment']) { const n = style === 'keep' ? 3 + (i % 2) : 3 + (i % 3), base = `building:${seed}:${i}:${-i}:${style}:${n}${i % 2 ? 'r' : ''}`;
      for (let f = 1; f <= n; f++) yield { kind: 'building', id: `${base}:f${f}`, V, map: generateBuildingFloor(seed, `${base}:f${f}`, V), below: f > 1 ? generateBuildingFloor(seed, `${base}:f${f - 1}`, V) : null }; }
    { const style = ['keep', 'apartment', 'hive'][i % 3]; for (const pt of compoundTopology(seed, i, i, style).parts.filter((q) => q.part === 'w0' || q.part === 't')) { const n = pt.floors, base = `compound:${seed}:${i}:${i}:${style}:${pt.part}:${n}${pt.hatch ? 'r' : ''}`;
      for (let f = 1; f <= n; f++) yield { kind: 'compound', id: `${base}:f${f}`, V, map: generateCompoundFloor(seed, `${base}:f${f}`, V), below: f > 1 ? generateCompoundFloor(seed, `${base}:f${f - 1}`, V) : null }; } }
    if (i % 2 === 0) { const T = castleTopology(seed, i, i + 1); for (const pt of [T.keep, T.wings[i % 4]]) { const base = `castle:${seed}:${i}:${i + 1}:${pt.part}:${pt.floors}`; for (let f = 1; f <= pt.floors; f++) yield { kind: 'castle', id: `${base}:f${f}`, V, map: generateCastleFloor(seed, `${base}:f${f}`, V), below: f > 1 ? generateCastleFloor(seed, `${base}:f${f - 1}`, V) : null }; } }
  }
}
function* chambers(count) {
  for (let i = 0; i < count; i++) for (const V of [1, 2]) { const style = ['keep', 'apartment', 'hive', 'shell'][i % 4], seed = style === 'shell' ? `HL${i}~shell1` : `HL${i}`, base = `labyrinth:${seed}:${i}:${-i - 6}:${style}`, P = labyrinthPlan(base);
    for (const q of P.nodes) yield { id: `${base}:f${q.n + 1}`, seed: `HL${i}`, V, q, P, map: generateLabyrinthChamber(`HL${i}`, `${base}:f${q.n + 1}`, V) }; }
}

test('every floor of buildings, compounds and castles: no hole is needed for the way through, the respawn point and every ladder, door, cache and creature stand on solid floor, and every safe drop lands on solid floor joined to its ladders', () => {
  let n = 0, holed = 0, many = 0, groups = 0, safe = 0, safeTiles = 0, holeTiles = 0;
  for (const F of floors()) { const m = F.map; assert.ok(m, F.id); n++;
    const seen = reach(m, m.entry, false), at = (o) => seen[Math.round(o.y) * m.width + Math.round(o.x)] === 1;
    for (const o of m.objects) if (o.kind !== 'exit') assert.ok(at(o) || at(stepOff(m, { x: o.x, y: o.y })), `${F.id} ${o.id} reached without a hole`);
    for (const e of m.enemySpawns) assert.ok(at(e), `${F.id} ${e.id}`);
    for (let k = 0; k < m.tiles.length; k++) { const t = m.tiles[k]; if (!t.blocked && !t.hole) assert.equal(seen[k], 1, `${F.id}: open floor ${t.x},${t.y} cut off without a hole`); }
    const mask = holeDrops(m), holes = m.tiles.filter((t) => t.hole);
    if (!holes.length) { assert.equal(mask, null); continue; }
    holed++; holeTiles += holes.length; assert.ok(F.below, `${F.id}: holes only above the ground floor`);
    for (const t of m.tiles) if (!t.hole) assert.equal(mask[t.y * m.width + t.x], 0, 'only holes are drops');
    const comp = new Set(); let fg = 0; for (const t of holes) { if (comp.has(t.y * m.width + t.x)) continue; const st = [t], c = []; comp.add(t.y * m.width + t.x); while (st.length) { const p = st.pop(); c.push(p); for (const [dx, dy] of N4) { const q = m.tiles[(p.y + dy) * m.width + p.x + dx]; if (q?.hole && q.x === p.x + dx && !comp.has(q.y * m.width + q.x)) { comp.add(q.y * m.width + q.x); st.push(q); } } }
      groups++; fg++; const s = c.map((p) => mask[p.y * m.width + p.x]); assert.ok(s.every((v) => v === s[0]), 'a group of holes is all safe or all deadly'); if (s[0]) { safe++; safeTiles += c.length; } }
    if (fg >= HOLE_DROPS.minGroups) { assert.ok(holes.some((t) => safeDropAt(m, t.x, t.y)), `${F.id}: at least one safe drop`); many++; }
    // a safe drop lands on the floor below at the same spot (or beside it), on floor joined to that floor's ladders
    const B = F.below, seenB = reach(B, B.entry, false);
    for (const t of holes) if (safeDropAt(m, t.x, t.y)) { const land = stepOff(B, { x: t.x, y: t.y }); assert.ok(land, `${F.id} drop at ${t.x},${t.y}`); assert.equal(seenB[land.y * B.width + land.x], 1, `${F.id}: the landing is joined to the floor below`); }
  }
  assert.ok(n > 1000, `${n} floors`); assert.ok(holed > 300, `${holed} floors with holes`);
  const share = safe / groups; assert.ok(share > .15 && share < .45, `a minority of hole groups are safe drops: ${safe} of ${groups}`);
  console.log(`# building/compound/castle floors ${n}, with holes ${holed} (${many} with ${HOLE_DROPS.minGroups}+ groups); hole groups ${groups}, safe ${safe} (${(share * 100).toFixed(1)}%); hole tiles ${holeTiles}, safe ${safeTiles} (${(safeTiles / holeTiles * 100).toFixed(1)}%)`);
});

test('every labyrinth chamber (keep, arcology, hive and the Shell): its ladders, doors, keys, caches, guards and guardian reachable by walking and jumping one-tile gaps; the one-tile gaps are never safe; a gallery\'s safe pit lands on solid floor', () => {
  let n = 0, galleries = 0, pits = 0, safePits = 0;
  for (const C of chambers(48)) { const m = C.map; n++;
    const seen = reach(m, m.entry, true), at = (o) => seen[Math.round(o.y) * m.width + Math.round(o.x)] === 1;
    const arrive = [...C.q.slots.values()].map((p) => p.inner);
    for (const p of arrive) { const s2 = reach(m, p, true); assert.equal(s2[m.entry.y * m.width + m.entry.x], 1, `${C.id}: every way in joins the rest`); }
    for (const o of m.objects) if (o.kind !== 'exit' || C.q.n === 0 || C.q.vault) assert.ok(at(o) || at(stepOff(m, { x: o.x, y: o.y }) || o), `${C.id} ${o.id}`);
    for (const e of m.enemySpawns) assert.ok(at(e), `${C.id} ${e.id}`);
    const mask = holeDrops(m);
    if (C.q.kind !== 'gaps') { assert.ok(!m.tiles.some((t) => t.hole), 'only galleries have holes'); continue; }
    galleries++;
    const W = m.width, I = 4; for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { const cells = []; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) cells.push((1 + j * I + y) * W + 1 + i * I + x); if (!cells.every((k) => m.tiles[k].hole)) continue; pits++; assert.ok(mask, 'a gallery with a pit has a safe one'); if (mask[cells[0]]) { safePits++; assert.ok(cells.every((k) => mask[k] === 1)); } }
    for (const t of m.tiles) if (t.hole && mask?.[t.y * W + t.x]) { const lx = (t.x - 1) % I, ly = (t.y - 1) % I; assert.ok(lx < 3 && ly < 3 && t.x < 1 + 6 * I && t.y < 1 + 4 * I, `${C.id}: a gap strip at ${t.x},${t.y} is never safe`); }
    const to = m.building.fallTo, below = generateLabyrinthChamber(C.seed, to.id, C.V);
    const land = below.tiles[to.y * below.width + to.x]; assert.ok(land && !land.blocked && !land.hole, `${C.id}: the fall lands on floor`);
  }
  assert.ok(n > 1500, `${n} chambers`); assert.ok(galleries > 150, `${galleries} galleries`); assert.ok(safePits >= 1 && safePits < pits, `safe pits ${safePits} of ${pits}`);
  console.log(`# labyrinth chambers ${n}; galleries ${galleries}; missing-platform pits ${pits}, safe ${safePits}`);
});

test('the safe drops are read from the floor as laid: the same every time, no tile changed, and the generators unchanged', () => {
  const id = 'building:HDX:9:-9:keep:4r:f3', a = generateBuildingFloor('HDX', id, 2), b = generateBuildingFloor('HDX', id, 2);
  const before = JSON.stringify(a.tiles); holeDrops(a); assert.equal(JSON.stringify(a.tiles), before, 'no tile is touched');
  assert.deepEqual([...holeDrops(a) || []], [...holeDrops(b) || []]); assert.equal(holeDrops(a), holeDrops(a), 'cached per map');
  assert.equal(JSON.stringify(Object.keys(a)), JSON.stringify(Object.keys(b))); assert.ok(!('holeDrops' in a) && !('safe' in a.building), 'nothing added to the map');
  assert.ok(buildingPlan('building:HDX:9:-9:keep:4r', 2).floors.length === 4);
});

// ------------------------------------------------------------------------------------------------ in play
const holedFloor = () => { for (let i = 0; i < 200; i++) { const seed = `HP${i}`, base = `building:${seed}:7:7:keep:3`, m = generateBuildingFloor(seed, `${base}:f2`, 2), holes = m.tiles.filter((t) => t.hole);
  const deadly = holes.find((t) => !safeDropAt(m, t.x, t.y) && N4.some(([dx, dy]) => { const q = m.tiles[(t.y + dy) * m.width + t.x + dx]; return q && !q.blocked && !q.hole; }));
  const safe = holes.find((t) => safeDropAt(m, t.x, t.y)); if (deadly && safe) return { seed, base, id: `${base}:f2`, deadly, safe }; } return null; };
const onFloor = (F) => { const s = freshSave(); s.seed = F.seed; s.session.activeDungeonId = F.id; s.session.dungeonReturn = { rx: 7, ry: 7, x: 16, y: 16 }; const g = new Game(s, 0); g.loadArea('dungeon', false); g.enemies = []; return g; };
const idle = { state: { x: 0, y: 0 }, held: () => false, consume: () => false };

test('a step into an ordinary hole is a death that wakes you where you came onto that floor, on that floor; nothing is lost (release 345)', () => {
  const F = holedFloor(); assert.ok(F); const g = onFloor(F), s = g.save, entry = { x: g.player.x, y: g.player.y };
  s.materials.wood = 7; s.materials.stone = 3; s.currency = 55; s.xp = 12; s.consumables.restorativeDraught = 0; const keep = JSON.stringify([s.materials, s.currency, s.xp, s.inventory, s.equipment]);
  g.update(.016, idle, 1000); assert.deepEqual(s.session.floorEntry, { id: F.id, x: Math.round(entry.x), y: Math.round(entry.y) }, 'where you came onto the floor is noted');
  g.player.x = F.deadly.x; g.player.y = F.deadly.y; g.update(.016, idle, 1016);
  assert.equal(g.areaId(), F.id, 'still on the same floor'); assert.equal(g.area, 'dungeon'); assert.deepEqual([g.player.x, g.player.y], [Math.round(entry.x), Math.round(entry.y)], 'at the ladder you came by');
  assert.equal(s.worldFlags.deaths, 1); assert.equal(g.player.hp, s.maxHp); assert.equal(s.consumables.restorativeDraught, 2); assert.equal(s.session.holeDeath, null);
  assert.equal(JSON.stringify([s.materials, s.currency, s.xp, s.inventory, s.equipment]), keep, 'no wood, stone, marks, XP or gear lost'); assert.match(g.message, /wake where you came onto this floor/);
  assert.ok(s.consequences.dungeons[F.id] && !s.consequences.dungeons[F.id].abandoned, 'the building is not abandoned');
});

test('a safe drop falls to the floor below, as before; a jump over a deadly hole clears it', () => {
  const F = holedFloor(), g = onFloor(F); g.update(.016, idle, 1000);
  g.player.x = F.safe.x; g.player.y = F.safe.y; g.update(.016, idle, 1016);
  assert.equal(g.areaId(), `${F.base}:f1`, 'down a floor'); assert.ok(g.player.hp < g.save.maxHp, 'hurt by the fall'); assert.ok(!g.save.worldFlags.deaths);
  const h = onFloor(F); h.update(.016, idle, 1000); h.jumpUntil = 5000; h.player.x = F.deadly.x; h.player.y = F.deadly.y; h.update(.016, idle, 1016);
  assert.equal(h.areaId(), F.id); assert.ok(!h.save.worldFlags.deaths, 'mid-jump: no fall'); assert.ok(h.player.hp > 0);
  const k = onFloor(F); k.update(.016, idle, 1000); k.mechBoosting = true; k.buildingFall(); assert.ok(!k.save.session.holeDeath);
});

test('a reload during the death keeps where you wake; the session fields are normalised and additive', async () => {
  const { serializeSave, deserializeSave } = await import('../src/persistence.ts');
  const F = holedFloor(), g = onFloor(F); g.update(.016, idle, 1000); const entry = { ...g.save.session.floorEntry };
  g.player.x = F.deadly.x; g.player.y = F.deadly.y; g.buildingFall(); assert.ok(g.save.session.holeDeath);
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(1100))), 1200); assert.equal(r.areaId(), F.id); assert.deepEqual(r.save.session.holeDeath, { id: F.id, x: entry.x, y: entry.y });
  r.resolveDeath(1300, idle); assert.equal(r.areaId(), F.id); assert.deepEqual([r.player.x, r.player.y], [entry.x, entry.y]); assert.equal(r.save.session.holeDeath, null);
  const raw = freshSave(); raw.session.floorEntry = { id: 'x', x: 'bad' }; raw.session.holeDeath = 7; raw.session.unknownField = 1; const m = migrateSave(JSON.parse(JSON.stringify(raw)));
  assert.equal(m.session.floorEntry, null); assert.equal(m.session.holeDeath, null); assert.equal(m.session.unknownField, 1); assert.equal(m.version, 14);
  const f = freshSave(); assert.ok(!('floorEntry' in f.session)); assert.deepEqual(ensureHoleSession({ session: { floorEntry: { id: 'a', x: '3', y: 4, extra: 1 } } }).session.floorEntry, { id: 'a', x: 3, y: 4, extra: 1 });
});

test('the green rim: drawn only round safe drops within a few tiles of the Wayfarer; steady with reduced motion; thinner on low quality', () => {
  const F = holedFloor(), g = onFloor(F), m = g.map, mw = m.width;
  const ctx = () => { const c = { lines: 0, styles: [], widths: [], save() {}, restore() {}, beginPath() {}, moveTo() { c.lines++; }, lineTo() {}, stroke() { c.styles.push(c.strokeStyle); c.widths.push(c.lineWidth); } }; return c; };
  const near = ctx(); drawSafeDropRims(near, m, mw, { x: F.safe.x, y: F.safe.y - 1 }, 32, 1000, 'full', false); assert.ok(near.lines > 0 && near.styles.every((s) => s.startsWith(`rgba(${HOLE_DROPS.rim.rgb}`)), 'green, close up');
  const far = ctx(); drawSafeDropRims(far, m, mw, { x: F.safe.x + 9, y: F.safe.y + 9 }, 32, 1000, 'full', false); assert.equal(far.lines, 0, 'not from afar');
  const q1 = ctx(), q2 = ctx(); drawSafeDropRims(q1, m, mw, { x: F.safe.x, y: F.safe.y - 1 }, 32, 1000, 'full', true); drawSafeDropRims(q2, m, mw, { x: F.safe.x, y: F.safe.y - 1 }, 32, 1400, 'full', true); assert.deepEqual(q1.styles, q2.styles, 'no breath with reduced motion');
  const lo = ctx(); drawSafeDropRims(lo, m, mw, { x: F.safe.x, y: F.safe.y - 1 }, 32, 1000, 'low', false); assert.ok(lo.widths[0] < near.widths[0]);
  const dead = ctx(); const p = { x: F.deadly.x, y: F.deadly.y }; drawSafeDropRims(dead, m, mw, p, 32, 1000, 'full', false); const d = Math.hypot(F.deadly.x - F.safe.x, F.deadly.y - F.safe.y); if (d > HOLE_DROPS.rim.near + 2) assert.equal(dead.lines, 0, 'a deadly hole shows no rim');
  const ground = generateBuildingFloor(F.seed, `${F.base}:f1`, 2); assert.equal(holeDrops(ground), null); const none = ctx(); drawSafeDropRims(none, ground, ground.width, { x: 5, y: 5 }, 32, 1000, 'full', false); assert.equal(none.lines, 0);
});
