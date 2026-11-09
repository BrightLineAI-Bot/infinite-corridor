import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, JUMP, jumpLift } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { ordinaryJumpPresentation } from '../src/close-view-player-presentation.ts';
function press(rank=0){const s=freshSave();s.seed='JUMP-HANDOFF';const g=new Game(s,0);g.loadArea('overworld',false);g.enemies=[];s.magicSkills||={};s.magicSkills.learned={quickening:rank};let pressed=false;g.update(.016,{state:{x:0,y:0},consume:k=>k==='jump'&&!pressed?(pressed=true):false,held:()=>false},1000);assert.equal(g.jumpStart,1000);return g;}
const sample=(g,now)=>ordinaryJumpPresentation(g,now,jumpLift(g,g.paused?g.pauseStarted:now),JUMP.base);
test('accepted ordinary jump uses actual lift and fixed rise/fall gates under every Quickening duration',()=>{
 for(const rank of [0,1,2,3]){const g=press(rank),before=[g.jumpStart,g.jumpUntil,g.jumpDur,g.player.hp];
  const early=sample(g,1050);assert.equal(early.v,1);assert.equal(early.elapsedMs,50);assert.equal(early.lift,jumpLift(g,1050));assert.equal(early.rise,50/260);assert.equal(early.durationMs,g.jumpDur);
  assert.equal(sample(g,1260).rise,1);const late=sample(g,g.jumpUntil-50);assert.equal(late.fall,1-50/260);assert.equal(sample(g,g.jumpUntil),null);assert.deepEqual([g.jumpStart,g.jumpUntil,g.jumpDur,g.player.hp],before);
 }
});
test('actual paused snapshot resume reconstructs air age without replaying takeoff or changing save state',()=>{
 const g=press(2);g.lastUpdateNow=1150;g.setPaused(true,1150);const a=sample(g,1150);assert.deepEqual(sample(g,99999),a);
 const saved=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(99999)))),back=new Game(saved,200000),before=structuredClone(saved);
 const r=sample(back,200000);assert.ok(r);assert.equal(r.elapsedMs,a.elapsedMs);assert.equal(r.remainingMs,a.remainingMs);assert.equal(r.lift,a.lift);assert.deepEqual(saved,before);
});
test('early support arrival and nonordinary or malformed states cannot leave a stale air descriptor',()=>{
 const g=press(),now=1100;assert.ok(sample(g,now));
 for(const key of ['droneLift','mechBoosting','glide','swimming']){const old=g[key];g[key]={};assert.equal(sample(g,now),null,key);g[key]=old;}
 for(const key of ['mountRide','mechUp','droneUp']){const old=g[key];g[key]=()=>true;assert.equal(sample(g,now),null,key);g[key]=old;}
 g.save.boat.aboard=true;assert.equal(sample(g,now),null);g.save.boat.aboard=false;
 for(const key of ['stunnedUntil','dodgeUntil']){const old=g.player[key];g.player[key]=1200;assert.equal(sample(g,now),null,key);g.player[key]=old;}
 const start=g.jumpStart;g.jumpStart=1200;assert.equal(sample(g,now),null);g.jumpStart=start;assert.equal(ordinaryJumpPresentation(g,now,NaN,JUMP.base),null);for(const base of [undefined,NaN,Infinity,-1,0])assert.equal(ordinaryJumpPresentation(g,now,.1,base),null);
 g.jumpUntil=now;g.player.jumping=false;assert.equal(sample(g,now),null,'actual early-landing clock edge ends pose immediately');
 const source=readFileSync(new URL('../src/close-view.ts',import.meta.url),'utf8');assert.match(source,/action\.jumpAir = null/);assert.match(source,/else if \(jump\) \{ action\.kind = 'jump';[^\n]+ordinaryJumpPresentation/);
});
