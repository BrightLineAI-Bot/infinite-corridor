// Authored Close View geometry for player states whose ordinary renderer changes the whole silhouette.
// This module is deliberately data-only: callers decide when the real equipment/runtime state selects a key.
import { bevel, block, curvedTube, ellipsoid, membrane, part, ringLoft, verticalLoft, taper } from './close-view-mesh.js?v=r868-c66bcccd6ded';

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

// Readiness fallback only. The normal path skins the approved imported adult and the bounded overlay
// below. This body matches that 1.68 source-height envelope without the old pelvis gap or diamond head.
const powerSuit = [
  part(verticalLoft([[0,.145,-.36],[.005,.20,-.12],[-.012,.175,.18],[-.035,.115,.34]],6),0,0,1.08,1,1,1,suitGreen,0,0,1.08,0,true),
  part(ellipsoid(6,2),.11,0,1.49,.17,.18,.19,ironEdge,0,.11,1.49,0,true),
  block(.278,0,1.49,.016,.125,.052,glass),
  block(-.13,0,1.12,.07,.135,.22,iron),
  ...legs(suitLeather,1),
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
  part(curvedTube([[-.015,side*.21,1.30,.07],[.035,side*.275,1.05,.055],[.12,side*.28,.80,.042]],3),0,0,0,1,1,1,suitGreen,side*2,0,1.30),
  part(bevel,.14,side*.28,.82,.082,.068,.13,bronze,side*2,0,1.30,0,true),
);

// Bind-space outer-surface armor for the imported adult rig. Each triangle has one deliberate bone
// binding so flexion creases remain clear. Coordinates are measured from the shipped fitted source;
// their .014-.03 source-unit stand-off becomes roughly .008-.018 tile at the approved height.
const armor = [];
const armorQuad = (node,color,a,b,c,d) => armor.push({node,color,vertices:[a,b,c,a,c,d]});
const G=0x35423b,L=0x493d34,B=0x9b7950,A=0xd39a58;
// Torso: four front facets, three back facets.
armorQuad(24,G,[-.18,1.58,.235],[0,1.56,.255],[0,1.78,.255],[-.17,1.82,.235]);
armorQuad(24,G,[0,1.56,.255],[.18,1.58,.235],[.17,1.82,.235],[0,1.78,.255]);
armorQuad(24,G,[-.17,1.82,.235],[0,1.78,.255],[0,2.00,.225],[-.12,1.98,.215]);
armorQuad(24,G,[0,1.78,.255],[.17,1.82,.235],[.12,1.98,.215],[0,2.00,.225]);
armorQuad(24,L,[-.17,1.60,-.19],[.17,1.60,-.19],[.15,1.78,-.205],[-.15,1.78,-.205]);
armorQuad(24,L,[-.15,1.78,-.205],[0,1.76,-.22],[0,1.99,-.19],[-.12,1.97,-.18]);
armorQuad(24,L,[0,1.76,-.22],[.15,1.78,-.205],[.12,1.97,-.18],[0,1.99,-.19]);
// Collar, clear of the neck flexion ring.
armorQuad(4,B,[-.13,1.94,.15],[0,1.91,.20],[0,2.01,.19],[-.10,2.03,.14]);
armorQuad(4,B,[0,1.91,.20],[.13,1.94,.15],[.10,2.03,.14],[0,2.01,.19]);
armorQuad(4,L,[-.10,2.03,-.08],[.10,2.03,-.08],[.09,2.07,.05],[-.09,2.07,.05]);
for(const [side,node] of [[1,12],[-1,22]]){
  const x=.34*side,outer=.47*side;
  armorQuad(node,G,[x,1.84,.16],[outer,1.80,.10],[outer,1.67,.08],[x,1.70,.17]);
  armorQuad(node,G,[outer,1.80,.10],[.45*side,1.82,-.10],[.44*side,1.68,-.11],[outer,1.67,.08]);
  armorQuad(node,B,[.45*side,1.82,-.10],[x,1.83,-.13],[x,1.69,-.14],[.44*side,1.68,-.11]);
}
for(const [side,thigh,shin] of [[1,30,29],[-1,32,31]]){
  armorQuad(thigh,G,[.07*side,1.21,.205],[.28*side,1.19,.205],[.25*side,.88,.215],[.08*side,.90,.215]);
  armorQuad(thigh,L,[.28*side,1.19,.205],[.30*side,1.16,-.02],[.27*side,.88,-.02],[.25*side,.88,.215]);
  armorQuad(shin,G,[.09*side,.62,.205],[.29*side,.61,.205],[.26*side,.30,.205],[.10*side,.31,.205]);
  armorQuad(shin,B,[.29*side,.61,.205],[.31*side,.58,-.01],[.28*side,.31,-.01],[.26*side,.30,.205]);
}
// Compact two-arm amber chest sigil: six quads / twelve triangles, no independent oscillator.
for(const side of [-1,1])for(let i=0;i<3;i++){
  const y0=1.73+i*.065,y1=y0+.052,x0=side*(.018+i*.025),x1=side*(.035+(i+1)*.025);
  armorQuad(24,A,[x0,y0,.270],[x1,y0+.018,.272],[x1,y1+.018,.272],[x0,y1,.270]);
}
export const CLOSE_VIEW_POWER_SUIT_ARMOR = Object.freeze(armor);
export const CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES = armor.reduce((n,p)=>n+p.vertices.length/3,0);

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

export { CLOSE_VIEW_PLAYER_FORM_PROFILES } from './close-view-player-presentation.js?v=r868-c66bcccd6ded';
