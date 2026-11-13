// Close View townsfolk (2026-11-13, Tim: "every interactable character should have a real 3D body in Close View"): every
// interactable person resolves to a skinned body (never a card), looks are deterministic per id and shared per variant, every mesh
// holds its tier's triangle budget and the slot's caps, the peddler wears his red rags and his pack, the standard view's peddler is
// untouched, and every animation samples finite in every tier (reduced motion too).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REFUGE_NPCS, WAYSTATION_NPCS } from '../src/types.ts';
import { TRAVELER_GROUPS } from '../src/travelers.ts';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { FOLK_BODIES } from '../src/close-view-folk-body.ts';
import {
  FOLK_SLOT, FOLK_LOOKS, FOLK_POOLS, FOLK_MOTION, closeViewFolkKind, folkLook, folkLookCached, folkMesh, folkHash, createFolkTrack, sampleFolk, folkBone,
  turtleFolkMesh, createTurtleFolkTrack, sampleTurtleFolk, TURTLE_SKELETON,
} from '../src/close-view-folk.ts';

const TIERS = ['full', 'balanced', 'low'];
const ALL_LOOKS = [...Object.values(FOLK_LOOKS), ...Object.values(FOLK_POOLS).flat()];
// Every interactable character the world places (the shapes their generators push: world.ts, refuge-lands.ts, surveyor.ts,
// settlements.ts, game.ts raiseTownAmenities / tide bearer / merchants, ilse.ts, travelers.ts).
const PEOPLE = [
  ...REFUGE_NPCS.map((n) => ({ ...n, kind: 'npc', state: 'calm' })),
  ...WAYSTATION_NPCS.map((n) => ({ ...n, kind: 'npc', state: 'calm' })),
  { id: 'refuge-farmer', kind: 'villager', name: 'Hollis Dray', x: 12, y: 18, refugeFarmer: true, cook: true },
  { id: 'cairn-keeper', kind: 'villager', name: 'Maud Fennick', x: 4, y: 9, cairnKeeper: true },
  ...Array.from({ length: 12 }, (_, i) => ({ id: `hamlet-3-4-folk-${i}`, kind: 'villager', name: `Folk ${i}`, x: 10 + i, y: 12 })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `hamlet-3-4-warden-${i}`, kind: 'villager', guard: true, name: `Warden ${i}`, x: 10 + i, y: 14 })),
  { id: 'town-cook-3-4', kind: 'villager', name: 'The Cook', cook: true, x: 9, y: 9 },
  { id: 'town-keeper-3-4', kind: 'townKeeper', x: 8, y: 9 }, { id: 'town-smith-3-4', kind: 'townSmith', x: 7, y: 9, state: 'working' },
  { id: 'shipwright', kind: 'shipwright', x: 6, y: 9 }, { id: '0:0:tide-bearer', kind: 'tideBearer', x: 5, y: 9 },
  { id: 'hamlet-3-4-merchant', kind: 'shelterMerchant', x: 4, y: 9 }, { id: 'deep-v2-fortress-merchant', kind: 'shelterMerchant', x: 3, y: 9 },
  ...[['child', 1], ['young', 2], ['young', 3], ['young', 4], ['old', 5]].map(([age, stage]) => ({ id: `ilse-${stage}`, kind: 'ilse', age, stage, x: 2, y: 9 })),
  ...TRAVELER_GROUPS.flatMap((gr) => gr.looks.map((look, i) => ({ id: `travelers:${gr.id}:${i}`, kind: 'traveler', look, mount: null, x: 2, y: 2, state: 'walking', facing: 'down' }))),
  { id: 'travelers:1,1:0', kind: 'traveler', look: 'mercenary', mount: 'mossGrazer', x: 2, y: 3, state: 'walking', facing: 'down' },
  { id: 'wanderer:3,4', kind: 'traveler', wanderer: true, look: 'cartographer', mount: 'mossGrazer', x: 3, y: 3, state: 'listening', facing: 'down' },
  { id: 'reciter:3,4', kind: 'traveler', reciter: 'r1', look: 'scholar', x: 4, y: 3, state: 'walking', facing: 'down' },
];
const env = (o = {}) => ({ x: 4.5, y: 4.7, z: 0, scale: 1, now: 1000, reduce: false, tier: 'full', target: { x: 6, y: 5 }, talk: NaN, seat: 0, yaw: NaN, ...o });

test('every interactable person resolves to a skinned 3D body, never a card', () => {
  for (const o of PEOPLE) {
    const kind = closeViewFolkKind(o); assert.ok(kind === 'folk' || kind === 'turtle', `${o.kind} ${o.id}: ${kind}`);
    const mesh = kind === 'turtle' ? turtleFolkMesh('full') : folkMesh(folkLook(o), 'full');
    assert.ok(mesh.triangles > (kind === 'turtle' ? 250 : 1000), `${o.id}: a body (${mesh.triangles} triangles), not a card`);
    let lo = Infinity, hi = -Infinity; for (let i = 0; i < mesh.vertexCount; i++) { lo = Math.min(lo, mesh.positions[i * 3 + 2]); hi = Math.max(hi, mesh.positions[i * 3 + 2]); }
    assert.ok(hi - lo > (kind === 'turtle' ? .25 : 1), `${o.id}: stands up (${(hi - lo).toFixed(2)})`);
    let deep = 0; for (let i = 0; i < mesh.vertexCount; i++) deep = Math.max(deep, Math.abs(mesh.positions[i * 3]));
    assert.ok(deep > .1, `${o.id}: has depth, not a flat slab`);
  }
  // Shale the quarry keeper is his stone turtle; an Elder Wanderer keeps its own 3D model; a fallen Refuge person keeps the marker
  assert.equal(closeViewFolkKind({ id: 'quarry-keeper', kind: 'villager', quarryTurtle: true, x: 1, y: 1 }), 'turtle');
  assert.equal(closeViewFolkKind({ id: 'elder', kind: 'traveler', elder: true, rule: 30, x: 1, y: 1 }), null);
  assert.equal(closeViewFolkKind(REFUGE_NPCS[0] && { ...REFUGE_NPCS[0], kind: 'npc' }, { save: { consequences: { npcs: { [REFUGE_NPCS[0].id]: { status: 'dead' } } } } }), null);
  for (const k of ['tree', 'chest', 'worldCache', 'dungeon', 'viewport']) assert.equal(closeViewFolkKind({ id: k, kind: k, x: 1, y: 1 }), null, `${k} is not a person`);
  // the named people have their own looks; every traveller look the world can deal has one
  for (const n of [...REFUGE_NPCS, ...WAYSTATION_NPCS]) assert.ok(Object.values(FOLK_LOOKS).includes(folkLook({ ...n, kind: 'npc' })), `${n.name} has a look of their own`);
  for (const gr of TRAVELER_GROUPS) for (const look of gr.looks) { const L = folkLook({ id: 'x', kind: 'traveler', look }); assert.ok(L && FOLK_BODIES[L.body], look); }
  assert.equal(folkLook({ id: 'any', kind: 'traveler', look: 'peddler' }), FOLK_LOOKS.peddler);
  assert.equal(folkLook({ id: 'wanderer:1,1', kind: 'traveler', wanderer: true, look: 'cartographer' }), FOLK_LOOKS.quillon);
});

test('looks are deterministic per id, varied across a town, and their meshes shared per variant', () => {
  const ids = Array.from({ length: 300 }, (_, i) => ({ id: `hamlet-${i % 17}-${i % 5}-folk-${i}`, kind: 'villager' }));
  for (const o of ids) { assert.equal(folkLook(o), folkLook({ ...o })); assert.equal(folkHash(o), folkHash({ ...o })); }
  const seen = new Set(ids.map((o) => folkLook(o).id)); assert.equal(seen.size, FOLK_POOLS.villager.length, 'every villager variant is dealt');
  assert.ok(new Set(FOLK_POOLS.villager.map((l) => `${l.body}:${l.hat}:${l.held}:${l.colors.cloth}`)).size === FOLK_POOLS.villager.length, 'no two variants alike');
  assert.ok(new Set(FOLK_POOLS.villager.map((l) => l.body)).size === 2 && new Set(FOLK_POOLS.villager.map((l) => l.hat)).size >= 4, 'bodies and headwear vary (not all hoods)');
  const [a, b] = ids.filter((o) => folkLook(o) === folkLook(ids[0])).slice(0, 2);
  for (const tier of TIERS) { assert.strictEqual(folkMesh(folkLook(a), tier), folkMesh(folkLook(b), tier), 'two people in the same variant share one mesh'); }
  // and a track carries no per-person mesh: the frame names the shared one
  const tr = createFolkTrack(folkLook(a)), f = sampleFolk(tr, a, env()); assert.strictEqual(f.mesh, folkMesh(folkLook(a), 'full'));
});

test('budgets: every mesh within its tier, lighter by tier, valid; the slot caps hold', () => {
  assert.ok(FOLK_SLOT.maxFolk.full >= FOLK_SLOT.maxFolk.balanced && FOLK_SLOT.maxFolk.balanced >= FOLK_SLOT.maxFolk.low && FOLK_SLOT.maxFolk.full <= 8 && FOLK_SLOT.maxFolk.low >= 1);
  for (const t of TIERS) assert.ok(FOLK_SLOT.triangles[t] * FOLK_SLOT.maxFolk[t] <= 20000, `${t}: the whole slot's triangles stay bounded`);
  for (const look of ALL_LOOKS) {
    let prev = Infinity;
    for (const tier of TIERS) {
      const m = folkMesh(look, tier), tr = createFolkTrack(look);
      assert.ok(m.triangles <= FOLK_SLOT.triangles[tier], `${look.id} ${tier}: ${m.triangles} > ${FOLK_SLOT.triangles[tier]}`);
      assert.ok(m.triangles < prev, `${look.id} ${tier} lighter than the tier above`); prev = m.triangles;
      assert.ok(m.vertexCount < 65535); assert.ok(tr.skeleton.count <= BEAST_SLOT.maxBones && tr.skeleton.count <= FOLK_SLOT.maxBones);
      for (const i of m.indices) assert.ok(i < m.vertexCount);
      for (let v = 0; v < m.vertexCount; v++) { assert.ok(m.skin[v * 4] < tr.skeleton.count && m.skin[v * 4 + 2] < tr.skeleton.count); assert.ok(Number.isFinite(m.positions[v * 3 + 2])); }
      assert.strictEqual(folkMesh(look, tier), m, 'cached');
    }
  }
  for (const tier of TIERS) assert.ok(turtleFolkMesh(tier).triangles <= FOLK_SLOT.triangles[tier]);
  // the admission in close-view.ts stops at the tier's cap, nearest first, in its own slots
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.match(src, /cap = FOLK_SLOT\.maxFolk\[tier\]/); assert.match(src, /oi >= 0 && Fk\.count < cap; oi--/);
});

test('the peddler: a hunched schemer in red rags and robes, his pack on his back; his standard-view sprite unchanged', () => {
  const P = FOLK_LOOKS.peddler;
  assert.equal(P.body, 'robe'); assert.ok(P.rags && P.mantle && P.skirt, 'rags and robes'); assert.ok(P.hunch >= .5, 'hunched'); assert.equal(P.back, 'pack'); assert.equal(P.idle, 'scheme');
  const red = (hex) => { const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255; return r > 1.8 * g && r > 1.8 * b && r > 60; };
  for (const k of ['cloth', 'dark', 'trim', 'hat', 'mantle']) assert.ok(red(P.colors[k]), `${k} is red`);
  const m = folkMesh(P, 'full'), tr = createFolkTrack(P), back = tr.skeleton.index.back;
  let packTris = 0, redVerts = 0;
  for (let i = 0; i < m.indices.length; i += 3) if (m.skin[m.indices[i] * 4] === back) packTris++;
  for (let v = 0; v < m.vertexCount; v++) { const r = m.colors[v * 3], g = m.colors[v * 3 + 1], b = m.colors[v * 3 + 2]; if (r > 1.6 * g && r > 1.6 * b) redVerts++; }
  assert.ok(packTris >= 60, `the pack is built (${packTris} triangles on the back)`); assert.ok(redVerts / m.vertexCount > .45, `mostly red (${(redVerts / m.vertexCount).toFixed(2)})`);
  // the pack's size: about a 35-40 L hiking pack on a 1.75 m man (55 x 30 x 20 cm or so): noticeable, not huge
  const at = (v) => [m.positions[v * 3], m.positions[v * 3 + 1], m.positions[v * 3 + 2]]; let lo = [9, 9, 9], hi = [-9, -9, -9];
  for (let v = 0; v < m.vertexCount; v++) if (m.skin[v * 4] === back) { const p = at(v); for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); } }
  const metres = 1.75 / (FOLK_BODIES.robe.collarTop / .8 * .97), size = hi.map((h, k) => (h - lo[k]) * metres);
  assert.ok(size[2] > .4 && size[2] < .8 && size[1] > .25 && size[1] < .55 && size[0] > .15 && size[0] < .4, `pack ${size.map((s) => s.toFixed(2)).join(' x ')} m`);
  // it sits behind his back, above the hips
  const tr2 = createFolkTrack(P), f = sampleFolk(tr2, { id: 'travelers:1,1:0', kind: 'traveler', look: 'peddler', facing: 'down' }, env({ yaw: 0, target: null }));
  const pb = folkBone(tr2, 'back'), chest = folkBone(tr2, 'chest'); assert.ok(f && pb[0] < chest[0], 'the pack behind him'); assert.ok(pb[2] > folkBone(tr2, 'pelvis')[2]);
  // standard view: the peddler still drawn by the same branch and colours as before
  const R = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(R, /peddler: \["#9a6f45", "#5a3f2a", "#e0b35e"\]/);
  assert.match(R, /if \(kind === "peddler"\) \{ rect\(p\[1\], -0\.42, -0\.62, 0\.2, 0\.34\); rect\(p\[2\], -0\.4, -0\.58, 0\.16, 0\.05\); \}/);
  assert.match(R, /actor\(ctx, o\.x, o\.y - lift, s, o\.look \|\| "traveler", f, step, "idle"\);/);
  assert.match(R, /\.\.\.\(closeViewCapturing\(\)&&closeViewFolkKind\(o,g\)\?folkCapture/, 'the Close View residual is only for the GPU capture');
});

test('animations: idle, watch, walk, ride, talk, work and reduced motion stay finite in every tier', () => {
  const finite = (f, why) => { assert.ok(f, why); for (let i = 0; i < f.boneCount * 12; i++) assert.ok(Number.isFinite(f.skin[i]), `${why}: skin ${i}`); assert.ok(Number.isFinite(f.yaw) && Number.isFinite(f.x)); };
  for (const look of ALL_LOOKS) for (const tier of TIERS) for (const reduce of [false, true]) {
    const tr = createFolkTrack(look), o = { id: `t-${look.id}`, kind: 'villager', facing: 'down' };
    let f;
    for (let k = 0; k < 40; k++) f = sampleFolk(tr, o, env({ tier, reduce, now: 1000 + k * 16, x: 4.5 + k * .02, target: { x: 4.5, y: 9 } })); finite(f, `${look.id} walk ${tier}`);
    for (let k = 0; k < 20; k++) f = sampleFolk(tr, o, env({ tier, reduce, now: 2000 + k * 16, x: 5.3, target: { x: 6, y: 5.2 }, talk: k * 60 })); finite(f, `${look.id} talk ${tier}`);
    for (let k = 0; k < 10; k++) f = sampleFolk(tr, o, env({ tier, reduce, now: 3000 + k * 33, x: 5.3, target: null })); finite(f, `${look.id} idle ${tier}`);
    for (let k = 0; k < 10; k++) f = sampleFolk(tr, o, env({ tier, reduce, now: 4000 + k * 16, x: 5.3 + k * .03, seat: FOLK_MOTION.seat })); finite(f, `${look.id} ride ${tier}`);
    f = sampleFolk(tr, o, env({ tier, reduce, now: 9e6, x: 50, y: 50 })); finite(f, `${look.id} jump ${tier}`); // a teleport (new section) snaps
  }
  const tt = createTurtleFolkTrack(); for (const reduce of [false, true]) for (let k = 0; k < 30; k++) { const f = sampleTurtleFolk(tt, { id: 'q' }, env({ reduce, now: 1000 + k * 16 })); for (let i = 0; i < TURTLE_SKELETON.count * 12; i++) assert.ok(Number.isFinite(f.skin[i])); }
});

test('motion reads: the head turns to a near Wayfarer, feet hold while walking, reduced motion holds still, the talk gesture raises a hand', () => {
  const look = FOLK_LOOKS.vela, o = { id: 'vendor-vela', kind: 'npc', facing: 'down' };
  // near: the body comes round to face the Wayfarer (east of it)
  const tr = createFolkTrack(look); let f; for (let k = 0; k < 120; k++) f = sampleFolk(tr, o, env({ now: 1000 + k * 16, target: { x: 6.5, y: 4.7 } }));
  assert.ok(Math.abs(Math.atan2(Math.sin(f.yaw), Math.cos(f.yaw))) < .25, `faces the Wayfarer (${f.yaw.toFixed(2)})`);
  // far: back to its rest facing (south)
  const tr2 = createFolkTrack(look); for (let k = 0; k < 200; k++) f = sampleFolk(tr2, o, env({ now: 1000 + k * 16, target: { x: 40, y: 40 } }));
  assert.ok(Math.abs(f.yaw - Math.PI / 2) < .2, 'rests facing its standard-view facing');
  // reduced motion: two different instants give the same pose standing
  const a = createFolkTrack(look), b = createFolkTrack(look); for (let k = 0; k < 30; k++) { sampleFolk(a, o, env({ reduce: true, now: 1000 + k * 16, target: null })); sampleFolk(b, o, env({ reduce: true, now: 5000 + k * 16, target: null })); }
  for (let i = 0; i < a.skeleton.count * 12; i++) assert.ok(Math.abs(a.pose.skin[i] - b.pose.skin[i]) < 1e-6, 'reduced motion: no breathing or glancing');
  // without reduced motion it breathes
  const c = createFolkTrack(look); sampleFolk(c, o, env({ now: 1000, target: null })); const s1 = Float32Array.from(c.pose.skin); sampleFolk(c, o, env({ now: 2500, target: null }));
  assert.ok(c.pose.skin.some((v, i) => Math.abs(v - s1[i]) > 1e-5), 'idle breathes');
  // talk: the right hand comes up while spoken to
  const t1 = createFolkTrack(FOLK_LOOKS.hollis), t2 = createFolkTrack(FOLK_LOOKS.hollis);
  for (let k = 0; k < 30; k++) { sampleFolk(t1, o, env({ now: 1000 + k * 16 })); sampleFolk(t2, o, env({ now: 1000 + k * 16, talk: 500 + k * 16 })); }
  assert.ok(folkBone(t2, 'handR')[2] > folkBone(t1, 'handR')[2] + .1, 'the talk gesture raises the hand');
  // walking: a planted foot stays put while the body passes over it
  const w = createFolkTrack(look); const marks = [];
  for (let k = 0; k < 90; k++) { sampleFolk(w, o, env({ now: 1000 + k * 16, x: 4 + k * .02, target: null })); if (k > 30) marks.push([w.gait.out[0], w.gait.out[1], w.gait.out[3]]); }
  let held = 0; for (let k = 1; k < marks.length; k++) if (marks[k][2] && marks[k - 1][2]) { assert.ok(Math.hypot(marks[k][0] - marks[k - 1][0], marks[k][1] - marks[k - 1][1]) < 1e-6, 'a planted foot never slides'); held++; }
  assert.ok(held > 10);
});

test('the Tall Country folk stand at its scale; looks are remembered per person and follow Ilse from meeting to meeting', async () => {
  const { FAR_FOLK } = await import('../src/far-realms.ts');
  assert.equal(FOLK_MOTION.giant, FAR_FOLK.scale);
  const ilse = { id: 'ilse', kind: 'ilse', age: 'child', stage: 1, x: 1, y: 1 };
  assert.equal(folkLookCached(ilse), FOLK_LOOKS.ilseChild); assert.equal(folkLookCached(ilse), folkLookCached(ilse));
  ilse.age = 'young'; ilse.stage = 3; assert.equal(folkLookCached(ilse), FOLK_LOOKS.ilseLamp, 'a new meeting, a new look');
  ilse.stage = 4; assert.equal(folkLookCached(ilse), FOLK_LOOKS.ilseDark);
});

test('Close View solids: world caches by spot, the lever, a way out, doors and ladders stand as 3D props; a stair down stays flat', async () => {
  const { outdoorProps, outdoorPropObject, outdoorWallFacing } = await import('../src/close-view-outdoor.ts');
  const map = { width: 5, tiles: Array.from({ length: 25 }, (_, i) => ({ x: i % 5, y: Math.floor(i / 5), blocked: Math.floor(i / 5) === 0 })), objects: [] };
  const height = (o) => { const r = outdoorProps({ ...map, objects: [o] }); let lo = 9, hi = -9; for (let i = 0; i < r.verts; i++) { lo = Math.min(lo, r.data[i * 10 + 2]); hi = Math.max(hi, r.data[i * 10 + 2]); } return r.props ? hi - lo : 0; };
  for (const [o, min] of [[{ kind: 'worldCache', spot: 'corpse', x: 2, y: 2, state: 'waiting' }, .1], [{ kind: 'worldCache', spot: 'throne', x: 2, y: 1, state: 'waiting' }, 1], [{ kind: 'worldCache', spot: 'lever', x: 2, y: 1, state: 'sealed' }, .9],
    [{ kind: 'worldCache', spot: 'ledge', x: 2, y: 3, state: 'waiting' }, .15], [{ kind: 'worldCache', spot: 'climbTop', x: 2, y: 3, state: 'waiting' }, .15], [{ kind: 'cacheLever', x: 3, y: 1, state: 'ready' }, .4],
    [{ kind: 'exit', x: 2, y: 1, state: 'open' }, 1], [{ kind: 'buildingStair', dir: 'door', x: 2, y: 1, state: 'open' }, 1], [{ kind: 'buildingStair', dir: 'up', x: 2, y: 1, state: 'open' }, 1.5],
    [{ kind: 'chest', x: 2, y: 2, state: 'closed' }, .25]]) {
    assert.ok(outdoorPropObject(o), `${o.kind} ${o.spot || o.dir || ''} is a solid`); assert.ok(height(o) >= min, `${o.kind} ${o.spot || o.dir || ''} stands up (${height(o).toFixed(2)})`);
  }
  assert.equal(outdoorPropObject({ kind: 'buildingStair', dir: 'down', x: 2, y: 2 }), false, 'a stair down stays flat in the floor');
  // a door stands square against its wall, its back to it; a door in the wall itself stands at its face
  { const f = outdoorWallFacing(map, 2.5, 1.5); assert.equal(f.rot, Math.PI); assert.ok(Math.abs(f.shift - .08) < 1e-9); } assert.equal(outdoorWallFacing(map, 2.5, .5).shift, -.9);
  // an alcove's bars go when its lever is pulled; a door's bars and lock show
  const bars = (o) => outdoorProps({ ...map, objects: [o] }).verts;
  assert.ok(bars({ kind: 'worldCache', spot: 'lever', x: 2, y: 1, state: 'sealed' }) > bars({ kind: 'worldCache', spot: 'lever', x: 2, y: 1, state: 'waiting' }));
  assert.notEqual(bars({ kind: 'buildingStair', dir: 'door', x: 2, y: 1, barred: true }), bars({ kind: 'buildingStair', dir: 'door', x: 2, y: 1 }));
});
