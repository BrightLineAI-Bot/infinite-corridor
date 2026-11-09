import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';
import { CACHE_PICKUP_VISUAL_MS, CHEST_OPEN_VISUAL_MS, normalizeCachePickupVisual, sampleCachePickupVisual } from '../src/consume-visual.ts';

function chestLab(now = 1000) {
  const g = createLabFixture({ lab: 'close-view', scenario: 'chest-opening', now }).game;
  g.lastUpdateNow = now + 100;
  const o = g.map.objects.find((q: any) => q.id === 'lab-chest-opening');
  assert.equal(o?.kind, 'chest');
  return { g, o };
}

test('canonical chest opening awards once before stamping its bounded receipt', () => {
  const { g, o } = chestLab(), order: string[] = [];
  const obtain = g.obtainDrop.bind(g), stamp = g.stampCachePickupVisual.bind(g);
  g.obtainDrop = (source: string) => { order.push('reward'); return obtain(source); };
  g.stampCachePickupVisual = (kind: string) => { order.push(`stamp:${kind}`); return stamp(kind); };
  const counter = g.save.dropCounter, iron = g.save.materials.cinderIron;
  const r = g.interact(null);
  assert.equal(r.ok, true); assert.equal(o.state, 'used');
  assert.equal(g.save.dropCounter, counter + 1); assert.equal(g.save.materials.cinderIron, iron + 1);
  assert.deepEqual(order, ['reward', 'stamp:chest']);
  assert.deepEqual(g.player.cachePickupVisual, { v: 1, kind: 'cachePickup', cacheKind: 'chest', acceptedLogicalMs: 1100, durationMs: CHEST_OPEN_VISUAL_MS, areaId: g.areaId(), levelId: String(g.map.levelId || 'root'), cancelled: false });
  assert.equal(sampleCachePickupVisual(g.player.cachePickupVisual, 1355, g.areaId(), String(g.map.levelId || 'root')), .5);
});

test('repeat and rejected chest opens neither reward nor replace a receipt', () => {
  const { g, o } = chestLab(); assert.equal(g.interact('open', o.id).ok, true);
  const receipt = g.player.cachePickupVisual, counter = g.save.dropCounter;
  assert.equal(g.interact('open', o.id).ok, false); assert.equal(g.save.dropCounter, counter); assert.strictEqual(g.player.cachePickupVisual, receipt);
  const refused = { id: 'refused-chest', kind: 'chest', x: g.player.x, y: g.player.y, state: 'used', actions: ['open'] }; g.map.objects.push(refused);
  assert.equal(g.interact('open', refused.id).ok, false); assert.equal(g.save.dropCounter, counter); assert.strictEqual(g.player.cachePickupVisual, receipt);
});

test('busy chest opening rewards immediately but its gesture stays visually refused', () => {
  const { g, o } = chestLab(); g.player.attackUntil = 1400; const counter = g.save.dropCounter;
  assert.equal(g.interact('open', o.id).ok, true); assert.equal(g.save.dropCounter, counter + 1);
  assert.equal(g.player.cachePickupVisual.cancelReason, 'busy');
  assert.equal(sampleCachePickupVisual(g.player.cachePickupVisual, 1100, g.areaId(), String(g.map.levelId || 'root')), null);
});

test('accepted interruptions cancel chest opening while refused attacks preserve it', () => {
  const { g, o } = chestLab(); g.installSystems(); assert.equal(g.interact('open', o.id).ok, true);
  g.primaryAttack(1200, { x: 1, y: 0 }); assert.equal(g.player.cachePickupVisual.cancelReason, 'attack');
  const receipt = { ...g.player.cachePickupVisual, cancelled: false, cancelReason: undefined }; g.player.cachePickupVisual = receipt;
  g.primaryAttack(1201, { x: 1, y: 0 }); assert.strictEqual(g.player.cachePickupVisual, receipt);
});

test('pause and canonical reload preserve phase without replaying the chest reward', () => {
  const { g, o } = chestLab(); assert.equal(g.interact('open', o.id).ok, true); const counter = g.save.dropCounter;
  g.setPaused(true, 1202); const expected = 102 / CHEST_OPEN_VISUAL_MS;
  const phase = (game: Game, now: number) => sampleCachePickupVisual(game.player.cachePickupVisual, game.consumeLogicalNow(now), game.areaId(), String(game.map.levelId || 'root'));
  assert.equal(phase(g, 5000), expected);
  const restored = new Game(deserializeSave(serializeSave(g.exportSnapshot(5000))), 9000);
  assert.equal(phase(restored, 9000), expected); assert.equal(restored.save.dropCounter, counter);
  restored.exportSnapshot(9010); assert.equal(restored.save.dropCounter, counter);
});

test('legacy cache receipts retain 400 ms semantics and future versions stay opaque', () => {
  const legacy = { v: 1, kind: 'cachePickup', cacheKind: 'supplyCache', acceptedLogicalMs: 100, durationMs: CACHE_PICKUP_VISUAL_MS, areaId: 'area', levelId: 'root', cancelled: false, extra: 7 };
  assert.deepEqual(normalizeCachePickupVisual(legacy), legacy);
  assert.equal(sampleCachePickupVisual(legacy, 300, 'area', 'root'), .5);
  assert.equal(normalizeCachePickupVisual({ ...legacy, cacheKind: 'chest', durationMs: CACHE_PICKUP_VISUAL_MS }), null);
  const future = { v: 9, kind: 'futurePickup', opaque: true }; assert.deepEqual(normalizeCachePickupVisual(future), future);
});
