// Release 319: the dungeon ladder (src/dungeon-ladder.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNGEON_LADDER, ladderRate, ladderRoll, crossingLadder, ladderGuardian } from '../src/dungeon-ladder.ts';
import { generateExpeditionDungeon, THEME_POOLS } from '../src/underlands.ts';
import { GUARDIAN_POOL } from '../src/monster-pack.ts';
import { generateDungeon, deepDungeonId } from '../src/world.ts';
import { rollHorde, HORDE } from '../src/revenant-horde.ts';
import { Game, generatePinnedDungeon } from '../src/game.ts';
import { dungeonHistory } from '../src/interactions.ts';
import { freshSave } from '../src/types.ts';

const kinds = Object.keys(DUNGEON_LADDER.unlock);
const ids = (n, tag = 'x') => Array.from({ length: n }, (_, i) => `dungeon:L:g1:${i}:7:${tag}`);

test('rates: nothing below its tier, half on its tier, 80% at Infinite II, everything at Infinite III', () => {
  for (const k of kinds) {
    const u = DUNGEON_LADDER.unlock[k];
    assert.equal(ladderRate(k, 13), 1); assert.equal(ladderRate(k, 20), 1);
    if (u > 0) assert.equal(ladderRate(k, u - 1), 0);
    if (u < 12) { assert.equal(ladderRate(k, u), .5); assert.ok(Math.abs(ladderRate(k, 12) - .8) < 1e-9); }
    for (let t = u; t < 13; t++) assert.ok(ladderRate(k, t + 1) >= ladderRate(k, t), `${k} climbs`);
  }
});

test('tiers 0-1 are the base game: no tastes, only the rare large quiet crossing', () => {
  for (const t of [0, 1]) for (const id of ids(400)) for (const k of kinds) {
    const r = ladderRoll('L', id, k, t);
    if (k === 'large') assert.ok(r === null || r === 'quiet'); else assert.equal(r, null, `${k} at tier ${t}`);
  }
  const quiet = ids(400).filter((id) => ladderRoll('L', id, 'large', 0) === 'quiet').length;
  assert.ok(quiet > 60 && quiet < 140, `about a quarter keep their large size (${quiet}/400)`);
});

test('from Open (tier 2) a locked kind is a rare taste; a kind only ever opens up as the tier climbs', () => {
  const tastes = ids(1000).filter((id) => ladderRoll('L', id, 'horde', 2) === 'taste').length;
  assert.ok(tastes > 200 && tastes < 300, `a quarter (${tastes}/1000)`);
  for (const k of kinds) for (const id of ids(200)) {
    let was = false;
    for (let t = DUNGEON_LADDER.unlock[k]; t <= 13; t++) { const now = ladderRoll('L', id, k, t) === 'full'; assert.ok(!was || now, `${k} ${id} closed at tier ${t}`); was = now; }
    assert.equal(ladderRoll('L', id, k, 13), 'full');
  }
});

test('the generator: at tier 0 no daises, no newer environments, and a large crossing stays quiet', () => {
  let quiet = 0, large = 0;
  for (const id of ids(300, 'gen')) {
    const lad = crossingLadder('L', id, 0), m = generateExpeditionDungeon('L', id, 'hollow', { layoutPool: 5, themePool: 3, ladder: lad });
    assert.ok(!m.warpDaises, id);
    if (m.theme) assert.ok(THEME_POOLS[1].ids.includes(m.theme), `${id}: ${m.theme}`);
    if (m.sizeProfile === 'extended') { large++; assert.equal(lad.large, 'quiet'); assert.ok(!m.theme); if (m.diagnostic.quiet) quiet++; }
  }
  assert.ok(large > 0 && large === quiet, `large quiet crossings exist at tier 0 (${large})`);
});

test('at Infinite III a new crossing is exactly what it would have been before the ladder', () => {
  for (const id of ids(60, 'same')) {
    const a = generateExpeditionDungeon('L', id, 'kiln', { layoutPool: 5, themePool: 3 }), b = generateExpeditionDungeon('L', id, 'kiln', { layoutPool: 5, themePool: 3, ladder: crossingLadder('L', id, 13) });
    assert.equal(b.sizeProfile, a.sizeProfile); assert.equal(b.theme, a.theme); assert.equal(!!b.warpDaises, !!a.warpDaises); assert.equal(b.tiles.length, a.tiles.length);
  }
});

test('guardians: the first five at first, ten from Resonant, all sixteen from tier 6', () => {
  const seen = (t) => new Set(ids(800, 'g').map((id) => ladderGuardian('L', id, t, GUARDIAN_POOL[Number(id.split(':')[3]) % 16], GUARDIAN_POOL)));
  for (const k of seen(0)) assert.ok(GUARDIAN_POOL.indexOf(k) < 5, k);
  assert.equal(seen(6).size, 16);
  assert.ok([...seen(2)].some((k) => GUARDIAN_POOL.indexOf(k) >= 5), 'a taste of the later ones from Open');
});

test('a fresh crossing records the tier it was found at; older histories keep their rules', () => {
  const s = freshSave(); s.seed = 'L'; const id = 'dungeon:L:g1:3:4:a';
  generatePinnedDungeon(s, id); assert.deepEqual(s.consequences.dungeons[id].ladder, { version: 1, tier: 0 });
  assert.equal(s.consequences.dungeons[id].mire, false, 'no Poison Crypt at tier 0');
  const old = 'dungeon:L:g1:3:4:old', h = dungeonHistory(s, old); h.generatorVersion = 5; h.layoutPool = 5; generatePinnedDungeon(s, old); assert.equal(h.ladder, undefined);
});

test('a Threefold Deep taste wakes one wing, and its warden alone opens the final gate', () => {
  const id = deepDungeonId('L'), full = generateDungeon('L', id, {}), taste = generateDungeon('L', id, { wings: 1 });
  assert.equal(full.wings.length, 3); assert.equal(taste.wings.length, 1);
  assert.equal(taste.finalGate.requires.length, 1); assert.equal(taste.finalGate.requires[0], taste.wings[0].minibossId);
  assert.equal(taste.enemySpawns.filter((e) => e.dungeonRole === 'wingMiniboss').length, 1);
});

test('hordes: none when the ladder says no, a smaller one as a taste', () => {
  const s = freshSave(); s.seed = 'H';
  const id = ids(4000, 'h').map((q) => q.replace(':L:', ':H:')).find((q) => rollHorde(s, q, {}, 'full'));
  assert.ok(id);
  assert.equal(rollHorde(s, id, {}, null), null);
  const t = rollHorde(s, id, {}, 'taste'); assert.ok(t.total >= HORDE.tasteTotal[0] && t.total <= HORDE.tasteTotal[1], `${t.total}`);
  const f = rollHorde(s, id, {}); assert.ok(f.total >= HORDE.total[0], 'no ladder keeps the old horde');
});

test('deep and arena entrances always open (release 323); below their tier, as a taste', () => {
  const s = freshSave(); s.seed = 'E'; const g = new Game(s, 0);
  const o = { kind: 'dungeon', dungeonType: 'deep-v1', dungeonId: 'dungeon:E:g1:5:5:deep-v1' };
  g.openEntrance(o); assert.deepEqual(s.consequences.dungeons[o.dungeonId].ladder, { version: 1, tier: 0, rung: 'taste' });
  s.perception.aperture = 3255; g.openEntrance(o); assert.equal(s.consequences.dungeons[o.dungeonId].ladder.rung, 'taste', 'decided once');
  const m = generatePinnedDungeon(s, o.dungeonId); assert.equal(m.wings.length, 1, 'a taste of the Deep');
  const a = { kind: 'arenaEntrance', dungeonId: 'arena:v1:E:9,0', arenaId: 'arena:v1:E:9,0' };
  g.openEntrance(a); assert.deepEqual(s.consequences.dungeons[a.dungeonId].ladder, { version: 1, tier: 13, rung: 'full' });
  const late = { kind: 'dungeon', dungeonType: 'deep-v2', dungeonId: 'dungeon:E:g1:6:6:deep-v2:loop' }; s.perception.aperture = 0;
  for (let i = 0; i < 30; i++) { const q = { ...late, dungeonId: late.dungeonId + i }; g.openEntrance(q); assert.ok(s.consequences.dungeons[q.dungeonId].ladder.rung, 'never sealed'); }
});
