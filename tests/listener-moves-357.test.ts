// Release 357 (Tim, 2026-10-23): after the Listener falls it is gone from its Mouth; five more relays answered and the line
// gives a new Mouth elsewhere, where the Gate climb goes on. Every relay answered makes it stronger.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFarArray, listenerFelled, relaysUntilReturn, listenerCoordinate, LISTENER_RETURN, ARRAY_TUNING, tuneArrayBoss } from '../src/far-array.ts';
import { commitRelayNode, ensureRelayNetwork, relayCoordinate } from '../src/relay-network.ts';
import { Game } from '../src/game.ts';
import { wayfindingTargets } from '../src/world.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const answered = (n) => { const s = freshSave(); s.seed = 'LIST'; const net = ensureRelayNetwork(s); for (let i = 0; i < n; i++) net.nodes[`dungeon:LIST:g1:${i}:0:r`] = { choice: i % 2 ? 'sever' : 'restore', at: 0 }; s.narrative.facts['relay.networkAnswered'] = true; net.coordinate = relayCoordinate(s); return s; };
const answer = (s, i) => commitRelayNode(s, { areaId: `dungeon:LIST:g1:${i}:9:new` }, 'restore', { guardianDefeated: true });

test('the first Listener is where it always was; after it falls the Mouth goes quiet until five more relays answer', () => {
  const s = answered(6), first = { ...s.relayNetwork.coordinate };
  assert.equal(ensureFarArray(s).quiet, false);
  listenerFelled(s); assert.equal(s.farArray.quiet, true); assert.equal(relaysUntilReturn(s), LISTENER_RETURN.returnRelays);
  for (let i = 0; i < 4; i++) { const r = answer(s, i); assert.doesNotMatch(r.message, /new Mouth/); }
  assert.equal(relaysUntilReturn(s), 1); assert.deepEqual(s.relayNetwork.coordinate, first);
  const r = answer(s, 4); assert.match(r.message, /new Mouth is at/);
  assert.equal(s.farArray.quiet, false); assert.equal(s.farArray.mouth, 1);
  const c = s.relayNetwork.coordinate; assert.notDeepEqual(c, first); assert.ok(Math.abs(c.rx) + Math.abs(c.ry) >= 80, 'far out');
  assert.deepEqual(s.relayNetwork.pastMouths, [first]);
  assert.ok(s.narrative.journal.some((j) => j.recordId === 'listener-moved-1'));
  assert.deepEqual(listenerCoordinate('LIST', 1, first), c, 'deterministic');
});

test('a journey that felled a Listener before this release goes quiet, counting from its relays now', () => {
  const s = answered(9); s.farArray = { listeners: 1, gate: 2, pieces: 2 };
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(m.farArray.quiet, true); assert.equal(m.farArray.relaysAt, 9); assert.equal(m.farArray.pieces, 2, 'pieces kept');
  const fresh = migrateSave(JSON.parse(JSON.stringify(answered(3)))); assert.equal(fresh.farArray.quiet, false);
});

test('the quiet Mouth admits no run and the compass stops pointing at it; the old Mouth stays, silent', () => {
  const s = answered(6); listenerFelled(s); const c = s.relayNetwork.coordinate;
  const g = new Game(s, 0); g.rx = c.rx; g.ry = c.ry; g.loadArea('overworld');
  const mouth = g.map.objects.find((o) => o.kind === 'arrayMouth'); assert.equal(mouth.state, 'quiet');
  g.player.x = mouth.x; g.player.y = mouth.y; const r = g.interact('enter', mouth.id); assert.equal(r.ok, false); assert.equal(g.area, 'overworld'); assert.equal(s.farArray.activeRun, null);
  assert.ok(!wayfindingTargets(s.seed, 0, 0, 1, s).some((t) => t.name === 'the Far Array'));
  for (let i = 0; i < 5; i++) answer(s, i);
  assert.ok(wayfindingTargets(s.seed, 0, 0, 1, s).some((t) => t.name === 'the Far Array'));
  g.loadArea('overworld'); assert.ok(g.map.objects.some((o) => o.kind === 'silentMouth')); assert.ok(!g.map.objects.some((o) => o.kind === 'arrayMouth'));
  const n = s.relayNetwork.coordinate; g.rx = n.rx; g.ry = n.ry; g.loadArea('overworld'); assert.equal(g.map.objects.find((o) => o.kind === 'arrayMouth').state, 'ready');
});

test('every relay answered makes it stronger, up to the cap', () => {
  const hp = (n) => tuneArrayBoss({}, answered(n), {}, 'listener').maxHp;
  assert.ok(hp(20) > hp(7)); assert.ok(hp(7) > hp(2)); assert.equal(hp(ARRAY_TUNING.relayCap), hp(ARRAY_TUNING.relayCap + 10));
});
