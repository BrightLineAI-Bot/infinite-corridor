// Release 307 (Tim, 2026-10-22): boss health halved and damage cut 10%, four tries, the Blob no longer regenerates on its
// own, and every boss can be staggered on a tiered poise (two easier breaks, then a fixed bar with a cooldown).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatant } from '../src/combat.ts';
import { BOSS_POISE, bossPoiseOf, updatePackMonster, BLOB } from '../src/monster-pack.ts';
import { WORLD_BEASTS, BEAST_BALANCE, worldBeastTriesLeft } from '../src/world-beasts.ts';
import { QUESTING_BEAST } from '../src/questing-beast.ts';
import { freshSave } from '../src/types.ts';

test('balance: half health, 90% damage, four tries, no Blob regeneration', () => {
  assert.deepEqual(BEAST_BALANCE, { hp: .5, damage: .9 });
  for (const id of Object.keys(WORLD_BEASTS)) assert.equal(WORLD_BEASTS[id].tries, 4, id);
  assert.equal(QUESTING_BEAST.tries, 4); assert.equal(BLOB.growHeal, 0);
  const s = freshSave(); s.worldBeasts = { morphingBlob: { active: { rx: 1, ry: 1, tries: 0 } } }; assert.equal(worldBeastTriesLeft(s, 'morphingBlob'), 4);
});

test('poise: the turtle and the giant are hardest, the astral worm surprisingly easy, the walker sturdy', () => {
  const first = (k) => BOSS_POISE[k].hits[0];
  assert.ok(first('mountainTurtle') >= first('voidWalker') && first('lightningGiant') >= first('voidWalker'));
  assert.ok(first('voidWalker') > first('morphingBlob') && first('astralWorm') < first('morphingBlob'));
  for (const k of Object.keys(BOSS_POISE)) if (k !== 'forget') { const h = BOSS_POISE[k].hits; assert.ok(h[0] < h[1] && h[1] < h[2], k); assert.ok(BOSS_POISE[k].guard >= 8, k); }
  assert.equal(bossPoiseOf({ kind: 'psychicCrystal', worldBeast: 'psychicCrystal' }), null, 'the Crystal keeps its own');
  assert.equal(bossPoiseOf({ kind: 'ashling' }), null, 'ordinary monsters do not stagger this way');
});

test('landed blows break a boss on tiers; a break holds it still, then a cooldown', () => {
  const b = createCombatant('morphingBlob', 10, 10, true, []); Object.assign(b, { id: 'w', worldBeast: 'morphingBlob', aggro: true, hp: 5000, maxHp: 5000, packAttacks: [], packBossAttacks: [] });
  const w = { dt: .05, now: 0, player: { x: 12, y: 10, hp: 1000 }, enemies: [b], fx: [], open: () => true, tileOpen: () => true, los: () => true, move: () => true, hurt: () => true, effects: () => w.fx, addEffect: (f) => w.fx.push(f) };
  const step = () => { w.now += 50; updatePackMonster(b, w); };
  const hits = (n) => { for (let i = 0; i < n; i++) { b.hp -= 10; step(); } };
  const P = BOSS_POISE.morphingBlob; step();
  hits(P.hits[0] - 1); assert.ok(!(b.poiseBreak > 0), 'not yet'); hits(1); assert.ok(b.poiseBreak > 0, 'first break');
  for (let i = 0; i < P.breakTime * 20 + 2; i++) step(); assert.equal(b.poiseBreak, 0, 'it rises');
  hits(P.hits[1] + 2); assert.ok(!(b.poiseBreak > 0), 'blows during the cooldown do not count');
  for (let i = 0; i < P.guard * 20; i++) step(); step();
  hits(P.hits[1]); assert.ok(b.poiseBreak > 0, 'second break at the second tier');
  for (let i = 0; i < (P.breakTime + P.guard) * 20 + 4; i++) step();
  hits(P.hits[2] - 1); assert.ok(!(b.poiseBreak > 0)); hits(1); assert.ok(b.poiseBreak > 0, 'third and later breaks at the last tier');
});
