// The Rite of Ascendancy (Tim, 2026-11-02): a sapling dais; touch it and fire seals the section while waves come for five
// minutes; die and it resets (three tries a dais); survive and a great tree rises, with Divine Viscera on its crown.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { ASCENDANCY, saplingHere, riteSkyway } from '../src/ascendancy.ts';

const SEED = 'RITE1';
let spot = null;
const findDais = () => { if (spot) return spot; for (let x = 4; x < 80 && !spot; x++) for (let y = -30; y < 30 && !spot; y++) if (saplingHere(SEED, x, y)) { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld', false); if (g.map.objects.some((o) => o.kind === 'saplingDais')) spot = [x, y]; } return spot; };
const at = () => { const [x, y] = findDais(), s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld', false); const o = g.map.objects.find((q) => q.kind === 'saplingDais'); g.player.x = o.x; g.player.y = o.y + 1; return { s, g, o }; };
const begin = (g, o, now = 1000) => { g.lastUpdateNow = now; return g.interact('begin', o.id); };

test('touching the sapling begins the rite: fire bars every edge and waves come, closer together as it goes', () => {
  const { g, o } = at(), [x, y] = findDais(); assert.ok(begin(g, o).ok); assert.ok(g.rite); assert.equal(o.state, 'burning');
  g.transitionSection(1, 0); assert.deepEqual([g.rx, g.ry], [x, y], 'the fire bars the way'); assert.match(g.message, /fire/);
  let t = 1000 + ASCENDANCY.grace * 1000 + 10; g.riteTick(.05, t); const first = g.enemies.filter((e) => e.riteFoe && !e.dead).length; assert.ok(first >= 2, `a wave came (${first})`);
  for (let i = 0; i < 40; i++) { t += 15000; for (const e of g.enemies) if (e.riteFoe) { e.dead = true; e.hp = 0; } g.riteTick(.05, Math.min(t, 1000 + ASCENDANCY.duration * 1000 - 1)); assert.ok(g.enemies.filter((e) => e.riteFoe && !e.dead).length <= ASCENDANCY.waves.cap); }
  assert.ok(g.rite.n > 10, `${g.rite.n} waves`);
});

test('die and the rite breaks: the fire goes down, its creatures go, and the sapling has one fewer rite; after three it withers', () => {
  const { s, g, o } = at(), [x, y] = findDais();
  for (let k = 1; k <= ASCENDANCY.tries; k++) {
    const d = g.map.objects.find((q) => q.kind === 'saplingDais'); assert.ok(d, `a dais for rite ${k}`); g.player.x = d.x; g.player.y = d.y + 1; assert.ok(begin(g, d, 1000 * k).ok);
    g.riteTick(.05, 1000 * k + ASCENDANCY.grace * 1000 + 10); assert.ok(g.enemies.some((e) => e.riteFoe));
    g.player.hp = 0; g.update(.05, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, 1000 * k + 6000);
    assert.equal(g.rite, null, 'broken'); assert.ok(!g.enemies.some((e) => e.riteFoe && !e.dead), 'its creatures are gone'); assert.equal(s.ascendancy[`${x},${y}`].tries, k);
    g.player.hp = s.maxHp; g.rx = x; g.ry = y; g.loadArea('overworld', false);
  }
  assert.ok(!g.map.objects.some((q) => q.kind === 'saplingDais') && g.map.objects.some((q) => q.name === 'Withered Sapling'), 'withered for good');
});

test('survive the rite and a great tree rises, the same each time, with Divine Viscera on its crown (once)', () => {
  const { s, g, o } = at(), [x, y] = findDais(); assert.ok(begin(g, o).ok);
  g.riteTick(.05, 1000 + ASCENDANCY.duration * 1000 + 1);
  assert.equal(g.rite, null); assert.equal(s.ascendancy[`${x},${y}`].done, true); assert.ok(g.map.canopy, 'a great tree'); assert.ok(!g.map.objects.some((q) => q.kind === 'saplingDais'));
  const bloom = g.map.objects.find((q) => q.kind === 'visceraBloom'), crown = g.map.tiles[bloom.y * 32 + bloom.x]; assert.equal(crown.elev, g.map.canopy.top, 'on the crown');
  assert.equal(g.map.objects.some((q) => q.kind === 'canopyGate'), riteSkyway(SEED, x, y), 'its door to the sky only for a share of rites');
  const tree = g.map.tiles.filter((t) => t.canopy).map((t) => `${t.x},${t.y},${t.elev}`).join();
  const before = Number(s.skylands?.viscera) || 0; g.player.x = bloom.x; g.player.y = bloom.y; assert.ok(g.interact('gather', bloom.id).ok); assert.equal(s.skylands.viscera, before + ASCENDANCY.viscera);
  g.rx = x + 1; g.loadArea('overworld', false); g.rx = x; g.loadArea('overworld', false);
  assert.equal(g.map.tiles.filter((t) => t.canopy).map((t) => `${t.x},${t.y},${t.elev}`).join(), tree, 'the same tree');
  assert.ok(!g.map.objects.some((q) => q.kind === 'visceraBloom'), 'the bloom is gathered for good');
  const m = migrateSave(JSON.parse(JSON.stringify({ ...s, ascendancy: { ...s.ascendancy, 'bad': {}, '3,4': { tries: 9, done: 'x' } } })));
  assert.deepEqual(m.ascendancy[`${x},${y}`], { tries: 1, done: true, bloom: true }); assert.deepEqual(m.ascendancy['3,4'], { tries: 3, done: false, bloom: false }); assert.equal(m.ascendancy.bad, undefined);
  assert.deepEqual(freshSave().ascendancy, {});
});
