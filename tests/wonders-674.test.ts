// Release 674 (Tim, 2026-11-01: "I haven't seen any tall trees or skyways, or chasm (Starfield) explorations"): the Atlas pins the
// nearest unexplored skyway, great tree and Starfield crossing, and a traveller says which way one lies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WONDERS, wonderAt, nearestWonders, wonderRumour, compassWords } from '../src/wonders.ts';
import { generateRegion, dungeonId } from '../src/world.ts';
import { applyLandscape } from '../src/landscape.ts';
import { freshSave } from '../src/types.ts';
import { Game, CHASM, chasmRoll } from '../src/game.ts';
import { applyInteraction } from '../src/interactions.ts';

const SEED = 'WONDERS';
test('the Starfield chance here is the game\'s', () => assert.equal(WONDERS.chasmChance, CHASM.chance));

test('the predictions match the world: a skyway is a stair, a crossing rolls Starfield, a great tree mostly grows', () => {
  const s = freshSave(); s.seed = SEED; const near = nearestWonders(s, 0, 0); assert.equal(new Set(near.map((q) => q.kind)).size, near.length);
  assert.ok(near.some((q) => q.kind === 'skyway') && near.some((q) => q.kind === 'starfield'), JSON.stringify(near));
  const sky = near.find((q) => q.kind === 'skyway'), g = new Game(s, 0); g.rx = sky.rx; g.ry = sky.ry; g.loadArea('overworld');
  if (!g.map.settlement) assert.ok(g.map.objects.some((o) => o.kind === 'skyStair'), 'the skyway stands there');
  let starfields = 0; for (let x = -12; x <= 12; x++) for (let y = -12; y <= 12; y++) { if (!wonderAt(SEED, x, y, 'starfield')) continue; const d = generateRegion(SEED, x, y).objects.find((o) => o.kind === 'dungeon' && o.id.startsWith('dungeon-g1-')); assert.ok(d, `${x},${y} has its crossing`); assert.ok(chasmRoll(SEED, dungeonId(SEED, 1, x, y, d.id)), `${x},${y} rolls Starfield`); starfields++; }
  assert.ok(starfields > 0);
  let said = 0, grew = 0; for (let x = 10; x < 70 && said < 8; x++) for (let y = 0; y < 30 && said < 8; y += 3) { if (!wonderAt(SEED, x, y, 'tree')) continue; said++; const m = generateRegion(SEED, x, y); applyLandscape(m, SEED, x, y, { version: 14 }); if (m.canopy) grew++; }
  assert.ok(said >= 4 && grew / said >= .5, `${grew} of ${said} trees grew`);
});

test('only unexplored sections are named, nearest first, and the search is bounded', () => {
  const s = freshSave(); s.seed = SEED; const a = nearestWonders(s, 0, 0);
  for (let i = 1; i < a.length; i++) assert.ok(a[i].d >= a[i - 1].d);
  for (const q of a) assert.ok(q.d <= WONDERS.radius);
  (s.atlas ||= {})[`${a[0].rx},${a[0].ry}`] = { terrain: 'ash' }; const b = nearestWonders(s, 0, 0);
  assert.ok(!b.some((q) => q.rx === a[0].rx && q.ry === a[0].ry), 'explored, it is no longer a rumour');
  assert.equal(compassWords(3, -2), 'north-east'); assert.equal(compassWords(-1, 4), 'south-west');
});

test('a traveller tells of one wonder, once, with its way', () => {
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = 0; g.ry = 0; g.loadArea('overworld');
  const o = { id: 'band:0', kind: 'traveler', name: 'Hob', actions: ['speak'], x: g.player.x, y: g.player.y, state: 'listening' }; g.map.objects.push(o);
  const heard = wonderRumour(s, 0, 0, o.id); assert.match(heard, /^They speak of .+ (north|south|east|west)[a-z-]*, about \d+ sections? off\.$/);
  const r = applyInteraction(o, 'speak', s); assert.ok(r.ok && !r.message.includes('They speak of'), 'the plain speech has no rumour');
  g.interact('speak', o.id); assert.ok(g.message.endsWith(heard), g.message); assert.equal(o.rumourTold, true);
  g.interact('speak', o.id); assert.ok(!g.message.includes('They speak of'), 'once');
});
