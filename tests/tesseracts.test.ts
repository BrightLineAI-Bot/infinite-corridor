// Tesseract glyphs (release 729; Tim, 2026-11-04: "like the gems in the Chalice Dungeons... 2 of them can be good, 2 of them can be
// bad... from a labyrinth... a higher chance of negative effects and lower positive bonuses... the final boss... higher quality").
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, characterStats } from '../src/game.ts';
import { TESSERACTS, rollTesseract, grantTesseract, setTesseract, shatterTesseract, tesseractBonus, tesseractLine, ensureTesseracts } from '../src/tesseracts.ts';
import { labyrinthPlan } from '../src/labyrinths.ts';
import { pentagonPlan } from '../src/pentagon.ts';

const save = () => { const s = freshSave(); s.seed = 'TES1'; return s; };

test('a Tesseract glyph: four lines, its first two bonuses, no effect twice; the same source rolls the same glyph', () => {
  for (const grade of Object.keys(TESSERACTS.grades)) for (let i = 0; i < 50; i++) { const g = rollTesseract('S', `${grade}:${i}`, grade, 2);
    assert.equal(g.lines.length, 4); assert.ok(!g.lines[0].bad && !g.lines[1].bad); assert.equal(new Set(g.lines.map((l) => l.k)).size, 4);
    for (const l of g.lines) { assert.ok(l.v > 0 && l.v < .3, tesseractLine(l)); assert.equal(l.bad, !!(l.bad)); if (l.k === 'selfHarm') assert.ok(l.bad); if (l.k === 'killHeal') assert.ok(!l.bad); }
    assert.ok(TESSERACTS.grades[grade].kinds.includes(g.kind)); assert.deepEqual(g, rollTesseract('S', `${grade}:${i}`, grade, 2)); }
});

test('grades: a labyrinth\'s glyphs are the weakest and costliest, a Sovereign\'s the best; deeper floors roll better', () => {
  const stat = (grade, floor = 0) => { let good = 0, n = 0, bad = 0; for (let i = 0; i < 400; i++) { const g = rollTesseract('S', `${grade}:${floor}:${i}`, grade, floor);
    for (const l of g.lines) { const E = TESSERACTS.effects[l.k]; if (l.bad) bad++; else { const [a, b] = E.good; good += (l.v - a) / (b - a); n++; } } } return { good: good / n, bad: bad / 400 }; };
  const lab = stat('labyrinth'), deep0 = stat('deep', 0), deep3 = stat('deep', 3), reg = stat('regent'), sov = stat('sovereign');
  assert.ok(lab.good < deep0.good && deep0.good < deep3.good && deep3.good < sov.good, JSON.stringify({ lab, deep0, deep3, reg, sov }));
  assert.ok(lab.bad > deep0.bad && deep0.bad > reg.bad && reg.bad > sov.bad);
  assert.ok(lab.bad > 1.4 && sov.bad < .6);
});

test('the save: given once per source, three slots, set, cleared, shattered for dust; migrateSave keeps them and drops junk', () => {
  const s = save(); assert.deepEqual(s.tesseracts.slots, [null, null, null]);
  const a = grantTesseract(s, 'src:a', 'deep', 1), b = grantTesseract(s, 'src:b', 'labyrinth'); assert.ok(a && b); assert.equal(grantTesseract(s, 'src:a', 'deep', 1), null, 'a source gives its glyph once');
  assert.ok(setTesseract(s, 0, a.uid).ok); assert.ok(setTesseract(s, 1, a.uid).ok); assert.deepEqual(s.tesseracts.slots, [null, a.uid, null], 'one glyph, one slot');
  assert.ok(!setTesseract(s, 5, a.uid).ok); assert.ok(!setTesseract(s, 0, 'nope').ok);
  s.tesseracts.owned.push({ uid: 'x', kind: 'bogus', lines: [] }); s.tesseracts.slots[2] = 'ghost';
  const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(m.tesseracts.owned.length, 2); assert.deepEqual(m.tesseracts.slots, [null, a.uid, null]); assert.ok(m.tesseracts.got['src:a']);
  const dust = s.glyphDust; assert.ok(shatterTesseract(s, a.uid).ok); assert.equal(s.glyphDust, dust + TESSERACTS.dust); assert.deepEqual(s.tesseracts.slots, [null, null, null]);
  const old = migrateSave({ version: 14, seed: 'OLD' }); assert.deepEqual(old.tesseracts.owned, []);
});

test('set glyphs change the Wayfarer: their lines add to the stats; a swing costs health with selfHarm; a kill gives it back with killHeal', () => {
  const s = save(), base = characterStats(s).maxHp; ensureTesseracts(s);
  s.tesseracts.owned.push({ uid: 'h', kind: 'ward', grade: 'deep', name: 'Test', lines: [{ k: 'hp', v: .1, bad: false }, { k: 'killHeal', v: .05, bad: false }, { k: 'selfHarm', v: .02, bad: true }, { k: 'move', v: .03, bad: true }] });
  assert.ok(setTesseract(s, 0, 'h').ok); const b = tesseractBonus(s); assert.equal(b.hp, .1); assert.equal(b.move, -.03); assert.equal(b.selfHarm, .02);
  assert.ok(characterStats(s).maxHp > base, 'more health');
  const g = new Game(s, 0); g.player.hp = 50; g.player.attackReadyAt = 0; g.primaryAttack(1000); assert.ok(g.player.hp < 50, 'a swing bites back');
  const hp = g.player.hp; g.defeatEnemy({ id: 'e1', kind: 'ashling', x: 0, y: 0, hp: 0, dead: true }); assert.ok(g.player.hp > hp, 'a kill heals');
});

test('a labyrinth\'s vault gives a Labyrinth Tesseract glyph, once', () => {
  const s = save(), g = new Game(s, 0), base = 'labyrinth:TES1:3:9:keep', P = labyrinthPlan(base), v = P.nodes.find((q) => q.vault);
  g.save.session.activeDungeonId = `${base}:f${v.n + 1}`; g.loadArea('dungeon', false); const chest = g.map.objects.find((o) => o.id === 'building-cache'); assert.ok(chest);
  g.player.x = chest.x; g.player.y = chest.y; const r = g.interact('open', chest.id); assert.ok(r.ok, r.message);
  assert.equal(s.tesseracts.owned.length, 1); assert.equal(s.tesseracts.owned[0].grade, 'labyrinth'); assert.equal(grantTesseract(s, `${base}:vault`, 'labyrinth'), null);
});

test('the hunt: a gold ground cue points toward the nearest unexplored Pentagon or labyrinth', () => {
  const s = save(); s.seed = 'TIM1'; const g = new Game(s, 0); let found = null; for (let cx = -64; cx <= 64 && !found; cx += 8) for (let cy = -64; cy <= 64 && !found; cy += 8) if (g.pentagonHere(cx, cy)) found = { cx, cy };
  g.rx = found.cx; g.ry = found.cy + 4; g.loadArea('overworld', false); const cue = g.map.objects.find((o) => o.kind === 'wayfindingCue' && o.signalKind === 'wonder');
  assert.ok(cue, 'a wonder cue'); assert.deepEqual([cue.dirX, cue.dirY], [Math.sign(cue.targetRx - g.rx), Math.sign(cue.targetRy - g.ry)]);
  assert.ok(cue.name === 'The Pentagon' || cue.name === 'a labyrinth'); assert.ok(Math.abs(cue.targetRx - g.rx) + Math.abs(cue.targetRy - g.ry) <= 14);
  if (cue.name === 'The Pentagon') assert.deepEqual([cue.targetRx, cue.targetRy], [found.cx, found.cy]); void pentagonPlan;
});
