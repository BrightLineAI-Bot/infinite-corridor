// The Pentagon's shortcuts (Tim, 2026-11-04): "When you start the Pentagon it's like mazes, you have to traverse until you get
// to open doors with keys and open shortcuts. The first time you go through you might be forced to take a long path; the second
// time you can just go through the shortcut to a deeper level"; and "exterior doors in the Pentagon's outer walls that are
// locked from outside and only open from the inside... multiple entrances... different starting places along the journey".
// Version 6 lays in shortcut links (a lift to every Heart floor below the first, 2-4 ring links), side entrances and exterior
// shortcut doors; a Pentagon begun before keeps its tiles and has its links laid over its floors as objects.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, clearSectionTerrainCache, sectionTerrainCacheStats } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { LANDSCAPE_VERSION, COHERENCE } from '../src/landscape.ts';
import { PENTAGON, pentagonPlan, generatePentagonChamber, placePentagonSection, pentagonLinkEnds, pentagonLinkKey } from '../src/pentagon.ts';

const SEED = 'TIM1', V6 = 6, S = PENTAGON.shortcuts;
const game = (seed = SEED, save = null) => { const s = save || freshSave(); s.seed = seed; return new Game(s, 0); };
const pinned = (seed, cx, cy, V) => { const s = freshSave(); s.seed = seed; s.atlas = { [`${cx + 1},${cy + 1}`]: { landscapeVersion: LANDSCAPE_VERSION, pentVersion: V } }; return new Game(s, 0); };
const findIn = (g) => { for (let cx = -64; cx <= 64; cx += PENTAGON.every) for (let cy = -64; cy <= 64; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) return { cx, cy }; return null; };
let found = null; const find = () => (found ||= findIn(game()));
const visit = (g, rx, ry) => { g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
const act = (g, o, a) => { assert.ok(o, a); g.player.x = o.x; g.player.y = o.y; return g.interact(a, o.id); };
const idOf = (P, id) => `${P.base}:f${P.nodes.find((n) => n.id === id).n + 1}`;
const load = (g, P, id) => { g.save.session.activeDungeonId = idOf(P, id); g.save.session.dungeonReturn = { rx: P.cx, ry: P.cy, x: 16, y: 16 }; g.loadArea('dungeon', false); assert.equal(P.nodes[g.map.building.node].id, id); };
const end = (g, link, e) => g.map.objects.find((o) => o.kind === 'pentShortcut' && o.link === link && o.end === e);
const H = (g, P) => g.save.consequences.dungeons[`${P.base}:f1`] || {};

// ------------------------------------------------------------------------------------------------ a solver over the plan
// Places (the land, the courts, the central court) and chambers; a door passes only when what it wants is had. Progress is
// what you reach: a court's lever is pulled when you stand in it, a trial or a keeper's floor cleared, a key or shard taken,
// the Seal had (v2/v3: from its chamber; v4+: the Regent, in the vault). A shortcut link or an exterior door opens only once
// its deep side (the chamber inside) has been reached; `links: false` keeps them shut (the long way). `deny` holds a piece of
// progress back, to show what it guards; `noSide` takes the side entrances away; `start` where you begin.
function solve(P, { start = ['land'], deny = {}, links = true, noSide = false } = {}) {
  const V = P.V, node = (id) => P.nodes.find((n) => n.id === id), seen = new Set(start);
  const state = () => { const has = (id) => seen.has(id), lev = P.levers.filter((l) => has(`c${l.f}`)).length, trials = P.trials.filter((t) => has(t)).length;
    const keys = new Set(P.nodes.filter((n) => n.key && has(n.id)).map((n) => n.key.id).concat(P.nodes.filter((n) => n.shard && has(n.id)).map((n) => n.shard.id)).filter((k) => !(deny.keys || []).includes(k)));
    const seal = !deny.seal && (V >= 4 ? has(`h${P.nh - 1}`) : P.sealNode ? has(P.sealNode) : false);
    return { lev: deny.levers ? 0 : lev, trials: deny.trials ? 0 : trials, keys, seal }; };
  const moves = (v, st) => { const out = [];
    for (const e of P.edges) for (const [a, b] of [[e.a, e.b], [e.b, e.a]]) { if (a !== v) continue;
      if (e.sigil && !st.seal) continue; if (e.secret && !st.keys.has(e.secret)) continue; if (e.shortcut && a !== e.far && !seen.has(e.far)) continue;
      if (/^h\d/.test(a) && /^h\d/.test(b) && Number(b.slice(1)) > Number(a.slice(1)) && node(a).boss && (V === 2 || V >= 4) && (!seen.has(a) || deny.keeper === Number(a.slice(1)))) continue;
      out.push(b); }
    for (const w of P.world) { if (noSide && w.side) continue; const gateOk = !(w.gate === 'levers' && st.lev < PENTAGON.levers) && !(w.sigil && !st.seal) && !(w.lock && !st.keys.has(w.lock));
      if (w.toGate) { if (w.node === v) out.push('land'); continue; }
      if (w.node === v && gateOk) out.push(w.place);
      if (w.place === v && gateOk && !(w.sealed === 'trials' && st.trials < PENTAGON.trials) && !(w.exterior && !(links && seen.has(w.node)))) out.push(w.node); }
    if (links) for (const L of P.links) { if (!seen.has(L.deep)) continue; if (v === L.near) out.push(L.deep); if (v === L.deep) out.push(L.near); }
    return out; };
  for (let grew = true; grew;) { grew = false; const st = state(), q = [...seen]; while (q.length) { const v = q.pop(); for (const u of moves(v, st)) if (!seen.has(u)) { seen.add(u); q.push(u); grew = true; } } }
  return seen;
}
// doors between two places, every door open but those that want the Seal or a shard, and no shortcut: the long way's length
function hops(P, from, to) { const adj = new Map(), link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
  for (const e of P.edges) if (!e.sigil && !e.secret && !e.shortcut) link(e.a, e.b); for (const w of P.world) if (!w.toGate && !w.exterior && !w.sigil) link(w.node, w.place); // no door that wants the Seal or a shard
  const d = new Map([[from, 0]]), q = [from]; for (let i = 0; i < q.length; i++) for (const u of adj.get(q[i]) || []) if (!d.has(u)) { d.set(u, d.get(q[i]) + 1); q.push(u); } return d.get(to) ?? Infinity; }

const checkPlan = (P, bad) => { const V = P.V, tag = `${P.seed} v${V}`, all = P.nodes.map((n) => n.id), full = solve(P), long = solve(P, { links: false });
  for (const id of all) { if (!full.has(id)) bad.push(`${tag}: ${id} unreachable`); if (!long.has(id)) bad.push(`${tag}: ${id} not reached the long way`); }
  const hub = P.gate.node, heart = P.links.filter((l) => l.heart), ring = P.links.filter((l) => !l.heart);
  for (let i = 1; i < P.nh; i++) if (!heart.some((l) => l.deep === `h${i}` && l.near === hub && l.kind === S.heartKind)) bad.push(`${tag}: no lift from the gate to h${i}`);
  if (ring.length < S.ring[0] || ring.length > S.ring[1]) bad.push(`${tag}: ${ring.length} ring links`);
  if (ring[0] && !(ring[0].deep.startsWith('i') && P.world.some((w) => w.node === ring[0].deep && w.place === 'central'))) bad.push(`${tag}: the first ring link is not by the central court`);
  const entries = new Set(P.world.filter((w) => w.place === 'land' && !w.toGate && !w.exterior).map((w) => w.node));
  for (const L of P.links) { if (!long.has(L.deep) || !long.has(L.near)) bad.push(`${tag}: ${L.id} not reached the long way`); if (!S.kinds[L.kind]) bad.push(`${tag}: ${L.id} kind`);
    if (L.heart) { // the deep side of a lift lies past the levers, the trials, and (v2, v4+) the keeper above it: no shortcut gets you there first
      const guards = [{ trials: true }, ...(V >= 2 ? [{ levers: true }] : []), ...((V === 2 || V >= 4) ? [{ keeper: L.heart - 1 }] : [])];
      for (const deny of guards) if (solve(P, { deny }).has(L.deep)) bad.push(`${tag}: ${L.id} reached without ${JSON.stringify(deny)}`); }
    else { if (!entries.has(L.near)) bad.push(`${tag}: ${L.id} near end is not an entrance chamber`); if (hops(P, L.near, L.deep) < S.minHops) bad.push(`${tag}: ${L.id} is no shortcut (${hops(P, L.near, L.deep)} doors)`); } }
  // entrances (v6): none lets you past anything; every exterior door opens only from inside
  const sides = P.world.filter((w) => w.side), states = [{}, { trials: true }, { levers: true }, { seal: true }, { keys: ['shard0', 'shard1', 'key0'] }, ...Array.from({ length: P.nh - 1 }, (_, k) => ({ keeper: k }))];
  if (V >= 6) { const E = PENTAGON.entrances; if (sides.length < E.count[0] || sides.length > E.count[1]) bad.push(`${tag}: ${sides.length} side entrances`); const ext = sides.filter((w) => w.exterior);
    if (ext.length < E.exterior[0] || ext.length > E.exterior[1] || sides.length - ext.length < 1) bad.push(`${tag}: ${ext.length} exterior of ${sides.length}`);
    for (const w of sides) { if (!/^o\d$/.test(w.node) || P.world.some((x) => x !== w && x.node === w.node && x.place === 'land')) bad.push(`${tag}: ${w.key} on ${w.node}`);
      if (w.exterior && !long.has(w.node)) bad.push(`${tag}: ${w.key}'s inside not reached`); if (w.exterior && hops(P, 'land', w.node) < 2) bad.push(`${tag}: ${w.key} next to a gate`); } }
  for (const deny of states) { const a = solve(P, { deny }), b = solve(P, { deny, noSide: true }); if ([...a].sort().join() !== [...b].sort().join()) bad.push(`${tag}: entrances change what ${JSON.stringify(deny)} reaches`);
    for (const w of sides.filter((x) => !x.exterior)) { const r = solve(P, { deny, start: [w.node] });
      if ((deny.trials || deny.levers) && P.nodes.some((n) => n.kind === 'heart' && r.has(n.id))) bad.push(`${tag}: ${w.key} into the Heart without ${JSON.stringify(deny)}`);
      if (deny.seal && P.nodes.some((n) => n.kind === 'sealed' && r.has(n.id))) bad.push(`${tag}: ${w.key} into a sealed chamber without the Seal`);
      if (deny.keys && P.nodes.some((n) => n.kind === 'secret' && r.has(n.id))) bad.push(`${tag}: ${w.key} into a reliquary without its shard`);
      if (deny.keeper !== undefined && (V === 2 || V >= 4) && r.has(`h${deny.keeper + 1}`)) bad.push(`${tag}: ${w.key} past keeper ${deny.keeper}`); } } };

test('v6 plan: a lift to every Heart floor below the first, 2-4 ring links, 3-5 side entrances; the solver: nothing passed, every shortcut opened from its deep side', () => {
  const bad = [], tally = { ring: {}, sides: {}, ext: {} };
  for (let i = 0; i < 400; i++) { const P = pentagonPlan('X' + i, i * 8, -i * 8, V6); assert.equal(P.V, 6); checkPlan(P, bad);
    const r = P.links.filter((l) => !l.heart).length, s = P.world.filter((w) => w.side), x = s.filter((w) => w.exterior).length; tally.ring[r] = (tally.ring[r] || 0) + 1; tally.sides[s.length] = (tally.sides[s.length] || 0) + 1; tally.ext[x] = (tally.ext[x] || 0) + 1; }
  assert.deepEqual(bad.slice(0, 10), []); assert.ok(Object.keys(tally.ring).length >= 2 && Object.keys(tally.sides).length >= 2, JSON.stringify(tally));
});

test('old Pentagons (v1-v5): their laid-over links pass the same solver, and no plan of theirs changes', () => {
  const bad = []; for (let V = 1; V <= 5; V++) for (let i = 0; i < 150; i++) { const P = pentagonPlan('Y' + i, i * 8, -i * 8, V); checkPlan(P, bad); assert.ok(!P.world.some((w) => w.side || w.exterior)); }
  assert.deepEqual(bad.slice(0, 10), []);
});

test('every link end stands in its chamber, on floor reachable from where you come in, apart from the others, where no later dressing goes', () => {
  const bad = []; for (const V of [1, 3, 4, 5, 6]) for (let i = 0; i < 30; i++) { const seed = 'L' + i, P = pentagonPlan(seed, i * 8, -i * 8, V);
    for (const q of P.nodes) { const m = generatePentagonChamber(seed, `${P.base}:f${q.n + 1}`), W = m.width, ends = pentagonLinkEnds(P, m), want = P.links.filter((l) => l.near === q.id || l.deep === q.id).length * 1 + P.links.filter((l) => l.near === q.id && l.deep === q.id).length;
      if (ends.length !== want) bad.push(`${seed} v${V} ${q.id}: ${ends.length} of ${want}`);
      const seen = new Set([m.entry.y * W + m.entry.x]), st = [m.entry]; while (st.length) { const c = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = m.tiles[k]; if (x < 0 || x >= W || !t || seen.has(k) || t.blocked) continue; seen.add(k); st.push({ x, y }); } }
      for (const o of ends) { if (!seen.has(o.y * W + o.x)) bad.push(`${seed} v${V} ${q.id}: ${o.id} cut off`); if (m.objects.some((p) => p.x === o.x && p.y === o.y) || m.enemySpawns.some((p) => p.x === o.x && p.y === o.y)) bad.push(`${seed} ${o.id} on another`);
        if (!(o.x <= 1 || o.x >= W - 2 || Math.hypot(o.x - m.entry.x, o.y - m.entry.y) < S.nearEntry)) bad.push(`${seed} ${o.id} where a dressing could go`); }
      for (const a of ends) for (const b of ends) if (a !== b && Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) < S.spacing) bad.push(`${seed} ${a.id} crowds ${b.id}`); } }
  assert.deepEqual(bad.slice(0, 10), []);
});

// ------------------------------------------------------------------------------------------------ old floors, byte for byte
// Hashes of every chamber (tiles, objects, spawns, entry, building) and of all nine sections laid on plain ground, for twelve
// and six Pentagons of each version 1-5, taken from the code before the shortcuts.
const GOLD = { chambers: { 1: 'c07ce80165dfe7a6', 2: 'b4177858aff5d238', 3: '5f025d88bd0ce5d7', 4: '1745199dd1133187', 5: '2b2e53162d4eeea3' }, sections: { 1: '204121f7817caf0a', 2: 'd8aaf32525b591b6', 3: '65e884b439193c52', 4: '3c5eafc70a0b5b1c', 5: 'a5bd7de62ce61045' } };
test('old Pentagons: every chamber and section of versions 1-5 generates byte for byte as before', () => {
  for (let V = 1; V <= 5; V++) { const h = createHash('sha256');
    for (let i = 0; i < 12; i++) { const seed = 'G' + i, P = pentagonPlan(seed, i * 8, -i * 8, V);
      h.update(JSON.stringify({ nodes: P.nodes.map((n) => ({ ...n, ports: n.ports.map((p) => ({ ...p, edge: undefined, world: undefined })) })), edges: P.edges, world: P.world, levers: P.levers }));
      for (const q of P.nodes) { const m = generatePentagonChamber(seed, `${P.base}:f${q.n + 1}`); h.update(JSON.stringify([m.tiles, m.objects, m.enemySpawns, m.entry, m.building])); } }
    assert.equal(h.digest('hex').slice(0, 16), GOLD.chambers[V], `chambers v${V}`);
    const k = createHash('sha256'); for (let i = 0; i < 6; i++) { const seed = 'G' + i, cx = i * 8, cy = -i * 8; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const map = { tiles: Array.from({ length: 1024 }, (_, j) => ({ x: j % 32, y: j >> 5, kind: 'grass', blocked: false, elev: 0 })), objects: [], enemySpawns: [] };
      placePentagonSection(map, seed, cx, cy, cx + dx, cy + dy, V); k.update(JSON.stringify([map.tiles, map.objects, map.enemySpawns, map.pentagon, map.greatBuilding])); } }
    assert.equal(k.digest('hex').slice(0, 16), GOLD.sections[V], `sections v${V}`); }
});

test('old Pentagons in the game: the floors you explored keep every tile and every object; the lifts are added objects only, recorded in the history', () => {
  const { cx, cy } = find();
  for (const V of [1, 4, 5]) { const g = pinned(SEED, cx, cy, V), P = pentagonPlan(SEED, cx, cy, V); visit(g, cx, cy); assert.ok(g.map.objects.some((o) => o.pentagonDoor && (V === 1 ? !o.dungeonId.includes(':v') : o.dungeonId.includes(`:v${V}:`))));
    const off = pinned(SEED, cx, cy, V); (off.save.consequences.dungeons ||= {})[`${P.base}:f1`] = { pentLinks: 0 }; // the same journey with the overlay held off
    for (const q of P.nodes) { load(g, P, q.id); load(off, P, q.id); assert.equal(H(g, P).pentLinks, S.overlay, 'the overlay version is recorded');
      const raw = generatePentagonChamber(SEED, idOf(P, q.id)); assert.deepEqual(g.map.tiles, raw.tiles, `${q.id}: tiles as generated`); assert.deepEqual(g.map.tiles, off.map.tiles);
      const still = (o) => o.kind !== 'traveler', mine = g.map.objects.filter((o) => o.kind === 'pentShortcut'), rest = g.map.objects.filter((o) => o.kind !== 'pentShortcut' && still(o)); // a wandering reciter's lines are rolled each meeting
      assert.deepEqual(rest, off.map.objects.filter(still), `${q.id}: every other object where it was`); assert.equal(mine.length, P.links.filter((l) => l.near === q.id || l.deep === q.id).length);
      assert.deepEqual(g.map.enemySpawns, off.map.enemySpawns); } }
});

// ------------------------------------------------------------------------------------------------ in the game
test('v6 in the game: a lift is barred from the gate side; from its Heart floor it opens and carries you up; it stays open through a reload and a death, and carries you down', () => {
  const { cx, cy } = find(), g = pinned(SEED, cx, cy, V6), P = pentagonPlan(SEED, cx, cy, V6); visit(g, cx, cy); assert.ok(g.map.objects.some((o) => o.pentagonDoor && o.dungeonId.includes(":v6:")), "pinned to v6 (new ground is v7 now)");
  const L = P.links.find((l) => l.deep === 'h3'), hub = L.near;
  load(g, P, hub); const near = end(g, L.id, 'near'); assert.ok(near && near.state === 'shut'); const r0 = act(g, near, 'use'); assert.ok(!r0.ok); assert.match(r0.message, /other side/); assert.equal(P.nodes[g.map.building.node].id, hub, 'refused: you stay');
  const ring = P.links.find((l) => !l.heart); load(g, P, ring.near); const rn = end(g, ring.near === hub ? ring.id : ring.id, 'near'); assert.ok(!act(g, rn, 'use').ok, 'a ring link, refused from its near side too');
  load(g, P, 'h3'); const deep = end(g, L.id, 'deep'); assert.equal(deep.state, 'shut'); const r1 = act(g, deep, 'use'); assert.ok(r1.ok, r1.message); assert.equal(r1.message, S.kinds[L.kind].opens);
  assert.equal(P.nodes[g.map.building.node].id, hub, 'carried up to the gate'); assert.ok(H(g, P).labOpen.includes(pentagonLinkKey(L.id))); assert.equal(end(g, L.id, 'near').state, 'open');
  assert.ok(g.shortcutBurst, 'a burst where it opened'); assert.equal(g.defeatNotice?.sound, 'shortcut'); assert.match(g.labyrinthProgress(), /shortcuts 1 of/);
  const n = end(g, L.id, 'near'); assert.ok(Math.hypot(g.player.x - n.x, g.player.y - n.y) < 2, 'beside it');
  // a reload: the save as stored and read back
  const h = game(SEED, migrateSave(JSON.parse(JSON.stringify(g.save)))); load(h, P, hub); assert.equal(end(h, L.id, 'near').state, 'open', 'open after a reload');
  h.player.hp = 0; h.recoverFromDeath(0); load(h, P, hub); assert.ok(H(h, P).labOpen.includes(pentagonLinkKey(L.id)), 'kept through a death'); assert.ok(h.enemies.every((e) => Number.isFinite(e.x) && Number.isFinite(e.hp)));
  const r2 = act(h, end(h, L.id, 'near'), 'use'); assert.ok(r2.ok, r2.message); assert.equal(P.nodes[h.map.building.node].id, 'h3', 'down to the Heart floor at once'); assert.match(r2.message, new RegExp(S.kinds[L.kind].ride));
  const others = P.links.filter((l) => l !== L); for (const l of others) assert.ok(!(H(h, P).labOpen || []).includes(pentagonLinkKey(l.id)), 'the others stay shut');
});

test('an old Pentagon (v5) gets its lifts too: barred from the gate side, opened from below, kept', () => {
  const { cx, cy } = find(), g = pinned(SEED, cx, cy, 5), P = pentagonPlan(SEED, cx, cy, 5), L = P.links.find((l) => l.deep === 'h2');
  load(g, P, L.near); assert.ok(!act(g, end(g, L.id, 'near'), 'use').ok); load(g, P, 'h2'); assert.ok(act(g, end(g, L.id, 'deep'), 'use').ok); assert.equal(P.nodes[g.map.building.node].id, L.near);
  load(g, P, L.near); assert.equal(end(g, L.id, 'near').state, 'open'); assert.ok(act(g, end(g, L.id, 'near'), 'use').ok); assert.equal(P.nodes[g.map.building.node].id, 'h2');
});

test('v6 side entrances: open ones let you in on joined land; an exterior door is barred from the land until drawn from inside, then lets you in', () => {
  const { cx, cy } = find(), g = pinned(SEED, cx, cy, V6), P = pentagonPlan(SEED, cx, cy, V6), sides = P.world.filter((w) => w.side), doors = new Map();
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { visit(g, cx + dx, cy + dy); for (const o of g.map.objects.filter((o) => o.pentLand)) { doors.set(o.enterAt, { rx: g.rx, ry: g.ry }); assert.ok(o.joined, `${o.enterAt} stands on land joined to the section's exits`);
    const t = g.map.tiles[o.y * 32 + o.x]; assert.ok(!t.blocked && t.x > 0 && t.x < 31 && t.y > 0 && t.y < 31); } }
  for (const w of sides) assert.ok(doors.has(w.key), `${w.key} placed`);
  const open = sides.find((w) => !w.exterior), ext = sides.find((w) => w.exterior);
  { const d = doors.get(open.key); visit(g, d.rx, d.ry); const r = act(g, g.map.objects.find((o) => o.enterAt === open.key), 'enter'); assert.ok(r.ok, r.message); assert.equal(P.nodes[g.map.building.node].id, open.node); assert.equal(g.area, 'dungeon'); }
  const d = doors.get(ext.key); visit(g, d.rx, d.ry); const door = () => g.map.objects.find((o) => o.enterAt === ext.key);
  assert.ok(door().barred && !door().opened); const r0 = act(g, door(), 'enter'); assert.ok(!r0.ok); assert.equal(r0.message, S.exterior.barred); assert.equal(g.area, 'overworld');
  load(g, P, ext.node); const out = g.map.objects.find((o) => o.id === `building-exit-${ext.key}`); assert.equal(out.shortcutOpens, ext.exterior);
  const r1 = act(g, out, 'exit'); assert.ok(r1.ok, r1.message); assert.equal(g.area, 'overworld'); assert.equal(g.message, S.exterior.opens); assert.equal(g.defeatNotice?.sound, 'shortcut'); assert.ok(H(g, P).labOpen.includes(ext.exterior));
  assert.deepEqual([g.rx, g.ry], [d.rx, d.ry]); assert.ok(door().opened);
  const h = game(SEED, migrateSave(JSON.parse(JSON.stringify(g.save)))); visit(h, d.rx, d.ry); const o2 = h.map.objects.find((o) => o.enterAt === ext.key); assert.ok(o2.opened);
  const r2 = act(h, o2, 'enter'); assert.ok(r2.ok, r2.message); assert.equal(h.area, 'dungeon'); assert.equal(P.nodes[h.map.building.node].id, ext.node, 'in straight from the land');
});

test('v6 side entrances stand on joined land across Pentagons and seeds; the gates and seams are as they were', () => {
  let n = 0, fails = []; for (const seed of ['S17', 'S21', 'Q7', 'B1', 'B2', 'B3']) { const at = findIn(game(seed)); if (!at) continue; const g = pinned(seed, at.cx, at.cy, V6); g.save.atlas[`${at.cx + 1},${at.cy + 1}`].coherenceVersion = COHERENCE.version; /* pinned to v6 as new ground (new ground is v7 now) */ const P = pentagonPlan(seed, at.cx, at.cy, V6);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { visit(g, at.cx + dx, at.cy + dy); for (const o of g.map.objects.filter((o) => o.pentLand)) { n++; if (!o.joined) fails.push(`${seed} ${o.enterAt}`); }
      for (const o of g.map.objects.filter((o) => o.pentagonDoor)) { const w = P.world.find((x) => x.key === o.enterAt); assert.ok(w, o.enterAt); assert.equal(!!o.landmark, w.place === 'land' && !w.side, `${seed} ${o.enterAt}: only the two gates are landmarks`); } } }
  assert.ok(n >= 6, `${n} side doors seen`); assert.deepEqual(fails, []);
});

test('the shortcuts draw without throwing, shut, open and opening', () => {
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), getTransform: () => ({}), ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  const { cx, cy } = find(), g = pinned(SEED, cx, cy, V6), P = pentagonPlan(SEED, cx, cy, V6); load(g, P, P.gate.node);
  for (const o of g.map.objects.filter((o) => o.kind === 'pentShortcut')) { g.player.x = o.x; g.player.y = o.y; assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000)); o.state = 'open'; g.shortcutBurst = { x: o.x, y: o.y, t0: null, life: 1.2 }; assert.doesNotThrow(() => render(ctx, g, 360, 640, 5100)); assert.doesNotThrow(() => render(ctx, g, 360, 640, 9000)); }
  assert.equal(g.shortcutBurst, null, 'the burst ends');
  const ext = P.world.find((w) => w.exterior); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { visit(g, cx + dx, cy + dy); const o = g.map.objects.find((q) => q.enterAt === ext.key); if (o) { g.player.x = o.x; g.player.y = o.y; assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000)); } }
});

// Release 738's section terrain cache holds only the terrain passes; the Pentagon is laid after, on the copy it hands out. A
// v5-pinned Pentagon and a v6 one over the same unseen section share the kept terrain and never each other's Pentagon.
test('the terrain cache: a v6 section never gets a v5 Pentagon, nor a v5 one a v6, whichever loads first', () => {
  const { cx, cy } = find(), rx = cx - 1, ry = cy - 1, snap = (g) => JSON.stringify([g.map.tiles, g.map.objects.filter((o) => o.kind !== 'traveler'), g.map.pentagon]);
  const fresh = (mk) => { clearSectionTerrainCache(); const g = visit(mk(), rx, ry); return snap(g); };
  const v5 = () => pinned(SEED, cx, cy, 5), v6 = () => pinned(SEED, cx, cy, V6), want5 = fresh(v5), want6 = fresh(v6);
  assert.ok(want5.includes(':v5:') && !want5.includes(':v6:')); assert.ok(want6.includes(':v6:') && !want6.includes(':v5:'));
  for (const order of [[v5, v6], [v6, v5]]) { clearSectionTerrainCache(); const [a, b] = order.map((mk) => visit(mk(), rx, ry)); assert.ok(sectionTerrainCacheStats().hits >= 1, 'the second load is served from the cache');
    for (const [g, mk] of [[a, order[0]], [b, order[1]]]) assert.equal(snap(g), mk === v5 ? want5 : want6); }
});

