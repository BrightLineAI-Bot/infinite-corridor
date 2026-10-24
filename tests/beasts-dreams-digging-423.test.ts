// Release 423 (Tim, 2026-10-24): world bosses keep their wounds when you die ("it only resets after they die"); the Far
// Sleep has fewer obstacles ("I can't... burst around and run from the bosses"); the shovel works in the overworld ("just
// like it works... in the dungeons").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { DREAM_VERSION, DREAM_BY_VERSION } from '../src/landscape.ts';
import { DIG, ensureDigging, planDig, dig, applyTunnels, overworldDiggable, overworldDigKey, OVERWORLD_DIG } from '../src/digging.ts';
import { ensureWorldBeasts } from '../src/world-beasts.ts';
import { ensureQuestingBeast } from '../src/questing-beast.ts';

test('a world beast that kills you keeps its wounds; the record survives a reload and clears when it dies', () => {
  const src = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
  assert.match(src, /q\.hpShare = Math\.max\(\.01, Math\.min\(1, e\.hp \/ e\.maxHp\)\)/, 'kept on a death');
  assert.match(src, /if \(share > 0 && share < 1\) c\.hp = Math\.max\(1, Math\.round\(c\.maxHp \* share\)\)/, 'and given back when it returns');
  const s = freshSave(); s.seed = 'WOUND'; ensureWorldBeasts(s); s.worldBeasts.lightningGiant.active = { rx: 9, ry: 9, tries: 1, hpShare: .4 };
  s.questingBeast = { active: { rx: 7, ry: 7, tries: 1, hpShare: .3 } }; ensureQuestingBeast(s);
  const back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(back.worldBeasts.lightningGiant.active.hpShare, .4); assert.equal(back.questingBeast.active.hpShare, .3);
  // Spawned through the game: it comes back at 40%.
  const g = new Game(back, 0); const c = g.createEnemyFromSpawn({ kind: 'lightningGiant', x: 10, y: 10, worldBeast: 'lightningGiant', id: 'wb' });
  assert.ok(Math.abs(c.hp / c.maxHp - .4) < .01, `${c.hp}/${c.maxHp}`);
});

test('the Far Sleep: new sections dream with far fewer obstacles; explored ones keep theirs', () => {
  assert.equal(DREAM_VERSION, 2); assert.deepEqual(DREAM_BY_VERSION[1], {});
  const blocked = (v) => { let b = 0, n = 0; for (let i = 0; i < 6; i++) { const s = freshSave(); s.seed = `DRM${i}`; const rx = 36 + i; s.atlas = { [`${rx},0`]: { dreamVersion: v } }; const g = new Game(s, 0); g.rx = rx; g.ry = 0; g.loadArea('overworld', false); const d = g.map.tiles.filter((t) => t.landscape === 'dream'); b += d.filter((t) => t.blocked).length; n += d.length; } return b / n; };
  const v1 = blocked(1), v2 = blocked(2); assert.ok(v2 < v1 * .5, `obstacles ${v1.toFixed(3)} → ${v2.toFixed(3)}`);
});

// A strip of open ground with rock to the east, a standing stone, a river and a castle wall.
function ground() {
  const W = 32, tiles = [];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) tiles.push({ x, y, kind: x >= 12 ? 'ember' : 'ash', blocked: x >= 12, elev: x >= 12 ? 2 : 0 });
  const set = (x, y, q) => Object.assign(tiles[y * W + x], q);
  set(11, 12, { kind: 'sleeperStone', blocked: true }); set(11, 14, { kind: 'river', blocked: true }); set(11, 16, { kind: 'castleWall', blocked: true });
  return { width: W, height: W, tiles, objects: [] };
}
test('the shovel digs rock and stones in the open world, never water, castles or settlements; the cut stays dug', () => {
  const s = freshSave(); s.seed = 'OWDIG'; ensureDigging(s); s.digging.shovel = 2; const key = overworldDigKey(40, 2), m = ground();
  const rock = planDig(m, 11, 10, 'right', key, { overworld: true }); assert.ok(rock.ok && rock.cut === 'wall' && rock.overworld);
  const r = dig(s, m, rock, key); assert.ok(r.ok, r.message); const t = m.tiles[10 * 32 + 12]; assert.equal(t.blocked, false); assert.equal(t.elev, 0, 'level with the ground you dug from');
  assert.equal(s.digging.shovel, 1, 'one dig for rock');
  assert.equal(planDig(m, 10, 12, 'right', key, { overworld: true }).cut, 'obstacle', 'a standing stone takes a whole shovel');
  assert.equal(planDig(m, 10, 14, 'right', key, { overworld: true }).ok, false, 'not a river'); assert.equal(planDig(m, 10, 16, 'right', key, { overworld: true }).ok, false, 'not a castle');
  assert.equal(overworldDiggable({ ...ground(), settlement: true }, 12, 5), false, 'not in a settlement');
  assert.ok(OVERWORLD_DIG.refuse.test('starVoid'));
  const again = ground(); applyTunnels(again, s, key, true); assert.equal(again.tiles[10 * 32 + 12].blocked, false, 'reopened on load'); assert.equal(again.tiles[10 * 32 + 12].elev, 0);
  const g = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
  assert.match(g, /const overworld = this\.area === "overworld" && !aboard\(this\.save\)/); assert.match(g, /applyTunnels\(this\.map,this\.save,overworldDigKey\(this\.rx,this\.ry\),true\)/);
  assert.equal(DIG.reach, 3);
});
