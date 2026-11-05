// Audit, 2026-11-05 (Tim approved): the Aether Orrery's circling orbs (Echoes + 1, capped), Tesseract tiers (roll version 2: a
// cost-count range and a cost strength per grade; glyphs already granted never change), and old Pentagons' completion glyph
// paid once (those finished before release 750 on load).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { hashSeed } from '../src/random.ts';
import { socketCount } from '../src/glyphs.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { ORRERY, orbTier } from '../src/tool-forms.ts';
import { TESSERACTS, rollTesseract, rerollTesseractLine, tesseractCut, grantTesseract, ensureTesseracts } from '../src/tesseracts.ts';
import { PENTAGON, PENTAGON_COMPLETE, pentagonPlan, pentagonVaultId, pentagonsDue, pentagonCompleteSource } from '../src/pentagon.ts';
import { pentagonArenaId } from '../src/pentagon-arena.ts';

// ------------------------------------------------------------------------------------------------ 1. the Orrery's orbs
function orrery(glyphs, tier = 'relic', extraSockets = 1) {
  const s = freshSave(); s.seed = 'ORRERY'; s.perception.aperture = 3255;
  s.equipment.secondary = { ...ORRERY.item, tier, extraSockets, glyphs };
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; g.paused = false; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('rootBrute', 14, 10), { id: 'foe0', hp: 1e7, maxHp: 1e7, damage: 0, cooldown: 1e9, speed: 0 })]; g.projectiles = []; g.effects = [];
  return g;
}
test('Orrery: balls = Echo glyphs + 1 (one, two, three), capped at three; four Echo glyphs in four sockets still make three', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(orbTier), [1, 2, 3, 3, 3]);
  assert.equal(ORRERY.halo.base, 1); assert.equal(ORRERY.halo.max, 3);
  // the tool's sockets: rare 2 as given, 3 with the smith's socket; a relic tool with the smith's socket holds 4
  assert.equal(socketCount({ ...ORRERY.item }), 2); assert.equal(socketCount({ ...ORRERY.item, extraSockets: 1 }), 3); assert.equal(socketCount({ ...ORRERY.item, tier: 'relic', extraSockets: 1 }), 4);
  for (const [glyphs, n] of [[[], 1], [['echo'], 2], [['echo', 'echo'], 3], [['echo', 'echo', 'echo'], 3], [['echo', 'echo', 'echo', 'echo'], 3], [['echo', 'ignite'], 2], [['echo', 'echo', 'ignite'], 3]]) {
    const g = orrery(glyphs); g.fireSecondary(1000, { x: 1, y: 0 }); assert.equal(g.orrery?.halo?.n, n, `${glyphs.join('+') || 'no glyphs'}: ${n}`);
    assert.equal(g.orrery.halo.pts.length, 3, 'a fixed set of three orb places');
    g.toolReadyAt = 0; g.fireSecondary(2000, { x: 1, y: 0 }); assert.equal(g.orrery.halo.n, n, 'a later press keeps the count');
  }
  // as given (rare, two sockets): two Echoes reach the third ball
  const r = orrery(['echo', 'echo'], 'rare', 0); r.fireSecondary(1000, { x: 1, y: 0 }); assert.equal(r.orrery.halo.n, 3);
});

// ------------------------------------------------------------------------------------------------ 2. Tesseract tiers (roll 2)
// Tim, 2026-11-05: lower tiers at least two costs, possibly three, with worse bonuses; higher tiers up to three bonuses and one cost.
const GOLD = (f) => { const out = []; for (const grade of Object.keys(TESSERACTS.grades)) for (let i = 0; i < 60; i++) out.push(f('GOLD', `pentagon:GOLD:${i}:0:v${1 + (i % 7)}:complete`, grade, i % 4)); return JSON.stringify(out); };
const GOLD_REROLL = () => { const out = []; for (const grade of Object.keys(TESSERACTS.grades)) for (let i = 0; i < 40; i++) { const g = { uid: 't1', ...rollTesseract('R', `s${i}`, grade, 0) }; for (let j = 0; j < 4; j++) out.push(rerollTesseractLine('R', `p:${i}:reroll0:t1:${j}`, g, j)); } return JSON.stringify(out); };
const WANT = { hollow: [2, 3, 1], labyrinth: [2, 3, .95], deep: [1, 2, .8], reliquary: [1, 2, .7], regent: [1, 2, .65], sealed: [1, 1, .55], sovereign: [1, 1, .5] };
const costsOf = (g) => g.lines.filter((l) => l.bad).length;
test('roll version 1 (every glyph cut through release 759) rolls and rerolls byte for byte as before, every grade (pinned from main ce2cc625)', () => {
  const v1 = GOLD((s, src, gr, f) => rollTesseract(s, src, gr, f)); assert.equal(v1.length, 108064); assert.equal(hashSeed(v1), 2458559713);
  assert.equal(GOLD((s, src, gr, f) => rollTesseract(s, src, gr, f, 1)), v1);
  const r1 = GOLD_REROLL(); assert.equal(r1.length, 44648); assert.equal(hashSeed(r1), 1608409093);
  assert.equal(TESSERACTS.roll, 2);
});

test('roll 2, the tier table: each grade\'s cost count in its range, picked evenly; every arrangement of costs over lines 1-3 reached; costs milder up the tiers', () => {
  assert.deepEqual(Object.fromEntries(Object.keys(TESSERACTS.grades).map((g) => [g, [...tesseractCut(g).costs, tesseractCut(g).scale]])), WANT);
  const N = 6000, meanCost = {}, meanBonus = {};
  for (const [grade, [lo, hi]] of Object.entries(WANT)) { const hist = [0, 0, 0, 0], pattern = new Map(); let cs = 0, cn = 0, bs = 0, bn = 0;
    for (let i = 0; i < N; i++) { const g = rollTesseract(`S${i}`, `pentagon:S${i}:${(i % 40) * 8}:16:complete`, grade, 0, 2), n = costsOf(g);
      assert.equal(g.lines.length, 4); assert.equal(g.lines[0].bad, false, 'line 0 a bonus'); assert.equal(new Set(g.lines.map((l) => l.k)).size, 4, 'no effect twice');
      assert.ok(n >= lo && n <= hi, `${grade}: ${n} costs`); hist[n]++;
      for (const l of g.lines) { assert.ok(Number.isFinite(l.v) && l.v > 0 && l.v < .3); const E = TESSERACTS.effects[l.k]; assert.ok(l.bad ? E.bad : E.good); if (l.bad) { cs += l.v; cn++; } else { bs += l.v; bn++; } }
      const key = g.lines.slice(1).map((l) => (l.bad ? 1 : 0)).join(''); pattern.set(key, (pattern.get(key) || 0) + 1); }
    for (let n = lo; n <= hi; n++) assert.ok(Math.abs(hist[n] / N - 1 / (hi - lo + 1)) < .03, `${grade}: ${n} costs ${hist[n]}`);
    // every arrangement of lo..hi costs over three lines, each about as often as the others of its count
    const choose = (n) => [1, 3, 3, 1][n]; for (let m = 0; m < 8; m++) { const bits = [4, 2, 1].map((b) => ((m & b) ? 1 : 0)), n = bits.reduce((a, b) => a + b, 0), got = pattern.get(bits.join('')) || 0;
      if (n < lo || n > hi) assert.equal(got, 0, `${grade}: ${bits.join('')}`); else { const want = N / (hi - lo + 1) / choose(n); assert.ok(Math.abs(got - want) < want * .15, `${grade}: ${bits.join('')} ${got} vs ${want}`); } }
    meanCost[grade] = cs / cn; meanBonus[grade] = bs / bn; }
  const up = Object.keys(WANT); for (let k = 1; k < up.length; k++) { assert.ok(meanCost[up[k]] < meanCost[up[k - 1]], `${up[k]} costs milder: ${JSON.stringify(meanCost)}`); assert.ok(meanBonus[up[k]] > meanBonus[up[k - 1]], `${up[k]} bonuses stronger`); }
  assert.ok(meanCost.sovereign < meanCost.hollow * .45, 'a Sovereign\'s one cost about half a Hollow\'s');
});

test('the dais at roll 2 keeps a glyph inside its grade\'s cost range (never below, never above); either way where both stay inside; roll-1 glyphs reroll as before', () => {
  for (const [grade, [lo, hi]] of Object.entries(WANT)) { const seen = new Set();
    for (let i = 0; i < 300; i++) { const g = { uid: 't1', ...rollTesseract('D', `d${i}`, grade, 0, 2), roll: 2 };
      for (let j = 0; j < 4; j++) { const l = rerollTesseractLine('D', `p:${i}:reroll0:t1:${j}`, g, j); assert.ok(l && TESSERACTS.effects[l.k]);
        assert.deepEqual(rerollTesseractLine('D', `p:${i}:reroll0:t1:${j}`, g, j), l, 'pure'); assert.ok(!g.lines.some((q, k) => k !== j && q.k === l.k), 'no effect twice');
        const after = g.lines.map((q, k) => (k === j ? l : q)), n = after.filter((q) => q.bad).length; assert.ok(n >= lo && n <= hi, `${grade}: ${n} after rerolling line ${j}`);
        if (j === 0) assert.equal(l.bad, false); else seen.add(`${g.lines[j].bad ? 1 : 0}>${l.bad ? 1 : 0}`); } }
    // a cost can turn a bonus (and back) wherever the range has room; a fixed count (sealed, sovereign) still lets the line change effect
    if (hi > lo) for (const k of ['1>0', '0>1', '1>1', '0>0']) assert.ok(seen.has(k), `${grade}: ${k} (${[...seen]})`); else assert.deepEqual([...seen].sort(), ['0>0', '1>1']); }
  // no `roll` on a stored glyph means roll 1: the old rules (a Sealed glyph may reroll to any count by its `bad` chance)
  const g = { uid: 't1', ...rollTesseract('D', 'old', 'regent') }; for (let j = 0; j < 4; j++) assert.equal(JSON.stringify(rerollTesseractLine('D', `x:${j}`, g, j)), JSON.stringify(rerollTesseractLine('D', `x:${j}`, { ...g, roll: 1 }, j)));
});

test('grants: every new glyph is cut at roll 2 and records it; a glyph granted before (roll 1, no field) never changes', () => {
  const s = freshSave(); s.seed = 'GR';
  for (const grade of Object.keys(WANT)) { const g = grantTesseract(s, `p:${grade}`, grade, 0, 'x'); assert.equal(g.roll, 2, grade); assert.deepEqual(g.lines, rollTesseract('GR', `p:${grade}`, grade, 0, 2).lines); }
  const t = freshSave(); t.seed = 'OLD'; const was = { uid: 't1', ...rollTesseract('OLD', 'pentagon:OLD:16:0:v1:complete', 'hollow'), from: PENTAGON_COMPLETE.from };
  t.tesseracts = { owned: [structuredClone(was)], slots: ['t1', null, null], seq: 1, got: { 'pentagon:OLD:16:0:v1:complete': true } };
  const m = migrateSave(JSON.parse(JSON.stringify(t))); ensureTesseracts(m); assert.deepEqual(m.tesseracts.owned[0], was);
  const g = new Game(m, 0); assert.deepEqual(g.save.tesseracts.owned[0], was); const back = deserializeSave(serializeSave(g.exportSnapshot(100)));
  assert.deepEqual(back.tesseracts.owned[0], was); assert.equal(grantTesseract(back, 'pentagon:OLD:16:0:v1:complete', 'hollow'), null, 'the source gave its glyph');
});

// ------------------------------------------------------------------------------------------------ 3. old Pentagons, paid once
const SEED = 'TIM1';
let found = null; const find = () => { if (found) return found; const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); for (let cx = -64; cx <= 64 && !found; cx += PENTAGON.every) for (let cy = -64; cy <= 64 && !found; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) found = { cx, cy }; return found; };
const fromCompletion = (g) => (g.save.tesseracts?.owned || []).filter((t) => t.from === PENTAGON_COMPLETE.from);
const reload = (g) => new Game(deserializeSave(serializeSave(g.exportSnapshot(500))), 1000);
const loadVault = (g, P) => { g.save.session.activeDungeonId = pentagonVaultId(P); g.save.session.dungeonReturn = { rx: P.cx, ry: P.cy, x: 16, y: 16 }; g.loadArea('dungeon', false); assert.ok(g.map.building.vault); };

test('a completion due on load is paid once: repeated starts, reloads and migrations pay nothing more; a v1 one is Hollow at roll 2', () => {
  const { cx, cy } = find();
  for (const V of [1, 2, 3, 7]) { const P = pentagonPlan(SEED, cx, cy, V), s = freshSave(); s.seed = SEED; s.consequences.dungeons[`${P.base}:f1`] = { discovered: true, pentFinale: 1, regentGrade: 'regent' };
    const g = new Game(migrateSave(JSON.parse(JSON.stringify(s))), 0); assert.equal(fromCompletion(g).length, 1, `v${V}`); assert.deepEqual(pentagonsDue(g.save), []);
    const glyph = structuredClone(fromCompletion(g)[0]); assert.equal(glyph.grade, V <= 2 ? 'hollow' : 'regent'); assert.equal(glyph.roll, 2);
    for (const base of [P.base, P.base]) g.payPentagonComplete(base); new Game(g.save, 10); new Game(g.save, 20);
    let r = g; for (let k = 0; k < 3; k++) r = reload(r); const q = new Game(migrateSave(JSON.parse(JSON.stringify(r.save))), 0);
    for (const x of [g, r, q]) { assert.equal(fromCompletion(x).length, 1, `v${V}: once`); assert.deepEqual(fromCompletion(x)[0], glyph, 'the same glyph, unchanged'); } }
});

test('a Pentagon whose Regent fell before release 750 (no walkway record) is paid on load, once; its vault still opens onto the Stillworks, and that win pays nothing more', () => {
  const { cx, cy } = find();
  // the Regent's fall as recorded before 750: the base floor's regentGrade (729+), or only the vault's own guardianDefeated (older)
  for (const [label, V, base, vault] of [['regentGrade', 1, { regentGrade: 'regent' }, null], ['regentGrade, v3', 3, { regentGrade: 'sovereign' }, null], ['the vault\'s guardianDefeated', 2, {}, { guardianDefeated: true, resolved: true }]]) {
    const P = pentagonPlan(SEED, cx, cy, V), s = freshSave(); s.seed = SEED; s.consequences.dungeons[`${P.base}:f1`] = { discovered: true, visits: 4, ...base };
    if (vault) s.consequences.dungeons[pentagonVaultId(P)] = { discovered: true, ...vault };
    assert.deepEqual(pentagonsDue(s), [P.base], `${label}: due`);
    const g = new Game(migrateSave(JSON.parse(JSON.stringify(s))), 0); assert.equal(fromCompletion(g).length, 1, `${label}: paid on load`); assert.deepEqual(pentagonsDue(g.save), []);
    const H = g.save.consequences.dungeons[`${P.base}:f1`], glyph = structuredClone(fromCompletion(g)[0]); assert.equal(H.pentComplete, pentagonCompleteSource(P.base)); assert.equal(glyph.grade, V <= 2 ? 'hollow' : 'regent');
    assert.ok(g.questNotices.some((n) => n.title === PENTAGON_COMPLETE.notice)); assert.equal(fromCompletion(reload(reload(g))).length, 1, `${label}: not again`);
    loadVault(g, P);
    // where the vault stands its Regent up again (as it did before this change), felling him once more pays nothing either
    const regent = g.enemies.find((e) => String(e.id).endsWith(':guardian') && !e.dead); if (!base.regentGrade) assert.ok(regent, `${label}: without regentGrade a Regent stands, the wall shut`);
    if (regent) { regent.hp = 0; regent.dead = true; g.defeatEnemy(regent); }
    assert.equal(H.pentArena, 1, `${label}: the opened wall still leads to the Stillworks`); assert.equal(fromCompletion(g).length, 1, `${label}: the vault pays nothing more`);
    const o = g.map.objects.find((q) => q.kind === 'pentFinaleWall'); g.player.x = o.inner ? o.inner.x : o.x; g.player.y = o.inner ? o.inner.y : o.y + 1; g.interact('use', o.id); assert.equal(g.areaId(), pentagonArenaId(P.base));
    const b = g.enemies.find((e) => e.pentFinaleBeast && !e.dead); b.hp = 0; b.dead = true; g.defeatEnemy(b); assert.ok(H.pentArenaWon);
    assert.equal(fromCompletion(g).length, 1, `${label}: the Stillworks win pays no second`); assert.deepEqual(fromCompletion(g)[0], glyph);
    const r = new Game(migrateSave(JSON.parse(JSON.stringify(reload(g).save))), 0); assert.equal(fromCompletion(r).length, 1); }
  // not early: a Regent still standing (nothing recorded), or a post-750 record (the wall opened: pentArena, the Stillworks to win)
  const P = pentagonPlan(SEED, cx, cy, 1), s = freshSave(); s.seed = SEED; s.consequences.dungeons[`${P.base}:f1`] = { discovered: true, visits: 2 };
  assert.deepEqual(pentagonsDue(s), []); assert.equal(fromCompletion(new Game(s, 0)).length, 0);
  const t = freshSave(); t.seed = SEED; t.consequences.dungeons[`${P.base}:f1`] = { pentArena: 1, regentGrade: 'regent' }; t.consequences.dungeons[pentagonVaultId(P)] = { guardianDefeated: true };
  assert.deepEqual(pentagonsDue(t), []); assert.equal(fromCompletion(new Game(t, 0)).length, 0);
});
