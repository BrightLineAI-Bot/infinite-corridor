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
    assert.equal(vaults.length, 1, 'one real end'); assert.equal(P.edges.filter((e) => !e.shortcut).length, P.nodes.length - 1, 'a tree: one way through (and a shortcut back)');
    assert.ok(vaults[0].depth + 1 >= LABYRINTHS.minPath, `${vaults[0].depth + 1} chambers in`); assert.ok(P.nodes.every((q) => q.depth <= vaults[0].depth), 'the vault is the farthest');
    for (const q of P.nodes) { kinds[q.kind] = (kinds[q.kind] || 0) + 1; if (q.level <= -2) sub++; }
    for (const e of P.edges.filter((v) => !v.shortcut)) { const a = P.nodes[e.a], b = P.nodes[e.b]; assert.equal(e.type, a.level === b.level ? 'door' : 'ladder'); assert.ok(Math.abs(a.level - b.level) <= 1); } }
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

// Walk from chamber to chamber along the tree's passages (as a player who knows the way would), using any passage present.
const go = (g, to) => { const P = labyrinthPlan(g.map.building.base), up = (n) => { const out = [n]; while (P.nodes[out[out.length - 1]].parent >= 0) out.push(P.nodes[out[out.length - 1]].parent); return out; };
  const a = up(g.map.building.node), b = up(to), meet = a.find((n) => b.includes(n)), route = [...a.slice(1, a.indexOf(meet) + 1), ...b.slice(0, b.indexOf(meet)).reverse()];
  for (const n of route) { const o = g.map.objects.find((q) => q.id === `lab-pass-${n}`); g.player.x = o.x; g.player.y = o.y; const r = g.interact(o.actions[0], o.id); if (!r.ok) return r; assert.equal(g.map.building.node, n); }
  return { ok: true }; };

test('outside: one closed building with one door; the true path is sealed until its keys are fetched from side branches; the vault\'s way out lets you out at the front', () => {
  const { g, door } = enter(); assert.ok(g.map.building.labyrinth); assert.equal(g.map.building.node, 0); assert.match(g.defeatNotice.detail, /1 of \d+ chambers found/);
  const P = labyrinthPlan(g.map.building.base); assert.ok(P.gates.length >= 1, 'sealed doors on the way');
  for (const gate of P.gates) { // walk to the sealed door: it will not open without its key
    const r = go(g, gate.from); assert.ok(r.ok, r.message); const o = g.map.objects.find((q) => q.id === `lab-pass-${gate.to}`); assert.ok(o.lock); g.player.x = o.x; g.player.y = o.y;
    const no = g.interact(o.actions[0], o.id); assert.ok(!no.ok); assert.match(no.message, new RegExp(gate.key.name));
    const leaf = P.nodes.find((q) => q.key?.id === gate.key.id); assert.ok(P.path.indexOf(leaf.n) < 0, 'the key lies off the true path'); assert.ok(go(g, leaf.n).ok);
    const key = g.map.objects.find((q) => q.kind === 'labKey'); g.player.x = key.x; g.player.y = key.y; assert.ok(g.interact('take', key.id).ok);
    assert.ok(go(g, gate.to).ok, 'with the key the way is open'); }
  assert.ok(go(g, P.end).ok); assert.ok(g.map.building.vault); assert.ok(g.map.objects.some((o) => o.kind === 'chest')); const boss = g.enemies.find((e) => e.id.endsWith(':guardian')); assert.ok(boss?.affixes?.length, 'its guardian');
  const out = g.map.objects.find((o) => o.id === 'building-exit'); g.player.x = out.x; g.player.y = out.y; const r = g.interact('exit', out.id); assert.ok(r.ok, r.message);
  assert.equal(g.area, 'overworld'); assert.deepEqual([g.player.x, g.player.y], [door.x, door.y], 'out at the front, not back through the maze');
  // the keys are kept: back inside, a sealed door you opened stays open
  g.player.x = door.x; g.player.y = door.y; g.interact('enter', door.id); assert.ok(go(g, P.gates[0].to).ok);
});

test('the shortcut: deep along the way, a door back to the first hall; barred from the hall until it has been opened from the far side', () => {
  let at = null; for (let d = LABYRINTHS.minRing; d < 40 && !at; d++) for (let x = -d; x <= d && !at; x++) for (const y of [d - Math.abs(x), Math.abs(x) - d]) { if (!labyrinthHere(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION))) continue; const v = visit(x, y), door = v.map.objects.find((o) => o.labyrinthDoor); if (door && labyrinthPlan(door.dungeonId.replace(/:f1$/, '')).edges.some((e) => e.shortcut)) at = { x, y }; }
  assert.ok(at); const g = visit(at.x, at.y), door = g.map.objects.find((o) => o.labyrinthDoor); g.player.x = door.x; g.player.y = door.y; g.interact('enter', door.id);
  const P = labyrinthPlan(g.map.building.base), e = P.edges.find((v) => v.shortcut), barred = g.map.objects.find((o) => o.id === `lab-pass-${e.a}`); assert.ok(barred?.barred);
  g.player.x = barred.x; g.player.y = barred.y; const no = g.interact('climb', barred.id); assert.ok(!no.ok); assert.match(no.message, /Barred/);
  // fetch the keys the way needs, then walk to the deep chamber and take the shortcut home
  for (const gate of P.gates) { if (P.path.indexOf(gate.from) >= P.path.indexOf(e.a)) continue; const leaf = P.nodes.find((q) => q.key?.id === gate.key.id); assert.ok(go(g, leaf.n).ok); const key = g.map.objects.find((q) => q.kind === 'labKey'); g.player.x = key.x; g.player.y = key.y; g.interact('take', key.id); }
  assert.ok(go(g, e.a).ok); const sc = g.map.objects.find((o) => o.id === 'lab-pass-0'); assert.ok(sc.shortcutOpens); g.player.x = sc.x; g.player.y = sc.y; assert.ok(g.interact('climb', sc.id).ok); assert.equal(g.map.building.node, 0);
  const now = g.map.objects.find((o) => o.id === `lab-pass-${e.a}`); assert.ok(now.opened, 'open from the hall now'); g.player.x = now.x; g.player.y = now.y; assert.ok(g.interact('climb', now.id).ok); assert.equal(g.map.building.node, e.a);
});

test('a gallery: a running jump clears a gap; jump too early and the gap is a death that wakes you where you came into the gallery (HOLE_DROPS)', () => {
  const base = 'labyrinth:LB5:5:5:keep', P = labyrinthPlan(base), gq = P.nodes.find((q) => q.kind === 'gaps'); assert.ok(gq);
  const run = (lead) => { const s = freshSave(); s.seed = 'LB5'; const g = new Game(s, 0); s.session.activeDungeonId = `${base}:f${gq.n + 1}`; s.session.dungeonReturn = { rx: 5, ry: 5, x: 16, y: 16 }; g.loadArea('dungeon', false); g.enemies = [];
    const m = g.map, W = m.width, T = (x, y) => m.tiles[y * W + x], solid = (x, y) => T(x, y) && !T(x, y).blocked && !T(x, y).hole; let spot = null;
    for (let y = 1; y < m.height - 1 && !spot; y++) for (let x = 3; x < W - 3 && !spot; x++) if (solid(x - 2, y) && solid(x - 1, y) && solid(x, y) && T(x + 1, y)?.hole && solid(x + 2, y)) spot = { x, y };
    g.player.x = spot.x - 2; g.player.y = spot.y; let jumped = false, now = 1000; const id = g.areaId(), hp = g.player.hp;
    const input = { state: { x: 1, y: 0 }, held: () => false, consume: (a) => { if (a === 'jump' && !jumped && g.player.x >= spot.x + lead) { jumped = true; return true; } return false; } };
    const entry = { ...g.save.session.floorEntry || {} }; for (let i = 0; i < 120; i++) { now += 16; g.update(.016, input, now); if (!entry.id && g.save.session.floorEntry) Object.assign(entry, g.save.session.floorEntry); if (g.areaId() !== id || g.player.x > spot.x + 2.2 || g.save.worldFlags.deaths) break; }
    return { crossed: g.areaId() === id && !g.save.worldFlags.deaths, g, hp, id, entry, to: P.nodes[gq.fallTo] }; };
  assert.ok(run(.1).crossed && run(.5).crossed, 'a timed running jump clears it');
  const fell = run(-1); assert.ok(!fell.crossed, 'too early'); assert.equal(fell.g.areaId(), fell.id, 'woken in the same gallery, not dropped into the chamber below'); assert.equal(fell.g.save.worldFlags.deaths, 1); assert.deepEqual([fell.g.player.x, fell.g.player.y], [fell.entry.x, fell.entry.y], 'where you came onto it'); assert.equal(fell.g.player.hp, fell.g.save.maxHp); assert.match(fell.g.message, /wake where you came onto this floor/);
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
