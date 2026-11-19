// Glyph Mine × Rift Step (Tim, 2026-11-19; src/hit-cast-passives.ts RIFT_MINE): each Rift Step leaves a mine where it began and
// where it lands; once the charges are spent (or after the grace) they link into a line (2) or a triangle (3) of inky void.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { APERTURE_SKILLS } from '../src/items.ts';
import { BRANCHES, learnRank, learnMod, chooseCap } from '../src/constellation.ts';
import { GLYPH_MINE, RIFT_MINE, PASSIVE_TEXT, riftMinesOf, riftVoidOf, glyphMinesOf, inRiftVoid, tickHitCastPassives } from '../src/hit-cast-passives.ts';

const DT = 1 / 60;
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
// Rift Step mastered, Fold (two charges) unless `fold` is false, Glyph Mine learned unless `mine` is false.
function arena({ fold = true, mine = true, foes = [] } = {}) {
  const s = freshSave(); s.seed = 'RIFT-MINES'; s.perception.aperture = 900; s.materials.lumenDust = 50;
  for (let i = 0; i < APERTURE_SKILLS[BRANCHES.rift.active].maxRank; i++) assert.equal(learnRank(s, 'rift').ok, true);
  if (fold) { assert.equal(learnMod(s, 'rift').ok, true); assert.equal(chooseCap(s, 'rift', 'fold').ok, true); }
  if (mine) s.constellation.mods['glyph-mine'] = true;
  s.magicSkills.selected = 'rift-step';
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 6, y: 6, facing: 'right', hp: 100, stamina: 50 }); s.maxHp = 100; s.lastAim = { x: 1, y: 0 }; g.player.lastMoveVector = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y, extra = {}], i) => Object.assign(createCombatant('rootBrute', x, y), { id: `foe-${i}`, hp: 5000, maxHp: 5000, damage: 0, cooldown: 99, speed: 0 }, extra));
  g.lastUpdateNow = 1000;
  return { s, g };
}
const step = (g, dir) => { g.player.lastMoveVector = dir; return g.activateApertureSkill('rift-step'); };
const pts = (R) => Array.from({ length: R.n }, (_, i) => [R.xs[i], R.ys[i]]);

test('one step leaves two mines (start, landing) that wait, then link into a line after the grace', () => {
  const { s, g } = arena({ foes: [[6, 6]] }); const e = g.enemies[0];
  assert.equal(step(g, { x: 1, y: 0 }), true); const hp = e.hp; // (Rift Wake, learned with the branch, wounds it as the step leaves) assert.equal(s.magicSkills.riftCharges, 1, 'a charge left');
  const R = riftMinesOf(g); assert.equal(R.n, 2, 'start and landing');
  assert.deepEqual(pts(R)[0], [6.5, 6.45], 'the first mine where the step began');
  assert.ok(Math.abs(R.xs[1] - (g.player.x + .5)) < 1e-9 && Math.abs(R.ys[1] - (g.player.y + .45)) < 1e-9, 'the second where it landed');
  assert.equal(glyphMinesOf(g).length, 0, 'a Rift Step is no cast: no ordinary sigil');
  // a foe standing on the start mine: a sigil would burst at once; a rift mine waits
  let t = 1000; for (let i = 0; i < 30; i++) { t += 1000 * DT; g.update(DT, idle, t); }
  assert.equal(e.hp, hp, 'no burst on contact'); assert.equal(riftVoidOf(g), null, 'not linked within the grace'); assert.equal(riftMinesOf(g).n, 2);
  tickHitCastPassives(g, RIFT_MINE.graceMs / 1000, t);
  const V = riftVoidOf(g); assert.ok(V, 'linked after the grace'); assert.equal(V.n, 2, 'two mines: a line'); assert.equal(riftMinesOf(g).n, 0);
});

test('spending every charge links at once; two steps are three mines and a triangle', () => {
  const { s, g } = arena();
  assert.equal(step(g, { x: 1, y: 0 }), true); const first = { x: g.player.x, y: g.player.y };
  assert.equal(step(g, { x: 0, y: 1 }), true); assert.equal(s.magicSkills.riftCharges, 0);
  const V = riftVoidOf(g); assert.ok(V, 'linked when the last charge is spent, no grace'); assert.equal(V.n, 3, 'a triangle');
  assert.deepEqual(pts(V), [[6.5, 6.45], [first.x + .5, first.y + .45], [g.player.x + .5, g.player.y + .45]], 'start, first landing, second landing');
  // One step with the only charge (no Fold): a line at once.
  const { g: g1 } = arena({ fold: false }); assert.equal(step(g1, { x: 1, y: 0 }), true); assert.equal(riftVoidOf(g1)?.n, 2);
  // Without Glyph Mine, nothing.
  const { g: g2 } = arena({ mine: false }); step(g2, { x: 1, y: 0 }); step(g2, { x: 0, y: 1 }); assert.equal(riftVoidOf(g2), null); assert.equal(riftMinesOf(g2), null);
  // A second step begun away from the last landing adds its start too; at most three mines, the oldest giving way.
  const { g: g3 } = arena(); step(g3, { x: 1, y: 0 }); g3.player.x += 3; step(g3, { x: 0, y: 1 });
  const V3 = riftVoidOf(g3); assert.equal(V3.n, RIFT_MINE.max); assert.notDeepEqual(pts(V3)[0], [6.5, 6.45], 'the first start gave way');
});

test('the void wounds foes inside (bosses too) and not outside, on its tick, for its life; one void at a time', () => {
  const { g } = arena({ foes: [[10, 7], [7, 10], [20, 20], [10, 7, { boss: true, maxHp: 90000, hp: 90000 }]] });
  const [inside, outside, far, boss] = g.enemies;
  step(g, { x: 1, y: 0 }); step(g, { x: 0, y: 1 });
  const V = riftVoidOf(g); assert.equal(V.n, 3);
  assert.ok(inRiftVoid(V, inside.x + .5, inside.y + .45), 'inside the triangle'); assert.ok(!inRiftVoid(V, outside.x + .5, outside.y + .45), 'below its long edge');
  const hp = g.enemies.map((e) => e.hp); let t = 2000;
  tickHitCastPassives(g, RIFT_MINE.tickMs / 1000 * .5, t); assert.deepEqual(g.enemies.map((e) => e.hp), hp, 'nothing before the first tick');
  tickHitCastPassives(g, RIFT_MINE.tickMs / 1000 * .5, t);
  const dmg = V.dmg; assert.ok(dmg >= 1);
  assert.ok(inside.hp < hp[0] && boss.hp < hp[3], 'foes inside are struck, a boss as well');
  assert.equal(outside.hp, hp[1]); assert.equal(far.hp, hp[2]);
  // a long frame strikes once, never a burst of catch-up strikes
  const b = inside.hp; tickHitCastPassives(g, RIFT_MINE.tickMs / 1000 * 3.5, t); assert.ok(b - inside.hp <= dmg * 1.3 + 1, `one strike (${b - inside.hp})`);
  // a new void replaces the old: one line now
  g.save.magicSkills.riftCharges = 1; g.save.magicSkills.cooldowns['rift-step'] = 0; step(g, { x: -1, y: 0 });
  assert.equal(riftVoidOf(g).n, 2, 'the line took the triangle\'s place');
  // the line: a foe on its segment is struck, its life ends it
  for (let k = 0; k < RIFT_MINE.voidMs / RIFT_MINE.tickMs + 2; k++) tickHitCastPassives(g, RIFT_MINE.tickMs / 1000, t += RIFT_MINE.tickMs);
  assert.equal(riftVoidOf(g), null, `gone after ${RIFT_MINE.voidMs / 1000} s`);
  for (const e of g.enemies) assert.ok(Number.isFinite(e.hp));
});

test('a line: within its half width of the segment; leaving the place drops mines and void', () => {
  const V = { on: true, n: 2, xs: [0, 4, 0], ys: [0, 0, 0] };
  assert.ok(inRiftVoid(V, 2, RIFT_MINE.halfWidth - .01)); assert.ok(!inRiftVoid(V, 2, RIFT_MINE.halfWidth + .05)); assert.ok(!inRiftVoid(V, 5, 0));
  assert.ok(inRiftVoid(V, 2, RIFT_MINE.halfWidth + .2, .3), 'a big body reaches it');
  const { g } = arena(); step(g, { x: 1, y: 0 }); assert.equal(riftMinesOf(g).n, 2);
  g.areaId = () => 'elsewhere'; tickHitCastPassives(g, DT, 3000); assert.equal(riftMinesOf(g).n, 0, 'the mines are gone');
  const { g: h } = arena(); step(h, { x: 1, y: 0 }); step(h, { x: 0, y: 1 }); assert.ok(riftVoidOf(h)); h.areaId = () => 'elsewhere'; tickHitCastPassives(h, DT, 3000); assert.equal(riftVoidOf(h), null);
});

test('the passive text names the Rift Step link, and the numbers live in the table', () => {
  assert.match(PASSIVE_TEXT['glyph-mine'], /Rift Step/); assert.match(PASSIVE_TEXT['glyph-mine'], /triangle/);
  assert.equal(RIFT_MINE.voidMs, 6000); assert.equal(RIFT_MINE.max, 3); assert.ok(RIFT_MINE.graceMs > 0 && RIFT_MINE.tickMs > 0 && GLYPH_MINE.power > 0);
});

test('stress: Rift Step spammed with cooldowns wiped for 60 s, Glyph Mine on: bounded, no NaN', () => {
  const { s, g } = arena({ foes: [[12, 12], [14, 9], [9, 14]] }); let t = 1000;
  const dirs = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
  for (let f = 0; f < 3600; f++) {
    t += 1000 * DT; s.magicSkills.cooldowns['rift-step'] = 0; if (f % 7 === 0) s.magicSkills.riftCharges = 2;
    if (f % 5 === 0) { step(g, dirs[(f / 5) % 4]); g.player.x = Math.max(3, Math.min(27, g.player.x)); g.player.y = Math.max(3, Math.min(27, g.player.y)); }
    g.update(DT, idle, t);
    const R = riftMinesOf(g), V = riftVoidOf(g);
    assert.ok(!R || R.n <= RIFT_MINE.max); assert.ok(!V || V.n <= RIFT_MINE.max);
    if (V) for (let i = 0; i < V.n; i++) assert.ok(Number.isFinite(V.xs[i]) && Number.isFinite(V.ys[i]));
  }
  assert.equal(riftMinesOf(g).xs.length, RIFT_MINE.max, 'fixed pools, never grown');
  for (const e of g.enemies) assert.ok(Number.isFinite(e.hp) && Number.isFinite(e.x) && Number.isFinite(e.y));
  assert.ok(glyphMinesOf(g).length <= GLYPH_MINE.max);
});
