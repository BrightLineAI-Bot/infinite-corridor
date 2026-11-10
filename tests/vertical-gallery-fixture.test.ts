import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { interiorSurfaceHeight } from '../src/landscape.ts';
import { interiorMap } from '../src/close-view.ts';

const seed='CINDER-VERGE-47';
const options={lab:'close-view',seed,now:1000};
const signature=map=>JSON.stringify([map.tiles,map.objects,map.building,map.hall]);

for(const family of ['keep','pentagon'])test(`${family} scratch gallery has an ordinary ascent, two branches and a high return loop`,()=>{
  const vanilla=family==='keep'?'building':'grand-hall';
  const original=signature(createLabFixture({...options,scenario:vanilla}).game.map);
  const scenario=`vertical-gallery-${family}`;
  const {game:g,diagnostics}=createLabFixture({...options,scenario}),q=diagnostics.verticalGallery;
  assert.ok(q.found&&interiorMap(g.map));assert.equal(q.requiredDrone,false);
  assert.equal(q.elevationCap,5);assert.equal(g.map.hall.ceiling,'skylit');
  assert.ok(q.sharedVolume.safeFloor);
  assert.equal(g.map.murals.length,3);
  assert.ok(g.map.tiles.some(t=>t.gallerySpace==='sunken-floor'&&!t.blocked&&t.elev===2));
  assert.deepEqual(q.boostSpur.map(t=>t.elev),[1,2,3,4,5]);
  const [west,east]=q.branches.map(r=>r.endpoint);
  const {from,to}=q.returnLoop.northBridge,entry=q.entry,landingY=g.map.height-11;
  const hp=g.player.hp;let now=1000;
  const walk=(x,y)=>{
    for(let i=0;i<350;i++){
      const dx=x-g.player.x,dy=y-g.player.y,len=Math.hypot(dx,dy);
      if(len<.17)return;
      g.update(.025,{state:{x:dx/len,y:dy/len},consume:()=>false,held:()=>false},now+=25);
    }
    assert.fail(`unreachable ${x},${y} from ${g.player.x},${g.player.y}`);
  };
  walk(entry.x,landingY);
  assert.ok(interiorSurfaceHeight(g.map,g.player.x+.5,g.player.y+.75)>1.6);
  walk(from.x,landingY);walk(from.x,west.y);walk(west.x,west.y);
  walk(from.x,west.y);walk(from.x,from.y);walk(to.x,to.y);
  walk(to.x,east.y);walk(east.x,east.y);
  walk(to.x,east.y);walk(to.x,landingY);walk(entry.x,landingY);walk(entry.x,entry.y);
  assert.equal(g.player.hp,hp);assert.equal(g.droneUp(),false);
  assert.equal(signature(createLabFixture({...options,scenario:vanilla}).game.map),original);
});
