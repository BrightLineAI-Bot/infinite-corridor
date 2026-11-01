// Tim (2026-11-01): "instead of it saying rift boss slain, when we kill a world boss, it should say archfiend slain".
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

test('felling a world boss or the Questing Beast says ARCHFIEND SLAIN, with its name and bounty', () => {
  const s = freshSave(); s.seed = 'ARCHFIEND'; const g = new Game(s, 0); g.rx = 7; g.ry = 2; g.loadArea('overworld', false);
  for (const [kind, extra, name] of [['morphingBlob', { worldBeast: 'morphingBlob' }, /Morphing Blob/], ['questingBeast', { questingBeast: true }, /Questing Beast/]]) {
    const e = g.createEnemyFromSpawn({ id: `${kind}:t`, kind, boss: true, x: 10, y: 10, ...extra }, 'overworld'); g.enemies.push(e);
    e.hp = 0; e.dead = true; g.defeatEnemy(e);
    assert.equal(g.defeatNotice.title, 'ARCHFIEND SLAIN'); assert.match(g.defeatNotice.detail, name); assert.match(g.defeatNotice.detail, /marks/);
  }
});
