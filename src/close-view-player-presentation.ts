// Pure player form facts and read-only selection. No mesh, Game or renderer dependencies.
const CLEAVER_RIGHT = Object.freeze({ grip: 'leftSocket', free: 'rightSocket' });
const LEGACY_HANDS = Object.freeze({ grip: 'rightSocket', free: 'leftSocket' });
// Source labels are retained. In the existing projection source-left is the
// displayed anatomical right. Resolve from the FINAL held owner, never equipment.
export function cleaverHandRoles(finalProfile, stage = null) {
  return finalProfile === 'verge-cleaver' && (!stage || stage.kind === 'cleaver-four') ? CLEAVER_RIGHT : LEGACY_HANDS;
}
const cutSmooth = x => { x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); };
const unit = value => Math.max(0, Math.min(1, Number(value)||0));
// Accepted Stage 10b descriptors share one contact clock across native, imported and
// reduced-motion presentation.  This sampler is deliberately geometry-only so the
// renderer can also use it for a bounded weapon trail without inventing another timer.
export function sampleMeleeActionPose(action, progress = 0, variant = 1, fistLead = 'right') {
  const cleaver=action?.v===1&&action.kind==='verge-cleaver'&&action.move==='cleaver';
  const fists=action?.v===1&&action.kind==='iron-fists'&&['dash','jab','uppercut'].includes(action.move);
  const duration=Number(action?.durationMs),contactMs=Number(action?.contactMs);
  if((!cleaver&&!fists)||!Number.isFinite(duration)||duration<=0||!Number.isFinite(contactMs)||contactMs<0||contactMs>duration)return null;
  const p=unit(progress),contact=unit(contactMs/duration),before=contact>0?cutSmooth(p/contact):1;
  const followEnd=Math.min(1,contact+Math.max(.12,(1-contact)*.38));
  const follow=p<=contact?0:cutSmooth((p-contact)/Math.max(.001,followEnd-contact));
  const recovery=p<=followEnd?0:cutSmooth((p-followEnd)/Math.max(.001,1-followEnd));
  const weight=(p<=contact?before:1-recovery),drive=before*(1-.28*follow)*(1-recovery);
  const step=Math.max(1,Math.min(4,Math.trunc(Number(variant))||1));
  const up=step===1||step===3,diagonal=step>2?-1:1;
  const travel = p <= contact ? .72 * before : Math.min(1, .72 + .28 * follow);
  const openingLead=fistLead==='left'?-1:1,lead=action.move==='jab'?-openingLead:openingLead;
  return Object.freeze({kind:action.kind,move:action.move,progress:p,contact,phase:p<contact?'windup':p<=followEnd?'follow-through':'recovery',weight,drive,recovery,lead,openingLead,cutIndex:step,
    pitch:cleaver?(up?-.72+1.54*travel:.82-1.54*travel):0,
    yaw:cleaver?diagonal*(.30-.62*travel):0,rise:cleaver?(up?travel:1-travel):0,
    side:cleaver?diagonal*(.13-.27*travel):0,twist:cleaver?diagonal*(.22-.44*travel)*weight:lead*(action.move==='uppercut'?.30:.18)*weight});
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
  playerRobot: Object.freeze({ x:.29,y:-.63,z:.70,px:-.04,pz:1.17 }),
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
