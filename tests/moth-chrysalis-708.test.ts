// Release 708 (Tim, 2026-11-03: "the moth... his chrysalis can appear on the great trees... hanging from a branch and if you attack
// it enough it will drop and then... it can start harassing you in the tree. But if you go down to the ground, you can just have the
// normal fight with it").
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { CHRYSALIS, mothChrysalisFor, BEAST_APERTURE, ensureWorldBeasts } from '../src/world-beasts.ts';
import { APERTURE_THRESHOLDS } from '../src/world.ts';
import { drawPackMonster } from '../src/monster-render.ts';

const SEED = 'CROWN', open = (s) => { s.seed = SEED; s.perception.aperture = APERTURE_THRESHOLDS[BEAST_APERTURE.ashenMoth - 1]; ensureWorldBeasts(s); return s; };
let found = null;
function chrysalisTree() { // a great tree section that holds the chrysalis for this seed
  if (found) return found;
  for (let x = 14; x < 200 && !found; x++) for (let y = 14; y < 200 && !found; y += 3) { if (sectionRegion(SEED, x, y, LANDSCAPE_VERSION).type !== 'jungle') continue;
    const s = open(freshSave()), g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); if (g.map.canopy && g.enemies.some((e) => e.mothChrysalis)) found = [x, y]; }
  return found;
}
const fresh = () => { const [x, y] = chrysalisTree(), s = open(freshSave()), g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return { s, g }; };

test('a chrysalis hangs from a great tree\'s branch, only once the Moth is open to the Wayfarer and free', () => {
  const { g } = fresh(), c = g.enemies.find((e) => e.mothChrysalis); assert.ok(c);
  const t = g.map.tiles[Math.round(c.y) * 32 + Math.round(c.x)]; assert.equal(t.kind, 'canopyBranch'); assert.ok(t.elev > 0); assert.equal((c.packAttacks || []).length, 0, 'it never attacks');
  const [x, y] = chrysalisTree(), low = freshSave(); low.seed = SEED; ensureWorldBeasts(low); const gl = new Game(low, 0); gl.rx = x; gl.ry = y; gl.loadArea('overworld'); assert.ok(!gl.enemies.some((e) => e.mothChrysalis), 'not below its Aperture tier');
  const busy = open(freshSave()); busy.worldBeasts.ashenMoth.active = { rx: 99, ry: 99, tries: 0 }; const gb = new Game(busy, 0); gb.rx = x; gb.ry = y; gb.loadArea('overworld'); assert.ok(!gb.enemies.some((e) => e.mothChrysalis), 'not while the Moth hunts elsewhere');
});

test('fell it and the Moth hatches where it hung: its hunt begins here; up in the tree it only harries, on the ground it fights with everything', () => {
  const { s, g } = fresh(), c = g.enemies.find((e) => e.mothChrysalis); g.defeatEnemy(c);
  const m = g.enemies.find((e) => e.kind === 'ashenMoth' && !e.dead); assert.ok(m); assert.equal(m.worldBeast, 'ashenMoth'); assert.deepEqual([s.worldBeasts.ashenMoth.active.rx, s.worldBeasts.ashenMoth.active.ry], [g.rx, g.ry]);
  assert.ok((g.questNotices || []).some((n) => n.title === 'THE ASHEN MOTH'), 'a notice says it hatched'); void CHRYSALIS;
  const branch = g.map.tiles.find((t) => t.kind === 'canopyBranch' && t.elev > 0); g.player.x = branch.x; g.player.y = branch.y; g.mothHarass();
  assert.ok(m.mothHarassing); assert.ok(m.packAttacks.every((id) => CHRYSALIS.harass.includes(id)));
  const ground = g.map.tiles.find((t) => !t.canopy && !t.blocked && !(t.elev > 0)); g.player.x = ground.x; g.player.y = ground.y; g.mothHarass();
  assert.equal(m.mothHarassing, false); assert.ok(m.packAttacks.includes('mothDive') && m.packAttacks.includes('mothCocoon'));
  const g2 = new Game(s, 0); g2.rx = g.rx; g2.ry = g.ry; g2.loadArea('overworld'); assert.ok(g2.enemies.some((e) => e.kind === 'ashenMoth'), 'come back and its hunt is here'); assert.ok(!g2.enemies.some((e) => e.mothChrysalis), 'and the chrysalis is gone');
});

test('it is tough enough to take a while, and draws without throwing', () => {
  const { g } = fresh(), c = g.enemies.find((e) => e.mothChrysalis); assert.ok(c.maxHp >= 40);
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : () => {}, set: () => true });
  c.hp = c.maxHp * .3; assert.ok(drawPackMonster(ctx, c, 32, 1000, 'down'));
});
