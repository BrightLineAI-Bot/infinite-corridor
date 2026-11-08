import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildingPlan, generateBuildingFloor } from '../src/great-buildings.ts';
import { PENTAGON, pentagonPlan, generatePentagonChamber, pentagonLinkEnds } from '../src/pentagon.ts';
import { createLabFixture, restoreRoomRoutingFixture } from '../src/proving-ground-labs.ts';
import { CLOSE_VIEW_ROOM_ROUTING, layCloseViewRooms, routingKeepAppearance } from '../src/close-view-room-routing.ts';
import { BUILDINGS } from '../src/great-buildings.ts';
import { canStep, tileUnder } from '../src/landscape.ts';
import { footprintOpen } from '../src/game.ts';
import { closeViewStatic, closeViewThemeId } from '../src/close-view.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { render } from '../src/renderer.ts';
import { setBuildKind } from '../src/building.ts';

const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fixture = (family, seed='ROUTING0') => createLabFixture({lab:'close-view',scenario:`routing-${family}-candidate`,seed,now:1000});
const act = (g,o) => { g.player.x=o.x;g.player.y=o.y;return g.interact(o.actions[0],o.id); };
const clearFoes = g => { for(const e of [...g.enemies]) {e.hp=0;e.dead=true;g.defeatEnemy(e);} g.update(.01,{state:{x:0,y:0},consume:()=>false,held:()=>false},(g.lastUpdateNow||1000)+10); };
const load = (g,id) => {g.save.session.activeDungeonId=id;g.loadArea('dungeon',false);};
const semantic = o => Object.fromEntries(Object.entries(o).filter(([k])=>!['id','name','x','y','toX','toY','toFloor','routeId','counterpartId','equivalentId'].includes(k)).map(([k,v])=>[k,k==='toId'?v.replace(/:v(?:9|10):/,':VERSION:'):v]));
function clearLanding(map, stair) {
  const level=map.tiles[stair.y*map.width+stair.x].elev;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const t=map.tiles[(stair.y+dy)*map.width+stair.x+dx];assert.ok(t&&!t.blocked&&!t.hole&&!t.slope);assert.equal(t.elev,level);
    assert.equal(footprintOpen(map,map.width,stair.x+dx,stair.y+dy),true);
  }
  assert.ok(map.enemySpawns.every(e=>Math.hypot(e.x-stair.x,e.y-stair.y)>=2),'ordinary body and return have an escape pocket');
  assert.ok(map.objects.every(o=>o===stair||Math.max(Math.abs(o.x-stair.x),Math.abs(o.y-stair.y))>1),'no object consumes the landing relief');
}
function path(map,from,to) {
  const W=map.width,H=map.height,start=Math.round(from.y)*W+Math.round(from.x),end=to.y*W+to.x,prev=new Int32Array(W*H).fill(-1),q=[start];prev[start]=start;
  for(let i=0;i<q.length&&prev[end]<0;i++){const k=q[i],x=k%W,y=(k/W)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*W+nx,t=map.tiles[n];if(nx<0||ny<0||nx>=W||ny>=H||prev[n]>=0||!t||t.blocked||t.hole||!footprintOpen(map,W,nx,ny)||!canStep({isPlayer:true},map,W,x,y,nx,ny))continue;prev[n]=k;q.push(n);}}
  assert.ok(prev[end]>=0,`${map.id}: ordinary footprint route`);const result=[];for(let n=end;n!==start;n=prev[n])result.push({x:n%W,y:(n/W)|0});return result.reverse();
}
function walk(g,to) {
  const route=path(g.map,g.player,to);let now=g.lastUpdateNow||1000;
  for(const point of route)for(let i=0;i<20;i++){
    const dx=point.x-g.player.x,dy=point.y-g.player.y,d=Math.hypot(dx,dy);if(d<.02)break;
    const scale=Math.min(1,d/.12);g.update(.05,{state:{x:dx/d*scale,y:dy/d*scale},consume:()=>false,held:()=>false},now+=50);
  }
  assert.ok(Math.hypot(g.player.x-to.x,g.player.y-to.y)<.05,`actual movement reaches the stair: ${g.player.x},${g.player.y} -> ${to.x},${to.y} at ${g.areaId()}`);return route.length;
}

test('compact finite grammars retain branching and reduce area without adding foes or unbounded mesh work',()=>{
  const grammars=new Set();
  for(let i=0;i<128;i++){
    const seed=['AUDIT0','DIG-AUDIT0','ROUTING0','PIN'][i]||`COMPACT${i}`,base=`building:${seed}:1:1:keep:4r`,plan=buildingPlan(base,5);
    let count=0;
    for(let f=1;f<=4;f++){
      const m=generateBuildingFloor(seed,`${base}:f${f}`,5),old=generateBuildingFloor(seed,`${base}:f${f}`,4),F=plan.floors[f-1];
      grammars.add(F.routing.grammar);assert.ok(F.leaves.length<=7);assert.ok(m.tiles.filter(t=>!t.blocked&&!t.hole).length<650);
      assert.equal(m.enemySpawns.length,old.enemySpawns.length,'same encounter budget');
      const st=closeViewStatic(m);assert.ok(st.verts<60000);assert.ok(st.lights<=old.tiles.length);
      for(const stair of m.objects.filter(o=>o.routeId)){count++;clearLanding(m,stair);const there=generateBuildingFloor(seed,stair.toId,5),back=there.objects.find(o=>o.id===stair.counterpartId);assert.ok(back);assert.equal(back.counterpartId,stair.id);assert.deepEqual([back.x,back.y],[stair.toX,stair.toY]);assert.equal(back.toId,m.id);}
    }
    assert.ok(count===0||count===2);assert.equal(count===0,!!plan.optionalRoute.reason);
    const sig=digest(plan.optionalRoute);buildingPlan('building:INTERLEAVE:2:2:keep:3',5);assert.equal(digest(buildingPlan(base,5).optionalRoute),sig);
  }
  assert.deepEqual([...grammars].sort(),['offset-ring','paired-wings','staggered-spine']);
});

test('every optional Heart transition duplicates a complete baseline action contract and safe connected component',()=>{
  for(let i=0;i<64;i++){
    const seed=`HEART-PAIR${i}`,p=pentagonPlan(seed,8,-8,10);let ends=0;const shortcuts=new Set();
    for(const n of p.nodes){
      const map=generatePentagonChamber(seed,`${p.base}:f${n.n+1}`),old=generatePentagonChamber(seed,`${p.base.replace(':v10',':v9')}:f${n.n+1}`);
      for(const shortcut of pentagonLinkEnds(p,map)){shortcuts.add(`${shortcut.link}:${shortcut.end}`);path(map,map.entry,shortcut);}
      for(const o of map.objects.filter(o=>o.toId&&!o.routeId))assert.deepEqual(semantic(o),semantic(old.objects.find(x=>x.id===o.id)),`${map.id}/${o.id}: all original ordered guard/effect data`);
      for(const o of map.objects.filter(o=>o.routeId)){
        ends++;assert.equal(n.kind,'heart');assert.deepEqual(semantic(o),semantic(map.objects.find(x=>x.id===o.equivalentId)));
        clearLanding(map,o);const original=map.objects.find(x=>x.id===o.equivalentId);assert.ok(path(map,original,o).length>=CLOSE_VIEW_ROOM_ROUTING.minCircuitSide);
        const there=generatePentagonChamber(seed,o.toId),back=there.objects.find(x=>x.id===o.counterpartId);assert.ok(back);assert.equal(back.counterpartId,o.id);assert.equal(back.toId,map.id);assert.deepEqual([back.x,back.y],[o.toX,o.toY]);
      }
    }
    assert.ok(ends===0||ends===2);assert.equal(ends===0,!!p.optionalRoutes[0].reason);
    for(const link of p.links)for(const end of ['near','deep'])assert.ok(shortcuts.has(`${link.id}:${end}`),`${seed}: existing shortcut ${link.id}/${end} retained`);
  }
});

test('real Keep traversal completes a walking two-floor circuit and scratch resume retains exact state',()=>{
  const f=fixture('keep'),g=f.game,base=g.map.building.base,p=buildingPlan(base,5),r=p.optionalRoute;assert.ok(!r.reason);
  load(g,`${base}:f${r.from}`);clearFoes(g);
  const original=g.map.objects.find(o=>o.dir==='up'&&!o.routeId);assert.ok(act(g,original).ok);
  clearFoes(g);
  const side=g.map.objects.find(o=>o.routeId);assert.ok(walk(g,side)>=10);assert.ok(g.interact('descend',side.id).ok);
  const returnSide=g.map.objects.find(o=>o.counterpartId===side.id);assert.ok(returnSide);
  assert.ok(walk(g,g.map.objects.find(o=>o.dir==='up'&&!o.routeId))>=10);
  g.save.futureRoutingCanary={keep:7};const snapshot=deserializeSave(serializeSave(g.exportSnapshot(g.lastUpdateNow)));
  const restored=restoreRoomRoutingFixture(f,snapshot,g.lastUpdateNow+5000);
  assert.equal(restored.game.areaId(),g.areaId());assert.deepEqual([restored.game.player.x,restored.game.player.y],[g.player.x,g.player.y]);assert.deepEqual(restored.save.futureRoutingCanary,{keep:7});
  assert.deepEqual(restored.save.session.dungeonReturn,g.save.session.dungeonReturn);assert.equal(restored.game.map.objects.find(o=>o.routeId).id,returnSide.id);
});

test('real Heart gates reject partial progression identically and allow the paired circuit only after its keeper falls',()=>{
  const f=fixture('pentagon'),g=f.game,site=f.diagnostics.routing.site,p=pentagonPlan(f.seed,site.cx,site.cy,10),r=p.optionalRoutes[0];assert.ok(!r.reason);
  const a=p.nodes.find(n=>n.id===r.a),id=`${p.base}:f${a.n+1}`,history=()=>g.save.consequences.dungeons[`${p.base}:f1`];
  load(g,id);const H=history();
  for(const partial of [{},{labKeys:['key0','shard0']},{pentLevers:[0,1,2],pentTrials:[0,1,2]},{pentSigil:true,pentOpened:['all']},{labOpen:['plate:'+a.n]},{pentBosses:[a.n+1]}]){
    Object.assign(H,{labKeys:[],labOpen:[],pentLevers:[],pentTrials:[],pentBosses:[],pentSigil:false,pentOpened:[]},partial);
    for(const o of g.map.objects.filter(o=>o.dir==='down')){assert.equal(act(g,o).ok,false);assert.equal(g.areaId(),id);}
  }
  clearFoes(g);assert.ok(history().pentBosses.includes(a.n));
  const down=g.map.objects.find(o=>o.routeId);assert.ok(act(g,down).ok);const deepId=g.areaId();
  clearFoes(g);
  const normalUp=g.map.objects.find(o=>o.dir==='up'&&!o.routeId);assert.ok(walk(g,normalUp)>=10);assert.ok(g.interact('climb',normalUp.id).ok);assert.equal(g.areaId(),id);
  const snap=deserializeSave(serializeSave(g.exportSnapshot(g.lastUpdateNow))),restored=restoreRoomRoutingFixture(f,snap,g.lastUpdateNow+9000);
  assert.equal(restored.game.pentagonVersion(site.cx,site.cy),10);assert.equal(restored.game.pentagonVersion(0,0),9);
  assert.deepEqual(restored.game.save.consequences.dungeons[`${p.base}:f1`].pentBosses,history().pentBosses);
  assert.ok(act(restored.game,restored.game.map.objects.find(o=>o.routeId)).ok);assert.equal(restored.game.areaId(),deepId);
});

test('biomechanical material selection is appearance-only, versioned and reconstructed on the same exterior site',()=>{
  const seed='ROUTING0',baseline=createLabFixture({lab:'close-view',scenario:'routing-keep-biomechanical-baseline',seed,now:1000}),f=fixture('keep-biomechanical',seed),g=f.game;
  assert.deepEqual(f.diagnostics.routing.outside,baseline.diagnostics.routing.outside);
  assert.equal(g.map.building.style,'keep');assert.deepEqual(g.map.building.appearance,{version:1,kind:'biomechanical-keep'});
  assert.equal(closeViewThemeId(g.map.building),'biomechanicalKeep');assert.notEqual(closeViewThemeId(baseline.game.map.building),'biomechanicalKeep');
  const sig=digest(g.map.tiles),st=closeViewStatic(g.map),clone={...g.map,building:{...g.map.building,appearance:undefined}};
  assert.equal(digest(clone.tiles),sig);assert.notEqual(closeViewStatic(clone).theme,st.theme);assert.ok(st.verts<60000);
  const base=g.map.building.base;assert.equal(routingKeepAppearance(base,4),null);assert.equal(routingKeepAppearance(base.replace(':keep:',':hive:'),5),null);
  for(let floor=1;floor<=g.map.building.floors;floor++)assert.deepEqual(generateBuildingFloor(seed,`${base}:f${floor}`,5).building.appearance,g.map.building.appearance);
  const out=g.map.objects.find(o=>o.kind==='exit');assert.ok(act(g,out).ok);
  const ext=g.map.objects.find(o=>o.kind==='greatBuilding');assert.deepEqual(ext.appearance,{version:1,kind:'biomechanical-keep'});const terrain=digest(g.map.tiles);
  const colors=new Set(),ctx=new Proxy({canvas:{width:390,height:844},measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{if(k==='fillStyle')colors.add(v);o[k]=v;return true;}});
  render(ctx,g,390,844,1000);assert.ok(colors.has('#353e37'),'actual block-structure roof palette is painted');assert.ok(colors.has('#454e45'),'actual facade palette is painted');
  assert.equal(digest(g.map.tiles),terrain);g.loadArea('overworld',false);assert.deepEqual(g.map.objects.find(o=>o.kind==='greatBuilding').appearance,ext.appearance);
  const recreated=fixture('keep-biomechanical',seed);assert.equal(digest(recreated.game.map.tiles),sig);
});


test('real key, sigil, plate, lever and trial gates preserve refused/open/travel ordering',()=>{
  const f=fixture('pentagon'),g=f.game,site=f.diagnostics.routing.site,p=pentagonPlan(f.seed,site.cx,site.cy,10);
  const H=g.save.consequences.dungeons[`${p.base}:f1`];
  const find=predicate=>{for(const n of p.nodes){const m=generatePentagonChamber(f.seed,`${p.base}:f${n.n+1}`),o=m.objects.find(predicate);if(o){load(g,m.id);return g.map.objects.find(q=>q.id===o.id);}}throw new Error('missing gate witness');};
  let door=find(o=>o.kind==='buildingStair'&&o.lock&&!o.sigil&&!o.barred);assert.equal(act(g,door).ok,false);H.labKeys=[door.lock];assert.ok(act(g,door).ok);
  door=find(o=>o.kind==='buildingStair'&&o.sigil&&!o.bossGate&&!o.plateLock&&!o.barred);H.pentSigil=false;H.pentOpened=[];
  const sigilArea=g.areaId();assert.equal(act(g,door).ok,false);H.pentSigil=true;assert.ok(act(g,door).ok);assert.equal(g.areaId(),sigilArea,'first Seal use opens without travel');assert.ok(act(g,door).ok);assert.notEqual(g.areaId(),sigilArea);
  door=find(o=>o.plateLock);H.labOpen=[];assert.equal(act(g,door).ok,false);const plate=g.map.tiles.find(t=>t.plate);assert.ok(plate);
  g.save.materials.stone=100;setBuildKind(g.save,'stone');assert.ok(g.buildAt(plate.x+.5,plate.y+.5).ok,'real stone build holds the existing plate');const plateNode=g.map.building.node;assert.ok(act(g,door).ok);assert.ok(H.labOpen.includes(`plate:${plateNode}`));
  door=find(o=>o.kind==='exit'&&o.gate==='levers');H.pentLevers=[];assert.equal(act(g,door).ok,false);const gateId=g.areaId(),gateObjectId=door.id;
  for(let i=0;i<p.levers.length;i++){
    const lever=p.levers[i];g.rx=site.cx-1+Math.floor(lever.gx/32);g.ry=site.cy-1+Math.floor(lever.gy/32);g.loadArea('overworld',false);
    const actual=g.map.objects.find(o=>o.kind==='pentLever'&&o.lever===lever.f);assert.ok(actual);assert.ok(act(g,actual).ok);
    load(g,gateId);door=g.map.objects.find(o=>o.id===gateObjectId);assert.equal(act(g,door).ok,i===p.levers.length-1,'only the complete real lever set opens its gate');
  }
  H.pentTrials=[];const entrance=p.world.find(w=>w.key==='heart');
  const enterHeart=()=>{g.rx=site.cx-1+Math.floor(entrance.door.gx/32);g.ry=site.cy-1+Math.floor(entrance.door.gy/32);g.loadArea('overworld',false);return act(g,g.map.objects.find(o=>o.id==='pent-heart'));};
  assert.equal(enterHeart().ok,false);
  for(let i=0;i<p.trials.length;i++){const n=p.nodes.find(n=>n.id===p.trials[i]);load(g,`${p.base}:f${n.n+1}`);clearFoes(g);assert.equal(enterHeart().ok,i===p.trials.length-1,'each real trial must clear all its guards');}
  assert.equal(H.pentTrials.length,PENTAGON.trials);
});


test('existing deep-side shortcuts retain opening direction and stay open after isolated scratch resume',()=>{
  const f=fixture('pentagon'),g=f.game,site=f.diagnostics.routing.site,p=pentagonPlan(f.seed,site.cx,site.cy,10),link=p.links[0],near=p.nodes.find(n=>n.id===link.near),deep=p.nodes.find(n=>n.id===link.deep);
  load(g,`${p.base}:f${near.n+1}`);let end=g.map.objects.find(o=>o.kind==='pentShortcut'&&o.link===link.id);assert.ok(end);assert.equal(act(g,end).ok,false);
  load(g,`${p.base}:f${deep.n+1}`);end=g.map.objects.find(o=>o.kind==='pentShortcut'&&o.link===link.id);assert.ok(end);assert.ok(act(g,end).ok);assert.equal(g.map.building.node,near.n);
  const snapshot=deserializeSave(serializeSave(g.exportSnapshot(1000))),restored=restoreRoomRoutingFixture(f,snapshot,6000).game;
  end=restored.map.objects.find(o=>o.kind==='pentShortcut'&&o.link===link.id);assert.ok(act(restored,end).ok);assert.equal(restored.map.building.node,deep.n);
  assert.ok(restored.save.consequences.dungeons[`${p.base}:f1`].labOpen.includes(`link:${link.id}`));
});
