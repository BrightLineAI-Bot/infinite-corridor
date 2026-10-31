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
  for (const r of m.movers) { const dx = Math.sign(r.bx - r.ax), dy = Math.sign(r.by - r.ay); assert.ok(!dx !== !dy, 'a straight run');
    for (let x = r.ax, y = r.ay; ; x += dx, y += dy) { assert.ok(at(x, y).chasm, 'over the drop'); if (x === r.bx && y === r.by) break; }
    const before = at(r.ax - dx, r.ay - dy), after = at(r.bx + dx, r.by + dy); assert.ok(!before.blocked && !before.chasm && !after.blocked && !after.chasm, 'walkway at each end'); }
  const again = starfield().m; assert.deepEqual(again.movers, m.movers, 'deterministic');
});

test('a raft travels end to end and back, by play time', () => {
  const r = { ax: 2, ay: 5, bx: 8, by: 5, phase: 0 }, go = 6 / STARFIELD_PLATFORMS.speed;
  assert.deepEqual(platformPos(r, 0), { x: 2.5, y: 5.5 }); assert.deepEqual(platformPos(r, go + .1), { x: 8.5, y: 5.5 });
  assert.ok(Math.abs(platformPos(r, go / 2).x - 5.5) < 1e-9); assert.deepEqual(platformPos(r, 2 * go + STARFIELD_PLATFORMS.rest + .1), { x: 2.5, y: 5.5 });
});

test('in the game: standing on a raft over the drop you ride it and do not fall; stepping off you do', () => {
  const { id, m } = starfield(), s = freshSave(); s.seed = seed; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 1, ry: 1, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); g.enemies = []; const r = g.map.movers[0];
  s.playSeconds = 0; const c = platformPos(r, 0); Object.assign(g.player, { x: c.x - .5, y: c.y - .72 }); const deaths = s.worldFlags.deaths || 0;
  assert.ok(platformUnder(g.map, g.player.x, g.player.y, 0)); const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false }; let t = 1000;
  const x0 = g.player.x, y0 = g.player.y; for (let i = 0; i < 20; i++) { t += 50; g.update(.05, idle, t); }
  assert.equal((s.worldFlags.deaths || 0) - deaths, 0, 'riding, not falling'); assert.ok(Math.hypot(g.player.x - x0, g.player.y - y0) > .5, 'carried along');
  const dx = Math.sign(r.by - r.ay), dy = Math.sign(r.bx - r.ax), side = { state: { x: dx, y: dy }, consume: () => false, held: () => false }; // sideways off the raft
  for (let i = 0; i < 40 && (s.worldFlags.deaths || 0) === deaths; i++) { t += 50; g.update(.05, side, t); }
  assert.equal((s.worldFlags.deaths || 0) - deaths, 1, 'off the raft: into the stars');
});
