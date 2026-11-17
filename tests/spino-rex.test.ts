// The Spinosaurus (Tim, 2026-11-12: "The Hunter of Hunters"): a world beast of the land, met too in big rooms and as the interloper in a
// stego or stag fight. Its moves, the fossil shed, the grab, bleed, the interloper, spawning, determinism and the four-build duel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_PACK, ATTACK_MODULES, SPINO, BOSS_POISE, PACK_KINDS, validateMonster, updatePackMonster, tickPackEffects, addPackEffect, resetPackRuntime, spinoPrey, spinoPreferredPrey, staggerClass } from '../src/monster-pack.ts';
import { WORLD_BEASTS, WORLD_BEAST_IDS, BEAST_APERTURE, PLACEMENT, PASSING, ensureWorldBeasts, worldBeastFor, passingBeastFor, tuneWorldBeast } from '../src/world-beasts.ts';
import { SPINO_ROOMS, SPINO_INTERLOPER, spinoRoomSpawn, interloperRoll, interloperPrey, interloperSpot, ensureSpinoState, noteInterloper, shakeOffset, drawBiteMark } from '../src/spino-rex.ts';
import { BLEED, applyBleed, tickBleed, ensureBleed, clearBleed, tickCreatureBleed, drawBleedIcon, bleedStillShare } from '../src/bleed.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster, drawPackEffects, SPINO_EFFECT_KINDS } from '../src/monster-render.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, generatePinnedDungeon, characterStats, tuneSpinoBeast, regionalScale } from '../src/game.ts';
import { regionalThreat } from '../src/world.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';

const ATTACKS = MONSTER_PACK.spinoRex.attacks;
// A headless world: `size` square, everything open. It records hurts, bleeds, bite marks, shakes, the hold, the carry and the throw.
function world({ size = 64, player = { x: 16, y: 14 } } = {}) {
  const open = (x, y) => { const tx = Math.floor(x + .5), ty = Math.floor(y + .5); return tx >= 0 && ty >= 0 && tx < size && ty < size; };
  const w = {
    player: { ...player, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], creatureHits: [], bleeds: 0, bites: 0, shakes: 0, says: [], hold: null, carried: 0, thrown: 0, dodging: false,
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true, map: { objects: [] }, oceanAt: () => false, playerVelocity: { x: 0, y: 0 },
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { if (w.dodging && !opts.piercing) return false; w.hurts.push({ amount, source: opts.source, at: { ...w.player }, t: w.now }); return true; },
    hurtCreature(source, q, amount) { w.creatureHits.push({ id: q.id, amount }); q.hp -= amount; if (q.hp <= 0) { q.dead = true; q.noRewards = true; } return true; },
    bleed() { w.bleeds++; return true; }, biteMark() { w.bites++; }, shake() { w.shakes++; }, say(t) { w.says.push(t); },
    spinoHold(source, seconds) { if (w.dodging) return false; w.hold = { id: source.id, until: w.now + seconds * 1000 }; return true; },
    held(source) { return !!w.hold && w.hold.id === source.id && w.now < w.hold.until; }, release(source) { if (w.hold?.id === source.id) w.hold = null; },
    carry(x, y) { w.player.x = x; w.player.y = y; w.carried++; }, throwPlayer(source, dir, dist) { w.player.x += dir.x * dist; w.player.y += dir.y * dist; w.thrown++; },
    slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {}, ignite() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
function spino(w, only = null, x = 12, y = 14, id = 'spino-1') {
  const e = createCombatant('spinoRex', x, y, true, []); Object.assign(e, { id, aggro: true, hp: 9000, maxHp: 9000, damage: 40 });
  e.packAttacks = only ? [only] : [...ATTACKS]; e.pack.gap = 0; e.pack.cd.spinoInfight = 99; w.enemies.push(e); return e;
}
const FIELDS = ['x', 'y', 'hp', 'spinoAir', 'spinoDig', 'spinoShed'];
function finite(e) { for (const k of FIELDS) assert.ok(Number.isFinite(e[k]), `${k} is ${e[k]}`); assert.equal(typeof e.spinoFossil, 'boolean'); if (e.spinoGrab) assert.ok(['track', 'lunge', 'hold', 'throw'].includes(e.spinoGrab.phase) && Number.isFinite(e.spinoGrab.t), JSON.stringify(e.spinoGrab)); }
function step(w, seconds, each = () => {}) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); for (const e of w.enemies) if (e.kind === 'spinoRex') finite(e); each(); } }
function until(w, e, id, max = 12) { for (let t = 0; t < max && e.pack.attack !== id; t += w.dt) step(w, w.dt); assert.equal(e.pack.attack, id, `${id} starts`); }
const by = (w, ...sources) => w.hurts.filter((h) => sources.includes(h.source)).length;
const SETUP = {
  spinoBite: { at: [2.6, 0], src: ['spinoBite'] }, spinoClaw: { at: [2.2, 0], src: ['spinoClaw'] }, spinoLeapSlam: { at: [6, 0], src: ['spinoLeapSlam', 'shockwave'] },
  spinoDigFling: { at: [5, 0], src: ['spinoDigFling'] }, spinoRoar: { at: [3, 0], src: ['spinoRoar'] }, spinoTailSwipe: { at: [0, 2.4], face: [1, 0], src: ['spinoTailSwipe'] },
  spinoBodySlam: { at: [7, 0], src: ['spinoBodySlam'] }, spinoGrab: { at: [4, 0], src: ['spinoGrab'] },
  spinoBoneVolley: { at: [6, 0], fossil: true, late: true, src: ['spinoBoneVolley', 'spinoBoneBurst'] }, spinoRibSpears: { at: [2.5, 0], fossil: true, src: ['spinoRibSpears'] },
};
function arena(id, away = false) {
  const S = SETUP[id], w = world({ player: { x: 12 + S.at[0], y: 14 + S.at[1] } }), e = spino(w, id);
  if (S.face) e.spinoHeading = { x: S.face[0], y: S.face[1] }; if (S.fossil) { e.spinoFossil = true; e.spinoShed = 1; }
  until(w, e, id); let tele = false;
  if (away && !S.late) { tele = !!e.pack.tele; w.player.x = 60; w.player.y = 60; }
  while (e.pack.phase === 'windup' && e.pack.attack === id) { if (e.pack.tele) tele = true; assert.equal(by(w, ...S.src), 0, `${id}: nothing lands in the windup`); step(w, w.dt); }
  if (S.late) { tele ||= w.fx.some((f) => f.kind === 'spinoBone' && f.arming > 0); if (away) { w.player.x = 60; w.player.y = 60; } }
  step(w, 7, () => { if (away) { w.player.x = 60; w.player.y = 60; } e.packAttacks = []; });
  return { w, e, tele };
}

test('registry: a huge unique world beast of the land, ten moves (two bone-only), its own poise, pose defaults, no Echo', () => {
  const def = MONSTER_PACK.spinoRex, B = WORLD_BEASTS.spinoRex;
  assert.deepEqual(validateMonster(def), []); assert.ok(PACK_KINDS.includes('spinoRex')); assert.equal(def.render, 'spinoRex'); assert.ok(def.unique && !def.noEcho); assert.equal(def.name, 'The Spinosaurus');
  assert.equal(ATTACKS.length, 10); for (const id of ATTACKS) assert.ok(ATTACK_MODULES[id] && SETUP[id], id); assert.deepEqual(SPINO.fossilOnly, ['spinoBoneVolley', 'spinoRibSpears']);
  assert.equal(WORLD_BEAST_IDS.at(-1), 'spinoRex', 'listed last: every older beast rolls as it did'); assert.equal(B.kind, 'spinoRex'); assert.ok(BEAST_APERTURE.spinoRex); assert.ok(PLACEMENT.bigBeasts.includes('spinoRex')); assert.ok(BOSS_POISE.spinoRex);
  const e = createCombatant('spinoRex', 0, 0, true, []), stego = createCombatant('wildStego', 0, 0, true, []); assert.ok(e.scale > stego.scale, 'bigger than the Wild Stegosaurus');
  assert.deepEqual([e.spinoPose, e.spinoAir, e.spinoGrab, e.spinoDig, e.spinoFossil, e.spinoShed], [null, 0, null, 0, false, 0]);
  assert.equal(staggerClass({ spinoRoom: true }), 'boss'); assert.equal(staggerClass({ spinoInterloper: 'x' }), 'boss');
});

for (const id of Object.keys(SETUP)) test(`${id}: a telegraph first, then blows only on contact; every frame finite`, () => {
  const near = arena(id); assert.ok(near.tele, `${id} shows where it will strike`); assert.ok(by(near.w, ...SETUP[id].src) >= 1, `${id} lands on a Wayfarer who stays (${near.w.hurts.map((h) => h.source).join(',')})`);
  const far = arena(id, true); assert.equal(by(far.w, ...SETUP[id].src), 0, `${id} never lands on a Wayfarer out of its reach`);
});

test('the poses the art reads appear for their moves', () => {
  const want = { spinoBite: ['bite'], spinoClaw: ['clawL', 'clawR'], spinoLeapSlam: ['leap', 'headSlam', 'plough'], spinoDigFling: ['dig', 'fling'], spinoRoar: ['roarReady', 'roar'], spinoTailSwipe: ['tailL', 'tailR'], spinoBodySlam: ['run', 'lunge', 'landBite'], spinoGrab: ['grabTrack', 'grabLunge', 'grabHold', 'grabThrow'], spinoBoneVolley: ['boneLaunch'], spinoRibSpears: ['ribsOut', 'ribsThrust'] };
  for (const [id, poses] of Object.entries(want)) { const S = SETUP[id], w = world({ player: { x: 12 + S.at[0], y: 14 + S.at[1] } }), e = spino(w, id), seen = new Set(), grab = new Set(); let air = 0, dig = 0;
    if (S.face) e.spinoHeading = { x: S.face[0], y: S.face[1] }; if (S.fossil) { e.spinoFossil = true; e.spinoShed = 1; }
    until(w, e, id); step(w, 6, () => { seen.add(e.spinoPose); air = Math.max(air, e.spinoAir); dig = Math.max(dig, e.spinoDig); if (e.spinoGrab) grab.add(e.spinoGrab.phase); e.packAttacks = []; });
    for (const p of poses) assert.ok(seen.has(p), `${id}: ${p} (seen ${[...seen].join(',')})`);
    if (id === 'spinoLeapSlam' || id === 'spinoBodySlam') assert.ok(air > 1.5, `${id} leaves the ground`); if (id === 'spinoDigFling') assert.equal(dig, 1);
    if (id === 'spinoGrab') assert.deepEqual([...grab].sort(), ['hold', 'lunge', 'throw', 'track']);
    assert.equal(e.spinoGrab, null); assert.equal(e.spinoDig, 0); assert.equal(e.spinoAir, 0); }
});

test('the roar: a wide ring, three blows no dodge passes (only distance), a shake; survivable at full health', () => {
  const w = world({ player: { x: 15, y: 14 } }), e = spino(w, 'spinoRoar'); w.dodging = true; until(w, e, 'spinoRoar'); assert.equal(e.pack.tele.type, 'ring'); assert.ok(e.pack.tele.radius >= 7);
  step(w, 4, () => { e.packAttacks = []; }); assert.equal(by(w, 'spinoRoar'), SPINO.roar.hits, 'each blow lands, dodging or not'); assert.ok(w.shakes >= 1);
  assert.ok(SPINO.roar.hits * SPINO.roar.share * ATTACK_MODULES.spinoRoar.damage < 2, 'all its blows together: under two plain blows');
  assert.ok(ATTACK_MODULES.spinoRoar.windup >= 1.2, 'a clear windup');
});

test('rocks, bones and furrows are bounded; the bones that miss land and burst on marked ground', () => {
  const w = world({ player: { x: 18, y: 14 } }), e = spino(w, 'spinoDigFling'); until(w, e, 'spinoDigFling'); let rocks = 0; step(w, 4, () => { rocks = Math.max(rocks, w.fx.filter((f) => f.kind === 'spinoRock').length); e.packAttacks = []; });
  assert.ok(rocks >= SPINO.dig.rocks && rocks <= SPINO.dig.cap, `${rocks} rocks`);
  const b = world({ player: { x: 18, y: 14 } }), f = spino(b, 'spinoBoneVolley'); f.spinoFossil = true; f.spinoShed = 1; until(b, f, 'spinoBoneVolley'); let bones = 0, bursts = 0;
  step(b, 1.2, () => { bones = Math.max(bones, b.fx.filter((q) => q.kind === 'spinoBone').length); }); b.player.x = 40; step(b, 4, () => { bursts += b.fx.filter((q) => q.kind === 'spinoBoneBurst' && q.arming > 0).length ? 1 : 0; f.packAttacks = []; });
  assert.ok(bones >= 1 && bones <= SPINO.bones.cap, `${bones} bones`); assert.ok(bursts > 0, 'missed bones mark the ground, then burst'); assert.ok(b.fx.length <= 48);
  const l = world({ player: { x: 18, y: 14 } }), g = spino(l, 'spinoLeapSlam'); until(l, g, 'spinoLeapSlam'); let cracks = 0; step(l, 4, () => { cracks = Math.max(cracks, l.fx.filter((q) => q.kind === 'spinoFurrow').length); g.packAttacks = []; });
  assert.ok(cracks >= 2 && cracks <= SPINO.leap.crackCap, `${cracks} furrow marks`);
});

test('the fossil: at half health its flesh falls away for good (the shed), and only then its bone moves', () => {
  const w = world({ player: { x: 15, y: 14 } }), e = spino(w); e.packAttacks = ['spinoBite', 'spinoBoneVolley', 'spinoRibSpears']; const before = new Set();
  step(w, 20, () => { if (e.pack.attack) before.add(e.pack.attack); if (e.pack.data?.prey) assert.fail('no prey here'); }); assert.ok(!before.has('spinoBoneVolley') && !before.has('spinoRibSpears'), [...before].join(',')); assert.equal(e.spinoFossil, false);
  e.hp = Math.round(e.maxHp * .51); step(w, .1); assert.equal(e.spinoFossil, false, 'above half: still flesh');
  e.hp = Math.round(e.maxHp * .5); step(w, w.dt); assert.equal(e.spinoFossil, true); assert.equal(e.spinoPose, 'shed'); assert.ok(w.fx.some((f) => f.kind === 'spinoFlesh')); assert.ok(w.says.length);
  let shed = 0, shedFrames = 0; step(w, SPINO.fossil.shed + .1, () => { shed = Math.max(shed, e.spinoShed); if (e.spinoPose === 'shed') { shedFrames++; assert.equal(e.pack.attack, null, 'it does not attack while it sheds'); } }); assert.equal(shed, 1); assert.ok(shedFrames > 30);
  const after = new Set(); step(w, 30, () => { if (e.pack.attack) after.add(e.pack.attack); }); assert.ok(after.has('spinoBoneVolley') || after.has('spinoRibSpears'), [...after].join(','));
  e.hp = e.maxHp; step(w, .5); assert.equal(e.spinoFossil, true, 'healed or not, bone for good');
  resetPackRuntime(e); assert.equal(e.spinoFossil, true); assert.equal(e.spinoShed, 1, 'a reload keeps it bone');
});

test('the grab: dodge the reticle and it closes on nothing; caught, you are held (no act), chewed (bleed, bite marks) and thrown', () => {
  // stepped out after the reticle locked
  const a = world({ player: { x: 16, y: 14 } }), e = spino(a, 'spinoGrab'); until(a, e, 'spinoGrab'); assert.ok(e.pack.tele.reticle);
  const followed = []; while (e.pack.phase === 'windup') { followed.push(e.pack.tele.locked ? null : { x: e.pack.tele.x }); assert.equal(e.spinoGrab.x, e.pack.tele.x); assert.equal(e.spinoGrab.y, e.pack.tele.y); assert.equal(e.spinoGrab.k, 0); if (e.pack.t <= SPINO.grab.lockAt && !a.moved) { a.player.y += 3; a.moved = true; } a.player.x = a.moved ? a.player.x : a.player.x + .02; step(a, a.dt); }
  assert.ok(followed.filter(Boolean).length > 10, 'the reticle follows you while it winds up'); step(a, 3); assert.equal(a.hold, null); assert.equal(by(a, 'spinoGrab'), 0); assert.equal(a.bleeds, 0);
  // a dodge as it closes
  const d = world({ player: { x: 16, y: 14 } }), f = spino(d, 'spinoGrab'); until(d, f, 'spinoGrab'); d.dodging = true; step(d, 2.4); d.dodging = false; step(d, 3); assert.equal(by(d, 'spinoGrab'), 0); assert.equal(d.thrown, 0);
  // caught
  const c = world({ player: { x: 16, y: 14 } }), g = spino(c, 'spinoGrab'); until(c, g, 'spinoGrab'); let heldFrames = 0, lifted = 0;
  let ks = 0; step(c, 6, () => { if (g.spinoGrab?.phase === 'lunge') { ks = Math.max(ks, g.spinoGrab.k); assert.ok(Number.isFinite(g.spinoGrab.x)); } if (c.hold && c.now < c.hold.until) heldFrames++; if (g.spinoGrab?.phase === 'hold') { lifted++; assert.equal(g.spinoGrab.who, 'player'); } g.packAttacks = []; });
  assert.ok(heldFrames >= SPINO.grab.hold * 30 * .9, `held ${heldFrames} frames`); assert.ok(c.carried > 30 && lifted > 30, 'carried in its jaws');
  assert.equal(by(c, 'spinoGrab'), SPINO.grab.chews + 1, 'three chews and the throw'); assert.equal(c.bleeds, SPINO.grab.chews); assert.equal(c.bites, SPINO.grab.chews); assert.equal(c.thrown, 1); assert.equal(c.hold, null, 'let go'); assert.equal(ks, 1, 'the jaws close as the lunge ends');
});

test('the grab in the game: held fast (no move, no dodge, no potion), released by the throw', () => {
  const s = freshSave(); s.seed = 'SPINO-GRAB'; const g = new Game(s, 0); g.enemies = []; const p = g.player; s.maxHp = p.maxHp = p.hp = 1e6;
  const e = createCombatant('spinoRex', p.x + 2, p.y, false, []); Object.assign(e, { id: 'grabber', aggro: true }); const w = g.packWorld(1 / 30, 1000);
  assert.equal(w.spinoHold(e, 2), true); assert.ok(p.heldFirm); const x0 = p.x, y0 = p.y; let consumed = 0, pressed = false;
  g.update(1 / 30, { state: { x: 1, y: 0 }, consume: (k) => { consumed++; if (k !== 'dodge' || pressed) return false; pressed = true; return true; }, held: () => false, reset() {} }, 1100); assert.equal(p.x, x0); assert.equal(p.y, y0); assert.ok(consumed >= 5, 'every action is swallowed');
  assert.ok(1100 < p.heldUntil, 'a dodge does not shorten its hold');
  g.packWorld(1 / 30, 1200).release(e); assert.equal(p.heldUntil, 0); assert.equal(p.heldFirm, false);
  p.dodgeUntil = 5000; assert.equal(g.packWorld(1 / 30, 1300).spinoHold(e, 2), false, 'mid-dodge it closes on nothing');
  g.packWorld(1 / 30, 1300).biteMark(e); assert.equal(g.spinoBiteMark, 1); g.update(1 / 30, { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} }, 1340); assert.ok(g.spinoBiteMark > 0 && g.spinoBiteMark < 1, 'the bite mark fades');
});

test('it grabs other creatures too: the Wild Stegosaurus is lifted, chewed (it bleeds) and dropped, never taken below its floor', () => {
  const w = world({ player: { x: 50, y: 50 } }), e = spino(w, null, 12, 14); e.packAttacks = ['spinoGrab'];
  const st = createCombatant('wildStego', 16, 14, true, []); Object.assign(st, { id: 'stego', hp: 3000, maxHp: 3000, aggro: true, worldBeast: 'wildStego' }); st.packAttacks = []; w.enemies.push(st);
  assert.ok(spinoPreferredPrey(st, e)); let held = 0, run = 0, still = true, pinned = null;
  step(w, 20, () => { if (e.spinoGrab?.who === 'stego' && e.spinoGrab.phase === 'hold') { held++; assert.equal(st.spinoHeldBy, 'spino-1'); run++; if (run > 2 && pinned && Math.hypot(st.x - pinned.x, st.y - pinned.y) > .05) still = false; pinned = { x: st.x, y: st.y }; } else { run = 0; pinned = null; } });
  assert.ok(held >= SPINO.grab.creatureHold * 30 * .9, `held ${held} frames`); assert.ok(still); assert.ok(st.spinoBleed > 0 || w.creatureHits.length > SPINO.grab.creatureChews, 'it bleeds');
  assert.ok(w.creatureHits.filter((h) => h.id === 'stego').length >= SPINO.grab.creatureChews); assert.ok(!st.dead && st.hp >= Math.ceil(st.maxHp * SPINO.hunt.floor) - 1, `the kill stays yours (${st.hp})`);
  assert.equal(w.hurts.length, 0, 'you were far off');
});

test('prey first: the stego or the stag before you; then other creatures it sees (one-off); never another Spinosaurus', () => {
  const w = world({ player: { x: 17, y: 14 } }), e = spino(w, null, 12, 14); e.packAttacks = ['spinoBite', 'spinoClaw', 'spinoBodySlam', 'spinoGrab'];
  const stag = createCombatant('briarStag', 12, 19, true, []); Object.assign(stag, { id: 'stag', hp: 4000, maxHp: 4000, aggro: true }); stag.packAttacks = []; w.enemies.push(stag);
  let onPrey = 0, onYou = 0; step(w, 40, () => { if (e.pack.attack ? e.pack.data?.prey === 'stag' : e.pack.spinoFocus === 'stag') onPrey++; else onYou++; });
  assert.ok(onPrey > onYou * 1.5 && onYou > 0, `${onPrey} frames on the stag, ${onYou} on you`); assert.ok(w.creatureHits.some((h) => h.id === 'stag'));
  const other = createCombatant('spinoRex', 0, 0, false, []); assert.ok(!spinoPrey(other, e) && !spinoPreferredPrey(other, e));
  const ash = createCombatant('ashling', 0, 0, false, []); Object.assign(ash, { id: 'ash' }); assert.ok(spinoPrey(ash, e)); assert.ok(!spinoPreferredPrey(ash, e));
  const v = world({ player: { x: 40, y: 40 } }), f = spino(v); f.packAttacks = ['spinoBite']; f.pack.cd.spinoInfight = 0; const q = createCombatant('ashling', 16, 14, false, []); Object.assign(q, { id: 'prey', hp: 30, maxHp: 30 }); v.enemies.push(q);
  let used = null; step(v, 14, () => { if (f.pack.data?.prey === 'prey') used = f.pack.attack; }); assert.ok(q.dead, 'it took the creature'); assert.ok(['spinoBodySlam', 'spinoGrab'].includes(used), used); assert.equal(q.spinoBleed, undefined, 'it does not bleed other creatures');
});

// ------------------------------------------------------------------------------------------------ bleed
test('bleed: a minute, only moving hurts, about a fifth of max health over the whole minute; refreshed, never stacked', () => {
  const s = freshSave(); assert.deepEqual(ensureBleed(s), { left: 0, still: 0, tick: 0, owed: 0 }); assert.equal(BLEED.seconds, 60); assert.equal(BLEED.totalShare, .2); assert.equal(BLEED.stillSeconds, 4);
  assert.equal(applyBleed(s), true); assert.equal(s.bleed.left, 60); let total = 0; for (let t = 0; t < 70; t += 1 / 30) total += tickBleed(s, 1 / 30, true, 500).damage;
  assert.ok(Math.abs(total - 100) <= 1, `moving all the way: ${total} of 500`); assert.equal(s.bleed.left, 0);
  applyBleed(s); let still = 0; for (let t = 0; t < 3.5; t += 1 / 30) still += tickBleed(s, 1 / 30, false, 500).damage; assert.equal(still, 0, 'standing still costs nothing'); assert.ok(bleedStillShare(s) > .8);
  const twice = freshSave(); applyBleed(twice); let n = 0; for (let t = 0; t < 30; t += 1 / 30) n += tickBleed(twice, 1 / 30, true, 500).damage; assert.equal(applyBleed(twice), false, 'refreshed, not a new bleed'); assert.equal(twice.bleed.left, 60);
  for (let t = 0; t < 30; t += 1 / 30) n += tickBleed(twice, 1 / 30, true, 500).damage; assert.ok(Math.abs(n - 100) <= 2, `a refresh does not raise the rate (${n} in 60 s)`); assert.ok(twice.bleed.left > 25);
});

test('bleed: standing still 4 s unbroken cures it; moving resets the count', () => {
  const s = freshSave(); applyBleed(s); let cured = false;
  for (let t = 0; t < 3; t += 1 / 30) cured ||= tickBleed(s, 1 / 30, false, 200).cured; tickBleed(s, 1 / 30, true, 200); assert.equal(s.bleed.still, 0); assert.ok(!cured);
  for (let t = 0; t < 3.9; t += 1 / 30) cured ||= tickBleed(s, 1 / 30, false, 200).cured; assert.ok(!cured, 'not quite four seconds');
  for (let t = 0; t < .3; t += 1 / 30) cured ||= tickBleed(s, 1 / 30, false, 200).cured; assert.ok(cured); assert.equal(s.bleed.left, 0);
  clearBleed(s); assert.equal(s.bleed.left, 0);
});

test('bleed in the game: a landed bite bleeds; moving hurts, standing heals nothing away but cures; potions do not cure; it survives save and resume', () => {
  const s = freshSave(); s.seed = 'SPINO-BLEED'; s.maxHp = 600; const g = new Game(s, 0); g.enemies = []; const p = g.player; p.hp = 600; s.consumables = { ...(s.consumables || {}), healingPotion: 9 };
  assert.equal(g.packWorld(1 / 30, 1000).bleed({}), true); assert.equal(s.bleed.left, 60);
  let now = 1000; const go = (x, sec) => { for (let t = 0; t < sec; t += 1 / 30) { now += 1000 / 30; g.update(1 / 30, { state: { x, y: 0 }, consume: () => false, held: () => false, reset() {} }, now); } };
  const hp0 = p.hp; go(1, 3); assert.ok(p.hp < hp0, 'moving bleeds'); p.hp = 300; g.drinkPotion(now); assert.ok(s.bleed.left > 0, 'a potion heals, but the wound still bleeds');
  const back = deserializeSave(serializeSave(g.exportSnapshot(500))); assert.ok(back.bleed.left > 50 && back.bleed.left <= 60, 'exact resume keeps it'); assert.equal(back.version, 14); assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(back))).bleed, back.bleed);
  const r = new Game(back, 600); assert.ok(r.save.bleed.left > 50);
  go(0, 1.1); const hp1 = p.hp; go(0, 2.4); assert.ok(p.hp >= hp1, 'standing still costs nothing'); assert.ok(s.bleed.left > 0); go(0, .7); assert.equal(s.bleed.left, 0, 'four still seconds cure it');
});

test('bleed on the Wild Stegosaurus: it runs its minute (a fifth of its health); no other creature bleeds', () => {
  const st = { kind: 'wildStego', maxHp: 1000, hp: 1000, spinoBleed: BLEED.seconds }; let n = 0; for (let t = 0; t < 61; t += 1 / 30) n += tickCreatureBleed(st, 1 / 30);
  assert.ok(Math.abs(n - 200) <= 1, `${n}`); assert.equal(st.spinoBleed, 0);
  const w = world({ player: { x: 50, y: 50 } }), s2 = createCombatant('wildStego', 30, 30, true, []); Object.assign(s2, { id: 's2', hp: 5000, maxHp: 5000, spinoBleed: BLEED.seconds }); s2.packAttacks = []; w.enemies.push(s2);
  step(w, 10); assert.ok(w.creatureHits.length >= 9 && s2.hp < 5000);
});

// ------------------------------------------------------------------------------------------------ the interloper
test('the interloper roll: once per fight, on a hashed seed, at about its chance', () => {
  assert.equal(interloperRoll('A', 'x'), interloperRoll('A', 'x')); let yes = 0; for (let i = 0; i < 1000; i++) if (interloperRoll('ROLL', `world-beast:wildStego:${i}`)) yes++;
  assert.ok(Math.abs(yes / 1000 - SPINO_INTERLOPER.chance) < .06, `${yes}`);
  const s = {}; ensureSpinoState(s); for (let i = 0; i < 40; i++) noteInterloper(s, `p${i}`); assert.equal(s.spinoInterlopers.length, SPINO_INTERLOPER.keep); assert.equal(s.spinoInterlopers.at(-1), 'p39');
  const stego = { id: 'st', kind: 'wildStego', x: 5, y: 5, aggro: true, worldBeast: 'wildStego' }; assert.equal(interloperPrey([{ ...stego, worldBeast: undefined }], { x: 6, y: 5 }), null, 'only a real hunt (a duel stego is no fight of the world)'); assert.ok(interloperPrey([{ ...stego, worldBeast: undefined, stegoRoom: true }], { x: 6, y: 5 })); assert.equal(interloperPrey([stego], { x: 6, y: 5 }), stego); assert.equal(interloperPrey([{ ...stego, aggro: false }], { x: 6, y: 5 }), null); assert.equal(interloperPrey([{ ...stego, retreating: true }], { x: 6, y: 5 }), null);
  assert.ok(interloperSpot('A', 'st', { x: 16, y: 16 }, stego, () => true));
});
function preyFight(kind, want, seed = 'INTER') {
  for (let i = 0; i < 200; i++) { const id = `world-beast:${kind}:${i}`; if (interloperRoll(seed, id) === want) return id; }
  throw new Error('no id');
}
for (const kind of ['wildStego', 'briarStag']) test(`the interloper comes in from off screen with a roar during a ${kind} fight (once), and not when its roll says no`, () => {
  const run = (want) => { const s = freshSave(); s.seed = 'INTER'; const g = new Game(s, 0); g.rx = 9; g.ry = 3; g.loadArea('overworld'); const p = g.player; s.maxHp = p.maxHp = p.hp = 1e6; g.enemies = [];
    const prey = createCombatant(kind, p.x + 3, p.y, true, []); Object.assign(prey, { id: preyFight(kind, want), aggro: true, hp: 1e6, maxHp: 1e6, worldBeast: kind }); prey.packAttacks = []; g.enemies.push(prey);
    let now = 1000; for (let t = 0; t < SPINO_INTERLOPER.after + 1; t += 1 / 30) { now += 1000 / 30; p.hp = 1e6; g.update(1 / 30, { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} }, now); }
    return { g, s, prey, sp: g.enemies.find((e) => e.kind === 'spinoRex'), now }; };
  const no = run(false); assert.equal(no.sp, undefined); assert.equal(no.s.spinoInterlopers.length, 0);
  const yes = run(true), sp = yes.sp; assert.ok(sp, 'it came'); assert.equal(sp.spinoInterloper, yes.prey.id); assert.ok(!sp.worldBeast && !sp.boss && sp.aggro); assert.ok(yes.g.spinoShake); assert.deepEqual(yes.s.spinoInterlopers, [yes.prey.id]);
  assert.ok(Math.hypot(sp.x - yes.g.player.x, sp.y - yes.g.player.y) >= SPINO_INTERLOPER.arrive * .4, 'from off to the side'); assert.equal(sp.id, `${yes.prey.id}:spino`);
  const want = tuneSpinoBeast(createCombatant('spinoRex', 0, 0, false, []), yes.s, characterStats(yes.s), { spinoInterloper: 'x' }); assert.equal(sp.damage >= want.damage, true);
  sp.dead = true; let now = yes.now; for (let t = 0; t < 3; t += 1 / 30) { now += 1000 / 30; yes.g.update(1 / 30, { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} }, now); } assert.equal(yes.g.enemies.filter((e) => e.kind === 'spinoRex').length, 1, 'once per fight');
  yes.g.spinoInterloperTick(1, now); yes.g._spinoFight = null; for (let i = 0; i < 10; i++) yes.g.spinoInterloperTick(1, now + i); assert.equal(yes.g.enemies.filter((e) => e.kind === 'spinoRex').length, 1, 'killed, it never comes again to this fight');
});
test('an interloper is kept with its area while it lives, across a save and reload', () => {
  const s = freshSave(); s.seed = 'INTER'; const g = new Game(s, 0); g.rx = 9; g.ry = 3; g.loadArea('overworld'); const p = g.player; g.enemies = g.enemies.filter((e) => e.kind !== 'spinoRex');
  const c = tuneSpinoBeast(createCombatant('spinoRex', p.x + 6, p.y, false, []), s, characterStats(s), { spinoInterloper: 'world-beast:wildStego:7' }); Object.assign(c, { id: 'world-beast:wildStego:7:spino', aggro: true }); c.hp = Math.round(c.maxHp * .4); c.spinoFossil = true; g.enemies.push(c);
  g.snapshotArea(false); const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(300))), 900), back = r.enemies.find((e) => e.id === c.id);
  assert.ok(back, 'it is still there'); assert.equal(back.hp, c.hp); assert.equal(back.maxHp, c.maxHp); assert.equal(back.spinoFossil, true); assert.equal(back.spinoShed, 1);
});

// ------------------------------------------------------------------------------------------------ spawning
const sectionMap = (kind = 'grass') => ({ tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind, blocked: kind !== 'grass' })), objects: [] });
function onlySpino(s) { ensureWorldBeasts(s); for (const id of WORLD_BEAST_IDS) s.worldBeasts[id].cooldown = id === 'spinoRex' ? 0 : 1e9; s.perception = { ...(s.perception || {}), aperture: 1e6 }; s.beastGap = { fresh: 6, recent: [] }; }
test('the open world: it claims a land section now and then, rarely; never at sea, never near home, never passing', () => {
  const s = freshSave(); s.seed = 'SPINO-ROAM'; onlySpino(s); let land = 0, tries = 0;
  for (let i = 0; i < 600; i++) { s.beastGap = { fresh: 6, recent: [] }; s.worldBeasts.spinoRex.active = null; tries++; const q = worldBeastFor(s, sectionMap(), 9 + i, 3); if (q) { assert.equal(q.kind, 'spinoRex'); land++; } }
  assert.ok(land > 0 && land < tries * .05, `${land} of ${tries}`); assert.ok(WORLD_BEASTS.spinoRex.chance <= WORLD_BEASTS.wildStego.chance);
  for (let i = 0; i < 300; i++) { s.beastGap = { fresh: 6, recent: [] }; s.worldBeasts.spinoRex.active = null; assert.equal(worldBeastFor(s, sectionMap('ocean'), 9 + i, 5), null, 'never at sea'); }
  for (let i = 0; i < 60; i++) { s.beastGap = { fresh: 6, recent: [] }; s.worldBeasts.spinoRex.active = null; assert.equal(worldBeastFor(s, sectionMap(), 1, 2), null, 'never near home'); }
  assert.ok(PASSING.not.includes('spinoRex')); const a = freshSave(); a.seed = 'PASS'; ensureWorldBeasts(a); a.perception = { aperture: 1e6 };
  for (let i = 0; i < 400; i++) { a.beastGap = { fresh: 6, recent: [] }; const p = passingBeastFor(a, sectionMap(), 9 + i, 4, i); if (p) assert.ok(p.passingBeast !== 'spinoRex'); }
});

test('big rooms: fresh keep, arcology and adventure Pentagon floors can hold one; ordinary dungeons never; floors generated before never gain one', () => {
  const room = (W, H) => ({ width: W, height: H, entry: { x: 1, y: 1 }, building: { style: 'keep' }, tiles: Array.from({ length: W * H }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: 'mosaicFloor', blocked: i % W === 0 || Math.floor(i / W) === 0 || i % W === W - 1 || Math.floor(i / W) === H - 1 })) });
  let held = 0; for (let i = 0; i < 400; i++) if (spinoRoomSpawn('ROOMS', `building:ROOMS:${i}:1:keep:4:f1`, room(20, 20), 'building')) held++;
  assert.ok(held > 400 * SPINO_ROOMS.chance * .5 && held < 400 * SPINO_ROOMS.chance * 1.6, `${held}`); assert.equal(spinoRoomSpawn('ROOMS', 'x', room(20, 20), 'dungeon'), null); assert.equal(spinoRoomSpawn('ROOMS', 'x', room(9, 9), 'building'), null);
  for (let i = 0; i < 400; i++) assert.equal(spinoRoomSpawn('ROOMS', `building:ROOMS:${i}:1:keep:4:f1`, room(20, 20), 'building', 1, true), null, 'never beside a stego');
  let found = null; for (let i = 0; i < 400 && !found; i++) { const s = freshSave(); s.seed = 'ROOMS'; const id = `building:ROOMS:${i}:2:${i % 2 ? 'keep' : 'apartment'}:4:f1`, m = generatePinnedDungeon(s, id); assert.equal(s.consequences.dungeons[id].spinoRooms, SPINO_ROOMS.version);
    const q = m.enemySpawns.find((e) => e.kind === 'spinoRex'); if (q) { found = { id, q, m }; assert.ok(!m.enemySpawns.some((e) => e.kind === 'wildStego')); } }
  assert.ok(found, 'some fresh building floor holds one'); const t = found.m.tiles[found.q.y * found.m.width + found.q.x]; assert.ok(t && !t.blocked);
  { const s = freshSave(); s.seed = 'ROOMS'; generatePinnedDungeon(s, found.id); delete s.consequences.dungeons[found.id].spinoRooms; const m = generatePinnedDungeon(s, found.id); assert.equal(s.consequences.dungeons[found.id].spinoRooms, undefined);
    const fresh = JSON.parse(JSON.stringify(found.m)); fresh.enemySpawns = fresh.enemySpawns.filter((e) => e.kind !== 'spinoRex'); assert.equal(JSON.stringify(m), JSON.stringify(fresh), 'a floor generated before is byte for byte what it was'); }
  for (let i = 0; i < 40; i++) { const s = freshSave(); s.seed = 'ROOMS'; const id = `dungeon:ROOMS:g1:${i}:3:root`; let m = null; try { m = generatePinnedDungeon(s, id); } catch { continue; } assert.ok(!(m?.enemySpawns || []).some((e) => e.kind === 'spinoRex')); assert.equal(s.consequences.dungeons[id]?.spinoRooms, undefined); }
});

test('in a big room it is tuned to the Wayfarer like the roaming beast, with no hunt, and takes regional threat as the beasts do', () => {
  const s = freshSave(); s.seed = 'ROOMS'; s.level = 18; s.maxHp = 420; const st = characterStats(s);
  const c = tuneSpinoBeast(createCombatant('spinoRex', 0, 0, false, []), s, st), wb = tuneWorldBeast(createCombatant('spinoRex', 0, 0, true, []), s, 'spinoRex', st);
  assert.equal(c.maxHp, wb.maxHp); assert.equal(c.damage, wb.damage); assert.ok(c.spinoRoom && !c.worldBeast && !c.boss);
  assert.equal(regionalScale({ ...c }, regionalThreat(30, 0)).maxHp, c.maxHp, 'below ring 100: the Wayfarer only'); assert.ok(regionalScale({ ...c }, regionalThreat(160, 0)).maxHp > c.maxHp);
});

test('a save keeps the new records additively at schema 14 (unknown fields kept)', () => {
  const s = freshSave(); s.seed = 'SAVE'; applyBleed(s); noteInterloper(s, 'world-beast:wildStego:1'); s.bleed.extra = 'kept';
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.version, 14); assert.equal(back.bleed.left, 60); assert.equal(back.bleed.extra, 'kept'); assert.deepEqual(back.spinoInterlopers, ['world-beast:wildStego:1']);
  const old = JSON.parse(JSON.stringify(freshSave())); delete old.bleed; delete old.spinoInterlopers; const m = migrateSave(old); assert.equal(m.bleed.left, 0); assert.deepEqual(m.spinoInterlopers, []);
  const bad = migrateSave({ ...JSON.parse(JSON.stringify(freshSave())), bleed: { left: 'x', still: -3 }, spinoInterlopers: [3, 'a', 'a'] }); assert.equal(bad.bleed.left, 0); assert.deepEqual(bad.spinoInterlopers, ['a']);
});

test('a world beast\'s fossil shed is kept for the rest of its hunt', () => {
  const s = freshSave(); s.seed = 'FOSSIL'; ensureWorldBeasts(s); const g = new Game(s, 0); s.worldBeasts.spinoRex.active = { rx: g.rx, ry: g.ry, tries: 0 };
  const e = createCombatant('spinoRex', 0, 0, true, []); Object.assign(e, { worldBeast: 'spinoRex' }); g.packWorld(1 / 30, 1000).spinoFossil(e); assert.equal(s.worldBeasts.spinoRex.active.fossil, true);
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).worldBeasts.spinoRex.active.fossil, true); g.enemies = [e]; g.applyBeastWounds(); assert.equal(e.spinoFossil, true); assert.equal(e.spinoShed, 1);
});

test('determinism: the same fight twice is the same fight (a stego in it too)', () => {
  const run = () => { const w = world({ player: { x: 18, y: 14 } }), e = spino(w), st = createCombatant('wildStego', 12, 20, true, []); Object.assign(st, { id: 'st', hp: 5000, maxHp: 5000, aggro: true }); w.enemies.push(st); const trace = [];
    step(w, 40, () => { w.player.x = 18 + Math.sin(w.now / 5000) * 4; if (e.hp > e.maxHp * .4) e.hp -= 3; trace.push(`${e.x.toFixed(4)},${e.y.toFixed(4)},${e.pack.attack},${e.spinoPose},${e.spinoFossil},${w.hurts.length},${st.hp}`); }); return trace.join('|'); };
  assert.equal(run(), run());
});

test('it draws in every pose, flesh and bone, with every effect and the screen moments, reduced motion too', () => {
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : () => {}, set: () => true });
  const e = createCombatant('spinoRex', 5, 5, true, []);
  for (const pose of [null, 'bite', 'clawL', 'clawR', 'leap', 'headSlam', 'plough', 'dig', 'fling', 'roarReady', 'roar', 'tailL', 'tailR', 'run', 'lunge', 'landBite', 'grabTrack', 'grabLunge', 'grabHold', 'grabThrow', 'boneLaunch', 'ribsOut', 'ribsThrust', 'shed'])
    for (const [fossil, shed, air, dig, rm] of [[false, 0, 0, 0, false], [true, .5, 2, 1, true], [true, 1, 0, 0, false]]) { Object.assign(e, { spinoPose: pose, spinoFossil: fossil, spinoShed: shed, spinoAir: air, spinoDig: dig, reduceMotion: rm, spinoGrab: pose === 'grabHold' ? { who: 'player', phase: 'hold', t: .5 } : null }); assert.doesNotThrow(() => drawPackMonster(ctx, e, 32, 1000, 'down')); }
  const fx = [{ kind: 'spinoRock', x: 1, y: 1, vx: 1, vy: 0, radius: .35, life: 1, damage: 2 }, { kind: 'spinoBone', x: 2, y: 2, vx: 1, vy: 1, radius: .35, life: 1, damage: 2 }, { kind: 'spinoBoneBurst', x: 2, y: 2, radius: 1.3, arming: .3, armTotal: .5, life: .3, damage: 2 }, { kind: 'spinoBoneBurst', x: 2, y: 2, radius: 1.3, arming: 0, life: .3, damage: 2 }, { kind: 'spinoFurrow', x: 3, y: 3, angle: 1, radius: 1, life: 1, total: 1.4, damage: 0 }, { kind: 'spinoFlesh', x: 4, y: 4, radius: .3, life: .5, total: 1, damage: 0 }];
  for (const f of fx) assert.ok(SPINO_EFFECT_KINDS.has(f.kind)); assert.doesNotThrow(() => drawPackEffects(ctx, fx, 32, 1000, () => true, () => 0, { reduceMotion: true }));
  assert.ok(drawBiteMark(ctx, 390, 800, .8, false)); assert.ok(drawBiteMark(ctx, 390, 800, .5, true)); assert.ok(!drawBiteMark(ctx, 390, 800, 0));
  const s = freshSave(); assert.equal(drawBleedIcon(ctx, 10, 10, 32, s), false); applyBleed(s); s.bleed.still = 2; assert.ok(drawBleedIcon(ctx, 10, 10, 32, s, 0, true));
  const sh = { at: 0, until: 1000, power: .7 }; assert.notDeepEqual(shakeOffset(sh, 300), { x: 0, y: 0 }); assert.deepEqual(shakeOffset(sh, 300, true), { x: 0, y: 0 }, 'no shake under reduced motion'); assert.deepEqual(shakeOffset(sh, 1200), { x: 0, y: 0 });
});

// ------------------------------------------------------------------------------------------------ the difficulty duel
const build = (level, maxHp, power, might, resolve) => { const s = freshSave(); s.seed = 'SPINO-DUEL'; s.level = level; s.maxHp = maxHp; s.hp = maxHp; s.equipment.primary.power = power; s.stats.Might = might; s.stats.Resolve = resolve; s.stats.Vigor = 1 + Math.floor(level / 2); return s; };
const BUILDS = { early: build(8, 140, 14, 4, 2), mid: build(18, 420, 26, 40, 20), late: build(28, 914, 44, 200, 75), endgame: build(40, 1600, 70, 320, 120) };
export function spinoDuel(name) {
  const save = JSON.parse(JSON.stringify(BUILDS[name])), g = new Game(save, 0); g.rx = 9; g.ry = 3; g.loadArea('overworld'); const st = characterStats(g.save), p = g.player;
  g.enemies = []; const b = tuneWorldBeast(createCombatant('spinoRex', p.x + 4, p.y, true, []), g.save, 'spinoRex', st); Object.assign(b, { id: 'duel-spino', aggro: true }); delete b.worldBeast; g.enemies.push(b);
  g.player.invulnerableUntil = 0; let now = 1000, t = 0, worst = 0, taken = 0, fossilAt = null;
  for (; t < 240 && !b.dead && b.hp > 0; t += 1 / 30) { now += 1000 / 30; const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1; p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    const before = p.hp; g.update(1 / 30, { state: d > 1.8 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 }, consume: (k) => k === 'attack', held: (k) => k === 'attack', reset() {} }, now); const lost = Math.max(0, before - p.hp); worst = Math.max(worst, lost); taken += lost; p.hp = g.save.maxHp; p.invulnerableUntil = 0; if (b.spinoFossil && fossilAt == null) fossilAt = t; }
  return { name, seconds: t, dead: b.dead || b.hp <= 0, hp: b.maxHp, damage: b.damage, worst, share: worst / g.save.maxHp, taken, maxHp: g.save.maxHp, fossilAt };
}
test('the difficulty duel: early, mid, late and endgame builds that stand and swing; about the Wild Stegosaurus', { timeout: 300000 }, () => {
  const rows = []; for (const name of Object.keys(BUILDS)) { const r = spinoDuel(name); rows.push(r);
    assert.ok(r.worst >= r.maxHp * .12, `${name}: a blow of ${r.worst} of ${r.maxHp}`); assert.ok(r.worst < r.maxHp, `${name}: no blow takes all of a full build (${r.worst} of ${r.maxHp})`); }
  for (const r of rows.slice(1)) { assert.ok(r.dead, `${r.name}: it falls (${r.seconds.toFixed(1)} s)`); assert.ok(r.seconds > 10 && r.seconds < 150, `${r.name}: ${r.seconds.toFixed(1)} s`); assert.ok(r.fossilAt != null, `${r.name}: it went to bone`); }
  const S = WORLD_BEASTS.wildStego, P = WORLD_BEASTS.spinoRex; assert.ok(Math.abs(P.hitsToKill - S.hitsToKill) <= 6 && Math.abs(P.damageShare - S.damageShare) <= .02, 'tuned as the Wild Stegosaurus is');
  console.log('spino duel', JSON.stringify(rows.map((r) => ({ build: r.name, s: +r.seconds.toFixed(1), dead: r.dead, hp: r.hp, dmg: r.damage, worstBlow: Math.round(r.worst), share: +r.share.toFixed(2), boneAt: r.fossilAt == null ? null : +r.fossilAt.toFixed(1) }))));
});
