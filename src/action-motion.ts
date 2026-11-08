export const ACTION_MOTION = Object.freeze({
  meleeMs: 240,
  toolMs: 180,
  castMs: 360,
  attackBufferMs: 120,
  monsterStrikeMs: 240,
  monsterContact: .16,
});

export const ATTACK_VISUAL_PROFILES = Object.freeze([
  "melee", "fist", "emitter", "hammer", "sweep", "mirage", "orrery-tap", "orrery-release",
]);
const ATTACK_VISUAL_PROFILE = /^[a-z][a-z0-9-]{0,31}$/;
export const PRIMARY_VISUAL_KINDS = Object.freeze(["salvage-blade", "cinder-pike", "verge-cleaver"]);
export const TOOL_VISUAL_KINDS = Object.freeze(["rift-bombard", "great-sweep", "blunderbuss", "lumen-spindle"]);
export const TOOL_ACTION_TIMING = Object.freeze({
  "rift-bombard": Object.freeze({ durationMs:720, raiseMs:120, holdMs:520 }),
  blunderbuss: Object.freeze({ durationMs:640, raiseMs:100, holdMs:460 }),
  "lumen-spindle": Object.freeze({ durationMs:760, raiseMs:100, holdMs:560 }),
  "great-sweep": Object.freeze({ durationMs:840, raiseMs:40, holdMs:600 }),
});
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
export function sampleToolActionMotion(record,elapsedMs){
  const motion=record?.toolMotion;if(!motion||motion.v!==1)return null;
  const entry=motion.entry,T=TOOL_ACTION_TIMING[record.toolKind];
  // A held/partly raised entry approaches READY, not a restarted cold draw. Recoil is
  // still the bounded authored pulse; interpolation preserves the exact prior pose at 0.
  const pose=authoredToolPose(record.toolKind,elapsedMs,motion.direction,entry[4]>0);
  if(!pose||!T)return null;
  const enter=smooth(Math.max(0,Math.min(1,(Number(elapsedMs)||0)/70)));
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
  if (raw.weaponKind != null) {
    if (typeof raw.weaponKind !== "string" || !ATTACK_VISUAL_PROFILE.test(raw.weaponKind)) return null;
    copy.weaponKind = raw.weaponKind;
  }
  if (raw.toolKind != null) {
    if (typeof raw.toolKind !== "string" || !ATTACK_VISUAL_PROFILE.test(raw.toolKind)) return null;
    copy.toolKind = raw.toolKind;
  }
  if(raw.toolMotion!=null){const m=raw.toolMotion;if(!m||typeof m!=='object'||Array.isArray(m)||m.v!==1||!Array.isArray(m.entry)||m.entry.length!==5||m.entry.some(n=>!Number.isFinite(Number(n))||Math.abs(Number(n))>4)||m.direction!==1&&m.direction!==-1)return null;copy.toolMotion={...m,v:1,entry:m.entry.map(Number),direction:m.direction};if(m.baseKind!=null){if(!PRIMARY_VISUAL_KINDS.includes(m.baseKind))return null;copy.toolMotion.baseKind=m.baseKind;}}
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
  if (Number.isFinite(player?.actionVisualUntil)) return player.actionVisualUntil;
  if (record?.profile === 'fist' && Number.isFinite(player?.fistVisualUntil)) return player.fistVisualUntil;
  if (record?.primaryStep && Number.isFinite(player?.primaryVisualUntil)) return player.primaryVisualUntil;
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
  player.actionVisualUntil = Number.isFinite(player.attackUntil) ? player.attackUntil : undefined;
  return visual;
}

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

// Accepted primary presentation cycles; no timing, hits or movement are owned here.
export function normalizePrimaryCombo(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
      typeof raw.weaponKind !== 'string' || !ATTACK_VISUAL_PROFILE.test(raw.weaponKind) ||
      !Number.isInteger(raw.step) || raw.step < 1 || raw.step > 3) return null;
  return { ...raw, weaponKind: raw.weaponKind, step: raw.step };
}
export function advancePrimaryCombo(player, weaponKind) {
  if (weaponKind !== 'cinder-pike' && weaponKind !== 'verge-cleaver') { player.primaryCombo = null; return null; }
  const prior = normalizePrimaryCombo(player.primaryCombo);
  const step = prior?.weaponKind === weaponKind ? prior.step % 3 + 1 : 1;
  player.primaryCombo = { ...(prior || {}), weaponKind, step };
  return step;
}
