// The Earth Apatosaurus's difficulty duel (as tests/wild-stego.test.ts stegoDuel): early, mid, late and endgame builds that stand and
// swing at it in the open world, through the real game loop. A big blow takes a big share of a full build's health, none all of it,
// and from the mid build on it falls in tens of seconds (Tim's Dark Souls / Monster Hunter bar). Its clones, venom and coils included.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, characterStats } from '../src/game.ts';
import { tuneWorldBeast } from '../src/world-beasts.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave } from '../src/types.ts';

const build = (level, maxHp, power, might, resolve) => { const s = freshSave(); s.seed = 'STEGO-DUEL'; s.level = level; s.maxHp = maxHp; s.hp = maxHp; s.equipment.primary.power = power; s.stats.Might = might; s.stats.Resolve = resolve; s.stats.Vigor = 1 + Math.floor(level / 2); return s; };
const BUILDS = { early: build(8, 140, 14, 4, 2), mid: build(18, 420, 26, 40, 20), late: build(28, 914, 44, 200, 75), endgame: build(40, 1600, 70, 320, 120) };
export function apatoDuel(name) {
  const save = JSON.parse(JSON.stringify(BUILDS[name])), g = new Game(save, 0); g.rx = 9; g.ry = 3; g.loadArea('overworld'); const st = characterStats(g.save), p = g.player;
  g.enemies = []; const b = tuneWorldBeast(createCombatant('earthApato', p.x + 4, p.y, true, []), g.save, 'earthApato', st); Object.assign(b, { id: 'duel-apato', aggro: true }); delete b.worldBeast; g.enemies.push(b);
  g.player.invulnerableUntil = 0; let now = 1000, t = 0, worst = 0, taken = 0; const by = {};
  for (; t < 240 && !b.dead && b.hp > 0; t += 1 / 30) { now += 1000 / 30; const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1; p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    const before = p.hp; g.update(1 / 30, { state: d > 1.8 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 }, consume: (k) => k === 'attack', held: (k) => k === 'attack', reset() {} }, now);
    const lost = Math.max(0, before - p.hp); worst = Math.max(worst, lost); taken += lost; if (lost) { const k = b.pack?.attack || 'other'; by[k] = (by[k] || 0) + lost; } p.hp = g.save.maxHp; p.invulnerableUntil = 0; }
  return { name, seconds: t, dead: b.dead || b.hp <= 0, hp: b.maxHp, damage: b.damage, worst, share: worst / g.save.maxHp, taken, maxHp: g.save.maxHp, by };
}
test('the difficulty duel: early, mid, late and endgame builds; fights of tens of seconds, blows that take a big share of health', { timeout: 400000 }, () => {
  const rows = []; for (const name of Object.keys(BUILDS)) { const r = apatoDuel(name); rows.push(r);
    assert.ok(r.worst >= r.maxHp * .12, `${name}: a blow of ${r.worst} of ${r.maxHp}`); assert.ok(r.worst < r.maxHp, `${name}: no blow takes all of a full build (${r.worst} of ${r.maxHp})`); }
  for (const r of rows.slice(1)) { assert.ok(r.dead, `${r.name}: it falls (${r.seconds.toFixed(1)} s)`); assert.ok(r.seconds > 10 && r.seconds < 150, `${r.name}: ${r.seconds.toFixed(1)} s`); }
  console.log('earth apato duel', JSON.stringify(rows.map((r) => ({ build: r.name, s: +r.seconds.toFixed(1), dead: r.dead, hp: r.hp, dmg: r.damage, worstBlow: Math.round(r.worst), share: +r.share.toFixed(2), taken: Math.round(r.taken) }))));
});
