// Tim, 2026-11-14: "when you have Arc Wave enabled, each Echo shot will be a large arc... about the same width as the 3 arcs
// combined (or slightly smaller) when they first come out. And then it'll just travel forward. So if you have 2 echoes on
// there, it'll do 2 of those arc waves after each shot." (tool-forms.ts ARC_WAVE_ECHO)
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, updateProjectiles, characterStats } from '../src/game.ts';
import { createCombatant, enemyBodyRadius } from '../src/combat.ts';
import { rangedWeapon, normalizeItemUpgrade } from '../src/items.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { normalizeSockets, socketGlyph, GLYPHS } from '../src/glyphs.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { ARC_WAVE, ARC_WAVE_ECHO, ARC_WAVE_SHAPE, arcWaveEchoHalf, arcWaveTouches, arcWaveLife, sharedShotCount, retireArcWaves, isArcCrescent } from '../src/tool-forms.ts';

const BUSS = { id: 't', name: 'Blunderbuss', slot: 'secondary', property: 'quick', tier: 'relic', affixes: [], basePower: 5, power: 11, upgradeRank: 6 };

function arena(arc: boolean, echoes = 2, save: any = null) {
  let s: any = save;
  if (!s) {
    s = freshSave(); s.seed = 'ARC-ECHO'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = arc ? ['field:arc-wave'] : [];
    s.equipment.secondary = normalizeSockets(normalizeItemUpgrade({ ...BUSS }));
    s.glyphs.echo = echoes; for (let i = 0; i < echoes; i++) assert.equal(socketGlyph(s, 'tool', i, 'echo').ok, true);
    s.lastAim = { x: 1, y: 0 };
  }
  const g: any = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 6, y: 10, facing: 'right', hp: 100 });
  g.enemies = []; g.projectiles = []; g.effects = [];
  return { s, g };
}
const foe = (id: string, x: number, y: number) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 1e7, maxHp: 1e7, damage: 0, cooldown: 1e9, speed: 0 });
const T0 = 100000;
// Fire once, then hold the base shots aside and let the Echo timers spawn their copies.
function echoesOf(g: any) {
  assert.equal(g.fireSecondary(T0, { x: 1, y: 0 }), true);
  const base = g.projectiles.slice(); g.projectiles = [];
  g.tickGlyphs(0, T0 + 1000);
  return { base, echoes: g.projectiles.slice() };
}

test('Arc Wave with two Echo glyphs: two great waves per shot, each about as wide as the three arcs at the muzzle', () => {
  const { g } = arena(true, 2), weapon = rangedWeapon(g.save.equipment.secondary);
  const { base, echoes } = echoesOf(g);
  assert.equal(base.filter((p: any) => p.arcWave).length, 3, 'the three crescents fire as before');
  assert.ok(base.every((p: any) => !('waveHalf' in p)), 'the cone keeps its own small crescents');
  assert.equal(echoes.length, 2, 'one great wave per Echo glyph');
  const mid = base.find((p: any) => Math.abs(p.dy) < 1e-9), reach = mid.life * mid.speed / ARC_WAVE.range;
  // 2026-11-14 tempo: the crescents fly slower, as far as before, in Arc Wave's wider cone.
  assert.ok(ARC_WAVE.speed <= 11 * .6, 'noticeably slower than release 549\'s 11 tiles/s');
  assert.ok(ARC_WAVE.spread > weapon.spread * 1.5, 'a clearly wider cone than the plain pellets\'');
  assert.ok(ARC_WAVE.range >= 20 && ARC_WAVE.range >= 1.5 * ARC_WAVE_ECHO.range && ARC_WAVE.range < 32, 'far past the great waves, still inside a section (2026-11-14: was 9.35)');
  for (const p of base) { assert.equal(p.speed, ARC_WAVE.speed); assert.ok(Math.abs(p.life * p.speed - ARC_WAVE.range * reach) < 1e-9); }
  const sides = base.filter((p: any) => p !== mid).map((p: any) => Math.atan2(p.dy, p.dx)).sort((a: number, b: number) => a - b);
  assert.ok(Math.abs(sides[0] + ARC_WAVE.spread) < 1e-9 && Math.abs(sides[1] - ARC_WAVE.spread) < 1e-9, 'along Arc Wave\'s cone');
  // The three arcs' combined hit width `at` tiles past the muzzle: the outer paths' side offset plus each wave's catch (0.1 + grow).
  const three = 2 * ((ARC_WAVE_ECHO.muzzle + ARC_WAVE_ECHO.at) * Math.sin(ARC_WAVE.spread) + .1 + mid.grow);
  for (const w of echoes) {
    assert.equal(w.arcWave, true); assert.equal(w.echo, true);
    assert.ok(Math.abs(w.dx - 1) < 1e-9 && Math.abs(w.dy) < 1e-9, 'straight along the aim');
    assert.equal(w.speed, ARC_WAVE_ECHO.speed); assert.ok(w.speed >= 3 * ARC_WAVE.speed, 'much faster than the crescents');
    assert.ok(Math.abs(w.life * w.speed - ARC_WAVE_ECHO.range * reach) < 1e-9 && ARC_WAVE_ECHO.range >= 14 * weapon.lifetime, 'at least the plain pellet\'s reach');
    const width = 2 * w.waveHalf;
    assert.ok(width <= three + 1e-9 && width >= .85 * three, `width ${width.toFixed(2)} vs three arcs ${three.toFixed(2)}`);
    assert.ok(width >= 1.6 && width <= 1.9, `about release 964's 1.7 tiles: ${width.toFixed(2)}`);
    assert.ok(width > 2 * (.1 + mid.grow) * 1.4 && width > 1.9 * 2 * (mid.grow * Math.sin(ARC_WAVE_SHAPE.span)), 'clearly wider than one crescent (its catch, and nearly twice its drawn chord)');
  }
  assert.equal(echoes[0].damage, Math.max(1, Math.round(mid.damage * GLYPHS.echo.echo.tool[1])), 'the first Echo keeps its share');
  assert.equal(echoes[1].damage, Math.max(1, Math.round(mid.damage * GLYPHS.echo.third.tool)), 'the second Echo keeps its share');
  assert.equal(Math.abs(arcWaveEchoHalf(mid, ARC_WAVE.spread) - echoes[0].waveHalf) < 1e-12, true);
});

// Fly a whole shot in small steps (Echo timers included); `each(t, list)` sees every step.
function flight(g: any, each: (t: number, list: any[]) => void, seconds = 1.6, dt = 1 / 240) {
  assert.equal(g.fireSecondary(T0, { x: 1, y: 0 }), true);
  for (let t = 0; t < seconds; t += dt) { g.tickGlyphs(0, T0 + (t + dt) * 1000); g.projectiles = updateProjectiles(g.projectiles, [], g.map, 32, dt); each(t + dt, g.projectiles); }
}

test('both great waves overtake the middle crescent within 2.5 tiles of the muzzle and fly on ahead', () => {
  const { g } = arena(true, 2), muzzle = g.player.x + .5 + .35, passedAt: Record<string, number> = {}; let lastAhead = 0;
  flight(g, (_t, list) => {
    const mid = list.find((p: any) => !p.echo && Math.abs(p.dy) < 1e-9); if (!mid) return;
    for (const w of list) if (w.waveHalf > 0 && w.x > mid.x && !(w.id in passedAt)) passedAt[w.id] = mid.x - muzzle;
    const ahead = list.filter((p: any) => p.waveHalf > 0 && p.x > mid.x).length; if (ahead === 2) lastAhead = mid.x - muzzle;
  });
  assert.equal(Object.keys(passedAt).length, 2, 'both pass it');
  for (const [id, d] of Object.entries(passedAt)) assert.ok(d > 0 && d <= 2.5, `${id} passes ${d.toFixed(2)} tiles out`);
  assert.ok(lastAhead > 3, `both stay ahead to the end of their flight (the crescent ${lastAhead.toFixed(2)} tiles out)`);
});

test('the crescents fly on far past where the great waves vanish, still spreading, and end at their range', () => {
  const { g } = arena(true, 2), muzzle = { x: g.player.x + .5 + .35, y: g.player.y + .45 }; let greatGoneAt = -1, greatFar = 0, sawGreat = false;
  const at: Record<string, { t: number, d: number, gap: number }> = {}, last: Record<string, number> = {};
  flight(g, (t, list) => {
    const great = list.filter((p: any) => p.waveHalf > 0); if (great.length) { sawGreat = true; for (const w of great) greatFar = Math.max(greatFar, w.x - muzzle.x); } else if (sawGreat && greatGoneAt < 0) greatGoneAt = t;
    const crescents = list.filter((p: any) => !p.echo), mid = crescents.find((p: any) => Math.abs(p.dy) < 1e-9), outer = crescents.filter((p: any) => p !== mid);
    if (mid && outer.length === 2) for (const k of [1, 2, 3]) if (Math.abs(t - k) < 1 / 480 + 1e-9) at[k] = { t, d: mid.x - muzzle.x, gap: Math.abs(outer[0].y - outer[1].y) };
    for (const p of crescents) last[p.id] = Math.hypot(p.x - muzzle.x, p.y - muzzle.y);
  }, 4.2);
  const reach = arcWaveLife(1) * ARC_WAVE.speed / ARC_WAVE.range; // the arena's reach multiplier (1)
  assert.ok(greatGoneAt > 0 && greatGoneAt < 1, `the great waves dissipate quickly (${greatGoneAt.toFixed(2)} s, ${greatFar.toFixed(1)} tiles)`);
  assert.ok(at[1] && at[2] && at[3], 'all three crescents still fly at 1, 2 and 3 s');
  assert.ok(at[3].d > greatFar + 3, `the middle crescent flies well past the great waves' end: ${at[3].d.toFixed(1)} vs ${greatFar.toFixed(1)}`);
  assert.ok(at[2].gap > at[1].gap + 2 && at[3].gap > at[2].gap + 2, 'and keeps spreading');
  assert.equal(g.projectiles.filter((p: any) => !p.echo).length, 0, 'gone at the end of their flight');
  for (const d of Object.values(last)) assert.ok(Math.abs(d - ARC_WAVE.range * reach) < .25, `each ends at its range: ${d.toFixed(2)}`);
});

test('a wall, or Close View\'s raised ground, still stops a long-flying crescent', () => {
  const { g } = arena(true, 0); for (const t of g.map.tiles) if (t.x === 14) t.blocked = true;
  assert.equal(g.fireSecondary(T0, { x: 1, y: 0 }), true); const shots = g.projectiles.slice();
  for (let i = 0; i < 300 && g.projectiles.length; i++) g.projectiles = updateProjectiles(g.projectiles, [], g.map, 32, 1 / 60);
  for (const p of shots) assert.ok(p.dead && p.x < 14 && p.life > 1, `stopped at the wall with ${p.life.toFixed(2)} s left`);
  const { g: h } = arena(true, 0); assert.equal(h.fireSecondary(T0, { x: 1, y: 0 }), true); const more = h.projectiles.slice();
  for (let i = 0; i < 300 && h.projectiles.length; i++) h.projectiles = updateProjectiles(h.projectiles, [], h.map, 32, 1 / 60, undefined, undefined, null, undefined, undefined, undefined, undefined, null, null, undefined, (_p: any, x: number) => x > 12); // occluded is the 16th argument
  for (const p of more) assert.ok(p.dead && p.x <= 12 + 1e-9 && p.life > 1, 'stopped where the occlusion hook says');
});

test('the crescents spread apart as they fly; the great waves fly straight', () => {
  const { g } = arena(true, 2), gaps: number[] = [];
  flight(g, (t, list) => {
    const outer = list.filter((p: any) => !p.echo && Math.abs(p.dy) > 1e-9);
    if (outer.length === 2 && [.1, .4, .8, 1.2].some((k) => Math.abs(t - k) < 1e-6 + 1 / 480)) gaps.push(Math.abs(outer[0].y - outer[1].y));
    for (const w of list) if (w.waveHalf > 0) assert.ok(Math.abs(w.y - (g.player.y + .45)) < 1e-9);
  });
  assert.equal(gaps.length, 4); for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i] > gaps[i - 1] + .5, `the gap grows: ${gaps.map((q) => q.toFixed(2))}`);
});

test('without Arc Wave the Blunderbuss keeps its own cone and pace', () => {
  const { g } = arena(false, 0), weapon = rangedWeapon(g.save.equipment.secondary); g.fireSecondary(T0, { x: 1, y: 0 });
  assert.equal(g.projectiles.length, 3);
  for (const p of g.projectiles) { assert.equal(p.speed, weapon.speed); assert.ok(Math.abs(p.life - weapon.lifetime * (1 + characterStats(g.save).attackReach)) < 1e-12 && !p.arcWave); }
  const angles = g.projectiles.map((p: any) => Math.atan2(p.dy, p.dx)).sort((a: number, b: number) => a - b);
  assert.ok(Math.abs(angles[0] + weapon.spread) < 1e-9 && Math.abs(angles[2] - weapon.spread) < 1e-9);
});

test('a great wave travels straight and strikes every foe across its width once, and none beside it', () => {
  const { g } = arena(true, 2), { echoes } = echoesOf(g), w = echoes[0];
  const H = w.waveHalf, body = enemyBodyRadius(foe('x', 0, 0));
  // Foes in a line across the path 4 tiles out (centres at e.y + .45), and two just past either edge.
  const inside = [-.8, -.3, 0, .3, .8].map((o, i) => foe(`in${i}`, 11, w.y - .45 + o));
  const outside = [-(H + body + .2), H + body + .2].map((o, i) => foe(`out${i}`, 11, w.y - .45 + o));
  const enemies = [...inside, ...outside], y0 = w.y; let list = [w];
  for (let i = 0; i < 120 && list.length; i++) { list = updateProjectiles(list, enemies, g.map, 32, 1 / 60); assert.equal(w.y, y0, 'no drift to the side'); }
  for (const e of inside) assert.equal(e.hp, e.maxHp - w.damage, `${e.id} struck exactly once`);
  for (const e of outside) assert.equal(e.hp, e.maxHp, `${e.id} beside the wave is untouched`);
  assert.ok(w.x > 11 + 1, 'it flew on through them');
});

test('a foe that keeps pace with a great wave is still struck only once', () => {
  const { g } = arena(true, 1), { echoes } = echoesOf(g), w = echoes[0], e = foe('runner', 9, w.y - .45);
  let list = [w];
  for (let i = 0; i < 40 && list.length; i++) { list = updateProjectiles(list, [e], g.map, 32, 1 / 60); e.x = w.x - .5; } // drag the foe along at the wave's centre
  assert.equal(e.hp, e.maxHp - w.damage);
});

test('the crescent hit test follows the drawn shape: centre front, trailing tips', () => {
  const p: any = { x: 0, y: 0, dx: 1, dy: 0, waveHalf: .85 }, R = p.waveHalf / Math.sin(ARC_WAVE_SHAPE.span);
  assert.equal(arcWaveTouches(p, (1 - ARC_WAVE_SHAPE.back) * R, 0, 0), true, 'front of the bulge');
  assert.equal(arcWaveTouches(p, -ARC_WAVE_SHAPE.back * R + Math.sqrt(R * R - .85 * .85), .84, 0), true, 'a trailing tip');
  assert.equal(arcWaveTouches(p, 1.5, 0, 0), false, 'well ahead');
  assert.equal(arcWaveTouches(p, -1, 0, 0), false, 'well behind');
  assert.equal(arcWaveTouches(p, 0, 2, .38), false, 'beside');
  assert.equal(arcWaveTouches({ ...p, waveHalf: 0 }, 0, 0, 1), false, 'not a great wave');
});

test('without Arc Wave, Echo shots are copies of the shot exactly as before', () => {
  const { g } = arena(false, 2), { base, echoes } = echoesOf(g), mid = base.find((p: any) => Math.abs(p.dy) < 1e-9);
  assert.equal(echoes.length, 2);
  for (const [i, e] of echoes.entries()) {
    assert.ok(!('waveHalf' in e) && !e.arcWave);
    const { id, damage, echo, hits, ...rest } = e, { id: _i, damage: _d, hits: _h, ...want } = mid;
    assert.deepEqual(rest, want, `echo ${i + 1} flies as the shot`); assert.equal(echo, true);
  }
});

test('Close View\'s held release makes the same great waves', () => {
  const g: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: T0 }).game;
  g.enemies = []; g.projectiles = []; g.effects = []; g.save.closeView = true; g.save.activeWeaponSlot = 'primary';
  for (const t of g.map.tiles) { t.blocked = false; t.openAir = false; }
  g.save.lattice.passives = ['field:arc-wave']; g.save.equipment.secondary = normalizeSockets(normalizeItemUpgrade({ ...BUSS }));
  g.save.glyphs.echo = 2; socketGlyph(g.save, 'tool', 0, 'echo'); socketGlyph(g.save, 'tool', 1, 'echo');
  assert.equal(g.fireSecondary(T0, { x: 1, y: 0 }), true); assert.ok(g.pendingToolUse, 'held for its startup');
  g.releasePendingToolUse(g.pendingToolUse.releaseAt); g.projectiles = [];
  g.tickGlyphs(0, T0 + 5000);
  assert.equal(g.projectiles.length, 2); assert.ok(g.projectiles.every((p: any) => p.arcWave && p.waveHalf > .7 && Math.abs(p.dy) < 1e-9));
});

test('a great wave in flight survives a save and resumes exactly', () => {
  const run = (resume: boolean) => {
    let { s, g } = arena(true, 2);
    assert.equal(g.fireSecondary(T0, { x: 1, y: 0 }), true); g.projectiles = []; g.tickGlyphs(0, T0 + 1000);
    const enemies = () => [foe('a', 12, 9.6), foe('b', 12, 10.4), foe('c', 13, 10)];
    g.enemies = enemies();
    for (let i = 0; i < 10; i++) g.projectiles = updateProjectiles(g.projectiles, g.enemies, g.map, 32, 1 / 60);
    if (resume) {
      g.snapshotArea(false); s.session.area = 'dungeon'; // the Wayfarer stands in it (migrateSave keeps a held area's shots in flight)
      const back = migrateSave(JSON.parse(JSON.stringify(s))), rec = back.session.areas[g.areaStateId()];
      assert.ok(rec.projectiles.length === 2 && rec.projectiles.every((p: any) => p.waveHalf > 0 && p.arcWave), 'the waves are kept with their width');
      const hp = g.enemies.map((e: any) => e.hp);
      ({ g } = arena(true, 2, back)); g.enemies = enemies(); g.enemies.forEach((e: any, i: number) => { e.hp = hp[i]; });
      g.projectiles = (rec.projectiles || []).map((p: any) => ({ ...p })); // as Game.loadArea restores them
    }
    for (let i = 0; i < 60; i++) g.projectiles = updateProjectiles(g.projectiles, g.enemies, g.map, 32, 1 / 60);
    return { hp: g.enemies.map((e: any) => e.hp), shots: g.projectiles.map((p: any) => [p.x.toFixed(6), p.y.toFixed(6), p.life.toFixed(6), Object.keys(p.hits).sort().join()]) };
  };
  const straight = run(false), resumed = run(true);
  assert.deepEqual(resumed, straight);
  assert.ok(straight.hp.every((h: number) => h < 1e7), 'every foe was struck');
});

test('sixty seconds of waves fired every frame stay bounded and finite', () => {
  const { g } = arena(true, 2); g.enemies = Array.from({ length: 6 }, (_, i) => foe(`f${i}`, 14 + i, 8 + (i % 3)));
  let now = T0, max = 0;
  for (let f = 0; f < 3600; f++) {
    now += 1000 / 60; g.player.attackReadyAt = 0; g.fireSecondary(now, { x: 1, y: 0 }); g.tickGlyphs(1 / 60, now);
    g.projectiles = updateProjectiles(g.projectiles, g.enemies, g.map, 32, 1 / 60);
    // 2026-11-14: crescents have their own cap (ARC_WAVE.maxLive), the oldest retired to make room; every shot here is one.
    let live = 0; for (const p of g.projectiles) if (!p.dead) live++;
    max = Math.max(max, live); assert.ok(live <= ARC_WAVE.maxLive.dungeon, `bounded: ${live}`);
    assert.ok((g.glyphTimers || []).length <= 64, 'echo timers bounded');
  }
  for (const p of g.projectiles) assert.ok([p.x, p.y, p.life, p.damage, p.waveHalf ?? 0].every(Number.isFinite));
  for (const e of g.enemies) assert.ok(Number.isFinite(e.hp));
});

// Tim, 2026-11-14: "give the crescents their own cap" (tool-forms.ts ARC_WAVE.maxLive).
const crescent = (i: number) => ({ id: `old-${i}`, x: 3, y: 3, dx: 1, dy: 0, speed: ARC_WAVE.speed, life: 3, damage: 1, damageType: 'physical', path: 'straight', age: 0, hits: {}, pierce: 12, arcWave: true });
const plain = (i: number) => ({ id: `plain-${i}`, x: 3, y: 3, dx: 1, dy: 0, speed: 14, life: 3, damage: 1, damageType: 'physical', path: 'straight', age: 0, hits: {} });

test('crescents do not count toward the shared cap, and the shared cap still holds for other shots', () => {
  const { g } = arena(false, 0); g.takeRound = () => 'belt';
  g.projectiles = Array.from({ length: 40 }, (_, i) => crescent(i));
  assert.equal(sharedShotCount(g.projectiles), 0);
  assert.equal(g.fireSecondary(T0, { x: 1, y: 0 }), true, 'a plain Blunderbuss fires past 40 live crescents');
  const { g: h } = arena(false, 0); h.takeRound = () => 'belt'; h.projectiles = Array.from({ length: 32 }, (_, i) => plain(i));
  assert.equal(h.fireSecondary(T0, { x: 1, y: 0 }), false, 'the dungeon\'s 32 other shots still refuse a press');
  const { g: k } = arena(true, 0); k.takeRound = () => 'belt'; k.projectiles = Array.from({ length: 20 }, (_, i) => plain(i));
  assert.equal(k.fireSecondary(T0, { x: 1, y: 0 }), true); assert.equal(sharedShotCount(k.projectiles), 20, 'its crescents add nothing to the shared count');
});

test('a full crescent cap retires the oldest crescents and the press is accepted', () => {
  const { g } = arena(true, 0); g.takeRound = () => 'belt'; const cap = ARC_WAVE.maxLive.dungeon;
  g.projectiles = [plain(0), ...Array.from({ length: cap }, (_, i) => crescent(i))];
  assert.equal(g.fireSecondary(T0, { x: 1, y: 0 }), true);
  const old = g.projectiles.filter((p: any) => String(p.id).startsWith('old-'));
  assert.deepEqual(old.filter((p: any) => p.dead).map((p: any) => p.id), ['old-0', 'old-1', 'old-2'], 'the three oldest make room');
  assert.ok(old.filter((p: any) => p.dead).every((p: any) => p.retired));
  assert.ok(!g.projectiles[0].dead, 'other shots are never retired');
  assert.equal(g.projectiles.filter((p: any) => !p.dead && isArcCrescent(p)).length, cap);
  assert.equal(retireArcWaves(g.projectiles, 'overworld'), 0, 'the overworld cap is larger');
});

for (const area of ['dungeon', 'overworld']) test(`a 30 s hold at a fast cadence keeps the ${area} crescents under their cap and refuses no press`, () => {
  const { g } = arena(true, 2); g.area = area; g.takeRound = () => 'belt'; const cap = (ARC_WAVE.maxLive as any)[area];
  let now = T0, presses = 0, refused = 0, peak = 0;
  for (let f = 0; f < 1800; f++) {
    now += 1000 / 60;
    if (now >= (g.player.attackReadyAt || 0)) { presses++; if (g.fireSecondary(now, { x: 1, y: 0 })) g.player.attackReadyAt = now + 360 * .6; else refused++; } // 40% faster than the base 360 ms
    g.tickGlyphs(1 / 60, now); g.projectiles = updateProjectiles(g.projectiles, [], g.map, 32, 1 / 60);
    let live = 0; for (const p of g.projectiles) if (!p.dead && isArcCrescent(p)) live++;
    peak = Math.max(peak, live); assert.ok(live <= cap, `${live} live crescents`);
  }
  assert.ok(presses > 100); assert.equal(refused, 0, 'no press refused'); assert.ok(peak > 20, `peak ${peak}`);
});
