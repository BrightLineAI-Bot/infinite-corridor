// Offline binary-FBX reader for the creature importer. It parses the node tree as data (zlib arrays through node:zlib) and
// builds the importer's normalized rig: models as nodes, skinned geometry, materials, and each animation stack resampled
// into linear TRS channels. Nothing in a source file is executed.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { eulerXYZ, qmul, qinv, invert } from './math.mjs';

const TICKS = 46186158000;

function parseTree(buf) {
  if (buf.subarray(0, 20).toString('latin1') !== 'Kaydara FBX Binary  ') throw new Error('not a binary FBX');
  const version = buf.readUInt32LE(23), wide = version >= 7500;
  let pos = 27;
  const u = () => { const v = wide ? Number(buf.readBigUInt64LE(pos)) : buf.readUInt32LE(pos); pos += wide ? 8 : 4; return v; };
  function prop() {
    const t = String.fromCharCode(buf[pos++]);
    switch (t) {
      case 'Y': pos += 2; return buf.readInt16LE(pos - 2);
      case 'C': pos += 1; return !!buf[pos - 1];
      case 'I': pos += 4; return buf.readInt32LE(pos - 4);
      case 'F': pos += 4; return buf.readFloatLE(pos - 4);
      case 'D': pos += 8; return buf.readDoubleLE(pos - 8);
      case 'L': pos += 8; return buf.readBigInt64LE(pos - 8);
      case 'S': case 'R': { const n = buf.readUInt32LE(pos); pos += 4; const s = buf.subarray(pos, pos + n); pos += n; return t === 'S' ? s.toString('latin1') : Buffer.from(s); }
      case 'f': case 'd': case 'l': case 'i': case 'b': {
        const len = buf.readUInt32LE(pos), enc = buf.readUInt32LE(pos + 4), clen = buf.readUInt32LE(pos + 8); pos += 12;
        let data = buf.subarray(pos, pos + clen); pos += clen;
        if (enc === 1) data = inflateSync(data);
        const size = { f: 4, d: 8, l: 8, i: 4, b: 1 }[t];
        if (data.length < len * size) throw new Error('short FBX array');
        const out = t === 'f' ? new Float32Array(len) : t === 'd' ? new Float64Array(len) : t === 'i' ? new Int32Array(len) : t === 'b' ? new Uint8Array(len) : new Array(len);
        for (let k = 0; k < len; k++) out[k] = t === 'f' ? data.readFloatLE(k * 4) : t === 'd' ? data.readDoubleLE(k * 8) : t === 'i' ? data.readInt32LE(k * 4) : t === 'b' ? data[k] : data.readBigInt64LE(k * 8);
        return out;
      }
      default: throw new Error('unknown FBX property type ' + t);
    }
  }
  function node() {
    const end = u(), nprops = u(); u();
    const nameLen = buf[pos++];
    if (end === 0) return null;
    const name = buf.subarray(pos, pos + nameLen).toString('latin1'); pos += nameLen;
    const props = [];
    for (let i = 0; i < nprops; i++) props.push(prop());
    const children = [];
    while (pos < end) { const c = node(); if (!c) break; children.push(c); }
    pos = end;
    return { name, props, children };
  }
  const top = [];
  while (pos < buf.length - 160) { const n = node(); if (!n) break; top.push(n); }
  return { version, top };
}

const child = (n, name) => n.children.find(c => c.name === name);
function props70(n) {
  const out = {}, p = n && child(n, 'Properties70');
  if (p) for (const c of p.children) out[c.props[0]] = c.props.slice(4);
  return out;
}
const id = (v) => String(v);
const cleanName = (s) => String(s).split('\x00')[0];

export function readFbx(file) {
  const { version, top } = parseTree(readFileSync(file));
  const objects = top.find(n => n.name === 'Objects'), conns = top.find(n => n.name === 'Connections');
  const globalSettings = top.find(n => n.name === 'GlobalSettings'), settings = globalSettings ? props70(globalSettings) : {};
  const byId = new Map();
  for (const o of objects.children) byId.set(id(o.props[0]), o);
  const parentsOf = new Map(), childrenOf = new Map();
  for (const c of conns.children) {
    const [type, a, b, prop] = c.props, ca = id(a), cb = id(b);
    if (!parentsOf.has(ca)) parentsOf.set(ca, []);
    parentsOf.get(ca).push({ id: cb, type, prop });
    if (!childrenOf.has(cb)) childrenOf.set(cb, []);
    childrenOf.get(cb).push({ id: ca, type, prop });
  }
  const models = objects.children.filter(o => o.name === 'Model');
  const nodeIndex = new Map(models.map((m, i) => [id(m.props[0]), i]));
  const nodes = models.map((m) => {
    const p = props70(m);
    if ((p.RotationOrder?.[0] ?? 0) !== 0) throw new Error('unsupported rotation order on ' + cleanName(m.props[1]));
    const pre = eulerXYZ(p.PreRotation || [0, 0, 0]), post = eulerXYZ(p.PostRotation || [0, 0, 0]);
    const rq = (deg) => qmul(qmul(pre, eulerXYZ(deg)), qinv(post));
    const parentModel = (parentsOf.get(id(m.props[0])) || []).find(q => nodeIndex.has(q.id));
    return { name: cleanName(m.props[1]), type: m.props[2], parent: parentModel ? nodeIndex.get(parentModel.id) : -1,
      t: (p['Lcl Translation'] || [0, 0, 0]).map(Number), r: rq((p['Lcl Rotation'] || [0, 0, 0]).map(Number)), s: (p['Lcl Scaling'] || [1, 1, 1]).map(Number), rq,
      geomT: (p.GeometricTranslation || [0, 0, 0]).map(Number), geomR: (p.GeometricRotation || [0, 0, 0]).map(Number), geomS: (p.GeometricScaling || [1, 1, 1]).map(Number) };
  });
  // materials, in global order
  const materialObjs = objects.children.filter(o => o.name === 'Material');
  const matIndex = new Map(materialObjs.map((m, i) => [id(m.props[0]), i]));
  const materials = materialObjs.map((m) => { const p = props70(m), c = p.DiffuseColor || p.Diffuse || [1, 1, 1]; return { name: cleanName(m.props[1]), color: c.slice(0, 3).map(Number), textured: false }; });
  const textures = objects.children.filter(o => o.name === 'Texture').length;
  // BindPose matrices (global, at bind) by model id
  const bindPose = new Map();
  for (const pose of objects.children.filter(o => o.name === 'Pose' && o.props[2] === 'BindPose'))
    for (const pn of pose.children.filter(c => c.name === 'PoseNode')) bindPose.set(id(child(pn, 'Node').props[0]), Float64Array.from(child(pn, 'Matrix').props[0]));
  // geometry
  const meshes = [];
  for (const g of objects.children.filter(o => o.name === 'Geometry' && o.props[2] === 'Mesh')) {
    const gid = id(g.props[0]);
    const modelLink = (parentsOf.get(gid) || []).find(q => nodeIndex.has(q.id));
    if (!modelLink) continue;
    const ni = nodeIndex.get(modelLink.id), modelMats = (childrenOf.get(modelLink.id) || []).filter(q => matIndex.has(q.id)).map(q => matIndex.get(q.id));
    const verts = child(g, 'Vertices').props[0], poly = child(g, 'PolygonVertexIndex').props[0];
    const lem = child(g, 'LayerElementMaterial');
    const mapping = lem ? child(lem, 'MappingInformationType').props[0] : 'AllSame', polyMats = lem ? child(lem, 'Materials').props[0] : [0];
    const tris = [], triMat = [];
    let start = 0, pi = 0;
    for (let k = 0; k < poly.length; k++) {
      if (poly[k] < 0) {
        const ring = [];
        for (let j = start; j <= k; j++) ring.push(poly[j] < 0 ? ~poly[j] : poly[j]);
        for (let j = 1; j + 1 < ring.length; j++) { tris.push(ring[0], ring[j], ring[j + 1]); triMat.push(modelMats[mapping === 'AllSame' ? polyMats[0] : polyMats[pi]] ?? -1); }
        start = k + 1; pi++;
      }
    }
    // skin
    const vcount = verts.length / 3, joints = new Uint16Array(vcount * 4), weights = new Float32Array(vcount * 4), jointNodes = [], inv = [];
    const skin = (childrenOf.get(gid) || []).map(q => byId.get(q.id)).find(o => o?.name === 'Deformer' && o.props[2] === 'Skin');
    const meshBind = skin ? bindPose.get(modelLink.id) : null;
    if (skin && !meshBind) throw new Error('skinned mesh without a BindPose matrix');
    if (skin) {
      for (const q of childrenOf.get(id(skin.props[0])) || []) {
        const cl = byId.get(q.id);
        if (cl?.name !== 'Deformer' || cl.props[2] !== 'Cluster') continue;
        const bone = (childrenOf.get(q.id) || []).find(r => nodeIndex.has(r.id));
        if (!bone) continue;
        const idx = child(cl, 'Indexes')?.props[0] || [], w = child(cl, 'Weights')?.props[0] || [];
        const T = Float64Array.from(child(cl, 'Transform').props[0]), TL = Float64Array.from(child(cl, 'TransformLink').props[0]);
        const k = jointNodes.length;
        jointNodes.push(nodeIndex.get(bone.id));
        // Bind space (as three.js's FBXLoader reads it): a joint's inverse bind is inv(TransformLink) and the vertices are
        // moved once by the mesh's matrix in the BindPose (below); the cluster's own Transform is not used.
        void T;
        inv.push(...invert(TL));
        for (let j = 0; j < idx.length; j++) {
          const v = idx[j], o = v * 4;
          let slot = -1, minW = Infinity;
          for (let s = 0; s < 4; s++) if (weights[o + s] < minW) { minW = weights[o + s]; slot = s; }
          if (w[j] > minW) { weights[o + slot] = w[j]; joints[o + slot] = k; }
        }
      }
    }
    const positions = Float32Array.from(verts);
    if (meshBind) for (let v = 0; v < vcount; v++) { const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2], M = meshBind; positions[v * 3] = M[0] * x + M[4] * y + M[8] * z + M[12]; positions[v * 3 + 1] = M[1] * x + M[5] * y + M[9] * z + M[13]; positions[v * 3 + 2] = M[2] * x + M[6] * y + M[10] * z + M[14]; }
    meshes.push({ node: ni, material: -2, triMaterial: triMat, positions, indices: Uint32Array.from(tris),
      joints: skin ? joints : null, weights: skin ? weights : null, jointNodes: skin ? jointNodes : null, inverseBind: skin ? Float64Array.from(inv) : null,
      fbxSkinMeshSpace: !!skin });
  }
  // animation stacks -> clips resampled at 30 fps into linear TRS channels
  const clips = [];
  const curveVals = (cid) => { const c = byId.get(cid); return { times: Array.from(child(c, 'KeyTime').props[0], v => Number(v) / TICKS), values: Array.from(child(c, 'KeyValueFloat').props[0]) }; };
  const evalCurve = (c, t) => {
    const { times, values } = c, n = times.length;
    if (!n) return 0;
    if (t <= times[0]) return values[0];
    if (t >= times[n - 1]) return values[n - 1];
    let k = 0; while (k < n - 2 && times[k + 1] < t) k++;
    const u = (t - times[k]) / (times[k + 1] - times[k] || 1);
    return values[k] + (values[k + 1] - values[k]) * u;
  };
  for (const stack of objects.children.filter(o => o.name === 'AnimationStack')) {
    const sid = id(stack.props[0]);
    const layers = (childrenOf.get(sid) || []).map(q => q.id).filter(q => byId.get(q)?.name === 'AnimationLayer');
    const tracks = new Map();
    let t0 = Infinity, t1 = -Infinity;
    for (const lid of layers) for (const q of childrenOf.get(lid) || []) {
      const cn = byId.get(q.id);
      if (cn?.name !== 'AnimationCurveNode') continue;
      const target = (parentsOf.get(q.id) || []).find(r => nodeIndex.has(r.id) && /^Lcl /.test(r.prop || ''));
      if (!target) continue;
      const axes = {};
      for (const r of childrenOf.get(q.id) || []) if (byId.get(r.id)?.name === 'AnimationCurve') { const c = curveVals(r.id); axes[r.prop.replace('d|', '')] = c; if (c.times.length) { t0 = Math.min(t0, c.times[0]); t1 = Math.max(t1, c.times[c.times.length - 1]); } }
      const def = props70(cn);
      const key = nodeIndex.get(target.id) + ':' + target.prop;
      tracks.set(key, { node: nodeIndex.get(target.id), prop: target.prop, axes, def: ['X', 'Y', 'Z'].map(a => Number(def['d|' + a]?.[0] ?? 0)) });
    }
    if (!tracks.size) continue;
    if (!Number.isFinite(t0)) { t0 = 0; t1 = 0; }
    const fps = 30, frames = Math.max(1, Math.round((t1 - t0) * fps)) + 1, times = Float32Array.from({ length: frames }, (_, k) => Math.min(t1 - t0, k / fps));
    const channels = [];
    for (const tr of tracks.values()) {
      const path = tr.prop === 'Lcl Translation' ? 'translation' : tr.prop === 'Lcl Rotation' ? 'rotation' : tr.prop === 'Lcl Scaling' ? 'scale' : null;
      if (!path) continue;
      const w = path === 'rotation' ? 4 : 3, values = new Float32Array(frames * w);
      for (let k = 0; k < frames; k++) {
        const v = ['X', 'Y', 'Z'].map((a, i) => tr.axes[a] ? evalCurve(tr.axes[a], t0 + times[k]) : tr.def[i]);
        values.set(path === 'rotation' ? nodes[tr.node].rq(v) : v, k * w);
      }
      channels.push({ node: tr.node, path, interp: 'LINEAR', times, values });
    }
    clips.push({ name: cleanName(stack.props[1]).replace(/^.*\|/, ''), duration: t1 - t0, channels });
  }
  const joints = [...new Set(meshes.flatMap(m => m.jointNodes || []))];
  const up = Number(settings.UpAxis?.[0] ?? 1);
  return { format: 'FBX ' + version, generator: '', nodes, materials, meshes, clips, joints, textures, upAxis: ['x', 'y', 'z'][up] || 'y', unitScale: Number(settings.UnitScaleFactor?.[0] ?? 1) };
}
