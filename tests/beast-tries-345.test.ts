// Release 345 (Tim, 2026-10-23): an Options switch for world-boss tries. Off: deaths cost no tries and do not reset the
// beast; it leaves after 3 minutes of fighting, 5 once it is below half health. Dying costs nothing (wood is kept).
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_BEASTS, BEAST_NO_TRIES, worldBeastPatience, worldBeastPlayerFell } from '../src/world-beasts.ts';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/persistence.ts';
import { freshSave } from '../src/types.ts';

const holding = () => { const s = freshSave(); s.worldBeasts.morphingBlob.active = { rx: 4, ry: 4, tries: 0 }; return s; };

test('the setting defaults to tries on', () => {
  assert.equal(DEFAULT_SETTINGS.beastTries, true); assert.equal(normalizeSettings({}).beastTries, true); assert.equal(normalizeSettings({ beastTries: false }).beastTries, false);
});

test('tries on: a death costs a try; tries off: it costs none', () => {
  const on = holding(); worldBeastPlayerFell(on, 4, 4, ['morphingBlob']); assert.equal(on.worldBeasts.morphingBlob.active.tries, 1);
  const off = holding(); const note = worldBeastPlayerFell(off, 4, 4, ['morphingBlob'], null, true);
  assert.equal(off.worldBeasts.morphingBlob.active.tries, 0); assert.match(note, /patience/);
  for (let i = 0; i < 10; i++) worldBeastPlayerFell(off, 4, 4, ['morphingBlob'], null, true);
  assert.ok(off.worldBeasts.morphingBlob.active, 'never driven off by deaths');
});

test('tries off: patience is 3 minutes, 5 once the beast is below half health', () => {
  const P = WORLD_BEASTS.morphingBlob.patience; assert.equal(P, 180); assert.equal(BEAST_NO_TRIES.extend, 120);
  const fresh = holding(), full = { hp: 100, maxHp: 100 };
  assert.equal(worldBeastPatience(fresh, 'morphingBlob', P - 1, full, true), false); assert.equal(worldBeastPatience(fresh, 'morphingBlob', 2, full, true), true);
  const hurt = holding(), half = { hp: 40, maxHp: 100 };
  assert.equal(worldBeastPatience(hurt, 'morphingBlob', P + 60, half, true), false, 'extended');
  assert.equal(worldBeastPatience(hurt, 'morphingBlob', 61, half, true), true);
  const on = holding(); assert.equal(worldBeastPatience(on, 'morphingBlob', P + 1, half, false), true, 'no extension with tries on');
});

test('tries off: dying costs no try and leaves its clock running (release 427: it keeps its wounds)', async () => {
  const { Game } = await import('../src/game.ts');
  const s = holding(), g = new Game(s, 0); g.rx = 4; g.ry = 4; g.loadArea('overworld'); g.beastTries = false;
  const b = g.createEnemyFromSpawn({ kind: 'morphingBlob', x: g.player.x + 3, y: g.player.y }); b.worldBeast = 'morphingBlob'; b.hp = Math.round(b.maxHp * .3); g.enemies = [b];
  s.worldBeasts.morphingBlob.active = { rx: 4, ry: 4, tries: 0, patience: 90 }; const hp = b.hp;
  g.player.hp = 0; g.update(.05, { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} }, 1000);
  assert.ok(hp < b.maxHp); assert.equal(b.hp, hp, 'release 427: a death no longer heals it'); assert.equal(s.worldBeasts.morphingBlob.active.tries, 0); assert.equal(s.worldBeasts.morphingBlob.active.patience, 90);
});
