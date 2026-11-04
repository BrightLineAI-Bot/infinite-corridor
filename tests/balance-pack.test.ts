// Balance pack (Tim, 2026-11-04): beasts take regional threat only from ring 100 (full from 150); ordinary foes grow past the
// early rings; damage reduction keeps climbing past 0.45 toward 0.75; spells scale with Focus like swings with Might; foes made
// after a load (Fractured waves, calls, refills, density packs, haunt splits, the Gloomgorge) are regionally scaled; the
// Questing Beast keeps its wounds on a fresh load; only the Wayfarer's blows cure the frenzy; the stronger status keeps its
// own time; and an Aperture relic leaves 0.8 of a stat point from now on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave, ensurePerception, ensurePerceptionInPlace } from '../src/types.ts';
import { Game, characterStats, BEAST_REGION_RAMP, ORDINARY_THREAT, DAMAGE_REDUCTION, SPELL_POWER, APERTURE_RELIC_STAT, reductionCurve, beastRegionalThreat, ordinaryThreat, regionalScale, relicStatGain } from '../src/game.ts';
import { regionalThreat } from '../src/world.ts';
import { applyPoison } from '../src/elites.ts';
import { ensureQuestingBeast } from '../src/questing-beast.ts';
import { FAR_REALMS } from '../src/far-realms.ts';
import { stageOneBeastReference, BEAST_GUARD_HOLD, STAGES } from '../src/stages.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { createCombatant } from '../src/combat.ts';
import { tuneGatePredator } from '../src/monster-pack.ts';

const save = (seed = 'BALPACK') => { const s = freshSave(); s.seed = seed; return s; };
const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

test('the balance numbers live in data tables', () => {
  assert.deepEqual(BEAST_REGION_RAMP, { from: 100, full: 150 });
  assert.equal(ORDINARY_THREAT.rows[0][0], 15); assert.deepEqual(ORDINARY_THREAT.rows[0].slice(1), [1, 1]); assert.equal(ORDINARY_THREAT.farStart, FAR_REALMS.start);
  assert.deepEqual(DAMAGE_REDUCTION, { soft: .45, cap: .75, knee: .6 });
  assert.ok(SPELL_POWER.scale >= 1 && SPELL_POWER.focus > 0 && SPELL_POWER.base >= 1);
  assert.equal(APERTURE_RELIC_STAT.points, .8);
});

test('beasts: no regional threat below ring 100, a linear ramp to ring 150, the full value from there (unchanged endgame)', () => {
  for (const ring of [0, 3, 50, 99, 100]) { const m = beastRegionalThreat(regionalThreat(ring, 0)); assert.equal(m.hpMultiplier, 1); assert.equal(m.damageMultiplier, 1); }
  const q = regionalThreat(125, 0), m = beastRegionalThreat(q);
  assert.ok(close(m.hpMultiplier, 1 + (q.hpMultiplier - 1) * .5)); assert.ok(close(m.damageMultiplier, 1 + (q.damageMultiplier - 1) * .5));
  for (const ring of [150, 190, 400, 1000]) { const r = regionalThreat(ring, 0), b = beastRegionalThreat(r); assert.equal(b.hpMultiplier, r.hpMultiplier); assert.equal(b.damageMultiplier, r.damageMultiplier); }
  // A beast from ring 150 out gets exactly the old scaling; below 100 only its Wayfarer tuning.
  const g = new Game(save(), 0), make = () => g.createEnemyFromSpawn({ id: 'wb', kind: 'morphingBlob', x: 5, y: 5, boss: true, worldBeast: 'morphingBlob' }, 'overworld');
  const base = make();
  for (const ring of [150, 190, 1000]) { const r = regionalThreat(ring, 0), e = regionalScale(make(), r); assert.equal(e.maxHp, Math.round(base.maxHp * r.hpMultiplier)); assert.equal(e.damage, Math.max(1, Math.round(base.damage * r.damageMultiplier))); assert.equal(e.threatRing, ring); }
  const low = regionalScale(make(), regionalThreat(60, 0)); assert.equal(low.maxHp, base.maxHp); assert.equal(low.damage, base.damage);
  const qb = regionalScale(g.createEnemyFromSpawn({ id: 'qb', kind: 'questingBeast', x: 5, y: 5, boss: true, questingBeast: true }, 'overworld'), regionalThreat(80, 0));
  assert.equal(qb.maxHp, g.createEnemyFromSpawn({ id: 'qb', kind: 'questingBeast', x: 5, y: 5, boss: true, questingBeast: true }, 'overworld').maxHp);
});

test('the Stalker ramps in with the beasts', () => {
  const g = new Game(save('QBWOUND'), 0); g.rx = 10; g.ry = 0; g.loadArea('overworld');
  const at = (ring) => { g.rx = ring; g.ry = 0; const c = g.spawnStalker({ x: 16, y: 16 }, false, 0); g.enemies = g.enemies.filter((e) => e !== c); return c; };
  const a = at(10), b = at(90), c = at(200);
  assert.ok(a && b && c, 'it comes out');
  assert.equal(a.maxHp, b.maxHp); assert.equal(a.damage, b.damage);
  assert.ok(c.maxHp > b.maxHp * 10 && c.damage > b.damage * 4, `${b.maxHp}/${b.damage} -> ${c.maxHp}/${c.damage}`);
});

test('the Questing Beast keeps its wounds when its section loads fresh', () => {
  const s = save('QBWOUND'); s.questingBeast = { active: { rx: 130, ry: 0, tries: 1, hpShare: .4 } }; ensureQuestingBeast(s);
  const g = new Game(s, 0); g.rx = 130; g.ry = 0; g.loadArea('overworld'); // a section with no stored area: scaleFresh runs
  const e = g.enemies.find((q) => q.questingBeast); assert.ok(e, 'it is there'); assert.equal(e.threatRing, 130);
  assert.ok(Math.abs(e.hp / e.maxHp - .4) < .01, `${e.hp}/${e.maxHp}`);
});

test('ordinary foes: unchanged up to ring 15, more health and a bit more damage after, none in the far realms', () => {
  for (const ring of [0, 3, 10, 15]) assert.deepEqual(ordinaryThreat(ring), { hp: 1, damage: 1 });
  let last = { hp: 1, damage: 1 };
  for (let ring = 16; ring <= 400; ring += 7) { const o = ordinaryThreat(ring); assert.ok(o.hp >= last.hp && o.damage >= last.damage, `ring ${ring}`); last = o; }
  const top = ORDINARY_THREAT.rows.at(-1); assert.deepEqual(ordinaryThreat(top[0]), { hp: top[1], damage: top[2] }); assert.deepEqual(ordinaryThreat(600), { hp: top[1], damage: top[2] });
  assert.deepEqual(ordinaryThreat(FAR_REALMS.start), { hp: 1, damage: 1 }); assert.deepEqual(ordinaryThreat(FAR_REALMS.start + 300), { hp: 1, damage: 1 });
  const g = new Game(save(), 0), spawn = () => g.createEnemyFromSpawn({ id: 'o', kind: 'rootBrute', x: 4, y: 4 }, 'overworld'), base = spawn();
  for (const ring of [3, 15, 45, 120, 190]) {
    const q = regionalThreat(ring, 0), o = ordinaryThreat(ring), e = regionalScale(spawn(), q);
    assert.equal(e.maxHp, Math.round(base.maxHp * q.hpMultiplier * o.hp)); assert.equal(e.hp, e.maxHp); assert.equal(e.damage, Math.max(1, Math.round(base.damage * q.damageMultiplier * o.damage)));
  }
  // Foes tuned to the Wayfarer keep regional threat alone.
  const rev = g.createEnemyFromSpawn({ id: 'r', kind: 'gateRevenant', x: 4, y: 4, gatePredator: true }, 'overworld'), hp = rev.maxHp, q = regionalThreat(190, 0);
  regionalScale(rev, q); assert.equal(rev.maxHp, Math.round(hp * q.hpMultiplier));
});

test('a fresh early section is scaled exactly as before; a fresh far section through the same helper', () => {
  for (const [rx, seed] of [[3, 'EARLYBP'], [120, 'LATEBP']]) {
    const s = save(seed), g = new Game(s, 0); g.rx = rx; g.ry = 0; g.loadArea('overworld');
    const q = regionalThreat(rx, 0), o = ordinaryThreat(q.ring), probe = new Game(save(seed), 0); probe.rx = rx; probe.ry = 0;
    let n = 0;
    for (const e of g.enemies) {
      if (e.worldBeast || e.questingBeast || e.ambient || e.passiveBehavior || e.gatePredator || e.threatRing !== q.ring) continue;
      const spawn = g.map.enemySpawns.find((x) => x.id === e.id); if (!spawn) continue;
      const raw = probe.createEnemyFromSpawn(spawn, 'overworld'); n++;
      assert.equal(e.maxHp, Math.round(raw.maxHp * q.hpMultiplier * o.hp), `${e.kind} at ${rx}`);
      if (rx < 15) assert.equal(e.maxHp, Math.round(raw.maxHp * q.hpMultiplier));
    }
    assert.ok(n > 0, `ordinary foes found at ring ${rx}`);
  }
});

test('foes made after the ground loaded take the regional scaling once (Fractured waves, calls, refills, haunt splits)', () => {
  const g = new Game(save('LATEFOE'), 0); g.rx = 68; g.ry = 0; g.loadArea('overworld');
  const q = regionalThreat(68, 0), o = ordinaryThreat(68), c = g.createEnemyFromSpawn({ id: 'wave-1', kind: 'siegeBeetle', x: 5, y: 5, fractured: true, fracReinforcement: true }), hp = c.maxHp, dmg = c.damage;
  g.scaleToRegion(c); assert.equal(c.threatRing, 68); assert.equal(c.maxHp, Math.round(hp * q.hpMultiplier * o.hp)); assert.equal(c.damage, Math.max(1, Math.round(dmg * q.damageMultiplier * o.damage)));
  const once = c.maxHp; g.scaleToRegion(c); assert.equal(c.maxHp, once, 'never twice');
  // The call sites use the helper.
  const src = String(Game.prototype.tickFractured || '') + String(Game.prototype.tickFractureWarden) + String(Game.prototype.hauntTick) + String(Game.prototype.loadArea);
  assert.ok((src.match(/scaleToRegion\(/g) || []).length >= 5, 'waves, Warden calls, splits, the Gloomgorge and refills');
});

test('the Gloomgorge is scaled and holds at least the health of the wisps it swallowed', () => {
  const g = new Game(save('GORGEBP'), 0); g.rx = 67; g.ry = 0; g.loadArea('overworld'); g.enemies = [];
  const wisps = []; for (let i = 0; i < 5; i++) { const w = g.scaleToRegion(g.createEnemyFromSpawn({ id: `w${i}`, kind: 'gloomwisp', x: 16 + i * .2, y: 16, traits: [] })); w.aggro = true; w.splits = 9; wisps.push(w); g.enemies.push(w); }
  g._hauntCheck = 0; g.hauntGorged = false;
  const gorge = g.hauntTick(.1, 1000);
  assert.ok(gorge && g.enemies.includes(gorge), 'the wisps pour into a Gloomgorge'); assert.equal(gorge.threatRing, 67);
  const merged = wisps.filter((w) => w.merged).reduce((n, w) => n + w.maxHp, 0);
  assert.ok(merged > 0 && gorge.maxHp >= merged, `${gorge.maxHp} >= ${merged}`); assert.equal(gorge.hp, gorge.maxHp);
});

test('damage reduction: the old curve to 0.45, then diminishing returns toward the 0.75 cap; armor and Resolve keep counting', () => {
  for (const r of [0, .1, .3, .45]) assert.equal(reductionCurve(r), r);
  let prev = .45; for (const r of [.5, .8, 1.2, 2, 3, 6, 20]) { const d = reductionCurve(r); assert.ok(d > prev && d < DAMAGE_REDUCTION.cap, `${r} -> ${d}`); prev = d; }
  const s = save(); s.equipment.armor = { ...s.equipment.armor, power: 45 }; s.stats.Resolve = 1; const a = characterStats(s).damageReduction;
  s.stats.Resolve = 75; const b = characterStats(s).damageReduction; s.equipment.armor.power = 90; const c = characterStats(s).damageReduction;
  assert.ok(a > .45 && b > a + .05 && c > b && c < .75, `${a} ${b} ${c}`);
  const early = save(); early.stats.Resolve = 3; assert.equal(characterStats(early).damageReduction, Math.min(.45, 2 * .02 + (Number(early.equipment.armor?.power) || 0) * .025 + (Number(early.equipment.charm?.power) || 0) * .01));
});

test('spells: Focus counts beyond the magic bonus, melee is untouched', () => {
  const s = save(); s.level = 35; s.stats.Focus = 35; const g = new Game(s, 0), st = characterStats(s), dart = { damage: 7 };
  assert.ok(close(g.spellPower(dart), (7 * SPELL_POWER.base + st.magicBonus + SPELL_POWER.focus * 34) * SPELL_POWER.scale));
  assert.ok(g.spellPower(dart) > 2 * (7 + st.magicBonus) * .9, 'about twice the old spell power for a Focus build');
  const m = save(), m1 = save(); m.level = m1.level = 35; m.stats.Might = 35; assert.equal(characterStats(m).meleeBonus - characterStats(m1).meleeBonus, 2 * 34, 'Might still adds 2 per rank');
});

test('the frenzy: trickle damage does not cure it, the Wayfarer’s blows do', () => {
  const g = new Game(save('FRENZYBP'), 0); g.loadArea('overworld');
  const d = g.createEnemyFromSpawn({ id: 'dc', kind: 'doomChaser', x: g.player.x + 1, y: g.player.y, boss: true, worldBeast: 'doomChaser' }, 'overworld'); g.enemies.push(d);
  g.frenzyHit(0, 99); assert.equal(g.frenzy?.active, true);
  for (let i = 0; i < 30; i++) { d.hp -= 1; g.frenzyTick(1 / 30); }
  assert.equal(g.frenzy?.active, true, 'thirty one-point drops (poison, a pulse, a clone) cure nothing');
  for (let i = 0; i < 20 && g.frenzy; i++) { g.frenzyBlow(d); g.frenzyTick(1 / 30); }
  assert.equal(g.frenzy, null, 'blows throw it off');
});

test('status stacking: the stronger effect holds with its own remaining time', () => {
  const st = { poison: 0, poisonTick: 0 };
  applyPoison(st, 8, 5); applyPoison(st, 3, 9); assert.equal(st.poisonDps, 9); assert.equal(st.poison, 3, 'a short strong dose keeps its short time');
  applyPoison(st, 10, 2); assert.equal(st.poisonDps, 9); assert.equal(st.poison, 3, 'a weaker one is shrugged off');
  applyPoison(st, 6, 9); assert.equal(st.poison, 6, 'an equal one extends');
  const g = new Game(save('STATUSBP'), 0); g.loadArea('overworld'); const w = g.packWorld(1 / 30, 1000), p = g.player;
  w.ignite(4, 6); w.ignite(2, 12); assert.deepEqual([g.playerFire.left, g.playerFire.dps], [2, 12]);
  w.ignite(9, 3); assert.deepEqual([g.playerFire.left, g.playerFire.dps], [2, 12]);
  w.slow(.3, .25); w.slow(.9, 5); assert.equal(p.slowFactor, .3); assert.equal(p.slowUntil, 1250, 'the strong slow keeps its quarter second');
  w.slow(.2, 1); assert.equal(p.slowFactor, .2); assert.equal(p.slowUntil, 2000);
});

test('an Aperture relic leaves 0.8 of a stat point from now on; points already given stay; the carry is saved and normalised', () => {
  const s = save(); s.statPoints = 7; ensurePerception(s); assert.equal(s.perception.relicCarry, 0);
  const got = []; for (let i = 0; i < 5; i++) got.push(relicStatGain(s));
  assert.deepEqual(got, [0, 1, 1, 1, 1]); assert.equal(s.statPoints, 11); assert.equal(s.perception.relicCarry, 0, 'five relics, four points, no drift');
  relicStatGain(s); assert.equal(s.perception.relicCarry, .8);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.perception.relicCarry, .8); assert.equal(back.statPoints, 11);
  const old = JSON.parse(JSON.stringify(s)); delete old.perception.relicCarry; old.statPoints = 40; const m = migrateSave(old); assert.equal(m.perception.relicCarry, 0); assert.equal(m.statPoints, 40);
  const bad = JSON.parse(JSON.stringify(s)); bad.perception.relicCarry = 'x'; assert.equal(migrateSave(bad).perception.relicCarry, 0);
  // The in-place fast path (release 738) keeps a sound carry without copying, and repairs a missing or bad one.
  const fast = save(); ensurePerception(fast); fast.perception.relicCarry = .4; const p0 = fast.perception; ensurePerceptionInPlace(fast); assert.equal(fast.perception, p0); assert.equal(fast.perception.relicCarry, .4);
  delete fast.perception.relicCarry; ensurePerceptionInPlace(fast); assert.equal(fast.perception.relicCarry, 0);
  fast.perception.relicCarry = 7; ensurePerceptionInPlace(fast); assert.ok(fast.perception.relicCarry < 1);
});

test('a held Stage 1 measure at the old 0.45 guard follows the live reduction above it: nothing tuned to hurt you gets easier', () => {
  assert.equal(BEAST_GUARD_HOLD.oldCap, .45);
  const held = (guard) => { const s = save('HELDBP'); s.perception.aperture = APERTURE_BANDS[STAGES.freezeTier].threshold + 1; s.farArray = { listeners: 1, gate: 1 }; s.beastCeiling = { level: 26, perHit: 399, maxHp: 680, guard, kills: 1 }; s.level = 28; s.stats.Vigor = 80; s.maxHp = characterStats(s).maxHp; return s; };
  assert.equal(stageOneBeastReference(held(.45), { level: 30, perHit: 500, maxHp: 900, guard: .69 }).guard, .69, 'past the old cap it follows');
  assert.equal(stageOneBeastReference(held(.45), { level: 30, perHit: 500, maxHp: 900, guard: .4 }).guard, .4);
  assert.equal(stageOneBeastReference(held(.3), { level: 30, perHit: 500, maxHp: 900, guard: .69 }).guard, .3, 'a measure below the old cap holds as before');
  assert.equal(stageOneBeastReference(held(.45), { level: 30, perHit: 500, maxHp: 900, guard: .69 }).perHit, 399, 'the rest stays held');
  // The Gate Revenant (and the Wardens made from it) deal the same after reduction to a high-reduction Wayfarer as at 0.45.
  const net = (armor) => { const s = held(.45); s.equipment.armor = { ...s.equipment.armor, power: armor }; const st = characterStats(s), e = tuneGatePredator(Object.assign(createCombatant('gateRevenant', 0, 0, false, []), { gatePredator: true }), s, st); return { dr: st.damageReduction, hit: e.damage * (1 - st.damageReduction) }; };
  const a = net(18), b = net(60); assert.equal(a.dr, .45); assert.ok(b.dr > .6); assert.ok(Math.abs(a.hit - b.hit) <= 1.5, `${a.hit} vs ${b.hit}`);
});
