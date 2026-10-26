// Release 441 (Tim, at Mosscross: "there's no viewport, and I can't talk to any of the people... the smith doesn't do
// anything... he should also be moved a little bit farther away from the Wayglass... there should be... all the amenities of
// the Ember Refuge at the new towns"): every Listener town has a Viewport and a Town Keeper (forge, Aperture, retraining);
// Act at the town smith opens the forge; town services stand clear of the Wayglass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game, TOWN_AMENITY } from '../src/game.ts';
import { applyInteraction } from '../src/interactions.ts';

// A save whose town record sits at a settlement section, loaded there.
function town() {
  const s = freshSave(); s.seed = 'TOWN441'; const g = new Game(s, 0);
  for (let rx = -12; rx <= 12; rx++) for (let ry = -12; ry <= 12; ry++) {
    g.rx = rx; g.ry = ry; g.loadArea('overworld', false); if (!g.map.settlement || !g.map.objects.some((o) => o.kind === 'checkpoint')) continue;
    s.hometowns = { towns: [{ rx, ry, name: 'Testford', listener: 1 }], home: null }; g.loadArea('overworld', false); return { s, g };
  }
  throw new Error('no settlement found');
}

test('a Listener town has a Viewport and a Town Keeper, clear of the Wayglass', () => {
  const { g } = town(), glass = g.map.objects.find((o) => o.kind === 'checkpoint');
  const viewport = g.map.objects.find((o) => o.kind === 'viewport'), keeper = g.map.objects.find((o) => o.kind === 'townKeeper');
  assert.ok(viewport && keeper, 'both stand in the town');
  for (const o of [viewport, keeper]) assert.ok(Math.hypot(o.x - glass.x, o.y - glass.y) >= TOWN_AMENITY.clear, `${o.kind} clear of the Wayglass`);
  assert.deepEqual(keeper.actions, ['upgrade', 'attune', 'retrain']);
  g.loadArea('overworld', false); assert.equal(g.map.objects.filter((o) => o.kind === 'townKeeper').length, 1, 'once');
});

test('the Town Keeper forges, attunes and retrains like Sela and Oren', () => {
  const { s, g } = town(), keeper = g.map.objects.find((o) => o.kind === 'townKeeper');
  assert.equal(applyInteraction(keeper, 'upgrade', s, g.areaId()).transition, 'forge');
  assert.equal(applyInteraction(keeper, 'attune', s, g.areaId()).transition, 'skills');
  const r = applyInteraction(keeper, 'retrain', s, g.areaId()); assert.match(r.message, /Testford Keeper/);
  g.enemies = []; Object.assign(g.player, { x: keeper.x, y: keeper.y + 1, facing: 'up' }); g.interactionRequested = null; g.interact();
  assert.equal(g.interactionRequested, keeper.id, 'Act opens its menu');
});

test('Act at the town smith asks for the forge screen; the smith stands clear of the Wayglass', () => {
  const { g } = town(), glass = g.map.objects.find((o) => o.kind === 'checkpoint');
  const at = g.townSpot(glass); g.map.objects.push({ id: 'town-smith-t', kind: 'townSmith', name: 'The Testford Smith', ...at, state: 'working', actions: ['smith'] });
  assert.ok(Math.hypot(at.x - glass.x, at.y - glass.y) >= TOWN_AMENITY.clear);
  g.enemies = []; Object.assign(g.player, { x: at.x, y: at.y + 1, facing: 'up' }); g.smithyRequested = null; const r = g.interact();
  assert.ok(r.smithy); assert.equal(g.smithyRequested, 'town-smith-t');
  assert.match(readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), /if \(game\.smithyRequested\) \{ game\.smithyRequested = null; openSmithy\(game\.message\); \}/);
});
