// The Rite of Ascendancy (Tim, 2026-11-02): a sapling dais; touch it and fire seals the section while waves come for five
// minutes; die and it resets (three tries a dais); survive and a great tree rises, with Divine Viscera on its crown.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { ASCENDANCY, saplingHere, riteSkyway, riteRamp } from '../src/ascendancy.ts';

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
  assert.ok(!g.map.objects.some((q) => q.kind === 'saplingDais') && g.map.objects.some((q) => q.name === 'Dead Strange Tree'), 'withered for good');
});

test('survive the rite: the strange tree burns to ashes; touch them and a great tree rises out of the ground, the same each time, with Divine Viscera on its crown (once) and its door to the sky', () => {
  const { s, g, o } = at(), [x, y] = findDais(); assert.ok(begin(g, o).ok);
  g.riteTick(.05, 1000 + ASCENDANCY.duration * 500); assert.ok(o.burn > .4 && o.burn < .6, 'the tree burns down as the rite goes on');
  g.riteTick(.05, 1000 + ASCENDANCY.duration * 1000 + 1);
  assert.equal(g.rite, null); assert.equal(s.ascendancy[`${x},${y}`].done, true); assert.ok(!g.map.canopy, 'no tree yet');
  const ash = g.map.objects.find((q) => q.kind === 'riteAshes'); assert.ok(ash && !g.map.objects.some((q) => q.kind === 'saplingDais'), 'a heap of ashes');
  g.rx = x + 1; g.loadArea('overworld', false); g.rx = x; g.loadArea('overworld', false); const ash2 = g.map.objects.find((q) => q.kind === 'riteAshes'); assert.ok(ash2, 'the ashes wait for you');
  g.player.x = ash2.x; g.player.y = ash2.y; g.lastUpdateNow = 50000; assert.ok(g.interact('touch', ash2.id).ok); assert.ok(g.map.canopy && g.treeRise, 'the tree begins to rise');
  assert.ok(g.effects.some((f) => f.kind === 'riteFlash'));
  const w = 32; assert.ok(!g.map.tiles[Math.floor(g.player.y + .6) * w + Math.floor(g.player.x + .4)].canopy, 'set clear of the wood');
  const finals = new Map(g.treeRise.tiles); assert.ok([...g.map.tiles.filter((t) => t.canopy)].every((t) => t.elev === 0), 'from the ground');
  g.tickTreeRise(50000 + ASCENDANCY.rise * 500); const mid = g.map.tiles.filter((t) => t.canopy && finals.get(t.y * w + t.x) > 4); assert.ok(mid.some((t) => t.elev > 0 && t.elev < finals.get(t.y * w + t.x)), 'rising'); assert.ok(g.effects.some((f) => f.kind === 'riteRubble'), 'rubble falls');
  g.tickTreeRise(50000 + ASCENDANCY.rise * 1000 + 1); assert.equal(g.treeRise, null); assert.ok([...finals].every(([i, e]) => g.map.tiles[i].elev === e), 'risen in full');
  const bloom = g.map.objects.find((q) => q.kind === 'visceraBloom'), crown = g.map.tiles[bloom.y * 32 + bloom.x]; assert.equal(crown.elev, g.map.canopy.top, 'on the crown');
  assert.ok(g.map.objects.some((q) => q.kind === 'canopyGate'), 'its door to the sky'); assert.equal(riteSkyway(SEED, x, y), true);
  const tree = g.map.tiles.filter((t) => t.canopy).map((t) => `${t.x},${t.y},${t.elev}`).join();
  const before = Number(s.skylands?.viscera) || 0; g.player.x = bloom.x; g.player.y = bloom.y; assert.ok(g.interact('gather', bloom.id).ok); assert.equal(s.skylands.viscera, before + ASCENDANCY.viscera);
  g.rx = x + 1; g.loadArea('overworld', false); g.rx = x; g.loadArea('overworld', false);
  assert.equal(g.map.tiles.filter((t) => t.canopy).map((t) => `${t.x},${t.y},${t.elev}`).join(), tree, 'the same tree');
  assert.ok(!g.map.objects.some((q) => q.kind === 'visceraBloom' || q.kind === 'riteAshes'), 'the bloom is gathered for good; the ashes are gone');
  const m = migrateSave(JSON.parse(JSON.stringify({ ...s, ascendancy: { ...s.ascendancy, 'bad': {}, '3,4': { tries: 9, done: 'x' } } })));
  assert.deepEqual(m.ascendancy[`${x},${y}`], { tries: 1, done: true, risen: true, bloom: true }); assert.deepEqual(m.ascendancy['3,4'], { tries: 3, done: false, risen: false, bloom: false }); assert.equal(m.ascendancy.bad, undefined);
  assert.deepEqual(freshSave().ascendancy, {});
});

test('the rite ramps: the country\'s own creatures at first, then hitting harder and harder (toward a world beast\'s blow), with health a few of your own blows', () => {
  const { s, g, o } = at(); assert.ok(begin(g, o).ok); const D = ASCENDANCY.duration * 1000;
  g.riteTick(.05, 1000 + ASCENDANCY.grace * 1000 + 10); const early = g.enemies.filter((e) => e.riteFoe);
  for (const e of g.enemies) if (e.riteFoe) { e.dead = true; e.hp = 0; }
  g.rite.nextAt = 0; g.riteTick(.05, 1000 + D * .97); const late = g.enemies.filter((e) => e.riteFoe && !e.dead);
  assert.ok(late.length > early.length, `bigger waves late (${early.length} → ${late.length})`);
  const want = Math.round(s.maxHp * ASCENDANCY.ramp.share[1] * .9); for (const e of late) { const own = g.createEnemyFromSpawn({ kind: e.kind, x: e.x, y: e.y, id: 'probe' }, 'overworld'); assert.ok(e.damage >= Math.max(want, own.damage * 2), `${e.kind}: ${e.damage} vs its own ${own.damage}`); }

  assert.ok(riteRamp(.05) === null && riteRamp(1).share === ASCENDANCY.ramp.share[1]);
});

import { render } from '../src/renderer.ts';
function strictCtx() {
  let depth = 0; const base = { canvas: { width: 360, height: 640 }, save() { depth++; }, restore() { depth--; }, get depth() { return depth; }, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1 }),
    ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError(`negative radius ${rx}`); }, arc(x, y, r) { if (r < 0) throw new RangeError(`negative radius ${r}`); } };
  return new Proxy(base, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
}
test('every stage of the rite draws: the strange tree, burning, the fire round the edges, the ashes, the tree rising with its rubble and flash', () => {
  const { g, o } = at(); const draw = (now) => { const ctx = strictCtx(); assert.doesNotThrow(() => render(ctx, g, 360, 640, now)); assert.equal(ctx.depth, 0); };
  draw(1000); begin(g, o); g.riteTick(.05, 1000 + ASCENDANCY.duration * 600); draw(2000);
  g.riteTick(.05, 1000 + ASCENDANCY.duration * 1000 + 1); draw(3000);
  const ash = g.map.objects.find((q) => q.kind === 'riteAshes'); g.player.x = ash.x; g.player.y = ash.y; g.lastUpdateNow = 9000; g.interact('touch', ash.id);
  for (const t of [9100, 9000 + ASCENDANCY.rise * 400, 9000 + ASCENDANCY.rise * 900]) { g.tickTreeRise(t); draw(t); }
});
