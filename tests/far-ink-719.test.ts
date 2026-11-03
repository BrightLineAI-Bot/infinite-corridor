// Release 719 (Tim, 2026-11-03): the Ink Wastes, the Astral Worm's homeland far out: inky, melting land; ordinary creatures painted
// ink-black; and creatures that are the Worm's own shapes kept for good (pool, griffin, dragonfly, many legs, mouth), normal sized.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FAR_REALMS, FAR_INK, farRealmAt, populateInk } from '../src/far-realms.ts';
import { MONSTER_PACK, PACK_KINDS, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster } from '../src/monster-render.ts';
import { inkWash, INK_WASH } from '../src/renderer.ts';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const seed = 'FAR719';
const inkSection = () => { for (let a = 0; a < 6.28; a += .004) { const rx = Math.round(Math.cos(a) * 1150), ry = Math.round(Math.sin(a) * 1150); if (farRealmAt(seed, rx, ry)?.type === 'ink') return [rx, ry]; } return null; };

test('the Ink Wastes are a far realm of their own band, from far-realm version 5; the Giants keep theirs', () => {
  assert.ok(FAR_REALMS.version >= 5); let ink = 0, giants = 0, n = 0;
  for (let a = 0; a < 6.28; a += .002) { const rx = Math.round(Math.cos(a) * 1500), ry = Math.round(Math.sin(a) * 1500), r = farRealmAt(seed, rx, ry); n++; if (r?.type === 'ink') ink++; if (r?.type === 'giants') giants++; }
  assert.ok(ink / n > .04 && ink / n < .3 && giants > 0, `ink ${ink}, giants ${giants} of ${n}`);
  const [x, y] = inkSection(); assert.equal(farRealmAt(seed, x, y, 4), null, 'not on version 4 ground');
  for (let a = 0; a < 6.28; a += .01) { const rx = Math.round(Math.cos(a) * 1300), ry = Math.round(Math.sin(a) * 1300); if (farRealmAt(seed, rx, ry, 4)?.type === 'giants') assert.equal(farRealmAt(seed, rx, ry)?.type, 'giants', 'a giant cell stays giant'); }
});

test('the Worm\'s shapes: five kin, each one form for good, never in the ordinary roster', () => {
  const forms = FAR_INK.kinds.map((id) => MONSTER_PACK[id]?.inkForm); assert.deepEqual([...new Set(forms)].sort(), ['bite', 'flight', 'griffin', 'pool', 'trample']);
  for (const id of FAR_INK.kinds) { const d = MONSTER_PACK[id]; assert.ok(d.farKin && d.prototypeOnly && d.render === 'inkKin' && !PACK_KINDS.includes(id), id); assert.ok(d.stats[0] < MONSTER_PACK.astralWorm.stats[0] / 10); }
  for (const id of FAR_INK.painted) assert.ok(PACK_KINDS.includes(id), `${id} is drawn through the cached sprite, so its ink holds`);
});

test('in the game: an ink section washes its ground, paints its creatures black and holds the Worm\'s shapes', () => {
  const [x, y] = inkSection(), s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(g.farRealm?.type, 'ink'); assert.ok(g.map.farInk, 'its ground is ink');
  const ord = g.enemies.filter((e) => !e.dead && !e.boss && !e.worldBeast && !e.ambient && !e.questingBeast && !e.stalker);
  assert.ok(ord.length >= FAR_INK.extra && ord.every((e) => e.farInk), 'every ordinary creature ink-black'); assert.ok(ord.filter((e) => FAR_INK.kinds.includes(e.kind)).length >= FAR_INK.extra, 'the Worm\'s shapes walk here');
  const before = JSON.stringify(g.map.enemySpawns.map((e) => e.kind)); populateInk(g.map, seed, x, y); assert.equal(JSON.stringify(g.map.enemySpawns.map((e) => e.kind)), before, 'only once');
});

test('the wash and the shapes draw without throwing', () => {
  const calls = []; const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : () => { calls.push(k); }, set: () => true });
  inkWash(ctx, 32, 32, 24, 10); assert.ok(calls.filter((c) => c === 'ellipse').length >= INK_WASH.blobs, 'ink pools painted');
  for (const id of FAR_INK.kinds) { const open = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32;
    const w = { player: { x: 16, y: 12, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: 0, playerVelocity: { x: 0, y: 0 }, open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
      move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; }, hurt() { w.hurts++; return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {},
      addEffect(f) { addPackEffect(w.fx, f, w.now); }, effects: () => w.fx };
    const e = Object.assign(createCombatant(id, 13, 12, false, []), { id: `${id}-1`, aggro: true, farInk: true }); w.enemies.push(e);
    for (let t = 0; t < 30; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); w.player.x = 16 + Math.sin(t / 3) * 3; }
    assert.ok(w.hurts > 0, `${id} fights`); drawPackMonster(ctx, e, 32, 1000, 'down'); }
});
