// The Tremor Worm in Close View: the standard view's worm (monster-render.ts tremorWorm: a ringed column of sand-coloured
// armour standing out of a hole of broken ground, its head a round maw ringed with teeth and lit from deep in the throat, small
// tentacles writhing at its lips) as one skinned body on the shared beast rig. It stands at the game's `wormLift` share of its
// length (half out by default, all the way up for the maw, the sweep and the slam), comes up out of the hole on the emergence
// clock throwing the ground off, opens its maw wide to drink the air, lashes its lip tentacles out along the maw's lanes and
// pulls them back, swings its length across the sweep's arc on the game's `swing`, rears back for the slam and lies along
// the line when it lands, the ground bursting under its head. Under the ground (hidden, or about to burst up on a Rise) it
// keeps the standard view's heaving mound. Nothing here changes timing, damage, reach or targeting.
// Visual pass 2 (Tim, 2026-11-12: "maybe just a little bit more of a visual pass, and we have to make sure we get his
// tentacles looking good"): shingled ring plates with a worn lip and chipped edges, three rings of teeth (the inner one
// turning as it drinks the air) round a throat that glows from deep down, a raised rim of broken slabs and rubble with cracks
// running out from the hole, and living lip tentacles (four bones each: a thick root, a curl, a taper, suckers along the
// underside, dark at the root and pale at the tips) that writhe on a travelling wave and snap out along the lanes.
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, writeSkin, meshBuilder, clamp01, smooth, span, kick, wobble, easeOut,
} from "./close-view-beast-rig.js?v=r920-57cd89998a05";

const SEGS = 10, TENTS = 6, TB = ['tent', 'tentB', 'tentC', 'tentD'];
export const WORM_RIG = Object.freeze({
  closeViewScale: 1.25, // the beasts share the Giant's Close View size (Tim, 2026-11-11)
  seg: .17, // each ring's length; the column is SEGS rings, the head on top (about the standard view's 1.4 tile height above ground at full lift)
  radius: .36, headRadius: .46, lean: .28, // the standard view's ring and head sizes and its lean toward the Wayfarer
  turnRate: 3, attackTurnRate: 9, blendMs: 160, deathMs: 2200, hitMs: 320, emergeTime: .7,
  // the lip tentacles: where they sit on the lip, each bone's length, the root and tip radii, how they writhe
  tentRing: .33, tentLip: .345, tentBone: .14, tentRoot: .066, tentTip: .008, tentSuckers: 5,
  tentOut: .62, tentCurl: -.3, tentWave: .32, tentRoll: .22, tentSpeed: 2.6, tentTravel: 1.15,
  // the lash: the four lane tentacles snap out to the ground `lashReach` tiles along the maw's lanes (at most `lashStretch`
  // more bind length per bone), hold, and recoil: snapMs out, holdMs, recoilMs back
  lashReach: 4.4, lashStretch: .6, lashFlat: [.05, -.3, -.42], snapMs: 70, holdMs: 170, recoilMs: 330,
  // the thrown earth: a ring of chunks that bursts up when it comes out of the ground and where its head lands on a slam
  sprayMs: 650, sprayHeight: .6, sprayGrow: 1.1, burstMs: 380,
});
// which lip tentacles lash along the maw's lanes (the game's dirs run from its right... to its left: lowest angle first), by
// the lane's side: the four nearest the front of the lip, right to left
const LANE_TENTS = Object.freeze([4, 5, 0, 1]);
const tentAngle = (i) => ((i + .5) / TENTS) * Math.PI * 2;

// ------------------------------------------------------------------------------------------------ skeleton
// model space: f forward (toward its aim), r right, u up; the hole at the origin. Each ring is a bone up the column.
export const WORM_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  ...Array.from({ length: SEGS }, (_, i) => ({ name: 'seg' + i, parent: i ? 'seg' + (i - 1) : 'root', at: [0, 0, i ? WORM_RIG.seg : -.3] })),
  { name: 'head', parent: 'seg' + (SEGS - 1), at: [0, 0, WORM_RIG.seg] },
  { name: 'throat', parent: 'head', at: [0, 0, .32] },
  { name: 'gullet', parent: 'throat', at: [0, 0, 0] },
  ...Array.from({ length: TENTS }, (_, i) => { const a = tentAngle(i), r = WORM_RIG.tentRing, L = WORM_RIG.tentBone;
    return [{ name: 'tent' + i, parent: 'head', at: [Math.cos(a) * r, Math.sin(a) * r, WORM_RIG.tentLip] }, { name: 'tentB' + i, parent: 'tent' + i, at: [0, 0, L] },
      { name: 'tentC' + i, parent: 'tentB' + i, at: [0, 0, L] }, { name: 'tentD' + i, parent: 'tentC' + i, at: [0, 0, L] }]; }).flat(),
  { name: 'spray', parent: 'root', at: [0, 0, 0] },
]);
const BI = WORM_SKELETON.index;
const E_THROAT = 1;

// ------------------------------------------------------------------------------------------------ the body
const hexOf = (c) => parseInt(String(c).slice(1), 16);
// the standard view's colours (MONSTER_PACK.tremorWorm.palette and the ring shades monster-render.ts paints)
const C = Object.freeze({ sand: hexOf("#b08a5a"), sandLit: hexOf("#e6c896"), pale: hexOf("#f3e2c0"), dark: hexOf("#2a1c12"), tan: hexOf("#9a7448"), seam: hexOf("#1a100a"),
  pore: hexOf("#3a2a1a"), throat: hexOf("#1a0604"), fire: hexOf("#ff7a2a"), core: hexOf("#ffcf8a"), tooth: hexOf("#f3e2c0"), toothIn: hexOf("#d8ccb0"),
  pit: hexOf("#120a06"), rubble: hexOf("#7a6044"), rubbleDark: hexOf("#56422e"), earth: hexOf("#6a5238"), crack: hexOf("#22160c") });
// The tentacles' flesh (the standard view's lip tentacles and its field tentacles: a dark outline #3a1a12, flesh #c98a6a to
// #e0a080, suckers #ffd8c0), shared with close-view-beast-tentacle.ts so the field tentacles match the lip tentacles.
export const TENTACLE_LOOK = Object.freeze({ root: hexOf("#4a1e14"), mid: hexOf("#b86a4c"), tip: hexOf("#f2bc9c"), belly: hexOf("#f0c0a0"), back: hexOf("#5a2418"),
  sucker: hexOf("#ffd8c0"), suckerIn: hexOf("#9a4a38") });
export function lerpHex(a, b, t) { t = clamp01(t); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); }
const hash = (n) => { let x = (n | 0) * 374761393 + 668265263; x = (x ^ (x >>> 13)) * 1274126177; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

// A tendril: one smooth tapering skin straight up +u from `root` (model bind space) through a chain of bones (bind positions
// up the same line), a bulb at the root, suckers in a row down its underside (bind -f: the bone's yaw turns that side to face
// where the pose wants it), the flesh dark at the root and pale at the tip, paler on the belly. Shared with the field tentacle.
export function buildTendril(B, o) {
  const sk = B.skeleton, bw = sk.bindWorld, bones = o.bones, zs = bones.map((n) => bw[sk.index[n] * 3 + 2]), [x0, y0, z0] = o.root, L = o.length, L0 = TENTACLE_LOOK;
  const radius = (h) => { const g = clamp01(h / L); return o.r0 * (1 - (1 - o.rTip / o.r0) * Math.pow(g, .8)) * (1 + o.bulb * Math.max(0, 1 - g / .14) ** 2); };
  const bonesAt = (z) => { if (z <= zs[0]) return [bones[0], bones[0], 0];
    for (let k = 0; k < zs.length - 1; k++) if (z < zs[k + 1]) return [bones[k], bones[k + 1], smooth((z - zs[k]) / (zs[k + 1] - zs[k]))];
    return [bones[bones.length - 1], bones[bones.length - 1], 0]; };
  const n = o.rings, hs = [];
  for (let j = 0; j < n; j++) hs.push(o.sink + (L - o.sink) * Math.pow(j / (n - 1), .9));
  const sections = hs.map((h, j) => ({ at: [x0, y0, z0 + h], rx: j === n - 1 ? 0 : radius(h), rz: j === n - 1 ? 0 : radius(h), bones: bonesAt(z0 + h) }));
  B.color(L0.mid).loft({ seg: o.seg, minSeg: o.minSeg || 4, up: [-1, 0, 0], caps: false, sections,
    tone: (i, k, st) => { const g = clamp01(hs[i] / L), base = g < .5 ? lerpHex(o.rootTone ?? L0.root, L0.mid, g / .5) : lerpHex(L0.mid, L0.tip, (g - .5) / .5);
      const belly = st > .25 ? lerpHex(base, L0.belly, .55 * (st - .25) / .75) : st < -.55 ? lerpHex(base, L0.back, .35 * (-st - .55) / .45) : base;
      return i % 2 && i < n - 2 ? lerpHex(belly, L0.back, .1) : belly; } });
  // the suckers: pale cups down the underside, shrinking toward the tip, each with a dark mouth (full detail)
  for (let j = 0; j < o.suckers; j++) {
    const h = L * (.13 + .7 * j / Math.max(1, o.suckers - 1)), r = radius(h), sz = Math.max(.004, r * (o.suckerSize ?? .5)), z = z0 + h, [ba] = bonesAt(z), bo = sk.index[ba] * 3;
    const at = [x0 - r * .9 - bw[bo], y0 - bw[bo + 1], z - bw[bo + 2]];
    B.bone(ba).color(L0.sucker).ellipsoid({ at, radius: [sz * .34, sz, sz * 1.15], F: [-1, 0, 0], U: [0, 0, 1], rings: 2, seg: o.full ? 6 : 5 });
    if (o.full) B.bone(ba).color(L0.suckerIn).ellipsoid({ at: [at[0] - sz * .2, at[1], at[2]], radius: [sz * .16, sz * .48, sz * .58], F: [-1, 0, 0], U: [0, 0, 1], rings: 2, seg: 5 });
  }
  return B;
}

function buildWormMesh(tier) {
  const full = tier === 'full', low = tier === 'low', B = meshBuilder(WORM_SKELETON, full ? 1 : low ? .4 : .7), bw = WORM_SKELETON.bindWorld, R = WORM_RIG;
  const zOf = (bone) => bw[BI[bone] * 3 + 2];
  // the column: one skin up the rings, each ring a shingled armour plate: a dark seam, a worn lip standing proud over the
  // ring below, the plate swelling and then tucking in under the next lip. Pale and tan plates alternate as the standard
  // view's, lit along the ridge, the lips scuffed pale and chipped dark here and there.
  const sections = [];
  for (let i = 0; i < SEGS; i++) { const b = 'seg' + i, nb = i < SEGS - 1 ? 'seg' + (i + 1) : 'head', z0 = zOf(b), r = R.radius * (1 + .04 * Math.sin(i * 1.7) + .12 * (i / SEGS));
    sections.push({ at: [0, 0, z0 + .004], r: r * .86, bones: [b, b, 0], ring: i, part: 'seam' });
    sections.push({ at: [0, 0, z0 + .022], r: r * 1.075, bones: [b, b, 0], ring: i, part: 'lip' });
    if (!low) sections.push({ at: [0, 0, z0 + .05], r: r * 1.065, bones: [b, b, 0], ring: i, part: 'plate' });
    if (full) sections.push({ at: [0, 0, z0 + R.seg * .6], r: r * 1.015, bones: [b, nb, .12], ring: i, part: 'mid' });
    sections.push({ at: [0, 0, z0 + R.seg * .9], r: r * .95, bones: [b, nb, .35], ring: i, part: 'tuck' }); }
  sections.push({ at: [0, 0, zOf('head') - .01], r: R.radius * 1.08, bones: ['seg' + (SEGS - 1), 'head', .6], ring: SEGS, part: 'neck' });
  B.color(C.sand).loft({ seg: low ? 8 : full ? 14 : 11, up: [1, 0, 0], caps: false, sections: sections.map((q) => ({ at: q.at, rx: q.r, rz: q.r, bones: q.bones })),
    tone: (i, k, st) => { const q = sections[i]; if (q.part === 'seam') return C.seam;
      let c = q.ring % 2 ? lerpHex(C.sand, C.pale, .5) : lerpHex(C.tan, C.sandLit, .42);
      c = lerpHex(c, C.sand, (hash(q.ring * 13 + 5) - .5) * .5);
      if (q.part === 'lip') c = lerpHex(c, C.pale, .38);
      if (q.part === 'tuck') c = lerpHex(c, C.dark, .32);
      if ((q.part === 'lip' || q.part === 'plate') && hash(q.ring * 97 + k * 31) < .14) c = lerpHex(c, C.dark, .5);
      if (q.part === 'mid' && hash(q.ring * 53 + k * 17) < .1) c = lerpHex(c, C.pore, .35);
      return lerpHex(c, st > .3 ? C.pale : C.dark, st > .3 ? (st - .3) * .45 : (.3 - st) * .22); } });
  // breathing pores along the sides of every other ring
  if (!low) for (let i = 1; i < SEGS; i += 2) for (const s of [-1, 1]) { const b = 'seg' + i, r = R.radius * (1.04 + .12 * (i / SEGS));
    B.bone(b).color(C.pore).ellipsoid({ at: [0, s * r, R.seg * .45], radius: [.03, .012, .026], rings: 2, seg: 6, U: [0, s, 0], F: [0, 0, 1] }); }
  // the head: a round cap wider than the column, its lip folding in to the maw in three folds
  const HR = R.headRadius, hs = low ? 9 : full ? 18 : 13;
  // (a skirt below the cap: as the head tips toward its foe, the back of the cap lifts off the top ring, and this hides the gap)
  B.bone('head').color(lerpHex(C.sand, C.dark, .25)).lathe({ at: [0, 0, 0], F: [0, 0, 1], U: [1, 0, 0], seg: hs, rings: [[-.19, R.radius * .98], [-.01, R.radius * 1.08]], caps: false });
  B.bone('head').color(C.sand).lathe({ at: [0, 0, 0], F: [0, 0, 1], U: [1, 0, 0], seg: hs, rings: [[-.01, R.radius * 1.08], [.08, HR * .98], [.18, HR], [.27, HR * .95]], caps: false });
  B.bone('head').color(C.sandLit).lathe({ at: [0, 0, 0], F: [0, 0, 1], U: [1, 0, 0], seg: hs, rings: [[.27, HR * .95], [.33, HR * .84], [.36, HR * .72]], caps: false });
  B.bone('head').color(C.tan).lathe({ at: [0, 0, .36], F: [0, 0, 1], U: [1, 0, 0], seg: hs, rings: [[0, HR * .72], [.014, HR * .68], [.008, HR * .62]], caps: false });
  if (!low) B.bone('head').color(C.dark).lathe({ at: [0, 0, .36], F: [0, 0, 1], U: [1, 0, 0], seg: hs, rings: [[.008, HR * .62], [.004, HR * .6]], caps: false });
  // the inner lip, lit from the throat (channel 1: the throat's glow)
  B.bone('head').color(lerpHex(C.tan, C.fire, .3), E_THROAT).lathe({ at: [0, 0, .36], F: [0, 0, 1], U: [1, 0, 0], seg: hs, rings: [[.004, HR * .6], [-.03, HR * .56]], caps: false });
  // the throat: a funnel going down into the dark, glowing deeper in (channel 1: brighter as it drinks the air or spews)
  const ts = low ? 9 : full ? 16 : 12;
  B.bone('throat').color(C.throat).lathe({ at: [0, 0, 0], F: [0, 0, 1], U: [1, 0, 0], seg: ts, rings: [[.012, HR * .58], [-.03, HR * .5]], caps: false });
  B.bone('throat').color(lerpHex(C.throat, C.fire, .3), E_THROAT).lathe({ at: [0, 0, 0], F: [0, 0, 1], U: [1, 0, 0], seg: ts, rings: [[-.03, HR * .5], [-.09, HR * .36]], caps: false });
  B.bone('throat').color(lerpHex(C.fire, C.throat, .15), E_THROAT).lathe({ at: [0, 0, 0], F: [0, 0, 1], U: [1, 0, 0], seg: ts, rings: [[-.09, HR * .36], [-.15, HR * .22]], caps: false });
  B.bone('throat').color(C.fire, E_THROAT).lathe({ at: [0, 0, 0], F: [0, 0, 1], U: [1, 0, 0], seg: ts, rings: [[-.15, HR * .22], [-.18, HR * .1], [-.19, 0]], caps: false });
  B.bone('throat').color(C.core, E_THROAT).ellipsoid({ at: [0, 0, -.172], radius: [HR * .07, HR * .07, .012], rings: 2, seg: 8 });
  // three rings of hooked teeth, the outer on the lip, the middle (the gullet) turning as it drinks the air
  const teeth = (bone, n, r, z, len, base, tone) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + (bone === 'gullet' ? .17 : 0), c = Math.cos(a), s = Math.sin(a);
    B.bone(bone).color(tone).lathe({ at: [c * r, s * r, z], F: [-c * .72, -s * .72, .55], rings: [[0, base], [len * .45, base * .6], [len, 0]], seg: 4, minSeg: 4, caps: false }); } };
  teeth('throat', low ? 8 : full ? 18 : 12, HR * .59, .008, .085, .026, C.tooth);
  teeth('gullet', low ? 6 : full ? 14 : 10, HR * .47, -.035, .065, .02, C.toothIn);
  if (!low) teeth('throat', full ? 10 : 7, HR * .34, -.095, .045, .015, C.toothIn);
  // the lip tentacles
  for (let i = 0; i < TENTS; i++) { if (low && i % 2) continue; const t0 = 'tent' + i, o = BI[t0] * 3;
    buildTendril(B, { bones: TB.map((n) => n + i), root: [bw[o], bw[o + 1], bw[o + 2]], length: R.tentBone * 3 + .11, sink: -.03, r0: R.tentRoot, rTip: R.tentTip, bulb: .25,
      rings: low ? 5 : full ? 9 : 8, seg: low ? 5 : full ? 8 : 7, minSeg: 4, suckers: low ? 2 : full ? R.tentSuckers : 4, full }); }
  // the hole it stands in (on the root: it stays on the ground as the column moves): a dark pit with a wall going down, a
  // raised rim of broken ground slabs tipped up round it, rubble, and cracks running out across the ground
  B.bone('root').color(C.pit).ellipsoid({ at: [0, 0, .006], radius: [.58, .58, .006], rings: 4, seg: low ? 10 : 16, U: [0, 0, 1] });
  if (!low) B.bone('root').color(C.crack).lathe({ at: [0, 0, 0], F: [0, 0, 1], U: [1, 0, 0], seg: 12, rings: [[.008, .56], [-.3, .5]], caps: false });
  if (!low) for (let i = 0; i < (full ? 9 : 6); i++) { const a = (i / (full ? 9 : 6)) * Math.PI * 2 + .5 + hash(i * 7) * .4, len = .22 + hash(i * 11) * .28, r0 = .6 + len / 2;
    B.bone('root').color(C.crack).box({ at: [Math.cos(a) * r0, Math.sin(a) * r0, .004], F: [Math.cos(a + (hash(i) - .5) * .3), Math.sin(a + (hash(i) - .5) * .3), 0], U: [0, 0, 1], size: [len / 2, .022, .003], bevel: 0, taper: .7 }); }
  { const n = low ? 5 : full ? 9 : 7;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + hash(i * 3 + 1) * .5, r = .66 + hash(i * 5) * .06, tip = .45 + hash(i * 9) * .35;
      B.bone('root').color(i % 2 ? C.earth : C.rubbleDark).box({ at: [Math.cos(a) * r, Math.sin(a) * r, .03], F: [Math.cos(a) * Math.cos(tip), Math.sin(a) * Math.cos(tip), Math.sin(tip)],
        U: [-Math.cos(a) * Math.sin(tip), -Math.sin(a) * Math.sin(tip), Math.cos(tip)], size: [.1 + hash(i * 13) * .04, .09 + hash(i * 17) * .05, .022], bevel: 0 }); } }
  { const n = low ? 6 : full ? 13 : 9;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + .2 + hash(i * 19) * .3, r = .56 * (1 + (i % 3) * .1) + hash(i * 23) * .12, sz = .045 + (i % 3) * .022 + hash(i * 29) * .015;
      B.bone('root').color(i % 2 ? C.rubble : C.rubbleDark).box({ at: [Math.cos(a) * r, Math.sin(a) * r, sz * .6], F: [Math.cos(a + 1 + i), Math.sin(a + 1 + i), .3], U: [hash(i) - .5, .2, 1],
        size: [sz * 1.3, sz, sz * .55], bevel: full ? .3 : 0, taper: .3 + hash(i * 31) * .3, skew: (hash(i * 37) - .5) * sz }); } }
  // the earth it throws off (on the spray bone: hidden until it bursts up, or its head lands)
  { const n = low ? 6 : full ? 12 : 9;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + hash(i * 31) * .4, r = .4 + hash(i * 37) * .16, sz = .018 + hash(i * 41) * .026, z = hash(i * 43) * .22;
      B.bone('spray').color(i % 3 ? C.rubbleDark : C.sand).box({ at: [Math.cos(a) * r, Math.sin(a) * r, z], F: [Math.cos(a + i), Math.sin(a + i), .4 + hash(i * 47)], U: [.2, hash(i) - .5, 1], size: [sz, sz * .7, sz * .55], bevel: 0, taper: .4 }); } }
  // lava spat from the throat (channel 3: shown only while it spews)
  B.mark();
  B.bone('throat').color(C.fire, 3).lathe({ at: [0, 0, 0], F: [0, 0, 1], U: [1, 0, 0], rings: [[0, HR * .4], [.25, HR * .5], [.5, HR * .3], [.7, 0]], seg: low ? 6 : 10, caps: false });
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function wormMesh(tier = 'full') { return MESHES[tier] ||= buildWormMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track
export function createWormTrack() {
  return {
    pose: createPose(WORM_SKELETON), yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(6), shown: new Float64Array(6),
    hp: NaN, lashSeen: null, lashAt: -Infinity, lanes: new Float64Array(8), laneCount: 0, hitAt: -Infinity, hitSide: 1, deathAt: null, x: 0, y: 0, z: 0,
    contactWas: 0, contactAt: -Infinity, slamSeen: false, slamAt: -Infinity, slamX: 0, slamY: 0, burstAt: -Infinity, sidePrev: NaN, sideVel: 0,
    frame: { kind: 'tremorWorm', tier: 'full', mesh: null, skin: null, boneCount: WORM_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}
// ------------------------------------------------------------------------------------------------ what it is doing
// The body as six numbers: height (the share of the column above ground), bend (total forward bend, + toward its aim), side
// (total sideways bend, + to its left), tilt (the base's forward topple), open (the maw), coil (the lane tentacles drawn back
// before the lash). `ACT.up` is the emergence (0 just breaking the ground, 1 out).
const V = new Float64Array(6), W6 = new Float64Array(6);
const ACT = { aimX: 0, aimY: 0, aim: false, contact: 0, fire: 0, suck: 0, phase: '', up: 1, flare: 0 };
function act(e, tr, now, t) {
  const s = e.pack, id = s?.attack, ph = s?.phase, d = s?.data || {}, Wk = s?.worm, R = WORM_RIG;
  const up = Wk?.mode === 'emerge' ? Math.max(.05, 1 - Math.max(0, Number(Wk.t) || 0) / R.emergeTime) : 1, lift = Math.max(.15, Math.min(1.2, Number.isFinite(e.wormLift) ? e.wormLift : 1));
  ACT.aim = false; ACT.contact = 0; ACT.fire = 0; ACT.suck = 0; ACT.phase = id ? `${id}:${ph}` : 'move'; ACT.up = up; ACT.flare = 0;
  if (d.aim && Math.hypot(d.aim.x, d.aim.y) > .01) { const l = Math.hypot(d.aim.x, d.aim.y); ACT.aimX = d.aim.x / l; ACT.aimY = d.aim.y / l; ACT.aim = true; }
  let reach = 1, bend = R.lean, side = 0, tilt = 0, open = .7 + .06 * Math.sin(t * 1.7), coil = 0;
  if (ph === 'windup') open = .85;
  if (up < 1) open = .25 + .5 * up;
  if (id === 'wormSuction' && ph !== 'recover') { open = 1; ACT.suck = 1; }
  if (id === 'wormMaw' && d.dirs) {
    bend = .55; open = .95;
    if (ph === 'windup') coil = clamp01(1 - (Number(s.t) || 0) / .5);
    if (d.lashed && d.lashed !== tr.lashSeen) { // the lash: record when (render clock) and the lanes it runs along
      tr.lashSeen = d.lashed; tr.lashAt = now; tr.laneCount = Math.min(LANE_TENTS.length, d.dirs.length);
      for (let j = 0; j < tr.laneCount; j++) { const q = d.dirs[j], l = Math.hypot(q.x, q.y) || 1; tr.lanes[j * 2] = q.x / l; tr.lanes[j * 2 + 1] = q.y / l; }
    }
    if (d.lashed && now - tr.lashAt < R.snapMs + R.holdMs) ACT.contact = 1;
  }
  if (id === 'wormSweep' && ph === 'active') { side = -((Number(d.swing) || 0) * 2 - 1) * 1.3; bend = .6; reach = .85; ACT.contact = 1; }
  else if (id === 'wormSweep' && ph === 'windup') { side = .7; bend = .1; ACT.flare = .4; }
  else if (id === 'wormSlam' && ph === 'windup') { bend = -.5; reach = 1.12; open = 1; ACT.flare = 1; }
  else if (id === 'wormSlam' && d.slammed) { bend = 1.6; tilt = .4; reach = 1; if (ph === 'active' || now - (d.slammedAt || 0) < 400) ACT.contact = 1; }
  if (id === 'wormLavaSpew' && ph !== 'recover') { open = 1; ACT.fire = ph === 'active' ? 1 : .5; bend = .5; }
  if (id === 'wormRocks' && ph === 'windup') { bend = -.35; open = .9; }
  if (id === 'shockwave' && ph === 'windup') { bend = -.2; reach = 1.1; open = 1; ACT.flare = .6; }
  V[0] = Math.max(.08, up * lift * reach); V[1] = bend; V[2] = side; V[3] = tilt; V[4] = open; V[5] = coil;
}

// ------------------------------------------------------------------------------------------------ the pose
const HF = new Float64Array(9);
export function sampleWorm(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), P = tr.pose, G = WORM_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  // back in sight after a Rise's mound: it bursts out of the ground
  if (!dead && !(gapMs < 250) && e.pack?.attack === 'wormRise') tr.burstAt = now;
  if (!dead) act(e, tr, now, t); else { V[0] = Math.max(.08, tr.shown[0] || .5); V[1] = .2; V[2] = 0; V[3] = 0; V[4] = .3; V[5] = 0; ACT.contact = 0; ACT.fire = 0; ACT.suck = 0; ACT.phase = 'death'; ACT.up = 1; ACT.flare = 0; }
  // a Rise's burst (the game shows it whole at once): up out of the hole over burstMs
  const burst = reduce || e.pack?.attack !== 'wormRise' ? 1 : smooth((now - tr.burstAt) / G.burstMs);
  if (burst < 1) { V[0] *= Math.max(.1, burst); ACT.up = Math.min(ACT.up, burst); }
  // facing: the attack's aim, else the Wayfarer
  let want = tr.yaw;
  if (ACT.aim) want = Math.atan2(ACT.aimY, ACT.aimX);
  else if (env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .3) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)); tr.yaw += Math.max(-1, Math.min(1, dt * (e.pack?.attack ? G.attackTurnRate : G.turnRate))) * delta; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // blend: the posture and the bends ease (the game's own lift already eases at its posture rate)
  const key = dead ? 'death' : e.pack?.attack ? `${e.pack.attack}:${e.pack.seq}:${e.pack.phase}:${e.pack.data?.slammed ? 1 : 0}` : 'move';
  if (tr.key === '' || !(gapMs <= G.blendMs * 4)) { tr.shown.set(V); tr.from.set(V); tr.key = key; tr.blendAt = -Infinity; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  for (let k = 0; k < 6; k++) W6[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  // the lift and the sweep's swing follow the game exactly; so does the lash's coil
  W6[0] = V[0]; W6[2] = e.pack?.attack === 'wormSweep' && e.pack.phase === 'active' ? V[2] : W6[2]; W6[5] = V[5];
  tr.shown.set(W6);
  // how fast the sweep is swinging it (the lip tentacles trail behind)
  if (Number.isFinite(tr.sidePrev) && dt > 0) tr.sideVel += ((W6[2] - tr.sidePrev) / dt - tr.sideVel) * Math.min(1, dt * 12); else tr.sideVel = 0;
  tr.sidePrev = W6[2];
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp; const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 18, 10) : 0;
  if (ACT.contact && !tr.contactWas) tr.contactAt = now; tr.contactWas = ACT.contact;
  const cT = (now - tr.contactAt) / 1000, jolt = cT < .35 ? kick(cT, 20, 9) : 0;
  const slammed = !dead && e.pack?.attack === 'wormSlam' && !!e.pack.data?.slammed;
  if (slammed && !tr.slamSeen) tr.slamAt = now; tr.slamSeen = slammed;
  // death: it sinks back into its hole
  const sinkDeath = dead ? smooth(death / .8) : 0;
  resetPose(P);
  setEuler(P, BI.root, yaw, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z);
  // the column: the base sunk so that `height` of it stands above the ground; the bends spread up it, most near the head.
  // Coming up it shudders; the slam's landing squashes the rings together for a moment.
  const len = SEGS * G.seg, base = W6[0] * (1 - sinkDeath) * len - len;
  const sway = reduce ? 0 : .06 * wobble(t * .9, 1), suckShiver = ACT.suck && !reduce ? .012 * Math.sin(t * 18) : 0, shudder = reduce ? 0 : (1 - ACT.up) * .06;
  const squash = slammed && !reduce ? .1 * Math.max(0, kick((now - tr.slamAt) / 1000, 14, 7)) : 0;
  setOffset(P, BI.seg0, 0, 0, base + .3 - .02 * jolt); setEuler(P, BI.seg0, 0, W6[3] + .04 * jolt, 0); resolveBone(P, BI.seg0);
  for (let i = 1; i < SEGS; i++) { const f = i / (SEGS - 1), wgt = (2 * f) / SEGS;
    setOffset(P, BI['seg' + i], 0, 0, -G.seg * squash * f);
    setEuler(P, BI['seg' + i], .02 * sway, W6[1] * wgt + .15 * hit * f + shudder * Math.sin(t * 29 + i * 1.9), -W6[2] * wgt + sway * .3 * Math.sin(f * Math.PI) + .2 * hit * tr.hitSide * f + shudder * Math.sin(t * 23 + i * 2.7));
    P.scl[BI['seg' + i]] = 1 + suckShiver; resolveBone(P, BI['seg' + i]); }
  // the head: tilted toward the Wayfarer so the maw faces it (coming up, it noses out of the ground first); the throat opens
  // wider as the maw opens; the gullet's teeth turn as it drinks the air
  setEuler(P, BI.head, 0, (.6 + .25 * W6[1] - .2 * ACT.suck) * (.35 + .65 * ACT.up), 0); resolveBone(P, BI.head);
  const open = W6[4]; setOffset(P, BI.throat, 0, 0, .02 * (open - .7)); P.scl[BI.throat] = Math.max(.001, .6 + .45 * open); resolveBone(P, BI.throat);
  setEuler(P, BI.gullet, ACT.suck && !reduce ? -t * 2.2 : .04 * Math.sin(t * .8), 0, 0); resolveBone(P, BI.gullet);
  // the head's axes (unit): the lash's lanes are turned into the lip's frame
  { const h = BI.head * 9, sc = Math.hypot(P.wr[h], P.wr[h + 1], P.wr[h + 2]) || 1; for (let k = 0; k < 9; k++) HF[k] = P.wr[h + k] / sc; }
  poseTentacles(tr, e, P, S, now, t, reduce, dead ? death : 0, jolt);
  // the thrown earth: coming up out of the ground (on the hole), and where the head lands on a slam
  let sp = -1, sx = 0, sy = 0;
  if (!reduce) {
    if (ACT.up < 1) sp = ACT.up;
    else if (now - tr.burstAt < G.sprayMs) sp = (now - tr.burstAt) / G.sprayMs;
    if (slammed && now - tr.slamAt < G.sprayMs) { // under the head, in the root's frame
      const hp = BI.head * 3, dx = P.wp[hp] - x, dy = P.wp[hp + 1] - y; sp = (now - tr.slamAt) / G.sprayMs; sx = (dx * cf + dy * sf) / S; sy = (-dx * sf + dy * cf) / S; }
  }
  if (sp >= 0 && sp < 1) { setOffset(P, BI.spray, sx, sy, 4 * G.sprayHeight * sp * (1 - sp)); setEuler(P, BI.spray, sp * 1.4, 0, 0); P.scl[BI.spray] = (.6 + G.sprayGrow * sp) * (sp > .85 ? 1 - (sp - .85) / .15 * .7 : 1); }
  else P.scl[BI.spray] = .001;
  resolveBone(P, BI.spray);
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 1.4) : 1, pulse = reduce ? 1 : .85 + .15 * Math.sin(t * 5);
  F.emitK[0] = life * pulse * (1 + .9 * Math.max(ACT.suck, ACT.fire) + .3 * (open - .7)) * (.4 + .6 * ACT.up); // the fire deep in the throat
  F.emitK[1] = 0; F.emitK[2] = ACT.fire > 0 ? (reduce ? 1.6 : 1.4 + .4 * Math.sin(t * 17)) : 0; F.emitK[3] = 0;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = ACT.fire > .9 ? .8 : 0; F.emitA[3] = 0;
  F.tier = env.tier || 'full'; F.mesh = wormMesh(F.tier); F.skin = P.skin; F.alpha = 1;
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = 0; F.shadow = 1; F.phase = ACT.phase; F.contact = ACT.contact; F.cloud = F.emitA[2] > 0;
  return F;
}

// The lip tentacles. At rest each leans out from the lip and curls its tip back over the maw (suckers on the inside of the
// curl), writhing on a wave that runs from root to tip. They flare before the slam and the sweep, trail behind the sweep's
// swing, splay when the head lands, are drawn in as it drinks the air, and droop as it dies. For the maw: the four lane
// tentacles coil back and tremble through the windup, then snap out along the game's lanes to the ground (the skin stretching
// between the bones), whip, hold, and recoil.
function poseTentacles(tr, e, P, S, now, t, reduce, death, jolt) {
  const G = WORM_RIG, coil = W6[5], tau = (now - tr.lashAt) / 1000, lashing = tr.laneCount > 0 && tau >= 0 && tau * 1000 < G.snapMs + G.holdMs + G.recoilMs;
  const lashOut = !lashing ? 0 : reduce ? 1 : easeOut(tau * 1000 / G.snapMs) * (1 - smooth((tau * 1000 - G.snapMs - G.holdMs) / G.recoilMs));
  const trail = Math.max(-1, Math.min(1, -tr.sideVel * .25)), splay = Math.max(0, jolt) * .5, droop = smooth(death * 2);
  for (let i = 0; i < TENTS; i++) {
    const a = tentAngle(i), ph = i * 1.7, lane = LANE_TENTS.indexOf(i), inLane = lane >= 0 && lane < tr.laneCount, wr = reduce ? 0 : wobble(t * .9, i);
    const myCoil = inLane || (lane >= 0 && coil > 0) ? coil : 0;
    // the root: out from the lip, swaying round it
    let yaw = a + .12 * wr + trail * .5 * Math.sin(a), pitch = G.tentOut + .22 * wr - .55 * ACT.suck + .45 * ACT.flare + .5 * myCoil + splay + .5 * droop, sc = 1;
    const ti = BI['tent' + i]; resolveBone(P, ti);
    if (inLane && lashOut > 0) { // aim the root down the lane at the ground, the length stretched to reach it
      const lx = tr.lanes[lane * 2], ly = tr.lanes[lane * 2 + 1], o = ti * 3, gx = tr.x + lx * G.lashReach - P.wp[o], gy = tr.y + ly * G.lashReach - P.wp[o + 1], gz = tr.z + .05 * S - P.wp[o + 2];
      const dl = Math.hypot(gx, gy, gz) || 1, df = (gx * HF[0] + gy * HF[1] + gz * HF[2]) / dl, dr = (gx * HF[3] + gy * HF[4] + gz * HF[5]) / dl, du = (gx * HF[6] + gy * HF[7] + gz * HF[8]) / dl;
      const ty = Math.atan2(dr, df), tp = Math.acos(Math.max(-1, Math.min(1, du)));
      yaw += Math.atan2(Math.sin(ty - yaw), Math.cos(ty - yaw)) * lashOut; pitch += (tp - pitch) * lashOut; sc = 1 + .3 * lashOut;
      const need = dl / (S * sc), stretch = Math.max(0, Math.min(G.lashStretch, (need - G.tentBone * 3 - .11) / 3)) * lashOut;
      for (let k = 1; k < 4; k++) setOffset(P, BI[TB[k] + i], 0, 0, stretch);
    }
    setEuler(P, ti, yaw, pitch, 0); P.scl[ti] = sc; resolveBone(P, ti);
    // the chain: a curl back over the maw, a travelling wave in and out and side to side; the whip after the snap
    const straight = inLane ? lashOut : 0, speed = G.tentSpeed * (1 + myCoil * 2.5), tremble = reduce ? 0 : myCoil * .07 * Math.sin(t * 47 + i * 2.3);
    for (let k = 1; k < 4; k++) {
      const wave = reduce ? 0 : Math.sin(t * speed - k * G.tentTravel + ph), wave2 = reduce ? 0 : Math.sin(t * speed * .8 - k * G.tentTravel * 1.2 + ph * 1.3);
      const amp = .55 + .25 * k, curl = (G.tentCurl - .1 * k) * (1 - .6 * ACT.flare) - .5 * ACT.suck - .45 * myCoil + .35 * droop;
      let p = curl + G.tentWave * amp * wave * (1 - .7 * droop) + tremble, r = G.tentRoll * amp * wave2 + trail * .35 * k;
      if (straight > 0) { const whip = reduce ? 0 : .5 * Math.exp(-7 * tau) * Math.sin(tau * 26 - k * 1.3); p = p * (1 - straight) + (whip + G.lashFlat[k - 1]) * straight; r *= 1 - straight; }
      setEuler(P, BI[TB[k] + i], 0, p, r); resolveBone(P, BI[TB[k] + i]);
    }
  }
}
export const wormBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
