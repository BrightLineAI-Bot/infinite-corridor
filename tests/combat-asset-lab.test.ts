import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture, scenariosForLab, teleportTargets } from '../src/proving-ground-labs.ts';
import { freshSave } from '../src/types.ts';
import { normalizeItemUpgrade, rangedWeapon } from '../src/items.ts';

const SEED = 'CINDER-VERGE-47';
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const expected = {
  'blade-spark-ashling': { form: 'straight', spell: 'ember-ring', foe: 'ashling' },
  'pike-spindle-hound': { form: 'boomerang', spell: 'cinder-dart', foe: 'ashenHound' },
  'cleaver-bombard-crawler': { form: 'grenade', spell: 'fire-burst', foe: 'glassMite' },
  'blade-bombard-pallid-crawler': { form: 'grenade', spell: 'grave-sun', foe: 'pallidCrawler' },
  'blade-hammerfall-brute': { form: 'hammerfall+corridor-golem', spell: 'aegis', foe: 'rootBrute' },
  'cleaver-sweep-marshal': { form: 'great-sweep', spell: 'ember-ring', foe: 'hollowMarshal' },
  'cleaver-mirage-stalker': { form: 'mirage-of-blades', spell: 'shadow-boxing', foe: 'coilStalker' },
  'blade-orrery-sentinel': { form: 'aether-orrery', spell: 'gravity-well', foe: 'voidSentinel' },
  'pike-blunder-caster': { form: 'straight', spell: 'stillpoint', foe: 'mireApostle' },
  'blade-arc-wave-wisp': { form: 'blunderbuss+arc-wave', spell: 'fire-burst', foe: 'cinderWisp' },
  'fists-spindle-flying': { form: 'boomerang', spell: 'orbit-volley', foe: 'veilMoth' },
  'pike-echo-inspection': { form: 'boomerang', spell: 'cinder-dart', foe: 'ashling' },
  'cleaver-echo-inspection': { form: 'straight', spell: 'ember-ring', foe: 'ashling' },
  'salvage-echo-inspection': { form: 'straight', spell: 'ember-ring', foe: 'ashling' },
};

function assertSpellArtifact(game, id, now) {
  if (['ember-ring', 'cinder-dart', 'grave-sun', 'gravity-well', 'stillpoint'].includes(id)) assert.ok(game.effects.some((q) => q.kind === id), id);
  else if (id === 'fire-burst') assert.equal(game.projectiles.filter((q) => q.fireBomb).length, 5);
  else if (id === 'aegis') assert.ok(game.aegisUntil > now);
  else if (id === 'shadow-boxing') assert.ok(game.boxingUntil > now);
  else if (id === 'orbit-volley') assert.ok(game.orbit && !game.orbit.flight);
  else assert.fail(`Unhandled gallery spell ${id}`);
}

test('all combat asset scenarios resolve and emit their production tool and Spell A forms', () => {
  const scenarios = scenariosForLab('combat-assets');
  assert.equal(scenarios.length, 14);
  assert.deepEqual(scenarios.map((q) => q.id), Object.keys(expected));
  for (const scenario of scenarios) {
    const fixture = createLabFixture({ lab: 'combat-assets', scenario: scenario.id, seed: SEED, now: 1000 });
    const { game, diagnostics } = fixture, contract = expected[scenario.id], foe = game.enemies[0];
    assert.equal(diagnostics.resolved.tool.form, contract.form, scenario.id);
    assert.equal(diagnostics.resolved.spell.id, contract.spell, scenario.id);
    assert.equal(diagnostics.resolved.foe.kind, contract.foe, scenario.id);
    const direction = { x: foe.x - game.player.x, y: foe.y - game.player.y };
    assert.equal(game.fireSecondary(2000, direction, 'tool'), true, `${scenario.id}: Tool`);
    if (contract.form === 'mirage-of-blades') assert.equal(game.projectiles.filter((q) => q.mirage).length, 1);
    if (contract.form === 'great-sweep') { assert.ok(game.effects.some((q) => q.kind === 'great-sweep')); assert.equal(game.projectiles.filter((q) => q.mirage).length, 0); }
    if (contract.form === 'aether-orrery') assert.ok(game.projectiles.some((q) => q.orrery === 'orb'));
    if (contract.form === 'blunderbuss+arc-wave') assert.equal(game.projectiles.filter((q) => q.arcWave).length, 3);
    if (contract.form === 'grenade') assert.ok(game.projectiles.some((q) => q.path === 'grenade'));
    if (contract.form === 'hammerfall+corridor-golem') {
      assert.ok(game.effects.some((q) => q.kind === 'hammerfall'));
      for (let i = 0; i < 20 && !game.golem; i++) game.update(.05, idle, 2050 + i * 50);
      assert.ok(game.golem, 'the production hammer delay raises the Corridor Golem');
    }
    const castAt = 4000; game.lastUpdateNow = castAt;
    assert.equal(game.castSlot('a', castAt), true, `${scenario.id}: Spell A`);
    assertSpellArtifact(game, contract.spell, castAt);
  }
});

test('the opt-in Salvage inspection uses the real delayed cone Echo and freezes its quiet state',()=>{
  const {game,save,diagnostics}=createLabFixture({lab:'combat-assets',scenario:'salvage-echo-inspection',seed:SEED,now:1000}),foe=game.enemies[0];
  assert.equal(save.equipment.primary.name,'Salvage Blade');assert.equal(save.equipment.primary.glyphs[0],'echo');assert.equal(save.glyphCodex.glyphs.echo,true);assert.deepEqual(diagnostics.resolved.primary,{name:'Salvage Blade',shape:'cone',range:1.7,arc:100,damage:7});assert.equal(foe.hp,5000);assert.equal(foe.maxHp,5000);assert.equal(foe.hitStun,1e9);
  game.primaryAttack(1000,{x:save.lastAim.x,y:save.lastAim.y});const accepted=structuredClone(game.player.attackVisual),timer=game.glyphTimers.find(q=>q.kind==='strike');assert.ok(timer);assert.equal(timer.at,1250);assert.equal(timer.echoVisual,null);game.tickGlyphs(.001,1250);const cue=game.glyphVisuals.find(q=>q.kind==='primaryEcho');assert.ok(cue);assert.deepEqual(cue.actual,{x:game.player.meleeStrike.x,y:game.player.meleeStrike.y,dx:game.player.meleeStrike.dx,dy:game.player.meleeStrike.dy,range:1.7,arc:100,shape:'cone'});assert.equal(cue.memory,null);assert.deepEqual(game.player.attackVisual,accepted,'the delayed Echo never replays the accepted body');assert.equal(foe.hp,5000,'the five-tile inspection lane adds no hidden hit');
  const life=cue.life,hp=foe.hp;game.setPaused(true,1251);game.update(1,idle,2251);assert.equal(cue.life,life);assert.equal(foe.hp,hp);assert.deepEqual(game.player.attackVisual,accepted);game.setPaused(false,2251);
});

test('gallery placement is deterministic, clear and level without changing the generated grand hall', () => {
  const first = createLabFixture({ lab: 'combat-assets', scenario: 'cleaver-mirage-stalker', seed: SEED, now: 1000 });
  const again = createLabFixture({ lab: 'combat-assets', scenario: 'cleaver-mirage-stalker', seed: SEED, now: 1000 });
  const source = createLabFixture({ lab: 'close-view', scenario: 'grand-hall', seed: SEED, now: 1000 });
  assert.deepEqual(first.diagnostics.placement, again.diagnostics.placement);
  const { player, foe } = first.diagnostics.placement;
  assert.equal(player.elev, foe.elev);
  assert.equal(Math.hypot(player.x - foe.x, player.y - foe.y), 5);
  const tile = (fixture, x, y) => fixture.game.map.tiles.find((q) => q.x === x && q.y === y);
  for (let i = 0; i <= 5; i++) {
    const x = player.x + (foe.x - player.x) * i / 5, y = player.y + (foe.y - player.y) * i / 5, q = tile(first, x, y);
    assert.ok(q && !q.blocked && !q.hole && !q.environment && (q.elev || 0) === player.elev, `${x},${y}`);
  }
  const geometry = ({ game }) => ({ id: game.map.id, width: game.map.width, height: game.map.height, hall: game.map.hall, tiles: game.map.tiles, objects: game.map.objects, enemySpawns: game.map.enemySpawns });
  assert.deepEqual(geometry(first), geometry(source), 'the gallery retains the legacy Close View grand-hall geometry');
  assert.ok(first.game.map.tiles.some((q) => q.blocked) && first.game.map.tiles.some((q) => !q.blocked), 'the generated map was not flattened');
  const targets = teleportTargets(first);
  assert.deepEqual(targets[0], { id: 'gallery-start', label: 'Gallery start', x: player.x, y: player.y });
});

test('combat asset fixtures remain independent scratch state and cannot mutate a production save', () => {
  const production = freshSave(); production.name = 'Production canary'; production.seed = 'DO-NOT-TOUCH';
  const before = JSON.stringify(production), a = createLabFixture({ lab: 'combat-assets', scenario: 'blade-orrery-sentinel', seed: SEED, now: 1000 }), b = createLabFixture({ lab: 'combat-assets', scenario: 'blade-orrery-sentinel', seed: SEED, now: 1000 });
  assert.equal(JSON.stringify(production), before);
  assert.notEqual(a.save, b.save); assert.notEqual(a.game, b.game);
  a.save.currency = 999999; a.game.enemies[0].hp = 0;
  assert.notEqual(b.save.currency, a.save.currency); assert.ok(b.game.enemies[0].hp > 0);
  assert.equal(a.save.name, 'Proving Ground Wayfarer'); assert.equal(b.save.name, 'Proving Ground Wayfarer');
});

test('Forge Awakening-ready equipment display names match normalized production resolvers', () => {
  const fixture = createLabFixture({ lab: 'forge', scenario: 'awakening', seed: SEED, variant: 0, now: 1000 });
  assert.match(fixture.label, /Awakening-ready/);
  for (const slot of ['primary', 'secondary']) assert.deepEqual(fixture.save.equipment[slot], normalizeItemUpgrade(fixture.save.equipment[slot]), slot);
  assert.equal(fixture.save.equipment.secondary.name, 'Blunderbuss');
  assert.equal(rangedWeapon(fixture.save.equipment.secondary).name, fixture.save.equipment.secondary.name);
});
