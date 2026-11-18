// The bizarro world (Tim, 2026-11-15): the rounded, shaded creature style kept for places where "everything is just off".
// An Abyssal Seed (rarer than any other) given to one of the Watcher's shrines opens the Askew, a seed realm of tilted,
// mirrored, wrong-coloured halls full of ordinary creatures drawn rounded; and about one new section in 400 is a bizarro pocket:
// the ground a colour off, the creatures rounded, nothing of the ground moved. Saves additive at schema 14; generation pinned.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { SEEDS, ALL_SEED_KINDS, grantSeed, seedCount, consumeSeed } from '../src/skylands.ts';
import { validActions } from '../src/interactions.ts';
import { SEED_REALMS, seedRealmId, parseSeedRealmId, generateSeedRealm, realmProblems, realmReach, seedRealmFingerprint, realmSeedRoll, validSeedRealmState, realmViscera } from '../src/seed-realms.ts';
import { drawRealmTile, drawRealmObject, drawRealmCosmos } from '../src/seed-realm-render.ts';
import { CORE_SPRITE, isCoreSpriteKind, drawsBizarro, drawBizarroCreature, drawCoreCreature } from '../src/monster-render.ts';
import { BIZARRO, bizarroHere, abyssalFindHere, bizarroSpawns, bizarroTint } from '../src/strange.ts';
import { bizarroWash } from '../src/landscape-render.ts';
import { sectionAtlasColor } from '../src/atlas-colors.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const reload = (g, now = 2000) => new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(now)))), now);
const tick = (g, n = 10, t0 = 1000) => { let t = t0; for (let i = 0; i < n; i++) { t += 50; g.update(.05, idle, t); } return t; };
function atShrine(seeds = { abyssal: 1 }, seed = 'BIZARRO-TEST') {
  const s = freshSave(); s.seed = seed; const g = new Game(s, 0);
  g.rx = 3; g.ry = 2; g.loadArea('overworld', false);
  const tomb = { id: 'watcher-tomb-shrine-3-2', kind: 'watcherTomb', name: 'Pristine Tomb of the Watcher', x: Math.floor(g.player.x), y: Math.floor(g.player.y) + 1, state: 'sealed', actions: ['touch'], where: 'shrine' };
  g.map.objects.push(tomb); for (const [k, n] of Object.entries(seeds)) grantSeed(g.save, k, n);
  return { g, tomb };
}
const enterAskew = () => { const { g, tomb } = atShrine(); const r = g.interact('realmSeed:abyssal', tomb.id); assert.ok(r.ok, r.message); return g; };
const ROUNDED = ['ashling', 'hollowMarshal', 'ashenHound', 'glassMite', 'coilStalker', 'sparkWarden', 'veilMoth', 'cinderWisp', 'voidSentinel', 'riftColossus', 'mossGrazer', 'lanternDoe'];
const canvas = () => { const calls = { n: 0, ops: [] }; const ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : (...a) => { calls.n++; }), set: (t, k, v) => { if (k === 'globalCompositeOperation') calls.ops.push(v); t[k] = v; return true; } }); return { ctx, calls }; };

test('the Abyssal Seed: a rare kind the pouch gains only once held; fresh and old pouches keep their shape', () => {
  assert.ok(SEEDS.abyssal.name && SEEDS.abyssal.text && SEEDS.rare.includes('abyssal') && !SEEDS.kinds.includes('abyssal'));
  assert.deepEqual(ALL_SEED_KINDS, [...SEEDS.kinds, 'abyssal']);
  const s = freshSave(); assert.equal(s.seedPouch.abyssal, undefined); assert.equal(s.seedPouch.used.abyssal, undefined, 'a fresh pouch is as it was');
  assert.equal(seedCount(s, 'abyssal'), 0); assert.equal(consumeSeed(s, 'abyssal'), false); assert.equal(s.seedPouch.used.abyssal, undefined);
  assert.equal(grantSeed(s, 'abyssal'), 1); assert.equal(consumeSeed(s, 'abyssal'), true); assert.equal(s.seedPouch.used.abyssal, 1); assert.equal(seedCount(s, 'abyssal'), 0);
  grantSeed(s, 'abyssal', 2); const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(m.seedPouch.abyssal, 2); assert.equal(m.seedPouch.used.abyssal, 1, 'kept through a migration');
  const odd = JSON.parse(JSON.stringify(freshSave())); odd.seedPouch.abyssal = '3.9'; odd.seedPouch.used.abyssal = -4; const o = migrateSave(odd); assert.equal(o.seedPouch.abyssal, 3); assert.equal(o.seedPouch.used.abyssal, 0);
});

test('the Askew: every realm is sound on foot, bounded, tilted, mirrored but not quite, and never holds a Tesseract', () => {
  let n = 0, tilted = 0, flawed = 0, frags = 0;
  for (let i = 1; i <= 300; i++) {
    const seed = `ASKEW-${i % 31}`, id = seedRealmId(seed, 'abyssal', 1 + (i * 7) % 40), m = generateSeedRealm(seed, id);
    assert.deepEqual(realmProblems(m), [], id); n++;
    assert.equal(m.name, SEED_REALMS.abyss.name); assert.equal(m.seedRealm.realm, 'abyss'); assert.equal(m.activeEnemyCap, SEED_REALMS.activeCap); assert.equal(m.arena, true);
    assert.ok(m.width <= 128 && m.height <= 128);
    assert.ok(m.enemySpawns.length >= 6 && m.enemySpawns.length <= SEED_REALMS.maxSpawns, `${id}: ${m.enemySpawns.length}`);
    assert.ok(m.enemySpawns.every((e) => isCoreSpriteKind(e.kind)), 'only kinds the rounded style draws');
    assert.equal(m.enemySpawns.filter((e) => e.seedRealmHeart).length, 1); assert.equal(m.enemySpawns.find((e) => e.seedRealmHeart).kind, SEED_REALMS.abyss.heart);
    assert.ok(!m.objects.some((o) => /tesseract/i.test(o.kind) || /tesseract/i.test(o.name || '')));
    if (m.tiles.some((t) => t.kind === 'abyssFloor' && Math.abs(t.tilt || 0) > .05)) tilted++;
    // the mirror: a tile and its reflection agree on whether they can be walked, except at a flaw
    const W = m.width; let off = 0; for (const t of m.tiles) { const q = m.tiles[t.y * W + (W - 1 - t.x)]; if (!!t.blocked !== !!q.blocked && !(t.flaw || q.flaw)) off++; }
    assert.equal(off, 0, `${id}: mirrored`); if (m.tiles.some((t) => t.flaw)) flawed++;
    if (m.tiles.some((t) => t.fragment)) frags++;
    // every exit, room and creature on reachable floor (the solver), and floating fragments are never floor
    assert.ok(m.tiles.filter((t) => t.fragment).every((t) => t.chasm && !realmReach(m)[t.y * W + t.x]));
  }
  assert.equal(n, 300); assert.ok(tilted >= 295, `tilted rooms in ${tilted}`); assert.ok(flawed >= 250, `a flaw in ${flawed}`); assert.ok(frags >= 290);
});

test('the Askew is pure and pinned; the husk and ship are unchanged, and their seed table only changes the seed lying in them', () => {
  const id = seedRealmId('PIN', 'abyssal', 2), a = generateSeedRealm('PIN', id), b = generateSeedRealm('PIN', id);
  assert.equal(JSON.stringify(a), JSON.stringify(b)); assert.equal(seedRealmFingerprint(a), ASKEW_PIN, 'v1 of the Askew as it first shipped');
  assert.deepEqual(['pumice', 'crimson'].map((k) => seedRealmFingerprint(generateSeedRealm('PIN', seedRealmId('PIN', k, 2)))), ['1vcxyoi', '8kl08c'], 'husk and ship v1 untouched');
  assert.deepEqual(parseSeedRealmId(id), { seed: 'PIN', v: 1, kind: 'abyssal', realm: 'abyss', n: 2 });
  for (let n = 1; n <= 80; n++) for (const k of ['pumice', 'crimson']) {
    const rid = seedRealmId('TABLE', k, n), one = generateSeedRealm('TABLE', rid), none = generateSeedRealm('TABLE', rid, {}), two = generateSeedRealm('TABLE', rid, { seedTable: 2 });
    assert.equal(JSON.stringify(none), JSON.stringify(one), 'no table recorded: table 1, byte for byte');
    const strip = (m) => JSON.stringify({ ...m, objects: m.objects.map((o) => o.kind === 'realmSeed' ? { ...o, seed: null } : o) });
    assert.equal(strip(two), strip(one), 'table 2 changes nothing but which seed lies there');
  }
});
const ASKEW_PIN = '2uft0q'; // seedRealmFingerprint of PIN's second Askew, version 1

test('seed drops: Abyssal Seeds are the rarest realm seed, only in realms opened from now on; rarer than Pumice and Crimson in the world', () => {
  const count = (table) => { const c = {}; for (let i = 0; i < 20000; i++) { const k = realmSeedRoll(`r${i}`, table); if (k) c[k] = (c[k] || 0) + 1; } return c; };
  const one = count(1), two = count(2);
  assert.equal(one.abyssal, undefined, 'table 1 (a realm opened before) never holds one');
  assert.ok(two.abyssal > 0 && two.abyssal < two.pumice / 2 && two.abyssal < two.crimson / 2, JSON.stringify(two));
  const share = two.abyssal / 20000, want = SEED_REALMS.seed.chance / 11; assert.ok(Math.abs(share - want) < .006, `${share} of realms hold one (about ${want.toFixed(4)})`);
  // in the world: per new section, an Abyssal Seed is rarer than a Pumice Seed lying in the open
  let world = 0, pocket = 0; for (let i = 0; i < 40000; i++) { if (abyssalFindHere('W', i, i * 3, false)) world++; if (abyssalFindHere('W', i, -i, true)) pocket++; }
  const pumiceRate = .02 * 2 / 9; assert.ok(world / 40000 < pumiceRate / 2, `${world / 40000}`); assert.ok(Math.abs(pocket / 40000 - BIZARRO.seeds.pocket) < .02);
  // the Askew's own seed is drawn from table 2
  let seen = 0; for (let n = 1; n <= 400; n++) { const m = generateSeedRealm('DROP', seedRealmId('DROP', 'abyssal', n)), o = m.objects.find((q) => q.kind === 'realmSeed'); if (o) { seen++; assert.ok(SEEDS[o.seed], o.seed); assert.equal(o.seed, realmSeedRoll(m.id, 2)); } }
  assert.ok(seen > 60 && seen < 180, `${seen}`);
});

test('the shrine takes an Abyssal Seed: the Askew opens, its journal line and session record; its creatures are drawn rounded', () => {
  const { g, tomb } = atShrine({ abyssal: 1 });
  assert.ok(validActions(tomb, g.save).includes('realmSeed:abyssal'));
  const ask = g.interact(null, tomb.id); assert.ok(ask.ok); assert.match(tomb.actionLabels['realmSeed:abyssal'], /Abyssal Seed \(1 held\): The Askew/);
  assert.ok(g.interact('realmSeed:abyssal', tomb.id).ok);
  assert.equal(g.area, 'dungeon'); assert.equal(g.map.name, 'The Askew'); assert.equal(g.areaId(), seedRealmId('BIZARRO-TEST', 'abyssal', 1));
  assert.equal(seedCount(g.save, 'abyssal'), 0); assert.equal(g.save.seedPouch.used.abyssal, 1);
  const st = g.save.session.seedRealm; assert.ok(validSeedRealmState(st)); assert.equal(st.seedTable, SEED_REALMS.seedTable);
  assert.ok(g.save.narrative.journal.some((j) => j.recordId === 'seed-realm:abyss' && /almost right/.test(j.text || j.body || JSON.stringify(j))));
  assert.ok(g.enemies.length >= 6 && g.enemies.every((e) => drawsBizarro(g.map, g.area, e)), 'every creature of the Askew is drawn rounded');
  assert.ok(g.enemies.find((e) => e.seedRealmHeart).boss);
  // a pumice realm opened now records the new seed table too; the husk itself is laid as before
  const { g: h, tomb: t2 } = atShrine({ pumice: 1 }); assert.ok(h.interact('realmSeed:pumice', t2.id).ok); assert.equal(h.save.session.seedRealm.seedTable, 2);
  assert.ok(h.enemies.every((e) => !drawsBizarro(h.map, h.area, e)), 'the husk keeps its own figures');
});

test('exact resume inside the Askew; the heart pays the usual rewards and its own gift once; never a Tesseract', () => {
  const g = enterAskew(), s = g.save, tess = JSON.stringify(s.tesseracts); tick(g, 6);
  const victim = g.enemies.find((e) => !e.seedRealmHeart); victim.hp = 0; victim.dead = true; g.defeatEnemy(victim);
  g.player.x += .25; const at = [g.player.x, g.player.y], fp = JSON.stringify(g.map.tiles);
  const g2 = reload(g); assert.equal(g2.area, 'dungeon'); assert.equal(g2.areaId(), g.areaId()); assert.equal(JSON.stringify(g2.map.tiles), fp, 'the same halls, laid again');
  assert.deepEqual([g2.player.x, g2.player.y], at); assert.ok(g2.enemies.find((e) => e.id === victim.id)?.dead);
  assert.equal(JSON.stringify(g2.map.objects.map((o) => [o.id, o.seed || null])), JSON.stringify(g.map.objects.map((o) => [o.id, o.seed || null])), 'the same seed lies there after a reload');
  const v0 = Number(g2.save.skylands?.viscera) || 0, dust0 = Number(g2.save.materials?.lumenDust) || 0, glyphs0 = Object.values(g2.save.glyphs).reduce((a, b) => a + (Number(b) || 0), 0);
  const heart = g2.enemies.find((e) => e.seedRealmHeart); heart.hp = 0; heart.dead = true; const got = g2.seedRealmWon(heart);
  assert.equal(got, realmViscera(3, 2)); assert.equal((Number(g2.save.skylands.viscera) || 0) - v0, got);
  assert.equal(g2.save.materials.lumenDust - dust0, SEED_REALMS.abyss.boon.lumenDust); assert.equal(Object.values(g2.save.glyphs).reduce((a, b) => a + (Number(b) || 0), 0) - glyphs0, SEED_REALMS.abyss.boon.glyph);
  assert.equal(g2.map.objects.find((o) => o.onward).state, 'open');
  assert.equal(g2.seedRealmWon(heart), null, 'once'); assert.equal(g2.save.materials.lumenDust - dust0, SEED_REALMS.abyss.boon.lumenDust);
  const g3 = reload(g2); assert.equal(g3.seedRealmWon(g3.enemies.find((e) => e.seedRealmHeart)), null); assert.equal(JSON.stringify(g3.save.tesseracts), tess, 'no Tesseract');
  // leaving: gone for good
  const on = g3.map.objects.find((o) => o.onward); g3.player.x = on.x; g3.player.y = on.y + .8; assert.ok(g3.interact('leave', on.id).ok); assert.equal(g3.area, 'overworld');
  assert.equal(JSON.stringify(g3.exportSnapshot(3000)).includes(g.areaId()), false);
});

test('the bizarro pockets: about one section in 400, never near the Refuge, pure', () => {
  let n = 0, total = 0;
  for (let rx = -250; rx < 250; rx++) for (let ry = -250; ry < 250; ry++) { total++; const here = bizarroHere('CORPUS', rx, ry); if (here) { n++; assert.ok(Math.abs(rx) + Math.abs(ry) >= BIZARRO.minDepth); } }
  const rate = n / total; assert.ok(rate > 1 / 500 && rate < 1 / 300, `${n} of ${total} (1 in ${Math.round(total / n)})`);
  assert.equal(bizarroHere('CORPUS', 0, 0), false); assert.equal(bizarroHere('CORPUS', 40, 9, 0), false, 'version 0: ground seen before');
  for (let i = 0; i < 50; i++) assert.equal(bizarroHere('P', i, 7), bizarroHere('P', i, 7));
});

// A pocket section for `seed`: the first coordinates that load as one.
function pocketGame(seed = 'POCKET') {
  for (let rx = 4; rx < 400; rx++) for (let ry = -6; ry <= 6; ry++) { if (!bizarroHere(seed, rx, ry)) continue;
    const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); if (g.map.bizarro) return g; }
  throw new Error('no pocket');
}

test('a pocket is new ground only: the ground is exactly as it would be, exits and bridges intact; old sections never change', () => {
  const g = pocketGame(), rx = g.rx, ry = g.ry, key = `${rx},${ry}`;
  assert.equal(g.save.atlas[key].bizarroVersion, BIZARRO.version); assert.equal(g.map.bizarro.v, BIZARRO.version);
  const tiles = JSON.stringify(g.map.tiles), color = g.save.atlas[key].color;
  // the same section, seen before the pockets (its Atlas record has no bizarroVersion): no pocket, the same ground
  const old = freshSave(); old.seed = g.save.seed; const before = new Game(old, 0); before.rx = rx; before.ry = ry; before.loadArea('overworld', false);
  delete before.save.atlas[key].bizarroVersion; before.rx = rx + 1; before.loadArea('overworld', false); before.rx = rx; before.loadArea('overworld', false);
  assert.equal(before.map.bizarro, undefined, 'a section seen before keeps no pocket'); assert.equal(before.save.atlas[key].bizarroVersion, undefined);
  assert.equal(JSON.stringify(before.map.tiles), tiles, 'the pocket moves nothing: every tile, exit and bridge as it was');
  assert.notEqual(before.save.atlas[key].color, color, 'only the Atlas colour is off'); assert.equal(color, bizarroTint(before.save.atlas[key].color));
  // a reload or a return keeps it a pocket
  const back = reload(g); assert.ok(back.map.bizarro); assert.equal(JSON.stringify(back.map.tiles), tiles);
  back.rx = rx + 1; back.loadArea('overworld', false); back.rx = rx; back.loadArea('overworld', false); assert.ok(back.map.bizarro);
  // a fresh journey's ordinary new sections (the corpus) are pinned but never pockets unless the roll says so
  const s = freshSave(); s.seed = 'ORDINARY'; const o = new Game(s, 0); let pockets = 0;
  for (let i = 1; i <= 24; i++) { o.rx = i; o.ry = 0; o.loadArea('overworld', false); assert.equal(o.save.atlas[`${i},0`].bizarroVersion, BIZARRO.version); if (o.map.bizarro) { pockets++; assert.ok(bizarroHere('ORDINARY', i, 0)); } }
  assert.equal(pockets, Array.from({ length: 24 }, (_, i) => bizarroHere('ORDINARY', i + 1, 0)).filter(Boolean).length);
});

test('a pocket\'s creatures are drawn rounded and stand on reachable ground; everywhere else they keep their figures', () => {
  const g = pocketGame(), mine = g.enemies.filter((e) => String(e.id).startsWith(`bizarro-${g.rx}-${g.ry}-`));
  assert.ok(mine.length >= BIZARRO.creatures.n[0] && mine.length <= BIZARRO.creatures.n[1], `${mine.length}`);
  const open = new Set(g.openSeedGround().open.map((t) => `${t.x},${t.y}`)); // computed after they stand: their own tiles are not objects, so still open
  for (const e of mine) { assert.ok(isCoreSpriteKind(e.kind)); assert.ok(drawsBizarro(g.map, 'overworld', e), e.kind); assert.ok(open.has(`${Math.round(e.x)},${Math.round(e.y)}`), `${e.kind} on reachable ground`); }
  assert.ok(g.enemies.filter((e) => isCoreSpriteKind(e.kind)).every((e) => drawsBizarro(g.map, g.area, e)));
  // an ordinary section, a crossing and the husk: never
  const s = freshSave(); s.seed = 'PLAIN'; const p = new Game(s, 0); p.rx = 2; p.ry = 1; p.loadArea('overworld', false);
  const someone = { kind: 'ashling' }; assert.equal(drawsBizarro(p.map, 'overworld', someone), false);
  assert.equal(drawsBizarro({ seedRealm: { realm: 'husk' } }, 'dungeon', someone), false); assert.equal(drawsBizarro({ bizarro: { v: 1 } }, 'dungeon', someone), false);
  assert.equal(drawsBizarro({ seedRealm: { realm: 'abyss' } }, 'dungeon', someone), true); assert.equal(drawsBizarro({ seedRealm: { realm: 'abyss' } }, 'dungeon', { kind: 'rootBrute' }), false, 'a kind the style does not cover keeps its figure');
  const ids = bizarroSpawns('X', 9, 9, [{ x: 3, y: 3 }, { x: 25, y: 25 }, { x: 4, y: 26 }, { x: 27, y: 5 }, { x: 16, y: 16 }]).map((q) => q.id); assert.deepEqual(ids, bizarroSpawns('X', 9, 9, [{ x: 3, y: 3 }, { x: 25, y: 25 }, { x: 4, y: 26 }, { x: 27, y: 5 }, { x: 16, y: 16 }]).map((q) => q.id));
});

test('an Abyssal Seed lying in a pocket is taken once, through a reload', () => {
  let g = null; for (const seed of ['POCKET', 'POCKET-2', 'POCKET-3', 'POCKET-4', 'POCKET-5', 'POCKET-6']) { const q = pocketGame(seed); if (q.map.objects.some((o) => o.seed === 'abyssal')) { g = q; break; } }
  assert.ok(g, 'some pocket holds one');
  const o = g.map.objects.find((q) => q.kind === 'seedFind' && q.seed === 'abyssal'); g.player.x = o.x; g.player.y = o.y + .8;
  assert.ok(g.interact('take', o.id).ok); assert.equal(seedCount(g.save, 'abyssal'), 1);
  const back = reload(g); assert.ok(!back.map.objects.some((q) => q.seed === 'abyssal'), 'not laid again'); assert.equal(seedCount(back.save, 'abyssal'), 1);
});

test('drawing: twelve rounded kinds, the Askew\'s tiles, objects and cosmos, and the pocket\'s one-off wash; nothing per frame', () => {
  assert.deepEqual(Object.keys(CORE_SPRITE.kinds).sort(), [...ROUNDED].sort()); assert.ok(CORE_SPRITE.max <= 64);
  const { ctx, calls } = canvas();
  for (const kind of ROUNDED) for (const state of ['walk', 'telegraph', 'attack']) assert.equal(drawBizarroCreature(ctx, { kind, scale: 1, segments: 1 }, 2, 3, 40, 'left', state, 1), true, kind);
  assert.equal(drawBizarroCreature(ctx, { kind: 'rootBrute' }, 0, 0, 40, 'right', 'walk'), false);
  const m = generateSeedRealm('DRAW', seedRealmId('DRAW', 'abyssal', 1)); let drawn = 0;
  for (const t of m.tiles) if (drawRealmTile(ctx, t, t.x, t.y, 32, m.tiles, m.width)) drawn++;
  assert.ok(drawn > m.tiles.length * .2 && drawn < m.tiles.length, `${drawn}`);
  for (const o of m.objects) drawRealmObject(ctx, { ...o }, 32, 1000);
  assert.equal(drawRealmCosmos(ctx, { map: m }, 32, { l: 0, t: 0, r: 20, b: 20 }, 1000, 10, 10), 0);
  calls.ops.length = 0; bizarroWash(ctx, 32, 32, 32); assert.deepEqual(calls.ops, ['difference']);
  const r = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(r, /if \(g\.map\.bizarro && !dungeon\) bizarroWash\(gc/, 'the wash is laid when the ground cache is built');
  assert.doesNotMatch(r, /drawCoreCreature/, 'the renderer reaches the rounded bodies only through drawBizarroCreature');
  assert.ok(calls.n > 500); assert.equal(typeof drawCoreCreature, 'function');
  assert.equal(sectionAtlasColor({ tiles: [{ kind: 'ash' }], bizarro: { v: 1 } }), bizarroTint(sectionAtlasColor({ tiles: [{ kind: 'ash' }] })));
});
