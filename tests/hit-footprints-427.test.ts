// Release 427 (Tim: "the turtle's tornadoes... don't have pink boxes beneath... go through all of the world bosses... make
// sure that all of their attacks register their hit boxes... fuchsia pink... beneath them").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCombatant } from '../src/combat.ts';
import { MONSTER_PACK, KNIGHT, TURTLE, freshPackState, updatePackMonster, tickPackEffects, addPackEffect, effectFootprint, bodyHitFootprint, BODY_HIT } from '../src/monster-pack.ts';
import { WORLD_BEASTS } from '../src/world-beasts.ts';

test('every damage-carrying effect has a footprint the size of what it hits', () => {
  assert.equal(effectFootprint({ kind: 'twister', radius: .45, damage: 5, life: 2 }), .45 + .2);
  assert.equal(effectFootprint({ kind: 'missile', radius: .25, damage: 5, life: 2 }), .6);
  assert.equal(effectFootprint({ kind: 'nanoOrb', state: 'circle', radius: .3, damage: 5, life: 2 }), 0, 'not while it only circles the Knight');
  assert.equal(effectFootprint({ kind: 'dust', radius: 1, damage: 0, life: 1 }), 0, 'harmless effects have none');
  assert.equal(effectFootprint({ kind: 'twister', radius: .45, damage: 5, life: 0 }), 0, 'nor spent ones');
});

test('body-contact attacks show the body\'s reach; the Knight\'s retreating slash shows its arc', () => {
  const turtle = { kind: 'mountainTurtle', bodyRadius: 1.1, pack: { attack: 'turtleSpin', phase: 'active' } };
  assert.deepEqual(bodyHitFootprint(turtle), { radius: 1.1 + TURTLE.spinRadius, armed: true });
  assert.equal(bodyHitFootprint({ ...turtle, pack: { attack: 'turtleSpin', phase: 'windup' } }).armed, false);
  assert.equal(bodyHitFootprint({ ...turtle, pack: { attack: 'turtleComet', phase: 'active' } }), null);
  for (const id of Object.keys(BODY_HIT)) assert.ok(Object.values(MONSTER_PACK).some((d) => [...(d.attacks || []), ...(d.bossAttacks || [])].includes(id)), id);
  const e = createCombatant('nanobotKnight', 10, 12, true, []); Object.assign(e, { id: 'k', worldBeast: 'nanobotKnight', aggro: true, evasive: false, hp: 1e6, maxHp: 1e6, damage: 20 });
  e.pack = freshPackState(); e.pack.gap = 0; e.packAttacks = ['knightBackslash']; e.packBossAttacks = [];
  const w = { dt: .05, now: 0, player: { x: 12, y: 12 }, enemies: [e], fx: [], open: () => true, tileOpen: () => true, projectileOpen: () => true, los: () => true, move: () => true, slow() {}, hurt() { return true; }, effects: () => w.fx, addEffect(f) { addPackEffect(w.fx, f, w.now); } };
  let shown = null; for (let t = 0; t < 2 && !shown; t += w.dt) { w.now += 50; updatePackMonster(e, w); if (e.pack.attack === 'knightBackslash' && e.pack.tele?.type === 'arc') shown = e.pack.tele; w.fx = tickPackEffects(w.fx, w); }
  assert.ok(shown && shown.arc === KNIGHT.comboArc, 'its reach is shown');
});

test('a world-boss sweep: every damaging effect any of their attacks leaves is marked (or is a drawn lane)', () => {
  const missing = [];
  for (const id of Object.keys(WORLD_BEASTS)) {
    const def = MONSTER_PACK[id]; if (!def) continue;
    for (const atk of [...(def.attacks || []), ...(def.bossAttacks || [])]) {
      const w = { dt: .05, now: 0, area: 'overworld', player: { x: 14, y: 12, hp: 1e9 }, enemies: [], fx: [], open: () => true, tileOpen: () => true, projectileOpen: () => true, los: () => true, move: () => true, slow() {}, poison() {}, push() { return false; }, pull() { return false; }, grab() { return false; }, held() { return false; }, release() {}, hurt() { return true; }, effects: () => w.fx, addEffect(f) { addPackEffect(w.fx, f, w.now); }, oceanAt: () => false, groundHeight: () => 0 };
      const e = createCombatant(id, 10, 12, true, []); Object.assign(e, { id: 'b', worldBeast: id, boss: true, aggro: true, evasive: false, hp: 1e6, maxHp: 1e6, damage: 20 });
      e.pack = freshPackState(); e.pack.gap = 0; e.packAttacks = [atk]; e.packBossAttacks = []; w.enemies = [e];
      for (let t = 0; t < 4; t += w.dt) { w.now += 50; updatePackMonster(e, w); for (const f of w.fx) if (Number(f.damage) > 0 && f.life > 0 && !(f.state === 'circle') && !effectFootprint(f) && !f.length && !f.to) missing.push(`${id}.${atk}:${f.kind}`); w.fx = tickPackEffects(w.fx, w); }
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test('drawn in the one damage pink: effect and body footprints, the Void Walker\'s warnings and lanes, the Astral Worm\'s hazards', () => {
  const r = readFileSync(new URL('../src/monster-render.ts', import.meta.url), 'utf8');
  assert.match(r, /const R = visible\(f\) && effectFootprint\(f\)/); assert.match(r, /const b = !e\.dead && visible\(e\) && bodyHitFootprint\(e\)/);
  assert.match(r, /function drawVoidWarning\(ctx, x, y, r, progress\) \{[^\n]*\n  ctx\.fillStyle = DANGER\.fill; ctx\.strokeStyle = DANGER\.edge;/);
  assert.match(r, /ctx\.fillStyle = arming \? DANGER\.fill : DANGER\.fillStrong; ctx\.strokeStyle = DANGER\.edge;/);
  assert.match(readFileSync(new URL('../src/astral-worm-render.ts', import.meta.url), 'utf8'), /rgba\(255,80,190,\.32\)/);
});
