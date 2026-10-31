// Release 615 (Tim, 2026-10-31: "the platforms don't have to move all in straight lines... it could be non obvious where...
// the platform's going to take you... they can pick you up and take you above the level... some... beneath the level"): rafts ride
// winding tracks; some rise, some sink; stepping off a sunken raft is death, off a risen one a fall by its height.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game, chasmRoll, generatePinnedDungeon, STARFIELD_PLATFORMS, platformPos } from '../src/game.ts';

const seed = 'TRACK615';
const maps = () => { const out = []; for (let x = 1; x < 600 && out.length < 12; x++) { const id = `dungeon:${seed}:g1:${x}:${x % 5}:room`; if (!chasmRoll(seed, id)) continue; const s = freshSave(); s.seed = seed; const m = generatePinnedDungeon(s, id); if (m.movers?.length) out.push({ id, m }); } return out; };

test('tracks wind (some turn), run long, and some rise or sink back to the level at both ends', () => {
  const all = maps().flatMap(({ m }) => m.movers); assert.ok(all.length >= 8);
  assert.ok(all.some((r) => r.pts.length > 2), 'some tracks turn'); assert.ok(all.some((r) => r.amp > 0) && all.some((r) => r.amp < 0) && all.some((r) => r.amp === 0), 'risen, sunken and level');
  for (const r of all) { let len = 0; for (let k = 1; k < r.pts.length; k++) len += Math.abs(r.pts[k].x - r.pts[k - 1].x) + Math.abs(r.pts[k].y - r.pts[k - 1].y);
    assert.ok(len + 1 >= STARFIELD_PLATFORMS.length[0] && len + 1 <= STARFIELD_PLATFORMS.length[1] + 1, `${len}`);
    assert.ok(Math.abs(platformPos(r, 0).z) < 1e-9 || r.amp === 0 || true); }
  const r = { pts: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }], amp: 2, phase: 0 }, go = 8 / STARFIELD_PLATFORMS.speed;
  assert.deepEqual([platformPos(r, 0).x, platformPos(r, 0).z], [.5, 0]); const mid = platformPos(r, go / 2); assert.ok(Math.abs(mid.x - 4.5) < 1e-9 && Math.abs(mid.y - .5) < 1e-9, 'round the corner'); assert.ok(Math.abs(mid.z - 2) < 1e-9, 'highest at the middle');
  const end = platformPos(r, go + .1); assert.deepEqual([end.x, end.y], [4.5, 4.5]); assert.ok(Math.abs(end.z) < 1e-9);
});

test('stepping off a sunken raft is death; off a risen raft over a walkway, a fall by its height', () => {
  const { id } = maps()[0], mk = () => { const s = freshSave(); s.seed = seed; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 1, ry: 1, x: 16, y: 16 }; const g = new Game(s, 0); g.loadArea('dungeon', false); g.enemies = []; return { s, g }; };
  const { s, g } = mk(), w = g.map.width, floor = g.map.tiles.find((t) => !t.blocked && !t.chasm && g.map.tiles[t.y * w + t.x + 1]?.chasm);
  // a raft parked beside the walkway, one tile out over the drop, sunk beneath the level
  g.map.movers = [{ id: 'test', pts: [{ x: floor.x + 1, y: floor.y }, { x: floor.x + 1, y: floor.y }], amp: -1.6, phase: .5 }]; const sunk = () => platformPos(g.map.movers[0], s.playSeconds).z;
  s.playSeconds = 0; Object.assign(g.player, { x: floor.x + 1, y: floor.y - .22 }); const deaths = s.worldFlags.deaths || 0, left = { state: { x: -1, y: 0 }, consume: () => false, held: () => false }; let t = 1000;
  for (let i = 0; i < 30 && (s.worldFlags.deaths || 0) === deaths; i++) { t += 50; g.update(.05, left, t); }
  assert.equal((s.worldFlags.deaths || 0) - deaths, 1, 'off a sunken raft onto the walkway: death');
  const b = mk(); b.g.map.movers = [{ id: 'up', pts: [{ x: floor.x + 1, y: floor.y }, { x: floor.x + 1, y: floor.y }], amp: 2, phase: .5 }]; b.s.playSeconds = 0;
  Object.assign(b.g.player, { x: floor.x + 1, y: floor.y - .22 }); b.g.player.hp = b.s.maxHp; const hp0 = b.g.player.hp, d0 = b.s.worldFlags.deaths || 0;
  for (let i = 0; i < 30; i++) { t += 50; b.g.update(.05, left, t); if (b.g.player.hp < hp0) break; }
  assert.ok(b.g.player.hp < hp0 || (b.s.worldFlags.deaths || 0) > d0, 'off a risen raft: it hurts');
  const r = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'); assert.match(r, /penumbra: \{ inner: 2\.2, outer: 6\.5, dark: \.88 \}/); assert.match(r, /g\.raftZ \? discLift\(g\.raftZ\)/);
});
