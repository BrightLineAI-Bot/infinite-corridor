// Release 623 (Tim, 2026-10-31: "review the system... check for any kind of vulnerabilities... errors or issues... malformed
// code"): fixes for the confirmed findings of that audit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

test('a section or position that is not a number no longer stops the game from starting', () => {
  const raw = freshSave(); raw.seed = 'AUDIT'; raw.session.rx = '3'; raw.session.ry = 'north'; raw.session.x = 'x';
  const s = migrateSave(raw); assert.equal(s.session.rx, 3); assert.equal(s.session.ry, 0); assert.ok(Number.isFinite(s.session.x));
  assert.doesNotThrow(() => new Game(s, 0));
});

test('a malformed swing in the saved runtime is dropped, so the Wayfarer never resumes at NaN', () => {
  for (const bad of ['str', {}, { startX: 1, startY: 2, endX: 'a', endY: 4, t: 0 }]) {
    const raw = freshSave(); raw.seed = 'AUDIT'; raw.session.playerRuntime = { ...(raw.session.playerRuntime || {}), traversal: bad };
    const s = migrateSave(raw); assert.equal(s.session.playerRuntime.traversal, null);
    const g = new Game(s, 0); g.update(.05, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, 1000);
    assert.ok(Number.isFinite(g.player.x) && Number.isFinite(g.player.y));
  }
});

test('importing a file that is not a journey is refused; a diagnostics file imports the journey inside it', () => {
  const src = readFileSync(new URL('../src/persistence.ts', import.meta.url), 'utf8');
  assert.match(src, /That file is not a journey\./); assert.match(src, /bundle\.save&&typeof bundle\.save==="object"&&"release" in bundle\?bundle\.save/);
});

test('the service worker caches only good same-origin responses and leaves the labs and previews alone; no TypeScript left in shipped modules', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /if \(n\.ok && same\)/); assert.match(sw, /LAB_PATHS = \/\^\(proving-ground\|previews\)\\\/\//); assert.match(sw, /e\.request\.mode === "navigate"/);
  assert.doesNotMatch(readFileSync(new URL('../src/proving-ground-fixtures.ts', import.meta.url), 'utf8'), / as const/);
});
