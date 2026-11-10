import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceGalleryLiftClock, createGalleryLiftTrack, galleryLiftContains, galleryLiftPose } from '../src/gallery-lift-track.ts';

const track = createGalleryLiftTrack({
  lower: { x: 18.5, y: 18.5, elevation: 0 },
  upper: { x: 23.5, y: 10.5, elevation: 5 },
  timing: { dwellLower: 1, travel: 4, rise: 2, dwellUpper: 1 },
});

test('gallery lift has explicit stations and deterministic exact phase endpoints', () => {
  assert.deepEqual(galleryLiftPose(track, 0), { phase: 'dwell-lower', phaseProgress: 0, x: 18.5, y: 18.5, elevation: 0 });
  assert.deepEqual(galleryLiftPose(track, 1), { phase: 'travel-out', phaseProgress: 0, x: 18.5, y: 18.5, elevation: 0 });
  assert.deepEqual(galleryLiftPose(track, 5), { phase: 'rise', phaseProgress: 0, x: 23.5, y: 10.5, elevation: 0 });
  assert.deepEqual(galleryLiftPose(track, 7), { phase: 'dwell-upper', phaseProgress: 0, x: 23.5, y: 10.5, elevation: 5 });
  assert.deepEqual(galleryLiftPose(track, 8), { phase: 'descend', phaseProgress: 0, x: 23.5, y: 10.5, elevation: 5 });
  assert.deepEqual(galleryLiftPose(track, 10), { phase: 'travel-back', phaseProgress: 0, x: 23.5, y: 10.5, elevation: 0 });
  assert.deepEqual(galleryLiftPose(track, 14), galleryLiftPose(track, 0));
});

test('return motion is the exact reverse of outbound motion and remains bounded for huge clocks', () => {
  for (const p of [0, .125, .5, .875, 1]) {
    const out = galleryLiftPose(track, 1 + p * 4), back = galleryLiftPose(track, 10 + (1 - p) * 4);
    assert.deepEqual([back.x, back.y, back.elevation], [out.x, out.y, out.elevation]);
    const rise = galleryLiftPose(track, 5 + p * 2), descend = galleryLiftPose(track, 8 + (1 - p) * 2);
    assert.deepEqual([descend.x, descend.y, descend.elevation], [rise.x, rise.y, rise.elevation]);
  }
  assert.deepEqual(galleryLiftPose(track, 14 * 1_000_000_000 + 7), galleryLiftPose(track, 7));
});

test('blocked and paused frames do not advance caller-owned accepted elapsed time', () => {
  const clock = Object.freeze({ elapsed: 4.75 });
  assert.equal(advanceGalleryLiftClock(clock, .25, { blocked: true }), clock);
  assert.equal(advanceGalleryLiftClock(clock, .25, { paused: true }), clock);
  assert.deepEqual(advanceGalleryLiftClock(clock, .25), { elapsed: 5 });
});

test('boarding requires deck containment and matching foot height', () => {
  const low = galleryLiftPose(track, 0), overhead = galleryLiftPose(track, 7);
  assert.equal(galleryLiftContains(track, low, { x: 18.5, y: 18.5, footElevation: 0 }), true);
  assert.equal(galleryLiftContains(track, low, { x: 19, y: 18.5, footElevation: 0 }), false);
  assert.equal(galleryLiftContains(track, overhead, { x: 23.5, y: 10.5, footElevation: 0 }), false, 'a grounded player beneath the deck is not captured');
  assert.equal(galleryLiftContains(track, overhead, { x: 23.5, y: 10.5, footElevation: 5 }), true);
});

test('invalid or unbounded track inputs are rejected', () => {
  assert.throws(() => createGalleryLiftTrack({ lower: { x: 0, y: 0, elevation: 1 }, upper: { x: 1, y: 1, elevation: 1 } }), RangeError);
  assert.throws(() => createGalleryLiftTrack({ lower: { x: 0, y: 0, elevation: 0 }, upper: { x: 1, y: 1, elevation: 2 }, timing: { travel: 0 } }), RangeError);
  assert.throws(() => galleryLiftPose(track, Number.POSITIVE_INFINITY), RangeError);
  assert.throws(() => advanceGalleryLiftClock({ elapsed: 0 }, -.01), RangeError);
});
