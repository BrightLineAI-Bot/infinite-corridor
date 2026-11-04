// Release 731 (Tim, 2026-11-04): floating ghosts in the keeps and other places that confuse you (you move backwards for a time),
// multiply, and pour together into one big clawed ghost with a huge mouth.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HAUNT, hauntPlan, hauntSpawns, hauntKnot, isHaunt } from '../src/haunts.ts';
import { MONSTER_PACK, PACK_KINDS, ATTACK_MODULES, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { drawPackMonster } from '../src/monster-render.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const seed = 'HAUNT730';
const game = () => { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); return g; };
const wisp = (id, x, y) => Object.assign(createCombatant('gloomwisp', x, y, false, []), { id, aggro: true });

test('the wisp and the gorge: spirits off the ordinary rosters, with their kits', () => {
  for (const id of ['gloomwisp', 'gloomgorge']) { const d = MONSTER_PACK[id]; assert.ok(d && d.prototypeOnly && !PACK_KINDS.includes(id), id); assert.ok(isHaunt({ kind: id })); for (const a of [...d.attacks]) assert.ok(ATTACK_MODULES[a], `${id}: ${a}`); }
  assert.ok(MONSTER_PACK.gloomgorge.form.scale > MONSTER_PACK.gloomwisp.form.scale * 1.4, 'the gorge is far bigger');
  assert.ok(MONSTER_PACK.gloomgorge.stats[0] > MONSTER_PACK.gloomwisp.stats[0] * 5);
  assert.ok(HAUNT.confuse.gorge > HAUNT.confuse.wisp);
});

test('haunted places: keeps often, insides of great buildings sometimes, the wild fog rarely; the same each time', () => {
  let keep = 0, inside = 0, wild = 0, none = 0;
  for (let i = 0; i < 400; i++) { const k = `${i},${i * 3}`; if (hauntPlan(seed, k, { keep: true })) keep++; if (hauntPlan(seed, k, { interior: true })) inside++; if (hauntPlan(seed, k, { wild: true, depth: 50 })) wild++; if (hauntPlan(seed, k, {})) none++; }
  assert.ok(keep > inside && inside > wild && wild > 0, `${keep} ${inside} ${wild}`); assert.equal(none, 0, 'nowhere else');
  assert.equal(hauntPlan(seed, '1,2', { wild: true, depth: 3 }), null, 'not in the near wild');
  const plan = { place: 'keep', count: 4 }, tiles = Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: (i / 32) | 0, kind: 'grass' }));
  const a = hauntSpawns({ tiles }, 32, seed, 'k', plan, { x: 10, y: 10, w: 8, h: 8 }), b = hauntSpawns({ tiles }, 32, seed, 'k', plan, { x: 10, y: 10, w: 8, h: 8 });
  assert.equal(a.length, 4); assert.deepEqual(a, b); assert.ok(a.every((q) => q.kind === 'gloomwisp' && q.x >= 10 && q.x < 18 && q.y >= 10 && q.y < 18));
});

test('a wisp\'s puff and the gorge\'s howl confuse; a confused Wayfarer moves backwards, and dodging is immune', () => {
  for (const id of ['gloomwisp', 'gloomgorge']) {
    const open = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32; let confused = 0;
    const w = { player: { x: 13, y: 12, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true, walkable: null, playerVelocity: { x: 0, y: 0 },
      move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; }, hurt() { return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {}, grab() { return false; }, held() { return false; }, release() {},
      confuse(sec) { confused = Math.max(confused, sec); }, addEffect(f) { addPackEffect(w.fx, f, w.now); }, effects: () => w.fx };
    const e = Object.assign(createCombatant(id, 12, 12, false, []), { id: `${id}-1`, aggro: true }); w.enemies.push(e); const used = new Set();
    for (let t = 0; t < 40; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); if (e.pack?.attack) used.add(e.pack.attack); w.player.x = 13 + Math.sin(t / 2) * 1.2; }
    assert.ok(confused > 0, `${id} confuses (${[...used]})`); assert.equal(confused, id === 'gloomwisp' ? HAUNT.confuse.wisp : HAUNT.confuse.gorge);
  }
  const g = game(); g.rx = 0; g.ry = 0; g.loadArea('overworld'); g.enemies = []; const p = g.player, x0 = p.x, input = { state: { x: 1, y: 0 }, consume: () => false, held: () => false };
  const pw = g.packWorld(1 / 30, 5000); pw.confuse(3); assert.equal(g.message, HAUNT.text.confused); assert.ok(p.confusedUntil > 5000);
  for (let i = 0; i < 15; i++) g.update(1 / 30, input, 5100 + i * 33); assert.ok(p.x < x0, `pushed right, moved left: ${x0} → ${p.x}`);
  const x1 = p.x; for (let i = 0; i < 15; i++) g.update(1 / 30, input, 9000 + i * 33); assert.ok(p.x > x1, 'clear again, right is right');
  p.dodgeUntil = 20000; const before = p.confusedUntil; g.packWorld(1 / 30, 19000).confuse(3); assert.equal(p.confusedUntil, before, 'a dodge slips the gloom');
});

test('wisps split while they hunt (children give no reward, up to the cap) and five together pour into a Gloomgorge', () => {
  const g = game(); g.rx = 0; g.ry = 0; g.loadArea('overworld');
  g.enemies = [wisp('w0', 5, 5)]; for (let t = 0; t < HAUNT.split.every[1] * 3; t += .1) g.hauntTick(.1, t * 1000);
  const ws = g.enemies.filter((e) => e.kind === 'gloomwisp'); assert.ok(ws.length >= 2, `${ws.length}`); assert.ok(ws.filter((e) => e.id !== 'w0').every((e) => e.noRewards && e.hauntChild));
  g.enemies = Array.from({ length: 9 }, (_, i) => wisp(`c${i}`, 3 + i * 3, 3)); for (let t = 0; t < 400; t += .5) g.hauntTick(.5, t * 1000);
  assert.ok(g.enemies.filter((e) => e.kind === 'gloomwisp' && !e.dead).length <= HAUNT.split.cap, 'capped');
  const knot = Array.from({ length: 5 }, (_, i) => wisp(`k${i}`, 10 + (i % 3), 10 + Math.floor(i / 3))); assert.ok(hauntKnot(knot));
  g.enemies = [...knot]; g._hauntCheck = 0; g.hauntGorged = false; const gorge = g.hauntTick(.1, 1000); assert.equal(gorge?.kind, 'gloomgorge'); assert.equal(g.message, HAUNT.text.merge);
  assert.ok(knot.every((e) => e.dead && e.noRewards && e.merged)); assert.ok(Math.abs(gorge.x - 11) < 1.5 && Math.abs(gorge.y - 10.5) < 1.5);
  g.enemies.push(...Array.from({ length: 5 }, (_, i) => wisp(`m${i}`, 10 + (i % 3), 10 + Math.floor(i / 3)))); g._hauntCheck = 0; g.hauntTick(.1, 2000);
  assert.equal(g.enemies.filter((e) => e.kind === 'gloomgorge' && !e.dead).length, 1, 'one gorge at a time');
  gorge.dead = true; g._hauntCheck = 0; g.hauntTick(.1, 3000); assert.ok(!g.enemies.some((e) => e.kind === 'gloomgorge' && !e.dead), 'and one a visit');
  const one = [wisp('solo', 5, 5)]; g.enemies = one; for (let t = 0; t < 200; t += .1) g.hauntTick(.1, t * 1000); assert.equal(g.enemies.length, 1 + HAUNT.split.max, 'a placed wisp splits only so often; its children never');
});

test('haunted keeps on the overworld hold wisps, the same every visit, and the haunts draw', () => {
  let found = null;
  for (let rx = 1; rx < 400 && !found; rx++) { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = rx; g.ry = rx * 2; g.loadArea('overworld'); if ((g.map.keep || g.map.greatBuilding?.castle) && g.enemies.some((e) => e.kind === 'gloomwisp')) found = { rx, ry: rx * 2, g }; }
  assert.ok(found, 'a haunted keep or castle'); const { g } = found, k = g.map.keep, w = g.enemies.filter((e) => e.kind === 'gloomwisp');
  assert.ok(w.every((e) => k ? e.x >= k.x && e.x < k.x + k.w && e.y >= k.y && e.y < k.y + k.h : g.map.tiles[e.y * 32 + e.x].landscape === 'castle'), 'inside the keep or the castle');
  const s2 = freshSave(); s2.seed = seed; const g2 = new Game(s2, 0); g2.rx = found.rx; g2.ry = found.ry; g2.loadArea('overworld');
  assert.deepEqual(g2.enemies.filter((e) => e.kind === 'gloomwisp').map((e) => [e.id, e.x, e.y]), w.map((e) => [e.id, e.x, e.y]));
  const ctx = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : key === 'getTransform' ? undefined : () => {}, set: () => true });
  for (const id of ['gloomwisp', 'gloomgorge']) for (const st of [null, 'windup', 'active']) { const e = Object.assign(createCombatant(id, 4, 4, false, []), { id }); if (st) e.pack = { attack: 'gorgeHowl', phase: st }; drawPackMonster(ctx, e, 32, 1000, 'down'); }
});
