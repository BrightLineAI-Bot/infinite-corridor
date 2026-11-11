// Terrace Springs (landscape version 21; the daily world-regions work, Tim 2026-10-29: "find ways to make the map have interesting
// features... beautiful collections of regions... rich and vibrant... without decreasing performance"). Regions still wild or bare
// plains after version 11 may become terrace springs: broad treads of pale sinter stepping up to level 3 on one world-scale noise,
// a bright rim at each lip holding turquoise pools, and a few hot springs (blocked vents ringed by orange and yellow mats); now and
// then a cache on the highest tread. Ground first seen at version 20 or older regenerates byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game, REGION_BANNER } from '../src/game.ts';
import { generateRegion, sectionExits } from '../src/world.ts';
import { LANDSCAPE_VERSION, TERRACES, REGIONS_V21, REGION_GROUNDS, REGION_NAMES, REGIONS, applyLandscape, applyDream, DREAM_VERSION, sectionRegion, regionName, reachableFromPlaza, trappedTiles,
  coherenceCore, joinsCore, cohereSection, isLandscapeKind, canStep, LETHAL_KINDS, biomeFor } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS, sectionAtlasColor } from '../src/atlas-colors.ts';
import { drawLandscapeTile, landscapeTileAnimated } from '../src/landscape-render.ts';
import { FAR_POCKETS } from '../src/far-realms.ts';

const SEED = 'TERR21', W = 32, idx = (x, y) => y * W + x, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KINDS = ['sinterTerrace', 'sinterRim', 'springPool', 'springVent', 'springMat', 'springFringe'];
const make = (x, y, version = 21, opts = {}) => { const m = generateRegion(SEED, x, y); applyLandscape(m, SEED, x, y, { version, ...opts }); return m; };
const walk = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
// the same fingerprint the pins below were taken with (on main, release 770, before this change)
const fp = (m) => createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, spawns: m.enemySpawns || null, canopy: m.canopy || null, mushrooms: m.mushrooms || null, weather: m.weather || null, landscape: m.landscape || null })).digest('hex').slice(0, 16);
const pinned = (seed, x, y, v) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return m; };
let found = null;
const sections = () => found ||= (() => { const out = []; for (let x = 14; x < 400 && out.length < 40; x += 3) for (let y = 14; y < 400 && out.length < 40; y += 5) { if (sectionRegion(SEED, x, y, 21).type !== 'terraces' || sectionRegion(SEED, x, y, 21).hold < .5) continue; const m = make(x, y); if (m.terraces) out.push({ x, y, m }); } return out; })();

test('version 21 turns some wild and plains regions into terrace springs; every other region, and the heartland, keeps its version 20 type', () => {
  assert.equal(LANDSCAPE_VERSION, 24); assert.deepEqual(REGIONS_V21.from, ['wild', 'ashfields', 'glasslands', 'emberlands']);
  const seen = new Set(); let turned = 0, from = 0;
  for (let x = -150; x < 150; x += 3) for (let y = -150; y < 150; y += 3) {
    const a = sectionRegion(SEED, x, y, 20), b = sectionRegion(SEED, x, y, 21); seen.add(b.type); assert.equal(a.id, b.id); assert.equal(a.hold, b.hold);
    if (Math.hypot(x + .5, y + .5) < REGIONS.heartland) assert.equal(b.type, 'wild', 'the heartland keeps the old mix');
    if (!REGIONS_V21.from.includes(a.type)) assert.equal(b.type, a.type, `${x},${y}`); else { from++; assert.ok([a.type, 'terraces'].includes(b.type)); if (b.type === 'terraces') turned++; }
  }
  assert.ok(seen.has('terraces')); assert.ok(turned / from > .3 && turned / from < .6, `${turned} of ${from}`);
  assert.equal(sectionRegion(SEED, 14, 179, 20).type === 'terraces', false, 'version 20 has no terrace springs');
  assert.ok(REGION_GROUNDS.terraces && REGION_BANNER.kinds.terraces === 'Terrace springs' && REGION_NAMES.nouns.terraces.length >= 4);
  assert.ok(REGION_NAMES.nouns.terraces.some((n) => regionName(SEED, sectionRegion(SEED, 14, 179, 21)).endsWith(` ${n}`)));
  assert.equal(FAR_POCKETS.blobByRegion.terraces, 'saltBlob');
});

test('a terrace section: pale treads up to level 3, rims and pools, hot springs; every step one level; Atlas colours; bounded', () => {
  const list = sections(); assert.ok(list.length >= 30, `${list.length} sections`);
  let vents = 0, caches = 0, pools = 0, tiles = 0; const levels = [0, 0, 0, 0];
  for (const { x, y, m } of list) {
    const mine = m.tiles.filter((t) => t.landscape === 'terraces'); tiles += mine.length;
    for (const t of mine) { assert.ok(KINDS.includes(t.kind), t.kind); assert.equal(!!t.blocked, t.kind === 'springVent', `${x},${y} ${t.kind}`); if (!t.blocked) levels[t.elev || 0]++; if (t.kind === 'springPool') pools++; assert.ok((t.elev || 0) <= TERRACES.height.levels); }
    for (const t of mine) if (walk(t)) for (const [dx, dy] of N4) { const n = m.tiles[idx(t.x + dx, t.y + dy)]; if (t.x + dx < 0 || t.x + dx > 31 || !n || n.landscape !== 'terraces' || !walk(n)) continue; assert.ok(Math.abs((n.elev || 0) - (t.elev || 0)) <= 1, `${x},${y}: a step of two between terraces at ${t.x},${t.y}`); }
    const springs = m.hotSprings || []; assert.ok(springs.length <= TERRACES.vents[1]); vents += springs.length;
    for (const s of springs) { assert.equal(m.tiles[idx(s.x, s.y)].kind, 'springVent'); assert.ok(N4.some(([dx, dy]) => /springMat|springVent/.test(m.tiles[idx(s.x + dx, s.y + dy)].kind)), 'a vent is ringed by mats'); }
    const added = m.objects.filter((o) => String(o.id).startsWith('terrace-')); assert.ok(added.length <= 1); caches += added.length;
    for (const o of added) { assert.equal(o.kind, 'chest'); assert.equal(o.rewardSource, 'chest'); assert.ok(m.tiles[idx(o.x, o.y)].elev >= TERRACES.cache.minLevel); assert.ok(reachableFromPlaza(m)[idx(o.x, o.y)], 'the cache is reached'); }
    if (biomeFor(SEED, x, y, 21) !== 'mountains') assert.equal(m.weather, generateRegion(SEED, x, y).weather, 'no weather of its own: nothing more each frame');
  }
  assert.ok(levels.every((n) => n > 0), JSON.stringify(levels)); assert.ok(levels[3] > tiles * .05, 'the top tread is common enough');
  assert.ok(pools > tiles * .15, `${pools} pools in ${tiles}`); assert.ok(vents >= list.length, `${vents} hot springs`); assert.ok(caches >= 3, `${caches} caches`);
  for (const k of KINDS) { assert.ok(ATLAS_TILE_COLORS[k], `${k} on the Atlas`); assert.ok(isLandscapeKind(k), k); assert.equal(landscapeTileAnimated({ kind: k, landscape: 'terraces' }), false, `${k}: drawn once into the ground cache`); }
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  const m = list[0].m; for (const t of m.tiles) if (t.landscape === 'terraces') assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, W), true);
  const c = sectionAtlasColor(m), [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); assert.ok(g > r + 12 && b > r, `${c}: the Atlas reads pale turquoise`);
  assert.match(readFileSync(new URL('../src/landscape-render.ts', import.meta.url), 'utf8'), /PAINT\.springVent =/);
});

test('traversable: no trap, the cache and every exit join the plaza both ways (thin walls counted), vents never cut ground off', () => {
  let un20 = 0, un21 = 0;
  for (const { x, y } of sections().slice(0, 30)) {
    const m = make(x, y, 21, { coherence: 1 }); cohereSection(m); assert.equal(trappedTiles(m, W, W, { x: 16, y: 16 }, true).length, 0, `${x},${y}: a trap`);
    const core = coherenceCore(m), ex = sectionExits(SEED, x, y);
    for (const [ex_, ey] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) { const t = m.tiles[idx(ex_, ey)]; if (walk(t)) assert.ok(joinsCore(m, { x: ex_, y: ey }, core), `${x},${y}: exit ${ex_},${ey}`); }
    for (const o of m.objects.filter((q) => String(q.id).startsWith('terrace-cache'))) assert.ok(joinsCore(m, o, core), `${x},${y}: the cache`);
    // the hot springs, put back as ground: the plaza reaches exactly the same ground
    const plain = structuredClone(m); for (const t of plain.tiles) if (t.kind === 'springVent') { t.kind = 'springMat'; t.blocked = false; }
    const a = reachableFromPlaza(m), b = reachableFromPlaza(plain); for (let i = 0; i < 1024; i++) if (b[i] && plain.tiles[i].kind !== m.tiles[i].kind) continue; else assert.equal(!!a[i], !!b[i], `${x},${y}: ${i % 32},${i >> 5}`);
    const old = make(x, y, 20), ra = reachableFromPlaza(old), rb = reachableFromPlaza(m, undefined, true); for (let i = 0; i < 1024; i++) { if (!ra[i] && walk(old.tiles[i])) un20++; if (!rb[i] && walk(m.tiles[i])) un21++; }
  }
  assert.ok(un21 <= un20, `walkable ground the plaza cannot reach: ${un21} (version 20 on the same ground: ${un20})`);
});

test('the real movement rules: a jump climbs each tread, a ramp walks it, and creatures still have room', () => {
  const { x, y, m } = sections().find(({ m }) => m.tiles.some((t) => t.landscape === 'terraces' && t.elev === 3));
  let up = 0, ramps = 0; for (const a of m.tiles) for (const [dx, dy] of N4) { const b = m.tiles[idx(a.x + dx, a.y + dy)]; if (a.x + dx < 0 || a.x + dx > 31 || !walk(a) || !walk(b) || b.landscape !== 'terraces' || (b.elev || 0) !== (a.elev || 0) + 1) continue;
    assert.ok(canStep({ isPlayer: true, jumping: true }, m, W, a.x, a.y, b.x, b.y), `${x},${y}: jump ${a.x},${a.y} -> ${b.x},${b.y}`); up++; if (a.slope || b.slope) { ramps++; assert.ok(canStep({ isPlayer: true, jumping: false }, m, W, a.x, a.y, b.x, b.y)); } }
  assert.ok(up > 20 && ramps > 0, `${up} steps up, ${ramps} by ramp`);
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.ok((g.map.enemySpawns || []).length > 0, 'creatures still place'); for (const e of g.map.enemySpawns) assert.ok(walk(g.map.tiles[idx(Math.round(e.x), Math.round(e.y))]), 'on open ground');
});

test('neighbours agree on their shared edge: the same exit, open and at ground level on both sides, joined to each plaza', () => {
  let pair = null; for (let x = 14; x < 400 && !pair; x += 2) for (let y = 14; y < 400 && !pair; y += 3) if (sectionRegion(SEED, x, y, 21).type === 'terraces' && sectionRegion(SEED, x + 1, y, 21).type === 'terraces' && sectionRegion(SEED, x, y, 21).hold >= 1) pair = [x, y];
  assert.ok(pair); const [x, y] = pair, a = make(x, y, 21, { coherence: 1 }), b = make(x + 1, y, 21, { coherence: 1 }); cohereSection(a); cohereSection(b);
  const e = sectionExits(SEED, x, y).east; assert.equal(sectionExits(SEED, x + 1, y).west, e);
  const ta = a.tiles[idx(31, e)], tb = b.tiles[idx(0, e)]; assert.ok(walk(ta) && walk(tb)); assert.deepEqual([ta.elev || 0, tb.elev || 0], [0, 0]);
  assert.ok(joinsCore(a, { x: 31, y: e }) && joinsCore(b, { x: 0, y: e }));
  // the treads run on over the border: the same world noise on both sides (tiles one in from the edge, away from the exit)
  let same = 0, n = 0; for (let yy = 2; yy < 30; yy++) { if (Math.abs(yy - e) <= 2) continue; const p = a.tiles[idx(30, yy)], q = b.tiles[idx(1, yy)]; if (p.landscape !== 'terraces' || q.landscape !== 'terraces') continue; n++; if (Math.abs((p.elev || 0) - (q.elev || 0)) <= 1) same++; }
  assert.equal(same, n, 'no cliff opens at the border');
});

test('deterministic: two fresh generations and two fresh game loads match; a hamlet keeps the colours but stays flat', () => {
  for (const { x, y, m } of sections().slice(0, 8)) assert.equal(fp(make(x, y)), fp(m), `${x},${y}`);
  const { x, y } = sections()[1], load = () => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return { g, s }; };
  const one = load(), two = load(); assert.equal(JSON.stringify(one.g.map.tiles), JSON.stringify(two.g.map.tiles)); assert.deepEqual(one.g.map.objects.map((o) => o.id), two.g.map.objects.map((o) => o.id));
  assert.equal(one.s.atlas[`${x},${y}`].landscapeVersion, 24); assert.ok(one.g.map.tiles.some((t) => t.landscape === 'terraces'));
  const banner = (one.g.questNotices || []).find((q) => q.kind === 'discovery'); if (banner) assert.equal(banner.detail, 'Terrace springs');
  const h = make(x, y, 21, { hamlet: true }); assert.ok(h.tiles.some((t) => t.landscape === 'terraces')); assert.ok(h.tiles.filter((t) => t.landscape === 'terraces').every((t) => !t.elev && t.kind !== 'springVent'));
  assert.ok(!h.objects.some((o) => String(o.id).startsWith('terrace-')));
});

test('older ground regenerates byte for byte: sections fingerprinted on main (release 770) before this change', () => {
  for (const [seed, v, x, y, hash] of [
    ['TERR21', 20, 14, 179, '47ff960b90a441e4'], ['TERR21', 20, 17, 179, 'b90afddb31396acd'], ['TERR21', 20, 26, 314, '203172390e72a25f'], ['TERR21', 20, 29, 314, 'c494c58615c06557'],
    ['TERR21', 20, 29, 319, '8b5d4c270c9018b5'], ['TERR21', 20, 32, 314, '90cff93e344e77ad'], ['TERR21', 19, 14, 179, '47ff960b90a441e4'], ['TERR21', 11, 17, 179, 'b90afddb31396acd'],
    ['TERR21', 4, 26, 314, '203172390e72a25f'], ['TERR21', 2, 29, 314, 'b8cbd1862601424b'], ['TERR21', 20, 20, -300, '7b3c1f9b6c6a1de0'], ['TERR21', 20, 20, -289, 'eaa59fc95c1df409'],
    ['TERR21', 20, 20, -256, 'bc82b915e27d749c'], ['TERR21', 20, 20, -245, 'a04d8e91967c5017'], ['TERR21', 20, 20, -234, '84328c1573253272'], ['TERR21', 20, 20, -212, '9146d5cbbb49e617'],
    ['TERR21', 20, 20, -201, '6217571f0edfb67c'], ['TERR21', 20, 20, -168, 'e8e370b62c3ff9b7'], ['TERR21', 20, 20, -124, '65143a2cf85f1629'], ['TERR21', 20, 20, -58, 'eac8d3781c2e42f4'],
    ['TERR21', 20, 20, -25, '5502e4965413dc44'], ['TERR21', 20, 20, 8, '323a4ab5b9d53a6f'], ['TERR21', 20, 20, 151, 'a8516780ca58bf27'], ['TERR21', 20, 20, 228, 'd9eeb6a3ca215f0a'],
    ['TERR21', 20, 21, 32, '9c28206f19898b5e'], ['TERR21', 20, 22, 31, 'fad2b03f5552809c'], ['TERR21', 20, 1150, 3, '2a3c85e843334dc1'], ['TERR21', 17, 1150, 3, '91cab681d16ed0c8'],
    ['AUDIT-A', 20, 185, 22, 'ebf8c35c477a6421'],
  ]) assert.equal(fp(pinned(seed, x, y, v)), hash, `${seed} v${v} ${x},${y}`);
  assert.ok(!pinned('TERR21', 14, 179, 20).tiles.some((t) => t.landscape === 'terraces') && make(14, 179).tiles.some((t) => t.landscape === 'terraces'), 'the same ground first seen at 21 is terraced');
});

test('in the game: ground first seen at version 20 keeps its version 20 ground; new ground pins 21', () => {
  const { x, y } = sections()[0], s = freshSave(); s.seed = SEED; s.atlas = { [`${x},${y}`]: { landscapeVersion: 20 } }; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(s.atlas[`${x},${y}`].landscapeVersion, 20); assert.ok(!g.map.tiles.some((t) => t.landscape === 'terraces'), 'nothing terraced on version 20 ground');
});
