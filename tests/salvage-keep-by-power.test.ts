// 2026-11-18 (Tim: auto-salvage kept a weaker piece and salvaged a stronger one of the same tier): a full pack keeps by
// rarity tier first, then by power (the Power the Pack shows), then the smith's work power does not show, then the oldest
// goes. Unowned brawler gear is never salvaged for room; equipped gear is never in the pack and never touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { storeInventoryItem, packVictim, packKeepCompare, PACK_KEEP, EQUIPMENT_CAPACITY, BRAWLER_GEAR } from '../src/game.ts';

const piece = (id, tier, power, extra = {}) => ({ id, name: `Blade ${id}`, slot: 'primary', property: 'steady', power, basePower: power, upgradeRank: 0, tier, affixes: [], ...extra });
// Spare gear (2026-11-22, game.ts SPARE_GEAR): these packs are piles of one kind per slot, so they keep duplicates to weigh the
// full pack's own rule (PACK_KEEP) alone; tests/spare-gear.test.ts covers spare salvage.
const full = (make) => { const s = freshSave(); s.keepDuplicateGear = true; s.inventory = Array.from({ length: EQUIPMENT_CAPACITY }, (_, i) => make(i)); return s; };

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

// 2026-11-18 (Tim: "keep the best few of each slot"): slots are never weighed against each other.
const kind = (slot) => ({ primary: ['Cinder Pike', 'reach'], secondary: ['Needle Caster', 'quick'], armor: ['Kiln Mantle', 'guard'], charm: ['Quiet Compass', 'discovery'] })[slot];
const gearOf = (id, slot, tier, power) => { const [name, property] = kind(slot); return { ...piece(id, tier, power), name, property, slot }; };

test('the table names the slots, the few kept per slot and the slot tiebreak', () => {
  assert.deepEqual([...PACK_KEEP.slots], ['primary', 'secondary', 'armor', 'charm']);
  assert.ok(Number.isInteger(PACK_KEEP.few) && PACK_KEEP.few > 0 && PACK_KEEP.few * PACK_KEEP.slots.length <= EQUIPMENT_CAPACITY);
  assert.equal(PACK_KEEP.slotTie, 'weakest');
});

test('a high-power charm pile no longer outlasts the only weapon: the most crowded slot gives up its weakest', () => {
  const s = full((i) => (i === 0 ? gearOf('only-weapon', 'primary', 'common', 1) : gearOf(`c${i}`, 'charm', 'relic', 80 + i)));
  assert.equal(packVictim(s), 1, 'the weakest charm goes, not the weak lone weapon');
  const r = storeInventoryItem(s, gearOf('charm-new', 'charm', 'relic', 200));
  assert.equal(r.salvaged.id, 'c1'); assert.ok(s.inventory.some((q) => q.id === 'only-weapon'));
  const w = storeInventoryItem(s, gearOf('weapon-2', 'primary', 'common', 1));
  assert.equal(w.stored, true, 'a weak weapon still joins a pack crowded with charms'); assert.notEqual(w.salvaged.slot, 'primary');
});

test('a slot holding the few or fewer is never chosen while another holds more; slots at an equal count give up the weaker', () => {
  const few = PACK_KEEP.few, s = full((i) => i < few ? gearOf(`w${i}`, 'primary', 'common', 1) : gearOf(`a${i}`, 'armor', 'relic', 99));
  assert.equal(s.inventory[packVictim(s)].slot, 'armor', 'the weapons (exactly the few) are safe');
  const half = EQUIPMENT_CAPACITY / 2, t = full((i) => i < half ? gearOf(`w${i}`, 'primary', 'epic', 30) : gearOf(`a${i}`, 'armor', 'epic', 20));
  assert.equal(t.inventory[packVictim(t)].id, `a${half}`, 'equal counts: the slot whose weakest is weaker');
  const u = full((i) => i < half ? gearOf(`w${i}`, 'primary', 'epic', 20) : gearOf(`a${i}`, 'armor', 'epic', 20));
  assert.equal(u.inventory[packVictim(u)].id, 'w0', 'a full tie: the earlier slot in PACK_KEEP.slots');
});

test('a drop into the most crowded slot below its weakest is salvaged; a drop into a thin slot is kept', () => {
  const s = full((i) => i < 50 ? gearOf(`t${i}`, 'secondary', 'relic', 50) : gearOf(`p${i}`, 'primary', 'relic', 60));
  const low = storeInventoryItem(s, gearOf('low-tool', 'secondary', 'rare', 5)); assert.equal(low.stored, false);
  const thin = storeInventoryItem(s, gearOf('low-weapon', 'primary', 'rare', 5)); assert.equal(thin.stored, true); assert.equal(thin.salvaged.slot, 'secondary');
  const bought = storeInventoryItem(s, gearOf('bought-tool', 'secondary', 'common', 1), true); assert.equal(bought.stored, true, 'a purchase is kept'); assert.notEqual(bought.salvaged.id, 'bought-tool');
});
