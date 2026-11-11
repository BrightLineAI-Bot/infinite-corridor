import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLabFixture, selectLabBuildMaterial } from '../src/proving-ground-labs.ts';
import { Game } from '../src/game.ts';
import { BUILD } from '../src/building.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';
import { STONE_PLACE_VISUAL_MS, sampleCachePickupVisual } from '../src/consume-visual.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelTriangleCount, writeCloseViewHeroGear, writeCloseViewModel } from '../src/close-view-models.ts';

const fixture=()=>createLabFixture({lab:'close-view',scenario:'build-blocks-current',seed:'CINDER-VERGE-47',now:1000});
const pressBuild=(g:Game,now=1100)=>{let take=true;g.update(.016,{state:{x:0,y:0},consume:(k:string)=>k==='build'&&take?(take=false,true):false,held:()=>false},now);return now;};
const phase=(g:Game,now:number)=>sampleCachePickupVisual(g.player.cachePickupVisual,g.consumeLogicalNow(now),g.areaId(),String(g.map.levelId||'root'));

test('real Build and aimed buildAt place and stack stone immediately before the bounded gesture',()=>{
  const f=fixture(),g=f.game,lane=f.buildPractice.lane,at=lane.one,stamp=g.stampStonePlacementVisual.bind(g);let observed:any=null;
  g.stampStonePlacementVisual=()=>{const tile=g.map.tiles[at.y*g.map.width+at.x];observed={level:tile.buildLevel,stone:g.save.materials.stone,records:g.builds.length};return stamp();};
  Object.assign(g.player,{x:at.x-lane.dx,y:at.y-lane.dy-.25,facing:lane.facing});const now=pressBuild(g);
  assert.deepEqual(observed,{level:1,stone:95,records:1});assert.equal(g.player.cachePickupVisual.cacheKind,'stonePlace');assert.equal(g.player.cachePickupVisual.durationMs,STONE_PLACE_VISUAL_MS);
  const first=g.player.cachePickupVisual;const r=g.buildAt(at.x+.5,at.y+.5);assert.ok(r.ok,r.message);assert.equal(g.map.tiles[at.y*g.map.width+at.x].buildLevel,2);assert.equal(g.save.materials.stone,90);assert.strictEqual(g.player.cachePickupVisual,first,'stack is immediate but cannot restart the active pose');
  assert.equal(phase(g,now+STONE_PLACE_VISUAL_MS),null);
});

test('wood, refusals and continuous fallback never stamp stone placement',()=>{
  const f=fixture(),g=f.game,at=f.buildPractice.lane.one;assert.ok(selectLabBuildMaterial(f,'wood'));const wood=g.save.materials.wood;
  assert.ok(g.buildAt(at.x+.5,at.y+.5).ok);assert.equal(g.save.materials.wood,wood-4);assert.equal(g.player.cachePickupVisual,null);
  assert.ok(selectLabBuildMaterial(f,'stone'));const before=g.save.materials.stone;assert.equal(g.buildAt(at.x+.5,at.y+.5).ok,false);assert.equal(g.save.materials.stone,before);assert.equal(g.player.cachePickupVisual,null);
  const other=f.buildPractice.lane.two;g.save.materials.stone=0;g.save.build.continuous=true;assert.ok(g.buildAt(other.x+.5,other.y+.5).ok);assert.equal(g.map.tiles[other.y*g.map.width+other.x].build,'wood');assert.equal(g.player.cachePickupVisual,null);
});

test('placement pauses in place, does not replace a busy interaction, and is omitted from reload with transient blocks',()=>{
  const f=fixture(),g=f.game,at=f.buildPractice.lane.one;g.lastUpdateNow=1100;assert.ok(g.buildAt(at.x+.5,at.y+.5).ok);g.setPaused(true,1220);assert.equal(phase(g,9000),120/STONE_PLACE_VISUAL_MS);
  const receipt=g.player.cachePickupVisual;assert.equal(g.stampStonePlacementVisual(1230),false);assert.strictEqual(g.player.cachePickupVisual,receipt);
  const snap=g.exportSnapshot(9000);assert.equal(snap.session.playerRuntime.cachePickupVisual,null);const restored=new Game(deserializeSave(serializeSave(snap)),10000);assert.equal(restored.builds.length,0);assert.equal(restored.map.tiles.some((t:any)=>t.build),false);assert.equal(restored.player.cachePickupVisual,null);
  const future={v:9,kind:'cachePickup',cacheKind:'stonePlace',opaque:true};
  g.player.cachePickupVisual=future;
  const saved=g.exportSnapshot(9000);
  assert.deepEqual(saved.session.playerRuntime.cachePickupVisual,future);
  assert.deepEqual(new Game(deserializeSave(serializeSave(saved)),10000).player.cachePickupVisual,future);
  assert.equal(restored.save.version,14);assert.equal(BUILD.kinds.stone.stack,2);assert.equal(BUILD.maxOut,5);assert.equal(BUILD.life,10);
});

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8'));
const file=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
const hero=(p:number,heldProfile='salvage-blade',reducedMotion=false)=>{const state=createHeroPoseState(asset),frame=createHeroFrame(asset),input={nowMs:1000,reducedMotion,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:0,gaitPhase:0,heldProfile,handProfile:heldProfile,action:{kind:'interact',profile:'stone-place',phase:p,durationMs:STONE_PLACE_VISUAL_MS},alpha:1,tint:[1,1,1],hitFlash:0};assert.ok(sampleCloseViewHero(asset,state,input,frame));return{state,frame};};

test('imported and native placement is a distinct downward return while held gear, including Pike, stays bounded',()=>{
  const entry=hero(0),down=hero(.38),end=hero(1),reduced=hero(.38,'salvage-blade',true);assert.equal(down.state.clip,'derived-stone-place');assert.notDeepEqual(down.frame.positionsNormals,entry.frame.positionsNormals);assert.deepEqual(end.frame.positionsNormals,entry.frame.positionsNormals);
  const displacement=(a:any,b:any)=>Math.hypot(...a.frame.rightSocket.slice(12,15).map((v:number,i:number)=>v-b.frame.rightSocket[12+i]));assert.ok(displacement(down,entry)>displacement(reduced,hero(0,'salvage-blade',true)));
  const pikeEntry=hero(0,'cinder-pike'),pikeDown=hero(.38,'cinder-pike');assert.equal(pikeDown.state.primaryGripResidual,pikeEntry.state.primaryGripResidual);const gear=new Float32Array(256*3*MODEL_FLOATS);assert.ok(writeCloseViewHeroGear(gear,0,{profile:'cinder-pike',rightSocket:pikeDown.frame.rightSocket,leftSocket:pikeDown.frame.leftSocket})>0);
  for(const kind of ['player','playerCinderPike']){assert.ok(modelTriangleCount(kind)<=256);const frames=[] as Float32Array[];for(const amount of [0,.38,1]){const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),n=writeCloseViewModel(out,0,{kind,x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose:'placeStone',amount,scale:1,alpha:1,turn:0,reduceMotion:false});assert.equal(n,modelTriangleCount(kind)*3*MODEL_FLOATS);assert.ok(out.slice(0,n).every(Number.isFinite));frames.push(out.slice(0,n));}assert.notDeepEqual(frames[1],frames[0]);for(let i=0;i<frames[0].length;i++)assert.equal(Math.abs(frames[2][i]-frames[0][i]),0);}
});
