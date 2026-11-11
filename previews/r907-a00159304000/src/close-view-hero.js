// Imported Wayfarer presentation only. No simulation, storage, or import-time I/O.
import { CLOSE_VIEW_POWER_SUIT_ARMOR, CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES, CLOSE_VIEW_WAYFARER_KIT, CLOSE_VIEW_WAYFARER_KIT_TRIANGLES, CLOSE_VIEW_SUIT_KIT, CLOSE_VIEW_SUIT_KIT_TRIANGLES } from './close-view-player-forms.js?v=r907-a00159304000';
const KIT_BUFFER_TRIANGLES = Math.max(CLOSE_VIEW_WAYFARER_KIT_TRIANGLES, CLOSE_VIEW_SUIT_KIT_TRIANGLES);
import { sampleToolActionMotion, toolUsePoseTime, primaryVisualStage, cleaverCarryFrame } from './action-motion.js?v=r907-a00159304000';
import { CLOSE_VIEW_RIFLE_GRIP, closeViewHeldHand, closeViewHeldScale, cleaverHandRoles, cleaverCutMotion, sampleMeleeActionPose, sampleDrinkPose, sampleShovelDigPose, stonePlaceWeight, cacheReachWeight, chestOpenWeight } from './close-view-player-presentation.js?v=r907-a00159304000';
export const HERO_BODY_TRIANGLES = 3328;
export const HERO_PROPORTIONS = Object.freeze({width:.80,depth:.82,hands:.62});
const TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
// Source arms. Source-left (sign +1, +X) is the displayed anatomical right; source-right the left.
const SOURCE_LEFT_ARM = Object.freeze({ left: true, shoulder: 12, elbow: 11, wrist: 7, grip: 6, free: 22, freeElbow: 21, sign: 1 });
const SOURCE_RIGHT_ARM = Object.freeze({ left: false, shoulder: 22, elbow: 21, wrist: 18, grip: 16, free: 12, freeElbow: 11, sign: -1 });
// Every sword is in the displayed left hand. The Cleaver cuts were authored on source-left;
// CLEAVER_ARM mirrors them (lateral offsets, yaw, roll) onto source-right.
const CLEAVER_ARM = SOURCE_RIGHT_ARM;
const heldArm = profile => closeViewHeldHand(profile) === 'right' ? SOURCE_LEFT_ARM : SOURCE_RIGHT_ARM;
let loaded = null, loading = null, assetStatus = 'not-requested';
// Observation only: reading status never starts or retries asset loading.
export const closeViewHeroAssetStatus = () => assetStatus;
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
  assetStatus = 'loading';
  loading = (async () => {
    try {
      const url = closeViewHeroAssetUrl(), r = await fetch(url); if (!r.ok) { assetStatus = 'unavailable'; return null; }
      const meta = await r.json(), b = await fetch(new URL(meta.binary, url)); if (!b.ok) { assetStatus = 'unavailable'; return null; }
      const bytes = await b.arrayBuffer(), images = [];
      for (const t of meta.textures) { const r = await fetch(new URL(t.file, url)); if (!r.ok) throw new Error('Hero texture unavailable'); const blob = await r.blob(); let image;
        if (typeof createImageBitmap === 'function') image = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' });
        else { const u = URL.createObjectURL(blob); try { image = await new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = u; }); } finally { URL.revokeObjectURL(u); } }
        if (image.width !== 1024 || image.height !== 1024) throw new Error('Hero texture size'); images[t.layer] = image;
      }
      if (images.length !== 2 || !images[0] || !images[1]) throw new Error('Hero texture layers');
      loaded = decodeCloseViewHero(meta, bytes, images); assetStatus = 'ready'; return loaded;
    } catch { assetStatus = 'unavailable'; return null; }
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
function smoothstep(t){t=clamp(t);return t*t*(3-2*t);}
function loopPose(asset,clip,phase,out,scratch){const q=((phase%1)+1)%1;clipPose(asset,clip,q*clip.duration,out);if(q>.9){clipPose(asset,clip,0,scratch);blend(out,scratch,smoothstep((q-.9)/.1));}}
function alignJoint(state,pose,node,effector,tx,ty,tz){
  const j=node*16,e=effector*16,jx=state.global[j+12],jy=state.global[j+13],jz=state.global[j+14],ax=state.global[e+12]-jx,ay=state.global[e+13]-jy,az=state.global[e+14]-jz,bx=tx-jx,by=ty-jy,bz=tz-jz,al=Math.hypot(ax,ay,az),bl=Math.hypot(bx,by,bz);if(al<1e-7||bl<1e-7)return;
  const ux=ax/al,uy=ay/al,uz=az/al,vx=bx/bl,vy=by/bl,vz=bz/bl,cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx,cl=Math.hypot(cx,cy,cz),dot=clamp(ux*vx+uy*vy+uz*vz,-1,1);if(cl<1e-8)return;
  const parent=state.asset.meta.nodes[node].parent,pm=parent*16,wx=cx/cl,wy=cy/cl,wz=cz/cl,c0=Math.hypot(state.global[pm],state.global[pm+1],state.global[pm+2])||1,c1=Math.hypot(state.global[pm+4],state.global[pm+5],state.global[pm+6])||1,c2=Math.hypot(state.global[pm+8],state.global[pm+9],state.global[pm+10])||1,lx=(wx*state.global[pm]+wy*state.global[pm+1]+wz*state.global[pm+2])/c0,ly=(wx*state.global[pm+4]+wy*state.global[pm+5]+wz*state.global[pm+6])/c1,lz=(wx*state.global[pm+8]+wy*state.global[pm+9]+wz*state.global[pm+10])/c2,ll=Math.hypot(lx,ly,lz)||1,angle=Math.acos(dot),s=Math.sin(angle/2)/ll,dw=Math.cos(angle/2),dx=lx*s,dy=ly*s,dz=lz*s,o=node*10+3,x=pose[o],y=pose[o+1],z=pose[o+2],w=pose[o+3];
  pose[o]=dw*x+dx*w+dy*z-dz*y;pose[o+1]=dw*y-dx*z+dy*w+dz*x;pose[o+2]=dw*z+dx*y-dy*x+dz*w;pose[o+3]=dw*w-dx*x-dy*y-dz*z;
}
function qmul(out,o,a,x,b,y){const ax=a[x],ay=a[x+1],az=a[x+2],aw=a[x+3],bx=b[y],by=b[y+1],bz=b[y+2],bw=b[y+3];out[o]=aw*bx+ax*bw+ay*bz-az*by;out[o+1]=aw*by-ax*bz+ay*bw+az*bx;out[o+2]=aw*bz+ax*by-ay*bx+az*bw;out[o+3]=aw*bw-ax*bx-ay*by-az*bz;const l=Math.hypot(out[o],out[o+1],out[o+2],out[o+3])||1;out[o]/=l;out[o+1]/=l;out[o+2]/=l;out[o+3]/=l;}
function qinv(out,o,a,x){out[o]=-a[x];out[o+1]=-a[x+1];out[o+2]=-a[x+2];out[o+3]=a[x+3];}
function qrot(out,o,q,x,vx,vy,vz){const qx=q[x],qy=q[x+1],qz=q[x+2],qw=q[x+3],tx=2*(qy*vz-qz*vy),ty=2*(qz*vx-qx*vz),tz=2*(qx*vy-qy*vx);out[o]=vx+qw*tx+qy*tz-qz*ty;out[o+1]=vy+qw*ty+qz*tx-qx*tz;out[o+2]=vz+qw*tz+qx*ty-qy*tx;}
function matrixQuat(out,o,m,x){const l0=Math.hypot(m[x],m[x+1],m[x+2])||1,l1=Math.hypot(m[x+4],m[x+5],m[x+6])||1,l2=Math.hypot(m[x+8],m[x+9],m[x+10])||1,a=m[x]/l0,b=m[x+1]/l0,c=m[x+2]/l0,d=m[x+4]/l1,e=m[x+5]/l1,f=m[x+6]/l1,g=m[x+8]/l2,h=m[x+9]/l2,i=m[x+10]/l2,trace=a+e+i;let qx,qy,qz,qw;if(trace>0){const s=Math.sqrt(trace+1)*2;qw=s/4;qx=(f-h)/s;qy=(g-c)/s;qz=(b-d)/s;}else if(a>e&&a>i){const s=Math.sqrt(1+a-e-i)*2;qw=(f-h)/s;qx=s/4;qy=(d+b)/s;qz=(g+c)/s;}else if(e>i){const s=Math.sqrt(1+e-a-i)*2;qw=(g-c)/s;qx=(d+b)/s;qy=s/4;qz=(h+f)/s;}else{const s=Math.sqrt(1+i-a-e)*2;qw=(b-d)/s;qx=(g+c)/s;qy=(h+f)/s;qz=s/4;}const l=Math.hypot(qx,qy,qz,qw)||1;out[o]=qx/l;out[o+1]=qy/l;out[o+2]=qz/l;out[o+3]=qw/l;}
function solveArmLegacy(state,pose,left,target,frameYaw=0){const upper=left?12:22,lower=left?11:21,wrist=left?7:18,thumb=left?9:20,grip=left?6:16,side=left?1:-1,q=state.primaryScratch,so=upper*16,eo=lower*16,wo=wrist*16,go=grip*16;build(state.asset,state,pose);matrixQuat(q,0,state.global,wo);matrixQuat(q,4,state.global,go);qinv(q,8,q,0);qmul(q,12,q,8,q,4);qinv(q,16,q,12);const half=(frameYaw-Math.PI/2)/2;q[20]=0;q[21]=Math.sin(half);q[22]=0;q[23]=Math.cos(half);qmul(q,24,q,20,q,16);qrot(q,28,q,8,state.global[go+12]-state.global[wo+12],state.global[go+13]-state.global[wo+13],state.global[go+14]-state.global[wo+14]);qrot(q,32,q,24,q[28],q[29],q[30]);const tx=target[0]-q[32],ty=target[1]-q[33],tz=target[2]-q[34],sx=state.global[so+12],sy=state.global[so+13],sz=state.global[so+14],ex=state.global[eo+12],ey=state.global[eo+13],ez=state.global[eo+14],wx=state.global[wo+12],wy=state.global[wo+13],wz=state.global[wo+14],a=Math.hypot(ex-sx,ey-sy,ez-sz),b=Math.hypot(wx-ex,wy-ey,wz-ez),rx=tx-sx,ry=ty-sy,rz=tz-sz,raw=Math.hypot(rx,ry,rz)||1,d=Math.max(Math.abs(a-b)+1e-4,Math.min(a+b-1e-4,raw)),dx=rx/raw,dy=ry/raw,dz=rz/raw;let px=side,py=-.45,pz=0,pdot=px*dx+py*dy+pz*dz;px-=pdot*dx;py-=pdot*dy;pz-=pdot*dz;let pl=Math.hypot(px,py,pz);if(pl<1e-5){px=0;py=-dz;pz=dy;pl=Math.hypot(px,py,pz)||1;}px/=pl;py/=pl;pz/=pl;const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along)),jx=sx+dx*along+px*height,jy=sy+dy*along+py*height,jz=sz+dz*along+pz*height;alignJoint(state,pose,upper,lower,jx,jy,jz);build(state.asset,state,pose);alignJoint(state,pose,lower,wrist,tx,ty,tz);build(state.asset,state,pose);matrixQuat(q,36,state.global,eo);qinv(q,40,q,36);qmul(q,44,q,40,q,24);const po=wrist*10+3,to=thumb*10+3;qinv(q,48,pose,po);qmul(q,52,q,44,q,48);qmul(q,56,q,52,pose,to);for(let k=0;k<4;k++){pose[po+k]=q[44+k];pose[to+k]=q[56+k];}build(state.asset,state,pose);return Math.hypot(state.global[go+12]-target[0],state.global[go+13]-target[1],state.global[go+14]-target[2]);}
function primaryPoseLegacy(state,pose,profile,p){return profile&&p;}
function toolPoseLegacy(state,pose,profile,p,weight){
  state.other.set(pose);build(state.asset,state,state.other);const shoulder=22*16,target=state.primaryTarget;
  let frameYaw=0,side=0,up=-.10,forward=.47;
  if(profile==='lumen-spindle'){side=-.03;up=.18;forward=.54;}
  else if(profile==='rift-bombard'){side=-.05;up=-.13;forward=.43;}
  else if(profile==='blunderbuss'){side=-.04;up=-.08;forward=.50;}
  else if(profile==='great-sweep'){
    const a=p<.18?-65+(p/.18)*38:p<.56?-27+((p-.18)/.38)*112:85-((p-.56)/.44)*150;
    frameYaw=a*Math.PI/180;side=Math.sin(frameYaw)*.22;up=p<.56?.08:-.10;forward=.38+Math.cos(frameYaw)*.13;
  }
  target[0]=state.global[shoulder+12]+side;target[1]=state.global[shoulder+13]+up;target[2]=state.global[shoulder+14]+forward;
  solveArmLegacy(state,state.other,false,target,frameYaw);blend(pose,state.other,weight);
  state.clip=profile==='great-sweep'?'derived-great-sweep':profile==='lumen-spindle'?'derived-raised-wand':'derived-braced-tool';state.clipTime=p;
}
function anklePoint(state,left,out){const lower=left?29:31,o=lower*16,k=left?0:3,g=state.global,a=state.ankleLocal,x=a[k],y=a[k+1],z=a[k+2];out[0]=g[o]*x+g[o+4]*y+g[o+8]*z+g[o+12];out[1]=g[o+1]*x+g[o+5]*y+g[o+9]*z+g[o+13];out[2]=g[o+2]*x+g[o+6]*y+g[o+10]*z+g[o+14];return out;}
function alignJointPoint(state,pose,node,point,tx,ty,tz){
  const j=node*16,jx=state.global[j+12],jy=state.global[j+13],jz=state.global[j+14],ax=point[0]-jx,ay=point[1]-jy,az=point[2]-jz,bx=tx-jx,by=ty-jy,bz=tz-jz,al=Math.hypot(ax,ay,az),bl=Math.hypot(bx,by,bz);if(al<1e-7||bl<1e-7)return;
  const ux=ax/al,uy=ay/al,uz=az/al,vx=bx/bl,vy=by/bl,vz=bz/bl,cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx,cl=Math.hypot(cx,cy,cz),dot=clamp(ux*vx+uy*vy+uz*vz,-1,1);if(cl<1e-8)return;
  const parent=state.asset.meta.nodes[node].parent,pm=parent*16,wx=cx/cl,wy=cy/cl,wz=cz/cl,c0=Math.hypot(state.global[pm],state.global[pm+1],state.global[pm+2])||1,c1=Math.hypot(state.global[pm+4],state.global[pm+5],state.global[pm+6])||1,c2=Math.hypot(state.global[pm+8],state.global[pm+9],state.global[pm+10])||1,lx=(wx*state.global[pm]+wy*state.global[pm+1]+wz*state.global[pm+2])/c0,ly=(wx*state.global[pm+4]+wy*state.global[pm+5]+wz*state.global[pm+6])/c1,lz=(wx*state.global[pm+8]+wy*state.global[pm+9]+wz*state.global[pm+10])/c2,ll=Math.hypot(lx,ly,lz)||1,angle=Math.acos(dot),s=Math.sin(angle/2)/ll,dw=Math.cos(angle/2),dx=lx*s,dy=ly*s,dz=lz*s,o=node*10+3,x=pose[o],y=pose[o+1],z=pose[o+2],w=pose[o+3];pose[o]=dw*x+dx*w+dy*z-dz*y;pose[o+1]=dw*y-dx*z+dy*w+dz*x;pose[o+2]=dw*z+dx*y-dy*x+dz*w;pose[o+3]=dw*w-dx*x-dy*y-dz*z;
}
function solveLeg(state,pose,left,target,weight,data) {
  const upper=left?30:32,lower=left?29:31,foot=left?1:36,g=state.global,ho=upper*16,ko=lower*16,ankle=state.anklePoint;
  build(state.asset,state,pose);anklePoint(state,left,ankle);
  const hx=g[ho+12],hy=g[ho+13],hz=g[ho+14],kx=g[ko+12],ky=g[ko+13],kz=g[ko+14];
  const a=Math.hypot(kx-hx,ky-hy,kz-hz),b=Math.hypot(ankle[0]-kx,ankle[1]-ky,ankle[2]-kz),rx=target[0]-hx,ry=target[1]-hy,rz=target[2]-hz;
  const raw=Math.hypot(rx,ry,rz)||1,d=clamp(raw,Math.abs(a-b)+1e-5,a+b-1e-5),dx=rx/raw,dy=ry/raw,dz=rz/raw;
  // Approach the source knee plane continuously, then use a forward knee pole at full weight.
  let px=(kx-hx)*(1-weight),py=(ky-hy)*(1-weight),pz=(kz-hz)*(1-weight)+weight;
  const dot=px*dx+py*dy+pz*dz;px-=dot*dx;py-=dot*dy;pz-=dot*dz;
  const plen=Math.hypot(px,py,pz)||1;px/=plen;py/=plen;pz/=plen;
  const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
  alignJoint(state,pose,upper,lower,hx+dx*along+px*height,hy+dy*along+py*height,hz+dz*along+pz*height);
  build(state.asset,state,pose);anklePoint(state,left,ankle);alignJointPoint(state,pose,lower,ankle,hx+dx*d,hy+dy*d,hz+dz*d);
  build(state.asset,state,pose);anklePoint(state,left,ankle);
  const fx=ankle[0]+data[3]*(1-weight),fy=ankle[1]+data[4]*(1-weight),fz=ankle[2]+data[5]*(1-weight),q=state.primaryScratch;
  inverseAffine(q,0,g,38*16);const o=foot*10;
  pose[o]=q[0]*fx+q[4]*fy+q[8]*fz+q[12]-state.fit.offsets[foot*3];
  pose[o+1]=q[1]*fx+q[5]*fy+q[9]*fz+q[13]-state.fit.offsets[foot*3+1];
  pose[o+2]=q[2]*fx+q[6]*fy+q[10]*fz+q[14]-state.fit.offsets[foot*3+2];
  quaternion(q,16,data,6,state.hammerFeet,(left?0:1)*8+3,weight);
  matrixQuat(q,20,g,38*16);qinv(q,24,q,20);qmul(pose,o+3,q,24,q,16);
}
// Ordinary-air articulation consumes captured physical clocks; it never supplies world lift.
// Authored beats (Tim, 2026-11-11, a readable full sequence): a crouched push at takeoff, knees
// tucked and arms lifted out for balance through the rise and hang, then legs reaching down,
// arms settling and the chest leaning in to meet the ground. Legs read only the fixed rise/fall
// clocks; every layer is scaled by the connection envelope, so both ends are the ground pose.
const AIR_POSE = Object.freeze({ tuck: .19, tuckLead: .03, tuckBack: .06, armRaise: .34, armOut: .22, elbow: .30, arch: .05, landLean: .09 });
function ordinaryAirPose(asset,state,pose,air,reducedMotion,twoHanded=false){
  if(air?.v!==1)return;
  const elapsed=Number(air.elapsedMs),remaining=Number(air.remainingMs),duration=Number(air.durationMs),rise=Number(air.rise),fall=Number(air.fall),lift=Number(air.lift);
  if(!Number.isFinite(elapsed)||!Number.isFinite(remaining)||!Number.isFinite(duration)||!Number.isFinite(rise)||!Number.isFinite(fall)||!Number.isFinite(lift)||elapsed<0||remaining<0||duration<=0||elapsed>duration||remaining>duration||rise<0||rise>1||fall<0||fall>1||lift<0)return;
  const connection=smoothstep(elapsed/60)*smoothstep(remaining/60);if(!(connection>0))return;
  const fold=smoothstep(rise/.55)*(1-smoothstep(fall/.75));
  const takeoff=smoothstep(elapsed/18)*(1-smoothstep(elapsed/70)),flourish=reducedMotion?.55:1;
  const raise=smoothstep(rise/.40)*(1-smoothstep(fall/.90))*connection*flourish,land=smoothstep((fall-.35)/.55)*connection*flourish,A=AIR_POSE;
  const layer=state.hammerLayer,data=state.hammerLegData,g=state.global,target=state.primaryTarget;
  layer.set(pose);build(asset,state,pose);
  // Preserve each current source sole/ankle frame before solving the independent foot roots.
  for(let side=0;side<2;side++){const left=side===0,foot=left?1:36,o=side*10;anklePoint(state,left,target);for(let k=0;k<3;k++){data[o+k]=target[k];data[o+3+k]=g[foot*16+12+k]-target[k];}matrixQuat(data,o+6,g,foot*16);}
  rotateX(layer,27,.07*takeoff*flourish-A.arch*raise*(1-land)+A.landLean*land);rotateX(layer,24,.045*takeoff*flourish+.04*land);rotateX(layer,4,-.03*takeoff*flourish-.04*land);
  // Arms lift forward and out for balance, elbows soften; a two-handed polearm keeps its frame.
  if(!twoHanded&&raise>0)for(const [shoulder,elbow,out] of [[12,11,-1],[22,21,1]]){rotateX(layer,shoulder,-A.armRaise*raise);rotateZ(layer,shoulder,out*A.armOut*raise);rotateX(layer,elbow,-A.elbow*raise);}
  for(let side=0;side<2;side++){const left=side===0,o=side*10,tuck=A.tuck+(left?A.tuckLead:0);target[0]=data[o]+(left?.015:-.015)*fold;target[1]=data[o+1]+tuck*fold;target[2]=data[o+2]-A.tuckBack*fold;solveLeg(state,layer,left,target,connection,state.hammerLegSides[side]);}
  pose.set(layer);state.clip='derived-ordinary-jump';state.clipTime=elapsed/duration;
}
const HURT_FLINCH = Object.freeze({ lateral: .16, peak: .22, chest: .16, upper: .08, head: .14, twist: .07, guard: .30, elbow: .35 });
// Touchdown absorb after an ordinary jump: the pelvis sinks and recovers over the accepted landing
// clock while both soles stay planted (flat) where they are. Presentation only; u is 0..1.
const LAND_POSE = Object.freeze({ drop: .13, lean: .16, neck: -.07, arms: .16 });
function landingAbsorbPose(asset,state,pose,u,reducedMotion){
  if(!(u>0&&u<1))return;
  const k=(u<.28?smoothstep(u/.28):1-smoothstep((u-.28)/.72))*(reducedMotion?.6:1);if(!(k>0))return;
  plantedCrouch(asset,state,pose,k,LAND_POSE.drop);rotateX(pose,27,LAND_POSE.lean*k);rotateX(pose,4,LAND_POSE.neck*k);rotateZ(pose,12,-LAND_POSE.arms*k);rotateZ(pose,22,LAND_POSE.arms*k);
  state.clip='derived-landing';state.clipTime=u;
}
function soleMinimum(points,q,o) {
  const x=q[o],y=q[o+1],z=q[o+2],w=q[o+3],rx=2*(x*y+z*w),ry=1-2*(x*x+z*z),rz=2*(y*z-x*w);let low=Infinity;
  for(let i=0;i<points.length;i+=3)low=Math.min(low,rx*points[i]+ry*points[i+1]+rz*points[i+2]);
  return low;
}
function hammerPose(asset,state,pose,p) {
  const elapsed=p*570,descent=smoothstep((elapsed-240)/80),weight=smoothstep(elapsed/160)*(1-smoothstep((elapsed-400)/170));
  if(!(weight>0))return;
  const layer=state.hammerLayer,data=state.hammerLegData,g=state.global,target=state.primaryTarget;
  layer.set(pose);build(asset,state,pose);
  // Read the unmodified gait/sole frame BEFORE the pelvis drops.
  for(let side=0;side<2;side++){
    const left=side===0,foot=left?1:36,o=side*10;anklePoint(state,left,target);
    for(let k=0;k<3;k++){data[o+k]=target[k];data[o+3+k]=g[foot*16+12+k]-target[k];}
    matrixQuat(data,o+6,g,foot*16);
  }
  clipPose(asset,asset.clips.Punch,asset.clips.Punch.duration*.40,state.fistSource);
  for(const node of FIST_OWN)for(let k=0;k<4;k++)layer[node*10+3+k]=state.fistSource[node*10+3+k];
  build(asset,state,layer);
  const midX=(g[12*16+12]+g[22*16+12])/2,midY=(g[12*16+13]+g[22*16+13])/2,midZ=(g[12*16+14]+g[22*16+14])/2;
  for(let side=0;side<2;side++){
    const left=side===0,sign=left?1:-1,shoulder=left?12:22,elbow=left?11:21,wrist=left?7:18;
    build(asset,state,layer);const reach=Math.hypot(g[elbow*16+12]-g[shoulder*16+12],g[elbow*16+13]-g[shoulder*16+13],g[elbow*16+14]-g[shoulder*16+14])+Math.hypot(g[wrist*16+12]-g[elbow*16+12],g[wrist*16+13]-g[elbow*16+13],g[wrist*16+14]-g[elbow*16+14]);
    const crossX=midX-sign*.08,crossY=midY-(left?.20:.15),crossZ=midZ+(left?.34:.23);
    target[0]=crossX+(g[shoulder*16+12]+sign*.04-crossX)*descent;
    target[1]=crossY+(g[shoulder*16+13]-.65*reach-crossY)*descent;
    target[2]=crossZ+(midZ+.16-crossZ)*descent;
    solveArm(state,layer,left,target,0);
  }
  blend(pose,layer,weight);
  pose[33*10+1]-=.07*descent*weight;
  for(let side=0;side<2;side++){
    const left=side===0,o=side*10,r=side*8,sign=left?1:-1;
    const lift=left?0:.40*(1-descent)+(elapsed<320?.02*descent:0);
    target[0]=data[o]+(state.hammerFeet[r]+sign*.075*descent-data[o])*weight;
    target[1]=data[o+1]+(state.hammerFeet[r+1]+lift-data[o+1])*weight;
    target[2]=data[o+2]+(state.hammerFeet[r+2]-data[o+2])*weight;
    // A slerped sole can rotate below the linear path of its two endpoint soles. Lift the
    // ankle target by that geometric sag, so the connected leg follows the corrected foot.
    const q=state.primaryScratch,sole=state.hammerSoles[side];quaternion(q,0,data,o+6,state.hammerFeet,r+3,weight);
    target[1]+=Math.max(0,soleMinimum(sole,data,o+6)*(1-weight)+soleMinimum(sole,state.hammerFeet,r+3)*weight-soleMinimum(sole,q,0));
    solveLeg(state,pose,left,target,weight,state.hammerLegSides[side]);
  }
  state.clip='derived-hammerfall-stomp';state.clipTime=p;
}
function solveArm(state,pose,left,target,frameYaw=0,framePitch=0){const upper=left?12:22,lower=left?11:21,wrist=left?7:18,thumb=left?9:20,grip=left?6:16,side=left?1:-1,q=state.primaryScratch,so=upper*16,eo=lower*16,wo=wrist*16,go=grip*16;build(state.asset,state,pose);matrixQuat(q,0,state.global,wo);matrixQuat(q,4,state.global,go);qinv(q,8,q,0);qmul(q,12,q,8,q,4);qinv(q,16,q,12);const half=(frameYaw-Math.PI/2)/2;const qs=Math.sin(half),qc=Math.cos(half),sp=Math.sin(framePitch/2),cp=Math.cos(framePitch/2);q[20]=qs*sp;q[21]=qs*cp;q[22]=qc*sp;q[23]=qc*cp;qmul(q,24,q,20,q,16);qrot(q,28,q,8,state.global[go+12]-state.global[wo+12],state.global[go+13]-state.global[wo+13],state.global[go+14]-state.global[wo+14]);qrot(q,32,q,24,q[28],q[29],q[30]);const tx=target[0]-q[32],ty=target[1]-q[33],tz=target[2]-q[34],sx=state.global[so+12],sy=state.global[so+13],sz=state.global[so+14],ex=state.global[eo+12],ey=state.global[eo+13],ez=state.global[eo+14],wx=state.global[wo+12],wy=state.global[wo+13],wz=state.global[wo+14],a=Math.hypot(ex-sx,ey-sy,ez-sz),b=Math.hypot(wx-ex,wy-ey,wz-ez),rx=tx-sx,ry=ty-sy,rz=tz-sz,raw=Math.hypot(rx,ry,rz)||1,d=Math.max(Math.abs(a-b)+1e-4,Math.min(a+b-1e-4,raw)),dx=rx/raw,dy=ry/raw,dz=rz/raw;let px=side,py=-.45,pz=0,pdot=px*dx+py*dy+pz*dz;px-=pdot*dx;py-=pdot*dy;pz-=pdot*dz;let pl=Math.hypot(px,py,pz);if(pl<1e-5){px=0;py=-dz;pz=dy;pl=Math.hypot(px,py,pz)||1;}px/=pl;py/=pl;pz/=pl;const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along)),jx=sx+dx*along+px*height,jy=sy+dy*along+py*height,jz=sz+dz*along+pz*height;alignJoint(state,pose,upper,lower,jx,jy,jz);build(state.asset,state,pose);alignJoint(state,pose,lower,wrist,tx,ty,tz);build(state.asset,state,pose);matrixQuat(q,36,state.global,eo);qinv(q,40,q,36);qmul(q,44,q,40,q,24);const po=wrist*10+3,to=thumb*10+3;qinv(q,48,pose,po);qmul(q,52,q,44,q,48);qmul(q,56,q,52,pose,to);for(let k=0;k<4;k++){pose[po+k]=q[44+k];pose[to+k]=q[56+k];}build(state.asset,state,pose);return Math.hypot(state.global[go+12]-target[0],state.global[go+13]-target[1],state.global[go+14]-target[2]);}
// Presentation stages never own hit events. All three return to the same carry pose.
const PRIMARY_CUTS = Object.freeze([
  Object.freeze({ yawA:.55, yawB:1.15, pitchA:.22, pitchB:.58, side:.10, twist:.18 }),
  Object.freeze({ yawA:-.85, yawB:-1.25, pitchA:.16, pitchB:.42, side:-.18, twist:-.18 }),
  Object.freeze({ yawA:.08, yawB:-.45, pitchA:-.12, pitchB:-.55, side:-.04, twist:.06 }),
]);
function rotateY(pose,node,angle){const o=node*10+3,s=Math.sin(angle/2),c=Math.cos(angle/2),x=pose[o],y=pose[o+1],z=pose[o+2],w=pose[o+3];pose[o]=x*c-z*s;pose[o+1]=y*c+w*s;pose[o+2]=z*c+x*s;pose[o+3]=w*c-y*s;}
function primaryPose(state,pose,profile,p,step=1){
  step=Number.isInteger(step)&&step>=1&&step<=3?step:1;
  const commit=p<.12?smoothstep(p/.12):p<=.40?1:1-smoothstep((p-.40)/.60);
  const travel=smoothstep((p-.12)/.28),cut=PRIMARY_CUTS[step-1],pike=profile==='cinder-pike';
  // Torso commitment and a free-arm counterbalance leave the independent source feet alone.
  if(commit>0){rotateY(pose,27,(pike?(step===2?-.10:.10):cut.twist)*commit);rotateX(pose,24,(pike?.13:step===3?.15:.07)*commit);rotateX(pose,4,-.05*commit);if(!pike){rotateX(pose,12,-.28*commit);rotateZ(pose,12,-cut.twist*.4*commit);}}
  build(state.asset,state,pose);
  const t=state.primaryTarget,g=state.global,ls=12*16,le=11*16,lw=7*16,rs=22*16,re=21*16,rw=18*16,rg=16*16;
  const leftReach=Math.hypot(g[le+12]-g[ls+12],g[le+13]-g[ls+13],g[le+14]-g[ls+14])+Math.hypot(g[lw+12]-g[le+12],g[lw+13]-g[le+13],g[lw+14]-g[le+14]);
  const rightReach=Math.hypot(g[re+12]-g[rs+12],g[re+13]-g[rs+13],g[re+14]-g[rs+14])+Math.hypot(g[rw+12]-g[re+12],g[rw+13]-g[re+13],g[rw+14]-g[re+14]);
  const reach=Math.min(leftReach,rightReach),cx=(g[ls+12]+g[rs+12])/2,cy=(g[ls+13]+g[rs+13])/2,cz=(g[ls+14]+g[rs+14])/2;
  if(pike){
    // A single raised diagonal shaft joins both hands across the torso. Every optional
    // accepted thrust lowers that same frame, then returns to the same common carry.
    const yaw=.60*(1-commit)+(step===2?-.06:step===3?.06:0)*commit;
    const pitch=.60*(1-commit)+(step===2?-.08:step===3?.08:.04)*commit;
    const nx=Math.sin(yaw)*Math.cos(pitch),ny=Math.sin(pitch),nz=Math.cos(yaw)*Math.cos(pitch),half=reach*.23;
    const x=cx+(step===2?-.025:step===3?.025:0)*commit;
    const y=cy-reach*.36+(step===2?-.10:step===3?.10:0)*commit,z=cz+reach*.22+(step===2?.15:step===3?.17:.13)*commit;
    t[0]=x-nx*half;t[1]=y-ny*half;t[2]=z-nz*half;const rr=solveArm(state,pose,false,t,yaw,pitch);
    t[0]=x+nx*half;t[1]=y+ny*half;t[2]=z+nz*half;const lr=solveArm(state,pose,true,t,yaw,pitch);
    state.primaryGripResidual=Math.max(rr,lr);state.clip='derived-polearm-thrust';
  }else{
    // Low one-hand hip carry. Source hand travel supplies the walking bob; the floor bound
    // keeps the unchanged gladius length clear without resizing the weapon or body.
    const carryX=g[rs+12]-.08,carryY=Math.max(g[rs+13]-rightReach*.80,state.minY+state.referenceHeight*.52),carryZ=g[rs+14]+.06+.04*Math.tanh((g[rg+14]-g[rs+14])*3);
    const yaw=-.20+(cut.yawA+(cut.yawB-cut.yawA)*travel+.20)*commit;
    const pitch=-.70+(cut.pitchA+(cut.pitchB-cut.pitchA)*travel+.70)*commit;
    t[0]=carryX+(cx+cut.side-carryX)*commit;t[1]=carryY+(cy-reach*.44-carryY)*commit;t[2]=carryZ+(cz+reach*.46-carryZ)*commit;
    state.primaryGripResidual=solveArm(state,pose,false,t,yaw,pitch);state.clip='derived-onehand-gladius';
  }
  state.clipTime=p;state.primaryStep=step;
}

function cleaverFourPose(state,pose,p,stage){
  const A=CLEAVER_ARM,m=A.sign,cut=cleaverCutMotion(stage,p),w=cut.weight;
  if(w>0){rotateY(pose,27,m*cut.twist);rotateX(pose,24,(.10-.05*cut.rise)*w);rotateX(pose,4,-.045*w);rotateX(pose,A.free,-.28*w);rotateZ(pose,A.free,m*cut.twist*.4);}
  build(state.asset,state,pose);
  const g=state.global,s=A.shoulder*16,e=A.elbow*16,h=A.wrist*16,grip=A.grip*16,t=state.primaryTarget;
  const reach=Math.hypot(g[e+12]-g[s+12],g[e+13]-g[s+13],g[e+14]-g[s+14])+Math.hypot(g[h+12]-g[e+12],g[h+13]-g[e+13],g[h+14]-g[e+14]);
  const carryX=g[s+12]+m*.08,carryY=Math.max(g[s+13]-reach*.80,state.minY+state.referenceHeight*.52),carryZ=g[s+14]+.06+.04*Math.tanh((g[grip+14]-g[s+14])*3);
  t[0]=carryX+(g[s+12]+m*cut.side-carryX)*w;
  t[1]=carryY+(g[s+13]-reach*(.58-.36*cut.rise)-carryY)*w;
  t[2]=carryZ+(g[s+14]+reach*.48-carryZ)*w;
  state.primaryGripResidual=solveArm(state,pose,A.left,t,m*(.20+(cut.yaw-.20)*w),-.70+(cut.pitch+.70)*w);
  state.clip='derived-left-cleaver-four';state.clipTime=p;state.primaryStep=stage?.step||1;
}

function choreographedCleaverPose(state, pose, frame, reducedMotion) {
  const load = reducedMotion ? .55 : 1, A = CLEAVER_ARM, m = A.sign;
  rotateY(pose, 28, m * frame.twist * .36 * load);
  rotateY(pose, 27, m * frame.twist * .64 * load);
  rotateX(pose, 24, frame.lean * load);
  rotateY(pose, 4, -m * frame.twist * .32 * load);
  rotateX(pose, A.free, -frame.lean * .65 * load);
  build(state.asset, state, pose);
  const g = state.global, shoulder = A.shoulder * 16, elbow = A.elbow * 16, wrist = A.wrist * 16, grip = A.grip * 16, target = state.primaryTarget;
  const reach = Math.hypot(g[elbow+12]-g[shoulder+12],g[elbow+13]-g[shoulder+13],g[elbow+14]-g[shoulder+14]) +
    Math.hypot(g[wrist+12]-g[elbow+12],g[wrist+13]-g[elbow+13],g[wrist+14]-g[elbow+14]);
  // Start at the existing gait-driven carry. Blend the rig-specific offset away
  // as the hand leaves the hip, so the authored endpoints keep their full reach.
  const carry = cleaverCarryFrame();
  const leaveCarry = smoothstep(Math.hypot(frame.side - carry.side, frame.up - carry.up, frame.forward - carry.forward) / .45);
  const carryX = g[shoulder+12] + m * .08;
  const carryY = Math.max(g[shoulder+13] - reach * .80, state.minY + state.referenceHeight * .52);
  const carryZ = g[shoulder+14] + .06 + .04 * Math.tanh((g[grip+14] - g[shoulder+14]) * 3);
  target[0] = carryX + (g[shoulder+12] + m * frame.side * reach - carryX) * leaveCarry;
  target[1] = carryY + (g[shoulder+13] + frame.up * reach - carryY) * leaveCarry;
  target[2] = carryZ + (g[shoulder+14] + frame.forward * reach - carryZ) * leaveCarry;
  state.primaryGripResidual = solveArm(state, pose, A.left, target, m * frame.yaw, frame.pitch);
  state.clip = 'derived-choreographed-cleaver';
}

// Reachable source-space targets for the resolved free hand. The weapon hand remains
// whatever carry/attack layer established; this solver runs last so casting never
// yanks an accepted weapon socket off its grip.
const CAST_HAND_TARGETS=Object.freeze({
  'focus-forward':Object.freeze([.05,.02,.42,-.10,.10,0.025,0.005,0.07]),'fan-release':Object.freeze([.18,.05,.38,-.30,.18,0.065,0.015,0.045]),
  'outward-ring':Object.freeze([.48,-.04,.22,-.65,.05,0.075,-0.01,0.02]),'raised-orb':Object.freeze([.12,.38,.18,-.15,-.45,0.02,0.06,-0.025]),'form-rise':Object.freeze([.18,.34,.14,-.25,-.38,0.015,0.055,0.005]),
  compression:Object.freeze([-.12,-.13,.30,.35,.08,-0.045,-0.035,0.015]),'orbit-gather':Object.freeze([-.08,-.08,.34,.25,.15,-0.03,0.025,0.035]),
  'time-ward':Object.freeze([-.10,-.10,.34,.42,-.05,-0.025,0.015,0.03]),'crossed-ward':Object.freeze([-.16,-.16,.30,.55,-.10,-0.04,0.02,0.025]),'body-ward':Object.freeze([-.20,-.04,.28,.62,-.05,-0.025,0.025,0.02]),
  'dusk-split':Object.freeze([.46,-.08,.20,-.75,.02,0.075,-0.01,0.025]),'dusk-swap':Object.freeze([.34,.02,.35,-.55,.14,0.055,0.02,0.035]),'rift-fold':Object.freeze([.36,.04,.38,-.58,.18,0.06,0.015,0.04]),
  'fighting-stance':Object.freeze([.06,-.12,.35,-.12,.22,0.015,-0.015,0.05]),'weapon-imbue':Object.freeze([-.12,-.22,.24,.38,.12,-0.025,-0.025,0.035]),'power-draw':Object.freeze([-.08,-.12,.28,.30,.05,-0.035,-0.02,0.03]),
  'flow-forward':Object.freeze([.12,-.02,.40,-.22,.16,0.035,-0.005,0.06]),acceleration:Object.freeze([.18,-.06,.38,-.30,.18,0.05,0.005,0.05]),'orbit-launch':Object.freeze([.10,.08,.44,-.18,.20,0.03,0.04,0.065]),
  'traversal-brace':Object.freeze([.20,.12,.30,-.32,-.05,0.035,0.04,0.025]),
});
function castPose(state,pose,profile,p,sourceLeft=true){
  const spec=CAST_HAND_TARGETS[profile];if(!spec)return;
  const commit=p<=.08?smoothstep(p/.08):p<.62?1:1-smoothstep((p-.62)/.38);if(!(commit>0))return;
  build(state.asset,state,pose);const g=state.global,s=(sourceLeft?12:22)*16,grip=(sourceLeft?6:16)*16,t=state.primaryTarget,follow=Math.sin(Math.PI*clamp((p-.08)/.54)),side=sourceLeft?1:-1;
  // Immediate spell release remains authoritative. Only the free arm follows through,
  // then retracts; its shoulder and neck counterbalance never move the held grip. The 2026-11-11
  // cast gesture leads with the free shoulder and the head only: the chest is a held-arm ancestor.
  const tail=1-p,flow=16*p*p*tail*tail;
  const x=g[s+12]+(spec[0]+spec[5]*flow)*side,y=g[s+13]+spec[1]+follow*.035+spec[6]*flow,z=g[s+14]+spec[2]+follow*.045+spec[7]*flow;
  t[0]=g[grip+12]+(x-g[grip+12])*commit;t[1]=g[grip+13]+(y-g[grip+13])*commit;t[2]=g[grip+14]+(z-g[grip+14])*commit;
  rotateX(pose,sourceLeft?13:23,-.05*flow*commit);rotateY(pose,sourceLeft?13:23,-side*.10*flow*commit);rotateZ(pose,sourceLeft?13:23,-side*.07*flow*commit);rotateY(pose,4,-side*.045*flow*commit);rotateX(pose,4,.03*flow*commit);
  solveArm(state,pose,sourceLeft,t,spec[3]*commit*side,spec[4]*commit);
}

// Added body loading belongs only to accepted phased tools, never legacy or opaque records.
const TOOL_BODY_LOAD=Object.freeze({
  'rift-bombard':Object.freeze({twist:.055,brace:.085,guard:.10}),
  blunderbuss:Object.freeze({twist:.035,brace:.055,guard:.08}),
  'lumen-spindle':Object.freeze({twist:.018,brace:.025,guard:.035}),
  'great-sweep':Object.freeze({twist:.13,brace:.07,guard:.12}),
});
const TOOL_LIFE = Object.freeze({ load: 1.6, kick: .16, head: .06 });
function phasedToolBodyLoad(pose,profile,p,action,A=SOURCE_RIGHT_ARM){
  const recipe=TOOL_BODY_LOAD[profile];if(!recipe||action?.toolMotion?.v!==1||action?.toolUse?.v!==1)return;
  // toolPose already validates the receipt. Reuse its scalar clock fields without another phase object.
  const use=action.toolUse,duration=Number(action.durationMs),startup=Number(use.startupMs),before=use.phase==='startup';
  if(!before&&use.phase!=='released')return;
  if(!Number.isFinite(startup)||!(startup>0&&startup<=duration))return;
  const elapsed=Math.max(0,p*duration),age=before?Math.min(elapsed,startup):Math.max(0,Math.max(startup,elapsed)-Number(use.releaseOffsetMs));
  // Settle within two stored startup intervals, before the earliest legal repeat.
  const settle=Math.max(1,Math.min(duration-startup,2*startup));
  const u=clamp(before?age/startup:age/settle);
  if(!(u>0&&u<1))return;
  const tail=1-u,pulse=before?16*u*u*tail*tail:(729/16)*u*u*tail*tail*tail*tail;
  // Authored for a source-right (displayed-left) hold; a right-hand tool mirrors the twist.
  const direction=(profile==='great-sweep'&&action.toolMotion.direction===-1?-1:1)*-A.sign,twist=recipe.twist*TOOL_LIFE.load*pulse*direction*(before?-1:1),brace=recipe.brace*TOOL_LIFE.load*pulse*(before?.65:-1);
  // Release recoil: the firing shoulder kicks up and the head rides back with it.
  if(!before&&profile!=='great-sweep'){rotateX(pose,A.shoulder,TOOL_LIFE.kick*pulse);rotateX(pose,4,-TOOL_LIFE.head*pulse);}
  // The independent leg hierarchy and both grip solutions are unchanged at entry/release/expiry.
  rotateY(pose,28,twist*.35);rotateY(pose,27,twist);rotateY(pose,24,twist*.65);
  rotateX(pose,27,brace*.4);rotateX(pose,24,brace);rotateY(pose,4,-twist*.6);
  rotateX(pose,A.free,-recipe.guard*pulse);rotateZ(pose,A.free,-A.sign*twist*.3);
}
function toolPose(state,pose,profile,p,weight,action){
  if(action?.toolMotion&&action.toolMotion.v!==1)return;
  if(action?.toolUse&&['unknown','cancelled'].includes(toolUsePoseTime(action,p*(Number(action?.durationMs)||180)).phase))return;
  // Motions are authored for a source-right hold; r mirrors side and yaw onto a right-hand tool.
  const A=heldArm(profile),r=-A.sign,rifle=Object.hasOwn(CLOSE_VIEW_RIFLE_GRIP,profile)?CLOSE_VIEW_RIFLE_GRIP[profile]:null;
  state.other.set(pose);build(state.asset,state,state.other);const shoulder=A.shoulder*16,target=state.primaryTarget;
  const motion=sampleToolActionMotion(action,p*(Number(action?.durationMs)||180));let frameYaw=0,side=0,up=-.10,forward=.47;
  if(motion){({yaw:frameYaw,side,up,forward,weight}=motion);}
  else if(profile==='lumen-spindle'){side=-.03;up=.18;forward=.54;}
  else if(profile==='rift-bombard'){side=-.05;up=-.13;forward=.43;}
  else if(profile==='blunderbuss'){side=-.04;up=-.08;forward=.50;}
  else if(profile==='great-sweep'){const a=p<.18?-65+(p/.18)*38:p<.56?-27+((p-.18)/.38)*112:85-((p-.56)/.44)*150;frameYaw=a*Math.PI/180;side=Math.sin(frameYaw)*.22;up=p<.56?.08:-.10;forward=.38+Math.cos(frameYaw)*.13;}
  side*=r;frameYaw*=r;let framePitch=0;
  // Rifle grip: the same accepted raise envelope lifts the trigger hand toward the chest
  // centre line so the barrel is shouldered and level while firing.
  if(rifle){side-=A.sign*rifle.raise[0]*weight;up+=rifle.raise[1]*weight;forward+=rifle.raise[2]*weight;framePitch=rifle.pitch*weight;}
  target[0]=state.global[shoulder+12]+side;target[1]=state.global[shoulder+13]+up;target[2]=state.global[shoulder+14]+forward;
  solveArm(state,state.other,A.left,target,frameYaw,framePitch);blend(pose,state.other,weight);
  phasedToolBodyLoad(pose,profile,p,action,A);
  if(rifle&&weight>0)rifleSupportHand(state,pose,profile,rifle,A,weight);
  state.clip=profile==='great-sweep'?'derived-great-sweep':profile==='lumen-spindle'?'derived-raised-wand':rifle?'derived-rifle-grip':'derived-braced-tool';state.clipTime=p;
}
// The free hand takes the barrel from below: a point along the drawn barrel (the exact recipe
// conversion of writeCloseViewHeroGear, in source units), then the arm is solved to it last.
function rifleSupportHand(state,pose,profile,rifle,A,weight){
  build(state.asset,state,pose);
  const g=state.global,o=state.asset.meta.sockets[A.left?'left':'right'].node*16,ax=Math.hypot(g[o],g[o+1],g[o+2]),scale=state.worldScale>0?state.worldScale:1;
  if(!(ax>1e-6))return;
  const along=(rifle.support[0]-.79)*.82*closeViewHeldScale(profile)/scale,t=state.primaryTarget;
  // Socket +X is the barrel. The hand sits under it (source +Y is up).
  t[0]=g[o+12]+g[o]/ax*along;t[1]=g[o+13]+g[o+1]/ax*along-rifle.support[1]/scale;t[2]=g[o+14]+g[o+2]/ax*along;
  state.other.set(pose);solveArm(state,state.other,!A.left,t,A.sign*rifle.supportYaw,rifle.supportPitch);blend(pose,state.other,weight);
}

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
  const s = { asset, pose: new Float64Array(size), other: new Float64Array(size), loop: new Float64Array(size),fistSource:new Float64Array(size),fistScratch:new Float64Array(63),fistBindLocal:new Float64Array(n*9),fistBindGlobal:new Float64Array(n*9),fistMirrorC:new Float64Array(n*n*9), primaryTarget:new Float64Array(3),primaryScratch:new Float64Array(60),primaryGripResidual:0,worldScale:1,hammerLayer:new Float64Array(size),hammerLegData:new Float64Array(20),hammerFeet:new Float64Array(16),ankleLocal:new Float64Array(6),anklePoint:new Float64Array(3),local: new Float64Array(n * 16), global: new Float64Array(n * 16), nodeNormals: new Float64Array(n * 9), skinMatrices: asset.skins.map(k => new Float64Array(k.joints.length * 16)), skinNormals: asset.skins.map(k => new Float64Array(k.joints.length * 9)), vertices: new Float64Array(asset.vertexCount * 6), headScale: asset.meta.headAttachment.defaultScale, seatY: 0, minY: 0, referenceHeight: 1, downClearance: 0, rollX: 0, rollZ: 0, clip: 'Idle', clipTime: 0, rollCompX: 0, rollCompZ: 0 };
  s.hammerLegSides=[s.hammerLegData.subarray(0,10),s.hammerLegData.subarray(10,20)];
  s.proportions={width:proportions.width,depth:proportions.depth,hands:proportions.hands};s.fit=fitProportions(asset,s.proportions);
  clipPose(asset, asset.clips.Idle, 0, s.pose); build(asset, s, s.pose); deform(asset, s);
  {const inv=s.primaryScratch;for(const [side,lower,foot] of [[0,29,1],[1,31,36]]){inverseAffine(inv,0,s.global,lower*16);const x=s.global[foot*16+12],y=s.global[foot*16+13],z=s.global[foot*16+14],o=side*3;s.ankleLocal[o]=inv[0]*x+inv[4]*y+inv[8]*z+inv[12];s.ankleLocal[o+1]=inv[1]*x+inv[5]*y+inv[9]*z+inv[13];s.ankleLocal[o+2]=inv[2]*x+inv[6]*y+inv[10]*z+inv[14];}}
  {const q=s.fistScratch,a=new Float64Array(9),b=new Float64Array(9);for(let node=0;node<n;node++){qmat(s.fistBindLocal,node*9,asset.rest,node*10+3);matrixQuat(q,0,s.global,node*16);qmat(s.fistBindGlobal,node*9,q,0);}for(const [l,r] of FIST_PAIRS)for(const [target,source] of [[l,r],[r,l]]){const tp=asset.meta.nodes[target].parent,sp=asset.meta.nodes[source].parent;m3transpose(a,0,s.fistBindGlobal,tp*9);for(let k=0;k<9;k++)b[k]=s.fistBindGlobal[sp*9+k];b[0]*=-1;b[3]*=-1;b[6]*=-1;m3mul(s.fistMirrorC,(target*n+source)*9,a,0,b,0);}s.fistSource.set(asset.rest);s.other.set(asset.rest);s.fistMirrorRestError=0;for(const [l,r] of FIST_PAIRS)for(const [target,source] of [[l,r],[r,l]]){fistMirroredRotation(s,target,source);const o=target*10+3,d=Math.min(Math.hypot(s.other[o]-asset.rest[o],s.other[o+1]-asset.rest[o+1],s.other[o+2]-asset.rest[o+2],s.other[o+3]-asset.rest[o+3]),Math.hypot(s.other[o]+asset.rest[o],s.other[o+1]+asset.rest[o+1],s.other[o+2]+asset.rest[o+2],s.other[o+3]+asset.rest[o+3]));s.fistMirrorRestError=Math.max(s.fistMirrorRestError,d);}}
  let collar = Infinity, head = Infinity; for (const v of asset.meta.headAttachment.collarVertexIndices) collar = Math.min(collar, s.vertices[v * 6 + 1]);
  for (const m of asset.meta.meshes) if (m.node === asset.meta.headAttachment.node) for (let i = m.firstVertex; i < m.firstVertex + m.vertexCount; i++) head = Math.min(head, s.vertices[i * 6 + 1]);
  const axis = s.global[asset.meta.headAttachment.parent * 16 + 5]; if (!Number.isFinite(head) || Math.abs(axis) < .1) throw new Error('Invalid hero head seating');
  s.seatY = (collar - asset.meta.headAttachment.seatOverlap - head) / axis;
  build(asset, s, s.pose); deform(asset, s); let max = -Infinity; s.minY = Infinity;
  // Bounds belong to rendered triangles, never unused source vertices left by extraction.
  for (const v of asset.arrays.indices) { const y=s.vertices[v*6+1]; s.minY = Math.min(s.minY, y); max = Math.max(max, y); s.downClearance=Math.max(s.downClearance,-s.vertices[v*6+2]+.02); }
  s.referenceHeight = max - s.minY; if (!(s.referenceHeight > .1)) throw new Error('Invalid hero height');
  for(let side=0;side<2;side++){
    const foot=side===0?1:36,r=side*8,points=[],q=s.primaryScratch;let sole=Infinity;
    matrixQuat(q,0,s.global,foot*16);qinv(q,4,q,0);
    for(const mesh of asset.meta.meshes){if(mesh.skin<0)continue;const skin=asset.skins[mesh.skin];for(let v=mesh.firstVertex;v<mesh.firstVertex+mesh.vertexCount;v++){let influence=0;for(let k=0;k<4;k++)if(skin.joints[asset.arrays.joints[v*4+k]]===foot)influence+=asset.arrays.weights[v*4+k];if(influence>.5){sole=Math.min(sole,s.vertices[v*6+1]);qrot(q,8,q,4,s.vertices[v*6]-s.global[foot*16+12],s.vertices[v*6+1]-s.global[foot*16+13],s.vertices[v*6+2]-s.global[foot*16+14]);points.push(q[8],q[9],q[10]);}}}
    (s.hammerSoles||=[])[side]=Float64Array.from(points);
    s.hammerFeet[r]=s.global[foot*16+12];s.hammerFeet[r+1]=s.global[foot*16+13]+s.minY-sole+.0045;s.hammerFeet[r+2]=s.global[foot*16+14];matrixQuat(s.hammerFeet,r+3,s.global,foot*16);
  }

  clipPose(asset, asset.clips.Roll, .08, s.other); build(asset, s, s.other); const b = asset.meta.reference.bodyNode * 16; s.rollX = s.global[b + 12]; s.rollZ = s.global[b + 14];
  return s;
}
export function createHeroFrame(asset) { return { asset, positionsNormals: new Float32Array(asset.vertexCount * 6), vertexCount: asset.vertexCount, indexCount: asset.indexCount, alpha: 1, tint: new Float32Array([1, 1, 1]), hitFlash: 0, leftSocket: new Float32Array(16), rightSocket: new Float32Array(16), powerSuit: false, suitPositionsNormals: new Float32Array(CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES * 3 * 6), suitVertexCount: 0, kitPositionsNormals: new Float32Array(KIT_BUFFER_TRIANGLES * 3 * 6), kitVertexCount: 0, kitSet: '', ready: false }; }

// Source action intervals/contact markers are visual only; no event is emitted here.
export const HERO_CLIP_POLICY = Object.freeze({ melee: 'Dagger_Attack', hammer: 'Dagger_Attack2', punch: 'Punch', dodge: 'Roll', hit: 'RecieveHit', death: 'Death', interact: 'PickUp', contact: .18, sourceContact: .35 });
function rotateX(pose, node, angle) { const o = node * 10 + 3, s = Math.sin(angle / 2), c = Math.cos(angle / 2), x = pose[o], y = pose[o + 1], z = pose[o + 2], w = pose[o + 3]; pose[o] = x * c + w * s; pose[o + 1] = y * c + z * s; pose[o + 2] = z * c - y * s; pose[o + 3] = w * c - x * s; }
function rotateZ(pose,node,angle){const o=node*10+3,s=Math.sin(angle/2),c=Math.cos(angle/2),x=pose[o],y=pose[o+1],z=pose[o+2],w=pose[o+3];pose[o]=x*c+y*s;pose[o+1]=y*c-x*s;pose[o+2]=z*c+w*s;pose[o+3]=w*c-z*s;}
const FIST_PAIRS=[[13,23],[12,22],[11,21],[7,18]],FIST_ARMS=[13,23,12,22,11,21,7,18],FIST_OWN=[6,5,9,8,17,14,20,19];
function qmat(out,o,q,k){const x=q[k],y=q[k+1],z=q[k+2],w=q[k+3];out[o]=1-2*(y*y+z*z);out[o+1]=2*(x*y+z*w);out[o+2]=2*(x*z-y*w);out[o+3]=2*(x*y-z*w);out[o+4]=1-2*(x*x+z*z);out[o+5]=2*(y*z+x*w);out[o+6]=2*(x*z+y*w);out[o+7]=2*(y*z-x*w);out[o+8]=1-2*(x*x+y*y);}
function m3mul(out,o,a,x,b,y){for(let c=0;c<3;c++)for(let r=0;r<3;r++)out[o+c*3+r]=a[x+r]*b[y+c*3]+a[x+3+r]*b[y+c*3+1]+a[x+6+r]*b[y+c*3+2];}
function m3transpose(out,o,a,x){for(let c=0;c<3;c++)for(let r=0;r<3;r++)out[o+c*3+r]=a[x+r*3+c];}
function m3quat(out,o,m,k){const a=m[k],b=m[k+1],c=m[k+2],d=m[k+3],e=m[k+4],f=m[k+5],g=m[k+6],h=m[k+7],i=m[k+8],tr=a+e+i;let x,y,z,w;if(tr>0){const s=Math.sqrt(tr+1)*2;w=s/4;x=(f-h)/s;y=(g-c)/s;z=(b-d)/s;}else if(a>e&&a>i){const s=Math.sqrt(1+a-e-i)*2;w=(f-h)/s;x=s/4;y=(d+b)/s;z=(g+c)/s;}else if(e>i){const s=Math.sqrt(1+e-a-i)*2;w=(g-c)/s;x=(d+b)/s;y=s/4;z=(h+f)/s;}else{const s=Math.sqrt(1+i-a-e)*2;w=(b-d)/s;x=(g+c)/s;y=(h+f)/s;z=s/4;}const l=Math.hypot(x,y,z,w)||1;out[o]=x/l;out[o+1]=y/l;out[o+2]=z/l;out[o+3]=w/l;}
function fistMirroredRotation(state,target,source){const s=state.fistScratch,bo=source*9,co=(target*state.asset.meta.nodes.length+source)*9,so=source*10+3,to=target*10+3;qmat(s,0,state.fistSource,so);m3transpose(s,9,state.fistBindLocal,bo);m3mul(s,18,s,0,s,9);m3mul(s,27,state.fistMirrorC,co,s,18);m3transpose(s,36,state.fistMirrorC,co);m3mul(s,45,s,27,s,36);m3mul(s,54,s,45,state.fistBindLocal,target*9);m3quat(state.other,to,s,54);}
function fistPose(asset,state,time,lead){clipPose(asset,asset.clips.Punch,time,state.fistSource);state.other.set(state.pose);for(const node of FIST_OWN)for(let k=0;k<4;k++)state.other[node*10+3+k]=state.fistSource[node*10+3+k];if(lead==='left'){for(const [l,r] of FIST_PAIRS){fistMirroredRotation(state,l,r);fistMirroredRotation(state,r,l);}}else for(const node of FIST_ARMS)for(let k=0;k<4;k++)state.other[node*10+3+k]=state.fistSource[node*10+3+k];}
function fistLayer(pose,step,lead,amount){const opening=lead==='left'?'left':'right',hand=step===2?(opening==='left'?'right':'left'):opening,left=hand==='left',upper=left?12:22,lower=left?11:21,other=left?22:12,side=left?-1:1,w=clamp(amount);
  rotateX(pose,28,-.05*w);rotateX(pose,27,(step===3?.20:.10)*w);rotateZ(pose,27,side*(step===2?-.10:.13)*w);rotateZ(pose,24,side*(step===2?-.16:.20)*w);
  if(step===3){rotateX(pose,upper,-.62*w);rotateZ(pose,upper,side*.72*w);rotateX(pose,lower,-.78*w);}else rotateX(pose,other,-.08*w);
}
function sourceTime(p, duration) { return duration * (p < .18 ? p / .18 * .35 : .35 + (p - .18) / .82 * .65); }
function fistSourceTime(p,duration){return duration*(p<.08?.35+.05*smoothstep(p/.08):.4+.35*smoothstep((p-.08)/.92));}
function fistReadyPose(asset,state,pose,charge,lead){const w=clamp(charge);if(!(w>0))return;fistPose(asset,state,asset.clips.Punch.duration*.2,lead);blend(pose,state.other,.58*w);}
function weightedMeleePose(asset,state,pose,motion) {
  const w=motion.weight,d=motion.drive;if(!(w>0))return;
  if(motion.kind==='iron-fists') {
    const left=motion.lead<0,openingLeft=motion.openingLead<0,source=fistSourceTime(motion.progress,asset.clips.Punch.duration);
    fistPose(asset,state,source,left?'left':'right');
    const step=motion.move==='dash'?1:motion.move==='jab'?2:3;
    fistLayer(state.other,step,openingLeft?'left':'right',motion.move==='uppercut'?.96:.76);
    blend(pose,state.other,Math.min(1,w));
    // Loaded hips/torso/shoulders and opposed legs retain the sampled walk beneath the strike.
    rotateY(pose,27,motion.twist);rotateX(pose,24,(motion.move==='dash'?.20:.10)*d);rotateX(pose,4,-.06*d);
    rotateX(pose,left?30:32,-.28*d);rotateX(pose,left?32:30,.13*d);
    build(asset,state,pose);state.other.set(pose);
    // Accepted lead owns the end-effector. Targets start at the current grips so a charged
    // p=0 pose leaves continuously instead of snapping into a new authored source frame.
    for(const strikingLeft of [left]){build(asset,state,state.other);const shoulder=(strikingLeft?12:22)*16,g=state.global,t=state.primaryTarget,isStrike=true,
      forward=motion.move==='dash'?.62:motion.move==='jab'?.58:.46,lift=motion.move==='uppercut'?.20:-.12,side=strikingLeft?.06:-.06,
      tx=g[shoulder+12]+side,ty=g[shoulder+13]+lift,tz=g[shoulder+14]+forward;
      t[0]=tx;t[1]=ty;t[2]=tz;solveArm(state,state.other,strikingLeft,t,strikingLeft?-.08:.08,motion.move==='uppercut'&&isStrike?-.30:-.05);
    }
    blend(pose,state.other,w);
    state.clip=motion.move==='dash'?'derived-weighted-dash-punch':motion.move==='jab'?'derived-weighted-opposite-jab':'derived-weighted-rising-uppercut';state.clipTime=motion.progress;
    return;
  }
  if(motion.kind==='verge-cleaver'&&motion.actionVersion===2){
    // The first cut inherits the source dagger's fast crouch/load; continuations
    // keep its lower-body weight while the accepted descriptor owns distinct arms.
    const source=sourceTime(motion.progress,asset.clips.Dagger_Attack.duration);
    clipPose(asset,asset.clips.Dagger_Attack,source,state.other);
    blend(pose,state.other,Math.min(1,w*(motion.cutIndex===1?.82:.52)));
  }
  const A=CLEAVER_ARM,m=A.sign;
  rotateY(pose,27,m*motion.twist);rotateX(pose,24,(.12-.05*motion.rise)*w);rotateX(pose,4,-.055*w);
  rotateX(pose,m>0?30:32,-.18*d);rotateX(pose,m>0?32:30,.10*d);build(asset,state,pose);state.other.set(pose);
  const g=state.global,s=A.shoulder*16,t=state.primaryTarget;
  // Displayed left hand: a low rusty-gladius carry, then the accepted alternating diagonals.
  t[0]=g[s+12]+m*(.10+motion.side);t[1]=g[s+13]-.18+.18*motion.rise;t[2]=g[s+14]+.28+.16*motion.drive;
  state.primaryGripResidual=solveArm(state,state.other,A.left,t,m*motion.yaw,motion.pitch);blend(pose,state.other,w);
  state.clip=(motion.actionVersion===2?'derived-quick-cleaver-cut-':'derived-weighted-cleaver-')+motion.cutIndex;state.clipTime=motion.progress;
}
// Descriptor-owned counter-load and settling around the canonical contact pose.
// Endpoints and contact are exact zeros: no new clock, root travel, leg solver or grip pass.
const MELEE_LIFE = 2.2;
function weightedMeleeLoad(pose, motion) {
  const p=motion.progress,c=motion.contact;
  if(!(p>0&&p<1)||p===c)return;
  const before=p<c,u=clamp(before?p/Math.max(1e-6,c):(p-c)/Math.max(1e-6,1-c));
  // A flat-ended pulse gives acceleration into the load and deceleration out of follow-through.
  const pulse=16*u*u*(1-u)*(1-u),fist=motion.kind==='iron-fists',jab=motion.move==='jab',upper=motion.move==='uppercut';
  const direction=fist?motion.lead:CLEAVER_ARM.sign*(motion.cutIndex<=2?-1:1),load=direction*pulse*(before?-1:1);
  // Stronger anticipation and follow-through around the unchanged contact pose (zero at contact).
  const scale=(jab?.55:upper?1.10:1)*MELEE_LIFE;
  // Hips are a torso parent; the independent thigh/foot hierarchy is intentionally untouched.
  rotateY(pose,28,.045*load*scale);rotateY(pose,27,.085*load*scale);rotateY(pose,24,.065*load*scale);
  rotateX(pose,27,(before?(upper?-.055:.035):.025)*pulse*scale);
  rotateX(pose,24,(before?.055:-.025)*pulse*scale);rotateY(pose,4,-.065*load*scale);
  const guard=fist?(motion.lead<0?22:12):CLEAVER_ARM.free;
  rotateX(pose,guard,-(before?.11:.055)*pulse*scale);
  rotateZ(pose,guard,.055*load*scale);
}
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
// Bind-space overlays (suit armor, standard kit) follow the deforming skin one bone per piece.
// Returns the written vertex count, or -1 when a piece names a bone outside the skin.
function sampleSkinnedOverlay(parts,asset,state,input,dst,scale,cy,sy,dx,dz,knocked,p) {
  const skin=asset.skins[0],matrices=state.skinMatrices[0],normals=state.skinNormals[0];
  let o=0;
  for(const part of parts) {
    const joint=skin.joints.indexOf(part.node);if(joint<0)return -1;const m=joint*16,n=joint*9;
    for(const v of part.vertices){const x=v[0],y=v[1],z=v[2],px=matrices[m]*x+matrices[m+4]*y+matrices[m+8]*z+matrices[m+12]+dx,py=matrices[m+1]*x+matrices[m+5]*y+matrices[m+9]*z+matrices[m+13],pz=matrices[m+2]*x+matrices[m+6]*y+matrices[m+10]*z+matrices[m+14]+dz;
      // Recipe faces are deliberately outward-wound; transform their bind-space face normal below.
      dst[o++]=input.x+(pz*cy-px*sy)*scale;dst[o++]=input.y+(pz*sy+px*cy)*scale;dst[o++]=input.groundZ+input.liftZ+(py-state.minY)*scale;
      // Filled after each triangle so the same skinned face normal is shared by its three vertices.
      dst[o++]=normals[n+6]*cy-normals[n]*sy;dst[o++]=normals[n+6]*sy+normals[n]*cy;dst[o++]=normals[n+3];
    }
  }
  // Recompute geometric normals after skinning; this also validates every authored plate face.
  for(let i=0;i<o;i+=18){const ax=dst[i],ay=dst[i+1],az=dst[i+2],ux=dst[i+6]-ax,uy=dst[i+7]-ay,uz=dst[i+8]-az,vx=dst[i+12]-ax,vy=dst[i+13]-ay,vz=dst[i+14]-az,nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz);if(!(len>1e-8))return -1;for(let k=0;k<3;k++){dst[i+k*6+3]=nx/len;dst[i+k*6+4]=ny/len;dst[i+k*6+5]=nz/len;}}
  if(knocked&&p>0){const c=Math.cos(p*Math.PI/2),s=Math.sin(p*Math.PI/2),lift=state.downClearance*scale*s;for(let i=0;i<o;i+=6){const x=dst[i]-input.x,y=dst[i+1]-input.y,z=dst[i+2]-input.groundZ-input.liftZ,f=x*cy+y*sy,l=-x*sy+y*cy,forward=f*c-z*s;dst[i]=input.x+forward*cy-l*sy;dst[i+1]=input.y+forward*sy+l*cy;dst[i+2]=input.groundZ+input.liftZ+z*c+f*s+lift;const nf=dst[i+3]*cy+dst[i+4]*sy,nl=-dst[i+3]*sy+dst[i+4]*cy,nz=dst[i+5],ff=nf*c-nz*s;dst[i+3]=ff*cy-nl*sy;dst[i+4]=ff*sy+nl*cy;dst[i+5]=nz*c+nf*s;}}
  return o/6;
}
function samplePowerSuitArmor(asset,state,input,out,scale,cy,sy,dx,dz,knocked,p) {
  const count=sampleSkinnedOverlay(CLOSE_VIEW_POWER_SUIT_ARMOR,asset,state,input,out.suitPositionsNormals,scale,cy,sy,dx,dz,knocked,p);
  if(count<0)return false;out.suitVertexCount=count;return true;
}
// Aliveness (Tim, 2026-11-11: "the character should be alive... responsive... a living thing").
// Additive, clock-driven layers on the accepted locomotion pose: breathing, a slow weight shift and
// glances while standing; a lean into acceleration and back when stopping; the chest and head
// leading a turn in place. All are zero at a zero clock, and reduced motion freezes the idle clock.
const LIFE = Object.freeze({ breathS: 3.6, breath: .024, shiftS: 5.3, shift: .032, lookS: 8.3, look: .075, accel: .13, accelHead: .05, turnChest: .16, turnHead: .18, turnHips: .035 });
function alivePose(pose,idleSec,speed,input){
  const still=1-Math.min(1,speed/1.2);
  if(still>0&&idleSec>0){const b=Math.sin(TAU*idleSec/LIFE.breathS),w=Math.sin(TAU*idleSec/LIFE.shiftS),l=Math.sin(TAU*idleSec/LIFE.lookS)*Math.sin(TAU*idleSec/(LIFE.lookS*.41));
    rotateX(pose,24,-LIFE.breath*b*still);rotateZ(pose,28,LIFE.shift*w*still);rotateZ(pose,27,-LIFE.shift*.7*w*still);rotateY(pose,4,LIFE.look*l*still);}
  const a=clamp(Number(input.accel)||0,-1,1);if(a&&!input.reducedMotion){rotateX(pose,27,LIFE.accel*a);rotateX(pose,4,-LIFE.accelHead*a);}
  const t=clamp(Number(input.turn)||0,-1,1)*still;if(t){rotateY(pose,27,LIFE.turnChest*t);rotateY(pose,4,LIFE.turnHead*t);rotateZ(pose,28,LIFE.turnHips*t);}
}
// Planted crouch: the pelvis sinks while both soles stay where they are (flattening by k).
function plantedCrouch(asset,state,pose,k,drop){
  if(!(k>0))return;const data=state.hammerLegData,g=state.global,target=state.primaryTarget;build(asset,state,pose);
  for(let side=0;side<2;side++){const left=side===0,foot=left?1:36,o=side*10;anklePoint(state,left,target);for(let q=0;q<3;q++){data[o+q]=target[q];data[o+3+q]=g[foot*16+12+q]-target[q];}matrixQuat(data,o+6,g,foot*16);}
  pose[33*10+1]-=drop*k;
  for(let side=0;side<2;side++){const left=side===0,o=side*10;target[0]=data[o];target[1]=data[o+1];target[2]=data[o+2];solveLeg(state,pose,left,target,k,state.hammerLegSides[side]);}
}
const PICKUP_POSE = Object.freeze({ drop: .36, chestDrop: .17, bend: .46, upper: .22, reach: .30 });
const DRINK_LIFE = Object.freeze({ tilt: .26, arch: .10, shoulder: .08 });
export function sampleCloseViewHero(asset, state, input, out) {
  out.ready = false;out.powerSuit=false;out.suitVertexCount=0;out.kitVertexCount=0;out.kitSet='';state.worldScale=input.height/state.referenceHeight;
  if (out.asset !== asset || !Number.isFinite(input.nowMs) || !Number.isFinite(input.x) || !Number.isFinite(input.y) || !Number.isFinite(input.groundZ) || !Number.isFinite(input.liftZ) || !Number.isFinite(input.yaw) || !(input.height > 0) || !Number.isFinite(input.height)) return false;
  // Input speed is tiles/second; the existing gait phase is already distance-driven radians.
  const speed = Math.max(0,Number(input.speed)||0), phase = ((Number(input.gaitPhase) || 0) / TAU % 1 + 1) % 1;
  const action=input.action,p=clamp(Number(action?.phase)||0),knocked=action?.kind==='hit'&&action.profile==='knockdown';
  // Accepted action progress, not wall-clock idle breathing, owns every action blend.
  const hammerAction=action?.kind==='melee'&&action.profile==='hammer';
  const timedPrimary=action?.kind==='melee'&&['melee','cinder-pike','verge-cleaver','fist','fistCharge'].includes(action.profile)&&Number.isFinite(action.poseMs),timedAction=action?.kind==='dodge'||timedPrimary;
  const idleMs=timedAction&&Number.isFinite(action.poseMs)?action.profile==='fistCharge'?action.poseMs:action.poseMs+p*(Number(action.durationMs)||(timedPrimary?240:260)):input.nowMs;
  const chestOpening=action?.kind==='interact'&&action.profile==='chest-open';
  const shovelDigging=action?.kind==='interact'&&(action.profile==='shovel-dig'||action.profile==='iron-shovel-dig');
  const placingStone=action?.kind==='interact'&&action.profile==='stone-place';
  const locomotionLayer=action?.kind==='drink'||(action?.kind==='interact'&&(action.profile==='cache-pickup'||chestOpening||shovelDigging||placingStone));
  const idleFrozen = input.reducedMotion || action&&!timedAction&&!hammerAction&&!locomotionLayer, idleSec = idleFrozen ? 0 : idleMs / 1000;
  clipPose(asset, asset.clips.Idle, idleFrozen ? 0 : ((idleMs / 1000) % asset.clips.Idle.duration + asset.clips.Idle.duration) % asset.clips.Idle.duration, state.pose);
  if (speed > 0 && !knocked) { const walk = asset.clips.Walk || asset.clips.Idle, run = asset.clips.Run || walk; clipPose(asset, walk, phase * walk.duration, state.other); blend(state.pose, state.other, Math.min(1, speed / 1.6)); if (speed > 2.8) { loopPose(asset,run,phase,state.other,state.loop); blend(state.pose,state.other,smoothstep((speed-2.8)/1.2)); } }
  if(!knocked)alivePose(state.pose,idleSec,speed,input);
  const primaryAction=action?.kind==='melee'&&['cinder-pike','verge-cleaver'].includes(action.profile)?action.profile:null,heldPrimary=['cinder-pike','verge-cleaver'].includes(input.heldProfile)?input.heldProfile:null,
    meleeMotion=action?.kind==='melee'?sampleMeleeActionPose(action.meleeAction,p,action?.primaryStage?.step??action?.primaryMotion?.step??action?.primaryStep??action?.fistStep,action?.fistLead):null;
  let clip = null, weight = 0, time = 0, dx = 0, dz = 0;
  state.clip = speed > 2.8 ? 'Run' : speed > 0 ? 'Walk' : 'Idle'; state.clipTime = phase;
  const primaryStage=primaryAction?(primaryVisualStage(action)||(action.primaryMotion?{kind:'opaque'}:{kind:'legacy',step:1})):input.primaryCarryStage,
    carryProfile=primaryAction||heldPrimary,roles=cleaverHandRoles(input.handProfile??carryProfile,primaryStage);
  if(carryProfile==='verge-cleaver'&&input.cleaverFrame){
    choreographedCleaverPose(state,state.pose,input.cleaverFrame,input.reducedMotion);
    state.clipTime=p;
    state.primaryStep=primaryStage?.step||1;
  }
  else if(meleeMotion){
    if(meleeMotion.kind==='verge-cleaver')cleaverFourPose(state,state.pose,0,meleeMotion.actionVersion===1?{kind:'cleaver-four',step:meleeMotion.cutIndex}:input.primaryCarryStage?.kind==='cleaver-four'?input.primaryCarryStage:{kind:'cleaver-four',step:1});
    else {const charge=clamp(Number(action?.fistCharge)||0)*(1-p);if(charge>0)fistReadyPose(asset,state,state.pose,charge,meleeMotion.lead<0?'left':'right');}
    weightedMeleePose(asset,state,state.pose,meleeMotion);
    weightedMeleeLoad(state.pose,meleeMotion);
  }
  else if(carryProfile==='verge-cleaver'&&primaryStage?.kind==='opaque')state.primaryGripResidual=0;
  else if(carryProfile==='verge-cleaver'&&primaryStage?.kind==='cleaver-three')cleaverFourPose(state,state.pose,0,{kind:'cleaver-four',step:1});
  else if(carryProfile==='verge-cleaver'&&(!primaryStage||primaryStage.kind==='cleaver-four'))cleaverFourPose(state,state.pose,primaryAction?p:0,primaryStage);
  else if(primaryAction)primaryPose(state,state.pose,primaryAction,p,action.primaryStep);
  else if(heldPrimary)primaryPose(state,state.pose,heldPrimary,0);
  else state.primaryGripResidual=0;
  if (action&&!meleeMotion) {
    const kind = action.kind, profile = action.profile;
    if (kind === 'melee') { if (profile === 'fist' || profile === 'fistCharge' || profile === 'unarmed') clip = asset.clips.Punch; else if (profile === 'melee' || profile === 'blade' || profile === 'sweep' || profile === 'mirage' || profile === 'orrery' || profile === 'orrery-tap' || profile === 'orrery-release') clip = asset.clips.Dagger_Attack; }
    else if (kind === 'hit'&&!knocked) clip = asset.clips.RecieveHit; else if (kind === 'death') clip = asset.clips.Death; else if (kind === 'interact'&&profile!=='cache-pickup'&&!chestOpening&&!shovelDigging&&!placingStone) clip = asset.clips.PickUp;
    weight = kind === 'death' ? 1 : Math.min(1, p / .08, (1 - p) / .12);
    if (kind === 'hit' && profile === 'hurt' && input.reducedMotion) weight *= .65;
    if(kind==='dodge') {
      const yaw=Number.isFinite(action.yaw)?action.yaw:input.yaw,mx=Number(action.moveX)||0,my=Number(action.moveY)||0,ml=Math.hypot(mx,my)||1,forward=(mx*Math.cos(yaw)+my*Math.sin(yaw))/ml,side=(-mx*Math.sin(yaw)+my*Math.cos(yaw))/ml;
      const envelope=p<.18?smoothstep(p/.18):p<.68?1:1-smoothstep((p-.68)/.32),drive=p<.34?smoothstep(p/.34):p<.68?1:1-smoothstep((p-.68)/.32),source=forward<-.35?.18-drive*.01:.08+drive*.10,forwardLean=forward<0?-forward*.5:forward;
      if(envelope>0){clipPose(asset,asset.clips.Roll,source,state.other);blend(state.pose,state.other,envelope);
        rotateX(state.pose,27,(.03+.22*forwardLean)*envelope);rotateX(state.pose,24,.14*forwardLean*envelope);rotateX(state.pose,4,-.08*forwardLean*envelope);rotateZ(state.pose,27,-.18*side*envelope);rotateZ(state.pose,24,-.14*side*envelope);rotateZ(state.pose,4,.08*side*envelope);}
      state.clip=Math.abs(side)>.55?(side>0?'derived-quickstep-right':'derived-quickstep-left'):(forward<0?'derived-quickstep-back':'derived-quickstep-forward');state.clipTime=p;weight=envelope;
    } else if(knocked) { state.clip='derived-knockdown';state.clipTime=p; }
    else if (clip) { time = kind === 'melee' ? (profile==='fist'?fistSourceTime(p,clip.duration):sourceTime(p, clip.duration)) : p * clip.duration;const fistProfile=kind==='melee'&&(profile==='fist'||profile==='fistCharge'),lead=action.fistLead==='left'?'left':'right',step=[1,2,3].includes(action.fistStep)?action.fistStep:1,strikeLead=step===2?(lead==='left'?'right':'left'):lead;if(fistProfile)fistPose(asset,state,time,strikeLead);else clipPose(asset,clip,time,state.other);
      if(fistProfile){if(profile==='fistCharge'){fistReadyPose(asset,state,state.pose,p,strikeLead);state.clip='derived-fist-charge';state.clipTime=p;clip=null;}else{const envelope=Math.min(1,p/.08,(1-p)/.16),carry=clamp(Number(action.fistCharge)||0)*(1-p);if(carry>0){fistReadyPose(asset,state,state.pose,carry,strikeLead);fistPose(asset,state,time,strikeLead);}fistLayer(state.other,step,lead,step===3?.9:.65);weight=envelope;state.clip=step===1?'derived-dash-punch':step===2?'derived-opposite-jab':'derived-rising-uppercut';state.clipTime=p;}}
      if (kind === 'dodge') { build(asset, state, state.other); const b = asset.meta.reference.bodyNode * 16; dx = -(state.global[b + 12] - state.rollX) * weight; dz = -(state.global[b + 14] - state.rollZ) * weight; }

      if(clip){if(!fistProfile||weight>0)blend(state.pose, state.other, weight);if(!fistProfile){state.clip = clip.name; state.clipTime = time;}}
      // The source RecieveHit is faint at Close View distance: add a sharp flinch (chest and head snap
      // back, guard arms rise) that peaks early and eases out. Same accepted clock, zero at both ends.
      if(clip&&kind==='hit'&&profile==='hurt'&&weight>0){const f=weight*(p<HURT_FLINCH.peak?smoothstep(p/HURT_FLINCH.peak):1-smoothstep((p-HURT_FLINCH.peak)/(1-HURT_FLINCH.peak)));const front=Number.isFinite(input.hurtFront)?clamp(input.hurtFront,-1,1):1,side=Number.isFinite(input.hurtSide)?clamp(input.hurtSide,-1,1):0;rotateX(state.pose,27,-HURT_FLINCH.chest*f*front);rotateX(state.pose,24,-HURT_FLINCH.upper*f*front);rotateX(state.pose,4,-HURT_FLINCH.head*f*front);rotateZ(state.pose,27,HURT_FLINCH.lateral*f*side);rotateY(state.pose,24,-HURT_FLINCH.twist*f*side);rotateZ(state.pose,24,HURT_FLINCH.twist*f*(1-Math.abs(side)));rotateX(state.pose,12,-HURT_FLINCH.guard*f);rotateX(state.pose,22,-HURT_FLINCH.guard*f);rotateX(state.pose,11,-HURT_FLINCH.elbow*f);rotateX(state.pose,21,-HURT_FLINCH.elbow*f);}
    } else if (kind === 'melee' && profile === 'hammer') {
      hammerPose(asset,state,state.pose,p);
    } else if (kind === 'melee' && profile === 'great-sweep') {
      toolPose(state,state.pose,profile,p,weight,action);
    } else if(shovelDigging) {
      const dig=sampleShovelDigPose(p,input.reducedMotion,state);
      if(dig.weight>0){rotateX(state.pose,22,-1.08*dig.down+.34*dig.lever);rotateX(state.pose,21,-.48*dig.down-.30*dig.lever);rotateX(state.pose,18,.18*dig.down-.28*dig.lever);rotateX(state.pose,12,-.42*dig.down-.24*dig.lever);rotateX(state.pose,11,.22*dig.down);rotateX(state.pose,4,.34*dig.down-.16*dig.lever);}
      state.clip=profile==='iron-shovel-dig'?'derived-iron-shovel-dig':'derived-shovel-dig';state.clipTime=p;
    } else if(placingStone) {
      const place=stonePlaceWeight(p,input.reducedMotion);
      if(place>0){if(heldPrimary!=='cinder-pike'){const freeLeft=roles.free==='leftSocket';rotateX(state.pose,freeLeft?12:22,-.88*place);rotateX(state.pose,freeLeft?11:21,.40*place);rotateX(state.pose,freeLeft?7:18,.24*place);}rotateX(state.pose,4,.28*place);rotateX(state.pose,27,.09*place);}
      state.clip='derived-stone-place';state.clipTime=p;
    } else if(kind==='interact'&&(profile==='cache-pickup'||chestOpening)) {
      const reach=chestOpening?chestOpenWeight(p,input.reducedMotion):cacheReachWeight(p,input.reducedMotion);
      const lift=chestOpening?smoothstep(clamp((p-.32)/.25)):0;
      if(reach>0){
        // Leave the gait and occupied hand alone. A two-handed carry gets a brief head cue.
        if(heldPrimary!=='cinder-pike'){
          const freeLeft=roles.free==='leftSocket';
          rotateX(state.pose,freeLeft?12:22,-(chestOpening ? .49+.64*lift : .64)*reach);
          rotateX(state.pose,freeLeft?11:21,(chestOpening ? .18+.44*lift : .29)*reach);
          rotateX(state.pose,freeLeft?7:18,(chestOpening ? -.22+.48*lift : .16)*reach);
        }
        rotateX(state.pose,4,(chestOpening ? .28-.12*lift : .21)*reach);
        // A real crouch and reach (Tim, 2026-11-11): knees bend with the soles planted, the waist
        // folds, and the free hand goes down to the floor; a chest only needs half the depth.
        const c=reach*(chestOpening?.5*(1-.5*lift):1);plantedCrouch(asset,state,state.pose,c,(chestOpening?PICKUP_POSE.chestDrop:PICKUP_POSE.drop));
        rotateX(state.pose,27,PICKUP_POSE.bend*c);rotateX(state.pose,24,PICKUP_POSE.upper*c);
        if(heldPrimary!=='cinder-pike'&&!chestOpening)rotateX(state.pose,roles.free==='leftSocket'?12:22,-PICKUP_POSE.reach*c);
      }
      state.clip=chestOpening?'derived-chest-open':'derived-cache-pickup';state.clipTime=p;
    } else if(kind==='drink') {
      const drink=sampleDrinkPose(p,input.reducedMotion,state),freeLeft=roles.free==='leftSocket',t=state.primaryTarget;
      if(drink.weight>0){state.other.set(state.pose);build(asset,state,state.other);const shoulder=(freeLeft?12:22)*16;
        t[0]=state.global[shoulder+12]+(freeLeft?.10:-.10);t[1]=state.global[shoulder+13]+.38*drink.arm;t[2]=state.global[shoulder+14]+.20*drink.arm;
        solveArm(state,state.other,freeLeft,t,freeLeft?-.12:.12,-.72*drink.arm);
        rotateX(state.other,24,.08*drink.head);rotateX(state.other,4,-.12*drink.head-DRINK_LIFE.tilt*drink.sip);rotateX(state.other,27,-DRINK_LIFE.arch*drink.sip);rotateZ(state.other,freeLeft?13:23,(freeLeft?-1:1)*DRINK_LIFE.shoulder*drink.sip);blend(state.pose,state.other,drink.weight);}
      state.clip='derived-drink';state.clipTime=p;
    } else if (kind === 'ranged' || kind === 'cast' || kind === 'jump') {
      // Explicit derivative pose layers: this source contains no ranged/cast/jump clips.
      const pulse = Math.sin(p * Math.PI) * weight;
      if (kind === 'ranged' && ['rift-bombard','blunderbuss','lumen-spindle'].includes(profile)) toolPose(state,state.pose,profile,p,weight,action);
      // The simple shooting tools (Spark Coil, Needle Caster: profile 'emitter') aim forward from a
      // braced chest-height hold like the named tools, rather than pointing at the ceiling.
      else if (kind === 'ranged' && profile === 'emitter') { toolPose(state,state.pose,profile,p,weight,action); state.clip='derived-ranged'; }
      else if (kind === 'ranged') { const A=heldArm(profile); rotateX(state.pose, A.shoulder, -.8 * weight); rotateX(state.pose, A.elbow, -.4 * weight - .15 * pulse); }
      else if (kind === 'cast') {
        // Orrery tools and pre-descriptor saves retain their established cast layer.
        // Unknown future spell profiles remain neutral until they have a recipe.
        if(profile==='cast'||profile==='orrery-tap'||profile==='orrery-release'){rotateX(state.pose,12,-.65*pulse);rotateX(state.pose,22,-.8*pulse);}
        else castPose(state,state.pose,profile,p,roles.free==='leftSocket');
      }
      else { // Legacy jumps keep their brace; reviewed ordinary-air records add connected legs.
        rotateX(state.pose, 12, -.25 * pulse); rotateX(state.pose, 22, -.25 * pulse);
        ordinaryAirPose(asset,state,state.pose,action.jumpAir,input.reducedMotion,input.heldProfile==='cinder-pike');
      }
      if(state.clip!=='derived-ordinary-jump'&&!(kind==='ranged'&&['rift-bombard','blunderbuss','lumen-spindle'].includes(profile)))state.clip = kind==='ranged'?'derived-ranged':kind==='cast'?'derived-cast':'derived-jump';
    }
  }
  if(!action&&Number.isFinite(input.landing))landingAbsorbPose(asset,state,state.pose,clamp(Number(input.landing)),input.reducedMotion);
  build(asset,state,state.pose);if(action?.kind==='dodge'){const b=asset.meta.reference.bodyNode*16;dx=-(state.global[b+12]-state.rollX)*weight;dz=-(state.global[b+14]-state.rollZ)*weight;} deform(asset, state); state.rollCompX = dx; state.rollCompZ = dz;
  const scale = input.height / state.referenceHeight, yaw = action && Number.isFinite(action.yaw) ? action.yaw : input.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw), v = state.vertices, dst = out.positionsNormals;
  // Source +Z faces forward, source Y is up. The cyclic permutation preserves handedness.
  for (let i = 0; i < v.length; i += 6) { const x = v[i] + dx, y = v[i + 1] - state.minY, z = v[i + 2] + dz; dst[i] = input.x + (z * cy - x * sy) * scale; dst[i + 1] = input.y + (z * sy + x * cy) * scale; dst[i + 2] = input.groundZ + input.liftZ + y * scale; dst[i + 3] = v[i + 5] * cy - v[i + 3] * sy; dst[i + 4] = v[i + 5] * sy + v[i + 3] * cy; dst[i + 5] = v[i + 4]; }
  socket(out.leftSocket, state.global, asset.meta.sockets.left.node * 16, scale, cy, sy, input, dx, dz, state.minY); socket(out.rightSocket, state.global, asset.meta.sockets.right.node * 16, scale, cy, sy, input, dx, dz, state.minY);
  if(input.powerSuit===true){if(!samplePowerSuitArmor(asset,state,input,out,scale,cy,sy,dx,dz,knocked,p))return false;out.powerSuit=true;}
  // The kit is opt-in per caller: the standard Wayfarer kit, or on the suit its helmet and pack
  // (never the standard kit over the suit armor). A bad piece only drops the kit.
  if(input.wayfarerKit===true&&out.kitPositionsNormals?.length===KIT_BUFFER_TRIANGLES*18){const set=out.powerSuit?CLOSE_VIEW_SUIT_KIT:CLOSE_VIEW_WAYFARER_KIT,count=sampleSkinnedOverlay(set,asset,state,input,out.kitPositionsNormals,scale,cy,sy,dx,dz,knocked,p);if(count>0){out.kitVertexCount=count;out.kitSet=out.powerSuit?'suit':'standard';}}
  if(knocked&&p>0)applyKnockdown(out,input,cy,sy,p,state.downClearance*scale);
  out.alpha = clamp(Number.isFinite(input.alpha) ? input.alpha : 1); out.hitFlash = clamp(Number(input.hitFlash) || 0); for (let k = 0; k < 3; k++) out.tint[k] = Number.isFinite(input.tint?.[k]) ? input.tint[k] : 1;
  out.ready = true; return true;
}
