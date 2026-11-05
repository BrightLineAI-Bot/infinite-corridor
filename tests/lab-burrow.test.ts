// A claimed room's glinting walls (Tim, 2026-11-05: "once you've killed the Rift [Warden] for a room in the labyrinth, you should
// be able to come back and burrow through the walls — probably wherever those shiny hidden-object walls or blocks are").
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { labyrinthPlan, LAB_BURROW } from '../src/labyrinths.ts';
import { DIG_GATES, planDig, wallTreasure, saveTier } from '../src/digging.ts';
import { fractureKey } from '../src/fractured.ts';

const FACE = { '1,0': 'right', '-1,0': 'left', '0,1': 'down', '0,-1': 'up' };
const load = (seed, id, fractured = null) => { const s = freshSave(); s.seed = seed; s.fractured = fractured; s.materials.wood = 20; s.materials.stone = 20; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 5, ry: 5, x: 16, y: 16 }; const g = new Game(s, 0); g.loadArea('dungeon', false); return g; };
// A maze chamber with a glinting wall block between two corridors (floor on both sides of it).
let spot = null;
const find = () => { if (spot) return spot;
  for (let i = 0; i < 60 && !spot; i++) { const seed = `LBW${i}`, base = `labyrinth:${seed}:4:-7:${['keep', 'hive', 'apartment'][i % 3]}`, P = labyrinthPlan(base);
    for (const q of P.nodes) { if (spot || (q.kind !== 'cellar' && q.kind !== 'court') || q.n === 0) continue; const id = `${base}:f${q.n + 1}`, g = load(seed, id), m = g.map, W = m.width, T = (x, y) => m.tiles[y * W + x], open = (x, y) => { const t = T(x, y); return t && !t.blocked && !t.hole && !t.doorway; };
      if (!g.enemies.some((e) => e.buildingGuard)) continue;
      for (const G of m.wallGlints || []) for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) if (!spot && open(G.x - dx, G.y - dy) && open(G.x + dx, G.y + dy) && !(m.objects || []).some((o) => Math.abs(o.x - G.x) + Math.abs(o.y - G.y) <= 2)) spot = { seed, id, G, A: { x: G.x - dx, y: G.y - dy }, B: { x: G.x + dx, y: G.y + dy }, facing: FACE[`${dx},${dy}`] }; } }
  return spot; };
const stand = (g, S) => { g.player.x = S.A.x; g.player.y = S.A.y; g.player.facing = S.facing; g._walkedMap = null; };
const fell = (g, e) => { e.hp = 0; e.dead = true; g.defeatEnemy(e); };

test('before its warden falls, a glinting wall toward floor not yet walked will not dig (release 749 holds)', () => {
  const S = find(); assert.ok(S, 'a maze chamber with a glinting wall between two corridors'); const g = load(S.seed, S.id); stand(g, S);
  const r = g.digAhead(); assert.ok(r && !r.ok); assert.equal(r.message, DIG_GATES.messages.unwalked); assert.ok(g.map.tiles[S.G.y * g.map.width + S.G.x].blocked);
  assert.ok(!g.labQuelled(), 'its guards still stand');
});

test('with every guard of the room fallen (Fractured mode off), the glinting wall burrows through: a shortcut, its find credited once, kept across a reload', async () => {
  const { serializeSave, deserializeSave } = await import('../src/persistence.ts');
  const S = find(), g = load(S.seed, S.id), guards = g.enemies.filter((e) => e.buildingGuard && !e.dead); assert.ok(guards.length);
  for (const e of guards.slice(0, -1)) fell(g, e); assert.ok(!g.save.consequences.dungeons[S.id]?.labQuelled, 'not while one guard stands');
  fell(g, guards[guards.length - 1]); assert.equal(g.save.consequences.dungeons[S.id].labQuelled, true, 'kept on the room\'s history'); assert.match(g.message, /glinting walls sound hollow/);
  stand(g, S); const find0 = wallTreasure(g.save.seed, S.id, S.G.x, S.G.y, saveTier(g.save)); assert.ok(find0?.glint, 'it hides something');
  const before = JSON.stringify([g.save.currency, g.save.materials]), r = g.digAhead(); assert.ok(r?.ok, r?.message); assert.ok(g.message.includes(LAB_BURROW.messages.burrow), g.message);
  assert.ok(r.find && r.find.id === find0.id, JSON.stringify(r) + 'what it hid is found'); assert.notEqual(JSON.stringify([g.save.currency, g.save.materials]), before);
  const t = g.map.tiles[S.G.y * g.map.width + S.G.x]; assert.ok(t.tunnel && !t.blocked, 'open through to the next corridor'); assert.ok(g.save.digging.dug[S.id].includes(`${S.G.x},${S.G.y}`));
  assert.ok(!g.map.wallGlints.some((q) => q.x === S.G.x && q.y === S.G.y));
  const again = g.digAhead(); assert.ok(!again?.ok, 'nothing to dig twice'); const paid = JSON.stringify([g.save.currency, g.save.materials]);
  const h = new Game(deserializeSave(serializeSave(g.exportSnapshot(500))), 600); assert.equal(h.areaId(), S.id);
  assert.ok(h.map.tiles[S.G.y * h.map.width + S.G.x].tunnel, 'the burrow is kept'); assert.ok(h.labQuelled(), 'and the claim'); assert.equal(JSON.stringify([h.save.currency, h.save.materials]), paid, 'paid once');
});

test('the rest of the rules hold in a claimed room: the outer wall and walls that do not glint keep to release 749, and the shovel is still needed', () => {
  const S = find(), g = load(S.seed, S.id); g.enemies = []; assert.ok(g.labQuelled(), 'no guard stands');
  const m = g.map, W = m.width, burrow = (x, y) => (m.wallGlints || []).some((q) => q.x === x && q.y === y), walked = new Uint8Array(m.tiles.length);
  // the outer wall, from a floor tile beside it
  let edge = null; for (let x = 1; x < W - 1 && !edge; x++) if (!m.tiles[1 * W + x].blocked && !m.tiles[1 * W + x].doorway && m.tiles[x].blocked && !m.objects.some((o) => o.x === x && o.y <= 1)) edge = { x, y: 1 };
  assert.ok(edge); const ow = planDig(m, edge.x, edge.y, 'up', S.id, { walked, burrow: () => true }); assert.ok(!ow.ok); assert.equal(ow.reason, DIG_GATES.messages.outerWall);
  // a plain wall between corridors not yet walked
  let plain = null; for (let y = 2; y < m.height - 2 && !plain; y++) for (let x = 2; x < W - 2 && !plain; x++) { const t = m.tiles[y * W + x]; if (!t.blocked || burrow(x, y)) continue; for (const [dx, dy] of [[1, 0], [0, 1]]) { const a = m.tiles[(y - dy) * W + x - dx], b = m.tiles[(y + dy) * W + x + dx]; if (!plain && a && b && !a.blocked && !b.blocked && !a.doorway && !b.doorway) plain = { x: x - dx, y: y - dy, f: FACE[`${dx},${dy}`] }; } }
  assert.ok(plain); const pw = planDig(m, plain.x, plain.y, plain.f, S.id, { walked, burrow }); assert.ok(!pw.ok); assert.equal(pw.reason, DIG_GATES.messages.unwalked);
  g.save.materials.wood = 0; g.save.materials.stone = 0; g.save.digging.shovel = 0; stand(g, S); const no = g.digAhead(); assert.ok(!no.ok); assert.match(no.message, /shovel takes/); assert.ok(m.tiles[S.G.y * W + S.G.x].blocked);
});

test('in Fractured mode the room\'s warden is its Fracture Warden: its guards falling do not claim it; the Warden\'s seal does', () => {
  const S = find(), g = load(S.seed, S.id, 'fractured');
  for (const e of g.enemies.filter((q) => q.buildingGuard && !q.dead)) fell(g, e); assert.ok(!g.labQuelled(), 'guards are not the warden');
  stand(g, S); assert.ok(!g.digAhead().ok);
  const w = { id: 'frac-warden-test', kind: 'ashling', fracWarden: true, hp: 0, dead: true, x: 3, y: 3 }; g.enemies.push(w); g.defeatEnemy(w);
  assert.ok(g.save.fractureSeals[fractureKey('dungeon', S.id)].sealed); assert.equal(g.save.consequences.dungeons[S.id].labQuelled, true);
  stand(g, S); const r = g.digAhead(); assert.ok(r.ok, r.message);
});

test('only labyrinth rooms: a great building floor, a castle or the Pentagon never takes the claim', () => {
  const s = freshSave(); s.seed = 'LBX'; s.session.activeDungeonId = 'building:LBX:7:7:keep:3:f2'; s.session.dungeonReturn = { rx: 7, ry: 7, x: 16, y: 16 }; const g = new Game(s, 0); g.loadArea('dungeon', false); g.enemies = [];
  assert.equal(g.labQuelled(), false); assert.ok(!s.consequences.dungeons['building:LBX:7:7:keep:3:f2']?.labQuelled);
});
