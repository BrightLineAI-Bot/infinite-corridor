import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture, labReport, scenariosForLab } from '../src/proving-ground-labs.ts';

const input=(x,y)=>({state:{x,y},held:()=>false,consume:()=>false});
function cross(fixture){const g=fixture.game,S=fixture.adoptionSpec,I=input(0,S.dy);for(let i=0;i<80&&g.ry===S.start.ry;i++)g.update(.05,I,1000+i*50);assert.deepEqual([g.rx,g.ry],[S.destination.rx,S.destination.ry]);return g;}

test('routing adoption scratch scenarios start on an actual open boundary and do not preload their destination',()=>{
  const ids=scenariosForLab('close-view').map(q=>q.id);assert.ok(ids.includes('routing-adoption-new-keep'));assert.ok(ids.includes('routing-adoption-new-pentagon'));
  for(const id of ['routing-adoption-new-keep','routing-adoption-new-pentagon']){const f=createLabFixture({lab:'close-view',scenario:id,seed:'IGNORED',now:1000}),{game:g,adoptionSpec:S}=f,t=g.map.tiles[Math.round(f.primary.y)*32+Math.round(f.primary.x)];
    assert.equal(f.seed,'ROUTING0');assert.deepEqual([g.rx,g.ry],[S.start.rx,S.start.ry]);assert.ok(t&&!t.blocked&&!t.hole);assert.equal(g.save.atlas?.[`${S.destination.rx},${S.destination.ry}`],undefined);assert.equal(g.save.session.areas?.[`overworld:${S.destination.rx}:${S.destination.ry}:g${g.save.worldGeneration}`],undefined);
    assert.deepEqual(labReport(f).diagnostics.routingAdoption.protectedRecord,{generatorVersion:77,layoutVersion:66,futureCanary:{kept:true}});
  }
});

test('normal movement crossing creates the fresh keep and Pentagon through production selectors with bounded live receipts',()=>{
  for(const [id,family,version] of [['routing-adoption-new-keep','keep',5],['routing-adoption-new-pentagon','pentagon',10]]){const f=createLabFixture({lab:'close-view',scenario:id,now:1000}),g=cross(f),R=labReport(f).diagnostics.routingAdoption;
    assert.equal(R.phase,'destination');assert.equal(R.target.family,family);assert.equal(R.actual.version,version);assert.ok(R.actual.base);assert.ok(R.actual.door);assert.deepEqual(R.protectedRecord,{generatorVersion:77,layoutVersion:66,futureCanary:{kept:true}});
    if(family==='keep')assert.equal(g.save.consequences.dungeons[`${R.actual.base}:f1`].interiorVersion,5);else assert.equal(g.save.atlas[`${g.rx},${g.ry}`].pentVersion,10);
    const door=g.map.objects.find(o=>o.id===R.actual.door);assert.ok(door);g.player.x=door.x;g.player.y=door.y;assert.equal(g.interact('enter',door.id).ok,true);assert.equal(g.area,'dungeon');assert.ok(g.leaveDungeon());assert.deepEqual([g.rx,g.ry],[f.adoptionSpec.destination.rx,f.adoptionSpec.destination.ry]);
  }
});
