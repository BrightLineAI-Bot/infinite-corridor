// World coherence (the overworld generation review, 2026-11-04, WG-01..WG-11): ground first seen from now on keeps its ways
// through (lanes bridged over rivers and canyons, exits, plaza and great doors joined, no pits, no creature stuck on a pad, a
// Pentagon's courts crossed where you stand), and every section seen before keeps its exact ground.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game, footprintOpen, coherenceOf, coherenceSpots, walkerCrossingMap } from '../src/game.ts';
import { COHERENCE, canStep, LETHAL_KINDS, DEEP_WATER, safeVoidScarTransition, reachableFromPlaza, trappedTiles, creatureRegions, sideWalled } from '../src/landscape.ts';
import { sectionExits } from '../src/world.ts';
import { PENTAGON, pentagonSeamOpen } from '../src/pentagon.ts';
import { farDomainCentre, FAR_DOMAINS } from '../src/far-realms.ts';

const game = (seed, atlas = null) => { const s = freshSave(); s.seed = seed; if (atlas) s.atlas = JSON.parse(JSON.stringify(atlas)); return new Game(s, 0); };
const visit = (seed, rx, ry, atlas = null) => { const g = game(seed, atlas); g.rx = rx; g.ry = ry; g.loadArea('overworld'); return g; };
const I = (x, y) => y * 32 + x, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// The Wayfarer's real movement rules, tile by tile: canStep with a jump, drops short of a lethal fall, the footprint (thin walls).
const walk = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
const playerStep = (map, x, y, dx, dy) => { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > 31 || ny > 31) return false; const a = map.tiles[I(x, y)], b = map.tiles[I(nx, ny)];
  if (!walk(b) || !canStep({ isPlayer: true, jumping: true }, map, 32, x, y, nx, ny)) return false;
  if ((a.elev || 0) - (b.elev || 0) >= 4 && !safeVoidScarTransition(a, b) && !(a.slope || b.slope)) return false;
  return [.25, .5, .75].every((f) => footprintOpen(map, 32, x + dx * f, y + dy * f, true)); };
const reach = (map, x, y) => { const seen = new Uint8Array(1024), q = [I(x, y)]; seen[q[0]] = 1; for (let h = 0; h < q.length; h++) { const i = q[h], cx = i % 32, cy = (i - cx) / 32; for (const [dx, dy] of N4) { const j = I(cx + dx, cy + dy); if (cx + dx < 0 || cx + dx > 31 || cy + dy < 0 || cy + dy > 31 || seen[j] || !playerStep(map, cx, cy, dx, dy)) continue; seen[j] = 1; q.push(j); } } return seen; };
const landExits = (map) => { const ex = map.exits; return [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]].filter(([x, y]) => { const t = map.tiles[I(x, y)]; return t && !DEEP_WATER.includes(t.kind); }); };
const boxed = (map) => { const ex = landExits(map).filter(([x, y]) => walk(map.tiles[I(x, y)])), out = []; for (const a of ex) { const r = reach(map, ...a); for (const b of ex) if (a !== b && !r[I(...b)]) out.push(`${a}>${b}`); } return out; };
const near8 = (seen, x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = Math.round(x) + dx, ny = Math.round(y) + dy; if (nx >= 0 && ny >= 0 && nx < 32 && ny < 32 && seen[I(nx, ny)]) return true; } return false; };
const sha = (v) => crypto.createHash('sha1').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const ground = (g) => sha([g.map.tiles.map((t) => [t.kind, t.blocked ? 1 : 0, t.elev || 0, t.slope ? 1 : 0, t.wallSides || null]), (g.map.objects || []).filter((o) => o.kind !== 'wayfindingCue').map((o) => [o.id, o.kind, o.x, o.y]).sort(), (g.map.enemySpawns || []).map((e) => [e.kind, e.x, e.y])]);

test('world coherence is pinned per section in the atlas, like the landscape versions: new ground takes it, ground seen before never', () => {
  assert.equal(COHERENCE.version, 1);
  assert.equal(coherenceOf(undefined), COHERENCE.version); assert.equal(coherenceOf({ landscapeVersion: 17 }), 0); assert.equal(coherenceOf({ coherenceVersion: 1 }), 1);
  const g = visit('S0', -3, 10); assert.equal(g.save.atlas['-3,10'].coherenceVersion, COHERENCE.version);
  const again = game('S0', g.save.atlas); again.rx = -3; again.ry = 10; again.loadArea('overworld'); assert.equal(ground(again), ground(g), 'the same ground on every visit');
  const old = { ...g.save.atlas['-3,10'] }; delete old.coherenceVersion; const h = visit('S0', -3, 10, { '-3,10': old });
  assert.equal(h.save.atlas['-3,10'].coherenceVersion, undefined, 'a section seen before keeps no coherence version');
});

test('sections seen before world coherence regenerate exactly as release 734 made them', () => {
  // Each entry: the atlas record release 734 wrote on a first visit, and the hash of the ground it then loads (tiles, objects,
  // spawns), taken from the 734 code. Loaded now with that record, every one is the same, though every one changes as new ground.
  const PINNED = [
    ["S0", -3, 10, {"terrain":"glass","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"indoorDungeonVersion":1,"landscape":"isles"}, "90223ab87e540203"],
    ["F5", -3, 10, {"terrain":"ember","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"indoorDungeonVersion":1,"landscape":"desert"}, "e8911f8366d63e06"],
    ["F13", 10, 3, {"terrain":"ember","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"indoorDungeonVersion":1,"landscape":"desert"}, "98c1bcf0217d204c"],
    ["T1", -1104, -392, {"terrain":"ember","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"indoorDungeonVersion":1,"landscape":"blight"}, "ed240ed3cfca4bdf"],
    ["T10", 11, 8, {"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"indoorDungeonVersion":1,"landscape":"mountains"}, "edf8c7ddd7e9ade5"],
    ["F2", -466, -884, {"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"indoorDungeonVersion":1,"landscape":"desert"}, "3eafcead240957f6"],
    ["S0", 48, 15, {"terrain":"ember","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"indoorDungeonVersion":1,"landscape":"jungle"}, "5a05bcd3c961f089"],
    ["T5", -1313, 96, {"terrain":"glass","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"indoorDungeonVersion":1,"landscape":"fungal"}, "d5b668997a9e26d7"],
    ["F4", -265, 140, {"terrain":"glass","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"indoorDungeonVersion":1,"landscape":"mountains"}, "a67c57f69c344dff"],
    ["D10", 776, -1096, {"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"indoorDungeonVersion":1,"landscape":"swamp"}, "4ef23968c0b38ff6"],
  ];
  assert.ok(PINNED.length >= 8);
  for (const [seed, rx, ry, entry, hash] of PINNED) { const g = visit(seed, rx, ry, { [`${rx},${ry}`]: entry }); assert.equal(ground(g), hash, `${seed} ${rx},${ry}`); }
});

test('WG-01: a river or canyon band never cuts an exit lane on new ground; both sides of every edge bridge the same lane', () => {
  // the review's deadly crossing: from (-2,10) west into (-3,10), whose east lane the river ran over
  const g = visit('S0', -2, 10), y = g.map.exits.west; g.player.x = .6; g.player.y = y; g.transitionSection(-1, 0);
  assert.deepEqual([g.rx, g.ry], [-3, 10]); assert.ok(!g.player.dead && g.player.hp > 0, 'not lost beneath the water');
  const t = g.map.tiles[I(31, y)]; assert.equal(t.kind, 'bridge'); assert.ok(footprintOpen(g.map, 32, g.player.x, g.player.y));
  // east-west edges in band rows (ry = 1 mod 3): every land lane tile at the edge stands open on both sides
  let edges = 0, banded = 0;
  for (const seed of ['E1', 'E3']) for (let rx = -12; rx < 12; rx += 3) for (const ry of [-14, -8, 1, 4]) {
    const a = walkerCrossingMap({ seed, worldGeneration: 1, atlas: {} }, rx, ry), b = walkerCrossingMap({ seed, worldGeneration: 1, atlas: {} }, rx + 1, ry), e = sectionExits(seed, rx, ry).east; edges++;
    for (const v of [e - 1, e, e + 1]) { const ta = a.tiles[I(31, v)], tb = b.tiles[I(0, v)]; if (ta.laneBridge || tb.laneBridge) banded++;
      for (const t of [ta, tb]) if (!DEEP_WATER.includes(t.kind)) assert.ok(!(t.environment && (t.blocked || LETHAL_KINDS.has(t.kind))), `${seed} ${rx},${ry} east lane ${v}: ${t.kind}`); }
  }
  assert.ok(edges >= 60 && banded > 0, `bands met (${banded} lane tiles bridged over ${edges} edges)`);
});

test('WG-01: from new ground into a section seen before whose lane the river still cuts, the Wayfarer never lands in it', () => {
  const entry = { ...visit('S0', -3, 10).save.atlas['-3,10'] }; delete entry.coherenceVersion; // as release 734 wrote it
  const g = visit('S0', -2, 10), old = visit('S0', -3, 10, { '-3,10': entry });
  assert.ok(LETHAL_KINDS.has(old.map.tiles[I(31, g.map.exits.west)].kind) || old.map.tiles[I(31, g.map.exits.west)].blocked, 'the old section keeps its river on the lane');
  g.save.atlas['-3,10'] = entry;
  g.player.x = .6; g.player.y = g.map.exits.west; g.transitionSection(-1, 0);
  assert.ok(!g.player.dead && g.player.hp > 0); const h = g.map.tiles[Math.floor(g.player.y + .72) * 32 + Math.floor(g.player.x + .5)]; assert.ok(!LETHAL_KINDS.has(h.kind));
});

test('WG-02: on new ground every land exit reaches every other one (the review\'s boxed sections)', () => {
  for (const [seed, rx, ry] of [['F5', -3, 10], ['F13', 10, 3], ['F11', -5, -9], ['T1', -1104, -392], ['F3', 443, -1433], ['F4', -15, 48], ['F11', -140, -265], ['F20', 4422, -2333]]) {
    const g = visit(seed, rx, ry); assert.deepEqual(boxed(g.map), [], `${seed} ${rx},${ry}`);
    const hub = reach(g.map, 16, 16); for (const [x, y] of landExits(g.map)) if (walk(g.map.tiles[I(x, y)])) assert.ok(hub[I(x, y)], `${seed} ${rx},${ry}: exit ${x},${y} from the plaza`);
  }
});

test('WG-02: the exit pocket under a lethal cliff joins the land beyond it, even where the plaza stands past open sea', () => {
  const g = visit('F6', 3, -10), w = reach(g.map, 0, g.map.exits.west); let n = 0; for (let i = 0; i < 1024; i++) n += w[i];
  assert.ok(n > 100, `the west lane reaches ${n} tiles`);
});

test('WG-03: within a Pentagon the Wayfarer crosses a seam where the court runs on, not only at the lane', () => {
  const g = game('T1'); assert.ok(g.pentagonHere(-8, -8)); let crossed = 0, tried = 0;
  for (const [rx, ry, dx, dy] of [[-9, -8, 1, 0], [-8, -8, -1, 0], [-8, -9, 0, 1], [-8, -8, 0, -1], [-7, -8, -1, 0], [-8, -7, 0, -1]]) {
    g.rx = rx; g.ry = ry; g.save.session.areas = {}; g.loadArea('overworld', false); const ex = g.map.exits, lane = dx ? (dx > 0 ? ex.east : ex.west) : (dy > 0 ? ex.south : ex.north);
    for (let k = 2; k < 30; k++) { if (Math.abs(k - lane) <= 2 || !pentagonSeamOpen(-8, -8, rx, ry, dx, dy, k, k)) continue;
      const sx = dx ? (dx > 0 ? 30.6 : .4) : k, sy = dy ? (dy > 0 ? 30.4 : .4) : k - .5; if (!footprintOpen(g.map, 32, sx, sy)) continue;
      tried++; g.player.x = sx; g.player.y = sy; let now = 3e9; const input = { state: { x: dx, y: dy }, consume: () => false, held: () => false };
      for (let i = 0; i < 30 && g.rx === rx && g.ry === ry; i++) { now += 50; g.update(.05, input, now); }
      if (g.rx === rx + dx && g.ry === ry + dy) { crossed++; assert.ok(g.map.tiles[I(Math.floor(g.player.x + .5), Math.floor(g.player.y + .75))].courtyard, 'lands in the court across the seam'); }
      break; }
  }
  assert.ok(tried >= 4 && crossed === tried, `${crossed} of ${tried} seams crossed`);
  // and nowhere else: a court tile at an ordinary edge (outside any Pentagon) starts no crossing away from the lane
  assert.equal(pentagonSeamOpen(-8, -8, -9, -8, -1, 0, 10, 10), false, 'the Pentagon\'s outer edge is not a seam');
});

test('WG-04: a far domain\'s arena holds no Pentagon on new ground; a Pentagon begun before keeps standing', () => {
  const c = farDomainCentre('D10', 'morphingBlob'); assert.ok(FAR_DOMAINS.morphingBlob); assert.deepEqual([c.rx, c.ry], [775, -1095]);
  assert.equal(game('D10').pentagonHere(776, -1096), false);
  const old = game('D10', { '777,-1097': { landscapeVersion: 17, pentVersion: PENTAGON.version } }); assert.equal(old.pentagonHere(776, -1096), true, 'seen before world coherence: as it was');
});

test('WG-05: labyrinth and great-building front doors join the section\'s exits on new ground', () => {
  for (const [seed, rx, ry] of [['F2', -466, -884], ['F11', -4777, -1478], ['T9', -928, -883], ['F2', -884, 466], ['F3', -467, -884], ['F18', 466, 884], ['F1', 5910, -19107]]) {
    const g = visit(seed, rx, ry), hub = reach(g.map, 16, 16);
    for (const s of coherenceSpots(g.map)) assert.ok(near8(hub, s.x, s.y), `${seed} ${rx},${ry}: ${s.x},${s.y}`);
  }
});

test('WG-06: landscape reachability counts a shack\'s thin walls, so no pit opens against one (T10 (11,8))', () => {
  const g = visit('T10', 11, 8), m = g.map; assert.ok(m.tiles.some((t) => t.wallSides?.length));
  assert.equal(trappedTiles(m, 32, 32, { x: 16, y: 16 }, true).length, 0);
  const plain = reachableFromPlaza(m), walled = reachableFromPlaza(m, undefined, true); let more = 0; for (let i = 0; i < 1024; i++) if (walled[i] && !plain[i]) more++; assert.equal(more, 0, 'walls only ever take tiles away');
  const a = { structure: 'shackWall', wallSides: ['east'] }, b = {}; assert.ok(sideWalled(a, b, 1, 0)); assert.ok(sideWalled(b, a, -1, 0)); assert.ok(!sideWalled(a, b, 0, 1));
  // and in play: nothing the Wayfarer walks to from an exit or the plaza is a pit
  const starts = [[16, 16], ...landExits(m)], go = new Uint8Array(1024); for (const s of starts) { const r = reach(m, ...s); for (let i = 0; i < 1024; i++) go[i] |= r[i]; }
  const back = new Uint8Array(1024), q = [I(16, 16)]; back[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const j = q[h], x = j % 32, y = (j - x) / 32; for (const [dx, dy] of N4) { const px = x - dx, py = y - dy, k = I(px, py); if (px < 0 || py < 0 || px > 31 || py > 31 || back[k] || !walk(m.tiles[k]) || !playerStep(m, px, py, dx, dy)) continue; back[k] = 1; q.push(k); } }
  for (let i = 0; i < 1024; i++) if (go[i]) assert.ok(back[i], `pit at ${i % 32},${(i - (i % 32)) / 32}`);
});

test('WG-07: a summit cairn on new ground can be walked to', () => {
  for (const [seed, rx, ry] of [['F4', -265, 140], ['F3', 89, -287], ['F3', 443, -1433], ['F9', -89, 287]]) {
    const g = visit(seed, rx, ry), hub = reach(g.map, 16, 16);
    for (const o of g.map.objects.filter((q) => q.landscapeSummit && q.kind === 'ruinMarker')) assert.ok(near8(hub, o.x, o.y), `${seed} ${rx},${ry}: ${o.name} at ${o.x},${o.y}`);
  }
});

test('WG-08: no creature on new ground stands on a pad it cannot leave, and no pack extra in a castle court', () => {
  let looked = 0;
  for (const [seed, rx, ry] of [['S0', 48, 15], ['F0', -15, 48], ['F1', -5, -9], ['F1', 48, 15], ['F0', -19107, -5910], ['F0', -9331, -17690]]) {
    const g = visit(seed, rx, ry), R = creatureRegions(g.map);
    for (const e of g.map.enemySpawns) { if (!/^pack-overworld/.test(e.id || '') && !e.settled) continue; looked++; const t = g.map.tiles[I(Math.round(e.x), Math.round(e.y))];
      assert.ok(!t.courtyard && !t.greatBuilding, `${seed} ${rx},${ry}: ${e.id} in a court`); assert.ok(R.at(e.x, e.y) >= COHERENCE.creatureRegion, `${seed} ${rx},${ry}: ${e.id || e.kind} has ${R.at(e.x, e.y)} tiles`); }
  }
  assert.ok(looked > 0);
});

test('WG-10: a castle or Pentagon built over great mushrooms takes the whole stand, its cache and its note with it', () => {
  const g = visit('T5', -1313, 96); assert.ok(g.map.pentagon || g.map.greatBuilding?.castle);
  assert.equal(g.map.mushrooms, undefined); assert.ok(!g.map.tiles.some((t) => t.mushroom)); assert.ok(!g.map.objects.some((o) => /^mushroom-cache-/.test(o.id)));
  assert.ok(!g.save.narrative.journal.some((j) => j.recordId === 'great-mushrooms'));
});

test('WG-11: the settled-section memo stays bounded', () => {
  const g = game('T1'); for (let cx = -400; cx <= 400; cx += PENTAGON.every) g.pentagonHere(cx, 64);
  assert.ok(g._castleSettle.size <= COHERENCE.memo + 9, `${g._castleSettle.size} keys`);
});
