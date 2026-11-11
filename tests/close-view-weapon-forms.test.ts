import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { CLOSE_VIEW_HERO_WEAPON_FORM, HERO_EQUIPMENT_MAX_TRIANGLES, HERO_KIT_MAX_TRIANGLES, HERO_DRINK_VIAL_TRIANGLES, MODEL_FLOATS, MODEL_MAX_VERTICES,
  modelTriangleCount, writeCloseViewHeroGear, writeCloseViewHeroEquipment, writeCloseViewModel, closeViewHeldMuzzlePoint } from '../src/close-view-models.ts';
import { CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES } from '../src/close-view-player-forms.ts';
import { closeViewHeldScale, closeViewHandRoles } from '../src/close-view-player-presentation.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { TOOL_ACTION_TIMING, TOOL_USE_STARTUP_MS } from '../src/action-motion.ts';
import { CLOSE_VIEW_ACTOR_LOOK } from '../src/close-view-gl.ts';

// Close View weapon visual pass (Tim, 2026-11-11): presentation only. Budgets, exact grips,
// hilt proportion against the imported Wayfarer's measured fist, and bake determinism.
const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8'));
const raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const WEAPONS = ['melee', 'salvage-blade', 'verge-cleaver', 'blunderbuss', 'rift-bombard'];
const rgb = (c: number) => [(c >> 16) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
const isColor = (v: ArrayLike<number>, i: number, c: number) => rgb(c).every((x, k) => Math.abs(v[i + 6 + k] - x) < 1e-4);
function gear(profile: string, socket: Float32Array = identity, other: Float32Array = identity) {
  const out = new Float32Array(160 * 3 * MODEL_FLOATS), roles = closeViewHandRoles(profile);
  const end = writeCloseViewHeroGear(out, 0, { profile, primaryStage: null, [roles.grip]: socket, [roles.free]: other });
  return out.slice(0, end);
}
const tris = (m: Float32Array) => m.length / MODEL_FLOATS / 3;
function toolRecord(kind: string, elapsed: number) {
  const durationMs = TOOL_ACTION_TIMING[kind].durationMs, startupMs = TOOL_USE_STARTUP_MS[kind];
  return { profile: 'emitter', toolKind: kind, durationMs, toolMotion: { v: 1, entry: [0, 0, 0, 0, 0], direction: 1, baseKind: 'salvage-blade' },
    toolUse: elapsed < startupMs ? { v: 1, id: 't', startupMs, phase: 'startup' } : { v: 1, id: 't', startupMs, phase: 'released', releaseOffsetMs: startupMs } };
}
// The weapon's own pose: swords carried, rifles mid-hold while firing.
function held(profile: string, reducedMotion = true) {
  const ranged = profile === 'rift-bombard' || profile === 'blunderbuss', r = ranged ? toolRecord(profile, 260) : null;
  const state = createHeroPoseState(asset), frame = createHeroFrame(asset);
  assert.ok(sampleCloseViewHero(asset, state, { nowMs: 1000, reducedMotion, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0,
    heldProfile: ranged ? 'salvage-blade' : profile, handProfile: profile, primaryCarryStage: profile === 'verge-cleaver' ? { kind: 'cleaver-three', step: 1 } : null,
    action: r ? { ...r, kind: 'ranged', profile, phase: 260 / r.durationMs, yaw: 0 } : null }, frame));
  return frame;
}
// Fist vertices (dominant joint in the hand chain), in the grip socket's normalized frame (world metres).
const HAND_NODES = { rightSocket: [14, 15, 16, 17, 18, 19, 20], leftSocket: [5, 6, 7, 8, 9] };
function fistBox(frame: any, socketKey: 'rightSocket' | 'leftSocket', handKey: 'rightSocket' | 'leftSocket' = socketKey) {
  const m = frame[socketKey], ax = [0, 1, 2].map(c => { const v = [m[c * 4], m[c * 4 + 1], m[c * 4 + 2]], l = Math.hypot(...v); return v.map(x => x / l); });
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], a = asset.arrays;
  for (const mesh of meta.meshes) { if (mesh.skin < 0) continue; const joints = meta.skins[mesh.skin].joints;
    for (let v = mesh.firstVertex; v < mesh.firstVertex + mesh.vertexCount; v++) {
      let best = -1, w = -1; for (let k = 0; k < 4; k++) if (a.weights[v * 4 + k] > w) { w = a.weights[v * 4 + k]; best = joints[a.joints[v * 4 + k]]; }
      if (!HAND_NODES[handKey].includes(best)) continue;
      const p = [0, 1, 2].map(k => frame.positionsNormals[v * 6 + k] - m[12 + k]);
      for (let c = 0; c < 3; c++) { const d = p[0] * ax[c][0] + p[1] * ax[c][1] + p[2] * ax[c][2]; lo[c] = Math.min(lo[c], d); hi[c] = Math.max(hi[c], d); } } }
  return { lo, hi };
}

test('every reworked weapon stays inside the held-gear, equipment and 256-triangle actor budgets', () => {
  for (const p of WEAPONS) {
    const n = tris(gear(p));
    assert.ok(n > 0 && n <= 96, `${p}: ${n}`);
    assert.ok(CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES + n <= HERO_EQUIPMENT_MAX_TRIANGLES, `${p} with suit armor`);
    assert.ok(n + HERO_DRINK_VIAL_TRIANGLES + HERO_KIT_MAX_TRIANGLES <= 256, `${p} with vial and kit in one actor slot`);
    // The armored equipment writer admits the weapon whole.
    const frame = held(p), out = new Float32Array(256 * 3 * MODEL_FLOATS), roles = closeViewHandRoles(p);
    assert.equal(writeCloseViewHeroEquipment(out, 0, { profile: p, primaryStage: null, [roles.grip]: frame[roles.grip], [roles.free]: frame[roles.free] }, frame) / MODEL_FLOATS / 3, n);
  }
  assert.deepEqual(WEAPONS.map(p => tris(gear(p))), [58, 58, 96, 92, 96]);
  // The native fallback Cleaver keeps its 40-triangle weapon inside the same 254-triangle actor.
  assert.equal(modelTriangleCount('playerVergeCleaver') - modelTriangleCount('playerUnarmed'), 40);
  assert.ok(modelTriangleCount('playerVergeCleaver') <= MODEL_MAX_VERTICES / 3);
});

test('reworked meshes are finite, unit-normal and rigid with the grip socket (exact in the hand)', () => {
  const moved = new Float32Array([0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 2, -3, 4, 1]);
  for (const p of WEAPONS) {
    const a = gear(p), b = gear(p, moved);
    assert.equal(a.length, b.length);
    for (let i = 0; i < a.length; i += MODEL_FLOATS) {
      assert.ok(Array.from(a.subarray(i, i + MODEL_FLOATS)).every(Number.isFinite), p);
      assert.ok(Math.abs(Math.hypot(a[i + 3], a[i + 4], a[i + 5]) - 1) < 1e-5, `${p} unit normal`);
      assert.ok(Math.abs(b[i] - (2 - a[i + 1])) < 1e-5 && Math.abs(b[i + 1] - (-3 + a[i])) < 1e-5 && Math.abs(b[i + 2] - (4 + a[i + 2])) < 1e-5, `${p} rigid`);
    }
    // Atomic: a short buffer is left untouched.
    const short = new Float32Array(a.length - 1).fill(7);
    assert.equal(writeCloseViewHeroGear(short, 0, { profile: p, primaryStage: null, leftSocket: identity, rightSocket: identity }), 0);
    assert.ok(short.every(v => v === 7));
  }
});

test('the Verge Cleaver hilt is built to the Wayfarer fist: hand-length grip, slim, guard just above, pommel below', () => {
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.cleaver, k = .82 * closeViewHeldScale('verge-cleaver');
  const frame = held('verge-cleaver'), fist = fistBox(frame, 'rightSocket');
  const fistLength = fist.hi[0] - fist.lo[0], fistThick = Math.min(fist.hi[1] - fist.lo[1], fist.hi[2] - fist.lo[2]);
  const gripLength = (F.grip[1] - F.grip[0]) * k, gripDiameter = 2 * F.gripRadius * k;
  assert.ok(gripLength >= fistLength && gripLength <= fistLength * 1.3, `grip ${gripLength} vs fist ${fistLength}`);
  assert.ok(gripDiameter <= fistThick * .55, `grip diameter ${gripDiameter} vs fist ${fistThick}`);
  // The fist sits inside the grip; the guard begins just above it and the pommel just below.
  const along = (z: number) => (z - .79) * k;
  assert.ok(along(F.grip[0]) <= fist.lo[0] + 1e-3 && along(F.grip[1]) >= fist.hi[0] - 1e-3, 'grip spans the fist');
  const guardBottom = along(F.guard.z) - .019 * k;
  assert.ok(guardBottom - fist.hi[0] >= -.003 && guardBottom - fist.hi[0] < .02, `guard ${guardBottom} sits on the fist (${fist.hi[0]})`);
  assert.ok(along(F.pommel[2]) <= fist.lo[0] + .01 && along(F.pommel[0]) > fist.lo[0] - .06, 'pommel just below the fist');
  // The whole hilt (pommel to guard) is a small fraction of the weapon; the blade keeps its tip.
  const out = gear('verge-cleaver');
  let tip = -Infinity, low = Infinity; for (let i = 0; i < out.length; i += MODEL_FLOATS) { tip = Math.max(tip, out[i]); low = Math.min(low, out[i]); }
  assert.ok(Math.abs(tip - (F.tip - .79) * k) < 1e-6, 'blade tip unchanged at recipe 1.87');
  assert.ok((along(F.bladeBase) - low) / (tip - low) < .25, 'hilt under a quarter of the weapon');
  // Drawn grip (Wayfarer leather) lies on the socket axis at exactly its radius.
  let gripVerts = 0;
  for (let i = 0; i < out.length; i += MODEL_FLOATS) if (isColor(out, i, 0x5a4330)) { gripVerts++; assert.ok(Math.abs(Math.hypot(out[i + 1], out[i + 2]) - F.gripRadius * k) < 1e-6); }
  assert.equal(gripVerts, 36);
  // The previous handle was a block twice the fist's length and nearly its thickness.
  assert.ok(.28 * k > fistLength * 2, 'documented: the old handle overran the fist');
});

test('the native fallback Cleaver keeps five parts and 40 triangles with a shorter hilt and the same tip', () => {
  const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS), end = writeCloseViewModel(out, 0, { kind: 'playerVergeCleaver', x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, pose: 'idle', amount: 0, reduceMotion: true });
  assert.equal(end, modelTriangleCount('playerVergeCleaver') * 3 * MODEL_FLOATS);
  const start = modelTriangleCount('playerUnarmed') * 3 * MODEL_FLOATS, handle: number[][] = [];
  for (let i = start; i < start + 36 * MODEL_FLOATS; i += MODEL_FLOATS) handle.push([out[i], out[i + 1], out[i + 2]]);
  let span = 0; for (const a of handle) for (const b of handle) span = Math.max(span, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  assert.ok(span > .12 && span < .2, `native handle diagonal ${span} (was .31)`);
});

test('the Rift Bombard reads as a hip-held grenade launcher with its muzzle on the lit bore', () => {
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.bombard, k = .82 * closeViewHeldScale('rift-bombard'), out = gear('rift-bombard');
  let reach = -Infinity; for (let i = 0; i < out.length; i += MODEL_FLOATS) reach = Math.max(reach, out[i]);
  assert.ok(Math.abs(reach - (1.585 - .79) * k) < 1e-6, 'muzzle face unchanged');
  // The blue-lit throat (RIFT_BOMBARD_COLOURS.glow) and drum faces use an emissive actor colour; the bore centre is the muzzle point.
  assert.ok(CLOSE_VIEW_ACTOR_LOOK.emissive.includes(0x5aa6ff) && CLOSE_VIEW_ACTOR_LOOK.emissive.includes(0xf3a55c));
  const throat: number[][] = [];
  for (let i = 0; i < out.length; i += MODEL_FLOATS) if (isColor(out, i, 0x5aa6ff) && out[i] > (1.5 - .79) * k) throat.push([out[i], out[i + 1], out[i + 2]]);
  assert.equal(throat.length, 12);
  const centre = [0, 1, 2].map(c => (Math.min(...throat.map(p => p[c])) + Math.max(...throat.map(p => p[c]))) / 2), muzzle = closeViewHeldMuzzlePoint(new Float32Array(3), 'rift-bombard', identity)!;
  assert.ok(Math.abs(muzzle[1] - centre[1]) < 1e-6 && Math.abs(muzzle[2] - centre[2]) < 1e-6 && Math.abs(muzzle[0] - reach) < 1e-6, 'shots leave the bore');
  assert.ok(Math.hypot(muzzle[1], muzzle[2]) > .05, 'the bore rides above the trigger fist');
  // Fat bore and big drum against the barrel: launcher proportions, not a rifle.
  assert.ok(F.drumRadius / F.barrelRadius > 1.6 && F.bore / F.barrelRadius > .75);
  // While firing: the pistol grip passes through the trigger fist and the side handle meets the support hand.
  const frame = held('rift-bombard'), fist = fistBox(frame, 'leftSocket');
  const [g0x, g0z, g1x, g1z] = F.grip, at = (x: number, z: number) => [(z - .79) * k, -(x - .17) * k];
  const top = at(g0x, g0z), bottom = at(g1x, g1z);
  assert.ok(top[1] > fist.hi[1] - .01 && bottom[1] < fist.lo[1], 'grip runs from the receiver down through the fist');
  for (const t of [.35, .5, .65]) { const x = top[0] + (bottom[0] - top[0]) * t, y = top[1] + (bottom[1] - top[1]) * t; assert.ok(x > fist.lo[0] && x < fist.hi[0] && y > fist.lo[1] && y < fist.hi[1], `grip inside the fist at ${t}`); }
  const support = fistBox(frame, 'leftSocket', 'rightSocket'), S = F.support, handle = [(S[3] - .79) * k, -(S[0] - .17) * k, -(S[2] + .25) * k];
  const gap = [0, 1, 2].map(c => Math.max(support.lo[c] - handle[c], 0, handle[c] - support.hi[c]));
  assert.ok(Math.hypot(...gap) < .02, `support handle end reaches the support hand (${gap})`);
});

test('Blunderbuss and Salvage Blade keep their accepted silhouettes with light polish only', () => {
  const b = gear('blunderbuss'), kb = .82 * closeViewHeldScale('blunderbuss');
  let far = -Infinity; for (let i = 0; i < b.length; i += MODEL_FLOATS) far = Math.max(far, b[i]);
  assert.ok(Math.abs(far - (1.535 - .79) * kb) < 1e-6, 'blunderbuss muzzle plane unchanged');
  // The round grip is slimmer than the old .055 x .06 block and lies on the socket axis.
  for (let i = 0; i < b.length; i += MODEL_FLOATS) if (isColor(b, i, 0x5a4330) && b[i] < (.98 - .79) * kb) assert.ok(Math.hypot(b[i + 1], b[i + 2]) <= .026 * kb + 1e-6);
  // Salvage Blade: the first 24 triangles are the accepted bronze guard and blade; both profiles share it.
  const s = gear('salvage-blade'), accepted = 24 * 3 * MODEL_FLOATS;
  assert.deepEqual(gear('melee'), s);
  for (let i = 0; i < accepted; i += MODEL_FLOATS) assert.ok(isColor(s, i, 0xbf9a64));
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.salvage, k = .82;
  let low = Infinity; for (let i = accepted; i < s.length; i += MODEL_FLOATS) low = Math.min(low, s[i]);
  assert.ok(Math.abs(low - (F.pommel[0] - .79) * k) < 1e-6, 'pommel below the fist');
  const frame = held('salvage-blade'), fist = fistBox(frame, 'rightSocket');
  assert.ok((F.pommel[2] - .79) * k < fist.lo[0] + .03, 'the grip shows below the fist');
});

test('weapon bakes are deterministic and independent of motion settings', () => {
  const digest = (m: Float32Array) => createHash('sha256').update(new Uint8Array(m.buffer, m.byteOffset, m.byteLength)).digest('hex');
  const first = Object.fromEntries(WEAPONS.map(p => [p, digest(gear(p))]));
  for (const p of WEAPONS) assert.equal(digest(gear(p)), first[p], p);
  assert.equal(new Set(Object.values(first)).size, 4, 'melee and salvage-blade share one blade; the rest are distinct');
  // Reduced motion changes the pose, never the weapon: the socket-local mesh is the same either way.
  for (const p of WEAPONS) {
    const roles = closeViewHandRoles(p), a = held(p, true), b = held(p, false);
    const local = (frame: any) => { const m = frame[roles.grip], g = gear(p, m, frame[roles.free]), ax = [0, 1, 2].map(c => { const v = [m[c * 4], m[c * 4 + 1], m[c * 4 + 2]], l = Math.hypot(...v); return v.map(x => x / l); });
      const q: number[] = []; for (let i = 0; i < g.length; i += MODEL_FLOATS) { const d = [g[i] - m[12], g[i + 1] - m[13], g[i + 2] - m[14]]; for (let c = 0; c < 3; c++) q.push(d[0] * ax[c][0] + d[1] * ax[c][1] + d[2] * ax[c][2]); } return q; };
    const qa = local(a), qb = local(b);
    assert.equal(qa.length, qb.length); assert.ok(qa.every((v, i) => Math.abs(v - qb[i]) < 1e-4), p);
  }
});
