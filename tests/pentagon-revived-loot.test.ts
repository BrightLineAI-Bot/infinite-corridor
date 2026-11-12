// Revived creatures in Pentagons drop loot (Tim, 2026-11-12: "yes, like other games, so we'll just have loot in our game").
// Two ways a Pentagon's creatures come back: a Waystone rest in an adventure Pentagon (v11) stands its ordinary creatures again
// as generated, and building respawns (fractured.ts RESPAWN) bring packs back onto a cleared chamber. Both now drop items as
// freshly laid creatures of their sort do, from the same ordinary drop table. One-time rewards never repeat: no boss, keeper,
// trial lord or Regent comes back, and no Aperture, flag, glyph, Echo, codex or journal entry is paid twice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, ordinaryMonsterGearDrop } from '../src/game.ts';
import { PENTAGON, pentagonPlan } from '../src/pentagon.ts';
import { RESPAWN, respawnDropRate, respawnPlace } from '../src/fractured.ts';

const input = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
const site = (seed) => { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); for (let cx = -64; cx <= 64; cx += PENTAGON.every) for (let cy = -64; cy <= 64; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) return { s, g, cx, cy }; return null; };
const start = (seed = 'TIM1') => { const { s, g, cx, cy } = site(seed); g.rx = cx; g.ry = cy + 1; g.loadArea('overworld', false); const P = pentagonPlan(seed, cx, cy, g.map.pentagon.V); return { s, g, P }; };
const go = (g, P, q) => { g.save.session.activeDungeonId = `${P.base}:f${q.n + 1}`; g.save.session.dungeonReturn = { rx: g.rx, ry: g.ry, x: 16, y: 16 }; g.loadArea('dungeon', false); };
const rest = (g, P) => { go(g, P, P.nodes.find((n) => n.id === 'w0')); const o = g.map.objects.find((x) => x.kind === 'pentWaystone'); g.player.x = o.x; g.player.y = o.y; return g.interact('rest', o.id); };
const lasting = (g) => JSON.stringify({ f: g.save.worldFlags, a: g.save.perception, gl: g.save.glyphs, ec: g.save.echoes, codex: g.save.codex, j: g.save.narrative.journal.length, t: g.save.consequences.dungeons });
const room = (g) => { g.save.inventory = []; g.save.level = 1; g.save.xp = 0; };
// Kill every living ordinary guard on the floor through the game's own defeat path; count items made and marks paid.
const killGuards = (g) => { const d0 = g.save.dropCounter, m0 = g.save.currency; let n = 0; for (const e of g.enemies) if (e.buildingGuard && !e.dead && !e.boss && !e.pentBoss) { n++; e.hp = 0; e.dead = true; g.defeatEnemy(e); } g.update(.05, input, 1000); g.snapshotArea(); return { n, drops: g.save.dropCounter - d0, marks: g.save.currency - m0 }; };
const play = (g, secs, from = 1000) => { for (let i = 0; i < secs; i++) g.tickRespawns(1, from + i * 1000); return from + secs * 1000; };

test('the drop rate of a respawned kill is a data table: every respawning building pays as a fresh creature (1), with full experience and one mark', () => {
  assert.equal(RESPAWN.reward.drop, 1); assert.equal(RESPAWN.reward.xp, 1); assert.equal(RESPAWN.reward.marks, 1);
  for (const place of ['pentagon', 'keep', 'arcology', 'cube', null, undefined, 'nowhere']) assert.equal(respawnDropRate(place), 1, String(place));
  assert.ok(RESPAWN.perVisit > 0 && RESPAWN.perVisit <= 36, 'the per-visit cap on respawned creatures stays');
  const keep = RESPAWN.reward.dropByPlace; try { RESPAWN.reward.dropByPlace = { pentagon: 7 }; assert.equal(respawnDropRate('pentagon'), 1, 'clamped to a share'); } finally { RESPAWN.reward.dropByPlace = keep; }
});

test('a Waystone rest: the ordinary creatures that stand again drop items and marks as they did the first time; bosses and Aperture are not paid again', () => {
  const { g, P } = start(), street = P.nodes.find((q) => q.area === 'street'), heart = P.nodes.find((q) => q.kind === 'heart' && q.boss);
  room(g); go(g, P, street); const first = killGuards(g); assert.ok(first.n > 0 && first.drops === first.n, `fresh: ${first.drops} of ${first.n}`);
  go(g, P, heart); for (const e of g.enemies) if (!e.dead) { e.hp = 0; e.dead = true; g.defeatEnemy(e); } g.update(.05, input, 1000); g.snapshotArea();
  const bosses = [...(g.save.consequences.dungeons[`${P.base}:f1`].pentBosses || [])]; assert.ok(bosses.includes(heart.n));
  assert.ok(rest(g, P).ok); room(g); const before = lasting(g).replace(/"advRespawn":\d+/, '');
  go(g, P, street); const again = killGuards(g);
  assert.equal(again.n, first.n, 'the same creatures stand again'); assert.equal(again.drops, again.n, 'every one drops an item, as fresh'); assert.equal(again.marks, first.marks, 'the same marks');
  assert.equal(lasting(g).replace(/"advRespawn":\d+/, ''), before, 'no Aperture, flag, glyph, Echo, codex or journal paid twice');
  go(g, P, heart); assert.ok(!g.enemies.some((e) => e.pentBoss && !e.dead), 'the keeper stays down'); assert.deepEqual(g.save.consequences.dungeons[`${P.base}:f1`].pentBosses, bosses);
  // A reload after the rest: the risen still drop.
  const back = new Game(migrateSave(JSON.parse(JSON.stringify(g.save))), 3000); back.rx = g.rx; back.ry = g.ry; room(back);
  assert.ok(rest(back, P).ok); go(back, P, street); const r = killGuards(back); assert.ok(r.n > 0 && r.drops === r.n, `after reload: ${r.drops} of ${r.n}`);
});

test('building respawns in a Pentagon chamber drop an item on every kill, from the ordinary table, and nothing lasting', () => {
  const { g, P } = start(); let found = null;
  let pack = [];
  for (const q of P.nodes) { go(g, P, q); if (g.respawnFloor() !== 'pentagon') continue; for (const e of g.enemies) Object.assign(e, { hp: 0, dead: true, rewarded: true });
    play(g, RESPAWN.every + 1); pack = g.enemies.filter((e) => e.respawned && !e.dead); if (pack.length) { found = q; break; } }
  assert.ok(found, 'a Pentagon chamber respawns a pack'); assert.equal(respawnPlace(g.areaId()), 'pentagon');
  const fresh = g.createEnemyFromSpawn({ id: 'fresh-probe', kind: pack[0].kind, x: pack[0].x, y: pack[0].y, traits: [] });
  assert.equal(ordinaryMonsterGearDrop(pack[0]), ordinaryMonsterGearDrop(fresh), 'the same drop table as a fresh creature of its sort');
  const before = lasting(g); let drops = 0, made = 0;
  for (let i = 0; i < 60; i++) { const c = g.respawnCreature({ id: `respawn-loot-${i}`, kind: pack[0].kind, x: pack[0].x, y: pack[0].y, traits: [], respawned: true }); g.enemies.push(c); room(g); const had = g.save.dropCounter, inv = g.save.inventory.length; g.defeatEnemy(Object.assign(c, { hp: 0, dead: true })); made++; if (g.save.dropCounter === had + 1) drops++; assert.ok(g.save.inventory.length >= inv); }
  assert.equal(drops, made, 'every respawned kill in a Pentagon drops');
  assert.equal(lasting(g), before, 'nothing lasting');
  // A creature already paid is never paid again.
  const c = g.enemies.find((e) => e.id === 'respawn-loot-0'), had = g.save.dropCounter; g.defeatEnemy(c); assert.equal(g.save.dropCounter, had, 'paid once');
});

test('keeps drop on every respawned kill too (Tim: normal loot everywhere)', () => {
  const s = freshSave(); s.seed = 'GREAT1'; const at = { area: 'overworld', rx: 9, ry: 2, x: 16, y: 16 }; Object.assign(s.session, at); Object.assign(s.position, at);
  const g = new Game(s, 0); g.installSystems?.(); s.session.activeDungeonId = 'building:GREAT1:9:2:keep:4:f2'; s.session.dungeonReturn = { rx: 9, ry: 2, x: 16, y: 16 }; g.loadArea('dungeon', false);
  assert.equal(g.respawnFloor(), 'keep'); let drops = 0; const n = 200;
  for (let i = 0; i < n; i++) { const c = g.respawnCreature({ id: `respawn-k-${i}`, kind: 'ashling', x: g.player.x, y: g.player.y, traits: [], respawned: true }); g.enemies.push(c); room(g); const had = g.save.dropCounter; g.defeatEnemy(Object.assign(c, { hp: 0, dead: true })); if (g.save.dropCounter !== had) drops++; }
  assert.equal(drops, n, `${drops} of ${n}`);
});
