// Narrow natural Astral/Walker reservation. Probabilities and mount rate are provisional tuning.
import { hashSeed } from './random.js?v=r463-cc5363170610';
import { ASTRAL, astralWalkerPair } from './astral-worm.js?v=r463-cc5363170610';
export const ASTRAL_PAIR = Object.freeze({ mountedShare: .35, actorReserve: 4 });
const present = (a,scene) => a && (scene.dungeon ? a.dungeon===scene.dungeon && (!a.dungeonLevel||a.dungeonLevel===scene.level) : !a.dungeon&&a.rx===scene.rx&&a.ry===scene.ry);
const roll = key => (hashSeed(key)%100000)/100000;
export function astralCompanionFor(save,main,scene,actorCount) {
  if(main?.worldBeast!=='astralWorm'||main.retreating)return null;
  const worm=save.worldBeasts?.astralWorm,walker=save.worldBeasts?.voidWalker,a=worm?.active;
  if(!a||!walker)return null;
  if(!a.astralPair) {
    const available=!walker.active&&walker.cooldown===0&&actorCount<ASTRAL.maxActorArray-ASTRAL_PAIR.actorReserve;
    const alignment=astralWalkerPair(roll(`${save.seed}:astral-pair:v1:${worm.cycle}`),{walkerAvailable:available});
    a.astralPair={v:1,alignment,walkerId:alignment?`world-beast:voidWalker:${walker.cycle}`:null,mount:alignment==='hostile'&&roll(`${save.seed}:astral-mount:v1:${worm.cycle}`)<ASTRAL_PAIR.mountedShare,mountStarted:false};
    // The three tries count from the first monster met: a joining Walker inherits the Worm's spent tries.
    if(alignment)walker.active={...(scene.dungeon?{dungeon:scene.dungeon,dungeonLevel:scene.level}:{rx:scene.rx,ry:scene.ry}),tries:Number(a.tries)||0,astralPairOf:main.id,astralRole:alignment,...(alignment==='hostile'?{astralJoined:true}:{})};
  }
  const pair=a.astralPair;
  if(!pair.alignment||!present(walker.active,scene)||walker.active.astralPairOf!==main.id||actorCount>=ASTRAL.maxActorArray-ASTRAL_PAIR.actorReserve)return null;
  return {id:pair.walkerId,kind:'voidWalker',x:main.x,y:main.y,boss:true,traits:[],worldBeast:pair.alignment==='hostile'?'voidWalker':undefined,
    astralCompanionOf:main.id,astralRole:pair.alignment,astralAllyOf:pair.alignment==='ally'?main.id:undefined,noRewards:pair.alignment==='ally',astralMountWanted:pair.mount&&!pair.mountStarted};
}
// Called only on active loaded ticks or an explicit terminal transition. No generic failure counter.
export function reconcileAstralCompanions(game) {
  const state=game.save.worldBeasts?.astralWorm;
  const walker=game.save.worldBeasts?.voidWalker;
  if(walker?.active?.astralRole==='ally' && (!state?.active || state.active.retreat || state.active.astralRetreat))walker.active=null;
  for(const e of game.enemies)if(e.astralCompanionOf) {
    const owner=game.enemies.find(q=>q.id===e.astralCompanionOf);
    if(e.astralRole==='ally') {
      if(e.dead||e.hp<=0||!owner||owner.dead||owner.retreating||owner.fleeTo||!state?.active||(game.astralPlayerFell?game.astralPlayerFell():game.player.hp<=0)) {
        e.dead=true;e.noRewards=true;e.astralAllyEffects=[];
        if(walker?.active?.astralPairOf===e.astralCompanionOf)walker.active=null;
      }
    } else if(!state?.active||!owner||owner.dead||owner.retreating||owner.fleeTo) {
      // A surviving hostile Walker remains an ordinary independent hunt, with the SAME HP/tries.
      if(walker?.active?.astralPairOf===e.astralCompanionOf){delete walker.active.astralPairOf;delete walker.active.astralRole;}
    }
    if(e.astralMountWanted&&owner&&!owner.dead&&!owner.retreating) {
      if((game.boardAstralWalker||game.mountAstralFixture).call(game,owner,e)) { e.astralMountWanted=false;if(state?.active?.astralPair)state.active.astralPair.mountStarted=true; }
    }
  }
}
