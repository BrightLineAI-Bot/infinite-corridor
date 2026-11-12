// Five authored Arcology/Hive bodies. These are registry recipes only; presentation metadata controls admission.
import { bevel, taper, ellipsoid, curvedTube, membrane, part, block } from './close-view-mesh.js?v=r910-8a0a850f5b5a';

// Palettes are the original renderer's primary, shadow and accent colors.
const glass = 0x607c79, glassDark = 0x283b3b, glassEdge = 0xaab7aa;
const wardPlate = 0x6b6472, wardDark = 0x35313d, wardGlow = 0xc09b58, wardStaff = 0xc09b58;
const cinder = 0xa95d3c, flame = 0xa95d3c, ember = 0xefb15d, char = 0x4b2923;
const moth = 0x786887, mothWing = 0xb8a7cd, mothVein = 0x302c39, mothEye = 0xb8a7cd;
const voidShell = 0x645375, voidDark = 0x282333, voidEye = 0xb896cf, voidCore = 0x645375;

// A low faceted shell and six pointed, articulated legs keep the mite recognisable at floor height.
const glassMite = [
  part(ellipsoid(8, 3), -.04, 0, .31, .34, .27, .22, glass, 0, -.04, .31, 0, false),
  part(taper, .30, -.11, .31, .15, .045, .08, glassEdge, 0, .30, .31, -.8),
  part(taper, .30, .11, .31, .15, .045, .08, glassEdge, 0, .30, .31, -.8),
];
for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
  const x = .16 - i * .20, y = side * (.19 + i * .012), swing = side * (i === 1 ? 2 : 1);
  glassMite.push(part(curvedTube([[x, y, .30, .045], [x + .04, side * .38, .18, .035], [x + .16, side * .52, .035, .012]], 4), 0, 0, 0, 1, 1, 1, i === 1 ? glassDark : glass, swing, x, .30));
}

// Grounded narrow armour, a broad head, a staff and three luminous chest bars.
const sparkWarden = [
  part(bevel, 0, 0, .86, .19, .25, .44, wardPlate),
  part(ellipsoid(6, 2), .06, 0, 1.36, .30, .31, .20, wardDark, 0, .06, 1.36, 0, true),
  block(.27, 0, 1.36, .035, .18, .045, wardGlow),
];
for (const side of [-1, 1]) sparkWarden.push(
  part(bevel, -.01, side * .18, .35, .10, .09, .34, wardDark, side, 0, .68),
  part(bevel, .02, side * .31, .91, .075, .085, .29, wardPlate, side * 2, 0, 1.15, side < 0 ? -.12 : .12),
);
for (const z of [.72, .87, 1.02]) sparkWarden.push(block(.205, 0, z, .025, .14, .027, wardGlow));
sparkWarden.push(
  block(.11, -.34, .72, .027, .027, .69, wardStaff, -2, 0, 1.15, .08),
  part(taper, .16, -.34, 1.42, .09, .07, .17, wardGlow, -2, 0, 1.15, .08),
);

// A hovering ember core with asymmetric flame lobes. Swing group 8 breathes without pretending to walk.
const cinderWisp = [
  part(ellipsoid(6, 2), 0, 0, .58, .22, .22, .25, ember, 8, 0, .58, 0, true),
];
for (let i = 0; i < 5; i++) {
  const a = i * Math.PI * 2 / 5, y = Math.sin(a) * .16, x = Math.cos(a) * .10, h = .15 + (i % 2) * .07;
  cinderWisp.push(part(curvedTube([[x, y, .50, .07], [x - .08, y * 1.35, .32, .05], [x + .04, y * 1.55, .12 - h * .1, .01]], 4), 0, 0, 0, 1, 1, 1, i % 2 ? flame : cinder, 8, 0, .58));
}
for (const y of [-.10, 0, .10]) cinderWisp.push(part(taper, -.02, y, .83, .05, .045, .16, char, 8, 0, .58, -.15));

// Thin broad wings curve around a narrow contact body; the wing group responds to movement, windup and instant strikes.
const wingShape = membrane([[0, 0, 0], [-.12, .33, .06], [-.36, .62, -.03], [.02, .78, -.14], [.30, .48, -.07], [.24, .14, .03]]);
const veilMoth = [
  part(ellipsoid(6, 2), .02, 0, .55, .13, .12, .31, moth, 0, .02, .55, 0, true),
  part(ellipsoid(6, 2), .12, 0, .83, .16, .14, .14, mothVein, 0, .12, .83, 0, true),
  block(.26, -.055, .85, .018, .018, .025, mothEye), block(.26, .055, .85, .018, .018, .025, mothEye),
  part(wingShape, -.06, 0, .66, 1, 1, 1, mothWing, 7, -.06, .66, -.08),
  part(wingShape.map((tri) => tri.map(([x,y,z]) => [x,-y,z])), -.06, 0, .66, 1, 1, 1, mothWing, -7, -.06, .66, -.08),
];
for (const side of [-1, 1]) veilMoth.push(part(curvedTube([[.04, side * .06, .43, .025], [.14, side * .15, .22, .018], [.25, side * .17, .04, .008]], 4), 0, 0, 0, 1, 1, 1, mothVein, side, .04, .43));

// Oval eye/core with exactly seven independently phased tapered tentacles.
const voidSentinel = [
  part(ellipsoid(8, 3), 0, 0, .91, .31, .30, .39, voidShell, 0, 0, .91, 0, true),
  part(ellipsoid(6, 2), .24, 0, .96, .07, .17, .14, voidEye, 0, .24, .96, 0, true),
  part(bevel, -.02, 0, .84, .13, .13, .18, voidCore, 0, -.02, .84, 0, true),
];
for (let i = 0; i < 7; i++) {
  const a = (i - 3) * .36, y = Math.sin(a) * .23, x = Math.cos(a) * .10 - .04;
  voidSentinel.push(part(curvedTube([[x, y, .66, .045], [x - .10 - .025 * (i % 2), y * 1.32, .34, .030], [x + .04 * Math.sin(i), y * 1.65, .04, .009]], 4), 0, 0, 0, 1, 1, 1, i % 2 ? voidDark : voidShell, 10 + i, x, .66));
}

export const CLOSE_VIEW_ARCOLOGY_MODELS = { glassMite, sparkWarden, cinderWisp, veilMoth, voidSentinel };
export const CLOSE_VIEW_ARCOLOGY_KINDS = Object.freeze(Object.keys(CLOSE_VIEW_ARCOLOGY_MODELS));
