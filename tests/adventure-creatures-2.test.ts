// Adventure creatures, the second set (Tim, 2026-11-11: two for each of the other four themes, each theme its own; no bosses).
// Lamplit City: Lamplighter, Knellkeeper. Alien Capital: Spindrift Medusa, Prism Stilt. Frost Citadel: Rime Sentinel, Lake Glider.
// Ember Foundry: Hookhanger, Slagwright. And the buried Sinkmaw's dimple on the Close View floor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURE_CREATURES, ADVENTURE_KINDS, ADV, adventureCreaturesFor, lampLoop, heightReach, isAdventureKind } from '../src/adventure-creatures.ts';
import { MONSTER_PACK, PACK_KINDS, ATTACK_MODULES, GUARDIAN_POOL, PACK_EFFECT_CAP, BODY_HIT, validateMonster, packVariant, updatePackMonster, tickPackEffects, addPackEffect, freshPackState } from '../src/monster-pack.ts';
import { createCombatant, CREATURE_FORMS } from '../src/combat.ts';
import { ECHO_IDS } from '../src/echoes.ts';
import { regionalScale } from '../src/game.ts';
import { regionalThreat } from '../src/world.ts';
import { drawPackMonster, drawPackTelegraphs, drawPackEffects, drawNativePackFloor } from '../src/monster-render.ts';
import { ADVENTURE_SPRITE, adventureSpriteCount, clearAdventureSprites } from '../src/adventure-creature-render.ts';
import { ACTOR_PRESENTATION, PACK_ACTION_FAMILIES, nativeCreatureCoverage } from '../src/actor-presentation.ts';
import { CLOSE_VIEW_ADVENTURE_KINDS } from '../src/close-view-adventure-models.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelSupported, modelTriangleCount, modelSupportsAttachments, writeCloseViewModel } from '../src/close-view-models.ts';
import { createLabFixture, scenariosForLab } from '../src/proving-ground-labs.ts';

const THEMES = ['lamplitCity', 'alienCapital', 'frostCitadel', 'emberFoundry'];
const SECOND = THEMES.flatMap((t) => ADVENTURE_CREATURES[t].map((q) => q.kind));
function world({ size = 24, walls = [], level = () => 0, player = { x: 12, y: 12 } } = {}) {
  const blocked = new Set(walls.map(([x, y]) => `${x},${y}`)), cell = (v) => Math.floor(v + .5);
  const open = (x, y) => { const tx = cell(x), ty = cell(y); return tx >= 0 && ty >= 0 && tx < size && ty < size && !blocked.has(`${tx},${ty}`); };
  const lv = (x, y) => level(cell(x), cell(y));
  const w = {
    player: { ...player, hp: 1e6 }, width: size, height: size, dt: 1 / 30, now: 0, enemies: [], effects: [], hurts: [], opens: 0, slows: 0, playerVelocity: { x: 0, y: 0 }, playerFacing: { x: 1, y: 0 },
    open: (x, y) => { w.opens++; return open(x, y); }, tileOpen: (x, y) => open(x - .5, y - .5), projectileOpen: (x, y) => open(x - .5, y - .5), elevation: lv,
    los(a, b) { const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4) || 1; for (let i = 1; i < steps; i++) if (!open(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false; return true; },
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; if (!e.flying && lv(e.x + dx, e.y + dy) !== lv(e.x, e.y)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source, at: w.now }); w.player.hp -= amount; return true; },
    slow() { w.slows++; }, pull() { return false; }, addEffect(effect) { addPackEffect(w.effects, effect, w.now); },
  };
  return w;
}
function spawn(kind, x, y, w) { const e = createCombatant(kind, x, y); e.id = `adv2:${kind}:${x}:${y}`; e.aggro = true; w.enemies.push(e); return e; }
function step(w, e, seconds, each = null) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); w.effects = tickPackEffects(w.effects, w); each?.(w, e); } }
function only(e, id) { e.packAttacks = [id]; e.pack = freshPackState(); e.pack.gap = 0; }
const telegraphed = (w, e) => !!e.pack?.tele || w.effects.some((f) => f.owner === e.id && f.damage > 0 && f.arming > 0);

test('eight more original creatures, two for each of the other four themes, kept out of every existing roster', () => {
  for (const t of THEMES) assert.equal(ADVENTURE_CREATURES[t].length, 2, t);
  assert.deepEqual(SECOND, ['lamplighter', 'knellkeeper', 'spindriftMedusa', 'prismStilt', 'rimeSentinel', 'lakeGlider', 'hookhanger', 'slagwright']);
  for (const [alias, id] of [['city', 'lamplitCity'], ['alien', 'alienCapital'], ['frost', 'frostCitadel'], ['foundry', 'emberFoundry'], ['Lamplit City', 'lamplitCity'], ['ember-foundry', 'emberFoundry']]) assert.equal(adventureCreaturesFor(alias), ADVENTURE_CREATURES[id], alias);
  for (const kind of SECOND) {
    const d = MONSTER_PACK[kind]; assert.deepEqual(validateMonster(d), [], kind); assert.ok(d.prototypeOnly && d.adventureKin && d.noEcho && !d.unique && CREATURE_FORMS[kind], kind);
    assert.ok(!PACK_KINDS.includes(kind) && !GUARDIAN_POOL.includes(kind) && !ECHO_IDS.includes(kind) && isAdventureKind(kind), kind);
    for (let i = 0; i < 30; i++) assert.equal(packVariant(kind, `v-${i}`).hybridAttack, null);
    for (const id of [...d.attacks, ...d.bossAttacks]) if (!ATTACK_MODULES[id].passive) assert.ok(PACK_ACTION_FAMILIES[id], `${kind}/${id}`);
    assert.ok(d.stats[0] >= 30 && d.stats[0] <= 70, `${kind} takes a few hits`);
  }
  assert.equal(new Set(ADVENTURE_KINDS.map((k) => MONSTER_PACK[k].render)).size, ADVENTURE_KINDS.length, 'every adventure creature its own body');
  for (const kind of PACK_KINDS) for (let i = 0; i < 20; i++) assert.ok(!['lampFlare', 'bellToll', 'tendrilRain', 'membranePulse', 'phaseStep', 'icicleLine', 'glideRake', 'pendulumSwing', 'slagPour', 'poleThrust', 'prismBeam', 'heavySweep'].includes(packVariant(kind, `d-${i}`).hybridAttack));
  for (const id of ['glideRake', 'pendulumSwing']) assert.ok(BODY_HIT[id] > 0, `${id} shows its body footprint`);
});

test('the AI step is deterministic for every new creature', () => {
  for (const kind of SECOND) {
    const run = () => { const w = world({ walls: [[16, 8], [16, 9], [16, 10]], level: (x) => (x <= 6 ? 2 : 0), player: { x: 10, y: 12 } }), e = spawn(kind, 5, 11, w), trace = [];
      step(w, e, 12, (w2, q) => { if (Math.round(w2.now) % 500 < 34) trace.push([q.x.toFixed(4), q.y.toFixed(4), q.pack.attack, q.pack.phase, (q.hopLift || 0).toFixed(4), w2.effects.length].join('|')); w2.player.x = 10 + Math.sin(w2.now / 900) * 2; w2.player.y = 12 + Math.cos(w2.now / 1300); });
      return { trace, hurts: w.hurts.map((h) => `${h.source}:${h.amount}:${Math.round(h.at)}`) }; };
    assert.deepEqual(run(), run(), kind);
  }
});

test('every new attack shows its telegraph at least 0.4 s before any damage lands', () => {
  const cases = [['lamplighter', 'lampFlare', 5], ['lamplighter', 'poleThrust', 2], ['rimeSentinel', 'poleThrust', 2], ['knellkeeper', 'bellToll', 2.5], ['knellkeeper', 'heavySweep', 1.5], ['slagwright', 'heavySweep', 1.5], ['spindriftMedusa', 'tendrilRain', 5], ['spindriftMedusa', 'membranePulse', 1.5],
    ['prismStilt', 'prismBeam', 5], ['rimeSentinel', 'icicleLine', 4], ['lakeGlider', 'glideRake', 4], ['hookhanger', 'pendulumSwing', 3], ['slagwright', 'slagPour', 4]];
  for (const [kind, id, gap] of cases) {
    const w = world({ level: (x) => (kind === 'hookhanger' && x <= 7 ? 2 : 0), player: { x: 7 + gap, y: 12 } }), e = spawn(kind, 7, 12, w); only(e, id); let warned = null, hit = null;
    step(w, e, 6, (w2, q) => { if (warned == null && telegraphed(w2, q)) warned = w2.now; if (hit == null && w2.hurts.length) hit = w2.hurts[0].at; });
    assert.ok(hit != null, `${kind}/${id} lands`); assert.ok(warned != null && hit - warned >= 400, `${kind}/${id}: warned ${warned}, hit ${hit}`);
  }
});

test('the Lamplighter walks its beat and sees only in its lamp\'s cone, or close by', () => {
  const w = world({ size: 40, player: { x: 35, y: 35 } }), e = spawn('lamplighter', 15, 15, w); e.aggro = false; const legs = new Set();
  step(w, e, 30, (w2, q) => legs.add(q.advLeg)); assert.ok(legs.size >= 3, `walks its loop (${[...legs]})`); assert.deepEqual(e.advLoop, lampLoop(e.id, e.advHome, w));
  const h = e.advHeading; assert.ok(h && Math.abs(Math.hypot(h.x, h.y) - 1) < 1e-6);
  // Behind it, five tiles off: unseen. Ahead of it, five tiles off: seen. Close by, behind: seen.
  const look = (dx, dy) => { const v = world({ size: 40, player: { x: 20 + dx, y: 20 + dy } }), q = spawn('lamplighter', 20, 20, v); q.aggro = false; q.advHome = { x: 20, y: 20 }; q.advLoop = [{ x: 30, y: 20 }]; q.advLeg = 0; step(v, q, .2); return q.aggro; };
  assert.equal(look(-5, 0), false, 'behind it'); assert.equal(look(5, 0), true, 'in its lamp'); assert.equal(look(-1.5, 0), true, 'close by');
});

test('height: the toll never touches higher ground, ranged reach grows from above, slag runs only downhill', () => {
  const toll = (rise) => { const w = world({ level: (x) => (x >= 10 ? rise : 0), player: { x: 10.5, y: 12 } }), e = spawn('knellkeeper', 8, 12, w); only(e, 'bellToll'); step(w, e, 3); return w.hurts.filter((h) => h.source === 'bellToll').length; };
  assert.ok(toll(0) >= 1, 'level: the rings land'); assert.equal(toll(1), 0, 'a level above the bell: safe');
  for (const [kind, id] of [['lamplighter', 'lampFlare'], ['rimeSentinel', 'icicleLine'], ['slagwright', 'slagPour']]) {
    const far = ATTACK_MODULES[id].range[1] + 1.4, tryAt = (rise) => { const w = world({ level: (x) => (x <= 4 ? rise : 0), player: { x: 4 + far, y: 12 } }), e = spawn(kind, 4, 12, w); only(e, id); let started = false; step(w, e, 1, (w2, q) => { if (q.pack.attack === id) started = true; }); return started; };
    assert.equal(tryAt(0), false, `${kind} level`); assert.equal(tryAt(2), true, `${kind} from two up`); assert.ok(heightReach(id, 99) <= ADV.reach[id].max);
  }
  // Slag poured on a terrace runs down the steps (3 levels below) and stops; poured on flat ground it stays one pool.
  const pour = (level) => { const w = world({ level, player: { x: 9, y: 12 } }), e = spawn('slagwright', 4, 12, w); only(e, 'slagPour'); let most = 0, cells = new Set(); step(w, e, 6, (w2) => { const pools = w2.effects.filter((f) => f.kind === 'slagPool'); most = Math.max(most, pools.length); for (const f of pools) cells.add(`${Math.round(f.x)},${Math.round(f.y)}:${level(Math.round(f.x), Math.round(f.y))}`); }); return { most, cells: [...cells] }; };
  const flat = pour(() => 0); assert.equal(flat.cells.length, 1);
  const steps = pour((x) => Math.max(0, 12 - x)); assert.ok(steps.cells.length > 1 && steps.cells.length <= ADV.slag.steps + 1, steps.cells.join(' '));
  const levels = steps.cells.map((c) => Number(c.split(':')[1])); for (let i = 1; i < levels.length; i++) assert.ok(levels[i] < levels[i - 1], 'only ever down');
});

test('vertical movers: the Hookhanger swings from above and climbs back; the Prism Stilt steps up; the Medusa drifts up', () => {
  { const w = world({ player: { x: 10, y: 12 } }), e = spawn('hookhanger', 8, 12, w); let swings = 0; step(w, e, 8, (w2, q) => { if (q.pack.attack === 'pendulumSwing') swings++; }); assert.equal(swings, 0, 'no ledge, no wall: no swing'); }
  const w = world({ level: (x) => (x <= 5 ? 2 : 0), player: { x: 8, y: 12 } }), e = spawn('hookhanger', 5, 12, w); let climbed = null, swung = false, passed = false;
  step(w, e, 14, (w2, q) => { if (q.pack.attack === 'pendulumSwing' && q.pack.phase === 'active') { swung = true; if (q.x > 8.5) passed = true; } if (!climbed && q.pack.attack === 'ledgeClimb' && q.pack.phase === 'recover') climbed = { x: q.x }; w2.player.hp = 1e6; });
  assert.ok(swung && passed, 'it swung through and past'); assert.ok(w.hurts.some((h) => h.source === 'pendulumSwing')); assert.ok(climbed && climbed.x <= 5.5, 'and climbed back up');
  const v = world({ level: (x, y) => (y <= 8 ? 2 : 0), player: { x: 12, y: 12 } }), s = spawn('prismStilt', 12, 11, v); only(s, 'phaseStep'); let peak = 0; step(v, s, 1.5, (w2, q) => { peak = Math.max(peak, q.hopLift || 0); });
  assert.equal(v.elevation(s.x, s.y), 2, `stepped up (${s.x.toFixed(1)}, ${s.y.toFixed(1)})`); assert.equal(peak, 0, 'a step, not a hop');
  const lift = (rise) => { const u = world({ level: (x) => (x >= 10 ? rise : 0), player: { x: 11, y: 12 } }), m = spawn('spindriftMedusa', 6, 12, u); m.aggro = false; step(u, m, 3); return m.hopLift; };
  assert.ok(lift(2) > lift(0) + .5 && lift(0) >= ADV.medusa.altitude - .01, 'higher over a Wayfarer above');
});

test('the Lake Glider rakes its lane, rebounds once off a wall, hits once, and leaves a few slicks', () => {
  const w = world({ walls: [[14, 11], [14, 12], [14, 13]], player: { x: 11, y: 12 } }), e = spawn('lakeGlider', 7, 12, w); only(e, 'glideRake'); let turned = false, maxX = 0;
  step(w, e, 2.5, (w2, q) => { maxX = Math.max(maxX, q.x); if (q.pack.attack === 'glideRake' && q.pack.data?.rebounds === 0) turned = true; });
  assert.ok(turned && maxX < 13.6, 'turned off the wall'); assert.equal(w.hurts.filter((h) => h.source === 'glideRake').length, 1);
  const slicks = w.effects.filter((f) => f.kind === 'iceSlick').length; assert.ok(slicks >= 1 && slicks <= ADV.glide.slicks, `${slicks} slicks`);
});

test('bounded: rings, icicles, tendrils and effects stay within their counts and the pack cap', () => {
  for (const [kind, id, kindOf, n] of [['knellkeeper', 'bellToll', 'tollRing', ADV.toll.rings], ['rimeSentinel', 'icicleLine', 'icicle', ADV.icicles.count], ['spindriftMedusa', 'tendrilRain', 'tendrilFall', ADV.medusa.count]]) {
    const w = world({ player: { x: 10, y: 12 } }), e = spawn(kind, 6, 12, w); only(e, id); let most = 0; step(w, e, 1.2, (w2) => { most = Math.max(most, w2.effects.filter((f) => f.kind === kindOf).length); });
    assert.ok(most >= 1 && most <= n, `${kind} ${most}/${n}`);
  }
  for (const kind of SECOND) { const w = world({ size: 30, level: (x) => (x <= 8 ? 2 : 0), player: { x: 14, y: 15 } }), e = spawn(kind, 8, 15, w); let worst = 0; step(w, e, 30, (w2, q) => { q.pack.cd = {}; q.pack.gap = 0; assert.ok(w2.effects.length <= PACK_EFFECT_CAP); worst = Math.max(worst, w2.opens); w2.opens = 0; w2.player.hp = 1e6; w2.player.x = 14 + Math.sin(w2.now / 800) * 3; }); assert.ok(worst <= 200, `${kind} worst frame ${worst} floor tests`); }
});

test('no single blow one-shots: every new creature\'s worst hit stays under the strongest ordinary hit', () => {
  const ordinary = PACK_KINDS.filter((k) => !MONSTER_PACK[k].unique && !MONSTER_PACK[k].dungeonOnly).flatMap((k) => MONSTER_PACK[k].attacks.map((id) => Math.ceil(MONSTER_PACK[k].stats[1] * (ATTACK_MODULES[id].damage || 0)))), strongest = Math.max(...ordinary);
  for (const kind of SECOND) {
    const d = MONSTER_PACK[kind], worst = Math.max(...d.attacks.map((id) => Math.ceil(d.stats[1] * (ATTACK_MODULES[id].damage || 0)))); assert.ok(worst <= strongest, `${kind} ${worst} vs ${strongest}`);
    for (const ring of [0, 25, 80]) { const e = regionalScale(createCombatant(kind, 1, 1), regionalThreat(ring, 0)), t = regionalScale(createCombatant('thunderhorn', 1, 1), regionalThreat(ring, 0)); assert.ok(e.damage <= t.damage && e.threatRing === ring); }
  }
});

test('the Proving Ground places each by habitat on safe floor, regionally scaled, and they fight in the real game', () => {
  const ids = scenariosForLab('combat').map((q) => q.id); for (const kind of SECOND) assert.ok(ids.includes(kind), kind);
  for (const kind of SECOND) {
    const f = createLabFixture({ lab: 'combat', scenario: kind, environment: 'adventure-heights', variant: 1, now: 0 }), g = f.game, tile = (q) => g.map.tiles[Math.round(q.y) * 32 + Math.round(q.x)], hp = g.player.hp, seen = new Set(); let worst = 0;
    assert.ok(g.enemies.length >= 1, kind);
    for (const e of g.enemies) { const t = tile(e); assert.ok(t && !t.blocked && !t.slope && !t.doorway, `${kind} on safe floor`); assert.equal(e.threatRing, 1); if (['knellkeeper', 'prismStilt', 'rimeSentinel', 'hookhanger', 'slagwright'].includes(kind)) assert.ok((t.elev || 0) >= 1, `${kind} up on the gallery`); }
    for (let i = 0; i < 60 * 12; i++) { g.update(1 / 60, { state: { x: 0, y: 0 }, consume: () => false }, 10000 + i * 1000 / 60); for (const q of g.enemies) if (q.pack?.attack) seen.add(q.pack.attack); worst = Math.max(worst, hp - g.player.hp); g.player.hp = hp; }
    assert.ok(seen.size >= 1, `${kind} attacked`); assert.ok(worst < hp * .4, `${kind}: worst blow ${worst} of ${hp}`);
  }
});

test('drawn once into cached sprites, telegraphs and effects without gradients; the buried Sinkmaw shows on the Close View floor', () => {
  const made = []; let grads = 0;
  const mock = () => new Proxy({ createRadialGradient: () => (grads++, { addColorStop() {} }), createLinearGradient: () => (grads++, { addColorStop() {} }) }, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => (o[k] = v, true) });
  const saved = globalThis.document; globalThis.document = { createElement: () => { const c = { width: 0, height: 0, getContext: () => mock() }; made.push(c); return c; } };
  try {
    clearAdventureSprites(); const calls = []; const ctx = new Proxy({ drawImage: (...a) => calls.push(a), createRadialGradient: () => (grads++, { addColorStop() {} }), createLinearGradient: () => (grads++, { addColorStop() {} }) }, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => (o[k] = v, true) });
    for (const kind of SECOND) { const e = createCombatant(kind, 5, 5); e.id = `d:${kind}`; calls.length = 0; assert.ok(drawPackMonster(ctx, e, 32, 1000), kind); assert.equal(calls.length, 1, kind); const box = ADVENTURE_SPRITE.box[kind]; assert.ok(box && calls[0][3] <= 32 * e.scale * box[0] + 2, kind); }
    const before = made.length, g0 = grads; for (let i = 0; i < 20; i++) for (const kind of SECOND) { const e = createCombatant(kind, 5, 5); e.id = `d:${kind}`; drawPackMonster(ctx, e, 32, 2000 + i * 16); }
    assert.equal(made.length, before); assert.equal(grads, g0); assert.ok(adventureSpriteCount() <= ADVENTURE_SPRITE.max);
  } finally { if (saved === undefined) delete globalThis.document; else globalThis.document = saved; clearAdventureSprites(); }
  let n = 0, grads2 = 0; const ctx = new Proxy({ createRadialGradient: () => (grads2++, { addColorStop() {} }), createLinearGradient: () => (grads2++, { addColorStop() {} }) }, { get: (o, k) => (k in o ? o[k] : () => { n++; }), set: (o, k, v) => (o[k] = v, true) });
  for (const [kind, id] of [['lamplighter', 'lampFlare'], ['knellkeeper', 'bellToll'], ['spindriftMedusa', 'tendrilRain'], ['rimeSentinel', 'icicleLine'], ['lakeGlider', 'glideRake'], ['hookhanger', 'pendulumSwing'], ['slagwright', 'slagPour'], ['prismStilt', 'prismBeam']]) {
    const w = world({ level: (x) => (x <= 7 ? 2 : 0), player: { x: 11, y: 12 } }), e = spawn(kind, 7, 12, w); only(e, id); step(w, e, .2); assert.ok(e.pack.tele, `${kind}/${id} telegraphs`);
    const b = n; drawPackTelegraphs(ctx, [e], 32, 1000); assert.ok(n > b); step(w, e, 1.4); const fx = w.effects.filter((f) => f.owner === e.id); if (fx.length) { const b2 = n; drawPackEffects(ctx, fx, 32, 1000); assert.ok(n > b2, `${kind} effects drawn`); }
  }
  assert.equal(grads2, 0);
  // The buried Sinkmaw on the Close View floor: a dimple and ripples; held still under reduced motion; nothing once it is up.
  const ops = []; const floor = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => ops.push([k, ...a.map((v) => typeof v === 'number' ? v.toFixed(3) : v)].join(','))), set: (o, k, v) => (o[k] = v, true) });
  const s = Object.assign(createCombatant('sinkmaw', 5, 5), { hidden: true, advBuried: true });
  drawNativePackFloor(floor, s, 32, 1000, true); const quietA = ops.splice(0).join('|'); drawNativePackFloor(floor, s, 32, 5000, true); const quietB = ops.splice(0).join('|');
  assert.ok(quietA.includes('ellipse') && quietA === quietB, 'drawn, and still under reduced motion');
  drawNativePackFloor(floor, s, 32, 1000, false); const moving = ops.splice(0).join('|'); drawNativePackFloor(floor, s, 32, 1600, false); assert.notEqual(ops.splice(0).join('|'), moving, 'its ripples move');
  Object.assign(s, { hidden: false, advBuried: false }); drawNativePackFloor(floor, s, 32, 1000, false); assert.equal(ops.length, 0, 'up out of the sand: no dimple');
});

test('Close View: eight more solid bodies within budget, distinct from all fourteen, articulating through their families', () => {
  const write = (kind, extra = {}) => { const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS), end = writeCloseViewModel(out, 0, { kind, x: 0, y: 0, z: 0, yaw: 0, phase: .7, pace: 0, pose: 'idle', amount: 0, ...extra }); return out.slice(0, end); };
  const span = (d) => { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < d.length; i += MODEL_FLOATS) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], d[i + k]); hi[k] = Math.max(hi[k], d[i + k]); } return hi.map((v, i) => v - lo[i]); };
  assert.deepEqual([...CLOSE_VIEW_ADVENTURE_KINDS].sort(), [...ADVENTURE_KINDS].sort());
  assert.equal(new Set(ADVENTURE_KINDS.map((k) => span(write(k)).map((v) => v.toFixed(2)).join('/'))).size, ADVENTURE_KINDS.length, 'distinct silhouettes');
  for (const kind of SECOND) {
    assert.ok(modelSupported(kind) && modelTriangleCount(kind) <= 232 && modelSupportsAttachments(kind, 3), `${kind} ${modelTriangleCount(kind)}`);
    const d = write(kind, { alpha: .5 }); for (let i = 0; i < d.length; i += MODEL_FLOATS) { for (let k = 0; k < MODEL_FLOATS; k++) assert.ok(Number.isFinite(d[i + k])); assert.ok(Math.abs(Math.hypot(d[i + 3], d[i + 4], d[i + 5]) - 1) < 1e-5); }
    assert.ok(span(d).every((v) => v > .3 && v < 2.2), `${kind} ${span(d)}`);
    assert.ok(ACTOR_PRESENTATION[kind]?.action === 'pack' && !ACTOR_PRESENTATION[kind].spectral);
    const e = createCombatant(kind, 5, 5); assert.equal(nativeCreatureCoverage(e, { enemy: e, nativeFloor() {}, nativeDecorations() {}, nativePackEffects() {} }, { attachments: true }), null, kind);
    const idle = write(kind, { reduceMotion: true, pose: 'semantic' });
    for (const id of MONSTER_PACK[kind].attacks) { const family = PACK_ACTION_FAMILIES[id], wind = write(kind, { reduceMotion: true, pose: 'semantic', action: id, actionFamily: family, actionPhase: 'windup', actionProgress: .8 }), contact = write(kind, { reduceMotion: true, pose: 'semantic', action: id, actionFamily: family, actionPhase: 'recover', actionProgress: 0 });
      assert.notDeepEqual([...wind], [...idle], `${kind}/${id} winds up`); assert.notDeepEqual([...contact], [...wind], `${kind}/${id} releases`); }
    assert.notDeepEqual([...write(kind, { phase: .4 })], [...write(kind, { phase: 2.4 })], `${kind} breathes`); assert.deepEqual([...write(kind, { phase: .4, reduceMotion: true })], [...write(kind, { phase: 2.4, reduceMotion: true })], `${kind} holds still`);
  }
});
