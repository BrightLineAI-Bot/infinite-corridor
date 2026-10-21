import test from 'node:test';import assert from 'node:assert/strict';
import {createCombatant} from '../src/combat.ts';
import {drawPackMonster} from '../src/monster-render.ts';
import {mountAstralWalker} from '../src/astral-worm-mount.ts';
function capture(e,now=1000){const calls=[],state={};const ctx=new Proxy({getTransform:undefined,createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:k in state?state[k]:(...args)=>calls.push({kind:k,args,fill:state.fillStyle,stroke:state.strokeStyle}),set:(o,k,v)=>(state[k]=v,true)});drawPackMonster(ctx,e,44,now,'right');return calls;}
for(const form of ['worm','flight','griffin','pool','trample','bite'])test(`native ${form} saddle exists only during riding and cannot mutate health or hitbox`,()=>{
 const owner=createCombatant('astralWorm',5,5,false,[]),rider=createCombatant('voidWalker',5,5,false,[]);owner.id='owner';rider.id='rider';owner.astral={form};rider.reduceMotion=true;
 assert(!capture(rider).some(q=>q.kind==='fill'&&q.fill==='#8a5428'));
 assert(mountAstralWalker(owner,rider,{alignment:'hostile'}));const before=JSON.stringify([owner,rider]),draw=capture(rider);
 assert(draw.some(q=>q.kind==='fill'&&q.fill==='#8a5428'));assert.equal(JSON.stringify([owner,rider]),before);
 assert.equal(JSON.stringify(capture(rider,9000)),JSON.stringify(draw),'reduced-motion riding tack and rider remain stable');
 rider.astralMount.status='landing';assert(!capture(rider).some(q=>q.kind==='fill'&&q.fill==='#8a5428'));
 rider.astralMount.status='dismounted';assert(!capture(rider).some(q=>q.kind==='fill'&&q.fill==='#8a5428'));
});
