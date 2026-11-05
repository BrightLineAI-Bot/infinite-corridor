// Crossing Sigils anywhere (Tim, 2026-11-05: "A crossing sigil should get you out of a labyrinth... or the Pentagon. If you can't
// teleport from where you are, a crossing sigil should still work, across all dungeons and realities. You should be able to use a
// crossing sigil to leave even if you're in a boss fight, even if you're in the Rite. If you use it, you leave. You don't end the
// Rite — you lose your chance — but a crossing sigil is a sure-fire 'I'm out of here'").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game, CROSSING_SIGIL, isDungeonGuardian, footprintOpen, footprintHazard, mapWidth } from '../src/game.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';
import { ASCENDANCY, saplingHere } from '../src/ascendancy.ts';
import { LABYRINTHS, labyrinthHere, labyrinthPlan } from '../src/labyrinths.ts';
import { sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { PENTAGON, pentagonPlan, pentagonVaultId } from '../src/pentagon.ts';
import { pentagonArenaId } from '../src/pentagon-arena.ts';
import { shaftHere, ensureTheDeep } from '../src/the-deep.ts';
import { ensureFarArray, piecesNeeded } from '../src/far-array.ts';
import { relayCoordinate } from '../src/relay-network.ts';
import { isArenaRun } from '../src/listener-arena.ts';
import { DIVE, diveSite } from '../src/diving.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { skylandSection } from '../src/skylands.ts';
import { buySkiff } from '../src/boats.ts';
import { grantTidemantle } from '../src/water-traversal.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
const fresh = (seed) => { const s = freshSave(); s.seed = seed; s.consumables.crossingSigil = 3; return s; };
const at = (s, rx, ry) => { const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
function roundTrip(g, now = 5000) {
  const { main, puts } = splitSnapshot(snapshotSave(g.exportSnapshot(now)));
  const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts))));
  assert.equal(v.health, 'healthy', v.error); return v.save;
}
// Out in the open world, on ground the Wayfarer can stand on, nothing carried changed, one sigil gone.
function out(g, s, before, label) {
  assert.equal(g.area, 'overworld', `${label}: out in the open world`);
  const w = mapWidth(g.map, 'overworld');
  assert.ok(footprintOpen(g.map, w, g.player.x, g.player.y), `${label}: not inside a wall (${g.player.x}, ${g.player.y})`);
  assert.equal(footprintHazard(g.map, w, g.player.x, g.player.y), null, `${label}: not on lava, a chasm or deep water`);
  assert.equal(s.consumables.crossingSigil, before.sigils - 1, `${label}: one sigil spent`);
  assert.deepEqual({ currency: s.currency, inventory: s.inventory, materials: s.materials, equipment: s.equipment }, before.carried, `${label}: nothing carried lost`);
  assert.ok(!g.glide && !g.swimming && !g.fallen, `${label}: on its feet`);
  assert.match(g.message, /Crossing Sigil burns away/);
  // exact resume: the journey saves and reloads where the sigil left it
  const back = new Game(structuredClone(roundTrip(g)), 9000);
  assert.deepEqual([back.area, back.rx, back.ry, back.save.consumables.crossingSigil], ['overworld', g.rx, g.ry, s.consumables.crossingSigil], `${label}: resumes there`);
}
const carried = (s) => ({ sigils: s.consumables.crossingSigil, carried: structuredClone({ currency: s.currency, inventory: s.inventory, materials: s.materials, equipment: s.equipment }) });

// ------------------------------------------------------------------------------------------------ an ordinary crossing and its boss
test('an ordinary crossing: out at its entrance mid boss fight; the guardian is whole and calm when you come back; the run is kept', () => {
  const s = fresh('SIGIL-ANY'), g = new Game(s, 0), gate = g.map.objects.find((o) => o.kind === 'dungeon');
  Object.assign(g.player, { x: gate.x, y: gate.y }); assert.ok(g.interact('enter', gate.id).ok, g.message);
  const id = g.areaId(), guard = g.enemies.find((e) => !e.dead && isDungeonGuardian(e)); assert.ok(guard, 'a guardian');
  guard.hp = Math.round(guard.maxHp / 3); guard.aggro = true; guard.x += 1;
  const weak = g.enemies.find((e) => !e.dead && !isDungeonGuardian(e) && !e.ambient); if (weak) { weak.hp = 0; weak.dead = true; g.defeatEnemy(weak); }
  const before = carried(s), ret = { ...s.session.dungeonReturn };
  assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'crossing');
  assert.deepEqual([g.rx, g.ry], [ret.rx, ret.ry], 'at the dungeon\'s own entrance'); assert.match(g.message, /fight you left behind/);
  s.session.activeDungeonId = id; s.session.dungeonReturn = ret; g.loadArea('dungeon', false);
  const again = g.enemies.find((e) => e.id === guard.id); assert.equal(again.hp, again.maxHp, 'the guardian is whole'); assert.ok(!again.aggro, 'and calm');
  assert.ok(weak, 'a creature felled on the way');   if (weak) assert.ok(g.enemies.find((e) => e.id === weak.id).dead, 'the run is kept: the fallen stay fallen');
});

test('dying, dead or falling to a death: the sigil does not answer and is kept', () => {
  for (const [label, set] of [['dead', (g) => { g.player.hp = 0; }], ['the death beat', (g) => { g.fallen = { until: 9e9, beat: true }; }], ['a fatal fall', (g) => { g._fatalFallPending = true; }], ['a fatal hole', (g) => { g.save.session.holeDeath = { id: 'x', x: 1, y: 1 }; }]]) {
    const s = fresh('SIGIL-DEAD'), g = new Game(s, 0); set(g);
    assert.equal(g.useCrossingSigil(null), false, label); assert.equal(s.consumables.crossingSigil, 3, `${label}: kept`); assert.equal(g.message, CROSSING_SIGIL.messages.tooLate);
  }
  const s = fresh('SIGIL-NONE'); s.consumables.crossingSigil = 0; const g = new Game(s, 0); assert.equal(g.useCrossingSigil(null), false); assert.equal(g.message, CROSSING_SIGIL.messages.none);
});

// ------------------------------------------------------------------------------------------------ the open world
test('the open world: to the chosen Wayglass, or the active one; mid-glide, swimming, held or cursed you arrive on your feet', () => {
  const s = fresh('SIGIL-OPEN'); s.checkpoints['3,-2'] = { rx: 3, ry: -2, x: 16, y: 16, name: 'Far Glass' }; const g = at(s, 5, 4);
  g.glide = { z: 4, vx: 0, vy: 0, open: true }; g.swimming = true; g.player.heldUntil = 9e9; g.player.stunnedUntil = 9e9;
  let before = carried(s); assert.ok(g.useCrossingSigil('3,-2'), g.message); out(g, s, before, 'chosen'); assert.deepEqual([g.rx, g.ry], [3, -2]); assert.match(g.message, /Far Glass/);
  assert.ok(!(g.player.heldUntil > 0) && !(g.player.stunnedUntil > 0), 'free of grips and stuns');
  g.rx = 6; g.ry = 1; g.loadArea('overworld', false); before = carried(s);
  assert.ok(g.useCrossingSigil(null)); out(g, s, before, 'active'); assert.deepEqual([g.rx, g.ry], [s.activeCheckpoint.rx, s.activeCheckpoint.ry]);
});

test('after a displacement, where the Wayglass line cannot find you, a sigil still does (and restores the line)', () => {
  const s = fresh('SIGIL-DISP'), g = at(s, 40, -12); s.session.displacementJourney = { source: { rx: 0, ry: 0, x: 16, y: 16 }, destination: { rx: 40, ry: -12 } };
  assert.equal(g.travelToCheckpoint(null), false); assert.match(g.message, /Crossing Sigil/, 'the refusal names the sigil');
  const before = carried(s); assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'displaced'); assert.equal(s.session.displacementJourney, null);
});

// ------------------------------------------------------------------------------------------------ the Rite of Ascendancy
const RITE = 'RITE1';
let dais = null; const findDais = () => { if (dais) return dais; for (let x = 4; x < 80 && !dais; x++) for (let y = -30; y < 30 && !dais; y++) if (saplingHere(RITE, x, y) && at(fresh(RITE), x, y).map.objects.some((o) => o.kind === 'saplingDais')) dais = [x, y]; return dais; };
test('the Rite: the fire bars every edge, but a sigil takes you out; that attempt is lost, the strange tree keeps its others', () => {
  const [x, y] = findDais(), s = fresh(RITE), g = at(s, x, y), o = g.map.objects.find((q) => q.kind === 'saplingDais');
  g.player.x = o.x; g.player.y = o.y + 1; g.lastUpdateNow = 1000; assert.ok(g.interact('begin', o.id).ok); g.riteTick(.05, 1000 + ASCENDANCY.grace * 1000 + 10);
  assert.equal(g.transitionSection(1, 0), false, 'the fire bars the edge');
  const before = carried(s); assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'rite');
  assert.equal(g.rite, null); assert.equal(s.ascendancy[`${x},${y}`].tries, 1, 'one attempt spent'); assert.equal(s.ascendancy[`${x},${y}`].done, false);
  assert.match(g.message, /rite is broken/i); assert.ok(!g.enemies.some((e) => e.riteFoe && !e.dead), 'its creatures did not follow');
  const back = at(s, x, y), tree = back.map.objects.find((q) => q.kind === 'saplingDais'); assert.ok(tree, 'the strange tree still stands'); assert.equal(tree.state, 'open', 'ready for another rite');
});

// ------------------------------------------------------------------------------------------------ a labyrinth
const LAB = 'TIM1';
let lab = null; const findLab = () => { if (lab) return lab; for (let d = LABYRINTHS.minRing; d < 40 && !lab; d++) for (let x = -d; x <= d && !lab; x++) for (const y of [d - Math.abs(x), Math.abs(x) - d]) { if (!labyrinthHere(LAB, x, y, sectionRegion(LAB, x, y, LANDSCAPE_VERSION))) continue; if (at(fresh(LAB), x, y).map.objects.some((o) => o.labyrinthDoor)) { lab = { x, y }; break; } } return lab; };
test('a labyrinth: out of a chamber deep inside, at its front door; the chambers found and keys taken are kept', () => {
  const { x, y } = findLab(), s = fresh(LAB), g = at(s, x, y), door = g.map.objects.find((o) => o.labyrinthDoor);
  g.player.x = door.x; g.player.y = door.y; assert.ok(g.interact('enter', door.id).ok, g.message);
  const base = g.map.building.base, P = labyrinthPlan(base);
  for (let hop = 0; hop < 3; hop++) { const pass = g.map.objects.find((q) => String(q.id).startsWith('lab-pass-') && !q.lock && !q.barred && P.nodes[Number(String(q.id).slice(9))]?.parent === g.map.building.node); if (!pass) break; g.player.x = pass.x; g.player.y = pass.y; if (!g.interact(pass.actions[0], pass.id).ok) break; }
  assert.notEqual(g.map.building.node, 0, 'deep inside, past the first chamber'); assert.equal(g.area, 'dungeon');
  const H = s.consequences.dungeons[`${base}:f1`]; H.labKeys = ['test-key']; const seen = [...(H.labSeen || [])];
  const before = carried(s); assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'labyrinth');
  assert.deepEqual([g.rx, g.ry], [x, y], 'at the labyrinth'); assert.ok(Math.hypot(g.player.x - door.x, g.player.y - door.y) < 3, 'by its door');
  assert.deepEqual(H.labKeys, ['test-key']); assert.deepEqual(H.labSeen || [], seen);
});

// ------------------------------------------------------------------------------------------------ the Pentagon and the Stillworks
let pent = null; const findPent = () => { if (pent) return pent; const g = new Game(fresh(LAB), 0); for (let cx = -64; cx <= 64 && !pent; cx += PENTAGON.every) for (let cy = -64; cy <= 64 && !pent; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) pent = { cx, cy }; return pent; };
test('the Pentagon: out of the vault, out of the Stillworks mid-fight (its beast whole and asleep again, the finale still to win)', () => {
  const { cx, cy } = findPent(), P = pentagonPlan(LAB, cx, cy, PENTAGON.version), s = fresh(LAB), g = new Game(s, 0);
  const vault = () => { s.session.activeDungeonId = pentagonVaultId(P); s.session.dungeonReturn = { rx: P.cx, ry: P.cy, x: 16, y: 16 }; g.loadArea('dungeon', false); };
  vault(); let before = carried(s); assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'vault');
  vault(); const regent = g.enemies.find((q) => String(q.id).endsWith(':guardian')); regent.hp = 0; regent.dead = true; g.defeatEnemy(regent);
  const wall = g.map.objects.find((o) => o.kind === 'pentFinaleWall'); g.player.x = wall.inner.x; g.player.y = wall.inner.y; assert.ok(g.interact('use', wall.id).ok, g.message);
  assert.equal(g.areaId(), pentagonArenaId(P.base)); const beast = g.enemies.find((e) => e.pentFinaleBeast && !e.dead); assert.ok(beast, 'the finale beast');
  beast.hp = Math.round(beast.maxHp / 2); beast.pentArenaAwake = true; beast.aggro = true;
  before = carried(s); assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'Stillworks'); assert.match(g.message, /fight you left behind/);
  const H = s.consequences.dungeons[`${P.base}:f1`]; assert.ok(!H.pentArenaWon, 'the finale is still to win');
  s.session.activeDungeonId = pentagonArenaId(P.base); s.session.dungeonReturn = { rx: P.cx, ry: P.cy, x: 16, y: 16 }; g.loadArea('dungeon', false);
  const again = g.enemies.find((e) => e.pentFinaleBeast && !e.dead); assert.equal(again.hp, again.maxHp, 'whole again'); assert.ok(!again.pentArenaAwake, 'asleep at the heart');
  // and from the walkway among the stars beyond it, once the beast has fallen
  again.hp = 0; again.dead = true; g.defeatEnemy(again); assert.ok(H.pentArenaWon);
  const seam = g.map.objects.find((q) => q.kind === 'pentArenaGate' && q.to === 'walk'); g.player.x = seam.inner.x; g.player.y = seam.inner.y; assert.ok(g.interact('use', seam.id).ok, g.message); assert.ok(g.map.pentFinale, 'on the walkway');
  before = carried(s); assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'walkway'); assert.ok(H.pentArenaWon, 'the win is kept');
});

// ------------------------------------------------------------------------------------------------ the Deep (its own Return Embers)
test('the Deep: a sigil takes you up as an ember would, and leaves the embers alone', () => {
  const SEED = 'DEEP677'; let found = null;
  for (let rx = 6; rx < 90 && !found; rx++) for (let ry = -30; ry < 30 && !found; ry++) if (shaftHere(SEED, rx, ry)) { const g = at(fresh(SEED), rx, ry), o = g.map.objects.find((q) => q.kind === 'deepShaft'); if (o) found = { rx, ry }; }
  const s = fresh(SEED), g = at(s, found.rx, found.ry), o = g.map.objects.find((q) => q.kind === 'deepShaft'); g.player.x = o.x; g.player.y = o.y + 1;
  assert.ok(g.interact(o.actions[0], o.id).ok, g.message); assert.equal(g.area, 'dungeon'); const embers = ensureTheDeep(s).theDeep.embers;
  const before = carried(s); assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'the Deep');
  assert.deepEqual([g.rx, g.ry], [found.rx, found.ry]); assert.equal(s.theDeep.embers, embers, 'no ember burned');
});

// ------------------------------------------------------------------------------------------------ the Listener's Hall
test('the Listener\'s Hall, mid-fight: out at the Mouth; the Listener is whole when you come back', () => {
  const s = fresh('HALL'); s.relayNetwork = { version: 1, nodes: {}, fragments: 0, coordinate: relayCoordinate(s) }; s.narrative.facts['relay.networkAnswered'] = true; ensureFarArray(s); Object.assign(s.farArray, { listeners: 1, gate: 2, pieces: piecesNeeded(2), quiet: false });
  const c = s.relayNetwork.coordinate, g = new Game(s, 0); g.rx = c.rx; g.ry = c.ry; g.loadArea('overworld');
  const dais = g.map.objects.find((o) => o.kind === 'listenerDais'); g.player.x = dais.x; g.player.y = dais.y; assert.ok(g.interact('enter', dais.id).ok, g.message); assert.ok(isArenaRun(g.areaId()));
  const id = g.areaId(), L = g.enemies.find((e) => e.kind === 'listener'); L.hp = Math.round(L.maxHp * .4); L.aggro = true; const ret = { ...s.session.dungeonReturn };
  const before = carried(s); assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'Listener'); assert.deepEqual([g.rx, g.ry], [c.rx, c.ry]);
  s.session.activeDungeonId = id; s.session.dungeonReturn = ret; g.loadArea('dungeon', false); const again = g.enemies.find((e) => e.id === L.id); assert.equal(again.hp, again.maxHp);
});

// ------------------------------------------------------------------------------------------------ under the sea
test('a dive: up at the buoy with fresh breath, as the line would bring you', () => {
  let found = null; for (let r = 2; r <= 30 && !found; r++) for (let y = -r; y <= r && !found; y++) for (let x = -r; x <= r && !found; x++) { if (Math.max(Math.abs(x), Math.abs(y)) !== r) continue; const g = at(fresh('LANDTEST'), x, y), site = g.map.objects.find((o) => o.kind === 'diveSite'); if (site) found = { rx: x, ry: y, site }; }
  const s = fresh('LANDTEST'), g = at(s, found.rx, found.ry), back = { rx: found.rx, ry: found.ry, x: found.site.x, y: found.site.y - .2 };
  s.session.dungeonReturn = back; s.session.activeDungeonId = `dive:${s.seed}:${found.rx}:${found.ry}`; g.loadArea('dungeon'); assert.ok(g.map.underwater, 'under the sea'); s.session.breath = 2;
  assert.ok(g.useCrossingSigil(null), g.message); assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry, g.player.x, g.player.y], [back.rx, back.ry, back.x, back.y], 'at the buoy');
  assert.equal(s.session.breath, DIVE.breath); assert.match(g.message, /dive buoy/);
});

// ------------------------------------------------------------------------------------------------ the Skylands
test('the Skylands: out of the divine challenge, back down at its stair', () => {
  const SEED = 'VISCERA'; let st = null;
  for (let r = 6; r < 60 && !st; r++) for (let x = -r; x <= r && !st; x++) { const y = r - Math.abs(x); if (!skylandSection(SEED, x, y, 2)) continue; const o = at(fresh(SEED), x, y).map.objects.find((q) => q.kind === 'skyStair'); if (o && !o.skyAnnex) st = { x, y }; }
  const s = fresh(SEED); s.worldBeasts = { tremorWorm: { slain: 1 }, morphingBlob: { slain: 1 }, mountainTurtle: { slain: 1 }, lightningGiant: { slain: 1 } };
  const g = at(s, st.x, st.y), o = g.map.objects.find((q) => q.kind === 'skyStair'); g.player.x = o.x; g.player.y = o.y; if (o.disc) g.skyLevel = o.elev;
  assert.ok(g.interact('ascend:0', o.id).ok, g.message); assert.equal(g.area, 'dungeon'); assert.ok(g.map.skyland, 'among the islands');
  const before = carried(s); assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'Skylands'); assert.deepEqual([g.rx, g.ry], [st.x, st.y]); assert.ok(!g.skyAir, 'not falling');
});

// ------------------------------------------------------------------------------------------------ a Mislaid Threshold
test('a Mislaid Threshold with its guardian alive: the sigil aborts the crossing back to where it took you', () => {
  const s = fresh('SIGIL-THRESH'), g = at(s, 2, 1); g.player.x = 16; g.player.y = 16; g.startDisplacement({ id: 'test-threshold' }, false);
  assert.equal(g.area, 'dungeon'); assert.ok(s.session.activeDisplacement, 'inside the threshold');
  const before = carried(s); assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'threshold');
  assert.deepEqual([g.rx, g.ry], [2, 1], 'back at the source'); assert.equal(s.session.activeDisplacement, null); assert.equal(s.session.displacementJourney, null);
});

// ------------------------------------------------------------------------------------------------ a way back that is no longer safe
test('a way back that is now a wall or deep water: the sigil sets you on the nearest ground that leads somewhere', () => {
  const s = fresh('SIGIL-SAFE'), g = new Game(s, 0), gate = g.map.objects.find((o) => o.kind === 'dungeon');
  Object.assign(g.player, { x: gate.x, y: gate.y }); g.interact('enter', gate.id);
  const probe = at(fresh('SIGIL-SAFE'), s.session.dungeonReturn.rx, s.session.dungeonReturn.ry), w = mapWidth(probe.map, 'overworld');
  const bad = probe.map.tiles.find((t) => t.blocked && t.x > 2 && t.y > 2 && t.x < 29 && t.y < 29); assert.ok(bad, 'a wall to aim at');
  s.session.dungeonReturn = { ...s.session.dungeonReturn, x: bad.x, y: bad.y };
  const before = carried(s); assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'walled');
  assert.ok(footprintOpen(g.map, w, g.player.x, g.player.y));
});

// ------------------------------------------------------------------------------------------------ afloat
test('aboard the skiff: the sigil carries you ashore at the Wayglass and the crew rows the skiff home (one skiff, kept)', () => {
  const s = fresh('SIGIL-BOAT'); s.currency = 999; s.materials.cinderIron = 9; grantTidemantle(s, 'test'); assert.ok(buySkiff(s, { rx: 0, ry: 0, x: 1, y: 1 }).ok); s.boat.aboard = true; const g = at(s, 3, 3);
  const before = carried(s); assert.ok(g.useCrossingSigil(null), g.message); out(g, s, before, 'aboard');
  g.update(1 / 30, idle, 2000); assert.equal(s.boat.aboard, false, 'ashore'); assert.equal(s.boat.owned, true, 'the skiff is kept');
});

// ------------------------------------------------------------------------------------------------ Gate Revenants
test('a Gate Revenant on your heels does not follow a sigil out: it stays behind in the dungeon', () => {
  const s = fresh('SIGIL-GATE'), g = new Game(s, 0), gate = g.map.objects.find((o) => o.kind === 'dungeon');
  Object.assign(g.player, { x: gate.x, y: gate.y }); g.interact('enter', gate.id); const id = g.areaId();
  const rev = g.createEnemyFromSpawn({ id: 'rev-1', kind: 'gateRevenant', x: g.player.x + 2, y: g.player.y, gatePredator: true }); rev.gatePredator = true; rev.aggro = true; g.enemies.push(rev);
  assert.ok(g.useCrossingSigil(null)); assert.ok(!g.enemies.some((e) => e.gatePredator && !e.dead), 'nothing followed'); assert.doesNotMatch(g.message, /GATE REMAINS OPEN/);
  const kept = s.session.areas[id].enemies.find((e) => e.id === 'rev-1'); assert.ok(kept && !kept.dead && !kept.aggro, 'it waits where you left it');
});

// ------------------------------------------------------------------------------------------------ deterministic, and the lab stays apart
test('the same journey, the same sigil, the same place', () => {
  const run = () => { const s = fresh('SIGIL-DET'), g = new Game(s, 0), gate = g.map.objects.find((o) => o.kind === 'dungeon'); Object.assign(g.player, { x: gate.x, y: gate.y }); g.interact('enter', gate.id); g.useCrossingSigil(null); return [g.rx, g.ry, g.player.x, g.player.y, g.message]; };
  assert.deepEqual(run(), run());
});

test('the Proving Ground: a sigil there acts on its scratch journey only', () => {
  const prod = fresh('PROD'), snapshot = JSON.stringify(prod), writes = []; const store = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null, setItem: (k) => writes.push(k), removeItem: (k) => writes.push(k), clear: () => writes.push('*') };
  try {
    const f = createLabFixture({ lab: 'ordinary-dungeon', now: 0 }); f.save.consumables.crossingSigil = 1; assert.equal(f.game.area, 'dungeon');
    assert.ok(f.game.useCrossingSigil(null), f.game.message); assert.equal(f.game.area, 'overworld'); assert.equal(f.save.consumables.crossingSigil, 0);
    assert.notEqual(f.save, prod); assert.equal(JSON.stringify(prod), snapshot, 'no production journey touched'); assert.deepEqual(writes, [], 'nothing written to storage');
  } finally { if (store === undefined) delete globalThis.localStorage; else globalThis.localStorage = store; }
});

test('the Pack and the Atlas offer it anywhere', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /const use = uiButton\("Use", \(\) => \{ panel\.close\(\); openSigilAtlas\(\); \}\);/);
  assert.match(main, /use\.disabled = !\(save\.consumables\.crossingSigil > 0\);/);
  assert.match(main, /const travelled=game\.area === "dungeon" \|\| sigilAtlas/);
  assert.match(main, /function openMap\(\) \{\n  atlasOpenedAt = performance\.now\(\); sigilAtlas = false;/);
});
