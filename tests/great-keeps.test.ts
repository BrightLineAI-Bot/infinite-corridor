// Great Keeps (Tim, 2026-11-01): castles and keeps to explore, built with the great trees' platforming: stairs and jump-ups
// from the gate to the wall walk, the towers, a bridge over the courtyard and the keep's crown, where a rest and a cache wait.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { canStep } from '../src/landscape.ts';
import { KEEPS, keepHere } from '../src/keeps.ts';

const SEED = 'KEEPS1';
const visit = (rx, ry) => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
let found = null; const findKeep = () => { if (found) return found; for (let x = 5; x < 80 && !found; x++) for (let y = -30; y < 30 && !found; y++) if (keepHere(SEED, x, y)) { const g = visit(x, y); if (g.map.keep) found = g; } return found; };
// Walk the section as the Wayfarer can: a step on the level or a slope, a jump up one level, a drop of any height.
const reach = (map, from, jump = true) => { const seen = new Set([from.y * 32 + from.x]), q = [from], me = { isPlayer: true, jumping: jump };
  while (q.length) { const p = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx, y = p.y + dy, k = y * 32 + x, t = map.tiles[k]; if (x < 0 || y < 0 || x > 31 || y > 31 || seen.has(k) || !t || t.blocked) continue; if (!canStep(me, map, 32, p.x, p.y, x, y)) continue; seen.add(k); q.push({ x, y }); } }
  return seen; };

test('rare, only past the heartland; a keep fits where one is rolled at least sometimes', () => {
  let n = 0; for (let x = -50; x < 50; x++) for (let y = -50; y < 50; y++) if (keepHere(SEED, x, y)) { n++; assert.ok(Math.abs(x) + Math.abs(y) >= KEEPS.minRing); }
  assert.ok(n > 200 && n < 1200, `${n} of 10000`); assert.ok(findKeep(), 'a keep is built somewhere');
});

test('the way up is all walkable: gate, stairs, wall walk, towers, bridge, keep, crown; rest and cache at the top', () => {
  const g = findKeep(), m = g.map, K = m.keep, out = { x: K.gate.x, y: K.gate.y + (K.gate.y > K.y ? 1 : -1) };
  const can = reach(m, out), at = (x, y) => m.tiles[y * 32 + x];
  assert.ok(can.has(K.crown.y * 32 + K.crown.x), 'the crown can be reached');
  const levels = new Set([...can].map((k) => m.tiles[k].elev || 0)); for (const l of [0, 1, 2, 3, 4, 5, 6]) assert.ok(levels.has(l), `level ${l} on the way`);
  assert.ok(m.tiles.some((t) => t.keepBridge) && m.tiles.filter((t) => t.keepTower).length >= 20, 'a bridge and towers');
  assert.ok(!reach(m, out, false).has(K.crown.y * 32 + K.crown.x), 'without jumping, the crown stays out of reach');
  assert.equal(at(K.crown.x, K.crown.y).elev, KEEPS.levels.crown);
  assert.ok(m.objects.some((o) => o.kind === 'crownRest' && o.keepRest) && m.objects.some((o) => o.name === 'Keep Cache'));
  assert.ok(m.enemySpawns.filter((e) => e.keepGuard).length >= 5, 'guards in the courtyard, on the walls and towers');
});

test('the ways through the section stay open ground, and the keep is the same each visit', () => {
  const g = findKeep(), m = g.map, ex = m.exits;
  const walk = reach(m, { x: 16, y: 16 }, false), edge = [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]].filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  for (const [x, y] of edge) assert.ok(walk.has(y * 32 + x) || m.tiles[y * 32 + x].blocked, `exit ${x},${y} reachable from the middle`);
  const again = visit(g.rx, g.ry); assert.deepEqual(again.map.keep, m.keep);
});

test('the keep rest: stand on the crown and you wake there', () => {
  const g = findKeep(), K = g.map.keep; g.player.x = K.crown.x; g.player.y = K.crown.y; assert.ok(g.touchCrownRest()); assert.equal(g.save.activeCheckpoint.name, 'Keep Rest');
});
