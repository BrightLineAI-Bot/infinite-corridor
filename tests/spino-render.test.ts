// The Spinosaurus's standard-view drawing (src/spino-render.ts through monster-render.ts drawPackMonster): every pose of the
// contract in both phases draws without throwing and with finite geometry; its marks and overlay; reduced motion holds still.
import test from 'node:test';
import assert from 'node:assert/strict';
import { drawPackMonster, drawPackTelegraphs } from '../src/monster-render.ts';
import { SPINO_POSES, SPINO_POSE_KEYS, spinoPoseVector, spinoStrike, spinoFossilShare, spinoStateCount, drawSpinoBiteOverlay, drawSpinoMarks, drawSpinoBiteMark } from '../src/spino-render.ts';
import { MONSTER_PACK } from '../src/monster-pack.ts';

// a recording canvas: every call is counted, and every number handed to it must be finite
function canvas() {
  const st = { calls: 0, bad: [], ops: [] };
  const grad = { addColorStop() {} };
  const ctx = new Proxy({ globalAlpha: 1, createRadialGradient: (...a) => (check('rg', a), grad), createLinearGradient: (...a) => (check('lg', a), grad), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1 }) }, {
    get: (o, k) => (k in o ? o[k] : (...a) => { st.calls++; check(k, a); st.ops.push(k + a.map((v) => typeof v === 'number' ? v.toFixed(3) : '').join(',')); }),
    set: (o, k, v) => { if (typeof v === 'number' && !Number.isFinite(v)) st.bad.push(`${String(k)}=${v}`); o[k] = v; return true; },
  });
  function check(k, a) { for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) st.bad.push(`${String(k)}(${a.join(',')})`); }
  return { ctx, st };
}
const spino = (flags = {}) => ({ id: 'spino-2d', kind: 'spinoRex', x: 10, y: 10, scale: MONSTER_PACK.spinoRex.form.scale, hp: 400, maxHp: 500, facingX: 1, ...flags });

test('drawPackMonster draws spinoRex in every pose, windup and blow, flesh, shedding and bone, either way it faces', () => {
  for (const shed of [null, 0, .5, 1]) for (const pose of [undefined, ...Object.keys(SPINO_POSES)]) for (const phase of [null, 'windup', 'active']) for (const facingX of [1, -1]) {
    const { ctx, st } = canvas(), fossil = shed != null;
    const e = spino({ spinoPose: pose, facingX, spinoFossil: fossil, spinoShed: shed ?? undefined, spinoAir: pose === 'leap' ? 1.2 : 0, spinoDig: pose === 'dig' ? 1 : 0, pack: phase ? { attack: 'spinoTest', phase } : null,
      spinoGrab: pose?.startsWith('grab') ? { who: 'player', phase: pose === 'grabTrack' ? 'track' : 'hold', t: .2 } : null });
    for (let i = 0; i < 4; i++) assert.equal(drawPackMonster(ctx, e, 32, 1000 + i * 16), true, `${pose} ${phase}`);
    assert.deepEqual(st.bad, [], `${pose} ${phase} shed ${shed}`);
    assert.ok(st.calls > 100, `${pose}: it paints (${st.calls})`);
  }
});

test('dazed, hit, walking, running, dying and reduced motion all draw; reduced motion holds the picture still', () => {
  for (const flags of [{ poiseBreak: 1 }, { hitFlash: 1 }, { spinoPose: 'run' }, { dead: true }, { reduceMotion: true, spinoPose: 'roar' }, { spinoFossil: true, poiseBreak: .6 }]) {
    const { ctx, st } = canvas(), e = spino(flags);
    for (let i = 0; i < 30; i++) { e.x += .03; drawPackMonster(ctx, e, 32, 1000 + i * 16); }
    assert.deepEqual(st.bad, [], JSON.stringify(flags));
  }
  const frame = (now) => { const { ctx, st } = canvas(); drawPackMonster(ctx, spino({ id: 'still', reduceMotion: true, spinoPose: 'grabHold' }), 32, now); return st.ops.join('|'); };
  frame(1000); assert.equal(frame(1016), frame(5000));
  assert.ok(spinoStateCount() <= 12, 'per-beast render state is bounded');
});

test('the pose table: every pose names known keys; a strike gapes in its windup and lands on its blow', () => {
  for (const [name, p] of Object.entries(SPINO_POSES)) for (const k of Object.keys(p)) if (k !== 'pre') assert.ok(SPINO_POSE_KEYS.includes(k), `${name}.${k}`);
  const v = new Float64Array(SPINO_POSE_KEYS.length), open = SPINO_POSE_KEYS.indexOf('open');
  spinoPoseVector('bite', spinoStrike({ pack: { phase: 'windup' } }, 0), v); assert.ok(v[open] > .8);
  spinoPoseVector('bite', spinoStrike({ pack: { phase: 'active' } }, 0), v); assert.ok(v[open] < .1);
  spinoPoseVector('nonsense', 1, v); assert.ok(v.every((x) => x === 0), 'an unknown pose is the idle');
  assert.equal(spinoFossilShare({}), 0); assert.equal(spinoFossilShare({ spinoFossil: true }), 1); assert.equal(spinoFossilShare({ spinoFossil: true, spinoShed: .25 }), .25);
});

test('the grab reticle on its prey (where the gameplay holds it, or on the grabbed creature) and the bite overlay', () => {
  const { ctx, st } = canvas();
  assert.equal(drawSpinoMarks(ctx, spino(), 32, 1000), false, 'no grab, no mark');
  assert.equal(drawSpinoMarks(ctx, spino({ spinoGrab: { who: 'player', phase: 'track', t: .3, x: 14, y: 11, k: .4 } }), 32, 1000), true);
  assert.equal(drawSpinoMarks(ctx, spino({ spinoGrab: { who: 'stego-1', phase: 'track', t: .3 } }), 32, 1000, [{ id: 'stego-1', x: 5, y: 6 }]), true);
  assert.equal(drawSpinoMarks(ctx, spino({ spinoGrab: { who: 'player', phase: 'hold', t: .3, x: 1, y: 1 } }), 32, 1000), false, 'only while it tracks');
  assert.equal(drawSpinoMarks(ctx, spino({ spinoGrab: { who: 'player', phase: 'track', t: .3 } }), 32, 1000), false, 'nowhere to draw it');
  drawSpinoBiteMark(ctx, 100, 100, 32, 1000, 1, true);
  assert.equal(drawSpinoBiteOverlay(ctx, 960, 540, 0), false);
  assert.equal(drawSpinoBiteOverlay(ctx, 960, 540, .8), true);
  assert.equal(drawSpinoBiteOverlay(ctx, 960, 540, 1, true), true);
  assert.deepEqual(st.bad, []);
  // the shared telegraph pass draws the reticle for a tracking Spinosaurus
  const t2 = canvas(); drawPackTelegraphs(t2.ctx, [spino({ spinoGrab: { who: 'player', phase: 'track', t: .3, x: 12, y: 12 } })], 32, 1000);
  assert.ok(t2.st.ops.some((o) => o.startsWith('arc')), 'the reticle is drawn'); assert.deepEqual(t2.st.bad, []);
});
