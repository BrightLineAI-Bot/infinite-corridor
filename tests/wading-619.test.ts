// Release 619 (Tim: "it would be interesting if the water could come up around the character's legs... at shoals, we kind of
// just walk about the water... I don't really want to slow it down"): the Wayfarer wades in shallow water.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wadeAt, WADE } from '../src/renderer.ts';

const map = (kind) => ({ tiles: Array.from({ length: 32 * 32 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: i === 10 * 32 + 10 ? kind : 'grass', blocked: false })) });
const game = (kind, extra = {}) => ({ area: 'overworld', map: map(kind), save: {}, skyLevel: 0, raftZ: 0, ...extra });
const at = { x: 9.6, y: 9.4 }; // the feet (y + .75, x + .5) on tile 10,10

test('standing in shallows, mist-pools and mires, the Wayfarer wades; on dry ground they do not', () => {
  for (const k of ['shallows', 'mistPool', 'mireWater', 'toxicMire']) assert.deepEqual(wadeAt(game(k), at), WADE.kinds[k], k);
  assert.equal(wadeAt(game('grass'), at), null); assert.equal(wadeAt(game('deepOcean'), at), null, 'deep water is the skiff\'s');
});

test('no wading aboard the skiff, mid-jump, in the robot, on a raft or up in the sky', () => {
  assert.equal(wadeAt(game('shallows', { save: { boat: { aboard: true } } }), at), null);
  assert.equal(wadeAt(game('shallows'), at, true), null);
  assert.equal(wadeAt(game('shallows', { mechUp: () => true }), at), null);
  assert.equal(wadeAt(game('shallows', { raftZ: 1 }), at), null); assert.equal(wadeAt(game('shallows', { skyLevel: 2 }), at), null);
  assert.match(readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), /wadeAt\(g, p, jumping\); if \(wade\) \{ ctx\.save\(\); drawWade/);
});
