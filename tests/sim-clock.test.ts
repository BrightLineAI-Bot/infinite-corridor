import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, footprintOpen, mapWidth } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';
import { SIM_CLOCK, createSimClock, simClockStep, simClockDraw, resetSimClock } from '../src/sim-clock.ts';

// Feel pass 1: the world advances in fixed 60 Hz steps (sim-clock.ts) behind main.ts's unchanged dt clamp.
function input(x = 0, y = 0) {
  const pending = new Set();
  return { state: { x, y }, press: (a) => pending.add(a), consume: (a) => pending.delete(a), held: () => false, reset: () => pending.clear(), pending };
}
function fixture(seed = 'SIM-CLOCK') {
  const save = freshSave(); save.seed = seed; save.closeView = false; save.activeWeaponSlot = 'primary';
  Object.assign(save.session, { area: 'dungeon', activeDungeonId: `building:${seed}:8:3:keep:3:f1`, x: 4, y: 4 });
  const g = new Game(save, 1000); g.installSystems(); g.installWeaponSystems(); g.enemies = [];
  g.map.objects = g.map.objects.filter((o) => o.kind !== 'trap');
  const w = mapWidth(g.map, g.area); let best = null;
  for (const t of g.map.tiles) { if (t.blocked || t.hole || t.doorway || t.openAir || t.courtyard) continue; let n = 0; while (n < 16 && footprintOpen(g.map, w, t.x + n * .25, t.y)) n++; if (!best || n > best.n) best = { t, n }; }
  g.player.x = best.t.x; g.player.y = best.t.y; g.player.stamina = 100; g.player.facing = 'right'; g.save.lastAim = { x: 1, y: 0 }; g.player.lastMoveVector = { x: 1, y: 0 };
  return { g, room: best.n * .25 };
}
// The main loop's shape: frames at `fps`, the frame dt clamped as main.ts clamps it, Game.update once per fixed step.
function play(g, fps, ms, { x = 0, y = 0, pressAt = null, action = 'dodge', clock = createSimClock(), start = 2000, onFrame = null } = {}) {
  const wall = 1000 / fps, inp = input(x, y), steps = [];
  let now = start, last = start, frames = 0; // every rate starts from the same moment
  for (let k = 0; now <= start + ms + 1e-6; k++, now = start + k * wall) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (pressAt != null && Math.abs(now - (start + pressAt)) < 1e-6) inp.press(action);
    const n = simClockStep(clock, g, dt, now, (stepDt, stepNow) => { steps.push(stepNow); g.update(stepDt, inp, stepNow); });
    assert.ok(n <= SIM_CLOCK.maxSteps); frames++; onFrame?.(now, n);
  }
  return { steps, frames, clock };
}

test('walking covers the same ground at 20, 30, 60 and 120 fps (and still slows below 20 fps)', () => {
  const ends = {};
  for (const fps of [20, 30, 60, 120, 10]) { const { g } = fixture(); const x0 = g.player.x; play(g, fps, 400, { x: 1 }); ends[fps] = g.player.x - x0; }
  for (const fps of [20, 30, 120]) assert.ok(Math.abs(ends[fps] - ends[60]) < 1e-9, `walk at ${fps} fps: ${ends[fps]} vs ${ends[60]}`);
  assert.ok(ends[60] > .9 && ends[60] < 1.1, `2.4 tiles/s for 0.4 s, ${ends[60]}`);
  assert.ok(ends[10] < ends[60] * .7, 'below 20 fps the clamp still drops time: the world slows, it does not jump');
});

test('a dodge covers the same distance at 20, 30, 60 and 120 fps (it was 1.44 tiles at 20 fps, 1.28 above)', () => {
  const d = {};
  for (const fps of [20, 30, 60, 120]) {
    const { g, room } = fixture(); assert.ok(room >= 2, 'the fixture floor has a clear run');
    const x0 = g.player.x; play(g, fps, 900, { x: 0, pressAt: 200 }); d[fps] = g.player.x - x0;
  }
  for (const fps of [20, 30, 120]) assert.ok(Math.abs(d[fps] - d[60]) < 1e-9, `dodge at ${fps} fps: ${d[fps]} vs ${d[60]}`);
  assert.ok(Math.abs(d[60] - 1.28) < 1e-6, `16 steps of 4.8 tiles/s: ${d[60]}`);
});

test('step times are fixed to the wall clock: one step apart, never ahead of the frame, the same at any frame rate', () => {
  const times = {};
  for (const fps of [20, 30, 60, 120, 144]) { const { g } = fixture(); times[fps] = play(g, fps, 1000).steps; }
  const ref = times[60];
  for (const fps of [20, 30, 120]) { assert.equal(times[fps].length, ref.length, `${fps} fps runs ${times[fps].length} steps`); times[fps].forEach((t, i) => assert.ok(Math.abs(t - ref[i]) < 1e-6, `${fps} fps step ${i}`)); }
  for (const list of Object.values(times)) for (let i = 1; i < list.length; i++) { const gap = list[i] - list[i - 1]; assert.ok(gap > 0 && Math.abs(gap - 1000 / 60) < 2.5, `gap ${gap}`); }
  // the step's time never runs ahead of the frame's time
  const { g } = fixture(), clock = createSimClock(); let worst = -Infinity;
  play(g, 61.3, 600, { clock, onFrame: (now, n) => { if (n) worst = Math.max(worst, clock.lastStepNow - now); } });
  assert.ok(Number.isFinite(worst));
  assert.ok(worst <= 1e-9, `a step ahead of its frame by ${worst} ms`);
});

test('the same input gives the same world, whatever the frame rate', () => {
  const run = (fps) => { const { g } = fixture('SIM-DET'); play(g, fps, 1200, { x: .6, y: -.8, pressAt: 400 }); return g; };
  // at 60 and 120 fps the press reaches the step at its own time; at 30 fps (two steps a frame) it reaches the frame's first
  // step, one step earlier, so its clocks lead by one step while where the Wayfarer ends up is the same
  const a = run(30), b = run(60), c = run(120);
  assert.ok(Math.abs(c.player.x - b.player.x) < 1e-9 && Math.abs(c.player.y - b.player.y) < 1e-9);
  assert.equal(c.player.stamina, b.player.stamina);
  assert.equal(c.player.dodgeUntil, b.player.dodgeUntil);
  assert.ok(Math.abs(a.player.x - b.player.x) < 1e-9 && Math.abs(a.player.y - b.player.y) < 1e-9);
  assert.ok(Math.abs(a.player.dodgeUntil - (b.player.dodgeUntil - 1000 / 60)) < 1e-6);
  const strip = (q) => JSON.parse(JSON.stringify(q, (k, v) => k === 'savedAt' || k === 'updatedAt' ? undefined : v)); // the wall-clock save stamps
  const s1 = strip(run(60).exportSnapshot(4000)), s2 = strip(run(60).exportSnapshot(4000));
  assert.deepEqual(s1, s2, 'two runs at the same rate export the same journey');
});

test('a frame never runs more than four steps, and a long stall is dropped, not caught up', () => {
  const { g } = fixture(), clock = createSimClock(); let calls = 0;
  for (let i = 0; i < 20; i++) { const n = simClockStep(clock, g, 0.05, 1000 + i * 400, () => { calls++; }); assert.ok(n <= SIM_CLOCK.maxSteps && n >= 2); }
  assert.ok(calls <= 20 * 4 && clock.acc < SIM_CLOCK.step + 1e-9);
  assert.equal(simClockStep(clock, g, 0, 10000, () => calls++) <= 1, true);
  assert.equal(simClockStep(clock, g, NaN, 10010, () => { throw new Error('a NaN frame runs no step'); }) <= 1, true);
});

test('pausing stops the world in its steps, and resuming carries on', () => {
  const { g } = fixture(), clock = createSimClock(), inp = input(1, 0);
  let now = 2000;
  for (let i = 0; i < 10; i++) { now += 1000 / 60; simClockStep(clock, g, 1 / 60, now, (sd, sn) => g.update(sd, inp, sn)); }
  const x = g.player.x; g.setPaused(true, now);
  for (let i = 0; i < 30; i++) { now += 1000 / 60; simClockStep(clock, g, 1 / 60, now, (sd, sn) => g.update(sd, inp, sn)); }
  assert.equal(g.player.x, x, 'nothing moves while paused');
  g.setPaused(false, now);
  for (let i = 0; i < 10; i++) { now += 1000 / 60; simClockStep(clock, g, 1 / 60, now, (sd, sn) => g.update(sd, inp, sn)); }
  assert.ok(g.player.x > x);
});

test('drawing sees positions between the last two steps; nothing else does, and every position is put back', () => {
  const { g } = fixture(), clock = createSimClock(), inp = input(1, 0);
  // a creature and a shot moved by the step itself (kept in the lists whatever the update makes of these bare stand-ins)
  const E = { id: 'e1', kind: 'ashling', x: g.player.x + 3, y: g.player.y, hp: 10, maxHp: 10 }, S = { id: 's1', x: 1, y: 1, dx: 1, dy: 0, speed: 0, life: 9, damage: 0, path: 'straight', age: 0, hits: {} };
  let now = 2000;
  for (let i = 0; i < 6; i++) { now += 1000 / 60; simClockStep(clock, g, 1 / 60, now, (sd, sn) => { g.enemies = []; g.projectiles = []; g.update(sd, inp, sn); g.enemies = [E]; g.projectiles = [S]; E.x += .05; S.x += .1; }); }
  now += 8; simClockStep(clock, g, .008, now, () => assert.fail('half a step runs no update'));
  assert.ok(clock.alpha > .3 && clock.alpha < .7, `alpha ${clock.alpha}`);
  const stepped = { px: g.player.x, ex: g.enemies[0].x, sx: g.projectiles[0].x };
  let seen = null, savedDuring = null;
  simClockDraw(clock, g, () => { seen = { px: g.player.x, ex: g.enemies[0].x, sx: g.projectiles[0].x }; savedDuring = g.exportSnapshot(now).session.x; });
  assert.ok(seen.px < stepped.px && seen.px > stepped.px - 2.4 / 60, 'the Wayfarer is drawn part way through the last step');
  assert.ok(Math.abs(seen.ex - (stepped.ex - .05 * (1 - clock.alpha))) < 1e-9 && Math.abs(seen.sx - (stepped.sx - .1 * (1 - clock.alpha))) < 1e-9);
  assert.deepEqual({ px: g.player.x, ex: g.enemies[0].x, sx: g.projectiles[0].x }, stepped, 'positions are put back exactly');
  const exported = g.exportSnapshot(now);
  assert.equal(exported.session.x, stepped.px, 'a save taken outside the draw has the stepped position');
  assert.ok(savedDuring !== null);
  // a throwing draw still puts everything back
  assert.throws(() => simClockDraw(clock, g, () => { throw new Error('boom'); }), /boom/);
  assert.deepEqual({ px: g.player.x, ex: g.enemies[0].x, sx: g.projectiles[0].x }, stepped);
  // exact resume: the stored journey reopens where the steps left the Wayfarer
  const { main, puts } = splitSnapshot(snapshotSave(exported));
  const validated = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts))));
  assert.equal(validated.health, 'healthy', validated.error);
  const resumed = new Game(migrateSave(validated.save), 50000);
  assert.equal(resumed.player.x, stepped.px); assert.equal(resumed.player.y, g.player.y);
});

test('an object moved after the step, a jump of more than a tile, a new area and a different game are drawn where they are', () => {
  const { g } = fixture(), clock = createSimClock(), inp = input(1, 0);
  g.enemies = [{ id: 'far', x: 2, y: 2, hp: 1, maxHp: 1 }, { id: 'moved', x: 5, y: 5, hp: 1, maxHp: 1 }];
  let now = 2000;
  for (let i = 0; i < 3; i++) { now += 1000 / 60; simClockStep(clock, g, 1 / 60, now, (sd, sn) => { g.update(sd, inp, sn); g.enemies[0].x += 3; g.enemies[1].x += .05; }); }
  now += 8; simClockStep(clock, g, .008, now, () => {});
  g.enemies[1].x = 9; // a tap or a teleport between the step and the draw
  const far = g.enemies[0].x;
  simClockDraw(clock, g, () => { assert.equal(g.enemies[0].x, far, 'a 3-tile step is not slid'); assert.equal(g.enemies[1].x, 9, 'a moved object is left alone'); });
  assert.equal(g.enemies[1].x, 9, 'and not put back to the stepped place');
  const other = fixture('SIM-OTHER').g;
  simClockDraw(clock, other, () => assert.equal(other.player.x, other.player.x));
  simClockStep(clock, other, 1 / 60, now + 20, () => {}); assert.equal(clock.game, other, 'a new game starts the clock afresh');
  resetSimClock(clock); assert.equal(clock.count, 0);
});

test('the game and the Proving Ground step through the sim clock behind the unchanged clamp', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), lab = readFileSync(new URL('../src/proving-ground.ts', import.meta.url), 'utf8');
  assert.match(main, /const dt = Math\.min\(0\.05, Math\.max\(0, \(now - last\) \/ 1000\)\)/);
  assert.match(main, /simClockStep\(simClock, game, dt, now, \(stepDt, stepNow\) => \{[^}]*closeViewSteer\(game, input\.state, stepNow\); try \{ game\.update\(stepDt,/);
  assert.match(main, /simClockDraw\(simClock, game, \(\) => \{[\s\S]{0,200}render\(ctx, game, innerWidth, innerHeight, now\);\s*drawDungeonSystems\(\);\s*drawRangedEffects\(\);/);
  assert.match(lab, /simClockStep\(simClock,game,dt,now,\(stepDt,stepNow\)=>\{closeViewSteer\(game,input\.state,stepNow\);try\{game\.update\(stepDt,input,stepNow\)\}/);
  assert.match(lab, /simClockDraw\(simClock,game,\(\)=>\{render\(ctx,game/);
  assert.ok(!/game\.update\(dt,/.test(main) && !/game\.update\(dt,/.test(lab), 'no frame-dt update is left');
});
