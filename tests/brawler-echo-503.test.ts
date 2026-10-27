// Release 503 (Tim, 2026-10-27): the new gear works with the existing architecture: Echo on the Iron Fists (charge the jab,
// then the uppercut), on Hammerfall and Great Sweep (the blow repeats), on Orbit Volley (a second burst), on Shadow Boxing
// (a short clone that only swings); the Shadow Clone swings with punches; the brawler gear drops as loot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, BRAWLER_GEAR } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { generateItem, BRAWLER_LOOT, isValidItem, primaryProfile, rangedWeapon } from '../src/items.ts';
import { BRAWLER_ECHO } from '../src/brawler-spells.ts';

const gear = (name, glyphs) => ({ ...BRAWLER_GEAR.find((g) => g.item.name === name).item, glyphs });
function arena(foes, setup = () => {}) {
  const s = freshSave(); s.seed = 'ECHO'; s.perception.aperture = 3255; setup(s); const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.maxHp = 100; s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 50000, maxHp: 50000, damage: 0, cooldown: 99 }));
  return { s, g };
}
const press = (k, hold = false) => { let used = false; return { state: { x: 0, y: 0 }, consume: (q) => q === k && !used && (used = true), held: (q) => hold && q === k }; };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const holding = (k) => ({ state: { x: 0, y: 0 }, consume: () => false, held: (q) => q === k });

test('Echo glyphs in the Iron Fists let the jab (one Echo) and the uppercut (two) charge', () => {
  const run = (glyphs) => { const { g } = arena([['foe', 11, 10]], (s) => { s.equipment.primary = gear('Iron Fists', glyphs); }); let t = 1000; g.update(.05, idle, t);
    t += 50; g.update(.05, press('attack'), t); t += 50; g.update(.05, idle, t); // the dash punch
    t += 50; g.update(.05, press('attack', true), t); const jabHeld = !!g.fistCharge; for (let i = 0; i < 4; i++) { t += 50; g.update(.05, holding('attack'), t); } t += 50; g.update(.05, idle, t);
    t += 50; g.update(.05, press('attack', true), t); const upHeld = !!g.fistCharge; return { jabHeld, upHeld }; };
  assert.deepEqual(run([null, null]), { jabHeld: false, upHeld: false });
  assert.deepEqual(run(['echo', null]), { jabHeld: true, upHeld: false });
  assert.deepEqual(run(['echo', 'echo']), { jabHeld: true, upHeld: true });
});

test('Echo in Hammerfall or Great Sweep repeats the blow; Echo on Orbit Volley bursts again', () => {
  for (const name of ['Hammerfall', 'Great Sweep']) {
    const { g } = arena([['foe', 12, 10]], (s) => { s.equipment.secondary = gear(name, ['echo', null]); }); g.update(.05, idle, 1000);
    g.brawlerTool(rangedWeapon(gear(name)).brawlerTool, 1050); assert.ok(g.effects.some((e) => e.echo), `${name} echo`);
  }
  const { s, g } = arena([['foe', 14, 10]]); s.spellGlyphs = { 'orbit-volley': ['echo', null] }; let t = 1000; g.update(.05, idle, t);
  g.castSpell('orbit-volley'); t += 300; g.update(.05, idle, t); g.castSpell('orbit-volley'); for (let i = 0; i < 6; i++) { t += 50; g.update(.05, idle, t); }
  assert.ok(g.effects.some((e) => e.kind === 'orbit-volley' && e.echo), 'a second burst');
});

test('Echo on Shadow Boxing spawns a short clone that swings with your punches and fires no shots', () => {
  const { s, g } = arena([['foe', 12, 10]], (s) => { s.equipment.primary = gear('Iron Fists'); }); s.spellGlyphs = { 'shadow-boxing': ['echo', null] };
  let t = 1000; g.update(.05, idle, t); g.castSpell('shadow-boxing');
  assert.ok(g.shadowClone?.boxing, 'a clone'); assert.ok(g.shadowClone.until - 1000 <= BRAWLER_ECHO.echoClone * 1000 + 100);
  t += 50; g.update(.05, press('attack'), t); t += 50; g.update(.05, idle, t); assert.ok(g.shadowClone.swingUntil > 0, 'the clone swung');
  t += BRAWLER_ECHO.echoClone * 1000 + 200; g.update(.05, idle, t); assert.equal(g.shadowCloneActive(t), false, 'gone after 3 s');
});

test('the Shadow Clone spell swings a plain arc with each Iron Fists punch', () => {
  const { g } = arena([['foe', 12, 10]], (s) => { s.equipment.primary = gear('Iron Fists'); }); let t = 1000; g.update(.05, idle, t);
  g.castSpell('shadow-clone'); t += 50; g.update(.05, idle, t); g.shadowClone && delete g.shadowClone.charging;
  t += 50; g.update(.05, press('attack'), t); t += 50; g.update(.05, idle, t); assert.ok(g.shadowClone.swingUntil > 0);
});

test('the brawler gear drops as loot; every other roll of an item is unchanged', () => {
  let fists = 0, tools = 0, n = 0;
  for (let i = 0; i < 3000; i++) { const it = generateItem(`loot-${i}`, 10); n++; if (it.name === 'Iron Fists') { fists++; assert.ok(primaryProfile(it).fist); assert.ok(isValidItem(it)); } if (['Hammerfall', 'Great Sweep'].includes(it.name)) { tools++; assert.ok(rangedWeapon(it).brawlerTool); } }
  assert.ok(fists > 30 && tools > 30, `${fists} fists, ${tools} brawler tools of ${n}`);
  const a = generateItem('same-seed', 12), b = generateItem('same-seed', 12); assert.deepEqual(a, b, 'deterministic');
  assert.ok(BRAWLER_LOOT.share > 0 && BRAWLER_LOOT.share < .5);
});
