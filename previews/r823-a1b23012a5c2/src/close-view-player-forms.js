// Authored Close View geometry for player states whose ordinary renderer changes the whole silhouette.
// This module is deliberately data-only: callers decide when the real equipment/runtime state selects a key.
import { bevel, block, curvedTube, ellipsoid, membrane, part, ringLoft, verticalLoft, taper } from './close-view-mesh.js?v=r823-a1b23012a5c2';

const coat = 0x303934, hem = 0x28312e, leather = 0x302b29, amber = 0xf3a55c;
const iron = 0x34383d, ironEdge = 0x171a1d, worn = 0x747a80, glass = 0x31505b;
const ember = 0xf07839, emberHot = 0xffc06a, emberDark = 0x542d25;

const hood = (color = coat, scale = 1) => [
  part(ellipsoid(6, 2), .02, 0, 1.46 * scale, .19 * scale, .20 * scale, .22 * scale, color, 0, .02, 1.46 * scale, 0, true),
  part(ellipsoid(6, 1), .145 * scale, 0, 1.45 * scale, .10 * scale, .13 * scale, .12 * scale, ironEdge, 0, .145 * scale, 1.45 * scale, 0, true),
  block(.235 * scale, -.055 * scale, 1.47 * scale, .012, .025 * scale, .025 * scale, amber),
  block(.235 * scale, .055 * scale, 1.47 * scale, .012, .025 * scale, .025 * scale, amber),
];
const legs = (color = coat, scale = 1) => [-1, 1].flatMap(side => [
  part(curvedTube([[0,side*.115*scale,.66*scale,.09*scale],[0,side*.12*scale,.33*scale,.075*scale],[.045*scale,side*.12*scale,.08*scale,.055*scale]],4),0,0,0,1,1,1,color,side,0,.68*scale),
  block(.11 * scale, side * .12 * scale, .065 * scale, .13 * scale, .08 * scale, .065 * scale, leather, side, 0, .68 * scale),
]);

// The weapon is a pair, not a recoloured blade: broad iron gauntlets, knuckle plates and amber seams.
const ironFists = [
  part(verticalLoft([[0,.16,-.25],[0,.22,-.04],[-.02,.18,.22],[-.04,.12,.3]],5),0,0,1.02,1,1,1,coat,0,0,1.02,0,true),
  part(membrane([[0,-.19,.12],[-.08,-.19,-.36],[-.02,.02,-.43],[.04,.06,-.1]]),-.03,0,.85,1,1,1,hem,3,-.03,.98),
  ...hood(), ...legs(),
];
for (const side of [-1, 1]) ironFists.push(
  part(curvedTube([[0,side*.24,1.2,.075],[.06,side*.31,.98,.07],[.15,side*.34,.79,.065]],4),0,0,0,1,1,1,coat,side*2,0,1.2),
  part(bevel,.22,side*.35,.76,.17,.14,.18,iron,side*2,0,1.2,-.08,true),
);

// The unempowered robot follows the original submersible-robot brief: large viewport, short legs,
// extending arms and a compact booster pack. It is intentionally larger than the Wayfarer.
const robot = [
  part(ellipsoid(8, 2),0,0,1.03,.48,.42,.47,iron,0,0,1.03,0,true),
  part(ellipsoid(8, 2),.30,0,1.18,.31,.32,.30,glass,0,.30,1.18,0,true),
  part(ellipsoid(7, 1),.40,0,1.20,.19,.23,.18,0x8bc6d2,0,.40,1.20,0,true),
  part(ringLoft([[-.26,.28,-.18],[-.36,.25,.02],[-.30,.18,.2]],6),0,0,1.03,1,1,1,ironEdge,0,0,1.03,0,true),
];
for (const side of [-1, 1]) robot.push(
  part(curvedTube([[-.04,side*.31,1.14,.10],[.06,side*.52,.91,.085],[.25,side*.60,.75,.065]],4),0,0,0,1,1,1,iron,side*2,-.03,1.18),
  part(bevel,.31,side*.61,.72,.12,.11,.12,worn,side*2,-.03,1.18,0,true),
  part(curvedTube([[0,side*.18,.65,.10],[.01,side*.19,.34,.09],[.09,side*.2,.10,.07]],4),0,0,0,1,1,1,iron,side,0,.67),
  block(.17,side*.2,.07,.16,.10,.07,ironEdge,side,0,.67),
);

// Empowered: the established understated graphite pressure suit, with low segmented plates,
// smoked visor, compact life-support pack and the tiny amber chest sigil.
const powerSuit = [
  part(verticalLoft([[0,.13,-.26],[0,.18,-.06],[-.015,.16,.19],[-.035,.11,.28]],6),0,0,1.0,1,1,1,ironEdge,0,0,1,0,true),
  part(bevel,.13,0,1.18,.18,.19,.21,iron,0,.13,1.18,0,true),
  block(.305,0,1.19,.018,.14,.055,glass),
  block(-.14,0,1.00,.08,.15,.23,iron),
  ...legs(ironEdge,.92),
];
// The source suit's two-armed amber spiral is body geometry, so it stays on the chest and occludes correctly.
const sigil = [];
for(const arm of [0,Math.PI])for(let i=0;i<4;i++){
  const point=(q,edge)=>{const a=arm+q*4.2,r=.008+q*.045+edge*.005;return [0,Math.cos(a)*r,Math.sin(a)*r];};
  const a=point(i/4,-1),b=point((i+1)/4,-1),c=point((i+1)/4,1),d=point(i/4,1);sigil.push([a,b,c],[a,c,d]);
}
for(let i=0;i<4;i++){const a=i*Math.PI/2,b=(i+1)*Math.PI/2;sigil.push([[0,0,0],[0,Math.cos(a)*.012,Math.sin(a)*.012],[0,Math.cos(b)*.012,Math.sin(b)*.012]]);}
powerSuit.push({...part(sigil,.314,0,1.05,1,1,1,0xb9925f),axialSpin:true});
for (const side of [-1,1]) powerSuit.push(
  part(curvedTube([[0,side*.19,1.17,.065],[.04,side*.26,.94,.055],[.12,side*.27,.77,.045]],4),0,0,0,1,1,1,ironEdge,side*2,0,1.18),
  part(bevel,.14,side*.27,.82,.09,.075,.14,iron,side*2,0,1.18,0,true),
);

// Ember Form grows into a guarded striking form. Curved cinder plates and flame crests change its
// outline; the hot seams remain readable when reduced motion suppresses secondary sway.
const emberForm = [
  part(verticalLoft([[0,.19,-.31],[-.01,.29,-.08],[-.03,.25,.24],[-.06,.15,.37]],6),0,0,1.13,1,1,1,emberDark,0,0,1.13,0,true),
  part(ellipsoid(6,2),.04,0,1.66,.22,.23,.25,emberDark,0,.04,1.66,0,true),
  part(ringLoft([[0,.13,-.04],[.12,.10,.03],[.25,.02,.08]],4),.23,0,1.64,1,1,1,ember),
  block(.27,-.07,1.67,.018,.035,.035,emberHot), block(.27,.07,1.67,.018,.035,.035,emberHot),
  ...legs(emberDark,1.14).filter((_,i)=>i%2===0),
];
for (const side of [-1,1]) emberForm.push(
  part(curvedTube([[0,side*.30,1.47,.12],[.05,side*.42,1.15,.10],[.19,side*.45,.88,.08]],4),0,0,0,1,1,1,emberDark,side*2,0,1.48),
  part(bevel,.24,side*.46,.84,.16,.13,.18,ember,side*2,0,1.48,-.08,true),
);

export const CLOSE_VIEW_PLAYER_FORM_MODELS = Object.freeze({
  playerIronFists: ironFists,
  playerRobot: robot,
  playerPowerSuit: powerSuit,
  playerEmberForm: emberForm,
});

export { CLOSE_VIEW_PLAYER_FORM_PROFILES } from './close-view-player-presentation.js?v=r823-a1b23012a5c2';
