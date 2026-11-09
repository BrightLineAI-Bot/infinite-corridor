import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { rangedWeapon } from '../src/items.ts';
import { ACTION_MOTION, TOOL_VISUAL_KINDS, TOOL_USE_STARTUP_MS, normalizeAttackVisual, importedEmitterAppearance } from '../src/action-motion.ts';
import { closeViewPlayerAction, CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { MODEL_FLOATS, modelTriangleCount, writeCloseViewHeroGear, writeCloseViewHeroEquipment, closeViewToolEmissionPoint } from '../src/close-view-models.ts';
import { CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES, CLOSE_VIEW_PLAYER_FORM_MODELS } from '../src/close-view-player-forms.ts';
import { playerFormModelKey } from '../src/close-view-player-presentation.ts';
import { loadCloseViewHero } from '../src/close-view-hero.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
const items={spark:{id:'spark-coil',name:'Spark Coil',slot:'secondary',tier:'relic',power:5,glyphs:[]},needle:{id:'secondary-needle-caster',name:'Needle Caster',slot:'secondary',tier:'relic',power:5,glyphs:[]}};
function game(kind){const s=freshSave();s.seed='SIMPLE-TOOLS';s.closeView=true;s.equipment.secondary=structuredClone(items[kind]);const g=new Game(s,1000);g.enemies=[];return g;}
const socket=new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const idle={state:{x:0,y:0},consume:()=>false,held:()=>false};
test('actual canonical immediate acceptance stamps geometry only and refusal preserves the accepted record',()=>{
 for(const [kind,profile,speed,type] of [['spark','spark-coil',12,'magic'],['needle','needle-caster',15,'physical']]){
  const g=game(kind),counter=g.save.toolUseCounter;assert.equal(g.fireSecondary(1000,{x:1,y:0}),true);const v=g.player.attackVisual,p=g.projectiles[0];
  assert.deepEqual(v.toolAppearance,{v:1,kind:profile});assert.equal(v.profile,'emitter');assert.equal(v.durationMs,180);assert.equal(v.toolKind,undefined);assert.equal(v.toolUse,undefined);assert.equal(v.toolMotion,undefined);assert.equal(v.toolShotId,undefined);assert.equal(g.pendingToolUse==null,true);assert.equal(g.save.toolUseCounter,counter);
  assert.equal(g.player.attackUntil,1180);assert.equal(g.player.attackReadyAt,1360);assert.equal(p.x,g.player.x+.5+.35);assert.equal(p.y,g.player.y+.45);assert.equal(p.dx,1);assert.equal(p.dy,0);assert.equal(p.speed,speed);assert.equal(p.damageType,type);assert.equal(p.age,0);assert.equal(p.visualLaunch,undefined);assert.equal(p.toolUseNewborn,undefined);
  assert.equal(g.fireSecondary(1001,{x:0,y:1}),false);assert.equal(g.player.attackVisual,v);g.projectiles=Array.from({length:64},()=>({dead:false}));assert.equal(g.fireSecondary(2000,{x:0,y:1}),false);assert.equal(g.player.attackVisual,v);
  assert.equal(TOOL_VISUAL_KINDS.includes(profile),false);assert.equal(TOOL_USE_STARTUP_MS[profile],undefined);assert.equal(closeViewToolEmissionPoint(new Float32Array(3),profile,socket),null);
 }
 const unknown=game('spark');unknown.save.equipment.secondary={id:'future',name:'Spark Coil'};assert.equal(unknown.fireSecondary(1000,{x:1,y:0}),false);
 for(const rank of [5,6]){const g=game('needle');g.save.equipment.secondary.upgradeRank=rank;assert.equal(g.fireSecondary(1000,{x:1,y:0}),true);if(rank===5)assert.equal(g.player.attackVisual.toolAppearance.kind,'needle-caster');else{assert.equal(rangedWeapon(g.save.equipment.secondary).name,'Blunderbuss');assert.equal(g.player.attackVisual.toolAppearance,undefined);assert.equal(g.player.attackVisual.toolKind,'blunderbuss');}}
});
test('accepted identity survives gear switch, pause and canonical reload while old/future metadata keeps generic fallback',()=>{
 const g=game('spark');g.fireSecondary(1000,{x:1,y:0});g.save.equipment.secondary=structuredClone(items.needle);const original=g.player.attackVisual;
 assert.equal(importedEmitterAppearance(original,rangedWeapon(g.save.equipment.secondary),true),'spark-coil');assert.equal(importedEmitterAppearance(null,rangedWeapon(g.save.equipment.secondary),false),'needle-caster');
 g.setPaused(true,1060);const save=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(100000)))),back=new Game(save,5000);
 assert.equal(back.player.attackUntil,5120);assert.equal(back.player.attackReadyAt,5300);assert.equal(importedEmitterAppearance(back.player.attackVisual,null,true),'spark-coil');assert.equal(back.paused,true);
 for(const appearance of [undefined,null,[],{v:1,kind:'future'},{v:2,kind:'spark-coil',future:{keep:7}},{v:'1',kind:'spark-coil'}]){const raw={profile:'emitter',durationMs:180,toolAppearance:appearance},before=structuredClone(raw),normalized=normalizeAttackVisual(raw);assert.ok(normalized);assert.equal(importedEmitterAppearance(normalized,rangedWeapon(items.needle),true),'emitter');assert.deepEqual(raw,before);assert.deepEqual(normalized.toolAppearance,appearance);}
 const action=closeViewPlayerAction(g,1180);assert.equal(action.active,false);
});
test('real Echo and clone copies retain their own original projectile origins and do not replay the body',()=>{
 const g=game('needle');g.save.perception.aperture=4096;g.lastUpdateNow=1000;assert.equal(g.castSpell('shadow-clone'),true);assert.ok(g.shadowClone&&!g.shadowClone.charging);g.save.equipment.secondary.glyphs=['echo'];
 assert.equal(g.fireSecondary(1000,{x:1,y:0}),true);const v=structuredClone(g.player.attackVisual),until=g.player.attackUntil;assert.ok(g.projectiles.some(p=>p.shadow&&p.glyphHost===null));assert.ok(g.glyphTimers.some(t=>t.kind==='shot'));
 for(const p of g.projectiles){assert.equal(p.toolAppearance,undefined);assert.equal(p.visualLaunch,undefined);assert.equal(p.toolUseNewborn,undefined);}
 g.player.x+=.2;g.update(.25,idle,1250);assert.deepEqual(g.player.attackVisual,v);assert.equal(g.player.attackUntil,until);assert.ok(g.projectiles.some(p=>p.echo));
});
test('both imported recipes keep right-socket transforms and every native form stays on bounded generic fallback',()=>{
 for(const [kind,count] of [['spark-coil',56],['needle-caster',60]]){
  const out=new Float32Array(156*3*MODEL_FLOATS),n=writeCloseViewHeroGear(out,0,{profile:kind,rightSocket:socket,leftSocket:socket});assert.equal(n/30,count);assert.ok(out.slice(0,n).every(Number.isFinite));
  const moved=Float64Array.from(socket);moved[12]=2;moved[13]=-3;moved[14]=4;const translated=new Float32Array(n);assert.equal(writeCloseViewHeroGear(translated,0,{profile:kind,rightSocket:moved,leftSocket:socket}),n);for(let i=0;i<n;i+=10){assert.ok(Math.abs(translated[i]-out[i]-2)<1e-6);assert.ok(Math.abs(translated[i+1]-out[i+1]+3)<1e-6);assert.ok(Math.abs(translated[i+2]-out[i+2]-4)<1e-6);assert.ok(Math.abs(Math.hypot(...out.slice(i+3,i+6))-1)<1e-5);}
  const frame={powerSuit:true,suitVertexCount:60*3,suitPositionsNormals:new Float32Array(60*3*6)},combined=new Float32Array((count+60)*30);assert.equal(writeCloseViewHeroEquipment(combined,0,{profile:kind,rightSocket:socket,leftSocket:socket},frame),combined.length);assert.ok(count+CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES<=156);
  const short=new Float32Array(combined.length-1).fill(7);assert.equal(writeCloseViewHeroEquipment(short,0,{profile:kind,rightSocket:socket,leftSocket:socket},frame),0);assert.ok(short.every(v=>v===7));
  assert.ok(modelTriangleCount('playerUnarmed')+count>256);for(const form of Object.keys(CLOSE_VIEW_PLAYER_FORM_MODELS)){const key=playerFormModelKey({kind:form},'emitter');assert.ok(modelTriangleCount(key)<=256);assert.ok(modelTriangleCount(form)+count>256);}
 }
});

const context = () => new Proxy({canvas:null,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
class GL {
  uploads=[];
  constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}
  isContextLost(){return false;}createShader(){return{};}createProgram(){return{};}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}getError(){return this.NO_ERROR;}getUniformLocation(){return{};}getAttribLocation(){return 0;}
  bufferSubData(t,o,a){this.uploads.push(Float32Array.from(a));}
}

test('actual imported renderer selects idle and accepted recipes while unready/native forms retain generic geometry',async()=>{
 const names=['window','fetch','createImageBitmap','WebGL2RenderingContext'],old=new Map(names.map(n=>[n,globalThis[n]]));const gl=new GL(),screen=context(),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:context()};screen.canvas=canvas;
 globalThis.WebGL2RenderingContext=GL;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();
 const fixture=id=>{const {game:g}=createLabFixture({lab:'creature-assets',scenario:id,now:100000});g.enemies=[];g.save.activeWeaponSlot='secondary';g.save.equipment.secondary=structuredClone(items.spark);g.presentation={effectiveQuality:'full',reduceMotion:false};return g;};
 try{
  const g=fixture('ashenHound');resetCloseViewCamera();render(screen,g,390,844,100000);assert.equal(closeViewGLStats.heroTriangles,0);assert.equal(closeViewGLStats.modelTriangles,240,'unready ordinary body retains generic native emitter');
  globalThis.window={};globalThis.createImageBitmap=async()=>({width:1024,height:1024});globalThis.fetch=async url=>{const u=new URL(url);assert.equal(u.protocol,'file:');const b=fs.readFileSync(u);return {ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};assert.ok(await loadCloseViewHero());
  for(const reduced of [false,true]){
   g.presentation.reduceMotion=reduced;g.save.equipment.secondary=structuredClone(items.spark);g.player.attackUntil=0;g.player.actionVisualUntil=0;g.player.attackReadyAt=0;resetCloseViewCamera();render(screen,g,390,844,100000);assert.equal(closeViewGLStats.heroTriangles,3170);assert.equal(closeViewGLStats.modelTriangles,3170+56,'idle canonical Spark recipe');
   assert.equal(g.fireSecondary(100000,{x:1,y:0}),true);g.save.equipment.secondary=structuredClone(items.needle);render(screen,g,390,844,100060);assert.equal(closeViewGLStats.modelTriangles,3170+56,'accepted Spark wins over equipped Needle');
   g.player.attackVisual.toolAppearance={v:2,kind:'spark-coil',future:true};render(screen,g,390,844,100060);assert.equal(closeViewGLStats.modelTriangles,3170+26,'future appearance retains generic emitter');
   g.player.attackVisual.toolAppearance={v:1,kind:'spark-coil'};g.setPaused(true,100060);render(screen,g,390,844,100900);const frozen=gl.uploads.at(-1);render(screen,g,390,844,190000);assert.deepEqual(gl.uploads.at(-1),frozen);g.setPaused(false,100060);
   render(screen,g,390,844,100181);assert.equal(closeViewGLStats.modelTriangles,3170+60,'expired action returns to canonical equipped Needle');assert.ok(closeViewGLStats.drawCalls<=12);
  }
  const powered=fixture('wayfarer-empowered-suit');resetCloseViewCamera();render(screen,powered,390,844,100000);assert.equal(closeViewGLStats.modelTriangles,3170+60+56);
  for(const [id,kind] of [['wayfarer-active-robot','playerRobot'],['wayfarer-ember-form','playerEmberForm']]){const f=fixture(id);resetCloseViewCamera();render(screen,f,390,844,100000);assert.equal(closeViewGLStats.heroTriangles,0);assert.equal(closeViewGLStats.modelTriangles,modelTriangleCount(kind+':emitter'));}
 }finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);for(const name of names){if(old.get(name)===undefined)delete globalThis[name];else globalThis[name]=old.get(name);}}
});

test('Close View gallery starts an ordinary Needle Caster with its own accepted shot', () => {
  const fixture = createLabFixture({ lab: 'combat-assets', scenario: 'blade-needle-ashling', seed: 'CINDER-VERGE-47', now: 1000 });
  const { game, save } = fixture;
  assert.equal(fixture.scenario, 'blade-needle-ashling');
  assert.equal(save.closeView, true);
  assert.equal(save.equipment.secondary.upgradeRank, 0);
  assert.equal(rangedWeapon(save.equipment.secondary).name, 'Needle Caster');
  assert.equal(fixture.diagnostics.resolved.tool.profile, 'Needle Caster');
  assert.equal(game.fireSecondary(1000, { x: 1, y: 0 }), true);
  assert.deepEqual(game.player.attackVisual.toolAppearance, { v: 1, kind: 'needle-caster' });
  assert.equal(game.projectiles.length, 1);
  assert.equal(game.projectiles[0].damageType, 'physical');
});
