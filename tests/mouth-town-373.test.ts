// Release 373 (Tim, 2026-10-23): after the Listener falls, its Mouth's own section becomes a town around the Mouth, with
// a shrine of its own (the Listening Stone) and delvers trading what comes up; the Mouth still opens new runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureHometowns } from '../src/hometowns.ts';
import { listenerFelled } from '../src/far-array.ts';
import { relayCoordinate } from '../src/relay-network.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const atMouth = () => { const s = freshSave(); s.seed = 'MOUTHTOWN'; s.relayNetwork = { version: 1, nodes: {}, fragments: 0, coordinate: relayCoordinate(s) }; return s; };

test("the Mouth's section is open land until the Listener falls; afterwards it is a town around the Mouth", () => {
  const s = atMouth(), c = s.relayNetwork.coordinate, g = new Game(s, 0); g.rx = c.rx; g.ry = c.ry; g.loadArea('overworld');
  assert.ok(!g.map.hamlet && !g.map.objects.some((o) => o.kind === 'listeningStone'), 'no town yet'); s.atlas[`${c.rx},${c.ry}`] ||= { terrain: 'ash' };
  listenerFelled(s); ensureHometowns(s); g.loadArea('overworld');
  const mouth = g.map.objects.find((o) => o.kind === 'arrayMouth'), stone = g.map.objects.find((o) => o.kind === 'listeningStone'), delver = g.map.objects.find((o) => o.id.startsWith('mouth-delver'));
  assert.ok(mouth, 'the Mouth stays'); assert.equal(mouth.actions[0], 'enter'); assert.ok(stone && delver, 'the Listening Stone and the delvers');
  assert.ok(g.map.objects.some((o) => o.kind === 'checkpoint' && /Wayglass/.test(o.name)), 'a Wayglass'); assert.ok(Math.hypot(stone.x - mouth.x, stone.y - mouth.y) < 5);
  g.player.x = stone.x; g.player.y = stone.y; const r = g.interact('inspect', stone.id); assert.ok(r.ok); assert.match(r.message, /Listener fell/);
  g.player.x = mouth.x; g.player.y = mouth.y; assert.ok(g.interact('enter', mouth.id).ok, 'still a door to a new run'); assert.equal(s.farArray.activeRun.listener, false);
});

test('a journey that already has a 371 town nearby keeps it, and gains the Mouth town', () => {
  const s = atMouth(); s.farArray.listeners = 1; const c = s.relayNetwork.coordinate; s.hometowns = { towns: [{ rx: c.rx + 1, ry: c.ry, name: 'Mossmoor', listener: 1 }], home: null };
  const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(m.hometowns.towns.length, 2); assert.ok(m.hometowns.towns.some((t) => t.name === 'Mossmoor' && !t.mouth)); assert.ok(m.hometowns.towns.some((t) => t.mouth && t.rx === c.rx && t.ry === c.ry));
});
