// Pure player form facts and read-only selection. No mesh, Game or renderer dependencies.
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
