// Pure player form facts and read-only selection. No mesh, Game or renderer dependencies.
const RIGHT_HAND = Object.freeze({ grip: 'leftSocket', free: 'rightSocket' });
const LEFT_HAND = Object.freeze({ grip: 'rightSocket', free: 'leftSocket' });
// Close View held gear, presentation only (Tim, 2026-11-11: every sword in the left hand,
// guns and tools in the right, tools a little smaller, Rift Bombard and Blunderbuss held
// two-handed like a rifle while firing). `hand` is the DISPLAYED anatomical hand. Source
// labels are retained: in the existing projection source-left (leftSocket, native swing +2,
// recipe/model +Y) is the displayed anatomical right, so a right-hand item uses leftSocket.
// `scale` multiplies the imported .82 recipe conversion and the native baked tool recipe.
// `grip`: 'one' one-handed, 'rifle' trigger hand plus a support hand under the barrel while
// firing, 'pike' the existing two-handed polearm frame.
export const CLOSE_VIEW_HELD_GEAR = Object.freeze({
  melee: Object.freeze({ hand: 'left', scale: 1, grip: 'one' }),
  'salvage-blade': Object.freeze({ hand: 'left', scale: 1, grip: 'one' }),
  'verge-cleaver': Object.freeze({ hand: 'left', scale: 1, grip: 'one' }),
  'cinder-pike': Object.freeze({ hand: 'left', scale: 1, grip: 'pike' }),
  'great-sweep': Object.freeze({ hand: 'left', scale: 1, grip: 'one' }),
  mirage: Object.freeze({ hand: 'left', scale: 1, grip: 'one' }),
  emitter: Object.freeze({ hand: 'right', scale: .8, grip: 'one' }),
  'spark-coil': Object.freeze({ hand: 'right', scale: .8, grip: 'one' }),
  'needle-caster': Object.freeze({ hand: 'right', scale: .8, grip: 'one' }),
  'lumen-spindle': Object.freeze({ hand: 'right', scale: .8, grip: 'one' }),
  'rift-bombard': Object.freeze({ hand: 'right', scale: .78, grip: 'rifle' }),
  blunderbuss: Object.freeze({ hand: 'right', scale: .8, grip: 'rifle' }),
  hammer: Object.freeze({ hand: 'right', scale: .85, grip: 'one' }),
  'orrery-tap': Object.freeze({ hand: 'right', scale: .85, grip: 'one' }),
  'orrery-release': Object.freeze({ hand: 'right', scale: .85, grip: 'one' }),
});
// Rifle-grip tuning (imported source space, metres of the fitted rig; native recipe radians).
// raise: added to the accepted tool motion's shoulder-relative target (negative up lowers it) (side is toward the
// body's centre line), weighted by its raise envelope. support: the point the support hand
// takes, along the barrel from the grip in recipe units (.79 = grip) and below it.
export const CLOSE_VIEW_RIFLE_GRIP = Object.freeze({
  // Tim 2026-11-11: the Bombard is held low, two hands on it down by the hip/waist, muzzle forward.
  'rift-bombard': Object.freeze({ raise: Object.freeze([.07, -.26, -.12]), pitch: 0, support: Object.freeze([1.20, .045]), supportYaw: .55, supportPitch: -.35, nativeRaise: -.35, nativeReach: .92, nativeInward: .55 }),
  blunderbuss: Object.freeze({ raise: Object.freeze([.11, .19, -.06]), pitch: .10, support: Object.freeze([1.22, .04]), supportYaw: .55, supportPitch: -.35, nativeRaise: .28, nativeReach: .92, nativeInward: .55 }),
});
export const closeViewHeldGear = (profile) => Object.hasOwn(CLOSE_VIEW_HELD_GEAR, profile) ? CLOSE_VIEW_HELD_GEAR[profile] : null;
export const closeViewHeldHand = (profile) => closeViewHeldGear(profile)?.hand ?? 'left';
export const closeViewHeldScale = (profile) => closeViewHeldGear(profile)?.scale ?? 1;
// Which socket holds the FINAL held owner and which hand is free. Unknown profiles keep the
// established left-hand (source rightSocket) grip. `stage` is accepted for older callers;
// every Verge Cleaver record now resolves to the same left-hand grip.
export function closeViewHandRoles(finalProfile) {
  return closeViewHeldHand(finalProfile) === 'right' ? RIGHT_HAND : LEFT_HAND;
}
export function cleaverHandRoles(finalProfile, stage = null) {
  return closeViewHandRoles(finalProfile);
}
const cutSmooth = x => { x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); };
const unit = value => Math.max(0, Math.min(1, Number(value)||0));
export function sampleDrinkPose(phase=0,reducedMotion=false,out={}) {
  const p=unit(phase),lift=p<.34?cutSmooth(p/.34):p<.66?1:1-cutSmooth((p-.66)/.34);
  out.weight=lift;out.sip=p>=.34&&p<=.66?cutSmooth((p-.34)/.12)*(1-cutSmooth((p-.54)/.12)):0;
  out.arm=lift*(reducedMotion?.72:1);out.head=lift*(reducedMotion?.55:1);return out;
}
export function cacheReachWeight(phase, reducedMotion = false) {
  const p = unit(phase);
  const reach = p < .38 ? cutSmooth(p / .38) : p < .57 ? 1 : 1 - cutSmooth((p - .57) / .43);
  return reach * (reducedMotion ? .6 : 1);
}
export function chestOpenWeight(phase, reducedMotion = false) {
  const p = unit(phase);
  const reach = p < .32 ? cutSmooth(p / .32) : p < .65 ? 1 : 1 - cutSmooth((p - .65) / .35);
  return reach * (reducedMotion ? .6 : 1);
}
export function sampleShovelDigPose(phase, reducedMotion = false, out = {}) {
  const p=unit(phase),down=cutSmooth(p/.34),recover=cutSmooth((p-.68)/.32),hold=down*(1-recover),lever=cutSmooth((p-.34)/.20)*(1-cutSmooth((p-.58)/.10)),scale=reducedMotion?.68:1;
  out.weight=hold*scale;out.down=down*(1-recover)*scale;out.lever=lever*scale;out.recover=recover;return out;
}
export function stonePlaceWeight(phase, reducedMotion = false) {
  const p=unit(phase),weight=p<.38?cutSmooth(p/.38):1-cutSmooth((p-.58)/.42);
  return weight*(reducedMotion?.62:1);
}
// Accepted Stage 10b descriptors share one contact clock across native, imported and
// reduced-motion presentation.  This sampler is deliberately geometry-only so the
// renderer can also use it for a bounded weapon trail without inventing another timer.
export function sampleMeleeActionPose(action, progress = 0, variant = 1, fistLead = 'right') {
  const cleaver=action?.v===1&&action.kind==='verge-cleaver'&&action.move==='cleaver';
  const quickCleaver=action?.v===2&&action.kind==='verge-cleaver'&&action.move==='cleaver';
  const fists=action?.v===1&&action.kind==='iron-fists'&&['dash','jab','uppercut'].includes(action.move);
  const duration=Number(action?.durationMs),contactMs=Number(action?.contactMs);
  if((!cleaver&&!quickCleaver&&!fists)||!Number.isFinite(duration)||duration<=0||!Number.isFinite(contactMs)||contactMs<0||contactMs>duration)return null;
  const p=unit(progress),contact=unit(contactMs/duration),before=contact>0?cutSmooth(p/contact):1;
  const followEnd=Math.min(1,contact+Math.max(.12,(1-contact)*.38));
  const follow=p<=contact?0:cutSmooth((p-contact)/Math.max(.001,followEnd-contact));
  const recovery=p<=followEnd?0:cutSmooth((p-followEnd)/Math.max(.001,1-followEnd));
  const weight=(p<=contact?before:1-recovery),drive=before*(1-.28*follow)*(1-recovery);
  const step=Math.max(1,Math.min(4,Math.trunc(Number(variant))||1));
  const up=step===1||step===3,diagonal=quickCleaver?(step===2?-1:1):(step>2?-1:1);
  const travel = p <= contact ? .72 * before : Math.min(1, .72 + .28 * follow);
  const openingLead=fistLead==='left'?-1:1,lead=action.move==='jab'?-openingLead:openingLead;
  return Object.freeze({kind:action.kind,actionVersion:action.v,move:action.move,progress:p,contact,phase:p<contact?'windup':p<=followEnd?'follow-through':'recovery',weight,drive,recovery,lead,openingLead,cutIndex:step,
    pitch:quickCleaver?(.10-.18*travel):cleaver?(up?-.72+1.54*travel:.82-1.54*travel):0,
    yaw:(cleaver||quickCleaver)?diagonal*(.30-.62*travel):0,rise:quickCleaver?.18+.12*travel:cleaver?(up?travel:1-travel):0,
    side:(cleaver||quickCleaver)?diagonal*(.13-.27*travel):0,twist:(cleaver||quickCleaver)?diagonal*(.22-.44*travel)*weight:lead*(action.move==='uppercut'?.30:.18)*weight});
}
export function cleaverCutMotion(stage, phase = 0) {
  const p = Math.max(0, Math.min(1, Number(phase)||0)), step = stage?.kind === 'cleaver-four' ? stage.step : 1;
  const weight = p < .12 ? cutSmooth(p/.12) : p <= .40 ? 1 : 1-cutSmooth((p-.40)/.60);
  const travel = cutSmooth((p-.12)/.28), up = step === 1 || step === 3, variant = step > 2 ? -1 : 1;
  return { weight, travel, pitch: (up ? -.62+1.40*travel : .78-1.40*travel),
    yaw: variant*(.28-.56*travel), rise: up ? travel : 1-travel,
    side: variant*(.12-.24*travel), twist: variant*(.18-.36*travel)*weight };
}
export const CLOSE_VIEW_PLAYER_FORM_PROFILES = Object.freeze({
  playerIronFists: Object.freeze({ head: 1.68, lift: 0, pose: 'fist' }),
  playerRobot: Object.freeze({ head: 1.49, lift: 0, pose: 'robot' }),
  playerPowerSuit: Object.freeze({ head: 1.68, lift: 0, pose: 'suit' }),
  playerEmberForm: Object.freeze({ head: 1.91, lift: 0, pose: 'ember' }),
});

export const PLAYER_FORM_HANDS = Object.freeze({
  playerIronFists: Object.freeze({ x:.22,y:-.35,z:.76,px:0,pz:1.20 }),
  playerRobot: Object.freeze({ x:.24,y:-.73,z:.54,px:0,pz:.96 }),
  playerPowerSuit: Object.freeze({ x:.14,y:-.27,z:.82,px:0,pz:1.18 }),
  playerEmberForm: Object.freeze({ x:.24,y:-.46,z:.84,px:0,pz:1.48 }),
});
export const PLAYER_HELD_PROFILES = Object.freeze(['melee','fist','emitter','hammer','sweep','mirage','orrery-tap','orrery-release']);
const CANONICAL_TOOL_FORM_PROFILE = Object.freeze({
  'rift-bombard': 'emitter',
  blunderbuss: 'emitter',
  'lumen-spindle': 'emitter',
  'great-sweep': 'sweep',
});
export function playerFormPresentation(game) {
  const save=game?.save||{},mech=typeof game?.mechUp==='function'?game.mechUp():save.mech?.active===true&&save.mech.mode!=='drone'&&!save.boat?.aboard;
  const fists=!!game?.fistsEquipped?.(),active=save.magicSkills?.active,ember=active?.id==='ember-form'&&active.remaining>0;
  const kind=mech?save.mech?.empowered===true?'playerPowerSuit':'playerRobot':ember?'playerEmberForm':fists?'playerIronFists':null;
  if(!kind)return null;
  const profile=CLOSE_VIEW_PLAYER_FORM_PROFILES[kind];
  // The authored Ember body is already taller. Preserve the source's rank-dependent final growth once.
  const scale=kind==='playerEmberForm'?(1.25+.05*Math.max(1,Math.min(3,Number(active.rank)||1)))*1.68/profile.head:kind==='playerRobot'?1.12:1;
  return {...profile,kind,scale,head:profile.head*.82*scale,lift:mech&&game.mechBoosting===true?.22:0,mech,fists,empowered:mech&&save.mech?.empowered===true};
}
export function playerFormModelKey(form,held='melee') {
  const profile=['salvage-blade','cinder-pike','verge-cleaver'].includes(held)?'melee':CANONICAL_TOOL_FORM_PROFILE[held]||held;
  return form&&PLAYER_HELD_PROFILES.includes(profile)?`${form.kind}:${profile}`:form?.kind||null;
}

// Read-only ordinary-air handoff. Lift is supplied by the existing capture producer;
// this descriptor neither lifts the body nor changes traversal/support clocks.
export function ordinaryJumpPresentation(game, now, lift, baseMs) {
  const g=game,p=g?.player,clock=g?.paused&&Number.isFinite(g.pauseStarted)?g.pauseStarted:now;
  if(!p||!(p.hp>0)||!Number.isFinite(clock)||!Number.isFinite(g.jumpUntil)||!(g.jumpUntil>clock)||!Number.isFinite(lift)||lift<0||!Number.isFinite(baseMs)||baseMs<=0)return null;
  if(g.droneLift||g.mechBoosting||g.glide||g.swimming||g.save?.boat?.aboard||g.mountRide?.()||g.mechUp?.()||g.droneUp?.())return null;
  const form=playerFormPresentation(g);if(form&&form.kind!=='playerIronFists')return null;
  if(clock<(p.stunnedUntil||0)||clock<(p.dodgeUntil||0))return null;
  const durationMs=Number.isFinite(g.jumpDur)&&g.jumpDur>0?g.jumpDur:baseMs;
  if(g.jumpStart!=null&&(!Number.isFinite(g.jumpStart)||g.jumpStart>clock))return null;
  const start=Number.isFinite(g.jumpStart)?g.jumpStart:g.jumpUntil-durationMs;
  const elapsedMs=clock-start,remainingMs=g.jumpUntil-clock;
  if(elapsedMs<0||remainingMs>durationMs+1e-6)return null;
  return {v:1,elapsedMs,remainingMs,durationMs,lift,rise:Math.min(1,elapsedMs/(baseMs*.5)),fall:Math.max(0,1-remainingMs/(baseMs*.5))};
}

// Read-only touchdown handoff: the short absorb after an ordinary jump, read from the jump's own
// finished clock (jumpUntil). No new timer or state; null outside the window or in any other mode.
export const ORDINARY_LANDING_MS = 220;
export function ordinaryLandingPresentation(game, now) {
  const g=game,p=g?.player,clock=g?.paused&&Number.isFinite(g.pauseStarted)?g.pauseStarted:now;
  if(!p||!(p.hp>0)||!Number.isFinite(clock)||!Number.isFinite(g.jumpUntil)||!Number.isFinite(g.jumpStart)||!(g.jumpStart<g.jumpUntil))return null;
  const age=clock-g.jumpUntil;if(!(age>=0&&age<ORDINARY_LANDING_MS))return null;
  if(g.droneLift||g.mechBoosting||g.glide||g.swimming||g.save?.boat?.aboard||g.mountRide?.()||g.mechUp?.()||g.droneUp?.())return null;
  const form=playerFormPresentation(g);if(form&&form.kind!=='playerIronFists')return null;
  if(clock<(p.stunnedUntil||0)||clock<(p.dodgeUntil||0))return null;
  return age/ORDINARY_LANDING_MS;
}

// Read-only defeat handoff for the ordinary on-foot body. The short ordinary
// death beat supplies the authored motion clock; a longer fallen window keeps
// its endpoint instead of stretching or replaying the fall.
export function ordinaryDefeatPresentation(game, now) {
  const player = game?.player, fallen = game?.fallen;
  const clock = game?.paused && Number.isFinite(game.pauseStarted) ? game.pauseStarted : now;
  if (!fallen || player?.hp !== 0 || !Number.isFinite(clock) ||
      !Number.isFinite(player.stunnedAt) || !Number.isFinite(fallen.until)) return null;
  if (game.save?.boat?.aboard || game.mountRide?.()) return null;
  const form = playerFormPresentation(game);
  if (form && form.kind !== 'playerIronFists') return null;
  const windowMs = fallen.until - player.stunnedAt;
  const beatMs = game.deathBeat * 1000;
  const durationMs = Number.isFinite(beatMs) && beatMs > 0 ? Math.min(windowMs, beatMs) : windowMs;
  if (!(durationMs > 0)) return null;
  return { amount: unit((clock - player.stunnedAt) / durationMs), durationMs };
}
