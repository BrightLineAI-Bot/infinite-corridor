import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { createCombatant } from '../src/combat.ts';

const options = { lab: 'close-view', scenario: 'vertical-gallery-lift', seed: 'CINDER-VERGE-47', now: 1000 };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };

function fixture() { return createLabFixture(options); }
function advance(game, seconds, input = idle) {
  let now = game.lastUpdateNow || 1000;
  for (let left = seconds; left > 1e-9;) { const dt = Math.min(.05, left); now += dt * 1000; game.update(dt, input, now); left -= dt; }
}

test('opt-in lift stays separate from map movers and carries a height-matched rider through the accepted loop', () => {
  const { game, diagnostics } = fixture(), lift = diagnostics.verticalGallery.galleryLift;
  assert.ok(lift && game.scratchGalleryLift); assert.equal(game.map.movers?.length || 0, 0);
  advance(game, .05);
  assert.equal(game.scratchGalleryLift.rider, true);
  advance(game, 5.2);
  const upper = game.scratchGalleryLiftSnapshot();
  assert.equal(upper.pose.phase, 'dwell-upper');
  assert.deepEqual([upper.pose.x, upper.pose.y, upper.feetElevation], [lift.upper.x, lift.upper.y, 5]);
  advance(game, 5.2);
  const lower = game.scratchGalleryLiftSnapshot();
  assert.equal(lower.pose.phase, 'dwell-lower');
  assert.deepEqual([game.player.x, game.player.y, lower.feetElevation], [lift.lower.x, lift.lower.y, 0]);
});

test('a grounded player under an overhead deck is neither captured nor lifted', () => {
  const { game } = fixture(), runtime = game.scratchGalleryLift;
  const upperElapsed = runtime.track.timing.dwellLower + runtime.track.timing.travel + runtime.track.timing.rise;
  game.installScratchGalleryLift(runtime.track, { elapsed: upperElapsed, rider: false });
  Object.assign(game.player, { x: runtime.track.upper.x, y: runtime.track.upper.y });
  advance(game, .1);
  assert.equal(game.scratchGalleryLift.rider, false);
  assert.equal(game.playerLevel(), 0);
});

test('pause freezes accepted lift pose and snapshot reinstall resumes exactly without production save data', () => {
  const { game } = fixture(); advance(game, 2.35);
  const before = game.scratchGalleryLiftSnapshot();
  game.setPaused(true, game.lastUpdateNow); advance(game, 1);
  assert.deepEqual(game.scratchGalleryLiftSnapshot(), before);
  game.setPaused(false, game.lastUpdateNow + 1000); advance(game, .05);
  const accepted = game.scratchGalleryLiftSnapshot(); assert.ok(accepted.elapsed > before.elapsed);
  const reset = fixture(); reset.game.installScratchGalleryLift(reset.game.scratchGalleryLift.track, accepted);
  assert.deepEqual(reset.game.scratchGalleryLiftSnapshot().pose, accepted.pose);
  assert.equal(Object.hasOwn(reset.save.session.playerRuntime, 'galleryLift'), false);
});

test('upper disembark reaches the matching five-level dock and leaves the lift', () => {
  const { game, diagnostics } = fixture(), lift = diagnostics.verticalGallery.galleryLift;
  const upperElapsed = game.scratchGalleryLift.track.timing.dwellLower + game.scratchGalleryLift.track.timing.travel + game.scratchGalleryLift.track.timing.rise;
  game.installScratchGalleryLift(game.scratchGalleryLift.track, { elapsed: upperElapsed, rider: true });
  advance(game, .5, { state: { x: 1, y: 0 }, consume: () => false, held: () => false });
  advance(game, .05);
  assert.ok(game.player.x > lift.upper.x + .5);
  assert.equal(game.scratchGalleryLift.rider, false);
  assert.equal(game.playerLevel(), 5);
});

test('reset same reconstructs the lower station and ordinary stair route remains present', () => {
  const a = fixture(); advance(a.game, 3);
  const b = fixture(), q = b.diagnostics.verticalGallery;
  assert.equal(b.game.scratchGalleryLiftSnapshot().elapsed, 0);
  assert.equal(q.mainRoute, 'five broad north ramps');
  assert.ok(b.game.map.tiles.some(tile => tile.gallerySpace === 'stair' && tile.slope));
});

test('a low ceiling holds a rising rider and platform at their last accepted pose',()=>{
  const {game}=fixture(), track=game.scratchGalleryLift.track;
  const rise=track.timing.dwellLower+track.timing.travel;
  game.installScratchGalleryLift(track,{elapsed:rise,rider:true});
  game.map.tiles[track.upper.y*game.map.width+track.upper.x].doorway=true;
  assert.ok(game.interiorLiftCeiling()<3);
  const accepted=game.scratchGalleryLiftSnapshot();
  assert.equal(game.tickScratchGalleryLift(1),false);
  const held=game.scratchGalleryLiftSnapshot();
  assert.deepEqual(held,{...accepted,blocked:true});
  assert.equal(game.player.hp,60);
});
test('pure vertical descent refuses a grounded creature and preserves the accepted pose', () => {
  const { game } = fixture(), track = game.scratchGalleryLift.track;
  const descend = track.timing.dwellLower + track.timing.travel + track.timing.rise + track.timing.dwellUpper;
  game.installScratchGalleryLift(track, { elapsed: descend, rider: true });
  const foe = createCombatant('ashling', track.upper.x, track.upper.y, false, []); foe.id = 'lift-obstruction';
  game.enemies = [foe];
  game.tickScratchGalleryLift(1);
  const stopped = game.scratchGalleryLiftSnapshot();
  assert.equal(stopped.blocked, true); assert.equal(stopped.elapsed, descend);
  game.tickScratchGalleryLift(.5);
  assert.deepEqual(game.scratchGalleryLiftSnapshot(), stopped);
});
