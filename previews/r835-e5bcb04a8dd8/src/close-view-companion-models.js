// Data-only native geometry for Close View-visible companions and wandering speakers.
// Admission, actor routing and lifecycle clocks remain with their existing production producers.
import { ellipsoid, verticalLoft, curvedTube, membrane, part, block } from './close-view-mesh.js?v=r835-e5bcb04a8dd8';

const E6=ellipsoid(6,2),E8=ellipsoid(8,3);
const tube=(points,color,swing,px,pz,sides=4)=>part(curvedTube(points,sides),0,0,0,1,1,1,color,swing,px,pz);

// Corridor Golem (tool-forms.ts): a squat rounded stone figure, two yellow sigil eyes and oversized punching fists.
const golemStone=0x857a68,golemDark=0x3f382e,golemSigil=0xffd23f;
const corridorGolem=[
  part(E8,0,0,.72,.39,.34,.52,golemStone,0,0,.72,0,true),
  part(E6,.05,0,1.29,.25,.25,.20,golemStone,0,.05,1.29,0,true),
  block(.265,-.09,1.32,.025,.045,.035,golemSigil),block(.265,.09,1.32,.025,.045,.035,golemSigil),
];
for(const side of [-1,1])corridorGolem.push(
  tube([[.01,side*.28,.93,.08],[.18,side*.43,.70,.065],[.32,side*.47,.55,.045]],golemDark,side*2,.01,.93),
  part(E6,.39,side*.48,.51,.17,.16,.16,golemStone,side*2,.01,.93,0,true),
);

// Dungeon Reciter (renderer.ts traveler/scholar): road-blue hood and robe, bent reading posture,
// an open pale book held forward and a pilgrim-like walking staff.
const reciterCloth=0x5f6f92,reciterDark=0x2f3550,reciterPage=0xc9cfe6,reciterStaff=0x8c7d64;
const book=membrane([[0,-.16,0],[.02,0,.045],[0,.16,0],[-.03,0,-.035]]);
const dungeonReciter=[
  part(verticalLoft([[0,.16,0],[-.04,.25,.34],[.03,.20,.72]],6),0,0,.36,1,1,1,reciterDark,3,0,.88),
  part(E6,.13,0,1.31,.19,.18,.20,reciterCloth,0,.13,1.31,0,true),
  part(E6,.25,0,1.28,.10,.14,.11,reciterDark,0,.13,1.31,0,true),
  part(book,.37,0,.88,1,1,1,reciterPage,2,.04,1.07,-.18),
  tube([[-.03,.31,1.18,.025],[-.02,.34,.68,.022],[.02,.35,.06,.018]],reciterStaff,2,-.03,1.18),
];
for(const side of [-1,1])dungeonReciter.push(
  tube([[.03,side*.16,1.06,.045],[.18,side*.25,.91,.035],[.32,side*.14,.87,.022]],reciterCloth,side*2,.03,1.06),
  tube([[-.04,side*.12,.52,.055],[-.06,side*.16,.25,.042],[.04,side*.17,.04,.023]],reciterDark,side,0,.54),
);

// Elder Wanderer (renderer.ts drawElder): exceptionally tall rule-cloak, four stilt legs and a pale faceless disc.
// The five accent cells reserve the renderer's dynamic rule colour without baking a particular rule into the body.
const elderCloak=0x17101d,elderLeg=0x342b38,elderRule=0x9b76c8,elderDisc=0xe8e5dc;
const elderWanderer=[
  part(verticalLoft([[0,.23,0],[-.02,.27,.54],[.01,.21,1.14]],7),0,0,.68,1,1,1,elderCloak,3,0,1.28),
  part(E6,.03,0,2.18,.13,.12,.16,elderDisc,8,.03,2.18,0,true),
];
for(let i=0;i<4;i++){const side=i<2?-1:1,front=i%2?-1:1,swing=[-1,-2,1,2][i];elderWanderer.push(
  tube([[0,side*.16,.76,.045],[-.03,side*.39,.38,.030],[front*.12,side*.31,.035,.016]],elderLeg,swing,0,.76),
);}
for(let i=0;i<5;i++){const y=(i%2?-.10:.10),z=.91+i*.20;elderWanderer.push(block(.205,y,z,.018,.055,.045,elderRule,3,0,1.28));}

export const CLOSE_VIEW_COMPANION_MODELS=Object.freeze({corridorGolem,dungeonReciter,elderWanderer});
export const CLOSE_VIEW_COMPANION_KINDS=Object.freeze(Object.keys(CLOSE_VIEW_COMPANION_MODELS));

// Pure local-space presentation evidence. Production actor state owns walking, punches, listening,
// speaking, the Golem's rise/sink and every Elder rule colour/pattern.
export const CLOSE_VIEW_COMPANION_METADATA=Object.freeze({
  corridorGolem:Object.freeze({key:'corridorGolem',head:Object.freeze([.05,0,1.29]),action:Object.freeze([.39,0,.51]),motion:Object.freeze({arms:Object.freeze([-2,2]),lifecycle:'producer-rise-sink'}),palette:Object.freeze([golemStone,golemDark,golemSigil])}),
  dungeonReciter:Object.freeze({key:'dungeonReciter',head:Object.freeze([.13,0,1.31]),action:Object.freeze([.37,0,.88]),held:Object.freeze({book:Object.freeze([.37,0,.88]),staff:Object.freeze([-.02,.34,.68])}),motion:Object.freeze({legs:Object.freeze([-1,1]),arms:Object.freeze([-2,2]),cloth:3}),palette:Object.freeze([reciterCloth,reciterDark,reciterPage,reciterStaff])}),
  elderWanderer:Object.freeze({key:'elderWanderer',head:Object.freeze([.03,0,2.18]),action:Object.freeze([0,0,1.38]),motion:Object.freeze({legs:Object.freeze([-1,-2,1,2]),cloak:3,disc:8}),palette:Object.freeze({cloak:elderCloak,legs:elderLeg,ruleSlot:elderRule,disc:elderDisc})}),
});
