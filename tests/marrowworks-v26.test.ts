// The Marrowworks (landscape version 26; the daily world-regions work; Tim's list: a biomechanical region, made our own:
// no artist's work copied). Far Carapace Wastes, strange-growth and Obsidian regions whose site is at least REGIONS_V26.minRing sections out
// may become a buried engine of bone and plate: vertebral causeways with chevron ribs stepping down either side, gutters with
// lethal sumps spanned by sinew bridges, ichor pools, conduits, vents, rib-tip tusks, now and then a ribcage with a cache at its
// heart. Ground first seen at version 25 or older regenerates byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game, REGION_BANNER, hazardDeathWords } from '../src/game.ts';
import { generateRegion, sectionExits } from '../src/world.ts';
import { MARROW, MARROW_BLOCKED, REGIONS_V26, REGION_GROUNDS, REGION_NAMES, REGIONS, applyLandscape, applyDream, DREAM_VERSION, sectionRegion, regionName, reachableFromPlaza, trappedTiles,
  coherenceCore, joinsCore, cohereSection, isLandscapeKind, canStep, LETHAL_KINDS, fallDamage, marrowAt, marrowFlow, LANDSCAPE_VERSION, biomeFor, MAX_LEVEL } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS, sectionAtlasColor } from '../src/atlas-colors.ts';
import { drawLandscapeTile, landscapeTileAnimated, landscapeAtlasColor } from '../src/landscape-render.ts';
import { FAR_POCKETS } from '../src/far-realms.ts';
import { OUTDOOR, outdoorSkyMix, outdoorOutcropHeight } from '../src/close-view-outdoor.ts';

const SEED = 'MARROW26', W = 32, idx = (x, y) => y * W + x, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KINDS = ['marrowPlate', 'marrowGutter', 'ribCrest', 'vertebraWay', 'ichorPool', 'sinewBridge', 'ribTusk', 'marrowConduit', 'marrowVent', 'abyss'];
const make = (x, y, version = 26, opts = {}, seed = SEED) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version, ...opts }); return m; };
const walk = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
// the pins below were taken with this fingerprint on main (f19bda103, release 942) before this change (the Lunar Wastes' own test's
// fingerprint: the Far Sleep's landscape.version label follows the constant, as it always has, so it is left out)
const fp = (m) => createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, spawns: m.enemySpawns || null, canopy: m.canopy || null, mushrooms: m.mushrooms || null, weather: m.weather || null, landscape: m.landscape?.biome === 'dream' ? { ...m.landscape, version: 0 } : m.landscape || null })).digest('hex').slice(0, 16);
const pinned = (seed, x, y, v) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return m; };
let found = null;
const sections = () => found ||= (() => { const out = []; for (const seed of [SEED, 'AUDIT-A']) for (let x = 36; x < 400 && out.length < (seed === SEED ? 30 : 42); x += 3) for (let y = 36; y < 400 && out.length < (seed === SEED ? 30 : 42); y += 5) { const r = sectionRegion(seed, x, y, 26); if (r.type !== 'marrow' || r.hold < .5) continue; const m = make(x, y, 26, {}, seed); if (m.marrow) out.push({ seed, x, y, m, id: r.id }); } return out; })();

test('version 26 turns some far Carapace Wastes, strange-growth and Obsidian regions into marrowworks, about 2-5% of far sections; every other region, the heartland and the near world keep their version 25 type', () => {
  assert.equal(LANDSCAPE_VERSION, 26); assert.deepEqual(Object.keys(REGIONS_V26.chance), ['biomech', 'alien', 'obsidian']); assert.equal(REGIONS_V26.minRing, 80); assert.equal(REGIONS_V26.to, 'marrow');
  assert.ok(REGIONS_V26.minRing > REGIONS.heartland + REGIONS.fadeIn);
  for (const seed of [SEED, 'LUNA25', 'AUDIT-A']) {
    const seen = new Set(); let far = 0, marrow = 0, from = 0, turned = 0;
    for (let x = -300; x <= 300; x += 3) for (let y = -300; y <= 300; y += 3) {
      const a = sectionRegion(seed, x, y, 25), b = sectionRegion(seed, x, y, 26); seen.add(b.type); assert.equal(a.id, b.id); assert.equal(a.hold, b.hold);
      if (!REGIONS_V26.chance[a.type]) assert.equal(b.type, a.type, `${seed} ${x},${y}`); else if (b.type !== 'marrow') assert.equal(b.type, a.type);
      if (Math.hypot(x, y) < REGIONS.heartland) assert.equal(b.type, 'wild', 'the heartland keeps the old mix');
      if (b.type === 'marrow') { const [cx, cy] = b.id.split(',').map(Number); assert.ok(Math.hypot((cx + .5) * REGIONS.cell, (cy + .5) * REGIONS.cell) >= REGIONS_V26.minRing - REGIONS.cell, 'a marrowworks lies far out'); }
      if (Math.hypot(x, y) >= 40) { far++; if (b.type === 'marrow') marrow++; if (REGIONS_V26.chance[a.type]) { from++; if (b.type === 'marrow') turned++; } }
    }
    assert.ok(seen.has('marrow') && seen.has('biomech') && seen.has('alien') && seen.has('obsidian'), `${seed}: marrowworks, and the old three still`);
    assert.ok(marrow / far > .02 && marrow / far < .05, `${seed}: ${(marrow / far * 100).toFixed(2)}% of far sections are marrowworks`);
    assert.ok(turned / from > .2 && turned / from < .5, `${seed}: ${turned} of ${from} pool sections`);
    for (let x = -24; x <= 24; x++) for (let y = -24; y <= 24; y++) if (Math.hypot(x, y) < 24) assert.notEqual(sectionRegion(seed, x, y, 26).type, 'marrow', 'none near the Refuge');
  }
  const { x, y } = sections()[0]; assert.notEqual(sectionRegion(SEED, x, y, 25).type, 'marrow', 'version 25 has no marrowworks');
  assert.ok(REGION_GROUNDS.marrow && REGION_BANNER.kinds.marrow === 'Marrowworks' && REGION_NAMES.nouns.marrow.length >= 5);
  const names = new Set(sections().map((s) => regionName(s.seed, sectionRegion(s.seed, s.x, s.y, 26))));
  for (const n of names) assert.ok(REGION_NAMES.nouns.marrow.some((k) => n.startsWith('the ') && n.endsWith(` ${k}`)), n);
  assert.ok(names.size >= 3, [...names].join(', '));
  assert.equal(FAR_POCKETS.blobByRegion.marrow, 'duskBlob'); assert.equal(landscapeAtlasColor('marrow'), REGION_GROUNDS.marrow.atlas);
});

test('the engine: vertebral causeways along each region\'s bearing, ribs swept back either side with gutters between them, sumps down the gutters, a conduit between rib fields', () => {
  const S = MARROW.spine, R = MARROW.rib; assert.ok(R.reach + 2 < S.period / 2, 'open plate between one rib field and the next');
  assert.ok(R.height.levels[1] <= 3 && S.level <= 3, 'never a fall that hurts much from the engine itself');
  const bearings = new Set(); for (let i = 0; i < 40; i++) { const f = marrowFlow(SEED, `${i},${i * 3}`); assert.ok(Math.abs(Math.hypot(f.ux, f.uy) - 1) < 1e-9); bearings.add(f.ux.toFixed(3) + f.uy.toFixed(3)); }
  assert.ok(bearings.size >= 4, `${bearings.size} bearings`);
  for (const turn of [0, 2, 3]) {
    const a = turn / MARROW.flowTurns * Math.PI, f = { ux: Math.cos(a), uy: Math.sin(a) }, kinds = {}; let spine = 0, crests = 0, sumps = 0, bridges = 0, conduits = 0, tips = 0;
    for (let gy = 4000; gy < 4120; gy++) for (let gx = 4000; gx < 4120; gx++) { const q = marrowAt(SEED, f, gx, gy); kinds[q.kind] = (kinds[q.kind] || 0) + 1;
      if (q.kind === 'vertebraWay') { spine++; assert.equal(q.level, S.level); }
      if (q.rib) crests++; if (q.sump) { sumps++; if (q.bridge) bridges++; assert.equal(q.level, 0); assert.ok(q.gutter); } if (q.conduit) { conduits++; assert.equal(q.level, 0); } if (q.tip) tips++;
      assert.ok(q.level >= 0 && q.level <= Math.max(S.level, R.height.levels[1])); }
    assert.ok(spine > 200 && crests > 600 && sumps > 40 && bridges > 3 && bridges < sumps && conduits > 30 && tips > 10, JSON.stringify({ turn, spine, crests, sumps, bridges, conduits, tips }));
    for (const k of ['marrowPlate', 'marrowGutter', 'ribCrest', 'vertebraWay', 'ichorPool']) assert.ok(kinds[k] > 120, `${turn} ${k}: ${kinds[k]}`);
  }
});

test('the surface: kinds, every step one level, sumps with sinew bridges, tusks, conduits, vents, ribcages and caches; the Carapace Wastes do not lay their plates over it; Atlas colours; drawn once; bounded', () => {
  const list = sections(); assert.ok(list.length >= 40, `${list.length} sections`);
  let sump = 0, bridges = 0, tusks = 0, conduits = 0, vents = 0, cages = 0, heart = 0, ribCaches = 0, tiles = 0, high = 0; const kinds = {};
  for (const { seed, x, y, m } of list) {
    const mine = m.tiles.filter((t) => t.landscape === 'marrow'); tiles += mine.length;
    for (const t of mine) { assert.ok(KINDS.includes(t.kind) || (t.kind === 'mountainTrail' && t.slope), t.kind); kinds[t.kind] = (kinds[t.kind] || 0) + 1; assert.equal(!!t.blocked, MARROW_BLOCKED.includes(t.kind), `${x},${y} ${t.kind}`); assert.equal(t.kind === 'abyss', !!t.sump);
      if (t.sump) { sump++; assert.equal(t.elev || 0, 0, 'a sump is a shaft at the foot of the ground'); } else if (!t.blocked) assert.ok((t.elev || 0) <= MAX_LEVEL);
      if (t.kind === 'sinewBridge') bridges++; if (!t.blocked && (t.elev || 0) >= 2) high++; if (t.kind === 'ichorPool') assert.equal(t.elev || 0, 0, 'ichor lies low'); }
    for (const t of mine) if (walk(t)) for (const [dx, dy] of N4) { const n = m.tiles[idx(t.x + dx, t.y + dy)]; if (t.x + dx < 0 || t.x + dx > 31 || !n || n.landscape !== 'marrow' || !walk(n)) continue; assert.ok(Math.abs((n.elev || 0) - (t.elev || 0)) <= 1, `${x},${y}: a step of two at ${t.x},${t.y}`); }
    const tk = mine.filter((t) => t.kind === 'ribTusk').length, cd = mine.filter((t) => t.kind === 'marrowConduit').length, vt = mine.filter((t) => t.kind === 'marrowVent').length;
    assert.equal(m.tusks || 0, tk); assert.equal(m.conduits || 0, cd, `${seed} ${x},${y} conduits`); assert.equal(m.sumps || 0, mine.filter((t) => t.sump).length); assert.ok(vt <= MARROW.vent.max); tusks += tk; conduits += cd; vents += vt;
    assert.ok(tk <= MARROW.tusk.max + 16, `${tk} tusks`);
    if (m.ribcage) { cages++; const c = m.ribcage; assert.ok(c.r >= MARROW.ribcage.r[0] && c.r <= MARROW.ribcage.r[1]); assert.equal(m.tiles[idx(c.x, c.y)].kind, 'vertebraWay', 'a bone floor at its heart');
      const ring = m.tiles.filter((t) => Math.abs(Math.hypot(t.x - c.x, t.y - c.y) - c.r) <= .5); assert.ok(ring.some((t) => t.kind === 'ribTusk') && ring.some((t) => walk(t)), 'a ring of tusks with ways in'); }
    const added = m.objects.filter((o) => String(o.id).startsWith('marrow-')); assert.ok(added.length <= 1);
    for (const o of added) { assert.equal(o.kind, 'chest'); assert.equal(o.rewardSource, 'chest'); assert.ok(reachableFromPlaza(m)[idx(o.x, o.y)], 'the cache is reached');
      if (o.ribcage) { heart++; assert.equal(o.name, MARROW.cache.heartName); assert.deepEqual([o.x, o.y], [m.ribcage.x, m.ribcage.y]); } else { ribCaches++; assert.equal(m.tiles[idx(o.x, o.y)].kind, 'ribCrest'); assert.ok(m.tiles[idx(o.x, o.y)].elev >= MARROW.cache.minLevel); } }
    if (biomeFor(seed, x, y, 26) !== 'mountains') assert.equal(m.weather, generateRegion(seed, x, y).weather, 'no weather of its own: nothing more each frame');
    assert.ok(!m.tiles.some((t) => t.landscape === 'biomech' || t.landscape === 'obsidian') || sectionRegion(seed, x, y, 26).hold < 1, `${x},${y}: the palette regions do not lay their ground over the marrowworks`);
  }
  for (const k of ['marrowPlate', 'marrowGutter', 'ribCrest', 'vertebraWay', 'ichorPool']) assert.ok(kinds[k] > tiles * .02, `${k}: ${kinds[k]} of ${tiles}`);
  console.log(`  ${list.length} sections: ${sump} sump tiles, ${bridges} sinew bridges, ${tusks} tusks, ${conduits} conduit tiles, ${vents} vents, ${cages} ribcages (${heart} heart caches), ${ribCaches} rib caches, ${high} tiles at level 2+`);
  assert.ok(sump >= list.length && sump < tiles * .04, `${sump} sump tiles in ${tiles}`); assert.ok(bridges >= 20, `${bridges} sinew bridges`);
  assert.ok(tusks >= list.length && conduits >= list.length && vents >= 10, `${tusks} tusks, ${conduits} conduits, ${vents} vents`); assert.ok(cages >= 4 && heart >= 3 && ribCaches >= 2, `${cages} ribcages, ${heart} + ${ribCaches} caches`);
  assert.ok(high > tiles * .04, `${high} raised tiles`);
  for (const k of KINDS) { assert.ok(ATLAS_TILE_COLORS[k], `${k} on the Atlas`); if (k !== 'abyss') assert.ok(isLandscapeKind(k), k); }
  for (const k of KINDS.filter((k) => k !== 'abyss')) assert.equal(landscapeTileAnimated({ kind: k, landscape: 'marrow' }), false, `${k}: drawn once into the ground cache`);
  assert.equal(landscapeTileAnimated({ kind: 'abyss', landscape: 'marrow', sump: true }), false, 'a sump is drawn once too');
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  for (const { m } of list.filter((s) => s.m.sumps || s.m.ribcage).slice(0, 4)) for (const t of m.tiles) if (t.landscape === 'marrow') assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, W), true);
  const full = list.map((s) => s.m).sort((a, b) => b.tiles.filter((t) => t.landscape === 'marrow').length - a.tiles.filter((t) => t.landscape === 'marrow').length)[0];
  const c = sectionAtlasColor(full), [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); assert.ok(g >= r && g + b > 2 * r, `${c}: the Atlas reads a verdigris slate`);
  for (const [name, hex] of [['Carapace Wastes', '#474b53'], ['Deepwood', '#2a4a2b'], ['Fog Moors', '#7b8580'], ['Obsidian Fields', '#1d1b22']]) { const q = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); assert.ok(Math.hypot(r - q[0], g - q[1], b - q[2]) > 20, `${c}: apart from the ${name}`); }
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
test('traversable (solver): no trap, every exit, cache and ribcage heart join the plaza both ways, no drop kills, sumps are always crossed and never cut ground off', () => {
  let unOld = 0, unNew = 0, checked = 0, crossed = 0;
  for (const { seed, x, y } of sections().slice(0, 42)) {
    const m = make(x, y, 26, { coherence: 1 }, seed); cohereSection(m); assert.equal(trappedTiles(m, W, W, { x: 16, y: 16 }, true).length, 0, `${x},${y}: a trap`);
    const core = coherenceCore(m), ex = sectionExits(seed, x, y), go = solve(m, { x: 16, y: 16 }), back = solve(m, { x: 16, y: 16 }, true);
    for (const [ex_, ey] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) { const t = m.tiles[idx(ex_, ey)]; if (!walk(t)) continue; assert.ok(joinsCore(m, { x: ex_, y: ey }, core), `${x},${y}: exit ${ex_},${ey}`); assert.ok(go[idx(ex_, ey)], `${x},${y}: the solver reaches exit ${ex_},${ey}`); assert.ok(back[idx(ex_, ey)], `${x},${y}: from exit ${ex_},${ey} back to the plaza`); checked++; }
    for (const o of m.objects.filter((q) => String(q.id).startsWith('marrow-cache'))) { assert.ok(joinsCore(m, o, core), `${x},${y}: the cache`); assert.ok(go[idx(o.x, o.y)] && back[idx(o.x, o.y)], 'to the cache and back'); }
    for (let i = 0; i < 1024; i++) if (go[i]) for (const [dx, dy] of N4) { const a = m.tiles[i], b = m.tiles[idx(a.x + dx, a.y + dy)]; if (b && walk(b) && a.landscape === 'marrow') assert.ok((a.elev || 0) - (b.elev || 0) < 4, 'no fatal ledge'); }
    // with every hazard lifted (each at its foot), the ground reached both ways is no larger than with them
    const plain = structuredClone(m); for (const t of plain.tiles) if (t.sump || MARROW_BLOCKED.includes(t.kind)) { delete t.sump; t.kind = 'marrowPlate'; t.blocked = false; }
    const pg = solve(plain, { x: 16, y: 16 }), pb = solve(plain, { x: 16, y: 16 }, true); for (let i = 0; i < 1024; i++) if (pg[i] && pb[i] && walk(m.tiles[i]) && plain.tiles[i].kind === m.tiles[i].kind && !(go[i] && back[i])) assert.fail(`${x},${y}: ${i % 32},${i >> 5} cut off by the engine`);
    // each sump: the walkable ground on both its sides is reached both ways (over a sinew bridge or round its end)
    for (const t of m.tiles) if (t.sump) for (const [dx, dy] of [[1, 0], [0, 1]]) { const p = m.tiles[idx(t.x - dx, t.y - dy)], q = m.tiles[idx(t.x + dx, t.y + dy)]; if (!walk(p) || !walk(q) || !pg[idx(p.x, p.y)] || !pg[idx(q.x, q.y)]) continue; assert.ok(go[idx(p.x, p.y)] && go[idx(q.x, q.y)] && back[idx(p.x, p.y)] && back[idx(q.x, q.y)], `${x},${y}: across the sump at ${t.x},${t.y}`); crossed++; }
    const old = make(x, y, 25, {}, seed), ra = reachableFromPlaza(old), rb = solve(m, { x: 16, y: 16 }); for (let i = 0; i < 1024; i++) { if (!ra[i] && walk(old.tiles[i])) unOld++; if (!rb[i] && walk(m.tiles[i])) unNew++; }
  }
  assert.ok(checked > 90, `${checked} exits`); assert.ok(crossed > 10, `${crossed} sump crossings`); assert.ok(unNew <= unOld + 30, `walkable ground the plaza cannot reach: ${unNew} (version 25 on the same ground: ${unOld})`);
});

test('the real movement rules: a jump climbs each rib, a sump is lethal ground the brink stops and is named on waking, creatures still have room, the game lays the same engine', () => {
  // the first such section the game does not lay as a hamlet (hamlets keep the colours but stay flat, so they have no sumps)
  const hamlet = (x, y) => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return (g.map.objects || []).some((o) => o.kind === 'shelterMerchant' || o.kind === 'villager'); };
  const { x, y, m } = sections().find(({ seed, m, x, y }) => seed === SEED && m.sumps && m.tiles.some((t) => t.kind === 'ribCrest' && t.elev >= 2) && !hamlet(x, y));
  let up = 0; for (const a of m.tiles) for (const [dx, dy] of N4) { const b = m.tiles[idx(a.x + dx, a.y + dy)]; if (a.x + dx < 0 || a.x + dx > 31 || !walk(a) || !walk(b) || b.landscape !== 'marrow' || (b.elev || 0) !== (a.elev || 0) + 1) continue;
    assert.ok(canStep({ isPlayer: true, jumping: true }, m, W, a.x, a.y, b.x, b.y), `${x},${y}: jump ${a.x},${a.y} -> ${b.x},${b.y}`); assert.equal(canStep({ isPlayer: true, jumping: false }, m, W, a.x, a.y, b.x, b.y), !!(a.slope || b.slope)); up++; }
  assert.ok(up > 20, `${up} steps up`);
  const shaft = m.tiles.find((t) => t.sump); assert.ok(LETHAL_KINDS.has(shaft.kind) && !shaft.blocked, 'open lethal ground, as every chasm'); assert.equal(hazardDeathWords('abyss', shaft), 'Lost down a marrow sump');
  assert.equal(hazardDeathWords('abyss', { kind: 'abyss' }), 'Lost to the abyss', 'an ordinary abyss keeps its words');
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.ok(g.map.tiles.some((t) => t.sump), 'the game lays the same sumps'); assert.ok(g.map.tiles.some((t) => t.landscape === 'marrow'));
  assert.ok((g.map.enemySpawns || []).length > 0, 'creatures still place'); for (const e of g.map.enemySpawns) assert.ok(walk(g.map.tiles[idx(Math.round(e.x), Math.round(e.y))]), 'on open ground');
});

test('neighbours agree on their shared edge: the same exit, open and at ground level on both sides; the engine runs on over the border', () => {
  let pair = null; for (let x = 36; x < 400 && !pair; x += 2) for (let y = 36; y < 400 && !pair; y += 3) if (sectionRegion(SEED, x, y, 26).type === 'marrow' && sectionRegion(SEED, x + 1, y, 26).type === 'marrow' && sectionRegion(SEED, x, y, 26).hold >= 1 && sectionRegion(SEED, x + 1, y, 26).id === sectionRegion(SEED, x, y, 26).id) pair = [x, y];
  assert.ok(pair); const [x, y] = pair, a = make(x, y, 26, { coherence: 1 }), b = make(x + 1, y, 26, { coherence: 1 }); cohereSection(a); cohereSection(b);
  const e = sectionExits(SEED, x, y).east; assert.equal(sectionExits(SEED, x + 1, y).west, e);
  const ta = a.tiles[idx(31, e)], tb = b.tiles[idx(0, e)]; assert.ok(walk(ta) && walk(tb)); assert.deepEqual([ta.elev || 0, tb.elev || 0], [0, 0]);
  assert.ok(joinsCore(a, { x: 31, y: e }) && joinsCore(b, { x: 0, y: e }));
  const f = marrowFlow(SEED, sectionRegion(SEED, x, y, 26).id); let n = 0, near = 0;
  for (let yy = 0; yy < 32; yy++) for (const gx of [x * 32 + 31, x * 32 + 32]) assert.deepEqual(marrowAt(SEED, f, gx, y * 32 + yy), marrowAt(SEED, { ...f }, gx, y * 32 + yy), 'one world field over the shared edge');
  for (let yy = 1; yy < 31; yy++) { const p = a.tiles[idx(31, yy)], q = b.tiles[idx(0, yy)]; if (!walk(p) || !walk(q)) continue; n++; if (Math.abs((p.elev || 0) - (q.elev || 0)) <= 1) near++; }
  assert.ok(n >= 1, `${n}`); assert.equal(near, n, 'no cliff opens where the border is open');
});

test('deterministic: two fresh generations and two fresh game loads match; a hamlet keeps the colours but stays flat', () => {
  for (const { seed, x, y, m } of sections().slice(0, 8)) assert.equal(fp(make(x, y, 26, {}, seed)), fp(m), `${x},${y}`);
  const { x, y } = sections()[1], load = () => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return { g, s }; };
  const one = load(), two = load(); assert.equal(JSON.stringify(one.g.map.tiles), JSON.stringify(two.g.map.tiles)); assert.deepEqual(one.g.map.objects.map((o) => o.id), two.g.map.objects.map((o) => o.id));
  assert.equal(one.s.atlas[`${x},${y}`].landscapeVersion, 26); assert.ok(one.g.map.tiles.some((t) => t.landscape === 'marrow'));
  assert.equal(one.s.schemaVersion ?? 14, 14);
  const h = make(x, y, 26, { hamlet: true }); assert.ok(h.tiles.some((t) => t.landscape === 'marrow')); assert.ok(h.tiles.filter((t) => t.landscape === 'marrow').every((t) => !t.elev && !t.blocked && !t.sump));
  assert.ok(!h.objects.some((o) => String(o.id).startsWith('marrow-')));
});

test('older ground regenerates byte for byte: sections fingerprinted on main (f19bda103) before this change', () => {
  for (const [seed, v, x, y, hash] of [
    ['MARROW26', 25, 36, 201, '51632202e2ba4b64'], ['MARROW26', 24, 36, 201, 'b00b20af5d404c2e'], ['MARROW26', 11, 36, 201, '8e3b74dcfe5fe8de'], ['MARROW26', 4, 36, 201, 'ea4be70d237a1ebb'],
    ['MARROW26', 2, 36, 201, '45b5f5583ebb2a56'], ['MARROW26', 25, 36, 326, 'd8b565acfd65b5ad'], ['MARROW26', 11, 36, 326, '8a3379f4d4982042'], ['MARROW26', 25, 48, 376, 'b258a18a4e9811f9'],
    ['MARROW26', 10, 48, 376, '23cedf8b588c7266'], ['MARROW26', 9, 48, 376, '49607a36e7a9882d'], ['MARROW26', 25, 36, 36, '8d22db5692bcf930'], ['MARROW26', 21, 39, 206, '8939185538be6ffa'],
    ['AUDIT-A', 25, 36, 101, '6f5b7a1ab20cd844'], ['AUDIT-A', 23, 36, 101, 'f0a52a9a1d6fbb26'], ['AUDIT-A', 25, 45, 131, '8b06771c2db81149'], ['AUDIT-A', 17, 45, 131, '776f58b90adb158c'],
    ['LUNA25', 25, 42, 76, 'aada63fa99f2c9e8'], ['LUNA25', 24, 42, 106, '78b60b4047a0966a'], ['LUNA25', 25, 40, 95, '13e2682eaa242bea'], ['LUNA25', 25, 3, 5, '3a82389e9a1abadd'],
    ['LUNA25', 25, 20, -30, '2db8f1b936068b6b'], ['LUNA25', 25, 1150, 3, 'bd9e746e4be69dfc'], ['RIME24', 25, 34, 75, '9ac2f64a9060188c'], ['AUDIT-A', 25, -60, 44, 'a580c3eea1b79ce5'],
    ['AUDIT-A', 25, 20, 262, '8ff417e9189c56aa'], ['MARROW26', 6, 36, 36, '337c769c035df6f1'],
  ]) assert.equal(fp(pinned(seed, x, y, v)), hash, `${seed} v${v} ${x},${y}`);
  assert.ok(!pinned(SEED, 36, 201, 25).tiles.some((t) => t.landscape === 'marrow') && make(36, 201).tiles.some((t) => t.landscape === 'marrow'), 'the same ground first seen at 26 is a marrowworks');
  assert.ok(pinned('AUDIT-A', 36, 101, 25).tiles.some((t) => t.landscape === 'biomech') && make(36, 101, 26, {}, 'AUDIT-A').tiles.some((t) => t.landscape === 'marrow'), 'Carapace Wastes first seen at 25 keep their plates');
});

test('in the game: ground first seen at version 25 keeps its version 25 ground; new ground pins 26', () => {
  const { x, y } = sections()[0], s = freshSave(); s.seed = SEED; s.atlas = { [`${x},${y}`]: { landscapeVersion: 25 } }; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(s.atlas[`${x},${y}`].landscapeVersion, 25); assert.ok(!g.map.tiles.some((t) => t.landscape === 'marrow'), 'no marrowworks on version 25 ground');
  const t = freshSave(); t.seed = SEED; const h = new Game(t, 0); h.rx = x; h.ry = y; h.loadArea('overworld'); assert.equal(t.atlas[`${x},${y}`].landscapeVersion, 26); assert.ok(h.map.tiles.some((q) => q.landscape === 'marrow'));
});

test('Close View: a low bruised overcast sky of its own; the ground reads as plate, bone and ichor; tusks and conduits stand up as solids', () => {
  assert.equal(OUTDOOR.skyOf.marrow, 'marrow'); const k = OUTDOOR.skies.marrow; assert.ok(k.clouds > .5 && !k.planet);
  for (const mood of Object.keys(OUTDOOR.moods)) { const s: any = outdoorSkyMix('marrow', mood); assert.equal(s.id, 'marrow'); assert.equal(s.planet, 0); }
  const surface = (kind) => OUTDOOR.surfaces.find(([, re]) => re.test(kind))?.[0] || 'earth';
  assert.equal(surface('marrowPlate'), 'paved'); assert.equal(surface('vertebraWay'), 'paved'); assert.equal(surface('ribCrest'), 'rock'); assert.equal(surface('marrowGutter'), 'rock'); assert.equal(surface('sinewBridge'), 'paved');
  assert.ok(OUTDOOR.waterKinds.test('ichorPool'), 'ichor reflects the sky like water');
  for (const kind of ['abyss', 'canyon', 'ribPlate', 'regolith', 'lunarRim', 'serac', 'ribSpire']) assert.equal(OUTDOOR.surfaces.find(([, re]) => re.test(kind))?.[0] || 'earth', ({ abyss: 'earth', canyon: 'earth', ribPlate: 'earth', regolith: 'rock', lunarRim: 'rock', serac: 'snow', ribSpire: 'earth' })[kind], `${kind}: unchanged`);
  const tusk = outdoorOutcropHeight({ kind: 'ribTusk', x: 3, y: 4 }), pipe = outdoorOutcropHeight({ kind: 'marrowConduit', x: 3, y: 4 }), vent = outdoorOutcropHeight({ kind: 'marrowVent', x: 3, y: 4 });
  assert.ok(tusk > 2 && pipe > .6 && pipe < 1 && vent < .7, `${tusk} ${pipe} ${vent}`);
  const spire = outdoorOutcropHeight({ kind: 'ribSpire', x: 3, y: 4 }); assert.ok(spire >= 2.1 && spire <= 2.9, 'the Carapace Wastes\' spires keep their rule');
});

test('cost: generation only, within the cost of the Lunar Wastes on this machine; nothing per frame', () => {
  const pick = (type, v) => { const out = []; for (let x = 36; x < 600 && out.length < 16; x += 3) for (let y = 36; y < 600 && out.length < 16; y += 5) { const r = sectionRegion(SEED, x, y, v); if (r.type === type && r.hold >= .5) out.push([x, y]); } return out; };
  const time = (list, v) => { let best = Infinity; for (let k = 0; k < 2; k++) { let ms = 0; for (const [x, y] of list) { const m = generateRegion(SEED, x, y); const t0 = performance.now(); applyLandscape(m, SEED, x, y, { version: v }); ms += performance.now() - t0; } best = Math.min(best, ms / list.length); } return best; };
  const marrow = pick('marrow', 26), lunar = pick('regolith', 26); assert.ok(marrow.length >= 12 && lunar.length >= 12);
  time(marrow, 26); const a = time(marrow, 26), b = time(lunar, 26), c = time(marrow, 25);
  console.log(`  marrowworks (v26) ${a.toFixed(1)} ms a section; lunar waste ${b.toFixed(1)} ms; the same ground at v25 ${c.toFixed(1)} ms`);
  assert.ok(a < b * 1.6 + 6, `marrow ${a.toFixed(1)} ms vs lunar ${b.toFixed(1)} ms a section`);
  const m = make(...marrow[0]); assert.ok(!m.tiles.some((t) => landscapeTileAnimated(t) && t.landscape === 'marrow'), 'nothing of it animated'); assert.equal(m.weather, generateRegion(SEED, ...marrow[0]).weather);
});
