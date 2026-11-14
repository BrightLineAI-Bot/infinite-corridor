// Shadow Boxing's charge (Tim, 2026-11-14: "When you dash around with Shadow Boxing, you still just kind of teleport... I want
// to see him traversing the space... We said there were after-images, but I don't see them"). A swing pressed with the foe
// out of reach is now a dash the Wayfarer really travels (brawler-spells.ts SHADOW_DASH, game.ts shadowDashBegin / Steer /
// Land), the blow lands on arrival, and the afterimages are drawn in safe mode and at low quality, in both views.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, mapWidth } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';
import { BRAWLER, SHADOW_DASH, shadowDashMs, shadowDashTravel, shadowDashGhosts, normalizeShadowDash } from '../src/brawler-spells.ts';
import { render } from '../src/renderer.ts';
import { drawRangedEffects } from '../src/combat-visuals.ts';
import { CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory, closeViewShadowDash } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { CLOSE_VIEW_SHADOW_FORMS as SF } from '../src/close-view-shadow-forms.ts';
import { SPELLS } from '../src/items.ts';

const calm = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} };
const mash = { state: { x: 0, y: 0 }, consume: (k: string) => k === 'attack', held: () => false, reset: () => {} };
const once = (key: string) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k: string) => k === key && !used && (used = true), held: () => false, reset: () => {} }; };
const cleaver = () => ({ id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 5, property: 'impact' });
const dummy = (id: string, x: number, y: number, hp = 1e9) => Object.assign(createCombatant('rootBrute', x, y), { id, hp, maxHp: hp, damage: 0, cooldown: 99, speed: 0, speedMultiplier: 1e-6, meleePatterns: [] });

// A flat dungeon room (as brawler-485), an open overworld section and the Proving Ground's interior: the three kinds of area.
function room(weapon = 'blade', size = 40) {
  const s = freshSave(); s.seed = 'BOX-DASH'; s.perception.aperture = 3255; const g: any = new Game(s, 0);
  g.map = { ...g.map, width: size, height: size, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: size * size }, (_, i) => ({ x: i % size, y: Math.floor(i / size), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 20, y: 20, facing: 'right', hp: 100 }); s.maxHp = 1e6; s.lastAim = { x: 1, y: 0 };
  if (weapon === 'cleaver') s.equipment.primary = cleaver();
  g.enemies = []; g.update(.016, calm, 1000); g.castSpell('shadow-boxing'); return g;
}
const clearGround = (g: any) => { for (const t of g.map.tiles) { t.blocked = false; t.openAir = false; t.courtyard = false; t.pentRoof = false; t.pentBalcony = false; t.environment = false; t.elev = 0; if (t.kind === 'yardGrass' || t.kind === 'water' || t.kind === 'river' || t.hazard) { t.kind = 'flagFloor'; t.hazard = undefined; } } g.map.objects = (g.map.objects || []).filter((o: any) => o.kind !== 'npc'); };
function overworld(closeView: boolean) {
  const s = freshSave(); s.seed = 'BOX-DASH-OW'; s.level = 10; s.closeView = closeView; s.activeWeaponSlot = 'primary'; s.maxHp = 1e6;
  const g: any = new Game(s, 0); g.paused = false; s.session.paused = false; g.rx = 4; g.ry = 4; g.loadArea('overworld', false); clearGround(g); g.enemies = []; g.projectiles = [];
  Object.assign(g.player, { x: 15, y: 16, facing: 'right' }); s.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null; g.update(.016, calm, 1000); g.castSpell('shadow-boxing'); return g;
}
function interior(closeView: boolean) {
  const g: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game;
  g.save.closeView = closeView; g.save.activeWeaponSlot = 'primary'; clearGround(g); g.enemies = []; g.projectiles = []; g.save.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null;
  g.update(.016, calm, 100000); g.castSpell('shadow-boxing'); return g;
}
// Press once with a foe `dist` tiles ahead, then tick `dt` ms frames. Logs the Wayfarer's offset from the start and the foe's hp.
function charge(g: any, dist: number, { dt = 8, ms = 400, from = (g.lastUpdateNow || 1000) + dt } = {}) {
  const x0 = g.player.x, y0 = g.player.y, foe = dummy('dash-foe', x0 + dist, y0); g.enemies = [foe];
  const log: any[] = []; let t = from;
  g.update(dt / 1000, once('attack'), t); const q = g.shadowDash ? { ...g.shadowDash } : null; log.push({ at: 0, dx: g.player.x - x0, dy: g.player.y - y0, hp: foe.hp, dash: !!g.shadowDash });
  for (let i = 1; i * dt <= ms; i++) { t += dt; g.update(dt / 1000, calm, t); log.push({ at: i * dt, dx: g.player.x - x0, dy: g.player.y - y0, hp: foe.hp, dash: !!g.shadowDash, elapsed: g.shadowDash?.elapsedMs }); }
  return { q, log, foe, x0, y0 };
}

test('the charge table: a fixed mean speed between a floor and a cap, in data', () => {
  assert.deepEqual([SHADOW_DASH.speed, SHADOW_DASH.minMs, SHADOW_DASH.maxMs, SHADOW_DASH.ghosts], [24, 120, 220, 4]); assert.ok(SHADOW_DASH.ghosts <= SF.trail.max, 'Close View\'s afterimage pool holds them all');
  assert.equal(shadowDashMs(.3), 120); assert.equal(shadowDashMs(4), 4000 / 24); assert.equal(shadowDashMs(5.5), 220); assert.equal(shadowDashMs(NaN), 120);
  assert.equal(shadowDashTravel(0), 0); assert.equal(shadowDashTravel(1), 1); assert.ok(shadowDashTravel(.5) === .5);
  for (let t = 0; t < 1; t += .01) assert.ok(shadowDashTravel(t + .01) - shadowDashTravel(t) <= .0125 + 1e-9, 'peak speed at most 1.25x the mean');
  const longest = 1.75 * 1.1 + BRAWLER['shadow-boxing'].stick + 1 - Math.max(.8, 1.75 * 1.1 * .7); assert.ok(shadowDashMs(longest) <= SHADOW_DASH.maxMs);
});

test('a dash takes its duration, the Wayfarer is carried along the eased path, and the blow lands on the arrival tick', () => {
  for (const dist of [2.4, 3.5, 5]) {
    const g = room(), { q, log } = charge(g, dist);
    assert.ok(q, `${dist}: a dash began`); assert.equal(log[0].dx, 0, 'the press does not move him'); assert.equal(log[0].hp, 1e9, 'and does not hit');
    const planned = dist - q.stop; assert.equal(q.durationMs, shadowDashMs(planned)); assert.ok(q.durationMs >= 120 && q.durationMs <= 220);
    const arrive = log.findIndex((s) => !s.dash), hit = log.findIndex((s) => s.hp < 1e9);
    assert.equal(log[arrive].at, Math.ceil(q.durationMs / 8) * 8, `${dist}: arrives on time`);
    assert.equal(hit, arrive, `${dist}: the blow lands on the arrival tick`);
    for (const s of log.slice(1, arrive)) { const want = planned * shadowDashTravel(s.elapsed / q.durationMs); assert.ok(Math.abs(s.dx - want) < 1e-6, `${dist} at ${s.at} ms: ${s.dx.toFixed(4)} vs ${want.toFixed(4)}`); assert.equal(s.dy, 0); }
    assert.ok(log[1].dx > 0 && log[1].dx < planned * .2, 'sets off, no pop'); assert.ok(Math.abs(log[arrive].dx - planned) < 1e-6, 'ends at the stop distance');
    for (let i = 1; i < log.length; i++) assert.ok(log[i].dx - log[i - 1].dx <= .26, 'at most about half a tile a 60 Hz frame (.26 a 8 ms tick)');
  }
});

test('identical in every area and in both views: the same path and the same arrival tick', () => {
  const runs = [room(), overworld(false), overworld(true), interior(false), interior(true)].map((g) => charge(g, 3.5, { from: (g.lastUpdateNow || 0) + 8 }));
  const shape = (r: any) => JSON.stringify(r.log.map((s: any) => [s.at, Math.round(s.dx * 1e6), Math.round(s.dy * 1e6), s.hp < 1e9]));
  for (const r of runs.slice(1)) assert.equal(shape(r), shape(runs[0]));
});

test('the weighted Cleaver swing: the charge stands in for its wind-up, the strike follows 60 ms after arrival', () => {
  for (const dist of [2.6, 3.5, 5]) {
    const g = room('cleaver'), x0 = g.player.x, foe = dummy('c', x0 + dist, g.player.y); g.enemies = [foe]; let t = 1008, arrive = -1, strike = -1;
    g.update(.008, once('attack'), t); assert.ok(g.shadowDash);
    for (let i = 1; i < 80 && strike < 0; i++) { t += 8; g.update(.008, calm, t); if (arrive < 0 && !g.shadowDash) { arrive = i * 8; assert.equal(g.pendingMeleeContact?.v, 3, 'the swing starts on arrival'); } if (g.pendingMeleeContact?.contacted) strike = i * 8; }
    assert.ok(arrive > 0 && strike - arrive <= SHADOW_DASH.swingLeadMs + 8, `${dist}: strike ${strike - arrive} ms after arrival`);
  }
});

test('afterimages are drawn at low quality with safe mode on, in Close View and in Standard View, bounded and pooled', () => {
  // Close View, the real renderer with a recording WebGL2 stand-in
  gpu(({ screen }) => {
    const { game: g } = createLabFixture({ lab: 'creature-assets', scenario: 'shadow-clone', now: 100000 }) as any;
    g.shadowClone = null; g.presentation = { effectiveQuality: 'low', quality: 'low', safeMode: true, reduceMotion: false };
    g.enemies = [dummy('box-foe', g.player.x + 3.5, g.player.y)]; g.boxingUntil = 1e9; g.lastUpdateNow = 100000; g.save.lastAim = { x: 1, y: 0 }; g.player.facing = 'right';
    resetCloseViewCamera(); layer(g, () => render(screen, g, 390, 844, 100000)); const still = closeViewGLStats.modelTriangles;
    g.primaryAttack(100000); assert.ok(g.shadowDash);
    const D = closeViewShadowDash(); let most = 0, extra = 0, t = 100000;
    layer(g, () => { for (let i = 0; i < 20; i++) { t += 1000 / 60; g.update(1 / 60, calm, t); render(screen, g, 390, 844, t); most = Math.max(most, D.trailCount); if (D.trailCount) extra = Math.max(extra, closeViewGLStats.modelTriangles - still); assert.ok(D.trailCount <= SHADOW_DASH.ghosts); } });
    assert.ok(most >= 2, `afterimages in safe mode at low quality (${most})`); assert.ok(extra > 0, 'and their bodies are drawn');
  });
  // Standard View: the streak and the ghost bodies, from the same pooled samples
  const g = room(), foe = dummy('f', g.player.x + 4, g.player.y); g.enemies = [foe]; g.presentation = { effectiveQuality: 'low', quality: 'low', safeMode: true };
  g.update(.016, once('attack'), 1100); g.update(.016, calm, 1116); g.update(.016, calm, 1132); g.update(.016, calm, 1148);
  const log: any[] = [], c = ctx(log); drawRangedEffects(c, g, 390, 844);
  assert.ok(log.filter((l) => l[0] === 'ellipse').length >= 2, 'ghost bodies drawn'); assert.ok(log.some((l) => l[0] === 'lineTo'), 'a speed streak');
  const out = new Float64Array(SHADOW_DASH.ghosts * 3), n = shadowDashGhosts(g, out); assert.ok(n >= 1 && n <= SHADOW_DASH.ghosts);
  for (let k = 0; k < n; k++) { assert.ok(out[k * 3] >= 20 - 1e-9 && out[k * 3] <= g.player.x + 1e-9, 'on the path behind him'); assert.ok(out[k * 3 + 2] > 0 && out[k * 3 + 2] < 1); }
  // after arrival they close in and fade within fadeMs
  let t = 1148; while (g.shadowDash) { t += 16; g.update(.016, calm, t); } assert.ok(shadowDashGhosts(g, out) >= 0);
  t += SHADOW_DASH.fadeMs + 16; g.update(.016, calm, t); assert.equal(shadowDashGhosts(g, out), 0, 'gone after the fade');
});

test('walls, solid ground edges and lethal ground stop the charge as they stopped the old carry', () => {
  { // a wall between the Wayfarer and a locked foe behind it
    const g = room(), w = mapWidth(g.map, g.area); for (const t of g.map.tiles) if (t.x === 22) t.blocked = true;
    const foe = dummy('walled', 24.5, 20); g.enemies = [foe]; g.targetId = foe.id;
    g.update(.008, once('attack'), 1100); for (let t = 1108; t < 1600; t += 8) g.update(.008, calm, t);
    assert.ok(g.player.x + .5 < 22 + .1 && g.player.x > 20, `stopped at the wall (${g.player.x.toFixed(2)})`); assert.ok(!g.map.tiles[Math.floor(g.player.y + .7) * w + Math.floor(g.player.x + .5)].blocked);
  }
  { // lava across the path
    const g = room(); for (const t of g.map.tiles) if (t.x === 22) t.kind = 'lava';
    g.enemies = [dummy('beyond', 24, 20)]; g.update(.008, once('attack'), 1100); for (let t = 1108; t < 1600; t += 8) g.update(.008, calm, t);
    assert.ok(g.player.hp > 0, 'alive'); assert.ok(g.player.x + .5 < 22.2, `never onto the lava (${g.player.x.toFixed(2)})`);
  }
  { // the same mover the old carry used: no tick ends inside a blocked tile on a diagonal through a pillar field
    const g = room(), w = mapWidth(g.map, g.area); for (const t of g.map.tiles) if ((t.x === 22 && t.y === 21) || (t.x === 21 && t.y === 21)) t.blocked = true;
    const foe = dummy('diag', 23.5, 23); g.enemies = [foe]; g.targetId = foe.id; g.update(.008, once('attack'), 1100);
    for (let t = 1108; t < 1600; t += 8) { g.update(.008, calm, t); for (const [ox, oy] of [[.2, .55], [.8, .55], [.2, .85], [.8, .85]]) assert.ok(!g.map.tiles[Math.floor(g.player.y + oy) * w + Math.floor(g.player.x + ox)].blocked, 'footprint never in a wall'); }
  }
});

// Damage and healing per second with Shadow Boxing, measured over 30 s with the real game code. The reference numbers are
// the same scenarios run on release 951 (the one-update carry): measured 2026-11-14 with scratch script meas/dps.ts.
const BASE = { 'blade/spread': [70.2, 5.71], 'blade/kite': [74.67, 5.04], 'cleaver/spread': [59.13, 5.68], 'cleaver/kite': [71.03, 4.74] };
function boxing(weapon: string, mode: string, secs = 30) {
  const g = room(weapon); let t = 1000, dealt = 0, healed = 0, n = 0, dashes = 0, lastJump = t; const dt = 16;
  const spawn = () => { const a = n * 2.1, d = mode === 'spread' ? 4 : 1.2; g.enemies = [dummy(`f${n++}`, Math.max(2, Math.min(37, g.player.x + Math.cos(a) * d)), Math.max(2, Math.min(37, g.player.y + Math.sin(a) * d)), mode === 'spread' ? 120 : 1e9)]; };
  spawn();
  while (t < 1000 + secs * 1000) {
    t += dt; g.boxingUntil = t + 5000; g.player.invulnerableUntil = t + 1e6;
    if (mode === 'kite' && t - lastJump >= 1500) { lastJump = t; const e = g.enemies[0], a = n++ * 2.1; e.x = Math.max(2, Math.min(37, g.player.x + Math.cos(a) * 4)); e.y = Math.max(2, Math.min(37, g.player.y + Math.sin(a) * 4)); }
    const hp0 = g.enemies.map((e: any) => e.hp); g.player.hp = 50; const was = g.shadowDash;
    g.update(dt / 1000, mash, t); if (!was && g.shadowDash) dashes++;
    healed += Math.max(0, g.player.hp - 50); g.enemies.forEach((e: any, i: number) => { if (hp0[i] != null) dealt += Math.max(0, hp0[i] - Math.max(0, e.hp)); });
    if (!g.enemies.length || g.enemies.every((e: any) => !(e.hp > 0))) spawn();
  }
  return { dps: dealt / secs, hps: healed / secs, dashes };
}
test('damage and healing per second stay within 10% of the one-update carry (blade and Cleaver, a spread pack and a foe that keeps leaping away)', () => {
  for (const [key, [dps, hps]] of Object.entries(BASE)) {
    const [w, m] = key.split('/'), r = boxing(w, m);
    assert.ok(r.dashes >= 10, `${key}: the scenario dashes (${r.dashes})`);
    assert.ok(Math.abs(r.dps / dps - 1) <= .1, `${key}: damage ${r.dps.toFixed(2)} vs ${dps}`);
    assert.ok(Math.abs(r.hps / hps - 1) <= .1, `${key}: healing ${r.hps.toFixed(2)} vs ${hps}`);
  }
});

test('the damage cut holds during a charge', () => {
  const g = room(), plain = (() => { const s = freshSave(); s.seed = 'BOX-DASH'; const q: any = new Game(s, 0); q.map = g.map; q.area = 'dungeon'; Object.assign(q.player, { x: 20, y: 20, hp: 100 }); q.enemies = []; q.update(.016, calm, 1000); return q; })();
  const blow = (q: any, t: number) => { q.player.invulnerableUntil = 0; const hp = q.player.hp; q.effects.push({ id: `hit-${t}`, hostile: true, x: q.player.x + .5, y: q.player.y + .52, radius: 1, damage: 30, life: .3, pulse: 99, untilPulse: 0, hits: {} }); q.update(.016, calm, t); q.effects = []; return hp - q.player.hp; };
  g.enemies = [dummy('f', 24, 20)]; g.player.hp = 100; g.update(.016, once('attack'), 1100); assert.ok(g.shadowDash);
  const boxed = blow(g, 1116), full = blow(plain, 1116);
  assert.ok(g.shadowDash || boxed >= 0); assert.ok(full > 0 && Math.abs(boxed - full * (1 - BRAWLER['shadow-boxing'].guard)) < 1.01, `${full} -> ${boxed}`);
});

test('exact resume: a save mid-dash resumes where it stood and lands the same blow on the same tick', () => {
  for (const cut of [40, 96]) {
    // the Proving Ground room as generated (a reload regenerates it, so no cleared ground): a direction with 4 open tiles
    const g: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game; g.enemies = []; g.save.closeView = true; g.update(.016, calm, 100000); g.castSpell('shadow-boxing');
    const w = g.glyphWorld(100000), dir = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [Math.cos(k * Math.PI / 4), Math.sin(k * Math.PI / 4)]).find(([dx, dy]) => { for (let d = .25; d <= 4; d += .25) if (!w.canStand(g.player.x + dx * d, g.player.y + dy * d)) return false; return true; });
    assert.ok(dir, 'an open line in the room'); const foe = dummy('resume-foe', g.player.x + dir[0] * 4, g.player.y + dir[1] * 4); g.enemies = [foe]; g.save.lastAim = { x: dir[0], y: dir[1] };
    g.update(.008, once('attack'), 100008); for (let t = 100016; t <= 100008 + cut; t += 8) g.update(.008, calm, t);
    const q = structuredClone(g.shadowDash); assert.ok(q && q.elapsedMs > 0 && q.elapsedMs < q.durationMs, `mid-dash at ${cut}`);
    const save = deserializeSave(serializeSave(g.exportSnapshot(100008 + cut))); assert.deepEqual(normalizeShadowDash(save.session.playerRuntime.shadowDash), normalizeShadowDash(q));
    const back: any = new Game(save, 500000); back.installSystems();
    assert.deepEqual(back.shadowDash, normalizeShadowDash(q)); assert.equal(back.player.x, g.player.x); assert.equal(back.player.y, g.player.y);
    const bf = back.enemies.find((e: any) => e.id === foe.id) || Object.assign(dummy(foe.id, foe.x, foe.y), { hp: foe.hp }); back.enemies = [bf];
    const play = (q2: any, from: number, f: any) => { const out: any[] = []; for (let t = from; t < from + 400; t += 8) { q2.update(.008, calm, t); out.push([Math.round(q2.player.x * 1e6), Math.round(q2.player.y * 1e6), f.hp, !!q2.shadowDash]); } return out; };
    assert.deepEqual(play(back, 500008, bf), play(g, 100016 + cut, foe), `cut at ${cut} ms`);
  }
  // a pause holds the dash exactly
  { const g = room(); g.enemies = [dummy('p', 24, 20)]; g.update(.016, once('attack'), 1100); g.update(.016, calm, 1116); const x = g.player.x, e = g.shadowDash.elapsedMs;
    g.setPaused(true, 1116); g.setPaused(false, 9116); assert.equal(g.player.x, x); assert.equal(g.shadowDash.elapsedMs, e); }
  // saves: additive, normalised; a broken record is dropped, a newer one kept opaque
  assert.equal(normalizeShadowDash({ v: 1, area: 'dungeon', areaId: 'a', levelId: 'root', foe: 'f', fromX: NaN, fromY: 0, durationMs: 150, elapsedMs: 0, travelled: 0, stop: 1 }), null);
  assert.deepEqual(normalizeShadowDash({ v: 2, anything: [1] }), { v: 2, anything: [1] });
  assert.equal(freshSave().session.playerRuntime.shadowDash, undefined);
});

test('a dodge, a jump or death cancels the charge and the blow it carries; a press during it is not doubled', () => {
  { const g = room(), foe = dummy('f', 24, 20); g.enemies = [foe]; g.update(.016, once('attack'), 1100); g.update(.016, mash, 1116); g.update(.016, mash, 1132);
    assert.ok(g.shadowDash); g.player.dodgeUntil = 1200; g.update(.016, calm, 1148); assert.equal(g.shadowDash, null); assert.equal(foe.hp, 1e9); }
  { const g = room(), foe = dummy('f', 24, 20); g.enemies = [foe]; g.update(.016, once('attack'), 1100); let t = 1100, hits = 0, hp = foe.hp;
    while (g.shadowDash || t < 1180) { t += 16; g.update(.016, mash, t); if (foe.hp < hp) { hits++; hp = foe.hp; } if (t > 1500) break; }
    assert.equal(hits, 1, 'one blow for the press that charged'); }
});

test('60 s of Shadow Boxing recast every frame with cooldowns wiped, attack mashed, foes leaping: finite and bounded', () => {
  const g = room('cleaver'); let t = 1000, most = 0; const out = new Float64Array(SHADOW_DASH.ghosts * 3);
  g.enemies = Array.from({ length: 5 }, (_, i) => dummy(`m${i}`, 20 + 3 * Math.cos(i), 20 + 3 * Math.sin(i), 1e7));
  for (let i = 0; i < 60 * 60; i++) {
    t += 1000 / 60; for (const k of Object.keys(g.save.magicSkills.cooldowns || {})) g.save.magicSkills.cooldowns[k] = 0; g.spellCooldownRemaining = 0;
    g.castSpell('shadow-boxing'); if (i % 45 === 0) for (const [k, e] of g.enemies.entries()) { e.x = 4 + ((i * 7 + k * 11) % 30); e.y = 4 + ((i * 3 + k * 13) % 30); e.dead = false; e.hp = 1e7; }
    g.player.hp = 1e5; g.update(1 / 60, mash, t);
    assert.ok(Number.isFinite(g.player.x) && Number.isFinite(g.player.y) && Number.isFinite(g.player.hp), `finite at ${i}`);
    if (g.shadowDash) { assert.ok(g.shadowDash.elapsedMs <= g.shadowDash.durationMs && g.shadowDash.travelled <= SHADOW_DASH.maxTiles); }
    const n = shadowDashGhosts(g, out); most = Math.max(most, n); for (let k = 0; k < n * 3; k++) assert.ok(Number.isFinite(out[k]));
    assert.ok(g.effects.length < 400 && g.projectiles.length <= 64);
  }
  assert.ok(most > 0 && most <= SHADOW_DASH.ghosts); assert.ok(SPELLS['shadow-boxing']);
});

// ---- harness: a recording 2D context and WebGL2 stand-in (as close-view-shadow-forms.test.ts)
function ctx(log: any[] = []) { return new Proxy({ canvas: null, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) } as any, { get: (o, k) => k in o ? o[k] : (...args: any[]) => log.push([k, ...args]), set: (o, k, v) => { o[k] = v; return true; } }); }
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
