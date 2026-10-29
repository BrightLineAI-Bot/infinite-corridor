// Release 527 (Tim, 2026-10-28): every resonance written into an existing journey's codex once; presets leave gear
// equipped; only world beasts announced in a crossing; the crumbling floor glows red and Aerial Step escapes it; the
// vortex trap that drags you into a blast.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { RESONANCES } from '../src/glyphs.ts';
import { DUNGEON_TRAPS, trapShareScale, addNewTraps, tickNewTraps } from '../src/dungeon-traps.ts';

test('a journey under way gets every resonance once; a new one does not', async () => {
  const { Game } = await import('../src/game.ts');
  const old = migrateSave(JSON.parse(JSON.stringify({ ...freshSave(), level: 40, resonanceGift: undefined })));
  old.glyphCodex.resonances = { wildfire: true }; delete old.resonanceGift;
  new Game(old, 0); for (const id of Object.keys(RESONANCES)) assert.equal(old.glyphCodex.resonances[id], true, id);
  assert.equal(old.resonanceGift, 1);
  const fresh = freshSave(); new Game(fresh, 0); assert.equal(fresh.resonanceGift, 1); assert.equal(Object.keys(fresh.glyphCodex.resonances).length, 0);
  fresh.level = 5; new Game(fresh, 0); assert.equal(Object.keys(fresh.glyphCodex.resonances).length, 0, 'only once');
});

test('a dungeon only announces world beasts', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /if \(game\.area !== "dungeon" \|\| e\.worldBeast \|\| e\.worldBoss\) showEventBanner/);
});

const world = (player, extra = {}) => ({ player, level: 10, maxHp: 400, now: 0, projectiles: [], effects: [], seeds: [], ...extra });
test('the vortex drags whoever stays into its eye, then bursts and sprays fragments', () => {
  const trap = { id: 'v', kind: 'trap', trapType: 'vortex', newTrap: 3, x: 10, y: 10, phase: 'armed', timer: 0 }, player = { x: 9, y: 9.8 }, V = DUNGEON_TRAPS.vortex;
  const w = world(player, { pull: (dx, dy) => { player.x += dx; player.y += dy; } });
  for (let i = 0; i < 50; i++) tickNewTraps([trap], w, .05);
  assert.ok(Math.hypot(player.x + .5 - 10.5, player.y + .75 - 10.5) < .3, `dragged to the eye (${player.x.toFixed(2)},${player.y.toFixed(2)})`);
  assert.equal(w.effects.filter((e) => e.hostile && e.kind === 'enemy-blast').length, 1);
  assert.equal(w.projectiles.filter((p) => p.hostile && p.path === 'grenade').length, V.frags);
  assert.equal(w.effects[0].damage, Math.round(400 * V.share * trapShareScale(10))); // release 557: the share grows with level
});
test('stepping out of the vortex in time lets it fade', () => {
  const trap = { id: 'v2', kind: 'trap', trapType: 'vortex', newTrap: 3, x: 10, y: 10, phase: 'armed', timer: 0 }, player = { x: 9.6, y: 9.6 }; let pulled = 0;
  const w = world(player, { pull: () => pulled++ });
  tickNewTraps([trap], w, .05); assert.equal(trap.phase, 'warning'); player.x = 14;
  for (let i = 0; i < 40; i++) tickNewTraps([trap], w, .05);
  assert.equal(pulled, 0); assert.equal(w.effects.length, 0);
});
test('the crumbling floor spares the Wayfarer in Aerial Step (airborne), and version 2 crossings keep their kinds', () => {
  const trap = { id: 'p', kind: 'trap', trapType: 'pit', newTrap: 2, x: 5, y: 5, phase: 'armed', timer: 0 }; let fell = 0;
  const w = world({ x: 5, y: 5 }, { airborne: true, fall: () => fell++ }); for (let i = 0; i < 60; i++) tickNewTraps([trap], w, .05); assert.equal(fell, 0);
  const room = () => ({ width: 20, height: 20, entry: { x: 2, y: 2 }, objects: [], tiles: Array.from({ length: 400 }, (_, i) => { const x = i % 20, y = Math.floor(i / 20), wall = x === 0 || y === 0 || x === 19 || y === 19; return { x, y, kind: wall ? 'wall' : 'stone', blocked: wall }; }) });
  let v2Vortex = 0, v3Vortex = 0; for (let k = 0; k < 40; k++) { v2Vortex += addNewTraps(room(), 'S', `k${k}`, 2).filter((t) => t.trapType === 'vortex').length; v3Vortex += addNewTraps(room(), 'S', `k${k}`, 3).filter((t) => t.trapType === 'vortex').length; }
  assert.equal(v2Vortex, 0); assert.ok(v3Vortex > 0);
});
