// SIM_CLOCK (feel pass 1): the world advances in fixed 60 Hz steps, and drawing shows positions interpolated between the last
// two steps.
//
// Before: main.ts and the Proving Ground ran one Game.update per animation frame with that frame's own `dt` (clamped to
// 0.05 s), so a dodge covered 1.28 tiles at 30-120 fps but 1.44 at 20 fps (its 260 ms window ends on the clock while its
// distance adds up per frame), and a 90/120 Hz screen or an uneven frame showed uneven steps.
//
// Now the frame's clamped `dt` (the same main.ts line as before) is added to an accumulator and Game.update runs once per whole
// `step` (at most `maxSteps` a frame). Each step's `now` is fixed to the wall clock: the last step of a frame is `acc` seconds
// before the frame's time, and the steps before it are exactly one step apart, so game clocks keep agreeing with
// performance.now() (the HUD and the renderers compare the two) and the step times are the same at any frame rate. Below 20 fps
// the clamp still drops time, so the world still slows down instead of jumping (as before).
//
// Drawing: positions before each step are kept, and after the frame's steps the current ones; for the length of the draw only,
// the player's, the creatures' and the shots' x and y are set between the two (`alpha`, the share of a step still waiting in the
// accumulator) and then put back exactly. Nothing else ever sees an interpolated position: Game.update, saves (exportSnapshot) and
// input run on the stepped positions. An object moved between the step and the draw (a tap that moved the Wayfarer, a
// teleport, a new area) is not touched, and a jump of more than `snapTiles` in one step is drawn where it is.
//
// No per-frame allocation: the slots are typed arrays grown by doubling, and the object list is reused.
export const SIM_CLOCK = Object.freeze({
  hz: 60,
  step: 1 / 60, // seconds of world time per Game.update
  maxSteps: 4, // a frame never runs more than this many (the clamp's 0.05 s is 3 steps; a spare one for the accumulator)
  jitter: .002, // seconds: a step falls due this much early, so a 60 Hz screen's 16.5-16.8 ms frames step once each, not 0 or 2
  snapTiles: 1, // a move longer than this in one step (a teleport, a new section) is drawn where it ends, not slid
  initialSlots: 64,
});

export function createSimClock() {
  const n = SIM_CLOCK.initialSlots;
  return { acc: 0, alpha: 1, steps: 0, totalSteps: 0, game: null, map: null, count: 0, objs: new Array(n).fill(null),
    px: new Float64Array(n), py: new Float64Array(n), cx: new Float64Array(n), cy: new Float64Array(n), live: new Uint8Array(n),
    swapped: 0, lastStepNow: NaN };
}
export function resetSimClock(clock) {
  clock.acc = 0; clock.alpha = 1; clock.steps = 0; clock.game = null; clock.map = null; clock.lastStepNow = NaN;
  for (let i = 0; i < clock.count; i++) clock.objs[i] = null;
  clock.count = 0; clock.swapped = 0;
}
function grow(clock, need) {
  let n = clock.objs.length; if (n >= need) return; while (n < need) n *= 2;
  const f = (a) => { const b = new Float64Array(n); b.set(a); return b; };
  clock.px = f(clock.px); clock.py = f(clock.py); clock.cx = f(clock.cx); clock.cy = f(clock.cy);
  const live = new Uint8Array(n); live.set(clock.live); clock.live = live;
  while (clock.objs.length < n) clock.objs.push(null);
}
const finite = (v) => typeof v === "number" && v === v && v !== Infinity && v !== -Infinity;
// The objects drawn with interpolation, in a fixed order: the Wayfarer, the creatures, the shots.
function collect(clock, game) {
  const p = game?.player, enemies = game?.enemies, shots = game?.projectiles;
  const need = 1 + (Array.isArray(enemies) ? enemies.length : 0) + (Array.isArray(shots) ? shots.length : 0);
  grow(clock, need);
  let n = 0; const objs = clock.objs;
  if (p && typeof p === "object") objs[n++] = p;
  if (Array.isArray(enemies)) for (let i = 0; i < enemies.length; i++) { const e = enemies[i]; if (e && typeof e === "object" && !e.dead) objs[n++] = e; }
  if (Array.isArray(shots)) for (let i = 0; i < shots.length; i++) { const q = shots[i]; if (q && typeof q === "object" && !q.dead) objs[n++] = q; }
  for (let i = n; i < clock.count; i++) objs[i] = null;
  clock.count = n;
  return n;
}
// Record the positions before a step (the interpolation's "from").
function recordPrevious(clock, game) {
  const n = collect(clock, game), objs = clock.objs;
  for (let i = 0; i < n; i++) { const o = objs[i]; clock.px[i] = o.x; clock.py[i] = o.y; }
  clock.map = game?.map ?? null;
}
// After the frame's steps: the positions the step left (the interpolation's "to"), matched to the recorded objects by identity
// (a slot whose object is gone from the lists, or new since, is drawn as it is).
function recordCurrent(clock, game) {
  const n = clock.count, objs = clock.objs, sameMap = clock.map === (game?.map ?? null);
  for (let i = 0; i < n; i++) {
    const o = objs[i], x = o.x, y = o.y;
    clock.cx[i] = x; clock.cy[i] = y;
    const dx = x - clock.px[i], dy = y - clock.py[i];
    clock.live[i] = sameMap && finite(x) && finite(y) && finite(clock.px[i]) && finite(clock.py[i]) && dx * dx + dy * dy <= SIM_CLOCK.snapTiles * SIM_CLOCK.snapTiles ? 1 : 0;
  }
}

// Advance the clock by one frame. `dt` is the frame's clamped seconds, `now` its time (ms). `run(stepDt, stepNow)` runs one
// Game.update; it is called 0..maxSteps times. Returns the number of steps run.
export function simClockStep(clock, game, dt, now, run) {
  if (clock.game !== game) { resetSimClock(clock); clock.game = game; }
  const S = SIM_CLOCK, step = S.step;
  clock.acc += finite(dt) && dt > 0 ? dt : 0;
  let n = Math.floor((clock.acc + S.jitter) / step);
  if (n > S.maxSteps) n = S.maxSteps; // never more: what is left over is dropped below
  clock.steps = 0;
  for (let i = 0; i < n; i++) {
    clock.acc -= step;
    // the step's time: the frame's time less what still waits in the accumulator (never ahead of the frame, never behind the
    // step before it)
    let stepNow = now - Math.max(0, clock.acc) * 1000;
    if (finite(clock.lastStepNow) && stepNow < clock.lastStepNow) stepNow = clock.lastStepNow;
    recordPrevious(clock, game);
    clock.steps++; clock.totalSteps++; clock.lastStepNow = stepNow;
    run(step, stepNow);
  }
  if (clock.acc > step) clock.acc = step - S.jitter; // a capped frame drops the rest (the world slows, it does not catch up)
  if (clock.steps) recordCurrent(clock, game);
  clock.alpha = Math.max(0, Math.min(1, clock.acc / step));
  return clock.steps;
}

// Draw with interpolated positions: set them, call draw(), and put every touched position back, even when draw throws.
// `alpha` defaults to the clock's own (1 shows the stepped positions unchanged).
export function simClockDraw(clock, game, draw, alpha = clock.alpha) {
  if (clock.game !== game || !clock.count || !(alpha < 1)) return draw();
  const a = Math.max(0, alpha), objs = clock.objs, n = clock.count;
  let touched = 0;
  try {
    for (let i = 0; i < n; i++) {
      const o = objs[i];
      // only an object still exactly where the steps left it, and only once (a later duplicate no longer matches)
      if (!clock.live[i] || o.x !== clock.cx[i] || o.y !== clock.cy[i]) { clock.live[i] = clock.live[i] ? 2 : 0; continue; }
      o.x = clock.px[i] + (clock.cx[i] - clock.px[i]) * a; o.y = clock.py[i] + (clock.cy[i] - clock.py[i]) * a;
      if (o.x === clock.cx[i] && o.y === clock.cy[i]) continue;
      clock.live[i] = 3; touched++;
    }
    clock.swapped = touched;
    return draw();
  } finally {
    for (let i = 0; i < n; i++) { const s = clock.live[i]; if (s === 3) { const o = objs[i]; o.x = clock.cx[i]; o.y = clock.cy[i]; clock.live[i] = 1; } else if (s === 2) clock.live[i] = 1; }
  }
}

// For tests and the probe: the clock's state.
export const simClockStats = (clock) => ({ acc: clock.acc, alpha: clock.alpha, steps: clock.steps, totalSteps: clock.totalSteps, slots: clock.count, swapped: clock.swapped });
