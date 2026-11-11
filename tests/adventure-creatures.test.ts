// Adventure creatures (adventure-creatures.ts; Tim, 2026-11-11): six original creatures for the first three adventure themes, built
// for tall, open ground. Roster and isolation, deterministic AI, telegraphs before damage, bounded projectiles and searches, height
// interactions, no one-shots, placement, standard-view sprites and Close View bodies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURE_CREATURES, ADVENTURE_KINDS, ADVENTURE_THEME_IDS, ADV, adventureCreaturesFor, pickAdventureCreature, adventureSpawnSpot, findPerch, kiteLoop, heightReach, dropBonus, isAdventureKind } from '../src/adventure-creatures.ts';
import { MONSTER_PACK, PACK_KINDS, ATTACK_MODULES, GUARDIAN_POOL, PACK_ECOLOGY_ADDITIONS, OVERWORLD_PACK_POOLS, PACK_EFFECT_CAP, validateMonster, packVariant, updatePackMonster, tickPackEffects, addPackEffect, freshPackState, resetPackRuntime } from '../src/monster-pack.ts';
import { createCombatant, CREATURE_FORMS } from '../src/combat.ts';
import { ROOF_DWELLERS } from '../src/roof-dwellers.ts';
import { ECHO_IDS } from '../src/echoes.ts';
import { regionalScale } from '../src/game.ts';
import { regionalThreat } from '../src/world.ts';
import { freshSave } from '../src/types.ts';
import { drawPackMonster, drawPackTelegraphs, drawPackEffects } from '../src/monster-render.ts';
import { ADVENTURE_SPRITE, adventureSpriteCount, clearAdventureSprites } from '../src/adventure-creature-render.ts';
import { ACTOR_PRESENTATION, PACK_ACTION_FAMILIES, nativeCreatureCoverage, packActionPresentation } from '../src/actor-presentation.ts';
import { CLOSE_VIEW_ADVENTURE_KINDS } from '../src/close-view-adventure-models.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelSupported, modelTriangleCount, modelSupportsAttachments, writeCloseViewModel } from '../src/close-view-models.ts';
import { createLabFixture, COMBAT_ENVIRONMENTS, scenariosForLab, ADVENTURE_HEIGHTS } from '../src/proving-ground-labs.ts';

// A flat floor (optionally walled and terraced) and a world adapter shaped like the game's packWorld. A walker never changes level
// by walking (landscape canStep for creatures); only a leap or a flight does.
function world({ size = 24, walls = [], level = () => 0, player = { x: 12, y: 12 } } = {}) {
  const blocked = new Set(walls.map(([x, y]) => `${x},${y}`)), cell = (v) => Math.floor(v + .5);
  const open = (x, y) => { const tx = cell(x), ty = cell(y); return tx >= 0 && ty >= 0 && tx < size && ty < size && !blocked.has(`${tx},${ty}`); };
  const lv = (x, y) => level(cell(x), cell(y));
  const w = {
    player: { ...player, hp: 1e6 }, width: size, height: size, dt: 1 / 30, now: 0, enemies: [], effects: [], hurts: [], opens: 0, playerVelocity: { x: 0, y: 0 }, playerFacing: { x: 1, y: 0 },
    open: (x, y) => { w.opens++; return open(x, y); }, tileOpen: (x, y) => open(x - .5, y - .5), projectileOpen: (x, y) => open(x - .5, y - .5), elevation: lv,
    los(a, b) { const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4) || 1; for (let i = 1; i < steps; i++) if (!open(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false; return true; },
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; if (!e.flying && lv(e.x + dx, e.y + dy) !== lv(e.x, e.y)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source, at: w.now }); w.player.hp -= amount; return true; },
    slow() {}, pull(src, step, radius) { const dx = src.x - w.player.x, dy = src.y - w.player.y, d = Math.hypot(dx, dy); if (!d || d > radius) return false; const k = Math.min(step, Math.max(0, d - 1)) / d; w.player.x += dx * k; w.player.y += dy * k; return true; },
    addEffect(effect) { addPackEffect(w.effects, effect, w.now); },
  };
  return w;
}
function spawn(kind, x, y, w, boss = false) { const e = createCombatant(kind, x, y, boss); e.id = `adv:${kind}:${x}:${y}`; e.aggro = true; w.enemies.push(e); return e; }
function step(w, e, seconds, each = null) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); w.effects = tickPackEffects(w.effects, w); each?.(w, e); } }
function only(e, id) { e.packAttacks = [id]; e.pack = freshPackState(); e.pack.gap = 0; }
const telegraphed = (w, e) => !!e.pack?.tele || w.effects.some((f) => f.owner === e.id && f.damage > 0 && (f.arming > 0 || f.kind === 'thornDart'));

test('six original creatures, two for each of the first three themes, kept out of every existing roster', () => {
  assert.deepEqual(ADVENTURE_THEME_IDS, ['tomb', 'verdantRuin', 'ashWaste']);
  for (const t of ADVENTURE_THEME_IDS) assert.equal(ADVENTURE_CREATURES[t].length, 2, t);
  assert.equal(ADVENTURE_KINDS.length, 6); assert.equal(new Set(ADVENTURE_KINDS).size, 6);
  for (const kind of ADVENTURE_KINDS) {
    const d = MONSTER_PACK[kind]; assert.ok(d, kind); assert.deepEqual(validateMonster(d), [], kind);
    assert.ok(d.prototypeOnly && d.adventureKin && d.noEcho && !d.unique, kind); assert.ok(CREATURE_FORMS[kind], kind);
    assert.ok(!PACK_KINDS.includes(kind) && !GUARDIAN_POOL.includes(kind) && !ECHO_IDS.includes(kind), `${kind} never rolls in crossings, guardians or Echoes`);
    assert.ok(!Object.values(PACK_ECOLOGY_ADDITIONS).flat().some(([k]) => k === kind) && !Object.values(OVERWORLD_PACK_POOLS).flat().some((q) => (Array.isArray(q) ? q[0] : q?.kind ?? q) === kind), kind);
    assert.ok(!ROOF_DWELLERS.kinds.some((q) => q.kind === kind), kind);
    for (let i = 0; i < 40; i++) assert.equal(packVariant(kind, `adv-${i}`).hybridAttack, null, `${kind} keeps its own kit`);
    for (const id of [...d.attacks, ...d.bossAttacks]) { assert.ok(ATTACK_MODULES[id], id); if (!ATTACK_MODULES[id].passive) assert.ok(PACK_ACTION_FAMILIES[id], `${kind}/${id} has a Close View action family`); }
    assert.ok(isAdventureKind(kind));
  }
  assert.equal(new Set(ADVENTURE_KINDS.map((k) => MONSTER_PACK[k].render)).size, 6, 'six distinct bodies');
  assert.ok(new Set(ADVENTURE_KINDS.map((k) => MONSTER_PACK[k].brain)).size >= 5 && new Set(ADVENTURE_KINDS.map((k) => MONSTER_PACK[k].movement)).size >= 5, 'varied brains and movement');
  // No existing creature can borrow an adventure module as a hybrid (they are not on any donor's list).
  const own = new Set(ADVENTURE_KINDS.flatMap((k) => MONSTER_PACK[k].attacks).filter((id) => !['clawSweep', 'bite', 'burrowAmbush'].includes(id)));
  for (const kind of PACK_KINDS) for (let i = 0; i < 25; i++) { const v = packVariant(kind, `donor-${i}`); assert.ok(!own.has(v.hybridAttack), `${kind} borrowed ${v.hybridAttack}`); }
});

test('rosters resolve by theme id with forgiving spelling, and picks are deterministic and weighted', () => {
  assert.equal(adventureCreaturesFor('Verdant Ruin'), ADVENTURE_CREATURES.verdantRuin); assert.equal(adventureCreaturesFor('ash-waste'), ADVENTURE_CREATURES.ashWaste);
  assert.equal(adventureCreaturesFor('tomb'), ADVENTURE_CREATURES.tomb); assert.deepEqual(adventureCreaturesFor('alienCapital'), []);
  const counts = {}; for (let i = 0; i < 2000; i++) { const q = pickAdventureCreature('tomb', `room:${i}`); counts[q.kind] = (counts[q.kind] || 0) + 1; assert.equal(pickAdventureCreature('tomb', `room:${i}`), q); }
  assert.ok(Math.abs(counts.galleryLurker / 2000 - .6) < .05, JSON.stringify(counts));
});

test('the tuning lives in data tables and the AI step is deterministic for every creature', () => {
  assert.ok(Object.isFrozen(ADV) && ADV.leaps.ledgeDrop.maxBonus <= .5 && ADV.darts.cap >= ADV.darts.count);
  for (const kind of ADVENTURE_KINDS) {
    const run = () => { const level = (x, y) => (x <= 6 ? 2 : 0), w = world({ walls: [[16, 8], [16, 9], [16, 10]], level, player: { x: 10, y: 12 } }), e = spawn(kind, 5, 11, w); const trace = [];
      step(w, e, 12, (w2, q) => { if (Math.round(w2.now) % 500 < 34) trace.push([q.x.toFixed(4), q.y.toFixed(4), q.pack.attack, q.pack.phase, (q.hopLift || 0).toFixed(4), w2.effects.length].join('|')); w2.player.x = 10 + Math.sin(w2.now / 900) * 2; w2.player.y = 12 + Math.cos(w2.now / 1300); });
      return { trace, hurts: w.hurts.map((h) => `${h.source}:${h.amount}:${Math.round(h.at)}`) }; };
    const a = run(), b = run(); assert.deepEqual(a, b, kind); assert.ok(a.trace.length > 10, kind);
  }
});

test('every attack shows its telegraph before any damage lands', () => {
  const cases = [['galleryLurker', 'ledgeDrop'], ['galleryLurker', 'clawSweep'], ['censerWarden', 'censerLob'], ['vinehookLeaper', 'vineVault'], ['thornspitterBloom', 'thornDarts'], ['sinkmaw', 'sinkFunnel'], ['sinkmaw', 'burrowAmbush'], ['cinderKite', 'glassStrafe']];
  for (const [kind, id] of cases) {
    const level = (x) => (kind === 'galleryLurker' && id === 'ledgeDrop' && x <= 7 ? 2 : 0), w = world({ level, player: { x: 10, y: 12 } }), e = spawn(kind, id === 'ledgeDrop' ? 7 : 7, 12, w);
    if (kind === 'sinkmaw' && id === 'burrowAmbush') { e.advBuried = false; w.player.x = 12; }
    only(e, id); let warned = null, hit = null;
    step(w, e, 6, (w2, q) => { if (warned == null && telegraphed(w2, q)) warned = w2.now; if (hit == null && w2.hurts.length) hit = w2.hurts[0].at; });
    assert.ok(hit != null, `${kind}/${id} lands`); assert.ok(warned != null && hit - warned >= 400, `${kind}/${id}: warned ${warned}, hit ${hit}`);
  }
});

test('a percher drops only from above, harder from higher, never past its cap, then climbs back', () => {
  // Flat open floor and no wall: it cannot drop, it fights on the ground.
  { const w = world({ player: { x: 10, y: 12 } }), e = spawn('galleryLurker', 8, 12, w); let drops = 0; step(w, e, 10, (w2, q) => { if (q.pack.attack === 'ledgeDrop') drops++; }); assert.equal(drops, 0, 'no ledge, no wall: no drop'); }
  const dropHit = (rise) => { const w = world({ level: (x) => (x <= 6 ? rise : 0), player: { x: 9, y: 12 } }), e = spawn('galleryLurker', 6, 12, w); only(e, 'ledgeDrop'); step(w, e, 3); return w.hurts.find((h) => h.source === 'ledgeDrop')?.amount; };
  const one = dropHit(1), three = dropHit(3), five = dropHit(5), base = Math.ceil(10 * ATTACK_MODULES.ledgeDrop.damage);
  assert.ok(one > base - 1 && three > one, `${one} < ${three}`); assert.equal(five, Math.ceil(base * (1 + ADV.leaps.ledgeDrop.maxBonus)), 'capped');
  assert.equal(dropBonus('ledgeDrop', 99), ADV.leaps.ledgeDrop.maxBonus);
  // Down on the ground for a while, it climbs back to high ground near the Wayfarer and perches (holding still) again.
  const w = world({ level: (x) => (x <= 5 ? 2 : 0), player: { x: 9, y: 12 } }), e = spawn('galleryLurker', 8, 12, w); let climbedTo = null, heldStill = 0;
  step(w, e, 12, (w2, q) => { if (!climbedTo && q.pack.attack === 'ledgeClimb' && q.pack.phase === 'recover') climbedTo = { x: q.x, y: q.y }; if (climbedTo && q.advPerched) heldStill++; w2.player.hp = 1e6; });
  assert.ok(climbedTo, 'it climbed'); assert.ok(climbedTo.x <= 5.5, `onto the ledge (${climbedTo.x})`); assert.ok(heldStill > 0, 'and perched again');
  // Beside a wall on level ground it clings, lifted, and drops from the wall.
  const v = world({ walls: [[5, 12]], player: { x: 9, y: 12 } }), c = spawn('galleryLurker', 6, 12, v); only(c, 'ledgeDrop'); step(v, c, .1);
  assert.ok(c.advCling && c.hopLift > 0 && c.pack.tele?.type === 'circle', 'clinging to the wall, lifted, its mark on the floor');
  step(v, c, 1); assert.equal(c.advCling, false, 'it left the wall to drop'); step(v, c, 2); assert.ok(v.hurts.some((h) => h.source === 'ledgeDrop'), 'the cling drop lands');
});

test('ranged keepers reach farther from height; the Sinkmaw never opens under someone higher', () => {
  for (const [kind, id] of [['censerWarden', 'censerLob'], ['thornspitterBloom', 'thornDarts']]) {
    const far = ATTACK_MODULES[id].range[1] + 1.4;
    const tryAt = (rise) => { const w = world({ level: (x) => (x <= 4 ? rise : 0), player: { x: 4 + far, y: 12 } }), e = spawn(kind, 4, 12, w); only(e, id); let started = false; step(w, e, 1, (w2, q) => { if (q.pack.attack === id) started = true; }); return started; };
    assert.equal(tryAt(0), false, `${kind} level: out of reach`); assert.equal(tryAt(2), true, `${kind} from two levels up: in reach`);
    assert.ok(heightReach(id, 99) <= ADV.reach[id].max);
  }
  const under = (rise) => { const w = world({ level: (x) => (x >= 10 ? rise : 0), player: { x: 10.4, y: 12 } }), e = spawn('sinkmaw', 9, 12, w); only(e, 'sinkFunnel'); step(w, e, 3); return w.hurts.length; };
  assert.ok(under(0) > 0, 'level: the funnel bites'); assert.equal(under(1), 0, 'standing a level above it: safe');
});

test('the Leaper crosses levels: it vaults onto you wherever you stand and retreats to high ground', () => {
  const level = (x, y) => (y <= 8 ? 2 : 0), w = world({ level, player: { x: 12, y: 12 } }), e = spawn('vinehookLeaper', 12, 6, w); // it starts two levels up
  only(e, 'vineVault'); step(w, e, 2.5); assert.ok(w.hurts.some((h) => h.source === 'vineVault'), 'the vault lands'); assert.equal(level(Math.round(e.x), Math.round(e.y)), 0, 'down on the Wayfarer\'s level');
  only(e, 'vineRetreat'); let peak = 0; step(w, e, 2, (w2, q) => { peak = Math.max(peak, q.hopLift || 0); });
  assert.equal(level(Math.round(e.x), Math.round(e.y)), 2, `back up (${e.x.toFixed(1)}, ${e.y.toFixed(1)})`); assert.ok(peak > ADV.leaps.vineRetreat.arc, 'a higher arc to climb');
});

test('the Cinder Kite flies its loop until roused, gives up a long chase and goes home', () => {
  const w = world({ size: 40, player: { x: 35, y: 35 } }), e = spawn('cinderKite', 15, 15, w); e.aggro = false; const legs = new Set();
  step(w, e, 30, (w2, q) => legs.add(q.advLeg)); assert.ok(legs.size >= 4, `visits its loop (${[...legs]})`); assert.ok(e.hopLift > 1, 'aloft');
  assert.deepEqual(e.advLoop, kiteLoop(e.id, e.advHome, w), 'its loop is a pure function of its id and home');
  assert.ok(e.advLoop.every((q) => Math.hypot(q.x - 15, q.y - 15) <= ADV.kite.radius[1] + .01));
  e.aggro = true; e.x = 15 + ADV.kite.leash + 1; step(w, e, 1 / 30); assert.equal(e.aggro, false, 'past its leash it turns for home');
});

test('projectiles, effects and searches stay bounded', () => {
  // A Bloom with no cooldown, firing for a minute: never more than its cap of darts alive, never past the pack's effect cap.
  const w = world({ size: 40, player: { x: 26, y: 20 } }), e = spawn('thornspitterBloom', 20, 20, w); let most = 0, darts = 0;
  step(w, e, 60, (w2, q) => { q.pack.cd = {}; q.pack.gap = 0; const n = w2.effects.filter((f) => f.kind === 'thornDart').length; most = Math.max(most, n); darts = Math.max(darts, n); assert.ok(w2.effects.length <= PACK_EFFECT_CAP); w2.player.hp = 1e6; });
  assert.ok(most > 0 && most <= ADV.darts.cap, `darts alive at most ${most}`);
  // Walls stop darts: a wall between the Bloom and the Wayfarer, nothing lands.
  const v = world({ walls: [[23, 19], [23, 20], [23, 21]], player: { x: 26, y: 20 } }), b = spawn('thornspitterBloom', 20, 20, v); b.packAttacks = ['thornDarts']; b.pack = freshPackState(); b.pack.gap = 0;
  v.los = () => true; step(v, b, 4); assert.equal(v.hurts.length, 0, 'the wall took them');
  // A strafe drops exactly its shards.
  const k = world({ player: { x: 12, y: 12 } }), kite = spawn('cinderKite', 8, 12, k); only(kite, 'glassStrafe'); step(k, kite, 1.8); assert.equal(k.effects.filter((f) => f.kind === 'glassShard').length + k.hurts.length * 0, ADV.kite.shards);
  // Searches: a Lurker on terraced ground tests at most a few dozen floor spots in any one frame.
  const t = world({ level: (x, y) => ((x + y) % 7 === 0 ? 2 : 0), player: { x: 12, y: 12 } }), L = spawn('galleryLurker', 10, 12, t); let worst = 0;
  step(t, L, 20, (w2) => { worst = Math.max(worst, w2.opens); w2.opens = 0; w2.player.hp = 1e6; w2.player.x = 12 + Math.sin(w2.now / 700) * 3; });
  assert.ok(worst <= ADV.perch.radii.length * ADV.perch.dirs * 5 + 40, `worst frame ${worst} floor tests`);
});

test('no single blow one-shots: the worst hit stays under the strongest ordinary hit and a fresh Wayfarer survives it', () => {
  const ordinary = PACK_KINDS.filter((k) => !MONSTER_PACK[k].unique && !MONSTER_PACK[k].dungeonOnly).flatMap((k) => MONSTER_PACK[k].attacks.map((id) => Math.ceil(MONSTER_PACK[k].stats[1] * (ATTACK_MODULES[id].damage || 0))));
  const strongest = Math.max(...ordinary), fresh = freshSave().maxHp;
  for (const kind of ADVENTURE_KINDS) {
    const d = MONSTER_PACK[kind], worst = Math.max(...d.attacks.map((id) => Math.ceil(d.stats[1] * (ATTACK_MODULES[id].damage || 0) * (1 + dropBonus(id, 99)))));
    assert.ok(worst <= strongest, `${kind} ${worst} vs ${strongest}`); assert.ok(worst < fresh * .4, `${kind} ${worst} of ${fresh}`);
    assert.ok(d.stats[0] >= 30 && d.stats[0] <= 70, `${kind} takes a few hits`);
    for (const ring of [0, 25, 80]) { const e = regionalScale(createCombatant(kind, 1, 1), regionalThreat(ring, 0)), t = regionalScale(createCombatant('thunderhorn', 1, 1), regionalThreat(ring, 0)); assert.ok(e.damage <= t.damage && e.threatRing === ring, `${kind} ring ${ring}`); }
  }
});

test('a reload never resumes a leap, a cling or a kite\'s height mid-air', () => {
  const w = world({ level: (x) => (x <= 6 ? 2 : 0), player: { x: 9, y: 12 } }), e = spawn('galleryLurker', 6, 12, w); only(e, 'ledgeDrop'); step(w, e, 1);
  assert.equal(e.pack.phase, 'active'); resetPackRuntime(e); assert.equal(e.pack.attack, null); assert.equal(e.hopLift, 0); assert.ok(!e.advCling);
  const k = createCombatant('cinderKite', 3, 3); k.hopLift = 1.3; resetPackRuntime(k); assert.equal(k.hopLift, 0);
});

test('placement by habitat: open, safe floor; perchers on high ground, sand dwellers with room, in the Proving Ground heights', () => {
  assert.ok(COMBAT_ENVIRONMENTS.some((q) => q.id === 'adventure-heights'));
  const ids = scenariosForLab('combat').map((q) => q.id); for (const kind of ADVENTURE_KINDS) assert.ok(ids.includes(kind), kind);
  for (const kind of ADVENTURE_KINDS) {
    const f = createLabFixture({ lab: 'combat', scenario: kind, environment: 'adventure-heights', variant: 2, now: 0 }), g = f.game, tile = (q) => g.map.tiles[Math.round(q.y) * 32 + Math.round(q.x)];
    assert.ok(g.enemies.length >= 1 && g.enemies.length <= 3, kind);
    for (const e of g.enemies) {
      const t = tile(e); assert.ok(t && !t.blocked && !t.slope && !t.doorway && !t.stairs, `${kind} on open safe floor`);
      if (['galleryLurker', 'censerWarden', 'thornspitterBloom'].includes(kind)) assert.ok((t.elev || 0) >= 1, `${kind} up on the gallery`);
      if (kind === 'sinkmaw') for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) assert.ok(!tile({ x: e.x + dx, y: e.y + dy }).blocked && (tile({ x: e.x + dx, y: e.y + dy }).elev || 0) === (t.elev || 0), 'room round a sand dweller');
      assert.equal(e.threatRing, 1, `${kind} regionally scaled`);
    }
    const area = { width: 32, height: 32, open: () => false, level: () => 0, safe: () => true }; assert.equal(adventureSpawnSpot(area, kind, { x: 16, y: 16 }), null, 'no floor, no spawn');
  }
  assert.equal(ADVENTURE_HEIGHTS.start.sand.x, createLabFixture({ lab: 'combat', scenario: 'cinderKite', environment: 'adventure-heights' }).game.player.x);
  assert.equal(ADVENTURE_HEIGHTS.start.gallery.y, createLabFixture({ lab: 'combat', scenario: 'galleryLurker', environment: 'adventure-heights' }).game.player.y);
});

test('the bodies draw through cached sprites (painted once, stamped after), within their box, in every pose', () => {
  const made = []; let grads = 0;
  const mock = () => new Proxy({ createRadialGradient: () => (grads++, { addColorStop() {} }), createLinearGradient: () => (grads++, { addColorStop() {} }) }, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => (o[k] = v, true) });
  const saved = globalThis.document; globalThis.document = { createElement: () => { const c = { width: 0, height: 0, getContext: () => mock() }; made.push(c); return c; } };
  try {
    clearAdventureSprites(); const calls = []; const ctx = new Proxy({ drawImage: (...a) => calls.push(a), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1 }), createRadialGradient: () => (grads++, { addColorStop() {} }), createLinearGradient: () => (grads++, { addColorStop() {} }) }, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => (o[k] = v, true) });
    for (const kind of ADVENTURE_KINDS) {
      const e = createCombatant(kind, 5, 5); e.id = `draw:${kind}`; e.pack = freshPackState(); e.advBuried = false;
      for (const frame of [0, 1, 2]) { calls.length = 0; assert.ok(drawPackMonster(ctx, e, 32, 1000 + frame * 16), kind); assert.equal(calls.length, 1, `${kind} one stamp a frame`); const [, x, y, dw, dh] = calls[0]; const box = ADVENTURE_SPRITE.box[kind], u = 32 * e.scale; assert.ok(Math.abs(x + dw / 2 - (5.5 * 32)) < 1 && dw <= u * box[0] + 2 && dh <= u * box[1] + 2 && y > 0, kind); }
    }
    const before = made.length, gradsBefore = grads;
    for (let i = 0; i < 30; i++) for (const kind of ADVENTURE_KINDS) { const e = createCombatant(kind, 5, 5); e.id = `draw:${kind}`; drawPackMonster(ctx, e, 32, 2000 + i * 16); }
    assert.equal(made.length, before, 'no new sprite after the first'); assert.equal(grads, gradsBefore, 'no gradient per frame');
    // Every pose and stance paints a sprite of its own, and the cache stays bounded.
    for (const kind of ADVENTURE_KINDS) for (const [attack, phase, pose, flags] of [[null, null, null, {}], ['x', 'windup', 'lean', {}], ['x', 'active', null, { aloft: true }], [null, null, null, { advCling: true }]]) {
      const e = Object.assign(createCombatant(kind, 5, 5), { id: `pose:${kind}`, advPose: pose, ...flags }); e.pack = { ...freshPackState(), attack, phase }; drawPackMonster(ctx, e, 32, 3000);
    }
    for (let u = 8; u < 140; u++) drawPackMonster(ctx, Object.assign(createCombatant('censerWarden', 5, 5), { id: 'sizes' }), u, 0);
    assert.ok(adventureSpriteCount() <= ADVENTURE_SPRITE.max, `bounded (${adventureSpriteCount()})`);
    // A buried Sinkmaw is only a dimple and ripples (no sprite); reduced motion holds them still.
    calls.length = 0; const s = Object.assign(createCombatant('sinkmaw', 5, 5), { id: 'buried', advBuried: true, reduceMotion: true }); drawPackMonster(ctx, s, 32, 0); assert.equal(calls.length, 0);
  } finally { if (saved === undefined) delete globalThis.document; else globalThis.document = saved; clearAdventureSprites(); }
});

test('telegraphs and effects draw without per-frame gradients', () => {
  let n = 0, grads = 0; const ctx = new Proxy({ createRadialGradient: () => (grads++, { addColorStop() {} }), createLinearGradient: () => (grads++, { addColorStop() {} }), measureText: () => ({ width: 1 }) }, { get: (o, k) => (k in o ? o[k] : () => { n++; }), set: (o, k, v) => (o[k] = v, true) });
  for (const [kind, id] of [['galleryLurker', 'ledgeDrop'], ['censerWarden', 'censerLob'], ['thornspitterBloom', 'thornDarts'], ['sinkmaw', 'sinkFunnel'], ['cinderKite', 'glassStrafe'], ['vinehookLeaper', 'vineVault']]) {
    const w = world({ level: (x) => (x <= 7 ? 2 : 0), player: { x: kind === 'sinkmaw' ? 9.5 : 11, y: 12 } }), e = spawn(kind, 7, 12, w); only(e, id); step(w, e, .2);
    assert.ok(e.pack.tele, `${kind}/${id} telegraphs`); const before = n; drawPackTelegraphs(ctx, [e], 32, 1000); assert.ok(n > before, `${kind}/${id} drawn`);
    step(w, e, 1.2); const fx = w.effects.filter((f) => f.owner === e.id); if (fx.length) { const b2 = n; drawPackEffects(ctx, fx, 32, 1000); assert.ok(n > b2, `${kind} effects drawn`); }
  }
  assert.equal(grads, 0);
});

test('Close View: six solid authored bodies within budget, admitted natively, articulating through each action family', () => {
  const write = (kind, extra = {}) => { const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS), end = writeCloseViewModel(out, 0, { kind, x: 0, y: 0, z: 0, yaw: 0, phase: .7, pace: 0, pose: 'idle', amount: 0, ...extra }); return out.slice(0, end); };
  const bounds = (d) => { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < d.length; i += MODEL_FLOATS) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], d[i + k]); hi[k] = Math.max(hi[k], d[i + k]); } return hi.map((v, i) => v - lo[i]); };
  assert.deepEqual([...CLOSE_VIEW_ADVENTURE_KINDS].sort(), [...ADVENTURE_KINDS].sort());
  const extents = new Set();
  for (const kind of ADVENTURE_KINDS) {
    assert.ok(modelSupported(kind) && modelTriangleCount(kind) <= 232 && modelSupportsAttachments(kind, 3), `${kind} ${modelTriangleCount(kind)}`);
    const d = write(kind, { alpha: .5 }); assert.equal(d.length / MODEL_FLOATS / 3, modelTriangleCount(kind));
    for (let i = 0; i < d.length; i += MODEL_FLOATS) { for (let k = 0; k < MODEL_FLOATS; k++) assert.ok(Number.isFinite(d[i + k])); assert.ok(Math.abs(Math.hypot(d[i + 3], d[i + 4], d[i + 5]) - 1) < 1e-5, `${kind} unit normal`); }
    const span = bounds(d); assert.ok(span.every((v) => v > .3 && v < 2.2), `${kind} ${span}`); extents.add(span.map((v) => v.toFixed(2)).join('/'));
    assert.ok(ACTOR_PRESENTATION[kind]?.action === 'pack' && !ACTOR_PRESENTATION[kind].spectral, `${kind} solid pack profile`);
    const e = createCombatant(kind, 5, 5), capture = { enemy: e, nativeFloor() {}, nativeDecorations() {}, nativePackEffects() {} };
    assert.equal(nativeCreatureCoverage(e, capture, { attachments: true }), null, `${kind} admitted natively`);
    const idle = write(kind, { reduceMotion: true, pose: 'semantic' });
    for (const id of MONSTER_PACK[kind].attacks) {
      const family = PACK_ACTION_FAMILIES[id], wind = write(kind, { reduceMotion: true, pose: 'semantic', action: id, actionFamily: family, actionPhase: 'windup', actionProgress: .8 }), contact = write(kind, { reduceMotion: true, pose: 'semantic', action: id, actionFamily: family, actionPhase: 'recover', actionProgress: 0 });
      assert.notDeepEqual([...wind], [...idle], `${kind}/${id} winds up`); assert.notDeepEqual([...contact], [...wind], `${kind}/${id} releases`);
    }
    assert.notDeepEqual([...write(kind, { phase: .4 })], [...write(kind, { phase: 2.4 })], `${kind} breathes`); assert.deepEqual([...write(kind, { phase: .4, reduceMotion: true })], [...write(kind, { phase: 2.4, reduceMotion: true })], `${kind} reduced motion holds still`);
  }
  assert.equal(extents.size, 6, 'six distinct silhouettes');
  // Leaps read as airborne while they fly (every leap family), as the Leap Slam always did.
  const e = createCombatant('vinehookLeaper', 5, 5); e.pack = { ...freshPackState(), attack: 'vineVault', phase: 'active', t: .2 }; assert.equal(packActionPresentation(e, ATTACK_MODULES).airborne, true);
  const s = createCombatant('pallidCrawler', 5, 5); s.pack = { ...freshPackState(), attack: 'leapSlam', phase: 'active', t: .2 }; assert.equal(packActionPresentation(s, ATTACK_MODULES).airborne, true);
  // A buried Sinkmaw is admitted but drawn fully transparent (its ripples are on the floor).
  const m = Object.assign(createCombatant('sinkmaw', 5, 5), { hidden: true }); assert.equal(nativeCreatureCoverage(m, { enemy: m, nativeFloor() {}, nativeDecorations() {}, nativePackEffects() {} }, { attachments: true }), null);
});

test('every creature fights in the real game without error, from the Proving Ground heights', () => {
  for (const kind of ADVENTURE_KINDS) {
    const f = createLabFixture({ lab: 'combat', scenario: kind, environment: 'adventure-heights', variant: 1, now: 0 }), g = f.game, hp = g.player.hp, seen = new Set(); let worst = 0;
    for (let i = 0; i < 60 * 12; i++) { g.update(1 / 60, { state: { x: 0, y: 0 }, consume: () => false }, 10000 + i * 1000 / 60); for (const q of g.enemies) if (q.pack?.attack) seen.add(q.pack.attack); worst = Math.max(worst, hp - g.player.hp); g.player.hp = hp; }
    assert.ok(seen.size >= 1, `${kind} attacked (${[...seen]})`); assert.ok(worst < hp, `${kind}: worst blow ${worst} of ${hp}`);
    assert.ok(g.packEffects.length <= PACK_EFFECT_CAP && g.enemies.length <= 3);
  }
});
