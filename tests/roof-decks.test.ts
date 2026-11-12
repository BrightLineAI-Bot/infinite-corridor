// Roof decks (Tim, 2026-11-12: "explore the 3D space with existing mobility... get on top of shacks and houses if you can reach the
// height... Rift Step aimed at a point, which can kill you by falling... nothing broken: there must always be a way down").
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, footprintOpen, isBodyBlow } from '../src/game.ts';
import { ROOF_DECKS, roofDeckIndex, roofDeckAt, roofDeckById, normalizeRoofDeck } from '../src/roof-decks.ts';
import { fallDamage } from '../src/landscape.ts';
import { generateRegion } from '../src/world.ts';
import { render, roofCutawayFor } from '../src/renderer.ts';
import { learnRank, learnMod, chooseCap, BRANCHES, RIFT, RIFT_AIM, riftStep, riftStepTo } from '../src/constellation.ts';
import { APERTURE_SKILLS } from '../src/items.ts';
import { DRONE, setMechMode } from '../src/vehicle-gates.ts';
import { createCombatant } from '../src/combat.ts';

const SEED = 'ROOF', W = 32;
// Sections of seed ROOF: a shelter's shack (-2,0), a hamlet's houses side by side (1,-4), a ruin district (2,3) with 2- and 3-level houses.
const SHACK = { rx: -2, ry: 0, id: 'shack--2-0' }, HUTS = { rx: 1, ry: -4, a: 'hamlet-1--4-hut-0', b: 'hamlet-1--4-hut-2' }, DISTRICT = { rx: 2, ry: 3, low: 'district-building-2-3-0', high: 'district-building-2-3-2' };
function at(sec, extra = (s) => {}) {
  const s = freshSave(); s.seed = SEED; s.maxHp = 100; extra(s); Object.assign(s.session, { area: 'overworld', rx: sec.rx, ry: sec.ry, x: 16, y: 16 });
  const g = new Game(s, 0); g.enemies = []; g.player.hp = g.save.maxHp; return { s, g };
}
const tile = (g, x, y) => g.map.tiles[y * W + x];
const open = (g, x, y, elev) => { const t = tile(g, x, y); Object.assign(t, { kind: 'ash', blocked: false, elev, slope: false, environment: undefined }); };
// Stand the Wayfarer with their feet in the middle of tile (x, y).
const stand = (g, x, y) => { g.player.x = x; g.player.y = y - .25; };
const inp = (x, y, jump = false, hold = false) => { let j = jump; return { state: { x, y }, consume: (k) => k === 'jump' && j ? (j = false, true) : false, held: (k) => k === 'jump' && hold }; };
function driver(g, t0 = 1000) { let t = t0;
  const step = (x, y, jump = false, hold = false) => { t += 50; g.update(.05, inp(x, y, jump, hold), t); };
  return { step, walk: (x, y, ms) => { for (let i = 0; i < ms / 50; i++) step(x, y); }, idle: (ms) => { for (let i = 0; i < ms / 50; i++) step(0, 0); }, now: () => t }; }
// A row through the middle of a deck with its west wall cell (x0) and the two tiles outside it to the west.
function westApproach(g, d) {
  const rows = new Map(); for (const i of d.cells) { const x = i % W, y = Math.floor(i / W); if (!rows.has(y) || x < rows.get(y)) rows.set(y, x); }
  const ys = [...rows.keys()].sort((a, b) => a - b), y = ys[Math.floor(ys.length / 2)], x0 = rows.get(y);
  return { y, x0 };
}
function eastEdge(g, d, y) { let x1 = -1; for (const i of d.cells) if (Math.floor(i / W) === y) x1 = Math.max(x1, i % W); return x1; }

test('decks are read from the houses a section already has, by kind, and nothing is written to the map', () => {
  assert.deepEqual(ROOF_DECKS.levels, { shack: 2, hut: 2, district: [2, 3, 3] }); assert.equal(ROOF_DECKS.safeDrop, 3);
  const { g } = at(SHACK), before = JSON.stringify(g.map), d = roofDeckById(g.map, SHACK.id);
  assert.ok(d, 'the shelter has a deck'); assert.equal(d.kind, 'shack'); assert.equal(d.level, d.base + 2);
  assert.equal(JSON.stringify(g.map), before, 'the index lives beside the map, not on it'); assert.equal(g.map.roofDecks, undefined);
  const fresh = generateRegion(SEED, SHACK.rx, SHACK.ry); assert.ok(!('roofDecks' in fresh));
  const h = at(HUTS).g; assert.equal(roofDeckById(h.map, HUTS.a).kind, 'hut'); assert.equal(roofDeckById(h.map, HUTS.a).level, 2);
  const k = at(DISTRICT).g; assert.equal(roofDeckById(k.map, DISTRICT.low).level, 2); assert.equal(roofDeckById(k.map, DISTRICT.high).level, 3);
  assert.equal(roofDeckIndex({ ...g.map, interiorTerrain: { version: 1 } }).decks.length, 0, 'interiors have none');
});

test('a jump reaches a roof only from ground one level below it; from the ground the house stands on, the walls still stop it', () => {
  const { g } = at(SHACK), d = roofDeckById(g.map, SHACK.id), p = g.player, { y, x0 } = westApproach(g, d);
  // the bank beside the house, one level under the roof
  open(g, x0 - 1, y, d.level - 1); open(g, x0 - 2, y, d.level - 1); stand(g, x0 - 1, y);
  let drive = driver(g); drive.step(1, 0, true); drive.walk(1, 0, 450); drive.idle(200);
  assert.equal(g.roofDeck?.id, d.id, 'on the roof'); assert.equal(g.roofDeck.level, d.level); assert.equal(g.playerLevel(), d.level); assert.equal(p.hp, g.save.maxHp);
  assert.ok(roofDeckAt(g.map, p.x + .5, p.y + .75)?.id === d.id);
  // from the base ground: a low jump bumps the wall
  const b = at(SHACK).g; open(b, x0 - 1, y, d.base); open(b, x0 - 2, y, d.base); stand(b, x0 - 1, y);
  drive = driver(b); drive.step(1, 0, true); drive.walk(1, 0, 600); drive.idle(200);
  assert.equal(b.roofDeck, null, 'not from the ground'); assert.ok(b.player.x + .76 <= x0 + 1e-6, `stopped at the wall (${b.player.x})`);
  assert.equal(footprintOpen(b.map, W, x0 - .5, y - .25), false, 'the wall stands for ordinary movement');
  assert.equal(footprintOpen(b.map, W, x0 - .5, y - .25, false, false, false, false, d.level), true, 'and not for the Wayfarer on or over the roof');
});

test('roof to roof: walking onto a neighbouring roof at the same height, and jumping back', () => {
  const { g } = at(HUTS), a = roofDeckById(g.map, HUTS.a), b = roofDeckById(g.map, HUTS.b), p = g.player;
  assert.equal(a.x1, b.x0, 'the two houses touch'); const y = Math.floor((a.y0 + a.y1) / 2);
  stand(g, a.x1 - 2, y); g.setRoofDeck(a); const drive = driver(g);
  drive.walk(1, 0, 900); assert.equal(g.roofDeck?.id, b.id, 'across onto the next roof'); assert.equal(p.hp, g.save.maxHp);
  drive.step(-1, 0, true); drive.walk(-1, 0, 500); drive.idle(200); assert.equal(g.roofDeck?.id, a.id, 'and back by a hop'); assert.equal(p.hp, g.save.maxHp);
});

test('the drone and the glider come down onto a roof', () => {
  { const { s, g } = at(SHACK, (s) => { s.perception.aperture = 3255; s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1; });
    const d = roofDeckById(g.map, SHACK.id), c = d.cells[Math.floor(d.cells.length / 2)]; setMechMode(s, 'drone'); g.useConsumable('submersible', 0); s.mech.fuel = DRONE.carry; assert.ok(g.droneUp());
    stand(g, c % W, Math.floor(c / W)); g.droneLift = { base: d.base, z: d.level + .6, vz: 0 }; g.jumpUntil = 1100; g.skyAir = d.level;
    const drive = driver(g); for (let i = 0; i < 200 && g.droneLift; i++) drive.step(0, 0, false, i % 3 === 0);
    drive.idle(200); assert.equal(g.droneLift, null, 'landed'); assert.equal(g.roofDeck?.id, d.id, 'on the roof'); assert.equal(g.player.hp, g.save.maxHp); }
  { const { g } = at(SHACK, (s) => { s.glider = true; }); const d = roofDeckById(g.map, SHACK.id), c = d.cells[Math.floor(d.cells.length / 2)];
    stand(g, c % W, Math.floor(c / W)); g.glide = { z: d.level + .4, vx: 0, vy: 0, open: true, told: false };
    const drive = driver(g); for (let i = 0; i < 60 && g.glide; i++) drive.step(0, 0);
    assert.equal(g.glide, null, 'landed'); assert.equal(g.roofDeck?.id, d.id, 'the glide lands on the roof, not inside the house'); assert.equal(g.player.hp, g.save.maxHp); }
});

test('walking off a roof is a fall by the ordinary rule; the drop by the door is never lethal, for every kind of house', () => {
  const { g } = at(SHACK), d = roofDeckById(g.map, SHACK.id), p = g.player, { y } = westApproach(g, d), x1 = eastEdge(g, d, y);
  open(g, x1 + 1, y, d.base); open(g, x1 + 2, y, d.base); stand(g, x1 - 1, y); g.setRoofDeck(d);
  driver(g).walk(1, 0, 900); assert.equal(g.roofDeck, null, 'off the roof'); assert.equal(p.hp, g.save.maxHp - fallDamage(d.level - d.base, g.save.maxHp), '2 levels: 15%');
  let checked = 0;
  for (const [sec, ids] of [[SHACK, [SHACK.id]], [HUTS, [HUTS.a, HUTS.b]], [DISTRICT, [DISTRICT.low, DISTRICT.high]]]) for (const id of ids) {
    const { g } = at(sec), deck = roofDeckById(g.map, id), out = tile(g, deck.door.x, deck.door.y), drop = deck.level - (out.elev || 0);
    assert.ok(drop <= ROOF_DECKS.safeDrop && Number.isFinite(fallDamage(drop, g.save.maxHp)), `${id}: the door side drops ${drop}`);
    const dir = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] }[deck.door.side];
    stand(g, deck.door.x - dir[0], deck.door.y - dir[1]); g.setRoofDeck(deck); driver(g).walk(dir[0], dir[1], 700);
    assert.equal(g.roofDeck, null, `${id}: down by the door`); assert.equal(g.player.hp, g.save.maxHp - fallDamage(drop, g.save.maxHp), `${id}: hurt, alive`); checked++;
  }
  assert.equal(checked, 5);
  // every deck of a wider sample, whatever the ground outside its door
  const s = freshSave(); s.seed = 'DECKS'; const w = new Game(s, 0); let decks = 0;
  for (const [rx, ry] of [[1, 0], [0, 1], [-1, 0], [0, -1], [2, 1], [-2, -1], [3, 0], [0, 3], [-3, 2], [4, -1]]) { s.atlas = {}; w.rx = rx; w.ry = ry; w.loadArea('overworld');
    for (const deck of roofDeckIndex(w.map).decks) { decks++; if (deck.door) assert.ok(deck.level - (tile(w, deck.door.x, deck.door.y).elev || 0) <= ROOF_DECKS.safeDrop, deck.id); } }
  assert.ok(decks > 0);
});

test('on a roof, ground melee cannot reach the Wayfarer; shots and flyers still can', () => {
  const { g } = at(SHACK), d = roofDeckById(g.map, SHACK.id), { y, x0 } = westApproach(g, d);
  stand(g, x0 + 1, y); const foe = Object.assign(createCombatant('rootBrute', x0 - 1, y - .25), { id: 'below' }); g.enemies = [foe];
  assert.equal(g.bodyReach(foe), true, 'on the ground beside it, a blow reaches');
  g.setRoofDeck(d); assert.equal(g.bodyReach(foe), false, 'up on the roof, it does not');
  assert.equal(isBodyBlow('bite'), true); assert.equal(isBodyBlow('mortarVolley'), false);
  assert.equal(g.packHurt(foe, 10, { source: 'bite' }, 5000), false, 'a bite misses'); const hp = g.player.hp;
  assert.equal(g.packHurt(foe, 10, { source: 'mortarVolley' }, 6000), true, 'a mortar lands'); assert.ok(g.player.hp < hp);
  const flyer = Object.assign(createCombatant('veilMoth', x0 - 1, y - .25), { id: 'moth' }); assert.equal(g.bodyReach(flyer), true, 'a flyer reaches');
  const crate = { x: x0 + 1, y, kind: 'cache' }; assert.equal(g.reachOf(crate), Infinity, 'nothing below is reached with Act from the roof');
});

test('the standard view keeps the roof drawn while the Wayfarer stands on it, and draws them once', () => {
  const { g } = at(SHACK), d = roofDeckById(g.map, SHACK.id), c = d.cells.find((i) => tile(g, i % W, Math.floor(i / W)).structure === 'shackInterior');
  stand(g, c % W, Math.floor(c / W)); assert.equal(roofCutawayFor(g), d.id, 'inside, the roof is cut away');
  g.setRoofDeck(d); assert.equal(roofCutawayFor(g), null, 'on the roof, it stays');
  const VISOR = '#171817', visors = []; let fill = '', alpha = 1, tx = 0, ty = 0; const stack = [];
  const base = { save() { stack.push([tx, ty, alpha]); }, restore() { [tx, ty, alpha] = stack.pop() || [0, 0, 1]; }, translate(x, y) { tx += x; ty += y; },
    set fillStyle(v) { fill = v; }, get fillStyle() { return fill; }, set globalAlpha(v) { alpha = v; }, get globalAlpha() { return alpha; },
    fillRect(x, y) { if (fill === VISOR) visors.push({ x: x + tx, y: y + ty, alpha }); }, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null, measureText: () => ({ width: 10 }), getImageData: () => ({ data: new Uint8ClampedArray(4) }) };
  const ctx = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { if (k === 'fillStyle' || k === 'globalAlpha') o[k] = v; return true; } });
  render(ctx, g, 475, 661, 5000); assert.equal(visors.filter((v) => v.alpha === 1).length, 1, 'one Wayfarer, over the roof');
});

test('exact resume on a roof; a saved roof that is no longer there puts the Wayfarer on the ground, unhurt', () => {
  const { s, g } = at(SHACK), d = roofDeckById(g.map, SHACK.id), c = d.cells[3]; stand(g, c % W, Math.floor(c / W)); g.setRoofDeck(d);
  g.exportSnapshot(2000); const saved = structuredClone(migrateSave(structuredClone(s))); assert.deepEqual(saved.session.playerRuntime.roofDeck, { id: d.id, level: d.level });
  const r = new Game(structuredClone(saved), 3000); assert.equal(r.roofDeck?.id, d.id); assert.equal(r.roofDeck.level, d.level);
  assert.equal(r.player.x, g.player.x); assert.equal(r.player.y, g.player.y); assert.equal(r.playerLevel(), d.level);
  driver(r, 3000).idle(300); assert.equal(r.roofDeck?.id, d.id, 'still on it'); assert.equal(r.player.hp, r.save.maxHp);
  for (const bad of [{ id: d.id, level: d.level + 1 }, { id: 'shack-elsewhere', level: d.level }, { id: 7 }, 'roof']) {
    const t = structuredClone(saved); t.session.playerRuntime.roofDeck = bad; const m = migrateSave(t), q = new Game(m, 3000);
    assert.equal(q.roofDeck, null, JSON.stringify(bad)); driver(q, 3000).idle(300); assert.equal(q.player.hp, q.save.maxHp, 'no fall'); assert.equal(q.roofDeck, null);
  }
  assert.equal(normalizeRoofDeck(null), null); assert.equal(freshSave().session.playerRuntime.roofDeck, null);
});

test('overworld generation is unchanged: the same section generates the same, with or without deck play', () => {
  const a = JSON.stringify(generateRegion(SEED, SHACK.rx, SHACK.ry)); const { g } = at(SHACK), d = roofDeckById(g.map, SHACK.id); g.setRoofDeck(d); driver(g).idle(200);
  assert.equal(JSON.stringify(generateRegion(SEED, SHACK.rx, SHACK.ry)), a);
});

// ------------------------------------------------------------------ Rift Step
const rifter = (sec, long = false) => at(sec, (s) => { s.perception.aperture = 90; s.materials.lumenDust = 50; for (let i = 0; i < APERTURE_SKILLS[BRANCHES.rift.active].maxRank; i++) learnRank(s, 'rift'); if (long) { learnMod(s, 'rift'); assert.equal(chooseCap(s, 'rift', 'anchor').ok, true); } s.magicSkills.selected = 'rift-step'; });

test('Rift Step falls: off a roof it hurts by the ordinary rule, and from four levels it kills (it never fell before)', () => {
  const { g } = rifter(SHACK), d = roofDeckById(g.map, SHACK.id), { y } = westApproach(g, d), x1 = eastEdge(g, d, y);
  for (let x = x1 + 1; x <= Math.min(31, x1 + 8); x++) open(g, x, y, d.base);
  stand(g, x1 - 1, y); g.setRoofDeck(d); g.player.lastMoveVector = { x: 1, y: 0 }; g.lastUpdateNow = 1000;
  assert.equal(riftStep(g, 1000), true); assert.ok(g.player.x > x1, 'off the roof'); assert.equal(g.roofDeck, null); assert.equal(g.player.hp, g.save.maxHp - fallDamage(d.level - d.base, g.save.maxHp));
  // the direction step keeps to a roof it does not leave
  const k = rifter(SHACK).g, sx = westApproach(k, d).x0 + 1; stand(k, sx, y); k.setRoofDeck(d); k.player.lastMoveVector = { x: 1, y: 0 }; k.lastUpdateNow = 1000;
  assert.ok(sx + .5 + k.riftReach() < x1 + 1, 'the roof is wider than the step'); assert.equal(riftStep(k, 1000), true); assert.ok(k.player.x > sx + 1, 'it stepped');
  assert.equal(k.roofDeck?.id, d.id, 'still on the roof'); assert.equal(k.player.hp, k.save.maxHp);
  // a cliff four levels high: the blink off it is death
  const c = rifter(SHACK).g; for (let x = 2; x <= 12; x++) open(c, x, 30, x <= 4 ? 4 : 0); stand(c, 3, 30); c.player.lastMoveVector = { x: 1, y: 0 }; c.lastUpdateNow = 1000;
  assert.equal(riftStep(c, 1000), true); assert.equal(c.player.hp, 0, 'four levels down'); assert.equal(c._fatalFallPending, true);
});

test('the aimed step: within reach, at most two levels up (three with Long Step), clear of forbidden air; a bad point is refused without a cast', () => {
  const { g, s } = rifter(SHACK), d = roofDeckById(g.map, SHACK.id), { y, x0 } = westApproach(g, d), st = s.magicSkills;
  open(g, x0 - 1, y, d.base); open(g, x0 - 2, y, d.base); stand(g, x0 - 2, y); g.lastUpdateNow = 1000;
  const reach = g.riftReach(); assert.ok(reach >= RIFT.reach + 1);
  const far = { x: x0 - 1.5 + reach + 1, y: y + .5 }, x = g.player.x;
  assert.equal(riftStepTo(g, 1000, far), false, 'past its reach'); assert.equal(g.player.x, x); assert.equal(st.riftCharges, 1, 'nothing spent');
  assert.equal(riftStepTo(g, 1000, { x: x0 + 1.5, y: y + .5 }), true, 'up onto the roof, two levels'); assert.equal(g.roofDeck?.id, d.id); assert.equal(g.player.hp, g.save.maxHp);
  // three levels up is too high, unless Long Step
  const k = rifter(DISTRICT), K = k.g, hi = roofDeckById(K.map, DISTRICT.high), w = westApproach(K, hi); open(K, w.x0 - 1, w.y, 0); open(K, w.x0 - 2, w.y, 0); stand(K, w.x0 - 2, w.y); K.lastUpdateNow = 1000;
  assert.equal(riftStepTo(K, 1000, { x: w.x0 + 1.5, y: w.y + .5 }), false, 'three up'); assert.equal(K.roofDeck, null); assert.equal(k.s.magicSkills.riftCharges, 1);
  const L = rifter(DISTRICT, true).g; open(L, w.x0 - 1, w.y, 0); open(L, w.x0 - 2, w.y, 0); stand(L, w.x0 - 2, w.y); L.lastUpdateNow = 1000;
  assert.equal(riftStepTo(L, 1000, { x: w.x0 + 1.5, y: w.y + .5 }), true, 'Long Step rises one more'); assert.equal(L.roofDeck?.id, hi.id);
  // forbidden air on the way (a sealed tower's): refused
  const f = rifter(SHACK).g; for (let x = x0 - 6; x <= x0 - 1; x++) open(f, x, y, d.base); stand(f, x0 - 6, y); f.lastUpdateNow = 1000; tile(f, x0 - 3, y).towerAir = true;
  assert.equal(riftStepTo(f, 1000, { x: x0 - .5, y: y + .5 }), false, 'not through the tower air'); assert.equal(f.player.x, x0 - 6);
  delete tile(f, x0 - 3, y).towerAir; assert.equal(riftStepTo(f, 1000, { x: x0 - .5, y: y + .5 }), true);
  assert.equal(RIFT_AIM.rise, 2); assert.equal(RIFT_AIM.longStepRise, 1); assert.ok(RIFT_AIM.samples <= 40);
});

test('Close View: the Rift Step button arms the aim; the next tap picks the point and casts; the aim lapses', () => {
  const { g, s } = rifter(SHACK), d = roofDeckById(g.map, SHACK.id), { y, x0 } = westApproach(g, d); g.riftAimView = () => true;
  open(g, x0 - 1, y, d.base); open(g, x0 - 2, y, d.base); stand(g, x0 - 2, y); g.lastUpdateNow = 1000;
  assert.equal(g.activateApertureSkill('rift-step'), false, 'armed, not cast'); assert.equal(g.riftAimArmed(), true); assert.equal(s.magicSkills.riftCharges, 1);
  assert.equal(g.placeRiftAim(x0 + 40, y, 1000), true, 'the tap is taken'); assert.equal(g.riftAimMark.ok, false, 'red: out of reach'); assert.equal(s.magicSkills.riftCharges, 1, 'no cast');
  g.activateApertureSkill('rift-step'); assert.equal(g.placeRiftAim(x0 + 1.5, y + .5, 1000), true); assert.equal(g.riftAimMark.ok, true); assert.equal(g.roofDeck?.id, d.id); assert.equal(s.magicSkills.riftCharges, 0);
  assert.equal(g.placeRiftAim(x0 + 1.5, y + .5, 1000), false, 'not armed: the tap goes on to its usual use');
  const k = rifter(SHACK).g; k.riftAimView = () => true; k.lastUpdateNow = 1000; k.activateApertureSkill('rift-step'); assert.equal(k.riftAimArmed(), true);
  driver(k).idle(RIFT_AIM.window * 1000 + 100); assert.equal(k.riftAimArmed(), false, 'lapsed');
  const q = rifter(SHACK).g; q.riftAimView = () => true; q.lastUpdateNow = 1000; for (let x = x0 - 9; x <= x0 - 1; x++) open(q, x, y, d.base); stand(q, x0 - 2, y); q.player.lastMoveVector = { x: -1, y: 0 };
  q.activateApertureSkill('rift-step'); const x1 = q.player.x; assert.equal(q.riftAimArmed(), true);
  assert.equal(q.activateApertureSkill('rift-step'), true, 'pressed again: the plain step along the way you move'); assert.ok(q.player.x < x1 - 1); assert.equal(q.riftAimArmed(), false);
});
