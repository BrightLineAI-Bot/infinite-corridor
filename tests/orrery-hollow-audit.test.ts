// Audit, 2026-11-05 (Tim approved): the Aether Orrery's circling orbs (Echoes + 1, capped), Hollow Tesseract lines rolling each
// on its own (roll version 2; glyphs already granted never change), and old Pentagons' completion glyph paid once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { hashSeed } from '../src/random.ts';
import { socketCount } from '../src/glyphs.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { ORRERY, orbTier } from '../src/tool-forms.ts';
import { TESSERACTS, rollTesseract, rollsApart, grantTesseract, ensureTesseracts } from '../src/tesseracts.ts';
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

// ------------------------------------------------------------------------------------------------ 2. Hollow lines, each on its own
const GOLD = (f) => { const out = []; for (const grade of Object.keys(TESSERACTS.grades)) for (let i = 0; i < 60; i++) out.push(f('GOLD', `pentagon:GOLD:${i}:0:v${1 + (i % 7)}:complete`, grade, i % 4)); return JSON.stringify(out); };
test('roll version 1 (every glyph cut through release 759) rolls byte for byte as before, every grade; at roll 2 only Hollow changes', () => {
  const v1 = GOLD((s, src, gr, f) => rollTesseract(s, src, gr, f)); assert.equal(v1.length, 108064); assert.equal(hashSeed(v1), 2458559713, 'pinned from main ce2cc625');
  assert.equal(GOLD((s, src, gr, f) => rollTesseract(s, src, gr, f, 1)), v1);
  assert.equal(TESSERACTS.roll, 2); assert.equal(rollsApart('hollow', 1), false); assert.equal(rollsApart('hollow', 2), true);
  for (const grade of Object.keys(TESSERACTS.grades)) { if (grade === 'hollow') continue; assert.equal(rollsApart(grade, 2), false, grade);
    for (let i = 0; i < 80; i++) assert.deepEqual(rollTesseract('G', `s${i}`, grade, i % 3, 2), rollTesseract('G', `s${i}`, grade, i % 3), `${grade} ${i}`); }
});

test('Hollow at roll 2: lines 1–3 each a cost by its own .85 chance (independent), line 0 always a bonus, no repeated effect', () => {
  const N = 20000, G = TESSERACTS.grades.hollow, p = G.bad, joint = new Map(), per = [0, 0, 0, 0], hist = [0, 0, 0, 0], old = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) { const seed = `S${i}`, src = `pentagon:S${i}:${(i % 40) * 8}:16:v${1 + (i & 1)}:complete`, g = rollTesseract(seed, src, 'hollow', 0, 2);
    assert.equal(g.lines.length, 4); assert.equal(g.lines[0].bad, false); assert.equal(new Set(g.lines.map((l) => l.k)).size, 4);
    for (const l of g.lines) { assert.ok(Number.isFinite(l.v) && l.v > 0 && l.v < .3); const E = TESSERACTS.effects[l.k]; assert.ok(l.bad ? E.bad : E.good); }
    const key = g.lines.slice(1).map((l) => (l.bad ? 1 : 0)).join(''); joint.set(key, (joint.get(key) || 0) + 1);
    g.lines.forEach((l, j) => { if (l.bad) per[j]++; }); hist[g.lines.filter((l) => l.bad).length]++;
    old[rollTesseract(seed, src, 'hollow').lines.filter((l) => l.bad).length]++; }
  for (const j of [1, 2, 3]) assert.ok(Math.abs(per[j] / N - p) < .012, `line ${j}: ${per[j] / N}`);
  // every pattern of three independent .85 chances, within 3.5 standard errors
  for (let m = 0; m < 8; m++) { const bits = [4, 2, 1].map((b) => ((m & b) ? 1 : 0)), key = bits.join(''), want = bits.reduce((a, b) => a * (b ? p : 1 - p), 1), got = (joint.get(key) || 0) / N;
    assert.ok(Math.abs(got - want) < 3.5 * Math.sqrt(want * (1 - want) / N) + 1e-4, `${key}: ${got} vs ${want}`); }
  // one cost (or none) now happens about one time in sixteen; before (roll 1) it almost never did
  assert.ok(hist[0] + hist[1] > N * .045, `${hist}`); assert.ok(old[0] + old[1] < N * .002, `old ${old}`);
  assert.ok(hist[3] > N * .58 && hist[3] < N * .65, `${hist}`);
  // and each line's strength is its own: where each value sits in its effect's range (the draw behind it) does not move with
  // its neighbour's (the effects themselves differ by line, as no effect repeats)
  const draw = (l) => { const [a, b] = TESSERACTS.effects[l.k][l.bad ? 'bad' : 'good'], t = (l.v - a) / (b - a), q = G.q; return l.bad ? (t - (1 - q) * .6) / .4 : (t / q - .6) / .4; };
  let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < 4000; i++) { const g = rollTesseract(`C${i}`, `c${i}`, 'hollow', 0, 2), [x, y] = [draw(g.lines[2]), draw(g.lines[3])]; sx += x; sy += y; sxy += x * y; sxx += x * x; syy += y * y; }
  const n = 4000, r = (sxy / n - sx / n * sy / n) / Math.sqrt((sxx / n - (sx / n) ** 2) * (syy / n - (sy / n) ** 2)); assert.ok(Math.abs(r) < .05, `r ${r}`);
});

test('grants: a new Hollow glyph is cut at roll 2 and records it; other grades record nothing; a stored glyph never changes', () => {
  const s = freshSave(); s.seed = 'GR'; const h = grantTesseract(s, 'p:complete', 'hollow', 0, 'x'), r = grantTesseract(s, 'p:hoard', 'regent', 0, 'y');
  assert.equal(h.roll, 2); assert.deepEqual(h.lines, rollTesseract('GR', 'p:complete', 'hollow', 0, 2).lines); assert.equal('roll' in r, false); assert.deepEqual(r.lines, rollTesseract('GR', 'p:hoard', 'regent').lines);
  // a Hollow glyph granted by releases 756–759 (roll 1, no `roll` field) loads exactly as stored, through every normaliser
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
    const glyph = structuredClone(fromCompletion(g)[0]); assert.equal(glyph.grade, V <= 2 ? 'hollow' : 'regent'); assert.equal(glyph.roll, V <= 2 ? 2 : undefined);
    for (const base of [P.base, P.base]) g.payPentagonComplete(base); new Game(g.save, 10); new Game(g.save, 20);
    let r = g; for (let k = 0; k < 3; k++) r = reload(r); const q = new Game(migrateSave(JSON.parse(JSON.stringify(r.save))), 0);
    for (const x of [g, r, q]) { assert.equal(fromCompletion(x).length, 1, `v${V}: once`); assert.deepEqual(fromCompletion(x)[0], glyph, 'the same glyph, unchanged'); } }
});

test('a Pentagon whose Regent fell before release 750 (no walkway record): nothing on load; its vault opens onto the Stillworks, and winning there pays once', () => {
  const { cx, cy } = find(), P = pentagonPlan(SEED, cx, cy, 1), s = freshSave(); s.seed = SEED; s.consequences.dungeons[`${P.base}:f1`] = { discovered: true, visits: 4, regentGrade: 'regent' };
  const g = new Game(migrateSave(JSON.parse(JSON.stringify(s))), 0); assert.deepEqual(pentagonsDue(g.save), []); assert.equal(fromCompletion(g).length, 0, 'not complete by the 756 rule: the Stillworks is still to win');
  loadVault(g, P); const H = g.save.consequences.dungeons[`${P.base}:f1`]; assert.equal(H.pentArena, 1, 'the opened wall leads to the Stillworks'); assert.equal(fromCompletion(g).length, 0);
  const o = g.map.objects.find((q) => q.kind === 'pentFinaleWall'); g.player.x = o.inner ? o.inner.x : o.x; g.player.y = o.inner ? o.inner.y : o.y + 1; g.interact('use', o.id); assert.equal(g.areaId(), pentagonArenaId(P.base));
  const b = g.enemies.find((e) => e.pentFinaleBeast && !e.dead); b.hp = 0; b.dead = true; g.defeatEnemy(b);
  assert.equal(fromCompletion(g).length, 1); assert.equal(H.pentComplete, pentagonCompleteSource(P.base)); assert.equal(fromCompletion(g)[0].roll, 2);
  const r = reload(reload(g)); assert.equal(fromCompletion(r).length, 1);
});
