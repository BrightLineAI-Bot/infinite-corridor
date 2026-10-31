// Release 613 (Tim, 2026-10-31: the chasm crossings "are now called Starfield dungeons... moving platforms... you can jump on
// them... take a ride... across a larger [chasm]"): stone rafts glide over straight runs of the drop between walkways.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, CHASM, chasmRoll, generatePinnedDungeon, STARFIELD_PLATFORMS, platformPos, platformUnder } from '../src/game.ts';

const seed = 'RAFT613';
const starfield = () => { for (let x = 1; x < 400; x++) { const id = `dungeon:${seed}:g1:${x}:${x % 5}:room`; if (!chasmRoll(seed, id)) continue; const m = generatePinnedDungeon((() => { const s = freshSave(); s.seed = seed; return s; })(), id); if (m.movers?.length) return { id, m }; } };

test('Starfield crossings are named so, and carry rafts over runs of drop between walkways', () => {
  assert.equal(CHASM.name, 'Starfield'); const { m } = starfield(); assert.match(m.name, / · Starfield$/);
  const w = m.width, at = (x, y) => m.tiles[y * w + x];
  assert.ok(m.movers.length >= 1 && m.movers.length <= STARFIELD_PLATFORMS.count);
  for (const r of m.movers) { // release 615: a track of corner points, every step over the drop, a walkway beside each end
    for (let k = 1; k < r.pts.length; k++) { const a = r.pts[k - 1], b = r.pts[k], dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y); assert.ok(!dx !== !dy, 'each leg straight');
      for (let x = a.x, y = a.y; ; x += dx, y += dy) { assert.ok(at(x, y).chasm, 'over the drop'); if (x === b.x && y === b.y) break; } }
    for (const e of [r.pts[0], r.pts.at(-1)]) assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const t = at(e.x + dx, e.y + dy); return t && !t.blocked && !t.chasm; }), 'a walkway beside each end'); }
  const again = starfield().m; assert.deepEqual(again.movers, m.movers, 'deterministic');
});

test('a raft travels end to end and back, by play time', () => {
  const r = { ax: 2, ay: 5, bx: 8, by: 5, phase: 0 }, go = 6 / STARFIELD_PLATFORMS.speed, xy = (q) => ({ x: q.x, y: q.y }); // release 615: positions also carry a height
  assert.deepEqual(xy(platformPos(r, 0)), { x: 2.5, y: 5.5 }); assert.deepEqual(xy(platformPos(r, go + .1)), { x: 8.5, y: 5.5 });
  assert.ok(Math.abs(platformPos(r, go / 2).x - 5.5) < 1e-9); assert.deepEqual(xy(platformPos(r, 2 * go + STARFIELD_PLATFORMS.rest + .1)), { x: 2.5, y: 5.5 });
});

test('in the game: standing on a raft over the drop you ride it and do not fall; stepping off you do', () => {
  const { id, m } = starfield(), s = freshSave(); s.seed = seed; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 1, ry: 1, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); g.enemies = []; const r = g.map.movers[0];
  s.playSeconds = 0; const c = platformPos(r, 0); Object.assign(g.player, { x: c.x - .5, y: c.y - .72 }); const deaths = s.worldFlags.deaths || 0;
  assert.ok(platformUnder(g.map, g.player.x, g.player.y, 0)); const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false }; let t = 1000;
  const x0 = g.player.x, y0 = g.player.y; for (let i = 0; i < 20; i++) { t += 50; g.update(.05, idle, t); }
  assert.equal((s.worldFlags.deaths || 0) - deaths, 0, 'riding, not falling'); assert.ok(Math.hypot(g.player.x - x0, g.player.y - y0) > .5, 'carried along');
  const p0 = r.pts[0], p1 = r.pts[1] || p0, dx = Math.sign(p1.y - p0.y), dy = Math.sign(p1.x - p0.x), side = { state: { x: dx, y: dy }, consume: () => false, held: () => false }; // sideways off the raft
  for (let i = 0; i < 40 && (s.worldFlags.deaths || 0) === deaths; i++) { t += 50; g.update(.05, side, t); }
  assert.equal((s.worldFlags.deaths || 0) - deaths, 1, 'off the raft: into the stars');
});
