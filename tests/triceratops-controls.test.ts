// Tim, 2026-11-18: hold Act (not a tap) to call or dismiss the mount, and while riding a Triceratops slots B, C and D are its
// Horn Dash, Bash and Horn Shot, with Jump read as Stomp (the Silly Goose's Drill). Display and input only.
import test from "node:test";
import assert from "node:assert/strict";
import { Game, actionReadiness } from "../src/game.ts";
import { freshSave } from "../src/types.ts";
import { BOAT } from "../src/boats.ts";
import { deserializeSave, serializeSave } from "../src/save-codec.ts";
import { stableMount, startRide, ridingMount, mountById, damagePersistentMount, TRICERATOPS_ATTACKS, TRICERATOPS_CONTROLS } from "../src/beast-mounts.ts";

const flat = () => ({ width: 32, height: 32, exits: { west: 16, east: 16, north: 16, south: 16 }, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: "savannaGrass", elev: 0, blocked: false })), objects: [], enemySpawns: [] });
function world({ ride = true, variant = "good" } = {}) {
  const save = freshSave(); save.seed = "TRIKE-CONTROLS";
  const g = new Game(save, 0); g.mountSlotControls = true; g.map = flat(); g.enemies = []; g.builds = []; g.projectiles = [];
  Object.assign(g.player, { x: 10, y: 10, facing: "right", hp: 100, stamina: 100, jumping: false });
  const m = stableMount(save, "triceratops", { triceratopsDisposition: variant }).mount; if (ride) startRide(save, m.id);
  return { g, m };
}
function pad(x = 0) {
  const held = new Set(), pressed = new Set();
  return { state: { x, y: 0 }, consume: k => pressed.delete(k), held: k => held.has(k), press(k) { pressed.add(k); held.add(k); }, release(k) { held.delete(k); } };
}
function run(g, input, from, ms, step = 50) { let t = from; for (; t < from + ms; t += step) g.update(step / 1000, input, t + step); return t; }
function foe(g, id, x = 11.2, y = 10) { const e = g.createEnemyFromSpawn({ id, kind: "ashling", x, y }); e.hp = e.maxHp = 1000; g.enemies.push(e); return e; }

test("a tap of Act with nothing near does not call or dismiss the mount, and reads as before mounts", () => {
  const { g } = world({ ride: false }), input = pad();
  input.press("interact"); let t = run(g, input, 1000, 50); input.release("interact"); t = run(g, input, t, 500);
  assert.equal(ridingMount(g.save), null, "not called");
  assert.equal(g.mountHold, null);
  assert.match(g.message, /Nothing nearby responds/);
  const riding = world().g; input.press("interact"); t = run(riding, input, 1000, 100); input.release("interact"); run(riding, input, t, 300);
  assert.ok(ridingMount(riding.save), "a tap does not get you down");
});

test("holding Act for the skiff's hold length calls the mount, and again gets you down", () => {
  const { g, m } = world({ ride: false }), input = pad(), seen = new Set();
  input.press("interact");
  let t = 1000;
  for (; t < 1000 + BOAT.leaveHold * 1000 - 100; t += 50) { g.update(.05, input, t + 50); if (/Keep holding Act/.test(g.message)) seen.add(g.message); }
  assert.equal(ridingMount(g.save), null, "not before the hold completes");
  assert.deepEqual([...seen], [3, 2, 1].map(n => `Keep holding Act to call your mount… ${n}`));
  t = run(g, input, t, 200);
  assert.equal(ridingMount(g.save)?.id, m.id, "called");
  assert.match(g.message, /answers your call/);
  t = run(g, input, t, BOAT.leaveHold * 1000 + 500);
  assert.equal(ridingMount(g.save)?.id, m.id, "one hold, one call: it waits for the button to be released");
  input.release("interact"); t = run(g, input, t, 100);
  input.press("interact"); t = run(g, input, t, 300);
  assert.match(g.message, /Keep holding Act to get down… 3/);
  t = run(g, input, t, BOAT.leaveHold * 1000);
  assert.equal(ridingMount(g.save), null, "dismissed");
  assert.match(g.message, /climb down/);
  // letting go early, or a pause, cancels
  input.release("interact"); t = run(g, input, t, 100);
  input.press("interact"); t = run(g, input, t, 1000); g.setPaused(true, t); g.setPaused(false, t + 10);
  t = run(g, input, t + 10, BOAT.leaveHold * 1000 + 200);
  assert.equal(ridingMount(g.save), null, "a pause drops the hold");
});

test("the slot override applies only while riding a Triceratops, and the slots return exactly afterwards", () => {
  const { g, m } = world({ ride: false }), before = structuredClone(g.save.magicSkills), plain = actionReadiness(g, 1000);
  assert.equal(g.triceratopsControls(), null);
  for (const a of ["spell", "spell2", "spell3"]) assert.equal(plain[a].mount, undefined);
  const presses = []; const press = g.pressSlot.bind(g); g.pressSlot = (slot, ...rest) => { presses.push(slot); return press(slot, ...rest); };
  const input = pad();
  g.summonMount(m.id);
  const r = actionReadiness(g, 2000);
  assert.deepEqual(["spell", "spell2", "spell3"].map(a => [r[a].mount, r[a].name]), [["dash", "Horn Dash"], ["bash", "Bash"], ["horn", "Horn Shot"]]);
  assert.equal(r.utility.mount, undefined, "slot A is not the mount's");
  assert.equal(g.triceratopsControls().jump, "Stomp");
  presses.length = 0;
  for (const a of ["spell", "spell2", "spell3"]) { g.player.stamina = 100; g.player.dodgeUntil = 0; g.triceratopsCharge = null; input.press(a); g.update(.05, input, 3000); input.release(a); run(g, input, 3000, 1500); }
  assert.deepEqual(presses, [], "riding: no spell is cast");
  g.dismount();
  const after = actionReadiness(g, 9000);
  assert.deepEqual(after, actionReadiness(g, 9000));
  for (const a of ["spell", "spell2", "spell3"]) assert.deepEqual(after[a], plain[a], `${a} restored`);
  assert.deepEqual(g.save.magicSkills, before, "loadout and presets neither altered nor saved");
  input.press("spell2"); g.update(.05, input, 9050);
  assert.deepEqual(presses, ["b"], "on foot again: the spell slot casts as ever");
  const briar = world({ ride: false }); const s = stableMount(briar.g.save, "briarStag").mount; startRide(briar.g.save, s.id);
  assert.equal(briar.g.triceratopsControls(), null, "other mounts keep the spell slots");
  const headless = world(); headless.g.mountSlotControls = false;
  assert.equal(headless.g.triceratopsControls(), null, "only the player's control layer installs the override");
});

test("B is the Horn Dash: the accepted tap-Dodge horn contact", () => {
  const { g } = world(), e = foe(g, "front", 11), input = pad(1);
  input.press("spell"); g.update(.01, input, 1000);
  assert.ok(g.triceratopsDash, "an accepted dodge carries the horn");
  assert.equal(g.triceratopsCharge, null, "no charge on a tap");
  assert.ok(e.hp < 1000);
  assert.equal(actionReadiness(g, 1000).spell.active, true);
  const refused = world().g; refused.player.stamina = 0; foe(refused, "r");
  const p2 = pad(); p2.press("spell"); refused.update(.01, p2, 1000);
  assert.equal(refused.triceratopsDash, null, "stamina still gates it");
  assert.equal(actionReadiness(refused, 1000).spell.available, false);
});

for (const [action, kind] of [["spell2", "bash"], ["spell3", "horn"]]) test(`${action} is the ${TRICERATOPS_CONTROLS[action].name}: the held-Dodge charge released at its own tier`, () => {
  const { g } = world(), input = pad(), C = TRICERATOPS_ATTACKS.charge, B = TRICERATOPS_ATTACKS[kind];
  const blows = []; const blow = g.triceratopsBlow.bind(g); g.triceratopsBlow = (k, ...a) => { blows.push(k); return blow(k, ...a); };
  input.press(action); g.update(.01, input, 1000); input.release(action);
  const staAfterDodge = g.player.stamina;
  assert.equal(g.triceratopsCharge?.phase, "hold"); assert.equal(g.triceratopsCharge.autoTier, TRICERATOPS_CONTROLS[action].charge);
  const tierAt = kind === "bash" ? C.shortMs : C.longMs;
  let t = 1000; for (; t < 1000 + tierAt - 20; t += 20) g.update(.02, input, t + 20);
  assert.equal(g.triceratopsCharge?.phase, "hold", "the same charge time as a held Dodge");
  for (let end = t + 60; t < end; t += 20) g.update(.02, input, t + 20);
  assert.equal(g.triceratopsCharge?.phase, "windup"); assert.equal(g.triceratopsCharge.kind, kind);
  assert.ok(Math.abs(staAfterDodge - g.player.stamina - B.stamina) < 1, "the blow's own stamina");
  for (let end = t + B.windupMs + 60; t < end; t += 20) g.update(.02, input, t + 20);
  assert.equal(g.triceratopsCharge, null);
  if (kind === "bash") assert.ok(blows.includes("bash"));
  else assert.equal(g.projectiles.filter(p => p.triceratopsHorn).length, 1);
  // short of stamina: the dodge goes, the blow does not
  const poor = world().g, p2 = pad(); poor.player.stamina = 30; p2.press(action); poor.update(.01, p2, 1000); p2.release(action); poor.player.stamina = 0;
  run(poor, p2, 1000, 1200, 20);
  assert.equal(poor.projectiles.filter(p => p.triceratopsHorn).length, 0);
  assert.match(poor.message, /Not enough stamina for the charged horn attack/);
});

test("the old Dodge holds keep working while the buttons exist", () => {
  const { g } = world(), input = pad();
  input.press("dodge"); g.update(.01, input, 1000);
  let t = run(g, input, 1000, TRICERATOPS_ATTACKS.charge.shortMs + 100, 20);
  input.release("dodge"); t = run(g, input, t, 60, 20);
  assert.equal(g.triceratopsCharge?.kind, "bash");
  assert.equal(g.triceratopsCharge.autoTier, undefined);
});

test("Jump reads Stomp for the Triceratops and Drill for the Silly Goose, whose jump still drills", () => {
  const normal = world().g, silly = world({ variant: "silly" }).g;
  assert.equal(normal.triceratopsControls().jump, "Stomp");
  assert.equal(silly.triceratopsControls().jump, "Drill");
  const input = pad(); input.press("jump"); silly.update(.01, input, 1000);
  assert.equal(silly.triceratopsJump?.kind, "drill");
});

test("the Beast Hotel: holding Act with nothing near still calls and dismisses there", () => {
  let save = freshSave(); save.seed = "TRIKE-HOTEL";
  save.hometowns = { home: "4,3", towns: [{ rx: 4, ry: 3, name: "West Reach", listener: 1 }] };
  const { id } = stableMount(save, "triceratops", { triceratopsDisposition: "good" }).mount;
  startRide(save, id); damagePersistentMount(save, 1, { puncture: true, home: "4,3", location: "4,3" });
  const game = new Game(save, 0); game.mountSlotControls = true; game.rx = 4; game.ry = 3; game.loadArea("overworld");
  const door = game.map.objects.find(o => o.beastHotelDoor);
  Object.assign(game.player, { x: door.x, y: door.y }); game.rite = false;
  assert.equal(game.interact("enter", door.id).ok, true);
  assert.equal(game.map.beastHotel, true);
  mountById(save, id).recovery = null;
  const w = game.map.width || 32, spot = game.map.tiles.find(t => !t.blocked && (Object.assign(game.player, { x: t.x, y: t.y }), !game.nearestObject() && !game.wayglassNear?.()));
  assert.ok(spot, "a clear spot in the hotel"); assert.ok(w);
  const input = pad(); input.press("interact"); let t = run(game, input, 1000, 100);
  assert.equal(ridingMount(save), null);
  t = run(game, input, t, BOAT.leaveHold * 1000);
  assert.equal(ridingMount(save)?.id, id, "called in the hotel");
  input.release("interact"); t = run(game, input, t, 100); input.press("interact"); run(game, input, t, BOAT.leaveHold * 1000 + 100);
  assert.equal(ridingMount(save), null, "dismissed in the hotel");
  assert.equal(deserializeSave(serializeSave(save)).mounts.stable.length, save.mounts.stable.length, "nothing new saved");
});
