// The Rite of Ascendancy seals Wayglass travel (Tim, 2026-11-05). While a rite burns, travel to a Wayglass or checkpoint is
// refused with a short message (ASCENDANCY.messages.sealed), from every route: the Atlas's travel button (travelToCheckpoint,
// with or without a chosen Wayglass), its home button (returnHome), and Act on a Wayglass (which only lights it). The Crossing
// Sigil stays the one way out (release 774): it costs the attempt and does not end the strange tree. Death keeps its rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';
import { ASCENDANCY, saplingHere } from '../src/ascendancy.ts';

const SEED = 'RITE1';
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
const fresh = () => { const s = freshSave(); s.seed = SEED; s.consumables.crossingSigil = 2; s.checkpoints['3,-2'] = { rx: 3, ry: -2, x: 16, y: 16, name: 'Far Glass' }; return s; };
const load = (g, rx, ry) => { g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
let spot = null;
const findDais = () => { if (spot) return spot; for (let x = 4; x < 80 && !spot; x++) for (let y = -30; y < 30 && !spot; y++) if (saplingHere(SEED, x, y) && load(new Game(fresh(), 0), x, y).map.objects.some((o) => o.kind === 'saplingDais')) spot = [x, y]; return spot; };
function burning(s = fresh()) {
  const [x, y] = findDais(), g = load(new Game(s, 0), x, y), o = g.map.objects.find((q) => q.kind === 'saplingDais');
  g.player.x = o.x; g.player.y = o.y + 1; g.lastUpdateNow = 1000; assert.ok(g.interact('begin', o.id).ok, g.message); g.riteTick(.05, 1000 + ASCENDANCY.grace * 1000 + 10);
  assert.ok(g.rite); return { s, g, x, y };
}
function refused(g, s, x, y, call, label) {
  const pos = [g.player.x, g.player.y], tries = s.ascendancy[`${x},${y}`].tries, sigils = s.consumables.crossingSigil, active = structuredClone(s.activeCheckpoint);
  assert.equal(call(), false, `${label}: refused`);
  assert.equal(g.message, ASCENDANCY.messages.sealed, `${label}: the short message`);
  assert.deepEqual([g.area, g.rx, g.ry, g.player.x, g.player.y], ['overworld', x, y, ...pos], `${label}: nobody moved`);
  assert.ok(g.rite, `${label}: the rite still burns`); assert.equal(s.ascendancy[`${x},${y}`].tries, tries, `${label}: no attempt spent`);
  assert.equal(s.consumables.crossingSigil, sigils, `${label}: no sigil spent`); assert.deepEqual(s.activeCheckpoint, active, `${label}: the active Wayglass unchanged`);
}
function roundTrip(g, now = 5000) {
  const { main, puts } = splitSnapshot(snapshotSave(g.exportSnapshot(now)));
  const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts))));
  assert.equal(v.health, 'healthy', v.error); return v.save;
}

test('the data: a short sealed message in ASCENDANCY.messages that names the sigil', () => {
  assert.equal(typeof ASCENDANCY.messages.sealed, 'string'); assert.ok(ASCENDANCY.messages.sealed.length < 140); assert.match(ASCENDANCY.messages.sealed, /Crossing Sigil/);
});

test('mid-rite, every Wayglass route is refused: the active Wayglass, a chosen one, home, and Act on a Wayglass only lights it', () => {
  const { s, g, x, y } = burning();
  refused(g, s, x, y, () => g.travelToCheckpoint(null), 'Atlas travel to the active Wayglass');
  refused(g, s, x, y, () => g.travelToCheckpoint('3,-2'), 'Atlas travel to a chosen Wayglass');
  refused(g, s, x, y, () => g.returnToCheckpoint(), 'return to checkpoint');
  refused(g, s, x, y, () => g.returnHome(), 'Atlas home');
  // a Wayglass on the rite's ground: Act lights it (a rest point) but never carries the Wayfarer off
  const glass = { id: 'test-glass', kind: 'checkpoint', name: 'Rite Glass', x: Math.round(g.player.x) + 1, y: Math.round(g.player.y), state: 'active', actions: ['activate'], landmark: true };
  g.map.objects.push(glass); g.player.x = glass.x; g.player.y = glass.y + 1; g.interact('activate', glass.id);
  assert.deepEqual([g.area, g.rx, g.ry], ['overworld', x, y], 'Act did not travel'); assert.ok(g.rite, 'the rite still burns');
  refused(g, s, x, y, () => g.travelToCheckpoint(null), 'travel to the Wayglass just lit');
  // a few frames on: still sealed, still burning
  for (let i = 0; i < 5; i++) g.update(1 / 30, idle, 1000 + ASCENDANCY.grace * 1000 + 100 + i * 33);
  if (g.player.hp > 0) refused(g, s, x, y, () => g.travelToCheckpoint('3,-2'), 'after a few frames');
});

test('the Crossing Sigil is still the way out: it spends the attempt and a sigil, the tree keeps its others, and travel opens again', () => {
  const { s, g, x, y } = burning();
  assert.equal(g.travelToCheckpoint('3,-2'), false);
  assert.ok(g.useCrossingSigil('3,-2'), g.message); assert.deepEqual([g.rx, g.ry], [3, -2], 'on to the chosen Wayglass');
  assert.equal(g.rite, null); assert.equal(s.consumables.crossingSigil, 1); assert.equal(s.ascendancy[`${x},${y}`].tries, 1); assert.equal(s.ascendancy[`${x},${y}`].done, false);
  assert.match(g.message, /rite is broken/i);
  assert.ok(g.travelToCheckpoint(null), 'no rite: the Wayglass line is free again'); assert.ok(g.returnHome());
  load(g, x, y); assert.ok(g.map.objects.some((o) => o.kind === 'saplingDais' && o.state === 'open'), 'the strange tree waits for another rite');
});

test('save and reload mid-rite: the rite resumes and stays sealed; once done, travel is free', () => {
  const { g, x, y } = burning(), s2 = structuredClone(roundTrip(g)), back = new Game(s2, 9000);
  assert.deepEqual([back.area, back.rx, back.ry], ['overworld', x, y]); assert.ok(back.rite, 'the rite resumed');
  refused(back, s2, x, y, () => back.travelToCheckpoint('3,-2'), 'after reload');
  back.riteTick(.05, back.rite.until + 1); assert.equal(back.rite, null); assert.equal(s2.ascendancy[`${x},${y}`].done, true);
  assert.ok(back.travelToCheckpoint('3,-2'), 'done: travel free'); assert.deepEqual([back.rx, back.ry], [3, -2]);
});

test('dying keeps its rules: the rite breaks, the attempt is spent and the Wayfarer recovers at the active Wayglass', () => {
  const { s, g, x, y } = burning(); g.player.hp = 0; g.update(.05, idle, 1000 + ASCENDANCY.grace * 1000 + 6000);
  assert.equal(g.rite, null, 'broken by the death'); assert.equal(s.ascendancy[`${x},${y}`].tries, 1);
  for (let i = 0; i < 400 && (g.player.hp <= 0 || g.fallen); i++) g.update(1 / 30, idle, 1000 + ASCENDANCY.grace * 1000 + 6100 + i * 33);
  assert.ok(g.player.hp > 0, 'recovered'); assert.deepEqual([g.rx, g.ry], [s.activeCheckpoint.rx, s.activeCheckpoint.ry], 'at the active Wayglass');
  assert.ok(g.travelToCheckpoint('3,-2'), 'and the Wayglass line is free');
});

test('main.ts: in the Rite the Atlas travel button is the sigil, and home is disabled and reports the refusal', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /const sigil = game\.area === "dungeon" \|\| sigilAtlas \|\| !!game\.rite;/);
  assert.match(main, /const travelled=game\.area === "dungeon" \|\| sigilAtlas \|\| game\.rite\n\s*\? game\.useCrossingSigil/);
  assert.match(main, /\$\("#mapHome"\)\.disabled = game\.area === "dungeon" \|\| !!game\.rite;/);
  assert.match(main, /const travelled = game\.returnHome\(\);[^\n]*\n\s*persist\(\);\n\s*if \(travelled\) resume\(\);\n\s*else \{ \$\("#mapDetail"\)\.textContent = game\.message;/);
});
