// Release 682 (Tim, 2026-11-01: "we get divine viscera from completing the divine challenge... a pedestal... we'll consume divine
// viscera to make the fight more or less challenging... add more rounds... increase the strength of the monsters... reroll the
// monsters in the pool"): Divine Viscera and the Altar of Viscera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { VISCERA, offerViscera, pactOf, takePact, visceraEarned, skylandPlan, SKY_MODES, rollSkylandMode, skylandSection, skylandLabel, ensureSkylands } from '../src/skylands.ts';
import { validActions } from '../src/interactions.ts';

const SEED = 'VISCERA', beasts = { tremorWorm: { slain: 1 }, morphingBlob: { slain: 1 }, mountainTurtle: { slain: 1 }, lightningGiant: { slain: 1 } };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
let stairAt = null; const stair = () => { for (let r = 6; r < 60 && !stairAt; r++) for (let x = -r; x <= r && !stairAt; x++) { const y = r - Math.abs(x); if (!skylandSection(SEED, x, y, 2)) continue; const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); const st = g.map.objects.find((o) => o.kind === 'skyStair'); if (st && !st.skyAnnex) stairAt = [x, y]; } return stairAt; };
function rushClimb(setup) {
  const [rx, ry] = stair(), s = freshSave(); s.seed = SEED; s.worldBeasts = JSON.parse(JSON.stringify(beasts)); setup?.(s);
  let run = (s.skylands?.runs || 0) + 1; while (rollSkylandMode(SEED, { rx, ry }, run) !== 'rush') run++; ensureSkylands(s).runs = run - 1;
  const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); const st = g.map.objects.find((o) => o.kind === 'skyStair');
  g.player.x = st.x; g.player.y = st.y; if (st.disc) g.skyLevel = st.elev; assert.ok(g.interact('ascend:0', st.id).ok); return { g, s };
}
function clear(g, s) { let t = 1000; g.player.invulnerableUntil = 1e15; const id = g.areaId(), waves = []; for (let k = 0; k < 14 && !s.consequences.dungeons[id]?.resolved; k++) { const live = g.enemies.filter((e) => !e.dead); if (live.length) waves.push(live.map((e) => ({ echo: e.skyEcho, hp: e.maxHp }))); for (const e of g.enemies) { e.hp = 0; e.dead = true; g.defeatEnemy(e); } for (let i = 0; i < 60; i++) { t += 50; g.update(.05, idle, t); } } return waves; }

test('offerings consume viscera and shape a pact, within bounds; the pact pays back more', () => {
  const s = freshSave(); assert.equal('viscera' in s.skylands, false, 'nothing until the first is earned');
  s.skylands.viscera = 2; assert.ok(offerViscera(s, 'might').ok); assert.ok(offerViscera(s, 'round').ok); assert.equal(s.skylands.viscera, 0);
  assert.equal(offerViscera(s, 'reroll').ok, false, 'none left'); assert.deepEqual(pactOf(s), { might: 1, round: 1 }); assert.equal(visceraEarned(pactOf(s)), 3);
  s.skylands.viscera = 9; assert.equal(offerViscera(s, 'lighten').ok, false, 'not both longer and lighter');
  for (let i = 0; i < 9; i++) offerViscera(s, 'might'); assert.equal(pactOf(s).might, VISCERA.offers.might.max);
  assert.match(skylandLabel('offer:round', s), /Add a round · 1 viscera/);
  const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(m.skylands.pact, s.skylands.pact); assert.equal(m.skylands.viscera, s.skylands.viscera);
  const plain = skylandPlan(`skyland:${SEED}:1,1:mrush:t0:r1`, { worldBeasts: beasts }), more = skylandPlan(`skyland:${SEED}:1,1:mrush:t0:r1`, { worldBeasts: beasts }, 'x', { round: 2 }), less = skylandPlan(`skyland:${SEED}:1,1:mrush:t0:r1`, { worldBeasts: beasts }, 'x', { lighten: 1 });
  assert.equal(more.length, plain.length + 2); assert.equal(less.length, plain.length - 1); assert.equal(plain.length, SKY_MODES.rushRounds.length);
  let differs = false; for (let r = 1; r < 6 && !differs; r++) differs = JSON.stringify(skylandPlan(`skyland:${SEED}:1,1:mrush:t0:r1`, { worldBeasts: beasts }, 'x', { reroll: r }).map((w) => w.echoes)) !== JSON.stringify(plain.map((w) => w.echoes)); assert.ok(differs, 'a reroll draws other echoes');
  assert.deepEqual(takePact(s), pactOf({ skylands: { pact: { might: 5, round: 1 } } })); assert.equal('pact' in s.skylands, false, 'taken up');
});

test('a Divine Challenge pays viscera and leaves an altar; the next one is fought under the pact made there', () => {
  const { g, s } = rushClimb(); clear(g, s); assert.equal(s.skylands.viscera, VISCERA.earn);
  const altar = g.map.objects.find((o) => o.kind === 'visceraAltar'); assert.ok(altar, 'the altar by the way out'); assert.deepEqual(validActions(altar, s).sort(), ['offer:lighten', 'offer:might', 'offer:reroll', 'offer:round']);
  g.player.x = altar.x; g.player.y = altar.y; const r = g.interact('offer:might', altar.id); assert.ok(r.ok, r.message); assert.equal(s.skylands.viscera, 0); assert.deepEqual(s.skylands.pact, { might: 1 });
  const base = rushClimb((q) => { q.skylands = { sigils: 0, best: 0, runs: 0, clears: 0 }; }), plainHp = clear(base.g, base.s)[0][0].hp;
  const pact = rushClimb((q) => { q.skylands = { sigils: 0, best: 0, runs: 0, clears: 0, viscera: 2, pact: { might: 2, round: 1 } }; });
  assert.equal('pact' in pact.s.skylands, false, 'the climb took the pact up'); const waves = clear(pact.g, pact.s);
  assert.equal(waves.length, SKY_MODES.rushRounds.length + 1, 'a round more'); assert.ok(waves[0][0].hp > plainHp, `stronger: ${plainHp} → ${waves[0][0].hp}`);
  assert.equal(pact.s.skylands.viscera, 2 + visceraEarned({ might: 2, round: 1 }), 'and it pays back more');
});
