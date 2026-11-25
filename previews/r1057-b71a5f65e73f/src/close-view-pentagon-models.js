// Authored Close View bodies for the Pentagon, its dungeon grotesques and its blue haunts.
// Geometry follows the original monster-render silhouettes; presentation metadata controls admission.
import { prism, bevel, taper, ellipsoid, ringLoft, verticalLoft, curvedTube, membrane, part, block } from './close-view-mesh.js?v=r1057-b71a5f65e73f';

const E5 = ellipsoid(5, 1), E6 = ellipsoid(6, 2), E8 = ellipsoid(8, 3);
const limb = (points, color, swing, px, pz, sides = 4) => part(curvedTube(points, sides), 0, 0, 0, 1, 1, 1, color, swing, px, pz);
const wing = membrane([[0,0,0],[.02,.18,.12],[-.14,.46,.08],[-.36,.65,-.05],[-.08,.20,-.10]]);
const smallWing = membrane([[0,0,0],[-.10,.30,.05],[-.26,.44,-.05],[-.05,.12,-.08]]);

// Void Walker: an ordinary traveller's scale and cloth silhouette, never an armoured giant.
// The limb pieces carry a private two-bone role consumed by close-view-models: forearms/shins
// inherit their shoulder/hip turn before bending at the elbow/knee, so the chains stay joined.
const walkerBone=(points,color,chain,segment,pivot)=>({...limb(points,color,0,pivot[0],pivot[2],3),walkerBone:{chain,segment,pivot}});
export const STILLWORKS_WALKER_MODEL=[
  // A narrow layered coat, with two independently readable tails below the waist.
  part(verticalLoft([[0,.14,0],[.01,.20,.24],[-.015,.22,.56],[.015,.18,.79]],6),0,0,.42,1,1,1,0x18151f),
  part(membrane([[.02,-.18,.78],[.08,-.20,.36],[-.03,-.055,.04],[-.08,-.02,.42]]),0,0,.02,1,1,1,0x4a4258),
  part(membrane([[.01,.18,.78],[.07,.20,.36],[-.02,.055,.04],[-.08,.02,.42]]),0,0,.02,1,1,1,0x292334),
  // Hood, recessed cosmic face and restrained violet nebula/stars.
  part(verticalLoft([[0,.19,0],[-.015,.25,.13],[-.04,.23,.32],[-.10,.14,.42]],6),-.015,0,1.08,1,1,1,0x514861),
  part(E6,.145,0,1.30,.025,.145,.145,0x090615),
  part(E5,.171,-.018,1.30,.008,.092,.075,0x5d3a83),
  block(.181,-.068,1.335,.008,.008,.008,0xe8ddff), block(.183,.047,1.275,.006,.006,.006,0xb994ee),
  block(.177,.015,1.355,.005,.005,.005,0xf7f0ff),
  // Small clasp; no breastplate, weapon or attack prop.
  part(taper,.11,0,1.03,.035,.035,.045,0x8f63ba),
];
for(const side of [-1,1]){
  const arm=side<0?'leftArm':'rightArm',shoulder=[0,side*.205,1.03],elbow=[-.03,side*.265,.77],wrist=[.04,side*.285,.53];
  STILLWORKS_WALKER_MODEL.push(
    walkerBone([[...shoulder,.052],[...elbow,.043]],side<0?0x393146:0x2c2638,arm,'upper',shoulder),
    walkerBone([[...elbow,.044],[...wrist,.032]],side<0?0x30293c:0x231e2d,arm,'lower',elbow),
    {...part(E5,wrist[0],wrist[1],wrist[2]-.015,.043,.04,.055,0x171022,0,wrist[0],wrist[2]),walkerBone:{chain:arm,segment:'lower',pivot:elbow}},
  );
  const leg=side<0?'leftLeg':'rightLeg',hip=[-.015,side*.105,.48],knee=[.025,side*.12,.26],ankle=[-.015,side*.13,.10];
  STILLWORKS_WALKER_MODEL.push(
    walkerBone([[...hip,.06],[...knee,.052]],0x17141d,leg,'upper',hip),
    walkerBone([[...knee,.052],[...ankle,.04]],side<0?0x121019:0x1c1823,leg,'lower',knee),
    {...part(taper,.005,side*.13,.075,.075,.075,.105,side<0?0x121019:0x1d1926,0,.005,.075),walkerBone:{chain:leg,segment:'lower',pivot:knee}},
  );
}

// Shared bake-once shapes for the refined bodies (2026-11-14 refinement pass). Every shape is plain triangles, baked once.
const tri3 = prism(3), hex = prism(6), cone6 = prism(6, .22), E68 = ellipsoid(6, 3);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// Wind each triangle of a closed solid so its face normal points away from `c`.
const outward = (tris, c) => tris.map((t) => {
  const n = cross3(sub(t[1], t[0]), sub(t[2], t[0])), m = [(t[0][0] + t[1][0] + t[2][0]) / 3 - c[0], (t[0][1] + t[1][1] + t[2][1]) / 3 - c[1], (t[0][2] + t[1][2] + t[2][2]) / 3 - c[2]];
  return n[0] * m[0] + n[1] * m[1] + n[2] * m[2] >= 0 ? t : [t[0], t[2], t[1]];
});
// A Z-axis primitive turned to face +X (a disc, a lens, a blade).
const axisX = (shape) => outward(shape.map((t) => t.map(([x, y, z]) => [z, y, x])), [0, 0, 0]);
// A three-sided spike (4 triangles) from a base centre to a tip: horns, fangs, crystal shards, halo knives, claws.
function spike(base, tip, r) {
  const d = sub(tip, base), l = Math.hypot(...d) || 1, u = d.map((q) => q / l), seed = Math.abs(u[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
  let a = cross3(u, seed); const al = Math.hypot(...a); a = a.map((q) => q / al); const b = cross3(u, a);
  const p = [0, 1, 2].map((i) => { const t = i * Math.PI * 2 / 3; return base.map((q, k) => q + (Math.cos(t) * a[k] + Math.sin(t) * b[k]) * r); });
  const c = base.map((q, k) => q + d[k] * .25);
  return outward([[p[0], p[1], tip], [p[1], p[2], tip], [p[2], p[0], tip], [p[0], p[2], p[1]]], c);
}
const spikes = (list) => list.flatMap(([b, t, r]) => spike(b, t, r));
const twoSided = (tris) => tris.flatMap((t) => [t, [t[0], t[2], t[1]]]);
// A row of flat teeth (two-sided triangles) along an authored polyline of gum points, each pointing along `dir`.
function teeth(gum, dir, len) {
  const out = [];
  for (let i = 0; i < gum.length - 1; i++) { const a = gum[i], b = gum[i + 1], m = a.map((q, k) => (q + b[k]) / 2 + dir[k] * len); out.push([a, b, m]); }
  return twoSided(out);
}
// A point on the front of an ellipsoid body (centre cx/cz, radii rx/ry/rz) at lateral y and height z, lifted off its facets.
const front = (cx, cz, rx, ry, rz, y, z, lift = .012) => cx + rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2 - ((z - cz) / rz) ** 2)) + lift;
const mirrorY = (tris) => tris.map((t) => [t[0], t[2], t[1]].map(([x, y, z]) => [x, -y, z]));

// Weeping Saint (standard view: a pale bell-robed statue, veiled head, both hands over the face, red tears). The robe flares to
// the floor like a plinth instead of standing on dark legs; long sleeved arms end in hands that cover the face at rest.
const saintHand = ellipsoid(5, 2), saintStone = 0xc9c1b4, saintShade = 0xa79f93, saintPale = 0xe2dbcf, saintTear = 0x8a1a1a;
// Realms pass (2026-11-15): the bowed head and veil ride their own neck joint (82), so the head lifts as the hands tear away and
// snaps down into the blow; the robe bows forward from the hips and the sleeves hang wide from sculpted shoulders.
const saintNeck = [.08, 1.34];
const weepingSaint = [
  part(verticalLoft([[0, .40, 0], [-.04, .30, .42], [.0, .21, .88], [.08, .17, 1.24]], 6), 0, 0, 0, 1, 1, 1, saintStone),
  part(E6, .16, 0, 1.50, .17, .16, .17, saintPale, 82, ...saintNeck, 0, true),
  // the veil falls from the crown down the back of the head to the shoulders
  part(membrane([[.20, 0, 1.72], [.07, -.23, 1.53], [-.13, -.17, 1.14], [-.13, .17, 1.14], [.07, .23, 1.53]]), 0, 0, 0, 1, 1, 1, saintShade, 82, ...saintNeck),
  // a cloak train behind the hem
  part(membrane([[-.12, 0, .90], [-.32, -.22, .30], [-.44, -.10, 0], [-.44, .10, 0], [-.32, .22, .30]]), 0, 0, 0, 1, 1, 1, saintShade),
];
for (const side of [-1, 1]) weepingSaint.push(
  // red tears run from beneath the covering hands down the cheeks
  part(membrane([[.33, side * .04, 1.44], [.33, side * .08, 1.44], [.32, side * .065, 1.25]]), 0, 0, 0, 1, 1, 1, 0xb01c1c, 82, ...saintNeck),
  limb([[.02, side * .21, 1.24, .085], [.16, side * .31, 1.36, .062], [.30, side * .13, 1.47, .042]], saintShade, side < 0 ? 50 : 51, .03, 1.25),
  part(saintHand, .335, side * .065, 1.50, .05, .065, .09, saintPale, side < 0 ? 50 : 51, .03, 1.25, 0, true),
);

// Hanged Choir (standard view: four pale shrouded bodies hung by cords from a dark beam, green eyes, toes dangling). Each singer
// is a hooded head over one wrapped shroud, lamp-green eyes and a dark open singing mouth, swinging from its own cord (32-35).
// 2026-11-15 forms pass: a head and shoulders of its own instead of one sack.
const hangedChoir = [block(0, 0, 1.86, .07, .64, .05, 0x151312), limb([[0, 0, 2.03, .03], [0, 0, 1.88, .025]], 0x6b6358, 31, 0, 1.86)];
for (let i = 0; i < 4; i++) {
  const y = (i - 1.5) * .30, swing = 32 + i, top = 1.60 - (i % 2) * .06, shroud = i % 2 ? 0xc6bba3 : 0xd8cfb8, hood = i % 2 ? 0xd8cfb8 : 0xe6dfcc;
  hangedChoir.push(
    part(curvedTube([[0, y, 1.82, .014], [.01, y, top - .02, .012]], 3), 0, 0, 0, 1, 1, 1, 0x8b8172, swing, .01, 1.82),
    part(ellipsoid(4, 1), .02, y, top - .1, .1, .095, .11, hood, swing, .01, 1.82, 0, true),
    part(verticalLoft([[0, .075, 0], [-.012, .13, -.26], [-.025, .025, -.74]], 5), .02, y, top - .17, 1, 1, 1, shroud, swing, .01, 1.82),
    part(membrane([[.12, y - .03, top - .135], [.12, y + .03, top - .135], [.115, y, top - .175]]), 0, 0, 0, 1, 1, 1, 0x241c18, swing, .01, 1.82),
    part(membrane([[.115, y - .072, top - .07], [.118, y - .018, top - .078], [.114, y - .045, top - .112]]), 0, 0, 0, 1, 1, 1, 0xd1e86a, swing, .01, 1.82),
    part(membrane([[.118, y + .018, top - .078], [.115, y + .072, top - .07], [.114, y + .045, top - .112]]), 0, 0, 0, 1, 1, 1, 0xd1e86a, swing, .01, 1.82),
    part(curvedTube([[.0, y, top - .9, .022], [.05, y, top - 1.0, .01]], 3), 0, 0, 0, 1, 1, 1, 0x5b5550, swing, .01, 1.82),
  );
}

// Grave Lantern (standard view: a peaked iron cage on a chain, green glass, a white flame-face, two glowing green orbs below).
const lanternIron = 0x1b1e24, lanternBar = 0x4d5560;
const graveLantern = [
  limb([[0, 0, 1.92, .022], [.02, 0, 1.77, .02], [0, 0, 1.62, .018]], lanternBar, 31, 0, 1.55),
  part(taper, 0, 0, 1.50, .25, .25, .11, lanternIron, 31, 0, 1.55),
  part(hex, 0, 0, 1.37, .27, .26, .04, 0x2a2e36, 31, 0, 1.55),
  part(bevel, 0, 0, .74, .29, .27, .08, lanternIron, 31, 0, 1.55),
  part(hex, 0, 0, 1.06, .22, .21, .29, 0x9dff8a, 31, 0, 1.55),
  // the flame-face burns on the front pane: a white diamond with two dark eyes
  part(membrane([[.197, 0, 1.30], [.197, -.10, 1.07], [.197, 0, .84], [.197, .10, 1.07]]), 0, 0, 0, 1, 1, 1, 0xe9ffd9, 31, 0, 1.55),
  part(membrane([[.20, -.06, 1.12], [.20, -.015, 1.12], [.20, -.035, 1.08]]), 0, 0, 0, 1, 1, 1, 0x16301a, 31, 0, 1.55),
  part(membrane([[.20, .015, 1.12], [.20, .06, 1.12], [.20, .035, 1.08]]), 0, 0, 0, 1, 1, 1, 0x16301a, 31, 0, 1.55),
];
for (const [bx, by] of [[.20, -.18], [.20, .18], [-.20, -.18], [-.20, .18]]) graveLantern.push(part(curvedTube([[bx, by, .80, .02], [bx, by, 1.36, .02]], 3), 0, 0, 0, 1, 1, 1, lanternBar, 31, 0, 1.55));
for (const side of [-1, 1]) graveLantern.push(
  limb([[0, side * .22, .70, .016], [.05, side * .35, .47, .012]], lanternBar, 34 + side, 0, .70, 3),
  part(E5, .06, side * .37, .39, .07, .07, .08, 0x9dff8a, 34 + side, 0, .70, 0, true),
);

// Mirror Shade (standard view: a silver robed cone, a round cracked mirror for a face, a thin arm levelling a white blade).
// Two silver arms, a blade on the near hand and three orbiting mirror shards keep the original planes' identity.
const silver = 0x9aa3b5, silverLight = 0xc9d3e2, mirrorFace = 0xdff3ff, shadeCore = 0x262a35;
const mirrorShade = [
  part(cone6, 0, 0, .48, .24, .24, .46, silver, 0, 0, .48),
  part(axisX(hex), .03, 0, 1.12, .03, .17, .17, mirrorFace, 44, 0, .94),
  part(membrane([[.066, -.09, 1.22], [.066, .01, 1.10], [.066, .07, .99], [.066, .015, 1.10]]), 0, 0, 0, 1, 1, 1, shadeCore, 44, 0, .94),
  limb([[0, -.10, .86, .035], [.12, -.21, .74, .03], [.28, -.20, .76, .025]], silverLight, 36, 0, .86, 3),
  part(spike([.30, -.20, .76], [.32, -.20, .84], .035), 0, 0, 0, 1, 1, 1, shadeCore, 36, 0, .86),
  part(axisX(taper), .56, -.20, .76, .26, .012, .035, mirrorFace, 36, 0, .86),
  limb([[0, .10, .86, .035], [.06, .20, .66, .03], [.14, .20, .50, .02]], silver, 37, 0, .86, 3),
];
for (let i = 0; i < 3; i++) {
  const a = (i * 2 + 1) * Math.PI / 3, y = Math.sin(a) * .38, z = .82 + Math.cos(a) * .40;
  mirrorShade.push(part(membrane([[0, -.08, -.12], [.012, .085, -.10], [.05, .075, .11], [-.012, -.07, .13]]), -.12, y, z, 1, 1, 1, i % 2 ? silverLight : mirrorFace, [40, 41, 43][i], -.12, .89));
}

// The Amalgam (standard view: a lumpy pale-flesh mound, several small screaming faces set in it, thin pale limbs splayed out).
// 2026-11-15 forms pass: three fused lumps instead of one ball, sallow flesh with darker folds, the faces as swollen knots
// with a howling mouth and one eye each, six jointed arms and two stunted ones.
const fleshHead = ellipsoid(5, 2), flesh = 0xbfa09a, fleshShade = 0x86686a, fleshFace = 0xdcc2b8, fleshMouth = 0x3a1a1c, fleshLimb = 0xcfb4ac;
const amalgam = [
  part(ellipsoid(7, 2), -.05, 0, .56, .5, .42, .38, flesh, 0, -.05, .56, 0, true),
  part(ellipsoid(5, 2), -.24, .06, .84, .3, .28, .25, fleshShade, 0, -.24, .84, 0, true),
];
for (const [y, z, s, swing] of [[-.17, .74, .13, 56], [.2, .8, .12, 57], [.04, .5, .11, 56]]) { const x = front(-.05, .56, .46, .39, .35, y, z, 0) - s * .25; amalgam.push(
  part(fleshHead, x, y, z, s * .75, s, s * 1.2, fleshFace, swing, .10, .70, 0, true),
  part(membrane([[x + s * .74, y - s * .38, z - s * .15], [x + s * .74, y + s * .38, z - s * .15], [x + s * .78, y, z - s * .85]]), 0, 0, 0, 1, 1, 1, fleshMouth, swing, .10, .70),
  part(membrane([[x + s * .7, y - s * .5, z + s * .5], [x + s * .7, y - s * .12, z + s * .48], [x + s * .72, y - s * .3, z + s * .22]]), 0, 0, 0, 1, 1, 1, fleshMouth, swing, .10, .70),
); }
for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
  const x = .24 - i * .26, s = 50 + i * 2 + (side > 0 ? 1 : 0), reach = i === 0 ? .22 : i === 1 ? .03 : -.16;
  amalgam.push(limb([[x, side * .32, .56, .055], [x + reach, side * .62, .5, .04], [x + reach * 1.3, side * .76, .03, .016]], i === 1 ? fleshShade : fleshLimb, s, x, .56, 3));
}

// Gnawing Maw (standard view: a brick wall set with an oval red maw, a ring of white teeth and a dark throat).
const mawFlesh = 0x7a2e33, mawTooth = 0xeee3cc;
const lipTeeth = (from, to, n) => Array.from({ length: n + 1 }, (_, i) => { const a = from + (to - from) * i / n; return [.13, Math.cos(a) * .39, .72 + Math.sin(a) * .30]; });
const gnawingMaw = [
  block(-.30, 0, .665, .08, .64, .585, 0x4a3a2e),
  part(ringLoft([[0, .40, 0], [.10, .44, 0], [.20, .34, 0]], 8), -.08, 0, .72, 1, 1, .78, mawFlesh, 0, -.08, .72),
  part(E6, -.12, 0, .72, .10, .32, .25, 0x1a0a0b),
  part(axisX(taper), .02, 0, .58, .17, .08, .04, 0xb8404a, 21, -.26, .44),
  part(teeth(lipTeeth(.25, Math.PI - .25, 8), [-.02, 0, -1], .10), 0, 0, 0, 1, 1, 1, mawTooth, 20, -.26, 1.00),
  part(teeth(lipTeeth(Math.PI + .3, Math.PI * 2 - .3, 7), [-.02, 0, 1], .09), 0, 0, 0, 1, 1, 1, mawTooth, 21, -.26, .44),
];
for (let i = 0; i < 4; i++) {
  const a = (i + .5) * Math.PI / 2, cy = Math.cos(a), cz = Math.sin(a);
  gnawingMaw.push(limb([[.08, cy * .40, .72 + cz * .33, .04], [.22, cy * .58, .72 + cz * .46, .028], [.30, cy * .66, .72 + cz * .60, .01]], mawFlesh, 55 + i, -.08, .72, 3));
}

// Cinder Seraph (standard view: an ember-bright oval body, a pale face with a closed eye, a knife halo and six golden wings).
// The halo spins on the Close View effect clock (axialSpin; still in Reduced Motion).
const seraphEmber = 0xe9824e, seraphGold = 0xffc35a, seraphPale = 0xffe6b0, seraphAsh = 0xa8452c;
const halo = [];
for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, cy = Math.cos(a), cz = Math.sin(a); halo.push(...spike([-.04, cy * .21, 1.26 + cz * .21], [-.04, cy * .33, 1.26 + cz * .33], .04)); }
const seraphWing = membrane([[0, 0, 0], [.04, .16, .14], [-.06, .36, .20], [-.20, .56, .14], [-.36, .68, -.02], [-.30, .48, -.10], [-.10, .20, -.10]]);
const seraphSmall = membrane([[0, 0, 0], [-.06, .26, .06], [-.20, .42, -.02], [-.18, .30, -.10], [-.05, .10, -.08]]);
const cinderSeraph = [
  part(E8, 0, 0, .74, .17, .15, .36, seraphEmber, 0, 0, .74, 0, true),
  part(E5, .13, 0, .80, .06, .08, .17, 0xfff3c9, 0, .13, .80, 0, true),
  part(E6, .05, 0, 1.26, .14, .13, .15, seraphPale, 0, .05, 1.26, 0, true),
  part(membrane([[.192, -.06, 1.265], [.192, .06, 1.265], [.19, .06, 1.25], [.19, -.06, 1.25]]), 0, 0, 0, 1, 1, 1, 0x2d120c),
  { ...part(halo, 0, 0, 0, 1, 1, 1, seraphGold, 0, -.04, 1.26), axialSpin: true },
  part(ringLoft([[-.025, .22, 0], [.025, .22, 0]], 10), -.04, 0, 1.26, 1, 1, 1, 0xfff3c9, 0, -.04, 1.26),
  part(taper, 0, 0, .62, .11, .10, .22, seraphGold, 24, 0, .42, Math.PI),
  part(taper, -.04, 0, .68, .07, .06, .18, seraphAsh, 24, 0, .42, Math.PI),
];
for (const side of [-1, 1]) for (const level of [0, 1]) cinderSeraph.push(part(side > 0 ? seraphWing : mirrorY(seraphWing), -.08, 0, 1.06 - level * .30, 1, 1, 1, level ? seraphAsh : seraphGold, side > 0 ? 22 : 23, -.08, 1.00));
for (const side of [-1, 1]) cinderSeraph.push(part(side > 0 ? seraphSmall : mirrorY(seraphSmall), -.05, 0, .52, 1, 1, 1, seraphAsh, side > 0 ? 22 : 23, -.08, 1.00));

// Lumen Wraith (standard view: a pale hooded shroud with a ragged hem, one great cyan lens for a face, four cyan ribbons).
// 2026-11-15 forms pass: a shroud that flares to its hem and narrows to sloped shoulders, a deep cowl (64) carrying the dark
// face and lens, two long sleeves (50/51) that reach for the bite and frame the beam, and four flat light ribbons (60-63).
const wraithShroud = 0xdcecf2, wraithHood = 0xc9e2ec, wraithFace = 0x2c3b52, wraithCyan = 0x7fe7ff;
const ribbon = (y) => { const c = [[-.16, y, .98], [-.34, y * 1.25, .52], [-.4, y * 1.55, 0]], w = [.05, .04, .015];
  return membrane([c[0].map((q, k) => k === 1 ? q - w[0] : q), c[1].map((q, k) => k === 1 ? q - w[1] : q), c[2].map((q, k) => k === 1 ? q - w[2] : q),
    c[2].map((q, k) => k === 1 ? q + w[2] : q), c[1].map((q, k) => k === 1 ? q + w[1] : q), c[0].map((q, k) => k === 1 ? q + w[0] : q)]); };
const lumenWraith = [
  part(verticalLoft([[0, .34, 0], [-.05, .27, .36], [.0, .26, .7], [.06, .17, .98]], 7), 0, 0, .3, 1, 1, 1, wraithShroud),
  part(E6, .05, 0, 1.47, .24, .2, .23, wraithHood, 64, .04, 1.26, 0, true),
  part(membrane([[.292, 0, 1.6], [.292, -.11, 1.54], [.292, -.11, 1.4], [.292, 0, 1.34], [.292, .11, 1.4], [.292, .11, 1.54]]), 0, 0, 0, 1, 1, 1, wraithFace, 64, .04, 1.26),
  part(axisX(hex), .3, 0, 1.47, .02, .09, .09, wraithCyan, 64, .04, 1.26),
  part(E5, .322, 0, 1.47, .028, .045, .045, 0xf6fdff, 64, .04, 1.26),
];
for (const side of [-1, 1]) lumenWraith.push(limb([[.04, side * .22, 1.16, .085], [.3, side * .27, .8, .03]], wraithHood, side < 0 ? 50 : 51, .04, 1.16));
for (let i = 0; i < 4; i++) lumenWraith.push(part(ribbon((i - 1.5) * .13), 0, 0, 0, 1, 1, 1, i % 2 ? wraithCyan : 0xa8eefa, 60 + i, -.16, .98));

// Veil Spinner (standard view: a dark violet abdomen with a red diamond, a small head with a cluster of pink eyes, eight dark legs
// whose knees ride above the body). The abdomen (24) tips on its waist for the web spit.
const spinnerBody = 0x3d3044, spinnerHead = 0x221a26, spinnerMark = 0xff4f70;
const veilSpinner = [
  part(E8, -.24, 0, .52, .36, .30, .28, spinnerBody, 24, -.05, .50, 0, true),
  part(membrane([[-.10, 0, .77], [-.24, -.08, .815], [-.38, 0, .77], [-.24, .08, .815]]), 0, 0, 0, 1, 1, 1, spinnerMark, 24, -.05, .50),
  part(spike([-.56, 0, .46], [-.68, 0, .42], .05), 0, 0, 0, 1, 1, 1, spinnerHead, 24, -.05, .50),
  part(E6, .16, 0, .50, .17, .16, .14, spinnerHead, 78, .04, .48, 0, true),
  part(membrane([[.325, -.075, .57], [.325, -.015, .57], [.33, -.015, .52], [.33, -.075, .52]]), 0, 0, 0, 1, 1, 1, 0xff6b8a, 78, .04, .48),
  part(membrane([[.325, .015, .57], [.325, .075, .57], [.33, .075, .52], [.33, .015, .52]]), 0, 0, 0, 1, 1, 1, 0xff6b8a, 78, .04, .48),
  part(spikes([[[.30, -.05, .43], [.34, -.04, .30], .025], [[.30, .05, .43], [.34, .04, .30], .025]]), 0, 0, 0, 1, 1, 1, 0xd8c0c8, 78, .04, .48),
];
for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
  const x = .20 - i * .10, reach = [.20, .07, -.07, -.20][i], s = 70 + i * 2 + (side > 0 ? 1 : 0);
  veilSpinner.push(limb([[x, side * .12, .50, .035], [x + reach * .7, side * .40, .78, .028], [x + reach * 1.5, side * .68, .02, .01]], i % 2 ? 0x46394c : 0x5e4c66, s, x, .50, 3));
}

// Rift Lynx (standard view: a sleek dark-navy cat, a fan of violet rift crystals over the shoulders, a white eye, a long tail).
const lynxBody = 0x343a5e, lynxDark = 0x16172b, riftViolet = 0xc58cff;
const riftLynx = [
  part(E8, -.10, 0, .62, .44, .18, .20, lynxBody, 0, -.10, .62, 0, true),
  part(E6, .41, 0, .74, .18, .13, .13, lynxDark, 84, .24, .66, 0, true),
  part(spikes([[[.38, -.07, .84], [.33, -.10, 1.00], .035], [[.38, .07, .84], [.33, .10, 1.00], .035]]), 0, 0, 0, 1, 1, 1, riftViolet, 84, .24, .66),
  part(membrane([[.56, -.075, .78], [.53, -.10, .80], [.54, -.085, .755]]), 0, 0, 0, 1, 1, 1, 0xf6f0ff, 84, .24, .66),
  part(membrane([[.56, .075, .78], [.54, .085, .755], [.53, .10, .80]]), 0, 0, 0, 1, 1, 1, 0xf6f0ff, 84, .24, .66),
  part(spikes([[[.20, 0, .78], [.14, 0, 1.02], .05], [[.10, -.06, .79], [.00, -.10, .98], .045], [[.10, .06, .79], [.00, .10, .98], .045],
    [[-.02, -.05, .79], [-.14, -.08, .94], .04], [[-.02, .05, .79], [-.14, .08, .94], .04]]), 0, 0, 0, 1, 1, 1, riftViolet),
];
for (const [x, s] of [[.20, 2], [-.30, 1]]) for (const side of [-1, 1]) riftLynx.push(limb([[x, side * .13, .56, .05], [x + (x > 0 ? .07 : -.08), side * .16, .28, .035], [x + .10, side * .17, .02, .02]], lynxBody, side * s, x, .55, 3));
for (const side of [-1, 1]) riftLynx.push(limb([[-.50, 0, .66, .04], [-.72, side * .06, .80, .03], [-.82, side * .12, 1.00, .02], [-.72, side * .16, 1.10, .008]], side < 0 ? lynxDark : riftViolet, 80 + (side > 0 ? 1 : 0), -.50, .66, 3));

// Sunderjaw (standard view: a segmented grub, a pale ribbed head segment, brown rear segments, a round forward maw ringed with
// inward gold teeth and two small gold eye slits).
const sunderjaw = [
  part(E8, 0, 0, .43, .34, .28, .27, 0xf3dcb0, 0, 0, .43, 0, true),
  part(ringLoft([[-.04, .275, 0], [.04, .275, 0]], 8), -.06, 0, .43, 1, 1, 1, 0x6a4e36, 0, 0, .43),
  part(E6, -.42, 0, .39, .28, .23, .22, 0x8a6a4f, 83, -.30, .40, 0, true),
  part(E6, -.78, 0, .34, .24, .19, .19, 0x74583f, 84, -.30, .40, 0, true),
  part(spike([-.98, 0, .33], [-1.14, 0, .30], .07), 0, 0, 0, 1, 1, 1, 0x5a4431, 84, -.30, .40),
  part(ringLoft([[0, .30, 0], [.10, .22, 0]], 8), .24, 0, .45, 1, 1, 1, 0x2e2219, 20, .08, .45),
  part(E5, .28, 0, .45, .04, .18, .18, 0x120a06, 20, .08, .45),
  part(membrane([[.25, -.17, .60], [.21, -.24, .62], [.22, -.20, .58]]), 0, 0, 0, 1, 1, 1, 0xe0b071),
  part(membrane([[.25, .17, .60], [.22, .20, .58], [.21, .24, .62]]), 0, 0, 0, 1, 1, 1, 0xe0b071),
];
{
  const fangs = [];
  for (let i = 0; i < 8; i++) { const a = (i + .5) * Math.PI / 4, cy = Math.cos(a), cz = Math.sin(a); fangs.push([[.31, cy * .25, .45 + cz * .25], [.40, cy * .08, .45 + cz * .08], .035]); }
  sunderjaw.push(part(spikes(fangs), 0, 0, 0, 1, 1, 1, 0xe0b071, 20, .08, .45));
}

// Thunderhorn (standard view: a woolly brown ram, a dark head with a glowing yellow eye, great gold horns curled round the ears and
// swept forward to battering tips, four pale legs on dark hooves).
const ramFleece = 0x7a6552, ramHead = 0x2a211b, ramHorn = 0xffd25a, ramLeg = 0xb8a890, ramHoof = 0x251d18;
const thunderhorn = [
  part(E68, -.12, 0, .74, .52, .32, .34, ramFleece, 0, -.12, .74, 0, true),
  part(E6, .42, 0, .80, .22, .19, .20, ramHead, 24, .30, .80, 0, true),
  part(membrane([[.60, -.11, .86], [.58, -.15, .87], [.59, -.13, .83]]), 0, 0, 0, 1, 1, 1, 0xfff2a0, 24, .30, .80),
  part(membrane([[.60, .11, .86], [.59, .13, .83], [.58, .15, .87]]), 0, 0, 0, 1, 1, 1, 0xfff2a0, 24, .30, .80),
];
for (const side of [-1, 1]) thunderhorn.push(part(curvedTube([[.42, side * .12, .97, .07], [.24, side * .26, 1.04, .065], [.16, side * .37, .88, .055], [.36, side * .40, .70, .04], [.87, side * .26, .80, .012]], 3), 0, 0, 0, 1, 1, 1, ramHorn, 24, .30, .80));
for (const [x, s] of [[.20, 2], [-.40, 1]]) for (const side of [-1, 1]) thunderhorn.push(
  limb([[x, side * .19, .52, .075], [x + .02, side * .21, .12, .06]], ramLeg, side * s, x, .55),
  part(tri3, x + .03, side * .21, .06, .08, .08, .06, ramHoof, side * s, x, .55),
);

// Siege Beetle (standard view: a round ochre shell with a dark seam and mottling, a dark head with an ember eye and pale
// mandibles, a dark iron mortar barrel angled up off its back).
const beetleShell = 0xb08a5a, beetleDark = 0x2a211a, beetleIron = 0x3a3a40, beetleGlow = 0xff9d4a;
const siegeBeetle = [
  part(E8, -.10, 0, .50, .50, .37, .32, beetleShell, 0, -.10, .50, 0, true),
  part(curvedTube([[.32, 0, .66, .014], [-.10, 0, .835, .014], [-.54, 0, .64, .014]], 3), 0, 0, 0, 1, 1, 1, 0x4a3524),
  part(E6, .41, 0, .44, .18, .19, .16, beetleDark, 0, .41, .44, 0, true),
  part(membrane([[.585, -.08, .50], [.575, -.12, .51], [.575, -.10, .47]]), 0, 0, 0, 1, 1, 1, beetleGlow),
  part(membrane([[.585, .08, .50], [.575, .10, .47], [.575, .12, .51]]), 0, 0, 0, 1, 1, 1, beetleGlow),
  part(bevel, -.12, 0, .94, .11, .11, .30, beetleIron, 30, -.12, .72, -.55),
  part(E5, -.12, 0, 1.23, .075, .075, .03, beetleGlow, 30, -.12, .72, -.55),
];
for (let i = 0; i < 3; i++) for (const side of [-1, 1]) { const x = .24 - i * .24; siegeBeetle.push(limb([[x, side * .24, .42, .045], [x + .04, side * .50, .24, .032], [x + .13, side * .60, .03, .014]], beetleDark, 90 + i * 2 + (side > 0 ? 1 : 0), x, .42, 3)); }
for (const side of [-1, 1]) siegeBeetle.push(limb([[.52, side * .10, .42, .035], [.70, side * .18, .40, .025], [.79, side * .07, .33, .008]], 0xffe0b0, side < 0 ? 20 : 21, .50, .42, 3));

// Gloomwisp (standard view: a head-sized ball of dark gas in a blue haze, two slanted blue eyes and a broad white-toothed grin).
const wispBody = 0x1d2340, wispPuff = 0x262d55, wispEye = 0x5aa6ff, wispTooth = 0xbfe8ff;
const wf = (y, z, lift) => front(0, .66, .28, .27, .28, y, z, lift);
const wispGum = (z0, bend) => Array.from({ length: 8 }, (_, i) => { const y = -.16 + i * .32 / 7; return [wf(y, z0 + bend * (y / .16) ** 2, .018), y, z0 + bend * (y / .16) ** 2]; });
const gloomwisp = [
  part(E8, 0, 0, .66, .30, .29, .30, wispBody, 0, 0, .66, 0, true),
  part(E6, -.14, .04, .80, .18, .22, .15, wispPuff, 0, -.14, .80, 0, true),
];
for (const side of [-1, 1]) {
  const eye = [[side * .03, .74], [side * .17, .81], [side * .19, .75], [side * .06, .69]].map(([y, z]) => [wf(y, z, .025), y, z]);
  gloomwisp.push(part(membrane(eye), 0, 0, 0, 1, 1, 1, wispEye));
}
gloomwisp.push(
  part(membrane([[wf(0, .53, .012), 0, .53], ...[-.17, -.10, 0, .10, .17].map((y, i) => [wf(y, .62 + (i % 4 ? .0 : .04), .012), y, .62 + (i % 4 ? 0 : .04)])]), 0, 0, 0, 1, 1, 1, 0x070a18, 20, .05, .66),
  part(teeth(wispGum(.62, .04), [0, 0, -1], .05), 0, 0, 0, 1, 1, 1, wispTooth, 20, .05, .66),
  part(teeth(wispGum(.545, .03).slice(1, 7), [0, 0, 1], .04), 0, 0, 0, 1, 1, 1, wispTooth, 21, .05, .66),
);
for (let i = 0; i < 3; i++) { const y = (i - 1) * .14; gloomwisp.push(limb([[-.04, y, .46, .05], [-.14, y * 1.3, .26, .03], [-.08, y * 1.6, .10, .015], [-.16, y * 1.7, .02, .006]], 0x0b0e1f, 100 + i, 0, .50, 3)); }

// Gloomgorge (standard view: a huge round ghost of dark navy gas with a spiny crown, slanted pale eyes, an ear-to-ear grin full of
// white teeth, stubby arms with hooked blue claws and two small feet).
const gorgeBody = 0x232c52, gorgeDark = 0x0c1024, gorgeTooth = 0xdff6ff, gorgeClaw = 0x6ab4ff;
const gf = (y, z, lift) => front(-.04, .74, .50, .48, .52, y, z, lift);
const gorgeGum = (n, z0, bend, w) => Array.from({ length: n + 1 }, (_, i) => { const y = -w + i * 2 * w / n; return [gf(y, z0 + bend * (y / w) ** 2, .02), y, z0 + bend * (y / w) ** 2]; });
const gloomgorge = [
  part(E8, -.04, 0, .74, .50, .48, .52, gorgeBody, 0, -.04, .74, 0, true),
  part(spikes([[[-.04, 0, 1.21], [-.20, 0, 1.33], .08], [[-.30, -.22, 1.10], [-.42, -.34, 1.28], .07], [[-.30, .22, 1.10], [-.42, .34, 1.28], .07],
    [[-.46, 0, .92], [-.68, 0, 1.02], .08], [[-.42, -.30, .70], [-.62, -.44, .74], .07], [[-.42, .30, .70], [-.62, .44, .74], .07], [[.10, 0, 1.21], [.14, 0, 1.32], .06]]), 0, 0, 0, 1, 1, 1, gorgeDark),
  part(membrane([[gf(0, .66, .02), 0, .66], ...[-.36, -.22, 0, .22, .36].map((y, i) => [gf(y, .82 + (i % 4 ? 0 : .07), .02), y, .82 + (i % 4 ? 0 : .07)])]), 0, 0, 0, 1, 1, 1, 0x070a18, 20, .0, .76),
  part(teeth(gorgeGum(10, .82, .07, .34), [0, 0, -1], .07), 0, 0, 0, 1, 1, 1, gorgeTooth, 20, .0, .76),
  part(teeth(gorgeGum(8, .68, .04, .26), [0, 0, 1], .06), 0, 0, 0, 1, 1, 1, gorgeTooth, 21, .0, .76),
];
for (const side of [-1, 1]) {
  const eye = [[side * .06, .98], [side * .24, 1.06], [side * .27, 1.01], [side * .09, .94]].map(([y, z]) => [gf(y, z, .025), y, z]);
  gloomgorge.push(part(membrane(eye), 0, 0, 0, 1, 1, 1, 0x7fe7ff));
  const sw = side < 0 ? 25 : 26;
  gloomgorge.push(
    limb([[.05, side * .42, .66, .09], [.24, side * .56, .46, .07], [.38, side * .58, .32, .045]], gorgeBody, sw, 0, .70),
    limb([[.38, side * .58, .34, .035], [.52, side * .60, .30, .025], [.58, side * .56, .18, .008]], gorgeClaw, sw, 0, .70, 3),
    part(spike([.40, side * .52, .30], [.50, side * .46, .18], .03), 0, 0, 0, 1, 1, 1, gorgeClaw, sw, 0, .70),
    limb([[-.20, side * .20, .34, .08], [-.18, side * .24, .04, .06]], gorgeDark, side, -.20, .38),
  );
}

export const CLOSE_VIEW_PENTAGON_MODELS = { weepingSaint, hangedChoir, graveLantern, mirrorShade, amalgam, gnawingMaw, cinderSeraph, lumenWraith, veilSpinner, riftLynx, sunderjaw, thunderhorn, siegeBeetle, gloomwisp, gloomgorge };
export const CLOSE_VIEW_PENTAGON_KINDS = Object.freeze(Object.keys(CLOSE_VIEW_PENTAGON_MODELS));

// Attack articulation for these bodies on the shared root clock: rows in the ADVENTURE_JOINT_POSE format (close-view-adventure-
// models.ts, which merges this table and evaluates it): per kind, per attack id (else root style, else '*'), per pack joint,
// PJ(coil, strike, follow, lag) radians about the joint's own pivot; positive tips a forward part down and swings a hanging part
// back. The lead limb loads in the coil, is at full extension as the hit resolves and follows through as the body settles.
const PJ = (coil, strike, follow = 0, lag = 0) => Object.freeze([coil, strike, follow, lag]);
const P = (o) => Object.freeze(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Object.freeze(v)])));
const spinnerLegs = (front, mid, rear) => ({ 70: front, 71: front, 72: mid, 73: mid, 74: rear, 75: rear, 76: rear, 77: rear });
const beetleLegs = (front, rest) => ({ 90: front, 91: front, 92: rest, 93: rest, 94: rest, 95: rest });
export const PENTAGON_JOINT_POSE = Object.freeze({
  // Both covering hands tear away from the face: one long arm drives the stab, both rake down in the sweep.
  // The head (82) lifts out of the hands in the coil, then snaps down into the blow and sags as it settles.
  weepingSaint: P({
    longStab: { 51: PJ(-1.05, .78, .28), 50: PJ(-.3, .2, .05, .2), 82: PJ(-.35, .3, .1) },
    clawSweep: { 50: PJ(-1.35, 1.55, .4), 51: PJ(-1.1, 1.35, .4, .2), 82: PJ(-.4, .45, .15, .1) },
    '*': { 50: PJ(-.5, .7, .15), 51: PJ(-.5, .7, .15, .1), 82: PJ(-.2, .25) },
  }),
  // The singers swing back on their cords in the dive and whip through after it; they lift apart to scatter sigils.
  hangedChoir: P({
    diveBomb: { 31: PJ(-.1, .3, -.2), 32: PJ(-.2, .5, -.45), 33: PJ(-.25, .55, -.5, .08), 34: PJ(-.3, .6, -.55, .16), 35: PJ(-.35, .65, -.6, .24) },
    // The sigils: the outer singers kick up and apart, the inner pair rock back, then all four fling forward in a ripple.
    sigilScatter: { 31: PJ(-.1, .2), 32: PJ(.55, -.7, .2), 33: PJ(-.4, .6, -.15, .1), 34: PJ(.4, -.6, .15, .2), 35: PJ(-.55, .7, -.2, .3) },
    '*': { 31: PJ(-.1, .15), 32: PJ(.3, -.45, .1), 33: PJ(-.3, .45, -.1, .1), 34: PJ(.3, -.45, .1, .2), 35: PJ(-.3, .45, -.1, .3) },
  }),
  // The cage rears back on its chain and pitches its flame-face forward; the orbs trail behind it.
  graveLantern: P({ '*': { 31: PJ(-.35, .45, .15), 33: PJ(.4, -.5, -.15, .2), 35: PJ(.4, -.5, -.15, .3) } }),
  // The blade arm (36) draws high and cuts down the line; the off hand and the mirror face counter; the shards fan and close.
  mirrorShade: P({
    longStab: { 36: PJ(-1.0, .12, .22), 37: PJ(.45, -.55), 44: PJ(-.2, .25), 40: PJ(.3, -.35), 41: PJ(-.3, .35), 43: PJ(.3, -.35, 0, .2) },
    // Clones: the blade is raised to the ceiling like a conductor's baton, the face tips up, and the shards fan wide on the cue.
    mirrorClones: { 36: PJ(-1.45, -.7, .2), 37: PJ(-.9, -1.2), 44: PJ(-.3, -.35), 40: PJ(-.6, .9, .1), 41: PJ(.6, -.9, -.1), 43: PJ(-.6, .9, .1, .15) },
    // Swap: the blade crosses the chest, the face turns down, the shards close round the body and burst open as it changes place.
    mirrorSwap: { 36: PJ(.7, .95, -.2), 37: PJ(-.6, .3), 44: PJ(.35, -.3), 40: PJ(.55, -.8), 41: PJ(-.55, .8), 43: PJ(.55, -.8, 0, .1) },
    '*': { 36: PJ(-.6, -1.25, .1), 37: PJ(-.4, -.95), 44: PJ(.12, -.25), 40: PJ(.45, -.55), 41: PJ(-.45, .55), 43: PJ(.45, -.55, 0, .2) },
  }),
  // The faces (56/57) rear back and lunge out to bite; the limbs (50-55) gather under the mass and shove it forward.
  amalgam: P({
    bite: { 56: PJ(-.42, .5, .18), 57: PJ(-.38, .46, .18, .1), 50: PJ(-.45, .6, .1), 51: PJ(-.45, .6, .1, .06), 52: PJ(.15, -.25), 53: PJ(.15, -.25), 54: PJ(.35, -.5, 0, .2), 55: PJ(.35, -.5, 0, .2) },
    // The bloom: front arms reach up and forward, rear arms up and back, the faces strain upward, then everything slams down
    // and out as the flesh bursts. The brood birth: the arms dig in and the faces turn down to the floor as the mass heaves.
    fleshBloom: { 56: PJ(-.4, .32, .14), 57: PJ(-.36, .3, .14, .1), 50: PJ(-.95, .4, .15), 51: PJ(-.95, .4, .15, .05), 52: PJ(-.55, .3), 53: PJ(.55, -.3), 54: PJ(.9, -.35, -.1, .1), 55: PJ(.9, -.35, -.1, .15) },
    broodBirth: { 56: PJ(.4, -.5, -.1), 57: PJ(.4, -.5, -.1, .1), 50: PJ(.35, -.6), 51: PJ(.35, -.6, 0, .08), 52: PJ(.3, -.4), 53: PJ(.3, -.4, 0, .08), 54: PJ(-.4, .5, 0, .15), 55: PJ(-.4, .5, 0, .2) },
    '*': { 56: PJ(-.3, -.5), 57: PJ(-.3, -.5, 0, .1), 50: PJ(-.4, -.55), 51: PJ(-.4, -.55), 52: PJ(.3, -.45), 53: PJ(-.3, .45), 54: PJ(.4, -.6, 0, .2), 55: PJ(.4, -.6, 0, .2) },
  }),
  // The jaws gape and slam; the inhale holds them wide while the feelers reach out and drag in.
  gnawingMaw: P({
    bite: { 20: PJ(-.7, .25, .12), 21: PJ(.7, -.25, -.12), 55: PJ(.35, -.45), 56: PJ(.35, -.45), 57: PJ(-.35, .45), 58: PJ(-.35, .45) },
    // Devour: the lips peel wide and hold; the feelers reach out over the floor, then haul in as the pull ends.
    devourPull: { 20: PJ(-.4, -.55), 21: PJ(.4, .55), 55: PJ(-.75, .55, .2, .1), 56: PJ(-.75, .55, .2, .15), 57: PJ(.75, -.55, -.2, .2), 58: PJ(.75, -.55, -.2, .25) },
    '*': { 20: PJ(-.25, -.32), 21: PJ(.25, .32), 55: PJ(-.6, .5, 0, .2), 56: PJ(-.6, .5, 0, .25), 57: PJ(.6, -.5, 0, .3), 58: PJ(.6, -.5, 0, .35) },
  }),
  // Wings cup forward before the dive and sweep back to streamline it, then flare to brake; the cast lifts and beats down.
  cinderSeraph: P({
    diveBomb: { 22: PJ(-.45, .8, -.55), 23: PJ(-.45, .8, -.55, .08), 24: PJ(-.25, .7, -.3) },
    // Firefall: the wings rise and spread back to gather, then beat forward together to throw the fire, the tail flicking up.
    firefall: { 22: PJ(.75, -.95, .25), 23: PJ(.75, -.95, .25, .1), 24: PJ(.4, -.55, .15) },
    '*': { 22: PJ(.6, -.6, .2), 23: PJ(.6, -.6, .2, .08), 24: PJ(.25, -.35) },
  }),
  // The hooded lens rears and snaps down to bite or aims along the beam; the ribbons stream behind.
  lumenWraith: P({
    bite: { 64: PJ(-.55, .85, .25), 50: PJ(.45, -1.15, -.25), 51: PJ(.35, -1.0, -.2, .12), 60: PJ(-.3, .45, .1, .2), 61: PJ(-.3, .45, .1, .25), 62: PJ(-.3, .45, .1, .3), 63: PJ(-.3, .45, .1, .35) },
    // Beam: the lens draws back to charge, then levels down the line and holds while both sleeves rise to frame it; the ribbons
    // stream back from the recoil.
    sweepBeam: { 64: PJ(-.5, .4), 50: PJ(-.7, -1.35, .15), 51: PJ(-.7, -1.35, .15, .08), 60: PJ(-.3, .75, 0, .1), 61: PJ(.3, .65, 0, .15), 62: PJ(-.3, .65, 0, .2), 63: PJ(.3, .75, 0, .25) },
    '*': { 64: PJ(-.32, .24, .08), 50: PJ(-.7, -1.35, .15), 51: PJ(-.7, -1.35, .15, .08), 60: PJ(-.2, .55, 0, .1), 61: PJ(.2, .45, 0, .15), 62: PJ(-.2, .45, 0, .2), 63: PJ(.2, .55, 0, .25) },
  }),
  // Spit: the abdomen cocks up and the body kicks back on release. Bite: forelegs rear, head and fangs drive down. Leap: all
  // legs fold for the spring and splay in the air.
  veilSpinner: P({
    webSpit: { 24: PJ(.3, -.2, .1), 78: PJ(.25, -.35, .1), ...spinnerLegs(PJ(.2, -.35), PJ(.1, -.15), PJ(-.15, .2)) },
    bite: { 78: PJ(-.45, .7, .2), 24: PJ(.2, -.15), ...spinnerLegs(PJ(-.55, .45, .1), PJ(-.2, .2), PJ(.15, -.2)) },
    leapSlam: { 24: PJ(.2, -.3), 78: PJ(-.2, .3), ...spinnerLegs(PJ(.35, -.6, .15), PJ(.2, -.4), PJ(-.35, .55)) },
    '*': { 78: PJ(-.3, .4), 24: PJ(.15, -.15), ...spinnerLegs(PJ(-.3, .3), PJ(-.1, .1), PJ(.1, -.15)) },
  }),
  // A raking forepaw (lead -2, then 2) with the hind legs loading and driving; the head dips into the blow; the tail streams.
  riftLynx: P({
    clawSweep: { [-2]: PJ(-1.0, .7, .2), 2: PJ(-.55, .4, .1, .2), [-1]: PJ(.25, -.35), 1: PJ(.25, -.35), 84: PJ(-.25, .4, .1), 80: PJ(.3, -.4, 0, .3), 81: PJ(-.25, .35, 0, .35) },
    // Blink: it sinks low and coils every leg under it, the head pinned flat; the strike is both forepaws thrown out together.
    blinkStrike: { [-2]: PJ(.45, -.95, .25), 2: PJ(.45, -.95, .25), [-1]: PJ(-.45, .55), 1: PJ(-.45, .55), 84: PJ(.3, -.2, .1), 80: PJ(-.4, .5, 0, .2), 81: PJ(-.4, .5, 0, .25) },
    '*': { [-2]: PJ(-.65, .55, .15), 2: PJ(-.65, .55, .15, .1), [-1]: PJ(.35, -.5), 1: PJ(.35, -.5), 84: PJ(-.2, .35), 80: PJ(.4, -.3, 0, .3), 81: PJ(.4, -.3, 0, .35) },
  }),
  // Segments coil behind the head and snap through after it; the maw gapes and clamps.
  sunderjaw: P({
    bite: { 20: PJ(-.45, .4, .15), 83: PJ(.3, -.35, .1, .2), 84: PJ(.45, -.55, .15, .35) },
    // The ambush: the tail segments drive down and the maw bursts up out of the ground, then whips back over.
    burrowAmbush: { 20: PJ(.3, -.55, .2), 83: PJ(-.4, .5, -.1, .15), 84: PJ(-.55, .7, -.15, .3) },
    '*': { 20: PJ(-.3, .3, .1), 83: PJ(.25, -.3, .1, .2), 84: PJ(.35, -.45, .15, .35) },
  }),
  // Ram: forehooves paw, hind legs load, the head drops the horns and tosses after the hit. Stomp: forequarters rise and slam.
  thunderhorn: P({
    ramCharge: { 24: PJ(.35, .5, -.35), [-2]: PJ(-.45, .3), 2: PJ(-.25, .3, 0, .15), [-1]: PJ(.35, -.35), 1: PJ(.35, -.35) },
    shockwave: { [-2]: PJ(-.9, .45, .1), 2: PJ(-.9, .45, .1, .05), [-1]: PJ(.3, -.3), 1: PJ(.3, -.3), 24: PJ(-.35, .45) },
    // Bite: the head tucks and hooks the horns up through the target, hind legs driving.
    bite: { 24: PJ(-.45, .75, .25), [-2]: PJ(-.25, .35), 2: PJ(-.25, .35, 0, .1), [-1]: PJ(.3, -.35), 1: PJ(.3, -.35) },
    '*': { 24: PJ(-.3, .6, .15), [-2]: PJ(-.2, .3), 2: PJ(-.2, .3), [-1]: PJ(.2, -.25), 1: PJ(.2, -.25) },
  }),
  // Mortar: the barrel lowers to aim, kicks back on the shot and settles while the forelegs brace. Bite: mandibles open and snap.
  siegeBeetle: P({
    mortarVolley: { 30: PJ(.3, -.55, .2), 20: PJ(.15, -.1), 21: PJ(-.15, .1), ...beetleLegs(PJ(-.15, .35), PJ(.1, -.2)) },
    // Bite: the mandibles splay wide, the forelegs rear and the shell tips the head down into the snap.
    bite: { 20: PJ(-.7, .4, .12), 21: PJ(.7, -.4, -.12), 30: PJ(.15, -.2), ...beetleLegs(PJ(-.4, .45, .1), PJ(.12, -.18)) },
    '*': { 20: PJ(-.5, .3, .1), 21: PJ(.5, -.3, -.1), 30: PJ(.1, -.15), ...beetleLegs(PJ(-.25, .35), PJ(.1, -.15)) },
  }),
  // The grin gapes and clamps; the tail of gas whips behind it.
  gloomwisp: P({
    bite: { 20: PJ(-.35, .15), 21: PJ(.35, -.15), 100: PJ(.3, -.4, 0, .1), 101: PJ(.3, -.45, 0, .2), 102: PJ(.3, -.4, 0, .3) },
    // Bewilder: the grin stretches wide in a slow leer while the plume curls up under it, then snaps out behind.
    wispBewilder: { 20: PJ(-.4, -.25), 21: PJ(.4, .25), 100: PJ(-.6, .7, .2, .1), 101: PJ(.6, -.7, -.2, .2), 102: PJ(-.6, .7, .2, .3) },
    '*': { 20: PJ(-.2, -.3), 21: PJ(.2, .3), 100: PJ(-.4, .5, 0, .1), 101: PJ(.4, -.5, 0, .2), 102: PJ(-.4, .5, 0, .3) },
  }),
  // Hooked arms wind back and rake through in turn; the inhale and howl hold the grin wide with the arms flung out.
  gloomgorge: P({
    // Overhand rakes: each hooked arm is hauled up over the crown and whipped down through the target, the second a beat behind.
    clawSweep: { 25: PJ(-1.7, -.55, 1.0), 26: PJ(-1.3, -.5, .9, .2), 20: PJ(-.25, .15), 21: PJ(.25, -.15), [-1]: PJ(.15, -.2), 1: PJ(.15, -.2) },
    // Devour: both arms reach far out, then scoop back to the belly while the grin gapes and holds.
    devourPull: { 25: PJ(-.75, -.35, .7), 26: PJ(-.75, -.35, .7, .08), 20: PJ(-.35, -.55), 21: PJ(.35, .55) },
    // Howl: the arms are flung up and back, the grin opens to its widest, the feet brace.
    gorgeHowl: { 25: PJ(-1.1, -1.8, .2), 26: PJ(-1.1, -1.8, .2, .05), 20: PJ(-.4, -.6), 21: PJ(.4, .6), [-1]: PJ(.2, -.25), 1: PJ(.2, -.25) },
    leapSlam: { 25: PJ(-1.1, .55, .2), 26: PJ(-1.1, .55, .2, .05), [-1]: PJ(.35, -.4), 1: PJ(.35, -.4) },
    '*': { 20: PJ(-.25, -.4), 21: PJ(.25, .4), 25: PJ(-.3, -.75, .15), 26: PJ(-.3, -.75, .15, .1) },
  }),
});
