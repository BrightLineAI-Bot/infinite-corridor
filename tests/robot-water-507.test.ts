// Release 507 (Tim, 2026-10-27): "when I go into the water, I lose stamina, and I can't go between tiles... make sure that
// the submersible suit works very well". In the robot, water costs no stamina, needs no Tidemantle and its edges can be
// crossed anywhere. And (Tim: "each time you do an echo, it should do another hammer... the second echo should just make
// another shot that does twenty five percent damage"): a second Echo glyph on the tool adds a third blow or shot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, BRAWLER_GEAR } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { GLYPHS, echoPlan, hostLoadout } from '../src/glyphs.ts';
import { BRAWLER_ECHO } from '../src/brawler-spells.ts';

const move = (x, y) => ({ state: { x, y }, consume: () => false, held: () => false });
function suitedAtSea() {
  const s = freshSave(); s.seed = 'SUB'; s.perception.aperture = 3255; s.farArray = { listeners: 2 }; s.consumables.submersible = 1; s.capabilities = { ...(s.capabilities || {}), swim: false };
  const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = [];
  assert.equal(g.useConsumable('submersible', 0), true, g.message); assert.ok(g.mechUp());
  g.map.tiles = g.map.tiles.map((t) => ({ ...t, kind: 'ocean', blocked: false, structure: null, environment: null }));
  Object.assign(g.player, { x: 16, y: 16, stamina: 40, hp: 100 }); s.maxHp = 100;
  return { s, g };
}

test('in the robot the sea carries you without the Tidemantle and costs no stamina', () => {
  const { g } = suitedAtSea(); let t = 1000;
  for (let i = 0; i < 40; i++) { t += 50; g.update(.05, move(i % 2 ? .3 : -.3, 0), t); }
  assert.equal(g.player.hp, 100, `alive and unhurt: ${g.message}`); assert.ok(g.swimming, 'wading'); assert.ok(g.player.stamina >= 40, `no stamina spent (${g.player.stamina})`);
});

test('in the robot a section edge over water can be crossed anywhere, not only at the exits', () => {
  const { g } = suitedAtSea(); let t = 1000; g.update(.05, move(0, 0), t);
  const y = g.map.exits.east > 16 ? 4 : 27; Object.assign(g.player, { x: 30.9, y });
  for (let i = 0; i < 20 && g.rx === 3; i++) { t += 50; g.update(.05, move(1, 0), t); }
  assert.equal(g.rx, 4, `crossed east: ${g.message}`); assert.ok(g.player.x < 2);
});

test('without the robot or Tidemantle the walker still cannot swim', () => {
  const s = freshSave(); s.seed = 'SUB'; s.capabilities = { ...(s.capabilities || {}), swim: false }; const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld');
  assert.equal(g.swimsHere('ocean'), false); assert.equal(g.swimsHere('ash'), false);
});

const gear = (name, glyphs) => ({ ...BRAWLER_GEAR.find((q) => q.item.name === name).item, glyphs });
function arena(setup) {
  const s = freshSave(); s.seed = 'ECHO'; s.perception.aperture = 3255; setup(s); const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.maxHp = 100; s.lastAim = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('rootBrute', 12, 10), { id: 'foe', hp: 50000, maxHp: 50000, damage: 0, cooldown: 99 })];
  return { s, g };
}

test('Hammerfall: one Echo drops a second hammer, two Echoes a third, each a moment after the last', () => {
  for (const [glyphs, n] of [[[null, null], 1], [['echo', null], 2], [['echo', 'echo'], 3]]) {
    const { g } = arena((s) => { s.equipment.secondary = gear('Hammerfall', glyphs); }); g.update(.05, move(0, 0), 1000);
    g.brawlerTool('hammerfall', 1050); const hammers = g.effects.filter((e) => e.kind === 'hammerfall');
    assert.equal(hammers.length, n, `${n} hammers with ${glyphs.filter(Boolean).length} Echo`);
    for (let i = 1; i < n; i++) assert.ok(Math.abs(hammers[i].delay - hammers[i - 1].delay - BRAWLER_ECHO.toolGap) < 1e-9, 'bang, bang, boom');
    if (n === 3) { const base = hammers[0].damage; assert.equal(hammers[1].damage, Math.max(1, Math.round(base * GLYPHS.echo.echo.tool[1]))); assert.equal(hammers[2].damage, Math.max(1, Math.round(base * GLYPHS.echo.third.tool))); }
  }
});

test('a tool shot with two Echo glyphs sends a third shot at 25%', () => {
  const s = freshSave(); s.equipment.secondary = { ...(s.equipment.secondary || {}), glyphs: ['echo', 'echo'] };
  const plan = echoPlan(hostLoadout(s, 'tool')); assert.ok(plan, 'an echo plan');
  assert.deepEqual(plan.copies.map((c) => c.share), [.6, .25]);
  const one = freshSave(); one.equipment.secondary = { ...(one.equipment.secondary || {}), glyphs: ['echo', null] };
  assert.equal(echoPlan(hostLoadout(one, 'tool')).copies.length, 1);
  const spell = freshSave(); spell.spellGlyphs = { 'cinder-dart': ['echo', 'echo'] }; assert.equal(echoPlan(hostLoadout(spell, 'spell', 'cinder-dart')).copies.length, 1, 'spells keep one echo at 75%');
});
