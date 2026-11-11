// The Nanobot Knight's human body (Tim, 2026-11-11: "use one of the models from the RPG creator ... scale it up ... 1.75 times
// the size of the Wayfarer"; "not chibi ... slightly longer and slender ... and taller"): the Quaternius RPG Character Pack
// Rogue body (CC0, docs/asset-sources/wayfarer-rogue/: provenance, licence and SHA-256 there), converted for the shared beast
// rig. Reproducible: `node docs/asset-sources/nanobot-knight/convert-knight.mjs` rewrites src/close-view-beast-knight-body.ts.
//
// The conversion: the source's rest pose is skinned (four weights), then re-posed and re-proportioned bone by bone: the arms
// hang straight down from the shoulders, the legs straight down from the hips; the legs, arms and torso are lengthened a
// little and every limb and the torso slimmed about its bone; hands and feet are made smaller. The hood, face, pouch, laces
// and dagger are left out (the Knight wears its own helm and carries its own greatsword). Each vertex keeps its two heaviest
// joints, mapped onto the Knight's skeleton, and is coloured as dark plate from the source texture's light and shade.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const g = JSON.parse(gunzipSync(readFileSync(here('../wayfarer-rogue/Rogue.gltf.gz'))));
const bin = Buffer.from(g.buffers[0].uri.split(',')[1], 'base64');
const view = (i) => { const v = g.bufferViews[i]; return bin.subarray((v.byteOffset || 0), (v.byteOffset || 0) + v.byteLength); };
const read = (ai) => { const a = g.accessors[ai], v = g.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const T = { 5126: Float32Array, 5123: Uint16Array, 5121: Uint8Array, 5125: Uint32Array }[a.componentType], stride = v.byteStride || n * T.BYTES_PER_ELEMENT, out = new Float64Array(a.count * n);
  const base = (v.byteOffset || 0) + (a.byteOffset || 0);
  for (let i = 0; i < a.count; i++) { const o = base + i * stride; const arr = new T(bin.buffer.slice(bin.byteOffset + o, bin.byteOffset + o + n * T.BYTES_PER_ELEMENT)); for (let k = 0; k < n; k++) out[i * n + k] = arr[k]; }
  return { data: out, n, count: a.count }; };
// ---- matrices (column-major 4x4)
const mul = (a, b) => { const o = new Float64Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
const trs = (n) => { const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1], [x, y, z, w] = q;
  return Float64Array.from([(1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0, 2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
    2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1]); };
const I4 = () => Float64Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const world = new Array(g.nodes.length), parent = new Array(g.nodes.length).fill(-1);
g.nodes.forEach((n, i) => (n.children || []).forEach((c) => { parent[c] = i; }));
const W = (i) => world[i] ||= parent[i] < 0 ? trs(g.nodes[i]) : mul(W(parent[i]), trs(g.nodes[i]));
const xf = (m, p, w = 1) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12] * w, m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13] * w, m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14] * w];
const node = (nm) => g.nodes.findIndex((n) => n.name === nm), pos = (nm) => xf(W(node(nm)), [0, 0, 0]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = (a) => Math.hypot(...a), nrm = (a) => sc(a, 1 / (len(a) || 1)), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// rotation (3x3, rows) taking unit a onto unit b
const rotTo = (a, b) => { const v = cross(a, b), c = dot(a, b), k = 1 / (1 + c), [x, y, z] = v;
  return [[c + x * x * k, x * y * k - z, x * z * k + y], [y * x * k + z, c + y * y * k, y * z * k - x], [z * x * k - y, z * y * k + x, c + z * z * k]]; };
const app = (R, p) => [dot(R[0], p), dot(R[1], p), dot(R[2], p)];
const DOWN = [0, -1, 0];
// ---- the proportions (Tim: "slightly longer and slender ... and taller", not stretched): length along each bone, slimming
// across it (radius); hands and feet smaller all round
const PROP = { leg: { len: 1.14, rad: .8 }, arm: { len: 1.1, rad: .78 }, torso: { len: 1.12, rad: .84 }, hand: { len: .72, rad: .72 }, foot: { len: .82, rad: .8 }, neck: { len: 1.15, rad: .8 } };
const sideOf = (nm) => nm.endsWith('.L') ? 'L' : nm.endsWith('.R') ? 'R' : '';
const groupOf = (nm) => /UpperLeg|LowerLeg/.test(nm) ? 'leg' : /UpperArm|LowerArm/.test(nm) ? 'arm' : /Fist|Thumb|Weapon/.test(nm) ? 'hand' : /Foot|Shoelace/.test(nm) ? 'foot' : /Neck/.test(nm) ? 'neck' : 'torso';
// new joint frames: for each skin joint, the source position P, the new position P2, the bone's delta rotation Q (applied in
// world) and the scaling about its bone (length along its axis, radius across)
const skin = g.skins[0], joints = skin.joints, ibm = read(skin.inverseBindMatrices).data;
const J = joints.map((ni) => ({ ni, name: g.nodes[ni].name, P: pos(g.nodes[ni].name) }));
const byName = Object.fromEntries(J.map((j) => [j.name, j]));
const child = (nm) => ({ 'UpperArm.L': 'LowerArm.L', 'LowerArm.L': 'Fist.L', 'UpperArm.R': 'LowerArm.R', 'LowerArm.R': 'Fist.R', 'UpperLeg.L': 'LowerLeg.L', 'UpperLeg.R': 'LowerLeg.R',
  Hips: 'Abdomen', Abdomen: 'Torso', Torso: 'Neck', Neck: 'Head' })[nm];
// the ankle: the source's foot target (Foot.L/R is a child of Root, at the ankle)
for (const s of ['L', 'R']) byName['LowerLeg.' + s].end = byName['Foot.' + s].P;
for (const j of J) { j.end ||= child(j.name) ? byName[child(j.name)].P : null; }
// straight limbs: each arm and leg segment turned to point down; the chain below it follows
const Q = new Map(); const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], mulR = (A, B) => A.map((r) => [0, 1, 2].map((c) => r[0] * B[0][c] + r[1] * B[1][c] + r[2] * B[2][c]));
for (const s of ['L', 'R']) {
  const ua = byName['UpperArm.' + s], la = byName['LowerArm.' + s], ul = byName['UpperLeg.' + s], ll = byName['LowerLeg.' + s];
  const qa = rotTo(nrm(sub(la.P, ua.P)), DOWN), la2 = app(qa, sub(la.end, la.P)), qb = mulR(rotTo(nrm(la2), DOWN), qa);
  const qc = rotTo(nrm(sub(ll.P, ul.P)), DOWN), ll2 = app(qc, sub(ll.end, ll.P)), qd = mulR(rotTo(nrm(ll2), DOWN), qc);
  Q.set(ua.name, qa); Q.set(la.name, qb); for (const j of J) if (sideOf(j.name) === s && groupOf(j.name) === 'hand') Q.set(j.name, qb);
  Q.set(ul.name, qc); Q.set(ll.name, qd);
}
// new positions, parent first: the offset from the parent joint turned by the parent's rotation and stretched by its length
const order = J.slice().sort((a, b) => { const d = (n) => { let k = 0, p = parent[n]; while (p >= 0) { k++; p = parent[p]; } return k; }; return d(a.ni) - d(b.ni); });
const jp = (j) => { let p = parent[j.ni]; while (p >= 0 && !J.some((x) => x.ni === p)) p = parent[p]; return J.find((x) => x.ni === p) || null; };
for (const j of order) {
  const p = jp(j); if (!p) { j.P2 = j.P; continue; }
  const R = Q.get(p.name) || I3, k = PROP[groupOf(p.name)].len;
  j.P2 = add(p.P2, sc(app(R, sub(j.P, p.P)), groupOf(j.name) === 'foot' && groupOf(p.name) !== 'foot' ? 1 : k));
}
for (const s of ['L', 'R']) { const ll = byName['LowerLeg.' + s]; ll.end2 = add(ll.P2, sc(app(Q.get(ll.name), sub(ll.end, ll.P)), PROP.leg.len)); const f = byName['Foot.' + s]; f.P2 = ll.end2; }
// the transform of each joint: x -> P2 + Q * S * (x - P), S the scaling about the bone's own axis (its rest direction)
const K = J.map((j) => {
  const R = Q.get(j.name) || I3, pr = PROP[groupOf(j.name)], ax = j.end ? nrm(sub(j.end, j.P)) : [0, 1, 0];
  const S = (v) => { const along = dot(v, ax); return add(sc(ax, along * pr.len), sc(sub(v, sc(ax, along)), pr.rad)); };
  return { pos: (x) => add(j.P2, app(R, S(sub(x, j.P)))), dir: (n) => { const a = dot(n, ax); return nrm(app(R, add(sc(ax, a / pr.len), sc(sub(n, sc(ax, a)), 1 / pr.rad)))); } };
});
// ---- the texture (embedded PNG) for light and shade
function png(buf) {
  let o = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (o < buf.length) { const L = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + L);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (type === 'IDAT') idat.push(d); o += 12 + L; }
  const bpp = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), out = new Uint8Array(w * h * bpp), st = w * bpp;
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)], row = raw.subarray(y * (st + 1) + 1, (y + 1) * (st + 1));
    for (let x = 0; x < st; x++) { const a = x >= bpp ? out[y * st + x - bpp] : 0, b = y ? out[(y - 1) * st + x] : 0, c = x >= bpp && y ? out[(y - 1) * st + x - bpp] : 0; let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * st + x] = v & 255; } }
  return { w, h, bpp, px: out };
}
const tex = png(view(g.images[0].bufferView));
const lum = (u, v) => { const x = Math.min(tex.w - 1, Math.max(0, Math.round(u * (tex.w - 1)))), y = Math.min(tex.h - 1, Math.max(0, Math.round(v * (tex.h - 1)))), i = (y * tex.w + x) * tex.bpp;
  return (tex.px[i] * .3 + tex.px[i + 1] * .59 + tex.px[i + 2] * .11) / 255; };
// ---- the Knight's bones for each source joint
const MAP = { Root: 'pelvis', Body: 'pelvis', Hips: 'pelvis', Abdomen: 'spine', Torso: 'chest', Neck: 'neck', Head: 'head', 'Shoulder.L': 'chest', 'Shoulder.R': 'chest',
  'UpperLeg.L': 'thighR', 'LowerLeg.L': 'shinR', 'Foot.L': 'footR', 'UpperLeg.R': 'thighL', 'LowerLeg.R': 'shinL', 'Foot.R': 'footL', 'PoleTarget.L': 'pelvis', 'PoleTarget.R': 'pelvis' };
for (const s of ['L', 'R']) { const k = s === 'L' ? 'R' : 'L'; MAP['UpperArm.' + s] = 'arm' + k; MAP['LowerArm.' + s] = 'fore' + k; for (const j of J) if (sideOf(j.name) === s && groupOf(j.name) === 'hand') MAP[j.name] = 'hand' + k; }
// the source faces +Z with +Y up and its left at +X; the Knight's model frame is f forward, r (its +y) and u up: f = Z, r = X, u = Y
const toModel = (p) => [p[2], p[0], p[1]];
// ---- the skinned body
const prim = g.meshes[0].primitives[0], P = read(prim.attributes.POSITION), N = read(prim.attributes.NORMAL), UV = read(prim.attributes.TEXCOORD_0), JO = read(prim.attributes.JOINTS_0), WE = read(prim.attributes.WEIGHTS_0), IX = read(prim.indices);
const mesh = W(node('Rogue')), ibmJ = (j) => ibm.subarray(j * 16, j * 16 + 16);
const verts = [];
for (let v = 0; v < P.count; v++) {
  const p0 = [P.data[v * 3], P.data[v * 3 + 1], P.data[v * 3 + 2]], n0 = [N.data[v * 3], N.data[v * 3 + 1], N.data[v * 3 + 2]];
  let rp = [0, 0, 0], rn = [0, 0, 0], p2 = [0, 0, 0], n2 = [0, 0, 0]; const ws = [];
  for (let k = 0; k < 4; k++) { const w = WE.data[v * 4 + k]; if (w <= 0) continue; const j = JO.data[v * 4 + k], m = mul(W(joints[j]), mul(ibmJ(j), mesh));
    const pr = xf(m, p0), nr = xf(m, n0, 0); rp = add(rp, sc(pr, w)); rn = add(rn, sc(nr, w)); ws.push([j, w]); }
  for (const [j, w] of ws) { p2 = add(p2, sc(K[j].pos(rp), w)); n2 = add(n2, sc(K[j].dir(nrm(rn)), w)); }
  // two heaviest Knight bones
  const acc = {}; for (const [j, w] of ws) { const b = MAP[J[j].name] || 'chest'; acc[b] = (acc[b] || 0) + w; }
  const top = Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 2), sum = top.reduce((s, [, w]) => s + w, 0);
  const head = (acc.head || 0) > .45;
  verts.push({ p: toModel(p2), n: toModel(nrm(n2)), a: top[0][0], b: (top[1] || top[0])[0], w: top[1] ? top[1][1] / sum : 0, l: lum(UV.data[v * 2], UV.data[v * 2 + 1]), head });
}
const tris = []; for (let i = 0; i < IX.count; i += 3) { const a = IX.data[i], b = IX.data[i + 1], c = IX.data[i + 2]; if (verts[a].head || verts[b].head || verts[c].head) continue; tris.push(a, b, c); } // the hood and head: the helm replaces them
// ---- scale: the body's height (feet to the top of the neck) to the Knight's (the helm sits above it)
const used = [...new Set(tris)].sort((a, b) => a - b), remap = new Map(used.map((v, i) => [v, i]));
let zmin = Infinity, zmax = -Infinity; for (const v of used) { zmin = Math.min(zmin, verts[v].p[2]); zmax = Math.max(zmax, verts[v].p[2]); }
const neckTop = toModel(byName.Head.P2)[2], TARGET_NECK = 1.06, k = TARGET_NECK / (neckTop - zmin); // the top of the neck at 1.06 model units (the helm above reaches ~1.33: 1.75 x the Wayfarer at the Knight's scale)
const jointOut = {}; for (const [nm, b] of [['Hips', 'pelvis'], ['Abdomen', 'spine'], ['Torso', 'chest'], ['Neck', 'neck'], ['Head', 'head'], ['UpperArm.L', 'armR'], ['LowerArm.L', 'foreR'], ['Fist.L', 'handR'], ['UpperArm.R', 'armL'], ['LowerArm.R', 'foreL'], ['Fist.R', 'handL'], ['UpperLeg.L', 'thighR'], ['LowerLeg.L', 'shinR'], ['Foot.L', 'footR'], ['UpperLeg.R', 'thighL'], ['LowerLeg.R', 'shinL'], ['Foot.R', 'footL']]) {
  const q = toModel(byName[nm].P2); jointOut[b] = [+(q[0] * k).toFixed(4), +(q[1] * k).toFixed(4), +((q[2] - zmin) * k).toFixed(4)]; }
const pos32 = new Float32Array(used.length * 3), nrm8 = new Int8Array(used.length * 3), bone8 = new Uint8Array(used.length * 2), w8 = new Uint8Array(used.length), lum8 = new Uint8Array(used.length);
const BONES = ['pelvis', 'spine', 'chest', 'neck', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
used.forEach((v, i) => { const x = verts[v]; pos32[i * 3] = x.p[0] * k; pos32[i * 3 + 1] = x.p[1] * k; pos32[i * 3 + 2] = (x.p[2] - zmin) * k;
  for (let c = 0; c < 3; c++) nrm8[i * 3 + c] = Math.round(x.n[c] * 127); bone8[i * 2] = BONES.indexOf(x.a); bone8[i * 2 + 1] = BONES.indexOf(x.b); w8[i] = Math.round(x.w * 255); lum8[i] = Math.round(x.l * 255); });
const idx16 = Uint16Array.from(tris.map((v) => remap.get(v)));
// lighter versions for the balanced and low tiers: vertices on the same bones within a grid cell merge into one (the first
// met), and triangles that collapse are dropped
const lod = (cell) => { const rep = new Map(), map = new Uint32Array(used.length);
  for (let i = 0; i < used.length; i++) { const key = [bone8[i * 2], bone8[i * 2 + 1], Math.floor(pos32[i * 3] / cell), Math.floor(pos32[i * 3 + 1] / cell), Math.floor(pos32[i * 3 + 2] / cell)].join(',');
    if (!rep.has(key)) rep.set(key, i); map[i] = rep.get(key); }
  const out = []; for (let i = 0; i < idx16.length; i += 3) { const a = map[idx16[i]], b = map[idx16[i + 1]], c = map[idx16[i + 2]]; if (a !== b && b !== c && a !== c) out.push(a, b, c); }
  return Uint16Array.from(out); };
const idxBalanced = lod(.03), idxLow = lod(.065);
console.log('balanced', idxBalanced.length / 3, 'low', idxLow.length / 3);
const b64 = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const out = `// Generated by docs/asset-sources/nanobot-knight/convert-knight.mjs from the Quaternius RPG Character Pack Rogue (CC0; provenance in
// docs/asset-sources/wayfarer-rogue/). Do not edit by hand: rerun the converter.
export const KNIGHT_BODY = Object.freeze({
  vertexCount: ${used.length}, triangles: ${idx16.length / 3},
  bones: ${JSON.stringify(BONES)},
  joints: Object.freeze(${JSON.stringify(jointOut)}),
  positions: "${b64(pos32)}", normals: "${b64(nrm8)}", bone: "${b64(bone8)}", weight: "${b64(w8)}", shade: "${b64(lum8)}", indices: "${b64(idx16)}", indicesBalanced: "${b64(idxBalanced)}", indicesLow: "${b64(idxLow)}",
});
`;
writeFileSync(here('../../../src/close-view-beast-knight-body.ts'), out);
console.log('vertices', used.length, 'triangles', idx16.length / 3, 'height', ((zmax - zmin) * k).toFixed(3), 'joints', JSON.stringify(jointOut));
