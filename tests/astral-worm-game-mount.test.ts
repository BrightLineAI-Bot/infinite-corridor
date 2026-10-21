import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, walkerGroundPositionOpen } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { freshPackState } from '../src/monster-pack.ts';
import { createAstralState } from '../src/astral-worm.ts';
import { dismountAstralWalker } from '../src/astral-worm-mount.ts';
const input={state:{x:0,y:0},consume:()=>false};
function actors(g,x=12,y=12) {
  const owner=createCombatant('astralWorm',x,y,false,[]), rider=createCombatant('voidWalker',x+.5,y,false,[]);
  Object.assign(owner,{id:'mounted-worm',hp:1000,maxHp:1000,damage:10,aggro:true});
  owner.astral=createAstralState({x,y,hp:1000,damage:10,namespace:owner.id});owner.astral.recovery=1000;
  Object.assign(rider,{id:'mounted-walker',hp:500,maxHp:500,damage:10,aggro:true,packAttacks:['voidHand'],packBossAttacks:[]});
  rider.pack=freshPackState();rider.pack.gap=0;g.enemies=[owner,rider];
  assert.equal(g.mountAstralFixture(owner,rider),true);
  return {g,owner,rider};
}
function fixture(area='dungeon') {
  const save=freshSave();save.seed='ASTRAL-MOUNT-GAME';save.level=12;save.maxHp=10000;
  const g=new Game(save,0), width=32;
  const map={width,height:width,entry:{x:3,y:3},objects:[],enemySpawns:[],tiles:Array.from({length:width*width},(_,i)=>({x:i%width,y:Math.floor(i/width),kind:'floor',blocked:false,elev:0}))};
  save.session.activeDungeonId='dungeon:ASTRAL-MOUNT-GAME:g1:5:5:mount';
  Object.assign(g,{area,rx:5,ry:5,map,enemies:[],effects:[],projectiles:[],packEffects:[],paused:false,seaHazards:null,storm:null});
  Object.assign(g.player,{x:16,y:16,hp:10000,invulnerableUntil:0,dodgeUntil:0});
  return actors(g);
}
function step(g,frames=1,start=0){for(let i=0;i<frames;i++)g.update(.05,input,start+(i+1)*50);}
function shot(owner,damage=25) {return {id:'paired-pierce',x:owner.x+.5,y:owner.y+.45,dx:1,dy:0,speed:0,life:1,damage,path:'straight',age:0,hits:{},pierce:2};}
function blast(owner,damage=25){return {id:'paired-splash',kind:'rift-blast',x:owner.x+.5,y:owner.y+.45,life:.3,radius:1,untilPulse:0,pulse:99,damage,hits:{}};}

test('Game fixture mount follows moving worm while Walker attacks and cannot independently move or teleport',()=>{
  const {g,owner,rider}=fixture();const at={x:rider.x,y:rider.y},w=g.packWorld(.05,50);
  assert.equal(w.move(rider,1,0),false);assert.equal(w.safeTeleport(rider,10,10),false);w.detour(rider,1);w.walkerPatrol(rider,rider.pack);
  assert.deepEqual({x:rider.x,y:rider.y},at);
  let attacks=0;for(let i=0;i<120;i++){step(g,1,i*50);if(rider.pack.attack)attacks++;assert.equal(rider.x,owner.x);assert.equal(rider.y,owner.y);}
  assert.ok(attacks>0,'mounted Walker retains real combat kit');assert.ok(owner.x!==at.x||owner.y!==at.y);
  assert.equal(rider.untargetable,false);assert.equal(owner.hp,1000);assert.equal(rider.hp,500);
});

test('Game actual piercing projectile hits both mounted ordinary actors independently',()=>{
  const {g,owner,rider}=fixture();g.projectiles=[shot(owner)];step(g);
  assert.equal(owner.hp,975);assert.equal(rider.hp,475);assert.equal(rider.astralMount.damageTaken,25);
  assert.equal(rider.astralMount.status,'mounted');assert.equal(g.projectiles[0].hits[owner.id],true);assert.equal(g.projectiles[0].hits[rider.id],true);
});

test('Game actual splash effect hits both mounted actors and overkill counts only removed rider HP',()=>{
  const {g,owner,rider}=fixture();g.effects=[blast(owner)];step(g);
  assert.equal(owner.hp,975);assert.equal(rider.hp,475);assert.equal(rider.astralMount.damageTaken,25);
  rider.hp=7;g.effects=[blast(owner,100)];step(g,1,50);
  assert.equal(rider.astralMount.damageTaken,32);assert.equal(rider.astralMount.status,'dismounted');
  assert.equal(owner.hp,875);assert.equal(rider.dead,true);assert.equal(rider.maxHp,500);
});

test('Game real melee and glyph direct damage contribute actual player damage without changing owner HP indirectly',()=>{
  const {g,owner,rider}=fixture();Object.assign(g.player,{x:12,y:13,facing:'up',meleeAim:{x:0,y:-1}});
  const before=rider.hp;g.primaryStrike(1000,{x:0,y:-1});
  assert.ok(rider.hp<before);assert.equal(rider.astralMount.damageTaken,before-rider.hp);
  const ownerHp=owner.hp,damage=rider.astralMount.damageTaken;g.glyphWorld(1100).damage(rider,10);
  assert.equal(rider.astralMount.damageTaken,damage+10);assert.equal(owner.hp,ownerHp);
  rider.glyphBurn={until:5000,dps:8};const beforeBurn=rider.hp;g.tickGlyphs(.25,1200);assert.equal(beforeBurn-rider.hp,2);
  assert.equal(rider.astralMount.damageTaken,damage+10+beforeBurn-rider.hp);
});

test('Game damage threshold dismounts safely and restores independent movement and teleport callbacks',()=>{
  const {g,owner,rider}=fixture();g.glyphWorld(1).damage(rider,100);
  assert.equal(rider.astralMount.status,'dismounted');assert.equal(rider.astralMount.reason,'damage');
  assert.ok(walkerGroundPositionOpen(g.map,32,rider.x,rider.y));assert.equal(owner.hp,1000);assert.equal(rider.hp,400);
  const w=g.packWorld(.05,50),x=rider.x;assert.equal(w.move(rider,-.1,0),true);assert.ok(rider.x<x);
  assert.equal(w.safeTeleport(rider,8,8),true);assert.deepEqual([rider.x,rider.y],[8,8]);
});

test('Game owner death, owner removal and either retreat detach riders without healing or merging HP',()=>{
  for(const reason of ['owner-dead','owner-missing','owner-retreat','rider-retreat']) {
    const {g,owner,rider}=fixture();
    if(reason==='owner-dead'){owner.hp=0;owner.dead=true;}
    if(reason==='owner-missing')g.enemies=[rider];
    if(reason==='owner-retreat')owner.retreating=true;
    if(reason==='rider-retreat')rider.retreating=true;
    g.syncAstralRiders();
    // Owner rule 2026-10-21: a rider stays on a retreating Worm and rides it home.
    if(reason==='owner-retreat'){assert.equal(rider.astralMount.status,'mounted');assert.equal(rider.astralMount.ridingAway,true);assert.equal(rider.untargetable,true);}
    else {assert.equal(rider.astralMount.status,'dismounted');assert.equal(rider.astralMount.reason,reason);}
    assert.equal(rider.hp,500);assert.equal(rider.maxHp,500);
  }
});

test('Game ocean and blocked landings stay pending, targetable and immobile until authoritative dry footing exists',()=>{
  for(const kind of ['ocean','deepOcean','wall']) {
    const {g,owner,rider}=fixture('overworld');
    for(const t of g.map.tiles){t.kind=kind;t.blocked=kind==='wall';}
    g.glyphWorld(1).damage(rider,100);
    assert.equal(rider.astralMount.status,'landing',kind);assert.equal(!!rider.untargetable,false);
    const at={x:rider.x,y:rider.y},w=g.packWorld(.05,50);
    assert.equal(w.move(rider,1,0),false);assert.equal(w.safeTeleport(rider,3,3),false);
    owner.x+=2;g.syncAstralRiders();assert.deepEqual({x:rider.x,y:rider.y},at);
    // A dry tile is independently validated, rather than inferred from Astral flight support.
    Object.assign(g.map.tiles[12*32+12],{kind:'ocean',blocked:false});
    Object.assign(g.map.tiles[12*32+11],{kind:'floor',blocked:false});g.syncAstralRiders();
    assert.equal(rider.astralMount.status,'dismounted');assert.deepEqual([rider.x,rider.y],[11,12]);
    assert.ok(walkerGroundPositionOpen(g.map,32,rider.x,rider.y));
  }
});

test('Game dungeon landing rejects disconnected dry islands even when a footprint is open',()=>{
  const {g,rider}=fixture();
  for(const t of g.map.tiles)Object.assign(t,{kind:'wall',blocked:true});
  Object.assign(g.map.tiles[3*32+3],{kind:'floor',blocked:false});
  Object.assign(g.map.tiles[12*32+11],{kind:'floor',blocked:false});
  assert.equal(walkerGroundPositionOpen(g.map,32,11,12),true);
  assert.equal(g.astralLandingOpen(rider,{x:11,y:12}),false);
  g.glyphWorld(1).damage(rider,100);assert.equal(rider.astralMount.status,'landing');
});

test('Game pause freezes riding and pending-landing state exactly',()=>{
  for(const pending of [false,true]) {
    const {g,owner,rider}=fixture();if(pending){for(const t of g.map.tiles)t.blocked=true;dismountAstralWalker(rider,'voluntary',g.astralMountHost());}
    g.setPaused(true,10);const before=JSON.stringify({owner,rider});step(g,20,100);
    assert.equal(JSON.stringify({owner,rider}),before);
    g.setPaused(false,1200);assert.equal(rider.astralMount.status,pending?'landing':'mounted');
  }
});

test('Game explicit mounted fixture snapshots round-trip through migration and reload with exact mount counters and positions',()=>{
  const save=freshSave();save.seed='ASTRAL-MOUNT-REAL-SAVE';const g=new Game(save,0);
  const {owner,rider}=actors(g,g.player.x,g.player.y);g.glyphWorld(1).damage(rider,17);
  g.setPaused(true,10);const expected=JSON.parse(JSON.stringify({state:rider.astralMount,x:rider.x,y:rider.y,hp:rider.hp,maxHp:rider.maxHp}));
  const restored=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(10)))),1000);
  const r=restored.enemies.find(e=>e.id===rider.id),o=restored.enemies.find(e=>e.id===owner.id);
  assert.ok(r&&o,'explicit fixture actors survive absence from generated spawns');
  assert.deepEqual({state:r.astralMount,x:r.x,y:r.y,hp:r.hp,maxHp:r.maxHp},expected);assert.equal(restored.paused,true);
  assert.equal(o.hp,owner.hp);assert.equal(o.maxHp,owner.maxHp);
});

test('Game explicit mount rejects allied helper, actors outside the scene, and a second rider',()=>{
  const {g,owner,rider}=fixture();const second=createCombatant('voidWalker',owner.x,owner.y,false,[]);second.id='second';g.enemies.push(second);
  assert.equal(g.mountAstralFixture(owner,second),false);
  const absent=createCombatant('astralWorm',12,12,false,[]);assert.equal(g.mountAstralFixture(absent,second),false);
  dismountAstralWalker(rider,'voluntary',g.astralMountHost());second.astralAllyOf=owner.id;
  assert.equal(g.mountAstralFixture(owner,second),false);
});


test('Game non-piercing shots still stop at first mounted actor and unrelated piercing targets keep prior substep behavior',()=>{
  {
    const {g,owner,rider}=fixture();const p=shot(owner);p.pierce=0;g.projectiles=[p];step(g);
    assert.equal(owner.hp,975);assert.equal(rider.hp,500);assert.equal(rider.astralMount.damageTaken,0);
  }
  {
    const {g,owner,rider}=fixture();delete rider.astralMount;const p=shot(owner);g.projectiles=[p];step(g);
    assert.equal(owner.hp,975);assert.equal(rider.hp,500);
  }
});

test('Game lethal owner piercing hit still reaches co-located living rider and unrelated health loss does not count',()=>{
  const {g,owner,rider}=fixture();owner.hp=10;rider.hp-=7;g.syncAstralRiders();
  assert.equal(rider.astralMount.damageTaken,0);g.projectiles=[shot(owner,25)];step(g);
  assert.equal(owner.dead,true);assert.equal(rider.hp,468);assert.equal(rider.astralMount.damageTaken,25);
  assert.equal(rider.astralMount.status,'dismounted');assert.equal(rider.astralMount.reason,'owner-dead');
});

test('Game pending-landing fixture save restores unresolved placement without resetting knockoff damage',()=>{
  const save=freshSave();save.seed='ASTRAL-MOUNT-PENDING-SAVE';const g=new Game(save,0);
  const {rider}=actors(g,g.player.x,g.player.y);for(const t of g.map.tiles){t.kind='ocean';t.blocked=false;}
  g.glyphWorld(1).damage(rider,100);assert.equal(rider.astralMount.status,'landing');
  g.setPaused(true,10);const expected=JSON.parse(JSON.stringify(rider.astralMount));
  const restored=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(10)))),1000);
  const r=restored.enemies.find(e=>e.id===rider.id);assert.ok(r);assert.deepEqual(r.astralMount,expected);
  assert.equal(r.hp,400);assert.equal(r.maxHp,500);assert.deepEqual([r.x,r.y],[rider.x,rider.y]);
});


test('Game local landing cannot cut through walls, clip shoulders, or jump a large elevation discontinuity',()=>{
  const {g,rider}=fixture();assert.equal(g.astralLandingOpen(rider,{x:10,y:12}),true);
  Object.assign(g.map.tiles[12*32+11],{kind:'wall',blocked:true});
  assert.equal(g.astralLandingOpen(rider,{x:10,y:12}),false,'connected destination behind wall is not a valid dismount');
  Object.assign(g.map.tiles[12*32+11],{kind:'floor',blocked:false});g.map.landscape=true;
  g.map.tiles[12*32+10].elev=4;
  assert.equal(g.astralLandingOpen(rider,{x:10,y:12}),false,'no unverified cliff descent or ascent');
});
