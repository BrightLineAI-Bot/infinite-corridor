// Pure player form facts and read-only selection. No mesh, Game or renderer dependencies.
const CLEAVER_RIGHT = Object.freeze({ grip: 'leftSocket', free: 'rightSocket' });
const LEGACY_HANDS = Object.freeze({ grip: 'rightSocket', free: 'leftSocket' });
// Source labels are retained. In the existing projection source-left is the
// displayed anatomical right. Resolve from the FINAL held owner, never equipment.
export function cleaverHandRoles(finalProfile, stage = null) {
  return finalProfile === 'verge-cleaver' && (!stage || stage.kind === 'cleaver-four') ? CLEAVER_RIGHT : LEGACY_HANDS;
}
const cutSmooth = x => { x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); };
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
  playerRobot: Object.freeze({ head: 1.48, lift: 0, pose: 'robot' }),
  playerPowerSuit: Object.freeze({ head: 1.39, lift: 0, pose: 'suit' }),
  playerEmberForm: Object.freeze({ head: 1.91, lift: 0, pose: 'ember' }),
});

export const PLAYER_FORM_HANDS = Object.freeze({
  playerIronFists: Object.freeze({ x:.22,y:-.35,z:.76,px:0,pz:1.20 }),
  playerRobot: Object.freeze({ x:.31,y:-.61,z:.72,px:-.03,pz:1.18 }),
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
