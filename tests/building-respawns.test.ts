// Building respawns (fractured.ts RESPAWN; Tim, 2026-11-11): packs come back periodically on the floors of keeps, arcologies,
// Pentagon chambers and cubes (room mazes); ordinary crossings and dungeons are left as they are.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, footprintOpen, footprintHazard, hasLineOfSight } from '../src/game.ts';
import { RESPAWN, respawnPlace, respawnFloorOk, respawnPack, FRACTURED } from '../src/fractured.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { dungeonId } from '../src/world.ts';
import { PENTAGON, pentagonPlan } from '../src/pentagon.ts';

const SEED = 'GREAT1';
const KEEP = `building:${SEED}:9:2:keep:4:f2`, ARC = `building:${SEED}:9:2:apartment:4:f1`, CUBE = `labyrinth:${SEED}:0:0:keep~r2:f2`;
const game = (id, seed = SEED) => {
  const s = freshSave(); s.seed = seed; const at = { area: 'overworld', rx: 9, ry: 2, x: 16, y: 16 }; Object.assign(s.session, at); Object.assign(s.position, at);
  const g = new Game(s, 0); g.installSystems?.(); s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 9, ry: 2, x: 16, y: 16 }; g.loadArea('dungeon', false); return g;
};
const clear = (g) => { for (const e of g.enemies) { e.hp = 0; e.dead = true; e.rewarded = true; } };
const respawned = (g) => g.enemies.filter((e) => e.respawned && !e.dead);
// Play `secs` seconds on the floor, one second a step, through the respawn tick only (the rest of the frame is not needed).
const play = (g, secs, from = 1000) => { for (let i = 0; i < secs; i++) g.tickRespawns(1, from + i * 1000); return from + secs * 1000; };
const reach = (g) => { const m = g.map, w = m.width, p = g.player, s = new Set([Math.floor(p.y + .5) * w + Math.floor(p.x + .5)]), q = [...s];
  while (q.length) { const i = q.pop(), x = i % w, y = (i - x) / w; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * w + x + dx; if (!s.has(j) && footprintOpen(m, w, x + dx, y + dy) && !m.tiles[j]?.hole) { s.add(j); q.push(j); } } }
  return s; };

test('respawnPlace: keeps, arcologies, Pentagon chambers and cubes respawn; crossings, hunts, hives and the Shell do not', () => {
  const S = 'X:Y'; // a seed with a colon still parses
  assert.equal(respawnPlace(`building:${S}:9:2:keep:4:f2`), 'keep');
  assert.equal(respawnPlace(`building:${S}:9:2:keep:4r:f4`), 'keep');
  assert.equal(respawnPlace(`compound:${S}:3:-3:keep:w0:3:f1`), 'keep');
  assert.equal(respawnPlace(`castle:${S}:4:4:k:5:f2`), 'keep');
  assert.equal(respawnPlace(`labyrinth:${S}:0:0:keep:f3`), 'keep');
  assert.equal(respawnPlace(`building:${S}:9:2:apartment:5:f1`), 'arcology');
  assert.equal(respawnPlace(`compound:${S}:3:3:apartment:t:4r:f2`), 'arcology');
  assert.equal(respawnPlace(`labyrinth:${S}:0:0:apartment:f1`), 'arcology');
  assert.equal(respawnPlace(`pentagon:${S}:8:-8:f3`), 'pentagon');
  assert.equal(respawnPlace(`pentagon:${S}:8:-8:v8:f3`), 'pentagon');
  for (const st of ['keep', 'apartment', 'hive']) assert.equal(respawnPlace(`labyrinth:${S}:0:0:${st}~r2:f2`), 'cube');
  for (const id of [dungeonId(S, 1), dungeonId(S, 1, 4, 5, 'dungeon-gate-2'), `building:${S}:1:1:hive:3:f1`, `compound:${S}:1:1:hive:w0:3:f1`, `labyrinth:${S}:0:0:hive:f1`, `labyrinth:${S}:0:0:shell:f1`, 'hunt-instance:abc', 'far-array:1', `canyon:${S}:1:1`, '', null])
    assert.equal(respawnPlace(id), null, String(id));
  for (const k of ['keep', 'arcology', 'pentagon', 'cube']) assert.equal(RESPAWN.places[k], true);
});

test('respawnFloorOk: never a guarded floor, a vault, a trial, a boss floor, a finale or an arena', () => {
  const B = { floor: 2 }, ok = { building: B, enemySpawns: [{ id: 'a:g0', kind: 'ashling', buildingGuard: true }] };
  assert.equal(respawnFloorOk(ok), true);
  for (const extra of [{ vault: true }, { trial: true }, { boss: true }, { finale: true }]) assert.equal(respawnFloorOk({ ...ok, building: { ...B, ...extra } }), false, JSON.stringify(extra));
  for (const extra of [{ arena: true }, { pentArena: true }, { skyland: true }]) assert.equal(respawnFloorOk({ ...ok, ...extra }), false);
  for (const sp of [{ id: 'x:guardian', kind: 'hollowMarshal' }, { id: 'y', kind: 'ashling', buildingGuardian: true }, { id: 'z', kind: 'a', pentBoss: { hp: 2 } }, { id: 'k', kind: 'a', keyKeeper: true }, { id: 'b', kind: 'a', boss: true }])
    assert.equal(respawnFloorOk({ ...ok, enemySpawns: [...ok.enemySpawns, sp] }), false, sp.id);
  assert.equal(respawnFloorOk({ enemySpawns: [] }), false, 'not a building floor');
  const top = game(`building:${SEED}:9:2:keep:4:f4`); assert.equal(top.respawnFloor(), null, 'the top floor holds the guardian');
});

test('only in the four kinds: a keep, an arcology and a cube floor respawn; an ordinary crossing never does', () => {
  for (const [id, kind] of [[KEEP, 'keep'], [ARC, 'arcology'], [CUBE, 'cube']]) {
    const g = game(id); assert.equal(g.respawnFloor(), kind, id); clear(g); play(g, RESPAWN.every + 1);
    const r = respawned(g); assert.ok(r.length >= RESPAWN.pack[0] && r.length <= RESPAWN.pack[1], `${id}: ${r.length}`);
  }
  const d = game(dungeonId(SEED, 1, 3, 4, 'dungeon-gate')); assert.equal(d.area, 'dungeon'); assert.equal(d.respawnFloor(), null); clear(d); play(d, RESPAWN.every * 4); assert.equal(respawned(d).length, 0);
});

test('a Pentagon chamber (not a trial, vault, boss or finale) respawns its own ghouls', () => {
  let found = null;
  for (let d = 0; d <= 160 && !found; d += PENTAGON.every) for (let cx = -d; cx <= d && !found; cx += PENTAGON.every) for (let cy = -d; cy <= d && !found; cy += PENTAGON.every) {
    if (Math.abs(cx) !== d && Math.abs(cy) !== d) continue; const probe = new Game(Object.assign(freshSave(), { seed: SEED }), 0); if (!probe.pentagonHere(cx, cy)) continue;
    const P = pentagonPlan(SEED, cx, cy, probe.pentagonVersion(cx, cy));
    for (const q of P.nodes) { const g = game(`${P.base}:f${q.n + 1}`); if (g.respawnFloor() === 'pentagon') { found = g; break; } }
  }
  assert.ok(found, 'some Pentagon chamber respawns');
  const own = new Set(found.map.enemySpawns.filter((q) => q.buildingGuard && !q.buildingGuardian && !q.pentBoss).map((q) => q.kind));
  clear(found); play(found, RESPAWN.every + 1); const r = respawned(found); assert.ok(r.length > 0);
  for (const e of r) assert.ok(own.size ? own.has(e.kind) : PENTAGON.guards.includes(e.kind), e.kind);
});

test('the timer: it runs only once the floor is down to RESPAWN.below, only on the floor, and pauses with the game', () => {
  const g = game(KEEP); assert.ok(g.enemies.filter((e) => !e.dead).length > RESPAWN.below);
  play(g, RESPAWN.every * 3); assert.equal(respawned(g).length, 0, 'a floor still held never gains a pack');
  clear(g); let now = play(g, RESPAWN.every - 1); assert.equal(respawned(g).length, 0, 'not before RESPAWN.every');
  now = play(g, 1, now); const first = respawned(g); assert.ok(first.length >= RESPAWN.pack[0], 'a pack at RESPAWN.every');
  now = play(g, RESPAWN.every * 2, now); assert.equal(respawned(g).length, first.length, 'while the pack stands, no more come');
  // Pause: update() returns before any tick, so the timer holds.
  clear(g); const t0 = g.respawnState.t; g.paused = true; const input = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
  for (let i = 0; i < 100; i++) g.update(1, input, now + i * 1000); assert.equal(g.respawnState.t, t0, 'paused time is not counted');
  g.paused = false; g.update(.5, input, now + 200000); assert.ok(g.respawnState.t > t0, 'play time is');
});

test('spots: open, safe, reachable, unseen or far, never near the Wayfarer, an object or the arrival; the pack can move', () => {
  for (const id of [KEEP, ARC, CUBE]) {
    const g = game(id), m = g.map, w = m.width, p = g.player; clear(g);
    const spots = g.respawnSpots(), reached = reach(g); assert.ok(spots.length > 0, id);
    for (const s of spots) {
      const t = m.tiles[s.y * w + s.x]; assert.ok(footprintOpen(m, w, s.x, s.y) && !footprintHazard(m, w, s.x, s.y) && !t.hole && !t.doorway, `${id} ${s.x},${s.y} open and safe`);
      assert.ok(reached.has(s.y * w + s.x), `${id} ${s.x},${s.y} reachable`);
      const d = Math.hypot(s.x - p.x, s.y - p.y); assert.ok(d >= RESPAWN.minDistance, 'never near the Wayfarer');
      assert.ok(d >= RESPAWN.sight || !hasLineOfSight(s, p, m, w), 'out of sight');
      for (const o of [...m.objects, m.entry].filter(Boolean)) assert.ok(Math.max(Math.abs(Math.round(o.x) - s.x), Math.abs(Math.round(o.y) - s.y)) > RESPAWN.objectClear, `${id}: clear of ${o.kind || 'the arrival'}`);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) assert.ok(!m.tiles[(s.y + dy) * w + s.x + dx]?.hole, 'no hole beside');
    }
    play(g, RESPAWN.every + 1); for (const e of respawned(g)) { assert.ok(spots.some((s) => s.x === e.x && s.y === e.y)); assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => footprintOpen(m, w, e.x + dx, e.y + dy)), 'room to move'); }
  }
});

test('respawned creatures are tuned like the floor\'s own (floor step and region) and are deterministic per seed, floor and counter', () => {
  const a = game(KEEP), b = game(KEEP); clear(a); clear(b); play(a, RESPAWN.every + 1); play(b, RESPAWN.every + 1);
  const ra = respawned(a), rb = respawned(b); assert.deepEqual(ra.map((e) => [e.id, e.kind, e.x, e.y, e.maxHp]), rb.map((e) => [e.id, e.kind, e.x, e.y, e.maxHp]));
  for (const e of ra) { assert.ok(e.buildingScaled, 'the floor step'); assert.ok(e.threatRing != null, 'regional scaling (scaleToRegion)'); assert.ok(!e.buildingGuard && !e.fractured && !e.fracReinforcement); assert.ok(e.maxHp > 1 && e.damage >= 1); }
  const plain = a.enemies.find((e) => e.buildingGuard && e.kind === ra[0].kind); if (plain) assert.equal(ra[0].maxHp, plain.maxHp, 'the same strength as a guard of its sort');
  const cands = [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 9, y: 9 }];
  assert.deepEqual(respawnPack(SEED, KEEP, 2, cands, ['ashling'], 9), respawnPack(SEED, KEEP, 2, cands, ['ashling'], 9));
  assert.ok(respawnPack(SEED, KEEP, 2, cands, ['ashling'], 1).length <= 1, 'never past the room');
  assert.deepEqual(respawnPack(SEED, KEEP, 2, [], ['ashling'], 9), []);
});

test('caps: never past RESPAWN.liveCap alive on the floor nor RESPAWN.perVisit respawned in one visit; the fallen are cleared away (phones)', () => {
  const g = game(CUBE); clear(g); let now = 1000, peak = 0, most = 0;
  for (let i = 0; i < 400; i++) { now = play(g, 5, now); const live = g.enemies.filter((e) => !e.dead).length; peak = Math.max(peak, live); most = Math.max(most, g.enemies.length);
    for (const e of respawned(g)) g.defeatEnemy(Object.assign(e, { hp: 0, dead: true })); }
  assert.ok(peak <= RESPAWN.liveCap, `${peak} alive`); assert.equal(g.respawnState.made, RESPAWN.perVisit - (RESPAWN.perVisit % 1), 'a visit stops at perVisit');
  assert.ok(g.respawnState.made <= RESPAWN.perVisit); now = play(g, 10, now); assert.ok(g.enemies.length <= most, 'corpses are cleared away');
  assert.ok(g.enemies.filter((e) => e.respawned).length === 0, `all ${RESPAWN.perVisit} fell and were cleared`);
  // Crowded by other creatures: nothing comes past the live cap.
  const h = game(KEEP); clear(h); const st = h.respawnState || (play(h, 1), h.respawnState); st.t = RESPAWN.every; RESPAWN.below = 99; try { const filler = h.enemies[0]; for (let i = 0; i < RESPAWN.liveCap; i++) h.enemies.push({ ...filler, id: `filler-${i}`, dead: false, hp: 5 }); play(h, 3); assert.equal(respawned(h).length, 0, 'full floor'); } finally { RESPAWN.below = 1; }
});

test('rewards: reduced experience, a mark, now and then an item; no lasting flag, Aperture, glyph, Echo, Sigil or quest kill', () => {
  const g = game(KEEP); clear(g); play(g, RESPAWN.every + 1); const [e] = respawned(g); assert.ok(e);
  g.save.narrative.facts['leads.active'] = true; const before = JSON.stringify({ f: g.save.worldFlags, a: g.save.perception, gl: g.save.glyphs, ec: g.save.echoes, c: g.save.consumables, codex: g.save.codex, j: g.save.narrative.journal.length, h: g.save.consequences.dungeons });
  const xp = g.save.xp, lvl = g.save.level, marks = g.save.currency; g.defeatEnemy(Object.assign(e, { hp: 0, dead: true }));
  assert.equal(e.rewarded, true); assert.equal(g.save.currency, marks + RESPAWN.reward.marks);
  const gained = g.save.xp - xp; assert.ok(gained === Math.max(1, Math.round(10 * Math.max(1, Number(e.xpMultiplier) || 1) * RESPAWN.reward.xp)) || g.save.level > lvl /* levelled */, `${gained} experience`);
  assert.equal(JSON.stringify({ f: g.save.worldFlags, a: g.save.perception, gl: g.save.glyphs, ec: g.save.echoes, c: g.save.consumables, codex: g.save.codex, j: g.save.narrative.journal.length, h: g.save.consequences.dungeons }), before, 'nothing lasting');
  assert.ok(!Object.keys(g.save.worldFlags).some((k) => k.includes('respawn-')), 'no drop flag');
  // The drop share: about RESPAWN.reward.drop of kills give an item (hash of seed, counter and id).
  let drops = 0; const n = 200; for (let i = 0; i < n; i++) { const c = g.respawnCreature({ id: `respawn-t-${i}`, kind: e.kind, x: e.x, y: e.y, traits: [], respawned: true }); g.enemies.push(c); const had = g.save.dropCounter; g.defeatEnemy(Object.assign(c, { hp: 0, dead: true })); if (g.save.dropCounter !== had) drops++; }
  assert.ok(drops > n * RESPAWN.reward.drop * .5 && drops < n * RESPAWN.reward.drop * 1.6, `${drops} of ${n}`);
  // A respawned haunt's merge is respawned too (no full spoils from a pack that came back).
  assert.ok(String(Game.prototype.hauntTick).includes('w.respawned'));
});

test('exact resume: a save in place keeps the timer, the counter and the standing pack; leaving keeps only the counter', () => {
  const g = game(KEEP); clear(g); let now = play(g, RESPAWN.every + 1); const pack = respawned(g); assert.ok(pack.length); const n = g.respawnState.n;
  pack[0].hp = 1; for (const e of pack) { e.hp = 0; e.dead = true; e.rewarded = true; } pack[0].dead = false; pack[0].hp = 1; // one left, wounded
  for (const e of pack.slice(1)) g.enemies = g.enemies.filter((q) => q !== e); now = play(g, 12, now); const t = g.respawnState.t; assert.ok(t > 0 && t < RESPAWN.every);
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(now))), now + 5000); r.installSystems?.();
  assert.equal(r.areaId(), KEEP); const back = r.enemies.find((e) => e.id === pack[0].id); assert.ok(back && back.respawned && !back.dead && back.hp === 1, 'the wounded respawned creature is there again');
  assert.equal(r.enemies.filter((e) => e.respawned).length, 1, 'the fallen are not');
  r.tickRespawns(0, now + 5000); assert.deepEqual([r.respawnState.t, r.respawnState.n, r.respawnState.made], [t, n, g.respawnState.made], 'the timer resumes exactly');
  // Leave and come back: the counter stays (new rolls), the visit's timer and tally start again.
  const up = r.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'up'); r.player.x = up.x; r.player.y = up.y; assert.ok(r.interact('climb', up.id).ok);
  const dn = r.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'down'); r.player.x = dn.x; r.player.y = dn.y; assert.ok(r.interact('descend', dn.id).ok);
  assert.equal(r.areaId(), KEEP); r.tickRespawns(0, now + 9000); assert.deepEqual([r.respawnState.t, r.respawnState.n, r.respawnState.made], [0, n, 0]);
});

test('Fractured mode owns the pace: no building respawns while it holds; the Proving Ground lab floors can switch them off', () => {
  const g = game(KEEP); g.save.fractured = 'fractured'; assert.ok(g.fracturedHere()); assert.equal(g.respawnFloor(), null);
  const h = game(KEEP); h.respawnOff = true; clear(h); play(h, RESPAWN.every * 3); assert.equal(respawned(h).length, 0);
  assert.ok(FRACTURED.repopulate > 0);
});

test('a cleared building floor stays cleared when you only pass through it (no respawn without time on the floor)', () => {
  const g = game(KEEP), first = g.areaId(); clear(g);
  const st = g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'up'); g.player.x = st.x; g.player.y = st.y; g.interact('climb', st.id); play(g, RESPAWN.every * 2);
  const dn = g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'down'); g.player.x = dn.x; g.player.y = dn.y; g.interact('descend', dn.id);
  assert.equal(g.areaId(), first); assert.equal(g.enemies.filter((e) => !e.dead).length, 0, 'time spent on another floor does not count here');
});
