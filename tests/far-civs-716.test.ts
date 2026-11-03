// Release 716 (Tim, 2026-11-03): the Crystal Civilisation, one great crystal country far out, all its creatures crystal kin, found by
// wandering or by the quest that opens when the Psychic Crystal falls a thousand sections or more from Ember Refuge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FAR_CIVS, FAR_REALMS, farCivCentre, farCivAt, farPocketAt, openFarQuest, activeFarQuest, ensureFarQuests } from '../src/far-realms.ts';
import { sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { MONSTER_PACK, PACK_KINDS, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster } from '../src/monster-render.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const seed = 'FAR716';

test('one great crystal country, far out at a seeded bearing, its land crystal on new ground only', () => {
  const C = FAR_CIVS.crystal, c = farCivCentre(seed, 'crystal'), d = Math.hypot(c.rx, c.ry);
  assert.ok(d >= C.min - 1 && d <= C.min + C.span + 1, `${d}`); assert.deepEqual(farCivCentre(seed, 'crystal'), c);
  assert.notDeepEqual(farCivCentre('OTHER', 'crystal'), c, 'each world has its own');
  assert.equal(farCivAt(seed, c.rx + .5, c.ry + .5)?.id, 'crystal'); assert.equal(farCivAt(seed, c.rx + C.radius + 3, c.ry), null);
  assert.equal(LANDSCAPE_VERSION, 17); let crystal = 0, n = 0;
  for (let dx = -20; dx <= 20; dx += 4) for (let dy = -20; dy <= 20; dy += 4) { if (Math.hypot(dx, dy) > C.radius - 2) continue; n++; if (sectionRegion(seed, c.rx + dx, c.ry + dy, 15).type === 'crystal') crystal++; }
  assert.equal(crystal, n, 'all its land is crystal');
  assert.notEqual(sectionRegion(seed, c.rx, c.ry, 14).type === 'crystal' && sectionRegion(seed, c.rx + 8, c.ry, 14).type === 'crystal' && sectionRegion(seed, c.rx, c.ry + 8, 14).type === 'crystal', true, 'version 14 ground is as it was');
});

test('its creatures are crystal kin: half crystals, prism wardens and crystal striders, and nothing else ordinary', () => {
  for (const id of ['shardling', 'prismWarden', 'crystalStrider']) { const d = MONSTER_PACK[id]; assert.ok(d?.farKin && d.prototypeOnly && !PACK_KINDS.includes(id), id); }
  assert.ok(MONSTER_PACK.shardling.form.scale < MONSTER_PACK.psychicCrystal.form.scale * .6, 'a half crystal');
  const c = farCivCentre(seed, 'crystal'), p = farPocketAt(seed, c.rx, c.ry, FAR_REALMS.version, sectionRegion(seed, c.rx, c.ry, 15));
  assert.equal(p.type, 'crystal'); assert.ok(p.civ); assert.equal(farPocketAt(seed, c.rx, c.ry, 2, sectionRegion(seed, c.rx, c.ry, 15))?.type === 'crystal', false, 'not on version 2 ground');
  const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = c.rx; g.ry = c.ry; g.loadArea('overworld');
  const ordinary = g.enemies.filter((e) => !e.boss && !e.worldBeast && !e.ambient && !e.questingBeast && !e.stalker && !e.dead);
  assert.ok(ordinary.length >= FAR_CIVS.crystal.extra, `${ordinary.length}`); const kin = new Set(FAR_CIVS.crystal.kinds);
  assert.ok(ordinary.filter((e) => kin.has(e.kind)).length >= ordinary.length - 3, ordinary.map((e) => e.kind).join());
  assert.ok(s.narrative.journal.some((j) => j.recordId === 'far-pocket:crystal:crystal'));
});

test('the quest: the Psychic Crystal slain far out opens it, the save keeps it, the compass follows it, arriving completes it', () => {
  const s = freshSave(); s.seed = seed;
  assert.equal(openFarQuest(s, 'psychicCrystal', 300, 0), null, 'not near home'); assert.equal(openFarQuest(s, 'astralWorm', 1200, 0), null, 'only its own beast'); // 724: the Briar Stag now opens its own domain
  assert.equal(openFarQuest(s, 'psychicCrystal', 1200, 0), 'crystal'); const c = farCivCentre(seed, 'crystal');
  assert.deepEqual(activeFarQuest(s), { id: 'crystal', rx: c.rx, ry: c.ry, name: FAR_CIVS.crystal.name }); assert.equal(openFarQuest(s, 'psychicCrystal', 1200, 0), null, 'once');
  const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(m.farQuests.crystal, { status: 'open', rx: c.rx, ry: c.ry });
  const bad = { farQuests: { crystal: { status: 'weird', rx: 1, ry: 2 }, nope: { status: 'open', rx: 1, ry: 1 } } }; ensureFarQuests(bad); assert.deepEqual(bad.farQuests, {});
  const g = new Game(s, 0); g.rx = c.rx; g.ry = c.ry; g.loadArea('overworld'); assert.equal(s.farQuests.crystal.status, 'found'); assert.equal(activeFarQuest(s), null);
  // in the game, the beast's fall opens it
  const t = freshSave(); t.seed = seed; const h = new Game(t, 0); h.rx = 1200; h.ry = 3; const beast = Object.assign(createCombatant('psychicCrystal', 5, 5, true, []), { id: 'pc', worldBeast: 'psychicCrystal', dead: true });
  t.worldBeasts.psychicCrystal.active = { rx: 1200, ry: 3, tries: 0 }; h.defeatEnemy(beast); assert.equal(t.farQuests.crystal?.status, 'open'); assert.ok(t.narrative.journal.some((j) => j.recordId === 'far-quest:crystal'));
});

test('the crystal kin fight with their kit and draw', () => {
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : () => {}, set: () => true });
  for (const id of FAR_CIVS.crystal.kinds.filter((k, i, a) => a.indexOf(k) === i)) {
    const open = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32;
    const w = { player: { x: 16, y: 12, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: 0, playerVelocity: { x: 0, y: 0 }, open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true, walkable: null,
      move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; }, hurt() { w.hurts++; return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {}, grab() { return false; }, held() { return false; }, release() {},
      addEffect(f) { addPackEffect(w.fx, f, w.now); }, effects: () => w.fx };
    const e = Object.assign(createCombatant(id, 12, 12, false, []), { id: `${id}-1`, aggro: true }); w.enemies.push(e); const used = new Set();
    for (let t = 0; t < 40; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); if (e.pack?.attack) used.add(e.pack.attack); w.player.x = 16 + Math.sin(t / 3) * 3; }
    assert.ok(used.size >= 2, `${id}: ${[...used]}`); drawPackMonster(ctx, e, 32, 1000, 'down');
  }
});
