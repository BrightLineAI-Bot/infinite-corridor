// Authored Close View geometry for player states whose ordinary renderer changes the whole silhouette.
// This module is deliberately data-only: callers decide when the real equipment/runtime state selects a key.
import { bevel, block, curvedTube, ellipsoid, membrane, part, prism, ringLoft, verticalLoft, taper } from './close-view-mesh.js?v=r914-c1265a9326d1';

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

// The unempowered robot, in 3D, follows the standard view's robot (drawSubmersible ashore): a
// polished silver pod with one big framed viewport the Wayfarer looks out of, two back boosters,
// bent robotic arms ending in three-fingered manipulators, and short legs on broad foot pads.
// Deliberately bulky and a little absurd, but built from clean, smooth-shaded solids (Tim,
// 2026-11-11: the old one "looks like a failed Blender experiment, a globule").
const podSilver = 0xc3cad2, podDark = 0x3a4048, podArm = 0x8e969f, podLeg = 0x7d858e, podFoot = 0x4b525a, podGlass = 0x1d5163;
// Spherical cap facing +X (apex at u=1), smooth normals from the unit sphere.
const capFan = (sides, angle) => { const rim = Array.from({ length: sides }, (_, i) => { const a = (i + .5) * Math.PI * 2 / sides; return [Math.cos(angle), Math.sin(angle) * Math.cos(a), Math.sin(angle) * Math.sin(a)]; }); return rim.map((p, i) => [[1, 0, 0], p, rim[(i + 1) % sides]]); };
// One three-sided claw finger from a wrist point toward a tip (4 triangles).
const claw = (w, t, r) => { const d = [t[0]-w[0], t[1]-w[1], t[2]-w[2]], l = Math.hypot(...d) || 1, u = Math.abs(d[2] / l) < .9 ? [0, 0, 1] : [1, 0, 0];
  let a = [d[1]*u[2]-d[2]*u[1], d[2]*u[0]-d[0]*u[2], d[0]*u[1]-d[1]*u[0]]; const al = Math.hypot(...a) || 1; a = a.map(q => q / al); const b = [d[1]*a[2]-d[2]*a[1], d[2]*a[0]-d[0]*a[2], d[0]*a[1]-d[1]*a[0]].map(q => q / l);
  const base = [0, 1, 2].map(k => { const q = k * Math.PI * 2 / 3; return [w[0] + (a[0]*Math.cos(q) + b[0]*Math.sin(q)) * r, w[1] + (a[1]*Math.cos(q) + b[1]*Math.sin(q)) * r, w[2] + (a[2]*Math.cos(q) + b[2]*Math.sin(q)) * r]; });
  return [[base[0], base[1], t], [base[1], base[2], t], [base[2], base[0], t], [base[0], base[2], base[1]]]; };
// The pod matches the standard view's proportions: a hull about a tile across riding on stubby legs.
const PC = .96, PR = .52;
const robot = [
  part(ellipsoid(10, 3), 0, 0, PC, PR, PR, PR + .01, podSilver, 0, 0, PC, 0, true),
  part(ringLoft([[0, .35, 0], [.15, .312, 0]], 8), .40, 0, PC, 1, 1, 1, podDark),
  part(capFan(8, .3047), -.424, 0, PC, 1, 1, 1, podGlass, 0, -.424, PC, 0, true),
  part([[[.562, .02, PC + .20], [.560, .13, PC + .17], [.556, .21, PC + .10]], [[.562, .02, PC + .20], [.556, .21, PC + .10], [.563, .11, PC + .13]]], 0, 0, 0, 1, 1, 1, 0xd8f6ff),
];
for (const side of [-1, 1]) robot.push(
  part([[[.582, side * .055, PC + .05], [.580, side * .12, PC + .05], [.580, side * .12, PC + .015]], [[.582, side * .055, PC + .05], [.580, side * .12, PC + .015], [.582, side * .055, PC + .015]]], 0, 0, 0, 1, 1, 1, amber),
  part(prism(4), -.38, side * .25, PC + .17, .095, .095, .24, 0x8f979f),
  part(curvedTube([[0, side * .46, PC + .02, .095], [.07, side * .68, PC - .19, .078], [.18, side * .73, PC - .38, .064]], 4), 0, 0, 0, 1, 1, 1, podArm, side * 2, 0, PC),
  part(ellipsoid(4, 1), .18, side * .73, PC - .40, .07, .07, .055, podDark, side * 2, 0, PC, 0, true),
  ...[-.6, 0, .6].map(f => part(claw([.19, side * .73, PC - .42], [.28 + .045 * Math.cos(f), side * (.73 + .09 * Math.sin(f)), PC - .60], .033), 0, 0, 0, 1, 1, 1, podDark, side * 2, 0, PC)),
  part(curvedTube([[0, side * .19, .52, .10], [.02, side * .20, .12, .085]], 4), 0, 0, 0, 1, 1, 1, podLeg, side, 0, .48),
  block(.05, side * .20, .045, .18, .12, .045, podFoot, side, 0, .48),
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
// Graphite pressure-suit plates after the standard view's empowered suit (drawPowerSuit).
const G=0x474c53,L=0x2a2d31,B=0x7c828a,A=0xd39a58;
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
const kit=[],suitKit=[];let kitTarget=kit;
const kitAdd=(node,color,core,vertices,glow=1)=>kitTarget.push({node,color,glow,core,vertices});
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
// The empowered suit's own additions, after drawPowerSuit: a smooth helmet with one smoked visor
// band and a side module with a stub antenna, and a compact life-support pack with hoses to the
// chest and a dim amber status light. The helmet is bound to the Head bone around the rendered
// head (measured in its bind space) and encloses the mask and hair.
kitTarget=suitKit;
{
  const HC=[0,2.19,-.055],HR=[.20,.225,.27],sides=8,lat=[-.55,-.05,.40,.85],ring=l=>Array.from({length:sides},(_,i)=>{const a=(i+.5)*Math.PI*2/sides;return[HC[0]+Math.cos(l)*Math.sin(a)*HR[0],HC[1]+Math.sin(l)*HR[1],HC[2]+Math.cos(l)*Math.cos(a)*HR[2]];}),rings=lat.map(ring),top=[HC[0],HC[1]+HR[1],HC[2]],shell=[];
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<sides;i++){const j=(i+1)%sides;shell.push(rings[r][i],rings[r][j],rings[r+1][j],rings[r][i],rings[r+1][j],rings[r+1][i]);}
  for(let i=0;i<sides;i++)shell.push(rings.at(-1)[i],rings.at(-1)[(i+1)%sides],top);
  kitAdd(3,0x50565e,HC,shell);
  // Visor: a wrap of four facets just proud of the helmet across the front.
  const vis=(l,a,k=1.035)=>[HC[0]+Math.cos(l)*Math.sin(a)*HR[0]*k,HC[1]+Math.sin(l)*HR[1]*k,HC[2]+Math.cos(l)*Math.cos(a)*HR[2]*k],band=[];
  for(let i=0;i<4;i++){const a0=(-1+i/2)*1.05,a1=(-1+(i+1)/2)*1.05;band.push(vis(-.06,a0),vis(-.06,a1),vis(.24,a1),vis(-.06,a0),vis(.24,a1),vis(.24,a0));}
  kitAdd(3,0x15222a,HC,band);
  kitBox(3,0x3b4047,HC[0]-HR[0]*.98,HC[1]+.03,HC[2]-.02,.03,.05,.05,[]);
  kitAdd(3,0x2a2d32,[HC[0]-HR[0],HC[1]+.15,HC[2]],[[HC[0]-HR[0]*.98,HC[1]+.07,HC[2]-.03],[HC[0]-HR[0]*.98,HC[1]+.07,HC[2]-.005],[HC[0]-HR[0]*.98-.004,HC[1]+.24,HC[2]-.02]]);
}
kitBox(24,0x3a3f45,0,1.72,-.29,.125,.17,.075,['front']);
kitAdd(24,0xd39a58,[0,1.72,-.29],[[.05,1.82,-.367],[.09,1.82,-.367],[.09,1.85,-.367],[.05,1.82,-.367],[.09,1.85,-.367],[.05,1.85,-.367]],1.5);
for(const side of [-1,1]){
  const w=.018,a=[side*.13,1.66,-.26],b=[side*.215,1.70,-.06],c=[side*.15,1.80,.17],pt=p=>[[p[0],p[1]-w,p[2]],[p[0],p[1]+w,p[2]]],[a0,a1]=pt(a),[b0,b1]=pt(b),[c0,c1]=pt(c);
  kitAdd(24,0x202328,[0,1.74,-.02],[a0,a1,b1,a0,b1,b0,b0,b1,c1,b0,c1,c0]);
}
// The suit's plates, rebuilt as solid shells like the standard kit (Tim, 2026-11-11): a graphite
// breastplate carrying the amber sigil, a collar, pauldrons, thigh plates and greaves with knee
// plates. Same bones and colours as the earlier card overlay; every plate now has a rim.
const suitArmor=[];kitTarget=suitArmor;
kitShell(24,G,B,1,[[1.935,0,-.02,.20,.20,.78],[1.765,0,-.02,.22,.20,1],[1.585,0,-.02,.205,.195,.82]],[-52,-18,18,52],.03,.026);
for(const part of armor)if(part.color===A)kitAdd(24,A,[0,1.76,-.02],part.vertices.map(v=>[v[0],v[1],v[2]-.012]));
for(const part of armor)if(part.node===4)kitAdd(4,part.color,[0,1.76,-.02],part.vertices);
for(const [side,node] of [[1,12],[-1,22]])kitShell(node,G,B,side,[[1.88,side*.36,-.01,.075,.10],[1.67,side*.38,-.01,.11,.13]],[-50,30,110],.03,.022);
for(const [side,thigh,shin] of [[1,30,29],[-1,32,31]]){
  kitShell(thigh,G,B,side,[[1.17,side*.165,-.03,.11,.145],[.88,side*.165,-.03,.10,.135]],[-18,40,98],.03,.024);
  kitShell(shin,G,B,side,[[.60,side*.19,-.01,.12,.13],[.29,side*.185,-.01,.10,.11]],[-60,8,76],.035,.024,null,false);
}
kitTarget=kit;
for(const part of [...kit,...suitKit,...suitArmor]){const v=part.vertices,c=part.core;for(let i=0;i<v.length;i+=3){const a=v[i],b=v[i+1],d=v[i+2],ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],wx=d[0]-a[0],wy=d[1]-a[1],wz=d[2]-a[2],nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx,mx=(a[0]+b[0]+d[0])/3-c[0],my=(a[1]+b[1]+d[1])/3-c[1],mz=(a[2]+b[2]+d[2])/3-c[2];if(nx*mx+ny*my+nz*mz<0){v[i+1]=d;v[i+2]=b;}}}
export const CLOSE_VIEW_POWER_SUIT_ARMOR = Object.freeze(suitArmor.map(({node,color,vertices})=>Object.freeze({node,color,vertices:Object.freeze(vertices)})));
export const CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES = suitArmor.reduce((n,p)=>n+p.vertices.length/3,0);
export const CLOSE_VIEW_WAYFARER_KIT = Object.freeze(kit.map(({node,color,glow,vertices})=>Object.freeze({node,color,glow,vertices:Object.freeze(vertices)})));
export const CLOSE_VIEW_WAYFARER_KIT_TRIANGLES = kit.reduce((n,p)=>n+p.vertices.length/3,0);
export const CLOSE_VIEW_SUIT_KIT = Object.freeze(suitKit.map(({node,color,glow,vertices})=>Object.freeze({node,color,glow,vertices:Object.freeze(vertices)})));
export const CLOSE_VIEW_SUIT_KIT_TRIANGLES = suitKit.reduce((n,p)=>n+p.vertices.length/3,0);

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

export { CLOSE_VIEW_PLAYER_FORM_PROFILES } from './close-view-player-presentation.js?v=r914-c1265a9326d1';
