// The Iron Fists' training combo (Tim, 2026-11-13): right cross, left jab, right uppercut on one rhythm (a gate after every
// step), looping; awakened fists add the spinning roundhouse kick as a fourth step. Echo glyphs let more steps charge (two:
// every step, the kick too), every charge has a perfect window, Ki Blast's airborne uppercut is followed by the ground slam,
// and a dodge or a cast cancels any step or charge. Numbers: brawler-spells.ts IRON_FISTS, weapon-arts.ts AWAKENED_ARTS.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, GAME_NESTED_CLOCKS } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { IRON_FISTS, fistCharge, fistPerfect, drawBrawler } from '../src/brawler-spells.ts';
import { WEAPON_ARTS, AWAKENED_ARTS } from '../src/weapon-arts.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { snapshotSave, splitSnapshot, assembleSave } from '../src/persistence.ts';
import { CLOSE_VIEW_MELEE_TIMING, normalizeMeleeActionVisual, normalizePendingMeleeContact, normalizeAttackVisual } from '../src/action-motion.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const F = IRON_FISTS, K = AWAKENED_ARTS.moves.roundhouse, DT = .02, AWAKE = { resonance: 'wildfire', version: 1 };
const fists = () => ({ id: 'primary-if-test', name: 'Iron Fists', slot: 'primary', power: 10, property: 'brawler', tier: 'rare', affixes: [] });
function arena({ awakened = false, echoes = 0, ki = false, foes = [[1.2, 0]] } = {}) {
  const s = freshSave(); s.seed = 'FISTS-FOUR'; s.level = 15; s.equipment.primary = { ...fists(), ...(awakened ? { awakened: { ...AWAKE } } : {}) };
  s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = ki ? ['field:ki-blast'] : [];
  if (echoes) { s.equipment.primary = normalizeSockets(s.equipment.primary); s.glyphs.echo = echoes; for (let i = 0; i < echoes; i++) assert.equal(socketGlyph(s, 'melee', i, 'echo').ok, true); }
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([fx, fy, extra], i) => Object.assign(createCombatant('ashling', 10 + fx, 10 + fy), { id: `foe-${i}`, hp: 1e7, maxHp: 1e7, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] }, extra || {}));
  return { s, g, clock: { t: 1000 } };
}
// One frame; `keys` held this frame, `pressed` consumed once.
function frame(g, clock, { held = [], pressed = [] } = {}) {
  g.player.invulnerableUntil = clock.t + 1e6; const used = new Set();
  g.update(DT, { state: { x: 0, y: 0 }, consume: (k) => pressed.includes(k) && !used.has(k) && (used.add(k), true), held: (k) => held.includes(k) }, clock.t); clock.t += DT * 1000;
}
const idle = (g, clock, n) => { for (let i = 0; i < n; i++) frame(g, clock); };
const tap = (g, clock) => frame(g, clock, { pressed: ['attack'] });
const step = (g, clock) => { tap(g, clock); idle(g, clock, 12); }; // a press, then past the gate
const hold = (g, clock, seconds) => { frame(g, clock, { pressed: ['attack'], held: ['attack'] }); for (let i = 0; i < Math.round(seconds / DT); i++) frame(g, clock, { held: ['attack'] }); frame(g, clock); };
const keep = (g) => g.enemies.forEach((e, i) => { e.x = g.player.x + [1.2, -1.2, 0][i % 3]; e.y = g.player.y + [0, 0, 1.2][i % 3]; });
const lost = (g, i = 0) => 1e7 - g.enemies[i].hp;

test('the chain: cross, jab, uppercut looping unawakened; awakened the roundhouse kick is the fourth step; every cross is the right hand', () => {
  for (const awakened of [false, true]) {
    const { g, clock } = arena({ awakened }), seen = [];
    for (let i = 0; i < 9; i++) { step(g, clock); keep(g); seen.push(g.fistCombo.step); assert.equal(g.player.attackVisual.fistLead, 'right'); }
    assert.deepEqual(seen, awakened ? [1, 2, 3, 4, 1, 2, 3, 4, 1] : [1, 2, 3, 1, 2, 3, 1, 2, 3]);
    assert.equal(g.fistSteps(), awakened ? 4 : 3);
  }
  const { g, clock } = arena({ awakened: true }); for (let i = 0; i < 4; i++) step(g, clock);
  assert.equal(g.player.attackVisual.fistStep, 4); assert.equal(g.player.attackVisual.awakenedArt, 'roundhouse'); assert.match(g.message, /Roundhouse/);
});

test('one rhythm: every step, the kick included, is followed by the same gate; a press near its end waits for it, an earlier one is dropped', () => {
  assert.ok(F.gate >= .15 && F.gate <= .3, 'a slight gate, still rapid'); assert.equal(F.recover, undefined, 'no separate post-combo recovery');
  const { g, clock } = arena({ awakened: true }), at = [];
  for (let i = 0; i < 8; i++) { tap(g, clock); frame(g, clock); at.push(g.fistRecoverUntil - g.fistCombo.until); assert.ok(Math.abs(at.at(-1) - (F.gate - F.window) * 1000) < 1e-6, `step ${i + 1}: the same gate`); idle(g, clock, 11); }
  // inside the gate: refused; in its last `buffer` s: thrown as it opens
  const t0 = clock.t; tap(g, clock); frame(g, clock); const gate = g.fistRecoverUntil; assert.equal(g.fistPress(t0 + 40, { x: 1, y: 0 }), false); assert.equal(g.fistQueued, null, 'too early: dropped'); idle(g, clock, 6); /* 2026-11-14: the fists' contact delay runs in every area */
  const step0 = g.fistCombo.step; assert.equal(g.fistPress(gate - F.buffer * 1000 + 5, { x: 1, y: 0 }), false); assert.ok(g.fistQueued, 'near the end: waiting');
  clock.t = gate - F.buffer * 1000 + 10; while (clock.t < gate) frame(g, clock); frame(g, clock);
  assert.equal(g.fistQueued, null); assert.equal(g.fistCombo.step, step0 % 4 + 1, 'thrown as the gate opened');
  // the window lapses: the next press starts again at the cross, with no extra recovery
  idle(g, clock, Math.ceil(F.window / DT) + 2); assert.equal(g.fistNextStep(clock.t), 1); assert.ok(g.fistRecoverUntil < clock.t); tap(g, clock); frame(g, clock); assert.equal(g.fistCombo.step, 1);
});

test('the kick is never weaker than a punch; it strikes all round and staggers without knocking, anchored foes included', () => {
  assert.ok(K.share >= Math.max(...F.punches.map((p) => p.share)), 'at least the uppercut');
  const { g, clock } = arena({ awakened: true, foes: [[1.2, 0], [-1.2, 0, { boss: true }], [0, 1.2, { eliteId: 'x' }], [3.5, 0]] });
  for (let i = 0; i < 3; i++) { step(g, clock); keep(g); g.enemies[3].x = g.player.x + 3.5; g.enemies[3].y = g.player.y; }
  const hp = g.enemies.map((e) => e.hp), pos = g.enemies.map((e) => [e.x, e.y]); tap(g, clock); idle(g, clock, 6); /* 2026-11-14: the fists' contact delay runs in every area */
  for (const i of [0, 1, 2]) { assert.ok(g.enemies[i].hp < hp[i], `foe ${i} struck`); assert.ok(Math.hypot(g.enemies[i].x - pos[i][0], g.enemies[i].y - pos[i][1]) < 1e-6, `foe ${i} not knocked`); }
  assert.equal(g.enemies[3].hp, hp[3], 'outside the radius');
  // measured against the cross on the same foe: the kick hits harder than the plain cross and the jab
  const one = arena({ awakened: true }); step(one.g, one.clock); const cross = lost(one.g); step(one.g, one.clock); const jab = lost(one.g) - cross; step(one.g, one.clock); const upper = lost(one.g) - cross - jab; step(one.g, one.clock); const kick = lost(one.g) - cross - jab - upper;
  assert.ok(kick >= cross && kick >= jab, `kick ${kick} vs cross ${cross}, jab ${jab}, uppercut ${upper}`);
});

test('Echo glyphs: none, the cross charges; one, the jab too; two, every step, the kick included', () => {
  for (const [echoes, want] of [[0, [true, false, false, false]], [1, [true, true, false, false]], [2, [true, true, true, true]]]) {
    const { g, clock } = arena({ awakened: true, echoes }), got = [];
    for (let s = 1; s <= 4; s++) { frame(g, clock, { pressed: ['attack'], held: ['attack'] }); got.push(!!g.fistCharge && g.fistCharge.step === s); frame(g, clock); idle(g, clock, 12); assert.equal(g.fistCombo.step, s); }
    assert.deepEqual(got, want, `${echoes} Echo`);
  }
  const { g } = arena({ awakened: false, echoes: 2 }); assert.equal(g.fistChargeable(4), true); g.save.equipment.primary.awakened = undefined; assert.equal(g.fistSteps(), 3, 'unawakened: no fourth step to charge');
});

test('every charge has a perfect window: a release inside it beats a longer, full one; longer is stronger up to the cap', () => {
  assert.equal(fistPerfect(F.tapGrace + F.perfect[0] - .01), false); assert.equal(fistPerfect(F.tapGrace + (F.perfect[0] + F.perfect[1]) / 2), true); assert.equal(fistPerfect(F.tapGrace + F.perfect[1] + .01), false);
  assert.ok(F.perfectShare > 1); assert.ok(fistCharge(F.tapGrace + .3) < fistCharge(F.tapGrace + .9));
  const dealt = (seconds, s = 1) => { const { g, clock } = arena({ awakened: true, echoes: 2 }); for (let i = 1; i < s; i++) step(g, clock); const before = lost(g); keep(g); hold(g, clock, seconds); idle(g, clock, 6); /* 2026-11-14: the fists' contact delay runs in every area */ return { amount: lost(g) - before, msg: g.message, perfect: g.player.attackVisual.fistPerfect === true }; };
  for (const s of [1, 4]) {
    const short = dealt(.4, s), perfect = dealt(F.tapGrace + (F.perfect[0] + F.perfect[1]) / 2, s), late = dealt(F.tapGrace + 1.6, s); // 2026-11-14: the window's middle (it moved with the shorter charge)
    assert.ok(short.amount < late.amount, `step ${s}: longer is stronger`); assert.ok(perfect.amount > late.amount, `step ${s}: the perfect window is strongest`);
    assert.equal(perfect.perfect, true); assert.match(perfect.msg, /Perfect/); assert.equal(late.perfect, false);
  }
});

test('Ki Blast: the airborne uppercut is followed by the ground slam in the kick\'s place, then the cross; landed first, the kick (awakened) or the cross', () => {
  const setUp = (awakened) => { const a = arena({ awakened, ki: true, foes: [[1, .2]] }); const { g, clock } = a; for (let i = 0; i < 3; i++) { tap(g, clock); idle(g, clock, 40); }
    idle(g, clock, 40); step(g, clock); step(g, clock); assert.equal(g.fistNextStep(clock.t), 3); hold(g, clock, WEAPON_ARTS.hold.grace + 1.15); return a; };
  for (const awakened of [true, false]) {
    { const { g, clock } = setUp(awakened); idle(g, clock, 5); /* 2026-11-14: the fists' contact delay runs in every area */ assert.ok(clock.t < g.jumpUntil, 'popped up'); assert.equal(g.fistCombo.step, 3);
      tap(g, clock); assert.ok(g.plunge?.kiSlam, 'the press in the air is the slam'); assert.equal(g.player.attackVisual.awakenedArt, 'axe-kick');
      const before = lost(g); idle(g, clock, 30); assert.ok(lost(g) > before, 'it lands'); assert.equal(g.fistNextStep(clock.t), 1, 'then the chain starts again at the cross');
      tap(g, clock); frame(g, clock); assert.equal(g.fistCombo.step, 1); }
    { const { g, clock } = setUp(awakened); while (clock.t < g.jumpUntil) frame(g, clock); frame(g, clock); assert.equal(g.kiSlamReady(clock.t), false, 'landed');
      assert.ok(clock.t <= g.fistCombo.until, 'the leap (JUMP.base) lands inside the combo window');
      tap(g, clock); frame(g, clock); assert.ok(!g.plunge); assert.equal(g.fistCombo.step, awakened ? 4 : 1, awakened ? 'grounded: the kick' : 'grounded: the cross'); }
  }
  // a Ki Blast released on another step stays on the ground and the chain goes on
  const { g, clock } = arena({ ki: true, foes: [[3, 0]] }); for (let i = 0; i < 3; i++) { tap(g, clock); idle(g, clock, 40); } idle(g, clock, 40);
  hold(g, clock, WEAPON_ARTS.hold.grace + 1.15); assert.ok(!(clock.t < g.jumpUntil), 'grounded'); assert.equal(g.fistCombo.step, 1); idle(g, clock, 12); tap(g, clock); assert.equal(g.fistCombo.step, 2);
});

test('a dodge or a cast cancels any step or charge, a waiting press too, and the chain starts again at the cross', () => {
  for (const how of ['dodge', 'cast']) {
    const { g, clock } = arena({ awakened: true, echoes: 2 }); g.player.stamina = 100;
    step(g, clock); frame(g, clock, { pressed: ['attack'], held: ['attack'] }); assert.ok(g.fistCharge, 'charging the jab');
    if (how === 'dodge') frame(g, clock, { pressed: ['dodge'], held: ['attack'] }); else { g.lastUpdateNow = clock.t; assert.ok(g.castSpell(g.save.equippedSpell)); }
    assert.equal(g.fistCharge, null, `${how}: the charge is gone`); assert.equal(g.fistCombo, null, `${how}: the chain resets`);
    const record = g.player.attackVisual; idle(g, clock, 20); assert.equal(g.player.attackVisual, record, `${how}: nothing is thrown on the let-go`); assert.equal(g.fistCombo, null);
    tap(g, clock); frame(g, clock); assert.equal(g.fistCombo.step, 1);
  }
  // a dodge drops a waiting press and a Close View step not yet in contact
  const { g, clock } = arena(); g.player.stamina = 100; tap(g, clock); frame(g, clock); idle(g, clock, 6); /* 2026-11-14: the fists' contact delay runs in every area */ g.fistPress(g.fistRecoverUntil - 20, { x: 1, y: 0 }); assert.ok(g.fistQueued);
  frame(g, clock, { pressed: ['dodge'] }); assert.equal(g.fistQueued, null);
});

test('Shadow Boxing and the Shadow Clone work with every step, the kick included', () => {
  const { g, clock } = arena({ awakened: true }); g.boxingUntil = 1e12; g.shadowClone = { x: 11, y: 10, until: 1e12, boxing: true }; let swings = 0; const own = g.cloneSwing.bind(g); g.cloneSwing = (...a) => { swings++; return own(...a); };
  for (let i = 0; i < 4; i++) { step(g, clock); keep(g); } assert.equal(swings, 4, 'the clone swings with each of the four');
  const kick = g.effects.find((e) => e.kind === 'fist-kick') || null; assert.ok(!kick || kick.healShare > 0, 'boxing heals from the kick');
});

test('runtime only: a reload drops the chain, the waiting press and the slam; the gate resumes; pause shifts the window', () => {
  assert.deepEqual(GAME_NESTED_CLOCKS.fistCombo, ['until']); assert.deepEqual(GAME_NESTED_CLOCKS.fistQueued, ['until']);
  const { s, g, clock } = arena({ awakened: true }); step(g, clock); step(g, clock); tap(g, clock); g.fistPress(g.fistRecoverUntil - 30, { x: 1, y: 0 }); g.kiSlam = true;
  const until = g.fistCombo.until; g.setPaused(true, clock.t); g.setPaused(false, clock.t + 5000); assert.equal(g.fistCombo.until, until + 5000, 'pause shifts the window');
  const save = assembleSave(...Object.values(splitSnapshot(snapshotSave(s)))), back = new Game(save, clock.t), text = JSON.stringify(save);
  assert.equal(save.version, 14); for (const k of ['fistCombo', 'fistQueued', 'kiSlam']) { assert.ok(!back[k], k); assert.equal(text.includes(`"${k}"`), false); }
  back.lastUpdateNow = clock.t; assert.equal(back.fistNextStep(clock.t), 1, 'after a reload the chain starts at the cross');
});

test('Close View: the kick is a delayed contact with its own descriptor; saved pending kicks and legacy punch timings validate', () => {
  for (const m of ['dash', 'jab', 'uppercut', 'kick']) { assert.equal(CLOSE_VIEW_MELEE_TIMING[m].durationMs, CLOSE_VIEW_MELEE_TIMING.dash.durationMs, 'one rhythm'); assert.ok(normalizeMeleeActionVisual({ v: 1, kind: 'iron-fists', move: m, ...CLOSE_VIEW_MELEE_TIMING[m] })); }
  assert.ok(normalizeMeleeActionVisual({ v: 1, kind: 'iron-fists', move: 'uppercut', durationMs: 380, contactMs: 72 }), 'a legacy record still resumes');
  assert.ok(normalizeMeleeActionVisual({ v: 1, kind: 'iron-fists', move: 'dash', durationMs: 320, contactMs: 60 }));
  const g = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game;
  g.save.closeView = true; g.save.activeWeaponSlot = 'primary'; g.save.equipment.primary = { ...fists(), awakened: { ...AWAKE } }; g.save.lastAim = { x: 1, y: 0 };
  for (const t of g.map.tiles) { t.blocked = false; t.openAir = false; t.courtyard = false; t.pentRoof = false; t.pentBalcony = false; if (t.kind === 'yardGrass') t.kind = 'flagFloor'; }
  g.enemies = [Object.assign(createCombatant('rootBrute', g.player.x + 1, g.player.y), { id: 'kick-foe', hp: 1e6, maxHp: 1e6, damage: 0, cooldown: 99 })];
  g.fistCombo = { step: 3, until: 100500, landed: [true, true, true], lead: 'right' }; g._fistInputUpdate = true; assert.equal(g.fistPunch(4, 0, 100000, { x: 1, y: 0 }), true); g._fistInputUpdate = false;
  const q = g.pendingMeleeContact; assert.equal(q?.action.move, 'kick'); assert.equal(normalizeAttackVisual(structuredClone(g.player.attackVisual), 100)?.fistStep, 4, 'the kick\'s record validates'); assert.equal(q.payload.effect.kind, 'fist-kick');
  const back = normalizePendingMeleeContact({ ...structuredClone(q), elapsedMs: 10, remainingMs: q.contactMs - 10 }); assert.equal(back?.payload.step, 4);
  const hp = g.enemies[0].hp; g.update(.016, { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} }, q.releaseAt); assert.equal(g.pendingMeleeContact, null); idle(g, { t: q.releaseAt + 16 }, 2); assert.ok(g.enemies[0].hp < hp, 'the kick lands at contact');
});

test('standard view draws the hand of each step and the kick\'s sweep without allocation surprises', () => {
  const calls = { arc: 0 }, ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : k === 'arc' ? () => calls.arc++ : () => {}, set: (o, k, v) => { o[k] = v; return true; } });
  const { g, clock } = arena({ awakened: true });
  for (let i = 0; i < 4; i++) { step(g, clock); g.lastUpdateNow = clock.t - 220; drawBrawler(ctx, g, (q) => [q.x * 32, q.y * 32], 32, clock.t / 1000); }
  g.fistCharge = { action: 'attack', start: clock.t - 1000, direction: null, step: 1 }; g.lastUpdateNow = clock.t + 200; drawBrawler(ctx, g, (q) => [q.x * 32, q.y * 32], 32, 1); assert.ok(calls.arc > 0);
});

test('soak: a minute of random presses, holds, dodges, casts and jumps with every option on leaves no stuck state', () => {
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (const opts of [{ awakened: true, echoes: 2, ki: true }, { echoes: 1 }]) {
    const { g, clock } = arena({ ...opts, foes: [[1.2, 0], [-1.2, 0], [0, 1.2]] }); let holding = 0;
    for (let i = 0; i < 60 / DT; i++) {
      g.player.stamina = 100; g.player.hp = Math.max(g.player.hp, 1); keep(g); for (const e of g.enemies) { e.hp = 1e7; e.dead = false; }
      const r = rnd(), pressed = [], held = [];
      if (holding > 0) { holding--; held.push('attack'); } else if (r < .25) { pressed.push('attack'); if (rnd() < .3) { holding = Math.floor(rnd() * 90); held.push('attack'); } }
      else if (r < .27) pressed.push('dodge'); else if (r < .28) pressed.push('jump'); else if (r < .285) { g.lastUpdateNow = clock.t; g.castSpell(g.save.equippedSpell); }
      frame(g, clock, { pressed, held });
      if (g.fistCharge) assert.ok(clock.t - g.fistCharge.start <= (F.tapGrace + F.chargeTime + 1) * 1000 + 2 * DT * 1000, 'a charge never outlives its cap');
      if (g.fistQueued) assert.ok(g.fistQueued.until - clock.t <= (F.gate + F.buffer) * 1000 + 200, 'a waiting press expires');
      if (g.fistCombo) assert.ok(g.fistCombo.step >= 1 && g.fistCombo.step <= g.fistSteps());
      assert.ok(Number.isFinite(g.player.x) && Number.isFinite(g.player.y));
    }
    idle(g, clock, 200); assert.equal(g.fistCharge, null); assert.equal(g.fistQueued, null); assert.equal(g.plunge, null); assert.equal(g.fistNextStep(clock.t), 1);
    assert.ok(g.effects.length < 60, `effects bounded (${g.effects.length})`); tap(g, clock); assert.ok(g.fistCombo?.step === 1 || g.fistCharge, 'still responsive');
  }
});

// r945 review notes (2026-11-13): the slam belongs to the Ki Blast's own leap; and a kick released after the awakening is gone
// is thrown as a plain cross, with the cross's effect and pose.
test('Ki Blast slam: leap, land, jump again with no press between, and the next airborne press is an ordinary plunge', () => {
  const { g, clock } = arena({ ki: true, foes: [[1, .2]] }); for (let i = 0; i < 3; i++) { tap(g, clock); idle(g, clock, 40); }
  idle(g, clock, 40); step(g, clock); step(g, clock); hold(g, clock, WEAPON_ARTS.hold.grace + 1.15); assert.ok(clock.t < g.jumpUntil, 'popped up by the blast');
  while (clock.t < g.jumpUntil) frame(g, clock); idle(g, clock, 3);
  frame(g, clock, { pressed: ['jump'] }); assert.ok(clock.t < g.jumpUntil, 'a new jump'); assert.equal(g.kiSlamReady(clock.t), false, 'not the leap the slam belonged to');
});
test('a held kick released after the awakening is gone is thrown as a plain cross (its effect, not the kick\'s)', () => {
  const { g, clock } = arena({ awakened: true }); g.fistPunch(4, 0, clock.t, { x: 1, y: 0 });
  assert.equal(g.player.attackVisual?.fistStep, 4); g.fistCombo = null; idle(g, clock, 30);
  delete g.save.equipment.primary.awakened; const n = g.effects.length; g.fistPunch(4, 0, clock.t, { x: 1, y: 0 });
  const e = g.effects.slice(n).find((q) => /^fist/.test(q.kind || '')) || g.effects[g.effects.length - 1];
  assert.notEqual(e?.kind, 'fist-kick', 'a cross, not a kick'); assert.notEqual(g.player.attackVisual?.fistStep, 4);
});
test('Ki Blast slam survives a pause mid-leap (r946 review): kiSlamJump shifts with jumpStart', () => {
  const { g, clock } = arena({ ki: true, foes: [[1, .2]] }); for (let i = 0; i < 3; i++) { tap(g, clock); idle(g, clock, 40); }
  idle(g, clock, 40); step(g, clock); step(g, clock); hold(g, clock, WEAPON_ARTS.hold.grace + 1.15); assert.ok(clock.t < g.jumpUntil, 'popped up by the blast');
  g.setPaused(true, clock.t); clock.t += 5000; g.setPaused(false, clock.t);
  idle(g, clock, 5); /* 2026-11-14: the fists' contact delay runs in every area */ assert.equal(g.kiSlamReady(clock.t), true, 'still the same leap after the pause'); tap(g, clock); assert.ok(g.plunge?.kiSlam, 'the press is the slam');
});
