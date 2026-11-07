// The Stillworks' cover (Tim, 2026-11-05: "add a few pillars in the Stillworks arena that the Wayfarer can hide behind from the
// Sunfall"). Arena version 2 lays five 2×2 pillars round the heart; a pillar (or standing lattice) between the beast and the Wayfarer
// turns the Sunfall. Version 1 (release 754's floor) is kept byte for byte for every Pentagon whose wall opened with it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, hasLineOfSight } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { PENTAGON, pentagonPlan, pentagonVaultId } from '../src/pentagon.ts';
import { PENTAGON_ARENA, pentagonArenaId, pentagonArenaPick, pentagonArenaVersion, generatePentagonArena } from '../src/pentagon-arena.ts';
import { DRAGON, isPackKind, PACK_EFFECT_CAP } from '../src/monster-pack.ts';
import { stillworksSpriteCount } from '../src/pentagon-arena-render.ts';

const SEED = 'TIM1', A = PENTAGON_ARENA, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
const game = (seed = SEED, save = null) => { const s = save || freshSave(); s.seed = seed; return new Game(s, 0); };
let found = null; const find = () => { if (found) return found; const g = game(); for (let cx = -64; cx <= 64 && !found; cx += PENTAGON.every) for (let cy = -64; cy <= 64 && !found; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) found = { cx, cy }; return found; };
const plan = () => { const { cx, cy } = find(); return pentagonPlan(SEED, cx, cy, PENTAGON.version); };
const H = (g, P) => g.save.consequences.dungeons[`${P.base}:f1`] || {};
const loadVault = (g, P) => { g.save.session.activeDungeonId = pentagonVaultId(P); g.save.session.dungeonReturn = { rx: P.cx, ry: P.cy, x: 16, y: 16 }; g.loadArea('dungeon', false); };
const fellRegent = (g) => { const e = g.enemies.find((q) => String(q.id).endsWith(':guardian')); e.hp = 0; e.dead = true; g.defeatEnemy(e); };
const wall = (g) => g.map.objects.find((o) => o.kind === 'pentFinaleWall');
const act = (g, o) => { g.player.x = o.inner ? o.inner.x : o.x; g.player.y = o.inner ? o.inner.y : o.y + 1; return g.interact('use', o.id); };
const beastOf = (g) => g.enemies.find((e) => e.pentFinaleBeast);
// Into the Stillworks; `v1` as a Pentagon whose wall opened before the pillars (its history pinned at version 1).
const intoArena = (g, P, beast, v1 = false) => { loadVault(g, P); fellRegent(g); H(g, P).pentArenaBeast = beast; if (v1) H(g, P).pentArena = 1; const r = act(g, wall(g)); assert.ok(r.ok, r.message); assert.equal(g.areaId(), pentagonArenaId(P.base)); return r; };
const flood = (m, from) => { const W = m.width, seen = new Set([from.y * W + from.x]), st = [from]; while (st.length) { const c = st.pop(); for (const [dx, dy] of N4) { const x = c.x + dx, y = c.y + dy, t = m.tiles[y * W + x]; if (x < 0 || y < 0 || x >= W || y >= m.height || !t || t.blocked || seen.has(y * W + x)) continue; seen.add(y * W + x); st.push({ x, y }); } } return seen; };
const pillarAt = (m, x, y) => !!m.tiles[Math.floor(y) * m.width + Math.floor(x)]?.pillar;
const shaded = (m, e, p) => !hasLineOfSight({ x: e.x + .5, y: e.y + .5 }, { x: p.x + .5, y: p.y + .7 }, m, m.width, true);
// The nearest spot in a pillar's shadow from the beast: just behind the pillar, on the far side from it.
const shadeSpot = (m, b, p) => { let best = null;
  for (const q of m.stillworks.pillars || []) { const cx = q.x + q.size / 2, cy = q.y + q.size / 2, dx = cx - (b.x + .5), dy = cy - (b.y + .5), d = Math.hypot(dx, dy) || 1;
    const s = { x: cx + dx / d * (q.size / 2 + 1.1) - .5, y: cy + dy / d * (q.size / 2 + 1.1) - .7 }; if (m.tiles[Math.floor(s.y + .7) * m.width + Math.floor(s.x + .5)]?.blocked || !shaded(m, b, s)) continue;
    const k = Math.hypot(s.x - p.x, s.y - p.y); if (!best || k < best.k) best = { ...s, k }; }
  return best; };
const build = (level, maxHp, power, might, resolve, seed = SEED) => { const s = freshSave(); s.seed = seed; s.level = level; s.maxHp = maxHp; s.hp = maxHp; s.equipment.primary.power = power; s.stats.Might = might; s.stats.Resolve = resolve; s.stats.Vigor = 1 + Math.floor(level / 2); return s; };
const BUILDS = { early: build(8, 140, 14, 4, 2), mid: build(18, 420, 26, 40, 20), late: build(28, 914, 44, 200, 75), endgame: build(40, 1600, 70, 320, 120) };

// ------------------------------------------------------------------------------------------------ the floor
// sha256 (first 16 hex) of release 754's generatePentagonArena(seed, id, roster[i % 5]) for these Pentagons, taken from that release's code
const V1_PRINTS = [['S0', 0, 0, 1, '6a1f859697c6aa38'], ['S1', 8, -8, 2, 'a85a6ed93661d39f'], ['S2', 16, -16, 3, 'a6d2ccf5f0581612'], ['S3', 24, -24, 4, '40886d05c9c4ef1a'], ['S4', 32, -32, 5, 'd90ad44c737f5d8f'], ['S5', 40, -40, 6, '872fc933d922e5f9']];
test('version 1 is release 754\'s arena byte for byte; the beast pick is the same in every version', () => {
  V1_PRINTS.forEach(([seed, cx, cy, V, print], i) => { const P = pentagonPlan(seed, cx, cy, V), id = pentagonArenaId(P.base), m = generatePentagonArena(seed, id, A.roster[i % 5], 1);
    assert.equal(createHash('sha256').update(JSON.stringify(m)).digest('hex').slice(0, 16), print, `${id} regenerates as it was`); assert.equal(m.pentArena, 1); assert.equal(m.stillworks.cover, undefined); });
  assert.equal(A.version, 2); assert.equal(pentagonArenaVersion(undefined), 1); assert.equal(pentagonArenaVersion(1), 1); assert.equal(pentagonArenaVersion(2), 2); assert.equal(pentagonArenaVersion(99), A.version);
  const was = A.version; const picks = []; for (let i = 0; i < 200; i++) picks.push(pentagonArenaPick(SEED, `pentagon:${SEED}:${i * 8}:0:v6`, isPackKind).id);
  A.version = 1; try { for (let i = 0; i < 200; i++) assert.equal(pentagonArenaPick(SEED, `pentagon:${SEED}:${i * 8}:0:v6`, isPackKind).id, picks[i]); } finally { A.version = was; }
});

test('Pentagon v9 preserves v8 arena combat IDs while keeping its own map, gates and history identity', () => {
  for (let version = 1; version <= 9; version++) {
    const P = pentagonPlan(SEED, 8, -8, version), id = pentagonArenaId(P.base);
    const m = generatePentagonArena(SEED, id, A.roster[0], 2);
    const expected = version === 9 ? `${pentagonArenaId(pentagonPlan(SEED, 8, -8, 8).base)}:finale` : `${id}:finale`;
    assert.equal(m.enemySpawns[0].id, expected);
    assert.equal(m.id, id); assert.equal(m.building.base, P.base); assert.equal(m.building.V, version);
    assert.equal(m.objects.find((o) => o.to === 'vault').toId, pentagonVaultId(P));
    assert.equal(m.objects.find((o) => o.to === 'walk').toId, `${P.base}:finale`);
  }
});

test('version 2: the same floor plus five whole 2×2 pillars round the heart, clear of the ways and the beast; the floor still one piece with both gates reached', () => {
  const bad = []; let total = 0;
  for (let i = 0; i < 60; i++) { const seed = `C${i}`, P = pentagonPlan(seed, i * 8, i * 8, 1 + (i % PENTAGON.version)), id = pentagonArenaId(P.base), m = generatePentagonArena(seed, id, A.roster[i % 5], 2), o = generatePentagonArena(seed, id, A.roster[i % 5], 1);
    const pil = m.stillworks.pillars || []; total += pil.length; if (!m.stillworks.cover || m.pentArena !== 2) bad.push(`${id}: not marked`);
    if (pil.length !== A.cover.count) bad.push(`${id}: ${pil.length} pillars`);
    for (const q of pil) for (let j = 0; j < q.size; j++) for (let k = 0; k < q.size; k++) { const t = m.tiles[(q.y + j) * m.width + q.x + k]; if (!t.blocked || !t.pillar || o.tiles[(q.y + j) * m.width + q.x + k].blocked) bad.push(`${id}: pillar tile ${q.x + k},${q.y + j}`); }
    const near = (t) => pil.some((q) => t.x >= q.x - 1 && t.x <= q.x + q.size && t.y >= q.y - 1 && t.y <= q.y + q.size);
    if (m.tiles.some((t, k) => !near(t) && JSON.stringify(t) !== JSON.stringify(o.tiles[k]))) bad.push(`${id}: a tile away from the pillars changed`);
    if (m.tiles.filter((t) => t.pillar).length !== pil.length * 4) bad.push(`${id}: stray pillar tiles`);
    assert.deepEqual([m.entry, m.objects, m.enemySpawns], [o.entry, o.objects, o.enemySpawns], 'the ways, lattices and beast as in version 1');
    const seen = flood(m, m.entry); if (m.tiles.some((t) => !t.blocked && !seen.has(t.y * m.width + t.x))) bad.push(`${id}: an island`);
    for (const g of m.objects.filter((q) => q.kind === 'pentArenaGate')) { if (!seen.has(g.inner.y * m.width + g.inner.x)) bad.push(`${id}: gate ${g.to}`); if (pil.some((q) => Math.hypot(q.x + q.size / 2 - g.inner.x - .5, q.y + q.size / 2 - g.inner.y - .5) < A.cover.clear)) bad.push(`${id}: a pillar at the ${g.to} gate`); }
    const sp = m.enemySpawns[0]; if (sp && (pil.some((q) => Math.hypot(q.x + q.size / 2 - sp.x - .5, q.y + q.size / 2 - sp.y - .5) < A.cover.clear) || m.tiles[sp.y * m.width + sp.x].blocked)) bad.push(`${id}: a pillar at the heart`);
    if (pil.some((q) => q.x <= Math.floor(A.centre[0]) && q.x + q.size > Math.floor(A.centre[0]))) bad.push(`${id}: a pillar across the door-to-heart walk`);
    if (m.tiles.filter((t) => !t.blocked).length < 700) bad.push(`${id}: too small`);
    assert.equal(JSON.stringify(m), JSON.stringify(generatePentagonArena(seed, id, A.roster[i % 5], 2)), 'pure'); }
  assert.deepEqual(bad.slice(0, 8), []); assert.equal(total, 60 * A.cover.count);
});

// ------------------------------------------------------------------------------------------------ old and new journeys
test('a Pentagon whose wall opened with version 1 keeps release 754\'s floor (no pillars, Sunfall as it was) through reloads; a wall opened now pins version 2', () => {
  { const g = game(), P = plan(); intoArena(g, P, 'crimsonTyrant', true); assert.equal(H(g, P).pentArena, 1); assert.equal(g.map.pentArena, 1); assert.ok(!g.map.stillworks.cover && !g.map.tiles.some((t) => t.pillar));
    assert.deepEqual(g.map.tiles, generatePentagonArena(SEED, pentagonArenaId(P.base), A.roster[0], 1).tiles);
    const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(300))), 900); assert.equal(r.areaId(), pentagonArenaId(P.base)); assert.ok(!r.map.tiles.some((t) => t.pillar), 'exact resume keeps version 1');
    const m = migrateSave(JSON.parse(JSON.stringify(r.save))); assert.equal(m.consequences.dungeons[`${P.base}:f1`].pentArena, 1); assert.equal(m.version, 14); }
  { const g = game(), P = plan(); intoArena(g, P, 'crimsonTyrant'); assert.equal(H(g, P).pentArena, 2); assert.equal(g.map.pentArena, 2); assert.equal(g.map.stillworks.pillars.length, A.cover.count);
    const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(300))), 900); assert.equal(r.map.stillworks.pillars.length, A.cover.count, 'and version 2 stays version 2'); }
});

// ------------------------------------------------------------------------------------------------ the Sunfall
const sunfall = (v1) => { const g = game(SEED, JSON.parse(JSON.stringify(BUILDS.late))), P = plan(); intoArena(g, P, 'crimsonTyrant', v1); const b = beastOf(g);
  b.x = 20; b.y = 20; b.hp = Math.round(b.maxHp * .7); b.pentArenaAwake = true; b.aggro = true; b.packAttacks = ['dragonSupernova']; return { g, P, b }; };
const throughSunfall = (g, b, hold = null) => { let now = 1000, started = false, hits = 0; const was = g.packHurt.bind(g); g.packHurt = (src, amt, o, t) => { if (o?.source === 'dragonSupernova') hits++; return was(src, amt, o, t); };
  for (let t = 0; t < 14; t += 1 / 30) { now += 1000 / 30; if (hold) { g.player.x = hold.x; g.player.y = hold.y; } g.update(1 / 30, idle, now); if (b.pack?.attack === 'dragonSupernova') started = true; else if (started) break; }
  return { started, hits }; };
test('the Sunfall in a pillared Stillworks: behind a pillar you live, out in the open in its reach you burn; a version 1 arena is as it was', () => {
  { const { g, b } = sunfall(false), spot = shadeSpot(g.map, b, g.player); assert.ok(spot, 'a shade');
    assert.ok(Math.hypot(spot.x - b.x, spot.y - b.y) < DRAGON.nova.radius, 'the shade is inside its reach'); g.player.x = spot.x; g.player.y = spot.y;
    const r = throughSunfall(g, b, spot); assert.ok(r.started, 'it cast'); assert.equal(r.hits, 0, 'the pillar turned it'); assert.ok(g.player.hp > 0); assert.equal(g.message, A.messages.shaded); assert.ok(beastOf(g).hp < beastOf(g).maxHp, 'the fight goes on'); }
  { const { g, b } = sunfall(false); g.player.x = b.x; g.player.y = b.y + 4; assert.ok(!shaded(g.map, b, g.player)); const r = throughSunfall(g, b, { x: b.x, y: b.y + 4 }); assert.ok(r.started); assert.equal(r.hits, 1, 'in the open it lands'); }
  { const { g, b } = sunfall(true); const mono = g.map.objects.find((o) => o.kind === 'stillMonolith'), dx = mono.x - b.x, dy = mono.y - b.y, d = Math.hypot(dx, dy), at = { x: mono.x + dx / d * 1.2, y: mono.y + dy / d * 1.2 }; // behind a lattice in version 1
    const r = throughSunfall(g, b, at); assert.ok(r.started); assert.equal(r.hits, 1, 'version 1 has no shade: the Sunfall as it was'); }
});

test('the boss, its paths and its shots respect the pillars: each finale beast fights 60 s in a pillared arena and never stands in one, no moving shot lives inside one, effects stay bounded', { timeout: 120000 }, () => {
  for (const id of ['crimsonTyrant', 'doomChaser', 'voidWalker', 'astralWorm', 'gloomvast']) { const g = game(), P = plan(); intoArena(g, P, id); const b = beastOf(g); g.save.maxHp = g.player.hp = 1e7; g.player.x = b.x; g.player.y = b.y + 5; b.hp = b.maxHp * .5;
    let now = 1000, inside = 0, shots = 0, fx = 0, hurt = 0, last = g.player.hp; const tiles = g.map.tiles.map((t) => `${t.kind}${t.blocked}`).join();
    for (let t = 0; t < 60; t += 1 / 30) { now += 1000 / 30; g.update(1 / 30, idle, now); if (g.player.hp < last) hurt++; g.player.hp = g.save.maxHp; last = g.player.hp; g.player.invulnerableUntil = 0;
      if (!b.untargetable && !b.burrowed && pillarAt(g.map, b.x + .5, b.y + .7)) inside++; fx = Math.max(fx, (g.packEffects || []).length);
      for (const f of g.packEffects || []) if (f.life > 0 && (f.vx || f.vy) && pillarAt(g.map, f.x + .5, f.y + .5)) shots++; }
    assert.equal(inside, 0, `${id} never stands in a pillar`); assert.ok(shots <= 2, `${id}: ${shots} shot-frames inside a pillar`); assert.ok(fx <= PACK_EFFECT_CAP, `${id}: ${fx} effects`); assert.ok(hurt > 3, `${id} fights (${hurt})`);
    assert.equal(g.map.tiles.map((t) => `${t.kind}${t.blocked}`).join(), tiles, 'the pillars stand'); assert.equal(g.areaId(), pentagonArenaId(P.base)); }
});

// ------------------------------------------------------------------------------------------------ the duel
test('a headless duel in the pillared Stillworks (early, mid, late, endgame): a Wayfarer who swings and hides behind a pillar when the Sunfall gathers is never touched by it and kills the Tyrant', { timeout: 300000 }, () => {
  const rows = [];
  for (const [name, base] of Object.entries(BUILDS)) { const save = JSON.parse(JSON.stringify(base)), g = game(SEED, save), P = plan(); intoArena(g, P, 'crimsonTyrant'); const b = beastOf(g), p = g.player; let now = 1000, t = 0, worst = 0, sun = 0, casts = 0, shade = null, was = false;
    const hurt = g.packHurt.bind(g); g.packHurt = (src, amt, o, at) => { if (o?.source === 'dragonSupernova') sun++; return hurt(src, amt, o, at); };
    for (; t < 240 && !b.dead; t += 1 / 30) { now += 1000 / 30; const nova = b.pack?.attack === 'dragonSupernova'; if (nova && !was) { casts++; shade = shadeSpot(g.map, b, p); } was = nova;
      const to = nova && shade ? shade : b, dx = to.x - p.x, dy = to.y - p.y, d = Math.hypot(dx, dy) || 1; p.facing = Math.abs(b.x - p.x) > Math.abs(b.y - p.y) ? (b.x > p.x ? 'right' : 'left') : (b.y > p.y ? 'down' : 'up');
      const move = nova ? (d > .15 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 }) : d > 1.6 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };
      const before = p.hp; g.update(1 / 30, { state: move, consume: (k) => !nova && k === 'attack', held: (k) => !nova && k === 'attack', reset() {} }, now); worst = Math.max(worst, before - p.hp); p.hp = g.save.maxHp; p.invulnerableUntil = 0; }
    rows.push(`${name}: ${t.toFixed(1)} s, ${casts} Sunfalls, biggest blow ${Math.round(worst / g.save.maxHp * 100)}%`);
    assert.ok(b.dead, `${name}: it falls (${Math.round(b.hp / b.maxHp * 100)}% left)`); assert.equal(sun, 0, `${name}: the Sunfall never reached behind the pillar (${casts} cast)`); assert.ok(worst >= g.save.maxHp * .2, `${name}: hit hard (${worst})`);
    if (name !== 'early') assert.ok(t > 8 && t < 120, `${name}: ${t.toFixed(1)} s`); assert.equal(H(g, P).pentArenaWon, true); }
  console.log(rows.join('\n'));
});

test('the pillars draw, bounded, in every quality tier and under reduced motion', () => {
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, d: 1 }), ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  const g = game(), P = plan(); intoArena(g, P, 'doomChaser');
  for (const [q, reduce] of [['full', false], ['balanced', false], ['low', false], ['full', true]]) { g.presentation = { effectiveQuality: q, reduceMotion: reduce }; for (const pq of g.map.stillworks.pillars) { g.player.x = pq.x - 1; g.player.y = pq.y - 1; assert.doesNotThrow(() => render(ctx, g, 390, 844, 5000 + pq.x)); } }
  assert.ok(stillworksSpriteCount() <= 600, `${stillworksSpriteCount()} sprites`);
});
