// The healing hot springs (Tim, 2026-11-05: "Sure, yeah, whatever we can do. So healing hot springs."). Standing or wading in a
// Terrace Springs pool (springPool) mends a slow share of maximum health a second, out of combat only, with one message a visit and
// a wisp of steam. Play behaviour only: no generation change, so no landscape version.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, sectionRegion, HOT_SPRINGS, springMend, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { createCombatant } from '../src/combat.ts';

const SEED = 'TERR21', AT = [14, 179], idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function load(at = AT) {
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = at[0]; g.ry = at[1]; g.loadArea('overworld'); g.enemies = []; g.message = '';
  return { g, s };
}
const tileOf = (g, kind) => g.map.tiles.find((t) => t.kind === kind && t.landscape === 'terraces' && t.x > 2 && t.y > 2 && t.x < 29 && t.y < 29);
function stand(g, t, frac = .5) { const p = g.player; p.x = t.x; p.y = t.y; p.hp = Math.round(g.save.maxHp * frac); g.jumpUntil = 0; }
// Plays `seconds` of frames, putting the Wayfarer back on the tile each frame (nothing else may carry him off it in the test).
function soak(g, t, seconds, dt = .05, start = { now: 1000 }) {
  for (let k = 0; k < Math.round(seconds / dt); k++) { g.player.x = t.x; g.player.y = t.y; start.now += dt * 1000; g.update(dt, idle, start.now); }
  return start;
}

test('the table: a slow share of maximum health a second, springPool only, counted to a short step', () => {
  assert.deepEqual(HOT_SPRINGS.kinds, ['springPool']);
  assert.equal(HOT_SPRINGS.share, .02, 'Tim, 2026-11-06: "2% is fine and the water should be the one that heals you"');
  assert.ok(HOT_SPRINGS.step <= .1 && HOT_SPRINGS.calm >= 3 && HOT_SPRINGS.foeNear >= 6);
  assert.equal(springMend(50, 100, 100, 1), 50 + 100 * HOT_SPRINGS.share * HOT_SPRINGS.step, 'a long frame counts only `step` seconds');
  assert.equal(springMend(99.9, 100, 100, .1), 100, 'never past maximum health');
  assert.equal(springMend(70, 100, 70, .1), 70, 'never past the health ceiling (blight rot)');
  assert.equal(springMend(80, 100, 70, .1), 80, 'never lowers health');
  assert.equal(LANDSCAPE_VERSION, 24, 'no generation change of its own (landscape 22 is the canopy groves, release 780; 23 the Reckoning Fields, release 792)');
});

test('wading in a spring pool heals at the table rate after a calm moment; a rim, a mat or terrace ground does not', () => {
  const { g } = load(), pool = tileOf(g, 'springPool'); assert.ok(pool, 'a pool');
  stand(g, pool); const max = g.save.maxHp, before = g.player.hp;
  const c = soak(g, pool, HOT_SPRINGS.calm - .2); assert.equal(g.player.hp, before, 'not before the calm');
  soak(g, pool, 10.2, .05, c); const healed = g.player.hp - before, rate = max * HOT_SPRINGS.share;
  assert.ok(healed > rate * 9.5 && healed <= rate * 10.5 + 1e-9, `${healed} healed, ${rate}/s`);
  assert.equal(g.message, HOT_SPRINGS.message);
  assert.ok((g.glyphVisuals || []).some((v) => v.kind === 'steam'), 'a wisp of steam'); assert.ok(g.glyphVisuals.filter((v) => v.kind === 'steam').length <= 2, 'bounded');
  for (const kind of ['sinterRim', 'springMat', 'sinterTerrace', 'springFringe']) {
    const { g: h } = load(), t = tileOf(h, kind); if (!t) { assert.ok(!['sinterRim', 'springMat'].includes(kind), `${kind} found`); continue; } stand(h, t); const was = h.player.hp; soak(h, t, HOT_SPRINGS.calm + 6);
    assert.equal(h.player.hp, was, `${kind} does not heal`); assert.equal(h.springSoak.told, false);
  }
});

test('the heal is capped: never past maximum health or the ceiling, and a huge frame gives one step of it', () => {
  const { g, s } = load(), pool = tileOf(g, 'springPool'); stand(g, pool, .98); const max = s.maxHp;
  const c = soak(g, pool, HOT_SPRINGS.calm + 8); assert.equal(g.player.hp, max, 'stops at full health');
  stand(g, pool, .5); const was = g.player.hp; c.now += 5000; g.player.x = pool.x; g.player.y = pool.y; g.update(5, idle, c.now);
  assert.ok(g.player.hp - was <= max * HOT_SPRINGS.share * HOT_SPRINGS.step + 1e-9, `${g.player.hp - was} from one five-second frame`);
  s.rot = Math.floor(max * .3); stand(g, pool, .6); soak(g, pool, 30, .05, c);
  assert.ok(g.player.hp <= max - s.rot + 1e-9, 'the blight ceiling holds');
});

test('out of combat only: a foe nearby stops it, a blow resets the calm', () => {
  const { g } = load(), pool = tileOf(g, 'springPool'); stand(g, pool);
  const foe = createCombatant('ashling', pool.x + 3, pool.y, false, []); foe.id = 'ashling-spring-test'; foe.damage = 0; foe.speed = 0; g.enemies = [foe];
  assert.equal(g.springFoeNear(), true);
  g.springSoak = { calm: 99, away: 0, told: false, scanIn: 0, foes: false, wisp: 0 }; const was = g.player.hp;
  assert.equal(g.tickHotSprings(.05, false, 1e6), false); assert.equal(g.player.hp, was, 'no heal with a foe at three tiles');
  foe.x = pool.x + HOT_SPRINGS.foeNear + 2; g.springSoak.scanIn = 0; assert.equal(g.springFoeNear(), false);
  assert.equal(g.tickHotSprings(.05, false, 1e6), true, 'beyond foeNear it heals'); assert.ok(g.player.hp > was);
  foe.aggro = true; g.springSoak.scanIn = 0; assert.equal(g.tickHotSprings(.05, false, 1e6), false, 'an aroused foe within aggroNear stops it');
  foe.dead = true; g.springSoak.scanIn = 0; foe.aggro = false;
  const hp = g.player.hp; assert.equal(g.tickHotSprings(.05, true, 1e6), false, 'hurt this frame'); assert.equal(g.springSoak.calm, 0);
  for (let t = 0; t < HOT_SPRINGS.calm - .1; t += .05) assert.equal(g.tickHotSprings(.05, false, 1e6), false, `still tense at ${t}s`);
  assert.equal(g.player.hp, hp); let healed = false; for (let k = 0; k < 6 && !healed; k++) healed = g.tickHotSprings(.05, false, 1e6); assert.ok(healed, 'heals again once calm');
  const ambient = createCombatant('ashling', pool.x + 1, pool.y, false, []); ambient.ambient = true; g.enemies = [ambient]; assert.equal(g.springFoeNear(), false, 'ambient wildlife is no fight');
});

test('no heal while dead, mid-jump or paused; a pause grants nothing for the time away', () => {
  const { g } = load(), pool = tileOf(g, 'springPool'); stand(g, pool);
  g.springSoak = { calm: 99, away: 0, told: false, scanIn: 0, foes: false, wisp: 0 };
  g.player.hp = 0; assert.equal(g.tickHotSprings(.05, false, 1e6), false); assert.equal(g.player.hp, 0, 'the dead do not mend'); assert.equal(g.springSoak.calm, 0);
  stand(g, pool); g.springSoak.calm = 99; g.jumpUntil = 2e6; assert.equal(g.tickHotSprings(.05, false, 1e6), false, 'in the air over the pool'); g.jumpUntil = 0;
  const c = soak(g, pool, HOT_SPRINGS.calm + 1); const was = g.player.hp; assert.ok(was > g.save.maxHp * .5, 'healing');
  g.setPaused(true, c.now); for (let k = 0; k < 200; k++) { c.now += 50; g.update(.05, idle, c.now); } assert.equal(g.player.hp, was, 'paused: no heal');
  c.now += 600000; g.setPaused(false, c.now); c.now += 50; g.player.x = pool.x; g.player.y = pool.y; g.update(.05, idle, c.now);
  assert.ok(g.player.hp - was <= g.save.maxHp * HOT_SPRINGS.share * .05 + 1e-9, `${g.player.hp - was} after ten minutes paused: one frame's worth`);
});

test('a section without springs is unchanged: no heal anywhere, and its ground generates as before', () => {
  let wild = null; for (let x = 14; x < 120 && !wild; x += 3) for (let y = 14; y < 120 && !wild; y += 3) if (sectionRegion(SEED, x, y, 21).type === 'wild') wild = [x, y];
  assert.ok(wild, 'a wild section'); const { g } = load(wild); assert.ok(!g.map.terraces); const t = g.map.tiles.find((q) => !q.blocked && q.x === 16 && q.y === 20) || g.map.tiles.find((q) => !q.blocked && q.x > 10 && q.y > 10);
  stand(g, t); const was = g.player.hp; soak(g, t, HOT_SPRINGS.calm + 4); assert.equal(g.player.hp, was); assert.equal(g.springSoak.told, false);
  g.springSoak.calm = 99; assert.equal(g.tickHotSprings(.05, false, 1e6), false);
  const a = generateRegion(SEED, ...wild), b = generateRegion(SEED, ...wild); applyLandscape(a, SEED, ...wild, { version: 21 }); applyLandscape(b, SEED, ...wild, { version: 20 });
  assert.equal(JSON.stringify(a.tiles), JSON.stringify(b.tiles), 'a wild section is the same at versions 20 and 21');
  const p1 = generateRegion(SEED, ...AT), p2 = generateRegion(SEED, ...AT); applyLandscape(p1, SEED, ...AT, { version: 21 }); applyLandscape(p2, SEED, ...AT, { version: 21 });
  assert.equal(JSON.stringify(p1), JSON.stringify(p2), 'the springs section generates deterministically');
});
