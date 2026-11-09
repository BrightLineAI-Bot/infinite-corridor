import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ordinaryDefeatPresentation} from '../src/close-view-player-presentation.ts';
import {createLabFixture} from '../src/proving-ground-labs.ts';
import {VIEWPORT_CLOSED, VIEWPORT_QUIET_INPUT} from '../src/combat-visuals.ts';

const game=(extra={})=>({
  player:{hp:0,stunnedAt:1000,stunnedUntil:2400},fallen:{until:2400},deathBeat:.35,paused:false,
  save:{boat:{aboard:false}},mountRide:()=>false,fistsEquipped:()=>false,mechUp:()=>false,...extra
});

test('ordinary defeat advances on the known clock, clamps, and holds its endpoint through a longer fallen interval',()=>{
  const g=game();
  assert.equal(ordinaryDefeatPresentation(g,900)?.amount,0);
  assert.equal(ordinaryDefeatPresentation(g,1175)?.amount,.5);
  assert.equal(ordinaryDefeatPresentation(g,1350)?.amount,1);
  assert.equal(ordinaryDefeatPresentation(g,2200)?.amount,1);
  assert.deepEqual(ordinaryDefeatPresentation(g,2200),{amount:1,durationMs:350});
});

test('pause freezes the defeat phase and reduced motion does not select a different clock',()=>{
  const g=game({paused:true,pauseStarted:1120,reduceMotion:false});
  const normal=ordinaryDefeatPresentation(g,9999);g.reduceMotion=true;
  assert.deepEqual(ordinaryDefeatPresentation(g,50000),normal);
  assert.equal(normal?.amount,120/350);
});

test('only a true zero-hp ordinary on-foot fallen Wayfarer is routed, including iron fists',()=>{
  assert.ok(ordinaryDefeatPresentation(game(),1100));
  assert.ok(ordinaryDefeatPresentation(game({fistsEquipped:()=>true}),1100));
  for(const g of [
    game({fallen:null}),game({player:{hp:1,stunnedAt:1000}}),game({player:{hp:0}}),
    game({save:{boat:{aboard:true}}}),game({mountRide:()=>({kind:'stag'})}),
    game({mechUp:()=>true,save:{mech:{active:true,mode:'walker'},boat:{aboard:false}}}),
    game({save:{magicSkills:{active:{id:'ember-form',remaining:1,rank:1}},boat:{aboard:false}}})
  ])assert.equal(ordinaryDefeatPresentation(g,1100),null);
});

test('native and imported close-view routes consume the same death phase without replacing ordinary knockdown',()=>{
  const source=readFileSync(new URL('../src/close-view.ts',import.meta.url),'utf8');
  assert.match(source,/let pose = defeat \? "death" : stunned \? "knockdown"/);
  assert.match(source,/if \(defeat\) amount = defeat\.amount/);
  assert.match(source,/if \(defeat\) \{ action\.kind = 'death'; action\.profile = 'death'; action\.phase = defeat\.amount/);
  assert.match(source,/const knock = stunned && !defeat \? knockdownPose/);
});

test('the scratch Ashling lands a real fatal blow and recovery retires the pose exactly once',()=>{
  const {game:g,save}=createLabFixture({lab:'close-view',scenario:'wayfarer-defeat',seed:'CINDER-VERGE-47',now:1000});
  assert.equal(g.player.hp,1);
  assert.equal(g.enemies.length,1);
  assert.equal(g.enemies[0].kind,'ashling');
  assert.equal(g.deathBeat,VIEWPORT_CLOSED.fall);
  assert.equal(ordinaryDefeatPresentation(g,1000),null);
  let now=1000;
  for(let frame=0;frame<600&&!g.fallen;frame++){
    now+=1000/60;
    g.update(1/60,VIEWPORT_QUIET_INPUT,now);
  }
  assert.ok(g.fallen?.beat);
  assert.equal(ordinaryDefeatPresentation(g,now)?.amount,0);
  const midpoint=now+g.deathBeat*500;
  assert.ok(Math.abs(ordinaryDefeatPresentation(g,midpoint)?.amount-.5)<1e-8);
  g.setPaused(true,midpoint);
  assert.equal(ordinaryDefeatPresentation(g,9000)?.amount,ordinaryDefeatPresentation(g,midpoint)?.amount);
  g.setPaused(false,9000);
  assert.ok(Math.abs(ordinaryDefeatPresentation(g,9000)?.amount-.5)<1e-8);
  g.update(1/60,VIEWPORT_QUIET_INPUT,9350);
  assert.equal(ordinaryDefeatPresentation(g,9350),null);
  assert.equal(save.worldFlags.deaths,1);
  g.update(1/60,VIEWPORT_QUIET_INPUT,9370);
  assert.equal(save.worldFlags.deaths,1);
});
