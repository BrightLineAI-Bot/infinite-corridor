// Viewport Closed (Tim, 2026-11-04): a death shows a short beat of the fall, VIEWPORT CLOSED, light static and a fade to black,
// then the Wayfarer wakes at the rest point. Presentation only: the recovery runs exactly once, as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { VIEWPORT_CLOSED as V, VIEWPORT_QUIET_INPUT, viewportClosedStart, viewportClosedStage, viewportClosedTick, viewportClosedTotal, viewportNoiseFrames, drawViewportClosed } from '../src/combat-visuals.ts';

const FRAME = 1 / 60;
const field = () => { const s = freshSave(); s.seed = 'VIEWPORT'; const g = new Game(s, 0); g.deathBeat = V.fall; g.deathPause = true; g.rx = 2; g.ry = 1; g.loadArea('overworld'); g.enemies = []; return { s, g }; };
// Drives the Game the way main.ts does: the world updates only while the stage lets it, always with the quiet input, and
// a release shifts the world's clocks by the frozen time.
function play(g, s, { reduceMotion = false, from = 1000, frames = 400, onFrame = null } = {}) {
  let seq = null, known = s.worldFlags.deaths || 0, now = from, starts = 0, snaps = 0, releases = 0, ends = 0; const log = [];
  for (let i = 0; i < frames; i++) {
    now += FRAME * 1000;
    const before = seq ? viewportClosedStage(seq, reduceMotion) : null;
    if (!before || before.world) g.update(FRAME, seq ? VIEWPORT_QUIET_INPUT : (onFrame?.input || VIEWPORT_QUIET_INPUT), now);
    const ev = viewportClosedTick(seq, { dt: FRAME, fallen: !!g.fallen, deaths: s.worldFlags.deaths || 0, known, reduceMotion });
    seq = ev.seq; starts += ev.start; snaps += ev.snap; ends += ev.end;
    if (ev.release && seq) { releases++; g.setPaused(true, now - seq.frozen * 1000); g.setPaused(false, now); }
    if (ev.end) { seq = null; known = s.worldFlags.deaths || 0; }
    log.push({ i, now, phase: seq ? viewportClosedStage(seq, reduceMotion).phase : 'none', stage: seq ? viewportClosedStage(seq, reduceMotion) : null, t: seq?.t ?? null, hp: g.player.hp, rx: g.rx, ry: g.ry, deaths: s.worldFlags.deaths || 0 });
    onFrame?.(i, g, seq, log);
  }
  return { log, starts, snaps, releases, ends, seq };
}

test('timings live in one table and add up to a 2.5-3.5 s close and a short re-opening', () => {
  assert.ok(V.fall > 0 && V.fall <= .4, 'the beat of the fall is at most 0.4 s');
  const toBlack = V.fall + V.close; assert.ok(toBlack >= 2.5 && toBlack <= 3.5, `death to black ${toBlack}`);
  assert.ok(V.open >= .6 && V.open <= 1, 're-opening about 0.8 s');
  assert.ok(V.staticPeak > 0 && V.staticPeak <= .3, 'some static, not a lot');
  assert.equal(viewportClosedTotal(), V.close + V.hold + V.open);
  for (const q of ['low', 'balanced', 'full']) assert.ok(V.quality[q].frames >= 1 && V.quality[q].frames <= 4 && V.quality[q].cols <= 240);
  assert.ok(V.quality.low.frames < V.quality.full.frames && V.quality.low.cols < V.quality.full.cols && V.quality.low.snapshot < V.quality.full.snapshot, 'low quality is lighter');
});

test('the state machine runs fall, closing, black, opening, done, in order and on time', () => {
  let seq = null, ev = viewportClosedTick(seq, { dt: FRAME, fallen: true, deaths: 0, known: 0 }); seq = ev.seq;
  assert.ok(ev.start && !ev.snap); assert.equal(viewportClosedStage(seq).phase, 'fall'); assert.equal(viewportClosedStage(seq).world, true);
  for (let t = 0; t < V.fall; t += FRAME) viewportClosedTick(seq, { dt: FRAME, fallen: true, deaths: 0 });
  ev = viewportClosedTick(seq, { dt: FRAME, fallen: false, deaths: 1 }); assert.ok(ev.snap, 'the snapshot is taken at the recovery');
  const phases = [], at = {}; let releases = 0, t = 0;
  while (!seq.done) { ev = viewportClosedTick(seq, { dt: FRAME, fallen: false, deaths: 1 }); t += FRAME; releases += ev.release; const st = viewportClosedStage(seq); if (phases.at(-1) !== st.phase) { phases.push(st.phase); at[st.phase] = t; } }
  assert.deepEqual(phases, ['closing', 'black', 'opening', 'done']);
  assert.equal(releases, 1, 'the world is released once');
  assert.ok(Math.abs(at.black - V.close) < 2 * FRAME, `black at ${at.black}`);
  assert.ok(Math.abs(at.done - viewportClosedTotal()) < 2 * FRAME);
  assert.ok(Math.abs(seq.frozen - (V.close + V.hold)) < 2 * FRAME, `frozen ${seq.frozen}`);
});

test('stage amounts: the words come and go, static rises gently, the picture fades to black, the re-opening thins the static', () => {
  const at = (c, rm = false) => viewportClosedStage({ t: V.fall + c, c, frozen: 0, deaths: 1, done: false }, rm);
  assert.equal(at(0).black, 0); assert.ok(at(.5).text === 1, 'the words are up'); assert.ok(at(.1).noise < at(1).noise && at(1).noise <= at(2.2).noise);
  assert.ok(at(2.2).noise <= V.staticPeak + 1e-9);
  let prev = -1; for (let c = 0; c < V.close; c += .05) { const b = at(c).black; assert.ok(b >= prev - 1e-9, 'the fade only deepens'); prev = b; }
  assert.ok(at(V.close - .01).black > .99 && at(V.close - .01).text < .05, 'nearly black, the words gone with it');
  assert.equal(at(V.close + .1).phase, 'black'); assert.equal(at(V.close + .1).black, 1); assert.equal(at(V.close + .1).world, false);
  const o1 = at(V.close + V.hold + .05), o2 = at(V.close + V.hold + V.open * .8);
  assert.equal(o1.phase, 'opening'); assert.ok(o1.world, 'the rest point is drawn while it re-opens'); assert.ok(o1.black > o2.black && o1.noise > o2.noise && o1.slit < o2.slit);
});

test('reduce motion: a gentle fade, no static, flicker, tears or slit', () => {
  for (let c = 0; c < viewportClosedTotal(); c += .05) { const s = viewportClosedStage({ t: c, c, frozen: 0, deaths: 1, done: false }, true); assert.equal(s.noise, 0); assert.equal(s.flicker, false); assert.equal(s.tears, false); assert.equal(s.slit, 1); assert.equal(s.scan, 0); }
  const s = viewportClosedStage({ t: 1, c: 1, frozen: 0, deaths: 1, done: false }, true); assert.ok(s.text > 0 && s.black > 0, 'the words and the fade remain');
});

test('a Game death with the beat holds a short live fall, then recovers exactly once at the rest point', () => {
  const { s, g } = field(); const at = { x: g.player.x, y: g.player.y }; g.player.hp = 0;
  g.update(FRAME, VIEWPORT_QUIET_INPUT, 1000);
  assert.ok(g.fallen?.beat, 'held in the beat'); assert.equal(g.rx, 2); assert.equal(g.player.x, at.x); assert.equal(s.worldFlags.deaths || 0, 0, 'not recovered yet');
  assert.ok(g.player.stunnedUntil > 1000 + V.fall * 1000, 'the pose stays down through the beat');
  const r = play(g, s, { from: 1000, frames: 360 });
  assert.equal(s.worldFlags.deaths, 1, 'recovered exactly once'); assert.equal(g.rx, s.activeCheckpoint.rx); assert.equal(g.ry, s.activeCheckpoint.ry); assert.equal(g.player.hp, s.maxHp);
  assert.equal(r.snaps, 1); assert.equal(r.releases, 1); assert.equal(r.ends, 1);
  const firstBlack = r.log.find((f) => f.phase === 'black'); assert.ok(firstBlack); const toBlack = (firstBlack.now - 1000) / 1000; assert.ok(toBlack >= 2.5 && toBlack <= 3.5, `death to black ${toBlack.toFixed(2)} s`);
  assert.match(g.message, /Felled — recovered at/, 'the existing respawn message');
});

test('the world is frozen and hidden while the Viewport is closed, and the recovery\'s protection outlasts it', () => {
  const { s, g } = field(); g.player.hp = 0; g.update(FRAME, VIEWPORT_QUIET_INPUT, 1000);
  let frozenPlay = null, protectedAtWake = null;
  play(g, s, { from: 1000, frames: 360, onFrame(i, game, seq, log) {
    const f = log.at(-1);
    if (f.phase === 'closing' && frozenPlay === null) frozenPlay = s.playSeconds;
    if (f.phase === 'black') assert.equal(s.playSeconds, frozenPlay, 'no world time passes while closed');
    if (f.phase === 'none' && protectedAtWake === null && log.length > 1 && log.at(-2).phase !== 'none') protectedAtWake = game.player.invulnerableUntil - f.now;
  } });
  assert.ok(protectedAtWake > 1000, `still protected after waking (${protectedAtWake} ms)`);
});

test('input is ignored during the sequence: held movement and presses do nothing', () => {
  const { s, g } = field(); g.player.hp = 0; g.update(FRAME, VIEWPORT_QUIET_INPUT, 1000);
  const pressed = { state: { x: 1, y: 0, attack: true, dodge: true }, consume(k) { const v = !!this.state[k]; return v; }, held: () => true, reset() {} };
  // The fall: the Game itself swallows input while the Wayfarer is down (tickFallen).
  const x0 = g.player.x; g.update(FRAME, pressed, 1000 + 16); assert.equal(g.player.x, x0, 'no movement in the fall');
  assert.ok(g.fallen, 'pressing does not end the fall');
  // After that main.ts passes only the quiet input, and freezes the world while closed.
  const r = play(g, s, { from: 1016, frames: 360 });
  assert.equal(s.worldFlags.deaths, 1);
  const during = r.log.filter((f) => f.phase !== 'none' && f.phase !== 'fall');
  assert.ok(during.every((f) => f.rx === s.activeCheckpoint.rx), 'the rest point, untouched');
  assert.deepEqual(VIEWPORT_QUIET_INPUT.state, { x: 0, y: 0 }); assert.equal(VIEWPORT_QUIET_INPUT.consume('attack'), false); assert.equal(VIEWPORT_QUIET_INPUT.held('interact'), false);
});

test('a hazard death keeps its cause through the beat', () => {
  const s = freshSave(), g = new Game(s, 0); g.deathBeat = V.fall;
  g.map.tiles = Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })); g.player.x = 1; g.player.y = 1; g.map.tiles[1 * 32 + 2] = { x: 2, y: 1, kind: 'canyon', blocked: true, environment: 'canyon' };
  g.update(.3, { state: { x: 1, y: 0 }, consume: () => false }, 100);
  assert.ok(g.fallen?.hazard, 'held in the beat'); assert.equal(s.worldFlags.deaths || 0, 0);
  for (let t = 100; t < 1000; t += 16) g.update(FRAME, VIEWPORT_QUIET_INPUT, t);
  assert.equal(s.worldFlags.deaths, 1); assert.match(g.message, /Lost to the canyon/); assert.equal(s.lastDeath.cause, 'canyon');
});

test('every death kind goes through the sequence: a world beast no longer holds the 4 s pace', () => {
  const { s, g } = field(), beast = g.createEnemyFromSpawn({ kind: 'ashling', x: 18, y: 16 }); beast.worldBeast = 'mountainTurtle'; g.enemies = [beast];
  g.player.hp = 0; g.update(FRAME, VIEWPORT_QUIET_INPUT, 1000);
  assert.ok(g.fallen?.beat, 'the short beat, not the long pace');
  for (let t = 1000; t < 1000 + V.fall * 1000 + 100; t += 16) g.update(FRAME, VIEWPORT_QUIET_INPUT, t);
  assert.equal(g.fallen, null); assert.equal(s.worldFlags.deaths, 1);
});

test('a dungeon death recovers once through the sequence, at the entrance as before', () => {
  const { s, g } = field(); s.session.activeDungeonId = `dungeon:${s.seed}:g${s.worldGeneration}:2:1:buried`; s.session.dungeonReturn = { rx: 2, ry: 1, x: 16, y: 16 }; g.loadArea('dungeon', false); assert.equal(g.area, 'dungeon'); g.player.hp = 0;
  g.update(FRAME, VIEWPORT_QUIET_INPUT, 1000); assert.ok(g.fallen);
  const plain = field(); plain.s.session.activeDungeonId = s.session.activeDungeonId; plain.s.session.dungeonReturn = { rx: 2, ry: 1, x: 16, y: 16 }; plain.g.deathBeat = 0; plain.g.loadArea('dungeon', false); plain.g.player.hp = 0; plain.g.update(FRAME, VIEWPORT_QUIET_INPUT, 1000);
  play(g, s, { from: 1000, frames: 360 });
  assert.equal(s.worldFlags.deaths, 1); assert.equal(g.area, plain.g.area); assert.equal(g.area, 'dungeon', 'returned to the entrance');
  assert.deepEqual([g.player.x, g.player.y], [plain.g.player.x, plain.g.player.y], 'the same recovery as without the sequence'); assert.equal(g.message, plain.g.message);
});

test('reload mid-sequence lands at the rest point, recovering once, never stuck', () => {
  // Inside the beat: the save holds the death (hp 0 where they fell); a reload dies again at once and recovers once.
  { const { s, g } = field(); g.player.hp = 0; g.update(FRAME, VIEWPORT_QUIET_INPUT, 1000); assert.equal(s.hp, 0); g.exportSnapshot(1000);
    const copy = structuredClone(s), g2 = new Game(copy, 0); g2.deathBeat = V.fall;
    const r = play(g2, copy, { from: 5000, frames: 360 });
    assert.equal(copy.worldFlags.deaths || 0, 1, 'one recovery'); assert.equal(g2.player.hp, copy.maxHp); assert.equal(g2.rx, copy.activeCheckpoint.rx); assert.equal(r.ends, 1); assert.equal(r.seq, null, 'the sequence finished'); }
  // After the recovery (closing, black or opening): the save is already at the rest point; a reload just plays on.
  for (const phase of ['closing', 'black', 'opening']) {
    const { s, g } = field(); g.player.hp = 0; g.update(FRAME, VIEWPORT_QUIET_INPUT, 1000); let copy = null;
    play(g, s, { from: 1000, frames: 360, onFrame(i, game, seq, log) { if (!copy && log.at(-1).phase === phase) { game.exportSnapshot(log.at(-1).now); copy = structuredClone(s); } } });
    assert.ok(copy, phase); assert.equal(copy.worldFlags.deaths, 1); assert.equal(copy.hp, copy.maxHp); assert.equal(copy.session.rx, copy.activeCheckpoint.rx); assert.equal(copy.session.ry, copy.activeCheckpoint.ry); assert.equal(copy.session.playerRuntime.hp, copy.maxHp);
    const g2 = new Game(copy, 0); g2.deathBeat = V.fall; const r = play(g2, copy, { from: 9000, frames: 30 });
    assert.equal(r.starts, 0, `${phase}: nothing replays after reload`); assert.equal(copy.worldFlags.deaths, 1); assert.ok(g2.player.hp > 0);
    assert.equal(copy.session.paused === true, false, 'the save is not left paused');
  }
});

test('the sequence lets go if the recovery never comes, and starts over if felled again while re-opening', () => {
  const seq = viewportClosedStart(0, false); let ended = false;
  for (let t = 0; t < V.fall + V.wait + .5 && !ended; t += FRAME) ended = viewportClosedTick(seq, { dt: FRAME, fallen: true, deaths: 0 }).end;
  assert.ok(ended, 'never stuck');
  const s2 = viewportClosedStart(1, true); s2.c = V.close + V.hold + .1;
  const ev = viewportClosedTick(s2, { dt: FRAME, fallen: true, deaths: 1 }); assert.ok(ev.start && ev.seq !== s2 && ev.seq.c === null, 'a fresh sequence');
  const ev2 = viewportClosedTick(null, { dt: FRAME, fallen: false, deaths: 3, known: 2 }); assert.ok(ev2.start && ev2.snap && ev2.seq.c === 0, 'a recovery without the beat still closes the Viewport');
  assert.equal(viewportClosedTick(null, { dt: FRAME, fallen: false, deaths: 2, known: 2 }).seq, null, 'no death, no sequence');
});

test('the static is a few small frames drawn once, and a frame of the overlay is a handful of draws', () => {
  let made = 0, pixels = 0; const mk = (w, h) => { made++; pixels += w * h; return { width: w, height: h, getContext: () => ({ createImageData: (cw, ch) => ({ data: new Uint8ClampedArray(cw * ch * 4) }), putImageData() {} }) }; };
  for (const q of ['low', 'balanced', 'full']) { made = 0; pixels = 0; const frames = viewportNoiseFrames(mk, q, 661 / 475); assert.equal(frames.length, V.quality[q].frames); assert.equal(made, V.quality[q].frames); assert.ok(pixels / made <= 240 * 360, `${q}: small frames`); }
  const a = viewportNoiseFrames(mk, 'low', 1.4), b = viewportNoiseFrames(mk, 'low', 1.4); assert.equal(a.length, b.length);
  const calls = {}; const ctx = new Proxy({}, { get(o, k) { if (k in o) return o[k]; return (...args) => { calls[k] = (calls[k] || 0) + 1; }; }, set(o, k, v) { o[k] = v; return true; } });
  const art = { snapshot: { width: 475, height: 661 }, sw: 475, sh: 661, noise: a, scan: {} };
  for (let c = 0; c < viewportClosedTotal(); c += .1) { for (const k in calls) delete calls[k]; const st = viewportClosedStage({ t: c, c, frozen: 0, deaths: 1, done: false });
    drawViewportClosed(ctx, st, 475, 661, c, art, 'full'); const draws = Object.values(calls).reduce((x, y) => x + y, 0);
    assert.ok(draws <= 60, `bounded draws (${draws}) at ${c.toFixed(1)}`); assert.ok(!calls.getImageData && !calls.putImageData && !calls.createImageData, 'no per-pixel work per frame'); }
  for (const k in calls) delete calls[k]; drawViewportClosed(ctx, viewportClosedStage(null), 475, 661, 0, art); assert.equal(Object.keys(calls).length, 0, 'nothing drawn when done');
});
