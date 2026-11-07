// The Pentagon's finale arena, the Stillworks (Tim, 2026-11-04): "The red dragon, the black dragon, the Void Walker or the Astral
// Worm can be finales for the Pentagon... They should be pretty impactful... the arena of a world or civilization so advanced...
// that their technology just appears to be rock formations or structures." The Regent falls, the vault's wall opens onto the
// Stillworks; its beast falls, the seam opens onto the Starfield walkway and its dais.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, characterStats, beastRegionalThreat, tunePentagonArenaBeast } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { regionalThreat } from '../src/world.ts';
import { PENTAGON, pentagonPlan, pentagonVaultId, pentagonFinaleId, isPentagonId, isPentagonFinaleId, generatePentagonChamber } from '../src/pentagon.ts';
import { PENTAGON_ARENA, FINALE_GHOST, pentagonArenaId, isPentagonArenaId, parsePentagonArenaId, pentagonArenaPick, pentagonArenaRoster, pentagonArenaVitals, generatePentagonArena, arenaDepth } from '../src/pentagon-arena.ts';
import { WORLD_BEASTS, tuneWorldBeast } from '../src/world-beasts.ts';
import { LANDSCAPE_VERSION } from '../src/landscape.ts';
import { MONSTER_PACK, ATTACK_MODULES, BOSS_PACE, PACK_EFFECT_CAP, isPackKind } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { stillworksSpriteCount, drawStillworksTile } from '../src/pentagon-arena-render.ts';

const SEED = 'TIM1', A = PENTAGON_ARENA, BEASTS = ['crimsonTyrant', 'doomChaser', 'voidWalker', 'astralWorm', 'gloomvast'], N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
const game = (seed = SEED, save = null) => { const s = save || freshSave(); s.seed = seed; return new Game(s, 0); };
let found = null; const find = () => { if (found) return found; const g = game(); for (let cx = -64; cx <= 64 && !found; cx += PENTAGON.every) for (let cy = -64; cy <= 64 && !found; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) found = { cx, cy }; return found; };
const plan = (V = PENTAGON.version) => { const { cx, cy } = find(); return pentagonPlan(SEED, cx, cy, V); };
const pinned7 = () => { const { cx, cy } = find(), s = freshSave(); s.seed = SEED; s.atlas = { [`${cx + 1},${cy + 1}`]: { landscapeVersion: LANDSCAPE_VERSION, pentVersion: 7 } }; return new Game(s, 0); }; // release 795: a Pentagon pinned to version 7
const H = (g, P) => g.save.consequences.dungeons[`${P.base}:f1`] || {};
const loadVault = (g, P) => { g.save.session.activeDungeonId = pentagonVaultId(P); g.save.session.dungeonReturn = { rx: P.cx, ry: P.cy, x: 16, y: 16 }; g.loadArea('dungeon', false); };
const fellRegent = (g) => { const e = g.enemies.find((q) => String(q.id).endsWith(':guardian')); e.hp = 0; e.dead = true; g.defeatEnemy(e); };
const wall = (g) => g.map.objects.find((o) => o.kind === 'pentFinaleWall');
const gate = (g, to) => g.map.objects.find((o) => o.kind === 'pentArenaGate' && o.to === to);
const beastOf = (g) => g.enemies.find((e) => e.pentFinaleBeast);
const act = (g, o, a = 'use') => { assert.ok(o, 'the object is there'); g.player.x = o.inner ? o.inner.x : o.x; g.player.y = o.inner ? o.inner.y : o.y + 1; return g.interact(a, o.id); };
const intoArena = (g, P, beast = null) => { loadVault(g, P); fellRegent(g); if (beast) H(g, P).pentArenaBeast = beast; const r = act(g, wall(g)); assert.ok(r.ok, r.message); assert.equal(g.areaId(), pentagonArenaId(P.base)); return r; };
const killBeast = (g) => { const b = beastOf(g); b.hp = 0; b.dead = true; g.defeatEnemy(b); return b; };
const flood = (m, from) => { const W = m.width, seen = new Set([from.y * W + from.x]), st = [from]; while (st.length) { const c = st.pop(); for (const [dx, dy] of N4) { const x = c.x + dx, y = c.y + dy, t = m.tiles[y * W + x]; if (x < 0 || y < 0 || x >= W || y >= m.height || !t || t.blocked || seen.has(y * W + x)) continue; seen.add(y * W + x); st.push({ x, y }); } } return seen; };
const run = (g, seconds, each = () => {}, start = 1000) => { let now = start; for (let t = 0; t < seconds; t += 1 / 30) { now += 1000 / 30; g.update(1 / 30, idle, now); each(t); } return now; };
// a reference build: level, health, guard and weapon power as a Wayfarer of that stage might have
const build = (level, maxHp, power, might, resolve, seed = SEED) => { const s = freshSave(); s.seed = seed; s.level = level; s.maxHp = maxHp; s.hp = maxHp; s.equipment.primary.power = power; s.stats.Might = might; s.stats.Resolve = resolve; s.stats.Vigor = 1 + Math.floor(level / 2); return s; };
const BUILDS = { early: build(8, 140, 14, 4, 2), mid: build(18, 420, 26, 40, 20), late: build(28, 914, 44, 200, 75), endgame: build(40, 1600, 70, 320, 120) };

// ------------------------------------------------------------------------------------------------ pure: the floor and the pick
test('the Stillworks floor: one open five-sided plain reached from the way in, both gates at its edge, five standing lattices, ridges all round; deterministic', () => {
  const bad = [];
  for (let i = 0; i < 60; i++) { const seed = `S${i}`, P = pentagonPlan(seed, i * 8, -i * 8, 1 + (i % PENTAGON.version)), id = pentagonArenaId(P.base), m = generatePentagonArena(seed, id, A.roster[i % 4]);
    assert.ok(isPentagonArenaId(id) && !isPentagonId(id) && !isPentagonFinaleId(id)); assert.equal(parsePentagonArenaId(id).base, P.base);
    if (m.width !== A.size[0] || m.height !== A.size[1] || m.tiles.length !== m.width * m.height) bad.push(`${id}: size`);
    const seen = flood(m, m.entry), open = m.tiles.filter((t) => !t.blocked); if (open.some((t) => !seen.has(t.y * m.width + t.x))) bad.push(`${id}: an island`);
    if (open.length < 700) bad.push(`${id}: too small (${open.length})`); if (m.tiles.some((t) => !t.blocked && (t.x === 0 || t.y === 0 || t.x === m.width - 1 || t.y === m.height - 1))) bad.push(`${id}: floor at the edge`);
    if (m.tiles.some((t) => !t.blocked && (t.chasm || /lava|water|void|pit/i.test(t.kind)))) bad.push(`${id}: a hazard`);
    for (const to of ['vault', 'walk']) { const o = m.objects.find((q) => q.kind === 'pentArenaGate' && q.to === to); if (!o || !m.tiles[o.y * m.width + o.x].blocked || !seen.has(o.inner.y * m.width + o.inner.x)) bad.push(`${id}: gate ${to}`); }
    assert.equal(m.objects.find((q) => q.to === 'vault').toId, pentagonVaultId(P)); assert.equal(m.objects.find((q) => q.to === 'walk').toId, pentagonFinaleId(P.base));
    const mono = m.objects.filter((q) => q.kind === 'stillMonolith'); if (mono.length !== 5 || mono.some((q) => !m.tiles[q.y * m.width + q.x].blocked)) bad.push(`${id}: lattices`);
    const sp = m.enemySpawns[0]; if (!sp || sp.pentFinaleBeast !== A.roster[i % 4].id || m.tiles[sp.y * m.width + sp.x].blocked || Math.hypot(sp.x - m.entry.x, sp.y - m.entry.y) < A.wake + 1) bad.push(`${id}: the beast at the heart, out of waking reach of the door`);
    if (!(arenaDepth(A.centre[0], A.centre[1]) > 12)) bad.push('the heart'); }
  assert.deepEqual(bad.slice(0, 8), []);
  const P = plan(), id = pentagonArenaId(P.base); assert.equal(JSON.stringify(generatePentagonArena(SEED, id, A.roster[0])), JSON.stringify(generatePentagonArena(SEED, id, A.roster[0])), 'pure');
  const m = generatePentagonArena(SEED, id, null); assert.equal(m.enemySpawns.length, 0); assert.ok(m.arena && m.pentArena === A.version && m.stillworks);
  // the Sunfall's reach fits inside: the far side of the floor is out of it from anywhere the beast stands
  const far = Math.max(...m.tiles.filter((t) => !t.blocked).map((t) => Math.hypot(t.x - A.centre[0], t.y - A.centre[1]))); assert.ok(far > 14, `${far}`);
});

test('the pick: by hash of the Pentagon, only creatures that exist (the ghost is left out until it is wired), every beast comes up; a new row takes only the Pentagons it ranks first in', () => {
  assert.equal(FINALE_GHOST.kind, 'gloomvast', 'the ghost finale is wired'); assert.deepEqual(pentagonArenaRoster(isPackKind).map((r) => r.kind), BEASTS);
  const seen = {}; for (let i = 0; i < 400; i++) { const r = pentagonArenaPick(SEED, `pentagon:${SEED}:${i * 8}:0:v6`, isPackKind); seen[r.id] = (seen[r.id] || 0) + 1; assert.equal(r, pentagonArenaPick(SEED, `pentagon:${SEED}:${i * 8}:0:v6`, isPackKind)); }
  for (const id of BEASTS) assert.ok(seen[id] > 50, JSON.stringify(seen));
  const without = (k) => k !== 'gloomvast' && isPackKind(k); let moved = 0, vast = 0; // as the pick was before the Gloomvast joined
  for (let i = 0; i < 400; i++) { const base = `pentagon:${SEED}:${i * 8}:0:v6`, a = pentagonArenaPick(SEED, base, without), b = pentagonArenaPick(SEED, base, isPackKind); if (b.id === 'gloomvast') vast++; else if (a.id !== b.id) moved++; }
  assert.equal(moved, 0, 'no other Pentagon changes beast'); assert.ok(vast > 50 && vast < 120, `${vast}`);
  const row = A.roster.find((r) => r.id === 'gloomvast'), was = row.kind; row.kind = ''; try { assert.ok(!pentagonArenaRoster(isPackKind).includes(row), 'a row with no creature is left out'); } finally { row.kind = was; }
});

// ------------------------------------------------------------------------------------------------ the flow
test('Regent → the Stillworks → the walkway: the wall leads to the arena, its seam is sealed while the beast lives; it falls, the seam opens once, the walkway follows, and the ways back lead back', () => {
  const g = game(), P = plan(); loadVault(g, P); assert.equal(wall(g), undefined); fellRegent(g);
  assert.equal(wall(g).toId, pentagonArenaId(P.base)); assert.equal(H(g, P).pentArena, A.version); assert.equal(H(g, P).pentFinale, PENTAGON.finale.version);
  act(g, wall(g)); assert.equal(g.areaId(), pentagonArenaId(P.base)); assert.ok(g.map.pentArena && g.map.arena);
  const b = beastOf(g); assert.ok(b && !b.dead && BEASTS.includes(b.kind)); assert.equal(b.pentFinaleBeast, H(g, P).pentArenaBeast); assert.equal(b.worldBeast, undefined, 'not the roaming beast');
  assert.deepEqual(g.enemies.filter((e) => !e.dead).map((e) => e.id), [b.id], 'nothing else lives here');
  assert.deepEqual(g.map.objects.map((o) => o.kind).sort(), ['pentArenaGate', 'pentArenaGate', 'stillMonolith', 'stillMonolith', 'stillMonolith', 'stillMonolith', 'stillMonolith'], 'no bells, pages, relays or wanderers');
  const t0 = g.map.tiles.map((t) => `${t.kind}${t.blocked}`).join(); g.update(1 / 30, idle, 1000); assert.equal(b.aggro, false, 'asleep at the heart'); assert.ok(!b.pentArenaAwake);
  const sealed = act(g, gate(g, 'walk')); assert.equal(sealed.ok, false); assert.equal(sealed.message, A.messages.sealed); assert.equal(g.areaId(), pentagonArenaId(P.base));
  g.player.x = b.x; g.player.y = b.y + A.wake - 1; g.update(1 / 30, idle, 1040); assert.ok(b.pentArenaAwake && b.aggro, 'it wakes as you come near');
  const marks = g.save.currency || 0; killBeast(g); assert.equal(H(g, P).pentArenaWon, true); assert.equal(gate(g, 'walk').state, 'open'); assert.equal(g.defeatNotice?.title, A.wonNotice);
  const paid = g.save.currency; assert.ok(paid >= marks + A.bounty.marks + A.bounty.perLevel * g.save.level, 'the bounty (and its usual drops)'); assert.equal(g.map.tiles.map((t) => `${t.kind}${t.blocked}`).join(), t0, 'the floor as it was');
  g.defeatEnemy(b); g.pentagonArenaWon(b); assert.equal(g.save.currency, paid, 'paid once');
  assert.equal(g.save.tesseracts?.got?.some?.((k) => /arena/.test(k)) || false, false, 'no Tesseract');
  const on = act(g, gate(g, 'walk')); assert.ok(on.ok, on.message); assert.equal(g.areaId(), pentagonFinaleId(P.base)); assert.ok(g.map.objects.some((o) => o.kind === 'pentDais'));
  const back = g.map.objects.find((o) => o.kind === 'pentFinaleWall' && o.back); assert.equal(back.toId, pentagonArenaId(P.base)); act(g, back); assert.equal(g.areaId(), pentagonArenaId(P.base)); assert.equal(beastOf(g), undefined, 'it stays down');
  assert.ok(Math.hypot(g.player.x - gate(g, 'walk').inner.x, g.player.y - gate(g, 'walk').inner.y) < 1.5, 'by the seam');
  act(g, gate(g, 'vault')); assert.equal(g.areaId(), pentagonVaultId(P)); assert.ok(wall(g)); act(g, wall(g)); assert.equal(g.areaId(), pentagonArenaId(P.base)); assert.equal(gate(g, 'walk').state, 'open');
  act(g, gate(g, 'walk')); act(g, g.map.objects.find((o) => o.kind === 'pentDais'), 'transit'); assert.equal(g.area, 'overworld', 'Transit as before');
});

test('old journeys: a Pentagon whose walkway opened before the arena keeps its wall onto the walkway (and back to the vault); every vault tile as generated', () => {
  const g = game(), P = plan(); loadVault(g, P); fellRegent(g); g.snapshotArea();
  const save = JSON.parse(JSON.stringify(g.save)); delete save.consequences.dungeons[`${P.base}:f1`].pentArena; // as release 750 left it
  const h = game(SEED, migrateSave(save)); loadVault(h, P); assert.equal(wall(h).toId, pentagonFinaleId(P.base)); assert.equal(H(h, P).pentArena, undefined, 'never turned into an arena');
  assert.deepEqual(h.map.tiles, generatePentagonChamber(SEED, pentagonVaultId(P)).tiles);
  act(h, wall(h)); assert.equal(h.areaId(), pentagonFinaleId(P.base)); const back = h.map.objects.find((o) => o.kind === 'pentFinaleWall' && o.back); assert.equal(back.toId, pentagonVaultId(P));
  act(h, back); assert.equal(h.areaId(), pentagonVaultId(P));
  // a Pentagon still unfinished in an old journey gets the arena when its Regent falls
  const k = game(SEED, migrateSave(JSON.parse(JSON.stringify(freshSave())))); k.save.seed = SEED; loadVault(k, P); fellRegent(k); assert.equal(wall(k).toId, pentagonArenaId(P.base));
});

test('the beast is pinned: a Pentagon keeps its beast whatever joins the roster, and an unknown pin falls back to a fresh pick', () => {
  const g = game(), P = plan(); intoArena(g, P, 'voidWalker'); assert.equal(beastOf(g).kind, 'voidWalker');
  const row = A.roster.find((r) => r.id === 'gloomvast'), was = row.kind; row.kind = '';
  try { g.loadArea('dungeon', false); assert.equal(beastOf(g).kind, 'voidWalker'); } finally { row.kind = was; }
  H(g, P).pentArenaBeast = 'noSuchBeast'; g.snapshotArea(); delete g.save.session.areas[pentagonArenaId(P.base)]; g.loadArea('dungeon', false); assert.ok(BEASTS.includes(beastOf(g).kind)); assert.ok(BEASTS.includes(H(g, P).pentArenaBeast));
});

// ------------------------------------------------------------------------------------------------ each beast in the arena
for (const id of BEASTS) test(`${id} fights in the Stillworks without its overworld life: no hunt, tries, retreat, lava claim, scars or fog; it stays on the floor and its effects stay bounded`, () => {
  const g = game(), P = plan(); intoArena(g, P, id); const b = beastOf(g), before = JSON.stringify(g.save.worldBeasts || {}), tiles = g.map.tiles.map((t) => `${t.kind}${t.blocked}`).join();
  assert.equal(b.kind, id); assert.equal(b.worldBeast, undefined); g.save.maxHp = g.player.hp = 1e7; g.player.x = b.x; g.player.y = b.y + 4; b.hp = b.maxHp * .5; // hurt: every move is open to it, the Sunfall and the Eclipse too
  let most = 0, fx = 0, moves = new Set(), hurt = 0, last = g.player.hp;
  run(g, 90, () => { if (g.player.hp < last) hurt++; g.player.hp = g.save.maxHp; last = g.player.hp; g.player.invulnerableUntil = 0; most = Math.max(most, g.enemies.length); fx = Math.max(fx, (g.packEffects || []).length); moves.add(b.pack?.attack || b.astral?.move);
    assert.ok(b.x >= 0 && b.y >= 0 && b.x <= g.map.width - 1 && b.y <= g.map.height - 1, 'in the arena'); });
  assert.equal(g.areaId(), pentagonArenaId(P.base)); assert.ok(!b.dead && !b.retreating && !b.fleeTo, 'it neither leaves nor flees'); assert.ok(hurt > 3, `it fights (${hurt} hits)`); assert.ok(moves.size > 3, [...moves].join());
  assert.equal(JSON.stringify(g.save.worldBeasts || {}), before, 'no world-beast hunt touched'); assert.ok(!Object.keys(g.save.voidScars?.areas || g.save.voidScars || {}).some((k) => k.includes(':arena')), 'no scars');
  assert.ok(!Object.keys(g.save.dragonLava || {}).length, 'no claimed ground'); assert.equal(g.map.tiles.map((t) => `${t.kind}${t.blocked}`).join(), tiles, 'the floor is never changed'); assert.ok(!g.novaFog);
  assert.ok(most <= 32 && fx <= PACK_EFFECT_CAP, `${most} actors, ${fx} effects`);
  const t = g.map.tiles[Math.round(b.y) * g.map.width + Math.round(b.x)]; assert.ok(t && t.kind.startsWith('still'));
});

// ------------------------------------------------------------------------------------------------ tuning
test('tuning: below ring 100 the biggest ordinary blow takes about 40% of a reference build\'s health (2–3 kill), health of a long fight; from ring 100 the regional ramp, never softer than the roaming beast there', () => {
  const rows = [];
  for (const [name, save] of Object.entries(BUILDS)) for (const id of BEASTS) {
    const g = new Game(save, 0), st = characterStats(g.save), red = 1 - Math.min(.75, st.damageReduction), row = A.roster.find((r) => r.id === id);
    const c = tunePentagonArenaBeast(createCombatant(id, 0, 0, true, []), id, g.save, st, beastRegionalThreat(regionalThreat(40, 0)));
    const top = id === 'astralWorm' ? 1 : Math.max(...MONSTER_PACK[id].attacks.map((a) => ATTACK_MODULES[a]?.damage ?? 0)), big = Math.ceil(c.damage * top * BOSS_PACE.damage * red), share = big / g.save.maxHp;
    rows.push(`${name} ${id} ${Math.round(share * 100)}%`); assert.ok(share >= .3 && (share <= .56 || name === "early" && share < 1) /* an early Wayfarer meets the damage floor: still two blows */, `${name} ${id}: a big blow ${Math.round(share * 100)}%`); assert.ok(Math.ceil(1 / share) >= 2 && Math.ceil(1 / share) <= 4);
    const perHit = (Number(g.save.equipment.primary.power) || 6) + (Number(st.meleeBonus) || 0), hits = c.maxHp / perHit; assert.ok(hits > 40 && hits < 260, `${name} ${id}: ${Math.round(hits)} blows to kill`);
    for (const ring of [120, 160, 220]) { const q = beastRegionalThreat(regionalThreat(ring, 0)), f = tunePentagonArenaBeast(createCombatant(id, 0, 0, true, []), id, g.save, st, q), w = tuneWorldBeast(createCombatant(id, 0, 0, true, []), g.save, id, st);
      assert.ok(f.damage >= Math.round(w.damage * q.damageMultiplier) * .99 || f.damage >= pentagonArenaVitals(row, g.save, st, null).damage, `${name} ${id} ring ${ring}: never softer`); }
  }
});

test('a headless duel: a late build that swings, and runs out of the Sunfall\'s reach while it gathers, kills the finale in tens of seconds and is hit hard on the way', { timeout: 120000 }, () => {
  const save = JSON.parse(JSON.stringify(BUILDS.late)), g = game(SEED, save), P = plan(); intoArena(g, P, 'crimsonTyrant'); const b = beastOf(g), p = g.player; let now = 1000, t = 0, worst = 0;
  for (; t < 180 && !b.dead; t += 1 / 30) { now += 1000 / 30; const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy); p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    const flee = b.pack?.attack === 'dragonSupernova'; // the Sunfall kills through any dodge in its reach (DRAGON.nova): get out of it, as a player must
    const before = p.hp; g.update(1 / 30, { state: flee ? { x: -dx / d, y: -dy / d } : d > 1.6 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 }, consume: (k) => !flee && k === 'attack', held: (k) => !flee && k === 'attack', reset() {} }, now); worst = Math.max(worst, before - p.hp); p.hp = g.save.maxHp; p.invulnerableUntil = 0; }
  assert.ok(b.dead, `it falls (${Math.round(b.hp / b.maxHp * 100)}% left)`); assert.ok(t > 8 && t < 120, `${t.toFixed(1)} s`); assert.ok(worst >= g.save.maxHp * .2, `a blow of ${worst}`);
  assert.equal(H(g, P).pentArenaWon, true);
});

// ------------------------------------------------------------------------------------------------ death and resume
test('a death in the Stillworks resets the fight fairly: the beast whole and asleep at the heart, the seam still sealed, the arena still the way', () => {
  const g = game(), P = plan(); intoArena(g, P, 'doomChaser'); const b = beastOf(g), home = { x: b.x, y: b.y }; g.player.x = b.x; g.player.y = b.y + 3; run(g, 4); b.hp = Math.round(b.maxHp * .3); b.x += 3;
  g.player.hp = 0; let now = 9000; for (let i = 0; i < 400 && g.player.hp <= 0; i++) { now += 50; g.update(.05, idle, now); } assert.ok(g.player.hp > 0, 'recovered (by the Pentagon\'s usual rules)');
  if (g.areaId() !== pentagonArenaId(P.base)) { loadVault(g, P); assert.equal(wall(g).toId, pentagonArenaId(P.base)); act(g, wall(g)); } const c = beastOf(g);
  assert.equal(c.hp, c.maxHp, 'whole again'); assert.deepEqual([c.x, c.y], [home.x, home.y]); assert.ok(!c.pentArenaAwake); assert.equal(gate(g, 'walk').state, 'sealed'); assert.ok(!H(g, P).pentArenaWon);
});

test('exact resume mid-fight keeps its wounds (as a world beast does); after the win a reload keeps it down and the seam open, and pays nothing more', () => {
  const g = game(), P = plan(); intoArena(g, P, 'astralWorm');
  const spawned = beastOf(g), deaths = g.save.worldFlags.deaths || 0, protection = g.player.invulnerableUntil;
  g.player.x = spawned.x; g.player.y = spawned.y + 5;
  // Warm the live encounter without the level-one fixture dying and replacing
  // its beast. Arena death/reset behavior has its own test immediately above.
  g.player.invulnerableUntil = 100000;
  try { run(g, 3); } finally { g.player.invulnerableUntil = protection; }
  const b = beastOf(g);
  assert.equal(b, spawned, 'the same live encounter is being saved');
  assert.ok(g.player.hp > 0, 'warm-up did not kill the player');
  assert.equal(g.save.worldFlags.deaths || 0, deaths, 'no arena reset during warm-up');
  b.hp = Math.round(b.maxHp * .6);
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(300))), 900); assert.equal(r.areaId(), pentagonArenaId(P.base)); const rb = beastOf(r);
  assert.equal(rb.hp, b.hp); assert.equal(rb.maxHp, b.maxHp); assert.equal(rb.damage, b.damage, 'its tuning kept'); assert.ok(rb.pentArenaAwake); assert.equal(gate(r, 'walk').state, 'sealed');
  killBeast(r); const cur = r.save.currency; const q = new Game(deserializeSave(serializeSave(r.exportSnapshot(400))), 1000);
  assert.equal(q.areaId(), pentagonArenaId(P.base)); assert.ok(!q.enemies.some((e) => e.pentFinaleBeast && !e.dead)); assert.equal(gate(q, 'walk').state, 'open'); assert.equal(q.save.currency, cur);
  const m = migrateSave(JSON.parse(JSON.stringify(q.save))); const hh = m.consequences.dungeons[`${P.base}:f1`]; assert.equal(hh.pentArenaWon, true); assert.equal(hh.pentArenaBeast, 'astralWorm'); assert.equal(m.version, 14);
});

// ------------------------------------------------------------------------------------------------ drawing
test('the Stillworks draws without throwing for every beast, quality tier and reduced motion, its sprites bounded', () => {
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, d: 1 }), ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  for (const id of BEASTS) { const g = game(), P = plan(); intoArena(g, P, id); const b = beastOf(g); g.player.x = b.x; g.player.y = b.y + 4; run(g, 2);
    for (const [q, reduce] of [['full', false], ['balanced', false], ['low', false], ['full', true]]) { g.presentation = { effectiveQuality: q, reduceMotion: reduce }; for (const at of [[20, 33], [20, 4], [3, 18], [b.x, b.y]]) { g.player.x = at[0]; g.player.y = at[1]; assert.doesNotThrow(() => render(ctx, g, 390, 844, 5000 + at[0] * 97)); } }
    killBeast(g); assert.doesNotThrow(() => render(ctx, g, 360, 640, 9000)); }
  assert.ok(stillworksSpriteCount() <= 600, `${stillworksSpriteCount()} sprites`);
  assert.equal(drawStillworksTile(ctx, { kind: 'grass' }, 0, 0, 32), false, 'other tiles are left alone');
});

test('the Gloomvast in the Stillworks: its Dark lays its decoys on the arena floor, and the Dark ends when you leave', () => {
  const g = pinned7(), P = plan(7); intoArena(g, P, 'gloomvast'); /* release 795: the Stillworks this was written on (version 7) */ const b = beastOf(g); assert.equal(b.kind, 'gloomvast'); assert.equal(b.pentFinaleBeast, 'gloomvast');
  g.save.maxHp = g.player.hp = 1e7; g.player.x = b.x; g.player.y = b.y + 4; let dark = false, decoys = 0;
  b.hp = Math.round(b.maxHp * .7); // past its first threshold: it calls the Dark
  run(g, 20, () => { g.player.hp = g.save.maxHp; g.player.invulnerableUntil = 0; if (b.gloomDark) dark = true; const d = g.enemies.filter((e) => e.gloomOrbOf && !e.dead); decoys = Math.max(decoys, d.length);
    for (const e of d) { const t = g.map.tiles[Math.round(e.y) * g.map.width + Math.round(e.x)]; assert.ok(t && !t.blocked && t.kind === 'stillFloor', `a decoy on the floor (${e.x},${e.y})`); } });
  assert.ok(dark && decoys > 0, `the Dark (${dark}, ${decoys} decoys)`); assert.equal(g.areaId(), pentagonArenaId(P.base));
  act(g, gate(g, 'vault')); assert.equal(g.areaId(), pentagonVaultId(P)); act(g, wall(g)); const c = beastOf(g); assert.ok(c && !c.gloomDark, 'it ended when you left'); assert.ok(!g.enemies.some((e) => e.gloomOrbOf && !e.dead), 'no decoys waiting');
});

test('the Sunfall in the Stillworks: lethal in its reach as designed (and the fight resets), escapable on its floor, and fled to the far side it still lands: never frozen aloft and untargetable', () => {
  const setup = () => { const g = game(SEED, JSON.parse(JSON.stringify(BUILDS.late))), P = plan(); intoArena(g, P, 'crimsonTyrant'); const b = beastOf(g); b.x = 20; b.y = 26; b.hp = Math.round(b.maxHp * .7); b.pentArenaAwake = true; b.aggro = true; b.packAttacks = ['dragonSupernova']; return { g, P, b }; };
  { const { g, P, b } = setup(); g.player.x = b.x; g.player.y = b.y - 3; let landed = false, now = 1000; // standing in its reach
    for (let t = 0; t < 12 && !landed; t += 1 / 30) { now += 1000 / 30; g.update(1 / 30, idle, now); if (beastOf(g).hp === beastOf(g).maxHp) landed = true; }
    assert.ok(landed, 'it burns you where you stand; the fight begins again'); assert.equal(g.areaId(), pentagonArenaId(P.base)); assert.ok(!H(g, P).pentArenaWon); }
  { const { g, b } = setup(); g.player.x = 20; g.player.y = 4; g.save.maxHp = g.player.hp = Math.max(g.save.maxHp, 2000); let now = 1000, started = false, done = false, far = 0; // fled to the far point of the floor
    for (let t = 0; t < 14 && !done; t += 1 / 30) { now += 1000 / 30; g.update(1 / 30, idle, now); far = Math.max(far, Math.hypot(b.x - g.player.x, b.y - g.player.y)); if (b.pack?.attack === 'dragonSupernova') started = true; else if (started) done = true; }
    assert.ok(started && done, 'the Sunfall runs its course while you are far away'); assert.ok(far > 18, `${far.toFixed(1)} tiles off`); assert.ok(!b.untargetable && !b.aloft && !(b.dragonAir > 0), 'it lands, and can be struck'); assert.ok(g.player.hp > 0, 'out of reach you live');
    assert.ok(!Object.keys(g.save.dragonLava || {}).length && g.map.tiles.every((t) => t.kind !== 'lava'), 'no ground claimed'); }
});
