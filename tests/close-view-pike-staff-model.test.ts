// The Cinder Pike rebuilt from the Quandrix Staff (Tim, 2026-11-14): a slim wooden spear the staff's old length, held in both
// hands across the body and thrust along the aim; the staff itself cut to the hero's height; the daggers white with a green stripe. Presentation only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { writeCloseViewHeroGear, CLOSE_VIEW_HERO_WEAPON_FORM, DAGGER_COLOURS, MODEL_FLOATS } from '../src/close-view-models.ts';
import { PRIMARY_SWINGS, SWING_POSE_KEYS } from '../src/melee-swing.ts';
import { QUANDRIX } from '../src/quandrix-staff.ts';
const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8')), raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const HERO_HEIGHT = 1.3776, OLD_STAFF = 1.79, OLD_STAFF_TRIS = 92, OLD_PIKE_TRIS = 26, RECIPE = .82; // the staff before 2026-11-14: butt 1.24 to crystal point -.55
const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function gear(profile, rightSocket = identity, leftSocket = identity) {
  const out = new Float32Array(256 * 3 * MODEL_FLOATS), n = writeCloseViewHeroGear(out, 0, { profile, rightSocket, leftSocket });
  return { out, n, tris: n / MODEL_FLOATS / 3 };
}
// Extent along the held axis (socket +X), world units.
function along(profile) { const { out, n } = gear(profile); let lo = Infinity, hi = -Infinity; for (let i = 0; i < n; i += MODEL_FLOATS) { lo = Math.min(lo, out[i]); hi = Math.max(hi, out[i]); } return hi - lo; }

test('the pike is the staff\'s old length; the staff is shortened to the hero\'s height', () => {
  const P = CLOSE_VIEW_HERO_WEAPON_FORM.pike, S = CLOSE_VIEW_HERO_WEAPON_FORM.staff;
  assert.equal(P.length, OLD_STAFF);
  assert.ok(Math.abs(along('cinder-pike') - OLD_STAFF * RECIPE) < 1e-4, `pike ${along('cinder-pike')}`);
  assert.equal(S.length, 1.68); assert.ok(Math.abs(S.butt - S.crystal[2] - S.length) < 1e-9, 'the table length is butt to crystal point');
  assert.ok(Math.abs(along('quandrix-staff') - S.length * RECIPE) < 1e-4, `staff ${along('quandrix-staff')}`);
  // Tim (2026-11-14): "about the same height as he is... not taller than him": within 2% of the hero's 1.3776-tile height.
  assert.ok(Math.abs(along('quandrix-staff') / HERO_HEIGHT - 1) < .02 && S.length < OLD_STAFF, `staff ${along('quandrix-staff')} vs hero ${HERO_HEIGHT}`);
  // Standard View: the drawn pike (shaft plus its .22 head) is the Close View pike; the drawn staff shrinks by the same share.
  assert.ok(Math.abs(PRIMARY_SWINGS['cinder-pike'].shaft + .22 - P.length * RECIPE) < .01);
  assert.ok(Math.abs(QUANDRIX.view.staff / .95 - S.length / OLD_STAFF) < .01);
});

test('the pike stays within its triangle budget', () => {
  const pike = gear('cinder-pike'), staff = gear('quandrix-staff');
  assert.ok(pike.tris > 0 && pike.tris <= OLD_PIKE_TRIS && pike.tris <= OLD_STAFF_TRIS, `${pike.tris} triangles`);
  assert.ok(staff.tris <= OLD_STAFF_TRIS);
  assert.ok(pike.out.slice(0, pike.n).every(Number.isFinite));
});

// The held shaft against the torso (a capsule from the Hips to the Neck joint of the hero sampler, radius .12 world).
const TORSO_RADIUS = .12, LEG_RADIUS = .08; // world units; the thigh's half-width
function segmentDistance(p1, q1, p2, q2) {
  const d1 = q1.map((v, i) => v - p1[i]), d2 = q2.map((v, i) => v - p2[i]), r = p1.map((v, i) => v - p2[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r), c = dot(d1, r), b = dot(d1, d2), den = a * e - b * b;
  let s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0, t = (b * s + f) / e;
  if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); }
  const P = p1.map((v, i) => v + d1[i] * s), Q = p2.map((v, i) => v + d2[i] * t);
  return { d: Math.hypot(P[0] - Q[0], P[1] - Q[1], P[2] - Q[2]), P, Q };
}
function held(extra) {
  const state = createHeroPoseState(asset), frame = createHeroFrame(asset);
  assert.ok(sampleCloseViewHero(asset, state, { nowMs: 2000, reducedMotion: false, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, action: null, alpha: 1, tint: [1, 1, 1], hitFlash: 0, heldProfile: 'cinder-pike', handProfile: 'cinder-pike', ...extra }, frame));
  const k = 1.3776 / state.referenceHeight, joint = (n) => { const g = state.global, o = n * 16 + 12; return [(g[o + 2] + state.rollCompZ) * k, (g[o] + state.rollCompX) * k, (g[o + 1] - state.minY) * k]; }; // yaw 0: source +Z is world +X
  const m = frame.rightSocket, l = Math.hypot(m[0], m[1], m[2]), axis = [m[0] / l, m[1] / l, m[2] / l], grip = [m[12], m[13], m[14]];
  // The drawn shaft: its extent along the socket axis, from the written mesh.
  const { out, n } = gear('cinder-pike', frame.rightSocket, frame.leftSocket); let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n; i += MODEL_FLOATS) { const t = (out[i] - grip[0]) * axis[0] + (out[i + 1] - grip[1]) * axis[1] + (out[i + 2] - grip[2]) * axis[2]; lo = Math.min(lo, t); hi = Math.max(hi, t); }
  const butt = grip.map((v, i) => v + axis[i] * lo), tip = grip.map((v, i) => v + axis[i] * hi);
  const front = [frame.leftSocket[12] - grip[0], frame.leftSocket[13] - grip[1], frame.leftSocket[14] - grip[2]], t = front[0] * axis[0] + front[1] * axis[1] + front[2] * axis[2];
  const offLine = Math.hypot(front[0] - axis[0] * t, front[1] - axis[1] * t, front[2] - axis[2] * t);
  // The legs: hip to knee to ankle on each side (Hips, UpperLeg, LowerLeg, Foot joints).
  const leg = Math.min(...[[28, 30], [30, 29], [29, 1], [28, 32], [32, 31], [31, 36]].map(([a, b]) => segmentDistance(butt, tip, joint(a), joint(b)).d));
  return { state, butt, tip, axis, offLine, leg, hands: [-lo / (hi - lo), (t - lo) / (hi - lo)], torso: segmentDistance(butt, tip, joint(28), joint(4)) };
}

test('the shaft is held in both hands about halfway up it and passes clear of the torso and legs at idle, walking and every thrust key pose', () => {
  const shaftRadius = CLOSE_VIEW_HERO_WEAPON_FORM.pike.shaftRadius[0] * RECIPE, poses = [['idle', {}]];
  for (const gaitPhase of [0, 1, 2, 3, 4, 5]) poses.push([`walk ${gaitPhase}`, { speed: 1.2, gaitPhase }]);
  const [draw, thrust, follow] = SWING_POSE_KEYS['cinder-pike'];
  for (const step of [1, 2, 3]) for (const [name, phase] of [['draw-back', draw], ['thrust', thrust], ['follow-through', follow], ['recovery', .7]])
    poses.push([`step ${step} ${name}`, { action: { kind: 'melee', profile: 'cinder-pike', primaryStep: step, phase, durationMs: 600, poseMs: 2000, yaw: 0 } }]);
  for (const [name, extra] of poses) {
    const h = held(extra);
    assert.ok(h.offLine < 1e-4 && h.state.primaryGripResidual < 1e-5, `${name}: both hands close on the shaft`);
    assert.ok(h.torso.d > TORSO_RADIUS + shaftRadius, `${name}: the shaft clears the torso (${h.torso.d.toFixed(3)})`);
    assert.ok(h.leg > LEG_RADIUS + shaftRadius, `${name}: the shaft clears the legs (${h.leg.toFixed(3)})`);
    // Held about halfway up the shaft (Tim, 2026-11-14): the rear hand a little below the middle, the front hand near it.
    assert.ok(h.hands[0] > .3 && h.hands[0] < .45 && h.hands[1] > .45 && h.hands[1] < .6, `${name}: hands at ${h.hands.map((v) => v.toFixed(2))} of the shaft`);
    // Never through the body sideways: carried, the shaft crosses in front of the torso's axis; thrust, it runs level past the
    // body on the rear hand's side, its butt trailing beside the hip (world -Y at yaw 0), not out of the chest.
    if (Math.abs(h.axis[0]) < .5) assert.ok(h.torso.P[0] - h.torso.Q[0] > TORSO_RADIUS, `${name}: the shaft crosses in front (${(h.torso.P[0] - h.torso.Q[0]).toFixed(3)})`);
    else if (h.axis[0] > .9) assert.ok(h.torso.Q[1] - h.torso.P[1] > TORSO_RADIUS && h.butt[1] < -TORSO_RADIUS, `${name}: the shaft runs beside the body (${(h.torso.Q[1] - h.torso.P[1]).toFixed(3)})`);
  }
  // The carry: across the chest, point up and to the side, butt low; the thrusts: the point forward along the aim.
  const idle = held({});
  assert.ok(idle.tip[2] > idle.butt[2] + .6 && Math.abs(idle.axis[0]) < .3, 'diagonal across the body');
  for (const step of [1, 2, 3]) { const h = held({ action: { kind: 'melee', profile: 'cinder-pike', primaryStep: step, phase: thrust, durationMs: 600, poseMs: 2000, yaw: 0 } });
    assert.ok(h.axis[0] > .94, `step ${step} thrusts forward`); assert.ok(h.butt[0] < h.tip[0] - 1.3, `step ${step}: the butt trails behind`); }
});

test('the Fourfold Daggers: white blades, each crossed by a green stripe halfway along it, the pair within the held-gear budget', () => {
  const left = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 2, 0, 1]), { out, n, tris } = gear('fourfold-daggers', identity, left);
  assert.ok(tris <= 96 && tris / 2 <= 48, `${tris} triangles for the pair`); assert.equal(tris % 2, 0);
  const rgb = (c) => [(c >> 16) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255], white = rgb(DAGGER_COLOURS.blade), green = rgb(DAGGER_COLOURS.stripe);
  assert.ok(white.every((v) => v > .9), 'the blade is white'); assert.ok(green[1] > green[0] + .3 && green[1] > green[2] + .2, 'the stripe is green');
  const D = CLOSE_VIEW_HERO_WEAPON_FORM.dagger.blade, length = D.tip - D.base, per = n / 2;
  const is = (i, c) => Math.abs(out[i + 6] - c[0]) < 1e-6 && Math.abs(out[i + 7] - c[1]) < 1e-6 && Math.abs(out[i + 8] - c[2]) < 1e-6;
  for (const from of [0, per]) { // each dagger: the 12-facet blade in white and the stripe round both faces in green
    let blade = 0, band = 0, lo = Infinity, hi = -Infinity, across = 0;
    for (let i = from; i < from + per; i += MODEL_FLOATS) { if (is(i, white)) blade++; if (is(i, green)) { band++; const z = out[i] / RECIPE + .79; lo = Math.min(lo, z); hi = Math.max(hi, z); across = Math.max(across, Math.abs(out[i + 2])); } }
    assert.equal(blade / 3, 12); assert.equal(band / 3, 8);
    const mid = (lo + hi) / 2 - D.base; assert.ok(Math.abs(mid / length - .5) < .05, `the stripe sits halfway along the blade (${(mid / length).toFixed(2)})`);
    assert.ok((hi - lo) / length >= .10 && (hi - lo) / length <= .15, `the stripe is 10-15% of the blade (${((hi - lo) / length).toFixed(3)})`);
    // it spans the blade's whole width there (the blade's width is socket Z, recipe Y; both sockets sit at Z 0)
    const k = ((lo + hi) / 2 - D.shoulder) / (D.tip - D.shoulder); assert.ok(across >= D.width * (1 - k) * RECIPE * .95, 'across the full width');
  }
});
