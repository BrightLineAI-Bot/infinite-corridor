import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { generateRegion } from '../src/world.ts';
import { STRANGE, strangeHere, addStrange, touchStrange, strangeKey } from '../src/strange.ts';
import { glimpseFor } from '../src/glimpses.ts';

test('strange things are rare and never at the Refuge', () => {
  const s = freshSave(); s.seed = 'strange-seed';
  let n = 0; for (let rx = -30; rx <= 30; rx++) for (let ry = -30; ry <= 30; ry++) if (strangeHere(s, rx, ry)) n++;
  const share = n / 61 / 61;
  assert.ok(share > STRANGE.chance * .6 && share < STRANGE.chance * 1.4, String(share));
  assert.equal(strangeHere(s, 0, 0), false);
});

test('a strange thing is one of the section\'s own trees or stones; touching it opens a Glimpse once', () => {
  const s = freshSave(); s.seed = 'strange-seed';
  let map = null, o = null, at = null;
  for (let rx = 1; rx < 200 && !o; rx++) { if (!strangeHere(s, rx, 3)) continue; map = generateRegion(s.seed, rx, 3, 2); o = addStrange(map, s, rx, 3); at = [rx, 3]; }
  assert.ok(o && (o.kind === 'tree' || o.kind === 'rock') && o.strange, 'found one');
  assert.deepEqual(o.actions, ['touch']);
  assert.ok(glimpseFor(s, 'strange', ...at, () => .99), 'a strange thing always opens a Glimpse');
  const r = touchStrange(s, o, ...at);
  assert.ok(r.ok && s.worldFlags[strangeKey(...at)] && o.strangeUsed && !o.actions.includes('touch'));
  assert.equal(touchStrange(s, o, ...at).ok, false);
  const again = addStrange(generateRegion(s.seed, at[0], 3, 2), s, ...at);
  assert.ok(again.strangeUsed, 'it stays ordinary after');
});

test('a strange stone offers Touch first, at any Might, and afterwards is an ordinary rock', async () => {
  // Release 227: the rock rules returned before strangeness was checked, so strange stones could never be touched.
  const { validActions } = await import('../src/interactions.ts');
  const { touchStrange } = await import('../src/strange.ts');
  const s = freshSave(), rock = { id: 'r9', kind: 'rock', state: 'sealed', strange: true, actions: ['touch'], name: 'A strange stone' };
  for (const might of [1, 3]) { s.stats.Might = might; assert.deepEqual(validActions(rock, s), ['touch']); }
  assert.equal(touchStrange(s, rock, 4, 5).ok, true);
  assert.ok(!validActions(rock, s).includes('touch'));
  assert.match(touchStrange(s, rock, 4, 5).message, /stone/);
});
