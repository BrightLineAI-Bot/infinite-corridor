// Release 311 (Tim, 2026-10-22): the submersible. Forged from cinder iron, fitted aboard the skiff: more hull, 5% guard,
// Dodge dives under, dive buoys without rig or lens, and a grotto's deep current runs on to the next buoy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOAT, ensureBoatState, forgeSubmersible, fitSubmersible, hullAbsorb, hullStrike, submersible } from '../src/boats.ts';
import { BUTTON_ITEMS } from '../src/spell-slots.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { biomeFor } from '../src/landscape.ts';
import { hashSeed } from '../src/random.ts';
import { DIVE } from '../src/diving.ts';

const afloat = () => { const s = freshSave(); s.boat = { owned: true, aboard: true, hull: BOAT.maxHull }; ensureBoatState(s); s.materials.cinderIron = 7; return s; };

test('forge from cinder iron, fit aboard, more hull first, 5% guard, refit mends, sinking undoes it', () => {
  const s = afloat(); assert.ok(BUTTON_ITEMS.includes('submersible'), 'a preset item');
  assert.equal(fitSubmersible(s).ok, false, 'none carried');
  assert.equal(forgeSubmersible(s).ok, true); assert.equal(s.materials.cinderIron, 7 - BOAT.sub.cinderIron); assert.equal(s.consumables.submersible, 1);
  s.boat.aboard = false; assert.equal(fitSubmersible(s).ok, false, 'only aboard'); s.boat.aboard = true;
  assert.equal(fitSubmersible(s).ok, true); assert.ok(submersible(s)); assert.equal(s.boat.subHull, BOAT.sub.hull); assert.equal(s.consumables.submersible, 0);
  const plain = afloat(); const a = hullAbsorb(plain, 20), b = hullAbsorb(s, 20);
  assert.ok(Math.abs(b.kept - a.kept * (1 - BOAT.sub.guard)) < 1e-9, 'the Wayfarer keeps 5% less'); assert.equal(s.boat.hull, BOAT.maxHull, 'the plating took it'); assert.ok(s.boat.subHull < BOAT.sub.hull);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.boat.sub, true); assert.equal(back.boat.subHull, s.boat.subHull);
  forgeSubmersible(s); assert.equal(fitSubmersible(s).ok, true); assert.equal(s.boat.subHull, BOAT.sub.hull, 'another frame mends the plating');
  assert.equal(hullStrike(s, 999), true); assert.equal(s.boat.sub, false, 'sunk, it comes back a plain skiff');
});

test('aboard a submersible a dodge is a dive: untouchable for its length', () => {
  const s = afloat(); s.seed = 'SUBDIVE'; forgeSubmersible(s); fitSubmersible(s);
  const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); Object.assign(g.player, { stamina: 50 }); s.boat.aboard = true;
  const dodge = { state: { x: 1, y: 0 }, consume: (k) => k === 'dodge', held: () => false };
  g.update(.016, dodge, 10000); assert.ok(g.subDiveUntil >= 10000 + BOAT.sub.dive * 1000 - 1); assert.ok(g.player.invulnerableUntil >= g.subDiveUntil);
});

test('a submersible may dive at a buoy without rig or lens; the deep current leads to another buoy', () => {
  const s = afloat(); s.seed = 'SUBNET'; forgeSubmersible(s); fitSubmersible(s); assert.notEqual(s.capabilities?.dive, true);
  const g = new Game(s, 0); let site = null, at = null;
  for (let r = 2; r < 40 && !site; r++) for (let dx = -r; dx <= r && !site; dx++) { const rx = dx, ry = r; if (biomeFor(s.seed, rx, ry) !== 'sea' || hashSeed(`${s.seed}:dive:site:${rx}:${ry}`) % DIVE.siteEvery) continue; g.rx = rx; g.ry = ry; g.loadArea('overworld'); site = g.map.objects.find((o) => o.kind === 'diveSite'); at = { rx, ry }; }
  assert.ok(site, 'found a dive buoy'); Object.assign(g.player, { x: site.x, y: site.y + .2 }); s.boat.aboard = true;
  const r = g.diveAction(site); assert.equal(r.ok, true, r.message); assert.equal(g.area, 'dungeon');
  const onward = g.map.objects.find((o) => o.kind === 'diveOnward'); assert.ok(onward, 'the lair holds a deep current');
  const to = g.onwardBuoy(); assert.ok(to, 'another buoy in reach'); assert.ok(to.rx !== at.rx || to.ry !== at.ry);
  Object.assign(g.player, { x: onward.x, y: onward.y }); const out = g.diveAction(onward); assert.equal(out.ok, true, out.message);
  assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry], [to.rx, to.ry], 'surfaced at the next buoy');
});
