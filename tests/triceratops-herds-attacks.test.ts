import test from "node:test";
import assert from "node:assert/strict";
import { Game, updateProjectiles } from "../src/game.ts";
import { freshSave } from "../src/types.ts";
import { stableMount, startRide, TRICERATOPS_ATTACKS, triceratopsHornPose, TRICERATOPS_HORN_POSE } from "../src/beast-mounts.ts";
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


const holdInput = (action = null, held = true) => ({ state: { x: 0, y: 0 }, consume: k => k === action, held: k => held && k === "dodge" });
function chargeGame(beast = "triceratops") {
  const g = mounted(beast); g.player.lastMoveVector = { x: 1, y: 0 };
  g.update(.01, holdInput("dodge"), 1000);
  return g;
}

test("held Dodge thresholds select no extra hit, forward bash or one horn projectile", () => {
  const C = TRICERATOPS_ATTACKS;
  for (const [ms, expected] of [[C.charge.shortMs - 1, null], [C.charge.shortMs, "bash"], [C.charge.longMs - 1, "bash"], [C.charge.longMs, "horn"]]) {
    const g = chargeGame(); g.player.stamina = 100;
    const foe = target(g, "charged", g.player.x + 1.2, g.player.y);
    const before = foe.hp;
    g.tickTriceratopsCharge(1000 + ms, false);
    if (!expected) { assert.equal(g.triceratopsCharge, null); assert.equal(foe.hp, before); continue; }
    assert.equal(g.triceratopsCharge.kind, expected);
    assert.equal(foe.hp, before, "release starts a windup, never immediate damage");
    assert.equal(g.player.stamina, 100 - C[expected].stamina);
    const contact = g.triceratopsCharge.contactAt;
    g.tickTriceratopsCharge(contact - 1, false); assert.equal(foe.hp, before); assert.equal(g.projectiles.length, 0);
    g.tickTriceratopsCharge(contact, false);
    assert.equal(g.triceratopsCharge, null);
    if (expected === "bash") { assert.ok(foe.hp < before); assert.equal(g.projectiles.length, 0); }
    else { assert.equal(foe.hp, before); assert.equal(g.projectiles.filter(p => p.triceratopsHorn).length, 1); }
    const hp = foe.hp, shots = g.projectiles.length;
    g.tickTriceratopsCharge(contact + 100, false);
    assert.equal(foe.hp, hp); assert.equal(g.projectiles.length, shots);
  }
});

test("a continuous held Dodge and release runs through actual input updates", () => {
  const g = chargeGame();
  for (let now = 1050; now <= 1950; now += 50) g.update(.05, holdInput(), now);
  assert.equal(g.projectiles.filter(p => p.triceratopsHorn).length, 0);
  g.update(.01, holdInput(null, false), 1960);
  assert.equal(g.triceratopsCharge?.phase, "windup");
  for (let now = 2010; now <= 2160; now += 50) g.update(.05, holdInput(null, false), now);
  assert.equal(g.triceratopsCharge, null);
  assert.equal(g.projectiles.filter(p => p.triceratopsHorn).length, 1);
});

test("refused and legacy Dodge cannot charge; release with insufficient stamina cannot attack", () => {
  const refused = mounted(); refused.player.stamina = 0;
  refused.update(.01, holdInput("dodge"), 1000); assert.equal(refused.triceratopsCharge, null);
  assert.equal(chargeGame("briarStag").triceratopsCharge, null);
  const g = chargeGame(); g.player.stamina = 0; g.tickTriceratopsCharge(1950, false);
  assert.equal(g.triceratopsCharge, null); assert.equal(g.projectiles.length, 0); assert.equal(g.player.stamina, 0);
});

test("pause, stun, dismount, new jump, area change and excessive hold cancel without firing", () => {
  for (const interrupt of [
    g => { g.setPaused(true, 1400); g.setPaused(false, 5000); },
    g => { g.player.stunnedUntil = 3000; },
    g => { g.dismount(); },
    g => { g.jumpStart = 1400; g.jumpUntil = 3000; },
    g => { g.loadArea("overworld", false); },
    g => { g.tickTriceratopsCharge(1001 + TRICERATOPS_ATTACKS.charge.maxMs, true); },
  ]) {
    const g = chargeGame(); interrupt(g); g.tickTriceratopsCharge(2000, false); g.tickTriceratopsCharge(2200, false);
    assert.equal(g.triceratopsCharge, null); assert.equal(g.projectiles.filter(p => p.triceratopsHorn).length, 0);
  }
  const g = chargeGame(); g.tickTriceratopsCharge(1950, false); assert.equal(g.triceratopsCharge.phase, "windup");
  g.setPaused(true, 2000); g.setPaused(false, 6000); g.tickTriceratopsCharge(6010, false);
  assert.equal(g.triceratopsCharge, null); assert.equal(g.projectiles.length, 0);
});

function chargedHorn(g) {
  g.tickTriceratopsCharge(1950, false); g.tickTriceratopsCharge(2130, false);
  const shot = g.projectiles.find(p => p.triceratopsHorn); assert.ok(shot); return shot;
}
test("horn projectile uses ordinary wall collision and bounded lifetime, skipping friendly bodies", () => {
  const g = chargeGame(), shot = chargedHorn(g), start = shot.x;
  const friend = g.createEnemyFromSpawn({ id: "friendly", kind: "triceratops", triceratopsDisposition: "good", x: g.player.x + 1, y: g.player.y });
  const foe = target(g, "far-target", g.player.x + 3, g.player.y); const hp = friend.hp;
  let shots = updateProjectiles([shot], [friend, foe], g.map, 32, .05);
  for (let i = 0; i < 12 && shots.length; i++) shots = updateProjectiles(shots, [friend, foe], g.map, 32, .05);
  assert.equal(friend.hp, hp); assert.notEqual(friend.aggro, true); assert.ok(foe.hp < 1000); assert.equal(shots.length, 0);
  assert.ok(shot.x - start <= TRICERATOPS_ATTACKS.horn.range);
  const blocked = chargeGame(), wallShot = chargedHorn(blocked), behind = target(blocked, "behind-wall", blocked.player.x + 3, blocked.player.y);
  blocked.map.tiles[Math.floor(wallShot.y) * 32 + Math.floor(wallShot.x + 1)].blocked = true;
  shots = updateProjectiles([wallShot], [behind], blocked.map, 32, .01);
  for (let i = 0; i < 12 && shots.length; i++) shots = updateProjectiles(shots, [behind], blocked.map, 32, .05);
  assert.equal(shots.length, 0); assert.equal(behind.hp, 1000);
  const empty = chargeGame(), loneShot = chargedHorn(empty);
  shots = updateProjectiles([loneShot], [], empty.map, 32, .01);
  for (let i = 0; i < 20 && shots.length; i++) shots = updateProjectiles(shots, [], empty.map, 32, .05);
  assert.equal(shots.length, 0);
});

test("projectile cap refuses release before charging stamina", () => {
  const g = chargeGame(); g.player.stamina = 100;
  g.projectiles = Array.from({ length: TRICERATOPS_ATTACKS.horn.maxProjectiles }, (_, i) => ({ id: "prior-" + i, triceratopsHorn: true }));
  g.tickTriceratopsCharge(1950, false);
  assert.equal(g.triceratopsCharge, null); assert.equal(g.player.stamina, 100);
  assert.equal(g.projectiles.length, TRICERATOPS_ATTACKS.horn.maxProjectiles);
});

test("charging does not intercept ordinary rider Attack or spell input", () => {
  const g = chargeGame();
  const foe = target(g, "rider-melee", g.player.x + 1, g.player.y);
  g.player.attackReadyAt = 0; g.player.meleeAim = { x: 1, y: 0 };
  g.update(.01, holdInput("attack"), 1400);
  assert.ok(foe.hp < 1000); assert.equal(g.triceratopsCharge?.phase, "hold");
  let spellPressed = false;
  const press = g.pressSlot.bind(g);
  g.pressSlot = (slot, action, ...rest) => { if (slot === "a" && action === "spell") spellPressed = true; return press(slot, action, ...rest); };
  g.update(.01, holdInput("spell"), 1450);
  assert.equal(spellPressed, false, "Tim, 2026-11-18: riding, slot B is the Triceratops's Horn Dash, not a spell"); assert.equal(g.triceratopsCharge?.phase, "hold");
});


test("mounted horn poses follow acceptance, freeze contact through pause and never own rider visuals", () => {
  const g = chargeGame(), mount = g.mountRide(), riderVisual = { kind: "sentinel" };
  g.player.attackVisual = riderVisual;
  const held = triceratopsHornPose(g, mount, 1600), reduced = triceratopsHornPose(g, mount, 1600, true);
  assert.equal(held.phase, "hold"); assert.ok(held.pitch > 0); assert.ok(reduced.pitch < held.pitch);
  assert.equal(g.triceratopsHornContact, null);
  g.tickTriceratopsCharge(1600, false);
  assert.equal(triceratopsHornPose(g, mount, 1650).phase, "windup");
  const contactAt = g.triceratopsCharge.contactAt;
  g.tickTriceratopsCharge(contactAt, false);
  const contact = triceratopsHornPose(g, mount, contactAt + 50);
  assert.equal(contact.phase, "bash"); assert.ok(contact.reach > 0);
  g.setPaused(true, contactAt + 50);
  assert.deepEqual(triceratopsHornPose(g, mount, contactAt + 4000), contact);
  g.setPaused(false, contactAt + 5050);
  assert.deepEqual(triceratopsHornPose(g, mount, contactAt + 5050), contact);
  assert.equal(triceratopsHornPose(g, mount, contactAt + 5000 + TRICERATOPS_HORN_POSE.recoverMs), null);
  assert.equal(g.player.attackVisual, riderVisual);
  g.dismount(); assert.equal(g.triceratopsHornContact, null);
  assert.equal(triceratopsHornPose(g, null, contactAt), null);
});

test("only a launched horn gets recoil; refusals, interruption and other mounts do not", () => {
  const g = chargeGame(); chargedHorn(g);
  assert.equal(triceratopsHornPose(g, g.mountRide(), 2130).phase, "horn");
  assert.ok(triceratopsHornPose(g, g.mountRide(), 2130).reach < 0);
  g.swimming = true; assert.equal(triceratopsHornPose(g, g.mountRide(), 2140), null);
  const blocked = chargeGame(); blocked.tickTriceratopsCharge(1950, false);
  blocked.projectiles = Array.from({length:64}, () => ({life:1})); blocked.tickTriceratopsCharge(2130, false);
  assert.equal(blocked.triceratopsHornContact, null); assert.equal(triceratopsHornPose(blocked, blocked.mountRide(), 2130), null);
  const paused = chargeGame(); paused.tickTriceratopsCharge(1950, false); paused.setPaused(true, 2000);
  assert.equal(triceratopsHornPose(paused, paused.mountRide(), 3000), null);
  const old = chargeGame("briarStag"); assert.equal(triceratopsHornPose(old, old.mountRide(), 1100), null);
  const tap = mounted(); tap.update(.01, holdInput("dodge", false), 1000);
  assert.equal(triceratopsHornPose(tap, tap.mountRide(), 1000).phase, "dash");
  assert.equal(triceratopsHornPose(tap, tap.mountRide(), tap.player.dodgeUntil), null);
});
