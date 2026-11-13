// The Wild Stegosaurus (Tim, 2026-11-12, for his kid: "threatening for sure"): a world beast of the land and the sea, met too in the
// big rooms of keeps, arcologies and adventure Pentagons. Its moves, water, climbing, tail, infighting, tree club and spawning.
import test from 'node:test';
import { ECHOES } from '../src/echoes.ts';
import assert from 'node:assert/strict';
import { MONSTER_PACK, ATTACK_MODULES, STEGO, BOSS_POISE, PACK_KINDS, validateMonster, updatePackMonster, tickPackEffects, addPackEffect, resetPackRuntime, stegoPrey, stegoTailHit, isClubTree } from '../src/monster-pack.ts';
import { WORLD_BEASTS, WORLD_BEAST_IDS, BEAST_APERTURE, PLACEMENT, PASSING, ensureWorldBeasts, worldBeastFor, passingBeastFor, tuneWorldBeast } from '../src/world-beasts.ts';
import { STEGO_ROOMS, stegoRoomSpawn, stegoRoomSquare, stegoRoomGround } from '../src/wild-stego.ts';
import { onStegoTailSevered } from '../src/stego-bait.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster, drawPackEffects, STEGO_EFFECT_KINDS } from '../src/monster-render.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, generatePinnedDungeon, characterStats, tuneStegoRoom, regionalScale } from '../src/game.ts';
import { regionalThreat } from '../src/world.ts';
import { SEA_CREATURES } from '../src/sea-creatures.ts';
import { generateBuildingFloor } from '../src/great-buildings.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';

const ATTACKS = MONSTER_PACK.wildStego.attacks;
// A headless world: `size` square, everything open unless `wall` says otherwise; `water` makes every tile ocean.
function world({ size = 64, player = { x: 16, y: 14 }, wall = null, water = false, trees = [] } = {}) {
  const open = (x, y) => { const tx = Math.floor(x + .5), ty = Math.floor(y + .5); return tx >= 0 && ty >= 0 && tx < size && ty < size && !(wall && wall(tx, ty)); };
  const w = {
    player: { ...player, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], creatureHits: [], pushes: 0, playerVelocity: { x: 0, y: 0 }, says: [], drops: [],
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true, map: { objects: trees }, oceanAt: () => water, marineOpen: water ? open : null,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source, at: { ...w.player }, t: w.now }); return true; },
    hurtCreature(source, q, amount) { w.creatureHits.push({ id: q.id, amount }); q.hp -= amount; if (q.hp <= 0) { q.dead = true; q.noRewards = true; } return true; },
    uprootTree(o) { if (!isClubTree(o)) return false; o.state = 'fallen'; return true; },
    say(t) { w.says.push(t); }, dropStegoTail(e, d) { w.drops.push(d); },
    slow() {}, push() { w.pushes++; return true; }, pull() {}, poison() {}, stun() {}, ignite() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
function stego(w, only = null, x = 12, y = 14, id = 'stego-1') {
  const e = createCombatant('wildStego', x, y, true, []); Object.assign(e, { id, aggro: true, hp: 9000, maxHp: 9000, damage: 40 });
  e.packAttacks = only ? [only] : [...ATTACKS]; e.pack.cd.stegoTreeClub = 0; e.pack.gap = 0; w.enemies.push(e); return e;
}
const FIELDS = ['x', 'y', 'hp', 'stegoAir', 'stegoRoll', 'stegoSwim', 'stegoPlates', 'stegoClimb'];
function finite(e) { for (const k of FIELDS) assert.ok(Number.isFinite(e[k]), `${k} is ${e[k]}`); assert.ok(e.stegoTail === 'whole' || e.stegoTail === 'cut'); if (e.stegoTree) assert.ok(['grab', 'pull', 'swing'].includes(e.stegoTree.phase) && Number.isFinite(e.stegoTree.treeX)); }
function step(w, seconds, each = () => {}) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); for (const e of w.enemies) if (e.kind === 'wildStego') finite(e); each(); } }
function until(w, e, id, max = 12) { for (let t = 0; t < max && e.pack.attack !== id; t += w.dt) step(w, w.dt); assert.equal(e.pack.attack, id, `${id} starts`); }
const by = (w, ...sources) => w.hurts.filter((h) => sources.includes(h.source)).length;
// Where each move is begun from (the player's offset from the beast), the setup it needs and the sources its blows carry.
const SETUP = {
  stegoBite: { at: [2.4, 0], src: ['stegoBite'] }, stegoTailWhack: { at: [0, 2.2], face: [1, 0], src: ['stegoTailWhack'] }, stegoTailSlam: { at: [3.5, 0], src: ['stegoTailSlam', 'shockwave'] },
  stegoWheel: { at: [6, 0], src: ['stegoWheel', 'stegoDust'] }, stegoPlateRockets: { at: [6, 0], late: true, src: ['stegoPlateRockets', 'stegoSpike'] }, stegoTailBlade: { at: [6, 0], src: ['stegoTailBlade'] },
  stegoClaw: { at: [1.8, 0], src: ['stegoClaw'] }, stegoRearSwipe: { at: [2.2, 0], src: ['stegoRearSwipe'] }, stegoBuck: { at: [-2, 0], face: [1, 0], src: ['stegoBuck'] },
  stegoPounce: { at: [5, 0], src: ['stegoPounce', 'shockwave'] }, stegoTreeClub: { at: [3, 0], tree: true, src: ['stegoTreeClub'] }, stegoBreach: { at: [6, 0], water: true, src: ['stegoBreach', 'shockwave'] },
};
const tree = (x, y, form = 'spindle', id = 'tree-1') => ({ id, kind: 'tree', x, y, state: 'standing', vegetationForm: form, environmental: true });
function arena(id, away = false) {
  const S = SETUP[id], w = world({ player: { x: 12 + S.at[0], y: 14 + S.at[1] }, water: !!S.water, trees: S.tree ? [tree(10.5, 14)] : [] }), e = stego(w, id);
  if (S.face) e.stegoHeading = { x: S.face[0], y: S.face[1] }; if (S.water) e.stegoSwim = 2;
  until(w, e, id); let tele = false;
  if (away && !S.late) { tele = !!e.pack.tele; w.player.x = 60; w.player.y = 60; } // stepped out of the telegraph as soon as it showed
  while (e.pack.phase === 'windup' && e.pack.attack === id) { if (e.pack.tele) tele = true; assert.equal(by(w, ...S.src), 0, `${id}: nothing lands in the windup`); step(w, w.dt); }
  if (S.late) { tele ||= w.fx.some((f) => f.kind === 'stegoRocket' && f.arming > 0); if (away) { w.player.x = 60; w.player.y = 60; } } // the plates' shadows are their telegraph: stepped out of them
  step(w, 7, () => { if (away) { w.player.x = 60; w.player.y = 60; } e.packAttacks = []; });
  return { w, e, tele };
}

test('registry: a huge unique world beast of land and sea, twelve moves, its own poise, pose defaults, and its Echo (Stegosaur\'s Grip)', () => {
  const def = MONSTER_PACK.wildStego, B = WORLD_BEASTS.wildStego;
  assert.deepEqual(validateMonster(def), []); assert.ok(PACK_KINDS.includes('wildStego')); assert.equal(def.render, 'wildStego'); assert.ok(def.unique && !def.noEcho && ECHOES.wildStego);
  assert.equal(ATTACKS.length, 12); for (const id of ATTACKS) assert.ok(ATTACK_MODULES[id] && SETUP[id], id);
  assert.equal(WORLD_BEAST_IDS.at(-1), 'wildStego', 'listed last: every older beast rolls as it did'); assert.equal(B.kind, 'wildStego'); assert.ok(BEAST_APERTURE.wildStego); assert.ok(PLACEMENT.bigBeasts.includes('wildStego')); assert.ok(BOSS_POISE.wildStego);
  const e = createCombatant('wildStego', 0, 0, true, []); assert.ok(e.scale > 1.8); assert.deepEqual([e.stegoPose, e.stegoAir, e.stegoRoll, e.stegoSwim, e.stegoTail, e.stegoTree, e.stegoPlates, e.stegoClimb], [null, 0, 0, 0, 'whole', null, 1, 0]);
  assert.equal(STEGO.baitSeconds, 30);
});

for (const id of Object.keys(SETUP)) test(`${id}: a telegraph first, then blows only on contact; every frame finite`, () => {
  const near = arena(id); assert.ok(near.tele, `${id} shows where it will strike`); assert.ok(by(near.w, ...SETUP[id].src) >= 1, `${id} lands on a Wayfarer who stays (${near.w.hurts.map((h) => h.source).join(',')})`);
  const far = arena(id, true); assert.equal(by(far.w, ...SETUP[id].src), 0, `${id} never lands on a Wayfarer out of its reach`);
});

test('the poses the art reads appear for their moves', () => {
  const want = { stegoBite: ['biteReady', 'bite'], stegoTailWhack: ['tailReady', 'tailL', 'tailR'], stegoTailSlam: ['tailRaise', 'tailSlam'], stegoWheel: ['curl', 'roll', 'uncurl'], stegoPlateRockets: ['launch'], stegoTailBlade: ['whip'], stegoClaw: ['clawL', 'clawR'], stegoRearSwipe: ['rear', 'swipeL', 'swipeR'], stegoBuck: ['buck'], stegoPounce: ['crouch', 'leap', 'land'], stegoTreeClub: ['bite', 'shake', 'swingL', 'swingR'], stegoBreach: ['dive', 'breach'] };
  for (const [id, poses] of Object.entries(want)) { const S = SETUP[id], w = world({ player: { x: 12 + S.at[0], y: 14 + S.at[1] }, water: !!S.water, trees: S.tree ? [tree(10.5, 14)] : [] }), e = stego(w, id), seen = new Set(), tree3 = new Set(); let air = 0, roll = 0;
    if (S.face) e.stegoHeading = { x: 1, y: 0 }; if (S.water) e.stegoSwim = 2;
    until(w, e, id); step(w, 6, () => { seen.add(e.stegoPose); air = Math.max(air, e.stegoAir); roll = Math.max(roll, e.stegoRoll); if (e.stegoTree) tree3.add(e.stegoTree.phase); });
    for (const p of poses) assert.ok(seen.has(p), `${id}: ${p} (seen ${[...seen].join(',')})`);
    if (id === 'stegoPounce' || id === 'stegoBreach') assert.ok(air > 1.5, `${id} leaves the ground`); if (id === 'stegoWheel') assert.equal(roll, 1);
    if (id === 'stegoTreeClub') assert.deepEqual([...tree3].sort(), ['grab', 'pull', 'swing']);
    assert.equal(e.stegoTree, null); assert.equal(e.stegoRoll, 0); }
});

test('the wheel kicks up a bounded number of dust devils; the rockets burst into spikes; the plates grow back before it fires again', () => {
  const w = world({ player: { x: 18, y: 14 } }), e = stego(w, 'stegoWheel'); until(w, e, 'stegoWheel'); let most = 0; step(w, 4, () => { most = Math.max(most, w.fx.filter((f) => f.kind === 'stegoDust').length); });
  assert.ok(most >= 3 && most <= STEGO.wheel.dustCap, `${most} devils`);
  const r = world({ player: { x: 18, y: 14 } }), f = stego(r, 'stegoPlateRockets'); until(r, f, 'stegoPlateRockets'); step(r, 1); assert.equal(f.stegoPlates, 0); let spikes = 0; step(r, 3, () => { spikes = Math.max(spikes, r.fx.filter((q) => q.kind === 'stegoSpike').length); });
  assert.ok(spikes >= STEGO.rockets.spikes, `${spikes} spikes`); assert.ok(r.fx.length <= 48);
  f.packAttacks = ['stegoPlateRockets']; let again = false; step(r, STEGO.rockets.regrow * .8, () => { again ||= f.pack.attack === 'stegoPlateRockets'; }); assert.equal(again, false, 'not until its plates have grown'); assert.ok(f.stegoPlates > .7 && f.stegoPlates < 1);
});

test('the buck: only with you behind it; frontal blows only with you before it', () => {
  const w = world({ player: { x: 10, y: 14 } }), e = stego(w); e.stegoHeading = { x: 1, y: 0 }; e.packAttacks = ['stegoBite', 'stegoBuck', 'stegoClaw'];
  until(w, e, 'stegoBuck', 3);
  const f = world({ player: { x: 14.5, y: 14 } }), g = stego(f); g.stegoHeading = { x: 1, y: 0 }; g.packAttacks = ['stegoBite', 'stegoBuck', 'stegoClaw']; const seen = new Set(); step(f, 8, () => { if (g.pack.attack) seen.add(g.pack.attack); });
  assert.ok(!seen.has('stegoBuck') && seen.size >= 1, [...seen].join(','));
});

test('water: it swims low with only its plates up (untargetable), stands on the water to fight, breaches only on water', () => {
  const w = world({ player: { x: 30, y: 14 }, water: true }), e = stego(w); e.packAttacks = ['stegoBite'];
  step(w, .2); assert.equal(e.stegoSwim, 1); assert.equal(e.untargetable, true);
  let stood = false; step(w, 24, () => { if (e.stegoSwim === 2) { stood = true; assert.equal(e.untargetable, false); } }); assert.ok(stood, 'it rises to stand on the water when it closes in');
  const land = world({ player: { x: 18, y: 14 } }), d = stego(land, 'stegoBreach'); let tried = false; step(land, 6, () => { tried ||= d.pack.attack === 'stegoBreach'; }); assert.equal(tried, false, 'no breach on land'); assert.equal(d.stegoSwim, 0);
  const sea = world({ player: { x: 22, y: 14 }, water: true }), b = stego(sea, 'stegoBreach'); until(sea, b, 'stegoBreach'); assert.equal(b.stegoSwim, 1); assert.equal(b.untargetable, true, 'under, it cannot be struck');
});

test('infighting: a one-off pounce or tail swipe kills a creature nearby; then it goes back to you', () => {
  const w = world({ player: { x: 40, y: 40 } }), e = stego(w); e.packAttacks = ['stegoBite'];
  const prey = createCombatant('ashling', 16, 14, false, []); Object.assign(prey, { id: 'prey', hp: 30, maxHp: 30 }); w.enemies.push(prey);
  const boss = createCombatant('ashling', 10, 12, true, []); Object.assign(boss, { id: 'boss', hp: 30, maxHp: 30 }); w.enemies.push(boss);
  assert.ok(stegoPrey(prey, e)); assert.ok(!stegoPrey(boss, e), 'never a boss'); assert.ok(!stegoPrey(e, e));
  let used = null; step(w, 12, () => { if (e.pack.data?.prey) used = e.pack.attack; }); assert.ok(prey.dead, 'it killed the creature'); assert.ok(['stegoPounce', 'stegoTailWhack'].includes(used), used); assert.ok(!boss.dead);
  assert.ok(w.creatureHits.every((h) => h.id === 'prey')); assert.ok(e.pack.cd.stegoInfight > 0 || e.pack.cd.stegoInfight === 0);
  const later = new Set(); w.player.x = 15; w.player.y = 14; step(w, 6, () => { if (e.pack.attack) later.add(e.pack.data?.prey ? 'prey' : 'you'); }); assert.ok(later.has('you'));
});

test('the tail: body blows never cut it; blows from behind wear it down until it comes away, it staggers, and its tail moves are weaker', () => {
  const w = world({ player: { x: 15, y: 14 } }), e = stego(w); e.packAttacks = []; e.stegoHeading = { x: 1, y: 0 }; step(w, .1); const full = e.stegoTailHp; assert.equal(full, Math.round(e.maxHp * STEGO.tailHp));
  for (let i = 0; i < 40; i++) { e.hp -= 100; step(w, w.dt); } assert.equal(e.stegoTailHp, full, 'struck from the front: its tail is untouched'); assert.equal(e.stegoTail, 'whole');
  assert.ok(stegoTailHit(e, { x: 9.5, y: 14 })); assert.ok(!stegoTailHit(e, { x: 12.2, y: 16 }), 'beside its flank is its body');
  w.player.x = 9.5; e.stegoHeading = { x: 1, y: 0 }; let hits = 0; while (e.stegoTail === 'whole' && hits < 100) { e.stegoHeading = { x: 1, y: 0 }; e.hp -= 100; hits++; step(w, w.dt); }
  assert.equal(e.stegoTail, 'cut'); assert.equal(hits, Math.ceil(full / 100)); assert.equal(e.stegoPose, 'stagger'); assert.ok(e.stegoTailDrop && e.stegoTailDrop.item === 'stegoBait'); assert.equal(w.drops.length, 1); assert.ok(w.says.length);
  assert.equal(onStegoTailSevered(e, w), null, 'the tail comes away once'); assert.equal(w.drops.length, 1);
  resetPackRuntime(e); assert.equal(e.stegoTail, 'cut', 'a reload keeps it cut');
  const reach = (cut) => { const q = world({ player: { x: 10.5, y: 14 } }), d = stego(q, 'stegoTailWhack'); if (cut) d.stegoTail = 'cut'; d.stegoHeading = { x: 1, y: 0 }; until(q, d, 'stegoTailWhack'); return q.fx, d.pack.tele.radius; };
  assert.ok(reach(true) < reach(false), 'a stump reaches less');
  const blade = (cut) => { const q = world({ player: { x: 20, y: 14 } }), d = stego(q, 'stegoTailBlade'); if (cut) d.stegoTail = 'cut'; until(q, d, 'stegoTailBlade'); step(q, 1); return q.fx.find((f) => f.kind === 'stegoBlade')?.total ?? 0; };
  assert.ok(blade(true) < blade(false));
});

test('the tree club: rare, only near a tall thin tree (never a great or canopy tree), and the tree it tears out stays down', () => {
  assert.ok(isClubTree(tree(1, 1))); for (const f of ['canopy', 'giant', 'shrub']) assert.ok(!isClubTree(tree(1, 1, f)), f); assert.ok(!isClubTree({ ...tree(1, 1), state: 'fallen' }));
  const none = world({ player: { x: 15, y: 14 } }), a = stego(none); a.packAttacks = ['stegoTreeClub', 'stegoBite']; let club = 0; step(none, 30, () => { if (a.pack.attack === 'stegoTreeClub') club++; }); assert.equal(club, 0, 'no tree, no club');
  const giant = world({ player: { x: 15, y: 14 }, trees: [tree(11, 14, 'giant')] }), b = stego(giant); b.packAttacks = ['stegoTreeClub', 'stegoBite']; step(giant, 30, () => { if (b.pack.attack === 'stegoTreeClub') club++; }); assert.equal(club, 0, 'never a great tree');
  let starts = 0, chances = 0; for (let i = 0; i < 40; i++) { const t = world({ player: { x: 15, y: 14 }, trees: [tree(11, 14)] }), c = stego(t, null, 12, 14, `rare-${i}`); c.packAttacks = ['stegoTreeClub', 'stegoBite', 'stegoClaw']; c.pack.seq = i;
    step(t, 1.5, () => { if (c.pack.attack) { chances++; if (c.pack.attack === 'stegoTreeClub') starts++; c.pack.attack = null; c.pack.state = 'move'; c.pack.gap = 9; } }); }
  assert.ok(starts > 0 && starts < chances * .6, `${starts} of ${chances}`);
  const t = world({ player: { x: 15, y: 14 }, trees: [tree(10.5, 14)] }), c = stego(t, 'stegoTreeClub'); until(t, c, 'stegoTreeClub'); step(t, 7); assert.equal(t.map.objects[0].state, 'fallen');
  assert.ok(ATTACK_MODULES.stegoTreeClub.cooldown >= 40 && STEGO.tree.first > 0, 'rare: a long cooldown, and never in a fight\'s first moments');
});

test('in the game a torn-out tree is kept down like a felled one, across a reload', () => {
  const s = freshSave(); s.seed = 'STEGO-TREE'; const g = new Game(s, 0); const o = { id: 'stego-test-tree', kind: 'tree', x: g.player.x + 2, y: g.player.y, state: 'standing', vegetationForm: 'spindle', environmental: true, actions: ['cut'] }; g.map.objects.push(o);
  const w = g.packWorld(1 / 30, 1000); assert.equal(w.uprootTree(o), true); assert.equal(o.state, 'fallen'); assert.equal(s.worldFlags['stego-test-tree:uproot'], true);
  g.snapshotArea(false); const back = migrateSave(JSON.parse(JSON.stringify(s))); const area = Object.values(back.session.areas).find((a) => a.objects?.['stego-test-tree']); assert.equal(area.objects['stego-test-tree'].state, 'fallen');
  assert.equal(w.uprootTree({ ...o, state: 'standing', vegetationForm: 'giant' }), false);
});

test('it climbs a blocking wall to reach you instead of stalling, and comes back down', () => {
  const wall = (x) => x >= 15 && x <= 16, w = world({ player: { x: 20, y: 14 }, wall }), e = stego(w, null, 11, 14); e.packAttacks = ['stegoBite'];
  w.climbFree = (x, y) => x >= .5 && y >= .5 && x <= 62 && y <= 62; let climbed = 0, pose = false;
  step(w, 10, () => { climbed = Math.max(climbed, e.stegoClimb); pose ||= e.stegoPose === 'climb'; if (e.stegoClimbDir) assert.ok(Number.isFinite(e.stegoClimbDir.x) && e.stegoClimbDir.x > 0); });
  assert.ok(climbed > .9 && pose, `it climbed (${climbed})`); assert.ok(e.x > 17, `over the wall (${e.x.toFixed(1)})`); assert.equal(e.stegoClimb, 0, 'back on the ground'); assert.ok(w.open(e.x, e.y));
  const held = world({ player: { x: 20, y: 14 }, wall }), f = stego(held, null, 11, 14); f.packAttacks = ['stegoBite']; step(held, 6); assert.ok(f.x < 15 && f.stegoClimb === 0, 'with nothing climbable (a dungeon), it stays');
});

test('determinism: the same fight twice is the same fight', () => {
  const run = () => { const w = world({ player: { x: 18, y: 14 }, trees: [tree(9, 12)] }), e = stego(w), trace = []; step(w, 40, () => { w.player.x = 18 + Math.sin(w.now / 5000) * 4; trace.push(`${e.x.toFixed(4)},${e.y.toFixed(4)},${e.pack.attack},${e.stegoPose},${w.hurts.length}`); }); return trace.join('|'); };
  assert.equal(run(), run());
});

test('a full fight draws without throwing, in every pose and every effect, reduced motion too', () => {
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : () => {}, set: () => true });
  const e = createCombatant('wildStego', 5, 5, true, []);
  for (const pose of [null, 'graze', 'hop', 'climb', 'stagger', 'bite', 'roll', 'breach', 'swingL']) for (const [air, roll, swim, tail, climb, tree3, rm] of [[0, 0, 0, 'whole', 0, null, false], [2, 1, 0, 'cut', 0, null, true], [0, 0, 1, 'whole', 0, null, false], [0, 0, 2, 'cut', .8, { phase: 'swing', treeX: 1, treeY: 1 }, true]]) {
    Object.assign(e, { stegoPose: pose, stegoAir: air, stegoRoll: roll, stegoSwim: swim, stegoTail: tail, stegoClimb: climb, stegoTree: tree3, reduceMotion: rm, stegoPlates: .3 }); assert.doesNotThrow(() => drawPackMonster(ctx, e, 32, 1000, 'down')); }
  const fx = [{ kind: 'stegoDust', x: 1, y: 1, radius: .4, life: 1, damage: 2 }, { kind: 'stegoRocket', x: 2, y: 2, radius: 1.3, arming: .5, armTotal: 1, life: .3, damage: 3 }, { kind: 'stegoRocket', x: 2, y: 2, radius: 1.3, arming: 0, life: .3, damage: 3 }, { kind: 'stegoSpike', x: 3, y: 3, vx: 1, vy: 0, radius: .2, life: .5, damage: 1 }, { kind: 'stegoBlade', x: 4, y: 4, vx: 0, vy: 1, radius: .5, length: 1.4, life: .5, damage: 2 }];
  for (const f of fx) assert.ok(STEGO_EFFECT_KINDS.has(f.kind)); assert.doesNotThrow(() => drawPackEffects(ctx, fx, 32, 1000, () => true, () => 0, { reduceMotion: true }));
});

// ------------------------------------------------------------------------------------------------ spawning
const sectionMap = (kind = 'grass') => ({ tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind, blocked: kind !== 'grass' })), objects: [] });
function onlyStego(s) { ensureWorldBeasts(s); for (const id of WORLD_BEAST_IDS) s.worldBeasts[id].cooldown = id === 'wildStego' ? 0 : 1e9; s.perception = { ...(s.perception || {}), aperture: 1e6 }; s.beastGap = { fresh: 6, recent: [] }; }
test('overworld and sea: it claims wild sections now and then, standing on land or on open ocean', () => {
  const s = freshSave(); s.seed = 'STEGO-ROAM'; onlyStego(s); let land = 0, sea = 0;
  for (let i = 0; i < 400 && (!land || !sea); i++) { const rx = 7 + i, ry = 3, ocean = i % 2 === 1, m = sectionMap(ocean ? 'ocean' : 'grass'); s.beastGap = { fresh: 6, recent: [] }; s.worldBeasts.wildStego.active = null;
    const q = worldBeastFor(s, m, rx, ry); if (!q) continue; assert.equal(q.kind, 'wildStego'); assert.equal(q.worldBeast, 'wildStego'); const t = m.tiles[q.y * 32 + q.x]; if (ocean) { assert.equal(t.kind, 'ocean'); sea++; } else land++; }
  assert.ok(land && sea, `${land} on land, ${sea} at sea`);
  const near = freshSave(); near.seed = 'STEGO-ROAM'; onlyStego(near); for (let i = 0; i < 60; i++) { near.beastGap = { fresh: 6, recent: [] }; assert.equal(worldBeastFor(near, sectionMap(), 1, 2), null, 'never near home'); }
  const locked = freshSave(); locked.seed = 'STEGO-ROAM'; onlyStego(locked); locked.perception.aperture = 0; for (let i = 0; i < 60; i++) { locked.beastGap = { fresh: 6, recent: [] }; assert.equal(worldBeastFor(locked, sectionMap(), 7 + i, 3), null, 'not before its Aperture'); }
});

test('an existing journey: every older beast claims as it did, and passers are as they were', () => {
  assert.ok(PASSING.not.includes('wildStego'));
  const s = freshSave(); s.seed = 'OLDJ'; ensureWorldBeasts(s); s.perception = { aperture: 1e6 }; const a = JSON.parse(JSON.stringify(s));
  for (let i = 0; i < 300; i++) { const p = passingBeastFor(a, sectionMap(), 9 + i, 4, i); if (p) assert.notEqual(p.passingBeast, 'wildStego'); }
  // with the Wild Stegosaurus kept from claiming, the other beasts claim exactly what they would have claimed without it
  const b = JSON.parse(JSON.stringify(s)), c = JSON.parse(JSON.stringify(s)); b.worldBeasts.wildStego.cooldown = 1e9; c.worldBeasts.wildStego.cooldown = 1e9;
  for (let i = 0; i < 200; i++) { const x = worldBeastFor(b, sectionMap(), 9 + i, 4); const y = worldBeastFor(c, sectionMap(), 9 + i, 4); assert.deepEqual(x, y); }
});

test('big rooms: keep and arcology floors and adventure Pentagon chambers can hold one, ordinary dungeons never, floors generated before never gain one', () => {
  const room = (W, H, entry = { x: 1, y: 1 }) => ({ width: W, height: H, entry, building: { style: 'keep' }, tiles: Array.from({ length: W * H }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: 'mosaicFloor', blocked: i % W === 0 || Math.floor(i / W) === 0 || i % W === W - 1 || Math.floor(i / W) === H - 1 })) });
  assert.ok(stegoRoomSquare(room(20, 20)).side >= 12); assert.equal(stegoRoomSquare(room(6, 6), 0).side, 4); assert.equal(stegoRoomSquare(room(6, 6)), null, 'nothing clear of the way in');
  assert.ok(stegoRoomGround('building', room(20, 20))); assert.ok(stegoRoomGround('building', { building: { style: 'apartment' } })); assert.ok(!stegoRoomGround('building', { building: { style: 'hive' } }));
  assert.ok(stegoRoomGround('pentagon', { building: { adventure: {} } })); for (const b of [{ adventure: {}, trial: true }, { adventure: {}, vault: true }, {}]) assert.ok(!stegoRoomGround('pentagon', { building: b }));
  assert.ok(!stegoRoomGround('dungeon', room(20, 20)) && !stegoRoomGround(null, room(20, 20)));
  let held = 0, small = 0; for (let i = 0; i < 400; i++) { if (stegoRoomSpawn('ROOMS', `building:ROOMS:${i}:1:keep:4:f1`, room(20, 20), 'building')) held++; if (stegoRoomSpawn('ROOMS', `x${i}`, room(8, 8), 'building')) small++; }
  assert.ok(held > 400 * STEGO_ROOMS.chance * .6 && held < 400 * STEGO_ROOMS.chance * 1.5, `${held} of 400`); assert.equal(small, 0, 'a small room never');
  // real floors through the game's pinned generation
  let found = null; for (let i = 0; i < 300 && !found; i++) { const s = freshSave(); s.seed = 'ROOMS'; const id = `building:ROOMS:${i}:2:${i % 2 ? 'keep' : 'apartment'}:4:f1`, m = generatePinnedDungeon(s, id); assert.equal(s.consequences.dungeons[id].stegoRooms, STEGO_ROOMS.version);
    const q = m.enemySpawns.find((e) => e.kind === 'wildStego'); if (q) found = { id, q, m }; }
  assert.ok(found, 'some fresh building floor holds one'); const t = found.m.tiles[found.q.y * found.m.width + found.q.x]; assert.ok(t && !t.blocked);
  { const s = freshSave(); s.seed = 'ROOMS'; generatePinnedDungeon(s, found.id); delete s.consequences.dungeons[found.id].stegoRooms; /* as a floor first generated before this release left its history */ const m = generatePinnedDungeon(s, found.id); assert.equal(s.consequences.dungeons[found.id].stegoRooms, undefined); assert.ok(!m.enemySpawns.some((e) => e.kind === 'wildStego'), 'a floor generated before keeps what it had');
    const fresh = JSON.parse(JSON.stringify(found.m)); fresh.enemySpawns = fresh.enemySpawns.filter((e) => e.kind !== 'wildStego'); assert.equal(JSON.stringify(m), JSON.stringify(fresh), 'and is otherwise byte for byte what the fresh floor is'); }
  for (let i = 0; i < 40; i++) { const s = freshSave(); s.seed = 'ROOMS'; const id = `dungeon:ROOMS:g1:${i}:3:root`; let m = null; try { m = generatePinnedDungeon(s, id); } catch { continue; } assert.ok(!(m?.enemySpawns || []).some((e) => e.kind === 'wildStego')); assert.equal(s.consequences.dungeons[id]?.stegoRooms, undefined, 'an ordinary dungeon never'); }
});

test('in a big room it is tuned to the Wayfarer like the roaming beast, with no hunt, and takes regional threat as the beasts do', () => {
  const s = freshSave(); s.seed = 'ROOMS'; s.level = 18; s.maxHp = 420; const st = characterStats(s);
  const c = tuneStegoRoom(createCombatant('wildStego', 0, 0, false, []), s, st), wb = tuneWorldBeast(createCombatant('wildStego', 0, 0, true, []), s, 'wildStego', st);
  assert.equal(c.maxHp, wb.maxHp); assert.equal(c.damage, wb.damage); assert.ok(c.stegoRoom && !c.worldBeast && !c.boss);
  const near = regionalScale({ ...c }, regionalThreat(30, 0)); assert.equal(near.maxHp, c.maxHp, 'below ring 100: the Wayfarer only'); const far = regionalScale({ ...c }, regionalThreat(160, 0)); assert.ok(far.maxHp > c.maxHp);
});

test('in the game a big-room Wild Stegosaurus is tuned on load, fights, keeps its tuning across a reload, and once killed stays dead (it pays once)', () => {
  let id = null; for (let i = 0; i < 300 && !id; i++) { const s = freshSave(); s.seed = 'ROOMS'; const f = `building:ROOMS:${i}:2:${i % 2 ? 'keep' : 'apartment'}:4:f1`; if (generatePinnedDungeon(s, f).enemySpawns.some((e) => e.kind === 'wildStego')) id = f; }
  const s = freshSave(); s.seed = 'ROOMS'; const g = new Game(s, 0); s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: g.rx, ry: g.ry, x: 16, y: 16 }; g.loadArea('dungeon', false);
  const e = g.enemies.find((q) => q.kind === 'wildStego'), want = tuneStegoRoom(createCombatant('wildStego', 0, 0, false, []), s, characterStats(s)); assert.ok(e && e.stegoRoom && !e.worldBeast); assert.equal(e.maxHp, want.maxHp); assert.equal(e.damage, want.damage);
  g.player.x = e.x + 3; g.player.y = e.y; g.save.maxHp = g.player.maxHp = g.player.hp = 1e6; const hp0 = g.player.hp; let now = 1000; for (let i = 0; i < 240; i++) { now += 1000 / 30; g.update(1 / 30, idle, now); } assert.ok(g.player.hp < hp0, 'it fights');
  e.hp = Math.round(e.maxHp * .6); g.snapshotArea(false); const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(300))), 900), e2 = r.enemies.find((q) => q.kind === 'wildStego'); assert.equal(e2.maxHp, e.maxHp); assert.equal(e2.damage, e.damage); assert.equal(e2.hp, e.hp);
  e2.hp = 0; e2.dead = true; r.defeatEnemy(e2); const xp = r.save.xp; r.snapshotArea(false); const q = new Game(deserializeSave(serializeSave(r.exportSnapshot(400))), 1000); assert.ok(!q.enemies.some((x) => x.kind === 'wildStego' && !x.dead), 'it stays dead'); assert.equal(q.save.xp, xp);
});

test('a world beast\'s cut tail stays cut for the rest of its hunt (its record), and the save stays at schema 14', () => {
  const s = freshSave(); s.seed = 'TAIL'; ensureWorldBeasts(s); const g = new Game(s, 0); s.worldBeasts.wildStego.active = { rx: g.rx, ry: g.ry, tries: 0 };
  const e = createCombatant('wildStego', g.player.x + 3, g.player.y, true, []); Object.assign(e, { id: 'world-beast:wildStego:0', worldBeast: 'wildStego' }); g.enemies.push(e);
  g.packWorld(1 / 30, 1000).stegoTailCut(e); assert.equal(s.worldBeasts.wildStego.active.tailCut, true);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.version, 14); assert.equal(back.worldBeasts.wildStego.active.tailCut, true);
  const f = createCombatant('wildStego', 0, 0, true, []); Object.assign(f, { worldBeast: 'wildStego' }); g.enemies = [f]; g.applyBeastWounds(); assert.equal(f.stegoTail, 'cut');
});

// ------------------------------------------------------------------------------------------------ the difficulty duel
const build = (level, maxHp, power, might, resolve) => { const s = freshSave(); s.seed = 'STEGO-DUEL'; s.level = level; s.maxHp = maxHp; s.hp = maxHp; s.equipment.primary.power = power; s.stats.Might = might; s.stats.Resolve = resolve; s.stats.Vigor = 1 + Math.floor(level / 2); return s; };
const BUILDS = { early: build(8, 140, 14, 4, 2), mid: build(18, 420, 26, 40, 20), late: build(28, 914, 44, 200, 75), endgame: build(40, 1600, 70, 320, 120) };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
export function stegoDuel(name) {
  const save = JSON.parse(JSON.stringify(BUILDS[name])), g = new Game(save, 0); g.rx = 9; g.ry = 3; g.loadArea('overworld'); /* wild ground: no settlement's sanctuary */ const st = characterStats(g.save), p = g.player;
  g.enemies = []; const b = tuneWorldBeast(createCombatant('wildStego', p.x + 4, p.y, true, []), g.save, 'wildStego', st); Object.assign(b, { id: 'duel-stego', aggro: true }); delete b.worldBeast; b.packAttacks = b.packAttacks.filter((a) => a !== 'stegoTreeClub' && a !== 'stegoBreach'); g.enemies.push(b);
  g.player.invulnerableUntil = 0; let now = 1000, t = 0, worst = 0, taken = 0;
  for (; t < 240 && !b.dead && b.hp > 0; t += 1 / 30) { now += 1000 / 30; const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1; p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    const before = p.hp; g.update(1 / 30, { state: d > 1.8 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 }, consume: (k) => k === 'attack', held: (k) => k === 'attack', reset() {} }, now); const lost = Math.max(0, before - p.hp); worst = Math.max(worst, lost); taken += lost; p.hp = g.save.maxHp; p.invulnerableUntil = 0; }
  return { name, seconds: t, dead: b.dead || b.hp <= 0, hp: b.maxHp, damage: b.damage, worst, share: worst / g.save.maxHp, taken, maxHp: g.save.maxHp };
}
test('the difficulty duel: early, mid, late and endgame builds that stand and swing; fights of tens of seconds, blows that take a big share of health', { timeout: 300000 }, () => {
  const rows = []; for (const name of Object.keys(BUILDS)) { const r = stegoDuel(name); rows.push(r);
    assert.ok(r.worst >= r.maxHp * .12, `${name}: a blow of ${r.worst} of ${r.maxHp}`); assert.ok(r.worst < r.maxHp, `${name}: no blow takes all of a full build (${r.worst} of ${r.maxHp})`); }
  for (const r of rows.slice(1)) { assert.ok(r.dead, `${r.name}: it falls (${r.seconds.toFixed(1)} s)`); assert.ok(r.seconds > 10 && r.seconds < 150, `${r.name}: ${r.seconds.toFixed(1)} s`); }
  const T = SEA_CREATURES.tyrantMosasaur; assert.ok(T.hp && T.damage);
  console.log('wild stego duel', JSON.stringify(rows.map((r) => ({ build: r.name, s: +r.seconds.toFixed(1), dead: r.dead, hp: r.hp, dmg: r.damage, worstBlow: Math.round(r.worst), share: +r.share.toFixed(2) }))));
});
void serializeSave; void deserializeSave; void generateBuildingFloor;
