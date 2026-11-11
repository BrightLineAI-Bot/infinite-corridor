// Presentation-only contracts. No renderer/game imports: projectile producers and meshes share these anchors.
import { FOUNDRY_BASE_BODIES, FOUNDRY_MODEL_METADATA, FOUNDRY_ATTACKS, FOUNDRY_MOVEMENTS, foundryModelKey } from './close-view-foundry-presentation.js?v=r901-0a1ebe76c3f6';
export const DEFAULT_PROJECTILE_VISUAL_HEIGHT = .66;
export const DRONE_VISUAL_HEIGHT = .66;
// Player drone: its source sprite carries above the player but its simulation point eases behind.
// These are presentation anchors only; rockets keep their authoritative spawn, aim and collision path.
export const PLAYER_DRONE_VISUAL = Object.freeze({ hover:.37, carry:1.34, bob:.04, bobMs:260,
  portForward:-.10, portHeight:-.20, settleSeconds:.12, maxLaunchOffset:64 });
export function playerDroneVisualAnchor(player, drone, { carrying=false, lift=0, support=0, now=0, quiet=false } = {}) {
  if(!player||!drone||![player.x,player.y,drone.x,drone.y,lift,support,now].every(Number.isFinite))return null;
  const V=PLAYER_DRONE_VISUAL,yaw=player.facing==='left'?Math.PI:0,x=(carrying?player.x:drone.x)+.5,y=(carrying?player.y:drone.y)+.82;
  const z=support+lift+(carrying?V.carry:V.hover)-(quiet?0:Math.sin(now/V.bobMs)*V.bob);
  return {x,y,z,yaw,muzzle:{x:x+Math.cos(yaw)*V.portForward,y:y+Math.sin(yaw)*V.portForward,z:z+V.portHeight}};
}
export function readProjectileVisualLaunch(raw) {
  return raw&&typeof raw==='object'&&!Array.isArray(raw)&&raw.v===1&&['dx','dy','dz'].every(k=>Number.isFinite(raw[k])&&Math.abs(raw[k])<=PLAYER_DRONE_VISUAL.maxLaunchOffset)?raw:null;
}
export function projectileLaunchMetadata(shot, anchor, support=0) {
  if(!shot||!anchor||![shot.x,shot.y,anchor.x,anchor.y,anchor.z,support].every(Number.isFinite))return null;
  return readProjectileVisualLaunch({v:1,dx:anchor.x-shot.x,dy:anchor.y-shot.y,dz:anchor.z-support-shotVisualHeight(shot)});
}
export function projectileVisualPoint(shot, support=0, x=shot.x, y=shot.y, age=shot.age) {
  const launch=readProjectileVisualLaunch(shot.visualLaunch),t=Number.isFinite(age)&&age>=0?Math.min(1,age/PLAYER_DRONE_VISUAL.settleSeconds):1,w=launch?1-t*t*(3-2*t):0;
  return {x:x+(launch?.dx||0)*w,y:y+(launch?.dy||0)*w,z:finite(support,0)+shotVisualHeight(shot,age)+(launch?.dz||0)*w};
}
export function readProjectileVisualFlight(raw){const d=Number(raw?.duration);return raw&&typeof raw==='object'&&!Array.isArray(raw)&&raw.v===1&&Number.isFinite(d)&&d>0&&d<=8?{...raw,v:1,duration:d}:null;}

// `spectral`: a ghost by design (Close View draws it a little see-through with a cold rim; every other creature is solid).
const profile = (bodyLift, head, shot, action, decoration = true, extra = {}) => Object.freeze({ bodyLift, head, shot, action, decoration, ...extra });
const foundryProfiles = Object.fromEntries(Object.entries(FOUNDRY_BASE_BODIES).map(([kind,body])=>[kind,profile(0,FOUNDRY_MODEL_METADATA[body].headZ,FOUNDRY_MODEL_METADATA[body].actionZ,'foundry')]));
export const ACTOR_PRESENTATION = Object.freeze({
  ...foundryProfiles,
  ashling: profile(0, 1.05, .66, 'ordinary'),
  rootBrute: profile(0, 1.5, .66, 'ordinary'),
  pallidCrawler: profile(0, .55, .66, 'pack'),
  hollowMarshal: profile(0, 1.74, .66, 'ordinary'),
  ashenHound: profile(0, .65, .66, 'ordinary'),
  coilStalker: profile(0, .72, .66, 'ordinary', true, { segments: 3 }),
  glassMite: profile(0, .63, .66, 'ordinary', true),
  sparkWarden: profile(0, 1.60, 1.02, 'ordinary', true),
  cinderWisp: profile(.38, .99, .96, 'ordinary', true),
  veilMoth: profile(.42, .97, .66, 'ordinary', true),
  voidSentinel: profile(0, 1.31, .96, 'ordinary', true, { tentacles: 7 }),
  weepingSaint: profile(0, 1.7, 1.48, 'pack'),
  hangedChoir: profile(0, 1.95, 1.15, 'pack'),
  graveLantern: profile(.3, 1.3, 1.32, 'pack'),
  mirrorShade: profile(0, 1.25, .9, 'pack'),
  amalgam: profile(0, 1.25, .95, 'pack'),
  gnawingMaw: profile(0, 1.05, .72, 'pack', true, { hidden: 'silent' }),
  cinderSeraph: profile(.45, 1.6, 1.81, 'pack'),
  lumenWraith: profile(.35, 1.7, 1.82, 'pack', true, { spectral: true }),
  veilSpinner: profile(0, .7, .4, 'pack'),
  riftLynx: profile(0, .85, .55, 'pack'),
  sunderjaw: profile(0, .9, .4, 'pack', true, { segments: 3, hidden: 'mound' }),
  thunderhorn: profile(0, 1.25, .7, 'pack'),
  siegeBeetle: profile(0, 1.3, 1.17, 'pack', true, { segments: 2 }),
  gloomwisp: profile(.25, .95, .93, 'pack', true, { spectral: true }),
  gloomgorge: profile(.12, 1.3, .92, 'pack', true, { spectral: true }),
  // Adventure creatures (adventure-creatures.ts): solid authored bodies (close-view-adventure-models.ts).
  galleryLurker: profile(0, 1.15, .9, 'pack'),
  censerWarden: profile(0, 1.85, 1.2, 'pack'),
  vinehookLeaper: profile(0, 1.05, .8, 'pack'),
  thornspitterBloom: profile(0, 1.15, 1.0, 'pack'),
  sinkmaw: profile(0, .75, .5, 'pack', true, { hidden: 'mound' }),
  cinderKite: profile(.2, .8, .6, 'pack'),
  lamplighter: profile(0, 1.75, 1.6, 'pack'),
  knellkeeper: profile(0, 1.45, 1.1, 'pack'),
  spindriftMedusa: profile(.35, 1.1, .9, 'pack'),
  prismStilt: profile(0, 1.9, 1.75, 'pack'),
  rimeSentinel: profile(0, 1.7, 1.3, 'pack'),
  lakeGlider: profile(0, .6, .45, 'pack'),
  hookhanger: profile(0, 1.1, .8, 'pack'),
  slagwright: profile(0, 1.6, 1.0, 'pack'),
});
export function actorProfile(actor) {
  const p = ACTOR_PRESENTATION[actor?.kind];
  if (p?.action !== 'foundry') return p;
  const candidate = actor.foundryValidated === true, body = candidate ? actor.foundryBody : FOUNDRY_BASE_BODIES[actor.kind], m = FOUNDRY_MODEL_METADATA[body];
  if (!m || !candidate && (actor.foundryId || actor.foundryBody || actor.foundryAttack)) return null;
  const bodyLift = body === 'floating' ? .2 : body === 'geometric' ? .12 : 0;
  const fallbackPalette = candidate && Number.isSafeInteger(actor.visualSeed) ? (actor.visualSeed >>> 9) % 5 : ({latticeHunter:3,archiveBehemoth:1,riftGrazer:4})[actor.kind];
  const palette = Number.isSafeInteger(actor.foundryPalette) && actor.foundryPalette >= 0 && actor.foundryPalette < 5 ? actor.foundryPalette : fallbackPalette;
  return { ...p, body, modelKey: foundryModelKey(body, candidate ? actor.tentacles : 0), bodyLift, head:m.headZ, shot:bodyLift+m.actionZ, palette, locomotion:m.phase, candidate };
}
export const actorModelKey = actor => actorProfile(actor)?.modelKey || actor?.kind;
// Normal pack kits, movement-compatible hybrids, guardian kits and Fracture Warden modules.
export const PACK_ACTION_FAMILIES = Object.freeze({
  bite: 'bite', clawSweep: 'sweep', longStab: 'stab', sweepBeam: 'beam', groundRupture: 'slam',
  burrowAmbush: 'burrow', sigilScatter: 'curse', blinkStrike: 'teleport', mortarVolley: 'ranged', spikeVolley: 'ranged',
  webSpit: 'ranged', leapSlam: 'leap', phaseCharge: 'charge', ramCharge: 'charge', shockwave: 'slam',
  mirrorClones: 'summon', mirrorSwap: 'teleport', diveBomb: 'dive', firefall: 'ranged',
  devourPull: 'inhale', broodBirth: 'summon', fleshBloom: 'ranged', wispBewilder: 'howl', gorgeHowl: 'howl',
  // Adventure creatures' own modules (adventure-creatures.ts).
  ledgeDrop: 'leap', ledgeClimb: 'leap', vineVault: 'leap', vineRetreat: 'leap', censerLob: 'ranged', thornDarts: 'ranged', sinkFunnel: 'inhale', glassStrafe: 'dive',
  lampFlare: 'ranged', bellToll: 'slam', tendrilRain: 'ranged', membranePulse: 'howl', phaseStep: 'teleport', icicleLine: 'ranged', glideRake: 'charge', pendulumSwing: 'sweep', slagPour: 'ranged', heavySweep: 'sweep', poleThrust: 'stab', prismBeam: 'beam',
});
const PACK_PHASES = new Set(['windup', 'strike', 'active', 'recover', 'track', 'lock', 'travel', 'erupt', 'stunned']);
export function packActionPresentation(actor, modules, windupScale = 1.2, now = 0) {
  const s = actor?.pack, action = s?.attack, family = PACK_ACTION_FAMILIES[action];
  if (!family || !modules[action]) return null;
  const phase = s.phase, spec = modules[action];
  let duration = phase === 'windup' ? (spec.windup || .5) * (s.paced ? windupScale : 1)
    : phase === 'recover' ? spec.recover : phase === 'active' ? (action === 'sweepBeam' ? s.data?.total || spec.active * (actor.boss ? 1.25 : 1) : spec.active)
    : ({ strike: .32, track: 1, lock: .45, travel: 2.6, erupt: .75, stunned: 1.4 })[phase];
  if (action === 'ramCharge' && phase === 'recover' && actor.stunnedUntil > 0 && now >= actor.stunnedUntil && now < actor.stunnedUntil + 300) duration = .3;
  const progress = duration > 0 ? 1 - Math.min(1, Math.max(0, Number(s.t) || 0) / duration) : 0;
  const angle = action === 'sweepBeam' ? s.tele?.angle ?? s.data?.angle : null;
  const aim = Number.isFinite(angle) ? { x: Math.cos(angle), y: Math.sin(angle) } : s.data?.aim || null;
  return { action, family, phase, progress, aim, winding: phase === 'windup' || phase === 'strike',
    airborne: family === 'leap' && phase === 'active' || action === 'diveBomb' && ['windup', 'track', 'lock'].includes(phase), // every leap module (leapSlam and the adventure creatures' leaps)
    contact: phase === 'recover', active: phase === 'active', stunned: phase === 'stunned' };
}
export const PROJECTILE_VISUAL_HEIGHTS = Object.freeze(Object.fromEntries(Object.entries(ACTOR_PRESENTATION).map(([kind, p]) => [kind, p.shot])));
const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
const burrowing = (actor) => actor?.pack?.attack === 'burrowAmbush' && ['travel', 'erupt'].includes(actor.pack.phase);
export const presentationScale = (actor) => Math.max(.25, Math.min(4, finite(actor?.scale, 1)));
export function projectileVisualHeight(shooter, source = 'body') {
  if (source === 'drone') return DRONE_VISUAL_HEIGHT;
  const p = actorProfile(shooter);
  return p ? Math.min(8, (p.shot + (shooter.kind === 'cinderSeraph' && shooter.aloft ? .9 : 0)) * presentationScale(shooter)) : DEFAULT_PROJECTILE_VISUAL_HEIGHT;
}
export function shotVisualHeight(shot,age=shot?.age) {
  const flight=readProjectileVisualFlight(shot?.visualFlight);
  if(flight&&shot?.path==='grenade'){const u=Math.max(0,Math.min(1,finite(age,0)/flight.duration));return .66*(1-u)+.08*u+2.4*u*(1-u);}
  return Math.max(.05, Math.min(8, finite(shot?.visualHeight, DEFAULT_PROJECTILE_VISUAL_HEIGHT)));
}
export function actorPresentation(actor) {
  const p = actorProfile(actor);
  if (!p) return null;
  const scale = presentationScale(actor);
  const air = actor.kind === 'cinderSeraph' && actor.aloft ? .9 : 0;
  return { ...p, scale, bodyLift: (p.bodyLift + air) * scale, head: (p.bodyLift + air + p.head) * scale,
    alpha: Math.max(0, Math.min(1, (actor.hidden && (p.hidden || burrowing(actor)) ? 0 : 1) * (actor.phasing || actor.phases && actor.untargetable ? .45 : actor.kind === 'cinderSeraph' && actor.aloft ? .35 : 1) *
      (actor.illusion ? .92 : 1) * finite(actor.fleeFade, 1))), stagger: Math.max(0, Math.min(1, Math.max(finite(actor.poiseBreak, 0), actor.pack?.phase === 'stunned' ? finite(actor.pack.t, 0) / 1.4 : 0))) };
}
const AFFIXES = new Set(['volcanic', 'skyAssault', 'spiked', 'venomous', 'droneSwarm', 'enraged']);
// A body alone is insufficient. New families opt in only after their action and body-embedded effects are covered.
export function nativeCreatureCoverage(actor, capture, { mesh = true, attachments = false } = {}) {
  const p = actorProfile(actor);
  if (!p || !mesh) return 'body';
  if (!capture || capture.enemy !== actor) return 'capture';
  if (actor.hidden && !p.hidden && !burrowing(actor) || actor.gloomVeil || actor.dead) return 'visibility';
  if (actor.seaKind || actor.astral || actor.gateAttack || actor.foundryForm || actor.foundryAttack && p.action !== 'foundry' || actor.giantCloud || actor.roofWake > 0 || actor.mount) return 'special-form';
  if (p.action === 'foundry' && p.candidate) {
    if (!['hostile','boss','passive'].includes(actor.foundryRole)) return 'foundry-role';
    if (!FOUNDRY_ATTACKS.includes(actor.foundryAttack)) return 'foundry-action';
    if (!FOUNDRY_MOVEMENTS.includes(actor.foundryMovement)) return 'foundry-movement';
    const segments = p.body === 'segmented' ? 3 : actor.foundryRole === 'passive' ? 2 : 1;
    const tentacles = ['tentacled','biomechanical'].includes(p.body) ? actor.foundryRole === 'boss' ? 6 : 3 : 0;
    if (actor.segments !== segments || actor.tentacles !== tentacles) return 'morphology';
  }
  if (p.action === 'foundry' && !p.candidate && (actor.segments > 1 || actor.tentacles > 0)) return 'morphology';
  if (actor.packKind && (p.action !== 'pack' || typeof capture.nativePackEffects !== 'function')) return 'pack-effects';
  if (actor.pack && p.action !== 'pack') return 'pack-action';
  if (actor.pack?.attack && !PACK_ACTION_FAMILIES[actor.pack.attack]) return 'pack-action';
  if (actor.pack?.attack && !PACK_PHASES.has(actor.pack.phase)) return 'pack-phase';
  if (actor.eliteWindup > 0 || actor.eliteActive > 0) return 'elite-action';
  if (p.action !== 'foundry' && (actor.segments > 1 && actor.segments !== p.segments || actor.tentacles > 0 && actor.tentacles !== p.tentacles)) return 'morphology';
  const decorated = actor.fracRank || actor.fracWarden || actor.fracShaman || actor.warded || actor.affixes?.length || actor.poiseBreak > 0;
  if (decorated && (!p.decoration || typeof capture.nativeDecorations !== 'function' || typeof capture.nativeFloor !== 'function')) return 'decorations';
  if (actor.affixes?.some((id) => !AFFIXES.has(id))) return 'affix';
  if (actor.affixes?.includes('droneSwarm') && !attachments) return 'attachment-budget';
  return null;
}
