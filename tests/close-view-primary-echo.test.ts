import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, PRIMARY_ECHO_VISUAL } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { normalizeSockets } from '../src/glyphs.ts';
import { render } from '../src/renderer.ts';

const item=kind=>normalizeSockets(kind==='cinder-pike'
  ? {id:'primary-cinder-pike',name:'Cinder Pike',slot:'primary',power:5,property:'reach',tier:'rare',affixes:[],glyphs:['echo',null]}
  : {id:'primary-verge-cleaver',name:'Verge Cleaver',slot:'primary',power:5,property:'impact',tier:'rare',affixes:[],glyphs:[]});
function arena(){const save=freshSave();save.seed='PRIMARY-ECHO-VISUAL';save.equipment.primary=item('cinder-pike');save.glyphs.echo=0;const g=new Game(save,0);g.area='dungeon';g.map={name:'Echo Chamber',width:32,height:32,tiles:Array.from({length:1024},(_,i)=>({x:i%32,y:Math.floor(i/32),kind:'ash',blocked:false})),objects:[],enemySpawns:[],exits:null};Object.assign(g.player,{x:10,y:10,facing:'right'});g.save.lastAim={x:1,y:0};g.enemies=[{id:'actual',kind:'ashling',x:16,y:10,hp:100,maxHp:100,damage:1,range:1,attackCooldown:1,dead:false,aggro:true}];return g;}
const ctxStyles=(g,reduce=false)=>{g.presentation={...(g.presentation||{}),reduceMotion:reduce,safeMode:false,effectiveQuality:'low',weather:false};const styles=new Set(),ctx=new Proxy({canvas:null,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{if(k==='fillStyle'||k==='strokeStyle')styles.add(v);o[k]=v;return true;}});render(ctx,g,390,844,1250);return styles;};

test('the delayed Echo keeps a faint accepted memory but its dominant cue follows actual canonical recomputation',()=>{
  const g=arena();g.primaryAttack(1000,{x:1,y:0});const accepted=structuredClone(g.player.attackVisual),combo=structuredClone(g.player.primaryCombo),visualUntil=g.player.primaryVisualUntil;
  assert.equal(g.glyphTimers.length,1);assert.equal(g.glyphTimers[0].at,1250);assert.deepEqual(g.glyphTimers[0].echoVisual,{x:10.5,y:10.45,dx:1,dy:0,range:2.45,arc:32,shape:'thrust',weaponKind:'cinder-pike',primaryStep:1,support:0});
  g.tickGlyphs(.001,1249);assert.equal(g.glyphVisuals?.some(v=>v.kind==='primaryEcho')||false,false);assert.equal(g.enemies[0].hp,100);
  Object.assign(g.player,{x:15,y:10});g.save.equipment.primary=item('verge-cleaver');g.player.meleeAim={x:1,y:0};g.tickGlyphs(.001,1250);
  const cue=g.glyphVisuals.find(v=>v.kind==='primaryEcho');assert.ok(cue);assert.deepEqual(cue.memory,g.glyphTimers[0]?.echoVisual??{x:10.5,y:10.45,dx:1,dy:0,range:2.45,arc:32,shape:'thrust',weaponKind:'cinder-pike',primaryStep:1,support:0});
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
