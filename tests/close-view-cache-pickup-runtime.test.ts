import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { CACHE_PICKUP_VISUAL_MS, sampleCachePickupVisual } from '../src/consume-visual.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';

const supplyLab=()=>{
  const g=createLabFixture({lab:'close-view',scenario:'cache-pickup-supply',now:1000}).game;
  g.lastUpdateNow=1100;
  return g;
};

const cacheAtPlayer = (g: Game, kind: 'supplyCache' | 'weaponCache', id = `test-${kind}`) => {
  const o = { id, kind, supplyType: kind === 'weaponCache' ? 'secondary' : 'restorativeDraught', x: g.player.x, y: g.player.y, state: 'ready', actions: ['collect'] };
  g.map.objects.push(o);
  return o;
};

test('canonical supply and weapon cache collection stamp a bounded receipt after immediate reward', () => {
  for (const kind of ['supplyCache', 'weaponCache'] as const) {
    const scenario = kind === 'supplyCache' ? 'cache-pickup-supply' : 'cache-pickup-weapon';
    const g = createLabFixture({ lab: 'close-view', scenario, now: 1120 }).game; g.lastUpdateNow = 1120;
    const o = g.map.objects.find((q: any) => q.id === 'lab-cache-pickup'); assert.equal(o?.kind, kind);
    const before = kind === 'supplyCache' ? g.save.consumables.restorativeDraught : g.save.inventory.length;
    const r = g.interact(null);
    assert.equal(r.ok, true); assert.equal(o.state, 'used');
    assert.ok(kind === 'supplyCache' ? g.save.consumables.restorativeDraught > before : g.save.inventory.length > before);
    assert.deepEqual(g.player.cachePickupVisual, { v: 1, kind: 'cachePickup', cacheKind: kind, acceptedLogicalMs: 1120, durationMs: CACHE_PICKUP_VISUAL_MS, areaId: g.areaId(), levelId: String(g.map.levelId || 'root'), cancelled: false });
    assert.equal(sampleCachePickupVisual(g.player.cachePickupVisual, 1320, g.areaId(), String(g.map.levelId || 'root')), .5);
    assert.equal(sampleCachePickupVisual(g.player.cachePickupVisual, 1520, g.areaId(), String(g.map.levelId || 'root')), null);
  }
});

test('repeat and rejected cache collection neither re-award nor replace the receipt', () => {
  const g=supplyLab(),o=g.map.objects.find(q=>q.id==='lab-cache-pickup');
  assert.equal(g.interact('collect', o.id).ok, true); const receipt = g.player.cachePickupVisual, count = g.save.consumables.restorativeDraught;
  g.lastUpdateNow = 1150; assert.equal(g.interact('collect', o.id).ok, false);
  assert.equal(g.save.consumables.restorativeDraught, count); assert.strictEqual(g.player.cachePickupVisual, receipt);
  const other = cacheAtPlayer(g, 'weaponCache', 'rejected'); other.actions = [];
  assert.equal(g.interact('collect', other.id).ok, false); assert.strictEqual(g.player.cachePickupVisual, receipt);
});

test('accepted action interruption cancels pickup while refused action preserves it', () => {
  const g=supplyLab(),o=g.map.objects.find(q=>q.id==='lab-cache-pickup');
  assert.equal(g.interact('collect', o.id).ok, true); g.primaryAttack(1200, { x: 1, y: 0 });
  assert.equal(g.player.cachePickupVisual.cancelReason, 'attack');
  const resumed = { ...g.player.cachePickupVisual, cancelled: false, cancelReason: undefined }; g.player.cachePickupVisual = resumed;
  g.primaryAttack(1201, { x: 1, y: 0 }); assert.strictEqual(g.player.cachePickupVisual, resumed);
});

test('busy accepted collection rewards immediately without deferring its animation', () => {
  const g=supplyLab(),o=g.map.objects.find(q=>q.id==='lab-cache-pickup');
  g.player.attackUntil=1400;
  const before = g.save.consumables.restorativeDraught; assert.equal(g.interact('collect', o.id).ok, true);
  assert.ok(g.save.consumables.restorativeDraught > before); assert.equal(g.player.cachePickupVisual.cancelReason, 'busy');
  assert.equal(sampleCachePickupVisual(g.player.cachePickupVisual,1450,g.areaId(),String(g.map.levelId||'root')),null);
});

test('active collection resumes at the same phase and cleared collection stays absent after reloading',()=>{
  const g=supplyLab(),phase=(g,now)=>sampleCachePickupVisual(g.player.cachePickupVisual,g.consumeLogicalNow(now),g.areaId(),String(g.map.levelId||'root'));
  assert.equal(g.interact(null).ok,true);
  g.setPaused(true,1200);
  assert.equal(phase(g,5000),.25);
  const count=g.save.consumables.restorativeDraught;
  const reopen=(g,at,now)=>new Game(deserializeSave(serializeSave(g.exportSnapshot(at))),now);
  const restored=reopen(g,5000,9000);
  assert.equal(phase(restored,9000),.25);
  assert.equal(restored.save.consumables.restorativeDraught,count);
  restored.loadArea(restored.area,false);
  assert.equal(reopen(restored,9010,10000).player.cachePickupVisual,null);
});

test('an overworld cache still rewards immediately without arming a Close View gesture',()=>{
  const g=new Game(freshSave(),1000),o=cacheAtPlayer(g,'supplyCache');
  const before=g.save.consumables.restorativeDraught;
  assert.equal(g.interact('collect',o.id).ok,true);
  assert.ok(g.save.consumables.restorativeDraught>before);
  assert.equal(g.player.cachePickupVisual,null);
});

test('accepted drink interrupts collection, while a refused drink leaves it in place',()=>{
  const g=supplyLab();
  assert.equal(g.interact(null).ok,true);
  const receipt=g.player.cachePickupVisual;
  assert.equal(g.useConsumable('restorativeDraught',1130),false);
  assert.strictEqual(g.player.cachePickupVisual,receipt);
  g.player.hp=10;
  assert.equal(g.useConsumable('restorativeDraught',1140),true);
  assert.equal(g.player.cachePickupVisual.cancelReason,'drink');
});

test('unknown future pickup receipts survive normalization and export unchanged', () => {
  const g = new Game(freshSave(), 1000), future = { v: 9, kind: 'futurePickup', opaque: { value: 7 } };
  g.player.cachePickupVisual = future; assert.deepEqual(g.exportSnapshot(1100).session.playerRuntime.cachePickupVisual, future);
});
