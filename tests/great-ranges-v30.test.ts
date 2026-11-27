// The Great Ranges (landscape version 30; the daily world-regions work; Tim's list: "great mountain ranges"). Far mountain regions and
// some Frostlands whose site is at least REGIONS_V30.minRing sections out may become long ranges of high ridges along the region's
// bearing: a gentle flank stepping up through foothills and crag to snow-capped summits, a sheer face on the other side (a fall that
// hurts, never one that kills), passes cut through at intervals, scree that slows, alpine lakes and meadows in the valleys, now and then
// a climbers' cache on a summit reached by a switchback trail. Ground first seen at version 29 or older regenerates byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, REGION_BANNER, footprintOpen } from '../src/game.ts';
import { generateRegion, sectionExits } from '../src/world.ts';
import { slideReach, slideCarry, tickRockslides, rockAlong, rockslideFallTime, rockslideDamage } from '../src/landscape.ts';
import { drawRockslides } from '../src/landscape-render.ts';
import { trapShareScale } from '../src/dungeon-traps.ts';
import { RANGES, RANGES_BLOCKED, REGIONS_V30, REGION_GROUNDS, REGION_NAMES, REGIONS, applyLandscape, applyDream, DREAM_VERSION, sectionRegion, regionAt, regionName, reachableFromPlaza, trappedTiles,
  coherenceCore, joinsCore, cohereSection, isLandscapeKind, canStep, LETHAL_KINDS, fallDamage, rangesAt, rangeFlow, LANDSCAPE_VERSION, DEEP_WATER, MAX_LEVEL, creatureRegions, COHERENCE } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS, sectionAtlasColor } from '../src/atlas-colors.ts';
import { drawLandscapeTile, landscapeTileAnimated, landscapeAtlasColor, RANGE_BRINK } from '../src/landscape-render.ts';
import { FAR_POCKETS } from '../src/far-realms.ts';
import { OUTDOOR, outdoorOutcropHeight } from '../src/close-view-outdoor.ts';
import { closeViewHazardCode } from '../src/close-view-gl.ts';
import { mireSpeed, MIRE } from '../src/water-traversal.ts';

const SEED = 'RANGE30', W = 32, idx = (x, y) => y * W + x, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KINDS = ['alpineMeadow', 'alpineLake', 'foothillGrass', 'rangeRock', 'rangeSnow', 'summitSnow', 'talusSlope', 'colTrail', 'rangeTrail', 'chuteSlope', 'rockfallSlope', 'crackedCrag', 'crestPinnacle'];
const make = (x, y, version = 30, opts = {}, seed = SEED) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version, ...opts }); return m; };
const walk = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < W;
// the same fingerprint as the Cloudfells', Oasis Ergs' and Magma Rivers' tests
const fp = (m) => createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, spawns: m.enemySpawns || null, canopy: m.canopy || null, mushrooms: m.mushrooms || null, weather: m.weather || null, landscape: m.landscape?.biome === 'dream' ? { ...m.landscape, version: 0 } : m.landscape || null })).digest('hex').slice(0, 16);
const pinned = (seed, x, y, v) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return m; };
const visit = (seed, x, y, atlas = null) => { const s = freshSave(); s.seed = seed; if (atlas) s.atlas = atlas; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return { g, s }; };
let found = null;
const sections = () => found ||= (() => { const out = []; for (const seed of [SEED, 'AUDIT-A', 'LUNA25']) { let n = 0; for (let x = 40; x < 400 && n < 16; x += 3) for (let y = 40; y < 400 && n < 16; y += 5) { const r = sectionRegion(seed, x, y, 30); if (r.type !== 'ranges' || r.hold < .5) continue; const m = make(x, y, 30, {}, seed); if (m.ranges) { out.push({ seed, x, y, m }); n++; } } } return out; })();

test('version 30 turns some far mountain regions and Frostlands into great ranges, about 2-4.5% of far sections; every other region, the heartland and the near world keep their version 29 type', () => {
  assert.equal(LANDSCAPE_VERSION, 30); assert.deepEqual(Object.keys(REGIONS_V30.chance), ['mountains', 'frost']); assert.equal(REGIONS_V30.minRing, 40); assert.equal(REGIONS_V30.to, 'ranges');
  assert.ok(REGIONS_V30.minRing > REGIONS.heartland + REGIONS.fadeIn);
  for (const seed of [SEED, 'LUNA25', 'AUDIT-A']) {
    const seen = new Set(); let far = 0, ranges = 0, from = 0, turned = 0;
    for (let x = -300; x <= 300; x += 3) for (let y = -300; y <= 300; y += 3) {
      const a = sectionRegion(seed, x, y, 29), b = sectionRegion(seed, x, y, 30); seen.add(b.type); assert.equal(a.id, b.id); assert.equal(a.hold, b.hold);
      if (!REGIONS_V30.chance[a.type]) assert.equal(b.type, a.type, `${seed} ${x},${y}`); else if (b.type !== 'ranges') assert.equal(b.type, a.type);
      if (Math.hypot(x, y) < REGIONS.heartland) assert.equal(b.type, 'wild', 'the heartland keeps the old mix');
      if (b.type === 'ranges') { const [cx, cy] = b.id.split(',').map(Number); assert.ok(Math.hypot((cx + .5) * REGIONS.cell, (cy + .5) * REGIONS.cell) >= REGIONS_V30.minRing - REGIONS.cell, 'the ranges lie far out'); }
      if (Math.hypot(x, y) >= 40) { far++; if (b.type === 'ranges') ranges++; if (REGIONS_V30.chance[a.type]) { from++; if (b.type === 'ranges') turned++; } }
    }
    assert.ok(seen.has('ranges') && seen.has('mountains') && seen.has('frost'), `${seed}: great ranges, and mountains and Frostlands still`);
    assert.ok(ranges / far > .02 && ranges / far < .045, `${seed}: ${(ranges / far * 100).toFixed(2)}% of far sections are great ranges`);
    assert.ok(turned / from > .2 && turned / from < .6, `${seed}: ${turned} of ${from} pool sections`);
    for (let x = -28; x <= 28; x++) for (let y = -28; y <= 28; y++) if (Math.hypot(x, y) < 28) assert.notEqual(sectionRegion(seed, x, y, 30).type, 'ranges', 'none near the Refuge');
  }
  const { x, y, seed } = sections()[0]; assert.notEqual(sectionRegion(seed, x, y, 29).type, 'ranges', 'version 29 has no great ranges');
  assert.ok(REGION_GROUNDS.ranges && REGION_GROUNDS.ranges.id === REGIONS_V30.to && REGION_BANNER.kinds.ranges === 'Great ranges' && REGION_NAMES.nouns.ranges.length >= 5);
  const names = new Set(sections().map((s) => regionName(s.seed, sectionRegion(s.seed, s.x, s.y, 30))));
  for (const n of names) assert.ok(REGION_NAMES.nouns.ranges.some((k) => n.startsWith('the ') && n.endsWith(` ${k}`)), n);
  assert.ok(names.size >= 4, [...names].join(', '));
  assert.equal(FAR_POCKETS.blobByRegion.ranges, 'frostBlob'); assert.equal(landscapeAtlasColor('ranges'), REGION_GROUNDS.ranges.atlas);
  for (const s of sections()) for (const t of s.m.tiles) if (t.landscape === 'frost' || t.landscape === 'mountains') { const r = regionAt(s.seed, s.x + (t.x + .5) / 32, s.y + (t.y + .5) / 32, 30); assert.ok(r.type !== 'ranges' || r.hold < 1, `${s.x},${s.y}: the Frostlands and the Snowpeak Range do not lay their ground over it (${t.x},${t.y} ${t.kind})`); }
});

test('the field: long ridges along the bearing, a gentle flank and a sheer one, passes cut through, lakes in the valleys; one world field', () => {
  const seen = new Set(); let along = 0, across = 0, faces = 0, lakes = 0, trails = 0, high = 0, n = 0; const levels = [0, 0, 0, 0, 0, 0];
  for (const id of ['10,10', '11,12', '9,14', '13,9']) { const f = rangeFlow(SEED, id); seen.add(`${f.ux.toFixed(3)},${f.uy.toFixed(3)}`); assert.ok(Math.abs(Math.hypot(f.ux, f.uy) - 1) < 1e-9);
    const at = (gx, gy) => rangesAt(SEED, f, gx, gy);
    for (let gy = 3000; gy < 3096; gy++) for (let gx = 3000; gx < 3096; gx++) { const q = at(gx, gy); n++; levels[q.level]++;
      assert.ok(q.level >= 0 && q.level <= MAX_LEVEL); assert.ok(KINDS.includes(q.kind), q.kind);
      if (q.kind === 'alpineLake' || q.kind === 'alpineMeadow') assert.equal(q.level, 0, 'lakes and meadows lie in the valleys'); if (q.kind === 'alpineLake') lakes++; if (q.kind === 'colTrail') trails++;
      if (q.kind === 'summitSnow') assert.ok(q.level >= RANGES.summit); if (q.kind === 'rangeSnow') assert.ok(q.level >= RANGES.snow); if (q.level >= 3) high++; if (q.cliff) { faces++; assert.ok(q.level > 0 && !q.col); }
      // along the bearing the ground changes less than across it: ridges, not blobs
      const a = at(Math.round(gx + f.ux * 3), Math.round(gy + f.uy * 3)), c = at(Math.round(gx - f.uy * 3), Math.round(gy + f.ux * 3)); along += Math.abs(a.level - q.level); across += Math.abs(c.level - q.level); } }
  assert.ok(seen.size >= 3, 'each region has its own bearing'); assert.ok(across > along * 1.6, `across ${across}, along ${along}`);
  console.log(`  levels ${levels.map((v) => (v / n * 100).toFixed(0) + '%').join('/')}; faces ${(faces / n * 100).toFixed(1)}%, lakes ${(lakes / n * 100).toFixed(1)}%, pass trails ${(trails / n * 100).toFixed(1)}%`);
  assert.ok(levels[0] > n * .25 && levels[0] < n * .6, `${levels[0]} valley tiles`); for (let l = 1; l <= 5; l++) assert.ok(levels[l] > n * .03, `level ${l}: ${levels[l]}`);
  assert.ok(high > n * .2 && faces > n * .02 && lakes > n * .02 && trails > n * .005, `${high} high, ${faces} faces, ${lakes} lake, ${trails} trail`);
  // a pass every col.period tiles or so: along any ridge's crest line the crest comes down to the col level
  const f = rangeFlow(SEED, '10,10'); let cols = 0; for (let u = 0; u < 600; u++) { const gx = 3000 + f.ux * u, gy = 3000 + f.uy * u, q = rangesAt(SEED, f, Math.floor(gx), Math.floor(gy)); if (q.col) cols++; }
  assert.ok(cols > 600 / RANGES.col.period, `${cols} pass tiles on 600 tiles of bearing`);
  for (let gy = 0; gy < 64; gy++) assert.deepEqual(rangesAt(SEED, f, 31, gy), rangesAt(SEED, f, 31, gy));
});

test('the surface: kinds, snow on the tops, sheer faces that hurt but never kill, lakes in the valleys, pinnacles on the crests, caches up a switchback trail; Atlas colours; drawn once; bounded', () => {
  const list = sections(); assert.ok(list.length >= 40, `${list.length} sections`);
  let lakes = 0, talus = 0, spires = 0, caches = 0, tiles = 0, high = 0, sheer = 0, withFaces = 0, trail = 0; const kinds = {}, levels = [0, 0, 0, 0, 0, 0];
  for (const { seed, x, y, m } of list) {
    const mine = m.tiles.filter((t) => t.landscape === 'ranges'); tiles += mine.length; assert.ok(mine.length <= 1024); let faces = 0;
    for (const t of mine) { assert.ok(KINDS.includes(t.kind), t.kind); kinds[t.kind] = (kinds[t.kind] || 0) + 1; assert.equal(!!t.blocked, RANGES_BLOCKED.includes(t.kind), `${x},${y} ${t.kind}`);
      assert.ok(!LETHAL_KINDS.has(t.kind) && !DEEP_WATER.includes(t.kind), 'nothing in the ranges kills'); if (!t.blocked) levels[t.elev || 0]++;
      const e = t.elev || 0; if (t.kind === 'alpineLake') { lakes++; assert.equal(e, 0, 'lakes lie in the valleys'); } if (t.kind === 'alpineMeadow') assert.equal(e, 0);
      if (t.kind === 'rangeSnow') assert.ok(e >= RANGES.snow); if (t.kind === 'summitSnow') assert.ok(e >= RANGES.summit); if (t.kind === 'foothillGrass') assert.ok(e > 0 && e < RANGES.rock);
      if (t.kind === 'talusSlope') { talus++; assert.ok(e >= RANGES.talus.minLevel && e <= RANGES.talus.maxLevel); } if (t.kind === 'rangeTrail') { trail++; assert.ok(e > 0); } if (!t.blocked && e >= 3) high++;
      if (walk(t)) for (const [dx, dy] of N4) { if (!inside(t.x + dx, t.y + dy)) continue; const q = m.tiles[idx(t.x + dx, t.y + dy)]; if (!walk(q)) continue; const d = e - (q.elev || 0);
        assert.ok(d <= RANGES.cliff.max, `${x},${y}: a drop of ${d} at ${t.x},${t.y}`); assert.notEqual(fallDamage(d, 100), Infinity, 'no fall kills'); if (d >= 2) faces++; } }
    sheer += faces; if (faces >= 3) { withFaces++; assert.ok(m.sheerFaces > 0, 'the map counts its brinks'); }
    const pp = mine.filter((t) => t.kind === 'crestPinnacle'); assert.equal(m.pinnacles || 0, pp.length); assert.ok(pp.length <= RANGES.pinnacle.max); spires += pp.length;
    for (const t of pp) assert.ok((t.elev || 0) >= RANGES.pinnacle.minLevel, 'a pinnacle stands on a high crest');
    const exact = m.landscape.biome !== 'castle' ? assert.equal : (a, b) => assert.ok(a >= b); // a castle built afterwards stands over some of it
    exact(m.alpineLakes || 0, mine.filter((t) => t.kind === 'alpineLake').length); exact(m.talus || 0, mine.filter((t) => t.kind === 'talusSlope').length);
    const added = m.objects.filter((o) => String(o.id).startsWith('ranges-')); assert.ok(added.length <= 1);
    for (const o of added) { caches++; assert.equal(o.kind, 'chest'); assert.equal(o.rewardSource, 'chest'); assert.equal(o.name, RANGES.cache.name); const t = m.tiles[idx(o.x, o.y)];
      assert.ok(['rangeSnow', 'summitSnow'].includes(t.kind) && t.elev >= RANGES.cache.minLevel, `${t.kind} ${t.elev}`); assert.ok(reachableFromPlaza(m)[idx(o.x, o.y)], 'the cache is reached');
      assert.ok(m.summitTrail > 0 && N4.some(([dx, dy]) => m.tiles[idx(o.x + dx, o.y + dy)].kind === 'rangeTrail' || (m.tiles[idx(o.x + dx, o.y + dy)].elev || 0) < t.elev), 'a trail climbs to it'); }
    for (const s of m.enemySpawns || []) assert.ok(walk(m.tiles[idx(Math.round(s.x), Math.round(s.y))]), `${x},${y}: a creature on open ground`);
    if (m.landscape.biome === 'ranges') assert.equal(m.weather, generateRegion(seed, x, y).weather, 'no weather of its own: nothing more each frame'); // (on a region's edge the Snowpeak Range may still own the section, with its snow)
    assert.equal(sectionRegion(seed, x, y, 30).type, REGIONS_V30.to, 'the section\'s region id names the ranges');
  }
  for (const k of ['alpineMeadow', 'alpineLake', 'foothillGrass', 'rangeRock', 'rangeSnow', 'summitSnow', 'talusSlope', 'colTrail']) assert.ok(kinds[k] > tiles * .01, `${k}: ${kinds[k]} of ${tiles}`);
  console.log(`  ${list.length} sections, ${tiles} tiles: ${lakes} lake, ${talus} talus, ${spires} pinnacles, ${caches} caches (${trail} trail tiles), ${high} tiles at level 3+, ${sheer} sheer edges (${withFaces} sections), levels ${levels.join('/')}`);
  assert.ok(lakes > tiles * .02 && lakes < tiles * .15, `${lakes} lake tiles`); assert.ok(talus > list.length && talus < tiles * .12, `${talus} talus`);
  assert.ok(spires >= list.length / 2 && caches >= 8 && trail >= caches * 2, `${spires} pinnacles, ${caches} caches, ${trail} trail`); assert.ok(high > tiles * .1, `${high} tiles at level 3+`);
  assert.ok(withFaces > list.length * .6, `${withFaces} of ${list.length} sections with sheer faces`);
  for (const k of KINDS) { assert.ok(ATLAS_TILE_COLORS[k], `${k} on the Atlas`); assert.ok(isLandscapeKind(k), k); assert.ok(!/pit|hole|void|abyss|lava|magma|cinder|ember|sea/i.test(k), `${k} is not read as a hazard or the sea by the Close View`); }
  for (const k of KINDS) { assert.equal(landscapeTileAnimated({ kind: k, landscape: 'ranges' }), false, `${k}: drawn once into the ground cache`); assert.equal(closeViewHazardCode({ kind: k }), 0, `${k}: firm ground in the Close View`); }
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  for (const { m } of list.filter((s) => s.m.pinnacles).slice(0, 4)) for (const t of m.tiles) if (t.landscape === 'ranges') assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, W), true);
  assert.equal(RANGE_BRINK.drop, 2, 'a brink is rimmed where stepping off hurts (FALL_DAMAGE 2)'); assert.ok(fallDamage(RANGE_BRINK.drop, 100) > 0);
  const full = list.map((s) => s.m).sort((a, b) => b.tiles.filter((t) => t.landscape === 'ranges').length - a.tiles.filter((t) => t.landscape === 'ranges').length).slice(0, 8);
  const mean = [0, 0, 0]; for (const m of full) { const c = sectionAtlasColor(m); [1, 3, 5].forEach((i, k) => mean[k] += parseInt(c.slice(i, i + 2), 16) / full.length); }
  const [r, g, b] = mean, own = [1, 3, 5].map((i) => parseInt(REGION_GROUNDS.ranges.atlas.slice(i, i + 2), 16));
  assert.ok(g > r + 10 && g > b + 10, `${mean.map(Math.round)}: the Atlas reads an alpine green`); assert.ok(Math.hypot(r - own[0], g - own[1], b - own[2]) < 30, `${mean.map(Math.round)}: near the region's own colour ${REGION_GROUNDS.ranges.atlas}`);
  // the region colours of the neighbouring lands (Cloudfells, Snowpeak Range, Frostlands, Rimeglaciers, Fog Moors, Deepwood, Savanna) and the Snowpeak Range's and Reef Flats' section means
  for (const [name, hex] of [['Cloudfells', '#98a491'], ['Snowpeak Range', '#d9e3ea'], ['Frostlands', '#dce9f2'], ['Rimeglaciers', '#8fc6e4'], ['Fog Moors', '#7f8a86'], ['Deepwood', '#2f5a34'], ['Savanna', '#c9a84a'], ['Snowpeak sections', '#6b736b'], ['Reef sections', '#839086']]) {
    const q = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); assert.ok(Math.hypot(own[0] - q[0], own[1] - q[1], own[2] - q[2]) > 25, `${REGION_GROUNDS.ranges.atlas}: apart from the ${name}`); }
});

// The solver: the real movement rules (landscape.ts canStep for the Wayfarer: walk level, jump one up, drop any height short of a fatal
// fall; lethal ground excluded; thin walls counted through the footprint, as worldgen-coherence's), searched both ways from the plaza.
function solve(m, from, reverse = false) {
  const go = new Uint8Array(1024), q = [idx(from.x, from.y)]; go[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i - x) / W; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = idx(nx, ny); if (!inside(nx, ny) || go[j] || !walk(m.tiles[j])) continue;
    const [a, b] = reverse ? [j, i] : [i, j], ax = a % W, ay = (a - ax) / W, bx = b % W, by = (b - bx) / W;
    const sl = m.tiles[a].slide; if (sl && (sl.dx !== bx - ax || sl.dy !== by - ay)) continue; // a scree chute is one way: down its fall line
    if (!canStep({ isPlayer: true, jumping: true }, m, W, ax, ay, bx, by)) continue; if (fallDamage((m.tiles[a].elev || 0) - (m.tiles[b].elev || 0), 100) === Infinity) continue;
    if (![.25, .5, .75].every((f) => footprintOpen(m, W, ax + (bx - ax) * f, ay + (by - ay) * f, true))) continue; go[j] = 1; q.push(j); } }
  return go;
}
test('traversable (solver): no trap, every exit, cache and summit joins the plaza both ways, the faces never cut ground off, the pinnacles neither', () => {
  let unOld = 0, unNew = 0, checked = 0, summits = 0, faced = 0;
  for (const { seed, x, y } of sections().slice(0, 42)) {
    const m = make(x, y, 30, { coherence: 1 }, seed); cohereSection(m); assert.equal(trappedTiles(m, W, W, { x: 16, y: 16 }, true).length, 0, `${x},${y}: a trap`);
    const core = coherenceCore(m), ex = sectionExits(seed, x, y), go = solve(m, { x: 16, y: 16 }), back = solve(m, { x: 16, y: 16 }, true);
    for (const [ex_, ey] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) { const t = m.tiles[idx(ex_, ey)]; if (!walk(t)) continue; assert.ok(joinsCore(m, { x: ex_, y: ey }, core), `${x},${y}: exit ${ex_},${ey}`); assert.ok(go[idx(ex_, ey)], `${x},${y}: the solver reaches exit ${ex_},${ey}`); assert.ok(back[idx(ex_, ey)], `${x},${y}: from exit ${ex_},${ey} back to the plaza`); checked++; }
    for (const o of m.objects.filter((q) => String(q.id).startsWith('ranges-cache'))) { assert.ok(joinsCore(m, o, core), `${x},${y}: the cache`); assert.ok(go[idx(o.x, o.y)] && back[idx(o.x, o.y)], 'to the cache and back'); }
    for (const t of m.tiles) if (t.landscape === 'ranges' && (t.elev || 0) >= 3 && go[idx(t.x, t.y)] && back[idx(t.x, t.y)]) summits++;
    let faces = 0; for (let i = 0; i < 1024; i++) if (go[i]) for (const [dx, dy] of N4) { const a = m.tiles[i]; if (!inside(a.x + dx, a.y + dy)) continue; const b = m.tiles[idx(a.x + dx, a.y + dy)]; if (b && walk(b) && a.landscape === 'ranges') { const d = (a.elev || 0) - (b.elev || 0); assert.ok(d < 4, 'no fatal ledge'); if (d >= 2) faces++; } }
    if (faces) faced++;
    // a sheer face cannot be climbed: the Wayfarer finds a way round (a pass, the gentle flank) or none is needed
    for (const a of m.tiles) for (const [dx, dy] of N4) { if (!inside(a.x + dx, a.y + dy)) continue; const b = m.tiles[idx(a.x + dx, a.y + dy)]; if (walk(a) && walk(b) && b.landscape === 'ranges' && (b.elev || 0) - (a.elev || 0) >= 2 && !b.slope && !a.slope) assert.equal(canStep({ isPlayer: true, jumping: true }, m, W, a.x, a.y, b.x, b.y), false); }
    // with every pinnacle lifted, the ground reached both ways is no larger than with them
    const plain = structuredClone(m); for (const t of plain.tiles) if (RANGES_BLOCKED.includes(t.kind)) { t.kind = 'rangeSnow'; t.blocked = false; }
    const pg = solve(plain, { x: 16, y: 16 }), pb = solve(plain, { x: 16, y: 16 }, true); for (let i = 0; i < 1024; i++) if (pg[i] && pb[i] && walk(m.tiles[i]) && !(go[i] && back[i])) assert.fail(`${x},${y}: ${i % 32},${i >> 5} cut off by a pinnacle`);
    const old = make(x, y, 29, { coherence: 1 }, seed); cohereSection(old); const ra = solve(old, { x: 16, y: 16 }); for (let i = 0; i < 1024; i++) { if (!ra[i] && walk(old.tiles[i])) unOld++; if (!go[i] && walk(m.tiles[i])) unNew++; }
  }
  console.log(`  ${checked} exits, ${summits} summit tiles reached both ways, ${faced} sections with sheer faces; unreached walkable ${unNew} (v29 ${unOld})`);
  assert.ok(checked > 120, `${checked} exits`); assert.ok(summits > 400, `${summits} summit tiles reached both ways`); assert.ok(faced > 25, `${faced} sections with sheer faces`);
  assert.ok(unNew <= unOld + 30, `walkable ground the plaza cannot reach: ${unNew} (version 29 on the same ground: ${unOld})`);
});

test('the switchback trail: from the plaza to the cache, never a step of more than one level, a stair at each climb', () => {
  let n = 0;
  for (const { m, x, y } of sections()) { const o = m.objects.find((q) => String(q.id).startsWith('ranges-cache')); if (!o) continue; n++;
    const trail = m.tiles.filter((t) => t.kind === 'rangeTrail'); assert.ok(trail.length >= 2, `${x},${y}: ${trail.length} trail tiles`);
    for (const t of trail) { assert.ok(!t.blocked && t.elev > 0); const next = N4.map(([dx, dy]) => inside(t.x + dx, t.y + dy) && m.tiles[idx(t.x + dx, t.y + dy)]).filter((q) => q && walk(q) && Math.abs((q.elev || 0) - t.elev) <= 1);
      assert.ok(next.length >= 2, `${x},${y}: the trail at ${t.x},${t.y} runs on one level at a time`);
      if (t.slope) assert.ok(N4.some(([dx, dy]) => inside(t.x + dx, t.y + dy) && (m.tiles[idx(t.x + dx, t.y + dy)].elev || 0) === t.elev + 1), 'a stair where the trail climbs'); }
    // anyone can walk it: the plaza reaches the cache stepping over the trail's stairs without a single jump
    const go = new Uint8Array(1024), q = [idx(16, 16)]; go[q[0]] = 1;
    for (let h = 0; h < q.length; h++) { const i = q[h], cx = i % W, cy = (i - cx) / W; for (const [dx, dy] of N4) { const nx = cx + dx, ny = cy + dy, j = idx(nx, ny); if (!inside(nx, ny) || go[j] || !walk(m.tiles[j])) continue; if (!canStep({ isPlayer: true, jumping: false }, m, W, cx, cy, nx, ny) && !canStep({ isPlayer: true, jumping: true }, m, W, cx, cy, nx, ny)) continue; go[j] = 1; q.push(j); } }
    assert.ok(go[idx(o.x, o.y)], `${x},${y}: the cache is walked to`);
  }
  assert.ok(n >= 8, `${n} caches`);
});

test('the real movement rules and the game: a jump climbs each step, talus slows the step, creatures keep room, the game lays the same land', () => {
  const { x, y, seed, m } = sections().find(({ seed, m, x, y }) => seed === SEED && m.pinnacles && m.talus && !visit(seed, x, y).g.map.hamlet);
  let up = 0; for (const a of m.tiles) for (const [dx, dy] of N4) { if (!inside(a.x + dx, a.y + dy)) continue; const b = m.tiles[idx(a.x + dx, a.y + dy)]; if (!walk(a) || !walk(b) || b.landscape !== 'ranges' || (b.elev || 0) !== (a.elev || 0) + 1) continue;
    assert.ok(canStep({ isPlayer: true, jumping: true }, m, W, a.x, a.y, b.x, b.y), `${x},${y}: jump ${a.x},${a.y} -> ${b.x},${b.y}`); assert.equal(canStep({ isPlayer: true, jumping: false }, m, W, a.x, a.y, b.x, b.y), !!(a.slope || b.slope)); up++; }
  assert.ok(up > 20, `${up} steps up`);
  assert.ok(mireSpeed('talusSlope') > .5 && mireSpeed('talusSlope') < .9, 'talus slows the step'); assert.ok(!MIRE.rotKinds.includes('talusSlope'), 'and never rots');
  for (const k of KINDS.filter((k) => k !== 'talusSlope')) assert.equal(mireSpeed(k), 1, `${k}: full speed`);
  const { g } = visit(seed, x, y);
  assert.ok(g.map.tiles.some((t) => t.kind === 'crestPinnacle') && g.map.tiles.some((t) => t.kind === 'rangeSnow' || t.kind === 'summitSnow'), 'the game lays the same range');
  assert.ok((g.map.enemySpawns || []).length > 0, 'creatures still place'); for (const e of g.map.enemySpawns) assert.ok(walk(g.map.tiles[idx(Math.round(e.x), Math.round(e.y))]), 'on open ground');
  assert.equal(g.map.landscape.name, 'Great Ranges'); assert.equal(g.map.landscape.biome, 'ranges', 'a clean region id for whatever later asks which land this is');
});

test('world coherence through the game on many seeds (WG-02, WG-08): every land exit reaches every other and the plaza, no creature on a pad it cannot leave', () => {
  const step = (map, x, y, dx, dy) => { const nx = x + dx, ny = y + dy; if (!inside(nx, ny)) return false; const a = map.tiles[idx(x, y)], b = map.tiles[idx(nx, ny)];
    if (!walk(b) || !canStep({ isPlayer: true, jumping: true }, map, W, x, y, nx, ny)) return false; if ((a.elev || 0) - (b.elev || 0) >= 4 && !(a.slope || b.slope)) return false;
    return [.25, .5, .75].every((f) => footprintOpen(map, W, x + dx * f, y + dy * f, true)); };
  const reach = (map, x, y) => { const seen = new Uint8Array(1024), q = [idx(x, y)]; seen[q[0]] = 1; for (let h = 0; h < q.length; h++) { const i = q[h], cx = i % W, cy = (i - cx) / W; for (const [dx, dy] of N4) { const j = idx(cx + dx, cy + dy); if (!inside(cx + dx, cy + dy) || seen[j] || !step(map, cx, cy, dx, dy)) continue; seen[j] = 1; q.push(j); } } return seen; };
  let loaded = 0, creatures = 0;
  for (const seed of ['RANGE30', 'WG-R1', 'WG-R2', 'WG-R3', 'WG-R4', 'WG-R5']) { let n = 0;
    for (let x = 41; x < 500 && n < 4; x += 7) for (let y = 43; y < 500 && n < 4; y += 9) { if (sectionRegion(seed, x, y, 30).type !== 'ranges' || sectionRegion(seed, x, y, 30).hold < .5) continue;
      const { g, s } = visit(seed, x, y); if (!g.map.ranges) continue; n++; loaded++; assert.equal(s.atlas[`${x},${y}`].landscapeVersion, 30);
      const ex = g.map.exits, lands = [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]].filter(([ax, ay]) => walk(g.map.tiles[idx(ax, ay)]) && !DEEP_WATER.includes(g.map.tiles[idx(ax, ay)].kind));
      const hub = reach(g.map, 16, 16); for (const a of lands) { assert.ok(hub[idx(...a)], `${seed} ${x},${y}: exit ${a} from the plaza`); const r = reach(g.map, ...a); for (const b of lands) assert.ok(r[idx(...b)], `${seed} ${x},${y}: exit ${a} to exit ${b}`); }
      for (const o of g.map.objects.filter((q) => String(q.id).startsWith('ranges-cache'))) assert.ok(hub[idx(o.x, o.y)], `${seed} ${x},${y}: the cache from the plaza`);
      const R = creatureRegions(g.map); for (const e of g.map.enemySpawns) { if (!/^pack-overworld/.test(e.id || '') && !e.settled) continue; creatures++; assert.ok(R.at(e.x, e.y) >= COHERENCE.creatureRegion, `${seed} ${x},${y}: ${e.id || e.kind} has ${R.at(e.x, e.y)} tiles`); } } }
  console.log(`  ${loaded} sections loaded through the game, ${creatures} creatures checked`);
  assert.ok(loaded >= 18, `${loaded} sections`);
});

test('neighbours agree on their shared edge: the same exit, open and at ground level on both sides; the ridges run on over the border', () => {
  let pair = null; for (let x = 40; x < 400 && !pair; x += 2) for (let y = 40; y < 400 && !pair; y += 3) if (sectionRegion(SEED, x, y, 30).type === 'ranges' && sectionRegion(SEED, x + 1, y, 30).type === 'ranges' && sectionRegion(SEED, x, y, 30).hold >= 1 && sectionRegion(SEED, x + 1, y, 30).id === sectionRegion(SEED, x, y, 30).id) {
    const e = sectionExits(SEED, x, y).east, a = make(x, y, 30, { coherence: 1 }), b = make(x + 1, y, 30, { coherence: 1 }); cohereSection(a); cohereSection(b); if (walk(a.tiles[idx(31, e)]) && walk(b.tiles[idx(0, e)])) pair = [x, y, a, b]; } // an exit on land (not a river along the border)
  assert.ok(pair); const [x, y, a, b] = pair, e = sectionExits(SEED, x, y).east; assert.equal(sectionExits(SEED, x + 1, y).west, e);
  const ta = a.tiles[idx(31, e)], tb = b.tiles[idx(0, e)]; assert.ok(walk(ta) && walk(tb)); assert.deepEqual([ta.elev || 0, tb.elev || 0], [0, 0]);
  assert.ok(joinsCore(a, { x: 31, y: e }) && joinsCore(b, { x: 0, y: e }));
  let n = 0, near = 0;
  for (let yy = 1; yy < 31; yy++) { const p = a.tiles[idx(31, yy)], q = b.tiles[idx(0, yy)]; if (!walk(p) || !walk(q)) continue; n++; if (Math.abs((p.elev || 0) - (q.elev || 0)) <= 1) near++; }
  assert.ok(n >= 1, `${n}`); assert.equal(near, n, 'no cliff opens where the border is open');
  const f = rangeFlow(SEED, sectionRegion(SEED, x, y, 30).id); let same = 0; for (let yy = 0; yy < 32; yy++) { const p = rangesAt(SEED, f, x * 32 + 31, y * 32 + yy), q = rangesAt(SEED, f, x * 32 + 32, y * 32 + yy); if (Math.abs(p.level - q.level) <= 1 || p.cliff || q.cliff) same++; }
  assert.ok(same >= 26, `${same} of 32 border rows agree on the height`);
});

test('deterministic: two fresh generations and two fresh game loads match; a hamlet keeps the colours but stays flat and firm', () => {
  for (const { seed, x, y, m } of sections().slice(0, 8)) assert.equal(fp(make(x, y, 30, {}, seed)), fp(m), `${x},${y}`);
  const { x, y, seed } = sections()[1], one = visit(seed, x, y), two = visit(seed, x, y);
  assert.equal(JSON.stringify(one.g.map.tiles), JSON.stringify(two.g.map.tiles)); assert.deepEqual(one.g.map.objects.map((o) => o.id), two.g.map.objects.map((o) => o.id));
  assert.equal(one.s.atlas[`${x},${y}`].landscapeVersion, 30); assert.ok(one.g.map.tiles.some((t) => t.landscape === 'ranges'));
  assert.equal(one.s.schemaVersion ?? 14, 14);
  const h = make(x, y, 30, { hamlet: true }, seed); assert.ok(h.tiles.some((t) => t.landscape === 'ranges')); assert.ok(h.tiles.filter((t) => t.landscape === 'ranges').every((t) => !t.elev && !t.blocked && t.kind !== 'talusSlope'));
  assert.ok(!h.objects.some((o) => String(o.id).startsWith('ranges-')));
});

test('older ground regenerates byte for byte: sections fingerprinted on main (2a70a6757, release 1081) before this change', () => {
  for (const [seed, v, x, y, hash] of PINS) assert.equal(fp(pinned(seed, x, y, v)), hash, `${seed} v${v} ${x},${y}`);
  const [seed, , x, y] = PINS.find((p) => sectionRegion(p[0], p[2], p[3], 30).type === 'ranges'); assert.ok(!pinned(seed, x, y, 29).tiles.some((t) => t.landscape === 'ranges') && make(x, y, 30, {}, seed).tiles.some((t) => t.landscape === 'ranges'), 'the same ground first seen at 30 is a great range');
});

test('in the game: ground first seen at version 29 keeps its version 29 ground; new ground pins 30', () => {
  const { x, y, seed } = sections()[0], old = visit(seed, x, y, { [`${x},${y}`]: { landscapeVersion: 29 } });
  assert.equal(old.s.atlas[`${x},${y}`].landscapeVersion, 29); assert.ok(!old.g.map.tiles.some((t) => t.landscape === 'ranges'), 'no great range on version 29 ground');
  const now = visit(seed, x, y); assert.equal(now.s.atlas[`${x},${y}`].landscapeVersion, 30); assert.ok(now.g.map.tiles.some((q) => q.landscape === 'ranges'));
});

test('Close View: thin deep-blue air over a tall far line of ranges; meadow and foothills read as grass, crag, talus and trails as rock, snow as snow, lakes as water; pinnacles stand up', () => {
  assert.equal(OUTDOOR.skyOf.ranges, 'ranges'); const sky = OUTDOOR.skies.ranges; assert.ok(sky);
  for (const k of Object.keys(OUTDOOR.skies.cold)) assert.ok(k in sky, `the sky has ${k}`);
  assert.ok(sky.ridgeH > OUTDOOR.skies.cold.ridgeH && sky.ridgeH > OUTDOOR.skies.fells.ridgeH, 'the tallest far ridge line'); assert.ok(sky.zenith[2] > sky.zenith[0] + 100, 'a deep blue high sky');
  const surface = (kind) => OUTDOOR.surfaces.find(([, re]) => re.test(kind))?.[0] || 'earth';
  for (const k of ['alpineMeadow', 'foothillGrass']) assert.equal(surface(k), 'grass', k); for (const k of ['rangeRock', 'talusSlope', 'colTrail', 'rangeTrail']) assert.equal(surface(k), 'rock', k);
  for (const k of ['rangeSnow', 'summitSnow']) assert.equal(surface(k), 'snow', k);
  assert.ok(OUTDOOR.waterKinds.test('alpineLake')); for (const k of KINDS.filter((k) => k !== 'alpineLake')) assert.ok(!OUTDOOR.waterKinds.test(k), k);
  const spire = outdoorOutcropHeight({ kind: 'crestPinnacle', x: 3, y: 4, elev: 4 }); assert.ok(spire >= 2.2 && spire <= 3.4, `${spire}`);
});

test('cost: generation only, within the cost of the Magma Rivers on this machine; nothing per frame', () => {
  const pick = (type, v) => { const out = []; for (let x = 40; x < 600 && out.length < 16; x += 3) for (let y = 40; y < 600 && out.length < 16; y += 5) { const r = sectionRegion(SEED, x, y, v); if (r.type === type && r.hold >= .5) out.push([x, y]); } return out; };
  const time = (list, v) => { let best = Infinity; for (let k = 0; k < 2; k++) { let ms = 0; for (const [x, y] of list) { const m = generateRegion(SEED, x, y); const t0 = performance.now(); applyLandscape(m, SEED, x, y, { version: v }); ms += performance.now() - t0; } best = Math.min(best, ms / list.length); } return best; };
  const ranges = pick('ranges', 30), magma = pick('magma', 30); assert.ok(ranges.length >= 12 && magma.length >= 12);
  time(ranges, 30); const a = time(ranges, 30), b = time(magma, 30), c = time(ranges, 29);
  console.log(`  great ranges (v30) ${a.toFixed(1)} ms a section; magma rivers ${b.toFixed(1)} ms; the same ground at v29 ${c.toFixed(1)} ms`);
  assert.ok(a < b * 1.6 + 6, `great ranges ${a.toFixed(1)} ms vs magma ${b.toFixed(1)} ms a section`);
});

// Fingerprints taken on main (2a70a6757, release 1081) before this change, with the fingerprint above: mountain and Frostlands regions (the
// pool) at versions 29, 28, 24, 9, 5 and 4, and other ground at 29; 36 of the 4,146 maps compared byte for byte against main for this change.
const PINS = [
  ['RANGE30', 29, -330, -330, '89464c60992a362d'], // dream
  ['RANGE30', 29, -330, -265, '6b0c03ef1c874d92'], // swamp
  ['RANGE30', 29, -330, -200, '52bff8dca61ec459'], // sea
  ['RANGE30', 29, -319, 281, '34dfdaf41d3586b1'], // mountains
  ['RANGE30', 24, -319, 281, '0e6b09cd6c0d7ab5'], // mountains
  ['RANGE30', 9, -319, 281, '40ab7f5e72f1b903'], // mountains
  ['RANGE30', 5, -319, 281, '4529811094e47c56'], // mountains
  ['RANGE30', 4, -319, 281, '847af97f092b9b7c'], // mountains
  ['RANGE30', 29, -308, -148, 'b3bacf86a9c05f47'], // mountains
  ['RANGE30', 28, -308, -148, 'a64fa7313f2cb201'], // mountains
  ['RANGE30', 29, -308, 190, 'c8f4b9b0591c21fd'], // frost
  ['RANGE30', 28, -308, 190, 'eaae1ef8533c1845'], // frost
  ['AUDIT-A', 29, -330, -330, 'e589bb024ddb4e22'], // reckoning
  ['AUDIT-A', 29, -330, -265, '103ac7f43cae31f8'], // lunar
  ['AUDIT-A', 29, -330, -200, 'a2fa3359d7675b6f'], // glacier
  ['AUDIT-A', 29, -308, 229, 'e9bffadab07a5ef6'], // mountains
  ['AUDIT-A', 24, -308, 229, '9f3325fbc50326f5'], // mountains
  ['AUDIT-A', 9, -308, 229, 'cbe2bee92e81b669'], // mountains
  ['AUDIT-A', 5, -308, 229, '16e1e3291859bdf2'], // mountains
  ['AUDIT-A', 4, -308, 229, '95165692fa26377f'], // mountains
  ['AUDIT-A', 29, -308, 255, 'e6e7dc4ff37418f5'], // mountains
  ['AUDIT-A', 28, -308, 255, 'c59f2f6e545f4986'], // mountains
  ['AUDIT-A', 29, -286, 255, '0eb9e45c3ca4194f'], // frost
  ['AUDIT-A', 28, -286, 255, '3568ab8b3ea59d4c'], // frost
  ['LUNA25', 29, -330, -330, '552d00d1d87bf1f0'], // magma
  ['LUNA25', 29, -330, -265, 'c688f300c2fd5a26'], // alien
  ['LUNA25', 29, -330, -213, '58e34a9dcb4e68f0'], // frost
  ['LUNA25', 24, -330, -213, '3536bf146401bfa2'], // frost
  ['LUNA25', 9, -330, -213, '179df97e92c75df5'], // frost
  ['LUNA25', 5, -330, -213, 'c0329f0783fae3ee'], // frost
  ['LUNA25', 4, -330, -213, 'c0fd2b6bafaf9cb5'], // frost
  ['LUNA25', 29, -330, -200, 'e89e449c4f65f4e0'], // forest
  ['LUNA25', 29, -319, -278, '30b16ce29fdff4ad'], // frost
  ['LUNA25', 28, -319, -278, '9b590ba49177d345'], // frost
  ['LUNA25', 29, -308, -278, 'f72d3e7895430872'], // mountains
  ['LUNA25', 28, -308, -278, 'fe38d043de754cea'], // mountains
];

// ---------------------------------------------------------------- scree chutes and rockslides (Tim, 2026-11-27)
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
const loaded = () => { const out = []; for (const { seed, x, y } of sections()) { if (out.length >= 14) break; const { g, s } = visit(seed, x, y); if (g.map.hamlet) continue; out.push({ seed, x, y, g, s }); } return out; };
let games = null; const gameSections = () => games ||= loaded();
const chain = (m, top) => { const run = [top]; let t = top; while (t.slide && run.length < 12) { t = m.tiles[idx(t.x + t.slide.dx, t.y + t.slide.dy)]; run.push(t); } return run; }; // the chute's tiles, then where it ends
const tops = (m) => m.tiles.filter((t) => t.slide && !N4.some(([dx, dy]) => { const q = inside(t.x - dx, t.y - dy) && m.tiles[idx(t.x - dx, t.y - dy)]; return q && q.slide && q.slide.dx === dx && q.slide.dy === dy; }));
const footTile = (g) => g.map.tiles[Math.floor(g.player.y + .75) * W + Math.floor(g.player.x + .5)];

test('scree chutes: down the fall line one level at a time, ending on open ground inside the section; at most a few a section; drawn with chevrons; streaked on the Atlas', () => {
  let chutes = 0, tiles = 0, sectionsWith = 0;
  for (const { m, x, y } of sections()) { const S = RANGES.slide, mine = tops(m); assert.ok(mine.length <= S.max, `${x},${y}: ${mine.length} chutes`); assert.equal(m.chutes || 0, mine.length); if (mine.length) sectionsWith++;
    for (const top of mine) { const run = chain(m, top), end = run[run.length - 1]; chutes++; tiles += run.length - 1;
      assert.ok(run.length - 1 >= S.len[0] && run.length - 1 <= S.len[1], `${x},${y}: a chute of ${run.length - 1}`);
      for (let k = 0; k < run.length - 1; k++) { const a = run[k], b = run[k + 1]; assert.equal(a.kind, 'chuteSlope'); assert.ok(a.slope, 'a chute is walked by anyone, so a dodge climbs it');
        assert.ok(Math.abs(a.slide.dx) + Math.abs(a.slide.dy) === 1); assert.ok((b.elev || 0) <= (a.elev || 0) && (a.elev || 0) - (b.elev || 0) <= 1, 'one level down at most, never up');
        assert.ok(a.x >= 1 && a.y >= 1 && a.x <= 30 && a.y <= 30, 'never on the border'); }
      assert.ok(walk(end) && !end.slide && !LETHAL_KINDS.has(end.kind) && end.x >= 1 && end.y >= 1 && end.x <= 30 && end.y <= 30, `${x},${y}: it ends on open ground inside the section`);
      assert.ok((end.elev || 0) < (top.elev || 0), 'it goes down');
      assert.ok(!m.objects.some((o) => Math.round(o.x) === end.x && Math.round(o.y) === end.y), 'nothing stands where it ends'); } }
  console.log(`  ${chutes} chutes (${tiles} tiles) in ${sectionsWith} of ${sections().length} sections`);
  assert.ok(sectionsWith > sections().length * .5 && chutes >= sections().length, `${chutes} chutes`);
  assert.ok(ATLAS_TILE_COLORS.chuteSlope && ATLAS_TILE_COLORS.rockfallSlope && ATLAS_TILE_COLORS.crackedCrag);
  const c = [1, 3, 5].map((i) => parseInt(ATLAS_TILE_COLORS.chuteSlope.slice(i, i + 2), 16)), t = [1, 3, 5].map((i) => parseInt(ATLAS_TILE_COLORS.talusSlope.slice(i, i + 2), 16)); assert.ok(Math.hypot(c[0] - t[0], c[1] - t[1], c[2] - t[2]) > 40, 'a chute reads apart from talus');
  let marks = 0; const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'lineTo' ? () => { marks++; } : () => {}, set: () => true });
  const { m } = sections().find((q) => q.m.chutes); const top = tops(m)[0]; const plain = { ...top }; delete plain.slide; drawLandscapeTile(ctx, plain, top.x, top.y, 32, m.tiles, W); const without = marks; marks = 0; drawLandscapeTile(ctx, top, top.x, top.y, 32, m.tiles, W); assert.ok(marks > without, 'downhill chevrons');
});

test('scree chutes in the game: standing carries you down to its foot, walking up still goes down (slower), repeated dodges climb it, and you are never held', () => {
  const pick = gameSections().map((q) => ({ ...q, run: tops(q.g.map).map((t) => chain(q.g.map, t)).find((r) => r.length >= 4 && r.every((t, k) => k === r.length - 1 || (t.slide.dx === r[0].slide.dx && t.slide.dy === r[0].slide.dy))) })).find((q) => q.run);
  assert.ok(pick, 'a straight chute of three or more'); const { g, run } = pick, p = g.player, top = run[0], end = run[run.length - 1], fx = top.slide.dx, fy = top.slide.dy; g.enemies = [];
  const put = (t) => { p.x = t.x; p.y = t.y; p.stamina = p.maxStamina = 1e6; p.invulnerableUntil = 0; }, along = () => (p.x - top.x) * fx + (p.y - top.y) * fy; let now = 5000;
  const run1 = (secs, input) => { for (let t = 0; t < secs; t += 1 / 30) g.update(1 / 30, input, now += 33); };
  put(top); run1(.5, idle); const idleGain = along(); run1(3, idle); assert.equal(footTile(g), end, `carried down to the foot of the chute (${footTile(g).x},${footTile(g).y} vs ${end.x},${end.y})`);
  put(top); run1(.5, { ...idle, state: { x: -fx, y: -fy } }); const walkGain = along(); assert.ok(walkGain > 0 && walkGain < idleGain * .8, `walking up it still goes down, slower: ${walkGain.toFixed(2)} vs ${idleGain.toFixed(2)} standing`);
  put(top); run1(.4, { ...idle, state: { x: fy, y: fx } }); assert.ok(!footTile(g).slide || along() < idleGain, 'stepping aside is free');
  // dodges up it: one press every 0.3 s, the stick pointing up the chute
  put(end); let dashes = 0; for (; dashes < 12 && footTile(g) !== top && !(along() < 0); dashes++) { let pressed = false; g.update(1 / 30, { ...idle, state: { x: -fx, y: -fy }, consume: (k) => k === 'dodge' && !pressed ? (pressed = true) : false }, now += 33); run1(.27, { ...idle, state: { x: -fx, y: -fy } }); }
  assert.ok(footTile(g) === top || along() < 0, `dodges climbed it (${dashes} dodges; at ${along().toFixed(2)})`); assert.ok(dashes >= 2 && dashes <= run.length + 4, `${dashes} dodges for ${run.length - 1} tiles`);
  // never held: on every chute tile the carry leads to open, lower ground, and slideCarry allocates nothing
  const out = { dx: 0, dy: 0 }; for (const t of run.slice(0, -1)) { const r = slideCarry(g.map, t.x, t.y, 0, 0, .1, out); assert.equal(r, out); assert.ok(Math.hypot(r.dx, r.dy) > 0); }
  assert.equal(slideCarry(g.map, end.x, end.y, 0, 0, .1, out), false, 'off the chute, nothing carries you');
});

test('scree chutes never trap: with every chute one-way down, the plaza reaches every exit, cache and summit both ways, and every chute\'s foot leads back', () => {
  let n = 0;
  for (const { seed, x, y } of sections().filter((q) => q.m.chutes).slice(0, 30)) { const m = make(x, y, 30, { coherence: 1 }, seed); cohereSection(m); n++;
    const go = slideReach(m), back = slideReach(m, undefined, true), sgo = solve(m, { x: 16, y: 16 }), sback = solve(m, { x: 16, y: 16 }, true), ex = sectionExits(seed, x, y);
    for (const [ax, ay] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) if (walk(m.tiles[idx(ax, ay)])) { assert.ok(go[idx(ax, ay)] && back[idx(ax, ay)], `${x},${y}: exit ${ax},${ay}`); assert.ok(sgo[idx(ax, ay)] && sback[idx(ax, ay)], `${x},${y}: solver exit ${ax},${ay}`); }
    for (const o of m.objects.filter((q) => String(q.id).startsWith('ranges-cache'))) assert.ok(sgo[idx(o.x, o.y)] && sback[idx(o.x, o.y)], `${x},${y}: the cache`);
    for (const t of m.tiles) if (t.slide && sgo[idx(t.x, t.y)]) { const run = chain(m, t), end = run[run.length - 1]; assert.ok(sback[idx(end.x, end.y)], `${x},${y}: from the foot of the chute at ${t.x},${t.y} back to the plaza`); } }
  assert.ok(n >= 20, `${n} sections`);
});

test('rockslides: a cracked crag over a lane of loose stones; at most three a section, one rolling at a time; nothing allocated as they run', () => {
  let zones = 0, periodic = 0; const K = RANGES.rockslide;
  for (const { m, x, y } of sections()) { const Z = m.rockslides || []; assert.ok(Z.length <= K.max, `${x},${y}: ${Z.length}`); zones += Z.length;
    for (const z of Z) { if (z.period) periodic++; assert.equal(m.tiles[idx(z.x, z.y)].kind, 'crackedCrag'); assert.ok(z.len >= K.len[0] && z.len <= K.len[1]); assert.equal(z.phase, 'armed');
      let prev = m.tiles[idx(z.x, z.y)]; for (let d = 1; d <= z.len; d++) { const t = m.tiles[idx(z.x + z.dx * d, z.y + z.dy * d)]; assert.equal(t.kind, 'rockfallSlope'); assert.equal(t.rockslide, z.id); assert.ok(walk(t) && (t.elev || 0) <= (prev.elev || 0), 'the lane runs down'); prev = t; }
      for (const q of Z) if (q !== z) assert.ok(Math.hypot(q.x - z.x, q.y - z.y) >= K.spacing); } }
  console.log(`  ${zones} rockslides (${periodic} periodic) in ${sections().length} sections`); assert.ok(zones >= sections().length * .5 && periodic >= 3, `${zones} zones, ${periodic} periodic`);
  for (let k = 0; k < K.rocks; k++) assert.ok(rockAlong({ len: 4 }, k, k * K.gap + .1) >= 0);
  assert.equal(rockAlong({ len: 4 }, 0, rockslideFallTime({ len: 4 }) + 1), -1);
});

test('rockslides: they trigger, warn, hit in their lane, miss outside it, reset; a periodic one goes off alone; one at a time', () => {
  const K = RANGES.rockslide, zone = (o = {}) => ({ id: 'z', x: 10, y: 5, dx: 0, dy: 1, len: 4, period: 0, phase: 'armed', timer: 0, hits: {}, ...o });
  const map = (zs) => { const tiles = []; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) tiles.push({ x, y, kind: 'foothillGrass' }); for (const z of zs) for (let d = 0; d <= z.len; d++) tiles[idx(z.x + z.dx * d, z.y + z.dy * d)].rockslide = z.id; return { tiles, rockslides: zs }; };
  let warned = 0; const world = (player, o = {}) => ({ player, guarded: false, level: 10, maxHp: 200, scale: trapShareScale(10), warn: () => warned++, ...o });
  const run = (m, w, secs, each = () => {}) => { let hurt = 0; for (let t = 0; t < secs; t += 1 / 30) { hurt += tickRockslides(m, w, 1 / 30); each(); } return hurt; };
  const dmg = rockslideDamage(10, 200, trapShareScale(10)); assert.ok(dmg >= Math.round(K.share * 200), `${dmg}`);
  // in the lane: warned, then hit once
  { const z = zone(), m = map([z]), p = { x: 10, y: 7.25, hp: 200 }, w = world(p); tickRockslides(m, w, 1 / 30); assert.equal(z.phase, 'warning'); assert.equal(warned, 1);
    const hurt = run(m, w, K.warn + rockslideFallTime(z) + .1); assert.equal(hurt, dmg); assert.equal(p.hp, 200 - dmg); assert.equal(z.phase, 'rest');
    run(m, w, K.rest + .1); assert.equal(z.phase, 'warning', 'rested, it wakes again for one still standing on it'); }
  // stepping out of the lane while it warns: missed
  { const z = zone(), m = map([z]), p = { x: 10, y: 7.25, hp: 200 }, w = world(p); tickRockslides(m, w, 1 / 30); p.x = 12; assert.equal(run(m, w, K.warn + rockslideFallTime(z) + .1), 0); run(m, w, K.rest + .1); assert.equal(z.phase, 'armed', 'and reset'); }
  // a jump (or a dodge's guard) clears the stones
  { const z = zone(), m = map([z]), p = { x: 10, y: 7.25, hp: 200 }, w = world(p, { guarded: true }); assert.equal(run(m, w, K.warn + rockslideFallTime(z) + .1), 0); }
  // a periodic one goes off with no one near
  { const z = zone({ period: 10, timer: 10 }), m = map([z]), p = { x: 25, y: 25, hp: 200 }, w = world(p); run(m, w, 9.8); assert.equal(z.phase, 'armed'); run(m, w, .4); assert.equal(z.phase, 'warning'); }
  // one at a time
  { const a = zone(), b = zone({ id: 'b', x: 20 }), m = map([a, b]), p = { x: 10, y: 7.25, hp: 200 }, w = world(p); tickRockslides(m, w, 1 / 30); p.x = 20; run(m, w, 1); assert.equal(b.phase, 'armed', 'the second waits while the first rolls'); }
  // drawing: shadows while it warns, stones while it falls
  { const z = zone(), m = map([z]); let fills = 0; const ctx = new Proxy({}, { get: (_, k) => k === 'fill' ? () => { fills++; } : () => {}, set: () => true });
    drawRockslides(ctx, m, (x) => x * 32, (y) => y * 32, 32, 0); assert.equal(fills, 0, 'nothing while armed'); z.phase = 'warning'; z.timer = .5; drawRockslides(ctx, m, (x) => x * 32, (y) => y * 32, 32, 0); assert.ok(fills >= z.len + 3, 'dust and shadows');
    fills = 0; z.phase = 'falling'; z.timer = rockslideFallTime(z) / 2; drawRockslides(ctx, m, (x) => x * 32, (y) => y * 32, 32, 0); assert.ok(fills >= 3, 'stones'); }
});

test('rockslides in the game: walking onto the lane wakes it with a warning; the stones hurt in the lane; a save in place keeps it rolling, leaving resets it', () => {
  const pick = gameSections().find((q) => q.g.map.rockslides?.some((z) => !z.period)); assert.ok(pick); const { g, seed, x, y } = pick, p = g.player, z = g.map.rockslides.find((q) => !q.period); g.enemies = [];
  for (const q of g.map.rockslides) if (q !== z) q.period = 0;
  let now = 5000; p.x = z.x + z.dx * 2; p.y = z.y + z.dy * 2; p.invulnerableUntil = 0; g.jumpUntil = 0; const hp0 = p.hp = p.maxHp = g.save.maxHp;
  g.update(1 / 30, idle, now += 33); assert.equal(z.phase, 'warning'); assert.match(g.message, /Stones shift/);
  for (let t = 0; t < RANGES.rockslide.warn + .2; t += 1 / 30) g.update(1 / 30, idle, now += 33); assert.equal(z.phase, 'falling');
  const saved = JSON.parse(JSON.stringify(g.exportSnapshot(now))); assert.equal(saved.session.areas[g.areaStateId()].rockslides[z.id].phase, 'falling', 'a save in place keeps it');
  const g2 = new Game(migrateSave(saved), now); assert.equal(g2.rx, x); const z2 = g2.map.rockslides.find((q) => q.id === z.id); assert.equal(z2.phase, 'falling'); assert.ok(Math.abs(z2.timer - z.timer) < 1e-9, 'exactly where it was');
  for (let t = 0; t < rockslideFallTime(z) + .2; t += 1 / 30) g.update(1 / 30, idle, now += 33); assert.ok(p.hp < hp0, `the stones hit (${hp0} -> ${p.hp})`); assert.equal(z.phase, 'rest');
  g.snapshotArea(true); assert.equal(g.save.session.areas[g.areaStateId()].rockslides, undefined, 'leaving resets it');
  const g3 = new Game(structuredClone(g.save), 0); g3.rx = x; g3.ry = y; g3.loadArea('overworld'); assert.ok(g3.map.rockslides.every((q) => q.phase === 'armed'));
  assert.equal(seed.length > 0, true);
});
