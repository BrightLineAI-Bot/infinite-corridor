// Authored Foundry morphology recipes. These registry assets do not admit a creature to Close View;
// presentation integration selects one only after the production Foundry candidate has been validated.
import { prism, taper, ellipsoid, ringLoft, verticalLoft, curvedTube, membrane, part } from './close-view-mesh.js?v=r1036-6e23959101e8';

import { FOUNDRY_MODEL_KEYS, FOUNDRY_PALETTES } from './close-view-foundry-presentation.js?v=r1036-6e23959101e8';
export { FOUNDRY_MODEL_KEYS, FOUNDRY_MODEL_METADATA, FOUNDRY_PALETTES, foundryPaletteIndex, foundryPaletteColor } from './close-view-foundry-presentation.js?v=r1036-6e23959101e8';
const [primary, shadow, accent] = FOUNDRY_PALETTES[0];

// Low, muscular quadruped: a lofted body (deep chest, narrow waist, heavy haunch), a wedge head with lit eye slits, three
// back plates, a tail and four jointed legs (forelegs reach, hind legs drive). 2026-11-15 forms pass.
const quadruped = [
  part(ringLoft([[-.5, .15, .02], [-.26, .26, .04], [.06, .22, -.02], [.3, .27, .06]], 7), 0, 0, .5, 1, 1, .9, primary, 0, -.08, .48, 0, true),
  part(ringLoft([[.27, .13, .1], [.45, .12, .11], [.64, .05, .03]], 6), 0, 0, .55, 1, 1, 1, shadow, 0, .38, .61, 0, true),
  part(curvedTube([[-.48,0,.56,.07],[-.66,0,.66,.045],[-.82,0,.56,.012]],4), 0,0,0,1,1,1, primary, 24, -.48,.56),
  part(taper, .1, 0, .8, .05, .1, .1, accent, 0, -.08, .48, -.3),
  part(taper, -.14, 0, .82, .05, .09, .1, accent, 0, -.08, .48, -.45),
  part(membrane([[-.3, 0, .74], [-.5, 0, .78], [-.42, 0, .66]]), 0, 0, 0, 1, 1, 1, accent, 0, -.08, .48),
  part(membrane([[.56, -.08, .7], [.6, -.035, .68], [.55, -.06, .665]]), 0, 0, 0, 1, 1, 1, accent, 0, .38, .61),
  part(membrane([[.6, .035, .68], [.56, .08, .7], [.55, .06, .665]]), 0, 0, 0, 1, 1, 1, accent, 0, .38, .61),
];
for (const side of [-1, 1]) for (const front of [-1, 1]) {
  const x = front > 0 ? .24 : -.33, swing = 20 + (side > 0 ? 1 : 0) + (front > 0 ? 0 : 2);
  quadruped.push(part(curvedTube([[x,side*.2,.5,.075],[x+(front>0?.08:-.1),side*.3,.26,.05],[x+(front>0?.12:.0),side*.32,.03,.03]],4),0,0,0,1,1,1,shadow,swing,x,.5));
}

// Floating morphology: an enclosed seed (30) with a lit eye and a dorsal crest, a horizontal mantle collar round its waist (31),
// four short vanes (32-35) and four trailing stabilisers (36-39).
const floating = [
  part(ellipsoid(7,3),0,0,.66,.25,.25,.31,primary,30,0,.66,0,true),
  part(ellipsoid(5,1),.22,0,.7,.06,.11,.09,accent,30,0,.66,0,true),
  part(membrane([[.05,0,.95],[-.12,0,1.04],[-.22,0,.9],[-.05,0,.93]]),0,0,0,1,1,1,accent,30,0,.66),
  part(verticalLoft([[0,.3,-.05],[0,.42,.01],[0,.31,.07]],8),0,0,.66,1,1,1,shadow,31,0,.66,0,true),
];
for (let i=0;i<4;i++) {
  const a=i*Math.PI/2+Math.PI/4, y=Math.sin(a)*.4, x=Math.cos(a)*.4;
  floating.push(part(membrane([[0,0,0],[.2,.0,.07],[.14,0,-.1]]),x,y,.68,1,1,1,accent,32+i,x,.68,a));
  floating.push(part(curvedTube([[x*.55,y*.55,.5,.035],[x*.6,y*.75,.28,.022],[x*.4,y*.85,.08,.008]],4),0,0,0,1,1,1,primary,36+i,x*.55,.5));
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

// Tentacled morphology: a buoyant oval core with one lit eye, a frilled crown collar ringing its top (51) and three crest
// barbs, over five independently phased load-bearing tendrils (52+).
const tentacled = [
  part(ellipsoid(7,3),0,0,.79,.31,.3,.38,primary,50,0,.79,0,true),
  part(ellipsoid(6,2),.25,0,.86,.065,.16,.13,accent,50,.25,.86,0,true),
  part(verticalLoft([[0,.2,0],[-.03,.36,.07],[-.06,.3,.14]],8),0,0,1.0,1,1,1,shadow,51,0,1.0,0,true),
];
for (const [y, z] of [[0, 1.3], [-.12, 1.24], [.12, 1.24]]) tentacled.push(part(membrane([[-.06, y, 1.12], [-.2, y * 1.4, z], [-.1, y, 1.16]]), 0, 0, 0, 1, 1, 1, accent, 50, 0, .79));
for(let i=0;i<5;i++){const a=(i-.5)*Math.PI*2/5,x=Math.cos(a)*.15,y=Math.sin(a)*.19;tentacled.push(part(curvedTube([[x,y,.56,.05],[x*.9-.08,y*1.25,.28,.032],[x*1.4+.05*Math.sin(i),y*1.55,.035,.009]],4),0,0,0,1,1,1,i%2?shadow:primary,52+i,x,.56));}

// Geometric morphology: a cut double-pyramid nucleus (60) with a lit lens and a flat orbit band, ringed by six detached shard
// plates (61-66), each carrying a lit stud.
const geometric = [
  part(prism(6,.06),0,0,.86,.24,.24,.13,shadow,60,0,.74,0,true),
  part(prism(6,.06),0,0,.62,.24,.24,.13,shadow,60,0,.74,Math.PI,true),
  part(ellipsoid(5,1),.2,0,.76,.06,.1,.1,accent,60,0,.74,0,true),
  part(verticalLoft([[0,.31,0],[0,.31,.025]],9),0,0,.73,1,1,1,accent,60,0,.74),
];
for(let i=0;i<6;i++){const a=i*Math.PI/3,c=Math.cos(a),s=Math.sin(a),x=c*.42,y=s*.42,z=.74+(i%2?.17:-.14);
  geometric.push(part(prism(4,.55),x,y,z,.05,.13,.2,primary,61+i,x,z,a*.3,true));
  geometric.push(part(membrane([[x+c*.06,y+s*.06-.03,z+.03],[x+c*.06,y+s*.06+.03,z+.03],[x+c*.065,y+s*.065,z-.04]]),0,0,0,1,1,1,accent,61+i,x,z));}

// Biomechanical morphology: a lofted upright chassis (hips, waist, chest, shoulders), a helmed head with a lit visor, a lit
// heart plate, shoulder fins, paired legs (71/72) and arms (73/74), and trailing cable limbs (75+).
const biomechanical = [
  part(verticalLoft([[0,.2,.56],[.02,.17,.8],[.03,.28,1.04],[0,.22,1.18]],6),0,0,0,1,1,1,primary,70,0,.84),
  part(ellipsoid(6,2),.05,0,1.31,.17,.17,.16,shadow,70,.05,1.27,0,true),
  part(membrane([[.21,-.1,1.34],[.21,.1,1.34],[.205,.08,1.29],[.205,-.08,1.29]]),0,0,0,1,1,1,accent,70,.05,1.27),
  part(prism(6),.22,0,.98,.09,.12,.025,accent,70,.22,.98,Math.PI/2,true),
];
for(const side of [-1,1]) biomechanical.push(
  part(membrane([[0,side*.22,1.2],[-.12,side*.36,1.3],[.06,side*.34,1.16],[.08,side*.24,1.12]]),0,0,0,1,1,1,shadow,70,0,.84),
  part(curvedTube([[-.04,side*.15,.6,.075],[.04,side*.19,.3,.058],[.0,side*.21,.035,.04]],4),0,0,0,1,1,1,shadow,71+(side>0?1:0),-.04,.6),
  part(curvedTube([[.02,side*.28,1.12,.06],[.16,side*.38,.86,.045],[.3,side*.38,.64,.03]],4),0,0,0,1,1,1,primary,73+(side>0?1:0),.02,1.12),
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

// Attack poses for the Foundry kin, evaluated with the adventure creatures' (close-view-adventure-models.ts adventureJointPose):
// per model key, then root style (lunge for a stab, sweep, slam, spray for ranged), then Foundry-local joint, [coil, strike,
// follow, lag] in radians. Forelegs reach and hind legs drive; segments and cables trail the head; tendrils, vanes and plates
// draw in and flare out.
const FJ = (coil, strike, follow = 0, lag = 0) => Object.freeze([coil, strike, follow, lag]);
const quadrupedMelee = Object.freeze({ 20: FJ(.35, -.75, -.15), 21: FJ(.35, -.75, -.15, .12), 22: FJ(-.35, .55), 23: FJ(-.35, .55, 0, .1), 24: FJ(.3, -.45, 0, .3) });
const segmentedMelee = Object.freeze({ 43: FJ(-.4, .6, .12), 42: FJ(-.12, .2, 0, .15), 41: FJ(.1, -.15, 0, .3), 40: FJ(.15, -.2, 0, .4),
  44: FJ(-.2, .3), 45: FJ(-.2, .3, 0, .06), 46: FJ(-.2, .3, 0, .12), 47: FJ(-.2, .3, 0, .18), 48: FJ(-.2, .3, 0, .24), 49: FJ(-.2, .3, 0, .3) });
const tendrilFlare = Object.freeze(Object.fromEntries(Array.from({ length: 6 }, (_, i) => [52 + i, FJ(.3, -.7, -.15, i * .06)])));
const plateSnap = Object.freeze(Object.fromEntries(Array.from({ length: 6 }, (_, i) => [61 + i, FJ(i % 2 ? .3 : -.3, i % 2 ? -.6 : .6, 0, i * .05)])));
const vaneFlare = Object.freeze({ 32: FJ(.3, -.6), 33: FJ(-.3, .6), 34: FJ(.3, -.6), 35: FJ(-.3, .6), 36: FJ(.2, -.4, 0, .3), 37: FJ(.2, -.4, 0, .35), 38: FJ(.2, -.4, 0, .4), 39: FJ(.2, -.4, 0, .45) });
const chassisMelee = Object.freeze(Object.fromEntries([[71, FJ(0, -.3)], [72, FJ(0, .3)], [73, FJ(.6, -1.3, -.3)], [74, FJ(.45, -1.0, -.25, .2)],
  ...Array.from({ length: 6 }, (_, i) => [75 + i, FJ(.2, -.5, 0, .3 + i * .05)])]));
const chassisRanged = Object.freeze(Object.fromEntries([[73, FJ(.3, -1.1, -.15)], [74, FJ(.3, -1.1, -.15, .1)], ...Array.from({ length: 6 }, (_, i) => [75 + i, FJ(.25, -.4, 0, .2 + i * .05)])]));
const all = (set) => Object.freeze({ '*': set });
export const FOUNDRY_JOINT_POSE = Object.freeze({
  'foundry-quadruped': Object.freeze({ '*': quadrupedMelee, spray: Object.freeze({ 20: FJ(.2, -.35), 21: FJ(.2, -.35), 22: FJ(-.25, .35), 23: FJ(-.25, .35), 24: FJ(.2, -.3, 0, .3) }) }),
  'foundry-floating': all(vaneFlare), 'foundry-segmented': all(segmentedMelee), 'foundry-geometric': all(plateSnap),
  'foundry-tentacled': all(tendrilFlare), 'foundry-tentacled-3': all(tendrilFlare), 'foundry-tentacled-6': all(tendrilFlare),
  'foundry-biomechanical': Object.freeze({ '*': chassisMelee, spray: chassisRanged }), 'foundry-biomechanical-3': Object.freeze({ '*': chassisMelee, spray: chassisRanged }),
  'foundry-biomechanical-6': Object.freeze({ '*': chassisMelee, spray: chassisRanged }),
});
