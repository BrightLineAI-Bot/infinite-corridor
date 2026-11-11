// Digging in the chasms (Tim, 2026-11-11: "you can dig in the chasms... check that that's in place and functioning"). The Canyon
// craters ("the chasm dungeons", release 688) are packed with clods. End to end, through the door on the land and the real
// input: in the robot, pushing into a clod drills it out with the auger; on foot, Act with wood and stone lashes a shovel and
// digs one out; both stay dug when the crater is loaded again, and in a reloaded save. canyon-craters.test.ts covers the
// drill's tempers, cave-ins and finds by calling drillAhead directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, SETTLED_MESSAGE } from '../src/game.ts';
import { CANYON, canyonHere, isClod } from '../src/canyon.ts';

const SEEDS = ['CANYON1', 'CANYON2'];
const craters = new Map();
const findCrater = (seed) => { if (craters.has(seed)) return craters.get(seed); let spot = null;
  for (let x = 6; x < 90 && !spot; x++) for (let y = -40; y < 40 && !spot; y++) if (canyonHere(seed, x, y)) { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld', false); if (g.map.objects.some((o) => o.dungeonType === 'canyon')) spot = [x, y]; }
  craters.set(seed, spot); return spot; };
// Through the crater's door on the land, as a player does (Act on the door).
function enter(seed, { robot = false, wood = 0, stone = 0 } = {}) {
  const [x, y] = findCrater(seed), s = freshSave(); s.seed = seed; if (robot) s.mech = { built: true, active: true, mode: 'robot', plate: 10 }; s.materials = { ...(s.materials || {}), wood, stone };
  const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld', false); g.enemies = [];
  const o = g.map.objects.find((q) => q.dungeonType === 'canyon'); g.player.x = o.x; g.player.y = o.y; g.message = '';
  const r = g.interact('enter', o.id); assert.ok(r.ok, r.message); assert.equal(g.area, 'dungeon'); assert.ok(g.map.canyon, 'a crater');
  return { s, g };
}
const tileAt = (g, x, y) => g.map.tiles[y * g.map.width + x];
// The nearest clod of `kind` to the arrival with open, safe floor on its west side, and that floor reached by walking.
function clodBeside(g, kinds) {
  const W = g.map.width, safe = (t) => t && !t.blocked && !['lava', 'abyss', 'lakeWater', 'canyon'].includes(t.kind);
  return g.map.tiles.filter((q) => kinds.includes(q.kind) && safe(tileAt(g, q.x - 1, q.y)) && q.x > 1 && q.x < W - 2).sort((a, b) => Math.hypot(a.x - g.player.x, a.y - g.player.y) - Math.hypot(b.x - g.player.x, b.y - g.player.y))[0];
}
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const push = (g, x, y, seconds, t0 = 1000) => { let t = t0; for (let i = 0; i < seconds * 30; i++) { g.enemies = []; g.update(1 / 30, { state: { x, y }, consume: () => false, held: () => false }, t += 1000 / 30); } return t; };

test('a crater opens from the land with no stray "settles you" notice: you arrive at its way in', () => {
  for (const seed of SEEDS) { const { g } = enter(seed); assert.notEqual(g.message, SETTLED_MESSAGE, `${seed}: ${g.message}`); const e = g.map.entry; assert.ok(Math.hypot(g.player.x - e.x, g.player.y - e.y) <= 2.5, `${seed}: near the way in`); }
});

test('in the robot: hold the stick into a clod and the auger drills it out; it stays out when the crater loads again and in a reloaded save', () => {
  for (const seed of SEEDS) {
    const { s, g } = enter(seed, { robot: true }); assert.ok(g.mechUp(), 'the robot is up in the crater');
    const c = clodBeside(g, [CANYON.kinds.plain, CANYON.kinds.green]); assert.ok(c, 'a clod beside open floor');
    g.player.x = c.x - 1; g.player.y = c.y - .25; const id = g.areaId();
    let t = 1000; for (let i = 0; i < 4 * 30 && c.blocked; i++) { g.enemies = []; g.update(1 / 30, { state: { x: 1, y: 0 }, consume: () => false, held: () => false }, t += 1000 / 30); }
    assert.equal(tileAt(g, c.x, c.y).blocked, false, `${seed}: drilled through by pushing`);
    const h = s.consequences.dungeons[id].canyon, k = c.y * g.map.width + c.x; assert.ok(h.drilled.includes(k), 'recorded in the crater\'s history');
    t = push(g, 1, 0, .5, t); assert.ok(g.player.x > c.x - .6, 'and walked on into the hole');
    g.loadArea('dungeon', false); assert.equal(tileAt(g, c.x, c.y).blocked, false, 'still open when the crater loads again');
    const r = new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(t)))), 50000); assert.equal(r.areaId(), id); assert.equal(tileAt(r, c.x, c.y).blocked, false, 'and in a reloaded save');
  }
});

test('on foot: pushing will not dig a clod, and says how; Act with wood and stone lashes a shovel and digs it out, and it stays dug', () => {
  for (const seed of SEEDS) {
    const { s, g } = enter(seed, { wood: 2, stone: 2 }); assert.ok(!g.mechUp());
    const c = clodBeside(g, [CANYON.kinds.plain, CANYON.kinds.green, CANYON.kinds.yellow]); assert.ok(c);
    g.player.x = c.x - 1; g.player.y = c.y - .25; push(g, 1, 0, 1);
    assert.ok(tileAt(g, c.x, c.y).blocked, 'pushing alone: no'); assert.match(g.message, /shovel/); assert.match(g.message, /robot/);
    // Act, facing the clod (the real input: interact)
    let pressed = false; g.enemies = []; g.update(1 / 30, { state: { x: 0, y: 0 }, consume: (k) => k === 'interact' && !pressed ? (pressed = true) : false, held: () => false }, 9000);
    assert.equal(tileAt(g, c.x, c.y).blocked, false, `${seed}: the shovel dug it out (${g.message})`); assert.match(g.message, /shovel/i);
    assert.equal(s.materials.wood, 1); assert.equal(s.materials.stone, 1);
    const id = g.areaId(); g.loadArea('dungeon', false); assert.equal(tileAt(g, c.x, c.y).blocked, false, 'stays dug');
    const r = new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(9100)))), 60000); assert.equal(r.areaId(), id); assert.equal(tileAt(r, c.x, c.y).blocked, false, 'and in a reloaded save');
    // with nothing to make a shovel from, Act says so and the next clod stands
    const d = g.map.tiles.find((q) => isClod(q) && q.blocked && !tileAt(g, q.x - 1, q.y).blocked && q !== tileAt(g, c.x, c.y) && !['lava', 'abyss', 'lakeWater'].includes(tileAt(g, q.x - 1, q.y).kind));
    s.materials.wood = 0; s.materials.stone = 0; s.digging = { ...(s.digging || {}), shovel: 0 }; g.player.x = d.x - 1; g.player.y = d.y - .25; g.player.facing = 'right';
    const res = g.digAhead(); assert.ok(res && !res.ok, 'refused'); assert.ok(tileAt(g, d.x, d.y).blocked);
  }
});
