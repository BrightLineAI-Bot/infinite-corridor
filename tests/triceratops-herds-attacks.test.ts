import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.ts";
import { freshSave } from "../src/types.ts";
import { stableMount, startRide } from "../src/beast-mounts.ts";
import { triceratopsHerdSpawns, TRICERATOPS_HERDS } from "../src/monster-pack.ts";

const flat = () => ({ tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: "savannaGrass", elev: 0, blocked: false })), objects: [], enemySpawns: [] });
const seedForHerd = () => { for (let i = 0; i < 200; i++) if (triceratopsHerdSpawns(flat(), String(i), 5, 3, 1).length) return String(i); throw Error("No herd seed"); };
const seed = seedForHerd();

test("v1 herds are deterministic, bounded groups on clear ground, without changing the map", () => {
  const map = flat(), before = structuredClone(map), herd = triceratopsHerdSpawns(map, seed, 5, 3, 1);
  assert.deepEqual(triceratopsHerdSpawns(map, seed, 5, 3, 1), herd);
  assert.deepEqual(map, before);
  assert.ok(herd.length >= 2 && herd.length <= TRICERATOPS_HERDS.max);
  assert.equal(new Set(herd.map(e => e.triceratopsDisposition)).size, 1);
  assert.equal(new Set(herd.map(e => e.id)).size, herd.length);
  for (const a of herd) for (const b of herd) if (a !== b) assert.ok(Math.hypot(a.x-b.x, a.y-b.y) >= 3);
  for (const version of [undefined, 0, 2]) assert.deepEqual(triceratopsHerdSpawns(map, seed, 5, 3, version), []);
  for (const key of ["settlement", "hamlet", "canopy", "greatBuilding", "underwater", "farDomain"]) assert.deepEqual(triceratopsHerdSpawns({ ...map, [key]: true }, seed, 5, 3, 1), []);
  for (const t of map.tiles) t.kind = "water";
  assert.deepEqual(triceratopsHerdSpawns(map, seed, 5, 3, 1), []);
});

test("first exploration pins herds while old Atlas, explored and snapshot-only ground stays unadopted", () => {
  for (const old of ["atlas", "explored", "snapshot", "new"]) {
    const save = freshSave(); save.seed = "HERD-PINS"; save.atlas ||= {};
    if (old === "atlas") save.atlas["5,3"] = { terrain: "grass", unknown: 7 };
    if (old === "explored") save.explored["5,3"] = true;
    if (old === "snapshot") save.session.areas[`overworld:5:3:g${save.worldGeneration}`] = { enemies: [], objects: {} };
    const g = new Game(save, 0); g.rx = 5; g.ry = 3; g.loadArea("overworld", false);
    assert.equal(save.atlas["5,3"].triceratopsHerdVersion, old === "new" ? 1 : undefined, old);
    if (old === "atlas") assert.equal(save.atlas["5,3"].unknown, 7);
    g.loadArea("overworld", false);
    assert.equal(save.atlas["5,3"].triceratopsHerdVersion, old === "new" ? 1 : undefined, old + " revisit");
  }
});

function mounted(beast = "triceratops") {
  const save = freshSave(); save.seed = "MOUNT-ATTACKS";
  const g = new Game(save, 0); g.map = flat(); g.enemies = []; g.builds = [];
  Object.assign(g.player, { x: 10, y: 10, facing: "right", hp: 100, stamina: 100, jumping: false });
  const m = stableMount(save, beast).mount; startRide(save, m.id);
  return g;
}
function target(g, id, x = 11, y = 10) {
  const e = g.createEnemyFromSpawn({ id, kind: "ashling", x, y }); e.hp = e.maxHp = 1000; g.enemies.push(e); return e;
}
const input = action => ({ state: { x: 1, y: 0 }, consume: k => k === action, held: () => false });

test("accepted Dodge drives a single horn contact; refused Dodge and old mounts do not", () => {
  const g = mounted(), e = target(g, "front");
  g.update(.01, input("dodge"), 1000);
  assert.ok(e.hp < 1000); const hp = e.hp;
  g.tickTriceratopsAttacks(1050); assert.equal(e.hp, hp);
  assert.deepEqual(g.triceratopsDash.hits, [e.id]);
  const refused = mounted(); target(refused, "refused"); refused.player.stamina = 0;
  refused.update(.01, input("dodge"), 1000); assert.equal(refused.triceratopsDash, null);
  const legacy = mounted("briarStag"); legacy.update(.01, input("dodge"), 1000); assert.equal(legacy.triceratopsDash, null);
});

test("mounted Jump lands exactly one shockwave; dismount and interrupted jumps cancel", () => {
  const g = mounted(), e = target(g, "landing", 10, 12);
  g.update(.01, input("jump"), 1000);
  assert.ok(g.triceratopsJump); const hp = e.hp;
  g.tickTriceratopsAttacks(1100); assert.equal(e.hp, hp);
  g.player.jumping = false;
  g.tickTriceratopsAttacks(g.jumpUntil + 1); assert.ok(e.hp < hp);
  const landed = e.hp; g.tickTriceratopsAttacks(g.jumpUntil + 2); assert.equal(e.hp, landed);
  assert.equal(g.effects.filter(e => e.kind === "plunge-slam").length, 1);
  g.jumpStart = 5000; g.jumpUntil = 6000; g.beginTriceratopsJump(5000); g.dismount();
  g.tickTriceratopsAttacks(6001); assert.equal(e.hp, landed);
});

test("horn contact honors walls, facing and friendly Triceratops", () => {
  const g = mounted();
  const rear = target(g, "rear", 8, 10), wall = target(g, "wall", 12, 10);
  g.map.tiles[10 * 32 + 11].blocked = true;
  const friend = g.createEnemyFromSpawn({ id: "friend", kind: "triceratops", triceratopsDisposition: "good", x: 10, y: 10 }); g.enemies.push(friend);
  const hp = friend.hp;
  assert.deepEqual(g.triceratopsBlow("dash", 1000, { x: 1, y: 0 }), []);
  assert.equal(rear.hp, 1000); assert.equal(wall.hp, 1000); assert.equal(friend.hp, hp);
});


test("ordinary update reaches a single mounted landing and safely retires its visual", () => {
  const g = mounted(), idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
  g.update(.01, { ...idle, consume: k => k === "jump" }, 1000);
  const until = g.jumpUntil;
  let waves = 0;
  const blow = g.triceratopsBlow.bind(g);
  g.triceratopsBlow = (kind, ...args) => { if (kind === "landing") waves++; return blow(kind, ...args); };
  for (let now = 1050; now <= until + 1000; now += 50) g.update(.05, idle, now);
  assert.equal(waves, 1);
  assert.equal(g.triceratopsJump, null);
  assert.equal(g.effects.filter(e => e.kind === "plunge-slam").length, 0);
});


test("pause resumes horn contact with the dodge clock and preserves already-hit enemies", () => {
  const g = mounted(), first = target(g, "first"), idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
  g.update(.01, input("dodge"), 1000);
  assert.ok(first.hp < 1000);
  const firstHp = first.hp, remaining = g.player.dodgeUntil - 1010, before = structuredClone(g.triceratopsDash);
  g.setPaused(true, 1010);
  g.update(.05, idle, 4010);
  assert.deepEqual(g.triceratopsDash, before);
  assert.equal(first.hp, firstHp);
  g.setPaused(false, 5010);
  assert.equal(g.triceratopsDash.until, g.player.dodgeUntil);
  assert.equal(g.triceratopsDash.until - 5010, remaining);
  const second = target(g, "second", g.player.x + 1.2, g.player.y);
  g.update(.01, idle, 5020);
  assert.equal(first.hp, firstHp);
  assert.ok(second.hp < 1000, "remaining dash can contact a new foe after resume");
  const secondHp = second.hp;
  g.update(.01, idle, 5030);
  assert.equal(second.hp, secondHp);
  g.update(.01, idle, g.player.dodgeUntil + 1);
  assert.equal(g.triceratopsDash, null);
});

test("pause resumes the same mounted leap and lands exactly one shockwave", () => {
  const g = mounted(), idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
  let waves = 0;
  const blow = g.triceratopsBlow.bind(g);
  g.triceratopsBlow = (kind, ...args) => { if (kind === "landing") waves++; return blow(kind, ...args); };
  g.update(.01, { ...idle, consume: k => k === "jump" }, 1000);
  g.update(.05, idle, 1050);
  const remaining = g.jumpUntil - 1050, before = structuredClone(g.triceratopsJump);
  g.setPaused(true, 1050);
  g.update(.05, idle, 4050);
  assert.deepEqual(g.triceratopsJump, before);
  assert.equal(waves, 0);
  g.setPaused(false, 5050);
  assert.equal(g.triceratopsJump.start, g.jumpStart);
  assert.equal(g.triceratopsJump.until, g.jumpUntil);
  assert.equal(g.triceratopsJump.until - 5050, remaining);
  const until = g.jumpUntil;
  for (let now = 5100; now <= until + 1000; now += 50) g.update(.05, idle, now);
  assert.equal(waves, 1);
  assert.equal(g.triceratopsJump, null);
  assert.equal(g.effects.filter(e => e.kind === "plunge-slam").length, 0);
});
