import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { BRAWLER_GEAR, Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { CLOSE_VIEW_MELEE_TIMING, normalizeMeleeActionVisual, normalizePendingMeleeContact, sampleMeleeActionContact } from '../src/action-motion.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';

const cleaver=()=>({id:'primary-verge-cleaver',name:'Verge Cleaver',slot:'primary',power:5,property:'impact'});
const input=(attack=false)=>{let used=false;return{state:{x:0,y:0},consume:(key:string)=>attack&&key==='attack'&&!used&&(used=true),held:()=>false,reset:()=>{}}};
const actionInput=(wanted:string)=>{let used=false;return{state:{x:0,y:0},consume:(key:string)=>key===wanted&&!used&&(used=true),held:()=>false,reset:()=>{}}};
function fixture(item:any){const g:any=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000}).game;g.save.closeView=true;g.save.activeWeaponSlot='primary';g.save.equipment.primary={...item};g.save.lastAim={x:1,y:0};for(const t of g.map.tiles){t.blocked=false;t.openAir=false;t.courtyard=false;t.pentRoof=false;t.pentBalcony=false;if(t.kind==='yardGrass')t.kind='flagFloor';}const foe:any=Object.assign(createCombatant('rootBrute',g.player.x+1,g.player.y),{id:'contact-foe',hp:10000,maxHp:10000,damage:0,cooldown:99});g.enemies=[foe];assert.equal(g.closeViewActionEligible(),true);return{g,foe};}

test('public melee descriptor exposes bounded startup, contact and recovery phases',()=>{
  const action={v:1,kind:'verge-cleaver',move:'cleaver',...CLOSE_VIEW_MELEE_TIMING.cleaver};assert.deepEqual(normalizeMeleeActionVisual(action),action);
  assert.equal(sampleMeleeActionContact({meleeAction:action},74).phase,'startup');assert.equal(sampleMeleeActionContact({meleeAction:action},75).phase,'contact');assert.equal(sampleMeleeActionContact({meleeAction:action},76).phase,'recovery');
  assert.deepEqual(normalizeMeleeActionVisual({v:9,future:{kept:true}}),{v:9,future:{kept:true}});
  assert.equal(normalizeMeleeActionVisual({...action,contactMs:NaN}),null);
});

test('normal Close View Cleaver input accepts immediately and contacts once at the current target state',()=>{
  const{g,foe}=fixture(cleaver()),hp=foe.hp;g.update(.016,input(true),100000);const q=structuredClone(g.pendingMeleeContact),ready=g.player.attackReadyAt;assert.ok(q);assert.equal(foe.hp,hp);assert.equal(g.player.attackVisual.meleeAction.move,'cleaver');
  foe.x=g.player.x+8;g.update(.05,input(),q.releaseAt);assert.equal(foe.hp,hp,'a target that left reach before contact is not hit');assert.equal(g.pendingMeleeContact,null);assert.equal(g.player.attackReadyAt,ready);
  g.update(.05,input(),q.releaseAt+200);assert.equal(foe.hp,hp,'release is exactly once');
});

test('Cleaver reload rebases cooldown and contact, then samples current position with accepted Echo stage',()=>{
  const{g,foe}=fixture(normalizeSockets({...cleaver(),tier:'relic',affixes:[]}));g.save.glyphs.echo=1;assert.equal(socketGlyph(g.save,'melee',0,'echo').ok,true);
  g.update(.016,input(true),100000);const accepted=structuredClone(g.pendingMeleeContact);assert.deepEqual(accepted.payload.primaryMotion,{v:2,step:1});
  const save=deserializeSave(serializeSave(g.exportSnapshot(100020))),resumed:any=new Game(save,1000);resumed.installSystems();assert.equal(resumed.player.attackReadyAt,1400);assert.equal(resumed.pendingMeleeContact.releaseAt,1055);
  resumed.player.x-=2;foe.x=resumed.player.x+1;resumed.enemies=[foe];resumed.player.meleeStrike=null;assert.equal(resumed.releasePendingMeleeContact(1055.001).released,true);assert.equal(resumed.pendingMeleeContact,null);assert.equal(resumed.player.attackReadyAt,1400);assert.equal(resumed.player.meleeStrike.x,resumed.player.x+.5);
  const timer=resumed.glyphTimers.find((q:any)=>q.kind==='strike');assert.ok(timer);assert.ok(Math.abs(timer.at-1305.001)<1e-6);assert.equal(timer.echoVisual.x,resumed.player.x+.5);assert.deepEqual(timer.echoVisual.primaryMotion,{v:2,step:1});
});

test('malformed supported pending records are inert while future versions remain opaque',()=>{
  const base:any={v:1,id:'melee-1',action:{v:1,kind:'verge-cleaver',move:'cleaver',...CLOSE_VIEW_MELEE_TIMING.cleaver},area:'dungeon',areaId:'x',levelId:'root',contactMs:75,elapsedMs:20,remainingMs:55,aim:{x:1,y:0},payload:{kind:'cleaver',profile:{range:2,arc:90,damage:5,shape:'arc'},meleeBonus:1,attackDamage:0,imbue:0,spellblade:false,boxing:null,awakened:false,primaryMotion:{v:2,step:1},support:1}};
  base.futureTop={kept:true};base.payload.futurePayload={kept:true};const normalized:any=normalizePendingMeleeContact(base);assert.deepEqual(normalized.futureTop,{kept:true});assert.deepEqual(normalized.payload.futurePayload,{kept:true});
  for(const bad of [{...base,action:{...base.action,contactMs:NaN}},{...base,payload:{...base.payload,profile:{...base.payload.profile,damage:Infinity}}},{...base,payload:{kind:'cleaver',futureGraph:{then:'execute'}}}])assert.equal(normalizePendingMeleeContact(bad),null);
  assert.deepEqual(normalizePendingMeleeContact({v:3,future:{kept:true}}),{v:3,future:{kept:true}});
});

test('Fists rush and guard at acceptance, then emit one captured punch after exact-resume reload',()=>{
  const{g,foe}=fixture(BRAWLER_GEAR[0].item);foe.x=g.player.x+3;const start=g.player.x;g.update(.016,input(true),100000);g.update(.016,input(),100001);const q=structuredClone(g.pendingMeleeContact);assert.ok(q);assert.equal(q.action.move,'dash');assert.ok(g.player.x>start);assert.ok(g.player.invulnerableUntil>=100001);assert.equal(g.effects.some((e:any)=>e.id===q.payload.effect.id),false);
  const save=deserializeSave(serializeSave(g.exportSnapshot(100020))),resumed:any=new Game(save,200000);resumed.installSystems();assert.ok(resumed.pendingMeleeContact);const due=resumed.pendingMeleeContact.releaseAt;resumed.update(.05,input(),due);assert.equal(resumed.effects.filter((e:any)=>e.id===q.payload.effect.id).length,1);resumed.update(.05,input(),due+100);assert.equal(resumed.effects.filter((e:any)=>e.id===q.payload.effect.id).length,1);
});

test('refused competing inputs retain contact while accepted tool, spell and dodge own cancellation',()=>{
  for(const action of ['tool','spell','dodge']){
    const{g}=fixture(cleaver());g.update(.016,input(true),100000);const pending=g.pendingMeleeContact;assert.ok(pending);
    if(action==='tool')g.save.equipment.secondary=null;
    if(action==='spell')((g.save.magicSkills||={}).cooldowns||={})[`spell:${g.save.equippedSpell}`]=99;
    if(action==='dodge')g.player.stamina=0;
    g.update(.01,actionInput(action),100010);assert.equal(g.pendingMeleeContact,pending,`${action} refusal keeps the accepted melee owner`);
  }
  for(const action of ['tool','spell','dodge']){
    const{g}=fixture(cleaver());g.update(.016,input(true),100000);assert.ok(g.pendingMeleeContact);
    if(action==='tool')g.save.equipment.secondary={...BRAWLER_GEAR[2].item};
    if(action==='dodge')g.player.stamina=g.player.maxStamina;
    g.update(.01,actionInput(action),100010);assert.equal(g.pendingMeleeContact,null,`${action} acceptance takes ownership`);
  }
});

test('buffered Fist beat receives its own delayed descriptor and canceled contact cannot qualify a finisher',()=>{
  const{g}=fixture(BRAWLER_GEAR[0].item);g.update(.016,input(true),100000);g.update(.016,input(),100001);assert.equal(g.pendingMeleeContact.action.move,'dash');
  g.update(.01,input(true),100010);g.update(.05,input(),100061);assert.equal(g.effects.filter((e:any)=>e.kind==='iron-fist').length,1);assert.equal(g.pendingMeleeContact.action.move,'jab');assert.equal(g.player.attackVisual.meleeAction.move,'jab');
  g.update(.05,input(),100096);assert.equal(g.effects.filter((e:any)=>e.kind==='iron-fist').length,2);

  const canceled=fixture(BRAWLER_GEAR[0].item);canceled.g.update(.016,input(true),200000);canceled.g.update(.016,input(),200001);assert.equal(canceled.g.fistCombo.landed[0],false);canceled.g.cancelPendingMeleeContact('test');assert.equal(canceled.g.fistCombo.landed[0],false);
  canceled.g.fistPunch(2,0,200100,{x:1,y:0});canceled.g.fistPunch(3,0,200200,{x:1,y:0});const upper=canceled.g.effects.find((e:any)=>e.kind==='fist-uppercut');assert.ok(upper);assert.equal(upper.finisher,false);
});

test('accepted jump cancels either pending weapon contact while a refused jump retains it', () => {
  for (const [weapon, releaseCharge] of [[cleaver(), false], [BRAWLER_GEAR[0].item, true]] as const) {
    const { g, foe } = fixture(weapon);
    const hp = foe.hp;
    g.update(.016, input(true), 100000);
    if (releaseCharge) g.update(.016, input(), 100001);
    const due = g.pendingMeleeContact.releaseAt;
    g.update(.01, actionInput('jump'), 100010);
    assert.ok(g.jumpUntil > due);
    assert.equal(g.pendingMeleeContact, null);
    g.update(.1, input(), due + 1);
    assert.equal(foe.hp, hp, 'a hidden strike must not resolve during the jump');
  }
  const { g } = fixture(cleaver());
  g.update(.016, input(true), 100000);
  const pending = g.pendingMeleeContact;
  const cursed = g.cursed.bind(g);
  g.cursed = (action: string, now: number) => action === 'jump' || cursed(action, now);
  g.update(.01, actionInput('jump'), 100010);
  assert.equal(g.pendingMeleeContact, pending);
});

test('actual knockdown cancels either pending contact while ordinary damage preserves it', () => {
  for (const [weapon, releaseCharge] of [[cleaver(), false], [BRAWLER_GEAR[0].item, true]] as const) {
    const { g, foe } = fixture(weapon);
    const hp = foe.hp;
    g.update(.016, input(true), 100000);
    if (releaseCharge) g.update(.016, input(), 100001);
    const due = g.pendingMeleeContact.releaseAt;
    const ready = g.player.attackReadyAt;
    const effectId = g.pendingMeleeContact.payload.effect?.id;
    g.packWorld(.01, 100010).stun(2);
    assert.ok(g.player.stunnedUntil > due);
    assert.equal(g.pendingMeleeContact, null);
    assert.equal(g.player.attackVisual.presentationCancelled, true);
    g.update(.1, input(), due + 1);
    assert.equal(g.player.attackReadyAt, ready);
    assert.equal(foe.hp, hp);
    if (effectId) assert.ok(!g.effects.some((effect: any) => effect.id === effectId));
  }
  const { g, foe } = fixture(cleaver());
  g.update(.016, input(true), 100000);
  const pending = g.pendingMeleeContact;
  const hp = g.player.hp;
  g.packWorld(.01, 100010).hurt(foe, 1);
  assert.ok(g.player.hp < hp);
  assert.equal(g.pendingMeleeContact, pending);
});

test('coarse updates release once at contact pose and preserve newborn Fist lifetime',()=>{
  const cleave=fixture(cleaver());const hp=cleave.foe.hp;cleave.g.update(.016,input(true),300000);cleave.g.update(.3,input(),300300);assert.ok(cleave.foe.hp<hp);const after=cleave.foe.hp;assert.equal(cleave.g.player.actionVisualUntil,300585);cleave.g.update(.3,input(),300600);assert.equal(cleave.foe.hp,after);
  const fists=fixture(BRAWLER_GEAR[0].item);fists.g.update(.016,input(true),400000);fists.g.update(.016,input(),400001);fists.g.update(.3,input(),400301);const fx=fists.g.effects.find((e:any)=>e.kind==='iron-fist');assert.ok(fx);assert.equal(fx.life,.25);assert.equal(fists.g.player.actionVisualUntil,400561);
});
