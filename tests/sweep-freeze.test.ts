// Tim, 2026-11-14: the awakened Great Sweep freezes whatever its blade touches (the spun blade, and with Mirage of Blades the
// thrown blades too); it works on bosses through a buildup meter with diminishing returns and an immunity window after each
// freeze, so nothing can be held frozen (great-sweep.ts SWEEP_FREEZE; game.ts sweepFreezeHit / tickSweepFreezes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { normalizeItemUpgrade } from '../src/items.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { BRAWLER } from '../src/brawler-spells.ts';
import { MIRAGE } from '../src/tool-forms.ts';
import { SWEEP_FREEZE, sweepFreezeTouch, tickSweepFreeze, sweepFrozen, sweepTimes, normalizeToolSwing } from '../src/great-sweep.ts';
import { awakenedText } from '../src/constellation.ts';

const SWEEP = { id: 'secondary-great-sweep', name: 'Great Sweep', slot: 'secondary', power: 12, tier: 'rare', property: 'brawler' };
const AWAKE = { resonance: 'inferno', version: 1 };
const calm = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} };
const tool = { state: { x: 0, y: 0 }, consume: (k: string) => k === 'tool', held: () => false, reset: () => {} };
const once = (key: string) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k: string) => k === key && !used && (used = true), held: () => false, reset: () => {} }; };

function arena(passives: string[] = [], awakened = true) {
  const s: any = freshSave(); s.seed = 'SWEEP-FREEZE'; s.level = 20; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = passives.map((id) => `field:${id}`);
  s.equipment.secondary = passives.length ? normalizeItemUpgrade({ ...SWEEP, tier: 'relic', affixes: [] }) : structuredClone(SWEEP); s.activeWeaponSlot = 'primary';
  if (awakened) s.equipment.secondary.awakened = { ...AWAKE };
  const g: any = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; g.paused = false; s.session.paused = false; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = []; g.projectiles = []; g.effects = [];
  return { s, g };
}
const foeAt = (g: any, deg: number, dist: number, id = `f${deg}`, extra: any = {}) => Object.assign(createCombatant('ashling', g.player.x + Math.cos(deg * Math.PI / 180) * dist, g.player.y + Math.sin(deg * Math.PI / 180) * dist), { id, hp: 1e6, maxHp: 1e6, damage: 0, cooldown: 1e9, meleePatterns: [] }, extra);
// Frames with the Wayfarer pinned (foes pinned too unless `free`); calls `each` after every frame.
function play(g: any, foes: any[], from: number, ms: number, input: any = calm, dt = 8, each: (t: number) => void = () => {}, free = false) {
  const home = foes.map((f) => [f.x, f.y]), px = g.player.x, py = g.player.y; let t = from;
  for (let i = 0; i * dt < ms; i++) {
    if (!free) foes.forEach((f, k) => { f.x = home[k][0]; f.y = home[k][1]; f.hitStun = 0; f.hp = f.maxHp; });
    g.player.x = px; g.player.y = py; g.player.invulnerableUntil = t + 1e6; g.player.hp = 1e6;
    g.update(dt / 1000, i === 0 ? input : (input === tool ? tool : calm), t); each(t); t += dt;
  }
  return t;
}

test('the freeze is data: frozen tables, a boss takes many touches, an ordinary foe one; the awakened text says so', () => {
  assert.ok(Object.isFrozen(SWEEP_FREEZE) && Object.isFrozen(SWEEP_FREEZE.classes.boss) && Object.isFrozen(SWEEP_FREEZE.classes.boss.need));
  const C = SWEEP_FREEZE.classes;
  assert.ok(C.ordinary.need[0] <= SWEEP_FREEZE.touch.mirage && C.ordinary.need[0] <= SWEEP_FREEZE.touch.blade, 'one touch freezes an ordinary foe');
  for (const k of ['ordinary', 'elite', 'boss'] as const) { const r = C[k];
    for (let i = 1; i < r.need.length; i++) { assert.ok(r.need[i] >= r.need[i - 1]); assert.ok(r.hold[i] <= r.hold[i - 1]); }
    assert.ok(r.guard > 0 && r.hold.every((h) => h > 0)); }
  assert.ok(C.boss.need[0] >= 5 && C.elite.need[0] > C.ordinary.need[0] && C.boss.guard > C.elite.guard);
  const item = { ...SWEEP, awakened: AWAKE }; assert.match(awakenedText(item), /freezes/); assert.doesNotMatch(awakenedText(item), /fans/);
  assert.match(awakenedText({ id: 'secondary-rift-bombard', name: 'Rift Bombard', slot: 'secondary', power: 9, awakened: AWAKE }), /fans into three/, 'other tools unchanged');
});

test('an awakened sweep freezes the ordinary foes its blade touches, in sweep order, and no foe out of its reach', () => {
  const { g } = arena(), tip = BRAWLER['great-sweep'].radius;
  const start = foeAt(g, 90, 1.6, 'start'), late = foeAt(g, 270, 1.6, 'late'), far = foeAt(g, 0, tip + 1.2, 'far'), walled = foeAt(g, 180, 1.8, 'walled');
  g.map.tiles[10 * 32 + 9].blocked = true; g.map.tiles[10 * 32 + 8].blocked = true; // a wall between him and `walled`
  const foes = [start, late, far, walled]; g.enemies = foes.slice();
  const T = sweepTimes(1, {}); let startFirst = false;
  play(g, foes, 1000, 700, once('tool'), 8, () => { if (sweepFrozen(start) && !sweepFrozen(late)) startFirst = true; });
  assert.equal(g.toolSwing?.freeze, true);
  assert.ok(startFirst, 'the foe where the turn starts freezes before the one the blade has not reached yet');
  assert.ok(sweepFrozen(start) && sweepFrozen(late), 'both foes the blade crossed are frozen');
  assert.equal(far.sweepFreeze, undefined, 'past the tip: untouched'); assert.equal(walled.sweepFreeze, undefined, 'behind a wall: untouched');
  assert.ok(T.activeEnd < 700);
});

test('a frozen foe neither moves nor attacks; it thaws after its hold and walks on', () => {
  const { g } = arena(), foe = Object.assign(createCombatant('ashling', 11.2, 10), { id: 'walker', hp: 1e6, maxHp: 1e6, damage: 5, meleePatterns: [] }); g.enemies = [foe];
  g.player.x = 10; g.player.y = 10;
  let t = play(g, [foe], 1000, 600, once('tool'), 8, () => {}, true);
  assert.ok(sweepFrozen(foe)); const x = foe.x, y = foe.y, hp = g.player.hp, hold = foe.sweepFreeze.left;
  // the Wayfarer steps away; the frozen foe stays put and strikes nothing
  g.player.x = 4; g.player.y = 4; let hits = 0;
  for (let i = 0; i < Math.floor((hold - .05) * 1000 / 8); i++) { const before = g.player.hp; g.update(.008, calm, t); t += 8; if (g.player.hp < before) hits++; assert.equal(foe.x, x); assert.equal(foe.y, y); }
  assert.equal(hits, 0); assert.ok(g.player.hp >= hp - 1e-9);
  for (let i = 0; i < 400; i++) { g.update(.008, calm, t); t += 8; }
  assert.ok(!sweepFrozen(foe), 'thawed'); assert.ok(Math.hypot(foe.x - x, foe.y - y) > .2, 'it moves again');
  // a pack beast (its own brain, monster-pack.ts) as a world beast: held just the same once its meter fills
  for (const kind of ['briarStag', 'crimsonTyrant', 'ashenMoth']) {
    const { g: w } = arena(), beast = Object.assign(createCombatant(kind, 13, 10, true), { id: `beast-${kind}`, worldBeast: kind, hp: 1e6, maxHp: 1e6 }); w.enemies = [beast]; w.player.x = 10; w.player.y = 10;
    let tw = 1000; for (let i = 0; i < 30; i++) { w.update(.016, calm, tw); tw += 16; }
    for (let i = 0; i < SWEEP_FREEZE.classes.boss.need[0]; i++) w.sweepFreezeHit(beast, 1);
    assert.ok(sweepFrozen(beast), kind); const bx = beast.x, by = beast.y;
    for (let i = 0; i < 90; i++) { w.player.hp = 1e6; w.update(.016, calm, tw); tw += 16; assert.equal(beast.x, bx, kind); assert.equal(beast.y, by, kind); }
    for (let i = 0; i < 400; i++) { w.player.hp = 1e6; w.update(.016, calm, tw); tw += 16; } assert.ok(!sweepFrozen(beast) && beast.sweepFreeze.guard >= 0, `${kind} thaws`);
  }
});

test('without the awakening the sweep freezes nothing (blade or Mirage blades)', () => {
  for (const passives of [[], ['nanoknives']]) {
    const { g } = arena(passives, false), foes = [foeAt(g, 0, 1.4, 'a'), foeAt(g, 180, 1.4, 'b'), foeAt(g, 0, 4, 'c')]; g.enemies = foes.slice();
    play(g, foes, 1000, 3000, tool, 16);
    assert.ok(foes.every((f) => f.sweepFreeze === undefined && !sweepFrozen(f)), passives.join() || 'blade');
  }
  // an awakened Rift Bombard is unchanged (it fans its shots; no freeze)
  const { g } = arena(); g.save.equipment.secondary = { id: 'secondary-rift-bombard', name: 'Rift Bombard', slot: 'secondary', power: 9, tier: 'rare', awakened: AWAKE }; assert.equal(g.sweepAwakened(), false);
});

test('with Mirage of Blades the thrown blades freeze at range; the draw-only spin freezes nothing', () => {
  const { g } = arena(['nanoknives']), near = foeAt(g, 180, 1.3, 'near'), ahead = foeAt(g, 0, 4, 'ahead'); g.enemies = [near, ahead]; g.targetId = 'ahead'; // the blade is thrown at the locked foe
  g.update(.008, once('tool'), 1000);
  assert.equal(g.toolSwing?.mirage, true); assert.equal(g.toolSwing.freeze, false, 'the spin is drawn only');
  const blades = g.projectiles.filter((p: any) => p.mirage); assert.ok(blades.length >= 1 && blades.every((b: any) => b.sweepFreeze === true));
  let froze = -1; play(g, [near, ahead], 1008, 900, calm, 8, (t) => { if (froze < 0 && sweepFrozen(ahead)) froze = t; });
  assert.ok(froze > 0, 'the far foe is frozen by a thrown blade'); assert.ok(4 > BRAWLER['great-sweep'].radius + .5, 'beyond the sweep\'s own reach');
  assert.equal(near.sweepFreeze, undefined, 'the foe behind him, inside the spin, is not frozen by the spin');
  // bosses build at the Mirage share per cut
  const { g: g2 } = arena(['nanoknives']), boss = foeAt(g2, 0, 4, 'boss', { boss: true }); g2.enemies = [boss];
  play(g2, [boss], 1000, 600, once('tool'));
  assert.ok(boss.sweepFreeze && !sweepFrozen(boss)); assert.ok(Math.abs(boss.sweepFreeze.build - SWEEP_FREEZE.touch.mirage) < 1e-9 || Math.abs(boss.sweepFreeze.build - 2 * SWEEP_FREEZE.touch.mirage) < 1e-9);
});

test('a boss and a world beast freeze only once the meter is full, and are slowed while it fills', () => {
  for (const extra of [{ boss: true }, { worldBeast: 'briarStag', boss: true }, { dungeonRole: 'gateWarden' }]) {
    const { g } = arena(), boss = foeAt(g, 0, 1.6, 'boss', extra); g.enemies = [boss];
    assert.equal(g.sweepFreezeClass(boss), 'boss');
    const need = SWEEP_FREEZE.classes.boss.need[0]; let t = 1000, presses = 0;
    while (!sweepFrozen(boss) && presses < 20) {
      g.toolReadyAt = 0; t = play(g, [boss], t, 1000, once('tool')); presses++;
      if (!sweepFrozen(boss)) { assert.ok(boss.sweepFreeze.fill > 0 && boss.sweepFreeze.fill < 1); assert.ok((boss.glyphSlow?.until || 0) > t - 16 && boss.glyphSlow.factor < 1, 'slowed while the meter fills'); }
    }
    assert.equal(presses, need, `${JSON.stringify(extra)}: frozen on touch ${need}`);
    assert.ok(boss.sweepFreeze.left > 0 && boss.sweepFreeze.left <= SWEEP_FREEZE.classes.boss.hold[0] && boss.sweepFreeze.hold === SWEEP_FREEZE.classes.boss.hold[0]);
  }
  const { g } = arena(); assert.equal(g.sweepFreezeClass({ eliteId: 'x' }), 'elite'); assert.equal(g.sweepFreezeClass({ kind: 'ashling' }), 'ordinary');
  assert.equal(g.sweepFreezeClass({ staggerImmune: true }), 'boss');
});

test('diminishing returns: each later freeze needs more and lasts less; the tiers ease back with time', () => {
  for (const cls of ['boss', 'elite', 'ordinary'] as const) {
    const R = SWEEP_FREEZE.classes[cls], e: any = { id: 'x', hp: 10 }, holds: number[] = [], needs: number[] = [];
    for (let k = 0; k < 3; k++) {
      let n = 0; while (!sweepFreezeTouch(e, cls, .5)) { n++; assert.ok(n < 100); } needs.push((n + 1) * .5); holds.push(e.sweepFreeze.left);
      while (e.sweepFreeze.left > 0) tickSweepFreeze(e, cls, .01); // thaw
      while (e.sweepFreeze.guard > 0) tickSweepFreeze(e, cls, .01); // the guard runs out
    }
    assert.deepEqual(needs, R.need.map((x) => Math.ceil(x / .5) * .5), cls); assert.ok(holds[1] < holds[0] && holds[2] < holds[1], `${cls}: ${holds}`);
    const tier = e.sweepFreeze.tier; for (let i = 0; i < Math.ceil(R.calm / .1) + 2; i++) tickSweepFreeze(e, cls, .1); assert.equal(e.sweepFreeze.tier, tier - 1, 'a calm spell drops a tier');
    for (let i = 0; i < 2000; i++) tickSweepFreeze(e, cls, .1); assert.equal(e.sweepFreeze, undefined, 'fully eased, the record is dropped');
  }
  // an idle meter drains
  const e: any = { id: 'y', hp: 1 }; sweepFreezeTouch(e, 'boss', 1); sweepFreezeTouch(e, 'boss', 1); const b = e.sweepFreeze.build;
  for (let i = 0; i < 100; i++) tickSweepFreeze(e, 'boss', .1); assert.ok(e.sweepFreeze === undefined || e.sweepFreeze.build < b);
});

test('the immunity window: no build while frozen or guarded; 60 s of presses every frame never lock a foe; with cooldowns wiped nothing goes NaN', () => {
  const e: any = { id: 'z', hp: 1 }; for (let i = 0; i < 6; i++) sweepFreezeTouch(e, 'boss', 1); assert.ok(sweepFrozen(e));
  assert.equal(sweepFreezeTouch(e, 'boss', 100), false); assert.equal(e.sweepFreeze.build, 0, 'frozen: nothing builds');
  while (e.sweepFreeze.left > 0) tickSweepFreeze(e, 'boss', .05); assert.ok(e.sweepFreeze.guard > 0); assert.equal(sweepFreezeTouch(e, 'boss', 100), false); assert.equal(e.sweepFreeze.build, 0, 'guarded: nothing builds');
  for (const passives of [[], ['nanoknives']]) for (const extra of [{}, { boss: true }, { eliteId: 'e' }]) {
    const mirage = passives.length > 0, { g } = arena(passives), foes = Array.from({ length: mirage ? 1 : 4 }, (_, i) => foeAt(g, i * 90, mirage ? 3 : 1.5, `w${i}`, extra)); g.enemies = foes.slice();
    const cls = g.sweepFreezeClass(foes[0]), R = SWEEP_FREEZE.classes[cls], frozenMs = foes.map(() => 0), run = foes.map(() => 0), longest = foes.map(() => 0); let maxFx = 0, maxShots = 0;
    play(g, foes, 1000, 60000, tool, 16, () => { /* a press every frame, on the tool's own cooldown (wiping it restarts the wind-up and replaces the blades before they land) */ maxFx = Math.max(maxFx, g.effects.length); maxShots = Math.max(maxShots, g.projectiles.length);
      foes.forEach((f, k) => { const q = f.sweepFreeze; if (q) for (const v of Object.values(q)) assert.ok(Number.isFinite(v as number)); if (sweepFrozen(f)) { frozenMs[k] += 16; run[k] += 16; longest[k] = Math.max(longest[k], run[k]); } else run[k] = 0; }); });
    const cap = R.hold[0] / (R.hold[0] + R.guard);
    for (let k = 0; k < foes.length; k++) {
      assert.ok(frozenMs[k] > 0, `${cls} ${passives}: frozen at least once`);
      assert.ok(frozenMs[k] / 60000 <= cap + .03, `${cls} ${passives}: frozen ${(frozenMs[k] / 600).toFixed(1)}% <= ${(cap * 100).toFixed(1)}%`);
      assert.ok(longest[k] <= R.hold[0] * 1000 + 32, `${cls}: never held past one freeze (${longest[k]} ms)`);
    }
    assert.ok(maxFx < 40 && maxShots <= MIRAGE.max + 2, `bounded (${maxFx}, ${maxShots})`);
  }
  // cooldowns wiped every frame: nothing goes NaN or piles up
  for (const passives of [[], ['nanoknives']]) {
  const { g } = arena(passives), foes = Array.from({ length: 6 }, (_, i) => foeAt(g, i * 60, 1.5, `n${i}`, i % 2 ? { boss: true } : {})); g.enemies = foes.slice(); let most = 0;
  play(g, foes, 1000, 60000, tool, 16, () => { g.toolReadyAt = 0; most = Math.max(most, g.effects.length + g.projectiles.length); for (const f of foes) if (f.sweepFreeze) for (const v of Object.values(f.sweepFreeze)) assert.ok(Number.isFinite(v as number)); });
  assert.ok(most < 40);
  }
});

test('exact resume: the meter, the freeze and its clock come back as they were; the swing keeps its freeze', () => {
  // a real interior that saves and reloads; its generated foes come back from the save (the lab's own foe is not generated)
  const lab: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game;
  lab.save.equipment.secondary = { ...structuredClone(SWEEP), awakened: { ...AWAKE } }; lab.save.lastAim = { x: 1, y: 0 };
  const g: any = new Game(deserializeSave(serializeSave(lab.exportSnapshot(100000))), 100000); g.installSystems();
  const foe = g.enemies.find((e: any) => !e.dead); assert.ok(foe); foe.hp = foe.maxHp = 1e6;
  for (const [label, touches] of [['filling', 0], ['frozen', 1]] as const) {
    delete foe.sweepFreeze; foe.boss = true; foe.x = g.player.x + 1.4; foe.y = g.player.y;
    for (let i = 0; i < (touches ? 6 : 3); i++) g.sweepFreezeHit(foe, 1);
    let t = 100000; for (let i = 0; i < 20; i++) { g.update(.016, calm, t); t += 16; }
    const want = structuredClone(foe.sweepFreeze); assert.ok(want, label);
    const snap = g.exportSnapshot(t), stored = snap.session.areas[Object.keys(snap.session.areas).find((k) => snap.session.areas[k].enemies?.some((e: any) => e.id === foe.id))!].enemies.find((e: any) => e.id === foe.id);
    assert.notEqual(stored.sweepFreeze, foe.sweepFreeze, 'the snapshot holds its own copy');
    const back: any = new Game(deserializeSave(serializeSave(snap)), 500000); back.installSystems();
    const bf = back.enemies.find((e: any) => e.id === foe.id); assert.deepEqual(bf.sweepFreeze, want, label);
    let tb = 500000; for (let i = 0; i < 30; i++) { g.update(.016, calm, t); back.update(.016, calm, tb); t += 16; tb += 16; }
    for (const k of ['build', 'left', 'guard', 'tier', 'fill']) assert.ok(Math.abs((bf.sweepFreeze?.[k] ?? 0) - (foe.sweepFreeze?.[k] ?? 0)) < 1e-9, `${label} ${k}`);
    if (touches) { assert.equal(bf.x, foe.x); assert.equal(bf.y, foe.y); }
  }
  // the swing record keeps (and validates) its freeze flag
  const { g: a } = arena(); a.enemies = []; a.update(.008, once('tool'), 1000); const rec = structuredClone(a.toolSwing); delete rec.lastNow;
  assert.equal(normalizeToolSwing(rec).freeze, true); assert.equal(normalizeToolSwing({ ...rec, freeze: 'yes' }).freeze, false);
});

// ---------------------------------------------------------------- Tim's follow-up (2026-11-14): a freeze cancels the attack;
// from the third freeze on the resistance stays at the third tier.
import { cancelStalkerAct } from '../src/stalker.ts';

// Frames with the Wayfarer standing still beside the foe (damage taken counted), the foe free to act.
function fight(g: any, from: number, frames: number, each: (t: number, hurt: number) => boolean | void = () => {}) {
  let t = from; const px = g.player.x, py = g.player.y;
  const full = () => Number(g.player.maxHp) || Number(g.save.maxHp) || 100;
  for (let i = 0; i < frames; i++) { g.player.x = px; g.player.y = py; g.player.hp = full(); g.update(.016, calm, t); const hurt = Math.max(0, full() - g.player.hp); g.player.hp = full(); t += 16; if (each(t, hurt) === true) break; }
  return t;
}

test('a freeze cancels an ordinary foe\'s wind-up: the blow never lands, during the freeze or after the thaw', () => {
  const { g } = arena(), foe = Object.assign(createCombatant('rootBrute', 10.9, 10), { id: 'brute', hp: 1e6, maxHp: 1e6, damage: 9, cooldown: 0, aggro: true }); g.enemies = [foe];
  assert.ok(foe.meleePatterns.length, 'a melee foe');
  let t = fight(g, 1000, 600, () => foe.telegraph > .05); assert.ok(foe.telegraph > .05, 'winding up');
  assert.ok(g.sweepFreezeHit(foe, 1)); assert.equal(foe.telegraph, 0); assert.equal(foe.meleePhase, null); assert.equal(foe.threatRange, null);
  let hurt = 0; const hold = foe.sweepFreeze.left;
  t = fight(g, t, Math.floor(hold * 1000 / 16) - 2, (_, h) => { hurt += h; assert.equal(foe.telegraph, 0); }); assert.equal(hurt, 0, 'nothing lands while frozen');
  // thawed: no queued blow; any blow after this needs a whole new wind-up first
  let sawFresh = false, landedBeforeFresh = 0;
  fight(g, t, 400, (_, h) => { if (!sweepFrozen(foe) && foe.telegraph > 0) sawFresh = true; if (h > 0 && !sawFresh) landedBeforeFresh += h; });
  assert.equal(landedBeforeFresh, 0, 'the cancelled blow never lands after the thaw'); assert.ok(!sweepFrozen(foe));
});

test('a freeze cancels a world beast\'s attack and takes back its unarmed hazards; it starts afresh after the thaw', () => {
  const caught: string[] = [];
  for (const kind of ['briarStag', 'crimsonTyrant', 'ashenMoth', 'lightningGiant']) {
    const { g } = arena(), beast = Object.assign(createCombatant(kind, 12.5, 10, true), { id: `wb-${kind}`, worldBeast: kind, hp: 1e6, maxHp: 1e6, aggro: true }); g.enemies = [beast];
    let t = fight(g, 1000, 2500, () => beast.pack?.attack && beast.pack.phase === 'windup');
    if (!(beast.pack?.attack && beast.pack.phase === 'windup')) continue; // this beast chose no attack in time from here
    const id = beast.pack.attack;
    g.packEffects = g.packEffects || []; g.packEffects.push({ id: 'pend', owner: beast.id, kind: 'psyRing', x: 10, y: 10, radius: 3, arming: .5, life: 1, total: 1, damage: 50 }, { id: 'live', owner: beast.id, kind: 'psyRing', x: 30, y: 30, radius: 1, arming: 0, life: 1, total: 1, damage: 0 });
    assert.ok(g.sweepFreezeHit(beast, SWEEP_FREEZE.classes.boss.need[0]), kind); // a full meter at a stroke
    assert.ok(sweepFrozen(beast)); assert.equal(beast.pack.attack, null, `${kind}: ${id} cancelled`); assert.equal(beast.pack.tele, null);
    assert.ok(!g.packEffects.some((f: any) => f.id === 'pend'), 'its unarmed hazard is taken back'); assert.ok(g.packEffects.some((f: any) => f.id === 'live'), 'an armed one stays');
    let hurt = 0; t = fight(g, t, Math.floor(beast.sweepFreeze.left * 1000 / 16) - 2, (_, h) => { hurt += h; assert.equal(beast.pack.attack, null); });
    assert.equal(hurt, 0, `${kind}: nothing lands while frozen`);
    // after the thaw any attack is a new one, from its wind-up
    let first: any = null; fight(g, t, 500, () => { if (!first && beast.pack?.attack) first = { phase: beast.pack.phase }; });
    if (first) assert.equal(first.phase, 'windup', `${kind}: a fresh attack`);
    caught.push(kind); if (caught.length >= 2) return; // two beasts caught mid-wind-up are enough
  }
  assert.ok(caught.length >= 1, 'a beast was caught mid-wind-up');
});

test('every brain\'s cancel: elite wind-up, Gate Revenant, Stalker, pending hazards; armed ones and loosed shots stay', () => {
  const { g } = arena(), now = 5000; g.lastUpdateNow = now;
  const elite = foeAt(g, 0, 2, 'elite', { eliteId: 'vesperwing', eliteModules: ['gravity'], eliteWindup: .6, telegraph: .3 });
  g.enemies = [elite]; g.eliteHazards = [{ id: 'eh1', owner: 'elite', kind: 'root-eruption', arming: .8, life: 2 }, { id: 'eh2', owner: 'elite', kind: 'ooze', life: 4 }];
  g.affixHazards = [{ kind: 'x', by: 'elite', armAt: now + 400, until: now + 900 }, { kind: 'y', by: 'elite', armAt: now - 10, until: now + 500 }, { kind: 'z', by: 'other', armAt: now + 400, until: now + 900 }];
  elite.sweepFreeze = { build: 99, left: 0, hold: 0, guard: 0, tier: 0, idle: 0, calm: 0, fill: 0 }; assert.ok(g.sweepFreezeHit(elite, 1));
  assert.equal(elite.eliteWindup, 0); assert.equal(elite.telegraph, 0);
  assert.deepEqual(g.eliteHazards.map((h: any) => h.id), ['eh2']); assert.deepEqual(g.affixHazards.map((h: any) => h.kind), ['y', 'z']);
  // a frozen elite runs no elite move (the gravity wind-up does not restart while frozen)
  let t = 6000; for (let i = 0; i < 40; i++) { g.update(.016, calm, t); t += 16; assert.equal(elite.eliteWindup, 0); assert.equal(elite.eliteActive || 0, 0); }
  // boss-kit and affix clocks wait out the freeze
  const kit = foeAt(g, 90, 2, 'kit', { boss: true, kitClock: { quake: t + 100 }, affixClock: { burn: t + 50 } }); g.enemies.push(kit); kit.sweepFreeze = { build: 99, left: 0, hold: 0, guard: 0, tier: 0, idle: 0, calm: 0, fill: 0 }; g.sweepFreezeHit(kit, 1);
  const k0 = kit.kitClock.quake, a0 = kit.affixClock.burn; for (let i = 0; i < 20; i++) { g.update(.016, calm, t); t += 16; } assert.ok(Math.abs(kit.kitClock.quake - k0 - 320) < 1e-6 && Math.abs(kit.affixClock.burn - a0 - 320) < 1e-6);
  // Gate Revenant and Stalker
  const rev = foeAt(g, 180, 2, 'rev', { gatePredator: true, gateAttack: { kind: 'breath', t: .3 }, telegraph: .3 }); g.cancelFrozenAttack(rev, t); assert.equal(rev.gateAttack, null); assert.equal(rev.telegraph, 0);
  const st: any = { id: 'st', stalker: true, stalkAct: { kind: 'slamWarn', t: .2, total: .5 }, telegraph: .2, stalkStrike: { t: .1 }, stalkFists: [{}], stalkErupts: [{ t: .3, struck: false }, { t: -.1, struck: true }] };
  cancelStalkerAct(st); assert.equal(st.stalkAct, null); assert.equal(st.telegraph, 0); assert.equal(st.stalkStrike, null); assert.equal(st.stalkErupts.length, 1);
  const kin: any = { id: 'k', stalkerKin: true, stalkAct: { kind: 'swipeWarn', t: .2 }, telegraph: .2 }; g.cancelFrozenAttack(kin, t); assert.equal(kin.stalkAct, null); assert.equal(kin.telegraph, 0);
});

test('from the third freeze on a foe keeps the third tier: the 4th and 5th freeze need and hold exactly the third entry', () => {
  for (const cls of ['boss', 'elite', 'ordinary'] as const) {
    const R = SWEEP_FREEZE.classes[cls], e: any = { id: 'tier', hp: 1 }, rows: Array<[number, number, number]> = [];
    for (let k = 0; k < 5; k++) {
      let n = 0; while (!sweepFreezeTouch(e, cls, .5)) { n++; assert.ok(n < 200); } rows.push([(n + 1) * .5, e.sweepFreeze.left, e.sweepFreeze.tier]);
      while (e.sweepFreeze.left > 0) tickSweepFreeze(e, cls, .01); while (e.sweepFreeze.guard > 0) tickSweepFreeze(e, cls, .01);
    }
    const third = [Math.ceil(R.need[2] / .5) * .5, R.hold[2]];
    for (const k of [2, 3, 4]) { assert.equal(rows[k][0], third[0], `${cls} freeze ${k + 1} need`); assert.ok(Math.abs(rows[k][1] - third[1]) < 1e-9, `${cls} freeze ${k + 1} hold`); assert.equal(rows[k][2], R.need.length - 1, 'the tier stops at the third'); }
    if (cls === 'boss') { assert.equal(rows[3][0], 13); assert.equal(rows[4][0], 13); assert.equal(rows[3][1], .9); assert.equal(rows[4][1], .9); }
    // calm still eases it back one tier at a time
    for (let i = 0; i < Math.ceil(R.calm / .1) + 2; i++) tickSweepFreeze(e, cls, .1); assert.equal(e.sweepFreeze.tier, R.need.length - 2);
  }
  // a record saved with a higher tier (before the cap) comes back to the third
  const old: any = { id: 'o', hp: 1, sweepFreeze: { build: 0, left: 0, hold: 0, guard: 0, tier: 7, idle: 0, calm: 0, fill: 0 } }; tickSweepFreeze(old, 'boss', .01); assert.equal(old.sweepFreeze.tier, 2);
});
