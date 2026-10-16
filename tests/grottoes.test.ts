import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, biomeFor } from '../src/landscape.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { DIVE, diveSite, generateDiveSite, grantLens, buyRig } from '../src/diving.ts';
import { GROTTO, GROTTO_THEMES, DIVE_GENERATOR, generateGrotto, grottoTheme } from '../src/grottoes.ts';
import { SEA_CREATURES, SEA_HABITATS, seaCombatantFields, updateSeaCreature } from '../src/sea-creatures.ts';
import { buySkiff } from '../src/boats.ts';
import { grantTidemantle } from '../src/water-traversal.ts';
import { drawLandscapeTile } from '../src/landscape-render.ts';
import { dungeonHistory } from '../src/interactions.ts';

const SEED = 'LANDTEST';
function reach(map) {
  const seen = new Set([`${map.entry.x},${map.entry.y}`]), q = [map.entry];
  while (q.length) { const p = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx, y = p.y + dy, k = `${x},${y}`, t = map.tiles[y * map.width + x]; if (t && !t.blocked && !seen.has(k)) { seen.add(k); q.push({ x, y }); } } }
  return seen;
}
const ids = Array.from({ length: 24 }, (_, i) => `dive:${SEED}:${i - 12}:${(i * 7) % 11 - 5}`);

test('dive generator 1 (the release-107 Sunken Reach) is byte-identical for pinned dive histories', () => {
  const h = createHash('sha256');
  for (const id of ['dive:A:1:2', 'dive:B:-4:7', 'dive:C:9:-3']) h.update(JSON.stringify(generateDiveSite('S', id)));
  assert.equal(h.digest('hex'), '60aab702e0cb9a3fdc7bf16f9cce3c162dfa654fd1f1041a12ef6351a4789d28');
  const m = generateDiveSite('S', 'dive:A:1:2'); assert.equal(m.recipe, 'dive-site'); assert.equal(m.name, 'Sunken Reach'); assert.equal(m.seaSpawns, undefined, 'no beasts in the old reach');
});

test('grottoes: four themes, deterministic, every object and spawn reachable, air within one breath', () => {
  const themes = new Set();
  for (const id of ids) {
    const m = generateGrotto(SEED, id), r = reach(m); themes.add(m.grottoTheme);
    assert.equal(m.grottoTheme, grottoTheme(SEED, id)); assert.equal(m.name, GROTTO_THEMES[m.grottoTheme].name);
    assert.deepEqual(generateGrotto(SEED, id).tiles, m.tiles, 'deterministic');
    assert.ok(m.underwater && m.arena);
    for (const o of [...m.objects, ...m.seaSpawns]) assert.ok(r.has(`${o.x},${o.y}`), `${m.name}: ${o.kind} reachable`);
    for (const q of m.seaSpawns) assert.ok(SEA_HABITATS[SEA_CREATURES[q.kind].habitat].includes(m.tiles[q.y * m.width + q.x].kind), `${q.kind} spawns in its habitat`);
    assert.equal(m.seaSpawns.filter((q) => q.kind === 'elderWyrm').length, 1, 'one Elder Wyrm');
    assert.ok(m.seaSpawns.length - 1 >= GROTTO.beasts[0] && m.seaSpawns.length - 1 <= GROTTO.beasts[1]);
    const breaths = [m.entry, ...m.pockets]; let gap = 0;
    for (const p of m.path) { gap++; if (breaths.some((b) => b.x === p.x && b.y === p.y)) gap = 0; assert.ok(gap <= DIVE.maxPocketGap + 1, `${m.name}: air within reach`); }
    assert.ok(m.currents.length > 0, 'currents');
    for (const p of m.pockets) assert.equal(m.tiles[p.y * m.width + p.x].current, undefined, 'no air pocket in a current');
    for (const t of m.tiles) if (t.current) assert.equal(Math.abs(t.current.dx) + Math.abs(t.current.dy), 1);
  }
  for (const t of Object.keys(GROTTO_THEMES)) assert.ok(themes.has(t), `${t} occurs`);
  assert.ok(GROTTO.currentSpeed < 2.4 * DIVE.speed * .7, 'a current never stops the climb');
});

test('Elder Wyrm: weaves toward the diver, marks a straight lunge, strikes, rests; long and huge', () => {
  const p = { x: 10, y: 10 }, hits = [], w = { player: p, water: () => true, hurt: (n) => hits.push(n), pull() {} }, e = { kind: 'elderWyrm', x: 4, y: 10, ...seaCombatantFields('elderWyrm') }, d = SEA_CREATURES.elderWyrm;
  assert.equal(e.boss, true); assert.equal(e.segments, 12); assert.ok(e.scale > 1);
  const phases = new Set(), ys = []; let teleBeforeStrike = false;
  for (let t = 0; t < 12; t += 1 / 30) { updateSeaCreature(e, w, 1 / 30); phases.add(e.sea.phase); ys.push(e.y); if (e.sea.phase === 'telegraph' && e.seaTele?.type === 'line') teleBeforeStrike = true; if (e.sea.phase === 'strike') assert.ok(teleBeforeStrike); }
  for (const ph of ['weave', 'telegraph', 'strike', 'rest']) assert.ok(phases.has(ph), ph);
  assert.ok(Math.max(...ys) - Math.min(...ys) > .3, 'weaves'); assert.ok(hits.length >= 1);
});

test('in the real game: a new dive opens a themed grotto with its beasts; currents push; an older dive keeps the Sunken Reach', () => {
  let found = null;
  for (let r = 2; r <= 30 && !found; r++) for (let y = -r; y <= r && !found; y++) for (let x = -r; x <= r && !found; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r || biomeFor(SEED, x, y) !== 'sea') continue;
    const m = generateRegion(SEED, x, y); applyLandscape(m, SEED, x, y); const site = diveSite(m, SEED, x, y); if (site) found = { rx: x, ry: y, site };
  }
  const s = Object.assign(freshSave(), { seed: SEED }); grantTidemantle(s, 't'); s.currency = 999; s.materials.cinderIron = 9; buySkiff(s, { rx: 0, ry: 0, x: 1, y: 1 }); buyRig(s); grantLens(s, 't');
  const g = new Game(s, 0); g.rx = found.rx; g.ry = found.ry; g.loadArea('overworld'); s.boat.aboard = true;
  const buoy = g.map.objects.find((o) => o.kind === 'diveSite'); g.player.x = buoy.x; g.player.y = buoy.y - .2;
  assert.equal(g.interact('dive', buoy.id).ok, true);
  assert.equal(g.map.recipe, 'grotto'); assert.ok(GROTTO_THEMES[g.map.grottoTheme]);
  const beasts = g.enemies.filter((e) => e.seaKind); assert.equal(beasts.length, g.map.seaSpawns.length); assert.ok(beasts.some((e) => e.kind === 'elderWyrm' && e.boss));
  // a current pushes the diver along its flow
  const c = g.map.currents.find((q) => !g.map.objects.some((o) => Math.hypot(o.x - q.x, o.y - q.y) < 2));
  g.enemies = []; g.player.x = c.x; g.player.y = c.y - .2; const x0 = g.player.x, y0 = g.player.y;
  const input = { state: { x: 0, y: 0 }, consume: () => false, reset() {} };
  for (let i = 0; i < 10; i++) g.update(1 / 30, input, 200000 + i * 33);
  assert.ok((g.player.x - x0) * c.dx + (g.player.y - y0) * c.dy > .2, 'carried by the current');
  assert.equal(dungeonHistory(s, g.save.session.activeDungeonId).diveGenerator, DIVE_GENERATOR, 'new dives pin generator 2');
  // a dive history made under release 107 (visited, no pin) keeps the Sunken Reach
  const old = Object.assign(freshSave(), { seed: SEED }); grantTidemantle(old, 't'); old.currency = 999; old.materials.cinderIron = 9; buySkiff(old, { rx: 0, ry: 0, x: 1, y: 1 }); buyRig(old); grantLens(old, 't');
  const oldHistory = dungeonHistory(old, `dive:${SEED}:${found.rx}:${found.ry}`); oldHistory.visits = 1; delete oldHistory.diveGenerator;
  const og = new Game(old, 0); og.rx = found.rx; og.ry = found.ry; og.loadArea('overworld'); og.player.x = buoy.x; og.player.y = buoy.y - .2; old.boat.aboard = true;
  assert.equal(og.interact('dive', buoy.id).ok, true);
  assert.equal(og.map.recipe, 'dive-site'); assert.equal(og.map.name, 'Sunken Reach'); assert.equal(oldHistory.diveGenerator, 1);
});

test('defeating the Elder Wyrm pays its trophy once; grotto tiles render', () => {
  const s = Object.assign(freshSave(), { seed: SEED }), g = new Game(s, 0);
  const wyrm = Object.assign({ id: 'w', kind: 'elderWyrm', x: 3, y: 3 }, seaCombatantFields('elderWyrm')), before = s.currency;
  wyrm.hp = 0; wyrm.dead = true; g.defeatEnemy(wyrm);
  assert.ok(s.currency >= before + 40); assert.equal(s.worldFlags['leviathan:elderWyrm'], true);
  const grad = { addColorStop() {} }, ctx = new Proxy({}, { get(t, k) { if (k in t) return t[k]; if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
  const tiles = Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), elev: 0 }));
  for (const kind of ['chapelFloor', 'chapelWall', 'kelpWall', 'pearlSand', 'trenchWall', 'ruinFloor', 'ruinWall', 'seaCurrent']) assert.equal(drawLandscapeTile(ctx, { x: 3, y: 3, kind, elev: 0, landscape: 'underwater', detail: 1, current: { dx: 0, dy: 1 } }, 3, 3, 32, tiles, 32), true, kind);
});
