// The beasts' standard-view render memory (walk cycle, eased poses) is keyed by the creature's id, not the object: the renderer
// paints a fresh copy of each foe every frame ({ ...e }), so memory keyed by the object restarted every frame and the walk never
// advanced (found 2026-11-12 while building the Spinosaurus art; fixed at Tim's request).
import test from 'node:test';
import assert from 'node:assert/strict';
import { drawPackMonster } from '../src/monster-render.ts';
import { createCombatant } from '../src/combat.ts';

function recorder() {
  const calls = [], grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get(t, k) {
    if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
    if (k === 'measureText') return () => ({ width: 10 });
    if (k in t) return t[k];
    return (...a) => { calls.push(k + ':' + a.map((v) => typeof v === 'number' ? v.toFixed(3) : '').join(',')); };
  }, set(t, k, v) { t[k] = v; return true; } });
  return { ctx, calls };
}
// a walking beast painted as a fresh copy each frame (as the renderer does), then the same frame for a beast never seen before
function lastFrame(kind, id, frames) {
  const base = createCombatant(kind, 10, 10, true, []); let out = null;
  for (let i = 0; i < frames; i++) { const { ctx, calls } = recorder(); const e = { ...base, id, x: 10 + i * .05, y: 10 };
    drawPackMonster(ctx, e, 32, 1000 + i * 33); out = calls.join('|'); }
  return out;
}
for (const kind of ['briarStag', 'lightningGiant', 'crimsonTyrant']) {
  test(`${kind}: its render memory carries across the renderer's per-frame copies`, () => {
    const walked = lastFrame(kind, kind + ':a', 30), fresh = lastFrame(kind, kind + ':b', 1);
    // drawn at the same time and place? no: the fresh one is drawn at frame 0. Compare like with like: a second walker with
    // its own id, walked the same way, must match the first exactly (memory is per id and deterministic) ...
    assert.equal(lastFrame(kind, kind + ':c', 30), walked.replaceAll(kind + ':a', kind + ':c'));
    // ... and differ from what a creature with no memory draws at that same frame (the walk and easing actually advanced)
    const { ctx, calls } = recorder(), base = createCombatant(kind, 10, 10, true, []);
    drawPackMonster(ctx, { ...base, id: kind + ':n', x: 10 + 29 * .05, y: 10 }, 32, 1000 + 29 * 33);
    assert.notEqual(calls.join('|'), walked, 'memory advanced the pose');
    assert.ok(fresh.length > 0);
  });
}

test('ashenMoth: its eased wing spread carries across the per-frame copies (the fold eases in, not snaps)', () => {
  const base = createCombatant('ashenMoth', 10, 10, true, []); let eased = null;
  for (let i = 0; i < 12; i++) { const { ctx, calls } = recorder(); drawPackMonster(ctx, { ...base, id: 'moth:a', mothPose: i < 10 ? 'idle' : 'fold' }, 32, 1000 + i * 33); eased = calls.join('|'); }
  const { ctx, calls } = recorder(); drawPackMonster(ctx, { ...base, id: 'moth:n', mothPose: 'fold' }, 32, 1000 + 11 * 33);
  assert.notEqual(calls.join('|'), eased, 'two frames into the fold it is still closing, not already shut');
});
