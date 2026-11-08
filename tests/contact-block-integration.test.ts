import test from 'node:test';
import assert from 'node:assert/strict';
import { actorContactContext } from '../src/actor-contact.ts';
import { createCombatant } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { breakBuild, tickBuilds } from '../src/building.ts';
import { interiorSurfaceHeight, legacyInteriorBuildLevel, LIFT_PER_LEVEL } from '../src/landscape.ts';
import { projectileVisualPoint } from '../src/actor-presentation.ts';

function query(map, playerLevel = null) {
  const player = { x: 3.3, y: 3, isPlayer: true, hp: 100, jumping: playerLevel != null, airElev: playerLevel };
  const enemy = createCombatant('rootBrute', 4.2, 3);
  const g = { map, player, enemies: [enemy], save: {} };
  return actorContactContext(g, player, 1, 0).clip(player.x, player.y, 1, 0);
}
function flat() {
  return { width: 8, height: 8, building: { kind: 'keep' }, tiles: Array.from({ length: 64 }, (_, i) => ({ x: i % 8, y: Math.floor(i / 8), kind: 'flagFloor', elev: 0, blocked: false })) };
}

test('active legacy stone uses the same contact support as the corresponding current heightfield', () => {
  for (const level of [1, 2]) for (const launch of [null, 1, 2, 6]) {
    const legacy = flat(), current = flat();
    legacy.tiles[28] = { ...legacy.tiles[28], elev: 37, build: 'stone', buildLevel: level };
    current.landscape = { interior: true }; current.interiorTerrain = { version: 1, maxLevel: 5 };
    current.tiles[28].elev = level;
    assert.equal(legacyInteriorBuildLevel(legacy, legacy.tiles[28]), level);
    assert.equal(interiorSurfaceHeight(legacy, 4.7, 3.75), level * LIFT_PER_LEVEL);
    assert.equal(query(legacy, launch), query(current, launch), `level ${level}, launch ${launch}`);
  }
});

test('unbuilt historical elevations and wood never become legacy contact support', () => {
  const base = flat(), old = flat(); old.tiles[28].elev = 37;
  assert.equal(query(old), query(base));
  old.tiles[28].build = 'wood'; old.tiles[28].buildLevel = 2;
  assert.equal(query(old), query(base));
  assert.equal(interiorSurfaceHeight(old, 4.7, 3.75), 0);
});

test('real legacy build, stack, top break and expiry expose only the current transient contact support', () => {
  const f = createLabFixture({ lab: 'close-view', scenario: 'build-blocks-legacy', seed: 'CONTACT-BLOCK-BRIDGE', now: 1000 });
  const g = f.game, at = f.buildPractice.lane.one, original = g.map.tiles[at.y * g.map.width + at.x];
  const level = () => legacyInteriorBuildLevel(g.map, g.map.tiles[at.y * g.map.width + at.x]);
  assert.equal(level(), 0);
  for (const expected of [1, 2]) {
    assert.equal(g.buildAt(at.x + .5, at.y + .5).ok, true);
    assert.equal(level(), expected);
    assert.equal(interiorSurfaceHeight(g.map, at.x + .5, at.y + .75), expected * LIFT_PER_LEVEL);
  }
  breakBuild(g, g.builds[1]); assert.equal(level(), 1);
  tickBuilds(g, 10); assert.equal(level(), 0);
  assert.equal(g.map.tiles[at.y * g.map.width + at.x], original);
});

test('stone footing and contact-clamped startup release from the accepted current position at finite height', () => {
  const f:any = createLabFixture({ lab: 'close-view', scenario: 'build-blocks-legacy', seed: 'CONTACT-BLOCK-TOOL', now: 100000 });
  const g:any = f.game, at = f.buildPractice.lane.one;
  assert.equal(g.buildAt(at.x + .5, at.y + .5).ok, true);
  g.player.x = at.x + .05; g.player.y = at.y + .05;
  g.save.closeView = true; g.save.activeWeaponSlot = 'primary';
  g.save.equipment.secondary = { id: 'secondary-rift-bombard', name: 'Rift Bombard', slot: 'secondary', power: 5, property: 'blast' };
  const blocker:any = createCombatant('ashling', g.player.x + .8, g.player.y); blocker.hitStun = 1e9; g.enemies = [blocker]; g.projectiles = [];
  assert.equal(interiorSurfaceHeight(g.map, g.player.x + .5, g.player.y + .45), LIFT_PER_LEVEL);
  assert.equal(g.fireSecondary(100000, { x: 0, y: -1 }), true);
  const pending = structuredClone(g.pendingToolUse), startX = g.player.x;
  g.update(pending.startupMs / 1000, { state: { x: 1, y: 0 }, consume: () => false, held: () => false }, pending.releaseAt);
  const shot = g.projectiles.find((p:any) => p.id === `${pending.id}-base`);
  assert.ok(g.player.x > startX && g.player.x < startX + 2.4 * pending.startupMs / 1000);
  assert.ok(shot); assert.ok(Math.abs(shot.x - (g.player.x + .5 + pending.aim.x * .35)) < 1e-9);
  assert.deepEqual([shot.dx, shot.dy], [pending.aim.x, pending.aim.y]);
  const point = projectileVisualPoint(shot, interiorSurfaceHeight(g.map, shot.x, shot.y));
  assert.ok([point.x, point.y, point.z].every(Number.isFinite));
  const life = g.builds[0].life; g.setPaused(true, pending.releaseAt); g.update(20, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, pending.releaseAt + 20000);
  assert.equal(g.builds[0].life, life, 'pause leaves the independent active-block lifetime unchanged');
});
