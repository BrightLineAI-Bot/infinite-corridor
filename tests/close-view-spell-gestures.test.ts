import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game,CAST_GESTURES} from '../src/game.ts';
import {freshSave,migrateSave} from '../src/types.ts';
import {ACTION_MOTION,normalizeCastVisual,stampAttackVisual} from '../src/action-motion.ts';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero} from '../src/close-view-hero.ts';
import {createLabFixture} from '../src/proving-ground-labs.ts';
import {closeViewPlayerAction} from '../src/close-view.ts';

test('new accepted spell gestures cancel older real tool poses without changing their effects or clocks',()=>{
  for(const scenario of ['blade-spark-ashling','blade-hammerfall-brute','cleaver-sweep-marshal','cleaver-mirage-stalker','blade-orrery-sentinel']){
    const {game:g}=createLabFixture({lab:'combat-assets',scenario,now:1000});g.enemies=[];
    assert.equal(g.fireSecondary(1000,{x:1,y:0}),true,scenario);
    const visual=g.player.attackVisual,deadline=g.player.actionVisualUntil,combat=g.player.attackUntil,effects=g.effects.slice();
    assert.equal(closeViewPlayerAction(g,1010).active,true,scenario);
    g.lastUpdateNow=1010;assert.equal(g.castSpell('cinder-dart'),true,scenario);
    assert.equal(g.player.attackVisual.presentationCancelled,true);assert.equal(closeViewPlayerAction(g,1020).active,false);
    assert.equal(g.player.actionVisualUntil,deadline);assert.equal(g.player.attackUntil,combat);assert.equal(g.player.castVisual.profile,'focus-forward');
    for(const effect of effects)assert.ok(g.effects.includes(effect),'presentation interruption must not remove pending mechanical effects');
    g.player.attackUntil=0;assert.equal(closeViewPlayerAction(g,1020).active,false,'production combat-clock mask cannot revive the old tool');
    assert.equal(g.player.attackVisual.profile,visual.profile);
  }
});

function arena(){const s=freshSave();s.seed='CAST-GESTURES';const g=new Game(s,0);g.area='dungeon';g.map={name:'Cast Hall',width:32,height:32,tiles:Array.from({length:1024},(_,i)=>({x:i%32,y:Math.floor(i/32),kind:'ash',blocked:false})),objects:[],enemySpawns:[],exits:null};Object.assign(g.player,{x:10,y:10,facing:'right'});g.save.lastAim={x:1,y:0};g.enemies=[];return g;}

test('all twelve canonical manual spell acceptances latch immutable identities and refusals do not',()=>{
  const ids=['cinder-dart','ember-ring','grave-sun','shadow-clone','gravity-well','stillpoint','aegis','shadow-boxing','fire-burst','imbue-weapon','essence-walk','orbit-volley'];
  for(const id of ids){const g=arena();g.lastUpdateNow=1000;assert.equal(g.castSpell(id),true,id);assert.equal(g.player.castVisual.spellKind,id);assert.equal(g.player.castVisual.profile,CAST_GESTURES[id]);assert.equal(g.player.castVisual.durationMs,ACTION_MOTION.castMs);assert.ok(Math.abs(Math.hypot(g.player.castVisual.aim.x,g.player.castVisual.aim.y)-1)<1e-9);const accepted=g.player.castVisual;g.cursed=()=>true;assert.equal(g.castSpell(id),false,`${id} curse refusal`);assert.strictEqual(g.player.castVisual,accepted,`${id} refusal cannot restamp`);}
});

test('clone and orbit manual follow-ups have distinct variants while a newer attack cancels, not erases, the cast',()=>{
  const clone=arena();clone.lastUpdateNow=1000;assert.equal(clone.castSpell('shadow-clone'),true);clone.lastUpdateNow=1100;assert.equal(clone.castSpell('shadow-clone'),true);assert.equal(clone.player.castVisual.variant,'swap');assert.equal(clone.player.castVisual.profile,'dusk-swap');
  const orbit=arena();orbit.lastUpdateNow=1000;assert.equal(orbit.castSpell('orbit-volley'),true);orbit.lastUpdateNow=1100;assert.equal(orbit.castSpell('orbit-volley'),true);assert.equal(orbit.player.castVisual.variant,'launch');assert.equal(orbit.player.castVisual.profile,'orbit-launch');assert.deepEqual(orbit.player.castVisual.origin,{x:orbit.orbit.flight.x,y:orbit.orbit.flight.y});assert.deepEqual(orbit.player.castVisual.target,{x:orbit.orbit.flight.tx,y:orbit.orbit.flight.ty});
  const record=orbit.player.castVisual;stampAttackVisual(orbit.player,'melee',240,{x:1,y:0});assert.equal(orbit.player.castVisual.cancelled,true);assert.equal(orbit.player.castVisual.spellKind,record.spellKind);assert.equal(orbit.player.castUntil,1460,'presentation cancellation cannot change the canonical cast clock');
});

test('Fire Burst latches the accepted fan centre and exact centre shell despite older shots and later aim changes',()=>{
  const g=arena();g.projectiles.push({id:'older-unrelated',x:2,y:3,dx:0,dy:1,life:9});g.save.lastAim={x:0,y:-1};g.lastUpdateNow=1000;
  assert.equal(g.castSpell('fire-burst'),true);const v=g.player.castVisual,shells=g.projectiles.filter(p=>p.fireBomb),centre=shells[Math.floor(shells.length/2)];
  assert.deepEqual(v.aim,{x:0,y:-1});assert.deepEqual(v.origin,{x:centre.x,y:centre.y});assert.deepEqual(v.target,v.origin);assert.equal(v.sourceId,centre.id);assert.equal(centre.dx,0);assert.equal(centre.dy,-1);
  g.save.lastAim={x:1,y:0};g.projectiles.unshift({id:'new-unrelated',x:30,y:30,dx:-1,dy:0,life:1});
  assert.deepEqual(g.player.castVisual,v,'accepted source facts are immutable after aim and projectile-list changes');
});

test('Shadow Clone create, held west placement, release, and swap retain canonical accepted endpoints',()=>{
  const g=arena();g.castAction='spell';g.movingNow=true;g.player.lastMoveVector={x:1,y:0};g.lastUpdateNow=1000;
  assert.equal(g.castSpell('shadow-clone'),true);const origin={x:10.5,y:10.45};assert.deepEqual(g.player.castVisual.origin,origin);assert.ok(g.player.castVisual.target.x<origin.x);const sourceUntil=g.player.castVisual.sourceUntil;
  g.tickCloneCharge(true,1500);const heldTarget={x:g.player.x+g.shadowClone.ox+.5,y:g.player.y+g.shadowClone.oy+.45};assert.deepEqual(g.player.castVisual.target,heldTarget);assert.deepEqual(g.player.castVisual.origin,origin);assert.equal(g.player.castVisual.sourceUntil,sourceUntil);assert.ok(g.player.castVisual.aim.x<-.999);
  g.tickCloneCharge(false,1516);const settled={...g.player.castVisual.target};g.player.x+=1;g.save.lastAim={x:1,y:0};assert.deepEqual(g.player.castVisual.target,settled,'settled evidence cannot follow a moved player');
  g.lastUpdateNow=1600;const swapOrigin={x:g.player.x+.5,y:g.player.y+.45},destination={x:g.player.x+g.shadowClone.ox+.5,y:g.player.y+g.shadowClone.oy+.45};assert.equal(g.castSpell('shadow-clone'),true);assert.equal(g.player.castVisual.variant,'swap');assert.deepEqual(g.player.castVisual.origin,swapOrigin);assert.deepEqual(g.player.castVisual.target,destination);assert.ok(g.player.castVisual.aim.x<-.999);
});

test('blocked clone swap is a refusal and Fire Burst metadata survives pause and JSON exactly',()=>{
  const clone=arena();clone.lastUpdateNow=1000;assert.equal(clone.castSpell('shadow-clone'),true);const accepted=clone.player.castVisual,at={x:clone.player.x+clone.shadowClone.ox,y:clone.player.y+clone.shadowClone.oy};clone.map.tiles[Math.floor(at.y)*clone.map.width+Math.floor(at.x)].blocked=true;clone.lastUpdateNow=1100;assert.equal(clone.castSpell('shadow-clone'),false);assert.strictEqual(clone.player.castVisual,accepted);
  const g=arena();g.save.lastAim={x:-1,y:0};g.lastUpdateNow=2000;assert.equal(g.castSpell('fire-burst'),true);g.player.castVisual.future={schema:15};const exact=JSON.parse(JSON.stringify(g.player.castVisual));g.setPaused(true,2010);const back=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(2010)))),9000);assert.deepEqual(back.player.castVisual,exact);assert.equal(back.player.castUntil,9350);
});

test('all six accepted Aperture disciplines own their truthful manual gesture identity',()=>{
  for(const id of ['ember-form','quickening','veil-guard','force-channel','aerial-step','rift-step']){const g=arena();g.save.magicSkills.learned[id]=1;g.save.magicSkills.cooldowns[id]=0;g.lastUpdateNow=2000;assert.equal(g.activateApertureSkill(id),true,id);assert.equal(g.player.castVisual.spellKind,id);assert.equal(g.player.castVisual.variant,'activate');assert.equal(g.player.castVisual.profile,CAST_GESTURES[id]);assert.equal(g.player.castUntil,2000+ACTION_MOTION.castMs);}
});

test('cast normalization preserves bounded future metadata and refuses malformed coordinates',()=>{
  const raw={spellKind:'future-spell',variant:'future-variant',profile:'future-profile',durationMs:360,aim:{x:3,y:4,note:'kept'},nested:{future:true},cancelled:false};const n=normalizeCastVisual(raw,180);
  assert.equal(n.nested.future,true);assert.equal(n.aim.note,'kept');assert.deepEqual({x:n.aim.x,y:n.aim.y},{x:.6,y:.8});assert.equal(normalizeCastVisual({...raw,target:{x:Infinity,y:0}},180),null);assert.equal(normalizeCastVisual({...raw,durationMs:10},180),null);
});

test('accepted identity and unknown metadata resume exactly on the existing paused cast clock',()=>{
  const g=arena();g.lastUpdateNow=1000;assert.equal(g.castSpell('grave-sun'),true);g.player.castVisual.future={kept:14};g.setPaused(true,1100);const snap=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(1100)))),back=new Game(snap,9000);
  assert.equal(back.player.castUntil,9260);assert.equal(back.player.castVisual.spellKind,'grave-sun');assert.equal(back.player.castVisual.profile,'raised-orb');assert.equal(back.player.castVisual.future.kept,14);assert.deepEqual(back.player.castVisual.target,g.player.castVisual.target);
});

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),file=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url)),asset=decodeCloseViewHero(meta,file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
function pose(profile,phase=.5){const s=createHeroPoseState(asset),f=createHeroFrame(asset);assert.equal(sampleCloseViewHero(asset,s,{nowMs:1000,reducedMotion:false,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:1.2,gaitPhase:1,heldProfile:'melee',action:{kind:'cast',profile,phase,durationMs:360,yaw:0},alpha:1,tint:[1,1,1],hitFlash:0},f),true);assert.ok(f.positionsNormals.every(Number.isFinite));return f;}
test('gesture families remain visibly distinct at fixed 30/60fps samples with unit normals',()=>{
  const profiles=['focus-forward','outward-ring','raised-orb','compression','crossed-ward','dusk-split','fighting-stance','weapon-imbue','flow-forward','orbit-launch','traversal-brace','rift-fold'];
  const frames=profiles.map(p=>pose(p,15/30));for(let i=1;i<frames.length;i++)assert.notDeepEqual(frames[i].leftSocket,frames[0].leftSocket,profiles[i]);
  for(const hz of [30,60])for(const p of profiles)for(let t=0;t<=.36;t+=1/hz){const f=pose(p,t/.36);for(let i=3;i<f.positionsNormals.length;i+=6)assert.ok(Math.abs(Math.hypot(f.positionsNormals[i],f.positionsNormals[i+1],f.positionsNormals[i+2])-1)<1e-4);}
});

function heldPose(heldProfile,profile,phase,speed=0){const s=createHeroPoseState(asset),f=createHeroFrame(asset);assert.equal(sampleCloseViewHero(asset,s,{nowMs:0,reducedMotion:true,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed,gaitPhase:1.1,heldProfile,primaryCarryStage:heldProfile==='verge-cleaver'?{kind:'legacy',step:1}:null,action:profile?{kind:'cast',profile,phase,durationMs:360,yaw:0}:null,alpha:1,tint:[1,1,1],hitFlash:0},f),true);return f;}
test('reachable cast targets raise and spread the free hand while both primary grips remain exact',()=>{
  for(const held of ['verge-cleaver','cinder-pike'])for(const speed of [0,1.2]){const idle=heldPose(held,null,0,speed),direct=heldPose(held,'focus-forward',.08,speed),orb=heldPose(held,'raised-orb',.3,speed),ward=heldPose(held,'crossed-ward',.3,speed),split=heldPose(held,'dusk-split',.3,speed),start=heldPose(held,'focus-forward',0,speed),end=heldPose(held,'focus-forward',1,speed);
    assert.ok(direct.leftSocket[14]>1.02,`${held} direct hand reaches shoulder height (${direct.leftSocket[14]} from ${idle.leftSocket[14]})`);assert.ok(direct.leftSocket[12]>.2,`${held} direct hand reaches forward (${direct.leftSocket[12]})`);assert.ok(orb.leftSocket[14]>direct.leftSocket[14]+.12,`${held} orb rises above direct release`);assert.ok(ward.leftSocket[14]>.95,`${held} ward occupies chest space (${ward.leftSocket[14]})`);assert.ok(Math.abs(split.leftSocket[13]-split.rightSocket[13])>Math.abs(idle.leftSocket[13]-idle.rightSocket[13])+.12,`${held} split opens laterally`);
    assert.ok(Math.hypot(direct.rightSocket[12]-idle.rightSocket[12],direct.rightSocket[13]-idle.rightSocket[13],direct.rightSocket[14]-idle.rightSocket[14])<1e-5,`${held} weapon grip remains anchored`);assert.deepEqual(start.positionsNormals,idle.positionsNormals);assert.deepEqual(end.positionsNormals,idle.positionsNormals);assert.deepEqual(start.rightSocket,idle.rightSocket);assert.deepEqual(end.rightSocket,idle.rightSocket);
  }
});
