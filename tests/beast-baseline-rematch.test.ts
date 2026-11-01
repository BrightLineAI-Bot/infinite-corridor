import test from 'node:test';
import assert from 'node:assert/strict';

test('Level-eight floor, Questing dominance, simultaneous attempts and production fresh rematches', async () => {
  const { Game, characterStats } = await import('../src/game.ts');
  const { freshSave, migrateSave } = await import('../src/types.ts');
  const { WORLD_BEASTS, WORLD_BEAST_IDS, tuneWorldBeast, worldBeastPlayerFell, worldBeastForDungeon, standardHit } = await import('../src/world-beasts.ts');
  const { tuneQuestingBeast, QUESTING_BEAST } = await import('../src/questing-beast.ts');
  const { createCombatant } = await import('../src/combat.ts');
  let combos=0;for(const level of [1,8,20,50])for(const power of [6,20,50])for(const guard of [.025,.3,.75]){const save=freshSave();save.level=level;save.maxHp=60+(level-1)*6;save.equipment.primary.power=power;const stats={...characterStats(save),damageReduction:guard},q=createCombatant('questingBeast',0,0,true);tuneQuestingBeast(q,save,stats);for(const id of WORLD_BEAST_IDS){const e=createCombatant(id,0,0,true);tuneWorldBeast(e,save,id,stats);assert(q.maxHp>e.maxHp);assert(q.damage>e.damage);assert(e.damage*(1-guard)>=53);/* release 307: damage ×.9 */const refHP=Math.round(standardHit(Math.max(8,level))*WORLD_BEASTS[id].hitsToKill+WORLD_BEASTS[id].hpPerLevel*Math.max(8,level));assert(e.maxHp>=Math.round(refHP*.5));/* release 307: health halved; release 692+: counted in a standard Wayfarer's blows, not the weapon's */assert(q.attackGap<e.attackGap)}combos++}
  // Each participant spends one attempt, with no early return skipping a simultaneous beast.
  const s=freshSave();for(const id of ['psychicCrystal','voidWalker'])s.worldBeasts[id].active={rx:7,ry:2,tries:0};for(let attempt=1;attempt<=4;attempt++){/* release 307: four tries */worldBeastPlayerFell(s,7,2,['psychicCrystal','voidWalker']);for(const id of ['psychicCrystal','voidWalker'])assert.equal(s.worldBeasts[id].active?.tries??4,attempt)}assert(!s.worldBeasts.psychicCrystal.active&&!s.worldBeasts.voidWalker.active);
  // Production death snapshot/re-entry, including Questing + ordinary beast, wounded non-death reload, and third departure.
  const save=freshSave();save.seed='GATE-BEAST-DEATH';const g=new Game(save,0);const idle={state:{x:0,y:0},consume:()=>false};let now=1000;
  for(let attempt=1;attempt<=4;attempt++){ // release 307: four tries
    g.rx=7;g.ry=2;save.questingBeast.active={rx:7,ry:2,tries:attempt-1};save.worldBeasts.morphingBlob.active={rx:7,ry:2,tries:attempt-1,patience:179.9};g.loadArea('overworld',false);
    const q=g.createEnemyFromSpawn({id:'questing-beast:0',kind:'questingBeast',questingBeast:true,boss:true,x:10,y:10},'overworld');const b=g.createEnemyFromSpawn({id:'world-beast:morphingBlob:0',kind:'morphingBlob',worldBeast:'morphingBlob',boss:true,x:12,y:10},'overworld');q.hp=30;b.hp=40;g.enemies=[q,b];g.player.hp=0;g.player.x=16;g.player.y=16;g.update(.001,idle,now+=1000);
    assert.equal(g.player.hp,save.maxHp);const snapshot=save.session.areas['overworld:7:2:g1'];assert(snapshot);for(const e of snapshot.enemies){assert(attempt<4?e.hp<e.maxHp:e.dead&&e.noRewards)} // release 427: it keeps its wounds
    if(attempt<4)assert.equal(save.worldBeasts.morphingBlob.active.patience||0,0);
    assert.equal(save.questingBeast.active?.tries??4,attempt);assert.equal(save.worldBeasts.morphingBlob.active?.tries??4,attempt);
    g.rx=7;g.ry=2;g.loadArea('overworld',false);
    const live=g.enemies.filter(e=>(e.questingBeast||e.worldBeast==='morphingBlob')&&!e.dead);
    if(attempt<4){assert.equal(live.length,1);assert(live.every(e=>e.hp<e.maxHp));}else assert.equal(live.length,0);
    const restored=migrateSave(JSON.parse(JSON.stringify(save)));assert.equal(restored.worldBeasts.morphingBlob.active?.tries??4,attempt);
  }


  // Test each natural spawning family independently for full-health return.
  for(const kind of ['questingBeast','morphingBlob']) { const save=freshSave();save.seed='GATE-BEAST-DEATH';const g=new Game(save,0);g.rx=7;g.ry=2;g.loadArea('overworld',false);if(kind==='questingBeast')save.questingBeast.active={rx:7,ry:2,tries:0};else {save.questingBeast.active=null;save.questingBeast.cooldown=999;save.worldBeasts[kind].active={rx:7,ry:2,tries:0}}
  const e=g.createEnemyFromSpawn({id:kind==='questingBeast'?'questing-beast:0':'world-beast:morphingBlob:0',kind,questingBeast:kind==='questingBeast',worldBeast:kind==='questingBeast'?undefined:kind,boss:true,x:10,y:10},'overworld');e.hp=40;g.enemies=[e];g.player.hp=0;g.update(.001,idle,10000);g.rx=7;g.ry=2;g.loadArea('overworld',false);const r=g.enemies.find(q=>q.id===e.id);assert(r);assert.ok(Math.abs(r.hp-40)<=1&&r.hp<r.maxHp,'release 427: back as hurt as it was');r.hp=30;g.snapshotArea();g.loadArea('overworld',false);assert.equal(g.enemies.find(q=>q.id===e.id).hp,30); }

});

test('The level-eight reference is attainable with seven real level-ups and starter equipment', async () => {
  const { freshSave } = await import('../src/types.ts');
  const { awardExperience, characterStats } = await import('../src/game.ts');
  const { beastTuningReference, BEAST_BASELINE, tuneWorldBeast } = await import('../src/world-beasts.ts');
  const save = freshSave();
  for (let i = 0; i < 7; i++) assert.equal(awardExperience(save, save.nextXp), 1);
  const stats = characterStats(save);
  assert.equal(save.level, 8);
  assert.equal(save.maxHp, 102);
  assert.equal(save.equipment[save.activeWeaponSlot].power + stats.meleeBonus, 16);
  assert.equal(stats.damageReduction, .025);
  assert.deepEqual(beastTuningReference(save, stats), { level: 8, perHit: 16, maxHp: 102, guard: .025 });
  assert.equal(BEAST_BASELINE.damageFloor, 60, 'separate provisional balance floor, not an attained player damage value');
  const stronger = { hp: 12, maxHp: 9000, damage: 200 };
  tuneWorldBeast(stronger, save, 'voidWalker', stats);
  assert.equal(stronger.maxHp, 4500); assert.equal(stronger.damage, 180); // release 307: a stronger body is halved too (health) and cut 10% (damage)
});
