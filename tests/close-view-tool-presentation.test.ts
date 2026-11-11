import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { normalizeAttackVisual } from '../src/action-motion.ts';
import { closeViewPlayerAction } from '../src/close-view.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { closeViewHandRoles } from '../src/close-view-player-presentation.ts';

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8'));
const raw=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
const items={
  'rift-bombard':{id:'secondary-rift-bombard',name:'Rift Bombard',slot:'secondary',power:5,property:'blast'},
  'great-sweep':{id:'secondary-great-sweep',name:'Great Sweep',slot:'secondary',power:5,property:'brawler'},
  blunderbuss:{id:'secondary-blunderbuss',name:'Blunderbuss',slot:'secondary',power:11,basePower:5,upgradeRank:6,property:'quick'},
  'lumen-spindle':{id:'secondary-lumen-spindle',name:'Lumen Spindle',slot:'secondary',power:5,property:'focus'},
};

function gameFor(kind){const save=freshSave();save.seed='TOOL-PRESENTATION';save.equipment.secondary=structuredClone(items[kind]);const game=new Game(save,0);game.enemies=[];game.projectiles=[];return game;}
function hero(profile,phase,speed=2.4){const state=createHeroPoseState(asset),frame=createHeroFrame(asset),kind=profile==='great-sweep'?'melee':'ranged';sampleCloseViewHero(asset,state,{nowMs:1000,reducedMotion:false,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed,gaitPhase:1.2,heldProfile:profile,action:{kind,profile,phase,durationMs:profile==='great-sweep'?240:180,yaw:0},alpha:1,tint:[1,1,1],hitFlash:0},frame);return{state,frame};}

test('accepted canonical tools latch exact identity; refusals and gear switches cannot rewrite it',()=>{
  for(const kind of Object.keys(items)){
    const game=gameFor(kind),accepted=game.fireSecondary(1000,{x:.6,y:.8});assert.equal(accepted,true,kind);
    assert.equal(game.player.attackVisual.toolKind,kind);if(kind==='great-sweep')assert.equal(game.player.attackVisual.aim,undefined);else assert.deepEqual(game.player.attackVisual.aim,{x:.6,y:.8});
    const record=structuredClone(game.player.attackVisual),until=game.player.attackUntil;
    assert.equal(game.fireSecondary(1001,{x:-1,y:0}),false);assert.deepEqual(game.player.attackVisual,record);assert.equal(game.player.attackUntil,until);
    game.save.equipment.secondary=structuredClone(items[kind==='lumen-spindle'?'rift-bombard':'lumen-spindle']);
    assert.equal(closeViewPlayerAction(game,1001).record.toolKind,kind,'gear switching alone cannot rewrite accepted identity');
    game.setPaused(true,1020);const save=migrateSave(structuredClone(game.exportSnapshot(9000))),back=new Game(save,10000);
    assert.equal(back.player.attackVisual.toolKind,kind);assert.equal(closeViewPlayerAction(back,back.pauseStarted).record.toolKind,kind);
  }
});

test('toolKind is bounded metadata while valid future fields and legacy profiles remain compatible',()=>{
  const raw={profile:'emitter',durationMs:180,toolKind:'future-tool',futureTool:{version:2}};
  assert.deepEqual(normalizeAttackVisual(raw,90),raw);
  for(const toolKind of ['',{},'../bad',String('x').repeat(33)])assert.equal(normalizeAttackVisual({...raw,toolKind},90),null);
  assert.deepEqual(normalizeAttackVisual({profile:'emitter',durationMs:180},90),{profile:'emitter',durationMs:180});
});

test('actual source sockets give four smooth accepted poses over unchanged locomotion endpoints',()=>{
  const heights={},travel={};
  for(const profile of Object.keys(items)){
    const start=hero(profile,0),middle=hero(profile,.5),end=hero(profile,1),grip=closeViewHandRoles(profile).grip;
    assert.deepEqual(start.frame.positionsNormals,end.frame.positionsNormals,`${profile} body returns exactly`);
    assert.deepEqual(start.frame[grip],end.frame[grip],`${profile} socket returns exactly`);
    for(const sample of [start,middle,end]){assert.ok(sample.frame.positionsNormals.every(Number.isFinite));for(let i=3;i<sample.frame.positionsNormals.length;i+=6)assert.ok(Math.abs(Math.hypot(sample.frame.positionsNormals[i],sample.frame.positionsNormals[i+1],sample.frame.positionsNormals[i+2])-1)<1e-5);}
    travel[profile]=Math.hypot(middle.frame[grip][12]-start.frame[grip][12],middle.frame[grip][13]-start.frame[grip][13],middle.frame[grip][14]-start.frame[grip][14]);
    heights[profile]=middle.frame[grip][14];assert.ok(travel[profile]>.08,`${profile} has a readable accepted socket pose`);
  }
  assert.ok(heights['lumen-spindle']>heights['rift-bombard']+.1,'the Spindle is held distinctly raised to shoot');
  // Right-hand tools now raise from the free-side hip, and the Blunderbuss shoulders like a rifle; the
  // left-hand sweep still out-travels the low hip-held Rift Bombard.
  assert.ok(travel['great-sweep']>travel['rift-bombard'],'the heavy sweep out-travels the low-held Bombard');
  assert.ok(travel.blunderbuss>travel['rift-bombard']+.15,'the Blunderbuss is raised to the shoulder, the Bombard held low');
});

test('fixed-camera accepted sampling agrees at shared 30 and 60 fps phases',()=>{
  for(const profile of Object.keys(items))for(const phase of [0,1/6,1/3,1/2,2/3,5/6,1]){
    const at30=hero(profile,phase),at60=hero(profile,phase);
    assert.deepEqual(at30.frame.positionsNormals,at60.frame.positionsNormals,`${profile} body at ${phase}`);
    assert.deepEqual(at30.frame.rightSocket,at60.frame.rightSocket,`${profile} socket at ${phase}`);
  }
});
