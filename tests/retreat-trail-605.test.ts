// Release 605 (Tim, 2026-10-31: "when the world bosses are in retreat [you] should be able to follow them across multiple tiles...
// They should be going to a place where they can retreat"): a retreat keeps going home out of sight, waits there, and can be
// tracked from nearby sections and on the Atlas; it escapes only when the Wayfarer is far from it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { ensureWorldBeasts, beginRetreat, worldBeastsLost, advanceRetreat, retreatsUnderWay, RETREAT } from '../src/world-beasts.ts';

const fleeing = () => { const s = freshSave(); s.seed = 'TRAIL'; s.playSeconds = 100; s.worldBeasts = { morphingBlob: { active: { rx: 5, ry: 5, tries: 1 }, cycle: 0 } }; ensureWorldBeasts(s);
  beginRetreat(s, 'morphingBlob', 5, 5, (rx, ry) => ({ biome: rx === 9 && ry === 5 ? 'blight' : 'ash' })); return s; };

test('out of sight, the beast walks home one section per leg and waits there before going in', () => {
  const s = fleeing(), q = () => s.worldBeasts.morphingBlob.active;
  assert.equal(advanceRetreat(s, 'morphingBlob', 0, 0).moved, 0, 'no time has passed');
  s.playSeconds += RETREAT.legSeconds * 2 + 1; advanceRetreat(s, 'morphingBlob', 0, 0); assert.deepEqual([q().rx, q().ry], [7, 5]);
  for (let i = 0; i < 2; i++) { s.playSeconds = q().retreat.movedAt + RETREAT.legSeconds; advanceRetreat(s, 'morphingBlob', 0, 0); } assert.deepEqual([q().rx, q().ry], [9, 5], 'home: it stops there');
  s.playSeconds = q().retreat.movedAt; // it has just arrived
  s.playSeconds += RETREAT.homeLinger - 1; advanceRetreat(s, 'morphingBlob', 0, 0); assert.ok(q(), 'still waiting at home');
  s.playSeconds += 2; assert.equal(advanceRetreat(s, 'morphingBlob', 0, 0).gone, true); assert.equal(q(), null); assert.equal(s.worldBeasts.morphingBlob.escaped, 1);
});

test('it never walks into the Wayfarer\'s section unseen; nearby sections keep the trail; far ones lose it', () => {
  const s = fleeing(), q = () => s.worldBeasts.morphingBlob.active;
  s.playSeconds += RETREAT.legSeconds * 5; assert.deepEqual(worldBeastsLost(s, 'overworld', 6, 5), []); assert.deepEqual([q().rx, q().ry], [5, 5], 'it waits at the edge of yours');
  assert.deepEqual(retreatsUnderWay(s).map((r) => [r.id, r.rx, r.ry]), [['morphingBlob', 5, 5]], 'on the Atlas');
  assert.deepEqual(worldBeastsLost(s, 'overworld', 5, 5 + RETREAT.lose), [], 'three sections away: still trackable');
  const t = fleeing(); assert.deepEqual(worldBeastsLost(t, 'overworld', 5, 5 + RETREAT.lose + 1), ['morphingBlob'], 'four away: gone');
  const u = fleeing(); assert.deepEqual(worldBeastsLost(u, 'dungeon', 5, 5, 'dungeon:x'), ['morphingBlob'], 'into a dungeon: gone');
});

test('the Atlas pins a retreat and entering a nearby section shows fresh tracks', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), game = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
  assert.match(main, /retreatsUnderWay\(save\)\)pins\.push/); assert.match(game, /title: "FRESH TRACKS"/);
});
