import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, generatePinnedDungeon } from '../src/game.ts';
import { registerDungeonBosses, recordDungeonBossDefeat, claimDungeonPayoff, installCompletionExit } from '../src/dungeon-completion.ts';

test('completion requires all bosses across levels and awards existing progression only once',()=>{
  const save=freshSave(), history={}, a={id:'a',boss:true,x:8,y:8}, b={id:'b',boss:true,x:12,y:12};
  registerDungeonBosses(history,[{enemySpawns:[a]},{enemySpawns:[b]}]);
  assert.equal(recordDungeonBossDefeat(history,b),false);
  assert.equal(claimDungeonPayoff(save,history),false);
  const map={objects:[],enemySpawns:[a],entry:{x:4,y:5}};
  assert.equal(installCompletionExit(map,history),null);
  assert.equal(recordDungeonBossDefeat(history,a),true);
  const before=save.currency;
  assert.equal(claimDungeonPayoff(save,history),true);
  assert.equal(save.currency,before+10);
  assert.equal(save.materials.armorSphere,1);
  const restored=JSON.parse(JSON.stringify(history));
  assert.equal(claimDungeonPayoff(save,restored),false);
  assert.equal(installCompletionExit(map,restored,a).completionExit,true);
  installCompletionExit(map,restored,b);assert.equal(map.objects.length,1);
});

test('deep payoff never duplicates existing deep spheres',()=>{
  const save=freshSave(),history={deep:{rewardClaimed:true},combatClear:{completed:true,rewardClaimed:false}};
  save.materials.weaponSphere=1;save.materials.armorSphere=1;
  claimDungeonPayoff(save,history,true);
  assert.equal(save.materials.weaponSphere,1);assert.equal(save.materials.armorSphere,1);
});

test('migration pins visited and active historical layouts while new IDs use deterministic variation',()=>{
  const raw=freshSave(),id=`dungeon:${raw.seed}:g1`;
  raw.consequences.dungeons[id]={visits:2,generatorVersion:2};
  raw.session.areas[id]={enemies:[],objects:{}};
  const save=migrateSave(JSON.parse(JSON.stringify(raw)));
  assert.equal(save.consequences.dungeons[id].layoutVersion,0);
  assert.equal(generatePinnedDungeon(save,id).layoutVersion||0,0);
  const newId=`dungeon:${save.seed}:g1:3:4:new-gate`;
  const first=generatePinnedDungeon(save,newId),next=generatePinnedDungeon(migrateSave(JSON.parse(JSON.stringify(save))),newId);
  assert.equal(save.consequences.dungeons[newId].layoutVersion,1);
  assert.deepEqual(first.tiles,next.tiles);assert.deepEqual(first.enemySpawns,next.enemySpawns);
});

test('actual completion exit is gated, persisted and returns to the exact safe entrance',()=>{
  const save=freshSave(),game=new Game(save),id='dungeon:completion-test:g1';
  save.session.activeDungeonId=id;save.session.dungeonReturn={rx:0,ry:0,x:17,y:17};
  game.loadArea('dungeon');game.prepareDungeonCompletion();
  const history=save.consequences.dungeons[id];
  const fake={id:'expedition-fast-exit',kind:'exit',x:game.player.x,y:game.player.y,actions:['exit'],completionExit:true};
  game.map.objects.push(fake);assert.equal(game.interact('exit',fake.id).ok,false);game.map.objects.pop();
  for(const e of game.enemies.filter(e=>e.boss)){e.dead=true;game.defeatEnemy(e)}
  assert.equal(history.combatClear.completed,true);
  const exit=game.map.objects.find(o=>o.completionExit);assert.ok(exit);
  const marks=save.currency,spheres={...save.materials};
  game.snapshotArea();game.loadArea('dungeon',false);
  assert.equal(game.enemies.some(e=>e.boss),false,'cleared guardians do not respawn and farm their reward');
  assert.equal(save.currency,marks);assert.deepEqual(save.materials,spheres);
  const restoredExit=game.map.objects.find(o=>o.completionExit);game.player.x=restoredExit.x;game.player.y=restoredExit.y;
  assert.equal(game.interact('exit',restoredExit.id).ok,true);
  assert.equal(game.area,'overworld');assert.equal(game.rx,0);assert.equal(game.ry,0);
  assert.equal(game.player.x,17);assert.equal(game.player.y,17);
});

test('defeating the deep final first leaves completion, spheres and exit gated until every wing falls',()=>{
  const save=freshSave(),game=new Game(save),id='dungeon:final-first:g1:1:1:deep-v1';
  save.session.activeDungeonId=id;save.session.dungeonReturn={rx:0,ry:0,x:17,y:17};game.loadArea('dungeon');
  const history=save.consequences.dungeons[id],final=game.enemies.find(e=>e.dungeonRole==='finalBoss');
  final.dead=true;game.defeatEnemy(final);
  assert.equal(history.combatClear.completed,false);assert.equal(history.deep.completed,false);
  assert.equal(save.materials.weaponSphere,0);assert.equal(game.map.objects.some(o=>o.completionExit),false);
  for(const e of game.enemies.filter(e=>e.dungeonRole==='wingMiniboss')){e.dead=true;game.defeatEnemy(e)}
  assert.equal(history.combatClear.completed,true);assert.equal(history.deep.completed,true);
  assert.equal(save.materials.weaponSphere,1);assert.equal(save.materials.armorSphere,1);
  assert.ok(game.map.objects.find(o=>o.completionExit));
});
