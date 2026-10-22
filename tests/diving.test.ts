import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, biomeFor } from '../src/landscape.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { validActions } from '../src/interactions.ts';
import { DIVE, diveSite, generateDiveSite, grantLens, buyRig, canDive, breathe } from '../src/diving.ts';
import { buySkiff } from '../src/boats.ts';
import { grantTidemantle } from '../src/water-traversal.ts';
import { drawLandscapeTile } from '../src/landscape-render.ts';

const SEED = 'LANDTEST';
const section = (rx, ry, version) => { const m = generateRegion(SEED, rx, ry); applyLandscape(m, SEED, rx, ry, version ? { version } : {}); return m; };
function diveSection() {
  for (let r = 2; r <= 30; r++) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r || biomeFor(SEED, x, y) !== 'sea') continue;
    const site = diveSite(section(x, y), SEED, x, y); if (site) return { rx: x, ry: y, site };
  }
  throw new Error('no dive site');
}
function diver() {
  const s = Object.assign(freshSave(), { seed: SEED }); grantTidemantle(s, 'test'); s.currency = 999; s.materials.cinderIron = 9; s.perception.aperture = 2231; // release 315: diving opens at Infinite II
  buySkiff(s, { rx: 0, ry: 0, x: 1, y: 1 }); buyRig(s); grantLens(s, 'test'); return s;
}
// Walkable reachability inside a dive map from its entry.
function reach(map) {
  const seen = new Set([`${map.entry.x},${map.entry.y}`]), q = [map.entry];
  while (q.length) { const p = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx, y = p.y + dy, k = `${x},${y}`, t = map.tiles[y * map.width + x]; if (t && !t.blocked && !seen.has(k)) { seen.add(k); q.push({ x, y }); } } }
  return seen;
}

test('the Bathysal Lens and a dive rig together grant diving; the rig needs a skiff', () => {
  const s = freshSave(); s.currency = 999; s.materials.cinderIron = 9; s.perception.aperture = 2231; // release 315: the rig is offered from Infinite II
  assert.equal(buyRig(s).ok, false, 'no skiff, no rig');
  grantTidemantle(s, 't'); buySkiff(s, { rx: 0, ry: 0, x: 1, y: 1 });
  assert.ok(validActions({ kind: 'shipwright', actions: ['speak'] }, s).includes('buyRig'));
  const before = s.currency; assert.equal(buyRig(s).ok, true); assert.equal(s.currency, before - DIVE.rig.currency); assert.equal(canDive(s), false, 'rig alone is not enough');
  assert.ok(!validActions({ kind: 'shipwright', actions: ['speak'] }, s).includes('buyRig'));
  assert.equal(grantLens(s, 'shrine'), true); assert.equal(canDive(s), true); assert.equal(grantLens(s, 'again'), false, 'one lens');
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).capabilities.dive, true, 'survives reload');
});

test('dive sites: deterministic buoys on deep water, only in landscape version 2+', () => {
  const { rx, ry, site } = diveSection(), m = section(rx, ry);
  assert.equal(m.tiles[site.y * 32 + site.x].kind, 'deepOcean'); assert.deepEqual(diveSite(m, SEED, rx, ry), site);
  assert.equal(diveSite(section(rx, ry, 1), SEED, rx, ry), null);
  assert.deepEqual(validActions(site, freshSave()), ['inspect']); assert.deepEqual(validActions(site, diver()), ['dive']);
});

test('the underwater scene: deterministic, everything reachable, air never further apart than the breath allows', () => {
  for (const id of ['dive:A:1:2', 'dive:B:-4:7', 'dive:C:9:-3', 'dive:LANDTEST:5:5']) {
    const m = generateDiveSite('S', id), r = reach(m);
    assert.deepEqual(generateDiveSite('S', id).tiles, m.tiles, 'deterministic');
    assert.ok(m.underwater && m.arena, 'bounded scene, outside dungeon completion');
    for (const o of m.objects) assert.ok(r.has(`${o.x},${o.y}`), `${o.kind} reachable`);
    const breaths = [m.entry, ...m.pockets]; let gap = 0;
    for (const p of m.path) { gap++; if (breaths.some((b) => b.x === p.x && b.y === p.y)) gap = 0; assert.ok(gap <= DIVE.maxPocketGap, 'air within reach'); }
    assert.ok(DIVE.maxPocketGap / (2.4 * DIVE.speed) < DIVE.breath * .6, 'the gap is well inside one breath');
    assert.ok(m.objects.some((o) => o.kind === 'chest') && m.objects.some((o) => o.kind === 'diveExit'));
  }
});

test('breath: drains away from air, refills at a pocket, then drowning damage', () => {
  const session = {};
  assert.equal(breathe(session, 1, false), 0); assert.equal(session.breath, DIVE.breath - 1);
  assert.equal(breathe(session, 1, true), 0); assert.equal(session.breath, DIVE.breath);
  session.breath = 0; assert.equal(breathe(session, 1, false), DIVE.drownDamagePerSecond);
});

test('in the real game: dive from the buoy, breathe, open the cache, surface back aboard the skiff', () => {
  const { rx, ry, site } = diveSection(), s = diver(), g = new Game(s, 0);
  g.rx = rx; g.ry = ry; g.loadArea('overworld');
  const buoy = g.map.objects.find((o) => o.kind === 'diveSite'); assert.deepEqual([buoy.x, buoy.y], [site.x, site.y]);
  s.boat.aboard = true; g.player.x = buoy.x; g.player.y = buoy.y - .2;
  const fresh = freshSave(); fresh.seed = SEED; const g2 = new Game(fresh, 0); g2.rx = rx; g2.ry = ry; g2.loadArea('overworld'); g2.player.x = buoy.x; g2.player.y = buoy.y - .2;
  assert.equal(g2.interact('dive', buoy.id).ok, false, 'no lens or rig: no dive');
  assert.equal(g.interact('dive', buoy.id).ok, true);
  assert.equal(g.area, 'dungeon'); assert.ok(g.map.underwater); assert.equal(s.session.breath, DIVE.breath);
  const input = { state: { x: 0, y: 0 }, consume: () => false };
  for (let i = 0; i < 30 * 5; i++) g.update(1 / 30, input, 90000 + i * 33);
  assert.ok(s.session.breath < DIVE.breath - 4, 'air drains'); assert.equal(g.area, 'dungeon');
  const pocket = g.map.objects.find((o) => o.kind === 'airPocket'); g.player.x = pocket.x; g.player.y = pocket.y;
  for (let i = 0; i < 30; i++) g.update(1 / 30, input, 95000 + i * 33);
  assert.equal(s.session.breath, DIVE.breath, 'refilled at the pocket');
  const cache = g.map.objects.find((o) => o.kind === 'chest'); g.player.x = cache.x; g.player.y = cache.y; const items = s.inventory.length + s.currency;
  assert.equal(g.interact('open', cache.id).ok, true); assert.ok(s.inventory.length + s.currency >= items);
  const line = g.map.objects.find((o) => o.kind === 'diveExit'); g.player.x = line.x; g.player.y = line.y;
  assert.equal(g.interact('surface', line.id).ok, true);
  assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry], [rx, ry]); assert.deepEqual([g.player.x, g.player.y], [buoy.x, buoy.y - .2]);
  assert.equal(s.boat.aboard, true, 'still aboard'); g.update(1 / 30, input, 99000); assert.ok(!s.worldFlags.deaths, 'not drowned on surfacing');
});

test('running out of air drowns the diver, who is hauled up the line to the buoy with fresh breath', () => {
  const { rx, ry } = diveSection(), s = diver(), g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld');
  const buoy = g.map.objects.find((o) => o.kind === 'diveSite'); g.player.x = buoy.x; g.player.y = buoy.y - .2; s.boat.aboard = true;
  g.interact('dive', buoy.id); s.session.breath = 0; g.player.hp = 5;
  const input = { state: { x: 0, y: 0 }, consume: () => false };
  for (let i = 0; i < 60 && !s.worldFlags.deaths; i++) g.update(1 / 30, input, 120000 + i * 33);
  assert.equal(s.worldFlags.deaths, 1); assert.equal(g.area, "overworld"); assert.deepEqual([g.rx, g.ry, g.player.x, g.player.y], [rx, ry, buoy.x, buoy.y - .2], "hauled up to the buoy"); assert.equal(s.session.breath, DIVE.breath);
});

test('an island landmark yields the Lens in the real game; the seabed tiles render', () => {
  let found = null;
  for (let ry = -30; ry <= 30 && !found; ry++) for (let rx = -30; rx <= 30 && !found; rx++) if (['sea', 'isles', 'coast'].includes(biomeFor(SEED, rx, ry))) { const o = section(rx, ry).objects.find((q) => q.islandLandmark); if (o) found = { rx, ry, o }; }
  const s = Object.assign(freshSave(), { seed: SEED }), g = new Game(s, 0); g.rx = found.rx; g.ry = found.ry; g.loadArea('overworld');
  g.player.x = found.o.x; g.player.y = found.o.y;
  assert.equal(g.interact('inspect', found.o.id).ok, true); assert.equal(s.worldFlags.bathysalLens, true);
  const grad = { addColorStop() {} }, ctx = new Proxy({}, { get(t, k) { if (k in t) return t[k]; if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
  const tiles = Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), elev: 0 }));
  for (const kind of ['seabed', 'seabedRock', 'kelp', 'airVent']) assert.equal(drawLandscapeTile(ctx, { x: 3, y: 3, kind, elev: 0, landscape: 'underwater', detail: 1 }, 3, 3, 32, tiles, 32), true, kind);
});
