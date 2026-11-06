// The Pentagon's completion Tesseract (Tim, 2026-11-05: "There should be at least one Tesseract for completing the Pentagon; one
// Tesseract per Pentagon"). Completion is the finale beast's fall in the Stillworks, or, for a Pentagon whose wall opened onto
// the walkway before the Stillworks, the Regent's fall. Every version pays one, once, recorded on the base floor's history
// (`pentComplete`); one completed in an older journey is paid on the next start. Nothing that paid before pays less.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { PENTAGON, PENTAGON_COMPLETE, pentagonPlan, pentagonVaultId, pentagonCompleted, payPentagonCompletion, pentagonsDue, pentagonCompleteSource, pentagonCompleteGrade, generatePentagonChamber } from '../src/pentagon.ts';
import { pentagonArenaId } from '../src/pentagon-arena.ts';
import { TESSERACTS, rollTesseract, rerollTesseractLine } from '../src/tesseracts.ts';

const SEED = 'TIM1';
const game = (seed = SEED, save = null) => { const s = save || freshSave(); s.seed = seed; return new Game(s, 0); };
let found = null; const find = () => { if (found) return found; const g = game(); for (let cx = -64; cx <= 64 && !found; cx += PENTAGON.every) for (let cy = -64; cy <= 64 && !found; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) found = { cx, cy }; return found; };
const H = (g, P) => g.save.consequences.dungeons[`${P.base}:f1`] || {};
const loadVault = (g, P) => { g.save.session.activeDungeonId = pentagonVaultId(P); g.save.session.dungeonReturn = { rx: P.cx, ry: P.cy, x: 16, y: 16 }; g.loadArea('dungeon', false); assert.ok(g.map.building.vault, 'the vault'); };
const fellRegent = (g) => { const e = g.enemies.find((q) => String(q.id).endsWith(':guardian')); assert.ok(e && !e.dead, 'the Regent stands'); e.hp = 0; e.dead = true; g.defeatEnemy(e); };
const wall = (g) => g.map.objects.find((o) => o.kind === 'pentFinaleWall');
const act = (g, o, a = 'use') => { assert.ok(o, 'the object is there'); g.player.x = o.inner ? o.inner.x : o.x; g.player.y = o.inner ? o.inner.y : o.y + 1; return g.interact(a, o.id); };
const killBeast = (g) => { const b = g.enemies.find((e) => e.pentFinaleBeast && !e.dead); assert.ok(b, 'the finale beast'); b.hp = 0; b.dead = true; g.defeatEnemy(b); return b; };
const owned = (g) => (g.save.tesseracts?.owned || []).length;
const fromCompletion = (g) => (g.save.tesseracts?.owned || []).filter((t) => t.from === PENTAGON_COMPLETE.from);
const reload = (g) => new Game(deserializeSave(serializeSave(g.exportSnapshot(500))), 1000);

// ------------------------------------------------------------------------------------------------ the audit (what a full clear pays)
// Per version: the Tesseract sources a full clear of one Pentagon reaches (reliquary chests, sealed vaults, the deep keepers from
// PENTAGON.deepGlyphFrom down, the Regent's hoard; v1 and v2 pay none of these), counted from the generated chambers.
const SOURCES = (V) => { const { cx, cy } = find(), P = pentagonPlan(SEED, cx, cy, V), n = { reliquary: 0, sealed: 0, deep: 0, hoard: 0 };
  P.nodes.forEach((q, i) => { const m = generatePentagonChamber(SEED, `${P.base}:f${i + 1}`), B = m.building;
    for (const o of m.objects) { if (V >= 3 && o.reliquary) n.reliquary++; if (V >= 5 && o.sealedVault) n.sealed++; if (V >= 3 && B.vault && o.id === 'building-cache') n.hoard++; }
    if (V >= 3 && B.heartFloor >= PENTAGON.deepGlyphFrom && B.boss) n.deep++; });
  return n; };
test('the audit: what each version pays before completion (v1–v2 none; v3–v4 six; v5–v7 nine), and completion adds one to every version', () => {
  const want = { 1: 0, 2: 0, 3: 6, 4: 6, 5: 9, 6: 9, 7: 9, 8: 9 }; // release 795: v8 (grand halls) pays as v7
  for (let V = 1; V <= PENTAGON.version; V++) { const n = SOURCES(V), sum = n.reliquary + n.sealed + n.deep + n.hoard; assert.equal(sum, want[V], `v${V}: ${JSON.stringify(n)}`); }
  assert.ok(TESSERACTS.grades[PENTAGON_COMPLETE.grade], 'the completion grade is a Tesseract grade');
});

// ------------------------------------------------------------------------------------------------ the rule (pure)
test('pure: complete when the Stillworks beast fell, or the walkway opened before the Stillworks; paid once, recorded on the base floor', () => {
  assert.equal(pentagonCompleted(null), false); assert.equal(pentagonCompleted({}), false);
  assert.equal(pentagonCompleted({ pentFinale: 1, pentArena: 1 }), false, 'the Regent down, the Stillworks still to win');
  assert.equal(pentagonCompleted({ pentFinale: 1, pentArena: 1, pentArenaWon: true }), true);
  assert.equal(pentagonCompleted({ pentFinale: 1 }), true, 'a walkway Pentagon: the Regent fell before the Stillworks');
  const s = freshSave(); s.seed = SEED; const base = `pentagon:${SEED}:16:0:v7`;
  s.consequences.dungeons[`${base}:f1`] = { pentFinale: 1, pentArena: 1 }; assert.deepEqual(pentagonsDue(s), []); assert.equal(payPentagonCompletion(s, base), null);
  s.consequences.dungeons[`${base}:f1`].pentArenaWon = true; assert.deepEqual(pentagonsDue(s), [base]);
  const g = payPentagonCompletion(s, base); assert.ok(g); assert.equal(g.grade, PENTAGON_COMPLETE.grade); assert.equal(s.consequences.dungeons[`${base}:f1`].pentComplete, pentagonCompleteSource(base));
  assert.equal(s.tesseracts.got[pentagonCompleteSource(base)], true); assert.equal(payPentagonCompletion(s, base), null, 'once'); assert.deepEqual(pentagonsDue(s), []);
  assert.equal(s.tesseracts.owned.length, 1);
  // a chamber's history other than the base floor's is never a Pentagon to pay
  s.consequences.dungeons[`${base}:f3`] = { pentArenaWon: true }; assert.deepEqual(pentagonsDue(s), []);
});

// ------------------------------------------------------------------------------------------------ in the game, every version
test('every version: the Regent alone pays no completion glyph; the Stillworks beast\'s fall pays exactly one, once, and a reload pays nothing more', () => {
  const { cx, cy } = find();
  for (let V = 1; V <= PENTAGON.version; V++) { const g = game(), P = pentagonPlan(SEED, cx, cy, V); loadVault(g, P); const before = owned(g); fellRegent(g);
    assert.equal(fromCompletion(g).length, 0, `v${V}: not before the Stillworks`); assert.equal(H(g, P).pentComplete, undefined);
    const fall = owned(g); act(g, wall(g)); assert.equal(g.areaId(), pentagonArenaId(P.base), `v${V}: the Stillworks`); killBeast(g);
    assert.equal(owned(g), fall + 1, `v${V}: one glyph for the completion`); assert.equal(fromCompletion(g).length, 1);
    assert.equal(H(g, P).pentComplete, pentagonCompleteSource(P.base)); assert.equal(fromCompletion(g)[0].grade, V <= 2 ? 'hollow' : 'regent', `v${V}: its grade`); assert.ok(g.save.tesseracts.got[pentagonCompleteSource(P.base)]);
    assert.ok(g.questNotices.some((n) => n.title === PENTAGON_COMPLETE.notice)); assert.ok(g.save.narrative.journal.some((j) => j.recordId === `pentagon-complete:${P.base}`));
    g.pentagonArenaWon(g.enemies.find((e) => e.pentFinaleBeast)); g.payPentagonComplete(P.base); assert.equal(owned(g), fall + 1, `v${V}: once`);
    const r = reload(g); assert.equal(owned(r), fall + 1, `v${V}: a reload pays nothing more`); const m = new Game(migrateSave(JSON.parse(JSON.stringify(r.save))), 0); assert.equal(owned(m), fall + 1);
    loadVault(m, P); assert.equal(owned(m), fall + 1, `v${V}: nor does the vault again`);
    assert.ok(before <= fall); }
});

test('two Pentagons pay one each; the glyph is a hash of the seed and the Pentagon (two journeys alike)', () => {
  const g = game(), { cx, cy } = find(), A = `pentagon:${SEED}:${cx}:${cy}:v7`, B = `pentagon:${SEED}:${cx + 8}:${cy}:v7`;
  for (const b of [A, B]) g.save.consequences.dungeons[`${b}:f1`] = { pentFinale: 1, pentArena: 1, pentArenaWon: true };
  g.payPentagonComplete(A); g.payPentagonComplete(B); g.payPentagonComplete(A); assert.equal(fromCompletion(g).length, 2);
  const h = game(); for (const b of [A, B]) h.save.consequences.dungeons[`${b}:f1`] = { pentFinale: 1, pentArena: 1, pentArenaWon: true }; h.payPentagonComplete(A); h.payPentagonComplete(B);
  assert.deepEqual(fromCompletion(h).map((t) => t.lines), fromCompletion(g).map((t) => t.lines));
});

// ------------------------------------------------------------------------------------------------ old saves
test('an old save already finished: a Stillworks won, or a walkway Pentagon, is paid once on the next start; never twice across reloads', () => {
  const { cx, cy } = find();
  for (const [label, rec] of [['the Stillworks won (release 754)', { pentFinale: 1, pentArena: 1, pentArenaBeast: 'crimsonTyrant', pentArenaWon: true, regentGrade: 'sovereign' }], ['a walkway Pentagon (releases 750–753)', { pentFinale: 1, pentSigil: true, regentGrade: 'regent' }]]) {
    for (const V of [1, 3, 5, 7]) { const P = pentagonPlan(SEED, cx, cy, V), s = freshSave(); s.seed = SEED; s.consequences.dungeons[`${P.base}:f1`] = { discovered: true, visits: 3, ...structuredClone(rec) };
      const g = new Game(migrateSave(JSON.parse(JSON.stringify(s))), 0); assert.equal(fromCompletion(g).length, 1, `${label}, v${V}: paid on start`);
      assert.equal(H(g, P).pentComplete, pentagonCompleteSource(P.base)); assert.ok(g.questNotices.some((n) => n.title === PENTAGON_COMPLETE.notice));
      const r = reload(g); assert.equal(fromCompletion(r).length, 1, `${label}, v${V}: not again`); const q = new Game(migrateSave(JSON.parse(JSON.stringify(r.save))), 0); assert.equal(fromCompletion(q).length, 1);
      if (!rec.pentArena) { loadVault(q, P); assert.equal(wall(q).toId.endsWith(':finale'), true, 'the walkway Pentagon keeps its way'); assert.equal(fromCompletion(q).length, 1); } }
  }
});

test('an old save: a Pentagon unfinished (the Stillworks still to win, or never begun) pays nothing on start; one already paid is not paid again', () => {
  const { cx, cy } = find(), P = pentagonPlan(SEED, cx, cy, 7), s = freshSave(); s.seed = SEED;
  s.consequences.dungeons[`${P.base}:f1`] = { pentFinale: 1, pentArena: 1, regentGrade: 'regent' }; const g = new Game(s, 0); assert.equal(fromCompletion(g).length, 0);
  const t = freshSave(); t.seed = SEED; t.consequences.dungeons[`${P.base}:f1`] = { pentFinale: 1, pentArena: 1, pentArenaWon: true, pentComplete: pentagonCompleteSource(P.base) };
  assert.equal(fromCompletion(new Game(t, 0)).length, 0, 'recorded as paid: nothing more');
  const u = freshSave(); u.seed = SEED; u.consequences.dungeons[`${P.base}:f1`] = { pentFinale: 1, pentArena: 1, pentArenaWon: true }; u.tesseracts = { owned: [], slots: [null, null, null], seq: 4, got: { [pentagonCompleteSource(P.base)]: true } };
  const k = new Game(migrateSave(u), 0); assert.equal(fromCompletion(k).length, 0, 'the source already gave its glyph: none twice'); assert.equal(H(k, P).pentComplete, pentagonCompleteSource(P.base));
});

test('the other sources stay as they were: the hoard, the reliquaries, the sealed vaults and the deep keepers keep their own sources', () => {
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, 7); loadVault(g, P); fellRegent(g);
  const chest = g.map.objects.find((o) => o.id === 'building-cache'); g.player.x = chest.x; g.player.y = chest.y; g.interact('open', chest.id);
  assert.ok(g.save.tesseracts.got[`${P.base}:hoard`], 'the hoard pays as before'); act(g, wall(g)); killBeast(g);
  assert.deepEqual(Object.keys(g.save.tesseracts.got).filter((k) => k.startsWith(P.base)).sort(), [`${P.base}:complete`, `${P.base}:hoard`].sort());
});

// ------------------------------------------------------------------------------------------------ the early Pentagons' glyph
// Tim, 2026-11-05: versions 1 and 2 pay no other Tesseract; their completion glyph leans hard toward costs (the hollow grade: one
// bonus and up to three costs). From version 3 it is a Regent's glyph.
test('v1 and v2 completion glyphs are hollow: at least one bonus, at most three costs, far more costs than a Regent\'s; v3+ regent', () => {
  for (let V = 1; V <= PENTAGON.version; V++) assert.equal(pentagonCompleteGrade(pentagonPlan(SEED, 16, 0, V).base), V <= 2 ? 'hollow' : 'regent', `v${V}`);
  const N = 2000, tally = (grade) => { const hist = [0, 0, 0, 0, 0]; let costs = 0;
    for (let i = 0; i < N; i++) { const base = pentagonPlan(`H${i}`, (i % 40) * 8, Math.floor(i / 40) * 8 + 16, grade === 'hollow' ? 1 + (i & 1) : 7).base, g = rollTesseract(`H${i}`, pentagonCompleteSource(base), grade);
      const n = g.lines.filter((l) => l.bad).length; assert.ok(!g.lines[0].bad, 'the first line is always a bonus'); assert.ok(n <= 3); assert.equal(g.lines.length, 4); assert.equal(new Set(g.lines.map((l) => l.k)).size, 4, 'no effect twice');
      for (const l of g.lines) assert.ok(l.v > 0 && l.v < .3); hist[n]++; costs += n; }
    return { mean: costs / N, hist }; };
  const hollow = tally('hollow'), regent = tally('regent');
  assert.ok(hollow.mean > 2.2 && hollow.mean > 2.5 * regent.mean, `hollow ${hollow.mean} (${hollow.hist}) vs regent ${regent.mean} (${regent.hist})`);
  assert.ok(hollow.hist[3] > N * .5, 'three costs most often'); assert.equal(regent.hist[3], 0, 'a Regent\'s glyph never has three');
  // the dais's reroll keeps a hollow glyph's rules: its first line a bonus, any other line may come back a cost
  const g = rollTesseract('H0', 'x', 'hollow'); let line1Costs = 0; for (let k = 0; k < 400; k++) { const l = rerollTesseractLine('H0', `r${k}`, g, 1); if (l.bad) line1Costs++; assert.ok(!rerollTesseractLine('H0', `r${k}`, g, 0).bad); }
  assert.ok(line1Costs > 200, `${line1Costs} of 400`);
  // a v1 Pentagon completed in the game pays a hollow glyph
  const s = freshSave(); s.seed = SEED; const P = pentagonPlan(SEED, 16, 0, 1); s.consequences.dungeons[`${P.base}:f1`] = { pentFinale: 1 }; const k = new Game(s, 0);
  assert.equal(fromCompletion(k)[0].grade, 'hollow'); assert.ok(fromCompletion(k)[0].name.startsWith('Hollow'));
});
