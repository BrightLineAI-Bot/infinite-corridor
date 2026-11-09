import test from 'node:test';
import assert from 'node:assert/strict';
import { HURT_VISUAL_MS, normalizeHurtVisual, sampleHurtVisual } from '../src/consume-visual.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { VIEWPORT_QUIET_INPUT } from '../src/combat-visuals.ts';

test('hurt receipt is bounded, dungeon-scoped, additive, and exact across migration', () => {
  const raw = { v: 1, kind: 'hurt', acceptedLogicalMs: 120, areaId: 'dungeon:test:g1', levelId: 'f2', future: { kept: true } };
  assert.deepEqual(normalizeHurtVisual(raw), raw);
  assert.equal(sampleHurtVisual(raw, 120, raw.areaId, raw.levelId), 0);
  assert.equal(sampleHurtVisual(raw, 120 + HURT_VISUAL_MS / 2, raw.areaId, raw.levelId), .5);
  assert.equal(sampleHurtVisual(raw, 120 + HURT_VISUAL_MS, raw.areaId, raw.levelId), null);
  assert.equal(sampleHurtVisual(raw, 121, 'dungeon:other:g1', raw.levelId), null);
  assert.equal(sampleHurtVisual(raw, 121, raw.areaId, 'root'), null);

  const save = freshSave();
  save.session.playerRuntime.hurtVisual = structuredClone(raw);
  const migrated = migrateSave(structuredClone(save));
  assert.deepEqual(migrated.session.playerRuntime.hurtVisual, raw);
});

test('hurt receipt fails closed while future versions retain opaque fields', () => {
  for (const raw of [null, {}, { v: 1, kind: 'hurt', acceptedLogicalMs: -1, areaId: 'a', levelId: 'b' }, { v: 1, kind: 'hurt', acceptedLogicalMs: 1, areaId: '', levelId: 'b' }])
    assert.equal(normalizeHurtVisual(raw), null);
  const future = { v: 2, opaque: { untouched: 7 } };
  assert.deepEqual(normalizeHurtVisual(future), future);
  assert.equal(sampleHurtVisual(future, 1, 'a', 'b'), null);
});

const encounter = () => createLabFixture({lab:'close-view',scenario:'wayfarer-hurt',seed:'CINDER-VERGE-47',now:1000}).game;
function runUntil(g, predicate) {
  let now=1000;
  for(let frame=0;frame<600&&!predicate();frame++){
    now+=1000/60;
    g.update(1/60,VIEWPORT_QUIET_INPUT,now);
  }
  assert.ok(predicate(), 'the real Ashling reached the expected combat outcome');
  return now;
}

test('a real Ashling hit drives a paused and reloadable recoil without replaying damage', () => {
  const g=encounter(), hp=g.player.hp;
  const now=runUntil(g,()=>g.player.hp<hp);
  const receipt=g.player.hurtVisual;
  assert.equal(receipt?.v,1);
  const phase=(game, clock)=>sampleHurtVisual(game.player.hurtVisual,game.consumeLogicalNow(clock),game.areaId(),String(game.map.levelId||'root'));
  assert.equal(phase(g,now),0);
  g.setPaused(true,now+HURT_VISUAL_MS/2);
  assert.ok(Math.abs(phase(g,20000)-.5)<1e-8);
  const reloaded=new Game(migrateSave(structuredClone(g.exportSnapshot(20000))),30000);
  assert.deepEqual(reloaded.player.hurtVisual,receipt);
  assert.equal(reloaded.player.hp,g.player.hp);
  assert.ok(Math.abs(phase(reloaded,30000)-.5)<1e-8);
});

test('Aegis prevents recoil and a future receipt survives real damage and defeat', () => {
  const guarded=encounter(), hp=guarded.player.hp;
  guarded.aegisUntil=20000;
  runUntil(guarded,()=>guarded.player.invulnerableUntil>1000);
  assert.equal(guarded.player.hp,hp);
  assert.equal(guarded.player.hurtVisual??null,null);
  const g=encounter(), future={v:2,opaque:{kept:true}}, hpBefore=g.player.hp;
  g.player.hurtVisual=future;
  const now=runUntil(g,()=>g.player.hp<hpBefore);
  assert.deepEqual(g.exportSnapshot(now).session.playerRuntime.hurtVisual,future);
  g.player.hp=1;
  for(let frame=1;frame<600&&!g.fallen;frame++) g.update(1/60,VIEWPORT_QUIET_INPUT,now+frame*1000/60);
  assert.ok(g.fallen);
  assert.deepEqual(g.exportSnapshot(g.lastUpdateNow).session.playerRuntime.hurtVisual,future);
});
