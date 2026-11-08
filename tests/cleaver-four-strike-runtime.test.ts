import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { migrateSave } from '../src/types.ts';
import { advancePrimaryCombo, normalizeAttackVisual, normalizePrimaryCombo, normalizePrimaryMotion, primaryCarryStage, primaryVisualStage } from '../src/action-motion.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';
import { createCombatant } from '../src/combat.ts';

const clone = <T>(value:T):T => JSON.parse(JSON.stringify(value));
const cleaver = () => ({ id:'primary-verge-cleaver', name:'Verge Cleaver', slot:'primary', power:5, property:'impact' });
const pike = () => ({ id:'primary-cinder-pike', name:'Cinder Pike', slot:'primary', power:5, property:'reach' });
function fixture(kind:'cleaver'|'pike'='cleaver') {
  const g:any=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000}).game;
  g.enemies=[]; g.save.equipment.primary=kind==='cleaver'?cleaver():pike(); g.save.lastAim={x:1,y:0};
  return g;
}

test('pure v2 motion, stage and carry helpers preserve legacy and opaque provenance',()=>{
  assert.deepEqual(normalizePrimaryMotion({v:2,step:4,future:7}),{v:2,step:4,future:7});
  for(const raw of [null,{}, {v:2,step:0},{v:2,step:5},{v:2,step:2.5},{v:1,step:1}])assert.equal(normalizePrimaryMotion(raw),null);
  assert.deepEqual(normalizePrimaryMotion({v:3,future:{kept:true}}),{v:3,future:{kept:true}});
  assert.deepEqual(primaryVisualStage({primaryMotion:{v:2,step:1}}),{kind:'cleaver-four',step:1,direction:1});
  assert.deepEqual(primaryVisualStage({primaryMotion:{v:2,step:4}}),{kind:'cleaver-four',step:4,direction:-1});
  assert.deepEqual(primaryVisualStage({primaryStep:3}),{kind:'legacy',step:3});
  assert.deepEqual(primaryVisualStage({primaryMotion:{v:9,future:true}}),{kind:'opaque'});
  assert.deepEqual(primaryCarryStage({primaryMotion:{v:2,step:4}},null,true),{kind:'cleaver-four',step:4,direction:-1});
  assert.deepEqual(primaryCarryStage({weaponKind:'verge-cleaver'},null,true),{kind:'legacy',step:1},'supported old no-step active records retain legacy carry');
  assert.equal(primaryCarryStage({primaryMotion:{v:2,step:4}},null),null,'inactive records cannot invent carry provenance');
  assert.deepEqual(primaryCarryStage(null,{weaponKind:'verge-cleaver',step:2,future:8}),{kind:'legacy',step:2});
  assert.deepEqual(primaryCarryStage(null,{weaponKind:'verge-cleaver',v:2,step:3}),{kind:'cleaver-four',step:3,direction:1});
  assert.deepEqual(primaryCarryStage(null,{weaponKind:'verge-cleaver',v:5,step:99}),{kind:'opaque'});
  assert.equal(primaryCarryStage(null,{weaponKind:'cinder-pike',step:2}),null);
});

test('six accepted Cleaver presses stamp 1/2/3/4/1/2 while refusal, Echo and clone paths never advance',()=>{
  const g=fixture(),steps:number[]=[],foe:any=Object.assign(createCombatant('rootBrute',g.player.x+1,g.player.y),{hp:10000,maxHp:10000,damage:0,cooldown:99});g.enemies=[foe];let canonical:any=null;
  for(let n=0;n<6;n++){
    const now=100000+n*500,hp=foe.hp,hits=g.primaryAttack(now);assert.equal(hits.filter((q:any)=>q===foe).length,1);assert.ok(foe.hp<hp);
    const mechanics={damage:hp-foe.hp,cooldown:g.player.attackReadyAt-now,strike:clone(g.player.meleeStrike),range:g.attackProfile.range,arc:g.attackProfile.arc};if(!canonical)canonical=mechanics;else assert.deepEqual(mechanics,canonical,'presentation stage cannot change canonical damage, cooldown, reach or strike geometry');
    assert.equal(g.player.attackVisual.primaryStep,undefined);steps.push(g.player.attackVisual.primaryMotion.step);
    const combo=clone(g.player.primaryCombo),visual=clone(g.player.attackVisual),ready=g.player.attackReadyAt;
    assert.deepEqual(g.primaryAttack(now+1),[]);assert.deepEqual(g.player.primaryCombo,combo);assert.deepEqual(g.player.attackVisual,visual);assert.equal(g.player.attackReadyAt,ready);
    g.primaryStrike(now+80,null,{share:.25});assert.deepEqual(g.player.primaryCombo,combo);assert.deepEqual(g.player.attackVisual,visual);
    g.shadowClone={ox:-1,oy:0,until:now+1000};g.cloneSwing({range:1.75,arc:180,damage:1},{x:1,y:0},now+90);assert.deepEqual(g.player.primaryCombo,combo);
  }
  assert.deepEqual(steps,[1,2,3,4,1,2]);
});

test('Pike remains three-stage and family switches restart without changing Fists state',()=>{
  const g=fixture('pike'),steps=[];for(let n=0;n<4;n++){g.primaryAttack(100000+n*500);steps.push(g.player.attackVisual.primaryStep);assert.equal(g.player.attackVisual.primaryMotion,undefined);}assert.deepEqual(steps,[1,2,3,1]);
  g.save.equipment.primary=cleaver();g.primaryAttack(102000);assert.equal(g.player.attackVisual.primaryMotion.step,1);assert.deepEqual(g.player.primaryCombo,{weaponKind:'verge-cleaver',v:2,step:1});
  const player:any={primaryCombo:{weaponKind:'verge-cleaver',v:2,step:4,future:9}};assert.equal(advancePrimaryCombo(player,'verge-cleaver'),1);assert.deepEqual(player.primaryCombo,{weaponKind:'verge-cleaver',v:2,step:1,future:9});
});

test('all four Cleaver stages and committed phases round-trip through both runtime writers with unknown fields',()=>{
  for(const step of [1,2,3,4])for(const phase of [0,60,120,239])for(const paused of [false,true]){
    const g=fixture();for(let n=1;n<=step;n++)g.primaryAttack(100000+(n-1)*500);
    g.player.attackVisual.future={kept:step};g.player.attackVisual.primaryMotion.futureMotion={kept:true};g.player.primaryCombo.futureCombo={kept:true};
    const at=100000+(step-1)*500+phase;if(paused)g.setPaused(true,at);
    const saved=migrateSave(clone(g.exportSnapshot(at))),back:any=new Game(saved,200000);
    assert.deepEqual(back.player.attackVisual.primaryMotion,{v:2,step,futureMotion:{kept:true}});assert.equal(back.player.attackVisual.future.kept,step);
    assert.deepEqual(back.player.primaryCombo,{weaponKind:'verge-cleaver',v:2,step,futureCombo:{kept:true}});assert.equal(back.paused,paused);
    assert.deepEqual(saved.session.playerRuntime.attackVisual.primaryMotion,back.player.attackVisual.primaryMotion);
  }
});

test('legacy three-stage Cleaver carries until the next accepted v2 cut; future records stay opaque',()=>{
  const old:any=fixture();old.player.primaryCombo={weaponKind:'verge-cleaver',step:3,legacyUnknown:7};old.player.attackVisual={profile:'melee',durationMs:240,weaponKind:'verge-cleaver',primaryStep:3};old.player.actionVisualUntil=100240;
  const saved=migrateSave(clone(old.exportSnapshot(100120))),back:any=new Game(saved,200000);assert.deepEqual(primaryCarryStage(back.player.attackVisual,back.player.primaryCombo),{kind:'legacy',step:3});
  back.player.attackReadyAt=0;back.primaryAttack(200001);assert.deepEqual(back.player.attackVisual.primaryMotion,{v:2,step:1});assert.equal(back.player.attackVisual.primaryStep,undefined);assert.equal(back.player.primaryCombo.legacyUnknown,7);
  const futureVisual={profile:'melee',durationMs:240,weaponKind:'verge-cleaver',primaryMotion:{v:7,step:99,future:true}};assert.deepEqual(normalizeAttackVisual(futureVisual),futureVisual);
  assert.deepEqual(normalizePrimaryCombo({weaponKind:'verge-cleaver',v:7,step:99,future:true}),{weaponKind:'verge-cleaver',v:7,step:99,future:true});
  const opaque:any=fixture();opaque.player.attackVisual=futureVisual;opaque.player.actionVisualUntil=100240;opaque.player.primaryCombo={weaponKind:'verge-cleaver',v:7,step:99,futureCombo:{kept:true}};
  const opaqueSave=migrateSave(clone(opaque.exportSnapshot(100120))),opaqueBack:any=new Game(opaqueSave,300000);assert.deepEqual(opaqueBack.player.attackVisual,futureVisual);assert.deepEqual(opaqueBack.player.primaryCombo,opaque.player.primaryCombo);assert.deepEqual(opaqueBack.exportSnapshot(300001).session.playerRuntime.primaryCombo,opaque.player.primaryCombo);
});

test('queued Echo freezes v2 motion metadata and never advances the live combo or body',()=>{
  const g=fixture();g.save.equipment.primary=normalizeSockets({...cleaver(),tier:'relic',affixes:[]});g.save.glyphs.echo=1;assert.equal(socketGlyph(g.save,'melee',0,'echo').ok,true);
  const foe:any=Object.assign(createCombatant('rootBrute',g.player.x+1,g.player.y),{hp:10000,maxHp:10000,damage:0,cooldown:99});g.enemies=[foe];g.primaryAttack(100000);
  const timer=g.glyphTimers.find((q:any)=>q.kind==='strike'),combo=clone(g.player.primaryCombo),visual=clone(g.player.attackVisual);assert.ok(timer);assert.deepEqual(timer.echoVisual.primaryMotion,{v:2,step:1});
  g.player.attackVisual.primaryMotion.step=4;assert.deepEqual(timer.echoVisual.primaryMotion,{v:2,step:1},'queued memory is immutable from later live mutation');
  g.tickGlyphs(0,timer.at);assert.deepEqual(g.player.primaryCombo,combo);assert.equal(g.player.attackVisual.primaryMotion.step,4);const cue=g.glyphVisuals.find((v:any)=>v.kind==='primaryEcho');assert.deepEqual(cue.memory.primaryMotion,{v:2,step:1});assert.deepEqual(visual.primaryMotion,{v:2,step:1});
});
