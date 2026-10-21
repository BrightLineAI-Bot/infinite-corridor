import {tickAstralBoarding,ASTRAL_BOARDING} from '../src/astral-worm-mount.ts';
const ASTRAL_BOARDING_TOTAL=ASTRAL_BOARDING.throwTime+ASTRAL_BOARDING.pillarTime+ASTRAL_BOARDING.phaseOutTime+ASTRAL_BOARDING.phaseInTime;
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { hashSeed } from '../src/random.ts';
import { WORLD_BEASTS, WORLD_BEAST_IDS, ENCOUNTER } from '../src/world-beasts.ts';
import { ASTRAL, startAstralMove } from '../src/astral-worm.ts';
import { ASTRAL_PAIR } from '../src/astral-encounters.ts';
import { ECHOES, echoEvent } from '../src/echoes.ts';
import { PACK_KINDS } from '../src/monster-pack.ts';
const input={state:{x:0,y:0},consume:()=>false};
const roll=(key,denominator=100000)=>(hashSeed(key)%denominator)/denominator;
function alignment(seed){const n=roll(`${seed}:astral-pair:v1:0`);return n<ASTRAL.allyWalkerChance?'ally':n<ASTRAL.allyWalkerChance+ASTRAL.hostileWalkerChance?'hostile':null;}
function natural(role='hostile',mount=false) {
  for(let candidate=0;candidate<20000;candidate++) {
    const seed=`ASTRAL-NATURAL-${candidate}`;
    if(alignment(seed)!==role || role==='hostile'&&(roll(`${seed}:astral-mount:v1:0`)<ASTRAL_PAIR.mountedShare)!==mount)continue;
    let id;
    for(let room=0;room<500;room++) {
      const key=`dungeon:${seed}:g1:5:0:natural-${room}`;
      if(roll(`${seed}:world-beast-dungeon:astralWorm:v1:0:${key}`,1000)<WORLD_BEASTS.astralWorm.dungeonChance &&
        roll(`${seed}:world-beast-dungeon:voidWalker:v1:0:${key}`,1000)>=WORLD_BEASTS.voidWalker.dungeonChance){id=key;break;}
    }
    assert.ok(id,'bounded deterministic dungeon-roll search');
    const save=freshSave();save.seed=seed;save.level=1;save.questingBeast.cooldown=999;
    for(const kind of WORLD_BEAST_IDS)save.worldBeasts[kind].cooldown=['astralWorm','voidWalker'].includes(kind)?0:999;
    save.session.area='dungeon';save.session.activeDungeonId=id;
    const g=new Game(save,0),owner=g.enemies.find(e=>e.worldBeast==='astralWorm'),rider=g.enemies.find(e=>e.astralCompanionOf===owner?.id);
    if(!owner||role&&!rider)continue; // Legitimate generated placement/crowd constraints may reject a roll.
    assert.equal(owner.astralMountFixture,undefined,'natural appearance did not use fixture enrollment');
    assert.equal(save.worldBeasts.astralWorm.active.dungeon,id);
    assert.equal(save.worldBeasts.astralWorm.active.tries,0);
    return {g,save,id,owner,rider};
  }
  assert.fail(`no natural ${role} encounter within deterministic candidate bound`);
}
// These fixtures test Astral behaviour, not encounter rarity: they find and create their encounter at full chance
// (release 261 scales live chances by ENCOUNTER.chanceScale), then restore the live setting.
function naturalOverworld(kind='astralWorm', options={}) {
  const scale=ENCOUNTER.chanceScale; ENCOUNTER.chanceScale=1;
  try { return naturalOverworldAt(kind, options); } finally { ENCOUNTER.chanceScale=scale; }
}
function naturalOverworldAt(kind='astralWorm', options={}) {
  const rx=6,ry=0;
  for(let n=0;n<(options.role?200000:20000);n++) {
    const seed=`ASTRAL-OVERWORLD-${kind}-${n}`;
    if(roll(`${seed}:world-beast:${kind}:v1:0:${rx}:${ry}`,1000)>=WORLD_BEASTS[kind].chance*ENCOUNTER.chanceScale)continue;
    if(options.role && (alignment(seed)!==options.role || options.mounted && roll(`${seed}:astral-mount:v1:0`)>=ASTRAL_PAIR.mountedShare || roll(`${seed}:world-beast:voidWalker:v1:0:${rx}:${ry}`,1000)<WORLD_BEASTS.voidWalker.chance*ENCOUNTER.chanceScale))continue;
    const save=freshSave();save.seed=seed;save.level=1;save.session.rx=rx;save.session.ry=ry;save.questingBeast.cooldown=999;
    for(const id of WORLD_BEAST_IDS)save.worldBeasts[id].cooldown=id===kind||options.role&&id==='voidWalker'?0:999;
    const g=new Game(save,0),actor=g.enemies.find(e=>e.worldBeast===kind);
    const rider=g.enemies.find(e=>e.astralCompanionOf===actor?.id);
    if(actor&&(!options.role||rider)&&(!options.marine||actor.marine))return {g,save,actor,rider};
  }
  assert.fail(`no natural overworld ${kind} within deterministic candidate bound`);
}
function advance(g,now=50){g.update(.05,input,now);}
function returnToDungeon(g,id){g.save.session.activeDungeonId=id;g.loadArea('dungeon',false);g.player.hp=g.save.maxHp;}
function rewards(save){return JSON.stringify({currency:save.currency,xp:save.xp,dropCounter:save.dropCounter,echoes:save.echoes,glyphs:save.glyphs,worldBeasts:save.worldBeasts});}

test('natural Game.loadArea creates Astral at level one with deterministic hostile/ally/no-pair selection and no fixture enrollment',()=>{
  for(const role of [null,'hostile','ally']) {
    const {g,save,owner,rider}=natural(role);
    assert.equal(owner.kind,'astralWorm');assert.equal(owner.worldBeast,'astralWorm');assert.equal(owner.hp,owner.maxHp);
    assert.equal(save.level,1);assert.ok(owner.damage>=60);assert.ok(owner.maxHp>=4760);
    assert.equal(save.worldBeasts.astralWorm.active.astralPair.alignment,role);
    assert.equal(g.enemies.filter(e=>e.kind==='astralWorm').length,1);
    if(role){assert.equal(rider.astralRole,role);assert.equal(save.worldBeasts.voidWalker.active.astralPairOf,owner.id);assert.equal(rider.worldBeast,role==='hostile'?'voidWalker':undefined);}
    else assert.equal(rider,undefined);
  }
});

test('natural hostile riding keeps independent wounded HP and exact mount counters through Game save/migration/reload',()=>{
  const {g,save,owner,rider}=natural('hostile',true);for(let i=0,now=50;i<60&&rider.astralMount?.status!=='mounted';i++)advance(g,now+=50);
  assert.equal(rider.astralMount?.status,'mounted');assert.equal(save.worldBeasts.astralWorm.active.astralPair.mountStarted,true);
  owner.hp-=31;g.glyphWorld(100).damage(rider,13);
  const before={ownerHp:owner.hp,ownerMax:owner.maxHp,riderHp:rider.hp,riderMax:rider.maxHp,mount:JSON.parse(JSON.stringify(rider.astralMount)),pair:JSON.parse(JSON.stringify(save.worldBeasts.astralWorm.active.astralPair))};
  g.setPaused(true,100);const restored=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(100)))),1000);
  const o=restored.enemies.find(e=>e.id===owner.id),r=restored.enemies.find(e=>e.id===rider.id);
  assert.ok(o&&r);assert.deepEqual({ownerHp:o.hp,ownerMax:o.maxHp,riderHp:r.hp,riderMax:r.maxHp,mount:r.astralMount,pair:restored.save.worldBeasts.astralWorm.active.astralPair},before);
  assert.equal(restored.enemies.filter(e=>e.kind==='voidWalker').length,1);assert.equal(restored.save.worldBeasts.voidWalker.active.tries,0);
});

test('natural ally and generated mirages award neither marks nor XP, drops, Echoes or hunt wins',()=>{
  const {g,save,owner,rider}=natural('ally');assert.equal(rider.noRewards,true);assert.equal(rider.astralAllyOf,owner.id);
  const before=rewards(save);rider.hp=0;rider.dead=true;g.defeatEnemy(rider);assert.equal(rewards(save),before);
  // Initialize the natural owner's combat state, then exercise its actual mirage actor adapter.
  Object.assign(g.player,{x:owner.x,y:owner.y});advance(g);assert.ok(owner.astral);startAstralMove(owner.astral,'mirage',g.player);
  advance(g,100);const mirage=g.enemies.find(e=>e.kind==='astralMirage');assert.ok(mirage,'actual owner attack emitted a mirage');assert.equal(mirage.noRewards,true);
  const preMirage=rewards(save);mirage.hp=0;mirage.dead=true;g.defeatEnemy(mirage);assert.equal(rewards(save),preMirage);
});

test('natural Astral death pays its ordinary beast bounty exactly once without inventing an Echo',()=>{
  const {g,save,owner}=natural(null);const currency=save.currency,level=save.level,slain=save.worldBeasts.astralWorm.slain;
  const echoBefore=JSON.stringify(save.echoes);owner.hp=0;owner.dead=true;g.defeatEnemy(owner);
  assert.ok(save.currency-currency>=WORLD_BEASTS.astralWorm.rewardMarks+WORLD_BEASTS.astralWorm.rewardPerLevel*level);
  assert.equal(save.worldBeasts.astralWorm.slain,slain+1);assert.equal(save.worldBeasts.astralWorm.active,null);
  assert.equal(PACK_KINDS.includes('astralWorm'),true);assert.equal(ECHOES.astralWorm,undefined);assert.equal(JSON.stringify(save.echoes),echoBefore);
  const after=rewards(save);g.defeatEnemy(owner);assert.equal(rewards(save),after);
});

test('natural hostile survivor retains wounded health and its own hunt when the Astral dies, including save/reentry',()=>{
  const {g,save,id,owner,rider}=natural('hostile');rider.hp-=73;const hp=rider.hp,max=rider.maxHp;
  owner.hp=0;owner.dead=true;g.defeatEnemy(owner);advance(g);
  assert.equal(rider.dead,false);assert.equal(rider.hp,hp);assert.equal(rider.maxHp,max);
  assert.equal(save.worldBeasts.voidWalker.active.astralPairOf,undefined);assert.equal(save.worldBeasts.voidWalker.active.tries,0);
  const restored=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(100)))),1000);
  const survivor=restored.enemies.find(e=>e.worldBeast==='voidWalker');assert.ok(survivor);assert.equal(survivor.hp,hp);assert.equal(survivor.maxHp,max);
  assert.equal(restored.enemies.filter(e=>e.worldBeast==='voidWalker').length,1);assert.equal(restored.save.worldBeasts.voidWalker.active.dungeon,id);
});

test('natural hostile pair uses shared three-death retries, full-HP rematches and terminal third departure',()=>{
  const {g,save,id}=natural('hostile');const currency=save.currency;
  for(let attempt=1;attempt<=3;attempt++) {
    const owner=g.enemies.find(e=>e.worldBeast==='astralWorm'),rider=g.enemies.find(e=>e.worldBeast==='voidWalker');assert.ok(owner&&rider);
    owner.hp=Math.max(1,owner.maxHp-111);rider.hp=Math.max(1,rider.maxHp-222);const max=[owner.maxHp,rider.maxHp];
    g.player.hp=0;advance(g,attempt*1000);assert.equal(g.save.worldFlags.deaths,attempt);assert.equal(g.area,'dungeon','ordinary dungeon death wrapper returns to its entry');
    if(attempt<3){assert.equal(save.worldBeasts.astralWorm.active.tries,attempt);assert.equal(save.worldBeasts.voidWalker.active.tries,attempt);}
    else {assert.equal(save.worldBeasts.astralWorm.active,null);assert.equal(save.worldBeasts.voidWalker.active,null);assert.equal(save.worldBeasts.astralWorm.escaped,1);assert.equal(save.worldBeasts.voidWalker.escaped,1);}
    returnToDungeon(g,id);
    if(attempt<3){const o=g.enemies.find(e=>e.worldBeast==='astralWorm'),r=g.enemies.find(e=>e.worldBeast==='voidWalker');assert.ok(o&&r);assert.deepEqual([o.hp,r.hp],max);assert.equal(o.astral,undefined);}
    else assert.equal(g.enemies.some(e=>!e.dead&&(e.worldBeast==='astralWorm'||e.worldBeast==='voidWalker')),false);
  }
  assert.equal(save.currency,currency);assert.equal(save.worldBeasts.astralWorm.slain,0);assert.equal(save.worldBeasts.voidWalker.slain,0);
});

test('natural allied companion leaves without reward or independent retry when the player falls',()=>{
  const {g,save,rider}=natural('ally');g.player.hp=0;advance(g);
  assert.equal(rider.dead,true);assert.equal(save.worldBeasts.voidWalker.active,null);
  assert.equal(save.worldBeasts.astralWorm.active.tries,1);assert.equal(save.worldBeasts.voidWalker.slain,0);assert.equal(save.worldBeasts.voidWalker.escaped,0);
});

test('actual level-one Questing actor dominates naturally loaded beasts at the same regional depth and suppresses a simultaneous Astral roll',()=>{
  let g;const rx=6,ry=0;
  for(let n=0;n<20000;n++) {
    const seed=`ASTRAL-QUESTING-DOMINANCE-${n}`;
    if(roll(`${seed}:questing-beast:v1:0:${rx}:${ry}`,1000)>=.035||roll(`${seed}:world-beast:astralWorm:v1:0:${rx}:${ry}`,1000)>=WORLD_BEASTS.astralWorm.chance)continue;
    const save=freshSave();save.seed=seed;save.level=1;save.session.rx=rx;save.session.ry=ry;
    for(const kind of WORLD_BEAST_IDS)save.worldBeasts[kind].cooldown=kind==='astralWorm'?0:999;
    const candidate=new Game(save,0);if(candidate.enemies.some(e=>e.questingBeast)){g=candidate;break;}
  }
  assert.ok(g,'bounded deterministic collision of natural Questing and Astral rolls');assert.equal(g.save.level,1);
  const q=g.enemies.find(e=>e.questingBeast);assert.equal(g.enemies.some(e=>e.worldBeast==='astralWorm'),false);assert.equal(g.save.worldBeasts.astralWorm.active,null);
  for(const kind of WORLD_BEAST_IDS){const {g:other,actor:e}=naturalOverworld(kind);assert.equal(other.rx,g.rx);assert.equal(other.ry,g.ry);assert.equal(other.save.level,1);assert.ok(q.maxHp>e.maxHp,`${kind} HP: ${q.maxHp} > ${e.maxHp}`);assert.ok(q.damage>e.damage,`${kind} damage: ${q.damage} > ${e.damage}`);}
});

test('natural overworld Astral enrollment creates a real shared hunt without forced reservations or fixture actors',()=>{
  const {g,save,actor}=naturalOverworld();assert.equal(g.area,'overworld');assert.equal(save.level,1);
  assert.equal(actor.astralMountFixture,undefined);assert.equal(actor.worldBeast,'astralWorm');assert.equal(actor.hp,actor.maxHp);
  assert.deepEqual([save.worldBeasts.astralWorm.active.rx,save.worldBeasts.astralWorm.active.ry],[g.rx,g.ry]);
  assert.equal(save.worldBeasts.astralWorm.active.tries,0);
});

test('defeated natural allied helper releases its unique reservation and cannot respawn on ordinary reload',()=>{
  const {g,save,owner,rider}=natural('ally');rider.hp=0;rider.dead=true;g.defeatEnemy(rider);advance(g);
  assert.equal(owner.dead,false);assert.equal(save.worldBeasts.voidWalker.active,null,'dead helper must release its reservation');
  const restored=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(100)))),1000);
  assert.equal(restored.enemies.some(e=>e.astralCompanionOf===owner.id&&!e.dead),false);
  assert.equal(restored.save.worldBeasts.voidWalker.slain,0);assert.equal(restored.save.worldBeasts.voidWalker.escaped,0);
});


test('natural hostile rider death unmounts, pays only its own bounty and cannot revive alongside the living Worm',()=>{
  const {g,save,owner,rider}=natural('hostile',true);for(let i=0,now=50;i<60&&rider.astralMount?.status!=='mounted';i++)advance(g,now+=50);assert.equal(rider.astralMount.status,'mounted');
  const ownerHp=owner.hp;g.glyphWorld(100).damage(rider,rider.hp+999);advance(g,150);
  assert.equal(rider.dead,true);assert.equal(rider.astralMount.status,'dismounted');assert.equal(rider.astralMount.reason,'rider-dead');
  assert.equal(owner.hp,ownerHp);assert.equal(save.worldBeasts.voidWalker.active,null);assert.equal(save.worldBeasts.voidWalker.slain,1);assert.equal(save.worldBeasts.astralWorm.slain,0);
  const restored=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(200)))),1000);
  assert.equal(restored.enemies.some(e=>e.astralCompanionOf===owner.id&&!e.dead),false);assert.ok(restored.enemies.some(e=>e.id===owner.id&&!e.dead));
});

test('Mirror Echo cannot directly swap a naturally mounted Walker out from under its owner',()=>{
  const {g,save,owner,rider}=natural('hostile',true);for(let i=0,now=50;i<60&&rider.astralMount?.status!=='mounted';i++)advance(g,now+=50);assert.equal(rider.astralMount.status,'mounted');
  Object.assign(g.player,{x:rider.x+1,y:rider.y});assert.equal(g.glyphWorld(100).canStand(rider.x,rider.y),true);
  save.echoes={owned:{mirrorShade:true},equipped:['mirrorShade']};const at={x:rider.x,y:rider.y};
  echoEvent(g,'hurt',1000,{damage:1});
  assert.deepEqual({x:rider.x,y:rider.y},at);assert.equal(rider.astralMount.status,'mounted');assert.deepEqual([rider.x,rider.y],[owner.x,owner.y]);
});

test('natural marine hostile rider safely dismounts above ocean water without receiving or changing player boat ownership',()=>{
  const {g,save,actor:owner,rider}=naturalOverworld('astralWorm',{role:'hostile',mounted:true,marine:true});
  const boat=JSON.stringify(save.boat);advance(g);tickAstralBoarding(rider,ASTRAL_BOARDING_TOTAL,g.astralMountHost());assert.equal(rider.astralMount?.status,'mounted');assert.equal(owner.marine,true);
  const hit=Math.ceil(rider.astralMount.knockoffDamage);g.glyphWorld(100).damage(rider,hit);
  assert.equal(rider.astralMount.status,'dismounted');assert.equal(g.astralLandingOpen(rider,{x:rider.x,y:rider.y}),true);
  assert.equal(JSON.stringify(save.boat),boat);assert.equal(rider.hp,rider.maxHp-hit);assert.equal(owner.hp,owner.maxHp);
  const at={x:rider.x,y:rider.y};const moved=g.packWorld(.05,200).move(rider,.1,0);assert.equal(moved,true);assert.ok(rider.x>at.x);
});

for(const lethal of [false,true])test(`natural mirage ${lethal?'death':'wound'} immediately before save is authoritative after reload`,()=>{const {g,owner}=natural(null);Object.assign(g.player,{x:owner.x,y:owner.y});advance(g);startAstralMove(owner.astral,'mirage',g.player);advance(g,100);const clone=g.enemies.find(e=>e.astralOwner===owner.id);assert(clone);const hp=clone.hp;g.glyphWorld(110).damage(clone,lethal?hp+100:31);const expected=lethal?0:hp-31;const restored=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(110)))),1000);const live=restored.enemies.find(e=>e.id===clone.id&&!e.dead);if(lethal)assert.equal(live,undefined);else assert.equal(live.hp,expected);advance(restored,1050);const after=restored.enemies.find(e=>e.id===clone.id&&!e.dead);if(lethal)assert.equal(after,undefined);else assert.equal(after.hp,expected);assert.equal(g.save.currency,restored.save.currency);});

test('natural ocean mirage drain heals only post-hull player HP loss, never intercepted damage',()=>{
 const {g,save,actor:o}=naturalOverworld('astralWorm',{marine:true});
 g.map.tiles=g.map.tiles.map(t=>({...t,kind:'ocean',blocked:false,structure:null,buildingId:null,environment:null,pit:false,elev:0}));g.map.objects=[];g.map.settlement=null;g.map.environment=null;g.map.landscape=false;g.seaHazards=null;g.storm=null;g.paused=false;save.maxHp=1000;g.enemies=[o];
 Object.assign(g.player,{x:16,y:16,hp:1000,invulnerableUntil:0,dodgeUntil:0});Object.assign(o,{x:16,y:16,hp:1000,aggro:true});Object.assign(save.boat,{owned:true,aboard:true,hull:60,home:{rx:g.rx,ry:g.ry,x:16,y:16},moored:null});
 advance(g,100);startAstralMove(o.astral,'mirage',g.player);advance(g,150);o.astral.enclosed=1.4;o.astral.hitClock=0;g.player.invulnerableUntil=0;const hp=g.player.hp,ownerHp=o.hp;advance(g,1000);
 const lost=hp-g.player.hp,healed=o.hp-ownerHp;assert(lost>0);assert(healed>0&&healed<=lost);assert(save.boat.hull<60);assert.equal(o.astral.hp,o.hp);
});

for(const role of ['ally','hostile'])for(const survives of [true,false])test(`natural marine ${role} companion uses finalized ${survives?'survival':'death'} after hull mitigation`,()=>{
 const {g,save,actor:o,rider}=naturalOverworld('astralWorm',{role,mounted:role==='hostile',marine:true});
 g.map.tiles=g.map.tiles.map(t=>({...t,kind:'ocean',blocked:false,structure:null,buildingId:null,environment:null,pit:false,elev:0}));g.map.objects=[];g.map.settlement=null;g.map.environment=null;g.map.landscape=false;g.seaHazards=null;g.storm=null;g.paused=false;save.maxHp=1000;g.enemies=[o,rider];
 Object.assign(g.player,{x:16,y:16,hp:1000,invulnerableUntil:0,dodgeUntil:0});Object.assign(o,{x:16,y:16,hp:1000,aggro:true});Object.assign(save.boat,{owned:true,aboard:true,hull:60,home:{rx:g.rx,ry:g.ry,x:16,y:16},moored:null});
 Object.assign(rider,{x:16,y:16});advance(g,100);if(role==='hostile'){for(let i=0;i<60&&rider.astralMount?.status!=='mounted';i++)advance(g,100);assert.equal(rider.astralMount?.status,'mounted');}startAstralMove(o.astral,'mirage',g.player);advance(g,150);o.astral.enclosed=1.4;o.astral.hitClock=0;g.player.invulnerableUntil=0;g.player.hp=survives?6:4;advance(g,1000);
 if(survives){assert.equal(g.player.hp,1);assert.equal(o.astral.terminated,false);assert.equal(o.astral.clones.length,4);assert.equal(rider.dead,false);assert.ok(save.worldBeasts.voidWalker.active);assert.equal(save.worldBeasts.astralWorm.active.tries,0);if(role==='hostile')assert.equal(rider.astralMount.status,'mounted');}
 else {assert.equal(save.worldBeasts.astralWorm.active.tries,1);assert.equal(o.hp,o.maxHp);assert.equal(o.astral,undefined);if(role==='ally'){assert.equal(rider.dead,true);assert.equal(save.worldBeasts.voidWalker.active,null);}else {assert.equal(rider.astralMount.status,'mounted','owner rule 2026-10-21: he stays on when the player dies');assert.equal(save.worldBeasts.voidWalker.active.tries,1);}}
});
