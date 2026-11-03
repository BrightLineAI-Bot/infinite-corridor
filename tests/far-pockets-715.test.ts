// Release 715 (Tim, 2026-11-03): in the far reaches, stag groves (the Briar Stag's lesser kin, with moths) and blob pockets (lesser
// blobs that suit their region), each a whole world region.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FAR_POCKETS, farPocketAt } from '../src/far-realms.ts';
import { sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { MONSTER_PACK, PACK_KINDS, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster } from '../src/monster-render.ts';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const seed = 'FAR715', KIN = ['groveStag', 'groveMoth', ...FAR_POCKETS.blobs];
const ring = (r) => { const out = []; for (let a = 0; a < 6.28; a += .003) out.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)]); return out; };
const pocket = (rx, ry, v = 2) => farPocketAt(seed, rx, ry, v, sectionRegion(seed, rx, ry, LANDSCAPE_VERSION));

test('the kin are lesser creatures of their own, never part of the ordinary roster', () => {
  for (const id of KIN) { const d = MONSTER_PACK[id]; assert.ok(d && d.prototypeOnly && d.farKin && !d.unique, id); assert.ok(!PACK_KINDS.includes(id), `${id} never rolled by ordinary sections or dungeons`); }
  assert.ok(MONSTER_PACK.groveStag.stats[0] < MONSTER_PACK.briarStag.stats[0] / 2 && MONSTER_PACK.mossBlob.stats[0] < MONSTER_PACK.morphingBlob.stats[0] / 2);
});

test('groves and blob pockets are whole regions, only beyond 1000, only from far-realm version 2, and the blob suits its region', () => {
  const c = { grove: 0, blob: 0, none: 0 }; for (const [x, y] of ring(1200)) c[pocket(x, y)?.type || 'none']++;
  assert.ok(c.grove > 50 && c.blob > 50 && c.none > c.grove + c.blob, JSON.stringify(c));
  for (const [x, y] of ring(800).slice(0, 400)) assert.equal(pocket(x, y), null, 'not within 1000');
  for (const [x, y] of ring(1200).slice(0, 400)) assert.equal(pocket(x, y, 1), null, 'not on version 1 ground');
  for (const [x, y] of ring(1200)) { const p = pocket(x, y); if (p?.type === 'blob') { const r = sectionRegion(seed, x, y, LANDSCAPE_VERSION); if (FAR_POCKETS.blobByRegion[r.type]) assert.deepEqual(p.kinds, [FAR_POCKETS.blobByRegion[r.type]]); } }
  // the same region gives the same pocket in every section of it
  const seen = new Map(); for (const [x, y] of ring(1200)) { const r = sectionRegion(seed, x, y, LANDSCAPE_VERSION), p = pocket(x, y); const k = p ? p.type + p.kinds.join() : 'none'; if (seen.has(r.id)) assert.equal(seen.get(r.id), k, r.id); else seen.set(r.id, k); }
});

test('in the game: a grove holds stags and moths, a pocket holds its blobs, and both are named once in the Journal', () => {
  const find = (t) => ring(1200).find(([x, y]) => pocket(x, y)?.type === t);
  for (const t of ['grove', 'blob']) { const [x, y] = find(t), s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
    assert.equal(g.farPocket?.type, t); const kin = g.enemies.filter((e) => KIN.includes(e.kind)); assert.ok(kin.length >= FAR_POCKETS.extra[t], `${t}: ${kin.length} kin`);
    if (t === 'grove') assert.ok(kin.some((e) => e.kind === 'groveStag') && kin.some((e) => e.kind === 'groveMoth'));
    assert.ok(s.narrative.journal.some((j) => j.recordId === `far-pocket:${t}:${g.farPocket.id}`)); }
});

test('every kin fights with its kit and draws without throwing', () => {
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : () => {}, set: () => true });
  for (const id of KIN) {
    const open = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32;
    const w = { player: { x: 16, y: 12, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: 0, playerVelocity: { x: 0, y: 0 }, open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
      move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; }, hurt() { w.hurts++; return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {}, ignite() {},
      addEffect(f) { addPackEffect(w.fx, f, w.now); }, effects: () => w.fx };
    const e = Object.assign(createCombatant(id, 13, 12, false, []), { id: `${id}-1`, aggro: true }); w.enemies.push(e); const used = new Set();
    for (let t = 0; t < 40; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); if (e.pack?.attack) used.add(e.pack.attack); w.player.x = 16 + Math.sin(t / 3) * 3; }
    assert.ok(used.size >= 2, `${id} used ${[...used]}`); assert.ok(w.hurts > 0, `${id} hits`);
    drawPackMonster(ctx, e, 32, 1000, 'down');
  }
});
