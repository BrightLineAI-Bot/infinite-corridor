// The Mountain Turtle's shell (Tim, 2026-11-04: "when you kill the turtle you should be able to walk up into the hole — the
// gateway that's in his shell — and that should be a labyrinth dungeon inside there"). The shell stays where the Turtle fell;
// its gateway enters the Shell-Labyrinth, seeded by the kill, at the current interior version; its vault pays a Tesseract
// glyph or Divine Viscera, once. Shells are save records laid over the generated section at runtime.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, generatePinnedDungeon } from '../src/game.ts';
import { exitsOpen } from '../src/keeps.ts';
import { coherenceCore, coherenceHub, joinsCore, LETHAL_KINDS, openSeaSection } from '../src/landscape.ts';
import { BUILDINGS } from '../src/great-buildings.ts';
import { LABYRINTHS, labyrinthPlan, generateLabyrinthChamber, parseLabyrinthId, isLabyrinthId } from '../src/labyrinths.ts';
import { TURTLE_SHELL, placeTurtleShell, applyTurtleShell, shellCells, shellLabyrinthBase, shellVaultReward, ensureTurtleShells } from '../src/turtle-shell.ts';
import { render } from '../src/renderer.ts';

const SEED = 'TIM1';
const js = (v) => JSON.stringify(v);
const at = (m, x, y) => m.tiles[y * (m.width || 32) + x];
const standable = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind) && !t.hole;
const visit = (rx, ry, save = null) => { const s = save || freshSave(); s.seed ||= SEED; if (!save) s.seed = SEED; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
const turtle = (g, x, y, cycle = g.save.worldBeasts.mountainTurtle.cycle) => { g.save.worldBeasts.mountainTurtle.active = { rx: g.rx, ry: g.ry, tries: 0 };
  const t = g.createEnemyFromSpawn({ id: `world-beast:mountainTurtle:${cycle}`, kind: 'mountainTurtle', x, y, boss: true, worldBeast: 'mountainTurtle', traits: [] }); g.enemies.push(t); return t; };
const slay = (g, x = 8, y = 9) => { const t = turtle(g, x, y); t.hp = 0; t.dead = true; g.defeatEnemy(t); return t; };
const reload = (g) => { const s = migrateSave(JSON.parse(JSON.stringify(g.save))); return visit(g.rx, g.ry, s); };
const shellOf = (g) => g.map.objects.find((o) => o.kind === 'turtleShell');
const gateOf = (g) => g.map.objects.find((o) => o.shellGate);
// 4-way flood; `jump` lets a gallery's one-tile gap be jumped (as tests/dungeon-coherence.test.ts)
const flood = (map, from, jump = false) => { const W = map.width || 32, H = map.height || map.tiles.length / W, seen = new Set([from.y * W + from.x]), q = [from];
  while (q.length) { const p = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let x = p.x + dx, y = p.y + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue; let t = map.tiles[y * W + x];
    if (!standable(t)) { if (!jump || !t || t.blocked) continue; x += dx; y += dy; t = map.tiles[y * W + x]; if (!standable(t)) continue; } const k = y * W + x; if (!seen.has(k)) { seen.add(k); q.push({ x, y }); } } }
  return seen; };
const near = (map, seen, o, r = 1.5) => { const W = map.width || 32; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = Math.round(o.x) + dx, y = Math.round(o.y) + dy; if (seen.has(y * W + x) && Math.hypot(x - o.x, y - o.y) < r) return true; } return false; };
// Solve a labyrinth from its door: passages, keys before their sealed doors, barred shortcuts; true when the vault is reached.
function solve(seed, base, V) {
  const P = labyrinthPlan(base), maps = P.nodes.map((q) => generateLabyrinthChamber(seed, `${base}:f${q.n + 1}`, V)), got = new Set(), opened = new Set(), seen = new Set([0]); let changed = true;
  while (changed) { changed = false; for (const n of [...seen]) { const m = maps[n], reach = flood(m, m.entry, m.building.kind === 'gaps');
    for (const o of m.objects) { if (!near(m, reach, o)) continue; if (o.kind === 'labKey' && !got.has(o.keyId)) { got.add(o.keyId); changed = true; }
      if (!o.toId || (o.lock && !got.has(o.lock)) || (o.barred && !opened.has(o.shortcutKey))) continue; if (o.shortcutOpens && !opened.has(o.shortcutOpens)) { opened.add(o.shortcutOpens); changed = true; }
      const j = Number(o.toId.split(':f').pop()) - 1; if (!seen.has(j)) { seen.add(j); changed = true; } } } }
  const vault = maps[P.end], reach = flood(vault, vault.entry, vault.building.kind === 'gaps');
  return seen.has(P.end) && vault.objects.filter((o) => o.kind === 'chest' || o.kind === 'exit').every((o) => near(vault, reach, o));
}

test('the Turtle slain on land: its shell rests where it fell, clear of the lanes and plaza, recorded in the save; the section holds together', () => {
  const g = visit(3, 4), before = exitsOpen(g.map), core0 = coherenceCore(g.map), doors = g.map.objects.filter((o) => o.actions?.length && joinsCore(g.map, o, core0));
  slay(g); const S = g.save.turtleShells; assert.equal(S.list.length, 1); const r = S.list[0];
  assert.deepEqual({ id: r.id, cycle: r.cycle, rx: r.rx, ry: r.ry, lab: r.lab, skirt: r.skirt }, { id: 'turtle-shell-0', cycle: 0, rx: 3, ry: 4, lab: shellLabyrinthBase(SEED, 0, 3, 4), skirt: false });
  assert.ok(Math.hypot(r.x - 8, r.y - 9) < 8, 'near where it fell');
  const shell = shellOf(g), gate = gateOf(g); assert.ok(shell && gate); assert.equal(gate.x, r.x); assert.equal(gate.y, r.y + 1);
  for (const c of shellCells(r.x, r.y)) { assert.ok(at(g.map, c.x, c.y).blocked, 'walked around, not through'); assert.ok(!(c.x >= 13 && c.x <= 19 && c.y >= 13 && c.y <= 19), 'off the plaza'); }
  const after = exitsOpen(g.map); before.forEach((o, i) => assert.ok(!o || after[i], `exit ${i} still open`));
  const core = coherenceCore(g.map); assert.ok(joinsCore(g.map, gate, core), 'the gateway joins the plaza'); for (const o of doors) assert.ok(joinsCore(g.map, o, core), `${o.id} still joined`);
  assert.ok(g.save.worldBeasts.mountainTurtle.slain === 1 && g.save.worldBeasts.mountainTurtle.cycle === 1, 'the fall paid as before');
  assert.ok(g.save.journal?.some?.((j) => /shell/i.test(j.text || j.entry || '')) || js(g.save).includes('turtle-shell:turtle-shell-0'), 'journalled');
});

test('the gateway enters the Shell-Labyrinth at the current interior version; leaving by the door or the vault returns you to the gateway', () => {
  const g = visit(3, 4); slay(g); const gate = gateOf(g), r = g.save.turtleShells.list[0];
  g.player.x = gate.x; g.player.y = gate.y; assert.equal(g.nearestObject()?.id, gate.id, 'an Act prompt at the gateway'); assert.ok(g.interact('enter', gate.id).ok);
  assert.equal(g.area, 'dungeon'); assert.equal(g.areaId(), `${r.lab}:f1`); assert.ok(isLabyrinthId(g.areaId()));
  assert.equal(g.map.building.interiorVersion, BUILDINGS.interior.version); assert.equal(g.save.consequences.dungeons[`${r.lab}:f1`].interiorVersion, BUILDINGS.interior.version);
  assert.match(g.map.name, /^The Shell-Labyrinth · /); assert.equal(g.map.tint, LABYRINTHS.styles.shell.tint);
  const out = g.map.objects.find((o) => o.kind === 'exit'); g.player.x = out.x; g.player.y = out.y; assert.ok(g.interact('exit', out.id).ok);
  assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry, g.player.x, g.player.y], [3, 4, gate.x, gate.y], 'back at the gateway');
  // and by the vault's way out
  g.player.x = gate.x; g.player.y = gate.y; g.interact('enter', gate.id); const P = labyrinthPlan(r.lab);
  g.snapshotArea(); g.save.session.activeDungeonId = `${r.lab}:f${P.end + 1}`; g.loadArea('dungeon', false); assert.ok(g.map.building.vault);
  const way = g.map.objects.find((o) => o.kind === 'exit'); g.player.x = way.x; g.player.y = way.y; assert.ok(g.interact('exit', way.id).ok);
  assert.deepEqual([g.area, g.rx, g.ry, g.player.x, g.player.y], ['overworld', 3, 4, gate.x, gate.y]);
});

test('Shell-Labyrinths are deterministic per kill and always solvable (keys, sealed doors, shortcuts, galleries)', () => {
  let n = 0;
  for (const seed of ['TIM1', 'A7', 'ZQ3', 'KX9']) for (let cycle = 0; cycle < 12; cycle++) {
    const base = shellLabyrinthBase(seed, cycle, (cycle * 7) % 23 - 11, (cycle * 5) % 19 - 9), P = labyrinthPlan(base);
    assert.equal(parseLabyrinthId(`${base}:f1`).style, 'shell');
    assert.ok(P.nodes.length >= LABYRINTHS.chambers[0] && P.nodes.length <= LABYRINTHS.chambers[1]);
    assert.ok(solve(seed, base, BUILDINGS.interior.version), `${base}: the vault can be reached`); n++;
    if (cycle < 3) for (const q of P.nodes) assert.equal(js(generateLabyrinthChamber(seed, `${base}:f${q.n + 1}`, 2)), js(generateLabyrinthChamber(seed, `${base}:f${q.n + 1}`, 2)), 'the same every visit');
  }
  assert.equal(n, 48);
  assert.notEqual(js(labyrinthPlan(shellLabyrinthBase(SEED, 0, 3, 4)).edges), js(labyrinthPlan(shellLabyrinthBase(SEED, 1, 3, 4)).edges), 'another kill, another maze');
  // the existing labyrinths are untouched by the new style (no tint, the same keys and rooms)
  const old = 'labyrinth:A7:61:69:keep'; const m = generateLabyrinthChamber('A7', `${old}:f1`, 2); assert.equal(m.tint, undefined); assert.match(m.name, /^Labyrinth Keep/);
});

test('reload keeps the shell exactly; a dungeon resumed inside it regenerates the same chamber', () => {
  const g = visit(3, 4); slay(g); const tiles = js(g.map.tiles.map((t) => [t.kind, !!t.blocked, t.elev || 0])), objs = js(g.map.objects.filter((o) => o.kind === 'turtleShell' || o.shellGate));
  const g2 = reload(g); assert.equal(js(g2.map.tiles.map((t) => [t.kind, !!t.blocked, t.elev || 0])), tiles); assert.equal(js(g2.map.objects.filter((o) => o.kind === 'turtleShell' || o.shellGate)), objs);
  assert.equal(g2.map.objects.filter((o) => o.kind === 'turtleShell').length, 1, 'laid once');
  g2.loadArea('overworld'); assert.equal(g2.map.objects.filter((o) => o.kind === 'turtleShell').length, 1, 'and once again on the next load');
  const gate = gateOf(g2); g2.player.x = gate.x; g2.player.y = gate.y; g2.interact('enter', gate.id); const room = js(g2.map.tiles);
  const g3 = new Game(migrateSave(JSON.parse(JSON.stringify(g2.save))), 0); g3.save.session.area = 'dungeon'; g3.area = 'dungeon'; g3.loadArea('dungeon', false); assert.equal(js(g3.map.tiles), room);
});

test('no shell for kills before this release; a section with no shell is byte-identical to what it was', () => {
  const old = freshSave(); old.seed = SEED; delete old.turtleShells; old.worldBeasts.mountainTurtle.slain = 3; old.worldBeasts.mountainTurtle.cycle = 5;
  const m = migrateSave(JSON.parse(JSON.stringify(old))); assert.deepEqual(m.turtleShells.list, [], 'past kills leave no shell');
  for (const [rx, ry] of [[3, 4], [-7, 2], [10, 0], [0, 0]]) {
    const a = visit(rx, ry, (() => { const s = freshSave(); s.seed = SEED; delete s.turtleShells; return s; })()), b = visit(rx, ry);
    const c = visit(rx, ry, (() => { const s = freshSave(); s.seed = SEED; s.turtleShells.list.push({ id: 'turtle-shell-9', cycle: 9, rx: rx + 1, ry, x: 8, y: 9, lab: shellLabyrinthBase(SEED, 9, rx + 1, ry), skirt: false }); return s; })());
    const shape = (g) => js({ tiles: g.map.tiles, objects: g.map.objects, exits: g.map.exits, enemies: g.enemies.map((e) => [e.id, e.kind, e.x, e.y]) });
    assert.equal(shape(b), shape(a), `${rx},${ry}: as before`); assert.equal(shape(c), shape(a), `${rx},${ry}: a shell elsewhere changes nothing here`);
  }
});

test('at most six shells stand: laying a seventh fades the oldest, drops its labyrinth state, and the next visit there says so once', () => {
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0), spots = [[3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4]];
  for (const [rx, ry] of spots) { g.rx = rx; g.ry = ry; g.loadArea('overworld', false); slay(g); if (rx === 3) { const gate = gateOf(g); g.player.x = gate.x; g.player.y = gate.y; g.interact('enter', gate.id); const out = g.map.objects.find((o) => o.kind === 'exit'); g.player.x = out.x; g.player.y = out.y; g.interact('exit', out.id); } }
  const S = g.save.turtleShells; assert.equal(S.list.length, TURTLE_SHELL.keep); assert.deepEqual(S.list.map((r) => r.rx), [5, 6, 7, 8, 9, 10]); assert.deepEqual(S.faded.map((f) => f.rx), [3, 4]);
  const lab = shellLabyrinthBase(SEED, 0, 3, 4); assert.ok(!Object.keys(g.save.consequences.dungeons).some((k) => k.startsWith(`${lab}:f`)), 'its histories gone'); assert.ok(!Object.keys(g.save.session.areas).some((k) => k.startsWith(`${lab}:f`)), 'and its snapshots');
  g.rx = 3; g.ry = 4; g.loadArea('overworld'); assert.equal(g.message, TURTLE_SHELL.messages.fade); assert.ok(!shellOf(g), 'no shell'); assert.deepEqual(g.save.turtleShells.faded.map((f) => f.rx), [4]);
  g.message = ''; g.loadArea('overworld'); assert.notEqual(g.message, TURTLE_SHELL.messages.fade, 'told once');
  g.rx = 10; g.ry = 4; g.loadArea('overworld'); assert.ok(shellOf(g), 'the newest stands');
  assert.ok(js(S).length < 2000, `records are small (${js(S).length} chars)`);
});

test('at sea: a Turtle slain on the water rests on the nearest reachable shallows or shore; in open water it heaps a ring of sand', () => {
  let rx = null, ry = 0; for (let x = 6; x < 30 && rx === null; x++) if (openSeaSection(SEED, x, 0)) rx = x; assert.ok(rx !== null);
  const g = visit(rx, ry), W = 32, sea = g.map.tiles.filter((t) => t.kind === 'ocean' || t.kind === 'deepOcean'); assert.ok(sea.length > 300);
  const fall = sea.sort((a, b) => Math.hypot(b.x - 16, b.y - 16) - Math.hypot(a.x - 16, a.y - 16)).find((t) => t.x > 3 && t.x < 28 && t.y > 3 && t.y < 28);
  slay(g, fall.x, fall.y); const r = g.save.turtleShells.list[0]; assert.ok(r, 'a shell at sea');
  const gate = gateOf(g); assert.ok(standable(at(g.map, gate.x, gate.y)), 'the gateway stands on footing'); assert.equal(r.skirt, false, 'it rests on the land there is');
  const shore = flood(g.map, gate), wet = (k) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ['ocean', 'deepOcean'].includes(g.map.tiles[k + dy * 32 + dx]?.kind));
  assert.ok(joinsCore(g.map, gate, coherenceCore(g.map)) || ([...shore].some(wet) && shore.size >= TURTLE_SHELL.shore), 'reachable: from the plaza, or by skiff to its shore');
  const g2 = reload(g); assert.equal(js(gateOf(g2)), js(gate), 'and so after a reload');
  // open water with nowhere to rest: a ring of sand a skiff can land on
  const open = { width: 32, height: 32, exits: { north: 16, south: 16, west: 16, east: 16 }, objects: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: (i / 32) | 0, kind: 'ocean', blocked: true })) };
  const p = placeTurtleShell(open, { x: 6, y: 7 }, { seed: SEED, cycle: 3, exitsOpen }); assert.ok(p?.skirt, 'skirted');
  assert.deepEqual(placeTurtleShell(open, { x: 6, y: 7 }, { seed: SEED, cycle: 3, exitsOpen }), p, 'deterministic');
  const rec = { id: 'turtle-shell-3', cycle: 3, rx: 9, ry: 9, x: p.x, y: p.y, skirt: true, lab: shellLabyrinthBase(SEED, 3, 9, 9) }; applyTurtleShell(open, rec);
  const front = at(open, p.x, p.y + 1); assert.ok(standable(front) && front.kind === TURTLE_SHELL.skirt.kind, 'the gateway on sand');
  const ring = flood(open, { x: p.x, y: p.y + 1 }); assert.ok([...ring].some((k) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const t = open.tiles[k + dy * 32 + dx]; return t?.kind === 'ocean'; })), 'the sand meets the sea (a skiff lands)');
  for (const c of shellCells(p.x, p.y)) assert.ok(at(open, c.x, c.y).blocked);
  const lanes = (x, y) => (Math.abs(x - 16) <= 1) || (Math.abs(y - 16) <= 1); for (let i = 0; i < 1024; i++) if (open.tiles[i].kind !== 'ocean') assert.ok(!lanes(i % 32, (i / 32) | 0), 'no sand on a lane');
  // the Turtle's own sea ice is open sea: never ground for the shell
  const iced = { ...open, tiles: open.tiles.map((t) => (t.kind === 'ocean' ? { ...t, kind: 'seaIce', blocked: false, seaIce: true } : t)) }; const q = placeTurtleShell(iced, { x: 25, y: 25 }, { seed: SEED, cycle: 4, exitsOpen }); assert.ok(!q || q.skirt);
});

test('the vault pays exactly one of a Tesseract glyph or Divine Viscera, once, decided by the kill', () => {
  const kinds = new Set();
  for (let cycle = 0; cycle < 40; cycle++) { const b = shellLabyrinthBase(SEED, cycle, 3, 4), v = shellVaultReward(b); assert.ok(v === 'tesseract' || v === 'viscera'); assert.equal(shellVaultReward(b), v); kinds.add(v); }
  assert.equal(kinds.size, 2, 'both happen');
  for (const want of ['tesseract', 'viscera']) {
    let cycle = 0; while (shellVaultReward(shellLabyrinthBase(SEED, cycle, 3, 4)) !== want) cycle++;
    const s = freshSave(); s.seed = SEED; s.worldBeasts.mountainTurtle.cycle = cycle; const g = visit(3, 4, s); slay(g); const r = g.save.turtleShells.list[0]; assert.equal(r.cycle, cycle);
    const gate = gateOf(g); g.player.x = gate.x; g.player.y = gate.y; g.interact('enter', gate.id); const P = labyrinthPlan(r.lab);
    g.snapshotArea(); g.save.session.activeDungeonId = `${r.lab}:f${P.end + 1}`; g.loadArea('dungeon', false);
    const chest = g.map.objects.find((o) => o.id === 'building-cache'), t0 = (g.save.tesseracts?.owned || []).length, v0 = Number(g.save.skylands?.viscera) || 0;
    g.player.x = chest.x; g.player.y = chest.y; assert.ok(g.interact('open', chest.id).ok);
    const dt = g.save.tesseracts.owned.length - t0, dv = (Number(g.save.skylands.viscera) || 0) - v0;
    assert.deepEqual([dt, dv], want === 'tesseract' ? [1, 0] : [0, TURTLE_SHELL.vault.viscera], `${want}: exactly one of the two`);
    assert.equal(g.payShellVault(g.map.building), null, 'paid once');
    g.loadArea('dungeon'); const again = g.map.objects.find((o) => o.id === 'building-cache'); g.player.x = again.x; g.player.y = again.y; g.interact('open', again.id);
    const g2 = reload(g); g2.save.session.activeDungeonId = `${r.lab}:f${P.end + 1}`; g2.loadArea('dungeon', false); const c2 = g2.map.objects.find((o) => o.id === 'building-cache'); g2.player.x = c2.x; g2.player.y = c2.y; g2.interact('open', c2.id); g2.payShellVault(g2.map.building);
    assert.deepEqual([g2.save.tesseracts.owned.length - t0, (Number(g2.save.skylands.viscera) || 0) - v0], [dt, dv], 'never again, across reloads');
  }
});

test('a Turtle slain in a dungeon leaves no shell; the shell never cuts an exit or a door (fuzz over sections and falls)', () => {
  const g = visit(3, 4); g.save.session.activeDungeonId = generatePinnedDungeon(g.save, `dungeon:${SEED}:g${g.save.worldGeneration}:3:4:d0`) && `dungeon:${SEED}:g${g.save.worldGeneration}:3:4:d0`;
  g.save.session.dungeonReturn = { rx: 3, ry: 4, x: 16, y: 16 }; g.loadArea('dungeon', false); const t = turtle(g, g.map.entry.x, g.map.entry.y); t.hp = 0; t.dead = true; g.defeatEnemy(t);
  assert.equal(g.save.turtleShells.list.length, 0);
  let placed = 0, tried = 0;
  for (let k = 0; k < 36; k++) { const rx = (k * 7) % 25 - 12, ry = (k * 11) % 21 - 10, h = visit(rx, ry), m = h.map, ex0 = exitsOpen(m), hub = coherenceHub(m);
    if (hub < 0) continue; const core0 = coherenceCore(m, hub), doors = m.objects.filter((o) => o.actions?.length && joinsCore(m, o, core0)); tried++;
    const p = placeTurtleShell(m, { x: 4 + (k * 5) % 24, y: 4 + (k * 3) % 24 }, { player: h.player, exitsOpen, seed: SEED, cycle: k }); if (!p) continue;
    applyTurtleShell(m, { id: `turtle-shell-${k}`, cycle: k, rx, ry, x: p.x, y: p.y, skirt: p.skirt, lab: shellLabyrinthBase(SEED, k, rx, ry) }); placed++;
    const ex1 = exitsOpen(m), core = coherenceCore(m, hub); ex0.forEach((o, i) => assert.ok(!o || ex1[i], `${rx},${ry}: exit ${i}`));
    for (const o of doors) assert.ok(joinsCore(m, o, core), `${rx},${ry}: ${o.id}`); if (!p.skirt) assert.ok(joinsCore(m, { x: p.x, y: p.y + 1 }, core), `${rx},${ry}: gateway`); }
  assert.ok(placed >= tried * .8, `placed ${placed} of ${tried}`);
});

test('the shell is drawn (headless canvas) and its record is normalised additively', () => {
  const g = visit(3, 4); slay(g); const calls = []; const ctx = new Proxy({ canvas: { width: 390, height: 844 } }, { get: (o, k) => (k in o ? o[k] : typeof k === 'string' && /^(create|get)/.test(k) ? () => new Proxy({}, { get: () => () => {} }) : () => calls.push(k)), set: (o, k, v) => { o[k] = v; return true; } });
  const r = g.save.turtleShells.list[0]; g.player.x = r.x; g.player.y = r.y + 2; render(ctx, g, 390, 844, 1000); assert.ok(calls.length > 100);
  const s = { turtleShells: { list: [{ cycle: 1, rx: 0, ry: 0, x: 5, y: 6, lab: 'labyrinth:X~shell1:0:0:shell', note: 'kept' }, { cycle: 'x' }], future: 1 } }; ensureTurtleShells(s);
  assert.equal(s.turtleShells.list.length, 1); assert.equal(s.turtleShells.list[0].note, 'kept'); assert.equal(s.turtleShells.future, 1); assert.equal(s.turtleShells.list[0].id, 'turtle-shell-1');
});
