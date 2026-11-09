import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { Game } from '../src/game.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';
import { SHOVEL_DIG_VISUAL_MS, normalizeCachePickupVisual, sampleCachePickupVisual } from '../src/consume-visual.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelTriangleCount, writeCloseViewHeroGear, writeCloseViewModel } from '../src/close-view-models.ts';

const pressAct=(g:Game)=>{let take=true;const now=Math.max(1000,Number(g.lastUpdateNow)||0)+16;g.update(.016,{state:{x:0,y:0},consume:(k:string)=>k==='interact'&&take?(take=false,true):false,held:()=>false},now);return now;};
const lab=(now=1000)=>{const g=createLabFixture({lab:'close-view',scenario:'terrain-dig-return',seed:'DIG-AUDIT0',now}).game;g.lastUpdateNow=now+100;return g;};
const phase=(g:Game,now:number)=>sampleCachePickupVisual(g.player.cachePickupVisual,g.consumeLogicalNow(now),g.areaId(),String(g.map.levelId||'root'));

test('ordinary Act mutates the generated wall and spends the standard shovel before stamping its exact receipt',()=>{
  const g=lab(),stamp=g.stampShovelDigVisual.bind(g);let observed:any=null;
  g.stampShovelDigVisual=(kind:string)=>{const target=g.map.tiles[26*g.map.width+18];observed={kind,tunnel:target.tunnel,blocked:target.blocked,shovel:g.save.digging.shovel};return stamp(kind);};
  const now=pressAct(g);
  assert.deepEqual(observed,{kind:'shovelDig',tunnel:true,blocked:false,shovel:1});
  assert.deepEqual(g.player.cachePickupVisual,{v:1,kind:'cachePickup',cacheKind:'shovelDig',acceptedLogicalMs:now,durationMs:SHOVEL_DIG_VISUAL_MS,areaId:g.areaId(),levelId:String(g.map.levelId||'root'),cancelled:false});
});

test('an active interaction keeps body ownership instead of restarting on another shovel receipt',()=>{
  const g=lab(),now=pressAct(g),receipt=g.player.cachePickupVisual;
  assert.equal(g.stampShovelDigVisual('ironShovelDig',now+100),false);assert.strictEqual(g.player.cachePickupVisual,receipt);
  assert.equal(g.stampShovelDigVisual('ironShovelDig',now+SHOVEL_DIG_VISUAL_MS),true);assert.equal(g.player.cachePickupVisual.cacheKind,'ironShovelDig');
});

test('an accepted iron dig records the actual tool while refusals leave world, spend and receipt alone',()=>{
  const g=lab();g.save.digging.shovel=0;g.save.digging.iron=4;g.save.materials.wood=0;g.save.materials.stone=0;const now=pressAct(g);
  assert.equal(g.map.tiles[26*g.map.width+18].tunnel,true);assert.equal(g.save.digging.iron,3);assert.equal(g.player.cachePickupVisual.cacheKind,'ironShovelDig');assert.equal(phase(g,now+310),.5);
  const receipt=g.player.cachePickupVisual,iron=g.save.digging.iron,state=JSON.stringify(g.map.tiles[26*g.map.width+18]);
  const refused=g.digAhead();assert.ok(!refused?.ok);assert.strictEqual(g.player.cachePickupVisual,receipt);assert.equal(g.save.digging.iron,iron);assert.equal(JSON.stringify(g.map.tiles[26*g.map.width+18]),state);
});

test('shovel presentation pauses and reloads canonically, clears on area transition, and preserves future records',()=>{
  const g=lab();const accepted=pressAct(g);g.setPaused(true,accepted+124);const expected=124/SHOVEL_DIG_VISUAL_MS;assert.equal(phase(g,accepted+5000),expected);
  const restored=new Game(deserializeSave(serializeSave(g.exportSnapshot(accepted+5000))),9000);assert.equal(phase(restored,9000),expected);assert.equal(restored.save.digging.shovel,1);assert.equal(restored.map.tiles[26*restored.map.width+18].tunnel,true);
  restored.loadArea('overworld',false);assert.equal(restored.player.cachePickupVisual,null);
  const future={v:9,kind:'futureInteraction',opaque:true};assert.deepEqual(normalizeCachePickupVisual(future),future);
});

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8'));
const file=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
const hero=(p:number,reducedMotion=false)=>{const state=createHeroPoseState(asset),frame=createHeroFrame(asset),input={nowMs:1000,reducedMotion,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:0,gaitPhase:0,action:{kind:'interact',profile:'shovel-dig',phase:p,durationMs:SHOVEL_DIG_VISUAL_MS},alpha:1,tint:[1,1,1],hitFlash:0};assert.ok(sampleCloseViewHero(asset,state,input,frame));return{state,frame};};

test('imported and native shovel poses read down, lever and recover and stay within the existing streams',()=>{
  const entry=hero(0),down=hero(.34),lever=hero(.55),end=hero(1),reduced=hero(.34,true);
  assert.equal(down.state.clip,'derived-shovel-dig');assert.notDeepEqual(down.frame.rightSocket,entry.frame.rightSocket);assert.notDeepEqual(lever.frame.rightSocket,down.frame.rightSocket);assert.deepEqual(end.frame.positionsNormals,entry.frame.positionsNormals);assert.ok(Math.hypot(...down.frame.rightSocket.slice(12,15).map((v:number,i:number)=>v-entry.frame.rightSocket[12+i]))>Math.hypot(...reduced.frame.rightSocket.slice(12,15).map((v:number,i:number)=>v-entry.frame.rightSocket[12+i])));
  const gear=new Float32Array(256*3*MODEL_FLOATS),gearEnd=writeCloseViewHeroGear(gear,0,{profile:'shovel-dig',rightSocket:down.frame.rightSocket,leftSocket:down.frame.leftSocket});assert.ok(gearEnd>0&&gearEnd<=gear.length&&gear.slice(0,gearEnd).every(Number.isFinite));
  assert.ok(modelTriangleCount('playerShovel')<=256);
  const native=[] as Float32Array[];for(const amount of [0,.34,.55,1]){const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),n=writeCloseViewModel(out,0,{kind:'playerShovel',x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose:'shovelDig',amount,scale:1,alpha:1,turn:0,reduceMotion:false});assert.equal(n,modelTriangleCount('playerShovel')*3*MODEL_FLOATS);assert.ok(out.slice(0,n).every(Number.isFinite));native.push(out.slice(0,n));}assert.notDeepEqual(native[1],native[0]);assert.notDeepEqual(native[2],native[1]);for(let i=0;i<native[0].length;i++)assert.equal(Math.abs(native[3][i]-native[0][i]),0);
});
