import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { createLabFixture, scenariosForLab } from '../src/proving-ground-labs.ts';
import { normalizeAttackVisual, stampAttackVisual } from '../src/action-motion.ts';
import { closeViewPlayerAction } from '../src/close-view.ts';
import { orreryPress, tickOrrery } from '../src/tool-forms.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const fixture = (scenario) => createLabFixture({ lab: 'combat-assets', scenario, seed: 'ATTACK-VISUAL', now: 1000 });
const copy = (value) => structuredClone(value);
const future = { preserved: ['later'] };
function roundTrip(game, now) {
  const { main, puts } = splitSnapshot(snapshotSave(game.exportSnapshot(now)));
  const result = validateJourney(assembleSave(copy(main), new Map(copy(puts))));
  assert.equal(result.health, 'healthy');
  return result.save;
}

test('attack presentation metadata is additive at schema 14 and validates without discarding valid future keys', () => {
  const fresh = freshSave();
  assert.equal(fresh.version, 14);
  assert.equal(fresh.session.playerRuntime.attackVisual, null);
  const legacy = freshSave(); legacy.session.playerRuntime.attackMotion = 120; legacy.session.playerRuntime.meleeMotion = 120; delete legacy.session.playerRuntime.attackVisual;
  const legacyGame = new Game(migrateSave(legacy), 5000);
  assert.equal(closeViewPlayerAction(legacyGame, 5000).legacy, true, 'real legacy construction keeps its mid-attack presentation');
  const raw = { profile: 'future-gesture', durationMs: 240, aim: { x: .6, y: .8, futureAim: future }, futureRecord: future };
  const save = freshSave(); save.session.playerRuntime.attackMotion = 120; save.session.playerRuntime.attackVisual = raw;
  save.session.playerRuntime.futurePeer = future; save.futureTop = future;
  const migrated = migrateSave(copy(save));
  assert.deepEqual(migrated.session.playerRuntime.attackVisual, raw);
  const game = new Game(migrated, 2000);
  const out = roundTrip(game, 2050);
  assert.deepEqual(out.session.playerRuntime.attackVisual, raw);
  assert.deepEqual(out.session.playerRuntime.futurePeer, future);
  assert.deepEqual(out.futureTop, future);
  for (const invalid of [[], { ...raw, profile: '' }, { ...raw, profile: '../unsafe' }, { ...raw, durationMs: Infinity }, { ...raw, durationMs: 0 }, { ...raw, durationMs: 5001 }, { ...raw, aim: { x: NaN, y: 1 } }, { ...raw, aim: { x: 0, y: 0 } }, { ...raw, aim: [] }]) {
    assert.equal(normalizeAttackVisual(invalid, 120), null);
  }
  assert.deepEqual(normalizeAttackVisual({ ...raw, weaponKind: 'future-primary' }, 120), { ...raw, weaponKind: 'future-primary' });
  assert.equal(normalizeAttackVisual({ ...raw, weaponKind: {} }, 120), null);
  assert.deepEqual(normalizeAttackVisual({ ...raw, poseMs: 1234 }, 120), { ...raw, poseMs: 1234 });
  for (const poseMs of [-1, Infinity, {}, 1e12 + 1]) assert.equal(normalizeAttackVisual({ ...raw, poseMs }, 120), null);
  assert.deepEqual(normalizeAttackVisual({ ...raw, facingYaw: -1.2 }, 120), { ...raw, facingYaw: -1.2 });
  for (const facingYaw of [Infinity, {}, Math.PI * 4 + .01]) assert.equal(normalizeAttackVisual({ ...raw, facingYaw }, 120), null);
  const fist={...raw,fistStep:2,fistLead:'left',fistCharge:.75,fistGaitPhase:1.25,fistSpeed:.8,presentationCancelled:false};assert.deepEqual(normalizeAttackVisual(fist,120),fist);
  assert.equal(normalizeAttackVisual({...raw,presentationCancelled:'false'},120),null);
  for(const bad of [{fistStep:0},{fistStep:4},{fistLead:'future'},{fistCharge:1.1},{fistGaitPhase:99},{fistSpeed:-1}])assert.equal(normalizeAttackVisual({...raw,...bad},120),null);
  const handed=freshSave();handed.fistOpeningHand='left';handed.futureTop=future;assert.equal(migrateSave(copy(handed)).fistOpeningHand,'left');handed.fistOpeningHand='malformed';const cleaned=migrateSave(copy(handed));assert.equal(cleaned.fistOpeningHand,null);assert.deepEqual(cleaned.futureTop,future);
  assert.equal(normalizeAttackVisual(raw, 241), null, 'metadata cannot rewrite an incompatible authoritative clock');
  const player = { attackUntil: 240, meleeUntil: 230, meleeStrike: { dx: 1, dy: 0 }, attackReadyAt: 400 };
  const before = copy(player);
  stampAttackVisual(player, 'mirage', 200, { x: 3, y: 4 });
  assert.deepEqual(player.attackVisual.aim, { x: .6, y: .8 });
  assert.equal(player.actionVisualUntil, before.attackUntil);
  delete player.actionVisualUntil;
  delete player.attackVisual;
  assert.deepEqual(player, before, 'stamping affects presentation metadata only');
});

test('a newer accepted cast or jump cancels only the older fist presentation',()=>{
  const cast=fixture('wayfarer-iron-fists').game;cast.enemies=[];cast.lastUpdateNow=1000;assert.equal(cast.fistPunch(1,0,1000,{x:1,y:0}),true);const attackUntil=cast.player.attackUntil;assert.equal(cast.castSpell(cast.save.equippedSpell),true);assert.equal(cast.player.attackUntil,attackUntil);assert.equal(cast.player.attackVisual.presentationCancelled,true);assert.equal(cast.player.fistVisualUntil,attackUntil);assert.deepEqual(closeViewPlayerAction(cast,1000),{active:false,legacy:false,record:cast.player.attackVisual,until:cast.player.fistVisualUntil,profile:null,amount:0,aim:null});
  const jump=fixture('wayfarer-iron-fists').game;jump.enemies=[];assert.equal(jump.fistPunch(1,0,1000,{x:1,y:0}),true);jump.update(0,{state:{x:0,y:0},consume:k=>k==='jump',held:()=>false},1010);assert.ok(jump.jumpUntil>1010);assert.equal(jump.player.attackVisual.presentationCancelled,true);assert.equal(closeViewPlayerAction(jump,1010).active,false);
});

test('accepted tool producers replace stale sword presentation while keeping real melee and targeting state', () => {
  const cases = [
    ['blade-spark-ashling', 'emitter', 180],
    ['blade-hammerfall-brute', 'hammer', 240],
    ['cleaver-sweep-marshal', 'sweep', 240],
    ['cleaver-mirage-stalker', 'mirage', 200],
    ['blade-orrery-sentinel', 'orrery-tap', 160],
  ];
  const available = scenariosForLab('combat-assets');
  for (const [requested, profile, duration] of cases) {
    const spec = available.find((s) => s.id === requested) || available.find((s) => profile === 'hammer' ? s.tool === 'Hammerfall' : profile === 'sweep' ? s.tool === 'Great Sweep' && !s.passive : profile === 'mirage' ? s.passive === 'nanoknives' : profile === 'orrery-tap' ? s.tool === 'Aether Orrery' : s.tool === 'Spark Coil');
    assert.ok(spec, profile);
    const { game } = fixture(spec.id);
    game.enemies = [];
    game.save.lastAim = { x: 0, y: -1 };
    game.primaryAttack(1000);
    assert.equal(game.player.attackVisual.profile, 'melee');
    assert.ok(['salvage-blade','cinder-pike','verge-cleaver'].includes(game.player.attackVisual.weaponKind));
    const meleeUntil = game.player.meleeUntil, strike = copy(game.player.meleeStrike), lastAim = copy(game.save.lastAim);
    if (profile === 'emitter') {
      assert.equal(game.fireSecondary(1010, { x: 0, y: -1 }), false, 'standard fire shares the existing melee cooldown');
      game.player.attackReadyAt = 0;
    }
    assert.equal(game.fireSecondary(1010, { x: 0, y: -1 }), true, profile);
    assert.equal(game.player.attackVisual.profile, profile);
    assert.equal(game.player.attackVisual.durationMs, duration);
    assert.equal(game.player.attackUntil, 1010 + duration);
    assert.equal(game.player.actionVisualUntil, 1010 + duration);
    if (profile !== 'emitter') {
      assert.equal(game.player.meleeUntil, meleeUntil, 'the enemy playerSwinging observation remains unchanged');
      assert.deepEqual(game.player.meleeStrike, strike);
      assert.deepEqual(game.save.lastAim, lastAim);
    }
    const accepted = copy(game.player.attackVisual);
    assert.equal(game.fireSecondary(1011, { x: 0, y: -1 }), false, 'cooldown refuses an additional tool action');
    assert.deepEqual(game.player.attackVisual, accepted, 'refused actions do not stamp a gesture');
    assert.equal(game.player.actionVisualUntil, 1010 + duration, 'refusal cannot restart the accepted clock');
    game.player.attackReadyAt = 0;
    game.primaryAttack(1020);
    assert.equal(game.player.attackVisual.profile, 'melee', 'accepted sword attack replaces tool metadata');
    assert.ok(game.player.attackVisual.weaponKind);
  }
});

test('accepted canonical primary identity survives gear switches, pause and schema-14 round trips', () => {
  for (const [item, kind] of [
    [{ id: 'primary-cinder-pike', name: 'Cinder Pike', slot: 'primary', power: 5, property: 'reach' }, 'cinder-pike'],
    [{ id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 5, property: 'impact' }, 'verge-cleaver'],
  ]) {
    const { game } = fixture('blade-spark-ashling'); game.enemies = []; game.save.equipment.primary = item;
    game.primaryAttack(3000); assert.equal(game.player.attackVisual.weaponKind, kind); assert.equal(game.player.attackVisual.poseMs, 3000);
    game.save.equipment.primary = kind === 'cinder-pike'
      ? { id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 5, property: 'impact' }
      : { id: 'primary-cinder-pike', name: 'Cinder Pike', slot: 'primary', power: 5, property: 'reach' };
    assert.equal(closeViewPlayerAction(game, 3100).record.weaponKind, kind, 'active action keeps accepted gear, not current gear');
    game.setPaused(true, 3100); const saved = roundTrip(game, 90000), back = new Game(saved, 100000);
    assert.equal(saved.version, 14); assert.equal(saved.session.playerRuntime.attackVisual.weaponKind, kind); assert.equal(back.player.attackVisual.weaponKind, kind); assert.equal(back.player.attackVisual.poseMs, 3000);
  }
});

test('Orrery charge-only and capped taps do not fake a firing gesture; release latches its actual direction', () => {
  const { game } = fixture('blade-orrery-sentinel');
  game.enemies = [];
  assert.equal(orreryPress(game, 1000, { x: 0, y: 1 }, 'tool'), true);
  assert.equal(game.player.attackVisual.profile, 'orrery-tap');
  const tap = copy(game.player.attackVisual);
  assert.equal(orreryPress(game, 1010, { x: 1, y: 0 }, 'tool'), true);
  assert.deepEqual(game.player.attackVisual, tap, 'merely retaining charge does not fire again');
  game.save.lastAim = { x: 0, y: 1 };
  tickOrrery(game, .25, 1020, true);
  game.save.lastAim = { x: -1, y: 0 };
  tickOrrery(game, .01, 1030, false);
  assert.equal(game.player.attackVisual.profile, 'orrery-release');
  assert.equal(game.player.attackVisual.durationMs, 220);
  assert.equal(game.player.actionVisualUntil, 1250);
  assert.deepEqual(game.player.attackVisual.aim, { x: 0, y: 1 });
  const release = copy(game.player.attackVisual);
  const until = game.player.attackUntil;
  game.projectiles = Array.from({ length: 32 }, (_, i) => ({ id: 'cap-' + i, life: 1, orrery: 'orb' }));
  game.toolReadyAt = 0;
  assert.equal(orreryPress(game, 1100, { x: 1, y: 0 }), false);
  assert.deepEqual(game.player.attackVisual, release);
  assert.equal(game.player.attackUntil, until);
  assert.equal(game.player.actionVisualUntil, until);
});

test('accepted and combat clocks both survive pause and the real split-save round trip, and clear on death', () => {
  const spec = scenariosForLab('combat-assets').find((s) => s.tool === 'Hammerfall');
  const { game } = fixture(spec.id);
  game.enemies = [];
  game.primaryAttack(1000); assert.equal(game.fireSecondary(1010, { x: .6, y: .8 }), true);
  game.player.attackVisual.futureRecord = future;
  game.player.attackVisual.aim = { x: .6, y: .8, futureAim: future };
  const visual = copy(game.player.attackVisual), melee = copy(game.player.meleeStrike);
  game.setPaused(true, 1050);
  const pausedSave = roundTrip(game, 90000);
  assert.equal(pausedSave.session.playerRuntime.attackMotion, 200);
  assert.equal(pausedSave.session.playerRuntime.actionVisualMotion, 200);
  assert.deepEqual(pausedSave.session.playerRuntime.attackVisual, visual);
  assert.deepEqual(pausedSave.session.playerRuntime.meleeStrike, melee);
  const resumed = new Game(pausedSave, 200000);
  assert.equal(resumed.player.attackUntil - resumed.pauseStarted, 200);
  assert.equal(resumed.player.actionVisualUntil - resumed.pauseStarted, 200);
  assert.deepEqual(resumed.player.attackVisual, visual);
  resumed.setPaused(false, 260000);
  assert.equal(resumed.player.attackUntil - 260000, 200);
  assert.equal(resumed.player.actionVisualUntil - 260000, 200);
  assert.deepEqual(resumed.player.attackVisual, visual);
  const death = new Game(freshSave(), 0); death.enemies = [];
  death.primaryAttack(1000); death.player.hp = 0; death.update(.05, idle, 1010);
  assert.equal(death.player.attackVisual, null);
  assert.equal(death.player.actionVisualUntil, 0);
});


test('Hammerfall latches resolved target direction and fists stamp their actual accepted motion', () => {
  const spec = scenariosForLab('combat-assets').find((s) => s.tool === 'Hammerfall');
  const { game } = fixture(spec.id), p = game.player, foe = game.enemies[0];
  const line = game.save.lastAim;
  foe.x = p.x + line.x * 2; foe.y = p.y + line.y * 2;
  game.save.lastAim = { x: -line.y, y: line.x };
  const before = copy(game.save.lastAim);
  assert.equal(game.fireSecondary(1010, line), true);
  assert.deepEqual(game.player.attackVisual.aim, line, 'the resolved target direction is latched');
  assert.deepEqual(game.save.lastAim, before, 'presentation does not steer subsequent targeting');
  const fists = fixture('fists-spindle-flying').game; fists.enemies = [];
  assert.equal(fists.fistPunch(1, 0, 1000, { x: .6, y: .8 }), true);
  assert.equal(fists.player.attackVisual.profile, 'fist');
  assert.deepEqual(fists.player.attackVisual.aim, { x: .6, y: .8 });
});
