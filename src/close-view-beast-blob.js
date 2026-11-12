// The Morphing Blob in Close View: the standard view's blob (monster-render.ts morphingBlob: a mound of living ooze whose
// outline never holds still, flat where it meets the ground, lit pale at the crown and dark at the heart, drips pooled at its
// edge, nuclei drifting in it, three eyes sunk in the ooze turning toward the Wayfarer with lime irises that go orange when it
// is enraged, bubbles rising and bursting, tendrils lashing out along their lanes) as one skinned body on the shared beast rig.
// Its outline wobbles on eight lobes; it shivers as it winds up, surges along the engulf's lane, lifts on the leap and lands
// in a splash; it grows as the game grows it (`e.scale`). Nothing here changes timing, damage, reach or targeting.
import { defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, writeSkin, meshBuilder, clamp01, smooth, span, kick } from "./close-view-beast-rig.js?v=r914-c1265a9326d1";

const LOBES = 8, TENDRILS = 3, TSEG = 3, BUBBLES = 3;
export const BLOB_RIG = Object.freeze({
  closeViewScale: 1.25, // the beasts share the Giant's Close View size (Tim, 2026-11-11)
  R: .66, height: .74, // the standard view's mound: R wide, its crown .86 tiles up
  tendrilLength: 4.2, tendrilReach: .6, // BLOB.tendrilLength plus .6 of its body radius, as the standard view draws the lash
  turnRate: 2.5, attackTurnRate: 8, deathMs: 2000, hitMs: 320, leapHeight: .9,
});
const R = BLOB_RIG;
export const BLOB_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'core', parent: 'root', at: [0, 0, 0] },
  ...Array.from({ length: LOBES }, (_, i) => ({ name: 'lobe' + i, parent: 'core', at: [0, 0, 0] })),
  { name: 'eyes', parent: 'core', at: [0, 0, 0] }, { name: 'irisLime', parent: 'eyes', at: [0, 0, 0] }, { name: 'irisRage', parent: 'eyes', at: [0, 0, 0] },
  ...Array.from({ length: TENDRILS }, (_, i) => Array.from({ length: TSEG }, (_, j) => ({ name: `ten${i}_${j}`, parent: j ? `ten${i}_${j - 1}` : 'core', at: j ? [1, 0, 0] : [R.R * .7, 0, R.height * .35] }))).flat(),
  ...Array.from({ length: BUBBLES }, (_, i) => ({ name: 'bubble' + i, parent: 'core', at: [0, 0, 0] })),
]);
const BI = BLOB_SKELETON.index;
const E_IRIS = 1, E_RAGE = 2, E_NUCLEUS = 3;
const hexOf = (c) => parseInt(String(c).slice(1), 16);
const C = Object.freeze({ ooze: hexOf("#5fbf6e"), dark: hexOf("#143a1d"), lime: hexOf("#d4ff5a"), pale: hexOf("#f4ffe8"), rage: hexOf("#ff6a3a"), sclera: hexOf("#e4dcc0"), pupil: hexOf("#0a0c04"), drip: hexOf("#1e4a28") });
function lerpHex(a, b, t) { t = clamp01(t); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); }
// the mound's profile: [height share, radius share] from the rim at the ground up to the crown
const PROFILE = [[0, 1], [.1, 1.07], [.28, 1.09], [.46, 1.02], [.62, .9], [.76, .72], [.87, .5], [.95, .28], [.99, .1], [1, .02]];
const surf = (h) => { let k = 0; while (k < PROFILE.length - 2 && PROFILE[k + 1][0] < h) k++; const [h0, r0] = PROFILE[k], [h1, r1] = PROFILE[k + 1]; return r0 + (r1 - r0) * (h - h0) / (h1 - h0 || 1); };
// the three eyes on the front of the mound: [azimuth (0 = toward its aim), height share, size]
const EYES = [[-.42, .44, .085], [0, .5, .11], [.42, .44, .085]];
function buildBlobMesh(tier) {
  const low = tier === 'low', full = tier === 'full', B = meshBuilder(BLOB_SKELETON, full ? 1 : low ? .4 : .7);
  // the mound: a sheet round the lobes (each vertex between the two lobes either side of it, by azimuth), pale at the crown
  // through the ooze's green to the dark heart at its foot
  const cols = low ? 16 : full ? 40 : 28, rows = PROFILE.length, grid = [], bones = [];
  for (let r = 0; r < rows; r++) { const [h, rr] = PROFILE[r], row = [], brow = [];
    for (let c = 0; c <= cols; c++) { const a = (c / cols) * Math.PI * 2, li = (a / (Math.PI * 2)) * LOBES, i0 = Math.floor(li) % LOBES, w = li - Math.floor(li);
      row.push([Math.cos(a) * R.R * rr, Math.sin(a) * R.R * rr, h * R.height + .005]);
      // the crown rides the core, not the lobes (whose wobble would otherwise make it jagged)
      brow.push(h > .78 ? ['lobe' + (w < .5 ? i0 : (i0 + 1) % LOBES), 'core', smooth((h - .78) / .2)] : ['lobe' + i0, 'lobe' + ((i0 + 1) % LOBES), w]); }
    grid.push(row); bones.push(brow); }
  B.sheet({ grid, vertBones: (r, c) => bones[r][c], tone: (r, c) => { const h = PROFILE[r][0]; let col = h > .55 ? lerpHex(C.ooze, C.pale, (h - .55) * 1.3) : lerpHex(C.dark, C.ooze, Math.min(1, h / .25) * .85 + .15); if (((r * 7 + c * 3) % 11) === 0) col = lerpHex(col, C.lime, .25); return col; } });
  // the crown's wet highlight
  B.bone('lobe2').color(C.pale).ellipsoid({ at: [-.05, .1, R.height * .86], radius: [.1, .05, .012], rings: 2, seg: 8, F: [.6, .8, 0], U: [0, 0, 1] });
  // nuclei drifting just under the skin (lime glow, channel 3 so their glow reads through from either side)
  if (!low) for (let i = 0; i < (full ? 6 : 4); i++) { const a = i * 2.3 + .5, h = .25 + (i % 3) * .14, rr = surf(h) * R.R * .985, li = Math.floor(((a % (Math.PI * 2)) / (Math.PI * 2)) * LOBES) % LOBES;
    B.bone('lobe' + li).color(lerpHex(C.lime, C.dark, .35), E_NUCLEUS).ellipsoid({ at: [Math.cos(a) * rr, Math.sin(a) * rr, h * R.height], radius: [.028, .022, .022], rings: 3, seg: 8, F: [-Math.sin(a), Math.cos(a), 0], U: [Math.cos(a), Math.sin(a), 0] }); }
  // the eyes: veined pale balls sunk in the front, lime irises (orange enraged), slit pupils
  for (const [az, h, sz] of EYES) { const rr = R.R * surf(h) * .985, x = Math.cos(az) * rr, y = Math.sin(az) * rr, z = h * R.height, F = [Math.cos(az), Math.sin(az), 0];
    B.bone('eyes').color(C.sclera).ellipsoid({ at: [x, y, z], radius: [sz * .6, sz, sz * .8], rings: low ? 3 : 5, seg: low ? 7 : 10, F, U: [0, 0, 1] });
    for (const [bone, col, ch] of [['irisLime', C.lime, E_IRIS], ['irisRage', C.rage, E_RAGE]]) B.bone(bone).color(col, ch).ellipsoid({ at: [x + F[0] * sz * .5, y + F[1] * sz * .5, z], radius: [sz * .16, sz * .5, sz * .55], rings: 3, seg: 8, F, U: [0, 0, 1] });
    B.bone('eyes').color(C.pupil).ellipsoid({ at: [x + F[0] * sz * .6, y + F[1] * sz * .6, z], radius: [sz * .1, sz * .1, sz * .45], rings: 2, seg: 6, F, U: [0, 0, 1] }); }
  // drips pooled at its edge
  for (let i = 0; i < (low ? 4 : 7); i++) { const a = i * (Math.PI * 2 / 7) + .3; B.bone('lobe' + Math.floor(((a % (Math.PI * 2)) / (Math.PI * 2)) * LOBES)).color(C.drip).ellipsoid({ at: [Math.cos(a) * R.R * 1.06, Math.sin(a) * R.R * 1.06, .01], radius: [.08, .035, .012], rings: 2, seg: 6, F: [-Math.sin(a), Math.cos(a), 0], U: [0, 0, 1] }); }
  // the tendrils: each three segments of dark ooze sheathed in green, with pale suckers; shown when it lashes
  // (sections at each bone and halfway between bones, so the tendril follows its bones however long the lash makes them)
  const bwB = BLOB_SKELETON.bindWorld;
  for (let i = 0; i < TENDRILS; i++) { const at = (j, f) => { const k = BI[`ten${i}_${j}`] * 3; return [bwB[k] + f, bwB[k + 1], bwB[k + 2]]; }, rad = (q) => .075 * (1 - q) + .012, secs = [];
    for (let j = 0; j < TSEG; j++) { secs.push([at(j, 0), rad(j / TSEG), `ten${i}_${j}`, `ten${i}_${j}`, 0]); secs.push([at(j, .5), rad((j + .5) / TSEG), `ten${i}_${j}`, j < TSEG - 1 ? `ten${i}_${j + 1}` : `ten${i}_${j}`, j < TSEG - 1 ? .5 : 0]); }
    secs.push([at(TSEG - 1, 1), .006, `ten${i}_${TSEG - 1}`, `ten${i}_${TSEG - 1}`, 0]);
    B.color(C.ooze).loft({ seg: low ? 5 : 7, minSeg: 4, sections: secs.map(([p, r, ba, bb, w]) => ({ at: p, rx: r, rz: r, bones: [ba, bb, w] })), up: [0, 0, 1], tone: (k) => k % 2 ? C.ooze : lerpHex(C.dark, C.ooze, .4) });
    if (!low) for (let j = 0; j < TSEG; j++) B.bone(`ten${i}_${j}`).color(C.pale).ellipsoid({ at: [.25, 0, -rad(j / TSEG) * .85], radius: [.022, .022, .01], rings: 2, seg: 5 }); }
  // bubbles rising through it and bursting at the skin
  for (let i = 0; i < BUBBLES; i++) B.bone('bubble' + i).color(C.pale).ellipsoid({ at: [0, 0, 0], radius: [.03, .03, .03], rings: 3, seg: 6 });
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function blobMesh(tier = 'full') { return MESHES[tier] ||= buildBlobMesh(tier); }

export function createBlobTrack() {
  return {
    pose: createPose(BLOB_SKELETON), yaw: NaN, at: NaN, hp: NaN, hitAt: -Infinity, deathAt: null, x: 0, y: 0, z: 0, surge: 0, shiver: 0, liftWas: 0, landAt: -Infinity, px: NaN, py: NaN,
    frame: { kind: 'morphingBlob', tier: 'full', mesh: null, skin: null, boneCount: BLOB_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}
const D = new Float64Array(3);
export function sampleBlob(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(6, Number(env.scale) || 1)), P = tr.pose;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / R.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000, s0 = dead ? null : e.pack, att = s0?.attack, ph = s0?.phase, d = s0?.data || {};
  const enraged = e.hp <= e.maxHp * .5, windup = ph === 'windup';
  // facing: the attack's aim, else the Wayfarer (its eyes turn toward them)
  let want = tr.yaw;
  if (d.aim && Math.hypot(d.aim.x, d.aim.y) > .01) want = Math.atan2(d.aim.y, d.aim.x);
  else if (env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .2) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0; if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) tr.yaw += Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)) * Math.min(1, dt * (att ? R.attackTurnRate : R.turnRate));
  const yaw = tr.yaw;
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) tr.hitAt = now; tr.hp = e.hp; const hT = (now - tr.hitAt) / 1000, hit = hT < R.hitMs / 1000 ? kick(hT, 16, 9) : 0;
  // the engulf's surge stretches it along the lane; a windup shivers it; the leap lifts it and it lands in a splash
  const surgeWant = att === 'blobEngulf' && ph === 'active' ? 1 : att === 'blobEngulf' && windup ? -.4 : 0; tr.surge += (surgeWant - tr.surge) * Math.min(1, dt * 10); if (!(dt > 0)) tr.surge = surgeWant;
  const hop = Math.max(0, Number(e.hopLift) || 0); if (tr.liftWas > .05 && hop <= .05) tr.landAt = now; tr.liftWas = hop;
  const lT = (now - tr.landAt) / 1000, splash = lT < .5 ? kick(lT, 14, 7) : 0;
  // moving: it rolls forward on its lobes (a gentle lean of the wobble toward where it goes)
  const mx = Number.isFinite(tr.px) ? env.x - tr.px : 0, my = Number.isFinite(tr.py) ? env.y - tr.py : 0; tr.px = env.x; tr.py = env.y;
  const speed = dt > 0 ? Math.min(3, Math.hypot(mx, my) / dt) : 0, movA = Math.atan2(my, mx) - yaw;
  const melt = dead ? smooth(death / .8) : 0;
  resetPose(P);
  setEuler(P, BI.root, yaw, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z);
  const breathe = reduce ? 0 : .02 * Math.sin(t * 1.4), shake = windup && !reduce ? .03 * Math.sin(t * 44) : 0;
  setOffset(P, BI.core, 0, 0, hop * R.leapHeight); setEuler(P, BI.core, shake, -.08 * tr.surge, 0); P.scl[BI.core] = Math.max(.001, (1 + breathe + .08 * hit - .1 * splash) * (1 - .7 * melt)); resolveBone(P, BI.core);
  // the lobes: each its own slow wobble (the standard view's three waves round the outline), stretched toward the surge
  for (let i = 0; i < LOBES; i++) { const a = (i / LOBES) * Math.PI * 2, front = Math.cos(a);
    const wob = reduce ? 0 : .07 * Math.sin(3 * a + t * 2.1) + .05 * Math.sin(5 * a - t * 3.2) + .035 * Math.sin(7 * a + t * 1.4);
    const roll = speed > .2 && !reduce ? .05 * Math.cos(a - movA) * Math.min(1, speed / 2) : 0;
    P.scl[BI['lobe' + i]] = Math.max(.001, 1 + wob + roll + .22 * tr.surge * Math.max(0, front) - .1 * tr.surge * Math.max(0, -front) + .2 * splash * (1 - front * front * .5) + (windup && !reduce ? .03 * Math.sin(t * 22 + i) : 0));
    resolveBone(P, BI['lobe' + i]); }
  // the eyes and their irises (lime, or orange enraged)
  P.scl[BI.eyes] = (P.scl[BI.lobe7] + P.scl[BI.lobe0] + P.scl[BI.lobe1]) / 3; resolveBone(P, BI.eyes); P.scl[BI.irisLime] = enraged ? .001 : 1; P.scl[BI.irisRage] = enraged ? 1 : .001; resolveBone(P, BI.irisLime); resolveBone(P, BI.irisRage);
  // the tendrils: coiled stubs in the windup, then out along each lane and drawn back (the standard view's `out`)
  const lash = att === 'blobTendrils' && d.dirs ? (windup ? .12 : Math.max(0, Math.min(1, (s0.t || 0) / .3)) * .95 + .05) : 0;
  const L = (R.tendrilLength + (Number(e.bodyRadius) || .4) * R.tendrilReach) / S; // in tiles, as the standard view; the body's scale undone
  for (let i = 0; i < TENDRILS; i++) {
    const dir = d.dirs?.[i], seg = Math.max(.001, lash * L / TSEG);
    for (let j = 0; j < TSEG; j++) { const bi = BI[`ten${i}_${j}`];
      if (j) setOffset(P, bi, seg - 1, 0, 0);
      if (lash > 0 && dir) { const wave = reduce ? 0 : Math.sin(j * 2.3 + t * 14 + i) * .25 * (1 - j / TSEG);
        D[0] = dir.x - dir.y * wave; D[1] = dir.y + dir.x * wave; D[2] = j ? -.05 : -.25; aimWorld(P, bi, 0, D[0], D[1], D[2], 0, 0, 1); }
      P.scl[bi] = !(lash > 0 && dir) ? (j ? 1 : .001) : j === TSEG - 1 ? Math.max(.05, seg) : 1; resolveBone(P, bi); } }
  // bubbles rising up through it and bursting at the crown
  for (let i = 0; i < BUBBLES; i++) { const f = reduce ? .5 : (t * .35 + i * .33) % 1, a = i * 2.7 + (reduce ? 0 : t * .5), h = .2 + f * .75, rr = R.R * .95 * Math.max(.1, 1 - h * h);
    setOffset(P, BI['bubble' + i], Math.cos(a) * rr, Math.sin(a) * rr, h * R.height); P.scl[BI['bubble' + i]] = Math.max(.001, f < .9 ? 1 : (1 - f) * 10); resolveBone(P, BI['bubble' + i]); }
  writeSkin(P);
  const F = tr.frame, pulse = reduce ? 1 : .8 + .2 * Math.sin(t * 2.3);
  F.emitK[0] = (1 - melt) * 1.1; F.emitK[1] = (1 - melt) * 1.3; F.emitK[2] = (1 - melt) * pulse * (enraged ? 1.4 : .9); F.emitK[3] = 0;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = 1; F.emitA[3] = 1;
  F.tier = env.tier || 'full'; F.mesh = blobMesh(F.tier); F.skin = P.skin; F.alpha = dead ? 1 - span(death, .5, 1) : 1;
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = hop * R.leapHeight * S; F.shadow = 1; F.phase = att ? `${att}:${ph}` : dead ? 'death' : 'move';
  F.contact = splash > .5 || (lash > .9) ? 1 : 0; F.cloud = false;
  return F;
}
export const blobBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
