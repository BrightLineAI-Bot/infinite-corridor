import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, biomeFor, tileUnder } from '../src/landscape.ts';
import { Game, footprintSailable } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { SEA_CREATURES, SEA_HABITATS, SEA_SPAWNS, seaSpawns, seaCombatantFields, updateSeaCreature } from '../src/sea-creatures.ts';
import { grantTidemantle } from '../src/water-traversal.ts';
import { buySkiff } from '../src/boats.ts';

const SEED = 'LANDTEST';
const section = (rx, ry, version) => { const m = generateRegion(SEED, rx, ry); applyLandscape(m, SEED, rx, ry, version ? { version } : {}); return m; };
function findSection(biome, ok = () => true) {
  for (let r = 2; r <= 30; r++) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r || biomeFor(SEED, x, y) !== biome) continue;
    const m = section(x, y); if (ok(m)) return { m, rx: x, ry: y };
  }
  throw new Error(`no ${biome}`);
}
// Synthetic world: habitat water wherever `wet(x, y)`; records hits and pulls.
function world(player, wet = () => true) {
  const w = { player, hits: [], pulls: 0, water: (hab, x, y) => wet(x, y), hurt: (n, e) => w.hits.push({ n, t: w.time, kind: e.kind }), pull: () => { w.pulls++; }, time: 0 };
  return w;
}
function creature(kind, x, y) { return { kind, x, y, ...seaCombatantFields(kind) }; }
function run(e, w, seconds, dt = 1 / 30, each = () => {}) { for (let t = 0; t < seconds; t += dt) { w.time = t; updateSeaCreature(e, w, dt); each(e, t); } }

test('sea creatures spawn deterministically, bounded, on their habitat water, only in landscape version 2+', () => {
  const sea = findSection('sea', (m) => seaSpawns(m, SEED, 0, 0).length > 0);
  const a = seaSpawns(sea.m, SEED, sea.rx, sea.ry), b = seaSpawns(section(sea.rx, sea.ry), SEED, sea.rx, sea.ry);
  assert.deepEqual(a, b); assert.ok(a.length >= 1 && a.length <= SEA_SPAWNS.maxPerSection * 2 + 1);
  for (const q of a) { const t = sea.m.tiles[q.y * 32 + q.x]; assert.ok(SEA_HABITATS[SEA_CREATURES[q.kind].habitat].includes(t.kind), `${q.kind} on ${t.kind}`); }
  assert.deepEqual(seaSpawns(section(sea.rx, sea.ry, 1), SEED, sea.rx, sea.ry), [], 'version 1 coasts stay as they were');
  const fen = findSection('swamp', (m) => seaSpawns(m, SEED, 0, 0).length > 0);
  assert.ok(seaSpawns(fen.m, SEED, fen.rx, fen.ry).every((q) => ['mireLeech', 'bogLurker'].includes(q.kind)), 'swamps hold swamp creatures');
  const kinds = new Set();
  for (let ry = -25; ry <= 25; ry++) for (let rx = -25; rx <= 25; rx++) if (['sea', 'coast', 'swamp', 'blight', 'lake', 'isles'].includes(biomeFor(SEED, rx, ry))) for (const q of seaSpawns(section(rx, ry), SEED, rx, ry)) kinds.add(q.kind);
  for (const k of Object.keys(SEA_CREATURES).filter((q) => !SEA_CREATURES[q].leviathan && !SEA_CREATURES[q].summonOnly)) assert.ok(kinds.has(k), `${k} appears in the world`); // leviathans: tests/leviathans.test.ts
});

test('Lanceeel: hidden, then a visible wake line, then a straight charge that hits along it, then it dives', () => {
  const p = { x: 10, y: 10 }, w = world(p), e = creature('lanceeel', 4, 10);
  assert.equal(e.hidden, true); assert.equal(e.untargetable, true);
  updateSeaCreature(e, w, 1 / 30);
  assert.equal(e.sea.phase, 'telegraph'); assert.equal(e.untargetable, false); assert.equal(e.seaTele.type, 'line');
  assert.ok(Math.abs(e.seaTele.dx - 1) < 1e-9 && Math.abs(e.seaTele.dy) < 1e-9, 'aimed at the Wayfarer');
  let firstHit = null; run(e, w, 3, 1 / 30, () => { if (w.hits.length && firstHit === null) firstHit = w.time; });
  assert.equal(w.hits.length, 1, 'one hit per charge'); assert.ok(firstHit >= SEA_CREATURES.lanceeel.telegraph - .05, 'telegraph before damage');
  assert.ok(Math.abs(e.y - 10) < 1e-6 || e.sea.phase !== 'strike', 'charged in a straight line');
  const dodger = { x: 10, y: 10 }, w2 = world(dodger), e2 = creature('lanceeel', 4, 10);
  run(e2, w2, .5); dodger.y = 14; run(e2, w2, 1.5);
  assert.equal(w2.hits.length, 0, 'stepping off the line avoids the charge');
});

test('Ringcoil: circles the Wayfarer, tightening until it bites; a hit throws the coil wide', () => {
  const p = { x: 15, y: 15 }, w = world(p), e = creature('ringcoil', 19.5, 15), d = SEA_CREATURES.ringcoil;
  const angles = [];
  run(e, w, 4, 1 / 30, () => angles.push(Math.atan2(e.y - p.y, e.x - p.x)));
  assert.equal(w.hits.length, 0, 'no bite while the coil is wide');
  const swept = angles.slice(1).reduce((a, q, i) => a + Math.abs(Math.atan2(Math.sin(q - angles[i]), Math.cos(q - angles[i]))), 0);
  assert.ok(swept > 2, `circles (${swept.toFixed(2)} rad)`);
  run(e, w, (d.radius - d.biteAt) / d.tighten);
  assert.ok(w.hits.length >= 1, 'bites once the coil closes');
  const r0 = e.sea.r = 2; e.hp -= 5; updateSeaCreature(e, w, 1 / 30);
  assert.ok(e.sea.r > r0 + 1, 'struck: thrown wide');
  const land = world({ x: 15, y: 15 }, (x) => x < 18), f = creature('ringcoil', 13, 15);
  run(f, land, 6, 1 / 30, () => assert.ok(f.x < 18, 'never leaves the water'));
});

test('Sinewake: weaves toward the Wayfarer in an S, bites, then backs off', () => {
  const p = { x: 20, y: 10 }, w = world(p), e = creature('sinewake', 12, 10), ys = [];
  run(e, w, 2.5, 1 / 30, () => ys.push(e.y));
  assert.ok(Math.max(...ys) - Math.min(...ys) > .3, 'lateral weave');
  assert.ok(e.x > 13.5, 'closing in');
  for (let t = 0; t < 8 && !w.hits.length; t += 1 / 30) updateSeaCreature(e, w, 1 / 30);
  assert.ok(w.hits.length >= 1); assert.equal(e.segments, SEA_CREATURES.sinewake.segments);
  const n = w.hits.length; run(e, w, SEA_CREATURES.sinewake.rest * .9); assert.equal(w.hits.length, n, 'retreats after a bite');
});

test('Breachfin: landing shadow, airborne window (the only time it can be hit), crash where the Wayfarer stood', () => {
  const p = { x: 10, y: 10 }, w = world(p), e = creature('breachfin', 5, 10), d = SEA_CREATURES.breachfin;
  updateSeaCreature(e, w, 1 / 30);
  assert.equal(e.sea.phase, 'telegraph'); assert.equal(e.seaTele.type, 'shadow'); assert.equal(e.untargetable, true, 'still under water');
  let airborneTargetable = false; run(e, w, d.telegraph + d.air + .1, 1 / 30, () => { if (e.aloft) airborneTargetable ||= !e.untargetable; });
  assert.ok(airborneTargetable); assert.equal(w.hits.length, 1); assert.equal(e.untargetable, true, 'dives again');
  const q = { x: 10, y: 10 }, w2 = world(q), e2 = creature('breachfin', 5, 10); run(e2, w2, .4); q.x = 14; run(e2, w2, 1.5);
  assert.equal(w2.hits.length, 0, 'moving off the shadow avoids the crash');
  const dry = world({ x: 10, y: 10 }, (x) => x < 8), e3 = creature('breachfin', 5, 10); run(e3, dry, 3);
  assert.equal(dry.hits.length, 0, 'never leaps onto land');
});

test('swamp creatures: the Mire Leech hops through bog water; the Bog Lurker ambushes and drags', () => {
  const p = { x: 10, y: 10 }, w = world(p), leech = creature('mireLeech', 6, 10);
  run(leech, w, 4); assert.ok(w.hits.length >= 1); assert.equal(leech.hidden, false);
  const fen = world({ x: 10, y: 10 }, (x) => x < 8), stuck = creature('mireLeech', 6, 10); run(stuck, fen, 5, 1 / 30, () => assert.ok(stuck.x < 8));
  const q = { x: 10, y: 10 }, w2 = world(q), lurker = creature('bogLurker', 10, 14);
  run(lurker, w2, 2); assert.equal(w2.hits.length, 0); assert.equal(lurker.hidden, true, 'hidden until close');
  q.y = 12.6; updateSeaCreature(lurker, w2, 1 / 30); assert.equal(lurker.seaTele.type, 'bubbles'); assert.equal(lurker.untargetable, false);
  run(lurker, w2, 1); assert.equal(w2.hits.length, 1); assert.equal(w2.pulls, 1);
});

test('in the real game: sea creatures appear on water, stay in water, can be felled for XP, and hit the hull', () => {
  const { m, rx, ry } = findSection('sea', (q) => seaSpawns(q, SEED, 0, 0).some((s) => SEA_CREATURES[s.kind].habitat === 'open'));
  const s = Object.assign(freshSave(), { seed: SEED }), g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld');
  const sea = g.enemies.filter((e) => e.seaKind);
  assert.ok(sea.length >= 1);
  for (const e of sea) assert.ok(SEA_HABITATS[SEA_CREATURES[e.seaKind].habitat].includes(g.map.tiles[e.y * 32 + e.x].kind), 'not relocated onto land');
  const e = sea[0], xp = s.xp; e.hp = 0; e.dead = true; g.defeatEnemy(e);
  assert.ok(s.xp > xp || s.level > 1, 'XP awarded');
  // a hit while aboard is shared with the hull
  grantTidemantle(s, 'test'); s.currency = 999; s.materials.cinderIron = 9; buySkiff(s, { rx, ry, x: 0, y: 0 }); s.boat.aboard = true;
  const water = g.map.tiles.find((t) => t.kind === 'deepOcean' && footprintSailable(g.map, 32, t.x, t.y - .2));
  g.player.x = water.x; g.player.y = water.y - .2;
  const eel = Object.assign(g.enemies.find((q) => q.seaKind) || sea[0], { dead: false, rewarded: false, hp: 26 });
  const hull = s.boat.hull, hp = g.player.hp;
  Object.assign(eel, seaCombatantFields('lanceeel'), { kind: 'lanceeel', x: g.player.x - 3, y: g.player.y, dead: false, rewarded: false });
  const input = { state: { x: 0, y: 0 }, consume: () => false };
  for (let i = 0; i < 90 && s.boat.hull === hull; i++) g.update(1 / 30, input, 50000 + i * 33);
  assert.ok(s.boat.hull < hull, 'hull damaged'); assert.ok(g.player.hp < hp, 'Wayfarer hurt too');
});

test('a save resumed aboard the skiff stays on the water (no relocation to shore)', () => {
  const { rx, ry } = findSection('sea', (q) => q.tiles.filter((t) => t.kind === 'deepOcean').length > 200);
  const s = Object.assign(freshSave(), { seed: SEED }), g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld');
  const water = g.map.tiles.find((t) => t.kind === 'deepOcean' && footprintSailable(g.map, 32, t.x, t.y - .2));
  grantTidemantle(s, 'test'); s.currency = 999; s.materials.cinderIron = 9; buySkiff(s, { rx, ry, x: water.x, y: water.y }); s.boat.aboard = true;
  g.player.x = water.x; g.player.y = water.y - .2; g.loadArea('overworld');
  assert.deepEqual([g.player.x, g.player.y], [water.x, water.y - .2]); assert.equal(s.boat.aboard, true);
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).boat.aboard, true);
});
