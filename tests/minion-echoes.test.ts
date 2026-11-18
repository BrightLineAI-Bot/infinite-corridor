// Tim (2026-11-18): the Bloblet and Worm Tentacle Echoes never dropped. A minion's Echo is now certain on its first kill, and a
// Wayfarer who has slain the parent beast is granted it once on load.
import test from 'node:test';
import assert from 'node:assert/strict';
import { echoDrop, grantSlainEchoes, MINION_ECHOES, ECHOES } from '../src/echoes.ts';

const save = (extra = {}) => ({ seed: 's', echoes: { owned: {}, equipped: [] }, ...extra });

test('a summoned bloblet or worm tentacle leaves its Echo on the first kill, whatever the roll', () => {
  for (const kind of Object.keys(MINION_ECHOES)) {
    assert.ok(ECHOES[kind], kind);
    const s = save();
    assert.equal(echoDrop(s, { id: `${kind}-1`, kind, packKind: kind, summonedBy: 'boss-1' }, false, 7), kind);
    assert.equal(s.echoes.owned[kind], true);
    assert.equal(echoDrop(s, { id: `${kind}-2`, kind, packKind: kind, summonedBy: 'boss-1' }, false, 8), null, 'owned once');
  }
});

test('a minion eaten or killed without rewards leaves nothing; other summoned creatures still leave nothing', () => {
  assert.equal(echoDrop(save(), { id: 'b', kind: 'bloblet', packKind: 'bloblet', noRewards: true }, false, 1), null);
  assert.equal(echoDrop(save(), { id: 'a', kind: 'ashling', packKind: 'ashling', summonedBy: 'x' }, true, 1), null);
});

test('a journey that slew the Morphing Blob or Tremor Worm is granted its minion Echo once on load', () => {
  const s = save({ worldBeasts: { morphingBlob: { slain: 1 }, tremorWorm: { slain: 0 } } });
  const granted = grantSlainEchoes(s);
  assert.ok(granted.includes('bloblet'));
  assert.ok(!granted.includes('wormTentacle'));
  assert.deepEqual(grantSlainEchoes(s).filter((id) => id === 'bloblet'), [], 'only once');
});
