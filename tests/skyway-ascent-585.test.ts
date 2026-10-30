// Release 585 (Tim, 2026-10-30): the Skylands are reached by a skyway ascent: floating platforms, each a jump higher than the
// last, ground creatures walking beneath; a jump from a platform carries over the gap; miss it and you fall; the door is at
// the top and opens only from there. Sections first seen before keep their Sky Stair.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, JUMP } from '../src/game.ts';
import { SKYWAY, SKYLANDS, skylandSection, buildSkyway } from '../src/skylands.ts';
import { tileUnder, canStep } from '../src/landscape.ts';

const SEED = 'SKY';
// Release 587: new sections get floating discs (skyVersion 3); the stone ascent is kept for sections pinned to version 2, tested
// here by generating as version 2.
function skywaySection() { SKYLANDS.version = 2; try { return findStone(); } finally { SKYLANDS.version = 3; } }
function findStone() { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0);
  for (let r = 14; r < 80; r++) for (let x = -r; x <= r; x++) { const y = r - Math.abs(x); if (!skylandSection(SEED, x, y)) continue; s.atlas = {}; g.rx = x; g.ry = y; g.loadArea('overworld'); if (g.map.skyway) { g.enemies = []; g.map.enemySpawns = []; return { s, g }; } } }
const inp = (x, y, jump) => { let j = jump; return { state: { x, y }, consume: (k) => k === 'jump' && j ? (j = false, true) : false, held: () => false }; };

test('the ascent: platforms one level apart over open ground, the door on the top one; pinned old sections keep the stair', () => {
  assert.equal(SKYLANDS.version, 3); const { s, g } = skywaySection(), pads = g.map.skyway.pads;
  assert.ok(pads.length >= 3 && pads.length <= 5); pads.forEach((p, k) => { assert.equal(p.elev, k + 1);
    for (let dy = 0; dy < SKYWAY.size; dy++) for (let dx = 0; dx < SKYWAY.size; dx++) { const t = g.map.tiles[(p.y + dy) * 32 + p.x + dx]; assert.equal(t.elev, k + 1); assert.ok(t.skyPlatform && !t.blocked); } });
  const door = g.map.objects.find((o) => o.skyway); assert.equal(door.elev, pads.length); assert.equal(door.x, pads.at(-1).x);
  assert.equal(s.atlas[`${g.rx},${g.ry}`].skyVersion, 2); assert.ok(s.atlas[`${g.rx},${g.ry}`].sites.some((q) => q.name === 'Skyway'));
  const copy = { ...g.map, tiles: g.map.tiles.map((t) => ({ ...t, ...(t.skyPlatform ? { elev: 0, skyPlatform: false, kind: 'ash' } : {}) })), objects: g.map.objects.filter((o) => !o.skyway) };
  const again = buildSkyway(copy, SEED, g.rx, g.ry); assert.deepEqual(again, { x: door.x, y: door.y, elev: door.elev }, 'deterministic');
  const old = freshSave(); old.seed = SEED; old.atlas = { [`${g.rx},${g.ry}`]: { terrain: 'ash', skyVersion: 1 } }; const o = new Game(old, 0); o.rx = g.rx; o.ry = g.ry; o.loadArea('overworld');
  assert.ok(!o.map.skyway && o.map.objects.some((q) => q.kind === 'skyStair' && !q.skyway), 'a section pinned to version 1 keeps its Sky Stair');
});

test('jump by jump to the top: each jump from a platform carries over the gap; the door opens there and not from below', () => {
  const { s, g } = skywaySection(), pads = g.map.skyway.pads, p = g.player, elev = () => tileUnder(g.map, 32, p.x, p.y)?.elev || 0; let t = 1000; s.maxHp = 100; p.hp = 100;
  const door = g.map.objects.find((o) => o.skyway); Object.assign(p, { x: door.x, y: door.y + 2.6 });
  const below = g.interact('ascend:0', door.id); if (Math.hypot(door.x - p.x, door.y - p.y) < 1.5) assert.equal(below.ok, false);
  const walkTo = (cx, cy, ms) => { for (let i = 0; i < ms / 50; i++) { const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy); if (d < .15) break; t += 50; g.update(.05, inp(dx / d, dy / d, false), t); } };
  const jumpTo = (cx, cy) => { while (t <= (g.jumpUntil || 0)) { t += 50; g.update(.05, inp(0, 0, false), t); } /* land first */ const d = Math.hypot(cx - p.x, cy - p.y); t += 50; g.update(.05, inp((cx - p.x) / d, (cy - p.y) / d, true), t); walkTo(cx, cy, 1000); };
  Object.assign(p, { x: pads[0].x - 1.1, y: pads[0].y + .3 }); assert.equal(elev(), 0); let prev = null;
  for (const pad of pads) { const cx = pad.x + .2, cy = pad.y + .3;
    if (prev) walkTo(Math.max(prev.x, Math.min(prev.x + 1.3, cx)), Math.max(prev.y - .55, Math.min(prev.y + 1.05, cy)), 1500);
    jumpTo(cx, cy); assert.equal(elev(), pad.elev, `on platform ${pad.elev}`); prev = pad; }
  assert.equal(p.hp, 100, 'no fall on the way'); assert.ok(JUMP.sky > JUMP.base);
  const r = g.interact('ascend:0', door.id); assert.ok(r.ok, g.message); assert.equal(g.area, 'dungeon'); assert.ok(g.map.skyland);
});

test('miss the next platform and you fall: from four levels the fall is fatal; creatures cannot climb', () => {
  const { s, g } = skywaySection(), pads = g.map.skyway.pads, p = g.player; let t = 1000; s.maxHp = 100; p.hp = 100;
  const top = pads.find((q) => q.elev === 4) || pads.at(-1); Object.assign(p, { x: top.x + .2, y: top.y + .3 });
  const out = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => { const t2 = g.map.tiles[(top.y + .3 + dy * 2.2 | 0) * 32 + (top.x + .2 + dx * 2.2 | 0)]; return t2 && !t2.skyPlatform && !t2.blocked; });
  const deaths = s.lastDeath; for (let i = 0; i < 40 && !g.message.startsWith('Felled'); i++) { t += 50; g.update(.05, inp(out[0], out[1], false), t); }
  if (top.elev >= 4) { assert.match(g.message, /^Felled/, 'four levels or more: fatal'); assert.notEqual(s.lastDeath, deaths); } else assert.ok(p.hp < 100, 'a hard landing');
  const map = { landscape: {}, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', elev: i % 32 >= 4 ? 1 : 0 })) };
  assert.equal(canStep({ isPlayer: false }, map, 32, 3.2, 3, 4.2, 3), false, 'a creature cannot step up onto a platform');
  assert.equal(canStep({ isPlayer: true, jumping: true, airElev: 2 }, { ...map, tiles: map.tiles.map((q) => ({ ...q, elev: q.x >= 4 ? 3 : 0 })) }, 32, 3.2, 3, 4.2, 3), true, 'in the air at level 2, a level 3 platform is in reach');
});
