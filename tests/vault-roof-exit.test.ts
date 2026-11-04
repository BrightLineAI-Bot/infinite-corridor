// The vault's roof exit (Tim, 2026-11-04: "When you complete a keep or a great keep — when you get to the final room where the
// caches are, the vault, at the central tower — there should also be an exit, so you don't have to walk all the way out.
// Something to the roof, so you can jump off (and die if you really want), or use the robot to jump from the central tower to
// the roof of the next building and jump down. There should always be an exit to the roof or something like that.").
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, generatePinnedDungeon, roofExitPlan } from '../src/game.ts';
import { sectionRegion, LANDSCAPE_VERSION, fallDamage } from '../src/landscape.ts';
import { BUILDINGS, ROOF_EXIT, buildingHereV2, roofLanding } from '../src/great-buildings.ts';
import { compoundHere, compoundTopology } from '../src/compounds.ts';
import { LABYRINTHS, labyrinthHere, labyrinthPlan } from '../src/labyrinths.ts';
import { CASTLES, castleTopology, quarterSection, castleVersionOf } from '../src/castles.ts';
import { exitsOpen } from '../src/keeps.ts';
import { render } from '../src/renderer.ts';

const SEED = 'TIM1';
const H = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const visit = (rx, ry, save = null) => { const s = save || freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
const ring = (min, max, f) => { for (let d = min; d < max; d++) for (let x = -d; x <= d; x++) for (const y of [d - Math.abs(x), Math.abs(x) - d]) { const r = f(x, y); if (r) return r; } return null; };
const act = (g, o, a) => { g.player.x = o.x; g.player.y = o.y; return g.interact(a, o.id); };
const climbAll = (g) => { for (let i = 0; i < 8; i++) { const up = g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'up'); if (!up) return; assert.ok(act(g, up, 'climb').ok); } };
const guardian = (g) => g.enemies.find((e) => String(e.id).endsWith(':guardian') && !e.dead && e.hp > 0);
const fell = (g, e) => { e.hp = 0; e.dead = true; g.defeatEnemy(e); };
const idle = (x = 0, y = 0) => ({ state: { x, y }, consume: () => false, held: () => false });
const tileAt = (g) => g.map.tiles[Math.round(g.player.y) * 32 + Math.round(g.player.x)];

// Finders on new ground (a fresh save: every section first seen now)
const memo = {};
const once = (k, f) => (k in memo ? memo[k] : (memo[k] = f()));
const plainBuilding = (hatch) => once(`b${hatch}`, () => ring(4, 40, (x, y) => { if (!buildingHereV2(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION))) return null; const g = visit(x, y), B = g.map.greatBuilding; return B && !B.compound && !B.labyrinth && !B.castle && !!B.roof === hatch && (hatch || B.roofTop) ? { x, y } : null; }));
const compoundNoHatch = () => once('c', () => ring(5, 40, (x, y) => { if (!compoundHere(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION))) return null; const g = visit(x, y), t = g.map.objects.find((o) => o.compoundDoor && /:t:\d+:f1$/.test(o.dungeonId)); return t ? { x, y } : null; }));
const labyrinth = () => once('l', () => ring(LABYRINTHS.minRing, 40, (x, y) => { if (!labyrinthHere(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION))) return null; return visit(x, y).map.greatBuilding?.roofTop ? { x, y } : null; }));
const castle = () => once('k', () => { const g = visit(0, 0); for (let d = 3; d < 60; d += 3) for (let X = -d; X <= d; X += 3) for (const Y of [d - Math.abs(X), Math.abs(X) - d]) if (g.castleHere(X, Y)) { const k = quarterSection(X, Y, castleTopology(SEED, X, Y).k); if (visit(k.rx, k.ry).map.objects.some((o) => o.castleDoor && o.buildingDoors?.roofTop)) return { X, Y }; } return null; });

// Into each kind of vault (new ground), by its own doors
function intoBuilding(hatch) { const at = plainBuilding(hatch), g = visit(at.x, at.y), d = g.map.objects.find((o) => o.buildingDoor && !o.breachDoor && !o.roofHatch); assert.ok(act(g, d, 'enter').ok); climbAll(g); return { g, at, part: 'building' }; }
function intoTower() { const at = compoundNoHatch(), g = visit(at.x, at.y), d = g.map.objects.find((o) => o.compoundDoor && /:t:\d+:f1$/.test(o.dungeonId)); assert.ok(act(g, d, 'enter').ok); climbAll(g); return { g, at, part: 'tower' }; }
function intoKeep() { const c = castle(), s = quarterSection(c.X, c.Y, castleTopology(SEED, c.X, c.Y).k), g = visit(s.rx, s.ry), d = g.map.objects.find((o) => o.castleDoor && o.dungeonId.includes(':k:')); assert.ok(act(g, d, 'enter').ok); climbAll(g); return { g, at: { x: s.rx, y: s.ry }, part: 'keep' }; }
function intoVault() { const at = labyrinth(), g = visit(at.x, at.y), d = g.map.objects.find((o) => o.labyrinthDoor); assert.ok(act(g, d, 'enter').ok); const base = g.areaId().replace(/:f\d+$/, ''), P = labyrinthPlan(base), v = P.nodes.find((q) => q.vault);
  const first = [...v.slots.values()][0].inner; g.goBuildingFloor(`${base}:f${v.n + 1}`, first.x, first.y); assert.ok(g.map.building.vault); return { g, at, part: 'labyrinth' }; }
const KINDS = { 'great building (no hatch)': () => intoBuilding(false), 'compound tower (no hatch)': intoTower, 'castle keep': intoKeep, 'labyrinth vault': intoVault };

test('new ground: every roof the exits lead to stands on the section, walkable, at a fatal height; the section keeps its ways through', () => {
  assert.equal(BUILDINGS.version, 3); assert.equal(CASTLES.version, 2); assert.equal(LABYRINTHS.version, 2);
  const bld = visit(plainBuilding(false).x, plainBuilding(false).y), B = bld.map.objects.find((o) => o.kind === 'greatBuilding' && !o.compound);
  assert.ok(bld.map.greatBuilding.roofTop && !bld.map.greatBuilding.roof, 'no hatch, but a roof to stand on'); assert.ok(!bld.map.objects.some((o) => o.roofHatch), 'no way in from the roof');
  const c = castle(), k = quarterSection(c.X, c.Y, castleTopology(SEED, c.X, c.Y).k), keep = visit(k.rx, k.ry), K = keep.map.objects.find((o) => o.castle).blocks.find((b) => b.part === 't');
  const lab = visit(labyrinth().x, labyrinth().y), L = lab.map.objects.find((o) => o.labyrinth), tow = visit(compoundNoHatch().x, compoundNoHatch().y), T = tow.map.objects.find((o) => o.compound).blocks.find((b) => b.part === 't');
  for (const [g, cells, what] of [[bld, B.footprint, 'building'], [keep, K.cells, 'keep'], [lab, L.footprint, 'labyrinth'], [tow, T.cells, 'tower']]) {
    const roof = cells.map((q) => g.map.tiles[q.y * 32 + q.x]).filter((t) => t.structure === 'buildingRoof' && !t.blocked);
    assert.ok(roof.length >= Math.min(cells.length, 9) * .8, `${what}: walkable roof`); assert.ok(roof.every((t) => t.elev === 5), `${what}: at roof height`);
    assert.equal(fallDamage(roof[0].elev, 100), Infinity, `${what}: off the edge on foot is a fatal fall`);
    assert.ok(exitsOpen(g.map).every(Boolean) || exitsOpen(g.map).filter(Boolean).length >= 2, `${what}: the section's ways through`);
    assert.ok(roofLanding(g.map, what), `${what}: somewhere to land`); }
  assert.ok(K.cells.length === 9, 'the keep\'s 3x3 top');
});

for (const [kind, into] of Object.entries(KINDS)) test(`${kind}: the vault gets a roof exit, sealed while its guardian stands, open once it falls; it lets you out on the roof`, () => {
  const { g, at, part } = into(), vault = g.areaId(), re = g.map.objects.find((o) => o.dir === 'roofExit');
  assert.ok(re, 'a roof exit in the vault'); assert.equal(re.kind, 'buildingStair'); assert.deepEqual(re.roofExit, { part, rx: at.x, ry: at.y, roof: true });
  assert.ok(!g.map.tiles[re.y * g.map.width + re.x].blocked && !g.map.tiles[re.y * g.map.width + re.x].hole, 'on floor');
  const gd = guardian(g); assert.ok(gd, 'the vault has its guardian');
  { assert.ok(re.sealed, 'sealed while the guardian stands'); const r = act(g, re, 'climb'); assert.ok(!r.ok); assert.equal(r.message, ROOF_EXIT.messages.sealed); assert.equal(g.area, 'dungeon'); assert.equal(g.areaId(), vault);
    fell(g, gd); assert.ok(!re.sealed, 'open'); assert.ok(g.save.consequences.dungeons[vault].roofExit, 'kept on the vault floor\'s history'); }
  const r = act(g, re, 'climb'); assert.ok(r.ok, r.message); assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry], [at.x, at.y], 'on the building\'s own section');
  const t = tileAt(g); assert.equal(t.structure, 'buildingRoof'); assert.ok(!t.blocked); assert.equal(t.elev, 5, 'at roof height'); assert.equal(r.message, ROOF_EXIT.messages.roof);
  const L = roofLanding(g.map, part); assert.deepEqual([Math.round(g.player.x), Math.round(g.player.y)], [L.x, L.y], 'near the middle of its highest block');
  assert.doesNotThrow(() => render({ fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, fill() {}, stroke() {}, closePath() {}, save() {}, restore() {}, fillText() {}, measureText: () => ({ width: 10 }), setTransform() {}, translate() {}, scale() {}, rotate() {}, clip() {}, rect() {}, drawImage() {}, createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), quadraticCurveTo() {}, bezierCurveTo() {}, setLineDash() {}, getImageData: () => ({ data: [] }), putImageData() {}, canvas: { width: 360, height: 640 } }, g, 360, 640, 5000));
});

test('below the vault there is no roof exit; a roof hatch\'s ladder already is one; the Pentagon keeps its own way out', () => {
  const { g } = intoBuilding(false), base = g.areaId().replace(/:f\d+$/, ''), n = g.map.building.floors;
  for (let f = 1; f < n; f++) assert.ok(!generatePinnedDungeon(g.save, `${base}:f${f}`).objects.some((o) => o.dir === 'roofExit'), `floor ${f}`);
  const h = intoBuilding(true).g; assert.ok(h.map.objects.some((o) => o.dir === 'roof'), 'the roof ladder'); assert.ok(!h.map.objects.some((o) => o.dir === 'roofExit'));
  assert.equal(roofExitPlan(g.save, 'pentagon:x:0:0:f1', { building: { pentagon: true, vault: true, labyrinth: true } }), null);
});

test('jumping off the roof: the ordinary fall rules (four levels or more on foot kill)', () => {
  const { g } = intoBuilding(false); const gd = guardian(g); if (gd) fell(g, gd); assert.ok(act(g, g.map.objects.find((o) => o.dir === 'roofExit'), 'climb').ok);
  g.save.glider = false; if (g.save.mech) g.save.mech.active = false;
  const B = g.map.objects.find((o) => o.kind === 'greatBuilding' && !o.compound), b = B.bounds, edge = B.footprint.filter((c) => !g.map.tiles[c.y * 32 + c.x].blocked && c.x === b.x + b.w - 1 && g.map.tiles[c.y * 32 + c.x + 1] && !g.map.tiles[c.y * 32 + c.x + 1].blocked && !(g.map.tiles[c.y * 32 + c.x + 1].elev > 1))[0];
  assert.ok(edge, 'an open edge'); g.player.x = edge.x; g.player.y = edge.y; g.player.invulnerableUntil = 0; const hp = g.player.hp; assert.ok(hp > 0);
  const deaths = g.save.worldFlags.deaths || 0, rx = g.rx, ry = g.ry;
  let t = 2000; for (let i = 0; i < 40 && (g.save.worldFlags.deaths || 0) === deaths; i++) g.update(.05, idle(1, 0), t += 50);
  assert.equal(g.save.worldFlags.deaths, deaths + 1, 'the Wayfarer falls five levels and is felled');
  assert.deepEqual([g.save.lastDeath.rx, g.save.lastDeath.ry], [rx, ry]); assert.ok(g.save.lastDeath.x > edge.x, 'felled at the foot of the wall');
});

test('reload: an opened roof exit stays open, even if the guardian stood again; a save on the roof resumes on the roof', () => {
  const { g } = intoKeep(), vault = g.areaId(); fell(g, guardian(g)); g.snapshotArea();
  const raw = JSON.parse(JSON.stringify(g.save)); delete raw.session.areas[vault]; // the floor as first generated: its lord stands again
  const s2 = migrateSave(raw), g2 = new Game(s2, 0); assert.equal(g2.area, 'dungeon'); assert.equal(g2.areaId(), vault);
  assert.ok(s2.consequences.dungeons[vault].roofExit, 'kept through a save and a migration');
  const re = g2.map.objects.find((o) => o.dir === 'roofExit'); assert.ok(re && !re.sealed, 'open');
  assert.ok(guardian(g2), 'the lord stands again'); assert.ok(act(g2, re, 'climb').ok, 'still open'); assert.equal(tileAt(g2).elev, 5);
  g2.sync?.(); const s3 = migrateSave(JSON.parse(JSON.stringify(g2.save))), g3 = new Game(s3, 0); g3.loadArea('overworld', false);
  assert.equal(g3.area, 'overworld'); assert.equal(tileAt(g3).structure, 'buildingRoof', 'resumes on the roof'); assert.equal(tileAt(g3).elev, 5);
});

test('ground explored before roofs: an old building\'s top floor lets you out by its front door; an old tower\'s onto its roof; old castles and labyrinths keep their own way out', () => {
  // the 739 pins, as a fresh visit wrote them
  const pins = { buildingVersion: 2, labVersion: 1, castleVersion: 1, compoundVersion: 1 };
  const at = plainBuilding(false), s = freshSave(); s.seed = SEED; const first = visit(at.x, at.y); s.atlas = { [`${at.x},${at.y}`]: { ...first.save.atlas[`${at.x},${at.y}`], ...pins } };
  const g = visit(at.x, at.y, s); assert.ok(g.map.objects.find((o) => o.kind === 'greatBuilding' && !o.compound).footprint.every((c) => g.map.tiles[c.y * 32 + c.x].blocked || g.map.greatBuilding.roof), 'a closed block');
  const d = g.map.objects.find((o) => o.buildingDoor && !o.breachDoor && !o.roofHatch); assert.ok(act(g, d, 'enter').ok); climbAll(g);
  const re = g.map.objects.find((o) => o.dir === 'roofExit'); assert.ok(re); assert.equal(re.name, ROOF_EXIT.names.door); assert.equal(re.roofExit.roof, false);
  const gd = guardian(g); if (gd) { assert.ok(!act(g, re, 'climb').ok); fell(g, gd); }
  const r = act(g, re, 'climb'); assert.ok(r.ok); assert.equal(r.message, ROOF_EXIT.messages.door); assert.deepEqual([g.player.x, g.player.y], [d.x, d.y], 'out by the front door'); assert.ok(!tileAt(g).blocked);
  // new ground with no landscape layer (so no heights): the block stays closed and the back stair lets you out by the door
  const flat = ring(4, 40, (x, y) => { if (!buildingHereV2(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION))) return null; const v = visit(x, y), B = v.map.greatBuilding; return B && !B.compound && !B.labyrinth && !B.castle && !B.roof && !B.roofTop && !v.map.landscape ? { x, y } : null; });
  if (flat) { const f = visit(flat.x, flat.y), fd = f.map.objects.find((o) => o.buildingDoor && !o.breachDoor && !o.roofHatch); assert.ok(act(f, fd, 'enter').ok); climbAll(f); const fr = f.map.objects.find((o) => o.dir === 'roofExit'); assert.ok(fr && fr.roofExit.roof === false && fr.name === ROOF_EXIT.names.door); }
  // a castle any section of which was pinned to version 1 stays version 1 in all four
  const c = castle(), atlas = { [`${quarterSection(c.X, c.Y, 0).rx},${quarterSection(c.X, c.Y, 0).ry}`]: { castleVersion: 1 } }; assert.equal(castleVersionOf(atlas, c.X, c.Y), 1); assert.equal(castleVersionOf({}, c.X, c.Y), 2);
  assert.equal(roofExitPlan({ atlas }, `castle:${SEED}:${c.X}:${c.Y}:k:3:f3`, { building: { castle: true, part: 'k', floor: 3, floors: 3 } }), null, 'an old keep: its gate way out, no roof');
  assert.equal(roofExitPlan({ atlas: { '9,9': { labVersion: 1 } } }, `labyrinth:${SEED}:9:9:keep:f4`, { building: { labyrinth: true, vault: true } }), null, 'an old labyrinth: its front way out');
  assert.deepEqual(roofExitPlan({ atlas: { '9,9': { compoundVersion: 1 } } }, `compound:${SEED}:9:9:keep:t:3:f3`, { building: { compound: true, part: 't', floor: 3, floors: 3, roof: false } }), { part: 'tower', rx: 9, ry: 9, roof: true }, 'an old tower: its roof was always walkable');
});

test('a sweep: every kind of vault, at both interior versions, finds a stair spot on floor reachable from the way in; every new roof has somewhere to land', () => {
  const reach = (m) => { const W = m.width, ok = (x, y) => { const t = m.tiles[y * W + x]; return t && !t.blocked && !t.hole; }, seen = new Set([m.entry.y * W + m.entry.x]), st = [m.entry];
    while (st.length) { const p = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let x = p.x + dx, y = p.y + dy; const t = m.tiles[y * W + x]; if (!t || t.blocked) continue; if (t.hole) { x += dx; y += dy; if (!ok(x, y)) continue; } const k = y * W + x; if (!seen.has(k)) { seen.add(k); st.push({ x, y }); } } }
    return seen; };
  const bad = []; let n = 0;
  for (let i = 0; i < 60; i++) for (const V of [1, 2]) {
    const style = ['keep', 'apartment', 'hive'][i % 3], fl = 3 + (i % 2), tf = compoundTopology(`SW${i}`, i, -i, style).tower.floors, kf = castleTopology(`SW${i}`, 3 * i, -3 * i).keep.floors;
    const ids = [`building:SW${i}:${i}:${-i}:${style === 'hive' ? 'keep' : style}:${fl}:f${fl}`, `compound:SW${i}:${i}:${-i}:${style}:t:${tf}:f${tf}`, `castle:SW${i}:${3 * i}:${-3 * i}:k:${kf}:f${kf}`];
    const lab = `labyrinth:SW${i}:${i}:${-i}:${style}`, v = labyrinthPlan(lab).nodes.find((q) => q.vault); ids.push(`${lab}:f${v.n + 1}`);
    for (const id of ids) { const s = freshSave(); s.seed = `SW${i}`; const base = id.replace(/:f\d+$/, ''); s.consequences.dungeons[`${base}:f1`] = { discovered: true, visits: 1, buildingDoors: { rx: i, ry: -i, roofTop: true } }; (s.consequences.dungeons[id] ||= { discovered: true, visits: 0 }).interiorVersion = V;
      const m = generatePinnedDungeon(s, id), re = m.objects.find((o) => o.dir === 'roofExit'); n++;
      if (!re) { bad.push(`${id} v${V}: no roof exit`); continue; }
      if (!reach(m).has(re.y * m.width + re.x)) bad.push(`${id} v${V}: out of reach`);
      if (m.objects.some((o) => o !== re && Math.round(o.x) === re.x && Math.round(o.y) === re.y) || m.enemySpawns.some((e) => e.x === re.x && e.y === re.y)) bad.push(`${id} v${V}: on something`); } }
  assert.deepEqual(bad, []); assert.equal(n, 480);
  let roofs = 0; for (let x = -14; x <= 14 && roofs < 16; x++) for (let y = -14; y <= 14 && roofs < 16; y++) { const r = sectionRegion(SEED, x, y, LANDSCAPE_VERSION); if (!buildingHereV2(SEED, x, y, r) && !labyrinthHere(SEED, x, y, r) && !compoundHere(SEED, x, y, r)) continue;
    const g = visit(x, y), B = g.map.greatBuilding; if (!B || !(B.roofTop || B.compound)) continue; roofs++;
    assert.ok(roofLanding(g.map, B.compound ? 'tower' : B.labyrinth ? 'labyrinth' : 'building'), `${x},${y}: a landing`); }
  assert.ok(roofs >= 10, `${roofs} roofs`);
});

// Fingerprints of sections and interiors first generated under release 739 (seed TIM1), with their 739 atlas pins.
const OLD = [["bldNo",0,-4,{"terrain":"glass","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#465b58","sites":[{"kind":"shrine","name":"Singing Array","x":13,"y":17},{"kind":"dungeon","name":"Old Keep","x":9,"y":19},{"kind":"dungeon","name":"Old Keep (broken wall)","x":6,"y":27}]},"784040be24990196","fd0bd5f744634732","82bf94c20a07ad9f"],["bldNo",2,2,{"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#4a463d","landscape":"swamp","sites":[{"kind":"ruinMarker","name":"Broken Observatory","x":19,"y":17},{"kind":"supplyCache","name":"Supply Cache","x":17,"y":17},{"kind":"shack","name":"Wayfarer Shack","x":10,"y":22},{"kind":"dungeon","name":"Ruined Arcology","x":26,"y":21}]},"fbd5590abd41e7a0","5e4e02ba251cd0be","da89acb6b4942cbc"],["compoundHatch",4,1,{"terrain":"glass","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#4d5f56","landscape":"swamp","sites":[{"kind":"shrine","name":"Singing Array","x":15,"y":14},{"kind":"supplyCache","name":"Supply Cache","x":17,"y":17},{"kind":"dungeon","name":"Castle Compound: North Hall","x":14,"y":20},{"kind":"dungeon","name":"North Hall (courtyard door)","x":16,"y":24},{"kind":"dungeon","name":"East Range (roof hatch)","x":19,"y":26},{"kind":"dungeon","name":"Gatehouse (roof hatch)","x":18,"y":29},{"kind":"dungeon","name":"West Range (roof hatch)","x":11,"y":24},{"kind":"dungeon","name":"Keep Tower (courtyard door)","x":14,"y":27},{"kind":"dungeon","name":"Keep Tower (roof hatch)","x":15,"y":26}]},"9e0d7fbdfea5bd85","7ac943979f14f977","713c899b421f51f0"],["lab",-5,-1,{"terrain":"glass","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#455a58","sites":[{"kind":"ruinMarker","name":"Broken Observatory","x":18,"y":12},{"kind":"dungeon","name":"Glass Kiln","x":10,"y":18},{"kind":"supplyCache","name":"Supply Cache","x":17,"y":17},{"kind":"shack","name":"Wayside Chapel","x":7,"y":23},{"kind":"dungeon","name":"Labyrinth Keep","x":14,"y":11}]},"13888584e5e1d5eb","26777bb13d972ed9","943faa78d12797b2"],["lab",-3,3,{"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#73664f","landscape":"desert","sites":[{"kind":"shrine","name":"Singing Array","x":12,"y":15},{"kind":"dungeon","name":"Root-Sunk Cistern","x":25,"y":8},{"kind":"shack","name":"Orbital Pod","x":23,"y":7},{"kind":"dungeon","name":"Labyrinth Keep","x":9,"y":11}]},"2797434e517c1ce9","47baa131ab08d0c1","bafaa737e07398ff"],["bldRoof",-2,4,{"terrain":"glass","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#666a5d","landscape":"mountains","sites":[{"kind":"ruinMarker","name":"Broken Observatory","x":13,"y":14},{"kind":"supplyCache","name":"Supply Cache","x":17,"y":17},{"kind":"ruinMarker","name":"Smouldering Caldera","x":27,"y":8},{"kind":"ruinMarker","name":"Summit Cairn","x":2,"y":17},{"kind":"dungeon","name":"Old Keep","x":10,"y":23},{"kind":"dungeon","name":"Old Keep (roof hatch)","x":9,"y":26}]},"f94e1437c16ad26c","df3da88bd4dd982a","575e066bfd6ea194"],["compoundNoHatch",1,6,{"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#58554e","landscape":"mountains","sites":[{"kind":"shrine","name":"Singing Array","x":19,"y":12},{"kind":"ruinMarker","name":"Summit Cairn","x":8,"y":3},{"kind":"dungeon","name":"North Hall (roof hatch)","x":25,"y":21},{"kind":"dungeon","name":"East Range (roof hatch)","x":26,"y":23},{"kind":"dungeon","name":"Castle Compound: Gatehouse","x":23,"y":30},{"kind":"dungeon","name":"Gatehouse (courtyard door)","x":23,"y":26},{"kind":"dungeon","name":"West Range (roof hatch)","x":17,"y":25},{"kind":"dungeon","name":"Keep Tower (courtyard door)","x":23,"y":26}]},"0aa9e5d561034c0e","073aa5752d73035a","866d63bb3d6a87a1"],["compoundNoHatch",-8,1,{"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#656a63","landscape":"mountains","sites":[{"kind":"ruinMarker","name":"Broken Observatory","x":17,"y":13},{"kind":"supplyCache","name":"Supply Cache","x":17,"y":17},{"kind":"ruinMarker","name":"Summit Cairn","x":28,"y":25},{"kind":"dungeon","name":"East Range (roof hatch)","x":29,"y":5},{"kind":"dungeon","name":"Gatehouse (courtyard door)","x":26,"y":7},{"kind":"dungeon","name":"Gatehouse (roof hatch)","x":26,"y":9},{"kind":"dungeon","name":"Castle Compound: West Range","x":19,"y":4},{"kind":"dungeon","name":"West Range (roof hatch)","x":21,"y":7},{"kind":"dungeon","name":"Keep Tower (courtyard door)","x":24,"y":7}]},"5cf8401b0d05f9cc","fa1a509922977ccf","ace8a6e7298b4bef"],["bldRoof",-7,4,{"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#947e60","landscape":"desert","sites":[{"kind":"shrine","name":"Singing Array","x":17,"y":12},{"kind":"supplyCache","name":"Supply Cache","x":15,"y":17},{"kind":"shack","name":"Wayside Chapel","x":9,"y":22},{"kind":"ruinMarker","name":"Mesa Watchstone","x":3,"y":3},{"kind":"dungeon","name":"Old Keep","x":18,"y":19},{"kind":"dungeon","name":"Old Keep (roof hatch)","x":20,"y":22}]},"9db9e6a14dd4975e","300ac7647de8e3d1","ac56208b64aae4f0"],["castle0",-7,2,{"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#71766e","landscape":"mountains","sites":[{"kind":"shrine","name":"Singing Array","x":18,"y":17},{"kind":"supplyCache","name":"Supply Cache","x":17,"y":18},{"kind":"dungeon","name":"North-West Range (courtyard door)","x":25,"y":28},{"kind":"dungeon","name":"Door · South-West Range","x":27,"y":30},{"kind":"dungeon","name":"Great Keep","x":26,"y":28}]},"035c7ab2d577290a","cdd83f9cf0264af2","600a01d7ab43602b"],["castle1",-6,2,{"terrain":"ember","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#707168","landscape":"mountains","sites":[{"kind":"shrine","name":"Singing Array","x":15,"y":13},{"kind":"dungeon","name":"Hollow Relay","x":15,"y":25},{"kind":"supplyCache","name":"Supply Cache","x":15,"y":18},{"kind":"dungeon","name":"The Threefold Deep","x":14,"y":22},{"kind":"ruinMarker","name":"Summit Cairn","x":3,"y":21},{"kind":"dungeon","name":"Great Castle: North-East Range","x":5,"y":21},{"kind":"dungeon","name":"North-East Range (courtyard door)","x":6,"y":28}]},"325d52f57de34dea","59fa6a9c597a4ce5","9ab19cd15d6e903f"],["castle2",-7,3,{"terrain":"ash","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#7b7f7b","landscape":"mountains","sites":[{"kind":"shrine","name":"Singing Array","x":17,"y":17},{"kind":"supplyCache","name":"Supply Cache","x":15,"y":18},{"kind":"ruinMarker","name":"Summit Cairn","x":23,"y":13},{"kind":"dungeon","name":"South-West Range (courtyard door)","x":25,"y":3},{"kind":"dungeon","name":"Door · South-East Range","x":30,"y":4}]},"4cf76deb3517362b","2ad6ca72786b60ee","d0988a73b8c254ac"],["castle3",-6,3,{"terrain":"glass","landscapeVersion":17,"hamletVersion":2,"travelVersion":1,"seaVersion":3,"dreamVersion":4,"watcherVersion":1,"skyVersion":3,"skyPlace":2,"deepVersion":1,"buildingVersion":2,"farVersion":6,"compoundVersion":1,"labVersion":1,"castleVersion":1,"pentVersion":5,"canyonVersion":1,"ascendVersion":1,"coherenceVersion":1,"indoorDungeonVersion":1,"color":"#7c817d","landscape":"mountains","sites":[{"kind":"shrine","name":"Singing Array","x":16,"y":18},{"kind":"supplyCache","name":"Supply Cache","x":15,"y":18},{"kind":"ruinMarker","name":"Summit Cairn","x":28,"y":25},{"kind":"dungeon","name":"Great Castle: South-East Range","x":4,"y":10},{"kind":"dungeon","name":"South-East Range (courtyard door)","x":6,"y":3},{"kind":"dungeon","name":"Door · North-East Range","x":4,"y":1}]},"8e7cee7b2e3bf746","a72da118d32dc3e4","f74ef84e822dfbdb"]];
const OLD_INTERIORS = '92653136366f8c50';
test('ground and interiors generated before regenerate byte for byte (the roof exit is laid over a floor, never into it)', () => {
  const rows = [];
  for (const [kind, x, y, atlas, tiles, objects, spawns] of OLD) {
    const key = `${x},${y}`, s = freshSave(); s.atlas = { [key]: atlas }; const g = visit(x, y, s);
    assert.equal(H(g.map.tiles), tiles, `${kind} ${key} tiles`); assert.equal(H(g.map.objects), objects, `${kind} ${key} objects`); assert.equal(H(g.map.enemySpawns), spawns, `${kind} ${key} spawns`);
    const bases = new Set(); for (const o of g.map.objects) if (o.kind === 'dungeon' && o.buildingDoor) bases.add(o.dungeonId.replace(/:f\d+$/, ''));
    for (const base of bases) for (const V of [1, 2]) { const ids = base.startsWith('labyrinth:') ? labyrinthPlan(base).nodes.map((q) => `${base}:f${q.n + 1}`) : Array.from({ length: Number(base.match(/:(\d+)r?$/)[1]) }, (_, i) => `${base}:f${i + 1}`);
      const save = freshSave(); save.seed = SEED; save.atlas = { [key]: atlas };
      for (const id of ids) { (save.consequences.dungeons[id] ||= { discovered: true, bypassed: false, visits: 0, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false }).interiorVersion = V; const m = generatePinnedDungeon(save, id);
        rows.push([id, V, H(m.tiles), H(m.enemySpawns), H(m.objects.filter((o) => o.id !== 'roof-exit'))]); } } }
  assert.equal(rows.length, 202); assert.equal(H(rows), OLD_INTERIORS);
});
