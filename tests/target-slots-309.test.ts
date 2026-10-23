// Release 309 (Tim, 2026-10-22): tap a monster to lock on (attacks, shots and spells go at it until another is tapped or
// it is released; Rift Step still goes where you point), and Build, the preset's item, or a spell in any of the three slots.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { ensureSlots, setSlot, slotTool, setPresetButton, presetButton, activeButton, assignPresetItem, togglePreset } from '../src/spell-slots.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function arena() {
  const s = freshSave(); s.seed = 'TGT'; const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = [];
  const at = (id, x, y) => { const e = g.createEnemyFromSpawn({ id, kind: 'ashling', x, y }); e.hp = e.maxHp = 999; g.enemies.push(e); return e; };
  Object.assign(g.player, { x: 10, y: 10 }); return { s, g, a: at('a', 14, 10), b: at('b', 10, 14) };
}

test('tapping a creature locks it; aim follows it; another switches; tapping again keeps it (release 347)', () => {
  const { s, g, a, b } = arena();
  assert.equal(g.enemyAt(14.5, 10.4)?.id, 'a'); assert.equal(g.enemyAt(12, 12), null);
  g.lockTarget('a'); assert.equal(g.lockedTarget()?.id, 'a');
  g.update(.016, idle, 100); assert.ok(s.lastAim.x > .9 && Math.abs(s.lastAim.y) < .2, 'aim points east at a');
  g.lockTarget('b'); g.update(.016, idle, 120); assert.ok(s.lastAim.y > .9, 'now south at b');
  g.lockTarget('b'); assert.equal(g.lockedTarget()?.id, 'b', 'tapping it again keeps the lock (release 347, Tim)');
  g.lockTarget('a'); a.dead = true; assert.equal(g.lockedTarget(), null, 'a dead target is dropped');
  g.lockTarget('b'); b.x = 40; assert.equal(g.lockedTarget(), null, 'one that goes far is dropped');
});

test('a swing at a locked target in reach goes to it, not to the nearest', () => {
  const { g, a } = arena(); const near = g.createEnemyFromSpawn({ id: 'n', kind: 'ashling', x: 9, y: 10 }); near.hp = near.maxHp = 999; g.enemies.push(near);
  Object.assign(a, { x: 11.2, y: 10.9 }); g.lockTarget('a'); g.player.attackReadyAt = 0; g.primaryAttack(1000);
  const d = g.player.meleeAim; assert.ok(d.x > 0, 'toward a (east), not the nearer one west');
});

test('A, B and the Build button each take Build, the item, or a spell', () => {
  const s = freshSave(); ensureSlots(s);
  assert.equal(setSlot(s, 'a', 'build').ok, true); assert.deepEqual(slotTool(s, 'a'), { tool: 'build', item: null });
  assert.equal(setSlot(s, 'b', 'item').ok, true); assert.equal(assignPresetItem(s, 0, 'lumenPhial').ok, true, 'an Item slot accepts the item');
  assert.deepEqual(slotTool(s, 'b'), { tool: 'item', item: 'lumenPhial' });
  assert.equal(setPresetButton(s, 0, 'spell:ember-ring'), 'spell:ember-ring'); assert.deepEqual(activeButton(s), { mode: 'cast', key: 'spell:ember-ring' });
  assert.equal(setPresetButton(s, 0, 'skill:rift-step'), 'spell:ember-ring', 'only what is learned; the button is unchanged');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(slotTool(back, 'a'), { tool: 'build', item: null }); assert.deepEqual(presetButton(back, 0).button, 'spell:ember-ring');
  togglePreset(back); togglePreset(back); assert.deepEqual(slotTool(back, 'a'), { tool: 'build', item: null }, 'kept through preset swaps');
});

test('pressing a slot that holds Build builds; the item slot uses the item; the Build button casts', () => {
  const s = freshSave(); s.seed = 'TGT2'; const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = [];
  setSlot(s, 'a', 'build'); s.materials.stone = 20; s.materials.wood = 20;
  s.aimMode = null; g.castSlot('a'); assert.equal(s.aimMode, 'build', 'the slot pressed Build (build mode on)');
  setSlot(s, 'b', 'item'); assignPresetItem(s, 0, 'lumenPhial'); s.consumables.lumenPhial = 2; g.castSlot('b', 1000); assert.equal(s.consumables.lumenPhial, 1);
  setPresetButton(s, 0, 'spell:ember-ring'); const press = { state: { x: 0, y: 0 }, consume: (k) => k === 'build', held: () => false };
  g.update(.016, press, 5000); assert.match(g.message, /Ember Ring|recovers/);
});
