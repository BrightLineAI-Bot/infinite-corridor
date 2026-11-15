// Offline glTF 2.0 reader for the creature importer: JSON plus embedded (data URI) or sibling .bin buffers.
// Reads data only; nothing in a source file is executed. Returns the importer's normalized rig (see rig.mjs).
import { readFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';

const COMPONENTS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const WIDTH = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export function readGltf(file) {
  let json, glbBin = null;
  const raw = readFileSync(file);
  if (raw.readUInt32LE(0) === 0x46546c67) {
    const jsonLen = raw.readUInt32LE(12);
    json = JSON.parse(raw.subarray(20, 20 + jsonLen).toString('utf8'));
    const binStart = 20 + jsonLen;
    if (binStart + 8 <= raw.length) glbBin = raw.subarray(binStart + 8, binStart + 8 + raw.readUInt32LE(binStart));
  } else json = JSON.parse(raw.toString('utf8'));
  const buffers = (json.buffers || []).map((b, i) => {
    if (!b.uri) return glbBin;
    if (b.uri.startsWith('data:')) return Buffer.from(b.uri.slice(b.uri.indexOf(',') + 1), 'base64');
    const name = basename(decodeURIComponent(b.uri));
    if (name !== decodeURIComponent(b.uri)) throw new Error('buffer uri outside the source folder: ' + b.uri);
    return readFileSync(join(dirname(file), name));
  });
  const accessor = (i) => {
    const a = json.accessors[i], v = json.bufferViews[a.bufferView], T = COMPONENTS[a.componentType], w = WIDTH[a.type];
    const buf = buffers[v.buffer], stride = v.byteStride || T.BYTES_PER_ELEMENT * w, start = (v.byteOffset || 0) + (a.byteOffset || 0);
    const out = new (T === Float32Array ? Float32Array : T)(a.count * w);
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const get = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[a.componentType];
    for (let k = 0; k < a.count; k++) for (let c = 0; c < w; c++) out[k * w + c] = dv[get](start + k * stride + c * T.BYTES_PER_ELEMENT, true);
    if (a.normalized && T !== Float32Array) { const max = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[a.componentType]; return Float32Array.from(out, x => Math.max(-1, x / max)); }
    return out;
  };
  const nodes = json.nodes.map((n) => {
    if (n.matrix) throw new Error('matrix nodes are not supported: ' + n.name);
    return { name: n.name || '', parent: -1, t: n.translation || [0, 0, 0], r: n.rotation || [0, 0, 0, 1], s: n.scale || [1, 1, 1] };
  });
  json.nodes.forEach((n, i) => (n.children || []).forEach(c => { nodes[c].parent = i; }));
  const imageBytes = (i) => {
    const im = json.images?.[i];
    if (!im) return null;
    if (im.bufferView != null) { const v = json.bufferViews[im.bufferView], b = buffers[v.buffer]; return b.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength); }
    if (im.uri?.startsWith('data:')) return Buffer.from(im.uri.slice(im.uri.indexOf(',') + 1), 'base64');
    const name = basename(decodeURIComponent(im.uri || ''));
    return name ? readFileSync(join(dirname(file), name)) : null;
  };
  const materials = (json.materials || []).map((m) => {
    const tex = m.pbrMetallicRoughness?.baseColorTexture, src = tex != null ? json.textures?.[tex.index]?.source : null;
    return { name: m.name || '', color: (m.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1]).slice(0, 3).map(linearToSrgb), textured: tex != null, image: src != null ? imageBytes(src) : null };
  });
  const meshes = [];
  json.nodes.forEach((n, ni) => {
    if (n.mesh == null) return;
    const skin = n.skin != null ? json.skins[n.skin] : null;
    for (const p of json.meshes[n.mesh].primitives) {
      if ((p.mode ?? 4) !== 4) continue;
      const pos = accessor(p.attributes.POSITION), count = pos.length / 3;
      const idx = p.indices != null ? accessor(p.indices) : Uint32Array.from({ length: count }, (_, i) => i);
      meshes.push({ node: ni, material: p.material ?? -1, positions: pos, indices: idx, uvs: p.attributes.TEXCOORD_0 != null ? accessor(p.attributes.TEXCOORD_0) : null, colors: p.attributes.COLOR_0 != null ? accessor(p.attributes.COLOR_0) : null,
        joints: skin ? accessor(p.attributes.JOINTS_0) : null, weights: skin ? accessor(p.attributes.WEIGHTS_0) : null,
        jointNodes: skin ? skin.joints : null, inverseBind: skin ? accessor(skin.inverseBindMatrices) : null });
    }
  });
  const clips = (json.animations || []).map((a) => {
    const channels = [];
    let duration = 0;
    for (const ch of a.channels) {
      const s = a.samplers[ch.sampler];
      if (!['translation', 'rotation', 'scale'].includes(ch.target.path) || ch.target.node == null) continue;
      const times = accessor(s.input), values = accessor(s.output);
      duration = Math.max(duration, times[times.length - 1]);
      channels.push({ node: ch.target.node, path: ch.target.path, interp: s.interpolation || 'LINEAR', times, values });
    }
    return { name: a.name || '', duration, channels };
  });
  const joints = new Set();
  for (const s of json.skins || []) for (const j of s.joints) joints.add(j);
  return { format: 'glTF', generator: json.asset?.generator || '', nodes, materials, meshes, clips, joints: [...joints], textures: (json.images || []).length, upAxis: 'y' };
}

function linearToSrgb(c) { return c <= .0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - .055; }
