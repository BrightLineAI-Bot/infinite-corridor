import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatant } from '../src/combat.ts';
import { MONSTER_PACK, PACK_KINDS, MOVEMENT_MODES, ATTACK_MODULES, freshPackState } from '../src/monster-pack.ts';
import { BOSS_KIT } from '../src/boss-kit.ts';
import { FRACTURE_WARDEN } from '../src/fractured.ts';
import { CLOSE_VIEW_PENTAGON_KINDS, CLOSE_VIEW_PENTAGON_MODELS } from '../src/close-view-pentagon-models.ts';
import { MESH_FLOATS } from '../src/close-view-mesh.ts';
import { closeViewMonsterAction } from '../src/close-view.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, writeCloseViewModel } from '../src/close-view-models.ts';

function modules(kind){const def=MONSTER_PACK[kind],move=MOVEMENT_MODES[def.movement],borrowed=PACK_KINDS.filter(k=>k!==kind&&!MONSTER_PACK[k].dungeonOnly&&!MONSTER_PACK[k].unique).flatMap(k=>MONSTER_PACK[k].attacks).filter(id=>{const a=ATTACK_MODULES[id];return !a.passive&&!a.tags.includes('illusion')&&!a.tags.includes('summon')&&(!a.requires||move[a.requires]);});return [...new Set([...def.attacks,...def.bossAttacks,...borrowed,...BOSS_KIT.pool,...FRACTURE_WARDEN.attacks])].filter(id=>!ATTACK_MODULES[id].passive);}
function mesh(kind,id=null,phase='idle',progress=0,reduceMotion=true){
 const e=createCombatant(kind,0,0),spec=ATTACK_MODULES[id];if(id)e.pack={...freshPackState(),attack:id,phase,t:(phase==='windup'?spec.windup:phase==='recover'?spec.recover:spec.active||1)*(1-progress),data:{aim:{x:1,y:0}}};
 const a=closeViewMonsterAction(e,kind),out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),actor={kind,x:0,y:0,z:0,yaw:0,phase:.7,pace:0,reduceMotion,pose:a.semanticPose?'semantic':a.attack?'attack':a.winding?'windup':a.leapActive?'jump':'idle',amount:a.amount??a.windupAmount??a.leapAmount??0,action:a.semantic?.action,actionFamily:a.semantic?.family,actionPhase:a.semantic?.phase,actionProgress:a.semantic?.progress||0};const end=writeCloseViewModel(out,0,actor);return out.slice(0,end);
}
function displacement(a,b){let max=0,moved=0;for(let i=0;i<a.length;i+=MODEL_FLOATS){const d=Math.hypot(a[i]-b[i],a[i+1]-b[i+1],a[i+2]-b[i+2]);max=Math.max(max,d);if(d>.005)moved++;}return {max,moved};}

test('every admitted own/boss/hybrid/guardian/fracture module has deliberate body windup and contact in reduced motion',()=>{
 const failures=[];
 for(const kind of [...CLOSE_VIEW_PENTAGON_KINDS,'pallidCrawler'])for(const id of modules(kind)){
  // The Crawler's original bite/leap use the established legacy pose clock, covered by the real-controller
  // close-view-combat-contract test. This matrix checks every newly semantic action including its hybrids.
  if(kind==='pallidCrawler'&&['bite','leapSlam'].includes(id))continue;
  const idle=mesh(kind),wind=mesh(kind,id,'windup',.85),hit=mesh(kind,id,'recover',0),late=mesh(kind,id,'recover',.85);
  for(const [label,a,b] of [['windup',wind,idle],['contact',hit,idle],['release',hit,wind],['recovery',late,hit]]){const d=displacement(a,b);if(d.max<.025||d.moved<6)failures.push(`${kind}/${id} ${label}: ${d.max.toFixed(4)}, ${d.moved} vertices`);}
 }
 assert.equal(failures.length,0,failures.join('\n'));
});

test('held beam, charge and inhale postures remain fixed while normal/reduced modes retain deliberate contact',()=>{
 for(const kind of CLOSE_VIEW_PENTAGON_KINDS)for(const id of modules(kind)){
  const a=ATTACK_MODULES[id];if(a.active&&['sweepBeam','ramCharge','phaseCharge','devourPull'].includes(id)){assert.deepEqual(mesh(kind,id,'active',.1),mesh(kind,id,'active',.9),`${kind}/${id} held posture`);assert.ok(displacement(mesh(kind,id,'active',.5),mesh(kind)).max>=.025,`${kind}/${id} active brace`);}
  assert.ok(displacement(mesh(kind,id,'windup',.85,false),mesh(kind,null,'idle',0,false)).max>=.025,`${kind}/${id} full-motion deliberate pose`);
 }
});

test('formerly silent own attacks move their leading anatomy rather than only decorative tails',()=>{
 const cases=[['lumenWraith','bite',s=>s===64],['veilSpinner','bite',s=>s===78],['riftLynx','clawSweep',s=>Math.abs(s)===2],['thunderhorn','bite',s=>s===24],['thunderhorn','shockwave',s=>Math.abs(s)===2],['amalgam','bite',s=>s===56||s===57]];
 for(const [kind,id,owns] of cases){const wind=mesh(kind,id,'windup',.85),hit=mesh(kind,id,'recover',0);let offset=0,max=0,moved=0;
  for(const part of CLOSE_VIEW_PENTAGON_MODELS[kind]){const length=part.mesh.length/MESH_FLOATS*MODEL_FLOATS;if(owns(part.swing)){const d=displacement(wind.subarray(offset,offset+length),hit.subarray(offset,offset+length));max=Math.max(max,d.max);moved+=d.moved;}offset+=length;}
  assert.ok(max>.06&&moved>=12,`${kind}/${id} leading joint: ${max}, ${moved} vertices`);
 }
});
