// Authored Close View bodies for the Pentagon, its dungeon grotesques and its blue haunts.
// Geometry follows the original monster-render silhouettes; presentation metadata controls admission.
import { bevel, taper, ellipsoid, ringLoft, verticalLoft, curvedTube, membrane, part, block } from './close-view-mesh.js?v=r954-e53e5fa87e58';

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

// Weeping Saint: bowed pale statue, covered face, red tears and long reaching arms.
const weepingSaint = [
  part(verticalLoft([[0,.22,0],[-.04,.29,.42],[.02,.22,.84],[.12,.16,1.18]],6),0,0,.18,1,1,1,0xb9b1a4),
  part(E6,.16,0,1.48,.19,.18,.22,0xd9d2c6,0,.16,1.48,0,true),
  block(.345,-.07,1.48,.018,.025,.12,0x7a1f1f), block(.345,.07,1.48,.018,.025,.12,0x7a1f1f),
];
for(const side of [-1,1]) weepingSaint.push(
  // In the watched rest silhouette both long hands cover the face; stab/sweep rotates them clear from this shoulder pivot.
  limb([[.03,side*.19,1.22,.07],[.15,side*.31,1.40,.055],[.32,side*.13,1.49,.035]],0xb9b1a4,side<0?50:51,.03,1.22),
  limb([[-.03,side*.12,.31,.08],[-.05,side*.17,.13,.06],[.08,side*.18,.02,.045]],0x2a2622,side,0,.34),
);

// Hanged Choir: the original four pallid singers suspended beneath a dark crossbar.
const hangedChoir = [block(0,0,1.77,.09,.62,.055,0x151312), limb([[0,0,2.02,.035],[0,0,1.76,.028],[.02,0,1.55,.02]],0xcbbfa8,31,0,1.76)];
for(let i=0;i<4;i++){const y=(i-1.5)*.28, swing=32+i;hangedChoir.push(
  part(curvedTube([[0,y,1.75,.018],[.02,y,1.48,.012]],3),0,0,0,1,1,1,0xcbbfa8,swing,.02,1.48),
  part(E5,.02,y,1.28,.16,.15,.20,0x5b5550,swing,.02,1.48,0,true),
  block(.205,y,1.23,.018,.065,.022,0xd1e86a,swing,.02,1.48),
  limb([[0,y,1.15,.055],[-.09,y, .78,.04],[-.02,y,.48,.02]],0x5b5550,swing,.02,1.48)
);}

// Grave Lantern: chained cage, green flame-face and two hanging censers.
const graveLantern = [
  limb([[0,0,1.95,.025],[.02,0,1.72,.022],[0,0,1.54,.018]],0x4d5560,31,0,1.55),
  part(bevel,0,0,1.34,.30,.27,.10,0x1b1e24,31,0,1.55), part(bevel,0,0,.72,.31,.28,.10,0x1b1e24,31,0,1.55),
  part(E6,0,0,1.02,.20,.18,.30,0x9dff8a,31,0,1.55,0,true),
  part(taper,.02,0,1.17,.12,.10,.24,0xe9ffd9,31,0,1.55),
];
for(const y of [-.21,0,.21]) graveLantern.push(block(.03,y,1.03,.026,.021,.31,0x4d5560,31,0,1.55));
for(const side of [-1,1]) graveLantern.push(limb([[0,side*.22,.70,.025],[.04,side*.34,.39,.018],[.10,side*.39,.20,.035]],0x4d5560,34+side,0,.70));

// Mirror Shade: thin silver planes around a dark core, each plane presenting a different false face.
const mirrorShade = [part(E6,0,0,.89,.18,.16,.39,0x262a35,0,0,.89,0,true)];
for(let i=0;i<5;i++){const a=i*Math.PI*2/5,y=Math.sin(a)*.34,z=.88+Math.cos(a)*.38,s=40+i;mirrorShade.push(
  part(membrane([[0,-.13,-.20],[.02,.14,-.16],[.08,.12,.18],[-.02,-.11,.22]]),.02,y,z,1,1,1,i%2?0x9aa3b5:0xdff3ff,s,0,.89),
  block(.105,y,z,.012,.035,.025,0xff9ee8,s,0,.89)
);}

// Amalgam: a low flesh mass with mismatched heads and six independently articulated limbs.
const amalgam = [part(E8,-.08,0,.62,.48,.37,.42,0xc99a8f,0,-.08,.62,0,true),part(E6,.29,-.15,.95,.17,.15,.19,0xf2d0c4,56,.12,.78),part(E6,.18,.19,1.04,.15,.14,.17,0x3a1a1c,57,.08,.80)];
for(let i=0;i<3;i++)for(const side of [-1,1]){const x=.22-i*.25,y=side*(.28+i*.035),s=50+i*2+(side>0?1:0);amalgam.push(limb([[x,y,.61,.07],[x+(i===0?.22:-.08),side*.52,.38,.05],[x+.12,side*.60,.08,.025]],i===1?0x6b0f1a:0xc99a8f,s,x,.61));}

// Gnawing Maw: masonry-bound flesh aperture, opposing jaws and radial grasping feelers.
const gnawingMaw = [part(E8,-.20,0,.72,.20,.52,.54,0x1a0a0b),part(ringLoft([[0,.42,0],[.15,.48,0],[.28,.31,0]],8),-.08,0,.72,1,1,1,0x6e2a2e)];
for(const side of [-1,1]) gnawingMaw.push(part(taper,.32,side*.22,.72,.24,.07,.14,0xe8d9c2,side<0?20:21,.05,.72,-Math.PI/2));
for(let i=0;i<4;i++){const y=(i-1.5)*.19;gnawingMaw.push(limb([[-.18,y,.72,.045],[-.38,y*1.25,.48+(i%2)*.28,.03],[-.52,y*1.45,.35+(i%2)*.36,.012]],0x6e2a2e,55+i,-.18,.72));}

// Cinder Seraph: narrow ember body, four ash-red wings and a broken fire halo.
const cinderSeraph=[part(E6,0,0,.91,.18,.16,.39,0xa8452c,0,0,.91,0,true),part(E6,.08,0,1.36,.16,.15,.17,0x2d120c)];
for(const side of [-1,1])for(const level of [0,1]){const shape=side>0?wing:wing.map(t=>t.map(([x,y,z])=>[x,-y,z]));cinderSeraph.push(part(shape,-.08,0,1.23-level*.30,1,1,1,level?0xa8452c:0xffc35a,side>0?22:23,-.08,1.18));}
for(const side of [-1,1]){const shape=side>0?smallWing:smallWing.map(t=>t.map(([x,y,z])=>[x,-y,z]));cinderSeraph.push(part(shape,-.04,0,.72,.72,.72,.72,0xa8452c,side>0?22:23,-.08,1.18));}
for(let i=0;i<10;i++){const a=i*Math.PI*2/10;cinderSeraph.push(part(taper,-.02,Math.cos(a)*.25,1.56+Math.sin(a)*.25,.045,.032,.10,i%2?0xffc35a:0xfff3c9,23,-.02,1.45,-Math.PI/2));}
for(const side of [-1,1]) cinderSeraph.push(limb([[0,side*.11,.65,.055],[.04,side*.16,.34,.04],[.13,side*.17,.08,.02]],0x2d120c,side,0,.65));

// Lumen Wraith: hooded shroud, bright lens and four long trailing light ribbons.
const lumenWraith=[part(verticalLoft([[0,.10,0],[-.06,.34,.38],[.02,.29,.82],[.10,.18,1.12]],7),0,0,.35,1,1,1,0xc9e8f2),part(E6,.12,0,1.47,.23,.21,.23,0x2c3b52,64,.04,1.20),part(E6,.31,0,1.47,.055,.10,.08,0xf6fdff,64,.04,1.20)];
for(let i=0;i<4;i++){const y=(i-1.5)*.13;lumenWraith.push(limb([[0,y,.56,.045],[-.18,y*.9,.28,.03],[-.32,y*1.35,.02,.009]],i%2?0x7fe7ff:0xc9e8f2,60+i,0,.56));}

// Veil Spinner: abdomen/head pair, hourglass mark and eight long jointed legs.
const veilSpinner=[part(E8,-.18,0,.54,.34,.29,.28,0x4a3d4f,0,-.18,.54,0,true),part(E6,.22,0,.51,.20,.19,.18,0x18131a,78,.08,.48),part(membrane([[0,-.07,-.12],[0,.07,-.12],[0,0,.13]]),.13,0,.56,1,1,1,0xff6b8a)];
for(let i=0;i<4;i++)for(const side of [-1,1]){const x=.18-i*.16,s=70+i*2+(side>0?1:0);veilSpinner.push(limb([[x,side*.14,.50,.04],[x+(i-1.5)*.06,side*.48,.32,.03],[x+(i-1.5)*.10,side*.67,.04,.012]],i%2?0xe7d6f2:0x4a3d4f,s,x,.50));}

// Rift Lynx: long feline torso, pointed ears, four legs and a forked rift tail.
const riftLynx=[part(E8,-.08,0,.62,.43,.21,.24,0x3b3f63,0,-.08,.62,0,true),part(E6,.38,0,.73,.22,.18,.20,0x16172b,84,.20,.62),part(taper,.42,-.12,.99,.09,.055,.15,0xc58cff,84,.20,.62,-.2),part(taper,.42,.12,.99,.09,.055,.15,0xc58cff,84,.20,.62,-.2)];
for(const [x,s] of [[.20,2],[-.30,1]])for(const side of [-1,1])riftLynx.push(limb([[x,side*.14,.55,.05],[x+(x>0?.08:-.06),side*.17,.27,.035],[x+.11,side*.18,.03,.018]],0x3b3f63,side*s,x,.55));
for(const side of [-1,1])riftLynx.push(limb([[-.43,0,.66,.045],[-.65,side*.10,.78,.03],[-.82,side*.18,.62,.01]],0xc58cff,80+(side>0?1:0),-.43,.66));

// Sunderjaw: three armoured delver segments and a forward circular, inward-toothed maw.
const sunderjaw=[];for(let i=0;i<3;i++)sunderjaw.push(part(E6,-.36*i,0,.43-i*.05,.32-i*.035,.26-i*.03,.25-i*.025,i?0x8a6a4f:0xf3dcb0,i?82+i:0,-.36*i,.43-i*.05,0,true));
sunderjaw.push(part(ringLoft([[0,.30,0],[.12,.36,0],[.24,.18,0]],8),.08,0,.45,1,1,1,0x2e2219,20,.08,.45));
for(let i=0;i<8;i++){const a=i*Math.PI*2/8;sunderjaw.push(part(taper,.40,Math.cos(a)*.18,.45+Math.sin(a)*.18,.13,.035,.06,0xe0b071,20,.08,.45,-Math.PI/2));}

// Thunderhorn: heavy quadruped with paired yellow battering horns and grounded hooves.
const thunderhorn=[part(E8,-.10,0,.74,.50,.29,.34,0x6d5a4c,0,-.10,.74,0,true),part(E6,.40,0,.78,.27,.24,.25,0x251d18,24,.40,.78)];
for(const side of [-1,1]) thunderhorn.push(part(curvedTube([[.48,side*.13,.90,.07],[.68,side*.20,1.02,.05],[.88,side*.17,.86,.012]],5),0,0,0,1,1,1,0xffd25a,24,.40,.78));
for(const [x,s] of [[.23,2],[-.34,1]])for(const side of [-1,1])thunderhorn.push(limb([[x,side*.19,.60,.065],[x-.02,side*.22,.26,.05],[x+.09,side*.23,.04,.025]],0x251d18,side*s,x,.60));

// Siege Beetle: riveted shell, six legs, mandibles and an articulated dorsal mortar.
const siegeBeetle=[part(E8,-.08,0,.48,.50,.35,.31,0x5b4a3a,0,-.08,.48,0,true),part(E6,.39,0,.43,.20,.20,.18,0x211a14),part(bevel,-.10,0,.86,.12,.12,.35,0xff9d4a,30,-.10,.64,-.48)];
for(let i=0;i<3;i++)for(const side of [-1,1]){const x=.24-i*.24;siegeBeetle.push(limb([[x,side*.22,.42,.05],[x+.04,side*.48,.22,.035],[x+.13,side*.58,.04,.015]],0x211a14,90+i*2+(side>0?1:0),x,.42));}
for(const side of [-1,1])siegeBeetle.push(limb([[.48,side*.10,.44,.035],[.66,side*.18,.39,.025],[.73,side*.09,.28,.008]],0xffe0b0,20,.48,.44));

// Gloomwisp: head-sized dark gas with blue eyes and a broad luminous grin.
const gloomwisp=[part(E8,0,0,.67,.30,.29,.31,0x1d2340,0,0,.67,0,true),block(.25,-.09,.75,.025,.035,.035,0x5aa6ff),block(.25,.09,.75,.025,.035,.035,0x5aa6ff)];
for(let i=-2;i<=2;i++)gloomwisp.push(block(.275,i*.055,.60,.018,.021,.018,0xa8e4ff,20,0,.67));
for(let i=0;i<3;i++){const y=(i-1)*.14;gloomwisp.push(limb([[-.05,y,.49,.045],[-.16,y*1.3,.25,.025],[-.10,y*1.6,.06,.008]],0x0b0e1f,100+i,0,.67));}

// Gloomgorge: squat fat ghost, ear-to-ear mouth, stubby limbs and hooked blue claws.
const gloomgorge=[part(E6,-.05,0,.72,.50,.40,.55,0x232c52,0,-.05,.72,0,true),part(E6,.31,0,.80,.20,.33,.20,0x0c1024,20,.05,.80,0,true)];
for(let i=-3;i<=3;i++)gloomgorge.push(part(taper,.48,i*.075,.80,.11,.025,.045,0xbdeeff,20,.05,.80,-Math.PI/2));
for(const side of [-1,1])gloomgorge.push(limb([[0,side*.32,.72,.075],[.22,side*.51,.48,.055],[.38,side*.55,.33,.025]],0x232c52,side<0?25:26,0,.72),part(taper,.46,side*.57,.27,.13,.045,.07,0x6ab4ff,side<0?25:26,0,.72,-.8));
for(const side of [-1,1])gloomgorge.push(limb([[-.20,side*.20,.38,.07],[-.25,side*.24,.16,.05],[-.13,side*.25,.03,.025]],0x0c1024,side,-.20,.38));

export const CLOSE_VIEW_PENTAGON_MODELS={weepingSaint,hangedChoir,graveLantern,mirrorShade,amalgam,gnawingMaw,cinderSeraph,lumenWraith,veilSpinner,riftLynx,sunderjaw,thunderhorn,siegeBeetle,gloomwisp,gloomgorge};
export const CLOSE_VIEW_PENTAGON_KINDS=Object.freeze(Object.keys(CLOSE_VIEW_PENTAGON_MODELS));
