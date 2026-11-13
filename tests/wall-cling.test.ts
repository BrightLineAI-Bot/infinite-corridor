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

// Tim, 2026-11-13: two holds before the feet touch ground (WALL_CLING.maxHolds). Release 929 climbed L2, R3, L3 onto a plateau 4
// up; now the second hold (L2) is the last, so the jump off it reaches a ledge 3 up (shaft3), and the plateau 4 up is out of reach.
const shaft3 = (t) => { if (t.x === 10) t.elev = 6; if (t.x >= 13) t.elev = 3; };
test('jump on the wall kicks off it, away; chained wall jumps between facing walls climb onto a ledge', () => {
  for (const dt of [DT, 1000 / 30, 50]) for (const [build, top] of [[shaft3, 3], [shaft, 0]]) {
  const { g, hp } = plain(build), d = driver(g, 1000, dt), p = g.player; clingRight(g, d);
  const holds = [];
  for (let k = 0; k < 6 && g.wallCling; k++) {
    const from = p.x, side = g.wallCling.nx; d.step(0, 0, true); assert.equal(g.wallCling, null, 'off the wall');
    assert.ok(g.wallKick && g.wallKick.x === -side, 'kicked away from it'); d.step(); assert.ok(side > 0 ? p.x < from : p.x > from, 'moving away');
    for (let i = 0; i < 60 && !g.wallCling && airborne(g, d); i++) d.step();
    if (g.wallCling) holds.push(`${g.wallCling.nx > 0 ? 'R' : 'L'}${g.wallCling.z}`);
  }
  d.idle(500); for (let i = 0; i < 60 && g.fall; i++) d.step();
  assert.deepEqual(holds, ['L2'], 'the second hold a level higher, and the last before the ground (WALL_CLING.maxHolds)');
  assert.equal(elevationAt(g.map, W, p.x, p.y), top, top ? 'up on the ledge' : 'the plateau\'s face refused a third hold: back down to the ground'); assert.ok(!airborne(g, d));
  if (top) assert.equal(p.hp, hp, 'landed, unhurt'); else assert.equal(p.hp, hp - fallDamage(2, g.save.maxHp), 'a fall from the second hold\'s height');
  assert.equal(g.wallHolds, 0, 'the feet on the ground give the holds back');
  assert.ok(footprintOpen(g.map, W, p.x, p.y, true), 'not in a wall');
  }
});

test('letting go high up is a fall from that height', () => {
  const { g, hp } = plain(shaft), d = driver(g), p = g.player; clingRight(g, d);
  d.step(0, 0, true); for (let i = 0; i < 60 && !g.wallCling; i++) d.step();
  assert.equal(g.wallCling?.z, 2); assert.equal(g.wallCling.nx, -1, "the facing cliff"); for (let i = 0; i < 40; i++) d.step(1, 0);
  assert.equal(g.wallCling, null); assert.equal(p.hp, hp - fallDamage(2, g.save.maxHp), 'two levels down (the second hold, the highest: WALL_CLING.maxHolds)');
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

// Tim, 2026-11-13: a Pentagon's OUTER faces may be held now (the Pentagon tests below); its inner walls and parapet never are.
test('a Pentagon\'s inner walls and parapet, the Great Castle, a sealed tower\'s air and the map\'s edge are never held', () => {
  const cases = {
    pentagon: (t) => { if (t.x >= 13) Object.assign(t, { kind: 'pentWall', blocked: true, pentagon: 'wall' }); },
    parapet: (t) => { if (t.x >= 13) Object.assign(t, { kind: 'castleWall', landscape: 'castle', greatBuilding: true, blocked: true, elev: 5, pentagon: 'outer', pentParapet: true }); },
    castle: (t) => { if (t.x >= 13) Object.assign(t, { kind: 'castleWall', landscape: 'castle', greatBuilding: true, blocked: true }); },
    tower: (t) => { if (t.x >= 13) Object.assign(t, { elev: 4, towerAir: true }); },
    water: (t) => { if (t.x >= 13) Object.assign(t, { kind: 'lakeWater', blocked: true }); },
  };
  for (const [name, build] of Object.entries(cases)) { const { g } = plain(build), d = driver(g); clingRight(g, d); assert.equal(g.wallCling, null, name); }
  const rock = plain((t) => { if (t.x >= 13) Object.assign(t, { kind: 'crag', blocked: true }); }), dr = driver(rock.g); clingRight(rock.g, dr); assert.ok(rock.g.wallCling, 'but plain rock is');
  const face = plain((t) => { if (t.x >= 13) Object.assign(t, { kind: 'castleCourt', landscape: 'castle', greatBuilding: true, elev: 5, pentagon: 'outer', pentRoof: true, structure: 'buildingRoof' }); }), df = driver(face.g); clingRight(face.g, df); assert.ok(face.g.wallCling, 'and so is a Pentagon\'s outer face (Tim, 2026-11-13)');
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
    // Mid-kick: the kick resumes with what it had left (saved in its first frame: WALL_CLING.kick.firm is short since 2026-11-13).
    r.exportSnapshot(rd.now()); const mid = migrateSave(structuredClone(r.save)), k = mid.session.playerRuntime.wallKick;
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

// ------------------------------------------------------------------------------------------------ two holds an airtime
// Tim, 2026-11-13: "jump to the wall and cling to it, then jump off and back, jump up and cling to it at the apex of your jump.
// Then you can do that again from the wall and cling to it a second time. Then you can do another jump, but you won't be able to
// cling again. So you get at most two wall clings before you touch the ground, and your feet have to touch the ground before it
// resets." (WALL_CLING.maxHolds; the kick pops off the wall and the stick, held into it, brings the Wayfarer back.)
const tall = (t) => { if (t.x >= 13) t.elev = 6; };
// From a hold: Jump with the stick held into the wall, and hold it there until a hold is taken or the jump ends. Frames used.
function kickBack(g, d, x = 1) { d.step(x, 0, true); let i = 0; for (; i < 80 && !g.wallCling && airborne(g, d); i++) d.step(x, 0); return i; }
test('one wall: hold, kick and come back to it for a second hold a level higher; a third push in the same airtime does nothing', () => {
  assert.equal(WALL_CLING.maxHolds, 2); assert.ok(WALL_CLING.kick.firm > 0 && WALL_CLING.kick.firm * 2 < JUMP.base, 'the kick pops off and leaves time to come back');
  for (const dt of [DT, 50]) {
    const { g, hp } = plain(tall), d = driver(g, 1000, dt), p = g.player; clingRight(g, d);
    assert.deepEqual([g.wallCling?.z, g.wallHolds], [1, 1], 'the first hold');
    const x0 = p.x, frames = kickBack(g, d); assert.ok(g.wallCling, `${dt}: back on the same wall`); assert.deepEqual([g.wallCling.nx, g.wallCling.z, g.wallHolds], [1, 2, 2], 'a level higher, the second hold');
    assert.ok(frames * dt < JUMP.base / 2 + dt, `taken by the jump's top (${frames} frames)`); assert.ok(Math.abs(p.x - x0) < .1, 'at the same wall');
    const msg = g.message; d.step(1, 0, true); assert.equal(g.wallCling, null); let held = false;
    for (let i = 0; i < 80 && (airborne(g, d) || g.fall); i++) { d.step(1, 0); held ||= !!g.wallCling; }
    assert.ok(!held, 'the third push into the wall takes no hold'); assert.ok(g.message === msg || !/hold|grip|cling/i.test(g.message), 'and the Grip says nothing');
    assert.ok(!airborne(g, d) && !g.fall, 'down'); assert.equal(g.playerLevel(), 0); assert.equal(p.hp, hp - fallDamage(2, g.save.maxHp), 'a fall from the second hold\'s height');
    assert.equal(g.wallHolds, 0, 'the feet on the ground give the holds back');
    // ...and a new jump from the ground holds again.
    d.idle(300); d.step(1, 0, true); for (let i = 0; i < 40 && !g.wallCling; i++) d.step(1, 0); assert.deepEqual([g.wallCling?.z, g.wallHolds], [1, 1], 'reset after landing');
  }
});

test('the count resets only on the ground: not on a hold, a kick, a section of air or a let-go; facing walls refuse a third hold too', () => {
  for (const dt of [DT, 50]) {
    // Let go of the first hold and fall: down, so a jump holds again as the first.
    const { g } = plain(tall), d = driver(g, 1000, dt); clingRight(g, d); assert.equal(g.wallHolds, 1);
    d.step(-1, 0); assert.equal(g.wallCling, null); assert.equal(g.wallHolds, 1, 'in the air after letting go: still counted');
    for (let i = 0; i < 60 && (airborne(g, d) || g.fall); i++) d.step(); assert.equal(g.wallHolds, 0, 'on the ground');
    // Facing walls (the stick let go: the kick flies across): first R1, then L2, then the plateau's face refuses a third.
    const f = plain(shaft), fd = driver(f.g, 1000, dt); clingRight(f.g, fd); const seen = [];
    for (let k = 0; k < 4; k++) { if (!f.g.wallCling) break; fd.step(0, 0, true); let held = false; for (let i = 0; i < 80 && airborne(f.g, fd) && !f.g.wallCling; i++) { fd.step(); seen.push(f.g.wallHolds); } held = !!f.g.wallCling; if (!held) break; }
    assert.ok(seen.every((n) => n >= 1 && n <= 2), 'never more than two'); assert.equal(f.g.wallCling, null);
    for (let i = 0; i < 40; i++) fd.step(1, 0); assert.equal(f.g.wallCling, null, 'pushing into the plateau after two holds: none');
  }
});

test('save and resume mid-chain keeps the count: a hold, a kick and a fall saved in the air resume with the holds already taken', () => {
  for (const dt of [DT, 50]) {
    const { s, g } = plain(tall), d = driver(g, 1000, dt); clingRight(g, d); kickBack(g, d); assert.equal(g.wallHolds, 2);
    g.exportSnapshot(d.now()); let saved = migrateSave(structuredClone(s)); assert.equal(saved.session.playerRuntime.wallHolds, 2, 'saved additively beside the hold'); assert.equal(saved.version, 14);
    // The plain() section is rewritten in place, so resume into the same Game's map: a fresh Game keeps the hold only on real ground.
    g.restoreWallCling(saved.session.playerRuntime.wallCling, saved.session.playerRuntime.wallKick, d.now(), saved.session.playerRuntime.wallHolds);
    assert.deepEqual([g.wallCling?.z, g.wallHolds], [2, 2], 'the hold, and its count');
    d.step(1, 0, true); d.step(1, 0); g.exportSnapshot(d.now()); saved = migrateSave(structuredClone(s)); const rt = saved.session.playerRuntime;
    assert.ok(rt.wallKick, 'a kick saved in the air'); assert.equal(rt.wallHolds, 2);
    g.wallHolds = 0; g.restoreWallCling(rt.wallCling, rt.wallKick, d.now(), rt.wallHolds); assert.equal(g.wallHolds, 2, 'the kick resumes with two holds taken');
    let held = false; for (let i = 0; i < 80 && (airborne(g, d) || g.fall); i++) { d.step(1, 0); held ||= !!g.wallCling; } assert.ok(!held, 'so no third');
    // A release 929 save (no count) holding or kicking counts the one it holds; a damaged count is clamped.
    g.restoreWallCling({ z: 1 }, null, d.now(), undefined); assert.equal(g.wallHolds, 1);
    g.restoreWallCling(null, null, d.now(), 99); assert.equal(g.wallHolds, WALL_CLING.maxHolds); g.restoreWallCling(null, null, d.now(), 'x'); assert.equal(g.wallHolds, 0);
  }
  // On a real section: save mid-kick after the second hold, resume in a fresh Game: the same place, kick and count.
  const seed = 'GRIP-NATURAL', spot = naturalWall(seed), { s, g } = atNatural(seed, spot), d = driver(g);
  d.step(1, 0, true); for (let i = 0; i < 40 && !g.wallCling; i++) d.step(1, 0); assert.ok(g.wallCling); kickBack(g, d);
  if (g.wallCling) { assert.equal(g.wallHolds, 2); d.step(1, 0, true); g.exportSnapshot(d.now()); const saved = migrateSave(structuredClone(s));
    const r = new Game(structuredClone(saved), d.now() + 100); assert.equal(r.wallHolds, 2); assert.deepEqual(r.wallKick, g.wallKick ? { ...g.wallKick } : null); assert.equal(r.player.x, g.player.x); }
});

// ------------------------------------------------------------------------------------------------ the Pentagon's outer walls
// Tim, 2026-11-13: cling to the OUTSIDE walls of the Pentagon and wall-jump along them, up to a balcony; never its roof (5 levels
// up), its parapet or a court. Within WALL_CLING.pentagon.near of a Pentagon tile a hold is never over the roof less `below`
// (2), so the jump off it lands at 3 at most: a balcony two under the roof, never the roof nor a balcony one under it (from which
// the roof is one jump). Gliding over it is still death and the drone still fizzles over its walls.
import { regionAt } from '../src/pentagon.ts';
import { gliderForbiddenAt, droneZoneOf, DRONE_FIZZLE, GLIDER_FORBIDDEN } from '../src/vehicle-gates.ts';
import { tileUnder, LANDSCAPE_VERSION, COHERENCE } from '../src/landscape.ts';
const PSEED = 'TIM1', R0 = PENTAGON.roof.elev, CAP = R0 - WALL_CLING.pentagon.below;
let pentAt = null;
const findPentagon = () => pentAt ||= (() => { const s = freshSave(); s.seed = PSEED; const g = new Game(s, 0); for (let cx = -64; cx <= 64; cx += PENTAGON.every) for (let cy = -64; cy <= 64; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) return { cx, cy, V: g.pentagonVersion(cx, cy) }; return null; })();
function pentSection(dx, dy, V = null) {
  const { cx, cy } = findPentagon(), s = grip(freshSave()); s.seed = PSEED; Object.assign(s.session, { area: 'overworld', rx: cx + dx, ry: cy + dy, x: 16, y: 16 });
  if (V != null) s.atlas = { [`${cx + 1},${cy + 1}`]: { landscapeVersion: LANDSCAPE_VERSION, pentVersion: V, coherenceVersion: COHERENCE.version } };
  const g = new Game(s, 0); g.enemies = []; g.map.enemySpawns = []; return { s, g };
}
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Where the Wayfarer stands on tile t: the box's middle over its middle.
const standOn = (g, t) => { g.player.x = t.x; g.player.y = t.y - .19; };
const forbidden = (t) => !!t && (t.pentRoof || t.pentParapet || (t.courtyard && t.pentagon) || ['inner', 'heart', 'wall', 'central', 'court'].includes(t.pentagon));
// Spots beside the outer faces: a tile outside the Pentagon (the land, or `stair` steps) with a cardinal neighbour on an outer face
// or a balcony; `n` points into it.
function faceSpots(g) {
  const out = [], T = g.map.tiles;
  for (const t of T) { if (t.blocked || (t.pentagon && t.pentagon !== 'stair') || t.x < 2 || t.y < 2 || t.x > 29 || t.y > 29) continue;
    for (const [nx, ny] of N4) { const q = T[(t.y + ny) * W + t.x + nx], back = T[(t.y - ny) * W + t.x - nx]; if (!q || !back || back.pentagon && back.pentagon !== 'stair') continue;
      if ((q.pentagon === 'outer' && !q.pentParapet) || q.pentagon === 'balcony') out.push({ t, q, nx, ny }); } }
  return out;
}
// The land round spot t made ground `h` levels up (the land beside a Pentagon can be raised): every non-Pentagon tile within 2.
function raise(g, t, h) { for (let y = t.y - 2; y <= t.y + 2; y++) for (let x = t.x - 2; x <= t.x + 2; x++) { const u = g.map.tiles[y * W + x]; if (!u || u.pentagon || u.greatBuilding) continue; Object.assign(u, { kind: 'grass', blocked: false, elev: h, slope: false }); } }
// One try at the wall from spot `sp`: jump into it; then `plan` for each kick ('back': the stick held into the wall; 'off': let go;
// 'along': along the wall), then a plain jump into the wall again once down. Returns what was seen.
function attempt(g, sp, plan, dt) {
  const d = driver(g, 1000, dt), p = g.player, w = { holds: 0, maxZ: -Infinity, bad: null, maxLevel: -Infinity };
  const look = (tag) => { const u = tileUnder(g.map, W, p.x, p.y); w.holds = Math.max(w.holds, g.wallHolds || 0); if (g.wallCling) w.maxZ = Math.max(w.maxZ, g.wallCling.z);
    w.maxLevel = Math.max(w.maxLevel, g.playerLevel()); if (!w.bad && forbidden(u)) w.bad = `${tag}: on ${u.pentagon}${u.pentRoof ? ' roof' : ''} at ${u.x},${u.y}`; };
  const into = (k) => { d.step(sp.nx, sp.ny, k === 0); look('jump'); for (let i = 0; i < 60 && !g.wallCling && airborne(g, d); i++) { d.step(sp.nx, sp.ny); look('jump'); } };
  into(0);
  for (const how of plan) { if (!g.wallCling) break; const sx = how === 'back' ? sp.nx : how === 'along' ? sp.ny : 0, sy = how === 'back' ? sp.ny : how === 'along' ? sp.nx : 0;
    d.step(sx, sy, true); look('kick'); for (let i = 0; i < 80 && !g.wallCling && (airborne(g, d) || g.fall); i++) { d.step(i * dt > WALL_CLING.kick.firm * 2 && how === 'off' ? sp.nx : sx, sy); look(how); } }
  for (let i = 0; i < 60 && (airborne(g, d) || g.fall || g.wallCling); i++) { d.step(g.wallCling ? -sp.nx : 0, g.wallCling ? -sp.ny : 0); look('down'); }
  d.idle(200); look('settle'); into(0); for (let i = 0; i < 40 && (airborne(g, d) || g.fall || g.wallCling); i++) { d.step(g.wallCling ? -sp.nx : 0, g.wallCling ? -sp.ny : 0); look('again'); }
  d.idle(200); look('end'); w.at = tileUnder(g.map, W, p.x, p.y);
  // never wedged: walking straight off the wall moves them off it, as from any spot stood on by the face
  const x0 = p.x, y0 = p.y; for (let i = 0; i < 30; i++) d.step(-sp.nx, -sp.ny); w.open = Math.hypot(p.x - x0, p.y - y0) > .5 || footprintOpen(g.map, W, x0, y0, true); look('away'); return w;
}

test('the Pentagon: its outer wall is held from the land; two holds on it climb a level each and the jump off the second comes back down', () => {
  const at = findPentagon(); assert.ok(at && at.V >= 7, 'a Pentagon with a roof'); let tried = 0;
  for (const dt of [DT, 50]) for (const [dx, dy] of [[0, 1], [-1, 0]]) { const { g } = pentSection(dx, dy), sp = faceSpots(g).find((q) => q.q.pentRoof && !q.t.pentagon); assert.ok(sp, 'a spot by the face');
    raise(g, sp.t, 0); const hp = g.player.hp; standOn(g, sp.t); const d = driver(g, 1000, dt);
    d.step(sp.nx, sp.ny, true); for (let i = 0; i < 40 && !g.wallCling; i++) d.step(sp.nx, sp.ny);
    assert.ok(g.wallCling, `held the outer face at ${sp.q.x},${sp.q.y}`); assert.ok(g.map.tiles[g.wallCling.wall].pentagon === 'outer'); assert.equal(g.wallCling.z, 1); tried++;
    const back = (sx, sy) => { d.step(sx, sy, true); for (let i = 0; i < 80 && !g.wallCling && airborne(g, d); i++) d.step(sx, sy); };
    back(sp.nx, sp.ny); assert.equal(g.wallCling?.z, 2, 'the second hold'); assert.equal(g.wallHolds, 2);
    back(sp.nx, sp.ny); assert.equal(g.wallCling, null, 'no third'); for (let i = 0; i < 80 && (airborne(g, d) || g.fall); i++) d.step(sp.nx, sp.ny);
    const u = tileUnder(g.map, W, g.player.x, g.player.y); assert.ok(!u.pentagon, 'back on the land'); assert.equal(g.player.hp, hp - fallDamage(2, g.save.maxHp));
    assert.ok(footprintOpen(g.map, W, g.player.x, g.player.y, true), 'not in the wall'); }
  assert.equal(tried, 4);
});

test('the Pentagon: a chain up a balcony\'s side lands on it (two under the roof); one a level under the roof is out of reach', () => {
  const at = findPentagon(), P = pentagonPlan(PSEED, at.cx, at.cy, at.V), b = P.ledges.balconies.find((q) => q.elev === R0 - 2); assert.ok(b, 'a balcony two under the roof');
  for (const dt of [DT, 50]) for (const lower of [false, true]) {
    const { g } = pentSection(Math.floor(b.out.gx / 32) - 1, Math.floor(b.out.gy / 32) - 1);
    if (lower) for (const t of g.map.tiles) if (t.pentBalcony === b.key) t.elev = R0 - 1; // as a balcony one level under the roof
    const sp = faceSpots(g).find((q) => q.q.pentBalcony === b.key && !q.t.pentagon && !q.t.blocked); assert.ok(sp, 'land beside the balcony'); raise(g, sp.t, 0);
    const hp = g.player.hp; standOn(g, sp.t); const d = driver(g, 1000, dt), p = g.player;
    d.step(sp.nx, sp.ny, true); for (let i = 0; i < 40 && !g.wallCling; i++) d.step(sp.nx, sp.ny); assert.ok(g.wallCling, 'held the balcony\'s side'); assert.equal(g.map.tiles[g.wallCling.wall].pentBalcony, b.key);
    for (let k = 0; k < 3; k++) { d.step(sp.nx, sp.ny, true); for (let i = 0; i < 80 && !g.wallCling && (airborne(g, d) || g.fall); i++) d.step(sp.nx, sp.ny); }
    for (let i = 0; i < 80 && (airborne(g, d) || g.fall || g.wallCling); i++) d.step(sp.nx, sp.ny); d.idle(200);
    const u = tileUnder(g.map, W, p.x, p.y);
    if (!lower) { assert.equal(u.pentBalcony, b.key, `${dt}: up on the balcony`); assert.equal(g.playerLevel(), R0 - 2); assert.equal(p.hp, hp, 'unhurt'); assert.equal(g.wallHolds, 0); }
    else { assert.ok(!u.pentagon, `${dt}: one under the roof: not reached, back on the land`); assert.ok(g.playerLevel() < R0 - 1); }
    assert.ok(footprintOpen(g.map, W, p.x, p.y, true), 'not in the wall');
  }
});

test('the Pentagon: from every spot along its outer wall, on land at any height, no hold, kick or kick-then-jump reaches the roof, parapet or a court', () => {
  const t0 = Date.now(), plans = [['back', 'back', 'back'], ['off', 'back'], ['along', 'back']], tally = { runs: 0, held: 0, refusedHigh: 0, onBalcony: 0, heights: {} }, bad = [];
  const at = findPentagon();
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue; const probe = pentSection(dx, dy).g, spots = faceSpots(probe);
    // every spot by a balcony or on the stair, and every sixth other spot; two land heights each, in turn over the six
    spots.forEach((sp, k) => { if (k % 6 && sp.q.pentagon !== 'balcony' && !sp.t.pentagon) return;
      const all = [null, 0, 1, 2, CAP + 1, R0 - 1], heights = sp.t.pentagon ? [null] : [all[k % 6], all[(k + 3) % 6]]; // the land's own height, or raised up to one under the roof
      for (const h of heights) { const plan = plans[(k + (h ?? 0)) % plans.length], dt = (k + (h ?? 0)) % 4 ? 50 : DT, { g } = pentSection(dx, dy), t = g.map.tiles[sp.t.y * W + sp.t.x];
        if (h != null) raise(g, t, h); const ground = t.elev || 0; standOn(g, t);
        const w = attempt(g, sp, plan, dt), tag = `${dx},${dy} ${t.x},${t.y}→${sp.q.x},${sp.q.y} land ${ground} ${plan.join('/')} @${Math.round(1000 / dt)}fps`;
        tally.runs++; tally.heights[ground] = (tally.heights[ground] || 0) + 1; if (w.holds) tally.held++; if (w.at?.pentBalcony) tally.onBalcony++;
        if (w.holds > WALL_CLING.maxHolds) bad.push(`${tag}: ${w.holds} holds`);
        if (w.holds && w.maxZ > CAP + 1e-6) bad.push(`${tag}: a hold at ${w.maxZ}`);
        if (ground > CAP) { if (w.holds) bad.push(`${tag}: held from land over the cap`); else tally.refusedHigh++; }
        // the roof one jump up from land a level under it is the land's own way up, not the cling's (no hold taken: checked above)
        if (w.bad && (w.holds || ground < R0 - 1)) bad.push(`${tag}: ${w.bad}`);
        if (!w.open) bad.push(`${tag}: wedged at ${g.player.x.toFixed(2)},${g.player.y.toFixed(2)}`); } });
  }
  assert.deepEqual(bad.slice(0, 12), [], JSON.stringify(tally));
  assert.ok(tally.runs >= 60 && tally.held >= 20 && tally.refusedHigh >= 10 && tally.onBalcony >= 1, JSON.stringify(tally)); assert.ok(Date.now() - t0 < 60000);
});

test('the Pentagon: an old Pentagon (no roof) is held from the land too, and its walls never let a cling into a court or into the wall', () => {
  const bad = []; let held = 0;
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, -1]]) { const probe = pentSection(dx, dy, 6).g; assert.ok(!probe.map.pentagon?.roof, 'version 6: no roof');
    faceSpots(probe).filter((_, k) => k % 7 === 0).forEach((sp, k) => { const { g } = pentSection(dx, dy, 6), t = g.map.tiles[sp.t.y * W + sp.t.x]; raise(g, t, k % 3); standOn(g, t);
      const w = attempt(g, sp, ['back', 'off'], k % 2 ? 50 : DT); if (w.holds) held++; if (w.bad) bad.push(`${t.x},${t.y}: ${w.bad}`); if (!w.open) bad.push(`${t.x},${t.y}: wedged`); if (w.maxZ > CAP + 1e-6) bad.push(`${t.x},${t.y}: hold at ${w.maxZ}`); }); }
  assert.deepEqual(bad, []); assert.ok(held >= 3, `${held} held`);
});

test('the Pentagon: never from its roof; the glide over it is still death and the drone still fizzles over its walls', () => {
  // From the roof (standing on it) its parapet and the drop at its edge are never held.
  const { g } = pentSection(0, 1), T = g.map.tiles;
  const edge = T.find((t) => t.pentRoof && N4.some(([a, b]) => { const q = T[(t.y + b) * W + t.x + a]; return q && !q.pentagon && t.x > 2 && t.y > 2 && t.x < 29 && t.y < 29; }));
  const nearParapet = T.find((t) => t.pentRoof && N4.some(([a, b]) => T[(t.y + b) * W + t.x + a]?.pentParapet) && t.x > 2 && t.y > 2 && t.x < 29 && t.y < 29);
  for (const t of [edge, nearParapet]) { assert.ok(t); for (const [nx, ny] of N4) { const { g: h } = pentSection(0, 1); standOn(h, h.map.tiles[t.y * W + t.x]); const d = driver(h);
    d.step(nx, ny, true); for (let i = 0; i < 40; i++) { d.step(nx, ny); assert.equal(h.wallCling, null, `from the roof at ${t.x},${t.y} toward ${nx},${ny}`); } } }
  // The rules the hold leaves alone: every Pentagon tile is still death to a glide, and its walls (blocked) still fizzle the drone.
  assert.deepEqual(GLIDER_FORBIDDEN.field, 'pentagon'); assert.equal(DRONE_FIZZLE.zones[0].id, 'pentagon'); assert.deepEqual(DRONE_FIZZLE.zones[0].match, { pentagon: true, blocked: true });
  for (const t of T) if (t.pentagon) { assert.ok(gliderForbiddenAt(g.map, W, t.x - .5, t.y - .69), `glide over ${t.x},${t.y}`); if (t.blocked) assert.equal(droneZoneOf(t)?.id, 'pentagon'); }
  // A glide toward its outer face beside a hold's spot dies there, as before.
  const sp = faceSpots(g).find((q) => q.q.pentRoof && !q.t.pentagon), s2 = pentSection(0, 1), G = s2.g; G.save.glider = true; G.message = '';
  standOn(G, G.map.tiles[(sp.t.y - sp.ny * 2) * W + sp.t.x - sp.nx * 2]); G.glide = { z: 8, vx: 0, vy: 0, open: true, told: false }; const d = driver(G);
  const deaths = G.save.worldFlags?.deaths || 0; for (let i = 0; i < 120 && (G.save.worldFlags?.deaths || 0) === deaths; i++) d.step(sp.nx, sp.ny);
  assert.equal(G.save.worldFlags?.deaths || 0, deaths + 1, 'the glide over the Pentagon ends in death'); assert.ok(G.save.narrative.journal.some((j) => j.recordId === GLIDER_FORBIDDEN.journal), 'the glider\'s death, journalled'); assert.equal(G.wallCling, null);
  // And the drone, called up, still takes Jump: no hold on the Pentagon's face either.
  const s3 = pentSection(0, 1), D = s3.g; D.save.mech = { built: true, active: true, mode: 'drone', fuel: 5, plate: 500, healCd: 0, rocketCd: 0 }; assert.ok(D.droneUp());
  standOn(D, D.map.tiles[sp.t.y * W + sp.t.x]); const dd = driver(D); dd.step(sp.nx, sp.ny, true); for (let i = 0; i < 40; i++) dd.step(sp.nx, sp.ny); assert.equal(D.wallCling, null, 'the drone\'s Jump');
});
