import test from 'node:test';
import assert from 'node:assert/strict';
import { generateExpeditionDungeon } from '../src/underlands.ts';
import { applyLandscape, trappedTiles, ensureReturnable, canReturnTo, reachableFrom } from '../src/landscape.ts';
import { generateRegion } from '../src/world.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { drawLandscapeTile, drawHazardBrinks, levelName, LEVEL_WASH } from '../src/landscape-render.ts';

const flat = (w, h, f) => Array.from({ length: w * h }, (_, i) => ({ x: i % w, y: Math.floor(i / w), kind: 'chasmLedge', blocked: false, landscape: 'underlands', elev: 0, ...f(i % w, Math.floor(i / w)) }));
const recorder = () => { const calls = []; return { calls, ctx: new Proxy({}, { get: (t, k) => (k in t ? t[k] : /Gradient$/.test(String(k)) ? () => ({ addColorStop() {} }) : (...a) => calls.push([k, ...a])), set: (t, k, v) => ((t[k] = v), true) }) }; };

test('no trap pockets: every reachable floor in themed dungeons and landscape sections leads back to the start', () => {
  for (let i = 0; i < 70; i++) for (const theme of ['chasm', 'frozen', 'river', 'lavaBog']) {
    const m = generateExpeditionDungeon('TRAPS', `dungeon:TRAPS:${i}`, ['hollow', 'cistern', 'kiln'][i % 3], { theme });
    assert.equal(trappedTiles(m, m.width, m.height, m.entry).length, 0, `${theme} #${i}`);
  }
  let sections = 0;
  for (let rx = -9; rx <= 9; rx++) for (let ry = -9; ry <= 9; ry++) {
    const m = generateRegion('TRAPS', rx, ry, 0); applyLandscape(m, 'TRAPS', rx, ry, {});
    if (!m.landscape) continue; sections++;
    assert.equal(trappedTiles(m, 32, 32, { x: 16, y: 16 }).length, 0, `section ${rx},${ry}`);
  }
  assert.ok(sections > 50, `sampled ${sections} landscape sections`);
});

test('ensureReturnable raises a pit floor so its walls become climbable', () => {
  // a 1-tile pit at level 0 ringed by level-3 ground: reachable by dropping in, impossible to leave
  const map = { tiles: flat(7, 7, (x, y) => ({ elev: x === 3 && y === 3 ? 0 : 3 })) };
  assert.equal(trappedTiles(map, 7, 7, { x: 0, y: 0 }).length, 1);
  ensureReturnable(map, 7, 7, { x: 0, y: 0 });
  assert.equal(map.tiles[3 * 7 + 3].elev, 2, 'raised to one below the rim');
  assert.equal(trappedTiles(map, 7, 7, { x: 0, y: 0 }).length, 0);
  assert.ok(reachableFrom(map, 7, 7, { x: 0, y: 0 })[3 * 7 + 3] && canReturnTo(map, 7, 7, { x: 0, y: 0 })[3 * 7 + 3]);
});

function levelGame(tiles, w, h, at) {
  const s = freshSave(), g = new Game(s, 0);
  g.map = { ...g.map, width: w, height: h, exits: null, objects: [{ id: 'dungeon-exit', kind: 'exit', x: 1, y: 1, actions: ['exit'] }], enemySpawns: [], tiles, landscape: { biome: 'underlands:chasm' }, entry: { x: 1, y: 1 } };
  g.area = 'dungeon'; g.enemies = []; g.player.x = at.x; g.player.y = at.y;
  return { s, g };
}

test('the brink guard stops walkers at a chasm and at a fatal drop; a dodge roll still goes over', () => {
  // chasm to the east
  let { s, g } = levelGame(flat(10, 6, (x) => (x >= 6 ? { kind: 'abyss' } : {})), 10, 6, { x: 3, y: 2 });
  for (let i = 0; i < 120; i++) g.update(1 / 30, { state: { x: 1, y: 0 }, consume: () => false }, i * 33);
  assert.equal(s.worldFlags.deaths || 0, 0, 'walking never falls in'); assert.ok(g.player.x < 6);
  assert.equal(g.ledgeHint?.kind, 'brink'); assert.match(g.message, /bottomless chasm/);
  let rolled = false;
  for (let i = 0; i < 60 && !s.worldFlags.deaths; i++) g.update(1 / 30, { state: { x: 1, y: 0 }, consume: (k) => k === 'dodge' && !rolled && (rolled = true) }, 5000 + i * 33);
  assert.equal(s.worldFlags.deaths, 1, 'a deliberate roll is lethal');
  // a four-level cliff to the east
  ({ s, g } = levelGame(flat(10, 6, (x) => ({ elev: x >= 6 ? 0 : 4 })), 10, 6, { x: 3, y: 2 }));
  for (let i = 0; i < 120; i++) g.update(1 / 30, { state: { x: 1, y: 0 }, consume: () => false }, i * 33);
  assert.equal(s.worldFlags.deaths || 0, 0, 'walking never steps off a fatal drop'); assert.ok(g.player.x < 6);
  assert.match(g.message, /fatal 4-level fall/);
  // a two-level drop still hurts but is allowed
  ({ s, g } = levelGame(flat(10, 6, (x) => ({ elev: x >= 6 ? 0 : 2 })), 10, 6, { x: 3, y: 2 }));
  const hp = g.player.hp;
  for (let i = 0; i < 120; i++) g.update(1 / 30, { state: { x: 1, y: 0 }, consume: () => false }, i * 33);
  assert.ok(g.player.x >= 6 && g.player.hp < hp, 'damaging drops are still allowed');
});

test('Stuck? returns a dungeon wayfarer to the entrance, frees an overworld one, and has a cooldown', () => {
  const { g } = levelGame(flat(10, 6, () => ({})), 10, 6, { x: 8, y: 4 });
  assert.equal(g.unstick(1000), true);
  assert.deepEqual([g.player.x, g.player.y], [1, 1]);
  g.player.x = 8; assert.equal(g.unstick(2000), false, 'cooldown'); assert.match(g.message, /ready in/);
  assert.equal(g.unstick(32000), true);
  // overworld: a pit nobody can climb out of
  const s = freshSave(), o = new Game(s, 0);
  o.map = { ...o.map, landscape: { biome: 'mountains' }, tiles: Array.from({ length: 1024 }, (_, i) => { const x = i % 32, y = Math.floor(i / 32); return { x, y, kind: 'mountainRock', blocked: false, landscape: 'mountains', elev: x >= 24 && x <= 26 && y >= 24 && y <= 26 ? 0 : 3 }; }) };
  o.area = 'overworld'; o.player.x = 25; o.player.y = 25 - .72 + .5;
  assert.equal(o.unstick(1000), true);
  const t = o.map.tiles[Math.floor(o.player.y) * 32 + Math.floor(o.player.x)];
  assert.ok(canReturnTo(o.map, 32, 32, { x: 16, y: 16 })[t.y * 32 + t.x], 'landed on ground that leads out');
  assert.ok(Math.hypot(o.player.x - 25, o.player.y - 25) < 3, 'close to where they were stuck');
});

test('every level has its own wash and notch count; pit edges and the level readout render', () => {
  assert.equal(levelName(0), 'GROUND'); assert.equal(levelName(3), 'LEVEL 3');
  assert.ok(LEVEL_WASH.every((v, i) => !i || v > LEVEL_WASH[i - 1]), 'each level is lighter than the one below');
  const notches = (e) => { const tiles = flat(3, 3, (x, y) => ({ elev: x === 1 && y === 1 ? e : 0 })), r = recorder(); drawLandscapeTile(r.ctx, tiles[4], 1, 1, 32, tiles, 3); return r.calls.filter(([k, , , w, h]) => k === 'fillRect' && w < 3 && h > 4).length; };
  const base = notches(1);
  assert.equal(notches(3) - base, 4, 'two more levels, two more groove+lip notches'); assert.equal(notches(5) - base, 8);
  const pit = flat(3, 1, (x) => (x === 2 ? { kind: 'abyss' } : {})), r = recorder();
  drawHazardBrinks(r.ctx, { tiles: pit, landscape: {} }, 3, 0, 0, 3, 1, 32);
  assert.ok(r.calls.filter(([k]) => k === 'fillRect').length >= 6, 'shadow + crumbling teeth on the pit edge');
});
