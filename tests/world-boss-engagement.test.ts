// The engagement window (Tim, 2026-11-18: "they make really good fights, but they leave too soon... each world boss can persist
// for maybe 15 minutes once you engage it; if you keep coming back to the same tile to fight it, it persists for 15 minutes and
// then it retreats"). It replaces the per-fight patience clock (180 s of fighting, restarted at every death).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { generateRegion } from '../src/world.ts';
import { WORLD_BEASTS, WORLD_BEAST_IDS, BEAST_ENGAGEMENT, beastEngagementLeft, beastEngaged, worldBeastPatience, ensureWorldBeasts, worldBeastsLost } from '../src/world-beasts.ts';
import { ASTRAL_PROFILE } from '../src/astral-worm.ts';
import { DRAGON } from '../src/monster-pack.ts';
import { dragonRecord } from '../src/crimson-dragon.ts';
import { Game } from '../src/game.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
// A game holding beast `id` in a plain overworld section (no settlement or open sea), with its live actor.
function hunt(id, seed = 'ENGAGE') {
  for (let ry = 2; ry < 40; ry++) for (let rx = 6; rx < 30; rx++) {
    const m = generateRegion(seed, rx, ry); if (m.settlement || m.openSea) continue;
    const s = freshSave(); s.seed = seed; s.level = 8; s.playSeconds = 500; s.worldBeasts = { [id]: { active: { rx, ry, tries: 0 }, cycle: 0 } };
    const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld');
    const e = g.enemies.find((q) => q.worldBeast === id && !q.dead); if (!e) continue;
    g.player.hp = 1e6; g.player.invulnerableUntil = 1e15;
    return { g, s, e, rx, ry };
  }
  throw new Error('no section found');
}
const live = (g, id) => g.enemies.find((q) => q.worldBeast === id && !q.dead);
// Frames of play at 1/30 s, the Wayfarer kept alive and away from the beast's reach.
function play(g, seconds, t = { now: 1000 }) { for (let i = 0; i < Math.round(seconds * 30); i++) { g.player.hp = 1e6; g.player.invulnerableUntil = 1e15; g.update(1 / 30, idle, t.now += 33); } return t; }

test('the window is one data number, 15 minutes, and the per-beast patience clocks are gone', () => {
  assert.deepEqual(BEAST_ENGAGEMENT, { seconds: 900 });
  for (const id of WORLD_BEAST_IDS) assert.equal(WORLD_BEASTS[id].patience, undefined, `${id}: no per-fight patience left`);
  assert.equal(ASTRAL_PROFILE.patience, undefined);
});

test('engagement begins when the beast is first roused, on save.playSeconds, and is never refreshed', () => {
  const s = freshSave(); s.playSeconds = 50; s.worldBeasts.tremorWorm.active = { rx: 3, ry: 3, tries: 0 };
  assert.equal(worldBeastPatience(s, 'tremorWorm', 1 / 30, { hp: 1, maxHp: 1, aggro: false }), false); assert.equal(beastEngaged(s.worldBeasts.tremorWorm.active), false, 'a calm beast is not engaged');
  assert.equal(beastEngagementLeft(s, 'tremorWorm'), Infinity);
  worldBeastPatience(s, 'tremorWorm', 1 / 30, { hp: 1, maxHp: 1, aggro: true }); assert.equal(s.worldBeasts.tremorWorm.active.engagedAt, 50, 'engaged');
  s.playSeconds = 400; worldBeastPatience(s, 'tremorWorm', 1 / 30, { hp: 1, maxHp: 1, aggro: true }); assert.equal(s.worldBeasts.tremorWorm.active.engagedAt, 50, 'a later fight does not refresh it');
  assert.equal(beastEngagementLeft(s, 'tremorWorm'), 900 - 350);
  s.playSeconds = 50 + 899; assert.equal(worldBeastPatience(s, 'tremorWorm', 1, { hp: 1, maxHp: 1, aggro: true }), false);
  s.playSeconds = 50 + 900; assert.equal(worldBeastPatience(s, 'tremorWorm', 1, { hp: 1, maxHp: 1, aggro: false }), true, 'over, roused or not');
});

test('saved additively: a reload keeps the start; junk is dropped; unknown fields are kept', () => {
  const s = freshSave(); s.worldBeasts.briarStag.active = { rx: 1, ry: 2, tries: 1, engagedAt: 123.5, future: 'x' };
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(m.worldBeasts.briarStag.active.engagedAt, 123.5); assert.equal(m.worldBeasts.briarStag.active.future, 'x');
  const j = freshSave(); j.worldBeasts.briarStag.active = { rx: 1, ry: 2, tries: 0, engagedAt: 'soon' }; ensureWorldBeasts(j, false);
  assert.equal('engagedAt' in j.worldBeasts.briarStag.active, false);
  const f = freshSave(); assert.equal(f.worldBeasts.briarStag.active, null, 'a fresh save has no hunt and no window');
});

test('in a real game: fighting past the old 3 minutes, it stays', () => {
  const { g, s, e } = hunt('lightningGiant'); e.aggro = true; g.player.x = e.x + 6; g.player.y = e.y;
  play(g, .2); const at = s.worldBeasts.lightningGiant.active.engagedAt; assert.ok(Number.isFinite(at), 'engaged');
  s.playSeconds = at + 181; play(g, .2);
  assert.ok(!s.worldBeasts.lightningGiant.active.retreat && !live(g, 'lightningGiant').retreating, 'the old patience would have sent it home by now');
});

test('in a real game: a death neither ends the window nor restarts it; coming back finds it, health reset rules as before', () => {
  const { g, s, e, rx, ry } = hunt('morphingBlob'); e.aggro = true; play(g, .1);
  const at = s.worldBeasts.morphingBlob.active.engagedAt; assert.ok(Number.isFinite(at));
  s.playSeconds = at + 300; e.hp = Math.round(e.maxHp * .6);
  g.player.invulnerableUntil = 0; g.player.hp = 0; g.update(.05, idle, 5000); // the Wayfarer falls
  const q = s.worldBeasts.morphingBlob.active; assert.ok(q, 'still holding its ground'); assert.equal(q.tries, 1, 'a try is spent as before');
  assert.equal(q.engagedAt, at, 'the window carries on from the same start');
  g.rx = rx; g.ry = ry; g.loadArea('overworld'); const again = live(g, 'morphingBlob'); assert.ok(again, 'back on its ground: there it is');
  again.aggro = true; play(g, .1); assert.equal(s.worldBeasts.morphingBlob.active.engagedAt, at, 'roused again: no refresh');
});

test('in a real game: leaving and coming back within the window finds it; a reload keeps the window', () => {
  const { g, s, e, rx, ry } = hunt('mountainTurtle'); e.aggro = true; play(g, .1);
  const at = s.worldBeasts.mountainTurtle.active.engagedAt;
  g.rx = rx + 4; g.ry = ry; g.loadArea('overworld'); s.playSeconds = at + 600; // away ten minutes
  g.rx = rx; g.ry = ry; g.loadArea('overworld'); assert.ok(live(g, 'mountainTurtle'), 'still there after ten minutes away');
  const r = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(r.worldBeasts.mountainTurtle.active.engagedAt, at);
  const g2 = new Game(r, 0); g2.rx = rx; g2.ry = ry; g2.loadArea('overworld'); assert.ok(live(g2, 'mountainTurtle'), 'and after a reload');
  assert.ok(Math.abs(beastEngagementLeft(r, 'mountainTurtle') - 300) < 1, 'with five minutes left');
});

test('pause does not count: a paused game spends none of the window', () => {
  const { g, s, e } = hunt('briarStag'); e.aggro = true; play(g, .1);
  const left = beastEngagementLeft(s, 'briarStag'); g.setPaused(true, 9000);
  for (let i = 0; i < 300; i++) g.update(1 / 30, idle, 9000 + i * 33);
  assert.equal(beastEngagementLeft(s, 'briarStag'), left, 'ten paused seconds: nothing spent');
  g.setPaused(false, 20000); play(g, 1, { now: 20000 }); assert.ok(beastEngagementLeft(s, 'briarStag') < left - .9, 'play spends it');
});

test('when the window ends in sight it retreats home by its old rules, roused or not; out of sight it has gone home', () => {
  const { g, s, e } = hunt('morphingBlob'); e.aggro = true; play(g, .1);
  e.aggro = false; s.playSeconds = s.worldBeasts.morphingBlob.active.engagedAt + BEAST_ENGAGEMENT.seconds; play(g, .1);
  assert.ok(s.worldBeasts.morphingBlob.active.retreat, 'it retreats'); assert.ok(live(g, 'morphingBlob').retreating);
  const o = hunt('tremorWorm'); o.e.aggro = true; play(o.g, .1); const q = o.s.worldBeasts.tremorWorm.active, cycle = o.s.worldBeasts.tremorWorm.cycle;
  o.g.rx = o.rx + 5; o.g.loadArea('overworld'); assert.ok(o.s.worldBeasts.tremorWorm.active, 'away, within the window: still holding');
  o.s.playSeconds = q.engagedAt + BEAST_ENGAGEMENT.seconds + 1; assert.deepEqual(worldBeastsLost(o.s, 'overworld', o.rx + 6, o.ry), ['tremorWorm'], 'out of sight when it ran out: gone home');
  assert.equal(o.s.worldBeasts.tremorWorm.active, null); assert.equal(o.s.worldBeasts.tremorWorm.escaped, 1); assert.equal(o.s.worldBeasts.tremorWorm.cycle, cycle + 1, 'a new hunt, a new window, by the normal rules');
  assert.equal(o.s.worldBeasts.tremorWorm.cooldown, WORLD_BEASTS.tremorWorm.cooldownEscaped);
});

test('the Crimson Tyrant: a fall on its claimed ground no longer ends the hunt within the window', () => {
  const { g, s, e, rx, ry } = hunt('crimsonTyrant'); e.aggro = true; play(g, .1);
  const r = dragonRecord(s, rx, ry); r.casts = DRAGON.colonize.casts; r.nextAt = 1e12;
  g.player.invulnerableUntil = 0; g.player.hp = 0; g.update(.05, idle, 5000);
  assert.ok(s.worldBeasts.crimsonTyrant.active, 'within the window it is still there');
  s.playSeconds = s.worldBeasts.crimsonTyrant.active.engagedAt + BEAST_ENGAGEMENT.seconds + 1; g.rx = rx; g.ry = ry; g.loadArea('overworld');
  g.player.invulnerableUntil = 0; g.player.hp = 0; g.update(.05, idle, 9000);
  assert.equal(s.worldBeasts.crimsonTyrant.active, null, 'its window over, it has claimed the ground as before'); assert.equal(s.worldBeasts.crimsonTyrant.escaped, 1);
});
