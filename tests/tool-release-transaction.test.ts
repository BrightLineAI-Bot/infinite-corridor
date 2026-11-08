import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAWLER_GEAR, Game, updateEffects, updateProjectiles } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { normalizePendingToolUse, sampleToolActionMotion, toolUseStartupMs } from '../src/action-motion.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';

const items:any={
  'rift-bombard':{id:'secondary-rift-bombard',name:'Rift Bombard',slot:'secondary',power:5,property:'blast'},
  blunderbuss:{id:'secondary-blunderbuss',name:'Blunderbuss',slot:'secondary',power:11,basePower:5,upgradeRank:6,property:'quick'},
  'lumen-spindle':{id:'secondary-lumen-spindle',name:'Lumen Spindle',slot:'secondary',power:5,property:'focus'},
  'great-sweep':{id:'secondary-great-sweep',name:'Great Sweep',slot:'secondary',power:5,property:'brawler'},
};
function fixture(kind:string,now=100000){const g:any=createLabFixture({lab:'combat-assets',scenario:kind==='great-sweep'?'cleaver-sweep-marshal':'blade-spark-ashling',now}).game;g.enemies=[];g.projectiles=[];g.effects=[];g.save.closeView=true;g.save.activeWeaponSlot='primary';g.save.equipment.secondary=structuredClone(items[kind]);for(const t of g.map.tiles){t.blocked=false;t.openAir=false;t.courtyard=false;t.pentRoof=false;t.pentBalcony=false;if(t.kind==='yardGrass')t.kind='flagFloor';}assert.equal(g.closeViewActionEligible(),true);return g;}
const input=(...actions:string[])=>{const q=new Set(actions);return{state:{x:0,y:0},consume:(k:string)=>q.delete(k),held:()=>false,reset:()=>q.clear()};};

test('frozen startup scaling floors zero cooldown and rejects unknown/nonfinite inputs',()=>{
  assert.equal(toolUseStartupMs('rift-bombard',360),120);assert.equal(toolUseStartupMs('rift-bombard',180),60);assert.equal(toolUseStartupMs('great-sweep',0),1);assert.equal(toolUseStartupMs('unknown',360),null);assert.equal(toolUseStartupMs('rift-bombard',Infinity),null);
});

for(const kind of ['rift-bombard','blunderbuss','lumen-spindle'])test(`${kind} accepts once, emits once at current position with accepted aim, and newborns do not consume old frame time`,()=>{
  const g=fixture(kind),at=100000;assert.equal(g.fireSecondary(at,{x:1,y:0}),true);const q=structuredClone(g.pendingToolUse);assert.ok(q);assert.equal(g.projectiles.length,0);assert.equal(g.player.attackVisual.toolUse.phase,'startup');assert.equal(g.fireSecondary(at+1,{x:0,y:1}),false);assert.equal(g.pendingToolUse.id,q.id);
  g.player.x+=2;assert.deepEqual(g.releasePendingToolUse(q.releaseAt-1),{released:false,cancelled:false});assert.equal(g.projectiles.length,0);assert.deepEqual(g.releasePendingToolUse(q.releaseAt),{released:true,cancelled:false});const base=g.projectiles[0];assert.equal(base.id,`${q.id}-base`);assert.ok(Math.abs(base.x-(g.player.x+.85))<1e-9);assert.ok(Math.abs(base.dx-1)<1e-9);assert.equal(base.age,0);assert.equal(base.toolUseNewborn,true);assert.deepEqual(g.releasePendingToolUse(q.releaseAt+500),{released:false,cancelled:false});
  const life=base.life;updateProjectiles(g.projectiles,[],g.map,g.map.width,.6);assert.equal(base.age,0);assert.equal(base.life,life);assert.equal(base.toolUseNewborn,undefined);updateProjectiles(g.projectiles,[],g.map,g.map.width,.01);assert.ok(base.age>0);assert.ok(base.life<life);
});

test('Great Sweep creates no damaging effect before release, fixes release center, and pulses once with full newborn life',()=>{
  const g=fixture('great-sweep'),at=100000;assert.equal(g.fireSecondary(at,{x:1,y:0}),true);const q=structuredClone(g.pendingToolUse);assert.equal(g.effects.length,0);g.player.x+=1;g.player.y+=.5;g.releasePendingToolUse(q.releaseAt);const fx=g.effects[0],life=fx.life;assert.deepEqual([fx.x,fx.y],[g.player.x+.5,g.player.y+.45]);const foe={id:'f',x:fx.x-.5,y:fx.y-.45,hp:100,maxHp:100};updateEffects(g.effects,[foe],.6);assert.equal(fx.life,life);assert.equal(fx.pulseIndex,1);const hp=foe.hp;updateEffects(g.effects,[foe],0);assert.equal(foe.hp,hp);assert.equal(fx.pulseIndex,1);
});

test('accepted payload freezes pellets, Arc Wave, awakened fan, Tool Echo and clone permission; released Spindle keeps return and Bombard keeps cluster callbacks',()=>{
  const arc=fixture('blunderbuss');arc.save.lattice.passives=['field:arc-wave'];arc.save.equipment.secondary=normalizeSockets({...arc.save.equipment.secondary,tier:'relic',affixes:[],awakened:true});arc.save.glyphs.echo=1;assert.equal(socketGlyph(arc.save,'tool',0,'echo').ok,true);arc.shadowClone={ox:-1,oy:0,until:200000};arc.fireSecondary(100000,{x:1,y:0});const payload=structuredClone(arc.pendingToolUse.payload);assert.equal(payload.members.filter((p:any)=>p.arcWave).length,5);assert.equal(payload.members.filter((p:any)=>String(p.damage)==String(payload.shot.damage*.5)||p.damage===Math.max(1,Math.round(payload.shot.damage*.5))).length,2);assert.ok(payload.echoCopies.length>=1);assert.equal(payload.cloneEligible,true);arc.save.equipment.secondary={...items['rift-bombard']};arc.save.lattice.passives=[];arc.releasePendingToolUse(arc.pendingToolUse.releaseAt);assert.equal(arc.projectiles.filter((p:any)=>p.arcWave&&!p.shadow).length,5);assert.equal(arc.projectiles.filter((p:any)=>p.shadow).length,1);
  const spindle=fixture('lumen-spindle');spindle.save.lattice.passives=['field:lumen-sunburst'];spindle.fireSecondary(100000,{x:1,y:0});assert.equal(spindle.pendingToolUse.payload.shot.path,'boomerang');assert.ok(spindle.pendingToolUse.payload.shot.ricochet>0);spindle.releasePendingToolUse(spindle.pendingToolUse.releaseAt);assert.equal(spindle.projectiles[0].path,'boomerang');const parent=spindle.projectiles[0];spindle.sunburst(parent,1,0);const shards=spindle.projectiles.filter((p:any)=>p.shard),shardLife=shards[0].life;updateProjectiles(shards,[],spindle.map,spindle.map.width,.6);assert.ok(shards.length>0);assert.ok(shards.every((p:any)=>p.age===0&&p.life===shardLife));
  const bomb=fixture('rift-bombard');bomb.save.lattice.passives=['field:cluster-shell'];bomb.fireSecondary(100000,{x:1,y:0});bomb.releasePendingToolUse(bomb.pendingToolUse.releaseAt);const shell=bomb.projectiles[0];bomb.clusterShell(shell);const bomblets=bomb.projectiles.filter((p:any)=>String(p.id).includes('-cluster')),bombletLife=bomblets[0].life;assert.equal(bomblets.length,2);updateProjectiles(bomblets,[],bomb.map,bomb.map.width,.6);assert.ok(bomblets.every((p:any)=>p.age===0&&p.life===bombletLife));
});

test('one primary tap waits only inside the finite startup window and executes on the release update',()=>{
  const g=fixture('great-sweep'),at=100000;g.fireSecondary(at,{x:1,y:0});const release=g.pendingToolUse.releaseAt;g.update(.01,input('attack'),release-60);assert.ok(g.attackBufferUntil>=release);assert.equal(g.effects.length,0);g.update(.01,input(),release);assert.equal(g.pendingToolUse,null);assert.equal(g.attackBufferUntil,0);assert.equal(g.player.attackVisual.profile,'melee');
});

test('startup Fist intent waits for native recovery and clears if the active slot changes',()=>{
  const g=fixture('great-sweep'),at=100000;g.save.equipment.primary={...BRAWLER_GEAR[0].item};g.fireSecondary(at,{x:1,y:0});const release=g.pendingToolUse.releaseAt,recover=release+30;g.player.attackReadyAt=0;g.fistRecoverUntil=recover;g.update(.01,input('attack'),release-60);assert.ok(g.attackBufferUntil>=recover);g.update(.01,input(),release);assert.ok(g.attackBufferUntil>0);assert.notEqual(g.player.attackVisual.profile,'fist');g.update(.01,input(),recover);assert.equal(g.attackBufferUntil,0);assert.equal(g.player.attackVisual.profile,'fist');
  const held=fixture('great-sweep');held.save.equipment.primary={...BRAWLER_GEAR[0].item};held.fireSecondary(at,{x:1,y:0});const heldRelease=held.pendingToolUse.releaseAt,heldInput:any={state:{x:0,y:0},consume:(k:string)=>k==='attack',held:(k:string)=>k==='attack',reset:()=>{}};held.update(.01,heldInput,heldRelease-60);held.update(.01,{...heldInput,consume:()=>false},heldRelease);assert.equal(held.fistCharge?.start,heldRelease);assert.equal(held.player.attackVisual.profile,'sweep');
  const swapped=fixture('great-sweep');swapped.save.equipment.primary={...BRAWLER_GEAR[0].item};swapped.fireSecondary(at,{x:1,y:0});swapped.player.attackReadyAt=0;swapped.update(.01,input('attack'),swapped.pendingToolUse.releaseAt-60);swapped.save.activeWeaponSlot='secondary';swapped.update(.01,input(),swapped.pendingToolUse.releaseAt);assert.equal(swapped.attackBufferUntil,0);assert.notEqual(swapped.player.attackVisual.profile,'fist');
});

test('actual normal and Swift repeats flatten the prior released pose before a new startup',()=>{
  for(const swift of [false,true]){const g=fixture('rift-bombard');if(swift){g.save.equipment.secondary=normalizeSockets({...g.save.equipment.secondary,tier:'relic',affixes:[]});g.save.glyphs.swift=3;for(let i=0;i<3;i++)assert.equal(socketGlyph(g.save,'tool',i,'swift').ok,true);}g.fireSecondary(100000,{x:1,y:0});const releaseAt=g.pendingToolUse.releaseAt,startup=g.pendingToolUse.startupMs;g.releasePendingToolUse(releaseAt);const prior=sampleToolActionMotion(g.player.attackVisual,startup+20);g.player.attackReadyAt=0;assert.equal(g.fireSecondary(releaseAt+20,{x:1,y:0}),true);assert.deepEqual(g.player.attackVisual.toolMotion.entry,[prior.yaw,prior.side,prior.up,prior.forward,prior.weight]);assert.deepEqual(sampleToolActionMotion(g.player.attackVisual,0),prior);}
});

test('schema-14 pending record saves relative time, resumes once, preserves unknowns, and unknown versions stay inert',()=>{
  const g=fixture('rift-bombard'),at=100000;g.fireSecondary(at,{x:1,y:0});g.pendingToolUse.future={kept:true};const saved=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(at+40))));assert.equal(saved.version,14);assert.equal(saved.session.playerRuntime.pendingToolUse.remainingMs,g.pendingToolUse.startupMs-40);assert.deepEqual(saved.session.playerRuntime.pendingToolUse.future,{kept:true});const back:any=new Game(saved,200000);assert.ok(back.pendingToolUse);assert.equal(back.pendingToolUse.releaseAt,200000+g.pendingToolUse.startupMs-40);back.releasePendingToolUse(back.pendingToolUse.releaseAt);assert.equal(back.projectiles.length,1);const terminal=migrateSave(JSON.parse(JSON.stringify(back.exportSnapshot(200500))));assert.equal(terminal.session.playerRuntime.pendingToolUse,null);const twice:any=new Game(terminal,300000);assert.equal(twice.pendingToolUse,null);assert.equal(twice.projectiles.length,1);
  const opaque={v:2,future:true,nested:{kept:1}};assert.deepEqual(normalizePendingToolUse(opaque),opaque);saved.session.playerRuntime.pendingToolUse=opaque;const inert:any=new Game(migrateSave(saved),300000);assert.equal(inert.pendingToolUse,null);assert.deepEqual(inert.save.session.playerRuntime.pendingToolUse,opaque);assert.deepEqual(inert.exportSnapshot(300001).session.playerRuntime.pendingToolUse,opaque);
});

test('pause retains a due use, malformed oversized payload is inert, death cancels, and exhausted Sweep refusal is transactional',()=>{
  const paused=fixture('rift-bombard');paused.fireSecondary(100000,{x:1,y:0});const due=paused.pendingToolUse.releaseAt;paused.setPaused(true,100050);assert.deepEqual(paused.releasePendingToolUse(due+1000),{released:false,cancelled:false});assert.ok(paused.pendingToolUse);assert.equal(paused.projectiles.length,0);paused.setPaused(false,due+1100);paused.releasePendingToolUse(paused.pendingToolUse.releaseAt);assert.equal(paused.projectiles.length,1);
  const malformed=fixture('rift-bombard');malformed.fireSecondary(100000,{x:1,y:0});const relative=malformed.savedPendingToolUse(100010);relative.payload.members=Array.from({length:100},()=>({...relative.payload.shot}));assert.equal(normalizePendingToolUse(relative),null);
  const dead=fixture('rift-bombard');dead.fireSecondary(100000,{x:1,y:0});dead.player.hp=0;dead.resolveDeath(100010,{reset(){}});assert.equal(dead.pendingToolUse,null);assert.equal(dead.projectiles.length,0);
  const sweep=fixture('great-sweep');sweep.save.toolUseCounter=Number.MAX_SAFE_INTEGER;const ready=sweep.toolReadyAt||0,visual=sweep.player.attackVisual;assert.equal(sweep.fireSecondary(100000,{x:1,y:0}),false);assert.equal(sweep.toolReadyAt||0,ready);assert.strictEqual(sweep.player.attackVisual,visual);assert.equal(sweep.save.toolUseCounter,Number.MAX_SAFE_INTEGER);const corrupt:any=fixture('rift-bombard');corrupt.save.toolUseCounter=-1;assert.equal(migrateSave(JSON.parse(JSON.stringify(corrupt.save))).toolUseCounter,Number.MAX_SAFE_INTEGER);
});

test('top-down use remains immediate and death/area transition cancel committed Close View uses without refund or replay',()=>{
  const top:any=new Game(freshSave(),1000);top.installSystems();top.installWeaponSystems();top.enemies=[];top.save.equipment.secondary=structuredClone(items['rift-bombard']);assert.equal(top.fireSecondary(1000,{x:1,y:0}),true);assert.equal(top.pendingToolUse??null,null);assert.equal(top.projectiles.length,1);
  for(const mode of ['death','area']){const g=fixture('rift-bombard');g.fireSecondary(100000,{x:1,y:0});const ready=g.player.attackReadyAt;if(mode==='death'){g.player.hp=0;g.cancelPendingToolUse('death');}else g.loadArea('dungeon',true);assert.equal(g.pendingToolUse,null);assert.equal(g.projectiles.length,0);assert.equal(g.player.attackReadyAt,ready);}
});
