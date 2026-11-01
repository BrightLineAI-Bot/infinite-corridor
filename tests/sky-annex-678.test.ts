// Release 678 (Tim, 2026-11-01: "in the skylands or the skyways... you only stay in skyways until you get to... the end dungeon,
// which is... a different world or a different tree top... until you get to the divine challenge"; three in the chain, rare
// named stairs, the recommendations taken): the Skylands Deep Annex.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, SKY_TREE } from '../src/game.ts';
import { SKY_ANNEX, SKY_MODES, skyAnnexStair, skyAnnexFloor, skyAnnexNext, skylandSection, skylandPlan, skylandHops, rollSkylandMode } from '../src/skylands.ts';

const SEED = 'SKYANNEX';
let found = null; const annexStair = () => { for (let r = 6; r < 80 && !found; r++) for (let x = -r; x <= r && !found; x++) for (const y of [r - Math.abs(x), Math.abs(x) - r]) { if (found || !skylandSection(SEED, x, y, 2) || !skyAnnexStair(SEED, x, y, 2)) continue; const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); if (g.map.objects.some((o) => o.kind === 'skyStair')) found = [x, y]; } return found; };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function clear(g, s, t0) { let t = t0; g.player.invulnerableUntil = 1e15; const id = g.areaId(); for (let k = 0; k < 12 && !s.consequences.dungeons[id]?.resolved; k++) { for (const e of g.enemies) { e.hp = 0; e.dead = true; g.defeatEnemy(e); } for (let i = 0; i < 60; i++) { t += 50; g.update(.05, idle, t); } } return t; }

test('the annex: rare, only on ground first seen from 672, never rolled by an ordinary climb', () => {
  let n = 0, all = 0; for (let x = -60; x <= 60; x++) for (let y = -60; y <= 60; y++) if (skylandSection(SEED, x, y, 2)) { all++; if (skyAnnexStair(SEED, x, y, 2)) n++; assert.equal(skyAnnexStair(SEED, x, y, 1), false); }
  assert.ok(n > 0 && n / all < .25, `${n} of ${all} stairs`);
  for (let r = 1; r < 300; r++) assert.ok(!SKY_ANNEX.floors.includes(rollSkylandMode(SEED, { rx: 9, ry: 9 }, r)));
  assert.equal(skyAnnexFloor(`skyland:${SEED}:1,1:mannexb:t0:r3`), 2); assert.equal(skyAnnexNext(`skyland:${SEED}:1,1:mannexb:t0:r3`), `skyland:${SEED}:1,1:mannexc:t0:r3`); assert.equal(skyAnnexNext(`skyland:${SEED}:1,1:mannexc:t0:r3`), null);
  assert.equal(skylandHops(`skyland:${SEED}:1,1:mannexa:t0:r3`), false); assert.equal(skylandHops(`skyland:${SEED}:1,1:mannexc:t0:r3`), true);
  const p = skylandPlan(`skyland:${SEED}:1,1:mannexc:t0:r3`, freshSave()); assert.ok(p.every((w) => w.boss), 'the last is a Divine Challenge');
  assert.ok(skylandPlan(`skyland:${SEED}:1,1:mannexb:t0:r3`, null).every((w) => w.traits.includes('swift') && !w.boss), 'the second skyway is fiercer');
});

test('named before you climb; three skyways up, each harder, the reward at the top, then the crown of a tree you never found', () => {
  const [x, y] = annexStair(), s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  const st = g.map.objects.find((o) => o.kind === 'skyStair'); assert.ok(st.skyAnnex && st.name.includes(SKY_ANNEX.name)); assert.equal(st.lore, SKY_ANNEX.messages.stair);
  assert.ok(s.atlas[`${x},${y}`].sites.some((q) => q.kind === 'skyStair' && q.name.includes(SKY_ANNEX.name)), 'on the Atlas');
  g.player.x = st.x; g.player.y = st.y; if (st.disc) g.skyLevel = st.elev; const r = g.interact('ascend:0', st.id); assert.ok(r.ok, r.message);
  assert.equal(skyAnnexFloor(g.areaId()), 1); assert.match(g.map.name, /Skylands Deep Annex · Skyway 1 of 3/);
  const hp1 = Math.max(...g.enemies.filter((e) => !e.dead).map((e) => e.maxHp)), clears = s.skylands.clears;
  let t = clear(g, s, 1000); assert.equal(s.skylands.clears, clears, 'no reward yet'); assert.equal(g.message, SKY_ANNEX.messages.next);
  let exit = g.map.objects.find((o) => o.kind === 'exit'); g.player.x = exit.x; g.player.y = exit.y; g.interact('exit', exit.id);
  assert.equal(g.area, 'dungeon'); assert.equal(skyAnnexFloor(g.areaId()), 2, 'up to the second skyway');
  const hp2 = Math.max(...g.enemies.filter((e) => !e.dead).map((e) => e.maxHp)); assert.ok(hp2 > hp1, `harder: ${hp1} → ${hp2}`);
  t = clear(g, s, t); exit = g.map.objects.find((o) => o.kind === 'exit'); g.player.x = exit.x; g.player.y = exit.y; g.interact('exit', exit.id);
  assert.equal(skyAnnexFloor(g.areaId()), 3); assert.match(g.map.name, /Divine Challenge, 3 of 3/);
  const seenBefore = new Set(Object.keys(s.atlas)); t = clear(g, s, t); assert.equal(s.skylands.clears, clears + 1, 'the reward at the top');
  exit = g.map.objects.find((o) => o.kind === 'exit'); g.player.x = exit.x; g.player.y = exit.y; g.interact('exit', exit.id);
  assert.equal(g.area, 'overworld'); assert.ok(!seenBefore.has(`${g.rx},${g.ry}`), 'somewhere never seen');
  const tile = g.map.tiles[Math.floor(g.player.y + .2) * 32 + Math.floor(g.player.x)];
  assert.ok(g.map.canopy && tile?.kind === 'canopyTrunk' && tile.elev === g.map.canopy.top, 'on the crown of a great tree'); assert.match(g.message, /crown of a great tree/);
  assert.ok(SKY_TREE.annexLoads <= 8, 'bounded');
});

test('an ordinary Sky Stair is as it was', () => {
  for (let x = 6; x < 60; x++) for (let y = 0; y < 20; y++) if (skylandSection(SEED, x, y, 2) && !skyAnnexStair(SEED, x, y, 2)) { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); const st = g.map.objects.find((o) => o.kind === 'skyStair'); if (!st) continue; assert.ok(!st.skyAnnex && !st.name.includes('Annex')); return; }
});
