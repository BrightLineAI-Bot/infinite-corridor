// Imported Wayfarer presentation only. No simulation, storage, or import-time I/O.
import { CLOSE_VIEW_POWER_SUIT_ARMOR, CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES } from './close-view-player-forms.ts';
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
function solveArm(state,pose,left,target,frameYaw=0){const upper=left?12:22,lower=left?11:21,wrist=left?7:18,thumb=left?9:20,grip=left?6:16,side=left?1:-1,q=state.primaryScratch,so=upper*16,eo=lower*16,wo=wrist*16,go=grip*16;build(state.asset,state,pose);matrixQuat(q,0,state.global,wo);matrixQuat(q,4,state.global,go);qinv(q,8,q,0);qmul(q,12,q,8,q,4);qinv(q,16,q,12);const half=(frameYaw-Math.PI/2)/2;q[20]=0;q[21]=Math.sin(half);q[22]=0;q[23]=Math.cos(half);qmul(q,24,q,20,q,16);qrot(q,28,q,8,state.global[go+12]-state.global[wo+12],state.global[go+13]-state.global[wo+13],state.global[go+14]-state.global[wo+14]);qrot(q,32,q,24,q[28],q[29],q[30]);const tx=target[0]-q[32],ty=target[1]-q[33],tz=target[2]-q[34],sx=state.global[so+12],sy=state.global[so+13],sz=state.global[so+14],ex=state.global[eo+12],ey=state.global[eo+13],ez=state.global[eo+14],wx=state.global[wo+12],wy=state.global[wo+13],wz=state.global[wo+14],a=Math.hypot(ex-sx,ey-sy,ez-sz),b=Math.hypot(wx-ex,wy-ey,wz-ez),rx=tx-sx,ry=ty-sy,rz=tz-sz,raw=Math.hypot(rx,ry,rz)||1,d=Math.max(Math.abs(a-b)+1e-4,Math.min(a+b-1e-4,raw)),dx=rx/raw,dy=ry/raw,dz=rz/raw;let px=side,py=-.45,pz=0,pdot=px*dx+py*dy+pz*dz;px-=pdot*dx;py-=pdot*dy;pz-=pdot*dz;let pl=Math.hypot(px,py,pz);if(pl<1e-5){px=0;py=-dz;pz=dy;pl=Math.hypot(px,py,pz)||1;}px/=pl;py/=pl;pz/=pl;const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along)),jx=sx+dx*along+px*height,jy=sy+dy*along+py*height,jz=sz+dz*along+pz*height;alignJoint(state,pose,upper,lower,jx,jy,jz);build(state.asset,state,pose);alignJoint(state,pose,lower,wrist,tx,ty,tz);build(state.asset,state,pose);matrixQuat(q,36,state.global,eo);qinv(q,40,q,36);qmul(q,44,q,40,q,24);const po=wrist*10+3,to=thumb*10+3;qinv(q,48,pose,po);qmul(q,52,q,44,q,48);qmul(q,56,q,52,pose,to);for(let k=0;k<4;k++){pose[po+k]=q[44+k];pose[to+k]=q[56+k];}build(state.asset,state,pose);return Math.hypot(state.global[go+12]-target[0],state.global[go+13]-target[1],state.global[go+14]-target[2]);}
function primaryPose(state,pose,profile,p){build(state.asset,state,pose);const t=state.primaryTarget,ls=12*16,le=11*16,lw=7*16,rs=22*16,re=21*16,rw=18*16,leftReach=Math.hypot(state.global[le+12]-state.global[ls+12],state.global[le+13]-state.global[ls+13],state.global[le+14]-state.global[ls+14])+Math.hypot(state.global[lw+12]-state.global[le+12],state.global[lw+13]-state.global[le+13],state.global[lw+14]-state.global[le+14]),rightReach=Math.hypot(state.global[re+12]-state.global[rs+12],state.global[re+13]-state.global[rs+13],state.global[re+14]-state.global[rs+14])+Math.hypot(state.global[rw+12]-state.global[re+12],state.global[rw+13]-state.global[re+13],state.global[rw+14]-state.global[re+14]),reach=Math.min(leftReach,rightReach),midX=(state.global[ls+12]+state.global[rs+12])/2,midY=(state.global[ls+13]+state.global[rs+13])/2-reach*.45,midZ=(state.global[ls+14]+state.global[rs+14])/2+reach*.35,commit=p<=.08?smoothstep(p/.08):p<=.30?1:1-smoothstep((p-.30)/.70);let frameYaw=0;if(profile==='verge-cleaver'){const a=-50*Math.PI/180,b=15*Math.PI/180,c=55*Math.PI/180;frameYaw=p<=.08?a+(b-a)*smoothstep(p/.08):p<=.30?b+(c-b)*smoothstep((p-.08)/.22):a+(c-a)*(1-smoothstep((p-.30)/.70));}const nx=Math.sin(frameYaw),nz=Math.cos(frameYaw),half=reach/6,thrust=profile==='cinder-pike'?.16*commit:0;t[0]=midX-nx*half;t[1]=midY;t[2]=midZ-nz*half+thrust;const rr=solveArm(state,pose,false,t,frameYaw);t[0]=midX+nx*half;t[1]=midY;t[2]=midZ+nz*half+thrust;const lr=solveArm(state,pose,true,t,frameYaw);state.primaryGripResidual=Math.max(rr,lr);state.clip=profile==='cinder-pike'?'derived-polearm-thrust':'derived-twohand-cleaver';state.clipTime=p;}
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
  const s = { asset, pose: new Float64Array(size), other: new Float64Array(size), loop: new Float64Array(size), primaryTarget:new Float64Array(3),primaryScratch:new Float64Array(60),primaryGripResidual:0,local: new Float64Array(n * 16), global: new Float64Array(n * 16), nodeNormals: new Float64Array(n * 9), skinMatrices: asset.skins.map(k => new Float64Array(k.joints.length * 16)), skinNormals: asset.skins.map(k => new Float64Array(k.joints.length * 9)), vertices: new Float64Array(asset.vertexCount * 6), headScale: asset.meta.headAttachment.defaultScale, seatY: 0, minY: 0, referenceHeight: 1, downClearance: 0, rollX: 0, rollZ: 0, clip: 'Idle', clipTime: 0, rollCompX: 0, rollCompZ: 0 };
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
  clipPose(asset, asset.clips.Roll, .08, s.other); build(asset, s, s.other); const b = asset.meta.reference.bodyNode * 16; s.rollX = s.global[b + 12]; s.rollZ = s.global[b + 14];
  return s;
}
export function createHeroFrame(asset) { return { asset, positionsNormals: new Float32Array(asset.vertexCount * 6), vertexCount: asset.vertexCount, indexCount: asset.indexCount, alpha: 1, tint: new Float32Array([1, 1, 1]), hitFlash: 0, leftSocket: new Float32Array(16), rightSocket: new Float32Array(16), powerSuit: false, suitPositionsNormals: new Float32Array(CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES * 3 * 6), suitVertexCount: 0, ready: false }; }

// Source action intervals/contact markers are visual only; no event is emitted here.
export const HERO_CLIP_POLICY = Object.freeze({ melee: 'Dagger_Attack', hammer: 'Dagger_Attack2', punch: 'Punch', dodge: 'Roll', hit: 'RecieveHit', death: 'Death', interact: 'PickUp', contact: .18, sourceContact: .35 });
function rotateX(pose, node, angle) { const o = node * 10 + 3, s = Math.sin(angle / 2), c = Math.cos(angle / 2), x = pose[o], y = pose[o + 1], z = pose[o + 2], w = pose[o + 3]; pose[o] = x * c + w * s; pose[o + 1] = y * c + z * s; pose[o + 2] = z * c - y * s; pose[o + 3] = w * c - x * s; }
function rotateZ(pose,node,angle){const o=node*10+3,s=Math.sin(angle/2),c=Math.cos(angle/2),x=pose[o],y=pose[o+1],z=pose[o+2],w=pose[o+3];pose[o]=x*c+y*s;pose[o+1]=y*c-x*s;pose[o+2]=z*c+w*s;pose[o+3]=w*c-z*s;}
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
function samplePowerSuitArmor(asset,state,input,out,scale,cy,sy,dx,dz,knocked,p) {
  const skin=asset.skins[0],matrices=state.skinMatrices[0],normals=state.skinNormals[0],dst=out.suitPositionsNormals;
  let o=0;
  for(const part of CLOSE_VIEW_POWER_SUIT_ARMOR) {
    const joint=skin.joints.indexOf(part.node);if(joint<0)return false;const m=joint*16,n=joint*9;
    for(const v of part.vertices){const x=v[0],y=v[1],z=v[2],px=matrices[m]*x+matrices[m+4]*y+matrices[m+8]*z+matrices[m+12]+dx,py=matrices[m+1]*x+matrices[m+5]*y+matrices[m+9]*z+matrices[m+13],pz=matrices[m+2]*x+matrices[m+6]*y+matrices[m+10]*z+matrices[m+14]+dz;
      // Recipe faces are deliberately outward-wound; transform their bind-space face normal below.
      dst[o++]=input.x+(pz*cy-px*sy)*scale;dst[o++]=input.y+(pz*sy+px*cy)*scale;dst[o++]=input.groundZ+input.liftZ+(py-state.minY)*scale;
      // Filled after each triangle so the same skinned face normal is shared by its three vertices.
      dst[o++]=normals[n+6]*cy-normals[n]*sy;dst[o++]=normals[n+6]*sy+normals[n]*cy;dst[o++]=normals[n+3];
    }
  }
  // Recompute geometric normals after skinning; this also validates every authored plate face.
  for(let i=0;i<o;i+=18){const ax=dst[i],ay=dst[i+1],az=dst[i+2],ux=dst[i+6]-ax,uy=dst[i+7]-ay,uz=dst[i+8]-az,vx=dst[i+12]-ax,vy=dst[i+13]-ay,vz=dst[i+14]-az,nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz);if(!(len>1e-8))return false;for(let k=0;k<3;k++){dst[i+k*6+3]=nx/len;dst[i+k*6+4]=ny/len;dst[i+k*6+5]=nz/len;}}
  out.suitVertexCount=o/6;
  if(knocked&&p>0){const c=Math.cos(p*Math.PI/2),s=Math.sin(p*Math.PI/2),lift=state.downClearance*scale*s;for(let i=0;i<o;i+=6){const x=dst[i]-input.x,y=dst[i+1]-input.y,z=dst[i+2]-input.groundZ-input.liftZ,f=x*cy+y*sy,l=-x*sy+y*cy,forward=f*c-z*s;dst[i]=input.x+forward*cy-l*sy;dst[i+1]=input.y+forward*sy+l*cy;dst[i+2]=input.groundZ+input.liftZ+z*c+f*s+lift;const nf=dst[i+3]*cy+dst[i+4]*sy,nl=-dst[i+3]*sy+dst[i+4]*cy,nz=dst[i+5],ff=nf*c-nz*s;dst[i+3]=ff*cy-nl*sy;dst[i+4]=ff*sy+nl*cy;dst[i+5]=nz*c+nf*s;}}
  return true;
}
export function sampleCloseViewHero(asset, state, input, out) {
  out.ready = false;out.powerSuit=false;out.suitVertexCount=0;
  if (out.asset !== asset || !Number.isFinite(input.nowMs) || !Number.isFinite(input.x) || !Number.isFinite(input.y) || !Number.isFinite(input.groundZ) || !Number.isFinite(input.liftZ) || !Number.isFinite(input.yaw) || !(input.height > 0) || !Number.isFinite(input.height)) return false;
  // Input speed is tiles/second; the existing gait phase is already distance-driven radians.
  const speed = Math.max(0,Number(input.speed)||0), phase = ((Number(input.gaitPhase) || 0) / TAU % 1 + 1) % 1;
  const action=input.action,p=clamp(Number(action?.phase)||0),knocked=action?.kind==='hit'&&action.profile==='knockdown';
  // Accepted action progress, not wall-clock idle breathing, owns every action blend.
  const timedPrimary=action?.kind==='melee'&&['cinder-pike','verge-cleaver'].includes(action.profile)&&Number.isFinite(action.poseMs),timedAction=action?.kind==='dodge'||timedPrimary;
  const idleMs=timedAction&&Number.isFinite(action.poseMs)?action.poseMs+p*(Number(action.durationMs)||(timedPrimary?240:260)):input.nowMs;
  clipPose(asset, asset.clips.Idle, input.reducedMotion || action&&!timedAction ? 0 : ((idleMs / 1000) % asset.clips.Idle.duration + asset.clips.Idle.duration) % asset.clips.Idle.duration, state.pose);
  if (speed > 0 && !knocked) { const walk = asset.clips.Walk || asset.clips.Idle, run = asset.clips.Run || walk; clipPose(asset, walk, phase * walk.duration, state.other); blend(state.pose, state.other, Math.min(1, speed / 1.6)); if (speed > 2.8) { loopPose(asset,run,phase,state.other,state.loop); blend(state.pose,state.other,smoothstep((speed-2.8)/1.2)); } }
  const primaryAction=action?.kind==='melee'&&['cinder-pike','verge-cleaver'].includes(action.profile)?action.profile:null,heldPrimary=['cinder-pike','verge-cleaver'].includes(input.heldProfile)?input.heldProfile:null;
  let clip = null, weight = 0, time = 0, dx = 0, dz = 0;
  state.clip = speed > 2.8 ? 'Run' : speed > 0 ? 'Walk' : 'Idle'; state.clipTime = phase;
  if(primaryAction)primaryPose(state,state.pose,primaryAction,p);else if(heldPrimary)primaryPose(state,state.pose,heldPrimary,0);else state.primaryGripResidual=0;
  if (action) {
    const kind = action.kind, profile = action.profile;
    if (kind === 'melee') { if (profile === 'fist' || profile === 'unarmed') clip = asset.clips.Punch; else if (profile === 'hammer') clip = asset.clips.Dagger_Attack2; else if (profile === 'melee' || profile === 'blade' || profile === 'sweep' || profile === 'mirage' || profile === 'orrery' || profile === 'orrery-tap' || profile === 'orrery-release') clip = asset.clips.Dagger_Attack; }
    else if (kind === 'hit'&&!knocked) clip = asset.clips.RecieveHit; else if (kind === 'death') clip = asset.clips.Death; else if (kind === 'interact') clip = asset.clips.PickUp;
    weight = kind === 'death' ? 1 : Math.min(1, p / .08, (1 - p) / .12);
    if(kind==='dodge') {
      const yaw=Number.isFinite(action.yaw)?action.yaw:input.yaw,mx=Number(action.moveX)||0,my=Number(action.moveY)||0,ml=Math.hypot(mx,my)||1,forward=(mx*Math.cos(yaw)+my*Math.sin(yaw))/ml,side=(-mx*Math.sin(yaw)+my*Math.cos(yaw))/ml;
      const envelope=p<.18?smoothstep(p/.18):p<.68?1:1-smoothstep((p-.68)/.32),drive=p<.34?smoothstep(p/.34):p<.68?1:1-smoothstep((p-.68)/.32),source=forward<-.35?.18-drive*.01:.08+drive*.10,forwardLean=forward<0?-forward*.5:forward;
      if(envelope>0){clipPose(asset,asset.clips.Roll,source,state.other);blend(state.pose,state.other,envelope);
        rotateX(state.pose,27,(.03+.22*forwardLean)*envelope);rotateX(state.pose,24,.14*forwardLean*envelope);rotateX(state.pose,4,-.08*forwardLean*envelope);rotateZ(state.pose,27,-.18*side*envelope);rotateZ(state.pose,24,-.14*side*envelope);rotateZ(state.pose,4,.08*side*envelope);}
      state.clip=Math.abs(side)>.55?(side>0?'derived-quickstep-right':'derived-quickstep-left'):(forward<0?'derived-quickstep-back':'derived-quickstep-forward');state.clipTime=p;weight=envelope;
    } else if(knocked) { state.clip='derived-knockdown';state.clipTime=p; }
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
  build(asset,state,state.pose);if(action?.kind==='dodge'){const b=asset.meta.reference.bodyNode*16;dx=-(state.global[b+12]-state.rollX)*weight;dz=-(state.global[b+14]-state.rollZ)*weight;} deform(asset, state); state.rollCompX = dx; state.rollCompZ = dz;
  const scale = input.height / state.referenceHeight, yaw = action && Number.isFinite(action.yaw) ? action.yaw : input.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw), v = state.vertices, dst = out.positionsNormals;
  // Source +Z faces forward, source Y is up. The cyclic permutation preserves handedness.
  for (let i = 0; i < v.length; i += 6) { const x = v[i] + dx, y = v[i + 1] - state.minY, z = v[i + 2] + dz; dst[i] = input.x + (z * cy - x * sy) * scale; dst[i + 1] = input.y + (z * sy + x * cy) * scale; dst[i + 2] = input.groundZ + input.liftZ + y * scale; dst[i + 3] = v[i + 5] * cy - v[i + 3] * sy; dst[i + 4] = v[i + 5] * sy + v[i + 3] * cy; dst[i + 5] = v[i + 4]; }
  socket(out.leftSocket, state.global, asset.meta.sockets.left.node * 16, scale, cy, sy, input, dx, dz, state.minY); socket(out.rightSocket, state.global, asset.meta.sockets.right.node * 16, scale, cy, sy, input, dx, dz, state.minY);
  if(input.powerSuit===true){if(!samplePowerSuitArmor(asset,state,input,out,scale,cy,sy,dx,dz,knocked,p))return false;out.powerSuit=true;}
  if(knocked&&p>0)applyKnockdown(out,input,cy,sy,p,state.downClearance*scale);
  out.alpha = clamp(Number.isFinite(input.alpha) ? input.alpha : 1); out.hitFlash = clamp(Number(input.hitFlash) || 0); for (let k = 0; k < 3; k++) out.tint[k] = Number.isFinite(input.tint?.[k]) ? input.tint[k] : 1;
  out.ready = true; return true;
}
