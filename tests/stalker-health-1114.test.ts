// The Stalker's health (Tim, 2026-11-14, fighting it at -187,-114: "maybe his health is broken: I'm not able to kill him; he
// should be dead at my strength"). Nothing reset or stuck it: its health sat at the top of the world beasts' (a whole Gate
// Revenant), it spends about a third of a fight untouchable (pool, mist, lying in wait), and its mirage healed back up to 15%
// a time; a headless duel of Tim's build at ring 219 took 540 s against 125–250 s for the world beasts there. Now half a
// Revenant (STALKER.vitals.hpShare) and a smaller mirage heal (STALKER.mirage.hide), about the world beasts' median; a stalk
// saved under the old health comes back at today's vitals at most; the 951 swept swing lands on it as on any foe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, characterStats, beastRegionalThreat, regionalScale } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { regionalThreat } from '../src/world.ts';
import { STALKER } from '../src/stalker.ts';
import { WORLD_BEASTS, WORLD_BEAST_IDS, tuneWorldBeast } from '../src/world-beasts.ts';
import { landSwing } from './swing-helpers.ts';

// Early, mid, late and endgame Wayfarers (a Verge Cleaver each), at the ring each would roam.
const BUILDS = [
  { name: 'early', level: 8, power: 9, might: 12, ring: 20 },
  { name: 'mid', level: 31, power: 44, might: 206, ring: 187 },
  { name: 'late', level: 60, power: 90, might: 320, ring: 400 },
  { name: 'endgame', level: 120, power: 160, might: 520, ring: 1000 },
];
function wayfarer(b: any) {
  const s: any = freshSave(); s.seed = `STALK-HP-${b.name}`; s.level = b.level; s.maxHp = 60 + b.level * 30; s.perception.aperture = 80;
  s.stats = { ...(s.stats || {}), Might: b.might, Vigor: 40 }; s.activeWeaponSlot = 'primary';
  s.equipment.primary = { id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: b.power, property: 'impact' };
  return s;
}
function game(s: any, rx: number, ry = 0) {
  const g: any = new Game(s, 0); g.paused = false; s.session.paused = false; g.rx = rx; g.ry = ry; g.loadArea('overworld', false);
  for (const t of g.map.tiles) { t.blocked = false; t.environment = false; t.structure = null; t.elev = 0; if (/water|river|lava|abyss|canyon/.test(t.kind)) t.kind = 'yardGrass'; }
  g.map.objects = []; g.enemies = []; g.projectiles = []; return g;
}
const beastHp = (s: any, id: string, ring: number) => regionalScale(tuneWorldBeast(createCombatant(WORLD_BEASTS[id].kind, 5, 5, true, []), s, id, characterStats(s)), regionalThreat(ring, 0)).maxHp;

test('the table: half a Gate Revenant, a smaller mirage heal, damage unchanged', () => {
  assert.equal(STALKER.vitals.hpShare, .5);
  assert.equal(STALKER.vitals.damageShare, .22); assert.equal(STALKER.vitals.damageScale, .85, 'its blows are as they were');
  assert.equal(STALKER.mirage.hide.cap, .05); assert.equal(STALKER.mirage.hide.regen, .02);
  assert.ok(STALKER.mirage.hide.regen * STALKER.mirage.hide.time >= STALKER.mirage.hide.cap, 'a full hide still reaches its cap');
});

for (const b of BUILDS) test(`a fresh Stalker sits inside the world beasts' health at that ring (${b.name} build, ring ${b.ring})`, () => {
  const s = wayfarer(b), g = game(s, b.ring);
  const e = g.spawnStalker({ x: 16, y: 16 }, true, 0); assert.ok(e, 'it comes out');
  const hps = WORLD_BEAST_IDS.map((id: string) => beastHp(s, id, b.ring)).sort((x: number, y: number) => x - y), median = hps[hps.length >> 1];
  assert.ok(e.maxHp <= hps[hps.length - 1], `${e.maxHp} at most the toughest beast's ${hps[hps.length - 1]}`);
  // It spends about a third of a fight untouchable and heals in its mirages, so its pool sits below the beasts' median.
  assert.ok(e.maxHp >= median * .4 && e.maxHp <= median * .9, `${e.maxHp} against a median of ${median}`);
  assert.equal(e.hp, e.maxHp);
  assert.equal(e.threatRing, beastRegionalThreat(regionalThreat(b.ring, 0)).ring);
});

test('a stalk saved under the old health comes back at today\'s vitals at most, and a hurt one keeps its wounds', () => {
  const b = BUILDS[1], s = wayfarer(b), g = game(s, b.ring, 0);
  const fresh = g.spawnStalker({ x: 16, y: 16 }, true, 0); g.enemies = [];
  s.stalker.active = { engaged: true, hp: fresh.maxHp * 2.1, door: null }; // as Tim's save: the old, doubled pool, nearly whole
  const back = g.spawnStalker({ x: 16, y: 16 }, true, 100); g.enemies = [];
  assert.equal(back.maxHp, fresh.maxHp); assert.equal(back.hp, fresh.maxHp, 'never above today\'s health');
  s.stalker.active = { engaged: true, hp: Math.round(fresh.maxHp * .3), door: null };
  const hurt = g.spawnStalker({ x: 16, y: 16 }, true, 200);
  assert.equal(hurt.hp, Math.round(fresh.maxHp * .3), 'it comes back as hurt as it left'); assert.equal(hurt.maxHp, fresh.maxHp);
});

test('a mirage heals it at most hide.cap of its health', () => {
  const s = wayfarer(BUILDS[1]), g = game(s, 30);
  const e = g.spawnStalker({ x: 16, y: 16 }, true, 0); e.hp = Math.round(e.maxHp * .5); const start = e.hp;
  e.stalkAct = { kind: 'prowl', t: 9, total: 9 }; e.stalkMirage = { t: 30, phase: 'hide', pt: 99, ang: 0, dir: 1, n: 1, healed: 0, hid: false };
  let now = 1000; for (let i = 0; i < 60 * 12; i++) { now += 16; g.player.invulnerableUntil = now + 1e6; g.update(.016, { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} }, now); if (!e.stalkMirage || e.stalkMirage.phase !== 'hide') break; }
  assert.ok(e.hp > start, 'it hid and healed'); assert.ok(e.hp - start <= STALKER.mirage.hide.cap * e.maxHp + 1, `healed ${e.hp - start} of ${e.maxHp}`);
});

test('the 951 swept Cleaver swing lands on the Stalker wherever it lands on an ordinary foe', () => {
  const s = wayfarer(BUILDS[1]), g = game(s, 30); let now = 100000;
  for (const dist of [.8, 1.2, 1.6, 2]) for (const deg of [-40, 0, 40]) {
    const x = 16 + Math.cos(deg * Math.PI / 180) * dist, y = 16 + Math.sin(deg * Math.PI / 180) * dist;
    const dealt = (kind: string) => {
      g.enemies = []; Object.assign(g.player, { x: 16, y: 16, attackUntil: 0, meleeUntil: 0 }); g.pendingMeleeContact = null; now += 5000;
      const e: any = kind === 'stalker' ? g.spawnStalker({ x, y }, true, now) : Object.assign(createCombatant('ashling', x, y), { id: 'a' });
      if (kind !== 'stalker') g.enemies.push(e);
      Object.assign(e, { x, y, hp: 1e9, maxHp: 1e9, stalkCharges: 0 }); s.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null;
      landSwing(g, now, { x: 1, y: 0 }); return 1e9 - e.hp;
    };
    const ordinary = dealt('ashling'), stalker = dealt('stalker');
    assert.ok(ordinary > 0, `the swing reaches ${dist} at ${deg}°`);
    assert.equal(stalker, ordinary, `the Stalker takes the same blow at ${dist} tiles, ${deg}°`);
  }
});
