import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { LINKED, isLinkable, isLinked, ensureLinks, farMouth, linkedExit, mouthsIn, placeMouth, linksKnown } from '../src/linked-dungeons.ts';

const save = (seed = 7) => { const s = freshSave(); s.seed = seed; return s; };
const ids = (n) => Array.from({ length: n }, (_, i) => `dungeon:7:g1:${i}:${-i}:dungeon-gate-${i}`);

test('about the set share of ordinary dungeons are linked, and nothing else is', () => {
  const s = save(), linked = ids(400).filter((id) => isLinked(s, id)).length / 400;
  assert.ok(Math.abs(linked - LINKED.share) < .08, String(linked));
  for (const id of ['hunt-instance:x', 'elite-portal:7:knife-choir', 'displacement:1:2:x', null]) { assert.equal(isLinkable(id), false); assert.equal(isLinked(s, id), false); }
  // Deterministic per seed and id.
  assert.deepEqual(ids(50).map((id) => isLinked(s, id)), ids(50).map((id) => isLinked(save(), id)));
});

test("the guardian's door of a linked dungeon opens a far, unexplored second mouth, and then leads back", () => {
  const s = save(), id = ids(400).find((i) => isLinked(s, i)), plain = ids(400).find((i) => !isLinked(s, i));
  s.explored = { '3,4': true };
  assert.equal(linkedExit(s, plain, { rx: 3, ry: 4, x: 10, y: 12 }), null);
  const out = linkedExit(s, id, { rx: 3, ry: 4, x: 10, y: 12 });
  assert.equal(out.mouth, 'b');
  const d = Math.max(Math.abs(out.rx - 3), Math.abs(out.ry - 4));
  assert.ok(d >= LINKED.distance[0] * .7, `far enough: ${d}`);
  assert.ok(!s.explored[`${out.rx},${out.ry}`] && (out.rx || out.ry));
  // The link is remembered: the same door again goes to the same place; from the second mouth it leads home.
  assert.deepEqual(linkedExit(s, id, { rx: 3, ry: 4, x: 1, y: 1 }), out);
  assert.deepEqual(linkedExit(s, id, { rx: out.rx, ry: out.ry, x: 16, y: 17 }), { rx: 3, ry: 4, x: 10, y: 12, mouth: 'a' });
  assert.deepEqual(mouthsIn(s, out.rx, out.ry), [id]);
  assert.deepEqual(mouthsIn(s, 3, 4), []);
  // The Atlas joins them only once both mouths are explored.
  assert.deepEqual(linksKnown(s), []);
  s.explored[`${out.rx},${out.ry}`] = true;
  assert.deepEqual(linksKnown(s), [{ id, a: { rx: 3, ry: 4 }, b: { rx: out.rx, ry: out.ry } }]);
});

test('the second mouth steps past explored land and never lands on the Refuge', () => {
  const s = save(), id = ids(400).find((i) => isLinked(s, i)), first = farMouth(s, id, { rx: 0, ry: 0 });
  s.explored = { [`${first.rx},${first.ry}`]: true };
  const next = farMouth(s, id, { rx: 0, ry: 0 });
  assert.notDeepEqual(next, first);
  assert.ok(next.rx || next.ry);
});

test('a second mouth stands once on open ground near the middle of its section', () => {
  const tiles = []; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) tiles.push({ x, y, kind: x === 16 && y === 16 ? 'abyss' : 'ash' });
  const map = { tiles, objects: [{ id: 'tree', x: 16, y: 15 }] };
  const o = placeMouth(map, 'dungeon:7:g1:1:1:gate');
  assert.equal(o.kind, 'dungeon'); assert.equal(o.dungeonId, 'dungeon:7:g1:1:1:gate'); assert.equal(o.linked, true);
  assert.ok(!(o.x === 16 && o.y === 16) && !(o.x === 16 && o.y === 15));
  assert.ok(Math.hypot(o.x - 16, o.y - 16) <= 1.5);
  assert.equal(placeMouth(map, 'dungeon:7:g1:1:1:gate'), o);
  assert.equal(map.objects.length, 2);
  assert.equal(placeMouth({ tiles: tiles.map((t) => ({ ...t, kind: 'lava' })), objects: [] }, 'dungeon:x'), null);
});

test('links survive migration; broken entries are dropped', () => {
  const s = save(); s.linkedDungeons = { 'dungeon:7:a': { a: { rx: 1, ry: 2, x: 5, y: 6 }, b: { rx: 9, ry: -3 } }, 'dungeon:7:b': { a: { rx: 1 } }, 'hunt:x': { a: { rx: 1, ry: 1 }, b: { rx: 2, ry: 2 } } };
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(m.linkedDungeons, { 'dungeon:7:a': { a: { rx: 1, ry: 2, x: 5, y: 6 }, b: { rx: 9, ry: -3 } } });
  assert.deepEqual(freshSave().linkedDungeons, {});
  assert.deepEqual(ensureLinks({}).linkedDungeons, {});
});

test("the game sends a linked dungeon's guardian's door to its other mouth, and the Atlas joins them in green", () => {
  const game = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(game, /this\.map\?\.multiLevel \? linkedExit\(/);
  assert.match(game, /mouthsIn\(this\.save,this\.rx,this\.ry\)\)placeMouth\(this\.map,id\)/);
  assert.match(main, /drawLinkedDungeons\(w,h,cell\)/);
  assert.match(main, /LINKED_COLOR="#7dff9e"/);
});
