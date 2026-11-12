// Tim, 2026-11-12: (1) "I don't think the compass should point at anything unless you have an objective, like if he gives you a
// quest... Otherwise you can just wander." The compass has a needle only for a Journal pin, the tracked hunt, a far quest, a
// target chosen by tapping, or a quest with no fixed section (the relay leads, the Cairn Keeper's errand) by the section's marks.
// (2) Red waymarks lead to a world boss once one can exist; before the Aperture has woken a free world beast they "point to
// dungeons or something until you get far enough": the nearest crossing not yet entered, found from closed-form entrance rolls.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { compassGuidance, compassQuest, compassQuestCue, COMPASS_QUEST_CUES } from '../src/atlas-view.ts';
import { generateRegion, wayfindingTargets, wayfindingCacheStats, clearWayfindingCache, crossingRolled, CROSSING_ROLLS, dungeonId } from '../src/world.ts';
import { WAYMARK_GUIDES, guideLairAwake, guideLairBeast, guideTarget, guideCrossing, enteredCrossingSections, clearGuideHosts } from '../src/waymark-guides.ts';
import { pentagonCentre, pentagonAt } from '../src/pentagon.ts';
import { WORLD_BEAST_IDS } from '../src/world-beasts.ts';

const G = WAYMARK_GUIDES, main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const cold = (seed) => { const s = freshSave(); s.seed = seed; return s; };
const woken = (seed) => { const s = cold(seed); s.perception = { ...(s.perception || {}), aperture: 99 }; return s; };
const visit = (save, rx, ry) => { const g = new Game(save, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
const d1 = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);
const cue = (signalKind, rx, ry, extra = {}) => ({ kind: 'wayfindingCue', signalKind, targetRx: rx, targetRy: ry, name: `${signalKind} mark`, ...extra });
const guided = (save, rx, ry) => ({ ...save, atlas: { ...(save.atlas || {}), [`${rx},${ry}`]: { guideVersion: G.version } } });
const crossingHere = (map) => map.objects.some((o) => o.kind === 'dungeon' && !o.buildingDoor);

test('with no objective the compass has no needle, whatever marks the section holds', () => {
  const s = cold('NOOBJ1'), marks = [cue('crossing', 2, 0), cue('danger', 0, 3), cue('event', -1, -1), cue('story', 4, 4)];
  assert.equal(s.consequences.choices.relay, undefined, 'a fresh journey: the relay choice is not made');
  assert.equal(compassQuest(s), null);
  assert.equal(compassGuidance(s, { area: 'overworld', cues: marks }), null, 'no nearest crossing, signal or landmark by default');
  assert.equal(compassGuidance(s, { area: 'dungeon', cues: marks }), null);
  // after the relay choice, as before: nothing
  s.consequences.choices.relay = 'restore'; assert.equal(compassGuidance(s, { area: 'overworld', cues: marks }), null);
});

test('objective pointing that already worked still works, in its old order', () => {
  const s = cold('OBJ1'), marks = [cue('crossing', 2, 0)];
  s.viewport.contracts.h1 = { id: 'h1', title: 'Glass Hunt', status: 'tracking', target: { rx: 5, ry: -3 } }; s.viewport.activeHuntId = 'h1';
  const pin = { rx: -4, ry: 2, name: 'The Unwritten Meridian' }, far = { rx: 30, ry: 1, name: 'the Storm Halls' }, pick = { rx: 1, ry: 1, x: 9, y: 12, name: 'Crossing: Old Kiln' };
  assert.deepEqual(compassGuidance(s, { pin, pick, farQuest: far, cues: marks }), { area: 'overworld', rx: -4, ry: 2, kind: 'guidance', name: pin.name }, 'a Journal pin first');
  assert.deepEqual(compassGuidance(s, { pick, farQuest: far, cues: marks }), { area: 'overworld', rx: 5, ry: -3, kind: 'guidance', name: 'Glass Hunt' }, 'then the tracked hunt');
  assert.deepEqual(compassGuidance(s, { area: 'dungeon', farQuest: far }), { area: 'overworld', rx: 5, ry: -3, kind: 'guidance', name: 'Glass Hunt' }, 'shown (dormant) indoors too');
  s.viewport.contracts.h1.status = 'completed';
  assert.equal(compassGuidance(s, { farQuest: far, pick }).name, 'the Storm Halls', 'then a far quest');
  assert.deepEqual(compassGuidance(s, { pick, cues: marks }), { area: 'overworld', rx: 1, ry: 1, x: 9, y: 12, kind: 'guidance', name: pick.name }, 'then a target chosen by tapping');
  assert.equal(compassGuidance(s, { area: 'dungeon', pick }), null, 'a tapped pick is an overworld target');
});

test('a quest with no fixed section follows the section\'s marks: the relay leads any of three, the errand only a crossing', () => {
  const s = cold('OBJ2'), skyway = cue('crossing', 3, 3, { guide: true, name: 'a skyway' }), lair = cue('danger', 4, 0, { guide: true, name: 'a world boss' });
  const early = cue('danger', -2, 1, { guide: true, crossing: true, name: G.lairEarly }), buried = cue('crossing', 0, -2, { name: 'a buried crossing' }), odd = cue('event', 1, 0);
  s.narrative.facts['leads.active'] = true; assert.equal(compassQuest(s), 'leads');
  assert.equal(compassGuidance(s, { cues: [odd, lair, buried] }).name, 'a buried crossing', 'leads: crossing, then danger, then event (release 153 order)');
  assert.equal(compassGuidance(s, { cues: [odd, lair] }).name, 'a world boss');
  s.narrative.facts['leads.complete'] = true; assert.equal(compassQuest(s), null); assert.equal(compassGuidance(s, { cues: [odd, lair, buried] }), null, 'finished leads: no needle');
  s.arcana = { ...(s.arcana || {}), starter: 'set' }; assert.equal(compassQuest(s), 'errand');
  assert.equal(compassQuestCue('errand', [skyway, odd]), null, 'an amber mark on guided ground is a skyway, not a crossing');
  assert.deepEqual(compassGuidance(s, { cues: [skyway, odd, early] }), { area: 'overworld', rx: -2, ry: 1, kind: 'guidance', name: G.lairEarly }, 'the early red mark leads to a crossing');
  assert.equal(compassGuidance(s, { cues: [buried, skyway] }).name, 'a buried crossing', 'old ground: the buried-crossing mark');
  s.lore = { ...(s.lore || {}), surveyor: { links: [{ id: 'l1' }] } }; assert.equal(compassQuest(s), null, 'the first link found ends the errand');
  assert.deepEqual(Object.keys(COMPASS_QUEST_CUES), ['leads', 'errand']);
});

// main.ts: the real functions run against a fake HUD (as tests/compass-facing.test.ts does).
const read = (name) => { const body = main.match(new RegExp('^function ' + name + '\\([^\\n]*\\n[\\s\\S]*?^}', 'm')); assert.ok(body, name); return body[0]; };
test('main.ts: no objective shows the compass dial with no needle; the old nearest-objective default is gone', () => {
  const game = { area: 'overworld', rx: 0, ry: 0, player: { x: 16, y: 16 } }, compass = { hidden: true, 'class:north': true }, guide = { hidden: false }, manual = { hidden: false };
  const make = new Function('game', 'navCompass', 'navGuidanceArrow', 'navManualArrow', 'hudSet', 'compassRotation', 'compassHeading',
    read('updateNavigationArrow') + '\n' + read('idleCompass') + '\nreturn {idleCompass};');
  const api = make(game, compass, guide, manual, (el, k, v) => { el[k] = v; }, () => 0, () => '');
  api.idleCompass();
  assert.equal(compass.hidden, false, 'the compass stays on the HUD'); assert.equal(guide.hidden, true); assert.equal(manual.hidden, true, 'no needle, not even true north');
  assert.equal(compass['class:north'], false); assert.match(compass['aria-label'], /No objective/);
  const nav = main.slice(main.indexOf('function navigationTargets()'), main.indexOf('function updateNavigationArrow('));
  assert.match(nav, /compassGuidance\(save,\{area:game\.area,pin:compassPin,pick,farQuest,cues\}\)/);
  assert.doesNotMatch(nav, /choices\.relay/, 'an unmade relay choice is no objective');
  assert.doesNotMatch(main, /compassPick\)\|\|list\[0\]\|\|null/, 'compassObjective no longer falls back to the nearest objective');
  assert.match(main, /function compassObjective\(\)\{if\(compassPick===null\)return null;/);
  assert.match(main, /if\(!labels\.length\)\{idleCompass\(\);return\}/);
  // dungeons keep their door points and the true-north fallback (release 887)
  assert.match(main, /pointDungeonCompass\(points\.find\(door => door\.id === dungeonCompassPick\) \|\| points\[0\]\)/);
});

test('crossingRolled gives exactly the landmark crossings the generator places, without building a section', () => {
  assert.deepEqual(CROSSING_ROLLS.map((q) => q.chance), [.28, .04, .01]);
  let yes = 0;
  for (const seed of ['ROLL1', 'TIM1']) for (let i = 0; i < 70; i++) {
    const rx = -30 + ((i * 37) % 61), ry = -30 + ((i * 53) % 61); if (['4,-2', '-5,3', '0,0'].includes(`${rx},${ry}`)) continue;
    const want = generateRegion(seed, rx, ry, 1).objects.some((o) => o.kind === 'dungeon'); assert.equal(crossingRolled(seed, rx, ry, 1), want, `${seed} ${rx},${ry}`); if (want) yes++;
  }
  assert.ok(yes > 20, `${yes} crossings sampled`);
  assert.equal(crossingRolled('ROLL1', 0, 0, 1), false); assert.equal(crossingRolled('ROLL1', 4, -2, 1), false, 'never a town');
  for (let rx = 1; rx < 20; rx++) assert.equal(crossingRolled('ROLL1', rx, 3, 0), false, 'generation 0 rolls no landmark crossing');
});

test('the generator reads its crossing chances from the table and places exactly what origin/main (release 910) placed', () => {
  const h = crypto.createHash('sha256');
  for (const seed of ['PIN1', 'TIM1', 'GUIDE1']) for (let rx = -6; rx <= 6; rx += 2) for (let ry = -6; ry <= 6; ry += 3) {
    const r = generateRegion(seed, rx, ry, 1);
    h.update(JSON.stringify([r.tiles.map((t) => [t.kind, t.blocked ? 1 : 0]), r.objects.map((o) => [o.id, o.kind, o.x, o.y, o.dungeonId || '']), r.enemySpawns.map((e) => [e.kind, e.x, e.y])]));
  }
  assert.equal(h.digest('hex').slice(0, 16), '8d2816f0bdc32da9');
  assert.equal(G.version, 1, 'host placement is unchanged, so the guides keep version 1');
});

test('before any world beast wakes, a red mark on guided ground leads to the nearest crossing not yet entered, and one stands there', () => {
  let checked = 0;
  for (const [seed, rx, ry] of [['TIM1', 14, 3], ['GUIDE1', -11, 17], ['S0', 23, -9], ['TIM1', -8, -12]]) {
    const s = cold(seed); assert.equal(guideLairAwake(s), false, 'no Aperture: nothing woken');
    const g = visit(s, rx, ry), red = g.map.objects.find((o) => o.kind === 'wayfindingCue' && o.signalKind === 'danger');
    assert.ok(g.save.atlas[`${rx},${ry}`].guideVersion, 'guided ground'); assert.ok(red, `${seed} ${rx},${ry}: a red mark`);
    assert.equal(red.name, G.lairEarly); assert.equal(red.crossing, true); assert.equal(red.guide, true);
    const tx = red.targetRx, ty = red.targetRy, d = d1(tx, ty, rx, ry); assert.ok(d >= 1 && d <= G.reach);
    assert.ok(crossingRolled(seed, tx, ty, 1));
    // nothing nearer: every closer section rolls no crossing (or is ground a Pentagon may take)
    for (let oy = -d; oy <= d; oy++) for (let ox = -d; ox <= d; ox++) { const n = Math.abs(ox) + Math.abs(oy); if (n < 1 || n >= d) continue;
      const c = pentagonCentre(rx + ox, ry + oy); assert.ok(!crossingRolled(seed, rx + ox, ry + oy, 1) || (c && pentagonAt(seed, c.cx, c.cy, () => true)), `${seed}: ${rx + ox},${ry + oy} is nearer`); }
    // the mark's true bearing, as for every guide
    const bearing = Math.atan2((ty - ry) * 32 + 16 - (red.y + .55), (tx - rx) * 32 + 16 - (red.x + .5)), drawn = Math.atan2(red.dirY, red.dirX);
    assert.ok(Math.abs(Math.atan2(Math.sin(bearing - drawn), Math.cos(bearing - drawn))) < .02);
    // a crossing really stands there
    const there = visit(g.save, tx, ty), door = there.map.objects.find((o) => o.kind === 'dungeon' && !o.buildingDoor); assert.ok(door, `${seed} ${tx},${ty}: a crossing`);
    // once entered, the marks lead on to another
    const id = door.dungeonId || dungeonId(seed, g.save.worldGeneration, tx, ty, door.id); g.save.consequences.dungeons[id] = { discovered: true, visits: 1 };
    assert.ok(enteredCrossingSections(g.save).has(`${tx},${ty}`));
    const next = wayfindingTargets(seed, rx, ry, g.save.worldGeneration, g.save).find((t) => t.kind === 'danger' && t.crossing);
    assert.ok(!next || next.rx !== tx || next.ry !== ty, 'an entered crossing is not led to again'); checked++;
  }
  assert.equal(checked, 4);
});

test('once a beast is woken the red marks return to the lair lattice; old ground keeps its old marks', () => {
  for (const [seed, rx, ry] of [['TIM1', 14, 3], ['GUIDE1', -11, 17]]) {
    const s = guided(woken(seed), rx, ry); assert.ok(guideLairAwake(s));
    const red = wayfindingTargets(seed, rx, ry, 1, s).filter((t) => t.kind === 'danger'), want = guideTarget(seed, 'lair', rx, ry, (x, y) => !!s.atlas[`${x},${y}`] || !guideLairBeast(s, x, y));
    assert.ok(!red.some((t) => t.crossing), 'no crossing once a beast can come');
    if (want) assert.ok(red.some((t) => t.rx === want.rx && t.ry === want.ry && t.name === G.kinds.lair.name));
    // every free beast held somewhere: none is free, so the crossings come back
    const busy = woken(seed); busy.worldBeasts ||= {}; for (const id of WORLD_BEAST_IDS) busy.worldBeasts[id] = { ...(busy.worldBeasts[id] || {}), active: { rx: 99, ry: 99, tries: 0 } };
    assert.equal(guideLairAwake(busy), false);
  }
  // ground seen before the guides (no guideVersion) never gets an early red mark
  const s = cold('TIM1'); s.atlas = { '14,3': { sites: [] } };
  assert.ok(!wayfindingTargets('TIM1', 14, 3, 1, s).some((t) => t.crossing));
});

test('the red mark is the same after a save and reload, and depends on nothing but the save', () => {
  const g = visit(cold('TRIP1'), 12, -9), s = g.save, before = wayfindingTargets(s.seed, 12, -9, s.worldGeneration, s);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); clearGuideHosts(); clearWayfindingCache();
  assert.deepEqual(wayfindingTargets(back.seed, 12, -9, back.worldGeneration, back), before);
  assert.ok(before.some((t) => t.crossing));
  const g2 = visit(back, 12, -9), red = g2.map.objects.find((o) => o.kind === 'wayfindingCue' && o.signalKind === 'danger');
  assert.deepEqual([red.targetRx, red.targetRy], [before.find((t) => t.crossing).rx, before.find((t) => t.crossing).ry]);
});

test('the early red mark stays cheap: no section built, at most one ring scan within reach', () => {
  // the worst case asks the roll once per section within reach, and nothing else
  let asked = 0; assert.equal(guideCrossing(cold('C1'), 40, 40, () => { asked++; return false; }), null);
  assert.equal(asked, 2 * G.reach * (G.reach + 1), 'every section within reach, once');
  const s = cold('PERF2'); clearWayfindingCache(); clearGuideHosts(); let found = 0;
  const t = performance.now(); for (let k = 0; k < 50; k++) { const rx = 60 + k * 7, ry = -30 + k * 3; if (wayfindingTargets(s.seed, rx, ry, 1, guided(s, rx, ry)).some((q) => q.crossing)) found++; }
  const per = (performance.now() - t) / 50;
  assert.equal(wayfindingCacheStats().misses, 0, 'no neighbouring region generated'); assert.ok(found >= 45, `${found} of 50 sections lead to a crossing`);
  console.log(`early red marks: ${per.toFixed(2)} ms per cold guided section`); assert.ok(per < 25, `${per.toFixed(2)} ms`);
});

test('the Journal says where a red mark leads before any world boss has woken', () => {
  assert.match(main, /Red marks lead toward a world boss: [^"]*before any has woken, the nearest crossing you have not entered/);
});
