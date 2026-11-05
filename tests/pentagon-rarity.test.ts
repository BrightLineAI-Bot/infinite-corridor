// The rarer Pentagons (Tim, 2026-11-05: "the Pentagon should be pretty rare... I don't want the whole landscape to be dominated
// by Pentagons. They're so huge"). Placement version 2 (pentagon.ts PENTAGON.place, pinned per section as `atlas.pentPlace`):
// of the centres the old rule stands, a hashed share still stand, each where the old rule put it. A Pentagon any of whose nine
// sections a journey knows (seen before, with no `pentPlace`), or whose base floor holds any history, stands as before; its
// unseen sections still complete it. Only a Pentagon of which nothing is known can go.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, clearSectionTerrainCache, sectionTerrainCacheStats } from '../src/game.ts';
import { PENTAGON, pentagonAt, pentagonCentre } from '../src/pentagon.ts';
import { castleCorner, quarterSection } from '../src/castles.ts';

const SEED = 'TIM1', E = PENTAGON.every;
const game = (seed = SEED, atlas = null) => { const s = freshSave(); s.seed = seed; if (atlas) s.atlas = structuredClone(atlas); return new Game(s, 0); };
const visit = (g, rx, ry) => { g.rx = rx; g.ry = ry; g.save.session.areas = {}; g.loadArea('overworld', false); return g; };
const sha = (v) => crypto.createHash('sha1').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const ground = (g) => sha([g.map.tiles.map((t) => [t.kind, t.blocked ? 1 : 0, t.elev || 0, t.slope ? 1 : 0, t.wallSides || null]), (g.map.objects || []).filter((o) => o.kind !== 'wayfindingCue').map((o) => [o.id, o.kind, o.x, o.y]).sort(), (g.map.enemySpawns || []).map((e) => [e.kind, e.x, e.y])]);
const NINE = (cx, cy) => { const out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push([cx + dx, cy + dy]); return out; };
const centres = (g, R, place) => { const out = []; for (let cy = -R; cy <= R; cy += E) for (let cx = -R; cx <= R; cx += E) if (g.pentagonHere(cx, cy, place)) out.push(`${cx},${cy}`); return out; };
// TIM1 within ±64: Pentagons the old rule stood and the new one does not, and ones both stand (found below, checked here)
const THINNED = [[16, -32], [-48, -32], [-24, 32]], KEPT = [[32, 0], [-16, 16]];
// The atlas record the release 754 code wrote on a first visit to section (cx+1, cy+1) of each (with the Pentagon standing), and
// the hash of the 5×5 sections round the centre loaded in turn afterwards (each section's tiles, objects and spawns), from the 754 code.
const OLD_FIRST = {
  "TIM1:16:-32": {"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":3,"farVersion":6,"compoundVersion":1,"labVersion":2,"castleVersion":2,"pentVersion":7,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#aaacae","landscape":"mountains","sites":[{"kind":"shrine","name":"Singing Array","x":15,"y":16},{"kind":"supplyCache","name":"Supply Cache","x":15,"y":18},{"kind":"shack","name":"Forgotten Shrine House","x":24,"y":24},{"kind":"ruinMarker","name":"Summit Cairn","x":29,"y":28},{"kind":"dungeon","name":"Outer Ring · South-East Face (east)","x":7,"y":1},{"kind":"dungeon","name":"The Pentagon: a side door","x":16,"y":4}]},
  "TIM1:-48:-32": {"terrain":"glass","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":3,"farVersion":6,"compoundVersion":1,"labVersion":2,"castleVersion":2,"pentVersion":7,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#919490","landscape":"mountains","sites":[{"kind":"ruinMarker","name":"Broken Observatory","x":14,"y":13},{"kind":"supplyCache","name":"Supply Cache","x":15,"y":18},{"kind":"ruinMarker","name":"Summit Cairn","x":28,"y":25},{"kind":"dungeon","name":"Outer Ring · South-East Face (east)","x":7,"y":1},{"kind":"dungeon","name":"The Pentagon: a side door","x":16,"y":4}]},
  "TIM1:32:0": {"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":3,"farVersion":6,"compoundVersion":1,"labVersion":2,"castleVersion":2,"pentVersion":7,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#4c555c","landscape":"coast","sites":[{"kind":"ruinMarker","name":"Broken Observatory","x":17,"y":14},{"kind":"supplyCache","name":"Supply Cache","x":17,"y":18},{"kind":"dungeon","name":"Outer Ring · South-East Face (east)","x":7,"y":1},{"kind":"dungeon","name":"The Pentagon: a side door","x":16,"y":4}]},
  "TIM1:-24:32": {"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":3,"farVersion":6,"compoundVersion":1,"labVersion":2,"castleVersion":2,"pentVersion":7,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#3d4e39","landscape":"forest","sites":[{"kind":"shrine","name":"Singing Array","x":13,"y":18},{"kind":"supplyCache","name":"Supply Cache","x":15,"y":18},{"kind":"shack","name":"Signal Kiosk","x":10,"y":23},{"kind":"watcherTomb","name":"Watcher's Shrine","x":19,"y":21},{"kind":"dungeon","name":"Outer Ring · South-East Face (east)","x":7,"y":1}]},
};
const OLD_GROUND = { "TIM1:16:-32": "17c096fff3d28799", "TIM1:-48:-32": "2619af82630fc88d", "TIM1:32:0": "7709a86cbcb566fc", "TIM1:-24:32": "40859c80fd53b682" };
const knownAt = (cx, cy, rx = cx + 1, ry = cy + 1) => ({ [`${rx},${ry}`]: { ...OLD_FIRST[`${SEED}:${cx}:${cy}`] } });

// ------------------------------------------------------------------------------------------------ the numbers
test('the placement data: version 2 keeps a hashed 30% of the old rule\'s Pentagons; version 1 is the old rule', () => {
  assert.equal(PENTAGON.place.version, 2); assert.equal(PENTAGON.place.keep, .3); assert.deepEqual([PENTAGON.every, PENTAGON.chance, PENTAGON.minRing], [8, .5, 10], 'the grid and the old rule as they were');
  const ok = () => true; let one = 0, two = 0;
  for (let i = 0; i < 4000; i++) { const cx = (i % 80 - 40) * E, cy = (Math.floor(i / 80) - 25) * E + 80; const a = pentagonAt('R', cx, cy, ok), b = pentagonAt('R', cx, cy, ok, 2); if (b) assert.ok(a, 'never where the old rule had none'); one += a ? 1 : 0; two += b ? 1 : 0; }
  assert.equal(pentagonAt('R', 0, 80, ok), pentagonAt('R', 0, 80, ok, 1), 'the default is the old rule');
  assert.ok(two / one > .25 && two / one < .35, `${two} of ${one} stand`);
});

test('frequency on new ground, before and after: about 30% as many Pentagons, every one of them where the old rule stood one, twice as far apart', () => {
  const R = 96; let before = 0, after = 0; const nn = (list) => { const p = list.map((k) => k.split(',').map(Number)), d = []; for (const a of p) { let m = Infinity; for (const b of p) if (a !== b) m = Math.min(m, Math.hypot(a[0] - b[0], a[1] - b[1])); if (m < Infinity) d.push(m); } return d.reduce((s, x) => s + x, 0) / (d.length || 1); };
  const gaps = [[], []];
  for (const seed of ['TIM1', 'A', 'B', 'C', 'D', 'E']) { const g = game(seed), one = centres(g, R, 1), two = centres(g, R, 2), fresh = centres(g, R);
    assert.deepEqual(fresh, two, `${seed}: unseen ground takes version 2`); for (const k of two) assert.ok(one.includes(k), `${seed} ${k}: a subset`);
    before += one.length; after += two.length; gaps[0].push(nn(one)); gaps[1].push(nn(two)); }
  const ratio = after / before, mean = (a) => a.reduce((s, x) => s + x, 0) / a.length; assert.ok(ratio <= .36 && ratio >= .2, `${after} of ${before}`);
  assert.ok(mean(gaps[1]) > 1.5 * mean(gaps[0]), `nearest neighbours ${mean(gaps[0]).toFixed(1)} → ${mean(gaps[1]).toFixed(1)} sections`);
});

test('the fixtures: TIM1\'s thinned and kept Pentagons are what they say', () => {
  const g = game(); for (const [cx, cy] of THINNED) { assert.ok(g.pentagonHere(cx, cy, 1), `${cx},${cy} stood`); assert.ok(!g.pentagonHere(cx, cy), `${cx},${cy} stands no more on new ground`); }
  for (const [cx, cy] of KEPT) { assert.ok(g.pentagonHere(cx, cy, 1)); assert.ok(g.pentagonHere(cx, cy), `${cx},${cy} still stands`); }
});

// ------------------------------------------------------------------------------------------------ what a journey knows stands
test('a Pentagon any of whose nine sections is in the atlas (seen before) stands, whichever section it is', () => {
  for (const [cx, cy] of THINNED) for (const [rx, ry] of NINE(cx, cy)) { const g = game(SEED, knownAt(cx, cy, rx, ry)); assert.equal(g.pentagonPlace(cx, cy), 1); assert.ok(g.pentagonHere(cx, cy), `${cx},${cy} known by ${rx},${ry}`); }
  // and a section seen before beside it (outside its nine) changes nothing
  const [cx, cy] = THINNED[0]; assert.ok(!game(SEED, knownAt(cx, cy, cx + 2, cy)).pentagonHere(cx, cy));
});

test('a Pentagon whose base floor holds any history stands (every version\'s id)', () => {
  const [cx, cy] = THINNED[0];
  for (let V = 1; V <= PENTAGON.version; V++) { const s = freshSave(); s.seed = SEED; s.consequences.dungeons[`pentagon:${SEED}:${cx}:${cy}${V > 1 ? `:v${V}` : ''}:f1`] = { discovered: true, visits: 1 }; const g = new Game(s, 0);
    assert.equal(g.pentagonPlace(cx, cy), 1, `v${V}`); assert.ok(g.pentagonHere(cx, cy)); }
  const s = freshSave(); s.seed = SEED; s.consequences.dungeons[`pentagon:${SEED}:${cx}:${cy}:v7:f3`] = { discovered: true }; assert.ok(!new Game(s, 0).pentagonHere(cx, cy), 'only the base floor counts');
});

test('half seen: the unseen sections of a Pentagon a journey knows still complete it, and stay complete across reloads', () => {
  const [cx, cy] = THINNED[1]; const g = game(SEED, knownAt(cx, cy));
  for (const [rx, ry] of NINE(cx, cy)) { visit(g, rx, ry); assert.ok(g.map.pentagon, `${rx},${ry} holds its part`); }
  for (const [rx, ry] of NINE(cx, cy)) if (rx !== cx + 1 || ry !== cy + 1) assert.equal(g.save.atlas[`${rx},${ry}`].pentPlace, PENTAGON.place.version, 'new sections take the new pin');
  assert.equal(g.save.atlas[`${cx + 1},${cy + 1}`].pentPlace, undefined, 'the one seen before keeps none');
  const r = new Game(migrateSave(JSON.parse(JSON.stringify(g.save))), 0); assert.ok(r.pentagonHere(cx, cy)); for (const [rx, ry] of NINE(cx, cy)) assert.ok(visit(r, rx, ry).map.pentagon);
});

test('pinning: sections round a Pentagon a journey knew load byte for byte as the release 754 code made them (four Pentagons, 100 sections)', () => {
  for (const [cx, cy] of [...THINNED, KEPT[0]]) { clearSectionTerrainCache(); const g = game(SEED, knownAt(cx, cy)), row = {};
    for (let ry = cy - 2; ry <= cy + 2; ry++) for (let rx = cx - 2; rx <= cx + 2; rx++) { visit(g, rx, ry); row[`${rx},${ry}`] = [ground(g), !!g.map.pentagon]; }
    assert.equal(sha(row), OLD_GROUND[`${SEED}:${cx}:${cy}`], `${cx},${cy}`); assert.equal(Object.values(row).filter((v) => v[1]).length, 9); }
});

// ------------------------------------------------------------------------------------------------ what nobody knew can go
test('a Pentagon fully unseen at the old rule is gone from new ground: no section of it holds its part, and it stays gone', () => {
  const [cx, cy] = THINNED[0], g = game();
  for (const [rx, ry] of NINE(cx, cy)) { visit(g, rx, ry); assert.ok(!g.map.pentagon, `${rx},${ry}`); assert.ok(!g.map.objects.some((o) => o.pentagonDoor), 'no door of it'); assert.equal(g.save.atlas[`${rx},${ry}`].pentPlace, 2); }
  assert.deepEqual(Object.keys(g.save.consequences.dungeons).filter((k) => k.startsWith(`pentagon:${SEED}:${cx}:${cy}`)), [], 'no history of it');
  const r = new Game(migrateSave(JSON.parse(JSON.stringify(g.save))), 0); assert.ok(!r.pentagonHere(cx, cy)); for (const [rx, ry] of NINE(cx, cy)) assert.ok(!visit(r, rx, ry).map.pentagon);
  // a kept one stands whole on new ground and keeps standing
  const [kx, ky] = KEPT[1], k = game(); for (const [rx, ry] of NINE(kx, ky)) assert.ok(visit(k, rx, ry).map.pentagon, `${rx},${ry}`);
  assert.ok(new Game(migrateSave(JSON.parse(JSON.stringify(k.save))), 0).pentagonHere(kx, ky));
});

test('the compass and rumours (the gold wonder cue) never point at a Pentagon that no longer stands; it points at the kept ones', () => {
  const g = game(); const [tx, ty] = THINNED[0];
  for (let ry = ty - 14; ry <= ty + 14; ry += 3) for (let rx = tx - 14; rx <= tx + 14; rx += 3) { g.rx = rx; g.ry = ry; const t = g.wonderTarget(); if (t?.name === PENTAGON.name) assert.ok(g.pentagonHere(t.rx, t.ry), `${rx},${ry} → ${t.rx},${t.ry}`), assert.ok(!(t.rx === tx && t.ry === ty)); }
  let kept = 0; for (const [kx, ky] of KEPT) for (let ry = ky - 6; ry <= ky + 6; ry++) for (let rx = kx - 6; rx <= kx + 6; rx++) { g.rx = rx; g.ry = ry; const t = g.wonderTarget(); if (t?.name === PENTAGON.name && t.rx === kx && t.ry === ky) kept++; }
  assert.ok(kept > 0, 'the kept Pentagons are pointed at');
});

test('castles: one with a quarter seen before keeps clear of the Pentagon of then, though that Pentagon is gone from new ground', () => {
  // TIM1: the castle round corner (-48,-33) stands on new ground in the thinned Pentagon's place; a journey that saw its north quarters
  // (outside the Pentagon) before saw no castle there, so none comes (the old rule's Pentagon still counts for it).
  const X = -48, Y = -33, [cx, cy] = THINNED[1]; assert.ok(game().castleHere(X, Y), 'new ground: the castle');
  const quarters = [0, 1, 2, 3].map((q) => quarterSection(X, Y, q)), outside = quarters.filter(({ rx, ry }) => Math.abs(rx - cx) > 1 || Math.abs(ry - cy) > 1);
  assert.ok(outside.length >= 1);
  for (const { rx, ry } of outside) { const g = game(SEED, { [`${rx},${ry}`]: { ...OLD_FIRST[`${SEED}:${cx}:${cy}`] } }); assert.ok(!g.pentagonHere(cx, cy), 'the Pentagon itself: none of its sections known'); assert.ok(!g.castleHere(X, Y), `seen ${rx},${ry}: no castle`); }
  for (const [rx, ry] of NINE(cx, cy)) { const k = castleCorner(rx, ry); if (k && game().castleHere(k.X, k.Y)) assert.ok(!game().pentagonHere(cx, cy), 'never both'); }
});

// ------------------------------------------------------------------------------------------------ determinism and the terrain cache
test('determinism: two fresh loads agree on every Pentagon and every section of one', () => {
  for (const seed of ['TIM1', 'Q7']) { const a = centres(game(seed), 80), b = centres(game(seed), 80); assert.deepEqual(a, b); }
  const [kx, ky] = KEPT[0]; clearSectionTerrainCache(); const a = NINE(kx, ky).map(([rx, ry]) => ground(visit(game(), rx, ry))); clearSectionTerrainCache(); const b = NINE(kx, ky).map(([rx, ry]) => ground(visit(game(), rx, ry)));
  assert.deepEqual(a, b);
});

test('the terrain cache: a section of a gone Pentagon never gets its part from a journey that keeps it, nor the other way, whichever loads first', () => {
  const [cx, cy] = THINNED[2], rx = cx - 1, ry = cy; const known = () => game(SEED, knownAt(cx, cy)), fresh = () => game();
  const alone = (mk) => { clearSectionTerrainCache(); return ground(visit(mk(), rx, ry)); }; const K = alone(known), F = alone(fresh); assert.notEqual(K, F);
  for (const order of [[known, fresh], [fresh, known]]) { clearSectionTerrainCache(); const [a, b] = order.map((mk) => visit(mk(), rx, ry)); assert.ok(sectionTerrainCacheStats().hits >= 1, 'the second load is served from the cache');
    const byKind = new Map([[order[0], a], [order[1], b]]); assert.equal(ground(byKind.get(known)), K); assert.equal(ground(byKind.get(fresh)), F); assert.ok(byKind.get(known).map.pentagon); assert.ok(!byKind.get(fresh).map.pentagon); }
  assert.ok(pentagonCentre(rx, ry));
});
