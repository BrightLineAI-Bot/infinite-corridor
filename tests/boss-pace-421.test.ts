// Release 421 (Tim: "the bosses do too much damage... reduce their damage by... 15%... more wind up... more cool down
// between their attacks... they attack way too aggressively"; the Nanobot Knight's seekers "should be blocked by walls and
// blocks... home in on you for like 2 seconds. And then they should just fly straight").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { BOSS_PACE, bossPaced, KNIGHT, freshPackState, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';

const fixture = (pace) => {
  const w = { dt: .05, now: 0, area: 'overworld', bossPace: pace, player: { x: 17, y: 12, hp: 1e6 }, enemies: [], fx: [], hurts: [],
    open: () => true, tileOpen: () => true, projectileOpen: () => true, los: () => true, move: () => true, slow() {},
    hurt(owner, amount, options) { w.hurts.push({ owner: owner?.id, amount, ...options }); }, effects: () => w.fx,
    addEffect(f) { addPackEffect(w.fx, f, w.now); }, oceanAt: () => false };
  const e = createCombatant('psychicCrystal', 10, 12, true, []);
  Object.assign(e, { id: 'paced', worldBeast: 'psychicCrystal', aggro: true, evasive: false, hp: 3000, maxHp: 3000, damage: 20 });
  e.pack = freshPackState(); e.pack.gap = 0; e.packAttacks = ['psyDebris']; e.packBossAttacks = []; w.enemies = [e];
  return { w, e };
};
// Seconds until the volley leaves the Crystal, and the cooldown it then waits.
const volley = (pace) => { const { w, e } = fixture(pace); let t = 0; for (; t < 6 && !w.fx.length; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); } return { t, cd: e.pack.cd.psyDebris, e }; };

test('bosses and Revenants are paced; elites and ordinary creatures are not', () => {
  assert.deepEqual(BOSS_PACE, { damage: .85, windup: 1.2, cooldown: 1.25, gap: 1.35 });
  for (const e of [{ boss: true }, { worldBeast: 'turtle' }, { questingBeast: true }, { dungeonRole: 'finalBoss' }, { gatePredator: true }]) assert.equal(bossPaced(e), true);
  for (const e of [{ elite: true }, { kind: 'ashling' }, null]) assert.equal(bossPaced(e), false);
});

test('in the game\'s world a boss winds up longer and waits longer before the same attack again', () => {
  const base = volley(false), paced = volley(true);
  assert.ok(paced.t > base.t + .05, `windup ${base.t.toFixed(2)} → ${paced.t.toFixed(2)}`);
  assert.ok(Math.abs(paced.cd / base.cd - BOSS_PACE.cooldown) < .02, 'cooldown');
  const { w, e } = fixture(true); w.dt = 0; updatePackMonster(e, w); assert.equal(e.pack.paced, undefined, 'a paused frame changes nothing');
});

test('a boss hits for 15% less; an ordinary creature hits as before', () => {
  const s = freshSave(); s.seed = 'PACE421'; const g = new Game(s, 0); g.save.maxHp = 1000;
  const hit = (source) => { g.player.hp = 1000; g.player.invulnerableUntil = 0; g.packHurt(source, 100, {}, 1000); return 1000 - g.player.hp; };
  const plain = hit({ kind: 'ashling' }), boss = hit({ boss: true, kind: 'rootBrute' });
  assert.ok(boss < plain && Math.abs(boss / plain - BOSS_PACE.damage) < .03, `${plain} → ${boss}`);
  const src = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
  assert.match(src, /bossPaced\(e\) \? BOSS_PACE\.damage : 1/, 'contact blows');
  assert.match(src, /bossPaced\(shooter\)\?\{\.\.\.q,damage:q\.damage\*BOSS_PACE\.damage\}:q/, 'shots');
  assert.match(src, /\(bossPaced\(e\)\?BOSS_PACE\.windup:1\)/, 'older bosses wind up longer');
  assert.match(src, /\(bossPaced\(e\)\?BOSS_PACE\.cooldown:1\)/, 'and wait longer');
  assert.match(src, /bossPace: true/, 'the game turns pacing on');
});

test('the Knight\'s missiles home for two seconds, then fly straight; seekers stop at walls and builds', () => {
  assert.equal(KNIGHT.missileHome, 2);
  const w = { dt: .05, now: 0, player: { x: 10, y: 20 }, enemies: [], hurt() {}, addEffect() {}, tileOpen: () => true, shotBlocked: () => false, slow() {} };
  const m = { kind: 'missile', owner: 'k', x: 10, y: 10, vx: KNIGHT.missileSpeed, vy: 0, radius: .25, arming: 0, life: KNIGHT.missileFuel, damage: 5 };
  let fx = [m]; for (let t = 0; t < 1; t += w.dt) fx = tickPackEffects(fx, w);
  assert.ok(m.vy > 0, 'turning toward you while it homes');
  m.age = KNIGHT.missileHome + .1; const v = { x: m.vx, y: m.vy }; w.player = { x: 0, y: 0 }; fx = tickPackEffects([m], w);
  assert.deepEqual({ x: m.vx, y: m.vy }, v, 'straight after');
  const orb = { kind: 'nanoOrb', owner: 'k', state: 'straight', x: 5, y: 5, vx: 1, vy: 0, radius: .3, arming: 0, life: 3, damage: 5 };
  w.shotBlocked = () => true; tickPackEffects([orb], w); assert.ok(orb.life <= 0, 'a block stops a seeker');
  const missile = { ...m, age: 0, life: 2 }; tickPackEffects([missile], w); assert.ok(missile.life <= 0, 'and a missile');
  assert.match(readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), /shotBlocked: \(x, y\) => !tileOpen\(map, width, x, y\) \|\| !!map\.tiles\[Math\.floor\(y\) \* width \+ Math\.floor\(x\)\]\?\.build/);
});
