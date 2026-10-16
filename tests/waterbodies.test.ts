import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, biomeFor, BIOMES, DEEP_WATER, LANDSCAPE_VERSION, reachableFromPlaza, placeIslandLandmark } from '../src/landscape.ts';
import { drawLandscapeTile, landscapeAtlasColor } from '../src/landscape-render.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { TIDEMANTLE, MIRE, swimUpkeep, grantTidemantle, healthCeiling, rotTick, clearRot } from '../src/water-traversal.ts';

const SEED = 'LANDTEST';
const section = (rx, ry, version = LANDSCAPE_VERSION, seed = SEED) => { const m = generateRegion(seed, rx, ry); applyLandscape(m, seed, rx, ry, { version }); return m; };
function find(biome, seed = SEED, ok = () => true) {
  for (let r = 2; r <= 40; r++) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r || biomeFor(seed, x, y) !== biome) continue;
    const m = section(x, y, LANDSCAPE_VERSION, seed);
    if (ok(m)) return { m, rx: x, ry: y };
  }
  throw new Error(`no ${biome}`);
}

test('landscape version 1 output is byte-identical (explored journeys never regenerate)', () => {
  assert.ok(LANDSCAPE_VERSION >= 2);
  const h = createHash('sha256');
  for (const seed of ['LANDTEST', 'CINDER-VERGE-47']) for (let ry = -6; ry <= 6; ry++) for (let rx = -6; rx <= 6; rx++) {
    const m = generateRegion(seed, rx, ry); applyLandscape(m, seed, rx, ry, { version: 1 });
    h.update(JSON.stringify([biomeFor(seed, rx, ry, 1), m.tiles, m.objects, m.enemySpawns, m.landscape, m.weather]));
  }
  assert.equal(h.digest('hex'), '3b65d401100ea1a45f854b20f5b6d806a91c9053740f85bc72776c62f0da8dc2');
});

test('version 2 adds seas, isles, lakes, swamps and blight mires; seas span many sections', () => {
  const counts = {};
  for (let ry = -40; ry <= 40; ry++) for (let rx = -40; rx <= 40; rx++) { const b = biomeFor(SEED, rx, ry); if (b) counts[b] = (counts[b] || 0) + 1; }
  for (const id of Object.keys(BIOMES)) assert.ok(counts[id] > 0, `${id} occurs`);
  for (const id of ['sea', 'isles', 'lake', 'swamp', 'blight']) { assert.ok(BIOMES[id].name); assert.ok(landscapeAtlasColor(id)); }
  assert.ok(counts.swamp > counts.blight, 'poison swamps are the rarer kind');
  // the largest body of open water (sea + coast + isles sections, 4-connected) is massive
  const wet = (x, y) => ['sea', 'coast', 'isles'].includes(biomeFor(SEED, x, y)), seen = new Set();
  let largest = 0;
  for (let ry = -40; ry <= 40; ry++) for (let rx = -40; rx <= 40; rx++) {
    if (seen.has(`${rx},${ry}`) || !wet(rx, ry)) continue;
    const q = [[rx, ry]]; seen.add(`${rx},${ry}`); let n = 0;
    while (q.length) { const [x, y] = q.pop(); n++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + dx},${y + dy}`; if (Math.abs(x + dx) <= 40 && Math.abs(y + dy) <= 40 && !seen.has(k) && wet(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } } }
    largest = Math.max(largest, n);
  }
  assert.ok(largest >= 150, `largest sea spans ${largest} sections`);
});

test('open sea is mostly deep water, while exits and the plaza stay reachable on foot', () => {
  const { m } = find('sea', SEED, (q) => q.tiles.filter((t) => t.kind === 'deepOcean').length > 300);
  assert.equal(m.landscape.version, LANDSCAPE_VERSION); assert.equal(m.landscape.biome, 'sea');
  const reach = reachableFromPlaza(m), e = m.exits;
  for (const [x, y] of [[e.north, 1], [e.south, 30], [1, e.west], [30, e.east], [16, 16]]) assert.ok(reach[y * 32 + x] || m.tiles[y * 32 + x].blocked && !DEEP_WATER.includes(m.tiles[y * 32 + x].kind), `exit ${x},${y}`);
  assert.ok(m.tiles.every((t) => !DEEP_WATER.includes(t.kind) || t.blocked), 'deep water is never walkable');
});

test('island landmarks stand on islands reached by swimming, deterministically', () => {
  let found = null;
  for (let ry = -30; ry <= 30 && !found; ry++) for (let rx = -30; rx <= 30 && !found; rx++) {
    if (!['sea', 'isles', 'coast'].includes(biomeFor(SEED, rx, ry))) continue;
    const m = section(rx, ry), o = m.objects.find((q) => q.islandLandmark);
    if (o) found = { m, o, rx, ry };
  }
  assert.ok(found, 'an island landmark exists');
  const { m, o, rx, ry } = found, t = m.tiles[o.y * 32 + o.x];
  assert.equal(t.blocked, false); assert.equal(reachableFromPlaza(m)[o.y * 32 + o.x], 0, 'not reachable on foot');
  assert.deepEqual(section(rx, ry).objects.find((q) => q.islandLandmark), o, 'same landmark on regeneration');
  assert.equal(placeIslandLandmark(section(rx + 1, ry), SEED, rx + 1, ry), null, 'one per macrocell');
});

test('lakes, swamps and blight mires carry their water kinds and keep the section walkable', () => {
  const kinds = { lake: ['lakeWater', 'shallows'], swamp: ['bogGround', 'mireWater', 'swampWater'], blight: ['toxicBog', 'toxicMire', 'toxicWater'] };
  for (const [biome, want] of Object.entries(kinds)) {
    const { m, rx, ry } = find(biome, SEED, (q) => want.every((k) => q.tiles.some((t) => t.kind === k)));
    const reach = reachableFromPlaza(m), before = reachableFromPlaza(generateRegion(SEED, rx, ry)); // the generator's own walled pockets aside
    const was = (o) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => before[(o.y + dy) * 32 + o.x + dx]);
    assert.ok(reach[16 * 32 + 16], `${biome}: plaza on foot`);
    for (const o of m.objects.filter((q) => q.actions?.length && !q.islandLandmark && was(q))) assert.ok([[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach[(o.y + dy) * 32 + o.x + dx]), `${biome}: ${o.kind} reachable`);
  }
});

test('in the real game a section first seen at version 1 keeps version 1 terrain', () => {
  let rx = 0, ry = 0;
  outer: for (let y = -30; y <= 30; y++) for (let x = -30; x <= 30; x++) if (biomeFor(SEED, x, y, 1) !== biomeFor(SEED, x, y, 2) && biomeFor(SEED, x, y, 2) === 'sea') { rx = x; ry = y; break outer; }
  assert.ok(rx || ry);
  const s = Object.assign(freshSave(), { seed: SEED }); s.atlas = { [`${rx},${ry}`]: { terrain: 'ash', landscapeVersion: 1, sites: [] } };
  const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld');
  assert.equal(g.map.landscape?.version ?? 1, 1);
  assert.deepEqual(g.map.tiles.map((t) => t.kind), section(rx, ry, 1).tiles.map((t) => t.kind));
  assert.equal(s.atlas[`${rx},${ry}`].landscapeVersion, 1, 'pin kept');
  const n = Object.assign(freshSave(), { seed: SEED }), ng = new Game(n, 0); ng.rx = rx; ng.ry = ry; ng.loadArea('overworld');
  assert.equal(ng.map.landscape.version, LANDSCAPE_VERSION); assert.equal(n.atlas[`${rx},${ry}`].landscapeVersion, LANDSCAPE_VERSION);
});

test('deep ocean tires the swimmer twice as fast', () => {
  assert.equal(TIDEMANTLE.drainMultiplier.deepOcean, 2);
  for (const kind of ['deepOcean', 'lakeWater', 'swampWater', 'toxicWater']) assert.ok(TIDEMANTLE.swimKinds.includes(kind), kind);
  const a = { stamina: 50 }, b = { stamina: 50 };
  swimUpkeep(a, 1, 'ocean'); swimUpkeep(b, 1, 'deepOcean');
  assert.equal(50 - b.stamina, 2 * (50 - a.stamina));
});

function marsh(kind) {
  const s = freshSave(), g = new Game(s, 0);
  g.area = 'overworld';
  g.map = { ...g.map, landscape: { version: 2, biome: 'blight' }, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind, landscape: 'blight', elev: 0, blocked: false })) };
  g.player.x = 4; g.player.y = 16; g.enemies = [];
  return { s, g };
}
const walk = (g, frames, dt = 1 / 30) => { const input = { state: { x: 1, y: 0 }, consume: () => false }; for (let i = 0; i < frames; i++) g.update(dt, input, i * dt * 1000); };

test('mire slows the Wayfarer; the blight mire rots maximum health until rest', () => {
  const dry = marsh('toxicBog'), mire = marsh('toxicMire');
  walk(dry.g, 30); walk(mire.g, 30);
  assert.ok(mire.g.player.x - 4 < (dry.g.player.x - 4) * .7, 'mire is slow');
  assert.equal(dry.s.rot, 0, 'blight bog ground is safe');
  assert.ok(mire.s.rot > 0, 'murk rots');
  assert.ok(mire.g.player.hp <= healthCeiling(mire.s), 'health capped below the rotted maximum');
  const s = freshSave(); for (let i = 0; i < 1000; i++) rotTick(s, 'toxicWater', 1);
  assert.equal(s.rot, Math.floor(s.maxHp * MIRE.maxRotFraction), 'rot is bounded');
  assert.equal(rotTick(s, 'mireWater', 1), false, 'plain swamp does not rot');
  assert.ok(clearRot(s) > 0); assert.equal(s.rot, 0);
});

test('resting at a Wayglass clears the rot; saves normalise rot additively', () => {
  const { s, g } = marsh('toxicMire'); walk(g, 60);
  assert.ok(s.rot > 0);
  const anchor = { id: 'test-anchor', kind: 'checkpoint', name: 'Test Wayglass', x: Math.round(g.player.x), y: Math.round(g.player.y), state: 'dormant', actions: ['activate'] };
  g.map.objects.push(anchor); g.player.x = anchor.x; g.player.y = anchor.y; g.interact('activate', anchor.id);
  assert.equal(s.rot, 0, 'rest clears rot');
  assert.equal(freshSave().rot, 0);
  const old = freshSave(); delete old.rot; assert.equal(migrateSave(JSON.parse(JSON.stringify(old))).rot, 0);
  assert.equal(migrateSave({ ...freshSave(), rot: 7 }).rot, 7, 'rot survives reload');
});

test('the Tidemantle swims lake, swamp and blight water; without it they drown', () => {
  for (const kind of ['lakeWater', 'swampWater', 'toxicWater', 'deepOcean']) {
    const a = marsh(kind); a.g.map.tiles.forEach((t) => { if (t.x < 6) Object.assign(t, { kind: 'beach', blocked: false }); else t.blocked = true; });
    walk(a.g, 60); assert.equal(a.s.worldFlags.deaths, 1, `${kind} drowns without the Tidemantle`);
    const b = marsh(kind); b.g.map.tiles.forEach((t) => { if (t.x < 6) Object.assign(t, { kind: 'beach', blocked: false }); else t.blocked = true; });
    grantTidemantle(b.s, 'test'); walk(b.g, 60); assert.ok(!b.s.worldFlags.deaths, `${kind} swimmable`); assert.equal(b.g.swimKind, kind);
  }
});

test('every new water and swamp tile renders', () => {
  const grad = { addColorStop() {} }, calls = [];
  const ctx = new Proxy({}, { get(t, k) { if (k in t) return t[k]; if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad; return (...a) => calls.push(k); }, set(t, k, v) { t[k] = v; return true; } });
  const tiles = Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), elev: 0 }));
  for (const kind of ['deepOcean', 'lakeWater', 'bogGround', 'mireWater', 'swampWater', 'toxicBog', 'toxicMire', 'toxicWater']) assert.equal(drawLandscapeTile(ctx, { x: 3, y: 3, kind, elev: 0, landscape: 'swamp', detail: 4 }, 3, 3, 32, tiles, 32), true, kind);
});
