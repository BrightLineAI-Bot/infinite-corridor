// Labyrinths (Tim, 2026-11-03): self-contained mazes of chambers you move between by doors and ladders; open-air courts still
// inside the building; cellars and subcellars; galleries of gaps to jump; one true path, one real end, and a way out at the end
// that lets you out at the front.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { render } from '../src/renderer.ts';
import { LABYRINTHS, labyrinthHere, labyrinthPlan, generateLabyrinthChamber, parseLabyrinthId } from '../src/labyrinths.ts';

const SEED = 'TIM1';
const visit = (rx, ry, save = null) => { const s = save || freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
let found = null;
const find = () => { if (found) return found; for (let d = LABYRINTHS.minRing; d < 40 && !found; d++) for (let x = -d; x <= d && !found; x++) for (const y of [d - Math.abs(x), Math.abs(x) - d]) { if (!labyrinthHere(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION))) continue; if (visit(x, y).map.objects.some((o) => o.labyrinthDoor)) { found = { x, y }; break; } } return found; };
const enter = () => { const at = find(), g = visit(at.x, at.y), door = g.map.objects.find((o) => o.labyrinthDoor); g.player.x = door.x; g.player.y = door.y; const r = g.interact('enter', door.id); assert.ok(r.ok, r.message); return { g, door }; };
const reachable = (m, from) => { const W = m.width, ok = (x, y) => { const t = m.tiles[y * W + x]; return t && !t.blocked && !t.hole; }, seen = new Set([from.y * W + from.x]), st = [from];
  while (st.length) { const p = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let x = p.x + dx, y = p.y + dy; const t = m.tiles[y * W + x]; if (!t || t.blocked) continue; if (t.hole) { x += dx; y += dy; if (!ok(x, y)) continue; } const k = y * W + x; if (!seen.has(k)) { seen.add(k); st.push({ x, y }); } } }
  return seen; };

test('a maze of chambers in a tree: one vault, the farthest from the door, at least nine chambers in; halls, courts, cellars, subcellars, galleries', () => {
  const kinds = {}; let sub = 0;
  for (let i = 0; i < 60; i++) { const P = labyrinthPlan(`labyrinth:T${i}:${i}:${-i}:${['keep', 'apartment', 'hive'][i % 3]}`), vaults = P.nodes.filter((q) => q.vault);
    assert.equal(vaults.length, 1, 'one real end'); assert.equal(P.edges.length, P.nodes.length - 1, 'a tree: one way through');
    assert.ok(vaults[0].depth + 1 >= LABYRINTHS.minPath, `${vaults[0].depth + 1} chambers in`); assert.ok(P.nodes.every((q) => q.depth <= vaults[0].depth), 'the vault is the farthest');
    for (const q of P.nodes) { kinds[q.kind] = (kinds[q.kind] || 0) + 1; if (q.level <= -2) sub++; }
    for (const e of P.edges) { const a = P.nodes[e.a], b = P.nodes[e.b]; assert.equal(e.type, a.level === b.level ? 'door' : 'ladder'); assert.ok(Math.abs(a.level - b.level) <= 1); } }
  for (const k of ['hall', 'court', 'cellar', 'gaps']) assert.ok(kinds[k] > 10, `${k}: ${kinds[k]}`); assert.ok(sub > 10, 'subcellars');
});

test('in every chamber every passage can be reached (a gallery by jumping its gaps), and the creatures and caches stand on reachable ground', () => {
  const bad = [];
  for (let i = 0; i < 30; i++) { const base = `labyrinth:S${i}:${i % 7}:${i % 5}:${['keep', 'apartment', 'hive'][i % 3]}`, P = labyrinthPlan(base);
    for (const q of P.nodes) { const m = generateLabyrinthChamber('S', `${base}:f${q.n + 1}`), W = m.width, seen = reachable(m, m.entry);
      for (const o of m.objects) if (!seen.has(o.y * W + o.x) && ![[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has((o.y + dy) * W + o.x + dx))) bad.push(`${base} ${q.n} ${q.kind}: ${o.kind}/${o.dir || ''}`);
      for (const e of m.enemySpawns) if (!seen.has(e.y * W + e.x)) bad.push(`${base} ${q.n}: a creature out of reach`);
      if (q.kind === 'gaps' && !m.tiles.some((t) => t.hole)) bad.push(`${base} ${q.n}: a gallery without gaps`); } }
  assert.deepEqual(bad, []);
});

test('outside: one closed building with one door; inside, the true path walked door by door and ladder by ladder to the vault; its way out lets you out at the front', () => {
  const { g, door } = enter(); assert.ok(g.map.building.labyrinth); assert.equal(g.map.building.node, 0);
  const P = labyrinthPlan(g.map.building.base), end = P.nodes.find((q) => q.vault), path = []; for (let n = end.n; n >= 0; n = P.nodes[n].parent) path.unshift(n);
  for (let i = 1; i < path.length; i++) { const o = g.map.objects.find((q) => q.id === `lab-pass-${path[i]}`); assert.ok(o, `the way on from ${path[i - 1]}`); g.player.x = o.x; g.player.y = o.y; const r = g.interact(o.actions[0], o.id); assert.ok(r.ok, r.message); assert.equal(g.map.building.node, path[i]); }
  assert.ok(g.map.building.vault); assert.ok(g.map.objects.some((o) => o.kind === 'chest')); const boss = g.enemies.find((e) => e.id.endsWith(':guardian')); assert.ok(boss?.affixes?.length, 'its guardian');
  const out = g.map.objects.find((o) => o.id === 'building-exit'); g.player.x = out.x; g.player.y = out.y; const r = g.interact('exit', out.id); assert.ok(r.ok, r.message);
  assert.equal(g.area, 'overworld'); assert.deepEqual([g.player.x, g.player.y], [door.x, door.y], 'out at the front, not back through the maze');
});

test('a gallery: a running jump clears a gap; jump too early and you fall, far down, into another chamber', () => {
  const base = 'labyrinth:LB5:5:5:keep', P = labyrinthPlan(base), gq = P.nodes.find((q) => q.kind === 'gaps'); assert.ok(gq);
  const run = (lead) => { const s = freshSave(); s.seed = 'LB5'; const g = new Game(s, 0); s.session.activeDungeonId = `${base}:f${gq.n + 1}`; s.session.dungeonReturn = { rx: 5, ry: 5, x: 16, y: 16 }; g.loadArea('dungeon', false); g.enemies = [];
    const m = g.map, W = m.width, T = (x, y) => m.tiles[y * W + x], solid = (x, y) => T(x, y) && !T(x, y).blocked && !T(x, y).hole; let spot = null;
    for (let y = 1; y < m.height - 1 && !spot; y++) for (let x = 3; x < W - 3 && !spot; x++) if (solid(x - 2, y) && solid(x - 1, y) && solid(x, y) && T(x + 1, y)?.hole && solid(x + 2, y)) spot = { x, y };
    g.player.x = spot.x - 2; g.player.y = spot.y; let jumped = false, now = 1000; const id = g.areaId(), hp = g.player.hp;
    const input = { state: { x: 1, y: 0 }, held: () => false, consume: (a) => { if (a === 'jump' && !jumped && g.player.x >= spot.x + lead) { jumped = true; return true; } return false; } };
    for (let i = 0; i < 120; i++) { now += 16; g.update(.016, input, now); if (g.areaId() !== id || g.player.x > spot.x + 2.2) break; }
    return { crossed: g.areaId() === id, g, hp, to: P.nodes[gq.fallTo] }; };
  assert.ok(run(.1).crossed && run(.5).crossed, 'a timed running jump clears it');
  const fell = run(-1); assert.ok(!fell.crossed, 'too early'); assert.equal(fell.g.map.building.node, fell.to.n, 'into the chamber below'); assert.ok(fell.g.player.hp < fell.hp); assert.match(fell.g.message, /fall through the gap/);
});

test('only on new ground; a save inside resumes in the same chamber; chambers are the same each time', async () => {
  const at = find(), s = freshSave(); (s.atlas ||= {})[`${at.x},${at.y}`] = { landscapeVersion: LANDSCAPE_VERSION, buildingVersion: 1 }; assert.ok(!visit(at.x, at.y, s).map.objects.some((o) => o.labyrinthDoor));
  const id = 'labyrinth:R:3:4:keep:f2'; assert.deepEqual(generateLabyrinthChamber('R', id).tiles, generateLabyrinthChamber('R', id).tiles);
  const { serializeSave, deserializeSave } = await import('../src/persistence.ts'); const { g } = enter(), o = g.map.objects.find((q) => q.id.startsWith('lab-pass-')); g.player.x = o.x; g.player.y = o.y; g.interact(o.actions[0], o.id);
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(200))), 900); assert.equal(r.areaId(), g.areaId()); assert.ok(parseLabyrinthId(r.areaId()));
});

test('chambers and the building draw without throwing', () => {
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), getTransform: () => ({}), ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  const at = find(), g = visit(at.x, at.y); assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000));
  const { g: h } = enter(), P = labyrinthPlan(h.map.building.base);
  for (const kind of ['hall', 'court', 'cellar', 'gaps']) { const q = P.nodes.find((n) => n.kind === kind); if (!q) continue; h.save.session.activeDungeonId = `${P.base}:f${q.n + 1}`; h.loadArea('dungeon', false); assert.doesNotThrow(() => render(ctx, h, 360, 640, 5000), kind); }
});
