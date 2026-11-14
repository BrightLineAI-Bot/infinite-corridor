import test from 'node:test';
import {swingTo} from './swing-helpers.ts';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLabFixture} from '../src/proving-ground-labs.ts';
import {Game} from '../src/game.ts';
import {createCombatant} from '../src/combat.ts';
import {serializeSave,deserializeSave} from '../src/persistence.ts';
import {advancePrimaryCombo,CLEAVER_COMBO_IDLE_MS,recordHeroPresentation,primaryCarryStage} from '../src/action-motion.ts';
import {normalizeSockets,socketGlyph} from '../src/glyphs.ts';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero} from '../src/close-view-hero.ts';
import {writeCloseViewModel} from '../src/close-view-models.ts';
const copy=x=>structuredClone(x),start=100000;
const item=kind=>({id:`primary-${kind}`,name:kind==='verge-cleaver'?'Verge Cleaver':kind==='cinder-pike'?'Cinder Pike':'Iron Fists',slot:'primary',power:5,property:'impact'});
function fixture(now=start){
  const g=createLabFixture({lab:'combat-assets',scenario:'cleaver-bombard-crawler',now}).game;
  g.save.activeWeaponSlot='primary';g.save.lastAim={x:1,y:0};g.effects=[];g.projectiles=[];
  const foe=Object.assign(createCombatant('rootBrute',g.player.x+1,g.player.y),{id:'combo-practice',hp:10000,maxHp:10000,damage:0,cooldown:99,passiveBehavior:'practice'});g.enemies=[foe];
  assert.equal(g.closeViewActionEligible(),true);return{g,foe};
}
function input(action=null){const q=new Set(action?[action]:[]);return{state:{x:0,y:0},consume:k=>q.delete(k),held:()=>false,reset:()=>{}};}
function press(g,now){g.update(.016,input('attack'),now);return g.player.attackVisual.primaryMotion?.step;}
// 2026-11-14: a Cleaver press is a weighted swing (melee-swing.ts, record v3); run it out on its own clock. v1 records still release at releaseAt.
function contact(g){const q=copy(g.pendingMeleeContact);assert.ok(q);if(q.v===3)swingTo(g,q.lastNow);else g.update(.001,input(),q.releaseAt);assert.equal(g.pendingMeleeContact,null);return q;}
const stamp=g=>g.player.primaryCombo.resetWindow.acceptedLogicalMs;

test('actual Cleaver acceptance continues at 999ms and resets at 1000/1001ms without changing mechanics',()=>{
  assert.equal(CLEAVER_COMBO_IDLE_MS,1000);
  for(const gap of [999,1000,1001]){
    const{g,foe}=fixture(),hp=foe.hp;assert.equal(press(g,start),1);const first=contact(g),damage=hp-foe.hp;
    const prior=copy(g.player.attackVisual),combo=copy(g.player.primaryCombo),before=foe.hp;
    assert.deepEqual(primaryCarryStage(prior,combo,false),{kind:'cleaver-three',step:1,direction:1});
    assert.equal(press(g,start+gap),gap<1000?2:1);
    assert.equal(stamp(g),start+gap);const ready=g.player.attackReadyAt-(start+gap),second=contact(g);
    assert.equal(foe.hp,before-damage);assert.equal(ready,0,'the live swing, not a cooldown, gates the next press');
    assert.equal(second.contactMs,first.contactMs);assert.deepEqual(second.payload.profile,first.payload.profile);assert.deepEqual(second.aim,first.aim);
    g.update(.01,input(),start+gap+500);assert.equal(foe.hp,before-damage,'each accepted attack contacts once');
  }
});
test('three distinct voluntary cuts cycle, and any partial sequence restarts after the idle window',()=>{
  const{g}=fixture(),steps=[];for(let i=0;i<5;i++){steps.push(press(g,start+i*500));contact(g);}assert.deepEqual(steps,[1,2,3,1,2]);
  for(const length of [1,2,3]){const{g}=fixture();for(let i=0;i<length;i++){assert.equal(press(g,start+i*500),i+1);contact(g);}assert.equal(press(g,start+(length-1)*500+1000),1);}
});
test('refusal, contact, Echo and clone work never advance or refresh accepted-input metadata',()=>{
  const{g}=fixture();g.save.equipment.primary=normalizeSockets({...g.save.equipment.primary,tier:'relic',affixes:[]});g.save.glyphs.echo=1;assert.equal(socketGlyph(g.save,'melee',0,'echo').ok,true);
  assert.equal(press(g,start),1);const combo=copy(g.player.primaryCombo),v=copy(g.player.attackVisual);
  g.update(.001,input('attack'),start+1);assert.deepEqual(g.player.primaryCombo,combo);assert.deepEqual(g.player.attackVisual,v);
  contact(g);assert.deepEqual(g.player.primaryCombo,combo);
  assert.ok(g.glyphTimers.some(q=>q.kind==='strike'));
  g.update(.001,input(),start+400);assert.deepEqual(g.player.primaryCombo,combo);
  g.primaryStrike(start+410,null,{share:.25});g.shadowClone={ox:-1,oy:0,until:start+2000};g.cloneSwing({range:1.75,arc:180,damage:1},{x:1,y:0},start+410);
  assert.deepEqual(g.player.primaryCombo,combo);
  assert.equal(press(g,start+1000),1,'non-input work cannot keep the combo alive');
});
test('tool weave does not refresh the window; buffered acceptance uses execution time, not request time',()=>{
  const{g}=fixture();assert.equal(press(g,start),1);contact(g);assert.equal(press(g,start+500),2);contact(g);
  assert.equal(g.fireSecondary(start+1200,{x:1,y:0}),true);const q=copy(g.pendingToolUse),combo=copy(g.player.primaryCombo);
  g.update(.001,input(),q.releaseAt);assert.deepEqual(g.player.primaryCombo,combo);
  g.update(.001,input('attack'),start+1490);assert.ok(g.attackBufferUntil>start+1490);assert.deepEqual(g.player.primaryCombo,combo);
  g.update(.001,input(),start+1560);assert.equal(g.player.attackVisual.primaryMotion.step,1);assert.equal(stamp(g),start+1560);
});
test('Pike three-step and two-argument helpers stay legacy; family switches restart and Fists do not borrow this clock',()=>{
  const old={primaryCombo:{weaponKind:'verge-cleaver',v:2,step:3,future:7}};assert.equal(advancePrimaryCombo(old,'verge-cleaver'),4);assert.equal(old.primaryCombo.resetWindow,undefined);
  const p={};assert.deepEqual(Array.from({length:4},()=>advancePrimaryCombo(p,'cinder-pike',start)),[1,2,3,1]);assert.equal(p.primaryCombo.resetWindow,undefined);
  const{g}=fixture();assert.equal(press(g,start),1);contact(g);g.save.equipment.primary=item('cinder-pike');g.update(.016,input('attack'),start+500);assert.equal(g.player.attackVisual.primaryStep,1);
  g.update(.016,input('attack'),start+5000);assert.equal(g.player.attackVisual.primaryStep,2,'Pike has no new expiry');
  g.save.equipment.primary=item('verge-cleaver');assert.equal(press(g,start+5500),1);contact(g);
  const combo=copy(g.player.primaryCombo);g.save.equipment.primary=item('iron-fists');g.update(.016,input('attack'),start+6000);
  assert.deepEqual(g.player.primaryCombo,combo);assert.ok(g.player.attackVisual.profile==='fist'||g.fistCharge,'Fists retain their own producer');
});
test('pause excludes elapsed wall time and resumes the same logical acceptance window',()=>{
  for(const wait of [500,1000]){
    const{g}=fixture();press(g,start);contact(g);press(g,start+500);contact(g);g.setPaused(true,start+700);const combo=copy(g.player.primaryCombo);
    g.setPaused(false,start+400700);assert.deepEqual(g.player.primaryCombo,combo);
    assert.equal(press(g,start+400500+wait),wait<1000?3:1);assert.equal(stamp(g),start+500+wait);
  }
});
test('canonical save round trips preserve recent/expired windows and exclude closed time',()=>{
  for(const elapsedAfterSave of [99,100,101]){
    const{g}=fixture();press(g,start);contact(g);press(g,start+500);contact(g);
    g.player.primaryCombo.extra={kept:[1,2]};g.player.primaryCombo.resetWindow.extra={kept:true};
    const text=serializeSave(g.exportSnapshot(start+1400)),combo=copy(g.player.primaryCombo),back=new Game(deserializeSave(text),900000);back.installSystems();
    assert.deepEqual(back.player.primaryCombo,combo);
    assert.equal(press(back,900000+elapsedAfterSave),elapsedAfterSave<100?3:1);
    assert.deepEqual(back.player.primaryCombo.extra,{kept:[1,2]});assert.deepEqual(back.player.primaryCombo.resetWindow.extra,{kept:true});
  }
  const{g}=fixture();press(g,start);contact(g);g.setPaused(true,start+300);
  const saved=serializeSave(g.exportSnapshot(start+9000)),back=new Game(deserializeSave(saved),900000);back.installSystems();assert.equal(back.paused,true);back.setPaused(false,905000);
  assert.equal(press(back,905200),2,'save while paused and closed time cannot expire a recent window');
});
test('old v2 without a stamp restarts only on acceptance, while opaque future counters and windows survive',()=>{
  const{g}=fixture();g.player.primaryCombo={weaponKind:'verge-cleaver',v:2,step:4,legacyUnknown:{kept:true}};
  const old=copy(g.player.primaryCombo);g.player.attackVisual={profile:'melee',weaponKind:'verge-cleaver',durationMs:480,primaryMotion:{v:2,step:4},aim:{x:1,y:0}};g.player.actionVisualUntil=start+480;
  const visual=copy(g.player.attackVisual);g.exportSnapshot(start+100);assert.deepEqual(g.player.primaryCombo,old);assert.deepEqual(g.player.attackVisual,visual);
  assert.equal(press(g,start+1000),1);assert.deepEqual(g.player.primaryCombo.legacyUnknown,{kept:true});
  const future={weaponKind:'verge-cleaver',v:9,step:99,future:{kept:[1,2]},resetWindow:{v:8,opaque:true}},p={primaryCombo:copy(future)};
  assert.equal(advancePrimaryCombo(p,'verge-cleaver',start),1);assert.deepEqual(p.primaryCombo,future);
  const{g:opaque}=fixture();opaque.player.primaryCombo=copy(future);assert.equal(press(opaque,start),1);contact(opaque);assert.deepEqual(opaque.player.primaryCombo,future);
  const back=new Game(deserializeSave(serializeSave(opaque.exportSnapshot(start+500))),900000);assert.deepEqual(back.player.primaryCombo,future);
  const futureWindow={v:8,acceptedLogicalMs:0,extra:{kept:true}},known={primaryCombo:{weaponKind:'verge-cleaver',v:2,step:3,resetWindow:copy(futureWindow)}};
  assert.equal(advancePrimaryCombo(known,'verge-cleaver',start),4);assert.deepEqual(known.primaryCombo.resetWindow,futureWindow);
  const {g:legacyWindow}=fixture();legacyWindow.player.primaryCombo={...known.primaryCombo,step:3};
  assert.equal(press(legacyWindow,start),4);
  assert.deepEqual(legacyWindow.player.attackVisual.primaryMotion,{v:2,step:4});
  assert.equal(legacyWindow.pendingMeleeContact.v,3,'2026-11-14: even a legacy counter now presses a weighted swing (melee-swing.ts)');
  assert.deepEqual(legacyWindow.player.primaryCombo.resetWindow,futureWindow);
  contact(legacyWindow);
});
test('zero, backward and malformed clocks fail safely without dropping unknown metadata',()=>{
  const p={};assert.equal(advancePrimaryCombo(p,'verge-cleaver',0),1);assert.equal(p.primaryCombo.resetWindow.acceptedLogicalMs,0);
  assert.equal(advancePrimaryCombo(p,'verge-cleaver',999),2);assert.equal(advancePrimaryCombo(p,'verge-cleaver',998),1);assert.equal(p.primaryCombo.resetWindow.acceptedLogicalMs,998);
  for(const invalid of [NaN,Infinity,-1,1e12+1,undefined,'1000']){const q={primaryCombo:{weaponKind:'verge-cleaver',v:2,step:3,resetWindow:{v:1,acceptedLogicalMs:500,extra:7}}},before=copy(q.primaryCombo.resetWindow);assert.equal(advancePrimaryCombo(q,'verge-cleaver',invalid),1);assert.deepEqual(q.primaryCombo.resetWindow,before);}
  for(const invalid of [NaN,Infinity,-1,1e12+1,undefined,'0']){const q={primaryCombo:{weaponKind:'verge-cleaver',v:2,step:3,resetWindow:{v:1,acceptedLogicalMs:invalid,extra:7}}};assert.equal(advancePrimaryCombo(q,'verge-cleaver',1000),1);assert.deepEqual(q.primaryCombo.resetWindow,{v:1,acceptedLogicalMs:1000,extra:7});}
  const{g}=fixture(0);assert.equal(press(g,0),1);assert.equal(stamp(g),0);
});


test('saved step 2/4 idle carry enters restarted step 1 at identical imported and native p0 poses',()=>{
  const meta=JSON.parse(readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8'));
  const bytes=readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url)),asset=decodeCloseViewHero(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  for(const step of [2,4])for(const reducedMotion of [false,true]){
    const{g}=fixture();g.player.primaryCombo={weaponKind:'verge-cleaver',v:2,step,resetWindow:{v:1,acceptedLogicalMs:start-2000}};
    const back=new Game(deserializeSave(serializeSave(g.exportSnapshot(start))),900000);back.installSystems();
    const carry=primaryCarryStage(back.player.attackVisual,back.player.primaryCombo,false),logical=start+16,yaw=.23;
    recordHeroPresentation(back.player,{now:logical,x:back.player.x,y:back.player.y,yaw,gaitPhase:.7,speed:0});
    assert.equal(press(back,900016),1);const v=back.player.attackVisual;assert.equal(v.poseMs,logical);assert.ok(Math.abs(v.facingYaw-yaw)<1e-12);
    const base={nowMs:logical,x:0,y:0,groundZ:0,liftZ:0,yaw,height:1.3776,speed:0,gaitPhase:.7,heldProfile:'verge-cleaver',handProfile:'verge-cleaver',reducedMotion};
    const idle=createHeroFrame(asset),entered=createHeroFrame(asset);
    assert.equal(sampleCloseViewHero(asset,createHeroPoseState(asset),{...base,primaryCarryStage:carry},idle),true);
    assert.equal(sampleCloseViewHero(asset,createHeroPoseState(asset),{...base,primaryCarryStage:primaryCarryStage(v,back.player.primaryCombo,true),action:{kind:'melee',profile:'verge-cleaver',phase:0,durationMs:v.durationMs,poseMs:v.poseMs,yaw,primaryMotion:v.primaryMotion,meleeAction:v.meleeAction}},entered),true);
    assert.deepEqual(entered.positionsNormals,idle.positionsNormals,'restart cannot snap imported body geometry at acceptance');
    assert.deepEqual(entered.leftSocket,idle.leftSocket);assert.deepEqual(entered.rightSocket,idle.rightSocket);
    const a=new Float32Array(7680),b=new Float32Array(7680),common={kind:'playerVergeCleaver',x:0,y:0,z:0,yaw,phase:.7,pace:0,amount:0,reduceMotion:reducedMotion};
    const na=writeCloseViewModel(a,0,{...common,pose:'idle',primaryStage:carry}),nb=writeCloseViewModel(b,0,{...common,pose:'attack',primaryStage:{kind:'cleaver-four',step:1,direction:1},meleeAction:v.meleeAction});
    assert.equal(na,nb);assert.deepEqual(a.subarray(0,na),b.subarray(0,nb),'native fallback shares the same p0 carry');
  }
});
