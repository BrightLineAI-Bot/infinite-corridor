// The Gloomvast in Close View (src/close-view-beast-gloomvast.ts on the shared beast rig).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { GLOOMVAST_RIG, GLOOMVAST_SKELETON, gloomvastMesh, createGloomvastTrack, sampleGloomvast, gloomvastBone } from '../src/close-view-beast-gloomvast.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { MONSTER_PACK, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

function world(player = { x: 30, y: 20 }) {
  const open = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 44;
  const w = {
    player: { ...player, hp: 1e9, maxHp: 1e9 }, width: 64, height: 44, dt: 1 / 60, now: 0, enemies: [], fx: [], playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt() { return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {}, confuse() {}, curse() {}, say() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
const scaleOf = (e) => (e.scale || 1) * GLOOMVAST_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 30, y: 20 }, dead: false, ...extra });
function fight(only, seconds, each, setup = () => {}) {
  const w = world(), e = createCombatant('gloomvast', 24, 20, true, []), tr = createGloomvastTrack(); let now = 1000;
  Object.assign(e, { id: 'gloomvast-cv', aggro: true, hp: 1e6, maxHp: 1e6, damage: 40 }); e.packAttacks = only ? [only] : []; e.packBossAttacks = []; setup(e); w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(sampleGloomvast(tr, e, env(e, now, { target: w.player })), e, tr, now); }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
// a bone's place in the body's own frame (forward, right, up from the body's middle), in body units
function local(tr, name) {
  const b = gloomvastBone(tr, name), o = gloomvastBone(tr, 'root'), f = tr.frame, cf = Math.cos(f.yaw), sf = Math.sin(f.yaw), dx = (b[0] - o[0]) / f.scale, dy = (b[1] - o[1]) / f.scale;
  return [dx * cf + dy * sf, -dx * sf + dy * cf, (b[2] - o[2]) / f.scale];
}

test('the mesh: bounded per tier, valid, cached; registered', () => {
  assert.ok(GLOOMVAST_SKELETON.count <= BEAST_SLOT.maxBones);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = gloomvastMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3, `${tier} normal ${v}`);
    // everything translucent is on the dithered channels (3, 4); some of it is solid (the face, the talons)
    const ch = new Set(); for (let v = 0; v < m.vertexCount; v++) ch.add(m.skin[v * 4 + 1]);
    for (const c of [0, 1, 2, 3, 4]) assert.ok(ch.has(c), `${tier} channel ${c}`);
    assert.strictEqual(gloomvastMesh(tier), m);
  }
  assert.equal(CLOSE_VIEW_BEASTS.gloomvast.scale, 1.25);
  assert.ok(closeViewBeastEligible(createCombatant('gloomvast', 1, 1, true, [])));
});

test('veiled among its cold lights, or in its Dark at all, it keeps the billboard', () => {
  const e = createCombatant('gloomvast', 1, 1, true, []);
  assert.ok(!closeViewBeastEligible({ ...e, gloomVeil: true }));
  assert.ok(!closeViewBeastEligible({ ...e, gloomDark: { n: 0, left: 5, total: 9 } }));
  assert.ok(!closeViewBeastEligible(createCombatant('gloomShade', 1, 1, true, [])), 'its decoys are not on the rig');
  // it calls the Dark on its own clock: through the calling it is on the rig, from the moment it is veiled it is not
  let calling = 0, veiled = 0;
  fight(null, 4, (f, e) => { if (e.pack.attack === 'vastDark' && e.pack.phase === 'windup') { calling++; assert.ok(closeViewBeastEligible(e)); } if (e.gloomVeil) { veiled++; assert.ok(!closeViewBeastEligible(e)); } }, (e) => { e.hp = e.maxHp * .5; });
  assert.ok(calling > 30 && veiled > 10, `${calling} ${veiled}`);
});

test('deterministic', () => {
  const run = () => { const out = []; fight('vastRake', 3, (f) => out.push(Array.from(f.skin.subarray(0, GLOOMVAST_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('every move plays without a broken frame', () => {
  for (const id of MONSTER_PACK.gloomvast.attacks) {
    let frames = 0;
    fight(id, 8, (f, e) => { assert.ok(f && finite(f.skin), `${id}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3) && f.emitA.every((a) => a >= 0 && a <= 1)); if (e.pack.attack === id) frames++; });
    assert.ok(frames > 20, `${id}: ${frames}`);
  }
});

test('key poses on the clocks: the rake, the pull, the wail, the gloomfall, the lights, the plunge and the calling', () => {
  // the rake: talons drawn back and up in the windup, swept forward through the blow
  let back = Infinity, fwd = -Infinity, upW = -Infinity;
  fight('vastRake', 4, (f, e, tr) => { if (e.pack.attack !== 'vastRake') return; const h = local(tr, 'handR');
    if (e.pack.phase === 'windup') { back = Math.min(back, h[0]); upW = Math.max(upW, h[2]); } else fwd = Math.max(fwd, h[0]); });
  assert.ok(back < -.05 && fwd > .5 && upW > GLOOMVAST_RIG.hover + .1, `rake ${back} ${fwd} ${upW}`);
  // the pull: the maw gapes while it inhales, then snaps shut
  let gape = 0, shut = Infinity;
  fight('devourPull', 4, (f, e, tr) => { if (e.pack.attack !== 'devourPull') return; const g = local(tr, 'head')[2] - local(tr, 'jaw')[2];
    if (e.pack.phase === 'active') gape = Math.max(gape, g); if (e.pack.phase === 'recover') shut = Math.min(shut, g); });
  assert.ok(gape > shut + .08, `pull ${gape} ${shut}`);
  // the wail: head thrown back (the corona tips behind the body's middle)
  let crownBack = Infinity;
  fight('vastWail', 4, (f, e, tr) => { if (e.pack.attack === 'vastWail') crownBack = Math.min(crownBack, local(tr, 'corona')[0]); });
  assert.ok(crownBack < -.35, `wail ${crownBack}`);
  // the gloomfall: hands raised over its head, then brought down
  let high = -Infinity, low = Infinity;
  fight('vastGloomfall', 4, (f, e, tr) => { if (e.pack.attack !== 'vastGloomfall') return; const h = local(tr, 'handL')[2]; if (e.pack.phase === 'windup') high = Math.max(high, h); else low = Math.min(low, h); });
  assert.ok(high > GLOOMVAST_RIG.hover + .4 && low < GLOOMVAST_RIG.hover - .3, `gloomfall ${high} ${low}`);
  // the lights: the corona drawn down toward the mouth before they are loosed
  let crownLow = Infinity;
  fight('vastLights', 4, (f, e, tr) => { if (e.pack.attack === 'vastLights' && e.pack.phase === 'windup') crownLow = Math.min(crownLow, local(tr, 'corona')[2]); });
  assert.ok(crownLow < GLOOMVAST_RIG.hover + .45, `lights ${crownLow}`);
  // the plunge: half there along the lane, pitched forward, talons first, tendrils streaming behind
  let dive = 0;
  fight('vastPlunge', 5, (f, e, tr) => { if (e.pack.attack === 'vastPlunge' && e.pack.phase === 'active') { dive++; assert.ok(f.alpha <= GLOOMVAST_RIG.phasingAlpha + 1e-9); assert.ok(local(tr, 'handR')[0] > .5); assert.ok(local(tr, 'ten2_1')[0] < -.3); } });
  assert.ok(dive > 10, `plunge ${dive}`);
  // the calling of the Dark: hands drawn together before the heart, the corona drawn down into it
  let gapMin = Infinity, crownIn = Infinity;
  fight(null, 2.2, (f, e, tr) => { if (e.pack.attack !== 'vastDark' || e.pack.phase !== 'windup' || !f) return; gapMin = Math.min(gapMin, Math.abs(local(tr, 'handR')[1] - local(tr, 'handL')[1])); crownIn = Math.min(crownIn, local(tr, 'corona')[2]); }, (e) => { e.hp = e.maxHp * .5; });
  assert.ok(gapMin < .6 && crownIn < GLOOMVAST_RIG.hover + .2, `dark ${gapMin} ${crownIn}`);
});

test('a broken poise sags it; a blow makes it flinch', () => {
  const e = createCombatant('gloomvast', 10, 10, true, []), tr = createGloomvastTrack(); let now = 1000;
  const hands = () => (local(tr, 'handR')[2] + local(tr, 'handL')[2]) / 2;
  sampleGloomvast(tr, e, env(e, now)); const up = hands();
  e.poiseBreak = 1; for (let i = 0; i < 30; i++) sampleGloomvast(tr, e, env(e, now += 16)); assert.ok(hands() < up - .1, `dazed ${hands()} ${up}`);
  const before = Array.from(tr.pose.skin); e.hp -= 50; sampleGloomvast(tr, e, env(e, now += 16)); sampleGloomvast(tr, e, env(e, now += 16)); assert.notDeepEqual(Array.from(tr.pose.skin), before);
});

test('death; reduced motion', () => {
  const e = createCombatant('gloomvast', 10, 10, true, []), tr = createGloomvastTrack(); let now = 1000;
  let g = sampleGloomvast(tr, e, env(e, now)), n = 0; while (g && n < 1000) { g = sampleGloomvast(tr, e, env(e, now += 16, { dead: true })); n++; }
  assert.ok(n < 1000 && g == null, 'it comes apart and is gone');
  const r = createGloomvastTrack(), e2 = createCombatant('gloomvast', 10, 10, true, []); sampleGloomvast(r, e2, env(e2, 1000, { reduce: true }));
  const a = Array.from(sampleGloomvast(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleGloomvast(r, e2, env(e2, 4000, { reduce: true })).skin), a);
});
