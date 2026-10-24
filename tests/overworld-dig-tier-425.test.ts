// Release 425 (Tim: "you can get the shovel whenever, but you can't change the world... you can't modify the overworld until
// infinite two"): Act facing open-world rock refuses below Infinite II and digs from it; dungeons are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { OVERWORLD_DIG, overworldDiggable } from '../src/digging.ts';

function facingRock(aperture) {
  const s = freshSave(); s.seed = 'OWD2'; s.materials.wood = 20; s.materials.stone = 20; s.perception.aperture = aperture;
  const g = new Game(s, 0); g.rx = 4; g.ry = 3; g.loadArea('overworld', false); g.enemies = []; g.map.objects = [];
  const t = g.map.tiles.find((q) => q.x > 2 && q.y > 2 && q.x < 29 && q.y < 29 && !q.blocked && overworldDiggable(g.map, q.x + 1, q.y));
  Object.assign(g.player, { x: t.x - .5, y: t.y - .75, facing: 'right' }); return { g, at: t.y * 32 + t.x + 1, get rock() { return g.map.tiles[this.at]; } };
}

test('the open world gives way to a shovel only from Infinite II', () => {
  assert.equal(APERTURE_BANDS[OVERWORLD_DIG.tier].name, 'Infinite II');
  const low = facingRock(APERTURE_BANDS[OVERWORLD_DIG.tier].threshold - 1), r = low.g.interact();
  assert.equal(r.ok, false); assert.match(low.g.message, /Infinite II/); assert.equal(low.rock.blocked, true, 'untouched');
  assert.equal(low.g.save.digging?.shovel || 0, 0, 'no shovel spent or crafted');
  const high = facingRock(APERTURE_BANDS[OVERWORLD_DIG.tier].threshold), ok = high.g.interact();
  assert.equal(ok.ok, true, high.g.message); assert.equal(high.rock.blocked, false);
});
