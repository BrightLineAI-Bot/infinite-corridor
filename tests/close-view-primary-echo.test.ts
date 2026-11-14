import test from 'node:test';
import { swingTo } from './swing-helpers.ts';
import assert from 'node:assert/strict';
import { Game, PRIMARY_ECHO_VISUAL, updateEnemyAI } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { normalizeSockets } from '../src/glyphs.ts';
import { render } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

test('quiet Echo inspection fixtures use the real glyph delay and keep the normal combat scenarios unchanged',()=>{
  for(const scenario of ['pike-echo-inspection','cleaver-echo-inspection']){
    const {game:g}=createLabFixture({lab:'combat-assets',scenario,now:1000});
    assert.equal(g.save.equipment.primary.glyphs[0],'echo');assert.equal(g.enemies[0].passiveBehavior,'practice');assert.ok(!(g.enemies[0].hitStun>0));
    const acceptedAt=1000;g.primaryAttack(acceptedAt,{x:1,y:0});const accepted=structuredClone(g.player.attackVisual);
    const contactAt=g.pendingMeleeContact?.v===3?swingTo(g,acceptedAt,'contact'):acceptedAt; // 2026-11-14: the Cleaver's weighted swing schedules its Echo at its contact
    assert.equal(g.glyphTimers.length,1);assert.equal(g.glyphTimers[0].at,contactAt+250);
    g.tickGlyphs(.001,contactAt+249);assert.equal(g.glyphVisuals.some(v=>v.kind==='primaryEcho'),false);
    g.tickGlyphs(.001,contactAt+250);assert.equal(g.glyphVisuals.filter(v=>v.kind==='primaryEcho').length,1);assert.deepEqual(g.player.attackVisual,accepted);
    const hp=g.player.hp;g.update(.016,{state:{x:0,y:0},consume:()=>false,held:()=>false},contactAt+266);assert.equal(g.player.hp,hp);
  }
  const normal=createLabFixture({lab:'combat-assets',scenario:'pike-spindle-hound',now:1000}).game;
  assert.equal(normal.save.equipment.primary.glyphs.includes('echo'),false);assert.notEqual(normal.enemies[0].passiveBehavior,'practice');assert.ok(normal.enemies[0].maxHp<5000);
});

test('all quiet Echo fixtures remain attackable, stationary and harmless through real hits and 60 active seconds',()=>{
  const idle={state:{x:0,y:0},consume:()=>false,held:()=>false},steps=[.017,.031,.05];
  for(const scenario of ['pike-echo-inspection','cleaver-echo-inspection','salvage-echo-inspection']){
    const {game:g,diagnostics}=createLabFixture({lab:'combat-assets',scenario,now:1000}),foe=g.enemies[0],d=g.save.lastAim,start={x:foe.x,y:foe.y},playerHp=g.player.hp;
    assert.equal(foe.passiveBehavior,'practice');assert.equal(foe.hp,5000);assert.deepEqual({x:diagnostics.placement.foe.x,y:diagnostics.placement.foe.y},start);
    let moveNow=1000,moves=0;const moving={state:{x:d.x,y:d.y},consume:()=>false,held:()=>false};while(Math.hypot(foe.x-g.player.x,foe.y-g.player.y)>1.4&&moves++<100){moveNow+=50;g.update(.05,moving,moveNow);}assert.ok(moves<100,`${scenario} production movement reaches the practice target`);assert.deepEqual({x:foe.x,y:foe.y},start);assert.equal(g.player.hp,playerHp);
    const acceptedAt=moveNow+1,before=foe.hp,hits=g.primaryAttack(acceptedAt,d),swung=g.pendingMeleeContact?.v===3?swingTo(g,acceptedAt):acceptedAt;assert.ok(hits.length>0||swung>acceptedAt,scenario);const afterPrimary=foe.hp;assert.ok(afterPrimary<before,`${scenario} primary lands`);assert.deepEqual({x:foe.x,y:foe.y},start); // 2026-11-14: the Cleaver's weighted swing lands in its active window
    g.tickGlyphs(.001,swung+250);assert.ok(foe.hp<afterPrimary,`${scenario} real Echo lands`);assert.deepEqual({x:foe.x,y:foe.y},start);assert.equal(g.player.hp,playerHp);
    let elapsed=0,i=0,now=swung+250;while(elapsed<60){const dt=Math.min(steps[i++%steps.length],60-elapsed);elapsed+=dt;now+=dt*1000;g.update(dt,idle,now);}
    assert.deepEqual({x:foe.x,y:foe.y},start);assert.equal(g.player.hp,playerHp);assert.equal(foe.passiveBehavior,'practice');assert.equal(foe.telegraph,0);assert.equal(foe.strike,0);assert.equal(foe.meleePhase,null);assert.equal(foe.threatRange,null);assert.equal(foe.hitStun,0);assert.equal(foe.recoil,0);assert.equal(g.projectiles.some(q=>q.hostile),false);assert.equal(g.eliteHazards.length,0);
    const reset=createLabFixture({lab:'combat-assets',scenario,now:now+1000}).game;assert.equal(reset.player.hp,reset.save.maxHp);assert.equal(reset.enemies[0].hp,5000);assert.equal(reset.enemies[0].passiveBehavior,'practice');
  }
});

test('practice behavior survives pause and JSON resume without changing ordinary passive controls',()=>{
  const {game:g}=createLabFixture({lab:'combat-assets',scenario:'pike-echo-inspection',now:1000}),foe=g.enemies[0],at={x:foe.x,y:foe.y};g.setPaused(true,1200);g.update(10,{state:{x:0,y:0},consume:()=>false,held:()=>false},11200);assert.deepEqual({x:foe.x,y:foe.y},at);assert.equal(g.player.hp,g.save.maxHp);
  const restored=JSON.parse(JSON.stringify(foe));assert.equal(restored.passiveBehavior,'practice');assert.deepEqual({x:restored.x,y:restored.y},at);assert.equal(updateEnemyAI(restored,g.player,g.map,g.map.width,.05,20050),false);assert.deepEqual({x:restored.x,y:restored.y},at);assert.equal(restored.ai.mode,'idle');
  for(const mode of ['graze','follow']){const ordinary=JSON.parse(JSON.stringify(foe));Object.assign(ordinary,{passiveBehavior:mode,x:g.player.x+3,y:g.player.y,ai:{homeX:g.player.x+3,homeY:g.player.y,phase:0,facing:'left',mode:'patrol',step:0}});const before={x:ordinary.x,y:ordinary.y};assert.equal(updateEnemyAI(ordinary,g.player,g.map,g.map.width,.1,20100),false);assert.notDeepEqual({x:ordinary.x,y:ordinary.y},before,`${mode} retains its existing motion`);}
});

const item=kind=>normalizeSockets(kind==='cinder-pike'
  ? {id:'primary-cinder-pike',name:'Cinder Pike',slot:'primary',power:5,property:'reach',tier:'rare',affixes:[],glyphs:['echo',null]}
  : {id:'primary-verge-cleaver',name:'Verge Cleaver',slot:'primary',power:5,property:'impact',tier:'rare',affixes:[],glyphs:[]});
const fists=()=>normalizeSockets({id:'primary-iron-fists',name:'Iron Fists',slot:'primary',power:5,property:'brawler',tier:'rare',affixes:[],glyphs:[]});
function arena(){const save=freshSave();save.seed='PRIMARY-ECHO-VISUAL';save.equipment.primary=item('cinder-pike');save.glyphs.echo=0;const g=new Game(save,0);g.area='dungeon';g.map={name:'Echo Chamber',width:32,height:32,tiles:Array.from({length:1024},(_,i)=>({x:i%32,y:Math.floor(i/32),kind:'ash',blocked:false})),objects:[],enemySpawns:[],exits:null};Object.assign(g.player,{x:10,y:10,facing:'right'});g.save.lastAim={x:1,y:0};g.enemies=[{id:'actual',kind:'ashling',x:16,y:10,hp:100,maxHp:100,damage:1,range:1,attackCooldown:1,dead:false,aggro:true}];return g;}
const ctxStyles=(g,reduce=false)=>{g.presentation={...(g.presentation||{}),reduceMotion:reduce,safeMode:false,effectiveQuality:'low',weather:false};const styles=new Set(),ctx=new Proxy({canvas:null,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{if(k==='fillStyle'||k==='strokeStyle')styles.add(v);o[k]=v;return true;}});render(ctx,g,390,844,1250);return styles;};

test('the delayed Echo keeps a faint accepted memory but its dominant cue follows actual canonical recomputation',()=>{
  // 2026-11-14 (melee-swing.ts): the pike's thrust lands after its draw-back and queues its Echo at that contact, from where the lunge carried it
  const g=arena();g.primaryAttack(1000,{x:1,y:0});const at=swingTo(g,1000,'contact');const accepted=structuredClone(g.player.attackVisual),combo=structuredClone(g.player.primaryCombo),visualUntil=g.player.primaryVisualUntil;
  const memory=g.glyphTimers[0]?.echoVisual;assert.equal(g.glyphTimers.length,1);assert.equal(g.glyphTimers[0].at,at+250);assert.deepEqual({...memory,x:undefined},{x:undefined,y:10.45,dx:1,dy:0,range:2.45,arc:32,shape:'thrust',weaponKind:'cinder-pike',primaryStep:1,support:0});assert.ok(memory.x>10.5&&memory.x<11,'where the thrust struck');
  g.tickGlyphs(.001,at+249);assert.equal(g.glyphVisuals?.some(v=>v.kind==='primaryEcho')||false,false);assert.equal(g.enemies[0].hp,100);
  Object.assign(g.player,{x:15,y:10});g.save.equipment.primary=item('verge-cleaver');g.player.meleeAim={x:1,y:0};g.tickGlyphs(.001,at+250);
  const cue=g.glyphVisuals.find(v=>v.kind==='primaryEcho');assert.ok(cue);assert.deepEqual(cue.memory,memory);
  assert.equal(cue.actual.x,15.5);assert.equal(cue.actual.shape,'arc');assert.equal(cue.actual.range,1.75);assert.equal(g.enemies[0].hitFlash,.18);assert.ok(g.enemies[0].hp<100);
  assert.deepEqual(g.player.attackVisual,accepted);assert.deepEqual(g.player.primaryCombo,combo);assert.equal(g.player.primaryVisualUntil,visualUntil,'Echo cannot replay or extend accepted body presentation');
  assert.ok(ctxStyles(g,false).has('#c9a7ff'),'actual player Echo is violet, not hostile pink');assert.ok(ctxStyles(g,false).has('#d8c8ff'),'normal motion retains faint original memory');assert.equal(ctxStyles(g,true).has('#d8c8ff'),false,'reduced motion omits secondary memory only');
  const life=cue.life;g.setPaused(true,1251);g.update(1,{state:{x:0,y:0},consume:()=>false,held:()=>false},2251);assert.equal(cue.life,life,'pause freezes the existing transient stream');g.setPaused(false,2251);
});

test('primary Echo visuals expire and evict only their oldest visual without touching mechanical timers',()=>{
  const g=arena(),other={kind:'arc',life:1,max:1};g.glyphVisuals=[other,...Array.from({length:PRIMARY_ECHO_VISUAL.cap},(_,i)=>({kind:'primaryEcho',life:1,max:1,tag:i}))];
  g.primaryStrike=(now,direction,echo)=>{g.player.meleeStrike={x:1,y:2,dx:1,dy:0};g.attackProfile={shape:'thrust',range:2,arc:30};assert.equal(echo.share,.5);return[];};
  g.glyphTimers=[{at:100,kind:'strike',share:.5,echoVisual:null},{at:200,kind:'shot',shot:{id:'kept'}}];g.tickGlyphs(.01,100);
  assert.equal(g.glyphVisuals.filter(v=>v.kind==='primaryEcho').length,PRIMARY_ECHO_VISUAL.cap);assert.equal(g.glyphVisuals.includes(other),true);assert.equal(g.glyphVisuals.some(v=>v.tag===0),false);assert.equal(g.glyphTimers.length,1);assert.equal(g.glyphTimers[0].kind,'shot');
  g.tickGlyphs(PRIMARY_ECHO_VISUAL.life+1,101);assert.equal(g.glyphVisuals.some(v=>v.kind==='primaryEcho'),false);
});

test('primary Echo cues require a newly accepted canonical strike, including accepted empty air',()=>{
  const equipped=arena();equipped.enemies[0].x=12;equipped.primaryAttack(1000,{x:1,y:0});const eAt=swingTo(equipped,1000,'contact'); /* 2026-11-14: the thrust's contact queues the Echo */const equippedHp=equipped.enemies[0].hp,oldEquippedStrike=equipped.player.meleeStrike;
  equipped.save.equipment.primary=fists();equipped.tickGlyphs(.001,eAt+250);
  assert.strictEqual(equipped.player.meleeStrike,oldEquippedStrike,'Fists refusal leaves the prior strike untouched');assert.equal(equipped.enemies[0].hp,equippedHp,'refused Echo adds no hit');assert.equal(equipped.glyphVisuals?.some(v=>v.kind==='primaryEcho')||false,false,'refused Echo adds no stale cue');assert.equal(equipped.glyphTimers.length,0,'the due mechanical timer is still consumed');

  const penned=arena();penned.primaryAttack(1000,{x:1,y:0});const pAt=swingTo(penned,1000,'contact');const oldPennedStrike=penned.player.meleeStrike;penned.penned=()=>true;penned.tickGlyphs(.001,pAt+250);
  assert.strictEqual(penned.player.meleeStrike,oldPennedStrike);assert.equal(penned.glyphVisuals?.some(v=>v.kind==='primaryEcho')||false,false,'pen refusal adds no stale cue');assert.equal(penned.glyphTimers.length,0);

  const empty=arena();empty.enemies=[];empty.primaryAttack(1000,{x:1,y:0});const mAt=swingTo(empty,1000,'contact');const oldEmptyStrike=empty.player.meleeStrike;empty.tickGlyphs(.001,mAt+250);
  assert.notStrictEqual(empty.player.meleeStrike,oldEmptyStrike,'accepted empty-air strike still produces fresh canonical geometry');assert.equal(empty.glyphVisuals.some(v=>v.kind==='primaryEcho'),true,'accepted empty-air strike retains its readable cue');assert.equal(empty.glyphTimers.length,0);
});
