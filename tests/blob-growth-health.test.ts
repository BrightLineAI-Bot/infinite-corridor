import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatant } from '../src/combat.ts';
import { BLOB, updatePackMonster, resetPackRuntime } from '../src/monster-pack.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';

const close = (actual, expected, message = '') => assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} != ${expected}`);
function fixture(hp = 100, maxHp = 2000) {
  const b = createCombatant('morphingBlob', 6, 12, true, []);
  Object.assign(b, { id: 'blob-growth', aggro: true, hp, maxHp, damage: 20, packAttacks: [], packBossAttacks: [] });
  const w = { dt: 0, now: 0, player: { x: 22, y: 22, hp: 1000 }, enemies: [b], fx: [],
    open: () => true, tileOpen: () => true, los: () => true, move: () => true, hurt: () => true,
    effects: () => w.fx, addEffect: f => w.fx.push(f) };
  return { b, w };
}
function tick(f, dt) { f.w.dt = dt; f.w.now += Math.max(0, dt) * 1000; updatePackMonster(f.b, f.w); }
function frames(f, seconds, fps) { for (let i = 0; i < seconds * fps; i++) tick(f, 1 / fps); }
function geometry(base, age, merged = 0) {
  const grow = 1 + Math.min(1, age / BLOB.growTime) * (BLOB.maxGrow - 1) + Math.min(BLOB.mergeMax, merged);
  const stepped = Math.round(grow / BLOB.growStep) * BLOB.growStep;
  return [Math.round(base.scale * stepped * 100) / 100, base.radius * stepped];
}

// Release 307 (Tim: "the blob doesn't need to regenerate health... just when his little bloblings get to him"): growth still
// swells the body but no longer heals (BLOB.growHeal 0). These tests pin the new rule; the stepped growth is unchanged.
test('natural growth no longer heals, with the unchanged stepped body growth', () => {
  assert.equal(BLOB.growHeal, 0); assert.equal(BLOB.growTime, 120); assert.equal(BLOB.maxGrow, 2.4);
  const f = fixture(), base = { scale: f.b.scale, radius: f.b.bodyRadius };
  tick(f, 30);
  assert.equal(f.b.maxHp, 2000); close(f.b.hp, 100); assert.equal(f.b.blobAge, 30);
  assert.deepEqual([f.b.scale, f.b.bodyRadius], geometry(base, 30));
  tick(f, 30); close(f.b.hp, 100); assert.equal(f.b.maxHp, 2000);
});

test('growth grants no HP and stops forever at the existing size cap', () => {
  const f = fixture(), base = { scale: f.b.scale, radius: f.b.bodyRadius };
  tick(f, 180); close(f.b.hp, 100); assert.equal(f.b.maxHp, 2000); assert.equal(f.b.blobAge, 120);
  assert.deepEqual([f.b.scale, f.b.bodyRadius], geometry(base, 120));
  f.b.hp -= 10; const shape = [f.b.scale, f.b.bodyRadius];
  tick(f, Number.MAX_VALUE); close(f.b.hp, 90); assert.deepEqual([f.b.scale, f.b.bodyRadius], shape);
  assert.ok(Number.isFinite(f.b.blobAge));
});

test('a wounded blob stays wounded; nothing is banked', () => {
  const full = fixture(2000); tick(full, 60); assert.equal(full.b.hp, 2000); assert.equal(full.b.maxHp, 2000);
  full.b.hp = 1000; tick(full, 60); close(full.b.hp, 1000); tick(full, 600); close(full.b.hp, 1000);
  const nearFull = fixture(1999); tick(nearFull, 60); assert.equal(nearFull.b.hp, 1999); assert.equal(nearFull.b.maxHp, 2000);
});

test('the same active growth time grows equally at 30, 60, and 144 fps or one large step', () => {
  const results = [30, 60, 144].map(fps => { const f = fixture(); frames(f, 60, fps); return f.b; });
  const single = fixture(); tick(single, 60); results.push(single.b);
  for (const b of results) { close(b.hp, 100); assert.equal(b.maxHp, 2000); close(b.blobAge, 60); assert.equal(b.scale, results[0].scale); close(b.bodyRadius, results[0].bodyRadius); }
});

test('a hit still spatters ooze while it grows', () => {
  const f = fixture(); tick(f, .1); f.w.fx = [];
  const before = f.b.hp; f.b.hp -= .1; tick(f, 1);
  assert.ok(f.b.hp < before); assert.equal(f.w.fx.filter(q => q.kind === 'ooze').length, BLOB.oozePerHit);
  const count = f.w.fx.length; tick(f, 1); assert.equal(f.w.fx.length, count, 'regeneration itself is not another hit');
});

test('dead, zero-health, and negative-health blobs never regain HP', () => {
  const dead = fixture(); dead.b.dead = true; const before = JSON.stringify(dead.b); tick(dead, 60); assert.equal(JSON.stringify(dead.b), before);
  for (const hp of [0, -1]) { const f = fixture(hp); tick(f, 60); assert.equal(f.b.hp, hp); assert.equal(f.b.maxHp, 2000); }
});

test('zero, negative, or invalid elapsed growth time never heals or advances age', () => {
  const f = fixture(); tick(f, 30); const before = [f.b.hp, f.b.maxHp, f.b.blobAge, f.b.scale, f.b.bodyRadius];
  for (const dt of [0, -1, NaN, Infinity]) { tick(f, dt); assert.deepEqual([f.b.hp, f.b.maxHp, f.b.blobAge, f.b.scale, f.b.bodyRadius], before); }
});

test('older saved growth resumes without retroactive healing or new save fields', () => {
  const f = fixture(), base = { scale: f.b.scale, radius: f.b.bodyRadius };
  Object.assign(f.b, { blobAge: 60, blobMerged: .5, blobBase: base });
  [f.b.scale, f.b.bodyRadius] = geometry(base, 60, .5);
  f.b = resetPackRuntime(JSON.parse(JSON.stringify(f.b))); f.w.enemies = [f.b]; const keys = Object.keys(f.b).sort();
  tick(f, 0); close(f.b.hp, 100); assert.equal(f.b.maxHp, 2000);
  tick(f, 12); close(f.b.hp, 100); assert.equal(f.b.maxHp, 2000); assert.equal(f.b.blobMerged, .5);
  assert.deepEqual(Object.keys(f.b).sort(), [...new Set([...keys, 'hitFlash', 'scattered', 'recoil', 'hitStun', 'hidden', 'facingX'])].sort());
  assert.deepEqual([f.b.scale, f.b.bodyRadius], geometry(base, 72, .5));
});

test('new JSON saves retain growth progress and wounds without replaying earlier regeneration', () => {
  const continuous = fixture(); tick(continuous, 37.5);
  const resumed = fixture(); resumed.b = resetPackRuntime(JSON.parse(JSON.stringify(continuous.b))); resumed.w.enemies = [resumed.b];
  const hp = resumed.b.hp; tick(resumed, 0); close(resumed.b.hp, hp);
  tick(continuous, 37.5); tick(resumed, 37.5);
  for (const key of ['hp', 'maxHp', 'blobAge', 'scale', 'bodyRadius']) close(resumed.b[key], continuous.b[key], key);
});

test('bloblet merge keeps its existing 3% heal and swelling without additional growth regeneration', () => {
  const f = fixture(500); f.b.blobAge = 120; tick(f, 0); const shape = f.b.scale;
  const kid = createCombatant('bloblet', f.b.x + .1, f.b.y, false, []);
  Object.assign(kid, { aggro: true, blobletOf: f.b.id, bornAt: 0 }); f.w.enemies.push(kid); f.w.now = 3000; f.w.dt = .1;
  updatePackMonster(kid, f.w); assert.equal(kid.dead, true); assert.equal(kid.merged, true);
  close(f.b.hp, 560); assert.equal(f.b.maxHp, 2000); assert.equal(f.b.blobMerged, BLOB.mergeGrow);
  tick(f, 1); close(f.b.hp, 560); assert.ok(f.b.scale > shape);
  f.b.blobMerged = BLOB.mergeMax; tick(f, 1);
  assert.deepEqual([f.b.scale, f.b.bodyRadius], geometry(f.b.blobBase, 120, BLOB.mergeMax));
});

function realFixture() {
  const s = freshSave(); s.seed = 'FLEE-GAME'; s.level = 6;
  let rx = 7, ry = 2; while (generateRegion(s.seed, rx, ry).settlement) rx++;
  s.worldBeasts = { morphingBlob: { active: { rx, ry, tries: 0 }, cycle: 0 } };
  const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld');
  const b = g.enemies.find(e => e.worldBeast === 'morphingBlob'); assert.ok(b);
  Object.assign(b, { hp: 100, maxHp: 2000, aggro: true, packAttacks: [], packBossAttacks: [] });
  return { g, b, w: g.packWorld(0, 0) };
}
const idle = { state: { x: 0, y: 0 }, consume: () => false };

test('the production pause gate freezes growth and healing without wall-clock catch-up', () => {
  const f = realFixture(); tick(f, 30);
  f.g.setPaused(true, 1000); const before = [f.b.hp, f.b.maxHp, f.b.blobAge, f.b.scale, f.b.bodyRadius];
  f.g.update(90, idle, 91000); assert.deepEqual([f.b.hp, f.b.maxHp, f.b.blobAge, f.b.scale, f.b.bodyRadius], before);
  f.g.setPaused(false, 91000); tick(f, 1); close(f.b.hp, before[0]); close(f.b.blobAge, 31);
});

test('production snapshot, schema-14 migration, and Game reload preserve healing progress exactly', () => {
  const f = realFixture(); tick(f, 30); f.b.hp -= 50;
  const snapshot = f.g.exportSnapshot(1000), saved = JSON.parse(JSON.stringify(snapshot));
  const migrated = migrateSave(saved); assert.equal(migrated.version, 14);
  const restored = new Game(migrated, 999000), b = restored.enemies.find(e => e.id === f.b.id); assert.ok(b);
  for (const key of ['hp', 'maxHp', 'blobAge', 'scale', 'bodyRadius']) close(b[key], f.b[key], key);
  assert.deepEqual(b.blobBase, f.b.blobBase);
  const r = { b, w: restored.packWorld(0, 999000) }; tick(r, 0); close(b.hp, f.b.hp);
  tick(r, 12); tick(f, 12); close(b.hp, f.b.hp); assert.equal(b.maxHp, 2000); close(b.blobAge, 42);
});
