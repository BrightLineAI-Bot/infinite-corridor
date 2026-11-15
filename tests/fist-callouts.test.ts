// The Iron Fists' status meter (Tim, 2026-11-14): the HUD message line shows "Perfect Timing!" while the chain's latest step was
// on the beat or let go perfectly, "Perfect Rhythm!" while it was a rhythm blow, steps back down to timing, and clears when a step
// misses or the chain breaks. Presentation only: brawler-spells.ts FIST_CALLOUT, fistCalloutLevel, fistStatusLevel; main.ts updateHud.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { IRON_FISTS, FIST_CALLOUT, fistCalloutLevel, fistStatusLevel } from '../src/brawler-spells.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { snapshotSave } from '../src/persistence.ts';

const F = IRON_FISTS, DT = 1 / 60, HOLD = (F.tapGrace + F.perfect[0]) * 1000 + 20, T = FIST_CALLOUT.text;
function arena({ fists = true } = {}) {
  const s = freshSave(); s.seed = 'FIST-CALLOUT'; s.level = 15;
  s.equipment.primary = fists ? { id: 'primary-callout', name: 'Iron Fists', slot: 'primary', power: 10, property: 'brawler', tier: 'rare', affixes: [] } : s.equipment.primary;
  s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = [];
  if (fists) { s.equipment.primary = normalizeSockets(s.equipment.primary); s.glyphs.echo = 2; for (let i = 0; i < 2; i++) assert.equal(socketGlyph(s, 'melee', i, 'echo').ok, true); }
  const g = new Game(s, 0); g.damageNumbers = true;
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('ashling', 11.2, 10), { id: 'foe', hp: 1e9, maxHp: 1e9, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] })];
  return { s, g, clock: { t: 1000 }, seen: [] };
}
// One frame; `seen` records the meter's text each frame, as the HUD would read it.
function frame(w, press = false, held = false, hook = null) {
  const { g, clock } = w; let used = false; g.player.invulnerableUntil = clock.t + 1e6; g.enemies[0].x = g.player.x + 1.2; g.enemies[0].y = g.player.y;
  g.update(DT, { state: { x: 0, y: 0 }, consume: (k) => k === 'attack' && press && !used && (used = true), held: (k) => k === 'attack' && held }, clock.t); clock.t += DT * 1000;
  hook?.(g); w.seen.push(T[fistStatusLevel(g, g.lastUpdateNow)]);
}
const until = (w, ms, hook) => { while (w.clock.t < ms) frame(w, false, false, hook); };
const tap = (w, hook) => { frame(w, true, false, hook); frame(w, false, false, hook); };
const charge = (w, ms, hook) => { frame(w, true, true, hook); const start = w.g.fistCharge.start; while (w.clock.t - start < ms) frame(w, false, true, hook); frame(w, false, false, hook); };
const status = (w) => T[fistStatusLevel(w.g, w.g.lastUpdateNow)];
const onBeat = (w, hook) => until(w, w.g.fistBeat.opens, hook);
const offBeat = (w, hook) => until(w, w.g.fistBeat.closes + 40, hook); // after the window, still inside the chain's `window`

test('levels: rhythm needs both, timing either, nothing for neither; the text comes from the table', () => {
  assert.equal(fistCalloutLevel(true, true), FIST_CALLOUT.rhythm); assert.equal(fistCalloutLevel(true, false), FIST_CALLOUT.timing);
  assert.equal(fistCalloutLevel(false, true), FIST_CALLOUT.timing); assert.equal(fistCalloutLevel(false, false), 0);
  assert.equal(T[FIST_CALLOUT.timing], 'Perfect Timing!'); assert.equal(T[FIST_CALLOUT.rhythm], 'Perfect Rhythm!'); assert.equal(T[0], '');
});

test('an ordinary punch shows nothing; a press on the beat shows Perfect Timing! and keeps showing it', () => {
  const w = arena(); tap(w); until(w, w.clock.t + 120); assert.equal(status(w), '', 'an ordinary punch');
  onBeat(w); tap(w); until(w, w.clock.t + 120); assert.equal(status(w), 'Perfect Timing!', 'on the beat');
  onBeat(w); tap(w); until(w, w.clock.t + 120); assert.equal(status(w), 'Perfect Timing!', 'still timing');
});

test('a charge let go in its perfect window, off the beat, is Perfect Timing!', () => {
  const w = arena(); charge(w, HOLD); until(w, w.clock.t + 100); assert.equal(status(w), 'Perfect Timing!');
});

test('escalation, step down and clear: timing, then rhythm (held through the next charge), back to timing, then a miss clears it', () => {
  const w = arena(); tap(w);
  onBeat(w); tap(w); assert.equal(status(w), 'Perfect Timing!');
  onBeat(w); charge(w, HOLD); assert.equal(status(w), 'Perfect Rhythm!', 'a charge started on the beat and let go perfectly');
  const from = w.seen.length; onBeat(w); charge(w, HOLD); assert.equal(status(w), 'Perfect Rhythm!', 'kept up');
  assert.ok(w.seen.slice(from).every((t) => t === 'Perfect Rhythm!'), 'no flicker while the next rhythm blow charges');
  onBeat(w); tap(w); assert.equal(status(w), 'Perfect Timing!', 'a timing step steps it back down');
  onBeat(w); charge(w, HOLD); assert.equal(status(w), 'Perfect Rhythm!', 'and up again');
  offBeat(w); tap(w); assert.equal(status(w), '', 'a step that is neither clears it');
});

test('the chain breaking clears it: a long pause, a dodge, the fists put away', () => {
  const pause = arena(); tap(pause); onBeat(pause); tap(pause); assert.equal(status(pause), 'Perfect Timing!');
  until(pause, pause.g.fistCombo.until + 50); assert.equal(status(pause), '', 'the chain window ran out');
  const dodge = arena(); tap(dodge); onBeat(dodge); tap(dodge); dodge.g.cancelFists(dodge.clock.t); assert.equal(status(dodge), '', 'a dodge or cast cancels the chain');
  const swap = arena(); tap(swap); onBeat(swap); tap(swap); swap.g.save.equipment.primary = freshSave().equipment.primary; assert.equal(status(swap), '', 'no fists in hand');
  const hidden = arena(); tap(hidden); onBeat(hidden); tap(hidden); hidden.g.damageNumbers = false; assert.equal(status(hidden), '', 'combat text off hides it');
});

test('non-fist weapons never show it', () => {
  const w = arena({ fists: false }); for (let i = 0; i < 40; i++) { frame(w, i % 6 === 0, false); }
  assert.ok(w.seen.every((t) => t === ''));
});

test('the level changes only at steps, never every frame, and rapid perfect play stays bounded', () => {
  const w = arena(); tap(w); let steps = 1;
  for (let i = 0; i < 30; i++) { onBeat(w); if (i % 3 === 2) tap(w); else charge(w, HOLD); steps++; }
  let changes = 0; for (let i = 1; i < w.seen.length; i++) if (w.seen[i] !== w.seen[i - 1]) changes++;
  assert.ok(w.seen.length > 30 * 60 * .5, 'many frames'); assert.ok(changes <= steps, `${changes} changes over ${steps} steps and ${w.seen.length} frames`);
  assert.ok(changes >= 10, 'it does step between rhythm and timing');
  assert.ok(new Set(w.seen).size <= 3, 'one line, three states');
});

test('presentation only: the same play with the level stripped deals the same damage and saves the same', () => {
  const run = (strip) => {
    const w = arena(), hook = strip ? (g) => { if (g.fistCombo) delete g.fistCombo.level; if (g.fistCharge) delete g.fistCharge.level; } : null; tap(w, hook);
    for (let i = 0; i < 12; i++) { onBeat(w, hook); if (i % 4 === 3) tap(w, hook); else charge(w, HOLD, hook); }
    until(w, w.clock.t + 500, hook);
    const out = snapshotSave(w.g.exportSnapshot(w.clock.t)); const save = JSON.stringify(out, (k, v) => k === "savedAt" || k === "updatedAt" ? 0 : v); return { hp: w.g.enemies[0].hp, x: w.g.player.x, y: w.g.player.y, message: w.g.message, save, seen: w.seen };
  };
  const a = run(false), b = run(true);
  assert.equal(a.hp, b.hp); assert.equal(a.x, b.x); assert.equal(a.y, b.y); assert.equal(a.message, b.message); assert.deepEqual(JSON.parse(a.save), JSON.parse(b.save));
  assert.ok(a.seen.includes('Perfect Rhythm!')); assert.ok(b.seen.every((t) => t === ''));
  assert.equal(JSON.parse(a.save).version, 14);
  for (const k of ['Perfect Rhythm', 'Perfect Timing', '"fistCombo"', '"fistCharge":{']) assert.equal(a.save.includes(k), false, `never saved: ${k}`);
});

test('the HUD writes the meter through hudSet (only on change) in the message line, in both views', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(main, /fistStatusLevel\(game, game\.lastUpdateNow \?\? now\)/); assert.match(main, /hudSet\(el,"text",FIST_CALLOUT\.text\[lv\]\)/);
  assert.match(html, /<div id="messageViewport"[^>]*>\s*<p id="message">[^<]*<\/p>\s*<span id="fistStatus" class="fist-status off"/);
});
