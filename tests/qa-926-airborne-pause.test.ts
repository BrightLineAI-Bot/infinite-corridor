// QA pass on release 926: pausing (the app backgrounding or any overlay opening) or reloading never moves a Wayfarer who is in the
// air, nor one standing on a roof deck's edge. Before, recoverPosition (every pause) and loadArea's relocateIfStranded (every
// reload) treated a fall, glide, jump or outdoor drone lift over a blocked tile as "stranded" and moved it up to two tiles onto
// "safe ground": a fall into a river then ended alive on the bank, and a pause at a roof's edge dropped the Wayfarer off the roof.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, AIRBORNE_HOLD, footprintOpen, mapWidth } from '../src/game.ts';
import { tileUnder } from '../src/landscape.ts';
import { roofDeckById } from '../src/roof-decks.ts';
import { DRONE, setMechMode } from '../src/vehicle-gates.ts';

const W = 32, ROW = 30;
const inp = (x = 0, y = 0) => ({ state: { x, y }, consume: () => false, held: () => false });
function wayfarer(seed = 'ROOF', rx = -2, ry = 0, { drone = false } = {}) {
  const s: any = freshSave(); s.seed = seed; s.maxHp = 100; s.consumables.submersible = 1; s.glider = true;
  Object.assign(s.session, { area: 'overworld', rx, ry, x: 16, y: 16 });
  const g: any = new Game(s, 0); g.enemies = []; g.map.enemySpawns = []; g.riftAimView = () => false;
  if (drone) { setMechMode(s, 'drone'); g.useConsumable('submersible', 0); s.mech.fuel = DRONE.carry; }
  g.update(1 / 60, inp(), 4000); g.enemies = []; g.player.hp = g.player.maxHp; return g;
}
const set = (g: any, x: number, y: number, o: any) => Object.assign(g.map.tiles[y * W + x], { kind: 'ash', blocked: false, elev: 0, slope: false, environment: undefined, structure: undefined, buildingId: undefined, ...o });
// A 2-level ledge (x 1..4) over a river (x 5..9, blocked and lethal) and open ash beyond.
function ledgeOverRiver(g: any) { for (let y = ROW - 2; y <= ROW + 1; y++) for (let x = 1; x <= 20; x++) set(g, x, y, x <= 4 ? { elev: 2 } : x <= 9 ? { kind: 'river', blocked: true } : {}); }
const blockedUnder = (g: any) => !footprintOpen(g.map, W, g.player.x, g.player.y, false, false, false, true);
const pause = (g: any, t: number, ms = 3000) => { g.setPaused(true, t); g.setPaused(false, t + ms); return t + ms; };

test('a pause mid-fall over a river keeps the Wayfarer where they are, and the fall still drowns them', () => {
  for (const at of [30, 36, 44]) {
    const g = wayfarer(); ledgeOverRiver(g); g.player.x = 3.6; g.player.y = ROW - .25;
    let t = 5000; const d0 = g.save.worldFlags.deaths || 0, msgs: string[] = [];
    for (let i = 0; i < 240; i++) {
      if (i === at) {
        assert.ok(g.fall, `frame ${at}: falling`); assert.ok(blockedUnder(g), 'over the blocked river');
        const before = { x: g.player.x, y: g.player.y }; t = pause(g, t);
        assert.deepEqual({ x: g.player.x, y: g.player.y }, before, 'the pause did not move the falling Wayfarer');
        assert.ok(g.fall, 'still falling after the pause');
      }
      t += 1000 / 60; g.update(1 / 60, inp(i < 30 ? 1 : 0), t); g.enemies = []; msgs.push(g.message);
    }
    assert.ok((g.save.worldFlags.deaths || 0) > d0, `paused at frame ${at}: the river still claims the fall`);
    assert.ok(!msgs.some((m) => /settles you onto nearby stable ground/.test(m || '')), 'never "settled" onto the bank');
  }
});

test('a pause while gliding, jumping or on an outdoor drone over a blocked tile does not relocate', () => {
  const g = wayfarer('ROOF', -2, 0, { drone: true }); ledgeOverRiver(g); const t = 9000;
  const place = () => { g.player.x = 6.5; g.player.y = ROW - .25; assert.ok(blockedUnder(g)); };
  place(); g.glide = { z: 2, vx: 0, vy: 0, open: true, told: true }; pause(g, t);
  assert.deepEqual([g.player.x, g.player.y], [6.5, ROW - .25], 'gliding'); g.glide = null;
  place(); g.jumpUntil = t + 300; pause(g, t);
  assert.deepEqual([g.player.x, g.player.y], [6.5, ROW - .25], 'jumping'); g.jumpUntil = -1e9;
  place(); g.droneLift = { base: 0, z: 2, vz: 0 }; pause(g, t);
  assert.deepEqual([g.player.x, g.player.y], [6.5, ROW - .25], 'on the drone outdoors'); g.droneLift = null;
  // A grounded Wayfarer wedged in the river is still recovered, and so is one whose jump clock is damaged (AIRBORNE_HOLD).
  place(); pause(g, t); assert.ok(!blockedUnder(g), 'grounded and wedged: settled onto stable ground');
  assert.match(g.message, /settles you onto nearby stable ground/);
  place(); g.jumpUntil = t + AIRBORNE_HOLD.jumpMs + 5000; pause(g, t); assert.ok(!blockedUnder(g), 'a jump clock far past any jump is not a jump');
});

test('a save mid-fall over a real river reloads in place and the fall still drowns (seed QA1, 34,-56)', () => {
  const g = wayfarer('QA1', 34, -56); const w = mapWidth(g.map, 'overworld');
  // A river tile (blocked, lethal) at least one tile from any edge.
  const river = g.map.tiles.find((q: any) => q.kind === 'river' && q.blocked && q.x > 1 && q.y > 1 && q.x < w - 2 && q.y < w - 2);
  assert.ok(river, 'the section has a river');
  g.player.x = river.x; g.player.y = river.y - .25; assert.equal(tileUnder(g.map, w, g.player.x, g.player.y)?.kind, 'river');
  const ground = g.elevationHere(g.player.x, g.player.y); g.fall = { z: ground + .9, vz: -1, from: ground + 1, scale: 1, t: .05 };
  const t = 6000, snap = structuredClone(g.exportSnapshot(t));
  const b: any = new Game(snap, t); b.enemies = []; b.riftAimView = () => false;
  assert.deepEqual([b.player.x, b.player.y], [river.x, river.y - .25], 'reloaded in the air where it was saved');
  assert.ok(b.fall, 'the fall resumes'); assert.notEqual(b.message, 'The Corridor settles you onto nearby stable ground. Your journey remains unchanged.');
  const d0 = b.save.worldFlags.deaths || 0; let n = t;
  for (let i = 0; i < 120; i++) { n += 1000 / 60; b.update(1 / 60, inp(), n); b.enemies = []; }
  assert.ok((b.save.worldFlags.deaths || 0) > d0, 'the river claims the resumed fall');
  // Grounded in the river (a genuinely wedged save) is still moved to the bank on load.
  g.fall = null; const s2 = structuredClone(g.exportSnapshot(t)); const c: any = new Game(s2, t);
  assert.ok(footprintOpen(c.map, w, c.player.x, c.player.y, false, false, false, true), 'a grounded wedged save is recovered');
});

test('a pause on a roof deck, at any standing spot to its very edge, keeps the Wayfarer on the roof', () => {
  const g = wayfarer(); const deck = roofDeckById(g.map, 'shack--2-0'); assert.ok(deck, 'the shack has a roof deck');
  let t = 6000, tried = 0;
  for (const c of deck.cells) for (const ox of [-.45, 0, .45]) for (const oy of [-.45, 0, .45]) {
    g.fall = null; g.glide = null; g.jumpUntil = -1e9; g.player.hp = g.player.maxHp;
    g.player.x = c % W + ox; g.player.y = Math.floor(c / W) - .25 + oy; g.setRoofDeck(deck);
    for (let i = 0; i < 3; i++) { t += 1000 / 60; g.update(1 / 60, inp(), t); g.enemies = []; }
    if (g.standingDeck()?.id !== deck.id || g.fall) continue;
    tried++; const at = [g.player.x, g.player.y], hp = g.player.hp; t = pause(g, t, 2000);
    assert.deepEqual([g.player.x, g.player.y], at, `paused at ${at}: not moved`);
    assert.equal(g.standingDeck()?.id, deck.id, `paused at ${at}: still on the roof`);
    for (let i = 0; i < 30; i++) { t += 1000 / 60; g.update(1 / 60, inp(), t); g.enemies = []; }
    assert.equal(g.player.hp, hp, `paused at ${at}: no fall damage`);
  }
  assert.ok(tried > 50, `enough standing spots tried (${tried})`);
});
