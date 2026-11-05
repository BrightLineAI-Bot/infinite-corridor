// Tesseract roll 3 (Tim, 2026-11-05): four classes (Melee, Magic, Vitality, Motion) with their own bonus and cost pools, tiers
// (low two or three costs, middle one or two, top three strong bonuses and one hard curse), health on hit, costs that never
// cancel the glyph's own bonuses, rerolls inside the tier and the class; rolls 1 and 2 unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, characterStats, dodgeCost, tesseractHarm } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { hashSeed } from '../src/random.ts';
import { armorGlyphBonus, TESSERACT_LINE_LIMITS } from '../src/glyphs.ts';
import { CASTABLES, availableCastables } from '../src/spell-slots.ts';
import { APERTURE_SKILLS } from '../src/items.ts';
import { TESSERACTS, rollTesseract, rerollTesseractLine, grantTesseract, tesseractBonus, tesseractLine, tesseractClassText, tesseractTier, ensureTesseracts } from '../src/tesseracts.ts';

const E = TESSERACTS.effects, C = TESSERACTS.classes, GRADES = Object.keys(TESSERACTS.grades);
const WANT = { hollow: [2, 3], labyrinth: [2, 3], deep: [1, 2], reliquary: [1, 2], regent: [1, 2], sealed: [1, 1], sovereign: [1, 1] };
const costsOf = (g) => g.lines.filter((l) => l.bad).length;
const roll3 = (i, grade, floor = 0) => ({ uid: 't1', ...rollTesseract(`S${i}`, `pentagon:S${i}:${(i % 40) * 8}:16:complete`, grade, floor, 3), roll: 3 });
// the rule: no cost on the axis of a bonus the glyph holds, no effect twice, at most one health-on-hit line
function assertFair(g, label) {
  const bon = g.lines.filter((l) => !l.bad), cos = g.lines.filter((l) => l.bad);
  assert.equal(new Set(g.lines.map((l) => l.k)).size, 4, `${label}: no effect twice`);
  for (const c of cos) for (const b of bon) assert.notEqual(E[c.k].axis, E[b.k].axis, `${label}: ${tesseractLine(c)} offsets ${tesseractLine(b)}`);
  assert.ok(g.lines.filter((l) => E[l.k].group === 'onHit').length <= 1, `${label}: one health-on-hit line at most`);
}

test('rolls 1 and 2 roll and reroll byte for byte as on main 0eb650c6 (live r764), every grade', () => {
  const dig = (roll) => { const out = []; for (const grade of GRADES) for (let i = 0; i < 60; i++) { const g = { uid: 't1', ...rollTesseract('PIN', `pentagon:PIN:${i}:0:v${1 + (i % 7)}:complete`, grade, i % 4, roll) }; if (roll >= 2) g.roll = roll; out.push(g); for (let j = 0; j < 4; j++) out.push(rerollTesseractLine('PIN', `p:${i}:reroll0:t1:${j}`, g, j)); } const s = JSON.stringify(out); return [s.length, hashSeed(s)]; };
  assert.deepEqual(dig(1), [179848, 1244216231]);
  assert.deepEqual(dig(2), [183753, 337690874]);
  assert.deepEqual(rollTesseract('X', 'y', 'deep', 2), rollTesseract('X', 'y', 'deep', 2, 1), 'the default is roll 1');
  for (const g of [rollTesseract('X', 'a', 'sovereign', 0, 1), rollTesseract('X', 'a', 'sovereign', 0, 2)]) for (const l of g.lines) assert.ok(['attackDamage', 'spellDamage', 'defense', 'hp', 'move', 'attackSpeed', 'spellCooldown', 'spellDuration', 'staminaRegen', 'dodgeCost', 'burstRadius', 'killHeal', 'selfHarm'].includes(l.k), 'rolls 1-2 never draw roll 3\'s lines');
});

test('roll 3: four classes evenly; each tier\'s cost count in range and even; bonuses from the class, costs from its class (a top tier\'s from its curse pool, unscaled)', () => {
  assert.equal(TESSERACTS.roll, 3);
  assert.deepEqual(Object.fromEntries(GRADES.map((g) => [g, tesseractTier(g).costs])), WANT);
  const N = 4000, meanBonus = {}, meanCost = {};
  for (const [grade, [lo, hi]] of Object.entries(WANT)) { const hist = [0, 0, 0, 0], kinds = {}, T = tesseractTier(grade); let bs = 0, bn = 0, cs = 0, cn = 0;
    for (let i = 0; i < N; i++) { const g = roll3(i, grade), K = C[g.kind]; kinds[g.kind] = (kinds[g.kind] || 0) + 1; hist[costsOf(g)]++;
      assert.ok(K, `${grade}: a class`); assert.ok(g.name.startsWith(`${TESSERACTS.grades[grade].name} ${K.name} Tesseract `), g.name); assert.equal(g.lines[0].bad, false); assert.ok(K.lead.includes(g.lines[0].k));
      assertFair(g, `${grade} ${g.name}`);
      for (const l of g.lines) { assert.ok(Number.isFinite(l.v) && l.v > 0 && l.v < .4, tesseractLine(l));
        if (!l.bad) { assert.ok(K.lead.includes(l.k) || K.bonus.includes(l.k)); bs += l.v; bn++; }
        else { cs += l.v; cn++; if (T.curse) { assert.ok(K.curse.includes(l.k) || (K.curseAlt || []).includes(l.k), `${grade}: curse ${l.k}`); const [a, b] = E[l.k].curse; assert.ok(l.v >= a - 1e-9 && l.v <= b + 1e-9, `${grade}: a curse at full strength ${l.k} ${l.v}`); } else assert.ok(K.costs.includes(l.k), `${grade}: cost ${l.k}`); } } }
    for (let n = lo; n <= hi; n++) assert.ok(Math.abs(hist[n] / N - 1 / (hi - lo + 1)) < .03, `${grade}: ${n} costs ${hist[n]}`);
    for (const k of Object.keys(C)) assert.ok(Math.abs(kinds[k] / N - .25) < .03, `${grade}: ${k} ${kinds[k]}`);
    meanBonus[grade] = bs / bn; meanCost[grade] = cs / cn; }
  const up = Object.keys(WANT); for (let k = 1; k < up.length; k++) assert.ok(meanBonus[up[k]] > meanBonus[up[k - 1]], `bonuses stronger up the tiers ${JSON.stringify(meanBonus)}`);
  assert.ok(meanCost.sealed > meanCost.regent * 1.6 && meanCost.sovereign > meanCost.regent * 1.6, `a top tier's one cost is a real curse: ${JSON.stringify(meanCost)}`);
  // every signature curse turns up at the top
  const seen = new Set(); for (let i = 0; i < 3000; i++) for (const l of roll3(i, 'sovereign').lines) if (l.bad) seen.add(l.k);
  for (const K of Object.values(C)) for (const k of K.curse) assert.ok(seen.has(k), `curse ${k}`);
});

test('no roll-3 glyph has a cost that offsets one of its own bonuses (every tier, every class, rerolled too); the class pools keep axes apart', () => {
  for (const [id, K] of Object.entries(C)) { const axes = new Set([...K.lead, ...K.bonus].filter((k) => !E[k].group).map((k) => E[k].axis));
    for (const k of [...K.costs, ...K.curse, ...(K.curseAlt || [])]) assert.ok(!axes.has(E[k].axis), `${id}: ${k} shares an axis with its main bonuses`); }
  for (const grade of GRADES) for (let i = 0; i < 1500; i++) { const g = roll3(i, grade, i % 4); assertFair(g, `${grade}:${i}`);
    for (let j = 0; j < 4; j++) { const l = rerollTesseractLine('D', `p:${i}:reroll0:t1:${j}`, g, j); assert.ok(l, `${grade}:${i} line ${j} rerolls`); assertFair({ lines: g.lines.map((q, k) => (k === j ? l : q)) }, `${grade}:${i} rerolled ${j}`); } }
});

test('the dais at roll 3 keeps a glyph inside its tier\'s cost range and its class\'s pools; pure; both ways where the range allows', () => {
  for (const [grade, [lo, hi]] of Object.entries(WANT)) { const seen = new Set(), T = tesseractTier(grade);
    for (let i = 0; i < 400; i++) { const g = roll3(i, grade), K = C[g.kind];
      for (let j = 0; j < 4; j++) { const src = `p:${i}:reroll1:t1:${j}`, l = rerollTesseractLine('D', src, g, j);
        assert.deepEqual(rerollTesseractLine('D', src, g, j), l, 'pure');
        const n = costsOf({ lines: g.lines.map((q, k) => (k === j ? l : q)) }); assert.ok(n >= lo && n <= hi, `${grade}: ${n}`);
        if (l.bad) assert.ok((T.curse ? [...K.curse, ...(K.curseAlt || [])] : K.costs).includes(l.k)); else assert.ok((j === 0 ? K.lead : K.bonus).includes(l.k));
        if (j === 0) assert.equal(l.bad, false); else seen.add(`${g.lines[j].bad ? 1 : 0}>${l.bad ? 1 : 0}`); } }
    if (hi > lo) for (const k of ['1>0', '0>1', '1>1', '0>0']) assert.ok(seen.has(k), `${grade}: ${k}`); else assert.deepEqual([...seen].sort(), ['0>0', '1>1']); }
  // a roll-2 glyph still rerolls by roll 2's rules (no class pools)
  const old = { uid: 't1', ...rollTesseract('D', 'old', 'hollow', 0, 2), roll: 2 }; for (let j = 0; j < 4; j++) { const l = rerollTesseractLine('D', `x:${j}`, old, j); assert.ok(!['meleeHeal', 'spellHeal', 'hitHeal', 'castHarm', 'dodgeHarm', 'staminaDrain', 'damageTaken'].includes(l.k)); }
});

test('grants cut at roll 3 and record it; roll-1 and roll-2 glyphs already owned load, save and migrate unchanged', () => {
  const s = freshSave(); s.seed = 'R3'; const g = grantTesseract(s, 'p:x', 'sealed', 0, 'here'); assert.equal(g.roll, 3); assert.deepEqual(g.lines, rollTesseract('R3', 'p:x', 'sealed', 0, 3).lines); assert.ok(C[g.kind]);
  const one = { uid: 't7', ...rollTesseract('R3', 'old1', 'sovereign'), from: 'a' }, two = { uid: 't8', ...rollTesseract('R3', 'old2', 'hollow', 0, 2), roll: 2, from: 'b' };
  s.tesseracts.owned.push(structuredClone(one), structuredClone(two)); s.tesseracts.unknownField = 7;
  const m = migrateSave(JSON.parse(JSON.stringify(s))); ensureTesseracts(m);
  assert.deepEqual(m.tesseracts.owned.find((q) => q.uid === 't7'), one); assert.deepEqual(m.tesseracts.owned.find((q) => q.uid === 't8'), two); assert.equal(m.tesseracts.unknownField, 7); assert.equal(m.version, 14);
  assert.equal(tesseractClassText(one), 'Sovereign', 'an old Sovereign-kind glyph is the old mixed class'); assert.ok(tesseractClassText(g).startsWith(`${C[g.kind].name} · `));
});

test('the glyph text: each new line reads as it works', () => {
  assert.equal(tesseractLine({ k: 'damageTaken', v: .2, bad: true }), '+20% damage taken');
  assert.equal(tesseractLine({ k: 'castHarm', v: .05, bad: true }), '5% of maximum health lost with each cast');
  assert.equal(tesseractLine({ k: 'dodgeHarm', v: .05, bad: true }), '5% of maximum health lost with each dodge');
  assert.equal(tesseractLine({ k: 'staminaDrain', v: .1, bad: true }), '10% of maximum stamina drained each second you move');
  assert.equal(tesseractLine({ k: 'meleeHeal', v: .05, bad: false }), '5% of maximum health back with each melee hit');
  assert.equal(tesseractLine({ k: 'spellHeal', v: .05, bad: false }), '5% of maximum health back with each magic hit');
  assert.equal(tesseractLine({ k: 'hitHeal', v: .025, bad: false }), '2.5% of maximum health back with each hit, melee or magic');
  assert.equal(tesseractLine({ k: 'selfHarm', v: .02, bad: true }), '2% of maximum health lost with each swing', 'old lines read as before');
  assert.equal(tesseractLine({ k: 'dodgeCost', v: .2, bad: true }), '+20% dodge cost');
  // Tim's top values: 5% on melee or magic hits (Vitality's), 2.5% on any hit
  let top = { meleeHeal: 0, spellHeal: 0, hitHeal: 0 }; for (let i = 0; i < 6000; i++) for (const l of roll3(i, 'sovereign').lines) if (top[l.k] !== undefined) top[l.k] = Math.max(top[l.k], l.v);
  assert.ok(top.meleeHeal > .045 && top.meleeHeal <= .052 && top.spellHeal > .045 && top.spellHeal <= .052 && top.hitHeal > .022 && top.hitHeal <= .026, JSON.stringify(top));
});

// ------------------------------------------------------------------------------------------------ combat
function arena(lines, maxHp = 200) {
  const s = freshSave(); s.seed = 'R3C'; s.perception.aperture = 17900; const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; g.paused = false; s.maxHp = maxHp; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: maxHp, maxHp }); s.lastAim = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('rootBrute', 11, 10), { id: 'foe', hp: 1e7, maxHp: 1e7, damage: 0, cooldown: 1e9, speed: 0 })]; g.projectiles = []; g.effects = [];
  if (lines) { s.tesseracts.owned.push({ uid: 'c', kind: 'edge', grade: 'sovereign', name: 'Test', roll: 3, lines }); s.tesseracts.slots[0] = 'c'; }
  return { s, g };
}
const input = (o = {}) => ({ state: { x: o.x || 0, y: o.y || 0 }, consume: (k) => (o.press === k ? (o.press = null, true) : false), held: () => false });
const step = (g, t, o) => g.update(.05, input(o), t);

test('damage taken: every blow lands harder by the line, through the game\'s blow paths', () => {
  const hit = (lines) => { const { g } = arena(lines); g.player.invulnerableUntil = 0; const h0 = g.player.hp; g.packHurt(null, 60, {}, 1000); const a = h0 - g.player.hp;
    g.player.invulnerableUntil = 0; const h1 = g.player.hp; g.effects.push({ id: 'b', hostile: true, x: g.player.x + .5, y: g.player.y + .52, radius: 1, damage: 60, life: .3, pulse: 99, untilPulse: 0, hits: {} }); step(g, 2000); return [a, h1 - g.player.hp]; };
  const [p0, f0] = hit(null), [p1, f1] = hit([{ k: 'damageTaken', v: .25, bad: true }]);
  assert.ok(p1 >= Math.floor(p0 * 1.25) && p1 <= Math.ceil(p0 * 1.25) + 1, `${p0} -> ${p1}`); assert.ok(f1 >= Math.floor(f0 * 1.25) && f1 <= Math.ceil(f0 * 1.25) + 1, `${f0} -> ${f1}`);
});

test('health costs: per swing, per cast and per dodge, never below the floor (never a death)', () => {
  const { s, g } = arena([{ k: 'selfHarm', v: .02, bad: true }, { k: 'castHarm', v: .05, bad: true }, { k: 'dodgeHarm', v: .05, bad: true }]), max = s.maxHp, floor = Math.ceil(max * TESSERACTS.harmFloor);
  g.player.attackReadyAt = 0; g.primaryAttack(1000); assert.equal(g.player.hp, max - 4, 'a swing: 2%');
  const key = availableCastables(s).find((k) => CASTABLES[k].kind === 'spell'); assert.ok(key); const h = g.player.hp; assert.ok(g.castKey(key)); assert.equal(g.player.hp, h - 10, 'a cast: 5%');
  const h2 = g.player.hp; assert.equal(g.castKey(key), false, 'recovering: no cast'); assert.equal(g.player.hp, h2, 'a refused cast costs nothing');
  g.player.stamina = 100; const h3 = g.player.hp; step(g, 3000, { press: 'dodge', x: 1 }); assert.equal(g.player.hp, h3 - 10, 'a dodge: 5%');
  g.player.hp = floor + 3; g.player.attackReadyAt = 0; g.primaryAttack(5000); assert.equal(g.player.hp, floor, 'stops at the floor');
  g.player.attackReadyAt = 0; g.primaryAttack(6000); assert.equal(g.player.hp, floor, 'below it, nothing');
  const p = { hp: 5 }; assert.equal(tesseractHarm(s, p, .5), 0); assert.equal(p.hp, 5);
});

test('stamina drained only while moving; a dodge cost limit holds', () => {
  const run = (lines, x) => { const { g } = arena(lines); g.player.stamina = 40; g.player.maxStamina = 100; for (let t = 1000; t < 3000; t += 50) step(g, t, { x }); return g.player.stamina; };
  const still0 = run(null, 0), still1 = run([{ k: 'staminaDrain', v: .1, bad: true }], 0), move0 = run(null, 1), move1 = run([{ k: 'staminaDrain', v: .1, bad: true }], 1);
  assert.equal(still1, still0, 'standing still: no drain'); assert.ok(move1 < move0 - 15, `${move0} -> ${move1}`); assert.ok(move1 >= 0);
  const { s } = arena([{ k: 'dodgeCost', v: .25, bad: true }]); assert.ok(dodgeCost(s) > 15);
});

test('health on hit: melee hits heal by meleeHeal, magic by spellHeal, both by hitHeal; at most hitHealCap of max health a second', () => {
  const { s, g } = arena([{ k: 'meleeHeal', v: .05, bad: false }, { k: 'hitHeal', v: .01, bad: false }]), max = s.maxHp;
  g.player.hp = 100; assert.equal(Math.round(g.tesseractHitHeal('melee', 1000)), Math.round(max * TESSERACTS.hitHealCap), 'one hit, capped at the second\'s cap');
  assert.equal(g.tesseractHitHeal('melee', 1500), 0, 'the same second: nothing more');
  g.player.hp = 100; assert.equal(Math.round(g.tesseractHitHeal('spell', 2100)), Math.round(max * .01), 'a magic hit: hitHeal only');
  // a real swing heals; a real spell hit heals
  const a = arena([{ k: 'meleeHeal', v: .02, bad: false }]); a.g.player.hp = 100; a.g.player.attackReadyAt = 0; a.g.primaryAttack(1000, { x: 1, y: 0 }); assert.equal(Math.round(a.g.player.hp), 104, 'a swing that lands');
  const b = arena([{ k: 'spellHeal', v: .02, bad: false }]); b.g.player.hp = 100; b.g.effects.push({ id: 'sp', kind: 'ember-ring', x: 11.5, y: 10.45, life: .5, radius: 2, pulse: 99, untilPulse: 0, damage: 20, hits: {}, glyphHost: 'spell', glyphSpell: 'ember-ring' }); step(b.g, 1000); assert.ok(b.g.player.hp > 100, `a spell hit heals: ${b.g.player.hp}`);
  const c = arena([{ k: 'spellHeal', v: .02, bad: false }]); c.g.player.hp = 100; c.g.player.attackReadyAt = 0; c.g.primaryAttack(1000, { x: 1, y: 0 }); assert.equal(c.g.player.hp, 100, 'a melee hit does not use spellHeal');
});

test('old totals stack as before (no new caps): past 100% dodge-cost reduction a dodge is free, never a refund; only roll 3\'s own lines are bounded', () => {
  const s = freshSave(); s.seed = 'LIM'; ensureTesseracts(s);
  const big = (uid, lines) => ({ uid, kind: 'star', grade: 'sovereign', name: uid, roll: 3, lines });
  s.tesseracts.owned = [big('a', [{ k: 'spellCooldown', v: .36, bad: false }, { k: 'attackSpeed', v: .29, bad: false }, { k: 'dodgeCost', v: .29, bad: false }, { k: 'damageTaken', v: .29, bad: true }]), big('b', [{ k: 'spellCooldown', v: .36, bad: false }, { k: 'attackSpeed', v: .29, bad: false }, { k: 'dodgeCost', v: .29, bad: false }, { k: 'damageTaken', v: .29, bad: true }]), big('c', [{ k: 'spellCooldown', v: .36, bad: false }, { k: 'attackSpeed', v: .29, bad: false }, { k: 'dodgeCost', v: .29, bad: false }, { k: 'staminaRegen', v: .5, bad: true }])];
  s.tesseracts.slots = ['a', 'b', 'c']; s.equipment.armor = { ...(s.equipment.armor || {}), glyphs: ['still', 'still', 'still'] };
  const ag = armorGlyphBonus(s), tb = tesseractBonus(s);
  // every stat that existed before roll 3 is the armor glyphs (capped as ever) plus the Tesseracts' sum, unbounded
  assert.ok(Math.abs(ag.spellCooldown - tb.spellCooldown) < 1e-9 && ag.spellCooldown > 1, `${ag.spellCooldown}`); assert.ok(Math.abs(ag.attackSpeed - tb.attackSpeed) < 1e-9);
  assert.ok(Math.abs(ag.dodgeCost - (.6 + tb.dodgeCost)) < 1e-9, `${ag.dodgeCost}`); assert.ok(Math.abs(ag.staminaRegen - tb.staminaRegen) < 1e-9);
  assert.equal(TESSERACT_LINE_LIMITS.damageTaken[1], .5); assert.equal(ag.damageTaken, .5, 'a roll-3 line is bounded'); assert.equal(TESSERACT_LINE_LIMITS.selfHarm, undefined, 'selfHarm (older than roll 3) stacks as before');
  // free dodges: cost 0, a dodge at 0 stamina still goes, stamina never rises from it beyond a frame's recovery
  assert.equal(dodgeCost(s), 0); const { g } = arena(null); g.save.tesseracts = s.tesseracts; g.save.equipment.armor = s.equipment.armor; g.player.stamina = 0;
  for (let k = 0; k < 5; k++) { const t = 1000 + k * 600, before = g.player.stamina; step(g, t, { press: 'dodge', x: 1 }); assert.ok(g.player.dodgeUntil > t, `dodge ${k}`); assert.ok(g.player.stamina - before < 1, 'no refund'); }
  // a cooldown reduction past 100%: casting stays sane (no NaN), every press answers
  const key = availableCastables(g.save).find((k) => CASTABLES[k].kind === 'spell'); for (let k = 0; k < 4; k++) { g.lastUpdateNow = 5000 + k * 100; assert.ok(g.castKey(key), `cast ${k}`); for (const v of Object.values(g.save.magicSkills.cooldowns)) assert.ok(Number.isFinite(v)); }
  assert.ok(Number.isFinite(characterStats(s).maxHp) && characterStats(s).maxHp > 0);
});

test('cast every castable with cooldowns wiped each frame for 60 s under three cursed roll-3 glyphs: no NaN, health at or above the floor, bounded arrays', () => {
  const s = freshSave(); s.seed = 'STORM'; s.perception.aperture = 17900; for (const id of Object.keys(APERTURE_SKILLS)) s.magicSkills.learned[id] = 3;
  for (let i = 0; i < 3; i++) { const g = grantTesseract(s, `storm:${i}`, i ? 'sovereign' : 'sealed', 0, 'x'); s.tesseracts.slots[i] = g.uid; }
  s.tesseracts.owned.push({ uid: 'harm', kind: 'star', grade: 'sovereign', name: 'h', roll: 3, lines: [{ k: 'spellDamage', v: .2, bad: false }, { k: 'spellHeal', v: .03, bad: false }, { k: 'spellCooldown', v: .15, bad: false }, { k: 'castHarm', v: .06, bad: true }] }); s.tesseracts.slots[0] = 'harm';
  const g = new Game(s, 0); g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; g.paused = false; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: s.maxHp }); s.lastAim = { x: 1, y: 0 };
  g.enemies = [0, 1, 2].map((k) => Object.assign(createCombatant('rootBrute', 12 + k, 10), { id: `foe${k}`, hp: 1e7, maxHp: 1e7, damage: 0, cooldown: 1e9, speed: 0 }));
  const keys = availableCastables(s), floor = Math.ceil(s.maxHp * TESSERACTS.harmFloor); assert.ok(keys.length > 10, `${keys.length} castables`);
  let peakFx = 0, peakShots = 0, minHp = Infinity;
  for (let t = 1000; t < 61000; t += 50) { const ms = g.save.magicSkills; for (const k of Object.keys(ms.cooldowns)) ms.cooldowns[k] = 0; g.spellCooldownRemaining = 0; ms.active = null;
    g.castKey(keys[(t / 50) % keys.length]); g.player.attackReadyAt = 0; g.primaryAttack(t, { x: 1, y: 0 }); step(g, t);
    assert.ok(Number.isFinite(g.player.hp) && Number.isFinite(g.player.stamina), `t ${t}`); minHp = Math.min(minHp, g.player.hp);
    peakFx = Math.max(peakFx, g.effects.length); peakShots = Math.max(peakShots, g.projectiles.length); for (const e of g.enemies) assert.ok(Number.isFinite(e.hp)); }
  assert.ok(minHp >= floor - 1e-9, `health ${minHp} never under the floor ${floor}`); assert.ok(peakFx < 400 && peakShots < 400, `effects ${peakFx}, projectiles ${peakShots}`);
});
