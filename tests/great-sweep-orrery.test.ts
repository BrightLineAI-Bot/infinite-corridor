// Tim, 2026-11-14: the Aether Orrery drops at a reasonable rate (it never dropped: it was only ever gifted once); the Orrery and
// the Great Sweep are held in the right hand in Close View whenever equipped (the Orrery floating over the open palm); the Great
// Sweep is a long-handled broken greatsword swung 360° round the Wayfarer, its blade dealing the damage as it passes (or, with
// Mirage of Blades, swung for show while the thrown blades deal it); the Mirage blades in Close View are Standard View's blades.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant, wayfarerDamage } from '../src/combat.ts';
import { regiftOrreryGear, ownsAetherOrrery } from '../src/game.ts';
import { generateItem, ORRERY_LOOT, APERTURE_BANDS, isValidItem, rangedWeapon, normalizeItemUpgrade } from '../src/items.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { BRAWLER } from '../src/brawler-spells.ts';
import { ORRERY as ORRERY_FORM, MIRAGE, MIRAGE_BLADE_VIEW, mirageBladePresentation, SWEEP_BLADES } from '../src/tool-forms.ts';
import { GREAT_SWEEP_SWING, sweepTimes, sampleSweep, sweepDamageAngle, normalizeToolSwing, sampleSweepPose } from '../src/great-sweep.ts';
import { closeViewHeldToolKind, writeCloseViewHeldTool, HERO_GREAT_SWEEP, GREAT_SWEEP_HELD_TRIANGLES, ORRERY_HELD, ORRERY_HELD_TRIANGLES, MIRAGE_BLADE_SHAPES, MIRAGE_BLADE_MODELS, MIRAGE_BLADE_KINDS } from '../src/close-view-sweep-gear.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, HERO_SLOT_EXTRA_TRIANGLES, HERO_EQUIPMENT_MAX_TRIANGLES, HERO_KIT_MAX_TRIANGLES, writeCloseViewModel, modelTriangleCount } from '../src/close-view-models.ts';
import { CLOSE_VIEW_HELD_GEAR, closeViewHandRoles, CLOSE_VIEW_GREAT_SWEEP } from '../src/close-view-player-presentation.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8'));
const raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const SWEEP = { id: 'secondary-great-sweep', name: 'Great Sweep', slot: 'secondary', power: 12, tier: 'rare', property: 'brawler' };
const ORRERY = { id: 'secondary-aether-orrery', name: 'Aether Orrery', slot: 'secondary', power: 12, tier: 'rare', property: 'orrery' };
const calm = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} };
const tool = { state: { x: 0, y: 0 }, consume: (k: string) => k === 'tool', held: () => false, reset: () => {} };
const once = (key: string) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k: string) => k === key && !used && (used = true), held: () => false, reset: () => {} }; };

function arena(passives: string[] = [], closeView = false) {
  const s: any = freshSave(); s.seed = 'SWEEP-360'; s.level = 20; s.closeView = closeView; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = passives.map((id) => `field:${id}`);
  s.equipment.secondary = passives.length ? normalizeItemUpgrade({ ...SWEEP, tier: 'relic', affixes: [] }) : structuredClone(SWEEP); s.activeWeaponSlot = 'primary';
  const g: any = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; g.paused = false; s.session.paused = false; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = []; g.projectiles = []; g.effects = [];
  return { s, g };
}
const open = (g: any) => { for (const t of g.map.tiles) { t.blocked = false; t.openAir = false; t.courtyard = false; t.pentRoof = false; t.pentBalcony = false; t.environment = false; if (t.kind === 'yardGrass' || t.kind === 'water' || t.kind === 'river') t.kind = 'flagFloor'; } g.map.objects = (g.map.objects || []).filter((o: any) => o.kind !== 'npc'); };
// The Proving Ground's dungeon room (a real interior that saves and reloads), ground cleared.
function interior() { const g: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game; g.save.closeView = true; g.save.activeWeaponSlot = 'primary'; g.save.equipment.secondary = structuredClone(SWEEP); open(g); g.enemies = []; g.projectiles = []; g.effects = []; g.save.lastAim = { x: 1, y: 0 }; g.player.facing = 'right'; return g; }
const foeAt = (g: any, deg: number, dist: number, id = `f${deg}`) => Object.assign(createCombatant('ashling', g.player.x + Math.cos(deg * Math.PI / 180) * dist, g.player.y + Math.sin(deg * Math.PI / 180) * dist), { id, hp: 1e6, maxHp: 1e6, damage: 0, cooldown: 1e9, speed: 0, speedMultiplier: 1e-6, meleePatterns: [] });
// Frames with the foes and the Wayfarer pinned; logs every hit with the swing clock.
function play(g: any, foes: any[], from: number, ms: number, input: any = calm, dt = 8) {
  const home = foes.map((f) => [f.x, f.y]), px = g.player.x, py = g.player.y, log: any[] = []; let t = from;
  for (let i = 0; i * dt < ms; i++) {
    g.enemies = g.enemies.filter((e: any) => foes.includes(e)); foes.forEach((f, k) => { f.x = home[k][0]; f.y = home[k][1]; f.hitStun = 0; }); g.player.x = px; g.player.y = py; g.player.invulnerableUntil = t + 1e6;
    const before = foes.map((f) => f.hp); g.update(dt / 1000, i === 0 ? input : (input === tool ? tool : calm), t);
    foes.forEach((f, k) => { if (f.hp < before[k]) log.push({ id: f.id, at: t - from, elapsed: g.toolSwing?.elapsedMs, dealt: before[k] - f.hp }); });
    t += dt;
  }
  return { log, end: t };
}

// ---------------------------------------------------------------- the Aether Orrery drops
test('the Aether Orrery drops from its own versioned stream: about one tool drop in thirteen, from the start', () => {
  assert.ok(Object.isFrozen(ORRERY_LOOT)); assert.equal(ORRERY_LOOT.stream, 'aether-orrery-loot:v1'); assert.equal(ORRERY_LOOT.band, 0, '2026-11-25 (Tim): every weapon and tool from the start (was 13)');
  const s: any = freshSave(); s.seed = 'ORRERY-DROPS'; s.level = 31; s.perception.aperture = APERTURE_BANDS[18].threshold; // Tim: Infinite VIII, level 31
  const g: any = new Game(s, 0); let tools = 0, orr = 0;
  for (let i = 0; i < 6000; i++) { s.inventory = []; g.obtainDrop(i % 2 ? 'rootBrute' : 'chest', i % 3 === 0); const it = s.inventory[0]; if (it?.slot === 'secondary') { tools++; if (it.name === 'Aether Orrery') { orr++; assert.ok(isValidItem(it)); assert.equal(rangedWeapon(it).orrery, true); } } }
  const rate = orr / tools; assert.ok(rate > 1 / 20 && rate < 1 / 8, `1 in ${(tools / orr).toFixed(1)} tool drops`);
  // 2026-11-25: below its gift's band it drops too (it is still given once at that band, as before)
  const low: any = freshSave(); low.seed = 'ORRERY-DROPS'; low.level = 31; low.perception.aperture = 0; const gl: any = new Game(low, 0); let lowOrr = 0;
  for (let i = 0; i < 1500; i++) { low.inventory = []; gl.obtainDrop('chest'); if (low.inventory[0]?.name === 'Aether Orrery') lowOrr++; }
  assert.ok(lowOrr > 0, 'it drops at band 0');
});

test('existing seeds generate byte for byte as before; the Orrery roll only renames an ordinary secondary drop', () => {
  const h = createHash('sha256');
  for (let n = 0; n < 3000; n++) for (const lvl of [3, 31]) { h.update(JSON.stringify(generateItem(`PIN-SEED:${n % 2 ? 'rootBrute' : 'chest'}:${n}`, lvl, null))); h.update(JSON.stringify(generateItem(`PIN-SEED:ordinary:${n}`, lvl, { ordinaryMonster: true }))); }
  assert.equal(h.digest('hex'), 'f73f7ffdbedf89990e3328ae15579d1b76098dfb61a4f3d343804ecd84e38493', 'the digest measured on release 953 before this change');
  let renamed = 0;
  for (let n = 0; n < 4000; n++) { const seed = `PIN-SEED:chest:${n}`, a: any = generateItem(seed, 31, null), b: any = generateItem(seed, 31, { orreryLoot: ORRERY_LOOT.version });
    if (b.name === 'Aether Orrery') { renamed++; assert.equal(a.slot, 'secondary'); assert.deepEqual({ ...b, name: a.name, property: a.property }, a); } else assert.deepEqual(b, a); }
  assert.ok(renamed > 0);
  assert.deepEqual(generateItem('PIN-SEED:chest:7', 31, { orreryLoot: 99 }), generateItem('PIN-SEED:chest:7', 31, null), 'an unknown version rolls nothing new');
});

// ---------------------------------------------------------------- held in the right hand
function hero(extra: any) {
  const state = createHeroPoseState(asset), frame = createHeroFrame(asset);
  assert.ok(sampleCloseViewHero(asset, state, { nowMs: 3000, reducedMotion: false, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, heldProfile: 'verge-cleaver', alpha: 1, tint: [1, 1, 1], hitFlash: 0, ...extra }, frame));
  return { state, frame };
}
test('the Orrery floats over the open right palm, steady through idle and walking; its colours are data', () => {
  assert.equal(closeViewHeldToolKind({ equipment: { secondary: ORRERY } }), 'orrery');
  assert.equal(closeViewHandRoles('orrery-tap').grip, 'leftSocket', 'source-left: the displayed right hand');
  assert.equal(ORRERY_HELD.colors.core, 0xff8a2a); assert.equal(ORRERY_HELD.colors.moons.length, 3); assert.ok(Object.isFrozen(ORRERY_HELD.colors));
  assert.ok(ORRERY_HELD_TRIANGLES > 0 && ORRERY_HELD_TRIANGLES <= 48);
  const at: number[][] = [];
  for (const [speed, gaitPhase] of [[0, 0], [1.6, .4], [1.6, 2.1], [3.6, 4]]) {
    const { state, frame } = hero({ speed, gaitPhase, heldTool: 'orrery' });
    assert.ok(state.primaryGripResidual < .03, `the palm reaches its place (${speed})`); const m = frame.leftSocket, G = (state as any).global, o = 24 * 16 /* the torso */, h = 6 * 16 /* the right palm (source-left grip node) */; at.push([G[h + 12] - G[o + 12], G[h + 13] - G[o + 13], G[h + 14] - G[o + 14]]);
    const out = new Float32Array(400 * MODEL_FLOATS), end = writeCloseViewHeldTool(out, 0, { offhand: 'orrery', offhandSocket: m, alpha: 1, tint: [1, 1, 1], clock: 1000 });
    assert.equal(end / MODEL_FLOATS / 3, ORRERY_HELD_TRIANGLES); let lo = Infinity; for (let i = 0; i < end; i += MODEL_FLOATS) { assert.ok(Number.isFinite(out[i]) && Number.isFinite(out[i + 9])); lo = Math.min(lo, out[i + 2]); }
    assert.ok(lo > m[14], 'it floats above the palm, never in the hand');
  }
  // .06 before HERO_STAND (2026-11-26): standing straight, the idle torso is upright where the run leans in, so the palm sits
  // about .04 nearer the chest at idle than it did (forward of the torso .436 standing, .504 running; was .479 standing).
  for (const p of at) assert.ok(Math.hypot(p[0] - at[0][0], p[1] - at[0][1], p[2] - at[0][2]) < .075, `the open palm holds steady through the gait ${JSON.stringify(at)}`);
  // the right hand is not the primary's: the primary is in the left (source rightSocket)
  assert.equal(closeViewHandRoles('verge-cleaver').grip, 'rightSocket');
  // the small spheres turn slowly, and hold still with reduced motion
  const m = hero({ heldTool: 'orrery' }).frame.leftSocket, a = new Float32Array(400 * MODEL_FLOATS), b = new Float32Array(400 * MODEL_FLOATS), c = new Float32Array(400 * MODEL_FLOATS);
  writeCloseViewHeldTool(a, 0, { offhand: 'orrery', offhandSocket: m, clock: 0 }); writeCloseViewHeldTool(b, 0, { offhand: 'orrery', offhandSocket: m, clock: 900 }); writeCloseViewHeldTool(c, 0, { offhand: 'orrery', offhandSocket: m, clock: 900, still: true });
  assert.notDeepEqual(a, b); assert.deepEqual(a, c);
});

test('the Great Sweep is held in the right hand whenever it is equipped, beside the primary, inside the hero triangle budget', () => {
  assert.equal(closeViewHeldToolKind({ equipment: { secondary: SWEEP } }), 'great-sweep');
  assert.equal(closeViewHeldToolKind({ equipment: { secondary: { name: 'Lumen Spindle', slot: 'secondary' } } }), '');
  assert.equal(CLOSE_VIEW_HELD_GEAR['great-sweep'].hand, 'right'); assert.equal(closeViewHandRoles('great-sweep').grip, 'leftSocket');
  // budget: the kit, the largest primary and the held tool fit one hero slot plus its reservation
  assert.ok(GREAT_SWEEP_HELD_TRIANGLES <= 72 && HERO_KIT_MAX_TRIANGLES + 96 + Math.max(GREAT_SWEEP_HELD_TRIANGLES, ORRERY_HELD_TRIANGLES) <= MODEL_MAX_VERTICES / 3 + HERO_SLOT_EXTRA_TRIANGLES);
  const { state, frame } = hero({ heldTool: 'great-sweep' }); assert.ok(state.primaryGripResidual < .03, 'the carry is a real held pose');
  const out = new Float32Array(400 * MODEL_FLOATS), end = writeCloseViewHeldTool(out, 0, { offhand: 'great-sweep', offhandSocket: frame.leftSocket, alpha: 1 });
  assert.equal(end / MODEL_FLOATS / 3, GREAT_SWEEP_HELD_TRIANGLES); for (let i = 0; i < end; i++) assert.ok(Number.isFinite(out[i]));
  assert.equal(writeCloseViewHeldTool(out, 0, { offhand: 'great-sweep', offhandSocket: frame.leftSocket }, 10), 0, 'refused past its limit');
  // the model: a long handle and a wide broken stub (recipe space: the grip at z .79, width along y)
  let zMin = Infinity, zMax = -Infinity, yMin = Infinity, yMax = -Infinity; for (const p of HERO_GREAT_SWEEP) for (let i = 0; i < p.mesh.length; i += 9) { const z = p.mesh[i + 2] + p.pz, y = p.mesh[i + 1]; zMin = Math.min(zMin, z); zMax = Math.max(zMax, z); yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); }
  assert.ok(.79 - zMin > .3 && zMax - .79 > 1, 'a long handle running past the hand'); assert.ok(yMax - yMin > .5, 'a giant\'s broad blade');
});

// ---------------------------------------------------------------- the 360° swing
test('without Mirage of Blades the blade hits foes all round, in sweep order, once each', () => {
  const S = GREAT_SWEEP_SWING; assert.ok(Object.isFrozen(S)); assert.equal(S.windupMs + S.activeMs, 600); assert.equal(S.recoveryMs + S.hitStopMs, BRAWLER['great-sweep'].cooldown * 1000);
  for (const closeView of [false, true]) {
    const { g } = arena([], closeView), angles = [0, 45, 90, 135, 180, 225, 270, 315], foes = angles.map((a) => foeAt(g, a, 1.6)); g.enemies = foes.slice();
    const { log } = play(g, foes, 1000, 990, once('tool'));
    assert.equal(log.length, 8, 'every foe round him is hit'); assert.equal(new Set(log.map((h) => h.id)).size, 8, 'once each');
    const T = sweepTimes(1, {}); for (const h of log) assert.ok(h.elapsed > T.windEnd && h.elapsed <= T.activeEnd + S.hitStopMs + 16, `in the active window (${h.elapsed})`);
    // sweep order: the forehand starts at the aim's right (+90) and turns counter-clockwise on screen
    const along = (deg: number) => ((S.from - deg) % 360 + 360) % 360, order = [...log].sort((a, b) => a.at - b.at || along(+a.id.slice(1)) - along(+b.id.slice(1))).map((h) => +h.id.slice(1));
    const want = [...angles].sort((a, b) => along(a) - along(b)); assert.deepEqual(order, want);
    for (let i = 1; i < log.length; i++) assert.ok(log[i].at >= log[i - 1].at);
    assert.ok(log.filter((h) => h.at === log[0].at).length <= 2, 'they fall one after another, not all at once');
  }
  // a foe out past the tip is untouched; a wall between stops the blade
  const { g } = arena(), far = foeAt(g, 0, BRAWLER['great-sweep'].radius + 1.2, 'far'), walled = foeAt(g, 180, 1.8, 'walled'); g.map.tiles[10 * 32 + 9].blocked = true; g.map.tiles[10 * 32 + 8].blocked = true; g.enemies = [far, walled];
  const { log } = play(g, [far, walled], 1000, 990, once('tool')); assert.equal(log.length, 0);
});

test('with Mirage of Blades he still swings all the way round, the swing deals nothing, and the blades are as before', () => {
  const { g } = arena(['nanoknives']), near = foeAt(g, 180, 1.3, 'near'), ahead = foeAt(g, 0, 1, 'ahead'); g.enemies = [near, ahead];
  g.update(.008, once('tool'), 1000);
  const q = g.toolSwing; assert.equal(q?.mirage, true); assert.equal(q.payload.damage, 0);
  const blades = g.projectiles.filter((p: any) => p.mirage); assert.equal(blades.length, 1);
  assert.equal(blades[0].damage, Math.max(1, Math.round(g.toolPower() * MIRAGE.share * g.glyphLoadout('tool').mods.damage)), 'the blade\'s damage unchanged');
  assert.equal(blades[0].speed, MIRAGE.speed); assert.equal(g.toolReadyAt, 1000 + MIRAGE.cooldown * 1000 * g.toolCooldownScale(), 'its cooldown unchanged');
  const T = sweepTimes(q.tempo, {}); assert.ok(Math.abs(T.recovery - MIRAGE.cooldown * 1000) < 1, 'the swing fits the blades\' cooldown');
  let t = 1008, sawActive = false; for (; t < 1000 + T.recovery + 50; t += 8) { near.x = g.player.x - 1.3; near.y = g.player.y; g.update(.008, calm, t); if (g.toolSwing && sampleSweep(g.toolSwing.elapsedMs, g.toolSwing.tempo, 1).phase === 'active') sawActive = true; }
  assert.ok(sawActive, 'the full turn is swung'); assert.equal(near.hp, near.maxHp, 'the swing itself deals nothing to the foe behind him');
  assert.ok(ahead.hp < ahead.maxHp, 'the thrown blade still cuts');
});

test('damage per second matches the old Great Sweep within ±10% (real code, 60 s of presses)', () => {
  for (const closeView of [false, true]) for (const n of [1, 5]) {
    const { g } = arena([], closeView), foes = Array.from({ length: n }, (_, i) => foeAt(g, i * 360 / n, 1.6, `d${i}`)); g.enemies = foes.slice();
    const before = g.toolPower(), { end } = play(g, foes, 1000, 60000, tool, 16);
    const dealt = foes.reduce((a, f) => a + f.maxHp - f.hp, 0), dps = dealt / 60;
    // release 953: one blow (toolPower × share) per foe per cooldown, landed at WAYFARER_DAMAGE.scale
    const old = n * wayfarerDamage(Math.max(1, Math.round(before * BRAWLER['great-sweep'].share))) / BRAWLER['great-sweep'].cooldown;
    assert.ok(Math.abs(dps / old - 1) <= .1, `${closeView ? 'Close' : 'Standard'} ${n} foes: ${dps.toFixed(1)} vs ${old.toFixed(1)} (end ${end})`);
  }
});

test('cast every frame for 60 s with cooldowns wiped: no NaN, the swing record and effects stay bounded', () => {
  for (const passives of [[], ['nanoknives']]) {
    const { g } = arena(passives), foes = Array.from({ length: 6 }, (_, i) => foeAt(g, i * 60, 1.5, `w${i}`)); g.enemies = foes.slice(); let t = 1000, maxFx = 0, maxShots = 0;
    for (let i = 0; i < 3750; i++) { g.toolReadyAt = 0; foes.forEach((f) => { f.hp = f.maxHp; }); g.update(.016, tool, t); t += 16; maxFx = Math.max(maxFx, g.effects.length); maxShots = Math.max(maxShots, g.projectiles.length);
      if (g.toolSwing) { assert.ok(Number.isFinite(g.toolSwing.elapsedMs)); assert.ok(g.toolSwing.hits.length <= GREAT_SWEEP_SWING.maxHits); } }
    assert.ok(maxFx < 40, `effects bounded (${maxFx})`); assert.ok(maxShots <= MIRAGE.max + 2, `blades bounded (${maxShots})`); assert.ok(foes.every((f) => Number.isFinite(f.hp)));
  }
});

test('exact resume mid-swing: the same hits on the same clock; a pause holds the swing', () => {
  for (const cut of [120, 400]) {
    const g = interior(), angles = [0, 90, 180, 270], foes = angles.map((a) => foeAt(g, a, 1.6)); g.enemies = foes.slice();
    play(g, foes, 100000, cut, once('tool'));
    const q = structuredClone(g.toolSwing); assert.equal(q.v, 1);
    const back: any = new Game(deserializeSave(serializeSave(g.exportSnapshot(100000 + cut))), 500000); back.installSystems(); open(back);
    const r = back.toolSwing; assert.equal(r.elapsedMs, q.elapsedMs); assert.deepEqual(r.hits, q.hits); assert.equal(r.stopLeft, q.stopLeft); assert.equal(r.direction, q.direction);
    const bfoes = foes.map((f) => Object.assign(foeAt(back, 0, 1.6, f.id), { x: f.x - g.player.x + back.player.x, y: f.y - g.player.y + back.player.y, hp: f.hp })); back.enemies = bfoes.slice();
    const a = play(g, foes, 100000 + cut, 900).log.map((h) => [h.id, h.at, h.dealt]), b = play(back, bfoes, 500008, 900).log.map((h) => [h.id, h.at, h.dealt]);
    assert.deepEqual(b, a, `cut at ${cut}`); assert.equal(back.toolSwing, null);
  }
  const { g } = arena(); g.update(.008, once('tool'), 1000); g.update(.008, calm, 1100); const e = g.toolSwing.elapsedMs; g.setPaused(true, 1100); g.setPaused(false, 9100); g.update(.008, calm, 9108); assert.equal(g.toolSwing.elapsedMs, e + 8);
  assert.equal(normalizeToolSwing({ v: 1, id: 'x' }), null, 'a malformed record is dropped');
});

test('the Close View spin follows the swing clock: a whole turn across the active window', () => {
  const T = sweepTimes(1, {}), s0 = sampleSweepPose(CLOSE_VIEW_GREAT_SWEEP, T.windEnd, T.recovery, {}), s1 = sampleSweepPose(CLOSE_VIEW_GREAT_SWEEP, T.activeEnd, T.recovery, {});
  assert.ok(Math.abs((s1.spin - s0.spin) * 180 / Math.PI - (CLOSE_VIEW_GREAT_SWEEP.spin.turn - CLOSE_VIEW_GREAT_SWEEP.spin.windup)) < 1e-6);
  assert.equal(sampleSweepPose(CLOSE_VIEW_GREAT_SWEEP, 0, T.recovery, {}).weight, 0); assert.equal(sampleSweepPose(CLOSE_VIEW_GREAT_SWEEP, T.recovery, T.recovery, {}).weight, 0);
  assert.equal(Math.abs(sweepDamageAngle(T.activeEnd, T, 1) - sweepDamageAngle(T.windEnd, T, 1)), 360);
});

// ---------------------------------------------------------------- the Mirage blades are Standard View's
test('the Mirage blades in Close View have Standard View\'s shapes, sizes and colours', () => {
  assert.deepEqual(MIRAGE_BLADE_KINDS, ['mirageSword', 'mirageAxe', 'mirageShuriken']); assert.deepEqual(SWEEP_BLADES, ['greatsword', 'greataxe', 'shuriken']);
  for (let i = 0; i < 3; i++) assert.equal(mirageBladePresentation({ mirage: true, x: 1, y: 1, age: .2, blade: i }).kind, MIRAGE_BLADE_KINDS[i]);
  const box = (kind: string) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; const colors = new Set(); for (const p of (MIRAGE_BLADE_MODELS as any)[kind]) for (let i = 0; i < p.mesh.length; i += 9) { const x = p.mesh[i] + p.px; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, p.mesh[i + 1]); y1 = Math.max(y1, p.mesh[i + 1]); colors.add([p.mesh[i + 6], p.mesh[i + 7], p.mesh[i + 8]].map((c) => Math.round(c * 255)).join()); } return { x0, x1, y0, y1, colors }; };
  const k = MIRAGE.size, near = (a: number, b: number) => Math.abs(a - b) < 1e-3, rgb = (c: number) => [c >> 16, (c >> 8) & 255, c & 255].join();
  const sw = box('mirageSword'), S = MIRAGE_BLADE_SHAPES.greatsword; // tip .42, pommel -.30 - .03, guard ±.12
  assert.ok(near(sw.x1, .42 * k) && sw.x0 <= S.grip[0] * k && sw.x0 >= (S.pommel[0] - S.pommel[1]) * k - 1e-3 && near(sw.y1, .12 * k) && near(sw.y0, -.12 * k), JSON.stringify(sw));
  for (const c of [0xe3e8ec, 0x8a6a3a, 0xffd23f]) assert.ok(sw.colors.has(rgb(c)));
  const ax = box('mirageAxe'); assert.ok(near(ax.x0, -.30 * k) && near(ax.x1, .29 * k) && near(ax.y1, .24 * k) && near(ax.y0, -.24 * k)); for (const c of [0xd9e0e6, 0x5a3d22, 0xffd23f]) assert.ok(ax.colors.has(rgb(c)));
  const sh = box('mirageShuriken'); assert.ok(near(sh.x1, .26 * k) && near(sh.x0, -.26 * k) && near(sh.y1, .26 * k)); for (const c of [0xc9d1d8, 0xffd23f]) assert.ok(sh.colors.has(rgb(c)));
  for (const kind of MIRAGE_BLADE_KINDS) { const n = modelTriangleCount(kind); assert.ok(n > 0 && n <= 64, `${kind} ${n}`);
    const a = { ...mirageBladePresentation({ mirage: true, x: 4, y: 5, age: .3, blade: MIRAGE_BLADE_KINDS.indexOf(kind) }), z: .82, reduceMotion: false, alpha: 1 }, out = new Float32Array(256 * 3 * MODEL_FLOATS), end = writeCloseViewModel(out, 0, a);
    assert.equal(end / MODEL_FLOATS / 3, n); for (let i = 0; i < end; i += MODEL_FLOATS) assert.ok(out[i + 2] > .6, 'flat with no camera: at chest height');
    // tipped up toward the camera (MIRAGE_BLADE_VIEW.tilt): seen from a camera looking along +x, the face leans back toward it
    const tilted = new Float32Array(256 * 3 * MODEL_FLOATS), e2 = writeCloseViewModel(tilted, 0, { ...a, camYaw: 0 }); assert.equal(e2, end);
    let nz = 0, nx = 0, lo = Infinity; const flats = (MIRAGE_BLADE_MODELS as any)[kind][0].mesh.length / 9 * MODEL_FLOATS; for (let i = 0; i < e2; i += MODEL_FLOATS) { lo = Math.min(lo, tilted[i + 2]); if (i < flats && tilted[i + 5] > nz) { nz = tilted[i + 5]; nx = tilted[i + 3]; } } // the first part: the blade's own flats
    const deg = Math.atan2(-nx, nz) * 180 / Math.PI; assert.ok(Math.abs(deg - MIRAGE_BLADE_VIEW.tilt) < 1, `${kind} face tipped ${deg.toFixed(1)}° toward the camera`); assert.ok(MIRAGE_BLADE_VIEW.tilt >= 35 && MIRAGE_BLADE_VIEW.tilt <= 50); assert.ok(lo > .15, 'still clear of the floor'); }
});

// ---------------------------------------------------------------- answers from Tim (2026-11-14)
test('a cancel (a primary, a dodge, a jump) in the wind-up or mid-turn still hits every foe in the circle exactly once', () => {
  const T = sweepTimes(1, {});
  for (const cancel of ['primary', 'dodge', 'jump']) for (const at of [100, 400]) {
    const { g } = arena(), angles = [0, 45, 90, 135, 180, 225, 270, 315], foes = angles.map((a) => foeAt(g, a, 1.6)); g.enemies = foes.slice();
    g.save.equipment.primary = { id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 5, property: 'impact' }; g.player.stamina = 1e6;
    const press = (i: number) => i === 0 ? once('tool') : i === at / 8 && cancel !== 'primary' ? once(cancel) : calm;
    const home = foes.map((f) => [f.x, f.y]), seen = new Map(); let t = 1000, swingBefore = null, sweepHits = 0;
    for (let i = 0; i * 8 < 1100; i++) {
      foes.forEach((f, k) => { f.x = home[k][0]; f.y = home[k][1]; f.hitStun = 0; }); g.enemies = g.enemies.filter((e: any) => foes.includes(e)); g.player.invulnerableUntil = t + 1e6;
      if (cancel === 'primary' && i === at / 8) { g.player.attackReadyAt = 0; g.attackAction = 'attack'; try { g.primaryAttack(t, { x: 0, y: -1 }); } finally { g.attackAction = null; } } // a cut away from most of the ring
      const list = g.effects; list.push = function (...xs: any[]) { for (const e of xs) if (e?.swingHit) for (const f of e.only) seen.set(f.id, (seen.get(f.id) || 0) + 1); return Array.prototype.push.apply(this, xs); }; // every blow the swing gives
      swingBefore = g.toolSwing; g.update(.008, press(i), t);
      if (i === at / 8) { assert.ok(swingBefore, `${cancel}@${at}: swinging before`); assert.equal(g.toolSwing, null, `${cancel}@${at}: the animation ends at once`); }
      t += 8;
    }
    assert.deepEqual([...seen.keys()].sort(), foes.map((f) => f.id).sort(), `${cancel}@${at}: every foe in the circle`);
    assert.ok([...seen.values()].every((n) => n === 1), `${cancel}@${at}: once each`);
  }
  // the Mirage swing deals nothing when cancelled either
  const { g } = arena(['nanoknives']), near = foeAt(g, 180, 1.3, 'near'), ahead = foeAt(g, 0, 1, 'ahead'); g.enemies = [near, ahead]; g.player.stamina = 1e6;
  g.update(.008, once('tool'), 1000); g.update(.008, once('jump'), 1008); assert.equal(g.toolSwing, null); for (let t = 1016; t < 1300; t += 8) { near.x = g.player.x - 1.3; near.y = g.player.y; g.update(.008, calm, t); } assert.equal(near.hp, near.maxHp);
});

test('cancelling every swing at once keeps the damage per second', () => {
  const { g } = arena(), foes = Array.from({ length: 5 }, (_, i) => foeAt(g, i * 72, 1.6, `c${i}`)); g.enemies = foes.slice(); g.player.stamina = 1e6;
  const home = foes.map((f) => [f.x, f.y]), px = g.player.x, py = g.player.y, power = g.toolPower(); let t = 1000, cancelAt = -1;
  for (let i = 0; i * 16 < 60000; i++) {
    foes.forEach((f, k) => { f.x = home[k][0]; f.y = home[k][1]; f.hitStun = 0; }); g.enemies = g.enemies.filter((e: any) => foes.includes(e)); g.player.x = px; g.player.y = py; g.player.invulnerableUntil = t + 1e6; g.player.stamina = 1e6;
    const ready = g.toolReadyAt; g.update(.016, i === cancelAt ? once('dodge') : tool, t); if (g.toolReadyAt !== ready) cancelAt = i + 3; // a dodge 48 ms after each press
    t += 16;
  }
  const dps = foes.reduce((a, f) => a + f.maxHp - f.hp, 0) / 60, old = 5 * wayfarerDamage(Math.max(1, Math.round(power * BRAWLER['great-sweep'].share))) / BRAWLER['great-sweep'].cooldown;
  assert.ok(Math.abs(dps / old - 1) <= .1, `${dps.toFixed(1)} vs ${old.toFixed(1)}`);
});

test('the Orrery is given once more to a save that was given it but no longer has one', () => {
  const s: any = freshSave(); s.worldFlags = { [ORRERY_FORM.flag]: true }; s.inventory = [];
  assert.equal(ownsAetherOrrery(s), false); assert.equal(regiftOrreryGear(s), true); assert.equal(s.inventory.filter((q: any) => q.name === 'Aether Orrery').length, 1); assert.equal(s.worldFlags[ORRERY_FORM.regift], true);
  s.inventory = []; assert.equal(regiftOrreryGear(s), false, 'never twice'); assert.equal(s.inventory.length, 0);
  const never: any = freshSave(); never.worldFlags = {}; assert.equal(regiftOrreryGear(never), false, 'only for saves that had the gift'); assert.equal(never.worldFlags[ORRERY_FORM.regift], undefined);
  for (const where of ['equipment', 'preset']) { const o: any = freshSave(); o.worldFlags = { [ORRERY_FORM.flag]: true }; o.inventory = []; if (where === 'equipment') o.equipment.secondary = { ...ORRERY_FORM.item }; else o.magicSkills.presets = [{ build: { gear: { secondary: { ...ORRERY_FORM.item } } } }];
    assert.equal(regiftOrreryGear(o), false, `owned in ${where}`); assert.equal(o.worldFlags[ORRERY_FORM.regift], 'owned'); }
  // a full pack still takes it (never salvaged for room); and on load it is given with a message
  const full: any = freshSave(); full.seed = 'REGIFT'; full.worldFlags = { [ORRERY_FORM.flag]: true }; full.perception.aperture = 1e6; full.inventory = Array.from({ length: 62 }, (_, i) => generateItem(`REGIFT:${i}`, 10, null)).filter((q: any) => q.name !== 'Aether Orrery');
  const n = full.inventory.length, g: any = new Game(full, 0); assert.equal(full.inventory.length, n + 1); assert.equal(g.glyphNotice || g.message, ORRERY_FORM.messages.regift);
});
