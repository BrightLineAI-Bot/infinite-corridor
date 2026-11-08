import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture, restoreRoomRoutingFixture } from '../src/proving-ground-labs.ts';
import { buildingPlan } from '../src/great-buildings.ts';
import { pentagonPlan } from '../src/pentagon.ts';
import { createCombatant, enemyBodyRadius } from '../src/combat.ts';
import { ACTOR_CONTACT, actorContactStats, ordinaryContactEnemy } from '../src/actor-contact.ts';
import { footprintOpen } from '../src/game.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';

const input = (x,y,action='') => {let used=false;return {state:{x,y},held:()=>false,consume:k=>k===action&&!used&&(used=true)};};
const load = (g,id) => {g.save.session.activeDungeonId=id;g.loadArea('dungeon',false);};
function setup(family,view=true,seed='ROUTING0') {
  const f=createLabFixture({lab:'close-view',scenario:`routing-${family}-candidate`,seed,now:1000}),g=f.game;
  if(family==='keep') {const p=buildingPlan(g.map.building.base,5);load(g,`${p.base}:f${p.optionalRoute.from}`);}
  else {const s=f.diagnostics.routing.site,p=pentagonPlan(f.seed,s.cx,s.cy,10),n=p.nodes.find(n=>n.id===p.optionalRoutes[0].a);load(g,`${p.base}:f${n.n+1}`);}
  g.save.closeView=view;g.player.invulnerableUntil=1e9;
  for(const e of g.enemies)e.hitStun=1e6;
  return {f,g,stair:g.map.objects.find(o=>o.routeId)};
}
function tick(g,x,y,count=1,action='',start=1000) {
  for(let i=0;i<count;i++)g.update(.05,input(x,y,i===0?action:''),(g.lastUpdateNow||start)+50);
}
function blocker(g,at,kind='rootBrute') {
  const e=Object.assign(createCombatant(kind,at.x,at.y,false,['vital']),{hitStun:1e6});
  assert.ok(ordinaryContactEnemy(e));g.enemies.push(e);return e;
}
function solid(g,e) {
  assert.ok(Math.hypot(g.player.x-e.x,g.player.y-e.y)>=ACTOR_CONTACT.playerRadius+enemyBodyRadius(e)-1e-6);
  assert.ok(footprintOpen(g.map,g.map.width,g.player.x,g.player.y),'accepted endpoint remains on real generated terrain');
  assert.equal(actorContactStats(g).budgetStops,0);
}
function defeat(g) {
  for(const e of [...g.enemies]){e.hp=0;e.dead=true;g.defeatEnemy(e);}
  tick(g,0,0);
}

for(const family of ['keep','pentagon']) {
  test(`${family} side-stair relief stays solid during walking, Jump and dodge and permits retreat around a large foe`,()=>{
    for(const view of [false,true])for(const kind of ['rootBrute','hollowMarshal'])for(const action of ['','jump','dodge']) {
      const {g,stair}=setup(family,view),e=blocker(g,stair,kind);
      Object.assign(g.player,{x:stair.x-1,y:stair.y});
      tick(g,1,0,16,action);solid(g,e);assert.ok(g.player.x<e.x);assert.ok(Math.hypot(e.x-stair.x,e.y-stair.y)<ACTOR_CONTACT.epsilon);
      const stopped=g.player.x;g.moveGrounded(g.player,-.36,0);assert.ok(g.player.x<stopped-.2,'blocking cannot prevent retreat');solid(g,e);
      // Exercise the production displacement adapter around the actual pocket without advancing
      // enemy AI; the preceding update frames separately exercise walking/Jump/dodge intent.
      g.moveGrounded(g.player,0,-.96);const sideY=g.player.y;assert.ok(sideY<e.y-.9);solid(g,e);
      g.moveGrounded(g.player,1.92,0);assert.ok(g.player.x>e.x+.6,'large body has a usable side route');solid(g,e);
    }
  });

  test(`${family} exact scratch resume of a coincident stair arrival permits monotonic escape without moving the foe`,()=>{
    const {f,g,stair}=setup(family),e=g.enemies.find(ordinaryContactEnemy);assert.ok(e);
    Object.assign(e,{x:stair.x,y:stair.y,hitStun:1e6});
    Object.assign(g.player,{x:stair.x,y:stair.y});
    const snapshot=deserializeSave(serializeSave(g.exportSnapshot(1000))),restored=restoreRoomRoutingFixture(f,snapshot,6000).game;
    const saved=restored.enemies.find(q=>q.id===e.id);assert.ok(saved);
    assert.deepEqual([restored.player.x,restored.player.y],[saved.x,saved.y]);
    saved.hitStun=1e6;restored.player.invulnerableUntil=1e9;
    tick(restored,-1,0,8,'',6000);solid(restored,saved);assert.ok(Math.hypot(saved.x-stair.x,saved.y-stair.y)<ACTOR_CONTACT.epsilon);
    const before=restored.player.x;tick(restored,1,0,16);solid(restored,saved);assert.ok(restored.player.x>before&&restored.player.x<saved.x);
  });
}

test('contact at a parallel Heart stair preserves partial-keeper refusal, valid Act travel and paired return',()=>{
  const {g,stair}=setup('pentagon'),id=g.areaId(),e=blocker(g,stair);
  Object.assign(g.player,{x:stair.x-1,y:stair.y});tick(g,1,0,8);solid(g,e);
  const base=g.map.building.base,H=g.save.consequences.dungeons[`${base}:f1`];
  H.pentLevers=[0,1,2];H.pentTrials=[0,1,2];H.pentSigil=true;
  assert.equal(g.interact('descend',stair.id).ok,false);assert.equal(g.areaId(),id);
  defeat(g);const standing=blocker(g,stair);tick(g,1,0,8);solid(g,standing);
  assert.ok(g.interact('descend',stair.id).ok,'Act remains usable from the body-clipped approach');
  const back=g.map.objects.find(o=>o.id===stair.counterpartId);assert.ok(back);assert.ok(footprintOpen(g.map,g.map.width,g.player.x,g.player.y));
  assert.ok(g.interact('climb',back.id).ok);assert.equal(g.areaId(),id);
  assert.ok(g.map.objects.some(o=>o.id===stair.id));
});

for(const seed of ['ROUTING0','CONTACT-ROOF2'])test(`candidate Keep ${seed} retains its real roof contract from a body-blocked approach`,()=>{
  const {g}=setup('keep',true,seed),base=g.map.building.base,hasHatch=g.map.building.roof;
  load(g,`${base}:f${g.map.building.floors}`);for(const e of g.enemies)e.hitStun=1e6;
  const roof=g.map.objects.find(o=>o.dir==='roofExit'||o.dir==='roof');assert.ok(roof);
  // Pick an actual one-tile approach; no floor or elevation is fabricated for the witness.
  const near=[[0,-1],[-1,0],[1,0],[0,1]].map(([dx,dy])=>({x:roof.x+dx,y:roof.y+dy,dx:-dx,dy:-dy})).find(p=>footprintOpen(g.map,g.map.width,p.x,p.y)&&!g.map.tiles[p.y*g.map.width+p.x]?.hole&&g.map.tiles[p.y*g.map.width+p.x]?.elev===g.map.tiles[roof.y*g.map.width+roof.x]?.elev);
  assert.ok(near);Object.assign(g.player,{x:near.x,y:near.y,invulnerableUntil:1e9});
  const e=blocker(g,roof);tick(g,near.dx,near.dy,8);solid(g,e);
  if(roof.dir==='roofExit')assert.equal(g.interact('climb',roof.id).ok,false,'guardian still gates the roof');
  defeat(g);const remaining=blocker(g,roof);tick(g,near.dx,near.dy,8);solid(g,remaining);
  const climbed=g.interact('climb',roof.id);assert.ok(climbed.ok,JSON.stringify({climbed,player:[g.player.x,g.player.y],roof}));assert.equal(g.area,'overworld');
  const tile=g.map.tiles[Math.floor(g.player.y+.75)*(g.map.width||32)+Math.floor(g.player.x+.5)];assert.ok(tile?.structure==='buildingRoof'||tile?.elev>=5);
  const hatch=g.map.objects.find(o=>o.roofHatch);
  if(hasHatch){assert.ok(hatch);assert.ok(g.interact('enter',hatch.id).ok);
    assert.equal(g.map.building.base,base);assert.equal(g.map.building.floor,g.map.building.floors);assert.equal(g.map.building.interiorVersion,5);
    assert.ok(footprintOpen(g.map,g.map.width,g.player.x,g.player.y));
  }else assert.equal(hatch,undefined,'the inherited roofTop exit does not invent a return hatch');
});
