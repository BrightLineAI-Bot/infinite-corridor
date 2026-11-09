export const CONSUME_VISUAL_MS = 360;
export const HURT_VISUAL_MS = 300;
export const CACHE_PICKUP_VISUAL_MS = 400;
export const CHEST_OPEN_VISUAL_MS = 510;
export const SHOVEL_DIG_VISUAL_MS = 620;
const ITEMS=Object.freeze(['restorativeDraught','highPotion','maxPotion']),REASONS=Object.freeze(['attack','tool','cast','charge','dodge','jump','hurt','knockdown','death','area-transition','form-change','equipment-switch','busy']),CONTROL=/[\u0000-\u001f\u007f]/;
const PICKUP_REASONS=Object.freeze([...REASONS,'drink']);
const object=q=>!!q&&typeof q==='object'&&!Array.isArray(q),time=q=>typeof q==='number'&&Number.isFinite(q)&&q>=0&&q<=1e12,token=q=>typeof q==='string'&&q.length>0&&q.length<=512&&!CONTROL.test(q);
function context(q){return object(q)&&(q.area==='overworld'||q.area==='dungeon')&&token(q.areaId)&&token(q.levelId)}
function known(q){return object(q)&&q.v===1&&q.kind==='drink'&&ITEMS.includes(q.itemKind)&&time(q.acceptedLogicalMs)&&q.durationMs===CONSUME_VISUAL_MS&&context(q)&&(q.cancelled===undefined||typeof q.cancelled==='boolean')&&(q.cancelReason===undefined||REASONS.includes(q.cancelReason))}
export function normalizeConsumeVisual(raw){if(!object(raw)||!Number.isSafeInteger(raw.v)||raw.v<1)return null;if(raw.v>1)return{...raw};return known(raw)?{...raw,cancelled:raw.cancelled===true}:null}
export function cancelConsumeVisual(raw,reason){if(!known(raw)||raw.cancelled===true||!REASONS.includes(reason))return raw;return{...raw,cancelled:true,cancelReason:reason}}
export function sampleConsumeVisual(raw,logicalNow,current,out){if(!object(out)||out===raw||out===current)return null;out.active=false;out.kind='';out.itemKind='';out.phase=0;out.elapsedMs=0;out.remainingMs=0;out.durationMs=0;if(!known(raw)||raw.cancelled===true||!time(logicalNow)||!context(current)||raw.area!==current.area||raw.areaId!==current.areaId||raw.levelId!==current.levelId)return null;const elapsed=logicalNow-raw.acceptedLogicalMs;if(elapsed<0||elapsed>=raw.durationMs)return null;out.active=true;out.kind='drink';out.itemKind=raw.itemKind;out.phase=elapsed/raw.durationMs;out.elapsedMs=elapsed;out.remainingMs=raw.durationMs-elapsed;out.durationMs=raw.durationMs;return out}
const knownHurt = raw => object(raw) && raw.v === 1 && raw.kind === 'hurt' &&
  time(raw.acceptedLogicalMs) && token(raw.areaId) && token(raw.levelId);

export function normalizeHurtVisual(raw) {
  if (!object(raw) || !Number.isSafeInteger(raw.v) || raw.v < 1) return null;
  return raw.v > 1 || knownHurt(raw) ? { ...raw } : null;
}

export function sampleHurtVisual(raw, logicalNow, areaId, levelId) {
  if (!knownHurt(raw) || !time(logicalNow) || raw.areaId !== areaId || raw.levelId !== levelId) return null;
  const elapsed = logicalNow - raw.acceptedLogicalMs;
  return elapsed >= 0 && elapsed < HURT_VISUAL_MS ? elapsed / HURT_VISUAL_MS : null;
}

const knownCachePickup = raw => object(raw) && raw.v === 1 && raw.kind === 'cachePickup' &&
  (raw.cacheKind === 'supplyCache' || raw.cacheKind === 'weaponCache' || raw.cacheKind === 'chest' || raw.cacheKind === 'shovelDig' || raw.cacheKind === 'ironShovelDig') &&
  time(raw.acceptedLogicalMs) && raw.durationMs === (raw.cacheKind === 'chest' ? CHEST_OPEN_VISUAL_MS : raw.cacheKind === 'shovelDig' || raw.cacheKind === 'ironShovelDig' ? SHOVEL_DIG_VISUAL_MS : CACHE_PICKUP_VISUAL_MS) &&
  token(raw.areaId) && token(raw.levelId) &&
  (raw.cancelled === undefined || typeof raw.cancelled === 'boolean') &&
  (raw.cancelReason === undefined || PICKUP_REASONS.includes(raw.cancelReason));

export function normalizeCachePickupVisual(raw) {
  if (!object(raw) || !Number.isSafeInteger(raw.v) || raw.v < 1) return null;
  if (raw.v > 1) return { ...raw };
  return knownCachePickup(raw) ? { ...raw, cancelled: raw.cancelled === true } : null;
}

export function cancelCachePickupVisual(raw, reason) {
  if (!knownCachePickup(raw) || raw.cancelled === true || !PICKUP_REASONS.includes(reason)) return raw;
  return { ...raw, cancelled: true, cancelReason: reason };
}

export function sampleCachePickupVisual(raw, logicalNow, areaId, levelId) {
  if (!knownCachePickup(raw) || raw.cancelled === true || !time(logicalNow) || raw.areaId !== areaId || raw.levelId !== levelId) return null;
  const elapsed = logicalNow - raw.acceptedLogicalMs;
  return elapsed >= 0 && elapsed < raw.durationMs ? elapsed / raw.durationMs : null;
}
