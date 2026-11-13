// Stegosaur's Grip, the Wild Stegosaurus's Echo (Tim, 2026-11-12): "The stego's Echo lets you wall cling. You can jump onto a wall
// ... and hold on to it. If you don't move, you just stay there. Press jump again while you're on the wall and you jump off it, and
// you can do another jump off the next wall. If you have the drone out or the robot on, those moves take priority."
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { render } from '../src/renderer.ts';
import { JUMP, jumpLift } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, footprintOpen } from '../src/game.ts';
import { ECHOES, ECHO_IDS, WALL_CLING, grantSlainEchoes, toggleEcho, echoKindOf } from '../src/echoes.ts';
import { MONSTER_PACK } from '../src/monster-pack.ts';
import { elevationAt, fallDamage } from '../src/landscape.ts';
import { roofDeckById } from '../src/roof-decks.ts';
import { learnRank, riftStep } from '../src/constellation.ts';
import { PENTAGON, pentagonPlan, pentagonVaultId } from '../src/pentagon.ts';
import { pentagonArenaId } from '../src/pentagon-arena.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const W = 32, DT = 1000 / 60;
const grip = (s) => { s.echoes.owned.wildStego = true; s.echoes.equipped = ['wildStego']; return s; };
const inp = (x, y, jump = false) => { let j = jump; return { state: { x, y }, consume: (k) => k === 'jump' && j ? (j = false, true) : false, held: () => false }; };
function driver(g, t0 = 1000, dt = DT) {
  let t = t0; const step = (x = 0, y = 0, jump = false) => { t += dt; g.update(dt / 1000, inp(x, y, jump), t); g.enemies = []; };
  return { step, idle: (ms) => { for (let i = 0; i < ms / dt; i++) step(); }, now: () => t };
}
const airborne = (g, d) => d.now() < (g.jumpUntil || 0);
// An open plain on an overworld section, flattened, with `build(tile)` run over every tile.
function plain(build = () => {}, { echo = true, seed = 'GRIP', extra = () => {} } = {}) {
  const s = freshSave(); s.seed = seed; if (echo) grip(s); extra(s);
  Object.assign(s.session, { area: 'overworld', rx: 5, ry: 5, x: 16, y: 16 });
  const g = new Game(s, 0); g.enemies = []; g.map.objects = []; g.map.enemySpawns = []; g.map.landscape = { version: 1, biome: 'plains', name: null };
  for (const t of g.map.tiles) { for (const k of ['structure', 'buildingId', 'environment', 'perch', 'pentagon', 'canopy', 'skyPlatform', 'towerAir', 'greatBuilding', 'wallSides', 'encSides']) delete t[k]; Object.assign(t, { kind: 'grass', blocked: false, elev: 0, slope: false, landscape: 'plains' }); build(t); }
  return { s, g, hp: g.player.hp };
}
// Two facing walls: x = 10 is a cliff 6 levels high, x >= 13 a plateau 4 levels up; the gap between is open ground.
const shaft = (t) => { if (t.x === 10) t.elev = 6; if (t.x >= 13) t.elev = 4; };
// Jump at the plateau's face, holding right, until the Wayfarer holds it.
function clingRight(g, d) { const p = g.player; p.x = 11.5; p.y = 15; d.step(1, 0, true); for (let i = 0; i < 40 && !g.wallCling; i++) d.step(1, 0); }

test('the Wild Stegosaurus has its Echo now: Stegosaur\'s Grip, defined, saved and shown like every other', () => {
  assert.equal(MONSTER_PACK.wildStego.noEcho, undefined, 'no longer marked as without one');
  const e = ECHOES.wildStego; assert.ok(ECHO_IDS.includes('wildStego'));
  assert.equal(e.name, "Stegosaur's Grip"); assert.equal(e.cost, 2); assert.equal(e.trigger, 'jump'); assert.equal(e.module, 'wallCling'); assert.match(e.text, /wall/);
  assert.equal(e.creature, undefined, 'a pack creature: the Echoes screen names it from the pack (The Wild Stegosaurus)');
  const s = freshSave(); assert.equal(toggleEcho(s, 'wildStego').ok, false, 'owned first'); s.echoes.owned.wildStego = true;
  assert.equal(toggleEcho(s, 'wildStego').ok, true); assert.deepEqual(migrateSave(structuredClone(s)).echoes.equipped, ['wildStego'], 'kept through a save');
  assert.ok(createLabFixture({ lab: 'forge', scenario: 'echoes', now: 0 }).save.echoes.owned.wildStego, 'in the Forge\'s Echoes sandbox');
  for (const k of ['push', 'aim', 'reach', 'rise', 'maxRise', 'letGo', 'dead', 'hold']) assert.ok(Number.isFinite(WALL_CLING[k]) && WALL_CLING[k] > 0, k);
});

test('the first Wild Stegosaurus killed always leaves its Echo; one slain before it existed grants it on load', () => {
  const s = freshSave(); s.seed = 'STEGO-ECHO'; const g = new Game(s, 0);
  const e = g.createEnemyFromSpawn({ id: 'world-beast:wildStego:1', kind: 'wildStego', x: 10, y: 10, boss: true, worldBeast: 'wildStego', traits: [] });
  assert.equal(echoKindOf(e), 'wildStego'); g.enemies.push(e); e.hp = 0; e.dead = true; g.defeatEnemy(e);
  assert.equal(s.echoes.owned.wildStego, true, 'taken on the first kill');
  const old = freshSave(); old.worldBeasts = { ...(old.worldBeasts || {}), wildStego: { ...(old.worldBeasts?.wildStego || {}), slain: 1 } };
  assert.deepEqual(grantSlainEchoes(old), ['wildStego']); assert.equal(old.echoes.owned.wildStego, true);
  const loaded = freshSave(); loaded.worldBeasts = { ...(loaded.worldBeasts || {}), wildStego: { ...(loaded.worldBeasts?.wildStego || {}), slain: 2 } }; delete loaded.echoes.owned.wildStego;
  assert.equal(migrateSave(structuredClone(loaded)).echoes.owned.wildStego, true, 'on load');
});

test('a jump into a wall holds it at the height reached; with no input it stays put, as long as you like', () => {
  const { g, hp } = plain(shaft), d = driver(g), p = g.player; clingRight(g, d);
  const c = g.wallCling; assert.ok(c, 'holding the plateau\'s face'); assert.deepEqual([c.nx, c.ny, c.z, c.lifted], [1, 0, 1, true]);
  assert.equal(g.skyAir, 1, 'one level up: a jump\'s top'); assert.equal(p.facing, 'right'); assert.equal(g.playerLevel(), 1);
  const x = p.x, y = p.y; d.idle(20000);
  assert.ok(g.wallCling && airborne(g, d), 'still holding after 20 s'); assert.equal(p.x, x); assert.equal(p.y, y); assert.equal(p.hp, hp);
  for (let i = 0; i < 60; i++) d.step(1, 0); assert.ok(g.wallCling, 'pushing into the wall keeps the hold'); assert.equal(p.x, x);
  // Pushed off the wall it lets go: an ordinary drop of one level (unhurt) and a walk away.
  for (let i = 0; i < 30; i++) d.step(-1, 0); assert.equal(g.wallCling, null); assert.ok(!airborne(g, d)); assert.ok(p.x < x - .3); assert.equal(p.hp, hp); assert.equal(g.skyAir, null);
});

test('jump on the wall kicks off it, away; chained wall jumps between facing walls climb onto a ledge', () => {
  for (const dt of [DT, 1000 / 30, 50]) {
  const { g, hp } = plain(shaft), d = driver(g, 1000, dt), p = g.player; clingRight(g, d);
  const holds = [];
  for (let k = 0; k < 6 && g.wallCling; k++) {
    const from = p.x, side = g.wallCling.nx; d.step(0, 0, true); assert.equal(g.wallCling, null, 'off the wall');
    assert.ok(g.wallKick && g.wallKick.x === -side, 'kicked away from it'); d.step(); assert.ok(side > 0 ? p.x < from : p.x > from, 'moving away');
    for (let i = 0; i < 60 && !g.wallCling && airborne(g, d); i++) d.step();
    if (g.wallCling) holds.push(`${g.wallCling.nx > 0 ? 'R' : 'L'}${g.wallCling.z}`);
  }
  d.idle(500);
  assert.deepEqual(holds, ['L2', 'R3', 'L3'], 'each hold a level higher, up to WALL_CLING.maxRise over the ground it began from');
  assert.equal(elevationAt(g.map, W, p.x, p.y), 4, 'up on the plateau'); assert.ok(!airborne(g, d)); assert.equal(p.hp, hp, 'landed, unhurt');
  assert.ok(footprintOpen(g.map, W, p.x, p.y, true), 'not in a wall');
  }
});

test('letting go high up is a fall from that height', () => {
  const { g, hp } = plain(shaft), d = driver(g), p = g.player; clingRight(g, d);
  d.step(0, 0, true); for (let i = 0; i < 60 && !g.wallCling; i++) d.step(); d.step(0, 0, true); for (let i = 0; i < 60 && !g.wallCling; i++) d.step();
  assert.equal(g.wallCling?.z, 3); for (let i = 0; i < 40; i++) d.step(-1, 0);
  assert.equal(g.wallCling, null); assert.equal(p.hp, hp - fallDamage(3, g.save.maxHp), 'three levels down');
});

test('the drone out or the robot on take Jump: no hold, their own moves instead', () => {
  for (const mode of ['drone', 'robot']) {
    const { g } = plain(shaft, { extra: (s) => { s.mech = { built: true, active: true, mode, fuel: 5, plate: 500, healCd: 0, rocketCd: 0 }; } }), d = driver(g), p = g.player;
    assert.ok(mode === 'drone' ? g.droneUp() : g.mechUp(), mode);
    p.x = 11.5; p.y = 15; d.step(1, 0, true); for (let i = 0; i < 40; i++) d.step(1, 0);
    assert.equal(g.wallCling, null, `${mode}: never holds`);
    d.step(1, 0, true); assert.equal(g.wallCling, null); assert.equal(g.wallKick ?? null, null, `${mode}: no wall jump either`);
  }
});

test('no Echo, no hold: unowned, or owned and not set', () => {
  for (const extra of [() => {}, (s) => { s.echoes.owned.wildStego = true; s.echoes.equipped = []; }]) {
    const { g } = plain(shaft, { echo: false, extra }), d = driver(g); clingRight(g, d);
    assert.equal(g.wallCling, null); d.idle(1000); assert.ok(!airborne(g, d), 'the jump simply ended');
  }
});

test('a run along a wall, a step up one level and creatures never grab it; only a push into the wall does', () => {
  const { g } = plain(shaft), d = driver(g), p = g.player;
  p.x = 12.4; p.y = 12; d.step(.3, 1, true); for (let i = 0; i < 30; i++) d.step(.3, 1); assert.equal(g.wallCling, null, 'along the wall');
  const one = plain((t) => { if (t.x >= 13) t.elev = 1; }), d1 = driver(one.g); one.g.player.x = 11.5; one.g.player.y = 15;
  d1.step(1, 0, true); for (let i = 0; i < 40; i++) d1.step(1, 0); assert.equal(one.g.wallCling, null); assert.equal(elevationAt(one.g.map, W, one.g.player.x, one.g.player.y), 1, 'climbed the ledge as ever');
});

test('Pentagon walls, the Great Castle, a sealed tower\'s air and the map\'s edge are never held', () => {
  const cases = {
    pentagon: (t) => { if (t.x >= 13) Object.assign(t, { kind: 'pentWall', blocked: true, pentagon: 'wall' }); },
    castle: (t) => { if (t.x >= 13) Object.assign(t, { kind: 'castleWall', landscape: 'castle', greatBuilding: true, blocked: true }); },
    tower: (t) => { if (t.x >= 13) Object.assign(t, { elev: 4, towerAir: true }); },
    water: (t) => { if (t.x >= 13) Object.assign(t, { kind: 'lakeWater', blocked: true }); },
  };
  for (const [name, build] of Object.entries(cases)) { const { g } = plain(build), d = driver(g); clingRight(g, d); assert.equal(g.wallCling, null, name); }
  const rock = plain((t) => { if (t.x >= 13) Object.assign(t, { kind: 'crag', blocked: true }); }), dr = driver(rock.g); clingRight(rock.g, dr); assert.ok(rock.g.wallCling, 'but plain rock is');
  // The edge of a flat dungeon floor (no tile beyond it) is no wall.
  const s = grip(freshSave()), g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) }; g.area = 'dungeon';
  const d = driver(g); Object.assign(g.player, { x: .1, y: 10 }); d.step(-1, 0, true); for (let i = 0; i < 30; i++) d.step(-1, 0); assert.equal(g.wallCling, null, 'the map\'s edge');
  g.map.tiles[10 * 32 + 5].blocked = true; g.map.tiles[10 * 32 + 5].kind = 'wall'; Object.assign(g.player, { x: 3.6, y: 9.4 }); d.idle(800);
  d.step(1, 0, true); for (let i = 0; i < 30 && !g.wallCling; i++) d.step(1, 0); assert.ok(g.wallCling, 'a dungeon wall is held'); assert.equal(g.wallCling.lifted, false, 'with no height of its own on a flat floor');
  assert.equal(g.skyAir, null); const hp = g.player.hp; d.step(0, 0, true); for (let i = 0; i < 60; i++) d.step(); assert.equal(g.player.hp, hp, 'and no fall off it');
});

test('a hold is still hittable: body blows land on a Wayfarer holding a low wall', () => {
  const { g } = plain(shaft), d = driver(g), p = g.player; clingRight(g, d); assert.ok(g.wallCling);
  const foe = g.createEnemyFromSpawn({ id: 'brute', kind: 'rootBrute', x: p.x - .6, y: p.y, traits: [] }); Object.assign(foe, { damage: 5, cooldown: 0, hp: 500, maxHp: 500 });
  let t = d.now(); const hp = p.hp; for (let i = 0; i < 120 && p.hp === hp; i++) { t += DT; g.enemies = [foe]; g.update(DT / 1000, inp(0, 0), t); }
  assert.ok(p.hp < hp, 'struck on the wall');
});

// A blocked natural tile (rock, a tree) in a generated landscape section with flat open ground on its west: [rx, ry, tx, ty].
function naturalWall(seed) {
  for (let rx = 1; rx <= 12; rx++) for (let ry = -6; ry <= 6; ry++) {
    const s = grip(freshSave()); s.seed = seed; Object.assign(s.session, { area: 'overworld', rx, ry, x: 16, y: 16 }); const g = new Game(s, 0);
    if (!g.map.landscape || g.map.pentagon) continue;
    for (let ty = 6; ty < 26; ty++) for (let tx = 8; tx < 24; tx++) {
      const t = g.map.tiles[ty * W + tx]; if (!g.clingSurface(t, 0) || !t.blocked || t.pentagon) continue;
      const open = [-1, -2, -3].every((k) => { const q = g.map.tiles[ty * W + tx + k], a = g.map.tiles[(ty - 1) * W + tx + k], b = g.map.tiles[(ty + 1) * W + tx + k]; return [q, a, b].every((u) => u && !u.blocked && !u.slope && !u.structure && !u.buildingId && !u.perch && (u.elev || 0) === (q.elev || 0)) && !['lava', 'abyss', 'canyon', 'river'].includes(q.kind); });
      if (open && [-1, -2, -3].every((k) => (g.map.tiles[ty * W + tx + k].elev || 0) === (g.map.tiles[ty * W + tx - 1].elev || 0))) return { rx, ry, tx, ty };
    }
  }
  return null;
}
function atNatural(seed, spot) {
  const s = grip(freshSave()); s.seed = seed; Object.assign(s.session, { area: 'overworld', rx: spot.rx, ry: spot.ry, x: spot.tx - 1.6, y: spot.ty - .75 });
  const g = new Game(s, 0); g.enemies = []; g.player.x = spot.tx - 1.6; g.player.y = spot.ty - .75; return { s, g };
}

test('save and resume while holding: the same hold, at the same place and height; a wall gone on reload sets the Wayfarer down unhurt', () => {
  const seed = 'GRIP-NATURAL', spot = naturalWall(seed); assert.ok(spot, 'a rock beside open ground');
  for (const dt of [DT, 50]) {
    const { s, g } = atNatural(seed, spot), d = driver(g, 1000, dt), p = g.player;
    d.step(1, 0, true); for (let i = 0; i < 40 && !g.wallCling; i++) d.step(1, 0); assert.ok(g.wallCling, 'holding the rock'); d.idle(300);
    const before = { x: p.x, y: p.y, sky: g.skyAir, cling: g.savedWallCling() };
    g.exportSnapshot(d.now()); const saved = migrateSave(structuredClone(s)); assert.deepEqual(saved.session.playerRuntime.wallCling, before.cling, 'additive, in the player\'s runtime');
    assert.equal(saved.version, 14);
    const r = new Game(structuredClone(saved), d.now() + 5000); r.enemies = []; const rd = driver(r, d.now() + 5000, dt);
    assert.deepEqual({ x: r.player.x, y: r.player.y, sky: r.skyAir, cling: r.savedWallCling() }, before, 'exactly as saved');
    rd.idle(3000); assert.ok(r.wallCling && r.player.x === before.x, 'and it holds on');
    rd.step(0, 0, true); assert.ok(r.wallKick && r.wallKick.x === -1, 'the kick after a reload');
    // Mid-kick: the kick resumes with what it had left.
    rd.step(); r.exportSnapshot(rd.now()); const mid = migrateSave(structuredClone(r.save)), k = mid.session.playerRuntime.wallKick;
    assert.ok(k && k.x === -1 && k.firm > 0 && k.firm < WALL_CLING.kick.firm, 'a kick saved mid-air');
    const r2 = new Game(structuredClone(mid), rd.now() + 100); assert.deepEqual(r2.wallKick, { x: k.x, y: k.y, firm: k.firm, anchor: k.anchor }); assert.equal(r2.player.x, r.player.x);
  }
  // A saved hold whose wall is not beside the Wayfarer on reload (here: the save names another tile) cannot be kept: it is dropped.
  const { s, g } = atNatural(seed, spot), d = driver(g), p = g.player, hp = p.hp;
  d.step(1, 0, true); for (let i = 0; i < 40 && !g.wallCling; i++) d.step(1, 0); assert.ok(g.wallCling);
  g.exportSnapshot(d.now()); const saved = migrateSave(structuredClone(s)); saved.session.playerRuntime.wallCling.wall += 1;
  const r = new Game(structuredClone(saved), d.now() + 100), rd = driver(r, d.now() + 100); r.enemies = [];
  assert.equal(r.wallCling, null, 'that wall is not beside them'); assert.equal(r.skyAir, null); assert.ok(!(rd.now() < r.jumpUntil), 'down on the ground');
  rd.idle(500); assert.equal(r.player.hp, hp, 'unhurt'); assert.equal(r.player.x, p.x); assert.ok(footprintOpen(r.map, W, r.player.x, r.player.y, true));
});

test('pause while holding: the hold and the jump\'s clock wait, and go on unchanged', () => {
  const { g } = plain(shaft), d = driver(g), p = g.player; clingRight(g, d);
  const left = g.jumpUntil - d.now(); g.setPaused(true, d.now()); g.setPaused(false, d.now() + 60000);
  assert.equal(g.jumpUntil - (d.now() + 60000), left, 'shifted by the pause'); const r = driver(g, d.now() + 60000); r.idle(1000); assert.ok(g.wallCling); assert.equal(p.x, g.wallCling.x);
});

test('death clears the hold', () => {
  const { g } = plain(shaft), d = driver(g); clingRight(g, d); assert.ok(g.wallCling);
  g.clearCarriedStates(); assert.equal(g.wallCling, null); assert.equal(g.wallKick, null);
});

test('deterministic: the same presses climb the same way to the same place', () => {
  const trace = () => { const { g } = plain(shaft), d = driver(g), p = g.player, out = []; clingRight(g, d);
    for (let k = 0; k < 5; k++) { d.step(0, 0, k % 2 === 0 ? true : false); for (let i = 0; i < 45; i++) { d.step(i > 30 ? 1 : 0, 0, i === 20); out.push(`${p.x.toFixed(6)},${p.y.toFixed(6)},${g.skyAir},${g.wallCling?.z ?? '-'}`); } }
    return out.join('|'); };
  assert.equal(trace(), trace());
});

// Roof decks (roof-decks.ts) and the Rift Step roof edge (release 917): a hold on a house's wall never wedges the Wayfarer in it,
// never takes them through it from inside, and a Rift Step off a hold lands clear.
function shack() {
  const s = grip(freshSave()); s.seed = 'ROOF'; Object.assign(s.session, { area: 'overworld', rx: -2, ry: 0, x: 16, y: 16 });
  const g = new Game(s, 0); g.enemies = []; const d = roofDeckById(g.map, 'shack--2-0'); assert.ok(d); return { s, g, d };
}
const free = (g) => !!g.roofDeck || footprintOpen(g.map, W, g.player.x, g.player.y);

test('roof decks: from inside a house a jump never holds its walls (never up through the roof)', () => {
  const { g, d } = shack(), cells = d.cells.map((i) => [i % W, Math.floor(i / W)]); let tried = 0;
  for (const [cx, cy] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const dr = driver(g); g.wallCling = null; g.wallKick = null; g.jumpUntil = 0; g.skyAir = null; g.setRoofDeck(null);
    g.player.x = cx - .5 + .0; g.player.y = cy - .75 + .5; if (!footprintOpen(g.map, W, g.player.x, g.player.y)) continue;
    tried++; dr.step(dx, dy, true); for (let i = 0; i < 30; i++) dr.step(dx, dy); assert.equal(g.wallCling, null, `inside at ${cx},${cy} pushing ${dx},${dy}`);
    assert.equal(g.roofDeck, null, 'never onto the roof from inside');
  }
  assert.ok(tried >= 20, `${tried} pushes inside`);
});

// A deck's side tile nearest the side's middle with a 3-wide, 4-deep yard outside it (as roof-decks-walkoff.test.ts), opened flat.
function yard(g, d, dx, dy) {
  const cells = d.cells.map((i) => [i % W, Math.floor(i / W)]), edge = cells.filter(([x, y]) => !d.cells.includes((y + dy) * W + x + dx));
  edge.sort((a, b) => dx ? a[1] - b[1] : a[0] - b[0]); const mid = Math.floor(edge.length / 2);
  for (const [ex, ey] of edge.map((e, i) => [Math.abs(i - mid), e]).sort((a, b) => a[0] - b[0]).map((q) => q[1])) {
    const tiles = []; let ok = true;
    for (let k = 1; k <= 4 && ok; k++) for (let l = -1; l <= 1 && ok; l++) { const x = ex + dx * k + (dx ? 0 : l), y = ey + dy * k + (dy ? 0 : l), t = g.map.tiles[y * W + x];
      if (x < 1 || y < 1 || x > W - 2 || y > W - 2 || t.buildingId || t.structure) ok = false; else tiles.push(t); }
    if (ok && g.map.tiles[ey * W + ex].doorSide == null) { for (const t of tiles) Object.assign(t, { kind: 'ash', blocked: false, elev: d.base, slope: false, environment: undefined, perch: undefined }); return { ex, ey }; }
  }
  return null;
}
test('roof decks: holding a house\'s wall from the yard, kicking, letting go or Rift Stepping never leaves the Wayfarer in the wall', () => {
  const sides = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] }; let held = 0, cases = 0;
  for (const [name, [dx, dy]] of Object.entries(sides)) for (const end of ['kick', 'letGo', 'rift']) {
    const { g, d } = shack(), y = yard(g, d, dx, dy); if (!y) continue;
    if (end === 'rift') { g.save.perception.aperture = 90; g.save.materials.lumenDust = 50; learnRank(g.save, 'rift'); g.save.magicSkills.selected = 'rift-step'; }
    const dr = driver(g), p = g.player; p.x = y.ex + dx * 1.2; p.y = y.ey + dy * 1.2 - .25; assert.ok(footprintOpen(g.map, W, p.x, p.y), `${name}: starts in the open`); cases++;
    dr.step(-dx, -dy, true); for (let i = 0; i < 40 && !g.wallCling && dr.now() < g.jumpUntil; i++) dr.step(-dx, -dy);
    if (g.wallCling) held++;
    if (end === 'kick') { dr.idle(500); dr.step(0, 0, true); dr.idle(1200); }
    else if (end === 'letGo') { for (let i = 0; i < 30; i++) dr.step(dx, dy); dr.idle(600); }
    else { g.lastUpdateNow = dr.now(); p.lastMoveVector = { x: dx, y: dy }; riftStep(g, dr.now()); dr.idle(600); }
    assert.ok(free(g), `${name}/${end}: not wedged (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`); assert.equal(g.wallCling, null, `${name}/${end}: down`);
    let moved = 0; const x0 = p.x, y0 = p.y; for (const [mx, my] of [[dx, dy], [-dx, -dy], [dy, dx]]) for (let i = 0; i < 40; i++) { dr.step(mx, my); moved = Math.max(moved, Math.hypot(p.x - x0, p.y - y0)); }
    assert.ok(moved > .5, `${name}/${end}: walks away`);
  }
  assert.ok(cases >= 9 && held >= 6, `${held} of ${cases} held a wall`);
});

test('the Stillworks: holding its formations and pillars never takes the Wayfarer off the floor or into the stone', () => {
  const SEED = 'TIM1', s = grip(freshSave()); s.seed = SEED; const g = new Game(s, 0);
  let at = null; for (let cx = -64; cx <= 64 && !at; cx += PENTAGON.every) for (let cy = -64; cy <= 64 && !at; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) at = { cx, cy };
  const P = pentagonPlan(SEED, at.cx, at.cy, PENTAGON.version), H = () => g.save.consequences.dungeons[`${P.base}:f1`] || {};
  g.save.session.activeDungeonId = pentagonVaultId(P); g.save.session.dungeonReturn = { rx: P.cx, ry: P.cy, x: 16, y: 16 }; g.loadArea('dungeon', false);
  const regent = g.enemies.find((q) => String(q.id).endsWith(':guardian')); regent.hp = 0; regent.dead = true; g.defeatEnemy(regent); H().pentArenaBeast = 'crimsonTyrant';
  const wall = g.map.objects.find((o) => o.kind === 'pentFinaleWall'); g.player.x = wall.inner ? wall.inner.x : wall.x; g.player.y = wall.inner ? wall.inner.y : wall.y + 1;
  assert.ok(g.interact('use', wall.id).ok); assert.equal(g.areaId(), pentagonArenaId(P.base));
  const m = g.map, MW = m.width, MH = m.height, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const floor = new Set(); { const st = [{ x: Math.floor(g.player.x + .5), y: Math.floor(g.player.y + .75) }]; floor.add(st[0].y * MW + st[0].x); while (st.length) { const c = st.pop(); for (const [dx, dy] of N4) { const x = c.x + dx, y = c.y + dy, t = m.tiles[y * MW + x]; if (x < 0 || y < 0 || x >= MW || y >= MH || !t || t.blocked || floor.has(y * MW + x)) continue; floor.add(y * MW + x); st.push({ x, y }); } } }
  const rim = [...floor].filter((i) => N4.some(([dx, dy]) => m.tiles[i + dy * MW + dx]?.blocked)); let held = 0, tried = 0;
  for (let k = 0; k < rim.length; k += Math.max(1, Math.floor(rim.length / 24))) {
    const i = rim[k], tx = i % MW, ty = Math.floor(i / MW), dir = N4.find(([dx, dy]) => m.tiles[i + dy * MW + dx]?.blocked); tried++;
    g.wallCling = null; g.wallKick = null; g.jumpUntil = 0; g.skyAir = null; g.player.hp = 1e6; g.enemies = [];
    g.player.x = tx - .5 + .0; g.player.y = ty - .75 + .1; if (!footprintOpen(m, MW, g.player.x, g.player.y)) { g.player.x = tx - .26; g.player.y = ty - .5 + .01; } if (!footprintOpen(m, MW, g.player.x, g.player.y)) continue;
    const dr = driver(g); dr.step(dir[0], dir[1], true); for (let n = 0; n < 30 && !g.wallCling; n++) dr.step(dir[0], dir[1]); if (g.wallCling) held++;
    dr.idle(400); dr.step(0, 0, true); dr.idle(1200);
    assert.ok(footprintOpen(m, MW, g.player.x, g.player.y), `not in the stone (${g.player.x.toFixed(2)}, ${g.player.y.toFixed(2)})`);
    assert.ok(floor.has(Math.floor(g.player.y + .75) * MW + Math.floor(g.player.x + .5)), 'still on the arena floor'); assert.equal(g.areaId(), pentagonArenaId(P.base));
  }
  assert.ok(tried >= 10 && held >= 1, `${held} of ${tried} rim spots held`);
});

test('the cling pose: Close View faces the wall with both arms up on it (Reduced Motion alike); the standard view draws the grip', () => {
  const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8')), raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
  const asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  const pose = (profile, reducedMotion, nowMs) => { const state = createHeroPoseState(asset), frame = createHeroFrame(asset);
    assert.ok(sampleCloseViewHero(asset, state, { nowMs, reducedMotion, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, action: { kind: 'jump', profile, phase: .5, durationMs: 520, yaw: Math.PI / 2 }, alpha: 1, tint: [1, 1, 1], hitFlash: 0 }, frame));
    return { state, frame: Array.from(frame.positionsNormals) }; };
  const a = pose('cling', false, 2000), b = pose('cling', false, 9000), c = pose('cling', true, 2000), plainJump = pose(undefined, false, 2000);
  assert.equal(a.state.clip, 'derived-cling'); assert.deepEqual(a.frame, b.frame, 'held still: the same pose at any time'); assert.deepEqual(a.frame, c.frame, 'and the same under Reduced Motion');
  assert.notDeepEqual(a.frame, plainJump.frame, 'not the ordinary jump');
  // The game side: Close View's flag comes from wallCling; the drawn height is the hold's (jumpLift adds no arc where it is drawn).
  const { g } = plain(shaft), d = driver(g); clingRight(g, d); assert.equal(jumpLift(g, d.now()), 0);
  const flat = { wallCling: { lifted: false }, jumpUntil: 5000 }; assert.equal(jumpLift(flat, 1000), JUMP.arc);
  const calls = { arc: 0 }, ctx = new Proxy({}, { get: (o, k) => k === 'arc' ? () => { calls.arc++; } : k in o ? o[k] : typeof k === 'string' && /^(create|measure|get)/.test(k) ? () => new Proxy({ width: 1, data: new Uint8ClampedArray(4) }, { get: (q, j) => j in q ? q[j] : () => {} }) : () => {}, set: (o, k, v) => { o[k] = v; return true; } });
  ctx.canvas = { width: 390, height: 844 };
  assert.doesNotThrow(() => render(ctx, g, 390, 844, d.now()));
  assert.ok(calls.arc >= 2, 'hands drawn');
});
