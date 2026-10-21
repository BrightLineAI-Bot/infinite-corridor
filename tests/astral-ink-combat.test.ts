import test from 'node:test';
import assert from 'node:assert/strict';
import { ASTRAL, ASTRAL_GEOMETRY, ASTRAL_MOVES, ASTRAL_INK_FORMS, createAstralState, startAstralMove, tickAstral, snapshotAstral, endAstral, astralBeamAnchors, updateAstralActor } from '../src/astral-worm.ts';
import { createCombatant } from '../src/combat.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
const moves=Object.keys(ASTRAL_INK_FORMS), frame=1/60;
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
function world() {
  const w={player:{x:3,y:0,hp:10000},canOccupy:()=>true,hits:[],damagePlayer:(amount,source)=>{
    const actual=Math.min(w.player.hp,amount);w.player.hp-=actual;w.hits.push({amount,source});return actual;
  }};
  return w;
}
function advance(s,seconds,w) { for(let i=0;i<Math.round(seconds/frame);i++)tickAstral(s,frame,w); }
function fixture(move='inkWorm') {
  const save=freshSave();save.seed='ASTRAL-INK-COMBAT';save.maxHp=10000;
  const g=new Game(save,0),width=32;
  save.session.activeDungeonId='dungeon:ASTRAL-INK-COMBAT:g1:5:5:ink';
  const map={width,height:width,entry:{x:3,y:3},objects:[],enemySpawns:[],tiles:Array.from({length:width*width},(_,i)=>({x:i%width,y:Math.floor(i/width),kind:'floor',blocked:false,elev:0}))};
  Object.assign(g,{area:'dungeon',rx:5,ry:5,map,enemies:[],effects:[],projectiles:[],packEffects:[],paused:false,seaHazards:null,storm:null});
  Object.assign(g.player,{x:13,y:10,hp:10000,invulnerableUntil:0,dodgeUntil:0});
  const e=createCombatant('astralWorm',10,10,false,[]);Object.assign(e,{id:'ink-owner',astralMountFixture:true,aggro:true,hp:713,maxHp:1400,damage:60});
  e.astral=createAstralState({x:e.x,y:e.y,hp:e.maxHp,damage:e.damage,namespace:e.id});e.astral.hp=e.hp;
  g.enemies=[e];startAstralMove(e.astral,move,g.player);
  return {g,e};
}
function advanceActor(g,e,seconds,start=0) { for(let i=0;i<Math.round(seconds/frame);i++)updateAstralActor(e,g.packWorld(frame,start+(i+1)*1000*frame)); }

test('three explicit ink variants are naturally selectable and retain the requested silhouettes',()=>{
  assert.deepEqual(moves,['inkWorm','inkPool','inkTrample']);assert.equal(ASTRAL.inkCount,3);
  for(const move of moves){
    assert.ok(ASTRAL_MOVES.includes(move));const s=createAstralState(),w=world();s.hp=713;
    assert.equal(startAstralMove(s,move,w.player),true);assert.equal(s.form,ASTRAL_INK_FORMS[move]);
    assert.equal(s.blobs.length,3);assert.equal(new Set(s.blobs.map(b=>b.id)).size,3);assert.equal(s.clones.length,0);assert.equal(s.hp,713);
  }
  const seen=new Set();for(let i=0;i<100;i++){
    const s=createAstralState({seed:Math.imul(i,2654435761)>>>0}),w=world();s.recovery=0;tickAstral(s,frame,w);seen.add(s.move);
    if(ASTRAL_INK_FORMS[s.move])assert.equal(s.form,ASTRAL_INK_FORMS[s.move]);
  }
  for(const move of moves)assert.ok(seen.has(move),`${move} was not naturally selected`);
});

test('each ink variant has a finite warned outbound, brief slight splat spread and harmless shrinking recall',()=>{
  for(const move of moves){
    const s=createAstralState(),w=world();s.hp=713;startAstralMove(s,move,w.player);
    const phases=[],radius=[],targets=snapshotAstral(s.blobs.map(b=>b.target));let steps=0,seenRecall=false;
    while(s.move&&steps++<300){
      const before=w.player.hp;tickAstral(s,frame,w);if(!s.move)break;
      assert.equal(s.form,ASTRAL_INK_FORMS[move]);assert.equal(s.blobs.length,3);assert.equal(s.clones.length,0);assert.ok(s.hazards.length<=3);
      assert.deepEqual(s.blobs.map(b=>b.target),targets);assert.equal(s.hp,713);assert.equal(s.maxHp,1400);
      const phase=s.blobs[0].phase;if(phases.at(-1)!==phase)phases.push(phase);
      for(const b of s.blobs){assert.equal(b.phase,phase);assert.ok(Number.isFinite(b.x+b.y+b.radius+b.height));assert.ok(b.progress>=0&&b.progress<=1);}
      if(phase!=='splat'){assert.equal(w.player.hp,before);assert.ok(s.hazards.every(h=>!h.active));}
      if(phase==='splat'){assert.ok(s.hazards.every(h=>h.active));radius.push(s.blobs[0].radius);assert.ok(s.blobs.every(b=>b.height===0));}
      if(phase==='recall'){seenRecall=true;assert.equal(s.hazards.length,0);assert.ok(s.blobs.every(b=>b.radius<ASTRAL.inkRadius+ASTRAL.inkSpread));}
    }
    assert.deepEqual(phases,['warning','outbound','splat','recall']);assert.ok(seenRecall);assert.ok(radius.at(-1)>radius[0]);
    assert.ok(radius.at(-1)<=ASTRAL.inkRadius+ASTRAL.inkSpread);assert.equal(s.move,null);assert.equal(s.form,'worm');assert.deepEqual(s.blobs,[]);assert.deepEqual(s.hazards,[]);assert.ok(w.player.hp<10000);
  }
});

test('ink targets are range-bounded and locked before a player dodge, not homing splats',()=>{
  const s=createAstralState(),w=world();w.player={x:100,y:100,hp:10000};startAstralMove(s,'inkWorm',w.player);
  const targets=snapshotAstral(s.blobs.map(b=>b.target));for(const b of s.blobs)close(Math.hypot(b.target.x-b.origin.x,b.target.y-b.origin.y),ASTRAL.inkRange);
  w.player.x=-50;w.player.y=-50;advance(s,1.5,w);assert.deepEqual(s.blobs.map(b=>b.target),targets);assert.equal(w.player.hp,10000);
});

test('ink warning, flight, splat and recall preserve exact JSON resume and paused/unloaded state',()=>{
  for(const move of moves)for(const elapsed of [.3,.85,1.4,2]){
    const s=createAstralState({seed:298}),w=world();startAstralMove(s,move,w.player);advance(s,elapsed,w);
    const expected=snapshotAstral(s);for(const flag of ['paused','unloaded']){w[flag]=true;tickAstral(s,.25,w);assert.deepEqual(s,expected);w[flag]=false;}
    const restored=snapshotAstral(s),w2=world();w2.player={...w.player};advance(s,.5,w);advance(restored,.5,w2);assert.deepEqual(restored,s);assert.deepEqual(w2.player,w.player);
  }
});

test('blocked ink is collision-tested before damage and never creates a hidden live splat',()=>{
  const s=createAstralState(),w=world();startAstralMove(s,'inkWorm',w.player);let checks=0;
  w.canBlobOccupy=()=>{checks++;return false;};advance(s,1.5,w);
  assert.ok(checks>=3);assert.equal(s.blobs.length,3);assert.ok(s.blobs.every(b=>b.blocked));assert.deepEqual(s.hazards,[]);assert.equal(w.player.hp,10000);
  advance(s,1,w);assert.deepEqual(s.blobs,[]);assert.equal(w.player.hp,10000);
});

test('ink revalidates newly blocked landing and splash-to-player collision before each active hit',()=>{
  for(const veto of ['landing','splash']){
    const s=createAstralState(),w=world();startAstralMove(s,'inkPool',w.player);
    let checks=0;w.canBlobOccupy=()=>{checks++;return veto!=='landing'||s.elapsed<ASTRAL.inkWarning+ASTRAL.inkOutbound;};
    w.canHazardHit=()=>veto!=='splash';advance(s,1.7,w);assert.ok(checks>3);assert.equal(w.player.hp,10000);
    if(veto==='landing')assert.ok(s.blobs.every(b=>b.blocked));else assert.ok(s.hazards.some(h=>h.active));
  }
});

test('overlapping ink splats use one ordinary shared hit cadence and never heal',()=>{
  const s=createAstralState(),w=world();s.hp=100;startAstralMove(s,'inkTrample',w.player);
  for(const b of s.blobs)b.target={...s.target};const times=[];w.damagePlayer=amount=>{times.push(s.elapsed);w.player.hp-=amount;return amount;};
  advance(s,2.25,w);assert.ok(times.length>0&&times.length<=3);for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=ASTRAL.hitGap-1e-9);
  assert.equal(s.hp,100);assert.equal(w.player.hp,10000-times.length*s.damage*ASTRAL.inkShare);
});

test('ink descriptors and hazards clear on death, cancellation, replacement cast and owner retreat',()=>{
  for(const reason of ['player','owner','end','replace']){
    const s=createAstralState(),w=world();startAstralMove(s,'inkPool',w.player);advance(s,.8,w);
    if(reason==='player')w.player.hp=0;if(reason==='owner')s.hp=0;
    if(reason==='end')endAstral(s);else if(reason==='replace')startAstralMove(s,'mirage',w.player);else tickAstral(s,frame,w);
    assert.deepEqual(s.blobs,[]);assert.deepEqual(s.hazards,[]);
  }
  const {g,e}=fixture();e.retreating=true;advanceActor(g,e,frame);assert.equal(e.astral.terminated,true);assert.deepEqual(e.astral.blobs,[]);
});

test('real Game damage honors dodge and invulnerability with no added actors, projectiles, rewards or healing',()=>{
  for(const protection of ['none','dodge','invulnerability']){
    const {g,e}=fixture('inkTrample'),rewards=JSON.stringify({currency:g.save.currency,xp:g.save.xp,echoes:g.save.echoes});
    if(protection==='dodge')g.player.dodgeUntil=5000;if(protection==='invulnerability')g.player.invulnerableUntil=5000;
    advanceActor(g,e,2.3);assert.equal(g.enemies.length,1);assert.equal(g.projectiles.length,0);assert.equal(e.hp,713);assert.equal(e.maxHp,1400);assert.deepEqual(e.astral.blobs,[]);
    assert.equal(JSON.stringify({currency:g.save.currency,xp:g.save.xp,echoes:g.save.echoes}),rewards);
    assert.equal(g.player.hp,protection==='none'?10000-e.damage*ASTRAL.inkShare:10000);
  }
});

test('real Game terrain collision blocks the outbound ink before it can hurt through a wall',()=>{
  const {g,e}=fixture();for(let y=0;y<32;y++)Object.assign(g.map.tiles[y*32+12],{kind:'wall',blocked:true});
  advanceActor(g,e,1.6);assert.equal(g.player.hp,10000);assert.ok(e.astral.blobs.every(b=>b.blocked));assert.deepEqual(e.astral.hazards,[]);
});

test('real Game snapshot and migration retain exact ink cast descriptors without replay or reward creation',()=>{
  for(const move of moves)for(const elapsed of [.3,.85,1.4,2]){
    const {g,e}=fixture(move);advanceActor(g,e,elapsed);g.setPaused(true,3000);
    const expected=snapshotAstral(e.astral),restored=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(3000)))),9000);
    const actor=restored.enemies.find(a=>a.id===e.id);assert.ok(actor);assert.equal(restored.paused,true);assert.deepEqual(actor.astral,expected);assert.equal(restored.enemies.filter(a=>a.id===e.id).length,1);assert.equal(restored.enemies.filter(a=>a.kind==='astralMirage').length,0);assert.equal(actor.hp,713);
  }
});

test('shared beam anchors match the scaled native mouth in both facing directions, never body center',()=>{
  for(const inputScale of [.3,.6,1,2])for(const facingX of [-1,1]){
    const scale=Math.max(.6,inputScale),s=createAstralState({x:5,y:7,scale:inputScale,facingX}),a=astralBeamAnchors(s),g=ASTRAL_GEOMETRY;
    close(a.ground.x,5+facingX*1.20*.65*scale);close(a.ground.y,7+.20);close(a.mouth.x,a.ground.x);
    close(a.mouth.y+g.groundProjectionY,7+g.bodyBaseY-g.flightLift*scale+g.mouthY*g.drawScale*scale);
    assert.notEqual(a.ground.x,s.x);assert.ok(a.mouth.y<a.ground.y);
  }
});

test('beam damages the actual mouth impact disk and not the old body-centered disk',()=>{
  for(const facingX of [-1,1]){
    const s=createAstralState({scale:2,facingX}),w=world();w.canOccupy=()=>false;w.player.x=facingX*3;startAstralMove(s,'flight',w.player);
    const at=astralBeamAnchors(s).ground;Object.assign(w.player,at);advance(s,.8,w);assert.ok(w.player.hp<10000);close(s.hazards[0].x,at.x);close(s.hazards[0].y,at.y);
    const before=w.player.hp;w.player.x=s.x;w.player.y=s.y;advance(s,.4,w);assert.equal(w.player.hp,before);assert.equal(s.facingX,facingX);
  }
});

test('flight pursuit aims the mouth endpoint at the player instead of parking the body over them',()=>{
  const s=createAstralState({scale:2}),w=world();w.player.x=2;startAstralMove(s,'flight',w.player);advance(s,1,w);
  const at=astralBeamAnchors(s).ground;close(at.x,w.player.x);close(at.y,w.player.y);assert.ok(w.player.hp<10000);assert.notEqual(s.x,w.player.x);
});

test('actor adapter freezes saved facing through a cast and synchronizes scaled mouth geometry',()=>{
  const {g,e}=fixture('flight');e.scale=1.75;e.facingX=-1;advanceActor(g,e,frame);
  assert.equal(e.astral.scale,e.scale);assert.equal(e.facingX,1);assert.equal(e.astral.facingX,1);
  g.player.x=e.x-4;advanceActor(g,e,.2,100);assert.equal(e.facingX,1);assert.equal(e.astral.facingX,1);
  const impact=astralBeamAnchors(e.astral).ground;close(e.astral.hazards[0].x,impact.x);close(e.astral.hazards[0].y,impact.y);
  e.astral.move=null;e.astral.recovery=2;advanceActor(g,e,frame,500);assert.equal(e.facingX,-1);assert.equal(e.astral.facingX,-1);
});

test('old saved states without additive geometry or blob fields preserve health, move and unknown state',()=>{
  const s=createAstralState({x:1,y:2}),w=world();startAstralMove(s,'flight',w.player);s.hp=712;s.custom={keep:'yes'};
  delete s.facingX;delete s.scale;delete s.blobs;const before=snapshotAstral(s);w.paused=true;tickAstral(s,.25,w);assert.deepEqual(s,before);
  w.paused=false;advance(s,.2,w);assert.equal(s.move,'flight');assert.equal(s.hp,712);assert.equal(s.facingX,1);assert.equal(s.scale,1);assert.deepEqual(s.blobs,[]);assert.deepEqual(s.custom,{keep:'yes'});
});

test('beam adds only the terrain clearance needed to keep its mouth above a higher ground endpoint',()=>{
  for(const scale of [.3,1,2]){
    const s=createAstralState({scale}),w=world();w.canOccupy=()=>false;w.groundHeight=(x)=>x>.2?2:0;
    startAstralMove(s,'flight',w.player);advance(s,.3,w);const at=astralBeamAnchors(s);
    const mouthScreenY=at.mouth.y-w.groundHeight(s.x,s.y),groundScreenY=at.ground.y-w.groundHeight(at.ground.x,at.ground.y);
    assert.ok(s.flightLiftExtra>0);close(groundScreenY-mouthScreenY,ASTRAL_GEOMETRY.minBeamDrop);
    const expected=snapshotAstral(s);w.paused=true;tickAstral(s,.25,w);assert.deepEqual(s,expected);w.paused=false;
    const restored=snapshotAstral(s),w2=world();w2.canOccupy=w.canOccupy;w2.groundHeight=w.groundHeight;advance(s,.3,w);advance(restored,.3,w2);assert.deepEqual(restored,s);
    w.groundHeight=()=>0;tickAstral(s,frame,w);assert.equal(s.flightLiftExtra,0);
    startAstralMove(s,'inkWorm',w.player);assert.equal(s.flightLiftExtra,0);
  }
});

test('ink absolute launch and return heights stay attached to body over differing local terrain',()=>{
  for(const move of moves){
    const s=createAstralState(),w=world();w.groundHeight=x=>x>.2?2:0;startAstralMove(s,move,w.player);
    advance(s,.3,w);for(const b of s.blobs){assert.equal(b.originGround,0);assert.equal(b.targetGround,2);close(b.height,b.originHeight-2);assert.ok(b.height<0);}
    advance(s,.55,w);for(const b of s.blobs){const absolute=b.height+w.groundHeight(b.x,b.y),p=b.progress;
      close(absolute,(b.originGround+b.originHeight)*(1-p)+b.targetGround*p+Math.sin(Math.PI*p)*ASTRAL.inkArc);}
    const saved=snapshotAstral(s),w2=world();w2.groundHeight=w.groundHeight;advance(s,.55,w);advance(saved,.55,w2);assert.deepEqual(saved,s);
    assert.ok(s.blobs.every(b=>b.height===0));advance(s,.6,w);
    for(const b of s.blobs){assert.equal(b.phase,'recall');assert.equal(b.returnGround,2);const absolute=b.height+w.groundHeight(b.x,b.y),p=b.progress;
      close(absolute,b.returnGround*(1-p)+(w.groundHeight(s.x,s.y)+b.originHeight)*p);}
    advance(s,.3,w);assert.deepEqual(s.blobs,[]);
  }
});

test('naturally selected flight clears higher ground on its first warning frame',()=>{
 const s=createAstralState({seed:200}),w=world();s.recovery=0;w.player={x:3,y:0,hp:1000};w.groundHeight=x=>x>.2?1.7:0;
 tickAstral(s,1/60,w);assert.equal(s.move,'flight');assert.equal(s.elapsed,0);assert.deepEqual(s.hazards,[]);const a=astralBeamAnchors(s);
 assert(s.flightLiftExtra>0);assert(a.ground.y-w.groundHeight(a.ground.x,a.ground.y)-(a.mouth.y-w.groundHeight(s.x,s.y))>=ASTRAL_GEOMETRY.minBeamDrop-1e-10);
});
