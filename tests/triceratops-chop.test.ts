// Triceratops Chop (Tim, 2026-11-27): the hostile Triceratops's Echo, redesigned from Triceratops Cunning under the same id. Every
// third melee attack (counted once a swing or Iron Fists step, never a sub-hit, a spell or a shot) sends two horn spikes that form
// in the air on the target's left and right and chop down onto it, each for half of that blow's physical damage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ECHOES, ECHO_IDS, ON_HIT_IDS, TRICERATOPS_CHOP, chopSwing, chopTarget, tickChop, chopSpikePose, echoDrop, echoEvent, onHitMarkOf, ensureEchoState } from '../src/echoes.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant, wayfarerDamage } from '../src/combat.ts';

const C = TRICERATOPS_CHOP;
function arena({ echoes = ['triceratops'], foes = [[11.2, 10]], kind = 'rootBrute', stats = null, power = null } = {}) {
  const s = freshSave(); s.seed = 'chop'; if (stats) Object.assign(s.stats, stats); if (power != null) s.equipment.primary.power = power;
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon';
  for (const id of echoes) s.echoes.owned[id] = true;
  s.echoes.equipped = [...echoes];
  Object.assign(g.player, { x: 10, y: 10, facing: 'right', stamina: 50, hp: 40 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant(kind, x, y), { id: `foe-${i}`, hp: 100000, maxHp: 100000, damage: 0, cooldown: 99 }));
  return { s, g };
}
const live = (g) => (g.chopSpikes || []).filter((q) => q.on);
// One swing with its cooldown wiped; returns the health the swing itself took from `e`.
function swing(g, now, e = g.enemies[0]) { g.player.attackReadyAt = 0; const before = e ? e.hp : 0; g.primaryAttack(now, { x: 1, y: 0 }); return e ? before - e.hp : 0; }
const settle = (g, now) => { for (let t = 0; t <= C.formMs + C.hangMs + C.fallMs + C.lagMs + C.impactMs + 50; t += 10) tickChop(g, now + t); };

test('the Echo: same id, name, cost, drop rules; a swing trigger, no longer on-hit; the numbers are data', () => {
  const E = ECHOES.triceratops;
  assert.equal(E.name, 'Triceratops Chop'); assert.equal(E.cost, 2); assert.equal(E.trigger, 'swing'); assert.equal(E.module, 'ramCharge');
  assert.deepEqual(E.from, { triceratopsDisposition: 'bad' }); assert.equal(E.certain, true);
  assert.match(E.text, /third melee attack/); assert.match(E.text, /two .*horn spikes/); assert.match(E.text, /half/);
  assert.ok(ECHO_IDS.includes('triceratops')); assert.ok(!ON_HIT_IDS.includes('triceratops'), 'it counts swings, not hits');
  assert.deepEqual([C.every, C.share, C.sides.length, C.sides[0], C.sides[1]], [3, .5, 2, -1, 1]);
  assert.ok(Object.isFrozen(C) && Object.isFrozen(C.draw));
  for (const v of [C.seek, C.cone, C.ahead, C.reach, C.formMs, C.hangMs, C.fallMs, C.lagMs, C.impactMs, C.stun, C.bossStun, C.cap]) assert.ok(Number.isFinite(v) && v > 0);
  const tri = (d) => Object.assign(createCombatant('triceratops', 5, 5), { id: `tri-${d}`, triceratopsDisposition: d });
  const s = freshSave(); assert.equal(echoDrop(s, tri('bad'), false, 1), 'triceratops', 'a hostile one: certain');
  for (const d of ['good', 'silly']) assert.equal(echoDrop(freshSave(), tri(d), true, 1), null, d);
  // an old save that owned and set Triceratops Cunning keeps it, as the Chop
  const old = freshSave(); old.echoes.owned.triceratops = true; old.echoes.equipped = ['triceratops'];
  const back = migrateSave(JSON.parse(JSON.stringify(old)));
  assert.equal(back.echoes.owned.triceratops, true); assert.deepEqual(ensureEchoState(back).echoes.equipped, ['triceratops']);
});

test('every third swing sends the spikes; the first two do not; then it counts again', () => {
  const { g } = arena(), e = g.enemies[0];
  assert.ok(swing(g, 1000) > 0, 'the swing landed'); assert.equal(live(g).length, 0); assert.equal(g.player.chopSwings, 1);
  swing(g, 1500); assert.equal(live(g).length, 0); assert.equal(g.player.chopSwings, 2);
  swing(g, 2000); assert.equal(live(g).length, 2, 'the third swing'); assert.equal(g.player.chopSwings, 0);
  for (const q of live(g)) assert.equal(q.foe, e, 'onto the foe the swing struck');
  settle(g, 2000); assert.equal(live(g).length, 0, 'spent');
  swing(g, 3000); swing(g, 3500); assert.equal(live(g).length, 0); swing(g, 4000); assert.equal(live(g).length, 2, 'the sixth');
  // not set: nothing counts
  const b = arena({ echoes: [] }); for (let k = 0; k < 6; k++) swing(b.g, 1000 + k * 500); assert.equal(live(b.g).length, 0); assert.equal(b.g.player.chopSwings, undefined);
});

test('counted once a swing, not per sub-hit or foe: a swing through three foes counts one; a glyph Echo copy counts none', () => {
  const { g } = arena({ foes: [[11.2, 10], [11.2, 10.4], [11.2, 9.6]] });
  swing(g, 1000); assert.ok(g.enemies.every((e) => e.hp < 100000), 'all three struck'); assert.equal(g.player.chopSwings, 1, 'one swing, one count');
  g.primaryStrike(1100, null, { share: .5 }); assert.equal(g.player.chopSwings, 1, 'a glyph Echo copy of the swing is not a swing');
  // the Fourfold Daggers' second cut is the same press: one count
  const d = arena(); d.s.equipment.primary = { id: 'primary-fourfold-daggers', name: 'Fourfold Daggers', slot: 'primary', power: 6, basePower: 6, upgradeRank: 0, glyphs: [null] };
  swing(d.g, 1000); const after = d.g.player.chopSwings;
  for (let t = 1000; t <= 1400; t += 20) d.g.tickGlyphs?.(.02, t);
  assert.equal(d.g.player.chopSwings, after, 'the second cut adds nothing');
});

test('melee only: spells, tool shots, Echo or proc damage and plain hits never count', () => {
  const { g } = arena(); const e = g.enemies[0];
  echoEvent(g, 'hit', 1000, { enemy: e, damage: 10 }); g.landHit(e, 10, 1000, null); g.landHit(e, 10, 1100, 'melee');
  g.glyphWorld(1200).damage(e, 10); g.glyphWorld(1300).blast(11.7, 10.45, 1, 10);
  g.effects.push({ id: 'fx-spell', kind: 'rift-blast', x: 11.7, y: 10.45, life: .3, radius: 1, pulse: 99, untilPulse: 0, pulseIndex: 0, damage: 10, hits: {} });
  g.update(.05, { state: { x: 0, y: 0 }, consume: () => false }, 1400);
  assert.ok(e.hp < 100000, 'they all struck'); assert.ok(!(g.player.chopSwings > 0), 'none of them is a melee attack');
});

test('two spikes from opposite sides, hanging above the target, slamming down onto it at an angle; the right one a beat later', () => {
  const { g } = arena(); swing(g, 0); swing(g, 500); swing(g, 1000);
  const [l, r] = live(g); assert.deepEqual([l.side, r.side], [-1, 1]);
  assert.equal(r.hitAt - l.hitAt, C.lagMs); assert.equal(l.hitAt - l.at, C.formMs + C.hangMs + C.fallMs);
  for (const [rx, ry] of [[1, 0], [0, 1], [Math.SQRT1_2, -Math.SQRT1_2]]) { // Standard View's right, then two Close View cameras
    const hangL = chopSpikePose(l, 1000 + C.formMs, rx, ry, false, {}), hangR = chopSpikePose(r, 1000 + C.formMs, rx, ry, false, {});
    const sideOf = (p) => ((p.bx + p.tx) / 2 - l.tx) * rx + ((p.by + p.ty) / 2 - l.ty) * ry;
    assert.ok(sideOf(hangL) < -.4 && sideOf(hangR) > .4, `left and right of the target (${rx}, ${ry})`);
    assert.ok(hangL.bz > 1 && hangR.bz > 1, 'up in the air');
    assert.ok(hangL.tz < hangL.bz && hangR.tz < hangR.bz, 'tips pointing down');
    assert.ok(Math.abs(hangL.uz) < .95 && Math.abs(hangL.uz) > .5, 'at an angle, not straight down');
    const downL = chopSpikePose(l, l.hitAt, rx, ry, false, {});
    assert.ok(Math.hypot(downL.tx - l.tx, downL.ty - l.ty) < .25 && downL.tz < C.draw.strike, 'the tip lands on the target');
    assert.ok(downL.ux * rx + downL.uy * ry > 0 && chopSpikePose(r, r.hitAt, rx, ry, false, {}).ux * rx + chopSpikePose(r, r.hitAt, rx, ry, false, {}).uy * ry < 0, 'each comes in from its own side');
  }
  // forming grows; the impact flash runs and the spike fades; reduced motion: full size at once, no travel through the air
  assert.ok(chopSpikePose(l, 1000 + 10, 1, 0, false, {}).radius < chopSpikePose(l, 1000 + C.formMs, 1, 0, false, {}).radius);
  const mid = (l.fallAt + l.hitAt) / 2;
  assert.ok(chopSpikePose(l, mid, 1, 0, false, {}).bz < chopSpikePose(l, l.fallAt, 1, 0, false, {}).bz, 'falling');
  assert.equal(chopSpikePose(l, mid, 1, 0, true, {}).bz, chopSpikePose(l, l.fallAt, 1, 0, true, {}).bz, 'reduced motion: no fall in between');
  assert.equal(chopSpikePose(l, 1000 + 5, 1, 0, true, {}).radius, C.draw.radius, 'reduced motion: no growing');
  const imp = chopSpikePose(l, l.hitAt + C.impactMs / 2, 1, 0, false, {}); assert.ok(imp.impact > .4 && imp.impact < .6 && imp.alpha < .6);
  const out = {}; assert.equal(chopSpikePose(l, 1100, 1, 0, false, out), out, 'writes the caller\'s record');
});

test('damage: each spike is half the triggering swing\'s physical damage, through the Wayfarer\'s scale; it scales with the weapon\'s stat and power', () => {
  const run = (o) => {
    const { g } = arena(o), e = g.enemies[0]; swing(g, 0); swing(g, 500); const sw = swing(g, 1000);
    const [l, r] = live(g); const hp0 = e.hp; tickChop(g, l.hitAt); const a = hp0 - e.hp; tickChop(g, r.hitAt); const b = hp0 - a - e.hp;
    return { sw, a, b, base: l.damage * 2 };
  };
  const plain = run();
  assert.equal(plain.a, plain.b, 'two equal spikes'); assert.equal(plain.a, wayfarerDamage(Math.max(1, Math.round(plain.base * C.share))));
  assert.equal(plain.sw, wayfarerDamage(Math.round(plain.base)), 'the base is the swing\'s own');
  assert.ok(Math.abs(plain.a - plain.sw * C.share) <= 1, `about half the swing each (${plain.a} of ${plain.sw})`);
  // the Salvage Blade scales with Focus (items.ts WEAPON_SCALING), and with its power (refinement raises it)
  const stat = run({ stats: { Focus: 60 } }), heavy = run({ power: 40 });
  assert.ok(stat.a > plain.a * 1.5, `Focus 1 → 60: ${plain.a} → ${stat.a}`); assert.ok(heavy.a > plain.a * 1.5, `power 6 → 40: ${plain.a} → ${heavy.a}`);
  assert.ok(Math.abs(stat.a - stat.sw * C.share) <= 1 && Math.abs(heavy.a - heavy.sw * C.share) <= 1, 'still half of what the swing dealt');
});

test('the Verge Cleaver\'s weighted swings, in real play: one count a swing; the spikes scale with Might', () => {
  const run = (might) => {
    const { s, g } = arena({ stats: { Might: might } }); s.equipment.primary = { id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 6, basePower: 6, upgradeRank: 0, glyphs: [null] };
    const e = g.enemies[0], input = { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, counts = [], dealt = [];
    let t = 1000; for (let k = 0; k < 3; k++) { const hp = e.hp; g.primaryAttack(t, { x: 1, y: 0 }); for (let f = 0; f < 80; f++) { t += 16; g.update(.016, input, t); } counts.push(g.player.chopSwings); dealt.push(hp - e.hp); }
    return { counts, dealt, spike: g.chopSpikes.find((q) => q.side === -1).damage };
  };
  const weak = run(1), strong = run(60);
  assert.deepEqual(weak.counts, [1, 2, 0], 'each weighted swing counts once, whatever ticks its blade spans');
  assert.ok(weak.dealt[2] > weak.dealt[1], `the third swing\'s spikes struck too (${weak.dealt})`);
  assert.ok(strong.spike > weak.spike * 3, `Might 1 → 60: ${weak.spike} → ${strong.spike}`);
});

test('the physical path: a stagger (a boss or elite\'s share), plain horn scatters the Nanobot Knight, kill credit, never a person', () => {
  const { g } = arena(); const e = g.enemies[0]; swing(g, 0); swing(g, 500); swing(g, 1000); e.hitStun = 0;
  const [l] = live(g); tickChop(g, l.hitAt); assert.ok(e.hitStun >= C.stun - 1e-9);
  const b = arena(); const boss = Object.assign(b.g.enemies[0], { boss: true }); swing(b.g, 0); swing(b.g, 500); swing(b.g, 1000); boss.hitStun = 0; tickChop(b.g, live(b.g)[0].hitAt);
  assert.ok(Math.abs(boss.hitStun - C.bossStun) < 1e-9, 'a boss: the boss share');
  // the Nanobot Knight: plain physical damage scatters it (nothing taken)
  const n = arena({ kind: 'nanobotKnight', foes: [[11.2, 10]] }); const k = n.g.enemies[0];
  assert.equal(n.g.chopBlow(k, 50, 1000), 0); assert.equal(k.hp, 100000);
  // a kill is the Wayfarer's
  const d = arena(); const f = d.g.enemies[0]; f.hp = 3; let defeated = 0; const orig = d.g.defeatEnemy.bind(d.g); d.g.defeatEnemy = (x) => { defeated++; return orig(x); };
  assert.ok(d.g.chopBlow(f, 50, 1000) > 0); assert.ok(f.dead); assert.equal(defeated, 1);
  // a non-hostile person is never struck or targeted
  const t = arena({ foes: [[11.2, 10], [12, 10]] }); const [person, foe] = t.g.enemies; person.nonHostilePerson = true;
  assert.equal(t.g.chopBlow(person, 50, 1000), 0); assert.equal(person.hp, 100000);
  assert.equal(chopTarget(t.g, person, 1, 0), foe, 'a person struck is never the target: the foe beyond is');
});

test('no chaining: a spike is no hit (no on-hit Echo, no landHit) and no swing; an Echo copy of a swing never counts', () => {
  const { g } = arena({ echoes: ['triceratops', 'wormTentacle'] }); const e = g.enemies[0];
  let landed = 0; const orig = g.landHit.bind(g); g.landHit = (...a) => { landed++; return orig(...a); };
  swing(g, 0); swing(g, 500); swing(g, 1000); assert.equal(landed, 3, 'three swings, three hits');
  const embers = onHitMarkOf(e)?.embers; const count = g.player.chopSwings;
  settle(g, 1000);
  assert.equal(landed, 3, 'the spikes landed no hit'); assert.equal(onHitMarkOf(e)?.embers, embers, 'no on-hit Echo stack from them');
  assert.equal(g.player.chopSwings, count, 'and no swing count');
  let swings = 0; const o2 = g.primaryAttack.bind(g); g.primaryAttack = (...a) => { swings++; return o2(...a); }; settle(g, 5000); assert.equal(swings, 0);
});

test('a swing that misses: the locked or nearest foe in front, else the point in front; a foe behind is never chosen', () => {
  const { g } = arena({ foes: [[13.5, 10], [7, 10]] }); const [front, behind] = g.enemies;
  swing(g, 0, null); swing(g, 500, null); swing(g, 1000, null);
  assert.equal(front.hp, 100000, 'the swings missed'); const [l] = live(g); assert.equal(l.foe, front, 'the nearest in front');
  const hp = front.hp; settle(g, 1000); assert.ok(front.hp < hp, 'struck'); assert.equal(behind.hp, 100000);
  // nothing in front: the point ahead, struck harmlessly
  const b = arena({ foes: [[7, 10]] }); swing(b.g, 0, null); swing(b.g, 500, null); swing(b.g, 1000, null);
  const [q] = live(b.g); assert.equal(q.foe, null); assert.ok(Math.abs(q.tx - (10.5 + C.ahead)) < 1e-9 && Math.abs(q.ty - 10.45) < 1e-9);
  settle(b.g, 1000); assert.equal(b.g.enemies[0].hp, 100000); assert.equal(live(b.g).length, 0);
  // the lock is preferred when it is in front
  const c = arena({ foes: [[12.5, 10], [13, 10.5]] }); c.g.reachLock = () => c.g.enemies[1];
  assert.equal(chopTarget(c.g, null, 1, 0), c.g.enemies[1]); c.g.reachLock = () => c.g.enemies[1] && null; assert.equal(chopTarget(c.g, null, 1, 0), c.g.enemies[0]);
  // a target that moved away before the spikes fell is missed; one that moves while they hang is followed
  const d = arena({ foes: [[13, 10]] }); const f = d.g.enemies[0]; swing(d.g, 0, null); swing(d.g, 500, null); swing(d.g, 1000, null);
  f.x = 14; tickChop(d.g, 1050); const [s1] = live(d.g); assert.ok(Math.abs(s1.tx - 14.5) < 1e-9, 'followed while hanging');
  const last = Math.max(...live(d.g).map((q) => q.fallAt)); tickChop(d.g, last); f.x = 18; const hpAway = f.hp; settle(d.g, last); assert.equal(f.hp, hpAway, 'gone when they landed: missed');
});

test('Iron Fists: each punch step counts, the third sends the spikes from the punch\'s power', () => {
  const { s, g } = arena(); s.equipment.primary = { id: 'primary-iron-fists', name: 'Iron Fists', slot: 'primary', power: 6, basePower: 6, upgradeRank: 0, glyphs: [null] };
  assert.ok(g.fistsEquipped(), 'the fists are on');
  let n = 0; for (let k = 0; k < 3; k++) { g.fistRecoverUntil = 0; g.fistCombo = null; g.player.attackReadyAt = 0; if (g.fistPress(1000 + k * 600, { x: 1, y: 0 }, null)) n++; }
  assert.equal(n, 3, 'three steps thrown'); assert.equal(live(g).length, 2, 'the third sends them');
  const fx = g.effects.filter((f) => f.brawler).at(-1); assert.equal(live(g)[0].damage, Math.max(1, fx.damage * C.share));
});

test('bounded and finite: 60 s of swings with cooldowns wiped every frame, foes dying and moving, areas changing', () => {
  const run = () => {
    const { g } = arena({ foes: Array.from({ length: 6 }, (_, i) => [11 + (i % 3) * .4, 9.6 + Math.floor(i / 3) * .8]) });
    let maxLive = 0, sends = 0;
    for (let t = 0; t < 60000; t += 16) {
      g.player.attackReadyAt = 0; g.player.hp = 40; const before = g.player.chopSwings; g.primaryAttack(t, { x: 1, y: 0 }); if (before === 2 && g.player.chopSwings === 0) sends++;
      tickChop(g, t); maxLive = Math.max(maxLive, live(g).length);
      for (const e of g.enemies) if (e.dead || e.hp <= 0) Object.assign(e, { dead: false, hp: 5000 });
      if (t % 7000 === 0) g.map = { ...g.map }; // a new area drops spikes in the air
      if (t % 400 === 0) { g.glyphVisuals = []; g.effects = []; }
    }
    assert.ok(g.chopSpikes.length === C.cap, 'the pool never grows'); assert.ok(maxLive <= C.cap);
    for (const q of g.chopSpikes) for (const k of ['at', 'fallAt', 'hitAt', 'endAt', 'tx', 'ty', 'damage']) assert.ok(Number.isFinite(q[k]), `${k} ${q[k]}`);
    for (const e of g.enemies) assert.ok(Number.isFinite(e.hp) && Number.isFinite(e.hitStun || 0));
    assert.ok(sends > 100, `spikes sent ${sends} times`);
    return g.enemies.map((e) => e.hp).concat([g.player.chopSwings, sends]);
  };
  assert.deepEqual(run(), run(), 'deterministic');
});

test('resume-safe: the count is saved for exact resume and restored clamped; spikes in the air are dropped; ownership kept', () => {
  const { s, g } = arena(); swing(g, 0); swing(g, 500); assert.equal(g.player.chopSwings, 2);
  g.exportSnapshot(600); assert.equal(s.session.playerRuntime.chopSwings, 2);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); const g2 = new Game(back, 0);
  assert.equal(g2.player.chopSwings, 2, 'restored'); assert.equal(g2.chopSpikes, undefined, 'no spikes carried');
  g2.map = g.map; g2.enemies = g.enemies; Object.assign(g2.player, { x: 10, y: 10 }); back.lastAim = { x: 1, y: 0 };
  g2.player.attackReadyAt = 0; g2.primaryAttack(1000, { x: 1, y: 0 }); assert.equal(live(g2).length, 2, 'the next swing is the third');
  // garbage and older saves start the count at 0
  for (const v of [undefined, null, -1, 3, 99, 1.5e9, 'x', NaN, 2.7]) {
    const t = freshSave(); t.session.playerRuntime.chopSwings = v; const h = new Game(t, 0);
    assert.ok([0, undefined, 2].includes(h.player.chopSwings), `${v} → ${h.player.chopSwings}`);
    if (v !== 2.7) assert.ok(!(h.player.chopSwings > 0), `${v}`);
  }
  // spikes in the air when the game is saved never reach the save
  swing(g, 1000); assert.equal(live(g).length, 2); g.exportSnapshot(1050);
  assert.ok(!JSON.stringify(s).includes('chopSpikes')); assert.equal(s.session.playerRuntime.chopSwings, 0);
});

test('chopSwing guards: no Echo, a downed Wayfarer or a bad clock send nothing; a full pool gives way oldest first', () => {
  const { g } = arena(); g.player.hp = 0; for (let k = 0; k < 3; k++) assert.equal(chopSwing(g, 1000 + k, null, 10, 1, 0), false);
  g.player.hp = 40; assert.equal(chopSwing(g, NaN, null, 10, 1, 0), false);
  g.player.chopSwings = 2; assert.equal(chopSwing(g, 1000, null, 10, 0, 0), true, 'no aim: it still points somewhere');
  for (let k = 1; k <= 10; k++) { g.player.chopSwings = 2; chopSwing(g, 1000 + k, null, 10, 1, 0); }
  assert.equal(g.chopSpikes.length, C.cap); assert.equal(live(g).length, C.cap);
  assert.ok(Math.min(...live(g).map((q) => q.at)) >= 1008, 'the newest three sends held');
});
