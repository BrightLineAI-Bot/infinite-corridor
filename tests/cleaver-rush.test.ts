// The Verge Cleaver's Lava Slash rush (Tim, 2026-11-14: "The charged dash for the Verge Cleaver just lunges you, it teleports
// you to the enemy. It should be like the other dash moves: you see the character move to the enemy instead of teleporting,
// and in Close View the camera travels with you as you get to the enemy. In both Standard View and Close View you should see
// the character charge toward the enemy"). Lava Slash's dash used to be one update (game.ts artDash); it is now travelled
// (game.ts artRushBegin / artRushSteer / artRushLand, brawler-spells.ts LAVA_RUSH) on Shadow Boxing's
// eased path and shared quarter-tile mover (dashCarry), and the slam lands on arrival.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, mapWidth } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';
import { WEAPON_ARTS, artShare } from '../src/weapon-arts.ts';
import { SHADOW_DASH, LAVA_RUSH, normalizeArtRush, DASH_LOOKS, shadowDashMs, shadowDashTravel, shadowDashGhosts, dashKind, cleaverRushLean, drawCleaverRushBlade } from '../src/brawler-spells.ts';
import { render } from '../src/renderer.ts';
import { drawRangedEffects } from '../src/combat-visuals.ts';
import { CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory, closeViewShadowDash, closeViewCamera } from '../src/close-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';
import { CLOSE_VIEW_SHADOW_FORMS as SF } from '../src/close-view-shadow-forms.ts';

const A = WEAPON_ARTS.arts['lava-slash'], R = LAVA_RUSH, DT = .016;
const cleaver = () => ({ id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 10, property: 'impact', tier: 'rare', affixes: [] });
const dummy = (id: string, x: number, y: number, hp = 1e9) => Object.assign(createCombatant('ashling', x, y), { id, hp, maxHp: hp, damage: 0, cooldown: 99, speedMultiplier: 1e-6, meleePatterns: [] });
const kit = (s: any) => { s.level = 15; s.equipment.primary = cleaver(); s.activeWeaponSlot = 'primary'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = ['field:lava-slash']; s.maxHp = 1e6; };
const clearGround = (g: any) => { for (const t of g.map.tiles) { t.blocked = false; t.openAir = false; t.courtyard = false; t.pentRoof = false; t.pentBalcony = false; t.environment = false; t.elev = 0; if (t.kind === 'yardGrass' || t.kind === 'water' || t.kind === 'river' || t.hazard) { t.kind = 'flagFloor'; t.hazard = undefined; } } g.map.objects = (g.map.objects || []).filter((o: any) => o.kind !== 'npc'); };
// A flat dungeon room, an open overworld section and the Proving Ground's interior: the three kinds of area.
function room(closeView = false) {
  const s = freshSave(); s.seed = 'CLEAVER-RUSH'; kit(s); s.closeView = closeView; const g: any = new Game(s, 0);
  g.map = { ...g.map, width: 40, height: 40, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1600 }, (_, i) => ({ x: i % 40, y: Math.floor(i / 40), kind: 'ash', blocked: false })) };
  g.map.name = 'Rush Hall'; g.area = 'dungeon'; Object.assign(g.player, { x: 20, y: 20, facing: 'right', hp: 100 }); s.lastAim = { x: 1, y: 0 }; g.enemies = []; return g;
}
function overworld(closeView: boolean) {
  const s = freshSave(); s.seed = 'CLEAVER-RUSH-OW'; kit(s); s.closeView = closeView; const g: any = new Game(s, 0); g.paused = false; s.session.paused = false;
  g.rx = 4; g.ry = 4; g.loadArea('overworld', false); clearGround(g); g.enemies = []; g.projectiles = []; Object.assign(g.player, { x: 12, y: 16, facing: 'right' }); s.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null; g.update(DT, input(), 1000); return g;
}
function interior(closeView: boolean) {
  const g: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game; kit(g.save);
  g.save.closeView = closeView; clearGround(g); g.enemies = []; g.projectiles = []; g.save.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null; g.update(DT, input(), 100000); return g;
}
const input = (press = false, held = false) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k: string) => press && k === 'attack' && !used && (used = true), held: (k: string) => held && k === 'attack', reset: () => {} }; };
// Three accepted presses (each swing let run out), back where it stood, then a perfect charge held to just before the release.
function ready(g: any, from: number) {
  let t = from; const at = { x: g.player.x, y: g.player.y }, foes = g.enemies; g.enemies = [];
  for (let i = 0; i < 8 && !g.weaponArts?.armed; i++) { t += 16; g.update(DT, input(true), t); for (let k = 0; k < 50; k++) { t += 16; g.update(DT, input(), t); } }
  assert.equal(g.weaponArts?.armed, true, 'armed'); Object.assign(g.player, at); g.enemies = foes;
  t += 16; g.update(DT, input(true, true), t); while (!(g.weaponArts.hold.on && g.weaponArts.hold.held >= 1.15)) { t += 16; g.update(DT, input(false, true), t); }
  return t;
}
function spy(g: any) { const log: any[] = []; const own = g.artBlow.bind(g); g.artBlow = (e: any, amount: number, ...rest: any[]) => { log.push({ id: e.id, amount, t: g.lastUpdateNow }); return own(e, amount, ...rest); }; return log; }
// Release on the frame after `ready`, then `ms` more of 16 ms frames. Logs the offset from the start and the art's blows.
function rush(g: any, foeAt: [number, number] | null, { from = (g.lastUpdateNow || 1000), ms = 500, lock = false } = {}) {
  const foe = foeAt ? dummy('rush-foe', g.player.x + foeAt[0], g.player.y + foeAt[1]) : null; g.enemies = foe ? [foe] : []; if (lock && foe) g.targetId = foe.id;
  let t = ready(g, from); const x0 = g.player.x, y0 = g.player.y, fx0 = foe?.x ?? 0, blows = spy(g), log: any[] = [];
  t += 16; g.update(DT, input(), t); const q = g.artRush ? structuredClone(g.artRush) : null;
  log.push({ at: 16, dx: g.player.x - x0, dy: g.player.y - y0, rush: !!g.artRush, elapsed: g.artRush?.elapsedMs, blows: blows.length });
  for (let i = 2; i * 16 <= ms; i++) { t += 16; g.update(DT, input(), t); log.push({ at: i * 16, dx: g.player.x - x0, dy: g.player.y - y0, rush: !!g.artRush, elapsed: g.artRush?.elapsedMs, blows: blows.length }); }
  return { q, log, foe, blows, x0, y0, t, fx0 };
}
const planned = (gap: number) => Math.floor((gap - A.stop + 1e-6) / SHADOW_DASH.step) * SHADOW_DASH.step;

test('the rush table: its own clock in data, heavier than Shadow Boxing\'s, the longest dash within the cap', () => {
  assert.deepEqual([R.v, R.speed, R.minMs, R.maxMs, R.maxTiles], [1, 16, 140, 280, 5]); assert.ok(Object.isFrozen(R));
  assert.ok(R.speed < SHADOW_DASH.speed && R.minMs > SHADOW_DASH.minMs, 'a greatsword charge: slower than Shadow Boxing\'s 24 tiles/s');
  assert.equal(shadowDashMs(.5, R), 140); assert.equal(shadowDashMs(3, R), 3000 / 16); assert.equal(shadowDashMs(NaN, R), 140); assert.equal(shadowDashMs(99, R), 280);
  assert.equal(shadowDashMs(4), 4000 / 24, 'Shadow Boxing\'s clock is unchanged by default');
  const longest = A.dash + 1 - A.stop; assert.ok(shadowDashMs(longest, R) <= R.maxMs && longest <= R.maxTiles, 'a lock at dash + 1 fits');
  assert.ok(R.speed * 1.25 / 60 <= .34, 'at most a third of a tile a 60 Hz frame at the peak');
});

test('the rush takes its duration along the eased path and the slam lands on the arrival tick', () => {
  for (const gap of [2.4, 3.5, 4.0]) {
    const g = room(), { q, log, blows, x0, fx0 } = rush(g, [gap, 0]); assert.ok(q, `${gap}: a rush began`);
    const want = planned(fx0 - x0); assert.ok(Math.abs(q.toX - q.fromX - want) < 1e-9, 'whole quarter steps to the stop distance'); // the press that began the hold swung (and lunged) as usual
 assert.equal(q.durationMs, shadowDashMs(want, R)); assert.equal(q.foe, 'rush-foe');
    const arrive = log.findIndex((s) => !s.rush);
    assert.equal(log[arrive].at, Math.ceil(q.durationMs / 16) * 16, `${gap}: arrives on time`);
    assert.equal(log.findIndex((s) => s.blows > 0), arrive, `${gap}: the slam lands on the arrival tick`); assert.equal(blows.length, 1);
    for (const s of log.slice(0, arrive)) { const e = want * shadowDashTravel(s.elapsed / q.durationMs); assert.ok(Math.abs(s.dx - e) < 1e-6, `${gap} at ${s.at}: ${s.dx} vs ${e}`); assert.ok(Math.abs(s.dy) < 1e-9); assert.equal(s.blows, 0, 'no blow before arrival'); }
    assert.ok(log[0].dx > 0 && log[0].dx < want * .25, 'sets off, no pop'); assert.ok(Math.abs(log[arrive].dx - want) < 1e-6, 'ends where the old dash ended (whole quarter steps, stop short)');
    for (let i = 1; i < log.length; i++) assert.ok(log[i].dx - log[i - 1].dx <= .34, 'at most a third of a tile a frame');
    assert.ok(Math.abs(blows[0].amount - g.artPower(0) * artShare(1.15) * A.share) < 1e-6 * g.artPower(0) + 1e-6, 'the perfect release\'s power');
  }
  { // no foe: straight along the aim, the full dash, the slam at its end
    const g = room(), { q, log, blows } = rush(g, null); assert.equal(q.foe, ''); assert.equal(q.durationMs, shadowDashMs(A.dash, R));
    const arrive = log.findIndex((s) => !s.rush); assert.ok(Math.abs(log[arrive].dx - A.dash) < 1e-6); assert.equal(blows.length, 0, 'nobody to strike'); assert.ok(g.player.attackVisual?.weaponArt === 'lava-slash', 'the slam\'s pose on arrival');
  }
  { // a foe already in reach: nothing to cross, the slam is at once (as before)
    const g = room(), { q, blows, log } = rush(g, [1.1, 0]); assert.equal(q, null); assert.equal(log[0].blows, 1); assert.equal(blows.length, 1);
  }
});

test('walls, solid props, bodies, lethal ground and ledges stop it where the old one-update dash stopped', () => {
  const setups: Record<string, (g: any) => void> = {
    wall: (g) => { for (const t of g.map.tiles) if (t.x === 23) t.blocked = true; },
    lava: (g) => { for (const t of g.map.tiles) if (t.x === 23) t.kind = 'lava'; },
    ledge: (g) => { for (const t of g.map.tiles) if (t.x >= 23) t.kind = 'canyon'; }, // a drop: no footing
    prop: (g) => { g.map.objects = [{ id: 'crate', kind: 'crate', x: 23, y: 20, blocked: true }]; for (const t of g.map.tiles) if (t.x === 23 && t.y === 20) t.blocked = true; },
    body: (g) => { g.enemies.push(dummy('in-the-way', 22.4, 20)); },
  };
  for (const [name, setup] of Object.entries(setups)) {
    for (const lock of [true, false]) {
      // the old dash on the same ground, for reference
      const old = room(); setup(old); const ref = dummy('rush-foe', 24.6, 20); old.enemies.push(ref); if (lock) old.targetId = ref.id; old.artDash(1000, A.dash, A.stop);
      const g = room(); setup(g); const extra = g.enemies.slice();
      const foe = dummy('rush-foe', 24.6, 20); g.enemies = [...extra, foe]; if (lock) g.targetId = foe.id;
      let t = ready(g, 1000); const w = mapWidth(g.map, g.area);
      for (let i = 0; i < 40; i++) { t += 16; g.update(DT, input(), t); for (const [ox, oy] of [[.2, .55], [.8, .55], [.2, .85], [.8, .85]]) { const tile = g.map.tiles[Math.floor(g.player.y + oy) * w + Math.floor(g.player.x + ox)]; assert.ok(!tile.blocked && tile.kind !== 'lava', `${name}: never in it`); } }
      assert.equal(g.artRush, null, `${name}: arrived`); assert.ok(g.player.hp > 0);
      if (name === 'body') assert.ok(g.player.x <= old.player.x + 1e-6 && g.player.x + .5 < 22.4 + .5, `body${lock ? ' (locked)' : ''}: stopped at the body, never past where the old dash slid to (${g.player.x.toFixed(3)} vs ${old.player.x.toFixed(3)})`); // the shared mover stops on contact (Shadow Boxing's rule) where the old loop slid on along it
      else assert.ok(Math.abs(g.player.x - old.player.x) <= SHADOW_DASH.step + 1e-6, `${name}${lock ? ' (locked)' : ''}: stopped by it as before (${g.player.x.toFixed(3)} vs ${old.player.x.toFixed(3)})`);
      assert.ok(g.player.x + .5 < 23.2, `${name}: short of it`);
    }
  }
});

test('identical in every area and in both views: the same path and the same arrival tick', () => {
  const runs = [room(false), room(true), overworld(false), overworld(true), interior(false), interior(true)].map((g) => rush(g, [3.5, 0], { from: (g.lastUpdateNow || 0) + 16 }));
  const shape = (r: any) => JSON.stringify(r.log.map((s: any) => [s.at, Math.round(s.dx * 1e6), Math.round(s.dy * 1e6), s.rush, s.blows]));
  for (const r of runs) assert.ok(r.q, 'a rush in each');
  for (const r of runs.slice(1)) assert.equal(shape(r), shape(runs[0]));
});

test('Close View: the camera travels with the Wayfarer through the rush, no jump; the body leans, blade low, iron-and-ember afterimages, no wraith', () => {
  gpu(({ screen }) => {
    const g = interior(true); g.presentation = { effectiveQuality: 'low', quality: 'low', safeMode: true, reduceMotion: false };
    const foe = dummy('cv-foe', g.player.x + 3.6, g.player.y); g.enemies = [foe];
    let t = ready(g, 100016); resetCloseViewCamera(); layer(g, () => { for (let i = 0; i < 30; i++) render(screen, g, 390, 844, t); });
    const D = closeViewShadowDash(), cams: number[] = [], xs: number[] = []; let ghosts = 0, kinds = new Set(), grip = 0;
    layer(g, () => { for (let i = 0; i < 40; i++) { t += 16; g.update(DT, input(), t); render(screen, g, 390, 844, t); const c = closeViewCamera(); cams.push(c.x); xs.push(g.player.x); if (g.artRush || D.charge > 0) { kinds.add(D.kind); assert.equal(D.wraith, 0, 'never the wraith'); } ghosts = Math.max(ghosts, D.trailCount); grip = Math.max(grip, D.kind === 'cleaver' ? D.charge : 0); } });
    assert.ok(xs[xs.length - 1] - xs[0] > 2, 'travelled'); assert.deepEqual([...kinds], ['cleaver']); assert.ok(ghosts >= 1 && ghosts <= SHADOW_DASH.ghosts, `afterimages (${ghosts})`); assert.ok(grip > .9, 'the full lean and the blade carried low');
    for (let i = 1; i < cams.length; i++) { const d = cams[i] - cams[i - 1]; assert.ok(Number.isFinite(d) && d > -1e-3 && d <= .36, `camera step ${i}: ${d.toFixed(3)}`); }
    assert.ok(cams[cams.length - 1] - cams[0] > 1.5, 'the camera went with her'); assert.ok(Math.abs(cams[cams.length - 1] - cams[0] - (xs[xs.length - 1] - xs[0])) < .35, 'as far as she went');
    assert.deepEqual([...SF.rush.tint].every((v, k) => v !== SF.trail.tint[k]), true, 'not the violet tint');
  });
});

test('Standard View: the lean, the trailing blade, an ember streak and plain afterimages, never violet', () => {
  const g = room(); g.presentation = { effectiveQuality: 'low', quality: 'low', safeMode: true };
  const foe = dummy('sv-foe', 24, 20); g.enemies = [foe]; let t = ready(g, 1000);
  for (let i = 0; i < 4; i++) { t += 16; g.update(DT, input(), t); }
  assert.ok(g.artRush); assert.equal(dashKind(g), 'cleaver'); assert.ok(cleaverRushLean(g) > 0, 'tipped into the charge (heading right)');
  const log: any[] = [], c = ctx(log); drawRangedEffects(c, g, 390, 844);
  const styles = log.filter((l) => l[0] === '__set' && (l[1] === 'strokeStyle' || l[1] === 'fillStyle')).map((l) => l[2]);
  assert.ok(styles.includes(DASH_LOOKS.cleaver.streak) && styles.includes(DASH_LOOKS.cleaver.body), 'the ember streak and the plain bodies');
  assert.ok(!styles.includes(DASH_LOOKS.shadow.streak) && !styles.includes(DASH_LOOKS.shadow.body), 'not violet');
  const out = new Float64Array(SHADOW_DASH.ghosts * 3), n = shadowDashGhosts(g, out); assert.ok(n >= 1);
  for (let k = 0; k < n; k++) assert.ok(out[k * 3 + 2] <= SHADOW_DASH.alpha * DASH_LOOKS.cleaver.alpha + 1e-9, 'subtle');
  const blade: any[] = []; assert.equal(drawCleaverRushBlade(ctx(blade), g, 32), true); assert.ok(blade.some((l) => l[0] === 'lineTo'));
  const lean: any[] = [], screen = ctx(lean); render(screen, g, 390, 844, t); assert.ok(lean.some((l) => l[0] === 'rotate' && Math.abs(l[1] - cleaverRushLean(g)) < 1e-9), 'the sprite is drawn leaning');
  while (g.artRush) { t += 16; g.update(DT, input(), t); } t += SHADOW_DASH.fadeMs + SHADOW_DASH.settleMs + 32; g.update(DT, input(), t);
  assert.equal(cleaverRushLean(g), 0, 'settled'); assert.equal(shadowDashGhosts(g, out), 0, 'faded');
});

// Damage per second with Lava Slash, measured over 120 s of play with the real game code: three presses, a perfect charge, let go,
// again. The reference numbers are the same scenarios on release 954 (the one-update dash), measured 2026-11-14 with the scratch
// script meas/lava-dps.ts: a foe in reach (close), one set 3 tiles off as each charge begins (gap) and a locked foe 4.6 off (far).
const BASE = { close: 95.91, gap: 79.58, far: 79.58 };
function sustained(mode: string, secs = 120) {
  const g = room(), foe = dummy('dps-foe', 21.4, 20); g.enemies = [foe]; g.player.invulnerableUntil = 1e15;
  let t = 1000, phase = 'arm', dealt = 0, rushes = 0; const place = (d: number) => { foe.x = g.player.x + d; foe.y = g.player.y; };
  for (let i = 0; i < secs * 60; i++) {
    t += 1000 / 60; g.player.invulnerableUntil = t + 1e6; g.player.hp = Math.max(g.player.hp, 50);
    let press = false, held = false; const K = g.weaponArts;
    if (phase === 'arm') { if (K?.armed) phase = 'wait'; else press = true; }
    if (phase === 'wait' && !g.pendingMeleeContact && !(g.player.attackUntil > t) && !g.artRush) { phase = 'charge'; g.player.x = 20; g.player.y = 20; if (mode === 'gap') place(3); if (mode === 'far') { place(4.6); g.targetId = foe.id; } }
    if (phase === 'charge') { held = true; if (!K.hold.on && !K.heldFor) press = true; if (K.hold.on && K.hold.held >= 1.15) { held = false; phase = 'arm'; } }
    if (mode === 'close' && Math.hypot(foe.x - g.player.x, foe.y - g.player.y) > 1.6) place(1.4);
    const hp0 = foe.hp, was = !!g.artRush; g.update(1 / 60, input(press, held), t); if (!was && g.artRush) rushes++;
    dealt += Math.max(0, hp0 - foe.hp);
  }
  return { dps: dealt / secs, rushes };
}
test('damage per second stays within 10% of the one-update dash (a foe in reach, a gap of 3 tiles, a locked foe 4.6 off)', () => {
  for (const [mode, dps] of Object.entries(BASE)) {
    const r = sustained(mode); if (mode !== 'close') assert.ok(r.rushes >= 20, `${mode}: the scenario rushes (${r.rushes})`);
    assert.ok(Math.abs(r.dps / dps - 1) <= .1, `${mode}: ${r.dps.toFixed(2)} vs ${dps}`);
  }
});

test('exact resume: a save mid-rush resumes where it stood and lands the same slam on the same tick; a pause holds it', () => {
  for (const cut of [32, 96]) {
    // the Proving Ground room as generated (a reload regenerates it): a direction with 4 open tiles
    const g: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game; kit(g.save); g.save.closeView = true; g.enemies = [];
    const w = g.glyphWorld(100000), dir = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [Math.cos(k * Math.PI / 4), Math.sin(k * Math.PI / 4)]).find(([dx, dy]) => { for (let d = .25; d <= 4; d += .25) if (!w.canStand(g.player.x + dx * d, g.player.y + dy * d)) return false; return true; })!;
    assert.ok(dir, 'an open line in the room'); g.save.lastAim = { x: dir[0], y: dir[1] };
    const foe = dummy('resume-foe', g.player.x + dir[0] * 3.9, g.player.y + dir[1] * 3.9); g.enemies = [foe];
    let t = ready(g, 100000); g.save.lastAim = { x: dir[0], y: dir[1] };
    for (let e = 0; e <= cut; e += 16) { t += 16; g.update(DT, input(), t); }
    const q = structuredClone(g.artRush); assert.ok(q && q.elapsedMs > 0 && q.elapsedMs < q.durationMs, `mid-rush at ${cut}`);
    g.setPaused(true, t);
    const save = deserializeSave(serializeSave(g.exportSnapshot(t))); assert.deepEqual(save.session.playerRuntime.artRush, normalizeArtRush(q));
    const back: any = new Game(save, 500000); back.installSystems(); g.setPaused(false, t);
    assert.deepEqual(back.artRush, normalizeArtRush(q)); assert.equal(back.player.x, g.player.x); assert.equal(back.player.y, g.player.y);
    const bf = back.enemies.find((e: any) => e.id === foe.id) || Object.assign(dummy(foe.id, foe.x, foe.y), { hp: foe.hp }); back.enemies = [bf]; back.setPaused(false, 500000);
    const play = (q2: any, from: number, f: any) => { const out: any[] = []; for (let s = from; s < from + 400; s += 16) { q2.update(DT, input(), s); out.push([Math.round(q2.player.x * 1e6), Math.round(q2.player.y * 1e6), Math.round(f.hp), !!q2.artRush]); } return out; };
    const a = play(back, 500016, bf), b = play(g, t + 16, foe); assert.deepEqual(a, b, `cut at ${cut} ms`); assert.ok(b.some((r) => r[2] < 1e9), 'and the slam landed');
  }
  { const g = room(); g.enemies = []; let t = ready(g, 1000); g.enemies = [dummy('p', 24, 20)]; t += 16; g.update(DT, input(), t); t += 16; g.update(DT, input(), t); assert.ok(g.artRush);
    const x = g.player.x, e = g.artRush.elapsedMs; g.setPaused(true, t); g.setPaused(false, t + 8000); assert.equal(g.player.x, x); assert.equal(g.artRush.elapsedMs, e); }
});

test('the saved record: additive at schema 14, versioned, normalised; a broken one is dropped, a newer one kept opaque', () => {
  const good = { v: 1, art: 'lava-slash', area: 'dungeon', areaId: 'a', levelId: 'root', foe: 'f', fromX: 1, fromY: 2, toX: 3, toY: 2, dirX: 1, dirY: 0, stop: .9, limit: 5, durationMs: 150, elapsedMs: 40, travelled: .5, arrived: false, power: 12, futureField: 'kept' };
  assert.deepEqual(normalizeArtRush(good), good, 'clean, unknown fields kept');
  assert.equal(normalizeArtRush({ ...good, fromX: NaN }), null); assert.equal(normalizeArtRush({ ...good, durationMs: 9999 }), null); assert.equal(normalizeArtRush({ ...good, art: 'blade-stream' }), null);
  assert.equal(normalizeArtRush({ ...good, limit: 99 }), null); assert.equal(normalizeArtRush({ ...good, v: 0 }), null); assert.equal(normalizeArtRush('x'), null);
  assert.deepEqual(normalizeArtRush({ v: 2, anything: [1] }), { v: 2, anything: [1] });
  assert.equal(normalizeArtRush({ ...good, elapsedMs: 200 }).elapsedMs, 150, 'elapsed held to the duration');
  const s = freshSave(); assert.equal(s.session.playerRuntime.artRush, undefined, 'a fresh save has none');
  s.session.playerRuntime.artRush = { ...good, power: -1 }; assert.equal(migrateSave(s).session.playerRuntime.artRush, null, 'migrate normalises');
  const s2 = freshSave(); s2.session.playerRuntime.artRush = { v: 3, x: 1 }; assert.deepEqual(migrateSave(s2).session.playerRuntime.artRush, { v: 3, x: 1 });
  assert.equal(s.schemaVersion ?? 14, 14);
});

test('a dodge, a stun, leaving the area or death cancels the rush: no slam, and the spent charge is stored again; presses wait', () => {
  const start = () => { const g = room(), foe = dummy('c', 24, 20); g.enemies = [foe]; let t = ready(g, 1000); const blows = spy(g); t += 16; g.update(DT, input(), t); assert.ok(g.artRush); return { g, foe, blows, t }; };
  { const { g, blows, t } = start(); g.player.dodgeUntil = t + 200; g.update(DT, input(), t + 16);
    assert.equal(g.artRush, null, 'dodge'); assert.equal(blows.length, 0); assert.equal(g.weaponArts.armed, true, 'stored again');
    let s = t + 16; for (let i = 0; i < 30; i++) { s += 16; g.update(DT, input(), s); } assert.equal(blows.length, 0, 'and nothing lands later'); }
  { const { g, blows, t } = start(); g.player.stunnedUntil = t + 300; g.update(DT, input(), t + 16); assert.equal(g.artRush, null, 'stun'); assert.equal(blows.length, 0); assert.equal(g.weaponArts.armed, true); }
  { const { g, blows, t } = start(); g.area = 'overworld'; g.update(DT, input(), t + 16); assert.equal(g.artRush, null, 'area'); assert.equal(blows.length, 0); }
  { const { g, blows, t } = start(); g.player.hp = 0; g.update(DT, input(), t + 16); assert.equal(g.artRush, null, 'death'); assert.equal(blows.length, 0); }
  { // presses during the rush are refused (one slam, nothing doubled), and the dodge itself is never held back
    const { g, foe, t: t0 } = start(); let t = t0, n = 0, hp = foe.hp; while (g.artRush && t < t0 + 600) { t += 16; g.update(DT, input(true), t); if (foe.hp < hp) { n++; hp = foe.hp; } }
    assert.equal(n, 1, 'the slam only'); }
});

// ---- the airborne rush (Tim, 2026-11-14: "Lava Slash released mid-jump should also be a travelled charge, the same as on the
// ground"): the jump's own arc runs on, the rush carries her across through the same mover, the slam lands where it ends.
const jumpInput = (held: boolean) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k: string) => k === 'jump' && !used && (used = true), held: (k: string) => held && k === 'attack', reset: () => {} }; };
// Charge held, jump, let go `afterMs` into the jump. Logs each frame from the release.
function airRush(g: any, foeAt: [number, number] | null, afterMs = 48, ms = 700) {
  const foe = foeAt ? dummy('air-foe', g.player.x + foeAt[0], g.player.y + foeAt[1]) : null; g.enemies = foe ? [foe] : [];
  let t = ready(g, (g.lastUpdateNow || 1000)); t += 16; g.update(DT, jumpInput(true), t); const jumpUntil = g.jumpUntil; assert.ok(t < jumpUntil, 'jumping');
  for (let e = 16; e < afterMs; e += 16) { t += 16; g.update(DT, input(false, true), t); }
  const x0 = g.player.x, y0 = g.player.y, fx0 = foe?.x ?? 0, blows = spy(g), log: any[] = [];
  t += 16; g.update(DT, input(), t); const q = g.artRush ? structuredClone(g.artRush) : null;
  log.push({ at: 16, dx: g.player.x - x0, rush: !!g.artRush, elapsed: g.artRush?.elapsedMs, blows: blows.length, air: t < g.jumpUntil });
  for (let i = 2; i * 16 <= ms; i++) { t += 16; g.update(DT, input(), t); log.push({ at: i * 16, dx: g.player.x - x0, rush: !!g.artRush, elapsed: g.artRush?.elapsedMs, blows: blows.length, air: t < g.jumpUntil }); }
  return { q, log, foe, blows, x0, y0, fx0, t, jumpUntil };
}

test('mid-jump: the same travelled rush on the same clock, the jump\'s arc untouched, the slam on arrival, landing where it ended', () => {
  for (const gap of [2.6, 3.8]) {
    const g = room(), { q, log, blows, x0, fx0, jumpUntil } = airRush(g, [gap, 0]);
    assert.ok(q, `${gap}: a rush began in the air`); assert.equal(q.air, true); const want = planned(fx0 - x0);
    assert.equal(q.durationMs, shadowDashMs(want, R), 'the same LAVA_RUSH clock');
    assert.equal(g.jumpUntil, jumpUntil, 'the jump keeps its own arc and length');
    const arrive = log.findIndex((r) => !r.rush); assert.equal(log[arrive].at, Math.ceil(q.durationMs / 16) * 16, 'arrives on time');
    assert.equal(log.findIndex((r) => r.blows > 0), arrive, 'the slam lands on the arrival tick'); assert.equal(blows.length, 1);
    assert.equal(log[arrive].air, true, 'still up when it lands its slam (a short rush inside the jump)');
    for (const r of log.slice(0, arrive)) { const e = want * shadowDashTravel(r.elapsed / q.durationMs); assert.ok(Math.abs(r.dx - e) < 1e-6, `${gap} at ${r.at}: ${r.dx} vs ${e}`); }
    const end = log[arrive].dx; assert.ok(Math.abs(end - want) < 1e-6, 'ends where the ground rush would');
    const landed = log.findIndex((r) => !r.air); assert.ok(landed > arrive, 'then lands'); assert.ok(Math.abs(log[log.length - 1].dx - end) < .05, 'on the spot the rush ended'); assert.ok(g.player.hp > 0);
    assert.ok(!g.plunge, 'no plunge');
  }
  { // let go late in the jump: it lands during the rush, which runs on as a ground rush (no cancel), slam on arrival
    const g = room(), { q, log, blows } = airRush(g, [3.8, 0], 400);
    assert.equal(q.air, true); const landed = log.findIndex((r) => !r.air), arrive = log.findIndex((r) => !r.rush);
    assert.ok(landed > 0 && landed < arrive, `lands mid-rush (${landed} < ${arrive})`); assert.equal(blows.length, 1); assert.equal(log.findIndex((r) => r.blows > 0), arrive);
  }
  { // a press during the airborne rush is the rush's: no plunge while it runs, one slam
    const g = room(), foe = dummy('p', 23.8, 20); g.enemies = [foe]; let t = ready(g, 1000); t += 16; g.update(DT, jumpInput(true), t); t += 16; g.update(DT, input(), t); assert.ok(g.artRush?.air);
    const blows = spy(g); while (g.artRush) { t += 16; g.update(DT, input(true), t); if (g.artRush) assert.ok(!g.plunge, 'no plunge while it runs'); } assert.equal(blows.length, 1, 'the slam lands (a press after it is a new action)');
  }
});

test('mid-jump: walls, lethal ground and drops still stop it (nothing is crossed in the air)', () => {
  for (const [name, setup] of Object.entries({
    wall: (g: any) => { for (const t of g.map.tiles) if (t.x === 23) t.blocked = true; },
    lava: (g: any) => { for (const t of g.map.tiles) if (t.x === 23) t.kind = 'lava'; },
    drop: (g: any) => { for (const t of g.map.tiles) if (t.x >= 23) t.kind = 'canyon'; },
  })) {
    const g = room(); setup(g); const w = mapWidth(g.map, g.area); const foe = dummy('beyond', 24.6, 20); g.enemies = [foe]; g.targetId = foe.id;
    let t = ready(g, 1000); t += 16; g.update(DT, jumpInput(true), t); t += 16; g.update(DT, input(), t); assert.ok(g.artRush?.air, `${name}: airborne rush`);
    for (let i = 0; i < 60; i++) { t += 16; g.update(DT, input(), t); for (const [ox, oy] of [[.2, .55], [.8, .55], [.2, .85], [.8, .85]]) { const tile = g.map.tiles[Math.floor(g.player.y + oy) * w + Math.floor(g.player.x + ox)]; assert.ok(!tile.blocked && tile.kind !== 'lava' && tile.kind !== 'canyon', `${name}: never over it`); } }
    assert.equal(g.artRush, null); assert.ok(g.player.hp > 0, `${name}: alive after landing`); assert.ok(g.player.x + .5 < 23.2, `${name}: short of it (${g.player.x.toFixed(2)})`);
  }
});

test('mid-jump: exact resume, a save mid-rush in the air resumes airborne and lands the same slam on the same tick', () => {
  for (const cut of [16, 64]) {
    const g: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game; kit(g.save); g.enemies = [];
    const w = g.glyphWorld(100000), dir = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [Math.cos(k * Math.PI / 4), Math.sin(k * Math.PI / 4)]).find(([dx, dy]) => { for (let d = .25; d <= 4; d += .25) if (!w.canStand(g.player.x + dx * d, g.player.y + dy * d)) return false; return true; })!;
    g.save.lastAim = { x: dir[0], y: dir[1] }; const foe = dummy('air-resume', g.player.x + dir[0] * 3.9, g.player.y + dir[1] * 3.9); g.enemies = [foe];
    let t = ready(g, 100000); t += 16; g.update(DT, jumpInput(true), t); t += 16; g.update(DT, input(), t); g.save.lastAim = { x: dir[0], y: dir[1] };
    for (let e = 0; e < cut; e += 16) { t += 16; g.update(DT, input(), t); }
    const q = structuredClone(g.artRush); assert.ok(q?.air && q.elapsedMs < q.durationMs && t < g.jumpUntil, `mid-rush in the air at ${cut}`);
    g.setPaused(true, t); const save = deserializeSave(serializeSave(g.exportSnapshot(t))); g.setPaused(false, t);
    assert.equal(save.session.playerRuntime.artRush.air, true);
    const back: any = new Game(save, 500000); back.installSystems(); back.setPaused(false, 500000);
    assert.deepEqual(back.artRush, normalizeArtRush(q)); assert.equal(back.player.x, g.player.x); assert.ok(500000 < back.jumpUntil, 'still up after the reload');
    assert.equal(back.jumpUntil - 500000, g.jumpUntil - t, 'the same time left in the jump');
    const bf = back.enemies.find((e: any) => e.id === foe.id) || Object.assign(dummy(foe.id, foe.x, foe.y), { hp: foe.hp }); back.enemies = [bf];
    const play = (q2: any, from: number, f: any) => { const out: any[] = []; for (let s = from; s < from + 640; s += 16) { q2.update(DT, input(), s); out.push([Math.round(q2.player.x * 1e6), Math.round(q2.player.y * 1e6), Math.round(f.hp), !!q2.artRush, s < q2.jumpUntil]); } return out; };
    const a = play(back, 500016, bf), b = play(g, t + 16, foe); assert.deepEqual(a, b, `cut at ${cut} ms`); assert.ok(b.some((r) => r[2] < 1e9), 'the slam landed'); assert.ok(!b[b.length - 1][4], 'and she landed');
  }
});

// ---- harness: a recording 2D context and WebGL2 stand-in (as shadow-boxing-dash.test.ts)
function ctx(log: any[] = []) { return new Proxy({ canvas: null, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}), getImageData: () => ({ data: new Uint8ClampedArray(4) }) } as any, { get: (o, k) => k in o ? o[k] : (...args: any[]) => log.push([k, ...args]), set: (o, k, v) => { o[k] = v; log.push(['__set', k, v]); return true; } }); }
class MockGL {
  program: any = null;
  constructor() { let n = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, n++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } createShader() { return {}; } createProgram() { return { shaders: [] }; } shaderSource(s: any, t: any) { s.text = t; } attachShader(p: any, s: any) { p.shaders.push(s); } useProgram(p: any) { this.program = p; } createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; } getProgramParameter(p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; }
}
function gpu(run: (o: any) => void) {
  const old = (globalThis as any).WebGL2RenderingContext; (globalThis as any).WebGL2RenderingContext = MockGL; const gl = new MockGL(), screen = ctx(), canvas = { width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : ctx() }; screen.canvas = canvas;
  setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true as any; resetCloseViewGL();
  try { run({ gl, screen }); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null); if (old === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = old; }
}
function layer(g: any, run: () => void) { const fn = (c: any, w: number, h: number, shots: any) => drawRangedEffects(c, g, w, h, shots); CLOSE_VIEW_HOOKS.groundLayers.push(fn); try { return run(); } finally { CLOSE_VIEW_HOOKS.groundLayers.splice(CLOSE_VIEW_HOOKS.groundLayers.indexOf(fn), 1); } }
