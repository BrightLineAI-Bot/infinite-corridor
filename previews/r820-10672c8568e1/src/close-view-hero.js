// Imported Wayfarer presentation only. No simulation, storage, or import-time I/O.
export const HERO_BODY_TRIANGLES = 3328;
export const HERO_PROPORTIONS = Object.freeze({width:.80,depth:.82,hands:.62});
const TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
let loaded = null, loading = null;
export const getCloseViewHeroAsset = () => loaded;

export function closeViewHeroAssetUrl(moduleUrl = import.meta.url) {
  const url = new URL(moduleUrl), match = /^(.*\/)src\/[^/]+\.(?:js|ts)$/.exec(url.pathname);
  if (!match) throw new Error('Unsupported hero module URL layout');
  url.pathname = `${match[1]}assets/wayfarer/rogue-v2.json`;
  url.search = '';
  url.hash = '';
  return url;
}

export function decodeCloseViewHero(meta, binary, images = []) {
  if (meta?.version !== 2 || !(binary instanceof ArrayBuffer) || !Number.isInteger(meta.vertexCount) || meta.vertexCount < 1 || meta.vertexCount > 65535 || !Number.isInteger(meta.indexCount) || meta.indexCount % 3 || meta.indexCount > HERO_BODY_TRIANGLES * 3) throw new Error('Invalid hero header');
  const arrays = Object.create(null), types = { f32: Float32Array, u16: Uint16Array, u8: Uint8Array };
  for (const [key, d] of Object.entries(meta.arrays || {})) {
    const Type = types[d.componentType];
    if (!Type || !Number.isSafeInteger(d.count) || d.count < 0 || !Number.isSafeInteger(d.byteOffset) || d.byteOffset < 0 || d.byteOffset % 4 || d.byteOffset + d.count * Type.BYTES_PER_ELEMENT > binary.byteLength) throw new Error('Invalid hero array ' + key);
    const a = arrays[key] = new Type(binary, d.byteOffset, d.count);
    if (d.componentType === 'f32') for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) throw new Error('Nonfinite hero array');
  }
  for (const [key, width] of Object.entries({ positions: 3, normals: 3, uvs: 2, joints: 4, weights: 4, materialLayers: 1, paletteClasses: 1 })) if (arrays[key]?.length !== meta.vertexCount * width) throw new Error('Invalid hero ' + key);
  if (arrays.indices?.length !== meta.indexCount) throw new Error('Invalid hero indices');
  for (const i of arrays.indices) if (i >= meta.vertexCount) throw new Error('Hero index out of bounds');
  const n = meta.nodes?.length;
  if (!n || n > 128) throw new Error('Invalid hero nodes');
  const rest = new Float64Array(n * 10), order = [], visit = new Uint8Array(n);
  function walk(i) { if (visit[i] === 1) throw new Error('Hero hierarchy cycle'); if (visit[i] === 2) return; visit[i] = 1; const p = meta.nodes[i].parent; if (!Number.isInteger(p) || p < -1 || p >= n) throw new Error('Invalid hero parent'); if (p >= 0) walk(p); visit[i] = 2; order.push(i); }
  for (let i = 0; i < n; i++) { const v = meta.nodes[i]; if (v.translation?.length !== 3 || v.rotation?.length !== 4 || v.scale?.length !== 3) throw new Error('Invalid hero TRS'); rest.set(v.translation, i * 10); rest.set(v.rotation, i * 10 + 3); rest.set(v.scale, i * 10 + 7); walk(i); }
  for (const v of rest) if (!Number.isFinite(v)) throw new Error('Nonfinite hero TRS');
  const clips = Object.create(null);
  for (const c of meta.clips || []) {
    if (!(c.duration >= 0) || !Number.isFinite(c.duration)) throw new Error('Invalid hero clip');
    const tracks = [];
    for (const ch of c.channels) {
      const width = ch.path === 'rotation' ? 4 : 3, times = arrays[ch.times], values = arrays[ch.values];
      if (!['translation', 'rotation', 'scale'].includes(ch.path) || ch.interpolation !== 'LINEAR' || !Number.isInteger(ch.node) || ch.node < 0 || ch.node >= n || !times?.length || values?.length !== times.length * width) throw new Error('Invalid hero track');
      for (let i = 1; i < times.length; i++) if (times[i] <= times[i - 1]) throw new Error('Unordered hero track');
      tracks.push({ offset: ch.node * 10 + (ch.path === 'rotation' ? 3 : ch.path === 'scale' ? 7 : 0), width, times, values });
    }
    clips[c.name] = { name: c.name, duration: c.duration, tracks };
  }
  if (!clips.Idle || !clips.Roll) throw new Error('Missing hero reference clips');
  const skins = meta.skins.map(s => { const inverse = arrays[s.inverseBindMatrices]; if (inverse?.length !== s.joints.length * 16 || s.joints.some(i => !Number.isInteger(i) || i < 0 || i >= n)) throw new Error('Invalid hero skin'); return { joints: s.joints, inverse }; });
  const seen = new Uint8Array(meta.vertexCount);
  for (const m of meta.meshes) {
    if (!Number.isInteger(m.node) || m.node < 0 || m.node >= n || !Number.isInteger(m.firstVertex) || !Number.isInteger(m.vertexCount) || m.firstVertex < 0 || m.vertexCount < 1 || m.firstVertex + m.vertexCount > meta.vertexCount || (m.skin !== -1 && !skins[m.skin])) throw new Error('Invalid hero mesh');
    for (let v = m.firstVertex; v < m.firstVertex + m.vertexCount; v++) { if (seen[v]++) throw new Error('Overlapping hero mesh'); if (arrays.materialLayers[v] > 1 || arrays.paletteClasses[v] > 4) throw new Error('Invalid hero material'); if (m.skin >= 0) { let total = 0; for (let k = 0; k < 4; k++) { const o = v * 4 + k; if (arrays.joints[o] >= skins[m.skin].joints.length || arrays.weights[o] < 0) throw new Error('Invalid hero influence'); total += arrays.weights[o]; } if (Math.abs(total - 1) > .001) throw new Error('Unnormalized hero weights'); } }
  }
  if (seen.some(v => v !== 1)) throw new Error('Uncovered hero vertex');
  const head = meta.headAttachment;
  if (!head || head.node >= n || head.parent >= n || head.collarVertexIndices?.length !== 6 || head.collarVertexIndices.some(i => !Number.isInteger(i) || i < 0 || i >= meta.vertexCount)) throw new Error('Invalid hero head');
  return { meta, arrays, rest, order, skins, clips, images, vertexCount: meta.vertexCount, indexCount: meta.indexCount };
}

// Called explicitly by the view. Tests use decodeCloseViewHero with local bytes.
export function loadCloseViewHero() {
  if (loaded) return Promise.resolve(loaded);
  if (loading) return loading;
  if (typeof window === 'undefined' || typeof fetch !== 'function') return Promise.resolve(null);
  loading = (async () => {
    try {
      const url = closeViewHeroAssetUrl(), r = await fetch(url); if (!r.ok) return null;
      const meta = await r.json(), b = await fetch(new URL(meta.binary, url)); if (!b.ok) return null;
      const bytes = await b.arrayBuffer(), images = [];
      for (const t of meta.textures) { const r = await fetch(new URL(t.file, url)); if (!r.ok) throw new Error('Hero texture unavailable'); const blob = await r.blob(); let image;
        if (typeof createImageBitmap === 'function') image = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' });
        else { const u = URL.createObjectURL(blob); try { image = await new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = u; }); } finally { URL.revokeObjectURL(u); } }
        if (image.width !== 1024 || image.height !== 1024) throw new Error('Hero texture size'); images[t.layer] = image;
      }
      if (images.length !== 2 || !images[0] || !images[1]) throw new Error('Hero texture layers');
      loaded = decodeCloseViewHero(meta, bytes, images); return loaded;
    } catch { return null; }
  })();
  return loading;
}

function multiply(out, o, a, x, b, y) {
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out[o + c * 4 + r] = a[x + r] * b[y + c * 4] + a[x + 4 + r] * b[y + c * 4 + 1] + a[x + 8 + r] * b[y + c * 4 + 2] + a[x + 12 + r] * b[y + c * 4 + 3];
}
function trs(out, o, a, k) {
  const x = a[k + 3], y = a[k + 4], z = a[k + 5], w = a[k + 6], sx = a[k + 7], sy = a[k + 8], sz = a[k + 9];
  out[o] = (1 - 2 * (y * y + z * z)) * sx; out[o + 1] = 2 * (x * y + z * w) * sx; out[o + 2] = 2 * (x * z - y * w) * sx; out[o + 3] = 0;
  out[o + 4] = 2 * (x * y - z * w) * sy; out[o + 5] = (1 - 2 * (x * x + z * z)) * sy; out[o + 6] = 2 * (y * z + x * w) * sy; out[o + 7] = 0;
  out[o + 8] = 2 * (x * z + y * w) * sz; out[o + 9] = 2 * (y * z - x * w) * sz; out[o + 10] = (1 - 2 * (x * x + y * y)) * sz; out[o + 11] = 0;
  out[o + 12] = a[k]; out[o + 13] = a[k + 1]; out[o + 14] = a[k + 2]; out[o + 15] = 1;
}
function normalMatrix(out, o, m, k) {
  const a = m[k], b = m[k + 4], c = m[k + 8], d = m[k + 1], e = m[k + 5], f = m[k + 9], g = m[k + 2], h = m[k + 6], i = m[k + 10];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g), inv = Math.abs(det) > 1e-12 ? 1 / det : 0;
  out[o] = (e * i - f * h) * inv; out[o + 1] = (c * h - b * i) * inv; out[o + 2] = (b * f - c * e) * inv;
  out[o + 3] = (f * g - d * i) * inv; out[o + 4] = (a * i - c * g) * inv; out[o + 5] = (c * d - a * f) * inv;
  out[o + 6] = (d * h - e * g) * inv; out[o + 7] = (b * g - a * h) * inv; out[o + 8] = (a * e - b * d) * inv;
}
function inverseAffine(out,o,m,k) {
  const a=m[k],b=m[k+4],c=m[k+8],d=m[k+1],e=m[k+5],f=m[k+9],g=m[k+2],h=m[k+6],i=m[k+10];
  const det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);if(Math.abs(det)<1e-12)throw new Error('Singular hero bind');const q=1/det;
  out[o]=(e*i-f*h)*q;out[o+4]=(c*h-b*i)*q;out[o+8]=(b*f-c*e)*q;
  out[o+1]=(f*g-d*i)*q;out[o+5]=(a*i-c*g)*q;out[o+9]=(c*d-a*f)*q;
  out[o+2]=(d*h-e*g)*q;out[o+6]=(b*g-a*h)*q;out[o+10]=(a*e-b*d)*q;
  out[o+3]=out[o+7]=out[o+11]=0;out[o+15]=1;
  for(let r=0;r<3;r++)out[o+12+r]=-(out[o+r]*m[k+12]+out[o+4+r]*m[k+13]+out[o+8+r]*m[k+14]);
}
// Build-space derivative only, once per pose state. Animated poses are never squeezed in world space.
// Original rotations and translation deltas then act on the consistently fitted skeleton/mesh.
function fitProportions(asset,proportions) {
  const n=asset.meta.nodes.length,original=new Float64Array(n*16),fitted=new Float64Array(n*16),local=new Float64Array(16),invOld=new Float64Array(16),invNew=new Float64Array(16),transform=new Float64Array(16),scaled=new Float64Array(16),norm=new Float64Array(9),offsets=new Float64Array(n*3),jointMap=new Int16Array(n).fill(-1);
  const skin=asset.skins[0];for(let i=0;i<skin.joints.length;i++)jointMap[skin.joints[i]]=i;
  const width=proportions.width,depth=proportions.depth;
  for(const i of asset.order){const o=i*16,parent=asset.meta.nodes[i].parent,j=jointMap[i];
    if(j>=0){inverseAffine(original,o,skin.inverse,j*16);for(let k=0;k<16;k++)fitted[o+k]=original[o+k];fitted[o+12]*=width;fitted[o+14]*=depth;
      if(parent>=0){inverseAffine(invOld,0,original,parent*16);inverseAffine(invNew,0,fitted,parent*16);
        for(let r=0;r<3;r++){const before=invOld[r]*original[o+12]+invOld[4+r]*original[o+13]+invOld[8+r]*original[o+14]+invOld[12+r],after=invNew[r]*fitted[o+12]+invNew[4+r]*fitted[o+13]+invNew[8+r]*fitted[o+14]+invNew[12+r];offsets[i*3+r]=after-before;}
      }else{offsets[i*3]=fitted[o+12]-original[o+12];offsets[i*3+2]=fitted[o+14]-original[o+14];}
    }else{trs(local,0,asset.rest,i*10);if(parent>=0){multiply(original,o,original,parent*16,local,0);multiply(fitted,o,fitted,parent*16,local,0);}else for(let k=0;k<16;k++)original[o+k]=fitted[o+k]=local[k];}
  }
  const inverseBinds=asset.skins.map(s=>{const result=new Float64Array(s.joints.length*16);for(let j=0;j<s.joints.length;j++)inverseAffine(result,j*16,fitted,s.joints[j]*16);return result;});
  const positions=Float64Array.from(asset.arrays.positions),normals=Float64Array.from(asset.arrays.normals);
  for(const mesh of asset.meta.meshes){if(mesh.node===asset.meta.headAttachment.node)continue;
    if(mesh.skin<0){inverseAffine(invNew,0,fitted,mesh.node*16);for(let c=0;c<4;c++){const o=mesh.node*16+c*4;scaled[c*4]=original[o]*width;scaled[c*4+1]=original[o+1];scaled[c*4+2]=original[o+2]*depth;scaled[c*4+3]=original[o+3];}multiply(transform,0,invNew,0,scaled,0);normalMatrix(norm,0,transform,0);}
    for(let v=mesh.firstVertex;v<mesh.firstVertex+mesh.vertexCount;v++){const o=v*3,x=positions[o],y=positions[o+1],z=positions[o+2],nx=normals[o],ny=normals[o+1],nz=normals[o+2];
      if(mesh.skin>=0){positions[o]=x*width;positions[o+2]=z*depth;normals[o]=nx/width;normals[o+2]=nz/depth;}
      else{positions[o]=transform[0]*x+transform[4]*y+transform[8]*z+transform[12];positions[o+1]=transform[1]*x+transform[5]*y+transform[9]*z+transform[13];positions[o+2]=transform[2]*x+transform[6]*y+transform[10]*z+transform[14];normals[o]=norm[0]*nx+norm[3]*ny+norm[6]*nz;normals[o+1]=norm[1]*nx+norm[4]*ny+norm[7]*nz;normals[o+2]=norm[2]*nx+norm[5]*ny+norm[8]*nz;}
      const length=Math.hypot(normals[o],normals[o+1],normals[o+2])||1;normals[o]/=length;normals[o+1]/=length;normals[o+2]/=length;
    }
  }
  return{positions,normals,offsets,inverseBinds};
}
function quaternion(out, o, a, x, b, y, t) {
  let dot = 0; for (let k = 0; k < 4; k++) dot += a[x + k] * b[y + k];
  const sign = dot < 0 ? -1 : 1; dot = Math.abs(dot); let wa = 1 - t, wb = t;
  if (dot < .9995) { const theta = Math.acos(clamp(dot, -1, 1)), inv = 1 / Math.sin(theta); wa = Math.sin((1 - t) * theta) * inv; wb = Math.sin(t * theta) * inv; }
  let len = 0; for (let k = 0; k < 4; k++) { const v = a[x + k] * wa + b[y + k] * wb * sign; out[o + k] = v; len += v * v; }
  len = len > 1e-20 ? 1 / Math.sqrt(len) : 1; for (let k = 0; k < 4; k++) out[o + k] *= len;
}
function clipPose(asset, clip, seconds, out) {
  out.set(asset.rest); if (!clip) return;
  for (const ch of clip.tracks) {
    const times = ch.times, values = ch.values; let lo = 0, hi = times.length - 1;
    while (lo + 1 < hi) { const mid = (lo + hi) >>> 1; if (times[mid] <= seconds) lo = mid; else hi = mid; }
    if (seconds >= times[hi]) lo = hi; else if (seconds <= times[0]) lo = hi = 0;
    const t = lo === hi ? 0 : clamp((seconds - times[lo]) / (times[hi] - times[lo]));
    if (ch.width === 4) quaternion(out, ch.offset, values, lo * 4, values, hi * 4, t);
    else for (let k = 0; k < 3; k++) out[ch.offset + k] = values[lo * 3 + k] * (1 - t) + values[hi * 3 + k] * t;
  }
}
function blend(out, other, t) { for (let i = 0; i < out.length; i += 10) { for (let k = 0; k < 3; k++) { out[i + k] += (other[i + k] - out[i + k]) * t; out[i + 7 + k] += (other[i + 7 + k] - out[i + 7 + k]) * t; } quaternion(out, i + 3, out, i + 3, other, i + 3, t); } }
function build(asset, state, pose) {
  const head = asset.meta.headAttachment;
  for (const i of asset.order) {
    const o = i * 16, p = asset.meta.nodes[i].parent; trs(state.local, o, pose, i * 10);
    state.local[o+12]+=state.fit.offsets[i*3];state.local[o+13]+=state.fit.offsets[i*3+1];state.local[o+14]+=state.fit.offsets[i*3+2];
    // Palm and sibling thumb roots share the wrist pivot; fingers and grip sockets inherit once.
    if(i===7||i===9||i===18||i===20)for(let k=0;k<11;k++)if(k%4!==3)state.local[o+k]*=state.proportions.hands;
    if (i === head.node) { const s = state.headScale; for (let k = 0; k < 15; k++) if (k % 4 !== 3) state.local[o + k] *= s; state.local[o + 13] += state.seatY; }
    if (p < 0) for (let k = 0; k < 16; k++) state.global[o + k] = state.local[o + k]; else multiply(state.global, o, state.global, p * 16, state.local, o);
    normalMatrix(state.nodeNormals, i * 9, state.global, o);
  }
  for (let s = 0; s < asset.skins.length; s++) { const skin = asset.skins[s]; for (let j = 0; j < skin.joints.length; j++) { multiply(state.skinMatrices[s], j * 16, state.global, skin.joints[j] * 16, state.fit.inverseBinds[s], j * 16); normalMatrix(state.skinNormals[s], j * 9, state.skinMatrices[s], j * 16); } }
}
function deform(asset, state) {
  const a = asset.arrays, out = state.vertices;
  for (const mesh of asset.meta.meshes) for (let v = mesh.firstVertex; v < mesh.firstVertex + mesh.vertexCount; v++) {
    const p = v * 3, o = v * 6, x = state.fit.positions[p], y = state.fit.positions[p + 1], z = state.fit.positions[p + 2], nx = state.fit.normals[p], ny = state.fit.normals[p + 1], nz = state.fit.normals[p + 2];
    let px = 0, py = 0, pz = 0, qx = 0, qy = 0, qz = 0;
    const skinned = mesh.skin >= 0, m = skinned ? state.skinMatrices[mesh.skin] : state.global, n = skinned ? state.skinNormals[mesh.skin] : state.nodeNormals;
    for (let k = 0; k < (skinned ? 4 : 1); k++) { const influence = v * 4 + k, w = skinned ? a.weights[influence] : 1; if (!w) continue; const joint = skinned ? a.joints[influence] : mesh.node, b = joint * 16, c = joint * 9;
      px += w * (m[b] * x + m[b + 4] * y + m[b + 8] * z + m[b + 12]); py += w * (m[b + 1] * x + m[b + 5] * y + m[b + 9] * z + m[b + 13]); pz += w * (m[b + 2] * x + m[b + 6] * y + m[b + 10] * z + m[b + 14]);
      qx += w * (n[c] * nx + n[c + 3] * ny + n[c + 6] * nz); qy += w * (n[c + 1] * nx + n[c + 4] * ny + n[c + 7] * nz); qz += w * (n[c + 2] * nx + n[c + 5] * ny + n[c + 8] * nz);
    }
    const length = Math.hypot(qx, qy, qz) || 1; out[o] = px; out[o + 1] = py; out[o + 2] = pz; out[o + 3] = qx / length; out[o + 4] = qy / length; out[o + 5] = qz / length;
  }
}
export function createHeroPoseState(asset,proportions=HERO_PROPORTIONS) {
  const size = asset.rest.length, n = asset.meta.nodes.length;
  if(!Number.isFinite(proportions.width)||!Number.isFinite(proportions.depth)||!Number.isFinite(proportions.hands)||Math.min(proportions.width,proportions.depth,proportions.hands)<.25||Math.max(proportions.width,proportions.depth,proportions.hands)>1)throw new Error('Invalid hero proportions');
  const s = { pose: new Float64Array(size), other: new Float64Array(size), local: new Float64Array(n * 16), global: new Float64Array(n * 16), nodeNormals: new Float64Array(n * 9), skinMatrices: asset.skins.map(k => new Float64Array(k.joints.length * 16)), skinNormals: asset.skins.map(k => new Float64Array(k.joints.length * 9)), vertices: new Float64Array(asset.vertexCount * 6), headScale: asset.meta.headAttachment.defaultScale, seatY: 0, minY: 0, referenceHeight: 1, downClearance: 0, rollX: 0, rollZ: 0, clip: 'Idle', clipTime: 0, rollCompX: 0, rollCompZ: 0 };
  s.proportions={width:proportions.width,depth:proportions.depth,hands:proportions.hands};s.fit=fitProportions(asset,s.proportions);
  clipPose(asset, asset.clips.Idle, 0, s.pose); build(asset, s, s.pose); deform(asset, s);
  let collar = Infinity, head = Infinity; for (const v of asset.meta.headAttachment.collarVertexIndices) collar = Math.min(collar, s.vertices[v * 6 + 1]);
  for (const m of asset.meta.meshes) if (m.node === asset.meta.headAttachment.node) for (let i = m.firstVertex; i < m.firstVertex + m.vertexCount; i++) head = Math.min(head, s.vertices[i * 6 + 1]);
  const axis = s.global[asset.meta.headAttachment.parent * 16 + 5]; if (!Number.isFinite(head) || Math.abs(axis) < .1) throw new Error('Invalid hero head seating');
  s.seatY = (collar - asset.meta.headAttachment.seatOverlap - head) / axis;
  build(asset, s, s.pose); deform(asset, s); let max = -Infinity; s.minY = Infinity;
  // Bounds belong to rendered triangles, never unused source vertices left by extraction.
  for (const v of asset.arrays.indices) { const y=s.vertices[v*6+1]; s.minY = Math.min(s.minY, y); max = Math.max(max, y); s.downClearance=Math.max(s.downClearance,-s.vertices[v*6+2]+.02); }
  s.referenceHeight = max - s.minY; if (!(s.referenceHeight > .1)) throw new Error('Invalid hero height');
  clipPose(asset, asset.clips.Roll, 0, s.other); build(asset, s, s.other); const b = asset.meta.reference.bodyNode * 16; s.rollX = s.global[b + 12]; s.rollZ = s.global[b + 14];
  return s;
}
export function createHeroFrame(asset) { return { asset, positionsNormals: new Float32Array(asset.vertexCount * 6), vertexCount: asset.vertexCount, indexCount: asset.indexCount, alpha: 1, tint: new Float32Array([1, 1, 1]), hitFlash: 0, leftSocket: new Float32Array(16), rightSocket: new Float32Array(16), ready: false }; }

// Source action intervals/contact markers are visual only; no event is emitted here.
export const HERO_CLIP_POLICY = Object.freeze({ melee: 'Dagger_Attack', hammer: 'Dagger_Attack2', punch: 'Punch', dodge: 'Roll', hit: 'RecieveHit', death: 'Death', interact: 'PickUp', contact: .18, sourceContact: .35 });
function rotateX(pose, node, angle) { const o = node * 10 + 3, s = Math.sin(angle / 2), c = Math.cos(angle / 2), x = pose[o], y = pose[o + 1], z = pose[o + 2], w = pose[o + 3]; pose[o] = x * c + w * s; pose[o + 1] = y * c + z * s; pose[o + 2] = z * c - y * s; pose[o + 3] = w * c - x * s; }
function sourceTime(p, duration) { return duration * (p < .18 ? p / .18 * .35 : .35 + (p - .18) / .82 * .65); }
function socket(out, g, o, scale, cy, sy, input, dx, dz, floor) {
  for (let c = 0; c < 4; c++) { const k = o + c * 4, x = g[k] + (c === 3 ? dx : 0), y = g[k + 1] - (c === 3 ? floor : 0), z = g[k + 2] + (c === 3 ? dz : 0); out[c * 4] = (z * cy - x * sy) * scale + (c === 3 ? input.x : 0); out[c * 4 + 1] = (z * sy + x * cy) * scale + (c === 3 ? input.y : 0); out[c * 4 + 2] = y * scale + (c === 3 ? input.groundZ + input.liftZ : 0); out[c * 4 + 3] = c === 3 ? 1 : 0; }
}
function knockdownSocket(m,input,cy,sy,c,s,lift) {
  for(let column=0;column<4;column++) { const o=column*4,point=column===3;
    const x=m[o]-(point?input.x:0),y=m[o+1]-(point?input.y:0),z=m[o+2]-(point?input.groundZ+input.liftZ:0),f=x*cy+y*sy,l=-x*sy+y*cy,forward=f*c-z*s;
    m[o]=forward*cy-l*sy+(point?input.x:0);m[o+1]=forward*sy+l*cy+(point?input.y:0);m[o+2]=z*c+f*s+(point?input.groundZ+input.liftZ+lift:0);
  }
}
function applyKnockdown(out,input,cy,sy,amount,clearance) {
  // knockdownPose supplies amount: 0 -> 1, held at 1, then 1 -> 0 on get-up.
  // One rigid transform for the complete body and equipment, including the source's root-parented feet.
  const c=Math.cos(amount*Math.PI/2),s=Math.sin(amount*Math.PI/2),lift=clearance*s,a=out.positionsNormals;
  for(let o=0;o<a.length;o+=6) {
    const x=a[o]-input.x,y=a[o+1]-input.y,z=a[o+2]-input.groundZ-input.liftZ,f=x*cy+y*sy,l=-x*sy+y*cy,forward=f*c-z*s;
    a[o]=input.x+forward*cy-l*sy;a[o+1]=input.y+forward*sy+l*cy;a[o+2]=input.groundZ+input.liftZ+z*c+f*s+lift;
    const nf=a[o+3]*cy+a[o+4]*sy,nl=-a[o+3]*sy+a[o+4]*cy,nz=a[o+5],ff=nf*c-nz*s;
    a[o+3]=ff*cy-nl*sy;a[o+4]=ff*sy+nl*cy;a[o+5]=nz*c+nf*s;
  }
  knockdownSocket(out.leftSocket,input,cy,sy,c,s,lift);knockdownSocket(out.rightSocket,input,cy,sy,c,s,lift);
}
export function sampleCloseViewHero(asset, state, input, out) {
  out.ready = false;
  if (out.asset !== asset || !Number.isFinite(input.nowMs) || !Number.isFinite(input.x) || !Number.isFinite(input.y) || !Number.isFinite(input.groundZ) || !Number.isFinite(input.liftZ) || !Number.isFinite(input.yaw) || !(input.height > 0) || !Number.isFinite(input.height)) return false;
  // Input speed is tiles/second; the existing gait phase is already distance-driven radians.
  const speed = clamp((Number(input.speed) || 0)/4), phase = ((Number(input.gaitPhase) || 0) / TAU % 1 + 1) % 1;
  const action=input.action,p=clamp(Number(action?.phase)||0),knocked=action?.kind==='hit'&&action.profile==='knockdown';
  // Accepted action progress, not wall-clock idle breathing, owns every action blend.
  clipPose(asset, asset.clips.Idle, action || input.reducedMotion ? 0 : ((input.nowMs / 1000) % asset.clips.Idle.duration + asset.clips.Idle.duration) % asset.clips.Idle.duration, state.pose);
  if (speed > 0 && !knocked) { const walk = asset.clips.Walk || asset.clips.Idle, run = asset.clips.Run || walk; clipPose(asset, walk, phase * walk.duration, state.other); blend(state.pose, state.other, Math.min(1, speed * 4)); if (speed > .4) { clipPose(asset, run, phase * run.duration, state.other); blend(state.pose, state.other, (speed - .4) / .6); } }
  let clip = null, weight = 0, time = 0, dx = 0, dz = 0;
  state.clip = speed > .4 ? 'Run' : speed > 0 ? 'Walk' : 'Idle'; state.clipTime = phase;
  if (action) {
    const kind = action.kind, profile = action.profile;
    if (kind === 'melee') { if (profile === 'fist' || profile === 'unarmed') clip = asset.clips.Punch; else if (profile === 'hammer') clip = asset.clips.Dagger_Attack2; else if (profile === 'melee' || profile === 'blade' || profile === 'sweep' || profile === 'mirage' || profile === 'orrery' || profile === 'orrery-tap' || profile === 'orrery-release') clip = asset.clips.Dagger_Attack; }
    else if (kind === 'dodge') clip = asset.clips.Roll; else if (kind === 'hit'&&!knocked) clip = asset.clips.RecieveHit; else if (kind === 'death') clip = asset.clips.Death; else if (kind === 'interact') clip = asset.clips.PickUp;
    weight = kind === 'death' ? 1 : Math.min(1, p / .08, (1 - p) / .12);
    if(knocked) { state.clip='derived-knockdown';state.clipTime=p; }
    else if (clip) { time = kind === 'melee' ? sourceTime(p, clip.duration) : p * clip.duration; clipPose(asset, clip, time, state.other);
      if (kind === 'dodge') { build(asset, state, state.other); const b = asset.meta.reference.bodyNode * 16; dx = -(state.global[b + 12] - state.rollX) * weight; dz = -(state.global[b + 14] - state.rollZ) * weight; }
      blend(state.pose, state.other, weight); state.clip = clip.name; state.clipTime = time;
    } else if (kind === 'ranged' || kind === 'cast' || kind === 'jump') {
      // Explicit derivative pose layers: this source contains no ranged/cast/jump clips.
      const pulse = Math.sin(p * Math.PI) * weight;
      if (kind === 'ranged') { rotateX(state.pose, 22, -.8 * weight); rotateX(state.pose, 21, -.4 * weight - .15 * pulse); }
      else if (kind === 'cast') { rotateX(state.pose, 12, -.65 * pulse); rotateX(state.pose, 22, -.8 * pulse); }
      else { // Arm brace only: root-parented feet must not be left behind by invented knee IK.
        rotateX(state.pose, 12, -.25 * pulse); rotateX(state.pose, 22, -.25 * pulse);
      }
      state.clip = kind==='ranged'?'derived-ranged':kind==='cast'?'derived-cast':'derived-jump';
    }
  }
  build(asset, state, state.pose); deform(asset, state); state.rollCompX = dx; state.rollCompZ = dz;
  const scale = input.height / state.referenceHeight, yaw = action && Number.isFinite(action.yaw) ? action.yaw : input.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw), v = state.vertices, dst = out.positionsNormals;
  // Source +Z faces forward, source Y is up. The cyclic permutation preserves handedness.
  for (let i = 0; i < v.length; i += 6) { const x = v[i] + dx, y = v[i + 1] - state.minY, z = v[i + 2] + dz; dst[i] = input.x + (z * cy - x * sy) * scale; dst[i + 1] = input.y + (z * sy + x * cy) * scale; dst[i + 2] = input.groundZ + input.liftZ + y * scale; dst[i + 3] = v[i + 5] * cy - v[i + 3] * sy; dst[i + 4] = v[i + 5] * sy + v[i + 3] * cy; dst[i + 5] = v[i + 4]; }
  socket(out.leftSocket, state.global, asset.meta.sockets.left.node * 16, scale, cy, sy, input, dx, dz, state.minY); socket(out.rightSocket, state.global, asset.meta.sockets.right.node * 16, scale, cy, sy, input, dx, dz, state.minY);
  if(knocked&&p>0)applyKnockdown(out,input,cy,sy,p,state.downClearance*scale);
  out.alpha = clamp(Number.isFinite(input.alpha) ? input.alpha : 1); out.hitFlash = clamp(Number(input.hitFlash) || 0); for (let k = 0; k < 3; k++) out.tint[k] = Number.isFinite(input.tint?.[k]) ? input.tint[k] : 1;
  out.ready = true; return true;
}
