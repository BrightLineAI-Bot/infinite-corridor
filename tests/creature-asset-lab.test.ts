import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { LABORATORIES, createLabFixture, scenariosForLab, teleportTargets } from '../src/proving-ground-labs.ts';

const seed='CINDER-VERGE-47', roster=['ashling','ashenHound','rootBrute','coilStalker','hollowMarshal','glassMite','sparkWarden','cinderWisp','veilMoth','voidSentinel','weepingSaint','hangedChoir','graveLantern','pallidCrawler','mirrorShade','amalgam','gnawingMaw','cinderSeraph','lumenWraith','veilSpinner','riftLynx','sunderjaw','thunderhorn','siegeBeetle','gloomwisp','gloomgorge','latticeHunter','archiveBehemoth','riftGrazer'];
const bodies=['quadruped','floating','segmented','tentacled','geometric','biomechanical'];
const idle={state:{x:0,y:0},consume:()=>false,held:()=>false};

test('Creature Asset Lab is separate, exhaustive and leaves the existing combat gallery unchanged',()=>{
  assert.equal(LABORATORIES.length,21);
  const cases=scenariosForLab('creature-assets');assert.equal(cases.length,47);assert.deepEqual(cases.slice(0,29).map(q=>q.id),roster);assert.deepEqual(cases.slice(29,35).map(q=>q.id),bodies.map(q=>`foundry-${q}`));assert.deepEqual(cases.slice(38).map(q=>q.id),['wayfarer-iron-fists','wayfarer-active-robot','wayfarer-empowered-suit','wayfarer-ember-form','corridor-golem','shadow-clone','aether-orrery','dungeon-reciter','elder-wanderer']);
  const combat=scenariosForLab('combat-assets');
  assert.equal(combat.length,14);
  assert.deepEqual(combat.slice(11).map(q=>q.id),['pike-echo-inspection','cleaver-echo-inspection','salvage-echo-inspection']);
  assert.deepEqual(combat.slice(0,11).map(q=>q.id),['blade-spark-ashling','pike-spindle-hound','cleaver-bombard-crawler','blade-bombard-pallid-crawler','blade-hammerfall-brute','cleaver-sweep-marshal','cleaver-mirage-stalker','blade-orrery-sentinel','pike-blunder-caster','blade-arc-wave-wisp','fists-spindle-flying']);
});

test('nine visible-actor cases activate their production state without claiming native completion',()=>{
  const make=(id)=>createLabFixture({lab:'creature-assets',scenario:id,seed,now:1000});
  let f=make('wayfarer-iron-fists');assert.equal(f.game.fistsEquipped(),true);assert.equal(f.diagnostics.visibleActor.state.fistsEquipped,true);
  f=make('wayfarer-active-robot');assert.equal(f.game.mechUp(),true);assert.equal(f.save.mech.empowered,undefined);
  f=make('wayfarer-empowered-suit');assert.equal(f.game.mechUp(),true);assert.equal(f.save.mech.empowered,true);assert.equal(f.diagnostics.visibleActor.state.expectedEmpowered,true);
  f=make('wayfarer-ember-form');assert.equal(f.save.magicSkills.active.id,'ember-form');assert.ok(f.save.magicSkills.active.remaining>0);
  f=make('corridor-golem');assert.ok(f.game.golem);assert.equal(f.diagnostics.visibleActor.state.tool,'Hammerfall');assert.equal(f.diagnostics.visibleActor.state.field,true);
  f=make('shadow-clone');assert.equal(f.game.shadowCloneActive(1000),true);assert.equal(f.diagnostics.visibleActor.state.spell,'shadow-clone');
  f=make('aether-orrery');assert.equal(f.game.isOrrery(),true);assert.ok(f.game.projectiles.some(q=>q.orrery));
  f=make('dungeon-reciter');assert.ok(f.game.map.objects.some(q=>q.id===f.diagnostics.visibleActor.state.objectId&&q.reciter));assert.equal(f.diagnostics.visibleActor.state.walkState,true);
  f=make('elder-wanderer');assert.ok(f.game.map.objects.some(q=>q.id===f.diagnostics.visibleActor.state.objectId&&q.elder));assert.equal(f.diagnostics.visibleActor.state.walkState,true);
  for(const id of scenariosForLab('creature-assets').slice(38).map(q=>q.id)){const q=make(id);assert.match(q.diagnostics.visibleActor.resolvedSource,/^production:/);assert.match(q.diagnostics.visibleActor.capability,/native completion not claimed/);assert.equal(teleportTargets(q)[0].id,'gallery-start');}
});

test('all 29 roster witnesses use production constructors and report actual resolved state without claiming completion',()=>{
  for(const kind of roster){const f=createLabFixture({lab:'creature-assets',scenario:kind,seed,now:1000}),d=f.diagnostics.roster,e=f.game.enemies[0];assert.equal(d.kind,kind);assert.equal(e.kind,kind);assert.equal(Number.isFinite(d.scale),true);assert.ok(d.form);assert.ok(d.palette!==null);assert.ok(d.movement);assert.ok(Array.isArray(d.actions)&&d.actions.length>0||kind==='riftGrazer');assert.match(d.capability,/fixture witness only/);assert.equal(teleportTargets(f)[0].id,'gallery-start');if(['gloomwisp','gloomgorge'].includes(kind)){assert.equal(e.packKind,true);assert.equal(d.source,'haunt-pack');assert.doesNotMatch(d.capability,/blocked/);}if(['latticeHunter','archiveBehemoth','riftGrazer'].includes(kind)){assert.equal(d.resolvedSource.pipeline,'admittedFoundrySpawn');assert.equal(d.resolvedSource.validation.ok,true);assert.equal(e.foundryValidated,true);}}
});

test('six Foundry morphology cases retain admitted pipeline body, movement and attack mechanics',()=>{
  const expected={quadruped:['hopping','meleeSwipe'],floating:['hovering','threeShotCone'],segmented:['orbiting','straightBolt'],tentacled:['stalking','sweepingBeam'],geometric:['stalking','arcBurst'],biomechanical:['stalking','straightBolt']};
  for(const body of bodies){const f=createLabFixture({lab:'creature-assets',scenario:`foundry-${body}`,seed,now:1000}),e=f.game.enemies[0],d=f.diagnostics.roster,[movement,attack]=expected[body];assert.equal(d.resolvedSource.pipeline,'admittedFoundrySpawn');assert.equal(d.resolvedSource.validation.ok,true);assert.equal(e.foundryValidated,true);assert.equal(e.foundryBody,body);assert.equal(e.foundryMovement,movement);assert.equal(e.foundryAttack,attack);assert.ok(e.foundryModules.includes(body));}
});

test('decorated scenes carry real rare, shaman, ward, guardian and Drone Swarm runtime state',()=>{
  const ward=createLabFixture({lab:'creature-assets',scenario:'spark-shaman-ward',seed,now:1000});assert.equal(ward.game.enemies.length,2);const rare=ward.game.enemies.find(q=>q.wardBy),shaman=ward.game.enemies.find(q=>q.fracShaman);assert.equal(rare.fracRank,'rare');assert.equal(shaman.kind,'sparkWarden');assert.equal(rare.wardBy,shaman.id);ward.game.update(.016,idle,1100);assert.equal(rare.warded,true);assert.equal(rare.untargetable,true);
  const drone=createLabFixture({lab:'creature-assets',scenario:'rare-drone-swarm',seed,now:1000}),de=drone.game.enemies[0];assert.equal(de.fracRank,'rare');assert.deepEqual(de.affixes,['droneSwarm']);assert.equal(drone.diagnostics.roster.affixes[0],'droneSwarm');
  const guardian=createLabFixture({lab:'creature-assets',scenario:'guardian-volcanic',seed,now:1000}),ge=guardian.game.enemies[0];assert.equal(ge.dungeonRole,'gateWarden');assert.equal(ge.fracRank,'rare');assert.deepEqual(ge.affixes,['volcanic']);
});

test('creature gallery preserves generated grand-hall geometry, deterministic lane and scratch isolation',()=>{
  const a=createLabFixture({lab:'creature-assets',scenario:'foundry-tentacled',seed,now:1000}),b=createLabFixture({lab:'creature-assets',scenario:'foundry-tentacled',seed,now:1000}),source=createLabFixture({lab:'close-view',scenario:'grand-hall',seed,now:1000});assert.deepEqual(a.diagnostics.placement,b.diagnostics.placement);
  const geometry=({game})=>({id:game.map.id,width:game.map.width,height:game.map.height,hall:game.map.hall,tiles:game.map.tiles,objects:game.map.objects,enemySpawns:game.map.enemySpawns});assert.deepEqual(geometry(a),geometry(source));assert.ok(a.game.map.tiles.some(q=>q.blocked)&&a.game.map.tiles.some(q=>!q.blocked));const{player,foe}=a.diagnostics.placement;assert.equal(player.elev,foe.elev);assert.equal(Math.hypot(player.x-foe.x,player.y-foe.y),5);
  const production=freshSave();production.name='Production canary';production.seed='DO-NOT-TOUCH';const before=JSON.stringify(production);a.save.currency=999999;a.game.enemies[0].hp=0;assert.equal(JSON.stringify(production),before);assert.notEqual(b.save.currency,a.save.currency);assert.ok(b.game.enemies[0].hp>0);assert.equal(a.save.name,'Proving Ground Wayfarer');
});


test('timed visible-actor fixtures use the supplied long-running browser clock',()=>{
 for(const now of [100000,1000000]){
  const clone=createLabFixture({lab:'creature-assets',scenario:'shadow-clone',seed,now});assert.equal(clone.game.shadowCloneActive(now),true);assert.ok(clone.game.shadowClone.until>now);
  const golem=createLabFixture({lab:'creature-assets',scenario:'corridor-golem',seed,now});assert.ok(golem.game.golem.start>now&&golem.game.golem.start<now+1000,"the existing rise delay is anchored after the fixture clock");
  const ember=createLabFixture({lab:'creature-assets',scenario:'wayfarer-ember-form',seed,now});assert.equal(ember.game.save.magicSkills.active.id,'ember-form');assert.ok(ember.game.save.magicSkills.active.remaining>0);
 }
});
