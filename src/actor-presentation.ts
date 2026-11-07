// Presentation-only contracts. No renderer/game imports: projectile producers and meshes share these anchors.
export const DEFAULT_PROJECTILE_VISUAL_HEIGHT = .66;
export const DRONE_VISUAL_HEIGHT = .66;
const profile = (bodyLift, head, shot, action, decoration = false) => Object.freeze({ bodyLift, head, shot, action, decoration });
export const ACTOR_PRESENTATION = Object.freeze({
  ashling: profile(0, 1.05, .66, 'ordinary'),
  rootBrute: profile(0, 1.2, .66, 'ordinary'),
  pallidCrawler: profile(0, .55, .66, 'crawler'),
  hollowMarshal: profile(0, 1.4, .66, 'ordinary'),
  ashenHound: profile(0, .65, .66, 'ordinary'),
  coilStalker: profile(0, .65, .66, 'ordinary'),
  glassMite: profile(0, .63, .66, 'ordinary', true),
  sparkWarden: profile(0, 1.60, 1.02, 'ordinary', true),
  cinderWisp: profile(.38, .99, .96, 'ordinary', true),
  veilMoth: profile(.42, .97, .66, 'ordinary', true),
  voidSentinel: profile(0, 1.31, .96, 'ordinary', true),
});
export const PROJECTILE_VISUAL_HEIGHTS = Object.freeze(Object.fromEntries(Object.entries(ACTOR_PRESENTATION).map(([kind, p]) => [kind, p.shot])));
const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
export const presentationScale = (actor) => Math.max(.25, Math.min(4, finite(actor?.scale, 1)));
export function projectileVisualHeight(shooter, source = 'body') {
  if (source === 'drone') return DRONE_VISUAL_HEIGHT;
  const p = ACTOR_PRESENTATION[shooter?.kind];
  return p ? Math.min(8, p.shot * presentationScale(shooter)) : DEFAULT_PROJECTILE_VISUAL_HEIGHT;
}
export function shotVisualHeight(shot) {
  return Math.max(.05, Math.min(8, finite(shot?.visualHeight, DEFAULT_PROJECTILE_VISUAL_HEIGHT)));
}
export function actorPresentation(actor) {
  const p = ACTOR_PRESENTATION[actor?.kind];
  if (!p) return null;
  const scale = presentationScale(actor);
  return { ...p, scale, bodyLift: p.bodyLift * scale, head: (p.bodyLift + p.head) * scale,
    alpha: Math.max(0, Math.min(1, (actor.phasing || actor.phases && actor.untargetable ? .45 : 1) *
      (actor.illusion ? .92 : 1) * finite(actor.fleeFade, 1))), stagger: Math.max(0, Math.min(1, finite(actor.poiseBreak, 0))) };
}
const AFFIXES = new Set(['volcanic', 'skyAssault', 'spiked', 'venomous', 'droneSwarm', 'enraged']);
// A body alone is insufficient. New families opt in only after their action and body-embedded effects are covered.
export function nativeCreatureCoverage(actor, capture, { mesh = true, attachments = false } = {}) {
  const p = ACTOR_PRESENTATION[actor?.kind];
  if (!p || !mesh) return 'body';
  if (!capture || capture.enemy !== actor) return 'capture';
  if (actor.hidden || actor.gloomVeil || actor.dead) return 'visibility';
  if (actor.seaKind || actor.astral || actor.gateAttack || actor.foundryForm || actor.foundryAttack || actor.giantCloud || actor.roofWake > 0 || actor.mount) return 'special-form';
  if (actor.packKind && p.action !== 'crawler') return 'pack-effects';
  if (actor.packKind && actor.boss) return 'pack-boss-effects';
  if (actor.pack && p.action !== 'crawler') return 'pack-action';
  if (actor.eliteWindup > 0 || actor.eliteActive > 0) return 'elite-action';
  if (p.decoration && (actor.segments > 1 || actor.tentacles > 0 && (actor.kind !== 'voidSentinel' || actor.tentacles !== 7))) return 'morphology';
  const decorated = actor.fracRank || actor.fracWarden || actor.fracShaman || actor.warded || actor.affixes?.length || actor.poiseBreak > 0;
  if (decorated && (!p.decoration || typeof capture.nativeDecorations !== 'function' || typeof capture.nativeFloor !== 'function')) return 'decorations';
  if (actor.affixes?.some((id) => !AFFIXES.has(id))) return 'affix';
  if (actor.affixes?.includes('droneSwarm') && !attachments) return 'attachment-budget';
  return null;
}
