import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { setSlot } from '../src/spell-slots.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const once = (action) => {
  let used = false;
  return { ...idle, consume: (key) => key === action && !used && (used = true) };
};

for (const lock of ['stun', 'firm hold']) {
  test(`all four slot presses and the legacy build alias respect ${lock}, then work after recovery`, () => {
    for (const [slot, action] of [['a', 'spell'], ['b', 'spell2'], ['c', 'spell3'], ['d', 'utility'], ['d', 'build']]) {
      const save = freshSave(); save.seed = 'SLOT-ACTION-LOCK'; save.perception.aperture = 72;
      const game = new Game(save, 0); game.rx = 3; game.ry = 3; game.loadArea('overworld', false); game.enemies = [];
      assert.equal(setSlot(save, slot, 'spell:grave-sun').ok, true);
      if (lock === 'stun') game.player.stunnedUntil = 2000;
      else { game.player.heldUntil = 2000; game.player.heldFirm = true; }

      const press = once(action);
      game.update(.016, press, 1000);
      assert.equal(save.magicSkills.cooldowns['spell:grave-sun'] || 0, 0, `${action}: no cast during ${lock}`);
      assert.equal(game.effects.length, 0, `${action}: no spell effect during ${lock}`);
      assert.equal(press.consume(action), false, `${action}: the blocked press is consumed`);

      game.update(.016, idle, 2100);
      assert.equal(save.magicSkills.cooldowns['spell:grave-sun'] || 0, 0, `${action}: the blocked press does not fire after recovery`);
      game.update(.016, once(action), 2200);
      assert.ok(save.magicSkills.cooldowns['spell:grave-sun'] > 0, `${action}: a fresh press casts after recovery`);
      assert.ok(game.effects.length > 0, `${action}: the recovered press creates its spell effect`);
    }
  });
}
