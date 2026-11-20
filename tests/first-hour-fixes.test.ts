// First-hour fixes (2026-11-19, before a public launch): the Cairn Keeper's errand completes in the first crossing the
// Wayfarer enters (the Refuge's own included) and its link can always be walked to; the Refuge's dormant world-boss cue, its
// quest and its waymark stay hidden until something can wake it; a death inside a crossing keeps the crossing's section;
// exact resume keeps a crossing's extra foes, an Aperture intrusion and the Stalker; plain action messages; Reduce Motion
// follows the system setting only where no choice is stored.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, mapWidth, footprintOpen, footprintHazard, pinDungeonLayout, generatePinnedDungeon } from '../src/game.ts';
import { canStep } from '../src/landscape.ts';
import { serializeSave, deserializeSave } from '../src/save-codec.ts';
import { addSurveyorLink, starterCrossing, surveyorReach, ensureSurveyor, SURVEYOR, surveyorCrossing } from '../src/surveyor.ts';
import { hashSeed } from '../src/random.ts';
import { wayfindingTargets, sectionSites, apertureEncounterSpawns, APERTURE_THRESHOLDS, worldBossCueLive } from '../src/world.ts';
import { dungeonHistory, ACTION_DONE, actionDone } from '../src/interactions.ts';
import { ensureStalker } from '../src/stalker.ts';
import { withMotionDefault, systemReducedMotion, normalizeSettings } from '../src/persistence.ts';

const journey = (seed) => { const s = migrateSave(freshSave()); s.seed = seed; return { s, g: new Game(s, 0) }; };
const errand = (seed) => { const j = journey(seed); j.s.arcana = { ...(j.s.arcana || {}), starter: 'set' }; return j; };
// Enters a crossing the way the game does (its door on the land), or loads it by id when no door is given.
function enter(g, rx, ry, door) { g.rx = rx; g.ry = ry; g.loadArea('overworld'); g.player.x = door.x; g.player.y = door.y + .6; const r = g.interact('enter', door.id); g.update(1 / 30, { state: {}, held: () => false, consume: () => false }, 0); return r; }
const doorsAt = (g, rx, ry) => { g.rx = rx; g.ry = ry; g.loadArea('overworld'); return g.map.objects.filter((o) => o.kind === 'dungeon' && (o.actions || []).includes('enter')); };
// The first crossing out from (sx, sy) whose inside passes `ok` (entered, then left again when it does not). Returns its section.
function findCrossing(g, ok = () => true, sx = 1, sy = 0, R = 4) {
  for (let r = 0; r <= R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const rx = sx + dx, ry = sy + dy; if (!rx && !ry) continue;
    for (const door of doorsAt(g, rx, ry)) { if (/hotel/i.test(door.id)) continue; const res = enter(g, rx, ry, door); if (g.area === 'dungeon' && String(g.areaId()).startsWith('dungeon:') && ok(g)) return { rx, ry, door, res }; if (g.area === 'dungeon') g.leaveDungeon(); g.rx = rx; g.ry = ry; g.loadArea('overworld'); } }
  return null;
}
// The floor the Wayfarer can walk to from where they stand, with the game's own footing, hazard and step rules.
function walkable(g) {
  const m = g.map, w = mapWidth(m, g.area), h = Math.floor(m.tiles.length / w), ent = { isPlayer: true, jumping: true }, sx = Math.round(g.player.x), sy = Math.round(g.player.y), seen = new Uint8Array(w * h), q = [sx + sy * w]; seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) { const x = q[i] % w, y = (q[i] / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = nx + ny * w; if (seen[j] || !footprintOpen(m, w, nx, ny) || footprintHazard(m, w, nx, ny) || !canStep(ent, m, w, x, y, nx, ny)) continue; seen[j] = 1; q.push(j); } }
  return (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => seen[Math.round(x) + a + (Math.round(y) + b) * w] === 1);
}

// 1. The errand in the Refuge's own crossing.
test('the Cairn Keeper\'s errand: the Refuge\'s own crossing holds the first link, and taking it finishes the errand', () => {
  assert.ok(starterCrossing('dungeon:CINDER-VERGE-47:g1'), 'the Refuge\'s crossing counts');
  for (const id of ['dungeon:S:g1:2:-1:dungeon-g1-2--1-88', 'dungeon:S:g1:-1:0:deep-v1', 'dungeon:S:g1:1:1:deep-v2:descent', 'dungeon:S:g1:0:1:canopy']) assert.ok(starterCrossing(id), id);
  for (const id of ['dungeon:S:g1:0:1:dungeon-g1-0-1-5:aperture-annex', 'building:S:-2:2:apartment:3:f1', 'tower:S:2:-1:1:8:0', 'beast-hotel:v1:0,0', '']) assert.equal(starterCrossing(id), false, id);
  const { s, g } = errand('CINDER-VERGE-47'), gate = doorsAt(g, 0, 0).find((o) => !/hotel/i.test(o.id)); assert.ok(gate, 'the Refuge has its crossing');
  enter(g, 0, 0, gate); assert.equal(g.areaId(), `dungeon:${s.seed}:g${s.worldGeneration}`);
  const link = g.map.objects.find((o) => o.kind === 'surveyorLink'); assert.ok(link, 'the first link lies in the Refuge\'s crossing');
  assert.ok(walkable(g)(link.x, link.y), 'and can be walked to from the entry');
  Object.assign(g.player, { x: link.x, y: link.y + .6 }); const r = g.interact('take', link.id); assert.ok(r.ok, r.message); assert.equal(r.index, 0);
  assert.deepEqual(ensureSurveyor(s).links, [0]);
});

test('a journey that entered crossings before without the link still finds it in the next crossing it enters', () => {
  const { s, g } = errand('CINDER-VERGE-47'); const id = `dungeon:${s.seed}:g${s.worldGeneration}`;
  const h = dungeonHistory(s, id); h.visits = 3; s.session.areas[id] = { encounterVersion: 0, enemies: [], objects: {}, projectiles: [], effects: [], eliteHazards: [] }; // the Refuge's crossing, entered (and left) on an older build
  const back = migrateSave(deserializeSave(serializeSave(s))), g2 = new Game(back, 0), gate = doorsAt(g2, 0, 0).find((o) => !/hotel/i.test(o.id));
  enter(g2, 0, 0, gate); assert.ok(g2.map.objects.some((o) => o.kind === 'surveyorLink'), 'the next crossing entered holds it');
});

// The rule before 2026-11-19, kept here to show a link already lying where it was reachable has not moved.
function oldSpot(map, save, dungeonId) {
  const w = map.width || 24, entry = map.entry || { x: 4, y: 5 }, taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const open = map.tiles.filter((t) => !t.blocked && !t.environment && !t.structure && t.x > 1 && t.y > 1 && t.x < w - 2 && Math.hypot(t.x - entry.x, t.y - entry.y) >= SURVEYOR.minFromEntry && !taken.has(`${t.x},${t.y}`) && !/water|lava|pit|chasm|void|Gate/i.test(String(t.kind)));
  return open.length ? open[hashSeed(`${save.seed}:surveyor-at:v1:${dungeonId}`) % open.length] : null;
}

// 2. Reachable, in every kind of crossing near the Refuge, deep and many-levelled ones on their entry level.
test('the errand\'s link lies in every crossing it can lead to, where the Wayfarer can walk to it; reachable links already lying stay put', () => {
  const cases = [['ER-3', 1, 1, /deep-v2:descent/], ['ER-15', -1, 2, /dungeon-g1--1-2/], ['ER-14', -1, 0, /deep-v1/], ['ER-6', -1, 0, /deep-v2:threefold/], ['ER-27', 2, -1, /dungeon-g1-2--1/], ['ER-24', -2, 1, /dungeon-g1--2-1/], ['FH-16', -3, 2, /dungeon-g1--3-2/], ['CINDER-VERGE-47', -2, -2, /deep-v2:flooded/]];
  let kept = 0;
  for (const [seed, rx, ry, pick] of cases) {
    const { g } = errand(seed), door = doorsAt(g, rx, ry).find((o) => pick.test(o.dungeonId || o.id) || pick.test(`dungeon-${o.id}`)) || doorsAt(g, rx, ry).find((o) => pick.test(String(o.dungeonId || '')));
    assert.ok(door, `${seed} ${rx},${ry} has the crossing`); enter(g, rx, ry, door); assert.equal(g.area, 'dungeon');
    const link = g.map.objects.find((o) => o.kind === 'surveyorLink'); assert.ok(link, `${g.areaId()}: a link`);
    assert.ok(walkable(g)(link.x, link.y), `${g.areaId()}: reachable from the entry (${link.x},${link.y})`);
    if (g.map.multiLevel) assert.equal(g.map.levelId, g.map.levels[0].id, 'on the entry level');
  }
  // A link laid by the old rule where it could be reached lies exactly where it did (the same floor, the same objects before it).
  for (let i = 0; i < 40; i++) {
    const s = migrateSave(freshSave()); s.seed = `KEEP-${i % 8}`; s.arcana = { starter: 'set' }; const id = `dungeon:${s.seed}:g1:${1 + (i % 3)}:${i % 5}:dungeon-g1-keep-${i}`; pinDungeonLayout(s, id);
    const map = generatePinnedDungeon(s, id); if (map.multiLevel || map.arena) continue; const was = oldSpot(map, s, id); if (!was || !surveyorReach(map).has(was.y * map.width + was.x)) continue;
    const o = addSurveyorLink(map, s, id); assert.ok(o); assert.deepEqual([o.x, o.y], [was.x, was.y], id); kept++;
  }
  assert.ok(kept >= 4, `old reachable spots kept (${kept})`);
});

test('the Surveyor\'s own crossings: the same roll decides which hold a link; only the spot is checked', () => {
  // Pure: a many-levelled crossing's deeper levels hold none; a crossing with no reachable floor holds none.
  const s = migrateSave(freshSave()); s.seed = 'SURV'; s.arcana = { starter: 'set' };
  const floor = (x, y, extra = {}) => ({ x, y, kind: 'floor', blocked: false, ...extra }), tiles = [];
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) tiles.push(x === 0 || y === 0 || x === 11 || y === 11 ? { x, y, kind: 'wall', blocked: true } : x === 6 ? { x, y, kind: 'canyon', blocked: false, environment: 'canyon' } : floor(x, y));
  const map = { width: 12, height: 12, tiles, objects: [], entry: { x: 3, y: 5 } };
  const o = addSurveyorLink(structuredClone(map), s, 'dungeon:SURV:g1:1:1:x'); assert.ok(o); assert.ok(o.x < 6, 'never across the void');
  assert.equal(addSurveyorLink({ ...structuredClone(map), multiLevel: true, levels: [{ id: 'mouth' }, { id: 'lowest' }], levelId: 'lowest' }, s, 'dungeon:SURV:g1:1:1:deep-v2:descent'), null, 'not below the entry level');
  assert.ok(addSurveyorLink({ ...structuredClone(map), multiLevel: true, levels: [{ id: 'mouth' }, { id: 'lowest' }], levelId: 'mouth' }, s, 'dungeon:SURV:g1:1:1:deep-v2:descent'), 'on the entry level');
  const sealed = structuredClone(map); for (const t of sealed.tiles) if (t.x === 4 && t.y > 0 && t.y < 11) Object.assign(t, { kind: 'sealedGate', blocked: true });
  const past = addSurveyorLink(sealed, s, 'dungeon:SURV:g1:1:1:x'); assert.ok(past && past.x < 4, 'short of a sealed gate');
  assert.equal(surveyorCrossing('SURV', 'dungeon:SURV:g1'), false, 'the Refuge\'s crossing holds one only for the errand');
});

// 3. The Refuge's dormant world boss.
test('the Refuge\'s world-boss cue, its quest and its waymark stay hidden until something wakes it; the flags are kept', () => {
  const { s, g } = journey('CINDER-VERGE-47'); g.rx = 0; g.ry = 0; g.loadArea('overworld');
  assert.equal(g.map.objects.some((o) => o.id === 'world-boss'), false, 'no dead "challenge" in the Refuge');
  assert.equal(sectionSites(s.seed, 0, 0, s.worldGeneration, s).some((o) => o.kind === 'bossCue'), false, 'nor on the Atlas');
  for (const [rx, ry] of [[1, 0], [2, 1], [0, -3]]) assert.equal(wayfindingTargets(s.seed, rx, ry, s.worldGeneration, s).some((t) => t.name === 'a great enemy'), false, 'no red mark toward it');
  g.rx = 1; g.ry = 0; g.loadArea('overworld'); assert.equal(s.atlas['1,0'].quietBossVersion, 1, 'ground first seen now is pinned');
  assert.equal(g.map.objects.some((o) => o.kind === 'wayfindingCue' && o.name === 'a great enemy'), false, 'and its marks lead elsewhere');
  const old = structuredClone(s); old.atlas['2,1'] = { terrain: 'ash' }; assert.ok(wayfindingTargets(old.seed, 2, 1, old.worldGeneration, old).some((t) => t.name === 'a great enemy'), 'ground seen before keeps the marks it was generated with');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); assert.match(main, /save\.worldFlags\?\.worldBossAwake&&!save\.worldFlags\?\.worldBossDead\)add\("A great enemy"/, 'the Journal lists it only once it is awake');
  assert.equal(worldBossCueLive(s), false);
  s.worldFlags.worldBossAwake = true; g.rx = 0; g.ry = 0; g.loadArea('overworld'); // a save that had it woken (by a test or a later wake path) still sees it, as before
  assert.ok(g.map.objects.some((o) => o.id === 'world-boss')); assert.ok(wayfindingTargets(s.seed, 2, 2, s.worldGeneration, s).some((t) => t.name === 'a great enemy'));
  const back = migrateSave(deserializeSave(serializeSave(s))); assert.equal(back.worldFlags.worldBossAwake, true, 'save data kept');
});

// 4. A death inside a crossing.
test('a death inside a crossing wakes at its entrance with the crossing\'s section kept (foes scale, the Atlas reads, from there)', () => {
  const { s, g } = journey('DEATH-RX'); g.deathBeat = 0; s.activeCheckpoint = { rx: 0, ry: 0, x: 16, y: 16, name: 'Ember Refuge' };
  const at = findCrossing(g, (q) => !q.map.multiLevel && !String(q.areaId()).includes(':deep-v'), 3, 2); assert.ok(at); const { rx, ry } = at; const id = g.areaId();
  g.player.hp = 0; g.update(1 / 60, { state: {}, held: () => false, consume: () => false, reset() {} }, 1000);
  assert.equal(s.worldFlags.deaths, 1); assert.equal(g.area, 'dungeon'); assert.equal(g.areaId(), id, 'back at the same crossing');
  assert.deepEqual([g.rx, g.ry], [rx, ry], 'the crossing\'s section, not the Refuge\'s'); assert.deepEqual([s.session.rx, s.session.ry], [rx, ry]); assert.deepEqual([s.position.rx, s.position.ry], [rx, ry]);
  const back = new Game(migrateSave(deserializeSave(serializeSave(s))), 0); assert.deepEqual([back.rx, back.ry], [rx, ry], 'and after a reload');
});

// 5. Exact resume.
const reload = (g, s, now = 5000) => { g.exportSnapshot(now); const back = migrateSave(deserializeSave(serializeSave(structuredClone(s)))); return { s: back, g: new Game(back, now) }; };
const liveIds = (g) => (g.enemies || []).filter((e) => !e.dead && e.hp > 0).map((e) => e.id).sort();

test('exact resume: a crossing\'s extra foes stand where they stood after its combat is clear', () => {
  const { s, g } = journey('RESUME-X'); assert.ok(findCrossing(g, (q) => q.enemies.some((e) => /:extra:\d+$/.test(e.id) && !e.dead) && !q.map.multiLevel)); 
  const extras = g.enemies.filter((e) => /:extra:\d+$/.test(e.id) && !e.dead); assert.ok(extras.length, 'the crossing has extra foes');
  for (const e of g.enemies) if (!/:extra:\d+$/.test(e.id)) { e.dead = true; e.hp = 0; } // everything else falls; the combat-clear record is written
  dungeonHistory(s, g.areaId()).combatClear = { ...(dungeonHistory(s, g.areaId()).combatClear || {}), completed: true };
  extras[0].hp = Math.max(1, extras[0].hp - 5); extras[0].x += .4;
  const r = reload(g, s); assert.deepEqual(liveIds(r.g), liveIds(g), 'the same live foes');
  const e = r.g.enemies.find((q) => q.id === extras[0].id); assert.equal(e.hp, extras[0].hp); assert.ok(Math.abs(e.x - extras[0].x) < 1e-9, 'wounds and place kept');
});

test('exact resume: an Aperture intrusion is the one saved, even when the Aperture has grown a tier since', () => {
  let found = null;
  for (let i = 0; i < 400 && !found; i++) { const rx = (i % 20) - 10, ry = Math.floor(i / 20) - 10, id = `overworld:${rx}:${ry}:g1`, tiles = []; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) tiles.push({ x, y, kind: 'grass', blocked: false });
    const a = apertureEncounterSpawns('RESUME-A', id, APERTURE_THRESHOLDS[0], tiles), b = apertureEncounterSpawns('RESUME-A', id, APERTURE_THRESHOLDS[1], tiles); if (a.length && !b.length && (rx || ry)) found = { rx, ry }; }
  assert.ok(found, 'a section whose intrusion a higher tier would not roll');
  const { s, g } = journey('RESUME-A'); s.perception.aperture = APERTURE_THRESHOLDS[0]; g.rx = found.rx; g.ry = found.ry; g.loadArea('overworld');
  const intr = g.enemies.find((e) => e.apertureEncounter); if (!intr) return; // the section as laid had no open ground for it
  s.perception.aperture = APERTURE_THRESHOLDS[1]; // grew a tier in the fight
  const r = reload(g, s); const back = r.g.enemies.filter((e) => e.apertureEncounter && !e.dead);
  assert.deepEqual(back.map((e) => e.id), [intr.id], 'the saved intrusion, and no other');
});

test('exact resume: the Stalker mid-fight is still there after a reload (a reload no longer shakes it off)', () => {
  const { s, g } = journey('RESUME-S'); g.rx = 2; g.ry = 1; g.loadArea('overworld'); g.enemies = g.enemies.filter((e) => !e.apertureEncounter);
  const c = g.spawnStalker({ x: g.player.x + 2, y: g.player.y }, false, 0); assert.ok(c, 'it came out'); c.hp -= 7; ensureStalker(s).active.hp = c.hp;
  const r = reload(g, s); const st = r.g.enemies.find((e) => e.stalker && !e.dead); assert.ok(st, 'the Stalker is there'); assert.equal(st.id, c.id); assert.equal(st.hp, c.hp);
  r.g.update(1 / 60, { state: {}, held: () => false, consume: () => false }, 6000); assert.equal(ensureStalker(r.s).active?.engaged, true, 'the fight goes on');
  assert.equal(r.g.enemies.filter((e) => e.stalker && !e.dead).length, 1, 'one Stalker');
  // A fight left by the section edge is still lost as before: the Stalker is not brought back into a section left behind.
  g.rx = 3; g.loadArea('overworld'); g.update(1 / 60, { state: {}, held: () => false, consume: () => false }, 7000); g.rx = 2; g.loadArea('overworld');
  assert.equal(g.enemies.some((e) => e.stalker && !e.dead && e.id === c.id && !ensureStalker(s).active?.engaged), false);
});

// 6. Messages and Reduce Motion.
test('finished actions say what happened: stepping into a crossing names it; nothing says "complete."', () => {
  assert.equal(actionDone({ name: 'The Long Descent' }, 'enter'), 'You step into The Long Descent.');
  for (const a of Object.keys(ACTION_DONE)) assert.doesNotMatch(actionDone({ name: 'X' }, a), /complete\./i);
  assert.doesNotMatch(actionDone({}, 'ring'), /complete\./i);
  const { g } = journey('MSG'); const at = findCrossing(g, (q) => !/horde|Revenant/.test(q.message)); assert.ok(at); const r = at.res;
  assert.doesNotMatch(String(r.message), /complete\./i); assert.match(g.message, new RegExp(`^You step into ${g.map.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`));
});

test('Reduce Motion follows prefers-reduced-motion only where no choice is stored', () => {
  const reduce = { matchMedia: (q) => ({ matches: q === '(prefers-reduced-motion: reduce)' }) }, full = { matchMedia: () => ({ matches: false }) };
  assert.equal(systemReducedMotion(reduce), true); assert.equal(systemReducedMotion(full), false); assert.equal(systemReducedMotion({}), false);
  assert.equal(normalizeSettings(withMotionDefault({}, reduce)).reduceMotion, true, 'first settings on a device that asks for less motion');
  assert.equal(normalizeSettings(withMotionDefault({}, full)).reduceMotion, false);
  assert.equal(normalizeSettings(withMotionDefault({ reduceMotion: false }, reduce)).reduceMotion, false, 'a stored choice is never overridden');
  assert.equal(normalizeSettings(withMotionDefault({ reduceMotion: true }, full)).reduceMotion, true);
  assert.equal(normalizeSettings(withMotionDefault({ quality: 'low' }, reduce)).reduceMotion, true, 'settings stored before the option existed take the system\'s');
});
