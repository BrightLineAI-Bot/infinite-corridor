// Tim (2026-11-11): "a 10% damage decrease for the Wayfarer, just across the board." One data-table scale
// (WAYFARER_DAMAGE.scale) on every blow credited to the Wayfarer, applied where it meets a foe's health. Each source is
// measured twice in the same arena, once with the scale at 1 (the old damage) and once as shipped.
import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, updateProjectiles, updateEffects, regionalScale, characterStats } from '../src/game.ts';
import { createCombatant, WAYFARER_DAMAGE, wayfarerDamage } from '../src/combat.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';
import { primaryProfile } from '../src/items.ts';
import { regionalThreat } from '../src/world.ts';

const SHIPPED = WAYFARER_DAMAGE.scale;
const weapon = (slot) => normalizeSockets({ id: `${slot}-wd`, name: slot === 'primary' ? 'Verge Cleaver' : 'Needle Caster', slot, power: 12, property: slot === 'primary' ? 'impact' : 'quick', tier: 'relic', affixes: [] });
function arena(level = 30) {
  const s = freshSave(); s.seed = 'WAYDMG'; s.level = level; s.stats = { ...s.stats, Might: 20, Focus: 20 };
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon';
  s.equipment.primary = weapon('primary'); s.equipment.secondary = weapon('secondary');
  Object.assign(g.player, { x: 10, y: 10, facing: 'right' }); s.lastAim = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('rootBrute', 11.2, 10), { id: 'foe-0', hp: 5000, maxHp: 5000 })];
  return { s, g, e: g.enemies[0] };
}
const step = (g, ms, from) => { for (let t = 0; t < ms; t += 50) g.update(.05, { state: { x: 0, y: 0 }, consume: () => false }, from + t); };
// Health taken from the foe by `act`, at the old scale (1) and the shipped one.
function both(act) {
  const out = [];
  for (const scale of [1, SHIPPED]) {
    WAYFARER_DAMAGE.scale = scale;
    try { const a = arena(); act(a); out.push(5000 - a.e.hp); } finally { WAYFARER_DAMAGE.scale = SHIPPED; }
  }
  return out;
}
// One blow: exactly wayfarerDamage of the old amount. Several blows (or burn ticks): within rounding of scale x old.
const one = (label, [raw, now]) => { assert.ok(raw > 0, `${label}: it lands`); assert.equal(now, Math.max(1, Math.round(raw * SHIPPED)), `${label}: ${raw} -> ${now}`); };
const many = (label, [raw, now], slack = 3) => { assert.ok(raw > 0, `${label}: it lands`); assert.ok(now < raw && Math.abs(now - raw * SHIPPED) <= slack, `${label}: ${raw} -> ${now}`); };

test('the Wayfarer damage scale is one data-table number: 0.9', () => {
  assert.deepEqual(WAYFARER_DAMAGE, { scale: .9 });
  assert.equal(wayfarerDamage(0), 0); assert.equal(wayfarerDamage(.4), 0, 'a blow that rounded to nothing still does');
  assert.equal(wayfarerDamage(1), 1, 'a landing blow never drops to 0'); assert.equal(wayfarerDamage(10), 9); assert.equal(wayfarerDamage(115), 104);
  assert.equal(wayfarerDamage(NaN), 0); assert.equal(wayfarerDamage(-5), 0);
});

test('melee swings land at 0.9', () => {
  one('swing', both(({ g }) => { g.primaryAttack(1000, { x: 1, y: 0 }); }));
});

test('tool and gun shots land at 0.9', () => {
  many('tool shot', both(({ g }) => { g.fireSecondary(1000, { x: 1, y: 0 }); step(g, 1500, 1000); }));
});

test('spells land at 0.9', () => {
  many('Cinder Dart', both(({ s, g, e }) => { s.equippedSpell = 'cinder-dart'; s.pendingAim = { x: e.x + .5, y: e.y + .45 }; assert.equal(g.castSpell(), true); step(g, 1500, 1000); }));
});

test('brawler spells and punches (effects) land at 0.9', () => {
  one('brawler pulse', both(({ g, e }) => { g.brawlerEffect({ id: 'test-punch', lifetime: .3, radius: 2, pulse: 99 }, e.x + .5, e.y + .45, 50); step(g, 100, 1000); }));
});

test('echoes and glyph bursts (the glyph world) land at 0.9', () => {
  one('glyph damage', both(({ g, e }) => { g.glyphWorld(1000).damage(e, 50); }));
  one('glyph blast', both(({ g, e }) => { g.glyphWorld(1000).blast(e.x + .5, e.y + .45, 1, 80); }));
  many('melee echo', both(({ s, g }) => { s.glyphs.echo = 1; assert.equal(socketGlyph(s, 'melee', 0, 'echo').ok, true); g.primaryAttack(1000, { x: 1, y: 0 }); step(g, 1500, 1000); }));
});

test('burns (damage over time) tick at 0.9', () => {
  many('burn', both(({ g, e }) => { e.glyphBurn = { until: 10000, dps: 100, tick: 0 }; g.tickGlyphs(1, 1000); g.tickGlyphs(1, 2000); }), 1);
});

test('the Shadow Clone\'s swing and the Aether Orrery land at 0.9', () => {
  one('clone swing', both(({ s, g }) => { g.shadowClone = { ox: 0, oy: 0, until: 99999 }; g.cloneSwing(primaryProfile(s.equipment.primary), { x: 1, y: 0 }, 1000); }));
  one('orrery strike', both(({ g, e }) => { g.orreryStrike(e, 60, 1000); }));
});

test('the exported updaters keep their old arithmetic unless told otherwise; hostile blasts never take the scale', () => {
  const foe = () => Object.assign(createCombatant('rootBrute', 5, 5), { id: 'x', hp: 500, maxHp: 500 });
  const map = { tiles: Array.from({ length: 400 }, () => ({ kind: 'ash', blocked: false })) };
  let e = foe(); updateProjectiles([{ id: 'p', x: 5.5, y: 5.45, dx: 1, dy: 0, speed: 0, life: 1, damage: 40, path: 'straight', hits: {} }], [e], map, 20, .05);
  assert.equal(e.hp, 460);
  e = foe(); updateEffects([{ id: 'f', x: 5.5, y: 5.45, life: 1, radius: 2, pulse: 9, untilPulse: 0, damage: 40, hits: {} }], [e], .05);
  assert.equal(e.hp, 460);
  e = foe(); updateEffects([{ id: 'f', x: 5.5, y: 5.45, life: 1, radius: 2, pulse: 9, untilPulse: 0, damage: 40, hits: {} }], [e], .05, () => {}, (f) => f.damage, () => {}, wayfarerDamage);
  assert.equal(e.hp, 464);
  e = foe(); updateEffects([{ id: 'f', x: 5.5, y: 5.45, life: 1, radius: 2, pulse: 9, untilPulse: 0, damage: 40, hits: {}, hostile: true }], [e], .05, () => {}, (f) => f.damage, () => {}, wayfarerDamage);
  assert.equal(e.hp, 500, 'a hostile effect does not strike foes at all');
});

test('enemy health and damage are untouched, and the Wayfarer takes the same blows', () => {
  const make = () => { const { g } = arena(); return ['ashling', 'rootBrute', 'hollowMarshal'].map((kind) => { const e = regionalScale(g.createEnemyFromSpawn({ id: kind, kind, x: 5, y: 5, boss: kind === 'hollowMarshal' }, 'dungeon'), regionalThreat(60, 0)); return [e.maxHp, e.hp, e.damage]; }); };
  WAYFARER_DAMAGE.scale = 1; let old; try { old = make(); } finally { WAYFARER_DAMAGE.scale = SHIPPED; }
  assert.deepEqual(make(), old);
  assert.deepEqual([createCombatant('ashling', 0, 0).hp, createCombatant('ashling', 0, 0).damage], [24, 5]);
});

test('healing from blows keeps the unscaled amount (Leech)', () => {
  const healed = [];
  for (const scale of [1, SHIPPED]) {
    WAYFARER_DAMAGE.scale = scale;
    try { const { s, g } = arena(); s.maxHp = 1000; g.player.hp = 100; s.glyphs.leech = 1; assert.equal(socketGlyph(s, 'melee', 0, 'leech').ok, true); g.primaryAttack(1000, { x: 1, y: 0 }); step(g, 200, 1000); healed.push(g.player.hp); } finally { WAYFARER_DAMAGE.scale = SHIPPED; }
  }
  assert.ok(healed[0] > 100, `Leech healed (${healed[0]})`); assert.equal(healed[1], healed[0]);
});

test('deterministic: the same fight takes the same health', () => {
  const run = () => { const { s, g, e } = arena(); s.equippedSpell = 'cinder-dart'; g.primaryAttack(1000, { x: 1, y: 0 }); g.fireSecondary(1000, { x: 1, y: 0 }); s.pendingAim = { x: e.x + .5, y: e.y + .45 }; g.castSpell(); step(g, 2000, 1000); return e.hp; };
  assert.equal(run(), run());
});

test('the gold damage numbers show the scaled blow', () => {
  const shown = [];
  for (const scale of [1, SHIPPED]) {
    WAYFARER_DAMAGE.scale = scale;
    try { const { g, e } = arena(); g.damageNumbers = true; g.trackDamageNumbers(900); const before = e.hp; g.primaryAttack(1000, { x: 1, y: 0 }); const lost = before - e.hp; g.trackDamageNumbers(1000);
      const n = (g.damageFloaters || []).filter((f) => f.kind === 'dealt'); assert.equal(n.length, 1); assert.equal(n[0].text, String(lost)); shown.push(Number(n[0].text)); } finally { WAYFARER_DAMAGE.scale = SHIPPED; }
  }
  assert.equal(shown[1], wayfarerDamage(shown[0]));
});

// Tim (2026-11-11): "They should show the new numbers", whole numbers, rounded as wayfarerDamage rounds, in the same wording.
test('the character sheet and spell text show the scaled damage, whole, as a plain hit lands it', () => {
  const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), game = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
  for (const shown of ['`+${wayfarerDamage(derived.meleeBonus)} melee bonus`', '`+${wayfarerDamage(derived.magicBonus)} spell/projectile bonus`', '+${wayfarerDamage(characterStats(save).magicBonus)} spell damage`',
    'now +${wayfarerDamage(imbueAmount(save.stats?.Focus,characterStats(save).magicBonus))} a hit', 'power ${wayfarerDamage(show.damage)} · reach', '+${wayfarerDamage(r * 2)} melee and +${wayfarerDamage(r * 2)} spell damage'])
    assert.ok(src.includes(shown), `main.ts shows ${shown}`);
  assert.ok(!/\+\$\{derived\.(meleeBonus|magicBonus)\}/.test(src) && !src.includes('+${characterStats(save).magicBonus} spell damage'), 'no unscaled damage line is left');
  assert.ok(game.includes('const n = wayfarerDamage(this.imbueBonus(now)); this.message = n > 0 ? `Imbue Weapon: your melee hits carry ${n} magic damage.`'));
  // The numbers: whole, and exactly what a plain hit of that size takes from a foe.
  const s = freshSave(); s.level = 30; s.stats = { ...s.stats, Might: 34, Focus: 36 }; const st = characterStats(s);
  for (const n of [st.meleeBonus, st.magicBonus, 7, 2, 107.4, 1]) { const shown = wayfarerDamage(n); assert.ok(Number.isInteger(shown), `${n} -> ${shown}`); assert.equal(shown, Math.max(1, Math.round(n * .9))); }
  const { g, e } = arena(); g.enemies[0].hp = 5000; const raw = 50; g.brawlerEffect({ id: 'sheet', lifetime: .3, radius: 2, pulse: 99 }, e.x + .5, e.y + .45, raw); step(g, 100, 1000);
  assert.equal(5000 - e.hp, wayfarerDamage(raw), 'what the sheet says is what lands');
  const imbue = arena(); imbue.s.stats.Focus = 30; imbue.g.castSpell('imbue-weapon'); assert.match(imbue.g.message, new RegExp(`carry ${wayfarerDamage(imbue.g.imbueBonus(imbue.g.lastUpdateNow || 0))} magic damage`));
});
