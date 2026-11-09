import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { freshPackState, updatePackMonster } from '../src/monster-pack.ts';
import { ordinaryContactEnemy, actorContactContext } from '../src/actor-contact.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';

// This seed/section really generates a Grave Lantern with the borrowed leap kit.
// No spawn, family, position generator or attack implementation is replaced.
function airborneLantern(closeView, reduceMotion) {
  const save=freshSave();save.seed='LANTERN-RELOAD';save.closeView=closeView;
  const g=new Game(save,1000);g.presentation={...g.presentation,reduceMotion};g.rx=7;g.ry=4;g.loadArea('overworld',false);
  const e=g.enemies.find(e=>e.id==='pack-overworld:7:4:0');
  assert.equal(e.kind,'graveLantern');assert.equal(e.hybridAttack,'leapSlam');assert.ok(e.packAttacks.includes('leapSlam'));
  // Freeze the other legal modules so the real selector begins this borrowed attack.
  e.aggro=true;e.pack={...freshPackState(),gap:0,cd:Object.fromEntries(e.packAttacks.filter(id=>id!=='leapSlam').map(id=>[id,99]))};
  g.player.x=e.x-3;g.player.y=e.y;
  let now=1000;const tick=()=>{now+=50;updatePackMonster(e,g.packWorld(.05,now));};
  tick();assert.equal(e.pack.attack,'leapSlam');assert.equal(e.pack.phase,'windup');
  for(let i=0;i<30&&e.pack.phase!=='active';i++)tick();assert.equal(e.pack.phase,'active');
  tick();assert.ok(e.hopLift>0);assert.equal(e.aloft,true);assert.equal(ordinaryContactEnemy(e),false,'real active leap remains excluded');
  return{g,e,now};
}

test('naturally generated Lantern saved during borrowed leap regains hover contact after canonical reload reset',()=>{
  // Physics/reload invariance under the real presentation settings; no GPU rendering is claimed.
  for(const view of [false,true])for(const reduceMotion of [false,true]){
    const {g,e,now}=airborneLantern(view,reduceMotion);e.hp-=3;e.futureCanary={value:'preserve'};
    // A coincident saved pair must retain coordinates and permit contact overlap escape.
    g.player.x=e.x;g.player.y=e.y;g.setPaused(true,now);
    const before={x:e.x,y:e.y,hp:e.hp,cd:structuredClone(e.pack.cd),pack:structuredClone(e.pack),lift:e.hopLift};
    const saved=g.exportSnapshot(now);
    assert.deepEqual(e.pack,before.pack);assert.equal(e.hopLift,before.lift,'saving cannot reset the live paused leap');
    const restored=new Game(deserializeSave(serializeSave(saved)),now+10000);restored.presentation={...restored.presentation,reduceMotion};
    const q=restored.enemies.find(q=>q.id===e.id);
    assert.ok(q);assert.deepEqual({x:q.x,y:q.y,hp:q.hp},{x:before.x,y:before.y,hp:before.hp});
    assert.deepEqual(q.futureCanary,{value:'preserve'});assert.deepEqual(q.pack.cd,before.cd);
    assert.equal(q.pack.attack,null,'existing reload contract discards transient enemy attacks');assert.equal(q.aloft,false);
    assert.equal(q.hopLift,0,'discarded leap lift must not outlive its reset attack');
    assert.equal(ordinaryContactEnemy(q),true,'ordinary restored hover must be material');
    const c=actorContactContext(restored,restored.player,-2,0);assert.ok(c);assert.equal(c.clip(restored.player.x,restored.player.y,-2,0),1);
    assert.equal(restored.save.version,14);assert.equal(restored.paused,true);
  }
});
