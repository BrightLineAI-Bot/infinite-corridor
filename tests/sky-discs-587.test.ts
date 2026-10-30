// Release 587 (Tim, 2026-10-30: "the skyline platforms should be round discs that you can jump on that are floating in the air"):
// a skyway first found from now on is a chain of floating discs over untouched ground; creatures walk beneath; jump disc to disc;
// walk off and you fall; the door opens only from the top disc.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { SKYLANDS, SKY_DISCS, skylandSection, buildSkyDiscs, discAt } from '../src/skylands.ts';
import { generateRegion } from '../src/world.ts';

const SEED = 'SKY';
function discSection() { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0);
  for (let r = 14; r < 80; r++) for (let x = -r; x <= r; x++) { const y = r - Math.abs(x); if (!skylandSection(SEED, x, y)) continue; s.atlas = {}; g.rx = x; g.ry = y; g.loadArea('overworld'); if (g.map.skyDiscs) { g.enemies = []; return { s, g }; } } }
const inp = (x, y, jump) => { let j = jump; return { state: { x, y }, consume: (k) => k === 'jump' && j ? (j = false, true) : false, held: () => false }; };
function driver(g) { let t = 1000; const p = g.player, foot = () => [p.x + .5, p.y + .75];
  const idle = () => { while (t <= (g.jumpUntil || 0)) { t += 50; g.update(.05, inp(0, 0, false), t); } };
  const walkTo = (fx, fy, ms) => { for (let i = 0; i < ms / 50; i++) { const [x, y] = foot(), dx = fx - x, dy = fy - y, d = Math.hypot(dx, dy); if (d < .12) break; t += 50; g.update(.05, inp(dx / d, dy / d, false), t); } };
  const jumpTo = (fx, fy) => { idle(); const [x, y] = foot(), d = Math.hypot(fx - x, fy - y); t += 50; g.update(.05, inp((fx - x) / d, (fy - y) / d, true), t); walkTo(fx, fy, 1200); idle(); };
  const walk = (dx, dy, ms) => { for (let i = 0; i < ms / 50; i++) { t += 50; g.update(.05, inp(dx, dy, false), t); } };
  return { walkTo, jumpTo, walk }; }

test('new skyways are floating discs, one level apart, over ground left as it was; the door stands on the top one', () => {
  assert.equal(SKYLANDS.version, 3); const { s, g } = discSection(), discs = g.map.skyDiscs;
  assert.ok(discs.length >= 3 && discs.length <= 5); discs.forEach((d, k) => { assert.equal(d.level, k + 1); assert.equal(d.r, SKY_DISCS.radius); });
  for (let i = 1; i < discs.length; i++) assert.ok(Math.abs(Math.hypot(discs[i].x - discs[i - 1].x, discs[i].y - discs[i - 1].y) - SKY_DISCS.spacing) < .05);
  assert.ok(!g.map.tiles.some((t) => t.skyPlatform), 'no raised tiles: the ground is untouched');
  const fresh = generateRegion(SEED, g.rx, g.ry); for (const d of discs) { const t = g.map.tiles[Math.floor(d.y) * 32 + Math.floor(d.x)]; assert.ok(!t.blocked && !(t.elev > 0)); }
  const door = g.map.objects.find((o) => o.skyway); assert.equal(door.disc, true); assert.equal(door.elev, discs.at(-1).level);
  assert.equal(s.atlas[`${g.rx},${g.ry}`].skyVersion, 3); void fresh;
  const copy = { ...g.map, skyDiscs: undefined, objects: g.map.objects.filter((o) => !o.skyway) }; assert.deepEqual(buildSkyDiscs(copy, SEED, g.rx, g.ry), discs.at(-1), 'deterministic');
});

test('jump from the ground onto the first disc and disc by disc to the top; the door opens there, not from below', () => {
  const { s, g } = discSection(), discs = g.map.skyDiscs, p = g.player, drive = driver(g); s.maxHp = 100; p.hp = 100;
  const door = g.map.objects.find((o) => o.skyway); Object.assign(p, { x: door.x, y: door.y });
  assert.equal(g.interact('ascend:0', door.id).ok, false, 'from the ground beneath it, the door does not open');
  Object.assign(p, { x: discs[0].x - .5 - 1.6, y: discs[0].y - .75 }); let prev = null;
  for (const d of discs) { if (prev) { const a = Math.atan2(d.y - prev.y, d.x - prev.x); drive.walkTo(prev.x + Math.cos(a) * .8, prev.y + Math.sin(a) * .8, 1500); }
    drive.jumpTo(d.x, d.y); assert.equal(g.skyLevel, d.level, `on disc ${d.level}`); prev = d; }
  assert.equal(p.hp, 100); const r = g.interact('ascend:0', door.id); assert.ok(r.ok, g.message); assert.ok(g.map.skyland);
});

test('walking off a disc falls: from a low disc a hard landing, from four levels fatal; walking beneath a disc stays on the ground', () => {
  const { s, g } = discSection(), discs = g.map.skyDiscs, p = g.player, drive = driver(g); s.maxHp = 100; p.hp = 100;
  Object.assign(p, { x: discs[0].x - .5, y: discs[0].y - .75 }); drive.walk(0, 0, 100); assert.equal(g.skyLevel, 0, 'standing under a disc is standing on the ground');
  g.skyLevel = 2; const d2 = discs[1]; Object.assign(p, { x: d2.x - .5, y: d2.y - .75 }); const away = Math.atan2(d2.y - discs[0].y, d2.x - discs[0].x) + Math.PI / 2;
  for (let i = 0; i < 30 && g.skyLevel; i++) drive.walk(Math.cos(away), Math.sin(away), 50);
  assert.equal(g.skyLevel, 0); assert.ok(p.hp < 100 && p.hp > 0, `a hard landing (${p.hp})`);
  assert.equal(discAt(g.map, d2.x, d2.y, { level: 2 }), d2);
  if (discs.length >= 4) { p.hp = 100; g.skyLevel = 4; const d4 = discs[3]; Object.assign(p, { x: d4.x - .5, y: d4.y - .75 }); const out = Math.atan2(d4.y - discs[2].y, d4.x - discs[2].x) + Math.PI / 2;
    for (let i = 0; i < 30 && !g.message.startsWith('Felled'); i++) drive.walk(Math.cos(out), Math.sin(out), 50); assert.match(g.message, /^Felled/); }
});
