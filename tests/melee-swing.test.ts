// Weighted Verge Cleaver swings (Tim, 2026-11-14; src/melee-swing.ts PRIMARY_SWINGS). Wind-up, a swept strike that hits only
// where the blade passes, follow-through and recovery; one clock and one hit in every area and in both views. Iron Fists keep
// their own timing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, mapWidth } from '../src/game.ts';
import { createCombatant, wayfarerDamage } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';
import { CLOSE_VIEW_MELEE_TIMING } from '../src/action-motion.ts';
import { PRIMARY_SWINGS, circleTouchesSector, normalizePendingSwing, sampleSwing, swingTimes } from '../src/melee-swing.ts';

const SPEC = PRIMARY_SWINGS['verge-cleaver'], STEPS = SPEC.steps;
const cleaver = (extra: any = {}) => ({ id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 5, property: 'impact', ...extra });
const mash = { state: { x: 0, y: 0 }, consume: (k: string) => k === 'attack', held: () => false, reset: () => {} };
const calm = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} };
const once = (key: string) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k: string) => k === key && !used && (used = true), held: () => false, reset: () => {} }; };
const open = (g: any) => { for (const t of g.map.tiles) { t.blocked = false; t.openAir = false; t.courtyard = false; t.pentRoof = false; t.pentBalcony = false; t.environment = false; if (t.kind === 'yardGrass' || t.kind === 'water' || t.kind === 'river') t.kind = 'flagFloor'; } g.map.objects = (g.map.objects || []).filter((o: any) => o.kind !== 'npc'); };
// The open world: a fresh journey on its overworld section, ground cleared. The interior: the Proving Ground's dungeon room.
function overworld(closeView: boolean) {
  const s = freshSave(); s.seed = 'SWING-TEST'; s.level = 10; s.closeView = closeView; s.activeWeaponSlot = 'primary'; s.equipment.primary = cleaver();
  const g: any = new Game(s, 0); g.paused = false; s.session.paused = false; g.rx = 4; g.ry = 4; g.loadArea('overworld', false); open(g); g.enemies = []; g.projectiles = [];
  Object.assign(g.player, { x: 15, y: 16, facing: 'right' }); s.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null; return g;
}
function interior(closeView: boolean) {
  const g: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game;
  g.save.closeView = closeView; g.save.activeWeaponSlot = 'primary'; g.save.equipment.primary = cleaver(); open(g); g.enemies = []; g.projectiles = [];
  g.save.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null; return g;
}
const foeAt = (g: any, deg: number, dist: number, id = `f${deg}`) => Object.assign(createCombatant('ashling', g.player.x + Math.cos(deg * Math.PI / 180) * dist, g.player.y + Math.sin(deg * Math.PI / 180) * dist), { id, hp: 1e6, maxHp: 1e6, damage: 0, cooldown: 99, speed: 0, speedMultiplier: 1e-6, meleePatterns: [] });
// Runs `ms` of frames; foes and the Wayfarer are held in place (so only the blade decides), and every hit is logged with the
// swing's own clock and step.
function fight(g: any, foes: any[], { ms = 2400, dt = 8, input = mash, pin = true, from = 100000 } = {}) {
  g.enemies = foes; const home = foes.map(f => ({ x: f.x, y: f.y })), px = g.player.x, py = g.player.y, log: any[] = [];
  let t = from;
  for (let i = 0; i * dt < ms; i++) {
    if (pin) { foes.forEach((f, k) => Object.assign(f, home[k], { hitStun: 0 })); g.player.x = px; g.player.y = py; g.save.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null; }
    g.player.invulnerableUntil = t + 1e6;
    const before = foes.map(f => f.hp); g.update(dt / 1000, input, t);
    foes.forEach((f, k) => { if (f.hp < before[k]) log.push({ id: f.id, at: t - from, step: g.pendingMeleeContact?.step, elapsed: g.pendingMeleeContact?.elapsedMs, dealt: before[k] - f.hp }); });
    t += dt;
  }
  return { log, end: t };
}
const ANGLES = [-60, -30, 0, 30, 60];

test('the swing table: Tim\'s approved timings, hit-stops, lunges and arcs, all in data', () => {
  assert.deepEqual(STEPS.map(s => [s.windupMs, s.holdMs, s.windupMs + s.activeMs, s.hitStopMs, s.followEndMs, s.chainMs, s.recoveryMs, s.lunge]),
    [[230, 50, 320, 60, 440, 440, 640, .35], [170, 0, 260, 60, 380, 400, 600, .25], [380, 80, 470, 110, 650, null, 950, .6]]);
  assert.deepEqual(STEPS.map(s => Math.sign(s.to - s.from)), [1, -1, 1], 'forehand from the sword side, backhand back across, finisher from the sword side');
  assert.equal(SPEC.bufferMs, 150); assert.ok(SPEC.bubble >= .45 && SPEC.bubble <= .5);
  assert.ok(Object.isFrozen(PRIMARY_SWINGS) && Object.isFrozen(SPEC) && STEPS.every(Object.isFrozen));
  // the pose moves from the press: the wind-up weight leaves zero at once and reaches full cock before the hold
  const s = sampleSwing(STEPS[0], 16); assert.ok(s.weight > 0 && s.phase === 'windup');
  assert.equal(sampleSwing(STEPS[0], 200).phase, 'hold'); assert.equal(sampleSwing(STEPS[0], 230).phase, 'active'); assert.equal(sampleSwing(STEPS[0], 330).phase, 'follow'); assert.equal(sampleSwing(STEPS[0], 650).phase, 'done');
});

test('circle against annular sector is exact: inside, radial gap, boundary segments, behind', () => {
  const r = (d: number) => d * Math.PI / 180;
  assert.equal(circleTouchesSector(1, 0, .1, 0, 0, .3, 1.5, r(-10), r(10)), true);
  assert.equal(circleTouchesSector(1, .5, .1, 0, 0, .3, 1.5, r(-10), r(10)), false, 'beside the sector');
  assert.equal(circleTouchesSector(1.55, 0, .1, 0, 0, .3, 1.5, r(-10), r(10)), true, 'just past the tip');
  assert.equal(circleTouchesSector(1.7, 0, .1, 0, 0, .3, 1.5, r(-10), r(10)), false, 'beyond the tip');
  assert.equal(circleTouchesSector(.15, 0, .1, 0, 0, .3, 1.5, r(-10), r(10)), false, 'inside the hilt');
  assert.equal(circleTouchesSector(-1, 0, .1, 0, 0, .3, 1.5, r(-90), r(90)), false, 'behind');
  assert.equal(circleTouchesSector(Math.cos(r(12)), Math.sin(r(12)), .1, 0, 0, .3, 1.5, r(-10), r(10)), true, 'touches the boundary edge');
  assert.equal(circleTouchesSector(Math.cos(r(10)), Math.sin(r(10)), .05, 0, 0, .3, 1.5, r(10), r(-10)), true, 'either direction');
});

test('hit timing: each foe is struck when the blade passes it, in step order and direction, the same in every area and both views', () => {
  const runs: any = {};
  for (const [area, make] of [['overworld', overworld], ['interior', interior]] as const) for (const cv of [false, true]) {
    const g = make(cv); if (area === 'interior') assert.equal(g.closeViewActionEligible(), cv, 'the interior is the old Close View delayed-contact room');
    const { log } = fight(g, ANGLES.map(a => foeAt(g, a, 1.2)), { ms: 2150 }); // one full combo: forehand, backhand, finisher
    runs[`${area}/${cv}`] = log.map(q => [q.id, q.step, q.elapsed]);
  }
  const all = Object.values(runs);
  for (const r of all) assert.deepEqual(r, all[0], 'identical in the overworld and the interior, Standard and Close View');
  const log = all[0] as any[];
  for (const step of [1, 2, 3]) {
    const hits = log.filter(q => q[1] === step), st = STEPS[step - 1], dir = Math.sign(st.to - st.from);
    assert.equal(hits.length, ANGLES.length, `step ${step} reaches every foe across the front once`);
    for (const [, , e] of hits) assert.ok(e >= st.windupMs && e <= st.windupMs + st.activeMs + 8, `step ${step}: hit at ${e} ms of its own clock, inside the active window`);
    const order = hits.map(q => Number(q[0].slice(1)));
    for (let i = 1; i < hits.length; i++) assert.ok(dir * (order[i] - order[i - 1]) > 0 || hits[i][2] === hits[i - 1][2], `step ${step} sweeps ${dir > 0 ? 'left to right' : 'right to left'}: ${order}`);
  }
  // nothing at the press, nothing before the strike window
  const g = overworld(false), foe = foeAt(g, 0, 1.2); g.enemies = [foe];
  g.update(.008, once('attack'), 1000); assert.equal(foe.hp, 1e6); assert.equal(g.pendingMeleeContact.v, 3);
  for (let t = 1008; t < 1000 + STEPS[0].windupMs; t += 8) { g.update(.008, calm, t); assert.equal(foe.hp, 1e6, `untouched at ${t - 1000} ms`); }
});

test('a foe behind the Wayfarer is hit only inside the body bubble, and is knocked off her', () => {
  for (const [dist, hit] of [[.3, true], [.9, false]] as const) {
    const g = overworld(false), foe = foeAt(g, 180, dist); g.enemies = [foe]; const hp = foe.hp;
    g.primaryAttack(1000, { x: 1, y: 0 }); for (let t = 1008; t < 1700; t += 8) g.update(.008, calm, t); // aimed ahead (no auto-aim at the foe behind)
    assert.equal(foe.hp < hp, hit, `behind at ${dist} tiles`);
  }
  const g = overworld(false), foe = foeAt(g, 180, .3), x0 = foe.x; g.enemies = [foe];
  g.primaryAttack(1000, { x: 1, y: 0 }); for (let t = 1008; t < 1700; t += 8) g.update(.008, calm, t);
  assert.ok(foe.x < x0 - .1, 'pushed off the Wayfarer');
  const h = overworld(false), top = foeAt(h, 0, .02), tx = top.x; h.enemies = [top]; h.primaryAttack(1000, { x: 1, y: 0 }); for (let t = 1008; t < 1700; t += 8) h.update(.008, calm, t);
  assert.ok(top.hp < 1e6 && top.x > tx + .05, 'right on top: hit, and knocked along the facing');
});

test('reach bonuses lengthen the blade', () => {
  for (const [reach, hit] of [[0, false], [.3, true]] as const) {
    const g = overworld(false); g.save.equipment.primary = cleaver(reach ? { affixes: [{ id: 'reach', value: reach }] } : {});
    const { log } = fight(g, [foeAt(g, 0, 2.15)], { ms: 700, input: once('attack') });
    assert.equal(log.length > 0, hit, `reach +${reach * 100}%`);
  }
});

test('each foe is struck once per swing, however finely the swing is ticked', () => {
  for (const dt of [2, 8, 33]) {
    const g = overworld(false), { log } = fight(g, [foeAt(g, 0, 1.2), foeAt(g, 0, .3, 'close')], { ms: 900, dt, input: once('attack') });
    assert.deepEqual(log.map(q => q.id).sort(), ['close', 'f0'], `dt ${dt}`);
  }
});

test('lunge: the full step on open ground, short of a foe in front, never through a wall or onto lethal ground', () => {
  { const g = overworld(false), x0 = g.player.x, y0 = g.player.y; g.update(.008, once('attack'), 1000); for (let t = 1008; t < 1800; t += 8) g.update(.008, calm, t);
    assert.ok(Math.abs(g.player.x - x0 - STEPS[0].lunge) < .02, `stepped ${g.player.x - x0}`); assert.ok(Math.abs(g.player.y - y0) < 1e-6); }
  { const g = overworld(false), x0 = g.player.x, foe = foeAt(g, 0, 1.0); g.enemies = [foe]; g.update(.008, once('attack'), 1000); for (let t = 1008; t < 1800; t += 8) { foe.x = x0 + 1; g.update(.008, calm, t); }
    assert.ok(g.player.x - x0 < STEPS[0].lunge - .05, 'stopped short of the foe'); assert.ok(x0 + 1 - g.player.x >= SPEC.lungeStop - .1); }
  for (const kind of ['wall', 'lava']) {
    const g = overworld(false), w = mapWidth(g.map, g.area); g.player.x = Math.floor(g.player.x) + .3; const wallX = Math.floor(g.player.x + .5) + 1, row = Math.floor(g.player.y + .72);
    for (let y = row - 2; y <= row + 2; y++) { const t = g.map.tiles[y * w + wallX]; if (kind === 'wall') t.blocked = true; else t.kind = 'lava'; }
    g.update(.008, once('attack'), 1000); for (let t = 1008; t < 1800; t += 8) g.update(.008, calm, t);
    assert.ok(g.player.x + .5 < wallX, `${kind}: the lunge stops at its edge (${g.player.x})`);
  }
});

test('hit-stop: the swing and the struck foe hold for the step\'s hit-stop, then the swing finishes; no other clock drifts', () => {
  const g = overworld(false), foe = foeAt(g, 0, 1.2); g.enemies = [foe];
  g.save.magicSkills.cooldowns['spell:test'] = 2;
  g.update(.004, once('attack'), 1000);
  let t = 1000, hitAt = -1, frozen = -1, stalled = 0;
  while (g.pendingMeleeContact && t < 3000) { t += 4; const hp = foe.hp, e = g.pendingMeleeContact.elapsedMs; g.update(.004, calm, t); if (hitAt < 0 && foe.hp < hp) { hitAt = t; frozen = g.pendingMeleeContact.elapsedMs; assert.ok(foe.hitStun >= STEPS[0].hitStopMs / 1000 - 1e-9, 'the foe holds too'); } else if (hitAt > 0 && g.pendingMeleeContact && g.pendingMeleeContact.elapsedMs === e) stalled += 4; }
  assert.ok(hitAt > 0 && frozen >= STEPS[0].windupMs);
  assert.ok(Math.abs(stalled - STEPS[0].hitStopMs) <= 4, `held ${stalled} ms`);
  assert.ok(Math.abs((t - 1000) - (STEPS[0].recoveryMs + STEPS[0].hitStopMs)) <= 8, `the swing ended after ${t - 1000} ms`);
  assert.ok(Math.abs(g.save.magicSkills.cooldowns['spell:test'] - (2 - (t - 1000) / 1000)) < .02, 'cooldowns run on through the hit-stop');
  // only once a swing, however many foes it meets
  const h = overworld(false), { log } = fight(h, ANGLES.map(a => foeAt(h, a, 1.2)), { ms: 1200, dt: 4, input: once('attack') });
  const span = log.at(-1).at - log[0].at; assert.ok(span <= STEPS[0].activeMs + STEPS[0].hitStopMs + 8, `one hit-stop for the whole swing (${span})`);
});

test('dodge, spell and tool presses cancel the swing at once, in any phase', () => {
  for (const phase of [100, 260, 500]) {
    const g = overworld(false), foe = foeAt(g, 0, 1.2); g.enemies = [foe]; g.player.stamina = g.save.maxStamina = 100;
    g.update(.008, once('attack'), 1000); for (let t = 1008; t < 1000 + phase; t += 8) { foe.x = g.player.x + 1.2; g.update(.008, calm, t); }
    const hp = foe.hp; g.update(.008, { ...once('dodge'), state: { x: 0, y: 1 } }, 1000 + phase);
    assert.equal(g.pendingMeleeContact, null, `dodge at ${phase} ms`);
    for (let t = 1008 + phase; t < 2000; t += 8) g.update(.008, calm, t);
    if (phase === 100) assert.equal(foe.hp, hp, 'a dodge in the wind-up: no hit');
  }
  { const g = overworld(false); g.update(.008, once('attack'), 1000); g.update(.008, calm, 1100); g.lastUpdateNow = 1100; g.save.magicSkills.cooldowns = {};
    assert.equal(g.castSpell(g.save.equippedSpell), true); assert.equal(g.pendingMeleeContact, null, 'a cast'); }
  { const g = overworld(false); g.save.equipment.secondary = { id: 'secondary-needle-caster', name: 'Needle Caster', slot: 'secondary', power: 5, property: 'quick' };
    g.update(.008, once('attack'), 1000); g.update(.008, calm, 1260); assert.equal(g.fireSecondary(1268, { x: 1, y: 0 }), true); assert.equal(g.pendingMeleeContact, null, 'a tool, mid-strike'); }
});

test('presses buffer about 150 ms before the chain point; earlier ones are let go; the finisher ends the combo', () => {
  const press = (g: any, at: number) => { g.update(.008, once('attack'), at); };
  { const g = overworld(false); press(g, 1000); for (let t = 1008; t < 1000 + 440 - 160; t += 8) g.update(.008, calm, t); press(g, 1000 + 440 - 160);
    for (let t = 1288; t < 1500; t += 8) g.update(.008, calm, t); assert.equal(g.pendingMeleeContact.step, 1, 'too early: let go'); }
  { const g = overworld(false); press(g, 1000); for (let t = 1008; t < 1000 + 440 - 140; t += 8) g.update(.008, calm, t); press(g, 1000 + 440 - 140);
    let started = 0; for (let t = 1308; t < 1600 && !started; t += 8) { g.update(.008, calm, t); if (g.pendingMeleeContact?.step === 2) started = t; }
    assert.ok(started >= 1440 && started <= 1448, `buffered into the chain point (${started})`); }
});

test('damage per second: within 10% of the old 420 ms instant swing, single target and pack', () => {
  // the plain hit: one share-1 strike of the same committed swing, through the real damage code
  const plain = (() => { const g = overworld(false), foe = foeAt(g, 0, 1.2); g.enemies = [foe]; g.update(.008, once('attack'), 1000); const q = g.pendingMeleeContact;
    g.primaryStrike(1001, q.aim, { committed: q.payload, swing: { kind: 'verge-cleaver', hits: [foe], bubble: [], share: 1, contact: false, aim: q.aim } }); return 1e6 - foe.hp; })();
  assert.ok(plain > 0);
  const old = plain * 1000 / 420;
  { const g = overworld(false), { log } = fight(g, [foeAt(g, 0, 1.2)], { ms: 12000, dt: 16 }); const dps = log.reduce((a, q) => a + q.dealt, 0) / 12;
    assert.ok(Math.abs(dps / old - 1) <= .1, `single ${dps.toFixed(1)} vs ${old.toFixed(1)}`); }
  { const g = overworld(false), { log } = fight(g, ANGLES.map(a => foeAt(g, a, 1.2)), { ms: 12000, dt: 16 }); const dps = log.reduce((a, q) => a + q.dealt, 0) / 12;
    assert.ok(Math.abs(dps / (old * ANGLES.length) - 1) <= .1, `pack ${dps.toFixed(1)} vs ${(old * ANGLES.length).toFixed(1)}`); }
  assert.equal(wayfarerDamage(10), 9, 'through the Wayfarer damage scale');
});

test('exact resume: a swing saved in its wind-up or its hit-stop resumes where it stood and lands the same', () => {
  const play = (g: any, from: number, foe: any, until: number) => { const hits: number[] = []; for (let t = from; t < until; t += 8) { const hp = foe.hp; foe.x = g.player.x + 1.2; foe.y = g.player.y; g.update(.008, calm, t); if (foe.hp < hp) hits.push(t - from); } return hits; };
  for (const cut of [120, 248]) {
    const g = interior(true), foe = foeAt(g, 0, 1.2); g.enemies = [foe]; g.update(.008, once('attack'), 100000);
    for (let t = 100008; t <= 100000 + cut; t += 8) { foe.x = g.player.x + 1.2; foe.y = g.player.y; g.update(.008, calm, t); }
    const q = structuredClone(g.pendingMeleeContact); assert.equal(q.v, 3);
    const save = deserializeSave(serializeSave(g.exportSnapshot(100000 + cut))), back: any = new Game(save, 500000); back.installSystems();
    const r = back.pendingMeleeContact; assert.equal(r.v, 3); assert.equal(r.elapsedMs, q.elapsedMs); assert.equal(r.stopLeft, q.stopLeft); assert.deepEqual(r.hits, q.hits); assert.equal(r.lunged, q.lunged); assert.equal(r.step, q.step);
    const bf = back.enemies.find((e: any) => e.id === foe.id) || Object.assign(foeAt(back, 0, 1.2, foe.id), { hp: foe.hp }); back.enemies = [bf];
    const a = play(g, 100008 + cut, foe, 100008 + cut + 900), b = play(back, 500008, bf, 500008 + 900);
    assert.deepEqual(b, a, `cut at ${cut}: the same hits on the same clock`); assert.equal(back.pendingMeleeContact, null); assert.equal(g.pendingMeleeContact, null);
  }
  // a pause holds the swing exactly
  { const g = overworld(false); g.update(.008, once('attack'), 1000); g.update(.008, calm, 1100); const e = g.pendingMeleeContact.elapsedMs; g.setPaused(true, 1100); g.setPaused(false, 9100); g.update(.008, calm, 9108); assert.equal(g.pendingMeleeContact.elapsedMs, e + 8); }
});

test('old pending records still load: a v1 Cleaver contact releases as before; a malformed v3 is dropped cleanly; a future one is kept', () => {
  const g = interior(true), foe = foeAt(g, 0, 1.2); g.enemies = [foe];
  const T = CLOSE_VIEW_MELEE_TIMING.cleaver;
  const v1 = { v: 1, id: 'melee-77', action: { v: 1, kind: 'verge-cleaver', move: 'cleaver', ...T }, area: g.area, areaId: g.areaId(), levelId: String(g.map?.levelId || 'root'), contactMs: T.contactMs, elapsedMs: 20, remainingMs: T.contactMs - 20, aim: { x: 1, y: 0 },
    payload: { kind: 'cleaver', profile: { range: 1.75, arc: 180, damage: 9, shape: 'arc' }, meleeBonus: 1, attackDamage: 0, imbue: 0, spellblade: false, boxing: null, awakened: false, primaryMotion: { v: 2, step: 1 }, support: 1 } };
  const snap = g.exportSnapshot(100000); snap.session.playerRuntime.pendingMeleeContact = v1;
  const back: any = new Game(deserializeSave(serializeSave(snap)), 200000); back.installSystems(); assert.equal(back.pendingMeleeContact.v, 1);
  const bf = foeAt(back, 0, 1.2, 'legacy'); back.enemies = [bf]; back.update(.016, calm, back.pendingMeleeContact.releaseAt); assert.ok(bf.hp < 1e6, 'the old contact lands'); assert.equal(back.pendingMeleeContact, null);
  const bad = g.exportSnapshot(100000); bad.session.playerRuntime.pendingMeleeContact = { v: 3, weapon: 'verge-cleaver', step: 9 };
  const dropped: any = new Game(deserializeSave(serializeSave(bad)), 200000); assert.equal(dropped.pendingMeleeContact, null);
  assert.equal(normalizePendingSwing({ v: 3, weapon: 'verge-cleaver', step: 1 }), null);
  const future = g.exportSnapshot(100000); future.session.playerRuntime.pendingMeleeContact = { v: 9, opaque: { kept: true } };
  const kept: any = new Game(deserializeSave(serializeSave(future)), 200000); assert.equal(kept.pendingMeleeContact, null);
  assert.deepEqual(kept.exportSnapshot(200001).session.playerRuntime.pendingMeleeContact, { v: 9, opaque: { kept: true } }, 'an unknown future record survives the save');
});

test('Iron Fists keep their timing (unchanged by the weighted swing)', () => {
  const first = (closeView: boolean) => {
    const g: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game; open(g);
    g.save.closeView = closeView; g.save.activeWeaponSlot = 'primary'; g.save.equipment.primary = { id: 'primary-iron-fists', name: 'Iron Fists', slot: 'primary', power: 5 }; g.save.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null;
    const foe = foeAt(g, 0, 1.2); g.enemies = [foe]; const px = g.player.x, py = g.player.y; let t = 100000, at = -1;
    for (let f = 0; f < 40 && at < 0; f++) { foe.x = px + 1.2; foe.y = py; g.player.x = px; g.player.y = py; g.save.lastAim = { x: 1, y: 0 }; const hp = foe.hp; g.update(.016, f === 0 ? once('attack') : calm, t); if (foe.hp < hp) at = t - 100000; t += 16; }
    return { at, pending: g.pendingMeleeContact };
  };
  assert.equal(first(false).at, 112, 'Standard View: the Close View contact delay (Tim 2026-11-14: "the delay timing everywhere"; was 16)');
  assert.equal(first(true).at, 112, 'Close View interior: as before');
  assert.equal(swingTimes(STEPS[0]).windEnd, 230);
});
