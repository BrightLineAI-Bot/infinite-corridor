// Tim (2026-11-11): the Wayfarer's compass turns with the way the Wayfarer faces, not with the Close View camera.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMPASS_FACING, closeViewCompassRotation, compassFacingStep, compassWalkHeading } from "../src/close-view.ts";

const norm = d => ((d % 360) + 360) % 360;
const frame = () => ({ yaw: NaN, turning: false, ready: false, vx: 0, vy: 0, x: NaN, y: NaN, facing: null, held: NaN });
const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const read = name => { const body = main.match(new RegExp("^function " + name + "\\([^\\n]*\\n[\\s\\S]*?^}", "m")); assert.ok(body, name); return body[0]; };

// The real main.ts functions, run against a fake game, Close View camera and HUD.
function harness() {
  const f = { ...frame(), map: null, at: NaN, target: NaN }, cam = { showing: false, body: NaN };
  const game = { area: "overworld", rx: 0, ry: 0, map: {}, player: { x: 16, y: 16, facing: "up" } }, settings = { reduceMotion: false, safeMode: false }, dial = {};
  const make = new Function("game", "settings", "compassFrame", "navCompassDial", "hudSet", "compassHeading", "closeViewShowing", "closeViewBodyFacingYaw", "closeViewCompassRotation", "compassFacingStep", "compassWalkHeading",
    read("updateCompassFrame") + "\n" + read("compassRotation") + "\n" + read("updateNavigationArrow") + "\nreturn {updateCompassFrame,compassRotation,updateNavigationArrow};");
  const api = make(game, settings, f, dial, (el, key, value) => { el[key] = value; }, () => "", () => cam.showing, () => cam.body, closeViewCompassRotation, compassFacingStep, compassWalkHeading);
  return { ...api, f, cam, game, settings, dial };
}

test("Compass rotation follows the Wayfarer's facing in Close View, not the camera yaw", () => {
  const h = harness(); h.cam.showing = true;
  const arrow = {}, north = { kind: "guidance", area: "overworld", rx: 0, ry: -1, name: "North" };
  for (const [body, expected] of [[-Math.PI / 2, 0], [0, 270], [Math.PI / 2, 180], [Math.PI, 90]]) {
    h.cam.body = body; h.f.ready = false; // a fresh frame snaps straight to the facing
    h.updateCompassFrame(1000); h.updateNavigationArrow(arrow, north);
    assert.equal(norm(Number(/rotate\((-?\d+)deg\)/.exec(arrow.transform)[1])), expected, `body yaw ${body}`);
    assert.equal(norm(Number(/rotate\((-?\d+)deg\)/.exec(h.dial.transform)[1])), expected, "the dial's N is true north in the same frame");
  }
  // The camera is never read: main.ts no longer asks the Close View camera for the compass.
  assert.doesNotMatch(read("compassRotation") + read("updateCompassFrame"), /closeViewCamera/);
  assert.doesNotMatch(read("compassRotation"), /camera/i);
});

test("A swing that turns the body for a moment keeps the compass on the way the Wayfarer was going", () => {
  const h = harness(); h.cam.showing = true; h.cam.body = 0;
  h.updateCompassFrame(0); assert.equal(h.f.yaw, 0);
  h.cam.body = NaN; // closeViewBodyFacingYaw is NaN while an attack, cast or dodge turns the body
  for (let t = 16; t < 2000; t += 16) h.updateCompassFrame(t);
  assert.equal(h.f.yaw, 0);
});

test("The standard view turns the compass with the Wayfarer's walk and keeps it when they stop", () => {
  const h = harness(); h.game.player.facing = "right";
  h.updateCompassFrame(0); assert.equal(h.f.yaw, 0, "standing still: the way the body faces");
  for (let t = 16; t <= 1600; t += 16) { h.game.player.x += .05; h.game.player.y -= .05; h.game.player.facing = t % 32 ? "up" : "right"; h.updateCompassFrame(t); } // north-east, facing flickering
  assert.ok(Math.abs(h.f.yaw + Math.PI / 4) < 1 * Math.PI / 180, `walk heading ${h.f.yaw}`);
  for (let t = 1616; t <= 3000; t += 16) h.updateCompassFrame(t); // stopped
  assert.ok(Math.abs(h.f.yaw + Math.PI / 4) < 1 * Math.PI / 180);
  h.game.player.facing = "down"; for (let t = 3016; t <= 5000; t += 16) h.updateCompassFrame(t); // turned on the spot
  assert.ok(Math.abs(h.f.yaw - Math.PI / 2) < 1e-9);
  h.game.player.x += 20; h.updateCompassFrame(5016); // a jump across the section is no walk
  assert.ok(Math.abs(h.f.yaw - Math.PI / 2) < 1e-9);
});

test("A door marker points at the door's world bearing in the facing frame", () => {
  const rad = d => d * Math.PI / 180;
  for (let facing = -180; facing < 180; facing += 15) for (let bearing = -180; bearing < 180; bearing += 30) {
    const dx = Math.cos(rad(bearing)), dy = Math.sin(rad(bearing)), screen = closeViewCompassRotation(dx, dy, rad(facing)), dial = closeViewCompassRotation(0, -1, rad(facing));
    // Screen-up is the facing; adding the facing back gives the world bearing, and the needle sits as far round from the dial's N as the door is from north.
    assert.ok(Math.abs(norm(screen + facing - bearing + 180) - 180) <= 1, `facing ${facing} bearing ${bearing}`);
    assert.ok(Math.abs(norm(screen - dial - (bearing + 90) + 180) - 180) <= 1);
  }
  // Facing the door puts its marker straight up; north-up only when facing north.
  assert.equal(norm(closeViewCompassRotation(3, 4, Math.atan2(4, 3))), 0);
  assert.equal(norm(closeViewCompassRotation(0, -1, -Math.PI / 2)), 0);
  // pointDungeonCompass and true north both go through compassRotation.
  assert.match(main, /function pointDungeonCompass[\s\S]*?compassRotation\(dx,dy\)/);
});

test("Facing jitter does not shimmer the dial; a real turn eases; reduced motion snaps", () => {
  const f = { ...frame() };
  compassFacingStep(f, 0, 0); assert.equal(f.yaw, 0);
  const small = (COMPASS_FACING.deadband - 1) * Math.PI / 180;
  for (let i = 0; i < 200; i++) compassFacingStep(f, i % 2 ? small : -small, 1 / 60);
  assert.equal(f.yaw, 0, "sway inside the deadband leaves the dial still");
  compassFacingStep(f, Math.PI / 2, 1 / 60);
  assert.ok(f.yaw > 0 && f.yaw < Math.PI / 4, `eases, ${f.yaw}`);
  for (let i = 0; i < 120; i++) compassFacingStep(f, Math.PI / 2, 1 / 60);
  assert.equal(f.yaw, Math.PI / 2); assert.equal(f.turning, false);
  compassFacingStep(f, Math.PI / 2, 5); // a long pause never jumps past the target
  assert.equal(f.yaw, Math.PI / 2);
  compassFacingStep(f, -Math.PI / 2 + .1, 1 / 60, true); assert.equal(f.yaw, -Math.PI / 2 + .1, "reduced motion snaps");
  compassFacingStep(f, -Math.PI / 2 + .1 + small, 1 / 60, true); assert.equal(f.yaw, -Math.PI / 2 + .1, "and still ignores jitter");
  // Across the ±PI seam it turns the short way.
  const g = { ...frame() }; compassFacingStep(g, Math.PI - .05, 0); compassFacingStep(g, -Math.PI + .05, 1 / 60);
  assert.ok(Math.abs(g.yaw) > Math.PI - .1, `short way, ${g.yaw}`);
  // main.ts passes the Reduce motion / safe mode setting.
  assert.match(read("updateCompassFrame"), /compassFacingStep\([^;]*settings\.reduceMotion\s*\|\|\s*settings\.safeMode/);
  const h = harness(); h.settings.reduceMotion = true; h.cam.showing = true; h.cam.body = 0; h.updateCompassFrame(0);
  h.cam.body = Math.PI / 2; h.updateCompassFrame(16); assert.equal(h.f.yaw, Math.PI / 2);
});

test("The walk tracker and facing step allocate nothing per frame", () => {
  assert.ok(Object.isFrozen(COMPASS_FACING));
  const f = { ...frame() }; const keys = Object.keys(f).join();
  for (let i = 0; i < 50; i++) { compassWalkHeading(f, i * .1, 0, "right", 1 / 60); compassFacingStep(f, f.held, 1 / 60); }
  assert.equal(Object.keys(f).join(), keys);
  assert.doesNotMatch(read("updateCompassFrame"), /\{\s*\w+\s*:|\[\s*\w/); // no object or array literals in the frame update
});
