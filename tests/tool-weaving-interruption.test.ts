import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';
import { closeViewPlayerAction } from '../src/close-view.ts';
import { TOOL_ACTION_TIMING } from '../src/action-motion.ts';

const tools={
  'rift-bombard':{id:'secondary-rift-bombard',name:'Rift Bombard',slot:'secondary',power:5,property:'blast'},
  'great-sweep':{id:'secondary-great-sweep',name:'Great Sweep',slot:'secondary',power:5,property:'brawler'},
  blunderbuss:{id:'secondary-blunderbuss',name:'Blunderbuss',slot:'secondary',power:11,basePower:5,upgradeRank:6,property:'quick'},
  'lumen-spindle':{id:'secondary-lumen-spindle',name:'Lumen Spindle',slot:'secondary',power:5,property:'focus'},
};
const primaries={
  pike:{id:'primary-cinder-pike',name:'Cinder Pike',slot:'primary',power:5,property:'reach'},
  cleaver:{id:'primary-verge-cleaver',name:'Verge Cleaver',slot:'primary',power:5,property:'impact'},
  salvage:{id:'salvage-blade',name:'Salvage Blade',slot:'primary',power:5,property:'steady'},
  fists:{id:'primary-iron-fists',name:'Iron Fists',slot:'primary',power:5,property:'brawler'},
};
const fixture=(tool,primary='pike')=>{const {game:g}=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000});g.enemies=[];g.projectiles=[];g.effects=[];g.save.closeView=false;g.save.equipment.secondary=structuredClone(tools[tool]);g.save.equipment.primary=structuredClone(primaries[primary]);g.save.activeWeaponSlot='primary';return g;}; // Explicit legacy immediate path; delayed Close View weaving is covered by tool-release transaction/presentation tests.
const physical=g=>structuredClone({projectiles:g.projectiles,effects:g.effects,toolReadyAt:g.toolReadyAt,stamina:g.player.stamina,hp:g.player.hp});

test('legacy immediate named tools own their complete authored presentation independently of the short combat clock',()=>{
  for(const [kind,T] of Object.entries(TOOL_ACTION_TIMING)){
    const g=fixture(kind);assert.equal(g.fireSecondary(100000,{x:1,y:0}),true,kind);const record=g.player.attackVisual;
    assert.ok(closeViewPlayerAction(g,100000+T.durationMs-1).active,kind+' remains visible through recovery');
    assert.strictEqual(g.player.attackVisual,record);assert.equal(closeViewPlayerAction(g,100000+T.durationMs).active,false,kind+' completes at its authored deadline');
    assert.equal(g.player.actionVisualUntil,100000+T.durationMs);assert.ok(g.player.attackUntil<=100240,kind+' canonical combat clock remains short');
  }
});

test('legacy immediate primary acceptance replaces every named tool during earliest legal, hold and recovery phases',()=>{
  for(const kind of Object.keys(tools))for(const primary of Object.keys(primaries))for(const phase of ['earliest','hold','recovery']){
    const g=fixture(kind,primary),start=100000;assert.equal(g.fireSecondary(start,{x:1,y:0}),true);const toolRecord=g.player.attackVisual,T=TOOL_ACTION_TIMING[kind];
    const at=phase==='earliest'?Math.max(start+1,g.player.attackReadyAt||0):phase==='hold'?Math.max(g.player.attackReadyAt||0,start+Math.max(T.raiseMs+1,Math.min(T.holdMs-1,Math.floor(T.durationMs*.55)))):Math.max(g.player.attackReadyAt||0,start+T.holdMs+Math.max(1,Math.floor((T.durationMs-T.holdMs)/2)));
    assert.ok(at<start+T.durationMs);assert.deepEqual(closeViewPlayerAction(g,at).record,toolRecord);const before=physical(g);
    g.primaryAttack(at,{x:1,y:0});
    const label=`${kind}/${primary}/${phase}`;const selected=closeViewPlayerAction(g,at);assert.ok(selected.active,label);assert.notDeepEqual(selected.record,toolRecord,label);assert.equal(selected.record.toolKind,undefined,label);assert.equal(selected.record.profile,primary==='fists'?'fist':'melee',label);
    assert.deepEqual(g.projectiles,before.projectiles,`${kind}/${primary}/${phase}: live tool shots are not replayed or removed`);assert.deepEqual(g.effects.slice(0,before.effects.length),before.effects);assert.equal(g.toolReadyAt,before.toolReadyAt);assert.equal(g.player.stamina,before.stamina);assert.ok(g.player.hp<=before.hp,'only canonical primary self-cost may apply');
  }
});

test('legacy immediate refused and buffered primaries do not fake cancellation; acceptance does',()=>{
  for(const kind of Object.keys(tools)){
    const g=fixture(kind,'pike'),start=100000;assert.equal(g.fireSecondary(start,{x:1,y:0}),true);g.save.closeView=true;const record=g.player.attackVisual,deadline=g.player.actionVisualUntil,ready=Math.max(start+180,g.player.attackReadyAt||0);g.player.attackReadyAt=ready;
    g.primaryAttack(start+1,{x:1,y:0});assert.strictEqual(g.player.attackVisual,record,kind+' cooldown refusal keeps tool body');assert.equal(g.player.actionVisualUntil,deadline);
    g.attackBufferUntil=ready+500;assert.equal(g.tickAttackBuffer(ready-1),false);assert.strictEqual(g.player.attackVisual,record,kind+' pending buffer keeps tool body');
    assert.equal(g.tickAttackBuffer(ready),true);assert.notStrictEqual(g.player.attackVisual,record,kind+' begun buffered primary replaces tool body');assert.equal(g.player.attackVisual.profile,'melee');
  }
});

test('legacy immediate repeats keep the latest tool pose until primary acceptance and Echo never cancels it',()=>{
  for(const kind of Object.keys(tools)){
    const g=fixture(kind,'pike'),start=100000;g.save.equipment.primary=normalizeSockets({...primaries.pike,tier:'relic',affixes:[]});g.save.glyphs.echo=1;assert.equal(socketGlyph(g.save,'melee',0,'echo').ok,true);
    assert.equal(g.fireSecondary(start,{x:1,y:0}),true);g.player.attackReadyAt=0;g.toolReadyAt=0;assert.equal(g.fireSecondary(start+20,{x:1,y:0}),true);const latest=g.player.attackVisual,deadline=g.player.actionVisualUntil;
    (g.glyphTimers ||= []).push({at:start+40,kind:'strike',share:.5,echoVisual:null});g.tickGlyphs(0,start+40);assert.strictEqual(g.player.attackVisual,latest,kind+' delayed Echo cannot replace latest tool');assert.equal(g.player.actionVisualUntil,deadline);
    const at=Math.max(start+41,g.player.attackReadyAt||0);g.primaryAttack(at,{x:1,y:0});assert.notStrictEqual(g.player.attackVisual,latest);assert.equal(g.player.attackVisual.profile,'melee');
  }
});
