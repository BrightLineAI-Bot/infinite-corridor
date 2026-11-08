import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, adoptRoutingKeep, applyRoutingKeepAppearance, recoverPentagonVersion } from '../src/game.ts';
import { BUILDINGS, buildingHere } from '../src/great-buildings.ts';
import { sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { pentagonPlan } from '../src/pentagon.ts';

const keepMap = (seed='ADOPT', rx=12, ry=-4, floors=3) => ({
  greatBuilding:{ id:`great-building-${rx}-${ry}`, base:`building:${seed}:${rx}:${ry}:keep:${floors}`, style:'keep', floors },
  objects:[{ id:`great-building-${rx}-${ry}`, kind:'greatBuilding' }]
});

test('standalone keep adoption pins only an inert, newly placed family and reconstructs appearance from its explicit pin', () => {
  const s=freshSave(); s.seed='ADOPT'; const m=keepMap();
  assert.equal(adoptRoutingKeep(s,m,12,-4,null),true);
  assert.equal(s.consequences.dungeons['building:ADOPT:12:-4:keep:3:f1'].interiorVersion,5);
  const appearance=applyRoutingKeepAppearance(s,m);
  assert.deepEqual(m.greatBuilding.appearance,appearance||undefined);

  for(const mutate of [
    s=>{(s.atlas||={})['12,-4']={buildingVersion:BUILDINGS.version}},
    s=>{s.session.areas['overworld:12:-4:g1']={}},
    s=>{s.session.areas['building:ADOPT:12:-4:keep:3:f2']={}},
    s=>{s.session.activeDungeonId='building:ADOPT:12:-4:keep:3:f2'},
    s=>{s.consequences.dungeons['building:ADOPT:12:-4:keep:3:f1']={discovered:true}},
    s=>{s.consequences.dungeons['building:ADOPT:12:-4:keep:3:f2']={}},
    s=>{s.consequences.dungeons['building:ADOPT:12:-4:keep:3:f1']={futureField:1}},
  ]){const q=freshSave();q.seed='ADOPT';mutate(q);assert.equal(adoptRoutingKeep(q,keepMap(),12,-4,q.atlas?.['12,-4']),false);}
});

test('ordinary fresh production placement adopts only a standalone keep and leaves global default four', () => {
  const seed='ROUTING-ADOPTION'; let at=null;
  for(let d=BUILDINGS.minRing;d<60&&!at;d++)for(let x=-d;x<=d&&!at;x++)for(const y of [d-Math.abs(x),Math.abs(x)-d]){const p=buildingHere(seed,x,y,sectionRegion(seed,x,y,LANDSCAPE_VERSION));if(p?.style==='keep')at={x,y};}
  assert.ok(at); const s=freshSave();s.seed=seed;const g=new Game(s,0);g.rx=at.x;g.ry=at.y;g.loadArea('overworld',false);
  if(g.map.greatBuilding?.style==='keep') assert.equal(s.consequences.dungeons[`${g.map.greatBuilding.base}:f1`]?.interiorVersion,5);
  assert.equal(BUILDINGS.interior.version,4);
});

test('Pentagon selection keeps atlas first, restores one namespace, adopts ten, and falls back to nine on conflict', () => {
  const s=freshSave();s.seed='PENT-ADOPT';
  assert.equal(recoverPentagonVersion(s,20,0),10,'wholly new eligible namespace');
  s.consequences.dungeons['pentagon:PENT-ADOPT:20:0:v8:f1']={pentComplete:true};
  assert.equal(recoverPentagonVersion(s,20,0),8);
  s.session.activeDungeonId='pentagon:PENT-ADOPT:20:0:v8:f3';
  assert.equal(recoverPentagonVersion(s,20,0),8,'agreeing active identity');
  s.consequences.dungeons['pentagon:PENT-ADOPT:20:0:v7:f1']={pentComplete:true};
  assert.equal(recoverPentagonVersion(s,20,0),9,'ambiguous old state preserves r843 fallback');
  (s.atlas||={})['19,0']={pentVersion:7};s.atlas['20,0']={pentVersion:8};
  assert.equal(recoverPentagonVersion(s,20,0),7,'nine-cell atlas minimum is authoritative');
  assert.equal(s.consequences.dungeons['pentagon:PENT-ADOPT:20:0:v8:f1'].pentComplete,true,'no history rewrite');
  assert.ok(!s.consequences.dungeons['pentagon:PENT-ADOPT:20:0:v10:f1'],'no new reward namespace');
  const future=freshSave();future.seed='PENT-ADOPT';future.session.activeDungeonId='pentagon:PENT-ADOPT:20:0:v11:f1';assert.equal(recoverPentagonVersion(future,20,0),9);
  future.session.activeDungeonId='pentagon:PENT-ADOPT:20:0:v1:f3';assert.equal(recoverPentagonVersion(future,20,0),9);
  future.session.activeDungeonId='pentagon:PENT-ADOPT:20:80:v11:f1';assert.equal(recoverPentagonVersion(future,20,8),10,'another centre is not relevant by prefix');
  future.session.activeDungeonId=null;future.consequences.dungeons['pentagon:PENT-ADOPT:20:8:v8:f1']=null;assert.equal(recoverPentagonVersion(future,20,8),9,'malformed supported canonical record');
});

test('failed or absent Pentagon placement pins literal legacy nine, never the candidate selector', () => {
  const s=freshSave();s.seed='NO-PENTAGON';const g=new Game(s,0);g.loadArea('overworld',false);assert.equal(g.map.pentagon,undefined);assert.equal(s.atlas['0,0'].pentVersion,9);
});

test('atlas-free v8/v9 active chambers survive ordinary serialization, exit, another section, and re-entry without v10 state', () => {
  for(const V of [8,9]){
    const seed=`PENT-RESTORE-${V}`, fixed=V===8?{rx:-33,ry:-25,cx:-32,cy:-24}:{rx:-33,ry:7,cx:-32,cy:8}, centre={cx:fixed.cx,cy:fixed.cy},site={rx:fixed.rx,ry:fixed.ry};
    assert.ok(centre);const P=pentagonPlan(seed,centre.cx,centre.cy,V),s=freshSave();s.seed=seed;
    s.consequences.dungeons[`${P.base}:f1`]={discovered:true,visits:2,pentArena:1,pentFinale:1,pentComplete:`${P.base}:complete`,futureCanary:{kept:true}};
    s.session.activeDungeonId=`${P.base}:f2`;s.session.dungeonReturn={...site,x:16,y:16};
    let g=new Game(deserializeSave(serializeSave(s)),0);g.loadArea('dungeon',false);assert.equal(g.map.building.base,P.base);assert.equal(g.leaveDungeon(),true);assert.equal(g.map.pentagon.V,V);
    const first=`${g.rx},${g.ry}`;g.rx=centre.cx+1;g.ry=centre.cy;g.loadArea('overworld',false);assert.equal(g.map.pentagon.V,V);g.rx=centre.cx;g.ry=centre.cy;g.loadArea('overworld',false);
    const door=g.map.objects.find(o=>o.pentagonDoor);assert.ok(door);g.player.x=door.x;g.player.y=door.y;assert.equal(g.interact('enter',door.id).ok,true);assert.equal(g.map.building.base,P.base);
    g=new Game(deserializeSave(serializeSave(g.save)),0);assert.equal(g.map.building.base,P.base);assert.deepEqual(g.save.consequences.dungeons[`${P.base}:f1`].futureCanary,{kept:true});
    assert.ok(!Object.keys(g.save.consequences.dungeons).some(id=>id.startsWith(`pentagon:${seed}:${centre.cx}:${centre.cy}:v10`)));assert.equal(g.save.atlas[first].pentVersion,V);
  }
});
