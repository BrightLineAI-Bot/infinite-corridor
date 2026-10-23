// Release 371 (Tim, 2026-10-23): a town springs up where each Listener falls; it can be home, and home is where the Atlas
// returns you and where the farm, the quarry and the regrowth ring sit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureHometowns, grantTowns, townAt, setHome, homeKey, homeName, homeCenter } from '../src/hometowns.ts';
import { refugeLands, regrowSection, ensureRegrowth } from '../src/refuge-lands.ts';
import { relayCoordinate } from '../src/relay-network.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const felled = (n = 1) => { const s = freshSave(); s.seed = 'HOME'; s.relayNetwork = { version: 1, nodes: {}, fragments: 0, coordinate: relayCoordinate(s) }; s.farArray.listeners = n; ensureHometowns(s); return s; };

test('each fallen Listener raises one town (since release 373, on its Mouth); journeys from before get theirs', () => {
  const s = felled(); const [t] = s.hometowns.towns, m = s.relayNetwork.coordinate;
  assert.equal(s.hometowns.towns.length, 1); assert.deepEqual([t.rx, t.ry, t.mouth], [m.rx, m.ry, true]); assert.ok(t.name.length > 2);
  assert.equal(grantTowns(s).length, 0, 'never twice');
  const old = freshSave(); old.seed = 'HOME'; old.relayNetwork = { version: 1, nodes: {}, fragments: 0, coordinate: relayCoordinate(old) }; old.farArray.listeners = 1; delete old.hometowns;
  const back = migrateSave(JSON.parse(JSON.stringify(old))); assert.equal(back.hometowns.towns.length, 1); assert.equal(back.hometowns.towns[0].mouth, true);
  assert.deepEqual(freshSave().hometowns, { towns: [], home: null });
});

test('the town is a real hamlet with a Wayglass when first visited', () => {
  const s = felled(), t = s.hometowns.towns[0], g = new Game(s, 0); g.rx = t.rx; g.ry = t.ry; g.loadArea('overworld');
  const glass = g.map.objects.find((o) => o.kind === 'checkpoint'); assert.ok(glass, 'a Wayglass'); assert.match(glass.name, new RegExp(t.name));
  assert.ok(g.map.objects.some((o) => o.settlement === `hamlet-${t.rx}-${t.ry}`) || glass.settlement, 'its people');
});

test('home: Ember Refuge until a lit town is chosen; the Atlas return goes there', () => {
  const s = felled(), t = s.hometowns.towns[0], k = `${t.rx},${t.ry}`;
  assert.equal(homeKey(s), '0,0'); assert.equal(homeName(s), 'Ember Refuge');
  assert.equal(setHome(s, k).ok, false, 'its Wayglass must be lit'); assert.equal(setHome(s, '5,5').ok, false, 'not any place');
  s.checkpoints[k] = { rx: t.rx, ry: t.ry, x: 16, y: 18, name: `${t.name} Wayglass` }; assert.ok(setHome(s, k).ok); assert.equal(homeName(s), t.name);
  const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); assert.ok(g.returnHome()); assert.deepEqual([g.rx, g.ry], [t.rx, t.ry]);
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).hometowns.home, k);
  assert.ok(setHome(s, '0,0').ok); assert.equal(s.hometowns.home, null);
});

test('the farm, the quarry and the regrowth ring follow home; the Refuge keeps its own lands', () => {
  const s = felled(), t = s.hometowns.towns[0], all = () => true;
  const refuge = refugeLands('HOME', all), away = refugeLands('HOME', all, { rx: t.rx, ry: t.ry });
  assert.ok(Math.max(Math.abs(refuge.farm.rx), Math.abs(refuge.farm.ry)) <= 2);
  assert.ok(Math.max(Math.abs(away.farm.rx - t.rx), Math.abs(away.farm.ry - t.ry)) <= 2 && Math.max(Math.abs(away.quarry.rx - t.rx), Math.abs(away.quarry.ry - t.ry)) <= 2);
  ensureRegrowth(s).epoch = 2; const tree = () => ({ objects: [{ id: 't', kind: 'tree', environmental: true, state: 'fallen' }] });
  assert.equal(regrowSection(s, tree(), t.rx + 1, t.ry, away), 1, 'near home it regrows'); assert.equal(regrowSection(s, tree(), 1, 0, away), 0, 'the Refuge ring no longer does');
  assert.equal(regrowSection(s, tree(), 1, 1, refuge), 1, 'with the Refuge as home, as before');
  s.checkpoints[`${t.rx},${t.ry}`] = { rx: t.rx, ry: t.ry, x: 16, y: 18 }; setHome(s, `${t.rx},${t.ry}`); const g = new Game(s, 0); assert.deepEqual(g.refugeLandsWhere().center, homeCenter(s));
});
