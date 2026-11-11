// Waymark guides (Tim, 2026-11-11): the amber chevron leads to a skyway, the red triangle to a world boss and the violet spiral
// to a Watcher's Shrine (the overworld teleport shrine), one real destination of each kind per lattice cell, about 8-10 sections
// out when the trail is picked up; the Pentagon sigil is much smaller; the Journal says so. waymark-guides.ts holds the lattice.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { canStep, LETHAL_KINDS, openSeaSection } from '../src/landscape.ts';
import { hamletSection } from '../src/settlements.ts';
import { pentagonCentre } from '../src/pentagon.ts';
import { wayfindingCues, wayfindingTargets, wayfindingCacheStats, clearWayfindingCache, warmWayfindingSignals } from '../src/world.ts';
import { WAYMARK_GUIDES, GUIDE_KINDS, guideCell, guideCellHost, guideHost, guideTarget, guideLairBeast, guideHostable, clearGuideHosts, guideHostCacheSize } from '../src/waymark-guides.ts';
import { PENTAGON_SIGIL_MARK, pentagonSigilReach } from '../src/renderer.ts';
import { SKY_DISCS } from '../src/skylands.ts';

const G = WAYMARK_GUIDES, SEEDS = ['GUIDE1', 'TIM1', 'S0', 'D7'];
const woken = (seed) => { const s = freshSave(); s.seed = seed; s.perception = { ...(s.perception || {}), aperture: 99 }; return s; };
const visit = (seed, rx, ry, save = woken(seed)) => { const g = new Game(save, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
const d1 = (a, b) => Math.abs(a.rx - b.rx) + Math.abs(a.ry - b.ry);
const I = (x, y) => y * 32 + x;
// Tiles the Wayfarer reaches from the section's exits: canStep with a jump, never onto blocked or lethal ground.
function reached(map) {
  const seen = new Uint8Array(1024), q = [], ex = map.exits, walk = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
  for (const [x, y] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) if (walk(map.tiles[I(x, y)]) && !seen[I(x, y)]) { seen[I(x, y)] = 1; q.push(I(x, y)); }
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % 32, y = (i - x) / 32; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = I(nx, ny); if (nx < 0 || ny < 0 || nx > 31 || ny > 31 || seen[j] || !walk(map.tiles[j]) || !canStep({ isPlayer: true, jumping: true }, map, 32, x + .5, y + .7, nx + .5, ny + .7)) continue; seen[j] = 1; q.push(j); } }
  return seen;
}
const near = (seen, x, y, r = 1) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = Math.floor(x) + dx, ny = Math.floor(y) + dy; if (nx >= 0 && ny >= 0 && nx < 32 && ny < 32 && seen[I(nx, ny)]) return true; } return false; };

test('the lattice is deterministic, closed form and bounded; the three kinds never share a host', () => {
  clearGuideHosts(); const first = SEEDS.map((seed) => GUIDE_KINDS.map((k) => guideCellHost(seed, k, 3, -2)));
  clearGuideHosts(); assert.deepEqual(SEEDS.map((seed) => GUIDE_KINDS.map((k) => guideCellHost(seed, k, 3, -2))), first);
  for (const kind of GUIDE_KINDS) for (let cx = -5; cx <= 5; cx++) for (let cy = -5; cy <= 5; cy++) { const h = guideCellHost('GUIDE1', kind, cx, cy); if (!h) continue;
    assert.deepEqual(guideCell(kind, h.rx, h.ry), { cx, cy }, `${kind} host stands in its own cell`); assert.ok(guideHost('GUIDE1', kind, h.rx, h.ry));
    const [ox, oy] = G.kinds[kind].origin, u = ((h.rx - ox) % G.cell + G.cell) % G.cell, v = ((h.ry - oy) % G.cell + G.cell) % G.cell;
    assert.ok(u >= G.band[0] && u <= G.band[1] && v >= G.band[0] && v <= G.band[1], `${kind} host in the middle band`);
    for (const other of GUIDE_KINDS) if (other !== kind) assert.ok(!guideHost('GUIDE1', other, h.rx, h.ry), `${kind} and ${other} share ${h.rx},${h.ry}`); }
  // band positions of the kinds never coincide (mod cell), so no section can ever host two
  const at = (kind) => { const [ox, oy] = G.kinds[kind].origin, s = new Set(); for (let u = G.band[0]; u <= G.band[1]; u++) for (let v = G.band[0]; v <= G.band[1]; v++) s.add(`${(u + ox) % G.cell},${(v + oy) % G.cell}`); return s; };
  for (const a of GUIDE_KINDS) for (const b of GUIDE_KINDS) if (a < b) for (const k of at(a)) assert.ok(!at(b).has(k), `${a}/${b} at ${k}`);
  assert.ok(guideHostCacheSize() <= G.memo);
  // nine cells are enough: the nearest host two cells away is always farther than reach
  assert.ok(G.cell + 1 + G.band[0] > G.reach);
  // balance lives in the table
  assert.deepEqual([G.cell, G.band, G.reach, G.pickup], [10, [3, 6], 12, [8, 10]]);
});

test('a cell without a host is all open sea, a town, a hamlet or Pentagon ground; every other cell has one', () => {
  let cells = 0, none = 0;
  for (const seed of SEEDS) for (const kind of GUIDE_KINDS) for (let cx = -6; cx <= 6; cx++) for (let cy = -6; cy <= 6; cy++) {
    if (Math.abs(cx) + Math.abs(cy) < 2) continue; cells++; if (guideCellHost(seed, kind, cx, cy)) continue; none++;
    const [ox, oy] = G.kinds[kind].origin;
    for (let u = G.band[0]; u <= G.band[1]; u++) for (let v = G.band[0]; v <= G.band[1]; v++) { const rx = cx * G.cell + ox + u, ry = cy * G.cell + oy + v;
      assert.ok(!guideHostable(seed, kind, rx, ry), `${seed} ${kind} ${rx},${ry} could host`);
      assert.ok(openSeaSection(seed, rx, ry) || hamletSection(seed, rx, ry) || !!pentagonCentre(rx, ry) || Math.abs(rx) + Math.abs(ry) < G.kinds[kind].minDepth || ['4,-2', '-5,3'].includes(`${rx},${ry}`), `${seed} ${kind} ${rx},${ry}: why no host?`); }
  }
  assert.ok(none / cells < .05, `${none} of ${cells} cells without a host`);
});

test('on new ground every sampled host holds a reachable destination of its kind', () => {
  const done = { skyway: 0, shrine: 0, lair: 0 };
  for (const seed of ['GUIDE1', 'TIM1']) for (const kind of GUIDE_KINDS) for (const [cx, cy] of [[1, 0], [2, -2], [-2, 2], [1, 3], [3, 1], [-3, -1]]) {
    const h = guideCellHost(seed, kind, cx, cy); if (!h) continue; const g = visit(seed, h.rx, h.ry), m = g.map, seen = reached(m), at = `${seed} ${kind} ${h.rx},${h.ry}`;
    assert.equal(g.save.atlas[`${h.rx},${h.ry}`].guideVersion, G.version, at);
    if (kind === 'skyway') { const o = m.objects.find((q) => q.kind === 'skyStair'); assert.ok(o, `${at}: a skyway`);
      const foot = m.skyDiscs?.[0] || o; assert.ok(near(seen, foot.x, foot.y, o.skyway ? 2 : 1), `${at}: its foot reachable`); }
    if (kind === 'shrine') { const o = m.objects.find((q) => q.kind === 'watcherTomb' && q.where === 'shrine'); assert.ok(o, `${at}: a Watcher's Shrine`);
      assert.ok(near(seen, o.x, o.y, 1), `${at}: the shrine reachable`); assert.equal(g.save.atlas[`${h.rx},${h.ry}`].sites.find((q) => q.kind === 'watcherTomb')?.name, "Watcher's Shrine"); }
    if (kind === 'lair') { const b = g.enemies.find((e) => e.worldBeast); assert.ok(b, `${at}: a world boss`); assert.ok(g.save.atlas[`${h.rx},${h.ry}`].lairMet); }
    done[kind]++;
  }
  for (const k of GUIDE_KINDS) assert.ok(done[k] >= 8, `${k}: ${done[k]}`);
});

test('a lair calls a beast once, only a woken and free one, and not with no Aperture', () => {
  const h = guideCellHost('TIM1', 'lair', 2, -2), cold = freshSave(); cold.seed = 'TIM1';
  assert.equal(guideLairBeast(cold, h.rx, h.ry), null, 'no beast is woken at the start');
  const g0 = visit('TIM1', h.rx, h.ry, cold); assert.ok(!g0.enemies.some((e) => e.worldBeast), 'so the lair is empty');
  const s = woken('TIM1'), id = guideLairBeast(s, h.rx, h.ry); assert.ok(id);
  const g = visit('TIM1', h.rx, h.ry, s); assert.equal(s.worldBeasts[id].active.rx, h.rx); s.worldBeasts[id].active = null; s.worldBeasts[id].cooldown = 0;
  g.loadArea('overworld', false); assert.ok(!s.worldBeasts[id].active, 'a second visit calls nothing (atlas lairMet)');
  // and no red mark points at a lair no beast could fill
  const marks = wayfindingTargets(cold.seed, h.rx + 3, h.ry, 1, { ...cold, atlas: { [`${h.rx + 3},${h.ry}`]: { guideVersion: 1 } } });
  assert.ok(!marks.some((t) => t.kind === 'danger' && t.name === G.kinds.lair.name));
});

test('marks on guided ground point at the nearest unvisited host, on the true bearing, within reach', () => {
  for (const seed of ['GUIDE1', 'S0']) for (const [rx, ry] of [[14, 3], [-11, 17], [23, -9], [31, 28]]) {
    const g = visit(seed, rx, ry), cues = g.map.objects.filter((o) => o.kind === 'wayfindingCue' && o.guide);
    for (const kind of GUIDE_KINDS) {
      const signal = G.kinds[kind].signal, cue = cues.find((o) => o.signalKind === signal);
      const want = guideTarget(seed, kind, rx, ry, (x, y) => !!g.save.atlas[`${x},${y}`] || (kind === 'lair' && !guideLairBeast(g.save, x, y)));
      if (!want) { assert.ok(!cue || cue.name !== G.kinds[kind].name, `${seed} ${rx},${ry} ${kind}: no host in reach, no guide mark`); continue; }
      if (kind === 'lair' && cue && cue.name !== G.kinds.lair.name) continue; // a beast already holding ground nearer wins the red mark
      assert.ok(cue, `${seed} ${rx},${ry}: a ${kind} mark`); assert.deepEqual([cue.targetRx, cue.targetRy], [want.rx, want.ry]); assert.ok(want.d <= G.reach);
      const bearing = Math.atan2((want.ry - ry) * 32 + 16 - (cue.y + .55), (want.rx - rx) * 32 + 16 - (cue.x + .5)), drawn = Math.atan2(cue.dirY, cue.dirX);
      assert.ok(Math.abs(Math.atan2(Math.sin(bearing - drawn), Math.cos(bearing - drawn))) < .02, `${seed} ${rx},${ry} ${kind}: bearing`);
      assert.ok(!g.map.tiles[I(cue.x, cue.y)].blocked);
    }
  }
});

test('following one kind of mark always reaches a destination of that kind', () => {
  for (const seed of SEEDS) for (const kind of GUIDE_KINDS) for (let k = 0; k < 40; k++) {
    let rx = ((k * 37) % 61) - 30, ry = ((k * 53) % 59) - 29; const visited = new Set([`${rx},${ry}`]), skip = (x, y) => visited.has(`${x},${y}`);
    let t = guideTarget(seed, kind, rx, ry, skip); if (!t) continue; const start = t.d;
    for (let step = 0; step <= start; step++) { // a step toward the mark's destination, then the next section's mark
      if (rx === t.rx && ry === t.ry) break;
      if (Math.abs(t.rx - rx) >= Math.abs(t.ry - ry)) rx += Math.sign(t.rx - rx); else ry += Math.sign(t.ry - ry);
      if (rx === t.rx && ry === t.ry) break; visited.add(`${rx},${ry}`); const next = guideTarget(seed, kind, rx, ry, skip); assert.ok(next && next.d < start - step + 1, `${seed} ${kind} the trail goes on`); t = next;
    }
    assert.deepEqual([rx, ry], [t.rx, t.ry], `${seed} ${kind}: reached within ${start} steps`); assert.ok(guideHost(seed, kind, rx, ry));
  }
});

test('the trail picked up at one destination leads to the next of its kind about 8-10 sections out', () => {
  for (const kind of GUIDE_KINDS) { const all = [];
    for (const seed of SEEDS) for (let cx = -6; cx <= 6; cx++) for (let cy = -6; cy <= 6; cy++) { if (Math.abs(cx) + Math.abs(cy) < 3) continue; const h = guideCellHost(seed, kind, cx, cy); if (!h) continue;
      const next = guideTarget(seed, kind, h.rx, h.ry, (x, y) => x === h.rx && y === h.ry); if (next) all.push(next.d); }
    all.sort((a, b) => a - b); const share = (lo, hi) => all.filter((d) => d >= lo && d <= hi).length / all.length, median = all[all.length >> 1];
    assert.ok(all.length > 500, `${kind}: ${all.length} trails`);
    assert.ok(median >= G.pickup[0] && median <= G.pickup[1], `${kind}: median ${median}`);
    assert.ok(share(...G.pickup) >= .75, `${kind}: ${share(...G.pickup)} in ${G.pickup}`);
    assert.ok(share(G.pickup[0] - 1, G.pickup[1] + 1) >= .95, `${kind}: ${share(G.pickup[0] - 1, G.pickup[1] + 1)} within a section of it`);
    assert.ok(all.at(-1) <= G.reach, `${kind}: a trail always starts at the destination (max ${all.at(-1)})`);
  }
});

test('guided ground builds no neighbouring section for its marks, and a section load stays cheap', () => {
  const s = woken('PERF1'), g = new Game(s, 0); clearWayfindingCache(); clearGuideHosts();
  const rows = []; for (let k = 0; k < 12; k++) { g.rx = 12 + k; g.ry = -7; const t = performance.now(); g.loadArea('overworld', false); rows.push(performance.now() - t); }
  const stats = wayfindingCacheStats(); assert.equal(stats.misses, 0, 'no neighbouring region generated for the marks');
  assert.equal(warmWayfindingSignals(s.seed, g.rx, g.ry, 1, 1, s), true, 'nothing to warm on guided ground');
  rows.sort((a, b) => a - b); const median = rows[6]; assert.ok(median < 600, `median section load ${median.toFixed(1)} ms`);
  // the guide part alone, cold: nine cells per kind
  clearGuideHosts(); const t = performance.now(); for (let k = 0; k < 50; k++) wayfindingTargets(s.seed, 100 + k * 7, -40 + k * 3, 1, { ...s, atlas: { [`${100 + k * 7},${-40 + k * 3}`]: { guideVersion: 1 } } });
  const per = (performance.now() - t) / 50; console.log(`guide marks: ${per.toFixed(2)} ms per cold guided section; section loads median ${median.toFixed(1)} ms`); assert.ok(per < 25, `${per.toFixed(2)} ms per cold guided section`); assert.ok(guideHostCacheSize() <= G.memo);
  // the cues are the same each time, and the same after the caches are dropped
  const a = wayfindingCues(s.seed, 16, -7, 1, s, g.map); clearGuideHosts(); assert.deepEqual(wayfindingCues(s.seed, 16, -7, 1, s, g.map), a);
});

test('ground seen before the guides, and new ground that hosts nothing, regenerate exactly as on main', () => {
  // Digests of tiles, objects (marks aside), spawns, sky discs and creatures, computed on origin/main (release 896) and here.
  // `old` 1: a guide host loaded with a release-896 atlas record (no guideVersion): no skyway, shrine or lair is added.
  // `old` 0: new ground beside a host, hosting nothing: the same as main, the guides aside (three re-pinned with the gold cue gone,
  // which no longer stands on guided ground for other objects to keep clear of: PIN1 25,-3, 31,1 and 30,2).
  const OLD = { terrain: 'glass', landscapeVersion: 17, hamletVersion: 2, travelVersion: 1, seaVersion: 3, dreamVersion: 4, watcherVersion: 1, skyVersion: 3, skyPlace: 2, deepVersion: 1, buildingVersion: 2, farVersion: 6, compoundVersion: 1, labVersion: 1, castleVersion: 1, pentVersion: 5, canyonVersion: 1, ascendVersion: 1, indoorDungeonVersion: 1, landscape: 'isles' };
  const sha = (v) => crypto.createHash('sha1').update(JSON.stringify(v)).digest('hex').slice(0, 16);
  for (const [seed, rx, ry, old, hash] of PINNED) {
    const s = woken(seed); if (old) s.atlas = { [`${rx},${ry}`]: structuredClone(OLD) }; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); const m = g.map;
    if (old) assert.ok(GUIDE_KINDS.some((k) => guideHost(seed, k, rx, ry)), `${seed} ${rx},${ry} is a host`); else assert.ok(!GUIDE_KINDS.some((k) => guideHost(seed, k, rx, ry)));
    assert.equal(sha([m.tiles.map((t) => [t.kind, t.blocked ? 1 : 0, t.elev || 0, t.slope ? 1 : 0, t.wallSides || null, t.sigil || null]), (m.objects || []).filter((o) => o.kind !== 'wayfindingCue').map((o) => [o.id, o.kind, o.x, o.y]).sort(), (m.enemySpawns || []).map((e) => [e.kind, e.x, e.y]), m.skyDiscs || null, g.enemies.map((e) => [e.kind, e.worldBeast || null])]), hash, `${seed} ${rx},${ry} old ${old}`);
    if (old) assert.ok(!g.map.objects.some((o) => o.guide), 'old ground keeps the old marks');
  }
  // an unguided disc search is the release 587 one: the guided search only runs when asked
  assert.equal(SKY_DISCS.tries, 120);
});

test('the Pentagon sigil is much smaller', () => {
  const before = .62 * 2.3; // release 775's radius and long point, in tiles: about a tile and a half from the centre to the tip
  assert.ok(pentagonSigilReach() <= .65 && pentagonSigilReach() < before / 2, `${pentagonSigilReach()} tiles`);
  assert.ok(PENTAGON_SIGIL_MARK.radius < .62 / 2 + .01);
  const renderer = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'); assert.doesNotMatch(renderer, /r=s\*\.62/); assert.match(renderer, /drawPentagonSigilIcon\(ctx,s,o\.state==="read"\)/);
});

test('the smaller pentagon with the line (the release 729 gold cue) is gone from guided ground; ground seen before keeps it', () => {
  for (const seed of ['TIM1', 'GUIDE1']) for (const [rx, ry] of [[0, 4], [3, 9], [-7, 12], [18, -5], [25, 20]]) { const g = visit(seed, rx, ry);
    assert.ok(!g.map.objects.some((o) => o.kind === 'wayfindingCue' && o.signalKind === 'wonder'), `${seed} ${rx},${ry}`); }
  const old = { terrain: 'glass', landscapeVersion: 17, watcherVersion: 1, skyVersion: 3, skyPlace: 2, sigilVersion: 1 }; let kept = 0;
  for (const [rx, ry] of [[0, 4], [3, 9], [-7, 12], [18, -5], [25, 20], [-30, 22], [40, 8]]) { const s = woken('TIM1'); s.atlas = { [`${rx},${ry}`]: { ...old } }; const g = visit('TIM1', rx, ry, s);
    if (g.map.objects.some((o) => o.kind === 'wayfindingCue' && o.signalKind === 'wonder')) kept++; }
  assert.ok(kept > 0, 'the old cue still stands on ground seen before');
});

test('the Journal says where each mark leads', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /Amber marks lead toward a skyway/); assert.match(main, /Red marks lead toward a world boss/); assert.match(main, /Violet marks lead toward a Watcher's Shrine/);
  assert.match(main, /Five-sided sigil — Pentagon/); assert.match(main, /\["ring","chevron","triangle","spiral","pentagon"\]\.includes\(id\)/); assert.match(main, /drawPentagonSigilIcon\(ctx,82\)/);
  assert.doesNotMatch(main, /dungeon entrance or buried route/); assert.doesNotMatch(main, /shrine, ruin, or strange discovery/);
});

const PINNED = [
  ["PIN1", 13, 5, 1, "646f8e530ad2989c"],
  ["PIN1", 25, -4, 1, "4bff9e60df4dd9f3"],
  ["PIN1", -14, 15, 1, "26ed7ce98c4dce4d"],
  ["PIN1", 13, 24, 1, "6e8476c54e6841e7"],
  ["PIN1", 20, 10, 1, "cff87e349c807dee"],
  ["PIN1", 30, 1, 1, "150500f1876198c4"],
  ["PIN1", -12, 20, 1, "85bda7de0a27f72a"],
  ["PIN1", 20, 31, 1, "b6489a405708d6c3"],
  ["PIN1", 18, 4, 1, "2467da91d266eaee"],
  ["PIN1", 29, -7, 1, "1fd12fcae52ed9c8"],
  ["PIN1", -9, 14, 1, "4dc5a9b763c56d47"],
  ["PIN1", 18, 25, 1, "e6fdf4f5e25c45de"],
  ["PIN2", 14, 5, 1, "eb2b40891b7c3e8e"],
  ["PIN2", 23, -5, 1, "7ecded82a6dbba3b"],
  ["PIN2", -14, 15, 1, "46314bef15a78b03"],
  ["PIN2", 14, 25, 1, "c0fb7be7cdbb44be"],
  ["PIN2", 20, 9, 1, "a1aaf2d53d40dd8a"],
  ["PIN2", 30, 1, 1, "ca8827d5006c57ea"],
  ["PIN2", -11, 18, 1, "a7960345f3ba29ca"],
  ["PIN2", 18, 31, 1, "685b0b6651d7aff1"],
  ["PIN2", 19, 6, 1, "d87a5cb0ae105abb"],
  ["PIN2", 28, -5, 1, "33f82893bb0f95fa"],
  ["PIN2", -9, 14, 1, "70a7564a2981739b"],
  ["PIN2", 19, 24, 1, "78817edc90d5da70"],
  ["PIN1", 14, 5, 0, "d685b93f437343c8"],
  ["PIN1", 13, 6, 0, "900c063890c8b611"],
  ["PIN1", 26, -4, 0, "f0a75a0cc96adccf"],
  ["PIN1", 25, -3, 0, "56ac7a55529297a5"],
  ["PIN1", -13, 15, 0, "ee1ccb78ea8d786a"],
  ["PIN1", -14, 16, 0, "b7abbbed7a354a44"],
  ["PIN1", 14, 24, 0, "7b9170eb50a377e2"],
  ["PIN1", 13, 25, 0, "3039fa3928dade38"],
  ["PIN1", 21, 10, 0, "da9026a75501d14e"],
  ["PIN1", 20, 11, 0, "486f126dc880b277"],
  ["PIN1", 31, 1, 0, "9f3b04d0f30f2dff"],
  ["PIN1", 30, 2, 0, "191af15acbdc39e4"],
  ["PIN1", -11, 20, 0, "a2f2b07daa883f65"],
  ["PIN1", -12, 21, 0, "20ce73b63011e694"],
  ["PIN1", 21, 31, 0, "df220481f2db127f"],
  ["PIN1", 20, 32, 0, "9a775ea1579ecca6"],
  ["PIN1", 19, 4, 0, "dbe2591e16ad84b6"],
  ["PIN1", 18, 5, 0, "f26e609cd24e325d"],
  ["PIN1", 30, -7, 0, "2dfd2898bf2b389d"],
  ["PIN1", 29, -6, 0, "5326e92c8259b0e6"],
  ["PIN1", -8, 14, 0, "517090a4ebfb45f8"],
  ["PIN1", -9, 15, 0, "13371c6da0ae7531"],
  ["PIN1", 19, 25, 0, "f37e27c258ee0267"],
  ["PIN1", 18, 26, 0, "32f98ce1bd7e687d"]
];
