import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTOR_BODY_HEIGHT, ACTOR_CONTACT, actorContactHeight, actorContactSupport, actorContactContext, ordinaryContactEnemy } from '../src/actor-contact.ts';
import { createCombatant, enemyBodyRadius } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { BRAWLER_GEAR, Game, jumpLift } from '../src/game.ts';
import { liftAt, LIFT_PER_LEVEL, tileLiftScale } from '../src/landscape.ts';
import { freshSave } from '../src/types.ts';
// Mesh imports are offline calibration only; runtime contact imports combat + landscape.
import { actorPresentation, actorModelKey } from '../src/actor-presentation.ts';
import { writeCloseViewModel, MODEL_FLOATS } from '../src/close-view-models.ts';
import { playerFormPresentation } from '../src/close-view-player-presentation.ts';
import { foundryModelKey } from '../src/close-view-foundry-presentation.ts';

const data = new Float32Array(30000);
function meshTop(kind, scale, z = 0) {
  let high = -Infinity;
  for (const pace of [0, 1]) for (const reduceMotion of [false, true]) for (let i = 0; i < 32; i++) {
    const n = writeCloseViewModel(data, 0, { kind, scale, z, x: 0, y: 0, yaw: 0, phase: i * Math.PI / 16, pace, pose: 'idle', amount: 0, reduceMotion });
    assert.ok(n > 0, kind);
    for (let j = 2; j < n; j += MODEL_FLOATS) high = Math.max(high, data[j]);
  }
  return high;
}
const input = (y, jump = false) => { let used = false; return { state: { x: 0, y }, consume: k => jump && k === 'jump' && !used && (used = true), held: () => false }; };
function platform(view = false, form = 'ordinary') {
  const { game: g } = createLabFixture({ lab: 'close-view', scenario: 'platform-chain', seed: 'CONTACT-AUDIT', now: 1000 });
  assert.equal(g.map.tiles[4 * g.map.width + 21].elev, 1);
  assert.equal(g.map.tiles[5 * g.map.width + 21].elev, 0);
  Object.assign(g.player, { x: 21, y: 4, invulnerableUntil: 1e9 }); g.save.closeView = view;
  if (form === 'fists') g.save.equipment.primary = { ...BRAWLER_GEAR[0].item };
  if (form === 'robot' || form === 'powered') g.save.mech = { built: true, active: true, mode: 'robot', fuel: 100, hp: 100, empowered: form === 'powered' };
  g.enemies = [Object.assign(createCombatant('rootBrute', 21, 5.15), { hitStun: 1e6 })];
  return g;
}
function floorQuery(kind, playerLevel, enemyLevel, extra = {}) {
  const width = 12, map = { width, height: 12, landscape: { interior: true }, interiorTerrain: { version: 1, maxLevel: 5 }, tiles: Array.from({ length: 144 }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'flagFloor', blocked: false, elev: 0 })) };
  const player = { x: 4.2, y: 5, isPlayer: true, hp: 100, ...extra }, e = createCombatant(kind, 5, 5);
  map.tiles[5 * width + 4].elev = playerLevel; map.tiles[5 * width + 5].elev = enemyLevel;
  const g = { player, enemies: [e], map, save: {} };
  return { g, e, clip: () => actorContactContext(g, player, .16, 0).clip(player.x, player.y, .16, 0) };
}

test('canonical per-kind envelopes cover native idle/walk bodies at actual authored and trait scales', () => {
  for (const kind of Object.keys(ACTOR_BODY_HEIGHT.kinds)) for (const traits of [[], ['vital'], ['plated']]) {
    const e = createCombatant(kind, 0, 0, false, traits), p = actorPresentation(e);
    assert.ok(p, kind);
    assert.ok(actorContactHeight(e) >= meshTop(actorModelKey(e), p.scale, p.bodyLift) - 1e-6, `${kind}: calibrated body must fit policy`);
  }
  for (const body of Object.keys(ACTOR_BODY_HEIGHT.foundry)) for (const scale of [.25, 4]) {
    const e = { kind: 'latticeHunter', foundryValidated: true, foundryBody: body, scale };
    const z = (body === 'floating' ? .2 : body === 'geometric' ? .12 : 0) * scale;
    assert.ok(actorContactHeight(e) >= meshTop(foundryModelKey(body, 6), scale, z) - 1e-6, body);
  }
  assert.ok(actorContactHeight(createCombatant('rootBrute', 0, 0)) > 2.44, 'native admission uses scale1.32, not billboard radius scale1.0472');
});

test('adult, Fists, grounded mech and Ember policies cover body art without using held weapon tips', () => {
  for (const kind of ['ordinary', 'fists', 'robot', 'powered', 'ember']) {
    const g = platform(false, kind);
    if (kind === 'ember') (g.save.magicSkills ||= {}).active = { id: 'ember-form', rank: 3, remaining: 10 };
    const f = playerFormPresentation(g), height = actorContactHeight(g.player, g);
    assert.ok(height >= meshTop(f?.kind || 'playerUnarmed', f?.scale || 1) - 1e-6, kind);
    assert.ok(height >= 1.68 * .82, 'adult clearance remains covered by the future adult powered-suit body');
  }
  assert.equal(actorContactHeight({ kind: 'future-kind', scale: 100, bodyRadius: 100 }), 12);
  assert.equal(actorContactHeight({ kind: 'future-kind', scale: NaN }), 3);
  const runtime = readFileSync(new URL('../src/actor-contact.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(runtime, /from\s+["'][^"']*(?:close-view|presentation)/, 'no renderer dependency in collision');
});

test('actual v4 same-floor and one-level platform Jump cannot cross the Root Brute in either view or grounded player form', () => {
  for (const flat of [false, true]) for (const form of ['ordinary', 'fists', 'robot', 'powered']) {
    const endings = [];
    for (const view of [false, true]) {
      const g = platform(view, form), e = g.enemies[0], r = ACTOR_CONTACT.playerRadius + enemyBodyRadius(e);
      if (flat) { g.player.y = 5; e.y = 6.15; }
      let min = Infinity;
      for (let i = 0; i < 15; i++) {
        const now = 1000 + i * 50; g.update(.05, input(1, i === 0), now);
        min = Math.min(min, Math.hypot(g.player.x - e.x, g.player.y - e.y));
        assert.ok(min >= r - 1e-7, `${form}/${view} at ${now}: no body overlap`);
        assert.equal(g.mechBoosting, false);
        assert.ok(jumpLift(g, now) <= .42);
      }
      assert.equal(g.jumpUntil, 1520, 'ordinary jump clock unchanged');
      assert.ok(g.player.y < e.y);
      endings.push([g.player.x, g.player.y, g.player.hp, g.jumpUntil, g.save.mech?.fuel]);
    }
    assert.deepEqual(endings[0], endings[1]);
  }
});

test('true upper support clears a low crawler but small steps cannot clear an upright body in either direction', () => {
  const low = floorQuery('pallidCrawler', 2, 0), tall = floorQuery('rootBrute', 2, 0);
  assert.ok(2 * LIFT_PER_LEVEL > actorContactHeight(low.e));
  assert.equal(low.clip(), 1, 'supported .68-high feet clear .496-high crawler envelope');
  assert.ok(tall.clip() < 1, 'same .68-high feet remain inside upright brute');
  const above = floorQuery('rootBrute', 0, 2), high = floorQuery('rootBrute', 0, 5);
  assert.ok(above.clip() < 1, 'brute feet at .68 still overlap lower adult body');
  assert.equal(high.clip(), 1, 'brute supported at1.70 is above lower adult1.44');
  const hop = floorQuery('rootBrute', 0, 0, { jumping: true });
  assert.ok(hop.clip() < 1, 'ordinary jump arc is not a support level');
  const reverse = actorContactContext(tall.g, tall.e, -.16, 0);
  assert.ok(reverse.clip(5, 5, -.16, 0) < 1, 'enemy movement uses the same body intervals');
});

test('support uses authoritative canopy and roof world scales, retained launch scales and current ramp sampling', () => {
  const q = floorQuery('rootBrute', 3, 0), g = q.g, t = g.map.tiles[5 * g.map.width + 4];
  delete g.map.interiorTerrain; g.map.landscape = { kind: 'hills' };
  t.canopy = true;
  assert.equal(actorContactSupport(g, g.player, 4.2, 5, g.map.width), liftAt(g.map, g.map.width, 4.2, 5));
  assert.equal(q.clip() < 1, true, 'canopy2× level3 gives2.04, below brute2.508');
  delete t.canopy; t.roofLift = 3;
  assert.equal(tileLiftScale(t), 3); assert.equal(q.clip(), 1, 'roof3× level3 gives3.06 and clears brute');
  t.elev = 0; t.roofLift = 1; g.player.jumping = true; g.skyAir = 3; g.skyAirScale = 3;
  assert.equal(q.clip(), 1, 'retained physical roof launch uses its launch scale after departure');
  g.player.airElev = 1; g.player.airElevScale = 1;
  assert.ok(q.clip() < 1, 'preflight launch support overrides prior Game support without changing Game');
  assert.equal(g.skyAir, 3); assert.equal(g.skyAirScale, 3);
  delete g.player.airElev; delete g.player.airElevScale; g.player.jumping = false;
  assert.ok(q.clip() < 1, 'expired jump cannot retain old launch clearance');
  g.map.interiorTerrain = { version: 1, maxLevel: 5 }; t.elev = 2; t.slope = true; t.rampDir = 'east';
  assert.equal(actorContactSupport(g, g.player, 4.2, 5, g.map.width), liftAt(g.map, g.map.width, 4.2, 5));
});

test('Game supplies authoritative disc, disc-flight and occupied-raft support without blanket ghosting', () => {
  const width = 12, g = new Game(freshSave(), 1000);
  g.area = 'overworld';
  g.map = { width, height: 12, landscape: { kind: 'plains' }, skyDiscs: [{ x: 4.7, y: 5.75, r: 1.15, level: 3 }],
    tiles: Array.from({ length: width * width }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'plain', blocked: false, elev: 0 })) };
  Object.assign(g.player, { x: 4.2, y: 5, hp: 100 });
  g.skyLevel = 3;
  assert.equal(actorContactSupport(g, g.player, 4.2, 5, width), 3 * LIFT_PER_LEVEL);
  assert.equal(actorContactSupport(g, g.player, 7, 5, width), 0, 'stale skyLevel grants nothing off its disc');
  g.player.jumping = true; g.discAir = 4; g.skyLevel = 0;
  assert.equal(actorContactSupport(g, g.player, 7, 5, width), 4 * LIFT_PER_LEVEL, 'disc launch persists over its gap');
  g.player.jumping = false; g.discAir = null; g.map.skyDiscs = [];
  g.map.tiles[5 * width + 4].chasm = true;
  g.map.movers = [{ id: 'raised', pts: [{ x: 4, y: 5 }, { x: 4, y: 5 }], amp: 2 }];
  assert.equal(actorContactSupport(g, g.player, 4, 5, width), 2 * LIFT_PER_LEVEL);
  assert.equal(actorContactSupport(g, g.player, 7, 5, width), 0, 'raft height follows its current footprint');
  g.map.movers[0].amp = -1.6;
  assert.equal(actorContactSupport(g, g.player, 4, 5, width), -1.6 * LIFT_PER_LEVEL, 'sunken support remains signed');
});

test('actual disc and raised-raft updates clear a low foe both ways while ground and tall controls remain solid', () => {
  const make = (kind = 'pallidCrawler') => {
    const g = new Game(freshSave(), 1000), width = 32;
    g.area = 'overworld';
    g.map = { width, height: 32, objects: [], landscape: { kind: 'plains' }, skyDiscs: [{ x: 3.5, y: 5.75, r: 1.15, level: 3 }],
      tiles: Array.from({ length: width * width }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'plain', blocked: false, elev: 0 })) };
    Object.assign(g.player, { x: 3, y: 5, hp: 100, invulnerableUntil: 1e9 });
    const e = Object.assign(createCombatant(kind, 4, 5), { hitStun: 1e9 });
    g.enemies = [e];
    return { g, e };
  };
  const right = { state: { x: 1, y: 0 }, consume: () => false, held: () => false };
  const move = (g, frames) => { for (let i = 0; i < frames; i++) g.update(.05, right, 1050 + i * 50); };
  const disc = make(); disc.g.skyLevel = 3;
  assert.equal(actorContactContext(disc.g, disc.e, -.45, 0).clip(disc.e.x, disc.e.y, -.45, 0), 1);
  move(disc.g, 6);
  const ground = make();
  assert.ok(actorContactContext(ground.g, ground.e, -.45, 0).clip(ground.e.x, ground.e.y, -.45, 0) < 1);
  move(ground.g, 6);
  assert.ok(disc.g.player.x > ground.g.player.x + .3, 'disc rider walks freely above the crawler');
  const tall = make('rootBrute'); tall.g.skyLevel = 3; move(tall.g, 6);
  assert.ok(tall.g.player.x < disc.g.player.x - .2, 'raised player still overlaps a tall body');
  const raft = make(); raft.g.map.skyDiscs = []; raft.g.player.x = 4; raft.e.x = 5;
  raft.g.map.tiles[5 * 32 + 4].chasm = true;
  raft.g.map.movers = [{ id: 'raised', pts: [{ x: 4, y: 5 }, { x: 4, y: 5 }], amp: 2 }];
  move(raft.g, 4);
  assert.ok(raft.g.player.x > 4.4, 'occupied raised raft clears the crawler');
});

test('moving raised carrier keeps preflight support through contact and clears it after commit', () => {
  const run = (kind = null, pts = [{ x: 4, y: 5 }, { x: 6, y: 5 }], state = { x: 0, y: 0 }, startX = 4.16, wall = false) => {
    const g = new Game(freshSave(), 1000), width = 32;
    g.area = 'overworld'; g.save.playSeconds = .625; g.save.maxHp = 60;
    g.map = { width, height: 32, objects: [], landscape: { kind: 'plains' }, movers: [{ id: 'moving', pts, amp: 2, phase: 0 }],
      tiles: Array.from({ length: width * width }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'plain', blocked: false, elev: 0 })) };
    for (let y = 0; y < 32; y++) for (let x = 4; x <= 6; x++) g.map.tiles[y * width + x].chasm = true;
    if (wall) for (let y = 0; y < 32; y++) Object.assign(g.map.tiles[y * width + 5], { chasm: false, blocked: true, kind: 'wall' });
    const py = pts[1].y === pts[0].y ? 5 : 5.78;
    Object.assign(g.player, { x: startX, y: py, hp: 60, invulnerableUntil: 1e9 });
    g.enemies = kind ? [Object.assign(createCombatant(kind, startX + .69, py), { hitStun: 1e9 })] : [];
    g.update(.05, { state, consume: () => false, held: () => false }, 1050);
    return g;
  };
  const free = run(), low = run('pallidCrawler');
  assert.ok(free.player.x > 4.23 && low.player.x > 4.23, 'contact cannot cancel the carrier displacement');
  assert.equal(low.player.hp, 60); assert.ok(low.raftZ > 1.9, 'accepted endpoint remains aboard at current time');
  low.save.playSeconds = 2;
  const reverse = actorContactContext(low, low.enemies[0], -.2, 0);
  assert.ok(reverse && reverse.clip(low.enemies[0].x, low.enemies[0].y, -.2, 0) < 1, 'later enemy query cannot reuse cleared preflight support');
  const tall = run('rootBrute');
  assert.ok(tall.player.x < free.player.x, 'upper support still overlaps a tall body');
  const diagonal = run('pallidCrawler', [{ x: 4, y: 5 }, { x: 6, y: 7 }]);
  assert.equal(diagonal.player.hp, 60);
  assert.ok(diagonal.raftZ > 1.8, 'staged X/Y footprint follows a diagonal carrier corner');
  const cancelled = run('pallidCrawler', undefined, { x: -2 / 3, y: 0 });
  assert.equal(cancelled.raftZ, 0, 'opposed input may cancel carry and leave the moving footprint');
  assert.equal(cancelled.player.hp, 51, 'cancelled carry keeps the existing raised-raft fall consequence');
  const wall = run('pallidCrawler', undefined, { x: 1, y: 0 }, 4.16, true);
  assert.equal(wall.raftZ, 0); assert.equal(wall.player.hp, 51, 'a wall-refused carry keeps the existing raised-raft fall consequence');
  const off = run(null, undefined, { x: 1, y: 0 }, 5.82);
  assert.equal(off.raftZ, 0, 'final accepted endpoint, not preflight origin, decides raft occupancy');
  assert.equal(off.player.hp, 51, 'stepping off a raised carrier retains its existing two-level fall consequence');
  const paused = run(); paused.paused = true; const before = paused.save.playSeconds;
  paused.update(.05, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, 1100);
  assert.equal(paused.save.playSeconds, before, 'paused time cannot advance carrier support');
});

test('Fists and Shadow Boxing cannot use a small platform support difference to pass through the body', () => {
  for (const action of ['fist', 'boxing']) {
    const g = platform(false, 'fists'), e = g.enemies[0]; g.lockTarget(e.id);
    if (action === 'fist') g.fistPunch(2, 1, 1000, { x: 0, y: 1 });
    else assert.equal(g.shadowBoxStep(1, 1000), true);
    assert.ok(Math.hypot(g.player.x - e.x, g.player.y - e.y) >= ACTOR_CONTACT.playerRadius + enemyBodyRadius(e) - 1e-7);
    assert.ok(g.player.y < e.y); assert.equal(ordinaryContactEnemy(e), true);
  }
});
