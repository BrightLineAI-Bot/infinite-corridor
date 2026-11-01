import { hashSeed } from './random.js?v=r689-750a4b5dcbe8';
// Registered natural encounter source on the reviewed r251/Gate baseline; not yet released.
// All numbers are provisional design proposals, not owner-specified balance.
export const ASTRAL = Object.freeze({
  name: 'Astral Worm', version: 1, speed: 3.4, travelSeconds: .9, maxStep: 1 / 60, maxFrame: .25,
  windup: .65, recovery: .65, morphTime: .35, cloneCount: 4, cloneHpShare: .12, cloneLife: 7,
  cloneRadius: 2.8, cloneTrackSpeed: 1.05, cloneGrace: 1.4, cloneTick: .4, drainShare: .12,
  beamRadius: .9, beamLife: 3.5, beamTick: .25, beamShare: .15,
  inkCount: 3, inkWarning: .65, inkOutbound: .48, inkSplat: .65, inkRecall: .48,
  inkRadius: .32, inkSpread: .18, inkArc: .7, inkRange: 4.2, inkMinRange: 1.4, inkFan: .34,
  inkLaunchOffset: .55, inkLaunchHeight: .45, inkPoolHeight: .15, inkShare: .3,
  poolRadius: 2.8, poolLife: .5, biteRadius: 1.3, biteCount: 3, biteGap: .55, biteActive: .12, hitGap: .3, flightPursuit: .7, maxActorArray: 32,
  trampleRadius: .85, trampleLife: 1.4, trampleSpeed: 5.5,
  griffinLife: 5, pounceGap: 1.15, pounceWindup: .55, pounceActive: .4, pounceSpeed: 7,
  ringCount: 4, ringInner: .35, ringWidth: .85, ringSpacing: 1.2, ringWarning: .6, ringActive: .16, ringGap: .22,
  hostileWalkerChance: .025, allyWalkerChance: .005, maxCompanions: 1,
});
// Register only on the reviewed Gate baseline: inherits its strength floor, retries and Questing dominance.
export const ASTRAL_PROFILE = Object.freeze({ kind: 'astralWorm', name: 'The Astral Worm', chance: .02,
  minDepth: 5, tries: 4, cooldownSlain: 20, cooldownEscaped: 26, hitsToKill: 64, hpPerLevel: 30,
  damageShare: .24, speed: 1.35, attackGap: .2, staggerResistance: .95, rewardMarks: 190, rewardPerLevel: 18,
  nativeHpFloor: 4760, nativeDamageFloor: 78, dungeonChance: .02, dungeonMinLevel: 1,
  patience: 180, home: 'wayglass', retreatMoves: 'astral-wayglass',
  flee: 'The Astral Worm draws its limbs into ink and turns toward the nearest reachable Wayglass.',
  homeLine: 'The Astral Worm pools beneath the Wayglass and slips from sight.',
  arrive: 'Black ink hangs above the ground. The Astral Worm unfolds.',
  slain: 'The Astral Worm loses its shape and falls still.',
  gone: 'The Astral Worm has had its fill. Its ink fades from the hunt.' });
export const ASTRAL_INK_FORMS = Object.freeze({inkWorm:'worm',inkPool:'pool',inkTrample:'trample'});
export const ASTRAL_MOVES = ['pool', 'trample', 'bite', 'flight', 'mirage', 'griffin', 'rings', ...Object.keys(ASTRAL_INK_FORMS)];
export const ASTRAL_RING_MODES = ['outward', 'inward', 'outward-inward', 'inward-outward'];
// Native mouth geometry and world projection shared with the renderer. Both anchors are in the
// hazard/actor coordinate domain, projected at x+.5, y+.62 by the host. The ground point is directly
// below the mouth, not below the body's center. The optional host groundHeight sampler agrees with
// renderer terrain projection; saved extra flight lift keeps the beam downward across a cliff.
export const ASTRAL_GEOMETRY = Object.freeze({drawScale:.65,mouthX:1.20,mouthY:-.10,flightLift:.8,bodyBaseY:.82,groundProjectionY:.62,minScale:.6,minBeamDrop:.2});
export function astralActorScale(s) { const n=Number(s.scale);return Math.max(ASTRAL_GEOMETRY.minScale,Number.isFinite(n)&&n!==0?n:1); }
const actorScale = astralActorScale;
const facingSign = s => s.facingX<0?-1:1;
export function astralBeamAnchors(s) {
  const g=ASTRAL_GEOMETRY,scale=actorScale(s),x=s.x+facingSign(s)*g.mouthX*g.drawScale*scale,y=s.y+g.bodyBaseY-g.groundProjectionY;
  const extra=Number.isFinite(s.flightLiftExtra)?Math.max(0,s.flightLiftExtra):0;
  return {mouth:{x,y:y-g.flightLift*scale+g.mouthY*g.drawScale*scale-extra},ground:{x,y}};
}
export function astralInkOrigin(s) {
  return {x:s.x+facingSign(s)*ASTRAL.inkLaunchOffset*actorScale(s),y:s.y+ASTRAL_GEOMETRY.bodyBaseY-ASTRAL_GEOMETRY.groundProjectionY,
    height:(s.form==='pool'?ASTRAL.inkPoolHeight:ASTRAL.inkLaunchHeight)*actorScale(s)};
}
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function random(s) { s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0; return s.rng / 4294967296; }
export function astralRingSequence(mode) {
  if (!ASTRAL_RING_MODES.includes(mode)) throw new Error('Unknown Astral ring mode');
  const out = Array.from({length:ASTRAL.ringCount},(_,i)=>i), into = [...out].reverse();
  return mode === 'outward' ? out : mode === 'inward' ? into : mode === 'outward-inward' ? [...out,...into] : [...into,...out];
}
export function createAstralState({x=0,y=0,hp=1400,damage=60,seed=1,namespace='prototype',facingX=1,scale=1}={}) {
  if (![x,y,hp,damage,seed].every(Number.isFinite) || hp<=0 || damage<=0) throw new Error('Invalid Astral initial state');
  return {v:1,namespace,x,y,hp,maxHp:hp,damage,rng:seed>>>0,clock:0,form:'worm',previousForm:'worm',morphStart:0,move:null,elapsed:0,recovery:ASTRAL.travelSeconds,
    facingX:facingSign({facingX}),scale:actorScale({scale}),flightLiftExtra:0,hitClock:0,cast:0,clones:[],hazards:[],blobs:[],ringMode:'outward',ringSequence:[],ringIndex:0,center:{x,y},target:{x,y},enclosed:0,terminated:false};
}
// State is JSON-only and uses active-time offsets. Caller stores it verbatim in existing actor snapshot.
// No wall clock, global timers, external RNG, reward mutation, or unloaded simulation.
export function snapshotAstral(s) { return JSON.parse(JSON.stringify(s)); }
export function endAstral(s) { s.terminated=true;s.move=null;s.form='worm';s.flightLiftExtra=0;s.clones=[];s.hazards=[];s.blobs=[]; }
export function damageAstralClone(s,id,amount) {
  const c=s.clones.find(c=>c.id===id); if(!c||!Number.isFinite(amount)||amount<=0) return 0;
  const dealt=Math.min(c.hp,amount); c.hp-=dealt;s.clones=s.clones.filter(c=>c.hp>0);return dealt;
}
export function astralWalkerPair(roll,{questingPresent=false,otherBeastPresent=false,walkerAvailable=false}={}) {
  if(!Number.isFinite(roll)||roll<0||roll>=1||questingPresent||otherBeastPresent||!walkerAvailable) return null;
  return roll<ASTRAL.allyWalkerChance?'ally':roll<ASTRAL.allyWalkerChance+ASTRAL.hostileWalkerChance?'hostile':null;
}
// Adapter must route an allied Walker exclusively to this encounter's main worm or its clones.
export function astralAllyCanHit(target, encounterId) {
  return !!target && target.astralEncounterId===encounterId && (target.kind==='astralWorm'||target.kind==='astralMirage') && target.hp>0;
}
export function astralSurfaceEligible(tile) {
  // Explicit provisional surface policy; never grants underwater, walls, or boat ownership.
  return !!tile && !tile.blocked && (!tile.lethal || ['ocean','deepOcean','lakeWater','river','dungeonWater'].includes(tile.kind));
}
export function astralEncloses(clones,p) {
  if(clones.length<3)return false;
  let sign=0,area=0;
  for(let i=0;i<clones.length;i++){const a=clones[i],b=clones[(i+1)%clones.length],cross=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);area+=a.x*b.y-b.x*a.y;if(Math.abs(cross)<1e-7)return false;const next=Math.sign(cross);if(sign&&next!==sign)return false;sign=next;}
  return Math.abs(area)>.01;
}
export function astralHazardContains(h,p) { const d=distance(h,p);return d>=h.inner&&d<=h.outer; }
function moveToward(s,p,speed,dt,w) { const d=distance(s,p);if(d<1e-9)return;const step=Math.min(d,speed*dt),x=s.x+(p.x-s.x)/d*step,y=s.y+(p.y-s.y)/d*step;if(w.canOccupy(x,y,s.form)){s.x=x;s.y=y;} }
function hazard(s,x,y,inner,outer,active,share=1) { return {x,y,inner,outer,active,share}; }
function groundHeight(w,p) { const h=Number(w.groundHeight?.(p.x,p.y));return Number.isFinite(h)?h:0; }
function faceTarget(s,p) { if(Math.abs(p.x-s.x)>1e-6)s.facingX=p.x>s.x?1:-1; }
function createInkBlobs(s) {
  const origin=astralInkOrigin(s),dx=s.target.x-origin.x,dy=s.target.y-origin.y,d=Math.hypot(dx,dy),angle=d>1e-6?Math.atan2(dy,dx):s.facingX<0?Math.PI:0;
  const reach=Math.max(ASTRAL.inkMinRange,Math.min(ASTRAL.inkRange,d));
  return Array.from({length:ASTRAL.inkCount},(_,i)=>{const a=angle+(i-1)*ASTRAL.inkFan;
    return {id:`${s.namespace}:astral-ink:${s.cast}:${i}`,x:origin.x,y:origin.y,origin:{x:origin.x,y:origin.y},originHeight:origin.height,
      target:{x:origin.x+Math.cos(a)*reach,y:origin.y+Math.sin(a)*reach},phase:'warning',progress:0,height:origin.height,radius:ASTRAL.inkRadius,blocked:false};});
}
// Additive fields permit old saved actors to resume their existing move, health and RNG unchanged.
function ensureAstralGeometry(s) { s.facingX=facingSign(s);s.scale=actorScale(s);s.flightLiftExtra??=0;s.blobs??=[]; }
export function startAstralMove(s,move,player,ringMode) {
  if(!ASTRAL_MOVES.includes(move)||s.terminated||s.hp<=0)return false;
  ensureAstralGeometry(s);faceTarget(s,player);
  s.previousForm=s.form;s.morphStart=s.clock;s.move=move;s.form=ASTRAL_INK_FORMS[move]||(move==='mirage'||move==='rings'?'worm':move);s.flightLiftExtra=0;s.elapsed=0;s.hitClock=0;s.cast++;s.hazards=[];s.clones=[];s.blobs=[];s.enclosed=0;
  s.center={x:s.x,y:s.y};s.target={x:player.x,y:player.y};
  if(ASTRAL_INK_FORMS[move])s.blobs=createInkBlobs(s);
  if(move==='rings'){s.ringMode=ringMode??ASTRAL_RING_MODES[Math.floor(random(s)*4)];s.ringSequence=astralRingSequence(s.ringMode);s.ringIndex=0;}
  if(move==='mirage')s.center={x:player.x,y:player.y};
  if(move==='mirage')for(let i=0;i<ASTRAL.cloneCount;i++){const a=i*Math.PI*2/ASTRAL.cloneCount;s.clones.push({id:`${s.namespace}:astral-mirage:${s.cast}:${i}`,x:player.x+Math.cos(a)*ASTRAL.cloneRadius,y:player.y+Math.sin(a)*ASTRAL.cloneRadius,hp:s.maxHp*ASTRAL.cloneHpShare,angle:a});}
  return true;
}
function finish(s){s.previousForm=s.form;s.morphStart=s.clock;s.move=null;s.form='worm';s.flightLiftExtra=0;s.recovery=ASTRAL.recovery;s.clones=[];s.hazards=[];s.blobs=[];}
function tickInk(s,w) {
  const t=s.elapsed,a=ASTRAL.inkWarning,b=a+ASTRAL.inkOutbound,c=b+ASTRAL.inkSplat,end=c+ASTRAL.inkRecall;
  if(t>=end){finish(s);return;}
  const phase=t<a?'warning':t<b?'outbound':t<c?'splat':'recall',start=phase==='warning'?0:phase==='outbound'?a:phase==='splat'?b:c,
    duration=phase==='warning'?a:phase==='outbound'?ASTRAL.inkOutbound:phase==='splat'?ASTRAL.inkSplat:ASTRAL.inkRecall,progress=Math.max(0,Math.min(1,(t-start)/duration));
  // Only our own three descriptors are serialized, never scene actors, projectiles or persistent ink.
  if(s.blobs.length!==ASTRAL.inkCount)s.blobs=createInkBlobs(s);
  for(const blob of s.blobs){
    blob.phase=phase;blob.progress=progress;
    // Heights are measured in world tiles but RELATIVE to the terrain at the blob's current point.
    // Keep source/landing absolute heights in JSON so pause and reload do not reset a flight arc.
    blob.originGround??=groundHeight(w,s.center);blob.targetGround??=groundHeight(w,blob.target);
    if(phase==='warning')blob.height=blob.originGround+blob.originHeight-groundHeight(w,blob);
    if(phase==='outbound'&&!blob.blocked){
      const x=blob.origin.x+(blob.target.x-blob.origin.x)*progress,y=blob.origin.y+(blob.target.y-blob.origin.y)*progress;
      if((w.canBlobOccupy?w.canBlobOccupy(blob,x,y):w.canOccupy(x,y,s.form))){blob.x=x;blob.y=y;blob.height=(blob.originGround+blob.originHeight)*(1-progress)+blob.targetGround*progress+Math.sin(Math.PI*progress)*ASTRAL.inkArc-groundHeight(w,blob);}
      else blob.blocked=true;
    }
    if(phase==='splat'){
      // Check the actual landing before enabling damage, including when a frame skips the last
      // outbound position. Recheck each active substep so changed terrain cannot leave a live splat.
      if(!blob.blocked&&(w.canBlobOccupy?w.canBlobOccupy(blob,blob.target.x,blob.target.y):w.canOccupy(blob.target.x,blob.target.y,s.form))){blob.x=blob.target.x;blob.y=blob.target.y;}
      else blob.blocked=true;
      blob.height=0;blob.radius=ASTRAL.inkRadius+ASTRAL.inkSpread*progress;
    }
    if(phase==='recall'){
      const origin=astralInkOrigin(s);blob.returnFrom??={x:blob.x,y:blob.y};blob.returnGround??=groundHeight(w,blob.returnFrom);
      blob.x=blob.returnFrom.x+(origin.x-blob.returnFrom.x)*progress;blob.y=blob.returnFrom.y+(origin.y-blob.returnFrom.y)*progress;
      blob.height=blob.returnGround*(1-progress)+(groundHeight(w,s)+origin.height)*progress-groundHeight(w,blob);blob.radius=(ASTRAL.inkRadius+ASTRAL.inkSpread)*(1-progress);
    }
    if(phase!=='recall'&&!blob.blocked)s.hazards.push(hazard(s,blob.target.x,blob.target.y,0,phase==='splat'?blob.radius:ASTRAL.inkRadius+ASTRAL.inkSpread,phase==='splat',ASTRAL.inkShare));
  }
}
// w.player uses the game's ordinary invulnerability/hit checks in damagePlayer. Return ACTUAL HP removed,
// not requested damage, so dodging, armour, death and shields never yield free healing. canOccupy also
// validates line-of-travel via these <=1/60 active-time movement steps. All terrain policy stays in adapter.
export function tickAstral(s,dt,w) {
  if(!Number.isFinite(dt)||dt<0||dt>ASTRAL.maxFrame)throw new Error('Astral tick expects 0..0.25 active seconds');
  if(w.paused||w.unloaded||s.terminated)return;
  if(s.hp<=0||(w.playerDeathFinal?w.playerDeathFinal():w.player.hp<=0)){endAstral(s);return;}
  if(w.bystander&&!(w.bystander.actor?.hp>0))w={...w,bystander:null};
  if(dt>0)ensureAstralGeometry(s);
  const n=Math.ceil(dt/ASTRAL.maxStep);for(let i=0;i<n;i++){if(s.terminated)break;step(s,dt/n,w);}
}
function clearFlightGround(s,w) {
  const at=astralBeamAnchors(s).ground,g=ASTRAL_GEOMETRY;
  s.flightLiftExtra=Math.max(0,groundHeight(w,at)-groundHeight(w,s)+g.minBeamDrop-(g.flightLift-g.mouthY*g.drawScale)*s.scale);
  return at;
}
function step(s,dt,w) {
  const p=w.player;s.clock+=dt;
  if(!s.move){s.recovery-=dt;faceTarget(s,p);moveToward(s,p,ASTRAL.speed,dt,w);if(s.recovery<=0){startAstralMove(s,ASTRAL_MOVES[Math.floor(random(s)*ASTRAL_MOVES.length)],p);if(s.form==='flight')clearFlightGround(s,w);}return;}
  s.elapsed+=dt;s.hitClock-=dt;s.hazards=[];const t=s.elapsed,active=t>=ASTRAL.windup;
  if(s.move==='pool') {s.hazards=[hazard(s,s.x,s.y,0,ASTRAL.poolRadius,active)];if(t>ASTRAL.windup+ASTRAL.poolLife){finish(s);return;}}
  if(s.move==='trample'){if(active)moveToward(s,s.target,ASTRAL.trampleSpeed,dt,w);s.hazards=[hazard(s,s.x,s.y,0,ASTRAL.trampleRadius,active)];if(t>ASTRAL.windup+ASTRAL.trampleLife){finish(s);return;}}
  if(s.move==='bite'){moveToward(s,p,ASTRAL.speed,dt,w);const phase=(t-ASTRAL.windup)%ASTRAL.biteGap;s.hazards=[hazard(s,s.x,s.y,0,ASTRAL.biteRadius,active&&phase<ASTRAL.biteActive)];if(t>ASTRAL.windup+ASTRAL.biteCount*ASTRAL.biteGap){finish(s);return;}}
  if(s.move==='flight'){
    const before=astralBeamAnchors(s).ground;moveToward(s,{x:p.x-(before.x-s.x),y:p.y-(before.y-s.y)},ASTRAL.speed*ASTRAL.flightPursuit,dt,w);
    const at=clearFlightGround(s,w);
    s.hazards=[hazard(s,at.x,at.y,0,ASTRAL.beamRadius,active,ASTRAL.beamShare)];if(t>ASTRAL.windup+ASTRAL.beamLife){finish(s);return;}}
  if(ASTRAL_INK_FORMS[s.move]){tickInk(s,w);if(!s.move)return;}
  if(s.move==='griffin'){
    const phase=t%ASTRAL.pounceGap, jumping=phase>=ASTRAL.pounceWindup&&phase<ASTRAL.pounceWindup+ASTRAL.pounceActive;
    if(phase<ASTRAL.pounceWindup)s.target={x:p.x,y:p.y};if(jumping)moveToward(s,s.target,ASTRAL.pounceSpeed,dt,w);
    s.hazards=[hazard(s,jumping?s.x:s.target.x,jumping?s.y:s.target.y,0,ASTRAL.biteRadius,jumping)];if(t>ASTRAL.griffinLife){finish(s);return;}}
  if(s.move==='rings'){
    const span=ASTRAL.ringWarning+ASTRAL.ringActive+ASTRAL.ringGap,index=Math.floor(t/span);s.ringIndex=index;
    if(index>=s.ringSequence.length){finish(s);return;}const band=s.ringSequence[index],phase=t%span,outer=band*ASTRAL.ringSpacing+ASTRAL.ringWidth;
    if(phase<ASTRAL.ringWarning+ASTRAL.ringActive)s.hazards=[hazard(s,s.center.x,s.center.y,Math.max(ASTRAL.ringInner,outer-ASTRAL.ringWidth),outer,phase>=ASTRAL.ringWarning)];
  }
  if(s.move==='mirage'){
    // Entire ring has bounded lag, not perfect per-clone homing. A fast dodge can leave it geometrically.
    moveToward(s.center,p,ASTRAL.cloneTrackSpeed,dt,{canOccupy:()=>true});
    s.clones=s.clones.filter(c=>{const x=s.center.x+Math.cos(c.angle)*ASTRAL.cloneRadius,y=s.center.y+Math.sin(c.angle)*ASTRAL.cloneRadius;if(w.canCloneOccupy&&!w.canCloneOccupy(c,x,y))return false;c.x=x;c.y=y;return true;});
    if(astralEncloses(s.clones,p))s.enclosed+=dt;else s.enclosed=0;
    if(s.enclosed>=ASTRAL.cloneGrace&&s.hitClock<=0){const actual=w.damagePlayer(s.damage*ASTRAL.drainShare,{kind:'astralDrain'});s.hp=Math.min(s.maxHp,s.hp+Math.max(0,Math.min(s.damage*ASTRAL.drainShare,Number(actual)||0)));s.hitClock=ASTRAL.cloneTick;}
    if(t>ASTRAL.cloneLife){finish(s);return;}
  } else if(s.hitClock<=0){const hit=s.hazards.find(h=>h.active&&astralHazardContains(h,p)&&(!w.canHazardHit||w.canHazardHit(h,p)));if(hit){w.damagePlayer(s.damage*hit.share,{kind:`astral:${s.move}`});s.hitClock=s.move==='flight'?ASTRAL.beamTick:ASTRAL.hitGap;}}
  // Free-for-all: whoever is not the current focus is still hurt when caught in an active hazard, on its own clock.
  const b=w.bystander;if(b&&s.move!=='mirage'){s.bystanderClock=(Number(s.bystanderClock)||0)-dt;
    if(s.bystanderClock<=0){const hit=s.hazards.find(h=>h.active&&astralHazardContains(h,b.actor)&&(!w.canHazardHit||w.canHazardHit(h,b.actor)));if(hit){b.hurt(s.damage*hit.share,{kind:`astral:${s.move}`});s.bystanderClock=s.move==='flight'?ASTRAL.beamTick:ASTRAL.hitGap;}}}
  if((w.playerDeathFinal?w.playerDeathFinal():p.hp<=0)||s.hp<=0)endAstral(s);
}

// Production actor adapter, shared by fixtures and registered natural hunts.
// Encounter selection and world-beast lifecycle remain owned by the host.
export function updateAstralActor(e,w) {
  if(w.paused||w.unloaded||!(w.dt>0))return;
  if (e.kind === 'astralMirage') {
    const owner=w.enemies.find(q=>q.id===e.astralOwner&&!q.dead&&q.hp>0);
    if(!owner || !owner.astral?.clones.some(c=>c.id===e.id)) {e.hp=0;e.dead=true;}
    return;
  }
  const s=e.astral ||= createAstralState({x:e.x,y:e.y,hp:e.maxHp,damage:e.damage,seed:e.astralSeed||1,namespace:e.id,facingX:e.facingX,scale:e.scale});
  if(e.dead||e.hp<=0||e.retreating||e.fleeTo){if(e.hp<=0)e.dead=true;endAstral(s);for(const c of w.enemies)if(c.astralOwner===e.id){c.hp=0;c.dead=true;}return;}
  const sight=w.astralLos||w.los;
  if(!e.aggro&&w.player.hp>0&&(!sight||sight(e,w.player)))e.aggro=true;
  if(!e.aggro)return;
  s.x=e.x;s.y=e.y;s.hp=e.hp;s.maxHp=e.maxHp;s.damage=e.damage;
  if(!s.move||!Number.isFinite(s.facingX))s.facingX=facingSign(e);
  s.scale=actorScale(e);
  for(const c of s.clones){const actor=w.enemies.find(a=>a.id===c.id);if(actor)c.hp=actor.dead?0:Math.min(c.hp,actor.hp);}
  s.clones=s.clones.filter(c=>c.hp>0);
  const canOccupy=(x,y)=>{const probe={...e,x:s.x,y:s.y,flying:true};w.move(probe,x-s.x,y-s.y);return Math.abs(probe.x-x)<1e-6&&Math.abs(probe.y-y)<1e-6;};
  // A helping Walker draws the Worm's attention from time to time (ASTRAL_ALLY_FOCUS); otherwise the Worm hunts the player.
  // The one it is not focused on is still hurt by any active hazard it stands in.
  const ally=w.enemies.find(q=>q.astralAllyOf===e.id&&q.kind==='voidWalker'&&!q.dead&&q.hp>0&&!q.astralAllyLeaving);
  const F=ASTRAL_ALLY_FOCUS;s.focusClock=(Number(s.focusClock)||0)-w.dt;
  if(!ally)s.focusAlly=false;
  else if(s.focusClock<=0){s.focusIndex=(Number(s.focusIndex)||0)+1;s.focusAlly=(hashSeed(`${e.id}:ally-focus:${s.focusIndex}`)%1000)/1000<F.allyShare;s.focusClock=s.focusAlly?F.allyTime:F.playerTime;}
  const realDeath=()=>w.playerDeathFinal?w.playerDeathFinal():w.player.hp<=0;
  const hurtAlly=(amount,source)=>{if(!ally||ally.dead||!(amount>0))return 0;const before=ally.hp;w.hurtAlly?w.hurtAlly(e,ally,amount,source):(ally.hp=Math.max(0,ally.hp-amount),ally.hp<=0&&(ally.dead=true));return Math.max(0,before-Math.max(0,ally.hp));};
  const hurtPlayer=(amount,source)=>{
    if(w.now<(w.player.dodgeUntil||0))return 0;const before=Math.max(0,w.player.hp);
    w.hurt(e,amount,{beam:s.move==='flight',source:source.kind});const actual=Math.max(0,before-Math.max(0,w.player.hp));
    if(source.kind==='astralDrain'&&w.deferAstralHeal){w.deferAstralHeal(e,Math.min(amount,actual));return 0;}
    return actual;
  };
  const focusAlly=!!(ally&&s.focusAlly);
  tickAstral(s,w.dt,{player:focusAlly?ally:w.player,playerDeathFinal:realDeath,bystander:ally?{actor:focusAlly?w.player:ally,hurt:focusAlly?hurtPlayer:hurtAlly}:null,groundHeight:w.groundHeight,canOccupy,
    canBlobOccupy:(blob,x,y)=>{const probe={...e,x:blob.x,y:blob.y,flying:true};w.move(probe,x-blob.x,y-blob.y);
      return Math.abs(probe.x-x)<1e-6&&Math.abs(probe.y-y)<1e-6&&(!sight||sight({x:s.x,y:s.y},{x,y}));},
    canHazardHit:(h,p)=>!(s.move==='flight'||ASTRAL_INK_FORMS[s.move])||(canOccupy(h.x,h.y)&&(!sight||(sight({x:s.x,y:s.y},h)&&sight(h,p)))),
    canCloneOccupy:(c,x,y)=>{
    const actor=w.enemies.find(a=>a.id===c.id);
    if(!actor)return w.enemies.length<ASTRAL.maxActorArray&&canOccupy(x,y)&&(!(w.astralLos||w.los)||(w.astralLos||w.los)(w.player,{x,y}));
    const probe={...actor,x:c.x,y:c.y};w.move(probe,x-c.x,y-c.y);
    return Math.abs(probe.x-x)<1e-6&&Math.abs(probe.y-y)<1e-6;
  },damagePlayer:(amount,source)=>focusAlly?hurtAlly(amount,source):hurtPlayer(amount,source)});
  e.x=s.x;e.y=s.y;e.hp=s.hp;e.flying=true;e.facingX=s.facingX;if(e.pack)e.pack.attack=s.move?`astral:${s.move}`:null;
  for(const c of [...s.clones]){
    let actor=w.enemies.find(a=>a.id===c.id);
    if(!actor){
      // Conservative total-array cap and footprint check: never evict unrelated actors to make a ring.
      if(w.enemies.length>=ASTRAL.maxActorArray||!canOccupy(c.x,c.y)||((w.astralLos||w.los)&&!(w.astralLos||w.los)(w.player,c))){s.clones=s.clones.filter(q=>q.id!==c.id);continue;}
      actor=w.spawnMinion(e,'astralMirage',c.x,c.y,Number(c.id.split(':').at(-1)));
      Object.assign(actor,{id:c.id,astralOwner:e.id,noRewards:true,astralEncounterId:e.id,hp:c.hp,maxHp:c.hp,damage:0,aggro:true});
    }
    const probe={...actor};w.move(probe,c.x-actor.x,c.y-actor.y);
    if(Math.abs(probe.x-c.x)>1e-6||Math.abs(probe.y-c.y)>1e-6){actor.hp=0;actor.dead=true;s.clones=s.clones.filter(q=>q.id!==c.id);continue;}
    actor.x=c.x;actor.y=c.y;actor.hp=c.hp;
  }
  for(const actor of w.enemies)if(actor.astralOwner===e.id&&!s.clones.some(c=>c.id===actor.id)){actor.hp=0;actor.dead=true;}
}

// Natural-integration planning adapter. Pure: it does not enroll an encounter, mutate journeys,
// claim a Walker, pay rewards, or bypass the reviewed shared world-beast lifecycle.
// Host supplies deterministic rolls and its final-r251 footprint/terrain predicate.
// Owner rule 2026-10-21: with a helping Walker the Worm mostly hunts the player but turns on him from time to time.
export const ASTRAL_ALLY_FOCUS = Object.freeze({ allyShare: .3, allyTime: 3, playerTime: 6 });
export const ASTRAL_SPAWN = Object.freeze({ maxSamples:625, playerClearance:6, margin:1, dungeonChance:.02 });
export function planAstralEncounter(context, host) {
  const {map,area='overworld',depth=0,spawnRoll,pairRoll,questingPresent=false,otherBeastPresent=false,walkerAvailable=false,player,encounterId}=context;
  if(!map?.tiles?.length||map.settlement||questingPresent||otherBeastPresent||depth<ASTRAL_PROFILE.minDepth||!encounterId)return null;
  if(area!=='overworld'&&!(area==='dungeon'&&context.ordinaryDungeon===true))return null;
  const chance=area==='dungeon'?ASTRAL_SPAWN.dungeonChance:ASTRAL_PROFILE.chance;
  if(!Number.isFinite(spawnRoll)||spawnRoll<0||spawnRoll>=chance||!player||typeof host?.canSpawn!=='function')return null;
  const width=Math.max(1,Number(map.width)||32),height=Math.floor(map.tiles.length/width),stride=Math.max(1,Math.ceil(map.tiles.length/ASTRAL_SPAWN.maxSamples));
  let location=null,samples=0;
  // Stable finite scan. The host's deterministic roll chooses the starting offset, not Math.random.
  const offset=Math.floor(spawnRoll/chance*stride);
  for(let index=offset;index<map.tiles.length&&samples<ASTRAL_SPAWN.maxSamples;index+=stride){samples++;const x=index%width,y=Math.floor(index/width);
    if(x<ASTRAL_SPAWN.margin||y<ASTRAL_SPAWN.margin||x>=width-1||y>=height-1||distance({x,y},player)<ASTRAL_SPAWN.playerClearance)continue;
    if(host.canSpawn(x,y,{kind:'astralWorm',aboveWater:true})){location={x,y};break;}
  }
  if(!location)return null;
  const alignment=astralWalkerPair(pairRoll,{questingPresent,otherBeastPresent,walkerAvailable});
  return {v:1,encounterId,main:{id:`${encounterId}:worm`,kind:'astralWorm',worldBeast:'astralWorm',...location},
    companion:alignment?{kind:'voidWalker',id:`${encounterId}:walker`,alignment,reservationRequired:true}:null,
    sampledTiles:samples,profile:ASTRAL_PROFILE};
}
// Host persists this additive record only after BOTH placement and any Walker reservation succeed.
// It is encounter ownership, not a second attempt counter; shared Gate lifecycle owns all failures.
export function astralOwnership(plan,sceneKey,prior={}) {
  if(!plan?.main||!sceneKey)throw new Error('Astral ownership requires an accepted plan and scene');
  return {...prior,v:1,encounterId:plan.encounterId,sceneKey,wormId:plan.main.id,walkerId:plan.companion?.id||null,
    alignment:plan.companion?.alignment||null,rewardClaimed:prior.rewardClaimed===true,ended:false};
}
export function astralOwnershipActions(record,context) {
  if(!record||record.ended)return {type:'none',hostileKinds:[],companionReward:false};
  const hostileKinds=record.alignment==='hostile'?['astralWorm','voidWalker']:['astralWorm'];
  if(context.sceneKey!==record.sceneKey||context.unloaded)return {type:'suspend',hostileKinds,clearTransientEffects:true,companionReward:false};
  if(context.wormDead)return {type:'finish',hostileKinds,departCompanion:record.alignment==='ally',releaseHostileToSharedLifecycle:record.alignment==='hostile',claimMainReward:!record.rewardClaimed,companionReward:false};
  if(context.playerDead)return {type:'player-fell',hostileKinds,resetLivingMainHp:true,clearAstralRuntime:true,
    departCompanion:record.alignment==='ally'||context.attemptsExhausted===true,companionReward:false};
  if(context.retreating||context.attemptsExhausted)return {type:'leave',hostileKinds,departCompanion:true,clearTransientEffects:true,companionReward:false};
  return {type:'continue',hostileKinds,companionReward:false};
}
