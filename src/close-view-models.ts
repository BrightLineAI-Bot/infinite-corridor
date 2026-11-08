// Raw recipes are RGB meshes; compiled vertices add explicit scalar alpha for the GPU model stream.
import { MESH_FLOATS, prism, box, bevel, flare, taper, ellipsoid, ringLoft, verticalLoft, curvedTube, membrane, part, block } from './close-view-mesh.ts';
import { CLOSE_VIEW_ARCOLOGY_MODELS } from './close-view-arcology-models.ts';
import { CLOSE_VIEW_FOUNDRY_MODELS, CLOSE_VIEW_FOUNDRY_VARIANTS, foundryPaletteColor } from './close-view-foundry-models.ts';
import { CLOSE_VIEW_PENTAGON_MODELS } from './close-view-pentagon-models.ts';
import { CLOSE_VIEW_PLAYER_FORM_MODELS } from './close-view-player-forms.ts';
import { CLOSE_VIEW_COMPANION_MODELS } from './close-view-companion-models.ts';
import { PLAYER_FORM_HANDS } from './close-view-player-presentation.ts';
export { MESH_FLOATS } from './close-view-mesh.ts';
export const MODEL_FLOATS = 10;
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
const playerTool = [
  ...player.slice(0, -2),
  block(.161, -.25, .783, .163, .066, .052, iron, -2, 0, 1.19),
  block(.303, -.25, .783, .043, .052, .046, bronze, -2, 0, 1.19),
  part(frontPatch, .349, -.25, .783, 1, .033, .032, visor, -2, 0, 1.19),
];
const playerUnarmed = player.slice(0, -2);
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
// Both recipes begin at the existing right-hand grip (.17,-.25,.79).
const cinderPike = [
  block(.17,-.25,1.43,.026,.026,.66,bronze,-2,0,1.19),
  part(taper,.17,-.25,2.19,.068,.052,.16,visor,-2,0,1.19),
  part(frontPatch,.17,-.25,2.04,1,.085,.03,ember,-2,0,1.19),
];
const vergeCleaver = [
  block(.17,-.25,.91,.043,.052,.14,leather,-2,0,1.19),
  block(.17,-.25,1.06,.125,.025,.025,bronze,-2,0,1.19),
  part(taper,.17,-.25,1.48,.112,.009,.39,0x795c48,-2,0,1.19),
  // Narrow forged edge on both broad faces; keep the gladius outline, never an axe head.
  part(membrane([[.063,-.260,1.12],[.072,-.260,1.12],[.17,-.260,1.86]]),0,0,0,1,1,1,0xaaa69a,-2,0,1.19),
  part(membrane([[.063,-.240,1.12],[.17,-.240,1.86],[.072,-.240,1.12]]),0,0,0,1,1,1,0xaaa69a,-2,0,1.19),
];

// Future Close View tool silhouettes. These are recipe-only until the ordered tool-action pass
// selects them from accepted production events. All begin at the canonical (.17,-.25,.79) grip.
const riftBombard = [
  block(.17,-.25,.91,.055,.065,.14,leather,-2,0,1.19),
  part(bevel,.17,-.25,1.10,.15,.15,.20,iron,-2,0,1.19),
  part(bevel,.17,-.25,1.10,.09,.09,.215,brass,-2,0,1.19),
  block(.17,-.25,1.37,.09,.09,.13,iron,-2,0,1.19),
  part(flare,.17,-.25,1.53,.085,.085,.055,coal,-2,0,1.19),
  block(.08,-.25,.91,.13,.055,.055,iron,-2,0,1.19,.38),
];
const brokenGreatswordBlade = membrane([
  [0,-1,-1],[0,1,-1],[0,.88,.50],[0,.30,1],[0,-.72,.72],
]);
const greatSweep = [
  block(.17,-.25,.91,.045,.05,.14,leather,-2,0,1.19),
  block(.17,-.25,1.08,.20,.055,.045,iron,-2,0,1.19),
  part(brokenGreatswordBlade,.17,-.25,1.70,1,.30,.68,iron,-2,0,1.19),
  block(.17,-.25,1.62,.016,.03,.47,bronze,-2,0,1.19),
  part(frontPatch,.17,-.25,1.13,1,.07,.025,brass,-2,0,1.19),
];
const blunderbuss = [
  block(.17,-.25,.91,.055,.06,.14,leather,-2,0,1.19),
  block(.17,-.25,1.10,.075,.065,.15,bronze,-2,0,1.19),
  block(.17,-.25,1.33,.052,.052,.13,iron,-2,0,1.19),
  part(flare,.17,-.25,1.49,.058,.058,.045,iron,-2,0,1.19),
  part(ellipsoid(6,1),.17,-.25,1.27,.078,.078,.065,0x58cfe8,-2,0,1.19,0,true),
  block(.08,-.25,.90,.11,.045,.045,iron,-2,0,1.19,.32),
];
const lumenSpindle = [
  block(.17,-.25,.92,.035,.04,.13,leather,-2,0,1.19),
  part(taper,.17,-.25,1.20,.034,.034,.22,bronze,-2,0,1.19),
  part(ellipsoid(6,1),.17,-.25,1.45,.075,.075,.09,visor,-2,0,1.19,0,true),
  part(frontPatch,.17,-.25,1.55,1,.052,.025,0x8fe8ff,-2,0,1.19),
];
const TOOL_EMISSION_LOCAL=Object.freeze({'rift-bombard':Object.freeze([.17,-.25,1.585]),blunderbuss:Object.freeze([.17,-.25,1.535]),'lumen-spindle':Object.freeze([.17,-.25,1.575])});
// Uses the exact recipe grip, normalized socket axes and .82 conversion used below.
export function closeViewToolEmissionPoint(out,profile,m){const p=TOOL_EMISSION_LOCAL[profile];if(!out||out.length<3||!p||!m||m.length!==16)return null;const ax=Math.hypot(m[0],m[1],m[2]),ay=Math.hypot(m[4],m[5],m[6]),az=Math.hypot(m[8],m[9],m[10]);if(Math.min(ax,ay,az)<1e-6)return null;const x=(p[2]-.79)*.82,y=-(p[0]-.17)*.82,z=-(p[1]+.25)*.82;out[0]=m[12]+m[0]/ax*x+m[4]/ay*y+m[8]/az*z;out[1]=m[13]+m[1]/ax*x+m[5]/ay*y+m[9]/az*z;out[2]=m[14]+m[2]/ax*x+m[6]/ay*y+m[10]/az*z;return Number.isFinite(out[0]+out[1]+out[2])?out:null;}
// Compact tapered cuff and inward thumb/knuckle cover; the final sockets keep each shell on its own hand.
const fistGauntlet=[part(taper,0,0,.012,.105,.075,.115,0xd7dde2),part(bevel,0,-.058,.028,.058,.034,.045,0xf1f4f5)];
const playerCinderPike=[...playerUnarmed,...cinderPike],playerVergeCleaver=[...playerUnarmed,...vergeCleaver];

// Ashling: compact cinder body, a glowing crack and two broken crown spikes.
const ashling = [
  part(ellipsoid(6, 2), 0, 0, .64, .23, .258, .29, ash, 0, 0, .64, 0, true),
  part(ellipsoid(6, 1), .085, 0, .986, .211, .216, .208, coal, 0, .085, .986, 0, true),
  block(.252, 0, .974, .018, .147, .027, ember),
  block(.199, 0, .68, .03, .025, .116, ember),
  part(taper, .01, -.13, 1.227, .081, .071, .14, ash, 0, .01, 1.15, -.37),
  part(taper, .02, .13, 1.2, .081, .079, .098, ash, 0, .02, 1.15, -.31),
];
for (const side of [-1, 1]) {
  ashling.push(
    part(ellipsoid(6, 1), .056, side * .27, .524, .136, .127, .22, ash, side * 2, .03, .77, -.43, true),
    part(ellipsoid(5, 1), .10, side * .32, .365, .106, .109, .086, coal, side * 2, .03, .77, 0, true),
    part(curvedTube([[0,side*.133,.39,.075],[0,side*.133,.19,.06],[.071,side*.133,.055,.035]],4),0,0,0,1,1,1,coal,side,0,.43),
  );
}

// Root Brute: heavy bark shoulders and oversized, knotted forearms.
const rootBrute = [
  part(ellipsoid(8, 2), 0, 0, 1.035, .32, .403, .48, bark, 0, 0, 1.035, 0, true),
  part(ellipsoid(6, 1), .224, 0, 1.455, .221, .235, .199, darkBark, 0, .224, 1.455, 0, true),
  block(.409, 0, 1.468, .027, .143, .024, root),
  block(.261, 0, .977, .074, .05, .252, root),
];
for (const side of [-1, 1]) {
  rootBrute.push(
    part(taper, -.05, side * .363, 1.518, .15, .13, .274, bark, side * 2, -.05, 1.27, -.30),
    part(ellipsoid(6, 1), .042, side * .465, 1.136, .229, .22, .27, bark, side * 2, .04, 1.27, 0, true),
    part(ellipsoid(6, 1), .145, side * .48, .78, .217, .201, .273, darkBark, side * 2, .04, 1.27, 0, true),
    block(.307, side * .49, .767, .072, .13, .133, root, side * 2, .04, 1.27),
    part(curvedTube([[-.045,side*.209,.70,.11],[-.045,side*.209,.36,.10],[.046,side*.209,.10,.07]],5),0,0,0,1,1,1,darkBark,side,-.04,.71),
  );
}

// Pallid Crawler: long, floor-hugging back, splayed limbs and a jutting jaw.
const pallidCrawler = [
  part(ringLoft([[-.50,.08,-.13],[-.20,.25,0],[.18,.22,.01],[.42,.10,-.08]],7), 0, 0, .48, 1, 1, 1, bone, 0, -.17, .50, 0, true),
  part(ellipsoid(7, 2), .31, 0, .418, .23, .207, .187, bone, 0, .31, .418, 0, true),
  part(ringLoft([[0,.13,-.04],[.16,.11,0],[.30,.03,.02]],5), .35, 0, .32, 1, 1, 1, sinew, 0, .35, .32),
];
for (const side of [-1, 1]) {
  pallidCrawler.push(
    block(.483, side * .112, .462, .036, .039, .031, crawlerEye),
    part(curvedTube([[.18,side*.20,.38,.06],[.35,side*.36,.18,.045],[.51,side*.40,.055,.022]],4),0,0,0,1,1,1,bone,side*2,.14,.48),
    part(curvedTube([[-.30,side*.20,.38,.06],[-.50,side*.33,.19,.045],[-.43,side*.36,.05,.022]],4),0,0,0,1,1,1,sinew,-side,-.34,.45),
  );
}

// Hollow Marshal: crimson armor, split brass crest, and a long polearm.
const hollowMarshal = [
  part(verticalLoft([[0,.22,-.42],[-.01,.35,-.12],[0,.31,.25],[-.02,.18,.43]],6), 0, 0, 1.18, 1, 1, 1, plate, 0, 0, 1.18, 0, true),
  part(verticalLoft([[0,.31,-.40],[-.02,.28,.05],[-.05,.12,.46]],6), -.215, 0, .97, 1, 1, 1, iron, 3, -.21, 1.412, .08, true),
  part(ellipsoid(6, 1), .04, 0, 1.737, .234, .243, .247, iron, 0, .04, 1.737, 0, true),
  part(detailPrism,.226,0,1.737,.047,.147,.057,brass),
  part(detailPrism,.275,0,1.745,.006,.105,.017,iron),
  block(.208, 0, 1.254, .053, .143, .096, brass),
  block(.021, 0, .865, .22, .275, .069, iron),
];
for (const side of [-1, 1]) {
  hollowMarshal.push(
    part(taper, .002, side * .132, 2.025, .096, .063, .16, brass, 0, 0, 1.951, -.19),
    part(curvedTube([[0,side*.34,1.43,.10],[.03,side*.41,1.14,.075],[.04,side*.41,.94,.055]],4),0,0,0,1,1,1,iron,side*2,0,1.46),
    part(curvedTube([[.03,side*.153,.80,.09],[.03,side*.153,.42,.075],[.08,side*.153,.10,.055]],4),0,0,0,1,1,1,plate,side,0,.831),
  );
}
hollowMarshal.push(
  block(.178, -.432, .903, .034, .037, .661, iron, -2, 0, 1.46, .12),
  part(taper, .241, -.432, 1.578, .074, .142, .221, brass, -2, 0, 1.46, .12),
);

// Ashen Hound: low charcoal body, pointed ears and a rust-colored muzzle.
const houndFur = 0x765244, houndDark = 0x302724, houndEye = 0xc18a63;
const ashenHound = [
  part(ellipsoid(8, 2), -.072, 0, .449, .395, .204, .173, houndDark, 0, -.072, .449, .09, true),
  part(ellipsoid(6, 2), .215, 0, .495, .177, .21, .223, houndFur, 0, .215, .495, -.34, true),
  part(ellipsoid(6, 1), .388, 0, .581, .177, .146, .133, houndFur, 0, .388, .581, 0, true),
  part(ringLoft([[0,.10,-.05],[.15,.08,0],[.25,.025,.02]],5),.43,0,.53,1,1,1,houndFur),
  block(.637, 0, .553, .033, .084, .035, houndDark),
  part(taper, -.484, 0, .574, .076, .074, .216, houndFur, 6, -.354, .477, -.95),
];
for (const side of [-1, 1]) {
  ashenHound.push(
    part(taper, .33, side * .097, .719, .068, .061, .122, houndFur, 0, .33, .657, -.38),
    block(.478, side * .113, .609, .028, .014, .021, houndEye),
    part(curvedTube([[.235,side*.131,.43,.045],[.235,side*.131,.20,.038],[.29,side*.131,.035,.022]],4),0,0,0,1,1,1,houndDark,side*2,.237,.45),
    part(curvedTube([[-.293,side*.132,.41,.045],[-.293,side*.132,.19,.038],[-.25,side*.132,.035,.022]],4),0,0,0,1,1,1,houndDark,-side,-.299,.432),
  );
}

// Coil Stalker: a raised teal head, mint transverse ribs and two trailing segments.
const coilShell = 0x47716d, coilDark = 0x263a39, coilLight = 0x87c0ad;
const coilStalker = [
  part(ellipsoid(8, 2), .022, 0, .348, .301, .274, .328, coilDark, 0, .022, .348, .19, true),
  part(ringLoft([[0,.27,-.035],[.02,.31,0],[.04,.26,.035]],6), .142, 0, .519, 1, 1, 1, coilLight, 0, .142, .519, -.15, true),
  part(ellipsoid(6, 2), .141, 0, .721, .215, .212, .183, coilShell, 0, .141, .721, 0, true),
  block(.32, 0, .734, .012, .056, .036, coilLight),
  part(ellipsoid(6, 2), -.294, 0, .262, .232, .217, .192, coilShell, 4, -.294, .262, 0, true),
  part(ringLoft([[0,.20,-.04],[.01,.23,0],[.02,.20,.04]],6),-.375,0,.263,1,1,1,coilLight,4,-.375,.263,0,true),
  part(ellipsoid(6, 1), -.599, 0, .168, .225, .16, .144, coilDark, 5, -.599, .168, 0, true),
  part(ringLoft([[0,.14,-.03],[.01,.17,0],[.02,.14,.03]],6),-.686,0,.169,1,1,1,coilLight,5,-.686,.169,0,true),
];

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

// Exact renderer kind keys (with "wayfarer" as a caller alias for "player").
const models = { ...companions, nativeOrb, corridorDrone, playerShadow:playerUnarmed, player, wayfarer: player, playerTool, playerUnarmed, playerHammer, playerHammerStomp, playerSweep, playerMirage, playerOrrery, playerCinderPike, playerVergeCleaver,
  ...CLOSE_VIEW_PLAYER_FORM_MODELS, ...playerFormModels, ashling, rootBrute, pallidCrawler, hollowMarshal, ashenHound, coilStalker, ...CLOSE_VIEW_ARCOLOGY_MODELS, ...CLOSE_VIEW_PENTAGON_MODELS, ...CLOSE_VIEW_FOUNDRY_MODELS, ...CLOSE_VIEW_FOUNDRY_VARIANTS };
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
const HERO_GEAR = Object.freeze({melee:player.slice(-2),'salvage-blade':player.slice(-2),'cinder-pike':cinderPike,'verge-cleaver':vergeCleaver,fist:fistGauntlet,'fistCharge':fistGauntlet,emitter:playerTool.slice(-3),hammer:playerHammer.slice(-2),mirage:playerMirage.slice(-2),'orrery-tap':playerOrrery.slice(-3),'orrery-release':playerOrrery.slice(-3),'rift-bombard':riftBombard,'great-sweep':greatSweep,blunderbuss,'lumen-spindle':lumenSpindle});
export function writeCloseViewHeroGear(out,offset,gear) {
  const parts=Object.hasOwn(HERO_GEAR,gear?.profile)?HERO_GEAR[gear.profile]:null,m=gear?.rightSocket;
  if(!parts||!m||m.length!==16||!Number.isSafeInteger(offset)||offset<0)return offset;
  const bilateral=gear.profile==='fist'||gear.profile==='fistCharge',left=gear.leftSocket;
  if(bilateral&&(!left||left.length!==16))return offset;
  let vertices=0;for(const p of parts)vertices+=p.mesh.length/MESH_FLOATS;vertices*=bilateral?2:1;
  if(vertices>256*3||offset+vertices*MODEL_FLOATS>out.length)return offset;
  for(let pass=0;pass<(bilateral?2:1);pass++){const socket=bilateral&&pass===0?left:m;for(let i=0;i<16;i++)if(!Number.isFinite(socket[i]))return offset;const ax=Math.hypot(socket[0],socket[1],socket[2]),ay=Math.hypot(socket[4],socket[5],socket[6]),az=Math.hypot(socket[8],socket[9],socket[10]);if(Math.min(ax,ay,az)<1e-6)return offset;}
  const alpha=Number.isFinite(gear.alpha)?Math.max(0,Math.min(1,gear.alpha)):1,hit=Math.max(0,Math.min(1,Number(gear.hitFlash)||0));
  const tr=Number.isFinite(gear.tint?.[0])?gear.tint[0]:1,tg=Number.isFinite(gear.tint?.[1])?gear.tint[1]:1,tb=Number.isFinite(gear.tint?.[2])?gear.tint[2]:1;
  for(let pass=0;pass<(bilateral?2:1);pass++){const m=bilateral&&pass===0?left:gear.rightSocket,ax=Math.hypot(m[0],m[1],m[2]),ay=Math.hypot(m[4],m[5],m[6]),az=Math.hypot(m[8],m[9],m[10]);
  for(const p of parts)for(let i=0;i<p.mesh.length;i+=MESH_FLOATS){const a=p.mesh;
    // Recipe grip (.17,-.25,.79), canonical blade +Z -> the source weapon socket +X.
    const x=bilateral?(a[i]+p.px)*.62:(a[i+2]+p.pz-.79)*.82,y=bilateral?(a[i+1]+(p.py||0))*.62:-(a[i]+p.px-.17)*.82,z=bilateral?(a[i+2]+p.pz)*.62:-(a[i+1]+.25)*.82;
    out[offset++]=m[12]+m[0]/ax*x+m[4]/ay*y+m[8]/az*z;
    out[offset++]=m[13]+m[1]/ax*x+m[5]/ay*y+m[9]/az*z;
    out[offset++]=m[14]+m[2]/ax*x+m[6]/ay*y+m[10]/az*z;
    const nx=bilateral?a[i+3]:a[i+5],ny=bilateral?a[i+4]:-a[i+3],nz=bilateral?a[i+5]:-a[i+4];let qx=m[0]/ax*nx+m[4]/ay*ny+m[8]/az*nz,qy=m[1]/ax*nx+m[5]/ay*ny+m[9]/az*nz,qz=m[2]/ax*nx+m[6]/ay*ny+m[10]/az*nz;const len=Math.hypot(qx,qy,qz)||1;
    out[offset++]=qx/len;out[offset++]=qy/len;out[offset++]=qz/len;
    out[offset++]=a[i+6]*tr*(1-hit*.6)+.96*hit*.6;out[offset++]=a[i+7]*tg*(1-hit*.6)+.34*hit*.6;out[offset++]=a[i+8]*tb*(1-hit*.6)+.23*hit*.6;out[offset++]=alpha;
  }}
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

export function writeCloseViewModel(out, offset, actor) {
  const { kind, x, y, z, yaw, phase, pace, pose, amount } = actor;
  const playerLike = kind === "player" || kind === "wayfarer" || kind.startsWith("player");
  const actorScale = Number.isFinite(actor.scale) ? Math.max(.25, Math.min(4, actor.scale)) : 1;
  const size = (kind === "nativeOrb" ? Math.max(.02,Math.min(1,Number(actor.radius)||.13)) : (playerLike ? .82 : 1) * actorScale);
  const attachments = Array.isArray(actor.attachments) ? actor.attachments.slice(0, MODEL_MAX_ATTACHMENTS).filter((q) => q && Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.z)) : [];
  const needed = (modelVertices[kind] + attachments.length * MODEL_ATTACHMENT_TRIANGLES * 3) * MODEL_FLOATS;
  if (!modelSupported(kind) || !modelSupportsAttachments(kind, attachments.length) || !Number.isSafeInteger(offset) || offset < 0 || offset + needed > out.length) return offset;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(yaw) ||
      !Number.isFinite(phase) || !Number.isFinite(pace) || !Number.isFinite(amount)) return offset;
  const moving = Math.max(0, Math.min(1, pace));
  const progress = Math.max(0, Math.min(1, amount));
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
  if(kind==='playerHammerStomp')strike=0;
  const tool = pose === "tool" ? Math.sin(Math.PI * progress) : 0;
  const cast = pose === "cast" ? Math.sin(Math.PI * progress) : 0;
  const jump = pose === "jump" ? Math.sin(Math.PI * progress) : 0;
  const jumpSettle = pose === "jump" && progress > .72 ? Math.sin((progress - .72) / .28 * Math.PI) : 0;
  const flinch = pose === "hit" ? progress : 0;
  const fall = pose === "death" ? progress : 0;
  const knocked = pose === "knockdown" ? progress : 0;
  const turnLean = turnAmount * .13 * secondary;
  const fist = pose === "fist", chargingFist = pose === "fistCharge", fistStep = [1,2,3].includes(actor.fistStep) ? actor.fistStep : 1;
  const primaryStep=[1,2,3].includes(actor.primaryStep)?actor.primaryStep:1,canonicalPrimary=kind==='playerCinderPike'||kind==='playerVergeCleaver';
  const turn = (canonicalPrimary ? primaryStep===2?-.22:primaryStep===3?.06:.22 : fist ? fistStep === 2 ? -.10 : .10 : .21) * strike + .08 * cast + turnLean;
  const cy = Math.cos(yaw + turn), sy = Math.sin(yaw + turn);
  const pitch = -.10 * (chargingFist ? progress : 0) - .18 * windup + .29 * strike - .11 * tool - .12 * cast - .12 * jump + .16 * stagger
    + .09 * jumpSettle - .24 * flinch + 1.52 * fall - 1.52 * knocked;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const base = secondary * (.012 * Math.sin(phase * 2) * (1 - moving) + .052 * Math.abs(beat) - .014 * heel)
    * (1 - fall) * (1 - knocked) - .075 * jumpSettle - .10 * stagger + (kind === "pallidCrawler" ? .61 : .36) * fall + .35 * knocked;
  const shift = (kind === 'playerCinderPike' ? primaryStep===3?.28:primaryStep===2?.19:.22 : .14) * strike - .06 * tool + .05 * cast - .055 * jump - .08 * flinch;
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
  for (const { mesh, swing, px, pz, axialSpin, carryingOnly, hammerPart } of models[kind]) {
    const coilSway = swing === 4 || swing === 5
      ? Math.sin(phase - (swing - 4) * .92) * (.028 + .065 * moving) * (1 - fall)
      : swing >= 40 && swing < 60
        ? Math.sin(phase * 1.3 - swing * .57) * (.018 + .045 * moving) * secondary * (1 - fall)
      : 0;
    let angle = semanticAngle(kind, swing, actor.action, actionFamily, actionPhase, actionProgress, actionWeight, beat, moving, phase, secondary);
    if ((playerLike || kind === "corridorGolem") && Math.abs(swing) === 2 && (fist || chargingFist)) {
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
    else if (swing === -2) angle = beat * stride + 1.15 * windup - 1.96 * strike - 1.1 * tool
      - (playerLike ? .28 : .08) * cast + .22 * flinch + .58 * jump - .22 * jumpSettle;
    else if (swing === 2) angle = -beat * stride + .35 * windup - .43 * strike
      + (playerLike ? 1.02 : .18) * cast - .18 * flinch + .58 * jump - .22 * jumpSettle;
    else angle = -swing * beat * stride - Math.sign(swing) * .64 * jump + Math.sign(swing) * .28 * jumpSettle;
    if(kind==='playerVergeCleaver'&&swing===-2){
      // Low one-handed carry plus the same accepted-only rising/outward/descending stage vocabulary.
      angle=1.15+beat*.08+(primaryStep===1?-1.65:primaryStep===2?-1.25:-.90)*strike-.28*cast+.58*jump+.22*flinch;
    } else if(kind==='playerCinderPike'&&swing===-2) angle+=(primaryStep===2?-.22:primaryStep===3?.22:0)*strike;
    // A frozen secondary sway may evaluate to -0; canonical zero keeps paused/watched vertices byte-stable.
    if (angle === 0) angle = 0;
    const spin = axialSpin && secondary && Number.isFinite(actor.effectTime) ? actor.effectTime / 2000 : 0, spinC = Math.cos(spin), spinS = Math.sin(spin);
    const c = Math.cos(angle), s = Math.sin(angle);
    const cutYaw = playerLike && !fist && !chargingFist && swing === -2
      ? kind === 'playerCinderPike' ? 0 : (kind === 'playerVergeCleaver' ? primaryStep===2?-1.18:primaryStep===3?.45:1.18 : .95) * Math.sin(progress * Math.PI * 2) * strike : 0;
    const cc = Math.cos(cutYaw), sc = Math.sin(cutYaw);
    const pivotY = playerLike && swing === -2 ? PLAYER_FORM_HANDS[kind.split(':')[0]]?.y ?? -.25 : 0;
    for (let i = 0; i < mesh.length; i += MESH_FLOATS) {
      const localY = axialSpin ? mesh[i + 1] * spinC - mesh[i + 2] * spinS : mesh[i + 1], localZ = axialSpin ? mesh[i + 1] * spinS + mesh[i + 2] * spinC : mesh[i + 2];
      const normalY = axialSpin ? mesh[i + 4] * spinC - mesh[i + 5] * spinS : mesh[i + 4], normalZ = axialSpin ? mesh[i + 4] * spinS + mesh[i + 5] * spinC : mesh[i + 5];
      let forward = mesh[i] * c + localZ * s + px;
      let lateral = localY + coilSway;
      const u = forward * cc - (lateral - pivotY) * sc;
      const v = forward * sc + (lateral - pivotY) * cc + pivotY;
      let w = localZ * c - mesh[i] * s + pz;
      let f=u*cp+w*sp+shift,worldY=v,worldZ=base+w*cp-u*sp;
      const armNormal=mesh[i+3]*c+normalZ*s;
      let nu=armNormal*cc-normalY*sc,nv=armNormal*sc+normalY*cc,nw=normalZ*c-mesh[i+3]*s;
      let nf=nu*cp+nw*sp;nw=nw*cp-nu*sp;
      if(hammerPart!==undefined){
        const o=hammerPart*12,m=HAMMER_FRAMES,mx=mesh[i],my=mesh[i+1],mz=mesh[i+2],nx=mesh[i+3],ny=mesh[i+4],nz=mesh[i+5],zl=Math.hypot(m[o+6],m[o+7],m[o+8])||1;
        f=m[o]*mx+m[o+3]*my+m[o+6]*mz+m[o+9];worldY=m[o+1]*mx+m[o+4]*my+m[o+7]*mz+m[o+10];worldZ=m[o+2]*mx+m[o+5]*my+m[o+8]*mz+m[o+11];
        nf=m[o]*nx+m[o+3]*ny+m[o+6]/zl*nz;nv=m[o+1]*nx+m[o+4]*ny+m[o+7]/zl*nz;nw=m[o+2]*nx+m[o+5]*ny+m[o+8]/zl*nz;
      }else if(kind==='playerHammerStomp')worldZ-=.04*hammerSmooth((progress*570-240)/80)*hammerWeight+base*hammerWeight;
      out[offset++]=x+(f*cy-worldY*sy)*size;out[offset++]=y+(f*sy+worldY*cy)*size;out[offset++]=z+worldZ*size;
      out[offset++]=nf*cy-nv*sy;out[offset++]=nf*sy+nv*cy;out[offset++]=nw;
      const poison = actor.poison ? .55 : 0;
      let sourceRed=mesh[i+6],sourceGreen=mesh[i+7],sourceBlue=mesh[i+8];
      if(foundry){const rgb=(Math.round(sourceRed*255)<<16)|(Math.round(sourceGreen*255)<<8)|Math.round(sourceBlue*255),mapped=foundryPaletteColor(rgb,actor.palette);sourceRed=(mapped>>16)/255;sourceGreen=((mapped>>8)&255)/255;sourceBlue=(mapped&255)/255;}
      if(actor.paletteMap){const rgb=(Math.round(sourceRed*255)<<16)|(Math.round(sourceGreen*255)<<8)|Math.round(sourceBlue*255),mapped=actor.paletteMap[rgb];if(Number.isInteger(mapped)){sourceRed=(mapped>>16)/255;sourceGreen=((mapped>>8)&255)/255;sourceBlue=(mapped&255)/255;}}
      if(actor.shadow){const eye=Math.abs(sourceRed-0xc7/255)<.001&&Math.abs(sourceGreen-0xe6/255)<.001;sourceRed=(eye?0xb4:0x1b)/255;sourceGreen=(eye?0x8c:0x10)/255;sourceBlue=(eye?0xff:0x30)/255;}
      const red = sourceRed + (.32 - sourceRed) * poison;
      const green = sourceGreen + (.82 - sourceGreen) * poison;
      const blue = sourceBlue + (.24 - sourceBlue) * poison;
      out[offset++] = red + (.96 - red) * flinch * .6;
      out[offset++] = green + (.34 - green) * flinch * .6;
      out[offset++] = blue + (.23 - blue) * flinch * .6;
      const bodyAlpha = kind === 'gloomgorge' ? alpha * Math.max(.32, Math.min(1, .45 + .75 * Math.max(0, w))) : alpha;
      out[offset++] = carryingOnly && !actor.carrying ? 0 : bodyAlpha;
    }
  }
  for (const attachment of attachments) offset = writeAttachment(out, offset, attachment, alpha, actorScale);
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
