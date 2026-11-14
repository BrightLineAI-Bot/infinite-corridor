// Tool ranges and Close View terrain occlusion (Tim, 2026-11-14): the Rift Bombard flies a long but finite range and comes
// down there; the Lumen Spindle dissipates at its range, or turns back off what it strikes for a leg as long as the cast;
// the Carbine and the Aether Orrery reach without limit. In Close View only, raised ground stops the Wayfarer's shots (a
// lobbed shell may clear a low rise; a charged Carbine beam passes through terrain); Standard View shoots over elevation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, updateProjectiles } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { normalizeItemUpgrade, PRIMARY_PROFILES, RANGED_WEAPONS, CARBINE_RANK } from '../src/items.ts';
import { TOOL_RANGE, RANGED_OCCLUSION, toolRange, shotClearance, shotFade, ORRERY, CARBINE } from '../src/tool-forms.ts';
import { LIFT_PER_LEVEL } from '../src/landscape.ts';
import { OUTDOOR } from '../src/close-view-outdoor.ts';
import { DEFAULT_PROJECTILE_VISUAL_HEIGHT } from '../src/actor-presentation.ts';
import { SECTION_SIZE } from '../src/world.ts';

const W = 48, PX = 3, PY = 9.55, ROW = 10;
const item = (id, name, property, extra = {}) => normalizeItemUpgrade({ id, name, slot: 'secondary', property, tier: 'relic', affixes: [], power: 20, upgradeRank: 0, ...extra });
const TOOLS = {
  bombard: () => item('secondary-rift-bombard', 'Rift Bombard', 'blast'),
  spindle: (extra) => item('secondary-lumen-spindle', 'Lumen Spindle', 'focus', extra),
  needle: () => item('secondary-needle-caster', 'Needle Caster', 'quick'),
  coil: () => item('spark-coil', 'Spark Coil', 'focus', { basePower: 14, power: 14 + CARBINE_RANK, upgradeRank: CARBINE_RANK }),
  orrery: () => ({ ...ORRERY.item, tier: 'relic' }),
};
// A room W tiles wide, the Wayfarer at (3, 9.55) facing right along row 10. `rises` maps x → elevation for tiles on rows 9–11.
// `close`: an interior with Close View on (interiorTerrain v1); otherwise the same floor in the standard view.
function arena({ tool = TOOLS.needle(), foes = [], rises = {}, close = false } = {}) {
  const s = freshSave(); s.seed = 'RANGES'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; s.equipment.secondary = tool; s.activeWeaponSlot = 'secondary'; s.closeView = close;
  if (s.rounds) s.rounds.loaded = 999;
  const g = new Game(s, 0);
  g.map = { ...g.map, width: W, height: W, exits: null, objects: [], enemySpawns: [], building: { style: 'keep' }, landscape: true, interiorTerrain: { version: 1 },
    tiles: Array.from({ length: W * W }, (_, i) => { const x = i % W, y = Math.floor(i / W); return { x, y, kind: 'stone', blocked: x === 0 || y === 0 || x === W - 1 || y === W - 1, elev: rises[x] != null && y >= ROW - 1 && y <= ROW + 1 ? rises[x] : 0 }; }) };
  g.area = 'dungeon'; g.paused = false; g.projectiles = []; g.effects = []; Object.assign(g.player, { x: PX, y: PY, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: 'foe' + i, hp: 1e9, maxHp: 1e9, damage: 0, cooldown: 99, speed: 0, aggro: false }));
  return { s, g };
}
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function run(g, frames, t, each = () => {}) { for (let i = 0; i < frames; i++) { t += 50; g.update(.05, idle, t); g.player.x = PX; g.player.y = PY; each(t); } return t; }
const fire = (g, t) => { g.player.attackReadyAt = 0; g.toolReadyAt = 0; return g.fireSecondary(t, { x: 1, y: 0 }); };
// Fire one shot and follow it: its farthest x, where it ended, and the blasts it left.
function follow(g, frames = 80) {
  assert.equal(fire(g, 1000), true, 'it fires'); let t = 1000;
  while (!g.projectiles.length && t < 1500) t = run(g, 1, t); // Close View: the Bombard and the Spindle leave after their startup
  const shot = g.projectiles[0]; const x0 = shot.age > 0 ? PX + .5 + .35 : shot.x;
  let far = shot.x, blast = null; run(g, frames, t, () => { far = Math.max(far, shot.x); blast ||= g.effects.find((f) => f.kind === 'rift-blast') || null; });
  return { shot, x0, far, end: shot.x, blast };
}

test('the ranges live in TOOL_RANGE and keep Tim\'s order: Verge Cleaver < Lumen Spindle < Rift Bombard < Carbine = Orrery (unlimited)', () => {
  const cleaver = PRIMARY_PROFILES['primary-verge-cleaver'].range, spindle = toolRange('lumen-spindle'), bombard = toolRange('rift-bombard');
  assert.ok(cleaver < spindle && spindle < bombard, `${cleaver} < ${spindle} < ${bombard}`);
  for (const reach of [0, .48, 1.2]) assert.ok(cleaver * (1 + reach) < spindle * (1 + reach) && spindle * (1 + reach) < bombard * (1 + reach), 'both scale with reach, so the order holds at any reach');
  assert.ok(Math.abs(cleaver * 1.48 - 2.59) < .01, 'Tim\'s Cleaver at +48% reach'); assert.ok(Math.abs(spindle * 1.48 - 8) < .1 && bombard * 1.48 > 9.5 && bombard * 1.48 < 9.7 && spindle * 1.48 < bombard * 1.48, 'and his Spindle (about 8 out and 8 back) and Bombard (9.6)');
  assert.equal(TOOL_RANGE.carbine, 'unlimited'); assert.equal(TOOL_RANGE['aether-orrery'], 'unlimited');
  assert.ok(toolRange('carbine') > SECTION_SIZE * Math.SQRT2 && toolRange('carbine') >= 64, 'past a section\'s diagonal and an interior\'s width');
  const B = RANGED_WEAPONS['secondary-rift-bombard'], S = RANGED_WEAPONS['secondary-lumen-spindle'];
  assert.ok(Math.abs(B.speed * B.lifetime - bombard) < 1e-9 && Math.abs(S.speed * S.lifetime - spindle) < 1e-9, 'the weapons read the table');
  assert.equal(B.damage, 16); assert.equal(S.damage, 11); assert.equal(B.speed, 8); assert.equal(S.speed, 10); // damage and speed unchanged
  assert.equal(RANGED_OCCLUSION.closeViewOnly, true); assert.equal(RANGED_OCCLUSION.hostile, false);
  assert.equal(RANGED_OCCLUSION.chest, DEFAULT_PROJECTILE_VISUAL_HEIGHT, 'the sight line runs at the drawn shot height');
  const O = RANGED_OCCLUSION; assert.ok(O.waist > 0 && O.waist < O.chest);
  assert.ok(LIFT_PER_LEVEL < O.waist && LIFT_PER_LEVEL * 2 >= O.waist && OUTDOOR.terrain.level >= O.waist, 'a level shot: inside two levels stop it, outside one');
  assert.equal(O.pierce.carbine, 'full');
});

test('the Rift Bombard comes down at its range and bursts there', () => {
  const { g } = arena({ tool: TOOLS.bombard() });
  const { shot, x0, far, blast } = follow(g, 40);
  assert.ok(shot.dead); assert.ok(blast, 'it burst'); const range = toolRange('rift-bombard');
  assert.ok(Math.abs(blast.x - (x0 + range)) < .45, `burst at ${(blast.x - x0).toFixed(2)} tiles, range ${range}`);
  assert.ok(far - x0 < range + .45, 'never flew past its range');
  // With reach the range grows with the stat, as every tool's does.
  const r = arena({ tool: { ...TOOLS.bombard(), affixes: [{ id: 'reach', value: .48 }] } }); const f = follow(r.g, 40);
  assert.ok(Math.abs(f.blast.x - (f.x0 + range * 1.48)) < .45, 'Tim\'s reach: about 9.6 tiles');
});

test('the Lumen Spindle dissipates at its range when it strikes nothing, shrinking over its last tiles', () => {
  const { g } = arena({ tool: TOOLS.spindle() });
  assert.equal(fire(g, 1000), true); const shot = g.projectiles[0], x0 = shot.x, range = toolRange('lumen-spindle');
  assert.equal(shot.legRange, range); let fades = [];
  run(g, 30, 1000, () => { if (!shot.dead) fades.push(shotFade(shot)); assert.equal(shot.returning, false, 'it never turns back'); });
  assert.ok(shot.dead && shot.dissipated, 'it dissipated'); assert.ok(Math.abs(shot.x - (x0 + range)) < .25, `at ${(shot.x - x0).toFixed(2)} tiles`);
  assert.equal(fades[0], 1); assert.ok(fades[fades.length - 1] < 1, 'it fades at the end');
});

test('the Lumen Spindle turns back off a foe it strikes, and the return leg is as long as the cast range', () => {
  const { g } = arena({ tool: TOOLS.spindle(), foes: [[PX + 5.5, PY - .1]] }); const foe = g.enemies[0];
  assert.equal(fire(g, 1000), true); const shot = g.projectiles[0], range = toolRange('lumen-spindle');
  let turnX = shot.x, turned = false, hits = 0, last = foe.hp;
  run(g, 40, 1000, () => { if (!shot.dead) turnX = Math.max(turnX, shot.x); turned ||= shot.returning; if (foe.hp < last) { hits++; last = foe.hp; } });
  assert.ok(turned, 'it turned back'); assert.ok(turnX < PX + 6.5, 'at the foe, not at its range');
  assert.ok(hits >= 1, 'the foe was struck');
  assert.ok(shot.dead && shot.dissipated); assert.ok(Math.abs((turnX - shot.x) - range) < .45, `return leg ${(turnX - shot.x).toFixed(2)} tiles, range ${range}`);
  // A wall turns it too, for the same return leg.
  const w = arena({ tool: TOOLS.spindle(), rises: {} }); for (let y = 0; y < W; y++) w.g.map.tiles[y * W + 8].blocked = true;
  assert.equal(fire(w.g, 1000), true); const s2 = w.g.projectiles[0]; let back = s2.x, turned2 = false; run(w.g, 40, 1000, () => { if (!s2.dead) back = Math.max(back, s2.x); turned2 ||= s2.returning; });
  assert.ok(turned2 && back < 8, 'turned at the wall'); assert.ok(Math.abs((back - s2.x) - range) < .45, 'then flew its range back');
});

test('a Spindle saved before the change (no legRange) keeps its old turn by age', () => {
  const map = { tiles: Array.from({ length: W * W }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: 'stone', blocked: false })) };
  const old = { id: 'old', x: 3.5, y: 10.5, dx: 1, dy: 0, speed: 10, life: 1.8, damage: 11, damageType: 'magic', path: 'boomerang', age: 0, turnAfter: .8, returning: false, hits: {} };
  let list = [old], far = old.x; for (let i = 0; i < 20; i++) { list = updateProjectiles(list, [], map, W, .05); far = Math.max(far, old.x); }
  assert.equal(old.returning, true); assert.ok(Math.abs(far - (3.5 + 10 * .8)) <= .5 + 1e-9, `turned after .8 s (8 tiles), as before: ${far - 3.5}`); assert.equal(old.legDist, undefined);
});

test('the Carbine and the Aether Orrery reach without limit: to a foe 40 tiles off', () => {
  const far = PX + 40;
  { const { g } = arena({ tool: TOOLS.coil(), foes: [[far, PY - .1]] }); assert.equal(fire(g, 1000), true); run(g, 1, 1000); const beam = g.projectiles.find((p) => p.carbine) || null;
    let t = run(g, 30, 1000); void t; assert.ok(g.enemies[0].hp < 1e9, 'the beam struck it'); assert.ok(!beam || beam.dead); }
  { const { g } = arena({ tool: TOOLS.orrery(), foes: [[far, PY - .1]] }); assert.equal(fire(g, 1000), true); const orb = g.projectiles.find((p) => p.orrery === 'orb');
    assert.ok(orb && Math.abs(orb.speed * orb.life - toolRange('aether-orrery')) < 1e-9, 'the orb flies the unlimited range');
    run(g, 120, 1000); assert.ok(g.enemies[0].hp < 1e9, 'the orb struck it'); }
  // The tap's pellet field is as before: it sheds only over its old flight.
  { const { g } = arena({ tool: TOOLS.orrery() }); assert.equal(fire(g, 1000), true); run(g, 80, 1000); }
});

test('the Orrery orb sheds its pellets only over its first ORRERY.tap.shedFor s', () => {
  const { g } = arena({ tool: TOOLS.orrery() }); assert.equal(fire(g, 1000), true);
  let maxPellets = 0; run(g, 60, 1000, () => { maxPellets = Math.max(maxPellets, g.projectiles.filter((p) => p.orrery === 'pellet').length); });
  assert.ok(maxPellets > 0 && maxPellets <= Math.ceil(ORRERY.tap.shedFor / ORRERY.tap.shedEvery) + 1, `${maxPellets} pellets`);
});

test('Close View: a shot into a raised block stops there; the Standard View shot passes over it', () => {
  const rises = { 8: 2 }; // two interior levels: .68 tiles, above a shot's .66
  const close = arena({ close: true, rises }); const c = follow(close.g, 30);
  assert.ok(c.shot.dead && c.far < 8, `Close View: stopped at ${c.far.toFixed(2)}`);
  const standard = arena({ close: false, rises }); const s = follow(standard.g, 30);
  assert.ok(s.far > 9, `Standard View: flew on over it to ${s.far.toFixed(2)}`);
  assert.equal(standard.g.shotOccluder(), null, 'no test at all in the standard view');
  // One interior level (.34 tiles) is below the shot: it flies over it in Close View too.
  const low = arena({ close: true, rises: { 8: 1 } }); assert.ok(follow(low.g, 30).far > 9, 'a single interior level is cleared');
  // Line of sight (Tim: "If you can see the enemy, you should be able to shoot him"): a foe up on a plateau whose edge is in
  // view is hit from below; a foe on the floor behind a rise is not.
  const up = arena({ close: true, rises: { 8: 2, 9: 2, 10: 2, 11: 2 }, foes: [[9, PY - .1]] }); follow(up.g, 30); assert.ok(up.g.enemies[0].hp < 1e9, 'shot up at the foe on the plateau');
  assert.ok(up.g.projectiles.length === 0);
  const behind = arena({ close: true, rises: { 8: 2 }, foes: [[11, PY - .1]] }); follow(behind.g, 30); assert.equal(behind.g.enemies[0].hp, 1e9, 'the rise shields the foe behind it');
  const low1 = arena({ close: true, rises: { 8: 1 }, foes: [[11, PY - .1]] }); follow(low1.g, 30); assert.ok(low1.g.enemies[0].hp < 1e9, 'a step below the waist does not');
  // From up on the block the shot flies out over the lower floor.
  const top = arena({ close: true, rises: { 2: 2, 3: 2, 4: 2 } }); assert.ok(follow(top.g, 30).far > 9, 'shooting down from a rise is clear');
});

test('Close View outdoors: one level of rise stops a level shot (a level is drawn 1.2 tiles tall); a foe just over a plateau edge is hit, one far back is hidden', () => {
  const s = freshSave(); s.seed = 'RANGES-OUT'; s.overworldCloseView = true; const g = new Game(s, 0);
  g.area = 'overworld'; g.map = { ...g.map, width: 32, height: 32, landscape: true, building: null, interiorTerrain: null, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'grass', blocked: false, elev: i % 32 === 8 ? 1 : 0 })) };
  Object.assign(g.player, { x: PX, y: PY, hp: 1e6 });
  const occ = g.shotOccluder(); assert.equal(typeof occ, 'function', 'Close View applies outdoors');
  const shot = () => ({ id: 'o', x: 3.85, y: 10, dx: 1, dy: 0, speed: 15, life: 1.25, damage: 10, damageType: 'physical', path: 'straight', age: 0, hits: {} });
  const a = shot(); updateProjectiles([a], [], g.map, 32, .5, () => {}, () => {}, null, () => {}, (p) => p.damage, () => {}, [], null, null, (n) => n, occ);
  assert.ok(a.dead && a.x < 8, 'stopped at the rise'); assert.equal(a.launchZ, 0); assert.deepEqual(a.los.slice(2), [.66, 4.85, 10, .66], 'a level sight line with no foe');
  const b = shot(); updateProjectiles([b], [], g.map, 32, .5, () => {}, () => {}, null, () => {}, (p) => p.damage, () => {}, [], null, null, (n) => n, null);
  assert.ok(b.x > 9, 'with no occluder (the standard view) it flies on');
  s.overworldCloseView = false; assert.equal(g.shotOccluder(), null);
  // A ramp tile counts its foot: a shot passes up it.
  s.overworldCloseView = true; g.map.tiles[10 * 32 + 8].slope = true; const c = shot(); updateProjectiles([c], [], g.map, 32, .5, () => {}, () => {}, null, () => {}, (p) => p.damage, () => {}, [], null, null, (n) => n, g.shotOccluder());
  assert.ok(c.x > 9, 'up a ramp tile the shot passes');
  // A plateau from x = 8 on: a foe just over the edge is in view and hit; one 12 tiles back is hidden by the edge.
  g.map.tiles[10 * 32 + 8].slope = false; for (const t of g.map.tiles) t.elev = t.x >= 8 ? 1 : 0;
  for (const [fx, hit] of [[9, true], [20, false]]) {
    const foe = Object.assign(createCombatant('rootBrute', fx, PY - .1), { id: 'top', hp: 1e9, maxHp: 1e9, damage: 0, cooldown: 99, speed: 0 }); g.enemies = [foe];
    const d = shot(); let list = [d]; for (let i = 0; i < 20 && list.length; i++) list = updateProjectiles(list, g.enemies, g.map, 32, .05, () => {}, () => {}, null, () => {}, (p) => p.damage, () => {}, [], null, null, (n) => n, g.shotOccluder());
    assert.equal(foe.hp < 1e9, hit, `foe at x ${fx}: ${hit ? 'hit' : 'hidden'}`); if (!hit) assert.ok(d.x < 8.01, 'stopped at the edge');
  }
});

test('Close View: a lobbed shell clears a low rise mid-flight and bursts at its range; a tall one stops it and it bursts at the face', () => {
  const low = arena({ tool: TOOLS.bombard(), close: true, rises: { 7: 2 } }); const a = follow(low.g, 40);
  assert.ok(a.blast && Math.abs(a.blast.x - (a.x0 + toolRange('rift-bombard'))) < .45, 'it flew over and came down at its range');
  const straight = arena({ close: true, rises: { 7: 2 } }); assert.ok(follow(straight.g, 30).far < 7, 'the same rise stops a straight shot');
  const tall = arena({ tool: TOOLS.bombard(), close: true, rises: { 7: 8 } }); const b = follow(tall.g, 40);
  assert.ok(b.blast && b.blast.x < 7 && b.blast.x > 6, `it burst at the face (${b.blast?.x.toFixed(2)})`);
  // The arc: from the shot height up to its apex and down to the ground.
  const shell = { path: 'grenade', speed: 8, lobSpan: .8125, age: 0 }; assert.equal(shotClearance(shell), RANGED_OCCLUSION.chest);
  shell.age = .40625; assert.ok(shotClearance(shell) > 1.5); shell.age = .8125; assert.equal(shotClearance(shell), 0);
});

test('Close View: a fully charged Carbine beam passes through raised ground; taps and partial charges are stopped', () => {
  const rises = { 8: 6 }, foes = [[14, PY - .1]];
  for (const held of [0, CARBINE.charge.grace + .01, (CARBINE.charge.grace + CARBINE.charge.full) / 2, CARBINE.charge.full - .01]) {
    const q = arena({ tool: TOOLS.coil(), close: true, rises, foes }); assert.equal(q.g.carbineFire(1000, { x: 1, y: 0 }, held), true);
    const b = q.g.projectiles.find((p) => p.carbine); assert.ok(b.charge < 1); run(q.g, 20, 1000);
    assert.ok(b.dead && b.x < 8, `a beam held ${held} s stopped at the rise`); assert.equal(q.g.enemies[0].hp, 1e9);
  }
  const ch = arena({ tool: TOOLS.coil(), close: true, rises, foes }); assert.equal(ch.g.carbineFire(1000, { x: 1, y: 0 }, CARBINE.charge.full), true);
  const cb = ch.g.projectiles.find((p) => p.carbine); assert.equal(cb.charge, 1, 'full');
  run(ch.g, 20, 1000); assert.ok(ch.g.enemies[0].hp < 1e9, 'the full charge struck the foe beyond the rise');
});

test('exact resume: a shell and a Spindle saved mid-flight in Close View finish exactly as unsaved ones do', () => {
  const plateau = { 8: 2, 9: 2, 10: 2, 11: 2 };
  for (const [tool, rises, foe] of [[TOOLS.bombard, { 7: 2 }, PX + 2.2], [TOOLS.spindle, { 7: 2 }, PX + 2.2], [TOOLS.needle, plateau, 9], [TOOLS.spindle, plateau, 9]]) {
    const make = () => arena({ tool: tool(), close: true, rises, foes: [[foe, PY - .1]] });
    const A = make(), B = make(); fire(A.g, 1000); fire(B.g, 1000);
    let t = run(A.g, 3, 1000); run(B.g, 3, 1000);
    const saved = JSON.parse(JSON.stringify(B.g.projectiles)); assert.ok(saved.length && saved.every((p) => Number.isFinite(p.launchZ) && (p.path === 'grenade' ? p.lobSpan > 0 : p.los.length === 6)), 'the launch ground, sight line and arc are saved with the shot');
    B.g.projectiles = saved; B.g.player.x = PX; // resumed: plain data only
    run(A.g, 40, t); run(B.g, 40, t);
    if (rises === plateau) assert.ok(A.g.enemies[0].hp < 1e9, 'the foe on the plateau was hit: ' + tool().name);
    assert.deepEqual(B.g.enemies.map((e) => e.hp), A.g.enemies.map((e) => e.hp));
    assert.deepEqual(JSON.parse(JSON.stringify(B.g.projectiles)), JSON.parse(JSON.stringify(A.g.projectiles)));
    assert.deepEqual(B.g.effects.map((f) => [f.kind, f.x, f.y]), A.g.effects.map((f) => [f.kind, f.x, f.y]));
  }
});

test('60 s of every ranged tool fired every frame in Close View among rises (cooldowns wiped): finite and bounded', () => {
  for (const tool of Object.values(TOOLS)) {
    const { g } = arena({ tool: tool(), close: true, rises: { 6: 2, 7: 1, 9: 3, 12: 8 }, foes: [[8, PY - .1], [11, PY + 1], [15, PY - 1]] }); let t = 1000, peak = 0;
    for (let i = 0; i < 1200; i++) {
      g.player.attackReadyAt = 0; g.toolReadyAt = 0; g.fireSecondary(t, { x: Math.cos(i * .37), y: Math.sin(i * .37) * .8 });
      t += 50; g.update(.05, idle, t); g.player.x = PX; g.player.y = PY; peak = Math.max(peak, g.projectiles.length);
      for (const p of g.projectiles) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.life) && Number.isFinite(p.damage), tool().name);
    }
    assert.ok(peak <= 32 + 24 + 8, `${tool().name}: ${peak} live shots`); assert.ok(g.effects.length < 200, `${tool().name}: ${g.effects.length} effects`);
  }
});
