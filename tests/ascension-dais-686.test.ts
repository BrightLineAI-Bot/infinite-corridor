// Release 686 (Tim, 2026-11-01: "put the viscera altar at the start of the divine challenge too... call it the ascension dais"):
// a Divine Challenge entered holding Divine Viscera waits on an Ascension Dais; offerings there shape this fight.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { DAIS, SKY_MODES, rollSkylandMode, skylandSection, ensureSkylands, skylandLabel } from '../src/skylands.ts';
import { validActions } from '../src/interactions.ts';

const SEED = 'VISCERA', beasts = { tremorWorm: { slain: 1 }, morphingBlob: { slain: 1 }, mountainTurtle: { slain: 1 }, lightningGiant: { slain: 1 } };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
let stairAt = null; const stair = () => { for (let r = 6; r < 60 && !stairAt; r++) for (let x = -r; x <= r && !stairAt; x++) { const y = r - Math.abs(x); if (!skylandSection(SEED, x, y, 2)) continue; const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); const st = g.map.objects.find((o) => o.kind === 'skyStair'); if (st && !st.skyAnnex) stairAt = [x, y]; } return stairAt; };
function climb(viscera) {
  const [rx, ry] = stair(), s = freshSave(); s.seed = SEED; s.worldBeasts = JSON.parse(JSON.stringify(beasts)); const k = ensureSkylands(s); if (viscera != null) k.viscera = viscera;
  let run = k.runs + 1; while (rollSkylandMode(SEED, { rx, ry }, run) !== 'rush') run++; k.runs = run - 1;
  const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); const st = g.map.objects.find((o) => o.kind === 'skyStair');
  g.player.x = st.x; g.player.y = st.y; if (st.disc) g.skyLevel = st.elev; assert.ok(g.interact('ascend:0', st.id).ok); return { g, s };
}
const w0 = (g) => g.enemies.filter((e) => !e.dead && String(e.id).startsWith(`${g.areaId()}:w0:`)).length;
const tick = (g, n = 20, t0 = 1000) => { let t = t0; for (let i = 0; i < n; i++) { t += 50; g.update(.05, idle, t); } return t; };

test('holding viscera, the challenge waits on an Ascension Dais; offerings there shape this fight; Begin starts it', () => {
  const { g, s } = climb(3); let t = tick(g);
  const dais = g.map.objects.find((o) => o.kind === 'visceraAltar' && o.start); assert.ok(dais, 'a dais at the start'); assert.equal(dais.name, DAIS.name);
  assert.equal(w0(g), 0, 'the first round waits');
  assert.ok(validActions(dais, s).includes('begin')); assert.equal(skylandLabel('begin', s), 'Begin the Divine Challenge');
  g.player.x = dais.x; g.player.y = dais.y; assert.ok(g.interact('offer:round', dais.id).ok); assert.ok(g.interact('offer:might', dais.id).ok); assert.equal(s.skylands.viscera, 1);
  t = tick(g, 20, t); assert.equal(w0(g), 0, 'still waiting while you stand there');
  assert.ok(g.interact('begin', dais.id).ok); assert.match(g.message, /might 1, \+1 round/);
  assert.equal(g.map.skyPlan.length, SKY_MODES.rushRounds.length + 1, 'this fight has the added round'); assert.ok(w0(g) > 0, 'the first echo comes');
  assert.equal('pact' in s.skylands, false); assert.ok(!dais.start && !validActions(dais, s).includes('begin'), 'the dais now shapes the next one');
});

test('stepping off the dais begins it too; with no viscera it begins at once, as before', () => {
  const { g } = climb(1); tick(g); const dais = g.map.objects.find((o) => o.kind === 'visceraAltar' && o.start); assert.ok(dais);
  g.player.x = dais.x + DAIS.leave + 1; g.player.y = dais.y; tick(g, 4); assert.ok(w0(g) > 0, 'stepping off begins it');
  const none = climb(null); assert.ok(w0(none.g) > 0, 'no viscera: no wait'); assert.ok(!none.g.map.objects.some((o) => o.kind === 'visceraAltar'));
});
