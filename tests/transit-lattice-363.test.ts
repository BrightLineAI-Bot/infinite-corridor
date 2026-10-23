// Release 363 (Tim, 2026-10-23): the Transit Lattice. From Infinite III with a Listener felled, it holds 2 constellation
// passives and 1 Echo beyond the usual rules; Transit Coordinates (a Gate's pieces + 1 per Listener) buy up to 3 more of each.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TRANSIT_LATTICE, ensureLattice, latticeOpen, latticeSlots, unlockSlot, coordinatesFor, grantCoordinates, nextSlotCost } from '../src/transit-lattice.ts';
import { toggleLatticePassive, toggleAlt, nodeOn, altOn, extraReduction, ALT_UNLOCK_TIER } from '../src/constellation.ts';
import { toggleLatticeEcho, hasEcho, activeEchoes } from '../src/echoes.ts';
import { listenerFelled } from '../src/far-array.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const III = APERTURE_BANDS[ALT_UNLOCK_TIER].threshold;
const ready = (listeners = 1) => { const s = freshSave(); s.perception.aperture = III; s.farArray.listeners = listeners; ensureLattice(s); return s; };

test('coordinates: each Listener pays the pieces its Gate needed plus one, kills from before included, never twice', () => {
  assert.equal(coordinatesFor(1), 4); assert.equal(coordinatesFor(2), 5, 'a four-piece Gate pays five');
  const s = ready(2); assert.equal(s.lattice.coordinates, 9); assert.equal(grantCoordinates(s), 0);
  const old = freshSave(); old.farArray.listeners = 1; delete old.lattice; const m = migrateSave(JSON.parse(JSON.stringify(old))); assert.equal(m.lattice.coordinates, 4);
  const fresh = freshSave(); assert.deepEqual(fresh.lattice, { coordinates: 0, paidFor: 0, extra: { passive: 0, echo: 0 }, passives: [], echoes: [] });
});

test('it opens at Infinite III once a Listener has fallen', () => {
  const s = ready(0); assert.equal(latticeOpen(s), false); s.farArray.listeners = 1; assert.equal(latticeOpen(s), true);
  s.perception.aperture = III - 1; assert.equal(latticeOpen(s), false); assert.equal(unlockSlot(s, 'echo').ok, false);
});

test('slots: 2 passive and 1 Echo at first; coordinates buy 3 more of each, at rising cost', () => {
  const s = ready(); s.lattice.coordinates = 100;
  assert.equal(latticeSlots(s, 'passive'), 2); assert.equal(latticeSlots(s, 'echo'), 1);
  let spent = 0; for (let i = 0; i < 3; i++) { const c = nextSlotCost(s); assert.ok(unlockSlot(s, 'passive').ok); spent += c; assert.ok(unlockSlot(s, 'echo').ok); spent += TRANSIT_LATTICE.costs[2 * i + 1]; }
  assert.equal(latticeSlots(s, 'passive'), 5); assert.equal(latticeSlots(s, 'echo'), 4); assert.equal(s.lattice.coordinates, 100 - spent);
  assert.equal(unlockSlot(s, 'passive').ok, false); assert.equal(unlockSlot(s, 'echo').ok, false);
  const poor = ready(); poor.lattice.coordinates = 3; assert.equal(unlockSlot(poor, 'passive').ok, false); assert.equal(poor.lattice.coordinates, 3);
});

test('a passive form drawn in works beside the chosen one: both forms of one passive at once', () => {
  const s = ready(); s.magicSkills.learned['veil-guard'] = 5; s.constellation.mods['thorned-veil'] = true; s.constellation.caps.veil = 'mirror-veil';
  assert.equal(toggleLatticePassive(s, 'mirror-veil').ok, false, 'the chosen form already works');
  assert.equal(toggleLatticePassive(s, 'sanctuary').ok, false, 'not learned');
  assert.ok(toggleLatticePassive(s, 'mirror-veil:alt').ok); assert.equal(nodeOn(s, 'mirror-veil'), true); assert.equal(altOn(s, 'mirror-veil'), true);
  s.magicSkills.active = { id: 'veil-guard', rank: 1, remaining: 5 }; assert.equal(extraReduction(s), .2, 'Stillwater from the Lattice');
  toggleAlt(s, 'thorned-veil'); assert.equal(nodeOn(s, 'thorned-veil'), false); assert.ok(toggleLatticePassive(s, 'thorned-veil').ok); assert.equal(nodeOn(s, 'thorned-veil'), true); assert.equal(altOn(s, 'thorned-veil'), true);
  assert.equal(toggleLatticePassive(s, 'fold').ok, false, 'two slots, both set (and fold not learned)');
  s.perception.aperture = 0; assert.equal(altOn(s, 'mirror-veil'), false, 'a closed Lattice holds nothing');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(back.lattice.passives, ['mirror-veil:alt', 'thorned-veil']);
});

test('an Echo in the Lattice works without notches; one in the notches cannot be drawn in twice', () => {
  const s = ready(); s.echoes.owned = { bloblet: true, graveLantern: true, lightningGiant: true }; s.echoes.equipped = ['lightningGiant'];
  assert.equal(toggleLatticeEcho(s, 'lightningGiant').ok, false); assert.equal(toggleLatticeEcho(s, 'thunderhorn').ok, false, 'not owned');
  assert.ok(toggleLatticeEcho(s, 'bloblet').ok); assert.equal(hasEcho(s, 'bloblet'), true); assert.deepEqual(activeEchoes(s), ['lightningGiant', 'bloblet']);
  assert.equal(toggleLatticeEcho(s, 'graveLantern').ok, false, 'one Echo slot at first');
  assert.ok(toggleLatticeEcho(s, 'bloblet').ok); assert.equal(hasEcho(s, 'bloblet'), false);
});

test('felling a Listener pays its Gate in coordinates', async () => {
  const { Game } = await import('../src/game.ts');
  const s = ready(); const before = s.lattice.coordinates; s.farArray.gate = 2;
  listenerFelled(s); grantCoordinates(s); assert.equal(s.lattice.coordinates, before + coordinatesFor(2));
  assert.ok(Game);
});
