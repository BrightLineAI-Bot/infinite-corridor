// Rarer Starfields and safe edges on raised ground (Tim, 2026-11-25).
// 1. "It should just be the normal mix of smaller or regular dungeons. Starfield should be relatively rare; it's just another
//    dungeon, so it shouldn't be prioritised for any reason." Sections first seen from now on pin Starfield placement 2 in the Atlas
//    (`starPlace`): their crossings roll a Starfield at .1 (placement 1, release 672: .2), and their great trees' canopy doors open on
//    stars at that same chance (placement 1: half of them). Sections seen before keep placement 1, and every crossing already
//    entered keeps what its history pinned.
// 2. Not dying at an edge over water or lava applies to all raised ground, not only great-tree wood (release 1056's onWoodAbove):
//    feet on raised ground whose box overhangs water, lava or a drop are up on that ground; only stepping or falling in counts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, CHASM, chasmRoll, canopyDoorDest, generatePinnedDungeon, footprintHazard } from '../src/game.ts';
import { WONDERS, STARFIELD_ROLL, starPlaceAt, starPlaceOfId, wonderAt } from '../src/wonders.ts';
import { canopyGateDestination } from '../src/trees.ts';
import { generateRegion, dungeonId } from '../src/world.ts';
import { farSleepSection } from '../src/landscape.ts';
import { hashSeed } from '../src/random.ts';
import { starfieldAt } from '../src/quest-places.ts';
import { roofDeckIndex, roofDeckAt } from '../src/roof-decks.ts';

const W = 32;
const save = (seed, extra = (s) => {}) => { const s = freshSave(); s.seed = seed; s.maxHp = 100; extra(s); return s; };
const roll = (seed, id) => (hashSeed(`${seed}:chasm-crossing:v1:${id}`) % 1000) / 1000;

// ---------------------------------------------------------------- Starfields
test('the Starfield chance on new ground is .1 (placement 2), one table read by the game, the wonders and the quests', () => {
  assert.deepEqual(STARFIELD_ROLL, { place: 2, chances: { 1: .2, 2: .1 } });
  assert.equal(CHASM.place, 2); assert.equal(CHASM.chance, .1); assert.equal(CHASM.chances[1], .2); assert.equal(WONDERS.chasmChance, CHASM.chance);
  assert.ok(CHASM.chance <= .12, 'no more than the old .12');
  const seed = 'RARE'; let n2 = 0, n1 = 0;
  for (let x = 0; x < 4000; x++) { const id = `dungeon:${seed}:g1:${x}:5:room`, a = chasmRoll(seed, id), b = chasmRoll(seed, id, 1);
    if (a) { n2++; assert.ok(b, 'a placement 2 Starfield is a placement 1 one: one hash, a lower bar'); } if (b) n1++;
    assert.equal(b, roll(seed, id) < .2, 'placement 1 is release 672\'s roll exactly'); }
  assert.ok(Math.abs(n2 / 4000 - .1) < .02, `${n2} of 4000 at placement 2`); assert.ok(Math.abs(n1 / 4000 - .2) < .02, `${n1} of 4000 at placement 1`);
});

test('the share of real new crossings that are Starfields roughly halves, and crossings on ground seen before keep theirs', () => {
  // Landmark crossings of sampled sections, generated through the game's own first entry (generatePinnedDungeon).
  let crossings = 0, now = 0, before = 0;
  for (const seed of ['SHARE1', 'SHARE2']) { let n = 0;
    for (let k = 0; n < 90 && k < 4000; k++) { const h = hashSeed(`${seed}:share:${k}`), rx = (h % 61) - 30, ry = ((h >>> 8) % 61) - 30; if (!rx && !ry) continue;
      for (const o of generateRegion(seed, rx, ry).objects) { if (o.kind !== 'dungeon') continue; const id = dungeonId(seed, 1, rx, ry, o.id);
        const fresh = save(seed), seen = save(seed, (s) => { s.atlas = { [`${rx},${ry}`]: { terrain: 'seen' } }; });
        assert.equal(starPlaceOfId(fresh, id), 2); assert.equal(starPlaceOfId(seen, id), 1);
        generatePinnedDungeon(fresh, id); generatePinnedDungeon(seen, id); const a = fresh.consequences.dungeons[id], b = seen.consequences.dungeons[id];
        if (a.chasm) { now++; assert.ok(b.chasm, 'new ground\'s Starfields are Starfields on old ground too'); } if (b.chasm) before++; crossings++; n++; } } }
  const share = now / crossings, old = before / crossings;
  assert.ok(share < .12 && share < old * .75, `Starfields: ${before} of ${crossings} (${old.toFixed(3)}) at placement 1, ${now} (${share.toFixed(3)}) now`);
});

test('version pin: a crossing already entered keeps its Starfield (or its walls) whatever its section\'s placement', () => {
  const seed = 'PIN'; let id = null, rx = 0, ry = 0;
  for (let x = 1; x < 400 && !id; x++) { const c = `dungeon:${seed}:g1:${x}:${x % 5}:room`; if (!farSleepSection(x, x % 5) && roll(seed, c) >= .1 && roll(seed, c) < .2) { id = c; rx = x; ry = x % 5; } }
  assert.ok(id, 'a crossing between the two bars');
  const pinned = (pre, atlas) => { const s = save(seed, (q) => { if (atlas) q.atlas = { [`${rx},${ry}`]: atlas }; if (pre) q.consequences.dungeons[id] = { ...pre }; }); const m = generatePinnedDungeon(s, id); return { m, h: s.consequences.dungeons[id] }; };
  const seen = pinned(null, { terrain: 'seen' }), fresh = pinned(null, null), newer = pinned(null, { terrain: 'new', starPlace: 2 });
  if (!seen.h.mire && !seen.h.dream) assert.equal(seen.h.chasm, CHASM.version, 'ground seen before: release 672\'s Starfield');
  assert.equal(fresh.h.chasm, 0, 'new ground: an ordinary crossing'); assert.equal(newer.h.chasm, 0);
  const kept = pinned({ chasm: CHASM.version }, { terrain: 'new', starPlace: 2 }); assert.equal(kept.h.chasm, CHASM.version); assert.equal(kept.m.chasm, CHASM.version, 'an entered Starfield stays one');
  const walls = pinned({ chasm: 0 }, { terrain: 'seen' }); assert.equal(walls.h.chasm, 0); assert.ok(!walls.m.chasm);
  assert.deepEqual(pinned(null, { terrain: 'seen' }).m, seen.m, 'deterministic');
});

test('the Atlas pins placement 2 on new ground only; a section explored before the pin keeps placement 1', () => {
  const s = save('ATLAS', (q) => Object.assign(q.session, { area: 'overworld', rx: 3, ry: -2, x: 16, y: 16 })), g = new Game(s, 0);
  assert.equal(s.atlas['3,-2'].starPlace, 2); assert.equal(starPlaceAt(s, 3, -2), 2); assert.equal(starPlaceAt(s, 40, 40), 2, 'unseen: new ground');
  const old = save('ATLAS', (q) => { q.explored = { '3,-2': true }; Object.assign(q.session, { area: 'overworld', rx: 3, ry: -2, x: 16, y: 16 }); }); new Game(old, 0);
  assert.equal(old.atlas['3,-2'].starPlace, undefined, 'explored before the Atlas pinned it: placement 1'); assert.equal(starPlaceAt(old, 3, -2), 1);
  const kept = save('ATLAS', (q) => { q.atlas = { '3,-2': { terrain: 'seen', custom: 7 } }; Object.assign(q.session, { area: 'overworld', rx: 3, ry: -2, x: 16, y: 16 }); }); new Game(kept, 0);
  assert.equal(kept.atlas['3,-2'].starPlace, undefined); assert.equal(kept.atlas['3,-2'].custom, 7, 'unknown fields kept'); assert.ok(g.map);
});

test('the quests and wonders read the same placement as the crossing\'s first entry', () => {
  const seed = 'QUESTS'; let checked = 0;
  for (let x = -30; x <= 30 && checked < 40; x++) for (let y = -30; y <= 30 && checked < 40; y++) {
    const fresh = save(seed), seen = save(seed, (s) => { s.atlas = { [`${x},${y}`]: { terrain: 'seen' } }; }), a = starfieldAt(fresh, x, y), b = starfieldAt(seen, x, y);
    if (a) assert.ok(b, 'a placement 2 quest Starfield is one on old ground too'); if (!a && !b) continue; checked++;
    if (a) assert.ok(chasmRoll(seed, a.dungeon, 2)); if (b) assert.ok(chasmRoll(seed, b.dungeon, 1));
    if (a) assert.ok(wonderAt(seed, x, y, 'starfield', 1, 2), 'the Atlas rumour agrees on new ground');
    if (wonderAt(seed, x, y, 'starfield', 1, 2)) assert.ok(wonderAt(seed, x, y, 'starfield', 1, 1)); }
  assert.ok(checked > 5, `${checked} sections`);
});

test('canopy doors: half open on stars at placement 1 (as generated), about one in ten from placement 2', () => {
  let n = 0, one = 0, two = 0;
  for (let x = -60; x < 60; x++) for (let y = -20; y < 20; y++) { n++; if (canopyDoorDest('DOORS', x, y, 1) === 'starfield') one++; if (canopyDoorDest('DOORS', x, y) === 'starfield') two++;
    assert.equal(canopyDoorDest('DOORS', x, y, 1), canopyGateDestination('DOORS', x, y)); }
  assert.ok(Math.abs(one / n - .5) < .04, `${one} of ${n}`); assert.ok(Math.abs(two / n - .1) < .03, `${two} of ${n}`);
});

test('in the game: a great tree\'s door on new ground follows placement 2; seen before, it is as it was', () => {
  const seed = 'DOORS'; let done = 0;
  for (let k = 0; k < 6000 && done < 2; k++) { const h = hashSeed(`${seed}:tree:${k}`), rx = (h % 81) - 40, ry = ((h >>> 8) % 81) - 40;
    if (!wonderAt(seed, rx, ry, 'tree') || canopyDoorDest(seed, rx, ry, 1) === canopyDoorDest(seed, rx, ry, 2)) continue;
    const at = (atlas) => { const s = save(seed, (q) => { if (atlas) q.atlas = { [`${rx},${ry}`]: atlas }; Object.assign(q.session, { area: 'overworld', rx, ry, x: 16, y: 16 }); }); return new Game(s, 0); };
    const fresh = at(null), gate = fresh.map.objects.find((o) => o.kind === 'canopyGate'); if (!gate) continue;
    assert.equal(gate.dest, canopyDoorDest(seed, rx, ry, 2)); assert.match(gate.name, gate.dest === 'starfield' ? /full of stars/ : /full of cloud/);
    const old = at({ terrain: 'seen', landscapeVersion: fresh.save.atlas[`${rx},${ry}`].landscapeVersion, skyPlace: 2 }), was = old.map.objects.find((o) => o.kind === 'canopyGate');
    assert.equal(was.dest, canopyGateDestination(seed, rx, ry), 'seen before: the door as generated'); assert.notEqual(was.dest, gate.dest);
    const again = new Game(structuredClone(fresh.exportSnapshot(1000)), 0); assert.equal(again.map.objects.find((o) => o.kind === 'canopyGate')?.dest, gate.dest, 'the same door after a reload');
    done++; }
  assert.equal(done, 2, 'two trees whose door the placement changes');
});

// ---------------------------------------------------------------- Raised edges
// Real generated ground (found by a survey of loaded sections): a raised tile with water, lava or a drop at its rim (the row north
// of it, where the box's front edge reaches .03 of a tile before the feet).
const EDGES = [
  { what: 'a mesa top over a river', seed: 'EDGE1', rx: 31, ry: -29, kind: 'mesaTop' },
  { what: 'a pillar lands sky platform over a river', seed: 'EDGE4', rx: -53, ry: 16, kind: 'skyPlatform' },
  { what: 'a snow bridge over a crevasse', seed: 'EDGE0', rx: 51, ry: -21, kind: 'snowBridge' },
  { what: 'dream marble over lava', seed: 'EDGE1', rx: -36, ry: 29, kind: 'dreamMarble', hazard: 'lava' },
  { what: 'a sinter terrace over the sea', seed: 'EDGE0', rx: -34, ry: 23, kind: 'sinterTerrace' },
  { what: 'a mountain ledge over a canyon', seed: 'EDGE1', rx: 57, ry: 40, kind: 'mountainRock' },
];
const HAZARDS = new Set(['canyon', 'river', 'dungeonWater', 'lava', 'abyss', 'ocean', 'deepOcean', 'lakeWater', 'swampWater', 'toxicWater']);
const load = (c, extra = (s) => {}) => { const s = save(c.seed, (q) => { q.capabilities = { ...(q.capabilities || {}), swim: false }; extra(q); Object.assign(q.session, { area: 'overworld', rx: c.rx, ry: c.ry, x: 16, y: 16 }); }); const g = new Game(s, 0); g.enemies = []; g.player.hp = g.save.maxHp; return g; };
const rim = (g, kind, hazard) => g.map.tiles.find((u) => u.y > 1 && u.kind === kind && !u.blocked
  && ((n) => HAZARDS.has(n.kind) && (!hazard || n.kind === hazard) && (u.elev || 0) - (n.elev || 0) > .5)(g.map.tiles[(u.y - 1) * W + u.x]));
const atRim = (g, u) => { g.player.x = u.x - .25; g.player.y = u.y - .74; }; // the feet (x + .5, y + .75) on the tile, the box's front (y + .72) over its north neighbour
const deaths = (g) => g.save.worldFlags?.deaths || 0;
const idle = (g, frames, t0 = 2000, sx = 0, sy = 0) => { let t = t0; for (let i = 0; i < frames; i++) { g.enemies = []; g.update(1 / 30, { state: { x: sx, y: sy }, consume: () => false, held: () => false }, t += 1000 / 30); } return t; };

test('standing at the rim of raised ground over water, lava or a drop is standing on it: ledges, mesas, platforms, bridges, terraces', () => {
  for (const c of EDGES) {
    const g = load(c), u = rim(g, c.kind, c.hazard); assert.ok(u, `${c.what}: found`); const n = g.map.tiles[(u.y - 1) * W + u.x];
    atRim(g, u); const p = g.player;
    assert.equal(footprintHazard(g.map, W, p.x, p.y), n.kind, `${c.what}: the box's front edge is over ${n.kind} (read as in it before)`);
    assert.equal(g.hazardWhereMoved(p, 0, 0, p.x, p.y, W, 1000), null, `${c.what}: up on the ${u.kind}, not in the ${n.kind}`);
    const d0 = deaths(g); idle(g, 30);
    assert.equal(deaths(g), d0, `${c.what}: alive`); assert.ok(p.hp > 0); assert.equal(g.swimming, false, `${c.what}: not swimming`);
    assert.ok(Math.abs(p.y - (u.y - .74)) < .01 && Math.abs(p.x - (u.x - .25)) < .01, `${c.what}: still where they stood`);
  }
});

test('stepping off the rim still counts: the Wayfarer falls into what lies below', () => {
  let stepped = 0;
  for (const c of EDGES) {
    const g = load(c), u = rim(g, c.kind, c.hazard); atRim(g, u); const d0 = deaths(g), y0 = g.player.y; let t = 2000;
    for (let i = 0; i < 120 && deaths(g) === d0 && g.player.hp > 0; i++) t = idle(g, 1, t, 0, -1);
    if (deaths(g) === d0 && Math.abs(g.player.y - y0) < .01) continue; // a cliff the landscape does not let them walk off (a mesa's rim)
    assert.ok(deaths(g) > d0 || g.player.hp <= 0, `${c.what}: a step north is a step into it`); stepped++;
  }
  assert.ok(stepped >= 2, `${stepped} rims stepped off`);
});

test('on a raised tile over lava (made by hand), and on a roof over water: the rim holds; at the hazard\'s own level it does not', () => {
  const c = EDGES[0], g = load(c), u = rim(g, c.kind), n = g.map.tiles[(u.y - 1) * W + u.x];
  Object.assign(n, { kind: 'lava', blocked: false }); atRim(g, u); const p = g.player;
  assert.equal(g.hazardWhereMoved(p, 0, 0, p.x, p.y, W, 1000), null, 'raised over lava'); assert.equal(g.onWoodAbove(p.x, p.y, W), true, 'release 1056\'s name reads the same rule');
  const e = u.elev; u.elev = n.elev || 0; assert.equal(g.hazardWhereMoved(p, 0, 0, p.x, p.y, W, 1000), 'lava', 'level with the lava: in it, as before');
  u.elev = (n.elev || 0) + .5; assert.equal(g.hazardWhereMoved(p, 0, 0, p.x, p.y, W, 1000), 'lava', 'half a level (FALL.minDrop) is not raised'); u.elev = e;
  // A roof: the first deck in a section of houses, its north rim over a river laid at the house's foot.
  const r = load({ seed: 'ROOF', rx: -2, ry: 0 }), decks = roofDeckIndex(r.map).decks; let tried = 0, held = 0;
  for (const d of decks) { const cells = d.cells.map((i) => [i % W, Math.floor(i / W)]), edge = cells.find(([x, y]) => y > 1 && !d.cells.includes((y - 1) * W + x) && !r.map.tiles[(y - 1) * W + x].buildingId && !r.map.tiles[(y - 1) * W + x].structure);
    if (!edge) continue; const [ex, ey] = edge, w = r.map.tiles[(ey - 1) * W + ex]; Object.assign(w, { kind: 'river', blocked: false, elev: d.base }); tried++;
    r.player.x = ex - .25; r.player.y = ey - .74; if (!roofDeckAt(r.map, r.player.x + .5, r.player.y + .75)) continue; r.setRoofDeck(d);
    assert.equal(footprintHazard(r.map, W, r.player.x, r.player.y), 'river');
    assert.equal(r.hazardWhereMoved(r.player, 0, 0, r.player.x, r.player.y, W, 1000), null, `on the roof of ${d.id}, not in the river`); held++; break; }
  assert.ok(tried && held, 'a roof rim over water');
});

test('ground-level water and lava are unchanged: a shore\'s rim is in the water, the Tidemantle swims, lava kills', () => {
  const c = EDGES[0], g = load(c), u = rim(g, c.kind), n = g.map.tiles[(u.y - 1) * W + u.x];
  u.elev = n.elev || 0; atRim(g, u); const p = g.player;
  assert.equal(g.hazardWhereMoved(p, 0, 0, p.x, p.y, W, 1000), n.kind, 'level ground at the rim: the water, as before');
  const d0 = deaths(g); idle(g, 3); assert.ok(deaths(g) > d0 || p.hp <= 0, 'no Tidemantle: the river takes them');
  const s = load(c, (q) => { q.capabilities = { ...(q.capabilities || {}), swim: true }; }), v = rim(s, c.kind); v.elev = s.map.tiles[(v.y - 1) * W + v.x].elev || 0; atRim(s, v);
  const d1 = deaths(s); idle(s, 3); assert.equal(deaths(s), d1); assert.equal(s.swimming, true, 'with the Tidemantle: swimming, as before');
  const l = load(c), w = rim(l, c.kind), m = l.map.tiles[(w.y - 1) * W + w.x]; Object.assign(m, { kind: 'lava', blocked: false }); w.elev = m.elev || 0; atRim(l, w);
  const d2 = deaths(l); idle(l, 3); assert.ok(deaths(l) > d2 || l.player.hp <= 0, 'level with lava: lava kills, as before');
});
