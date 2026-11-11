// Release 890: the Briar Stag's skinned Close View body (src/close-view-beast-stag.ts on the shared beast rig): the four-legged
// rig's planted gait, every attack on the game's own clocks with its contact poses, bounded meshes, determinism and reuse.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT, boneLocalToWorld } from '../src/close-view-beast-rig.ts';
import { STAG_RIG, STAG_SKELETON, stagMesh, createStagTrack, sampleStag, stagBone } from '../src/close-view-beast-stag.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { MONSTER_PACK, STAG, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

const SCALE = 1.75 * STAG_RIG.closeViewScale;
function world(player = { x: 16, y: 12 }) {
  const open = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32;
  const w = {
    player: { ...player, hp: 1e9 }, dt: 1 / 60, now: 0, enemies: [], fx: [], playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt() { return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {}, ignite() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: SCALE, now, reduce: false, tier: 'full', target: { x: 16, y: 12 }, dead: false, ...extra });
function fight(only, seconds, each, player) {
  const w = world(player), e = createCombatant('briarStag', 13, 12, true, []), tr = createStagTrack(); let now = 1000;
  // (the mend only comes when it is hurt)
  Object.assign(e, { id: 'stag-cv', aggro: true, hp: only === 'stagMend' ? 4e5 : 1e6, maxHp: 1e6, damage: 40 }); e.packAttacks = [only]; e.packBossAttacks = []; w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(sampleStag(tr, e, env(e, now, { target: w.player })), e, tr, now); }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
const FEET = ['hoofHL', 'hoofFL', 'hoofHR', 'hoofFR'];

test('the mesh: bounded per tier, valid, cached', () => {
  assert.ok(STAG_SKELETON.count <= BEAST_SLOT.maxBones);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = stagMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) { assert.ok(m.skin[v * 4] < STAG_SKELETON.count); assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3); }
    assert.strictEqual(stagMesh(tier), m);
  }
  assert.equal(CLOSE_VIEW_BEASTS.briarStag.scale, 1.25);
  const e = createCombatant('briarStag', 10, 10, true, []); assert.ok(closeViewBeastEligible(e)); assert.equal(MONSTER_PACK.briarStag.form.scale, 1.75);
});

test('standing: four hooves on the ground, the crown above the head, buffers reused', () => {
  const e = createCombatant('briarStag', 10, 10, true, []), tr = createStagTrack(); let f0 = null;
  for (let i = 0; i < 60; i++) { const f = sampleStag(tr, e, env(e, 1000 + i * 16)); if (f0) { assert.strictEqual(f, f0); assert.strictEqual(f.skin, f0.skin); } f0 = f; }
  assert.ok(finite(f0.skin));
  for (const n of FEET) assert.ok(stagBone(tr, n)[2] < .12 * SCALE, `${n} on the ground`);
  assert.ok(stagBone(tr, 'head')[2] > .85 * SCALE, 'head carried high');
  const tip = boneLocalToWorld(tr.pose, 'antlerR', -.02, .37, .37);
  assert.ok(tip[2] > stagBone(tr, 'head')[2] + .2 * SCALE, 'the crown rises over it');
});

test('walking and galloping: planted hooves never slide', () => {
  for (const [speed, gallop] of [[1.4, false], [9, true]]) {
    const e = createCombatant('briarStag', 4, 10, true, []), tr = createStagTrack(); let now = 1000, checked = 0; const last = [null, null, null, null];
    if (gallop) { e.pack = { attack: 'stagCharge', phase: 'active', t: 5, seq: 1, data: { mode: 'run', aim: { x: 1, y: 0 } } }; }
    for (let i = 0; i < 200; i++) {
      e.x += speed / 60; now += 1000 / 60; sampleStag(tr, e, env(e, now));
      if (i < 40) continue;
      for (let k = 0; k < 4; k++) { const p = stagBone(tr, FEET[k]), planted = tr.frame.feet[k * 2] === 1;
        if (planted && last[k]) { assert.ok(Math.hypot(p[0] - last[k][0], p[1] - last[k][1]) < 2e-3, `${gallop ? 'gallop' : 'walk'}: ${FEET[k]} holds`); checked++; }
        last[k] = planted ? p : null; }
    }
    assert.ok(checked > 100, `${checked} planted frames`);
  }
});

test('deterministic', () => {
  const run = () => { const out = []; fight('stagGore', 3, (f) => out.push(Array.from(f.skin.subarray(0, STAG_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('antler hooks: the crown swings to alternate sides on each cut tick, and the last cut tosses it up', () => {
  const swings = []; let lastCut = 0;
  fight('stagGore', 5, (f, e, tr) => {
    const s = e.pack; if (s.attack !== 'stagGore' || s.phase !== 'active') return;
    if ((s.data.cut || 0) !== lastCut && swings.length < STAG.goreCuts) { lastCut = s.data.cut; // the first combo
      const head = stagBone(tr, 'head'), root = [e.x + .5, e.y + .82], aim = s.data.aim, side = (head[0] - root[0]) * -aim.y + (head[1] - root[1]) * aim.x;
      swings.push({ cut: lastCut, side, z: head[2] }); }
  });
  assert.equal(swings.length, STAG.goreCuts);
  assert.ok(Math.sign(swings[0].side) !== Math.sign(swings[1].side), `alternate sides ${swings.map((q) => q.side.toFixed(2))}`);
  assert.ok(swings[2].z > swings[1].z, 'the toss lifts the crown');
});

test('rearing stomp: forehooves high in the wind-up, down on each stamp', () => {
  let high = 0, atStamp = [], prevStamps = 0, prevPhase = '';
  fight('stagStomp', 5, (f, e, tr) => {
    const s = e.pack; if (s.attack !== 'stagStomp') { prevPhase = ''; return; }
    const fz = Math.min(stagBone(tr, 'hoofFL')[2], stagBone(tr, 'hoofFR')[2]);
    if (s.phase === 'windup') high = Math.max(high, fz);
    if (s.phase === 'active' && prevPhase === 'windup') atStamp.push(fz);
    if ((s.data.stamps || 0) > prevStamps && s.phase === 'active' && prevPhase === 'active') atStamp.push(fz);
    prevStamps = s.data.stamps || 0; prevPhase = s.phase;
  });
  assert.ok(high > .35 * SCALE, `reared (${high.toFixed(2)})`);
  assert.ok(atStamp.length >= 2 && atStamp.every((z) => z < .2 * SCALE), `stamps land ${atStamp.map((z) => z.toFixed(2))}`);
});

test('every attack plays on its own clocks without a broken frame', () => {
  for (const id of MONSTER_PACK.briarStag.attacks) {
    const phases = new Set(); let frames = 0;
    fight(id, id === 'stagCharge' || id === 'stagMend' || id === 'stagLeap' ? 9 : 6, (f, e) => {
      assert.ok(f && finite(f.skin), `${id}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3));
      if (e.pack.attack === id) { phases.add(e.pack.phase); frames++; }
    }, { x: 18, y: 12 });
    assert.ok(phases.has('windup') && phases.has('recover'), `${id}: ${[...phases]}`); assert.ok(frames > 10, id);
  }
});

test('the leap: legs tucked high in the air, the landing absorbed', () => {
  let topHoof = 0, pelvisAtLand = null, rest = null;
  fight('stagLeap', 6, (f, e, tr) => {
    const s = e.pack, pel = stagBone(tr, 'pelvis')[2];
    if (!s.attack) rest ??= pel;
    if (s.attack === 'stagLeap' && s.data.stage === 'hang') topHoof = Math.max(topHoof, stagBone(tr, 'hoofFL')[2]);
    if (s.attack === 'stagLeap' && s.phase === 'recover') pelvisAtLand = Math.min(pelvisAtLand ?? Infinity, pel);
  }, { x: 20, y: 12 });
  assert.ok(topHoof > 2, 'aloft'); assert.ok(rest != null && pelvisAtLand < rest - .03 * SCALE, 'it sinks into the landing');
});

test('the Wild Hunt lights the crown; death fells it; reduced motion is still', () => {
  const e = createCombatant('briarStag', 10, 10, true, []), tr = createStagTrack(); let now = 1000;
  sampleStag(tr, e, env(e, now += 16)); assert.equal(tr.pose.wr[STAG_SKELETON.index.fire * 9], 0, 'no fire');
  e.stagHunt = 5; const f = sampleStag(tr, e, env(e, now += 16)); assert.ok(tr.pose.wr[STAG_SKELETON.index.fire * 9] !== 0 && f.emitA[2] === 1, 'fire on the crown');
  e.stagHunt = 0; let lowest = Infinity, g = f;
  while (g) { g = sampleStag(tr, e, env(e, now += 16, { dead: true })); if (g) lowest = Math.min(lowest, stagBone(tr, 'chest')[2]); }
  assert.ok(lowest < .4 * SCALE, 'down on the ground');
  const r = createStagTrack(); sampleStag(r, e, env(e, 1000, { reduce: true })); const a = Array.from(sampleStag(r, e, env(e, 1016, { reduce: true })).skin);
  assert.deepEqual(Array.from(sampleStag(r, e, env(e, 5000, { reduce: true })).skin), a);
});

test('at play with the Stalker it bounds round', () => {
  const e = createCombatant('briarStag', 10, 10, true, []), tr = createStagTrack(); let now = 1000; e.playing = true;
  for (let i = 0; i < 120; i++) { const a = i / 60 * 1.7; e.x = 10 + Math.cos(a) * 2.2; e.y = 10 + Math.sin(a) * 1.5; e.hopLift = Math.abs(Math.sin(a * 2)) * .6; sampleStag(tr, e, env(e, now += 16)); }
  assert.ok(tr.gallop > .8 && finite(tr.frame.skin));
});

test('turning on the spot: hooves are stepped round, a diagonal pair at a time, never slid', () => {
  const e = createCombatant('briarStag', 10, 10, true, []), tr = createStagTrack(); let now = 1000, steps = 0, worst = 0;
  const target = (deg) => ({ x: e.x + Math.cos(deg * Math.PI / 180) * 6, y: e.y + Math.sin(deg * Math.PI / 180) * 6 });
  for (let i = 0; i < 30; i++) sampleStag(tr, e, env(e, now += 16, { target: target(0) }));
  const last = FEET.map((n) => stagBone(tr, n));
  for (let i = 0; i < 200; i++) {
    sampleStag(tr, e, env(e, now += 16, { target: target(140) }));
    for (let k = 0; k < 4; k++) { const p = stagBone(tr, FEET[k]), moved = Math.hypot(p[0] - last[k][0], p[1] - last[k][1]);
      if (tr.frame.feet[k * 2] === 1) assert.ok(moved < 2e-3, `${FEET[k]} holds while planted`); else if (moved > 1e-3) steps++; last[k] = p;
      worst = Math.max(worst, Math.hypot(p[0] - stagBone(tr, FEET[k].startsWith('hoofH') ? 'pelvis' : 'chest')[0], p[1] - stagBone(tr, FEET[k].startsWith('hoofH') ? 'pelvis' : 'chest')[1])); }
  }
  assert.ok(steps > 20, 'stepped'); assert.ok(worst < .45 * SCALE, `hooves stay under the body (${(worst / SCALE).toFixed(2)} u)`);
});
