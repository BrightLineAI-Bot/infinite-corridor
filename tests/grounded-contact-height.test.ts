import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTOR_BODY_HEIGHT, ACTOR_CONTACT, actorContactHeight, actorContactSupport, actorContactContext, ordinaryContactEnemy } from '../src/actor-contact.ts';
import { createCombatant, enemyBodyRadius } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { BRAWLER_GEAR, jumpLift } from '../src/game.ts';
import { liftAt, LIFT_PER_LEVEL, tileLiftScale } from '../src/landscape.ts';
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

test('Fists and Shadow Boxing cannot use a small platform support difference to pass through the body', () => {
  for (const action of ['fist', 'boxing']) {
    const g = platform(false, 'fists'), e = g.enemies[0]; g.lockTarget(e.id);
    if (action === 'fist') g.fistPunch(2, 1, 1000, { x: 0, y: 1 });
    else assert.equal(g.shadowBoxStep(1, 1000), true);
    assert.ok(Math.hypot(g.player.x - e.x, g.player.y - e.y) >= ACTOR_CONTACT.playerRadius + enemyBodyRadius(e) - 1e-7);
    assert.ok(g.player.y < e.y); assert.equal(ordinaryContactEnemy(e), true);
  }
});
