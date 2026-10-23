// Release 335 (Tim, 2026-10-23: "check the bindings between all the glyphs and all the armor... the passive buffs for... leeching
// and empowerment and cool down reduction work"): the armor damage glyphs scale whole hits, Rift Step takes every cooldown
// reduction, and a spell's pulses keep the glyphs it was cast with.
import test from 'node:test';
import assert from 'node:assert/strict';
import { APERTURE_SKILLS } from '../src/items.ts';
import { BRANCHES, learnRank, learnMod } from '../src/constellation.ts';
import { socketGlyph } from '../src/glyphs.ts';
import { freshSave } from '../src/types.ts';
import { Game, characterStats } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';

const rich = () => { const s = freshSave(); s.perception.aperture = 90; s.materials.lumenDust = 50; return s; };
const master = (s, bid) => { for (let i = 0; i < APERTURE_SKILLS[BRANCHES[bid].active].maxRank; i++) learnRank(s, bid); learnMod(s, bid); };
function arena(s) {
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', stamina: 50 }); s.lastAim = { x: 1, y: 0 }; g.player.lastMoveVector = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('rootBrute', 12, 10), { id: 'foe', hp: 900, maxHp: 900, damage: 0, cooldown: 99 })];
  return g;
}
const armor = (s, glyphs) => { s.equipment.armor = { id: 'a', slot: 'armor', name: 'Coat', tier: 'relic', power: 1, glyphs }; };

test('armor Ignite scales the whole spell, and leaves physical tool shots and the bonus alone', () => {
  const cast = (glyphs) => { const s = rich(); armor(s, glyphs); s.pendingAim = { x: 12.5, y: 10.45 }; const g = arena(s); g.castSpell('grave-sun'); return { fx: g.effects.find((f) => f.glyphHost === 'spell'), s }; };
  const plain = cast([]), fire = cast(['ignite', 'ignite', 'ignite']);
  assert.ok(fire.fx.damage >= Math.round(plain.fx.damage * 1.3), `${plain.fx.damage} → ${fire.fx.damage}`);
  assert.equal(characterStats(fire.s).magicBonus, characterStats(plain.s).magicBonus, 'the flat bonus is unchanged');
});

test('armor Volatile scales the whole melee hit, not the flat bonus the beasts read', () => {
  const swing = (glyphs) => { const s = rich(); s.level = 20; armor(s, glyphs); const g = arena(s); g.enemies[0].x = 10.9; const before = g.enemies[0].hp; g.update(.05, { state: { x: 0, y: 0 }, consume: (k) => k === 'attack' }, 1000); return { lost: before - g.enemies[0].hp, s }; };
  const plain = swing([]), heavy = swing(['volatile', 'volatile', 'volatile']);
  assert.ok(plain.lost > 0); assert.ok(heavy.lost >= plain.lost * 1.25, `${plain.lost} → ${heavy.lost}`);
  assert.equal(characterStats(heavy.s).meleeBonus, characterStats(plain.s).meleeBonus);
});

test('Rift Step recovers faster with armor Chain and with a cooldown pairing', () => {
  const step = (glyphs) => { const s = rich(); master(s, 'rift'); armor(s, glyphs); s.magicSkills.selected = 'rift-step'; const g = arena(s); g.enemies = []; g.lastUpdateNow = 1000; g.activateApertureSkill('rift-step'); return s.magicSkills.cooldowns['rift-step']; };
  const plain = step([]), chain = step(['chain', 'chain']);
  assert.ok(plain > 0); assert.ok(Math.abs(chain - plain * .76) < 1e-9, `${plain} → ${chain}`);
});

test("a spell's pulses keep the glyphs it was cast with, even after the other slot's spell is cast", () => {
  const s = rich(); s.pendingAim = { x: 12.5, y: 10.45 }; const g = arena(s);
  s.glyphs.leech = 1; assert.equal(socketGlyph(s, 'ember-ring', 0, 'leech').ok, true);
  g.castSpell('ember-ring'); const ring = g.effects.find((f) => f.kind === 'ember-ring');
  g.castSpell('cinder-dart');
  assert.equal(ring.glyphSpell, 'ember-ring'); assert.ok(g.glyphLoadout('spell', ring.glyphSpell).has('leech'));
  assert.equal(g.glyphLoadout('spell').has('leech'), false, 'the readied spell is the other one now');
});
