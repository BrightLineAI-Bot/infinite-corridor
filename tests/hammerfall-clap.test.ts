// The awakened Hammerfall's clap (Tim, 2026-11-14: "when the hammer hits, two lines of energy shoot out and then come back in
// and slap... in addition to the blows from the hammer falling. So you just have one and it'll slap"; brawler-spells.ts
// HAMMER_CLAP, game.ts brawlerTool and updateEffects, drawn by drawBrawler on the floor in both views).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, BRAWLER_GEAR, updateEffects } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { BRAWLER, HAMMER_CLAP, hammerClapCatches, hammerClapPose, hammerClapSpan, hammerClapStrikeAt, drawBrawler, clipHammerClap, hammerClapExtent } from '../src/brawler-spells.ts';
import { GOLEM } from '../src/tool-forms.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { awakenedText } from '../src/constellation.ts';

const AWAKE = { resonance: 'wildfire', version: 1 }, DT = .02;
const hammer = (awakened) => ({ ...BRAWLER_GEAR.find((g) => g.item.name === 'Hammerfall').item, ...(awakened ? { awakened: { ...AWAKE } } : {}) });
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} };
const foe = (id, x, y) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 50000, maxHp: 50000, damage: 0, cooldown: 99 });
// An open floor: the Wayfarer at (10, 10) aiming right; the target at (12, 10), so the hammer lands at its middle (12.5, 10.45).
function arena(awakened, foes) {
  const s = freshSave(); s.seed = 'CLAP'; s.perception.aperture = 3255; s.equipment.secondary = hammer(awakened); const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.maxHp = 100; s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => foe(id, x, y)); g.effects = []; g.projectiles = []; g.targetId = 'target'; // locked: the hammer lands on it
  return g;
}
// Foes as placed round the impact (12.5, 10.45): a foe at (12 + along, 10 + across) has its middle `along` ahead of the impact
// and `across` to the side. A rootBrute's body pads every bound by .096, so the hammer reaches 1.596 and the clap's rectangle
// 1.44 + .3 + .096 = 1.836 along the aim and 1.5 + .3 + .096 = 1.896 across:
//   target   at the impact (the hammer's foe, locked);
//   side     1.8 across the aim: outside the hammer, inside the lines' spread;
//   corner   1.6 ahead and 1.6 across: outside the hammer, inside the rectangle;
//   wide     2.1 across: past where the lines slide to;
//   far      2.1 ahead: past the lines' ends;
//   aft      2.1 behind: past the lines' other ends.
const ROSTER = [['target', 12, 10], ['side', 12, 11.8], ['corner', 13.6, 11.6], ['wide', 12, 7.9], ['far', 14.1, 10], ['aft', 9.9, 10.3]];
function hold(g) { for (const e of g.enemies) { e.x = e.homeX ??= e.x; e.y = e.homeY ??= e.y; } } // the test's foes stand still
function run(g, from, seconds, each = () => {}) { let t = from; for (let i = 0; i < Math.round(seconds / DT); i++) { t += DT * 1000; hold(g); g.update(DT, idle, t); hold(g); each(g, t); } return t; }
const hp = (g) => Object.fromEntries(g.enemies.map((e) => [e.id, e.hp]));

test('the clap: its numbers live in one table, and the rectangle between the parallel lines is all it catches', () => {
  const C = HAMMER_CLAP;
  for (const k of ['share', 'length', 'spread', 'width', 'extend', 'hold', 'sweep', 'fade', 'stun', 'pull', 'samples', 'step']) assert.ok(Number.isFinite(C[k]) && C[k] > 0, k);
  assert.equal(C.length, 2.88, 'about a fifth longer than 2.4'); assert.equal(C.spread, 1.5, '1.5 tiles each side');
  assert.ok(C.pull * C.sweep <= .5, 'a modest pull: at most half a tile over the close'); assert.ok(Number.isInteger(C.samples) && C.samples >= 3);
  assert.ok(Math.abs(hammerClapStrikeAt() - (C.extend + C.hold + C.sweep)) < 1e-12); assert.ok(Math.abs(hammerClapSpan() - hammerClapStrikeAt() - C.fade) < 1e-12);
  assert.ok(BRAWLER.hammerfall.delay + hammerClapSpan() < BRAWLER.hammerfall.cooldown, 'at the tool\'s own cooldown one clap is alive at a time');
  const half = C.length / 2, edge = C.spread + C.width, end = half + C.width;
  for (const aim of [[1, 0], [0, 1], [Math.SQRT1_2, -Math.SQRT1_2]]) {
    const [ax, ay] = aim, fx = { x: 3, y: 4, ax, ay, radius: C.length, spread: C.spread }, at = (along, across) => [3 + ax * along - ay * across, 4 + ay * along + ax * across];
    const catches = (along, across, body = 0) => hammerClapCatches(fx, ...at(along, across), body);
    assert.equal(catches(0, 0), true, 'the centre line, where they meet');
    assert.equal(catches(0, edge - .01), true, 'out at one line'); assert.equal(catches(0, -(edge - .01)), true, 'and the other');
    assert.equal(catches(end - .01, edge - .01), true, 'a corner'); assert.equal(catches(-(end - .01), -(edge - .01)), true, 'the opposite corner');
    assert.equal(catches(0, edge + .01), false, 'beyond a line'); assert.equal(catches(0, -(edge + .01)), false, 'beyond the other');
    assert.equal(catches(end + .01, 0), false, 'past the lines\' far end'); assert.equal(catches(-(end + .01), 0), false, 'past their near end');
    assert.equal(catches(0, edge + .15, .2), true, 'a broad body reaches in');
  }
  // The pose: apart (sliding out, parallel), hold (out at the spread), close (slamming back), clap (shut, flashing), then gone.
  assert.equal(hammerClapPose(-.01), null); assert.equal(hammerClapPose(hammerClapSpan() + .01), null);
  let q = hammerClapPose(0); assert.equal(q.phase, 'apart'); assert.equal(q.apart, 0, 'together at the impact');
  q = hammerClapPose(C.extend / 2); assert.equal(q.phase, 'apart'); assert.ok(q.apart > 0 && q.apart < 1);
  q = hammerClapPose(C.extend + C.hold / 2); assert.equal(q.phase, 'hold'); assert.equal(q.apart, 1);
  q = hammerClapPose(C.extend + C.hold + C.sweep / 2); assert.equal(q.phase, 'close'); assert.ok(q.apart > 0 && q.apart < 1);
  q = hammerClapPose(hammerClapStrikeAt()); assert.equal(q.phase, 'clap'); assert.equal(q.apart, 0); assert.equal(q.flash, 1);
  let last = -1; for (let t = 0; t < C.extend; t += .005) { const a = hammerClapPose(t).apart; assert.ok(a >= last, 'they only move apart'); last = a; }
  last = 2; for (let t = C.extend + C.hold; t < hammerClapStrikeAt(); t += .005) { const a = hammerClapPose(t).apart; assert.ok(a <= last, 'then only together'); last = a; }
  assert.strictEqual(hammerClapPose(0), hammerClapPose(.3), 'one reused pose object');
});

test('awakened Hammerfall: the parallel lines slide apart, hold, slam shut and slap once each foe between them, after the hammer\'s own blow', () => {
  const g = arena(true, ROSTER); let t = 1000; g.update(DT, idle, t); t += DT * 1000;
  assert.equal(g.brawlerTool('hammerfall', t, { x: 1, y: 0 }), true);
  const main = g.effects.find((e) => e.kind === 'hammerfall'), clap = g.effects.find((e) => e.kind === 'hammer-clap');
  assert.ok(main && clap, 'one hammer and one clap'); assert.equal(g.effects.filter((e) => e.kind === 'hammer-clap').length, 1);
  assert.equal(clap.clap, 1); assert.equal(clap.x, main.x); assert.equal(clap.y, main.y); assert.equal(clap.delay, main.delay, 'it waits with the hammer');
  assert.ok(Math.abs(clap.ax - 1) < 1e-9 && Math.abs(clap.ay) < 1e-9, 'lines along an aim to the right');
  assert.equal(clap.radius, HAMMER_CLAP.length); assert.equal(clap.spread, HAMMER_CLAP.spread); assert.equal(clap.glyphHost, 'tool'); assert.equal(clap.stun, HAMMER_CLAP.stun);
  assert.equal(clap.damage, Math.max(1, Math.round(g.toolPower() * HAMMER_CLAP.share)));
  assert.ok(clap.damage < main.damage, 'the slap is lighter than the hammer');
  const start = hp(g), phases = [], hits = [];
  t = run(g, t, BRAWLER.hammerfall.delay + hammerClapSpan() + .2, (g) => {
    const c = g.effects.find((e) => e.kind === 'hammer-clap'); if (c && !(c.delay > 0)) phases.push(hammerClapPose(hammerClapSpan() - c.life)?.phase);
    hits.push({ ...hp(g) });
  });
  for (const p of ['apart', 'hold', 'close', 'clap']) assert.ok(phases.includes(p), `drawn through ${p}`);
  assert.deepEqual([...new Set(phases)], ['apart', 'hold', 'close', 'clap'], 'in order');
  // What a blow deals is its damage through the tool's glyphs and the Wayfarer's damage scale: measured against the same press
  // without the awakening (the hammer alone).
  const plain = arena(false, ROSTER); plain.update(DT, idle, 1000); plain.brawlerTool('hammerfall', 1020, { x: 1, y: 0 }); const p0 = hp(plain); run(plain, 1020, BRAWLER.hammerfall.delay + hammerClapSpan() + .2);
  const end = hp(g), blow = p0.target - hp(plain).target, slap = start.side - end.side;
  assert.ok(blow > 0 && slap > 0 && slap < blow, `a slap (${slap}) lighter than the hammer (${blow})`);
  assert.equal(start.target - end.target, blow + slap, 'the target: the hammer and one slap');
  assert.equal(start.corner - end.corner, slap, 'in the corner of the rectangle: one slap, the same');
  for (const id of ['wide', 'far', 'aft']) assert.equal(end[id], start[id], `${id}: outside the lines, untouched`);
  assert.deepEqual(Object.keys(clap.hits).sort(), ['1:corner', '1:side', '1:target'], 'one pulse, one hit each');
  // The slap lands on the frame the lines meet: the side foe is untouched until then.
  const firstSlap = hits.findIndex((h) => h.side < start.side), meetFrame = Math.ceil((BRAWLER.hammerfall.delay + hammerClapStrikeAt()) / DT - 1e-9);
  assert.ok(Math.abs(firstSlap + 1 - meetFrame) <= 1, `the slap lands as the lines meet (frame ${firstSlap + 1}, expected about ${meetFrame})`);
  assert.equal(g.effects.some((e) => e.kind === 'hammer-clap'), false, 'and then it is gone');
});

test('non-awakened Hammerfall is unchanged: no clap, the same hammer, the same blows', () => {
  const plain = arena(false, ROSTER), awake = arena(true, ROSTER);
  for (const g of [plain, awake]) { g.update(DT, idle, 1000); g.brawlerTool('hammerfall', 1020, { x: 1, y: 0 }); }
  assert.equal(plain.effects.some((e) => e.kind === 'hammer-clap'), false);
  const strip = (g) => g.effects.filter((e) => e.kind !== 'hammer-clap').map(({ id, ...e }) => e);
  assert.deepEqual(strip(plain), strip(awake), 'the hammer itself is the same either way');
  const before = hp(plain); run(plain, 1020, 1.4);
  const after = hp(plain);
  assert.ok(before.target - after.target > 0, 'one hammer blow');
  assert.equal(plain.effects.filter((e) => e.kind === 'hammerfall').length, 0, 'spent');
  for (const id of ['side', 'corner', 'wide', 'far', 'aft']) assert.equal(after[id], before[id], `${id}: untouched without the clap`);
  assert.match(awakenedText(hammer(true)), /Clap: /); assert.equal(awakenedText(hammer(false)), '');
  assert.match(awakenedText({ id: 'secondary-blunderbuss', name: 'Blunderbuss', slot: 'secondary', power: 10, awakened: { ...AWAKE } }), /fans into three/, 'firing tools keep their fan');
});

test('the Echo copies the hammer, not the clap: one press, one slap', () => {
  const g = arena(true, ROSTER); g.update(DT, idle, 1000);
  g.save.equipment.secondary.glyphs = ['echo', 'echo']; g.brawlerTool('hammerfall', 1020, { x: 1, y: 0 });
  assert.ok(g.effects.filter((e) => e.kind === 'hammerfall' && e.echo).length >= 1, 'the Echo repeats the hammer');
  assert.equal(g.effects.filter((e) => e.kind === 'hammer-clap').length, 1, 'but not the clap');
});

test('the Corridor Golem still rises from an awakened hammer, and the clap rides along', () => {
  const g = createLabFixture({ lab: 'combat-assets', scenario: 'blade-hammerfall-brute', now: 2000 }).game;
  g.save.equipment.secondary.awakened = { ...AWAKE }; g.golem = null; g.golemReadyAt = 0; g.toolReadyAt = 0; g.effects = [];
  const target = g.enemies.find((e) => !e.dead); Object.assign(target, { hp: 50000, maxHp: 50000 });
  assert.equal(g.brawlerTool('hammerfall', 2000), true);
  assert.ok(g.golem, 'the golem rises where the hammer lands'); assert.equal(g.golem.punches, GOLEM.punches);
  const main = g.effects.find((e) => e.kind === 'hammerfall'), clap = g.effects.find((e) => e.kind === 'hammer-clap');
  assert.ok(main && clap); assert.equal(g.golem.x, main.x); assert.equal(g.golem.y, main.y);
  let t = 2000, punches = 0, claps = 0; const seen = new Set();
  for (let i = 0; i < 120; i++) { t += 20; g.update(DT, idle, t); for (const e of g.effects) if (!seen.has(e.id)) { seen.add(e.id); if (e.kind === 'golem-punch') punches++; if (e.kind === 'hammer-clap') claps++; } }
  assert.ok(punches >= 1, `the golem punched (${punches})`); assert.equal(claps, 1, 'one clap rode along');
});

test('exact resume mid-clap: a save in the hold resumes the lines where they were, and the slap lands the same', () => {
  const make = () => { const g = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game; g.enemies = []; g.effects = []; g.projectiles = []; g.save.closeView = false; g.save.equipment.secondary = hammer(true);
    for (const t of g.map.tiles) { t.blocked = false; t.openAir = false; t.courtyard = false; t.pentRoof = false; t.pentBalcony = false; } return g; };
  const g = make(), at = 100000; assert.equal(g.brawlerTool('hammerfall', at, { x: 1, y: 0 }), true);
  const clap = g.effects.find((e) => e.kind === 'hammer-clap'); assert.ok(clap);
  let t = at; const stepTo = (game, until) => { while (t < until - 1e-6) { t += DT * 1000; game.update(DT, idle, t); } };
  stepTo(g, at + (BRAWLER.hammerfall.delay + HAMMER_CLAP.extend + HAMMER_CLAP.hold / 2) * 1000);
  assert.equal(hammerClapPose(hammerClapSpan() - clap.life).phase, 'hold', 'saved mid-clap, the lines out');
  const saved = migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(t)))); assert.equal(saved.version, 14);
  const back = new Game(saved, 200000), resumed = back.effects.find((e) => e.kind === 'hammer-clap');
  assert.ok(resumed, 'the clap is saved with the area\'s effects');
  const live = g.effects.find((e) => e.kind === 'hammer-clap');
  assert.deepEqual(JSON.parse(JSON.stringify(resumed)), JSON.parse(JSON.stringify(live)), 'byte for byte');
  // The same foes about the impact in both; play both on.
  const place = (game) => { game.enemies = [foe('side', clap.x - .5, clap.y - .45 + 1.5), foe('wide', clap.x - .5, clap.y - .45 + 2.2)]; for (const e of game.enemies) e.hitStun = 99; };
  place(g); place(back);
  const p0 = { x: g.player.x, y: g.player.y }; Object.assign(back.player, p0);
  let u = 200000; const t0 = t;
  let pulled = false; for (let i = 0; i < 30; i++) { t += DT * 1000; u += DT * 1000; for (const game of [g, back]) for (const e of game.enemies) { e.x = clap.x - .5; e.y = clap.y - .45 + (e.id === 'side' ? 1.5 : 2.2); } g.update(DT, idle, t); back.update(DT, idle, u); const where = (game) => game.enemies.map((e) => [e.id, e.x, e.y]); assert.deepEqual(where(back), where(g), 'the closing lines draw the foes in exactly as before the save'); if (where(g)[0][2] < clap.y - .45 + 1.5 - .01) pulled = true; }
  assert.ok(t > t0);
  assert.deepEqual(hp(back), hp(g), 'the resumed slap struck exactly as the original');
  assert.ok(hp(g).side < 50000, 'the foe between the lines was slapped'); assert.equal(hp(g).wide, 50000, 'the one beyond them was not'); assert.ok(pulled, 'and was drawn in after the resume');
});

test('stress: an awakened Hammerfall pressed every frame for 60 s with its cooldown wiped stays finite and bounded, and draws', () => {
  const foes = Array.from({ length: 16 }, (_, i) => [`f${i}`, 11 + (i % 4), 8 + Math.floor(i / 4)]);
  const g = arena(true, foes); for (const e of g.enemies) { e.hp = e.maxHp = 1e9; }
  g.presentation = { reduceMotion: false };
  let t = 1000, maxClaps = 0, maxEffects = 0; const calls = { n: 0 };
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { calls.n++; }, set: (o, k, v) => (o[k] = v, true) });
  for (let i = 0; i < 60 / DT; i++) {
    t += DT * 1000; g.toolReadyAt = 0; g.golemReadyAt = 0; g.save.lastAim = { x: Math.cos(i * .37), y: Math.sin(i * .37) };
    g.brawlerTool('hammerfall', t, g.save.lastAim); g.update(DT, idle, t);
    const claps = g.effects.filter((e) => e.kind === 'hammer-clap'); maxClaps = Math.max(maxClaps, claps.length); maxEffects = Math.max(maxEffects, g.effects.length);
    for (const c of claps) for (const k of ['x', 'y', 'ax', 'ay', 'life', 'delay', 'untilPulse', 'damage', 'radius']) assert.ok(Number.isFinite(c[k]), `${k} finite`);
    if (i % 50 === 0) drawBrawler(ctx, g, (q) => [q.x * 32, q.y * 32], 32, t / 1000);
  }
  for (const e of g.enemies) assert.ok(Number.isFinite(e.hp), 'no NaN health');
  const bound = Math.ceil((BRAWLER.hammerfall.delay + hammerClapSpan()) / DT) + 2;
  assert.ok(maxClaps <= bound, `claps alive bounded by their span (${maxClaps} <= ${bound})`);
  assert.ok(maxEffects < 400, `effects bounded (${maxEffects})`);
  assert.ok(calls.n > 0, 'it drew');
  // At the tool's own cooldown, one clap at a time.
  const h = arena(true, ROSTER); let u = 1000, most = 0; h.update(DT, idle, u);
  for (let i = 0; i < 20 / DT; i++) { u += DT * 1000; h.brawlerTool('hammerfall', u, { x: 1, y: 0 }); h.update(DT, idle, u); most = Math.max(most, h.effects.filter((e) => e.kind === 'hammer-clap').length); }
  assert.equal(most, 1);
});

// Walls (Tim, 2026-11-14, after release 968): the lines stop at walls, never strike past one, and still slam shut.
const wall = (g, cells) => { for (const [x, y] of cells) { const t = g.map.tiles[y * 32 + x]; t.blocked = true; t.kind = 'wall'; } };
// A recording canvas: every stroked or filled path's points, in world tiles (the test draws at 32 px a tile).
function recorder() {
  const paths = []; let cur = []; const st = { globalAlpha: 1, strokeStyle: '', fillStyle: '', lineWidth: 1 };
  const ctx = new Proxy(st, { get: (o, k) => k in o ? o[k] : k === 'beginPath' ? () => { cur = []; } : k === 'moveTo' || k === 'lineTo' ? (x, y) => { cur.push([x / 32, y / 32]); } : k === 'stroke' ? () => paths.push({ op: 'stroke', color: o.strokeStyle, pts: cur.slice() }) : k === 'fill' ? () => paths.push({ op: 'fill', color: o.fillStyle, pts: cur.slice() }) : () => {}, set: (o, k, v) => (o[k] = v, true) });
  return { ctx, paths };
}

test('clipping is pure and stored: each line stops at the first wall sideways, the centre line at walls along the aim', () => {
  const C = HAMMER_CLAP, open = (x, y) => !(y >= 11 && y < 12 && x >= 10 && x < 14) && !(x >= 13.5 && x < 14.5);
  const fx = clipHammerClap({ x: 12.5, y: 10.45, ax: 1, ay: 0, radius: C.length, spread: C.spread }, open);
  assert.equal(fx.back, C.length / 2, 'nothing behind'); assert.equal(fx.fore, .75, 'the wall ahead cuts the centre line');
  assert.equal(fx.out.length, 2 * C.samples, 'one array, laid once');
  for (let i = 0; i < C.samples; i++) { assert.equal(fx.out[i], C.spread, 'the open side runs out to the spread'); assert.ok(fx.out[C.samples + i] <= .55, 'the walled side stops at the wall'); }
  assert.deepEqual(clipHammerClap({ x: 12.5, y: 10.45, ax: 1, ay: 0, radius: C.length, spread: C.spread }, open), fx, 'deterministic');
  assert.ok(hammerClapExtent(fx, 1, 0) <= .55); assert.equal(hammerClapExtent(fx, -1, 0), C.spread);
  assert.equal(hammerClapCatches(fx, 12.5, 12.2), false, 'past the side wall'); assert.equal(hammerClapCatches(fx, 12.5, 8.8), true, 'the open side');
  assert.equal(hammerClapCatches(fx, 14.9, 10.45), false, 'past the wall ahead'); assert.equal(hammerClapCatches(fx, 11.4, 10.6), true, 'the near side of the band');
});

test('awakened Hammerfall by a wall: no slap past it, the near side still slapped, and the clipped line still slams shut', () => {
  // A wall along row 11 (x 10..12) just across from the impact, and a short wall ahead at column 13 (rows 9..10).
  const roster = [['target', 12, 10], ['open', 11.5, 8.7], ['under', 11, 10.1], ['beyond', 11.5, 11.6], ['past', 13.6, 10]];
  const g = arena(true, roster); wall(g, [[10, 11], [11, 11], [12, 11], [13, 9], [13, 10]]);
  let t = 1000; g.update(DT, idle, t); t += DT * 1000; assert.equal(g.brawlerTool('hammerfall', t, { x: 1, y: 0 }), true);
  const clap = g.effects.find((e) => e.kind === 'hammer-clap'); assert.ok(clap.fore < 1 && clap.back === HAMMER_CLAP.length / 2, `clipped ahead (${clap.fore})`);
  assert.ok(clap.out.slice(HAMMER_CLAP.samples).every((o) => o <= .55), 'the walled side is cut'); assert.ok(clap.out.slice(0, HAMMER_CLAP.samples).some((o) => o === HAMMER_CLAP.spread), 'the open side is not');
  const start = hp(g), { ctx, paths } = recorder(); let shut = null;
  t = run(g, t, BRAWLER.hammerfall.delay + hammerClapSpan() + .1, (g) => {
    const c = g.effects.find((e) => e.kind === 'hammer-clap'); if (!c || c.delay > 0) return; paths.length = 0; drawBrawler(ctx, g, (q) => [q.x * 32, q.y * 32], 32, 0);
    const lines = paths.filter((p) => p.op === 'stroke' && p.color === HAMMER_CLAP.colors.core);
    for (const l of lines) for (const [x, y] of l.pts) { assert.ok(!(y >= 11 && x >= 10 && x < 13), `a line never crosses the side wall (${x.toFixed(2)}, ${y.toFixed(2)})`); assert.ok(x < 13.01, 'nor the wall ahead'); }
    if (hammerClapPose(hammerClapSpan() - c.life)?.phase === 'clap' && !shut) shut = lines.map((l) => l.pts.map(([, y]) => y));
  });
  assert.ok(shut && shut.length === 2, 'drawn shut');
  for (const ys of shut) for (const y of ys) assert.ok(Math.abs(y - clap.y) < 1e-9, 'both lines, the clipped one too, slam onto the centre line');
  const end = hp(g);
  assert.deepEqual(Object.keys(clap.hits).sort(), ['1:open', '1:target', '1:under'], 'struck: the target, the open side, the near side of the wall');
  assert.ok(end.open < start.open && end.under < start.under);
  assert.equal(end.beyond, start.beyond, 'past the side wall: untouched'); assert.equal(end.past, start.past, 'past the wall ahead: untouched');
});

test('the closing lines draw foes toward the centre line, modestly; anchored foes (bosses) hold their ground', () => {
  const across = (g, id) => { const e = g.enemies.find((q) => q.id === id); return e.y + .45 - 10.45; };
  const make = (awakened, boss) => { const g = arena(awakened, [['target', 12, 10], ['drawn', 13, 11.2], ['still', 11, 8.9]]); for (const e of g.enemies) e.hitStun = 99; if (boss) Object.assign(g.enemies[1], { boss: true }); g.update(DT, idle, 1000); g.brawlerTool('hammerfall', 1020, { x: 1, y: 0 }); return g; };
  const step = (g, from, s) => { let t = from; for (let i = 0; i < Math.round(s / DT); i++) { t += DT * 1000; for (const e of g.enemies) e.hitStun = 99; g.update(DT, idle, t); } return t; };
  const g = make(true, false), plain = make(false, false), boss = make(true, true), C = HAMMER_CLAP;
  const a0 = across(g, 'drawn'), b0 = across(g, 'still'), lead = BRAWLER.hammerfall.delay + C.extend + C.hold - DT;
  let t = step(g, 1020, lead); const u = step(plain, 1020, lead);
  assert.ok(Math.abs(across(g, 'drawn') - a0) < 1e-9, 'nothing moves before the lines close');
  step(g, t, C.sweep + 2 * DT); step(plain, u, C.sweep + 2 * DT);
  const moved = a0 - across(g, 'drawn'), movedUp = across(g, 'still') - b0, control = a0 - across(plain, 'drawn');
  assert.ok(moved > .15, `drawn in toward the centre line (${moved.toFixed(3)})`); assert.ok(movedUp > .15, `from the other side too (${movedUp.toFixed(3)})`);
  assert.ok(moved <= C.pull * (C.sweep + DT) + 1e-9, 'modest: no more than the pull over the close');
  assert.ok(across(g, 'drawn') > 0, 'never past the centre line'); assert.ok(moved - control > .15, `the pull, beyond any drift without the awakening (${control.toFixed(3)})`);
  step(boss, 1020, BRAWLER.hammerfall.delay + hammerClapStrikeAt() + DT);
  assert.ok(Math.abs(across(boss, 'drawn') - a0) < .1, `a boss holds its ground (${(across(boss, 'drawn') - a0).toFixed(3)})`); assert.ok(across(boss, 'still') - b0 > .15, 'the others are still drawn');
  // A wall between the band and the centre line: a foe the lines cannot see is never drawn.
  const w = arena(true, [['target', 12, 10], ['walled', 11.5, 11.6]]); wall(w, [[10, 11], [11, 11], [12, 11]]); for (const e of w.enemies) e.hitStun = 99;
  w.update(DT, idle, 1000); w.brawlerTool('hammerfall', 1020, { x: 1, y: 0 }); const c0 = across(w, 'walled'); step(w, 1020, BRAWLER.hammerfall.delay + hammerClapSpan());
  assert.ok(Math.abs(across(w, 'walled') - c0) < .1, `past the wall: not drawn (only the same drift as without a clap: ${(across(w, 'walled') - c0).toFixed(3)})`);
});
