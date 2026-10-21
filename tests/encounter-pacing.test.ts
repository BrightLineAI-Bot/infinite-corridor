// Release 261 (Tim, 2026-10-21): world beasts are rarer, and after meeting one no new one appears until the Wayfarer has
// set foot in 8 sections they had never visited before (going back and forth over old ground does not count).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { generateRegion } from '../src/world.ts';
import { WORLD_BEASTS, WORLD_BEAST_IDS, ENCOUNTER, ensureBeastGap, noteSectionVisit, encounterReady, encounterMet, worldBeastFor, ensureWorldBeasts, placementRegions } from '../src/world-beasts.ts';
import { questingBeastFor, QB_SEA } from '../src/questing-beast.ts';
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

// A 32x32 section: open sea all round, with land drawn by `land(x, y)`.
function sectionOf(land) { return { tiles: Array.from({ length: 1024 }, (_, i) => { const x = i % 32, y = Math.floor(i / 32), l = land(x, y); return { x, y, kind: l ? 'grass' : 'ocean', blocked: !l }; }) }; }

test('placement: a land beast never stands on a small island or anywhere it could not retreat from; marine beasts may hold the sea', () => {
  const island = sectionOf((x, y) => x >= 13 && x <= 18 && y >= 13 && y <= 18); // 36 tiles, cut off by the sea
  const coast = sectionOf((x, y) => x <= 20); // a mainland reaching the west edge
  for (const id of ['morphingBlob', 'tremorWorm']) { // they walk or burrow home: the sea traps them
    assert.equal(placementRegions(island, id).ok[15 * 32 + 15], 0, `${id}: not on a small island`);
    assert.equal(placementRegions(coast, id).ok[15 * 32 + 10], 1, `${id}: fine on the mainland`);
  }
  for (const id of ['mountainTurtle', 'nanobotKnight']) assert.equal(placementRegions(island, id).ok[15 * 32 + 15], 1, `${id} retreats through anything, water included`);
  assert.equal(placementRegions(island, 'psychicCrystal').ok[15 * 32 + 15], 1, 'a marine beast can leave over the water');
  const small = sectionOf((x, y) => x <= 4 && y >= 10 && y <= 20); // touches the edge but only 55 tiles
  assert.equal(placementRegions(small, 'morphingBlob').ok[15 * 32 + 2], 0, 'too small for a big beast');
  assert.equal(placementRegions(small, 'nanobotKnight').ok[15 * 32 + 2], 1, 'room enough for a smaller one');
  // In the game: a fresh claim on an island section does not hold; a beast already met keeps its ground.
  const s = freshSave(); s.seed = 'ISLE'; ensureWorldBeasts(s); for (const id of WORLD_BEAST_IDS) s.worldBeasts[id].cooldown = id === 'morphingBlob' ? 0 : 999; s.questingBeast.cooldown = 999;
  const scale = ENCOUNTER.chanceScale; ENCOUNTER.chanceScale = 1e6;
  try {
    assert.equal(worldBeastFor(s, island, 9, 9), null, 'no Blob on the island'); assert.equal(s.worldBeasts.morphingBlob.active, null); assert.equal(encounterReady(s), true, 'nothing was met');
    s.worldBeasts.morphingBlob.active = { rx: 9, ry: 9, tries: 1 }; assert.equal(worldBeastFor(s, island, 9, 9)?.worldBeast, 'morphingBlob', 'a Blob already met there stays');
  } finally { ENCOUNTER.chanceScale = scale; }
});

test('the Questing Beast never claims a section that is nearly all ocean, and is much rarer over water', () => {
  assert.ok(QB_SEA.none <= .95 && QB_SEA.wateryChance < .5);
  const s = freshSave(); s.seed = 'QB-SEA'; ensureWorldBeasts(s); s.questingBeast.cooldown = 0;
  const scale = ENCOUNTER.chanceScale; ENCOUNTER.chanceScale = 1e6;
  try {
    assert.equal(questingBeastFor(s, sectionOf((x) => x === 0), 9, 9), null, 'nearly all ocean');
    assert.ok(questingBeastFor(s, sectionOf((x) => x <= 20), 9, 9), 'on land it still comes');
  } finally { ENCOUNTER.chanceScale = scale; }
});
