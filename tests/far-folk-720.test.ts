// Release 720 (Tim, 2026-11-03): the folk realms. The Hollow Kin: townsfolk and travellers who are monsters, turning when you come
// near and coming in waves; and the Tall Country: townsfolk as big as giants who throw spears at monsters in the fight.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FAR_REALMS, FAR_FOLK, farRealmAt, isFolk } from '../src/far-realms.ts';
import { PACK_KINDS } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave } from '../src/types.ts';
import { Game, settlementSanctuary } from '../src/game.ts';

const seed = 'FAR720';
function folkSection(type) { for (let r = 1100; r < 1700; r += 37) for (let a = 0; a < 6.28; a += .02) { const rx = Math.round(Math.cos(a) * r), ry = Math.round(Math.sin(a) * r); if (farRealmAt(seed, rx, ry)?.type !== type) continue;
  const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); if ((g.map.objects || []).filter(isFolk).length >= 2) return g; } return null; }

test('two folk realms of their own bands, from far-realm version 6; earlier realms keep theirs', () => {
  assert.ok(FAR_REALMS.version >= 6); const c = { monsterFolk: 0, giantFolk: 0, giants: 0, ink: 0 }; let n = 0;
  for (let a = 0; a < 6.28; a += .002) { const rx = Math.round(Math.cos(a) * 1500), ry = Math.round(Math.sin(a) * 1500), t = farRealmAt(seed, rx, ry)?.type; n++; if (t in c) c[t]++; }
  assert.ok(c.monsterFolk > 0 && c.giantFolk > 0 && c.giants > 0 && c.ink > 0, JSON.stringify(c));
  for (let a = 0; a < 6.28; a += .01) { const rx = Math.round(Math.cos(a) * 1300), ry = Math.round(Math.sin(a) * 1300), old = farRealmAt(seed, rx, ry, 5)?.type; if (old) assert.equal(farRealmAt(seed, rx, ry)?.type, old); if (farRealmAt(seed, rx, ry)?.type?.endsWith('Folk')) assert.equal(old, undefined); }
  for (const k of FAR_FOLK.kinds) assert.ok(PACK_KINDS.includes(k), k);
});

test('the Hollow Kin: no sanctuary; the folk turn when you come near, then more come in waves until the road is quiet', () => {
  const g = folkSection('monsterFolk'); assert.ok(g, 'a Hollow Kin section with folk'); assert.equal(g.map.farFolk, 'monster'); assert.equal(settlementSanctuary(g.map, g.rx, g.ry, g.save), null);
  const folk = g.map.objects.filter(isFolk), before = g.enemies.length, p = g.player; let t = 1000;
  p.x = folk[0].x + 10; p.y = folk[0].y; g.folkTick(.1, t); assert.equal(g.map.objects.filter(isFolk).length, folk.length, 'not yet');
  p.x = folk[0].x + 1; p.y = folk[0].y; g.folkTick(.1, t += 100); assert.equal(g.map.objects.filter(isFolk).length, 0, 'they turn'); assert.equal(g.enemies.length, before + folk.length); assert.equal(g.message, FAR_FOLK.turn);
  for (let w = 2; w <= FAR_FOLK.waves; w++) { for (const e of g.folkState.mine) e.dead = true; g.folkTick(.1, t += FAR_FOLK.gap * 1000 + 10); assert.equal(g.folkState.wave, w, `wave ${w}`); assert.ok(g.folkState.mine.filter((e) => !e.dead).length >= 1); }
  for (const e of g.folkState.mine) e.dead = true; g.folkTick(.1, t += FAR_FOLK.gap * 1000 + 10); assert.equal(g.folkState.done, true); assert.equal(g.message, FAR_FOLK.done);
});

test('the Tall Country: the folk are giants and throw spears at monsters near them, never at you', () => {
  const g = folkSection('giantFolk'); assert.ok(g, 'a Tall Country section with folk'); assert.equal(g.map.farFolk, 'giant');
  const o = g.map.objects.filter(isFolk)[0], foe = Object.assign(createCombatant('thunderhorn', o.x + 3, o.y, false, []), { id: 'foe', aggro: true }); g.enemies = [foe]; const hp = foe.hp, php = g.player.hp;
  for (let t = 0; t < 6000; t += 100) g.folkTick(.1, 10000 + t); assert.ok(g.map.objects.filter(isFolk).every((q) => q.folkGiant)); assert.ok(foe.hp < hp, 'a spear struck it'); assert.equal(g.player.hp, php);
  const far = Object.assign(createCombatant('thunderhorn', o.x + FAR_FOLK.spear.range + 6, o.y, false, []), { id: 'far' }); g.enemies = [far]; const fh = far.hp; for (let t = 0; t < 6000; t += 100) g.folkTick(.1, 20000 + t);
  if (g.map.objects.filter(isFolk).every((q) => Math.hypot(q.x - far.x, q.y - far.y) > FAR_FOLK.spear.range)) assert.equal(far.hp, fh, 'out of reach');
});
