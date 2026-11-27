// The Cloudfells (landscape version 29; the daily world-regions work; Tim's list: "fog regions", "great mountain ranges"). Far Fog Moors
// and mountain regions whose site is at least REGIONS_V29.minRing sections out may become granite uplands standing out of a sea of low
// cloud: heather fells stepping up one level at a time to crag-paved tops with granite tors, and in the hollows under the cloud moss,
// peat hags that slow the step and wadeable tarns, now and then a shepherd's cache by a summit. Ground first seen at version 28 or older
// regenerates byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game, REGION_BANNER } from '../src/game.ts';
import { generateRegion, sectionExits } from '../src/world.ts';
import { FELLS, FELLS_BLOCKED, REGIONS_V29, REGION_GROUNDS, REGION_NAMES, REGIONS, applyLandscape, applyDream, DREAM_VERSION, sectionRegion, regionName, reachableFromPlaza, trappedTiles,
  coherenceCore, joinsCore, cohereSection, isLandscapeKind, canStep, LETHAL_KINDS, fallDamage, fellsAt, LANDSCAPE_VERSION, DEEP_WATER } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS, sectionAtlasColor } from '../src/atlas-colors.ts';
import { drawLandscapeTile, landscapeTileAnimated, landscapeAtlasColor } from '../src/landscape-render.ts';
import { FAR_POCKETS } from '../src/far-realms.ts';
import { OUTDOOR, outdoorOutcropHeight } from '../src/close-view-outdoor.ts';
import { closeViewHazardCode } from '../src/close-view-gl.ts';
import { mireSpeed, MIRE } from '../src/water-traversal.ts';

const SEED = 'FELLS29', W = 32, idx = (x, y) => y * W + x, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KINDS = ['fellGrass', 'fellCrag', 'screeSlope', 'cloudMoss', 'peatHag', 'tarnPool', 'graniteTor'];
const make = (x, y, version = 29, opts = {}, seed = SEED) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version, ...opts }); return m; };
const walk = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
// the same fingerprint as the Oasis Ergs' and Magma Rivers' tests
const fp = (m) => createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, spawns: m.enemySpawns || null, canopy: m.canopy || null, mushrooms: m.mushrooms || null, weather: m.weather || null, landscape: m.landscape?.biome === 'dream' ? { ...m.landscape, version: 0 } : m.landscape || null })).digest('hex').slice(0, 16);
const pinned = (seed, x, y, v) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return m; };
let found = null;
const sections = () => found ||= (() => { const out = []; for (const seed of [SEED, 'AUDIT-A']) for (let x = 40; x < 400 && out.length < (seed === SEED ? 30 : 42); x += 3) for (let y = 40; y < 400 && out.length < (seed === SEED ? 30 : 42); y += 5) { const r = sectionRegion(seed, x, y, 29); if (r.type !== 'fells' || r.hold < .5) continue; const m = make(x, y, 29, {}, seed); if (m.cloudfells) out.push({ seed, x, y, m }); } return out; })();

test('version 29 turns some far Fog Moors and mountain regions into cloudfells, about 1-4% of far sections; every other region, the heartland and the near world keep their version 28 type', () => {
  assert.equal(LANDSCAPE_VERSION, 30); assert.deepEqual(Object.keys(REGIONS_V29.chance), ['fog', 'mountains']); assert.equal(REGIONS_V29.minRing, 36); assert.equal(REGIONS_V29.to, 'fells');
  assert.ok(REGIONS_V29.minRing > REGIONS.heartland + REGIONS.fadeIn);
  for (const seed of [SEED, 'LUNA25', 'AUDIT-A']) {
    const seen = new Set(); let far = 0, fells = 0, from = 0, turned = 0;
    for (let x = -300; x <= 300; x += 3) for (let y = -300; y <= 300; y += 3) {
      const a = sectionRegion(seed, x, y, 28), b = sectionRegion(seed, x, y, 29); seen.add(b.type); assert.equal(a.id, b.id); assert.equal(a.hold, b.hold);
      if (!REGIONS_V29.chance[a.type]) assert.equal(b.type, a.type, `${seed} ${x},${y}`); else if (b.type !== 'fells') assert.equal(b.type, a.type);
      if (Math.hypot(x, y) < REGIONS.heartland) assert.equal(b.type, 'wild', 'the heartland keeps the old mix');
      if (b.type === 'fells') { const [cx, cy] = b.id.split(',').map(Number); assert.ok(Math.hypot((cx + .5) * REGIONS.cell, (cy + .5) * REGIONS.cell) >= REGIONS_V29.minRing - REGIONS.cell, 'the cloudfells lie far out'); }
      if (Math.hypot(x, y) >= 40) { far++; if (b.type === 'fells') fells++; if (REGIONS_V29.chance[a.type]) { from++; if (b.type === 'fells') turned++; } }
    }
    assert.ok(seen.has('fells') && seen.has('mountains') && seen.has('fog'), `${seed}: cloudfells, and mountains and fog moors still`);
    assert.ok(fells / far > .01 && fells / far < .04, `${seed}: ${(fells / far * 100).toFixed(2)}% of far sections are cloudfells`);
    assert.ok(turned / from > .2 && turned / from < .65, `${seed}: ${turned} of ${from} pool sections`);
    for (let x = -24; x <= 24; x++) for (let y = -24; y <= 24; y++) if (Math.hypot(x, y) < 24) assert.notEqual(sectionRegion(seed, x, y, 29).type, 'fells', 'none near the Refuge');
  }
  const { x, y } = sections()[0]; assert.notEqual(sectionRegion(SEED, x, y, 28).type, 'fells', 'version 28 has no cloudfells');
  assert.ok(REGION_GROUNDS.fells && REGION_GROUNDS.fells.id === REGIONS_V29.to && REGION_BANNER.kinds.fells === 'Cloudfells' && REGION_NAMES.nouns.fells.length >= 5);
  const names = new Set(sections().map((s) => regionName(s.seed, sectionRegion(s.seed, s.x, s.y, 29))));
  for (const n of names) assert.ok(REGION_NAMES.nouns.fells.some((k) => n.startsWith('the ') && n.endsWith(` ${k}`)), n);
  assert.ok(names.size >= 3, [...names].join(', '));
  assert.equal(FAR_POCKETS.blobByRegion.fells, 'mossBlob'); assert.equal(landscapeAtlasColor('fells'), REGION_GROUNDS.fells.atlas);
  assert.ok(!sections().some((s) => s.m.tiles.some((t) => t.landscape === 'fog' || t.landscape === 'mountains') && sectionRegion(s.seed, s.x, s.y, 29).hold >= 1), 'the Fog Moors and the Snowpeak Range do not lay their ground over it');
});

test('the field: a rolling height cut into levels 0-4, cloud, peat and tarns at level 0, heather, crag-paved tops above; one world field', () => {
  const kinds = {}, levels = [0, 0, 0, 0, 0]; let steps = 0; const at = new Map();
  for (let gy = 4000; gy < 4160; gy++) for (let gx = 4000; gx < 4160; gx++) { const q = fellsAt(SEED, gx, gy); at.set(gx * 9999 + gy, q); kinds[q.kind] = (kinds[q.kind] || 0) + 1; levels[q.level]++;
    assert.ok(q.level >= 0 && q.level <= FELLS.height.levels);
    if (['cloudMoss', 'peatHag', 'tarnPool'].includes(q.kind)) assert.equal(q.level, 0, 'the cloud lies in the hollows'); else assert.ok(q.level > 0);
    if (q.kind === 'fellCrag') assert.ok(q.level >= FELLS.crag.minLevel); }
  for (let gy = 4000; gy < 4159; gy++) for (let gx = 4000; gx < 4159; gx++) { const p = at.get(gx * 9999 + gy), q = at.get((gx + 1) * 9999 + gy), r = at.get(gx * 9999 + gy + 1); if (Math.abs(p.level - q.level) > 1 || Math.abs(p.level - r.level) > 1) steps++; }
  const n = 160 * 160; console.log(`  levels ${levels.map((v) => (v / n * 100).toFixed(0) + '%').join('/')}`);
  assert.ok(levels[0] > n * .2 && levels[0] < n * .5, `${levels[0]} tiles under the cloud`); for (let l = 1; l <= 4; l++) assert.ok(levels[l] > n * .05, `level ${l}: ${levels[l]}`);
  assert.ok(steps < n * .03, `${steps} natural steps of two (the sweeps take them out)`);
  for (const k of ['fellGrass', 'fellCrag', 'cloudMoss', 'peatHag', 'tarnPool']) assert.ok(kinds[k] > n * .02, `${k}: ${kinds[k]}`);
  for (let gy = 0; gy < 64; gy++) assert.deepEqual(fellsAt(SEED, 31, gy), fellsAt(SEED, 31, gy));
});

test('the surface: kinds, every step one level, the cloud at level 0, tors on the tops, peat and tarns under the cloud, caches by a summit; Atlas colours; drawn once; bounded', () => {
  const list = sections(); assert.ok(list.length >= 40, `${list.length} sections`);
  let tarns = 0, peat = 0, tors = 0, caches = 0, tiles = 0, high = 0; const kinds = {}, levels = [0, 0, 0, 0, 0, 0];
  for (const { seed, x, y, m } of list) {
    const mine = m.tiles.filter((t) => t.landscape === 'fells'); tiles += mine.length; assert.ok(mine.length <= 1024);
    for (const t of mine) { assert.ok(KINDS.includes(t.kind), t.kind); kinds[t.kind] = (kinds[t.kind] || 0) + 1; assert.equal(!!t.blocked, FELLS_BLOCKED.includes(t.kind), `${x},${y} ${t.kind}`);
      assert.ok(!LETHAL_KINDS.has(t.kind) && !DEEP_WATER.includes(t.kind), 'nothing in the fells kills'); if (!t.blocked) levels[t.elev || 0]++;
      if (t.kind === 'tarnPool') { tarns++; assert.equal(t.elev || 0, 0, 'tarns lie under the cloud'); } if (t.kind === 'peatHag') { peat++; assert.equal(t.elev || 0, 0); }
      if (t.kind === 'cloudMoss') assert.equal(t.elev || 0, 0, 'the cloud lies at level 0'); if (t.kind === 'fellCrag' && !t.slope) assert.ok((t.elev || 0) >= FELLS.crag.minLevel, 'crag on the tops');
      if (t.kind === 'fellGrass' || t.kind === 'screeSlope') assert.ok((t.elev || 0) > 0 || t.slope, `${t.kind} above the cloud`); if (!t.blocked && (t.elev || 0) >= 3) high++; }
    for (const t of mine) if (walk(t)) for (const [dx, dy] of N4) { const n = m.tiles[idx(t.x + dx, t.y + dy)]; if (t.x + dx < 0 || t.x + dx > 31 || !n || n.landscape !== 'fells' || !walk(n)) continue; assert.ok(Math.abs((n.elev || 0) - (t.elev || 0)) <= 1, `${x},${y}: a step of two at ${t.x},${t.y}`); }
    const tt = mine.filter((t) => t.kind === 'graniteTor'); assert.equal(m.tors || 0, tt.length); assert.ok(tt.length <= FELLS.tor.max); tors += tt.length;
    for (const t of tt) assert.ok((t.elev || 0) >= FELLS.tor.minLevel, 'a tor stands on a top');
    assert.equal(m.tarns || 0, mine.filter((t) => t.kind === 'tarnPool').length); assert.equal(m.peatHags || 0, mine.filter((t) => t.kind === 'peatHag').length);
    const added = m.objects.filter((o) => String(o.id).startsWith('fells-')); assert.ok(added.length <= 1);
    for (const o of added) { caches++; assert.equal(o.kind, 'chest'); assert.equal(o.rewardSource, 'chest'); assert.equal(o.name, FELLS.cache.name); assert.equal(m.tiles[idx(o.x, o.y)].kind, 'fellCrag'); assert.ok(m.tiles[idx(o.x, o.y)].elev >= FELLS.cache.minLevel); assert.ok(reachableFromPlaza(m)[idx(o.x, o.y)], 'the cache is reached'); }
    for (const s of m.enemySpawns || []) assert.ok(walk(m.tiles[idx(Math.round(s.x), Math.round(s.y))]), `${x},${y}: a creature on open ground`);
    assert.equal(m.weather, generateRegion(seed, x, y).weather, 'no weather of its own: nothing more each frame (the cloud is painted)');
    assert.equal(sectionRegion(seed, x, y, 29).type, REGIONS_V29.to, 'the section\'s region id names the fells');
  }
  for (const k of ['fellGrass', 'fellCrag', 'screeSlope', 'cloudMoss', 'peatHag', 'tarnPool']) assert.ok(kinds[k] > tiles * .015, `${k}: ${kinds[k]} of ${tiles}`);
  console.log(`  ${list.length} sections, ${tiles} tiles: ${tarns} tarn, ${peat} peat, ${tors} tors, ${caches} caches, ${high} tiles at level 3+, levels ${levels.join('/')}`);
  assert.ok(tarns > tiles * .02 && tarns < tiles * .15, `${tarns} tarn tiles in ${tiles}`); assert.ok(peat > list.length && peat < tiles * .15, `${peat} peat`);
  assert.ok(tors >= list.length && caches >= 5, `${tors} tors, ${caches} caches`); assert.ok(high > tiles * .04, `${high} tiles at level 3+`);
  for (const k of KINDS) { assert.ok(ATLAS_TILE_COLORS[k], `${k} on the Atlas`); assert.ok(isLandscapeKind(k), k); assert.ok(!/pit|hole|void|abyss|lava|magma|cinder|ember/i.test(k), `${k} is not read as a hazard by the Close View`); }
  for (const k of KINDS) { assert.equal(landscapeTileAnimated({ kind: k, landscape: 'fells' }), false, `${k}: drawn once into the ground cache`); assert.equal(closeViewHazardCode({ kind: k }), 0, `${k}: firm ground in the Close View`); }
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  for (const { m } of list.filter((s) => s.m.tors).slice(0, 4)) for (const t of m.tiles) if (t.landscape === 'fells') assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, W), true);
  const full = list.map((s) => s.m).sort((a, b) => b.tiles.filter((t) => t.landscape === 'fells').length - a.tiles.filter((t) => t.landscape === 'fells').length)[0];
  const c = sectionAtlasColor(full), [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); assert.ok(g > r + 3 && g > b + 5 && r > 110, `${c}: the Atlas reads a pale sage green (cloud over green fells)`);
  assert.ok(Math.hypot(r - parseInt(REGION_GROUNDS.fells.atlas.slice(1, 3), 16), g - parseInt(REGION_GROUNDS.fells.atlas.slice(3, 5), 16), b - parseInt(REGION_GROUNDS.fells.atlas.slice(5, 7), 16)) < 30, `${c}: near the region's own colour ${REGION_GROUNDS.fells.atlas}`);
  // the region colours of the neighbouring grey and pale lands (Fog Moors, Snowpeak Range, Moonlands, Frostlands, Rimeglaciers) and the Salt Marsh's section mean
  for (const [name, hex] of [['Fog Moors', '#7f8a86'], ['Snowpeak Range', '#d9e3ea'], ['Moonlands', '#b4b7bf'], ['Frostlands', '#dce9f2'], ['Rimeglaciers', '#8fc6e4'], ['Salt Marsh', '#bec4ba']]) { const q = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); assert.ok(Math.hypot(r - q[0], g - q[1], b - q[2]) > 25, `${c}: apart from the ${name}`); }
});

// The solver: the real movement rules (landscape.ts canStep for the Wayfarer: walk level, jump one up, drop any height; lethal
// ground excluded; thin walls counted), searched both ways from the plaza.
function solve(m, from, reverse = false) {
  const go = new Uint8Array(1024), q = [idx(from.x, from.y)]; go[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i - x) / W; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = idx(nx, ny); if (nx < 0 || ny < 0 || nx >= W || ny >= W || go[j] || !walk(m.tiles[j])) continue;
    const [a, b] = reverse ? [j, i] : [i, j], ax = a % W, ay = (a - ax) / W, bx = b % W, by = (b - bx) / W;
    if (!canStep({ isPlayer: true, jumping: true }, m, W, ax, ay, bx, by)) continue; if (fallDamage((m.tiles[a].elev || 0) - (m.tiles[b].elev || 0), 100) === Infinity) continue; go[j] = 1; q.push(j); } }
  return go;
}
test('traversable (solver): no trap, every exit, cache and summit joins the plaza both ways, no drop kills, the tors never cut ground off', () => {
  let unOld = 0, unNew = 0, checked = 0, summits = 0;
  for (const { seed, x, y } of sections().slice(0, 42)) {
    const m = make(x, y, 29, { coherence: 1 }, seed); cohereSection(m); assert.equal(trappedTiles(m, W, W, { x: 16, y: 16 }, true).length, 0, `${x},${y}: a trap`);
    const core = coherenceCore(m), ex = sectionExits(seed, x, y), go = solve(m, { x: 16, y: 16 }), back = solve(m, { x: 16, y: 16 }, true);
    for (const [ex_, ey] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) { const t = m.tiles[idx(ex_, ey)]; if (!walk(t)) continue; assert.ok(joinsCore(m, { x: ex_, y: ey }, core), `${x},${y}: exit ${ex_},${ey}`); assert.ok(go[idx(ex_, ey)], `${x},${y}: the solver reaches exit ${ex_},${ey}`); assert.ok(back[idx(ex_, ey)], `${x},${y}: from exit ${ex_},${ey} back to the plaza`); checked++; }
    for (const o of m.objects.filter((q) => String(q.id).startsWith('fells-cache'))) { assert.ok(joinsCore(m, o, core), `${x},${y}: the cache`); assert.ok(go[idx(o.x, o.y)] && back[idx(o.x, o.y)], 'to the cache and back'); }
    for (const t of m.tiles) if (t.kind === 'fellCrag' && (t.elev || 0) >= 3 && go[idx(t.x, t.y)] && back[idx(t.x, t.y)]) summits++;
    for (let i = 0; i < 1024; i++) if (go[i]) for (const [dx, dy] of N4) { const a = m.tiles[i], b = m.tiles[idx(a.x + dx, a.y + dy)]; if (b && walk(b) && a.landscape === 'fells') assert.ok((a.elev || 0) - (b.elev || 0) < 4, 'no fatal ledge'); }
    // with every tor lifted, the ground reached both ways is no larger than with them
    const plain = structuredClone(m); for (const t of plain.tiles) if (FELLS_BLOCKED.includes(t.kind)) { t.kind = 'fellCrag'; t.blocked = false; }
    const pg = solve(plain, { x: 16, y: 16 }), pb = solve(plain, { x: 16, y: 16 }, true); for (let i = 0; i < 1024; i++) if (pg[i] && pb[i] && walk(m.tiles[i]) && !(go[i] && back[i])) assert.fail(`${x},${y}: ${i % 32},${i >> 5} cut off by a tor`);
    const old = make(x, y, 28, {}, seed), ra = reachableFromPlaza(old), rb = solve(m, { x: 16, y: 16 }); for (let i = 0; i < 1024; i++) { if (!ra[i] && walk(old.tiles[i])) unOld++; if (!rb[i] && walk(m.tiles[i])) unNew++; }
  }
  assert.ok(checked > 90, `${checked} exits`); assert.ok(summits > 60, `${summits} summit tiles reached both ways`);
  assert.ok(unNew <= unOld + 30, `walkable ground the plaza cannot reach: ${unNew} (version 28 on the same ground: ${unOld})`);
});

test('the real movement rules: a jump climbs each fell, peat hags slow the step and never rot, creatures still have room, the game lays the same land', () => {
  const hamlet = (x, y) => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return (g.map.objects || []).some((o) => o.kind === 'shelterMerchant' || o.kind === 'villager'); };
  const { x, y, m } = sections().find(({ seed, m, x, y }) => seed === SEED && m.tors && m.tiles.some((t) => t.kind === 'peatHag') && !hamlet(x, y));
  let up = 0; for (const a of m.tiles) for (const [dx, dy] of N4) { const b = m.tiles[idx(a.x + dx, a.y + dy)]; if (a.x + dx < 0 || a.x + dx > 31 || !walk(a) || !walk(b) || b.landscape !== 'fells' || (b.elev || 0) !== (a.elev || 0) + 1) continue;
    assert.ok(canStep({ isPlayer: true, jumping: true }, m, W, a.x, a.y, b.x, b.y), `${x},${y}: jump ${a.x},${a.y} -> ${b.x},${b.y}`); assert.equal(canStep({ isPlayer: true, jumping: false }, m, W, a.x, a.y, b.x, b.y), !!(a.slope || b.slope)); up++; }
  assert.ok(up > 20, `${up} steps up`);
  assert.ok(mireSpeed('peatHag') > .3 && mireSpeed('peatHag') < .8, 'peat hags slow the step'); assert.ok(!MIRE.rotKinds.includes('peatHag'), 'and never rot');
  for (const k of KINDS.filter((k) => k !== 'peatHag')) assert.equal(mireSpeed(k), 1, `${k}: full speed`);
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.ok(g.map.tiles.some((t) => t.kind === 'graniteTor') && g.map.tiles.some((t) => t.kind === 'cloudMoss'), 'the game lays the same fells');
  assert.ok((g.map.enemySpawns || []).length > 0, 'creatures still place'); for (const e of g.map.enemySpawns) assert.ok(walk(g.map.tiles[idx(Math.round(e.x), Math.round(e.y))]), 'on open ground');
  assert.equal(g.map.landscape.name, 'Cloudfells'); assert.equal(g.map.landscape.biome, 'fells', 'a clean region id for whatever later asks which land this is');
});

test('neighbours agree on their shared edge: the same exit, open and at ground level on both sides; the fells run on over the border', () => {
  let pair = null; for (let x = 40; x < 400 && !pair; x += 2) for (let y = 40; y < 400 && !pair; y += 3) if (sectionRegion(SEED, x, y, 29).type === 'fells' && sectionRegion(SEED, x + 1, y, 29).type === 'fells' && sectionRegion(SEED, x, y, 29).hold >= 1 && sectionRegion(SEED, x + 1, y, 29).id === sectionRegion(SEED, x, y, 29).id) pair = [x, y];
  assert.ok(pair); const [x, y] = pair, a = make(x, y, 29, { coherence: 1 }), b = make(x + 1, y, 29, { coherence: 1 }); cohereSection(a); cohereSection(b);
  const e = sectionExits(SEED, x, y).east; assert.equal(sectionExits(SEED, x + 1, y).west, e);
  const ta = a.tiles[idx(31, e)], tb = b.tiles[idx(0, e)]; assert.ok(walk(ta) && walk(tb)); assert.deepEqual([ta.elev || 0, tb.elev || 0], [0, 0]);
  assert.ok(joinsCore(a, { x: 31, y: e }) && joinsCore(b, { x: 0, y: e }));
  let n = 0, near = 0;
  for (let yy = 1; yy < 31; yy++) { const p = a.tiles[idx(31, yy)], q = b.tiles[idx(0, yy)]; if (!walk(p) || !walk(q)) continue; n++; if (Math.abs((p.elev || 0) - (q.elev || 0)) <= 1) near++; }
  assert.ok(n >= 1, `${n}`); assert.equal(near, n, 'no cliff opens where the border is open');
  let same = 0; for (let yy = 0; yy < 32; yy++) { const p = fellsAt(SEED, x * 32 + 31, y * 32 + yy), q = fellsAt(SEED, x * 32 + 32, y * 32 + yy); if (Math.abs(p.level - q.level) <= 1) same++; }
  assert.ok(same >= 26, `${same} of 32 border rows agree on the height`);
});

test('deterministic: two fresh generations and two fresh game loads match; a hamlet keeps the colours but stays flat and firm', () => {
  for (const { seed, x, y, m } of sections().slice(0, 8)) assert.equal(fp(make(x, y, 29, {}, seed)), fp(m), `${x},${y}`);
  const { x, y } = sections()[1], load = () => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return { g, s }; };
  const one = load(), two = load(); assert.equal(JSON.stringify(one.g.map.tiles), JSON.stringify(two.g.map.tiles)); assert.deepEqual(one.g.map.objects.map((o) => o.id), two.g.map.objects.map((o) => o.id));
  assert.equal(one.s.atlas[`${x},${y}`].landscapeVersion, 30); assert.ok(one.g.map.tiles.some((t) => t.landscape === 'fells'));
  assert.equal(one.s.schemaVersion ?? 14, 14);
  const h = make(x, y, 29, { hamlet: true }); assert.ok(h.tiles.some((t) => t.landscape === 'fells')); assert.ok(h.tiles.filter((t) => t.landscape === 'fells').every((t) => !t.elev && !t.blocked && t.kind !== 'peatHag'));
  assert.ok(!h.objects.some((o) => String(o.id).startsWith('fells-')));
});

test('older ground regenerates byte for byte: sections fingerprinted on main (ba1acb7e3, release 1053) before this change', () => {
  for (const [seed, v, x, y, hash] of PINS) assert.equal(fp(pinned(seed, x, y, v)), hash, `${seed} v${v} ${x},${y}`);
  const [seed, , x, y] = PINS[0]; assert.ok(!pinned(seed, x, y, 28).tiles.some((t) => t.landscape === 'fells') && make(x, y, 29, {}, seed).tiles.some((t) => t.landscape === 'fells'), 'the same ground first seen at 29 is cloudfells');
});

test('in the game: ground first seen at version 28 keeps its version 28 ground; new ground pins 29', () => {
  const { x, y } = sections()[0], s = freshSave(); s.seed = SEED; s.atlas = { [`${x},${y}`]: { landscapeVersion: 28 } }; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(s.atlas[`${x},${y}`].landscapeVersion, 28); assert.ok(!g.map.tiles.some((t) => t.landscape === 'fells'), 'no cloudfells on version 28 ground');
  const t = freshSave(); t.seed = SEED; const h = new Game(t, 0); h.rx = x; h.ry = y; h.loadArea('overworld'); assert.equal(t.atlas[`${x},${y}`].landscapeVersion, 30); assert.ok(h.map.tiles.some((q) => q.landscape === 'fells'));
});

test('Close View: a high clear sky over a white horizon; heather reads as grass, crag and scree as rock, the cloud as moss, tarns as water; tors stand up', () => {
  assert.equal(OUTDOOR.skyOf.fells, 'fells'); const sky = OUTDOOR.skies.fells; assert.ok(sky);
  for (const k of Object.keys(OUTDOOR.skies.cold)) assert.ok(k in sky, `the sky has ${k}`);
  assert.ok(sky.horizon.every((v) => v >= 210), 'the horizon is the cloud sea'); assert.ok(sky.zenith[2] > sky.zenith[0] + 60, 'a clear high sky');
  const surface = (kind) => OUTDOOR.surfaces.find(([, re]) => re.test(kind))?.[0] || 'earth';
  assert.equal(surface('fellGrass'), 'grass'); assert.equal(surface('cloudMoss'), 'grass'); assert.equal(surface('fellCrag'), 'rock'); assert.equal(surface('screeSlope'), 'rock'); assert.equal(surface('peatHag'), 'earth');
  assert.ok(OUTDOOR.waterKinds.test('tarnPool')); for (const k of KINDS.filter((k) => k !== 'tarnPool')) assert.ok(!OUTDOOR.waterKinds.test(k), k);
  const tor = outdoorOutcropHeight({ kind: 'graniteTor', x: 3, y: 4, elev: 3 }); assert.ok(tor >= 1.5 && tor <= 2.4, `${tor}`);
});

test('cost: generation only, within the cost of the Magma Rivers on this machine; nothing per frame', () => {
  const pick = (type, v) => { const out = []; for (let x = 40; x < 600 && out.length < 16; x += 3) for (let y = 40; y < 600 && out.length < 16; y += 5) { const r = sectionRegion(SEED, x, y, v); if (r.type === type && r.hold >= .5) out.push([x, y]); } return out; };
  const time = (list, v) => { let best = Infinity; for (let k = 0; k < 2; k++) { let ms = 0; for (const [x, y] of list) { const m = generateRegion(SEED, x, y); const t0 = performance.now(); applyLandscape(m, SEED, x, y, { version: v }); ms += performance.now() - t0; } best = Math.min(best, ms / list.length); } return best; };
  const fells = pick('fells', 29), magma = pick('magma', 29); assert.ok(fells.length >= 12 && magma.length >= 12);
  time(fells, 29); const a = time(fells, 29), b = time(magma, 29), c = time(fells, 28);
  console.log(`  cloudfells (v29) ${a.toFixed(1)} ms a section; magma rivers ${b.toFixed(1)} ms; the same ground at v28 ${c.toFixed(1)} ms`);
  assert.ok(a < b * 1.6 + 6, `cloudfells ${a.toFixed(1)} ms vs magma ${b.toFixed(1)} ms a section`);
});

// Fingerprints taken on main (ba1acb7e3, release 1053) before this change, with the fingerprint above: fog and mountain regions (the
// pool) at versions 28, 24, 9 and 4, and other ground at 28: 30 of the 5,443 maps compared byte for byte against main for this change.
const PINS = [
  ['FELLS29', 28, -330, -122, 'c072fb65c3d70850'],
  ['FELLS29', 24, -330, -122, '4007df94669f5f32'],
  ['FELLS29', 9, -330, -122, 'd88817a328bf0346'],
  ['FELLS29', 4, -330, -122, '5ac6f6d47622577e'],
  ['FELLS29', 28, -308, -5, '1e251b79ec2f08a6'],
  ['FELLS29', 28, -308, 99, '173a0e777e184e5d'],
  ['FELLS29', 28, -297, 125, '3d899e2b821093e9'],
  ['FELLS29', 9, -242, -161, 'f8ee9e3dc7756d0c'],
  ['FELLS29', 4, -154, 138, 'b50e32a1413c3d64'],
  ['FELLS29', 28, -330, -135, '1d43baae0f7226db'],
  ['FELLS29', 28, -209, 203, '90803c515bb9b27b'],
  ['FELLS29', 28, -77, -31, '5e556e52023d5fd1'],
  ['AUDIT-A', 28, -308, -200, '33e67b9cf03fff0a'],
  ['AUDIT-A', 28, -308, 21, '810a7a6642549fce'],
  ['AUDIT-A', 28, -286, 203, 'e11081abbcc02680'],
  ['AUDIT-A', 24, -330, -109, '4ad8ac90a955745d'],
  ['AUDIT-A', 9, -198, -148, '2ea92e49f8819c80'],
  ['AUDIT-A', 4, -77, 177, 'dbc886c5f6202037'],
  ['AUDIT-A', 28, -330, -148, 'd3cce9b2621350bf'],
  ['AUDIT-A', 28, -209, 281, 'ab9fed0bedffc5f7'],
  ['AUDIT-A', 28, -77, 203, '4b44e91ae3f5fa92'],
  ['LUNA25', 28, -308, 60, '3f0fe941be2ed26b'],
  ['LUNA25', 28, -308, 112, 'a560d5cd14ee636f'],
  ['LUNA25', 28, -286, 203, '8d5228dfc3b9ecb6'],
  ['LUNA25', 24, -319, -109, '0e67b74ac110caa4'],
  ['LUNA25', 9, -198, 138, '28960824ac14d11f'],
  ['LUNA25', 4, -88, 73, '82ecc352d8b4bbd2'],
  ['LUNA25', 28, -330, -135, 'be694e388edf076a'],
  ['LUNA25', 28, -198, -174, '17b1a4e05ab77baa'],
  ['LUNA25', 28, -66, -252, 'ff59c662b3cf6c85']
];
