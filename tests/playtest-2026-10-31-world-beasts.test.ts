// Diagnostic audit at r603. Production code and terrain are unmodified.
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSave} from '../src/types.ts';
import {Game,footprintOpen,footprintHazard,settlementSanctuary} from '../src/game.ts';
import {WORLD_BEASTS,BEAST_HOMES} from '../src/world-beasts.ts';
import {skylandSection,rollSkylandMode,skylandModeOf} from '../src/skylands.ts';
const idle={state:{x:0,y:0},consume:()=>false,held:()=>false};
// Existing valid hunt/patience fixture, matching world-beast-pursuit tests. Observe
// real update/transitionSection lifecycle, not chance-roll acquisition or human navigation.
function retreat(seed,id,physicalBoundary=false){
 const s=freshSave();s.seed=seed;s.level=8;s.perception.aperture=10810;s.capabilities.swim=true;
 s.worldBeasts[id].active={rx:6,ry:6,tries:1,patience:179.99};
 const g=new Game(s,0);g.rx=6;g.ry=6;g.loadArea('overworld');
 let e=g.enemies.find(e=>e.worldBeast===id);assert.ok(e,'generated placement accepts hunt');e.aggro=true;
 let now=1000;g.player.invulnerableUntil=1e12;g.update(.05,idle,now+=50);
 const home=structuredClone(s.worldBeasts[id].active.retreat.home),trace=[];
 for(let leg=0;leg<30&&s.worldBeasts[id].active;leg++){ // release 609: a retreat that re-plans (no ground at its first home) may walk further
  // Keep observer alive and stationary on generated safe ground. This does not alter
  // beast movement, terrain, destination, routing or the hunt lifecycle.
  const safe=g.map.tiles.find(t=>t.x>2&&t.y>2&&t.x<28&&t.y<28&&footprintOpen(g.map,32,t.x,t.y)&&!footprintHazard(g.map,32,t.x,t.y));
  if(safe){g.player.x=safe.x;g.player.y=safe.y;}
  e=g.enemies.find(e=>e.worldBeast===id&&!e.dead);assert.ok(e,`visible in section ${g.rx},${g.ry}`);
  const at=[g.rx,g.ry];let steps=0;while(steps++<2000&&g.enemies.includes(e)){g.player.invulnerableUntil=1e12;g.player.hp=1e6;g.player.stamina=1e6;g.update(.05,idle,now+=50);}
  assert.ok(steps<2000,`retires or crosses within 100 seconds: ${JSON.stringify({at,pos:[e.x,e.y],to:e.fleeTo,path:e.fleePath,zone:settlementSanctuary(g.map,g.rx,g.ry,s),player:[g.player.x,g.player.y],active:s.worldBeasts[id].active})}`);
  const q=s.worldBeasts[id].active,H=BEAST_HOMES[WORLD_BEASTS[id].home];
  trace.push({at,seconds:steps*.05,target:e.fleeTo,cloud:!!e.giantCloud,habitatTiles:g.map.tiles.filter(H.tile).length});
  if(q){const dx=q.rx-g.rx,dy=q.ry-g.ry;assert.equal(Math.abs(dx)+Math.abs(dy),1,'one adjacent step');if(physicalBoundary){const old=[g.rx,g.ry];g.player.x=dx<0?.1:dx>0?30.8:e.fleeTo.x;g.player.y=dy<0?.1:dy>0?30.8:e.fleeTo.y;const move={...idle,state:{x:dx,y:dy}};for(let n=0;n<20&&g.rx===old[0]&&g.ry===old[1];n++){g.player.stamina=1e6;g.update(.05,move,now+=50);}}else g.transitionSection(dx,dy);assert.deepEqual([g.rx,g.ry],[q.rx,q.ry]);}
 }
 assert.equal(s.worldBeasts[id].active,null,'retreat reaches terminal escape');assert.equal(s.worldBeasts[id].escaped,1);
 console.log('RETREAT',JSON.stringify({seed,id,home,trace}));return {s,g,home,trace};
}
for(const [id,crossings] of [['morphingBlob',4],['tremorWorm',3],['mountainTurtle',1],['nanobotKnight',0],['lightningGiant',1],['psychicCrystal',0]]){
 test(`playtest positive retreat: ${id} remains followable for ${crossings} crossings`,()=>{
  const r=retreat('PLAYTEST-RETREAT',id);assert.equal(r.trace.length,crossings+1);assert.ok(r.trace.at(-1).habitatTiles>0);if(id==='lightningGiant')assert.ok(r.trace.at(-1).cloud);
 });
}
test('playtest BUG: nanobotKnight must reach actual glass terrain before escape',()=>{
 const r=retreat('PLAYTEST-HOME-7','nanobotKnight',true);assert.ok(r.home.found);assert.equal(r.trace.at(-1).target.home,true);
 assert.ok(r.trace.at(-1).habitatTiles>0,`Knight claimed home at ${r.home.rx},${r.home.ry}, then vanished at center without any glass tile`);
});
test('playtest BUG: retreating Blob must pass through sanctuary instead of being held at its rim',()=>{
 const r=retreat('PLAYTEST-HOME-10','morphingBlob');assert.equal(r.s.worldBeasts.morphingBlob.active,null);
});
for(const mode of ['rush','cloud','gauntlet','gate'])test(`playtest Skylands ${mode} lifecycle completes`,()=>{
 const s=freshSave();s.seed='SKY';s.skylands={sigils:5,best:3,runs:0,clears:0};s.worldBeasts.lightningGiant.slain=1;
 const rx=-16,ry=7;while(rollSkylandMode(s.seed,{rx,ry},s.skylands.runs+1)!==mode)s.skylands.runs++;
 const g=new Game(s,0);g.rx=rx;g.ry=ry;g.loadArea('overworld');const st=g.map.objects.find(o=>o.kind==='skyStair');assert.ok(st);
 // Entry at top disc is a controlled state fixture; jump traversal has separate tests.
 g.player.x=st.x;g.player.y=st.y;g.skyLevel=st.elev;
 assert.ok(g.interact('ascend:1',st.id).ok);
 if(mode==='gate'){assert.equal(g.area,'overworld');assert.equal(s.skylands.sigils,5);assert.ok(Math.hypot(g.rx-rx,g.ry-ry)>=9);return;}
 assert.equal(skylandModeOf(g.areaId()),mode);const before=JSON.stringify(s.worldBeasts),id=g.areaId(),waves=[];let now=1000;
 for(let k=0;k<10&&!s.consequences.dungeons[id]?.resolved;k++){
  waves.push(g.enemies.filter(e=>!e.dead).map(e=>e.kind));
  // Harness-driven defeat tests progression/reward/exit, not natural combat difficulty.
  for(const e of g.enemies){e.hp=0;e.dead=true;g.defeatEnemy(e);}
  for(let n=0;n<60;n++){g.player.invulnerableUntil=1e12;g.update(.05,idle,now+=50);}
 }
 assert.equal(s.consequences.dungeons[id]?.resolved,true);assert.equal(s.skylands.clears,1);assert.equal(s.skylands.sigils,5,'tier 1 spends one and repays one');assert.equal(JSON.stringify(s.worldBeasts),before);
 const exit=g.map.objects.find(o=>o.kind==='exit');g.player.x=exit.x;g.player.y=exit.y;assert.ok(g.interact('exit',exit.id).ok);assert.equal(g.area,'overworld');
 assert.equal(Object.keys(s.consequences.dungeons).filter(k=>k.startsWith('skyland:')).length,0);
 console.log('SKYMODE',JSON.stringify({mode,waves,exit:[g.rx,g.ry]}));
});
test('playtest Skylands candidate density and old-area adoption',()=>{
 let n=0;const cells=new Map();for(let x=-80;x<80;x++)for(let y=-80;y<80;y++)if(skylandSection('SKY',x,y)){n++;assert.ok(Math.abs(x)+Math.abs(y)>=14);const key=`${Math.floor(x/8)},${Math.floor(y/8)}`;cells.set(key,(cells.get(key)||0)+1);}
 assert.ok([...cells.values()].every(n=>n===1));assert.ok(n>150&&n<300);console.log('SKYDENSITY',n,'/25600 candidates');
 const s=freshSave();s.seed='SKY';s.atlas={};s.atlas['-16,7']={terrain:'ash',landscapeVersion:8,dreamVersion:4,hamletVersion:2,seaVersion:3,travelVersion:1};const g=new Game(s,0);g.rx=-16;g.ry=7;g.loadArea('overworld');assert.equal(g.map.objects.some(o=>o.kind==='skyStair'),false,'old area without skyVersion stays old');
});
