// The townsfolk's bodies (Tim, 2026-11-13: "every interactable character should have a real 3D body in Close View ... variety,
// not all hoods ... use the RPG Character Pack body pipeline"): two bodies from the Quaternius RPG Character Pack (CC0,
// docs/asset-sources/wayfarer-rogue/: provenance, licence and SHA-256 there), converted for the shared beast rig exactly as the Gaunt,
// the Nanobot Knight and the Void Walker are (docs/asset-sources/hooded-duelist/convert-duelist.mjs):
//
// - `tunic`: the Rogue body (a fitted tunic, breeches, boots and gloves); its hood kept as a separate run (the `hood` and `lining`
//   classes, from `hoodAt`) that the runtime leaves out: every variant wears a head and headwear of its own; the belt and the pouch kept;
//   the face mask, laces and dagger left out.
// - `robe`: the Cleric body (a long-sleeved under-robe with a broad collar); its masked head, shoulder pads and staff left out (every
//   variant wears a head of its own; the runtime hangs the robe's skirt, or a peddler's rags, from the waist).
//
// The proportions are an adult's, not the source's chibi ones: limbs a little longer, the hands and feet smaller, the torso a
// little slimmer (PROP). Each body stands FOLK_HEIGHT model units to the top of its collar; the runtime adds a head and scales the
// whole per variant (close-view-folk.ts). Each vertex keeps its two heaviest joints mapped onto the shared 17-bone human skeleton,
// its light and shade from the source texture, and a colour class the runtime paints per variant.
// Reproducible: `node docs/asset-sources/townsfolk/convert-folk.mjs` rewrites src/close-view-folk-body.ts.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const PROV = JSON.parse(readFileSync(here('../wayfarer-rogue/provenance.json'), 'utf8'));

// ---- the proportions: `len` along each bone, `rad` across it
const PROP = Object.freeze({
  tunic: { leg: { len: 1.14, rad: .86 }, arm: { len: 1.1, rad: .8 }, torso: { len: 1.06, rad: .9 }, waist: { len: 1.06, rad: .88 }, hips: { len: 1.04, rad: .92 },
    hand: { len: .8, rad: .8 }, foot: { len: .9, rad: .85 }, neck: { len: 1.1, rad: .8 }, head: { len: 1, rad: 1 } },
  robe: { leg: { len: 1.12, rad: .9 }, arm: { len: 1.08, rad: .82 }, torso: { len: 1.06, rad: .9 }, waist: { len: 1.06, rad: .9 }, hips: { len: 1.04, rad: .95 },
    hand: { len: .8, rad: .8 }, foot: { len: .9, rad: .85 }, neck: { len: 1.1, rad: .8 }, head: { len: 1, rad: 1 } },
});
// The Wayfarer's Close View height (close-view.ts: 1.68 x .82 tiles); a townsperson's head top stands about .97 x that before its
// variant's own height. The body is scaled so its pelvis-to-collar torso and legs match: the collar at COLLAR of that height.
const WAYFARER_CV_HEIGHT = 1.68 * .82, FOLK_HEIGHT = WAYFARER_CV_HEIGHT * .97, COLLAR = .8;
const SOURCES = {
  tunic: { file: 'Rogue.gltf.gz', sha: PROV.archiveSha256, body: 'Rogue', rigid: [['Belt', 'Abdomen', 'belt'], ['Pouch', 'Abdomen', 'pouch']], headCut: 2.0 },
  robe: { file: 'Cleric.gltf.gz', sha: PROV.headSource.archiveSha256, body: 'Cleric', rigid: [], headCut: 2.2 },
};
const CLASSES = ['cloth', 'clothDark', 'trim', 'leather', 'hand', 'boot', 'hood', 'lining', 'belt', 'pouch', 'collar'];

function convert(id) {
  const S = SOURCES[id], P = PROP[id];
  const raw = readFileSync(here('../wayfarer-rogue/' + S.file));
  if (createHash('sha256').update(raw).digest('hex') !== S.sha) throw new Error(`${S.file}: archive hash`);
  const g = JSON.parse(gunzipSync(raw));
  const bin = Buffer.from(g.buffers[0].uri.split(',')[1], 'base64');
  const view = (i) => { const v = g.bufferViews[i]; return bin.subarray((v.byteOffset || 0), (v.byteOffset || 0) + v.byteLength); };
  const read = (ai) => { const a = g.accessors[ai], v = g.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
    const T = { 5126: Float32Array, 5123: Uint16Array, 5121: Uint8Array, 5125: Uint32Array }[a.componentType], stride = v.byteStride || n * T.BYTES_PER_ELEMENT, out = new Float64Array(a.count * n);
    const base = (v.byteOffset || 0) + (a.byteOffset || 0);
    for (let i = 0; i < a.count; i++) { const o = base + i * stride; const arr = new T(bin.buffer.slice(bin.byteOffset + o, bin.byteOffset + o + n * T.BYTES_PER_ELEMENT)); for (let k = 0; k < n; k++) out[i * n + k] = arr[k]; }
    return { data: out, n, count: a.count }; };
  const mul = (a, b) => { const o = new Float64Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
  const trs = (n) => { const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1], [x, y, z, w] = q;
    return Float64Array.from([(1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0, 2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
      2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1]); };
  const world = new Array(g.nodes.length), parent = new Array(g.nodes.length).fill(-1);
  g.nodes.forEach((n, i) => (n.children || []).forEach((c) => { parent[c] = i; }));
  const W = (i) => world[i] ||= parent[i] < 0 ? trs(g.nodes[i]) : mul(W(parent[i]), trs(g.nodes[i]));
  const xf = (m, p, w = 1) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12] * w, m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13] * w, m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14] * w];
  const node = (nm) => g.nodes.findIndex((n) => n.name === nm), pos = (nm) => xf(W(node(nm)), [0, 0, 0]);
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const len = (a) => Math.hypot(...a), nrm = (a) => sc(a, 1 / (len(a) || 1)), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const rotTo = (a, b) => { const v = cross(a, b), c = dot(a, b), k = 1 / (1 + c), [x, y, z] = v;
    return [[c + x * x * k, x * y * k - z, x * z * k + y], [y * x * k + z, c + y * y * k, y * z * k - x], [z * x * k - y, z * y * k + x, c + z * z * k]]; };
  const app = (R, p) => [dot(R[0], p), dot(R[1], p), dot(R[2], p)];
  const DOWN = [0, -1, 0];
  const sideOf = (nm) => nm.endsWith('.L') ? 'L' : nm.endsWith('.R') ? 'R' : '';
  const groupOf = (nm) => /UpperLeg|LowerLeg/.test(nm) ? 'leg' : /UpperArm|LowerArm/.test(nm) ? 'arm' : /Fist|Thumb|Weapon/.test(nm) ? 'hand' : /Foot|Shoelace/.test(nm) ? 'foot' : /Neck/.test(nm) ? 'neck' : /Head/.test(nm) ? 'head' : /Abdomen/.test(nm) ? 'waist' : /Hips/.test(nm) ? 'hips' : 'torso';
  const skin = g.skins[0], joints = skin.joints, ibm = read(skin.inverseBindMatrices).data;
  const J = joints.map((ni) => ({ ni, name: g.nodes[ni].name, P: pos(g.nodes[ni].name) }));
  const byName = Object.fromEntries(J.map((j) => [j.name, j]));
  const child = (nm) => ({ 'UpperArm.L': 'LowerArm.L', 'LowerArm.L': 'Fist.L', 'UpperArm.R': 'LowerArm.R', 'LowerArm.R': 'Fist.R', 'UpperLeg.L': 'LowerLeg.L', 'UpperLeg.R': 'LowerLeg.R',
    Hips: 'Abdomen', Abdomen: 'Torso', Torso: 'Neck', Neck: 'Head' })[nm];
  for (const s of ['L', 'R']) byName['LowerLeg.' + s].end = byName['Foot.' + s].P;
  for (const j of J) { j.end ||= child(j.name) ? byName[child(j.name)].P : null; }
  // re-pose: the arms hang straight down from the shoulders and the legs straight down from the hips
  const Q = new Map(); const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], mulR = (A, B) => A.map((r) => [0, 1, 2].map((c) => r[0] * B[0][c] + r[1] * B[1][c] + r[2] * B[2][c]));
  for (const s of ['L', 'R']) {
    const ua = byName['UpperArm.' + s], la = byName['LowerArm.' + s], ul = byName['UpperLeg.' + s], ll = byName['LowerLeg.' + s];
    const qa = rotTo(nrm(sub(la.P, ua.P)), DOWN), la2 = app(qa, sub(la.end, la.P)), qb = mulR(rotTo(nrm(la2), DOWN), qa);
    const qc = rotTo(nrm(sub(ll.P, ul.P)), DOWN), ll2 = app(qc, sub(ll.end, ll.P)), qd = mulR(rotTo(nrm(ll2), DOWN), qc);
    Q.set(ua.name, qa); Q.set(la.name, qb); for (const j of J) if (sideOf(j.name) === s && groupOf(j.name) === 'hand') Q.set(j.name, qb);
    Q.set(ul.name, qc); Q.set(ll.name, qd);
  }
  const order = J.slice().sort((a, b) => { const d = (n) => { let k = 0, p = parent[n]; while (p >= 0) { k++; p = parent[p]; } return k; }; return d(a.ni) - d(b.ni); });
  const jp = (j) => { let p = parent[j.ni]; while (p >= 0 && !J.some((x) => x.ni === p)) p = parent[p]; return J.find((x) => x.ni === p) || null; };
  for (const j of order) {
    const p = jp(j); if (!p) { j.P2 = j.P; continue; }
    const R = Q.get(p.name) || I3, k = P[groupOf(p.name)].len;
    j.P2 = add(p.P2, sc(app(R, sub(j.P, p.P)), groupOf(j.name) === 'foot' && groupOf(p.name) !== 'foot' ? 1 : k));
  }
  for (const s of ['L', 'R']) { const ll = byName['LowerLeg.' + s]; ll.end2 = add(ll.P2, sc(app(Q.get(ll.name), sub(ll.end, ll.P)), P.leg.len)); const f = byName['Foot.' + s]; f.P2 = ll.end2; }
  const axisOf = (j) => j.end ? nrm(sub(j.end, j.P)) : [0, 1, 0];
  const K = J.map((j) => {
    const R = Q.get(j.name) || I3, pr = P[groupOf(j.name)], ax = axisOf(j);
    const Sx = (v) => { const along = dot(v, ax); return add(sc(ax, along * pr.len), sc(sub(v, sc(ax, along)), pr.rad)); };
    return { pos: (x) => add(j.P2, app(R, Sx(sub(x, j.P)))), dir: (n) => { const a = dot(n, ax); return nrm(app(R, add(sc(ax, a / pr.len), sc(sub(n, sc(ax, a)), 1 / pr.rad)))); } };
  });
  // ---- the texture (embedded PNG) for light, shade and the colour class
  function png(buf) {
    let o = 8, w = 0, h = 0, ct = 0; const idat = [];
    while (o < buf.length) { const L = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + L);
      if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (type === 'IDAT') idat.push(d); o += 12 + L; }
    const bpp = ct === 6 ? 4 : 3, rw = inflateSync(Buffer.concat(idat)), out = new Uint8Array(w * h * bpp), st = w * bpp;
    for (let y = 0; y < h; y++) { const f = rw[y * (st + 1)], row = rw.subarray(y * (st + 1) + 1, (y + 1) * (st + 1));
      for (let x = 0; x < st; x++) { const a = x >= bpp ? out[y * st + x - bpp] : 0, b = y ? out[(y - 1) * st + x] : 0, c = x >= bpp && y ? out[(y - 1) * st + x - bpp] : 0; let v = row[x];
        if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        out[y * st + x] = v & 255; } }
    return { w, h, bpp, px: out };
  }
  const tex = png(view(g.images[0].bufferView));
  const rgb = (u, v) => { const x = Math.min(tex.w - 1, Math.max(0, Math.round(u * (tex.w - 1)))), y = Math.min(tex.h - 1, Math.max(0, Math.round(v * (tex.h - 1)))), i = (y * tex.w + x) * tex.bpp; return [tex.px[i], tex.px[i + 1], tex.px[i + 2]]; };
  const lumOf = ([r, gg, b]) => (r * .3 + gg * .59 + b * .11) / 255;
  // The colour classes. The Rogue: its red cloth is the variant's main cloth, its deep red scarf the trim, its black breeches the
  // dark cloth, its olive and brown straps the leather; on the head, the hood's cloth and its light lining. The Cleric: its brown
  // robe the cloth, its pale bands the trim, its dark under-robe the dark cloth.
  const classOf = (c, bone, hood) => {
    const [r, gg, b] = c, l = lumOf(c);
    if (hood) return l > .3 ? 'lining' : 'hood';
    if (/hand/.test(bone)) return 'hand';
    if (/foot/.test(bone)) return 'boot';
    if (id === 'tunic') {
      if (r > 40 && gg < 16) return 'trim';
      if (r > gg * 1.45 && r > b * 1.45) return 'cloth';
      if (r > 56 && gg > 36 && b < gg) return 'leather';
      return 'clothDark';
    }
    if (l > .42) return 'trim';
    if (l < .19) return 'clothDark';
    if (r > b * 1.35 && gg > b * 1.1 && l < .3) return 'cloth';
    return gg >= r * .95 ? 'clothDark' : 'cloth';
  };
  // ---- the shared skeleton's bones for each source joint (the source faces +Z with +Y up and its left at +X: f = Z, r = X, u = Y)
  const MAP = { Root: 'pelvis', Body: 'pelvis', Hips: 'pelvis', Abdomen: 'spine', Torso: 'chest', Neck: 'neck', Head: 'head', 'Shoulder.L': 'chest', 'Shoulder.R': 'chest',
    'UpperLeg.L': 'thighR', 'LowerLeg.L': 'shinR', 'Foot.L': 'footR', 'UpperLeg.R': 'thighL', 'LowerLeg.R': 'shinL', 'Foot.R': 'footL', 'PoleTarget.L': 'pelvis', 'PoleTarget.R': 'pelvis' };
  for (const s of ['L', 'R']) { const k = s === 'L' ? 'R' : 'L'; MAP['UpperArm.' + s] = 'arm' + k; MAP['LowerArm.' + s] = 'fore' + k; for (const j of J) if (sideOf(j.name) === s && groupOf(j.name) === 'hand') MAP[j.name] = 'hand' + k; }
  const toModel = (p) => [p[2], p[0], p[1]];
  const verts = [], tris = [], triHood = [];
  const meshW = W(node(S.body)), ibmJ = (j) => ibm.subarray(j * 16, j * 16 + 16);
  function addMesh(nodeName, rigid) {
    const ni = node(nodeName), prim = g.meshes[g.nodes[ni].mesh].primitives[0], Pp = read(prim.attributes.POSITION), N = read(prim.attributes.NORMAL), UV = read(prim.attributes.TEXCOORD_0), IX = read(prim.indices);
    const JO = rigid ? null : read(prim.attributes.JOINTS_0), WE = rigid ? null : read(prim.attributes.WEIGHTS_0), first = verts.length, srcY = [];
    for (let v = 0; v < Pp.count; v++) {
      const p0 = [Pp.data[v * 3], Pp.data[v * 3 + 1], Pp.data[v * 3 + 2]], n0 = [N.data[v * 3], N.data[v * 3 + 1], N.data[v * 3 + 2]];
      let rp = [0, 0, 0], rn = [0, 0, 0]; const ws = [];
      if (rigid) { const m = W(ni); rp = xf(m, p0); rn = xf(m, n0, 0); ws.push([joints.indexOf(node(rigid.joint)), 1]); }
      else for (let k = 0; k < 4; k++) { const w = WE.data[v * 4 + k]; if (w <= 0) continue; const j = JO.data[v * 4 + k], m = mul(W(joints[j]), mul(ibmJ(j), meshW));
        rp = add(rp, sc(xf(m, p0), w)); rn = add(rn, sc(xf(m, n0, 0), w)); ws.push([j, w]); }
      srcY.push(rp[1]);
      let p2 = [0, 0, 0], n2 = [0, 0, 0]; for (const [j, w] of ws) { p2 = add(p2, sc(K[j].pos(rp), w)); n2 = add(n2, sc(K[j].dir(nrm(rn)), w)); }
      const acc = {}; for (const [j, w] of ws) { const b = MAP[J[j].name] || 'chest'; acc[b] = (acc[b] || 0) + w; }
      const top = Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 2), sum = top.reduce((s, [, w]) => s + w, 0);
      const c = rgb(UV.data[v * 2], UV.data[v * 2 + 1]);
      verts.push({ p: toModel(p2), n: toModel(nrm(n2)), a: top[0][0], b: (top[1] || top[0])[0], w: top[1] ? top[1][1] / sum : 0, l: lumOf(c), c, bone: top[0][0], head: acc.head || 0, rigid: rigid?.cls || null });
    }
    for (let i = 0; i < IX.count; i += 3) {
      const t = [first + IX.data[i], first + IX.data[i + 1], first + IX.data[i + 2]], hood = !rigid && Math.max(...t.map((q) => srcY[q - first])) > S.headCut;
      tris.push(...t); triHood.push(hood);
    }
  }
  addMesh(S.body, null);
  for (const [nm, joint, cls] of S.rigid) addMesh(nm, { joint, cls });
  // classes: a vertex used by a head triangle (the hood) is classed on the head; the rest by its colour
  const onHood = new Uint8Array(verts.length); for (let t = 0; t < triHood.length; t++) if (triHood[t]) for (let k = 0; k < 3; k++) onHood[tris[t * 3 + k]] = 1;
  for (let v = 0; v < verts.length; v++) { const x = verts[v]; x.cls = x.rigid || classOf(x.c, x.bone, !!onHood[v]); }
  // a hood triangle whose vertices are all hood or lining stays optional; the robe has none (its neck is the collar class)
  if (id === 'robe') for (let v = 0; v < verts.length; v++) if (!verts[v].rigid && (verts[v].head > .5 || /neck/.test(verts[v].bone))) verts[v].cls = 'collar';
  // ---- scale: the collar (the base of the neck) at COLLAR x FOLK_HEIGHT model units
  const used = [...new Set(tris)].sort((a, b) => a - b), remap = new Map(used.map((v, i) => [v, i]));
  let zmin = Infinity; for (const v of used) zmin = Math.min(zmin, verts[v].p[2]);
  const neckZ = toModel(byName.Neck.P2)[2], k = COLLAR * FOLK_HEIGHT / (neckZ - zmin);
  let zmax = -Infinity; for (let t = 0; t < triHood.length; t++) if (!triHood[t]) for (let q = 0; q < 3; q++) zmax = Math.max(zmax, verts[tris[t * 3 + q]].p[2]);
  const jointOut = {}; for (const [nm, b] of [['Hips', 'pelvis'], ['Abdomen', 'spine'], ['Torso', 'chest'], ['Neck', 'neck'], ['Head', 'head'], ['UpperArm.L', 'armR'], ['LowerArm.L', 'foreR'], ['Fist.L', 'handR'], ['UpperArm.R', 'armL'], ['LowerArm.R', 'foreL'], ['Fist.R', 'handL'], ['UpperLeg.L', 'thighR'], ['LowerLeg.L', 'shinR'], ['Foot.L', 'footR'], ['UpperLeg.R', 'thighL'], ['LowerLeg.R', 'shinL'], ['Foot.R', 'footL']]) {
    const q = toModel(byName[nm].P2); jointOut[b] = [+(q[0] * k).toFixed(4), +(q[1] * k).toFixed(4), +((q[2] - zmin) * k).toFixed(4)]; }
  const BONES = ['pelvis', 'spine', 'chest', 'neck', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
  const pos32 = new Float32Array(used.length * 3), nrm8 = new Int8Array(used.length * 3), bone8 = new Uint8Array(used.length * 2), w8 = new Uint8Array(used.length), lum8 = new Uint8Array(used.length), cls8 = new Uint8Array(used.length);
  used.forEach((v, i) => { const x = verts[v]; pos32[i * 3] = x.p[0] * k; pos32[i * 3 + 1] = x.p[1] * k; pos32[i * 3 + 2] = (x.p[2] - zmin) * k;
    for (let c = 0; c < 3; c++) nrm8[i * 3 + c] = Math.round(x.n[c] * 127); bone8[i * 2] = BONES.indexOf(x.a); bone8[i * 2 + 1] = BONES.indexOf(x.b); w8[i] = Math.round(x.w * 255); lum8[i] = Math.round(x.l * 255); cls8[i] = CLASSES.indexOf(x.cls); });
  // the triangles: the always-drawn body first, then the optional hood (indices from `hoodAt`), then the optional rigid parts are
  // marked by their class (the runtime leaves a part out by its class)
  const body = [], hood = []; for (let t = 0; t < triHood.length; t++) (triHood[t] ? hood : body).push(remap.get(tris[t * 3]), remap.get(tris[t * 3 + 1]), remap.get(tris[t * 3 + 2]));
  const idx16 = Uint16Array.from([...body, ...hood]), hoodAt = body.length;
  // lighter versions for the balanced and low tiers: vertices on the same bones and class within a grid cell merge into one (the first
  // met), and triangles that collapse are dropped; the hood keeps its own run
  const lod = (cell) => { const rep = new Map(), map = new Uint32Array(used.length);
    for (let i = 0; i < used.length; i++) { const key = [bone8[i * 2], bone8[i * 2 + 1], cls8[i], Math.floor(pos32[i * 3] / cell), Math.floor(pos32[i * 3 + 1] / cell), Math.floor(pos32[i * 3 + 2] / cell)].join(',');
      if (!rep.has(key)) rep.set(key, i); map[i] = rep.get(key); }
    const run = (list) => { const out = []; for (let i = 0; i < list.length; i += 3) { const a = map[list[i]], b = map[list[i + 1]], c = map[list[i + 2]]; if (a !== b && b !== c && a !== c) out.push(a, b, c); } return out; };
    const b = run(body), h = run(hood); return { idx: Uint16Array.from([...b, ...h]), hoodAt: b.length }; };
  const balanced = lod(.03), low = lod(.062);
  const b64 = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
  const hist = {}; for (const v of used) hist[verts[v].cls] = (hist[verts[v].cls] || 0) + 1;
  console.log(id, 'vertices', used.length, 'triangles', idx16.length / 3, '(hood', (idx16.length - hoodAt) / 3, ') balanced', balanced.idx.length / 3, 'low', low.idx.length / 3, 'top', ((zmax - zmin) * k).toFixed(3), JSON.stringify(hist));
  return `  ${id}: Object.freeze({
    vertexCount: ${used.length}, triangles: ${idx16.length / 3}, trianglesBalanced: ${balanced.idx.length / 3}, trianglesLow: ${low.idx.length / 3}, collarTop: ${+((zmax - zmin) * k).toFixed(4)},
    proportions: Object.freeze(${JSON.stringify(P)}),
    joints: Object.freeze(${JSON.stringify(jointOut)}),
    positions: "${b64(pos32)}", normals: "${b64(nrm8)}", bone: "${b64(bone8)}", weight: "${b64(w8)}", shade: "${b64(lum8)}", cls: "${b64(cls8)}",
    indices: "${b64(idx16)}", hoodAt: ${hoodAt}, indicesBalanced: "${b64(balanced.idx)}", hoodAtBalanced: ${balanced.hoodAt}, indicesLow: "${b64(low.idx)}", hoodAtLow: ${low.hoodAt},
  }),
`;
}
const out = `// Generated by docs/asset-sources/townsfolk/convert-folk.mjs from the Quaternius RPG Character Pack Rogue and Cleric (CC0; provenance
// in docs/asset-sources/wayfarer-rogue/). Do not edit by hand: rerun the converter.
export const FOLK_BODY_HEIGHT = ${+FOLK_HEIGHT.toFixed(4)};
export const FOLK_BODY_CLASSES = Object.freeze(${JSON.stringify(CLASSES)});
export const FOLK_BODY_BONES = Object.freeze(["pelvis","spine","chest","neck","head","armL","foreL","handL","armR","foreR","handR","thighL","shinL","footL","thighR","shinR","footR"]);
export const FOLK_BODIES = Object.freeze({
${convert('tunic')}${convert('robe')}});
`;
writeFileSync(here('../../../src/close-view-folk-body.ts'), out);
