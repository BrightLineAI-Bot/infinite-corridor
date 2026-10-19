import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { takeCompletedReading } from '../src/lore.ts';
import { ELDERS, ELDER_RULES, elderClass, elderPlan, hearElder, elderHeard, eldersHeard, elderProgress, ruleRows } from '../src/elders.ts';
import { addElder, addDungeonElder, tickTravelers } from '../src/travelers.ts';
import { applyInteraction } from '../src/interactions.ts';

test('the Elders speak the 88 essentially different elementary rules', () => {
  assert.equal(ELDER_RULES.length, 88);
  for (const [a, b] of [[30, 86], [30, 135], [110, 124], [110, 137], [90, 165]]) assert.equal(elderClass(a), elderClass(b), `${a} ~ ${b}`);
  assert.notEqual(elderClass(30), elderClass(110));
  for (const r of ELDER_RULES) assert.equal(elderClass(r), r);
  // Rule 90 from one cell is the Sierpinski triangle; rule 30's centre column is its famous irregular one.
  const rows = ruleRows(90, 9, 4, 'single');
  assert.deepEqual([...rows[1]], [0, 0, 0, 1, 0, 1, 0, 0, 0]);
  assert.deepEqual([...rows[2]], [0, 0, 1, 0, 0, 0, 1, 0, 0]);
  assert.deepEqual(ruleRows(30, 41, 8, 'single').map((r) => r[20]), [1, 1, 0, 1, 1, 1, 0, 0]);
  assert.deepEqual(ruleRows(110, 20, 5, 1234), ruleRows(110, 20, 5, 1234), 'seeded rows repeat');
});

test('hearing an Elder records its rule class once; all 88 complete the recitation', () => {
  const s = freshSave();
  assert.deepEqual(hearElder(s, 30), { rule: 30, first: true, completed: false });
  assert.equal(hearElder(s, 135).first, false, 'an equivalent rule is the same pattern');
  assert.ok(elderHeard(s, 86));
  takeCompletedReading();
  for (const r of ELDER_RULES) hearElder(s, r);
  assert.deepEqual(elderProgress(s), { found: 88, total: 88, mastered: true });
  assert.equal(takeCompletedReading(), 'elders');
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(eldersHeard(m).length, 88);
  const bad = freshSave(); bad.lore.elders = 'not hex!';
  assert.equal(migrateSave(JSON.parse(JSON.stringify(bad))).lore.elders, '');
});

test('Elders are rare, lean toward unheard rules, and move on as rules are heard', () => {
  const s = freshSave(); s.seed = 'elder-seed';
  let hits = 0, fresh = 0;
  for (let i = 0; i < 4000; i++) { const p = elderPlan(s, `k${i}`, ELDERS.chance.wild); if (p) { hits++; assert.ok(ELDER_RULES.includes(p.rule)); } }
  assert.ok(hits > 4000 * ELDERS.chance.wild * .7 && hits < 4000 * ELDERS.chance.wild * 1.3, String(hits));
  for (const r of ELDER_RULES.slice(0, 80)) hearElder(s, r);
  let n = 0; for (let i = 0; i < 20000 && n < 200; i++) { const p = elderPlan(s, `j${i}`, 1); n++; if (!elderHeard(s, p.rule)) fresh++; }
  assert.ok(fresh / n > ELDERS.unheardShare - .12, `${fresh}/${n}`);
  // The same place rolls again once more rules are known.
  const t = freshSave(); t.seed = 'x'; const before = Array.from({ length: 300 }, (_, i) => !!elderPlan(t, `p${i}`, .2)); hearElder(t, 30);
  assert.notDeepEqual(Array.from({ length: 300 }, (_, i) => !!elderPlan(t, `p${i}`, .2)), before);
});

function field(width = 32) { return Array.from({ length: width * width }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'grass' })); }
test('an Elder walks a road, pauses for you, and answers with a pattern instead of words', () => {
  const s = freshSave(); s.seed = 'roads';
  const road = Array.from({ length: 20 }, (_, i) => ({ x: 6 + i, y: 16 }));
  let map = null, at = null;
  for (let rx = 2; rx < 400 && !at; rx++) { map = { tiles: field(), objects: [], trails: [road] }; at = addElder(map, s, rx, 0); }
  assert.ok(at && at.elder && ELDER_RULES.includes(at.rule));
  assert.ok(road.some((p) => p.x === at.x && p.y === at.y), 'starts on the road');
  const x0 = at.x; tickTravelers(map, { x: 0, y: 0 }, 1); assert.notEqual(at.x, x0, 'walks');
  tickTravelers(map, { x: at.x, y: at.y + 1 }, 1); assert.equal(at.state, 'listening');
  const r = applyInteraction(at, 'speak', s);
  assert.ok(r.ok && r.pattern.rule === at.rule && r.elder.first);
  assert.ok(!/[a-z]{3,}/i.test(r.message.replace(/A pattern is remembered \(Reciter's Tome\)\./, '')), 'no words from the Elder');
  assert.equal(addElder({ tiles: field(), objects: [], trails: [road] }, s, 0, 1), null, 'never at the Refuge');
  let d = null; for (let i = 0; i < 400 && !d; i++) d = addDungeonElder({ tiles: field(24), objects: [], entry: { x: 4, y: 4 }, levelStableId: `L${i}` }, `area-${i}`, s, 24);
  assert.ok(d && d.elder, 'Elders wander crossings too');
});
