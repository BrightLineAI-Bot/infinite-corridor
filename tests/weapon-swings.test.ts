// One combat across every weapon (Tim, 2026-11-14; src/melee-swing.ts PRIMARY_SWINGS). The Fourfold Daggers cut one hand at a
// time from that hand's pivot, the two cuts crossing in an X in front of the Wayfarer (a dagger in each hand in Close View); the
// Cinder Pike draws back and thrusts, its hit following the tip out along the line; the Iron Fists' contact delay runs in every
// area and both views. The same clock, hit, lunge and hit-stop in the overworld and in an interior, in Standard and Close View.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant, wayfarerDamage } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';
import { PRIMARY_PROFILES, FOURFOLD_DAGGERS } from '../src/items.ts';
import { PRIMARY_SWINGS, sampleSwing, swingIndicator, drawSwingSweep, circleTouchesSegment, swingPoseProgress } from '../src/melee-swing.ts';
import { closeViewPrimaryWeaponKind } from '../src/close-view.ts';
import { writeCloseViewHeroGear, MODEL_FLOATS } from '../src/close-view-models.ts';
import { sampleMeleeActionPose, closeViewHeldGear } from '../src/close-view-player-presentation.ts';

const DAG = PRIMARY_SWINGS['fourfold-daggers'], PIKE = PRIMARY_SWINGS['cinder-pike'];
const ITEMS = {
  daggers: () => ({ id: 'primary-fd-swing', name: 'Fourfold Daggers', slot: 'primary', power: 8, property: 'paired', tier: 'rare', affixes: [] }),
  pike: () => ({ id: 'primary-cinder-pike', name: 'Cinder Pike', slot: 'primary', power: 8, property: 'reach', tier: 'rare', affixes: [] }),
  fists: () => ({ id: 'primary-iron-fists', name: 'Iron Fists', slot: 'primary', power: 8 }),
};
const mash = { state: { x: 0, y: 0 }, consume: (k: string) => k === 'attack', held: () => false, reset: () => {} };
const calm = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} };
const once = (key: string) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k: string) => k === key && !used && (used = true), held: () => false, reset: () => {} }; };
const open = (g: any) => { for (const t of g.map.tiles) { t.blocked = false; t.openAir = false; t.courtyard = false; t.pentRoof = false; t.pentBalcony = false; t.environment = false; if (t.kind === 'yardGrass' || t.kind === 'water' || t.kind === 'river') t.kind = 'flagFloor'; } g.map.objects = (g.map.objects || []).filter((o: any) => o.kind !== 'npc'); };
function overworld(weapon: string, closeView: boolean) {
  const s = freshSave(); s.seed = 'WEAPON-SWINGS'; s.level = 10; s.closeView = closeView; s.activeWeaponSlot = 'primary'; s.equipment.primary = ITEMS[weapon]();
  const g: any = new Game(s, 0); g.paused = false; s.session.paused = false; g.rx = 4; g.ry = 4; g.loadArea('overworld', false); open(g); g.enemies = []; g.projectiles = [];
  Object.assign(g.player, { x: 15, y: 16, facing: 'right' }); s.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null; return g;
}
function interior(weapon: string, closeView: boolean) {
  const g: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game;
  g.save.closeView = closeView; g.save.activeWeaponSlot = 'primary'; g.save.equipment.primary = ITEMS[weapon](); open(g); g.enemies = []; g.projectiles = [];
  g.save.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null; return g;
}
// A foe `ahead` tiles along the aim (+x) and `side` tiles to its right (+y), held still.
const foe = (g: any, ahead: number, side: number, id: string) => Object.assign(createCombatant('ashling', g.player.x + ahead, g.player.y + side), { id, hp: 1e6, maxHp: 1e6, damage: 0, cooldown: 99, speed: 0, speedMultiplier: 1e-6, meleePatterns: [] });
// Runs `ms` of frames, the foes and the Wayfarer pinned (so only the blade decides); logs every hit with the swing's step and clock.
// `swings`: mash, but only until that many swings have started (each later press buffered into the chain point).
function fight(g: any, foes: any[], { ms = 2000, dt = 8, input = mash as any, from = 100000, swings = Infinity } = {}) {
  const ids = new Set(); if (swings < Infinity) input = { ...mash, consume: (k: string) => k === 'attack' && ids.size < swings };
  g.enemies = foes; const home = foes.map(f => ({ x: f.x, y: f.y })), px = g.player.x, py = g.player.y, log: any[] = [];
  for (let t = from, i = 0; i * dt < ms; i++, t += dt) {
    foes.forEach((f, k) => Object.assign(f, home[k], { hitStun: 0 })); g.player.x = px; g.player.y = py; g.save.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null; g.player.invulnerableUntil = t + 1e6;
    const before = foes.map(f => f.hp); g.update(dt / 1000, input, t); if (g.pendingMeleeContact?.v === 3) ids.add(g.pendingMeleeContact.id);
    foes.forEach((f, k) => { if (f.hp < before[k]) log.push({ id: f.id, at: t - from, step: g.pendingMeleeContact?.step, elapsed: Math.round(g.pendingMeleeContact?.elapsedMs ?? -1), dealt: before[k] - f.hp }); });
  }
  return log;
}
// ---- the Fourfold Daggers ----

test('daggers: one table: the right hand from the east across to the north-west, the left mirrored, then both; quick wind-ups', () => {
  const [r, l, x] = DAG.steps;
  assert.ok(r.side > 0 && l.side < 0 && x.pair, 'right hand, left hand, both');
  assert.ok(r.from >= 85 && r.from <= 100 && r.to <= -40 && r.to >= -60, 'cut 1: from the east side, across the front, into the north-west');
  assert.ok(l.from <= -85 && l.to >= 40, 'cut 2: the mirror');
  for (const s of DAG.steps) { assert.ok(s.windupMs <= 170 && s.activeMs <= 80 && s.hitStopMs <= 60, `${s.name}: quick`); assert.ok(s.lunge >= .1 && s.lunge <= .2, `${s.name}: a small step`); }
  const cleaver = PRIMARY_SWINGS['verge-cleaver'].steps;
  assert.ok(Math.max(...DAG.steps.map(s => s.windupMs)) < Math.min(...cleaver.map(s => s.windupMs)), 'quicker than every Cleaver wind-up');
  assert.ok(Object.isFrozen(DAG) && DAG.steps.every(Object.isFrozen));
  assert.equal(DAG.bubble, PRIMARY_SWINGS['verge-cleaver'].bubble, 'the same body bubble'); assert.equal(PIKE.bubble, DAG.bubble);
  assert.equal(DAG.bufferMs, 150); assert.equal(PIKE.bufferMs, 150);
  assert.ok(sampleSwing(r, 16).weight > 0, 'the pose moves from the press');
});

test('daggers: the X: a foe in it takes both hands\' cuts, one to a side one, one further out none; no gap dead ahead', () => {
  const g = overworld('daggers', false);
  const foes = [foe(g, .8, 0, 'centre'), foe(g, 1.45, 0, 'ahead'), foe(g, .3, 1.2, 'right'), foe(g, .3, -1.2, 'left'), foe(g, 2.3, 0, 'far')];
  const log = fight(g, foes, { ms: 900, swings: 2 }); // two cuts: the right hand's, then the left's
  const count = (id: string) => log.filter(q => q.id === id).length, steps = (id: string) => log.filter(q => q.id === id).map(q => q.step);
  assert.deepEqual(steps('centre'), [1, 2], 'in the X: both hands');
  assert.deepEqual(steps('ahead'), [1, 2], 'straight ahead at 1.45 tiles (the old gap): both hands');
  assert.deepEqual(steps('right'), [1], 'off to the right: only the right hand\'s cut, which starts there');
  assert.deepEqual(steps('left'), [2], 'off to the left: only the left hand\'s');
  assert.equal(count('far'), 0, 'further out than the tips: none');
  // the third step crosses both at once
  const h = overworld('daggers', false), c = foe(h, .8, 0, 'centre');
  const l3 = fight(h, [c], { ms: 1400, swings: 3 });
  assert.deepEqual(l3.map(q => q.step), [1, 2, 3]); const [a, b, x] = l3.map(q => q.dealt);
  assert.ok(Math.abs(x - 2 * wayfarerDamage((PRIMARY_PROFILES['primary-fourfold-daggers'].damage + h.weaponBonus()) * DAG.steps[2].share)) <= 1, 'the crossing step: two cuts on the foe in the X');
});

test('daggers: each hand\'s cut runs from its own pivot and follows the blade: a right-side foe is cut early in cut 1, a left-side foe late', () => {
  const g = overworld('daggers', false), log = fight(g, [foe(g, .6, .7, 'r'), foe(g, .6, -.7, 'l')], { ms: 400, input: once('attack') as any });
  const at = (id: string) => log.find(q => q.id === id)?.elapsed;
  assert.ok(at('r') != null && at('l') != null && at('r') < at('l'), `the blade passes the right first (${at('r')} < ${at('l')})`);
  const st = DAG.steps[0]; for (const q of log) assert.ok(q.elapsed >= st.windupMs && q.elapsed <= st.windupMs + st.activeMs + 8, 'inside the active window');
});

test('daggers and pike: the same hits on the same clock in the overworld and an interior, Standard and Close View', () => {
  for (const [weapon, foes] of [['daggers', [[.8, 0], [.3, 1.2], [1.4, -.3]]], ['pike', [[.85, 0], [1.75, 0], [2.3, 0], [1.6, .6]]] /* off the lunge-stop distance (.9), which float rounding decides */] as const) {
    const runs: any[] = [];
    for (const make of [overworld, interior]) for (const cv of [false, true]) {
      const g = make(weapon, cv); runs.push(fight(g, foes.map(([a, s], i) => foe(g, a, s, `f${i}`)), { ms: 1800 }).map(q => [q.id, q.step, q.elapsed])); // the lab's Wayfarer and a fresh journey's hit for different amounts
    }
    for (const r of runs) assert.deepEqual(r, runs[0], `${weapon}: identical everywhere`);
    assert.ok(runs[0].length > 3, `${weapon}: it hits`);
  }
});

test('daggers: presses buffer about 150 ms before the chain point and chain fast; dodge cancels at once', () => {
  const st = DAG.steps[0];
  { const g = overworld('daggers', false); g.update(.008, once('attack'), 1000); for (let t = 1008; t < 1000 + st.chainMs - 140; t += 8) g.update(.008, calm, t);
    g.update(.008, once('attack'), 1000 + st.chainMs - 140); let started = 0; for (let t = 1000 + st.chainMs - 132; t < 1500 && !started; t += 8) { g.update(.008, calm, t); if (g.pendingMeleeContact?.step === 2) started = t - 1000; }
    assert.ok(started >= st.chainMs && started <= st.chainMs + 8, `buffered into the chain point (${started})`); }
  { const g = overworld('daggers', false); g.player.stamina = g.save.maxStamina = 100; g.update(.008, once('attack'), 1000); g.update(.008, calm, 1050);
    g.update(.008, { ...once('dodge'), state: { x: 0, y: 1 } }, 1058); assert.equal(g.pendingMeleeContact, null, 'the dodge cancels the cut in its wind-up'); }
});

test('daggers: damage per second within 10% of the old two-cut press, single target, through the real damage code', () => {
  const g = overworld('daggers', false), cut = wayfarerDamage((PRIMARY_PROFILES['primary-fourfold-daggers'].damage + g.weaponBonus()) * FOURFOLD_DAGGERS.share);
  const old = 2 * cut * 1000 / 432; // two cuts a 420 ms press, at the 16 ms frame the old press rounded up to
  const log = fight(g, [foe(g, .8, 0, 'f')], { ms: 12000, dt: 16 }), dps = log.reduce((a, q) => a + q.dealt, 0) / 12;
  assert.ok(Math.abs(dps / old - 1) <= .1, `single ${dps.toFixed(1)} vs ${old.toFixed(1)}`);
});

test('daggers: a dagger in each hand in Close View: the roster, the gear on both sockets, both hands posed', () => {
  assert.equal(closeViewPrimaryWeaponKind(ITEMS.daggers()), 'fourfold-daggers', 'no longer the Salvage Blade stand-in');
  assert.equal(FOURFOLD_DAGGERS.closeView.model, 'fourfold-daggers'); assert.equal(closeViewHeldGear('fourfold-daggers').grip, 'paired');
  { const g = overworld('daggers', true); g.update(.008, once('attack'), 1000); assert.equal(g.player.attackVisual.weaponKind, 'fourfold-daggers'); assert.equal(g.player.attackVisual.meleeAction.kind, 'fourfold-daggers'); }
  // the gear writer puts one dagger on each socket: twice the single dagger's vertices, half near each hand
  const at = (x: number, y: number, z: number) => { const m = new Float32Array(16); m[0] = 1; m[5] = 1; m[10] = 1; m[12] = x; m[13] = y; m[14] = z; m[15] = 1; return m; };
  const out = new Float32Array(4096 * MODEL_FLOATS), left = at(-1, 0, 1), right = at(1, 0, 1);
  const end = writeCloseViewHeroGear(out, 0, { profile: 'fourfold-daggers', primaryStage: null, leftSocket: left, rightSocket: right, alpha: 1 });
  const n = end / MODEL_FLOATS; assert.ok(n > 0 && n % 2 === 0 && n / 3 <= 96, `${n / 3} triangles for the pair`);
  let nearL = 0, nearR = 0; for (let i = 0; i < n; i++) { const x = out[i * MODEL_FLOATS]; if (x < 0) nearL++; else nearR++; }
  assert.equal(nearL, n / 2, 'one dagger in the left hand'); assert.equal(nearR, n / 2, 'one in the right');
  // the pose: the step's own hand cuts, the third step both
  const pose = (step: number, ms: number) => sampleMeleeActionPose({ v: 3, kind: 'fourfold-daggers', move: 'swing', step, durationMs: DAG.steps[step - 1].recoveryMs, contactMs: DAG.steps[step - 1].windupMs, tempo: 1 }, ms / DAG.steps[step - 1].recoveryMs);
  assert.equal(pose(1, 130).hand, 1); assert.equal(pose(2, 120).hand, -1); assert.equal(pose(3, 190).pair, true);
  assert.ok(pose(1, 0).weight === 0 && pose(1, 140).weight === 1 && pose(1, DAG.steps[0].recoveryMs).weight === 0, 'from the carry and back to it');
});

// ---- the Cinder Pike ----

test('pike: a draw-back, then the hit follows the tip out along the line; a foe off the line is not touched; reach lengthens the shaft', () => {
  for (const s of PIKE.steps) { assert.ok(s.thrust && s.draw > .3 && s.draw < .8 && s.from === 0 && s.to === 0); assert.ok(s.windupMs > DAG.steps[0].windupMs && s.windupMs < 400); }
  const st = PIKE.steps[0], w = sampleSwing(st, st.windupMs - 1); assert.ok(w.reach < .6 && w.phase === 'hold', 'drawn back at full cock');
  assert.equal(sampleSwing(st, st.windupMs + st.activeMs + 10).reach, 1, 'out to the tip');
  const g = overworld('pike', false), log = fight(g, [foe(g, .9, 0, 'near'), foe(g, 1.6, 0, 'mid'), foe(g, 2.3, 0, 'tip'), foe(g, 1.6, .6, 'off')], { ms: 600, input: once('attack') as any });
  const at = (id: string) => log.find(q => q.id === id)?.elapsed;
  assert.equal(at('off'), undefined, 'off the line: missed (the old 32-degree cone took it)');
  assert.ok(at('near')! <= at('mid')! && at('mid')! < at('tip')!, `along the line in order: ${at('near')} ${at('mid')} ${at('tip')}`);
  for (const q of log) assert.ok(q.elapsed >= st.windupMs && q.elapsed <= st.windupMs + st.activeMs + 8);
  for (const [reach, hit] of [[0, false], [.3, true]] as const) { const h = overworld('pike', false); h.save.equipment.primary = { ...ITEMS.pike(), affixes: reach ? [{ id: 'reach', value: reach }] : [] };
    assert.equal(fight(h, [foe(h, 2.95, 0, 'x')], { ms: 600, input: once('attack') as any }).length > 0, hit, `reach +${reach * 100}%`); }
  assert.equal(circleTouchesSegment(1, .3, .1, 0, 0, 2, 0), false); assert.equal(circleTouchesSegment(1, .05, .1, 0, 0, 2, 0), true);
});

test('pike: damage per second within 10% of the old 420 ms press, single target and a line of foes', () => {
  const g = overworld('pike', false), plain = wayfarerDamage(PRIMARY_PROFILES['primary-cinder-pike'].damage + g.weaponBonus()), old = plain * 1000 / 432;
  const one = fight(g, [foe(g, 1.6, 0, 'f')], { ms: 12000, dt: 16 }).reduce((a, q) => a + q.dealt, 0) / 12;
  assert.ok(Math.abs(one / old - 1) <= .1, `single ${one.toFixed(1)} vs ${old.toFixed(1)}`);
  const h = overworld('pike', false), line = fight(h, [foe(h, 1, 0, 'a'), foe(h, 1.6, 0, 'b'), foe(h, 2.2, 0, 'c')], { ms: 12000, dt: 16 }).reduce((a, q) => a + q.dealt, 0) / 12;
  assert.ok(Math.abs(line / (3 * old) - 1) <= .1, `line ${line.toFixed(1)} vs ${(3 * old).toFixed(1)}`);
});

test('pike: the Close View thrust pose rides the swing clock: drawn back in the wind-up, out at contact, home in the recovery', () => {
  const st = PIKE.steps[0];
  assert.equal(swingPoseProgress('cinder-pike', st, 0), 0);
  assert.ok(Math.abs(swingPoseProgress('cinder-pike', st, st.windupMs) - .14) < 1e-9, 'the stab starts as the strike does');
  assert.ok(Math.abs(swingPoseProgress('cinder-pike', st, st.windupMs + st.activeMs) - .30) < 1e-9, 'fully out at the end of the strike');
  assert.equal(swingPoseProgress('cinder-pike', st, st.recoveryMs), 1);
  const g = overworld('pike', true); g.update(.008, once('attack'), 1000); assert.equal(g.player.attackVisual.weaponKind, 'cinder-pike'); assert.equal(g.player.attackVisual.primaryStep, 1);
});

// ---- the Iron Fists ----

test('fists: the contact delay is the same in the overworld and an interior, in Standard and Close View; nothing else changes', () => {
  const at: number[] = [];
  for (const make of [overworld, interior]) for (const cv of [false, true]) {
    const g = make('fists', cv), f = foe(g, 1.0, 0, 'f'); g.enemies = [f]; const px = g.player.x, py = g.player.y; let t = 100000, hit = -1;
    for (let k = 0; k < 40 && hit < 0; k++) { Object.assign(f, { x: px + 1, y: py }); g.player.x = px; g.player.y = py; g.save.lastAim = { x: 1, y: 0 }; const hp = f.hp; g.update(.016, k === 0 ? once('attack') : calm, t); if (f.hp < hp) hit = t - 100000; t += 16; }
    at.push(hit);
  }
  assert.deepEqual(at, [112, 112, 112, 112], 'the 90 ms contact (plus a frame) everywhere');
});

// ---- Standard View ----

test('Standard View draws each hand\'s blade from its own pivot; a one-hand cut shows the other dagger too; a thrust draws its shaft', () => {
  const strokes = (g: any) => { const q = swingIndicator(g, 0, {}); let n = 0; const ctx: any = new Proxy({}, { get: (o, k) => k === 'stroke' ? () => { n++; } : k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true; } }); drawSwingSweep(ctx, q, (x: number) => x * 32, (y: number) => y * 32, 32); return { q, n }; };
  const g = overworld('daggers', false); g.update(.008, once('attack'), 1000); for (let t = 1008; t < 1000 + DAG.steps[0].windupMs + 30; t += 8) g.update(.008, calm, t);
  const one = strokes(g); assert.equal(one.q.side, DAG.steps[0].side); assert.equal(one.q.pair, false); assert.ok(one.n >= 3, 'the trail, the cutting blade and the guard dagger');
  const p = overworld('pike', false); p.update(.008, once('attack'), 1000); for (let t = 1008; t < 1000 + PIKE.steps[0].windupMs + 40; t += 8) p.update(.008, calm, t);
  const th = strokes(p); assert.equal(th.q.thrust, true); assert.ok(th.q.reach > PIKE.steps[0].draw && th.n >= 2);
});

// ---- exact resume ----

test('exact resume: a dagger cut or a pike thrust saved mid-swing resumes where it stood and lands the same', () => {
  const play = (g: any, from: number, f: any, until: number, ahead: number) => { const hits: number[] = []; for (let t = from; t < until; t += 8) { const hp = f.hp; f.x = g.player.x + ahead; f.y = g.player.y; g.update(.008, calm, t); if (f.hp < hp) hits.push(t - from); } return hits; };
  for (const [weapon, ahead, cuts] of [['daggers', .8, [64, 136]], ['pike', 1.6, [120, 232]]] as const) for (const cut of cuts) {
    const g = interior(weapon, true), f = foe(g, ahead, 0, 'resume-foe'); g.enemies = [f]; g.update(.008, once('attack'), 100000);
    for (let t = 100008; t <= 100000 + cut; t += 8) { f.x = g.player.x + ahead; f.y = g.player.y; g.update(.008, calm, t); }
    const q = structuredClone(g.pendingMeleeContact); assert.equal(q.v, 3); assert.equal(q.weapon, weapon === 'daggers' ? 'fourfold-daggers' : 'cinder-pike');
    const back: any = new Game(deserializeSave(serializeSave(g.exportSnapshot(100000 + cut))), 500000); back.installSystems();
    const r = back.pendingMeleeContact; assert.equal(r.v, 3); assert.equal(r.weapon, q.weapon); assert.equal(r.elapsedMs, q.elapsedMs); assert.equal(r.step, q.step); assert.deepEqual(r.hits, q.hits); assert.equal(r.stopLeft, q.stopLeft); assert.equal(r.lunged, q.lunged);
    const bf = back.enemies.find((e: any) => e.id === f.id) || Object.assign(foe(back, ahead, 0, f.id), { hp: f.hp }); back.enemies = [bf];
    const a = play(g, 100008 + cut, f, 100008 + cut + 700, ahead), b = play(back, 500008, bf, 500008 + 700, ahead);
    assert.deepEqual(b, a, `${weapon} cut at ${cut} ms: the same hits on the same clock`); assert.equal(back.pendingMeleeContact, null);
  }
});
