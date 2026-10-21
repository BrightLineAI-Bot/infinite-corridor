import test from 'node:test';
import assert from 'node:assert/strict';

test('Gate spawn pinning, final-boss isolation and legacy resume', async () => {
  const { Game, pinDungeonLayout } = await import('../src/game.ts');
  const { freshSave, migrateSave } = await import('../src/types.ts');
  const s=freshSave();s.seed='GATE-PROBE';const old='dungeon:GATE-PROBE:g1:old',fresh='dungeon:GATE-PROBE:g1:new';s.consequences.dungeons[old]={visits:2,layoutVersion:1};assert.equal(pinDungeonLayout(s,old).gatePredatorSpawnThreshold,12);assert.equal(pinDungeonLayout(s,fresh).gatePredatorSpawnThreshold,24);assert.equal(pinDungeonLayout(s,fresh).gatePredatorSpawnThreshold,24);
  const g=new Game(s,0);const e=g.createEnemyFromSpawn({id:'gate-probe',kind:'gateRevenant',x:5,y:5,gatePredator:true},'dungeon');assert(e.maxHp>=320);assert.equal(e.damage,40);assert(!e.packKind&&!e.worldBeast&&!e.flying&&!e.phases);
  const boss=g.createEnemyFromSpawn({kind:'gateRevenant',x:5,y:5,boss:true,dungeonRole:'finalBoss'},'dungeon');assert.equal(boss.maxHp,533);assert.equal(boss.damage,43);assert(!boss.gateTuningVersion);
  g.enemies=[e];e.hp=123;e.gateAttack={phase:'active',left:1,move:'breath'};g.snapshotArea();let clone=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(0))));let resumed=new Game(clone,0);let r=resumed.enemies.find(x=>x.id===e.id);assert(r);assert.equal(r.hp,123);assert.equal(r.damage,40);assert.equal(r.gateAttack,null);
  // Legacy migrated snapshot without the new tuning marker must not inherit marker from a new spawn.
  const area=g.areaStateId();s.session.areas[area].enemies=[{...e,maxHp:260,hp:100,damage:36,gateTuningVersion:undefined}];g.loadArea('overworld',false);r=g.enemies.find(x=>x.id===e.id);assert(r.maxHp>=320);assert.equal(r.maxHp-r.hp,160);assert.equal(r.damage,40);

});

test('Gate follows all four section crossings on valid moving footprints', async () => {
  const { Game, footprintOpen } = await import('../src/game.ts');
  const { freshSave } = await import('../src/types.ts');
  const { updateGatePredator } = await import('../src/monster-pack.ts');
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const save=freshSave();save.seed='GATE-PROBE';const g=new Game(save,0);g.enemies=[g.createEnemyFromSpawn({id:'gate',kind:'gateRevenant',x:25,y:15,gatePredator:true},'dungeon')];Object.assign(g.enemies[0],{aggro:true,hp:123});g.transitionSection(dx,dy);const e=g.enemies.find(e=>e.gatePredator&&!e.dead);assert(e);assert(footprintOpen(g.map,32,e.x,e.y),JSON.stringify({dx,dy,e}));assert.equal(e.hp,123);const before={x:e.x,y:e.y};const candidates=g.map.tiles.filter(t=>!t.blocked&&footprintOpen(g.map,32,t.x,t.y));const dest=candidates.find(t=>Math.hypot(t.x-e.x,t.y-e.y)>4&&Math.hypot(t.x-e.x,t.y-e.y)<6);if(dest)Object.assign(g.player,{x:dest.x,y:dest.y});for(let i=0;i<120;i++)updateGatePredator(e,g.packWorld(1/60,i*1000/60));assert(Math.hypot(e.x-before.x,e.y-before.y)>.1);}
});

test('Gate disappears without rewards or rematches after player death', async () => {
  const {Game} = await import('../src/game.ts');
  const {freshSave,migrateSave} = await import('../src/types.ts');
  const s=freshSave();s.seed='GATE-END';const g=new Game(s,0);g.rx=7;g.ry=2;g.loadArea('overworld',false);const e=g.createEnemyFromSpawn({id:'gate-death',kind:'gateRevenant',gatePredator:true,x:10,y:10},'dungeon');e.aggro=true;g.enemies=[e];const currency=s.currency;g.player.hp=0;g.update(.001,{state:{x:0,y:0},consume:()=>false},1000);assert.equal(g.player.hp,s.maxHp);assert.equal(s.currency,currency);const old=s.session.areas['overworld:7:2:g1'].enemies.find(q=>q.id===e.id);assert(old.dead&&old.noRewards);g.rx=7;g.ry=2;g.loadArea('overworld',false);assert(!g.enemies.some(q=>q.id===e.id&&!q.dead));const restored=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(2000)))),2000);assert(!restored.enemies.some(q=>q.id===e.id&&!q.dead));
});

test('Installed dungeon death preserves Gate tombstones, major metadata and ordinary encounters', async () => {
  const {Game} = await import('../src/game.ts');
  const {freshSave} = await import('../src/types.ts');
  const idle={state:{x:0,y:0},consume:()=>false};
  let s=freshSave();s.seed='REVIEW-GATE-DEATH';let g=new Game(s,0);const id='dungeon:REVIEW-GATE-DEATH:g1:7:2:g152';s.session.activeDungeonId=id;s.session.dungeonReturn={rx:7,ry:2,x:16,y:16};g.loadArea('dungeon',false);const encounterVersion=g.map.encounterVersion,encounterCount=g.enemies.filter(e=>e.encounterSpawn).length;let gate=g.enemies.find(e=>e.gatePredator);assert(gate);gate.aggro=true;g.player.hp=0;g.update(.001,idle,1000);assert.equal(g.area,'dungeon');assert.equal(g.map.encounterVersion,encounterVersion);assert.equal(g.enemies.filter(e=>e.encounterSpawn).length,encounterCount);assert(!g.enemies.some(e=>e.gatePredator&&!e.dead));g.player.hp=0;g.update(.001,idle,3000);assert(!g.enemies.some(e=>e.gatePredator&&!e.dead));
  // Existing stronger actor metadata survives the ordinary-dungeon run reset.
  s=freshSave();s.seed='DUNGEON-BEAST-RESET';s.level=8;g=new Game(s,0);const did='dungeon:DUNGEON-BEAST-RESET:g1:7:2:room';s.session.activeDungeonId=did;s.session.dungeonReturn={rx:7,ry:2,x:16,y:16};s.worldBeasts.voidWalker.active={dungeon:did,tries:0,patience:179.9};g.loadArea('dungeon',false);let e=g.enemies.find(e=>e.worldBeast==='voidWalker');assert(e);Object.assign(e,{hp:25,maxHp:9000,damage:200,futureOwnerField:{keep:true},glyphBurn:{until:999999,dps:1,tick:0},glyphSlow:{until:999999,factor:.5},glyphBaseSpeed:1.1,aggro:true});g.player.hp=0;g.update(.001,idle,1000);e=g.enemies.find(e=>e.worldBeast==='voidWalker');assert(e);assert.equal(e.hp,9000);assert.equal(e.maxHp,9000);assert.equal(e.damage,200);assert(!e.glyphBurn&&!e.glyphSlow&&!e.glyphBaseSpeed);assert.deepEqual(e.futureOwnerField,{keep:true});assert.equal(s.worldBeasts.voidWalker.active.tries,1);assert.equal(s.worldBeasts.voidWalker.active.patience||0,0);
});

async function arena(width = 32) {
  const { Game } = await import('../src/game.ts');
  const { freshSave } = await import('../src/types.ts');
  const g = new Game(freshSave(), 0);
  g.area = width === 32 ? 'overworld' : 'dungeon';
  g.map = { width, height: 20, entry: { x: 2, y: 2 }, objects: [], enemySpawns: [], tiles: Array.from({ length: width * 20 }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'floor', blocked: false, elev: 0 })) };
  const e = g.createEnemyFromSpawn({ id: 'regression-gate', kind: 'gateRevenant', gatePredator: true, x: 7, y: 9.2 }, 'dungeon');
  e.aggro = true; g.enemies = [e]; g.packEffects = [];
  Object.assign(g.player, { x: 14, y: 9.2 });
  return { g, e };
}

test('Production Gate pathing detours footprint-blocking pillars even when point LOS is clear', async () => {
  const { updateGatePredator } = await import('../src/monster-pack.ts');
  for (const y of [9.2, 9.4, 9.6, 9.8, 10]) {
    const { g, e } = await arena(); e.y = g.player.y = y; e.gateGap = 999;
    g.map.tiles[10 * 32 + 10].blocked = true;
    for (let i = 0; i < 200; i++) updateGatePredator(e, g.packWorld(.05, i * 50));
    assert(Math.hypot(e.x - g.player.x, e.y - g.player.y) < 1.5, `pillar route y=${y}`);
  }
});

test('Production adapter catches base and +20% walking players despite attack windups', async () => {
  const { updateGatePredator } = await import('../src/monster-pack.ts');
  for (const speed of [2.4, 2.88]) {
    const { g, e } = await arena(256); e.x = 10; g.player.x = 18;
    let nearest = 8;
    for (let i = 0; i < 3600; i++) {
      g.player.x += speed / 60;
      updateGatePredator(e, g.packWorld(1 / 60, i * 1000 / 60));
      nearest = Math.min(nearest, Math.hypot(g.player.x - e.x, g.player.y - e.y));
      g.packEffects = []; // movement/cadence probe, not a damage simulation
    }
    assert(nearest < 1.5, `captures walking speed=${speed}`);
  }
});

test('Actual shelter branch ends Gate pursuit and cancels its mouth-fire', async () => {
  const { tickPackEffects } = await import('../src/monster-pack.ts');
  const { g, e } = await arena();
  for (let y = 8; y <= 11; y++) for (let x = 13; x <= 16; x++) g.map.tiles[y * 32 + x].structure = 'shackInterior';
  g.packEffects = [{ kind: 'gateBreath', owner: e.id, gateOwned: true, x: e.x, y: e.y, dx: 1, dy: 0, length: 7, radius: .5, life: 1, nextBite: 0, damage: 5 }];
  g.update(.001, { state: { x: 0, y: 0 }, consume: () => false }, 1000);
  assert(e.dead);
  g.packEffects = tickPackEffects(g.packEffects, g.packWorld(.05, 1050));
  assert.equal(g.packEffects.length, 0);
});
