// The Rite of Ascendancy is a lockdown (Tim, 2026-11-06: "you should also be blocked from going into anything other than the
// Rite. Once you start the Rite you can't do anything other than the Rite until you die or use a crossing sigil"). Every way off
// the rite's ground is refused with a short message from RITE_LOCKDOWN: doors (crossings, buildings, castles, Pentagons, the
// Deep, hunts, arenas, portals), sky gates, the Far Gates' Mouths and the Listener's Dais, folds, dives, the section's edges
// (on foot, swimming or aboard) and the Wayglass (release 777). Death and the Crossing Sigil stay the ways out; finishing is
// always reachable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';
import { ASCENDANCY, RITE_LOCKDOWN, riteExit, saplingHere } from '../src/ascendancy.ts';
import { validActions } from '../src/interactions.ts';

const SEED = 'RITE1', SIZE = 32;
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
const push = (x, y) => ({ state: { x, y }, consume: () => false, held: () => false, reset() {} });
const fresh = () => { const s = freshSave(); s.seed = SEED; s.consumables.crossingSigil = 2; s.checkpoints['3,-2'] = { rx: 3, ry: -2, x: 16, y: 16, name: 'Far Glass' }; return s; };
const load = (g, rx, ry) => { g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
let spot = null;
const findDais = () => { if (spot) return spot; for (let x = 4; x < 80 && !spot; x++) for (let y = -30; y < 30 && !spot; y++) if (saplingHere(SEED, x, y) && load(new Game(fresh(), 0), x, y).map.objects.some((o) => o.kind === 'saplingDais')) spot = [x, y]; return spot; };
const T0 = 1000 + ASCENDANCY.grace * 1000 + 10;
function burning(s = fresh()) {
  const [x, y] = findDais(), g = load(new Game(s, 0), x, y), o = g.map.objects.find((q) => q.kind === 'saplingDais');
  g.player.x = o.x; g.player.y = o.y + 1; g.lastUpdateNow = 1000; assert.ok(g.interact('begin', o.id).ok, g.message); g.riteTick(.05, T0);
  assert.ok(g.rite); g.player.invulnerableUntil = 1e12; return { s, g, x, y, dais: o };
}
const where = (g) => [g.area, g.rx, g.ry];
function still(g, s, x, y, label, before) {
  assert.deepEqual(where(g), ['overworld', x, y], `${label}: still on the rite's ground`);
  assert.ok(g.rite, `${label}: the rite still burns`);
  assert.equal(s.ascendancy[`${x},${y}`].tries, 1, `${label}: no attempt spent`);
  assert.equal(s.consumables.crossingSigil, 2, `${label}: no sigil spent`);
  if (before) { assert.equal(s.session.activeDungeonId ?? null, before.id, `${label}: no dungeon entered`); assert.deepEqual(s.session.dungeonReturn ?? null, before.ret, `${label}: no way back written`); }
}
const sessionNow = (s) => ({ id: s.session.activeDungeonId ?? null, ret: structuredClone(s.session.dungeonReturn ?? null) });
function roundTrip(g, now = 5000) {
  const { main, puts } = splitSnapshot(snapshotSave(g.exportSnapshot(now)));
  const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts))));
  assert.equal(v.health, 'healthy', v.error); return v.save;
}
// Every kind of way off the ground, as it stands in the world (great buildings, castles, compounds and Pentagons are all
// "dungeon" doors; the canopy door is in a great tree; the Mouths and the Listener's Dais are the Far Gates').
const EXITS = [
  ['a crossing', { kind: 'dungeon', name: 'Crossing', actions: ['enter', 'bypass'] }, 'enter', 'door'],
  ['a great building door', { kind: 'dungeon', buildingDoor: true, name: 'Hall', actions: ['enter'] }, 'enter', 'door'],
  ['a roof hatch', { kind: 'dungeon', buildingDoor: true, roofHatch: true, enterAt: 'roof', name: 'Roof hatch', actions: ['enter'] }, null, 'door'],
  ['a castle gate', { kind: 'dungeon', buildingDoor: true, castle: true, name: 'Keep gate', actions: ['enter'] }, 'enter', 'door'],
  ['a Pentagon door', { kind: 'dungeon', buildingDoor: true, pentagonDoor: true, pentBase: 'x', name: 'Pentagon door', actions: ['enter'] }, 'enter', 'door'],
  ['a Pentagon sigil door', { kind: 'dungeon', buildingDoor: true, pentagonDoor: true, sigil: true, sigilKey: 'n', pentBase: 'x', name: 'Sigil door', actions: ['enter'] }, 'enter', 'door'],
  ['a canyon crater', { kind: 'dungeon', dungeonType: 'canyon', name: 'Crater', actions: ['enter', 'bypass'] }, 'enter', 'door'],
  ['a Deep Shaft', { kind: 'deepShaft', name: 'Deep Shaft', actions: ['descend:1'] }, 'descend:1', 'door'],
  ['an arena', { kind: 'arenaEntrance', name: 'Arena', arenaId: 'arena:x', actions: ['enter'] }, 'enter', 'door'],
  ['a hunt aperture', { kind: 'huntInstance', huntId: 'h', name: 'Held Aperture', actions: ['enter'] }, 'enter', 'door'],
  ['the Cantor Threshold', { kind: 'elitePortal', name: 'Cantor Threshold', actions: ['inspect', 'enter'] }, 'enter', 'door'],
  ['a sky stair', { kind: 'skyStair', name: 'Sky Stair', actions: ['ascend:0'] }, 'ascend:0', 'sky'],
  ['a cloud door in a great tree', { kind: 'canopyGate', dest: 'cloud', name: 'Cloud door', actions: ['enter'] }, 'enter', 'sky'],
  ['a starfield door in a great tree', { kind: 'canopyGate', dest: 'starfield', name: 'Star door', actions: ['enter'] }, 'enter', 'sky'],
  ['the Array Mouth', { kind: 'arrayMouth', name: 'Array Mouth', actions: ['enter'] }, 'enter', 'farGate'],
  ['a quiet Mouth', { kind: 'silentMouth', name: 'Quiet Mouth', actions: ['enter'] }, 'enter', 'farGate'],
  ["the Listener's Dais", { kind: 'listenerDais', name: "Listener's Dais", actions: ['enter'] }, 'enter', 'farGate'],
  ['a Folded Seam', { kind: 'displacementDevice', name: 'Folded Seam', actions: ['enter'] }, 'enter', 'fold'],
  ["a Watcher's tomb", { kind: 'watcherTomb', name: "Watcher's tomb", actions: ['touch'] }, 'touch', 'fold'],
  ['a dive buoy', { kind: 'diveSite', name: 'Dive buoy', actions: ['dive'] }, 'dive', 'dive'],
  ['a deep current', { kind: 'diveOnward', name: 'Deep current', actions: ['follow'] }, 'follow', 'dive'],
];
function plant(g, proto, i) { const p = g.player, o = { id: `lock-${i}`, state: 'open', x: Math.round(p.x) + 1, y: Math.round(p.y), ...structuredClone(proto) }; g.map.objects.push(o); return o; }
function everyExitRefused(g, s, x, y, label) {
  EXITS.forEach(([name, proto, action, say], i) => {
    const o = plant(g, proto, i), before = sessionNow(s), msg = RITE_LOCKDOWN.messages[say];
    const offered = validActions(o, s), leaves = (a) => a === action || !!riteExit(o, a ?? offered[0]);
    for (const a of [action, null, ...offered].filter((v, k, l) => l.indexOf(v) === k && leaves(v))) {
      const r = g.interact(a, o.id);
      assert.equal(r.ok, false, `${label} · ${name} (${a}): refused`); assert.equal(g.message, msg, `${label} · ${name} (${a}): the table's message`); assert.ok(r.riteSealed);
      still(g, s, x, y, `${label} · ${name} (${a})`, before);
    }
    g.map.objects = g.map.objects.filter((q) => q !== o);
  });
}

test('the data: every exit has a short message that names the Crossing Sigil; riteExit reads the table', () => {
  for (const [k, m] of Object.entries(RITE_LOCKDOWN.messages)) { assert.equal(typeof m, 'string', k); assert.ok(m.length < 140, `${k} is short`); assert.match(m, /Crossing Sigil/, k); }
  for (const [kind, v] of Object.entries(RITE_LOCKDOWN.kinds)) assert.ok(RITE_LOCKDOWN.messages[v.say], `${kind} says ${v.say}`);
  for (const [verb, say] of Object.entries(RITE_LOCKDOWN.actions)) assert.ok(RITE_LOCKDOWN.messages[say], `${verb} says ${say}`);
  assert.equal(riteExit({ kind: 'dungeon' }, 'enter'), RITE_LOCKDOWN.messages.door);
  assert.equal(riteExit({ kind: 'dungeon' }, 'bypass'), null, 'leaving a crossing unexplored stays');
  assert.equal(riteExit({ kind: 'elitePortal' }, 'inspect'), null);
  assert.equal(riteExit({ kind: 'skyStair' }, 'ascend:3'), RITE_LOCKDOWN.messages.sky);
  assert.equal(riteExit({ kind: 'mystery' }, 'ascend:3'), RITE_LOCKDOWN.messages.sky, 'any object asked to ascend');
  assert.equal(riteExit({ kind: 'arrayMouth' }, undefined), RITE_LOCKDOWN.messages.farGate);
  for (const [kind, a] of [['checkpoint', 'activate'], ['tree', 'climb'], ['tree', 'cut'], ['skiff', 'board'], ['shrine', 'attune'], ['chest', 'open'], ['saplingDais', 'begin'], ['npc', 'speak'], ['constructor', 'enter'], ['toString', 'x']]) assert.equal(riteExit({ kind }, a), kind === 'constructor' ? RITE_LOCKDOWN.messages.door : null, `${kind} ${a}`);
  assert.equal(riteExit(null, 'enter'), null); assert.equal(riteExit('dungeon', 'enter'), null);
});

test('mid-rite, every door, gate, Mouth, fold and dive is refused with its message; nothing is spent and nobody moves', () => {
  const { s, g, x, y } = burning(); everyExitRefused(g, s, x, y, 'mid-rite');
  // leaving a crossing unexplored is not a way out: it stays allowed
  const c = plant(g, { kind: 'dungeon', name: 'Crossing', actions: ['enter', 'bypass'] }, 99); const r = g.interact('bypass', c.id);
  assert.notEqual(r.riteSealed, true); still(g, s, x, y, 'bypass');
});

test('every object on the rite\'s own ground, with every action it offers, leaves the Wayfarer on that ground', () => {
  const { s, g, x, y } = burning(); let tried = 0;
  for (const o of [...g.map.objects]) {
    if (!g.map.objects.includes(o) || o.kind === 'saplingDais') continue;
    for (const a of validActions(o, s)) { g.player.x = o.x; g.player.y = o.y + 1; g.interact(a, o.id); tried++; assert.deepEqual(where(g), ['overworld', x, y], `${o.kind} ${a}`); assert.ok(g.rite, `${o.kind} ${a}: still burning`); }
  }
  assert.ok(tried >= 1, `${tried} actions tried`);
});

test('the edges: walking, swimming or sailing into any stretch of any edge never leaves; the fire sets you back onto ground that holds', () => {
  const { s, g, x, y } = burning(), w = SIZE, open = (px, py) => { const t = g.map.tiles[Math.floor(py + .72) * w + Math.floor(px + .5)]; return t && !t.blocked; };
  let held = 0;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) for (let k = 1; k < SIZE - 1; k++) {
    const px = dx < 0 ? .1 : dx > 0 ? SIZE - .8 : k, py = dy < 0 ? .1 : dy > 0 ? SIZE - .95 : k; if (!open(px, py)) continue;
    g.player.x = px; g.player.y = py; assert.equal(g.transitionSection(dx, dy), false); held++;
    assert.deepEqual(where(g), ['overworld', x, y]); assert.equal(g.message, ASCENDANCY.messages.noLeave);
    assert.ok(g.player.x >= 0 && g.player.y >= 0 && g.player.x <= SIZE - .78 && g.player.y <= SIZE - .9, `inside (${g.player.x}, ${g.player.y})`);
    const moved = g.player.x !== px || g.player.y !== py; if (moved) assert.ok(open(g.player.x, g.player.y), `set back onto open ground at ${g.player.x}, ${g.player.y}`);
  }
  assert.ok(held > 8, `${held} edge stretches tried`);
  // carried past the edge (a glide, an old save): brought back inside
  g.player.x = -2; g.player.y = 16; g.transitionSection(-1, 0); assert.ok(g.player.x >= 0, 'back inside'); assert.deepEqual(where(g), ['overworld', x, y]);
  // walking through the frames at an exit opening
  for (const [dx, dy, key] of [[-1, 0, 'west'], [1, 0, 'east'], [0, -1, 'north'], [0, 1, 'south']]) {
    const e = g.map.exits[key]; g.player.x = dx < 0 ? .4 : dx > 0 ? SIZE - 1.2 : e; g.player.y = dy < 0 ? .4 : dy > 0 ? SIZE - 1.3 : e;
    for (let i = 0; i < 30; i++) g.update(1 / 30, push(dx, dy), T0 + 100 + i * 33);
    assert.deepEqual(where(g), ['overworld', x, y], `walking ${key}`); assert.ok(g.rite || g.player.hp <= 0, `walking ${key}: still burning`);
  }
  // swimming: stays where it was (never pushed onto other water or ground)
  g.swimming = true; g.player.x = .2; g.player.y = 16; g.transitionSection(-1, 0); assert.deepEqual([g.player.x, g.player.y], [.2, 16]); g.swimming = false;
  // aboard: still aboard, still here
  s.boat.owned = true; s.boat.aboard = true; s.boat.hull = 10; g.player.x = .2; g.player.y = 16; g.transitionSection(-1, 0);
  assert.equal(s.boat.aboard, true, 'still aboard'); assert.deepEqual(where(g), ['overworld', x, y]); s.boat.aboard = false;
  still(g, s, x, y, 'the edges');
});

test('no teleport leaves: Rift Step, Stuck?, every supply, the Wayglass and a hidden Folded Seam keep the Wayfarer on the rite\'s ground', () => {
  const { s, g, x, y } = burning();
  s.magicSkills.learned = { ...(s.magicSkills.learned || {}), 'rift-step': 3 }; s.magicSkills.selected = 'rift-step';
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { g.player.x = 16; g.player.y = 16; g.player.lastMoveVector = { x: dx, y: dy }; s.magicSkills.riftCharges = 2; g.activateApertureSkill('rift-step'); assert.deepEqual(where(g), ['overworld', x, y], `Rift Step ${dx},${dy}`); }
  g.player.x = 2; g.player.y = 2; assert.ok(g.unstick(1e9)); assert.deepEqual(where(g), ['overworld', x, y], 'Stuck?'); assert.ok(g.rite, 'Stuck? keeps the rite');
  for (const k of Object.keys(s.consumables)) if (k !== 'crossingSigil') { s.consumables[k] = Math.max(1, s.consumables[k] || 0); g.player.hp = 1; g.useConsumable(k, T0 + 50); assert.deepEqual(where(g), ['overworld', x, y], `supply ${k}`); }
  for (const call of [() => g.travelToCheckpoint(null), () => g.travelToCheckpoint('3,-2'), () => g.returnHome()]) { assert.equal(call(), false); assert.equal(g.message, ASCENDANCY.messages.sealed); }
  // a hidden Folded Seam under a shelter: armed, and the Wayfarer standing on it, but it stays shut
  const w = SIZE, tx = 16, ty = 16; for (let yy = ty - 1; yy <= ty + 1; yy++) for (let xx = tx - 1; xx <= tx + 1; xx++) { const t = g.map.tiles[yy * w + xx]; Object.assign(t, { blocked: false, buildingId: 'test-shack', kind: t.kind === 'water' ? 'ash' : t.kind }); delete t.hazard; }
  const trap = { id: 'test-seam', kind: 'displacementTrap', shelterId: 'test-shack', x: tx, y: ty, state: 'armed', actions: [] }; g.map.objects.push(trap);
  for (let i = 0; i < 10; i++) { g.player.x = tx; g.player.y = ty - .2; g.update(1 / 30, idle, T0 + 200 + i * 33); }
  assert.deepEqual(where(g), ['overworld', x, y], 'the seam stayed shut'); assert.notEqual(trap.state, 'used'); assert.ok(!s.worldFlags[`displacement-trigger:${x},${y}:test-seam`], 'and stays armed for later');
  still(g, s, x, y, 'teleports');
  // the control: with no rite burning, the same seam does carry the Wayfarer off
  g.riteEnd(); for (let i = 0; i < 3 && g.area === 'overworld'; i++) { g.player.x = tx; g.player.y = ty - .2; g.update(1 / 30, idle, T0 + 600 + i * 33); }
  assert.equal(g.area, 'dungeon', 'the seam works when no rite burns');
});

test('the ways out: a sigil spends the attempt and leaves; with no sigil, finishing and dying are still within reach', () => {
  { const { s, g, x, y } = burning(); assert.ok(g.useCrossingSigil(), g.message); assert.equal(g.rite, null); assert.equal(s.consumables.crossingSigil, 1); assert.equal(s.ascendancy[`${x},${y}`].tries, 1); assert.equal(s.ascendancy[`${x},${y}`].done, false); assert.deepEqual([g.rx, g.ry], [s.activeCheckpoint.rx, s.activeCheckpoint.ry]); }
  { const s0 = fresh(); s0.consumables.crossingSigil = 0; const { g, x, y } = burning(s0);
    assert.equal(g.useCrossingSigil(), false, 'no sigil to burn'); assert.ok(g.rite, 'still burning');
    const plant1 = plant(g, EXITS[0][1], 0); assert.equal(g.interact('enter', plant1.id).ok, false);
    // the timer runs on whatever is refused: finishing is always reachable
    for (let t = T0; t < g.rite.until; t += 20000) { for (const e of g.enemies) if (e.riteFoe) { e.dead = true; e.hp = 0; } g.riteTick(.05, t); assert.deepEqual(where(g), ['overworld', x, y]); }
    g.riteTick(.05, g.rite.until + 1); assert.equal(g.rite, null); assert.equal(s0.ascendancy[`${x},${y}`].done, true, 'finished');
    assert.notEqual(g.interact('enter', plant1.id).riteSealed, true, 'the doors open again'); }
  { const s1 = fresh(); s1.consumables.crossingSigil = 0; const { g, x, y } = burning(s1); g.player.invulnerableUntil = 0; g.player.hp = 0; g.update(.05, idle, T0 + 6000);
    assert.equal(g.rite, null, 'a death breaks it'); assert.equal(s1.ascendancy[`${x},${y}`].tries, 1);
    for (let i = 0; i < 400 && (g.player.hp <= 0 || g.fallen); i++) g.update(1 / 30, idle, T0 + 6100 + i * 33);
    assert.ok(g.player.hp > 0, 'recovered'); assert.ok(g.travelToCheckpoint('3,-2'), 'and free to go'); }
});

test('save and reload mid-rite: the rite resumes on its ground, every exit is still refused, and once done the doors open', () => {
  const { g, x, y } = burning(), s2 = structuredClone(roundTrip(g)), back = new Game(s2, 9000);
  assert.deepEqual(where(back), ['overworld', x, y]); assert.ok(back.rite, 'the rite resumed'); back.player.invulnerableUntil = 1e12;
  everyExitRefused(back, s2, x, y, 'after reload');
  back.player.x = .1; back.player.y = back.map.exits.west; assert.equal(back.transitionSection(-1, 0), false); assert.deepEqual(where(back), ['overworld', x, y], 'the edge, after reload');
  // a second round trip, still mid-rite
  const s3 = structuredClone(roundTrip(back, 9500)), again = new Game(s3, 12000); assert.ok(again.rite); everyExitRefused(again, s3, x, y, 'after a second reload');
  again.riteTick(.05, again.rite.until + 1); assert.equal(again.rite, null); assert.equal(s3.ascendancy[`${x},${y}`].done, true);
  assert.ok(again.travelToCheckpoint('3,-2'), 'done: travel free'); assert.deepEqual([again.rx, again.ry], [3, -2]);
});
