// The Listener's skinned Close View bodies (src/close-view-beast-listener.ts on the shared beast rig): the robed figure of its
// open form and the Morphling of its walled form, on one bone hierarchy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { LISTENER_RIG, MORPH_FIT, CLOAK_FIT, cloakMesh, morphMesh, listenerMesh, createListenerTrack, sampleListener, listenerBone } from '../src/close-view-beast-listener.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { tickMorphListener, MORPH_FORM } from '../src/listener-morph.ts';
import { LISTENER_FORMS } from '../src/far-array.ts';
import { createCombatant } from '../src/combat.ts';

function world(player = { x: 30, y: 20 }) {
  const open = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 44;
  const w = {
    player: { ...player, hp: 1e9, maxHp: 1e9 }, width: 64, height: 44, dt: 1 / 60, now: 0, enemies: [], fx: [], projectiles: [], playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt() { return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
    // the mirror world (game.ts mirrorWorld) the Morphling's moves use
    hurtAs() { return true; }, shock() {}, spawnWorm(owner, x, y, i, f) { const c = { id: `${owner.id}:worm:${i}`, kind: 'listener', x, y, morphWorm: true, summonedBy: owner.id, hp: 1, maxHp: 1, dead: false, ...f }; w.enemies.push(c); return c; },
  };
  return w;
}
const scaleOf = (e) => (e.scale || 1) * LISTENER_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 30, y: 20 }, dead: false, ...extra });
const listener = (walled, x = 24, y = 20) => {
  const e = createCombatant('listener', x, y, true, []);
  Object.assign(e, { id: 'listener-cv', aggro: true, hp: 1e6, maxHp: 1e6, damage: 40, farArrayBoss: 'listener', listenerForm: walled ? 'walled' : 'open', listenerPhase: walled ? 'walled' : 'open' });
  return e;
};
// a fight with one pack attack; the Morphling's own moves are held back (its next move is never due)
function fight(walled, only, seconds, each, player) {
  const w = world(player), e = listener(walled), tr = createListenerTrack(); let now = 1000;
  e.packAttacks = [only]; e.packBossAttacks = []; w.enemies.push(e);
  if (walled) { e.morphScaled = true; e.scale *= MORPH_FORM.scale; e.morph = { next: Infinity, seq: 0 }; }
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(sampleListener(tr, e, env(e, now, { target: w.player })), e, tr, now); }
}
// the Morphling's own rhythm (listener-morph.ts) with its pack kit between moves, as game.ts runs it
function morphFight(seconds, each, player = { x: 30, y: 20 }) {
  const w = world(player), e = listener(true), tr = createListenerTrack(); let now = 1000;
  e.packAttacks = [...LISTENER_FORMS.walled.attacks]; e.packBossAttacks = [...LISTENER_FORMS.walled.boss]; w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) {
    w.now += w.dt * 1000; now += w.dt * 1000;
    if (!tickMorphListener(e, w)) updatePackMonster(e, w);
    w.fx = tickPackEffects(w.fx, w); w.enemies = w.enemies.filter((q) => !q.dead);
    each(sampleListener(tr, e, env(e, now, { target: w.player })), e, tr, now);
  }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
const sane = (f, what) => { assert.ok(f && finite(f.skin), `${what}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3), what); assert.ok(f.emitA.every((a) => a >= 0 && a <= 1), what); assert.ok(f.alpha >= 0 && f.alpha <= 1, what); };

test('the meshes: both bodies bounded per tier, valid, cached; one hierarchy; registered with the right eligibility', () => {
  assert.ok(MORPH_FIT.count <= BEAST_SLOT.maxBones);
  assert.equal(CLOAK_FIT.count, MORPH_FIT.count); assert.deepEqual(CLOAK_FIT.names, MORPH_FIT.names); assert.deepEqual(Array.from(CLOAK_FIT.parent), Array.from(MORPH_FIT.parent));
  for (const [name, mesh] of [['robe', cloakMesh], ['morphling', morphMesh]]) {
    let prev = Infinity;
    for (const tier of ['full', 'balanced', 'low']) {
      const m = mesh(tier);
      assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${name} ${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev, `${name} ${tier}`); prev = m.coreTriangles;
      for (const i of m.indices) assert.ok(i < m.vertexCount);
      for (let v = 0; v < m.vertexCount; v++) { assert.ok(m.skin[v * 4] < MORPH_FIT.count && m.skin[v * 4 + 2] < MORPH_FIT.count); assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3, `${name} ${tier} normal ${v}`); }
      assert.strictEqual(mesh(tier), m);
    }
  }
  const spec = CLOSE_VIEW_BEASTS.listener; assert.equal(spec.scale, 1.25);
  const open = listener(false), walled = listener(true); walled.morphScaled = true;
  assert.ok(closeViewBeastEligible(open) && closeViewBeastEligible(walled));
  assert.strictEqual(spec.mesh('full', open), cloakMesh('full')); assert.strictEqual(spec.mesh('low', walled), morphMesh('low')); assert.strictEqual(spec.mesh('balanced'), cloakMesh('balanced'));
  // the reflections, the worms and a walled Listener before its Morphling takes shape keep their billboards
  const clone = listener(false); clone.mirrorClone = true; const worm = listener(true); worm.morphWorm = true; const banded = listener(true);
  assert.ok(!closeViewBeastEligible(clone) && !closeViewBeastEligible(worm) && !closeViewBeastEligible(banded));
});

test('the frame draws the body of the form the game shows, and follows the change at half health', () => {
  const e = listener(false), tr = createListenerTrack(); let now = 1000;
  for (let i = 0; i < 10; i++) { const f = sampleListener(tr, e, env(e, now += 16)); assert.strictEqual(f.mesh, listenerMesh('full', e)); assert.strictEqual(f.mesh, cloakMesh('full')); }
  Object.assign(e, { listenerPhase: 'walled', morphScaled: true, scale: e.scale * MORPH_FORM.scale });
  let f = sampleListener(tr, e, env(e, now += 16)); assert.strictEqual(f.mesh, morphMesh('full')); assert.strictEqual(f.mesh, CLOSE_VIEW_BEASTS.listener.mesh('full', e));
  const early = tr.pose.scl[MORPH_FIT.index.pelvis];
  for (let i = 0; i < 60; i++) f = sampleListener(tr, e, env(e, now += 16));
  assert.ok(early < .8 && tr.pose.scl[MORPH_FIT.index.pelvis] > .95, `it bursts out of the robe (${early.toFixed(2)})`);
  sane(f, 'morph');
});

test('walking on planted feet, robed and walled', () => {
  for (const walled of [false, true]) {
    const e = listener(walled), tr = createListenerTrack(); if (walled) { e.morphScaled = true; e.morph = { next: Infinity }; }
    let now = 1000, checked = 0; const last = [null, null];
    for (let i = 0; i < 220; i++) {
      e.x += 1.6 / 60; now += 1000 / 60; sampleListener(tr, e, env(e, now));
      if (i < 40) continue;
      for (let k = 0; k < 2; k++) { const p = listenerBone(tr, k ? 'hockR' : 'hockL'), planted = tr.frame.feet[k * 2] === 1;
        if (planted && last[k]) { assert.ok(Math.hypot(p[0] - last[k][0], p[1] - last[k][1]) < 3e-3, `${walled ? 'morph' : 'robe'}: the foot holds`); checked++; }
        last[k] = planted ? p : null; }
    }
    assert.ok(checked > 60, `${walled}: ${checked}`);
  }
});

test('deterministic', () => {
  for (const walled of [false, true]) {
    const run = () => { const out = []; fight(walled, walled ? 'bite' : 'clawSweep', 3, (f) => out.push(Array.from(f.skin.subarray(0, MORPH_FIT.count * 12)))); return out; };
    assert.deepEqual(run(), run());
  }
  const runM = () => { const out = []; morphFight(12, (f) => out.push(Array.from(f.skin.subarray(0, MORPH_FIT.count * 12)))); return out; };
  assert.deepEqual(runM(), runM());
});

test('every attack of both forms plays on its own clocks without a broken frame', () => {
  const kits = [[false, [...LISTENER_FORMS.open.attacks, ...LISTENER_FORMS.open.boss, ...LISTENER_FORMS.walled.attacks]], [true, [...LISTENER_FORMS.walled.attacks, ...LISTENER_FORMS.walled.boss]]];
  for (const [walled, ids] of kits) for (const id of ids) {
    const phases = new Set(); let frames = 0;
    fight(walled, id, 8, (f, e) => { sane(f, id); if (e.pack.attack === id) { phases.add(e.pack.phase); frames++; } }, { x: id === 'devourPull' || id === 'blinkStrike' ? 27.5 : 25.5, y: 20 });
    assert.ok(phases.size > 0, `${walled ? 'morph' : 'robe'} ${id}: ${[...phases]}`); assert.ok(frames > 5, id);
  }
});

test('the Morphling follows each of its own moves', () => {
  const seen = new Map(), peek = {};
  morphFight(150, (f, e, tr) => {
    sane(f, 'morph move');
    const mv = e.morph?.move; if (!mv) return;
    seen.set(mv, (seen.get(mv) || 0) + 1);
    const S = f.scale, crownTip = listenerBone(tr, 'backR2b'), chest = listenerBone(tr, 'chest');
    if (mv === 'spin' && tr.spin > .5) peek.spin = Math.max(peek.spin ?? -Infinity, Math.abs(crownTip[2] - chest[2]) < .5 * S ? 1 : 0);
    if (mv === 'jaw' && now(tr) - tr.mAt > LISTENER_RIG.morph.jawReachMs) {
      const tip = listenerBone(tr, 'jawU'), to = e.morph.jaw.to, d = Math.hypot(tip[0] - to.x, tip[1] - (to.y + .3));
      peek.jaw = Math.min(peek.jaw ?? Infinity, d); assert.ok(tr.pose.scl[MORPH_FIT.index.jawU] > .5 && tr.pose.scl[MORPH_FIT.index.clawR] < .01, 'the jaw shows');
    }
    if (mv === 'sink' && now(tr) - tr.mAt > 900) { peek.sink = Math.min(peek.sink ?? Infinity, tr.pose.scl[MORPH_FIT.index.pelvis]); peek.pool = Math.max(peek.pool ?? 0, tr.pose.scl[MORPH_FIT.index.pool]); }
    if (mv === 'lunge' && e.morph.lunge?.gone > 0) { const head = listenerBone(tr, 'head'), pel = listenerBone(tr, 'pelvis'); peek.lunge = Math.max(peek.lunge ?? -Infinity, ((head[0] - pel[0]) * Math.cos(f.yaw) + (head[1] - pel[1]) * Math.sin(f.yaw)) / Math.max(1e-6, head[2] - pel[2] + 1e-6)); }
    if (mv === 'beams' && e.morph.beams) peek.beams = Math.max(peek.beams ?? 0, Math.abs(Math.atan2(Math.sin(f.yaw - e.morph.beams.a0), Math.cos(f.yaw - e.morph.beams.a0))) < 1.5 ? 1 : 0);
    if (mv === 'orbs' && e.morph.orbs) peek.orbs = Math.max(peek.orbs ?? 0, f.phase === 'morph:orbs' ? 1 : 0);
  });
  for (const mv of MORPH_FORM.moves) assert.ok(seen.get(mv) > 5, `${mv}: ${seen.get(mv)}`);
  assert.equal(peek.spin, 1, 'the crown flung out flat as it spins');
  assert.ok(peek.jaw < 1, `the jaw arm runs out to where you stood (${peek.jaw})`);
  assert.ok(peek.sink < .3 && peek.pool > .9, `it sinks into its pool (${peek.sink}, ${peek.pool})`);
  assert.ok(peek.lunge > .6, `the dive pitches it forward (${peek.lunge})`);
  assert.equal(peek.beams, 1); assert.equal(peek.orbs, 1);
});
// the track's last sample time (its render clock)
const now = (tr) => tr.at;

test('key poses: the blade raised before the shockwave, the lance out at contact; the hidden fade', () => {
  let raised = -Infinity, stab = -Infinity;
  fight(false, 'shockwave', 4, (f, e, tr) => { if (e.pack.attack === 'shockwave' && e.pack.phase === 'windup') raised = Math.max(raised, listenerBone(tr, 'handR')[2] - listenerBone(tr, 'head')[2]); }, { x: 25.5, y: 20 });
  assert.ok(raised > 0, `the hand over the head (${raised})`);
  fight(false, 'longStab', 4, (f, e, tr) => { if (f.contact && e.pack.attack === 'longStab') { const h = listenerBone(tr, 'handR'); stab = Math.max(stab, ((h[0] - f.x) * Math.cos(f.yaw) + (h[1] - f.y) * Math.sin(f.yaw)) / f.scale); } }, { x: 25.5, y: 20 });
  assert.ok(stab > .3, `the lance thrust forward (${stab})`);
  const e = listener(false), tr = createListenerTrack(); e.untargetable = true;
  assert.ok(Math.abs(sampleListener(tr, e, env(e, 1000)).alpha - LISTENER_RIG.cloak.hiddenAlpha) < 1e-9, 'hidden behind its callers it fades');
});

test('death; reduced motion', () => {
  for (const walled of [false, true]) {
    const e = listener(walled), tr = createListenerTrack(); let now2 = 1000; if (walled) { e.morphScaled = true; e.morph = { next: Infinity }; }
    for (let i = 0; i < 20; i++) sampleListener(tr, e, env(e, now2 += 16));
    let g = tr.frame, n = 0; while (g && n < 1000) { const prev = g.mesh; g = sampleListener(tr, e, env(e, now2 += 16, { dead: true })); if (g) assert.strictEqual(g.mesh, prev); n++; }
    assert.ok(n < 1000 && g == null, 'it falls and is gone');
    const r = createListenerTrack(), e2 = listener(walled); if (walled) { e2.morphScaled = true; e2.morph = { next: Infinity }; }
    sampleListener(r, e2, env(e2, 1000, { reduce: true }));
    const a = Array.from(sampleListener(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleListener(r, e2, env(e2, 4000, { reduce: true })).skin), a);
  }
});
