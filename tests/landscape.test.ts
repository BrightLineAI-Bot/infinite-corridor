import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, biomeFor, canStep, liftAt, BIOMES, LANDSCAPE_VERSION, fallDamage, reachableFromPlaza } from '../src/landscape.ts';
import { drawLandscapeTile } from '../src/landscape-render.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const SEED = 'LANDTEST';
function section(rx, ry, seed = SEED) { const m = generateRegion(seed, rx, ry); applyLandscape(m, seed, rx, ry); return m; }
function find(biome, seed = SEED, minTiles = 300) {
  for (let r = 2; r <= 40; r++) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r || biomeFor(seed, x, y) !== biome) continue;
    const m = section(x, y, seed);
    if (biome === 'castle' ? m.castle : m.tiles.filter((t) => t.landscape === biome).length >= minTiles) return { m, rx: x, ry: y };
  }
  throw new Error(`no ${biome}`);
}
// Everything the player can reach from the plaza: climb at most one level per jump, drop any height.
function reachable(m) { const seen = reachableFromPlaza(m), out = new Set(); for (let i = 0; i < 1024; i++) if (seen[i]) out.add(`${i % 32},${Math.floor(i / 32)}`); return out; }

test('landscapes are regular but not everywhere, and biomes form ranges across sections', () => {
  const counts = {}; let n = 0, featured = 0;
  // landscape version 1 (version 2's waterbodies are covered in tests/waterbodies.test.ts)
  for (const seed of ['A', 'B', 'C']) for (let rx = -12; rx <= 12; rx++) for (let ry = -12; ry <= 12; ry++) { n++; const b = biomeFor(seed, rx, ry, 1); if (b) { featured++; counts[b] = (counts[b] || 0) + 1; } }
  const share = featured / n;
  assert.ok(share > .28 && share < .5, `share ${share.toFixed(2)}`);
  for (const id of ['mountains', 'desert', 'coast', 'alien', 'castle']) assert.ok(counts[id] > 0, `${id} occurs`);
  // ranges: most mountain sections have a mountain neighbour
  let mountains = 0, joined = 0;
  for (let rx = -12; rx <= 12; rx++) for (let ry = -12; ry <= 12; ry++) if (biomeFor('A', rx, ry) === 'mountains') { mountains++; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => biomeFor('A', rx + dx, ry + dy) === 'mountains')) joined++; }
  assert.ok(joined / mountains > .7, 'mountains cluster into ranges');
});

test('the starting ring and settlements stay as they were; generation is deterministic', () => {
  for (const [rx, ry] of [[0, 0], [1, 0], [0, -1]]) assert.equal(section(rx, ry).landscape, undefined);
  const { rx, ry } = find('mountains');
  assert.deepEqual(section(rx, ry).tiles.map((t) => `${t.kind}:${t.elev || 0}`), section(rx, ry).tiles.map((t) => `${t.kind}:${t.elev || 0}`));
});

test('every biome keeps exits, the plaza, objects and the whole section reachable', () => {
  for (const biome of ['mountains', 'desert', 'coast', 'alien', 'castle']) {
    const { m, rx, ry } = find(biome), reach = reachable(m), e = m.exits, raw = generateRegion(SEED, rx, ry);
    // exits a river or canyon already closes in the original generator are not the landscape's to open
    for (const [x, y] of [[e.north, 1], [e.south, 30], [1, e.west], [30, e.east], [16, 16]].filter(([x, y]) => !raw.tiles[y * 32 + x].blocked)) {
      assert.equal(m.tiles[y * 32 + x].blocked, false, `${biome} exit open at ${x},${y}`);
      assert.equal(m.tiles[y * 32 + x].elev || 0, 0, `${biome} exit at ground level`);
      assert.ok(reach.has(`${x},${y}`), `${biome} exit reachable at ${x},${y}`);
    }
    for (const o of m.objects.filter((q) => q.actions?.length)) {
      const near = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(`${o.x + dx},${o.y + dy}`));
      assert.ok(near, `${biome}: ${o.kind} ${o.name || o.id} reachable`);
    }
    const walkable = m.tiles.filter((q) => !q.blocked && q.kind !== 'lava' && q.x > 0 && q.y > 0 && q.x < 31 && q.y < 31), reached = walkable.filter((q) => reach.has(`${q.x},${q.y}`));
    assert.ok(reached.length / walkable.length > .9, `${biome}: ${reached.length}/${walkable.length} walkable tiles climbable from the plaza`);
  }
});

test('mountains have snow peaks, a summit cairn and a stair trail; castles have reachable battlements', () => {
  const { m } = find('mountains');
  assert.ok(m.tiles.some((t) => t.kind === 'snowPeak' || t.kind === 'snowRock'));
  const summit = m.objects.find((o) => o.landscapeSummit);
  assert.ok(summit && (m.tiles[summit.y * 32 + summit.x].elev || 0) >= 1);
  assert.ok(m.tiles.some((t) => t.kind === 'mountainTrail' && t.slope));
  const c = find('castle').m;
  assert.ok(c.tiles.some((t) => t.kind === 'battlement' && t.elev === 2));
  assert.ok(c.tiles.some((t) => t.kind === 'castleStair' && t.slope));
  assert.ok(reachable(c).has(`${c.castle.gate.x},${c.castle.gate.y}`), 'castle gate reachable');
  const look = c.objects.find((o) => o.id.startsWith('landscape-castle-'));
  assert.equal(c.tiles[look.y * 32 + look.x].kind, 'battlement');
});

test('elevation rule: walk on level ground and slopes, jump up one level, drop one, creatures need slopes', () => {
  const tiles = Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), elev: 0 }));
  tiles[5 * 32 + 6].elev = 1; tiles[5 * 32 + 8].elev = 1; tiles[5 * 32 + 8].slope = true; tiles[5 * 32 + 10].elev = 2;
  const map = { landscape: { version: 1 }, tiles }, player = { isPlayer: true }, jumper = { isPlayer: true, jumping: true }, ghoul = {}, bird = { flying: true };
  const step = (who, fx, tx) => canStep(who, map, 32, fx - .5, 5 - .75, tx - .5, 5 - .75);
  assert.equal(step(player, 5, 6), false, 'a ledge needs a jump'); assert.equal(step(jumper, 5, 6), true, 'a jump climbs one level');
  assert.equal(step(player, 6, 5), true, 'dropping one level is allowed');
  assert.equal(step(player, 7, 8), true, 'slopes are walked'); assert.equal(step(ghoul, 7, 8), true);
  assert.equal(step(ghoul, 5, 6), false, 'ground creatures do not climb ledges'); assert.equal(step(ghoul, 6, 5), false);
  assert.equal(step(jumper, 9, 10), false, 'two levels cannot be jumped'); assert.equal(step(player, 10, 9), true, 'but the player can fall two levels'); assert.equal(step(bird, 5, 6), true, 'fliers ignore elevation');
  assert.equal(canStep(player, { tiles }, 32, 0, 0, 1, 0), true, 'maps without landscape are unchanged');
  assert.ok(liftAt(map, 32, 6 - .5, 5 - .75) > 0);
});

test('in the real game: explored sections keep their terrain; new ones get the landscape and keep it on reload', () => {
  const { rx, ry } = find('mountains');
  const fresh = Object.assign(freshSave(), { seed: SEED }), g = new Game(fresh, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld');
  assert.equal(g.map.landscape?.biome, 'mountains'); assert.equal(fresh.atlas[`${rx},${ry}`].landscapeVersion, LANDSCAPE_VERSION);
  g.loadArea('overworld'); assert.equal(g.map.landscape?.biome, 'mountains', 'kept on reload');
  const old = Object.assign(freshSave(), { seed: SEED }); old.atlas = { [`${rx},${ry}`]: { terrain: 'ash', sites: [] } };
  const og = new Game(old, 0); og.rx = rx; og.ry = ry; og.loadArea('overworld');
  assert.equal(og.map.landscape, undefined, 'explored before the pack: unchanged'); assert.equal(old.atlas[`${rx},${ry}`].landscapeVersion, undefined);
  assert.ok(!og.map.tiles.some((t) => t.elev));
});

test('the player climbs a ledge only with a jump in the real game loop', () => {
  const f = createLabFixture({ lab: 'landscape', scenario: 'mountains', seed: 'LANDLAB' }), g = f.game, m = g.map, at = (x, y) => m.tiles[y * 32 + x];
  g.enemies.forEach((e) => { e.dead = true; });
  const spot = m.tiles.find((t) => !t.blocked && !t.slope && !(t.elev) && t.x < 29 && !at(t.x + 1, t.y).blocked && !at(t.x + 1, t.y).slope && at(t.x + 1, t.y).elev === 1);
  const run = (jump) => { Object.assign(g.player, { x: spot.x, y: spot.y - .25 }); g.jumpUntil = 0; let used = false;
    const input = { state: { x: 1, y: 0 }, consume: (k) => k === 'jump' && jump && !used ? (used = true) : false, reset() {} };
    for (let i = 0; i < 40; i++) g.update(1 / 60, input, 50000 + i * 16.7); return g.player.x; };
  assert.ok(run(false) < spot.x + .55, 'walking stops at the ledge');
  assert.ok(run(true) > spot.x + .9, 'a jump climbs onto it');
});

test('every landscape tile renders, raised tiles draw a cliff face', () => {
  const calls = []; const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get(t, k) { if (k in t) return t[k]; if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad; return (...a) => calls.push([k, ...a]); }, set(t, k, v) { t[k] = v; return true; } });
  const kinds = ['lava', 'volcanicRim', 'ashSlope', 'skyBridge', 'alpineGrass', 'mountainRock', 'snowRock', 'snowPeak', 'crag', 'mountainTrail', 'sand', 'duneFace', 'duneCrest', 'mesaTop', 'beach', 'shallows', 'ocean', 'alienMoss', 'alienPlatform', 'crystalSpire', 'alienPool', 'castleCourt', 'castleStair', 'battlement', 'castleWall', 'castleTower', 'castleKeep'];
  const tiles = Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), elev: 0 }));
  for (const kind of kinds) assert.equal(drawLandscapeTile(ctx, { x: 3, y: 3, kind, elev: 2, landscape: 'mountains', detail: 5 }, 3, 3, 32, tiles, 32), true, kind);
  assert.equal(drawLandscapeTile(ctx, { x: 1, y: 1, kind: 'ash' }, 1, 1, 32, tiles, 32), false);
  assert.ok(calls.filter((c) => c[0] === 'fillRect').length > 200);
});

test('falls: one level is safe, two hurt, three hurt badly, four or more are fatal', () => {
  assert.equal(fallDamage(1, 60), 0); assert.equal(fallDamage(2, 60), 9); assert.equal(fallDamage(3, 60), 24);
  assert.equal(fallDamage(4, 60), Infinity); assert.equal(fallDamage(5, 60), Infinity);
  const f = createLabFixture({ lab: 'landscape', scenario: 'mountains', seed: 'LANDLAB' }), g = f.game, m = g.map, at = (x, y) => m.tiles[y * 32 + x];
  g.enemies.forEach((e) => { e.dead = true; });
  const ledge = (drop) => m.tiles.find((t) => !t.blocked && !t.slope && t.kind !== 'skyBridge' && t.x < 29 && (t.elev || 0) >= drop && [1, 2].every((k) => !at(t.x + k, t.y).blocked && !at(t.x + k, t.y).slope && at(t.x + k, t.y).kind !== 'lava' && (t.elev || 0) - (at(t.x + k, t.y).elev || 0) === drop));
  const walkOff = (t) => { Object.assign(g.player, { x: t.x, y: t.y - .25, hp: g.save.maxHp, invulnerableUntil: 0 }); g.jumpUntil = 0; const hp0 = g.player.hp, input = { state: { x: 1, y: 0 }, consume: () => false, reset() {} };
    const deaths0 = g.save.worldFlags.deaths || 0; let low = hp0; for (let i = 0; i < 40; i++) { g.update(1 / 60, input, 90000 + i * 16.7); low = Math.min(low, g.player.hp); }
    return { lost: hp0 - low, dead: (g.save.worldFlags.deaths || 0) > deaths0 }; }; // death respawns within the same frame, so count deaths
  const two = ledge(2);
  if (two) { const r = walkOff(two); assert.ok(r.lost > 0 && !r.dead, `two levels hurt (${r.lost})`); }
  const four = ledge(4) || ledge(5);
  if (four) assert.equal(walkOff(four).dead, true, 'four levels are fatal');
  assert.ok(two || four, 'the fixture has a cliff to fall from');
});

test('volcanoes have a fatal lava crater and erupt lava bombs near the player; sky bridges span high passes', () => {
  let volcano = null, bridge = null;
  for (let r = 2; r <= 30 && (!volcano || !bridge); r++) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r || biomeFor(SEED, x, y) !== 'mountains') continue;
    const m = section(x, y);
    if (!volcano && m.volcano) volcano = { m, rx: x, ry: y };
    if (!bridge && m.skyBridges?.length) bridge = m;
  }
  assert.ok(volcano, 'a volcano exists'); assert.ok(bridge, 'a sky bridge exists');
  const span = bridge.tiles.filter((t) => t.kind === 'skyBridge');
  assert.ok(span.length >= 1 && span.every((t) => (t.elev || 0) - (t.bridgeOver || 0) >= 2), 'bridges hang at least two levels above the ground they cross');
  const save = Object.assign(freshSave(), { seed: SEED }), g = new Game(save, 0); g.rx = volcano.rx; g.ry = volcano.ry; g.loadArea('overworld');
  const v = g.map.volcano; assert.ok(v);
  assert.equal(g.map.tiles[v.y * 32 + v.x].kind, 'lava');
  g.enemies.forEach((e) => { e.dead = true; });
  Object.assign(g.player, { x: v.x + 3, y: v.y + 3 });
  const input = { state: { x: 0, y: 0 }, consume: () => false, reset() {} };
  let bombs = 0; for (let i = 0; i < 60 * (v.period + 1); i++) { g.update(1 / 60, input, 200000 + i * 16.7); bombs = Math.max(bombs, (g.packEffects || []).filter((f) => f.kind === 'lavaBomb').length); if (g.player.hp < 20) g.player.hp = g.save.maxHp; }
  assert.ok(bombs >= 3, `eruption threw ${bombs} lava bombs`);
});
