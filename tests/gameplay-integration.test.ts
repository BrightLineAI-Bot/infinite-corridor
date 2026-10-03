import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, updateEnemyAI, updateProjectiles, enemyProjectilePattern } from '../src/game.ts';
import { hashSeed } from '../src/random.ts';
import { createCombatant, enemyMeleeGeometry, pointInEnemyMelee } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { drawRangedEffects } from '../src/combat-visuals.ts';
function floor(){return {width:16,height:16,tiles:Array.from({length:256},(_,i)=>({x:i%16,y:Math.floor(i/16),blocked:false})),objects:[]};}
test('AI resolves committed melee against its advertised footprint and walls',()=>{
  const map=floor(),make=()=>Object.assign(createCombatant('hollowMarshal',5,5),{telegraph:.01,meleePhase:{id:'longReach',aim:{x:1,y:0},target:{x:7,y:5}}});
  const e=make(),target={x:7,y:5};assert.equal(pointInEnemyMelee(enemyMeleeGeometry(e),target),true);
  assert.equal(updateEnemyAI(e,target,map,16,.02,100),true);
  assert.equal(updateEnemyAI(make(),{x:5,y:7},map,16,.02,100),false);
  map.tiles[5*16+6].blocked=true;assert.equal(updateEnemyAI(make(),target,map,16,.02,100),false);
});

test('tentacled ranged creatures switch to a committed close stab and keep shots at distance',()=>{
  const map=floor(),enemy=createCombatant('voidSentinel',5,5),target={x:7,y:5};let shots=0;
  updateEnemyAI(enemy,target,map,16,0,0,null,()=>shots++);
  assert.equal(enemy.meleePhase.id,'longReach');assert.ok(enemyMeleeGeometry(enemy).range>2.15);
  assert.equal(updateEnemyAI(enemy,target,map,16,2,2000,null,()=>shots++),true);assert.equal(shots,0);
  const ranged=createCombatant('voidSentinel',5,5);updateEnemyAI(ranged,{x:10,y:5},map,16,0,0);
  assert.equal(ranged.meleePhase,null);updateEnemyAI(ranged,{x:10,y:5},map,16,2,2000,null,()=>shots++);assert.equal(shots,1);
});
test('projectile motion collides with walls instead of hitting through cover',()=>{
  const map=floor();map.tiles[5*16+7].blocked=true;
  const enemy=Object.assign(createCombatant('sparkWarden',5,5),{shotSequence:0}),shots=enemyProjectilePattern(enemy,{x:1,y:0},0),player={x:9,y:5};let hits=0;
  const remaining=updateProjectiles(shots,[],map,16,1,()=>{},()=>{},player,()=>hits++);
  assert.equal(hits,0);assert.equal(remaining.length,0);
});

test('player fire observes the shared projectile ceiling without deleting existing shots',()=>{
  const game=new Game(freshSave());game.area='dungeon';game.projectiles=Array.from({length:32},(_,id)=>({id,hostile:id%2===0,dead:false}));
  const before=structuredClone(game.projectiles);assert.equal(game.fireSecondary(100000,{x:1,y:0}),false);assert.deepEqual(game.projectiles,before);
});
test('real saved enemy tuning survives migration without stacking or losing partial health',()=>{
  const save=freshSave(),game=new Game(save);save.session.activeDungeonId='dungeon:tuning:g1';game.loadArea('dungeon');
  const e=game.enemies[0];e.hp-=3;game.snapshotArea();const damage=e.damage,hp=e.hp;
  const restored=new Game(migrateSave(JSON.parse(JSON.stringify(game.exportSnapshot(0)))));
  const copy=restored.enemies.find(q=>q.id===e.id);assert.equal(copy.damage,damage);assert.equal(copy.hp,hp);
});
test('Proving Ground exposes varied topology and shared visible projectile effects',()=>{
  const f=createLabFixture({lab:'ordinary-dungeon',scenario:'kiln',seed:'PLAYABLE',sizeProfile:'compact'});
  assert.equal(f.game.map.layoutVersion,1);assert.ok(f.game.map.layoutVariation.rooms.length);
  f.game.projectiles=[{x:f.game.player.x,y:f.game.player.y,hostile:true,path:'straight',homingTurnRate:1}];
  let arcs=0;const ctx=new Proxy({}, {get:(o,k)=>k==='arc'?()=>arcs++:()=>{},set:()=>true});
  drawRangedEffects(ctx,f.game,390,844);assert.equal(arcs,1);
});

test('Proving Ground bosses use the same hydrated combat stats as gameplay',()=>{
  const f=createLabFixture({lab:'threefold',seed:'BOSS-PARITY'});
  for(const spawn of f.game.map.enemySpawns.filter(e=>e.boss)) {
    const enemy=f.game.enemies.find(e=>e.id===spawn.id),expected=f.game.createEnemyFromSpawn(spawn,'dungeon');
    assert.equal(enemy.damage,expected.damage);assert.equal(enemy.maxHp,expected.maxHp);assert.equal(enemy.attackCooldownScale,expected.attackCooldownScale);
  }
});

test('bounded crowded combat keeps simulation, projectile and summon budgets',()=>{
  const f=createLabFixture({lab:'combat',scenario:'knifeChoir',seed:'CROWDED',variant:5}),g=f.game;
  g.player.invulnerableUntil=1e9;
  const input={state:{x:0,y:0},consume:()=>false,reset:()=>{}};
  for(let i=0;i<600;i++) {
    g.update(1/60,input,1000+i*1000/60);
    assert.ok(g.performanceStats.activeEnemies <= 7);
    assert.ok(g.projectiles.length <= 32);
    assert.ok(g.enemies.filter(e=>!e.dead&&e.summonedBy).length <= 6);
  }
});

test('cistern guardian identity stays pinned after global elite state changes and completion reload',()=>{
  const save=freshSave();let id;
  for(let i=0;i<100;i++){const candidate=`dungeon:${save.seed}:g1:${i}:3:cistern`;if(hashSeed(`${save.seed}:elite-guardian:${candidate}`)%5===0){id=candidate;break}}
  assert.ok(id);save.consequences.dungeons[id]={generatorVersion:4,dungeonRecipe:'cistern',layoutVersion:1,visits:1};
  const game=new Game(save);save.session.activeDungeonId=id;game.loadArea('dungeon');
  const guardian=game.enemies.find(e=>e.boss);assert.equal(guardian.kind,'gravitantBell');
  const stableId=guardian.id;save.elites.defeated.gravitantBell=true;game.snapshotArea();game.loadArea('dungeon',false);
  assert.equal(game.enemies.find(e=>e.id===stableId).kind,'gravitantBell');
  const final=game.enemies.find(e=>e.id===stableId);final.dead=true;game.defeatEnemy(final);game.snapshotArea();game.loadArea('dungeon',false);
  assert.equal(save.consequences.dungeons[id].combatClear.completed,true);
  assert.ok(game.map.objects.find(o=>o.completionExit));assert.equal(game.enemies.some(e=>e.boss),false);
});

test('historical Bell identity preserves wounds and defeated state during migration',()=>{
  for(const dead of [false,true]) {
    const save=freshSave(),id='dungeon:old-bell:g1:2:3:cistern';
    save.consequences.dungeons[id]={generatorVersion:4,dungeonRecipe:'cistern',visits:2};
    const old=Object.assign(createCombatant('gravitantBell',16,18,true),{hp:19,dead,id:'gravitantBell-16-18'});
    save.session.areas[id]={enemies:[old],objects:{}};save.session.activeDungeonId=id;save.session.area='dungeon';
    const migrated=migrateSave(JSON.parse(JSON.stringify(save))),game=new Game(migrated);
    assert.equal(migrated.consequences.dungeons[id].layoutVersion,0);
    const bell=game.enemies.find(e=>e.id===old.id);
    if(dead){assert.equal(bell,undefined);assert.equal(migrated.consequences.dungeons[id].combatClear.completed,true)}
    else{assert.ok(bell);assert.equal(bell.hp,19);assert.equal(bell.damage,25);assert.equal(bell.dungeonThreatTuningVersion,1)}
  }
});
