// The Listener's cycle as Tim restated it (2026-11-05): "Each time you kill the Listener you get a piece of the Gate, and the
// Listener's Mouth stays in place until you've killed the Listener enough times to unlock the Gate. Then you connect 5 more
// relays, and a new Mouth forms, and you have to kill the Listener there however many times [the Gate needs]; the old Mouth
// turns into an infinite dungeon and a town; and a new Listener / Mouth opens after you connect the relays."
// 2026-11-05, later the same day (LISTENER_CYCLE v2; Tim: "the coordinates should come once per gate... Every time you complete 5
// relays... you get a new Listener notification... return to the Listener's [Mouth]... Each time you kill the Listener it locks
// a piece of the gate, or if you complete a Revenant horde dungeon it locks other pieces... Once you complete five, it beats the
// gate"): these tests follow the v2 cycle. The Listener leaves after every kill and five relays call it back to the same Mouth;
// five pieces unlock the Gate; the Mouth's town rises on its first kill. tests/listener-cycle-v2.test.ts covers the rest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFarArray, guardianFelled, listenerFelled, piecesNeeded, piecesToUnlock, relaysUntilReturn, listenerCycle, silentMouthAt, arrayMouthAt, LISTENER_RETURN, LISTENER_CYCLE } from '../src/far-array.ts';
import { commitRelayNode, ensureRelayNetwork, RELAY_TARGET } from '../src/relay-network.ts';
import { daisDue } from '../src/listener-arena.ts';
import { ensureHometowns, townAt } from '../src/hometowns.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

let relayN = 0;
const answer = (s) => commitRelayNode(s, { areaId: `dungeon:${s.seed}:g1:${relayN++ % 200}:${7 + Math.floor(relayN / 200)}:cycle${relayN}` }, relayN % 3 ? 'restore' : 'sever', { guardianDefeated: true });
const start = () => { relayN = 0; const s = freshSave(); s.seed = 'CYCLE'; for (let i = 0; i < RELAY_TARGET; i++) answer(s); assert.ok(s.relayNetwork.coordinate, 'five relays give the first Mouth'); return s; };
const at = (g, c) => { g.area = 'overworld'; g.rx = c.rx; g.ry = c.ry; g.save.atlas[`${c.rx},${c.ry}`] ||= { terrain: 'ash' }; g.loadArea('overworld'); return g.map.objects; };
const breakSeals = (s) => { if (LISTENER_CYCLE.sealsCall) while (ensureFarArray(s).pieces < piecesNeeded(s.farArray.gate)) guardianFelled(s); };
const callBack = (s) => { let last = null; for (let i = 0; i < LISTENER_RETURN.returnRelays; i++) last = answer(s); return last; };
// One Listener fight through the game itself: step through the Mouth (first Listener) or the dais (after), fell it, walk out.
function killListener(g) {
  const s = g.save, c = s.relayNetwork.coordinate; breakSeals(s); assert.equal(s.farArray.quiet, false, 'a Listener waits');
  const objs = at(g, c), door = objs.find((o) => o.kind === (s.farArray.listeners ? 'listenerDais' : 'arrayMouth'));
  assert.ok(door, `a way to the Listener at ${c.rx},${c.ry}`); g.player.x = door.x; g.player.y = door.y;
  const r = g.interact('enter', door.id); assert.ok(r.ok, r.message); assert.equal(s.farArray.activeRun.listener, true, 'this run holds the Listener');
  let L = g.enemies.find((e) => e.farArrayBoss === 'listener' && !e.dead);
  for (let i = 0; !L && i < 6; i++) { const down = g.map.objects.find((o) => o.kind === 'deepTransition' && /down/.test(o.id)); if (!down) break; g.player.x = down.x; g.player.y = down.y; g.interact(down.actions?.[0], down.id); L = g.enemies.find((e) => e.farArrayBoss === 'listener' && !e.dead); }
  if (!L) { L = g.createEnemyFromSpawn({ id: `${s.farArray.activeRun.id}:listener`, kind: 'listener', x: g.player.x + 3, y: g.player.y, boss: true, farArrayBoss: 'listener', listenerForm: 'open', listenerPhase: 'open', dungeonRole: 'finalBoss' }); g.enemies.push(L); }
  L.hp = 0; L.dead = true; g.defeatEnemy(L); const text = s.narrative.journal.find((j) => j.recordId === `far-array:${s.farArray.runs}`)?.text || "";
  g.save.session.activeDungeonId = null; g.area = 'overworld'; at(g, c); return text;
}

test('two full cycles: five pieces unlock the Gate, the Listener leaves after every kill and five relays call it back to the same Mouth; after the unlock five relays give a new Mouth', () => {
  const s = start(), g = new Game(s, 0), mouths = [];
  for (let cycle = 0; cycle < 2; cycle++) {
    const gate = s.farArray.gate, need = piecesToUnlock(gate), c = { ...s.relayNetwork.coordinate }; mouths.push(c);
    assert.equal(gate, cycle + 1); assert.equal(listenerCycle(s).pieces, 0); assert.equal(listenerCycle(s).piecesToUnlock, 5);
    assert.ok(!townAt(s, c.rx, c.ry), 'no town before a Listener falls at this Mouth');
    for (let k = 1; k <= need; k++) {
      const text = killListener(g);
      assert.match(text, new RegExp(`piece of the Gate locks into place \\(${k}/${need}\\)`));
      assert.deepEqual(s.relayNetwork.coordinate, c, 'the Mouth stays in place');
      assert.equal(s.farArray.quiet, true, 'the Listener leaves after every kill');
      assert.ok(townAt(s, c.rx, c.ry)?.mouth, 'the town rises on the first kill and stays');
      if (k === 1) assert.match(text, /A town springs up/, 'and the kill says so');
      if (k < need) {
        assert.equal(s.farArray.gate, gate); assert.equal(s.farArray.toNext, k); assert.equal(s.farArray.moves, false);
        assert.match(text, /its Mouth stays: answer 5 more relays/);
        assert.ok(!g.map.objects.some((o) => o.kind === 'listenerDais'), 'no dais while the Listener is away');
        assert.equal(g.map.objects.find((o) => o.kind === 'arrayMouth').state, 'quiet');
        for (let i = 0; i < LISTENER_RETURN.returnRelays - 1; i++) assert.doesNotMatch(answer(s).message, /Listener has entered|new Mouth/);
        const back = answer(s); assert.match(back.message, new RegExp(`A Listener has entered the corridor: return to the Listener's Mouth at ${c.rx}, ${c.ry}`)); assert.doesNotMatch(back.message, /new Mouth/);
        assert.deepEqual(s.relayNetwork.coordinate, c, 'it returns to the same Mouth'); assert.equal(s.farArray.quiet, false);
        at(g, c); assert.ok(g.map.objects.some((o) => o.kind === 'listenerDais'), 'the dais rises again');
      }
    }
    // The Gate is unlocked: the Mouth is spent, a town with its Listening Stone and the Listener's Descent.
    assert.equal(s.farArray.gate, gate + 1); assert.equal(s.farArray.quiet, true); assert.equal(s.farArray.moves, true); assert.equal(s.farArray.listeners, 5 * (cycle + 1));
    const objs = at(g, c); assert.ok(objs.some((o) => o.kind === 'listeningStone')); assert.ok(objs.some((o) => o.mouthDeep && o.kind === 'deepShaft'), 'and an endless descent');
    assert.ok(!objs.some((o) => o.kind === 'listenerDais'), 'the Listener is gone');
    assert.equal(relaysUntilReturn(s), LISTENER_RETURN.returnRelays); assert.equal(listenerCycle(s).coordinate, null, 'no coordinate for the next Mouth yet');
    for (let i = 0; i < LISTENER_RETURN.returnRelays - 1; i++) assert.doesNotMatch(answer(s).message, /new Mouth/);
    assert.deepEqual(s.relayNetwork.coordinate, c);
    assert.match(answer(s).message, /A Listener has entered the corridor\. The line speaks again: the Listener's new Mouth is at/, 'the fifth relay opens a new Mouth');
    assert.notDeepEqual(s.relayNetwork.coordinate, c); assert.equal(s.farArray.quiet, false); assert.equal(s.farArray.mouth, cycle + 1); assert.equal(s.farArray.atMouth, 0);
    const old = at(g, c); assert.ok(old.some((o) => o.kind === 'silentMouth')); assert.ok(old.some((o) => o.mouthDeep)); assert.ok(!old.some((o) => o.kind === 'arrayMouth'));
    const n = s.relayNetwork.coordinate, fresh = at(g, n); assert.equal(fresh.find((o) => o.kind === 'arrayMouth').state, 'ready'); assert.ok(!townAt(s, n.rx, n.ry), 'the new Mouth is no town yet');
  }
  assert.equal(s.hometowns.towns.filter((t) => t.mouth).length, 2, 'one town per Mouth');
  for (const m of mouths) assert.ok(townAt(s, m.rx, m.ry)?.mouth);
  assert.equal(s.farArray.gate, 3); assert.equal(listenerCycle(s).piecesToUnlock, 5);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(back.farArray, s.farArray, 'the cycle survives a reload'); assert.deepEqual(back.hometowns, s.hometowns);
});

// Tim's journey (2026-11-04), rebuilt: Gate 4, three Listeners felled (one at each of three old Mouths, under the old rule each
// kill climbed and moved), a fourth Mouth with 3 of 6 seals and no kill yet, 41 relays answered (32 when the last one fell).
function timsJourney() {
  const s = freshSave(); s.seed = 'TIMLIKE';
  const net = ensureRelayNetwork(s); for (let i = 0; i < 41; i++) net.nodes[`dungeon:TIMLIKE:g1:${i}:3:r`] = { choice: i % 4 ? 'restore' : 'sever', at: i };
  s.narrative.facts['relay.networkAnswered'] = true; net.coordinate = { rx: 62, ry: -48 }; net.pastMouths = [{ rx: 50, ry: 46 }, { rx: -53, ry: -62 }, { rx: -50, ry: -44 }];
  s.farArray = { v: 1, gate: 4, pieces: 3, runs: 24, listeners: 3, boons: ['dead-line'], offer: [], ending: 'close', endingPending: false, history: [], activeRun: null, quiet: false, relaysAt: 32, mouth: 3, toNext: 0 };
  s.hometowns = { towns: [{ rx: 49, ry: 45, name: 'Hearthfall', listener: 1 }, { rx: 50, ry: 46, name: 'Mosscross', listener: 1, mouth: true }, { rx: -53, ry: -62, name: 'Brinewatch', listener: 2, mouth: true }, { rx: -50, ry: -44, name: 'Glassgate', listener: 3, mouth: true }], home: '50,46' };
  return s;
}

test("Tim's journey loads unchanged, and from here the fourth Mouth holds the Listener until five pieces unlock its Gate", () => {
  const raw = timsJourney(), s = migrateSave(JSON.parse(JSON.stringify(raw)));
  assert.deepEqual(s.farArray, { ...raw.farArray, moves: false, atMouth: 0, v2At: { listeners: 3, gate: 4 } }, 'nothing in the Far Array changes on load (three v2 fields are added)'); assert.deepEqual(s.hometowns.towns, raw.hometowns.towns, 'no town added or lost');
  assert.deepEqual(listenerCycle(s), { gate: 4, pieces: 0, piecesToUnlock: 5, seals: 3, sealsNeeded: 6, quiet: false, relaysToMove: 0, mouth: 3, state: 'waits', moves: false, atMouth: 0, coordinate: { rx: 62, ry: -48 } });
  for (const m of s.relayNetwork.pastMouths) assert.ok(silentMouthAt(s, m.rx, m.ry), 'every old Mouth stays');
  relayN = 100;
  for (let k = 1; k <= 4; k++) {
    assert.ok(daisDue(s.farArray), `kill ${k}: the dais is up`); listenerFelled(s); ensureHometowns(s);
    assert.equal(s.farArray.quiet, true, `kill ${k}: the Listener leaves`); assert.equal(s.farArray.moves, false); assert.ok(arrayMouthAt(s, 62, -48)); assert.ok(townAt(s, 62, -48)?.mouth, 'the town rose on the first kill');
    assert.match(callBack(s).message, /return to the Listener's Mouth at 62, -48/); assert.ok(arrayMouthAt(s, 62, -48));
  }
  listenerFelled(s); ensureHometowns(s);
  assert.equal(s.farArray.gate, 5); assert.equal(s.farArray.quiet, true); assert.equal(s.farArray.moves, true); assert.equal(s.farArray.relaysAt, 61);
  assert.equal(s.hometowns.towns.filter((t) => t.mouth).length, 4, 'one town for the fourth Mouth, not one per kill');
});

test('a journey whose Mouth went quiet on a kill that left the Gate locked keeps its Mouth: five relays call the Listener back there', () => {
  // Releases 704-756: the fifth kill at Gate 4 (1 of 4) sent the Listener away and raised a town at once.
  const raw = timsJourney(); Object.assign(raw.farArray, { listeners: 4, toNext: 1, pieces: 0, quiet: true, relaysAt: 41 });
  raw.hometowns.towns.push({ rx: 62, ry: -48, name: 'Ashreach', listener: 4, mouth: true });
  const s = migrateSave(JSON.parse(JSON.stringify(raw)));
  assert.equal(s.farArray.quiet, true, 'the Listener is away'); assert.equal(s.farArray.moves, false, 'from a Mouth that stays'); assert.deepEqual(s.relayNetwork.coordinate, { rx: 62, ry: -48 });
  assert.equal(s.farArray.toNext, 1, 'its piece is kept'); assert.equal(s.farArray.gate, 4);
  assert.ok(townAt(s, 62, -48), 'the town that rose stays'); assert.equal(s.hometowns.towns.length, 5);
  assert.equal(relaysUntilReturn(s), 5); relayN = 300; const back = callBack(s); assert.match(back.message, /return to the Listener's Mouth at 62, -48/); assert.doesNotMatch(back.message, /new Mouth/);
  assert.equal(s.farArray.quiet, false); assert.ok(daisDue(s.farArray), 'the dais rises again');
  const g = new Game(s, 0), objs = at(g, s.relayNetwork.coordinate);
  assert.ok(objs.some((o) => o.kind === 'arrayMouth' && o.state === 'ready')); assert.ok(objs.some((o) => o.kind === 'listenerDais')); assert.ok(objs.some((o) => o.mouthDeep), 'its town keeps its Descent');
  const again = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(again.farArray, s.farArray, 'stable across reloads');
});

test('a fresh journey and one quiet after an unlock are untouched; old Mouth towns keep their Mouth past the last eight', () => {
  assert.equal(ensureFarArray(freshSave()).quiet, false);
  const s = timsJourney(); Object.assign(s.farArray, { quiet: true, toNext: 0, relaysAt: 40 }); const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(m.farArray.quiet, true, 'quiet after an unlock stays quiet'); assert.equal(m.farArray.moves, true, 'and the next return opens a new Mouth'); assert.equal(relaysUntilReturn(m), 4);
  const far = timsJourney(); far.relayNetwork.pastMouths = Array.from({ length: 8 }, (_, i) => ({ rx: 100 + i, ry: 100 }));
  assert.ok(!far.relayNetwork.pastMouths.some((c) => c.rx === 50 && c.ry === 46));
  assert.ok(silentMouthAt(far, 50, 46), 'Mosscross keeps its Mouth after the list has moved on'); assert.ok(!silentMouthAt(far, 49, 45), 'a 371 town by a Mouth is no Mouth');
});

test('the seals of releases 138-759 are kept behind LISTENER_CYCLE.sealsCall; in v2 a guardian says where the Listener is', () => {
  LISTENER_CYCLE.sealsCall = true;
  try {
    const s = freshSave(); const f = ensureFarArray(s); f.gate = 2; f.listeners = 1;
    assert.match(guardianFelled(s), /seal of the Listener's call breaks \(1\/4\)\. 3 more and the Listener's Dais rises/);
    s.farArray.pieces = 3; assert.match(guardianFelled(s), /last seal breaks/);
    const q = freshSave(); Object.assign(ensureFarArray(q), { gate: 2, listeners: 1, quiet: true, pieces: 3 }); assert.match(guardianFelled(q), /left this Mouth; when it returns/);
  } finally { LISTENER_CYCLE.sealsCall = false; }
  const v = freshSave(); Object.assign(ensureFarArray(v), { gate: 2, listeners: 1 }); assert.match(guardianFelled(v), /guardian falls\. The Listener waits beyond the Listener's Dais/); assert.equal(v.farArray.pieces, 0, 'no seals in v2');
  const w = freshSave(); Object.assign(ensureFarArray(w), { gate: 2, listeners: 1, quiet: true, moves: false, relaysAt: 0 }); assert.match(guardianFelled(w), /The Listener is away: answer 5 more relays \(restore or sever\) and a Listener returns to this Mouth/);
});
