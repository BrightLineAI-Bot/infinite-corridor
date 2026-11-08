import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAWLER_GEAR, Game } from '../src/game.ts';
import { normalizeHammerfallStartup } from '../src/action-motion.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { migrateSave } from '../src/types.ts';

const calm:any={state:{x:0,y:0},consume:()=>false,held:()=>false,reset:()=>{}};
const hammer={...BRAWLER_GEAR.find((q:any)=>q.item.name==='Hammerfall')!.item};
function fixture(closeView=true){const g:any=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000}).game;g.enemies=[];g.effects=[];g.projectiles=[];g.save.closeView=closeView;g.save.activeWeaponSlot='primary';g.save.equipment.secondary={...hammer};for(const t of g.map.tiles){t.blocked=false;t.openAir=false;t.courtyard=false;t.pentRoof=false;t.pentBalcony=false;if(t.kind==='yardGrass')t.kind='flagFloor';}return g;}

test('eligible Hammerfall references its one original telegraph and releases only on that effect first pulse',()=>{
  const g=fixture(),at=100000;assert.equal(g.brawlerTool('hammerfall',at,{x:1,y:0}),true);const main=g.effects.find((e:any)=>e.kind==='hammerfall'&&!e.echo),ref={...g.hammerfallStartup};
  assert.equal(ref.effectId,main.id);assert.equal(main.delay,.32);assert.equal(g.toolUseBlocksPrimary(),true);const before=structuredClone(g.player.attackVisual);assert.deepEqual(g.primaryAttack(at+100,{x:1,y:0}),[]);assert.deepEqual(g.player.attackVisual,before);
  g.update(.333,calm,at+333);assert.ok(main.delay<0);assert.equal(main.pulseIndex,0);assert.equal(g.toolUseBlocksPrimary(),true,'an uneven delay overshoot still waits for the actual pulse');
  g.update(0,calm,at+333);assert.equal(main.pulseIndex,1);assert.equal(g.hammerfallStartup,null);assert.equal(g.toolUseBlocksPrimary(),false);assert.equal(g.effects.filter((e:any)=>e.kind==='hammerfall').length,1,'release never creates a second physical producer');
});

test('the finite shared buffer dispatches once after the actual pulse and preserves installed readiness',()=>{
  const g=fixture(),at=100000;g.brawlerTool('hammerfall',at,{x:1,y:0});const main=g.effects[0];main.delay=.1;g.player.attackReadyAt=at+500;
  const tap:any={...calm,consume:(k:string)=>k==='attack'};g.update(0,tap,at+220);assert.equal(g.attackBufferUntil,0,'wrapper readiness beyond 120ms refuses the tap');
  g.player.attackReadyAt=0;g.update(0,tap,at+221);assert.ok(g.attackBufferUntil>=at+321);const old=g.player.attackVisual;g.update(.1,calm,at+321);assert.equal(main.pulseIndex,0);assert.strictEqual(g.player.attackVisual,old);g.update(0,calm,at+321);assert.equal(main.pulseIndex,1);assert.equal(g.attackBufferUntil,0);assert.notStrictEqual(g.player.attackVisual,old);assert.equal(g.player.attackVisual.profile,'melee');
  const accepted=g.player.attackVisual;g.update(0,calm,at+322);assert.strictEqual(g.player.attackVisual,accepted,'post-effects release dispatch is one-shot');
});

test('H reuses the installed held/tap Fist buffer while an existing released charge keeps direct readiness',()=>{
  for(const held of [false,true]){const g=fixture(),at=100000;g.save.equipment.primary={...BRAWLER_GEAR[0].item};g.brawlerTool('hammerfall',at,{x:1,y:0});const main=g.effects[0];main.delay=.1;g.player.attackReadyAt=0;const press:any={...calm,consume:(k:string)=>k==='attack',held:(k:string)=>k==='attack'&&held};g.update(0,press,at+220);g.update(.1,{...press,consume:()=>false},at+320);g.update(0,{...press,consume:()=>false},at+320);if(held){assert.equal(g.fistCharge?.start,at+320);assert.equal(g.player.attackVisual.profile,'hammer');assert.equal(g.player.attackVisual.presentationCancelled,true);}else{assert.equal(g.fistCharge==null,true);assert.equal(g.player.attackVisual.profile,'fist');}}
  const direct=fixture(),at=100000;direct.save.equipment.primary={...BRAWLER_GEAR[0].item};direct.brawlerTool('hammerfall',at,{x:1,y:0});const main=direct.effects[0];main.delay=.1;direct.fistCharge={action:'attack',start:at,direction:{x:1,y:0}};direct.player.attackReadyAt=at+1000;direct.update(0,calm,at+220);assert.ok(direct.fistReleaseIntent);direct.update(.1,calm,at+320);direct.update(0,calm,at+320);assert.equal(direct.fistReleaseIntent,null);assert.equal(direct.player.attackVisual.profile,'fist','the captured direct charge release does not inherit the installed wrapper readiness');
});

test('top-down Hammerfall remains immediate-input compatible and never installs the Close View adapter',()=>{
  const g=fixture(false),at=100000;assert.equal(g.brawlerTool('hammerfall',at,{x:1,y:0}),true);assert.equal(g.hammerfallStartup,null);g.player.attackReadyAt=0;g.primaryAttack(at+1,{x:1,y:0});assert.equal(g.player.attackVisual.profile,'melee');assert.equal(g.effects.some((e:any)=>e.kind==='hammerfall'),true);
});

test('Hammerfall and named tools share one slot; pulse-plus-filter releases while missing originals end inertly',()=>{
  const h=fixture(),at=100000;h.brawlerTool('hammerfall',at,{x:1,y:0});const ready=h.toolReadyAt,effects=h.effects.length;h.save.equipment.secondary={id:'secondary-rift-bombard',name:'Rift Bombard',slot:'secondary',power:5,property:'blast'};assert.equal(h.fireSecondary(at+1,{x:1,y:0}),false);assert.equal(h.pendingToolUse,null);assert.equal(h.effects.length,effects);assert.equal(h.toolReadyAt,ready);
  const main=h.effects.find((e:any)=>e.id===h.hammerfallStartup.effectId);main.delay=0;main.life=.01;h.player.attackReadyAt=0;h.attackBufferUntil=at+120;h.attackBufferToolUse=true;h.update(.1,calm,at+100);assert.equal(h.hammerfallStartup,null);assert.equal(h.effects.includes(main),false,'the observed original may pulse and filter in one update');assert.equal(h.player.attackVisual.profile,'melee','pulse-plus-filter remains a release and dispatches one queued intent');
  const named=fixture();named.save.equipment.secondary={id:'secondary-rift-bombard',name:'Rift Bombard',slot:'secondary',power:5,property:'blast'};assert.equal(named.fireSecondary(at,{x:1,y:0}),true);named.save.equipment.secondary={...hammer};assert.equal(named.brawlerTool('hammerfall',at+1,{x:1,y:0}),false);assert.equal(named.effects.some((e:any)=>e.kind==='hammerfall'),false);
  const missing=fixture();missing.brawlerTool('hammerfall',at,{x:1,y:0});missing.effects=[];missing.attackBufferUntil=at+120;missing.attackBufferToolUse=true;assert.deepEqual(missing.reconcileHammerfallStartup(),{released:false,ended:true});assert.equal(missing.attackBufferUntil,0);assert.equal(missing.player.attackVisual.profile,'hammer','an ended association does not stamp a replacement body');
  const hostile=fixture();hostile.brawlerTool('hammerfall',at,{x:1,y:0});hostile.effects[0].hostile=true;assert.deepEqual(hostile.reconcileHammerfallStartup(),{released:false,ended:true});
});

test('schema-14 save resumes the exact original reference, future versions stay opaque, and ended state cannot replay',()=>{
  const g=fixture(),at=100000;g.brawlerTool('hammerfall',at,{x:1,y:0});const id=g.hammerfallStartup.effectId,saved=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(at+100))));assert.equal(saved.session.playerRuntime.hammerfallStartup.effectId,id);
  const back:any=new Game(saved,200000);assert.equal(back.hammerfallStartup.effectId,id);const main=back.effects.find((e:any)=>e.id===id);assert.ok(main);back.update(main.delay,calm,200100);assert.equal(back.toolUseBlocksPrimary(),true);back.update(0,calm,200101);assert.equal(back.hammerfallStartup,null);assert.equal(back.exportSnapshot(200102).session.playerRuntime.hammerfallStartup,null);
  const opaque={v:2,future:{kept:1}};saved.session.playerRuntime.hammerfallStartup=opaque;const future:any=new Game(migrateSave(saved),300000);assert.equal(future.hammerfallStartup,null);assert.deepEqual(future.exportSnapshot(300001).session.playerRuntime.hammerfallStartup,opaque);
  assert.deepEqual(normalizeHammerfallStartup({...opaque}),opaque);assert.equal(normalizeHammerfallStartup({v:1,effectId:'bad',area:'dungeon',areaId:'x',levelId:'root'}),null);
});
