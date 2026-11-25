// The Listener's cycle, v3 (Tim, 2026-11-25, reversing his 2026-11-05 rule that the Mouth stays until its Gate unlocks): "I do
// want the Listener's Mouth to move every five [relays], with a new town each time. It makes you engage with the game."
// Every five relays answered the Mouth moves to a new far place (far-array.ts mouthCoordinateV3), a Listener waits there and a
// town gathers at once; old Mouths keep their towns; Gate pieces, the Gate and Listener kills are the journey's, never a Mouth's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFarArray, listenerFelled, lockGatePiece, listenerCycle, listenerCoordinate, mouthCoordinateV3, relaysUntilMove, relaysUntilReturn, silentMouthAt, arrayMouthAt, daisDue, beginArrayRun, LISTENER_CYCLE, MOUTH_V3 } from '../src/far-array.ts';
import { commitRelayNode, ensureRelayNetwork, RELAY_TARGET } from '../src/relay-network.ts';
import { hordeKill } from '../src/revenant-horde.ts';
import { ensureHometowns, townAt } from '../src/hometowns.ts';
import { ensureLattice, grantCoordinates } from '../src/transit-lattice.ts';
import { openSeaSection, castleSection } from '../src/landscape.ts';
import { wayfindingTargets } from '../src/world.ts';
import { pathsModel } from '../src/paths.ts';
import { Game, mouthTownNote } from '../src/game.ts';
import { freshSave, migrateSave, setCompassChoice } from '../src/types.ts';
import { readFileSync } from 'node:fs';

let n = 0;
const answer = (s, choice = n % 3 ? 'restore' : 'sever') => commitRelayNode(s, { areaId: `dungeon:${s.seed}:g1:${n++ % 300}:${21 + Math.floor(n / 300)}:v3` }, choice, { guardianDefeated: true });
const relays = (s, k) => { let last = null; for (let i = 0; i < k; i++) last = answer(s); return last; };
const answered = (s) => Object.keys(s.relayNetwork.nodes).length;
const start = (seed = 'VTHREE') => { n = 0; const s = freshSave(); s.seed = seed; relays(s, RELAY_TARGET); return s; };
const reload = (s) => migrateSave(JSON.parse(JSON.stringify(s)));
const kill = (s) => { const text = listenerFelled(s); s.narrative.journal.push({ recordId: `far-array:${s.farArray.runs++}`, title: 'The Far Gate', text }); ensureHometowns(s); grantCoordinates(s); return text; };
const at = (g, c) => { g.area = 'overworld'; g.rx = c.rx; g.ry = c.ry; g.save.atlas[`${c.rx},${c.ry}`] ||= { terrain: 'ash' }; g.loadArea('overworld'); return g.map.objects; };

test('the data table and the pin: v3 is current, a journey without a cycle takes it, one pinned at 2 keeps it', () => {
  assert.equal(LISTENER_CYCLE.version, 3); assert.equal(LISTENER_CYCLE.moveRelays, 5); assert.equal(LISTENER_CYCLE.gatePieces, 5); assert.equal(LISTENER_CYCLE.mouthStaysUntilUnlock, false);
  assert.deepEqual(MOUTH_V3, { near: 40, spread: 23, farther: 4, nearCap: 120, minStep: 20, tries: 48, ground: 29 });
  assert.equal(freshSave().farArray.cycle, 3, 'a new journey');
  const old = freshSave(); delete old.farArray.cycle; delete old.farArray.v3At; delete old.farArray.moveAt; assert.equal(reload(old).farArray.cycle, 3, 'an existing journey switches on load');
  const pinned = start('PINNED'); pinned.farArray.cycle = 2; assert.equal(reload(pinned).farArray.cycle, 2, 'a v2 pin is kept');
  // Pinned at 2, five relays after a kill (Gate still locked) call the Listener back to the same Mouth, as in release 761.
  const c = { ...pinned.relayNetwork.coordinate }; kill(pinned); const back = relays(pinned, 5);
  assert.match(back.message, /return to the Listener's Mouth at/); assert.deepEqual(pinned.relayNetwork.coordinate, c); assert.equal(pinned.farArray.mouth, 0);
  // v2's coordinates regenerate byte for byte (values from release 1057).
  const v2 = []; for (const seed of ['VTWO', 'LIST', 'PIN-A']) for (let k = 0; k < 4; k++) v2.push(listenerCoordinate(seed, k, k ? { rx: 50, ry: -50 } : null));
  assert.equal(JSON.stringify(v2), '[{"rx":-50,"ry":-56},{"rx":62,"ry":-60},{"rx":-44,"ry":-41},{"rx":60,"ry":42},{"rx":-50,"ry":-59},{"rx":48,"ry":52},{"rx":-62,"ry":57},{"rx":-62,"ry":-43},{"rx":49,"ry":58},{"rx":-52,"ry":-60},{"rx":-41,"ry":-45},{"rx":-55,"ry":58}]');
});

test('determinism: the same seed and Mouth number give the same place, far out, farther each time, never on sea or a castle', () => {
  for (const seed of ['VTHREE', 'CORRIDOR-MUHAPQHU', 'Q']) {
    let prev = { rx: 50, ry: 46 }; const seen = [prev];
    for (let m = 1; m <= 24; m++) {
      const a = mouthCoordinateV3(seed, m, prev, seen), b = mouthCoordinateV3(seed, m, { ...prev }, seen.map((q) => ({ ...q })));
      assert.deepEqual(a, b, 'deterministic');
      const near = Math.min(MOUTH_V3.nearCap, MOUTH_V3.near + MOUTH_V3.farther * m);
      assert.ok(Math.abs(a.rx) >= near && Math.abs(a.rx) < near + MOUTH_V3.spread && Math.abs(a.ry) >= near && Math.abs(a.ry) < near + MOUTH_V3.spread, `${seed} Mouth ${m} at ${a.rx},${a.ry} is in its ring`);
      assert.ok(Math.abs(a.rx) >= 40 && Math.abs(a.ry) >= 40, 'at least as far as the v2 rule');
      assert.ok(Math.abs(a.rx - prev.rx) + Math.abs(a.ry - prev.ry) >= MOUTH_V3.minStep, 'a real move');
      assert.ok(!seen.some((q) => q.rx === a.rx && q.ry === a.ry), 'never an old Mouth');
      assert.equal(openSeaSection(seed, a.rx, a.ry, MOUTH_V3.ground), false, 'not open sea'); assert.equal(castleSection(seed, a.rx, a.ry), false, 'not a castle');
      seen.push(a); prev = a;
    }
  }
  // Two journeys on the same seed, played the same way, meet the same Mouths.
  const s = start('TWIN'), t = start('TWIN'); relays(s, 15); relays(t, 15);
  assert.deepEqual(s.relayNetwork.coordinate, t.relayNetwork.coordinate); assert.deepEqual(s.relayNetwork.pastMouths, t.relayNetwork.pastMouths);
});

test('the Mouth moves at relays 10, 15, 20, 25 (restored or severed alike), with a notice, a Listener and a town each time', () => {
  const s = start(), first = { ...s.relayNetwork.coordinate };
  assert.equal(answered(s), 5); assert.equal(s.farArray.moveAt, 10); assert.equal(relaysUntilMove(s), 5); assert.ok(!townAt(s, first.rx, first.ry), 'the first Mouth: a town on its first kill, as before');
  const moves = [];
  for (let k = 6; k <= 26; k++) {
    const before = { ...s.relayNetwork.coordinate }, r = answer(s, k % 2 ? 'sever' : 'restore'); ensureHometowns(s);
    if (r.listenerMoved) {
      moves.push(k); const c = s.relayNetwork.coordinate;
      assert.match(r.message, /A Listener has entered the corridor\. The Mouth has moved: it stands now at /); assert.ok(r.message.includes(`${c.rx}, ${c.ry}`));
      const j = s.narrative.journal.find((q) => q.recordId === `listener-moved-${s.farArray.mouth}`); assert.equal(j.title, 'The Mouth Moves'); assert.ok(j.text.includes(`${before.rx}, ${before.ry} stays`));
      assert.equal(s.farArray.quiet, false, 'a Listener waits at the new Mouth'); assert.equal(listenerCycle(s).state, 'waits'); assert.deepEqual(listenerCycle(s).coordinate, { rx: c.rx, ry: c.ry });
      assert.equal(townAt(s, c.rx, c.ry)?.formed, 'move', 'a town gathers at the new Mouth at once'); assert.ok(townAt(s, before.rx, before.ry)?.mouth, 'the old Mouth is a town');
      assert.ok(silentMouthAt(s, before.rx, before.ry)); assert.ok(arrayMouthAt(s, c.rx, c.ry));
    } else assert.deepEqual(s.relayNetwork.coordinate, before, `relay ${k} moves nothing`);
  }
  assert.deepEqual(moves, [10, 15, 20, 25]); assert.equal(s.farArray.mouth, 4); assert.equal(s.farArray.moveAt, 30);
  assert.equal(s.hometowns.towns.filter((t) => t.mouth).length, 5, 'one town per Mouth, the first included (it was left)');
  assert.equal(s.relayNetwork.pastMouths[0].rx, first.rx);
});

test('nothing is lost: pieces, the Gate, kills, boons and offers cross every move; each Mouth offers a Listener, so the Gate never stalls', () => {
  const s = start('PIECES'); ensureLattice(s); const trail = [];
  for (let m = 0; m < 6; m++) {
    assert.ok(beginArrayRun(s, { rx: 0, ry: 0, x: 0, y: 0 }).listener || daisDue(s.farArray), `Mouth ${m}: a Listener waits`); s.farArray.activeRun = null;
    const text = kill(s); assert.match(text, /The Listener leaves this Mouth\. Answer 5 more relays \(restore or sever\) and the Mouth moves/);
    assert.equal(listenerCycle(s).state, 'away'); assert.equal(beginArrayRun(s, { rx: 0, ry: 0, x: 0, y: 0 }).listener, false, 'never while away'); s.farArray.activeRun = null;
    const kept = JSON.stringify([s.farArray.gate, s.farArray.toNext, s.farArray.listeners, s.farArray.boons, s.farArray.offer, s.lattice.coordinates]);
    relays(s, 4); assert.equal(relaysUntilMove(s), 1); relays(s, 1); ensureHometowns(s);
    assert.equal(JSON.stringify([s.farArray.gate, s.farArray.toNext, s.farArray.listeners, s.farArray.boons, s.farArray.offer, s.lattice.coordinates]), kept, `move ${m + 1} keeps everything`);
    trail.push([s.farArray.gate, s.farArray.toNext]);
  }
  assert.deepEqual(trail, [[1, 1], [1, 2], [1, 3], [1, 4], [2, 0], [2, 1]], 'five kills at five Mouths unlock Gate 1, and the climb goes on');
  assert.equal(s.lattice.gatesPaid, 1); assert.equal(s.lattice.coordinates, 6, 'the Gate pays once');
  // A horde's piece locks wherever the Mouth is; a horde that unlocks the Gate leaves the waiting Listener where it is.
  const h = start('HORDE'); for (let k = 0; k < 4; k++) hordeKill(h, { horde: { total: 1, left: 1 } });
  const r = hordeKill(h, { horde: { total: 1, left: 1 } }); assert.equal(r.unlocked, true); assert.doesNotMatch(r.message, /for good/);
  assert.equal(h.farArray.gate, 2); assert.equal(h.farArray.quiet, false); assert.equal(listenerCycle(h).state, 'waits');
  const c = { ...h.relayNetwork.coordinate }; relays(h, 5); assert.notDeepEqual(h.relayNetwork.coordinate, c, 'the Mouth still moves on relays alone'); assert.equal(h.farArray.gate, 2);
  // Not killing the Listener does not hold the Mouth: it moves anyway, and the Listener goes with it.
  const idle = start('IDLE'); relays(idle, 5); assert.equal(idle.farArray.mouth, 1); assert.equal(idle.farArray.quiet, false);
  // lockGatePiece under v3 climbs the Gate without sending anyone away.
  const l = start('LOCK'); l.farArray.toNext = 4; assert.equal(lockGatePiece(l).unlocked, true); assert.equal(l.farArray.quiet, false);
});

test('old towns stay and keep working: their Mouth, smith and Descent, past the last eight Mouths', () => {
  const s = start('TOWNS'), firsts = [];
  for (let m = 0; m < 10; m++) { firsts.push({ ...s.relayNetwork.coordinate }); relays(s, 5); ensureHometowns(s); }
  assert.equal(s.relayNetwork.pastMouths.length, 8, 'pastMouths keeps eight'); const oldest = firsts[0];
  for (const c of firsts) { assert.ok(townAt(s, c.rx, c.ry)?.mouth, `town at ${c.rx},${c.ry}`); assert.ok(silentMouthAt(s, c.rx, c.ry), 'still a Mouth'); }
  const r = reload(s); assert.deepEqual(r.hometowns.towns, s.hometowns.towns, 'no town lost on reload');
  const g = new Game(r, 0), objs = at(g, oldest);
  assert.ok(objs.some((o) => o.kind === 'silentMouth')); assert.ok(objs.some((o) => o.kind === 'townSmith'), 'its smith'); assert.ok(objs.some((o) => o.mouthDeep), 'its Descent');
  const now = at(g, r.relayNetwork.coordinate), stone = now.find((o) => o.kind === 'listeningStone');
  assert.ok(now.some((o) => o.kind === 'arrayMouth' && o.state === 'ready')); assert.ok(now.some((o) => o.kind === 'townSmith'), 'the new Mouth is a town at once');
  assert.match(stone.lore, /beside the Listener's Mouth/);
  // The relay that moves the Mouth names its town and journals it once.
  const u = start('NOTE'); relays(u, 5); const note = mouthTownNote(u); assert.match(note, /gathers at the new Mouth/); assert.equal(mouthTownNote(u), '', 'once');
  assert.ok(u.narrative.journal.some((j) => /made a town of it/.test(j.text)));
});

test('the compass, the Journal and Paths follow the Mouth when it moves', () => {
  const s = start('GUIDE'), c0 = { ...s.relayNetwork.coordinate };
  setCompassChoice(s, { pin: { rx: c0.rx, ry: c0.ry, name: 'The Array Mouth' } }); const g0 = s.guidance;
  assert.ok(wayfindingTargets(s.seed, 0, 0, 1, s).some((t) => t.name === 'the Far Array' && t.rx === c0.rx && t.ry === c0.ry));
  relays(s, 5); const c1 = s.relayNetwork.coordinate;
  assert.notEqual(s.guidance, g0, 'a new guidance object (main.ts syncGuidance)'); assert.deepEqual(s.guidance.pin, { rx: c1.rx, ry: c1.ry, name: 'The Array Mouth' });
  assert.ok(wayfindingTargets(s.seed, 0, 0, 1, s).some((t) => t.name === 'the Far Array' && t.rx === c1.rx && t.ry === c1.ry), 'the story target moves');
  assert.ok(!wayfindingTargets(s.seed, 0, 0, 1, s).some((t) => t.name === 'the Far Array' && t.rx === c0.rx && t.ry === c0.ry));
  // A pin elsewhere is left alone; a Paths pin ("The Far Array") and a pick on the Mouth's section follow.
  setCompassChoice(s, { pin: { rx: 3, ry: 4, name: 'Somewhere' } }); relays(s, 5); assert.deepEqual(s.guidance.pin, { rx: 3, ry: 4, name: 'Somewhere' });
  const c2 = s.relayNetwork.coordinate; setCompassChoice(s, { pin: { rx: c2.rx, ry: c2.ry, name: 'The Far Array' } }); relays(s, 5); assert.deepEqual(s.guidance.pin, { ...s.relayNetwork.coordinate, name: 'The Far Array' });
  const c3 = s.relayNetwork.coordinate; setCompassChoice(s, { pick: `${c3.rx},${c3.ry}` }); relays(s, 5); assert.equal(s.guidance.pick, `${s.relayNetwork.coordinate.rx},${s.relayNetwork.coordinate.ry}`);
  // Paths: the 10-hour fixture's Listener chain names the Mouth and pins it; after a move it names and pins the new one.
  const p = migrateSave(JSON.parse(readFileSync(new URL('./fixtures/paths-sim-h10.json', import.meta.url), 'utf8')));
  const m0 = pathsModel(p); assert.deepEqual(m0.ladder.compass, { pin: { rx: 47, ry: 58, name: 'The Far Array' } });
  n = 700; relays(p, 5); const pc = p.relayNetwork.coordinate; assert.notDeepEqual(pc, { rx: 47, ry: 58 });
  const m1 = pathsModel(p); assert.deepEqual(m1.ladder.compass, { pin: { rx: pc.rx, ry: pc.ry, name: 'The Far Array' } });
  assert.ok(m1.ladder.chain.find((q) => q.id === 'mouth').text.includes(`${pc.rx}, ${pc.ry}`));
  const felled = p.farArray.listeners; kill(p); p.farArray.listeners = felled; /* keep the Ladder on its Listener rung */ assert.match(pathsModel(p).ladder.chain.find((q) => q.id === 'mouth').text, /answer 5 more relays and the Mouth moves, with a Listener waiting at the new one/);
});

test('exact resume: a reload between moves changes nothing, and the reloaded journey moves exactly as the unbroken one', () => {
  const a = start('RESUME'); kill(a); relays(a, 3);
  const b = reload(a); assert.deepEqual(b.farArray, a.farArray); assert.deepEqual(b.relayNetwork, a.relayNetwork); assert.deepEqual(b.hometowns, a.hometowns);
  assert.equal(relaysUntilMove(b), 2); assert.equal(relaysUntilReturn(b), 2);
  const saveN = n; relays(a, 7); n = saveN; relays(b, 7);
  assert.deepEqual(b.relayNetwork.coordinate, a.relayNetwork.coordinate); assert.deepEqual(b.farArray, a.farArray); assert.equal(b.farArray.moveAt, 20); assert.equal(b.farArray.mouth, 2);
  assert.deepEqual(reload(reload(b)).farArray, b.farArray, 'stable');
});

// Tim's journey (scratchpad save of 2026-11-25, Classic): Gate 4 with 2 of 5 pieces, 5 Listeners felled (two at this Mouth),
// 52 relays answered, the Listener away from its fourth Mouth (62, -48) since relay 48, so v2 owed it back at relay 53.
function timsSave() {
  const s = freshSave(); s.seed = 'CORRIDOR-MUHAPQHU'; const net = ensureRelayNetwork(s);
  for (let i = 0; i < 52; i++) net.nodes[`dungeon:CORRIDOR-MUHAPQHU:g1:${i}:5:t`] = { choice: i % 3 ? 'restore' : 'sever', at: i };
  s.narrative.facts['relay.networkAnswered'] = true; net.fragments = 7; net.coordinate = { rx: 62, ry: -48 }; net.pastMouths = [{ rx: 50, ry: 46 }, { rx: -53, ry: -62 }, { rx: -50, ry: -44 }];
  s.farArray = { v: 1, gate: 4, pieces: 0, runs: 27, listeners: 5, boons: ['dead-line', 'relay-step', 'far-signal', 'open-line', 'dead-line'], offer: [], ending: 'close', endingPending: false, history: [], activeRun: null, quiet: true, relaysAt: 48, mouth: 3, toNext: 2, moves: false, atMouth: 2, v2At: { listeners: 3, gate: 4 }, returns: 1 };
  s.hometowns = { towns: [{ rx: 49, ry: 45, name: 'Hearthfall', listener: 1 }, { rx: 50, ry: 46, name: 'Mosscross', listener: 1, mouth: true }, { rx: -53, ry: -62, name: 'Brinewatch', listener: 2, mouth: true }, { rx: -50, ry: -44, name: 'Glassgate', listener: 3, mouth: true }, { rx: 62, ry: -48, name: 'Lanternreach', listener: 4, mouth: true }], home: '50,46' };
  s.lattice = { coordinates: 2, paidFor: 5, extra: { passive: 2, echo: 1 }, passives: [], echoes: [], gatesPaid: 3 };
  setCompassChoice(s, { pin: { rx: 62, ry: -48, name: 'The Array Mouth' } });
  return s;
}

test("Tim's journey migrates cleanly: the Listener v2 owed him still returns at relay 53, and the Mouth first moves at relay 57", () => {
  const raw = timsSave(); delete raw.farArray.cycle; delete raw.farArray.v3At; delete raw.farArray.moveAt;
  const s = reload(raw), f = s.farArray;
  assert.deepEqual([f.cycle, f.moveAt, f.v3At], [3, 57, { relays: 52, mouth: 3 }]);
  assert.deepEqual([f.gate, f.toNext, f.listeners, f.atMouth, f.quiet, f.moves, f.relaysAt, f.returns], [4, 2, 5, 2, true, false, 48, 1], 'nothing else changes on load');
  assert.deepEqual(s.relayNetwork.coordinate, { rx: 62, ry: -48 }, 'the Mouth he may be walking to stays'); assert.deepEqual(s.hometowns.towns, raw.hometowns.towns); assert.equal(s.hometowns.home, '50,46'); assert.equal(s.lattice.coordinates, 2);
  assert.equal(listenerCycle(s).state, 'away'); assert.equal(relaysUntilReturn(s), 1); assert.equal(relaysUntilMove(s), 5);
  n = 1000; const back = answer(s); assert.match(back.message, /return to the Listener's Mouth at 62, -48/); assert.equal(s.farArray.quiet, false); assert.equal(s.farArray.returns, 2);
  assert.ok(daisDue(s.farArray), 'the dais at Lanternreach'); answer(s); kill(s);
  assert.deepEqual([s.farArray.toNext, s.farArray.listeners, s.farArray.gate], [3, 6, 4]); assert.equal(relaysUntilMove(s), 3);
  relays(s, 2); assert.deepEqual(s.relayNetwork.coordinate, { rx: 62, ry: -48 });
  const moved = answer(s); ensureHometowns(s); const c = s.relayNetwork.coordinate;
  assert.equal(moved.listenerMoved, true); assert.equal(answered(s), 57); assert.deepEqual(c, mouthCoordinateV3('CORRIDOR-MUHAPQHU', 4, { rx: 62, ry: -48 }, [{ rx: 50, ry: 46 }, { rx: -53, ry: -62 }, { rx: -50, ry: -44 }, { rx: 62, ry: -48 }, ...raw.hometowns.towns]));
  assert.ok(townAt(s, c.rx, c.ry)?.formed === 'move'); assert.ok(townAt(s, 62, -48)?.mouth, 'Lanternreach stays'); assert.equal(s.hometowns.towns.length, 6);
  assert.deepEqual(s.guidance.pin, { rx: c.rx, ry: c.ry, name: 'The Array Mouth' }, 'his compass follows'); assert.equal(s.farArray.moveAt, 62);
  assert.deepEqual([s.farArray.toNext, s.farArray.gate, s.farArray.listeners], [3, 4, 6], 'his pieces go with him');
});

test('a v2 journey whose Gate was unlocked and waiting on relays for its next Mouth keeps that sooner move', () => {
  const raw = start('UNLOCKED'); raw.farArray.cycle = 2; raw.farArray.toNext = 4; kill(raw); relays(raw, 2);
  assert.equal(raw.farArray.moves, true); delete raw.farArray.cycle; delete raw.farArray.moveAt; delete raw.farArray.v3At;
  const s = reload(raw); assert.equal(s.farArray.cycle, 3); assert.equal(relaysUntilMove(s), 3, 'the three relays v2 still owed, not five');
  const c = { ...s.relayNetwork.coordinate }; relays(s, 3); assert.notDeepEqual(s.relayNetwork.coordinate, c); assert.equal(s.farArray.quiet, false);
});
