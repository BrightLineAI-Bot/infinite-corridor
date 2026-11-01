// Ruined arcologies (Tim, 2026-11-01): dilapidated cyberpunk towers to explore, floor above terraced floor, all in sight, with
// stairs between floors and holes in the floor to fall through; the crown at the top.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { canStep, sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { ARCOLOGY, arcologyHere } from '../src/keeps.ts';

const SEED = 'ARCO1';
let found = null;
const findArc = () => { if (found) return found; for (let x = -70; x < 70 && !found; x++) for (let y = -70; y < 70 && !found; y++) if (arcologyHere(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION))) { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld', false); if (g.map.keep?.arcology) found = g; } return found; };
const reach = (map, from, jump = true) => { const seen = new Set([from.y * 32 + from.x]), q = [from], me = { isPlayer: true, jumping: jump };
  while (q.length) { const p = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx, y = p.y + dy, k = y * 32 + x, t = map.tiles[k]; if (x < 0 || y < 0 || x > 31 || y > 31 || seen.has(k) || !t || t.blocked || !canStep(me, map, 32, p.x, p.y, x, y)) continue; seen.add(k); q.push({ x, y }); } }
  return seen; };

test('only in the machine-touched regions, past the heartland', () => {
  for (let x = -40; x < 40; x++) for (let y = -40; y < 40; y++) { const r = sectionRegion(SEED, x, y, LANDSCAPE_VERSION); if (arcologyHere(SEED, x, y, r)) { assert.ok(ARCOLOGY.regions.includes(r.type)); assert.ok(Math.abs(x) + Math.abs(y) >= ARCOLOGY.minRing); } }
  assert.ok(findArc(), 'an arcology is built somewhere');
});

test('terraced floors two levels apart, a stair a floor, the crown reachable from the door; broken floor only leads down', () => {
  const g = findArc(), m = g.map, K = m.keep, door = { x: K.gate.x, y: K.gate.y + (K.gate.y > K.y ? -1 : 1) };
  const can = reach(m, door); assert.ok(can.has(K.crown.y * 32 + K.crown.x), 'the crown');
  const tiles = m.tiles.filter((t) => t.arcology && !t.blocked), stairs = tiles.filter((t) => t.slope), levels = new Set(tiles.filter((t) => !t.slope && !t.broken).map((t) => t.elev));
  assert.ok(levels.size >= 5, `${levels.size} floors`); assert.ok(stairs.length >= levels.size - 1, 'a stair a floor');
  assert.ok([...levels].every((l) => l % ARCOLOGY.rise === 0), 'floors are two levels apart: too high to jump');
  assert.ok(m.objects.some((o) => o.kind === 'crownRest') && m.objects.some((o) => o.name === 'Arcology Cache'));
  for (const b of tiles.filter((t) => t.broken)) { const from = reach(m, { x: b.x, y: b.y }); assert.ok(!from.has(K.crown.y * 32 + K.crown.x) || can.has(b.y * 32 + b.x), 'a hole is a drop, not a way up'); }
});
