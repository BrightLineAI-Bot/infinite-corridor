// Release 892: the Questing Beast's skinned Close View body (src/close-view-beast-questing.ts on the shared beast rig).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { QB_RIG, QB_SKELETON, qbMesh, createQbTrack, sampleQb, qbBone } from '../src/close-view-beast-questing.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { MONSTER_PACK, QB_MOVES, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

function world(player = { x: 18, y: 12 }) {
  const open = (x, y) => x >= 0 && y >= 0 && x < 40 && y < 32;
  const w = {
    player: { ...player, hp: 1e9 }, dt: 1 / 60, now: 0, enemies: [], fx: [], playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt() { return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
const scaleOf = (e) => (e.scale || 1) * QB_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 18, y: 12 }, dead: false, ...extra });
function fight(only, seconds, each, player) {
  const w = world(player), e = createCombatant('questingBeast', 13, 12, true, []), tr = createQbTrack(); let now = 1000;
  Object.assign(e, { id: 'qb-cv', aggro: true, hp: 1e6, maxHp: 1e6, damage: 40 }); e.packAttacks = [only]; e.packBossAttacks = []; w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(sampleQb(tr, e, env(e, now, { target: w.player })), e, tr, now); }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
const PAWS = ['pawHL', 'pawFL', 'pawHR', 'pawFR'];

test('the mesh: bounded per tier, valid, cached; registered', () => {
  assert.ok(QB_SKELETON.count <= BEAST_SLOT.maxBones);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = qbMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) { assert.ok(m.skin[v * 4] < QB_SKELETON.count && m.skin[v * 4 + 2] < QB_SKELETON.count); assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3); }
    assert.strictEqual(qbMesh(tier), m);
  }
  assert.equal(CLOSE_VIEW_BEASTS.questingBeast.scale, 1.25);
  assert.ok(closeViewBeastEligible(createCombatant('questingBeast', 1, 1, true, [])));
});

test('walking and galloping on planted paws', () => {
  for (const [speed, label] of [[1.6, 'walk'], [9, 'gallop']]) {
    const e = createCombatant('questingBeast', 4, 10, true, []), tr = createQbTrack(); let now = 1000, checked = 0; const last = [null, null, null, null];
    for (let i = 0; i < 200; i++) {
      e.x += speed / 60; now += 1000 / 60; sampleQb(tr, e, env(e, now));
      if (i < 40) continue;
      for (let k = 0; k < 4; k++) { const p = qbBone(tr, PAWS[k]), planted = tr.frame.feet[k * 2] === 1;
        if (planted && last[k]) { assert.ok(Math.hypot(p[0] - last[k][0], p[1] - last[k][1]) < 2e-3, `${label}: ${PAWS[k]} holds`); checked++; }
        last[k] = planted ? p : null; }
    }
    assert.ok(checked > 80, `${label}: ${checked}`);
    if (label === 'gallop') assert.ok(tr.gallop > .8, 'it gallops at speed');
  }
});

test('deterministic', () => {
  const run = () => { const out = []; fight('qbFlurry', 3, (f) => out.push(Array.from(f.skin.subarray(0, QB_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('every attack plays on its own clocks without a broken frame', () => {
  for (const id of [...MONSTER_PACK.questingBeast.attacks, ...MONSTER_PACK.questingBeast.bossAttacks]) {
    const phases = new Set(); let frames = 0;
    fight(id, 6, (f, e) => {
      assert.ok(f && finite(f.skin), `${id}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3));
      if (e.pack.attack === id) { phases.add(e.pack.phase); frames++; }
    }, { x: id === 'qbPounce' || id === 'qbBarrage' || id === 'leapSlam' ? 18 : 15, y: 12 });
    assert.ok(phases.has('windup') && phases.has('recover'), `${id}: ${[...phases]}`); assert.ok(frames > 5, id);
  }
});

test('claw flurry: the raking forepaw alternates on each strike tick', () => {
  const lifted = []; let lastStrikes = -1;
  fight('qbFlurry', 4, (f, e, tr) => {
    const s = e.pack; if (s.attack !== 'qbFlurry' || s.phase !== 'strike') return;
    if ((s.data.strikes || 0) !== lastStrikes && s.data.strikes > 0 && lifted.length < QB_MOVES.flurryStrikes) { lastStrikes = s.data.strikes;
      const r = qbBone(tr, 'pawFR'), l = qbBone(tr, 'pawFL'), cf = Math.cos(tr.yaw), sf = Math.sin(tr.yaw); lifted.push((r[0] - l[0]) * cf + (r[1] - l[1]) * sf); } // which paw is raked out ahead
  });
  assert.ok(lifted.length >= 3, `${lifted.length} strikes`);
  assert.ok(lifted.some((v) => v > .02) && lifted.some((v) => v < -.02), `both paws strike ${lifted.map((v) => v.toFixed(2))}`);
});

test('pounce: it springs high with the wings thrown wide, then lands and absorbs it', () => {
  let maxH = 0, wingOut = 0, rest = null, landLow = Infinity;
  fight('qbPounce', 5, (f, e, tr) => {
    const s = e.pack, pel = qbBone(tr, 'pelvis')[2];
    if (!s.attack) rest ??= pel;
    if (s.attack === 'qbPounce' && (s.phase === 'rise' || s.phase === 'dive')) { maxH = Math.max(maxH, pel); const c = qbBone(tr, 'chest'), w = qbBone(tr, 'wingTipR'); wingOut = Math.max(wingOut, Math.hypot(w[0] - c[0], w[1] - c[1])); }
    if (s.attack === 'qbPounce' && s.phase === 'recover') landLow = Math.min(landLow, pel);
  });
  assert.ok(rest != null && maxH > rest + 1, 'airborne');
  assert.ok(wingOut > .5 * scaleOf(createCombatant('questingBeast', 0, 0, true, [])), `wings open (${wingOut.toFixed(2)})`);
  assert.ok(landLow < rest, 'it sinks into the landing');
});

test('enraged ember cracks, death, reduced motion', () => {
  const e = createCombatant('questingBeast', 10, 10, true, []), tr = createQbTrack(); let now = 1000; e.maxHp = 100; e.hp = 100;
  assert.equal(sampleQb(tr, e, env(e, now += 16)).emitA[3], 0);
  e.hp = 40; assert.equal(sampleQb(tr, e, env(e, now += 16)).emitA[3], 1, 'cracks glow when enraged');
  let g = tr.frame, lowest = Infinity; while (g) { g = sampleQb(tr, e, env(e, now += 16, { dead: true })); if (g) lowest = Math.min(lowest, qbBone(tr, 'chest')[2]); }
  assert.ok(lowest < .55 * scaleOf(e), 'down');
  const r = createQbTrack(), e2 = createCombatant('questingBeast', 10, 10, true, []); sampleQb(r, e2, env(e2, 1000, { reduce: true }));
  const a = Array.from(sampleQb(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleQb(r, e2, env(e2, 4000, { reduce: true })).skin), a);
});

test('wings: folded close along the back, spread wide to fly, the membrane joined to the body', () => {
  const e = createCombatant('questingBeast', 10, 10, true, []), tr = createQbTrack(), S = scaleOf(e); let now = 1000;
  let f = null; for (let i = 0; i < 30; i++) f = sampleQb(tr, e, env(e, now += 16, { reduce: true }));
  const span = () => { const c = qbBone(tr, 'chest'), cf = Math.cos(tr.yaw), sf = Math.sin(tr.yaw); let w = 0;
    for (const b of ['wingTipL', 'wingTipR', 'wingF1L', 'wingF1R', 'wingF2L', 'wingF2R']) { const p = qbBone(tr, b); w = Math.max(w, Math.abs(-(p[0] - c[0]) * sf + (p[1] - c[1]) * cf)); } return w; };
  const folded = span(); assert.ok(folded < .45 * S, `folded wrists stay over the back (${(folded / S).toFixed(2)})`);
  let open = 0; fight('qbPounce', 5, (g, e2, t2) => { if (e2.pack.attack === 'qbPounce' && e2.pack.phase === 'rise') { const c = qbBone(t2, 'chest'); for (const b of ['wingTipL', 'wingTipR']) { const p = qbBone(t2, b); open = Math.max(open, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])); } } });
  assert.ok(open > .9 * S, `spread for the leap (${(open / S).toFixed(2)})`);
  // the broad membrane is skinned to the body along its inner edge, so it can never come away from the flank
  const m = qbMesh('full'), body = new Set(['chest', 'spine', 'pelvis'].map((n) => QB_SKELETON.index[n])), wing = new Set(['wingL', 'wingR'].map((n) => QB_SKELETON.index[n]));
  let joined = 0; for (let v = 0; v < m.vertexCount; v++) { const a = m.skin[v * 4], b = m.skin[v * 4 + 2], w = m.skin[v * 4 + 3]; if (wing.has(a) && body.has(b) && w > .5) joined++; }
  assert.ok(joined >= 8, `membrane vertices on the body: ${joined}`);
});
