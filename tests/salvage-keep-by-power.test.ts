// 2026-11-18 (Tim: auto-salvage kept a weaker piece and salvaged a stronger one of the same tier): a full pack keeps by
// rarity tier first, then by power (the Power the Pack shows), then the smith's work power does not show, then the oldest
// goes. Unowned brawler gear is never salvaged for room; equipped gear is never in the pack and never touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { storeInventoryItem, packVictim, packKeepCompare, PACK_KEEP, EQUIPMENT_CAPACITY, BRAWLER_GEAR } from '../src/game.ts';

const piece = (id, tier, power, extra = {}) => ({ id, name: `Blade ${id}`, slot: 'primary', property: 'steady', power, basePower: power, upgradeRank: 0, tier, affixes: [], ...extra });
const full = (make) => { const s = freshSave(); s.inventory = Array.from({ length: EQUIPMENT_CAPACITY }, (_, i) => make(i)); return s; };

test('the keep order is tier, then power, then worked-on, then the oldest', () => {
  assert.deepEqual([...PACK_KEEP.order], ['tier', 'power', 'worked']);
  assert.ok(packKeepCompare(piece('a', 'rare', 1), piece('b', 'common', 99)) > 0, 'a rare outranks any common');
  assert.ok(packKeepCompare(piece('a', 'epic', 10), piece('b', 'epic', 14)) < 0, 'within a tier, the weaker goes first');
  assert.ok(packKeepCompare(piece('a', 'epic', 10, { masterwork: true }), piece('b', 'epic', 10)) > 0, 'equal power: a masterwork is kept');
  assert.ok(packKeepCompare(piece('a', 'epic', 10, { extraSockets: 1 }), piece('b', 'epic', 10)) > 0, 'equal power: an added socket is kept');
  assert.equal(packKeepCompare(piece('a', 'epic', 10), piece('b', 'epic', 10)), 0);
});

test('the reported case: a stronger same-tier piece is kept over an older weaker one', () => {
  // Every piece is relic; the oldest (index 0) is the strongest, index 5 the weakest.
  const s = full((i) => piece(`p${i}`, 'relic', i === 5 ? 20 : i === 0 ? 60 : 40));
  assert.equal(packVictim(s), 5, 'the weakest relic goes, not the oldest');
  const r = storeInventoryItem(s, piece('new', 'relic', 45));
  assert.equal(r.stored, true); assert.equal(r.salvaged.id, 'p5');
  assert.ok(s.inventory.some((q) => q.id === 'p0'), 'the oldest, strongest relic stays');
  assert.equal(s.inventory.at(-1).id, 'new'); assert.equal(s.inventory.length, EQUIPMENT_CAPACITY);
});

test('a new drop weaker than everything of its tier is salvaged on arrival; a stronger one takes the weakest place', () => {
  const s = full((i) => piece(`p${i}`, 'epic', 30 + i));
  const weak = storeInventoryItem(s, piece('weak', 'epic', 10));
  assert.equal(weak.stored, false); assert.equal(weak.salvaged.id, 'weak');
  const strong = storeInventoryItem(s, piece('strong', 'epic', 31));
  assert.equal(strong.stored, true); assert.equal(strong.salvaged.id, 'p0');
});

test('a lower-tier drop is salvaged even when its power is higher', () => {
  const s = full((i) => piece(`p${i}`, 'rare', 5));
  const r = storeInventoryItem(s, piece('low', 'common', 50));
  assert.equal(r.stored, false); assert.equal(r.salvaged.id, 'low');
  assert.ok(s.inventory.every((q) => q.tier === 'rare'));
});

test('upgrade ranks count through power; equal power falls back to the work done, then age', () => {
  const s = full((i) => piece(`p${i}`, 'epic', 20));
  s.inventory[0] = { ...piece('upgraded', 'epic', 20, { basePower: 17, upgradeRank: 3 }) };
  assert.equal(packVictim(s), 1, 'at equal power the plain oldest goes before the worked piece');
  s.inventory[1] = piece('weaker-but-masterwork', 'epic', 15, { masterwork: true });
  assert.equal(packVictim(s), 1, 'power outranks the masterwork tiebreak');
});

test('unowned brawler gear is never salvaged to make room, and equipped gear is untouched', () => {
  const s = full((i) => piece(`p${i}`, 'relic', 90));
  const hammer = { ...BRAWLER_GEAR.find((g) => g.item.name === 'Hammerfall').item, id: 'h1', power: 1, tier: 'common' };
  const equipped = structuredClone(s.equipment);
  const r = storeInventoryItem(s, hammer);
  assert.equal(r.stored, true); assert.ok(s.inventory.some((q) => q.id === 'h1'));
  assert.equal(r.salvaged.id, 'p0', 'a relic made room for it, though it is a weak common');
  assert.deepEqual(s.equipment, equipped, 'equipment is never salvaged');
});
