import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { generateRegion } from '../src/world.ts';
import { WORLD_BEASTS, PURSUIT, BLOB_SPLIT, ensureWorldBeasts, canPursue } from '../src/world-beasts.ts';
import { Game } from '../src/game.ts';

// Release 259: world beasts pursue the Wayfarer across sections (Tim, 2026-10-21).
const idle = { state: { x: 0, y: 0 }, consume: () => false };
// A game holding `id` in its section, aggro and wounded, at the start of a run of `n` crossable sections eastward.
function hunt(id, n = 5, seed = 'PURSUIT') {
  for (let ry = 2; ry < 40; ry++) for (let rx = 6; rx < 30; rx++) {
    let ok = true; for (let k = 0; k <= n && ok; k++) { const m = generateRegion(seed, rx + k, ry); ok = !m.settlement && !m.openSea; }
    if (!ok) continue;
    const s = freshSave(); s.seed = seed; s.level = 8; s.worldBeasts = { [id]: { active: { rx, ry, tries: 0 }, cycle: 0 } };
    const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld');
    const e = g.enemies.find((q) => q.worldBeast === id); if (!e) continue;
    e.aggro = true; e.hp = e.maxHp - 100; g.player.hp = 1e6;
    return { g, s, e, rx, ry };
  }
  throw new Error('no run of sections found');
}
const beast = (g, id) => g.enemies.find((e) => e.worldBeast === id && !e.dead);
function cross(g, dx) { const before = g.rx; g.transitionSection(dx, 0); assert.equal(g.rx, before + dx, 'the crossing held'); }

test('a fighting world beast follows you 3 sections in all, with its wounds, then stays; coming back does not reset it', () => {
  const { g, s, rx } = hunt('lightningGiant'), q = () => s.worldBeasts.lightningGiant.active;
  for (let k = 1; k <= 2; k++) {
    const from = g.areaStateId(); cross(g, 1);
    const e = beast(g, 'lightningGiant'); assert.ok(e, `it follows into section ${k}`);
    assert.equal(e.hp, e.maxHp - 100, 'it keeps its wounds'); assert.ok(e.aggro);
    assert.deepEqual([q().rx, q().chase], [rx + k, k]);
    assert.ok(e.x < 8, 'it comes in behind you, by the west gate');
    assert.ok(!(s.session.areas[from]?.enemies || []).some((r) => r.worldBeast === 'lightningGiant'), 'it is no longer back there');
    e.aggro = true; g.player.x = 16; g.player.y = 16;
  }
  // Tim: "it'll chase you 2 tiles, and then it'll stop there and then it'll chase you 1 more".
  beast(g, 'lightningGiant').aggro = false; cross(g, 1); assert.equal(beast(g, 'lightningGiant'), undefined, 'not fighting: it stays'); assert.equal(q().rx, rx + 2);
  cross(g, -1); const back = beast(g, 'lightningGiant'); assert.ok(back, 'back in its section'); assert.equal(q().chase, 2, 'the count is not reset');
  back.aggro = true; cross(g, -1); assert.ok(beast(g, 'lightningGiant'), 'its third crossing'); assert.deepEqual([q().rx, q().chase], [rx + 1, PURSUIT.sections]);
  beast(g, 'lightningGiant').aggro = true; cross(g, -1); assert.equal(beast(g, 'lightningGiant'), undefined, 'three in all: no more'); assert.equal(q().rx, rx + 1, 'it stays in the last section');
  cross(g, 1); const e = beast(g, 'lightningGiant'); assert.ok(e); e.aggro = true; cross(g, 1); assert.equal(beast(g, 'lightningGiant'), undefined, 'still no more after coming back');
});

test('the Blob follows only one section; the Void Walker and Astral Worm keep their own rules; one beast to a section', () => {
  const { g, s } = hunt('morphingBlob');
  cross(g, 1); const b = beast(g, 'morphingBlob'); assert.ok(b, 'one section'); b.aggro = true;
  cross(g, 1); assert.equal(beast(g, 'morphingBlob'), undefined, 'not two');
  assert.equal(s.worldBeasts.morphingBlob.active.chase, PURSUIT.limits.morphingBlob);
  const v = freshSave(); v.worldBeasts = { voidWalker: { active: { rx: 1, ry: 1, tries: 0 }, cycle: 0 }, astralWorm: { active: { rx: 1, ry: 1, tries: 0 }, cycle: 0 } }; ensureWorldBeasts(v, false);
  assert.equal(canPursue(v, 'voidWalker', 1, 1, 1, 0), false); assert.equal(canPursue(v, 'astralWorm', 1, 1, 1, 0), false);
  const two = freshSave(); two.worldBeasts = { lightningGiant: { active: { rx: 1, ry: 1, tries: 0 }, cycle: 0 }, tremorWorm: { active: { rx: 2, ry: 1, tries: 0 }, cycle: 0 } }; ensureWorldBeasts(two, false);
  assert.equal(canPursue(two, 'lightningGiant', 1, 1, 1, 0), false, 'another beast holds the next section');
  assert.equal(canPursue(two, 'lightningGiant', 1, 1, -1, 0), true);
  two.worldBeasts.lightningGiant.active.retreat = { home: { rx: 5, ry: 5, found: true }, side: null, legs: 0 }; assert.equal(canPursue(two, 'lightningGiant', 1, 1, -1, 0), false, 'not while retreating');
});

test('patience keeps counting through a pursuit; the chase count is normalised additively', () => {
  const { g, s } = hunt('lightningGiant'), q = s.worldBeasts.lightningGiant.active; q.patience = 40;
  cross(g, 1); assert.equal(s.worldBeasts.lightningGiant.active.patience, 40, 'kept across the crossing');
  const e = beast(g, 'lightningGiant'); e.aggro = true; g.player.x = e.x + 3; g.player.y = e.y;
  let t = 1000; for (let i = 0; i < 30; i++) { g.update(1 / 30, idle, t += 33); g.player.hp = 1e6; }
  assert.ok(s.worldBeasts.lightningGiant.active.patience > 40, 'still counting');
  const o = freshSave(); o.worldBeasts = { tremorWorm: { active: { rx: 0, ry: 0, tries: 0, chase: '2.7', future: 1 }, cycle: 0 } }; ensureWorldBeasts(o, false);
  assert.equal(o.worldBeasts.tremorWorm.active.chase, 2); assert.equal(o.worldBeasts.tremorWorm.active.future, 1, 'unknown fields kept');
  o.worldBeasts.tremorWorm.active.chase = -3; ensureWorldBeasts(o, false); assert.equal('chase' in o.worldBeasts.tremorWorm.active, false);
});

function retreatBlob(grown) {
  const h = hunt('morphingBlob'), { g, s, e } = h; s.worldBeasts.morphingBlob.active.patience = WORLD_BEASTS.morphingBlob.patience - .2;
  if (grown) { e.blobAge = 1e9; e.blobMerged = .3; } g.player.x = e.x + 3; g.player.y = e.y;
  let t = 1000; for (let i = 0; i < 90 && !e.retreating; i++) { g.update(1 / 30, idle, t += 33); g.player.hp = 1e6; }
  assert.ok(e.retreating, 'it gives up'); return { ...h, t };
}
test('a Blob at its original size leaves whole; a grown Blob flees at its original size and leaves the extra mass, which fades and is never saved', () => {
  const small = retreatBlob(false); assert.equal(small.g.enemies.some((q) => q.blobRemnant), false, 'no residue at its original size');
  assert.ok(small.e.scale <= small.e.blobBase.scale * (1 + BLOB_SPLIT.grown) + 1e-9, 'it leaves whole, at about its original size');
  let { g, s, e, t } = retreatBlob(true); const base = e.blobBase.scale;
  const mass = g.enemies.find((q) => q.blobRemnant); assert.ok(mass, 'the extra mass stays');
  assert.ok(mass.scale > base * (1 + BLOB_SPLIT.grown), `it was grown (${mass.scale} vs ${base})`);
  g.update(1 / 30, idle, t += 33); assert.ok(Math.abs(e.scale - base) <= base * BLOB_SPLIT.grown, `it flees at its original size (${e.scale} vs ${base})`);
  assert.ok(mass.untargetable && mass.noRewards && !mass.worldBeast);
  const [mx, my] = [mass.x, mass.y]; g.update(1 / 30, idle, t += 33); assert.deepEqual([mass.x, mass.y], [mx, my], 'it does not move or fight');
  g.snapshotArea(); assert.ok(!s.session.areas[g.areaStateId()].enemies.some((r) => r.blobRemnant), 'never saved');
  for (let i = 0; i < 30 * (BLOB_SPLIT.linger - BLOB_SPLIT.fade + 1); i++) { g.update(1 / 30, idle, t += 33); g.player.hp = 1e6; }
  assert.ok(g.enemies.includes(mass) && mass.fleeFade < 1 && mass.fleeFade > 0, 'fading');
  for (let i = 0; i < 30 * BLOB_SPLIT.fade && g.enemies.includes(mass); i++) { g.update(1 / 30, idle, t += 33); g.player.hp = 1e6; }
  assert.ok(!g.enemies.includes(mass), 'gone');
});
