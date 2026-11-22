// The Oasis Ergs (landscape version 28; the daily world-regions work; Tim's list: "marsh deserts"). Far deserts, Salt Marshes and
// Savannas whose site is at least REGIONS_V28.minRing sections out may become a sand sea with water in it: long pale seif dunes along
// each region's bearing (a gentle windward flank, a steep slip face, a crest), and between them wadis of damp clay and reeds strung
// with turquoise oasis pools, date palms beside the water, patches of sinking sand that slow the step, now and then a caravan's
// cache on a high crest. Ground first seen at version 27 or older regenerates byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game, REGION_BANNER } from '../src/game.ts';
import { generateRegion, sectionExits } from '../src/world.ts';
import { OASIS, OASIS_BLOCKED, REGIONS_V28, REGION_GROUNDS, REGION_NAMES, REGIONS, applyLandscape, applyDream, DREAM_VERSION, sectionRegion, regionName, reachableFromPlaza, trappedTiles,
  coherenceCore, joinsCore, cohereSection, isLandscapeKind, canStep, LETHAL_KINDS, fallDamage, oasisAt, oasisFlow, LANDSCAPE_VERSION, DEEP_WATER } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS, sectionAtlasColor } from '../src/atlas-colors.ts';
import { drawLandscapeTile, landscapeTileAnimated, landscapeAtlasColor } from '../src/landscape-render.ts';
import { FAR_POCKETS } from '../src/far-realms.ts';
import { OUTDOOR, outdoorOutcropHeight } from '../src/close-view-outdoor.ts';
import { closeViewHazardCode } from '../src/close-view-gl.ts';
import { mireSpeed, MIRE } from '../src/water-traversal.ts';

const SEED = 'OASIS28', W = 32, idx = (x, y) => y * W + x, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KINDS = ['ergSand', 'slipDune', 'duneRidge', 'wadiClay', 'reedFen', 'oasisPool', 'sinkSand', 'palmTree'];
const make = (x, y, version = 28, opts = {}, seed = SEED) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version, ...opts }); return m; };
const walk = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
// the pins below were taken with this fingerprint on main (3b427ec38, release 1043) before this change (the Magma Rivers' own test's fingerprint)
const fp = (m) => createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, spawns: m.enemySpawns || null, canopy: m.canopy || null, mushrooms: m.mushrooms || null, weather: m.weather || null, landscape: m.landscape?.biome === 'dream' ? { ...m.landscape, version: 0 } : m.landscape || null })).digest('hex').slice(0, 16);
const pinned = (seed, x, y, v) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return m; };
let found = null;
const sections = () => found ||= (() => { const out = []; for (const seed of [SEED, 'AUDIT-A']) for (let x = 40; x < 400 && out.length < (seed === SEED ? 30 : 42); x += 3) for (let y = 40; y < 400 && out.length < (seed === SEED ? 30 : 42); y += 5) { const r = sectionRegion(seed, x, y, 28); if (r.type !== 'oasis' || r.hold < .5) continue; const m = make(x, y, 28, {}, seed); if (m.oasis) out.push({ seed, x, y, m }); } return out; })();

test('version 28 turns some far deserts, Salt Marshes and Savannas into oasis ergs, about 1-4% of far sections; every other region, the heartland and the near world keep their version 27 type', () => {
  assert.equal(LANDSCAPE_VERSION, 29); assert.deepEqual(Object.keys(REGIONS_V28.chance), ['desert', 'salt', 'savanna']); assert.equal(REGIONS_V28.minRing, 44); assert.equal(REGIONS_V28.to, 'oasis');
  assert.ok(REGIONS_V28.minRing > REGIONS.heartland + REGIONS.fadeIn);
  for (const seed of [SEED, 'LUNA25', 'AUDIT-A']) {
    const seen = new Set(); let far = 0, oasis = 0, from = 0, turned = 0;
    for (let x = -300; x <= 300; x += 3) for (let y = -300; y <= 300; y += 3) {
      const a = sectionRegion(seed, x, y, 27), b = sectionRegion(seed, x, y, 28); seen.add(b.type); assert.equal(a.id, b.id); assert.equal(a.hold, b.hold);
      if (!REGIONS_V28.chance[a.type]) assert.equal(b.type, a.type, `${seed} ${x},${y}`); else if (b.type !== 'oasis') assert.equal(b.type, a.type);
      if (Math.hypot(x, y) < REGIONS.heartland) assert.equal(b.type, 'wild', 'the heartland keeps the old mix');
      if (b.type === 'oasis') { const [cx, cy] = b.id.split(',').map(Number); assert.ok(Math.hypot((cx + .5) * REGIONS.cell, (cy + .5) * REGIONS.cell) >= REGIONS_V28.minRing - REGIONS.cell, 'oasis ergs lie far out'); }
      if (Math.hypot(x, y) >= 40) { far++; if (b.type === 'oasis') oasis++; if (REGIONS_V28.chance[a.type]) { from++; if (b.type === 'oasis') turned++; } }
    }
    assert.ok(seen.has('oasis') && seen.has('desert'), `${seed}: oasis ergs, and deserts still`);
    assert.ok(oasis / far > .01 && oasis / far < .04, `${seed}: ${(oasis / far * 100).toFixed(2)}% of far sections are oasis ergs`);
    assert.ok(turned / from > .15 && turned / from < .6, `${seed}: ${turned} of ${from} pool sections`);
    for (let x = -30; x <= 30; x++) for (let y = -30; y <= 30; y++) if (Math.hypot(x, y) < 30) assert.notEqual(sectionRegion(seed, x, y, 28).type, 'oasis', 'none near the Refuge');
  }
  const { x, y } = sections()[0]; assert.notEqual(sectionRegion(SEED, x, y, 27).type, 'oasis', 'version 27 has no oasis ergs');
  assert.ok(REGION_GROUNDS.oasis && REGION_GROUNDS.oasis.id === REGIONS_V28.to && REGION_BANNER.kinds.oasis === 'Oasis ergs' && REGION_NAMES.nouns.oasis.length >= 5);
  const names = new Set(sections().map((s) => regionName(s.seed, sectionRegion(s.seed, s.x, s.y, 28))));
  for (const n of names) assert.ok(REGION_NAMES.nouns.oasis.some((k) => n.startsWith('the ') && n.endsWith(` ${k}`)), n);
  assert.ok(names.size >= 3, [...names].join(', '));
  assert.equal(FAR_POCKETS.blobByRegion.oasis, 'saltBlob'); assert.equal(landscapeAtlasColor('oasis'), REGION_GROUNDS.oasis.atlas);
  assert.ok(!sections().some((s) => s.m.tiles.some((t) => t.landscape === 'salt' || t.landscape === 'savanna') && sectionRegion(s.seed, s.x, s.y, 28).hold >= 1), 'the Salt Marsh and Savanna do not lay their ground over it');
});

test('the field: dunes across each region\'s bearing (windward flank, crest, slip face), wadis with pools and reeds between, sinking sand beside them; one world field', () => {
  const D = OASIS.dune; assert.ok(D.crest + D.height.levels * (D.windward + D.lee) < D.period, 'room for a corridor between one dune and the next');
  const bearings = new Set(); for (let i = 0; i < 40; i++) { const f = oasisFlow(SEED, `${i},${i * 3}`); assert.ok(Math.abs(Math.hypot(f.ux, f.uy) - 1) < 1e-9); bearings.add(f.ux.toFixed(3) + f.uy.toFixed(3)); }
  assert.ok(bearings.size >= 4, `${bearings.size} bearings`);
  for (const turn of [0, 2, 3, 5]) {
    const a = turn / OASIS.flowTurns * Math.PI, f = { ux: Math.cos(a), uy: Math.sin(a) }, kinds = {}; let wadi = 0, high = 0, steps = 0;
    const at = new Map(); for (let gy = 4000; gy < 4120; gy++) for (let gx = 4000; gx < 4120; gx++) { const q = oasisAt(SEED, f, gx, gy); at.set(gx * 9999 + gy, q); kinds[q.kind] = (kinds[q.kind] || 0) + 1;
      assert.ok(q.level >= 0 && q.level <= D.height.levels); if (q.wadi) { wadi++; assert.equal(q.level, 0); assert.ok(['oasisPool', 'reedFen', 'wadiClay'].includes(q.kind), q.kind); }
      if (q.kind === 'duneRidge' || q.kind === 'slipDune') assert.ok(q.level > 0, 'a crest or slip face stands up'); if (q.kind === 'sinkSand' || q.kind === 'oasisPool') assert.equal(q.level, 0); if (q.level >= 2) high++; }
    for (let gy = 4000; gy < 4119; gy++) for (let gx = 4000; gx < 4119; gx++) { const p = at.get(gx * 9999 + gy), q = at.get((gx + 1) * 9999 + gy), r = at.get(gx * 9999 + gy + 1); if (Math.abs(p.level - q.level) > 1 || Math.abs(p.level - r.level) > 1) steps++; }
    assert.ok(wadi > 120 * 120 * .12 && wadi < 120 * 120 * .5, `${turn}: ${wadi} wadi tiles`); assert.ok(high > 120 * 120 * .04, `${turn}: ${high} tiles at level 2+`);
    assert.ok(steps < 120 * 120 * .02, `${turn}: ${steps} natural steps of two (the sweeps take them out)`);
    for (const k of ['ergSand', 'slipDune', 'duneRidge', 'wadiClay', 'reedFen', 'oasisPool', 'sinkSand']) assert.ok(kinds[k] > 150, `${turn} ${k}: ${kinds[k]}`);
  }
  const f = oasisFlow(SEED, '3,4'); for (let gy = 0; gy < 64; gy++) assert.deepEqual(oasisAt(SEED, f, 31, gy), oasisAt(SEED, { ...f }, 31, gy));
});

test('the surface: kinds, every step one level, pools in the wadis, palms by the water, sinking sand, caches on a crest; Atlas colours; drawn once; bounded', () => {
  const list = sections(); assert.ok(list.length >= 40, `${list.length} sections`);
  let pools = 0, palms = 0, sink = 0, caches = 0, tiles = 0, high = 0; const kinds = {}, levels = [0, 0, 0, 0, 0, 0];
  for (const { seed, x, y, m } of list) {
    const mine = m.tiles.filter((t) => t.landscape === 'oasis'); tiles += mine.length; assert.ok(mine.length <= 1024);
    for (const t of mine) { assert.ok(KINDS.includes(t.kind) || (t.slope && !t.blocked), t.kind); kinds[t.kind] = (kinds[t.kind] || 0) + 1; assert.equal(!!t.blocked, OASIS_BLOCKED.includes(t.kind), `${x},${y} ${t.kind}`);
      assert.ok(!LETHAL_KINDS.has(t.kind) && !DEEP_WATER.includes(t.kind), 'nothing in the erg kills'); if (!t.blocked) levels[t.elev || 0]++;
      if (t.kind === 'oasisPool') { pools++; assert.equal(t.elev || 0, 0, 'water lies at the foot of the dunes'); } if (t.kind === 'sinkSand') { sink++; assert.equal(t.elev || 0, 0); }
      if ((t.kind === 'duneRidge' || t.kind === 'slipDune') && !t.slope) assert.ok((t.elev || 0) > 0, 'a crest stands up'); if (!t.blocked && (t.elev || 0) >= 2) high++; }
    for (const t of mine) if (walk(t)) for (const [dx, dy] of N4) { const n = m.tiles[idx(t.x + dx, t.y + dy)]; if (t.x + dx < 0 || t.x + dx > 31 || !n || n.landscape !== 'oasis' || !walk(n)) continue; assert.ok(Math.abs((n.elev || 0) - (t.elev || 0)) <= 1, `${x},${y}: a step of two at ${t.x},${t.y}`); }
    const pt = mine.filter((t) => t.kind === 'palmTree'); assert.equal(m.palms || 0, pt.length); assert.ok(pt.length <= OASIS.palm.max); palms += pt.length;
    for (const t of pt) { assert.equal(t.elev || 0, 0); assert.ok([-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => m.tiles[idx(t.x + dx, t.y + dy)]?.kind === 'oasisPool')), 'a palm stands by the water'); }
    assert.equal(m.oasisPools || 0, mine.filter((t) => t.kind === 'oasisPool').length);
    const added = m.objects.filter((o) => String(o.id).startsWith('oasis-')); assert.ok(added.length <= 1);
    for (const o of added) { caches++; assert.equal(o.kind, 'chest'); assert.equal(o.rewardSource, 'chest'); assert.equal(o.name, OASIS.cache.name); assert.equal(m.tiles[idx(o.x, o.y)].kind, 'duneRidge'); assert.ok(m.tiles[idx(o.x, o.y)].elev >= OASIS.cache.minLevel); assert.ok(reachableFromPlaza(m)[idx(o.x, o.y)], 'the cache is reached'); }
    for (const s of m.enemySpawns || []) assert.ok(walk(m.tiles[idx(Math.round(s.x), Math.round(s.y))]), `${x},${y}: a creature on open ground`);
    assert.equal(m.weather, generateRegion(seed, x, y).weather, 'no weather of its own: nothing more each frame');
    assert.equal(sectionRegion(seed, x, y, 28).type, REGIONS_V28.to, 'the section\'s region id names the erg');
  }
  for (const k of ['ergSand', 'slipDune', 'duneRidge', 'wadiClay', 'reedFen', 'oasisPool']) assert.ok(kinds[k] > tiles * .015, `${k}: ${kinds[k]} of ${tiles}`);
  console.log(`  ${list.length} sections, ${tiles} tiles: ${pools} pool, ${sink} sinking sand, ${palms} palms, ${caches} caches, ${high} tiles at level 2+, levels ${levels.join('/')}`);
  assert.ok(pools > tiles * .02 && pools < tiles * .15, `${pools} pool tiles in ${tiles}`); assert.ok(sink > list.length && sink < tiles * .08, `${sink} sinking sand`);
  assert.ok(palms >= list.length && caches >= 3, `${palms} palms, ${caches} caches`); assert.ok(high > tiles * .03, `${high} tiles at level 2+`);
  for (const k of KINDS) { assert.ok(ATLAS_TILE_COLORS[k], `${k} on the Atlas`); assert.ok(isLandscapeKind(k), k); assert.ok(!/pit|hole|void|abyss|lava|magma|cinder|ember/i.test(k), `${k} is not read as a hazard by the Close View`); }
  for (const k of KINDS) { assert.equal(landscapeTileAnimated({ kind: k, landscape: 'oasis' }), false, `${k}: drawn once into the ground cache`); assert.equal(closeViewHazardCode({ kind: k }), 0, `${k}: firm ground in the Close View`); }
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  for (const { m } of list.filter((s) => s.m.palms).slice(0, 4)) for (const t of m.tiles) if (t.landscape === 'oasis') assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, W), true);
  const full = list.map((s) => s.m).sort((a, b) => b.tiles.filter((t) => t.landscape === 'oasis').length - a.tiles.filter((t) => t.landscape === 'oasis').length)[0];
  const c = sectionAtlasColor(full), [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); assert.ok(r > b + 20 && g > b + 15, `${c}: the Atlas reads a pale warm sand`);
  // section means of the neighbouring warm lands, measured with the same sectionAtlasColor (Pillar Lands, a Dune Sea, Savanna, Salt Marsh, Amberwood)
  for (const [name, hex] of [['Pillar Lands', '#af7e5c'], ['Dune Sea', '#c3a26b'], ['Savanna', '#ae9248'], ['Salt Marsh', '#bec4ba'], ['Amberwood', '#9f5c2c']]) { const q = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); assert.ok(Math.hypot(r - q[0], g - q[1], b - q[2]) > 25, `${c}: apart from the ${name}`); }
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
test('traversable (solver): no trap, every exit, cache and crest joins the plaza both ways, no drop kills, the palms never cut ground off', () => {
  let unOld = 0, unNew = 0, checked = 0, crests = 0;
  for (const { seed, x, y } of sections().slice(0, 42)) {
    const m = make(x, y, 28, { coherence: 1 }, seed); cohereSection(m); assert.equal(trappedTiles(m, W, W, { x: 16, y: 16 }, true).length, 0, `${x},${y}: a trap`);
    const core = coherenceCore(m), ex = sectionExits(seed, x, y), go = solve(m, { x: 16, y: 16 }), back = solve(m, { x: 16, y: 16 }, true);
    for (const [ex_, ey] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) { const t = m.tiles[idx(ex_, ey)]; if (!walk(t)) continue; assert.ok(joinsCore(m, { x: ex_, y: ey }, core), `${x},${y}: exit ${ex_},${ey}`); assert.ok(go[idx(ex_, ey)], `${x},${y}: the solver reaches exit ${ex_},${ey}`); assert.ok(back[idx(ex_, ey)], `${x},${y}: from exit ${ex_},${ey} back to the plaza`); checked++; }
    for (const o of m.objects.filter((q) => String(q.id).startsWith('oasis-cache'))) { assert.ok(joinsCore(m, o, core), `${x},${y}: the cache`); assert.ok(go[idx(o.x, o.y)] && back[idx(o.x, o.y)], 'to the cache and back'); }
    for (const t of m.tiles) if (t.kind === 'duneRidge' && (t.elev || 0) >= 2 && go[idx(t.x, t.y)] && back[idx(t.x, t.y)]) crests++;
    for (let i = 0; i < 1024; i++) if (go[i]) for (const [dx, dy] of N4) { const a = m.tiles[i], b = m.tiles[idx(a.x + dx, a.y + dy)]; if (b && walk(b) && a.landscape === 'oasis') assert.ok((a.elev || 0) - (b.elev || 0) < 4, 'no fatal ledge'); }
    // with every palm lifted, the ground reached both ways is no larger than with them
    const plain = structuredClone(m); for (const t of plain.tiles) if (OASIS_BLOCKED.includes(t.kind)) { t.kind = 'ergSand'; t.blocked = false; }
    const pg = solve(plain, { x: 16, y: 16 }), pb = solve(plain, { x: 16, y: 16 }, true); for (let i = 0; i < 1024; i++) if (pg[i] && pb[i] && walk(m.tiles[i]) && !(go[i] && back[i])) assert.fail(`${x},${y}: ${i % 32},${i >> 5} cut off by a palm`);
    const old = make(x, y, 27, {}, seed), ra = reachableFromPlaza(old), rb = solve(m, { x: 16, y: 16 }); for (let i = 0; i < 1024; i++) { if (!ra[i] && walk(old.tiles[i])) unOld++; if (!rb[i] && walk(m.tiles[i])) unNew++; }
  }
  assert.ok(checked > 90, `${checked} exits`); assert.ok(crests > 40, `${crests} high crest tiles reached both ways`);
  assert.ok(unNew <= unOld + 30, `walkable ground the plaza cannot reach: ${unNew} (version 27 on the same ground: ${unOld})`);
});

test('the real movement rules: a jump climbs each dune, sinking sand slows the step and never rots, creatures still have room, the game lays the same land', () => {
  const hamlet = (x, y) => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return (g.map.objects || []).some((o) => o.kind === 'shelterMerchant' || o.kind === 'villager'); };
  const { x, y, m } = sections().find(({ seed, m, x, y }) => seed === SEED && m.palms && m.tiles.some((t) => t.kind === 'sinkSand') && !hamlet(x, y));
  let up = 0; for (const a of m.tiles) for (const [dx, dy] of N4) { const b = m.tiles[idx(a.x + dx, a.y + dy)]; if (a.x + dx < 0 || a.x + dx > 31 || !walk(a) || !walk(b) || b.landscape !== 'oasis' || (b.elev || 0) !== (a.elev || 0) + 1) continue;
    assert.ok(canStep({ isPlayer: true, jumping: true }, m, W, a.x, a.y, b.x, b.y), `${x},${y}: jump ${a.x},${a.y} -> ${b.x},${b.y}`); assert.equal(canStep({ isPlayer: true, jumping: false }, m, W, a.x, a.y, b.x, b.y), !!(a.slope || b.slope)); up++; }
  assert.ok(up > 20, `${up} steps up`);
  assert.ok(mireSpeed('sinkSand') > .3 && mireSpeed('sinkSand') < .8, 'sinking sand slows the step'); assert.ok(!MIRE.rotKinds.includes('sinkSand'), 'and never rots');
  for (const k of KINDS.filter((k) => k !== 'sinkSand')) assert.equal(mireSpeed(k), 1, `${k}: full speed`);
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.ok(g.map.tiles.some((t) => t.kind === 'palmTree') && g.map.tiles.some((t) => t.kind === 'oasisPool'), 'the game lays the same erg');
  assert.ok((g.map.enemySpawns || []).length > 0, 'creatures still place'); for (const e of g.map.enemySpawns) assert.ok(walk(g.map.tiles[idx(Math.round(e.x), Math.round(e.y))]), 'on open ground');
  assert.equal(g.map.landscape.name, 'Oasis Ergs'); assert.equal(g.map.landscape.biome, 'oasis', 'a clean region id for whatever later asks which land this is');
});

test('neighbours agree on their shared edge: the same exit, open and at ground level on both sides; the dunes run on over the border', () => {
  let pair = null; for (let x = 40; x < 400 && !pair; x += 2) for (let y = 40; y < 400 && !pair; y += 3) if (sectionRegion(SEED, x, y, 28).type === 'oasis' && sectionRegion(SEED, x + 1, y, 28).type === 'oasis' && sectionRegion(SEED, x, y, 28).hold >= 1 && sectionRegion(SEED, x + 1, y, 28).id === sectionRegion(SEED, x, y, 28).id) pair = [x, y];
  assert.ok(pair); const [x, y] = pair, a = make(x, y, 28, { coherence: 1 }), b = make(x + 1, y, 28, { coherence: 1 }); cohereSection(a); cohereSection(b);
  const e = sectionExits(SEED, x, y).east; assert.equal(sectionExits(SEED, x + 1, y).west, e);
  const ta = a.tiles[idx(31, e)], tb = b.tiles[idx(0, e)]; assert.ok(walk(ta) && walk(tb)); assert.deepEqual([ta.elev || 0, tb.elev || 0], [0, 0]);
  assert.ok(joinsCore(a, { x: 31, y: e }) && joinsCore(b, { x: 0, y: e }));
  let n = 0, near = 0;
  for (let yy = 1; yy < 31; yy++) { const p = a.tiles[idx(31, yy)], q = b.tiles[idx(0, yy)]; if (!walk(p) || !walk(q)) continue; n++; if (Math.abs((p.elev || 0) - (q.elev || 0)) <= 1) near++; }
  assert.ok(n >= 1, `${n}`); assert.equal(near, n, 'no cliff opens where the border is open');
  const f = oasisFlow(SEED, sectionRegion(SEED, x, y, 28).id); let same = 0; for (let yy = 0; yy < 32; yy++) { const p = oasisAt(SEED, f, x * 32 + 31, y * 32 + yy), q = oasisAt(SEED, f, x * 32 + 32, y * 32 + yy); if (p.wadi === q.wadi && Math.abs(p.level - q.level) <= 1) same++; }
  assert.ok(same >= 26, `${same} of 32 border rows agree on the dunes and wadis`);
});

test('deterministic: two fresh generations and two fresh game loads match; a hamlet keeps the colours but stays flat and firm', () => {
  for (const { seed, x, y, m } of sections().slice(0, 8)) assert.equal(fp(make(x, y, 28, {}, seed)), fp(m), `${x},${y}`);
  const { x, y } = sections()[1], load = () => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return { g, s }; };
  const one = load(), two = load(); assert.equal(JSON.stringify(one.g.map.tiles), JSON.stringify(two.g.map.tiles)); assert.deepEqual(one.g.map.objects.map((o) => o.id), two.g.map.objects.map((o) => o.id));
  assert.equal(one.s.atlas[`${x},${y}`].landscapeVersion, 29); assert.ok(one.g.map.tiles.some((t) => t.landscape === 'oasis'));
  assert.equal(one.s.schemaVersion ?? 14, 14);
  const h = make(x, y, 28, { hamlet: true }); assert.ok(h.tiles.some((t) => t.landscape === 'oasis')); assert.ok(h.tiles.filter((t) => t.landscape === 'oasis').every((t) => !t.elev && !t.blocked && t.kind !== 'sinkSand'));
  assert.ok(!h.objects.some((o) => String(o.id).startsWith('oasis-')));
});

test('older ground regenerates byte for byte: sections fingerprinted on main (3b427ec38) before this change', () => {
  for (const [seed, v, x, y, hash] of [
    ['OASIS28', 27, 61, 305, '51c213006a438f4c'],
    ['OASIS28', 25, 61, 305, 'facb69b3d789a085'],
    ['OASIS28', 11, 61, 305, '5196e93522767d2a'],
    ['OASIS28', 4, 61, 305, 'a8601fc572292cc7'],
    ['OASIS28', 27, 67, 140, '64aabb8bef88b6e9'],
    ['OASIS28', 27, 64, 305, '9df003a3cd0d7e86'],
    ['AUDIT-A', 27, 52, 315, '158873578d657180'],
    ['AUDIT-A', 24, 55, 320, '98824b98398a08ff'],
    ['LUNA25', 27, 40, 130, '9e58305ec529aa0b'],
    ['LUNA25', 11, 40, 135, '4a353a1d4c369caa'],
    ['LUNA25', 10, 40, 345, 'd6de4ef8be65dbd3'],
    ['OASIS28', 27, -60, -348, '55e7514eb181192e'],
    ['OASIS28', 27, -81, -161, '96a80ece90df4ee8'],
    ['OASIS28', 11, -88, -161, '382fe473256c6243'],
    ['AUDIT-A', 27, -60, -271, '10d5d4eb73d60670'],
    ['AUDIT-A', 27, -67, -84, '0eb0e2003847af44'],
    ['MAGMA27', 27, 76, 40, '853b97c5f8d78774'],
    ['MAGMA27', 26, 76, 45, '6738f60c553b8971'],
    ['AUDIT-A', 27, 40, 235, '80cd2216863ec4d4'],
    ['LUNA25', 27, 70, 65, '89f6316c183170fc'],
    ['OASIS28', 27, 3, 5, 'bc54671843e6c67e'],
    ['OASIS28', 27, 20, -30, 'fd69884911171831'],
    ['OASIS28', 2, 36, 36, '7c139539ba1505d2'],
    ['OASIS28', 27, -200, 150, '2ed1935ca518ee6f'],
    ['AUDIT-A', 27, -300, 65, 'd7b661fdf21822d6'],
    ['LUNA25', 27, -297, -75, '488ae87a6ff1e1e8'],
    ['MAGMA27', 27, 36, 201, '48176bb5084b2359'],
    ['OASIS28', 7, -81, -161, '9b8b7986b86328a8']
  ]) assert.equal(fp(pinned(seed, x, y, v)), hash, `${seed} v${v} ${x},${y}`);
  assert.ok(!pinned(SEED, 61, 305, 27).tiles.some((t) => t.landscape === 'oasis') && make(61, 305).tiles.some((t) => t.landscape === 'oasis'), 'the same ground first seen at 28 is an oasis erg');
});

test('in the game: ground first seen at version 27 keeps its version 27 ground; new ground pins 28', () => {
  const { x, y } = sections()[0], s = freshSave(); s.seed = SEED; s.atlas = { [`${x},${y}`]: { landscapeVersion: 27 } }; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(s.atlas[`${x},${y}`].landscapeVersion, 27); assert.ok(!g.map.tiles.some((t) => t.landscape === 'oasis'), 'no oasis erg on version 27 ground');
  const t = freshSave(); t.seed = SEED; const h = new Game(t, 0); h.rx = x; h.ry = y; h.loadArea('overworld'); assert.equal(t.atlas[`${x},${y}`].landscapeVersion, 29); assert.ok(h.map.tiles.some((q) => q.landscape === 'oasis'));
});

test('Close View: a desert sky; the dunes read as sand, the reeds as grass, the pools as water; palms stand up as trees', () => {
  assert.equal(OUTDOOR.skyOf.oasis, 'desert'); assert.ok(OUTDOOR.skies.desert);
  const surface = (kind) => OUTDOOR.surfaces.find(([, re]) => re.test(kind))?.[0] || 'earth';
  for (const kind of ['ergSand', 'slipDune', 'duneRidge', 'sinkSand']) assert.equal(surface(kind), 'sand', kind);
  assert.equal(surface('reedFen'), 'grass'); assert.equal(surface('wadiClay'), 'earth');
  assert.ok(OUTDOOR.waterKinds.test('oasisPool')); for (const k of KINDS.filter((k) => k !== 'oasisPool')) assert.ok(!OUTDOOR.waterKinds.test(k), k);
  const palm = outdoorOutcropHeight({ kind: 'palmTree', x: 3, y: 4 }); assert.ok(palm >= 1.5 && palm <= 2.1, `${palm}`);
});

test('cost: generation only, within the cost of the Magma Rivers on this machine; nothing per frame', () => {
  const pick = (type, v) => { const out = []; for (let x = 40; x < 600 && out.length < 16; x += 3) for (let y = 40; y < 600 && out.length < 16; y += 5) { const r = sectionRegion(SEED, x, y, v); if (r.type === type && r.hold >= .5) out.push([x, y]); } return out; };
  const time = (list, v) => { let best = Infinity; for (let k = 0; k < 2; k++) { let ms = 0; for (const [x, y] of list) { const m = generateRegion(SEED, x, y); const t0 = performance.now(); applyLandscape(m, SEED, x, y, { version: v }); ms += performance.now() - t0; } best = Math.min(best, ms / list.length); } return best; };
  const oasis = pick('oasis', 28), magma = pick('magma', 28); assert.ok(oasis.length >= 12 && magma.length >= 12);
  time(oasis, 28); const a = time(oasis, 28), b = time(magma, 28), c = time(oasis, 27);
  console.log(`  oasis ergs (v28) ${a.toFixed(1)} ms a section; magma rivers ${b.toFixed(1)} ms; the same ground at v27 ${c.toFixed(1)} ms`);
  assert.ok(a < b * 1.6 + 6, `oasis ${a.toFixed(1)} ms vs magma ${b.toFixed(1)} ms a section`);
});
