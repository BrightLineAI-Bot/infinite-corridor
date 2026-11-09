import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture, labReport, scenariosForLab } from '../src/proving-ground-labs.ts';
import { Game } from '../src/game.ts';
import { deserializeSave, serializeSave } from '../src/save-codec.ts';

const input=(x,y)=>({state:{x,y},held:()=>false,consume:()=>false});
function cross(fixture){const g=fixture.game,S=fixture.adoptionSpec,I=input(0,S.dy);for(let i=0;i<80&&g.ry===S.start.ry;i++)g.update(.05,I,1000+i*50);assert.deepEqual([g.rx,g.ry],[S.destination.rx,S.destination.ry]);return g;}

test('pinned Pentagon clearance keeps original placement and the v10 namespace across resume', () => {
  const fixture = createLabFixture({lab:'close-view', scenario:'routing-pentagon-candidate', seed:'CINDER-VERGE-47', now:1000});
  const original = fixture.game.exportSnapshot(1000);
  const historyKey = `${fixture.game.map.building.base}:f1`;
  assert.equal(original.consequences.dungeons[historyKey].roomPaddingVersion, undefined);
  const load = (pin) => {
    const save = structuredClone(original);
    if (pin !== undefined) save.consequences.dungeons[historyKey].roomPaddingVersion = pin;
    return new Game(save, 2000);
  };
  const reference = load(undefined), padded = load(1), future = load(12);
  const {tiles: originalTiles, ...originalMap} = reference.map;
  const {tiles: paddedTiles, ...paddedMap} = padded.map;
  assert.deepEqual(paddedMap, originalMap);
  assert.deepEqual(padded.enemies, reference.enemies);
  assert.deepEqual(future.map, reference.map);
  assert.equal(future.save.consequences.dungeons[historyKey].roomPaddingVersion, 12);
  const changed = paddedTiles.filter((tile, index) => tile.blocked !== originalTiles[index].blocked);
  assert.equal(changed.length, 3);
  const {x,y} = changed[1];
  Object.assign(padded.player, {x,y});
  const resumed = new Game(deserializeSave(serializeSave(padded.exportSnapshot(2000))), 3000);
  assert.deepEqual(resumed.map.tiles, paddedTiles);
  assert.deepEqual([resumed.player.x, resumed.player.y], [x,y]);
  assert.equal(resumed.areaId(), fixture.game.areaId());
  assert.equal(resumed.map.building.V, 10);
});

test('an atlas-free old Pentagon chamber prevents padding adoption in a new exterior section', () => {
  const fixture = createLabFixture({lab:'close-view', scenario:'routing-adoption-new-pentagon', now:1000});
  const {cx,cy} = fixture.adoptionSpec.centre;
  const key = `pentagon:${fixture.seed}:${cx}:${cy}:v10:f2`;
  const oldRecord = {generatorVersion:5, futureCanary:{retained:true}};
  fixture.save.consequences.dungeons[key] = oldRecord;
  cross(fixture);
  const report = labReport(fixture).diagnostics.routingAdoption;
  assert.equal(report.actual.version, 10);
  assert.equal(report.actual.roomPaddingPin, null);
  assert.deepEqual(fixture.save.consequences.dungeons[key], oldRecord);
});

test('routing adoption scratch scenarios start on an actual open boundary and do not preload their destination',()=>{
  const ids=scenariosForLab('close-view').map(q=>q.id);assert.ok(ids.includes('routing-adoption-new-keep'));assert.ok(ids.includes('routing-adoption-new-pentagon'));
  for(const id of ['routing-adoption-new-keep','routing-adoption-new-pentagon']){const f=createLabFixture({lab:'close-view',scenario:id,seed:'IGNORED',now:1000}),{game:g,adoptionSpec:S}=f,t=g.map.tiles[Math.round(f.primary.y)*32+Math.round(f.primary.x)];
    assert.equal(f.seed,'ROUTING0');assert.deepEqual([g.rx,g.ry],[S.start.rx,S.start.ry]);assert.ok(t&&!t.blocked&&!t.hole);assert.equal(g.save.atlas?.[`${S.destination.rx},${S.destination.ry}`],undefined);assert.equal(g.save.session.areas?.[`overworld:${S.destination.rx}:${S.destination.ry}:g${g.save.worldGeneration}`],undefined);
    assert.deepEqual(labReport(f).diagnostics.routingAdoption.protectedRecord,{generatorVersion:77,layoutVersion:66,futureCanary:{kept:true}});
  }
});

test('normal movement crossing creates the fresh keep and Pentagon through production selectors with bounded live receipts',()=>{
  for(const [id,family,version] of [['routing-adoption-new-keep','keep',5],['routing-adoption-new-pentagon','pentagon',10]]){const f=createLabFixture({lab:'close-view',scenario:id,now:1000}),g=cross(f),R=labReport(f).diagnostics.routingAdoption;
    assert.equal(R.phase,'destination');assert.equal(R.target.family,family);assert.equal(R.actual.version,version);assert.equal(R.actual.roomPaddingPin,1);assert.ok(R.actual.base);assert.ok(R.actual.door);assert.deepEqual(R.protectedRecord,{generatorVersion:77,layoutVersion:66,futureCanary:{kept:true}});
    if(family==='keep')assert.equal(g.save.consequences.dungeons[`${R.actual.base}:f1`].interiorVersion,5);else assert.equal(g.save.atlas[`${g.rx},${g.ry}`].pentVersion,10);
    assert.equal(g.save.consequences.dungeons[`${R.actual.base}:f1`].roomPaddingVersion,1);
    const door=g.map.objects.find(o=>o.id===R.actual.door);assert.ok(door);g.player.x=door.x;g.player.y=door.y;assert.equal(g.interact('enter',door.id).ok,true);assert.equal(g.area,'dungeon');let inside=labReport(f).diagnostics.routingAdoption;assert.equal(inside.phase,'interior');assert.equal(inside.actual.base,g.map.building.base);assert.equal(inside.actual.version,version);assert.equal(inside.actual.interiorPin,family==='keep'?5:null);assert.ok(g.leaveDungeon());assert.deepEqual([g.rx,g.ry],[f.adoptionSpec.destination.rx,f.adoptionSpec.destination.ry]);const returned=labReport(f).diagnostics.routingAdoption;assert.equal(returned.phase,'destination');assert.equal(returned.actual.version,version);const doorAgain=g.map.objects.find(o=>o.id===R.actual.door);g.player.x=doorAgain.x;g.player.y=doorAgain.y;assert.equal(g.interact('enter',doorAgain.id).ok,true);inside=labReport(f).diagnostics.routingAdoption;assert.equal(inside.phase,'interior');assert.equal(inside.actual.version,version);
  }
});
