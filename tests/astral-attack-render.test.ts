import test from 'node:test';import assert from 'node:assert/strict';
import {createCombatant} from '../src/combat.ts';
import {createAstralState,astralBeamAnchors} from '../src/astral-worm.ts';
import {drawPackMonster} from '../src/monster-render.ts';
import {drawAstralInkBlobs} from '../src/astral-worm-render.ts';
function canvas(){const calls=[],state={};const ctx=new Proxy({getTransform:undefined,createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:k in state?state[k]:(...args)=>calls.push({kind:k,args,fill:state.fillStyle,stroke:state.strokeStyle}),set:(o,k,v)=>(state[k]=v,true)});return {ctx,calls};}
for(const facingX of [-1,1])for(const scale of [.3,1,2])test(`native flight beam uses mouth and matching impact, facing ${facingX}, scale ${scale}`,()=>{
 const e=createCombatant('astralWorm',3,4,false,[]);e.id='beam';e.scale=scale;e.facingX=-facingX;e.astral=createAstralState();Object.assign(e.astral,{x:e.x,y:e.y,form:'flight',previousForm:'flight',facingX,scale});e.astralBeamGroundLiftDelta=.4;e.hopLift=2;e.reduceMotion=true;
 const before=JSON.stringify(e),{ctx,calls}=canvas(),s=44;drawPackMonster(ctx,e,s,1000,'left');
 const beam=calls.filter(c=>c.stroke==='#db9fc5'&&['moveTo','lineTo'].includes(c.kind));assert.equal(beam.length,2);
 const a=astralBeamAnchors({...e.astral,x:e.x,y:e.y});
 assert.deepEqual(beam[0].args,[(a.mouth.x+.5)*s,(a.mouth.y+.62)*s]);assert.deepEqual(beam[1].args,[(a.ground.x+.5)*s,(a.ground.y+.62+.4)*s]);assert.equal(beam[0].args[0],beam[1].args[0]);assert(beam[1].args[1]>beam[0].args[1]);assert.equal(JSON.stringify(e),before);
});
for(const phase of ['warning','outbound','splat','recall'])test(`three native ink ${phase} descriptors draw without mutating combat geometry`,()=>{
 const blobs=Array.from({length:3},(_,i)=>({id:`b${i}`,x:i,y:2,origin:{x:0,y:0},target:{x:i,y:2},phase,progress:.5,height:phase==='outbound'?.5:0,radius:.4,blocked:false}));const before=JSON.stringify(blobs),{ctx,calls}=canvas(),project=(x,y)=>({x:x*40,y:y*40});drawAstralInkBlobs(ctx,blobs,project,40);assert.equal(JSON.stringify(blobs),before);const ellipses=calls.filter(c=>c.kind==='ellipse');assert(ellipses.length>=3);assert.equal(ellipses[0].args[2],16,'visible primary spread uses combat radius');if(phase==='outbound')assert.equal(ellipses[0].args[1],60,'outbound height is visible');
});

import {mountAstralWalker,syncAstralMount,astralMountPresentation} from '../src/astral-worm-mount.ts';
test('terrain-raised flight carries rider and saddle lift through pause and JSON without changing HP',()=>{
 const owner=createCombatant('astralWorm',0,0,false,[]),rider=createCombatant('voidWalker',0,0,false,[]);owner.id='o';rider.id='r';owner.scale=.3;owner.astral={form:'flight',flightLiftExtra:1.4};assert(mountAstralWalker(owner,rider,{alignment:'hostile'}));const hp=[owner.hp,rider.hp];assert(Math.abs(astralMountPresentation(rider).lift-(.3+.8*.6+1.4))<1e-12);
 const restored=JSON.parse(JSON.stringify(rider)),before=JSON.stringify(restored);owner.astral.flightLiftExtra=2;syncAstralMount(restored,{paused:true,findOwner:()=>owner});assert.equal(JSON.stringify(restored),before);syncAstralMount(restored,{findOwner:()=>owner});assert(Math.abs(astralMountPresentation(restored).lift-(.3+.8*.6+2))<1e-12);assert.deepEqual([owner.hp,rider.hp],hp);
});
