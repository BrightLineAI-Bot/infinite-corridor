// Release 375 (Tim, 2026-10-23): from the second Listener on, a whole Gate raises a dais at the Mouth that carries you to the
// Listener's own hall: unique, fog-free, nothing in it but the Listener.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateListenerArena, daisDue, isArenaRun, LISTENER_ARENA } from '../src/listener-arena.ts';
import { ensureFarArray, beginArrayRun, piecesNeeded } from '../src/far-array.ts';
import { relayCoordinate } from '../src/relay-network.ts';
import { reachableInMap } from '../src/underlands.ts';
import { dungeonTileVisibility } from '../src/dungeon-framework.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';

const due = (listeners = 1) => { const s = freshSave(); s.seed = 'HALL'; s.relayNetwork = { version: 1, nodes: {}, fragments: 0, coordinate: relayCoordinate(s) }; s.narrative.facts['relay.networkAnswered'] = true; const f = ensureFarArray(s); Object.assign(s.farArray, { listeners, gate: 2, pieces: piecesNeeded(2), quiet: false }); return s; };

test('the hall: round, ringed with pylons, every tile in sight, the Listener across the dais, a way back', () => {
  const m = generateListenerArena('HALL', 'far-array:HALL:arena3');
  assert.ok(isArenaRun(m.id)); assert.equal(m.dungeonContract, undefined, 'no discovery: no fog');
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) assert.equal(dungeonTileVisibility(m, x, y), 'visible');
  assert.equal(m.tiles.filter((t) => t.kind === 'crystalSpire').length, LISTENER_ARENA.pylons);
  assert.equal(m.enemySpawns.length, 1); assert.equal(m.enemySpawns[0].kind, 'listener'); assert.equal(m.enemySpawns[0].dungeonRole, 'finalBoss');
  const seen = reachableInMap(m, m.entry), b = LISTENER_ARENA.boss; assert.ok(seen[b.y * 32 + b.x], 'the Listener can be reached');
  assert.ok(m.objects.some((o) => o.kind === 'exit'));
});

test('the dais is due only after a first Listener, with the Gate whole at the current Mouth', () => {
  assert.equal(daisDue(ensureFarArray(due(0))), false, 'the first Listener is met as before');
  assert.equal(daisDue(ensureFarArray(due(1))), true);
  const quiet = due(1); quiet.farArray.quiet = true; assert.equal(daisDue(ensureFarArray(quiet)), false);
  const short = due(1); short.farArray.pieces = 1; assert.equal(daisDue(ensureFarArray(short)), false);
  const s = due(1); assert.equal(beginArrayRun(s, { rx: 0, ry: 0, x: 1, y: 1 }).listener, false, 'the Mouth no longer holds it');
  const first = due(0); assert.equal(beginArrayRun(first, { rx: 0, ry: 0, x: 1, y: 1 }).listener, true, 'unchanged for the first');
});

test('in the game: the dais rises at the Mouth and carries you to the hall, where the Listener waits', () => {
  const s = due(1), c = s.relayNetwork.coordinate, g = new Game(s, 0); g.rx = c.rx; g.ry = c.ry; g.loadArea('overworld');
  const dais = g.map.objects.find((o) => o.kind === 'listenerDais'); assert.ok(dais, 'a dais beside the Mouth');
  g.player.x = dais.x; g.player.y = dais.y; const r = g.interact('enter', dais.id); assert.ok(r.ok, r.message);
  assert.equal(g.area, 'dungeon'); assert.equal(g.map.name, "The Listener's Hall"); assert.ok(isArenaRun(g.areaId()));
  const L = g.enemies.find((e) => e.kind === 'listener'); assert.ok(L && L.farArrayBoss === 'listener', 'the Listener itself'); assert.equal(g.enemies.filter((e) => !e.dead && !e.mirrorClone && e.kind !== 'listener').length, 0, 'nothing else');
  const ret = g.map.objects.find((o) => o.kind === 'exit'); g.player.x = ret.x; g.player.y = ret.y; assert.ok(g.interact('exit', ret.id).ok); assert.equal(g.area, 'overworld');
});
