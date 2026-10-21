// Release 273 (Tim, 2026-10-21): world beasts are met only from their Aperture tier; a horde gives four Crossing Sigils.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { APERTURE_THRESHOLDS } from '../src/world.ts';
import { BEAST_APERTURE, beastUnlocked, worldBeastFor, ensureWorldBeasts, WORLD_BEAST_IDS } from '../src/world-beasts.ts';
import { questingBeastFor } from '../src/questing-beast.ts';
import { HORDE, hordeKill } from '../src/revenant-horde.ts';

const atTier = (s, t) => { s.perception.aperture = t ? APERTURE_THRESHOLDS[t - 1] : 0; return s; };
const open = () => ({ width: 32, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'floor', blocked: false })), objects: [] });

test('each world beast and the Questing Beast opens at its Aperture tier', () => {
  assert.deepEqual(BEAST_APERTURE, { mountainTurtle: 3, voidWalker: 3, psychicCrystal: 3, morphingBlob: 4, lightningGiant: 5, astralWorm: 6, nanobotKnight: 7, tremorWorm: 7, questingBeast: 8 });
  for (const id of [...WORLD_BEAST_IDS, 'questingBeast']) {
    const need = BEAST_APERTURE[id]; assert.ok(need >= 3, id);
    assert.equal(beastUnlocked(atTier(freshSave(), need - 1), id), false, `${id} below its tier`);
    assert.equal(beastUnlocked(atTier(freshSave(), need), id), true, `${id} at its tier`);
  }
});

test('below a beast\'s tier no new meeting is claimed, and a beast already met is not withdrawn', () => {
  const tryAll = (s) => { for (let rx = 6; rx < 400; rx++) { const m = worldBeastFor(s, open(), rx, 6); if (m) return m; } return null; };
  const low = atTier(freshSave(), 2); low.seed = 'APERTURE'; ensureWorldBeasts(low);
  assert.equal(tryAll(low), null, 'tier 2: no world beast at all');
  const t3 = atTier(freshSave(), 3); t3.seed = 'APERTURE'; ensureWorldBeasts(t3);
  const met = tryAll(t3); assert.ok(met); assert.ok(BEAST_APERTURE[met.worldBeast] <= 3, `${met.worldBeast} opens by tier 3`);
  const held = atTier(freshSave(), 0); ensureWorldBeasts(held); held.worldBeasts.morphingBlob.active = { rx: 9, ry: 9, tries: 1 };
  assert.equal(worldBeastFor(held, open(), 9, 9)?.worldBeast, 'morphingBlob', 'a beast already met keeps its ground');
  for (const [tier, want] of [[7, null]]) { const q = atTier(freshSave(), tier); q.seed = 'APERTURE-QB'; let qb = null; for (let rx = 6; rx < 600 && !qb; rx++) qb = questingBeastFor(q, open(), rx, 6); assert.equal(qb, want, 'no Questing Beast below tier 8'); }
});

test('a horde gives a Crossing Sigil at the end of each of its four waves', () => {
  const s = freshSave(), h = { horde: { total: 30, left: 30 } }; let sigils = 0, at = [];
  for (let k = 1; k <= 30; k++) { const r = hordeKill(s, h); if (r?.sigils) { sigils += r.sigils; at.push(k); } }
  assert.equal(HORDE.sigils, 4); assert.equal(sigils, 4); assert.deepEqual(at, [8, 15, 23, 30]);
});
