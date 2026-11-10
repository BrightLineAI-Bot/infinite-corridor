import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { acceptCleaverChoreography, cleaverCarryFrame, sampleCleaverChoreography } from '../src/action-motion.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { writeCloseViewModel, modelTriangleCount } from '../src/close-view-models.ts';

const record = (step, at, prior = null) => ({ weaponKind: 'verge-cleaver', primaryMotion: { v: 2, step },
  meleeAction: { v: 1, kind: 'verge-cleaver', move: 'cleaver', contactMs: 75, durationMs: 360 },
  cleaverChoreography: { ...acceptCleaverChoreography(prior, at), contactLogicalMs: at + 75 } });
const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8'));
const bytes = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(meta, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));

test('four clips counter-load before fast contact, retain exact entry and settle to carry', () => {
  let prior = null;
  for (let step = 1; step <= 4; step++) {
    const at = 1000 + step * 420, r = record(step, at, prior), sample = ms => sampleCleaverChoreography(r, at + ms);
    const entry = sample(0), load = sample(30), contact = sample(75), finish = sample(180);
    assert.deepEqual(entry, r.cleaverChoreography.entry);
    const direction = Math.sign(finish.side - entry.side);
    assert.ok((load.side - entry.side) * direction < -.03, 'sword loads against the cut');
    assert.ok((contact.side - load.side) * direction > .3, 'quick travel reaches the hit');
    assert.ok((sample(75).side - sample(60).side) * direction > Math.abs(sample(15).side - entry.side) * 4,
      'impact travel is faster than early anticipation');
    assert.deepEqual(sample(1000), cleaverCarryFrame());
    assert.deepEqual(sample(75), sampleCleaverChoreography({ ...r, cleaverChoreography: {
      ...r.cleaverChoreography, contactLogicalMs: at + 400 } }, at + 400), 'late contact owns the same pose');
    for (const ms of [1, 30, 60, 75, 100, 180, 360, 600]) {
      const follow = record(step % 4 + 1, at + ms, r);
      assert.deepEqual(sampleCleaverChoreography(follow, at + ms), sample(ms), 'acceptance never snaps to a canned start');
    }
    prior = r;
  }
});

test('offline 30/60 Hz clip samples preserve approved rig, sockets and native geometry budgets', () => {
  const source = asset.arrays.positions.slice(), state = createHeroPoseState(asset), frame = createHeroFrame(asset);
  const buffer = new Float32Array(7680);
  for (const hz of [30, 60]) for (const reducedMotion of [false, true]) {
    let prior = null;
    for (let step = 1; step <= 4; step++) {
      const at = 1000 + step * 420, r = record(step, at, prior);
      for (let n = 0; n <= Math.ceil(hz * .42); n++) {
        const now = at + Math.min(420, n * 1000 / hz), cf = sampleCleaverChoreography(r, now);
        assert.ok(Object.values(cf).every(v => Number.isFinite(v) && Math.abs(v) <= 2));
        assert.ok(sampleCloseViewHero(asset, state, { nowMs: now, x: 0, y: 0, groundZ: 0, liftZ: 0,
          yaw: 0, height: 1.3776, speed: 1.2, gaitPhase: .7, heldProfile: 'verge-cleaver',
          handProfile: 'verge-cleaver', reducedMotion, cleaverFrame: cf }, frame));
        assert.ok(state.primaryGripResidual < .05, 'right hand remains on the gladius grip');
        assert.ok(frame.positionsNormals.every(Number.isFinite));
        const end = writeCloseViewModel(buffer, 0, { kind: 'playerVergeCleaver', x: 0, y: 0, z: 0,
          yaw: 0, phase: .7, pace: 1.2, pose: 'attack', amount: 0, reduceMotion: reducedMotion, cleaverFrame: cf });
        assert.equal(end / 30, modelTriangleCount('playerVergeCleaver'));
        assert.ok(buffer.subarray(0, end).every(Number.isFinite));
      }
      prior = r;
    }
  }
  assert.deepEqual(asset.arrays.positions, source);
});
