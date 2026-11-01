// Release 671 (Tim, 2026-11-01, playing Frenzied: "the wave frequency is too slow... several packs coming in... I have to kill
// them all, and then you have to wait... then several more packs come in, or I can go to the next square"). A wave is several
// packs from different sides; clear it and the next waits `rest` s; leave it standing and the next joins it after `press` s;
// the cap counts only what the waves brought, so a crowded section still gets its waves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { FRACTURED } from '../src/fractured.ts';

const at = (mode, rx, ry) => { const s = freshSave(); s.seed = 'FRACTURE'; s.fractured = mode; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); return g; };
let wild = null; const wildSection = () => { if (wild) return wild; for (let x = 4; x < 40 && !wild; x++) for (let y = 4; y < 40 && !wild; y += 3) { const g = at('frenzied', x, y); if (g.fracturedHere() && g.enemies.filter((e) => e.fractured).length >= 4) wild = [x, y]; } return wild; };
const wave = (g) => g.enemies.filter((e) => e.fracReinforcement && !e.dead);
const packsOf = (es) => new Set(es.map((e) => e.id.replace(/-(\d+|shaman)$/, ''))).size;

for (const mode of ['fractured', 'frenzied']) test(`${mode}: a wave is several packs, even in a crowded section, soon after arriving`, () => {
  const [x, y] = wildSection(), g = at(mode, x, y), M = FRACTURED.modes[mode];
  assert.ok(g.enemies.filter((e) => !e.dead && !e.ambient).length > 0, 'the section keeps its own creatures (they do not hold the waves back)');
  g.tickFractured(0); g.tickFractured((FRACTURED.grace + .1) * 1000);
  const w = wave(g); assert.ok(packsOf(w) >= Math.min(2, M.packs[0]), `${packsOf(w)} packs`); assert.ok(w.length >= M.pack[0] * 2, `${w.length} creatures`);
});

test('cleared: the next wave waits its rest; left standing: the next joins it after press', () => {
  const [x, y] = wildSection(), M = FRACTURED.modes.frenzied;
  let g = at('frenzied', x, y), t = (FRACTURED.grace + .1) * 1000; g.tickFractured(0); g.tickFractured(t);
  for (const e of wave(g)) { e.dead = true; e.hp = 0; } g.tickFractured(t += 500); const msg = g.message;
  g.tickFractured(t += (M.rest - 2) * 1000); assert.equal(wave(g).length, 0, `resting (${msg})`);
  g.tickFractured(t += 3000); assert.ok(wave(g).length >= M.pack[0], 'the next wave after the rest');
  g = at('frenzied', x, y); t = (FRACTURED.grace + .1) * 1000; g.tickFractured(0); g.tickFractured(t); const first = wave(g).length;
  g.tickFractured(t += (M.press + .5) * 1000); assert.ok(wave(g).length > first, `${first} → ${wave(g).length}: more come while you stand`);
  for (let k = 0; k < 20; k++) g.tickFractured(t += (M.press + .5) * 1000); assert.ok(wave(g).length <= M.cap, 'never past the cap');
});

test('every third wave is elite-led: every pack has a champion or a rare at its head', () => {
  const [x, y] = wildSection(), g = at('fractured', x, y), M = FRACTURED.modes.fractured; let t = (FRACTURED.grace + .1) * 1000; g.tickFractured(0);
  for (let n = 1; n <= M.surgeEvery; n++) { const before = new Set(g.enemies.map((e) => e.id)); g.tickFractured(t); const fresh = wave(g).filter((e) => !before.has(e.id));
    if (n === M.surgeEvery) { const leads = fresh.filter((e) => /-0$/.test(e.id)); assert.ok(leads.length >= 2 && leads.every((e) => e.fracRank), leads.map((e) => e.fracRank).join()); }
    for (const e of wave(g)) { e.dead = true; e.hp = 0; } g.tickFractured(t += 100); t += (M.rest + 1) * 1000; }
});
