import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero} from '../src/close-view-hero.ts';
import {TOOL_ACTION_TIMING,TOOL_USE_STARTUP_MS} from '../src/action-motion.ts';
import {createLabFixture} from '../src/proving-ground-labs.ts';
import {closeViewHandRoles} from '../src/close-view-player-presentation.ts';
const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),raw=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url)),asset=decodeCloseViewHero(meta,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
const profiles=Object.keys(TOOL_ACTION_TIMING),releaseHashes=["f5a13aa180b8c924d7ffc9692b3ecc375e8e30f4e89587c85fa0c292efd6d0e9","125f7aaa8964a65d050e0bdef63e329180fe9d6084e66e137161d39c690f5393","ae3dab196efd9731c14354d039f764dfb0d3f5d200ca858ad2aebb59ad41948f","e74b95b0c47a552b5d74b8d0125b84cb579ddfcb3a0c0944b35e788e2c028163"];
// Full-frame fixtures intentionally include the newly approved raised Pike free-hand carry.
// Weapon hands (2026-11-11): right-hand tools grip leftSocket; the Great Sweep stays in the left hand (rightSocket).
// Great Sweep entries (2026-11-12): the release frame of the new one-turn sweep (CLOSE_VIEW_GREAT_SWEEP), blade drawn back.
// 2026-11-14 (the Pike carried in both hands across the body): every frame hash re-taken with the new carry; the Great Sweep
// grip, solved from that carry, moved by one float step (6e-8) and is re-taken too. The three tool grips are unchanged.
const priorGripRelease=[[0.3665824234485626,-1.4788187341352454e-10,2.578688906851312e-08,0,2.2982364455970128e-08,7.942384527837021e-09,0.3665824830532074,0,-3.4325534414847425e-08,-0.3665825426578522,-6.879757563638123e-08,0,0.24899500608444214,0.1440221518278122,0.8287870287895203,1],[0.36475104093551636,3.0184299504298906e-08,0.03659716621041298,0,-0.03659719228744507,1.040416677255962e-07,0.3647511303424835,0,-1.4583147134317187e-08,-0.3665825426578522,-2.8671703233840162e-08,0,0.32585906982421875,0.11445910483598709,1.1244181394577026,1],[0.3665824234485626,1.8331139273186636e-08,-1.0142965578552321e-08,0,-3.784191804356851e-08,8.591995026563382e-08,0.3665825128555298,0,-4.370602102454768e-09,-0.3665825426578522,-3.578778162705021e-08,0,0.3849852681159973,0.17358532547950745,1.1658064126968384,1],[-0.23454420268535614,-0.28088825941085815,0.021760761737823486,0,-0.02538374625146389,-0.007130306679755449,-0.3656330704689026,0,0.2805839478969574,-0.23544348776340485,-0.01488781813532114,0,0.029536277055740356,-0.22202852368354797,0.9517025947570801,1]];
function record(profile,scale=1){return {durationMs:TOOL_ACTION_TIMING[profile].durationMs,toolKind:profile,toolMotion:{v:1,entry:[0,0,0,0,0],direction:1,baseKind:'cinder-pike'},toolUse:{v:1,id:'refinement-tool',startupMs:TOOL_USE_STARTUP_MS[profile]*scale,phase:'startup'}};}
function sample(profile,r,elapsed,reducedMotion=false,state=createHeroPoseState(asset)){const frame=createHeroFrame(asset),action={...r,kind:profile==='great-sweep'?'melee':'ranged',profile,phase:elapsed/r.durationMs};assert.ok(sampleCloseViewHero(asset,state,{nowMs:2000,reducedMotion,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:1.2,gaitPhase:1.1,heldProfile:'cinder-pike',action,alpha:1,tint:[1,1,1],hitFlash:0},frame));return{state,frame};}
function hash(f){const h=crypto.createHash('sha256');for(const a of[f.positionsNormals,f.leftSocket,f.rightSocket])h.update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));return h.digest('hex');}
function delta(a,b){let n=0;for(let k=0;k<a.length;k++)n=Math.max(n,Math.abs(a[k]-b[k]));return n;}
test('all four release frames preserve reviewed Pike carry and the exact prior physical launch origin',()=>{
  for(const reduced of[false,true])for(const scale of[1,.5])for(let i=0;i<profiles.length;i++){const profile=profiles[i],r=record(profile,scale),s=r.toolUse.startupMs,before=sample(profile,r,s,reduced).frame;r.toolUse={...r.toolUse,phase:'released',releaseOffsetMs:s};const released=sample(profile,r,s,reduced).frame;assert.equal(hash(released),releaseHashes[i]);assert.equal(hash(before),releaseHashes[i]);assert.deepEqual(Array.from(released[closeViewHandRoles(profile).grip].slice(12,15)),priorGripRelease[i].slice(12,15),'physical tool origin is byte-exact');assert.ok(delta(released[closeViewHandRoles(profile).grip],priorGripRelease[i])<2e-8,'only sub-float basis roundoff may differ from pre-Pike IK');}
});
test('entry, release and final recovery remain continuous with no descriptor mutation',()=>{
  for(const reduced of[false,true])for(const scale of[1,.5])for(const profile of profiles){const r=record(profile,scale),s=r.toolUse.startupMs;for(const t of[0,s,r.durationMs]){const at={...r,toolUse:t<s?r.toolUse:{...r.toolUse,phase:'released',releaseOffsetMs:s}},f=sample(profile,at,t,reduced).frame,saved=structuredClone(at);for(const sign of[-1,1]){const n=Math.max(0,Math.min(r.durationMs,t+sign*1e-4)),near={...r,toolUse:n<s?r.toolUse:{...r.toolUse,phase:'released',releaseOffsetMs:s}},g=sample(profile,near,n,reduced).frame;assert.ok(delta(f.positionsNormals,g.positionsNormals)<1e-4);assert.ok(delta(f.rightSocket,g.rightSocket)<1e-4);}assert.deepEqual(at,saved);}}
});
test('stored release age owns settling independently of frame history and fixed geometry budgets',()=>{
  for(const profile of profiles){const r=record(profile,.5),s=r.toolUse.startupMs;r.toolUse={...r.toolUse,phase:'released',releaseOffsetMs:s};const state=createHeroPoseState(asset);for(let i=0;i<=60;i++){const ms=r.durationMs*i/60,a=sample(profile,r,ms,false,state).frame,b=sample(profile,r,ms,false).frame;assert.equal(hash(a),hash(b));assert.equal(a.vertexCount,asset.vertexCount);assert.equal(a.indexCount,asset.indexCount);assert.ok(a.positionsNormals.every(Number.isFinite));}}
});
test('actual repeated accepted tools inherit their prior hand pose without restarting a body-load pulse',()=>{
  const names={'rift-bombard':'Rift Bombard',blunderbuss:'Blunderbuss','lumen-spindle':'Lumen Spindle','great-sweep':'Great Sweep'};
  for(const profile of profiles){const g=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000}).game;g.enemies=[];g.save.closeView=true;g.save.activeWeaponSlot='primary';g.save.equipment.secondary={id:'secondary-'+profile,name:names[profile],slot:'secondary',power:5};for(const tile of g.map.tiles){tile.blocked=false;tile.openAir=false;tile.courtyard=false;tile.pentRoof=false;tile.pentBalcony=false;}
    assert.equal(g.fireSecondary(100000,{x:1,y:0}),true);const due=g.pendingToolUse.releaseAt;g.releasePendingToolUse(due);const old=structuredClone(g.player.attackVisual),ready=profile==='great-sweep'?g.toolReadyAt:g.player.attackReadyAt,before=sample(profile,old,ready-100000).frame;
    assert.equal(g.fireSecondary(ready,{x:1,y:0}),true);const after=sample(profile,g.player.attackVisual,0).frame;assert.equal(hash(after),hash(before),profile+' repeat is continuous');
  }
});
