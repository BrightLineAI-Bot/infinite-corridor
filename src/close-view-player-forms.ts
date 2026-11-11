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
// Every overlay triangle faces away from its piece core. The left half of the chest sigil (and any
// mirrored quad) was authored with reversed winding and lit from behind; orient once at bake time.
function orientOverlay(list,core){
  for(const part of list){const v=part.vertices,c=core(part.node);
    for(let i=0;i<v.length;i+=3){const a=v[i],b=v[i+1],d=v[i+2],ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],wx=d[0]-a[0],wy=d[1]-a[1],wz=d[2]-a[2];
      const nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx,mx=(a[0]+b[0]+d[0])/3-c[0],my=(a[1]+b[1]+d[1])/3-c[1],mz=(a[2]+b[2]+d[2])/3-c[2];
      if(nx*mx+ny*my+nz*mz<0){v[i+1]=d;v[i+2]=b;}}}
}
orientOverlay(armor,node=>node===24||node===4?[0,1.76,-.02]:node===12||node===22?[.36*(node===12?1:-1),1.76,0]:node===30||node===32?[.16*(node===30?1:-1),1.04,-.03]:[.19*(node===29?1:-1),.45,-.005]);
export const CLOSE_VIEW_POWER_SUIT_ARMOR = Object.freeze(armor);
export const CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES = armor.reduce((n,p)=>n+p.vertices.length/3,0);

// The standard Wayfarer kit (Tim, 2026-11-11: the loose-gear look, a chest piece with a few lights
// on one side, a back pack and thigh/shin plates, as his everyday look). Bind-space, skinned one bone
// per piece like the suit armor, but built as solid plates: each plate is a curved shell with a real
// rim of thickness, so it reads as worn equipment from every side instead of floating cards.
// Measured from the fitted source: torso front z≈.17 / back z≈-.21; thigh centre (±.165,-.03);
// shin centre (±.19,0). All values are data; no gameplay or animation depends on them.
const KIT = Object.freeze({
  plate:0x4a5450, rim:0x8f6d47, iron:0x2a2e30, dark:0x1b1f20, light:0xf09040, lightGlow:1.6,
  canvas:0x5e4d3c, leather:0x3b2f27, roll:0x4f5b52, strap:0x2b2420,
});
const kit=[];
const kitAdd=(node,color,core,vertices,glow=1)=>kit.push({node,color,glow,core,vertices});
// Curved shell: rows of [y, centreX, centreZ, radiusX, radiusZ]; columns are angles from the front
// (+z) toward the piece's outer side. Outer face plus the rim between outer and inner surfaces.
// A row may add [spread] to scale its angles; `bump` raises chosen columns (a breastplate ridge).
function kitShell(node,color,rimColor,side,rows,angles,stand,thick,bump=null,skipTop=true){
  const outer=[],inner=[];
  for(const [y,cx,cz,rx,rz,spread=1] of rows){const o=[],n=[];angles.forEach((deg,k)=>{const a=deg*spread*Math.PI/180,s=Math.sin(a)*side,c=Math.cos(a),up=bump?bump[k]:0;o.push([cx+s*(rx+stand+up),y,cz+c*(rz+stand+up)]);n.push([cx+s*(rx+stand-thick),y,cz+c*(rz+stand-thick)]);});outer.push(o);inner.push(n);}
  const mid=rows[rows.length>>1],am=(angles[0]+angles.at(-1))/2*Math.PI/180,core=[mid[1]+Math.sin(am)*side*mid[3]*.2,(rows[0][0]+rows.at(-1)[0])/2,mid[2]+Math.cos(am)*mid[4]*.2];
  const face=[],rim=[],quad=(list,a,b,c,d)=>list.push(a,b,c,a,c,d);
  for(let r=0;r<outer.length-1;r++)for(let i=0;i<angles.length-1;i++)quad(face,outer[r][i],outer[r][i+1],outer[r+1][i+1],outer[r+1][i]);
  const last=outer.length-1,end=angles.length-1;
  // The top rim tucks under a strap, the hip or a knee cop and is never seen; it is not spent.
  for(let i=0;i<end;i++){if(!skipTop)quad(rim,outer[0][i],outer[0][i+1],inner[0][i+1],inner[0][i]);quad(rim,outer[last][i],outer[last][i+1],inner[last][i+1],inner[last][i]);}
  for(let r=0;r<last;r++){quad(rim,outer[r][0],outer[r+1][0],inner[r+1][0],inner[r][0]);quad(rim,outer[r][end],outer[r+1][end],inner[r+1][end],inner[r][end]);}
  kitAdd(node,color,core,face);kitAdd(node,rimColor,core,rim);
  return outer;
}
// Axis-aligned box without its hidden faces (skip lists 'front'|'back'|'top'|'bottom').
function kitBox(node,color,cx,cy,cz,hx,hy,hz,skip=[]){
  const p=(x,y,z)=>[cx+x*hx,cy+y*hy,cz+z*hz],v=[],quad=(a,b,c,d)=>v.push(a,b,c,a,c,d);
  if(!skip.includes('top'))quad(p(-1,1,-1),p(1,1,-1),p(1,1,1),p(-1,1,1));if(!skip.includes('bottom'))quad(p(-1,-1,-1),p(1,-1,-1),p(1,-1,1),p(-1,-1,1));
  quad(p(1,-1,-1),p(1,1,-1),p(1,1,1),p(1,-1,1));quad(p(-1,-1,-1),p(-1,1,-1),p(-1,1,1),p(-1,-1,1));
  if(!skip.includes('back'))quad(p(-1,-1,-1),p(1,-1,-1),p(1,1,-1),p(-1,1,-1));
  if(!skip.includes('front'))quad(p(-1,-1,1),p(1,-1,1),p(1,1,1),p(-1,1,1));
  kitAdd(node,color,[cx,cy,cz],v);
}
// Chest piece: a curved breastplate with a bronze rim.
// Shield-shaped: narrow at the collar, broad across the chest, tapering to the belt.
const chestRows=[[1.935,0,-.02,.185,.19,.78],[1.765,0,-.02,.205,.19,1],[1.585,0,-.02,.19,.185,.82]];
kitShell(24,KIT.plate,KIT.rim,1,chestRows,[-52,-18,18,52],.03,.026);
// Four status lights stacked on the wearer's left breast (source -X): three lit, one dark.
for(let i=0;i<4;i++){
  const a=-37*Math.PI/180,y=1.865-i*.052,rx=.205+.034,rz=.19+.034,x=Math.sin(a)*rx,z=-.02+Math.cos(a)*rz,tx=Math.cos(a)*.017,tz=-Math.sin(a)*.017,h=.017;
  kitAdd(24,i<3?KIT.light:KIT.dark,[0,1.76,-.02],[[x-tx,y-h,z-tz],[x+tx,y-h,z+tz],[x+tx,y+h,z+tz],[x-tx,y-h,z-tz],[x+tx,y+h,z+tz],[x-tx,y+h,z-tz]],i<3?KIT.lightGlow:1);
}
// Back pack: canvas body, leather lid and a rolled bedroll on top, with two shoulder straps.
kitBox(24,KIT.canvas,0,1.70,-.285,.15,.20,.08,['front','top']);
kitBox(24,KIT.leather,0,1.885,-.285,.162,.045,.092,['front','bottom']);
{
  const roll=[],cx=0,cy=1.99,cz=-.29,r=.062,h=.19,ring=x=>Array.from({length:5},(_,i)=>{const a=(i+.5)*Math.PI*2/5;return[x,cy+Math.cos(a)*r,cz+Math.sin(a)*r];}),L=ring(cx-h),R=ring(cx+h);
  for(let i=0;i<5;i++){const j=(i+1)%5;roll.push(L[i],L[j],R[j],L[i],R[j],R[i]);}
  for(let i=1;i<4;i++)roll.push(L[0],L[i],L[i+1],R[0],R[i+1],R[i]);
  kitAdd(24,KIT.roll,[cx,cy,cz],roll);
}
// A small lit storm-lantern glass hung on the pack's right side (the Wayfarer's Lantern motif).
{const x=.178,y=1.60,z=-.29,h=.032,w=.031;kitAdd(24,KIT.light,[x,y,z],[[x-w,y-h,z],[x+w,y-h,z],[x+w,y+h,z],[x,y-h,z-w],[x,y-h,z+w],[x,y+h,z+w]],KIT.lightGlow);}
for(const side of [-1,1]){
  const w=.026,a=[side*.10,1.93,-.215],b=[side*.13,2.035,-.045],c=[side*.125,1.93,.19],off=p=>[[p[0]-w,p[1],p[2]],[p[0]+w,p[1],p[2]]],[a0,a1]=off(a),[b0,b1]=off(b),[c0,c1]=off(c);
  kitAdd(24,KIT.strap,[side*.12,1.78,-.02],[a0,a1,b1,a0,b1,b0,b0,b1,c1,b0,c1,c0]);
}
// Thigh plates (front and outer thigh) and greaves with a small knee cop.
for(const [side,thigh,shin] of [[1,30,29],[-1,32,31]]){
  kitShell(thigh,KIT.plate,KIT.rim,side,[[1.16,side*.165,-.03,.105,.14],[.88,side*.165,-.03,.095,.13]],[-18,40,98],.024,.022);
  kitShell(shin,KIT.plate,KIT.rim,side,[[.56,side*.19,-.01,.115,.125],[.29,side*.185,-.01,.10,.11]],[-60,8,76],.03,.022);
  const kx=side*.19,ky=.605,kz=.13,cop=[[kx-.055,ky,kz-.02],[kx,ky+.055,kz-.025],[kx+.055,ky,kz-.02],[kx,ky-.05,kz-.015]],tip=[kx,ky+.005,kz+.035],v=[];
  for(let i=0;i<4;i++)v.push(cop[i],cop[(i+1)%4],tip);
  kitAdd(shin,KIT.rim,[kx,ky,kz-.08],v);
}
for(const part of kit){const v=part.vertices,c=part.core;for(let i=0;i<v.length;i+=3){const a=v[i],b=v[i+1],d=v[i+2],ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],wx=d[0]-a[0],wy=d[1]-a[1],wz=d[2]-a[2],nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx,mx=(a[0]+b[0]+d[0])/3-c[0],my=(a[1]+b[1]+d[1])/3-c[1],mz=(a[2]+b[2]+d[2])/3-c[2];if(nx*mx+ny*my+nz*mz<0){v[i+1]=d;v[i+2]=b;}}}
export const CLOSE_VIEW_WAYFARER_KIT = Object.freeze(kit.map(({node,color,glow,vertices})=>Object.freeze({node,color,glow,vertices:Object.freeze(vertices)})));
export const CLOSE_VIEW_WAYFARER_KIT_TRIANGLES = kit.reduce((n,p)=>n+p.vertices.length/3,0);

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
