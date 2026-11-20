// Authored Close View bodies for the adventure creatures (adventure-creatures.ts). Original designs, solid like every other native
// creature, baked once from the shared primitives. Each stays under the 232-triangle body budget (256 with three attachments) and
// moves only through the shared pack joints (close-view-models semanticAngle): 20/21 jaws, 22/23 wings and petals, 31 a hung
// censer or a stalk, 50-54 arms, 55-59 feelers and roots, 60-69 trailing cloth and tails, 70-77 long limbs, 80/81 tails, 82-89 heads
// and segments, and ±1 legs on the ordinary gait. The attack families they answer are PACK_ACTION_FAMILIES (actor-presentation.ts).
import { MESH_FLOATS, prism, bevel, taper, ellipsoid, ringLoft, verticalLoft, curvedTube, membrane, part, block } from './close-view-mesh.js?v=r1046-4cfcd2923cdf';
import { FOUNDRY_JOINT_POSE } from './close-view-foundry-models.js?v=r1046-4cfcd2923cdf';
import { CORE_JOINT_POSE } from './close-view-arcology-models.js?v=r1046-4cfcd2923cdf';
import { PENTAGON_JOINT_POSE } from './close-view-pentagon-models.js?v=r1046-4cfcd2923cdf';

const E5 = ellipsoid(5, 1), E6 = ellipsoid(6, 2);
const limb = (points, color, swing, px, pz, sides = 4) => part(curvedTube(points, sides), 0, 0, 0, 1, 1, 1, color, swing, px, pz);
const mirror = (shape) => shape.map((t) => t.map(([x, y, z]) => [x, -y, z]));
const taperX = taper.map((t) => t.map(([x, y, z]) => [z, y, -x])); // a spike pointing forward (+X) about its own centre
// A part baked about its own anchor, then carried by joint `swing` about (px, pz) (so several parts share one pivot).
const jointedAt = (item, swing, px, pz) => { const mesh = item.mesh, dx = item.px - px, dz = item.pz - pz; for (let i = 0; i < mesh.length; i += MESH_FLOATS) { mesh[i] += dx; mesh[i + 2] += dz; } return { mesh, swing, px, pz }; };

// Gallery Lurker: a hunched, many-jointed grey climber; long clawed arms, short hind legs, a low ridged back and amber eyes.
const L = { hide: 0x8c8577, dark: 0x24211d, eye: 0xe8b04a, bone: 0xd8ccb0 };
const galleryLurker = [
  part(ringLoft([[-.36, .14, -.07], [-.12, .23, .01], [.14, .22, .07], [.32, .12, .03]], 6), 0, 0, .7, 1, 1, 1, L.hide, 0, 0, .7, 0, true),
  part(E6, .44, 0, .86, .17, .15, .13, L.hide, 20, .3, .8, 0, true),
  part(taperX, .54, 0, .8, .15, .09, .05, L.eye, 21, .3, .8),
  block(.58, -.06, .88, .025, .025, .025, 0xf3a55c, 20, .3, .8), block(.58, .06, .88, .025, .025, .025, 0xf3a55c, 20, .3, .8),
];
for (let i = 0; i < 3; i++) galleryLurker.push(part(taper, -.22 + i * .2, 0, .93 + (i === 1 ? .03 : 0), .06, .05, .1, L.bone));
for (const side of [-1, 1]) galleryLurker.push(
  limb([[.22, side * .18, .78, .07], [.4, side * .4, .6, .056], [.6, side * .32, .08, .034]], L.hide, side < 0 ? 70 : 71, .22, .76),
  part(taperX, .68, side * .32, .05, .11, .05, .05, L.bone, side < 0 ? 70 : 71, .22, .76),
  limb([[-.24, side * .15, .62, .06], [-.36, side * .3, .32, .045], [-.22, side * .3, .03, .03]], L.dark, side < 0 ? 74 : 75, -.24, .62),
);

// Censer Warden: a tall hooded robe, a dark face with two lamp-eyes, long sleeves, and a censer swung on a chain.
const C = { robe: 0x5a5148, hood: 0x3f3832, dark: 0x1c1916, flame: 0xf3a55c, brass: 0xb08a4a };
const censerWarden = [
  part(verticalLoft([[0, .30, 0], [-.03, .25, .55], [0, .23, 1.12], [.02, .17, 1.42]], 6), 0, 0, 0, 1, 1, 1, C.robe),
  part(verticalLoft([[0, .17, 0], [-.02, .19, .17], [-.06, .13, .34], [-.11, .02, .46]], 6), 0, 0, 1.42, 1, 1, 1, C.hood),
  part(E5, .13, 0, 1.6, .04, .1, .12, C.dark),
  block(.17, -.045, 1.62, .015, .022, .018, C.flame), block(.17, .045, 1.62, .015, .022, .018, C.flame),
  limb([[.16, -.3, .98, .018], [.22, -.31, .76, .014], [.22, -.31, .56, .012]], C.brass, 31, 0, 1.3, 3),
  part(bevel, .22, -.31, .46, .09, .09, .09, C.brass, 31, 0, 1.3),
  part(E5, .22, -.31, .5, .065, .065, .07, C.flame, 31, 0, 1.3),
];
for (const side of [-1, 1]) censerWarden.push(limb([[0, side * .2, 1.3, .065], [.08, side * .28, 1.08, .06], [.16, side * .3, .98, .05]], C.hood, side < 0 ? 31 : 51, 0, 1.3));
for (let i = 0; i < 4; i++) { const y = (i - 1.5) * .14; censerWarden.push(part(membrane([[-.05, y - .06, .2], [-.05, y + .06, .2], [-.16, y + .05, .02], [-.14, y - .05, -.02]]), 0, 0, 0, 1, 1, 1, i % 2 ? C.robe : C.hood, 60 + i, -.05, .2)); }

// Vinehook Leaper: a crouched, long-armed climber; hooked forearms of green horn, a curling thorned vine tail, two leaf fronds
// on its back and a bright-eyed head. 2026-11-15 forms pass: the eyes are lit slits, the saving spent on the fronds.
const V = { hide: 0x4f6b3a, dark: 0x1a2414, hook: 0xc9e86a, eye: 0xd1e86a, leaf: 0x3d5a26 };
const vinehookLeaper = [
  part(E6, -.06, 0, .72, .27, .21, .3, V.hide, 0, -.06, .72, .35, true),
  part(E6, .12, 0, 1.0, .19, .26, .17, V.hide, 0, .12, 1.0, 0, true),
  part(E6, .31, 0, 1.11, .13, .12, .11, V.dark, 82, .18, 1.02, 0, true),
  part(membrane([[.43, -.075, 1.15], [.44, -.02, 1.13], [.43, -.03, 1.1], [.42, -.08, 1.12]]), 0, 0, 0, 1, 1, 1, V.eye, 82, .18, 1.02),
  part(membrane([[.44, .02, 1.13], [.43, .075, 1.15], [.42, .08, 1.12], [.43, .03, 1.1]]), 0, 0, 0, 1, 1, 1, V.eye, 82, .18, 1.02),
  limb([[-.3, 0, .6, .045], [-.56, 0, .5, .035], [-.66, 0, .78, .025], [-.52, 0, .9, .012]], V.hook, 80, -.3, .6, 3),
  part(membrane([[-.6, 0, .66], [-.68, .05, .6], [-.63, 0, .58]]), 0, 0, 0, 1, 1, 1, V.dark, 80, -.3, .6),
  part(membrane([[-.66, 0, .84], [-.74, -.05, .86], [-.67, 0, .9]]), 0, 0, 0, 1, 1, 1, V.dark, 80, -.3, .6),
];
for (const side of [-1, 1]) vinehookLeaper.push(
  limb([[.16, side * .26, 1.02, .055], [.34, side * .4, .7, .045], [.5, side * .36, .36, .035], [.52, side * .3, .14, .03]], V.hide, side < 0 ? 70 : 71, .16, 1.02),
  part(taperX, .6, side * .3, .1, .12, .04, .06, V.hook, side < 0 ? 70 : 71, .16, 1.02),
  limb([[-.12, side * .14, .55, .06], [.04, side * .22, .28, .05], [-.06, side * .2, .03, .035]], V.dark, side, -.12, .55),
  part(membrane(((f) => side > 0 ? [f[0], ...f.slice(1).reverse()] : f)([[-.02, side * .1, 1.06], [-.16, side * .24, 1.12], [-.36, side * .25, 1.0], [-.26, side * .16, .9], [-.1, side * .1, .94]])), 0, 0, 0, 1, 1, 1, V.leaf),
);

// crawling roots. 2026-11-15 forms pass: the whole bloom (stalk, bulb, maw, fanged jaws, petals, leaves and thorns) rides the
// stalk joint (31) about its root, so nothing comes away from it as it rears back like a cobra and drives; the roots (55-58)
// writhe and brace under it.
// and open and close by riding a little further round the same arc.
const T = { leaf: 0x3e6b4a, dark: 0x142218, petal: 0xff6a8a, pale: 0xffe0ea, maw: 0x5a1a2a };
const bloom = (shape, x, y, z, sx, sy, sz, color, swing = 31, rest = 0, smooth = false) => jointedAt(part(shape, x, y, z, sx, sy, sz, color, 0, x, z, rest, smooth), swing, 0, .2);
const thornspitterBloom = [
  part(ellipsoid(6, 1), 0, 0, .1, .36, .36, .12, T.dark, 0, 0, .1, 0, true),
  limb([[0, 0, .2, .07], [-.07, 0, .52, .058], [.04, 0, .8, .05]], T.leaf, 31, 0, .2),
  bloom(E6, .04, 0, .92, .18, .19, .18, T.leaf, 31, 0, true),
  bloom(E5, .22, 0, .93, .045, .12, .12, T.maw),
  bloom(taperX, .33, 0, 1.0, .1, .08, .035, T.pale, 31, -.25),
  bloom(taperX, .33, 0, .86, .1, .08, .035, T.pale, 31, .25),
];
for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 + Math.PI / 2, y = Math.cos(a) * .2, z = .93 + Math.sin(a) * .2, y2 = Math.cos(a) * .48, z2 = .93 + Math.sin(a) * .48;
  thornspitterBloom.push(jointedAt(part(membrane([[.18, y * .55, .93 + (z - .93) * .55], [.22, y + Math.sin(a) * .15, z - Math.cos(a) * .15], [.3, y2, z2], [.22, y - Math.sin(a) * .15, z + Math.cos(a) * .15]]), 0, 0, 0, 1, 1, 1, i % 2 ? T.petal : T.pale), 31, 0, .2)); }
for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .8, cx = Math.cos(a), cy = Math.sin(a);
  thornspitterBloom.push(limb([[cx * .22, cy * .22, .1, .045], [cx * .44, cy * .44, .06, .03], [cx * .62, cy * .56, .02, .012]], T.dark, 55 + i, cx * .22, .1, 3)); }
for (const side of [-1, 1]) thornspitterBloom.push(jointedAt(part(membrane([[-.05, side * .02, .48], [-.12, side * .24, .58], [-.04, side * .36, .52], [0, side * .16, .44]]), 0, 0, 0, 1, 1, 1, T.leaf), 31, 0, .2));
for (const [x, z, s] of [[-.06, .36, -1], [-.06, .44, 1], [-.05, .6, -1], [-.03, .66, 1], [.0, .74, -1], [.03, .8, 1], [-.02, .3, 1], [.01, .7, 0]])
  thornspitterBloom.push(jointedAt(part(membrane([[x, s * .04, z], [x - .1, s * .1 + (s ? 0 : .1), z + .05], [x, s * .03, z + .04]]), 0, 0, 0, 1, 1, 1, T.dark), 31, 0, .2));

// Sinkmaw: a squat sand-coloured bulk whose front is one wide ringed mouth, two hooked mandibles, feelers, and a trailing segment.
const S = { sand: 0xc9a46a, dark: 0x3a2a18, ember: 0xff9d4a, tooth: 0xfff0d0 };
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
for (const i of [0, 2]) { const y = (i - 1) * .3; sinkmaw.push(limb([[.2, y, .78, .04], [.32, y * 1.3, 1.0, .025], [.46, y * 1.4, 1.08, .01]], S.dark, 55 + i, .2, .78, 3)); }
sinkmaw.push(part(E5, .4, 0, .4, .06, .3, .26, S.ember));

// Cinder Kite: a narrow body under two rust sails stretched on bone ribs, a hooked beak, trailing tail ribbons and hanging talons.
const K = { sail: 0xb0643a, dark: 0x2b1a12, rib: 0xf4e6cc, eye: 0xffd25a };
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

// ---- the second set (Tim, 2026-11-11: the other four themes)
const E8 = ellipsoid(8, 3), taperDown = taper.map((t) => t.map(([x, y, z]) => [x, y, -z]));
// Lamplighter: a long coat, a tall hat, and a lamp hung from a pole twice its height (the pole arm is 50).
const LL = { coat: 0x4a4f58, dark: 0x16181c, lamp: 0xefb15d, glow: 0xf3a55c, wood: 0x3a3026 };
const lamplighter = [
  part(verticalLoft([[0, .22, 0], [-.01, .21, .4], [0, .18, .8], [.01, .15, 1.02]], 6), 0, 0, .45, 1, 1, 1, LL.coat),
  block(0, 0, 1.6, .2, .2, .02, LL.dark), part(bevel, 0, 0, 1.72, .11, .11, .12, LL.dark),
  part(E5, .06, 0, 1.5, .1, .1, .1, 0x2a2c30), block(.15, 0, 1.51, .02, .05, .015, LL.glow),
  limb([[.08, -.22, 1.38, .05], [.24, -.32, 1.1, .045], [.34, -.3, .95, .04]], LL.coat, 50, .08, 1.38),
  limb([[.3, -.32, .7, .025], [.4, -.32, 1.5, .02], [.5, -.32, 2.06, .018]], LL.wood, 50, .08, 1.38, 3),
  part(bevel, .54, -.32, 1.9, .08, .08, .1, LL.lamp, 50, .08, 1.38), part(E5, .54, -.32, 2.02, .09, .09, .04, LL.dark, 50, .08, 1.38),
  limb([[-.04, .22, 1.38, .05], [-.06, .3, 1.1, .045], [0, .28, .9, .04]], LL.coat, 51, -.04, 1.38),
];
for (const side of [-1, 1]) lamplighter.push(limb([[0, side * .1, .5, .065], [.02, side * .11, .25, .055], [.06, side * .11, .03, .04]], LL.dark, side, 0, .5));
// Knellkeeper: a hunched ringer grown into a bronze bell. The bell is its body from the floor to the crown, cracked down one
// flank; a hunched hide torso leans out of the crown under a dark cowl, lamp-gold eyes in its head (82); a long arm swings the
// clapper (50: arm, rod and bronze ball together), the other arm (51) braces; two short legs show under the lip.
// 2026-11-15 forms pass: a body grown out of the bell instead of a head beside it.
const KK = { hide: 0x5c5248, dark: 0x1e1a16, bronze: 0xa8843f, pale: 0xffc35a, deep: 0x6a4e24 };
const knellkeeper = [
  part(verticalLoft([[0, .47, 0], [-.01, .4, .08], [-.04, .29, .42], [-.08, .17, .72]], 7), -.06, 0, .03, 1, 1, 1, KK.bronze),
  part(E6, .05, 0, .93, .2, .2, .22, KK.hide, 0, .05, .93, .55, true),
  part(ellipsoid(5, 2), .3, 0, 1.0, .12, .12, .11, KK.hide, 82, .2, .95, 0, true),
  part(membrane([[.37, -.18, .1], [.27, -.13, .46], [.31, -.16, .28]]), 0, 0, 0, 1, 1, 1, KK.dark),
  part(membrane([[.2, 0, 1.15], [.3, .13, 1.08], [.42, .1, 1.05], [.42, -.1, 1.05], [.3, -.13, 1.08]]), 0, 0, 0, 1, 1, 1, KK.dark, 82, .2, .95),
  part(membrane([[.415, -.075, 1.02], [.42, -.025, 1.02], [.412, -.05, .99]]), 0, 0, 0, 1, 1, 1, KK.pale, 82, .2, .95),
  part(membrane([[.42, .025, 1.02], [.415, .075, 1.02], [.412, .05, .99]]), 0, 0, 0, 1, 1, 1, KK.pale, 82, .2, .95),
  limb([[.12, -.2, .98, .07], [.32, -.33, .8, .058], [.5, -.32, .64, .048]], KK.hide, 50, .12, .98),
  limb([[.5, -.32, .64, .022], [.6, -.32, .46, .018]], KK.deep, 50, .12, .98, 3),
  part(ellipsoid(6, 1), .63, -.32, .4, .1, .1, .1, KK.bronze, 50, .12, .98, 0, true),
  limb([[.12, .2, .98, .07], [.3, .3, .78, .058], [.42, .3, .64, .048]], KK.hide, 51, .12, .98),
];
for (const side of [-1, 1]) knellkeeper.push(limb([[0, side * .17, .32, .075], [.05, side * .2, .16, .065], [.1, side * .2, .02, .05]], KK.dark, side, 0, .32, 3));
// Spindrift Medusa: an open bell of violet membrane, lit from a core hung inside it, frilled at the lip (22/23) and trailing
// six tendrils (60-65). 2026-11-15 forms pass: a dome with a lip instead of a closed ball.
const MD = { skin: 0x6c70c0, dark: 0x1a0e26, glow: 0x7fe7ff, pale: 0xe8fbff, rim: 0x4a3f8a };
const spindriftMedusa = [
  part(verticalLoft([[0, .4, 0], [0, .37, .13], [0, .29, .28], [0, .1, .4]], 8), 0, 0, .8, 1, 1, 1, MD.skin),
  part(E5, 0, 0, 1.03, .17, .17, .13, MD.glow, 0, 0, 1.03, 0, true),
];
for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, y = Math.sin(a) * .4, x = Math.cos(a) * .4; spindriftMedusa.push(part(membrane([[x * .92, y * .92, .82], [x * 1.12 - y * .22, y * 1.12 + x * .22, .76], [x * 1.18, y * 1.18, .66], [x * 1.12 + y * .22, y * 1.12 - x * .22, .76]]), 0, 0, 0, 1, 1, 1, i % 2 ? MD.pale : MD.rim, i % 2 ? 22 : 23, 0, .82)); }
for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + .3, x = Math.cos(a) * .27, y = Math.sin(a) * .27; spindriftMedusa.push(limb([[x, y, .82, .028], [x * 1.25 - .05, y * 1.25, .45, .02], [x * .9 - .12, y * .9, .06, .006]], i % 2 ? MD.glow : 0x5a3a7a, 60 + i, x, .82, 3)); }
// Prism Stilt: three needle legs under a cut-crystal head (82): a hexagonal crystal drawn out to a spire above and a keel below,
// a lit lens on its face, a ring of floating shards and two satellite crystals. 2026-11-15 forms pass: a cut crystal.
const PS = { glass: 0x4a5a6a, dark: 0x141a22, light: 0xa0f0ff, white: 0xffffff, cut: 0x7cc4d8, deep: 0x3f7d92 };
const prismStilt = [
  part(prism(6), 0, 0, 1.74, .2, .2, .12, PS.cut, 82, 0, 1.6),
  part(prism(6, .08), 0, 0, 2.0, .2, .2, .14, PS.light, 82, 0, 1.6),
  part(prism(6, .1), 0, 0, 1.5, .2, .2, .12, PS.deep, 82, 0, 1.6, Math.PI),
  part(E5, .2, 0, 1.76, .04, .08, .08, 0x7fe7ff, 82, 0, 1.6, 0, true),
  part(E5, 0, 0, 1.42, .1, .1, .08, PS.dark, 0, 0, 1.42, 0, true),
];
for (const [a, sw] of [[0, 0], [2.1, 1], [-2.1, -1]]) { const x = Math.cos(a), y = Math.sin(a); prismStilt.push(limb([[x * .06, y * .06, 1.38, .035], [x * .34, y * .34, .9, .026], [x * .46, y * .46, .03, .012]], sw ? PS.glass : PS.dark, sw, 0, 1.38, 3)); }
for (let i = 0; i < 2; i++) { const a = i * Math.PI + .9; prismStilt.push(part(taper, Math.cos(a) * .3, Math.sin(a) * .3, 1.86, .045, .045, .11, i ? PS.light : PS.white, 82, 0, 1.6)); }
for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 + .3, c = Math.cos(a), s = Math.sin(a);
  prismStilt.push(part(membrane([[c * .27, s * .27, 1.66], [c * .33 - s * .04, s * .33 + c * .04, 1.71], [c * .3, s * .3, 1.78]]), 0, 0, 0, 1, 1, 1, PS.white, 82, 0, 1.6)); }
prismStilt.push(part(E5, 0, 0, 1.74, .215, .215, .02, PS.dark, 82, 0, 1.6));
// Rime Sentinel: a sentry under a crust of frost, icicles off its shoulders, a spear (50).
const RS = { frost: 0x6a7e94, dark: 0x1a2430, ice: 0xbfe8ff, white: 0xf4fbff };
const rimeSentinel = [
  part(verticalLoft([[0, .22, 0], [0, .24, .35], [.01, .26, .6], [0, .16, .78]], 6), 0, 0, .55, 1, 1, 1, RS.frost),
  part(E6, .02, 0, 1.48, .15, .15, .16, RS.frost, 0, .02, 1.48, 0, true), block(.15, 0, 1.47, .025, .1, .02, RS.dark), block(.17, 0, 1.47, .01, .06, .01, 0x7fe7ff),
  limb([[.06, -.26, 1.28, .06], [.24, -.32, 1.05, .05], [.34, -.3, .95, .045]], RS.frost, 50, .06, 1.28),
  limb([[.1, -.3, .7, .025], [.36, -.3, 1.3, .022], [.6, -.3, 1.9, .02]], 0x5a6672, 50, .06, 1.28, 3), part(taper, .63, -.3, 2.0, .05, .05, .12, RS.ice, 50, .06, 1.28),
  limb([[-.02, .26, 1.28, .06], [0, .32, 1.02, .05], [.06, .3, .88, .045]], RS.frost, 51, -.02, 1.28),
];
for (const side of [-1, 1]) rimeSentinel.push(limb([[0, side * .11, .6, .07], [.02, side * .12, .3, .06], [.05, side * .12, .03, .045]], RS.dark, side, 0, .6), part(taperDown, -.04, side * .2, 1.24, .04, .04, .12, RS.white), part(taperDown, .06, side * .24, 1.22, .03, .03, .09, RS.ice));
// Lake Glider: long, low and pale like the 2D glider; a torpedo body that runs out into a pointed snout (20) and a whip tail (80),
// slung between four short splayed skater's legs (±1 rear, ±2 front), each on a long ice blade.
const LG = { pale: 0x8aa0b4, dark: 0x202a36, ice: 0xe0f4ff, white: 0xffffff };
const lakeGlider = [
  part(ringLoft([[-.5, .05, .02], [-.28, .13, 0], [.06, .15, .01], [.36, .11, .02], [.52, .06, .01]], 5), 0, 0, .3, 1, 1, 1, LG.pale, 0, 0, .3, 0, true),
  part(taperX, .64, 0, .31, .14, .05, .035, LG.ice, 20, .5, .31),
  block(.42, -.075, .37, .018, .018, .018, LG.white), block(.42, .075, .37, .018, .018, .018, LG.white),
  limb([[-.5, 0, .32, .035], [-.76, 0, .36, .022], [-.98, 0, .3, .008]], LG.pale, 80, -.5, .32, 3),
];
for (const [x, sw] of [[.22, 2], [-.26, 1]]) for (const side of [-1, 1]) lakeGlider.push(limb([[x, side * .1, .28, .04], [x - .02, side * .26, .2, .03], [x + .02, side * .28, .05, .02]], LG.dark, side * sw, x, .28, 3), block(x + .03, side * .28, .025, .14, .012, .016, LG.ice, side * sw, x, .28));
// Hookhanger: a soot-black body of chain and plate; a chain overhead (31), a great hook arm (70), a free arm (71), legs (±1).
const HH = { soot: 0x5a4a40, dark: 0x1c1612, ember: 0xff9d4a, pale: 0xffd8b0 };
const hookhanger = [
  part(E6, 0, 0, .78, .2, .19, .3, HH.soot, 0, 0, .78, 0, true), part(E5, .08, 0, 1.12, .12, .11, .1, HH.dark), block(.19, 0, 1.13, .02, .07, .02, HH.ember),
  limb([[0, 0, 1.2, .025], [0, 0, 1.5, .022], [-.04, 0, 1.8, .02], [-.06, 0, 2.08, .02]], 0x6a6058, 31, 0, 1.2, 3),
  limb([[.1, -.2, .95, .05], [.3, -.28, .82, .04]], HH.soot, 70, .1, .95), limb([[.3, -.28, .82, .03], [.48, -.28, .7, .03], [.5, -.28, .5, .025], [.38, -.28, .48, .015]], HH.pale, 70, .1, .95, 3),
  limb([[.06, .2, .95, .05], [.14, .28, .72, .04], [.18, .26, .6, .03]], HH.soot, 71, .06, .95),
];
for (let i = 0; i < 3; i++) hookhanger.push(block(.15, 0, .62 + i * .14, .03, .15, .02, i === 1 ? HH.ember : HH.dark));
for (const side of [-1, 1]) hookhanger.push(limb([[0, side * .1, .52, .06], [.03, side * .12, .27, .05], [.06, side * .12, .03, .035]], HH.dark, side, 0, .52));
// Slagwright: a foundry hand in a riveted coat and a leather apron, a round welder's helm with a lit furnace slit, heavy legs,
// and a long ladle (50: arm, shaft and cup together) whose cup holds glowing slag, with a lit drip at its lip.
// 2026-11-15 forms pass: a helm and apron instead of two blocks, and the slag lit from within.
const SW = { plate: 0x4a3a32, dark: 0x1a120e, molten: 0xff9d4a, pale: 0xffe0a0, leather: 0x6a4a30, iron: 0x3a3028 };
const slagwright = [
  part(verticalLoft([[0, .27, 0], [.01, .29, .32], [.02, .3, .58], [-.01, .2, .76]], 6), 0, 0, .52, 1, 1, 1, SW.plate),
  part(membrane([[.27, -.17, 1.06], [.27, .17, 1.06], [.29, .2, .62], [.27, 0, .5], [.29, -.2, .62]]), 0, 0, 0, 1, 1, 1, SW.leather),
  part(E6, .04, 0, 1.43, .16, .15, .15, SW.dark, 82, .02, 1.3, 0, true),
  part(membrane([[.195, -.1, 1.45], [.2, .1, 1.45], [.197, .085, 1.415], [.193, -.085, 1.415]]), 0, 0, 0, 1, 1, 1, SW.molten, 82, .02, 1.3),
  limb([[.06, -.3, 1.2, .075], [.26, -.36, 1.0, .062], [.38, -.34, .92, .052]], SW.plate, 50, .06, 1.2),
  limb([[.38, -.34, .92, .025], [.7, -.34, .8, .022], [.95, -.34, .7, .02]], SW.iron, 50, .06, 1.2, 3),
  part(ellipsoid(6, 1), 1.02, -.34, .66, .14, .14, .08, SW.iron, 50, .06, 1.2, 0, true),
  part(E5, 1.02, -.34, .7, .11, .11, .025, SW.molten, 50, .06, 1.2),
  part(membrane([[1.14, -.38, .7], [1.14, -.3, .7], [1.16, -.34, .58]]), 0, 0, 0, 1, 1, 1, SW.molten, 50, .06, 1.2),
  limb([[-.02, .3, 1.2, .075], [0, .36, .95, .062], [.06, .34, .82, .052]], SW.plate, 51, -.02, 1.2),
];
for (const side of [-1, 1]) slagwright.push(limb([[0, side * .13, .6, .09], [.04, side * .15, .3, .078], [.08, side * .15, .04, .06]], SW.dark, side, 0, .6));

export const CLOSE_VIEW_ADVENTURE_MODELS = { galleryLurker, censerWarden, vinehookLeaper, thornspitterBloom, sinkmaw, cinderKite, lamplighter, knellkeeper, spindriftMedusa, prismStilt, rimeSentinel, lakeGlider, hookhanger, slagwright };
export const CLOSE_VIEW_ADVENTURE_KINDS = Object.freeze(Object.keys(CLOSE_VIEW_ADVENTURE_MODELS));

// ---- attack poses (Tim, 2026-11-14: ordinary creatures "just stand next to me")
// Limb motion on top of the shared root layer (close-view-models.ts CREATURE_POSE / creatureRootPose), keyed to its stage and
// progress, so a limb loads in the coil, is at full extension as the hit resolves and follows through as the body settles. Rows
// are per kind, then per attack id (else the root's style, else '*'), then per pack joint: J(coil, strike, follow, lag) in
// radians about the joint's own pivot (positive tips a forward part down and swings a hanging part back): `coil` eased in over the
// windup, `strike` snapped in at the strike and held, eased out in the recovery, `follow` a swing past it early in the recovery,
// and `lag` (a share of the strike and settle) holds a joint behind the body: a staggered leg, a trailing tail or chain. A listed
// joint takes this in place of the generic action-family gesture, over its own ambient sway. Purely visual: hit positions are
// the game's. Reduced Motion: coil and strike at CREATURE_POSE.reduced.scale and no follow-through, as the root layer does.
const J = (coil, strike, follow = 0, lag = 0) => Object.freeze([coil, strike, follow, lag]);
const rows = (o) => Object.freeze(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Object.freeze(v)])));
export const ADVENTURE_JOINT_POSE = Object.freeze({
  // Long clawed arms (70 lead, 71 trailing) wind back and rake through; hind legs (74/75) drive; the head (20) dips in.
  galleryLurker: rows({
    clawSweep: { 70: J(.8, -1.1, -.4), 71: J(.12, -.28, 0, .3), 74: J(-.12, .18), 75: J(-.12, .18, 0, .15), 20: J(-.3, .38, .1) },
    ledgeDrop: { 70: J(.5, -1.9, -.3), 71: J(.5, -1.9, -.3, .15), 74: J(-.45, .7), 75: J(-.45, .7), 20: J(-.25, .3) },
    ledgeClimb: { 70: J(-.6, -2.2), 71: J(-.6, -2.2, 0, .2), 74: J(-.5, .6), 75: J(-.5, .6) },
  }),
  // The censer arm (31: arm, chain and censer as one) swings back and over in a lobbing arc; the free sleeve counters it.
  censerWarden: rows({
    censerLob: { 31: J(1.1, -2.3, -.35), 51: J(-.3, .45), 60: J(-.1, .35, .1, .4), 61: J(-.1, .3, .1, .45), 62: J(-.1, .3, .1, .5), 63: J(-.1, .35, .1, .55) },
    clawSweep: { 51: J(.85, -1.6, -.35), 31: J(.4, -.7, -.2, .3), 60: J(0, .25, 0, .4), 63: J(0, .25, 0, .5) },
  }),
  // Hooked arms swing back to load the vault and reach forward to hook the landing; the legs spring; the vine tail trails.
  vinehookLeaper: rows({
    vineVault: { 70: J(.55, -1.2, -.35), 71: J(.55, -1.2, -.35, .1), [-1]: J(-.55, .85), 1: J(-.55, .85, 0, .08), 80: J(-.4, .6, .2, .35), 82: J(.22, -.32, -.1) },
    vineRetreat: { 70: J(-.6, -2.4), 71: J(-.6, -2.4, 0, .15), [-1]: J(-.4, .7), 1: J(-.4, .7), 80: J(-.3, .5, 0, .35) },
    clawSweep: { 70: J(.85, -1.6, -.35), 71: J(.5, -1.1, -.2, .3), [-1]: J(-.2, .25), 1: J(-.2, .25), 82: J(.15, -.2), 80: J(-.2, .3, 0, .4) },
  }),
  // The bloom rears back on its stalk (31) like a cobra, then drives forward to spit or strike; the roots brace and writhe.
  thornspitterBloom: rows({
    thornDarts: { 31: J(-.36, .26, .12), 55: J(.14, -.1), 56: J(-.1, .08, 0, .1), 57: J(.14, -.1, 0, .15), 58: J(-.1, .08, 0, .2) },
    bite: { 31: J(-.45, .3, .12), 55: J(.18, -.14), 57: J(.18, -.14, 0, .1) },
  }),
  // Mandibles (20/21) lift wide and slam; feelers (55/57) reach; the trailing segment (82) lags.
  sinkmaw: rows({
    bite: { 20: J(-.55, .35, .1), 21: J(-.55, .35, .1, .1), 55: J(-.3, .45, 0, .2), 57: J(-.3, .45, 0, .25), 82: J(.25, -.3, 0, .35) },
    burrowAmbush: { 20: J(-.6, .4), 21: J(-.6, .4), 55: J(.45, -.6), 57: J(.45, -.6), 82: J(.3, -.45, 0, .3) },
    sinkFunnel: { 20: J(-.8, -1.05), 21: J(-.8, -1.05), 55: J(-.6, -.9, 0, .1), 57: J(-.6, -.9, 0, .2), 82: J(.25, .15) },
  }),
  // Talons (±1) swing forward to rake on the bite; the beak (20) snaps; sails (22/23) cup; tail ribbons trail.
  cinderKite: rows({
    bite: { [-1]: J(.5, -1.2, -.25), 1: J(.5, -1.2, -.25, .1), 20: J(-.5, .4), 22: J(-.3, .5), 23: J(-.3, .5), 60: J(.2, -.3, 0, .3), 61: J(.2, -.35, 0, .35), 62: J(.2, -.3, 0, .4) },
    glassStrafe: { [-1]: J(-.3, .7), 1: J(-.3, .7), 22: J(.6, -.45), 23: J(.6, -.45), 60: J(.3, -.5, 0, .3), 61: J(.3, -.55, 0, .35), 62: J(.3, -.5, 0, .4) },
  }),
  // The pole (50 with its arm) draws back, then levels and drives down the line; the other arm and the legs brace it.
  lamplighter: rows({
    poleThrust: { 50: J(-.35, 1.0, .15), 51: J(.3, -.5), [-1]: J(.05, -.35), 1: J(-.05, .3) },
    lampFlare: { 50: J(-.75, 1.4, .2), 51: J(.4, -.6), [-1]: J(0, -.25), 1: J(0, .25) },
  }),
  // The clapper-hammer (50) is hauled back and swept round, or raised high and brought down on the bell.
  knellkeeper: rows({
    heavySweep: { 50: J(1.0, -1.55, -.38), 51: J(-.35, .45), 82: J(.18, -.26, -.08), [-1]: J(-.1, .15), 1: J(.1, -.15) },
    bellToll: { 50: J(-2.2, .5, .22), 51: J(-.55, .25), 82: J(-.35, .42, .1) },
  }),
  // Tendrils (60-65) draw in, then flare outward round the bell in the pulse, or sweep forward in a rippling curtain for the rain.
  spindriftMedusa: rows({
    membranePulse: { 60: J(.3, -.85, -.2), 61: J(.15, -.45), 62: J(-.3, .85, .2), 63: J(-.3, .85, .2), 64: J(-.15, .45), 65: J(.3, -.85, -.2), 22: J(.3, -.5), 23: J(-.3, .5) },
    tendrilRain: { 60: J(.35, -.7, -.1), 61: J(.35, -.7, -.1, .08), 62: J(.35, -.7, -.1, .16), 63: J(.35, -.7, -.1, .24), 64: J(.35, -.7, -.1, .32), 65: J(.35, -.7, -.1, .4), 22: J(-.2, .3), 23: J(-.2, .3) },
  }),
  // The crystal head (82) tips back to gather, then aims down the beam or pecks; the rear legs (±1) brace.
  prismStilt: rows({
    prismBeam: { 82: J(-.55, .6, .1), [-1]: J(-.08, .2), 1: J(-.08, .2) },
    bite: { 82: J(-.55, 1.0, .18), [-1]: J(-.12, .22), 1: J(-.12, .22) },
    phaseStep: { 82: J(.3, -.3), [-1]: J(-.3, .3), 1: J(-.3, .3) },
  }),
  // The spear (50 with its arm) draws back and levels into the thrust, or is raised and brought down on the lane.
  rimeSentinel: rows({
    poleThrust: { 50: J(-.4, .95, .15), 51: J(.3, -.4), [-1]: J(.05, -.35), 1: J(-.05, .3) },
    icicleLine: { 50: J(-.9, .5, .1), 51: J(-.3, .2) },
  }),
  // A skater's push: the legs load and kick back in turn; the snout (20) dips; the tail (80) streams.
  lakeGlider: rows({
    bite: { 20: J(-.45, .35), 2: J(-.12, .18), [-2]: J(-.12, .18), 1: J(-.18, .28), [-1]: J(-.18, .28), 80: J(-.3, .4, 0, .3) },
    glideRake: { [-1]: J(-.22, .4), 1: J(-.22, .12, 0, .35), [-2]: J(-.16, .25), 2: J(-.16, -.12, 0, .2), 80: J(.25, -.5, 0, .2), 20: J(0, .2) },
  }),
  // The great hook (70) is drawn back and swept through; the free arm counters; the chain (31) lags.
  hookhanger: rows({
    heavySweep: { 70: J(1.0, -1.05, -.3), 71: J(-.4, .5), 31: J(.2, -.3, 0, .4) },
    pendulumSwing: { 70: J(-.6, -1.2, -.2), 71: J(-.5, -.8), [-1]: J(-.6, -.9), 1: J(-.6, -.9, 0, .15), 31: J(.3, -.6, 0, .3) },
    ledgeClimb: { 70: J(-1.6, -2.2), 71: J(-1.4, -2.0, 0, .2), [-1]: J(-.4, -.6), 1: J(-.4, -.6) },
  }),
  // The ladle (50) is swung back and round, or lifted and tipped to pour; the free arm counters.
  slagwright: rows({
    heavySweep: { 50: J(.75, -1.0, -.28), 51: J(-.35, .35), 82: J(.1, -.15) },
    slagPour: { 50: J(-.8, -.3, .15), 51: J(-.35, -.12), 82: J(.15, .25) },
  }),
  ...FOUNDRY_JOINT_POSE,
  ...CORE_JOINT_POSE,
  ...PENTAGON_JOINT_POSE,
});
export const ADVENTURE_JOINT_KINDS = new Set(Object.keys(ADVENTURE_JOINT_POSE));
const smooth = (t) => t * t * (3 - 2 * t);
// The extra angle of `swing` on `kind` for root stage/u (creatureRootPose), or null when this joint has no authored row.
export function adventureJointPose(kind, swing, attack, style, stage, u, amp = 1) {
  const table = ADVENTURE_JOINT_POSE[kind];
  if (!table || !stage) return null;
  const set = typeof attack === 'string' && Object.hasOwn(table, attack) ? table[attack] : Object.hasOwn(table, style) ? table[style] : table['*'];
  const r = set ? set[swing] : undefined;
  if (!r) return null;
  const lag = r[3], v = lag > 0 ? Math.max(0, Math.min(1, (u - lag) / (1 - lag))) : u;
  let c = 0, e = 0, f = 0;
  if (stage === 1) c = smooth(Math.max(0, Math.min(1, u)));
  else if (stage === 2) { const q = 1 - v, k = 1 - q * q * q; c = 1 - k; e = k; }
  else if (stage === 3) e = 1;
  else { e = 1 - smooth(v); f = v < .45 ? Math.sin(Math.PI * v / .45) : 0; }
  return amp * (r[0] * c + r[1] * e) + (amp < 1 ? 0 : r[2] * f);
}
