// Release 431 (docs/narrative-bible.md section 6, thread 1; section 7, step 6): the Seven Bells. A cracked bell hangs in
// some ordinary crossings of the Smoke Meadows and the middle band; ringing it shows one lost person walking home; the
// seventh brings all seven to the Bell-founder's Daughter's door.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { BELLS, BELL_GLIMPSES, BELL_FINAL, bellIn, bellsRung, addBell, ringBell } from '../src/bells.ts';

const seed = 'BELLS431';
// Ordinary crossings (rx, ry) at depth 3..18 that hold a bell, scanning a fixed range.
const crossings = () => { const out = []; for (let rx = -12; rx <= 12; rx++) for (let ry = -12; ry <= 12; ry++) { const id = `dungeon:${seed}:g1:${rx}:${ry}:room`, n = bellIn(seed, id); if (n) out.push({ id, n, rx, ry }); } return out; };

test('seven bells, each a different lost person, and the door at the end; all original writing', () => {
  assert.deepEqual(Object.keys(BELL_GLIMPSES), ['1', '2', '3', '4', '5', '6', '7']);
  assert.match(BELL_FINAL, /none of them have faces/i); assert.match(BELL_FINAL, /lets them in anyway/);
});

test('bells hang only in ordinary crossings away from the Refuge, by seed; every one of the seven can be found', () => {
  const list = crossings(); assert.ok(list.length > 10 && list.length < 625 * .3, `${list.length} crossings`);
  for (const c of list) { const d = Math.abs(c.rx) + Math.abs(c.ry); assert.ok(d >= BELLS.minDepth); } // release 577: no farthest band
  assert.deepEqual([...new Set(list.map((c) => c.n))].sort(), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(crossings(), list, 'deterministic');
  for (const id of ['dungeon:BELLS431:g1', 'hunt-instance:1', 'arena:2', 'far-array:3', 'dungeon:BELLS431:g1:0:1:room']) assert.equal(bellIn(seed, id), 0);
});

test('ringing a bell: once, remembered, the seventh ends the thread; the record survives migration', () => {
  const s = freshSave(); s.seed = seed; const byBell = {}; for (const c of crossings()) byBell[c.n] ||= c;
  const map = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });
  let last; const used = crossings().slice(0, 7); // release 577: each crossing offers a bell not yet rung
  for (let n = 1; n <= 7; n++) {
    const m = map(), o = addBell(m, s, used[n - 1].id); assert.equal(o.kind, 'crackedBell'); assert.ok(!bellsRung(s).includes(String(o.bell)), 'a bell not yet rung'); assert.deepEqual(o.actions, ['ring']);
    assert.ok(Math.hypot(o.x - 4, o.y - 5) >= 6, 'away from the entry');
    last = ringBell(s, o); assert.ok(last.first); assert.equal(o.state, 'rung');
    assert.equal(ringBell(s, o).first, false, 'a bell rings once');
    if (n < 7) assert.match(last.message, new RegExp(`${n} of 7 bells`));
    byBell[o.bell] = used[n - 1];
  }
  assert.ok(last.done); assert.match(last.message, /Seven figures/); assert.equal(bellsRung(s), '1234567');
  const again = addBell(map(), s, byBell[3].id); assert.equal(again.state, 'rung'); assert.deepEqual(again.actions, ['inspect']);
  assert.equal(bellsRung(migrateSave(JSON.parse(JSON.stringify(s)))), '1234567');
  assert.equal(bellsRung({ lore: { bells: '9x31' } }), '13', 'junk is dropped');
});

test('found in a real crossing, rung through Act, journalled (not among Active quests), and built', () => {
  const s = freshSave(); s.seed = seed; const c = crossings()[0]; s.session.activeDungeonId = c.id; s.session.dungeonReturn = { rx: c.rx, ry: c.ry, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); const o = g.map.objects.find((q) => q.kind === 'crackedBell');
  assert.ok(o, 'the bell hangs there'); g.enemies = []; Object.assign(g.player, { x: o.x, y: o.y + .2 });
  const r = g.interact('ring', o.id); assert.ok(r.ok && r.first, g.message); assert.ok(s.narrative.journal.some((j) => j.title === 'The Seven Bells'));
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); assert.doesNotMatch(main, /add\("The Seven Bells"/, 'release 581: not tracked among Active quests');
  assert.match(readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), /o\.kind === "crackedBell"\) \{ drawCrackedBell/);
  assert.match(readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8'), /'bells'/);
  for (const sw of ['../sw.js', '../proving-ground/sw.js']) assert.match(readFileSync(new URL(sw, import.meta.url), 'utf8'), /src\/bells\.js\?v=/);
});
