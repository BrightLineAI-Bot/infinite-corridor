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
  if (raw.aim != null) {
    if (typeof raw.aim !== "object" || Array.isArray(raw.aim)) return null;
    const x = Number(raw.aim.x), y = Number(raw.aim.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) <= 0) return null;
    copy.aim = { ...raw.aim, x, y };
  }
  return copy;
}

export function stampAttackVisual(player, profile, durationMs, aim = null) {
  if (!player || typeof player !== "object") return null;
  const visual = normalizeAttackVisual({ profile, durationMs });
  if (!visual) return null;
  const x = Number(aim?.x ?? aim?.dx), y = Number(aim?.y ?? aim?.dy), length = Math.hypot(x, y);
  if (Number.isFinite(length) && length > 0) visual.aim = { x: x / length, y: y / length };
  player.attackVisual = visual;
  if (player.castVisual) player.castVisual = { ...player.castVisual, cancelled: true };
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
