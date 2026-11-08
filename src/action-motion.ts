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

export function normalizeAttackVisual(raw, remainingMs = 0) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const durationMs = Number(raw.durationMs);
  const remaining = Number(remainingMs);
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 5000 ||
      !Number.isFinite(remaining) || remaining < 0 || remaining > durationMs + 1e-6) return null;
  if (typeof raw.profile !== "string" || !ATTACK_VISUAL_PROFILE.test(raw.profile)) return null;
  const profile = raw.profile;
  const copy = { ...raw, profile, durationMs };
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
  return visual;
}

export function normalizeDodgeVisual(raw) {
  if (raw == null) return null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const facingYaw = Number(raw.facingYaw), gaitPhase = Number(raw.gaitPhase);
  if (!Number.isFinite(facingYaw) || Math.abs(facingYaw) > Math.PI * 4 || !Number.isFinite(gaitPhase) || Math.abs(gaitPhase) > Math.PI * 8 || typeof raw.moving !== "boolean") return null;
  const speed=raw.speed==null?(raw.moving?2.4:0):Number(raw.speed);
  if(!Number.isFinite(speed)||speed<0||speed>8)return null;
  return { ...raw, facingYaw, gaitPhase, moving: raw.moving, speed };
}

const HERO_PRESENTATION = new WeakMap();
export function recordHeroPresentation(player,pose){if(player&&typeof player==='object'&&pose&&[pose.gaitPhase,pose.speed,pose.yaw,pose.now,pose.x,pose.y].every(Number.isFinite))HERO_PRESENTATION.set(player,{gaitPhase:pose.gaitPhase,speed:Math.max(0,Math.min(8,pose.speed)),yaw:pose.yaw,now:pose.now,x:pose.x,y:pose.y});}
export function recentHeroPresentation(player,now,x,y){const q=player&&HERO_PRESENTATION.get(player);return q&&Number.isFinite(now)&&now-q.now>=0&&now-q.now<=250&&Math.hypot(q.x-x,q.y-y)<=.25?{...q}:null;}
