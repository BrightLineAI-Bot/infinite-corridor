// Authored Close View bodies for the adventure creatures (adventure-creatures.ts). Original designs, solid like every other native
// creature, baked once from the shared primitives. Each stays under the 232-triangle body budget (256 with three attachments) and
// moves only through the shared pack joints (close-view-models semanticAngle): 20/21 jaws, 22/23 wings and petals, 31 a hung
// censer or a stalk, 50-54 arms, 55-59 feelers and roots, 60-69 trailing cloth and tails, 70-77 long limbs, 80/81 tails, 82-89 heads
// and segments, and ±1 legs on the ordinary gait. The attack families they answer are PACK_ACTION_FAMILIES (actor-presentation.ts).
import { bevel, taper, ellipsoid, ringLoft, verticalLoft, curvedTube, membrane, part, block } from './close-view-mesh.ts';

const E5 = ellipsoid(5, 1), E6 = ellipsoid(6, 2);
const limb = (points, color, swing, px, pz, sides = 4) => part(curvedTube(points, sides), 0, 0, 0, 1, 1, 1, color, swing, px, pz);
const mirror = (shape) => shape.map((t) => t.map(([x, y, z]) => [x, -y, z]));
const taperX = taper.map((t) => t.map(([x, y, z]) => [z, y, -x])); // a spike pointing forward (+X) about its own centre

// Gallery Lurker: a hunched, many-jointed grey climber; long clawed arms, short hind legs, a low ridged back and amber eyes.
const L = { hide: 0x8c8577, dark: 0x24211d, eye: 0xe8b04a, bone: 0xd8ccb0 };
const galleryLurker = [
  part(ringLoft([[-.36, .13, -.06], [-.12, .2, 0], [.14, .19, .05], [.3, .11, .02]], 6), 0, 0, .7, 1, 1, 1, L.hide, 0, 0, .7, 0, true),
  part(E6, .44, 0, .86, .17, .15, .13, L.hide, 20, .3, .8, 0, true),
  part(taperX, .5, 0, .74, .14, .1, .05, L.dark, 21, .3, .8),
  block(.58, -.06, .88, .025, .025, .025, L.eye, 20, .3, .8), block(.58, .06, .88, .025, .025, .025, L.eye, 20, .3, .8),
];
for (let i = 0; i < 3; i++) galleryLurker.push(part(taper, -.22 + i * .2, 0, .93 + (i === 1 ? .03 : 0), .06, .05, .1, L.bone));
for (const side of [-1, 1]) galleryLurker.push(
  limb([[.22, side * .17, .76, .055], [.4, side * .36, .52, .04], [.58, side * .3, .08, .028]], L.hide, side < 0 ? 70 : 71, .22, .76),
  part(taperX, .64, side * .3, .05, .09, .04, .05, L.bone, side < 0 ? 70 : 71, .22, .76),
  limb([[-.24, side * .15, .62, .06], [-.36, side * .3, .32, .045], [-.22, side * .3, .03, .03]], L.dark, side < 0 ? 74 : 75, -.24, .62),
);

// Censer Warden: a tall hooded robe, a dark face with two lamp-eyes, long sleeves, and a censer swung on a chain.
const C = { robe: 0x5a5148, hood: 0x3f3832, dark: 0x1c1916, flame: 0xffb347, brass: 0xb08a4a };
const censerWarden = [
  part(verticalLoft([[0, .28, 0], [-.02, .25, .5], [0, .19, 1.1], [.02, .16, 1.42]], 6), 0, 0, 0, 1, 1, 1, C.robe),
  part(verticalLoft([[0, .17, 0], [-.02, .19, .17], [-.06, .13, .34], [-.11, .02, .46]], 6), 0, 0, 1.42, 1, 1, 1, C.hood),
  part(E5, .13, 0, 1.6, .04, .1, .12, C.dark),
  block(.17, -.045, 1.62, .015, .022, .018, C.flame), block(.17, .045, 1.62, .015, .022, .018, C.flame),
  limb([[.14, -.3, 1.0, .018], [.36, -.32, .78, .014], [.42, -.32, .56, .012]], C.brass, 31, .14, 1.0, 3),
  part(bevel, .42, -.32, .46, .09, .09, .09, C.brass, 31, .14, 1.0),
  part(E5, .42, -.32, .46, .065, .065, .07, C.flame, 31, .14, 1.0),
];
for (const side of [-1, 1]) censerWarden.push(limb([[0, side * .2, 1.3, .065], [.08, side * .28, 1.08, .06], [.16, side * .3, .98, .05]], C.hood, side < 0 ? 50 : 51, 0, 1.3));
for (let i = 0; i < 4; i++) { const y = (i - 1.5) * .14; censerWarden.push(part(membrane([[-.05, y - .06, .2], [-.05, y + .06, .2], [-.16, y + .05, .02], [-.14, y - .05, -.02]]), 0, 0, 0, 1, 1, 1, i % 2 ? C.robe : C.hood, 60 + i, -.05, .2)); }

// Vinehook Leaper: a crouched, long-armed climber; hooked forearms of green horn, a curling vine tail and a bright-eyed head.
const V = { hide: 0x4f6b3a, dark: 0x1a2414, hook: 0xc9e86a, eye: 0xf2ffd0 };
const vinehookLeaper = [
  part(E6, -.06, 0, .72, .27, .21, .3, V.hide, 0, -.06, .72, .35, true),
  part(E6, .12, 0, .98, .19, .26, .17, V.hide, 0, .12, .98, 0, true),
  part(E6, .3, 0, 1.1, .13, .12, .12, V.dark, 82, .18, 1.02, 0, true),
  block(.42, -.05, 1.13, .02, .022, .022, V.eye, 82, .18, 1.02), block(.42, .05, 1.13, .02, .022, .022, V.eye, 82, .18, 1.02),
  limb([[-.3, 0, .6, .045], [-.56, 0, .5, .035], [-.66, 0, .78, .025], [-.52, 0, .9, .012]], V.hook, 80, -.3, .6, 3),
];
for (const side of [-1, 1]) vinehookLeaper.push(
  limb([[.16, side * .26, 1.02, .055], [.34, side * .4, .7, .045], [.5, side * .36, .36, .035], [.52, side * .3, .14, .03]], V.hide, side < 0 ? 70 : 71, .16, 1.02),
  part(taperX, .6, side * .3, .1, .12, .04, .06, V.hook, side < 0 ? 70 : 71, .16, 1.02),
  limb([[-.12, side * .14, .55, .06], [.04, side * .22, .28, .05], [-.06, side * .2, .03, .035]], V.dark, side, -.12, .55),
);

// Thornspitter Bloom: a root mound, a bent stalk, a fleshy bulb whose five petals open round a toothed mouth, and crawling roots.
const T = { leaf: 0x3e6b4a, dark: 0x142218, petal: 0xff6a8a, pale: 0xffe0ea };
const thornspitterBloom = [
  part(E6, 0, 0, .12, .36, .36, .14, T.dark, 0, 0, .12, 0, true),
  limb([[0, 0, .2, .07], [-.06, 0, .5, .06], [.04, 0, .78, .05]], T.leaf, 31, 0, .2, 5),
  part(E6, .06, 0, .92, .22, .22, .21, T.leaf, 31, 0, .2, 0, true),
  part(E5, .26, 0, .93, .05, .09, .09, T.pale, 31, 0, .2),
  part(taperX, .3, 0, 1.0, .14, .09, .04, T.dark, 20, .2, .93),
  part(taperX, .3, 0, .86, .14, .09, .04, T.dark, 21, .2, .93),
];
for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 + .3, y = Math.cos(a) * .2, z = .93 + Math.sin(a) * .2, y2 = Math.cos(a) * .42, z2 = .93 + Math.sin(a) * .42;
  thornspitterBloom.push(part(membrane([[.2, y * .6, .93 + (z - .93) * .6], [.24, y + Math.sin(a) * .07, z - Math.cos(a) * .07], [.3, y2, z2], [.24, y - Math.sin(a) * .07, z + Math.cos(a) * .07]]), 0, 0, 0, 1, 1, 1, i % 2 ? T.petal : T.pale, i % 2 ? 22 : 23, .2, .93)); }
for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .8, cx = Math.cos(a), cy = Math.sin(a);
  thornspitterBloom.push(limb([[cx * .22, cy * .22, .1, .045], [cx * .44, cy * .44, .06, .03], [cx * .6, cy * .55, .02, .012]], T.dark, 55 + i, cx * .22, .1, 3)); }
for (const side of [-1, 1]) thornspitterBloom.push(part(membrane([[-.04, side * .02, .5], [-.1, side * .22, .58], [-.04, side * .34, .5], [0, side * .16, .44]]), 0, 0, 0, 1, 1, 1, T.leaf));

// Sinkmaw: a squat sand-coloured bulk whose front is one wide ringed mouth, two hooked mandibles, feelers, and a trailing segment.
const S = { sand: 0xc9a46a, dark: 0x3a2a18, ember: 0xff8a3a, tooth: 0xfff0d0 };
const sinkmaw = [
  part(ringLoft([[-.6, .3, 0], [-.32, .44, 0], [.06, .5, 0], [.32, .43, 0]], 7), 0, 0, .38, 1, 1, 1, S.sand, 0, 0, .38, 0, true),
  part(ringLoft([[0, .42, 0], [.1, .47, 0], [.2, .28, 0]], 7), .32, 0, .4, 1, 1, 1, S.dark),
  part(E6, -.78, 0, .26, .22, .26, .2, S.sand, 82, -.6, .3, 0, true),
];
for (const side of [-1, 1]) sinkmaw.push(
  limb([[.42, side * .3, .44, .06], [.66, side * .26, .52, .045], [.76, side * .08, .42, .02]], S.dark, side < 0 ? 20 : 21, .4, .44),
  part(taperX, .5, side * .16, .64, .11, .05, .05, S.tooth, side < 0 ? 20 : 21, .4, .44),
  part(taperX, .5, side * .16, .2, .11, .05, .05, S.tooth, side < 0 ? 20 : 21, .4, .44),
);
for (let i = 0; i < 3; i++) { const y = (i - 1) * .3; sinkmaw.push(limb([[.2, y, .78, .04], [.32, y * 1.3, 1.0, .025], [.46, y * 1.4, 1.08, .01]], i === 1 ? S.ember : S.dark, 55 + i, .2, .78, 3)); }

// Cinder Kite: a narrow body under two rust sails stretched on bone ribs, a hooked beak, trailing tail ribbons and hanging talons.
const K = { sail: 0xb0643a, dark: 0x2b1a12, rib: 0xf4e6cc, eye: 0xffd27a };
const cinderKite = [
  part(ringLoft([[-.36, .05, 0], [-.12, .12, 0], [.14, .1, 0], [.3, .05, 0]], 5), 0, 0, .62, 1, 1, 1, K.dark, 0, 0, .62, 0, true),
  part(E5, .34, 0, .64, .09, .075, .075, K.dark),
  part(taperX, .44, 0, .6, .1, .035, .04, K.rib, 20, .34, .64),
  block(.38, -.045, .67, .018, .018, .018, K.eye), block(.38, .045, .67, .018, .018, .018, K.eye),
];
const sail = membrane([[.12, .06, .66], [.02, .4, .78], [-.08, .78, .7], [-.22, .62, .6], [-.3, .3, .58], [-.2, .06, .6]]);
for (const side of [-1, 1]) {
  const sw = side < 0 ? 22 : 23, shape = side > 0 ? sail : mirror(sail);
  cinderKite.push(part(shape, 0, 0, 0, 1, 1, 1, K.sail, sw, 0, .64),
    limb([[.1, side * .06, .66, .022], [.02, side * .42, .8, .017], [-.08, side * .78, .7, .01]], K.rib, sw, 0, .64, 3),
    limb([[-.14, side * .06, .62, .02], [-.24, side * .4, .62, .015], [-.22, side * .62, .6, .008]], K.rib, sw, 0, .64, 3),
    limb([[.04, side * .05, .56, .025], [.02, side * .08, .4, .018], [.08, side * .07, .3, .01]], K.rib, side, .04, .56, 3));
}
for (let i = 0; i < 3; i++) { const y = (i - 1) * .06; cinderKite.push(part(membrane([[-.34, y - .03, .62], [-.34, y + .03, .62], [-.66, y * 2 + .02, .5 - i * .03], [-.64, y * 2 - .03, .52 - i * .03]]), 0, 0, 0, 1, 1, 1, i === 1 ? K.eye : K.sail, 60 + i, -.34, .62)); }

export const CLOSE_VIEW_ADVENTURE_MODELS = { galleryLurker, censerWarden, vinehookLeaper, thornspitterBloom, sinkmaw, cinderKite };
export const CLOSE_VIEW_ADVENTURE_KINDS = Object.freeze(Object.keys(CLOSE_VIEW_ADVENTURE_MODELS));
