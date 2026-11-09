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
  assert.equal(s.consequences.dungeons['building:ADOPT:12:-4:keep:3:f1'].roomPaddingVersion,1);
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
  const explored=freshSave();explored.seed='ADOPT';explored.explored['12,-4']=true;assert.equal(adoptRoutingKeep(explored,keepMap(),12,-4,null),true);assert.equal(explored.consequences.dungeons['building:ADOPT:12:-4:keep:3:f1'].interiorVersion,5);assert.equal(explored.consequences.dungeons['building:ADOPT:12:-4:keep:3:f1'].roomPaddingVersion,undefined);
  const alternate=freshSave();alternate.seed='ADOPT';alternate.session.areas['building:ADOPT:12:-4:keep:4r:f2']={futureCanary:true};assert.equal(adoptRoutingKeep(alternate,keepMap(),12,-4,null),true);assert.equal(alternate.consequences.dungeons['building:ADOPT:12:-4:keep:3:f1'].interiorVersion,5);assert.equal(alternate.consequences.dungeons['building:ADOPT:12:-4:keep:3:f1'].roomPaddingVersion,undefined);
});

test('ordinary fresh production placement adopts only a standalone keep and leaves global default four', () => {
  const seed='ROUTING-ADOPTION'; let at=null;
  for(let d=BUILDINGS.minRing;d<60&&!at;d++)for(let x=-d;x<=d&&!at;x++)for(const y of [d-Math.abs(x),Math.abs(x)-d]){const p=buildingHere(seed,x,y,sectionRegion(seed,x,y,LANDSCAPE_VERSION));if(p?.style==='keep')at={x,y};}
  assert.ok(at); const s=freshSave();s.seed=seed;const g=new Game(s,0);g.rx=at.x;g.ry=at.y;g.loadArea('overworld',false);
  if(g.map.greatBuilding?.style==='keep') { const H=s.consequences.dungeons[`${g.map.greatBuilding.base}:f1`];assert.equal(H?.interiorVersion,5);assert.equal(H?.roomPaddingVersion,1); }
  assert.equal(BUILDINGS.interior.version,4);
});

test('a production-pinned keep pads only after the complete live load and resumes its exact open position', () => {
  const seed='ROUTING-ADOPTION',s=freshSave();s.seed=seed;let witness=null;
  for(let d=BUILDINGS.minRing;d<60&&!witness;d++)for(let x=-d;x<=d&&!witness;x++)for(const y of [d-Math.abs(x),Math.abs(x)-d]){if(buildingHere(seed,x,y,sectionRegion(seed,x,y,LANDSCAPE_VERSION))?.style!=='keep')continue;const exterior=new Game(structuredClone(s),0);exterior.rx=x;exterior.ry=y;exterior.loadArea('overworld',false);const door=exterior.map.objects.find(o=>o.buildingDoor&&/^building:.*:keep:/.test(o.dungeonId||''));if(!door)continue;const paddedSave=structuredClone(exterior.save),referenceSave=structuredClone(exterior.save),base=door.dungeonId.replace(/:f\d+$/,''),f1=`${base}:f1`;delete referenceSave.consequences.dungeons[f1].roomPaddingVersion;for(const q of [paddedSave,referenceSave])Object.assign(q.session,{activeDungeonId:door.dungeonId,dungeonReturn:{rx:x,ry:y,x:door.x,y:door.y},area:'dungeon'});const padded=new Game(paddedSave,1000),reference=new Game(referenceSave,1000);padded.loadArea('dungeon',false);reference.loadArea('dungeon',false);const changed=padded.map.tiles.flatMap((t,i)=>JSON.stringify(t)===JSON.stringify(reference.map.tiles[i])?[]:[i]);if(changed.length===3)witness={padded,reference,changed};}
  assert.ok(witness,'wanted an actual three-cell production padding footprint');const {padded,reference,changed}=witness,{tiles:pt,...pm}=padded.map,{tiles:rt,...rm}=reference.map;assert.deepEqual(pm,rm,'all objects, overlays and map metadata keep their base placement');assert.deepEqual(padded.enemies,reference.enemies);for(const i of changed){assert.equal(rt[i].blocked,true);assert.equal(pt[i].blocked,false);}
  const at=pt[changed[2]],occupied=pt[changed[0]];Object.assign(padded.player,{x:at.x,y:at.y});assert.ok(padded.enemies.length);Object.assign(padded.enemies[0],{x:occupied.x,y:occupied.y});const resumed=new Game(deserializeSave(serializeSave(padded.exportSnapshot(2000))),3000);assert.deepEqual([resumed.player.x,resumed.player.y],[at.x,at.y]);assert.equal(resumed.map.tiles[at.y*resumed.map.width+at.x].blocked,false);assert.equal(resumed.map.tiles[occupied.y*resumed.map.width+occupied.x].blocked,false,'a live enemy on the recess never turns its wall solid');
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
  const pinned=freshSave();pinned.seed='PENT-ADOPT';pinned.atlas={'8,8':{pentVersion:11}};assert.equal(recoverPentagonVersion(pinned,8,8),9,'future atlas pin preserves the legacy fallback');pinned.atlas['8,9']={pentVersion:6};assert.equal(recoverPentagonVersion(pinned,8,8),6,'a supported older pin remains the minimum');
});

test('failed or absent Pentagon placement pins literal legacy nine, never the candidate selector', () => {
  const s=freshSave();s.seed='NO-PENTAGON';const g=new Game(s,0);g.loadArea('overworld',false);assert.equal(g.map.pentagon,undefined);assert.equal(s.atlas['0,0'].pentVersion,9);
  const h=freshSave();let enumerations=0;h.consequences.dungeons=new Proxy(h.consequences.dungeons,{ownKeys(){enumerations++;throw new Error('ALL_HISTORY_SCAN')}});assert.equal(recoverPentagonVersion(h,8,8),10);assert.equal(enumerations,0);
  const q=freshSave();q.seed='TIM1';const forced=new Game(q,0);assert.equal(forced.pentagonHere(-64,-24),true);const note=forced.noteRegion.bind(forced);let installed=0;forced.noteRegion=(...args)=>{const r=note(...args);if(forced.rx===-64&&forced.ry===-24){forced.map.greatBuilding={id:'fixture-existing-building',style:'keep'};installed++;}return r;};forced.rx=-64;forced.ry=-24;forced.loadArea('overworld',false);assert.equal(installed,1);assert.equal(forced.map.pentagon,undefined);assert.equal(forced.map.greatBuilding.id,'fixture-existing-building');assert.equal(q.atlas['-64,-24'].pentVersion,9);
});

test('atlas-free v8/v9 partial and paid journeys survive real exit, another section, re-entry, and reload', () => {
  const seed='TIM1',cx=-64,cy=-24,reload=g=>new Game(deserializeSave(serializeSave(g.exportSnapshot(1000))),2000);
  for(const V of [8,9])for(const paid of [false,true]){const P=pentagonPlan(seed,cx,cy,V),entrance=P.world.find(w=>!w.toGate&&!w.sigil&&!w.exterior&&!w.balcony&&!w.sealed&&!w.gate&&P.nodes.some(n=>n.id===w.node&&n.kind==='outer'&&!n.hall)),n=P.nodes.find(n=>n.id===entrance.node),id=`${P.base}:f${n.n+1}`,rx=cx-1+Math.floor(entrance.door.gx/32),ry=cy-1+Math.floor(entrance.door.gy/32),s=freshSave();s.seed=seed;let g=new Game(s,1000);Object.assign(g,{rx,ry});Object.assign(s.session,{activeDungeonId:id,dungeonReturn:{rx,ry,x:16,y:16}});g.loadArea('dungeon',false);const H=s.consequences.dungeons[`${P.base}:f1`];assert.equal(H.roomPaddingVersion,undefined);H.pentRelics=[0];H.pentLevers=[0];if(paid){Object.assign(H,{pentFinale:1,pentArena:1,pentArenaWon:true});g.payPentagonComplete(P.base);}assert.equal(s.tesseracts.owned.length,paid?1:0);const owned=JSON.stringify(s.tesseracts.owned),got=JSON.stringify(s.tesseracts.got);g=reload(g);assert.equal(g.map.building.V,V);const exit=g.map.objects.find(o=>o.id===`building-exit-${entrance.key}`);g.player.x=exit.x;g.player.y=exit.y;assert.equal(g.interact('exit',exit.id).ok,true);assert.equal(g.map.pentagon.V,V);assert.equal(g.save.atlas[`${rx},${ry}`].pentVersion,V);g.rx=cx;g.ry=cy;g.loadArea('overworld',false);assert.equal(g.map.pentagon.V,V);g=reload(g);g.rx=rx;g.ry=ry;g.loadArea('overworld',false);const door=g.map.objects.find(o=>o.id===`pent-${entrance.key}`);g.player.x=door.x;g.player.y=door.y;assert.equal(g.interact('enter',door.id).ok,true);assert.equal(g.areaId(),id);g=reload(g);assert.equal(g.map.building.V,V);assert.equal(JSON.stringify(g.save.tesseracts.owned),owned);assert.equal(JSON.stringify(g.save.tesseracts.got),got);assert.deepEqual(g.save.consequences.dungeons[`${P.base}:f1`].pentLevers,[0]);assert.equal(g.save.consequences.dungeons[`${P.base}:f1`].roomPaddingVersion,undefined);assert.ok(!Object.keys(g.save.consequences.dungeons).some(k=>k.startsWith(`pentagon:${seed}:${cx}:${cy}:v10:`)));}
});
