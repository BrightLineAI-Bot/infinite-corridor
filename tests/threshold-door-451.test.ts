// Release 451 (Tim: "I saw a shrine on the overworld and I clicked it. And it took me to this dungeon... When I killed the
// guardian, he didn't spawn a door for me to leave... now I can't leave"): a Mislaid Threshold's crossing raises a door
// where its guardian falls, and stays open; a save whose guardian already fell gets the door on load.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, isCrossingGuardian } from '../src/game.ts';
import { dungeonHistory } from '../src/interactions.ts';

function displaced(k = 0) {
  for (let i = k; i < k + 40; i++) {
    const s = freshSave(); s.seed = 'THRESH451-' + i; s.level = 30; const g = new Game(s, 0); g.rx = 5; g.ry = -3; g.loadArea('overworld', false);
    const o = { id: 'seam-' + i, kind: 'displacementDevice', x: 16, y: 16, state: 'armed', actions: ['enter'] }; g.map.objects.push(o); g.startDisplacement(o, false);
    const guard = g.enemies.find(isCrossingGuardian); if (guard) return { s, g, guard };
  }
  throw new Error('no guarded crossing');
}

test('felling the Threshold guardian raises a door where it fell, and the door leads out', () => {
  const { s, g, guard } = displaced();
  assert.equal(g.map.objects.some((o) => o.id === 'threshold-door'), false);
  for (const e of g.enemies) if (e !== guard) { e.dead = true; e.hp = 0; }
  guard.hp = 0; guard.dead = true; g.defeatEnemy(guard);
  const door = g.map.objects.find((o) => o.id === 'threshold-door'); assert.ok(door); assert.equal(g.defeatNotice.title, 'THE THRESHOLD OPENS'); assert.ok(s.narrative.journal.some((j) => j.title === 'The Mislaid Threshold'));
  assert.ok(Math.hypot(door.x - guard.x, door.y - guard.y) < 4, 'beside the guardian');
  Object.assign(g.player, { x: door.x, y: door.y + .2 }); const r = g.interact(undefined, 'threshold-door');
  assert.ok(r.ok, g.message); assert.equal(g.area, 'overworld'); assert.match(g.message, /completed crossing releases you/);
  assert.equal(s.session.activeDisplacement, null);
});

test('the crossing boss falling also opens it; a guardian felled before this release gets its door on load', () => {
  const { s, g, guard } = displaced(3), id = g.areaId();
  guard.hp = 0; guard.dead = true; g.snapshotArea(); g.loadArea('dungeon', false);
  assert.ok(g.map.objects.some((o) => o.id === 'threshold-door'), 'door raised on load'); assert.equal(dungeonHistory(s, id).thresholdOpen, true);
  const { g: g2 } = displaced(9), boss = { id: 'b', kind: 'ashling', boss: true, x: 10, y: 10, dead: true, hp: 0 };
  assert.equal(g2.thresholdOpen(), false); g2.enemies.push(boss); g2.defeatEnemy(boss); assert.equal(g2.thresholdOpen(), true);
});
