// Close View's GPU scene (version 4, release 793; Tim, 2026-11-06: "the floor moves and shifts a lot... it's re-rendered
// every time you walk... it looks like it's just made of water... there should be a ceiling... the walls look like they're just
// 3D rendered... the holes and so on look weird... it seems a little bit choppy").
//
// Why the floor swam (versions 1-3): the floor was a stack of screen-space bands, each one or two triangles of the ground
// texture under an affine map. A floor seen in perspective is a projective map; an affine map is exact only at its corners, so
// inside every band the floor was stretched and squeezed by a few pixels, in a pattern fixed to the screen. As the Wayfarer
// walked, the world slid through that fixed pattern: lines bent, crawled and breathed, like the floor was water. Here the floor
// is not mapped at all: one full-screen pass casts a ray from the camera through every pixel to the floor plane (or up to the
// ceiling plane) and reads the ground texture at that exact world point. It is exact everywhere, and the same world point
// always reads the same texel (the texture's origin is snapped to whole device pixels: close-view.ts), so nothing swims.
//
// The same pass gives the place a ceiling (world-anchored panels and beams, fog-faded), pits with depth (the ray carries on
// down through a hole's tiles until it meets the pit's inner wall or its dark bottom), lava with a moving surface that lights
// the floor round it, and a lit lip at every drop's edge. Walls are real quads with a depth buffer, shaded per pixel (panel
// relief, bevels, the inlaid seam, joints, baseboard and cornice, a per-panel light variation, the version 3 grit from a
// texture atlas painted once); creatures are camera-facing cards that the depth buffer cuts cleanly at a wall's edge, drawn
// again faintly where a wall hides them. All numbers are in CLOSE_VIEW (close-view.ts): gl, ceiling, pits, lava, relief.
//
// Nothing here is allocated per frame: the vertex arrays are preallocated and grown by doubling; the mask (one texel a tile)
// is rebuilt only when the floor or what has been seen of it changes. Without WebGL2 (an old browser, a lost context, the
// tests' recording canvases) close-view.ts draws its 2D view as before.

const VS_COMMON = `#version 300 es
precision highp float;
uniform vec2 u_cam; uniform vec2 u_fwd; uniform vec2 u_right; uniform float u_hc; uniform float u_cosP; uniform float u_sinP; uniform float u_F; uniform vec2 u_pp; uniform vec2 u_size;
const float NEAR = 0.2; const float FAR = 64.0;
vec4 project(vec3 P, out float depth) {
  vec2 d = P.xy - u_cam; float u = dot(d, u_right), v = dot(d, u_fwd), dz = P.z - u_hc;
  depth = v * u_cosP - dz * u_sinP; float up = v * u_sinP + dz * u_cosP;
  float X = u_pp.x * depth + u_F * u, Y = u_pp.y * depth - u_F * up;
  return vec4(2.0 * X / u_size.x - depth, depth - 2.0 * Y / u_size.y, (depth * (FAR + NEAR) - 2.0 * FAR * NEAR) / (FAR - NEAR), depth);
}
`;
const FS_COMMON = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 u_player; uniform vec3 u_light; uniform vec3 u_fogP; uniform vec3 u_fog; uniform float u_time;
float litAt(vec2 P) { float dl = length(P - u_player) / u_light.x; return (1.0 - clamp((dl - u_light.y) / (1.0 - u_light.y), 0.0, 1.0)) * (1.0 - u_light.z) + u_light.z; }
float fogAt(float depth) { return clamp((depth - u_fogP.x) / (u_fogP.y - u_fogP.x), 0.0, 1.0); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
// an antialiased line of half-width w (in the units of x) at x = 0
float aline(float x, float w) { float f = max(fwidth(x), 1e-4); return 1.0 - smoothstep(w - f, w + f, abs(x)); }
out vec4 outColor;
`;

// ---------------------------------------------------------------------------------------------- the environment: floor, ceiling, pits, lava
const ENV_VS = `#version 300 es
in vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;
const ENV_FS = FS_COMMON + `
uniform vec2 u_cam; uniform vec2 u_fwd; uniform vec2 u_right; uniform float u_hc; uniform float u_cosP; uniform float u_sinP; uniform float u_F; uniform vec2 u_pp; uniform vec2 u_size; uniform vec2 u_dev;
uniform sampler2D u_ground; uniform vec4 u_gmap; uniform vec2 u_tex; // gmap: px per tile, x0, y0 (device px of world 0,0), the texture's last row of ground
uniform highp usampler2D u_mask; uniform ivec2 u_mapSize;
uniform vec4 u_ceil; uniform vec3 u_ceilRGB; uniform vec3 u_ceilBeam; // ceil: height, on (0/1), beam every (tiles), detail (0/1)
uniform vec4 u_pit; uniform vec3 u_stone; uniform vec3 u_lip; uniform vec3 u_safe; uniform vec4 u_safeP; // pit: hole depth, chasm depth, darkening a tile, lip width; safeP: near, full, breath, on
uniform vec4 u_lava; uniform vec3 u_lavaA; uniform vec3 u_lavaB; uniform vec3 u_lavaC; uniform vec3 u_chasm; // lava: scale, flow, light, light reach
uvec4 maskAt(ivec2 T) { if (T.x < 0 || T.y < 0 || T.x >= u_mapSize.x || T.y >= u_mapSize.y) return uvec4(0u, 0u, 0u, 1u); return texelFetch(u_mask, T, 0); }
bool pitCode(uint g) { return g == 1u || g == 3u || g == 4u; }
vec3 groundAt(vec2 P) { vec2 px = P * u_gmap.x + u_gmap.yz; if (px.x < 0.0 || px.y < 0.0 || px.y > u_gmap.w || px.x > u_tex.x) return u_fog; return texture(u_ground, px / u_tex).rgb; }
// down through a hole: the first inner wall the ray meets, or the bottom
vec3 pitColor(vec2 P, vec3 dir, uint code, bool safe) {
  float D = code == 3u ? u_pit.y : u_pit.x; vec2 h = dir.xy; float hl = max(length(h), 1e-5); vec2 hd = h / hl; float descent = -dir.z / hl;
  ivec2 T = ivec2(floor(P)); vec2 st = vec2(hd.x >= 0.0 ? 1.0 : -1.0, hd.y >= 0.0 ? 1.0 : -1.0); vec2 ah = max(abs(hd), vec2(1e-5));
  vec2 tMax = (vec2(T) + max(st, vec2(0.0)) - P) / (st * ah), tDelta = 1.0 / ah; float hitT = -1.0, side = 0.0;
  for (int i = 0; i < 10; i++) { float tN = min(tMax.x, tMax.y); if (tN * descent >= D) break;
    if (tMax.x < tMax.y) { T.x += int(st.x); tMax.x += tDelta.x; side = 0.0; } else { T.y += int(st.y); tMax.y += tDelta.y; side = 1.0; }
    uvec4 m = maskAt(T); if (!pitCode(m.g)) { hitT = tN; break; } }
  if (hitT < 0.0) { // the bottom: dark; a chasm's far light
    return code == 3u ? u_chasm * 0.55 : vec3(0.0); }
  float depth = hitT * descent; vec2 W = P + hd * hitT; float along = side < 0.5 ? W.y : W.x;
  float strata = aline(fract(depth * 3.2 + hash12(vec2(floor(along * 1.5), 3.0)) * 0.3) - 0.5, 0.06);
  vec3 c = u_stone * (0.82 + 0.22 * vnoise(vec2(along * 5.0, depth * 7.0))) * (1.0 - 0.35 * strata) * (side < 0.5 ? 0.8 : 1.0);
  c *= litAt(W) * exp(-depth * u_pit.z);
  if (code == 3u) c += u_chasm * smoothstep(0.0, D, depth) * 0.6;
  float lip = 1.0 - smoothstep(u_pit.w * 0.6, u_pit.w, depth);
  vec3 lipC = u_lip * litAt(W);
  if (safe && u_safeP.w > 0.5) { float d = length(W - u_player), a = (1.0 - smoothstep(u_safeP.y, u_safeP.x, d)) * u_safeP.z; lipC = mix(lipC, u_safe, a); }
  return mix(c, lipC, lip);
}
vec3 lavaColor(vec2 P, ivec2 T) {
  vec2 q = P * u_lava.x; float t = u_time * u_lava.y;
  float n = vnoise(q + vec2(t, t * 0.6)) * 0.62 + vnoise(q * 2.3 - vec2(t * 0.7, t * 1.3)) * 0.38;
  float vein = 1.0 - smoothstep(0.0, 0.07, abs(n - 0.52));
  vec3 c = mix(u_lavaA, u_lavaB, smoothstep(0.32, 0.72, n)); c = mix(c, u_lavaC, vein * 0.85);
  // a cooler crust where it meets the floor
  vec2 f = fract(P); float e = 1.0;
  if (maskAt(T + ivec2(-1, 0)).g != 2u) e = min(e, f.x); if (maskAt(T + ivec2(1, 0)).g != 2u) e = min(e, 1.0 - f.x);
  if (maskAt(T + ivec2(0, -1)).g != 2u) e = min(e, f.y); if (maskAt(T + ivec2(0, 1)).g != 2u) e = min(e, 1.0 - f.y);
  return mix(u_lavaA * 0.6, c, smoothstep(0.02, 0.16, e));
}
void main() {
  vec2 css = vec2(gl_FragCoord.x, u_dev.y - gl_FragCoord.y) * (u_size / u_dev);
  float b = (css.x - u_pp.x) / u_F, a = (u_pp.y - css.y) / u_F;
  vec3 dir = vec3(u_fwd * (u_cosP + a * u_sinP) + u_right * b, -u_sinP + a * u_cosP);
  vec3 col = u_fog;
  if (dir.z < -1e-5) { float t = -u_hc / dir.z; vec2 P = u_cam + dir.xy * t; ivec2 T = ivec2(floor(P)); uvec4 m = maskAt(T);
    float fogK = fogAt(t);
    if (fogK < 0.999) {
      if (m.g == 1u || m.g == 3u) col = pitColor(P, dir, m.g, m.b == 1u);
      else if (m.g == 2u) col = lavaColor(P, T);
      else { col = groundAt(P) * 1.0; vec3 lit = vec3(litAt(P));
        // the lit lip at a drop's edge (the floor's broken edge catches the torch)
        vec2 f = fract(P); float w = u_pit.w; float e = 1.0;
        if (f.x < w && pitCode(maskAt(T + ivec2(-1, 0)).g)) e = min(e, f.x); if (f.x > 1.0 - w && pitCode(maskAt(T + ivec2(1, 0)).g)) e = min(e, 1.0 - f.x);
        if (f.y < w && pitCode(maskAt(T + ivec2(0, -1)).g)) e = min(e, f.y); if (f.y > 1.0 - w && pitCode(maskAt(T + ivec2(0, 1)).g)) e = min(e, 1.0 - f.y);
        if (e < 1.0) { float k = 1.0 - smoothstep(0.0, w, e); col = mix(col, u_lip * 1.15, k * 0.55); col *= 1.0 - 0.45 * (1.0 - smoothstep(0.0, w * 0.35, e)); }
        // lava lights the floor round it
        if (u_lava.w > 0.0) { vec3 glow = vec3(0.0);
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { if (maskAt(T + ivec2(i, j)).g != 2u) continue; vec2 lo = vec2(T + ivec2(i, j)), d = max(max(lo - P, P - lo - 1.0), 0.0); glow += u_lavaB * exp(-length(d) * u_lava.w); }
          col = col * lit + glow * u_lava.z; lit = vec3(1.0); }
        col *= lit; }
    }
    col = mix(col, u_fog, fogK);
  } else if (dir.z > 1e-5 && u_ceil.y > 0.5) { float t = (u_ceil.x - u_hc) / dir.z; vec2 P = u_cam + dir.xy * t; uvec4 m = maskAt(ivec2(floor(P)));
    if (m.r == 1u) { vec3 c = u_ceilRGB; float fogK = fogAt(t);
      if (u_ceil.w > 0.5 && fogK < 0.999) {
        float B = u_ceil.z; vec2 bq = abs(fract(P / B + 0.5) - 0.5) * B; float bm = min(bq.x, bq.y);
        float beam = 1.0 - smoothstep(u_ceilBeam.x - fwidth(bm), u_ceilBeam.x + fwidth(bm), bm);
        float edge = aline(bm - u_ceilBeam.x, 0.018);
        vec2 sq = abs(fract(P + 0.5) - 0.5); float seam = aline(min(sq.x, sq.y), 0.012);
        float cof = smoothstep(0.0, 0.5, min(abs(fract(P.x) - 0.5), abs(fract(P.y) - 0.5)) * 2.0);
        c *= (0.9 + 0.12 * hash12(floor(P))) * (1.0 - 0.18 * seam) * (0.9 + 0.1 * cof);
        c = mix(c, c * u_ceilBeam.y, beam); c += vec3(u_ceilBeam.z) * edge * (1.0 - beam * 0.5);
        float node = 1.0 - smoothstep(0.05, 0.09, length(bq)); c = mix(c, vec3(0.45, 0.62, 0.66) * 0.5, node * 0.6); }
      // the torch is below: the ceiling over the Wayfarer takes its light, the rest falls away
      float dl = length(vec2(length(P - u_player), u_ceil.x - 1.1)) - (u_ceil.x - 1.1); c *= (1.0 - clamp((dl / u_light.x - u_light.y) / (1.0 - u_light.y), 0.0, 1.0)) * (1.0 - u_light.z) + u_light.z;
      col = mix(c, u_fog, fogK); }
  }
  outColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------------------------- walls
// a_pos: world x, y, z; a_tex: along (tiles, continuous along a run), u (0..1 across the face), zn (0 foot .. 1 top), top (height)
// a_nrm: normal x, y, cap (1 on a low wall's top), door (1); a_col: rgb; a_meta: alpha, grit (variant*4 + instance*2 + flip), bits (corner | ao << 2), hash
const WALL_VS = VS_COMMON + `
in vec3 a_pos; in vec4 a_tex; in vec4 a_nrm; in vec3 a_col; in vec4 a_meta;
out vec3 v_world; out vec4 v_tex; out vec4 v_nrm; out vec3 v_col; out vec4 v_meta; out float v_depth;
void main() { float d; gl_Position = project(a_pos, d); v_depth = d; v_world = a_pos; v_tex = a_tex; v_nrm = a_nrm; v_col = a_col; v_meta = a_meta; }`;
const WALL_FS = FS_COMMON + `
in vec3 v_world; in vec4 v_tex; in vec4 v_nrm; in vec3 v_col; in vec4 v_meta; in float v_depth;
uniform sampler2D u_grit; uniform vec4 u_detail; uniform vec4 u_shade; uniform vec4 u_relief; uniform vec4 u_trim; uniform vec3 u_inlay; uniform vec4 u_inlayP; uniform float u_gritA[9]; uniform vec4 u_shimmer;
// detail: on (0/1), fade from, fade to, light power; shade: x faces, y faces, top falloff, relief on; relief: inset, bevel, recess, light variation
// trim: base, cap, cornice band, outline darkness; inlayP: row, joint every, mix, lift; shimmer: amount, period ms, reduce, grit size u (atlas cell / atlas width)
void main() {
  vec3 c = v_col; float zn = v_tex.z, u = v_tex.y, along = v_tex.x, top = v_tex.w;
  bool cap = v_nrm.z > 0.5, door = v_nrm.w > 0.5;
  float lit = litAt(v_world.xy), fogK = fogAt(v_depth), lv = lit * (1.0 - fogK);
  if (cap) { // a low wall's (rubble's) top: rough, lighter, catching the torch
    c *= 1.15 * (0.75 + 0.35 * vnoise(v_world.xy * 7.0)); outColor = vec4(mix(u_fog, c, lv) * v_meta.x, v_meta.x); return; }
  c *= abs(v_nrm.x) > 0.5 ? u_shade.x : u_shade.y;
  float H = top, zw = zn * H, fwz = max(fwidth(zw), 1e-4); // height in tiles
  if (!door && top > 1.2) {
    // light variation: each panel a shade of its own, a faint slow mottle, and the foot a little dirtier
    float ph = fract(sin(v_meta.w * 12.9898) * 43758.5453);
    c *= 1.0 - u_relief.w + 2.0 * u_relief.w * ph; c *= 0.93 + 0.1 * vnoise(vec2(along * 1.7, zw * 1.3)); c *= mix(0.86, 1.0, smoothstep(0.0, 0.6, zw));
    if (u_shade.w > 0.5) {
      // two recessed panels a tile: below the inlaid seam and above it, each inset, its bevels lit from above
      float row = u_inlayP.x * H, base = u_trim.x * H, capH = H * (1.0 - u_trim.y - u_trim.z);
      float y0 = zw < row ? base + u_relief.x : row + u_relief.x, y1 = zw < row ? row - u_relief.x : capH - u_relief.x;
      float x0 = u_relief.x, x1 = 1.0 - u_relief.x;
      float dx = min(u - x0, x1 - u), dy = min(zw - y0, y1 - zw), inside = step(0.0, min(dx, dy));
      float bv = u_relief.y;
      if (inside > 0.5) { c *= u_relief.z;
        float bevel = 1.0 - smoothstep(bv - fwz, bv + fwz, min(dx, dy));
        if (bevel > 0.0) { float topEdge = step(y1 - zw, min(dx, zw - y0)), botEdge = step(zw - y0, min(dx, y1 - zw)), leftE = step(u - x0, min(min(zw - y0, y1 - zw), x1 - u));
          c *= 1.0 + bevel * (topEdge * -0.32 + botEdge * 0.22 + leftE * 0.08 + (1.0 - topEdge - botEdge - leftE) * -0.12); } }
      else { float gap = min(abs(dx), abs(dy)); c *= 1.0 + 0.1 * (1.0 - smoothstep(0.0, 0.03, gap)); }
    }
    // the inlaid seam round the room, and a joint every few tiles
    float seam = aline(zw - u_inlayP.x * H, 0.007);
    vec3 inl = mix(c, u_inlay, u_inlayP.z) * u_inlayP.w; c = mix(c, inl, seam * 0.6);
    float jx = fract(along / u_inlayP.y + 0.0005); float joint = aline(min(jx, 1.0 - jx) * u_inlayP.y, 0.018) * step(u_trim.x * H, zw) * step(zw, H * (1.0 - u_trim.y));
    c = mix(c, c * 0.45, joint);
    // the baseboard (dark, with a lit lip on top) and the cornice (light, a groove beneath)
    float bb = 1.0 - smoothstep(u_trim.x * H - fwz, u_trim.x * H + fwz, zw); c = mix(c, c * 0.55, bb); c *= 1.0 + 0.35 * aline(zw - u_trim.x * H - 0.012, 0.01);
    float cp = smoothstep(H * (1.0 - u_trim.y) - fwz, H * (1.0 - u_trim.y) + fwz, zw); c = mix(c, c * 1.45, cp);
    c *= 1.0 - 0.4 * aline(zw - H * (1.0 - u_trim.y - u_trim.z), 0.012); c *= 1.0 + 0.18 * aline(zw - H * (1.0 - u_trim.y - u_trim.z * 0.5), 0.01);
  } else if (!door) { c *= 0.85 + 0.3 * vnoise(vec2(along * 5.0, zw * 6.0)); c *= 1.0 + 0.3 * smoothstep(top - 0.12, top - 0.02, zw); }
  else { float fr = aline(min(u, 1.0 - u), 0.06) + aline(zw - H + 0.06, 0.05); c = mix(c, c * 2.2, clamp(fr, 0.0, 1.0)); }
  // the grit (version 3's wear, painted once into an atlas)
  float gv = floor(v_meta.y / 4.0);
  if (u_detail.x > 0.5 && gv > 0.5 && v_depth < u_detail.z) {
    float inst = mod(floor(v_meta.y / 2.0), 2.0), flip = mod(v_meta.y, 2.0), uu = flip > 0.5 ? 1.0 - u : u;
    vec4 t = texture(u_grit, vec2(((gv * 2.0 + inst) + uu) * u_shimmer.w, 1.0 - zn));
    float fade = 1.0 - clamp((v_depth - u_detail.y) / (u_detail.z - u_detail.y), 0.0, 1.0);
    float ga = u_gritA[int(gv)] * fade * pow(max(lv, 0.0), u_detail.w);
    if (gv > 7.5) ga *= 1.0 - u_shimmer.x * (u_shimmer.z > 0.5 ? 0.5 : 0.5 + 0.5 * sin(u_time / u_shimmer.y * 6.2832 + v_meta.w * 0.37));
    c = c * (1.0 - t.a * ga) + t.rgb * ga;
  }
  // corners: a dark outline where a wall turns or ends, and soft occlusion up an inside corner
  float bits = v_meta.z, cb = mod(bits, 4.0), ab = floor(bits / 4.0);
  float fu = max(fwidth(u), 1e-4);
  if (mod(cb, 2.0) > 0.5) c *= 1.0 - u_trim.w * (1.0 - smoothstep(0.0, 1.4 * fu, u));
  if (cb > 1.5) c *= 1.0 - u_trim.w * (1.0 - smoothstep(0.0, 1.4 * fu, 1.0 - u));
  if (mod(ab, 2.0) > 0.5) c *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, 0.3, u));
  if (ab > 1.5) c *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, 0.3, 1.0 - u));
  c *= 1.0 - u_trim.w * (1.0 - smoothstep(0.0, 1.4 * max(fwidth(zw), 1e-4), zw)); // the foot
  // the torch is at hand height: a wall falls into the dark above it
  c *= mix(1.0, u_shade.z, smoothstep(0.35, 1.0, zn));
  vec3 outc = mix(u_fog, c, lv);
  outColor = vec4(outc * v_meta.x, v_meta.x);
}`;

// ---------------------------------------------------------------------------------------------- creatures: camera-facing cards from the sprite atlas
const BOARD_VS = VS_COMMON + `
in vec3 a_pos; in vec2 a_uv; in vec4 a_meta; uniform float u_pass; out vec2 v_uv; out vec4 v_meta;
void main() { float d; gl_Position = project(a_pos, d); v_uv = a_uv; v_meta = a_meta; if (u_pass > 0.5 && a_meta.z <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }`;
const BOARD_FS = `#version 300 es
precision highp float;
uniform sampler2D u_ground; uniform float u_pass; in vec2 v_uv; in vec4 v_meta; out vec4 outColor;
void main() { vec4 c = textureLod(u_ground, v_uv, 0.0); float a = u_pass > 0.5 ? v_meta.z : v_meta.x; c *= a; c.rgb += c.rgb * v_meta.y; if (c.a < 0.004) discard; outColor = c; }`;

// ---------------------------------------------------------------------------------------------- floor decals and glows: contact shadows, wind-up rings, the wind-up glow
// a_loc: -1..1 across the decal; a_meta: kind (0 shadow, 1 ring, 2 glow), alpha, ring width (share of the radius)
const DECAL_VS = VS_COMMON + `
in vec3 a_pos; in vec2 a_loc; in vec4 a_meta; out vec2 v_loc; out vec4 v_meta;
void main() { float d; gl_Position = project(a_pos, d); v_loc = a_loc; v_meta = a_meta; }`;
const DECAL_FS = `#version 300 es
precision highp float;
uniform vec3 u_ring; uniform vec3 u_glow; in vec2 v_loc; in vec4 v_meta; out vec4 outColor;
void main() { float r = length(v_loc), a;
  if (v_meta.x < 0.5) { a = v_meta.y * (1.0 - smoothstep(0.35, 1.0, r)); outColor = vec4(0.0, 0.0, 0.0, a); return; }
  if (v_meta.x < 1.5) { float f = max(fwidth(r), 1e-3); a = v_meta.y * (1.0 - smoothstep(v_meta.z - f, v_meta.z + f, abs(r - 1.0 + v_meta.z))); outColor = vec4(u_ring * a, a); return; }
  a = v_meta.y * pow(max(0.0, 1.0 - r), 1.6); outColor = vec4(u_glow * a, 0.0); }`;

// ---------------------------------------------------------------------------------------------- state
export const closeViewGLStats = { ready: false, failed: false, reason: "", frames: 0, drawCalls: 0, walls: 0, boards: 0, decals: 0, maskBuilds: 0, uploads: 0, lost: false };
globalThis.__closeViewGL = closeViewGLStats; // read by the browser harness and the lab's console (diagnostics only)
const S = { canvas: null, gl: null, env: null, wall: null, board: null, decal: null, vbo: { env: null, wall: null, board: null, decal: null }, vao: { env: null, wall: null, board: null, decal: null },
  tex: { ground: null, mask: null, grit: null }, groundW: 0, groundH: 0, gritReady: false, aniso: null, maskMap: null, maskAt: 0, maskW: 0, maskH: 0, maskData: null, lavaTiles: 0 };
// Vertex arrays, grown by doubling (never per frame once warm).
export const WALL_FLOATS = 18, BOARD_FLOATS = 9, DECAL_FLOATS = 9;
export const GLB = { wall: new Float32Array(WALL_FLOATS * 6 * 512), board: new Float32Array(BOARD_FLOATS * 6 * 64), decal: new Float32Array(DECAL_FLOATS * 6 * 96), nWall: 0, nGhostStart: 0, nBoard: 0, nDecal: 0, nGlowStart: 0 };
export function glEnsure(kind, verts) { const per = kind === "wall" ? WALL_FLOATS : kind === "board" ? BOARD_FLOATS : DECAL_FLOATS, need = verts * per; let a = GLB[kind]; if (a.length >= need) return a; let n = a.length; while (n < need) n *= 2; const b = new Float32Array(n); b.set(a); GLB[kind] = b; return b; }

function compile(gl, vs, fs) {
  const mk = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(sh); gl.deleteShader(sh); throw new Error(log || "shader"); } return sh; };
  const p = gl.createProgram(), a = mk(gl.VERTEX_SHADER, vs), b = mk(gl.FRAGMENT_SHADER, fs); gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
  const U = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i), name = info.name.replace(/\[0\]$/, ""); U[name] = gl.getUniformLocation(p, info.name); }
  const A = {}, m = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); for (let i = 0; i < m; i++) { const info = gl.getActiveAttrib(p, i); A[info.name] = gl.getAttribLocation(p, info.name); }
  return { p, U, A };
}
function layout(gl, prog, vbo, stride, attrs) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); let off = 0;
  for (const [name, size] of attrs) { const loc = prog.A[name]; if (loc !== undefined && loc >= 0) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4); } off += size; }
  gl.bindVertexArray(null); return vao;
}
// Ready to draw with the GPU? Creates the context once (from the host's canvas factory); false without WebGL2.
export function closeViewGLReady(makeCanvas) {
  if (S.gl) { if (S.gl.isContextLost()) { closeViewGLStats.lost = true; closeViewGLStats.ready = false; closeViewGLStats.failed = true; closeViewGLStats.reason = "context lost"; S.gl = null; return false; } return true; }
  if (closeViewGLStats.failed) return false;
  try {
    if (typeof WebGL2RenderingContext === "undefined") throw new Error("no WebGL2");
    const c = makeCanvas(); const gl = c?.getContext?.("webgl2", { alpha: false, antialias: true, depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: "default" });
    if (!(gl instanceof WebGL2RenderingContext)) throw new Error("no WebGL2 context");
    c.addEventListener?.("webglcontextlost", (e) => { e.preventDefault?.(); closeViewGLStats.lost = true; });
    S.env = compile(gl, ENV_VS, ENV_FS); S.wall = compile(gl, WALL_VS, WALL_FS); S.board = compile(gl, BOARD_VS, BOARD_FS); S.decal = compile(gl, DECAL_VS, DECAL_FS);
    for (const k of ["env", "wall", "board", "decal"]) S.vbo[k] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo.env); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    S.vao.env = layout(gl, S.env, S.vbo.env, 2, [["a_pos", 2]]);
    S.vao.wall = layout(gl, S.wall, S.vbo.wall, WALL_FLOATS, [["a_pos", 3], ["a_tex", 4], ["a_nrm", 4], ["a_col", 3], ["a_meta", 4]]);
    S.vao.board = layout(gl, S.board, S.vbo.board, BOARD_FLOATS, [["a_pos", 3], ["a_uv", 2], ["a_meta", 4]]);
    S.vao.decal = layout(gl, S.decal, S.vbo.decal, DECAL_FLOATS, [["a_pos", 3], ["a_loc", 2], ["a_meta", 4]]);
    for (const k of ["ground", "mask", "grit"]) S.tex[k] = gl.createTexture();
    S.aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    S.canvas = c; S.gl = gl; closeViewGLStats.ready = true; return true;
  } catch (err) { closeViewGLStats.failed = true; closeViewGLStats.reason = String(err?.message || err).slice(0, 200); S.gl = null; return false; }
}
export const closeViewGLCanvas = () => S.canvas;
// For tests and the lab: forget the context (the next frame asks again).
export function resetCloseViewGL() { S.gl = null; S.canvas = null; S.gritReady = false; S.maskMap = null; closeViewGLStats.failed = false; closeViewGLStats.ready = false; closeViewGLStats.reason = ""; }

// ---------------------------------------------------------------------------------------------- the mask: one texel a tile
// r: a ceiling over it (1) or open sky (0); g: 0 floor, 1 hole, 2 lava, 3 chasm, 4 a bridge over a drop; b: 1 a safe drop; a: 1 a wall.
// Hazards show only where the Wayfarer has seen (the fog of war keeps its secrets). Pure: tests read it.
const HOLE = /hole|pit|abyss|void/i, LAVA = /lava|magma/i;
export function closeViewHazardCode(t) { if (!t) return 0; if (t.bridge) return 4; if (t.chasm) return t.blocked && !/void|chasm|abyss|canyon/i.test(String(t.kind || "")) ? 0 : 3; const k = String(t.kind || ""); if (t.hole || (!t.blocked && HOLE.test(k))) return 1; if (LAVA.test(k)) return 2; return 0; }
export function closeViewMask(map, seen = null, safe = null, out = null) {
  const w = Math.max(1, Number(map?.width) || 32), tiles = map?.tiles || [], h = Math.max(1, Number(map?.height) || Math.floor(tiles.length / w)), data = out && out.length >= w * h * 4 ? out : new Uint8Array(w * h * 4);
  let lava = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x, t = tiles[k], o = k * 4; if (!t) { data[o] = 0; data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = 1; continue; }
    const open = t.courtyard === true || t.openAir === true || t.pentRoof === true || t.pentBalcony === true || t.open === true || t.kind === "yardGrass";
    const vis = !seen || seen(x, y), code = vis ? closeViewHazardCode(t) : 0;
    data[o] = open ? 0 : 1; data[o + 1] = code; data[o + 2] = code === 1 && safe && safe[k] === 1 ? 1 : 0; data[o + 3] = t.blocked && !code ? 1 : 0; if (code === 2) lava++; }
  return { data, w, h, lava };
}
export function glMask(map, now, seen, safe, everyMs) {
  const gl = S.gl; if (!gl) return;
  if (S.maskMap === map && (!seen || now - S.maskAt < everyMs)) return;
  const m = closeViewMask(map, seen, safe, S.maskData); S.maskData = m.data; S.lavaTiles = m.lava;
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, S.tex.mask); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  if (S.maskMap !== map || S.maskW !== m.w || S.maskH !== m.h) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, m.w, m.h, 0, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, m.data.subarray(0, m.w * m.h * 4)); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); }
  else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, m.w, m.h, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, m.data.subarray(0, m.w * m.h * 4));
  S.maskMap = map; S.maskAt = now; S.maskW = m.w; S.maskH = m.h; closeViewGLStats.maskBuilds++;
}
export const glLavaTiles = () => S.lavaTiles;
// The grit atlas: every painted variant side by side (cell = the textures' size), uploaded once.
export function glGrit(build) { if (S.gritReady || !S.gl) return; const c = build(); if (!c) return; const gl = S.gl; gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, S.tex.grit); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); S.gritReady = true; }

// ---------------------------------------------------------------------------------------------- one frame
// F: the frame's numbers, filled by close-view.ts (a preallocated object; see GLF). ground: the ground canvas (texture above
// F.atlasY, the billboards' atlas below). Draws into the GL canvas; the caller copies it to the screen.
export const GLF = { devW: 1, devH: 1, w: 1, h: 1, cx: 0, cy: 0, fx: 1, fy: 0, rx: 0, ry: 1, hc: 1.6, cosP: 1, sinP: 0, F: 300, ppx: 0, ppy: 0, px: 0, py: 0, lightR: 6, inner: .28, ambient: .2, fogNear: 3, fogFar: 12,
  fog: new Float32Array(3), time: 0, gmapK: 44, gmapX: 0, gmapY: 0, atlasY: 0, mip: true, aniso: 4, ceiling: 1, ceilH: 2.4, ceilDetail: 1, uniforms: null };
export function drawSceneGL(ground, U) {
  const gl = S.gl; if (!gl) return false; const F = GLF; let calls = 0;
  const c = S.canvas; if (c.width !== F.devW || c.height !== F.devH) { c.width = F.devW; c.height = F.devH; }
  gl.viewport(0, 0, F.devW, F.devH);
  // the ground texture (and the billboards' atlas below it): copied up once a frame
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.tex.ground); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  if (S.groundW !== ground.width || S.groundH !== ground.height) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ground); S.groundW = ground.width; S.groundH = ground.height;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, F.mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); if (S.aniso) gl.texParameterf(gl.TEXTURE_2D, S.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(F.aniso, gl.getParameter(S.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1)); }
  else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, ground);
  if (F.mip) gl.generateMipmap(gl.TEXTURE_2D); closeViewGLStats.uploads++;
  const cam = (P) => { gl.uniform2f(P.U.u_cam, F.cx, F.cy); gl.uniform2f(P.U.u_fwd, F.fx, F.fy); gl.uniform2f(P.U.u_right, F.rx, F.ry); gl.uniform1f(P.U.u_hc, F.hc); gl.uniform1f(P.U.u_cosP, F.cosP); gl.uniform1f(P.U.u_sinP, F.sinP); gl.uniform1f(P.U.u_F, F.F); gl.uniform2f(P.U.u_pp, F.ppx, F.ppy); gl.uniform2f(P.U.u_size, F.w, F.h); };
  const light = (P) => { gl.uniform2f(P.U.u_player, F.px, F.py); gl.uniform3f(P.U.u_light, F.lightR, F.inner, F.ambient); gl.uniform3f(P.U.u_fogP, F.fogNear, F.fogFar, 0); gl.uniform3fv(P.U.u_fog, F.fog); gl.uniform1f(P.U.u_time, F.time); };
  gl.clearColor(F.fog[0], F.fog[1], F.fog[2], 1); gl.clearDepth(1); gl.disable(gl.SCISSOR_TEST); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // 1. the environment: floor, ceiling, pits, lava (no depth: everything else stands in front of it)
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.useProgram(S.env.p); cam(S.env); light(S.env); U.env(gl, S.env.U, F, S.lavaTiles);
  gl.uniform2f(S.env.U.u_dev, F.devW, F.devH); gl.uniform1i(S.env.U.u_ground, 0); gl.uniform1i(S.env.U.u_mask, 1); gl.uniform4f(S.env.U.u_gmap, F.gmapK, F.gmapX, F.gmapY, F.atlasY); gl.uniform2f(S.env.U.u_tex, ground.width, ground.height); gl.uniform2i(S.env.U.u_mapSize, S.maskW, S.maskH);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, S.tex.mask); gl.activeTexture(gl.TEXTURE0);
  gl.bindVertexArray(S.vao.env); gl.drawArrays(gl.TRIANGLES, 0, 3); calls++;
  // 2. walls (opaque, with depth), then their ghosts later
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
  if (GLB.nWall > 0) { gl.useProgram(S.wall.p); cam(S.wall); light(S.wall); U.wall(gl, S.wall.U, F); gl.uniform1i(S.wall.U.u_grit, 2); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, S.tex.grit); gl.activeTexture(gl.TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo.wall); gl.bufferData(gl.ARRAY_BUFFER, GLB.wall.subarray(0, GLB.nWall * WALL_FLOATS), gl.DYNAMIC_DRAW); gl.bindVertexArray(S.vao.wall);
    if (GLB.nGhostStart > 0) { gl.drawArrays(gl.TRIANGLES, 0, GLB.nGhostStart); calls++; } }
  // 3. the floor's decals (contact shadows, wind-up rings): blended, depth-tested, not written
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
  if (GLB.nDecal > 0) { gl.useProgram(S.decal.p); cam(S.decal); U.decal(gl, S.decal.U); gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo.decal); gl.bufferData(gl.ARRAY_BUFFER, GLB.decal.subarray(0, GLB.nDecal * DECAL_FLOATS), gl.DYNAMIC_DRAW); gl.bindVertexArray(S.vao.decal);
    if (GLB.nGlowStart > 0) { gl.drawArrays(gl.TRIANGLES, 0, GLB.nGlowStart); calls++; } }
  // 4. the creatures and the Wayfarer (far to near), then their ghosts where a wall hides them
  if (GLB.nBoard > 0) { gl.useProgram(S.board.p); cam(S.board); gl.uniform1i(S.board.U.u_ground, 0); gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo.board); gl.bufferData(gl.ARRAY_BUFFER, GLB.board.subarray(0, GLB.nBoard * BOARD_FLOATS), gl.DYNAMIC_DRAW); gl.bindVertexArray(S.vao.board);
    gl.uniform1f(S.board.U.u_pass, 0); gl.drawArrays(gl.TRIANGLES, 0, GLB.nBoard); calls++;
    gl.depthFunc(gl.GREATER); gl.uniform1f(S.board.U.u_pass, 1); gl.drawArrays(gl.TRIANGLES, 0, GLB.nBoard); calls++; gl.depthFunc(gl.LEQUAL); }
  // 5. the cut-away walls between the camera and the Wayfarer, faint
  if (GLB.nWall > GLB.nGhostStart) { gl.useProgram(S.wall.p); gl.bindVertexArray(S.vao.wall); gl.drawArrays(gl.TRIANGLES, GLB.nGhostStart, GLB.nWall - GLB.nGhostStart); calls++; }
  // 6. the wind-up glows, added in light
  if (GLB.nDecal > GLB.nGlowStart) { gl.useProgram(S.decal.p); gl.bindVertexArray(S.vao.decal); gl.blendFunc(gl.ONE, gl.ONE); gl.drawArrays(gl.TRIANGLES, GLB.nGlowStart, GLB.nDecal - GLB.nGlowStart); calls++; }
  gl.bindVertexArray(null); gl.depthMask(true); gl.disable(gl.BLEND);
  closeViewGLStats.frames++; closeViewGLStats.drawCalls = calls; closeViewGLStats.walls = GLB.nWall / 6; closeViewGLStats.boards = GLB.nBoard / 6; closeViewGLStats.decals = GLB.nDecal / 6;
  return true;
}
