// The Listener's cycle, v2 (Tim, 2026-11-05): "the coordinates should come once per gate... once you kill 5 relays, you're gonna
// be coming back to that same mouth until you unlocked the gate and then you'll start another gate, and then that's when you'll
// open up a new town... Every time you complete 5 relays, either you sever them or leave them open, then you get a new Listener
// notification ('a Listener has entered the corridor') and it'll say return to the Listener's [Mouth]... Each time you kill the
// Listener it locks a piece of the gate, or if you complete a Revenant horde dungeon it locks other pieces of the gate. Once you
// complete five, it beats the gate and it opens... If there's no coordinate yet, the Far Array / Listener tab of the Journal says so."
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFarArray, listenerFelled, guardianFelled, lockGatePiece, listenerCycle, listenerCoordinate, relaysUntilReturn, daisDue, beginArrayRun, killsAtMouthFromJournal, piecesToUnlock, LISTENER_CYCLE, LISTENER_RETURN } from '../src/far-array.ts';
import { commitRelayNode, ensureRelayNetwork, RELAY_TARGET } from '../src/relay-network.ts';
import { hordeKill } from '../src/revenant-horde.ts';
import { ensureHometowns, townAt, HOMETOWNS } from '../src/hometowns.ts';
import { ensureLattice, grantCoordinates, coordinatesForGate, TRANSIT_LATTICE } from '../src/transit-lattice.ts';
import { freshSave, migrateSave } from '../src/types.ts';

let n = 0;
const answer = (s, choice = n % 2 ? 'sever' : 'restore') => commitRelayNode(s, { areaId: `dungeon:${s.seed}:g1:${n++}:11:v2` }, choice, { guardianDefeated: true });
const relays = (s, k) => { let last = null; for (let i = 0; i < k; i++) last = answer(s); return last; };
const start = (seed = 'VTWO') => { n = 0; const s = freshSave(); s.seed = seed; relays(s, RELAY_TARGET); return s; };
const reload = (s) => migrateSave(JSON.parse(JSON.stringify(s)));
const kill = (s) => { const text = listenerFelled(s); s.narrative.journal.push({ recordId: `far-array:${s.farArray.runs++}`, title: 'The Far Gate', text }); ensureHometowns(s); grantCoordinates(s); return text; };

test('the data table: five pieces a Gate, five relays a return, the relays are the call, towns on the first kill, coordinates per Gate', () => {
  assert.equal(LISTENER_CYCLE.version, 2); assert.equal(LISTENER_CYCLE.gatePieces, 5); assert.equal(LISTENER_CYCLE.sealsCall, false); assert.equal(LISTENER_CYCLE.leavesAfterKill, true);
  assert.equal(LISTENER_RETURN.returnRelays, 5); assert.equal(HOMETOWNS.townWhen, 'kill'); assert.equal(TRANSIT_LATTICE.payPer, 'gate');
  for (const g of [1, 2, 4, 9]) { assert.equal(piecesToUnlock(g), 5); assert.equal(coordinatesForGate(g), 6); }
});

test('one Mouth per Gate: kill, leave, five relays (severed or restored) call it back to the same Mouth, five pieces unlock, five relays give the next Mouth', () => {
  const s = start(), first = { ...s.relayNetwork.coordinate };
  assert.match(s.narrative.journal.find((j) => j.recordId === 'relay-network-answered').text, /coordinate/);
  for (let k = 1; k <= 4; k++) {
    assert.equal(listenerCycle(s).state, 'waits'); assert.ok(beginArrayRun(s, { rx: 0, ry: 0, x: 0, y: 0 }).listener || daisDue(s.farArray), `kill ${k}: a Listener waits`); s.farArray.activeRun = null;
    kill(s); assert.equal(listenerCycle(s).state, 'away'); assert.deepEqual(listenerCycle(s).coordinate, first, 'the Journal keeps the Mouth');
    assert.equal(s.farArray.activeRun, null); assert.equal(beginArrayRun(s, { rx: 0, ry: 0, x: 0, y: 0 }).listener, false, 'never while away'); assert.equal(daisDue(s.farArray), false); s.farArray.activeRun = null;
    // Four severed and one restored, or the other way: either answer counts.
    for (let i = 0; i < 4; i++) assert.doesNotMatch(answer(s, k % 2 ? 'sever' : 'restore').message, /entered the corridor/);
    const back = answer(s, k % 2 ? 'restore' : 'sever'); assert.match(back.message, /A Listener has entered the corridor: return to the Listener's Mouth at/); assert.equal(back.listenerReturned, true);
    assert.deepEqual(s.relayNetwork.coordinate, first); assert.equal(s.farArray.returns, k);
    assert.ok(s.narrative.journal.some((j) => j.recordId === `listener-returned-${k}` && /entered the corridor/.test(j.text)), 'journaled');
  }
  const text = kill(s); assert.match(text, /\(5\/5\)\. The Gate is unlocked: it climbs to tier 2/);
  assert.equal(listenerCycle(s).state, 'unlocked'); assert.equal(listenerCycle(s).coordinate, null, 'no coordinate for the next Mouth yet');
  assert.equal(relaysUntilReturn(s), 5); relays(s, 4); assert.deepEqual(s.relayNetwork.coordinate, first);
  const moved = answer(s); assert.match(moved.message, /A Listener has entered the corridor\. The line speaks again: the Listener's new Mouth is at/); assert.equal(moved.listenerMoved, true);
  assert.deepEqual(s.relayNetwork.coordinate, listenerCoordinate('VTWO', 1, first), 'deterministic'); assert.deepEqual(s.relayNetwork.pastMouths, [first]);
  assert.equal(listenerCycle(s).state, 'waits'); assert.equal(s.farArray.atMouth, 0); assert.equal(s.farArray.toNext, 0);
});

test('a Mouth town rises on the first kill there, once; the next Mouth is none until its own first kill', () => {
  const s = start(), c = { ...s.relayNetwork.coordinate };
  kill(s); assert.ok(townAt(s, c.rx, c.ry)?.mouth); const towns = s.hometowns.towns.length;
  for (let k = 2; k <= 5; k++) { relays(s, 5); kill(s); assert.equal(s.hometowns.towns.length, towns, `kill ${k} adds no town`); }
  relays(s, 5); const m = s.relayNetwork.coordinate; assert.ok(!townAt(s, m.rx, m.ry), 'the new Mouth is no town yet');
  const r = reload(s); assert.ok(!townAt(r, m.rx, m.ry), 'nor after a reload'); assert.ok(townAt(r, c.rx, c.ry)?.mouth, 'the old one stays');
  kill(r); assert.ok(townAt(r, m.rx, m.ry)?.mouth); assert.equal(r.hometowns.towns.filter((t) => t.mouth).length, 2);
});

test('Transit Coordinates come once per Gate, on the unlock: 6 for five pieces, nothing for a kill that leaves the Gate locked', () => {
  const s = start(); ensureLattice(s); const at = [];
  for (let k = 1; k <= 10; k++) { if (k > 1) relays(s, 5); kill(s); at.push(s.lattice.coordinates); }
  assert.deepEqual(at, [0, 0, 0, 0, 6, 6, 6, 6, 6, 12]); assert.equal(s.lattice.gatesPaid, 2); assert.equal(s.lattice.paidFor, 10, 'kills counted, not paid');
  assert.equal(grantCoordinates(s), 0, 'never twice'); assert.equal(reload(s).lattice.coordinates, 12, 'nor on reload');
});

test('a Gate Revenant horde broken locks a Gate piece; its piece can unlock the Gate, which pays and leaves for a new Mouth', () => {
  const s = start(), c = { ...s.relayNetwork.coordinate }; ensureLattice(s);
  kill(s); relays(s, 5); // one kill, the Listener back
  const horde = () => { const h = { horde: { total: 1, left: 1 } }; return hordeKill(s, h); };
  for (let k = 2; k <= 4; k++) { const r = horde(); assert.match(r.message, new RegExp(`horde is broken.*A piece of the Gate locks into place \\(${k}/5\\)`)); assert.equal(r.unlocked, false); assert.equal(s.farArray.quiet, false, 'a horde does not send the Listener away'); }
  const last = horde(); assert.equal(last.unlocked, true); assert.match(last.message, /The Gate is unlocked: it climbs to tier 2\. The Listener leaves this Mouth for good/);
  assert.equal(s.farArray.gate, 2); assert.equal(s.farArray.quiet, true); assert.equal(s.farArray.moves, true); assert.equal(s.farArray.relaysAt, Object.keys(s.relayNetwork.nodes).length);
  grantCoordinates(s); assert.equal(s.lattice.coordinates, 6);
  relays(s, 5); assert.notDeepEqual(s.relayNetwork.coordinate, c, 'a new Mouth');
  // A Gate unlocked by hordes alone still leaves its Mouth a town (one per spent Mouth).
  const t = start('HORDES'), tc = { ...t.relayNetwork.coordinate }; for (let k = 0; k < 5; k++) hordeKill(t, { horde: { total: 1, left: 1 } });
  ensureHometowns(t); assert.equal(t.farArray.listeners, 0); assert.equal(t.farArray.gate, 2); assert.ok(townAt(t, tc.rx, tc.ry)?.mouth);
  // While the Listener is away after a kill, a horde's piece still locks, and the next return keeps the Mouth.
  const u = start('AWAY'); kill(u); hordeKill(u, { horde: { total: 1, left: 1 } }); assert.equal(u.farArray.toNext, 2); assert.equal(u.farArray.quiet, true); assert.equal(u.farArray.moves, false);
});

test('a run guardian changes no piece and no seal; the run says where the Listener is', () => {
  const s = start(); kill(s); const before = JSON.stringify([s.farArray.toNext, s.farArray.pieces, s.farArray.gate]);
  assert.match(guardianFelled(s), /The run's guardian falls\. The Listener is away: answer 5 more relays/);
  assert.equal(JSON.stringify([s.farArray.toNext, s.farArray.pieces, s.farArray.gate]), before);
});

test('the Journal: no coordinate yet, the Mouth while a Listener waits or is away, none while the next Mouth is unknown', () => {
  const fresh = freshSave(); assert.equal(listenerCycle(fresh).state, 'noCoordinate'); assert.equal(listenerCycle(fresh).coordinate, null); assert.equal(listenerCycle(fresh).pieces, 0); assert.equal(listenerCycle(fresh).piecesToUnlock, 5);
  const s = start(), c = s.relayNetwork.coordinate; assert.deepEqual([listenerCycle(s).state, listenerCycle(s).coordinate], ['waits', { rx: c.rx, ry: c.ry }]);
  kill(s); assert.deepEqual([listenerCycle(s).state, listenerCycle(s).pieces, listenerCycle(s).relaysToMove], ['away', 1, 5]);
  s.farArray.toNext = 4; relays(s, 5); kill(s); assert.deepEqual([listenerCycle(s).state, listenerCycle(s).coordinate, listenerCycle(s).pieces], ['unlocked', null, 0]);
});

test('save and reload while away: the Mouth, the pieces, the relays counted and the return all survive', () => {
  const s = start(), c = { ...s.relayNetwork.coordinate }; kill(s); relays(s, 2);
  const r = reload(s); assert.deepEqual(r.farArray, s.farArray); assert.equal(relaysUntilReturn(r), 3);
  n = 500; relays(r, 2); const back = answer(r); assert.match(back.message, /return to the Listener's Mouth/); assert.deepEqual(r.relayNetwork.coordinate, c);
  const again = reload(r); assert.deepEqual(again.farArray, r.farArray); assert.deepEqual(again.hometowns, r.hometowns); assert.deepEqual(again.lattice, r.lattice);
});

// Recoveries for journeys saved under earlier rules.
function journey757({ toNext = 1, killAfterMove = true, gate = 4 } = {}) {
  const s = freshSave(); s.seed = 'SEVEN'; const net = ensureRelayNetwork(s);
  for (let i = 0; i < 41; i++) net.nodes[`dungeon:SEVEN:g1:${i}:3:r`] = { choice: i % 4 ? 'restore' : 'sever', at: i };
  s.narrative.facts['relay.networkAnswered'] = true; net.coordinate = { rx: 62, ry: -48 }; net.pastMouths = [{ rx: 50, ry: 46 }, { rx: -53, ry: -62 }, { rx: -50, ry: -44 }];
  const j = s.narrative.journal; j.push({ recordId: 'far-array:5', text: 'The Listener falls silent. ...' }, { recordId: 'listener-moved-1', text: '' }, { recordId: 'far-array:9', text: 'The Listener falls silent. ...' }, { recordId: 'listener-moved-2', text: '' }, { recordId: 'far-array:14', text: 'The Listener falls silent. ...' }, { recordId: 'listener-moved-3', text: '' }, { recordId: 'far-array:20', text: 'A seal of the Listener’s call breaks (2/6).' });
  if (killAfterMove) j.push({ recordId: 'far-array:24', text: 'The Listener falls silent. A piece of the Gate locks into place (1/4).' });
  s.farArray = { v: 1, gate, pieces: 0, runs: 24, listeners: killAfterMove ? 4 : 3, boons: ['dead-line', 'open-line'], offer: ['far-signal', 'relay-step', 'deep-breath'], ending: 'close', endingPending: false, history: [], activeRun: null, quiet: false, relaysAt: 32, mouth: 3, toNext, custom: 'kept' };
  s.hometowns = { towns: [{ rx: 50, ry: 46, name: 'Mosscross', listener: 1, mouth: true }, { rx: -53, ry: -62, name: 'Brinewatch', listener: 2, mouth: true }, { rx: -50, ry: -44, name: 'Glassgate', listener: 3, mouth: true }], home: '50,46' };
  s.lattice = { coordinates: 17, paidFor: s.farArray.listeners, extra: { passive: 1, echo: 0 }, passives: [], echoes: [] };
  return s;
}

test('recovery: a 757-759 journey that felled the Listener at its current Mouth gets that Mouth\'s town now; one whose piece came from an older Mouth does not', () => {
  const s = reload(journey757());
  assert.equal(s.farArray.atMouth, 1, 'the kill after the last move, read from the journal'); assert.ok(townAt(s, 62, -48)?.mouth, 'its town rises (first-kill rule)');
  assert.equal(s.farArray.quiet, false, 'the Listener that 757 kept there still waits'); assert.equal(s.farArray.toNext, 1); assert.equal(s.farArray.gate, 4);
  assert.deepEqual(s.farArray.boons, ['dead-line', 'open-line']); assert.deepEqual(s.farArray.offer, ['far-signal', 'relay-step', 'deep-breath'], 'a pending boon offer kept'); assert.equal(s.farArray.custom, 'kept');
  assert.equal(s.lattice.coordinates, 17, 'no coordinate taken or added'); assert.equal(s.hometowns.home, '50,46'); assert.equal(s.hometowns.towns.length, 4);
  assert.deepEqual(reload(s).farArray, s.farArray, 'stable');
  const older = reload(journey757({ killAfterMove: false }));
  assert.equal(older.farArray.atMouth, 0); assert.ok(!townAt(older, 62, -48), 'no town at a Mouth nobody felled a Listener at'); assert.equal(older.hometowns.towns.length, 3, 'every town kept');
  assert.equal(killsAtMouthFromJournal(older, 0), 1); assert.equal(killsAtMouthFromJournal(older, 7), 0, 'an unknown move counts none');
});

test('recovery: a journey holding five or more pieces of its Gate (757 at Gate 6+) is unlocked on load, without paying twice', () => {
  const raw = journey757({ toNext: 6, gate: 7 }), s = reload(raw);
  assert.equal(s.farArray.gate, 8); assert.equal(s.farArray.toNext, 1, 'the piece over five carries'); assert.equal(s.farArray.quiet, true); assert.equal(s.farArray.moves, true); assert.equal(s.farArray.relaysAt, 41);
  assert.equal(s.lattice.coordinates, 17, 'its kills were paid one by one'); assert.ok(townAt(s, 62, -48)?.mouth);
  assert.deepEqual(reload(s).farArray, s.farArray); assert.equal(reload(s).lattice.coordinates, 17);
  relays(s, 5); assert.notDeepEqual(s.relayNetwork.coordinate, { rx: 62, ry: -48 }, 'the next relays give the next Mouth');
});

test('recovery: a journey from before the Lattice still has its kills paid on load; a v2 kill after it is not', () => {
  const s = journey757(); delete s.lattice; const m = reload(s);
  assert.equal(m.lattice.coordinates, 4 + 5 + 6 + 7, 'each old kill paid as 363 paid it'); assert.equal(m.lattice.paidFor, 4); assert.equal(m.lattice.gatesPaid, 3);
  kill(m); assert.equal(m.lattice.coordinates, 22, 'the next kill (2/5) pays nothing');
});
