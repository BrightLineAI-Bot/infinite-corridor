// Raw recipes are RGB meshes; compiled vertices add explicit scalar alpha for the GPU model stream.
import { MESH_FLOATS, prism, box, bevel, flare, taper, ellipsoid, ringLoft, verticalLoft, curvedTube, membrane, part, block } from './close-view-mesh.js?v=r1089-87311fcf2b47';
import { CLOSE_VIEW_ARCOLOGY_MODELS } from './close-view-arcology-models.js?v=r1089-87311fcf2b47';
import { CLOSE_VIEW_FOUNDRY_MODELS, CLOSE_VIEW_FOUNDRY_VARIANTS, foundryPaletteColor } from './close-view-foundry-models.js?v=r1089-87311fcf2b47';
import { CLOSE_VIEW_PENTAGON_MODELS, STILLWORKS_WALKER_MODEL } from './close-view-pentagon-models.js?v=r1089-87311fcf2b47';
import { CLOSE_VIEW_ADVENTURE_MODELS, ADVENTURE_JOINT_KINDS, adventureJointPose } from './close-view-adventure-models.js?v=r1089-87311fcf2b47'; // adventure creatures
import { CLOSE_VIEW_PLAYER_FORM_MODELS, CLOSE_VIEW_SKIFF_MODEL, CLOSE_VIEW_POWER_SUIT_ARMOR, CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES, CLOSE_VIEW_WAYFARER_KIT, CLOSE_VIEW_WAYFARER_KIT_TRIANGLES, CLOSE_VIEW_SUIT_KIT, CLOSE_VIEW_SUIT_KIT_TRIANGLES } from './close-view-player-forms.js?v=r1089-87311fcf2b47';
import { CLOSE_VIEW_COMPANION_MODELS, CLOSE_VIEW_EFFECT_MODELS } from './close-view-companion-models.js?v=r1089-87311fcf2b47';
import { PLAYER_FORM_HANDS, CLOSE_VIEW_RIFLE_GRIP, closeViewHandRoles, closeViewHeldScale, cleaverCutMotion, CLEAVER_FOUR_SWEEP, sampleMeleeActionPose, sampleDrinkPose, sampleShovelDigPose, stonePlaceWeight, cacheReachWeight, chestOpenWeight } from './close-view-player-presentation.js?v=r1089-87311fcf2b47';
import { ACTION_MOTION, sampleToolActionMotion, primaryVisualStage } from './action-motion.js?v=r1089-87311fcf2b47';
import { CLOSE_VIEW_SHADOW_FORMS } from './close-view-shadow-forms.js?v=r1089-87311fcf2b47';
import { HERO_GREAT_SWEEP, MIRAGE_BLADE_MODELS, writeMirageBladeModel } from './close-view-sweep-gear.js?v=r1089-87311fcf2b47'; // the Great Sweep's broken greatsword and the Mirage of Blades' three blades (2026-11-14)
import { CREATURE_MOTION, creatureMotion, motionCarry } from './creature-motion.js?v=r1089-87311fcf2b47'; // the shared creature motion layers (2026-11-15)
export { MESH_FLOATS } from './close-view-mesh.js?v=r1089-87311fcf2b47';
export const MODEL_FLOATS = 10;
const DRINK_POSE={weight:0,sip:0,arm:0,head:0};
const cloth = 0x64786b, leather = 0x303934, bronze = 0xbf9a64, visor = 0xc7e6c6;
const ash = 0x87503f, coal = 0x372927, ember = 0xf3a55c;
const bark = 0x626c50, darkBark = 0x373e2d, root = 0xb6a06b;
const bone = 0xb7ad91, sinew = 0x625550, crawlerEye = 0xd88f80;
const plate = 0x78434a, iron = 0x3a2a32, brass = 0xc6a46f;
const leanBevel = prism(5, .81), leanFlare = prism(5, 1.45), detailPrism = prism(3);

// Swing groups are left/right leg (+/-1), left/right arm (+/-2), cape (3), coil segments (4/5), and hound tail (6).
// The hood's opening faces +X. Its rolled edge frames a recessed face.
const hoodProfile = [
  [0, .23], [-.116, .191], [-.162, .082], [-.146, -.06],
  [0, -.153], [.146, -.06], [.162, .082], [.116, .191],
];
const hoodBack = hoodProfile.map(([y, z]) => [-.133, y * .68, 1.45 + z * .79]);
const hoodEdge = hoodProfile.map(([y, z]) => [.127 + .27 * z, y, 1.45 + z]);
const hoodWell = hoodProfile.map(([y, z]) => [.105, y * .75, 1.45 + z * .65]);
const hoodShell = [], hoodLining = [], hoodFace = [];
for (let i = 0; i < hoodProfile.length; i++) {
  const j = (i + 1) % hoodProfile.length;
  hoodShell.push([hoodBack[i], hoodBack[j], hoodEdge[j]], [hoodBack[i], hoodEdge[j], hoodEdge[i]]);
  hoodLining.push([hoodEdge[i], hoodEdge[j], hoodWell[j]], [hoodEdge[i], hoodWell[j], hoodWell[i]]);
}
for (let i = 1; i < hoodProfile.length - 1; i++) {
  hoodShell.push([hoodBack[0], hoodBack[i + 1], hoodBack[i]]);
  hoodFace.push([hoodWell[0], hoodWell[i], hoodWell[i + 1]]);
}

const frontPatch = [
  [[0, -1, -1], [0, 1, -1], [0, 1, 1]],
  [[0, -1, -1], [0, 1, 1], [0, -1, 1]],
];
const coat = 0x303934, coatHem = 0x28312e, hoodLiningGreen = 0x46594c;
const faceShadow = 0x232522, amber = 0xf3a55c, satchelLeather = 0x67533b;
const player = [
  // Rounded shoulder-to-waist loft and three separate coat panels replace the old stacked block torso.
  part(verticalLoft([[0,.14,-.24],[.01,.20,-.06],[-.02,.17,.18],[-.04,.12,.29]], 6), 0, 0, 1.02, 1, 1, 1, coat, 0, 0, 1.02, 0, true),
  part(membrane([[0,-.03,.15],[-.05,-.20,-.31],[-.14,-.06,-.42],[.02,.01,-.13]]), -.02, 0, .83, 1, 1, 1, coatHem, 3, -.02, .98),
  part(membrane([[0,-.02,.13],[-.09,.02,-.34],[-.02,.19,-.39],[.04,.05,-.10]]), -.03, 0, .82, 1, 1, 1, coatHem, 3, -.03, .98),
  part(membrane([[0,-.12,.11],[-.10,-.26,-.27],[-.03,-.18,-.40],[.05,-.05,-.10]]), -.05, 0, .82, 1, 1, 1, cloth, 3, -.05, .98),
  part(hoodShell, 0, 0, 0, 1, 1, 1, cloth),
  part(hoodLining, 0, 0, 0, 1, 1, 1, hoodLiningGreen),
  part(hoodFace, 0, 0, 0, 1, 1, 1, faceShadow),
  part(frontPatch, .165, 0, 1.23, 1, .031, .022, bronze),
  block(.007, .228, .831, .105, .063, .09, satchelLeather),
];
for (const side of [-1, 1]) {
  player.push(
    part(frontPatch, .108, side * .048, 1.464, 1, .022, .011, amber),
    part(bevel, -.005, side * .115, .353, .104, .079, .353, coat, side, 0, .71, 0, true),
    block(.044, side * .115, .076, .12, .077, .076, leather, side, 0, .71),
    part(bevel, -.014, side * .25, .984, .073, .082, .211, coat, side * 2, 0, 1.19, -.14, true),
  );
}
player.push(
  block(.131, -.25, .771, .092, .074, .03, bronze, -2, 0, 1.19),
  part(taper, .155, -.25, 1.085, .035, .059, .315, bronze, -2, 0, 1.19),
);

// A short two-tone emitter for the ranged stance. It shares the Wayfarer's arm pivot.
// Native held tools are baked smaller about the hand (CLOSE_VIEW_HELD_GEAR scale); the last
// part carries the muzzle point in the same pivot-relative mesh space.
function scaledHeld(parts,k,cx,cy,cz,muzzle=null){return parts.map((p,index)=>{const mesh=Float32Array.from(p.mesh),ox=cx-p.px,oz=cz-p.pz;for(let i=0;i<mesh.length;i+=MESH_FLOATS){mesh[i]=ox+(mesh[i]-ox)*k;mesh[i+1]=cy+(mesh[i+1]-cy)*k;mesh[i+2]=oz+(mesh[i+2]-oz)*k;}
  const heldTool=Float32Array.of(ox,oz);return index===parts.length-1&&muzzle?{...p,mesh,heldTool,muzzle:Float32Array.of(ox+(muzzle[0]-cx)*k,cy+(muzzle[1]-cy)*k,oz+(muzzle[2]-cz)*k)}:{...p,mesh,heldTool};});}
const emitterGear = [
  block(.161, -.25, .783, .163, .066, .052, iron, -2, 0, 1.19),
  block(.303, -.25, .783, .043, .052, .046, bronze, -2, 0, 1.19),
  part(frontPatch, .349, -.25, .783, 1, .033, .032, visor, -2, 0, 1.19),
];
const playerTool = [...player.slice(0, -2), ...scaledHeld(emitterGear, closeViewHeldScale('emitter'), 0, -.25, .783, [.355, -.25, .783])];
const playerUnarmed = player.slice(0, -2);
// The Shadow Clone as a wraith (Tim, 2026-11-12: "a boxy version of the character, it should be more of a wraith... I
// like the spectral-ness, maybe make it a little more visible... it needs a visual rework so it looks like a spectre").
// The Wayfarer's hood and sleeves on a hooded shroud: a void where the face is, framed by a lit violet edge with two
// lit eyes and a faint rune at the heart (0xc58cff, an entry of close-view-gl.ts CLOSE_VIEW_ACTOR_LOOK.emissive), a robe
// that flares from the waist (the cape group, so it sways), a torn hem and five trailing wisps (groups 50-54, which
// drift) in place of legs. Its own colours; writeCloseViewModel's old `shadow` recolour leaves it alone. Within the
// 256-triangle model budget (MODEL_MAX_VERTICES).
const wraithShroud = 0x1d1428, wraithRobe = 0x2a1e3d, wraithWisp = 0x3b2a5c, wraithVoid = 0x050309, wraithGlow = 0xc58cff;
const playerWraith = [
  part(hoodShell, 0, 0, 0, 1, 1, 1, wraithShroud),
  part(hoodLining, 0, 0, 0, 1, 1, 1, wraithGlow),
  part(hoodFace, 0, 0, 0, 1, 1, 1, wraithVoid),
  part(verticalLoft([[0,.15,-.10],[.01,.20,.04],[-.02,.17,.22],[-.04,.11,.31]], 6), 0, 0, 1.0, 1, 1, 1, wraithShroud, 0, 0, 1.0, 0, true),
  part(verticalLoft([[-.01,.155,.10],[0,.175,-.10],[-.03,.225,-.34],[-.06,.28,-.56]], 7), 0, 0, .92, 1, 1, 1, wraithRobe, 3, 0, .98, 0, true),
  part(frontPatch, .168, 0, 1.17, 1, .018, .055, wraithGlow),
];
for (const side of [-1, 1]) playerWraith.push(
  part(frontPatch, .108, side * .046, 1.462, 1, .024, .012, wraithGlow),
  part(bevel, -.014, side * .25, .984, .078, .088, .211, wraithShroud, side * 2, 0, 1.19, -.14, true),
  part(membrane([[-.06, side * .25, .80], [.07, side * .27, .79], [-.02, side * .29, .66]]), 0, 0, 0, 1, 1, 1, wraithWisp, side * 2, 0, 1.19, -.14),
);
for (let i = 0; i < 8; i++) { // the torn hem: ragged points below the robe's edge, turning with it
  const a = (i + .5) * Math.PI / 4, c = Math.cos(a), sn = Math.sin(a), r = .27, w = .11, d = i % 2 ? .12 : .19;
  playerWraith.push(part(membrane([[c * r - .06 - sn * w * .5, sn * r + c * w * .5, .38], [c * r - .06 + sn * w * .5, sn * r - c * w * .5, .38], [c * (r + .03) - .10, sn * (r + .03), .38 - d]]), 0, 0, 0, 1, 1, 1, wraithRobe, 3, 0, .98));
}
for (let i = 0; i < 5; i++) { // wisps instead of legs: they trail back and down to points near the floor
  const a = Math.PI * (.55 + .225 * i), x = Math.cos(a) * .2, y = Math.sin(a) * .22, back = .16 + .05 * (i % 2);
  playerWraith.push(part(curvedTube([[x, y, .42, .07], [x - back * .55, y * 1.08, .24, .04], [x - back * 1.5, y * 1.16, .05, .006]], 3), 0, 0, 0, 1, 1, 1, wraithWisp, 50 + i, x, .42));
}
// Compact original shovel: an ash shaft, iron collar and broad low-poly blade.
// It shares the existing actor/equipment stream and the canonical right-hand grip.
const shovelGear=[
  block(.17,-.25,1.18,.026,.026,.40,0x795c48,-2,0,1.19),
  block(.17,-.25,1.59,.052,.043,.055,bronze,-2,0,1.19),
  part(taper,.17,-.25,1.78,.14,.035,.17,iron,-2,0,1.19),
];
const playerShovel=[...playerUnarmed,...shovelGear];
// The source-free fallback keeps the approved body/head/feet and replaces each 20-triangle
// one-piece limb with two 12-triangle segments. Two 12-triangle fists bring it to 254 triangles.
const playerHammerStomp = playerUnarmed.filter((_,i)=>![10,12,14,16].includes(i)).map(p=>Math.abs(p.swing)===1?{...block(0,0,0,.12,.077,.076,leather),hammerPart:p.swing<0?0:1}:p);
for(let side=0;side<2;side++)playerHammerStomp.push(
  {...block(0,0,0,.09,.072,.5,coat),hammerPart:2+side*5},
  {...block(0,0,0,.082,.068,.5,coat),hammerPart:3+side*5},
  {...block(0,0,0,.065,.073,.5,coat),hammerPart:4+side*5},
  {...block(0,0,0,.060,.068,.5,coat),hammerPart:5+side*5},
  {...block(0,0,0,.074,.068,.06,leather),hammerPart:6+side*5},
);
const playerHammer = [
  ...playerUnarmed,
  part(taper, .17, -.25, 1.02, .035, .038, .34, bronze, -2, 0, 1.19),
  block(.19, -.25, 1.32, .105, .18, .085, iron, -2, 0, 1.19),
];
const playerSweep = [...playerUnarmed];
const playerMirage = [
  ...playerUnarmed,
  part(taper, .18, -.25, 1.11, .028, .048, .37, visor, -2, 0, 1.19),
  part(frontPatch, .21, -.25, 1.44, 1, .08, .025, amber, -2, 0, 1.19),
];
const playerOrrery = [
  ...playerUnarmed,
  part(bevel, .18, -.25, .86, .08, .08, .08, bronze, -2, 0, 1.19),
  part(frontPatch, .22, -.25, 1.03, 1, .035, .035, visor, -2, 0, 1.19),
  part(frontPatch, .10, -.34, 1.07, 1, .022, .022, amber, -2, 0, 1.19),
];

// Presentation silhouettes only. Gameplay reach remains PRIMARY_PROFILES in items.ts.
// Both recipes begin at the existing right-hand grip (.17,-.25,.79). This bronze pike is now the native fallback's only
// (playerCinderPike, with its pinned pose digests); the imported hero holds heroCinderPike (2026-11-14).
const cinderPike = [
  block(.17,-.25,1.43,.026,.026,.66,bronze,-2,0,1.19),
  part(taper,.17,-.25,2.19,.068,.052,.16,visor,-2,0,1.19),
  part(frontPatch,.17,-.25,2.04,1,.085,.03,ember,-2,0,1.19),
];
// Native fallback Cleaver (Tim, 2026-11-11: the blade is fine, the hilt was oversized). Same five
// parts and 40 triangles as before, in the same order: a slimmer, hand-length grip, a narrower guard
// just above the hand, and the unchanged blade section carried down to meet it. The tip stays at 1.87.
const vergeCleaver = [
  block(.17,-.25,.835,.027,.032,.075,leather,-2,0,1.19),
  block(.17,-.25,.93,.118,.022,.02,bronze,-2,0,1.19),
  part(taper,.17,-.25,1.40,.112,.009,.47,0x795c48,-2,0,1.19),
  // Narrow forged edge on both broad faces; keep the gladius outline, never an axe head.
  part(membrane([[.063,-.260,1.00],[.072,-.260,1.00],[.17,-.260,1.86]]),0,0,0,1,1,1,0xaaa69a,-2,0,1.19),
  part(membrane([[.063,-.240,1.00],[.17,-.240,1.86],[.072,-.240,1.00]]),0,0,0,1,1,1,0xaaa69a,-2,0,1.19),
];

// Imported-hero held weapons, authored in absolute recipe space around the canonical (.17,-.25,.79)
// grip with their own per-vertex normals, so round shafts shade smoothly at the same triangle cost.
// Bake-time only: frozen meshes in the part format, read by writeCloseViewHeroGear like any recipe.
// Every key dimension lives in this one table; the tests read it back against the measured hands.
export const CLOSE_VIEW_HERO_WEAPON_FORM = Object.freeze({
  // Verge Cleaver: a one-hand grip the length of the Wayfarer's fist (.114 world, .82 recipe scale),
  // a forward-swept guard just above it, an ember stone, and the accepted blade carried down to it.
  cleaver: Object.freeze({ pommel: Object.freeze([.672, .695, .718]), pommelRadius: .031, grip: Object.freeze([.718, .848]), gripRadius: .020,
    guard: Object.freeze({ z: .865, tipZ: .910, span: .150, thick: .015 }), bladeBase: .875, tip: 1.87 }),
  // Rift Bombard: a hip-held grenade launcher. The bore axis rides above the trigger fist; the drum
  // sits ahead of it where the support hand closes; the muzzle face stays at the established 1.585.
  bombard: Object.freeze({ axisX: .055, barrelRadius: .074, bore: .060, collar: Object.freeze([1.505, 1.585]), collarRadius: .088,
    drum: Object.freeze([.87, 1.20]), drumRadius: .132, grip: Object.freeze([.035, .845, .262, .735]), gripRadius: .033, support: Object.freeze([.075, -.350, -.440, .965]) }),
  // Salvage Blade: held beneath the guard like a long spike. Grip and pommel are unchanged (the hold);
  // the reskin (Tim, 2026-11-12) is a diamond spike blade, a diamond bevelled guard plate and a wrapped grip.
  salvage: Object.freeze({ grip: Object.freeze([.700, .742]), gripRadius: .018, pommel: Object.freeze([.664, .684, .700]),
    // The violin blade (Tim, 2026-11-26): two curved blades side by side, from the guard (`base`) to one point (`tip`), whose
    // outline together is the body of a violin. `outline` is [u, half-width] along the length (u 0 at the base, 1 at the point):
    // wide at the lower bout, pinched at the waist, wide again at the upper bout, closing to the point. Each blade fills its own
    // side, from `seam` beside the centre line out to the outline, a flat diamond `thick` deep (recipe X) at its middle. The
    // +Y blade is whole; the -Y blade is snapped at `broken.at` of the length (about a third), its break jagged
    // (`broken.jag`: the four corners' heights above or below the break) and bright.
    blade: Object.freeze({ axisX: .162, base: .80, tip: 1.42, seam: .005, thick: .013,
      outline: Object.freeze([[0, .040], [.14, .068], [.26, .076], [.45, .040], [.63, .060], [.82, .040], [1, 0]].map(Object.freeze)),
      whole: Object.freeze([0, .14, .26, .45, .63, .82]), // the whole blade's stations (then the point); the snapped one runs from 0 to the break
      broken: Object.freeze({ at: .30, jag: Object.freeze([.045, .025, .004, -.015]) }) }),
    guard: Object.freeze({ z: Object.freeze([.750, .788, .801]), corner: Object.freeze([.072, .102]), bevel: .62 }), pommelRadius: .024, wrapTwist: .5,
    colors: Object.freeze({ blade: 0x3f74d8, tine: 0x5b8fe6, break: 0xa9c6f2 }) }), // blue steel; the snapped face bright where it broke
  // Fourfold Daggers (2026-11-14): one short dagger in each hand, drawn once per hand socket. A wrapped grip the fist's
  // length, a narrow cross guard, a diamond blade to a needle point (a third of the Cleaver's length).
  dagger: Object.freeze({ grip: Object.freeze([.700, .800]), gripRadius: .018, pommel: Object.freeze([.672, .700]), pommelRadius: .022,
    guard: Object.freeze({ z: Object.freeze([.800, .822]), corner: Object.freeze([.016, .072]) }),
    blade: Object.freeze({ base: .822, baseWidth: .034, baseThick: .013, shoulder: .90, width: .040, thick: .014, tip: 1.19 }),
    // The green stripe (Tim, 2026-11-14: "a green horizontal stripe across the blade, on both blades"): a band across the blade's
    // width centred `at` of the way from its base to its point, `width` long along the blade (recipe units; .05 is 14% of the
    // blade), standing `lift` proud of the faces (a radial scale from the blade's axis).
    stripe: Object.freeze({ at: .5, width: .05, lift: 1.08 }) }),
  // Carbine (the Spark Coil's upgraded form, 2026-11-12): a compact carbine with a long barrel. The bore axis rides just above
  // the fist (-X is up); a short stock behind the grip, a gunmetal receiver, the barrel, a cyan coil wound round its root with a
  // collar ahead of it, and a muzzle with a lit face at `muzzle[1]` (the shot's origin, TOOL_MUZZLE_LOCAL.carbine).
  carbine: Object.freeze({ axisX: .15, grip: Object.freeze([.72, .86]), gripRadius: .023, stock: Object.freeze([.56, .72]), receiver: Object.freeze([.86, 1.10]),
    barrel: Object.freeze([1.10, 1.64]), barrelRadius: Object.freeze([.020, .017]), coil: Object.freeze([1.14, 1.36]), coilRadius: .040, collar: Object.freeze([1.36, 1.39]), collarRadius: .044,
    muzzle: Object.freeze([1.62, 1.69]), muzzleRadius: .026, bore: .014 }),
  // Quandrix Staff (2026-11-13): a long dark shaft through the fist with a wrapped grip, a brass collar, three brass prongs and
  // a lit arcane crystal between them at the head (the hands' colour). The head lies toward -Z (past the pommel side) and the
  // short butt toward +Z: the primary hand carries a blade point down, so the staff is carried head up and casts butt first.
  // Shortened (Tim, 2026-11-14: "a little bit shorter; it's really long right now", then "about the same height as he is, so
  // it looks like he could use it as a walking staff or wizard staff") from 1.79 (1.47 world, taller than the hero) to `length`
  // 1.68: 1.38 world, the hero's own height (close-view.ts draws him 1.68 x .82 tall). The head slides .07
  // toward the fist and the butt loses .04. `length` is butt to crystal point; presentation only (its hands, range and damage
  // are quandrix-staff.ts).
  staff: Object.freeze({ length: 1.68, butt: 1.20, grip: Object.freeze([.70, .90]), gripRadius: .024, shaftRadius: Object.freeze([.019, .015]), collar: Object.freeze([-.11, -.17]), collarRadius: .03,
    prongTip: -.41, prongSpread: .055, crystal: Object.freeze([-.21, -.35, -.48]), crystalRadius: .045 }),
  // Cinder Pike (Tim, 2026-11-14: "borrow the model from the staff... the same length as the Quandrix Staff is right now, but be
  // a pike. It could be wooden."): the staff's slim round shaft in wood, `length` 1.79 (the staff's length before it was shortened)
  // from butt to point. The rear hand holds it at the canonical .79 grip with `trail` of butt behind (Tim: "he holds it about
  // halfway up the shaft": .65 puts the rear hand at 36% of the shaft and the front hand near its middle); ahead, a small iron socket
  // collar and a leaf-shaped iron point, widest `leaf.wide` above its base and faceted along a midrib, its lower facets ember-lit.
  pike: Object.freeze({ length: 1.79, trail: .65, shaftRadius: Object.freeze([.019, .016]), collar: .05, collarRadius: .024,
    leaf: Object.freeze({ length: .24, wide: .095, width: .046, rib: .013 }) }),
});
const RGB = c => [(c >> 16) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
// tris: [[point, normal], x3][]. Mesh rows follow part(): position minus (px=0, pz=1.19), normal, RGB.
function heldPart(tris, color) {
  const mesh = new Float32Array(tris.length * 3 * MESH_FLOATS), [r, g, b] = RGB(color);
  let k = 0;
  for (const tri of tris) for (const [p, n] of tri) {
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    mesh[k++] = p[0]; mesh[k++] = p[1]; mesh[k++] = p[2] - 1.19; mesh[k++] = n[0] / l; mesh[k++] = n[1] / l; mesh[k++] = n[2] / l; mesh[k++] = r; mesh[k++] = g; mesh[k++] = b;
  }
  return { mesh, swing: -2, px: 0, pz: 1.19 };
}
const v3 = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  unit: a => { const l = Math.hypot(a[0], a[1], a[2]); return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 1]; } };
// A smooth tube along an authored path of [x, y, z, radiusA, radiusB?] rings. radiusA lies along
// `ref` (projected off the path), radiusB across it. A zero-radius ring is a point (a cone tip,
// one triangle per side). caps: 1 closes the first ring, 2 the last, 3 both. Outward wound.
// flat: faceted sides (each face takes its own normal), for a drum that should read as chambers.
function heldTube(path, sides, color, { ref = [1, 0, 0], caps = 0, phase = .5, flat = false } = {}) {
  const rings = path.map((q, r) => {
    const t = v3.unit(v3.sub(path[Math.min(r + 1, path.length - 1)], path[Math.max(r - 1, 0)]).slice(0, 3));
    const u = v3.unit(v3.add(ref, t, -v3.dot(ref, t))), v = v3.cross(t, u), ra = q[3], rb = q[4] ?? q[3];
    return { t, ra, rb, p: Array.from({ length: sides }, (_, i) => { const a = (i + phase) * 2 * Math.PI / sides, c = Math.cos(a), s = Math.sin(a);
      return { x: v3.add(v3.add(q, u, ra * c), v, rb * s), n: v3.unit(v3.add(v3.add([0, 0, 0], u, c / Math.max(ra, 1e-4)), v, s / Math.max(rb, 1e-4))) }; }) };
  }), tris = [];
  for (let r = 0; r + 1 < rings.length; r++) {
    const A = rings[r], B = rings[r + 1], seg = Math.hypot(...v3.sub(path[r + 1], path[r]).slice(0, 3)) || 1, slope = -((B.ra + B.rb) - (A.ra + A.rb)) / 2 / seg;
    const n = (ring, i) => v3.add(ring.p[i].n, ring.t, slope);
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      if (A.ra > 0 || A.rb > 0) tris.push([[A.p[i].x, n(A, i)], [A.p[j].x, n(A, j)], [B.p[j].x, n(B, j)]]);
      if (B.ra > 0 || B.rb > 0) tris.push([[A.p[i].x, n(A, i)], [B.p[j].x, n(B, j)], [B.p[i].x, n(B, i)]]);
    }
  }
  const cap = (ring, sign) => { const nn = v3.add([0, 0, 0], ring.t, sign); for (let i = 1; i + 1 < sides; i++) tris.push(sign > 0 ? [[ring.p[0].x, nn], [ring.p[i].x, nn], [ring.p[i + 1].x, nn]] : [[ring.p[0].x, nn], [ring.p[i + 1].x, nn], [ring.p[i].x, nn]]); };
  if (caps & 1) cap(rings[0], -1);
  if (caps & 2) cap(rings.at(-1), 1);
  if (flat) for (const t of tris) { const n = v3.cross(v3.sub(t[1][0], t[0][0]), v3.sub(t[2][0], t[0][0])); for (const q of t) q[1] = n; }
  return heldPart(tris, color);
}
// Flat-shaded faceted solid: every triangle takes its face normal, flipped to agree with `away`
// (a function of the face centroid returning the outward hint), so authored winding cannot invert light.
function heldFacets(tris, color, away) {
  return heldPart(tris.map(t => { let n = v3.cross(v3.sub(t[1], t[0]), v3.sub(t[2], t[0])); const c = [0, 1, 2].map(k => (t[0][k] + t[1][k] + t[2][k]) / 3);
    if (v3.dot(n, away(c)) < 0) { t = [t[0], t[2], t[1]]; n = n.map(x => -x); } return t.map(p => [p, n]); }), color);
}
const WAYFARER_GUNMETAL = 0x3a4246, WAYFARER_LEATHER = 0x5a4330, RIFT_SEAM = 0xc58cff;

// Verge Cleaver for the imported hero: 96 triangles. The blade keeps the accepted silhouette and
// colours (warm forged flats, a bright verge edge, the long straight edge line to a clipped point);
// it now runs down to a hand-sized hilt instead of starting above an oversized handle.
const heroVergeCleaver = (() => {
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.cleaver, X = .17, Y = -.25, G = F.guard;
  // Blade levels [z, edge dx (verge side), spine dx]. Bevels are .017/.013 wide and the flats .010 thick.
  const levels = [[F.bladeBase, -.090, .068], [1.12, -.107, .076], [1.62, -.035, .034], [F.tip, 0, 0]], bevel = [.017, .013], t = .010;
  const edge = [], flat = [];
  for (let l = 0; l + 1 < levels.length; l++) {
    const ring = ([z, e, s], tip) => tip ? Array(6).fill([X, Y, z]) : [[X + e, Y, z], [X + e + bevel[0], Y + t, z], [X + s - bevel[1], Y + t, z], [X + s, Y, z], [X + s - bevel[1], Y - t, z], [X + e + bevel[0], Y - t, z]];
    const a = ring(levels[l], false), b = ring(levels[l + 1], l + 2 === levels.length);
    const quad = (list, i, j) => { if (l + 2 === levels.length) list.push([a[i], a[j], b[j]]); else list.push([a[i], a[j], b[j]], [a[i], b[j], b[i]]); };
    quad(edge, 0, 1); quad(flat, 1, 2); quad(edge, 2, 3); quad(edge, 3, 4); quad(flat, 4, 5); quad(edge, 5, 0);
  }
  const outward = c => [0, c[1] - Y, 0];
  // A dark fuller groove on both flats, just proud of them.
  const fuller = [];
  for (const side of [1, -1]) { const y = Y + side * (t + .0006); fuller.push([[X - .012, y, .93], [X + .010, y, .93], [X - .002, y, 1.46]], [[X - .012, y, .93], [X - .002, y, 1.46], [X - .016, y, 1.40]]); }
  return Object.freeze([
    heldTube([[X, Y, F.pommel[0], 0], [X, Y, F.pommel[1], F.pommelRadius], [X, Y, F.pommel[2], F.pommelRadius * .68]], 6, brass),
    heldTube([[X, Y, F.grip[0], F.gripRadius], [X, Y, F.grip[1], F.gripRadius]], 6, WAYFARER_LEATHER),
    // Forward-swept quillons across the blade's width; flattened through its thickness.
    heldTube([[X - G.span, Y, G.tipZ, .010, .008], [X - .055, Y, G.z, .019, G.thick], [X + .055, Y, G.z, .019, G.thick], [X + G.span, Y, G.tipZ, .010, .008]], 4, WAYFARER_GUNMETAL, { ref: [0, 0, 1] }),
    part(ellipsoid(4, 1), X, Y, G.z, .024, .022, .024, ember, -2, 0, 1.19, 0, true),
    heldFacets(edge, 0xaaa69a, outward),
    heldFacets(flat, 0x795c48, outward),
    heldFacets(fuller, WAYFARER_GUNMETAL, outward),
  ]);
})();

// Future Close View tool silhouettes. These are recipe-only until the ordered tool-action pass
// selects them from accepted production events. All begin at the canonical (.17,-.25,.79) grip.
// Rift Bombard (Tim, 2026-11-11: it should look like a grenade launcher, held low at the hip with
// two hands): 96 triangles. Recipe +Z is the barrel, -X is up and +Y outward while it is fired.
// A fat bore with a blue muzzle collar and a rift-lit throat, a revolving drum with lit faces where
// the support hand closes, a raked black pistol grip through the trigger fist, a side handle for the
// support hand and a top strap back over the fist.
// Its palette (Tim, 2026-11-11: "blue accents... black and blue"): a black body and grips, a blue collar, a blue-lit throat and drum (glow is a lit actor colour, close-view-gl.ts CLOSE_VIEW_ACTOR_LOOK.emissive).
export const RIFT_BOMBARD_COLOURS = Object.freeze({ body: 0x17191e, grip: 0x101114, accent: 0x2f6fd8, glow: 0x5aa6ff });
const riftBombard = (() => {
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.bombard, C = RIFT_BOMBARD_COLOURS, X = F.axisX, Y = -.25, [g0x, g0z, g1x, g1z] = F.grip, S = F.support;
  const drumWall = heldTube([[X, Y, F.drum[0], F.drumRadius], [X, Y, F.drum[1], F.drumRadius]], 6, C.body, { phase: 0, flat: true });
  const drumFaces = [];
  for (const z of F.drum) { const ring = Array.from({ length: 6 }, (_, i) => [X + Math.cos(i * Math.PI / 3) * F.drumRadius, Y + Math.sin(i * Math.PI / 3) * F.drumRadius, z]);
    for (let i = 1; i < 5; i++) drumFaces.push([ring[0], ring[i], ring[i + 1]]); }
  const annulus = [];
  { const z = F.collar[1], o = Array.from({ length: 6 }, (_, i) => { const a = (i + .5) * Math.PI / 3; return [X + Math.cos(a) * F.collarRadius, Y + Math.sin(a) * F.collarRadius, z]; }),
    n = Array.from({ length: 6 }, (_, i) => { const a = (i + .5) * Math.PI / 3; return [X + Math.cos(a) * F.bore, Y + Math.sin(a) * F.bore, z]; });
    for (let i = 0; i < 6; i++) { const j = (i + 1) % 6; annulus.push([o[i], o[j], n[j]], [o[i], n[j], n[i]]); } }
  const bore = [];
  { const z = F.collar[1] - .004, n = Array.from({ length: 6 }, (_, i) => { const a = (i + .5) * Math.PI / 3; return [X + Math.cos(a) * F.bore, Y + Math.sin(a) * F.bore, z]; });
    for (let i = 1; i < 5; i++) bore.push([n[0], n[i], n[i + 1]]); }
  // The strap's underside clears the trigger fist (measured top at recipe x .046).
  const strapZ = [.62, F.drum[0]], strap = block(.018, Y, (strapZ[0] + strapZ[1]) / 2, .028, .030, (strapZ[1] - strapZ[0]) / 2, C.body, -2, 0, 1.19);
  return Object.freeze([
    heldTube([[g1x, Y, g1z, F.gripRadius, F.gripRadius * .75], [g0x, Y, g0z, F.gripRadius * .85, F.gripRadius * .7]], 6, C.grip, { ref: [0, 0, 1], caps: 1 }),
    strap,
    drumWall,
    heldFacets(drumFaces, C.glow, c => [0, 0, c[2] - (F.drum[0] + F.drum[1]) / 2]),
    heldTube([[X, Y, F.drum[1] - .005, F.barrelRadius], [X, Y, F.collar[0] + .005, F.barrelRadius]], 6, C.body),
    heldTube([[X, Y, F.collar[0], F.collarRadius], [X, Y, F.collar[1], F.collarRadius]], 6, C.accent),
    heldFacets(annulus, C.accent, () => [0, 0, 1]),
    heldFacets(bore, C.glow, () => [0, 0, 1]),
    heldTube([[S[0], S[1], S[3], .019], [S[0], S[2], S[3], .017]], 4, C.grip, { ref: [0, 0, 1] }),
  ]);
})();
// The Carbine's colours: gunmetal body, leather grip, and the coil and muzzle face lit cyan (0x7fe7ff is a lit actor colour,
// close-view-gl.ts CLOSE_VIEW_ACTOR_LOOK.emissive, so they glow in the dark like the beam they fire).
export const CARBINE_COLOURS = Object.freeze({ body: 0x3a4246, grip: 0x5a4330, coil: 0x7fe7ff });
const heroCarbine = (() => {
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.carbine, C = CARBINE_COLOURS, X = F.axisX, Y = -.25;
  const face = [], z = F.muzzle[1] + .001, n = Array.from({ length: 6 }, (_, i) => { const a = (i + .5) * Math.PI / 3; return [X + Math.cos(a) * F.bore * 1.4, Y + Math.sin(a) * F.bore * 1.4, z]; });
  for (let i = 1; i < 5; i++) face.push([n[0], n[i], n[i + 1]]);
  return Object.freeze([
    heldTube([[.17, Y, F.grip[0], F.gripRadius], [.17, Y, F.grip[1], F.gripRadius * 1.05]], 6, C.grip),
    block(.17, Y, (F.stock[0] + F.stock[1]) / 2, .028, .024, (F.stock[1] - F.stock[0]) / 2, C.body, -2, 0, 1.19),
    block((X + .17) / 2, Y, (F.receiver[0] + F.receiver[1]) / 2, .05, .036, (F.receiver[1] - F.receiver[0]) / 2, C.body, -2, 0, 1.19),
    heldTube([[X, Y, F.barrel[0], F.barrelRadius[0]], [X, Y, F.barrel[1], F.barrelRadius[1]]], 6, C.body),
    heldTube([[X, Y, F.coil[0], F.coilRadius], [X, Y, F.coil[1], F.coilRadius]], 6, C.coil, { flat: true, phase: 0 }),
    heldTube([[X, Y, F.collar[0], F.collarRadius], [X, Y, F.collar[1], F.collarRadius]], 6, C.body),
    heldTube([[X, Y, F.muzzle[0], F.muzzleRadius], [X, Y, F.muzzle[1], F.muzzleRadius]], 6, C.body, { caps: 1 }),
    heldFacets(face, C.coil, () => [0, 0, 1]),
  ]);
})();
// The Cinder Pike for the imported hero: 26 triangles, no more than the bronze pike it replaces. A four-sided wooden shaft
// (its butt capped) from the butt through both hands, a four-sided iron socket collar, and an 8-facet leaf point whose lower
// facets (from the collar to the widest) glow ember, the cinder. Its axis is the recipe +Z line through the canonical grip,
// so both pike hands close on the shaft.
export const CINDER_PIKE_COLOURS = Object.freeze({ shaft: 0x7a5a3c, iron: 0x8d918f, collar: 0x3a4246, ember: 0xf3a55c });
const heroCinderPike = (() => {
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.pike, C = CINDER_PIKE_COLOURS, X = .17, Y = -.25, L = F.leaf;
  const butt = .79 - F.trail, tip = butt + F.length, base = tip - L.length, neck = base - F.collar, wide = base + L.wide;
  // The leaf: base and point on the axis, its two edges at the widest level, a midrib ridge either side of the blade.
  const b = [X, Y, base], p = [X, Y, tip], e1 = [X + L.width, Y, wide], e2 = [X - L.width, Y, wide], r1 = [X, Y + L.rib, wide], r2 = [X, Y - L.rib, wide];
  const away = c => [c[0] - X, c[1] - Y, 0];
  return Object.freeze([
    heldTube([[X, Y, butt, F.shaftRadius[0]], [X, Y, neck, F.shaftRadius[1]]], 4, C.shaft, { caps: 1 }),
    heldTube([[X, Y, neck, F.collarRadius], [X, Y, base, F.collarRadius * .75]], 4, C.collar),
    heldFacets([[b, e1, r1], [e2, b, r1], [b, r2, e1], [e2, r2, b]], C.ember, away),
    heldFacets([[e1, p, r1], [p, e2, r1], [e1, r2, p], [p, r2, e2]], C.iron, away),
  ]);
})();
// The Quandrix Staff (quandrix-staff.ts): 92 triangles (the largest held gear is 96). The crystal is 0xb896cf, a lit actor colour (close-view-gl.ts emissive),
// so it glows like the hands it casts; the shaft is a dark violet wood.
export const QUANDRIX_COLOURS = Object.freeze({ shaft: 0x4a3a5c, wrap: 0x5a4330, metal: 0xc6a46f, crystal: 0xb896cf, core: 0xc58cff });
const heroQuandrixStaff = (() => {
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.staff, C = QUANDRIX_COLOURS, X = .17, Y = -.25, [c0, c1, c2] = F.crystal, r = F.crystalRadius;
  const crystal = [], tip = [X, Y, c2], foot = [X, Y, c0], ring = Array.from({ length: 4 }, (_, i) => [X + Math.cos(i * Math.PI / 2) * r, Y + Math.sin(i * Math.PI / 2) * r, c1]);
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; crystal.push([tip, ring[i], ring[j]], [foot, ring[j], ring[i]]); }
  const prongs = [0, 1, 2].map(i => { const a = i * 2 * Math.PI / 3 + Math.PI / 6, ox = Math.cos(a) * F.prongSpread, oy = Math.sin(a) * F.prongSpread;
    return heldTube([[X + ox * .45, Y + oy * .45, F.collar[1], .009], [X + ox, Y + oy, (F.collar[1] + F.prongTip) / 2, .007], [X + ox * .7, Y + oy * .7, F.prongTip, 0]], 4, C.metal, { ref: [0, 0, 1] }); });
  return Object.freeze([
    heldTube([[X, Y, F.butt - .04, F.shaftRadius[0] * 1.2], [X, Y, F.butt, 0]], 4, C.metal),
    heldTube([[X, Y, F.grip[1], F.shaftRadius[0]], [X, Y, F.butt - .04, F.shaftRadius[0]]], 6, C.shaft),
    heldTube([[X, Y, F.grip[0], F.gripRadius], [X, Y, F.grip[1], F.gripRadius]], 6, C.wrap),
    heldTube([[X, Y, F.collar[0], F.shaftRadius[1]], [X, Y, F.grip[0], F.shaftRadius[0]]], 6, C.shaft),
    heldTube([[X, Y, F.collar[1], F.collarRadius], [X, Y, F.collar[0], F.collarRadius * .8]], 4, C.metal),
    ...prongs,
    heldFacets(crystal, C.crystal, c => [c[0] - X, c[1] - Y, c[2] - c1]),
  ]);
})();
// The Quandrix Staff's spectral hands (quandrix-staff.ts quandrixHandPresentation), presentation only: model +X is the hand's
// heading and +Z up. Both colours are lit actor colours, so the hands glow in the dark. `quandrixHand` drifts upright, palm
// pushed forward and fingers splayed; `quandrixFist` is clenched; `quandrixSlam` lies palm down, fingers along the heading.
const qTube = (pts, color) => part(curvedTube(pts, 4), 0, 0, 0, 1, 1, 1, color, 0, 0, 0);
const quandrixHand = (() => {
  const G = QUANDRIX_COLOURS.crystal, K = QUANDRIX_COLOURS.core, out = [block(0, 0, .15, .028, .095, .1, G)];
  for (let i = 0; i < 4; i++) { const y = -.07 + i * .047, spread = (i - 1.5) * .05, len = i === 1 || i === 2 ? .19 : .155;
    out.push(qTube([[0, y, .24, .019], [.015, y + spread * .5, .24 + len * .55, .016], [.03, y + spread, .24 + len, .011]], K)); }
  out.push(qTube([[0, -.09, .1, .021], [.025, -.16, .17, .017], [.045, -.21, .24, .012]], K)); // the thumb
  return Object.freeze(out);
})();
const quandrixFist = (() => {
  const G = QUANDRIX_COLOURS.crystal, K = QUANDRIX_COLOURS.core, out = [block(0, 0, .16, .075, .095, .085, G)];
  for (let i = 0; i < 4; i++) out.push(block(.08, -.066 + i * .044, .2, .03, .021, .032, K)); // knuckles
  out.push(block(.045, -.105, .1, .04, .022, .025, K)); // the thumb across the fingers
  return Object.freeze(out);
})();
const quandrixSlam = (() => {
  const G = QUANDRIX_COLOURS.crystal, K = QUANDRIX_COLOURS.core, out = [block(0, 0, .03, .1, .095, .028, G)];
  for (let i = 0; i < 4; i++) { const y = -.07 + i * .047, spread = (i - 1.5) * .06, len = i === 1 || i === 2 ? .2 : .16;
    out.push(qTube([[.09, y, .03, .019], [.09 + len * .55, y + spread * .5, .025, .016], [.09 + len, y + spread, .02, .011]], K)); }
  out.push(qTube([[.02, -.09, .03, .021], [.08, -.16, .025, .017], [.13, -.2, .02, .012]], K));
  return Object.freeze(out);
})();
export const QUANDRIX_HAND_MODELS = Object.freeze({ quandrixHand, quandrixFist, quandrixSlam });
// Closed forged blade: the sharp outer ring retains the original broken outline;
// inset front/back faces provide readable thickness without changing length or reach.
const brokenGreatswordOutline = [[-1,-1],[1,-1],[.88,.50],[.30,1],[-.72,.72]];
const brokenGreatswordBlade = { face: [], edge: [] };
{
  const edge=brokenGreatswordOutline.map(([y,z])=>[0,y,z]),
    front=brokenGreatswordOutline.map(([y,z])=>[.018,y*.93,z*.93]),
    back=brokenGreatswordOutline.map(([y,z])=>[-.018,y*.93,z*.93]);
  for(let i=1;i<edge.length-1;i++)brokenGreatswordBlade.face.push([front[0],front[i],front[i+1]],[back[0],back[i+1],back[i]]);
  for(let i=0;i<edge.length;i++){const j=(i+1)%edge.length;
    brokenGreatswordBlade.edge.push([front[i],edge[i],edge[j]],[front[i],edge[j],front[j]],
      [back[i],back[j],edge[j]],[back[i],edge[j],edge[i]]);
  }
}
const greatSweep = [
  block(.17,-.25,.91,.045,.05,.14,leather,-2,0,1.19),
  block(.17,-.25,1.08,.20,.055,.045,iron,-2,0,1.19),
  part(brokenGreatswordBlade.face,.17,-.25,1.70,1,.30,.68,0x65656b,-2,0,1.19),
  part(brokenGreatswordBlade.edge,.17,-.25,1.70,1,.30,.68,0xa6a397,-2,0,1.19),
  block(.17,-.25,1.62,.016,.03,.47,bronze,-2,0,1.19),
  part(frontPatch,.17,-.25,1.13,1,.07,.025,brass,-2,0,1.19),
];
// Mirage of Blades in Close View (Tim, 2026-11-12: "we should have rendered projectiles that travel through
// the air"): one flying broken greatsword, laid flat as a rotor about its middle (model +X along the blade,
// +Y its width, +Z up through its thickness), with a stub of grip and guard at the back end. The actor's
// yaw is its spin (mirageBladePresentation in tool-forms.ts). 50 triangles, baked once.
export const MIRAGE_BLADE_FORM = Object.freeze({ length: .50, width: .21, thick: 1, grip: Object.freeze([-1.02, -1.34]) });
const mirageBlade = (() => {
  const F = MIRAGE_BLADE_FORM, flat = tris => tris.map(t => t.map(([x, y, z]) => [z, y, x]));
  return Object.freeze([
    part(flat(brokenGreatswordBlade.face), 0, 0, 0, F.length, F.width, F.thick, 0x8a8a92),
    part(flat(brokenGreatswordBlade.edge), 0, 0, 0, F.length, F.width, F.thick, 0xd8d4c6),
    block(F.length * -.98, 0, 0, .035, .19, .03, 0x6f6458),
    block((F.grip[0] + F.grip[1]) / 2 * F.length, 0, 0, (F.grip[0] - F.grip[1]) / 2 * F.length, .028, .028, 0x5a4330),
  ]);
})();
// Six-sided continuous barrel with a recessed bore and a narrow brass lip. Meshes
// are baked once; the muzzle remains at the established local Z=1.535 anchor.
const blunderbussBore = { shell: [], lip: [], inner: [], cap: [] };
{
  const ring=(radius,z)=>Array.from({length:6},(_,i)=>{const a=(i+.5)*Math.PI/3;return[Math.cos(a)*radius,Math.sin(a)*radius,z];}),
    rear=ring(.052,1.20),front=ring(.082,1.535),inside=ring(.052,1.535),deep=ring(.041,1.43);
  for(let i=0;i<6;i++){const j=(i+1)%6;
    blunderbussBore.shell.push([rear[i],rear[j],front[j]],[rear[i],front[j],front[i]]);
    blunderbussBore.lip.push([front[i],front[j],inside[j]],[front[i],inside[j],inside[i]]);
    blunderbussBore.inner.push([inside[i],inside[j],deep[j]],[inside[i],deep[j],deep[i]]);
  }
  for(let i=1;i<5;i++)blunderbussBore.cap.push([deep[0],deep[i],deep[i+1]]);
}
// Polish (2026-11-11, Tim's favourite, kept): the boxy grip block becomes a slim round wrapped grip
// whose open ends hide in the fist and receiver, and the flared barrel shades smoothly. Same bore,
// muzzle and 92 triangles.
const blunderbuss = [
  heldTube([[.17,-.25,.73,.024],[.17,-.25,.99,.026]],6,leather),
  part(bevel,.17,-.25,1.10,.087,.065,.15,0x9b8059,-2,0,1.19),
  heldTube([[.17,-.25,1.20,.052],[.17,-.25,1.535,.082]],6,iron),
  part(blunderbussBore.lip,.17,-.25,0,1,1,1,brass,-2,0,1.19),
  part(blunderbussBore.inner,.17,-.25,0,1,1,1,0x29252a,-2,0,1.19),
  part(blunderbussBore.cap,.17,-.25,0,1,1,1,0x11151b,-2,0,1.19),
  part(ellipsoid(4,1),.17,-.315,1.16,.04,.018,.07,0x58cfe8,-2,0,1.19,0,true),
  part(taper,.08,-.25,.90,.11*Math.SQRT2,.045*Math.SQRT2,.045,0x46392e,-2,0,1.19,.32),
];
const lumenSpindle = [
  block(.17,-.25,.92,.035,.04,.13,leather,-2,0,1.19),
  part(taper,.17,-.25,1.20,.034,.034,.22,bronze,-2,0,1.19),
  part(bevel,.17,-.25,1.36,.045,.045,.035,brass,-2,0,1.19),
  part(ellipsoid(6,1),.17,-.25,1.45,.075,.075,.09,visor,-2,0,1.19,0,true),
  part(bevel,.17,-.25,1.43,.068,.068,.018,bronze,-2,0,1.19),
  part(frontPatch,.17,-.25,1.55,1,.052,.025,0x8fe8ff,-2,0,1.19),
];
// Prepared visual-only recipes. Production still selects the generic emitter;
// these names do not join delayed startup, emission anchors or native form maps.
const sparkCoil = [
  block(.17,-.25,.91,.042,.05,.12,leather,-2,0,1.19),
  part(bevel,.17,-.25,1.08,.06,.06,.10,iron,-2,0,1.19),
  part(detailPrism,.17,-.25,1.15,.068,.068,.018,bronze,-2,0,1.19),
  part(detailPrism,.17,-.25,1.25,.060,.060,.018,brass,-2,0,1.19),
  part(ellipsoid(4,1),.17,-.25,1.22,.042,.042,.075,visor,-2,0,1.19,0,true),
];
const needleCaster = [
  block(.17,-.25,.91,.042,.05,.12,leather,-2,0,1.19),
  part(bevel,.17,-.25,1.08,.062,.045,.10,iron,-2,0,1.19),
  part(prism(6),.17,-.25,1.28,.025,.025,.13,0x717579,-2,0,1.19),
  part(detailPrism,.17,-.25,1.18,.050,.050,.026,bronze,-2,0,1.19),
];
// Recipe-space muzzle tips (the grip is (.17,-.25,.79); the barrel/shaft runs along +Z, except the
// generic emitter, which points along recipe +X). Every Close View shot from a held tool starts here.
const TOOL_MUZZLE_LOCAL=Object.freeze({'rift-bombard':Object.freeze([CLOSE_VIEW_HERO_WEAPON_FORM.bombard.axisX,-.25,1.585]),blunderbuss:Object.freeze([.17,-.25,1.535]),'lumen-spindle':Object.freeze([.17,-.25,1.575]),
  'spark-coil':Object.freeze([.17,-.25,1.30]),carbine:Object.freeze([CLOSE_VIEW_HERO_WEAPON_FORM.carbine.axisX,-.25,CLOSE_VIEW_HERO_WEAPON_FORM.carbine.muzzle[1]]),'needle-caster':Object.freeze([.17,-.25,1.41]),emitter:Object.freeze([.355,-.25,.783])});
const PHASED_TOOL_EMISSION=new Set(['rift-bombard','blunderbuss','lumen-spindle']);
export const closeViewHeldMuzzleLocal=(profile)=>Object.hasOwn(TOOL_MUZZLE_LOCAL,profile)?TOOL_MUZZLE_LOCAL[profile]:null;
// Uses the exact recipe grip, normalized socket axes and the .82 x held-scale conversion of
// writeCloseViewHeroGear, so the point is the drawn muzzle on the posed socket.
export function closeViewHeldMuzzlePoint(out,profile,m){const p=closeViewHeldMuzzleLocal(profile);if(!out||out.length<3||!p||!m||m.length!==16)return null;const ax=Math.hypot(m[0],m[1],m[2]),ay=Math.hypot(m[4],m[5],m[6]),az=Math.hypot(m[8],m[9],m[10]);if(Math.min(ax,ay,az)<1e-6)return null;const k=.82*closeViewHeldScale(profile),x=(p[2]-.79)*k,y=-(p[0]-.17)*k,z=-(p[1]+.25)*k;out[0]=m[12]+m[0]/ax*x+m[4]/ay*y+m[8]/az*z;out[1]=m[13]+m[1]/ax*x+m[5]/ay*y+m[9]/az*z;out[2]=m[14]+m[2]/ax*x+m[6]/ay*y+m[10]/az*z;return Number.isFinite(out[0]+out[1]+out[2])?out:null;}
// The accepted release cue keeps its phased-tool contract (simple tools have no cue).
export function closeViewToolEmissionPoint(out,profile,m){return PHASED_TOOL_EMISSION.has(profile)?closeViewHeldMuzzlePoint(out,profile,m):null;}
// Compact tapered cuff and inward thumb/knuckle cover; the final sockets keep each shell on its own hand.
const fistGauntlet=[part(taper,0,0,.012,.105,.075,.115,0xd7dde2),part(bevel,0,-.058,.028,.058,.034,.045,0xf1f4f5)];
const playerCinderPike=[...playerUnarmed.map(p=>Math.abs(p.swing)===2?{...p,pikeArm:p.swing<0?0:1}:p),...cinderPike.map(p=>({...p,pikeWeapon:true}))],
  // Keep the recipe and mesh count unchanged. The shared choreography bends the
  // existing displayed-left arm mesh at its midpoint and treats every weapon mesh as one rigid grip.
  playerVergeCleaver=[...playerUnarmed.map(p=>p.swing===-2?{...p,cleaverArm:true}:p),...vergeCleaver.map(p=>({...p,cleaverWeapon:true}))];

// The six core creature bodies (refinement pass, Tim 2026-11-14: "a couple of visual refinement passes for each creature" so
// bodies read as what they are, "without adding anything to the phone budget"). Each stays at or under its earlier triangle
// count (tests/close-view-legacy-models.test.ts pins them). Joint groups: ±1 legs, ±2 arms or forelegs, 3 cape, 4/5 coil
// segments, 6 tail, 82 head and 30 jaw (the Pallid Crawler: 30 head, 31 jaw); their attack rows are CORE_JOINT_POSE in
// close-view-arcology-models.ts.
// A part posed by `rest` about its own anchor, then carried by joint `swing` about (px, pz).
function jointed(item, swing, px, pz) {
  const mesh = item.mesh, dx = item.px - px, dz = item.pz - pz;
  for (let i = 0; i < mesh.length; i += MESH_FLOATS) { mesh[i] += dx; mesh[i + 2] += dz; }
  return { mesh, swing, px, pz };
}
const ashClaw = 0xb78a62;

// Ashling, a hunched furnace scavenger: a rounded cinder trunk split by an ember crack, a coal head thrust forward under two
// broken crown spikes and slanted ember eyes, long clawed arms and short coal legs. 158 triangles.
const ashling = [
  part(ellipsoid(6, 2), 0, 0, .64, .23, .255, .29, ash, 0, 0, .64, .14, true),
  part(membrane([[.262, .004, .84], [.262, .034, .74], [.25, -.022, .66], [.244, .03, .57], [.222, -.012, .48]]), 0, 0, 0, 1, 1, 1, ember),
  part(ellipsoid(6, 2), .13, 0, .985, .19, .19, .175, coal, 82, .04, .88, 0, true),
  jointed(part(taper, .05, -.12, 1.19, .075, .066, .14, ash, 0, .05, 1.12, -.42), 82, .04, .88),
  jointed(part(taper, .06, .12, 1.17, .075, .072, .10, ash, 0, .06, 1.12, -.30), 82, .04, .88),
];
for (const side of [-1, 1]) ashling.push(part(membrane([[.29, side * .03, .985], [.283, side * .125, 1.045], [.29, side * .11, .995]]), 0, 0, 0, 1, 1, 1, ember, 82, .04, .88));
for (const side of [-1, 1]) {
  ashling.push(
    part(curvedTube([[.03, side * .25, .86, .08], [.07, side * .33, .63, .066], [.17, side * .29, .44, .05]], 4), 0, 0, 0, 1, 1, 1, ash, side * 2, .03, .84),
    // three hooked claws fanned from the wrist
    part(membrane([[.16, side * .29, .45], [.33, side * .27, .42], [.25, side * .3, .39], [.34, side * .31, .32], [.26, side * .35, .27]]), 0, 0, 0, 1, 1, 1, ashClaw, side * 2, .03, .84),
    part(curvedTube([[0, side * .133, .39, .075], [0, side * .133, .19, .06], [.071, side * .133, .055, .035]], 4), 0, 0, 0, 1, 1, 1, coal, side, 0, .43),
  );
}

// Root Brute, a slow growth animated by buried machinery: a hunched bark trunk, a heavy head sunk between the shoulders with
// two pale knot-eyes, branch spurs rooted in the shoulders (they no longer swing with the arms), thick bark arms that swell
// into knotted club forearms ending in pale root-knot fists (2026-11-15 forms pass: limbs, not stacked lumps), and stump
// legs. 204 triangles.
const rootBrute = [
  part(ellipsoid(8, 2), 0, 0, 1.035, .32, .403, .48, bark, 0, 0, 1.035, .12, true),
  part(membrane([[.30, 0, 1.24], [.36, .09, .98], [.33, -.02, .86], [.35, -.10, 1.05]]), 0, 0, 0, 1, 1, 1, root),
  part(ellipsoid(6, 2), .26, 0, 1.39, .2, .25, .17, darkBark, 82, .12, 1.3, 0, true),
];
for (const side of [-1, 1]) rootBrute.push(
  part(membrane([[.445, side * .04, 1.43], [.43, side * .16, 1.46], [.44, side * .15, 1.40], [.445, side * .06, 1.395]]), 0, 0, 0, 1, 1, 1, root, 82, .12, 1.3),
  part(taper, -.07, side * .33, 1.55, .15, .13, .30, bark, 0, -.07, 1.28, -.38),
);
for (const side of [-1, 1]) {
  rootBrute.push(
    part(curvedTube([[.02, side * .36, 1.35, .14], [.12, side * .5, .97, .105]], 6), 0, 0, 0, 1, 1, 1, bark, side * 2, .04, 1.27), // rooted in the trunk (solidity pass 2: no gap at the shoulder)
    part(curvedTube([[.11, side * .5, 1.0, .1], [.22, side * .51, .64, .14]], 6), 0, 0, 0, 1, 1, 1, darkBark, side * 2, .04, 1.27),
    part(curvedTube([[-.045,side*.209,.70,.11],[-.045,side*.209,.36,.10],[.046,side*.209,.10,.07]],5),0,0,0,1,1,1,darkBark,side,-.04,.71),
    part(ellipsoid(6, 1), .25, side * .51, .53, .16, .17, .15, root, side * 2, .04, 1.27, 0, true),
  );
}

// Pallid Crawler, "too many joints, no eyes, and a mouth where a face should be": a long floor-hugging back, an eyeless head
// whose face is a wet maw behind a hinged jaw and a row of teeth, and four spider-high limbs (the forelegs with a joint too many). 168.
const pallidCrawler = [
  part(ringLoft([[-.50,.08,-.13],[-.20,.25,0],[.18,.22,.01],[.42,.10,-.08]],6), 0, 0, .48, 1, 1, 1, bone, 0, -.17, .50, 0, true),
  part(ellipsoid(5, 2), .31, 0, .43, .22, .2, .17, bone, 30, .2, .45, 0, true),
  part(membrane([[.505, -.085, .42], [.505, .085, .42], [.485, .065, .33], [.485, -.065, .33]]), 0, 0, 0, 1, 1, 1, crawlerEye, 30, .2, .45),
  part(membrane([[.512, -.08, .425], [.515, -.05, .365], [.513, -.015, .42], [.516, .02, .36], [.514, .05, .41], [.512, .08, .425]]), 0, 0, 0, 1, 1, 1, 0xe3d6cf, 30, .2, .45),
  part(ringLoft([[0,.12,-.04],[.15,.10,0],[.27,.03,.02]],4), .33, 0, .31, 1, 1, 1, sinew, 31, .30, .37),
];
for (const side of [-1, 1]) {
  pallidCrawler.push(
    // the forelegs carry one joint more than a leg should: up to a high knuckle, out, down to a second knee, then to a point
    part(curvedTube([[.16,side*.19,.42,.055],[.27,side*.33,.62,.045],[.41,side*.43,.55,.038],[.50,side*.46,.29,.03],[.57,side*.45,.03,.016]],3),0,0,0,1,1,1,bone,side*2,.14,.48),
    part(curvedTube([[-.30,side*.19,.42,.055],[-.42,side*.36,.58,.045],[-.56,side*.42,.28,.034],[-.47,side*.44,.03,.016]],3),0,0,0,1,1,1,sinew,-side,-.34,.45),
  );
}

// Hollow Marshal: crimson armour, a crested helm with a brass visor slit, a cape, and a halberd carried at guard - shaft up
// and forward from the fist, a brass leaf blade and a back axe - so its long reach thrusts point first.
// Brass gorget and iron tasset plates, armoured legs bent at the knee. 220 triangles.
const marshalHand = [.04, -.41, .94], marshalDir = [.47, .883];
// The halberd is drawn at .8 of its first length so its blade stays inside the Marshal's contact height (actor-contact.ts).
const marshalAt = (k0, n = 0, k = k0 * .8) => [marshalHand[0] + marshalDir[0] * k + marshalDir[1] * n, marshalHand[1], marshalHand[2] + marshalDir[1] * k - marshalDir[0] * n];
const hollowMarshal = [
  part(verticalLoft([[0,.22,-.42],[-.01,.35,-.12],[0,.31,.25],[-.02,.18,.43]],6), 0, 0, 1.18, 1, 1, 1, plate, 0, 0, 1.18, 0, true),
  part(verticalLoft([[0,.31,-.40],[-.02,.28,.05],[-.05,.12,.46]],5), -.215, 0, .97, 1, 1, 1, iron, 3, -.21, 1.412, .08, true),
  part(ellipsoid(6, 1), .04, 0, 1.737, .234, .243, .247, iron, 82, .02, 1.6, 0, true),
  part(detailPrism,.226,0,1.737,.047,.147,.057,brass,82,.02,1.6),
  part(detailPrism,.275,0,1.745,.006,.105,.017,iron,82,.02,1.6),
  part(membrane([[.235,0,1.36],[.235,.13,1.33],[.245,.1,1.17],[.24,0,1.11],[.245,-.1,1.17],[.235,-.13,1.33]]), 0, 0, 0, 1, 1, 1, brass),
  part(membrane([[.215,-.21,.92],[.215,.21,.92],[.25,.18,.69],[.25,-.18,.69]]), 0, 0, 0, 1, 1, 1, iron),
];
for (const side of [-1, 1]) {
  hollowMarshal.push(
    jointed(part(taper, .002, side * .132, 2.025, .096, .063, .16, brass, 0, 0, 1.951, -.19), 82, .02, 1.6),
    // The halberd arm (group 32) holds the polearm at guard and keeps it out of the walking swing; the free arm walks (+2).
    part(curvedTube([[0,side*.34,1.43,.10],[.03,side*.41,1.14,.075],[.04,side*.41,.94,.055]],4),0,0,0,1,1,1,iron,side<0?32:side*2,0,1.46),
    part(curvedTube([[.02,side*.15,.80,.105],[.075,side*.155,.45,.08],[.03,side*.155,.16,.06],[.1,side*.155,.05,.05]],4),0,0,0,1,1,1,plate,side,0,.831),
  );
}
{
  const butt = marshalAt(-.35), top = marshalAt(1.05), tip = marshalAt(1.44), mid = marshalAt(1.2), y = marshalHand[1];
  hollowMarshal.push(
    part(curvedTube([[...butt, .03], [...top, .026]], 4), 0, 0, 0, 1, 1, 1, iron, 33, marshalHand[0], marshalHand[2]),
    part(membrane([top, marshalAt(1.2, -.07), tip, marshalAt(1.2, .07)]), 0, 0, 0, 1, 1, 1, brass, 33, marshalHand[0], marshalHand[2]),
    part(membrane([top, [mid[0], y - .07, mid[2]], tip, [mid[0], y + .07, mid[2]]]), 0, 0, 0, 1, 1, 1, brass, 33, marshalHand[0], marshalHand[2]),
    part(membrane([marshalAt(.91), marshalAt(1.07), marshalAt(1.07, .2), marshalAt(.88, .17)]), 0, 0, 0, 1, 1, 1, brass, 33, marshalHand[0], marshalHand[2]),
  );
}

// Ashen Hound: a low charcoal body, a rust head on its own neck joint with pointed ears, lit eyes and a hinged lower jaw, and a
// tail, raised hackles and hind legs bent at stifle and hock. 216 triangles.
const houndFur = 0x765244, houndDark = 0x302724, houndEye = 0xc18a63;
const ashenHound = [
  part(ellipsoid(8, 2), -.072, 0, .449, .395, .204, .173, houndDark, 0, -.072, .449, .09, true),
  part(ellipsoid(6, 2), .215, 0, .495, .177, .21, .223, houndFur, 0, .215, .495, -.34, true),
  part(ellipsoid(6, 1), .388, 0, .581, .177, .146, .133, houndFur, 82, .27, .55, 0, true),
  part(ringLoft([[0,.10,-.05],[.15,.08,0],[.25,.025,.02]],5),.43,0,.55,1,1,1,houndFur,82,.27,.55),
  part(detailPrism, .64, 0, .575, .045, .06, .035, houndDark, 82, .27, .55),
  jointed(part(taper, .52, 0, .475, .045, .065, .13, houndDark, 0, .52, .475, Math.PI / 2), 30, .44, .5),
  part(taper, -.484, 0, .574, .076, .074, .216, houndFur, 6, -.354, .477, -.95),
  // raised hackles along the nape and shoulders
  part(membrane([[.08, 0, .6], [.2, 0, .73], [.29, 0, .69], [.33, 0, .6]]), 0, 0, 0, 1, 1, 1, houndDark),
];
// Ears and eyes ride the head (82). Each side's foreleg keeps its place in the vertex order (tests/close-view-tube-volume).
const houndEar = (side) => part(membrane([[.30, side * .06, .655], [.37, side * .12, .665], [.315, side * .14, .80]]), 0, 0, 0, 1, 1, 1, houndFur, 82, .27, .55);
const houndEyeSlit = (side) => part(membrane([[.505, side * .065, .615], [.475, side * .12, .635], [.465, side * .13, .62], [.49, side * .11, .598]]), 0, 0, 0, 1, 1, 1, houndEye, 82, .27, .55);
ashenHound.push(houndEar(-1), houndEar(1), houndEyeSlit(-1));
for (const side of [-1, 1]) {
  ashenHound.push(
    part(curvedTube([[.235,side*.131,.43,.045],[.24,side*.131,.20,.036],[.29,side*.131,.035,.022]],4),0,0,0,1,1,1,houndDark,side*2,.237,.45),
    // the hind leg bends at the stifle and the hock, so it loads like a dog's
    part(curvedTube([[-.29,side*.135,.43,.065],[-.22,side*.135,.26,.045],[-.33,side*.132,.13,.03],[-.29,side*.13,.03,.022]],4),0,0,0,1,1,1,houndDark,-side,-.299,.432),
  );
}
ashenHound.push(houndEyeSlit(1));

// Coil Stalker, a hooded serpent reared on its own coils: a banded neck rising from the first coil to a long flat head with
// mint eye slits and a hinged jaw, a hood spread behind it, pale belly scales down the neck's front, and two trailing coils
// (groups 4 and 5) that lag behind every strike. The neck, hood and head turn as one striking column about the neck's root
// (group 82; the jaw 83 about the same root), so a strike drives the whole column, not just the head. 164 triangles.
const coilShell = 0x47716d, coilDark = 0x263a39, coilLight = 0x87c0ad, coilRoot = [-.09, .24];
const coilStalker = [
  part(curvedTube([[-.13, 0, .2, .185], [-.04, 0, .37, .16], [.05, 0, .54, .13], [.12, 0, .64, .105]], 6), 0, 0, 0, 1, 1, 1, coilDark, 82, ...coilRoot),
  part(membrane([[.215, -.06, .57], [.215, .06, .57], [.16, .1, .33], [.16, -.1, .33]]), 0, 0, 0, 1, 1, 1, coilLight, 82, ...coilRoot),
  part(membrane([[.07, 0, .64], [.04, -.12, .5], [.05, -.21, .58], [.08, -.24, .73], [.09, 0, .86], [.08, .24, .73], [.05, .21, .58], [.04, .12, .5]]), 0, 0, 0, 1, 1, 1, coilShell, 82, ...coilRoot),
  part(ellipsoid(6, 2), .25, 0, .7, .25, .16, .12, coilShell, 82, ...coilRoot, 0, true),
  jointed(part(taper, .31, 0, .625, .05, .1, .14, coilLight, 0, .31, .625, Math.PI / 2), 83, ...coilRoot),
];
for (const side of [-1, 1]) coilStalker.push(part(membrane([[.425, side * .07, .735], [.37, side * .13, .755], [.34, side * .14, .745], [.39, side * .115, .715]]), 0, 0, 0, 1, 1, 1, coilLight, 82, ...coilRoot));
coilStalker.push(
  part(ellipsoid(6, 2), -.294, 0, .262, .232, .217, .192, coilShell, 4, -.294, .262, 0, true),
  part(ringLoft([[0,.20,-.04],[.01,.23,0],[.02,.20,.04]],5),-.375,0,.263,1,1,1,coilLight,4,-.375,.263,0,true),
  part(ellipsoid(6, 1), -.599, 0, .168, .225, .16, .144, coilDark, 5, -.599, .168, 0, true),
  part(ringLoft([[0,.14,-.03],[.01,.17,0],[.02,.14,.03]],5),-.686,0,.169,1,1,1,coilLight,5,-.686,.169,0,true),
);

// Static held-part variants reuse the authored body. Move only existing tool meshes to each form's grip;
// they stay in the same bounded actor submission (the widest robot plus emitter is exactly 256 triangles).
const heldParts = { melee:player.slice(-2),fist:[],emitter:playerTool.slice(playerUnarmed.length),hammer:playerHammer.slice(playerUnarmed.length),sweep:[],mirage:playerMirage.slice(playerUnarmed.length),'orrery-tap':playerOrrery.slice(playerUnarmed.length),'orrery-release':playerOrrery.slice(playerUnarmed.length) };
const playerFormModels = Object.fromEntries(Object.entries(CLOSE_VIEW_PLAYER_FORM_MODELS).flatMap(([kind,body])=>Object.entries(heldParts).map(([profile,parts])=>{
  const hand=PLAYER_FORM_HANDS[kind];
  const held=parts.map(p=>{const mesh=Float32Array.from(p.mesh);for(let i=0;i<mesh.length;i+=MESH_FLOATS){mesh[i]+=p.px+hand.x-.161-hand.px;mesh[i+1]+=hand.y+.25;mesh[i+2]+=p.pz+hand.z-.783-hand.pz;}return {...p,mesh,px:hand.px,pz:hand.pz};});
  return [`${kind}:${profile}`,[...body,...held]];
})));

// Small auxiliary bodies share the actor batch and its cap. Their source producers retain all effects.
const nativeOrb=[part(ellipsoid(8,3),0,0,0,1,1,1,0xb9a6ff,0,0,0,0,true),part(ellipsoid(6,2),.80,0,0,.30,.35,.35,0xf2eeff,0,0,0,0,true)];
const corridorDrone=[part(ellipsoid(8,2),0,0,0,.34,.26,.20,0xb9c2ca,0,0,0,0,true),part(ellipsoid(6,2),.27,0,0,.10,.12,.10,0x14202a,0,0,0,0,true),part(ellipsoid(5,1),.35,0,0,.035,.065,.065,0x5fd6f0,0,0,0,0,true),block(0,0,.10,.055,.54,.035,0x4b525a)];
for(const side of [-1,1])corridorDrone.push(part(ellipsoid(6,1),0,side*.53,.15,.24,.08,.025,0xd8e6ee,0,0,0,0,true),block(0,side*.53,.11,.04,.04,.06,0x3a4048));
for(const side of [-1,1])corridorDrone.push({...part(curvedTube([[0,side*.17,-.18,.02],[0,side*.32,-.54,.02],[.02,side*.24,-.70,.02]],4),0,0,0,1,1,1,0x6f7880),carryingOnly:true});
for(const y of [-.085,0,.085])corridorDrone.push(part(ellipsoid(4,1),-.10,y,-.20,.05,.04,.045,0xe0623c,0,0,0,0,true));
const elderParts=CLOSE_VIEW_COMPANION_MODELS.elderWanderer.slice(0,6).map((p,index)=>{const mesh=Float32Array.from(p.mesh),mapZ=z=>index===0?.924+(z-.68)*(2.2-.924)/1.14:index===1?z+.34:z*.924/.76,pz=mapZ(p.pz);for(let i=0;i<mesh.length;i+=MESH_FLOATS){mesh[i+2]=mapZ(mesh[i+2]+p.pz)-pz;const zScale=index===0?(2.2-.924)/1.14:index===1?1:.924/.76,nz=mesh[i+5]/zScale,n=Math.hypot(mesh[i+3],mesh[i+4],nz)||1;mesh[i+3]/=n;mesh[i+4]/=n;mesh[i+5]=nz/n;}return {...p,mesh,pz};});
const companions={...CLOSE_VIEW_COMPANION_MODELS,elderWanderer:elderParts};
const reciterBase=CLOSE_VIEW_COMPANION_MODELS.dungeonReciter;
for(const look of ['pilgrim','mercenary','minstrel','scholar','traveler','cartographer']){
  const parts=reciterBase.filter((_,i)=>i!==3&&i!==4);
  if(look==='scholar'||look==='cartographer')parts.push(reciterBase[3],part(ellipsoid(6,1),.13,0,1.44,.26,.25,.035,0x5f6f92,0,.13,1.31,0,true));
  if(look==='pilgrim')parts.push(reciterBase[4]);
  if(look==='mercenary')parts.push(block(.20,.34,.77,.035,.035,.45,0xc9cfe6,2,.03,1.06),block(.20,.34,1.24,.06,.06,.06,0xd8d2c4,2,.03,1.06));
  if(look==='minstrel')parts.push(part(ellipsoid(6,2),.33,.12,.86,.10,.15,.17,0xc9cfe6,2,.03,1.06,0,true),block(.33,.12,1.10,.025,.035,.14,0x2f3550,2,.03,1.06));
  companions['dungeonReciter:'+look]=parts;
} // exact rule cells are the residual panel, never generic bars

// Tim, 2026-11-11, in the Deep: what lies there and the Oculus stand in Close View as solid things, not as flat
// marks or cards (close-view.ts CLOSE_VIEW_PROPS places them). Aperture crystals float and turn, lit from within; the Oculus's
// dais is the standard view's blue; the Ember Door and the Deep Stair are stones with a lit face and a turning chevron. Their
// glowing colours are entries of CLOSE_VIEW_ACTOR_LOOK.emissive (the violet 0xc58cff, the cyan 0x7fe7ff, ember 0xf3a55c, gold
// 0xffd25a), so they are lit from within and resist the fog.
const bipyramid=(n,up,down,upper)=>{const ring=[],faces=[];for(let i=0;i<n;i++){const a=(i+.5)*2*Math.PI/n;ring.push([Math.cos(a),Math.sin(a),0]);}for(let i=0;i<n;i++){const j=(i+1)%n;faces.push(upper?[ring[i],ring[j],[0,0,up]]:[ring[j],ring[i],[0,0,-down]]);}return faces;};
const crystal=(lit,dark)=>{const parts=[part(bipyramid(6,.36,.3,true),0,0,0,.16,.16,1,lit),part(bipyramid(6,.36,.3,false),0,0,0,.16,.16,1,dark)];
  for(let k=0;k<3;k++){const a=k*2*Math.PI/3,x=Math.cos(a)*.3,y=Math.sin(a)*.3,z=(k-1)*.09;parts.push(part(bipyramid(4,.09,.07,true),x,y,z,.045,.045,1,lit),part(bipyramid(4,.09,.07,false),x,y,z,.045,.045,1,dark));}
  return parts;};
const apertureCrystal=crystal(0xc58cff,0x6e3f9e),apertureRift=crystal(0x7fe7ff,0x1f6a72);
const oculusDais=[part(prism(10),0,0,.04,.44,.44,.04,0x1c4a52),part(prism(10),0,0,.086,.34,.34,.008,0x7fe7ff),part(ellipsoid(6,2),0,0,.62,.05,.13,.24,0x7fe7ff,0,0,.62,0,true),part(ellipsoid(6,1),0,0,.62,.058,.05,.1,0x1c4a52,0,0,.62,0,true)];
for(let i=0;i<8;i++){const a=i*Math.PI/4,c=Math.cos(a),s=Math.sin(a),w=.018,P=(r,d)=>[c*r-s*d,s*r+c*d,.098];oculusDais.push(part(membrane([P(.13,-w),P(.31,-w),P(.31,w),P(.13,w)]),0,0,0,1,1,1,0x123a40));}
const wayStone=(glow,down)=>{const parts=[part(prism(4,.8),0,0,.23,.3*Math.SQRT2,.3*Math.SQRT2,.23,0x3e3c44),block(0,0,.48,.26,.26,.035,0x57555f)];
  for(const [x,y,sx,sy] of [[.255,0,.006,.15],[-.255,0,.006,.15],[0,.255,.15,.006],[0,-.255,.15,.006]])parts.push(block(x,y,.24,sx,sy,.12,glow));
  for(const side of [-1,1])parts.push(block(side*.1,0,.86,.13,.035,.035,glow,0,side*.1,.86,(down?1:-1)*side*-.785));
  return parts;};
const wayEmber=wayStone(0xf3a55c,false),wayDeep=wayStone(0xffd25a,true);
// Tall towers (tall-towers.ts): the lookout at an Upwell's lip, a stone post with a brass sighting glass and a lit lens; the Long Rope,
// a timber bollard with its coil and the rope running down over the edge.
const towerLookout=[part(prism(8),0,0,.36,.15,.15,.36,0x6c675e),block(0,0,.74,.21,.21,.03,0x8a8478),part(prism(6),0,0,.86,.045,.045,.1,0x5a4a30),block(.06,0,.99,.2,.05,.05,0xa8916b),block(.27,0,.99,.03,.065,.065,0x6f5a36),part(ellipsoid(6,2),.31,0,.99,.02,.05,.05,0xffd98a,0,0,0,0,true)];
const towerRope=[block(0,0,.32,.07,.07,.32,0x5a4632),block(0,0,.66,.09,.09,.03,0x6b5640),part(prism(10),0,0,.4,.14,.14,.045,0xb89a6a),part(prism(10),0,0,.3,.13,.13,.045,0xa88a5a),block(.17,0,.14,.014,.014,.3,0xb89a6a),block(.24,0,-.05,.014,.014,.2,0xb89a6a)];
export const CLOSE_VIEW_PROP_MODELS=Object.freeze({apertureCrystal,apertureRift,oculusDais,wayEmber,wayDeep,towerLookout,towerRope});

// Exact renderer kind keys (with "wayfarer" as a caller alias for "player").
const models = { ...companions, ...CLOSE_VIEW_EFFECT_MODELS, ...QUANDRIX_HAND_MODELS /* the Quandrix Staff's hands */, nativeOrb, mirageBlade, ...MIRAGE_BLADE_MODELS, corridorDrone, playerShadow:playerWraith, player, wayfarer: player, playerTool, playerUnarmed, playerShovel, playerHammer, playerHammerStomp, playerSweep, playerMirage, playerOrrery, playerCinderPike, playerVergeCleaver,
  ...CLOSE_VIEW_PLAYER_FORM_MODELS, ...playerFormModels, playerSkiff: CLOSE_VIEW_SKIFF_MODEL /* CLOSE_VIEW_WATER.boat */, ashling, rootBrute, pallidCrawler, hollowMarshal, ashenHound, coilStalker, ...CLOSE_VIEW_ARCOLOGY_MODELS, ...CLOSE_VIEW_PENTAGON_MODELS, ...CLOSE_VIEW_ADVENTURE_MODELS, voidWalker: STILLWORKS_WALKER_MODEL, ...CLOSE_VIEW_FOUNDRY_MODELS, ...CLOSE_VIEW_FOUNDRY_VARIANTS, ...CLOSE_VIEW_PROP_MODELS };
const modelVertices = Object.fromEntries(Object.entries(models).map(([kind, parts]) => [
  kind, parts.reduce((size, item) => size + item.mesh.length / MESH_FLOATS, 0),
]));
export const MODEL_ATTACHMENT_TRIANGLES = 8, MODEL_MAX_ATTACHMENTS = 3;
export const MODEL_MAX_VERTICES = 256 * 3;

export function modelTriangleCount(kind) { return modelSupported(kind) ? modelVertices[kind] / 3 : 0; }
export function modelSupportsAttachments(kind, count = 0) {
  return modelSupported(kind) && Number.isSafeInteger(count) && count >= 0 && count <= MODEL_MAX_ATTACHMENTS && modelTriangleCount(kind) + count * MODEL_ATTACHMENT_TRIANGLES <= 256;
}

export function modelSupported(kind) {
  return Object.hasOwn(models, kind);
}

// Imported hero equipment: use existing authored parts, with no procedural torso/limbs.
// Imported-hero tools wear the Wayfarer's materials (Tim, 2026-11-11: tools should match his art):
// the creature-shared plum iron and soot become blued gunmetal, the dark coat-cloth grips warm
// leather, the Blunderbuss stock walnut. Bake-time copies only: native fallback recipes and their
// pinned bytes are untouched, and no tool gains or loses a triangle.
const WAYFARER_TOOL_COLORS = new Map([[iron, 0x3a4246], [coal, 0x24282b], [leather, 0x5a4330], [0x46392e, 0x5b4130]]);
function wayfarerToolMaterials(parts) {
  const key = c => [(c >> 16) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255].map(Math.fround).join();
  const map = new Map([...WAYFARER_TOOL_COLORS].map(([from, to]) => [key(from), [(to >> 16) / 255, ((to >> 8) & 255) / 255, (to & 255) / 255]]));
  return Object.freeze(parts.map(p => { const mesh = Float32Array.from(p.mesh); for (let i = 0; i < mesh.length; i += MESH_FLOATS) { const to = map.get([mesh[i + 6], mesh[i + 7], mesh[i + 8]].join()); if (to) { mesh[i + 6] = to[0]; mesh[i + 7] = to[1]; mesh[i + 8] = to[2]; } } return { ...p, mesh }; }));
}
// Salvage Blade for the imported hero: 90 triangles (the held primary and the largest tool share one 256-triangle slot; held
// gear stays within 96). Tim, 2026-11-12: held beneath the guard like a long spike; 2026-11-26: two curved blades whose outline
// is a violin's body (each fills its own side, from the seam out to the outline), one snapped about a third of the way up.
// The whole blade, a flat diamond lofted through six stations of the outline (`whole`) to the point (44); the snapped one,
// its mirror from the guard to a jagged break (8) and the bright broken face (2); the diamond gunmetal guard plate (20); the wrapped leather grip (12); the pointed brass pommel
// cap (4). Baked once.
const heroSalvageBlade = (() => {
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.salvage, B = F.blade, O = B.outline, K = B.broken, C = F.colors, G = F.guard, X = .17, Y = -.25, XB = B.axisX;
  // Diamond rings: thickness along recipe X (the ridges), width along recipe Y (the edges), centred at (XB, cy).
  const ring = (z, w, t, cy = Y) => [[XB + t, cy, z], [XB, cy + w, z], [XB - t, cy, z], [XB, cy - w, z]];
  const loft = (a, b, out) => { for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; out.push([a[i], a[j], b[j]], [a[i], b[j], b[i]]); } return out; };
  const edge = (u) => { let i = 0; while (i < O.length - 2 && O[i + 1][0] < u) i++; const [u0, g0] = O[i], [u1, g1] = O[i + 1], k = (u - u0) / (u1 - u0), e = k * k * (3 - 2 * k); return g0 + (g1 - g0) * e; };
  const z = (u) => B.base + (B.tip - B.base) * u, mid = (u, side) => Y + side * (B.seam + edge(u)) / 2;
  const station = (u, side) => ring(z(u), Math.max(0, edge(u) - B.seam) / 2, B.thick * (1 - .5 * u), mid(u, side)); // seam to outline
  const whole = [], point = [XB, Y, B.tip];
  for (let i = 0; i + 1 < B.whole.length; i++) loft(station(B.whole[i], 1), station(B.whole[i + 1], 1), whole);
  { const last = station(B.whole[B.whole.length - 1], 1); for (let i = 0; i < 4; i++) whole.push([last[i], last[(i + 1) % 4], point]); }
  const snap = station(K.at, -1).map((v, i) => [v[0], v[1], v[2] + K.jag[i]]), broken = loft(station(0, -1), snap, []);
  const face = [[snap[0], snap[1], snap[2]], [snap[0], snap[2], snap[3]]];
  const axis = (side) => c => { const u = Math.min(1, Math.max(0, (c[2] - B.base) / (B.tip - B.base))); return [c[0] - XB, c[1] - mid(u, side), u > .97 ? 1 : 0]; };
  // Wrapped grip: the same radius and length, its top ring turned so the facets spiral like a wrap.
  const wrap = [], n = 6, R = F.gripRadius, ringAt = (z, turn) => Array.from({ length: n }, (_, i) => { const q = (i + .5 + turn) * 2 * Math.PI / n; return [X + R * Math.cos(q), Y + R * Math.sin(q), z]; });
  const lo = ringAt(F.grip[0], 0), hi = ringAt(F.grip[1], F.wrapTwist);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; wrap.push([lo[i], lo[j], hi[j]], [lo[i], hi[j], hi[i]]); }
  return Object.freeze([
    heldFacets(whole, C.blade, axis(1)),
    heldFacets(broken, C.tine, axis(-1)),
    heldFacets(face, C.break, () => [0, 0, 1]),
    heldTube([[XB, Y, G.z[0], G.corner[0], G.corner[1]], [XB, Y, G.z[1], G.corner[0], G.corner[1]], [XB, Y, G.z[2], G.corner[0] * G.bevel, G.corner[1] * G.bevel]], 4, WAYFARER_GUNMETAL, { caps: 3, flat: true, phase: 0 }),
    heldFacets(wrap, WAYFARER_LEATHER, c => [c[0] - X, c[1] - Y, 0]),
    heldTube([[X, Y, F.pommel[0], 0], [X, Y, F.pommel[2], F.pommelRadius]], 4, brass, { flat: true }),
  ]);
})();
// Fourfold Daggers for the imported hero: 44 triangles a dagger, one in each hand (writeCloseViewHeroGear draws it on both
// sockets), so the pair is 88, inside the largest held gear's 96. Reskinned (Tim, 2026-11-14): white blades, each crossed by a
// green stripe halfway along it, on both faces (two facets a face, following the blade's diamond section).
export const DAGGER_COLOURS = Object.freeze({ blade: 0xeeeeea, stripe: 0x2fc46a });
const heroDagger = (() => {
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.dagger, B = F.blade, G = F.guard, X = .17, Y = -.25;
  const ring = (z, w, t) => [[X + t, Y, z], [X, Y + w, z], [X - t, Y, z], [X, Y - w, z]], tip = [X, Y, B.tip];
  const a = ring(B.base, B.baseWidth, B.baseThick), b = ring(B.shoulder, B.width, B.thick), blade = [];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; blade.push([a[i], a[j], b[j]], [a[i], b[j], b[i]], [b[i], b[j], tip]); }
  const wrap = [], n = 4, R = F.gripRadius, ringAt = (z, turn) => Array.from({ length: n }, (_, i) => { const q = (i + .5 + turn) * 2 * Math.PI / n; return [X + R * Math.cos(q), Y + R * Math.sin(q), z]; });
  const lo = ringAt(F.grip[0], 0), hi = ringAt(F.grip[1], .5);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; wrap.push([lo[i], lo[j], hi[j]], [lo[i], hi[j], hi[i]]); }
  // The stripe: the blade's section at either side of `at` (between the shoulder and the point), pushed out by `lift`.
  const S = F.stripe, mid = B.base + (B.tip - B.base) * S.at, section = (z) => { const k = (z - B.shoulder) / (B.tip - B.shoulder); return ring(z, B.width * (1 - k) * S.lift, B.thick * (1 - k) * S.lift); };
  const s0 = section(mid - S.width / 2), s1 = section(mid + S.width / 2), stripe = [];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; stripe.push([s0[i], s0[j], s1[j]], [s0[i], s1[j], s1[i]]); }
  return Object.freeze([
    heldFacets(blade, DAGGER_COLOURS.blade, c => [c[0] - X, c[1] - Y, 0]),
    heldFacets(stripe, DAGGER_COLOURS.stripe, c => [c[0] - X, c[1] - Y, 0]),
    heldTube([[X, Y, G.z[0], G.corner[0], G.corner[1]], [X, Y, G.z[1], G.corner[0], G.corner[1]]], 4, WAYFARER_GUNMETAL, { caps: 3, flat: true, phase: 0 }),
    heldFacets(wrap, WAYFARER_LEATHER, c => [c[0] - X, c[1] - Y, 0]),
    heldTube([[X, Y, F.pommel[0], 0], [X, Y, F.pommel[1], F.pommelRadius]], 4, brass, { flat: true }),
  ]);
})();
const HERO_GEAR = Object.freeze({melee:heroSalvageBlade,'fourfold-daggers':heroDagger,'salvage-blade':heroSalvageBlade,'cinder-pike':heroCinderPike,'verge-cleaver':heroVergeCleaver,'shovel-dig':wayfarerToolMaterials(shovelGear),'iron-shovel-dig':wayfarerToolMaterials(shovelGear),fist:fistGauntlet,'fistCharge':fistGauntlet,emitter:wayfarerToolMaterials(emitterGear),hammer:wayfarerToolMaterials(playerHammer.slice(-2)),mirage:playerMirage.slice(-2),'orrery-tap':playerOrrery.slice(-3),'orrery-release':playerOrrery.slice(-3),'rift-bombard':wayfarerToolMaterials(riftBombard),'great-sweep':HERO_GREAT_SWEEP,blunderbuss:wayfarerToolMaterials(blunderbuss),'lumen-spindle':wayfarerToolMaterials(lumenSpindle),'spark-coil':wayfarerToolMaterials(sparkCoil),'needle-caster':wayfarerToolMaterials(needleCaster),carbine:heroCarbine,'quandrix-staff':heroQuandrixStaff});
// Suit armor (124 solid-plate triangles) + the largest held gear (96). The suit's helmet and pack
// (kit stream) take the hero past one 256-triangle actor slot, so the shared model buffer keeps a
// fixed HERO_SLOT_EXTRA_TRIANGLES reservation for the imported hero.
export const HERO_EQUIPMENT_MAX_TRIANGLES = 220, HERO_SLOT_EXTRA_TRIANGLES = 64;
export const HERO_DRINK_VIAL_TRIANGLES=24;
// One bake-time heptagonal tapered bottle: visible at close range, but small enough
// to share the existing equipment stream without another asset or draw call.
const HERO_DRINK_VIAL=part(prism(7,.55),0,0,.075,.034,.034,.075,0x52d9bd).mesh;
function writeHeroDrinkVial(out,offset,gear) {
  const m=gear?.vialSocket;if(!m||m.length!==16)return offset;
  for(let i=0;i<16;i++)if(!Number.isFinite(m[i]))return offset;
  const ax=Math.hypot(m[0],m[1],m[2]),ay=Math.hypot(m[4],m[5],m[6]),az=Math.hypot(m[8],m[9],m[10]);if(Math.min(ax,ay,az)<1e-6)return offset;
  const alpha=(Number.isFinite(gear.alpha)?Math.max(0,Math.min(1,gear.alpha)):1)*Math.max(0,Math.min(1,Number(gear.vialWeight)||0));
  for(let i=0;i<HERO_DRINK_VIAL.length;i+=MESH_FLOATS){const a=HERO_DRINK_VIAL,x=a[i],y=a[i+1],z=a[i+2];out[offset++]=m[12]+m[0]/ax*x+m[4]/ay*y+m[8]/az*z;out[offset++]=m[13]+m[1]/ax*x+m[5]/ay*y+m[9]/az*z;out[offset++]=m[14]+m[2]/ax*x+m[6]/ay*y+m[10]/az*z;let nx=m[0]/ax*a[i+3]+m[4]/ay*a[i+4]+m[8]/az*a[i+5],ny=m[1]/ax*a[i+3]+m[5]/ay*a[i+4]+m[9]/az*a[i+5],nz=m[2]/ax*a[i+3]+m[6]/ay*a[i+4]+m[10]/az*a[i+5],n=Math.hypot(nx,ny,nz)||1;out[offset++]=nx/n;out[offset++]=ny/n;out[offset++]=nz/n;out[offset++]=a[i+6];out[offset++]=a[i+7];out[offset++]=a[i+8];out[offset++]=alpha;}
  return offset;
}
export function writeCloseViewHeroGear(out,offset,gear) {
  const parts=Object.hasOwn(HERO_GEAR,gear?.profile)?HERO_GEAR[gear.profile]:null;
  // Legacy callers supplied only rightSocket. Callers with both sockets get the table's hand.
  const gripKey=gear?.primaryStage===undefined&&!gear?.leftSocket?'rightSocket':closeViewHandRoles(gear?.profile).grip,m=gear?.[gripKey],k=.82*closeViewHeldScale(gear?.profile);
  if(!parts||!m||m.length!==16||!Number.isSafeInteger(offset)||offset<0)return offset;
  // Two of the gear, one on each hand socket: the gauntlets (their own frame) and the paired daggers (the blade frame).
  const bilateral=gear.profile==='fist'||gear.profile==='fistCharge',paired=gear.profile==='fourfold-daggers',twin=(bilateral||paired)&&gear.single!==true/* 2026-11-14: one in the left hand while the right holds a tool (close-view-sweep-gear.ts) */,left=gear.leftSocket;
  if(twin&&(!left||left.length!==16))return offset;
  let vertices=0;for(const p of parts)vertices+=p.mesh.length/MESH_FLOATS;vertices*=twin?2:1;
  if(vertices>256*3||offset+vertices*MODEL_FLOATS>out.length)return offset;
  for(let pass=0;pass<(twin?2:1);pass++){const socket=twin&&pass===0?left:m;for(let i=0;i<16;i++)if(!Number.isFinite(socket[i]))return offset;const ax=Math.hypot(socket[0],socket[1],socket[2]),ay=Math.hypot(socket[4],socket[5],socket[6]),az=Math.hypot(socket[8],socket[9],socket[10]);if(Math.min(ax,ay,az)<1e-6)return offset;}
  const alpha=Number.isFinite(gear.alpha)?Math.max(0,Math.min(1,gear.alpha)):1,hit=Math.max(0,Math.min(1,Number(gear.hitFlash)||0));
  const tr=Number.isFinite(gear.tint?.[0])?gear.tint[0]:1,tg=Number.isFinite(gear.tint?.[1])?gear.tint[1]:1,tb=Number.isFinite(gear.tint?.[2])?gear.tint[2]:1;
  for(let pass=0;pass<(twin?2:1);pass++){const m=twin&&pass===0?left:gear[gripKey],ax=Math.hypot(m[0],m[1],m[2]),ay=Math.hypot(m[4],m[5],m[6]),az=Math.hypot(m[8],m[9],m[10]);
  for(const p of parts)for(let i=0;i<p.mesh.length;i+=MESH_FLOATS){const a=p.mesh;
    // Recipe grip (.17,-.25,.79), canonical blade +Z -> the source weapon socket +X.
    const x=bilateral?(a[i]+p.px)*.62:(a[i+2]+p.pz-.79)*k,y=bilateral?(a[i+1]+(p.py||0))*.62:-(a[i]+p.px-.17)*k,z=bilateral?(a[i+2]+p.pz)*.62:-(a[i+1]+.25)*k;
    out[offset++]=m[12]+m[0]/ax*x+m[4]/ay*y+m[8]/az*z;
    out[offset++]=m[13]+m[1]/ax*x+m[5]/ay*y+m[9]/az*z;
    out[offset++]=m[14]+m[2]/ax*x+m[6]/ay*y+m[10]/az*z;
    const nx=bilateral?a[i+3]:a[i+5],ny=bilateral?a[i+4]:-a[i+3],nz=bilateral?a[i+5]:-a[i+4];let qx=m[0]/ax*nx+m[4]/ay*ny+m[8]/az*nz,qy=m[1]/ax*nx+m[5]/ay*ny+m[9]/az*nz,qz=m[2]/ax*nx+m[6]/ay*ny+m[10]/az*nz;const len=Math.hypot(qx,qy,qz)||1;
    out[offset++]=qx/len;out[offset++]=qy/len;out[offset++]=qz/len;
    out[offset++]=a[i+6]*tr*(1-hit*.6)+.96*hit*.6;out[offset++]=a[i+7]*tg*(1-hit*.6)+.34*hit*.6;out[offset++]=a[i+8]*tb*(1-hit*.6)+.23*hit*.6;out[offset++]=alpha;
  }}
  return offset;
}

export function writeCloseViewHeroEquipment(out,offset,gear,frame) {
  const armored=frame?.powerSuit===true,armorVertices=armored?frame.suitVertexCount:0,parts=Object.hasOwn(HERO_GEAR,gear?.profile)?HERO_GEAR[gear.profile]:null;
  let gearVertices=0;if(parts)for(const p of parts)gearVertices+=p.mesh.length/MESH_FLOATS;
  if((gear?.profile==='fist'||gear?.profile==='fistCharge'||gear?.profile==='fourfold-daggers')&&gear.single!==true)gearVertices*=2;
  if(!Number.isSafeInteger(offset)||offset<0||armorVertices!==(armored?CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES*3:0)||(armorVertices+gearVertices)/3>HERO_EQUIPMENT_MAX_TRIANGLES||offset+(armorVertices+gearVertices)*MODEL_FLOATS>out.length)return offset;
  const vialRequested=gear?.drinkVial===true&&!armored&&Number(gear.vialWeight)>0,vialVertices=HERO_DRINK_VIAL_TRIANGLES*3;
  const vialFits=vialRequested&&(armorVertices+gearVertices+vialVertices)/3<=HERO_EQUIPMENT_MAX_TRIANGLES&&offset+(armorVertices+gearVertices+vialVertices)*MODEL_FLOATS<=out.length;
  const start=offset,alpha=Number.isFinite(gear?.alpha)?Math.max(0,Math.min(1,gear.alpha)):1,hit=Math.max(0,Math.min(1,Number(gear?.hitFlash)||0)),tr=Number.isFinite(gear?.tint?.[0])?gear.tint[0]:1,tg=Number.isFinite(gear?.tint?.[1])?gear.tint[1]:1,tb=Number.isFinite(gear?.tint?.[2])?gear.tint[2]:1;
  if(armored){let v=0;for(const part of CLOSE_VIEW_POWER_SUIT_ARMOR)for(let i=0;i<part.vertices.length;i++,v++){const s=v*6;for(let k=0;k<6;k++)out[offset++]=frame.suitPositionsNormals[s+k];const c=part.color,r=(c>>16)/255,g=((c>>8)&255)/255,b=(c&255)/255;out[offset++]=r*tr*(1-hit*.6)+.96*hit*.6;out[offset++]=g*tg*(1-hit*.6)+.34*hit*.6;out[offset++]=b*tb*(1-hit*.6)+.23*hit*.6;out[offset++]=alpha;}}
  const end=writeCloseViewHeroGear(out,offset,gear);
  if(parts&&end===offset)return start;
  return vialFits?writeHeroDrinkVial(out,end,gear):end;
}

// The standard Wayfarer kit has its own fixed reservation beside the held-gear stream, so a tool,
// gauntlets or the drink vial never compete with it. Atomic: all of the kit or none of it. The
// largest held gear (96) plus the vial (24) plus this reservation keeps the whole imported hero
// equipment inside one ordinary 256-triangle actor slot of the shared model buffer.
// On the suit, armor (124) + gear (<=96) + helmet and pack (97) fit one slot plus HERO_SLOT_EXTRA_TRIANGLES.
export const HERO_KIT_MAX_TRIANGLES = 136;
const kitRgb=list=>{const rgb=new Float32Array(list.length*3);list.forEach((p,i)=>{const g=p.glow||1;rgb[i*3]=(p.color>>16)/255*g;rgb[i*3+1]=((p.color>>8)&255)/255*g;rgb[i*3+2]=(p.color&255)/255*g;});return rgb;};
const KIT_SETS=Object.freeze({standard:Object.freeze({list:CLOSE_VIEW_WAYFARER_KIT,triangles:CLOSE_VIEW_WAYFARER_KIT_TRIANGLES,rgb:kitRgb(CLOSE_VIEW_WAYFARER_KIT),suit:false}),suit:Object.freeze({list:CLOSE_VIEW_SUIT_KIT,triangles:CLOSE_VIEW_SUIT_KIT_TRIANGLES,rgb:kitRgb(CLOSE_VIEW_SUIT_KIT),suit:true})});
export function writeCloseViewHeroKit(out,offset,gear,frame) {
  const set=Object.hasOwn(KIT_SETS,frame?.kitSet)?KIT_SETS[frame.kitSet]:null,vertices=set?set.triangles*3:0;
  if(!set||set.suit!==(frame.powerSuit===true)||frame.kitVertexCount!==vertices||!(vertices/3<=HERO_KIT_MAX_TRIANGLES)||!Number.isSafeInteger(offset)||offset<0||offset+vertices*MODEL_FLOATS>out.length)return offset;
  const KIT_LIST=set.list,KIT_RGB=set.rgb;
  const src=frame.kitPositionsNormals,alpha=Number.isFinite(gear?.alpha)?Math.max(0,Math.min(1,gear.alpha)):1,hit=Math.max(0,Math.min(1,Number(gear?.hitFlash)||0)),tr=Number.isFinite(gear?.tint?.[0])?gear.tint[0]:1,tg=Number.isFinite(gear?.tint?.[1])?gear.tint[1]:1,tb=Number.isFinite(gear?.tint?.[2])?gear.tint[2]:1;
  let v=0;
  for(let p=0;p<KIT_LIST.length;p++){const n=KIT_LIST[p].vertices.length,r=KIT_RGB[p*3]*tr*(1-hit*.6)+.96*hit*.6,g=KIT_RGB[p*3+1]*tg*(1-hit*.6)+.34*hit*.6,b=KIT_RGB[p*3+2]*tb*(1-hit*.6)+.23*hit*.6;
    for(let i=0;i<n;i++,v++){const s=v*6;out[offset++]=src[s];out[offset++]=src[s+1];out[offset++]=src[s+2];out[offset++]=src[s+3];out[offset++]=src[s+4];out[offset++]=src[s+5];out[offset++]=r;out[offset++]=g;out[offset++]=b;out[offset++]=alpha;}}
  return offset;
}

// Reused actor-local segment frames: columns X/Y, scaled Z, then origin. No per-vertex allocation.
const HAMMER_FRAMES=new Float64Array(12*12),HAMMER_JOINTS=new Float64Array(18);
const hammerSmooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function hammerJoint(out,o,ax,ay,az,bx,by,bz,length,poleX,poleY,poleZ){
  const rx=bx-ax,ry=by-ay,rz=bz-az,raw=Math.hypot(rx,ry,rz)||1,d=Math.min(length*2-1e-6,raw),dx=rx/raw,dy=ry/raw,dz=rz/raw;
  const dot=poleX*dx+poleY*dy+poleZ*dz;let px=poleX-dot*dx,py=poleY-dot*dy,pz=poleZ-dot*dz,l=Math.hypot(px,py,pz)||1;
  const h=Math.sqrt(Math.max(0,length*length-d*d/4));out[o]=ax+dx*d/2+px/l*h;out[o+1]=ay+dy*d/2+py/l*h;out[o+2]=az+dz*d/2+pz/l*h;
}
function hammerSegment(i,ax,ay,az,bx,by,bz){
  const o=i*12,rx=bx-ax,ry=by-ay,rz=bz-az,l=Math.hypot(rx,ry,rz)||1,zx=rx/l,zy=ry/l,zz=rz/l;
  let xx=1-zx*zx,xy=-zx*zy,xz=-zx*zz,xl=Math.hypot(xx,xy,xz);if(xl<1e-6){xx=0;xy=zz;xz=-zy;xl=1;}
  xx/=xl;xy/=xl;xz/=xl;HAMMER_FRAMES[o]=xx;HAMMER_FRAMES[o+1]=xy;HAMMER_FRAMES[o+2]=xz;HAMMER_FRAMES[o+3]=zy*xz-zz*xy;HAMMER_FRAMES[o+4]=zz*xx-zx*xz;HAMMER_FRAMES[o+5]=zx*xy-zy*xx;HAMMER_FRAMES[o+6]=rx;HAMMER_FRAMES[o+7]=ry;HAMMER_FRAMES[o+8]=rz;HAMMER_FRAMES[o+9]=(ax+bx)/2;HAMMER_FRAMES[o+10]=(ay+by)/2;HAMMER_FRAMES[o+11]=(az+bz)/2;
}
function hammerBox(i,x,y,z){const o=i*12;HAMMER_FRAMES.fill(0,o,o+12);HAMMER_FRAMES[o]=HAMMER_FRAMES[o+4]=HAMMER_FRAMES[o+8]=1;HAMMER_FRAMES[o+9]=x;HAMMER_FRAMES[o+10]=y;HAMMER_FRAMES[o+11]=z;}
function hammerFrames(progress){
  const ms=progress*570,drop=hammerSmooth((ms-240)/80),weight=hammerSmooth(ms/160)*(1-hammerSmooth((ms-400)/170));
  const q=HAMMER_JOINTS;
  for(let side=0;side<2;side++){
    const sign=side?1:-1,hipY=sign*.115,hipZ=.71-.04*drop*weight,footY=hipY+sign*.05*drop*weight;
    const lift=side?(.24*(1-drop)+(ms<320?.013*drop:0))*weight:0,ankleZ=.14+lift;
    hammerJoint(q,0,0,hipY,hipZ,0,footY,ankleZ,.285,1,0,0);
    hammerSegment(2+side*5,0,hipY,hipZ,q[0],q[1],q[2]);hammerSegment(3+side*5,q[0],q[1],q[2],0,footY,ankleZ);hammerBox(side,.044,footY,.076+lift);
    const sy=sign*.20,sz=1.19-.04*drop*weight,crossY=-sign*.06,crossZ=side?1.04:.99;
    const wx=.025+(.28+(.12-.28)*drop-.025)*weight,wy=sy+(crossY+(sign*.30-crossY)*drop-sy)*weight,wz=.76+(crossZ+(.80-crossZ)*drop-.76)*weight-.04*drop*weight;
    hammerJoint(q,3,0,sy,sz,wx,wy,wz,.24,0,sign,-.3);
    hammerSegment(4+side*5,0,sy,sz,q[3],q[4],q[5]);hammerSegment(5+side*5,q[3],q[4],q[5],wx,wy,wz);hammerBox(6+side*5,wx,wy,wz);
  }
  return weight;
}

// Pike-only actor-local frame and 20-triangle elbow lofts. Scratch is reused once
// per synchronous actor write; no gameplay state, socket ownership or extra draw.
const PIKE_FRAME=new Float64Array(15),PIKE_ARMS=new Float64Array(2*60*6),PIKE_RINGS=new Float64Array(36),PIKE_ELBOW=new Float64Array(3);
function pikeTriangle(offset,a,b,c){
  const r=PIKE_RINGS,o=PIKE_ARMS,ax=r[b]-r[a],ay=r[b+1]-r[a+1],az=r[b+2]-r[a+2],bx=r[c]-r[a],by=r[c+1]-r[a+1],bz=r[c+2]-r[a+2];
  let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
  for(let k=0;k<3;k++){const v=k===0?a:k===1?b:c;o[offset++]=r[v];o[offset++]=r[v+1];o[offset++]=r[v+2];o[offset++]=nx;o[offset++]=ny;o[offset++]=nz;}return offset;
}
function pikeArmRing(ring,x,y,z,dx,dy,dz,radius){
  const l=Math.hypot(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l;
  let xx=1-dx*dx,xy=-dx*dy,xz=-dx*dz,xl=Math.hypot(xx,xy,xz);if(xl<1e-6){xx=0;xy=dz;xz=-dy;xl=1;}xx/=xl;xy/=xl;xz/=xl;
  const yx=dy*xz-dz*xy,yy=dz*xx-dx*xz,yz=dx*xy-dy*xx;
  for(let i=0;i<4;i++){const a=(i+.5)*Math.PI/2,c=Math.cos(a)*radius,s=Math.sin(a)*radius,o=ring*12+i*3;PIKE_RINGS[o]=x+xx*c+yx*s;PIKE_RINGS[o+1]=y+xy*c+yy*s;PIKE_RINGS[o+2]=z+xz*c+yz*s;}
}
function nativePikeFrame(progress,step){
  const commit=progress<.12?hammerSmooth(progress/.12):progress<=.40?1:1-hammerSmooth((progress-.40)/.60),yaw=.60*(1-commit)+(step===2?-.06:step===3?.06:0)*commit,pitch=.60*(1-commit)+(step===2?-.08:step===3?.08:.04)*commit;
  const f=PIKE_FRAME,half=.1834/.82/2,nx=Math.cos(yaw)*Math.cos(pitch),ny=Math.sin(yaw)*Math.cos(pitch),nz=Math.sin(pitch),cx=.16+(step===2?-.025:step===3?.025:0)*commit,cy=0,cz=.95+(step===2?-.10:step===3?.10:0)*commit;
  f[0]=nx;f[1]=ny;f[2]=nz;f[3]=-Math.sin(yaw);f[4]=Math.cos(yaw);f[5]=0;f[6]=Math.cos(yaw)*Math.sin(pitch);f[7]=Math.sin(yaw)*Math.sin(pitch);f[8]=-Math.cos(pitch);
  f[9]=cx-nx*half+(step===2?.15:step===3?.17:.13)*commit;f[10]=cy-ny*half;f[11]=cz-nz*half;
  f[12]=f[9]+nx*half*2;f[13]=f[10]+ny*half*2;f[14]=f[11]+nz*half*2;
  for(let side=0;side<2;side++){
    const sign=side?1:-1,sy=sign*.25,sz=1.19,o=side?12:9,wx=f[o],wy=f[o+1],wz=f[o+2];
    hammerJoint(PIKE_ELBOW,0,-.014,sy,sz,wx,wy,wz,.255,0,sign,-.4);
    const ex=PIKE_ELBOW[0],ey=PIKE_ELBOW[1],ez=PIKE_ELBOW[2];
    pikeArmRing(0,-.014,sy,sz,ex+.014,ey-sy,ez-sz,.082);
    pikeArmRing(1,ex,ey,ez,wx+.014,wy-sy,wz-sz,.067);
    pikeArmRing(2,wx,wy,wz,wx-ex,wy-ey,wz-ez,.050);
    let v=side*360;
    for(let ring=0;ring<2;ring++)for(let i=0;i<4;i++){const a=ring*12+i*3,b=ring*12+(i+1)%4*3,c=b+12,d=a+12;v=pikeTriangle(v,a,b,c);v=pikeTriangle(v,a,c,d);}
    v=pikeTriangle(v,0,6,3);v=pikeTriangle(v,0,9,6);v=pikeTriangle(v,24,27,30);pikeTriangle(v,24,30,33);
  }
}

// Ordinary jump only: reuse each existing limb's vertex reservation. Normal legs
// use a jump-only closed20-triangle baseline; Fists retain their16-triangle loft.
// The normal baseline also owns legacy/opaque jumps, so v1 deforms identical
// topology instead of morphing old bevel triangles into differently joined faces.
// The source boot frame translates with its solved ankle. World lift stays in actor.z.
const JUMP_PARTS=new Map(),JUMP_LEGS=new Float64Array(720),JUMP_DELTA=new Float64Array(6),JUMP_RING=new Float64Array(36),JUMP_KNEE=new Float64Array(3);
for(let side=0;side<2;side++){JUMP_PARTS.set(playerUnarmed[side?14:10].mesh,{side,foot:false,capped:true});JUMP_PARTS.set(playerUnarmed[side?15:11].mesh,{side,foot:true,capped:true});}
for(const p of CLOSE_VIEW_PLAYER_FORM_MODELS.playerIronFists)if(Math.abs(p.swing)===1)JUMP_PARTS.set(p.mesh,{side:p.swing<0?0:1,foot:p.mesh.length/MESH_FLOATS===36,capped:false});
function ordinaryJumpKind(k){return k==='player'||k==='wayfarer'||['playerUnarmed','playerTool','playerHammer','playerSweep','playerMirage','playerOrrery','playerCinderPike','playerVergeCleaver','playerIronFists'].includes(k)||k.startsWith('playerIronFists:');}
function ordinaryNativeJump(actor){
  const a=actor.jumpAir,k=actor.kind;
  if(actor.pose!=='jump'||!ordinaryJumpKind(k)||a?.v!==1)return 0;
  const {elapsedMs:e,remainingMs:r,durationMs:d,rise,fall,lift}=a;
  if(![e,r,d,rise,fall,lift].every(Number.isFinite)||e<0||r<0||d<=0||e>d||r>d||Math.abs(e+r-d)>1e-5||rise<0||rise>1||fall<0||fall>1||lift<0)return 0;
  return hammerSmooth(e/60)*hammerSmooth(r/60);
}
function jumpTriangle(offset,a,b,c){
  const r=JUMP_RING,o=JUMP_LEGS,ax=r[b]-r[a],ay=r[b+1]-r[a+1],az=r[b+2]-r[a+2],bx=r[c]-r[a],by=r[c+1]-r[a+1],bz=r[c+2]-r[a+2];
  let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
  for(let k=0;k<3;k++){const v=k===0?a:k===1?b:c;o[offset++]=r[v];o[offset++]=r[v+1];o[offset++]=r[v+2];o[offset++]=nx;o[offset++]=ny;o[offset++]=nz;}return offset;
}
function jumpRing(ring,x,y,z,dx,dy,dz,radius){
  const l=Math.hypot(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l;
  let xx=1-dx*dx,xy=-dx*dy,xz=-dx*dz,xl=Math.hypot(xx,xy,xz);if(xl<1e-6){xx=0;xy=dz;xz=-dy;xl=1;}xx/=xl;xy/=xl;xz/=xl;
  const yx=dy*xz-dz*xy,yy=dz*xx-dx*xz,yz=dx*xy-dy*xx;
  for(let i=0;i<4;i++){const a=(i+.5)*Math.PI/2,c=Math.cos(a)*radius,s=Math.sin(a)*radius,o=ring*12+i*3;JUMP_RING[o]=x+xx*c+yx*s;JUMP_RING[o+1]=y+xy*c+yy*s;JUMP_RING[o+2]=z+xz*c+yz*s;}
}
function nativeJumpFrames(actor,beat,stride,jump,settle,connection){
  const a=actor.jumpAir,fold=connection?hammerSmooth(a.rise/.65)*(1-hammerSmooth(a.fall/.8)):0,fists=actor.kind.startsWith('playerIronFists'),hz=fists?.68:.71;
  for(let side=0;side<2;side++){
    const sign=side?1:-1,hy=sign*.115,angle=-sign*beat*stride-sign*.64*jump+sign*.28*settle,c=Math.cos(angle),s=Math.sin(angle),lx=fists?.045:0,ly=sign*(fists?.12:.115),lz=(fists?.13:.152)-hz;
    const ax=lx*c+lz*s,ay=ly,az=lz*c-lx*s+hz,dx=-.055/.82*fold,dy=sign*.015/.82*fold,dz=.14/.82*fold;
    JUMP_DELTA[side*3]=dx;JUMP_DELTA[side*3+1]=dy;JUMP_DELTA[side*3+2]=dz;
    let tx=ax+dx,ty=ay+dy,tz=az+dz;const length=fists?.28:.285;
    hammerJoint(JUMP_KNEE,0,0,hy,hz,tx,ty,tz,length,1,0,0);
    let ex=JUMP_KNEE[0],ey=JUMP_KNEE[1],ez=JUMP_KNEE[2];
    if(!fists){ex=ax/2+(ex-ax/2)*connection;ey=(hy+ay)/2+(ey-(hy+ay)/2)*connection;ez=(hz+az)/2+(ez-(hz+az)/2)*connection;tx=ax+dx*connection;ty=ay+dy*connection;tz=az+dz*connection;}
    jumpRing(0,0,hy,hz,ex,ey-hy,ez-hz,.085);jumpRing(1,ex,ey,ez,tx,ty-hy,tz-hz,.072);jumpRing(2,tx,ty,tz,tx-ex,ty-ey,tz-ez,.055);
    let v=side*360;for(let ring=0;ring<2;ring++)for(let i=0;i<4;i++){const p=ring*12+i*3,q=ring*12+(i+1)%4*3;v=jumpTriangle(v,p,q,q+12);v=jumpTriangle(v,p,q+12,p+12);}
    if(!fists){v=jumpTriangle(v,0,6,3);v=jumpTriangle(v,0,9,6);v=jumpTriangle(v,24,27,30);jumpTriangle(v,24,30,33);}
  }
}

const CLEAVER_FRAME_KEYS = ['side','up','forward','yaw','pitch','twist','lean'];
// Ordinary Wayfarer kinds that carry a right-hand tool (CLOSE_VIEW_HELD_GEAR); special forms keep their own grips.
const NATIVE_RIGHT_HELD = new Set(['playerTool','playerOrrery']);
function nativeCleaverBone(start, end) {
  const delta = end.map((value, i) => value - start[i]);
  const length = Math.hypot(...delta);
  const axis = length > 1e-6 ? delta.map(value => value / length) : [0, 0, -1];
  const bend = Math.hypot(axis[0], axis[2]);
  const x = bend > 1e-6 ? [-axis[2] / bend, 0, axis[0] / bend] : [1, 0, 0];
  const y = [-x[2] * axis[1], x[2] * axis[0] - x[0] * axis[2], x[0] * axis[1]];
  return { start, delta, axis, x, y };
}
function nativeCleaverRig(frame) {
  const shoulder = [0, .25, 1.19], reach = .43;
  const wrist = [frame.forward * reach, shoulder[1] + frame.side * reach, shoulder[2] + frame.up * reach];
  const elbow = [wrist[0] * .5 - .045, (shoulder[1] + wrist[1]) * .5, (shoulder[2] + wrist[2]) * .5 + .07];
  const sy = Math.sin(frame.yaw), cy = Math.cos(frame.yaw), sp = Math.sin(frame.pitch), cp = Math.cos(frame.pitch);
  return {
    wrist, upper: nativeCleaverBone(shoulder, elbow), lower: nativeCleaverBone(elbow, wrist),
    blade: { x: [-sp * cy, -sp * sy, cp], y: [sy, -cy, 0], z: [cp * cy, cp * sy, sp] },
  };
}

// Creature root motion (Tim, 2026-11-14: ordinary creatures "don't really have good animations for attacks. They just stand
// next to me"). Phase B step 0: one shared, data-driven layer under every ordinary 3D creature's limbs. It crouches or coils the
// body in the windup, drives the whole root forward into the blow (the drawn model translates, not only its limbs), leans and
// twists into the swing, kicks back on contact and settles. Every value is sampled from the creature's real clocks: the pack
// attack's phase and its progress (windup, strike/lock, active, recover), the ordinary telegraph and e.strike countdown (pose
// windup/attack), the elite gravity module's eliteWindup/eliteActive, and the Grave Lantern's stillness clock. Presentation only:
// the creature's position for collision and hits is untouched; the offset moves the drawn model alone.
//   families: per body plan, crouch (a vertical squash share, feet planted), lunge (tiles, never past reachShare of the
//     attack's real reach), lean and twist (radians), recoil (tiles back at contact), lift (a scale on a style's rise), and the
//     ease of the windup, the strike and the settle.
//   styles: per kind of blow, multipliers of the family's numbers: crouch (coiled in the windup), back (the share of the lunge
//     drawn back before it), rear (lean back while coiling), lunge, lean (forward at full extension), twist, windLift and lift
//     (tiles, coiled and extended), land (squash at full extension), impact (squash at contact), recoil.
//   tail: an attack with no strike phase of its own (most) strikes in the last `tail` of its windup, so the body is at full
//     extension when the hit resolves; `phased` attacks (a strike, track or travel phase follows) strike in that phase instead.
//   Reduced Motion: crouch, lean, twist and rise at `reduced.scale`, no lunge translation and no recoil kick (as the hero's
//     cleaver load and the hit recoil already do); the attack still reads.
//   Phase model (2026-11-15, creature-motion.ts CREATURE_MOTION.phase/heavy/combo): the coil peaks at `phase.peak` of its window
//     and holds (trembling, never under Reduced Motion) until the strike; recovery carries a follow-through past full extension
//     before it settles; a heavy blow (e.heavy) coils, extends and follows through further; combo follow-ups alternate their
//     twist. close-view.ts creatureClock and the e.bhv.wind windup put every phase on the creature's real clock.
const poseFamily = (crouch, lunge, lean, twist, recoil, lift, style, wind = 'smooth', strike = 'snap', settle = 'back') => Object.freeze({ crouch, lunge, lean, twist, recoil, lift, style, wind, strike, settle });
const poseStyle = (crouch, back, rear, lunge, lean, twist, windLift, lift, land, impact, recoil) => Object.freeze({ crouch, back, rear, lunge, lean, twist, windLift, lift, land, impact, recoil });
export const CREATURE_POSE = Object.freeze({
  tail: .2, reachShare: .35, defaultReach: 1.2, recoilSpan: .45, ordinaryHold: .25, settleOvershoot: .18,
  reduced: Object.freeze({ scale: .5, lunge: 0, recoil: 0 }),
  // game.ts: an elite's gravity module winds up 1.1 s (eliteWindup), then pulls for 1.15 s (eliteActive); the body settles over
  // the pull's last `settle` share.
  elite: Object.freeze({ windup: 1.1, active: 1.15, settle: .25, style: 'pull' }),
  // monster-pack.ts passiveStillness: the curse falls once the Wayfarer has stood still 1.25 s (pack.stillT).
  stillness: Object.freeze({ fires: 1.25, style: 'dread' }),
  families: Object.freeze({
    biped: poseFamily(.12, .32, .20, .32, .08, 1, 'lunge'),
    quadruped: poseFamily(.20, .42, .14, .14, .09, 1, 'lunge'),
    crawler: poseFamily(.20, .34, .10, .16, .07, .8, 'lunge', 'smooth', 'snap', 'smooth'),
    serpent: poseFamily(.22, .46, .26, .20, .09, .8, 'lunge', 'in'),
    floating: poseFamily(.05, .30, .22, .20, .10, 1.4, 'cast', 'smooth', 'out', 'back'),
    blob: poseFamily(.24, .26, .08, .06, .06, .6, 'lunge', 'smooth', 'out', 'back'),
    construct: poseFamily(.07, .20, .12, .26, .05, .6, 'sweep', 'smooth', 'snap', 'smooth'),
    plant: poseFamily(.14, .16, .28, .14, .04, .4, 'spray', 'in', 'snap', 'back'),
  }),
  styles: Object.freeze({
    //               crouch back rear lunge lean twist windLift lift land impact recoil
    lunge: poseStyle(1, .25, .5, 1, 1, .5, 0, 0, 0, .4, 1),
    sweep: poseStyle(.7, .1, .5, .55, .6, 1.6, 0, 0, .2, .3, .8),
    leap: poseStyle(1.6, .15, .3, .9, .7, 0, 0, .3, 0, 1.2, .6),
    dive: poseStyle(.3, 0, .4, 1, 1.6, 0, .25, -.15, 0, .6, .8),
    cast: poseStyle(.4, .3, 1.2, .15, .5, .4, .08, .04, 0, 0, .6),
    ram: poseStyle(1, .3, .2, .8, 1.4, 0, 0, 0, .3, .5, 1.6),
    burrow: poseStyle(1.8, 0, -.8, .3, .4, 0, -.2, .25, 0, .8, .5),
    recoil: poseStyle(.9, 0, .3, -.35, -1.2, 0, 0, 0, .5, .6, 1.5),
    pull: poseStyle(.6, 0, .2, -.15, -.8, 0, .05, .05, .4, 0, .4),
    spray: poseStyle(.5, .2, .8, .1, .6, .3, 0, 0, 0, 0, .8),
    dread: poseStyle(.5, 0, .9, 0, 0, .2, .1, 0, 0, 0, 0),
    slam: poseStyle(.5, .2, 1.2, .6, 1, 0, .12, 0, 1, .8, .5),
  }),
  // Per-attack overrides (pack modules and the ordinary melee patterns); anything else takes its semantic family's style, and
  // an attack with neither takes the body family's own style.
  attacks: Object.freeze({
    bite: 'lunge', longStab: 'lunge', poleThrust: 'lunge', clawSweep: 'sweep', heavySweep: 'sweep', giantSwing: 'sweep',
    leapSlam: 'leap', vineVault: 'leap', diveBomb: 'dive', sigilScatter: 'cast', censerLob: 'cast', lampFlare: 'cast',
    prismBeam: 'cast', sweepBeam: 'cast', ramCharge: 'ram', burrowAmbush: 'burrow', mortarVolley: 'recoil', devourPull: 'pull',
    webSpit: 'spray', thornDarts: 'spray', stillnessCurse: 'dread',
    firefall: 'cast', tendrilRain: 'cast', icicleLine: 'cast', fleshBloom: 'cast', mirrorSwap: 'cast', phaseStep: 'cast',
    lunge: 'lunge', longReach: 'lunge', zigzag: 'sweep', hop: 'leap', slam: 'slam', ranged: 'cast',
  }),
  semantic: Object.freeze({ bite: 'lunge', stab: 'lunge', sweep: 'sweep', slam: 'slam', beam: 'cast', charge: 'ram', ranged: 'spray',
    curse: 'cast', teleport: 'lunge', leap: 'leap', burrow: 'burrow', dive: 'dive', summon: 'cast', inhale: 'pull', howl: 'cast' }),
  phased: Object.freeze(['blinkStrike', 'diveBomb', 'burrowAmbush']),
  kinds: Object.freeze({
    ashling: 'biped', hollowMarshal: 'biped', weepingSaint: 'biped', mirrorShade: 'biped', censerWarden: 'biped', lamplighter: 'biped', rimeSentinel: 'biped',
    ashenHound: 'quadruped', riftLynx: 'quadruped', thunderhorn: 'quadruped', 'foundry-quadruped': 'quadruped',
    glassMite: 'crawler', pallidCrawler: 'crawler', veilSpinner: 'crawler', siegeBeetle: 'crawler', galleryLurker: 'crawler', lakeGlider: 'crawler', hookhanger: 'crawler',
    coilStalker: 'serpent', sunderjaw: 'serpent', sinkmaw: 'serpent', 'foundry-segmented': 'serpent',
    cinderWisp: 'floating', veilMoth: 'floating', hangedChoir: 'floating', graveLantern: 'floating', cinderSeraph: 'floating', lumenWraith: 'floating',
    gloomwisp: 'floating', cinderKite: 'floating', spindriftMedusa: 'floating', 'foundry-floating': 'floating',
    amalgam: 'blob', gnawingMaw: 'blob', gloomgorge: 'blob', 'foundry-tentacled': 'blob', 'foundry-tentacled-3': 'blob', 'foundry-tentacled-6': 'blob',
    sparkWarden: 'construct', voidSentinel: 'construct', knellkeeper: 'construct', prismStilt: 'construct', slagwright: 'construct',
    'foundry-geometric': 'construct', 'foundry-biomechanical': 'construct', 'foundry-biomechanical-3': 'construct', 'foundry-biomechanical-6': 'construct',
    rootBrute: 'plant', vinehookLeaper: 'plant', thornspitterBloom: 'plant',
  }),
});
const POSE_PHASED = new Set(CREATURE_POSE.phased);
export const creaturePoseFamily = (kind) => typeof kind === 'string' && Object.hasOwn(CREATURE_POSE.kinds, kind) ? CREATURE_POSE.kinds[kind] : null;
// The motion style an attack takes on a body family (attack id, then its semantic family, then the body's own).
export function creaturePoseStyle(family, id, semantic) {
  const P = CREATURE_POSE;
  if (typeof id === 'string' && Object.hasOwn(P.attacks, id)) return P.attacks[id];
  if (typeof semantic === 'string' && Object.hasOwn(P.semantic, semantic)) return P.semantic[semantic];
  return Object.hasOwn(P.families, family) ? P.families[family].style : 'lunge';
}
function poseEase(kind, t) {
  if (kind === 'in') return t * t;
  if (kind === 'out') return 1 - (1 - t) * (1 - t);
  if (kind === 'snap') { const q = 1 - t; return 1 - q * q * q; }
  // a smooth return that runs a little past rest late on and comes back (the settle)
  if (kind === 'back') return t * t * (3 - 2 * t) + CREATURE_POSE.settleOvershoot * Math.sin(Math.PI * t) * t;
  return t * t * (3 - 2 * t);
}
// One scratch record, rewritten by every call (no per-frame allocation). stage: 0 rest, 1 coil, 2 strike, 3 hold, 4 recover.
const ROOT_POSE = { lunge: 0, squash: 0, lean: 0, twist: 0, lift: 0, stage: 0, u: 0, hold: 0, heavy: false, style: '', family: '' };
// The root offset of an ordinary creature this frame (an actor as writeCloseViewModel takes it). Fields: lunge (tiles forward
// along its facing; negative is back), squash (share of its height, feet planted), lean (radians, forward positive), twist
// (radians of yaw), lift (tiles). `family` is '' for anything that is not an ordinary 3D creature (all zero).
export function creatureRootPose(actor, out = ROOT_POSE) {
  out.lunge = 0; out.squash = 0; out.lean = 0; out.twist = 0; out.lift = 0; out.stage = 0; out.u = 0; out.hold = 0; out.heavy = false; out.style = ''; out.family = '';
  const family = creaturePoseFamily(actor?.kind);
  if (!family) return out;
  out.family = family;
  const P = CREATURE_POSE, F = P.families[family], pose = actor.pose, phase = actor.actionPhase;
  let stage = 0, u = 0, id = '', semantic = '', windup = -1;
  // A pack attack's own phase clock wins; the Pallid Crawler's legacy bite and leap (pose windup/attack/jump) carry it too.
  if (typeof phase === 'string' && phase && (pose === 'semantic' || (pose === 'windup' || pose === 'attack' || pose === 'jump') && typeof actor.action === 'string' && actor.action)) {
    id = typeof actor.action === 'string' ? actor.action : ''; semantic = actor.actionFamily;
    const p = Number.isFinite(actor.actionProgress) ? Math.max(0, Math.min(1, actor.actionProgress)) : 0;
    if (phase === 'windup') windup = p;
    else if (phase === 'track' || phase === 'travel') { stage = 1; u = 1; }
    else if (phase === 'strike' || phase === 'lock') { stage = 2; u = p; }
    else if (phase === 'active' || phase === 'erupt') stage = 3;
    else if (phase === 'recover') { stage = 4; u = p; }
  } else if (pose === 'windup' || pose === 'attack') {
    id = typeof actor.action === 'string' && actor.action ? actor.action : typeof actor.rootAttack === 'string' ? actor.rootAttack : '';
    const a = Number.isFinite(actor.amount) ? Math.max(0, Math.min(1, actor.amount)) : 0;
    if (pose === 'windup') windup = a;
    else {
      // The ordinary e.strike pose begins at blade contact (ACTION_MOTION.monsterContact): hold the extension, then recover.
      const c = ACTION_MOTION.monsterContact, v = Math.max(0, Math.min(1, (a - c) / (1 - c)));
      if (v < P.ordinaryHold) stage = 3; else { stage = 4; u = (v - P.ordinaryHold) / (1 - P.ordinaryHold); }
    }
  } else if (pose === 'idle' || pose === 'walk') {
    if (actor.eliteWindup > 0) { id = 'elite'; stage = 1; u = 1 - Math.min(1, actor.eliteWindup / P.elite.windup); }
    else if (actor.eliteActive > 0) {
      const v = 1 - Math.min(1, actor.eliteActive / P.elite.active); id = 'elite';
      if (v < 1 - P.elite.settle) stage = 3; else { stage = 4; u = (v - (1 - P.elite.settle)) / P.elite.settle; }
    }
    // A slow dread pulse on the stillness clock, back at rest by the time the curse falls (the clock then starts again).
    else if (actor.stillness > 0) { id = 'stillnessCurse'; stage = 1; u = Math.sin(Math.PI * Math.min(1, actor.stillness / P.stillness.fires)); }
  }
  // Anticipation (creature-motion.ts CREATURE_MOTION.phase): a windup's coil reaches its peak at `peak` of the coil window and
  // holds there (out.hold, 0..1 through the hold) until the strike, so the blow reads before it lands.
  const MP = CREATURE_MOTION.phase;
  let hold = 0;
  if (windup >= 0) {
    if (POSE_PHASED.has(id)) { stage = 1; u = windup; }
    else if (windup < 1 - P.tail) { stage = 1; u = windup / (1 - P.tail); }
    else { stage = 2; u = (windup - (1 - P.tail)) / P.tail; }
    if (stage === 1) { if (u > MP.peak) hold = (u - MP.peak) / (1 - MP.peak); u = Math.min(1, u / MP.peak); }
  }
  if (!stage) return out;
  const styleId = id === 'elite' ? P.elite.style : creaturePoseStyle(family, id, semantic), S = P.styles[styleId] || P.styles.lunge;
  // A heavy blow (enemy-behaviour.ts shapeBlow: e.heavy) coils deeper, extends, kicks and follows through further; a combo's
  // follow-ups (step 2, 3: e.comboStep or the pack's combo) are a little lighter and swing back the other way every other blow.
  const H = CREATURE_MOTION.heavy, heavy = actor.heavy === true, step = Number.isInteger(actor.comboStep) ? actor.comboStep : 0;
  const light = step > 1 ? CREATURE_MOTION.combo.amp : 1, side = step > 1 && step % 2 === 0 ? -1 : 1;
  const kc = (heavy ? H.coil : 1) * light, ke = (heavy ? H.extend : 1) * light, kr = heavy ? H.recoil : 1;
  let c = 0, e = 0, bump = 0, fo = 0;
  if (stage === 1) { c = poseEase(F.wind, u); e = -S.back * c; }
  else if (stage === 2) { const k = poseEase(F.strike, u); c = 1 - k; e = -S.back + (1 + S.back) * k; }
  else if (stage === 3) e = 1;
  else {
    e = 1 - poseEase(F.settle, u); bump = u < P.recoilSpan ? Math.sin(Math.PI * u / P.recoilSpan) : 0;
    // follow-through: the body carries on past full extension just after contact, then settles back over the real recovery
    if (u < MP.followSpan) fo = MP.follow * (heavy ? H.follow : 1) * Math.sin(Math.PI * u / MP.followSpan);
  }
  const reduce = !!actor.reduceMotion, amp = reduce ? P.reduced.scale : 1;
  const reach = Number.isFinite(actor.attackReach) && actor.attackReach > 0 ? actor.attackReach : P.defaultReach;
  const lunge = Math.min(F.lunge * S.lunge * ke, reach * P.reachShare), drawn = e < 0 ? e * kc : e;
  out.lunge = drawn * lunge * (reduce ? P.reduced.lunge : 1) - F.recoil * S.recoil * bump * kr * (reduce ? P.reduced.recoil : 1);
  out.squash = Math.max(0, Math.min(.45, F.crouch * (S.crouch * c * kc + S.land * Math.max(0, e) * ke + S.impact * bump * kr) * amp));
  out.lean = F.lean * (S.lean * (e + fo) * ke - S.rear * c * kc) * amp;
  out.twist = side * F.twist * S.twist * ((e + fo) * ke - .6 * c * kc) * amp;
  out.lift = F.lift * (S.windLift * c * kc + S.lift * (e + fo) * ke) * amp;
  // the held peak trembles with the effort (never under Reduced Motion)
  if (hold > 0 && !reduce && Number.isFinite(actor.effectTime)) out.lean += MP.tremble * Math.min(1, hold * 3) * Math.sin(actor.effectTime / 1000 * 6.2832 * MP.trembleHz);
  out.stage = stage; out.u = u; out.hold = hold; out.heavy = heavy; out.style = styleId;
  return out;
}

// The rest-pose frame of a creature's body (model units, measured once per kind from its parts): top and bottom, back and front,
// and its half width. creature-motion.ts weights its bend bands from it, and a fall settles on it. Read-only, cached per kind.
const RIG_FRAMES = new Map();
export function creatureRigFrame(kind) {
  const known = RIG_FRAMES.get(kind); if (known !== undefined) return known;
  const parts = Object.hasOwn(models, kind) ? models[kind] : null; if (!parts) return null;
  let top = -Infinity, bot = Infinity, back = Infinity, front = -Infinity, half = 0;
  for (const item of parts) { const mesh = item.mesh; for (let i = 0; i < mesh.length; i += MESH_FLOATS) {
    const f = mesh[i] + item.px, h = mesh[i + 2] + item.pz, y = Math.abs(mesh[i + 1]);
    if (h > top) top = h; if (h < bot) bot = h; if (f < back) back = f; if (f > front) front = f; if (y > half) half = y; } }
  const family = creaturePoseFamily(kind), axis = family && CREATURE_MOTION.families[family] ? CREATURE_MOTION.families[family].axis : 'up', B = CREATURE_MOTION.bend;
  const H = Math.max(1e-3, top - bot), L = Math.max(1e-3, front - back), mid = bot + .55 * H;
  // band origins and spans: up (heights) or front (lengths along the body), and each band's pivot (forward, up)
  const frame = Object.freeze(axis === 'front'
    ? { axis, top, bot, back, front, half, tFrom: back + B.hip * L, tSpan: (1 - B.hip) * L, hFrom: back + B.head * L, hSpan: (1 - B.head) * L, lFrom: back + B.tail * L, lSpan: B.tail * L,
      tf: back + B.hip * L, tz: mid, hf: back + B.head * L, hz: mid, lf: back + B.tail * L, lz: mid }
    : { axis, top, bot, back, front, half, tFrom: bot + B.hip * H, tSpan: (1 - B.hip) * H, hFrom: bot + B.head * H, hSpan: (1 - B.head) * H, lFrom: bot + B.hang * H, lSpan: B.hang * H,
      tf: 0, tz: bot + B.hip * H, hf: 0, hz: bot + B.head * H, lf: 0, lz: bot + B.hang * H });
  RIG_FRAMES.set(kind, frame); return frame;
}
const UPRIGHT = new Set(['biped', 'construct', 'plant']), MOTION_ARMS = new Set(CREATURE_MOTION.arms);
// The fall's clock: it drops with gravity and lands with a little bounce.
function deathFall(p) { return p < .72 ? (p / .72) * (p / .72) : 1 - .07 * Math.sin(Math.PI * (p - .72) / .28); }
// How far a falling body rises so what it falls onto rests on the floor (its front or back for a pitch, its side for a roll).
function deathSink(rig, pitch, roll) {
  if (!rig) return 0; const reach = pitch >= 0 ? Math.max(0, rig.front) : Math.max(0, -rig.back);
  return Math.max(reach * Math.abs(Math.sin(pitch)), rig.half * Math.abs(Math.sin(roll)));
}
// The motion bend this frame (creature-motion.ts), worked out once per creature: each band's span on the rest pose (up: heights;
// front: lengths along the body), its pivot, and each of its angles as a sine and 1 - cosine that the vertex loop scales by the
// vertex's weight in the band. One scratch record (no allocation).
const BEND_FRAME = { up: true, tFrom: 0, tInv: 0, hFrom: 0, hInv: 0, lFrom: 0, lInv: 0, tf: 0, tz: 0, hf: 0, hz: 0, lf: 0, lz: 0, tOn: false, hOn: false, lOn: false,
  tP: false, tPS: 0, tPC: 0, tY: false, tYS: 0, tYC: 0, tR: false, tRS: 0, tRC: 0, hP: false, hPS: 0, hPC: 0, hY: false, hYS: 0, hYC: 0, lP: false, lPS: 0, lPC: 0, lY: false, lYS: 0, lYC: 0 };
function bendFrame(B, mo, rig) {
  B.up = rig.axis === 'up'; B.tFrom = rig.tFrom; B.tInv = 1 / rig.tSpan; B.hFrom = rig.hFrom; B.hInv = 1 / rig.hSpan; B.lFrom = rig.lFrom; B.lInv = 1 / rig.lSpan;
  B.tf = rig.tf; B.tz = rig.tz; B.hf = rig.hf; B.hz = rig.hz; B.lf = rig.lf; B.lz = rig.lz;
  B.tP = mo.bendPitch !== 0; B.tPS = Math.sin(mo.bendPitch); B.tPC = 1 - Math.cos(mo.bendPitch);
  B.tY = mo.bendYaw !== 0; B.tYS = Math.sin(mo.bendYaw); B.tYC = 1 - Math.cos(mo.bendYaw);
  B.tR = mo.bendRoll !== 0; B.tRS = Math.sin(mo.bendRoll); B.tRC = 1 - Math.cos(mo.bendRoll);
  B.hP = mo.headPitch !== 0; B.hPS = Math.sin(mo.headPitch); B.hPC = 1 - Math.cos(mo.headPitch);
  B.hY = mo.headYaw !== 0; B.hYS = Math.sin(mo.headYaw); B.hYC = 1 - Math.cos(mo.headYaw);
  B.lP = mo.tailPitch !== 0; B.lPS = Math.sin(mo.tailPitch); B.lPC = 1 - Math.cos(mo.tailPitch);
  B.lY = mo.tailYaw !== 0; B.lYS = Math.sin(mo.tailYaw); B.lYC = 1 - Math.cos(mo.tailYaw);
  B.tOn = B.tP || B.tY || B.tR; B.hOn = B.hP || B.hY; B.lOn = B.lP || B.lY;
  return B;
}

// Grounding (solidity pass 2, Tim 2026-11-19: "concrete"). The baked rest meshes of most creatures stand a little above the
// floor (the Root Brute's soles .078 of a tile up, the Ashling's .043), which with a small contact shadow read as a body hovering
// over a dark coin. A creature of a `families` body whose lowest rest point is above the floor by at most `max` (in its own
// units at scale 1) is set down by that much; higher ones are designed to hover (the Veil Moth) and are left alone. Measured
// once per kind from its idle pose (one scratch buffer, one number kept per kind), never per frame.
export const CREATURE_GROUND = Object.freeze({ families: Object.freeze(['biped', 'quadruped', 'crawler', 'serpent', 'construct', 'plant', 'blob']), max: .12, foot: .4 });
// The same measurement gives the body's footprint: the half extent (tiles at scale 1) of its lower `foot` share, which sizes its
// contact shadow (close-view.ts CLOSE_VIEW.creatures.contact) so a wide body stands on a shadow as wide as its stance.
const GROUND_FAMILIES = new Set(CREATURE_GROUND.families), GROUND_REST = new Map(); let groundProbe = null, groundMeasuring = false;
function measureRest(kind) {
  let r = GROUND_REST.get(kind); if (r) return r; r = { lift: 0, foot: 0 };
  if (!groundMeasuring && modelSupported(kind)) {
    groundMeasuring = true;
    try { groundProbe ||= new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS);
      const n = writeCloseViewModel(groundProbe, 0, { kind, x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, amount: 0, pose: 'idle', alpha: 1, scale: 1, effectTime: 0, reduceMotion: true });
      let low = Infinity, high = -Infinity; for (let o = 2; o < n; o += MODEL_FLOATS) { if (groundProbe[o] < low) low = groundProbe[o]; if (groundProbe[o] > high) high = groundProbe[o]; }
      if (low > 0 && low <= CREATURE_GROUND.max) r.lift = low;
      const cut = low + (high - low) * CREATURE_GROUND.foot; let ext = 0;
      for (let o = 0; o < n; o += MODEL_FLOATS) if (groundProbe[o + 2] <= cut) ext = Math.max(ext, Math.abs(groundProbe[o]), Math.abs(groundProbe[o + 1]));
      r.foot = Number.isFinite(ext) ? ext : 0;
    } finally { groundMeasuring = false; }
  }
  GROUND_REST.set(kind, r); return r;
}
export const creatureRestGround = (kind) => measureRest(kind).lift;
export const creatureFootprint = (kind) => measureRest(kind).foot;
export function writeCloseViewModel(out, offset, actor) {
  if (Object.hasOwn(MIRAGE_BLADE_MODELS, actor?.kind)) return writeMirageBladeModel(out, offset, actor); // the Mirage blades: spun in a plane tipped toward the camera (close-view-sweep-gear.ts)
  const { kind, x, y, z, yaw, phase, pace, pose, amount } = actor;
  // measured first (once per kind): the measurement writes a model itself and reuses the module's scratch pose records
  const groundLift = actor.grounded === true && !groundMeasuring && GROUND_FAMILIES.has(creaturePoseFamily(kind)) ? creatureRestGround(kind) : 0; // Close View's creatures ask for it (actor.grounded); other writers keep the authored rest
  const playerLike = kind === "player" || kind === "wayfarer" || kind.startsWith("player");
  const actorScale = Number.isFinite(actor.scale) ? Math.max(.25, Math.min(4, actor.scale)) : 1;
  const size = (kind === "nativeOrb" ? Math.max(.02,Math.min(1,Number(actor.radius)||.13)) : (playerLike ? .82 : 1) * actorScale);
  const attachments = Array.isArray(actor.attachments) ? actor.attachments.slice(0, MODEL_MAX_ATTACHMENTS).filter((q) => q && Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.z)) : [];
  const needed = (modelVertices[kind] + attachments.length * MODEL_ATTACHMENT_TRIANGLES * 3) * MODEL_FLOATS;
  if (!modelSupported(kind) || !modelSupportsAttachments(kind, attachments.length) || !Number.isSafeInteger(offset) || offset < 0 || offset + needed > out.length) return offset;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(yaw) ||
      !Number.isFinite(phase) || !Number.isFinite(pace) || !Number.isFinite(amount)) return offset;
  const modelStart = offset, moving = Math.max(0, Math.min(1, pace));
  const progress = Math.max(0, Math.min(1, amount));
  // Only new accepted phase records use this path; legacy/native poses keep their original timing.
  const phasedTool=playerLike&&actor.toolAction?.toolUse?actor.toolAction:null;
  const toolMotion=phasedTool?sampleToolActionMotion(phasedTool,progress*phasedTool.durationMs):null;
  // Right-hand held tools mirror both arm meshes (and the tool) onto the displayed right (+Y);
  // heldSwing names the holding arm after that mirror and hm mirrors its authored lateral yaw.
  const rightHeld=playerLike&&NATIVE_RIGHT_HELD.has(kind),heldSwing=rightHeld?2:-2,hm=rightHeld?-1:1;
  const rifle=rightHeld&&toolMotion&&Object.hasOwn(CLOSE_VIEW_RIFLE_GRIP,phasedTool.toolKind)?CLOSE_VIEW_RIFLE_GRIP[phasedTool.toolKind]:null;
  const muzzleOut=actor.muzzleOut instanceof Float32Array&&actor.muzzleOut.length>=4?actor.muzzleOut:null;if(muzzleOut)muzzleOut[3]=0;
  const alpha = Number.isFinite(actor.alpha) ? Math.max(0, Math.min(1, actor.alpha)) : 1;
  const stagger = Number.isFinite(actor.stagger) ? Math.max(0, Math.min(1, actor.stagger)) : 0;
  // The Saint is stone while watched. Reduced motion suppresses ambient/gait flourish, never attack readability.
  const secondary = actor.reduceMotion || (kind === 'weepingSaint' && actor.watched) ? 0 : 1;
  const turnAmount = Number.isFinite(actor.turn) ? Math.max(-1, Math.min(1, actor.turn)) : 0;
  const beat = Math.sin(phase) * moving;
  const heel = Math.cos(phase * 2) * moving;
  const windup = pose === "windup" ? progress : 0;
  // Contact comes early, then the cut carries through before recovering. Damage remains a gameplay event;
  // this curve only makes its already-immediate result read as a committed, weighted blow.
  let strike = 0;
  if (pose === "attack" || pose === "fist") {
    if (progress < .18) { const t = progress / .18; strike = t * t * (3 - 2 * t); }
    else if (progress < .52) strike = 1;
    else { const t = (progress - .52) / .48; strike = 1 - t * t * (3 - 2 * t); }
  }
  if ((kind === 'playerCinderPike' || kind === 'playerVergeCleaver') && pose === 'attack') {
    if (progress < .08) { const t = progress / .08; strike = t * t * (3 - 2 * t); }
    else if (progress < .30) strike = 1;
    else { const t = (progress - .30) / .70; strike = 1 - t * t * (3 - 2 * t); }
  }
  if(kind==='playerHammerStomp'||phasedTool)strike=0;
  const tool = phasedTool?toolMotion?.weight||0:pose === "tool" ? Math.sin(Math.PI * progress) : 0;
  const cast = pose === "cast" ? Math.sin(Math.PI * progress) : 0;
  const jump = pose === "jump" ? Math.sin(Math.PI * progress) : 0;
  const jumpSettle = pose === "jump" && progress > .72 ? Math.sin((progress - .72) / .28 * Math.PI) : 0;
  const flinch = pose === "hit" ? progress : 0;
  const drinking=playerLike&&pose==='drink',drink=drinking?sampleDrinkPose(progress,actor.reduceMotion,DRINK_POSE):null;
  const shovelDigging=playerLike&&pose==='shovelDig',shovel=shovelDigging?sampleShovelDigPose(progress,actor.reduceMotion,DRINK_POSE):null;
  const placingStone=playerLike&&pose==='placeStone',place=placingStone?stonePlaceWeight(progress,actor.reduceMotion):0;
  const chestOpening=playerLike&&pose==='openChest';
  const collecting=playerLike&&(pose==='collect'||chestOpening);
  const reach=chestOpening?chestOpenWeight(progress,actor.reduceMotion):collecting?cacheReachWeight(progress,actor.reduceMotion):0;
  const lidLift=chestOpening?Math.min(1,Math.max(0,(progress-.32)/.25)):0;
  const fall = pose === "death" ? progress : 0;
  const knocked = pose === "knockdown" ? progress : 0;
  const turnLean = turnAmount * .13 * secondary;
  const fist = pose === "fist", chargingFist = pose === "fistCharge", fistStep = [1,2,3].includes(actor.fistStep) ? actor.fistStep : 1;
  const cf=actor.cleaverFrame,nativeCleaver=kind==='playerVergeCleaver'&&cf&&CLEAVER_FRAME_KEYS.every(k=>Number.isFinite(cf[k])&&Math.abs(cf[k])<=2),
    stage=actor.primaryStage??primaryVisualStage(actor),meleePose=playerLike&&(pose==='attack'||pose==='fist')?sampleMeleeActionPose(actor.meleeAction,progress,stage?.step??fistStep,actor.fistLead):null,
    weightedFists=meleePose?.kind==='iron-fists',newCleaver=!nativeCleaver&&kind==='playerVergeCleaver'&&(meleePose?.kind==='verge-cleaver'||!stage||stage.kind==='cleaver-four'||stage.kind==='cleaver-three'),opaqueCleaver=kind==='playerVergeCleaver'&&!meleePose&&stage?.kind==='opaque',cut=meleePose?.kind==='verge-cleaver'?meleePose:newCleaver?cleaverCutMotion(stage,pose==='attack'?progress:0):null;
  if(meleePose)strike=meleePose.weight;
  // The shared frame already contains the full action pose. Do not layer the retired
  // generic attack shove/pitch over its wrist target or its authored level cuts.
  if(nativeCleaver)strike=0;
  if(newCleaver)strike=cut.weight;if(opaqueCleaver)strike=0;
  const primaryStep=[1,2,3].includes(actor.primaryStep)?actor.primaryStep:1,canonicalPrimary=kind==='playerCinderPike'||kind==='playerVergeCleaver';
  const cleaverRig = nativeCleaver ? nativeCleaverRig(cf) : null;
  const cleaverLoad = actor.reduceMotion ? .55 : 1;
  // An ordinary 3D creature's attack takes its root motion from creatureRootPose (CREATURE_POSE) in place of the generic
  // windup pitch and strike shove/lean/turn below (gen 0); its limbs keep their windup/strike swings.
  const root = playerLike ? null : creatureRootPose(actor).family ? ROOT_POSE : null, gen = root ? 0 : 1;
  // The shared motion layers (creature-motion.ts): continuity across a broken-off or chained attack, the hit reactions, idle and
  // locomotion life, the arrival, and a per-family fall; rigid offsets here, the three-band bend in the vertex loop below.
  if (root) motionCarry(actor.motionState, root, root.stage, actor.effectTime);
  const mo = root ? creatureMotion(actor, root.family, root) : null, rig = mo && (mo.bend || fall > 0) ? creatureRigFrame(kind) : null;
  const fallR = root && fall > 0 ? deathFall(fall) : 0, D = fallR ? CREATURE_MOTION.death[root.family] : null;
  const deathPitch = D ? (mo.push < 0 ? -D.pitch : D.pitch) * fallR : 0, deathRoll = D ? (mo.pushSide < 0 ? -D.roll : D.roll) * fallR : 0;
  const rootSquash = root ? 1 - Math.max(-.12, Math.min(.75, root.squash + mo.squash + (D ? D.squash * fallR : 0))) : 1, rootLift = root ? root.lift + mo.lift : 0;
  const roll = mo ? mo.roll + deathRoll : 0, rollOn = roll !== 0, rollC = rollOn ? Math.cos(roll) : 1, rollS = rollOn ? Math.sin(roll) : 0;
  const B = rig && mo.bend ? bendFrame(BEND_FRAME, mo, rig) : null;
  // a layered creature's blow tints it as the hit pose did; its arrival fades it in
  const FLASH = CREATURE_MOTION.impact.flash, flashK = root && actor.impactFlash > 0 ? Math.min(1, actor.impactFlash) * CREATURE_MOTION.impact.flashAmount : 0;
  const ground = root && GROUND_FAMILIES.has(root.family) ? groundLift * size : 0; // set down on the floor (CREATURE_GROUND)
  const tint = root && Number.isFinite(actor.hitReact) ? Math.max(flinch, Math.max(0, Math.min(1, actor.hitReact))) : flinch, drawnAlpha = mo ? alpha * mo.alpha : alpha;
  const turn0 = nativeCleaver?-cf.twist*cleaverLoad+turnLean:newCleaver?-cut.twist+turnLean:weightedFists?meleePose.twist+turnLean:(canonicalPrimary ? primaryStep===2?-.22:primaryStep===3?.06:.22 : fist ? fistStep === 2 ? -.10 : .10 : .21 * gen) * strike + .08 * cast + turnLean, turn = root ? turn0 + root.twist + mo.twist : turn0;
  const cy = Math.cos(yaw + turn), sy = Math.sin(yaw + turn);
  const pitch0 = (nativeCleaver?cf.lean*cleaverLoad:0) -.10 * (chargingFist ? progress : 0) - .18 * windup * gen + (weightedFists?(meleePose.move==='dash'?.22:meleePose.move==='uppercut'?.16:.10)*meleePose.drive:(newCleaver&&!meleePose?CLEAVER_FOUR_SWEEP.nativeLean:.29 * gen) * strike) - .11 * tool - .12 * cast - .12 * jump -.07*(drink?.head||0) + .30*(shovel?.down||0)-.14*(shovel?.lever||0)+.22*place + .16 * stagger
    + .09 * jumpSettle - .24 * flinch + (root ? 0 : 1.52 * fall) - 1.52 * knocked + (kind==='playerCinderPike'?.045:.075)*reach
    + (playerLike && actor.charge > 0 ? CLOSE_VIEW_SHADOW_FORMS.dash.nativeLean * Math.min(1, actor.charge) * (actor.reduceMotion ? .5 : 1) : 0), pitch = root ? pitch0 + root.lean + mo.lean + deathPitch : pitch0; // Shadow Boxing charge lean
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const base = secondary * (.012 * Math.sin(phase * 2) * (1 - moving) + .052 * Math.abs(beat) - .014 * heel)
    * (1 - fall) * (1 - knocked) - .075 * jumpSettle - .10 * stagger + (D ? deathSink(rig, deathPitch, deathRoll) : (kind === "pallidCrawler" ? .61 : .36) * fall) + .35 * knocked;
  const shift0 = (weightedFists?(meleePose.move==='dash'?.25:.13)*meleePose.drive:(kind === 'playerCinderPike' ? primaryStep===3?.28:primaryStep===2?.19:.22 : .14 * gen) * strike) - .06 * tool + .05 * cast - .055 * jump - .08 * flinch, shift = root ? shift0 + (root.lunge + mo.lunge) / size : shift0;
  const stride = kind === "pallidCrawler" ? .23 : .48;
  const hound = kind === "ashenHound";
  const foundry = kind.startsWith('foundry-');
  const actionFamily = typeof actor.actionFamily === 'string' ? actor.actionFamily : '';
  const actionPhase = typeof actor.actionPhase === 'string' ? actor.actionPhase : '';
  const actionProgress = Number.isFinite(actor.actionProgress) ? Math.max(0, Math.min(1, actor.actionProgress)) : progress;
  // Pack phases are authoritative. `strike` (notably blinkStrike) is still pre-hit; resolved contact/release
  // begins `recover`. Sustained beam/inhale/charge active phases hold their posture instead of oscillating.
  const actionWeight = actionPhase === 'windup' || actionPhase === 'track' || actionPhase === 'lock' || actionPhase === 'travel' || actionPhase === 'strike'
    ? actionProgress : actionPhase === 'active' || actionPhase === 'erupt' ? 1
      : actionPhase === 'recover' ? 1 - actionProgress : 0;
  const hammerWeight=kind==='playerHammerStomp'?hammerFrames(progress):0;
  const nativeJump=ordinaryNativeJump(actor),nativeJumpBaseline=pose==='jump'&&ordinaryJumpKind(kind)&&!kind.startsWith('playerIronFists');if(nativeJump||nativeJumpBaseline)nativeJumpFrames(actor,beat,stride,jump,jumpSettle,nativeJump);
  const nativePike=kind==='playerCinderPike'&&['idle','walk','attack','drink','collect','openChest','placeStone'].includes(pose);if(nativePike)nativePikeFrame(pose==='attack'?progress:0,primaryStep);
  const freeSwing=drinking||collecting||placingStone?-heldSwing:0;
  const walkerGesture=kind==='voidWalker'&&Number.isFinite(actor.walkerGesture)?Math.max(0,Math.min(1,actor.walkerGesture)):0;
  for (const { mesh, swing:sourceSwing, px, pz, axialSpin, carryingOnly, hammerPart, pikeArm, pikeWeapon, cleaverArm, cleaverWeapon, walkerBone, muzzle, heldTool } of models[kind]) {
    const jumpPart=nativeJump||nativeJumpBaseline?JUMP_PARTS.get(mesh):null;
    const mirroredArm=rightHeld&&Math.abs(sourceSwing)===2,swing=mirroredArm?-sourceSwing:sourceSwing;
    const coilSway = swing === 4 || swing === 5
      ? Math.sin(phase - (swing - 4) * .92) * (.028 + .065 * moving) * (1 - fall)
      : swing >= 40 && swing < 60
        ? Math.sin(phase * 1.3 - swing * .57) * (.018 + .045 * moving) * secondary * (1 - fall)
      : 0;
    let angle = semanticAngle(kind, swing, actor.action, actionFamily, actionPhase, actionProgress, actionWeight, beat, moving, phase, secondary);
    if (playerLike&&weightedFists&&Math.abs(swing)===2) {
      const striking=swing===(meleePose.lead>0?-2:2),guard=meleePose.move==='uppercut'?-.72:-.58;
      angle=striking?guard-(meleePose.move==='uppercut'?1.62:meleePose.move==='dash'?1.18:.96)*meleePose.drive:guard-.16*meleePose.drive+.20*meleePose.recovery;
    } else if(playerLike&&weightedFists&&Math.abs(swing)===1) {
      // Rear-foot drive and the opposite planted lead foot survive even with ambient motion suppressed.
      const rear=swing===(meleePose.lead>0?1:-1);angle=(rear?-.44:.24)*meleePose.drive+(rear?.18:-.10)*meleePose.recovery;
    } else if (kind === "corridorGolem" && Math.abs(swing) === 2 && fist) {
      // The producer has already hit: extend at contact, then recover continuously
      // through its actual inter-punch gap, ending at the ordinary neutral arm.
      const lead=swing===(fistStep===2?2:-2),drive=(1-progress)*(1-progress);
      angle=-(lead?1.35:.22)*drive;
    } else if (playerLike && Math.abs(swing) === 2 && (fist || chargingFist)) {
      const lead=swing===(fistStep===2?2:-2);
      angle=chargingFist?-.65-.35*progress:lead?-.65-(fistStep===3?1.75:.95)*strike:-.55-.18*strike;
    } else if (angle !== null) { /* authored action-family joint */ }
    else if (swing === 4 || swing === 5) angle = (.12 + (swing - 4) * .07) * (strike - windup)
      + Math.sign(turnAmount || 1) * .04 * Math.abs(turnAmount) * secondary;
    else if (swing === 6) angle = .19 * beat - .23 * windup + .24 * strike;
    else if (Math.abs(swing) === 7) angle = Math.sign(swing) * ((.10 * Math.sin(phase * 4) + .25 * beat) * secondary + .34 * windup - .72 * strike);
    else if (swing === 8) angle = .08 * Math.sin(phase * 1.7) * secondary + .12 * windup - .20 * strike;
    else if (swing >= 70) angle = Math.sin(phase + swing * 1.3) * (.08 + .28 * moving) * secondary + (swing >= 73 ? .30 : .16) * windup - (swing >= 73 ? .52 : .30) * strike;
    else if (swing >= 60) angle = Math.sin(phase * 1.1 + swing * 1.17) * .10 * secondary + .24 * windup - .42 * strike;
    else if (swing >= 50) angle = Math.sin(phase * 1.25 + swing * .81) * (.08 + .08 * moving) * secondary + .18 * windup - .28 * strike;
    else if (swing >= 40) angle = Math.sin(phase * 1.5 - swing * .65) * (.08 + .18 * moving) * secondary + .18 * windup - .34 * strike;
    else if (swing >= 30) angle = Math.sin(phase * (swing < 32 ? 1.4 : 1.8) + swing) * .12 * secondary + .22 * windup - .38 * strike;
    else if (swing >= 20) angle = (swing === 24 ? Math.sin(phase * 1.4) * .16 * secondary : Math.sin(phase + swing * 1.57) * (.12 + .35 * moving) * secondary)
      + (swing < 22 ? .25 * windup - .48 * strike : -.12 * windup + .22 * strike);
    else if (swing >= 10) angle = Math.sin(phase * 1.25 + swing * .83) * (.08 + moving * .08) * secondary + .16 * windup - .22 * strike;
    else if (hound && swing) angle = -Math.sign(swing) * beat * .50
      + (Math.abs(swing) === 2 ? .27 * windup - .48 * strike + .28 * jump : -.16 * windup + .24 * strike - .34 * jump);
    else if (swing === 3) angle = -.16 * moving + .11 * beat + .24 * strike - .13 * jump + .08 * turnLean;
    else if (swing === heldSwing) angle = -Math.sign(swing) * beat * stride + 1.15 * windup - 1.96 * strike - 1.1 * tool
      - (playerLike ? .28 : .08) * cast + .22 * flinch + .58 * jump - .22 * jumpSettle;
    else if (swing === -heldSwing) angle = -Math.sign(swing) * beat * stride + .35 * windup - .43 * strike
      + (playerLike ? 1.02 : .18) * cast - .18 * flinch + .58 * jump - .22 * jumpSettle;
    else angle = -swing * beat * stride - Math.sign(swing) * .64 * jump + Math.sign(swing) * .28 * jumpSettle;
    if(newCleaver&&swing===-2){
      angle=Math.PI/2+.70+(-.70-cut.pitch)*cut.weight+beat*.08-.28*cast+.58*jump+.22*flinch;
    }else if(kind==='playerVergeCleaver'&&!newCleaver&&swing===-2){
      // Low one-handed carry plus the same accepted-only rising/outward/descending stage vocabulary.
      angle=1.15+beat*.08+(primaryStep===1?-1.65:primaryStep===2?-1.25:-.90)*strike-.28*cast+.58*jump+.22*flinch;
    } else if(kind==='playerCinderPike'&&swing===-2) angle+=(primaryStep===2?-.22:primaryStep===3?.22:0)*strike;
    if(toolMotion&&(swing===heldSwing||rifle&&swing===-heldSwing)){const w=toolMotion.weight,baseUp=phasedTool.toolKind==='lumen-spindle'?.18:phasedTool.toolKind==='rift-bombard'?-.13:-.08;
      angle=-Math.sign(swing)*beat*stride*(1-w)-(phasedTool.toolKind==='great-sweep'?.8:1.1+(rifle?rifle.nativeRaise:0))*w-(phasedTool.toolKind==='great-sweep'?0:(toolMotion.up-baseUp*w)*2);
      // Rifle grip: the support arm reaches forward under the barrel while the trigger arm aims.
      if(swing===-heldSwing)angle=-Math.sign(swing)*beat*stride*(1-w)+angle*rifle.nativeReach;}
    if(drinking&&swing===freeSwing&&kind!=='playerCinderPike')angle+=( -1.08-.14*drink.sip-angle)*drink.weight;
    if(collecting&&swing===freeSwing&&kind!=='playerCinderPike')angle+=((chestOpening?-.64-.49*lidLift:-.86)-angle)*reach;
    if(placingStone&&swing===freeSwing&&kind!=='playerCinderPike')angle+=(-.94-angle)*place;
    if(shovelDigging&&swing===-2)angle+=(-1.18*(shovel?.down||0)+.46*(shovel?.lever||0)-angle)*(shovel?.weight||0);
    if(shovelDigging&&swing===2)angle+=(-.50*(shovel?.down||0)-.28*(shovel?.lever||0)-angle)*(shovel?.weight||0);
    // Adventure creatures and Foundry kin: per-kind limb attack poses on the root pose's own stage clock, over their ambient sway
    // (close-view-adventure-models.ts ADVENTURE_JOINT_POSE).
    if (root && root.stage && ADVENTURE_JOINT_KINDS.has(kind)) {
      const a = adventureJointPose(kind, swing, actor.action || actor.rootAttack, root.style, root.stage, root.u, actor.reduceMotion ? CREATURE_POSE.reduced.scale : 1);
      if (a !== null) angle = (semanticAngle(kind, swing, '', '', '', 0, 0, beat, moving, phase, secondary) ?? -Math.sign(swing) * beat * stride) + a;
    }
    // creature-motion.ts: the upright families' arms (CREATURE_MOTION.arms) come up into a guard and fling with a flinch.
    if (mo && mo.arm !== 0 && MOTION_ARMS.has(swing) && UPRIGHT.has(root.family)) angle = (angle ?? 0) + mo.arm;
    // A frozen secondary sway may evaluate to -0; canonical zero keeps paused/watched vertices byte-stable.
    if (angle === 0) angle = 0;
    const spin = axialSpin && secondary && Number.isFinite(actor.effectTime) ? actor.effectTime / 2000 : 0, spinC = Math.cos(spin), spinS = Math.sin(spin);
    const c = Math.cos(angle), s = Math.sin(angle);
    // A raised right-hand tool stays level about the hand (heldTool) instead of tilting with the arm.
    const level=heldTool&&rightHeld&&tool>0?-angle*tool:0,levelC=Math.cos(level),levelS=Math.sin(level);
    const cutYaw = newCleaver&&swing===-2?-cut.yaw*cut.weight:rifle&&swing===-heldSwing?-Math.sign(swing)*rifle.nativeInward*toolMotion.weight:toolMotion&&swing===heldSwing?hm*toolMotion.yaw*toolMotion.weight:playerLike && !fist && !chargingFist && swing === heldSwing
      ? kind === 'playerCinderPike' ? 0 : hm * (kind === 'playerVergeCleaver' ? primaryStep===2?-1.18:primaryStep===3?.45:1.18 : .95) * Math.sin(progress * Math.PI * 2) * strike : 0;
    const cc = Math.cos(cutYaw), sc = Math.sin(cutYaw);
    const pivotY = playerLike && swing === heldSwing ? hm * (PLAYER_FORM_HANDS[kind.split(':')[0]]?.y ?? -.25) : rifle && swing === -heldSwing ? Math.sign(swing) * .25 : 0;
    const walkerArm = walkerBone?.chain.endsWith('Arm');
    const walkerGait = walkerBone && !walkerArm ? (walkerBone.chain.startsWith('left') ? -1 : 1) * beat * .34 * secondary : 0;
    const walkerParent = walkerArm ? -.08 - walkerGesture * .88 : walkerGait;
    const walkerChild = walkerArm ? -.10 - walkerGesture * .54 : -walkerGait * .72;
    const parentC = walkerBone ? Math.cos(walkerParent) : 1, parentS = walkerBone ? Math.sin(walkerParent) : 0;
    const childC = walkerBone ? Math.cos(walkerChild) : 1, childS = walkerBone ? Math.sin(walkerChild) : 0;
    for (let i = 0; i < mesh.length; i += MESH_FLOATS) {
      const localY = mirroredArm?-mesh[i+1]:axialSpin ? mesh[i + 1] * spinC - mesh[i + 2] * spinS : mesh[i + 1], localZ = axialSpin ? mesh[i + 1] * spinS + mesh[i + 2] * spinC : mesh[i + 2];
      const normalY = mirroredArm?-mesh[i+4]:axialSpin ? mesh[i + 4] * spinC - mesh[i + 5] * spinS : mesh[i + 4], normalZ = axialSpin ? mesh[i + 4] * spinS + mesh[i + 5] * spinC : mesh[i + 5];
      let mx0=mesh[i],mz0=localZ,nx0=mesh[i+3],nz0=normalZ;
      if(levelS!==0){const dx=mx0-heldTool[0],dz=mz0-heldTool[1],n0=nx0;mx0=heldTool[0]+dx*levelC+dz*levelS;mz0=heldTool[1]+dz*levelC-dx*levelS;nx0=n0*levelC+nz0*levelS;nz0=nz0*levelC-n0*levelS;}
      let forward = mx0 * c + mz0 * s + px;
      let lateral = localY + coilSway;
      let u = forward * cc - (lateral - pivotY) * sc;
      let v = forward * sc + (lateral - pivotY) * cc + pivotY;
      let w = mz0 * c - mx0 * s + pz;
      const armNormal=nx0*c+nz0*s;
      let nu=armNormal*cc-normalY*sc,nv=armNormal*sc+normalY*cc,nw=nz0*c-nx0*s;
      // creature-motion.ts: the torso, head and tail bands bend from each vertex's rest place, then the whole body rolls
      if(B){
        // each band turns by its angle times the vertex's weight in it (k): sin(ka) ~ k sin a, 1 - cos(ka) ~ k^2 (1 - cos a)
        const at=B.up?mesh[i+2]+pz:mesh[i]+px;let k=(at-B.tFrom)*B.tInv,s=0,cs=0,x=0;
        if(k>0&&B.tOn){if(k>1)k=1;const q=k*k;let du=u-B.tf,dw=w-B.tz;
          if(B.tP){s=k*B.tPS;cs=1-q*B.tPC;x=du*cs+dw*s;dw=dw*cs-du*s;du=x;x=nu*cs+nw*s;nw=nw*cs-nu*s;nu=x;}
          if(B.tY){s=k*B.tYS;cs=1-q*B.tYC;x=v*cs+du*s;du=du*cs-v*s;v=x;x=nv*cs+nu*s;nu=nu*cs-nv*s;nv=x;}
          if(B.tR){s=k*B.tRS;cs=1-q*B.tRC;x=v*cs+dw*s;dw=dw*cs-v*s;v=x;x=nv*cs+nw*s;nw=nw*cs-nv*s;nv=x;}
          u=B.tf+du;w=B.tz+dw;}
        k=(at-B.hFrom)*B.hInv;
        if(k>0&&B.hOn){k=k>1?1:k*k*(3-2*k);const q=k*k;let du=u-B.hf,dw=w-B.hz;
          if(B.hP){s=k*B.hPS;cs=1-q*B.hPC;x=du*cs+dw*s;dw=dw*cs-du*s;du=x;x=nu*cs+nw*s;nw=nw*cs-nu*s;nu=x;}
          if(B.hY){s=k*B.hYS;cs=1-q*B.hYC;x=v*cs+du*s;du=du*cs-v*s;v=x;x=nv*cs+nu*s;nu=nu*cs-nv*s;nv=x;}
          u=B.hf+du;w=B.hz+dw;}
        k=(B.lFrom-at)*B.lInv;
        if(k>0&&B.lOn){k=k>1?1:k*k*(3-2*k);const q=k*k;let du=u-B.lf,dw=w-B.lz;
          if(B.lP){s=k*B.lPS;cs=1-q*B.lPC;x=du*cs+dw*s;dw=dw*cs-du*s;du=x;x=nu*cs+nw*s;nw=nw*cs-nu*s;nu=x;}
          if(B.lY){s=k*B.lYS;cs=1-q*B.lYC;x=v*cs+du*s;du=du*cs-v*s;v=x;x=nv*cs+nu*s;nu=nu*cs-nv*s;nv=x;}
          u=B.lf+du;w=B.lz+dw;}
      }
      if(rollOn){const x=v*rollC+w*rollS;w=w*rollC-v*rollS;v=x;const y=nv*rollC+nw*rollS;nw=nw*rollC-nv*rollS;nv=y;}
      let f=u*cp+w*sp+shift,worldY=v,worldZ=base+w*cp-u*sp;
      let nf=nu*cp+nw*sp;nw=nw*cp-nu*sp;
      if(jumpPart){
        let a=u,b=v,d=w,na=nu,nb=nv,nd=normalZ*c-mesh[i+3]*s;
        if(jumpPart.foot){const k=jumpPart.side*3;a+=JUMP_DELTA[k]*nativeJump;b+=JUMP_DELTA[k+1]*nativeJump;d+=JUMP_DELTA[k+2]*nativeJump;}
        else if(nativeJumpBaseline){const k=jumpPart.side*360+i/MESH_FLOATS*6;a=JUMP_LEGS[k];b=JUMP_LEGS[k+1];d=JUMP_LEGS[k+2];na=JUMP_LEGS[k+3];nb=JUMP_LEGS[k+4];nd=JUMP_LEGS[k+5];}
        else{const k=jumpPart.side*360+i/MESH_FLOATS*6;a+=(JUMP_LEGS[k]-a)*nativeJump;b+=(JUMP_LEGS[k+1]-b)*nativeJump;d+=(JUMP_LEGS[k+2]-d)*nativeJump;na+=(JUMP_LEGS[k+3]-na)*nativeJump;nb+=(JUMP_LEGS[k+4]-nb)*nativeJump;nd+=(JUMP_LEGS[k+5]-nd)*nativeJump;const nl=Math.hypot(na,nb,nd)||1;na/=nl;nb/=nl;nd/=nl;}
        f=a*cp+d*sp+shift;worldY=b;worldZ=base+d*cp-a*sp;nf=na*cp+nd*sp;nv=nb;nw=nd*cp-na*sp;
      }
      if(nativePike&&(pikeArm!==undefined||pikeWeapon)){
        let a,b,d,na,nb,nd;
        if(pikeArm!==undefined){const k=pikeArm*360+i/MESH_FLOATS*6;a=PIKE_ARMS[k];b=PIKE_ARMS[k+1];d=PIKE_ARMS[k+2];na=PIKE_ARMS[k+3];nb=PIKE_ARMS[k+4];nd=PIKE_ARMS[k+5];}
        else{const m=PIKE_FRAME,along=mesh[i+2]+pz-.79,across=mesh[i+1]+.25,up=mesh[i]+px-.17;
          a=m[9]+m[0]*along+m[3]*across+m[6]*up;b=m[10]+m[1]*along+m[4]*across+m[7]*up;d=m[11]+m[2]*along+m[5]*across+m[8]*up;
          na=m[0]*mesh[i+5]+m[3]*mesh[i+4]+m[6]*mesh[i+3];nb=m[1]*mesh[i+5]+m[4]*mesh[i+4]+m[7]*mesh[i+3];nd=m[2]*mesh[i+5]+m[5]*mesh[i+4]+m[8]*mesh[i+3];}
        f=a*cp+d*sp+shift;worldY=b;worldZ=base+d*cp-a*sp;nf=na*cp+nd*sp;nv=nb;nw=nd*cp-na*sp;
      }
      if(cleaverRig&&(cleaverArm||cleaverWeapon)){
        // The rig is authored on the displayed-right side (+Y). The left-hand Cleaver reads each
        // vertex mirrored (-Y) through it, then mirrors the result back onto the left (-Y).
        let a,b,d,na,nb,nd;
        const nx=mesh[i+3],ny=-mesh[i+4],nz=mesh[i+5];
        if(cleaverArm){
          const t=Math.max(0,Math.min(1,(1.19-mesh[i+2])/.422));
          const {start,delta,axis,x,y}=t<.5?cleaverRig.upper:cleaverRig.lower;
          const q=t<.5?t*2:(t-.5)*2,ox=mesh[i],oy=-mesh[i+1]-.25;
          a=start[0]+delta[0]*q+x[0]*ox+y[0]*oy;
          b=start[1]+delta[1]*q+x[1]*ox+y[1]*oy;
          d=start[2]+delta[2]*q+x[2]*ox+y[2]*oy;
          na=x[0]*nx+y[0]*ny-axis[0]*nz;nb=x[1]*nx+y[1]*ny-axis[1]*nz;nd=x[2]*nx+y[2]*ny-axis[2]*nz;
        }else{
          // The five weapon meshes share one wrist transform, including the blade edge.
          const {wrist,blade:{x,y,z}}=cleaverRig;
          const along=mesh[i+2]+pz-.79,across=-(mesh[i+1]+.25),thick=mesh[i]+px-.17;
          a=wrist[0]+z[0]*along+y[0]*across+x[0]*thick;
          b=wrist[1]+z[1]*along+y[1]*across+x[1]*thick;
          d=wrist[2]+z[2]*along+y[2]*across+x[2]*thick;
          na=z[0]*nz+y[0]*ny+x[0]*nx;nb=z[1]*nz+y[1]*ny+x[1]*nx;nd=z[2]*nz+y[2]*ny+x[2]*nx;
        }
        b=-b;nb=-nb;
        f=a*cp+d*sp+shift;worldY=b;worldZ=base+d*cp-a*sp;nf=na*cp+nd*sp;nv=nb;nw=nd*cp-na*sp;
      }
      if(walkerBone){
        // Walker-only two-bone FK in the forward/up plane. Distal pieces first bend around
        // their real elbow/knee, then inherit the shoulder/hip turn. Reduced motion zeros
        // only gait; the accepted voidHand gesture remains fully readable.
        let a=mesh[i]+px,b=mesh[i+1],d=mesh[i+2]+pz,na=mesh[i+3],nb=mesh[i+4],nd=mesh[i+5];
        if (walkerBone.segment === 'lower') {
          const [ox, , oz] = walkerBone.pivot, dx = a - ox, dz = d - oz;
          a = ox + dx * childC + dz * childS; d = oz + dz * childC - dx * childS;
          const qx = na * childC + nd * childS; nd = nd * childC - na * childS; na = qx;
        }
        const ox = walkerArm ? 0 : -.015, oz = walkerArm ? 1.03 : .48, dx = a - ox, dz = d - oz;
        a = ox + dx * parentC + dz * parentS; d = oz + dz * parentC - dx * parentS;
        const qx = na * parentC + nd * parentS; nd = nd * parentC - na * parentS; na = qx;
        f=a*cp+d*sp+shift;worldY=b;worldZ=base+d*cp-a*sp;nf=na*cp+nd*sp;nv=nb;nw=nd*cp-na*sp;
      }
      if(hammerPart!==undefined){
        const o=hammerPart*12,m=HAMMER_FRAMES,mx=mesh[i],my=mesh[i+1],mz=mesh[i+2],nx=mesh[i+3],ny=mesh[i+4],nz=mesh[i+5],zl=Math.hypot(m[o+6],m[o+7],m[o+8])||1;
        f=m[o]*mx+m[o+3]*my+m[o+6]*mz+m[o+9];worldY=m[o+1]*mx+m[o+4]*my+m[o+7]*mz+m[o+10];worldZ=m[o+2]*mx+m[o+5]*my+m[o+8]*mz+m[o+11];
        nf=m[o]*nx+m[o+3]*ny+m[o+6]/zl*nz;nv=m[o+1]*nx+m[o+4]*ny+m[o+7]/zl*nz;nw=m[o+2]*nx+m[o+5]*ny+m[o+8]/zl*nz;
      }else if(kind==='playerHammerStomp')worldZ-=.04*hammerSmooth((progress*570-240)/80)*hammerWeight+base*hammerWeight;
      out[offset++]=x+(f*cy-worldY*sy)*size;out[offset++]=y+(f*sy+worldY*cy)*size;out[offset++]=root?z+worldZ*rootSquash*size+rootLift-ground:z+worldZ*size;
      out[offset++]=nf*cy-nv*sy;out[offset++]=nf*sy+nv*cy;out[offset++]=nw;
      const poison = actor.poison ? .55 : 0;
      let sourceRed=mesh[i+6],sourceGreen=mesh[i+7],sourceBlue=mesh[i+8];
      if(foundry){const rgb=(Math.round(sourceRed*255)<<16)|(Math.round(sourceGreen*255)<<8)|Math.round(sourceBlue*255),mapped=foundryPaletteColor(rgb,actor.palette);sourceRed=(mapped>>16)/255;sourceGreen=((mapped>>8)&255)/255;sourceBlue=(mapped&255)/255;}
      if(actor.paletteMap){const rgb=(Math.round(sourceRed*255)<<16)|(Math.round(sourceGreen*255)<<8)|Math.round(sourceBlue*255),mapped=actor.paletteMap[rgb];if(Number.isInteger(mapped)){sourceRed=(mapped>>16)/255;sourceGreen=((mapped>>8)&255)/255;sourceBlue=(mapped&255)/255;}}
      if(actor.shadow&&kind!=='playerShadow'){const eye=Math.abs(sourceRed-0xc7/255)<.001&&Math.abs(sourceGreen-0xe6/255)<.001;sourceRed=(eye?0xb4:0x1b)/255;sourceGreen=(eye?0x8c:0x10)/255;sourceBlue=(eye?0xff:0x30)/255;}
      const red = sourceRed + (.32 - sourceRed) * poison;
      const green = sourceGreen + (.82 - sourceGreen) * poison;
      const blue = sourceBlue + (.24 - sourceBlue) * poison;
      const r1 = red + (.96 - red) * tint * .6, g1 = green + (.34 - green) * tint * .6, b1 = blue + (.23 - blue) * tint * .6; // the hurt tint
      out[offset++] = flashK > 0 ? r1 + (FLASH[0] - r1) * flashK : r1; // the blow's first instant: white-hot (CREATURE_MOTION.impact)
      out[offset++] = flashK > 0 ? g1 + (FLASH[1] - g1) * flashK : g1;
      out[offset++] = flashK > 0 ? b1 + (FLASH[2] - b1) * flashK : b1;
      const bodyAlpha = kind === 'gloomgorge' ? drawnAlpha * Math.max(.32, Math.min(1, .45 + .75 * Math.max(0, w))) : drawnAlpha;
      out[offset++] = carryingOnly && !actor.carrying ? 0 : bodyAlpha;
    }
    if(muzzle&&muzzleOut){
      // The held tool's muzzle through this part's exact general arm transform (no rig/jump paths).
      let mx=muzzle[0],mz=muzzle[2];if(levelS!==0){const dx=mx-heldTool[0],dz=mz-heldTool[1];mx=heldTool[0]+dx*levelC+dz*levelS;mz=heldTool[1]+dz*levelC-dx*levelS;}
      const my=mirroredArm?-muzzle[1]:muzzle[1],mf=mx*c+mz*s+px,mu=mf*cc-(my-pivotY)*sc,mv=mf*sc+(my-pivotY)*cc+pivotY,mw=mz*c-mx*s+pz,ff=mu*cp+mw*sp+shift,fz=base+mw*cp-mu*sp;
      muzzleOut[0]=x+(ff*cy-mv*sy)*size;muzzleOut[1]=y+(ff*sy+mv*cy)*size;muzzleOut[2]=z+fz*size;muzzleOut[3]=Number.isFinite(muzzleOut[0]+muzzleOut[1]+muzzleOut[2])?1:0;
    }
  }
  if (root && fall > 0) { // a falling or fallen body rests on the floor (solidity pass 2): its lowest point is set down on its ground
    let low = Infinity; for (let o = modelStart + 2; o < offset; o += MODEL_FLOATS) if (out[o] < low) low = out[o];
    const drop = low - z; if (drop > 0 && Number.isFinite(drop)) for (let o = modelStart + 2; o < offset; o += MODEL_FLOATS) out[o] -= drop; }
  for (const attachment of attachments) offset = writeAttachment(out, offset, attachment, drawnAlpha, actorScale);
  return offset;
}

// Numeric groups are deliberately local to authored recipes: they describe a joint role, not a global oscillator.
// Actual pack phases drive contact/recoil; locomotion only contributes where that body owns gait or hover motion.
function semanticAngle(kind, swing, action, family, actionPhase, p, force, beat, moving, phase, secondary) {
  const wind = actionPhase === 'windup' || actionPhase === 'track' || actionPhase === 'lock' || actionPhase === 'travel' || actionPhase === 'strike' ? p : 0;
  const active = actionPhase === 'active' || actionPhase === 'erupt' ? 1 : 0;
  // Damage/release for ordinary pack attacks has already happened when recovery starts.
  const contact = actionPhase === 'recover' ? 1 - p : actionPhase === 'erupt' && action === 'burrowAmbush' ? 1 : 0;
  const recoil = actionPhase === 'recover' ? 1 - p : 0;
  if (kind.startsWith('foundry-')) {
    // These IDs are Foundry-local morphology joints, not the similarly numbered pack joints.
    const ranged = family === 'ranged', stab = family === 'stab', slam = family === 'slam';
    const release = ranged ? .22 * wind - .32 * contact : stab ? .38 * wind - .62 * contact : slam ? .48 * wind - .66 * contact : .32 * wind - .52 * contact;
    if (kind === 'foundry-quadruped') return swing === 24 ? Math.sin(phase * 1.4) * .12 * secondary + .3 * release : swing >= 20 ? Math.sin(phase + swing * 1.57) * .38 * moving * secondary + (swing < 22 ? 1 : -.45) * release : .35 * release;
    if (kind === 'foundry-floating') return swing < 32 ? .35 * release : Math.sin(phase * 1.5 + swing) * .10 * secondary + (swing % 2 ? 1 : -1) * release;
    if (kind === 'foundry-segmented') return Math.sin(phase * 1.5 - swing * .65) * (.025 + .15 * moving) * secondary + (swing === 43 ? 1.3 : swing < 43 ? .35 : .6) * release;
    if (kind.startsWith('foundry-tentacled')) return swing < 52 ? .4 * release : Math.sin(phase * 1.25 + swing) * (.05 + .10 * moving) * secondary + (ranged ? (swing % 2 ? 1 : -1) : 1) * release;
    if (kind === 'foundry-geometric') return swing === 60 ? .4 * release : Math.sin(phase * 1.1 + swing * 1.17) * .07 * secondary + (swing % 2 ? 1 : -1) * release;
    if (kind.startsWith('foundry-biomechanical')) return swing === 70 ? .3 * release : swing < 73 ? (swing === 71 ? 1 : -1) * beat * .35 * secondary - .3 * release : Math.sin(phase + swing * 1.3) * (.04 + .10 * moving) * secondary + (swing < 75 ? 1.4 : .65) * release;
  }
  // Pallid Crawler retains its exact legacy bite/leap route. Other production hybrids articulate its existing
  // splayed front (|2|) and rear (|1|) joints instead of borrowing the bite clock or a periodic oscillator.
  if (kind === 'pallidCrawler' && swing) {
    const side = Math.sign(swing), front = Math.abs(swing) === 2;
    if (family === 'stab') return front ? side * (.58 * wind - .92 * contact) : -side * .18 * force;
    if (family === 'sweep') return side * (front ? .64 : -.30) * force;
    if (family === 'charge') return (front ? -.42 : .24) * force;
    if (family === 'beam' || family === 'ranged') return front ? .34 * wind - .48 * contact : -.16 * force;
    if (family === 'curse') return side * (front ? .34 : -.24) * force;
    if (family === 'burrow') return (front ? .48 : -.36) * force;
    if (family === 'dive') return (front ? -.38 : .52) * force;
    if (family === 'teleport') return side * (front ? -.44 : .32) * force;
    if (family === 'slam') return (front ? .52 : -.24) * wind - (front ? .72 : -.36) * contact;
    return null;
  }
  // Each family has a deliberate preparation, held action and resolved release. These sample the
  // producer's phase clock once; no periodic attack motion or additional presentation timer is introduced.
  const gesture = family === 'bite' ? -.34 * wind + .24 * active + .52 * contact
    : family === 'stab' ? -.42 * wind + .38 * active + .72 * contact
    : family === 'sweep' ? -.50 * wind + .36 * active + .76 * contact
    : family === 'slam' ? -.60 * wind - .28 * active + .82 * contact
    : family === 'beam' ? -.32 * wind - .44 * active + .26 * contact
    : family === 'charge' ? -.40 * wind - .48 * active + .34 * contact
    : family === 'ranged' ? -.30 * wind - .24 * active + .48 * contact
    : family === 'curse' ? -.38 * wind - .46 * active + .34 * contact
    : family === 'teleport' ? -.44 * wind - .35 * active + .48 * contact
    : family === 'leap' ? -.48 * wind - .38 * active + .62 * contact
    : family === 'burrow' ? .48 * wind + .56 * active - .44 * contact
    : family === 'dive' ? -.54 * wind - .64 * active + .42 * contact
    : family === 'summon' ? -.42 * wind - .50 * active + .36 * contact
    : family === 'inhale' ? -.44 * wind - .60 * active + .28 * contact
    : family === 'howl' ? -.46 * wind - .62 * active + .36 * contact : 0;
  // Grounded quadrupeds lead with their forelimbs and head, with the hind pair bracing. A claw sweep
  // really moves the Lynx's forelegs; a Thunderhorn bite/slam articulates the horned head and hooves.
  if ((kind === 'riftLynx' || kind === 'thunderhorn') && Math.abs(swing) >= 1 && Math.abs(swing) <= 2) {
    const front = Math.abs(swing) === 2, side = Math.sign(swing);
    return -side * beat * .42 * secondary + (front ? (family === 'sweep' ? side : 1) : -.4) * gesture;
  }
  if (kind === 'riftLynx' && swing === 84) return .85 * gesture;
  if (kind === 'amalgam' && swing >= 50 && swing <= 57) {
    if (swing >= 56) return (swing === 56 ? 1 : .75) * gesture;
    return Math.sin(phase * 1.4 + swing) * (.04 + .10 * moving) * secondary + (swing % 2 ? -1 : 1) * gesture;
  }
  if (swing < 20) return null;
  if (swing === 20 || swing === 21) { // opposed jaws/maws: wind open, close on bite, hold the inhale aperture
    const open = family === 'inhale' || family === 'howl' ? .85 * wind + .95 * active - .42 * contact
      : family === 'bite' ? .72 * wind + .55 * active - .58 * contact + .32 * recoil : .65 * gesture;
    return (swing === 20 ? 1 : -1) * open;
  }
  if (swing === 22 || swing === 23) { // six Seraph wings fold for a dive and fan outward on release
    const flap = Math.sin(phase * 2.8 + (swing === 23 ? Math.PI : 0)) * (.12 + .20 * moving) * secondary;
    const wingAction = family === 'dive' ? -.62 * wind - .70 * active + .45 * contact
      : family === 'ranged' || family === 'beam' ? .46 * wind + .38 * active - .25 * contact : .75 * gesture;
    return flap + wingAction;
  }
  if (swing === 24) return family === 'charge' ? -.46 * wind - .32 * active + .36 * contact + .20 * recoil : .85 * gesture; // horned head
  if (swing === 25 || swing === 26) { // Gloomgorge hooked arms
    const side = swing === 25 ? -1 : 1, gait = side * beat * .16 * secondary;
    return gait + side * (family === 'sweep' ? .85 * wind - 1.18 * contact + .42 * recoil : .85 * gesture);
  }
  if (swing === 30) return family === 'ranged' ? -.42 * wind + .64 * contact - .20 * recoil : .04 * Math.sin(phase * 1.4) * secondary + .45 * gesture; // mortar brace
  if (swing === 31) return .08 * Math.sin(phase * 1.3) * secondary + .75 * gesture; // Lantern cage and Choir suspension
  if (swing >= 32 && swing <= 39) return Math.sin(phase * 1.15 + swing) * .06 * secondary + (family === 'dive' ? 1 : swing % 2 ? -1 : 1) * .85 * gesture; // suspended singers/censers
  if (swing >= 40 && swing <= 44) return Math.sin(phase * .8 + swing) * .035 * secondary
    + (family === 'teleport' ? (swing - 42) * .55 : family === 'sweep' || family === 'summon' ? (swing % 2 ? -1 : 1) : 1) * gesture; // mirror planes
  if (swing >= 50 && swing <= 54) return Math.sin(phase * 1.4 + swing) * (.04 + .10 * moving) * secondary
    + (family === 'stab' ? .72 * wind - 1.04 * contact + .32 * recoil : (swing % 2 ? -1 : 1) * gesture); // Saint hands clear the face
  if (swing >= 55 && swing <= 59) return Math.sin(phase + swing) * .055 * secondary + .85 * gesture; // Maw grasping feelers
  if (swing >= 60 && swing <= 69) {
    if (kind === 'lumenWraith' && swing === 64) return (family === 'bite' || family === 'stab' ? 1.15 : .45) * gesture; // lens/hood snap
    return Math.sin(phase * 1.2 + swing) * .075 * secondary + (swing % 2 ? -1 : 1) * .85 * gesture; // light ribbons brace the shroud
  }
  if (swing >= 70 && swing <= 79) {
    if (kind === 'veilSpinner' && swing === 78) return (family === 'bite' ? 1.2 : .65) * gesture; // head thrust
    return Math.sin(phase * 2.2 + swing) * (.05 + .13 * moving) * secondary + (swing < 74 ? 1 : -.6) * gesture; // front/rear skitter legs
  }
  if (swing === 80 || swing === 81) return Math.sin(phase * 1.8 + swing) * .14 * secondary + (swing === 80 ? -1 : 1) * .65 * gesture; // forked Lynx tail
  if (swing >= 82 && swing <= 89) return Math.sin(phase - (swing - 82) * .8) * (.04 + .10 * moving) * secondary + .8 * gesture; // delver segment brace
  if (swing >= 90 && swing <= 99) return Math.sin(phase * 2.5 + swing) * (.05 + .15 * moving) * secondary + (swing < 92 ? 1 : -.6) * gesture; // beetle forelegs brace its shell
  if (swing >= 100) return Math.sin(phase * 1.3 + swing) * .07 * secondary + (swing % 2 ? -1 : 1) * .85 * gesture; // wisp plume contracts around the grin

  return null;
}

function writeAttachment(out, offset, attachment, alpha, scale) {
  const r = .075 * scale, top = [0, 0, r], bottom = [0, 0, -r], ring = [[r,0,0],[0,r,0],[-r,0,0],[0,-r,0]], color = Number.isSafeInteger(attachment.color) ? attachment.color : 0x9ad9d2;
  const triangles = [];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; triangles.push([top,ring[i],ring[j]],[bottom,ring[j],ring[i]]); }
  for (const tri of triangles) {
    const [a,b,c] = tri, ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,n=Math.hypot(nx,ny,nz)||1;
    for (const p of tri) { out[offset++]=attachment.x+p[0];out[offset++]=attachment.y+p[1];out[offset++]=attachment.z+p[2];out[offset++]=nx/n;out[offset++]=ny/n;out[offset++]=nz/n;out[offset++]=(color>>16)/255;out[offset++]=((color>>8)&255)/255;out[offset++]=(color&255)/255;out[offset++]=alpha; }
  }
  return offset;
}
