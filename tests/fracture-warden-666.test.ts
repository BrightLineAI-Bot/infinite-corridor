// Release 666 (Tim, 2026-11-01): in a Fractured area kills fill a meter shown on the HUD; full, a Fracture Warden spawns with a
// real moveset, aggressive pacing and adds during the fight, at about half a Gate Revenant's strength for the Wayfarer.
// Killing it seals the area: safe, reinforcements stop, and a cache drops.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, characterStats } from '../src/game.ts';
import { FRACTURE_WARDEN, fractureKey, fractureNeed, fractureWorth, fracturedMode, ensureFractureSeals } from '../src/fractured.ts';
import { tuneGatePredator, staggerClass } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';


const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const at = (mode, rx, ry) => { const s = freshSave(); s.seed = 'FRACTURE'; s.fractured = mode; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); return { s, g }; };
let wild = null; const wildSection = () => { if (wild) return wild; for (let x = 4; x < 40 && !wild; x++) for (let y = 4; y < 40 && !wild; y += 3) { const { g } = at('fractured', x, y); if (g.fracturedHere() && g.enemies.some((e) => !e.dead && !e.ambient && e.fractured)) wild = [x, y]; } return wild; };
const ordinary = (g) => g.enemies.find((e) => !e.dead && !e.ambient && !e.passiveBehavior && !e.fracWarden && !e.summonedBy && e.kind !== 'npc');

test('kills fill the meter (champions, rares and shamans count more); the HUD reads it', () => {
  const [x, y] = wildSection(), { s, g } = at('fractured', x, y), need = fractureNeed(fracturedMode(s));
  assert.deepEqual(g.fractureMeter(), { kills: 0, need, warden: null });
  const e = ordinary(g); e.hp = 0; e.dead = true; g.defeatEnemy(e);
  assert.equal(g.fractureMeter().kills, fractureWorth(e)); assert.equal(fractureWorth({ fracRank: 'rare' }), FRACTURE_WARDEN.worth.rare); assert.equal(fractureWorth({ fracRank: 'champion' }), FRACTURE_WARDEN.worth.champion);
  assert.equal(at(null, x, y).g.fractureMeter(), null, 'no meter with the mode off');
  const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(m.fractureSeals[fractureKey('overworld', g.areaStateId())].kills, fractureWorth(e), 'the meter is kept in the save');
});

test('full, a Fracture Warden steps through: half a Gate Revenant, huge, a mixed moveset, two affixes, aggressive; it calls adds', () => {
  const [x, y] = wildSection(), { s, g } = at('fractured', x, y), key = fractureKey('overworld', g.areaStateId());
  s.fractureSeals = { [key]: { kills: fractureNeed(fracturedMode(s)) - 1, sealed: false } };
  const e = ordinary(g); e.dead = true; g.defeatEnemy(e); assert.match(g.message, /fracture strains/i);
  let now = 1000; g.update(.05, idle, now); now += 3000; g.update(.05, idle, now);
  const warden = g.enemies.find((q) => q.fracWarden && !q.dead); assert.ok(warden, 'it steps through');
  const rev = tuneGatePredator(Object.assign(createCombatant('gateRevenant', 0, 0, false, []), { gatePredator: true }), s, characterStats(s));
  assert.equal(warden.maxHp, Math.round(rev.maxHp * FRACTURE_WARDEN.revenantShare)); assert.equal(warden.damage, Math.round(rev.damage * FRACTURE_WARDEN.revenantShare));
  assert.ok(warden.packAttacks.length >= 6 && warden.affixes.length === FRACTURE_WARDEN.affixes && warden.attackGap === FRACTURE_WARDEN.attackGap && warden.aggro);
  assert.equal(staggerClass(warden), 'boss', 'poise like a boss'); assert.equal(g.fractureMeter().warden, warden);
  assert.ok(warden.maxHp < rev.maxHp && !warden.boss && !warden.worldBeast, 'below a world boss: half a Revenant');
  for (let i = 0; i < 2; i++) { now += (FRACTURE_WARDEN.adds.first + FRACTURE_WARDEN.adds.every[1]) * 1000; g.update(.05, idle, now); }
  const adds = g.enemies.filter((q) => q.fracWardenAdd && !q.dead); assert.ok(adds.length >= FRACTURE_WARDEN.adds.size[0] && adds.length <= FRACTURE_WARDEN.adds.cap, `${adds.length} called`);
  const kills = g.fractureMeter().kills; adds[0].dead = true; g.defeatEnemy(adds[0]); assert.equal(g.fractureMeter().kills, kills, 'adds do not fill the meter');
  // Felled: sealed, safe, the adds go with it, and a cache drops.
  const items = s.inventory.length, iron = s.materials.cinderIron, marks = s.currency, draughts = s.consumables.restorativeDraught;
  warden.hp = 0; warden.dead = true; g.defeatEnemy(warden);
  assert.equal(s.fractureSeals[key].sealed, true); assert.equal(g.fracturedHere(), null, 'safe'); assert.equal(g.fractureMeter(), null);
  assert.equal(g.defeatNotice.title, 'THE FRACTURE IS SEALED');
  assert.ok(g.enemies.filter((q) => q.fracWardenAdd).every((q) => q.dead), 'its adds go with it');
  assert.ok(s.materials.cinderIron >= iron + FRACTURE_WARDEN.cache.items && s.inventory.length >= Math.min(items + 1, items) && s.currency >= marks + FRACTURE_WARDEN.cache.marks && s.consumables.restorativeDraught >= draughts + FRACTURE_WARDEN.cache.draughts, 'the cache');
  const before = g.enemies.length; g.update(.05, idle, now + 400000); assert.equal(g.enemies.filter((q) => q.fracReinforcement && !q.dead).length, 0, 'no more reinforcements'); assert.ok(g.enemies.length <= before);
  const back = new Game(migrateSave(JSON.parse(JSON.stringify(s))), 0); back.rx = x; back.ry = y; back.loadArea('overworld');
  assert.equal(back.fracturedHere(), null, 'sealed for good'); assert.ok(!back.enemies.some((q) => q.fractured), 'no packs come back');
});

test('seal records: additive, cleaned, unknown fields kept, absent stays absent', () => {
  assert.equal('fractureSeals' in freshSave(), false);
  const s = { fractureSeals: { a: { kills: '7', sealed: true, note: 1 }, b: 'junk', c: { kills: -3 } } }; ensureFractureSeals(s);
  assert.deepEqual(s.fractureSeals, { a: { kills: 7, sealed: true, note: 1 }, c: { kills: 0, sealed: false } });
});
