// Isolated, source-only prototype. Not registered in production until final r251/Gate integration.
// All numbers are provisional design proposals, not owner-specified balance.
export const ASTRAL = Object.freeze({
  name: 'Astral Worm', version: 1, speed: 3.4, travelSeconds: .9, maxStep: 1 / 60, maxFrame: .25,
  windup: .65, recovery: .65, morphTime: .35, cloneCount: 4, cloneHpShare: .12, cloneLife: 7,
  cloneRadius: 2.8, cloneTrackSpeed: 1.05, cloneGrace: 1.4, cloneTick: .4, drainShare: .12,
  beamRadius: .9, beamLife: 3.5, beamTick: .25, beamShare: .15,
  poolRadius: 2.8, poolLife: .5, biteRadius: 1.3, biteCount: 3, biteGap: .55, biteActive: .12, hitGap: .3, flightPursuit: .7, maxActorArray: 32,
  trampleRadius: .85, trampleLife: 1.4, trampleSpeed: 5.5,
  griffinLife: 5, pounceGap: 1.15, pounceWindup: .55, pounceActive: .4, pounceSpeed: 7,
  ringCount: 4, ringWidth: .85, ringSpacing: 1.2, ringWarning: .6, ringActive: .16, ringGap: .22,
  hostileWalkerChance: .025, allyWalkerChance: .005, maxCompanions: 1,
});
// Register only on the reviewed Gate baseline: inherits its strength floor, retries and Questing dominance.
export const ASTRAL_PROFILE = Object.freeze({ kind: 'astralWorm', name: 'The Astral Worm', chance: .02,
  minDepth: 5, tries: 3, cooldownSlain: 20, cooldownEscaped: 26, hitsToKill: 64, hpPerLevel: 30,
  damageShare: .24, speed: 1.35, attackGap: .2, staggerResistance: .95, rewardMarks: 190, rewardPerLevel: 18,
  patience: 180, home: 'wayglass', retreatMoves: 'astral-wayglass',
  flee: 'The Astral Worm draws its limbs into ink and turns toward the nearest reachable Wayglass.',
  homeLine: 'The Astral Worm pools beneath the Wayglass and slips from sight.',
  arrive: 'Black ink hangs above the ground. The Astral Worm unfolds.',
  slain: 'The Astral Worm loses its shape and falls still.',
  gone: 'The Astral Worm has had its fill. Its ink fades from the hunt.' });
export const ASTRAL_MOVES = ['pool', 'trample', 'bite', 'flight', 'mirage', 'griffin', 'rings'];
export const ASTRAL_RING_MODES = ['outward', 'inward', 'outward-inward', 'inward-outward'];
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function random(s) { s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0; return s.rng / 4294967296; }
export function astralRingSequence(mode) {
  if (!ASTRAL_RING_MODES.includes(mode)) throw new Error('Unknown Astral ring mode');
  const out = Array.from({length:ASTRAL.ringCount},(_,i)=>i), into = [...out].reverse();
  return mode === 'outward' ? out : mode === 'inward' ? into : mode === 'outward-inward' ? [...out,...into] : [...into,...out];
}
export function createAstralState({x=0,y=0,hp=1400,damage=60,seed=1,namespace='prototype'}={}) {
  if (![x,y,hp,damage,seed].every(Number.isFinite) || hp<=0 || damage<=0) throw new Error('Invalid Astral initial state');
  return {v:1,namespace,x,y,hp,maxHp:hp,damage,rng:seed>>>0,clock:0,form:'worm',previousForm:'worm',morphStart:0,move:null,elapsed:0,recovery:ASTRAL.travelSeconds,
    hitClock:0,cast:0,clones:[],hazards:[],ringMode:'outward',ringSequence:[],ringIndex:0,center:{x,y},target:{x,y},enclosed:0,terminated:false};
}
// State is JSON-only and uses active-time offsets. Caller stores it verbatim in existing actor snapshot.
// No wall clock, global timers, external RNG, reward mutation, or unloaded simulation.
export function snapshotAstral(s) { return JSON.parse(JSON.stringify(s)); }
export function endAstral(s) { s.terminated=true;s.move=null;s.form='worm';s.clones=[];s.hazards=[]; }
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
export function startAstralMove(s,move,player,ringMode) {
  if(!ASTRAL_MOVES.includes(move)||s.terminated||s.hp<=0)return false;
  s.previousForm=s.form;s.morphStart=s.clock;s.move=move;s.form=move==='mirage'||move==='rings'?'worm':move;s.elapsed=0;s.hitClock=0;s.cast++;s.hazards=[];s.clones=[];s.enclosed=0;
  s.center={x:s.x,y:s.y};s.target={x:player.x,y:player.y};
  if(move==='rings'){s.ringMode=ringMode??ASTRAL_RING_MODES[Math.floor(random(s)*4)];s.ringSequence=astralRingSequence(s.ringMode);s.ringIndex=0;}
  if(move==='mirage')s.center={x:player.x,y:player.y};
  if(move==='mirage')for(let i=0;i<ASTRAL.cloneCount;i++){const a=i*Math.PI*2/ASTRAL.cloneCount;s.clones.push({id:`${s.namespace}:astral-mirage:${s.cast}:${i}`,x:player.x+Math.cos(a)*ASTRAL.cloneRadius,y:player.y+Math.sin(a)*ASTRAL.cloneRadius,hp:s.maxHp*ASTRAL.cloneHpShare,angle:a});}
  return true;
}
function finish(s){s.previousForm=s.form;s.morphStart=s.clock;s.move=null;s.form='worm';s.recovery=ASTRAL.recovery;s.clones=[];s.hazards=[];}
// w.player uses the game's ordinary invulnerability/hit checks in damagePlayer. Return ACTUAL HP removed,
// not requested damage, so dodging, armour, death and shields never yield free healing. canOccupy also
// validates line-of-travel via these <=1/60 active-time movement steps. All terrain policy stays in adapter.
export function tickAstral(s,dt,w) {
  if(!Number.isFinite(dt)||dt<0||dt>ASTRAL.maxFrame)throw new Error('Astral tick expects 0..0.25 active seconds');
  if(w.paused||w.unloaded||s.terminated)return;
  if(s.hp<=0||w.player.hp<=0){endAstral(s);return;}
  const n=Math.ceil(dt/ASTRAL.maxStep);for(let i=0;i<n;i++){if(s.terminated)break;step(s,dt/n,w);}
}
function step(s,dt,w) {
  const p=w.player;s.clock+=dt;
  if(!s.move){s.recovery-=dt;moveToward(s,p,ASTRAL.speed,dt,w);if(s.recovery<=0)startAstralMove(s,ASTRAL_MOVES[Math.floor(random(s)*ASTRAL_MOVES.length)],p);return;}
  s.elapsed+=dt;s.hitClock-=dt;s.hazards=[];const t=s.elapsed,active=t>=ASTRAL.windup;
  if(s.move==='pool') {s.hazards=[hazard(s,s.x,s.y,0,ASTRAL.poolRadius,active)];if(t>ASTRAL.windup+ASTRAL.poolLife){finish(s);return;}}
  if(s.move==='trample'){if(active)moveToward(s,s.target,ASTRAL.trampleSpeed,dt,w);s.hazards=[hazard(s,s.x,s.y,0,ASTRAL.trampleRadius,active)];if(t>ASTRAL.windup+ASTRAL.trampleLife){finish(s);return;}}
  if(s.move==='bite'){moveToward(s,p,ASTRAL.speed,dt,w);const phase=(t-ASTRAL.windup)%ASTRAL.biteGap;s.hazards=[hazard(s,s.x,s.y,0,ASTRAL.biteRadius,active&&phase<ASTRAL.biteActive)];if(t>ASTRAL.windup+ASTRAL.biteCount*ASTRAL.biteGap){finish(s);return;}}
  if(s.move==='flight'){moveToward(s,p,ASTRAL.speed*ASTRAL.flightPursuit,dt,w);s.hazards=[hazard(s,s.x,s.y,0,ASTRAL.beamRadius,active,ASTRAL.beamShare)];if(t>ASTRAL.windup+ASTRAL.beamLife){finish(s);return;}}
  if(s.move==='griffin'){
    const phase=t%ASTRAL.pounceGap, jumping=phase>=ASTRAL.pounceWindup&&phase<ASTRAL.pounceWindup+ASTRAL.pounceActive;
    if(phase<ASTRAL.pounceWindup)s.target={x:p.x,y:p.y};if(jumping)moveToward(s,s.target,ASTRAL.pounceSpeed,dt,w);
    s.hazards=[hazard(s,jumping?s.x:s.target.x,jumping?s.y:s.target.y,0,ASTRAL.biteRadius,jumping)];if(t>ASTRAL.griffinLife){finish(s);return;}}
  if(s.move==='rings'){
    const span=ASTRAL.ringWarning+ASTRAL.ringActive+ASTRAL.ringGap,index=Math.floor(t/span);s.ringIndex=index;
    if(index>=s.ringSequence.length){finish(s);return;}const band=s.ringSequence[index],phase=t%span,outer=band*ASTRAL.ringSpacing+ASTRAL.ringWidth;
    if(phase<ASTRAL.ringWarning+ASTRAL.ringActive)s.hazards=[hazard(s,s.center.x,s.center.y,band===0?0:outer-ASTRAL.ringWidth,outer,phase>=ASTRAL.ringWarning)];
  }
  if(s.move==='mirage'){
    // Entire ring has bounded lag, not perfect per-clone homing. A fast dodge can leave it geometrically.
    moveToward(s.center,p,ASTRAL.cloneTrackSpeed,dt,{canOccupy:()=>true});
    s.clones=s.clones.filter(c=>{const x=s.center.x+Math.cos(c.angle)*ASTRAL.cloneRadius,y=s.center.y+Math.sin(c.angle)*ASTRAL.cloneRadius;if(w.canCloneOccupy&&!w.canCloneOccupy(c,x,y))return false;c.x=x;c.y=y;return true;});
    if(astralEncloses(s.clones,p))s.enclosed+=dt;else s.enclosed=0;
    if(s.enclosed>=ASTRAL.cloneGrace&&s.hitClock<=0){const actual=w.damagePlayer(s.damage*ASTRAL.drainShare,{kind:'astralDrain'});s.hp=Math.min(s.maxHp,s.hp+Math.max(0,Math.min(s.damage*ASTRAL.drainShare,Number(actual)||0)));s.hitClock=ASTRAL.cloneTick;}
    if(t>ASTRAL.cloneLife){finish(s);return;}
  } else if(s.hitClock<=0){const hit=s.hazards.find(h=>h.active&&astralHazardContains(h,p));if(hit){w.damagePlayer(s.damage*hit.share,{kind:`astral:${s.move}`});s.hitClock=s.move==='flight'?ASTRAL.beamTick:ASTRAL.hitGap;}}
  if(p.hp<=0||s.hp<=0)endAstral(s);
}

// Thin production-system fixture adapter. Does not spawn natural hunts or own world-beast lifecycle.
export function updateAstralActor(e,w) {
  if (e.kind === 'astralMirage') {
    const owner=w.enemies.find(q=>q.id===e.astralOwner&&!q.dead&&q.hp>0);
    if(!owner || !owner.astral?.clones.some(c=>c.id===e.id)) {e.hp=0;e.dead=true;}
    return;
  }
  const s=e.astral ||= createAstralState({x:e.x,y:e.y,hp:e.maxHp,damage:e.damage,seed:e.astralSeed||1,namespace:e.id});
  if(e.dead||e.hp<=0||e.retreating||e.fleeTo){if(e.hp<=0)e.dead=true;endAstral(s);for(const c of w.enemies)if(c.astralOwner===e.id){c.hp=0;c.dead=true;}return;}
  s.x=e.x;s.y=e.y;s.hp=e.hp;s.maxHp=e.maxHp;s.damage=e.damage;
  for(const c of s.clones){const actor=w.enemies.find(a=>a.id===c.id);if(actor)c.hp=actor.dead?0:Math.min(c.hp,actor.hp);}
  s.clones=s.clones.filter(c=>c.hp>0);
  const canOccupy=(x,y)=>{const probe={...e,x:s.x,y:s.y,flying:true};w.move(probe,x-s.x,y-s.y);return Math.abs(probe.x-x)<1e-6&&Math.abs(probe.y-y)<1e-6;};
  tickAstral(s,w.dt,{player:w.player,canOccupy,canCloneOccupy:(c,x,y)=>{
    const actor=w.enemies.find(a=>a.id===c.id);
    if(!actor)return w.enemies.length<ASTRAL.maxActorArray&&canOccupy(x,y)&&(!w.los||w.los(w.player,{x,y}));
    const probe={...actor,x:c.x,y:c.y};w.move(probe,x-c.x,y-c.y);
    return Math.abs(probe.x-x)<1e-6&&Math.abs(probe.y-y)<1e-6;
  },damagePlayer:(amount,source)=>{
    if(w.now<(w.player.dodgeUntil||0))return 0;const before=Math.max(0,w.player.hp);
    w.hurt(e,amount,{beam:s.move==='flight',source:source.kind});return Math.max(0,before-Math.max(0,w.player.hp));
  }});
  e.x=s.x;e.y=s.y;e.hp=s.hp;e.flying=true;if(e.pack)e.pack.attack=s.move?`astral:${s.move}`:null;
  for(const c of [...s.clones]){
    let actor=w.enemies.find(a=>a.id===c.id);
    if(!actor){
      // Conservative total-array cap and footprint check: never evict unrelated actors to make a ring.
      if(w.enemies.length>=ASTRAL.maxActorArray||!canOccupy(c.x,c.y)||(w.los&&!w.los(w.player,c))){s.clones=s.clones.filter(q=>q.id!==c.id);continue;}
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
