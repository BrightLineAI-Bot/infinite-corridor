// Release 717 (Tim, 2026-11-03): the Lightning Giant's civilisation, the Storm Halls: one great country of pillar lands far out,
// all its creatures kin of the Giant in their variations, reached by the quest the Lightning Giant's fall opens far from home.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FAR_CIVS, FAR_REALMS, farCivCentre, farCivAt, farPocketAt, openFarQuest, activeFarQuest } from '../src/far-realms.ts';
import { sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { MONSTER_PACK, PACK_KINDS, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster } from '../src/monster-render.ts';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const seed = 'FAR717';

test('the Storm Halls: a far country of pillar lands, from landscape 16 only; the Crystal Civilisation keeps its own', () => {
  const S = FAR_CIVS.storm, c = farCivCentre(seed, 'storm'), d = Math.hypot(c.rx, c.ry); assert.ok(d >= S.min - 1 && d <= S.min + S.span + 1);
  assert.equal(LANDSCAPE_VERSION, 24); assert.equal(farCivAt(seed, c.rx + .5, c.ry + .5)?.id, 'storm');
  assert.equal(sectionRegion(seed, c.rx, c.ry, 16).type, 'pillars'); assert.notEqual(sectionRegion(seed, c.rx, c.ry, 15).type === 'pillars' && sectionRegion(seed, c.rx + 9, c.ry, 15).type === 'pillars' && sectionRegion(seed, c.rx, c.ry + 9, 15).type === 'pillars', true, 'version 15 ground keeps its land');
  const k = farCivCentre(seed, 'crystal'); assert.equal(sectionRegion(seed, k.rx, k.ry, 15).type, 'crystal'); assert.equal(sectionRegion(seed, k.rx, k.ry, 16).type, 'crystal');
  assert.equal(farPocketAt(seed, c.rx, c.ry, 3, sectionRegion(seed, c.rx, c.ry, 16))?.type === 'storm', false, 'its people only from far-realm 4');
  assert.equal(farPocketAt(seed, c.rx, c.ry, FAR_REALMS.version, sectionRegion(seed, c.rx, c.ry, 16))?.type, 'storm');
});

test('its people are lesser kin of the Lightning Giant in three variations; the Giant slain far out opens the quest', () => {
  const kinds = [...new Set(FAR_CIVS.storm.kinds)]; assert.equal(kinds.length, 3);
  for (const id of kinds) { const d = MONSTER_PACK[id]; assert.ok(d?.farKin && d.prototypeOnly && d.render === 'lightningGiant' && !PACK_KINDS.includes(id), id); assert.ok(d.stats[0] < MONSTER_PACK.lightningGiant.stats[0] / 2); }
  assert.equal(new Set(kinds.map((id) => MONSTER_PACK[id].form.scale)).size, 3, 'each its own size');
  const s = freshSave(); s.seed = seed; assert.equal(openFarQuest(s, 'lightningGiant', 1300, 0), 'storm'); const c = farCivCentre(seed, 'storm'); assert.deepEqual(activeFarQuest(s), { id: 'storm', rx: c.rx, ry: c.ry, name: FAR_CIVS.storm.name });
  const g = new Game(s, 0); g.rx = c.rx; g.ry = c.ry; g.loadArea('overworld'); assert.equal(s.farQuests.storm.status, 'found');
  const kin = g.enemies.filter((e) => kinds.includes(e.kind)); assert.ok(kin.length >= FAR_CIVS.storm.extra, `${kin.length}`);
});

test('the Storm Halls folk fight with their kit and draw', () => {
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : () => {}, set: () => true });
  for (const id of [...new Set(FAR_CIVS.storm.kinds)]) {
    const open = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32;
    const w = { player: { x: 16, y: 12, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: 0, playerVelocity: { x: 0, y: 0 }, open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
      move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; }, hurt() { w.hurts++; return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {}, shockHit() {},
      addEffect(f) { addPackEffect(w.fx, f, w.now); }, effects: () => w.fx };
    const e = Object.assign(createCombatant(id, 13, 12, false, []), { id: `${id}-1`, aggro: true }); w.enemies.push(e); const used = new Set();
    for (let t = 0; t < 40; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); if (e.pack?.attack) used.add(e.pack.attack); w.player.x = 16 + Math.sin(t / 3) * 3; }
    assert.ok(used.size >= 2, `${id}: ${[...used]}`); assert.ok(w.hurts > 0, id); drawPackMonster(ctx, e, 32, 1000, 'down');
  }
});
