// Release 283 (Tim, 2026-10-22): Continuous build. The chosen material is used first, then the next one when it runs
// out; with nothing affordable the Build button shows an X. save.build.continuous is additive.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { BUILD, activeBuildKind, setBuildKind, setContinuousBuild, ensureBuild } from '../src/building.ts';

test('the chosen material first, the next one only with Continuous build, none when nothing is affordable', () => {
  const s = freshSave(); s.materials.wood = BUILD.kinds.wood.cost.wood; s.materials.stone = BUILD.kinds.stone.cost.stone;
  setBuildKind(s, 'wood'); assert.equal(activeBuildKind(s), 'wood');
  s.materials.wood = 1; assert.equal(activeBuildKind(s), null, 'without Continuous build: an X');
  setContinuousBuild(s, true); assert.equal(activeBuildKind(s), 'stone', 'moves on to stone');
  s.materials.stone = 4; assert.equal(activeBuildKind(s), null, 'three or four stone is not a block');
  s.materials.wood = 9; assert.equal(activeBuildKind(s), 'wood', 'new stock of the chosen material is used again');
});

test('Continuous build is kept in the save and normalised', () => {
  const s = freshSave(); assert.equal(s.build.continuous, undefined);
  setContinuousBuild(s, true); assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).build.continuous, true);
  const odd = freshSave(); odd.build.continuous = 'yes'; assert.equal(ensureBuild(odd).build.continuous, false);
});
