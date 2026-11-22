// The Magma Rivers (landscape version 27; the daily world-regions work; Tim's list: "a severe volcanic region"). Far Firelands,
// Emberlands and Ashfields regions whose site is at least REGIONS_V27.minRing sections out may become a land where the fire still
// runs: channels of lava along each region's bearing between raised scoria levees, crusted over here and there into bridges,
// cinder cones with a lava crater and a climbable rim, fumaroles ringed with sulphur, now and then a cache on a rim. Ground first
// seen at version 26 or older regenerates byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game, REGION_BANNER, hazardDeathWords } from '../src/game.ts';
import { generateRegion, sectionExits } from '../src/world.ts';
import { MAGMA, MAGMA_BLOCKED, REGIONS_V27, REGION_GROUNDS, REGION_NAMES, REGIONS, applyLandscape, applyDream, DREAM_VERSION, sectionRegion, regionName, reachableFromPlaza, trappedTiles,
  coherenceCore, joinsCore, cohereSection, isLandscapeKind, canStep, LETHAL_KINDS, fallDamage, magmaAt, magmaFlow, LANDSCAPE_VERSION, MAX_LEVEL } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS, sectionAtlasColor } from '../src/atlas-colors.ts';
import { drawLandscapeTile, landscapeTileAnimated, landscapeAtlasColor } from '../src/landscape-render.ts';
import { FAR_POCKETS } from '../src/far-realms.ts';
import { OUTDOOR, outdoorSkyMix, outdoorOutcropHeight } from '../src/close-view-outdoor.ts';
import { closeViewHazardCode } from '../src/close-view-gl.ts';

const SEED = 'MAGMA27', W = 32, idx = (x, y) => y * W + x, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KINDS = ['cinderPlain', 'pahoehoe', 'ashDrift', 'scoriaLevee', 'crustBridge', 'cinderCone', 'coneRim', 'sulfurCrust', 'fumaroleVent', 'lava'];
const make = (x, y, version = 27, opts = {}, seed = SEED) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version, ...opts }); return m; };
const walk = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
// the pins below were taken with this fingerprint on main (4e3605d4b, release 955) before this change (the Marrowworks' own test's
// fingerprint: the Far Sleep's landscape.version label follows the constant, as it always has, so it is left out)
const fp = (m) => createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, spawns: m.enemySpawns || null, canopy: m.canopy || null, mushrooms: m.mushrooms || null, weather: m.weather || null, landscape: m.landscape?.biome === 'dream' ? { ...m.landscape, version: 0 } : m.landscape || null })).digest('hex').slice(0, 16);
const pinned = (seed, x, y, v) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return m; };
let found = null;
const sections = () => found ||= (() => { const out = []; for (const seed of [SEED, 'AUDIT-A']) for (let x = 40; x < 400 && out.length < (seed === SEED ? 30 : 42); x += 3) for (let y = 40; y < 400 && out.length < (seed === SEED ? 30 : 42); y += 5) { const r = sectionRegion(seed, x, y, 27); if (r.type !== 'magma' || r.hold < .5) continue; const m = make(x, y, 27, {}, seed); if (m.magmaRivers) out.push({ seed, x, y, m }); } return out; })();

test('version 27 turns some far Firelands, Emberlands and Ashfields regions into magma rivers, about 1-4% of far sections; every other region, the heartland and the near world keep their version 26 type', () => {
  assert.equal(LANDSCAPE_VERSION, 29); assert.deepEqual(Object.keys(REGIONS_V27.chance), ['volcanic', 'emberlands', 'ashfields']); assert.equal(REGIONS_V27.minRing, 52); assert.equal(REGIONS_V27.to, 'magma');
  assert.ok(REGIONS_V27.minRing > REGIONS.heartland + REGIONS.fadeIn);
  for (const seed of [SEED, 'LUNA25', 'AUDIT-A']) {
    const seen = new Set(); let far = 0, magma = 0, from = 0, turned = 0;
    for (let x = -300; x <= 300; x += 3) for (let y = -300; y <= 300; y += 3) {
      const a = sectionRegion(seed, x, y, 26), b = sectionRegion(seed, x, y, 27); seen.add(b.type); assert.equal(a.id, b.id); assert.equal(a.hold, b.hold);
      if (!REGIONS_V27.chance[a.type]) assert.equal(b.type, a.type, `${seed} ${x},${y}`); else if (b.type !== 'magma') assert.equal(b.type, a.type);
      if (Math.hypot(x, y) < REGIONS.heartland) assert.equal(b.type, 'wild', 'the heartland keeps the old mix');
      if (b.type === 'magma') { const [cx, cy] = b.id.split(',').map(Number); assert.ok(Math.hypot((cx + .5) * REGIONS.cell, (cy + .5) * REGIONS.cell) >= REGIONS_V27.minRing - REGIONS.cell, 'magma rivers lie far out'); }
      if (Math.hypot(x, y) >= 40) { far++; if (b.type === 'magma') magma++; if (REGIONS_V27.chance[a.type]) { from++; if (b.type === 'magma') turned++; } }
    }
    assert.ok(seen.has('magma') && seen.has('volcanic'), `${seed}: magma rivers, and the Firelands still`);
    assert.ok(magma / far > .01 && magma / far < .04, `${seed}: ${(magma / far * 100).toFixed(2)}% of far sections are magma rivers`);
    assert.ok(turned / from > .4 && turned / from < .9, `${seed}: ${turned} of ${from} pool sections`);
    for (let x = -36; x <= 36; x++) for (let y = -36; y <= 36; y++) if (Math.hypot(x, y) < 36) assert.notEqual(sectionRegion(seed, x, y, 27).type, 'magma', 'none near the Refuge');
  }
  const { x, y } = sections()[0]; assert.notEqual(sectionRegion(SEED, x, y, 26).type, 'magma', 'version 26 has no magma rivers');
  assert.ok(REGION_GROUNDS.magma && REGION_BANNER.kinds.magma === 'Magma rivers' && REGION_NAMES.nouns.magma.length >= 5);
  const names = new Set(sections().map((s) => regionName(s.seed, sectionRegion(s.seed, s.x, s.y, 27))));
  for (const n of names) assert.ok(REGION_NAMES.nouns.magma.some((k) => n.startsWith('the ') && n.endsWith(` ${k}`)), n);
  assert.ok(names.size >= 3, [...names].join(', '));
  assert.equal(FAR_POCKETS.blobByRegion.magma, 'emberBlob'); assert.equal(landscapeAtlasColor('magma'), REGION_GROUNDS.magma.atlas);
  assert.ok(!sections().some((s) => s.m.firelands), 'the Firelands do not lay their basalt and pools over it');
});

test('the field: channels across each region\'s bearing, levees either side, crust bridges, cinder, rope and ash between; one world field', () => {
  const R = MAGMA.river; assert.ok(R.half + R.wide.add + R.levee + 4 < R.period / 2, 'open ground between one channel and the next');
  const bearings = new Set(); for (let i = 0; i < 40; i++) { const f = magmaFlow(SEED, `${i},${i * 3}`); assert.ok(Math.abs(Math.hypot(f.ux, f.uy) - 1) < 1e-9); bearings.add(f.ux.toFixed(3) + f.uy.toFixed(3)); }
  assert.ok(bearings.size >= 4, `${bearings.size} bearings`);
  for (const turn of [0, 2, 3, 5]) {
    const a = turn / MAGMA.flowTurns * Math.PI, f = { ux: Math.cos(a), uy: Math.sin(a) }, kinds = {}; let river = 0, crust = 0, levee = 0;
    for (let gy = 4000; gy < 4120; gy++) for (let gx = 4000; gx < 4120; gx++) { const q = magmaAt(SEED, f, gx, gy); kinds[q.kind] = (kinds[q.kind] || 0) + 1;
      if (q.river) { river++; assert.equal(q.level, 0); assert.equal(q.kind, 'crustBridge'); if (q.crust) crust++; } if (q.kind === 'scoriaLevee') { levee++; assert.equal(q.level, 1); } else assert.equal(q.level, 0); }
    assert.ok(river > 120 * 120 * .06 && river < 120 * 120 * .2, `${turn}: ${river} channel tiles`); assert.ok(crust > river * .05 && crust < river * .5, `${turn}: ${crust} of ${river} crusted`);
    assert.ok(levee > river * .6, `${turn}: ${levee} levee tiles`);
    for (const k of ['cinderPlain', 'pahoehoe', 'ashDrift']) assert.ok(kinds[k] > 300, `${turn} ${k}: ${kinds[k]}`);
  }
  const f = magmaFlow(SEED, '3,4'); for (let gy = 0; gy < 64; gy++) assert.deepEqual(magmaAt(SEED, f, 31, gy), magmaAt(SEED, { ...f }, 31, gy));
});

test('the surface: kinds, every step one level, channels of lava, crust bridges, cones with a crater and rim, fumaroles in sulphur, caches; Atlas colours; drawn once; bounded', () => {
  const list = sections(); assert.ok(list.length >= 40, `${list.length} sections`);
  let lava = 0, river = 0, crater = 0, bridges = 0, vents = 0, cones = 0, rims = 0, caches = 0, tiles = 0, high = 0, sulfur = 0; const kinds = {};
  for (const { seed, x, y, m } of list) {
    const mine = m.tiles.filter((t) => t.landscape === 'magma'); tiles += mine.length; assert.ok(mine.length <= 1024);
    for (const t of mine) { assert.ok(KINDS.includes(t.kind) || (t.slope && !t.blocked), t.kind); kinds[t.kind] = (kinds[t.kind] || 0) + 1; assert.equal(!!t.blocked, MAGMA_BLOCKED.includes(t.kind), `${x},${y} ${t.kind}`); assert.equal(t.kind === 'lava', !!t.magma);
      if (t.magma) { lava++; if (t.magma === 'river') river++; else { assert.equal(t.magma, 'crater'); crater++; } assert.equal(t.elev || 0, 0, 'the melt lies at the foot of the ground'); assert.equal(t.environment, 'lava'); } else if (!t.blocked) assert.ok((t.elev || 0) <= MAX_LEVEL);
      if (t.kind === 'crustBridge') bridges++; if (t.kind === 'sulfurCrust') sulfur++; if (!t.blocked && (t.elev || 0) >= 2) high++; }
    for (const t of mine) if (walk(t)) for (const [dx, dy] of N4) { const n = m.tiles[idx(t.x + dx, t.y + dy)]; if (t.x + dx < 0 || t.x + dx > 31 || !n || n.landscape !== 'magma' || !walk(n)) continue; assert.ok(Math.abs((n.elev || 0) - (t.elev || 0)) <= 1, `${x},${y}: a step of two at ${t.x},${t.y}`); }
    const vt = mine.filter((t) => t.kind === 'fumaroleVent').length; assert.equal(m.fumaroles || 0, vt); assert.ok(vt <= MAGMA.fumarole.max); vents += vt;
    assert.equal(m.lavaTiles || 0, mine.filter((t) => t.magma).length);
    for (const t of mine.filter((t) => t.kind === 'fumaroleVent')) assert.ok(N4.some(([dx, dy]) => m.tiles[idx(t.x + dx, t.y + dy)]?.kind === 'sulfurCrust'), 'sulphur round each vent');
    for (const c of m.cinderCones || []) { cones++; assert.ok(c.r >= MAGMA.cone.r[0] && c.r <= MAGMA.cone.r[1]); assert.equal(m.tiles[idx(c.x, c.y)].kind === 'lava' ? m.tiles[idx(c.x, c.y)].magma : 'crater', 'crater', 'melt (or its crust) at its heart');
      const ring = m.tiles.filter((t) => t.kind === 'coneRim' && Math.hypot(t.x - c.x, t.y - c.y) <= 2.3); rims += ring.length; assert.ok(ring.length >= 4, `${x},${y}: a rim round the crater`); for (const t of ring) assert.ok(t.elev >= 2, 'a raised rim');
      assert.ok(c.top >= 2 && c.top <= MAGMA.cone.levels); }
    assert.ok((m.cinderCones || []).length <= MAGMA.cone.chance.length);
    const added = m.objects.filter((o) => String(o.id).startsWith('magma-')); assert.ok(added.length <= 1);
    for (const o of added) { caches++; assert.equal(o.kind, 'chest'); assert.equal(o.rewardSource, 'chest'); assert.equal(o.name, MAGMA.cache.name); assert.equal(m.tiles[idx(o.x, o.y)].kind, 'coneRim'); assert.ok(reachableFromPlaza(m)[idx(o.x, o.y)], 'the cache is reached'); }
    for (const o of m.objects) if (o.kind === 'tree' || o.kind === 'rock') assert.notEqual(m.tiles[idx(Math.round(o.x), Math.round(o.y))].kind, 'lava', 'no tree or rock in the melt');
    for (const s of m.enemySpawns || []) assert.ok(walk(m.tiles[idx(Math.round(s.x), Math.round(s.y))]), `${x},${y}: a creature on open ground`);
    assert.equal(m.weather, generateRegion(seed, x, y).weather, 'no weather of its own: nothing more each frame');
    assert.ok(!m.tiles.some((t) => t.landscape === 'volcanic') || sectionRegion(seed, x, y, 27).hold < 1, `${x},${y}: the Firelands do not lay their ground over it`);
  }
  for (const k of ['cinderPlain', 'pahoehoe', 'ashDrift', 'scoriaLevee', 'crustBridge']) assert.ok(kinds[k] > tiles * .02, `${k}: ${kinds[k]} of ${tiles}`);
  console.log(`  ${list.length} sections, ${tiles} tiles: ${river} channel lava, ${crater} crater lava, ${bridges} crust, ${cones} cones (${rims} rim tiles), ${vents} fumaroles, ${sulfur} sulphur, ${caches} caches, ${high} tiles at level 2+`);
  assert.ok(river > tiles * .03 && lava < tiles * .15, `${river} channel tiles in ${tiles}`); assert.ok(bridges >= list.length, `${bridges} crust tiles`);
  assert.ok(cones >= 10 && crater >= cones, `${cones} cones`); assert.ok(vents >= list.length && caches >= 2, `${vents} fumaroles, ${caches} caches`);
  for (const k of KINDS) { assert.ok(ATLAS_TILE_COLORS[k], `${k} on the Atlas`); assert.ok(isLandscapeKind(k), k); assert.ok(!/lava|magma/i.test(k) || k === 'lava', `${k} is not read as melt by the Close View`); }
  for (const k of KINDS.filter((k) => k !== 'lava')) { assert.equal(landscapeTileAnimated({ kind: k, landscape: 'magma' }), false, `${k}: drawn once into the ground cache`); assert.equal(closeViewHazardCode({ kind: k }), 0, `${k}: firm ground in the Close View`); }
  assert.equal(landscapeTileAnimated({ kind: 'lava', landscape: 'magma', magma: 'river' }), false, 'a channel is drawn once too'); assert.equal(landscapeTileAnimated({ kind: 'lava', landscape: 'volcanic' }), true, 'Firelands pools keep their glow');
  assert.equal(closeViewHazardCode({ kind: 'lava', magma: 'river' }), 2, 'the Close View draws a channel as flowing melt');
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  for (const { m } of list.filter((s) => s.m.lavaTiles || s.m.cinderCones).slice(0, 4)) for (const t of m.tiles) if (t.landscape === 'magma') assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, W), true);
  const full = list.map((s) => s.m).sort((a, b) => b.tiles.filter((t) => t.landscape === 'magma').length - a.tiles.filter((t) => t.landscape === 'magma').length)[0];
  const c = sectionAtlasColor(full), [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); assert.ok(r > g + 20 && r > b + 20, `${c}: the Atlas reads a burning red`);
  for (const [name, hex] of [['Firelands', '#2a2220'], ['Obsidian Fields', '#211f27'], ['Amberwood', '#b5632a'], ['Marrowworks', '#3a6259']]) { const q = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); assert.ok(Math.hypot(r - q[0], g - q[1], b - q[2]) > 20, `${c}: apart from the ${name}`); }
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
test('traversable (solver): no trap, every exit, cache and cone rim join the plaza both ways, no drop kills, the channels are always crossed and never cut ground off', () => {
  let unOld = 0, unNew = 0, checked = 0, crossed = 0, rimsReached = 0;
  for (const { seed, x, y } of sections().slice(0, 42)) {
    const m = make(x, y, 27, { coherence: 1 }, seed); cohereSection(m); assert.equal(trappedTiles(m, W, W, { x: 16, y: 16 }, true).length, 0, `${x},${y}: a trap`);
    const core = coherenceCore(m), ex = sectionExits(seed, x, y), go = solve(m, { x: 16, y: 16 }), back = solve(m, { x: 16, y: 16 }, true);
    for (const [ex_, ey] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) { const t = m.tiles[idx(ex_, ey)]; if (!walk(t)) continue; assert.ok(joinsCore(m, { x: ex_, y: ey }, core), `${x},${y}: exit ${ex_},${ey}`); assert.ok(go[idx(ex_, ey)], `${x},${y}: the solver reaches exit ${ex_},${ey}`); assert.ok(back[idx(ex_, ey)], `${x},${y}: from exit ${ex_},${ey} back to the plaza`); checked++; }
    for (const o of m.objects.filter((q) => String(q.id).startsWith('magma-cache'))) { assert.ok(joinsCore(m, o, core), `${x},${y}: the cache`); assert.ok(go[idx(o.x, o.y)] && back[idx(o.x, o.y)], 'to the cache and back'); }
    for (const t of m.tiles) if (t.kind === 'coneRim' && go[idx(t.x, t.y)] && back[idx(t.x, t.y)]) rimsReached++;
    for (let i = 0; i < 1024; i++) if (go[i]) for (const [dx, dy] of N4) { const a = m.tiles[i], b = m.tiles[idx(a.x + dx, a.y + dy)]; if (b && walk(b) && a.landscape === 'magma') assert.ok((a.elev || 0) - (b.elev || 0) < 4, 'no fatal ledge'); }
    // with every hazard lifted (each at its foot, crusted over), the ground reached both ways is no larger than with them
    const plain = structuredClone(m); for (const t of plain.tiles) if (t.magma || MAGMA_BLOCKED.includes(t.kind)) { delete t.magma; t.kind = 'crustBridge'; t.blocked = false; }
    const pg = solve(plain, { x: 16, y: 16 }), pb = solve(plain, { x: 16, y: 16 }, true); for (let i = 0; i < 1024; i++) if (pg[i] && pb[i] && walk(m.tiles[i]) && plain.tiles[i].kind === m.tiles[i].kind && !(go[i] && back[i])) assert.fail(`${x},${y}: ${i % 32},${i >> 5} cut off by the melt`);
    // each channel: the walkable ground on both its sides is reached both ways (over a crust bridge or round its end)
    for (const t of m.tiles) if (t.magma === 'river') for (const [dx, dy] of [[1, 0], [0, 1]]) { const p = m.tiles[idx(t.x - dx, t.y - dy)], q = m.tiles[idx(t.x + dx, t.y + dy)]; if (!walk(p) || !walk(q) || !pg[idx(p.x, p.y)] || !pg[idx(q.x, q.y)]) continue; assert.ok(go[idx(p.x, p.y)] && go[idx(q.x, q.y)] && back[idx(p.x, p.y)] && back[idx(q.x, q.y)], `${x},${y}: across the channel at ${t.x},${t.y}`); crossed++; }
    const old = make(x, y, 26, {}, seed), ra = reachableFromPlaza(old), rb = solve(m, { x: 16, y: 16 }); for (let i = 0; i < 1024; i++) { if (!ra[i] && walk(old.tiles[i])) unOld++; if (!rb[i] && walk(m.tiles[i])) unNew++; }
  }
  assert.ok(checked > 90, `${checked} exits`); assert.ok(crossed > 10, `${crossed} channel crossings`); assert.ok(rimsReached > 20, `${rimsReached} rim tiles reached both ways`);
  assert.ok(unNew <= unOld + 30, `walkable ground the plaza cannot reach: ${unNew} (version 26 on the same ground: ${unOld})`);
});

test('the real movement rules: a jump climbs each levee and cone, the melt is lethal ground named on waking, creatures still have room, the game lays the same land', () => {
  const hamlet = (x, y) => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return (g.map.objects || []).some((o) => o.kind === 'shelterMerchant' || o.kind === 'villager'); };
  const { x, y, m } = sections().find(({ seed, m, x, y }) => seed === SEED && m.lavaTiles && m.cinderCones && !hamlet(x, y));
  let up = 0; for (const a of m.tiles) for (const [dx, dy] of N4) { const b = m.tiles[idx(a.x + dx, a.y + dy)]; if (a.x + dx < 0 || a.x + dx > 31 || !walk(a) || !walk(b) || b.landscape !== 'magma' || (b.elev || 0) !== (a.elev || 0) + 1) continue;
    assert.ok(canStep({ isPlayer: true, jumping: true }, m, W, a.x, a.y, b.x, b.y), `${x},${y}: jump ${a.x},${a.y} -> ${b.x},${b.y}`); assert.equal(canStep({ isPlayer: true, jumping: false }, m, W, a.x, a.y, b.x, b.y), !!(a.slope || b.slope)); up++; }
  assert.ok(up > 20, `${up} steps up`);
  const melt = m.tiles.find((t) => t.magma === 'river'); assert.ok(LETHAL_KINDS.has(melt.kind) && !melt.blocked, 'open lethal ground, as every lava'); assert.equal(hazardDeathWords('lava', melt), 'Lost to the lava');
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.ok(g.map.tiles.some((t) => t.magma === 'river'), 'the game lays the same channels'); assert.ok(g.map.tiles.some((t) => t.kind === 'coneRim'));
  assert.ok((g.map.enemySpawns || []).length > 0, 'creatures still place'); for (const e of g.map.enemySpawns) assert.ok(walk(g.map.tiles[idx(Math.round(e.x), Math.round(e.y))]), 'on open ground');
  assert.equal(g.map.landscape.name, 'Magma Rivers');
});

test('neighbours agree on their shared edge: the same exit, open and at ground level on both sides; the channels run on over the border', () => {
  let pair = null; for (let x = 40; x < 400 && !pair; x += 2) for (let y = 40; y < 400 && !pair; y += 3) if (sectionRegion(SEED, x, y, 27).type === 'magma' && sectionRegion(SEED, x + 1, y, 27).type === 'magma' && sectionRegion(SEED, x, y, 27).hold >= 1 && sectionRegion(SEED, x + 1, y, 27).id === sectionRegion(SEED, x, y, 27).id) pair = [x, y];
  assert.ok(pair); const [x, y] = pair, a = make(x, y, 27, { coherence: 1 }), b = make(x + 1, y, 27, { coherence: 1 }); cohereSection(a); cohereSection(b);
  const e = sectionExits(SEED, x, y).east; assert.equal(sectionExits(SEED, x + 1, y).west, e);
  const ta = a.tiles[idx(31, e)], tb = b.tiles[idx(0, e)]; assert.ok(walk(ta) && walk(tb)); assert.deepEqual([ta.elev || 0, tb.elev || 0], [0, 0]);
  assert.ok(joinsCore(a, { x: 31, y: e }) && joinsCore(b, { x: 0, y: e }));
  let n = 0, near = 0;
  for (let yy = 1; yy < 31; yy++) { const p = a.tiles[idx(31, yy)], q = b.tiles[idx(0, yy)]; if (!walk(p) || !walk(q)) continue; n++; if (Math.abs((p.elev || 0) - (q.elev || 0)) <= 1) near++; }
  assert.ok(n >= 1, `${n}`); assert.equal(near, n, 'no cliff opens where the border is open');
  const f = magmaFlow(SEED, sectionRegion(SEED, x, y, 27).id); let same = 0; for (let yy = 0; yy < 32; yy++) { const p = magmaAt(SEED, f, x * 32 + 31, y * 32 + yy), q = magmaAt(SEED, f, x * 32 + 32, y * 32 + yy); if (p.river === q.river) same++; }
  assert.ok(same >= 24, `${same} of 32 border rows agree on the channel`);
});

test('deterministic: two fresh generations and two fresh game loads match; a hamlet keeps the colours but stays flat', () => {
  for (const { seed, x, y, m } of sections().slice(0, 8)) assert.equal(fp(make(x, y, 27, {}, seed)), fp(m), `${x},${y}`);
  const { x, y } = sections()[1], load = () => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return { g, s }; };
  const one = load(), two = load(); assert.equal(JSON.stringify(one.g.map.tiles), JSON.stringify(two.g.map.tiles)); assert.deepEqual(one.g.map.objects.map((o) => o.id), two.g.map.objects.map((o) => o.id));
  assert.equal(one.s.atlas[`${x},${y}`].landscapeVersion, 29); assert.ok(one.g.map.tiles.some((t) => t.landscape === 'magma'));
  assert.equal(one.s.schemaVersion ?? 14, 14);
  const h = make(x, y, 27, { hamlet: true }); assert.ok(h.tiles.some((t) => t.landscape === 'magma')); assert.ok(h.tiles.filter((t) => t.landscape === 'magma').every((t) => !t.elev && !t.blocked && !t.magma));
  assert.ok(!h.objects.some((o) => String(o.id).startsWith('magma-')));
});

test('older ground regenerates byte for byte: sections fingerprinted on main (4e3605d4b) before this change', () => {
  for (const [seed, v, x, y, hash] of [
    ['MAGMA27', 26, 76, 40, '899add61544005e2'], ['MAGMA27', 25, 76, 40, 'ecc5f57a6c4ff31b'], ['MAGMA27', 11, 76, 40, '5054d69e47bd8092'], ['MAGMA27', 7, 76, 40, 'c8a673a3bab1b67e'],
    ['MAGMA27', 4, 76, 40, 'f75bba6d416cded1'], ['MAGMA27', 2, 76, 40, 'f75bba6d416cded1'], ['MAGMA27', 26, 76, 45, '6738f60c553b8971'], ['MAGMA27', 24, 79, 40, '3056a717f0c0d260'],
    ['MAGMA27', 26, -273, -15, '5c9b028c4d86d0cd'], ['MAGMA27', 21, -273, -15, '5c9b028c4d86d0cd'], ['MAGMA27', 26, -288, -220, 'ee7804b06d8bbf45'], ['MAGMA27', 23, -288, -220, '23885668c2fec8be'],
    ['AUDIT-A', 26, 40, 235, 'fe474f8eb58f3bff'], ['AUDIT-A', 17, 40, 235, 'f15f3e7299952ca1'], ['AUDIT-A', 26, 49, 310, '10005b1df338610f'], ['AUDIT-A', 26, 52, 310, 'caf8d7499108e351'],
    ['AUDIT-A', 26, -300, 65, '558f8ee781f87008'], ['AUDIT-A', 9, -300, 65, '558f8ee781f87008'], ['LUNA25', 26, 70, 65, '42eff937706157e4'], ['LUNA25', 26, 70, 90, '15be0b60c9d0c889'],
    ['LUNA25', 8, 73, 60, '471da7449061305c'], ['LUNA25', 26, -297, -75, 'a91a1fca855e8934'], ['LUNA25', 26, 3, 5, '64bab5380212bdc1'], ['LUNA25', 26, 20, -30, '86ee9131150ec1a7'],
    ['MAGMA27', 26, 36, 201, 'fa954804691ce89b'], ['AUDIT-A', 26, -60, 44, 'd8489686c52d5da6'], ['MAGMA27', 26, 77, 40, 'e691e945e2b798f8'], ['MAGMA27', 6, 36, 36, '9d144a1309827383'],
  ]) assert.equal(fp(pinned(seed, x, y, v)), hash, `${seed} v${v} ${x},${y}`);
  assert.ok(!pinned(SEED, 76, 40, 26).tiles.some((t) => t.landscape === 'magma') && make(76, 40).tiles.some((t) => t.landscape === 'magma'), 'the same ground first seen at 27 is magma rivers');
  assert.ok(pinned(SEED, 76, 40, 26).firelands, 'Firelands first seen at 26 keep their basalt');
});

test('in the game: ground first seen at version 26 keeps its version 26 ground; new ground pins 27', () => {
  const { x, y } = sections()[0], s = freshSave(); s.seed = SEED; s.atlas = { [`${x},${y}`]: { landscapeVersion: 26 } }; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(s.atlas[`${x},${y}`].landscapeVersion, 26); assert.ok(!g.map.tiles.some((t) => t.landscape === 'magma'), 'no magma rivers on version 26 ground');
  const t = freshSave(); t.seed = SEED; const h = new Game(t, 0); h.rx = x; h.ry = y; h.loadArea('overworld'); assert.equal(t.atlas[`${x},${y}`].landscapeVersion, 29); assert.ok(h.map.tiles.some((q) => q.landscape === 'magma'));
});

test('Close View: a sky lit red from below; the ground reads as rock, ash and sulphur; fumaroles stand up as low solids', () => {
  assert.equal(OUTDOOR.skyOf.magma, 'magma'); const k = OUTDOOR.skies.magma; assert.ok(k.horizon[0] > k.horizon[2] + 100 && !k.planet);
  for (const mood of Object.keys(OUTDOOR.moods)) { const s: any = outdoorSkyMix('magma', mood); assert.equal(s.id, 'magma'); assert.equal(s.planet, 0); }
  const surface = (kind) => OUTDOOR.surfaces.find(([, re]) => re.test(kind))?.[0] || 'earth';
  for (const kind of ['cinderPlain', 'pahoehoe', 'scoriaLevee', 'crustBridge', 'cinderCone', 'coneRim']) assert.equal(surface(kind), 'rock', kind);
  assert.equal(surface('ashDrift'), 'sand'); assert.equal(surface('sulfurCrust'), 'sand');
  for (const kind of ['abyss', 'canyon', 'ribPlate', 'regolith', 'marrowPlate', 'ash', 'ember']) assert.equal(surface(kind), ({ abyss: 'earth', canyon: 'earth', ribPlate: 'earth', regolith: 'rock', marrowPlate: 'paved', ash: 'earth', ember: 'earth' })[kind], `${kind}: unchanged`);
  const vent = outdoorOutcropHeight({ kind: 'fumaroleVent', x: 3, y: 4 }); assert.ok(vent > .3 && vent < .7, `${vent}`);
});

test('cost: generation only, within the cost of the Marrowworks on this machine; nothing per frame', () => {
  const pick = (type, v) => { const out = []; for (let x = 40; x < 600 && out.length < 16; x += 3) for (let y = 40; y < 600 && out.length < 16; y += 5) { const r = sectionRegion(SEED, x, y, v); if (r.type === type && r.hold >= .5) out.push([x, y]); } return out; };
  const time = (list, v) => { let best = Infinity; for (let k = 0; k < 2; k++) { let ms = 0; for (const [x, y] of list) { const m = generateRegion(SEED, x, y); const t0 = performance.now(); applyLandscape(m, SEED, x, y, { version: v }); ms += performance.now() - t0; } best = Math.min(best, ms / list.length); } return best; };
  const magma = pick('magma', 27), marrow = pick('marrow', 27); assert.ok(magma.length >= 12 && marrow.length >= 12);
  time(magma, 27); const a = time(magma, 27), b = time(marrow, 27), c = time(magma, 26);
  console.log(`  magma rivers (v27) ${a.toFixed(1)} ms a section; marrowworks ${b.toFixed(1)} ms; the same ground at v26 ${c.toFixed(1)} ms`);
  assert.ok(a < b * 1.6 + 6, `magma ${a.toFixed(1)} ms vs marrow ${b.toFixed(1)} ms a section`);
});
