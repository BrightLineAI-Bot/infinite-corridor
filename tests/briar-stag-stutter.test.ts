// The Briar Stag fight stutter (Tim, 2026-11-22, r1050 on his phone, Frenzied, section -185,-203: "Fighting the Briar Stag,
// everything just locked up and started skipping"). Four causes, each pinned here:
// 1. a Stalker in the fight threw in Game.update every frame it stood in reach (the world stopped, nothing was drawn);
// 2. bodies pressed against the Wayfarer from every side ate whole dodges (release 1061 let the dodge roll through them; Tim,
//    2026-11-25: "Dodge should not take you through enemies ... you can get boxed in and you just can't dodge through them":
//    bodies are solid to a dodge again, and only a minor foe a dodge runs into is staggered and nudged aside);
// 3. the probe logged a dodge from the frame the press came in, so most read "moved 0" on a 120 Hz screen;
// 4. every world tap and every resume saved at once (37 saves in 277 s of the fight).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STALKER, updateStalker } from '../src/stalker.ts';
import { ACTOR_CONTACT, DODGE_SHOVE } from '../src/actor-contact.ts';
import { footprintOpen } from '../src/game.ts';
import { createCombatant, enemyBodyRadius } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { createDodgeWatch } from '../src/diagnostic-probe.ts';
import { createSimClock, simClockStep } from '../src/sim-clock.ts';
import { AUTOSAVE, autosaveDue, fightUnderway } from '../src/persistence.ts';

// --- 1. the Stalker ---------------------------------------------------------------------------------------------------
function field(player = { x: 10, y: 10 }) {
  const hurts = [];
  const w = { player, dt: .05, now: 0, sheltered: false, door: null, playerVelocity: { x: 0, y: 0 }, open: (x, y) => x > 0 && y > 0 && x < 40 && y < 40, move(e, dx, dy) { const nx = e.x + dx, ny = e.y + dy; if (!this.open(nx, ny)) return false; e.x = nx; e.y = ny; return !!(dx || dy); }, elev: () => 0, hurt: (e, n) => { hurts.push(n); return true; }, ownerAlive: () => true, summon: () => 0, decoys: () => 0 };
  return { w, hurts };
}
const stalker = (form) => ({ id: 'stalker-s', stalker: true, kind: 'stalker', x: 10.6, y: 10, hp: 800, maxHp: 800, damage: 50, scale: STALKER.size, aggro: true, stalkForm: form, stalkCycle: 3, stalkTurretClock: 99, stalkEnergyClock: 99, stalkMirageClock: 99, stalkCharges: 0, stalkAct: { kind: 'prowl', t: 0, total: .5 } });

test('a Stalker left prowling in the pool or the mist begins its own move instead of throwing', () => {
  for (const form of ['pool', 'mist']) {
    const { w } = field(), e = stalker(form);
    updateStalker(e, w); assert.notEqual(e.stalkAct.kind, 'prowl', `${form}: no prowl in a form without one`);
    for (let i = 0; i < 200; i++) assert.doesNotThrow(() => updateStalker(e, w), `${form} update ${i}`);
  }
  // The cat and the ape still prowl and strike as before.
  for (const form of ['cat', 'ape']) { const { w } = field(), e = stalker(form); e.stalkAct.t = 2; updateStalker(e, w); assert.equal(e.stalkAct.kind, 'prowl', form); }
});

test('the afterimage (the path that set the prowl in the pool) no longer stops the Game', () => {
  const { w } = field(), e = stalker('pool'); e.stalkCharges = 3; e.stalkLastHp = 800; e.hp = 700; e.untargetable = false;
  for (let i = 0; i < 400; i++) { assert.doesNotThrow(() => updateStalker(e, w)); if (i % 40 === 0 && e.hp > 100) { e.stalkLastHp = e.hp; e.hp -= 10; } }
});

// --- 2. dodges in a crush ---------------------------------------------------------------------------------------------
const floor = (width = 24, height = 16) => ({ width, height, objects: [], enemySpawns: [], entry: { x: 3, y: 5 },
  tiles: Array.from({ length: width * height }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'flagFloor', blocked: false, elev: 0 })) });
const input = (x, y, action = '') => { let used = false; return { state: { x, y }, consume: (k) => k === action && !used && (used = true), held: () => false }; };
const foe = (x, y) => Object.assign(createCombatant('rootBrute', x, y), { hitStun: 1e6, damage: 0 });
function arena(foes) {
  const { game: g } = createLabFixture({ lab: 'close-view', scenario: 'terrain-ramps', seed: 'STAG-STUTTER', now: 1000 });
  g.map = floor(); g.save.closeView = false; g.enemies = foes;
  Object.assign(g.player, { x: 10, y: 8, hp: g.save.maxHp, invulnerableUntil: 0, stamina: 100, maxStamina: 100 });
  return g;
}
// Three bodies pressed against the Wayfarer, 120 degrees apart.
const ring = (g, gap = 0, turn = 0) => [0, 1, 2].map((i) => { const a = turn + i * Math.PI * 2 / 3, e = foe(0, 0), r = ACTOR_CONTACT.playerRadius + enemyBodyRadius(e) + gap; e.x = g.player.x + Math.cos(a) * r; e.y = g.player.y + Math.sin(a) * r; return e; });
const run = (g, x, y, action, frames = 12, start = 1000) => { const x0 = g.player.x, y0 = g.player.y; for (let i = 0; i < frames; i++) g.update(.05, input(x, y, i === 0 ? action : ''), start + i * 50); return Math.hypot(g.player.x - x0, g.player.y - y0); };

const minor = (x, y, boss = false) => Object.assign(createCombatant('ashling', x, y, boss), { hitStun: 0, damage: 0, cooldown: 1e6, aggro: false });
const freeze = (g) => { for (const e of g.enemies) e.hitStun = Math.max(e.hitStun, 1e6); };

test('boxed in by big bodies: neither walking nor a dodge in any direction leaves the ring', () => {
  for (const dir of [0, Math.PI / 3, Math.PI, 4]) {
    const g = arena([]); g.enemies = ring(g, .002); const at = g.enemies.map((e) => [e.x, e.y]);
    assert.ok(enemyBodyRadius(g.enemies[0]) > DODGE_SHOVE.maxRadius, 'root brutes are not minor foes');
    assert.ok(run(g, Math.cos(dir), Math.sin(dir), '', 6) < .05, 'walking cannot leave the ring');
    const moved = run(g, Math.cos(dir), Math.sin(dir), 'dodge', 6, 2000);
    assert.ok(g.player.dodgeUntil > 0, 'the dodge itself happens (stamina, i-frames)');
    assert.ok(moved < .05, `dodge at ${dir.toFixed(2)} is stopped by the bodies (${moved.toFixed(3)})`);
    assert.deepEqual(g.enemies.map((e) => [e.x, e.y]), at, 'big bodies are not shoved');
    for (const e of g.enemies) assert.ok(Math.hypot(e.x - g.player.x, e.y - g.player.y) >= ACTOR_CONTACT.playerRadius + enemyBodyRadius(e) - 1e-6, 'no overlap');
  }
});

test('a dodge at a foe a step away stops at it', () => {
  const g = arena([foe(11.2, 8)]), e = g.enemies[0], r = ACTOR_CONTACT.playerRadius + enemyBodyRadius(e);
  run(g, 1, 0, 'dodge');
  assert.ok(Math.abs(Math.hypot(e.x - g.player.x, e.y - g.player.y) - r) < 1e-6, 'stopped at contact');
  assert.equal(e.x, 11.2, 'not shoved');
});

test('a minor foe a dodge runs into is staggered and nudged aside; elites, bosses and big bodies stay solid', () => {
  const g = arena([minor(11.1, 8.05)]), e = g.enemies[0], x0 = g.player.x;
  let stun = 0; for (let i = 0; i < 12; i++) { g.update(.05, input(1, 0, i === 0 ? 'dodge' : ''), 1000 + i * 50); stun = Math.max(stun, e.hitStun); }
  assert.ok(stun > 0 && stun <= DODGE_SHOVE.stun, `staggered (${stun})`);
  assert.ok(g.player.x - x0 > 1, `the dodge carries on past it (${(g.player.x - x0).toFixed(2)})`);
  assert.ok(Math.abs(e.y - 8.05) > .2 && Math.abs(e.y - 8.05) <= DODGE_SHOVE.nudge + 1e-6, `nudged sideways (${e.y.toFixed(3)})`);
  assert.ok(e.y > 8.05, 'away from the line, on its own side');
  assert.ok(footprintOpen(g.map, g.map.width, e.x, e.y));
  // the same small creature as an elite or a boss is solid
  for (const make of [() => minor(11.1, 8.05, true), () => Object.assign(minor(11.1, 8.05), { eliteId: 'x' }), () => Object.assign(minor(11.1, 8.05), { staggerImmune: true })]) {
    const h = arena([make()]), f = h.enemies[0], y0 = f.y; freeze(h); run(h, 1, 0, 'dodge');
    assert.ok(Math.abs(f.y - y0) < .05 && f.hitStun < DODGE_SHOVE.stun * .5 || f.hitStun > 1e5, `not nudged or staggered (${(f.y - y0).toFixed(3)})`);
    assert.ok(h.player.x < f.x, 'still in front');
    assert.ok(Math.hypot(f.x - h.player.x, f.y - h.player.y) >= ACTOR_CONTACT.playerRadius + enemyBodyRadius(f) - 1e-6, 'and not passed');
  }
});

test('a minor foe against a wall cannot be nudged aside and stays in the way; walking never shoves', () => {
  const g = arena([minor(11.1, 8.0)]); for (const t of g.map.tiles) if (t.y <= 7 || t.y >= 9) t.blocked = true; // a one-tile corridor
  const e = g.enemies[0], moved = run(g, 1, 0, 'dodge');
  assert.ok(moved < 1, `blocked in the corridor (${moved.toFixed(2)})`);
  assert.ok(e.x - g.player.x >= ACTOR_CONTACT.playerRadius + enemyBodyRadius(e) - 1e-6 || Math.abs(e.y - 8) > 1e-6);
  const h = arena([minor(10.9, 8.0)]), f = h.enemies[0]; freeze(h); run(h, 1, 0, '', 12);
  assert.equal(f.y, 8.0, 'walking into a minor foe does not shove it');
  // a dodge with nothing in its way is the plain move it always was
  const a = arena([foe(4, 4)]), xa = a.player.x; run(a, 1, 0, 'dodge', 6); const plain = a.player.x - xa;
  const k = arena([]), x1 = k.player.x; run(k, 1, 0, 'dodge', 6); assert.equal(plain, k.player.x - x1);
});

test('solid dodges: game.ts no longer re-plans a dodge past bodies', () => {
  const src = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
  assert.ok(!src.includes('dodgeThrough'), 'the release 1061 pass-through is gone');
  assert.ok(!/DODGE_CONTACT|touchingBodies|boxedIn/.test(readFileSync(new URL('../src/actor-contact.ts', import.meta.url), 'utf8')));
});

// --- 3. the probe's dodge event ---------------------------------------------------------------------------------------
test('the probe logs each dodge once, when a world step takes it, with the ground the whole dodge covered (120 Hz)', () => {
  const g = arena([]), clock = createSimClock(), watch = createDodgeWatch(), events = [];
  const st = { x: 1, y: 0, dodge: false }, inp = { state: st, consume: (k) => { const v = !!st[k]; st[k] = false; return v; }, held: () => false };
  let now = 1000;
  for (let f = 0; f < 120; f++) {
    now += 1000 / 120;
    if (f === 31 || f === 80) st.dodge = true; // a press may land on a frame that runs no step
    const asked = st.dodge; if (asked) watch.before(g.player, now);
    simClockStep(clock, g, 1 / 120, now, (dt, n) => g.update(dt, inp, n));
    const refused = asked ? watch.after(g.player, now, !st.dodge) : null, done = watch.end(g.player, now);
    if (refused) events.push(refused); if (done) events.push(done);
  }
  assert.equal(events.length, 2, JSON.stringify(events));
  for (const e of events) { assert.equal(e.result, 'dodged'); assert.ok(e.moved > 1.1, `whole dodge measured: ${e.moved}`); }
  const w = createDodgeWatch(), p = { x: 0, y: 0, stamina: 3, dodgeUntil: 0 };
  w.before(p, 0); assert.equal(w.after(p, 0, false), null, 'a press still waiting logs nothing');
  assert.deepEqual(w.after(p, 10, true), { result: 'no stamina', stamina: 3 });
});

// --- 4. saves in a fight ----------------------------------------------------------------------------------------------
test('autosave: 8 s when calm, a tap or resume coalesced, and the fight cadence while a foe hunts nearby', () => {
  const calm = () => false, fight = () => true;
  assert.equal(AUTOSAVE.every, 8); assert.ok(AUTOSAVE.fightEvery > AUTOSAVE.every);
  assert.equal(autosaveDue(7.9, false, calm), false); assert.equal(autosaveDue(8, false, calm), true);
  assert.equal(autosaveDue(.5, true, calm), false, 'taps in a burst coalesce'); assert.equal(autosaveDue(1, true, calm), true);
  assert.equal(autosaveDue(8, false, fight), false); assert.equal(autosaveDue(5, true, fight), false);
  assert.equal(autosaveDue(AUTOSAVE.fightEvery, false, fight), true);
  let asked = 0; autosaveDue(3, false, () => { asked++; return true; }); assert.equal(asked, 0, 'the fight is looked at only when a save is due');
  // A Briar Stag fight like Tim's: 277 s of play in a fight, a tap every 1.5 s, the 8 s clock. Before: every tap and every
  // 8 s; now: one save each fightEvery seconds.
  let since = 0, saves = 0, wanted = false;
  for (let t = 0; t < 277; t += 1 / 60) { since += 1 / 60; if (Math.floor(t / 1.5) !== Math.floor((t - 1 / 60) / 1.5)) wanted = true; if (autosaveDue(since, wanted, fight)) { saves++; since = 0; wanted = false; } }
  assert.equal(saves, Math.floor(277 / AUTOSAVE.fightEvery));
});

test('fightUnderway: a live hunting foe within reach; the dead, the calm and the far do not count', () => {
  const player = { x: 10, y: 10 }, near = { x: 12, y: 10, aggro: true, hp: 5 };
  assert.equal(fightUnderway({ player, enemies: [near] }), true);
  assert.equal(fightUnderway({ player, enemies: [{ ...near, dead: true }, { ...near, aggro: false }, { ...near, x: 10 + AUTOSAVE.fightReach + 1 }, { ...near, friendly: true }] }), false);
  assert.equal(fightUnderway({ player, enemies: null }), false);
});

test('main.ts: taps on the world and resume ask for a save; the hide and the pause menu still save at once', () => {
  const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const tap = src.slice(src.indexOf('canvas.addEventListener("worldtap"'), src.indexOf('canvas.addEventListener("worldtap"') + 2600);
  assert.ok(!/\bpersist\(\)/.test(tap.slice(0, tap.indexOf('persistSoon(); // the Briar Stag fight stutter') + 60)), 'no direct save in the world tap');
  assert.equal((tap.match(/persistSoon\(\)/g) || []).length, 3);
  const resume = src.slice(src.indexOf('function resume()'), src.indexOf('function resume()') + 600);
  assert.ok(resume.includes('persistSoon()') && !/\bpersist\(\)/.test(resume));
  assert.ok(src.includes('if (autosaveDue(clock += dt, saveWanted, fightNow)) persist();'));
  const pause = src.slice(src.indexOf('function pause('), src.indexOf('function pause(') + 600);
  assert.ok(pause.includes('persist(urgent);'), 'the pause (and the hide, urgent) save at once');
});
