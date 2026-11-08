import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture, labReport, scenariosForLab, teleportTargets } from '../src/proving-ground-labs.ts';

const drive = (game, axis, frames, jump = false) => { let take = jump, now = Math.max(1000, Number(game.lastUpdateNow) || 0); const input = { state: { x: 0, y: axis }, consume: (k) => k === 'jump' && take ? (take = false, true) : false, held: () => false }; for (let i = 0; i < frames; i++) game.update(.016, input, now += 16); return now; };
const pressAct = (game) => { let take = true; const now = Math.max(1000, Number(game.lastUpdateNow) || 0) + 16; game.update(.016, { state: { x: 0, y: 0 }, consume: (k) => k === 'interact' && take ? (take = false, true) : false, held: () => false }, now); return now; };

test('Close View excavation ramp is a quiet real generated v4 witness with an origin teleport', () => {
  assert.equal(scenariosForLab('close-view').find((q) => q.id === 'terrain-dig-return')?.label, 'Traversal: excavation ramp return');
  const f = createLabFixture({ lab: 'close-view', scenario: 'terrain-dig-return', seed: 'DIG-AUDIT0', now: 0 }), d = f.diagnostics.traversal;
  assert.equal(f.game.areaStateId(), 'building:DIG-AUDIT0:1:1:keep:4:f1'); assert.equal(f.game.map.building.interiorVersion, 4); assert.equal(d.found, true); assert.deepEqual([d.origin.x, d.origin.y, d.facing], [18, 25, 'down']); assert.deepEqual([d.target.x, d.target.y, d.oldWallHeight, d.edgeSupport], [18, 26, 0, 2]);
  assert.equal(f.game.enemies.length, 0); assert.equal(f.save.digging.shovel, 2); assert.deepEqual([f.save.materials.wood, f.save.materials.stone], [3, 3]); assert.equal(f.game.map.tiles[26 * f.game.map.width + 18].blocked, true); assert.equal(f.game.map.tiles[26 * f.game.map.width + 18].tunnel, undefined);
  assert.deepEqual(teleportTargets(f)[0], { id: 'excavation-ramp', label: 'Excavation ramp', x: 18, y: 25 }); assert.equal(f.developerHint, 'Face cut wall, Act to dig, walk across and back.');
});

test('the lab uses actual Game digging and controls, and diagnostics follow the opened durable surface', () => {
  const f = createLabFixture({ lab: 'close-view', scenario: 'terrain-dig-return', seed: 'DIG-AUDIT0', now: 0 }), g = f.game; pressAct(g); assert.equal(g.map.tiles[26 * g.map.width + 18].elev, 2); assert.equal(g.map.tiles[26 * g.map.width + 18].tunnel, true); assert.equal(g.save.digging.shovel, 1); assert.equal(g.save.digging.surfaces[g.areaStateId()]['18,26'].elev, 2); assert.match(g.message, /dig a block|break through/i);
  drive(g, 1, 25); assert.ok(g.player.y > 25.7); const hp = g.player.hp; drive(g, -1, 35, true); assert.ok(g.player.y < 25.25); assert.equal(g.player.hp, hp);
  const report = labReport(f); assert.equal(report.diagnostics.traversal.opened, true); assert.equal(report.diagnostics.traversal.liveElevation, 2); assert.equal(report.diagnostics.traversal.storedSurface.elev, 2);
});

test('another seed reports an honest production candidate or an honest no-candidate fallback', () => {
  const f = createLabFixture({ lab: 'close-view', scenario: 'terrain-dig-return', seed: 'CINDER-VERGE-47', now: 0 }), d = f.diagnostics.traversal;
  assert.equal(d.feature, 'dig-return'); assert.equal(f.game.map.building.interiorVersion, 4); assert.equal(f.game.enemies.length, 0);
  if (d.found) { const source = f.game.map.tiles[d.origin.y * f.game.map.width + d.origin.x], target = f.game.map.tiles[d.target.y * f.game.map.width + d.target.x]; assert.equal(source.slope, true); assert.equal(target.blocked, true); assert.ok(d.edgeSupport - d.oldWallHeight >= 2); }
  else assert.match(d.note, /No production ramp edge beside diggable rock/);
});

