// Unwired presentation preparation. No Game, storage, clocks, assets or import-time I/O.
// Effects have already happened when a caller creates a receipt. This module never
// admits consumption, spends supplies, heals, blocks input or schedules an effect.
export const CONSUME_VISUAL_MS = 360;
const ITEMS = Object.freeze(['restorativeDraught', 'highPotion', 'maxPotion']);
const REASONS = Object.freeze(['attack', 'tool', 'cast', 'charge', 'dodge', 'jump', 'hurt', 'knockdown', 'death', 'area-transition', 'form-change', 'equipment-switch', 'busy']);
const CONTROL = /[\u0000-\u001f\u007f]/;
const object = q => !!q && typeof q === 'object' && !Array.isArray(q);
const time = q => typeof q === 'number' && Number.isFinite(q) && q >= 0 && q <= 1e12;
const token = q => typeof q === 'string' && q.length > 0 && q.length <= 512 && !CONTROL.test(q);
function context(q) { return object(q) && (q.area === 'overworld' || q.area === 'dungeon') && token(q.areaId) && token(q.levelId); }
function known(q) {
  return object(q) && q.v === 1 && q.kind === 'drink' && ITEMS.includes(q.itemKind) && time(q.acceptedLogicalMs) && q.durationMs === CONSUME_VISUAL_MS && context(q) &&
    (q.cancelled === undefined || typeof q.cancelled === 'boolean') && (q.cancelReason === undefined || REASONS.includes(q.cancelReason));
}
export function normalizeConsumeVisual(raw) {
  if (!object(raw) || !Number.isSafeInteger(raw.v) || raw.v < 1) return null;
  // Opaque versions retain all fields; no current recipe or cancellation is applied.
  if (raw.v > 1) return { ...raw };
  return known(raw) ? { ...raw, cancelled: raw.cancelled === true } : null;
}
export function cancelConsumeVisual(raw, reason) {
  // A refused input must not call this. Unknown reasons and future records are no-ops.
  if (!known(raw) || raw.cancelled === true || !REASONS.includes(reason)) return raw;
  return { ...raw, cancelled: true, cancelReason: reason };
}
// Caller owns one reusable output object and supplies the existing paused logical
// clock plus current area/areaId/levelId. No object/array is allocated while sampling.
// Scope mismatch is neutral, not a durable cancellation: Game must cancel a known
// receipt on real travel/form changes. Never shift acceptedLogicalMs with wall clocks.
export function sampleConsumeVisual(raw, logicalNow, current, out) {
  if (!object(out) || out === raw || out === current) return null;
  out.active = false; out.kind = ''; out.itemKind = ''; out.phase = 0;
  out.elapsedMs = 0; out.remainingMs = 0; out.durationMs = 0;
  if (!known(raw) || raw.cancelled === true || !time(logicalNow) || !context(current) ||
      raw.area !== current.area || raw.areaId !== current.areaId || raw.levelId !== current.levelId) return null;
  const elapsed = logicalNow - raw.acceptedLogicalMs;
  if (elapsed < 0 || elapsed >= raw.durationMs) return null;
  out.active = true; out.kind = 'drink'; out.itemKind = raw.itemKind;
  out.phase = elapsed / raw.durationMs; out.elapsedMs = elapsed;
  out.remainingMs = raw.durationMs - elapsed; out.durationMs = raw.durationMs;
  return out;
}
