import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTOR_CONTACT, actorContactBottom, actorContactContext, actorContactTop, materialGraveLantern, ordinaryContactEnemy } from '../src/actor-contact.ts';
import { Game, moveAxis } from '../src/game.ts';
import { createCombatant, enemyBodyRadius } from '../src/combat.ts';
import { freshPackState, updatePackMonster } from '../src/monster-pack.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';

const floor = (width=24,height=16) => ({width,height,objects:[],enemySpawns:[],entry:{x:3,y:5},tiles:Array.from({length:width*height},(_,i)=>({x:i%width,y:Math.floor(i/width),kind:'flagFloor',blocked:false,elev:0}))});
const lantern = (x=5,y=5,extra={}) => Object.assign(createCombatant('graveLantern',x,y),extra);
const harness = (e=lantern()) => ({map:floor(),enemies:[e],player:{x:3,y:5,hp:100,isPlayer:true},save:{}});
const move = (g,e,dx,dy) => moveAxis(e,dx,dy,g.map,g.map.width,false,null,false,actorContactContext(g,e,dx,dy));
const gap = (g,e=g.enemies[0]) => Math.hypot(g.player.x-e.x,g.player.y-e.y);
const radius = e => ACTOR_CONTACT.playerRadius+enemyBodyRadius(e);
const input = (x,y,action='') => {let used=false;return{state:{x,y},consume:k=>k===action&&!used&&(used=true),held:()=>false}};
function actualGame(){const {game:g}=createLabFixture({lab:'close-view',scenario:'terrain-ramps',seed:'GRAVE-LANTERN-CONTACT',now:1000});g.map=floor();g.enemies=[lantern(5,5,{hitStun:1e6})];Object.assign(g.player,{x:3,y:5,hp:g.save.maxHp,invulnerableUntil:1e9});return g}

test('ordinary Grave Lantern alone admits its fixed authored low-hover envelope',()=>{
  const e=lantern();assert.equal(e.packKind,true);assert.equal(e.flying,true);assert.equal(e.scale,.85);assert.equal(materialGraveLantern(e),true);assert.equal(ordinaryContactEnemy(e),true);
  assert.equal(actorContactBottom(e),.33*.85);assert.equal(actorContactTop(e),2.33*.85);
  for(const scale of [.25,.85,.901,.918,1.15,4]){const q=lantern(5,5,{scale});assert.equal(actorContactBottom(q),.33*scale);assert.equal(actorContactTop(q),2.33*scale)}
  const source=readFileSync(new URL('../src/actor-contact.ts',import.meta.url),'utf8');assert.doesNotMatch(source,/actor-presentation|renderer|close-view-pentagon-models/);
});

test('known physical phases are solid while actual vertical travel and unknown active state remain excluded',()=>{
  const solid=['stillnessCurse','sigilScatter','bite','clawSweep','longStab','mortarVolley','webSpit','shockwave','groundRupture','firefall','sweepBeam','blinkStrike','ramCharge'];
  for(const attack of solid)for(const phase of ['windup','active','strike','stunned','recover'])assert.equal(ordinaryContactEnemy(lantern(5,5,{pack:{attack,phase}})),true,`${attack}/${phase}`);
  assert.equal(ordinaryContactEnemy(lantern(5,5,{pack:{attack:'ramCharge',phase:'future'}})),false,'unknown phase fails closed');
  for(const attack of ['phaseCharge','leapSlam']){for(const phase of ['windup','recover'])assert.equal(ordinaryContactEnemy(lantern(5,5,{pack:{attack,phase}})),true,`${attack}/${phase}`);for(const phase of ['active',null,'future'])assert.equal(ordinaryContactEnemy(lantern(5,5,{pack:{attack,phase}})),false,`${attack}/${phase}`)}
  for(const phase of ['windup','track','lock','active',null])assert.equal(ordinaryContactEnemy(lantern(5,5,{pack:{attack:'diveBomb',phase}})),false,`dive/${phase}`);
  assert.equal(ordinaryContactEnemy(lantern(5,5,{pack:{attack:'diveBomb',phase:'recover'},aloft:false,untargetable:false})),true);
  assert.equal(ordinaryContactEnemy(lantern(5,5,{pack:{attack:'futureModule',phase:'active'}})),false);
});

test('real flags and common exclusions remain authoritative without blacklisting unused kit',()=>{
  const base=lantern();base.packAttacks.push('phaseCharge','leapSlam','diveBomb');assert.equal(ordinaryContactEnemy(base),true,'unused kit does not erase ordinary hover');
  for(const patch of [{aloft:true},{phasing:true},{hopLift:.01},{hidden:true},{mist:true},{passiveBehavior:true},{friendly:true},{worldBeast:'graveLantern'},{dead:true},{hp:0}])assert.equal(ordinaryContactEnemy(lantern(5,5,patch)),false,JSON.stringify(patch));
  assert.equal(ordinaryContactEnemy(lantern(5,5,{untargetable:true})),true,'untargetable alone is not a materiality flag');
});

test('player walk, dodge and reverse mover stop at the existing combined radius',()=>{
  for(const action of ['','dodge']){const g=actualGame(),e=g.enemies[0];for(let i=0;i<40;i++)g.update(.05,input(1,0,i===0?action:''),1000+i*50);assert.ok(gap(g)>=radius(e)-1e-7,action||'walk')}
  const g=harness(),e=g.enemies[0];move(g,e,-5,0);assert.ok(Math.abs(gap(g)-radius(e))<1e-6);assert.equal(g.player.x,3);
});

test('bottom and top clearance use exact touches in both directions and retain overlap escape',()=>{
  const e=lantern(),g=harness(e);let support=actorContactTop(e);g.actorContactPlatformSupport=(body)=>body===g.player?support:null;
  move(g,g.player,4,0);assert.ok(g.player.x>6);g.player.x=3;support-=1e-6;move(g,g.player,4,0);assert.ok(g.player.x<e.x);
  g.player.x=3;support=actorContactTop(e);move(g,e,-4,0);assert.ok(e.x<2,'reverse upper clearance');
  const h=harness(lantern(5,5));h.player.x=5;move(h,h.player,-2,0);assert.ok(h.player.x<4);move(h,h.player,4,0);assert.ok(gap(h)>=radius(h.enemies[0])-1e-7);
});

test('blink destination is solid, phase/leap/dive travel is clear, and landing recovery is solid again',()=>{
  const g=harness();for(const state of [
    {attack:'blinkStrike',phase:'strike'}, {attack:'phaseCharge',phase:'active'}, {attack:'leapSlam',phase:'active'}, {attack:'diveBomb',phase:'track'}, {attack:'diveBomb',phase:'recover'}
  ]){const e=lantern(5,5,{pack:state,aloft:state.phase==='active'&&state.attack==='leapSlam'});g.enemies=[e];g.player.x=3;move(g,g.player,4,0);const solid=state.attack==='blinkStrike'||state.phase==='recover';assert.equal(g.player.x<e.x,solid,`${state.attack}/${state.phase}`)}
});

function actualRam(playerX,wall=false){
  const g=actualGame();Object.assign(g.player,{x:playerX,y:5,hp:g.save.maxHp,invulnerableUntil:1e9});const e=lantern(playerX+1.4,5);e.aggro=true;e.pack={...freshPackState(),state:'attack',attack:'ramCharge',phase:'active',t:1,tele:{type:'lane'},data:{aim:{x:-1,y:0}},hitOnce:false};g.enemies=[e];
  if(wall)g.map.tiles[5*g.map.width+Math.floor(e.x-.5)]={...g.map.tiles[5*g.map.width+Math.floor(e.x-.5)],kind:'wall',blocked:true};
  const phases=[];for(let i=0;i<20;i++){updatePackMonster(e,g.packWorld(.05,1000+i*50));phases.push(e.pack.phase);if(e.pack.phase==='stunned')break}return{g,e,phases};
}

test('actual Game Lantern ram hits once, reports blocked contact, and enters stun across map positions',()=>{
  for(const playerX of [8,12,17]){const {g,e,phases}=actualRam(playerX);assert.ok(phases.includes('stunned'),`x=${playerX} phases=${phases.join(',')}`);assert.equal(e.pack.hitOnce,true);assert.ok(e.stunnedUntil>=2400);assert.ok(gap(g,e)>=radius(e)-1e-7);assert.equal(g.packEffects.some(q=>q.kind==='shock'),false)}
});

test('actual Game Lantern wall refusal still enters stun without the expiry shockwave',()=>{
  const {g,e,phases}=actualRam(8,true);assert.ok(phases.includes('stunned'));assert.ok(e.stunnedUntil>=2400);assert.equal(g.packEffects.some(q=>q.kind==='shock'),false);
});

test('pause and JSON boundaries add no state and restore conservative ordinary admission',()=>{
  const g=actualGame(),e=g.enemies[0];e.pack={...e.pack,attack:'phaseCharge',phase:'active'};e.phasing=true;assert.equal(ordinaryContactEnemy(e),false);g.setPaused(true,1500);
  const snap=g.exportSnapshot(1500),restored=new Game(deserializeSave(serializeSave(snap)),5000),copy=JSON.parse(JSON.stringify(e));assert.equal('actorContact' in snap,false);assert.equal(restored.save.version,14);assert.equal(ordinaryContactEnemy(copy),false);
  delete copy.phasing;copy.pack.phase='recover';assert.equal(ordinaryContactEnemy(copy),true);assert.equal(actorContactBottom(copy),.33*.85);assert.equal(actorContactTop(copy),2.33*.85);
});
