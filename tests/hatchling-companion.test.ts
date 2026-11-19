// The Triceratops hatchling out in the world (game.ts tickHatchling and friends): hold Act calls the chosen form or sends him to rest,
// the baby supports (buffs by kind, heals, chills) and barely hurts, the young form fights, growth comes only from fights he is out
// for, his shots stay within their bound, a death clears his buffs, and a save mid-action resumes exactly.
import test from "node:test";
import assert from "node:assert/strict";
import { Game, characterStats } from "../src/game.ts";
import { freshSave } from "../src/types.ts";
import { serializeSave, deserializeSave } from "../src/save-codec.ts";
import { MOUNT_RIDE, ridingMount, stableMount } from "../src/beast-mounts.ts";
import { HATCHLING, HATCH_BUFF_IDS } from "../src/hatchling.ts";

const flat = () => ({ width: 32, height: 32, exits: { west: 16, east: 16, north: 16, south: 16 }, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: "savannaGrass", elev: 0, blocked: false })), objects: [], enemySpawns: [] });
function world(form = "baby", xp = 0) {
  const save = freshSave(); save.seed = "HATCH-COMPANION";
  const g = new Game(save, 0); g.map = flat(); g.enemies = []; g.builds = []; g.projectiles = [];
  Object.assign(g.player, { x: 10, y: 10, facing: "right", hp: 100, stamina: 100 });
  const h = save.mounts.hatchling; Object.assign(h, { owned: true, xp, form }); Object.assign(h.quest, { state: "rescued", rx: 3, ry: 0 });
  return { g, h };
}
const pad = () => { const held = new Set(), pressed = new Set(); return { state: { x: 0, y: 0 }, consume: (k) => pressed.delete(k), held: (k) => held.has(k), press(k) { pressed.add(k); held.add(k); }, release(k) { held.delete(k); } }; };
function run(g, input, from, ms, step = 50) { let t = from; for (; t < from + ms; t += step) g.update(step / 1000, input, t + step); return t; }
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function foe(g, id, x, y, hp = 5000) { const e = g.createEnemyFromSpawn({ id, kind: "ashling", x, y }); e.hp = e.maxHp = hp; e.damage = 0; g.enemies.push(e); return e; }

test("a hold of Act calls the chosen small form out and a second hold sends him to rest; a tap does neither", () => {
  const { g, h } = world(), input = pad();
  input.press("interact"); let t = run(g, input, 1000, 50); input.release("interact"); t = run(g, input, t, 300);
  assert.equal(h.out, null, "a tap does not call him");
  input.press("interact"); t = run(g, input, t, MOUNT_RIDE.callHold * 1000 + 150); input.release("interact"); t = run(g, input, t, 100);
  assert.ok(h.out, "the hold calls him"); assert.equal(h.out.area, g.areaStateId()); assert.ok(Math.hypot(h.out.x - g.player.x, h.out.y - g.player.y) < 2.5);
  assert.equal(ridingMount(g.save), null, "the small forms are never ridden");
  input.press("interact"); t = run(g, input, t, MOUNT_RIDE.callHold * 1000 + 150); input.release("interact"); run(g, input, t, 100);
  assert.equal(h.out, null, "a second hold sends him to rest");
});

test("with the big form chosen the hold calls the rideable Triceratops he grew into, and one companion at most is out", () => {
  const { g, h } = world("baby", HATCHLING.growth.big); g.sendHatchlingOut();
  const grown = g.hatchlingFeed(0); assert.deepEqual(grown, []);
  assert.equal(g.grantBigTriceratops().id, "mount-hatchling-triceratops-v1"); assert.equal(g.grantBigTriceratops(), null, "once");
  const r = g.chooseHatchlingForm("big"); assert.equal(r.ok, true); assert.equal(h.out, null, "choosing the big form sends the small one to rest");
  const res = g.actMount(); assert.equal(res.ok, true); assert.equal(ridingMount(g.save)?.id, "mount-hatchling-triceratops-v1");
  assert.equal(h.out, null);
  g.dismount(); assert.equal(g.chooseHatchlingForm("young").ok, true); g.actMount(); assert.ok(h.out); assert.equal(ridingMount(g.save), null);
  // a caught Good Triceratops already in the stable is his big form (no second normal one)
  const s2 = world("baby", HATCHLING.growth.big); const caught = stableMount(s2.g.save, "triceratops").mount; assert.equal(s2.g.grantBigTriceratops(), null);
  s2.g.chooseHatchlingForm("big"); s2.g.actMount(); assert.equal(ridingMount(s2.g.save)?.id, caught.id);
});

test("the baby gives one buff of each kind at most (refreshing), heals a hurt Wayfarer, chills nearby foes and barely hurts them", () => {
  const { g, h } = world(); g.sendHatchlingOut(); g.player.hp = 30;
  const e = foe(g, "f1", 11, 10); let t = 1000, kinds = new Set(), healed = 0, slowed = false, frozen = false;
  const before = characterStats(g.save).damageReduction;
  for (let i = 0; i < 1200; i++) {
    const hp = g.player.hp; g.update(.05, idle, t += 50); if (g.player.hp > hp + 5) healed++;
    for (const k of Object.keys(h.buffs)) kinds.add(k);
    assert.ok(Object.keys(h.buffs).every((k) => HATCH_BUFF_IDS.includes(k)) && Object.keys(h.buffs).length <= HATCH_BUFF_IDS.length);
    if (e.glyphSlow?.factor === HATCHLING.baby.chill.slow) slowed = true; if (e.hitStun >= HATCHLING.baby.chill.freeze - .06) frozen = true;
    if (g.player.hp > 80) g.player.hp = 30;
  }
  assert.equal(kinds.size, HATCH_BUFF_IDS.length, "every kind came up"); assert.ok(healed >= 2, `healed ${healed}`); assert.ok(slowed && frozen);
  assert.ok(e.hp > e.maxHp * .9, "barely any damage"); assert.ok(e.hp < e.maxHp, "but some");
  if (h.buffs.defence > 0) assert.ok(characterStats(g.save).damageReduction >= before);
});

test("the young form picks a fight with a foe near the Wayfarer and lands his moves; his shots stay within the bound", () => {
  const { g, h } = world("young", HATCHLING.growth.young); g.sendHatchlingOut();
  const e = foe(g, "f1", 14, 10, 1e6); let t = 1000, used = new Set(), maxLive = 0;
  for (let i = 0; i < 600; i++) {
    g.update(.05, idle, t += 50); if (h.out.act) used.add(h.out.act.kind);
    const shots = new Set(g.effects.filter((fx) => fx.hatch && fx.life > 0).map((fx) => fx.hatchShot)); maxLive = Math.max(maxLive, shots.size);
    assert.ok((g.hatchVisuals?.length || 0) <= HATCHLING.maxVisuals);
  }
  assert.ok(e.hp < e.maxHp, "he hurts it"); assert.ok(used.size >= 3, `moves used: ${[...used]}`); assert.ok(maxLive <= HATCHLING.maxEffects);
  // a townsperson or a grazer is never his foe
  const { g: g2, h: h2 } = world("young", HATCHLING.growth.young); g2.sendHatchlingOut(); const grazer = foe(g2, "g", 12, 10); grazer.ambient = true; grazer.passiveBehavior = "graze";
  run(g2, idle, 1000, 4000); assert.equal(grazer.hp, grazer.maxHp); assert.equal(h2.out.target, null);
});

test("growth comes only from fights while he is out (a share of the Wayfarer's experience); a new form is announced", () => {
  const { g, h } = world();
  const kill = (id) => { const e = foe(g, id, 20, 20, 1); e.hp = 0; e.dead = true; g.defeatEnemy(e); };
  const xp0 = g.save.xp; kill("a"); const gained = g.save.xp - xp0; assert.ok(gained > 0); assert.equal(h.xp, 0, "resting: no growth");
  g.sendHatchlingOut(); const lv = g.save.level, x1 = g.save.xp; kill("b"); const got = g.save.level === lv ? g.save.xp - x1 : null;
  assert.ok(h.xp > 0); if (got != null) assert.equal(h.xp, Math.floor(got * HATCHLING.growth.share));
  h.xp = HATCHLING.growth.young - 1; g.questNotices = []; kill("c"); assert.ok(h.xp >= HATCHLING.growth.young);
  assert.ok(g.questNotices.some((n) => /YOUNG FORM UNLOCKED/.test(n.title)));
});

test("a death ends his buffs and sends him to rest", () => {
  const { g, h } = world(); g.sendHatchlingOut(); h.buffs = { damage: 20, stamina: 10 };
  g.player.hp = 0; run(g, idle, 1000, 200);
  assert.deepEqual(Object.keys(h.buffs).filter((k) => HATCH_BUFF_IDS.includes(k)), []); assert.equal(h.out, null);
});

test("a save mid-action resumes exactly: position, timers, cooldowns, the act and the buffs", () => {
  for (const form of ["baby", "young"]) {
    const save = freshSave(); save.seed = "HATCH-RESUME"; const g = new Game(save, 0); const h = save.mounts.hatchling;
    Object.assign(h, { owned: true, xp: HATCHLING.growth.young, form }); Object.assign(h.quest, { state: "rescued", rx: 3, ry: 0 });
    g.sendHatchlingOut(); let t = 1000; for (let i = 0; i < 37; i++) g.update(.05, idle, t += 50);
    if (form === "young") { h.out.act = { kind: "charge", left: .3, n: 0, x: 0, y: 1, target: null, phase: "go" }; h.out.cd = { charge: 4, bite: 1 }; }
    h.buffs = { damage: 12.5, defence: 3 };
    g.exportSnapshot(t);
    const copy = deserializeSave(serializeSave(g.save)), loaded = new Game(copy, t);
    assert.deepEqual(copy.mounts.hatchling, JSON.parse(JSON.stringify(g.save.mounts.hatchling)), `${form}: the record round-trips`);
    for (let i = 0; i < 20; i++) { t += 50; g.update(.05, idle, t); loaded.update(.05, idle, t); }
    const a = g.save.mounts.hatchling, b = loaded.save.mounts.hatchling;
    assert.ok(Math.abs(a.out.x - b.out.x) < 1e-9 && Math.abs(a.out.y - b.out.y) < 1e-9, `${form}: the same place`);
    assert.deepEqual(b.out.timers, a.out.timers); assert.deepEqual(b.out.cd, a.out.cd); assert.deepEqual(b.out.act, a.out.act); assert.deepEqual(b.buffs, a.buffs);
  }
});

test("timers run on play time only: a pause holds them", () => {
  const { g, h } = world(); g.sendHatchlingOut(); h.buffs = { damage: 10 }; const T = { ...h.out.timers };
  g.paused = true; g.pauseStarted = 1000; for (let i = 0; i < 20; i++) { if (g.paused) continue; g.update(.05, idle, 1000 + i * 50); }
  assert.deepEqual(h.out.timers, T); assert.equal(h.buffs.damage, 10);
});
