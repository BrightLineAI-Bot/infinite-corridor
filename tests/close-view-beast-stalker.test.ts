// The Stalker in Close View (src/close-view-beast-stalker.ts on the shared beast rig): the cat and the ape on one skeleton, the back
// moves on the game's own state, the billboard kept for the pool, the mist, the tide and the copies, its ground work on the floor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { STALKER_RIG, STALKER_SKELETON, stalkerMesh, createStalkerTrack, sampleStalker, stalkerBone, drawStalkerCloseViewFloor } from '../src/close-view-beast-stalker.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { STALKER, updateStalker } from '../src/stalker.ts';

function field(player = { x: 30, y: 20 }) {
  const open = (x, y) => x > 0 && y > 0 && x < 64 && y < 44;
  return { player, dt: 1 / 60, now: 0, sheltered: false, door: null, playerVelocity: { x: 0, y: 0 }, width: 64, height: 44, open,
    move(e, dx, dy) { const nx = e.x + dx, ny = e.y + dy; if (!open(nx, ny)) return false; e.x = nx; e.y = ny; return !!(dx || dy); },
    elev: () => 0, hurt: () => true, ownerAlive: () => true, summon: () => 0, decoys: () => 0, displace() {}, rot() {}, fogged() {} };
}
const actor = (extra = {}) => ({ id: 'stalker-cv', stalker: true, kind: 'stalker', x: 24, y: 20, hp: 5e5, maxHp: 1e6, damage: 40, scale: STALKER.size, aggro: true, affixes: ['swift'], stalkForm: 'cat', ...extra });
const S = STALKER.size * STALKER_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: S, now, reduce: false, tier: 'full', target: { x: 30.5, y: 20.82 }, dead: false, ...extra });
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
// a pose held for a moment (the act's clock as the game left it)
function hold(flags, frames = 30, tr = createStalkerTrack()) {
  const e = actor(flags); let f = null, now = 1000;
  for (let i = 0; i < frames; i++) { now += 16; f = sampleStalker(tr, e, env(e, now)); }
  return { e, tr, f, now };
}
const bone = (tr, n) => stalkerBone(tr, n), scaleOf = (tr, n) => { const i = STALKER_SKELETON.index[n], W = tr.pose.wr; return Math.hypot(W[i * 9], W[i * 9 + 1], W[i * 9 + 2]); };

test('the mesh: forty bones at most, bounded per tier, valid normals, cached; registered for the Stalker', () => {
  assert.ok(STALKER_SKELETON.count <= BEAST_SLOT.maxBones);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = stalkerMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3, `${tier} normal ${v}`);
    // the translucent sphere and shield (channels 3 and 4) are in the optional section, never in the silhouette channels
    for (let k = 0; k < m.indices.length; k++) { const ch = m.skin[m.indices[k] * 4 + 1]; if (k < m.coreIndices) assert.ok(ch <= 2); else assert.ok(ch >= 3); }
    assert.strictEqual(stalkerMesh(tier), m);
  }
  assert.equal(CLOSE_VIEW_BEASTS.stalker.scale, 1.25);
});

test('the cat and the ape take the body; the pool, the mist, the tide, hiding and the copies keep the billboard', () => {
  assert.ok(closeViewBeastEligible(actor()));
  assert.ok(closeViewBeastEligible(actor({ stalkForm: 'ape' })));
  assert.ok(closeViewBeastEligible(actor({ stalkAct: { kind: 'tideWarn', t: .2, total: .55, aim: 0 } })));
  for (const flags of [{ stalkForm: 'pool' }, { stalkForm: 'mist' }, { stalkAct: { kind: 'tide', t: 1, total: 1 } }, { hidden: true }, { stalkerKin: true }, { stalkerDecoy: true }])
    assert.ok(!closeViewBeastEligible(actor(flags)), JSON.stringify(flags));
});

test('a long fight on the game\'s own clock: both forms, every frame finite and bounded', () => {
  const w = field(), e = actor(), tr = createStalkerTrack(), kinds = new Set(), forms = new Set(); let now = 1000, frames = 0;
  for (let i = 0; i < 60 * 90; i++) {
    w.now += w.dt * 1000; now += w.dt * 1000; updateStalker(e, w);
    if (!closeViewBeastEligible(e)) continue;
    const f = sampleStalker(tr, e, env(e, now, { target: { x: w.player.x + .5, y: w.player.y + .82 } })); frames++;
    assert.ok(f && finite(f.skin.subarray(0, STALKER_SKELETON.count * 12)), `${e.stalkForm}:${e.stalkAct?.kind}`);
    assert.ok(f.emitK.every((k) => k >= 0 && k <= 3) && f.emitA.every((k) => k >= 0 && k <= 1));
    assert.ok(f.alpha >= 0 && f.alpha <= 1);
    kinds.add(e.stalkAct?.kind); forms.add(f.form);
  }
  assert.ok(forms.has('cat') && forms.has('ape'), [...forms].join());
  assert.ok(frames > 1000 && kinds.size >= 8, [...kinds].join());
});

test('the cat: it sits up by the door, crouches before the pounce, leaps low, raises a paw before the swipe', () => {
  const stand = hold({}), sit = hold({ stalkAct: { kind: 'wait', t: 0, total: 0 } });
  assert.ok(bone(sit.tr, 'cHead')[2] > bone(stand.tr, 'cHead')[2] + .1 * S, 'the head up on the sit');
  const crouch = hold({ stalkAct: { kind: 'pounceWarn', t: .05, total: .45, to: { x: 28, y: 20 } } });
  assert.ok(bone(crouch.tr, 'cSpine')[2] < bone(stand.tr, 'cSpine')[2] - .05 * S, 'crouched');
  const leap = hold({ stalkAct: { kind: 'pounce', t: .16, total: .32, from: { x: 24, y: 20 }, to: { x: 28, y: 20 } } });
  assert.ok(leap.f.air > .1 * S && bone(leap.tr, 'cShin0R')[0] - bone(leap.tr, 'cSpine')[0] > .3 * S, 'off the ground, forelegs flung forward');
  const paw = hold({ stalkAct: { kind: 'swipeWarn', t: .02, total: .3 } });
  assert.ok(bone(paw.tr, 'cShin0R')[2] > bone(stand.tr, 'cShin0R')[2] + .15 * S, 'the near forepaw raised');
  // the hidden ape stays collapsed while the cat is out
  assert.ok(scaleOf(stand.tr, 'aHips') < .01 && scaleOf(stand.tr, 'cBody') > S * .99);
});

test('the ape: wings folded on the ground and spread in the leap; a launched fist where the game has it', () => {
  const walk = hold({ stalkForm: 'ape' }), leap = hold({ stalkForm: 'ape', stalkLift: 1.8, stalkAct: { kind: 'leap', t: .3, total: .6, from: { x: 24, y: 20 }, to: { x: 28, y: 20 } } });
  const span = (tr) => Math.hypot(bone(tr, 'aWingL')[0] - bone(tr, 'aWingR')[0], bone(tr, 'aWingL')[1] - bone(tr, 'aWingR')[1]);
  const tip = (tr, tag) => { const i = STALKER_SKELETON.index['aWing' + tag], W = tr.pose.wr, p = tr.pose.wp; return [p[i * 3] + W[i * 9 + 3] * .9 * (tag === 'R' ? 1 : -1), p[i * 3 + 1] + W[i * 9 + 4] * .9 * (tag === 'R' ? 1 : -1)]; };
  const wide = (tr) => Math.hypot(tip(tr, 'L')[0] - tip(tr, 'R')[0], tip(tr, 'L')[1] - tip(tr, 'R')[1]);
  assert.ok(wide(leap.tr) > wide(walk.tr) * 1.4, `spread ${wide(leap.tr).toFixed(2)} vs ${wide(walk.tr).toFixed(2)}`); void span;
  assert.ok(leap.f.air > 1.5, 'the game\'s lift');
  const grab = hold({ stalkForm: 'ape', stalkFists: [{ x: 28, y: 20.5, lift: .5 }], stalkAct: { kind: 'grab', t: .2, total: .55, aim: 0 } });
  const fist = bone(grab.tr, 'aFistR');
  assert.ok(Math.abs(fist[0] - 28.5) < .02 && Math.abs(fist[1] - 21.32) < .02, `the fist at the game's place (${fist[0].toFixed(2)}, ${fist[1].toFixed(2)})`);
  const raise = hold({ stalkForm: 'ape', stalkAct: { kind: 'fistWarn', t: .02, total: .35 } });
  assert.ok(bone(raise.tr, 'aFistR')[2] > bone(raise.tr, 'aHead')[2], 'the fist raised overhead');
});

test('the back moves follow the game: turret, appendage, crossed blades, sphere and shield', () => {
  const quiet = hold({});
  for (const n of ['turret', 'limb', 'bladeA', 'bladeB']) assert.ok(scaleOf(quiet.tr, n) < .01, `${n} hidden`);
  assert.ok(!quiet.f.cloud);
  const turret = hold({ stalkTurretUp: 1, stalkTurret: { move: 'orbs', t: .3, total: .6, aim: Math.PI / 2 } });
  assert.ok(scaleOf(turret.tr, 'turret') > S * .9 && turret.f.emitK[1] > .5);
  const i = STALKER_SKELETON.index.turret; assert.ok(turret.tr.pose.wr[i * 9 + 1] > turret.tr.pose.wr[i * 9] , 'the barrel on the aim');
  const X = STALKER.turret.xblade, x = hold({ stalkBlades: { phase: 'hold', t: .1, total: .15, aim: 0 } });
  for (const n of ['bladeA', 'bladeB']) { const j = STALKER_SKELETON.index[n], W = x.tr.pose.wr, p = x.tr.pose.wp, sc = scaleOf(x.tr, n);
    assert.ok(Math.abs(sc * STALKER_RIG.bladeLength - X.length) < .01, 'as long as the game\'s blade');
    const mid = p[j * 3] + W[j * 9] * STALKER_RIG.bladeLength / 2; assert.ok(Math.abs(mid - (24.5 + X.reach)) < .05, `crossed at its reach (${mid.toFixed(2)})`); }
  const sword = hold({ stalkLimb: { move: 'sword', t: .15, total: .3, aim: 0 } });
  assert.ok(scaleOf(sword.tr, 'limb') > S * .9 && scaleOf(sword.tr, 'bladeA') > 1 && scaleOf(sword.tr, 'bladeB') < .01);
  const spikes = hold({ stalkLimb: { move: 'spikes', t: .17, total: .35, aim: 0 } });
  assert.ok(Math.abs(scaleOf(spikes.tr, 'limbTip') * STALKER_RIG.spikeLength - STALKER.limb.spikes.length) < .05, 'spikes at full length mid-thrust');
  const charged = hold({ stalkCharged: 3 }); assert.ok(charged.f.cloud && charged.f.emitA[2] > 0 && Math.abs(scaleOf(charged.tr, 'fx') - STALKER.energized.aura) < 1e-6);
  const shield = hold({ stalkShield: 2, stalkShieldAim: 0 }); assert.ok(shield.f.cloud && shield.f.emitA[3] > 0);
});

test('a shift between forms: the one it leaves shrinks as the other grows', () => {
  const h = hold({}), { e, tr } = h; let now = h.now;
  e.stalkForm = 'ape'; sampleStalker(tr, e, env(e, now += 16));
  assert.ok(scaleOf(tr, 'cBody') > .2 * S && scaleOf(tr, 'aHips') < .5 * S, 'mid-shift');
  for (let i = 0; i < 30; i++) sampleStalker(tr, e, env(e, now += 16));
  assert.ok(scaleOf(tr, 'cBody') < .01 && scaleOf(tr, 'aHips') > .99 * S, 'the ape');
});

test('deterministic; death sinks into silver and ends; reduced motion holds still', () => {
  const run = () => { const w = field(), e = actor(), tr = createStalkerTrack(), out = []; let now = 1000;
    for (let i = 0; i < 600; i++) { now += 1000 / 60; updateStalker(e, w); if (closeViewBeastEligible(e)) out.push(Array.from(sampleStalker(tr, e, env(e, now)).skin.subarray(0, 120))); } return out; };
  assert.deepEqual(run(), run());
  const { e, tr } = hold({}); let g = sampleStalker(tr, e, env(e, 2000)), n = 0, now = 2000;
  while (g && n < 1000) { g = sampleStalker(tr, e, env(e, now += 16, { dead: true })); n++; }
  assert.ok(n < 1000 && g == null, 'it is gone');
  for (const form of ['cat', 'ape']) {
    const r = createStalkerTrack(), e2 = actor({ stalkForm: form }); sampleStalker(r, e2, env(e2, 1000, { reduce: true }));
    const a = Array.from(sampleStalker(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleStalker(r, e2, env(e2, 4000, { reduce: true })).skin), a, form);
  }
});

test('its marks, eruptions, chomping puddles and shots are drawn on the floor', () => {
  const calls = { fill: 0, stroke: 0 }, ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'fill' ? () => calls.fill++ : k === 'stroke' ? () => calls.stroke++ : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  const e = actor({ stalkAct: { kind: 'leapWarn', t: .2, total: .55, to: { x: 28, y: 20 } }, stalkErupts: [{ x: 28, y: 20, t: .2, total: .55, burst: .3 }, { x: 27, y: 20, t: -.1, total: .55, burst: .3 }],
    stalkChompers: [{ x: 27, y: 21, life: 5, state: 'warn', at: { x: 27, y: 21 }, t: .2 }],
    stalkShots: ['orb', 'laser', 'blast', 'boomer', 'xblade', 'sphere', 'ring'].map((kind, i) => ({ kind, x: 25 + i, y: 20, vx: 1, vy: 0, aim: 0, len: 2, radius: .3, life: 1, spin: 1 })) });
  drawStalkerCloseViewFloor(ctx, e, 32, 1000);
  assert.ok(calls.fill > 12 && calls.stroke > 3, `${calls.fill} fills, ${calls.stroke} strokes`);
  const before = calls.fill; drawStalkerCloseViewFloor(ctx, { ...e, dead: true }, 32, 1000); assert.equal(calls.fill, before, 'nothing once it is dead');
});
