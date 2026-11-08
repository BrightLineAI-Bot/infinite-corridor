// Authored Close View geometry for player states whose ordinary renderer changes the whole silhouette.
// This module is deliberately data-only: callers decide when the real equipment/runtime state selects a key.
import { bevel, block, curvedTube, ellipsoid, membrane, part, ringLoft, verticalLoft, taper } from './close-view-mesh.ts';

const coat = 0x303934, hem = 0x28312e, leather = 0x302b29, amber = 0xf3a55c;
const iron = 0x34383d, ironEdge = 0x171a1d, worn = 0x747a80, glass = 0x31505b;
const hullGreen = 0x4b554d, hullRust = 0x765545, suitGreen = 0x48534b, suitLeather = 0x493d34, bronze = 0x9b7950;
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

// The unempowered robot is a crude walk-in cockpit, not a swollen humanoid. Its dominant forward
// viewport sits inside a battered hull collar; short plated struts keep the weight low and clumsy.
const robot = [
  part(ellipsoid(8, 2),-.04,0,1.02,.51,.45,.44,hullGreen,0,-.04,1.02,0,true),
  part(ellipsoid(8, 2),.31,0,1.19,.33,.36,.31,ironEdge,0,.31,1.19,0,true),
  part(ellipsoid(7, 2),.43,0,1.20,.20,.29,.21,0x79acb3,0,.43,1.20,0,true),
  part(ringLoft([[-.30,.29,-.20],[-.40,.27,.01],[-.31,.20,.22]],4),-.04,0,1.02,1,1,1,hullRust,0,-.04,1.02,0,true),
];
for (const side of [-1, 1]) robot.push(
  part(curvedTube([[-.06,side*.35,1.13,.11],[-.01,side*.54,.94,.095],[.22,side*.62,.73,.065]],3),0,0,0,1,1,1,ironEdge,side*2,-.04,1.17),
  part(bevel,.29,side*.63,.70,.13,.12,.11,worn,side*2,-.04,1.17,0,true),
  part(curvedTube([[-.05,side*.21,.66,.11],[-.01,side*.22,.36,.09],[.08,side*.23,.11,.065]],3),0,0,0,1,1,1,iron,side,-.03,.68),
  block(.15,side*.23,.08,.17,.11,.07,hullRust,side,-.03,.68),
);

// Empowered: fitted human anatomy under tapered graphite/green-grey plates. The reference contributes
// only its layered hard-suit language: restrained shoulder/head framing, normal hands and no cables.
const powerSuit = [
  part(verticalLoft([[0,.12,-.27],[.005,.185,-.07],[-.012,.155,.19],[-.035,.105,.29]],6),0,0,1.0,1,1,1,suitGreen,0,0,1,0,true),
  part(ellipsoid(6,1),.12,0,1.20,.17,.18,.205,ironEdge,0,.12,1.20,0,true),
  block(.284,0,1.20,.016,.125,.052,glass),
  block(-.13,0,1.01,.07,.135,.20,iron),
  ...legs(suitLeather,.92),
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
  part(curvedTube([[-.015,side*.20,1.17,.07],[.035,side*.265,.96,.055],[.12,side*.27,.77,.042]],4),0,0,0,1,1,1,suitGreen,side*2,0,1.18),
  part(bevel,.14,side*.27,.82,.082,.068,.13,bronze,side*2,0,1.18,0,true),
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

export { CLOSE_VIEW_PLAYER_FORM_PROFILES } from './close-view-player-presentation.ts';
