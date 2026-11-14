// Five authored Arcology/Hive bodies. These are registry recipes only; presentation metadata controls admission.
// Refinement pass (Tim, 2026-11-14): clearer anatomy at or under each body's earlier triangle count, and the attack joints of
// CLOSE_VIEW_ARCOLOGY_LIMB_RIGS (below) on top of the shared creature root motion (close-view-models.ts creatureRootPose).
import { MESH_FLOATS, bevel, prism, taper, ellipsoid, curvedTube, membrane, part, block } from './close-view-mesh.ts';

// Palettes are the original renderer's primary, shadow and accent colors.
const glass = 0x607c79, glassDark = 0x283b3b, glassEdge = 0xaab7aa;
const wardPlate = 0x6b6472, wardDark = 0x35313d, wardGlow = 0xc09b58, wardStaff = 0xc09b58;
const cinder = 0xa95d3c, flame = 0xa95d3c, ember = 0xefb15d, char = 0x4b2923;
const moth = 0x786887, mothWing = 0xb8a7cd, mothVein = 0x302c39, mothEye = 0xb8a7cd;
const voidShell = 0x645375, voidDark = 0x282333, voidEye = 0xb896cf;

// A part posed by `rest` about its own anchor, then carried by joint `swing` about (px, pz).
function jointed(item, swing, px, pz) {
  const mesh = item.mesh, dx = item.px - px, dz = item.pz - pz;
  for (let i = 0; i < mesh.length; i += MESH_FLOATS) { mesh[i] += dx; mesh[i + 2] += dz; }
  return { mesh, swing, px, pz };
}

// Glass Mite, a low crystal feeder: a flat faceted shell with one lit crystal spur, a small dark head carrying two lit
// mandibles (joint 122), and six splayed, high-kneed legs, each on its own joint (131-136: front, middle, rear; left, right)
// so the hop staggers them. 166 triangles.
const glassMite = [
  part(ellipsoid(6, 2), -.05, 0, .30, .33, .29, .17, glass, 0, -.05, .30, 0, false),
  part(taper, -.12, 0, .45, .07, .06, .13, glassEdge, 0, -.12, .45, -.35),
  part(ellipsoid(5, 1), .25, 0, .28, .1, .13, .085, glassDark, 121, .2, .3, 0, true),
  jointed(part(taper, .38, -.075, .28, .035, .03, .11, glassEdge, 0, .38, .28, 1.3), 122, .3, .29),
  jointed(part(taper, .38, .075, .28, .035, .03, .11, glassEdge, 0, .38, .28, 1.3), 122, .3, .29),
];
for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
  const x = .15 - i * .19, reach = (1 - i) * .14, y = side * (.19 + i * .012);
  glassMite.push(part(curvedTube([[x, y, .29, .045], [x + reach * .4, side * .40, .40, .035], [x + reach, side * .58, .03, .012]], 4), 0, 0, 0, 1, 1, 1, i === 1 ? glassDark : glass, 131 + i * 2 + (side > 0 ? 1 : 0), x, .29));
}

// Spark Warden, a walking conductor: plate armour, a broad dark helm with a lit visor slit (joint 121), three lit chest bars,
// an insulator stack on the back, and a staff ending in a lit tip and a fork that throws the bolts. 184 triangles.
const sparkWarden = [
  part(bevel, 0, 0, .86, .19, .25, .44, wardPlate),
  part(ellipsoid(6, 2), .06, 0, 1.36, .30, .31, .20, wardDark, 121, .02, 1.26, 0, true),
  part(membrane([[.33, -.17, 1.38], [.33, .17, 1.38], [.335, .15, 1.335], [.335, -.15, 1.335]]), 0, 0, 0, 1, 1, 1, wardGlow, 121, .02, 1.26),
  part(prism(5), -.2, 0, .98, .07, .07, .26, wardDark),
];
for (const side of [-1, 1]) sparkWarden.push(
  part(bevel, -.01, side * .18, .35, .10, .09, .34, wardDark, side, 0, .68),
  part(bevel, .02, side * .31, .91, .075, .085, .29, wardPlate, side * 2, 0, 1.15, side < 0 ? -.12 : .12),
);
for (const z of [.72, .87, 1.02]) sparkWarden.push(part(membrane([[.198, -.14, z + .027], [.198, .14, z + .027], [.198, .14, z - .027], [.198, -.14, z - .027]]), 0, 0, 0, 1, 1, 1, wardGlow));
sparkWarden.push(
  block(.11, -.34, .72, .027, .027, .69, wardStaff, -2, 0, 1.15, .08),
  part(taper, .16, -.34, 1.42, .09, .07, .17, wardGlow, -2, 0, 1.15, .08),
  part(membrane([[.19, -.34, 1.50], [.27, -.34, 1.64], [.21, -.34, 1.56], [.12, -.34, 1.66]]), 0, 0, 0, 1, 1, 1, wardGlow, -2, 0, 1.15),
);

// Cinder Wisp, a fragile ember spirit: a lit core with two dark eyes, six flame tongues rising and streaming back from it in
// two counter-flickering sets (joints 124, 125), and a cinder wisp trailing below. Group 8 breathes. 136 triangles.
const cinderWisp = [
  part(ellipsoid(6, 2), 0, 0, .58, .2, .2, .22, ember, 8, 0, .58, 0, true),
  jointed(part(taper, 0, 0, .32, .075, .075, .14, cinder, 0, 0, .32, Math.PI), 8, 0, .58),
];
for (const side of [-1, 1]) cinderWisp.push(part(membrane([[.185, side * .035, .64], [.17, side * .11, .66], [.18, side * .09, .60]]), 0, 0, 0, 1, 1, 1, char, 8, 0, .58));
for (let i = 0; i < 6; i++) {
  const a = (i + .5) * Math.PI / 3, x = Math.cos(a) * .1, y = Math.sin(a) * .13, h = (i % 3) * .08;
  cinderWisp.push(part(curvedTube([[x, y, .68, .075], [x - .07, y * 1.15, .86 + h * .5, .05], [x - .2, y * .9, 1.0 + h, .008]], 4), 0, 0, 0, 1, 1, 1, i % 2 ? flame : cinder, 124 + (i % 2), 0, .6));
}

// Veil Moth, a drifting predator: a slim body, a dark head (joint 121) with pale eyes and feathered antennae, broad forewings
// and smaller hindwings raised in a shallow V (group ±7, so a pitch sweeps their tips) and two dangling legs. 116 triangles.
const dihedral = .34;
const wingAt = (pts) => pts.map(([x, y, z]) => [x, y * Math.cos(dihedral), z + Math.abs(y) * Math.sin(dihedral)]);
const foreWing = membrane(wingAt([[0, 0, 0], [-.12, .35, .06], [-.34, .66, -.03], [.02, .84, -.12], [.30, .52, -.06], [.24, .15, .03]]));
const hindWing = membrane(wingAt([[-.06, 0, -.04], [-.30, .22, -.10], [-.40, .48, -.18], [-.14, .42, -.12]]));
const mirror = (shape) => shape.map((tri) => tri.map(([x, y, z]) => [x, -y, z]));
const veilMoth = [
  part(ellipsoid(6, 2), .02, 0, .55, .13, .12, .31, moth, 0, .02, .55, 0, true),
  part(ellipsoid(5, 2), .12, 0, .83, .15, .14, .13, mothVein, 121, .06, .76, 0, true),
  part(foreWing, -.06, 0, .66, 1, 1, 1, mothWing, 7, -.06, .66, -.08),
  part(mirror(foreWing), -.06, 0, .66, 1, 1, 1, mothWing, -7, -.06, .66, -.08),
  part(hindWing, -.06, 0, .66, 1, 1, 1, moth, 7, -.06, .66, -.08),
  part(mirror(hindWing), -.06, 0, .66, 1, 1, 1, moth, -7, -.06, .66, -.08),
];
for (const side of [-1, 1]) veilMoth.push(
  part(ellipsoid(4, 1), .235, side * .075, .86, .045, .04, .045, mothEye, 121, .06, .76, 0, true),
  part(membrane([[.2, side * .03, .93], [.27, side * .12, 1.06], [.30, side * .19, 1.13], [.24, side * .14, 1.05]]), 0, 0, 0, 1, 1, 1, mothWing, 121, .06, .76),
  part(curvedTube([[.04, side * .06, .43, .025], [.14, side * .15, .22, .018], [.25, side * .17, .04, .008]], 3), 0, 0, 0, 1, 1, 1, mothVein, side, .04, .43),
);

// Void Sentinel, a floating hunter: an oval shell carrying one large lit eye with a dark slit pupil under a heavy lid, framed
// by seven independently phased tapered tentacles (joints 10-16). 198 triangles.
const voidSentinel = [
  part(ellipsoid(8, 3), 0, 0, .91, .31, .30, .39, voidShell, 0, 0, .91, 0, true),
  part(ellipsoid(6, 2), .24, 0, .95, .085, .19, .17, voidEye, 0, .24, .95, 0, true),
  part(ellipsoid(5, 1), .318, 0, .95, .02, .045, .12, voidDark, 0, .318, .95, 0, true),
];
for (let i = 0; i < 7; i++) {
  const a = (i - 3) * .36, y = Math.sin(a) * .23, x = Math.cos(a) * .10 - .04;
  voidSentinel.push(part(curvedTube([[x, y, .66, .045], [x - .10 - .025 * (i % 2), y * 1.32, .34, .030], [x + .04 * Math.sin(i), y * 1.65, .04, .009]], 4), 0, 0, 0, 1, 1, 1, i % 2 ? voidDark : voidShell, 10 + i, x, .66));
}
voidSentinel.push(part(membrane([[.25, -.2, 1.06], [.30, -.1, 1.15], [.33, .1, 1.15], [.27, .2, 1.06]]), 0, 0, 0, 1, 1, 1, voidDark));

export const CLOSE_VIEW_ARCOLOGY_MODELS = { glassMite, sparkWarden, cinderWisp, veilMoth, voidSentinel };
export const CLOSE_VIEW_ARCOLOGY_KINDS = Object.freeze(Object.keys(CLOSE_VIEW_ARCOLOGY_MODELS));

// Attack joints (close-view-models.ts CREATURE_LIMB_RIGS reads these): radians a joint turns with the root's coil, extension
// and impact bump; `nod`/`flick` give a joint this table owns its rest motion. See CORE_CREATURE_LIMB_RIGS for the conventions.
const limb = (coil, ext, bump = 0, nod = null, flick = 0) => Object.freeze({ coil, ext, bump, own: nod !== null, nod: nod || 0, flick });
const tentacle = (i) => i % 2 ? limb(-.26, .42, -.16) : limb(.36, -.62, .26);
export const CLOSE_VIEW_ARCOLOGY_LIMB_RIGS = Object.freeze({
  // The hop: the legs gather under the shell, then fire out staggered (front legs reach, rear legs drive, the middle pair
  // splays wide for the landing) as the mandibles gape and clamp; the tripod gait alternates on the step beat.
  glassMite: Object.freeze({ groups: Object.freeze({
    131: limb(.34, -.66, .22, .42), 132: limb(.34, -.58, .26, -.42), 133: limb(-.12, .2, .36, -.42), 134: limb(-.12, .2, .36, .42),
    135: limb(-.34, .5, -.12, .42), 136: limb(-.34, .56, -.16, -.42), 121: limb(-.12, .16, .08, .04), 122: limb(-.62, .42, -.18, 0, .05),
  }) }),
  // The bolt: the staff arm draws the staff up and back, then thrusts it level at the target and kicks back as the bolt
  // leaves; the free hand rises to channel, the stance braces and the helm tips into the aim.
  sparkWarden: Object.freeze({ groups: Object.freeze({ '-2': limb(.55, -1.2, .32), 2: limb(-.7, -.25, .12), '-1': limb(-.15, -.28), 1: limb(.15, .28), 121: limb(.12, -.14, .06, .03) }) }),
  // The cast: the flame tongues draw back and gather, then flare forward over the core and gutter on the release.
  cinderWisp: Object.freeze({ groups: Object.freeze({ 124: limb(-.36, .52, -.22, 0, .1), 125: limb(-.26, .62, -.28, 0, -.1) }) }),
  // The cast: the wings rise and sweep back, then clap forward to throw the force; the head lifts, the legs trail.
  veilMoth: Object.freeze({ groups: Object.freeze({ 7: limb(.55, -.75, .3), '-7': limb(.55, -.75, .3), 121: limb(-.18, .22, -.08, .03), 1: limb(.22, -.3), '-1': limb(.22, -.3) }) }),
  // The bolt: alternate tentacles curl in and flare out to frame the eye, then shudder on release.
  voidSentinel: Object.freeze({ groups: Object.freeze(Object.fromEntries(Array.from({ length: 7 }, (_, i) => [10 + i, tentacle(i)]))) }),
});
