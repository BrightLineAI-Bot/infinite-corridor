import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, BRAWLER_GEAR } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { closeViewPlayerAction } from '../src/close-view.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';
import { createCombatant } from '../src/combat.ts';
const clone=x=>JSON.parse(JSON.stringify(x));
const pike=()=>normalizeSockets({id:'primary-cinder-pike',name:'Cinder Pike',slot:'primary',power:5,property:'reach',tier:'relic',affixes:[]});
const fists=()=>({...BRAWLER_GEAR[0].item});
const fixture=()=>{const {game:g}=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000});g.enemies=[];g.save.equipment.primary=pike();g.save.glyphs.echo=1;assert.equal(socketGlyph(g.save,'melee',0,'echo').ok,true);return g;};

test('queued primary Echo cannot rewind or replace an accepted fist presentation clock',()=>{
  for(const switchBack of [false,true]){const g=fixture(),foe=Object.assign(createCombatant('rootBrute',g.player.x+1,g.player.y),{id:'echo-target',hp:10000,maxHp:10000,damage:0,cooldown:99});g.enemies=[foe];g.save.lastAim={x:1,y:0};g.primaryAttack(100000);const queued=g.glyphTimers.find(q=>q.kind==='strike');assert.ok(queued);g.save.equipment.primary=fists();assert.equal(g.fistPunch(1,0,queued.at-80,{x:1,y:0}),true);g.player.attackVisual.future={preserved:true};g.save.futureFist={preserved:9};const record=clone(g.player.attackVisual),until=g.player.fistVisualUntil,combatUntil=g.player.attackUntil,hp=foe.hp,before=closeViewPlayerAction(g,queued.at);if(switchBack)g.save.equipment.primary=pike();g.tickGlyphs(0,queued.at);assert.equal(g.glyphTimers.length,0);assert.deepEqual(g.player.attackVisual,record);assert.equal(g.player.fistVisualUntil,until);assert.equal(closeViewPlayerAction(g,queued.at).amount,before.amount);assert.equal(g.player.attackUntil,switchBack?queued.at+240:combatUntil);if(switchBack)assert.ok(foe.hp<hp,'queued Echo still hits after switching back');else assert.equal(foe.hp,hp,'staying on Fists keeps the existing guard that drops the old primary Echo');assert.equal(closeViewPlayerAction(g,until+1).active,false);g.setPaused(true,queued.at+10);const saved=migrateSave(clone(g.exportSnapshot(110000))),back=new Game(saved,200000);assert.equal(saved.session.playerRuntime.fistVisualMotion,150);assert.equal(back.player.fistVisualUntil-back.pauseStarted,150);assert.deepEqual(back.player.attackVisual,record);assert.equal(back.save.fistOpeningHand,'right');assert.deepEqual(back.save.futureFist,{preserved:9});assert.equal(closeViewPlayerAction(back,200000).amount,.375);back.setPaused(false,205000);assert.equal(closeViewPlayerAction(back,205000).amount,.375);assert.equal(back.player.fistVisualUntil,205150);back.cancelFistPresentation(205151);assert.equal(back.player.attackVisual.presentationCancelled,undefined);}
  const legacy=freshSave();legacy.session.playerRuntime.attackMotion=120;legacy.session.playerRuntime.attackVisual={profile:'fist',durationMs:240,fistStep:2,fistLead:'left'};assert.equal(closeViewPlayerAction(new Game(migrateSave(legacy),300000),300000).amount,.5);
  const malformed=freshSave();malformed.session.playerRuntime.fistVisualMotion=Infinity;assert.equal(migrateSave(malformed).session.playerRuntime.fistVisualMotion,0);
});
