// The beast slot's GPU side (release 891; close-view-beast-rig.ts has the why). One program, shared by every beast kind:
// a beast's mesh is uploaded once per GL context (static buffers: bind-space position, normal, colour, bone and emissive
// channel); a frame uploads only its bone matrices (uniforms) and a few material numbers, then draws it in the scene's two
// actor phases (the silhouette behind walls, then the lit body), exactly like the native models it stands among.
// It shades as those models do (close-view-gl.ts MODEL_FS: the same light floor, warm and cool rims, late fog), with one
// difference: emissive parts are marked per vertex by channel instead of by an exact colour, so a beast's core, coils and
// lightning can brighten, fade and flicker with its attacks without touching the shared colour list.
import { BEAST_SLOT } from "./close-view-beast-rig.js?v=r923-8e814be226dc";

const glf = (v) => Number(v).toFixed(4), NB = BEAST_SLOT.maxBones * 3;
export const BEAST_VERTEX_FLOATS = 13; // position 3, normal 3, colour 3, skin 4 (bone, emissive channel, second bone, its weight)
export const BEAST_VERTEX_BODY = `
in vec3 a_pos; in vec3 a_nrm; in vec3 a_col; in vec4 a_skin;
uniform vec4 u_bones[${NB}];
out vec3 v_pos; out vec3 v_nrm; out vec3 v_col; out float v_depth; flat out int v_emit;
void main() {
  // two-bone linear blend: rows of bone a mixed toward bone b by its weight (rigid parts have weight 0)
  int b = int(a_skin.x + .5) * 3, c = int(a_skin.z + .5) * 3; float w = a_skin.w;
  vec4 r0 = mix(u_bones[b], u_bones[c], w), r1 = mix(u_bones[b + 1], u_bones[c + 1], w), r2 = mix(u_bones[b + 2], u_bones[c + 2], w); vec4 p = vec4(a_pos, 1.0);
  vec3 P = vec3(dot(r0, p), dot(r1, p), dot(r2, p));
  v_nrm = vec3(dot(r0.xyz, a_nrm), dot(r1.xyz, a_nrm), dot(r2.xyz, a_nrm));
  float d; gl_Position = project(P, d); v_pos = P; v_col = a_col; v_depth = d; v_emit = int(a_skin.y + .5);
}`;
// L: close-view-gl.ts CLOSE_VIEW_ACTOR_LOOK (passed in: that module imports this one).
export const beastFragmentBody = (L) => `
in vec3 v_pos; in vec3 v_nrm; in vec3 v_col; in float v_depth; flat in int v_emit;
uniform float u_pass; uniform vec3 u_sil; uniform float u_alpha; uniform float u_hit; uniform vec4 u_emitK; uniform vec4 u_emitA;
void main() {
  if (v_pos.z < -0.5) discard;
  float k = v_emit == 1 ? u_emitK.x : v_emit == 2 ? u_emitK.y : v_emit == 3 ? u_emitK.z : v_emit == 4 ? u_emitK.w : 0.0;
  float a = u_alpha * (v_emit == 1 ? u_emitA.x : v_emit == 2 ? u_emitA.y : v_emit == 3 ? u_emitA.z : v_emit == 4 ? u_emitA.w : 1.0);
  const float bayer[16] = float[16](0.0,8.0,2.0,10.0,12.0,4.0,14.0,6.0,3.0,11.0,1.0,9.0,15.0,7.0,13.0,5.0);
  ivec2 pixel = ivec2(gl_FragCoord.xy) & ivec2(3);
  if (a <= (bayer[pixel.y * 4 + pixel.x] + 0.5) / 16.0) discard;
  if (u_pass > 0.5) { if (v_emit >= 3) discard; outColor = vec4(u_sil * 0.1, 0.1); return; }
  vec3 normal = normalize(v_nrm), toEye = normalize(u_eye - v_pos);
  if (dot(normal, toEye) < 0.0 && v_emit >= 3) normal = -normal; // flat glyphs and bolts light from either face
  vec3 dif, spe; lightsAt(v_pos, normal, 14.0, dif, spe);
  float rim = 1.0 - max(0.0, dot(normal, toEye));
  vec3 color = v_col * max(dif, vec3(${glf(L.floor)})) + spe * 0.3 + vec3(${L.rimWarm.map(glf).join(', ')}) * rim * rim
    + vec3(${L.rimCool.map(glf).join(', ')}) * rim * rim * rim;
  float emit = v_emit > 0 ? 1.0 : 0.0;
  // lit from within: the channel's brightness (0 dark glass, 1 its colour, above 1 running white-hot)
  vec3 glowC = v_col * ${glf(L.glow)} * k + vec3(max(k - 1.0, 0.0) * 0.35);
  color = mix(color, mix(color * 0.45, max(color * 0.45, glowC), clamp(k * 2.0, 0.0, 1.0)), emit);
  color = mix(color, vec3(.96, .34, .23), clamp(u_hit, 0.0, 1.0) * .45 * (1.0 - emit));
  float late = u_fogP.x + ${glf(L.fogLate)}, f = clamp((v_depth - late) / max(u_fogP.y - late, 0.001), 0.0, 1.0); f = f * f * (3.0 - 2.0 * f);
  float hz = u_finish.z > 0.5 ? (1.0 - exp(-v_depth * u_fogP.z)) * exp(-max(v_pos.z, 0.0) / u_fogP.w) : 0.0;
  color = mix(color, u_haze + dif * u_finish.y, clamp(hz, 0.0, 0.8) * (1.0 - emit * 0.6));
  outColor = vec4(finish(mix(color, u_fog, f * (1.0 - emit * min(k, 1.0) * (1.0 - ${glf(L.emitFog)})))), 1.0);
}`;

export function createBeastGL(gl, compile, vertexCommon, fragmentCommon, look) {
  return { program: compile(gl, vertexCommon + BEAST_VERTEX_BODY, fragmentCommon + beastFragmentBody(look)), meshes: new Map(), failed: false, uploadBytes: 0 };
}
export function disposeBeastGL(gl, s, destroyProgram = false) {
  if (!s) return;
  for (const m of s.meshes.values()) { if (m.vbo) gl.deleteBuffer(m.vbo); if (m.ibo) gl.deleteBuffer(m.ibo); if (m.vao) gl.deleteVertexArray(m.vao); }
  s.meshes.clear(); s.uploadBytes = 0;
  if (destroyProgram && s.program?.p) gl.deleteProgram(s.program.p);
}
// Upload a mesh once (per context). False keeps the beast on its billboard.
export function prepareBeastMesh(gl, s, mesh) {
  if (!s || s.failed || !mesh || gl.isContextLost?.()) return false;
  if (s.meshes.has(mesh)) return true;
  let r = null;
  try {
    const n = mesh.vertexCount, data = new Float32Array(n * BEAST_VERTEX_FLOATS);
    for (let i = 0; i < n; i++) { const o = i * BEAST_VERTEX_FLOATS;
      data[o] = mesh.positions[i * 3]; data[o + 1] = mesh.positions[i * 3 + 1]; data[o + 2] = mesh.positions[i * 3 + 2];
      data[o + 3] = mesh.normals[i * 3]; data[o + 4] = mesh.normals[i * 3 + 1]; data[o + 5] = mesh.normals[i * 3 + 2];
      data[o + 6] = mesh.colors[i * 3]; data[o + 7] = mesh.colors[i * 3 + 1]; data[o + 8] = mesh.colors[i * 3 + 2];
      data[o + 9] = mesh.skin[i * 4]; data[o + 10] = mesh.skin[i * 4 + 1]; data[o + 11] = mesh.skin[i * 4 + 2]; data[o + 12] = mesh.skin[i * 4 + 3]; }
    r = { vao: gl.createVertexArray(), vbo: gl.createBuffer(), ibo: gl.createBuffer() };
    if (!r.vao || !r.vbo || !r.ibo) throw new Error('beast resources');
    gl.bindVertexArray(r.vao); gl.bindBuffer(gl.ARRAY_BUFFER, r.vbo); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const A = s.program.A; let off = 0;
    for (const [name, size] of [['a_pos', 3], ['a_nrm', 3], ['a_col', 3], ['a_skin', 4]]) { const loc = A[name]; if (loc !== undefined && loc >= 0) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, BEAST_VERTEX_FLOATS * 4, off * 4); } off += size; }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, r.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    if (typeof gl.getError === 'function') { const error = gl.getError(); if (typeof error === 'number' && error !== gl.NO_ERROR) throw new Error('beast upload'); }
    s.meshes.set(mesh, r); s.uploadBytes += data.byteLength + mesh.indices.byteLength; return true;
  } catch {
    if (r) { if (r.vbo) gl.deleteBuffer(r.vbo); if (r.ibo) gl.deleteBuffer(r.ibo); if (r.vao) gl.deleteVertexArray(r.vao); }
    s.failed = true; return false;
  } finally { gl.bindVertexArray(null); }
}
// Draw the frame's beasts in one actor phase (pass 1: silhouette through walls, 0: the body). Returns draw calls.
export function drawBeastsGL(gl, s, beasts, pass, cam, light, silhouette) {
  if (!s || !beasts?.count) return 0;
  const p = s.program, u = p.U; let calls = 0;
  gl.useProgram(p.p); cam(p); light(p); gl.uniform1f(u.u_pass, pass); gl.uniform3fv(u.u_sil, silhouette);
  for (let i = 0; i < beasts.count; i++) {
    const f = beasts.items[i], r = s.meshes.get(f.mesh); if (!r) continue;
    gl.bindVertexArray(r.vao); gl.uniform4fv(u.u_bones, f.skin, 0, f.boneCount * 12);
    gl.uniform1f(u.u_alpha, f.alpha); gl.uniform1f(u.u_hit, f.hit); gl.uniform4fv(u.u_emitK, f.emitK); gl.uniform4fv(u.u_emitA, f.emitA);
    gl.drawElements(gl.TRIANGLES, f.cloud ? f.mesh.indices.length : f.mesh.coreIndices, gl.UNSIGNED_SHORT, 0); calls++;
  }
  return calls;
}
