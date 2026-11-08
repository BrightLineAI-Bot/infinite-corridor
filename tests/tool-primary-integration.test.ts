import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game, BRAWLER_GEAR } from '../src/game.ts';
import { migrateSave } from '../src/types.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';
import { loadCloseViewHero } from '../src/close-view-hero.ts';
import { render } from '../src/renderer.ts';
import { CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { TOOL_ACTION_TIMING, toolActionPose, sampleToolActionMotion } from '../src/action-motion.ts';
import { projectileVisualPoint } from '../src/actor-presentation.ts';
const context=()=>new Proxy({canvas:null,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
class GL {
  uploads=[];modelData=null;
  constructor(){let n=1;const constants=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!constants.has(k))constants.set(k,n++);return constants.get(k);}return()=>{};}});}
  isContextLost(){return false;}createShader(){return{};}createProgram(){return{};}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}getError(){return this.NO_ERROR;}getUniformLocation(){return{};}getAttribLocation(){return 0;}
  bufferData(t,a,usage){if(usage===this.DYNAMIC_DRAW&&a instanceof Float32Array)this.modelData=Float32Array.from(a);}
  bufferSubData(t,o,a){this.uploads.push(Float32Array.from(a));}
}
const items={
  'rift-bombard':{id:'secondary-rift-bombard',name:'Rift Bombard',slot:'secondary',power:5,property:'blast'},
  'great-sweep':{id:'secondary-great-sweep',name:'Great Sweep',slot:'secondary',power:5,property:'brawler'},
  blunderbuss:{id:'secondary-blunderbuss',name:'Blunderbuss',slot:'secondary',power:11,basePower:5,upgradeRank:6,property:'quick'},
  'lumen-spindle':{id:'secondary-lumen-spindle',name:'Lumen Spindle',slot:'secondary',power:5,property:'focus'},
};
test('named tools keep canonical combat clocks while readable visual clocks and repeated entry poses remain bounded',()=>{
  for(const kind of ['rift-bombard','blunderbuss','lumen-spindle']){const {game:g}=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000});g.enemies=[];g.save.equipment.secondary=structuredClone(items[kind]);const before=g.projectiles.length;assert.equal(g.fireSecondary(100000,{x:1,y:0}),true);assert.equal(g.player.attackUntil,100180);assert.equal(g.player.actionVisualUntil,100000+TOOL_ACTION_TIMING[kind].durationMs);assert.equal(g.player.attackVisual.toolMotion.v,1);assert.equal(g.projectiles.length-before,kind==='blunderbuss'?3:1);g.player.attackReadyAt=0;assert.equal(g.fireSecondary(100151,{x:1,y:0}),true);assert.equal(g.player.attackUntil,100331);assert.equal(g.player.attackVisual.toolMotion.entry.length,5);assert.ok(g.player.attackVisual.toolMotion.entry.every(Number.isFinite));}
  const {game:g}=createLabFixture({lab:'combat-assets',scenario:'cleaver-sweep-marshal',now:100000});g.enemies=[];g.save.equipment.secondary=structuredClone(items['great-sweep']);assert.equal(g.fireSecondary(100000,{x:1,y:0}),true);assert.equal(g.player.attackUntil,100240);assert.equal(g.player.actionVisualUntil,100840);g.toolReadyAt=0;assert.equal(g.fireSecondary(100422,{x:1,y:0}),true);assert.equal(g.player.attackVisual.toolMotion.direction,-1);assert.equal(g.player.attackVisual.toolMotion.entry.length,5);
  for(const [kind,T] of Object.entries(TOOL_ACTION_TIMING)){for(const hz of [30,60])for(let ms=0;ms<=T.durationMs;ms+=1000/hz){const pose=toolActionPose(kind,ms,1);assert.ok(Object.values(pose).every(Number.isFinite));}}
});
test('accepted Bombard base shell owns immutable visual duration and a canonical-XY bounded lob',()=>{const {game:g}=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000});g.enemies=[];g.save.equipment.secondary=structuredClone(items['rift-bombard']);assert.equal(g.fireSecondary(100000,{x:1,y:0}),true);const shot=g.projectiles.find(q=>q.id===g.player.attackVisual.toolShotId);assert.ok(shot);assert.deepEqual(shot.visualFlight,{v:1,duration:shot.life});for(const age of [0,shot.life/2,shot.life]){const p=projectileVisualPoint({...shot,age},3);assert.equal(p.x,shot.x);assert.equal(p.y,shot.y);assert.ok(Number.isFinite(p.z));}assert.equal(projectileVisualPoint({...shot,age:0},3).z,3.66);assert.equal(projectileVisualPoint({...shot,age:shot.life},3).z,3.08);assert.ok(projectileVisualPoint({...shot,age:shot.life/2},3).z>3.9);});
test('repeat descriptors flatten the exact prior analytic pose and cancelled actions cannot seed a later shot',()=>{const {game:g}=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000});g.enemies=[];g.save.equipment.secondary=structuredClone(items['rift-bombard']);assert.equal(g.fireSecondary(100000,{x:1,y:0}),true);const first=structuredClone(g.player.attackVisual),at151=sampleToolActionMotion(first,151);g.player.attackReadyAt=0;assert.equal(g.fireSecondary(100151,{x:1,y:0}),true);assert.deepEqual(g.player.attackVisual.toolMotion.entry,[at151.yaw,at151.side,at151.up,at151.forward,at151.weight]);assert.deepEqual(sampleToolActionMotion(g.player.attackVisual,0),at151);const second=structuredClone(g.player.attackVisual),at20=sampleToolActionMotion(second,20);g.player.attackReadyAt=0;assert.equal(g.fireSecondary(100171,{x:1,y:0}),true);assert.deepEqual(sampleToolActionMotion(g.player.attackVisual,0),at20);g.player.attackVisual.presentationCancelled=true;g.player.attackReadyAt=0;assert.equal(g.fireSecondary(100531,{x:1,y:0}),true);assert.deepEqual(g.player.attackVisual.toolMotion.entry,[0,0,0,0,0]);assert.equal(g.player.attackVisual.toolMotion.v,1);});
test('production masked renderer keeps accepted tool poses across primary Echo, Fists switches and paused JSON resume',async()=>{
  const names=['window','fetch','createImageBitmap','WebGL2RenderingContext'],old=new Map(names.map(k=>[k,globalThis[k]]));
  const gl=new GL(),screen=context(),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:context()};screen.canvas=canvas;
  globalThis.WebGL2RenderingContext=GL;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();
  const draw=(g,now)=>{const combat=g.player.attackUntil;try{g.player.attackUntil=0;render(screen,g,390,844,now);}finally{g.player.attackUntil=combat;}return gl.uploads.at(-1);};
  try{
    globalThis.window={};globalThis.createImageBitmap=async()=>({width:1024,height:1024});globalThis.fetch=async url=>{const u=new URL(url);assert.equal(u.protocol,'file:');const b=fs.readFileSync(u);return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};await loadCloseViewHero();
    for(const [kind,item] of Object.entries(items)){
      const {game:g}=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000});g.enemies=[];g.presentation={effectiveQuality:'full',reduceMotion:false};
      g.save.equipment.primary=normalizeSockets({id:'primary-cinder-pike',name:'Cinder Pike',slot:'primary',power:5,property:'reach',tier:'relic',affixes:[]});g.save.glyphs.echo=1;g.save.glyphs.swift=2;
      for(const [slot,glyph] of [[0,'echo'],[1,'swift'],[2,'swift']])assert.equal(socketGlyph(g.save,'melee',slot,glyph).ok,true);
      resetCloseViewCamera();draw(g,100000);g.primaryAttack(100000);const queued=g.glyphTimers.find(q=>q.kind==='strike');assert.ok(queued);
      g.save.equipment.secondary=structuredClone(item);assert.equal(g.fireSecondary(100240,{x:1,y:0}),true,kind);assert.equal(g.player.attackVisual.toolKind,kind);
      const record=structuredClone(g.player.attackVisual),deadline=g.player.actionVisualUntil;draw(g,queued.at);const before=gl.uploads.at(-1),gear=gl.modelData;
      g.tickGlyphs(0,queued.at);assert.deepEqual(draw(g,queued.at),before,kind+' Echo keeps body');assert.deepEqual(gl.modelData,gear,kind+' Echo keeps gear');assert.deepEqual(g.player.attackVisual,record);assert.equal(g.player.actionVisualUntil,deadline);
      const sampleAt=100300,accepted=draw(g,sampleAt),acceptedGear=gl.modelData;
      delete g.player.attackVisual.toolKind;assert.notDeepEqual(draw(g,sampleAt),accepted,kind+' accepted identity selects its distinct body pose');g.player.attackVisual=structuredClone(record);
      g.save.equipment.primary={...BRAWLER_GEAR[0].item};g.save.equipment.secondary=structuredClone(items[kind==='lumen-spindle'?'rift-bombard':'lumen-spindle']);
      assert.deepEqual(draw(g,sampleAt),accepted,kind+' equipment changes cannot replace accepted body');assert.deepEqual(gl.modelData,acceptedGear,kind+' has only accepted tool gear');
      assert.equal(closeViewGLStats.heroTriangles,3170);assert.ok(closeViewGLStats.modelTriangles<=3170+256);assert.ok(acceptedGear.every(Number.isFinite));
      g.setPaused(true,sampleAt);assert.deepEqual(draw(g,110000),accepted);const saved=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(110000)))),back=new Game(saved,200000);back.enemies=[];back.presentation=g.presentation;resetCloseViewCamera();
      assert.deepEqual(draw(back,200000),accepted,kind+' exact paused reload body');assert.deepEqual(gl.modelData,acceptedGear,kind+' exact paused reload gear');
      back.setPaused(false,201000);assert.equal(back.fistPunch(1,0,201001,{x:1,y:0}),true);draw(back,201040);assert.equal(closeViewGLStats.modelTriangles,3170+64,'new Fists replace tool gear with bilateral gauntlets');
    }
  }finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);for(const n of names){if(old.get(n)===undefined)delete globalThis[n];else globalThis[n]=old.get(n);}}
});
