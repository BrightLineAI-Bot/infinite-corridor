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
function solveLeg(state,pose,left,target,weight,residual){
  const upper=left?30:32,lower=left?29:31,foot=left?1:36,root=38,g=state.global,ho=upper*16,ko=lower*16,ankle=state.anklePoint;
  build(state.asset,state,pose);anklePoint(state,left,ankle);const hx=g[ho+12],hy=g[ho+13],hz=g[ho+14],kx=g[ko+12],ky=g[ko+13],kz=g[ko+14],a=Math.hypot(kx-hx,ky-hy,kz-hz),b=Math.hypot(ankle[0]-kx,ankle[1]-ky,ankle[2]-kz),rx=target[0]-hx,ry=target[1]-hy,rz=target[2]-hz,raw=Math.hypot(rx,ry,rz)||1,d=Math.max(Math.abs(a-b)+1e-4,Math.min(a+b-1e-4,raw)),dx=rx/raw,dy=ry/raw,dz=rz/raw;
  let px=0,py=0,pz=1,pdot=pz*dz;px-=pdot*dx;py-=pdot*dy;pz-=pdot*dz;const pl=Math.hypot(px,py,pz)||1;px/=pl;py/=pl;pz/=pl;const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along)),jx=hx+dx*along+px*height,jy=hy+dy*along+py*height,jz=hz+dz*along+pz*height;
  alignJoint(state,pose,upper,lower,jx,jy,jz);build(state.asset,state,pose);anklePoint(state,left,ankle);alignJointPoint(state,pose,lower,ankle,target[0],target[1],target[2]);build(state.asset,state,pose);
  const fx=target[0]+residual[0]*(1-weight),fy=target[1]+residual[1]*(1-weight),fz=target[2]+residual[2]*(1-weight),inv=state.primaryScratch;inverseAffine(inv,0,state.global,root*16);const o=foot*10,ox=inv[0]*fx+inv[4]*fy+inv[8]*fz+inv[12],oy=inv[1]*fx+inv[5]*fy+inv[9]*fz+inv[13],oz=inv[2]*fx+inv[6]*fy+inv[10]*fz+inv[14];pose[o]=ox-state.fit.offsets[foot*3];pose[o+1]=oy-state.fit.offsets[foot*3+1];pose[o+2]=oz-state.fit.offsets[foot*3+2];
  const q=state.fistScratch,side=left?0:1;matrixQuat(q,0,state.global,lower*16);qmul(q,4,q,0,state.footRel,side*4);matrixQuat(q,8,state.global,root*16);qinv(q,12,q,8);qmul(q,16,q,12,q,4);for(let k=0;k<4;k++)pose[o+3+k]=q[16+k];
}
function hammerPose(asset,state,pose,p){
  const elapsed=p*570,enter=smoothstep(elapsed/160),descent=smoothstep((elapsed-240)/80),recover=smoothstep((elapsed-400)/170),weight=enter*(1-recover);
  if(!(weight>0))return;
  if(descent>0)pose[33*10+1]-=.07*descent*weight;
  build(asset,state,pose);const g=state.global,t=state.primaryTarget,leftFoot=[0,0,0],rightFoot=[0,0,0],leftResidual=[0,0,0],rightResidual=[0,0,0];anklePoint(state,true,leftFoot);anklePoint(state,false,rightFoot);for(let k=0;k<3;k++){leftResidual[k]=g[1*16+12+k]-leftFoot[k];rightResidual[k]=g[36*16+12+k]-rightFoot[k];}
  const lift=.34*(1-descent)*weight,spread=.075*descent*weight;leftFoot[0]+=spread;rightFoot[0]-=spread;rightFoot[1]+=lift;
  solveLeg(state,pose,true,leftFoot,weight,leftResidual);solveLeg(state,pose,false,rightFoot,weight,rightResidual);
  clipPose(asset,asset.clips.Punch,asset.clips.Punch.duration*.40,state.fistSource);for(const node of FIST_OWN)for(let k=0;k<4;k++)pose[node*10+3+k]=state.fistSource[node*10+3+k];
  build(asset,state,pose);const ls=12*16,rs=22*16,leftReach=Math.hypot(g[11*16+12]-g[ls+12],g[11*16+13]-g[ls+13],g[11*16+14]-g[ls+14])+Math.hypot(g[7*16+12]-g[11*16+12],g[7*16+13]-g[11*16+13],g[7*16+14]-g[11*16+14]),rightReach=Math.hypot(g[21*16+12]-g[rs+12],g[21*16+13]-g[rs+13],g[21*16+14]-g[rs+14])+Math.hypot(g[18*16+12]-g[21*16+12],g[18*16+13]-g[21*16+13],g[18*16+14]-g[21*16+14]),reach=.65*Math.min(leftReach,rightReach);
  const crossed=1-descent,midX=(g[ls+12]+g[rs+12])/2,midY=(g[ls+13]+g[rs+13])/2,midZ=(g[ls+14]+g[rs+14])/2;
  t[0]=crossed?midX+.07:g[ls+12]-.12;t[1]=crossed?midY-.22:g[ls+13]-reach;t[2]=midZ+.24;solveArmLegacy(state,pose,true,t,0);
  t[0]=crossed?midX-.07:g[rs+12]+.12;t[1]=crossed?midY-.18:g[rs+13]-reach;t[2]=midZ+.20;solveArmLegacy(state,pose,false,t,0);
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
    const pitch=(step===2?.20:step===3?-.20:0)*commit,ny=Math.sin(pitch),nz=Math.cos(pitch),half=reach/6;
    const y=cy-reach*.38+(step===2?.10:step===3?-.10:0)*commit,z=cz+reach*.20+.16*commit;
    t[0]=cx;t[1]=y-ny*half;t[2]=z-nz*half;const rr=solveArm(state,pose,false,t,0,pitch);
    t[0]=cx;t[1]=y+ny*half;t[2]=z+nz*half;const lr=solveArm(state,pose,true,t,0,pitch);
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

function toolPose(state,pose,profile,p,weight){
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
  solveArm(state,state.other,false,target,frameYaw);blend(pose,state.other,weight);
  state.clip=profile==='great-sweep'?'derived-great-sweep':profile==='lumen-spindle'?'derived-raised-wand':'derived-braced-tool';state.clipTime=p;
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
  const s = { asset, pose: new Float64Array(size), other: new Float64Array(size), loop: new Float64Array(size),fistSource:new Float64Array(size),fistScratch:new Float64Array(63),fistBindLocal:new Float64Array(n*9),fistBindGlobal:new Float64Array(n*9),fistMirrorC:new Float64Array(n*n*9), primaryTarget:new Float64Array(3),primaryScratch:new Float64Array(60),primaryGripResidual:0,ankleLocal:new Float64Array(6),anklePoint:new Float64Array(3),footRel:new Float64Array(8),local: new Float64Array(n * 16), global: new Float64Array(n * 16), nodeNormals: new Float64Array(n * 9), skinMatrices: asset.skins.map(k => new Float64Array(k.joints.length * 16)), skinNormals: asset.skins.map(k => new Float64Array(k.joints.length * 9)), vertices: new Float64Array(asset.vertexCount * 6), headScale: asset.meta.headAttachment.defaultScale, seatY: 0, minY: 0, referenceHeight: 1, downClearance: 0, rollX: 0, rollZ: 0, clip: 'Idle', clipTime: 0, rollCompX: 0, rollCompZ: 0 };
  s.proportions={width:proportions.width,depth:proportions.depth,hands:proportions.hands};s.fit=fitProportions(asset,s.proportions);
  clipPose(asset, asset.clips.Idle, 0, s.pose); build(asset, s, s.pose); deform(asset, s);
  {const inv=s.primaryScratch,q=s.fistScratch;for(const [side,lower,foot] of [[0,29,1],[1,31,36]]){inverseAffine(inv,0,s.global,lower*16);const x=s.global[foot*16+12],y=s.global[foot*16+13],z=s.global[foot*16+14],o=side*3;s.ankleLocal[o]=inv[0]*x+inv[4]*y+inv[8]*z+inv[12];s.ankleLocal[o+1]=inv[1]*x+inv[5]*y+inv[9]*z+inv[13];s.ankleLocal[o+2]=inv[2]*x+inv[6]*y+inv[10]*z+inv[14];matrixQuat(q,0,s.global,lower*16);matrixQuat(q,4,s.global,foot*16);qinv(q,8,q,0);qmul(s.footRel,side*4,q,8,q,4);}}
  {const q=s.fistScratch,a=new Float64Array(9),b=new Float64Array(9);for(let node=0;node<n;node++){qmat(s.fistBindLocal,node*9,asset.rest,node*10+3);matrixQuat(q,0,s.global,node*16);qmat(s.fistBindGlobal,node*9,q,0);}for(const [l,r] of FIST_PAIRS)for(const [target,source] of [[l,r],[r,l]]){const tp=asset.meta.nodes[target].parent,sp=asset.meta.nodes[source].parent;m3transpose(a,0,s.fistBindGlobal,tp*9);for(let k=0;k<9;k++)b[k]=s.fistBindGlobal[sp*9+k];b[0]*=-1;b[3]*=-1;b[6]*=-1;m3mul(s.fistMirrorC,(target*n+source)*9,a,0,b,0);}s.fistSource.set(asset.rest);s.other.set(asset.rest);s.fistMirrorRestError=0;for(const [l,r] of FIST_PAIRS)for(const [target,source] of [[l,r],[r,l]]){fistMirroredRotation(s,target,source);const o=target*10+3,d=Math.min(Math.hypot(s.other[o]-asset.rest[o],s.other[o+1]-asset.rest[o+1],s.other[o+2]-asset.rest[o+2],s.other[o+3]-asset.rest[o+3]),Math.hypot(s.other[o]+asset.rest[o],s.other[o+1]+asset.rest[o+1],s.other[o+2]+asset.rest[o+2],s.other[o+3]+asset.rest[o+3]));s.fistMirrorRestError=Math.max(s.fistMirrorRestError,d);}}
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
export function createHeroFrame(asset) { return { asset, positionsNormals: new Float32Array(asset.vertexCount * 6), vertexCount: asset.vertexCount, indexCount: asset.indexCount, alpha: 1, tint: new Float32Array([1, 1, 1]), hitFlash: 0, leftSocket: new Float32Array(16), rightSocket: new Float32Array(16), ready: false }; }

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
  const speed = Math.max(0,Number(input.speed)||0), phase = ((Number(input.gaitPhase) || 0) / TAU % 1 + 1) % 1;
  const action=input.action,p=clamp(Number(action?.phase)||0),knocked=action?.kind==='hit'&&action.profile==='knockdown';
  // Accepted action progress, not wall-clock idle breathing, owns every action blend.
  const timedPrimary=action?.kind==='melee'&&['cinder-pike','verge-cleaver','fist','fistCharge'].includes(action.profile)&&Number.isFinite(action.poseMs),timedAction=action?.kind==='dodge'||timedPrimary;
  const idleMs=timedAction&&Number.isFinite(action.poseMs)?action.profile==='fistCharge'?action.poseMs:action.poseMs+p*(Number(action.durationMs)||(timedPrimary?240:260)):input.nowMs;
  clipPose(asset, asset.clips.Idle, input.reducedMotion || action&&!timedAction ? 0 : ((idleMs / 1000) % asset.clips.Idle.duration + asset.clips.Idle.duration) % asset.clips.Idle.duration, state.pose);
  if (speed > 0 && !knocked) { const walk = asset.clips.Walk || asset.clips.Idle, run = asset.clips.Run || walk; clipPose(asset, walk, phase * walk.duration, state.other); blend(state.pose, state.other, Math.min(1, speed / 1.6)); if (speed > 2.8) { loopPose(asset,run,phase,state.other,state.loop); blend(state.pose,state.other,smoothstep((speed-2.8)/1.2)); } }
  const primaryAction=action?.kind==='melee'&&['cinder-pike','verge-cleaver'].includes(action.profile)?action.profile:null,heldPrimary=['cinder-pike','verge-cleaver'].includes(input.heldProfile)?input.heldProfile:null;
  let clip = null, weight = 0, time = 0, dx = 0, dz = 0;
  state.clip = speed > 2.8 ? 'Run' : speed > 0 ? 'Walk' : 'Idle'; state.clipTime = phase;
  if(primaryAction)primaryPose(state,state.pose,primaryAction,p,action.primaryStep);else if(heldPrimary)primaryPose(state,state.pose,heldPrimary,0);else state.primaryGripResidual=0;
  if (action) {
    const kind = action.kind, profile = action.profile;
    if (kind === 'melee') { if (profile === 'fist' || profile === 'fistCharge' || profile === 'unarmed') clip = asset.clips.Punch; else if (profile === 'melee' || profile === 'blade' || profile === 'sweep' || profile === 'mirage' || profile === 'orrery' || profile === 'orrery-tap' || profile === 'orrery-release') clip = asset.clips.Dagger_Attack; }
    else if (kind === 'hit'&&!knocked) clip = asset.clips.RecieveHit; else if (kind === 'death') clip = asset.clips.Death; else if (kind === 'interact') clip = asset.clips.PickUp;
    weight = kind === 'death' ? 1 : Math.min(1, p / .08, (1 - p) / .12);
    if(kind==='dodge') {
      const yaw=Number.isFinite(action.yaw)?action.yaw:input.yaw,mx=Number(action.moveX)||0,my=Number(action.moveY)||0,ml=Math.hypot(mx,my)||1,forward=(mx*Math.cos(yaw)+my*Math.sin(yaw))/ml,side=(-mx*Math.sin(yaw)+my*Math.cos(yaw))/ml;
      const envelope=p<.18?smoothstep(p/.18):p<.68?1:1-smoothstep((p-.68)/.32),drive=p<.34?smoothstep(p/.34):p<.68?1:1-smoothstep((p-.68)/.32),source=forward<-.35?.18-drive*.01:.08+drive*.10,forwardLean=forward<0?-forward*.5:forward;
      if(envelope>0){clipPose(asset,asset.clips.Roll,source,state.other);blend(state.pose,state.other,envelope);
        rotateX(state.pose,27,(.03+.22*forwardLean)*envelope);rotateX(state.pose,24,.14*forwardLean*envelope);rotateX(state.pose,4,-.08*forwardLean*envelope);rotateZ(state.pose,27,-.18*side*envelope);rotateZ(state.pose,24,-.14*side*envelope);rotateZ(state.pose,4,.08*side*envelope);}
      state.clip=Math.abs(side)>.55?(side>0?'derived-quickstep-right':'derived-quickstep-left'):(forward<0?'derived-quickstep-back':'derived-quickstep-forward');state.clipTime=p;weight=envelope;
    } else if(knocked) { state.clip='derived-knockdown';state.clipTime=p; }
    else if (clip) { time = kind === 'melee' ? (profile==='fist'?fistSourceTime(p,clip.duration):sourceTime(p, clip.duration)) : p * clip.duration;const fistProfile=profile==='fist'||profile==='fistCharge',lead=action.fistLead==='left'?'left':'right',step=[1,2,3].includes(action.fistStep)?action.fistStep:1,strikeLead=step===2?(lead==='left'?'right':'left'):lead;if(fistProfile)fistPose(asset,state,time,strikeLead);else clipPose(asset,clip,time,state.other);
      if(fistProfile){if(profile==='fistCharge'){fistReadyPose(asset,state,state.pose,p,strikeLead);state.clip='derived-fist-charge';state.clipTime=p;clip=null;}else{const envelope=Math.min(1,p/.08,(1-p)/.16),carry=clamp(Number(action.fistCharge)||0)*(1-p);if(carry>0){fistReadyPose(asset,state,state.pose,carry,strikeLead);fistPose(asset,state,time,strikeLead);}fistLayer(state.other,step,lead,step===3?.9:.65);weight=envelope;state.clip=step===1?'derived-dash-punch':step===2?'derived-opposite-jab':'derived-rising-uppercut';state.clipTime=p;}}
      if (kind === 'dodge') { build(asset, state, state.other); const b = asset.meta.reference.bodyNode * 16; dx = -(state.global[b + 12] - state.rollX) * weight; dz = -(state.global[b + 14] - state.rollZ) * weight; }
/* retained tool branch blend variant
      blend(state.pose, state.other, weight); state.clip = clip.name; state.clipTime = time;
    } else if (kind === 'melee' && profile === 'hammer') {
      hammerPose(asset,state,state.pose,p);
    } else if (kind === 'melee' && profile === 'hammer') {
      hammerPose(asset,state,state.pose,p);
    } else if (kind === 'melee' && profile === 'hammer') {
      hammerPose(asset,state,state.pose,p);
    } else if (kind === 'melee' && profile === 'great-sweep') {
      toolPose(state,state.pose,profile,p,weight);
*/
      if(clip){if(profile!=='fist'||weight>0)blend(state.pose, state.other, weight);if(profile!=='fist'){state.clip = clip.name; state.clipTime = time;}}
    } else if (kind === 'melee' && profile === 'hammer') {
      hammerPose(asset,state,state.pose,p);
    } else if (kind === 'melee' && profile === 'great-sweep') {
      toolPose(state,state.pose,profile,p,weight);
    } else if (kind === 'ranged' || kind === 'cast' || kind === 'jump') {
      // Explicit derivative pose layers: this source contains no ranged/cast/jump clips.
      const pulse = Math.sin(p * Math.PI) * weight;
      if (kind === 'ranged' && ['rift-bombard','blunderbuss','lumen-spindle'].includes(profile)) toolPose(state,state.pose,profile,p,weight);
      else if (kind === 'ranged') { rotateX(state.pose, 22, -.8 * weight); rotateX(state.pose, 21, -.4 * weight - .15 * pulse); }
      else if (kind === 'cast') { rotateX(state.pose, 12, -.65 * pulse); rotateX(state.pose, 22, -.8 * pulse); }
      else { // Arm brace only: root-parented feet must not be left behind by invented knee IK.
        rotateX(state.pose, 12, -.25 * pulse); rotateX(state.pose, 22, -.25 * pulse);
      }
      if(!(kind==='ranged'&&['rift-bombard','blunderbuss','lumen-spindle'].includes(profile)))state.clip = kind==='ranged'?'derived-ranged':kind==='cast'?'derived-cast':'derived-jump';
    }
  }
  build(asset,state,state.pose);if(action?.kind==='dodge'){const b=asset.meta.reference.bodyNode*16;dx=-(state.global[b+12]-state.rollX)*weight;dz=-(state.global[b+14]-state.rollZ)*weight;} deform(asset, state); state.rollCompX = dx; state.rollCompZ = dz;
  const scale = input.height / state.referenceHeight, yaw = action && Number.isFinite(action.yaw) ? action.yaw : input.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw), v = state.vertices, dst = out.positionsNormals;
  // Source +Z faces forward, source Y is up. The cyclic permutation preserves handedness.
  for (let i = 0; i < v.length; i += 6) { const x = v[i] + dx, y = v[i + 1] - state.minY, z = v[i + 2] + dz; dst[i] = input.x + (z * cy - x * sy) * scale; dst[i + 1] = input.y + (z * sy + x * cy) * scale; dst[i + 2] = input.groundZ + input.liftZ + y * scale; dst[i + 3] = v[i + 5] * cy - v[i + 3] * sy; dst[i + 4] = v[i + 5] * sy + v[i + 3] * cy; dst[i + 5] = v[i + 4]; }
  socket(out.leftSocket, state.global, asset.meta.sockets.left.node * 16, scale, cy, sy, input, dx, dz, state.minY); socket(out.rightSocket, state.global, asset.meta.sockets.right.node * 16, scale, cy, sy, input, dx, dz, state.minY);
  if(knocked&&p>0)applyKnockdown(out,input,cy,sy,p,state.downClearance*scale);
  out.alpha = clamp(Number.isFinite(input.alpha) ? input.alpha : 1); out.hitFlash = clamp(Number(input.hitFlash) || 0); for (let k = 0; k < 3; k++) out.tint[k] = Number.isFinite(input.tint?.[k]) ? input.tint[k] : 1;
  out.ready = true; return true;
}
