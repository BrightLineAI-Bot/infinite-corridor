// The Psychic Crystal in Close View: the standard view's crystal (monster-render.ts psychicCrystal: a long faceted crystal
// floating at head height, flat-shaded in lit, mid and shadow faces, two lesser crystals grown from its foot, four shards
// circling it, a cold core, an aura that is a hazy white at rest, red and larger when it attacks, violet and drawn tight just
// before it takes hold of you) as one skinned body on the shared beast rig. It turns slowly; it leans into a push and back from
// a pull, and its shards wheel faster as it works; broken (`e.crystalFall`), it sinks to the floor and tips over, its lesser
// crystals and shards clattering down round it. Nothing here changes timing, damage, reach or targeting.
import { defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, writeSkin, meshBuilder, clamp01, smooth, span, kick } from "./close-view-beast-rig.js?v=r951-4925ab3898c1";

export const CRYSTAL_RIG = Object.freeze({
  closeViewScale: 1.25, // the beasts share the Giant's Close View size (Tim, 2026-11-11)
  hover: .8, bob: .05, H: .55, W: .17, spin: .8, shardOrbit: .3, shardRate: 1.2, // the standard view's sizes and rates (in tiles)
  turnRate: 2, blendMs: 160, deathMs: 1600, hitMs: 300,
});
const R = CRYSTAL_RIG, SHARDS = 4;
export const CRYSTAL_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'float', parent: 'root', at: [0, 0, R.hover] },
  { name: 'body', parent: 'float', at: [0, 0, 0] },
  { name: 'lesserL', parent: 'float', at: [0, -R.W * 1.2, -R.H * .35] }, { name: 'lesserR', parent: 'float', at: [0, R.W * 1.2, -R.H * .35] },
  ...Array.from({ length: SHARDS }, (_, i) => ({ name: 'shard' + i, parent: 'float', at: [R.shardOrbit, 0, 0] })),
  { name: 'auraR', parent: 'float', at: [0, 0, 0] }, { name: 'auraV', parent: 'float', at: [0, 0, 0] }, { name: 'auraW', parent: 'float', at: [0, 0, 0] },
]);
const BI = CRYSTAL_SKELETON.index;
// the aura's three shells share channel 4 (two-sided, kept out of the silhouette, dithered); the one shown is the one at full size
const E_CORE = 1, E_AURA = 4;
const C = Object.freeze({ lit: 0xdfe6ff, mid: 0x7d88b8, shade: 0x4a5288, lesserLit: 0xcdd6f6, lesserMid: 0x8a95c4, lesserShade: 0x6d78a8, edge: 0x20244a,
  core: 0xe8eeff, red: 0xff3c3c, violet: 0xaa5aff, white: 0xebf0ff });

// a faceted crystal: six sides, a long upper point and a shorter lower one, flat-shaded lit, mid and shadow faces round it
function crystal(B, bone, H, W, up, down, tones, twist = 0, core = 0) {
  const n = 6, top = [0, 0, H * up], bot = [0, 0, -H * down], ring = (z, r, k) => { const a = (k / n) * Math.PI * 2 + twist; return [Math.cos(a) * r, Math.sin(a) * r, z]; };
  const hi = H * .25 * up, lo = -H * .35 * down;
  B.bone(bone);
  const face = (pts, k) => { // outward: the normal points away from the axis
    const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]);
    const a = pts[0], b = pts[1], d = pts[2], nx = (b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]), ny = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]), nz = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
    B.color(tones[k % 3], tones[0] === core && core ? E_CORE : 0).poly(pts, nx * c[0] + ny * c[1] + nz * c[2] < 0);
  };
  for (let k = 0; k < n; k++) { const a0 = ring(hi, W, k), a1 = ring(hi, W, k + 1), b0 = ring(lo, W * .9, k), b1 = ring(lo, W * .9, k + 1);
    face([top, a0, a1], k); face([b0, bot, b1], k);
    if (!core) { face([a0, b0, b1, a1], k); continue; }
    // the core's belt: the middle of each side glows (channel 1), the faces above and below it keep their tone
    const L = (p, q, f) => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f], m0 = L(a0, b0, .38), m1 = L(a1, b1, .38), n0 = L(a0, b0, .62), n1 = L(a1, b1, .62);
    face([a0, m0, m1, a1], k); face([n0, b0, b1, n1], k); const t0 = tones; tones = [core, core, core]; B.color(core, E_CORE); face([m0, n0, n1, m1], 0); tones = t0; }
}
function buildCrystalMesh(tier) {
  const low = tier === 'low', full = tier === 'full', B = meshBuilder(CRYSTAL_SKELETON, full ? 1 : low ? .4 : .7);
  crystal(B, 'body', R.H, R.W, 1, 1, [C.lit, C.mid, C.shade], 0, C.core);
  for (const [b, s] of [['lesserL', -1], ['lesserR', 1]]) crystal(B, b, R.H * .5, R.W * .45, 1, .5, s < 0 ? [C.lesserLit, C.lesserMid, C.lesserShade] : [C.lesserMid, C.shade, C.lesserShade], .3);
  for (let i = 0; i < SHARDS; i++) crystal(B, 'shard' + i, .07, .025, 1, 1, [C.lit, C.lesserShade, C.mid], i * .4);
  // the aura (shown dithered, its colour by what it means): red when it attacks, violet as it takes hold, a hazy white at rest
  B.mark();
  for (const [col, bone] of [[C.red, 'auraR'], [C.violet, 'auraV'], [C.white, 'auraW']]) B.bone(bone).color(col, E_AURA).ellipsoid({ at: [0, 0, 0], radius: [.5, .5, .6], rings: low ? 5 : 8, seg: low ? 8 : 14 });
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function crystalMesh(tier = 'full') { return MESHES[tier] ||= buildCrystalMesh(tier); }

export function createCrystalTrack() {
  return {
    pose: createPose(CRYSTAL_SKELETON), yaw: NaN, at: NaN, spin: 0, orbit: 0, lean: 0, aura: [0, 0, 1], auraR: .52, hp: NaN, hitAt: -Infinity, deathAt: null, x: 0, y: 0, z: 0, keyWas: '', pulseAt: -Infinity,
    frame: { kind: 'psychicCrystal', tier: 'full', mesh: null, skin: null, boneCount: CRYSTAL_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}
export function sampleCrystal(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), P = tr.pose;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / R.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000, s0 = e.pack, att = dead ? null : s0?.attack, ph = s0?.phase;
  const fall = dead ? smooth(Math.min(1, death * 1.6)) : clamp01(Number(e.crystalFall) || 0), ease = fall * fall * (3 - 2 * fall);
  const grab = att === 'psyGrab', hostile = !!att && !grab && att !== 'psyWall', windup = ph === 'windup';
  // facing: toward the Wayfarer (it has no front; the lean and the shards' wheel read off it)
  let want = tr.yaw; if (env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .2) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = 0; if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  tr.yaw += Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)) * Math.min(1, dt * R.turnRate); const yaw = tr.yaw;
  // a pulse as each attack lets go (its windup ends)
  const key = att ? `${att}:${s0.seq}:${ph}` : ''; if (key !== tr.keyWas) { if (tr.keyWas.endsWith(':windup') && att) tr.pulseAt = now; tr.keyWas = key; }
  const pT = (now - tr.pulseAt) / 1000, pulse = pT < .4 ? kick(pT, 16, 8) : 0;
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) tr.hitAt = now; tr.hp = e.hp; const hT = (now - tr.hitAt) / 1000, hit = hT < R.hitMs / 1000 ? kick(hT, 18, 10) : 0;
  // the lean: into a push, back from a pull, a shiver as it grabs
  const leanWant = att === 'psyPush' ? (windup ? -.18 : .25) : att === 'psyPull' ? (windup ? .15 : -.25) : 0; tr.lean += (leanWant - tr.lean) * Math.min(1, dt * 8); if (!(dt > 0)) tr.lean = leanWant;
  if (!reduce) { tr.spin += dt * R.spin * (hostile ? 1.8 : 1) * (1 - ease); tr.orbit += dt * R.shardRate * (att ? 2.2 : 1) * (1 - ease); }
  resetPose(P);
  setEuler(P, BI.root, yaw, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z);
  const bob = reduce ? 0 : Math.sin(t * 1.6) * R.bob, sink = ease * (R.hover - R.W);
  setOffset(P, BI.float, 0, 0, bob * (1 - ease) - sink); resolveBone(P, BI.float);
  const shiver = grab && !reduce ? .03 * Math.sin(t * 40) : 0;
  setEuler(P, BI.body, tr.spin, tr.lean + .1 * hit + shiver, ease * 1.25); P.scl[BI.body] = 1 + .06 * pulse; resolveBone(P, BI.body);
  // the lesser crystals, grown from its foot; fallen, they clatter to the floor beside it and lie on their sides
  const hop = Math.abs(Math.sin(ease * Math.PI * 2)) * (1 - ease) * .06;
  for (const [b, s] of [['lesserL', -1], ['lesserR', 1]]) {
    setOffset(P, BI[b], 0, s * (.36 - R.W * 1.2) * ease, ease * (R.H * .35 - R.W + .08) + hop); setEuler(P, BI[b], tr.spin * .5, s * -.4 * (1 - ease), s * ease * 1.45); resolveBone(P, BI[b]); }
  // the shards circle it (the standard view's ellipse, here a true circle round it); fallen, they lie scattered flat
  for (let i = 0; i < SHARDS; i++) {
    const a = tr.orbit + (i / SHARDS) * Math.PI * 2, r = R.shardOrbit * (1 + .15 * pulse), fa = i * 1.9 + .4, fx = Math.cos(fa) * .5, fy = Math.sin(fa) * .5;
    const ox = Math.cos(a) * r, oy = Math.sin(a) * r, oz = Math.sin(a * 2) * .03;
    setOffset(P, BI['shard' + i], (fx - ox) * ease + ox - R.shardOrbit, (fy - oy) * ease + oy, oz * (1 - ease) + (sink - R.hover + .03) * ease + hop * (1 + i * .3) - 0);
    setEuler(P, BI['shard' + i], a, 0, ease * 1.57); resolveBone(P, BI['shard' + i]); }
  // the aura: its colour by what it means (red attacking, violet grabbing, white at rest, none fallen); larger attacking, tight grabbing
  const want3 = fall > 0 ? [0, 0, 0] : grab ? [0, 1, 0] : hostile ? [1, 0, 0] : [0, 0, 1], k3 = Math.min(1, dt * 6) || 1;
  for (let i = 0; i < 3; i++) tr.aura[i] += (want3[i] - tr.aura[i]) * k3;
  const arWant = grab ? .42 + (reduce ? 0 : .04 * Math.sin(t * 12)) : hostile ? .66 + (reduce ? 0 : .05 * Math.sin(t * 9)) : .52; tr.auraR += (arWant - tr.auraR) * k3;
  const size = (tr.auraR / .52) * (windup ? 1.15 : 1) * (1 - ease);
  ['auraR', 'auraV', 'auraW'].forEach((b, i) => { P.scl[BI[b]] = Math.max(.001, size * smooth(clamp01((tr.aura[i] - .1) / .8))); resolveBone(P, BI[b]); });
  writeSkin(P);
  const F = tr.frame, life = dead ? 1 - span(death, .5, 1) : 1, glowK = fall > 0 ? .35 : 1;
  F.emitK[0] = life * glowK * (1.1 + .5 * (hostile || grab ? 1 : 0) + .6 * pulse + (reduce ? 0 : .1 * Math.sin(t * 3)));
  F.emitK[1] = 0; F.emitK[2] = 0; F.emitK[3] = 1.2;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = 1; F.emitA[3] = fall > 0 ? 0 : life * (windup ? .32 : .25) * (tr.aura[2] > .5 ? .7 : 1);
  F.tier = env.tier || 'full'; F.mesh = crystalMesh(F.tier); F.skin = P.skin; F.alpha = life;
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = Math.max(0, (R.hover - sink) * S); F.shadow = 1; F.phase = att ? `${att}:${ph}` : dead ? 'death' : 'move';
  F.contact = pulse > .5 ? 1 : 0; F.cloud = F.emitA[3] > .01;
  return F;
}
export const crystalBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
