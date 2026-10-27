// Release 489 (Tim, 2026-10-27): the Iron Fist is a tool now, with a three-punch combo: a dash punch you can hold to charge,
// a quick jab, then an uppercut that hits harder, harder still when all three land.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, grantIronFists, IRON_FISTS_ITEM } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { SPELLS, rangedWeapon } from '../src/items.ts';
import { CASTABLES, ensureSlots } from '../src/spell-slots.ts';
import { IRON_FISTS, fistCharge } from '../src/brawler-spells.ts';

function arena(foes, { fists = true } = {}) {
  const s = freshSave(); s.seed = 'FIST'; s.perception.aperture = 3255; if (fists) s.equipment.secondary = { ...IRON_FISTS_ITEM };
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right' }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 50000, maxHp: 50000, damage: 0, cooldown: 99 }));
  return { s, g };
}
const press = (k) => { let used = false; return { state: { x: 0, y: 0 }, consume: (q) => q === k && !used && (used = true), held: () => false }; };
const pressHold = (k) => { let used = false; return { state: { x: 0, y: 0 }, consume: (q) => q === k && !used && (used = true), held: (q) => q === k }; };
const holding = { state: { x: 0, y: 0 }, consume: () => false, held: (k) => k === 'tool' };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const tick = (g, input, t) => g.update(.05, input, t);

test('the Iron Fist spell is retired; its glyphs come back; the Iron Fists tool exists', () => {
  assert.equal(SPELLS['iron-fist'], undefined); assert.equal(CASTABLES['spell:iron-fist'], undefined);
  assert.ok(rangedWeapon(IRON_FISTS_ITEM)?.fist);
  const s = migrateSave(freshSave()); s.spellGlyphs = { 'iron-fist': ['echo', 'heavy'] }; s.glyphs.echo = 0; s.glyphs.heavy = 1; s.equippedSpell = 'iron-fist';
  s.magicSkills.slots = { a: 'spell:iron-fist', b: null }; ensureSlots(s);
  assert.equal(s.magicSkills.slots.a, null); assert.equal(s.glyphs.echo, 1); assert.equal(s.glyphs.heavy, 2); assert.equal(s.spellGlyphs['iron-fist'], undefined); assert.equal(s.equippedSpell, 'ember-ring');
});

test('given once at Infinite III, never twice', () => {
  const low = freshSave(); assert.equal(grantIronFists(low), false);
  const s = freshSave(); s.perception.aperture = 3255; assert.equal(grantIronFists(s), true); assert.ok(s.inventory.some((q) => q.name === 'Iron Fists'));
  s.inventory = []; assert.equal(grantIronFists(s), false, 'not again, even if sold');
});

test('three presses: dash punch, jab, uppercut; the uppercut is a finisher when all three land', () => {
  const { g } = arena([['foe', 13, 10]]); let t = 1000; tick(g, idle, t);
  const hp = () => g.enemies[0].hp, dealt = [];
  for (let i = 0; i < 3; i++) { t += 50; const before = hp(); tick(g, press('tool'), t); t += 50; tick(g, idle, t); t += 50; tick(g, idle, t); dealt.push(before - hp()); }
  assert.ok(dealt.every((d) => d > 0), `all three landed: ${dealt}`);
  assert.equal(g.fistCombo, null, 'the combo is over');
  assert.ok(dealt[2] > dealt[0] * 1.5, `the uppercut finisher hits hardest (${dealt})`);
});

test('the combo resets when the window closes; the jab cannot be charged', () => {
  const { g } = arena([['foe', 13, 10]]); let t = 1000; tick(g, idle, t);
  t += 50; tick(g, press('tool'), t); t += 50; tick(g, idle, t); assert.equal(g.fistCombo?.step, 1);
  t += IRON_FISTS.window * 1000 + 100; tick(g, idle, t);
  t += 50; tick(g, pressHold('tool'), t); assert.ok(g.fistCharge, 'a fresh press starts a new dash punch (charging), not a jab');
  t += 50; tick(g, idle, t); assert.equal(g.fistCombo?.step, 1);
  t += 50; tick(g, pressHold('tool'), t); assert.equal(g.fistCharge, null, 'the jab is thrown at once, even held'); assert.equal(g.fistCombo?.step, 2);
});

test('release 491: the dash punch rushes to a foe in range and stops beside it; charging keeps you in place and hits harder', () => {
  const near = arena([['foe', 13, 10]]); let t = 1000; tick(near.g, idle, t); t += 50; tick(near.g, press('tool'), t);
  const gap = Math.hypot(near.g.enemies[0].x - near.g.player.x, near.g.enemies[0].y - near.g.player.y);
  assert.ok(gap <= IRON_FISTS.punches[0].stop + .3 && gap > .4, `rushed up beside it (gap ${gap.toFixed(2)})`); const tapDmg = 50000 - near.g.enemies[0].hp;
  t += 50; tick(near.g, idle, t); const tapDealt = 50000 - near.g.enemies[0].hp;
  const full = arena([['foe', 13, 10]]); let u = 1000; tick(full.g, idle, u); u += 50; tick(full.g, pressHold('tool'), u);
  for (let i = 0; i < 30; i++) { u += 50; tick(full.g, holding, u); assert.equal(full.g.player.x, 10, 'stays in place while charging'); }
  u += 50; tick(full.g, idle, u); u += 50; tick(full.g, idle, u);
  assert.ok(50000 - full.g.enemies[0].hp > tapDealt * 1.8, `charged hits harder (${tapDealt} -> ${50000 - full.g.enemies[0].hp})`); assert.equal(fistCharge(10), 1);
});

test('release 491: no foe within range, the dash punch lands in place', () => {
  const { g } = arena([['far', 20, 10]]); let t = 1000; tick(g, idle, t); t += 50; tick(g, press('tool'), t);
  assert.equal(g.player.x, 10); assert.equal(g.enemies[0].hp, 50000);
});

test('the rush stops at a wall', () => {
  const { g } = arena([['foe', 13.5, 10]]); for (const t of g.map.tiles) if (t.x === 12) t.blocked = true; let t = 1000; tick(g, idle, t); t += 50; tick(g, press('tool'), t); t += 50; tick(g, idle, t);
  assert.ok(g.player.x < 11.3, `${g.player.x}`);
});
