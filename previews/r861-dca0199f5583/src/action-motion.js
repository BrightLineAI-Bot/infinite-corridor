export const ACTION_MOTION = Object.freeze({
  meleeMs: 240,
  toolMs: 180,
  castMs: 360,
  attackBufferMs: 120,
  monsterStrikeMs: 240,
  monsterContact: .16,
});

export const CLOSE_VIEW_MELEE_TIMING = Object.freeze({
  cleaver: Object.freeze({ durationMs: 360, contactMs: 75 }),
  dash: Object.freeze({ durationMs: 320, contactMs: 60 }),
  jab: Object.freeze({ durationMs: 210, contactMs: 35 }),
  uppercut: Object.freeze({ durationMs: 380, contactMs: 72 }),
});
const MELEE_ACTION_KINDS=Object.freeze(['verge-cleaver','iron-fists']);
const MELEE_ACTION_MOVES=Object.freeze(['cleaver','dash','jab','uppercut']);
export function normalizeMeleeActionVisual(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const v=Number(raw.v);
  if(Number.isInteger(v)&&v>1)return{...raw};
  const timing=CLOSE_VIEW_MELEE_TIMING[raw.move],contactMs=Number(raw.contactMs),durationMs=Number(raw.durationMs);
  if(v!==1||!MELEE_ACTION_KINDS.includes(raw.kind)||!MELEE_ACTION_MOVES.includes(raw.move)||!timing||
    !Number.isFinite(contactMs)||!Number.isFinite(durationMs)||durationMs!==timing.durationMs||
    contactMs<1||contactMs>timing.contactMs||contactMs>durationMs)return null;
  if((raw.kind==='verge-cleaver')!==(raw.move==='cleaver'))return null;
  return{...raw,v:1,kind:raw.kind,move:raw.move,contactMs,durationMs};
}
export function sampleMeleeActionContact(record,elapsedMs){
  const action=normalizeMeleeActionVisual(record?.meleeAction);if(!action||action.v!==1)return null;
  const elapsed=Math.max(0,Math.min(action.durationMs,Number(elapsedMs)||0));
  return{...action,elapsedMs:elapsed,phase:elapsed<action.contactMs?'startup':elapsed===action.contactMs?'contact':'recovery',released:elapsed>=action.contactMs,contactAgeMs:Math.max(0,elapsed-action.contactMs)};
}

export const ATTACK_VISUAL_PROFILES = Object.freeze([
  "melee", "fist", "emitter", "hammer", "sweep", "mirage", "orrery-tap", "orrery-release",
]);
const ATTACK_VISUAL_PROFILE = /^[a-z][a-z0-9-]{0,31}$/;
export const PRIMARY_VISUAL_KINDS = Object.freeze(["salvage-blade", "cinder-pike", "verge-cleaver"]);
// Geometry identity only: these immediate tools do not join delayed startup,
// action motion, muzzle ownership or native form recipe membership.
export function simpleToolAppearanceKind(weapon) {
  return weapon?.name==='Spark Coil'?'spark-coil':weapon?.name==='Needle Caster'?'needle-caster':null;
}
export function importedEmitterAppearance(record, weapon, active = false) {
  if(!active)return simpleToolAppearanceKind(weapon)||'emitter';
  const appearance=record?.toolAppearance;
  return record?.profile==='emitter'&&record.toolKind==null&&appearance&&typeof appearance==='object'&&!Array.isArray(appearance)&&
    appearance.v===1&&(appearance.kind==='spark-coil'||appearance.kind==='needle-caster')?appearance.kind:'emitter';
}
export const TOOL_VISUAL_KINDS = Object.freeze(["rift-bombard", "great-sweep", "blunderbuss", "lumen-spindle"]);
export const TOOL_ACTION_TIMING = Object.freeze({
  "rift-bombard": Object.freeze({ durationMs:720, raiseMs:120, holdMs:520 }),
  blunderbuss: Object.freeze({ durationMs:640, raiseMs:100, holdMs:460 }),
  "lumen-spindle": Object.freeze({ durationMs:760, raiseMs:100, holdMs:560 }),
  "great-sweep": Object.freeze({ durationMs:840, raiseMs:40, holdMs:600 }),
});
export const TOOL_USE_STARTUP_MS = Object.freeze({
  "rift-bombard":120, blunderbuss:100, "lumen-spindle":100, "great-sweep":160,
});
const TOOL_USE_BASE_COOLDOWN = Object.freeze({"rift-bombard":360,blunderbuss:360,"lumen-spindle":360,"great-sweep":1000});
const TOOL_USE_KINDS=Object.freeze(Object.keys(TOOL_USE_STARTUP_MS));
const finiteObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const validUseId=v=>typeof v==='string'&&v.length>0&&v.length<=160;
export function normalizeHammerfallStartup(raw){
  if(!finiteObject(raw))return null;const v=Number(raw.v);if(Number.isInteger(v)&&v>1)return structuredClone(raw);
  if(v!==1||typeof raw.effectId!=='string'||!/^tool-[a-z0-9-]{1,59}$/.test(raw.effectId)||!['area','areaId','levelId'].every(k=>typeof raw[k]==='string'&&raw[k].length<=512))return null;
  return {...raw,v:1,effectId:raw.effectId,area:raw.area,areaId:raw.areaId,levelId:raw.levelId};
}
export function toolUseStartupMs(kind,effectiveCooldownMs){const normal=TOOL_USE_STARTUP_MS[kind],base=TOOL_USE_BASE_COOLDOWN[kind],n=Number(effectiveCooldownMs);return normal&&Number.isFinite(n)?Math.max(1,normal*Math.max(0,Math.min(1,n/base))):null;}
export function normalizeToolUseVisual(raw,toolKind,durationMs){
  if(!finiteObject(raw))return null;const v=Number(raw.v);if(Number.isInteger(v)&&v>1)return {...raw};
  const startupMs=Number(raw.startupMs),normal=TOOL_USE_STARTUP_MS[toolKind],duration=Number(durationMs);
  if(v!==1||!normal||!validUseId(raw.id)||!Number.isFinite(duration)||duration<=0||!Number.isFinite(startupMs)||startupMs<1||startupMs>normal||startupMs>duration||!['startup','released','cancelled'].includes(raw.phase))return null;
  if(raw.phase==='released'){if(!Number.isFinite(Number(raw.releaseOffsetMs))||Math.abs(Number(raw.releaseOffsetMs)-startupMs)>1e-6)return null;}
  else if(raw.releaseOffsetMs!=null)return null;
  return {...raw,v:1,id:raw.id,startupMs,phase:raw.phase,...(raw.phase==='released'?{releaseOffsetMs:startupMs}:{})};
}
const boundedNumber=(v,min,max)=>Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max;
const validPreparedShot=m=>{if(!finiteObject(m)||!['straight','grenade','boomerang'].includes(m.path)||!['physical','magic'].includes(m.damageType)||!boundedNumber(m.dx,-1,1)||!boundedNumber(m.dy,-1,1)||Math.abs(Math.hypot(Number(m.dx),Number(m.dy))-1)>1e-5||!boundedNumber(m.speed,.001,50)||!boundedNumber(m.life,.001,60)||!boundedNumber(m.damage,1,1e9))return false;for(const [k,min,max] of [['turnAfter',0,60],['blastRadius',0,20],['pierce',0,64],['scale',0,20],['grow',0,20],['ricochet',0,32]])if(k in m&&!boundedNumber(m[k],min,max))return false;if(('pierce'in m&&!Number.isInteger(Number(m.pierce)))||('ricochet'in m&&!Number.isInteger(Number(m.ricochet)))||('returning'in m&&m.returning!==false)||('glyphHost'in m&&m.glyphHost!=='tool')||('arcWave'in m&&typeof m.arcWave!=='boolean')||('sunburst'in m&&typeof m.sunburst!=='boolean'))return false;if('visualFlight'in m&&(!finiteObject(m.visualFlight)||m.visualFlight.v!==1||!boundedNumber(m.visualFlight.duration,.001,60)))return false;return true;};
function normalizePreparedPayload(raw){
  if(!finiteObject(raw)||raw.v!==1||!['shot','sweep'].includes(raw.family))return null;
  const key=raw.family==='shot'?'shot':'effect',body=raw[key];if(!finiteObject(body))return null;
  const numeric=raw.family==='shot'?['speed','life','damage','turnAfter','blastRadius','pierce']:['life','radius','damage','imbue','healShare'];
  if(numeric.some(k=>k in body&&!boundedNumber(body[k],k==='damage'?1:0,1e6)))return null;
  if(raw.family==='shot'&&(!['straight','grenade','boomerang'].includes(body.path)||!['physical','magic'].includes(body.damageType)))return null;
  const pellets=Number(raw.pellets??0),spread=Number(raw.spread??0);if(!Number.isInteger(pellets)||pellets<0||pellets>16||!boundedNumber(spread,0,Math.PI))return null;
  const echoCopies=Array.isArray(raw.echoCopies)?raw.echoCopies:null;if(!echoCopies||echoCopies.length>4||echoCopies.some(c=>!finiteObject(c)||!boundedNumber(c.delayMs,0,60000)||!boundedNumber(c.share,0,4)))return null;
  if(typeof raw.awakenedFan!=='boolean'||typeof raw.cloneEligible!=='boolean')return null;
  let members;
  if(raw.family==='shot'){
    if(!Array.isArray(raw.members)||raw.members.length<1||raw.members.length>16)return null;
    members=raw.members.map(m=>finiteObject(m)?{...m}:null);if(!validPreparedShot(body)||members.some(m=>!validPreparedShot(m)))return null;
  }else if(body.kind!=='great-sweep'||body.brawler!==true||body.glyphHost!=='tool'||body.pulse!==99||!boundedNumber(body.life,.001,60)||!boundedNumber(body.radius,0,20)||!boundedNumber(body.damage,1,1e9)||!boundedNumber(body.imbue??0,0,1e9)||!boundedNumber(body.healShare??0,0,4))return null;
  if(echoCopies.length>2||new Set(echoCopies.map(c=>c.index)).size!==echoCopies.length||echoCopies.some((c,i)=>c.index!==i+1))return null;
  if(raw.cloneEligible&&raw.cloneProfile!=null&&(!finiteObject(raw.cloneProfile)||raw.cloneProfile.shape!=='arc'||raw.cloneProfile.range!==1.75||raw.cloneProfile.arc!==160||!boundedNumber(raw.cloneProfile.damage,1,1e9)))return null;
  return {...raw,v:1,family:raw.family,[key]:{...body},...(members?{members}:{}),pellets,spread,awakenedFan:raw.awakenedFan,echoCopies:echoCopies.map(c=>({...c,delayMs:Number(c.delayMs),share:Number(c.share)})),cloneEligible:raw.cloneEligible,...(finiteObject(raw.cloneProfile)?{cloneProfile:{...raw.cloneProfile}}:{})};
}
export function normalizePendingToolUse(raw){
  if(!finiteObject(raw))return null;const v=Number(raw.v);if(Number.isInteger(v)&&v>1)return structuredClone(raw);if(v!==1||!TOOL_USE_KINDS.includes(raw.toolKind)||!validUseId(raw.id)||!['area','areaId','levelId'].every(k=>typeof raw[k]==='string'&&raw[k].length<=512)||!finiteObject(raw.aim))return null;
  const ax=Number(raw.aim.x),ay=Number(raw.aim.y),mag=Math.hypot(ax,ay),startupMs=Number(raw.startupMs),elapsedMs=Number(raw.elapsedMs),remainingMs=Number(raw.remainingMs),normal=TOOL_USE_STARTUP_MS[raw.toolKind],payload=normalizePreparedPayload(raw.payload);
  if(!Number.isFinite(mag)||Math.abs(mag-1)>1e-5||!boundedNumber(startupMs,1,normal)||!boundedNumber(elapsedMs,0,startupMs)||!boundedNumber(remainingMs,0,startupMs)||Math.abs(elapsedMs+remainingMs-startupMs)>1e-5||!payload||(raw.toolKind==='great-sweep')!==(payload.family==='sweep'))return null;
  if(payload.family==='shot'){const spec=raw.toolKind==='rift-bombard'?['grenade','physical',8,[1,3]]:raw.toolKind==='blunderbuss'?['straight','physical',null,[3,5]]:['boomerang','magic',10,[1,3]],members=payload.members,executed=[payload.shot,...members];if(!spec[3].includes(members.length)||executed.some(m=>m.path!==spec[0]||m.damageType!==spec[1]||(spec[2]!=null&&m.speed!==spec[2])||(raw.toolKind==='blunderbuss'&&m.speed!==14&&m.speed!==11)))return null;}
  return {...raw,v:1,id:raw.id,toolKind:raw.toolKind,startupMs,elapsedMs,remainingMs,aim:{...raw.aim,x:ax,y:ay},payload};
}
export function normalizePendingMeleeContact(raw){
  if(!finiteObject(raw))return null;
  const v=Number(raw.v);if(Number.isInteger(v)&&v>1)return structuredClone(raw);
  const action=normalizeMeleeActionVisual(raw.action),contactMs=Number(raw.contactMs),elapsedMs=Number(raw.elapsedMs),remainingMs=Number(raw.remainingMs),aim=raw.aim,ax=Number(aim?.x),ay=Number(aim?.y),mag=Math.hypot(ax,ay);
  if(v!==1||!validUseId(raw.id)||!action||action.v!==1||contactMs!==action.contactMs||
    !['area','areaId','levelId'].every(k=>typeof raw[k]==='string'&&raw[k].length<=512)||
    !finiteObject(aim)||!Number.isFinite(mag)||Math.abs(mag-1)>1e-5||
    !boundedNumber(elapsedMs,0,contactMs)||!boundedNumber(remainingMs,0,contactMs)||
    Math.abs(elapsedMs+remainingMs-contactMs)>1e-5)return null;
  const p=raw.payload;let payload=null;
  if(action.kind==='verge-cleaver'&&finiteObject(p)&&p.kind==='cleaver'&&finiteObject(p.profile)&&
    ['range','arc','damage'].every(k=>boundedNumber(p.profile[k],0,1e6))&&typeof p.profile.shape==='string'&&
    boundedNumber(p.meleeBonus,0,1e9)&&boundedNumber(p.attackDamage,0,100)&&boundedNumber(p.imbue,0,1e9)&&
    typeof p.spellblade==='boolean'&&typeof p.awakened==='boolean'&&boundedNumber(p.support,0,999)&&
    finiteObject(p.primaryMotion)&&p.primaryMotion.v===2&&Number.isInteger(p.primaryMotion.step)&&p.primaryMotion.step>=1&&p.primaryMotion.step<=4&&
    (p.boxing===null||finiteObject(p.boxing)&&boundedNumber(p.boxing.damage,0,100)&&boundedNumber(p.boxing.heal,0,100)))
    payload={...p,kind:'cleaver',profile:{range:Number(p.profile.range),arc:Number(p.profile.arc),damage:Number(p.profile.damage),shape:p.profile.shape},meleeBonus:Number(p.meleeBonus),attackDamage:Number(p.attackDamage),imbue:Number(p.imbue),spellblade:p.spellblade,boxing:p.boxing?{damage:Number(p.boxing.damage),heal:Number(p.boxing.heal)}:null,awakened:p.awakened,primaryMotion:{v:2,step:p.primaryMotion.step},support:Number(p.support)};
  if(action.kind==='iron-fists'&&finiteObject(p)&&p.kind==='fist'&&finiteObject(p.effect)&&
    ['life','radius','damage','pulse','untilPulse','imbue','stun'].every(k=>boundedNumber(p.effect[k],0,1e9))&&
    ['iron-fist','fist-uppercut'].includes(p.effect.kind)&&p.effect.brawler===true&&p.effect.glyphHost==='melee'&&p.effect.pulse===99&&
    Number.isInteger(p.step)&&p.step>=1&&p.step<=3&&boundedNumber(p.cloneDamage,0,1e9)&&typeof p.cloneEligible==='boolean')
    payload={...p,kind:'fist',effect:{id:String(p.effect.id||'').slice(0,160),kind:p.effect.kind,brawler:true,life:Number(p.effect.life),radius:Number(p.effect.radius),pulse:99,untilPulse:0,damage:Number(p.effect.damage),pulseIndex:0,hits:{},glyphHost:'melee',healShare:Number(p.effect.healShare)||0,imbue:Number(p.effect.imbue),stun:Number(p.effect.stun),finisher:p.effect.finisher===true},step:p.step,cloneDamage:Number(p.cloneDamage),cloneEligible:p.cloneEligible};
  if(!payload)return null;
  return{...raw,v:1,id:raw.id,action,area:raw.area,areaId:raw.areaId,levelId:raw.levelId,contactMs,elapsedMs,remainingMs,aim:{x:ax,y:ay},payload};
}
export function toolUsePoseTime(record,elapsedMs){
  const duration=Math.max(0,Number(record?.durationMs)||0),elapsed=Math.max(0,Math.min(duration,Number.isFinite(Number(elapsedMs))?Number(elapsedMs):0)),u=record?.toolUse;
  if(u==null)return{phase:'legacy',elapsedMs:elapsed,startupMs:0,releaseAgeMs:null};const n=normalizeToolUseVisual(u,record?.toolKind,duration);if(!n||n.v!==1)return{phase:'unknown',elapsedMs:elapsed,startupMs:0,releaseAgeMs:null};
  if(n.phase==='startup')return{phase:'startup',elapsedMs:Math.min(elapsed,n.startupMs),startupMs:n.startupMs,releaseAgeMs:null};
  if(n.phase==='released'){const at=Math.max(n.startupMs,elapsed);return{phase:'released',elapsedMs:at,startupMs:n.startupMs,releaseAgeMs:Math.max(0,at-n.releaseOffsetMs)};}
  return{phase:'cancelled',elapsedMs:Math.min(elapsed,n.startupMs),startupMs:n.startupMs,releaseAgeMs:null};
}
export function toolUseReleaseAge(record,elapsedMs){const q=toolUsePoseTime(record,elapsedMs);return q.phase==='legacy'?q.elapsedMs:q.phase==='released'?q.releaseAgeMs:null;}
const smooth = n => { const t=Math.max(0,Math.min(1,n)); return t*t*(3-2*t); };
// Pure presentation sampler. Repeated accepts save its five numeric controls as the next
// entry pose, so the renderer never needs frame history and never restarts from neutral.
function authoredToolPose(profile, elapsedMs, direction=1, continuing=false) {
  const T=TOOL_ACTION_TIMING[profile]; if(!T)return null;
  const ms=Math.max(0,Math.min(T.durationMs,Number(elapsedMs)||0)),dir=direction===-1?-1:1;
  if(profile==='great-sweep'){
    const q=ms<T.raiseMs&&!continuing?smooth(ms/T.raiseMs):ms<T.holdMs?1:1-smooth((ms-T.holdMs)/(T.durationMs-T.holdMs));
    const travel=ms<380?smooth(ms/380):1, yaw=dir*(-1.13+2.62*travel);
    return { yaw, side:Math.sin(yaw)*.22*q, up:(.08-.18*Math.max(0,(ms-380)/460))*q, forward:(.38+Math.cos(yaw)*.13)*q, weight:q };
  }
  const q=ms<T.raiseMs&&!continuing?smooth(ms/T.raiseMs):ms<T.holdMs?1:1-smooth((ms-T.holdMs)/(T.durationMs-T.holdMs));
  const base=profile==='lumen-spindle'?[-.03,.18,.54]:profile==='rift-bombard'?[-.05,-.13,.43]:[-.04,-.08,.50];
  const recoil=Math.sin(Math.PI*Math.min(1,ms/(profile==='lumen-spindle'?70:profile==='rift-bombard'?120:100)))*(profile==='lumen-spindle'?.025:.055);
  return { yaw:0, side:base[0]*q, up:base[1]*q+recoil, forward:base[2]*q-recoil, weight:q };
}
function phasedToolPose(profile,phase,direction=1,continuing=false){
  const T=TOOL_ACTION_TIMING[profile];if(!T)return null;const dir=direction===-1?-1:1;
  if(profile==='great-sweep'){
    if(phase.phase==='startup'){const q=continuing?1:smooth(phase.elapsedMs/phase.startupMs),yaw=dir*-1.13;return{yaw,side:Math.sin(yaw)*.22*q,up:.08*q,forward:(.38+Math.cos(yaw)*.13)*q,weight:q};}
    const age=phase.releaseAgeMs,tail=Math.max(1,T.durationMs-phase.startupMs),u=Math.max(0,Math.min(1,age/tail)),travel=smooth(Math.min(1,u/.42)),recover=u<.72?1:1-smooth((u-.72)/.28),yaw=dir*(-1.13+2.62*travel);return{yaw,side:Math.sin(yaw)*.22*recover,up:(.08-.18*u)*recover,forward:(.38+Math.cos(yaw)*.13)*recover,weight:recover};
  }
  const base=profile==='lumen-spindle'?[-.03,.18,.54]:profile==='rift-bombard'?[-.05,-.13,.43]:[-.04,-.08,.50];
  if(phase.phase==='startup'){const q=continuing?1:smooth(phase.elapsedMs/phase.startupMs);return{yaw:0,side:base[0]*q,up:base[1]*q,forward:base[2]*q,weight:q};}
  const age=phase.releaseAgeMs,tail=Math.max(1,T.durationMs-phase.startupMs),u=Math.max(0,Math.min(1,age/tail)),recover=u<.72?1:1-smooth((u-.72)/.28),recoilMs=profile==='lumen-spindle'?70:profile==='rift-bombard'?120:100,recoil=Math.sin(Math.PI*Math.min(1,age/recoilMs))*(profile==='lumen-spindle'?.025:.055);return{yaw:0,side:base[0]*recover,up:base[1]*recover+recoil,forward:base[2]*recover-recoil,weight:recover};
}
export function sampleToolActionMotion(record,elapsedMs){
  const motion=record?.toolMotion;if(!motion||motion.v!==1)return null;
  const entry=motion.entry,T=TOOL_ACTION_TIMING[record.toolKind];
  // A held/partly raised entry approaches READY, not a restarted cold draw. Recoil is
  // still the bounded authored pulse; interpolation preserves the exact prior pose at 0.
  if(!T)return null;const phase=toolUsePoseTime(record,elapsedMs);if(phase.phase==='cancelled'||phase.phase==='unknown')return null;
  const poseMs=phase.phase==='legacy'?elapsedMs:phase.elapsedMs,pose=phase.phase==='legacy'?authoredToolPose(record.toolKind,elapsedMs,motion.direction,entry[4]>0):phasedToolPose(record.toolKind,phase,motion.direction,entry[4]>0);
  if(!pose||!T)return null;
  const enter=smooth(Math.max(0,Math.min(1,(Number(poseMs)||0)/Math.min(70,phase.startupMs||70))));
  return {yaw:entry[0]+(pose.yaw-entry[0])*enter,side:entry[1]+(pose.side-entry[1])*enter,up:entry[2]+(pose.up-entry[2])*enter,forward:entry[3]+(pose.forward-entry[3])*enter,weight:entry[4]+(pose.weight-entry[4])*enter};
}
export function toolActionPose(profile,elapsedMs,direction=1){return sampleToolActionMotion({toolKind:profile,toolMotion:{v:1,entry:[0,0,0,0,0],direction:direction===-1?-1:1}},elapsedMs);}

export function normalizeAttackVisual(raw, remainingMs = 0) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const durationMs = Number(raw.durationMs);
  const remaining = Number(remainingMs);
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 5000 ||
      !Number.isFinite(remaining) || remaining < 0 || remaining > durationMs + 1e-6) return null;
  if (typeof raw.profile !== "string" || !ATTACK_VISUAL_PROFILE.test(raw.profile)) return null;
  const profile = raw.profile;
  const copy = { ...raw, profile, durationMs };
  if (raw.primaryStep != null) {
    if (!Number.isInteger(raw.primaryStep) || raw.primaryStep < 1 || raw.primaryStep > 3) return null;
    copy.primaryStep = raw.primaryStep;
  }
  if (raw.primaryMotion != null) {
    const primaryMotion = normalizePrimaryMotion(raw.primaryMotion);
    if (!primaryMotion) return null;
    copy.primaryMotion = primaryMotion;
  }
  if (raw.cleaverChoreography != null) {
    const cue = raw.cleaverChoreography;
    if (validCleaverCue(cue)) copy.cleaverChoreography = { ...cue, entry: { ...cue.entry } };
    else if (finiteObject(cue) && Number.isInteger(cue.v) && cue.v > 1) copy.cleaverChoreography = { ...cue };
    else delete copy.cleaverChoreography;
  }
  if (raw.weaponKind != null) {
    if (typeof raw.weaponKind !== "string" || !ATTACK_VISUAL_PROFILE.test(raw.weaponKind)) return null;
    copy.weaponKind = raw.weaponKind;
  }
  if (raw.toolKind != null) {
    if (typeof raw.toolKind !== "string" || !ATTACK_VISUAL_PROFILE.test(raw.toolKind)) return null;
    copy.toolKind = raw.toolKind;
  }
  if(raw.toolMotion!=null){const m=raw.toolMotion;if(!m||typeof m!=='object'||Array.isArray(m))return null;if(Number.isInteger(m.v)&&m.v>1)copy.toolMotion={...m};else{if(m.v!==1||!Array.isArray(m.entry)||m.entry.length!==5||m.entry.some(n=>!Number.isFinite(Number(n))||Math.abs(Number(n))>4)||m.direction!==1&&m.direction!==-1)return null;copy.toolMotion={...m,v:1,entry:m.entry.map(Number),direction:m.direction};if(m.baseKind!=null){if(!PRIMARY_VISUAL_KINDS.includes(m.baseKind))return null;copy.toolMotion.baseKind=m.baseKind;}}}
  if(raw.toolUse!=null){const u=normalizeToolUseVisual(raw.toolUse,copy.toolKind,durationMs);copy.toolUse=u||{v:1,id:validUseId(raw.toolUse?.id)?raw.toolUse.id:'invalid-tool-use',startupMs:boundedNumber(raw.toolUse?.startupMs,1,TOOL_USE_STARTUP_MS[copy.toolKind]||1)?Number(raw.toolUse.startupMs):1,phase:'cancelled'};}
  if (raw.toolShotId != null) {
    if (typeof raw.toolShotId !== 'string' || raw.toolShotId.length<1 || raw.toolShotId.length>160) return null;
    copy.toolShotId=raw.toolShotId;
  }
  if (raw.poseMs != null) {
    const poseMs = Number(raw.poseMs);
    if (!Number.isFinite(poseMs) || poseMs < 0 || poseMs > 1e12) return null;
    copy.poseMs = poseMs;
  }
  if (raw.facingYaw != null) {
    const facingYaw = Number(raw.facingYaw);
    if (!Number.isFinite(facingYaw) || Math.abs(facingYaw) > Math.PI * 4) return null;
    copy.facingYaw = facingYaw;
  }
  if (raw.fistStep != null) {
    const fistStep = Number(raw.fistStep);
    if (!Number.isInteger(fistStep) || fistStep < 1 || fistStep > 3) return null;
    copy.fistStep = fistStep;
  }
  if (raw.fistLead != null) {
    if (raw.fistLead !== "left" && raw.fistLead !== "right") return null;
    copy.fistLead = raw.fistLead;
  }
  if (raw.fistGaitPhase != null) {
    const fistGaitPhase = Number(raw.fistGaitPhase);
    if (!Number.isFinite(fistGaitPhase) || Math.abs(fistGaitPhase) > Math.PI * 8) return null;
    copy.fistGaitPhase = fistGaitPhase;
  }
  if (raw.fistSpeed != null) {
    const fistSpeed = Number(raw.fistSpeed);
    if (!Number.isFinite(fistSpeed) || fistSpeed < 0 || fistSpeed > 8) return null;
    copy.fistSpeed = fistSpeed;
  }
  if (raw.fistCharge != null) {
    const fistCharge = Number(raw.fistCharge);
    if (!Number.isFinite(fistCharge) || fistCharge < 0 || fistCharge > 1) return null;
    copy.fistCharge = fistCharge;
  }
  if(raw.meleeAction!=null){const action=normalizeMeleeActionVisual(raw.meleeAction);if(!action)return null;copy.meleeAction=action;}
  if (raw.hammerEffectId != null) {
    if (typeof raw.hammerEffectId !== "string" || !/^[a-z0-9-]{1,64}$/.test(raw.hammerEffectId)) return null;
    copy.hammerEffectId = raw.hammerEffectId;
    const delay = Number(raw.hammerDelayMs), recovery = Number(raw.hammerRecoveryMs);
    if (!Number.isFinite(delay) || delay <= 0 || delay > durationMs || !Number.isFinite(recovery) || recovery <= 0 || delay + recovery !== durationMs) return null;
    copy.hammerDelayMs = delay; copy.hammerRecoveryMs = recovery;
  } else if (raw.hammerDelayMs != null || raw.hammerRecoveryMs != null) return null;
  if (raw.presentationCancelled != null) {
    if (typeof raw.presentationCancelled !== "boolean") return null;
    copy.presentationCancelled = raw.presentationCancelled;
  }
  if (raw.aim != null) {
    if (typeof raw.aim !== "object" || Array.isArray(raw.aim)) return null;
    const x = Number(raw.aim.x), y = Number(raw.aim.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) <= 0) return null;
    copy.aim = { ...raw.aim, x, y };
  }
  return copy;
}

// Accepted presentation is independent of combat clocks (which delayed Echo hits still update).
// Published Fists and the earlier primary candidate retain their optional legacy clocks.
export function attackVisualDeadline(player, record = player?.attackVisual, context = null) {
  if (record?.hammerEffectId && context && Number.isFinite(context.now) && Array.isArray(context.effects)) {
    const effect = context.effects.find((candidate) => candidate?.id === record.hammerEffectId);
    if (!effect) return context.now;
    const delayMs = record.hammerDelayMs, recoveryMs = record.hammerRecoveryMs;
    let elapsed;
    if (effect.delay > 0) elapsed = delayMs - Math.min(delayMs, effect.delay * 1000);
    else if (!(effect.pulseIndex > 0)) elapsed = Math.max(0, delayMs - .001);
    else elapsed = delayMs + Math.max(0, recoveryMs - Math.max(0, effect.life) * 1000);
    elapsed = Math.max(0, Math.min(record.durationMs, elapsed));
    return context.now + record.durationMs - elapsed;
  }
  const pending=context?.pendingToolUse,u=record?.toolUse,now=Number(context?.now);if(u?.v===1&&u.phase==='startup'&&pending?.v===1&&pending.id===u.id&&Number.isFinite(now)&&Number.isFinite(pending.acceptedAt)){const age=Math.max(0,Math.min(u.startupMs,now-pending.acceptedAt));return now+record.durationMs-age;}
  if (Number.isFinite(player?.actionVisualUntil)) return player.actionVisualUntil;
  if (record?.profile === 'fist' && Number.isFinite(player?.fistVisualUntil)) return player.fistVisualUntil;
  if (primaryVisualStage(record) && Number.isFinite(player?.primaryVisualUntil)) return player.primaryVisualUntil;
  return player?.attackUntil;
}

export function normalizeActionVisualMotion(value, visual) {
  const record = normalizeAttackVisual(visual);
  return Number.isFinite(value) && record ? Math.max(0, Math.min(record.durationMs, value)) : 0;
}

export function attackVisualRemaining(runtime) {
  return attackVisualDeadline({
    attackVisual: runtime?.attackVisual,
    actionVisualUntil: Object.hasOwn(runtime || {}, 'actionVisualMotion') ? normalizeActionVisualMotion(runtime.actionVisualMotion, runtime.attackVisual) : undefined,
    fistVisualUntil: runtime?.fistVisualMotion,
    primaryVisualUntil: runtime?.primaryVisualMotion,
    attackUntil: Number(runtime?.attackMotion) || 0,
  });
}

export function stampAttackVisual(player, profile, durationMs, aim = null) {
  if (!player || typeof player !== "object") return null;
  const visual = normalizeAttackVisual({ profile, durationMs });
  if (!visual) return null;
  const x = Number(aim?.x ?? aim?.dx), y = Number(aim?.y ?? aim?.dy), length = Math.hypot(x, y);
  if (Number.isFinite(length) && length > 0) visual.aim = { x: x / length, y: y / length };
  player.attackVisual = visual;
  if (player.castVisual) player.castVisual = { ...player.castVisual, cancelled: true };
  player.actionVisualUntil = Number.isFinite(player.attackUntil) ? player.attackUntil : undefined;
  return visual;
}

const CAST_TOKEN=/^[a-z][a-z0-9-]{0,31}$/;
export function normalizeCastVisual(raw,remainingMs=0){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const durationMs=Number(raw.durationMs),remaining=Number(remainingMs);
  if(!Number.isFinite(durationMs)||durationMs<=0||durationMs>5000||!Number.isFinite(remaining)||remaining<0||remaining>durationMs+1e-6)return null;
  if(!CAST_TOKEN.test(raw.spellKind)||!CAST_TOKEN.test(raw.variant)||!CAST_TOKEN.test(raw.profile))return null;
  const copy={...raw,spellKind:raw.spellKind,variant:raw.variant,profile:raw.profile,durationMs,cancelled:raw.cancelled===true};
  for(const key of ['aim','origin','target'])if(raw[key]!=null){const q=raw[key],x=Number(q?.x),y=Number(q?.y);if(!q||typeof q!=='object'||Array.isArray(q)||!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1e6||Math.abs(y)>1e6)return null;copy[key]={...q,x,y};}
  if(copy.aim){const m=Math.hypot(copy.aim.x,copy.aim.y);if(!(m>.0001))return null;copy.aim={...copy.aim,x:copy.aim.x/m,y:copy.aim.y/m};}
  return copy;
}
export function stampCastVisual(player,record,durationMs=ACTION_MOTION.castMs){const visual=normalizeCastVisual({...record,durationMs},durationMs);if(!player||!visual)return null;player.castVisual=visual;return visual;}
export function cancelCastVisual(player){if(player?.castVisual&&!player.castVisual.cancelled)player.castVisual={...player.castVisual,cancelled:true};}

export function normalizeDodgeVisual(raw) {
  if (raw == null) return null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const facingYaw = Number(raw.facingYaw), gaitPhase = Number(raw.gaitPhase);
  if (!Number.isFinite(facingYaw) || Math.abs(facingYaw) > Math.PI * 4 || !Number.isFinite(gaitPhase) || Math.abs(gaitPhase) > Math.PI * 8 || typeof raw.moving !== "boolean") return null;
  const speed=raw.speed==null?(raw.moving?2.4:0):Number(raw.speed),poseMs=raw.poseMs==null?null:Number(raw.poseMs);
  if(!Number.isFinite(speed)||speed<0||speed>8||poseMs!==null&&(!Number.isFinite(poseMs)||poseMs<0||poseMs>1e12))return null;
  return { ...raw, facingYaw, gaitPhase, moving: raw.moving, speed, ...(poseMs===null?{}:{poseMs}) };
}

const HERO_PRESENTATION = new WeakMap();
export function recordHeroPresentation(player,pose){if(!player||typeof player!=='object'||!pose||!Number.isFinite(pose.gaitPhase)||!Number.isFinite(pose.speed)||!Number.isFinite(pose.yaw)||!Number.isFinite(pose.now)||!Number.isFinite(pose.x)||!Number.isFinite(pose.y))return;let q=HERO_PRESENTATION.get(player);if(!q){q={gaitPhase:0,speed:0,yaw:0,now:0,x:0,y:0};HERO_PRESENTATION.set(player,q);}q.gaitPhase=pose.gaitPhase;q.speed=Math.max(0,Math.min(8,pose.speed));q.yaw=pose.yaw;q.now=pose.now;q.x=pose.x;q.y=pose.y;}
export function recentHeroPresentation(player,now,x,y){const q=player&&HERO_PRESENTATION.get(player);return q&&Number.isFinite(now)&&now-q.now>=0&&now-q.now<=250&&Math.hypot(q.x-x,q.y-y)<=.25?{...q}:null;}

// Accepted primary presentation cycles; their idle window never owns contact timing, hits or movement.
export function normalizePrimaryMotion(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Number.isInteger(raw.v) || raw.v < 2) return null;
  if (raw.v > 2) return { ...raw };
  if (!Number.isInteger(raw.step) || raw.step < 1 || raw.step > 4) return null;
  return { ...raw, v: 2, step: raw.step };
}
export function primaryVisualStage(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  if (record.primaryMotion != null) {
    const motion = normalizePrimaryMotion(record.primaryMotion);
    if (!motion) return null;
    if (motion.v > 2) return { kind: 'opaque' };
    return { kind: 'cleaver-four', step: motion.step, direction: motion.step === 1 || motion.step === 3 ? 1 : -1 };
  }
  return Number.isInteger(record.primaryStep) && record.primaryStep >= 1 && record.primaryStep <= 3
    ? { kind: 'legacy', step: record.primaryStep }
    : null;
}
export function primaryCarryStage(record, combo, active = false) {
  if (active) {
    const stage = primaryVisualStage(record);
    if (stage) return stage;
    return record?.weaponKind === 'verge-cleaver' && record.primaryMotion == null && record.primaryStep == null ? { kind: 'legacy', step: 1 } : null;
  }
  const saved = normalizePrimaryCombo(combo);
  if (!saved || saved.weaponKind !== 'verge-cleaver') {
    // Old supported attacks did not always save a combo counter. Their retained
    // descriptor still owns carry until a newly accepted action replaces it.
    if (record?.weaponKind === 'verge-cleaver' && record.primaryMotion == null) {
      return primaryVisualStage(record) || (record.primaryStep == null ? { kind: 'legacy', step: 1 } : null);
    }
    return null;
  }
  if (Number.isInteger(saved.v) && saved.v > 2) return { kind: 'opaque' };
  if (saved.v === 2) return { kind: 'cleaver-four', step: saved.step, direction: saved.step === 1 || saved.step === 3 ? 1 : -1 };
  return { kind: 'legacy', step: saved.step };
}
export function normalizePrimaryCombo(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
      typeof raw.weaponKind !== 'string' || !ATTACK_VISUAL_PROFILE.test(raw.weaponKind)) return null;
  if (raw.v != null && (!Number.isInteger(raw.v) || raw.v < 1)) return null;
  if (Number.isInteger(raw.v) && raw.v > 2) return { ...raw, weaponKind: raw.weaponKind };
  if (raw.v === 2) {
    if (raw.weaponKind !== 'verge-cleaver' || !Number.isInteger(raw.step) || raw.step < 1 || raw.step > 4) return null;
    return { ...raw, weaponKind: raw.weaponKind, v: 2, step: raw.step };
  }
  if (!Number.isInteger(raw.step) || raw.step < 1 || raw.step > 3) return null;
  return { ...raw, weaponKind: raw.weaponKind, step: raw.step };
}
export const CLEAVER_COMBO_IDLE_MS = 1000;

// Arm reach is measured from the anatomical right shoulder. Side is positive
// to the Wayfarer's right. Angles describe the blade and upper-body follow-through.
const CLEAVER_KEYS = ['side', 'up', 'forward', 'yaw', 'pitch', 'twist', 'lean'];
const cleaverKey = (side, up, forward, yaw, pitch, twist = 0, lean = 0) =>
  Object.freeze({ side, up, forward, yaw, pitch, twist, lean });
const CLEAVER_CARRY = cleaverKey(.10, -.79, .10, .20, -.70);
const CLEAVER_ENDS = Object.freeze([
  cleaverKey(-.67, -.04, .46, -.85, .10, -.20, .06),
  cleaverKey(.81, -.04, .43, .86, .07, .24, .08),
  cleaverKey(-.55, -.68, .42, -.82, -.09, -.22, .12),
  cleaverKey(.57, -.68, .34, .92, -.08, .22, .07),
]);
const CLEAVER_FOLLOW_MS = 105;
const CLEAVER_READY_MS = 475;
const CLEAVER_SETTLE_MS = 820;
export const cleaverCarryFrame = () => CLEAVER_CARRY;

function mixCleaverFrame(from, to, blend) {
  if (blend === 0) return { ...from };
  if (blend === 1) return { ...to };
  const out = {};
  for (const key of CLEAVER_KEYS) out[key] = from[key] + (to[key] - from[key]) * blend;
  return out;
}

function validCleaverFrame(frame) {
  return finiteObject(frame) && CLEAVER_KEYS.every(key =>
    typeof frame[key] === 'number' && Number.isFinite(frame[key]) && Math.abs(frame[key]) <= 2);
}

function validCleaverCue(cue) {
  return finiteObject(cue) && cue.v === 1 && validCleaverFrame(cue.entry) &&
    Number.isFinite(cue.acceptedLogicalMs) && cue.acceptedLogicalMs >= 0 &&
    cue.acceptedLogicalMs <= 1e12 && (cue.retired === undefined || typeof cue.retired === 'boolean') &&
    (cue.contactLogicalMs === undefined || (Number.isFinite(cue.contactLogicalMs) &&
      cue.contactLogicalMs >= cue.acceptedLogicalMs && cue.contactLogicalMs <= 1e12));
}

export function sampleCleaverChoreography(record, logicalNow) {
  const cue = record?.cleaverChoreography, step = record?.primaryMotion?.step;
  const action = record?.meleeAction;
  if (record?.weaponKind !== 'verge-cleaver' || record.presentationCancelled ||
      record.primaryMotion?.v !== 2 || !Number.isInteger(step) || step < 1 || step > 4 ||
      !validCleaverCue(cue) || cue.retired === true || !Number.isFinite(logicalNow) ||
      action?.v !== 1 || action.kind !== 'verge-cleaver' || action.move !== 'cleaver' ||
      action.durationMs !== CLOSE_VIEW_MELEE_TIMING.cleaver.durationMs ||
      !Number.isFinite(action.contactMs) || action.contactMs < 1 || action.contactMs > CLOSE_VIEW_MELEE_TIMING.cleaver.contactMs)
    return null;
  const sinceAcceptance = logicalNow - cue.acceptedLogicalMs;
  const elapsed = cue.contactLogicalMs !== undefined && logicalNow >= cue.contactLogicalMs
    ? action.contactMs + logicalNow - cue.contactLogicalMs
    : Math.min(action.contactMs, sinceAcceptance);
  if (elapsed < 0) return null;
  if (elapsed >= CLEAVER_COMBO_IDLE_MS) return CLEAVER_CARRY;
  const end = CLEAVER_ENDS[step - 1], followEnd = action.contactMs + CLEAVER_FOLLOW_MS;
  if (elapsed >= followEnd) {
    const start = step === 4 ? followEnd : CLEAVER_READY_MS;
    const finish = step === 4 ? action.durationMs : CLEAVER_SETTLE_MS;
    return mixCleaverFrame(end, CLEAVER_CARRY, smooth((elapsed - start) / (finish - start)));
  }
  // The hand accelerates into the existing contact and carries through it.
  const before = elapsed <= action.contactMs;
  const fraction = before ? elapsed / action.contactMs : (elapsed - action.contactMs) / CLEAVER_FOLLOW_MS;
  const travel = before ? .5 * fraction ** 2 : 1 - .5 * (1 - fraction) ** 2;
  const frame = mixCleaverFrame(cue.entry, end, travel);
  const arc = Math.sin(Math.PI * travel);
  frame.forward += .24 * arc;
  if (step === 1 || step === 3) frame.pitch += (step === 1 ? .30 : -.30) * arc;
  frame.lean += .11 * arc;
  return frame;
}

export function acceptCleaverChoreography(prior, logicalNow) {
  return { v: 1, acceptedLogicalMs: logicalNow, entry: sampleCleaverChoreography(prior, logicalNow) ?? { ...CLEAVER_CARRY } };
}

export function advancePrimaryCombo(player, weaponKind, logicalNow) {
  if (weaponKind !== 'cinder-pike' && weaponKind !== 'verge-cleaver') { player.primaryCombo = null; return null; }
  const prior = normalizePrimaryCombo(player.primaryCombo);
  const four = weaponKind === 'verge-cleaver', clocked = four && arguments.length >= 3;
  // A supported current action may start at one without rewriting an opaque future counter.
  if (clocked && prior?.v > 2) return 1;
  let continuing = prior?.weaponKind === weaponKind && (four ? prior.v === 2 : prior.v == null || prior.v === 1);
  const window = prior?.resetWindow, knownWindow = window && typeof window === 'object' && !Array.isArray(window) && window.v === 1;
  const opaqueWindow = window != null && !knownWindow;
  const validClock = typeof logicalNow === 'number' && Number.isFinite(logicalNow) && logicalNow >= 0 && logicalNow <= 1e12;
  if (clocked && !opaqueWindow) {
    const at = knownWindow ? window.acceptedLogicalMs : NaN;
    const validAt = typeof at === 'number' && Number.isFinite(at) && at >= 0 && at <= 1e12;
    const elapsed = logicalNow - at;
    continuing = continuing && validClock && validAt && elapsed >= 0 && elapsed < CLEAVER_COMBO_IDLE_MS;
  }
  const step = continuing ? prior.step % (four ? 4 : 3) + 1 : 1;
  const next = { ...(prior || {}), weaponKind, step };
  if (four) next.v = 2;
  else delete next.v;
  if (clocked && !opaqueWindow && validClock)
    next.resetWindow = { ...(knownWindow ? window : {}), v: 1, acceptedLogicalMs: logicalNow };
  player.primaryCombo = next;
  return step;
}
