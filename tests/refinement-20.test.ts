// Refinement (Tim, 2026-11-18: "If you get past 1000, you can unlock the secondary upgrade feature, which lets you upgrade your
// weapons and armor to +20... Divine Viscera will be the currency for these upgrades instead of armor/weapon spheres"). Unlocked
// the first time the Wayfarer enters a town 1,000 or more sections out (straight line); every piece, any rarity, then reaches
// +20; ranks above the normal cap cost Divine Viscera from items.ts REFINEMENT.viscera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, forgePreview, forgeOutcome, gearReadout, storeInventoryItem, packVictim, EQUIPMENT_CAPACITY } from '../src/game.ts';
import { REFINEMENT, ensureRefinement, refinementOpen, unlockRefinement, refinementGround, upgradeLimit, upgradeCost, upgradeEquipment, upgradedItem, refineCost, itemCap, normalizeItemUpgrade, UPGRADE_CAPS, LATE_UPGRADE, APERTURE_BANDS, ITEM_TIERS } from '../src/items.ts';
import { FAR_REALMS } from '../src/far-realms.ts';
import { hamletSection } from '../src/settlements.ts';

const piece = (slot, tier, extra = {}) => normalizeItemUpgrade({ id: `${slot}-${tier}`, name: slot === 'primary' ? 'Salvage Blade' : slot === 'secondary' ? 'Hammerfall' : slot === 'armor' ? 'Plate' : 'Charm', slot, property: slot === 'secondary' ? 'brawler' : 'steady', power: 10, basePower: 10, upgradeRank: 0, tier, affixes: [], ...extra });
const unlocked = (s = freshSave()) => { s.seed = 'refine'; unlockRefinement(s, 1000, 0, 'Farwick'); return s; };
const lateOpen = (s) => { s.perception = { ...(s.perception || {}), aperture: APERTURE_BANDS[LATE_UPGRADE.tier].threshold }; s.farArray = { ...(s.farArray || {}), gate: LATE_UPGRADE.gates + 1 }; return s; };
const viscera = (s, n) => { s.skylands = { ...(s.skylands || {}), viscera: n }; return s; };

test('the cost table: ranks 4..20 listed, rising, and the +11..+20 total', () => {
  assert.equal(REFINEMENT.max, 20);
  assert.equal(REFINEMENT.distance, FAR_REALMS.start, 'the same measure the far realms and far threads use');
  for (let r = 4; r <= 20; r++) { assert.ok(Number.isInteger(refineCost(r)) && refineCost(r) >= 1, `rank ${r}`); if (r > 4) assert.ok(refineCost(r) >= refineCost(r - 1)); }
  const sum = (a, b) => { let t = 0; for (let r = a; r <= b; r++) t += refineCost(r); return t; };
  assert.equal(sum(11, 20), 44); assert.equal(sum(4, 10), 7);
  assert.equal(refineCost(21), 0);
});

test('not before 1,000: towns inside the line never unlock', () => {
  const s = freshSave(); s.seed = 'x';
  assert.equal(refinementGround(999, 0), false); assert.equal(refinementGround(707, 707), false); /* hypot 999.8 */
  assert.equal(unlockRefinement(s, 999, 0, 'Near'), null); assert.equal(unlockRefinement(s, 700, 700, 'Diagonal'), null);
  assert.equal(refinementOpen(s), false);
  assert.ok(!s.narrative.journal.some((j) => j.recordId === 'refinement-unlocked'));
});

test('once, at a town: the first far town unlocks it, records where, and writes one Journal line', () => {
  const s = freshSave(); s.seed = 'x'; s.playSeconds = 4321.7;
  const r = unlockRefinement(s, 708, 708, 'Farwick'); // hypot 1001.3
  assert.ok(r?.unlocked); assert.equal(refinementOpen(s), true);
  assert.deepEqual(s.refinement.at, { rx: 708, ry: 708, name: 'Farwick' }); assert.equal(s.refinement.playSeconds, 4321);
  assert.equal(unlockRefinement(s, 2000, 0, 'Later'), null, 'only the first time');
  assert.equal(s.refinement.at.name, 'Farwick');
  assert.equal(s.narrative.journal.filter((j) => j.recordId === 'refinement-unlocked').length, 1);
});

test('the Game unlocks it on entering a settlement past 1,000, not on open ground or a monster town', () => {
  const run = (rx, ry, map) => { const s = freshSave(); s.seed = 'g'; const g = { save: s, rx, ry, map, questNotices: [] }; const r = Game.prototype.reachRefinementTown.call(g); return { s, g, r }; };
  const town = { objects: [], settlement: { id: 'hamlet-x', name: 'Farwick', procedural: true, x: 16, y: 16, radius: 9 } };
  const a = run(1000, 0, town); assert.ok(a.r); assert.equal(refinementOpen(a.s), true); assert.equal(a.g.questNotices[0].title, 'REFINEMENT');
  assert.equal(run(1000, 0, { objects: [] }).r, null, 'open ground is no town');
  assert.equal(run(999, 0, town).r, null, 'inside 1,000');
  assert.equal(run(1000, 0, { ...town, farFolk: 'monster' }).r, null, 'monster folk keep no smith');
  // a Listener town counts too
  const s = freshSave(); s.seed = 'g'; s.hometowns = { towns: [{ rx: 0, ry: 1200, name: 'Mouthwick', listener: 1, mouth: true }], home: null };
  assert.ok(Game.prototype.reachRefinementTown.call({ save: s, rx: 0, ry: 1200, map: { objects: [] }, questNotices: [] }));
  // loadArea asks on every overworld entry
  assert.match(readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), /if\(area==="overworld"\)this\.reachRefinementTown\(\)/);
});

test('far towns exist: hamlet sections are rolled past 1,000', () => {
  let n = 0; for (let i = 0; i < 200; i++) if (hamletSection('far-check', 1000 + i, 37)) n++;
  assert.ok(n > 10, `${n} hamlet sections on a 200-section stretch past 1,000`);
});

test('persists: a save round trip keeps the unlock; normalisation is additive and keeps unknown fields', () => {
  const s = unlocked(); s.refinement.note = 'mine';
  const back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(back.refinement.unlocked, true); assert.deepEqual(back.refinement.at, s.refinement.at); assert.equal(back.refinement.note, 'mine');
  assert.deepEqual(freshSave().refinement, { unlocked: false });
  const old = freshSave(); delete old.refinement; assert.deepEqual(migrateSave(old).refinement, { unlocked: false }, 'a save from before gets the locked state');
  for (const bad of [null, 7, 'yes', [], { unlocked: 'true' }, { unlocked: 1 }]) { const q = { refinement: bad }; ensureRefinement(q); assert.equal(q.refinement.unlocked, false, JSON.stringify(bad)); }
  const q = { refinement: { unlocked: true, at: { rx: 1.5, ry: 2 } } }; ensureRefinement(q); assert.equal(q.refinement.unlocked, true); assert.equal(q.refinement.at, undefined, 'a malformed place is dropped, the unlock kept');
});

test('caps: every rarity, masterwork or not, late cap or not, reaches exactly +20 once unlocked', () => {
  for (const late of [false, true]) for (const tier of ITEM_TIERS) for (const mw of [false, true]) for (const slot of ['primary', 'secondary', 'armor', 'charm']) {
    const s = unlocked(); if (late) lateOpen(s); viscera(s, 1000); s.materials.weaponSphere = 1000; s.materials.armorSphere = 1000;
    s.equipment[slot] = piece(slot, tier, mw ? { masterwork: true } : {});
    assert.equal(upgradeLimit(s.equipment[slot], s), 20);
    let guard = 0; while (upgradeEquipment(s, slot).ok && guard++ < 40);
    const it = s.equipment[slot];
    assert.equal(it.upgradeRank, 20, `${slot} ${tier} mw=${mw} late=${late}`); assert.equal(it.power, 30, 'one power per rank'); assert.equal(it.refined, true);
    assert.equal(upgradeCost(it, s).eligible, false); assert.match(upgradeEquipment(s, slot).message, /upgrade limit/);
    // the ranks survive a save round trip (normalizeItemUpgrade keeps a refined piece's ranks), with refinement open or not
    assert.equal(normalizeItemUpgrade(JSON.parse(JSON.stringify(it))).upgradeRank, 20);
  }
});

test('locked: the cap is the normal cap, and the message names where refinement opens', () => {
  const s = freshSave(); s.materials.weaponSphere = 100; s.equipment.primary = piece('primary', 'relic', { upgradeRank: UPGRADE_CAPS.relic, power: 10 + UPGRADE_CAPS.relic });
  assert.equal(upgradeLimit(s.equipment.primary, s), UPGRADE_CAPS.relic);
  const c = upgradeCost(s.equipment.primary, s); assert.equal(c.eligible, false); assert.equal(c.refine, false);
  const r = upgradeEquipment(s, 'primary'); assert.equal(r.ok, false); assert.match(r.message, /Refinement: reach a town beyond 1,000/);
  // a non-refined piece is still trimmed to the late cap, as before
  assert.equal(normalizeItemUpgrade({ ...s.equipment.primary, upgradeRank: 20, power: 30 }).upgradeRank, itemCap(s.equipment.primary) + LATE_UPGRADE.ranks);
});

test('sphere vs viscera: ranks to the normal cap take spheres, every rank above it viscera', () => {
  const s = unlocked(); s.materials.weaponSphere = 1000; viscera(s, 1000);
  s.equipment.primary = piece('primary', 'epic'); const cap = itemCap(s.equipment.primary, s);
  for (let rank = 0; rank < 20; rank++) {
    const c = upgradeCost(s.equipment.primary, s), spheres = s.materials.weaponSphere, v = s.skylands.viscera;
    if (rank < cap) { assert.equal(c.kind, 'weaponSphere'); assert.equal(c.amount, rank + 1); assert.equal(c.refine, false); }
    else { assert.equal(c.kind, 'viscera'); assert.equal(c.amount, refineCost(rank + 1)); assert.equal(c.refine, true); }
    assert.ok(upgradeEquipment(s, 'primary').ok);
    if (rank < cap) { assert.equal(s.materials.weaponSphere, spheres - (rank + 1)); assert.equal(s.skylands.viscera, v); assert.notEqual(s.equipment.primary.refined, true); }
    else { assert.equal(s.materials.weaponSphere, spheres); assert.equal(s.skylands.viscera, v - refineCost(rank + 1)); assert.equal(s.equipment.primary.refined, true); }
  }
  const armor = upgradeCost(piece('armor', 'common', { upgradeRank: UPGRADE_CAPS.common, power: 13 }), s); assert.equal(armor.kind, 'viscera'); assert.equal(armor.amount, refineCost(UPGRADE_CAPS.common + 1));
});

test('insufficient viscera: nothing is paid and nothing changes', () => {
  const s = unlocked(); s.equipment.primary = piece('primary', 'relic', { upgradeRank: UPGRADE_CAPS.relic, power: 10 + UPGRADE_CAPS.relic }); s.materials.weaponSphere = 50;
  const need = refineCost(UPGRADE_CAPS.relic + 1); viscera(s, need - 1); const before = JSON.stringify(s.equipment.primary);
  const r = upgradeEquipment(s, 'primary'); assert.equal(r.ok, false); assert.match(r.message, /Divine Viscera \(you hold 0\)/);
  assert.equal(JSON.stringify(s.equipment.primary), before); assert.equal(s.skylands.viscera, need - 1); assert.equal(s.materials.weaponSphere, 50, 'spheres never stand in');
  delete s.skylands.viscera; assert.equal(upgradeEquipment(s, 'primary').ok, false);
});

test('preview: forgePreview shows exactly what the refine makes', () => {
  const s = unlocked(); lateOpen(s); viscera(s, 100);
  s.equipment.armor = piece('armor', 'relic', { masterwork: true, upgradeRank: 10, power: 20 }); assert.equal(itemCap(s.equipment.armor, s), 10);
  const out = forgeOutcome(s, 'armor', 'upgrade'); assert.equal(out.upgradeRank, 11); assert.equal(out.power, 21); assert.equal(out.refined, true);
  const rows = Object.fromEntries(forgePreview(s, 'armor', 'upgrade').map((q) => [q.id, q]));
  assert.equal(rows.rank.before, '+10'); assert.equal(rows.rank.after, '+11'); assert.equal(rows.power.after, '21'); assert.equal(rows.guard.direction, 'up');
  assert.equal(rows.cap.after, '+20', 'the cap row shows the refinement limit');
  const r = upgradeEquipment(s, 'armor'); assert.ok(r.ok); assert.deepEqual(s.equipment.armor, out, 'the preview is the result');
  assert.deepEqual(gearReadout(s, 'armor'), gearReadout(s, 'armor', out));
  assert.deepEqual(upgradedItem(s.equipment.armor, s).upgradeRank, 12);
});

test('salvage: a full pack never salvages a refined piece on its own', () => {
  const s = unlocked(); s.inventory = [];
  const refined = { ...piece('primary', 'common', { upgradeRank: 12, power: 22 }), refined: true, id: 'refined' };
  s.inventory.push(refined); for (let i = 1; i < EQUIPMENT_CAPACITY; i++) s.inventory.push(piece('primary', 'relic', { id: `relic-${i}` }));
  assert.notEqual(s.inventory[packVictim(s)].id, 'refined');
  storeInventoryItem(s, piece('primary', 'relic', { id: 'new' }));
  assert.ok(s.inventory.some((q) => q.id === 'refined'));
});

test('UI: the forge and the smith name the viscera cost, and the hint before unlock', () => {
  const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(src, /Refine to \+\$\{cost\.rank\+1\} · \$\{cost\.amount\} Divine Viscera/);
  assert.match(src, /upgradeLabel\(cost\),\(\)=>act\(game\.upgradeEquipmentSlot\(slot\)\),forgePreview\(save,slot,'upgrade'\)/);
  assert.match(src, /refinementHint\(save\)/);
});
