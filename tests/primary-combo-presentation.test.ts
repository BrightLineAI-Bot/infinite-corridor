import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { normalizeAttackVisual, normalizePrimaryCombo } from '../src/action-motion.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { closeViewPlayerAction, CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { loadCloseViewHero, decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { writeCloseViewHeroGear, MODEL_FLOATS, modelTriangleCount } from '../src/close-view-models.ts';
import { render } from '../src/renderer.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';
const clone=x=>JSON.parse(JSON.stringify(x));
const item=kind=>({id:'primary-'+kind,name:kind==='cinder-pike'?'Cinder Pike':'Verge Cleaver',slot:'primary',power:5,property:kind==='cinder-pike'?'reach':'impact'});
const fixture=(kind='verge-cleaver')=>{const {game:g}=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000});g.enemies=[];g.save.equipment.primary=item(kind);g.presentation={effectiveQuality:'full',reduceMotion:false};return g;};
const calm={state:{x:0,y:0},consume:()=>false,held:()=>false};

test('only successful real primary inputs cycle 1/2/3; Echo keeps damage clocks but never replays or advances presentation',()=>{
  for(const kind of ['cinder-pike','verge-cleaver']){
    const g=fixture(kind),steps=[];
    for(let n=0;n<7;n++){
      const now=100000+n*500;g.primaryAttack(now);steps.push(g.player.attackVisual.primaryStep);
      const accepted=clone(g.player.attackVisual),combo=clone(g.player.primaryCombo),until=g.player.primaryVisualUntil;
      g.primaryAttack(now+1);assert.deepEqual(g.player.attackVisual,accepted);assert.deepEqual(g.player.primaryCombo,combo,'refusal cannot advance');
      g.primaryStrike(now+80,null,{share:.25});assert.equal(g.player.attackUntil,now+320,'existing Echo shared clock remains');assert.equal(g.player.primaryVisualUntil,until);
      assert.deepEqual(g.player.attackVisual,accepted);assert.deepEqual(g.player.primaryCombo,combo);
      assert.equal(closeViewPlayerAction(g,now+120).amount,.5,'Echo cannot rewind accepted phase');
      assert.equal(closeViewPlayerAction(g,now+250).active,false,'Echo cannot extend the real body action');
    }
    assert.deepEqual(steps,[1,2,3,1,2,3,1]);
    g.save.equipment.primary=item(kind==='cinder-pike'?'verge-cleaver':'cinder-pike');g.primaryAttack(104000);assert.equal(g.player.attackVisual.primaryStep,1,'different primary family restarts its presentation');
    g.player.hp=0;g.update(.01,calm,104010);assert.equal(g.player.primaryCombo,null);assert.equal(g.player.primaryVisualUntil,0);
  }
});

test('accepted primary stage, visual clock and unknown metadata survive pause/reload, while malformed and legacy records remain safe',()=>{
  const g=fixture('cinder-pike');g.primaryAttack(100000);g.primaryAttack(100500);const accepted=clone(g.player.attackVisual);
  g.player.primaryCombo.future={kept:true};g.player.attackVisual.future={kept:true};g.save.equipment.primary=item('verge-cleaver');
  g.setPaused(true,100560);const saved=migrateSave(clone(g.exportSnapshot(110000))),back=new Game(saved,200000);
  assert.equal(saved.version,14);assert.equal(saved.session.playerRuntime.primaryVisualMotion,180);assert.equal(back.player.primaryVisualUntil-back.pauseStarted,180);
  assert.equal(back.player.attackVisual.primaryStep,2);assert.equal(back.player.attackVisual.weaponKind,'cinder-pike');assert.deepEqual(back.player.attackVisual.aim,accepted.aim);
  assert.deepEqual(back.player.primaryCombo.future,{kept:true});assert.deepEqual(back.player.attackVisual.future,{kept:true});
  back.setPaused(false,205000);assert.equal(closeViewPlayerAction(back,205000).amount,.25);assert.equal(back.player.primaryVisualUntil,205180);
  back.player.attackReadyAt=0;back.primaryAttack(205001);assert.equal(back.player.attackVisual.primaryStep,1,'new accepted family starts its own cycle');
  const legacy=freshSave();legacy.session.playerRuntime.attackMotion=120;legacy.session.playerRuntime.attackVisual={profile:'melee',weaponKind:'cinder-pike',durationMs:240};const old=new Game(migrateSave(legacy),300000);assert.equal(closeViewPlayerAction(old,300000).amount,.5);
  for(const primaryStep of [0,4,1.5,'2',Infinity])assert.equal(normalizeAttackVisual({profile:'melee',durationMs:240,primaryStep}),null);
  for(const raw of [[],{weaponKind:'bad/path',step:1},{weaponKind:'cinder-pike',step:4}])assert.equal(normalizePrimaryCombo(raw),null);
  assert.deepEqual(normalizePrimaryCombo({weaponKind:'future-primary',step:2,future:7}),{weaponKind:'future-primary',step:2,future:7});
  const malformed=freshSave();malformed.session.playerRuntime.primaryVisualMotion=Infinity;assert.equal(migrateSave(malformed).session.playerRuntime.primaryVisualMotion,0);
});

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),bytes=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url)),asset=decodeCloseViewHero(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const input={nowMs:1200,reducedMotion:false,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:0,gaitPhase:0};
test('gladius carries low in one hand with a free arm, visible walking bob and a thin bounded blade',()=>{
  const s=createHeroPoseState(asset),f=createHeroFrame(asset),neutral=createHeroFrame(asset),gear=new Float32Array(256*3*MODEL_FLOATS);let low=Infinity,high=-Infinity;
  for(let n=0;n<=24;n++){
    const i={...input,nowMs:1200+n*16,speed:2.4,gaitPhase:n/24*Math.PI*2};sampleCloseViewHero(asset,s,i,neutral);sampleCloseViewHero(asset,s,{...i,heldProfile:'verge-cleaver'},f);
    assert.deepEqual(f.leftSocket,neutral.leftSocket,'the free arm retains source walking');low=Math.min(low,f.rightSocket[14]);high=Math.max(high,f.rightSocket[14]);
    const end=writeCloseViewHeroGear(gear,0,{profile:'verge-cleaver',rightSocket:f.rightSocket});let tip=Infinity;for(let k=2;k<end;k+=10)tip=Math.min(tip,gear[k]);assert.ok(tip>.04&&tip<.30,`low point clears ground: ${tip}`);assert.ok(f.rightSocket[14]<.82,'carry stays near hip');
  }
  assert.ok(high-low>.025,'carry follows natural walking bob');assert.ok(modelTriangleCount('playerVergeCleaver')<=256);
});

test('three cuts and three thrusts remain distinct at 30/60fps with no source foot displacement',()=>{
  const s=createHeroPoseState(asset),frames=Array.from({length:4},()=>createHeroFrame(asset));
  for(const profile of ['verge-cleaver','cinder-pike'])for(const hz of [30,60]){
    let distinct=0,moved=0;
    for(let frame=1;frame<=Math.floor(.24*hz);frame++){
      const phase=frame/hz/.24,i={...input,nowMs:1200+phase*240,speed:.6,gaitPhase:.7,heldProfile:profile};
      sampleCloseViewHero(asset,s,i,frames[0]);const feet=[...s.pose.slice(10,20),...s.pose.slice(360,370)];
      for(let stage=1;stage<=3;stage++){sampleCloseViewHero(asset,s,{...i,action:{kind:'melee',profile,primaryStep:stage,phase,durationMs:240,poseMs:1200,yaw:0}},frames[stage]);assert.deepEqual([...s.pose.slice(10,20),...s.pose.slice(360,370)],feet);}
      const gap=(a,b)=>Math.hypot(...[12,13,14].map(k=>frames[a].rightSocket[k]-frames[b].rightSocket[k]));
      if(Math.min(gap(1,2),gap(1,3),gap(2,3))>.025)distinct++;
      if(Math.max(gap(0,1),gap(0,2),gap(0,3))>.08)moved++;
    }
    assert.ok(distinct>=Math.floor(.10*hz),`${profile}/${hz} distinct frames=${distinct}`);assert.ok(moved>=Math.floor(.10*hz),`${profile}/${hz} readable motion=${moved}`);
  }
});

const context=()=>new Proxy({canvas:null,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
class GL { uploads=[];constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}isContextLost(){return false;}createShader(){return{};}createProgram(){return{};}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}getError(){return this.NO_ERROR;}getUniformLocation(){return{};}getAttribLocation(){return 0;}bufferSubData(t,o,a){this.uploads.push(Float32Array.from(a));}}
test('actual Game and renderer display accepted stage sequences at 30/60fps, preserve partial-walk boundaries, and freeze a switched weapon on pause/reload',async()=>{
  const names=['window','fetch','createImageBitmap','WebGL2RenderingContext'],old=new Map(names.map(k=>[k,globalThis[k]]));const gl=new GL(),screen=context(),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:context()};screen.canvas=canvas;globalThis.WebGL2RenderingContext=GL;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();
  try{
    globalThis.window={};globalThis.createImageBitmap=async()=>({width:1024,height:1024});globalThis.fetch=async url=>{const u=new URL(url);assert.equal(u.protocol,'file:');const b=fs.readFileSync(u);return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};await loadCloseViewHero();
    for(const kind of ['verge-cleaver','cinder-pike'])for(const hz of [30,60]){
      const g=fixture(kind);resetCloseViewCamera();let now=100400;render(screen,g,390,844,now);
      for(let n=1;n<=12;n++){now+=1000/hz;g.update(1/hz,{...calm,state:{x:.2,y:0}},now);render(screen,g,390,844,now);}
      const ready=gl.uploads.at(-1);g.primaryAttack(now);assert.equal(g.player.attackVisual.primaryStep,1);render(screen,g,390,844,now);assert.deepEqual(gl.uploads.at(-1),ready,'same-clock partial walking entry');
      const stageFrames=[];
      for(let stage=1;stage<=4;stage++){
        if(stage>1){now+=500;g.primaryAttack(now);render(screen,g,390,844,now);}const start=now,accepted=clone(g.player.attackVisual);assert.equal(accepted.primaryStep,(stage-1)%3+1);
        for(let frame=1;frame<=Math.floor(.24*hz);frame++){const t=start+frame*1000/hz;render(screen,g,390,844,t);if(frame===Math.round(.10*hz))stageFrames.push(gl.uploads.at(-1));}
        assert.equal(g.player.attackUntil,start+240);assert.deepEqual(g.player.attackVisual,accepted,'rendering never advances gameplay or the stage');
      }
      assert.notDeepEqual(stageFrames[0],stageFrames[1]);assert.notDeepEqual(stageFrames[1],stageFrames[2]);
      now+=500;g.primaryAttack(now);render(screen,g,390,844,now+80);const active=gl.uploads.at(-1);g.save.equipment.primary=item(kind==='verge-cleaver'?'cinder-pike':'verge-cleaver');g.setPaused(true,now+80);render(screen,g,390,844,now+5000);assert.deepEqual(gl.uploads.at(-1),active,'pause and equipment switch retain accepted body');
      const back=new Game(migrateSave(clone(g.exportSnapshot(now+5000))),200000);back.enemies=[];back.presentation=g.presentation;resetCloseViewCamera();render(screen,back,390,844,200000);assert.equal(back.player.attackVisual.primaryStep,2);assert.equal(back.player.attackVisual.weaponKind,kind);
      // Reload must preserve the accepted trajectory/clock; ordinary locomotion reconstruction is a pre-existing separate limitation.
      assert.equal(closeViewPlayerAction(back,200000).amount,closeViewPlayerAction(g,now+80).amount);
    }
    for(const kind of ['verge-cleaver','cinder-pike'])for(const gesture of ['cast','jump','tool']){
      const g=fixture(kind),start=400000;resetCloseViewCamera();render(screen,g,390,844,start);g.primaryAttack(start);render(screen,g,390,844,start+60);
      const accepted=clone(g.player.attackVisual),until=g.player.attackUntil,combo=clone(g.player.primaryCombo);
      if(gesture==='cast'){
        g.lastUpdateNow=start+60;const key='spell:'+g.save.equippedSpell;g.save.magicSkills.cooldowns[key]=1;assert.equal(g.castSpell(g.save.equippedSpell),false);assert.equal(g.player.primaryVisualUntil,until,'refused cast leaves primary pose intact');g.save.magicSkills.cooldowns[key]=0;
        assert.equal(g.castSpell(g.save.equippedSpell),true);assert.equal(g.player.primaryVisualUntil,0);
      }else if(gesture==='jump'){
        g.update(0,{...calm,consume:k=>k==='jump'},start+60);assert.ok(g.jumpUntil>start+60);assert.equal(g.player.primaryVisualUntil,0);
      }else{
        g.player.attackReadyAt=0;assert.equal(g.fireSecondary(start+60,{x:0,y:-1}),true);assert.equal(g.player.attackVisual.profile,'emitter');
        assert.equal(closeViewPlayerAction(g,start+100).until,g.player.attackUntil,'new accepted tool owns its normal clock');
      }
      if(gesture!=='tool'){assert.equal(closeViewPlayerAction(g,start+100).active,false);assert.equal(g.player.attackUntil,until);assert.deepEqual(g.player.attackVisual,accepted);}
      assert.deepEqual(g.player.primaryCombo,combo,'interrupting action cannot advance or reset the accepted cycle');
      render(screen,g,390,844,start+120);const gestureFrame=gl.uploads.at(-1);
      g.player.castUntil=0;g.jumpUntil=0;g.player.attackUntil=0;g.player.primaryVisualUntil=0;render(screen,g,390,844,start+120);
      assert.notDeepEqual(gestureFrame,gl.uploads.at(-1),`${kind} renders the accepted ${gesture} gesture after primary interruption`);
    }
  }finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);for(const n of names){if(old.get(n)===undefined)delete globalThis[n];else globalThis[n]=old.get(n);}}
});
