import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture, scenariosForLab } from '../src/proving-ground-labs.ts';

test('the healing-drink lab uses a fresh damaged Wayfarer and the real Potion input', () => {
  const options = { lab: 'close-view', scenario: 'healing-drink', seed: 'CINDER-VERGE-47', now: 1000 };
  const first = createLabFixture(options);
  const reset = createLabFixture(options);
  assert.ok(scenariosForLab('close-view').some(({ id }) => id === options.scenario));
  assert.equal(first.scenario, options.scenario);
  assert.equal(first.save.closeView, true);
  assert.equal(first.game.enemies.length, 0);
  const initialHp = first.game.player.hp;
  assert.ok(initialHp > 0 && initialHp < first.save.maxHp);
  assert.equal(first.save.consumables.restorativeDraught, 1);

  first.game.update(.016, {
    state: { x: 0, y: 0 },
    consume: (action: string) => action === 'potion',
    held: () => false,
  }, 1016);

  assert.ok(first.game.player.hp > initialHp);
  assert.equal(first.save.consumables.restorativeDraught, 0);
  assert.equal(reset.game.player.hp, initialHp);
  assert.equal(reset.save.consumables.restorativeDraught, 1);
});
