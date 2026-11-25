// Five authored Arcology/Hive bodies. These are registry recipes only; presentation metadata controls admission.
// Refinement pass (Tim, 2026-11-14): clearer anatomy at or under each body's earlier triangle count, and the attack joints of
// CLOSE_VIEW_ARCOLOGY_LIMB_RIGS (below) on top of the shared creature root motion (close-view-models.ts creatureRootPose).
import { MESH_FLOATS, prism, taper, ellipsoid, verticalLoft, curvedTube, membrane, part, block } from './close-view-mesh.js?v=r1066-9a693588b64c';

// Palettes are the original renderer's primary, shadow and accent colors.
const glass = 0x607c79, glassDark = 0x283b3b, glassEdge = 0xaab7aa;
const wardPlate = 0x6b6472, wardDark = 0x35313d, wardGlow = 0xc09b58, wardStaff = 0xc09b58;
const cinder = 0xa95d3c, flame = 0xa95d3c, ember = 0xefb15d, char = 0x4b2923;
const moth = 0x786887, mothWing = 0xb8a7cd, mothVein = 0x302c39, mothEye = 0xb8a7cd;
const voidShell = 0x574a6c, voidDark = 0x282333, voidEye = 0xb896cf;

// A part posed by `rest` about its own anchor, then carried by joint `swing` about (px, pz).
function jointed(item, swing, px, pz) {
  const mesh = item.mesh, dx = item.px - px, dz = item.pz - pz;
  for (let i = 0; i < mesh.length; i += MESH_FLOATS) { mesh[i] += dx; mesh[i + 2] += dz; }
  return { mesh, swing, px, pz };
}

// Glass Mite, a low crystal feeder: a flat faceted shell grown into a cluster of three lit crystal spurs, a small dark head
// carrying two lit mandibles (joint 30), and six splayed, high-kneed legs, each on its own joint (70-75: front, middle, rear;
// left, right) so the hop staggers them. 166 triangles (2026-11-15 forms pass: the legs give up a side each to the spurs).
const glassMite = [
  part(ellipsoid(6, 2), -.05, 0, .30, .33, .29, .17, glass, 0, -.05, .30, 0, false),
  part(taper, -.12, 0, .45, .07, .06, .13, glassEdge, 0, -.12, .45, -.35),
  part(ellipsoid(5, 1), .25, 0, .28, .1, .13, .085, glassDark, 82, .2, .3, 0, true),
  jointed(part(taper, .38, -.075, .28, .035, .03, .11, glassEdge, 0, .38, .28, 1.3), 30, .3, .29),
  jointed(part(taper, .38, .075, .28, .035, .03, .11, glassEdge, 0, .38, .28, 1.3), 30, .3, .29),
  part(taper, -.25, -.1, .41, .05, .045, .095, glassEdge, 0, -.25, .41, -.75),
  part(taper, -.21, .12, .40, .045, .04, .08, glass, 0, -.21, .40, -.55),
];
for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
  const x = .15 - i * .19, reach = (1 - i) * .15, y = side * (.19 + i * .012);
  glassMite.push(part(curvedTube([[x, y, .29, .045], [x + reach * .35, side * .41, .43, .034], [x + reach, side * .6, .03, .01]], 3), 0, 0, 0, 1, 1, 1, i === 1 ? glassDark : glass, 70 + i * 2 + (side > 0 ? 1 : 0), x, .29));
}

// Spark Warden, a walking conductor in plate: a tapered cuirass with one lit core bar, round pauldrons, a broad dark helm
// with a lit visor slit (joint 82), an insulator coil on the back, jointed arms and legs, and a staff ending in a lit tip
// and the fork that throws the bolts. 184 triangles.
const sparkWarden = [
  part(verticalLoft([[0, .17, .6], [.015, .245, .97], [-.01, .2, 1.2]], 6), 0, 0, 0, .78, 1.1, 1, wardPlate),
  part(ellipsoid(6, 2), .05, 0, 1.37, .21, .25, .16, wardDark, 82, .02, 1.24, 0, true),
  part(membrane([[.255, -.15, 1.395], [.255, .15, 1.395], [.25, .13, 1.35], [.25, -.13, 1.35]]), 0, 0, 0, 1, 1, 1, wardGlow, 82, .02, 1.24),
  part(membrane([[.19, -.12, .93], [.19, .12, .93], [.185, .1, .86], [.185, -.1, .86]]), 0, 0, 0, 1, 1, 1, wardGlow),
  part(prism(5), -.21, 0, 1.0, .07, .07, .25, wardDark),
];
for (const side of [-1, 1]) sparkWarden.push(
  part(ellipsoid(5, 1), .0, side * .27, 1.17, .12, .11, .08, wardPlate, 0, 0, 1.17, 0, true),
  part(curvedTube([[0, side * .27, 1.14, .066], [.07, side * .33, .9, .056], [.14, side * .33, .74, .05]], 4), 0, 0, 0, 1, 1, 1, side < 0 ? wardPlate : wardDark, side * 2, 0, 1.15),
  part(curvedTube([[0, side * .11, .64, .088], [.05, side * .13, .34, .07], [.01, side * .13, .04, .062]], 4), 0, 0, 0, 1, 1, 1, wardDark, side, 0, .64),
);
sparkWarden.push(
  block(.15, -.36, .73, .025, .025, .68, wardStaff, -2, 0, 1.15, .08),
  part(taper, .19, -.36, 1.46, .085, .07, .11, wardGlow, -2, 0, 1.15, .08),
  part(membrane([[.21, -.36, 1.5], [.29, -.36, 1.59], [.23, -.36, 1.54], [.13, -.36, 1.595]]), 0, 0, 0, 1, 1, 1, wardGlow, -2, 0, 1.15),
);

// Cinder Wisp, a fragile ember spirit: a lit core under a cracked coal crust and fin (lifted with the outer flames), two
// slanted dark eyes, six flame tongues (a tall inner pair and a long streaming rear pair on 124, a flaring outer pair on 125)
// that rise and stream back like a comet's head, a cinder tail trailing below and three loose sparks. Group 8 breathes.
// 136 triangles.
const cinderWisp = [
  part(ellipsoid(6, 2), 0, 0, .58, .17, .17, .19, ember, 8, 0, .58, 0, true),
  jointed(part(ellipsoid(5, 1), -.09, 0, .66, .14, .16, .09, char, 0, -.09, .66, -.42, true), 125, 0, .6),
  part(membrane([[-.08, 0, .74], [-.26, 0, .84], [-.18, 0, .7]]), 0, 0, 0, 1, 1, 1, char, 125, 0, .6),
  part(curvedTube([[0, 0, .44, .07], [-.04, 0, .3, .045], [-.1, 0, .18, .025], [-.2, 0, .08, .004]], 3), 0, 0, 0, 1, 1, 1, cinder, 8, 0, .58),
];
for (const [x, y, z] of [[.31, .16, .78], [.24, -.2, .9], [-.36, .1, 1.0]]) cinderWisp.push(part(membrane([[x, y, z], [x - .01, y + .035, z + .02], [x + .02, y + .03, z - .03]]), 0, 0, 0, 1, 1, 1, 0xf3a55c, 124, 0, .6));
for (const side of [-1, 1]) cinderWisp.push(part(membrane([[.168, side * .025, .62], [.15, side * .115, .66], [.163, side * .1, .595]]), 0, 0, 0, 1, 1, 1, char, 8, 0, .58));
for (const [y, kind] of [[-.05, 0], [.05, 0], [-.12, 1], [.12, 1], [-.07, 2], [.07, 2]]) cinderWisp.push(part(curvedTube(
  kind === 0 ? [[.04, y, .7, .075], [.0, y * 1.2, .92, .045], [-.12, y * .6, 1.1, .006]]
  : kind === 1 ? [[0, y, .64, .06], [-.08, y * 1.5, .8, .036], [-.2, y * 1.65, .92, .005]]
  : [[-.08, y, .66, .07], [-.24, y * 1.3, .76, .04], [-.46, y * .8, .78, .005]], 3), 0, 0, 0, 1, 1, 1, kind === 1 ? cinder : ember, kind === 1 ? 125 : 124, 0, .6));

// Veil Moth, a drifting predator: a furred thorax with a pale ruff, an abdomen hanging back from it (6), a dark head
// (joint 82) with two lit lilac eyes and feathered antennae, broad forewings carrying lit eyespots and smaller hindwings raised
// in a steep V (group ±7, so a pitch sweeps their tips), and two short dangling legs. 116 triangles.
const dihedral = .5;
const wingAt = (pts) => pts.map(([x, y, z]) => [x, y * Math.cos(dihedral), z + Math.abs(y) * Math.sin(dihedral)]);
const foreWing = membrane(wingAt([[0, 0, 0], [-.1, .36, .07], [-.32, .7, -.02], [.0, .9, -.12], [.3, .56, -.07], [.22, .15, .02]]));
const hindWing = membrane(wingAt([[-.06, 0, -.04], [-.3, .22, -.12], [-.42, .5, -.2], [-.14, .42, -.13]]));
const eyeSpot = membrane(wingAt([[.03, .5, -.035], [-.1, .6, -.04], [.04, .66, -.065]]).map(([x, y, z]) => [x, y + .006, z + .012]));
const mirror = (shape) => shape.map((tri) => tri.map(([x, y, z]) => [x, -y, z]));
const veilMoth = [
  part(ellipsoid(6, 2), .03, 0, .7, .12, .115, .14, moth, 0, .03, .7, 0, true),
  jointed(part(ellipsoid(5, 2), -.11, 0, .5, .085, .08, .2, moth, 0, -.11, .5, .55, true), 6, -.01, .62),
  part(ellipsoid(5, 1), .16, 0, .82, .075, .08, .07, mothVein, 82, .08, .76, 0, true),
  part(membrane([[.13, 0, .72], [.12, -.14, .74], [.17, -.09, .66], [.17, .09, .66], [.12, .14, .74]]), 0, 0, 0, 1, 1, 1, mothWing),
  part(foreWing, -.04, 0, .7, 1, 1, 1, mothWing, 7, -.04, .7, -.1),
  part(mirror(foreWing), -.04, 0, .7, 1, 1, 1, mothWing, -7, -.04, .7, -.1),
  part(hindWing, -.06, 0, .68, 1, 1, 1, moth, 7, -.04, .7, -.1),
  part(mirror(hindWing), -.06, 0, .68, 1, 1, 1, moth, -7, -.04, .7, -.1),
  part(eyeSpot, -.04, 0, .7, 1, 1, 1, voidEye, 7, -.04, .7, -.1),
  part(mirror(eyeSpot), -.04, 0, .7, 1, 1, 1, voidEye, -7, -.04, .7, -.1),
];
for (const side of [-1, 1]) veilMoth.push(
  part(membrane([[.225, side * .035, .85], [.215, side * .085, .855], [.2, side * .08, .8], [.22, side * .03, .81]]), 0, 0, 0, 1, 1, 1, voidEye, 82, .08, .76),
  part(membrane([[.19, side * .03, .88], [.27, side * .14, 1.0], [.29, side * .22, 1.08], [.23, side * .12, .99]]), 0, 0, 0, 1, 1, 1, mothWing, 82, .08, .76),
  part(curvedTube([[.07, side * .06, .6, .022], [.15, side * .12, .4, .008]], 3), 0, 0, 0, 1, 1, 1, mothVein, side, .07, .6),
);

// Void Sentinel, a floating hunter: an oval shell with a dorsal crest carrying one large lit eye with a dark slit pupil
// between a heavy upper lid (joint 82, which narrows and widens it) and a fixed lower lid, framed by seven independently
// phased, curling tapered tentacles (joints 10-16). 198 triangles.
const voidSentinel = [
  part(ellipsoid(7, 3), 0, 0, .9, .3, .3, .38, voidShell, 0, 0, .9, 0, true),
  part(ellipsoid(6, 2), .245, 0, .95, .09, .19, .18, voidEye, 0, .245, .95, 0, true),
  part(ellipsoid(5, 1), .325, 0, .95, .02, .045, .13, voidDark, 0, .325, .95, 0, true),
];
for (let i = 0; i < 7; i++) {
  const a = (i - 3) * .36, y = Math.sin(a) * .23, x = Math.cos(a) * .10 - .04;
  voidSentinel.push(part(curvedTube([[x, y, .66, .045], [x - .13 - .03 * (i % 2), y * 1.45, .36, .03], [x + .07 + .03 * Math.sin(i), y * 1.7, .04, .008]], 4), 0, 0, 0, 1, 1, 1, i % 2 ? voidDark : voidShell, 10 + i, x, .66));
}
voidSentinel.push(
  part(membrane([[.25, -.2, 1.07], [.33, -.08, 1.15], [.33, .08, 1.15], [.25, .2, 1.07]]), 0, 0, 0, 1, 1, 1, voidDark, 82, .2, .95),
  part(membrane([[.27, -.18, .82], [.33, -.07, .78], [.33, .07, .78], [.27, .18, .82]]), 0, 0, 0, 1, 1, 1, voidDark),
  part(membrane([[-.06, 0, 1.25], [-.3, 0, 1.08], [-.12, 0, 1.3]]), 0, 0, 0, 1, 1, 1, voidDark),
);

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
const sentinelTentacle = (i) => i % 2 ? J(-.3, .5, .2, .05 + .05 * Math.abs(i - 3)) : J(.42, -.78, -.22, .05 * Math.abs(i - 3));
export const CORE_JOINT_POSE = Object.freeze({
  // Ashling: the Lunge is a one-claw jab (the lead claw cocks back by the hip, the off claw guards, the head ducks in behind
  // it); the Long Reach is a two-claw overhead rake (both arms rear up over the crown spikes, the head tips back, then both
  // claws rake down in front and carry past).
  ashling: Object.freeze({
    lunge: Object.freeze({ [-2]: J(1.1, -1.9, .3), 2: J(-.45, .6, -.15, .15), [-1]: J(-.3, -.5), 1: J(.35, .55), 82: J(.25, -.45, .15) }),
    longReach: Object.freeze({ [-2]: J(-2.45, -.55, .5), 2: J(-2.35, -.45, .45, .1), [-1]: J(-.15, -.35), 1: J(.2, .4), 82: J(-.4, .5, .14) }),
    '*': Object.freeze({ [-2]: J(1.0, -1.75, .25), 2: J(-.35, .55, -.1, .15), [-1]: J(-.25, -.45), 1: J(.3, .5), 82: J(.18, -.38, .12) }) }),
  // The Heavy Slam: both arms rise overhead in the windup and hammer down in front, stopping short of the floor so the root's
  // lean no longer pitches the body past it (the old strike swing stacked on that lean); the head looks up, then ducks in.
  rootBrute: Object.freeze({ '*': Object.freeze({ [-2]: J(-2.55, -.62, .32), 2: J(-2.55, -.62, .32, .06), [-1]: J(-.2, -.28), 1: J(.25, .34), 82: J(-.3, .22, .12) }) }),
  // Hollow Marshal: the halberd (33) turns about the fist and the halberd arm (32) about the shoulder, so the blade can be
  // stood up, levelled, dropped low or swung back over the helm while the fist stays on the haft.
  hollowMarshal: Object.freeze({
    // The Long Reach thrust: the halberd (33, about the fist) stands upright, then levels point first as the arm (32) punches.
    longReach: Object.freeze({ 33: J(-.35, 1.0, -.1), 32: J(.2, -.25, .05), 2: J(-.3, .42, -.1), 3: J(-.18, .38, .16, .3), [-1]: J(-.15, -.42), 1: J(.2, .48), 82: J(-.12, .16, .06) }),
    // The Lunge is a rising reap: the blade drops forward and low, the stance splits deep, then it sweeps up through the foe.
    lunge: Object.freeze({ 33: J(1.25, .1, -.4), 32: J(.15, -.3, .05), 2: J(.35, -.5, .12), 3: J(-.25, .45, .18, .3), [-1]: J(-.35, -.55), 1: J(.3, .55), 82: J(.15, -.22, .08) }),
    // The Slam is an overhead chop: the halberd swings back over the helm (the helm tips up to follow it), then it is brought
    // down in front, stopping short of the floor; the cape flies up behind and the lead foot stamps.
    slam: Object.freeze({ 33: J(-1.45, 1.65, .15), 32: J(-.22, .14, .05), 2: J(-.45, .35, -.1), 3: J(-.3, .55, .2, .3), [-1]: J(-.2, -.5), 1: J(.25, .4), 82: J(-.32, .36, .1) }),
    '*': Object.freeze({ 33: J(-.35, 1.0, -.1), 32: J(.2, -.25, .05), 2: J(-.35, .45, -.1), 3: J(-.18, .38, .16, .3), [-1]: J(-.15, -.42), 1: J(.2, .48), 82: J(-.12, .14, .06) }) }),
  // Ashen Hound.
  ashenHound: Object.freeze({
    // The Zigzag is a slashing rake: the head drops to stalk, the lead foreleg cocks and rakes up and across, the other follows
    // a beat later, and the jaw snaps once the paw has landed.
    zigzag: Object.freeze({ 2: J(.35, -1.25, .4), [-2]: J(.2, -.55, .22, .18), 1: J(-.35, .55, -.15), [-1]: J(-.35, .55, -.15, .12), 6: J(-.3, .32, -.25, .3), 82: J(.38, -.22, .16), 30: J(.5, -.04, .3, .2) }),
    // The Lunge is a pounce and bite: both forelegs tuck, the hind legs load, the jaw gapes wide with the head low, then the
    // whole hound drives up and the jaw slams shut on contact.
    lunge: Object.freeze({ 2: J(.55, -.95, .3), [-2]: J(.55, -.95, .3, .05), 1: J(-.5, .78, -.25), [-1]: J(-.5, .78, -.25, .06), 6: J(-.35, .38, -.3, .35), 82: J(.45, -.45, .2), 30: J(.75, -.04, .32) }),
    '*': Object.freeze({ 2: J(.32, -1.0, .35), [-2]: J(.32, -.78, .3, .1), 1: J(-.38, .62, -.2), [-1]: J(-.38, .62, -.2, .1), 6: J(-.3, .5, -.22, .3), 82: J(.28, -.2, .14), 30: J(.55, -.04, .3) }) }),
  // Coil Stalker: the head, hood and neck (82) and the jaw (83) turn about the neck's root, so the whole column strikes. The Long Reach rears
  // the column back with the jaw agape and drives it forward and down as the jaw snaps; the Lunge drops the head low to stalk,
  // then springs it up and out. The two trailing coils (4, 5) bunch and whip after it, the second later and wider.
  coilStalker: Object.freeze({
    longReach: Object.freeze({ 82: J(-.55, .12, -.22), 83: J(-.12, .12, -.1), 4: J(.3, -.4, .18, .2), 5: J(.45, -.65, .3, .4) }),
    lunge: Object.freeze({ 82: J(.3, -.08, -.2), 83: J(.76, -.06, -.08), 4: J(-.35, .5, -.2, .15), 5: J(-.5, .7, -.25, .3) }),
    '*': Object.freeze({ 82: J(-.55, .12, -.22), 83: J(-.12, .12, -.1), 4: J(.3, -.4, .18, .2), 5: J(.45, -.6, .3, .4) }) }),
  // The legacy bite: forelegs tuck and strike out staggered, hind legs load and drive, the head rears then bites down while
  // the jaw gapes and snaps.
  // The Leap Slam rears the forequarters: the forelegs lift high and splay, the hind legs crouch to spring, then the forelegs
  // and the eyeless head come down together as the jaw gapes.
  pallidCrawler: Object.freeze({ bite: crawlerBite, leapSlam: Object.freeze({ [-2]: J(-.85, .55, -.25), 2: J(-.85, .55, -.25, .08), [-1]: J(.4, -.55, .2), 1: J(.4, -.55, .2, .1), 30: J(-.4, .45, -.12), 31: J(.55, .35, .2) }) }),
  // Glass Mite. The hop: the legs gather under the shell, then fire out staggered (front legs reach, rear legs drive, the middle pair
  // splays for the landing) as the mandibles gape and clamp.
  glassMite: Object.freeze({
    hop: Object.freeze({ 70: J(.34, -.66, .22), 71: J(.34, -.58, .26, .08), 72: J(-.12, .2, .3, .16), 73: J(-.12, .2, .3, .2), 74: J(-.34, .42, -.12, .28), 75: J(-.34, .46, -.16, .32), 82: J(-.12, .16, .08), 30: J(-.62, .42, -.18) }),
    // The Long Reach is a planted mandible stab: the front legs brace forward, the rear legs push, the head draws back with the
    // mandibles spread, then darts out as they clamp.
    longReach: Object.freeze({ 70: J(-.25, .3, -.1), 71: J(-.25, .3, -.1, .06), 72: J(.1, -.12), 73: J(.1, -.12), 74: J(.22, -.34, .1, .15), 75: J(.22, -.34, .1, .2), 82: J(.38, -.62, .16), 30: J(-.95, .7, -.25) }),
    '*': Object.freeze({ 70: J(.34, -.66, .22), 71: J(.34, -.58, .26, .08), 72: J(-.12, .2, .36, .16), 73: J(-.12, .2, .36, .2), 74: J(-.34, .5, -.12, .28), 75: J(-.34, .56, -.16, .32), 82: J(-.12, .16, .08), 30: J(-.62, .42, -.18) }) }),
  // The bolt: the staff arm draws the staff up and back, thrusts it level at the target and kicks back as the bolt leaves; the
  // free hand rises to channel, the stance braces and the helm tips into the aim.
  sparkWarden: Object.freeze({ '*': Object.freeze({ [-2]: J(-.55, 1.2, -.3), 2: J(-.85, -.35, .2, .1), [-1]: J(-.22, -.34), 1: J(.2, .36), 82: J(-.16, .2, .1) }) }),
  // The cast: the flame tongues draw back and gather, then flare forward over the core and gutter on the release.
  cinderWisp: Object.freeze({ '*': Object.freeze({ 124: J(-.55, .85, .25), 125: J(-.42, .62, .32, .15), 8: J(-.22, .38, .16, .05) }) }),
  // The cast: the wings rise and sweep back, then clap forward to throw the force; the head lifts and the legs trail.
  veilMoth: Object.freeze({ '*': Object.freeze({ 7: J(-.5, .5, .24), [-7]: J(-.5, .5, .24, .06), 6: J(.3, -.62, -.22, .12), 82: J(-.22, .26, .1), 1: J(.22, -.34, 0, .3), [-1]: J(.22, -.34, 0, .35) }) }),
  // The bolt: alternate tentacles curl in and flare out to frame the eye, rippling outward from the centre, then shudder.
  voidSentinel: Object.freeze({ '*': Object.freeze({ ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => [10 + i, sentinelTentacle(i)])), 82: J(.32, -.36, -.12) }) }),
});

