// Tim, 2026-11-26, on the Listener's Mouth (release 1064 made it move every five relays with a town at once): the town must not
// appear when you reach or find the Mouth; it is made only after you defeat the Listener there. Until then the place is just the
// Listener's Mouth; after the defeat it becomes a town and a way into the Deep (game.ts raiseMouthTown, the Listener's Descent).
// Severed and restored relays both count toward the five. Towns a journey already has are never taken away.
import test from 'node:test';
import assert from 'node:assert/strict';
import { listenerFelled, listenerCycle, relaysUntilMove, relayLean, silentMouthAt, arrayMouthAt, LISTENER_CYCLE } from '../src/far-array.ts';
import { commitRelayNode, RELAY_TARGET } from '../src/relay-network.ts';
import { ensureHometowns, townAt } from '../src/hometowns.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

let n = 0;
const answer = (s, choice) => commitRelayNode(s, { areaId: `dungeon:${s.seed}:g1:${n++}:31:town` }, choice, { guardianDefeated: true });
const relays = (s, k, choice = (i) => (i % 2 ? 'sever' : 'restore')) => { let last = null; for (let i = 0; i < k; i++) last = answer(s, typeof choice === 'function' ? choice(i) : choice); return last; };
const start = (seed, choice) => { n = 0; const s = freshSave(); s.seed = seed; relays(s, RELAY_TARGET, choice); return s; };
const reload = (s) => migrateSave(JSON.parse(JSON.stringify(s)));
const kill = (s) => { const text = listenerFelled(s); s.narrative.journal.push({ recordId: `far-array:${s.farArray.runs++}`, title: 'The Far Gate', text }); ensureHometowns(s); return text; };
const visit = (g, c) => { g.area = 'overworld'; g.rx = c.rx; g.ry = c.ry; g.save.atlas[`${c.rx},${c.ry}`] ||= { terrain: 'ash' }; g.loadArea('overworld'); return g.map.objects; };
const mouthTowns = (s) => s.hometowns.towns.filter((t) => t.mouth);

test('(a) no town before the defeat: not at the first Mouth, not at a Mouth the line moves to, not on reaching it', () => {
  const s = start('NOTOWN-A'); ensureHometowns(s); const first = { ...s.relayNetwork.coordinate };
  assert.equal(townAt(s, first.rx, first.ry), null, 'the first Mouth is only the Mouth');
  const r = relays(s, LISTENER_CYCLE.moveRelays); ensureHometowns(s); const c = s.relayNetwork.coordinate;
  assert.equal(r.listenerMoved, true); assert.doesNotMatch(r.message, /town/i);
  assert.equal(townAt(s, c.rx, c.ry), null, 'no town at the new Mouth'); assert.equal(townAt(s, first.rx, first.ry), null, 'none at the Mouth left unfelled');
  assert.deepEqual(s.relayNetwork.pastMouths, [{ rx: first.rx, ry: first.ry, felled: false }]);
  const j = s.narrative.journal.find((q) => q.recordId === `listener-moved-${s.farArray.mouth}`); assert.match(j.text, /stays, quiet\. Fell the Listener at the new one and people will make a town of it/);
  // Standing at the new Mouth: the Listener's Mouth, waiting, and nothing of a town or the Deep.
  const g = new Game(reload(s), 0), objs = visit(g, c);
  assert.ok(objs.some((o) => o.kind === 'arrayMouth' && o.state === 'ready')); assert.equal(listenerCycle(g.save).state, 'waits');
  for (const kind of ['townSmith', 'listeningStone']) assert.ok(!objs.some((o) => o.kind === kind), `no ${kind}`);
  assert.ok(!objs.some((o) => o.mouthDeep), 'no Descent yet'); assert.equal(mouthTowns(g.save).length, 0, 'reaching it raises nothing');
  // The old unfelled Mouth stays a quiet Mouth (runs without a Listener), with no town and no Descent.
  const old = visit(g, first); assert.ok(silentMouthAt(g.save, first.rx, first.ry)); assert.ok(old.some((o) => o.kind === 'silentMouth'));
  assert.ok(!old.some((o) => o.mouthDeep || o.kind === 'townSmith'));
});

test('(b) after the defeat: a town and the Deep at that Mouth, kept when the Mouth moves on', () => {
  const s = start('DEFEAT-B'); relays(s, LISTENER_CYCLE.moveRelays); const c = { ...s.relayNetwork.coordinate };
  const text = kill(s); assert.match(text, /where you fell it a town will gather/);
  const t = townAt(s, c.rx, c.ry); assert.ok(t?.mouth, 'the town rises on the defeat'); assert.equal(t.formed, undefined, 'a town where the Listener fell');
  const g = new Game(reload(s), 0), objs = visit(g, c);
  assert.ok(objs.some((o) => o.kind === 'arrayMouth'), 'the Mouth itself stays');
  const deep = objs.find((o) => o.mouthDeep); assert.ok(deep, 'the Listener\'s Descent'); assert.equal(deep.kind, 'deepShaft'); assert.ok(deep.actions.includes('descend:1'));
  assert.ok(objs.some((o) => o.kind === 'townSmith')); assert.match(objs.find((o) => o.kind === 'listeningStone').lore, /where the Listener fell/);
  // The Mouth moves on: the felled Mouth keeps its town and Descent; the new one has none until its own Listener falls.
  const r = relays(s, relaysUntilMove(s)); ensureHometowns(s); const c2 = s.relayNetwork.coordinate;
  assert.equal(r.listenerMoved, true); assert.deepEqual(s.relayNetwork.pastMouths.at(-1), { rx: c.rx, ry: c.ry, felled: true });
  assert.match(s.narrative.journal.find((q) => q.recordId === `listener-moved-${s.farArray.mouth}`).text, /stays, and its town with it/);
  assert.ok(townAt(s, c.rx, c.ry)?.mouth); assert.equal(townAt(s, c2.rx, c2.ry), null); assert.equal(mouthTowns(s).length, 1);
  const h = new Game(reload(s), 0), was = visit(h, c); assert.ok(was.some((o) => o.kind === 'silentMouth')); assert.ok(was.some((o) => o.mouthDeep), 'its Descent stays');
  kill(s); assert.ok(townAt(s, c2.rx, c2.ry)?.mouth); assert.equal(mouthTowns(s).length, 2);
  assert.deepEqual(reload(s).relayNetwork.pastMouths, s.relayNetwork.pastMouths, 'the felled record survives a reload');
});

test('(c) severed and restored relays both count toward the five; how they were answered changes the Listener, not the count', () => {
  const moves = {};
  for (const way of ['sever', 'restore', 'mixed']) {
    const s = start(`COUNT-${way}`, way === 'mixed' ? undefined : way); assert.equal(relaysUntilMove(s), 5);
    const at = [];
    for (let k = 1; k <= 15; k++) { const r = answer(s, way === 'mixed' ? (k % 3 ? 'sever' : 'restore') : way); if (r.listenerMoved) at.push(k); }
    moves[way] = at; assert.equal(s.farArray.mouth, 3);
    if (way === 'sever') assert.equal(relayLean(s).restored, 0); if (way === 'restore') assert.equal(relayLean(s).severed, 0);
  }
  assert.deepEqual(moves, { sever: [5, 10, 15], restore: [5, 10, 15], mixed: [5, 10, 15] });
  const sev = start('FORM-S', 'sever'), res = start('FORM-R', 'restore');
  assert.equal(relayLean(sev).share, 0); assert.equal(relayLean(res).share, 1, 'a different lean, so a different Listener form');
});

test('(d) an existing save whose Mouth already has its town (release 1064, formed at the move) keeps it, and its Descent', () => {
  // A 1064 journey: one move made, the new Mouth's town given at once (`formed` "move", no kill there), the first Mouth left
  // unfelled with its town too, and pastMouths without the `felled` field.
  const s = start('KEEP-D'); relays(s, LISTENER_CYCLE.moveRelays); const first = s.relayNetwork.pastMouths[0], c = { ...s.relayNetwork.coordinate };
  s.relayNetwork.pastMouths = [{ rx: first.rx, ry: first.ry }];
  s.hometowns.towns.push({ rx: first.rx, ry: first.ry, name: 'Oldmouth', listener: 1, mouth: true }, { rx: c.rx, ry: c.ry, name: 'Newmouth', listener: 2, mouth: true, formed: 'move' });
  s.hometowns.home = `${c.rx},${c.ry}`; s.checkpoints[`${c.rx},${c.ry}`] = { name: 'Wayglass' };
  const towns = JSON.parse(JSON.stringify(s.hometowns.towns));
  const r = reload(s); assert.deepEqual(r.hometowns.towns, towns, 'every town kept on load'); assert.equal(r.hometowns.home, `${c.rx},${c.ry}`, 'home kept');
  const g = new Game(r, 0), objs = visit(g, c); assert.ok(objs.some((o) => o.mouthDeep), 'its Descent'); assert.ok(objs.some((o) => o.kind === 'townSmith'));
  assert.match(objs.find((o) => o.kind === 'listeningStone').lore, /beside the Listener's Mouth/);
  // The Mouth moves on without a kill: both old towns stay, and the next Mouth has none.
  relays(r, LISTENER_CYCLE.moveRelays); ensureHometowns(r); const c2 = r.relayNetwork.coordinate;
  assert.deepEqual(r.hometowns.towns, towns); assert.equal(townAt(r, c2.rx, c2.ry), null);
  assert.deepEqual(r.relayNetwork.pastMouths.at(-1), { rx: c.rx, ry: c.ry, felled: false }); assert.match(r.narrative.journal.find((q) => q.recordId === `listener-moved-${r.farArray.mouth}`).text, /stays, and its town with it/);
  assert.ok(silentMouthAt(r, c.rx, c.ry) && silentMouthAt(r, first.rx, first.ry) && arrayMouthAt(r, c2.rx, c2.ry));
  // A legacy pastMouths entry (no `felled` field) whose town was never granted keeps the rule before: it gets its town.
  const l = start('LEGACY-D'); relays(l, LISTENER_CYCLE.moveRelays); const p = l.relayNetwork.pastMouths[0];
  l.relayNetwork.pastMouths = [{ rx: p.rx, ry: p.ry }]; assert.ok(townAt(reload(l), p.rx, p.ry)?.mouth);
});
