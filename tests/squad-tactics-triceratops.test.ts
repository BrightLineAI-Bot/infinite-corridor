// Squad tactics never apply to the Triceratops (Tim, 2026-11-18): not to a ridden mount, not to Good or Silly Goose herds, and
// not to a Bad herd either (it is a beast with its own pack brain, not an ordinary creature in a squad).
import test from 'node:test';
import assert from 'node:assert/strict';
import { tacticRole } from '../src/squad-tactics.ts';
import { behaviourProfile } from '../src/enemy-behaviour.ts';

test('no Triceratops, wild or ridden, of any disposition, takes a squad role or a behaviour profile', () => {
  for (const triceratopsDisposition of ['good', 'silly', 'bad']) {
    for (const extra of [{}, { triceratopsHerd: 'herd:v1:0:0' }, { mountView: true }]) {
      const e = { id: `t-${triceratopsDisposition}`, kind: 'triceratops', hp: 100, maxHp: 100, triceratopsDisposition, ...extra };
      assert.equal(behaviourProfile(e), null, `${triceratopsDisposition} ${JSON.stringify(extra)}: no 975 profile`);
      assert.equal(tacticRole(e), null, `${triceratopsDisposition} ${JSON.stringify(extra)}: no squad role`);
    }
  }
});

test('ordinary creatures still take their roles', () => {
  assert.equal(tacticRole({ id: 'b', kind: 'rootBrute', hp: 10, maxHp: 10 }) !== null, true);
});
