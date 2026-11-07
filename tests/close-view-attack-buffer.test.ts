import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave, SAVE_VERSION } from '../src/types.ts';
import { ACTION_MOTION } from '../src/action-motion.ts';
import { closeViewApplies } from '../src/close-view.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';

const DT = 1 / 60;
function input(...actions) {
  const pending = new Set(actions);
  return { state: { x: 0, y: 0 }, consume: action => pending.delete(action), held: () => false, reset: () => pending.clear(), pending };
}
function fixture() {
  const save = freshSave();
  save.seed = 'BUFFER-TEST';
  save.closeView = true;
  save.activeWeaponSlot = 'primary';
  Object.assign(save.session, { area: 'dungeon', activeDungeonId: 'building:BUFFER-TEST:8:3:keep:3:f1', x: 4, y: 4 });
  const g = new Game(save, 1000);
  g.installSystems();
  g.installWeaponSystems();
  g.enemies = [];
  g.map.objects = g.map.objects.filter(o => o.kind !== 'trap');
  const floor = g.map.tiles.find(t => !t.blocked && !t.hole && !t.doorway && !t.openAir && !t.courtyard && t.kind !== 'yardGrass' && t.x > 2 && t.y > 2);
  assert.ok(floor);
  g.player.x = floor.x;
  g.player.y = floor.y;
  const swings = [], attack = g.primaryAttack.bind(g);
  g.primaryAttack = (...args) => {
    const before = g.player.meleeStrike, result = attack(...args);
    if (g.player.meleeStrike !== before) swings.push(args[0]);
    return result;
  };
  assert.equal(g.closeViewAttackBufferEligible(1000), true);
  return { g, swings };
}
function queue(g, pressed = 1100, ready = 1200) {
  g.player.attackReadyAt = ready;
  const keys = input('attack');
  g.update(DT, keys, pressed);
  assert.equal(keys.pending.size, 0, 'the press is consumed once');
  assert.ok(g.attackBufferUntil >= ready, 'a late press is waiting');
}

test('a ready action-button press attacks immediately; a late press waits for the authoritative cooldown and fires only once', () => {
  const { g, swings } = fixture();
  g.update(DT, input('attack'), 1000);
  assert.deepEqual(swings, [1000]);
  const ready = g.player.attackReadyAt;
  g.update(DT, input('attack'), ready - 100);
  g.update(DT, input(), ready - 1);
  assert.deepEqual(swings, [1000], 'buffering neither advances cooldown nor starts a swing');
  assert.equal(g.player.attackReadyAt, ready);
  g.update(DT, input(), ready);
  assert.deepEqual(swings, [1000, ready]);
  assert.equal(g.attackBufferUntil, 0);
  g.update(DT, input(), g.player.attackReadyAt + 1);
  assert.deepEqual(swings, [1000, ready], 'no repeated or held attack is synthesized');
});

test('the 120 ms boundary accepts one pending attack, early presses do not queue, and expired presses do not fire late', () => {
  assert.equal(ACTION_MOTION.attackBufferMs, 120);
  const early = fixture();
  early.g.player.attackReadyAt = 1200;
  early.g.update(DT, input('attack'), 1079);
  early.g.update(DT, input(), 1200);
  assert.deepEqual(early.swings, []);
  assert.equal(early.g.attackBufferUntil, 0);

  const late = fixture();
  queue(late.g, 1080);
  late.g.update(DT, input('attack'), 1100);
  late.g.update(DT, input('attack'), 1130);
  late.g.update(DT, input(), 1200);
  late.g.update(DT, input(), 2000);
  assert.deepEqual(late.swings, [1200], 'several late presses occupy one slot');

  const expired = fixture();
  queue(expired.g);
  expired.g.update(DT, input(), 1221);
  assert.deepEqual(expired.swings, []);
  assert.equal(expired.g.attackBufferUntil, 0);
});

for (const action of ['tool', 'spell', 'spell2', 'dodge']) {
  for (const refused of [false, true]) {
    test(`${action} cancels the queued attack when ${refused ? 'refused' : 'accepted'}`, () => {
      const { g, swings } = fixture();
      queue(g);
      const now = 1120;
      if (action === 'tool' && !refused) g.player.attackReadyAt = now;
      if (action === 'spell' || action === 'spell2') {
        if (action === 'spell2') g.save.magicSkills.slots.a = null;
        g.save.magicSkills.slots[action === 'spell' ? 'a' : 'b'] = 'spell:ember-ring';
        g.save.magicSkills.cooldowns['spell:ember-ring'] = refused ? 20 : 0;
      }
      if (action === 'dodge') g.player.stamina = refused ? 0 : g.save.maxStamina;
      g.update(DT, input(action), now);
      assert.equal(g.attackBufferUntil, 0);
      if (action === 'tool') assert.equal(g.projectiles.length > 0, !refused, 'tool actually accepted/refused');
      if (action === 'spell' || action === 'spell2') assert.equal(g.effects.some(e => e.kind === 'ember-ring'), !refused, 'spell actually accepted/refused');
      if (action === 'dodge') assert.equal(g.player.dodgeUntil > now, !refused, 'dodge actually accepted/refused');
      g.update(DT, input(), 1200);
      assert.deepEqual(swings, []);
    });
  }
}

test('stun consumes new attack input and clears an existing queue; a held struggle cancels it too', () => {
  const stunned = fixture();
  queue(stunned.g);
  stunned.g.player.stunnedUntil = 1400;
  const keys = input('attack');
  stunned.g.update(DT, keys, 1120);
  assert.equal(keys.pending.size, 0);
  assert.equal(stunned.g.attackBufferUntil, 0);
  stunned.g.update(DT, input(), 1500);
  assert.deepEqual(stunned.swings, []);

  const held = fixture();
  queue(held.g);
  held.g.player.heldUntil = 5000;
  held.g.update(DT, input('dodge'), 1120);
  assert.equal(held.g.attackBufferUntil, 0);
  assert.ok(held.g.player.heldUntil < 5000, 'the consumed dodge was a real struggle');
  held.g.update(DT, input(), 1200);
  assert.deepEqual(held.swings, []);
});

test('pause, area load and death discard queued intent without an attack after recovery', () => {
  const paused = fixture();
  queue(paused.g);
  paused.g.setPaused(true, 1110);
  paused.g.update(DT, input(), 5000);
  assert.deepEqual(paused.swings, []);
  assert.equal(paused.g.attackBufferUntil, 0);
  paused.g.setPaused(false, 6000);
  paused.g.update(DT, input(), 6200);
  assert.deepEqual(paused.swings, []);

  const loaded = fixture();
  queue(loaded.g);
  loaded.g.loadArea('dungeon', false);
  loaded.g.enemies = [];
  loaded.g.update(DT, input(), 1200);
  assert.equal(loaded.g.attackBufferUntil, 0);
  assert.deepEqual(loaded.swings, []);

  const dead = fixture();
  queue(dead.g);
  dead.g.player.hp = 0;
  dead.g.update(DT, input(), 1120);
  assert.ok(dead.g.player.hp > 0, 'normal death recovery ran');
  assert.equal(dead.g.attackBufferUntil, 0);
  dead.g.update(DT, input(), 1200);
  assert.deepEqual(dead.swings, []);
});

test('schema-14 export, storage round trip and reload preserve cooldown but never persist queued input', () => {
  const { g } = fixture();
  queue(g);
  const exported = g.exportSnapshot(1100);
  assert.equal(SAVE_VERSION, 14);
  assert.equal(exported.version, 14);
  assert.equal(exported.session.playerRuntime.attackCooldown, 100);
  assert.ok(!Object.hasOwn(exported, 'attackBufferUntil'));
  assert.ok(!Object.hasOwn(exported.session.playerRuntime, 'attackBufferUntil'));
  const { main, puts } = splitSnapshot(snapshotSave(exported));
  const validated = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts))));
  assert.equal(validated.health, 'healthy', validated.error);
  const resumed = new Game(migrateSave(validated.save), 20000);
  resumed.installSystems();
  resumed.installWeaponSystems();
  resumed.enemies = [];
  assert.equal(resumed.player.attackReadyAt, 20100);
  assert.equal(resumed.attackBufferUntil, 0);
  resumed.update(DT, input(), 20100);
  assert.equal(resumed.player.attackReadyAt, 20100, 'reload does not synthesize an attack');
});

test('the presentation gate agrees with Close View for legacy floors, bounded terrain, open-air tiles and excluded scenes', () => {
  const { g } = fixture();
  for (const mode of ['ordinary', 'legacyLandscape', 'terrain', 'wide', 'tall', 'tooManyTiles', 'finale', 'stillworks', 'canopy', 'movers']) {
    for (const sky of ['none', 'courtyard', 'openAir', 'pentRoof', 'pentBalcony', 'yardGrass']) {
      const tiles = Array.from({ length: 9 }, () => ({ kind: 'flagFloor' }));
      if (sky === 'yardGrass') tiles[4].kind = sky;
      else if (sky !== 'none') tiles[4][sky] = true;
      g.map = { width: 3, height: 3, building: { style: 'keep' }, tiles };
      g.player.x = g.player.y = 1;
      if (mode === 'legacyLandscape') g.map.landscape = { version: 0 };
      if (['terrain', 'wide', 'tall', 'tooManyTiles'].includes(mode)) {
        g.map.landscape = { version: 0 };
        g.map.interiorTerrain = { version: 1 };
      }
      if (mode === 'wide') g.map.width = 65;
      if (mode === 'tall') g.map.height = 65;
      if (mode === 'tooManyTiles') g.map.tiles.length = 4097;
      if (mode === 'finale') g.map.building.finale = true;
      if (mode === 'stillworks') g.map.stillworks = true;
      if (mode === 'canopy') g.map.canopy = {};
      if (mode === 'movers') g.map.movers = [{}];
      assert.equal(g.closeViewAttackBufferEligible(1000), closeViewApplies(g), `${mode}/${sky}`);
    }
  }
});

test('leaving Close View eligibility discards a queued attack through normal update', () => {
  for (const change of ['off', 'openAir', 'legacyLandscape', 'secondary']) {
    const { g, swings } = fixture();
    queue(g);
    if (change === 'off') g.save.closeView = false;
    if (change === 'secondary') g.save.activeWeaponSlot = 'secondary';
    if (change === 'legacyLandscape') delete g.map.interiorTerrain;
    if (change === 'openAir') g.map.tiles[Math.floor(g.player.y + .75) * g.map.width + Math.floor(g.player.x + .5)].openAir = true;
    g.update(DT, input(), 1200);
    assert.equal(g.attackBufferUntil, 0, change);
    assert.deepEqual(swings, [], change);
  }
});

test('direct primaryAttack calls keep their immediate directional API and never enqueue an early world tap', () => {
  const { g, swings } = fixture();
  g.player.attackReadyAt = 1200;
  g.primaryAttack(1100, { x: -1, y: 0 });
  assert.equal(g.attackBufferUntil, 0);
  g.update(DT, input(), 1200);
  assert.deepEqual(swings, []);
  g.primaryAttack(1200, { x: -1, y: 0 });
  assert.deepEqual(swings, [1200]);
  assert.equal(g.player.meleeAim.x, -1);
  assert.equal(g.player.meleeAim.y, 0);
  assert.equal(g.attackBufferUntil, 0);
});
