// Tim's log (Unreleased): killing a Spinosaurus gave no Echo. The big-room Spinosaurus, the interloper and the big-room Wild
// Stegosaurus are tuned as world beasts (tuneSpinoBeast / tuneStegoRoom) but carry no `worldBeast`, so the ordinary 0% applied.
// Their kills now give the beast's Echo for certain, are counted in save.roomBeastSlain, and a journey that killed one before is
// caught up on load from the lasting per-kill flag. The dino duel's eaten loser stays nobody's (release 974).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, tuneSpinoBeast, tuneStegoRoom, characterStats } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { grantSlainEchoes, ensureRoomBeastSlain, noteRoomBeastKill } from '../src/echoes.ts';

const game = () => { const s = freshSave(); s.seed = 'ROOM-BEAST-ECHO'; const g = new Game(s, 0); return { s, g }; };
const beast = (g, kind, id, flags) => {
  const c = createCombatant(kind, g.player.x + 2, g.player.y, false, []); c.id = id;
  if (kind === 'spinoRex') tuneSpinoBeast(c, g.save, characterStats(g.save), flags); else tuneStegoRoom(c, g.save, characterStats(g.save));
  g.enemies.push(c); return c;
};
const kill = (g, e) => { e.hp = 0; e.dead = true; g.defeatEnemy(e); };

test('a big-room Spinosaurus leaves its Echo on the first kill, and is counted', () => {
  const { s, g } = game(); assert.equal(s.echoes.owned.spinoRex, undefined);
  const e = beast(g, 'spinoRex', 'bldg:x:f1:spino-rex', { spinoRoom: true }); assert.equal(e.worldBeast, undefined); assert.equal(e.boss, false);
  kill(g, e); assert.equal(s.echoes.owned.spinoRex, true); assert.equal(s.roomBeastSlain.spinoRex, 1);
});

test('the interloper Spinosaurus and the big-room Wild Stegosaurus leave theirs too', () => {
  { const { s, g } = game(); kill(g, beast(g, 'spinoRex', 'prey-1:spino', { spinoInterloper: 'prey-1' })); assert.equal(s.echoes.owned.spinoRex, true); }
  { const { s, g } = game(); kill(g, beast(g, 'wildStego', 'bldg:y:f2:wild-stego')); assert.equal(s.echoes.owned.wildStego, true); assert.equal(s.roomBeastSlain.wildStego, 1); }
});

test('the dino duel: an eaten Spinosaurus is nobody\'s kill (no Echo, not counted)', () => {
  const { s, g } = game(); const e = beast(g, 'spinoRex', 'bldg:z:f1:spino-rex', { spinoRoom: true }); e.noRewards = true; kill(g, e);
  assert.equal(s.echoes.owned.spinoRex, undefined); assert.equal(s.roomBeastSlain.spinoRex, 0);
  assert.equal(noteRoomBeastKill(s, { kind: 'spinoRex', spinoRoom: true, summonedBy: 'x' }), false, 'nor a summoned one');
});

test('a journey that killed one before is caught up on load, once; the record is additive', () => {
  const s = freshSave(); delete s.roomBeastSlain;
  s.worldFlags['drop:v1:building:SEED:4:5:keep:f2:building:SEED:4:5:keep:f2:spino-rex'] = true;
  s.worldFlags['drop:v1:the-deep:a:b:prey:spino'] = true;
  s.worldFlags['drop:v1:keep:wild-stego'] = true;
  s.worldFlags['drop:v1:dungeon:x:rootBrute-3'] = true;
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(m.echoes.owned.spinoRex, true); assert.equal(m.echoes.owned.wildStego, true);
  assert.equal(m.roomBeastSlain.spinoRex, 1); assert.equal(m.roomBeastSlain.wildStego, 1); assert.equal(m.roomBeastSlain.caughtUp, 1);
  assert.deepEqual(grantSlainEchoes(m), [], 'nothing more to grant');
  m.roomBeastSlain.note = 'kept'; const again = migrateSave(JSON.parse(JSON.stringify(m))); assert.equal(again.roomBeastSlain.note, 'kept', 'unknown fields kept');
  const clean = migrateSave(JSON.parse(JSON.stringify(freshSave()))); assert.equal(clean.echoes.owned.spinoRex, undefined); assert.equal(clean.echoes.owned.wildStego, undefined);
  assert.deepEqual(ensureRoomBeastSlain(freshSave()), { spinoRex: 0, wildStego: 0, caughtUp: 1 });
});

test('the roaming Spinosaurus world beast is unchanged: its Echo on the first kill, granted on load from worldBeasts', () => {
  const s = freshSave(); s.worldBeasts.spinoRex.slain = 1; const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(m.echoes.owned.spinoRex, true); assert.equal(m.roomBeastSlain.spinoRex, 0);
});
