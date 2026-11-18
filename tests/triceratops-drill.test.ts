import test from "node:test";
import assert from "node:assert/strict";
import { Game, footprintOpen, footprintHazard } from "../src/game.ts";
import { freshSave, migrateSave } from "../src/types.ts";
import { stableMount, startRide, TRICERATOPS_ATTACKS, triceratopsDrillPose, normalizeTriceratopsDrill } from "../src/beast-mounts.ts";

const C = TRICERATOPS_ATTACKS.drill;
const input = (action = null) => ({ state: { x: 0, y: 0 }, consume: k => k === action, held: () => false });
const flat = () => ({ width:32, height:32, exits:{west:16,east:16,north:16,south:16}, tiles:Array.from({length:1024},(_,i)=>({x:i%32,y:Math.floor(i/32),kind:"savannaGrass",elev:0,blocked:false})), objects:[], enemySpawns:[] });
function mounted(variant = "silly") {
  const save=freshSave();save.seed="DRILL";const g=new Game(save,0);
  g.testOriginalMap=g.map;g.map=flat();g.enemies=[];g.builds=[];Object.assign(g.player,{x:10,y:10,hp:g.save.maxHp,stamina:100,facing:"right"});
  const m=stableMount(save,"triceratops",{triceratopsDisposition:variant}).mount;startRide(save,m.id);return g;
}
function foe(g,id="foe",x=12,y=10) {
  const e=g.createEnemyFromSpawn({id,kind:"ashling",x,y});e.hp=e.maxHp=1000;e.stun=100;g.enemies.push(e);return e;
}
function jump(g) { g.update(.01,input("jump"),1000);return g.triceratopsJump; }
function advance(g,from=1020,to=1900) { for(let now=from;now<=to;now+=20)g.update(.02,input(),now); }

test("only an accepted Silly Goose Jump creates a drill; it never falls through to a landing slam",()=>{
  for(const variant of ["silly","good"]){const g=mounted(variant),q=jump(g);assert.equal(q.kind,variant==="silly"?"drill":undefined);let lands=0;const blow=g.triceratopsBlow.bind(g);g.triceratopsBlow=(k,...a)=>{if(k==="landing")lands++;return blow(k,...a);};advance(g);assert.equal(lands,variant==="silly"?0:1);assert.equal(g.triceratopsJump,null);}
  const refused=mounted();refused.player.stunnedUntil=2000;assert.equal(jump(refused),null);
});

test("acquisition prefers a valid locked hostile, rejects allies, walls and height, and never reacquires",()=>{
  const g=mounted(),near=foe(g,"near",11.5),locked=foe(g,"locked",14);g.lockTarget(locked.id);
  assert.equal(jump(g).target,locked.id);locked.dead=true;g.triceratopsDrillSteer(.02,1120);assert.equal(g.triceratopsJump.target,null);assert.equal(g.triceratopsDrillSteer(.02,1140),false);assert.equal(near.hp,1000);
  const h=mounted(),ally=foe(h,"ally",11),hidden=foe(h,"hidden",11.3),high=foe(h,"high",13),valid=foe(h,"valid",10,13);
  ally.astralAllyOf="player";hidden.hidden=true;h.map.landscape=true;h.map.tiles[10*32+13].elev=6;h.lockTarget(ally.id);assert.equal(jump(h).target,valid.id);assert.equal(h.triceratopsDrillTarget(high),false);
  const wall=mounted();foe(wall,"behind",14);for(let y=9;y<12;y++)wall.map.tiles[y*32+12].blocked=true;assert.equal(jump(wall).target,null);
});

test("homing and contact are bounded and use the chosen hostile only",()=>{
  const g=mounted(),chosen=foe(g,"chosen",12),other=foe(g,"other",10,11);g.lockTarget(chosen.id);
  const q=jump(g),startX=g.player.x,startY=g.player.y;let pulses=0;const blow=g.artBlow.bind(g);
  g.artBlow=(e,...a)=>{assert.equal(e,chosen);pulses++;return blow(e,...a);};advance(g);
  assert.ok(pulses>0&&pulses<=C.pulses);assert.ok(q.travel>0&&q.travel<=C.travel);assert.ok(Math.hypot(g.player.x-startX,g.player.y-startY)<=C.travel+.001);assert.ok(chosen.hp<1000);assert.equal(other.hp,1000);assert.equal(g.triceratopsJump,null);
});

test("guarded homing stops before new walls, props, hazards, cliffs and section boundaries",()=>{
  for(const hazard of ["wall","water","cliff","drop","prop"]){const g=mounted();foe(g,"target",14);const q=jump(g);if(hazard==="wall")for(let y=9;y<12;y++)g.map.tiles[y*32+11].blocked=true;
    if(hazard==="water")for(let y=9;y<12;y++)g.map.tiles[y*32+11].kind="river";
    if(hazard==="cliff"||hazard==="drop"){g.map.landscape=true;for(let y=9;y<12;y++)g.map.tiles[y*32+11].elev=hazard==="cliff"?6:-6;}
    if(hazard==="prop")g.map.objects.push({id:"shrine",kind:"shrine",x:11,y:10});
    for(let now=1120;now<1500;now+=20)g.triceratopsDrillSteer(.02,now);
    assert.ok(g.player.x<11,`${hazard}: no tunneling`);assert.ok(q.travel<C.travel);}
  const edge=mounted();edge.player.x=30.8;foe(edge,"outside",32);jump(edge);edge.triceratopsDrillSteer(.1,1120);assert.ok(edge.player.x<31.2);assert.equal(edge.rx,0);
});

test("lost targets finish harmlessly; damage locks and invalid air states cancel without a slam",()=>{
  for(const interrupt of [g=>{g.player.hp--;},g=>{g.player.stunnedUntil=5000;},g=>{g.player.heldUntil=5000;},g=>{g.glide={};},g=>{g.plunge={};},g=>{g.dismount();},g=>{g.jumpUntil++;},g=>{g.loadArea("overworld",false);}]){
    const g=mounted(),e=foe(g);jump(g);interrupt(g);g.triceratopsDrillSteer(.02,1120);g.triceratopsDrillContact(1120);assert.equal(g.triceratopsJump,null);assert.equal(e.hp,1000);
  }
  const g=mounted(),e=foe(g);jump(g);e.hidden=true;g.triceratopsDrillSteer(.02,1120);assert.equal(g.triceratopsJump.target,null);assert.ok(triceratopsDrillPose(g,g.mountRide(),1120));advance(g,1140);assert.equal(e.hp,1000);assert.equal(g.effects.some(e=>e.kind==="plunge-slam"),false);
});

test("pause shifts the same leap, steering and pulse clocks without duplicate contact",()=>{
  const g=mounted();foe(g,"target",11.1);const q=jump(g);g.triceratopsDrillContact(1100);assert.equal(q.pulses,1);
  const pose=triceratopsDrillPose(g,g.mountRide(),1120),before=structuredClone(q);g.setPaused(true,1120);g.update(.05,input(),4000);
  assert.deepEqual(q,before);assert.deepEqual(triceratopsDrillPose(g,g.mountRide(),4000),pose);
  g.setPaused(false,5120);assert.equal(q.start,g.jumpStart);assert.equal(q.until,g.jumpUntil);assert.equal(q.nextAt,before.nextAt+4000);assert.equal(q.drillUntil,before.drillUntil+4000);assert.deepEqual(triceratopsDrillPose(g,g.mountRide(),5120),pose);
  g.triceratopsDrillContact(5120);assert.equal(q.pulses,1);g.triceratopsDrillContact(5220);assert.equal(q.pulses,2);g.triceratopsDrillContact(5220);assert.equal(q.pulses,2);
});

test("save/reload preserves partial drill travel, pose and pulse budget without replay",()=>{
  const g=mounted();g.map=g.testOriginalMap;
  let at=null;for(let y=4;y<27&&!at;y++)for(let x=4;x<26;x++)if([0,.5,1,1.6].every(dx=>footprintOpen(g.map,32,x+dx,y)&&!footprintHazard(g.map,32,x+dx,y))&&!g.map.objects.some(o=>Math.hypot(o.x-x,o.y-y)<3)){at={x,y};break;}
  assert.ok(at);Object.assign(g.player,at);const e=foe(g,"target",at.x+1.6,at.y);e.astralMountFixture=true; // existing saved-fixture actor admission, so its identity survives loadArea
  jump(g);
  for(let now=1100;now<=1180;now+=20)g.triceratopsDrillSteer(.02,now);
  g.triceratopsDrillContact(1300);const q=g.triceratopsJump;assert.equal(q.pulses,1);assert.ok(q.travel>0);
  g.lastUpdateNow=1320;const pose=triceratopsDrillPose(g,g.mountRide(),1320);g.exportSnapshot(1320);
  const receipt=g.save.session.playerRuntime.triceratopsDrill;assert.equal(receipt.pulses,1);assert.equal(receipt.target,e.id);
  const loaded=new Game(structuredClone(g.save),5000),r=loaded.triceratopsJump;
  assert.ok(r);assert.equal(r.target,e.id);assert.equal(r.travel,q.travel);assert.equal(r.pulses,1);assert.equal(r.nextAt-5000,q.nextAt-1320);assert.equal(r.drillUntil-5000,q.drillUntil-1320);
  assert.deepEqual(triceratopsDrillPose(loaded,loaded.mountRide(),5000),pose);
  const savedFoe=loaded.enemies.find(x=>x.id===e.id);assert.ok(savedFoe);assert.equal(savedFoe.hp,e.hp);
  let pulses=0;const blow=loaded.artBlow.bind(loaded);loaded.artBlow=(target,...a)=>{pulses++;return blow(target,...a);};
  loaded.triceratopsDrillContact(5000);assert.equal(pulses,0);loaded.triceratopsDrillContact(5100);assert.equal(pulses,1);loaded.triceratopsDrillContact(5100);assert.equal(pulses,1);loaded.triceratopsDrillContact(5220);assert.equal(pulses,2);loaded.triceratopsDrillContact(5340);assert.equal(pulses,2);assert.equal(r.pulses,C.pulses);
  loaded.exportSnapshot(5340);const again=new Game(structuredClone(loaded.save),9000);assert.equal(again.triceratopsJump.pulses,C.pulses);let replay=0;again.artBlow=()=>{replay++;};again.triceratopsDrillContact(9000);assert.equal(replay,0);
});


test("travel and duration caps hold for a distant target, while rider inputs retain their handlers",()=>{
  const g=mounted();foe(g,"far",15);const q=jump(g);
  for(let now=1100;now<1780;now+=20)g.triceratopsDrillSteer(1,now);
  assert.ok(q.travel<=C.travel);assert.ok(q.travel>C.travel-.01);assert.ok(g.player.x<=13.001);g.triceratopsDrillContact(1780);assert.equal(g.triceratopsJump,null);
  const rider=mounted();jump(rider);let attacked=false,cast=false;
  const air=rider.airAttack.bind(rider),press=rider.pressSlot.bind(rider);
  rider.airAttack=(now,action)=>{if(action==="attack")attacked=true;return air(now,action);};
  rider.pressSlot=(slot,action,...a)=>{if(slot==="a"&&action==="spell")cast=true;return press(slot,action,...a);};
  rider.update(.01,input("spell"),1040);rider.update(.01,input("attack"),1080);assert.ok(cast&&attacked);
});


test("drill receipt validation rejects malformed counters, timing, identity and aim without changing old saves",()=>{
  const g=mounted();foe(g,"target",11.1);jump(g);g.triceratopsDrillContact(1100);g.exportSnapshot(1120);
  const good=g.save.session.playerRuntime.triceratopsDrill;assert.ok(normalizeTriceratopsDrill(good));
  for(const bad of [null,[],{}, {...good,v:0},{...good,area:"sky"},{...good,variant:"normal"},{...good,mount:""},{...good,target:3},{...good,travel:C.travel+.01},{...good,travel:-1},{...good,pulses:4},{...good,pulses:.5},{...good,elapsed:NaN},{...good,jumpLeft:0},{...good,drillLeft:900},{...good,nextLeft:121},{...good,nextLeft:-1},{...good,hp:0},{...good,atX:Infinity},{...good,x:.25,y:0},{...good,pulses:3,elapsed:110}])assert.equal(normalizeTriceratopsDrill(bad),null);
  for(const change of [{mount:"different"},{areaId:"different"},{levelId:"different"},{atX:good.atX+1},{jumpLeft:good.jumpLeft+1,drillLeft:good.drillLeft+1}]){
    const save=structuredClone(g.save);save.session.playerRuntime.triceratopsDrill={...good,...change};const loaded=new Game(save,5000);assert.equal(loaded.triceratopsJump,null);loaded.triceratopsDrillContact(5000);assert.equal(loaded.triceratopsJump,null);
  }
  const malformed=structuredClone(g.save);malformed.session.playerRuntime.triceratopsDrill={...good,pulses:-1};assert.equal(migrateSave(malformed).session.playerRuntime.triceratopsDrill,null);
  const old=freshSave(),oldRuntime=old.session.playerRuntime;assert.equal(Object.hasOwn(oldRuntime,"triceratopsDrill"),false);const migrated=migrateSave(structuredClone(old));assert.equal(migrated.version,14);assert.equal(Object.hasOwn(migrated.session.playerRuntime,"triceratopsDrill"),false);const legacy=new Game(migrated,5000);legacy.exportSnapshot(5000);assert.equal(Object.hasOwn(legacy.save.session.playerRuntime,"triceratopsDrill"),false);
  const future=structuredClone(g.save);future.session.playerRuntime.triceratopsDrill={v:2,opaque:{keep:7}};const unknown=new Game(migrateSave(future),5000);assert.equal(unknown.triceratopsJump,null);unknown.exportSnapshot(5000);assert.deepEqual(unknown.save.session.playerRuntime.triceratopsDrill,{v:2,opaque:{keep:7}});
});

test("paused drill snapshots keep elapsed phase and a missing target cannot be replaced after restore",()=>{
  const g=mounted();foe(g,"target",11.1);jump(g);g.triceratopsDrillContact(1100);g.setPaused(true,1120);g.exportSnapshot(4000);
  const receipt=g.save.session.playerRuntime.triceratopsDrill,pose=triceratopsDrillPose(g,g.mountRide(),4000);
  assert.equal(receipt.elapsed,120);assert.equal(receipt.nextLeft,100);
  receipt.target="gone";receipt.unknownMetadata={keep:true};const loaded=new Game(structuredClone(g.save),5000);
  assert.equal(loaded.paused,true);assert.equal(loaded.triceratopsJump.target,null);assert.equal(loaded.triceratopsJump.pulses,1);assert.deepEqual(triceratopsDrillPose(loaded,loaded.mountRide(),9000),pose);
  loaded.exportSnapshot(9000);assert.deepEqual(loaded.save.session.playerRuntime.triceratopsDrill.unknownMetadata,{keep:true});
  loaded.setPaused(false,9000);assert.equal(loaded.triceratopsJump.nextAt,9100);loaded.map=flat();const replacement=foe(loaded,"replacement",loaded.player.x+1,loaded.player.y);loaded.triceratopsDrillSteer(.02,9120);loaded.triceratopsDrillContact(9120);assert.equal(replacement.hp,1000);assert.equal(loaded.triceratopsJump.target,null);
});
