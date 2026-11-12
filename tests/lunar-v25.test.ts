// The Lunar Wastes (landscape version 25; the daily world-regions work, Tim 2026-10-29: "find ways to make the map have
// interesting features... beautiful collections of regions... rich and vibrant, as I explore it, without decreasing
// performance"; his list: "a lunar / alien-planet surface"). Barren regions (the Moonlands, deserts, the last wild and bare
// plains) whose site is at least REGIONS_V25.minRing sections out may become lunar wastes: pale regolith and dark basalt maria,
// craters of three sizes (raised rims, sunken floors, central peaks, overlapping), ejecta rays, boulders, winding rilles (lethal
// deep ones spanned by natural bridges), now and then a monolith and a cache. Ground first seen at version 24 or older
// regenerates byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game, REGION_BANNER } from '../src/game.ts';
import { generateRegion, sectionExits } from '../src/world.ts';
import { LUNAR, REGIONS_V25, REGION_GROUNDS, REGION_NAMES, REGIONS, applyLandscape, applyDream, DREAM_VERSION, sectionRegion, regionName, reachableFromPlaza, trappedTiles,
  coherenceCore, joinsCore, cohereSection, isLandscapeKind, canStep, LETHAL_KINDS, fallDamage, lunarCraters, lunarAt, LANDSCAPE_VERSION, biomeFor } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS, sectionAtlasColor } from '../src/atlas-colors.ts';
import { drawLandscapeTile, landscapeTileAnimated, landscapeAtlasColor } from '../src/landscape-render.ts';
import { FAR_POCKETS } from '../src/far-realms.ts';
import { OUTDOOR, outdoorSkyMix } from '../src/close-view-outdoor.ts';

const SEED = 'LUNA25', W = 32, idx = (x, y) => y * W + x, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KINDS = ['regolith', 'mareBasalt', 'craterBowl', 'lunarRim', 'ejectaRay', 'rilleFloor', 'rilleBridge', 'lunarBoulder', 'craterMount', 'lunarMonolith', 'fallenMonolith', 'abyss'];
const BLOCKED = ['lunarBoulder', 'craterMount', 'lunarMonolith', 'fallenMonolith'];
const make = (x, y, version = 25, opts = {}, seed = SEED) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version, ...opts }); return m; };
const walk = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
// the pins below were taken with this fingerprint on main (8e160cc9, release 915) before this change; the Far Sleep's
// landscape.version label follows the constant (as it always has), so it is left out
const fp = (m) => createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, spawns: m.enemySpawns || null, canopy: m.canopy || null, mushrooms: m.mushrooms || null, weather: m.weather || null, landscape: m.landscape?.biome === 'dream' ? { ...m.landscape, version: 0 } : m.landscape || null })).digest('hex').slice(0, 16);
const pinned = (seed, x, y, v) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return m; };
let found = null;
const sections = () => found ||= (() => { const out = []; for (const seed of [SEED, 'AUDIT-A']) for (let x = 40; x < 400 && out.length < (seed === SEED ? 30 : 40); x += 3) for (let y = 40; y < 400 && out.length < (seed === SEED ? 30 : 40); y += 5) { const r = sectionRegion(seed, x, y, 25); if (r.type !== 'regolith' || r.hold < .5) continue; const m = make(x, y, 25, {}, seed); if (m.lunar) out.push({ seed, x, y, m, id: r.id }); } return out; })();

test('version 25 turns some far barren regions into lunar wastes, about 3-4% of far sections; every other region, the heartland and the near world keep their version 24 type', () => {
  assert.equal(LANDSCAPE_VERSION, 25); assert.deepEqual(Object.keys(REGIONS_V25.chance), ['lunar', 'desert', 'wild', 'ashfields', 'glasslands', 'emberlands']); assert.equal(REGIONS_V25.minRing, 40);
  assert.ok(REGIONS_V25.minRing > REGIONS.heartland + REGIONS.fadeIn);
  for (const seed of [SEED, 'RIME24', 'AUDIT-A']) {
    const seen = new Set(); let far = 0, lunar = 0, from = 0, turned = 0;
    for (let x = -300; x <= 300; x += 3) for (let y = -300; y <= 300; y += 3) {
      const a = sectionRegion(seed, x, y, 24), b = sectionRegion(seed, x, y, 25); seen.add(b.type); assert.equal(a.id, b.id); assert.equal(a.hold, b.hold);
      if (!REGIONS_V25.chance[a.type]) assert.equal(b.type, a.type, `${seed} ${x},${y}`); else if (b.type !== 'regolith') assert.equal(b.type, a.type);
      if (Math.hypot(x, y) < REGIONS.heartland) assert.equal(b.type, 'wild', 'the heartland keeps the old mix');
      if (b.type === 'regolith') { const [cx, cy] = b.id.split(',').map(Number); assert.ok(Math.hypot((cx + .5) * REGIONS.cell, (cy + .5) * REGIONS.cell) >= REGIONS_V25.minRing - REGIONS.cell, 'a lunar waste lies far out'); }
      if (Math.hypot(x, y) >= 40) { far++; if (b.type === 'regolith') lunar++; if (REGIONS_V25.chance[a.type]) { from++; if (b.type === 'regolith') turned++; } }
    }
    assert.ok(seen.has('regolith') && seen.has('lunar') && seen.has('desert'), `${seed}: lunar wastes, and moonlands and deserts still`);
    assert.ok(lunar / far > .025 && lunar / far < .05, `${seed}: ${(lunar / far * 100).toFixed(2)}% of far sections are lunar waste`);
    assert.ok(turned / from > .15 && turned / from < .4, `${seed}: ${turned} of ${from} barren sections`);
    for (let x = -32; x <= 32; x++) for (let y = -32; y <= 32; y++) if (Math.hypot(x, y) < 28) assert.notEqual(sectionRegion(seed, x, y, 25).type, 'regolith', 'none near the Refuge');
  }
  const { x, y } = sections()[0]; assert.notEqual(sectionRegion(SEED, x, y, 24).type, 'regolith', 'version 24 has no lunar wastes');
  assert.ok(REGION_GROUNDS.regolith && REGION_BANNER.kinds.regolith === 'Lunar waste' && REGION_NAMES.nouns.regolith.length >= 5);
  const names = new Set(sections().map((s) => regionName(s.seed, sectionRegion(s.seed, s.x, s.y, 25))));
  for (const n of names) assert.ok(/^Mare [A-Z]/.test(n) || REGION_NAMES.nouns.regolith.some((k) => n.startsWith('the ') && n.endsWith(` ${k}`)), n);
  assert.ok([...names].some((n) => n.startsWith('Mare ')) && [...names].some((n) => n.startsWith('the ')), [...names].join(', '));
  assert.equal(FAR_POCKETS.blobByRegion.regolith, 'duskBlob'); assert.equal(landscapeAtlasColor('regolith'), REGION_GROUNDS.regolith.atlas);
});

test('craters: three sizes, raised rims one level up, sunken floors one down, central peaks, overlapping, rays from the large ones; the same numbers from every section', () => {
  const P = LUNAR.profile; let big = 0, rays = 0, peaks = 0, overlaps = 0, sunk = 0; const sizes = new Set();
  for (let x = 60; x < 80; x++) {
    const cs = lunarCraters(SEED, x, 70); assert.ok(cs.length < 60, `${cs.length} craters reach a section: bounded`);
    for (const c of cs) {
      sizes.add(c.k); const S = LUNAR.craters[c.k]; assert.ok(c.r >= S.r[0] && c.r <= S.r[1]); assert.equal(c.floor, Math.max(0, c.base - 1)); assert.equal(c.crest, Math.min(LUNAR.levels, c.base + 1));
      if (c.base >= 1) sunk++; if (c.peak) peaks++; if (c.rays) { rays++; assert.ok(c.rays.length >= S.rays[0] && c.rays.length <= S.rays[1]); } if (c.k === 0) big++;
      for (const d of cs) if (d !== c && Math.hypot(d.x - c.x, d.y - c.y) < c.r + d.r) overlaps++;
      // the profile, read at the crater's own centre line (east of the centre), where no younger crater lies
      if (cs.some((d) => d.k > c.k && Math.hypot(d.x - c.x, d.y - c.y) < c.r + d.r + 2) || cs.some((d) => d.k === c.k && d !== c && Math.hypot(d.x - c.x, d.y - c.y) < c.r + d.r + 2)) continue;
      const older = cs.filter((d) => d.k <= c.k), gy = Math.floor(c.y), inner = lunarAt(SEED, older, Math.floor(c.x), gy);
      let rx = Math.floor(c.x + c.r - 1); while (Math.hypot(rx + .5 - c.x, gy + .5 - c.y) < c.r - P.crest + .02) rx++; const rim = lunarAt(SEED, older, rx, gy); assert.ok(Math.hypot(rx + .5 - c.x, gy + .5 - c.y) <= c.r + P.lip);
      if (!inner.rille) { assert.equal(inner.level, c.floor, 'the floor sinks'); assert.equal(inner.kind, 'craterBowl'); }
      if (!rim.rille) { assert.equal(rim.level, c.crest, 'the rim stands one up'); assert.equal(rim.kind, 'lunarRim'); }
    }
  }
  assert.deepEqual([...sizes].sort(), [0, 1, 2]); assert.ok(big > 0 && rays > 0 && peaks > 5 && overlaps > 5 && sunk > 5, JSON.stringify({ big, rays, peaks, overlaps, sunk }));
  const a = lunarCraters(SEED, 70, 70), b = lunarCraters(SEED, 71, 70), key = (c) => `${c.k}:${c.x}:${c.y}`, B = new Map(b.map((c) => [key(c), c]));
  let shared = 0; for (const c of a) { const d = B.get(key(c)); if (!d) continue; shared++; assert.deepEqual([d.r, d.base, d.floor, d.crest, d.peak, d.rays], [c.r, c.base, c.floor, c.crest, c.peak, c.rays], 'neighbours read the same crater'); }
  assert.ok(shared > 3, `${shared} craters shared over the border`);
  let ray = 0; for (const c of a.filter((q) => q.rays)) for (let k = 0; k < 400; k++) { const ang = k / 400 * 2 * Math.PI, d = c.r * (1.6 + (k % 7) * .2), at = lunarAt(SEED, [c], Math.floor(c.x + Math.cos(ang) * d), Math.floor(c.y + Math.sin(ang) * d)); if (at.kind === 'ejectaRay') ray++; }
  assert.ok(a.every((c) => !c.rays) || ray > 10, `${ray} ray samples`);
});

test('the surface: kinds, every step one level, rilles with natural bridges, boulders, peaks, monoliths, caches; Atlas colours; drawn once; bounded', () => {
  const list = sections(); assert.ok(list.length >= 36, `${list.length} sections`);
  let rille = 0, trench = 0, bridges = 0, boulders = 0, peaks = 0, monoliths = 0, fallen = 0, caches = 0, tiles = 0, rimUp = 0, rimDown = 0; const kinds = {};
  for (const { seed, x, y, m } of list) {
    const mine = m.tiles.filter((t) => t.landscape === 'regolith'); tiles += mine.length;
    // (a mountain section's summit trail may be paved across the waste: placeSummit, as on every landscape)
    for (const t of mine) { assert.ok(KINDS.includes(t.kind) || (t.kind === 'mountainTrail' && t.slope), t.kind); kinds[t.kind] = (kinds[t.kind] || 0) + 1; assert.equal(!!t.blocked, BLOCKED.includes(t.kind), `${x},${y} ${t.kind}`); assert.equal(t.kind === 'abyss', !!t.rille);
      if (t.rille) { rille++; assert.equal(t.elev || 0, 0, 'a deep rille is a slot at the foot of the ground'); } else if (!t.blocked) assert.ok((t.elev || 0) <= LUNAR.levels);
      if (t.kind === 'rilleBridge') bridges++; if (t.kind === 'rilleFloor') trench++; }
    for (const t of mine) if (walk(t)) for (const [dx, dy] of N4) { const n = m.tiles[idx(t.x + dx, t.y + dy)]; if (t.x + dx < 0 || t.x + dx > 31 || !n || n.landscape !== 'regolith' || !walk(n)) continue; assert.ok(Math.abs((n.elev || 0) - (t.elev || 0)) <= 1, `${x},${y}: a step of two at ${t.x},${t.y}`);
      if (t.kind === 'lunarRim' && n.kind === 'craterBowl') { if ((t.elev || 0) > (n.elev || 0)) rimUp++; else if ((t.elev || 0) < (n.elev || 0)) rimDown++; } }
    const stones = mine.filter((t) => t.kind === 'lunarBoulder').length; assert.ok(stones <= LUNAR.boulder.max); assert.equal(m.boulders || 0, stones); boulders += stones;
    assert.equal((m.craterPeaks || []).length, mine.filter((t) => t.kind === 'craterMount').length); peaks += (m.craterPeaks || []).length;
    assert.equal(m.rilles || 0, mine.filter((t) => t.rille).length);
    const slabs = mine.filter((t) => t.kind === 'lunarMonolith' || t.kind === 'fallenMonolith'); assert.ok(slabs.length <= 1); assert.equal(!!m.monolith, slabs.length === 1); monoliths += slabs.length;
    if (m.monolith) { assert.equal(m.tiles[idx(m.monolith.x, m.monolith.y)].kind, m.monolith.fallen ? 'fallenMonolith' : 'lunarMonolith'); if (m.monolith.fallen) fallen++; }
    const added = m.objects.filter((o) => String(o.id).startsWith('lunar-')); assert.ok(added.length <= 1); caches += added.length;
    for (const o of added) { assert.equal(o.kind, 'chest'); assert.equal(o.rewardSource, 'chest'); assert.ok(m.tiles[idx(o.x, o.y)].elev >= LUNAR.cache.minLevel); assert.equal(m.tiles[idx(o.x, o.y)].kind, 'lunarRim'); assert.ok(reachableFromPlaza(m)[idx(o.x, o.y)], 'the cache is reached'); }
    if (biomeFor(seed, x, y, 25) !== 'mountains') assert.equal(m.weather, generateRegion(seed, x, y).weather, 'no weather of its own: nothing more each frame');
    assert.ok(!m.tiles.some((t) => t.kind === 'moonDust' && t.landscape === 'lunar' && sectionRegion(seed, x, y, 25).type === 'regolith' && t.x === 16 && t.y === 16), 'the Moonlands do not lay their dust over a lunar waste');
  }
  for (const k of ['regolith', 'mareBasalt', 'craterBowl', 'lunarRim', 'ejectaRay', 'rilleFloor']) assert.ok(kinds[k] > tiles * .02, `${k}: ${kinds[k]} of ${tiles}`);
  assert.ok(rille >= list.length && rille < tiles * .03, `${rille} deep rille tiles in ${tiles}`); assert.ok(bridges >= 20 && trench > rille, `${bridges} natural bridges, ${trench} trench tiles`);
  assert.ok(boulders >= list.length, `${boulders} boulders`); assert.ok(peaks >= 4, `${peaks} central peaks`); assert.ok(monoliths >= 4 && fallen >= 1 && fallen < monoliths, `${monoliths} monoliths, ${fallen} fallen`); assert.ok(caches >= 4, `${caches} caches`);
  assert.ok(rimUp > rimDown * 3, `rims stand above their floors (${rimUp} up, ${rimDown} down)`);
  for (const k of KINDS) { assert.ok(ATLAS_TILE_COLORS[k], `${k} on the Atlas`); if (k !== 'abyss') assert.ok(isLandscapeKind(k), k); }
  for (const k of KINDS.filter((k) => k !== 'abyss')) assert.equal(landscapeTileAnimated({ kind: k, landscape: 'regolith' }), false, `${k}: drawn once into the ground cache`);
  assert.equal(landscapeTileAnimated({ kind: 'abyss', landscape: 'regolith', rille: true }), false, 'a rille is drawn once too');
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  for (const { m } of list.filter((s) => s.m.rilles || s.m.monolith).slice(0, 4)) for (const t of m.tiles) if (t.landscape === 'regolith') assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, W), true);
  const full = list.map((s) => s.m).sort((a, b) => b.tiles.filter((t) => t.landscape === 'regolith').length - a.tiles.filter((t) => t.landscape === 'regolith').length)[0];
  const c = sectionAtlasColor(full), [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); assert.ok(b > r + 8 && b > g && r + g + b > 300 && r + g + b < 560, `${c}: the Atlas reads a cool silver-grey`);
  const moon = [180, 183, 191], ice = [143, 198, 228]; assert.ok(Math.hypot(r - moon[0], g - moon[1], b - moon[2]) > 15 && Math.hypot(r - ice[0], g - ice[1], b - ice[2]) > 40, `${c}: apart from the Moonlands and the Rimeglaciers`);
});

// The solver: the real movement rules (landscape.ts canStep for the Wayfarer: walk level, jump one up, drop any height; lethal
// ground excluded; thin walls counted), searched both ways from the plaza; every land exit, the cache and every walkable tile
// the plaza reached both ways with no rille, boulder, peak or monolith laid must be reached and lead back.
function solve(m, from, reverse = false) {
  const go = new Uint8Array(1024), q = [idx(from.x, from.y)]; go[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i - x) / W; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = idx(nx, ny); if (nx < 0 || ny < 0 || nx >= W || ny >= W || go[j] || !walk(m.tiles[j])) continue;
    const [a, b] = reverse ? [j, i] : [i, j], ax = a % W, ay = (a - ax) / W, bx = b % W, by = (b - bx) / W;
    if (!canStep({ isPlayer: true, jumping: true }, m, W, ax, ay, bx, by)) continue; if (fallDamage((m.tiles[a].elev || 0) - (m.tiles[b].elev || 0), 100) === Infinity) continue; go[j] = 1; q.push(j); } }
  return go;
}
test('traversable (solver): no trap, every exit, cache and monolith foot join the plaza both ways, no drop kills, rilles are always crossed and never cut ground off', () => {
  let unOld = 0, unNew = 0, checked = 0, crossed = 0;
  for (const { seed, x, y } of sections().slice(0, 40)) {
    const m = make(x, y, 25, { coherence: 1 }, seed); cohereSection(m); assert.equal(trappedTiles(m, W, W, { x: 16, y: 16 }, true).length, 0, `${x},${y}: a trap`);
    const core = coherenceCore(m), ex = sectionExits(seed, x, y), go = solve(m, { x: 16, y: 16 }), back = solve(m, { x: 16, y: 16 }, true);
    for (const [ex_, ey] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) { const t = m.tiles[idx(ex_, ey)]; if (!walk(t)) continue; assert.ok(joinsCore(m, { x: ex_, y: ey }, core), `${x},${y}: exit ${ex_},${ey}`); assert.ok(go[idx(ex_, ey)], `${x},${y}: the solver reaches exit ${ex_},${ey}`); assert.ok(back[idx(ex_, ey)], `${x},${y}: from exit ${ex_},${ey} back to the plaza`); checked++; }
    for (const o of m.objects.filter((q) => String(q.id).startsWith('lunar-cache'))) { assert.ok(joinsCore(m, o, core), `${x},${y}: the cache`); assert.ok(go[idx(o.x, o.y)] && back[idx(o.x, o.y)], 'up to the cache and down again'); }
    if (m.monolith) assert.ok(N4.some(([dx, dy]) => go[idx(m.monolith.x + dx, m.monolith.y + dy)] && back[idx(m.monolith.x + dx, m.monolith.y + dy)]), `${x},${y}: the monolith can be walked up to`);
    for (let i = 0; i < 1024; i++) if (go[i]) for (const [dx, dy] of N4) { const a = m.tiles[i], b = m.tiles[idx(a.x + dx, a.y + dy)]; if (b && walk(b) && a.landscape === 'regolith') assert.ok((a.elev || 0) - (b.elev || 0) < 4, 'no fatal ledge'); }
    // with every hazard lifted (each at its foot), the ground reached both ways is no larger than with them
    const plain = structuredClone(m); for (const t of plain.tiles) if (t.rille || BLOCKED.includes(t.kind)) { delete t.rille; t.kind = 'regolith'; t.blocked = false; }
    const pg = solve(plain, { x: 16, y: 16 }), pb = solve(plain, { x: 16, y: 16 }, true); for (let i = 0; i < 1024; i++) if (pg[i] && pb[i] && walk(m.tiles[i]) && plain.tiles[i].kind === m.tiles[i].kind && !(go[i] && back[i])) assert.fail(`${x},${y}: ${i % 32},${i >> 5} cut off by the waste`);
    // each rille: the walkable ground on both its sides is reached both ways (crossed by a natural bridge or round its end)
    for (const t of m.tiles) if (t.rille) for (const [dx, dy] of [[1, 0], [0, 1]]) { const p = m.tiles[idx(t.x - dx, t.y - dy)], q = m.tiles[idx(t.x + dx, t.y + dy)]; if (!walk(p) || !walk(q) || !pg[idx(p.x, p.y)] || !pg[idx(q.x, q.y)]) continue; assert.ok(go[idx(p.x, p.y)] && go[idx(q.x, q.y)] && back[idx(p.x, p.y)] && back[idx(q.x, q.y)], `${x},${y}: across the rille at ${t.x},${t.y}`); crossed++; }
    const old = make(x, y, 24, {}, seed), ra = reachableFromPlaza(old), rb = solve(m, { x: 16, y: 16 }); for (let i = 0; i < 1024; i++) { if (!ra[i] && walk(old.tiles[i])) unOld++; if (!rb[i] && walk(m.tiles[i])) unNew++; }
  }
  assert.ok(checked > 80, `${checked} exits`); assert.ok(crossed > 10, `${crossed} rille crossings`); assert.ok(unNew <= unOld + 30, `walkable ground the plaza cannot reach: ${unNew} (version 24 on the same ground: ${unOld})`);
});

test('the real movement rules: a jump climbs each rim, a deep rille is lethal ground the brink stops, creatures still have room, the game lays the same waste', () => {
  const { x, y, m } = sections().find(({ seed, m }) => seed === SEED && m.rilles && m.tiles.some((t) => t.kind === 'lunarRim' && t.elev >= 2));
  let up = 0; for (const a of m.tiles) for (const [dx, dy] of N4) { const b = m.tiles[idx(a.x + dx, a.y + dy)]; if (a.x + dx < 0 || a.x + dx > 31 || !walk(a) || !walk(b) || b.landscape !== 'regolith' || (b.elev || 0) !== (a.elev || 0) + 1) continue;
    assert.ok(canStep({ isPlayer: true, jumping: true }, m, W, a.x, a.y, b.x, b.y), `${x},${y}: jump ${a.x},${a.y} -> ${b.x},${b.y}`); assert.equal(canStep({ isPlayer: true, jumping: false }, m, W, a.x, a.y, b.x, b.y), !!(a.slope || b.slope)); up++; }
  assert.ok(up > 20, `${up} steps up`);
  const slot = m.tiles.find((t) => t.rille); assert.ok(LETHAL_KINDS.has(slot.kind) && !slot.blocked, 'open lethal ground, as every chasm');
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.ok(g.map.tiles.some((t) => t.rille), 'the game lays the same rilles'); assert.equal(g.map.landscape.name === 'Lunar Waste' || g.map.tiles.some((t) => t.landscape === 'regolith'), true);
  assert.ok((g.map.enemySpawns || []).length > 0, 'creatures still place'); for (const e of g.map.enemySpawns) assert.ok(walk(g.map.tiles[idx(Math.round(e.x), Math.round(e.y))]), 'on open ground');
});

test('neighbours agree on their shared edge: the same exit, open and at ground level on both sides; the surface runs on over the border', () => {
  let pair = null; for (let x = 40; x < 400 && !pair; x += 2) for (let y = 40; y < 400 && !pair; y += 3) if (sectionRegion(SEED, x, y, 25).type === 'regolith' && sectionRegion(SEED, x + 1, y, 25).type === 'regolith' && sectionRegion(SEED, x, y, 25).hold >= 1) pair = [x, y];
  assert.ok(pair); const [x, y] = pair, a = make(x, y, 25, { coherence: 1 }), b = make(x + 1, y, 25, { coherence: 1 }); cohereSection(a); cohereSection(b);
  const e = sectionExits(SEED, x, y).east; assert.equal(sectionExits(SEED, x + 1, y).west, e);
  const ta = a.tiles[idx(31, e)], tb = b.tiles[idx(0, e)]; assert.ok(walk(ta) && walk(tb)); assert.deepEqual([ta.elev || 0, tb.elev || 0], [0, 0]);
  assert.ok(joinsCore(a, { x: 31, y: e }) && joinsCore(b, { x: 0, y: e }));
  const ca = lunarCraters(SEED, x, y), cb = lunarCraters(SEED, x + 1, y); let n = 0, near = 0;
  for (let yy = 0; yy < 32; yy++) for (const gx of [x * 32 + 31, x * 32 + 32]) assert.deepEqual(lunarAt(SEED, ca, gx, y * 32 + yy), lunarAt(SEED, cb, gx, y * 32 + yy), 'both sides read the one world field over their shared edge');
  for (let yy = 2; yy < 30; yy++) { if (Math.abs(yy - e) <= 2) continue; const p = a.tiles[idx(30, yy)], q = b.tiles[idx(1, yy)]; if (p.landscape !== 'regolith' || q.landscape !== 'regolith' || !walk(p) || !walk(q)) continue; n++; if (Math.abs((p.elev || 0) - (q.elev || 0)) <= 1) near++; }
  assert.ok(n > 8, `${n}`); assert.equal(near, n, 'no cliff opens at the border');
});

test('deterministic: two fresh generations and two fresh game loads match; a hamlet keeps the colours but stays flat', () => {
  for (const { seed, x, y, m } of sections().slice(0, 8)) assert.equal(fp(make(x, y, 25, {}, seed)), fp(m), `${x},${y}`);
  const { x, y } = sections()[1], load = () => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return { g, s }; };
  const one = load(), two = load(); assert.equal(JSON.stringify(one.g.map.tiles), JSON.stringify(two.g.map.tiles)); assert.deepEqual(one.g.map.objects.map((o) => o.id), two.g.map.objects.map((o) => o.id));
  assert.equal(one.s.atlas[`${x},${y}`].landscapeVersion, 25); assert.ok(one.g.map.tiles.some((t) => t.landscape === 'regolith'));
  assert.equal(one.s.schemaVersion ?? 14, 14);
  const h = make(x, y, 25, { hamlet: true }); assert.ok(h.tiles.some((t) => t.landscape === 'regolith')); assert.ok(h.tiles.filter((t) => t.landscape === 'regolith').every((t) => !t.elev && !t.blocked && !t.rille));
  assert.ok(!h.objects.some((o) => String(o.id).startsWith('lunar-')));
});

test('older ground regenerates byte for byte: sections fingerprinted on main (8e160cc9) before this change', () => {
  for (const [seed, v, x, y, hash] of [
    ['LUNA25', 24, 40, 95, '654b5e40ddbc60ee'], ['LUNA25', 23, 40, 95, '654b5e40ddbc60ee'], ['LUNA25', 11, 40, 95, '654b5e40ddbc60ee'], ['LUNA25', 4, 40, 95, '654b5e40ddbc60ee'],
    ['LUNA25', 2, 40, 95, 'f8fbc6038f2d82db'], ['LUNA25', 24, 43, 90, '3cb2a1ec0c465052'], ['LUNA25', 24, 40, 320, '2f4ee360f4108d68'], ['LUNA25', 6, 40, 320, '4068ce212436800b'],
    ['LUNA25', 5, 40, 320, 'b1e8a433005168cf'], ['LUNA25', 24, 64, 260, '6c0f0d1e5f1659cc'], ['LUNA25', 24, 52, 275, '8287eee5715e06aa'], ['LUNA25', 11, 52, 275, '1b9c2e32b39dd9ff'],
    ['LUNA25', 24, 73, 155, '336270d0673c56e8'], ['LUNA25', 24, 145, 50, 'ad476b5039bccb7a'], ['LUNA25', 24, 157, 90, '9c71a9ec07b09b14'], ['LUNA25', 24, 3, 5, '16b443a8e43c9143'],
    ['LUNA25', 24, 20, -30, '90cbb9ab68946671'], ['LUNA25', 24, 1150, 3, 'bd9e746e4be69dfc'], ['RIME24', 24, 34, 75, 'aecd7cdd656f825d'], ['RIME24', 24, 41, 75, '7379515791f2d5a9'],
    ['RIME24', 23, 34, 75, 'c4c3463b25216184'], ['AUDIT-A', 24, 20, 262, '482e69315f93d269'], ['AUDIT-A', 24, -60, 44, '8b676dabb5dd0471'], ['AUDIT-A', 21, 20, 262, '216f262c27fe1f80'],
    ['AUDIT-A', 9, 41, 75, '98982ca017f67f08'], ['RIME24', 17, 1150, 3, 'c299a7fccea35de4'],
  ]) assert.equal(fp(pinned(seed, x, y, v)), hash, `${seed} v${v} ${x},${y}`);
  assert.ok(!pinned(SEED, 40, 95, 24).tiles.some((t) => t.landscape === 'regolith') && make(40, 95).tiles.some((t) => t.landscape === 'regolith'), 'the same ground first seen at 25 is a lunar waste');
  assert.ok(pinned(SEED, 40, 320, 24).tiles.some((t) => t.kind === 'moonDust') && !make(40, 320).tiles.some((t) => t.kind === 'moonDust' && sectionRegion(SEED, 40, 320, 25).type === 'regolith' && t.x === 16), 'moonlands first seen at 24 keep their dust');
});

test('in the game: ground first seen at version 24 keeps its version 24 ground; new ground pins 25', () => {
  const { x, y } = sections()[0], s = freshSave(); s.seed = SEED; s.atlas = { [`${x},${y}`]: { landscapeVersion: 24 } }; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(s.atlas[`${x},${y}`].landscapeVersion, 24); assert.ok(!g.map.tiles.some((t) => t.landscape === 'regolith'), 'no lunar waste on version 24 ground');
  const t = freshSave(); t.seed = SEED; const h = new Game(t, 0); h.rx = x; h.ry = y; h.loadArea('overworld'); assert.equal(t.atlas[`${x},${y}`].landscapeVersion, 25); assert.ok(h.map.tiles.some((q) => q.landscape === 'regolith'));
});

test('Close View: an airless black sky full of stars with a great pale planet, whatever the mood; no clouds or lightning', () => {
  assert.equal(OUTDOOR.skyOf.regolith, 'airless'); const k = OUTDOOR.skies.airless; assert.equal(k.planet, 1); assert.ok(k.moodMix > 0 && k.moodMix < .5);
  for (const mood of Object.keys(OUTDOOR.moods)) for (const w of ['still', 'rain', 'snow']) {
    const s: any = outdoorSkyMix('airless', mood, w); assert.equal(s.planet, 1); assert.equal(s.stars, 1); assert.equal(s.clouds, 0); assert.equal(s.lightning, 0);
    assert.ok(s.zenith.every((v: number) => v < .12), `${mood}/${w}: the zenith stays black (${s.zenith.map((v: number) => v.toFixed(2))})`); }
  for (const id of Object.keys(OUTDOOR.skies)) if (id !== 'airless') { assert.equal(outdoorSkyMix(id, 'sunset').planet, 0, `${id}: no planet`); }
  assert.deepEqual(outdoorSkyMix('cold', 'storm').clouds > 0, true, 'other skies keep their moods');
});

test('cost: generation only, within the cost of the Rimeglaciers on this machine; nothing per frame', () => {
  const pick = (type, v) => { const out = []; for (let x = 40; x < 600 && out.length < 16; x += 3) for (let y = 40; y < 600 && out.length < 16; y += 5) { const r = sectionRegion(SEED, x, y, v); if (r.type === type && r.hold >= .5) out.push([x, y]); } return out; };
  const time = (list, v) => { let best = Infinity; for (let k = 0; k < 2; k++) { let ms = 0; for (const [x, y] of list) { const m = generateRegion(SEED, x, y); const t0 = performance.now(); applyLandscape(m, SEED, x, y, { version: v }); ms += performance.now() - t0; } best = Math.min(best, ms / list.length); } return best; };
  const lunar = pick('regolith', 25), glacier = pick('glacier', 24); assert.ok(lunar.length >= 12 && glacier.length >= 12);
  time(lunar, 25); const a = time(lunar, 25), b = time(glacier, 24), c = time(lunar, 24);
  console.log(`  lunar waste (v25) ${a.toFixed(1)} ms a section; rimeglacier (v24) ${b.toFixed(1)} ms; the same ground at v24 ${c.toFixed(1)} ms`);
  assert.ok(a < b * 1.6 + 6, `lunar ${a.toFixed(1)} ms vs glacier ${b.toFixed(1)} ms a section`);
  const m = make(...lunar[0]); assert.ok(!m.tiles.some((t) => landscapeTileAnimated(t) && t.landscape === 'regolith'), 'nothing of it animated'); assert.equal(m.weather, generateRegion(SEED, ...lunar[0]).weather);
});
