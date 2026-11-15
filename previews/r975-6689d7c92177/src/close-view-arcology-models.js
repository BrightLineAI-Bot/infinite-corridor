// Five authored Arcology/Hive bodies. These are registry recipes only; presentation metadata controls admission.
// Refinement pass (Tim, 2026-11-14): clearer anatomy at or under each body's earlier triangle count, and the attack joints of
// CLOSE_VIEW_ARCOLOGY_LIMB_RIGS (below) on top of the shared creature root motion (close-view-models.ts creatureRootPose).
import { MESH_FLOATS, bevel, prism, taper, ellipsoid, curvedTube, membrane, part, block } from './close-view-mesh.js?v=r975-6689d7c92177';

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
// mandibles (joint 30), and six splayed, high-kneed legs, each on its own joint (70-75: front, middle, rear; left, right)
// so the hop staggers them. 166 triangles.
const glassMite = [
  part(ellipsoid(6, 2), -.05, 0, .30, .33, .29, .17, glass, 0, -.05, .30, 0, false),
  part(taper, -.12, 0, .45, .07, .06, .13, glassEdge, 0, -.12, .45, -.35),
  part(ellipsoid(5, 1), .25, 0, .28, .1, .13, .085, glassDark, 82, .2, .3, 0, true),
  jointed(part(taper, .38, -.075, .28, .035, .03, .11, glassEdge, 0, .38, .28, 1.3), 30, .3, .29),
  jointed(part(taper, .38, .075, .28, .035, .03, .11, glassEdge, 0, .38, .28, 1.3), 30, .3, .29),
];
for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
  const x = .15 - i * .19, reach = (1 - i) * .14, y = side * (.19 + i * .012);
  glassMite.push(part(curvedTube([[x, y, .29, .045], [x + reach * .4, side * .40, .40, .035], [x + reach, side * .58, .03, .012]], 4), 0, 0, 0, 1, 1, 1, i === 1 ? glassDark : glass, 70 + i * 2 + (side > 0 ? 1 : 0), x, .29));
}

// Spark Warden, a walking conductor: plate armour, a broad dark helm with a lit visor slit (joint 82), three lit chest bars,
// an insulator stack on the back, and a staff ending in a lit tip and a fork that throws the bolts. 184 triangles.
const sparkWarden = [
  part(bevel, 0, 0, .86, .19, .25, .44, wardPlate),
  part(ellipsoid(6, 2), .06, 0, 1.36, .30, .31, .20, wardDark, 82, .02, 1.26, 0, true),
  part(membrane([[.33, -.17, 1.38], [.33, .17, 1.38], [.335, .15, 1.335], [.335, -.15, 1.335]]), 0, 0, 0, 1, 1, 1, wardGlow, 82, .02, 1.26),
  part(prism(5), -.2, 0, .98, .07, .07, .26, wardDark),
];
for (const side of [-1, 1]) sparkWarden.push(
  part(bevel, -.01, side * .18, .35, .10, .09, .34, wardDark, side, 0, .68),
  part(bevel, .02, side * .31, .91, .075, .085, .29, wardPlate, side * 2, 0, 1.15, side < 0 ? -.12 : .12),
);
for (const z of [.72, .87, 1.02]) sparkWarden.push(part(membrane([[.198, -.14, z + .027], [.198, .14, z + .027], [.198, .14, z - .027], [.198, -.14, z - .027]]), 0, 0, 0, 1, 1, 1, wardGlow));
sparkWarden.push(
  block(.11, -.34, .72, .027, .027, .69, wardStaff, -2, 0, 1.15, .08),
  part(taper, .16, -.34, 1.42, .09, .07, .14, wardGlow, -2, 0, 1.15, .08),
  part(membrane([[.19, -.34, 1.47], [.27, -.34, 1.57], [.21, -.34, 1.51], [.12, -.34, 1.575]]), 0, 0, 0, 1, 1, 1, wardGlow, -2, 0, 1.15),
);

// Cinder Wisp, a fragile ember spirit: a lit core with two dark eyes, six flame tongues rising and streaming back from it in
// two counter-flickering sets (joints 124, 125), and a cinder wisp trailing below. Group 8 breathes. 136 triangles.
const cinderWisp = [
  part(ellipsoid(6, 2), 0, 0, .58, .2, .2, .22, ember, 8, 0, .58, 0, true),
  jointed(part(taper, 0, 0, .32, .075, .075, .14, cinder, 0, 0, .32, Math.PI), 8, 0, .58),
];
for (const side of [-1, 1]) cinderWisp.push(part(membrane([[.185, side * .035, .64], [.17, side * .11, .66], [.18, side * .09, .60]]), 0, 0, 0, 1, 1, 1, char, 8, 0, .58));
for (let i = 0; i < 6; i++) {
  const a = (i + .5) * Math.PI / 3, x = Math.cos(a) * .12, y = Math.sin(a) * .14, h = (i % 3) * .06;
  cinderWisp.push(part(curvedTube([[x, y, .66, .09], [x - .09, y * 1.1, .84 + h * .5, .06], [x - .24, y * .75, .96 + h, .008]], 4), 0, 0, 0, 1, 1, 1, i % 2 ? cinder : ember, 124 + (i % 2), 0, .6));
}

// Veil Moth, a drifting predator: a slim body, a dark head (joint 82) with pale eyes and feathered antennae, broad forewings
// and smaller hindwings raised in a shallow V (group ±7, so a pitch sweeps their tips) and two dangling legs. 116 triangles.
const dihedral = .34;
const wingAt = (pts) => pts.map(([x, y, z]) => [x, y * Math.cos(dihedral), z + Math.abs(y) * Math.sin(dihedral)]);
const foreWing = membrane(wingAt([[0, 0, 0], [-.12, .35, .06], [-.34, .66, -.03], [.02, .84, -.12], [.30, .52, -.06], [.24, .15, .03]]));
const hindWing = membrane(wingAt([[-.06, 0, -.04], [-.30, .22, -.10], [-.40, .48, -.18], [-.14, .42, -.12]]));
const mirror = (shape) => shape.map((tri) => tri.map(([x, y, z]) => [x, -y, z]));
const veilMoth = [
  part(ellipsoid(6, 2), .02, 0, .55, .13, .12, .31, moth, 0, .02, .55, 0, true),
  part(ellipsoid(5, 2), .12, 0, .83, .15, .14, .13, mothVein, 82, .06, .76, 0, true),
  part(foreWing, -.06, 0, .66, 1, 1, 1, mothWing, 7, -.06, .66, -.08),
  part(mirror(foreWing), -.06, 0, .66, 1, 1, 1, mothWing, -7, -.06, .66, -.08),
  part(hindWing, -.06, 0, .66, 1, 1, 1, moth, 7, -.06, .66, -.08),
  part(mirror(hindWing), -.06, 0, .66, 1, 1, 1, moth, -7, -.06, .66, -.08),
];
for (const side of [-1, 1]) veilMoth.push(
  part(ellipsoid(4, 1), .235, side * .075, .86, .045, .04, .045, mothEye, 82, .06, .76, 0, true),
  part(membrane([[.2, side * .03, .93], [.27, side * .12, 1.06], [.30, side * .19, 1.13], [.24, side * .14, 1.05]]), 0, 0, 0, 1, 1, 1, mothWing, 82, .06, .76),
  part(curvedTube([[.04, side * .06, .43, .025], [.14, side * .15, .22, .018], [.25, side * .17, .04, .008]], 3), 0, 0, 0, 1, 1, 1, mothVein, side, .04, .43),
);

// Void Sentinel, a floating hunter: an oval shell carrying one large lit eye with a dark slit pupil under a heavy lid, framed
// by seven independently phased tapered tentacles (joints 10-16). 198 triangles.
const voidSentinel = [
  part(ellipsoid(8, 3), 0, 0, .91, .31, .30, .39, voidShell, 0, 0, .91, 0, true),
  part(ellipsoid(6, 2), .245, 0, .94, .09, .2, .19, voidEye, 0, .245, .94, 0, true),
  part(ellipsoid(5, 1), .325, 0, .94, .02, .05, .13, voidDark, 0, .325, .94, 0, true),
];
for (let i = 0; i < 7; i++) {
  const a = (i - 3) * .36, y = Math.sin(a) * .23, x = Math.cos(a) * .10 - .04;
  voidSentinel.push(part(curvedTube([[x, y, .66, .045], [x - .10 - .025 * (i % 2), y * 1.32, .34, .030], [x + .04 * Math.sin(i), y * 1.65, .04, .009]], 4), 0, 0, 0, 1, 1, 1, i % 2 ? voidDark : voidShell, 10 + i, x, .66));
}
voidSentinel.push(part(membrane([[.25, -.21, 1.05], [.31, -.1, 1.12], [.31, .1, 1.12], [.25, .21, 1.05]]), 0, 0, 0, 1, 1, 1, voidDark));

export const CLOSE_VIEW_ARCOLOGY_MODELS = { glassMite, sparkWarden, cinderWisp, veilMoth, voidSentinel };
export const CLOSE_VIEW_ARCOLOGY_KINDS = Object.freeze(Object.keys(CLOSE_VIEW_ARCOLOGY_MODELS));

// Attack joints for the eleven core and Arcology creatures, merged into close-view-adventure-models.ts ADVENTURE_JOINT_POSE and
// driven by its adventureJointPose on the shared root pose (J(coil, strike, follow, lag), radians: positive dips a part ahead of
// its pivot and swings a hanging part back; `lag` holds a joint behind the body). Ordinary creatures key '*' (any of their melee
// patterns or their bolt); the Pallid Crawler keys its legacy bite and leap. Joints: ±1 legs, ±2 arms or forelegs, 3 cape,
// 4/5 coil segments, 6 tail, 7 wings, 10-16 tentacles, 30/31 jaw (and the Crawler's head), 70-75 Mite legs, 82 head, 124/125
// flame tongues. Purely visual; the hit geometry never reads these.
const J = (coil, strike, follow = 0, lag = 0) => Object.freeze([coil, strike, follow, lag]);
const crawlerBite = Object.freeze({ [-2]: J(.3, -.82, .3), 2: J(.36, -.56, .34, .12), [-1]: J(-.36, .46, -.16, .1), 1: J(-.3, .4, -.12, .2), 30: J(-.22, .32, -.1), 31: J(.72, -.05, .3) });
const sentinelTentacle = (i) => i % 2 ? J(-.26, .42, -.16, .06 * Math.abs(i - 3)) : J(.36, -.62, .26, .06 * Math.abs(i - 3));
export const CORE_JOINT_POSE = Object.freeze({
  // A short clawed lunge: the lead claw draws back and thrusts, the off arm guards, the stance splits and the head snaps in.
  ashling: Object.freeze({ '*': Object.freeze({ [-2]: J(1.0, -1.75, .25), 2: J(-.35, .55, -.1, .15), [-1]: J(-.25, -.45), 1: J(.3, .5), 82: J(.18, -.38, .12) }) }),
  // The Heavy Slam: both arms rise overhead in the windup and hammer down in front, stopping short of the floor so the root's
  // lean no longer pitches the body past it (the old strike swing stacked on that lean); the head looks up, then ducks in.
  rootBrute: Object.freeze({ '*': Object.freeze({ [-2]: J(-2.55, -.62, .32), 2: J(-2.55, -.62, .32, .06), [-1]: J(-.2, -.28), 1: J(.25, .34), 82: J(-.3, .22, .12) }) }),
  // The Long Reach pole thrust: the halberd arm lifts the blade upright, then levels it point first; the cape streams back, the
  // free arm draws back and the helm dips behind the point.
  hollowMarshal: Object.freeze({ '*': Object.freeze({ [-2]: J(-.32, .95, -.16), 2: J(-.35, .45, -.1), 3: J(-.18, .38, .16, .3), [-1]: J(-.15, -.42), 1: J(.2, .48), 82: J(-.12, .14, .06) }) }),
  // The Zigzag Assault: the hind legs load under the body and drive, the forequarters lift and both forelegs reach (the lead one
  // further), the head drops to stalk then snaps forward as the jaw gapes and slams shut; the tail counterbalances.
  ashenHound: Object.freeze({ '*': Object.freeze({ 2: J(.32, -1.0, .35), [-2]: J(.32, -.78, .3, .1), 1: J(-.38, .62, -.2), [-1]: J(-.38, .62, -.2, .1), 6: J(-.3, .5, -.22, .3), 82: J(.28, -.2, .14), 30: J(.55, -.04, .3) }) }),
  // The serpent strike: the head rears back with the jaw open, drives down and forward as the jaw snaps; the two trailing
  // segments coil and whip after it, the second later and wider.
  coilStalker: Object.freeze({ '*': Object.freeze({ 82: J(-.42, .48, -.12), 30: J(.62, -.05, .22), 4: J(.26, -.34, .16, .2), 5: J(.42, -.6, .3, .4) }) }),
  // The legacy bite and leap: forelegs tuck and strike out staggered, hind legs load and drive, the head rears then bites down
  // while the jaw gapes and snaps.
  pallidCrawler: Object.freeze({ bite: crawlerBite, leapSlam: crawlerBite }),
  // The hop: the legs gather under the shell, then fire out staggered (front legs reach, rear legs drive, the middle pair
  // splays for the landing) as the mandibles gape and clamp.
  glassMite: Object.freeze({ '*': Object.freeze({ 70: J(.34, -.66, .22), 71: J(.34, -.58, .26, .08), 72: J(-.12, .2, .36, .16), 73: J(-.12, .2, .36, .2), 74: J(-.34, .5, -.12, .28), 75: J(-.34, .56, -.16, .32), 82: J(-.12, .16, .08), 30: J(-.62, .42, -.18) }) }),
  // The bolt: the staff arm draws the staff up and back, thrusts it level at the target and kicks back as the bolt leaves; the
  // free hand rises to channel, the stance braces and the helm tips into the aim.
  sparkWarden: Object.freeze({ '*': Object.freeze({ [-2]: J(-.4, 1.15, -.28), 2: J(-.7, -.25, .12), [-1]: J(-.15, -.28), 1: J(.15, .28), 82: J(.12, -.14, .06) }) }),
  // The cast: the flame tongues draw back and gather, then flare forward over the core and gutter on the release.
  cinderWisp: Object.freeze({ '*': Object.freeze({ 124: J(-.36, .52, -.22), 125: J(-.26, .62, -.28, .15) }) }),
  // The cast: the wings rise and sweep back, then clap forward to throw the force; the head lifts and the legs trail.
  veilMoth: Object.freeze({ '*': Object.freeze({ 7: J(.55, -.75, .3), [-7]: J(.55, -.75, .3), 82: J(-.18, .22, -.08), 1: J(.22, -.3, 0, .3), [-1]: J(.22, -.3, 0, .3) }) }),
  // The bolt: alternate tentacles curl in and flare out to frame the eye, rippling outward from the centre, then shudder.
  voidSentinel: Object.freeze({ '*': Object.freeze(Object.fromEntries(Array.from({ length: 7 }, (_, i) => [10 + i, sentinelTentacle(i)]))) }),
});

