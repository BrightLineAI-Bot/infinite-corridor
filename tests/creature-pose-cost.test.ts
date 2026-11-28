// Ordinary creatures' per-frame posing cost (2026-11-28): Close View re-writes every ordinary creature on the CPU every frame (up
// to MODEL_LIMIT of them, in packs). Tim asked for the Wayfarer's trim (release 1082: hoisted reads, a small vertex function,
// uniform shapes) to be applied to the monsters, unchanged in look. These guard the drawn bytes and the hot loop's shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { writeCloseViewModel, CREATURE_POSE, MODEL_FLOATS, MODEL_MAX_VERTICES, modelSupported } from '../src/close-view-models.ts';
import { MOTION_STATE_FLOATS } from '../src/creature-motion.ts';
import { blendActs, smooth } from '../src/close-view-beast-rig.ts';

const src = fs.readFileSync(new URL('../src/close-view-models.ts', import.meta.url), 'utf8');
const block = (text, from) => { let depth = 0; const j = text.indexOf('{', from); for (let k = j; k < text.length; k++) { if (text[k] === '{') depth++; else if (text[k] === '}' && --depth === 0) return text.slice(j, k + 1); } throw new Error('unbalanced'); };
const body = (name) => { const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return block(src, i); };

// A deterministic spread of every ordinary creature's poses: walking, winding up, every pack phase and family, hit reactions,
// guards, dodges, falls, palettes, reduced motion. (The actor fields are the ones close-view.ts hands over.)
function actors(kind, n) {
  let seed = 977 + kind.length * 131 + kind.charCodeAt(0); const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  const fams = ['bite', 'stab', 'sweep', 'slam', 'beam', 'charge', 'ranged', 'curse', 'teleport', 'leap', 'burrow', 'dive', 'summon', 'inhale', 'howl'];
  const phases = ['windup', 'track', 'strike', 'active', 'recover', 'erupt', 'lock', 'travel'], poses = ['idle', 'walk', 'walk', 'windup', 'attack', 'semantic', 'semantic', 'death', 'hit', 'idle'];
  const motion = new Float32Array(MOTION_STATE_FLOATS), list = [];
  for (let i = 0; i < n; i++) {
    const pose = poses[i % poses.length], sem = pose === 'semantic';
    list.push({ kind, x: 3 + rnd(), y: 4 + rnd(), z: .2 * rnd(), yaw: rnd() * 6.28, phase: rnd() * 12, pace: i % 3 ? rnd() : 0, pose, amount: rnd(), turn: rnd() * 2 - 1, reduceMotion: i % 11 === 0,
      scale: .8 + rnd() * .5, stagger: i % 13 === 0 ? rnd() : 0, effectTime: 1e5 + i * 16.7, walkerGesture: rnd(), palette: i % 5, watched: i % 4 === 0,
      action: sem ? ['bite', 'clawSweep', 'leapSlam', 'burrowAmbush', 'blinkStrike', 'prismBeam'][i % 6] : null, actionFamily: sem ? fams[i % fams.length] : null, actionPhase: sem ? phases[i % phases.length] : undefined, actionProgress: rnd(),
      rootAttack: ['bite', 'lunge', 'slam', ''][i % 4], attackReach: 1 + rnd(), eliteWindup: i % 17 === 0 ? rnd() : 0, eliteActive: 0, stillness: rnd() * (i % 2),
      flinch: i % 5 === 0 ? rnd() : 0, reeling: i % 19 === 0, hitReact: i % 7 === 0 ? rnd() : 0, blow: i % 7 === 0 ? rnd() : undefined, grounded: true,
      impactFlash: i % 9 === 0 ? rnd() : 0, hitX: rnd() - .5, hitY: rnd() - .5, guard: i % 6 === 0 ? rnd() : 0, dodge: i % 8 === 0 ? rnd() : 0, dodgeSide: 1, feint: i % 10 === 0 ? rnd() : 0, feintSide: -1,
      alert: i % 4 === 0 ? rnd() : 0, arrive: i % 15 === 0 ? rnd() : 0, arriveStyle: '', heavy: i % 3 === 0, comboStep: i % 4, spent: 0, seed: (i * 7919) % 100000, accel: rnd() - .5,
      motionState: motion, motionDetail: i % 3, alpha: .7 + .3 * rnd(), shadow: i % 23 === 0, poison: i % 29 === 0, attachments: null, muzzleOut: null });
  }
  return list;
}
const KINDS = [...Object.keys(CREATURE_POSE.kinds).filter(modelSupported), 'voidWalker'];

test('every ordinary creature draws the same bytes as before the trim (positions, normals, colours and alpha, Float32)', () => {
  const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS), all = createHash('sha256');
  let vertices = 0;
  for (const kind of KINDS) for (const actor of actors(kind, 90)) {
    const n = writeCloseViewModel(out, 0, actor); all.update(String(n)); all.update(Buffer.from(out.buffer, 0, n * 4)); vertices += n / MODEL_FLOATS;
  }
  assert.ok(KINDS.length >= 50 && vertices > 2e6, `${KINDS.length} kinds, ${vertices} vertices`);
  // Pinned from the code before the trim (main at release 1088). A deliberate change to a creature's art or motion moves it.
  assert.equal(all.digest('hex'), '993250361dd2a87d754e9aebe125dc8b0a9c0b5418274eec851085ef5e905ba7');
});

test('the vertex loop reads only locals: no actor, part or scratch-record loads, no allocation, per vertex', () => {
  const w = body('writePartVertices'), head = 'for (let i = 0; i < mesh.length; i += MESH_FLOATS)', i = w.indexOf(head);
  assert.ok(i >= 0); const loop = block(w, i).replace(/\/\/[^\n]*/g, ''); // (code only: comments name the tables they follow)
  assert.doesNotMatch(loop, /\b(V|B|actor|PART_VX|BEND_FRAME|CREATURE_MOTION)\./, 'no record or actor loads inside the vertex loop');
  assert.doesNotMatch(loop, /=>|function\b|new \w|\[\s*\]|\{\s*\}/, 'no closure, array or object made per vertex');
  // the part loop of writeCloseViewModel reads the actor once per model, not once per part
  const m = body('writeCloseViewModel'), p = m.indexOf('for (const { mesh, swing:sourceSwing');
  assert.ok(p >= 0); assert.doesNotMatch(block(m, p), /\bactor\./, 'no actor loads per part');
  assert.match(m, /offset = writePartVertices\(out, offset, mesh, V\);/);
});

test('the scratch record keeps one shape: every field the frame sets is declared up front', () => {
  const i = src.indexOf('const PART_VX = {'); assert.ok(i >= 0);
  const declared = new Set([...block(src, i).matchAll(/(\w+):/g)].map((x) => x[1]));
  const set = new Set([...src.matchAll(/\bV\.(\w+) =/g)].map((x) => x[1]));
  assert.ok(set.size >= 50, `${set.size} fields set`);
  for (const f of set) assert.ok(declared.has(f), `PART_VX.${f} declared`);
  for (const f of declared) assert.ok(set.has(f), `PART_VX.${f} set every frame`);
});

test('blendActs is the crossfade the beasts wrote inline, exactly (the same pose and clock for any keys, gaps and snaps)', () => {
  const n = 7, inline = (tr, key, V, now, gapMs, blendMs, snap) => { // the block as the Giant, Stag, Turtle, Knight, Questing Beast, Gaunt and Walker had it
    if (tr.key === '' || !(gapMs <= blendMs) || snap) { if (key !== tr.key) tr.blendAt = -Infinity; tr.shown.set(V); tr.from.set(V); tr.key = key; }
    else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
    const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / blendMs);
    for (let k = 0; k < n; k++) tr.shown[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  };
  const track = () => ({ key: '', blendAt: -Infinity, from: new Float64Array(n), shown: new Float64Array(n) });
  let seed = 5; const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  for (let run = 0; run < 40; run++) {
    const a = track(), b = track(), V = new Float64Array(n); let now = 1000 + run, at = NaN;
    for (let f = 0; f < 300; f++) {
      now += rnd() < .05 ? 400 * rnd() : 16.7 * (1 + rnd()); const gapMs = Number.isFinite(at) ? now - at : Infinity; at = now;
      for (let k = 0; k < n; k++) V[k] = Math.sin(f * .1 + k) * (1 + run * .1);
      const key = ['move', 'swing:1', 'swing:2', 'roar'][Math.floor(f / 23 + run) % 4], snap = rnd() < .02, blendMs = 180 + run;
      inline(a, key, V, now, gapMs, blendMs, snap); blendActs(b, key, V, n, now, gapMs, blendMs, snap);
      assert.equal(b.key, a.key); assert.ok(Object.is(b.blendAt, a.blendAt)); assert.deepEqual(b.shown, a.shown); assert.deepEqual(b.from, a.from);
    }
  }
});
