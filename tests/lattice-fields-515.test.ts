// Release 515 (Tim, 2026-10-28): Lattice passives that work while your spells are in play, or while you stand inside them,
// and one for the dodge: Sanctum, Wellspring Ground, Charged Air, Spellblade, Drift Field.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { FIELD_PASSIVES, FIELD_KEYS, fieldForm } from '../src/lattice-fields.ts';
import { toggleLatticePassive, passiveForm } from '../src/constellation.ts';
import { latticeOpen, ensureLattice } from '../src/transit-lattice.ts';

function arena(passives = [], setup = () => {}) {
  const s = freshSave(); s.seed = 'FIELD'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; setup(s); ensureLattice(s); s.lattice.passives = passives.map((id) => `field:${id}`);
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.maxHp = 100; s.lastAim = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('rootBrute', 13, 10), { id: 'foe', hp: 50000, maxHp: 50000, damage: 0, cooldown: 99 })];
  return { s, g };
}
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const field = (g, extra = {}) => { const e = { id: 'spell-f', kind: 'stillpoint', glyphHost: 'spell', glyphSpell: 'stillpoint', x: g.player.x + .5, y: g.player.y + .45, life: 5, radius: 2.8, pulse: 99, untilPulse: 99, damage: 0, pulseIndex: 0, hits: {}, ...extra }; g.effects.push(e); return e; };

test('the five field passives are Lattice passives that need nothing learned', () => {
  assert.equal(FIELD_KEYS.length, 5);
  const { s } = arena(); assert.ok(latticeOpen(s), 'the Lattice is open in this fixture');
  for (const key of FIELD_KEYS) { assert.equal(passiveForm(key).name, fieldForm(key).name); const r = toggleLatticePassive(s, key); if (s.lattice.passives.length <= 2) assert.ok(r.ok || /slot/.test(r.message), r.message); }
  assert.ok(s.lattice.passives.every((k) => FIELD_KEYS.includes(k)));
});

test('Sanctum: inside your own field you take less and mend; outside, nothing', () => {
  const { g } = arena(['sanctum']); field(g); g.player.hp = 50; let t = 1000; for (let i = 0; i < 20; i++) { t += 50; g.update(.05, idle, t); }
  assert.ok(g.player.hp > 50 + 100 * FIELD_PASSIVES.sanctum.mend * .9, `mended (${g.player.hp})`);
  assert.ok(g.inOwnField()); g.effects[0].x += 6; assert.equal(g.inOwnField(), false);
});

test('Wellspring Ground: spells recover faster inside your field', () => {
  const run = (on) => { const { s, g } = arena(on ? ['wellspring'] : []); field(g); s.magicSkills.cooldowns = { 'spell:ember-ring': 5 }; let t = 1000; for (let i = 0; i < 20; i++) { t += 50; g.update(.05, idle, t); } return s.magicSkills.cooldowns['spell:ember-ring']; };
  const plain = run(false), well = run(true); assert.ok(5 - well > (5 - plain) * 1.25, `${plain} vs ${well}`);
});

test('Charged Air: with a spell running, tool shots grow and hit harder', () => {
  const shot = (on, running) => { const { s, g } = arena(on ? ['charged-air'] : []); s.equipment.secondary = { id: 't', name: 'Needle Caster', slot: 'secondary', property: 'quick', power: 5, tier: 'common', affixes: [] }; if (running) field(g); g.update(.05, idle, 1000); g.fireSecondary(1100, { x: 1, y: 0 }); return g.projectiles.find((p) => !p.hostile && String(p.id).startsWith('shot-')); };
  const plain = shot(true, false), charged = shot(true, true), off = shot(false, true);
  assert.equal(plain.scale, undefined); assert.equal(off.scale, undefined);
  assert.equal(charged.scale, FIELD_PASSIVES['charged-air'].scale); assert.ok(charged.damage > plain.damage, `${charged.damage} > ${plain.damage}`);
});

test('Spellblade: with a spell running, the Iron Fists and weapon strikes hit harder', () => {
  const { g } = arena(['spellblade']); const before = g.fistPower(); field(g); assert.ok(g.spellRunning()); assert.ok(Math.abs(g.fistPower() / before - (1 + FIELD_PASSIVES.spellblade.damage)) < 1e-9);
  const { g: h } = arena([]); field(h); assert.equal(h.spellbladeOn(), false);
});

test('Drift Field: a dodge drags your nearest field to where you land', () => {
  const { g } = arena(['drift-field']); const now = (i) => i === 0 ? { state: { x: 0, y: 1 }, consume: (k) => k === 'dodge', held: () => false } : idle; const f = field(g, { x: 8, y: 10.45 }); let t = 1000; g.update(.05, idle, t);
  let used = false; for (let i = 0; i < 16; i++) { t += 50; g.update(.05, now(i), t); }
  assert.ok(Math.hypot(f.x - (g.player.x + .5), f.y - (g.player.y + .45)) < .5, `the field followed (${f.x.toFixed(2)},${f.y.toFixed(2)} vs ${g.player.x.toFixed(2)},${g.player.y.toFixed(2)})`);
  assert.ok(g.player.y > 10.5, 'the Wayfarer moved'); assert.ok(f.y > 10.9, 'from where it was');
});
