// Release 415 (docs/narrative-bible.md section 7, step 6): Ilse the Lamplighter, five meetings out of order, the last in the
// Far Sleep after three earlier ones; each spoken once and remembered additively in save.lore.ilse.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { ILSE, ILSE_MEETINGS, ilseMet, ilseMeetingAt, addIlse, meetIlse } from '../src/ilse.ts';

const save = (seed = 'ILSE415') => { const s = freshSave(); s.seed = seed; return s; };
const W = 32;
const map = () => ({ width: W, height: W, objects: [], tiles: Array.from({ length: W * W }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: 'grass', blocked: false })) });
// Sections (in a fixed scan) where this seed offers a meeting.
const offered = (s, far = false, n = 400) => { const out = []; for (let rx = -20; rx <= 20 && out.length < n; rx++) for (let ry = -20; ry <= 20; ry++) { const m = ilseMeetingAt(s, rx, ry, far); if (m) out.push([rx, ry, m]); } return out; };

test('five original meetings across her life', () => {
  assert.deepEqual(Object.keys(ILSE_MEETINGS), ['1', '2', '3', '4', '5']);
  assert.deepEqual(Object.values(ILSE_MEETINGS).map((m) => m.age), ['child', 'young', 'woman', 'old', 'child']);
  for (const m of Object.values(ILSE_MEETINGS)) assert.ok(m.lines.length >= 3);
});

test('rare, seeded, and never close to Ember Refuge', () => {
  const s = save(), list = offered(s), all = 41 * 41;
  assert.ok(list.length > 0 && list.length < all * .1, `rare: ${list.length} of ${all}`);
  for (const [rx, ry] of list) assert.ok(Math.abs(rx) + Math.abs(ry) >= ILSE.minDepth);
  assert.deepEqual(offered(save()), list, 'deterministic for a seed');
  assert.ok(list.every(([, , m]) => m >= 1 && m <= 4), 'the waking world deals meetings 1 to 4');
});

test('the Far Sleep meeting waits for three earlier ones, then ends her story', () => {
  const s = save();
  assert.equal(offered(s, true).length, 0);
  s.lore.ilse = '12'; assert.equal(offered(s, true).length, 0);
  s.lore.ilse = '124'; const far = offered(s, true); assert.ok(far.length > 0 && far.every(([, , m]) => m === 5));
  assert.ok(offered(s).every(([, , m]) => m === 3), 'only the meeting not yet had is dealt');
  s.lore.ilse = '1245'; assert.equal(offered(s).length + offered(s, true).length, 0, 'after the last meeting she is not met again');
});

test('placing and meeting her: spoken once, remembered, survives migration', () => {
  const s = save(), [rx, ry, stage] = offered(s)[0], m = map();
  const o = addIlse(m, s, rx, ry); assert.equal(o.kind, 'ilse'); assert.equal(o.stage, stage); assert.deepEqual(o.actions, ['speak']);
  assert.equal(addIlse(m, s, rx, ry), null, 'once per section');
  assert.equal(addIlse({ ...map(), settlement: true }, s, rx, ry), null, 'never in a settlement');
  const a = meetIlse(s, o); assert.ok(a.ok && a.first); assert.equal(ilseMet(s), String(stage));
  const b = meetIlse(s, o); assert.ok(b.ok && !b.first); assert.equal(ilseMet(s), String(stage));
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(ilseMet(back), String(stage));
  assert.equal(ilseMet({ lore: { ilse: '9x31' } }), '13', 'junk is dropped');
});

test('wired into the overworld, the interaction, the renderer and the build', () => {
  const game = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), render = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(game, /addIlse\(this\.map,this\.save,this\.rx,this\.ry,!!farSleepSection\(this\.rx,this\.ry\)\)/);
  assert.match(game, /o\.kind === "ilse"\) \{ const r = meetIlse/);
  assert.match(render, /o\.kind === "ilse"\) \{ drawIlse/);
  assert.match(readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8'), /'ilse'/);
  for (const sw of ['../sw.js', '../proving-ground/sw.js']) assert.match(readFileSync(new URL(sw, import.meta.url), 'utf8'), /src\/ilse\.js\?v=/);
});
