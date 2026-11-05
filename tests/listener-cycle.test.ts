// The Listener's cycle as Tim restated it (2026-11-05): "Each time you kill the Listener you get a piece of the Gate, and the
// Listener's Mouth stays in place until you've killed the Listener enough times to unlock the Gate. Then you connect 5 more
// relays, and a new Mouth forms, and you have to kill the Listener there however many times [the Gate needs]; the old Mouth
// turns into an infinite dungeon and a town; and a new Listener / Mouth opens after you connect the relays."
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFarArray, guardianFelled, listenerFelled, piecesNeeded, killsToClimb, relaysUntilReturn, listenerCycle, silentMouthAt, arrayMouthAt, LISTENER_RETURN } from '../src/far-array.ts';
import { commitRelayNode, ensureRelayNetwork, RELAY_TARGET } from '../src/relay-network.ts';
import { daisDue } from '../src/listener-arena.ts';
import { ensureHometowns, townAt } from '../src/hometowns.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

let relayN = 0;
const answer = (s) => commitRelayNode(s, { areaId: `dungeon:${s.seed}:g1:${relayN++ % 200}:${7 + Math.floor(relayN / 200)}:cycle${relayN}` }, relayN % 3 ? 'restore' : 'sever', { guardianDefeated: true });
const start = () => { relayN = 0; const s = freshSave(); s.seed = 'CYCLE'; for (let i = 0; i < RELAY_TARGET; i++) answer(s); assert.ok(s.relayNetwork.coordinate, 'five relays give the first Mouth'); return s; };
const at = (g, c) => { g.area = 'overworld'; g.rx = c.rx; g.ry = c.ry; g.save.atlas[`${c.rx},${c.ry}`] ||= { terrain: 'ash' }; g.loadArea('overworld'); return g.map.objects; };
const breakSeals = (s) => { while (ensureFarArray(s).pieces < piecesNeeded(s.farArray.gate)) guardianFelled(s); };
// One Listener fight through the game itself: break the seals, step through the Mouth (first Listener) or the dais (after),
// fell it, and walk out.
function killListener(g) {
  const s = g.save, c = s.relayNetwork.coordinate; breakSeals(s);
  const objs = at(g, c), door = objs.find((o) => o.kind === (s.farArray.listeners ? 'listenerDais' : 'arrayMouth'));
  assert.ok(door, `a way to the Listener at ${c.rx},${c.ry}`); g.player.x = door.x; g.player.y = door.y;
  const r = g.interact('enter', door.id); assert.ok(r.ok, r.message); assert.equal(s.farArray.activeRun.listener, true, 'this run holds the Listener');
  let L = g.enemies.find((e) => e.farArrayBoss === 'listener' && !e.dead);
  for (let i = 0; !L && i < 6; i++) { const down = g.map.objects.find((o) => o.kind === 'deepTransition' && /down/.test(o.id)); if (!down) break; g.player.x = down.x; g.player.y = down.y; g.interact(down.actions?.[0], down.id); L = g.enemies.find((e) => e.farArrayBoss === 'listener' && !e.dead); }
  if (!L) { L = g.createEnemyFromSpawn({ id: `${s.farArray.activeRun.id}:listener`, kind: 'listener', x: g.player.x + 3, y: g.player.y, boss: true, farArrayBoss: 'listener', listenerForm: 'open', listenerPhase: 'open', dungeonRole: 'finalBoss' }); g.enemies.push(L); }
  L.hp = 0; L.dead = true; g.defeatEnemy(L); const text = s.narrative.journal.find((j) => j.recordId === `far-array:${s.farArray.runs}`)?.text || "";
  g.save.session.activeDungeonId = null; g.area = 'overworld'; at(g, c); return text;
}

test('two full cycles: kills are the Gate pieces, the Mouth stays until the Gate unlocks, then 5 relays move it and the old Mouth is a town with its Descent', () => {
  const s = start(), g = new Game(s, 0), mouths = [];
  for (let cycle = 0; cycle < 2; cycle++) {
    const gate = s.farArray.gate, need = killsToClimb(gate), c = { ...s.relayNetwork.coordinate }; mouths.push(c);
    assert.equal(gate, cycle + 1); assert.equal(listenerCycle(s).pieces, 0); assert.equal(listenerCycle(s).piecesToUnlock, need);
    assert.ok(!townAt(s, c.rx, c.ry), 'no town while the Listener holds this Mouth');
    for (let k = 1; k <= need; k++) {
      const text = killListener(g);
      assert.match(text, new RegExp(`piece of the Gate locks into place \\(${k}/${need}\\)`));
      assert.deepEqual(s.relayNetwork.coordinate, c, 'the Mouth stays in place');
      if (k < need) {
        assert.equal(s.farArray.quiet, false, 'the Listener stays'); assert.equal(s.farArray.gate, gate); assert.equal(s.farArray.toNext, k);
        assert.match(text, /The Listener stays at this Mouth/);
        assert.ok(!townAt(s, c.rx, c.ry), 'not yet a town'); assert.ok(!g.map.objects.some((o) => o.mouthDeep), 'no Descent yet');
        for (let i = 0; i < LISTENER_RETURN.returnRelays + 2; i++) assert.doesNotMatch(answer(s).message, /new Mouth/, 'relays do not move a Mouth whose Gate is locked');
        assert.deepEqual(s.relayNetwork.coordinate, c);
        assert.equal(g.map.objects.find((o) => o.kind === 'arrayMouth').state, 'ready');
        assert.ok(!g.map.objects.some((o) => o.kind === 'listenerDais'), 'the dais waits for the seals again'); breakSeals(s); at(g, c); assert.ok(g.map.objects.some((o) => o.kind === 'listenerDais'), 'and rises once they break');
      }
    }
    // The Gate is unlocked: the Mouth goes quiet, becomes a town with its Listening Stone and the Listener's Descent.
    assert.equal(s.farArray.gate, gate + 1); assert.equal(s.farArray.quiet, true); assert.equal(s.farArray.listeners, need + (cycle ? 1 : 0));
    const town = townAt(s, c.rx, c.ry); assert.ok(town && town.mouth, 'the old Mouth is a town');
    const objs = at(g, c); assert.ok(objs.some((o) => o.kind === 'listeningStone')); assert.ok(objs.some((o) => o.mouthDeep && o.kind === 'deepShaft'), 'and an endless descent');
    assert.ok(!objs.some((o) => o.kind === 'listenerDais'), 'the Listener is gone');
    assert.equal(relaysUntilReturn(s), LISTENER_RETURN.returnRelays);
    for (let i = 0; i < LISTENER_RETURN.returnRelays - 1; i++) assert.doesNotMatch(answer(s).message, /new Mouth/);
    assert.deepEqual(s.relayNetwork.coordinate, c);
    assert.match(answer(s).message, /new Mouth is at/, 'the fifth relay opens a new Mouth');
    assert.notDeepEqual(s.relayNetwork.coordinate, c); assert.equal(s.farArray.quiet, false); assert.equal(s.farArray.mouth, cycle + 1);
    // The old Mouth stays: a town, a door to random runs, and its Descent.
    const old = at(g, c); assert.ok(old.some((o) => o.kind === 'silentMouth')); assert.ok(old.some((o) => o.mouthDeep)); assert.ok(!old.some((o) => o.kind === 'arrayMouth'));
    const n = s.relayNetwork.coordinate, fresh = at(g, n); assert.equal(fresh.find((o) => o.kind === 'arrayMouth').state, 'ready'); assert.ok(!townAt(s, n.rx, n.ry), 'the new Mouth is no town yet');
  }
  assert.equal(s.hometowns.towns.filter((t) => t.mouth).length, 2, 'one town per spent Mouth');
  for (const m of mouths) assert.ok(townAt(s, m.rx, m.ry)?.mouth);
  assert.equal(s.farArray.gate, 3); assert.equal(listenerCycle(s).piecesToUnlock, 3, 'the third Mouth needs three kills');
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

test("Tim's journey loads unchanged, and from here the fourth Mouth holds the Listener for four kills", () => {
  const raw = timsJourney(), s = migrateSave(JSON.parse(JSON.stringify(raw)));
  assert.deepEqual(s.farArray, raw.farArray, 'nothing in the Far Array changes on load'); assert.deepEqual(s.hometowns.towns, raw.hometowns.towns, 'no town added or lost');
  assert.deepEqual(listenerCycle(s), { gate: 4, pieces: 0, piecesToUnlock: 4, seals: 3, sealsNeeded: 6, quiet: false, relaysToMove: 0, mouth: 3 });
  for (const m of s.relayNetwork.pastMouths) assert.ok(silentMouthAt(s, m.rx, m.ry), 'every old Mouth stays');
  for (let k = 1; k <= 3; k++) { breakSeals(s); assert.ok(daisDue(s.farArray)); listenerFelled(s); ensureHometowns(s); assert.equal(s.farArray.quiet, false, `kill ${k}: the Listener stays`); assert.ok(arrayMouthAt(s, 62, -48)); assert.ok(!townAt(s, 62, -48)); }
  breakSeals(s); listenerFelled(s); ensureHometowns(s);
  assert.equal(s.farArray.gate, 5); assert.equal(s.farArray.quiet, true); assert.equal(s.farArray.relaysAt, 41); assert.ok(townAt(s, 62, -48)?.mouth, 'the fourth Mouth becomes a town');
  assert.equal(s.hometowns.towns.filter((t) => t.mouth).length, 4);
});

test('a journey whose Mouth went quiet on a kill that left the Gate locked gets its Listener back on load', () => {
  // Releases 704-755: the fifth kill at Gate 4 (1 of 4) sent the Listener away and raised a town at once.
  const raw = timsJourney(); Object.assign(raw.farArray, { listeners: 4, toNext: 1, pieces: 0, quiet: true, relaysAt: 41 });
  raw.hometowns.towns.push({ rx: 62, ry: -48, name: 'Ashreach', listener: 4, mouth: true });
  const s = migrateSave(JSON.parse(JSON.stringify(raw)));
  assert.equal(s.farArray.quiet, false, 'the Listener is back at its Mouth'); assert.deepEqual(s.relayNetwork.coordinate, { rx: 62, ry: -48 }, 'the Mouth stays where it is');
  assert.equal(s.farArray.toNext, 1, 'its piece is kept'); assert.equal(s.farArray.gate, 4);
  assert.ok(townAt(s, 62, -48), 'the town that rose stays'); assert.equal(s.hometowns.towns.length, 5);
  assert.equal(relaysUntilReturn(s), 0); for (let i = 0; i < 6; i++) assert.doesNotMatch(answer(s).message, /new Mouth/);
  breakSeals(s); assert.ok(daisDue(s.farArray), 'the dais rises again once the seals break');
  const g = new Game(s, 0), objs = at(g, s.relayNetwork.coordinate);
  assert.ok(objs.some((o) => o.kind === 'arrayMouth' && o.state === 'ready')); assert.ok(objs.some((o) => o.kind === 'listenerDais')); assert.ok(objs.some((o) => o.mouthDeep), 'its town keeps its Descent');
  const again = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(again.farArray, s.farArray, 'stable across reloads');
});

test('a fresh journey and one quiet after an unlock are untouched; old Mouth towns keep their Mouth past the last eight', () => {
  assert.equal(ensureFarArray(freshSave()).quiet, false);
  const s = timsJourney(); Object.assign(s.farArray, { quiet: true, toNext: 0, relaysAt: 40 }); const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(m.farArray.quiet, true, 'quiet after an unlock stays quiet'); assert.equal(relaysUntilReturn(m), 4);
  const far = timsJourney(); far.relayNetwork.pastMouths = Array.from({ length: 8 }, (_, i) => ({ rx: 100 + i, ry: 100 }));
  assert.ok(!far.relayNetwork.pastMouths.some((c) => c.rx === 50 && c.ry === 46));
  assert.ok(silentMouthAt(far, 50, 46), 'Mosscross keeps its Mouth after the list has moved on'); assert.ok(!silentMouthAt(far, 49, 45), 'a 371 town by a Mouth is no Mouth');
});

test('the seals: guardians and the horde call the Listener; the messages name seals, not Gate pieces', () => {
  const s = freshSave(); const f = ensureFarArray(s); f.gate = 2; f.listeners = 1;
  assert.match(guardianFelled(s), /seal of the Listener's call breaks \(1\/4\)\. 3 more and the Listener's Dais rises/);
  s.farArray.pieces = 3; assert.match(guardianFelled(s), /last seal breaks/);
  const q = freshSave(); Object.assign(ensureFarArray(q), { gate: 2, listeners: 1, quiet: true, pieces: 3 }); assert.match(guardianFelled(q), /left this Mouth; at its new Mouth/);
});
