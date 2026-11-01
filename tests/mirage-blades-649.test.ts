// Release 649 (Tim, 2026-11-01): the Great Sweep's Nanoknives passive becomes Mirage of Blades: "a large sword that... moves out
// and swings, and then comes back to you... great sword... great axe... a huge shuriken... cycles through them... Pierce through...
// home towards me... for like 3 seconds... only 3 maximum at a time... hit on the way out and... on the way in... spinning...
// grow with... charged air".
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { normalizeItemUpgrade } from '../src/items.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { MIRAGE } from '../src/tool-forms.ts';
import { FIELD_PASSIVES, fieldForm } from '../src/lattice-fields.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function arena(passives = ['nanoknives']) {
  const s = freshSave(); s.seed = 'MIRAGE'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = passives.map((id) => `field:${id}`);
  s.equipment.secondary = normalizeItemUpgrade({ id: 't', slot: 'secondary', property: 'impact', tier: 'relic', affixes: [], power: 5, name: 'Great Sweep' });
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.lastAim = { x: 1, y: 0 };
  const foe = (id, x) => Object.assign(createCombatant('rootBrute', x, 10), { id, hp: 50000, maxHp: 50000, damage: 0, cooldown: 99, speed: 0, aggro: false });
  g.enemies = [foe('a', 12), foe('b', 13.5)];
  return { s, g };
}
const run = (g, frames, t0, step = (i) => {}) => { let t = t0; for (let i = 0; i < frames; i++) { step(i); t += 50; g.update(.05, idle, t); } return t; };

test('a blade flies out through every foe in its row, swings round, and cuts again on its way back to the Wayfarer', () => {
  const { g } = arena(); assert.equal(fieldForm('field:nanoknives').name, 'Mirage of Blades');
  g.fireSecondary(1000, { x: 1, y: 0 }); const blade = g.projectiles.find((p) => p.mirage); assert.ok(blade && blade.knife);
  const hp0 = g.enemies.map((e) => e.hp); let caught = false;
  run(g, 80, 1000, () => { if (!caught && !g.projectiles.some((p) => p.mirage)) caught = true; });
  const hits = g.enemies.map((e, i) => Math.round((hp0[i] - e.hp) / blade.damage));
  assert.ok(hits.every((n) => n >= 1), `out through both: ${hits}`); assert.ok(hits[0] >= 2, `and back through the near one: ${hits}`); assert.ok(caught, 'it came home and was gone');
});

test('on its way home it follows the Wayfarer, and gives up after its homing time', () => {
  const { g } = arena(); g.enemies = [];
  g.fireSecondary(1000, { x: 1, y: 0 }); const blade = g.projectiles.find((p) => p.mirage);
  let t = run(g, Math.ceil(MIRAGE.out / MIRAGE.speed / .05) + 2, 1000); assert.ok(blade.returning, 'turned');
  g.player.y = 20; t = run(g, 10, t); assert.ok(blade.dead || blade.dy > .3, 'swings towards where the Wayfarer went');
  const { g: g2 } = arena(); g2.enemies = []; g2.fireSecondary(1000, { x: 1, y: 0 }); const b2 = g2.projectiles.find((p) => p.mirage);
  run(g2, Math.ceil((MIRAGE.out / MIRAGE.speed + MIRAGE.back) / .05) + 4, 1000, () => { g2.player.x += .6; }); // running away faster than it flies
  assert.ok(b2.dead, 'gone after its homing time');
});

test('three at most: a fourth throw ends the oldest on its way home; the blades come in turn, sword, axe, shuriken', () => {
  const { g } = arena(); g.enemies = []; const blades = [];
  let t = 1000; for (let i = 0; i < 4; i++) { g.toolReadyAt = 0; g.fireSecondary(t, { x: 1, y: 0 }); blades.push(g.projectiles.filter((p) => p.mirage).pop()); t = run(g, 2, t); }
  assert.deepEqual(blades.slice(0, 3).map((b) => b.blade), [0, 1, 2]); assert.equal(blades[3].blade, 0);
  assert.equal(g.projectiles.filter((p) => p.mirage && !p.dead).length, MIRAGE.max); assert.ok(blades[0].dead, 'the oldest went');
});

test('Charged Air grows them; Volatile in the tool makes them burst', () => {
  const { g } = arena(['nanoknives', 'charged-air']); g.spellRunning = () => true;
  g.fireSecondary(1000, { x: 1, y: 0 }); const b = g.projectiles.find((p) => p.mirage);
  assert.equal(b.scale, FIELD_PASSIVES['charged-air'].scale); assert.ok(b.grow > MIRAGE.grow, 'a wider cut');
  const { g: plain } = arena(); plain.fireSecondary(1000, { x: 1, y: 0 }); assert.ok(b.damage > plain.projectiles.find((p) => p.mirage).damage);
});
