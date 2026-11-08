import test from 'node:test';
import assert from 'node:assert/strict';
import { moveAxis, Game } from '../src/game.ts';
import { createCombatant, enemyBodyRadius } from '../src/combat.ts';
import { freshPackState, updatePackMonster } from '../src/monster-pack.ts';
import { freshSave } from '../src/types.ts';

const floor = (width=24,height=16) => ({width,height,objects:[],enemySpawns:[],entry:{x:3,y:5},tiles:Array.from({length:width*height},(_,i)=>({x:i%width,y:Math.floor(i/width),kind:'flagFloor',blocked:false,elev:0}))});
const contacts = (fraction, record=true) => ({phaseBefore:{},phaseAfter:{},clip:()=>fraction,canExit:null,record,trace:new Float64Array(32),count:0,budgetStops:0});

test('an unrepresentable positive contact fraction is not movement, trace, or an onStep callback',()=>{
  const e={x:8,y:5,isPlayer:true},c=contacts(Number.MIN_VALUE);let calls=0;
  assert.equal(moveAxis(e,.05,0,floor(),24,false,()=>calls++,false,c),false);
  assert.deepEqual({x:e.x,y:e.y},{x:8,y:5});assert.equal(calls,0);assert.equal(c.count,0);assert.deepEqual(Array.from(c.trace),Array(32).fill(0));
});

test('a tiny representable accepted step remains movement and keeps the exact trace contract',()=>{
  const e={x:0,y:5,isPlayer:true},fraction=1e-12,c=contacts(fraction);let step=null;
  assert.equal(moveAxis(e,.05,0,floor(),24,false,(...q)=>step=q,false,c),true);
  assert.ok(e.x>0);assert.equal(e.y,5);assert.deepEqual(step,[0,5,e.x,5]);assert.equal(c.count,4);assert.deepEqual(Array.from(c.trace.slice(0,4)),[0,5,e.x,5]);
});

function ramAt(playerX){
  const save=freshSave();save.seed='CONTACT-PROGRESS';const g=new Game(save,0);g.map=floor();g.area='overworld';
  Object.assign(g.player,{x:playerX,y:5,hp:save.maxHp,invulnerableUntil:1e9});
  const e=createCombatant('thunderhorn',playerX+1.4,5);e.aggro=true;e.pack={...freshPackState(),state:'attack',attack:'ramCharge',phase:'active',t:1,tele:{type:'lane'},data:{aim:{x:-1,y:0}},hitOnce:false};g.enemies=[e];
  const phases=[],positions=[];for(let i=0;i<20;i++){updatePackMonster(e,g.packWorld(.05,1000+i*50));phases.push(e.pack.phase);positions.push([e.x,e.y]);if(e.pack.phase==='stunned')break}
  return {g,e,phases,positions};
}

test('real Thunderhorn ram reports contact refusal and enters blocked stun across map positions',()=>{
  for(const playerX of [8,12,17]){const {g,e,phases,positions}=ramAt(playerX);assert.ok(phases.includes('stunned'),`x=${playerX} phases=${phases.join(',')}`);assert.ok(e.stunnedUntil>=2400);assert.ok(Math.hypot(e.x-g.player.x,e.y-g.player.y)>=.26+enemyBodyRadius(e)-1e-7);assert.ok(positions.length<20,'blocked ram does not burn its full active clock')}
});

test('real ram wall refusal still stuns and does not emit the expiry shockwave',()=>{
  const save=freshSave();save.seed='CONTACT-WALL';const g=new Game(save,0);g.map=floor();g.area='overworld';Object.assign(g.player,{x:15,y:5,hp:save.maxHp,invulnerableUntil:1e9});
  const e=createCombatant('thunderhorn',8,5);e.aggro=true;e.pack={...freshPackState(),state:'attack',attack:'ramCharge',phase:'active',t:1,tele:{type:'lane'},data:{aim:{x:1,y:0}},hitOnce:false};g.enemies=[e];g.map.tiles[5*g.map.width+9]={...g.map.tiles[5*g.map.width+9],kind:'wall',blocked:true};
  for(let i=0;i<20&&e.pack.phase!=='stunned';i++)updatePackMonster(e,g.packWorld(.05,1000+i*50));assert.equal(e.pack.phase,'stunned');assert.equal(g.packEffects.some(q=>q.kind==='shock'),false);
});
