// Close View creature materials (the refinement pass after solid creatures, Tim 2026-11-11: "a full, detailed visual
// refinement pass on all the creatures in Close View"). Every native body shares one model program: a raised light floor,
// a cool back-rim that cuts silhouettes out of a dark room, and authored emissive parts (embers, lantern glass, eyes, sparks)
// that are lit from within and resist the fog. Emissive parts are chosen by exact authored colour from a data table.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOSE_VIEW_ACTOR_LOOK } from '../src/close-view-gl.ts';
import { writeCloseViewModel, MODEL_FLOATS, MODEL_MAX_VERTICES, modelSupported } from '../src/close-view-models.ts';
import { ACTOR_PRESENTATION, actorModelKey } from '../src/actor-presentation.ts';
import { readFileSync } from 'node:fs';

const hex = (r: number, g: number, b: number) => (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
function colours(kind: string) {
  const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS), n = writeCloseViewModel(out, 0, { kind, x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, amount: 0, pose: 'idle', alpha: 1 });
  const seen = new Map<number, number>(); for (let i = 0; i < n; i += MODEL_FLOATS) { const c = hex(out[i + 6], out[i + 7], out[i + 8]); seen.set(c, (seen.get(c) || 0) + 1); }
  return { seen, vertices: n / MODEL_FLOATS };
}
const creatureKinds = Object.keys(ACTOR_PRESENTATION).filter(k => ACTOR_PRESENTATION[k].action !== 'foundry' && modelSupported(k));

test('every emissive colour is an authored creature part, and never most of a body', () => {
  const E = CLOSE_VIEW_ACTOR_LOOK.emissive; assert.equal(new Set(E).size, E.length, 'no duplicates');
  assert.ok(E.length <= 24, 'a bounded shader loop');
  for (const c of E) {
    let used = false;
    for (const kind of creatureKinds) { const { seen, vertices } = colours(kind); const k = seen.get(c) || 0; if (!k) continue; used = true;
      assert.ok(k / vertices <= .62, `${kind}: ${c.toString(16)} lights ${(100 * k / vertices).toFixed(0)}% of its body`); }
    assert.ok(used, `${c.toString(16)} is used by a creature recipe`);
  }
  // The most common creatures each show something lit from within.
  for (const kind of ['ashling', 'ashenHound', 'glassMite', 'sparkWarden', 'cinderWisp', 'voidSentinel', 'pallidCrawler', 'graveLantern', 'gloomwisp'])
    assert.ok(E.some(c => colours(actorModelKey({ kind })).seen.has(c)), `${kind} has an emissive part`);
});

test('the model program carries the material: light floor, two rims, emissive loop, fog resistance', () => {
  const L = CLOSE_VIEW_ACTOR_LOOK;
  assert.ok(L.floor > .28 && L.floor < .5, 'brighter than the old .28 floor, still a dark place');
  assert.ok(L.glow > 0 && L.glow <= 1 && L.emitFog > 0 && L.emitFog < 1);
  assert.equal(L.rimCool.length, 3); assert.equal(L.rimWarm.length, 3);
  const src = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
  assert.match(src, /const vec3 EMIT\[\$\{CLOSE_VIEW_ACTOR_LOOK\.emissive\.length\}\]/);
  assert.match(src, /rim \* rim \* rim/);
  assert.match(src, /emit \* \(1\.0 - \$\{glf\(CLOSE_VIEW_ACTOR_LOOK\.emitFog\)\}\)/);
});
