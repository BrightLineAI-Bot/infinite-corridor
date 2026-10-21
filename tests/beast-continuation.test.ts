// Crystal sky-beam and Knight seeker regressions for the approved release 249 continuation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTACK_MODULES, MONSTER_PACK, CRYSTAL, KNIGHT, PACK_EFFECT_CAP,
  updatePackMonster, tickPackEffects, addPackEffect, freshPackState,
  resetPackRuntime, crystalOrbitalOffset,
} from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, updateProjectiles } from '../src/game.ts';
import { drawPackEffects } from '../src/monster-render.ts';
import {
  WORLD_BEASTS, ensureWorldBeasts, worldBeastForDungeon,
  beginDungeonRetreat, retreatTarget, worldBeastsLost,
} from '../src/world-beasts.ts';

function world({ dt = 1 / 60, player = { x: 20, y: 20 }, size = 100 } = {}) {
  const w = {
    player: { ...player, hp: 1e6 }, width: size, height: size, dt, now: 0,
    enemies: [], fx: [], hurts: [], slows: [], playerVelocity: { x: 0, y: 0 },
    playerShots: [], playerBlasts: [], playerSwinging: false,
    open: (x, y) => x >= 0 && y >= 0 && x < size && y < size,
    tileOpen: (x, y) => x >= 0 && y >= 0 && x < size && y < size,
    los: () => true,
    move(e, dx, dy) {
      if (!w.open(e.x + dx, e.y + dy)) return false;
      e.x += dx; e.y += dy; return true;
    },
    hurt(owner, amount, options = {}) {
      w.hurts.push({ owner: owner?.id, amount, ...options, now: w.now });
      w.player.hp -= amount; return true;
    },
    slow(...args) { w.slows.push(args); },
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); },
    effects: () => w.fx,
  };
  return w;
}
function actor(w, kind, { hp = 3000, id = `${kind}-local`, x = 14, y = 20 } = {}) {
  const e = createCombatant(kind, x, y, true, []);
  Object.assign(e, { id, hp, maxHp: 3000, damage: 20, aggro: true, evasive: false, packBossAttacks: [] });
  w.enemies.push(e); return e;
}
function frame(w, { ai = true } = {}) {
  w.now += w.dt * 1000;
  if (ai) for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w);
  w.fx = tickPackEffects(w.fx, w);
}
function step(w, seconds, each = () => {}, options = {}) {
  for (let i = 0; i < Math.ceil(seconds / w.dt - 1e-8); i++) { frame(w, options); each(); }
}
function until(w, predicate, seconds = 5, options = {}) {
  for (let i = 0; i < Math.ceil(seconds / w.dt) && !predicate(); i++) frame(w, options);
  assert.ok(predicate(), `condition not reached within ${seconds} seconds`);
}
function force(e, attack, seq = 0) {
  e.packAttacks = [attack]; e.packBossAttacks = [];
  e.pack = freshPackState(); e.pack.gap = 0; e.pack.seq = seq;
}
function castCrystal(seq = 0, options = {}) {
  const w = world(options), e = actor(w, 'psychicCrystal');
  force(e, 'psyOrbital', seq);
  until(w, () => w.fx.some((f) => f.kind === 'orbital'), 2);
  e.packAttacks = [];
  return { w, e, beams: w.fx.filter((f) => f.kind === 'orbital') };
}
function castKnight({ seq = 0, hp = 3000, ...options } = {}) {
  const w = world(options), e = actor(w, 'nanobotKnight', { hp });
  force(e, 'knightOrbs', seq);
  until(w, () => w.fx.some((f) => f.kind === 'nanoOrb'), 2);
  e.packAttacks = [];
  return { w, e, orbs: w.fx.filter((f) => f.kind === 'nanoOrb') };
}

test('sky attack belongs to the Crystal, not the Knight, without removing the Knight other weapons', () => {
  assert.ok(MONSTER_PACK.psychicCrystal.attacks.includes('psyOrbital'));
  assert.ok(!MONSTER_PACK.nanobotKnight.attacks.some((id) => /orbital/i.test(id)));
  for (const id of ['knightCannon', 'knightSwordfall', 'knightOrbs', 'knightMissiles', 'knightThrust']) {
    assert.ok(MONSTER_PACK.nanobotKnight.attacks.includes(id), id);
  }
  assert.ok(ATTACK_MODULES.psyOrbital);
});

test('deterministic Crystal casts cover all one-to-four counts and all five patterns', () => {
  const counts = new Set(), patterns = new Set(), combinations = new Set();
  for (let seq = 0; seq < 160; seq++) {
    const { e, beams } = castCrystal(seq);
    assert.ok(beams.length >= 1 && beams.length <= 4);
    counts.add(beams.length);
    const pattern = beams[0].pattern;
    patterns.add(pattern); combinations.add(`${beams.length}:${pattern}`);
    assert.ok(beams.every((f) => f.owner === e.id && f.pattern === pattern));
    assert.equal(new Set(beams.map((f) => f.phase)).size, beams.length, 'each beam has its own phase');
    assert.ok(beams.every((f) => f.arming > 0 && f.damage > 0 && Number.isFinite(f.x) && Number.isFinite(f.y)));
    if (seq < 10) {
      const again = castCrystal(seq).beams;
      const signature = (xs) => xs.map(({ x, y, pattern, phase, arming, life }) => ({ x, y, pattern, phase, arming, life }));
      assert.deepEqual(signature(again), signature(beams), 'same stable actor and sequence reproduce the cast');
    }
  }
  assert.deepEqual([...counts].sort(), [1, 2, 3, 4]);
  assert.deepEqual([...patterns].sort(), ['circle', 'slash', 'spiral', 'square', 'zigzag']);
  assert.equal(combinations.size, 20, 'all count/pattern combinations remain reachable');
});

test('patterns are continuous and nonstationary, not five aliases for the same motion', () => {
  const signatures = new Set();
  for (const pattern of ['circle', 'slash', 'spiral', 'square', 'zigzag']) {
    const samples = [];
    let previous = crystalOrbitalOffset(pattern, .137, 0), moved = false;
    for (let t = .01; t < CRYSTAL.orbitalPeriod * 2.1; t += .01) {
      const next = crystalOrbitalOffset(pattern, .137, t);
      assert.ok(Number.isFinite(next.x) && Number.isFinite(next.y));
      const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
      assert.ok(distance < CRYSTAL.orbitalSpread * .2, `${pattern} must not teleport at a loop boundary`);
      moved ||= distance > 1e-5;
      if (samples.length < 20) samples.push([next.x.toFixed(4), next.y.toFixed(4)]);
      previous = next;
    }
    assert.ok(moved, pattern); signatures.add(JSON.stringify(samples));
  }
  assert.equal(signatures.size, 5);
});

test('Crystal telegraphs are harmless, active light damages, and each beam lasts several seconds', () => {
  const { w, beams } = castCrystal(0);
  const beam = beams[0], createdAt = w.now, initialLife = beam.life;
  assert.ok(initialLife >= 3 && initialLife <= 8, 'several seconds, not an instant strike or permanent hazard');
  while (beam.arming > w.dt + 1e-6) {
    w.player.x = beam.x; w.player.y = beam.y; frame(w, { ai: false });
    assert.equal(w.hurts.length, 0, 'no warning damage');
    assert.equal(beam.life, initialLife, 'warning does not consume active lifetime');
  }
  const armedAt = w.now + w.dt * 1000;
  step(w, .2, () => { w.player.x = beam.x; w.player.y = beam.y; }, { ai: false });
  assert.ok(w.hurts.some((h) => h.source === 'psyOrbital' && h.amount > 0 && h.beam && h.jumpable === false));
  assert.ok(w.hurts.every((h) => h.source !== 'scorch'));
  assert.ok(armedAt - createdAt >= 300, 'a visible warning interval');
  step(w, 2, () => {}, { ai: false });
  assert.ok(w.fx.includes(beam), 'still active well after the warning');
  until(w, () => !w.fx.includes(beam), initialLife + .2, { ai: false });
  const activeSeconds = (w.now - armedAt) / 1000;
  assert.ok(Math.abs(activeSeconds - initialLife) <= w.dt * 3, `active duration ${activeSeconds}`);
  assert.ok(w.fx.filter((f) => f.kind === 'scorch').every((f) => f.damage === 0 && f.total >= 1 && f.total <= 2));
});

test('active pattern centers follow a moving player without resetting their path', () => {
  const { w, beams } = castCrystal(4);
  until(w, () => beams.every((f) => f.arming <= 0), 2, { ai: false });
  const before = beams.map((f) => ({ x: f.anchor.x, y: f.anchor.y, elapsed: f.elapsed }));
  w.player.x += 8; w.player.y += 2;
  step(w, 1, () => {}, { ai: false });
  beams.forEach((f, i) => {
    assert.ok(f.anchor.x > before[i].x + .5);
    assert.ok(f.anchor.y > before[i].y);
    assert.ok(f.elapsed > before[i].elapsed + .9);
    assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y));
  });
});

test('scorch is purely cosmetic even when stale data carries damage, and fades in one to two seconds', () => {
  const w = world();
  const mark = { kind: 'scorch', owner: 'missing', x: 20, y: 20, radius: 2, arming: 0, damage: 999, life: CRYSTAL.scorchLife, total: CRYSTAL.scorchLife };
  assert.ok(mark.life >= 1 && mark.life <= 2);
  w.fx.push(mark);
  step(w, .8, () => {}, { ai: false }); assert.ok(w.fx.includes(mark));
  step(w, 1.25, () => {}, { ai: false });
  assert.equal(w.fx.length, 0); assert.equal(w.hurts.length, 0); assert.equal(w.slows.length, 0);
});

test('owner death or retreat stops beam damage and removes it promptly', () => {
  for (const reason of ['dead', 'retreating']) {
    const { w, e, beams } = castCrystal(2);
    until(w, () => beams[0].arming <= 0, 2, { ai: false });
    w.player.x = beams[0].x; w.player.y = beams[0].y;
    w.hurts = []; e[reason] = true;
    step(w, .6, () => {}, { ai: false });
    assert.equal(w.hurts.length, 0, reason);
    assert.ok(!w.fx.some((f) => f.kind === 'orbital'), reason);
  }
});

test('four beams respect the shared effect cap and cosmetic scorch does not evict live hazards', () => {
  let cast;
  for (let seq = 0; seq < 40; seq++) { cast = castCrystal(seq); if (cast.beams.length === 4) break; }
  assert.equal(cast.beams.length, 4);
  const { w, beams } = cast;
  while (w.fx.length < PACK_EFFECT_CAP) w.addEffect({ kind: 'nanoBurst', owner: 'other', x: 90, y: 90, radius: .1, arming: 0, life: 10, damage: 0 });
  step(w, 3, () => {
    assert.ok(w.fx.length <= PACK_EFFECT_CAP);
    assert.ok(beams.every((f) => w.fx.includes(f)), 'cosmetic marks must not evict a live beam');
  }, { ai: false });
});

test('incoming combat effects evict cosmetic scorch before older live beams at the shared cap', () => {
  let cast;
  for (let seq = 0; seq < 40; seq++) { cast = castCrystal(seq); if (cast.beams.length === 4) break; }
  assert.equal(cast.beams.length, 4);
  const { w, beams } = cast;
  for (let i = 0; i < 40; i++) {
    w.addEffect({ kind: 'mortar', owner: `existing-${i}`, x: 90, y: 90, radius: 1, arming: 99, damage: 10 });
  }
  const existingCombat = [...w.fx];
  assert.equal(existingCombat.length, 44);
  until(w, () => w.fx.length === PACK_EFFECT_CAP, 2, { ai: false });
  assert.equal(w.fx.filter((f) => f.kind === 'scorch').length, 4, 'the four beams fill spare capacity with marks');
  for (let i = 0; i < 4; i++) {
    const owner = `incoming-${i}`;
    w.addEffect({ kind: 'mortar', owner, x: 80, y: 80, radius: 1, arming: 1, damage: 20 });
    assert.equal(w.fx.length, PACK_EFFECT_CAP);
    assert.ok(w.fx.some((f) => f.owner === owner), 'the new attack is admitted');
    assert.ok(existingCombat.every((f) => w.fx.includes(f)), 'all prior combat effects survive while marks can be discarded');
    assert.ok(beams.every((f) => w.fx.includes(f)), 'the oldest beams are not sacrificed for decoration');
    assert.equal(w.fx.filter((f) => f.kind === 'scorch').length, 3 - i);
  }
});

test('beam collision sweeps the travelled segment rather than checking only its endpoints', () => {
  const w = world({ dt: .05, player: { x: 20.14, y: 20.14 } }), e = actor(w, 'psychicCrystal');
  const beam = {
    kind: 'orbital', owner: e.id, x: 20, y: 20, anchor: { x: 20, y: 20 },
    pattern: 'slash', phase: 0, elapsed: 0, radius: .01, arming: 0,
    life: 4, damage: 10, nextScorch: 99,
  };
  // Use a narrow beam to make an endpoint-only miss observable at the real maximum frame duration.
  assert.ok(Math.hypot(w.player.x - beam.x, w.player.y - beam.y) > beam.radius + .1);
  w.fx = [beam]; frame(w, { ai: false });
  assert.ok(Math.hypot(w.player.x - beam.x, w.player.y - beam.y) > beam.radius + .1);
  assert.equal(w.hurts.filter((h) => h.source === 'psyOrbital').length, 1);
});

test('orbital warnings, active feet, and scorch share the same terrain elevation offset', () => {
  function ellipses(effect, terrainLift) {
    const circles = [];
    const context = new Proxy({
      ellipse(...args) { circles.push(args); },
      createRadialGradient() { return { addColorStop() {} }; },
      createLinearGradient() { return { addColorStop() {} }; },
    }, {
      get(target, key) { return key in target ? target[key] : () => {}; },
      set(target, key, value) { target[key] = value; return true; },
    });
    drawPackEffects(context, [effect], 32, 1000, () => true, () => terrainLift);
    return circles;
  }
  for (const effect of [
    { kind: 'orbital', x: 10, y: 10, radius: .65, arming: .5, armTotal: .7, life: 4 },
    { kind: 'orbital', x: 10, y: 10, radius: .65, arming: 0, life: 4 },
    { kind: 'scorch', x: 10, y: 10, radius: .5, arming: 0, life: 1, total: 1.5 },
  ]) {
    const flat = ellipses({ ...effect }, 0), raised = ellipses({ ...effect }, 1.4);
    assert.ok(flat.length > 0, `${effect.kind}: ground footprint was drawn`);
    assert.equal(flat.length, raised.length);
    for (let i = 0; i < flat.length; i++) assert.ok(Math.abs(flat[i][1] - raised[i][1] - 1.4 * 32) < 1e-8);
  }
});

test('Knight gathers exactly three normal or six at/below the low-health threshold', () => {
  for (const [hp, count] of [[3000, 3], [1501, 3], [1500, 6], [1, 6]]) {
    const { w, e, orbs } = castKnight({ hp });
    assert.equal(orbs.length, count);
    const initial = orbs.map((f) => ({ x: f.x, y: f.y }));
    step(w, KNIGHT.orbFloat * .6);
    assert.ok(orbs.every((f) => f.state === 'circle'), 'orbs float before launching');
    assert.ok(orbs.every((f) => Math.hypot(f.x - e.x, f.y - e.y) <= KNIGHT.orbOrbit + .1));
    assert.ok(orbs.some((f, i) => Math.hypot(f.x - initial[i].x, f.y - initial[i].y) > .1), 'they visibly circle');
  }
});

test('Knight supports both simultaneous and staggered launches after the initial float', () => {
  const modes = new Set();
  for (let seq = 0; seq < 12 && modes.size < 2; seq++) {
    const { w, e, orbs } = castKnight({ seq, hp: 1000 });
    const allAtOnce = e.pack.data.allAtOnce; modes.add(allAtOnce);
    until(w, () => orbs.some((f) => f.state !== 'circle'), 2);
    const sent = orbs.filter((f) => f.state !== 'circle');
    assert.equal(sent.length, allAtOnce ? 6 : 1);
    assert.ok(sent.every((f) => f.age >= KNIGHT.orbFloat - w.dt * 2));
    until(w, () => orbs.every((f) => f.state !== 'circle'), 3);
  }
  assert.equal(modes.size, 2);
});

test('Knight orb homes for two seconds, then velocity stays straight despite target changes', () => {
  const { w, orbs } = castKnight();
  until(w, () => orbs.some((f) => f.state !== 'circle'), 2);
  const orb = orbs.find((f) => f.state !== 'circle');
  const launchedAt = w.now, v0 = { x: orb.vx, y: orb.vy };
  w.player.x = 80; w.player.y = 80;
  step(w, 1, () => {}, { ai: false });
  assert.ok(w.fx.includes(orb)); assert.ok(orb.homeFor > .8 && orb.homeFor < 1.1);
  assert.ok(Math.hypot(orb.vx - v0.x, orb.vy - v0.y) > .1, 'turns toward changed target');
  until(w, () => orb.state === 'straight', 2, { ai: false });
  assert.ok(Math.abs((w.now - launchedAt) / 1000 - 2) < w.dt * 3);
  const velocity = { x: orb.vx, y: orb.vy }, at = { x: orb.x, y: orb.y };
  w.player.x = 0; w.player.y = 99;
  step(w, .7, () => {}, { ai: false });
  assert.ok(w.fx.includes(orb));
  assert.deepEqual({ x: orb.vx, y: orb.vy }, velocity);
  assert.ok(Math.abs(orb.x - at.x - velocity.x * .7) < 1e-7);
  assert.ok(Math.abs(orb.y - at.y - velocity.y * .7) < 1e-7);
});

test('Knight orbs stop at walls, hit only once, and finite flight cleans up', () => {
  const make = () => {
    const w = world(), e = actor(w, 'nanobotKnight');
    e.packAttacks = [];
    const orb = { kind: 'nanoOrb', owner: e.id, x: 19, y: 20, vx: KNIGHT.orbSpeed, vy: 0, radius: KNIGHT.orbRadius, state: 'straight', homeFor: 0, arming: 0, life: KNIGHT.orbLife, damage: 12 };
    w.fx = [orb]; return { w, orb };
  };
  const hit = make(); step(hit.w, 1, () => {}, { ai: false });
  assert.equal(hit.w.hurts.length, 1); assert.ok(!hit.w.fx.includes(hit.orb));
  const wall = make(); wall.w.tileOpen = () => false; frame(wall.w, { ai: false });
  assert.equal(wall.w.hurts.length, 0); assert.ok(!wall.w.fx.includes(wall.orb));
  const expires = make(); expires.w.player = { x: 80, y: 80 }; step(expires.w, KNIGHT.orbLife + .1, () => {}, { ai: false });
  assert.ok(!expires.w.fx.includes(expires.orb));
});

test('a real mist interruption does not strand circling orbs or contaminate the next volley', () => {
  const { w, e, orbs } = castKnight();
  e.evasive = true;
  let interrupted = false;
  for (let n = 0; n < 40 && !interrupted; n++) {
    e.pack.cd.qbEvade = 0;
    w.playerShots = [{ x: e.x + 1, y: e.y + .45, dx: -1, dy: 0 }];
    frame(w); interrupted = e.pack.attack !== 'knightOrbs';
  }
  assert.ok(interrupted, 'real knightMistDodge interrupted the gather');
  assert.ok(e.mist || e.pack.attack === 'knightBackslash', 'the actual evasive path ran');
  w.playerShots = []; e.evasive = false;
  step(w, KNIGHT.orbFloat + .1);
  assert.ok(orbs.every((f) => f.state !== 'circle' || !w.fx.includes(f)));
  step(w, KNIGHT.orbLife + .3);
  assert.ok(!w.fx.some((f) => f.kind === 'nanoOrb'), 'interrupted volley expires');
  e.x = 14; e.y = 20; w.player.x = 20; w.player.y = 20;
  force(e, 'knightOrbs', 20);
  until(w, () => w.fx.some((f) => f.kind === 'nanoOrb'), 2);
  assert.equal(w.fx.filter((f) => f.kind === 'nanoOrb').length, 3);
});

test('gathering orbs disappear if their Knight dies or starts retreating', () => {
  for (const reason of ['dead', 'retreating']) {
    const { w, e } = castKnight(); e[reason] = true;
    frame(w, { ai: false }); assert.ok(!w.fx.some((f) => f.kind === 'nanoOrb'), reason);
  }
});

test('legacy runtime reset migrates attack ownership without retuning health or deleting unknown cooldowns', () => {
  for (const kind of ['nanobotKnight', 'psychicCrystal']) {
    const w = world(), e = actor(w, kind);
    e.hp = 731; e.maxHp = 3000; e.damage = 47;
    e.packAttacks = kind === 'nanobotKnight'
      ? [...MONSTER_PACK[kind].attacks, 'knightOrbital']
      : MONSTER_PACK[kind].attacks.filter((id) => id !== 'psyOrbital');
    e.pack.attack = kind === 'nanobotKnight' ? 'knightOrbital' : 'psyGrab';
    e.pack.cd = { knightOrbital: 4, futureAttack: 9 };
    e.mist = true; e.untargetable = true;
    resetPackRuntime(e); resetPackRuntime(e);
    assert.deepEqual([e.hp, e.maxHp, e.damage], [731, 3000, 47]);
    assert.deepEqual(e.pack.cd, { knightOrbital: 4, futureAttack: 9 });
    assert.equal(e.pack.attack, null); assert.equal(e.mist, false); assert.equal(e.untargetable, false);
    if (kind === 'nanobotKnight') assert.ok(!e.packAttacks.includes('knightOrbital'));
    else assert.equal(e.packAttacks.filter((id) => id === 'psyOrbital').length, 1);
  }
});

test('real Game snapshot/reload updates both legacy beast kits and clears transient effects', () => {
  for (const kind of ['nanobotKnight', 'psychicCrystal']) {
    const save = freshSave(); save.seed = `LOCAL-LEGACY-${kind}`; save.level = 12;
    let rx = 7, ry = 2;
    save.worldBeasts = { [kind]: { active: { rx, ry, tries: 1, patience: 11 }, cycle: 2 } };
    ensureWorldBeasts(save);
    const game = new Game(save, 0);
    // Game adds hamlets/landscape after base generation, so choose from its actual loaded maps.
    let e;
    for (let n = 0; n < 24 && !e; n++, rx += e ? 0 : 1) {
      save.worldBeasts[kind].active = { rx, ry, tries: 1, patience: 11 };
      save.questingBeast.cooldown = 100;
      game.rx = rx; game.ry = ry; game.loadArea('overworld', false);
      e = game.enemies.find((q) => q.worldBeast === kind);
    }
    assert.ok(e, kind); e.hp = 123; e.damage = 37;
    e.packAttacks = kind === 'nanobotKnight'
      ? [...MONSTER_PACK[kind].attacks, 'knightOrbital']
      : MONSTER_PACK[kind].attacks.filter((id) => id !== 'psyOrbital');
    e.pack.attack = kind === 'nanobotKnight' ? 'knightOrbital' : 'psyGrab';
    e.pack.cd.futureAttack = 7;
    game.packEffects.push({ kind: 'orbital', owner: e.id, arming: 0, life: 2, x: e.x, y: e.y });
    game.snapshotArea();
    const serialized = JSON.parse(JSON.stringify(save)), migrated = migrateSave(serialized);
    assert.equal(migrated.worldBeasts[kind].active.tries, 1);
    const resumed = new Game(migrated, 0);
    resumed.rx = rx; resumed.ry = ry; resumed.loadArea('overworld', false);
    const restored = resumed.enemies.find((q) => q.worldBeast === kind);
    assert.ok(restored, kind); assert.equal(restored.hp, 123); assert.equal(restored.damage, 37);
    assert.equal(restored.pack.attack, null); assert.equal(restored.pack.cd.futureAttack, 7);
    assert.equal(resumed.packEffects.length, 0);
    if (kind === 'nanobotKnight') assert.ok(!restored.packAttacks.includes('knightOrbital'));
    else assert.equal(restored.packAttacks.filter((id) => id === 'psyOrbital').length, 1);
  }
});

function dungeonMap(wet = true) {
  return { width: 30, entry: { x: 3, y: 3 }, tiles: Array.from({ length: 900 }, (_, i) => {
    const x = i % 30, y = Math.floor(i / 30), water = wet && x === 20 && y === 12;
    return { x, y, kind: water ? 'dungeonWater' : 'deepFloor', blocked: water };
  }) };
}
function dungeonSave(level = 8, seed = 'LOCAL-PUDDLE') {
  const s = freshSave(); s.seed = seed; s.level = level; s.perception.aperture = 1e6; /* release 273: Aperture-tier gate */ ensureWorldBeasts(s); s.worldBeasts.voidWalker.cooldown = 999; s.worldBeasts.astralWorm.cooldown = 999; return s; // Crystal-only fixture, independent of the dry-dungeon Walker.
}
test('one dungeonWater tile qualifies at level eight and depth five and survives save/retreat', () => {
  const map = dungeonMap();
  assert.equal(map.tiles.filter((t) => t.kind === 'dungeonWater').length, 1);
  let save, spawn, id;
  for (let i = 0; i < 100 && !spawn; i++) {
    save = dungeonSave(8); id = `dungeon:LOCAL-PUDDLE:g1:3:2:puddle-${i}`;
    spawn = worldBeastForDungeon(save, map, id);
  }
  assert.ok(spawn?.kind === 'psychicCrystal');
  assert.ok(Math.hypot(spawn.x - map.entry.x, spawn.y - map.entry.y) >= 7);
  assert.ok(Math.abs(spawn.x - 20) + Math.abs(spawn.y - 12) <= 4);
  const round = migrateSave(JSON.parse(JSON.stringify(save)));
  assert.equal(round.worldBeasts.psychicCrystal.active.dungeon, id);
  assert.equal(worldBeastForDungeon(round, map, id).id, spawn.id);
  beginDungeonRetreat(round, 'psychicCrystal', map);
  const target = retreatTarget(round.worldBeasts.psychicCrystal.active.retreat, 'psychicCrystal', map, 0, 0, {}, spawn);
  assert.deepEqual([target.x, target.y, target.home], [20, 12, true]);
  assert.deepEqual(worldBeastsLost(round, 'dungeon', 0, 0, id), []);
  assert.deepEqual(worldBeastsLost(round, 'overworld', 0, 0), ['psychicCrystal']);
});

test('single-puddle eligibility allows young players and retains depth, ordinary-ID, cooldown, and one-hunt gates', () => {
  for (let i = 0; i < 80; i++) {
    const wet = dungeonMap(), ordinary = `dungeon:LOCAL-PUDDLE:g1:3:2:puddle-${i}`;
    assert.equal(worldBeastForDungeon(dungeonSave(8), dungeonMap(false), ordinary), null, 'dry');
    assert.deepEqual(worldBeastForDungeon(dungeonSave(1), wet, ordinary), worldBeastForDungeon(dungeonSave(8), wet, ordinary), 'young players share the same eligibility, not weaker beasts');
    for (const id of [`dungeon:LOCAL-PUDDLE:g1:2:2:near-${i}`, 'dungeon:LOCAL-PUDDLE:g1', `arena:${i}`, `hunt-instance:${i}`, `dungeon:LOCAL-PUDDLE:g1:3:2:room:level:${i}`]) {
      assert.equal(worldBeastForDungeon(dungeonSave(8), wet, id), null, id);
    }
    const cooling = dungeonSave(); cooling.worldBeasts.psychicCrystal.cooldown = 1;
    assert.equal(worldBeastForDungeon(cooling, wet, ordinary), null, 'cooldown');
    const occupied = dungeonSave(); occupied.worldBeasts.psychicCrystal.active = { rx: 20, ry: 20, tries: 0 };
    assert.equal(worldBeastForDungeon(occupied, wet, ordinary), null, 'existing overworld hunt');
  }
});

test('pack recoil, hit stun, and scatter timers decay and clamp to zero', () => {
  const w = world(), e = actor(w, 'nanobotKnight');
  e.packAttacks = []; e.recoil = .3; e.hitStun = .4; e.scattered = .45;
  step(w, .1);
  assert.ok(e.recoil > 0 && e.recoil < .3);
  assert.ok(e.hitStun > 0 && e.hitStun < .4);
  assert.ok(e.scattered > 0 && e.scattered < .45);
  step(w, .5);
  assert.deepEqual([e.recoil, e.hitStun, e.scattered], [0, 0, 0]);
});

const IDLE_INPUT = { state: { x: 0, y: 0 }, consume: () => false };
function productionCombat() {
  const save = freshSave(); save.seed = 'CRYSTAL-RELEASE-REGRESSIONS'; save.level = 8; save.maxHp = 1000;
  const game = new Game(save, 0), width = 30;
  const map = { width, height: width, entry: { x: 4, y: 4 }, objects: [], enemySpawns: [],
    tiles: Array.from({ length: width * width }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'floor', blocked: false })) };
  Object.assign(game, { area: 'dungeon', map, enemies: [], effects: [], packEffects: [], projectiles: [], paused: false });
  const id = `dungeon:${save.seed}:g1:5:5:regression`;
  save.session.activeDungeonId = id; save.worldBeasts.psychicCrystal.active = { dungeon: id, tries: 0 };
  Object.assign(game.player, { x: 13, y: 10, hp: 1000, invulnerableUntil: 0, dodgeUntil: 0 });
  const e = createCombatant('psychicCrystal', 10, 10, true, []);
  Object.assign(e, { id: 'regression-crystal', worldBeast: 'psychicCrystal', aggro: true, evasive: false,
    hp: 3000, maxHp: 3000, damage: 20, packAttacks: [], packBossAttacks: [] });
  game.enemies = [e];
  return { save, game, e, map };
}

test('production pause preserves a live Crystal hold and resumes the remaining time before the normal crush', () => {
  const { game, e } = productionCombat(); e.packAttacks = ['psyGrab']; e.pack.gap = 0;
  let now = 1000;
  for (let i = 0; i < 80 && e.pack.phase !== 'active'; i++) { now += 50; game.update(.05, IDLE_INPUT, now); }
  assert.equal(e.pack.attack, 'psyGrab'); assert.equal(e.pack.phase, 'active');
  assert.equal(game.player.heldBy, e.id); assert.ok(game.packWorld(.05, now).held(e));
  const deadline = game.player.heldUntil, left = e.pack.t, hp = game.player.hp;
  game.setPaused(true, now);
  for (let i = 1; i <= 10; i++) game.update(.05, IDLE_INPUT, now + i * 1000);
  assert.equal(e.pack.t, left); assert.equal(game.player.hp, hp);
  game.setPaused(false, now + 10000); now += 10000;
  assert.equal(game.player.heldUntil, deadline + 10000, 'pause elapsed shifts the held deadline just like dodge/attack deadlines');
  assert.ok(game.packWorld(.05, now).held(e), 'pause is not interpreted as a dodge escape');
  now += 50; game.update(.05, IDLE_INPUT, now);
  assert.equal(e.pack.phase, 'active'); assert.equal(game.player.hp, hp, 'crush does not happen on the first resumed frame');
  let resumedSeconds = .05;
  for (let i = 0; i < 100 && e.pack.phase === 'active'; i++) { now += 50; resumedSeconds += .05; game.update(.05, IDLE_INPUT, now); }
  assert.equal(e.pack.phase, 'recover'); assert.ok(resumedSeconds >= left - .05);
  assert.ok(game.player.hp < hp, 'with no struggle input, the resumed grab still crushes normally');
  assert.equal(game.player.heldUntil, 0); assert.ok(game.packEffects.some((f) => f.kind === 'psyRing'));
});

test('production Needle Caster shot reflects while crossing a mirror between frame endpoints', () => {
  const { game, save, e } = productionCombat(); e.aggro = false;
  save.equipment.secondary = { id: 'secondary-needle-caster', name: 'Needle Caster', slot: 'secondary', power: 8, property: 'quick' };
  Object.assign(game.player, { x: 10.725, y: 10, attackReadyAt: 0 });
  assert.equal(game.fireSecondary(1000, { x: -1, y: 0 }), true);
  const shot = game.projectiles[0], damage = shot.damage;
  assert.equal(shot.speed, 15); assert.ok(Math.abs(shot.x - 10.875) < 1e-10);
  assert.ok(Math.abs((shot.x - shot.speed * .05) - 10.125) < 1e-10);
  assert.ok(Math.abs(shot.x - 10.5) > CRYSTAL.wallThickness && Math.abs(shot.x - shot.speed * .05 - 10.5) > CRYSTAL.wallThickness);
  game.packEffects = [{ id: 'live-mirror', kind: 'psyWall', owner: e.id, x: 10, y: 10, nx: 1, ny: 0, arming: 0, life: 5, total: 5, damage: 0 }];
  Object.assign(game.player, { x: 25, y: 25 }); // Observe the returned projectile before it hits its original shooter.
  const behind = createCombatant('ashling', 9.4, 10, false, []); behind.id = 'behind-mirror'; behind.hp = behind.maxHp = 100;
  game.enemies.push(behind);
  game.update(.05, IDLE_INPUT, 1050);
  assert.ok(game.projectiles.includes(shot)); assert.equal(shot.hostile, true);
  assert.equal(shot.reflectedBy, 'live-mirror'); assert.equal(shot.dx, 1); assert.equal(shot.dy, 0);
  assert.ok(shot.x > 10.875, 'remaining frame distance travels back from the mirror contact');
  assert.equal(shot.damage, Math.max(1, Math.round(damage * CRYSTAL.reflectShare)));
  assert.equal(shot.pierce, 0); assert.equal(behind.hp, 100, 'the protected target behind the mirror cannot be hit first');
  const x = shot.x, reflectedDamage = shot.damage;
  game.update(.05, IDLE_INPUT, 1100);
  assert.ok(shot.x > x); assert.equal(shot.damage, reflectedDamage, 'returning through the same wall does not repeatedly reduce damage');
});

function sweepShots(shots, enemies, map, walls = []) {
  return updateProjectiles(shots, enemies, map, map.width, .05, undefined, undefined, null, undefined, undefined, undefined, walls);
}
function needle(overrides = {}) {
  return { id: 'needle', x: 10.875, y: 10.45, dx: -1, dy: 0, speed: 15, life: 1, damage: 10,
    damageType: 'physical', path: 'straight', pierce: 0, ...overrides };
}

test('swept projectile reflection chooses the nearest mirror and cannot damage the enemy behind its plane', () => {
  const { map } = productionCombat();
  const near = { id: 'near', kind: 'psyWall', x: 10, y: 10, nx: 1, ny: 0, arming: 0, life: 5 };
  const far = { ...near, id: 'far', x: 9.95 };
  const e = createCombatant('ashling', 9.4, 10, false, []); e.id = 'protected'; e.hp = 100;
  const shot = needle();
  assert.equal(sweepShots([shot], [e], map, [far, near]).length, 1);
  assert.equal(shot.reflectedBy, 'near', 'effect-array order does not override earliest contact');
  assert.equal(shot.hostile, true); assert.equal(shot.dx, 1); assert.equal(e.hp, 100);
  assert.ok(Math.abs(shot.x - (2 * (10.5 + CRYSTAL.wallThickness) - (10.875 - .75))) < 1e-9,
    'the reflected endpoint retains the untravelled substep distance');
});

test('swept mirror integration preserves same-wall suppression, hostile shots, warnings and ordinary weapon hits', () => {
  const { map } = productionCombat();
  const wall = { id: 'mirror', kind: 'psyWall', x: 10, y: 10, nx: 1, ny: 0, arming: 0, life: 5 };
  for (const [shot, walls] of [
    [needle({ reflectedBy: wall.id }), [wall]],
    [needle({ hostile: true }), [wall]],
    [needle(), [{ ...wall, arming: .1 }]],
    [needle({ y: 10.45 + CRYSTAL.wallLength / 2 + .1 }), [wall]],
  ]) {
    sweepShots([shot], [], map, walls);
    assert.equal(shot.dx, -1); assert.equal(shot.damage, 10); assert.ok(Math.abs(shot.x - 10.125) < 1e-9);
  }
  for (const walls of [[], [{ ...wall, x: 25 }]]) {
    const e = createCombatant('ashling', 9.4, 10, false, []); e.id = 'ordinary-target'; e.hp = 100;
    const shot = needle(); const remaining = sweepShots([shot], [e], map, walls);
    assert.equal(e.hp, 90, 'a nonintersecting/no mirror does not interfere with ordinary weapon damage');
    assert.equal(remaining.length, 0); assert.equal(shot.dead, true);
  }
});
