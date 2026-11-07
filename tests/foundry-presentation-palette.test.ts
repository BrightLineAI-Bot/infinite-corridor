import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

test('actual Foundry spawn preserves explicit presentation palette through schema-14 exact resume',()=>{
 const save=freshSave();save.seed='FOUNDRY-PALETTE-OVERRIDE';const game=new Game(save,1000);
 const spawn={id:'palette-witness',foundryId:'palette-witness',kind:'latticeHunter',foundryRole:'hostile',foundryModules:['floating'],body:'floating',movement:'hovering',attack:'threeShotCone',visualSeed:512,palette:4,x:game.player.x+2,y:game.player.y};
 const actor=game.createEnemyFromSpawn(spawn);assert.equal(actor.foundryPalette,4);assert.equal(actor.visualSeed,512);assert.equal(actor.foundryBody,'floating');
 const baseline=game.createEnemyFromSpawn({...spawn,palette:undefined});const withoutPalette=({foundryPalette,...rest})=>rest;assert.deepEqual(withoutPalette(actor),withoutPalette(baseline),'palette cannot alter combat fields');
 for(const palette of [NaN,Infinity,-1,5,'2',null])assert.equal(game.createEnemyFromSpawn({...spawn,palette}).foundryPalette,null);
 game.enemies=[actor];const out=game.exportSnapshot(1200);const resumed=new Game(migrateSave(JSON.parse(JSON.stringify(out))),5000);const restored=resumed.enemies.find(e=>e.id===actor.id);assert.ok(restored);assert.equal(restored.foundryPalette,4);assert.equal(restored.visualSeed,512);
});
