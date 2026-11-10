import test from 'node:test';
import assert from 'node:assert/strict';
import { generateItem, isValidItem, ORDINARY_MONSTER_LOOT, primaryProfile, PRIMARY_PROFILES } from '../src/items.ts';
import { freshSave } from '../src/types.ts';
import { Game, ordinaryMonsterGearDrop, equipInventoryItem } from '../src/game.ts';
import { serializeSave, deserializeSave } from '../src/save-codec.ts';

test('Salvage Blade is a deterministic early ordinary-monster gear drop without perturbing its item roll', () => {
  let salvage = 0;
  for (let i = 0; i < 4000; i++) {
    const seed = `SALVAGE:ashling:${i}`;
    const base = generateItem(seed, 1);
    const ordinary = generateItem(seed, 1, { ordinaryMonster: true });
    assert.deepEqual(ordinary, generateItem(seed, 1, { ordinaryMonster: true }), 'ordinary roll is deterministic');
    if (ordinary.name !== 'Salvage Blade') continue;
    salvage++;
    assert.equal(ordinary.slot, 'primary');
    assert.equal(ordinary.property, 'steady');
    assert.equal(isValidItem(ordinary), true);
    for (const key of ['id', 'slot', 'power', 'tier', 'affixes']) assert.deepEqual(ordinary[key], base[key], `${key} stays on the established roll`);
  }
  assert.equal(ORDINARY_MONSTER_LOOT.salvageBladePrimaryShare, .5);
  assert.ok(salvage / 4000 > .065 && salvage / 4000 < .1, `${salvage} of 4000 ordinary drops`);
});

test('the opt-in channel leaves caches, shops and special monster rolls unchanged', () => {
  for (let i = 0; i < 500; i++) {
    const seed = `UNCHANGED:${i}`;
    assert.deepEqual(generateItem(seed, 1), generateItem(seed, 1, null));
  }
  const ordinary = { id: 'ashling-1', kind: 'ashling' };
  assert.equal(ordinaryMonsterGearDrop(ordinary), true);
  for (const special of [
    { boss: true }, { elite: true }, { eliteId: 'elite-1' }, { unique: true }, { worldBoss: true }, { worldBeast: 'voidWalker' },
    { questingBeast: true }, { stalker: true }, { seaKind: 'leviathan' }, { apertureEncounter: true },
    { fracRank: 'champion' }, { fracReinforcement: true }, { domainReinforcement: true }, { summonedBy: 'owner' }, { noRewards: true },
    { dungeonRole: 'guardian' },
  ]) assert.equal(ordinaryMonsterGearDrop({ ...ordinary, ...special }), false, JSON.stringify(special));
});

test('an ordinary Ashling defeat awards a valid Salvage Blade through the existing inventory path',()=>{
  const save=freshSave();save.seed='SALVAGE';
  const g=new Game(save,0),n=Array.from({length:400},(_,i)=>i).find(i=>generateItem(`SALVAGE:ashling:${i}`,1,{ordinaryMonster:true}).name==='Salvage Blade');
  assert.ok(Number.isInteger(n));
  save.dropCounter=n;
  const enemy=g.createEnemyFromSpawn({id:'salvage-drop-ashling',kind:'ashling',x:18,y:16},'overworld');
  g.enemies=[enemy];g.defeatEnemy(enemy);
  const loot=save.inventory.find(o=>o.name==='Salvage Blade');
  assert.ok(loot&&isValidItem(loot));
  assert.equal(save.dropCounter,n+1);
  assert.equal(equipInventoryItem(save,save.inventory.indexOf(loot)),true);
  const equipped=deserializeSave(serializeSave(save)).equipment.primary;
  assert.equal(equipped.id,loot.id);
  assert.equal(equipped.name,'Salvage Blade');
  assert.equal(primaryProfile(equipped),PRIMARY_PROFILES['salvage-blade']);
});
