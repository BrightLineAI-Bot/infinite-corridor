// Release 261 (Tim, 2026-10-21): world beasts are rarer, and after meeting one no new one appears until the Wayfarer has
// set foot in 8 sections they had never visited before (going back and forth over old ground does not count).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { generateRegion } from '../src/world.ts';
import { WORLD_BEASTS, WORLD_BEAST_IDS, ENCOUNTER, ensureBeastGap, noteSectionVisit, encounterReady, encounterMet, worldBeastFor, ensureWorldBeasts } from '../src/world-beasts.ts';
import { questingBeastFor } from '../src/questing-beast.ts';
import { Game } from '../src/game.ts';

test('the buffer is additive save state: a save without it starts ready; bad values are clamped', () => {
  const s = freshSave(); assert.equal(s.beastGap.fresh, ENCOUNTER.newSections); assert.equal(encounterReady(s), true);
  const old = freshSave(); delete old.beastGap; const m = migrateSave(JSON.parse(JSON.stringify(old))); assert.equal(m.beastGap.fresh, ENCOUNTER.newSections, 'older saves are not locked out');
  for (const [v, want] of [[-3, 0], [2.7, 2], [99, ENCOUNTER.newSections], ['x', ENCOUNTER.newSections]]) { const q = freshSave(); q.beastGap = { fresh: v, other: 1 }; ensureBeastGap(q); assert.equal(q.beastGap.fresh, want); assert.equal(q.beastGap.other, 1, 'unknown fields kept'); }
});

test('only first visits count; meeting a beast resets the count', () => {
  const s = freshSave(); encounterMet(s); assert.equal(encounterReady(s), false);
  noteSectionVisit(s, false); noteSectionVisit(s, false); assert.equal(s.beastGap.fresh, 0, 'old ground does not count');
  for (let i = 1; i < ENCOUNTER.newSections; i++) { noteSectionVisit(s, true); assert.equal(encounterReady(s), false); }
  noteSectionVisit(s, true); assert.equal(encounterReady(s), true);
});

test('no new world beast or Questing Beast is claimed inside the buffer; an encounter already met is unaffected', () => {
  const s = freshSave(); s.seed = 'PACE'; ensureWorldBeasts(s); s.questingBeast.cooldown = 0;
  for (const id of WORLD_BEAST_IDS) s.worldBeasts[id].cooldown = 0;
  // Force every roll to pass by scaling chance up, then show the buffer alone holds them back.
  const scale = ENCOUNTER.chanceScale; ENCOUNTER.chanceScale = 1e6;
  try {
    let claims = 0, rx = 9;
    for (let n = 0; n < 40; n++, rx++) { const m = generateRegion(s.seed, rx, 9); if (m.settlement) continue; noteSectionVisit(s, true);
      const qb = questingBeastFor(s, m, rx, 9), wb = worldBeastFor(s, m, rx, 9);
      if (qb || wb) { claims++; assert.equal(s.beastGap.fresh, 0, 'a meeting resets the buffer'); for (const id of WORLD_BEAST_IDS) if (s.worldBeasts[id].active?.rx === rx) { s.worldBeasts[id].active = null; } s.questingBeast.active = null; } }
    assert.ok(claims >= 2 && claims <= Math.ceil(40 / ENCOUNTER.newSections) + 1, `at most one meeting per ${ENCOUNTER.newSections} new sections (${claims})`);
    const k = freshSave(); k.seed = 'PACE'; ensureWorldBeasts(k); k.worldBeasts.tremorWorm.active = { rx: 3, ry: 3, tries: 1 }; encounterMet(k);
    const m = generateRegion(k.seed, 3, 3); assert.equal(worldBeastFor(k, m, 3, 3)?.worldBeast, 'tremorWorm', 'a beast already met is still there');
  } finally { ENCOUNTER.chanceScale = scale; }
});

test('chances are scaled down from each beast\'s own rate', () => {
  assert.ok(ENCOUNTER.chanceScale > 0 && ENCOUNTER.chanceScale < 1);
  const total = WORLD_BEAST_IDS.reduce((n, id) => n + WORLD_BEASTS[id].chance * ENCOUNTER.chanceScale, 0);
  assert.ok(total < .2, `combined per-section chance ${total.toFixed(3)}`);
});
