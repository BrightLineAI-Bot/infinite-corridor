// Spare gear (Tim, 2026-11-22: "We should just automatically salvage duplicates. There's no need to keep them."). A pack
// piece that a kept piece of the same kind matches or beats on every axis is salvaged by the hand's own salvage: on pickup,
// and once on load. Equipped, preset, sling, preset-tagged, awakened and refined gear is never touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, SPARE_GEAR, spareKind, spareCovers, spareGearPlan, salvageSpareGear, sweepSpareGearOnce, spareSalvageText, storeInventoryItem, salvageInventoryItems, EQUIPMENT_CAPACITY } from '../src/game.ts';
import { generateItem, itemTier } from '../src/items.ts';
import { SMITHY, setSalvageYield } from '../src/smithy.ts';

const clone = (o) => JSON.parse(JSON.stringify(o));
const compass = (id, over = {}) => ({ id, name: 'Quiet Compass', slot: 'charm', property: 'discovery', tier: 'relic', power: 35, basePower: 35, upgradeRank: 0, affixes: [{ id: 'movement', value: .05 }, { id: 'reach', value: .15 }], ...over });
const mantle = (id, over = {}) => ({ id, name: 'Kiln Mantle', slot: 'armor', property: 'guard', tier: 'relic', power: 35, basePower: 35, upgradeRank: 0, affixes: [{ id: 'ward', value: .04 }], glyphs: [null, null, null], ...over });
const ids = (s) => s.inventory.map((q) => q.id);
const spareIds = (s) => spareGearPlan(s).map((i) => s.inventory[i].id);
const bare = () => { const s: any = freshSave(); s.seed = 'SPARE'; s.inventory = []; s.equipment = { primary: null, secondary: null, armor: null, charm: null }; s.sling = []; return s; };

// A journey saved before spare gear, built from a trimmed fixture (the pack, equipped, preset and sling gear of a real save).
function fixtureJourney(file) {
  const f = JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8')), s: any = freshSave();
  s.seed = 'SPARE-FIXTURE'; Object.assign(s, { inventory: f.inventory, equipment: f.equipment, sling: f.sling, salvageYield: f.salvageYield, glyphDust: f.glyphDust, gearTagCounter: f.gearTagCounter });
  if (f.presetGear) s.presetGear = f.presetGear;
  f.presetGearTags.forEach((gear, i) => { if (gear && s.magicSkills.presets[i]) s.magicSkills.presets[i].build = { glyphs: {}, alt: {}, lattice: { passives: [], echoes: [] }, gear }; });
  Object.assign(s.materials, f.materials); delete s.spareGearSwept; // saved before the flag existed
  return migrateSave(clone(s));
}

test('the flag and the setting are additive at schema 14, and a fresh save’s flag never stands in for an old journey’s', () => {
  const s: any = freshSave(); assert.equal(s.spareGearSwept, SPARE_GEAR.version, 'a new journey has nothing to sweep'); assert.equal('keepDuplicateGear' in s, false, 'default off: spares are salvaged');
  const old: any = clone(s); delete old.spareGearSwept; old.keepDuplicateGear = 'yes';
  const m: any = migrateSave(old); assert.equal(m.version, 14); assert.equal('spareGearSwept' in m, false, 'an old journey is swept once'); assert.equal('keepDuplicateGear' in m, false, 'only true keeps duplicates');
  const kept: any = migrateSave({ ...clone(s), keepDuplicateGear: true, spareGearSwept: 1, someFutureField: 7 }); assert.equal(kept.keepDuplicateGear, true); assert.equal(kept.spareGearSwept, 1); assert.equal(kept.someFutureField, 7, 'unknown fields kept');
});

test('duplicate detection: same slot, name and property; a tie keeps the newer copy, as the full pack’s rule', () => {
  assert.equal(spareKind(compass('a')), spareKind(compass('b', { power: 9 }))); assert.notEqual(spareKind(compass('a')), spareKind(compass('b', { property: 'other' })));
  const s = bare(); s.inventory = [compass('old'), mantle('m'), compass('new'), compass('odd', { property: 'other' })];
  assert.deepEqual(spareIds(s), ['old'], 'one Quiet Compass stays; another kind or property is not a duplicate');
  s.inventory = [compass('a', { power: 30 }), compass('b', { power: 40 }), compass('c', { power: 35 })];
  assert.deepEqual(spareIds(s).sort(), ['a', 'c'], 'the best copy (power, then rank, then tier) is kept');
  assert.equal(spareCovers(compass('x'), compass('y')), true); assert.equal(spareCovers(compass('x'), mantle('y')), false);
});

test('keep rules: equipped, preset and sling gear are kept copies and are never salvaged', () => {
  const s = bare(); s.equipment.charm = compass('worn', { power: 50, upgradeRank: 10, masterwork: true, affixes: [{ id: 'movement', value: .1 }, { id: 'reach', value: .2 }] });
  s.inventory = [compass('spare'), compass('better', { power: 60 })];
  assert.deepEqual(spareIds(s), ['spare'], 'covered by the worn one; a stronger copy stays');
  const p = bare(); p.presetGear = [{ primary: { id: 'held', name: 'Iron Fists', slot: 'primary', property: 'brawler', tier: 'relic', power: 50, affixes: [{ id: 'attack', value: 9 }] }, secondary: null }, { primary: null, secondary: null }];
  p.inventory = [{ id: 'fist', name: 'Iron Fists', slot: 'primary', property: 'brawler', tier: 'rare', power: 20, affixes: [{ id: 'attack', value: 3 }] }];
  assert.deepEqual(spareIds(p), ['fist'], 'a preset’s held piece is a kept copy'); salvageSpareGear(p); assert.equal(p.presetGear[0].primary.id, 'held', 'and is untouched');
  const t = bare(); t.equipment.charm = compass('worn', { power: 99 }); t.inventory = [compass('tagged', { tag: 'gear-4' }), compass('stale', { tag: 'gear-5' })];
  t.magicSkills.presets[1].build = { glyphs: {}, alt: {}, lattice: { passives: [], echoes: [] }, gear: { primary: null, secondary: 'gear-4' } };
  assert.deepEqual(spareIds(t), ['stale'], 'a piece a preset’s build names by tag is never salvaged; a tag no preset names is not protection');
  const g = bare(); g.sling = [compass('slung', { power: 70 })]; g.inventory = [compass('pack')]; assert.deepEqual(spareIds(g), ['pack']); salvageSpareGear(g); assert.equal(g.sling.length, 1, 'the sling is untouched');
});

test('keep rules: glyphs, rank, tier, masterwork, sockets and affixes the kept copy lacks keep a piece', () => {
  const kept = mantle('kept', { power: 50, upgradeRank: 10, glyphs: ['still', null, null], affixes: [{ id: 'ward', value: .05 }] });
  const keeps = {
    glyph: mantle('glyph', { glyphs: ['chain', null, null] }),
    sockets: mantle('sockets', { glyphs: [null, null, null, null] }),
    extra: mantle('extra', { extraSockets: 1 }),
    master: mantle('master', { masterwork: true }),
    affixValue: mantle('affixValue', { affixes: [{ id: 'ward', value: .06 }] }),
    affixId: mantle('affixId', { affixes: [{ id: 'ward', value: .01 }, { id: 'reach', value: .01 }] }),
    rank: mantle('rank', { upgradeRank: 11, power: 30 }),
    tier: mantle('tier', { tier: 'relic', power: 20 }),
    awakened: mantle('awakened', { awakened: { resonance: 'afterimage', version: 1 } }),
    refined: mantle('refined', { refined: true }),
    unknown: mantle('unknown', { somethingNew: 1 }),
  };
  for (const [why, q] of Object.entries(keeps)) {
    const s = bare(); s.equipment.armor = why === 'tier' ? { ...kept, tier: 'epic' } : kept; s.inventory = [q];
    assert.deepEqual(spareIds(s), [], `${why}: kept`);
  }
  const s = bare(); s.equipment.armor = kept; s.inventory = [mantle('sameGlyph', { glyphs: ['still', null, null] }), mantle('plain')];
  assert.deepEqual(spareIds(s), ['sameGlyph', 'plain'], 'covered on every axis: both go');
  // A copy that another kept pack copy beats on every axis goes too, whichever the order read them.
  const d = bare(); d.inventory = [mantle('a', { affixes: [{ id: 'ward', value: .04 }] }), mantle('b', { affixes: [{ id: 'ward', value: .05 }] })];
  assert.deepEqual(spareIds(d), ['a']);
});

test('the payout is exactly the hand’s salvage, in either yield', () => {
  for (const mode of ['cinderIron', 'lumenDust']) {
    const s = bare(); setSalvageYield(s, mode); s.salvageYield.carry = .4;
    s.equipment.armor = mantle('worn', { power: 60, glyphs: ['still', 'chain', null] });
    s.inventory = [mantle('m1', { glyphs: ['still', null, null] }), mantle('m2', { tier: 'rare' }), compass('c1'), compass('c2', { tier: 'common', power: 3, affixes: [] }), mantle('m3', { tier: 'epic', glyphs: ['chain', null, null] })];
    const hand = clone(s), auto = clone(s), plan = spareGearPlan(s).map((i) => s.inventory[i].id);
    assert.equal(plan.length, 4);
    salvageInventoryItems(hand, hand.inventory.filter((q) => plan.includes(q.id)));
    const r = salvageSpareGear(auto);
    for (const k of ['materials', 'glyphDust', 'glyphs', 'salvageYield', 'inventory']) assert.deepEqual(auto[k], hand[k], `${mode}: ${k}`);
    assert.equal(r.count, 4);
    if (mode === 'cinderIron') assert.equal(r.iron, SMITHY.salvage.iron.relic + SMITHY.salvage.iron.rare + SMITHY.salvage.iron.common + SMITHY.salvage.iron.epic);
    assert.equal(auto.glyphs.still, (s.glyphs.still || 0) + 1, 'socketed glyphs come back, as by hand');
  }
});

test('the one-time cleanup on the 41-hour save: 63 pieces to 18, +180 cinder iron, nothing equipped, preset or unique lost; idempotent', () => {
  const s: any = fixtureJourney('spare-gear-41h.json'), before = clone(s);
  assert.equal(s.inventory.length, 63); assert.equal(s.inventory.filter((q) => q.name === 'Quiet Compass').length, 16);
  const g: any = new Game(s, 0);
  assert.equal(s.spareGearSwept, SPARE_GEAR.version); assert.equal(s.inventory.length, 18);
  assert.equal(s.materials.cinderIron - before.materials.cinderIron, 180, '45 relic pieces at 4 iron each');
  assert.match(g.message, /^Salvaged 45 spares \(Quiet Compass ×13, Kiln Mantle ×7, Glassweave Coat ×7, Rift Bombard ×5, 7 more kinds\): \+180 cinder iron\./);
  assert.deepEqual(s.equipment, before.equipment); assert.deepEqual(s.presetGear, before.presetGear); assert.deepEqual(s.sling, before.sling);
  for (const q of before.inventory.filter((q) => q.awakened || q.tag)) assert.ok(s.inventory.some((k) => k.id === q.id), `${q.name} ${q.tag || ''} kept`);
  const kinds = (inv) => new Set(inv.map(spareKind));
  for (const k of kinds(before.inventory)) assert.ok(kinds(s.inventory).has(k) || Object.values(s.equipment).some((q: any) => q && spareKind(q) === k) || s.presetGear.some((set) => Object.values(set).some((q: any) => q && spareKind(q) === k)) || s.sling.some((q) => spareKind(q) === k), `${k}: a copy is kept`);
  for (const q of before.inventory) if (!s.inventory.some((k) => k.id === q.id)) assert.ok([...Object.values(s.equipment), ...s.inventory, ...s.sling].some((k: any) => k && k !== q && spareCovers(k, q)), `${q.name} ${q.id} was covered`);
  assert.equal(sweepSpareGearOnce(s), null, 'runs once'); assert.deepEqual(spareGearPlan(s), [], 'and leaves no spares');
  const again: any = migrateSave(clone(s)), after = clone(again); new Game(again, 0); assert.deepEqual(again.inventory, after.inventory); assert.deepEqual(again.materials, after.materials);
});

test('the one-time cleanup on a simulated 10-hour save: 10 pieces to 5, idempotent; Keep duplicate gear leaves it waiting', () => {
  const s: any = fixtureJourney('spare-gear-sim-h10.json'), before = clone(s);
  new Game(s, 0);
  assert.deepEqual(s.inventory.map((q) => q.name).sort(), ['Iron Fists', 'Kiln Mantle', 'Lumen Spindle', 'Needle Caster', 'Quiet Compass']);
  assert.equal(s.materials.cinderIron - before.materials.cinderIron, 20); assert.deepEqual(s.equipment, before.equipment);
  const after = clone(s); new Game(s, 0); assert.deepEqual(s.inventory, after.inventory, 'idempotent');
  const k: any = fixtureJourney('spare-gear-sim-h10.json'); k.keepDuplicateGear = true; new Game(k, 0);
  assert.equal(k.inventory.length, 10); assert.equal('spareGearSwept' in k, false, 'the sweep waits until duplicates are no longer kept');
});

test('pickup: a spare drop is salvaged at once with one quiet line, merged while it is still the line shown', () => {
  const s: any = freshSave(); s.seed = 'SPARE-PICKUP'; s.inventory = []; const g: any = new Game(s, 0);
  const next = () => generateItem(`${s.seed}:test:${s.dropCounter}`, s.level, null);
  const beats = (q) => ({ ...q, id: `${q.id}-kept`, tier: 'relic', power: 999, upgradeRank: 99, masterwork: true, extraSockets: 9, glyphs: Array(9).fill(null), affixes: (q.affixes || []).map((a) => ({ ...a, value: 99 })) });
  const a = next(); s.sling = [beats(a)]; const iron = s.materials.cinderIron;
  g.obtainDrop('test');
  assert.equal(s.inventory.length, 0, 'not stored'); assert.equal(s.materials.cinderIron, iron + 1 + SMITHY.salvage.iron[itemTier(a)], 'the drop’s own iron plus the hand’s salvage');
  assert.equal(g.glyphNotice, `Salvaged a spare ${a.name}: +${SMITHY.salvage.iron[itemTier(a)]} cinder iron`);
  g.message = g.glyphNotice; g.glyphNotice = null; // shown (tickGlyphs)
  const b = next(); s.sling.push(beats(b)); g.obtainDrop('test');
  assert.equal(g.glyphNotice, spareSalvageText(s, { names: a.name === b.name ? { [a.name]: 2 } : { [a.name]: 1, [b.name]: 1 }, iron: SMITHY.salvage.iron[itemTier(a)] + SMITHY.salvage.iron[itemTier(b)], lumenDust: 0 }));
  assert.match(g.glyphNotice, /^Salvaged 2 spares/);
  g.message = 'Something else was said.'; g.glyphNotice = null; const c = next(); s.sling.push(beats(c)); g.obtainDrop('test');
  assert.match(g.glyphNotice, /^Salvaged a spare /, 'a new run starts once another line was shown');
  g.glyphNotice = 'Ember glyph recovered.'; const d = next(); s.sling.push(beats(d)); g.obtainDrop('test'); assert.equal(g.glyphNotice, 'Ember glyph recovered.', 'quiet: a louder notice keeps its place');
});

test('pickup: a better drop is kept beside older copies, which make room only in a full pack; purchases and Keep duplicate gear keep everything', () => {
  const s = bare(); s.inventory = [compass('old', { power: 20 }), mantle('m')];
  const r: any = storeInventoryItem(s, compass('new', { power: 40 }));
  assert.equal(r.stored, true); assert.equal(r.salvaged, null); assert.deepEqual(ids(s), ['old', 'm', 'new'], 'only the drop is judged on pickup');
  const r3: any = storeInventoryItem(s, compass('weak', { power: 5 })); assert.equal(r3.stored, false); assert.equal(r3.salvaged.id, 'weak'); assert.equal(r3.spare.length, 1); assert.deepEqual(ids(s), ['old', 'm', 'new']);
  const r2: any = storeInventoryItem(s, compass('same', { power: 40 })); assert.equal(r2.stored, true, 'an equal copy is not salvaged on arrival: the older is the spare at a tie');
  storeInventoryItem(s, compass('bought', { power: 1 }), true); assert.equal(ids(s).at(-1), 'bought', 'a purchase is kept');
  s.keepDuplicateGear = true; storeInventoryItem(s, compass('kept', { power: 1 })); assert.equal(ids(s).at(-1), 'kept');
  const f = bare(); f.inventory = [compass('older', { power: 20 }), ...Array.from({ length: EQUIPMENT_CAPACITY - 1 }, (_, i) => mantle(`m${i}`, { power: 1 + i, affixes: [{ id: 'ward', value: i }] }))];
  const full: any = storeInventoryItem(f, compass('newer', { power: 40 }));
  assert.equal(full.stored, true); assert.equal(full.salvaged.id, 'older', 'the copy the drop makes spare makes room, not the weakest mantle'); assert.equal(full.spare.length, 1); assert.equal(f.inventory.length, EQUIPMENT_CAPACITY);
});

test('exact resume: the swept pack, its payout and the flag survive a save and reload unchanged', () => {
  const s: any = fixtureJourney('spare-gear-41h.json'), g: any = new Game(s, 0);
  const snap = clone(g.exportSnapshot(1000)), back: any = migrateSave(clone(snap)), r: any = new Game(back, 1000);
  assert.equal(back.spareGearSwept, SPARE_GEAR.version); assert.deepEqual(back.inventory, snap.inventory); assert.deepEqual(back.materials, snap.materials);
  assert.equal(back.inventory.length, 18); assert.equal(r.message, snap.session.message, 'no second sweep, no second line');
});
