// The Upwells' seed hunts (Tim, 2026-11-18): "If you find one of these towers and climb to the top of it, it'll direct you to the
// location of a seed... mark it on your map... somewhere in an undiscovered section... not too far, not too close... in a dungeon,
// on a platform on a tree, or just lying on the ground... Rarities stay the same... It's a guaranteed seed hunt."
// The lookout at the lip starts one hunt per tower (save.seedHunts); the seed is an object laid over the target section (or its
// crossing) as loaded, never a tile, so every pinned layout stays as it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, footprintOpen, seedHuntGround, seedHuntSpots, walkerCrossingMap } from '../src/game.ts';
import { reachableFrom, canReturnTo, elevationAt, LETHAL_KINDS } from '../src/landscape.ts';
import { TALL_TOWERS, ensureSeedHunts, seedHuntCandidates, seedHuntKind, activeSeedHunts, nearestSeedHunt } from '../src/tall-towers.ts';
import { SEEDS, SEED_FINDS } from '../src/skylands.ts';
import { compassGuidance, seedHuntGuidance } from '../src/atlas-view.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';

const H = TALL_TOWERS.seedHunt;
const sha = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
// Towers on new ground (tests/tall-towers.test.ts GOLD): seed, rx, ry.
const TOWERS = [['TOWERS', -3, 3], ['TOWERS', 0, 9], ['TOWERS', 9, 3], ['CINDER-VERGE-47', 3, -3], ['CINDER-VERGE-47', -9, -3]];
const cheb = (a, b) => Math.max(Math.abs(a.rx - b.rx), Math.abs(a.ry - b.ry));

function visit(seed, rx, ry, save = null) { const s = save || freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; }
function lookFromTower(seed, rx, ry, save = null) {
  const g = visit(seed, rx, ry, save), door = g.map.objects.find((o) => o.towerDoor); assert.ok(door, `${seed} ${rx},${ry} has a tower`);
  g.player.x = door.x; g.player.y = door.y; assert.ok(g.interact('enter', door.id).ok); assert.equal(g.area, 'dungeon');
  const look = g.map.objects.find((o) => o.kind === 'towerLookout'); g.player.x = 1; g.player.y = g.map.tallTower.summit.y + 1;
  const explored = { ...g.save.explored }, atlas = new Set(Object.keys(g.save.atlas || {}));
  const r = g.interact('look', look.id); assert.ok(r.ok, r.message); assert.match(r.message, /charted/);
  return { g, r, id: g.areaId(), explored, atlas };
}
const travel = (g, rx, ry) => { if (g.area === 'dungeon') g.leaveTower('rope'); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
const syntheticHunt = (seed, rx, ry, tower = `tower:${seed}:0:0:1:9:0`, kind = 'crimson') => { const s = freshSave(); s.seed = seed; s.seedHunts = { [tower]: { v: 1, tower, from: { rx: 0, ry: 0 }, rx, ry, kind, state: 'active' } }; return { s, tower }; };
const huntObject = (g, tower) => g.map.objects.find((o) => o.seedHunt === tower);
// Independent check: the tile is joined both ways (one level up, any drop, thin walls) to ground that joins a section edge.
function twoWay(map, start, x, y) {
  const go = reachableFrom(map, 32, 32, start, true), back = canReturnTo(map, 32, 32, start, true), i = y * 32 + x;
  let edge = false; for (let j = 0; j < 1024; j++) if (go[j] && back[j]) { const a = j % 32, b = (j - a) / 32; if (a === 0 || b === 0 || a === 31 || b === 31) edge = true; }
  return edge && !!go[i] && !!back[i];
}
function enterCrossing(g, hunt) {
  const door = g.map.objects.find((o) => o.kind === 'dungeon' && `dungeon:${g.save.seed}:g${g.save.worldGeneration}:${g.rx}:${g.ry}:${o.id}` === hunt.dungeonId); assert.ok(door, 'the crossing door stands in the section');
  assert.deepEqual([Math.round(door.x), Math.round(door.y)], [hunt.door.x, hunt.door.y]);
  g.player.x = door.x; g.player.y = door.y; const r = g.interact('enter', door.id); assert.ok(r.ok, r.message); assert.equal(g.area, 'dungeon'); assert.equal(g.areaId(), hunt.dungeonId);
  return door;
}

test('the lookout starts one hunt per tower: an undiscovered section in the band, the first in the hunt\'s own order whose ground can hold a find; the same every time', () => {
  for (const [seed, rx, ry] of TOWERS) {
    const a = lookFromTower(seed, rx, ry), b = lookFromTower(seed, rx, ry), h = a.g.save.seedHunts[a.id];
    assert.ok(h && h.state === 'active', `${seed} ${rx},${ry}: a hunt`); assert.deepEqual(b.g.save.seedHunts[b.id], h, 'deterministic');
    assert.deepEqual(h.from, { rx, ry }); assert.equal(h.tower, a.id); assert.ok(SEEDS.kinds.includes(h.kind));
    const d = cheb(h, { rx, ry }); assert.ok(d >= H.band[0] && d <= H.band[1], `in the band: ${d}`);
    assert.ok(!a.explored[`${h.rx},${h.ry}`] && !a.atlas.has(`${h.rx},${h.ry}`), 'undiscovered when the hunt began');
    const order = seedHuntCandidates(seed, a.id, rx, ry, a.explored).filter((c) => !a.atlas.has(`${c.rx},${c.ry}`)), at = order.findIndex((c) => c.rx === h.rx && c.ry === h.ry);
    assert.ok(at >= 0 && at < H.loads); for (const c of order.slice(0, at)) assert.equal(seedHuntGround(walkerCrossingMap(a.g.save, c.rx, c.ry)), null, 'every earlier candidate had no ground');
    assert.match(a.r.message, /glimpse a glint/); assert.ok(a.g.save.narrative.journal.some((j) => j.recordId === `seed-hunt:${a.id}` && /glint/.test(j.text) && j.text.includes(`${h.rx},${h.ry}`)));
    // looked from again: no second hunt; the glint is recalled
    const look = a.g.map.objects.find((o) => o.kind === 'towerLookout'), again = a.g.interact('look', look.id);
    assert.deepEqual(Object.keys(a.g.save.seedHunts), [a.id]); assert.match(again.message, /still waits/);
    // that section already explored before the climb: another target, also undiscovered
    const s = freshSave(); s.seed = seed; s.explored[`${h.rx},${h.ry}`] = true; const c = lookFromTower(seed, rx, ry, s), h2 = c.g.save.seedHunts[c.id];
    assert.ok(h2 && !(h2.rx === h.rx && h2.ry === h.ry) && !c.explored[`${h2.rx},${h2.ry}`]);
    // walked to: the seed lies there (or in the crossing there), joined both ways to the section's edges
    travel(a.g, h.rx, h.ry); assert.ok(h.where, 'resolved on arrival');
    if (h.where === 'crossing') { enterCrossing(a.g, h); assert.ok(huntObject(a.g, a.id)); }
    else { const o = huntObject(a.g, a.id); assert.ok(o && twoWay(a.g.map, seedHuntGround(a.g.map).start, o.x, o.y)); }
  }
});

test('the seed\'s kind is drawn by the travel seeds\' own overworld weights: the rare kinds stay rare', () => {
  const W = SEED_FINDS.overworld.weights, total = W.reduce((n, [, w]) => n + w, 0), N = 6000, got = {};
  for (let i = 0; i < N; i++) { const k = seedHuntKind(`S${i % 7}`, `tower:S${i % 7}:${i}:${-i}:2:11:0`, W); got[k] = (got[k] || 0) + 1; }
  assert.deepEqual(Object.keys(got).sort(), W.map(([k]) => k).sort());
  for (const [k, w] of W) assert.ok(Math.abs(got[k] / N - w / total) < .025, `${k}: ${got[k] / N} vs ${w / total}`);
  assert.equal(seedHuntKind('X', 'tower:X:1:2:1:9:0', W), seedHuntKind('X', 'tower:X:1:2:1:9:0', W));
});

test('placement: on open ground, high in a great tree or inside the section\'s crossing, always reachable with base movement, and the section is never short of one', () => {
  const seen = { ground: 0, tree: 0, crossing: 0 };
  let skipped = 0;
  const check = (seed, rx, ry, tower) => {
    const { s } = syntheticHunt(seed, rx, ry, tower);
    if (!seedHuntGround(walkerCrossingMap(s, rx, ry))) { skipped++; return { where: null }; } // open sea: no hunt ever aims here (the lookout previews each candidate)
    const g = visit(seed, rx, ry, s), h = g.save.seedHunts[tower];
    assert.ok(seedHuntGround(g.map), `${seed} ${rx},${ry}: ground previewed is ground loaded`);
    assert.ok(['ground', 'tree', 'crossing'].includes(h.where), `${seed} ${rx},${ry}: resolved (${h.where})`); seen[h.where]++;
    if (h.where === 'crossing') {
      assert.ok(!huntObject(g, tower), 'outside, nothing: the seed is inside'); const G = seedHuntGround(g.map);
      assert.ok([[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => twoWay(g.map, G.start, h.door.x + dx, h.door.y + dy)), 'the door stands on reachable ground');
      enterCrossing(g, h); const o = huntObject(g, tower), M = g.map, W = M.width, Hh = M.tiles.length / W; assert.ok(o, 'inside: the seed');
      const e = { x: Math.round(M.entry.x), y: Math.round(M.entry.y) }, go = reachableFrom(M, W, Hh, e), back = canReturnTo(M, W, Hh, e), i = o.y * W + o.x;
      assert.ok(go[i] && back[i], 'joined to the entry both ways'); assert.equal(elevationAt(M, W, o.x, o.y), elevationAt(M, W, e.x, e.y), 'on the entry\'s own level');
      assert.ok(footprintOpen(M, W, o.x, o.y) && !LETHAL_KINDS.has(M.tiles[i].kind)); return h;
    }
    const o = huntObject(g, tower), t = g.map.tiles[o.y * 32 + o.x]; assert.ok(o, 'the seed lies here'); assert.deepEqual([o.x, o.y], [h.x, h.y]);
    assert.equal(o.kind, 'seedFind'); assert.equal(o.seed, h.kind); assert.ok(footprintOpen(g.map, 32, o.x, o.y) && !LETHAL_KINDS.has(t.kind));
    assert.ok(twoWay(g.map, seedHuntGround(g.map).start, o.x, o.y), `${seed} ${rx},${ry}: ${h.where} seed joined both ways to the section's edges`);
    if (h.where === 'tree') { assert.ok(t.canopy && t.elev > 0); assert.equal(o.cacheElev, t.elev); } else assert.ok(!(t.elev > 0) && !t.canopy && !o.cacheElev);
    return h;
  };
  for (const seed of ['TOWERS', 'CINDER-VERGE-47', 'HUNT-A']) for (let i = 0; i < 9; i++) check(seed, ((i * 7) % 23) - 11, ((i * 5) % 19) - 9, `tower:${seed}:0:0:1:9:0`);
  // great-tree sections (jungle): some tower's hunt picks the tree
  for (const [rx, ry] of [[-6, -28], [0, -29], [-10, -26], [-8, -26]]) for (let k = 0; k < 12; k++) if (check('TOWERS', rx, ry, `tower:TOWERS:${k}:0:1:9:0`).where === 'tree') break;
  // crossing sections, by several towers
  for (const [rx, ry] of [[-6, -8], [1, -3], [-8, 7], [4, -6]]) for (let k = 0; k < 6; k++) if (check('TOWERS', rx, ry, `tower:TOWERS:${k}:1:1:9:0`).where === 'crossing') break;
  for (const k of ['ground', 'tree', 'crossing']) assert.ok(seen[k] > 0, `some seed ${k}: ${JSON.stringify(seen)}`);
  assert.ok(seen.ground + seen.tree + seen.crossing >= 20 && skipped <= 8, `${JSON.stringify(seen)}, ${skipped} open-sea sections skipped`);
});

test('an overlay only: the section and its crossing are laid exactly as without the hunt (tiles, other objects, creatures, Atlas record)', () => {
  const lay = (m) => sha([m.tiles, m.objects.filter((o) => o.kind !== 'traveler' && !o.seedHunt), m.enemySpawns]);
  for (const [rx, ry] of [[-11, -9], [-4, -4], [-6, -8], [-6, -28]]) {
    const plain = visit('TOWERS', rx, ry), { s, tower } = syntheticHunt('TOWERS', rx, ry), hunted = visit('TOWERS', rx, ry, s), h = hunted.save.seedHunts[tower];
    assert.equal(sha(hunted.map.tiles), sha(plain.map.tiles), `${rx},${ry}: tiles`); assert.equal(lay(hunted.map), lay(plain.map), `${rx},${ry}: objects and creatures`);
    const rec = (g) => { const { color, ...rest } = g.save.atlas[`${rx},${ry}`]; return rest; }; assert.deepEqual(rec(hunted), rec(plain), 'the Atlas record pins the same versions');
    assert.equal(hunted.map.objects.length - plain.map.objects.filter((o) => true).length, h.where === 'crossing' ? 0 : 1);
    if (h.where === 'crossing') {
      const door = plain.map.objects.find((o) => o.kind === 'dungeon' && `dungeon:TOWERS:g1:${rx}:${ry}:${o.id}` === h.dungeonId); plain.player.x = door.x; plain.player.y = door.y; assert.ok(plain.interact('enter', door.id).ok);
      enterCrossing(hunted, h); assert.equal(sha(hunted.map.tiles), sha(plain.map.tiles), 'the crossing\'s tiles'); assert.equal(lay(hunted.map), lay(plain.map), 'and its objects and creatures');
    }
  }
});

test('picking it up gives the seed once (the same item as any seed of its kind), finishes the hunt and clears the marker', () => {
  // open ground
  { const { s, tower } = syntheticHunt('TOWERS', -11, -9, undefined, 'pumice'), g = visit('TOWERS', -11, -9, s), h = g.save.seedHunts[tower], o = huntObject(g, tower);
    assert.equal(h.where, 'ground'); const before = g.save.seedPouch.pumice; g.player.x = o.x; g.player.y = o.y;
    const r = g.interact('take', o.id); assert.ok(r.ok, r.message); assert.equal(r.seed, 'pumice'); assert.equal(g.save.seedPouch.pumice, before + 1);
    assert.equal(h.state, 'found'); assert.ok(!huntObject(g, tower)); assert.equal(activeSeedHunts(g.save).length, 0); assert.equal(nearestSeedHunt(g.save, 0, 0), null);
    assert.ok(g.save.narrative.journal.some((j) => j.recordId === `seed-hunt:found:${tower}`)); assert.match(r.message, /Upwell/);
    assert.ok(!g.interact('take', o.id).ok); assert.equal(g.save.seedPouch.pumice, before + 1, 'never twice');
    travel(g, -11, -8); travel(g, -11, -9); assert.ok(!huntObject(g, tower), 'gone for good'); assert.equal(g.save.seedPouch.pumice, before + 1); }
  // inside a crossing
  { let got = null; for (let k = 0; k < 6 && !got; k++) { const { s, tower } = syntheticHunt('TOWERS', -6, -8, `tower:TOWERS:${k}:1:1:9:0`, 'opal'), g = visit('TOWERS', -6, -8, s); if (g.save.seedHunts[tower].where === 'crossing') got = { g, tower }; }
    assert.ok(got); const { g, tower } = got, h = g.save.seedHunts[tower]; enterCrossing(g, h); const o = huntObject(g, tower), before = g.save.seedPouch.opal;
    g.player.x = o.x; g.player.y = o.y; const r = g.interact('take', o.id); assert.ok(r.ok, r.message); assert.equal(g.save.seedPouch.opal, before + 1); assert.equal(h.state, 'found'); assert.match(r.message, /inside a crossing/);
    g.leaveDungeon(''); enterCrossing(g, h); assert.ok(!huntObject(g, tower)); assert.equal(g.save.seedPouch.opal, before + 1); }
});

test('the hunts are kept (additive at schema 14): a save and an exact resume keep the hunt and its seed where it lay; malformed entries drop, unknown fields stay', () => {
  const { s, tower } = syntheticHunt('TOWERS', -11, -9), g = visit('TOWERS', -11, -9, s), o = huntObject(g, tower); g.save.seedHunts[tower].note = 'kept';
  g.player.x = o.x + .2; g.player.y = o.y;
  const back = new Game(deserializeSave(serializeSave(g.exportSnapshot(500))), 900);
  assert.deepEqual(back.save.seedHunts, g.save.seedHunts); assert.equal(back.area, 'overworld'); const o2 = huntObject(back, tower); assert.ok(o2); assert.deepEqual([o2.x, o2.y], [o.x, o.y]);
  assert.equal(back.map.objects.filter((q) => q.seedHunt).length, 1, 'laid once');
  const r = back.interact('take', o2.id); assert.ok(r.ok, r.message);
  const again = new Game(deserializeSave(serializeSave(back.exportSnapshot(600))), 900); assert.equal(again.save.seedHunts[tower].state, 'found'); assert.ok(!huntObject(again, tower));
  // normalised
  assert.deepEqual(freshSave().seedHunts, {});
  const m = migrateSave({ ...JSON.parse(JSON.stringify(g.save)), seedHunts: { [tower]: { ...g.save.seedHunts[tower], where: 'moon' }, 'tower:X:1:1:1:9:0': { rx: 1, ry: 'x', kind: 'opal' }, bad: { rx: 1, ry: 2, kind: 'opal' }, 'tower:Y:2:2:1:9:0': { rx: 5, ry: 6, kind: 'opal', state: '??' } } });
  assert.deepEqual(Object.keys(m.seedHunts).sort(), [tower, 'tower:Y:2:2:1:9:0'].sort()); assert.equal(m.seedHunts[tower].where, undefined); assert.equal(m.seedHunts[tower].note, 'kept');
  assert.equal(m.seedHunts['tower:Y:2:2:1:9:0'].state, 'active'); assert.deepEqual(m.seedHunts['tower:Y:2:2:1:9:0'].from, { rx: 2, ry: 2 });
  assert.deepEqual(ensureSeedHunts({ seedHunts: [] }), {});
});

test('several towers, several hunts: each its own section, marked on the Atlas and followed by the compass', () => {
  const s = freshSave(); s.seed = 'TOWERS'; const a = lookFromTower('TOWERS', -3, 3, s), b = lookFromTower('TOWERS', 0, 9, a.g.save);
  const hunts = b.g.save.seedHunts; assert.equal(Object.keys(hunts).length, 2); const [h1, h2] = [hunts[a.id], hunts[b.id]];
  assert.ok(h1 && h2 && !(h1.rx === h2.rx && h1.ry === h2.ry), 'two different sections'); assert.equal(activeSeedHunts(b.g.save).length, 2);
  // the compass: with no other objective, the nearest hunt; a quest still comes first
  const near = nearestSeedHunt(b.g.save, h2.rx, h2.ry); assert.equal(near.tower, b.id);
  const guide = compassGuidance(b.g.save, { area: 'overworld', seedHunt: seedHuntGuidance(near, { [near.kind]: SEEDS[near.kind].name }) });
  assert.deepEqual([guide.rx, guide.ry], [h2.rx, h2.ry]); assert.match(guide.name, /Seed hunt/);
  assert.deepEqual(compassGuidance(b.g.save, { area: 'overworld', farQuest: { rx: 1, ry: 1, name: 'far' }, seedHunt: guide }).name, 'far');
  assert.equal(compassGuidance(b.g.save, { area: 'overworld' }), null, 'no hunt passed, no needle');
  // in its section, the needle points at the seed itself
  travel(b.g, h2.rx, h2.ry); const g2 = seedHuntGuidance(b.g.save.seedHunts[b.id]); const hh = b.g.save.seedHunts[b.id];
  if (hh.where === 'crossing') assert.deepEqual([g2.x, g2.y], [hh.door.x, hh.door.y]); else assert.deepEqual([g2.x, g2.y], [hh.x, hh.y]);
  assert.equal(seedHuntGuidance({ ...hh, state: 'found' }), null);
});
