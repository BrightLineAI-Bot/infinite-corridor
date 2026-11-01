// Release 688 (Tim, 2026-11-01: "the base level skyland should be a lower level... pretty basic... scales based on your character...
// starting [at] the level that your character is... every addition or modification increases the difficulty... over and above"):
// every Skyland foe starts from the Wayfarer's level by role; Ascension, the viscera pact and the annex multiply from there; every
// round is set the same way (no regional threat in the sky).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, characterStats } from '../src/game.ts';
import { SKY_BASE, skyVitals, SKY_MODES, rollSkylandMode, skylandSection, ensureSkylands, skylandScale } from '../src/skylands.ts';

const SEED = 'VISCERA', beasts = { tremorWorm: { slain: 1 }, morphingBlob: { slain: 1 }, mountainTurtle: { slain: 1 }, lightningGiant: { slain: 1 } };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
let stairAt = null; const stair = () => { for (let r = 6; r < 60 && !stairAt; r++) for (let x = -r; x <= r && !stairAt; x++) { const y = r - Math.abs(x); if (!skylandSection(SEED, x, y, 2)) continue; const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); const st = g.map.objects.find((o) => o.kind === 'skyStair'); if (st && !st.skyAnnex) stairAt = [x, y]; } return stairAt; };
function climb(mode, { level = 1, tier = 0 } = {}) {
  const [rx, ry] = stair(), s = freshSave(); s.seed = SEED; s.level = level; s.worldBeasts = JSON.parse(JSON.stringify(beasts)); const k = ensureSkylands(s); k.sigils = 20; k.best = 19;
  let run = k.runs + 1; while (rollSkylandMode(SEED, { rx, ry }, run) !== mode) run++; k.runs = run - 1;
  const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); const st = g.map.objects.find((o) => o.kind === 'skyStair');
  g.player.x = st.x; g.player.y = st.y; if (st.disc) g.skyLevel = st.elev; assert.ok(g.interact(`ascend:${tier}`, st.id).ok); return { g, s };
}
function rounds(g, s) { let t = 1000; g.player.invulnerableUntil = 1e15; const id = g.areaId(), out = []; for (let k = 0; k < 14 && !s.consequences.dungeons[id]?.resolved; k++) { const live = g.enemies.filter((e) => !e.dead); if (live.length) out.push(live.map((e) => ({ role: e.skyRole, n: e.skyEchoes, hp: e.maxHp, damage: e.damage }))); for (const e of g.enemies) { e.hp = 0; e.dead = true; g.defeatEnemy(e); } for (let i = 0; i < 60; i++) { t += 50; g.update(.05, idle, t); } } return out; }

test('every foe is set from the Wayfarer by its role: the first round as every other; nothing from how far out the stair stands', () => {
  const { g, s } = climb('cloud'), v = skyVitals('winged', s, characterStats(s)), byRound = rounds(g, s), all = byRound.flat(); // killing them earns experience, so later rounds may be set from a higher level
  assert.ok(all.length > 6); for (const e of byRound[0]) { assert.equal(e.role, 'winged'); assert.equal(e.hp, v.hp, 'the first round from the Wayfarer, no regional threat'); assert.equal(e.damage, v.damage); }
  for (const e of all) { assert.equal(e.role, 'winged'); assert.ok(e.hp >= v.hp && e.damage >= v.damage); }
  const d = climb('rush'), ev = skyVitals('echo', d.s, characterStats(d.s)), echoes = rounds(d.g, d.s), solo = echoes[0][0];
  assert.equal(solo.role, 'echo'); assert.equal(solo.hp, ev.hp); assert.ok(echoes.at(-1).every((e) => e.n === echoes.at(-1).length), 'the last round shares out among all of them');
});

test('base foes are basic: a few hits each, and a modest share of your health a blow', () => {
  const s = freshSave(), st = characterStats(s);
  for (const [role, most] of [['winged', 6], ['keeper', 12], ['echo', 20]]) { const v = skyVitals(role, s, st), hits = v.hp / ((s.equipment?.[s.activeWeaponSlot]?.power || 6) + (st.meleeBonus || 0)); assert.ok(hits <= most, `${role}: ${hits.toFixed(1)} hits`); assert.ok(v.damage <= s.maxHp * SKY_BASE[role].damageShare / (1 - Math.min(.75, st.damageReduction || 0)) + 1); assert.ok(v.damage < s.maxHp / 5, `${role} hits for ${v.damage} of ${s.maxHp}`); }
});

test('it scales with the Wayfarer\'s level, and each Ascension tier rises over and above it', () => {
  const low = rounds(...Object.values(climb('cloud', { level: 1 })))[0][0].hp, high = rounds(...Object.values(climb('cloud', { level: 30 })))[0][0].hp;
  assert.ok(high > low, `level 1: ${low}, level 30: ${high}`);
  const t0 = rounds(...Object.values(climb('cloud', { level: 10, tier: 0 })))[0][0], t5 = rounds(...Object.values(climb('cloud', { level: 10, tier: 5 })))[0][0];
  assert.equal(t5.hp, Math.max(1, Math.round(t0.hp * skylandScale(5).hp)));
});
