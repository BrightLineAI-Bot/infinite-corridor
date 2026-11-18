// Release 345 (Tim, 2026-10-23): an Options switch for world-boss tries. Off: deaths cost no tries and do not reset the
// beast; it leaves after 3 minutes of fighting, 5 once it is below half health. Dying costs nothing (wood is kept).
// 2026-11-18 (Tim): "the 15-minute window is the ONLY limit: remove the tries limit". World beasts have no tries at all, so the
// switch is retired from Options (its saved value is still normalised, so old settings load as before); the window
// (BEAST_ENGAGEMENT) replaced its 3/5-minute clock. These tests are rewritten in place for the new rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORLD_BEASTS, BEAST_ENGAGEMENT, worldBeastPatience, worldBeastPlayerFell } from '../src/world-beasts.ts';
import * as WB from '../src/world-beasts.ts';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/persistence.ts';
import { freshSave } from '../src/types.ts';

const holding = () => { const s = freshSave(); s.worldBeasts.morphingBlob.active = { rx: 4, ry: 4, tries: 0 }; return s; };

test('the old setting is still normalised (saved settings stay compatible), but Options no longer offers it', () => {
  assert.equal(DEFAULT_SETTINGS.beastTries, true); assert.equal(normalizeSettings({}).beastTries, true); assert.equal(normalizeSettings({ beastTries: false }).beastTries, false);
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), game = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /World boss tries/); assert.doesNotMatch(game, /beastTries/, 'the game no longer reads it');
  assert.equal(WB.BEAST_NO_TRIES, undefined, 'the tries-off extension is retired with it');
});

test('a death is counted but never ends the hunt', () => {
  const s = holding();
  for (let i = 1; i <= 8; i++) { const note = worldBeastPlayerFell(s, 4, 4, ['morphingBlob']); assert.match(note, /still holds 4,4/); assert.equal(s.worldBeasts.morphingBlob.active.tries, i); }
  assert.ok(s.worldBeasts.morphingBlob.active, 'never driven off by deaths'); assert.equal(s.worldBeasts.morphingBlob.escaped, 0);
  for (const id of Object.keys(WORLD_BEASTS)) assert.equal(WORLD_BEASTS[id].tries, undefined, `${id}: no tries`);
});

test('the engagement window is 15 minutes, with no extension below half health', () => {
  const P = BEAST_ENGAGEMENT.seconds; assert.equal(P, 900);
  const at = (s, t) => { s.playSeconds = t; return s; }, half = { hp: 40, maxHp: 100, aggro: true };
  const s = holding(); assert.equal(worldBeastPatience(at(s, 0), 'morphingBlob', 0, half), false);
  assert.equal(worldBeastPatience(at(s, P - 1), 'morphingBlob', 0, half), false); assert.equal(worldBeastPatience(at(s, P + 1), 'morphingBlob', 0, half), true);
});

test('dying keeps its wounds and its window (release 427: a death no longer heals it)', async () => {
  const { Game } = await import('../src/game.ts');
  const s = holding(), g = new Game(s, 0); g.rx = 4; g.ry = 4; g.loadArea('overworld');
  const b = g.createEnemyFromSpawn({ kind: 'morphingBlob', x: g.player.x + 3, y: g.player.y }); b.worldBeast = 'morphingBlob'; b.hp = Math.round(b.maxHp * .3); g.enemies = [b];
  s.worldBeasts.morphingBlob.active = { rx: 4, ry: 4, tries: 0, engagedAt: 7 }; const hp = b.hp;
  g.player.hp = 0; g.update(.05, { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} }, 1000);
  assert.ok(hp < b.maxHp); assert.equal(b.hp, hp, 'release 427: a death no longer heals it'); assert.equal(s.worldBeasts.morphingBlob.active.tries, 1); assert.equal(s.worldBeasts.morphingBlob.active.engagedAt, 7);
});
