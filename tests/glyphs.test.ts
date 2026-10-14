import test from 'node:test';
import assert from 'node:assert/strict';
import { GLYPHS, GLYPH_IDS, RESONANCES, hostLoadout, resonancesOf, socketGlyph, craftGlyph, ensureGlyphState, normalizeSockets, socketCount, glyphDrop, DUST_PER_GLYPH } from '../src/glyphs.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, salvageInventoryItem } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { generateItem } from '../src/items.ts';
import { createLabFixture, scenariosForLab, labReport } from '../src/proving-ground-labs.ts';

const weapon = (slot, tier = 'relic') => normalizeSockets({ id: `${slot}-test`, name: slot === 'primary' ? 'Verge Cleaver' : 'Needle Caster', slot, power: 4, property: slot === 'primary' ? 'impact' : 'quick', tier, affixes: [] });
function arena(glyphs = {}, foes = [[11.2, 10]]) {
  const s = freshSave(), g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon';
  s.equipment.primary = weapon('primary'); s.equipment.secondary = weapon('secondary');
  for (const [host, list] of Object.entries(glyphs)) {
    for (const id of list) s.glyphs[id] = (s.glyphs[id] || 0) + 1;
    list.forEach((id, i) => assert.equal(socketGlyph(s, host === 'spell' ? (s.equippedSpell || 'ember-ring') : host, i, id).ok, true));
  }
  Object.assign(g.player, { x: 10, y: 10, facing: 'right' }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: `foe-${i}`, hp: 400, maxHp: 400 }));
  return { s, g };
}
const step = (g, ms, from) => { for (let t = 0; t < ms; t += 50) g.update(.05, { state: { x: 0, y: 0 }, consume: () => false }, from + t); };

test('saves gain glyph state once: starter glyphs, weapon sockets by tier, two spell sockets', () => {
  const s = freshSave();
  assert.deepEqual(['ignite', 'chain', 'echo'].map((id) => s.glyphs[id]), [1, 1, 1]);
  assert.equal(GLYPH_IDS.length, 10); assert.equal(Object.keys(RESONANCES).length, 8);
  for (const r of Object.values(RESONANCES)) assert.ok(r.pair.every((g) => GLYPHS[g]), r.name);
  assert.equal(socketCount(weapon('primary', 'common')), 1); assert.equal(socketCount(weapon('primary', 'relic')), 3);
  assert.equal(socketCount({ slot: 'armor', tier: 'relic' }), 0);
  const old = freshSave(); delete old.glyphs; delete old.glyphGrant; delete old.glyphCodex; delete old.spellGlyphs; old.inventory = [{ ...generateItem('X', 9) }]; delete old.inventory[0].glyphs;
  const m = migrateSave(JSON.parse(JSON.stringify(old)));
  assert.equal(m.glyphs.ignite, 1, 'old saves get the starter glyphs');
  if (socketCount(m.inventory[0])) assert.equal(m.inventory[0].glyphs.length, socketCount(m.inventory[0]));
  const again = migrateSave(JSON.parse(JSON.stringify(m)));
  assert.equal(again.glyphs.ignite, 1, 'the grant happens once');
  assert.equal(migrateSave(JSON.parse(JSON.stringify(old))).version, 14, 'save schema unchanged');
});

test('socketing moves glyphs, swapping returns them, salvage refunds glyphs and dust, inscribing needs a known pattern', () => {
  const s = freshSave(); s.equipment.primary = weapon('primary', 'rare');
  assert.equal(socketGlyph(s, 'melee', 0, 'ignite').ok, true); assert.equal(s.glyphs.ignite, 0);
  assert.equal(socketGlyph(s, 'melee', 1, 'ignite').ok, false, 'none left');
  socketGlyph(s, 'melee', 0, 'chain'); assert.equal(s.glyphs.ignite, 1); assert.equal(s.glyphs.chain, 0);
  assert.equal(socketGlyph(s, 'melee', 5, 'echo').ok, false);
  const item = weapon('secondary', 'epic'); item.glyphs = ['echo', null]; s.glyphs.echo = 0; s.inventory = [item];
  const dust = s.glyphDust; salvageInventoryItem(s, 0);
  assert.equal(s.glyphs.echo, 1); assert.equal(s.glyphDust, dust + 3);
  assert.equal(craftGlyph(s, 'still').ok, false, 'unknown pattern');
  s.glyphCodex.glyphs.still = true; s.glyphDust = DUST_PER_GLYPH - 1; assert.equal(craftGlyph(s, 'still').ok, false);
  s.glyphDust = DUST_PER_GLYPH; assert.equal(craftGlyph(s, 'still').ok, true); assert.equal(s.glyphs.still, 1); assert.equal(s.glyphDust, 0);
});

test('loadouts: the same glyph changes each host differently, and pairs light resonances', () => {
  const { s } = arena({ melee: ['pierce', 'heavy'], tool: ['pierce', 'swift'], spell: ['pierce', 'echo'] });
  const m = hostLoadout(s, 'melee'), t = hostLoadout(s, 'tool'), sp = hostLoadout(s, 'spell');
  assert.ok(Math.abs(m.mods.range - 1.3) < 1e-9 && Math.abs(m.mods.damage - 1.35) < 1e-9 && Math.abs(m.mods.cooldown - 1.25) < 1e-9);
  assert.equal(t.mods.pierce, 3); assert.ok(t.mods.cooldown < 1);
  assert.ok(Math.abs(sp.mods.radius - 1.3) < 1e-9); assert.deepEqual(sp.resonances, ['afterimage']);
  assert.deepEqual(resonancesOf(['ignite', 'echo', 'chain']).sort(), ['ember-choir', 'wildfire']);
});

test('melee glyphs in play: ignite burns over time, chain arcs, echo repeats, leech heals, still freezes', () => {
  let { s, g } = arena({ melee: ['ignite', 'chain', 'leech'] }, [[11.2, 10], [12.6, 10]]);
  g.player.hp = 20; const [a, b] = g.enemies;
  g.primaryAttack(1000, { x: 1, y: 0 });
  const afterHit = a.hp;
  assert.ok(a.hp < 400 && b.hp < 400, 'chain arcs to the second foe');
  assert.ok(a.glyphBurn && b.glyphBurn, 'Ignite + Chain is Wildfire: the arc carries the fire');
  assert.equal(s.glyphCodex.resonances.wildfire, true);
  assert.ok(g.player.hp > 20, 'leech heals');
  step(g, 1500, 1100); assert.ok(a.hp < afterHit, 'burn ticks');
  ({ s, g } = arena({ melee: ['echo', 'still', 'tether'] }));
  const foe = g.enemies[0];
  g.primaryAttack(1000, { x: 1, y: 0 }); const first = 400 - foe.hp;
  assert.ok(foe.hitStun >= .5 && foe.glyphSlow, 'still freezes and tether slows');
  assert.equal(s.glyphCodex.resonances['grave-tether'], true, 'resonance recorded on first use');
  step(g, 400, 1050);
  assert.ok(400 - foe.hp >= first * 1.4, `echo repeats the swing (${first} then ${400 - foe.hp})`);
});

test('tool glyphs: pierce passes through a line of foes, volatile bursts on impact', () => {
  let { g } = arena({ tool: ['pierce'] }, [[12, 10], [14, 10], [16, 10]]);
  g.fireSecondary(1000, { x: 1, y: 0 });
  step(g, 1500, 1000);
  assert.ok(g.enemies.every((e) => e.hp < 400), 'one shot hit all three');
  ({ g } = arena({ tool: ['volatile'] }, [[13, 10], [13.4, 11]]));
  g.fireSecondary(1000, { x: 1, y: 0 });
  step(g, 1500, 1000);
  assert.ok(g.enemies[1].hp < 400, 'the burst hit the foe beside the target');
});

test('spell glyphs: echo recasts after the spell ends, ember choir doubles echoes on burning foes', () => {
  const { s, g } = arena({ spell: ['ignite', 'echo'] }, [[12, 10]]);
  s.pendingAim = { x: 12.5, y: 10.45 }; s.equippedSpell = 'cinder-dart';
  socketGlyph(s, 'ember-ring', 0, null); socketGlyph(s, 'ember-ring', 1, null);
  socketGlyph(s, 'cinder-dart', 0, 'ignite'); socketGlyph(s, 'cinder-dart', 1, 'echo');
  assert.equal(g.castSpell(), true);
  const effects = g.effects.filter((f) => f.glyphHost === 'spell');
  assert.equal(effects.length, 2); assert.ok(effects[1].delay > 0 && effects[1].echo);
  step(g, 3000, 1000);
  assert.equal(s.glyphCodex.resonances['ember-choir'], true);
  assert.ok(g.enemies[0].hp < 400 - 7, 'cast, burn and echo all landed');
});

test('guardians always leave a glyph; ordinary drops are deterministic and occasional', () => {
  const s = freshSave(), before = Object.values(s.glyphs).reduce((a, b) => a + b, 0);
  assert.ok(glyphDrop(s, 'boss', 1, true));
  let found = 0; for (let n = 0; n < 400; n++) if (glyphDrop(s, 'kill', n)) found++;
  assert.ok(found > 20 && found < 90, `about 12% (${found}/400)`);
  assert.equal(Object.values(s.glyphs).reduce((a, b) => a + b, 0), before + 1 + found);
});

test('the Glyph Forge lab loads every scenario with sockets set', () => {
  for (const sc of scenariosForLab('forge')) {
    const f = createLabFixture({ lab: 'forge', scenario: sc.id, now: 0 });
    assert.equal(labReport(f).scratch, true);
    assert.equal(f.save.equipment.primary.glyphs.length, 3);
    if (sc.id !== 'sandbox') assert.ok(hostLoadout(f.save, 'melee').resonances.includes(sc.id.slice(10)), sc.id);
  }
});
