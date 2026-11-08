import test from 'node:test';
import assert from 'node:assert/strict';
import { CAST_GESTURES } from '../src/game.ts';
import { APERTURE_SKILLS, SPELLS, skillRank } from '../src/items.ts';
import { branchCaps, hasNode } from '../src/constellation.ts';
import { slotted } from '../src/spell-slots.ts';
import { createLabFixture, scenariosForLab } from '../src/proving-ground-labs.ts';

const seed='CAST-INSPECTION', spellIds=Object.keys(SPELLS), skillIds=Object.keys(APERTURE_SKILLS);
const pressA=(game,now)=>game.update(0,{state:{x:0,y:0},consume:(action)=>action==='spell',held:()=>false},now);

test('Combat Asset registry retains its original fourteen entries and appends all eighteen public cast inspections',()=>{
  const all=scenariosForLab('combat-assets'),original=['blade-spark-ashling','pike-spindle-hound','cleaver-bombard-crawler','blade-bombard-pallid-crawler','blade-hammerfall-brute','cleaver-sweep-marshal','cleaver-mirage-stalker','blade-orrery-sentinel','pike-blunder-caster','blade-arc-wave-wisp','fists-spindle-flying','pike-echo-inspection','cleaver-echo-inspection','salvage-echo-inspection'];
  assert.equal(all.length,32);assert.deepEqual(all.slice(0,14).map(q=>q.id),original);
  assert.deepEqual(all.slice(14).map(q=>q.id),[...spellIds.map(id=>`cast-spell-${id}`),...skillIds.map(id=>`cast-skill-${id}`)]);
  assert.deepEqual(all.slice(14).map(q=>q.label),[...Object.values(SPELLS).map(q=>`Cast inspection · ${q.name}`),...Object.values(APERTURE_SKILLS).map(q=>`Cast inspection · ${q.name}`)]);
});

test('all eighteen quiet fixtures bind the real eligible castable to public Spell A without auto-casting',()=>{
  for(const [kind,ids] of [['spell',spellIds],['skill',skillIds]])for(const id of ids){
    const {game,save}=createLabFixture({lab:'combat-assets',scenario:`cast-${kind}-${id}`,seed,now:1000}),slot=slotted(save,'a'),foe=game.enemies[0];
    assert.deepEqual({kind:slot.kind,id:slot.id},{kind,id},id);assert.equal(game.player.castVisual,null,`${id}: construction does not cast`);
    assert.equal(foe.passiveBehavior,'practice');assert.equal(foe.hp,5000);assert.equal(foe.maxHp,5000);assert.equal(save.equipment.primary.name,'Salvage Blade');assert.equal(save.equipment.secondary.name,'Spark Coil');assert.ok(!save.equipment.primary.glyphs.includes('echo'),`${id}: no inspection Echo`);
    if(kind==='skill')assert.equal(skillRank(save,id),1,`${id}: canonically learned`);
  }
});

test('the Proving Ground public Spell A update dispatch accepts every canonical identity and both follow-ups',()=>{
  for(const [kind,ids] of [['spell',spellIds],['skill',skillIds]])for(const id of ids){
    const {game}=createLabFixture({lab:'combat-assets',scenario:`cast-${kind}-${id}`,seed,now:1000});game.lastUpdateNow=2000;pressA(game,2000);
    assert.equal(game.player.castVisual?.spellKind,id,id);assert.equal(game.player.castVisual?.profile,CAST_GESTURES[id],id);assert.equal(game.player.castVisual?.variant,kind==='skill'?'activate':id==='shadow-clone'?'create':id==='orbit-volley'?'gather':'cast',id);
    if(id==='shadow-clone'){game.lastUpdateNow=2100;pressA(game,2100);assert.equal(game.player.castVisual.variant,'swap');assert.equal(game.player.castVisual.profile,'dusk-swap');}
    if(id==='orbit-volley'){game.lastUpdateNow=4100;pressA(game,4100);assert.equal(game.player.castVisual.variant,'launch');assert.equal(game.player.castVisual.profile,'orbit-launch');}
  }
});

test('Aerial Step fixture earns its real Motion crown and inspections reset as independent scratch state',()=>{
  const first=createLabFixture({lab:'combat-assets',scenario:'cast-skill-aerial-step',seed,now:1000}),reset=createLabFixture({lab:'combat-assets',scenario:'cast-skill-aerial-step',seed,now:9000});
  assert.equal(skillRank(first.save,'quickening'),3);assert.equal(hasNode(first.save,'light-feet'),true);assert.deepEqual(branchCaps(first.save,'motion'),['aerial-step']);assert.equal(first.save.constellation.alt?.['aerial-step'],undefined);
  first.game.lastUpdateNow=2000;pressA(first.game,2000);assert.equal(first.game.player.castVisual.spellKind,'aerial-step');first.game.setPaused(true,2010);const visual=structuredClone(first.game.player.castVisual);first.game.update(5,{state:{x:0,y:0},consume:()=>false,held:()=>false},7010);assert.deepEqual(first.game.player.castVisual,visual);
  assert.equal(reset.game.player.castVisual,null);assert.equal(reset.game.enemies[0].hp,5000);assert.notEqual(first.save,reset.save);assert.notEqual(first.game,reset.game);
});
