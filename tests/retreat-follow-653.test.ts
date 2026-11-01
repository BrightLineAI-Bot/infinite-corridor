// Release 653 (Tim, 2026-11-01: "I have never been able to follow a retreating creature to its home... I've seen [the worm]
// retreating a bunch of times but [never] to fight"): a retreat waits for the Wayfarer who follows, turns at bay on its home
// ground, and an unfollowed Worm retreat ends instead of freezing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { RETREAT, worldBeastsLost, retreatsUnderWay, advanceRetreat } from '../src/world-beasts.ts';

const SIDE = { east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1] };
function retreatOut(id = 'morphingBlob') {
  const s = freshSave(); s.seed = 'FOLLOW'; s.playSeconds = 1000; s.worldBeasts[id].active = { rx: 8, ry: 8, tries: 1, patience: 179.99 };
  const g = new Game(s, 0); g.rx = 8; g.ry = 8; g.loadArea('overworld'); const e = g.enemies.find((q) => q.worldBeast === id); e.aggro = true;
  let t = 0; const step = () => { g.player.hp = 999; g.update(1 / 30, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, t * 1000); t += 1 / 30; };
  for (let i = 0; i < 60 && !e.retreating; i++) step();
  for (let i = 0; i < 30 * 120 && g.enemies.includes(e); i++) step();
  return { s, g, e, step, q: () => s.worldBeasts[id].active };
}

test('a retreat you reach late still waits in the section it fled into', () => {
  const { s, g, e, q } = retreatOut(); assert.ok(q(), 'still under way'); const [dx, dy] = SIDE[e.fleeTo.side];
  s.playSeconds += 20; // past the old 14 s leg: it used to have moved on already
  g.transitionSection(dx, dy); assert.ok(g.enemies.some((x) => x.worldBeast === 'morphingBlob' && !x.dead), 'there when you arrive');
  assert.ok(RETREAT.legSeconds >= 30);
});

test('entering its section never moves it on, however long it took', () => {
  const s = freshSave(); s.seed = 'FOLLOW'; s.playSeconds = 5000;
  s.worldBeasts.morphingBlob.active = { rx: 8, ry: 7, tries: 1, retreat: { home: { rx: 8, ry: 3, found: true }, side: 'south', legs: 1, movedAt: 4000 } };
  advanceRetreat(s, 'morphingBlob', 8, 7); assert.deepEqual([s.worldBeasts.morphingBlob.active.rx, s.worldBeasts.morphingBlob.active.ry], [8, 7]);
});

test('followed all the way home, it turns at bay and can be fought there', () => {
  const { s, g, e: first, step, q } = retreatOut(); let e = first, legs = 0;
  while (q()?.retreat && legs < 10) { // walk after it, one section at a time
    const [dx, dy] = SIDE[e.fleeTo?.side || q().retreat.side && { east: 'west', west: 'east', north: 'south', south: 'north' }[q().retreat.side]]; s.playSeconds += 5; g.transitionSection(dx, dy); legs++;
    e = g.enemies.find((x) => x.worldBeast === 'morphingBlob' && !x.dead); assert.ok(e, `there after leg ${legs}`);
    for (let i = 0; i < 30 * 90 && e.retreating && g.enemies.includes(e); i++) step();
  }
  assert.ok(!e.retreating && !e.untargetable && e.cornered && g.enemies.includes(e), `at bay after ${legs} legs, not faded`);
  assert.ok(q() && q().cornered && !q().retreat, 'the hunt goes on, at home');
});

test('an unfollowed Worm retreat ends, and its tracks show', () => {
  const s = freshSave(); s.seed = 'FOLLOW'; s.playSeconds = 2000;
  s.worldBeasts.astralWorm.active = { rx: 8, ry: 7, tries: 1, retreat: { home: { rx: 8, ry: 7, found: true }, side: null, legs: 0 } };
  assert.ok(retreatsUnderWay(s).some((r) => r.id === 'astralWorm'), 'tracks');
  worldBeastsLost(s, 'overworld', 8, 6); assert.ok(s.worldBeasts.astralWorm.active, 'next door, it waits a while');
  s.playSeconds += RETREAT.wormLinger + 1; worldBeastsLost(s, 'overworld', 8, 6); assert.equal(s.worldBeasts.astralWorm.active, null, 'then it is gone');
  s.worldBeasts.astralWorm.active = { rx: 8, ry: 7, tries: 1, retreat: { home: { rx: 8, ry: 7, found: true }, side: null, legs: 0 } };
  worldBeastsLost(s, 'overworld', 20, 20); assert.ok(s.worldBeasts.astralWorm.active, 'far away, the clock starts'); s.playSeconds += RETREAT.wormLinger; worldBeastsLost(s, 'overworld', 20, 21); assert.equal(s.worldBeasts.astralWorm.active, null, 'and then it is gone');
});
