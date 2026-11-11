// The Ashen Moth (and the Grove Moth) in Close View (src/close-view-beast-moth.ts on the shared beast rig).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { MOTH_RIG, MOTH_SKELETON, mothMesh, createMothTrack, sampleMoth, mothBone } from '../src/close-view-beast-moth.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { MONSTER_PACK, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

function world(player = { x: 30, y: 20 }) {
  const open = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 44;
  const w = {
    player: { ...player, hp: 1e9, maxHp: 1e9 }, dt: 1 / 60, now: 0, enemies: [], fx: [], playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt() { return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
const scaleOf = (e) => (e.scale || 1) * MOTH_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 30, y: 20 }, dead: false, ...extra });
function fight(only, seconds, each) {
  const w = world(), e = createCombatant('ashenMoth', 24, 20, true, []), tr = createMothTrack(); let now = 1000;
  Object.assign(e, { id: 'moth-cv', aggro: true, hp: 5e5, maxHp: 1e6, damage: 40 }); e.packAttacks = [only]; e.packBossAttacks = []; w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(sampleMoth(tr, e, env(e, now, { target: w.player })), e, tr, now); }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
const span = (tr) => { const l = mothBone(tr, 'foreOutL'), r = mothBone(tr, 'foreOutR'); return Math.hypot(l[0] - r[0], l[1] - r[1]); };

test('the mesh: bounded per tier, valid, cached; the moth and its far kin registered', () => {
  assert.ok(MOTH_SKELETON.count <= BEAST_SLOT.maxBones);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = mothMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3);
    assert.strictEqual(mothMesh(tier), m);
  }
  for (const kind of ['ashenMoth', 'groveMoth']) { assert.equal(CLOSE_VIEW_BEASTS[kind].scale, 1.25); assert.ok(closeViewBeastEligible(createCombatant(kind, 1, 1, true, []))); }
});

test('it hovers and beats its wings; folded, the wings close over its back', () => {
  const e = createCombatant('ashenMoth', 10, 10, true, []), tr = createMothTrack(), S = scaleOf(e); let now = 1000, lo = Infinity, hi = 0, open = 0;
  for (let i = 0; i < 120; i++) { now += 1000 / 60; sampleMoth(tr, e, env(e, now)); const b = mothBone(tr, 'body')[2], w = mothBone(tr, 'foreOutR')[2]; lo = Math.min(lo, w - b); hi = Math.max(hi, w - b); open = Math.max(open, span(tr)); }
  assert.ok(mothBone(tr, 'body')[2] > .5 * S, 'off the ground');
  assert.ok(hi - lo > .2 * S, `the wings beat (${((hi - lo) / S).toFixed(2)})`);
  e.mothPose = 'fold'; for (let i = 0; i < 60; i++) { now += 1000 / 60; sampleMoth(tr, e, env(e, now)); }
  assert.ok(span(tr) < open * .6, `folded (${(span(tr) / S).toFixed(2)} of ${(open / S).toFixed(2)})`);
});

test('deterministic', () => {
  const run = () => { const out = []; fight('mothDive', 3, (f) => out.push(Array.from(f.skin.subarray(0, MOTH_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('every attack plays without a broken frame', () => {
  for (const id of [...MONSTER_PACK.ashenMoth.attacks, ...MONSTER_PACK.ashenMoth.bossAttacks]) {
    let frames = 0;
    fight(id, 7, (f, e) => { assert.ok(f && finite(f.skin), `${id}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3)); if (e.pack.attack === id) frames++; });
    assert.ok(frames > 5, id);
  }
});

test('the cocoon hides it and the kindling lights it', () => {
  let hidden = false, shown = false;
  fight('mothCocoon', 6, (f, e, tr) => { if (e.mothCocoon && tr.cocoon > .95) { hidden = true; assert.ok(f.cloud && f.emitA[2] > 0); assert.ok(tr.pose.scl[MOTH_SKELETON.index.body] < .06); } if (!e.mothCocoon && tr.cocoon < .05) shown = true; });
  assert.ok(hidden && shown);
  let lit = false; fight('mothKindle', 6, (f, e) => { if (e.mothKindled > 0) { lit = true; assert.ok(f.emitA[3] > 0 && f.cloud); } }); assert.ok(lit, 'kindled');
});

test('death; reduced motion', () => {
  const e = createCombatant('ashenMoth', 10, 10, true, []), tr = createMothTrack(); let now = 1000;
  let g = sampleMoth(tr, e, env(e, now)), n = 0; while (g && n < 1000) { g = sampleMoth(tr, e, env(e, now += 16, { dead: true })); n++; }
  assert.ok(n < 1000 && g == null, 'it falls and is gone');
  const r = createMothTrack(), e2 = createCombatant('ashenMoth', 10, 10, true, []); sampleMoth(r, e2, env(e2, 1000, { reduce: true }));
  const a = Array.from(sampleMoth(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleMoth(r, e2, env(e2, 4000, { reduce: true })).skin), a);
});
