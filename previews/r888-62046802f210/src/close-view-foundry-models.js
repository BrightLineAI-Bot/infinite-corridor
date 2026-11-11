// Authored Foundry morphology recipes. These registry assets do not admit a creature to Close View;
// presentation integration selects one only after the production Foundry candidate has been validated.
import { bevel, taper, ellipsoid, ringLoft, curvedTube, membrane, part } from './close-view-mesh.js?v=r888-62046802f210';

import { FOUNDRY_MODEL_KEYS, FOUNDRY_PALETTES } from './close-view-foundry-presentation.js?v=r888-62046802f210';
export { FOUNDRY_MODEL_KEYS, FOUNDRY_MODEL_METADATA, FOUNDRY_PALETTES, foundryPaletteIndex, foundryPaletteColor } from './close-view-foundry-presentation.js?v=r888-62046802f210';
const [primary, shadow, accent] = FOUNDRY_PALETTES[0];

// Low, muscular quadruped: arched body, wedge head, four jointed legs, tail and paired brow prongs.
const quadruped = [
  part(ellipsoid(8, 3), -.08, 0, .48, .48, .27, .25, primary, 0, -.08, .48, 0, true),
  part(ellipsoid(6, 2), .38, 0, .61, .25, .23, .20, shadow, 0, .38, .61, 0, true),
  part(curvedTube([[-.44,0,.52,.065],[-.64,0,.63,.045],[-.78,0,.55,.012]],4), 0,0,0,1,1,1, primary, 24, -.44,.52),
  part(taper, .57,-.11,.79,.055,.045,.15,accent,0,.57,.72,-.42),
  part(taper, .57, .11,.79,.055,.045,.15,accent,0,.57,.72,-.42),
];
for (const side of [-1, 1]) for (const front of [-1, 1]) {
  const x = front > 0 ? .24 : -.31, swing = 20 + (side > 0 ? 1 : 0) + (front > 0 ? 0 : 2);
  quadruped.push(part(curvedTube([[x,side*.19,.45,.06],[x+(front*.05),side*.31,.24,.045],[x+(front*.12),side*.34,.035,.025]],4),0,0,0,1,1,1,shadow,swing,x,.45));
}

// Floating morphology: enclosed seed/core, open mantle ring, four vanes and trailing stabilisers.
const floating = [
  part(ellipsoid(8,3),0,0,.66,.25,.25,.31,primary,30,0,.66,0,true),
  part(ringLoft([[0,.34,-.10],[.02,.39,.02],[0,.30,.15]],8),0,0,.69,1,1,1,shadow,31,0,.69,0,true),
];
for (let i=0;i<4;i++) {
  const a=i*Math.PI/2, y=Math.sin(a)*.23, x=Math.cos(a)*.23;
  floating.push(part(membrane([[0,0,0],[.18,.05,.08],[.28,0,-.08],[.12,-.05,-.13]]),x,y,.69,1,1,1,accent,32+i,x,.69,a));
  floating.push(part(curvedTube([[x,y,.52,.035],[x*.9,y*1.3,.26,.022],[x*.55,y*1.5,.08,.008]],4),0,0,0,1,1,1,primary,36+i,x,.52));
}

// Segmented morphology: a three-link armoured body plus distinct head, feet and opposing mandibles.
const segmented = [];
for (let i=0;i<3;i++) segmented.push(part(ellipsoid(6,2),-.30+i*.28,0,.34+i*.045,.22,.22,.17,i===1?shadow:primary,40+i,-.30+i*.28,.34+i*.045,0,true));
segmented.push(part(ellipsoid(6,2),.47,0,.45,.24,.22,.19,primary,43,.47,.45,0,true));
for (const side of [-1,1]) for(let i=0;i<3;i++) {
  const x=-.28+i*.29;
  segmented.push(part(curvedTube([[x,side*.15,.31,.035],[x+.04,side*.31,.17,.026],[x+.12,side*.38,.035,.012]],3),0,0,0,1,1,1,shadow,44+i*2+(side>0?1:0),x,.31));
}
segmented.push(part(taper,.63,-.10,.43,.12,.035,.07,accent,43,.47,.45,-1.15),part(taper,.63,.10,.43,.12,.035,.07,accent,43,.47,.45,-1.15));

// Tentacled morphology: buoyant oval core, crown collar and five independently phased load-bearing tendrils.
const tentacled = [
  part(ellipsoid(8,3),0,0,.79,.31,.30,.38,primary,50,0,.79,0,true),
  part(ellipsoid(6,2),.25,0,.88,.065,.16,.13,accent,50,.25,.88,0,true),
  part(ringLoft([[0,.24,-.08],[0,.34,.02],[0,.25,.11]],8),0,0,.92,1,1,1,shadow,51,0,.92,0,true),
];
for(let i=0;i<5;i++){const a=(i-.5)*Math.PI*2/5,x=Math.cos(a)*.15,y=Math.sin(a)*.19;tentacled.push(part(curvedTube([[x,y,.56,.05],[x*.9-.08,y*1.25,.28,.032],[x*1.4+.05*Math.sin(i),y*1.55,.035,.009]],4),0,0,0,1,1,1,i%2?shadow:primary,52+i,x,.56));}

// Geometric morphology: faceted nucleus with six detached-looking articulated plates and a forward lens.
const geometric = [part(bevel,0,0,.74,.28,.28,.35,shadow,60,0,.74,0,true),part(taper,.31,0,.80,.11,.14,.13,accent,60,.31,.80,-1.3)];
for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*.38,y=Math.sin(a)*.38,z=.74+(i%2?.17:-.14);geometric.push(part(bevel,x,y,z,.12,.07,.18,primary,61+i,x,z,a*.3,true));}

// Biomechanical morphology: plated upright chassis, luminous heart, paired legs/arms and three cable limbs.
const biomechanical = [
  part(ellipsoid(8,3),0,0,.84,.28,.30,.43,primary,70,0,.84,0,true),
  part(ellipsoid(6,2),.05,0,1.27,.23,.22,.18,shadow,70,.05,1.27,0,true),
  part(bevel,.27,0,.88,.09,.13,.16,accent,70,.27,.88,0,true),
];
for(const side of [-1,1]) biomechanical.push(
  part(curvedTube([[-.05,side*.16,.59,.055],[-.02,side*.20,.29,.045],[.08,side*.22,.035,.024]],4),0,0,0,1,1,1,shadow,71+(side>0?1:0),-.05,.59),
  part(curvedTube([[.02,side*.23,1.05,.05],[.18,side*.35,.83,.038],[.31,side*.38,.61,.015]],4),0,0,0,1,1,1,primary,73+(side>0?1:0),.02,1.05),
);
for(let i=0;i<3;i++){const y=(i-1)*.16;biomechanical.push(part(curvedTube([[-.18,y,.72,.038],[-.38,y*1.35,.46,.026],[-.48,y*1.6,.18,.008]],4),0,0,0,1,1,1,i===1?accent:shadow,75+i,-.18,.72));}

export const CLOSE_VIEW_FOUNDRY_MODELS = Object.freeze({
  [FOUNDRY_MODEL_KEYS.quadruped]: quadruped, [FOUNDRY_MODEL_KEYS.floating]: floating,
  [FOUNDRY_MODEL_KEYS.segmented]: segmented, [FOUNDRY_MODEL_KEYS.tentacled]: tentacled,
  [FOUNDRY_MODEL_KEYS.geometric]: geometric, [FOUNDRY_MODEL_KEYS.biomechanical]: biomechanical,
});
export const CLOSE_VIEW_FOUNDRY_KINDS = Object.freeze(Object.keys(CLOSE_VIEW_FOUNDRY_MODELS));

// Production count variants use the same core and retain room for three drone attachments.
export const CLOSE_VIEW_FOUNDRY_VARIANTS = Object.freeze(Object.fromEntries([3,6].flatMap(count => {
  const tendrils = tentacled.filter(p => p.swing < 52);
  for(let i=0;i<count;i++){const a=(i-.5)*Math.PI*2/count,x=Math.cos(a)*.15,y=Math.sin(a)*.19;tendrils.push(part(curvedTube([[x,y,.56,.05],[x*.9-.08,y*1.25,.28,.032],[x*1.4+.05*Math.sin(i),y*1.55,.035,.009]],4),0,0,0,1,1,1,i%2?shadow:primary,52+i,x,.56));}
  const chassis = biomechanical.filter(p => p.swing < 75);
  for(let i=0;i<count;i++){const y=(i-(count-1)/2)*.10;chassis.push(part(curvedTube([[-.18,y,.72,.038],[-.38,y*1.35,.46,.026],[-.48,y*1.6,.18,.008]],count===6?3:4),0,0,0,1,1,1,i%3===1?accent:shadow,75+i,-.18,.72));}
  return [[`foundry-tentacled-${count}`,tendrils],[`foundry-biomechanical-${count}`,chassis]];
})));
