import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game } from '../src/game.ts';
import { migrateSave } from '../src/types.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';
import { closeViewPlayerAction, CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { loadCloseViewHero, decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { render as baseRender } from '../src/renderer.ts';

const clone = x => JSON.parse(JSON.stringify(x));
const calm = { state:{x:0,y:0}, consume:()=>false, held:()=>false };
const salvage = () => ({ id:'salvage-blade', name:'Salvage Blade', slot:'primary', power:6, property:'steady' });
const future = () => ({ id:'primary-future-relic', name:'Future Relic', slot:'primary', power:17, property:'future', futureItem:{kept:true} });
const pike = () => ({ id:'primary-cinder-pike', name:'Cinder Pike', slot:'primary', power:5, property:'reach' });
const fixture = (item,native=false) => { const { game:g }=createLabFixture(native?{lab:'creature-assets',scenario:'wayfarer-active-robot',now:100000}:{lab:'combat-assets',scenario:'blade-spark-ashling',now:100000});g.enemies=[];g.save.equipment.primary=item;g.presentation={effectiveQuality:'full',reduceMotion:false};return g; };
const same = (a,b,label) => { assert.equal(a.length,b.length,label+' length');let max=0;for(let i=0;i<a.length;i++)max=Math.max(max,Math.abs(a[i]-b[i]));assert.equal(max,0,label+' max delta '+max); };
const near = (a,b,limit,label) => { assert.equal(a.length,b.length,label+' length');let max=0;for(let i=0;i<a.length;i++)max=Math.max(max,Math.abs(a[i]-b[i]));assert.ok(max<limit,label+' max delta '+max); };
const shown = (gl,native) => native ? Float32Array.from(gl.modelData) : gl.uploads.at(-1);

function render(ctx,g,now) {
  const combat=g.player.attackUntil,accepted=g.player.actionVisualUntil;
  try { g.player.attackUntil=0;baseRender(ctx,g,390,844,now); }
  finally { g.player.attackUntil=combat; }
  assert.equal(g.player.attackUntil,combat);assert.equal(g.player.actionVisualUntil,accepted);
}
const context=()=>new Proxy({canvas:null,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
class GL { uploads=[];constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}isContextLost(){return false;}createShader(){return{};}createProgram(){return{};}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}getError(){return this.NO_ERROR;}getUniformLocation(){return{};}getAttribLocation(){return 0;}bufferData(t,a,usage){if(usage===this.DYNAMIC_DRAW&&a instanceof Float32Array)this.modelData=Float32Array.from(a);}bufferSubData(t,o,a){this.uploads.push(Float32Array.from(a));}}

test('Salvage and future primaries keep the canonical generic presentation on imported and native paths',async()=>{
  const names=['window','fetch','createImageBitmap','WebGL2RenderingContext'],old=new Map(names.map(k=>[k,globalThis[k]])),gl=new GL(),screen=context(),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:context()};screen.canvas=canvas;globalThis.WebGL2RenderingContext=GL;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();
  try {
    const unavailable=fixture(salvage()),unavailableAt=110000;resetCloseViewCamera();render(screen,unavailable,unavailableAt);assert.equal(closeViewGLStats.heroTriangles,0,'normal Wayfarer stays native while the imported asset is unavailable');const unavailableReady=Float32Array.from(gl.modelData);assert.ok(unavailableReady.length>0&&unavailableReady.every(Number.isFinite));unavailable.primaryAttack(unavailableAt);assert.equal(unavailable.player.attackVisual.weaponKind,'salvage-blade');render(screen,unavailable,unavailableAt);same(gl.modelData,unavailableReady,'asset-unavailable native accepted entry');render(screen,unavailable,unavailableAt+100);const unavailableContact=Float32Array.from(gl.modelData);assert.notDeepEqual(unavailableContact,unavailableReady,'asset-unavailable native contact is readable');render(screen,unavailable,unavailableAt+220);const unavailableRecovery=Float32Array.from(gl.modelData);assert.notDeepEqual(unavailableRecovery,unavailableContact,'asset-unavailable native recovery advances');render(screen,unavailable,unavailableAt+239.9);const unavailableBeforeEnd=Float32Array.from(gl.modelData);unavailable.update(.0001,calm,unavailableAt+240);render(screen,unavailable,unavailableAt+240);assert.ok(gl.modelData.every(Number.isFinite));near(gl.modelData,unavailableBeforeEnd,.003,'asset-unavailable native recovery crosses its idle endpoint continuously');
    globalThis.window={};globalThis.createImageBitmap=async()=>({width:1024,height:1024});globalThis.fetch=async url=>{const u=new URL(url);assert.equal(u.protocol,'file:');const b=fs.readFileSync(u);return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};await loadCloseViewHero();
    const warm=(g,start)=>{resetCloseViewCamera();render(screen,g,start-64);for(let step=1;step<=4;step++){const now=start-64+step*16;g.update(.016,{...calm,state:{x:.25,y:0}},now);render(screen,g,now);}};
    for(const [label,make] of [['salvage',salvage],['future',future]])for(const native of [true,false]){
      const g=fixture(make(),native),start=native?220000:120000;if(native)assert.equal(g.mechUp(),true);
      warm(g,start);const ready=shown(gl,native),readyGear=Float32Array.from(gl.modelData);assert.equal(closeViewGLStats.heroTriangles,native?0:3170);
      g.primaryAttack(start);const accepted=clone(g.player.attackVisual),strike=clone(g.player.meleeStrike);assert.equal(accepted.weaponKind,'salvage-blade');assert.equal(accepted.primaryStep,undefined,'generic fallback does not invent a staged combo');assert.deepEqual(accepted.aim,{x:strike.dx,y:strike.dy});
      render(screen,g,start);same(shown(gl,native),ready,`${label}/${native?'native Robot':'imported'} accepted entry`);same(gl.modelData,readyGear,`${label}/${native?'native Robot':'imported'} carry at entry`);
      render(screen,g,start+100);const contact=shown(gl,native);assert.notDeepEqual(contact,ready,`${label}/${native?'native Robot':'imported'} contact is readable`);
      render(screen,g,start+220);const recovery=shown(gl,native);assert.notDeepEqual(recovery,contact,`${label}/${native?'native Robot':'imported'} recovery advances`);
      render(screen,g,start+239.9);const beforeEnd=shown(gl,native);g.update(.0001,calm,start+240);render(screen,g,start+240);near(shown(gl,native),beforeEnd,native?.003:.006,`${label}/${native?'native Robot':'imported'} recovery crosses its idle endpoint continuously`);

      const q=fixture(make(),native);resetCloseViewCamera();render(screen,q,start);q.primaryAttack(start);q.save.equipment.primary=pike();q.player.attackVisual.future={kept:label};q.save.session.playerRuntime.futureRuntime={kept:8};q.setPaused(true,start+120);render(screen,q,start+5000);const frozen=shown(gl,native),saved=migrateSave(clone(q.exportSnapshot(start+5000))),back=new Game(saved,300000);back.enemies=[];back.presentation=q.presentation;resetCloseViewCamera();render(screen,back,300000);same(shown(gl,native),frozen,`${label}/${native?'native Robot':'imported'} accepted recovery survives switch/pause/reload`);assert.equal(back.player.attackVisual.weaponKind,'salvage-blade');assert.deepEqual(back.player.attackVisual.future,{kept:label});assert.deepEqual(saved.session.playerRuntime.futureRuntime,{kept:8});assert.equal(saved.equipment.primary.id,'primary-cinder-pike');assert.equal(saved.equipment.primary.name,'Cinder Pike');assert.equal(saved.version,14);
    }
    const legacy=fixture(salvage()),legacyAt=520000;legacy.player.attackUntil=legacyAt+240;legacy.player.actionVisualUntil=legacyAt+240;legacy.player.attackVisual={profile:'melee',durationMs:240,weaponKind:'salvage-blade'};const record=clone(legacy.player.attackVisual);resetCloseViewCamera();render(screen,legacy,legacyAt+80);assert.ok(gl.uploads.at(-1).length>0);assert.deepEqual(legacy.player.attackVisual,record,'legacy accepted melee without poseMs remains safe and unchanged');
  } finally { CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);for(const n of names){if(old.get(n)===undefined)delete globalThis[n];else globalThis[n]=old.get(n);} }
});

test('generic primaries share interruption priority and canonical strike/Echo origin',()=>{
  for(const make of [salvage,future]){
    const g=fixture(normalizeSockets({...make(),tier:'relic',affixes:[]})),start=400000;g.save.glyphs.echo=1;assert.equal(socketGlyph(g.save,'melee',0,'echo').ok,true);g.save.lastAim={x:1,y:0};
    g.primaryAttack(start);const accepted=clone(g.player.attackVisual),strike=clone(g.player.meleeStrike),queued=g.glyphTimers.find(q=>q.kind==='strike');assert.ok(queued);assert.deepEqual(accepted.aim,{x:strike.dx,y:strike.dy});
    const before=closeViewPlayerAction(g,start+60);assert.ok(before.active);g.lastUpdateNow=start+60;const key='spell:'+g.save.equippedSpell;g.save.magicSkills.cooldowns[key]=1;assert.equal(g.castSpell(g.save.equippedSpell),false);assert.deepEqual(g.player.attackVisual,accepted,'refused cast preserves accepted generic action');g.save.magicSkills.cooldowns[key]=0;assert.equal(g.castSpell(g.save.equippedSpell),true);assert.equal(closeViewPlayerAction(g,start+60).active,false);assert.equal(g.player.attackVisual.presentationCancelled,true);
    const hp=g.enemies[0]?.hp,priorStrike=g.player.meleeStrike;g.tickGlyphs(0,queued.at);assert.notStrictEqual(g.player.meleeStrike,priorStrike,'the accepted mechanical Echo recomputes fresh canonical geometry');assert.equal(g.attackProfile.shape,'cone');assert.equal(g.attackProfile.arc,100);assert.deepEqual({x:g.player.meleeStrike.dx,y:g.player.meleeStrike.dy},accepted.aim);if(Number.isFinite(hp))assert.ok(g.enemies[0].hp<hp);
  }
});

test('legacy no-poseMs melee and unknown action profiles retain their prior neutral clock path',()=>{
  const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),bytes=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url)),asset=decodeCloseViewHero(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),state=createHeroPoseState(asset),a=createHeroFrame(asset),b=createHeroFrame(asset),base={reducedMotion:false,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:.7,gaitPhase:.9};
  for(const action of [{kind:'melee',profile:'melee',phase:.4,durationMs:240,yaw:0},{kind:'melee',profile:'future-profile',phase:.4,durationMs:240,poseMs:777,yaw:0}]){
    sampleCloseViewHero(asset,state,{...base,nowMs:1000,action},a);sampleCloseViewHero(asset,state,{...base,nowMs:9000,action},b);same(a.positionsNormals,b.positionsNormals,action.profile+' keeps the pre-clock neutral base');
  }
});
