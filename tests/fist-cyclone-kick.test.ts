// Cyclone Heel (Tim, 2026-11-15): with awakened Iron Fists and the Ki Blast passive, the press after the uppercut's airborne Ki
// Blast is a spinning leg kick in the ground slam's place. Without Shadow Boxing she spins across a few tiles, each turn striking
// what the leg touches; with it she is carried to her foe and every turn lands on it over about a second. A tap is the plain
// kick; held and let go just before landing it is the perfect one (the chain's perfect / rhythm rewards). Numbers:
// brawler-spells.ts CYCLONE_HEEL; game.ts cycloneReady / cyclonePress / tickCycloneHold / cycloneBegin / cycloneSteer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, GAME_NESTED_CLOCKS } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { SHADOW_DASH, IRON_FISTS, CYCLONE_HEEL, normalizeCycloneHeel, FIST_CALLOUT, fistStatusLevel, drawBrawler, BRAWLER } from '../src/brawler-spells.ts';
import { WEAPON_ARTS } from '../src/weapon-arts.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';
import { normalizeAttackVisual, sampleCycloneMotion, CYCLONE_MOTION } from '../src/action-motion.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import fs from 'node:fs';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';

const F = IRON_FISTS, C = CYCLONE_HEEL, DT = .02, AWAKE = { resonance: 'wildfire', version: 1 };
const fists = () => ({ id: 'primary-if-test', name: 'Iron Fists', slot: 'primary', power: 10, property: 'brawler', tier: 'rare', affixes: [] });
function arena({ awakened = true, ki = true, foes = [[1, .2]] as any[], size = 40, walls = [] as number[][] } = {}) {
  const s = freshSave(); s.seed = 'CYCLONE-HEEL'; s.level = 15; s.equipment.primary = { ...fists(), ...(awakened ? { awakened: { ...AWAKE } } : {}) } as any;
  s.perception.aperture = 3255; (s as any).farArray = { listeners: 1 }; ensureLattice(s); (s as any).lattice.passives = ki ? ['field:ki-blast'] : [];
  const g: any = new Game(s, 0);
  g.map = { ...g.map, width: size, height: size, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: size * size }, (_, i) => ({ x: i % size, y: Math.floor(i / size), kind: 'ash', blocked: walls.some(([x, y]) => x === i % size && y === Math.floor(i / size)) })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 }; s.maxHp = 1e6;
  g.enemies = foes.map(([fx, fy, extra]: any, i: number) => Object.assign(createCombatant('ashling', 10 + fx, 10 + fy), { id: `foe-${i}`, hp: 1e7, maxHp: 1e7, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] }, extra || {}));
  return { s, g, clock: { t: 1000 } };
}
function frame(g: any, clock: any, { held = [] as string[], pressed = [] as string[] } = {}) {
  g.player.invulnerableUntil = clock.t + 1e6; const used = new Set();
  g.update(DT, { state: { x: 0, y: 0 }, consume: (k: string) => pressed.includes(k) && !used.has(k) && (used.add(k), true), held: (k: string) => held.includes(k) }, clock.t); clock.t += DT * 1000;
}
const idle = (g: any, clock: any, n: number) => { for (let i = 0; i < n; i++) frame(g, clock); };
const tap = (g: any, clock: any) => frame(g, clock, { pressed: ['attack'] });
const step = (g: any, clock: any) => { tap(g, clock); idle(g, clock, 12); };
const kick = (g: any, clock: any) => { tap(g, clock); frame(g, clock); }; // a tap: the press, then its let-go on the next frame (as the fists' charge reads it)
const hold = (g: any, clock: any, seconds: number) => { frame(g, clock, { pressed: ['attack'], held: ['attack'] }); for (let i = 0; i < Math.round(seconds / DT); i++) frame(g, clock, { held: ['attack'] }); frame(g, clock); };
const lost = (g: any, i = 0) => 1e7 - g.enemies[i].hp;
// Arm Ki Blast (three presses), then cross, jab and the uppercut held into the blast: she is up in its leap. Foes are put back
// where the test wants them afterwards (the chain's own blows stagger nothing out of place: speed ~0).
function leap(opts: any = {}) {
  const a = arena(opts), { g, clock } = a, place = g.enemies.map((e: any) => [e.x, e.y]);
  for (let i = 0; i < 3; i++) { tap(g, clock); idle(g, clock, 40); } idle(g, clock, 40);
  step(g, clock); step(g, clock); assert.equal(g.fistNextStep(clock.t), 3);
  hold(g, clock, WEAPON_ARTS.hold.grace + 1.15); idle(g, clock, 5);
  assert.ok(clock.t < g.jumpUntil, 'popped up by the blast'); assert.equal(g.kiSlamReady(clock.t), true);
  g.enemies.forEach((e: any, i: number) => { e.x = place[i][0] - 10 + g.player.x; e.y = place[i][1] - 10 + g.player.y; e.hp = 1e7; });
  return a;
}
const spinOut = (g: any, clock: any, max = 120) => { const seen: any[] = []; for (let i = 0; i < max && g.cycloneHeel; i++) { seen.push({ ...g.cycloneHeel }); frame(g, clock); } return seen; };

test('the table: original name, data numbers, bounded, a perfect window just before landing', () => {
  assert.equal(C.name, 'Cyclone Heel'); assert.ok(C.spins >= 4 && C.spins <= 6); assert.ok(C.tiles >= 3 && C.tiles <= 4);
  assert.ok(C.window.lead >= .15 && C.window.lead <= .25, 'the window: about .15-.25 s before landing');
  assert.ok(C.shadow.spanMs >= 800 && C.shadow.spanMs <= 1200, 'about a second');
  assert.ok(C.spins * C.spinMs >= C.minMs && C.shadow.spanMs <= C.maxMs, 'both spans fit the saved record');
  assert.ok(C.spins * C.share >= 2.8, 'never weaker than the slam it replaces'); assert.deepEqual(GAME_NESTED_CLOCKS.cycloneHold, ['start']);
});

test('the trigger: awakened fists + Ki Blast, the uppercut\'s airborne blast, then the next press: the Cyclone Heel, not the slam', () => {
  const { g, clock } = leap(); kick(g, clock);
  assert.ok(g.cycloneHeel, 'spinning'); assert.ok(!g.plunge, 'no slam'); assert.equal(g.kiSlam, false, 'the slam is spent');
  assert.equal(g.player.attackVisual.awakenedArt, 'cyclone-heel'); assert.match(g.message, /Cyclone Heel/);
  assert.ok(normalizeAttackVisual(structuredClone(g.player.attackVisual), 100), 'its record validates');
  const before = lost(g); spinOut(g, clock); assert.ok(lost(g) > before, 'it struck'); assert.equal(g.cycloneHeel, null);
  idle(g, clock, 14); assert.equal(g.fistNextStep(clock.t), 1, 'then the chain starts again at the cross'); tap(g, clock); frame(g, clock); assert.equal(g.fistCombo.step, 1);
});

test('missing any condition: the chain is exactly as before (the slam, the cross or the kick on the ground)', () => {
  // not awakened: the ground slam
  { const { g, clock } = leap({ awakened: false }); tap(g, clock); assert.ok(g.plunge?.kiSlam, 'the slam'); assert.ok(!g.cycloneHeel); }
  // awakened without Ki Blast: no leap at all; the uppercut stays on the ground and the kick follows
  { const { g, clock } = arena({ ki: false }); for (let i = 0; i < 3; i++) step(g, clock); assert.ok(!(clock.t < g.jumpUntil), 'grounded'); tap(g, clock); frame(g, clock); idle(g, clock, 6);
    assert.equal(g.fistCombo.step, 4); assert.equal(g.player.attackVisual.awakenedArt, 'roundhouse'); assert.ok(!g.cycloneHeel); }
  // landed first: the kick (grounded), as before
  { const { g, clock } = leap(); while (clock.t < g.jumpUntil) frame(g, clock); frame(g, clock); tap(g, clock); frame(g, clock);
    assert.ok(!g.cycloneHeel && !g.plunge); assert.equal(g.fistCombo.step, 4, 'grounded: the kick'); }
  // an ordinary jump (not the blast's leap): the ordinary plunge
  { const { g, clock } = arena(); idle(g, clock, 3); frame(g, clock, { pressed: ['jump'] }); tap(g, clock); assert.ok(g.plunge && !g.plunge.kiSlam); assert.ok(!g.cycloneHeel); }
  // the chain's window lapsed while still up (a long leap): the slam, as before
  { const { g, clock } = leap(); g.fistCombo.until = clock.t - 1; tap(g, clock); assert.ok(g.plunge?.kiSlam); assert.ok(!g.cycloneHeel); }
  // the perfect-rhythm charged kick on the ground is untouched: still the roundhouse step
  { const { g, clock } = arena({ ki: false }); for (let i = 0; i < 3; i++) step(g, clock); assert.equal(g.fistNextStep(clock.t), 4); }
});

test('target: the lock first, else the nearest in range, else forward along the aim', () => {
  // nearest: two foes, the nearer one up-ish; the farther one ahead
  { const { g, clock } = leap({ foes: [[3, 0], [0, 2]] }); kick(g, clock); assert.equal(g.cycloneHeel.foe, 'foe-1', 'the nearest'); assert.ok(g.cycloneHeel.dirY > .5); }
  // locked: the farther one wins
  { const { g, clock } = leap({ foes: [[3, 0], [0, 2]] }); g.lockTarget('foe-0'); kick(g, clock); assert.equal(g.cycloneHeel.foe, 'foe-0', 'the lock'); assert.ok(g.cycloneHeel.dirX > .9); }
  // none in range: forward along the aim, the full distance
  { const { g, clock } = leap({ foes: [[0, 30]] }); g.save.lastAim = { x: 0, y: -1 }; g.player.meleeAim = { x: 0, y: -1 }; const y0 = g.player.y; kick(g, clock);
    assert.equal(g.cycloneHeel.foe, ''); spinOut(g, clock); assert.ok(Math.abs((y0 - g.player.y) - C.tiles) < .05, `travelled ${y0 - g.player.y} up`); }
});

test('without Shadow Boxing: about 3.5 tiles in a fixed number of spins; each spin strikes only what the leg touches, once', () => {
  // a line of foes off to the side of the path: only those within the leg's radius as she passes are struck
  const { g, clock } = leap({ foes: [[0, 30]] }); g.save.lastAim = { x: 1, y: 0 }; g.player.meleeAim = { x: 1, y: 0 };
  const x0 = g.player.x, y0 = g.player.y, near = Object.assign(createCombatant('ashling', x0 + 2, y0 + .6), { id: 'near', hp: 1e7, maxHp: 1e7, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] });
  const far = Object.assign(createCombatant('ashling', x0 + 2, y0 + 2.5), { id: 'far', hp: 1e7, maxHp: 1e7, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] });
  g.enemies = [near, far]; // no foe within the look range ahead? `near` is: it becomes the target only if nearest; put it beside the path
  g.lockTarget(null); const blows: any[] = []; const own = g.cycloneSpin.bind(g); g.cycloneSpin = (...a: any[]) => { blows.push(g.player.x); return own(...a); };
  const hits: number[] = []; let hp = near.hp;
  kick(g, clock); const q0 = { ...g.cycloneHeel };
  for (let i = 0; i < 80 && g.cycloneHeel; i++) { frame(g, clock); if (near.hp < hp) { hits.push(g.cycloneHeel?.spun ?? C.spins); hp = near.hp; } }
  assert.equal(blows.length, C.spins, 'a fixed number of spins'); assert.equal(far.hp, 1e7, 'out of the leg\'s reach: never struck');
  assert.ok(hits.length >= 1 && hits.length <= C.spins, `struck on ${hits.length} spins`); assert.equal(new Set(hits).size, hits.length, 'at most once a spin');
  assert.equal(q0.durationMs, C.windupMs + C.spins * C.spinMs + C.recoverMs, 'wind-up, the turns, the recovery');
  // the open-ground distance with no foe at all
  { const { g, clock } = leap({ foes: [[-30, 0]] }); g.enemies = []; const xs = g.player.x; kick(g, clock); spinOut(g, clock); assert.ok(Math.abs(g.player.x - xs - C.tiles) < .05, `${g.player.x - xs} tiles`); }
  // a foe within reach: she stops `stop` short of it and every spin lands on it
  { const { g, clock } = leap({ foes: [[2.5, 0]] }); const hp0 = g.enemies[0].hp; let n = 0, last = hp0; kick(g, clock);
    while (g.cycloneHeel) { frame(g, clock); if (g.enemies[0].hp < last) { n++; last = g.enemies[0].hp; } }
    assert.ok(Math.hypot(g.enemies[0].x - g.player.x, g.enemies[0].y - g.player.y) >= C.stop - .3, 'stopped short of it'); assert.ok(n >= C.spins - 2, `${n} spins landed`); }
});

test('without Shadow Boxing: walls stop the travel, as other dashes', () => {
  const { g, clock } = leap({ foes: [[-30, 0]], walls: [] }); g.enemies = []; const px = Math.floor(g.player.x);
  for (let y = 0; y < 40; y++) g.map.tiles[y * 40 + px + 2].blocked = true; // a wall two tiles ahead
  const x0 = g.player.x; kick(g, clock); spinOut(g, clock); assert.ok(g.player.x - x0 < 2, `stopped at the wall (${g.player.x - x0})`); assert.ok(g.glyphWorld(clock.t).canStand(g.player.x, g.player.y));
});

test('with Shadow Boxing: a quick travelled approach on Shadow Boxing\'s charge clock, then every spin lands on it over about a second; a touch of splash', () => {
  const { g, clock } = leap({ foes: [[5, 0], [4.4, .8]] }); g.boxingUntil = 1e12; g.lockTarget('foe-0'); const x0 = g.player.x;
  const hp = g.enemies.map((e: any) => e.hp); let n = 0, last = hp[0];
  kick(g, clock); const q = g.cycloneHeel; assert.equal(q.mode, 'shadow'); assert.ok(q.windupMs >= C.windupMs && q.windupMs <= SHADOW_DASH.maxMs, `the approach: ${q.windupMs} ms`);
  assert.equal(q.durationMs, q.windupMs + C.shadow.spanMs + C.recoverMs);
  const xs: number[] = [g.player.x]; while (g.cycloneHeel && g.cycloneHeel.elapsedMs < g.cycloneHeel.windupMs) { frame(g, clock); xs.push(g.player.x); }
  assert.ok(g.player.x - x0 > 3, `arrived (${g.player.x - x0})`); assert.ok(xs.length >= 4, 'travelled over several frames, not a pop');
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] <= .75, `at most about half a tile a frame (${xs[i] - xs[i - 1]})`);
  assert.ok(g.shadowTrail?.live, 'Shadow Boxing\'s after-images on arrival'); assert.equal(n, 0, 'no turn before she arrives'); last = g.enemies[0].hp;
  const start = clock.t; let end = start;
  while (g.cycloneHeel) { frame(g, clock); if (g.enemies[0].hp < last) { n++; last = g.enemies[0].hp; end = clock.t; } }
  assert.equal(n, C.spins, 'every spin, each on its own tick'); assert.ok(end - start >= C.shadow.spanMs * .8, `over ${end - start} ms`);
  const per = (hp[0] - g.enemies[0].hp) / n, splash = hp[1] - g.enemies[1].hp; assert.ok(splash > 0 && splash < per * n * .5, `splash ${splash} vs ${per * n}`);
  // a wall between: carried only to the wall, never through it
  { const { g, clock } = leap({ foes: [[5, 0]] }); g.boxingUntil = 1e12; const px = Math.floor(g.player.x); for (let y = 0; y < 40; y++) g.map.tiles[y * 40 + px + 2].blocked = true;
    kick(g, clock); assert.ok(g.player.x < px + 2, 'not through the wall'); spinOut(g, clock); }
});

test('the timing: a tap is the plain kick; let go in the pre-landing window, the perfect one; outside it, plain; held through landing resolves', () => {
  const dealt = (how: string) => {
    const { g, clock } = leap({ foes: [[2.2, 0]] }); const before = lost(g);
    if (how === 'tap') kick(g, clock);
    else {
      frame(g, clock, { pressed: ['attack'], held: ['attack'] }); assert.ok(g.cycloneHold, 'held: waiting'); assert.ok(!g.cycloneHeel);
      const target = how === 'perfect' ? g.jumpUntil - C.window.lead * 1000 * .5 : how === 'early' ? clock.t + C.window.grace * 1000 + 10 : Infinity;
      assert.ok(how !== 'early' || target + DT * 1000 < g.jumpUntil - C.window.lead * 1000, 'early: held past the tap grace, let go above the window');
      while (g.cycloneHold && clock.t < target) frame(g, clock, { held: ['attack'] });
      if (how === 'through') assert.ok(!(clock.t < g.jumpUntil), 'landed, still holding');
      if (g.cycloneHold) frame(g, clock);
    }
    assert.ok(g.cycloneHeel, `${how}: spinning`); const perfect = g.cycloneHeel.perfect, level = g.cycloneHeel.level;
    for (let i = 0; i < 100 && g.cycloneHeel; i++) frame(g, clock, how === 'through' ? { held: ['attack'] } : {});
    assert.equal(g.cycloneHeel, null, `${how}: it ends`); assert.equal(g.cycloneHold, null);
    idle(g, clock, 20); tap(g, clock); frame(g, clock); assert.ok(g.fistCombo?.step === 1 || g.fistCharge, `${how}: never stuck`);
    return { amount: lost(g) - before, perfect, level };
  };
  const t = dealt('tap'), p = dealt('perfect'), e = dealt('early'), h = dealt('through');
  assert.equal(t.perfect, false); assert.equal(e.perfect, false); assert.equal(h.perfect, false); assert.equal(p.perfect, true);
  assert.ok(p.level >= FIST_CALLOUT.timing, 'the HUD meter climbs'); assert.equal(t.level, 0);
  assert.ok(p.amount > t.amount * 1.15, `perfect ${p.amount} vs tap ${t.amount}`); assert.ok(Math.abs(e.amount - t.amount) <= t.amount * .1, `early ${e.amount} ~ tap ${t.amount}`);
});

test('perfect rewards are the chain\'s: perfectShare per spin; a press on the beat and a perfect release is a rhythm blow', () => {
  const run = (perfect: boolean, onBeat: boolean) => { const { g, clock } = leap({ foes: [[1.4, 0]] }); g.lastUpdateNow = clock.t; g.kiSlam = false; g.cycloneBegin(clock.t, perfect, onBeat); const q = { ...g.cycloneHeel }; return { q, g }; };
  const plain = run(false, false), perfect = run(true, false), beat = run(false, true), rhythm = run(true, true), fp = plain.g.fistPower();
  assert.equal(plain.q.power, Math.max(1, Math.round(fp * C.share))); assert.equal(perfect.q.power, Math.round(fp * C.share * F.perfectShare));
  assert.equal(beat.q.power, Math.round(fp * C.share * F.beatShare)); assert.equal(rhythm.q.power, Math.round(fp * (C.share * F.beatShare + F.rhythmBonus / C.spins)));
  assert.deepEqual([plain.q.level, perfect.q.level, beat.q.level, rhythm.q.level], [0, FIST_CALLOUT.timing, FIST_CALLOUT.timing, FIST_CALLOUT.rhythm]);
  assert.equal(fistStatusLevel(rhythm.g, rhythm.g.lastUpdateNow), FIST_CALLOUT.rhythm, 'the meter says Perfect Rhythm!');
  // the hold's cue: the gauntlet ball goes out and is home as the window opens, at landing it closes
  const { g, clock } = leap(); frame(g, clock, { pressed: ['attack'], held: ['attack'] }); const b = g.fistBeat;
  assert.ok(Math.abs(b.opens - (g.jumpUntil - C.window.lead * 1000)) < 1e-6 || b.opens === b.at + 1); assert.equal(b.closes, Math.max(b.opens, g.jumpUntil)); assert.equal(b.step, 4);
});

test('a dodge or death ends it; a press during it is absorbed; a held press survives a pause', () => {
  { const { g, clock } = leap(); g.player.stamina = 100; kick(g, clock); assert.ok(g.cycloneHeel); frame(g, clock, { pressed: ['dodge'] }); assert.equal(g.cycloneHeel, null); }
  { const { g, clock } = leap(); kick(g, clock); const spun = () => g.cycloneHeel?.spun; frame(g, clock, { pressed: ['attack'] }); assert.ok(g.cycloneHeel, 'still spinning'); assert.ok(!g.plunge); assert.ok(spun() >= 0); }
  { const { g, clock } = leap(); frame(g, clock, { pressed: ['attack'], held: ['attack'] }); const start = g.cycloneHold.start, land = g.jumpUntil; g.setPaused(true, clock.t); clock.t += 4000; g.setPaused(false, clock.t);
    assert.equal(g.cycloneHold.start, start + 4000); assert.equal(g.jumpUntil, land + 4000); }
});

test('exact resume: saved mid-spin, a reload continues the same spins on the same ticks (both kinds); bad records are dropped', () => {
  for (const boxing of [false, true]) for (const cut of [3, 9]) {
    const mk = () => { const a = leap({ foes: [[3, 0]] }); if (boxing) a.g.boxingUntil = 1e12; return a; };
    const { g, clock } = mk(); kick(g, clock); for (let i = 0; i < cut; i++) frame(g, clock);
    const q = structuredClone(g.cycloneHeel); assert.ok(q && q.spun < q.spins, `mid-spin (${boxing}, ${cut})`);
    const save = deserializeSave(serializeSave(g.exportSnapshot(clock.t))); assert.deepEqual(normalizeCycloneHeel(save.session.playerRuntime.cycloneHeel), normalizeCycloneHeel(q));
    assert.equal(save.version, 14);
    const back: any = new Game(save, clock.t); back.map = g.map; back.area = g.area; back.enemies = g.enemies.map((e: any) => ({ ...e }));
    // the arena's hand-made map is not regenerated on reload: restore it as the same ground, then compare the futures
    back.cycloneHeel = normalizeCycloneHeel(save.session.playerRuntime.cycloneHeel); Object.assign(back.player, { x: g.player.x, y: g.player.y }); back.boxingUntil = g.boxingUntil;
    assert.deepEqual(back.cycloneHeel, normalizeCycloneHeel(q));
    const play = (h: any, c: any) => { const out: any[] = []; for (let i = 0; i < 70; i++) { frame(h, c); out.push([Math.round(h.player.x * 1e6), Math.round(h.player.y * 1e6), h.enemies[0].hp, h.cycloneHeel?.spun ?? -1]); } return out; };
    assert.deepEqual(play(back, { t: clock.t }), play(g, { t: clock.t }), `resume (${boxing}, ${cut})`);
  }
  assert.equal(normalizeCycloneHeel({ v: 1, area: 'dungeon', areaId: 'a', levelId: 'root', foe: '', fromX: 0, fromY: 0, durationMs: 550, elapsedMs: 0, travelled: 0, stop: 0, mode: 'sideways' }), null);
  assert.deepEqual(normalizeCycloneHeel({ v: 2, anything: [1] }), { v: 2, anything: [1] });
  assert.equal((freshSave() as any).session.playerRuntime.cycloneHeel, undefined);
});

test('the game\'s own reload (the Proving Ground room, regenerated): the spin resumes where it stood and lands the same turns on the same ticks', () => {
  const calm = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} };
  for (const boxing of [false, true]) for (const cut of [48, 200]) {
    const g: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game; g.enemies = []; g.save.closeView = true;
    g.save.activeWeaponSlot = 'primary'; g.save.equipment.primary = { ...fists(), awakened: { ...AWAKE } }; g.update(.016, calm, 100000); if (boxing) g.castSpell('shadow-boxing');
    const w = g.glyphWorld(100000), dir = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [Math.cos(k * Math.PI / 4), Math.sin(k * Math.PI / 4)]).find(([dx, dy]) => { for (let d = .25; d <= 4; d += .25) if (!w.canStand(g.player.x + dx * d, g.player.y + dy * d)) return false; return true; });
    assert.ok(dir, 'an open line in the room'); const foe = Object.assign(createCombatant('rootBrute', g.player.x + dir[0] * 3, g.player.y + dir[1] * 3), { id: 'resume-foe', hp: 1e9, maxHp: 1e9, damage: 0, cooldown: 99, speed: 0, speedMultiplier: 1e-6, meleePatterns: [] });
    g.enemies = [foe]; g.save.lastAim = { x: dir[0], y: dir[1] }; g.lastUpdateNow = 100008; g.cycloneBegin(100008, false, false);
    for (let t = 100016; t <= 100008 + cut; t += 8) g.update(.008, calm, t);
    const q = structuredClone(g.cycloneHeel); assert.ok(q && q.spun < q.spins && q.elapsedMs > 0, `mid-spin (${boxing}, ${cut})`); assert.equal(q.mode, boxing ? 'shadow' : 'travel');
    const save = deserializeSave(serializeSave(g.exportSnapshot(100008 + cut))); assert.equal(save.version, 14);
    const back: any = new Game(save, 500000); back.installSystems();
    assert.deepEqual(back.cycloneHeel, normalizeCycloneHeel(q)); assert.equal(back.player.x, g.player.x); assert.equal(back.player.y, g.player.y);
    const bf = back.enemies.find((e: any) => e.id === foe.id) || Object.assign(createCombatant('rootBrute', foe.x, foe.y), { ...foe }); back.enemies = [bf];
    const play = (h: any, from: number, f: any) => { const out: any[] = []; for (let t = from; t < from + 1200; t += 8) { h.update(.008, calm, t); out.push([Math.round(h.player.x * 1e6), Math.round(h.player.y * 1e6), f.hp, h.cycloneHeel?.spun ?? -1]); } return out; };
    assert.deepEqual(play(back, 500008, bf), play(g, 100016 + cut, foe), `resume (${boxing}, cut ${cut} ms)`);
  }
});

test('drawing: both views draw the spin without allocation surprises; Close View poses a leg out and turns', () => {
  const calls = { arc: 0, lineTo: 0 }, ctx = new Proxy({}, { get: (o: any, k: any) => k in o ? o[k] : k === 'arc' ? () => calls.arc++ : k === 'lineTo' ? () => calls.lineTo++ : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
  const { g, clock } = leap(); tap(g, clock); frame(g, clock); g.lastUpdateNow = clock.t;
  drawBrawler(ctx, g, (q: any) => [q.x * 32, q.y * 32], 32, clock.t / 1000); drawBrawler(ctx, g, (q: any) => [q.x * 32, q.y * 32], 32, clock.t / 1000, {});
  assert.ok(calls.arc >= 4 && calls.lineTo >= 2);
});

test('stress: 60 s of the whole loop with every condition on, Shadow Boxing flickering, cooldowns wiped: finite and bounded', () => {
  let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const { g, clock } = arena({ foes: [[1.2, 0], [-1.2, 0], [0, 1.2], [3, 3]] }); let holding = 0, spins = 0;
  const own = g.cycloneSpin.bind(g); g.cycloneSpin = (...a: any[]) => { spins++; return own(...a); };
  for (let i = 0; i < 60 / DT; i++) {
    g.player.stamina = 100; g.player.hp = Math.max(g.player.hp, 1); for (const e of g.enemies) { e.hp = 1e7; e.dead = false; }
    if (rnd() < .01) g.boxingUntil = rnd() < .5 ? clock.t + 3000 : 0;
    if (g.weaponArts) { g.weaponArts.armed = true; g.weaponArts.art = 'ki-blast'; } // cooldowns and arming wiped every frame
    if (g.kiSlam === false && rnd() < .02) { g.kiSlam = true; g.kiSlamJump = g.jumpStart; }
    const r = rnd(), pressed: string[] = [], held: string[] = [];
    if (holding > 0) { holding--; held.push('attack'); } else if (r < .3) { pressed.push('attack'); if (rnd() < .5) { holding = Math.floor(rnd() * 70); held.push('attack'); } }
    else if (r < .32) pressed.push('dodge'); else if (r < .34) pressed.push('jump');
    frame(g, clock, { pressed, held });
    const q = g.cycloneHeel; if (q) { assert.ok(q.spun <= q.spins && q.elapsedMs <= q.durationMs && q.travelled <= C.maxTiles + 1e-9); assert.ok(Number.isFinite(q.power) && q.power > 0); }
    if (g.cycloneHold) assert.ok(clock.t - g.cycloneHold.start <= C.holdMs + 2 * DT * 1000, 'a hold never outlives its cap');
    assert.ok(Number.isFinite(g.player.x) && Number.isFinite(g.player.y)); for (const e of g.enemies) assert.ok(Number.isFinite(e.hp));
    assert.ok(g.effects.length < 80, `effects bounded (${g.effects.length})`);
  }
  assert.ok(spins > 0, `it spun (${spins})`);
  idle(g, clock, 200); assert.equal(g.cycloneHeel, null); assert.equal(g.cycloneHold, null); assert.equal(g.fistNextStep(clock.t), 1);
});

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8')), raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url)), asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
test('Close View: one leg held out while the body turns once a spin; finite, the record\'s own pose at both ends; reduced motion keeps the leg, not the turn', () => {
  const sample = (action: any, reducedMotion = false) => { const st = createHeroPoseState(asset), f = createHeroFrame(asset); assert.ok(sampleCloseViewHero(asset, st, { nowMs: 2000, reducedMotion, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, heldProfile: null, handProfile: 'fist', action, alpha: 1, tint: [1, 1, 1], hitFlash: 0 }, f)); return { st, f }; };
  const act = (phase: number, art: any = 'cyclone-heel') => ({ kind: 'melee', profile: 'fist', awakenedArt: art, phase, durationMs: 550, poseMs: 2000, fistStep: 4, fistLead: 'right' });
  const low = (f: any) => { let n = 0; for (let i = 0; i < f.positionsNormals.length; i += 6) if (f.positionsNormals[i + 2] < .08) n++; return n; };
  const still = sample(null).f;
  for (const reducedMotion of [false, true]) {
    for (const phase of [0, .05, .3, .5, .7, .95, 1]) { const a = sample(act(phase), reducedMotion); assert.ok(a.f.positionsNormals.every(Number.isFinite), `${phase}`); if (phase > 0 && phase < 1) assert.equal(a.st.clip, 'derived-cyclone-heel'); }
    for (const phase of [0, 1]) { const a = sample(act(phase), reducedMotion).f, b = sample(act(phase, undefined), reducedMotion).f; for (let i = 0; i < a.positionsNormals.length; i++) assert.ok(Math.abs(a.positionsNormals[i] - b.positionsNormals[i]) < 1e-6, `at ${phase}: the record's own pose`); }
    const mid = sample(act(.5), reducedMotion).f; assert.ok(low(mid) < low(still) * .8, `a foot off the floor (${low(mid)} vs ${low(still)})`);
  }
  // turning: the body faces a different way a tenth of a spin apart (not with reduced motion)
  const facing = (f: any) => { let x = 0, y = 0; for (let i = 0; i < f.positionsNormals.length; i += 6) { x += f.positionsNormals[i]; y += f.positionsNormals[i + 1]; } return [x, y]; };
  const [a, b] = [sample(act(.5)).f, sample(act(.52)).f].map(facing), [c, d] = [sample(act(.5), true).f, sample(act(.52), true).f].map(facing);
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > Math.hypot(c[0] - d[0], c[1] - d[1]) + 1e-3, 'it turns');
});

// Frame sequences (Tim, 2026-11-15: "AAA feel... eased wind-up and recovery, readable spins with follow-through, smooth Shadow
// Boxing teleport-in, clean landing blend"): measured at 60 fps in both views; nothing may pop.
test('frame sequence, Close View: an eased wind-up, continuous spin speed, follow-through to rest on the heading; no body pop', () => {
  const st = createHeroPoseState(asset), f = createHeroFrame(asset), M: any = { stage: '', turn: 0, chamber: 0, extend: 0, weight: 0 };
  const pose = (action: any) => { sampleCloseViewHero(asset, st, { nowMs: 2000, reducedMotion: false, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, heldProfile: null, handProfile: 'fist', action, alpha: 1, tint: [1, 1, 1], hitFlash: 0 }, f); return Float64Array.from(f.positionsNormals); };
  for (const windup of [C.windupMs, SHADOW_DASH.maxMs]) for (const span of [C.spins * C.spinMs, C.shadow.spanMs]) {
    const D = windup + span + C.recoverMs, w = windup / D, r = C.recoverMs / D, n = Math.ceil(D / (1000 / 60)); let prev: any = null, prevStep = 0, prevTurn = 0, prevSpeed = 0;
    for (let i = 0; i <= n; i++) {
      const p = i / n, m = sampleCycloneMotion(p, w, r, M), pos = pose({ kind: 'melee', profile: 'fist', awakenedArt: 'cyclone-heel', cycloneWindup: w, cycloneRecover: r, phase: p, durationMs: D, poseMs: 2000, fistStep: 4, fistLead: 'right' });
      const c = Math.cos(-2 * Math.PI * m.turn), s = Math.sin(-2 * Math.PI * m.turn); for (let k = 0; k < pos.length; k += 6) { const x = pos[k], y = pos[k + 1]; pos[k] = x * c - y * s; pos[k + 1] = x * s + y * c; }
      if (prev) { let d = 0; for (let k = 0; k < pos.length; k += 6) d = Math.max(d, Math.hypot(pos[k] - prev[k], pos[k + 1] - prev[k + 1], pos[k + 2] - prev[k + 2]));
        assert.ok(d < .25, `${windup}/${span} at ${p.toFixed(2)}: the body moves ${d.toFixed(3)} m in a frame`); assert.ok(Math.abs(d - prevStep) < .12, `${windup}/${span} at ${p.toFixed(2)}: no jolt (${prevStep.toFixed(3)} -> ${d.toFixed(3)})`); prevStep = d; }
      const speed = m.turn - prevTurn; if (i > 1) assert.ok(Math.abs(speed - prevSpeed) < .06, `${windup}/${span} at ${p.toFixed(2)}: the spin's speed is continuous`); prevSpeed = speed; prevTurn = m.turn; prev = pos;
      if (i === 0 || i === n) assert.ok(Math.abs(m.turn - (i ? CYCLONE_MOTION.turns : 0)) < 1e-9 && Math.abs(speed) < .02, 'starts and ends at rest, on whole turns (her heading)');
    }
  }
});

test('frame sequence, gameplay and standard view: travel without jumps, a travelled Shadow Boxing approach, the drawn leg turning smoothly', () => {
  for (const boxing of [false, true]) {
    const { g, clock } = leap({ foes: [[4.5, 0]] }); if (boxing) g.boxingUntil = 1e12; const dt = 1 / 60;
    const angles: number[] = [], pos: number[][] = [];
    const ctx: any = new Proxy({}, { get: (o: any, k: any) => k in o ? o[k] : k === 'lineTo' ? (x: number, y: number) => { o._lx = x; o._ly = y; } : k === 'moveTo' ? (x: number, y: number) => { o._mx = x; o._my = y; } : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
    tap(g, clock); const step = () => { g.player.invulnerableUntil = clock.t + 1e6; g.update(dt, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, clock.t); clock.t += dt * 1000; };
    for (let i = 0; i < 200 && (i === 0 || g.cycloneHeel); i++) {
      step(); if (!g.cycloneHeel) break; pos.push([g.player.x, g.player.y]); g.lastUpdateNow = clock.t;
      ctx._lx = NaN; drawBrawler(ctx, g, (q: any) => [q.x * 32, q.y * 32], 32, clock.t / 1000);
      if (Number.isFinite(ctx._lx)) angles.push(Math.atan2(ctx._ly - ctx._my, ctx._lx - ctx._mx));
    }
    for (let i = 1; i < pos.length; i++) { const d = Math.hypot(pos[i][0] - pos[i - 1][0], pos[i][1] - pos[i - 1][1]); assert.ok(d <= .55, `${boxing ? 'approach' : 'travel'}: ${d.toFixed(3)} tiles in a frame`); }
    assert.ok(pos.length > 30, `drawn over many frames (${pos.length})`);
    let big = 0; for (let i = 1; i < angles.length; i++) { let da = Math.abs(angles[i] - angles[i - 1]) % (2 * Math.PI); da = Math.min(da, 2 * Math.PI - da); big = Math.max(big, da); }
    assert.ok(big < Math.PI * .75, `the drawn leg never jumps more than ${(big * 180 / Math.PI).toFixed(0)} deg a frame (readable turns)`);
  }
});
