import { MODEL_FLOATS } from "./close-view-models.js?v=r904-329f853333e3";
import { buildVisualRevision } from "./building.js?v=r904-329f853333e3";
import { createHeroGL, prepareHeroGL, uploadHeroFrame, drawHeroGL, disposeHeroGL } from './close-view-hero-gl.js?v=r904-329f853333e3';
import { createBeastGL, prepareBeastMesh, drawBeastsGL, disposeBeastGL } from './close-view-beast-gl.js?v=r904-329f853333e3'; // release 891: world beasts' skinned bodies
// Close View's GPU scene (version 4, release 793; version 5, release 794).
//
// Version 4 (Tim, 2026-11-06: "the floor moves and shifts a lot... it's re-rendered every time you walk... it looks like it's
// just made of water... there should be a ceiling... the walls look like they're just 3D rendered... the holes and so on look
// weird... it seems a little bit choppy"). Why the floor swam (versions 1-3): the floor was a stack of screen-space bands, each
// one or two triangles of the ground texture under an affine map. A floor seen in perspective is a projective map; an affine
// map is exact only at its corners, so inside every band the floor was stretched and squeezed by a few pixels, in a pattern
// fixed to the screen. Here the floor is not mapped at all: one full-screen pass casts a ray from the camera through every
// pixel to the floor plane (or up to the ceiling plane) and shades that exact world point. Nothing swims.
//
// Version 5 (release 794; Tim, 2026-11-06: "the look of the keep is more like a backrooms, instead of some kind of oppressive,
// dark, ancient structure... more detail and structure... it seems like you're just in a room instead of in an environment
// or atmosphere. We need more atmosphere... where we're tearing through the walls"). The place is now built and lit, not
// painted:
// - A theme per building kind (CLOSE_VIEW.themes; close-view.ts closeViewTheme) sets every material, light and the air.
// - The floor is procedural in the shader, world-anchored and crisp at any distance (flagstones, planks, a worn rug, packed
//   dirt, resin, plating...), by the material of each tile (the mask). The ordinary renderer's ground texture now carries
//   only what lies on the floor (telegraphs, traps, marks, the aim chevron), composited over it: the magnified tile art is gone.
// - Walls are coursed stone (or dirt and roots, chitin ribs, decayed panels) with bevelled blocks and deep mortar, lit through
//   a normal taken from a procedural height (derivative bump mapping), with real geometry for pilasters, a plinth and a cornice,
//   and arches with a soffit over doorways, built once a floor into a static vertex buffer (no per-frame wall work on the CPU).
// - The ceiling has vault ribs (or beams, organic ribs, conduits) and falls into darkness above.
// - Light is low ambient, the Wayfarer's carried light with a soft falloff, and up to 8 placed sources (sconces, candles,
//   pods, failing lamps) chosen from the map, each a warm pool with a gentle flicker (still with reduced motion); distance fog
//   and a low ground haze lit by the lights; a colour grade and vignette per theme; dust motes near lights (full tier).
// - Nothing is ever drawn translucent to show the Wayfarer: the camera is pulled in along the boom instead (close-view.ts), and
//   anything that must still hide them shows them as a crisp silhouette through it (the depth GREATER pass).
//
// Nothing here is allocated per frame: the dynamic vertex arrays are preallocated and grown by doubling; the static wall buffer
// is uploaded once a floor; the mask (one texel a tile) is rebuilt only when the floor or what has been seen of it changes.
// Without WebGL2 (an old browser, a lost context, the tests' recording canvases) close-view.ts draws its 2D view as before.

const VS_COMMON = `#version 300 es
precision highp float;
uniform vec2 u_cam; uniform vec2 u_fwd; uniform vec2 u_right; uniform float u_hc; uniform float u_cosP; uniform float u_sinP; uniform float u_F; uniform vec2 u_pp; uniform vec2 u_size;
const float NEAR = 0.05; const float FAR = 64.0;
vec4 project(vec3 P, out float depth) {
  vec2 d = P.xy - u_cam; float u = dot(d, u_right), v = dot(d, u_fwd), dz = P.z - u_hc;
  depth = v * u_cosP - dz * u_sinP; float up = v * u_sinP + dz * u_cosP;
  float X = u_pp.x * depth + u_F * u, Y = u_pp.y * depth - u_F * up;
  return vec4(2.0 * X / u_size.x - depth, depth - 2.0 * Y / u_size.y, (depth * (FAR + NEAR) - 2.0 * FAR * NEAR) / (FAR - NEAR), depth);
}
`;
// Lights, fog, haze and the finish, shared by every pass that shades the place.
const FS_COMMON = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 u_player; uniform vec3 u_eye; uniform float u_time; uniform vec2 u_dev;
uniform vec3 u_amb; uniform vec3 u_torch; uniform vec4 u_torchP; // torch: colour; (reach, strength, height, wrap)
uniform vec4 u_lp[8]; uniform vec4 u_lc[8]; uniform int u_nl; // placed lights: (x, y, z, reach), (r, g, b, strength)
uniform vec4 u_sun; uniform vec3 u_sunC; // outdoors (close-view-outdoor.ts): the sun's direction and colour; black indoors, so it adds nothing
uniform vec4 u_fogP; uniform vec3 u_fog; uniform vec3 u_haze; uniform vec4 u_grade; uniform vec4 u_finish; // fogP: near, far, haze density, haze height; grade: tint, contrast; finish: vignette, haze light, ambient floor, -
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vnoise(p) * .55 + vnoise(p * 2.07 + 7.3) * .3 + vnoise(p * 4.3 - 3.1) * .15; }
// voronoi cells (resin, chitin): the distance to the nearest centre and to the border, and the cell's id
vec3 cells(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0; vec2 id = vec2(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y), o = hash22(i + g) * 0.8 + 0.1, r = g + o - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; id = i + g; } else if (d < d2) d2 = d; }
  return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), hash12(id)); }
// an antialiased line of half-width w (in the units of x) at x = 0
float aline(float x, float w) { float f = max(fwidth(x), 1e-4); return 1.0 - smoothstep(w - f, w + f, abs(x)); }
// a light's falloff: full near, soft, nothing at its reach
float falloff(float d, float R) { float x = d / R; float k = clamp(1.0 - x * x, 0.0, 1.0); return k * k / (1.0 + 2.5 * x * x); }
// the light reaching P (normal N, seen from the eye): diffuse into dif, a highlight into spe
void lightsAt(vec3 P, vec3 N, float shin, out vec3 dif, out vec3 spe) {
  vec3 V = normalize(u_eye - P); dif = u_amb; spe = vec3(0.0);
  vec3 L = vec3(u_player, u_torchP.z) - P; float l = max(length(L), 1e-3); L /= l; float a = falloff(l, u_torchP.x) * u_torchP.y;
  float nd = dot(N, L); dif += u_torch * a * clamp((nd + u_torchP.w) / (1.0 + u_torchP.w), 0.0, 1.0);
  if (shin > 0.0) spe += u_torch * a * pow(max(dot(reflect(-L, N), V), 0.0), shin);
  dif += u_sunC * clamp((dot(N, u_sun.xyz) + .12) / 1.12, 0.0, 1.0); if (shin > 0.0) spe += u_sunC * pow(max(dot(reflect(-u_sun.xyz, N), V), 0.0), shin) * .6;
  for (int i = 0; i < 8; i++) { if (i >= u_nl) break; vec3 Q = u_lp[i].xyz - P; float q = max(length(Q), 1e-3); Q /= q; float k = falloff(q, u_lp[i].w) * u_lc[i].w;
    if (k <= 0.0) continue; dif += u_lc[i].rgb * k * clamp((dot(N, Q) + .25) / 1.25, 0.0, 1.0); if (shin > 0.0 && i < 2) spe += u_lc[i].rgb * k * pow(max(dot(reflect(-Q, N), V), 0.0), shin); } // highlights from the carried light and the two nearest only
}
// the air between the eye and P: a low haze that the lights glow in, then the fog
vec3 atmos(vec3 col, vec3 P, float depth, vec3 lit) {
  float f = clamp((depth - u_fogP.x) / (u_fogP.y - u_fogP.x), 0.0, 1.0); f = f * f * (3.0 - 2.0 * f);
  float hz = u_finish.z > 0.5 ? (1.0 - exp(-depth * u_fogP.z)) * exp(-max(P.z, 0.0) / u_fogP.w) : 0.0;
  col = mix(col, u_haze + lit * u_finish.y, clamp(hz, 0.0, 0.8));
  return mix(col, u_fog, f);
}
// the finish: a gentle shoulder, the theme's grade, the vignette
vec3 finish(vec3 c) { c = max(c, 0.0); c = c / (1.0 + c * 0.22); c = pow(c, vec3(u_grade.w)) * u_grade.rgb;
  vec2 q = gl_FragCoord.xy / u_dev - 0.5; return c * (1.0 - u_finish.x * smoothstep(0.28, 0.86, length(q * vec2(1.0, 1.12)))); }
// bump: the normal of a surface (true normal N, world point P) whose height above it is h (derivatives in screen space)
vec3 bump(vec3 N, vec3 P, float h) { vec3 dpx = dFdx(P), dpy = dFdy(P); float hx = dFdx(h), hy = dFdy(h);
  vec3 r1 = cross(dpy, N), r2 = cross(N, dpx); float det = dot(dpx, r1); if (abs(det) < 1e-9) return N;
  vec3 g = sign(det) * (hx * r1 + hy * r2); return normalize(abs(det) * N - g); }
// coursed stone in (x along, y up), tiles: courses ch high, blocks about bl long; returns the height (0 in the joints,
// 1 on a block's face), the block's id, and the mortar's share
float ashlar(vec2 q, float ch, float bl, float bev, float rough, out vec2 id, out float mortar) {
  float row = floor(q.y / ch), ry = q.y - row * ch, cw = bl * 0.5, x = q.x + hash12(vec2(row, 7.13)) * bl * 3.0, cell = floor(x / cw), fx = x - cell * cw;
  float dl = fx, dr = cw - fx; bool jl = hash12(vec2(cell, row)) > 0.42, jr = hash12(vec2(cell + 1.0, row)) > 0.42;
  if (!jl) dl += cw; if (!jr) dr += cw; id = vec2(jl ? cell : cell - 1.0, row);
  float lift = (hash12(id + 3.7) - 0.5) * ch * 0.16; // each block sits a little high or low in its course
  float dy = min(ry - max(lift, 0.0), ch - ry + min(lift, 0.0)), e = min(min(dl, dr), dy);
  float m = u_finish.z > 0.5 ? 0.008 + 0.009 * vnoise(q * 13.0) + rough * 0.012 * step(0.82, vnoise(q * 5.0 + id)) : 0.012; // low tier: plain joints // chipped: the joint widens where an edge broke
  mortar = 1.0 - smoothstep(m - fwidth(e), m + fwidth(e), e);
  float h = smoothstep(m, m + bev * (0.6 + 0.8 * hash12(id)), e);
  if (u_finish.z > 0.5) h *= 0.82 + 0.18 * vnoise(q * 9.0 + id * 3.1) - rough * 0.25 * smoothstep(0.72, 0.95, vnoise(q * 17.0 + id)); // pits and chips in the face
  return h;
}
out vec4 outColor;
`;

// ---------------------------------------------------------------------------------------------- the environment: floor, ceiling, pits, lava
const ENV_VS = `#version 300 es
in vec2 a_pos; void main() { gl_Position = vec4(a_pos, 1.0, 1.0); }`; // at the far plane: behind every wall
const ENV_FS = FS_COMMON + `
uniform vec2 u_cam; uniform vec2 u_fwd; uniform vec2 u_right; uniform float u_hc; uniform float u_cosP; uniform float u_sinP; uniform float u_F; uniform vec2 u_pp; uniform vec2 u_size;
uniform float u_terrain;
uniform sampler2D u_ground; uniform vec4 u_gmap; uniform vec2 u_tex; // gmap: px per tile, x0, y0 (device px of world 0,0), the texture's last row of ground
uniform highp usampler2D u_mask; uniform ivec2 u_mapSize;
uniform vec4 u_ceil; uniform vec3 u_ceilRGB; uniform vec4 u_ceilK; // ceil: height, on (0/1), bay (tiles), detail (0/1); ceilK: kind, rib width, darkness above, -
uniform vec4 u_space; /* seed realms: the cosmos below glass and through open bays (on, strength, nebula detail, -) */ uniform vec4 u_hall; uniform vec3 u_backdrop[3]; // backdrop kind, open roof, skylight (1) or arena sky (2), shaft depth
uniform vec4 u_pit; uniform vec3 u_stone; uniform vec3 u_lip; uniform vec3 u_safe; uniform vec4 u_safeP; // pit: hole depth, chasm depth, darkening a tile, lip width; safeP: near, full, breath, on
uniform vec4 u_lava; uniform vec3 u_lavaA; uniform vec3 u_lavaB; uniform vec3 u_lavaC; uniform vec3 u_chasm; // lava: scale, flow, light, light reach
uniform vec3 u_inlayColors[3];
uniform vec4 u_floorP; uniform vec3 u_floorRGB; uniform vec3 u_floorJ; uniform vec3 u_rug; uniform vec4 u_floorQ; // floorP: kind, stone size, wear, sewer; floorQ: bump on, wet, detail on, -
// outdoors (close-view-outdoor.ts): outdoor: on, the ordinary art's blend band (from, to: tiles from the Wayfarer), detail on;
// skyZ: zenith, cloud cover; skyH: horizon, ridge height; ridge: its colour, roughness; outW: water base, glance, ripple scale,
// ripple strength; outR: a level's foot width, its darkness, the lip's width, its light; outD: detail strength, its near and
// far fade, the sun's glint on water. terrainTex: one texel a tile (colour; flags: water, outcrop, level, surface class).
uniform vec4 u_outdoor; uniform vec4 u_skyZ; uniform vec4 u_skyH; uniform vec4 u_ridge; uniform vec4 u_outW; uniform vec4 u_outR; uniform vec4 u_outD; uniform sampler2D u_terrainTex;
// outX (the world pass, close-view-outdoor.ts OUTDOOR.ground and OUTDOOR.water): how much of the ordinary art's tile-scale
// detail a land texel keeps (the rest is its own smoothed colour), the shore's wet band (tiles), foam strength, and 1 when
// the water must keep the ordinary art (rafts drawn on it); outY: deep water's darkening, shallow water's lift, the
// shoreline's wander (tiles), the reflection's clouds (1 balanced and full)
uniform vec4 u_outX; uniform vec4 u_outY;
// the sky's mood (close-view-outdoor.ts OUTDOOR.moods): mood: stars, the clouds' dark undersides, the moon (1: its disc for the
// sun's), a distant lightning flash now (0-1; 0 with reduced motion); moodC: the clouds' colour, the flash's azimuth (radians)
uniform vec4 u_mood; uniform vec4 u_moodC;
uvec4 maskAt(ivec2 T) { if (T.x < 0 || T.y < 0 || T.x >= u_mapSize.x || T.y >= u_mapSize.y) return uvec4(0u, 0u, 0u, 1u); return texelFetch(u_mask, T, 0); }
bool pitCode(uint g) { return g == 1u || g == 3u || g == 4u || g == 5u; }
bool wallAt(ivec2 T) { return (maskAt(T).a & 1u) == 1u; }
uint matAt(ivec2 T) { return maskAt(T).b >> 1u; }
// what lies on the floor (the ordinary renderer's marks and telegraphs, premultiplied; clear where nothing does)
vec4 overlayAt(vec2 P) { vec2 px = P * u_gmap.x + u_gmap.yz; if (px.x < 0.0 || px.y < 0.0 || px.y > u_gmap.w || px.x > u_tex.x) return vec4(0.0); return texture(u_ground, px / u_tex); }
// down through a hole: the first inner wall the ray meets, or the bottom
vec3 pitColor(vec2 P, vec3 dir, uint code, bool safe) {
  float D = code == 5u ? u_hall.w : code == 3u ? u_pit.y : u_pit.x; vec2 h = dir.xy; float hl = max(length(h), 1e-5); vec2 hd = h / hl; float descent = -dir.z / hl;
  ivec2 T = ivec2(floor(P)); vec2 st = vec2(hd.x >= 0.0 ? 1.0 : -1.0, hd.y >= 0.0 ? 1.0 : -1.0); vec2 ah = max(abs(hd), vec2(1e-5));
  vec2 tMax = (vec2(T) + max(st, vec2(0.0)) - P) / (st * ah), tDelta = 1.0 / ah; float hitT = -1.0, side = 0.0;
  for (int i = 0; i < 10; i++) { float tN = min(tMax.x, tMax.y); if (tN * descent >= D) break;
    if (tMax.x < tMax.y) { T.x += int(st.x); tMax.x += tDelta.x; side = 0.0; } else { T.y += int(st.y); tMax.y += tDelta.y; side = 1.0; }
    uvec4 m = maskAt(T); if (!pitCode(m.g)) { hitT = tN; break; } }
  if (hitT < 0.0) { return code == 5u ? u_backdrop[0] : code == 3u ? u_chasm * 0.55 : vec3(0.0); }
  float depth = hitT * descent; vec2 W = P + hd * hitT; float along = side < 0.5 ? W.y : W.x;
  float strata = aline(fract(depth * 3.2 + hash12(vec2(floor(along * 1.5), 3.0)) * 0.3) - 0.5, 0.06);
  vec3 c = u_stone * (0.82 + 0.22 * vnoise(vec2(along * 5.0, depth * 7.0))) * (1.0 - 0.35 * strata) * (side < 0.5 ? 0.8 : 1.0);
  vec3 dif, spe; lightsAt(vec3(W, -depth), vec3(0.0, 0.0, 1.0), 0.0, dif, spe); c *= dif * exp(-depth * u_pit.z);
  if (code == 3u) c += u_chasm * smoothstep(0.0, D, depth) * 0.6;
  if (code == 5u) c = mix(c, u_backdrop[1] * 0.3, smoothstep(0.0, D, depth));
  float lip = 1.0 - smoothstep(u_pit.w * 0.6, u_pit.w, depth);
  vec3 lipC = u_lip * dif;
  if (safe && u_safeP.w > 0.5) { float d = length(W - u_player), a = (1.0 - smoothstep(u_safeP.y, u_safeP.x, d)) * u_safeP.z; lipC = mix(lipC, u_safe, a); }
  return mix(c, lipC, lip);
}
vec3 lavaColor(vec2 P, ivec2 T) {
  vec2 q = P * u_lava.x; float t = u_time * u_lava.y;
  float n = vnoise(q + vec2(t, t * 0.6)) * 0.62 + vnoise(q * 2.3 - vec2(t * 0.7, t * 1.3)) * 0.38;
  float vein = 1.0 - smoothstep(0.0, 0.07, abs(n - 0.52));
  vec3 c = mix(u_lavaA, u_lavaB, smoothstep(0.32, 0.72, n)); c = mix(c, u_lavaC, vein * 0.85);
  vec2 f = fract(P); float e = 1.0;
  if (maskAt(T + ivec2(-1, 0)).g != 2u) e = min(e, f.x); if (maskAt(T + ivec2(1, 0)).g != 2u) e = min(e, 1.0 - f.x);
  if (maskAt(T + ivec2(0, -1)).g != 2u) e = min(e, f.y); if (maskAt(T + ivec2(0, 1)).g != 2u) e = min(e, 1.0 - f.y);
  return mix(u_lavaA * 0.6, c, smoothstep(0.02, 0.16, e));
}
// how far P is from the edge of its tile's run of the same material (for a rug's border)
float runEdge(vec2 P, ivec2 T, uint mat) { vec2 f = fract(P); float e = 1.0;
  if (matAt(T + ivec2(-1, 0)) != mat || wallAt(T + ivec2(-1, 0))) e = min(e, f.x); if (matAt(T + ivec2(1, 0)) != mat || wallAt(T + ivec2(1, 0))) e = min(e, 1.0 - f.x);
  if (matAt(T + ivec2(0, -1)) != mat || wallAt(T + ivec2(0, -1))) e = min(e, f.y); if (matAt(T + ivec2(0, 1)) != mat || wallAt(T + ivec2(0, 1))) e = min(e, 1.0 - f.y); return e; }
// The floor's material at P: albedo, height (for the bump) and wetness (for a highlight). mat: 0 the theme's own floor,
// 1 mosaic, 2 planks, 3 a rug, 4 ceramic tiles, 5 concrete, 6 packed dirt, 7 resin, 8 flesh, 9 crystal, 10 plating.
vec3 floorMat(vec2 P, ivec2 T, uint mat, out float h, out float wet) {
  uint k = mat == 0u ? uint(u_floorP.x) : mat; vec3 c = u_floorRGB; h = 1.0; wet = u_floorQ.y; vec2 id; float mortar;
  float grime = u_finish.z > 0.5 ? vnoise(P * 1.3) : 0.0; float wear = u_floorP.z;
  if (k == 0u || k == 1u || k == 3u) { // flagstones (also under a rug and between the mosaic's stones)
    float s = u_floorP.y; h = ashlar(vec2(P.x, P.y), s, s * 1.6, 0.05, 0.3, id, mortar);
    c = u_floorRGB * (0.72 + 0.4 * hash12(id)) * (u_finish.z > 0.5 ? 0.85 + 0.25 * vnoise(P * 3.0 + id) : 1.0); c = mix(c, u_floorJ, mortar);
    if (k == 1u) { vec2 t = P * 10.0 + vec2(vnoise(P * 3.0), vnoise(P * 3.0 + 5.0)) * 0.35; vec2 tf = abs(fract(t) - 0.5); float tess = smoothstep(0.36 - fwidth(t.x), 0.44, max(tf.x, tf.y)); vec2 ti = floor(t); // an old mosaic: small, uneven tesserae
      float lat = abs(fract(P.x * 0.5) - 0.5) + abs(fract(P.y * 0.5) - 0.5), band = step(abs(lat - 0.3), 0.06) + step(lat, 0.08); vec3 a = vec3(0.24, 0.22, 0.19), b = vec3(0.21, 0.1, 0.08);
      c = mix(mix(a, b, clamp(band, 0.0, 1.0)) * (0.7 + 0.45 * hash12(ti)) * (0.75 + 0.3 * fbm(P * 1.1)), u_floorJ, tess * 0.85); h = 1.0 - tess * 0.5; if (hash12(ti + 3.0) > 0.93) { c = u_floorJ * 1.2; h = 0.2; } } // a few lost
    if (k == 3u) { float e = runEdge(P, T, mat); float fringe = vnoise(P * 40.0) * 0.03; float inRug = smoothstep(0.05 + fringe, 0.08 + fringe, e);
      float border = aline(e - 0.17, 0.025) + aline(e - 0.24, 0.012); float weave = 0.85 + 0.15 * vnoise(vec2(P.x * 60.0, P.y * 6.0)) * vnoise(vec2(P.x * 6.0, P.y * 60.0));
      float lat = abs(fract(P.x * 1.25) - 0.5) + abs(fract(P.y * 1.25) - 0.5), motif = aline(lat - 0.34, 0.018) + aline(lat - 0.12, 0.012) * 0.6; // a worn lattice, medallions in it
      vec3 r = u_rug * weave * (0.7 + 0.35 * fbm(P * 0.9)); r = mix(r, u_rug * vec3(2.1, 1.7, 1.2), clamp(border + motif * 0.7, 0.0, 1.0) * 0.55);
      r *= 1.0 - 0.45 * smoothstep(0.55, 0.85, vnoise(P * 2.2)) * wear; // worn through to the weft
      c = mix(c, r, inRug); h = mix(h, 1.0, inRug); wet = mix(wet, 0.0, inRug); }
  } else if (k == 2u) { // planks along x, dark gaps, grain, nail heads
    float w = 0.24, row = floor(P.y / w), ry = P.y - row * w, off = hash12(vec2(row, 1.7)) * 2.0, len = 1.2 + hash12(vec2(row, 2.9)) * 1.3, px = P.x + off, pi = floor(px / len), fx = px - pi * len;
    float gap = 1.0 - smoothstep(0.006, 0.012 + fwidth(ry), min(ry, w - ry)), end = 1.0 - smoothstep(0.004, 0.01 + fwidth(fx), min(fx, len - fx)); id = vec2(pi, row);
    float grain = vnoise(vec2(px * 3.0, ry * 90.0 + hash12(id) * 9.0)); c = vec3(0.27, 0.19, 0.12) * (0.65 + 0.5 * hash12(id)) * (0.8 + 0.3 * grain);
    float nail = 1.0 - smoothstep(0.008, 0.014, length(vec2(min(fx, len - fx) - 0.06, ry - w * 0.5))); c = mix(c, vec3(0.08), max(max(gap, end), nail * 0.8)); h = 1.0 - max(gap, end); wet *= 0.3;
  } else if (k == 4u) { // ceramic tiles, cracked, grout
    vec2 t = P * 2.0; vec2 tf = abs(fract(t) - 0.5); float g = smoothstep(0.455, 0.48, max(tf.x, tf.y)); id = floor(t);
    c = vec3(0.36, 0.37, 0.35) * (0.8 + 0.3 * hash12(id)); float crack = aline(vnoise(P * 6.0 + id) - 0.5, 0.004) * step(0.7, hash12(id + 9.0)); c = mix(c, vec3(0.08), max(g * 0.8, crack)); h = 1.0 - g;
  } else if (k == 5u) { c = vec3(0.3, 0.3, 0.29) * (0.75 + 0.35 * fbm(P * 2.0)); float crack = aline(vnoise(P * 2.6) - 0.5, 0.006) * step(0.45, vnoise(P * 0.8 + 4.0)); c *= 1.0 - 0.55 * crack; h = 1.0 - crack * 0.5;
  } else if (k == 6u) { // packed dirt: clods, pebbles, root threads
    float n = fbm(P * 2.3); c = vec3(0.23, 0.17, 0.11) * (0.7 + 0.5 * n); vec3 pc = cells(P * 5.0); float peb = 1.0 - smoothstep(0.08, 0.13, pc.x); peb *= step(0.9, pc.z);
    c = mix(c, c * 1.25 + 0.02, peb * 0.6); float root = aline(vnoise(P * vec2(1.3, 4.0)) - 0.5, 0.02) * step(0.5, vnoise(P * 0.7)); c = mix(c, vec3(0.12, 0.08, 0.05), root * 0.8);
    h = n * 0.5 - root * 0.1; wet *= 0.5;
  } else if (k == 7u || k == 8u || k == 9u) { // resin, flesh, crystal resin: cells with wet sheen and faint light in the seams
    vec3 v = cells(P * (k == 8u ? 2.2 : 3.2)); float seam = 1.0 - smoothstep(0.02, 0.07, v.y);
    vec3 base = k == 7u ? vec3(0.17, 0.12, 0.13) : k == 8u ? vec3(0.27, 0.09, 0.08) : vec3(0.1, 0.12, 0.17);
    c = base * (0.7 + 0.5 * v.z) * (0.8 + 0.4 * smoothstep(0.0, 0.5, v.x)); c = mix(c, base * 0.3, seam);
    if (k == 9u) { float facet = step(0.5, fract((P.x + P.y) * 4.0 + v.z * 3.0)); c *= 0.85 + 0.3 * facet; }
    h = smoothstep(0.0, 0.45, v.x) * (1.0 - seam); wet = max(wet, 0.8);
  } else { // plating: plates with bolts, grooves, grime
    vec2 t = P * 2.0; vec2 tf = abs(fract(t) - 0.5); float g = smoothstep(0.46, 0.485, max(tf.x, tf.y)); id = floor(t);
    vec2 bf = abs(fract(t) - 0.5); float bolt = 1.0 - smoothstep(0.03, 0.05, length(bf - 0.4)); float tread = step(0.5, fract((t.x + t.y) * 6.0)) * step(0.7, hash12(id));
    c = vec3(0.24, 0.26, 0.25) * (0.75 + 0.3 * hash12(id)) * (1.0 - 0.12 * tread); c = mix(c, vec3(0.07), g); c = mix(c, vec3(0.42, 0.4, 0.36), bolt * 0.7); h = 1.0 - g + bolt * 0.5; wet = max(wet, 0.25);
  }
  // grime and damp, darker near walls (the mask: walls round this tile)
  vec2 f = fract(P); float nearW = 1.0;
  if (wallAt(T + ivec2(-1, 0))) nearW = min(nearW, f.x); if (wallAt(T + ivec2(1, 0))) nearW = min(nearW, 1.0 - f.x); if (wallAt(T + ivec2(0, -1))) nearW = min(nearW, f.y); if (wallAt(T + ivec2(0, 1))) nearW = min(nearW, 1.0 - f.y);
  float foot = 1.0 - smoothstep(0.0, 0.45, nearW); c *= 1.0 - 0.45 * foot; wet = max(wet, foot * u_floorQ.y * 1.3);
  if (u_finish.z > 0.5) c *= 1.0 - wear * 0.3 * smoothstep(0.45, 0.8, grime);
  // a sewer's channel down the middle of a passage (the Pentagon): wet, sunk, under an iron grate every few tiles
  if (u_floorP.w > 0.5) { bool ew = wallAt(T + ivec2(0, -1)) && wallAt(T + ivec2(0, 1)) && !wallAt(T + ivec2(-1, 0)) && !wallAt(T + ivec2(1, 0)), ns = wallAt(T + ivec2(-1, 0)) && wallAt(T + ivec2(1, 0)) && !wallAt(T + ivec2(0, -1)) && !wallAt(T + ivec2(0, 1));
    if (ew || ns) { float across = ew ? f.y : f.x, along = ew ? P.x : P.y, d = abs(across - 0.5), ch = 1.0 - smoothstep(0.1, 0.12 + fwidth(d), d);
      if (ch > 0.0) { bool grate = fract(along / 3.0) < 0.3; float bars = grate ? aline(fract(along * 9.0) - 0.5, 0.18) : 0.0, frame = grate ? aline(d - 0.11, 0.012) : 0.0;
        vec3 water = vec3(0.03, 0.04, 0.035) + vec3(0.05, 0.06, 0.05) * vnoise(vec2(along * 3.0 - u_time * 0.0004, across * 10.0));
        vec3 chan = mix(water, vec3(0.1, 0.09, 0.08), max(bars, frame)); c = mix(c, chan, ch); h = mix(h, grate ? max(bars, frame) : -0.6, ch); wet = mix(wet, grate ? 0.4 : 1.0, ch); } } }
  return c;
}
// The ceiling plane fills the bays between the structural ribs in the static mesh.
uniform vec4 u_cave; uniform vec4 u_caveB; uniform vec3 u_caveGlow; uniform vec3 u_caveFleck; // 2026-11-11, the Deep's living rock: cave (moss, glowing spots, flecks, glow), caveB (glowing cracks, boulder scale, -, -)
// The Deep's living rock (wall material 7, ceiling kind 5; close-view.ts CLOSE_VIEW_DEEP): boulders split by cracks, moss in
// drifts, a few glowing growths and fine spore flecks. Returns the height (0 in a crack); the rest as shares (0..1).
float caveRock(vec2 q, float k, out float crack, out float moss, out float spot, out float fleck) {
  vec3 cl = cells(q * u_caveB.y + vec2(k * 0.37, k * 0.11));
  crack = 1.0 - smoothstep(0.015, 0.05 + fwidth(cl.y) * 1.5, cl.y);
  float n = fbm(q * 2.7 + cl.z * 4.0);
  moss = smoothstep(0.5, 0.72, fbm(q * vec2(1.3, 2.2) + 3.7) + 0.25 * (n - 0.5)) * u_cave.x;
  vec3 sp = cells(q * 4.2 + 17.0);
  spot = (1.0 - smoothstep(0.07, 0.11, sp.x)) * step(1.0 - u_cave.y, sp.z);
  fleck = u_finish.z > 0.5 ? step(1.0 - 0.025 * u_cave.z, hash12(floor(q * 34.0))) : 0.0;
  return (1.0 - crack) * (0.45 + 0.55 * (1.0 - smoothstep(0.0, 0.7, cl.x))) * (0.8 + 0.3 * n);
}
vec3 ceilMat(vec2 P, out float h, out float dark) {
  float B = u_ceil.z, k = u_ceilK.x; vec3 c = u_ceilRGB; h = 0.0; dark = 0.0;
  if (k < 0.5) {
    vec2 b = fract((P - 0.5) / B);
    float edge = min(min(b.x, 1.0 - b.x), min(b.y, 1.0 - b.y)) * B;
    vec2 id; float mortar;
    h = ashlar(P, 0.32, 0.59, 0.035, 0.72, id, mortar);
    c *= (0.72 + 0.34 * hash12(id)) * (0.82 + 0.24 * vnoise(P * 9.0 + id));
    c = mix(c, u_ceilRGB * 0.35, mortar * 0.88);
    dark = (0.14 + 0.24 * smoothstep(0.0, B * 0.45, edge)) * u_ceilK.z;
  } else if (k < 1.5) { float beam = 1.0 - smoothstep(0.1, 0.12 + fwidth(P.x), abs(fract(P.x) - 0.5)), joist = 1.0 - smoothstep(0.03, 0.04 + fwidth(P.y), abs(fract(P.y * 2.6) - 0.5) * 0.385);
    float grain = vnoise(vec2(P.x * 20.0, P.y * 1.5)); c = vec3(0.16, 0.11, 0.07) * (0.7 + 0.4 * grain); vec3 plank = vec3(0.1, 0.07, 0.05) * (0.7 + 0.5 * vnoise(vec2(P.x * 4.0, P.y * 30.0)));
    c = mix(plank, c, max(beam, joist)); h = beam * 1.0 + joist * 0.5; dark = (1.0 - max(beam, joist)) * u_ceilK.z;
  } else if (k < 2.5) { float w = P.x * 2.2 + sin(P.y * 1.3 + sin(P.x * 0.6)) * 0.25, rb = abs(fract(w) - 0.5); float rib = (1.0 - smoothstep(0.05, 0.12, rb)) * (0.75 + 0.25 * sin(P.y * 9.0 + floor(w))); // vertebrae: ribs knuckled along their length
    vec3 v = cells(P * 2.5); c = mix(vec3(0.06, 0.045, 0.05) * (0.7 + 0.5 * v.z), vec3(0.16, 0.11, 0.1), rib); h = rib - (1.0 - smoothstep(0.02, 0.06, v.y)) * 0.3; dark = (1.0 - rib) * u_ceilK.z;
  } else if (k > 4.5) { // the Deep's rock overhead (2026-11-11): rough lumps and cracks falling into the dark
    float crack, moss, spot, fleck; h = caveRock(P * 1.5, 3.0, crack, moss, spot, fleck);
    c = u_ceilRGB * (0.45 + 0.5 * h) * (0.8 + 0.3 * vnoise(P * 5.0)); c = mix(c, u_ceilRGB * 0.3, crack * 0.7);
    dark = (0.25 + 0.45 * (1.0 - h)) * u_ceilK.z;
  } else if (k > 3.5) { // a starship's ceiling (seed realms): clean panels, a seam each tile, a light panel in each bay
    vec2 f = abs(fract(P) - 0.5), b = fract(P / B); float seam = smoothstep(0.47, 0.49, max(f.x, f.y));
    float lit = (1.0 - smoothstep(0.08, 0.1, abs(b.x - 0.5))) * (1.0 - smoothstep(0.3, 0.32, abs(b.y - 0.5)));
    c = u_ceilRGB * (0.9 + 0.08 * vnoise(P * 20.0)); c = mix(c, u_ceilRGB * 0.4, seam); c = mix(c, vec3(1.2, 1.45, 1.6), lit); h = 1.0 - seam; dark = seam * 0.3 * u_ceilK.z;
  } else { // an old machine's underside: heavy girders each bay, deep dark coffers between, pipes, the odd dead lamp
    vec2 b = fract(P / B); float e = min(min(b.x, 1.0 - b.x), min(b.y, 1.0 - b.y)) * B; float girder = 1.0 - smoothstep(0.1, 0.12 + fwidth(e), e);
    float pipe = (1.0 - smoothstep(0.035, 0.05, abs(fract(P.y * 0.5 + 0.3) - 0.5))) * step(0.12, e), bolt = (1.0 - smoothstep(0.015, 0.025, abs(e - 0.06))) * step(0.5, fract((P.x + P.y) * 4.0));
    vec2 cf = abs(fract(P / B * 2.0) - 0.5); float rib = aline(min(cf.x, cf.y), 0.02) * (1.0 - girder);
    c = mix(vec3(0.05, 0.055, 0.055), vec3(0.17, 0.18, 0.17) * (0.8 + 0.3 * vnoise(P * 3.0)), max(girder, rib * 0.7)); c = mix(c, vec3(0.16, 0.13, 0.1), pipe); c = mix(c, vec3(0.24, 0.22, 0.19), bolt * girder * 0.35);
    h = girder + rib * 0.5 + pipe * 0.7; dark = (1.0 - max(girder, max(pipe, rib))) * u_ceilK.z; }
  return c;
}
// the open sky: horizon to zenith, the sun (or the moon) and its glow, stars, clouds drifting (still with reduced motion), a
// distant lightning flash in a storm, the far ridge line
vec3 outdoorSky(vec3 ray, bool full) {
  vec3 d = normalize(ray); float up = clamp(d.z, 0.0, 1.0), sd = max(dot(d, u_sun.xyz), 0.0);
  float disc = smoothstep(0.9993, 0.9997, sd);
  vec3 c = mix(u_skyH.rgb, u_skyZ.rgb, pow(up, 0.5)) + u_sunC * (0.16 * pow(sd, 5.0) + 0.45 * pow(sd, 60.0) + 2.0 * disc * (1.0 - u_mood.z));
  float cover = 0.0;
  if (u_mood.x > 0.0 && d.z > 0.0) { vec2 sp = d.xy / (d.z + 0.35) * 70.0; vec2 cell = floor(sp); float h = hash12(cell); // stars: one hash a cell, fixed to the sky
    vec2 o = vec2(hash12(cell + 7.1), hash12(cell + 3.3)) * 0.6 + 0.2; float r = length(fract(sp) - o);
    float star = step(0.965, h) * smoothstep(0.16, 0.0, r) * (0.45 + 0.55 * fract(h * 37.0)) * (0.8 + 0.2 * sin(u_time * 0.002 + h * 60.0));
    c += vec3(0.85, 0.9, 1.0) * star * u_mood.x * smoothstep(0.02, 0.3, d.z); }
  if (u_mood.z > 0.5) { float m = smoothstep(0.99935, 0.99965, sd); c = mix(c, vec3(0.86, 0.88, 0.95) * (0.85 + 0.15 * vnoise(d.xy * 900.0)), m); } // the moon's disc
  if (!full) return c;
  if (u_skyZ.w > 0.0 && d.z > 0.0) { vec2 q = d.xy / (d.z + 0.16) * 0.9 + vec2(u_time * 0.000006, u_time * 0.0000025); // the low tier: one layer of noise, not three
    float n = u_finish.z > 0.5 ? fbm(q * 1.5) : vnoise(q * 1.5) * 0.85 + 0.08; cover = smoothstep(1.0 - u_skyZ.w * 0.7, 1.12 - u_skyZ.w * 0.45, n + 0.12);
    vec3 cc = mix(u_skyH.rgb, u_moodC.rgb, 0.5) * (0.82 + 0.3 * n) * (1.0 - u_mood.y * (1.0 - n) * 0.85) + u_sunC * 0.18 * pow(sd, 3.0);
    c = mix(c, cc, cover * smoothstep(0.0, 0.14, d.z) * 0.85); }
  if (u_mood.w > 0.0) { float sa = mod(atan(d.y, d.x) - u_moodC.w + 3.14159265, 6.2831853) - 3.14159265, a = abs(sa); // distant lightning: the clouds lit from within near its bearing
    float g = u_mood.w * exp(-a * a * 9.0) * exp(-max(d.z, 0.0) * 5.0);
    c += vec3(0.62, 0.68, 0.9) * g * (0.35 + 1.1 * cover);
    if (u_finish.z > 0.5 && u_mood.w > 0.55) { float off = (vnoise(vec2(d.z * 60.0, u_moodC.w * 10.0)) - 0.5) * 0.05 + (vnoise(vec2(d.z * 210.0, u_moodC.w * 3.0)) - 0.5) * 0.012; // its bolt (detail tiers)
      c += vec3(0.9, 0.93, 1.0) * smoothstep(0.004, 0.0, abs(sa - off)) * step(0.0, d.z) * (1.0 - smoothstep(0.12, 0.2, d.z)) * u_mood.w; } }
  if (u_skyH.w > 0.0) { vec2 a = normalize(d.xy + vec2(1e-5)); float fw = 1.5 / u_F;
    float far = u_skyH.w * 0.62 * (0.4 + 0.6 * vnoise(a * 5.0 + 11.0)); // a paler, farther range behind
    c = mix(c, mix(u_ridge.rgb, u_skyH.rgb, 0.62), 1.0 - smoothstep(far - fw, far + fw, d.z));
    float rh = u_skyH.w * (0.35 + 0.65 * fbm(a * (1.6 + 3.5 * u_ridge.w) + 3.7));
    vec3 rc = mix(u_ridge.rgb, u_skyH.rgb, 0.18 + 0.4 * (1.0 - clamp(d.z / max(rh, 1e-3), 0.0, 1.0)));
    c = mix(c, rc, 1.0 - smoothstep(rh - fw, rh + fw, d.z)); }
  return c;
}
uint outdoorFlags(ivec2 T) { return uint(texelFetch(u_terrainTex, clamp(T, ivec2(0), u_mapSize - 1), 0).a * 255.0 + 0.5); }
// surface detail by class, world-anchored: grass, sand ripples, snow, rock plates, paving, glass, earth (about -1..1)
float outdoorDetail(vec2 P, uint cls, float hf) {
  if (cls == 1u) return (fbm(P * 0.9) - 0.5) * 0.7 + (vnoise(P * 23.0) * 0.6 + vnoise(P * 57.0) * 0.4 - 0.5) * 1.1 * hf;
  if (cls == 2u) return sin((P.x * 0.7 + P.y * 0.45) * 9.0 + vnoise(P * 1.3) * 5.0) * 0.35 * (0.4 + 0.6 * hf) + (vnoise(P * 41.0) - 0.5) * 0.5 * hf;
  if (cls == 3u) return (fbm(P * 1.6) - 0.5) * 0.45 + (vnoise(P * 33.0) - 0.5) * 0.25 * hf;
  if (cls == 4u) { vec3 k = cells(P * 2.2); return (k.z - 0.5) * 0.6 - (1.0 - smoothstep(0.02, 0.08, k.y)) * 0.9 * (0.3 + 0.7 * hf); }
  if (cls == 5u) { vec2 id; float mortar; ashlar(P, 0.5, 0.8, 0.04, 0.3, id, mortar); return (hash12(id) - 0.5) * 0.5 - mortar * 0.9 * (0.3 + 0.7 * hf); }
  if (cls == 6u) { vec3 k = cells(P * 1.6); return (k.z - 0.5) * 0.5 - (1.0 - smoothstep(0.01, 0.05, k.y)) * 0.35 * hf; }
  return (fbm(P * 2.5) - 0.5) * 0.8 + (vnoise(P * 37.0) - 0.5) * 0.3 * hf;
}
bool waterTile(ivec2 T) { return (outdoorFlags(T) & 1u) == 1u; }
// how much water is at P, 0 to 1: the four nearest tile centres' water, blended bilinearly at a point wandered a little by
// noise, so a coast is a curve and not a staircase (a water tile's own middle is always water, dry ground's always dry)
float waterField(vec2 P) { vec2 Q0 = P - 0.5; ivec2 T0 = ivec2(floor(Q0)); // all four nearest middles alike (most of the ground, open water): no shore here, no noise
  bool w0 = waterTile(T0), w1 = waterTile(T0 + ivec2(1, 0)), w2 = waterTile(T0 + ivec2(0, 1)), w3 = waterTile(T0 + ivec2(1, 1)); if (w0 == w1 && w0 == w2 && w0 == w3) return w0 ? 1.0 : 0.0;
  vec2 Q = Q0 + (vec2(vnoise(P * 1.7), vnoise(P * 1.7 + 9.2)) - 0.5) * u_outY.z; vec2 b = floor(Q), f = fract(Q); f = f * f * (3.0 - 2.0 * f); ivec2 T = ivec2(b);
  float a = waterTile(T) ? 1.0 : 0.0, c = waterTile(T + ivec2(1, 0)) ? 1.0 : 0.0, d = waterTile(T + ivec2(0, 1)) ? 1.0 : 0.0, e = waterTile(T + ivec2(1, 1)) ? 1.0 : 0.0;
  return mix(mix(a, c, f.x), mix(d, e, f.x), f.y); }
// the open ground: the ordinary art near (its tile lines softened into its own colour), the section's own colours beyond,
// lit by the sun; water is the sky's mirror over a depth that darkens away from the shore, with a line of foam and a wet band
vec3 outdoorGround(vec2 P, vec3 dir, float depth, vec4 surface, float z) { // z: the ground's height there (the heightfield's top; 0 for the far plane)
  ivec2 T = ivec2(floor(P)); uint fl = outdoorFlags(T), cls = fl >> 5u; float lv = float((fl >> 2u) & 7u);
  vec2 warp = vec2(vnoise(P * 0.9), vnoise(P * 0.9 + 17.3)) - 0.5; // the tiles' colours, their grid broken by a gentle warp
  vec3 farC = texture(u_terrainTex, (P + warp * 0.7) / vec2(u_mapSize)).rgb * (0.9 + 0.2 * vnoise(P * 0.45 + 3.1));
  vec2 dd = abs(P - u_player); float near = (1.0 - smoothstep(u_outdoor.y, u_outdoor.z, max(dd.x, dd.y))) * surface.a;
  vec3 art = surface.rgb / max(surface.a, 1e-3);
  float wf = waterField(P), wet = smoothstep(0.5 - u_outX.y, 0.5, wf); bool water = wf > 0.5;
  if (near > 0.0 && u_outX.x < 0.999) art = mix(farC, art, water && u_outX.w < 0.5 ? 0.12 : u_outX.x); // the tile lines softened into the ground's own warped colour (no extra texture read)
  vec3 alb = mix(farC, art, near);
  vec3 N = vec3(0.0, 0.0, 1.0), W3 = vec3(P, z);
  if (u_outdoor.w > 0.5 && !water) { float fw = length(fwidth(P)), hf = 1.0 - smoothstep(0.012, 0.045, fw), amp = u_outD.x * (1.0 - smoothstep(u_outD.y, u_outD.z, depth));
    float det = outdoorDetail(P, cls, hf); alb *= 1.0 + amp * det; if (u_finish.z > 0.5) N = bump(N, W3, det * amp * 0.05); }
  alb *= 1.0 - 0.32 * wet * (water ? 0.0 : 1.0); // the shore's wet band, darker
  vec3 dif, spe; lightsAt(W3, N, 0.0, dif, spe); vec3 col = alb * dif;
  if (u_finish.z > 0.5) { // relief: the foot of a higher level or an outcrop in soft shade, the lip of a level in light
    vec2 f = fract(P); float foot = 1.0, lip = 1.0;
    for (int i = 0; i < 4; i++) { ivec2 o = i == 0 ? ivec2(-1, 0) : i == 1 ? ivec2(1, 0) : i == 2 ? ivec2(0, -1) : ivec2(0, 1);
      float e = i == 0 ? f.x : i == 1 ? 1.0 - f.x : i == 2 ? f.y : 1.0 - f.y; uint q = outdoorFlags(T + o); float ln = float((q >> 2u) & 7u);
      if (ln > lv || (q & 2u) == 2u) foot = min(foot, e); else if (ln < lv) lip = min(lip, e); }
    col *= 1.0 - u_outR.y * (1.0 - smoothstep(0.0, u_outR.x, foot)); col *= 1.0 + u_outR.w * (1.0 - smoothstep(0.0, u_outR.z, lip)); }
  if (water) { vec3 n = vec3(0.0, 0.0, 1.0); float t = u_time * 0.0004;
    if (u_finish.z > 0.5) { vec2 q = P * u_outW.z; // two swells crossing, and a finer chop near the eye
      vec2 sw = vec2(vnoise(q + vec2(t, 0.0)) - vnoise(q + vec2(3.1, t)), vnoise(q * 1.3 - vec2(t * 0.7, t)) - vnoise(q * 1.3 + 5.7));
      if (depth < 9.0) sw += (vec2(vnoise(q * 2.7 - vec2(t * 1.9, 0.0)), vnoise(q * 2.9 + vec2(0.0, t * 1.6))) - 0.5) * 0.45 * (1.0 - smoothstep(6.0, 9.0, depth));
      n = normalize(vec3(sw * u_outW.w, 1.0)); }
    // the depth: how far into the water this is (its own field), and how much water lies two tiles round it
    float ring = 0.0; for (int i = 0; i < 8; i++) { ivec2 o = i == 0 ? ivec2(2, 0) : i == 1 ? ivec2(-2, 0) : i == 2 ? ivec2(0, 2) : i == 3 ? ivec2(0, -2) : i == 4 ? ivec2(2, 2) : i == 5 ? ivec2(-2, 2) : i == 6 ? ivec2(2, -2) : ivec2(-2, -2); ring += waterTile(T + o) ? 0.125 : 0.0; }
    float deep = smoothstep(0.5, 1.0, wf) * (0.35 + 0.65 * ring);
    vec3 body = mix(alb * (1.0 + u_outY.y) + vec3(0.02, 0.05, 0.05), alb * (1.0 - u_outY.x), deep);
    col = body * (dif * 0.75 + 0.25);
    vec3 v = normalize(dir), r = reflect(v, n); r.z = abs(r.z);
    float fres = u_outW.x + (u_outW.y - u_outW.x) * pow(1.0 - clamp(-dot(v, n), 0.0, 1.0), 4.0);
    col = mix(col, outdoorSky(r, u_outY.w > 0.5), fres) + u_sunC * pow(max(dot(r, u_sun.xyz), 0.0), 140.0) * u_outD.w;
    // foam where the water meets the shore: a broken line that breathes (still with reduced motion)
    float edge = 1.0 - smoothstep(0.5, 0.5 + u_outX.y * 0.9, wf);
    if (edge > 0.001) { float br = vnoise(P * 6.0 + vec2(t * 2.5, -t * 1.7)) * 0.6 + vnoise(P * 15.0 - t * 3.0) * 0.4;
      float foam = edge * smoothstep(0.35, 0.75, br + edge * 0.35) * u_outX.z; col = mix(col, vec3(0.92, 0.95, 0.96) * (dif * 0.6 + 0.4), clamp(foam, 0.0, 0.85)); }
    if (u_outX.w > 0.5) col = mix(col, art * dif, near * 0.6); }
  return atmos(col, W3, depth, dif);
}
vec3 hallBackdrop(vec3 ray) {
  vec3 d = normalize(ray);
  vec2 p = d.xy / (0.55 + abs(d.z));
  vec3 c = mix(u_backdrop[0], u_backdrop[1] * 0.36, pow(max(0.0, d.z), 1.4));
  if (u_hall.x < 1.5) {
    vec2 cell = p * 52.0, id = floor(cell);
    float star = step(0.96, hash12(id)) * (1.0 - smoothstep(0.06, 0.23, length(fract(cell) - 0.5)));
    c += u_backdrop[2] * star * 0.5;
  } else if (u_hall.x < 2.5) {
    float ledge = abs(fract(d.z * 11.0) - 0.5);
    c += u_backdrop[2] * (1.0 - smoothstep(0.02, 0.08, ledge)) * step(0.78, hash12(floor(p * 19.0))) * 0.2;
  } else if (u_hall.x < 3.5) {
    vec2 g = abs(fract(vec2(p.x + p.y * 0.7, p.y - p.x * 0.53) * 5.0) - 0.5);
    c += u_backdrop[2] * (1.0 - smoothstep(0.012, 0.04, min(g.x, g.y))) * 0.16;
  } else {
    c += u_backdrop[2] * pow(max(0.0, d.z), 6.0) * 0.18;
  }
  return c;
}
// Seed realms (the Drifting Ship): the cosmos seen through its glass, its windows and its open bay. The same sky above and
// below, fixed to the view's direction (infinitely far): two layers of stars, a nebula (on the detail tiers) and a spiral galaxy.
vec3 spaceSky(vec3 ray) {
  vec3 d = normalize(ray); vec2 p = d.xy / (0.35 + abs(d.z));
  vec3 c = vec3(0.006, 0.008, 0.02);
  vec2 cell = p * 60.0, id = floor(cell); float s = step(0.955, hash12(id)) * (1.0 - smoothstep(0.03, 0.16, length(fract(cell) - 0.5 - (vec2(hash12(id + 7.0), hash12(id + 9.0)) - 0.5) * 0.5)));
  c += vec3(0.85, 0.9, 1.0) * s * (0.4 + 0.6 * hash12(id + 3.0));
  cell = p * 23.0; id = floor(cell); s = step(0.985, hash12(id + 11.0)) * (1.0 - smoothstep(0.02, 0.12, length(fract(cell) - 0.5))); c += vec3(1.0, 0.92, 0.8) * s;
  float n = vnoise(p * 1.3 + 4.0); if (u_space.z > 0.5) n = n * 0.6 + vnoise(p * 3.1 - 2.0) * 0.4; // the nebula: one octave on the light tiers
  c += mix(vec3(0.26, 0.06, 0.3), vec3(0.04, 0.18, 0.3), vnoise(p * 0.7 + 9.0)) * smoothstep(0.4, 0.85, n) * 0.7;
  c += vec3(0.1, 0.1, 0.16) * exp(-abs(p.y + p.x * 0.3) * 2.5) * (0.6 + 0.4 * n); // a faint band of distant stars
  for (int k = 0; k < 2; k++) { // two spiral galaxies, one large, one far off across the sky
    vec2 g = (p - (k == 0 ? vec2(0.7, -0.45) : vec2(-1.1, 0.8))) * (k == 0 ? 0.45 : 1.1); g = vec2(g.x * 0.8 - g.y * 0.6, (g.x * 0.6 + g.y * 0.8) * 2.2); float r = length(g) + 1e-4, a = atan(g.y, g.x);
    float arms = pow(0.5 + 0.5 * cos(2.0 * a - log(r) * 4.5), 4.0) * exp(-r * 4.5);
    c += vec3(0.55, 0.62, 1.0) * arms * 1.1 + vec3(1.0, 0.86, 0.66) * exp(-r * r * 160.0) * 1.3 + vec3(0.6, 0.5, 0.85) * exp(-r * 6.0) * 0.3; }
  return c * u_space.y;
}
void main() {
  vec2 css = vec2(gl_FragCoord.x, u_dev.y - gl_FragCoord.y) * (u_size / u_dev);
  float b = (css.x - u_pp.x) / u_F, a = (u_pp.y - css.y) / u_F;
  vec3 dir = vec3(u_fwd * (u_cosP + a * u_sinP) + u_right * b, -u_sinP + a * u_cosP);
  vec3 col = (u_terrain > .5 || u_hall.z > 1.5) && dir.z > 0.0 && u_hall.x > 0.0 ? hallBackdrop(dir) : u_fog;
  if (u_outdoor.x > 0.5 && dir.z >= 0.0) { outColor = vec4(finish(outdoorSky(dir, true)), 1.0); return; }
  if (u_terrain > .5) { outColor = vec4(finish(col), 1.0); return; }
  if (dir.z < -1e-5) { float t = -u_hc / dir.z; vec2 P = u_cam + dir.xy * t; ivec2 T = ivec2(floor(P)); uvec4 m = maskAt(T);
    float depth = t /* dir's component along the view axis is 1: t is the camera depth */, fogK = clamp((depth - u_fogP.x) / (u_fogP.y - u_fogP.x), 0.0, 1.0);
    if (fogK < 0.999) {
      vec3 dif, spe; vec3 W3 = vec3(P, 0.0);
      if ((m.r & 2u) == 2u) { col = u_fog; } // unseen: the dark keeps its secrets
      else if (u_space.x > 0.5 && (m.r & 8u) == 8u) { vec4 sf = overlayAt(P); col = mix(mix(spaceSky(dir), sf.rgb, sf.a * (m.g == 3u ? 0.15 : 0.3)), u_fog, fogK * 0.5); } // seed realms: the cosmos below the glass
      else if (u_floorQ.w > 0.5) {
        vec4 surface = overlayAt(P);
        col = u_outdoor.x > 0.5 ? outdoorGround(P, dir, depth, surface, 0.0) : atmos(u_fog * (1.0 - surface.a) + surface.rgb, W3, depth, u_amb);
      }
      else if (m.g == 1u || m.g == 3u || m.g == 5u) { col = pitColor(P, dir, m.g, (m.b & 1u) == 1u); lightsAt(W3, vec3(0, 0, 1), 0.0, dif, spe); col = atmos(col, W3, depth, dif * 0.3); }
      else if (m.g == 2u) { col = atmos(lavaColor(P, T), W3, depth, vec3(0.0)); }
      else { float h, wet; uint mat = m.b >> 1u; vec3 alb = floorMat(P, T, mat, h, wet);
        vec2 inlayFootprint = u_hall.x > 0.0 ? fwidth(P) : vec2(0.0);
        uint inlay = m.a >> 1u;
        if (inlay > 0u) {
          vec2 cell = abs(fract(P) - 0.5);
          float edge = max(cell.x, cell.y);
          float aa = clamp(max(inlayFootprint.x, inlayFootprint.y), 0.005, 0.06);
          float rim = 1.0 - smoothstep(0.44 - aa, 0.44 + aa, edge);
          float center = 1.0 - smoothstep(0.35 - aa, 0.35 + aa, edge);
          vec3 metal = inlay == 4u || inlay == 2u ? u_inlayColors[2] : u_inlayColors[1];
          alb = mix(alb, u_inlayColors[0], rim * 0.8);
          if (inlay > 1u) alb = mix(alb, metal, center * 0.88);
        }
        vec3 N = u_floorQ.x > 0.5 ? bump(vec3(0.0, 0.0, 1.0), W3, h * 0.035) : vec3(0.0, 0.0, 1.0);
        lightsAt(W3, N, wet > 0.05 ? 24.0 : 0.0, dif, spe); col = alb * dif + spe * wet * 0.35;
        // the lit lip at a drop's edge (the floor's broken edge catches the light)
        vec2 f = fract(P); float w = u_pit.w; float e = 1.0;
        if (f.x < w && pitCode(maskAt(T + ivec2(-1, 0)).g)) e = min(e, f.x); if (f.x > 1.0 - w && pitCode(maskAt(T + ivec2(1, 0)).g)) e = min(e, 1.0 - f.x);
        if (f.y < w && pitCode(maskAt(T + ivec2(0, -1)).g)) e = min(e, f.y); if (f.y > 1.0 - w && pitCode(maskAt(T + ivec2(0, 1)).g)) e = min(e, 1.0 - f.y);
        if (e < 1.0) { float k = 1.0 - smoothstep(0.0, w, e); col = mix(col, u_lip * dif * 1.6, k * 0.55); col *= 1.0 - 0.45 * (1.0 - smoothstep(0.0, w * 0.35, e)); }
        // lava lights the floor round it
        if (u_lava.w > 0.0) { vec3 glow = vec3(0.0);
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { if (maskAt(T + ivec2(i, j)).g != 2u) continue; vec2 lo = vec2(T + ivec2(i, j)), d = max(max(lo - P, P - lo - 1.0), 0.0); glow += u_lavaB * exp(-length(d) * u_lava.w); }
          col += alb * glow * u_lava.z * 2.0; dif += glow * u_lava.z; }
        // what lies on the floor: telegraphs, traps, marks (kept readable in the dark)
        vec4 ov = overlayAt(P); float lum = clamp(dot(dif, vec3(0.33)), 0.0, 1.0); col = col * (1.0 - ov.a) + ov.rgb * (0.5 + 0.5 * lum);
        col = atmos(col, W3, depth, dif); }
    } else col = u_space.x > 0.5 && ((m.r & 8u) == 8u || any(lessThan(T, ivec2(0))) || any(greaterThanEqual(T, u_mapSize))) ? mix(spaceSky(dir), u_fog, 0.35) : u_fog; // seed realms: out of the bay, the cosmos goes on past the fog and the map
  } else if (dir.z > 1e-5 && u_ceil.y > 0.5 && u_terrain < .5) { float t = (u_ceil.x - u_hc) / dir.z; vec2 P = u_cam + dir.xy * t; uvec4 m = maskAt(ivec2(floor(P)));
    float depth = t;
    bool skylight = u_hall.z > 0.5 && (m.r & 4u) == 4u;
    ivec2 CT = ivec2(floor(P)); if (u_space.x > 0.5 && ((m.r & 19u) == 16u || any(lessThan(CT, ivec2(0))) || any(greaterThanEqual(CT, u_mapSize)))) col = spaceSky(dir); // seed realms: an open bay looks out on the cosmos
    else if ((m.r & 2u) == 0u && u_hall.x > 0.0 && (u_hall.y > 0.5 || skylight)) {
      col = hallBackdrop(dir);
    } else if ((m.r & 1u) == 1u && (m.r & 2u) == 0u) { vec3 W3 = vec3(P, u_ceil.x); float h = 0.0, dark = 0.0; vec3 c = u_ceilRGB;
      if (u_ceil.w > 0.5) c = ceilMat(P, h, dark);
      vec3 N = u_ceil.w > 0.5 ? bump(vec3(0.0, 0.0, -1.0), W3, h * 0.04) : vec3(0.0, 0.0, -1.0); vec3 dif, spe; lightsAt(W3, N, 0.0, dif, spe);
      c *= dif * (1.0 - dark); col = atmos(c, W3, depth, dif * 0.5);
      if (u_hall.x > 0.0) col = mix(col, hallBackdrop(dir), 0.24 + dark * 0.25); }
    else col = u_fog;
  }
  outColor = vec4(finish(col), 1.0);
}`;

// ---------------------------------------------------------------------------------------------- walls, their trim, arches and props
// The static buffer (built once a floor in close-view.ts, glStaticWalls). a_pos: world x, y, z; a_tex: along (tiles, continuous
// along a run), u (0..1 across the face), z (tiles up), top (the face's height); a_nrm: normal x, y, part, material;
// a_col: rgb; a_meta: deco, grit (variant*4 + instance*2 + flip), bits (corner | ao << 2), hash; a_tile: the tile it belongs to.
// part: 0 a wall face, 1 a low wall's top, 2 a pilaster, 3 plinth or cornice, 4 an arch's face, 5 an arch's soffit, 6 iron,
// 7 stone or clay (an urn, rubble), 8 wax (candles), 9 wood (a coffin). material: 0 stone, 1 dirt, 2 chitin, 3 panels, 4 hedge, 5 a door's dark.
// deco (on a wall face): 1 banner, 2 tapestry, 3 arrow slit, 4 roots, 6 niche, 7 glowing pods, 8 vent.
const WALL_VS = VS_COMMON + `
invariant gl_Position; // the depth pass and the shading pass put every wall pixel at exactly the same depth
in vec3 a_pos; in vec4 a_tex; in vec4 a_nrm; in vec3 a_col; in vec4 a_meta; in vec2 a_tile;
uniform highp usampler2D u_mask; uniform ivec2 u_mapSize; uniform float u_reach;
out vec3 v_world; out vec4 v_tex; out vec4 v_nrm; out vec3 v_col; out vec4 v_meta; out float v_depth;
void main() { float d; gl_Position = project(a_pos, d); v_depth = d; v_world = a_pos; v_tex = a_tex; v_nrm = a_nrm; v_col = a_col; v_meta = a_meta;
  ivec2 T = ivec2(a_tile); bool unseen = T.x >= 0 && T.y >= 0 && T.x < u_mapSize.x && T.y < u_mapSize.y && (texelFetch(u_mask, T, 0).r & 2u) == 2u;
  bool far = length(a_tile + 0.5 - u_cam) > u_reach, back = dot(a_nrm.xy, a_nrm.xy) > 0.5 && dot(a_nrm.xy, u_cam - a_pos.xy) < -0.01;
  if (unseen || far || back) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }`;
const SURFACE_FUNCTIONS = ENV_FS.slice(FS_COMMON.length, ENV_FS.indexOf("void main()"));
const WALL_FS = FS_COMMON + SURFACE_FUNCTIONS + `
in vec3 v_world; in vec4 v_tex; in vec4 v_nrm; in vec3 v_col; in vec4 v_meta; in float v_depth;
uniform sampler2D u_grit; uniform vec4 u_detail; uniform float u_gritA[9]; uniform vec4 u_shimmer;
uniform vec4 u_stoneP; uniform vec4 u_wallP; uniform vec3 u_mortar; uniform vec3 u_damp; uniform vec3 u_deco1; uniform vec3 u_deco2; uniform vec4 u_arch; uniform vec3 u_glowRGB;
// stoneP: course, block, bevel, roughness; wallP: damp height, damp amount, bump on, top falloff; arch: spring, radius, band, -
void main() {
  vec3 c = v_col; float along = v_tex.x, u = v_tex.y, z = v_tex.z, top = v_tex.w, part = v_nrm.z, mat = v_nrm.w, deco = v_meta.x;
  if (part >= 20.0) {
    vec2 P = v_world.xy; ivec2 T = ivec2(floor(P)); uvec4 m = maskAt(T);
    vec3 N = normalize(cross(dFdx(v_world), dFdy(v_world)));
    if (part < 20.5 && N.z < 0.0 || part >= 20.5 && N.z > 0.0) N = -N;
    vec3 dif, spe, alb; float relief = 0.0, wetness = 0.0;
    if(part >= 21.5) {
      vec3 ray=normalize(v_world-u_eye),col=pitColor(P,ray,m.g,(m.b&1u)==1u);
      lightsAt(v_world,vec3(0,0,1),0.0,dif,spe);
      outColor=vec4(finish(atmos(col,v_world,v_depth,dif*.3)),1);return;
    }
    if (part >= 20.5) { float dark = 0.0; alb = u_ceil.w > 0.5 ? ceilMat(P, relief, dark) : u_ceilRGB; alb *= 1.0 - dark; }
    else if (m.g == 2u) { outColor = vec4(finish(atmos(lavaColor(P,T),v_world,v_depth,vec3(0))),1); return; }
    else {
      alb = floorMat(P, T, m.b >> 1u, relief, wetness);
      uint inlay = m.a >> 1u;
      if(inlay > 0u) {
        float edge=max(abs(fract(P).x-.5),abs(fract(P).y-.5)), aa=clamp(max(fwidth(P).x,fwidth(P).y),.005,.06);
        alb=mix(alb,u_inlayColors[0],(1.0-smoothstep(.44-aa,.44+aa,edge))*.8);
        if(inlay>1u) alb=mix(alb,inlay==4u||inlay==2u?u_inlayColors[2]:u_inlayColors[1],(1.0-smoothstep(.35-aa,.35+aa,edge))*.88);
      }
    }
    if(u_floorQ.x>.5) N=bump(N,v_world,relief*.035);
    lightsAt(v_world,N,wetness>.05?24.0:0.0,dif,spe);
    vec3 col=alb*dif+spe*wetness*.35;
    if(part<20.5){vec4 ov=overlayAt(P);col=col*(1.0-ov.a)+ov.rgb*(.5+.5*clamp(dot(dif,vec3(.33)),0.0,1.0));}
    outColor=vec4(finish(atmos(col,v_world,v_depth,dif)),1.0); return;
  }
  vec3 N0 = vec3(v_nrm.xy, 0.0); if (dot(N0, N0) < 0.25) N0 = vec3(0.0, 0.0, (part > 4.5 && part < 5.5) || fract(part) > 0.1 ? -1.0 : 1.0); // a flat face: up, or down (a soffit, a cornice's underside: part x.25)
  float h = 1.0, shin = 0.0, wet = 0.0; vec3 emit = vec3(0.0); vec2 id; float mortar = 0.0; vec2 q = vec2(along, z);
  if (part > 11.5 && part < 12.5) { // 2026-11-11: a growth or a feature of the Deep (a cap, a shard, a column...): its own colour, lit from within by deco
    N0 = normalize(N0); c = v_col * (0.82 + 0.3 * vnoise(vec2(along * 7.0, z * 9.0) + v_meta.w));
    emit = v_col * deco * (u_shimmer.z > 0.5 ? 1.0 : 0.85 + 0.15 * sin(u_time * 0.0017 + v_meta.w)); shin = deco > 0.05 ? 20.0 : 0.0; wet = deco * 0.4;
  } else if (part >= 10.0) { // structural ceiling beams and their undersides
    vec2 surface = abs(N0.z) > 0.5 ? v_world.xy : vec2(along, top - z);
    if (mat < 0.5) {
      h = ashlar(surface, u_stoneP.x * 0.62, u_stoneP.y, u_stoneP.z, u_stoneP.w, id, mortar);
      c *= (0.78 + 0.32 * hash12(id)) * (0.83 + 0.25 * vnoise(surface * 11.0 + id));
      c = mix(c, c * 0.36, mortar);
    } else if (mat < 1.5) {
      h = vnoise(surface * vec2(25.0, 2.0));
      c *= 0.7 + 0.55 * h;
    } else if (mat < 2.5) {
      h = 0.55 + 0.38 * vnoise(surface * 9.0);
      c *= 0.7 + 0.54 * h;
      shin = 24.0;
    } else {
      float seam = aline(fract(surface.x * 2.0) - 0.5, 0.028);
      c *= (0.78 + 0.34 * vnoise(surface * 12.0)) * (1.0 - seam * 0.46);
      h = 1.0 - seam * 0.65; shin = 18.0;
    }
  } else if (mat > 6.5 && part < 3.5) { // 2026-11-11: the Deep's living rock (CLOSE_VIEW_DEEP): boulders and cracks, moss thickest low, glowing growths, spore flecks
    vec2 cq = abs(N0.z) > 0.5 ? v_world.xy * 1.3 : q; float crack, moss, spot, fleck;
    h = caveRock(cq, v_meta.w, crack, moss, spot, fleck); id = floor(cq); float n = vnoise(cq * 6.0), near = 1.0 - smoothstep(4.0, 9.0, v_depth);
    c *= (0.7 + 0.5 * h) * (0.85 + 0.3 * n); c = mix(c, u_mortar, crack * 0.85);
    moss *= 0.55 + 0.45 * (1.0 - smoothstep(0.3, 1.8, z)); c = mix(c, u_damp * (0.55 + 0.6 * n), moss);
    float pulse = u_shimmer.z > 0.5 ? 1.0 : 0.8 + 0.2 * sin(u_time * 0.0013 + v_meta.w);
    spot *= step(0.15, z) * (1.0 - smoothstep(1.7, 2.2, z)); c = mix(c, u_caveGlow * 0.5, spot); emit += u_caveGlow * spot * u_cave.w * pulse;
    emit += u_caveGlow * crack * u_caveB.x * (0.6 + 0.4 * n) * (1.0 - smoothstep(0.6, 1.6, z)) * pulse; // a lava bog's seams glow near the foot
    c = mix(c, u_caveFleck, fleck * near * 0.8); emit += u_caveFleck * fleck * near * 0.3;
    h -= moss * 0.15; wet = 0.2 * (1.0 - moss);
  } else if (mat > 5.5 && part < 4.5) { // a starship's panels (seed realms): brushed composite, crisp seams, a light strip and a kick strip
    vec2 t = vec2(along, z * 0.8); vec2 tf = abs(fract(t) - 0.5); id = floor(t); float aa = fwidth(along) + 0.004;
    float seam = smoothstep(0.475 - aa, 0.49, max(tf.x, tf.y)), brushed = 0.92 + 0.07 * vnoise(vec2(along * 42.0, z * 1.5 + id.x * 3.1));
    c = c * brushed * (0.93 + 0.1 * hash12(id)); c = mix(c, u_mortar, seam * 0.85);
    float strip = 1.0 - smoothstep(0.03, 0.045, abs(z - 1.95)), kick = 1.0 - smoothstep(0.015, 0.03, abs(z - 0.16));
    c = mix(c, vec3(0.78, 0.92, 1.0), strip); if (z < 0.12) c *= 0.5; emit += u_glowRGB * (strip * 0.9 + kick * 0.45);
    h = 1.0 - seam * 0.7; shin = 48.0; wet = 0.25;
  } else if (part > 3.5 && part < 4.5) { // an arch's face: the opening cut out, voussoirs round it, coursed stone above
    vec2 r = vec2((u - 0.5), z - u_arch.x); float rr = length(r); // the opening was cut out by the depth pass (WALL_DEPTH_FS): no discard here, so the early depth test holds
    if (u_arch.y < 0.01) { // a flat lintel: one long block over the way through
      if (z < u_arch.x + u_arch.z) { mortar = aline(z - u_arch.x - u_arch.z, 0.012) + aline(u - 0.02, 0.012) + aline(u - 0.98, 0.012); h = 1.0 - clamp(mortar, 0.0, 1.0); id = vec2(3.0, 7.0); c *= 0.9; }
      else h = ashlar(q, u_stoneP.x, u_stoneP.y, u_stoneP.z, u_stoneP.w, id, mortar); }
    else if (rr < u_arch.y + u_arch.z) { float ang = atan(r.y, r.x), seg = ang / 3.14159 * 9.0, sj = abs(fract(seg) - 0.5); id = vec2(floor(seg), 9.0);
      mortar = max(1.0 - smoothstep(0.03, 0.06, sj * 0.35), aline(rr - u_arch.y - u_arch.z, 0.01)); h = (1.0 - mortar) * smoothstep(0.0, 0.03, min(rr - u_arch.y, u_arch.y + u_arch.z - rr)); c *= 1.12; }
    else h = ashlar(q, u_stoneP.x, u_stoneP.y, u_stoneP.z, u_stoneP.w, id, mortar);
    c *= 0.78 + 0.35 * hash12(id); c = mix(c, u_mortar, mortar * 0.85);
  } else if (part > 4.5 && part < 5.5) { float seg = u * 9.0, sj = abs(fract(seg) - 0.5); mortar = 1.0 - smoothstep(0.42, 0.47, sj); id = vec2(floor(seg), 2.0); c *= (0.6 + 0.3 * hash12(id)); c = mix(c, u_mortar, mortar); h = 1.0 - mortar;
  } else if (part > 5.5 && part < 6.5) { c = vec3(0.09, 0.085, 0.08) * (0.8 + 0.4 * vnoise(q * 20.0)); shin = 30.0; wet = 0.6; h = 1.0;
  } else if (part > 6.5 && part < 7.5) { float bands = aline(fract(z * 4.0) - 0.5, 0.05); c *= (0.8 + 0.3 * vnoise(q * 9.0 + v_meta.w)) * (1.0 - 0.3 * bands); h = 1.0 - bands * 0.5;
  } else if (part > 7.5 && part < 8.5) { c = vec3(0.72, 0.66, 0.52) * (0.85 + 0.2 * vnoise(q * 30.0)); emit = vec3(0.25, 0.14, 0.05) * smoothstep(top - 0.06, top, z);
  } else if (part > 8.5) { float grain = vnoise(vec2(along * 3.0, z * 40.0)); c = vec3(0.2, 0.13, 0.08) * (0.7 + 0.4 * grain); float lid = aline(min(u, 1.0 - u) - 0.08, 0.012) + aline(min(z, top - z) - 0.1, 0.012); c *= 1.0 - 0.5 * clamp(lid, 0.0, 1.0); h = 1.0 - lid;
  } else if (part > 0.5 && part < 1.5) { c *= 1.1 * (0.7 + 0.4 * vnoise(v_world.xy * 7.0)); h = vnoise(v_world.xy * 9.0);
  } else if (mat > 4.5) { // a door out at the floor's edge: a dark way through, with a frame
    float fr = aline(min(u, 1.0 - u), 0.06) + aline(z - top + 0.06, 0.05); c = mix(c * 0.25, c * 1.8, clamp(fr, 0.0, 1.0));
  } else if (mat < 0.5 || part > 1.5) { // stone: coursed blocks (pilasters and trim in smaller courses)
    float ch = part > 2.5 ? u_stoneP.x * 0.55 : part > 1.5 ? u_stoneP.x * 1.3 : u_stoneP.x, bl = part > 1.5 ? u_stoneP.y * 0.7 : u_stoneP.y;
    if (abs(N0.z) > 0.5) { h = 0.9 + 0.1 * vnoise(v_world.xy * 9.0); id = floor(v_world.xy * 2.0); mortar = 0.0; } // a plinth's top, a cornice's underside: one dressed stone
    else h = ashlar(part > 1.5 && part < 2.5 ? vec2(u * 0.34, z) : q, ch, bl, u_stoneP.z, u_stoneP.w, id, mortar);
    c *= (0.76 + 0.4 * hash12(id)) * (u_finish.z > 0.5 ? 0.86 + 0.22 * vnoise(q * 2.5 + id) : 1.0); c = mix(c, u_mortar, mortar);
    if (u_finish.z > 0.5) c *= 1.0 - 0.3 * smoothstep(0.55, 0.9, vnoise(vec2(along * 2.3, z * 0.45 + v_meta.w))) - 0.2 * smoothstep(1.6, 2.4, z) * vnoise(vec2(along * 1.7, 3.0)); // grime running down, soot up high
    if (part > 2.5) { c *= 0.85; h = mix(h, 1.0, 0.5) + aline(z - top + 0.02, 0.01) * 0.6; }
  } else if (mat < 1.5) { // packed dirt between timber posts, roots hanging from above
    float n = fbm(q * vec2(2.6, 3.0)), n2 = vnoise(q * 11.0); c = vec3(0.22, 0.16, 0.1) * (0.55 + 0.6 * n) * (0.85 + 0.3 * n2); h = n * 0.8 + n2 * 0.3;
    vec3 st = cells(q * vec2(3.2, 3.6)); float stone = (1.0 - smoothstep(0.24, 0.3, st.x)) * step(0.62, st.z); // stones packed into the earth
    c = mix(c, vec3(0.3, 0.28, 0.25) * (0.7 + 0.5 * st.z), stone); h = mix(h, 1.0 + (0.3 - st.x), stone);
    if (z < 0.62) { vec2 fid; float fm; float fh = ashlar(q * 1.6, 0.24, 0.5, 0.03, 1.0, fid, fm); c = mix(vec3(0.27, 0.25, 0.22) * (0.7 + 0.4 * hash12(fid)), vec3(0.06, 0.05, 0.04), fm); h = fh; } // a footing of rough stones
    float post = 1.0 - smoothstep(0.07, 0.09 + fwidth(along), abs(fract(along / 1.5) - 0.5) * 1.5); if (post > 0.0) { float gr = vnoise(vec2(along * 30.0, z * 2.0)); c = mix(c, vec3(0.17, 0.11, 0.06) * (0.7 + 0.4 * gr), post); h = mix(h, 1.2, post); }
    float strata = aline(fract(z * 2.3 + n * 0.4) - 0.5, 0.04); c *= 1.0 - 0.25 * strata;
  } else if (mat < 2.5) { // chitin: ribs rising up the wall, resin between, wet, faint light in the seams
    float w = along / 0.42 + sin(z * 1.9 + along * 0.7) * 0.18, rb = abs(fract(w) - 0.5); float rib = 1.0 - smoothstep(0.12, 0.26, rb);
    vec3 v = vec3(0.0); float seam = 0.0; v.x = vnoise(q * 6.0); seam = aline(vnoise(q * vec2(3.0, 1.2)) - 0.5, 0.015);
    c = mix(vec3(0.1, 0.06, 0.07) * (0.7 + 0.6 * v.x), vec3(0.24, 0.17, 0.15) * (0.85 + 0.3 * vnoise(q * 11.0)), rib); h = rib * (1.0 - rb) + v.x * 0.2;
    float segs = aline(fract(z * 1.6 + floor(w) * 0.37) - 0.5, 0.03) * rib; c *= 1.0 - 0.5 * segs; shin = 36.0; wet = 0.7 - rib * 0.3;
    emit = u_glowRGB * seam * (1.0 - rib) * 0.1 * (0.6 + 0.4 * vnoise(q * 0.7 + u_time * 0.00015));
  } else if (mat < 3.5) { // panels of an old machine: deep seams, bolts, a conduit band, rust running down
    vec2 t = vec2(along * 2.0, z * 1.6); vec2 tf = abs(fract(t) - 0.5); float g = smoothstep(0.44, 0.48, max(tf.x, tf.y)); id = floor(t);
    float bolt = 1.0 - smoothstep(0.03, 0.05, length(tf - 0.38)); float conduit = 1.0 - smoothstep(0.05, 0.07, abs(z - 1.95));
    float rust = smoothstep(0.55, 0.8, vnoise(vec2(along * 6.0, z * 0.8 + hash12(id) * 4.0))) * smoothstep(top, 0.3, z);
    c = c * (0.7 + 0.35 * hash12(id)); c = mix(c, vec3(0.04), g); c = mix(c, vec3(0.3, 0.28, 0.24), bolt * 0.6); c = mix(c, vec3(0.13, 0.12, 0.1), conduit); c = mix(c, vec3(0.2, 0.1, 0.05), rust * 0.6);
    h = 1.0 - g + conduit * 0.6 + bolt * 0.3; shin = 18.0; wet = 0.3;
    float lamp = (1.0 - smoothstep(0.015, 0.03, length(vec2(fract(along * 0.5) - 0.5, z - 1.95)))) * step(0.6, hash12(floor(vec2(along * 0.5, 3.0)))); emit += vec3(0.5, 0.25, 0.08) * lamp * 0.6;
  } else { float n = fbm(q * 6.0); c = vec3(0.08, 0.15, 0.07) * (0.6 + 0.7 * n); h = n; }
  // decorations on a wall face (chosen once a face, close-view.ts)
  if (part < 0.5 && deco > 0.5) {
    if (deco < 1.5 || (deco > 1.5 && deco < 2.5)) { // a banner (narrow, pointed) or a tapestry (wide)
      bool tap = deco > 1.5; float x0 = tap ? 0.08 : 0.3, x1 = tap ? 0.92 : 0.7, zt = tap ? 2.05 : 2.15, zb = tap ? 0.6 : 0.75, tip = tap ? 0.0 : 0.16;
      float cu = (u - x0) / (x1 - x0), bot = zb + tip * (1.0 - abs(cu - 0.5) * 2.0);
      if (cu > 0.0 && cu < 1.0 && z < zt && z > bot) { float fold = 0.78 + 0.22 * sin(cu * (tap ? 40.0 : 18.0)); float edge = min(min(cu, 1.0 - cu) * (x1 - x0), min(zt - z, z - bot));
        vec3 cl = u_deco1 * fold * (0.8 + 0.3 * vnoise(vec2(u * 50.0, z * 50.0)));
        cl = mix(cl, u_deco2 * fold, aline(edge - 0.05, 0.015));
        vec2 m = vec2((cu - 0.5) * (x1 - x0), z - (zt + bot) * 0.5); float sig = aline(length(m) - 0.13, 0.014) + aline(m.x, 0.012) * step(abs(m.y), 0.2) + (tap ? aline(abs(m.x) + abs(m.y) - 0.3, 0.012) : 0.0);
        cl = mix(cl, u_deco2 * fold * 0.9, clamp(sig, 0.0, 1.0));
        float rot = smoothstep(0.6, 0.9, vnoise(vec2(u * 9.0, z * 4.0))) * step(z, bot + 0.3); if (rot < 0.5) { c = cl; h = 0.8 + 0.2 * fold; shin = 0.0; wet = 0.0; } } }
    else if (deco < 3.5) { float d = abs(u - 0.5); if (z > 1.0 && z < 1.9) { float slit = 1.0 - smoothstep(0.03, 0.035 + fwidth(u), d); float frame = 1.0 - smoothstep(0.03, 0.09, d);
        c = mix(c, c * 0.55, frame); c = mix(c, vec3(0.01), slit); emit += vec3(0.22, 0.27, 0.34) * slit * 0.6 * smoothstep(1.0, 1.4, z) * smoothstep(1.9, 1.6, z); h = mix(h, 0.0, slit); } }
    else if (deco < 4.5) { for (int i = 0; i < 3; i++) { float fi = float(i), x = 0.2 + 0.3 * fi + 0.08 * sin(z * 3.0 + fi * 2.0 + v_meta.w), len = 0.9 + 0.5 * hash12(vec2(fi, v_meta.w));
        float root = aline(u - x, 0.018 + 0.012 * (z - (top - len)) / len) * step(top - len, z); c = mix(c, vec3(0.1, 0.07, 0.04), root); h = max(h, root * 1.3); } }
    else if (deco > 5.5 && deco < 6.5) { vec2 r = vec2(u - 0.5, z - 1.05); float inside = step(abs(r.x), 0.22) * step(0.4, z) * step(z, 1.05) + step(length(r), 0.22) * step(1.05, z);
      if (inside > 0.5) { c = vec3(0.03, 0.025, 0.02); h = -1.0; float skull = 1.0 - smoothstep(0.05, 0.065, length(vec2(r.x, z - 0.52))); c = mix(c, vec3(0.42, 0.39, 0.32), skull); } }
    else if (deco > 6.5 && deco < 7.5) { for (int i = 0; i < 4; i++) { float fi = float(i); vec2 cpos = vec2(0.25 + 0.17 * fi, 0.4 + 0.5 * hash12(vec2(fi, v_meta.w))), r = vec2(u, z) - cpos; float rad = 0.07 + 0.04 * hash12(vec2(v_meta.w, fi));
        float pod = 1.0 - smoothstep(rad - 0.01, rad, length(r)); c = mix(c, vec3(0.1, 0.14, 0.12), pod); emit += u_glowRGB * pod * (0.55 + 0.45 * smoothstep(rad, 0.0, length(r))); h = max(h, pod * 1.4); } }
    else if (deco > 7.5) { if (z > 0.3 && z < 0.9 && u > 0.25 && u < 0.75) { float slat = aline(fract(z * 14.0) - 0.5, 0.2); c = mix(vec3(0.03), c * 0.6, slat); h = slat; } }
  }
  // damp: the foot of the wall darker and wetter, a tide line
  if (part < 3.5 && mat < 3.5) { float dz = u_wallP.x * (0.7 + 0.6 * vnoise(vec2(along * 1.3, 3.0))); float damp = (1.0 - smoothstep(dz * 0.6, dz, z)) * u_wallP.y;
    c = mix(c, c * u_damp, damp); wet = max(wet, damp * 0.8); c *= 1.0 - 0.2 * aline(z - dz, 0.012) * u_wallP.y; }
  // the grit (version 3's wear, painted once into an atlas)
  float gv = floor(v_meta.y / 4.0);
  if (u_detail.x > 0.5 && part < 0.5 && gv > 0.5 && v_depth < u_detail.z && mat < 5.5) { // (a starship's panels stay clean)
    float inst = mod(floor(v_meta.y / 2.0), 2.0), flip = mod(v_meta.y, 2.0), uu = flip > 0.5 ? 1.0 - u : u;
    vec4 t = texture(u_grit, vec2(((gv * 2.0 + inst) + uu) * u_shimmer.w, 1.0 - z / max(top, 0.01)));
    float fade = 1.0 - clamp((v_depth - u_detail.y) / (u_detail.z - u_detail.y), 0.0, 1.0);
    float ga = u_gritA[int(gv)] * fade * 0.55;
    if (gv > 7.5) ga *= 1.0 - u_shimmer.x * (u_shimmer.z > 0.5 ? 0.5 : 0.5 + 0.5 * sin(u_time / u_shimmer.y * 6.2832 + v_meta.w * 0.37));
    c = c * (1.0 - t.a * ga) + t.rgb * ga * 0.6;
  }
  // corners: soft occlusion up an inside corner, the dark at the foot
  if (part < 0.5) { float bits = v_meta.z, ab = floor(bits / 4.0);
    if (mod(ab, 2.0) > 0.5) c *= 1.0 - 0.55 * (1.0 - smoothstep(0.0, 0.35, u)); if (ab > 1.5) c *= 1.0 - 0.55 * (1.0 - smoothstep(0.0, 0.35, 1.0 - u)); }
  c *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, 0.12, z));
  vec3 N = u_wallP.z > 0.5 && (mat < 4.5 || mat > 6.5) ? bump(N0, v_world, h * 0.022) : N0;
  vec3 dif, spe; lightsAt(v_world, N, shin > 0.0 ? shin : (wet > 0.05 ? 20.0 : 0.0), dif, spe);
  vec3 col = c * dif + spe * max(wet, shin > 0.0 ? 0.5 : 0.0) * 0.4 + emit;
  col *= mix(1.0, u_wallP.w, smoothstep(1.2, 2.4, z)); // high up the wall it falls into the dark
  outColor = vec4(finish(atmos(col, v_world, v_depth, dif)), 1.0);
}`;

// The walls' depth pass: depth only (an arch's opening cut out), so the shading pass shades each wall pixel once (depth EQUAL),
// whatever order the static buffer draws in.
const WALL_DEPTH_FS = `#version 300 es
precision highp float;
in vec4 v_tex; in vec4 v_nrm; uniform vec4 u_arch; out vec4 outColor;
void main() { if (v_nrm.z > 3.5 && v_nrm.z < 4.5 && (v_tex.z < u_arch.x || length(vec2(v_tex.y - 0.5, v_tex.z - u_arch.x)) < u_arch.y)) discard; outColor = vec4(0.0); }`;

// ---------------------------------------------------------------------------------------------- creatures: camera-facing cards from the sprite atlas
// a_meta: opacity, hit flash, silhouette (0 none; up to 1 a creature's; 1 + a the Wayfarer's), light at its feet
const BOARD_VS = VS_COMMON + `
in vec3 a_pos; in vec2 a_uv; in vec4 a_meta; uniform float u_pass; out vec2 v_uv; out vec4 v_meta; out float v_depth;
void main() { float d; gl_Position = project(a_pos, d); v_depth = d; v_uv = a_uv; v_meta = a_meta; if (u_pass > 0.5 && a_meta.z <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }`;
const BOARD_FS = `#version 300 es
precision highp float;
uniform sampler2D u_ground; uniform float u_pass; uniform vec2 u_dev; uniform vec4 u_grade; uniform vec4 u_finish; uniform vec3 u_fog; uniform vec4 u_fogP; uniform vec3 u_sil; uniform vec3 u_silFoe;
in vec2 v_uv; in vec4 v_meta; in float v_depth; out vec4 outColor;
void main() { vec4 c = textureLod(u_ground, v_uv, 0.0);
  if (u_pass > 0.5) { // through a wall: a crisp silhouette, never a faded copy
    if (c.a < 0.5) discard; bool me = v_meta.z > 1.0; float a = me ? v_meta.z - 1.0 : v_meta.z; vec2 e = vec2(dFdx(c.a), dFdy(c.a)); float rim = clamp(length(e) * 4.0, 0.0, 1.0);
    vec3 s = me ? u_sil : u_silFoe; float k = me ? 0.55 + 0.45 * rim : 0.25 + 0.75 * rim; outColor = vec4(s * a * k, a * k); return; } // a creature: mostly its outline
  float a = v_meta.x; float l = v_meta.w; c.rgb *= l; c.rgb += c.rgb * v_meta.y * 2.0;
  float f = clamp((v_depth - u_fogP.x) / (u_fogP.y - u_fogP.x), 0.0, 1.0); c.rgb = mix(c.rgb, u_fog * c.a, f * f);
  c.rgb = max(c.rgb, 0.0); c.rgb = c.rgb / (1.0 + c.rgb * 0.22); c.rgb = pow(c.rgb, vec3(u_grade.w)) * u_grade.rgb;
  vec2 q = gl_FragCoord.xy / u_dev - 0.5; c.rgb *= 1.0 - u_finish.x * smoothstep(0.28, 0.86, length(q * vec2(1.0, 1.12)));
  c *= a; if (c.a < 0.004) discard; outColor = c; }`;

// Native models share the environment's camera, lights and fog.
// Solid creatures (Tim, 2026-11-11: "firm and concrete, so they come into view easily"): a body takes the fog `fogLate` tiles
// later than the walls behind it (still wholly fogged at the far end), so a creature a few tiles off stands out from the
// stone instead of sinking into it. A body drawn below full opacity (a spectral kind, or a designed phase or departure;
// close-view.ts closeViewCreatureIntrinsicAlpha) is screen-door dithered as before and also takes a cold rim light
// (`spectralRim`, up to `spectralGlow` at `ghostFull` of the way to transparent) so a ghost still reads at a glance.
// Materials (the refinement pass): `floor` is the least light a body takes (it was .28: a creature beyond the torch sank into
// the dark); `rimWarm` is the old warm edge (times rim squared) and `rimCool` a cool back-edge (times rim cubed) that cuts every
// silhouette out of a dark room; `emissive` lists the authored colours that are lit from within (embers, lantern glass, eyes,
// sparks, rift seams): such a part takes `glow` of its own colour whatever the light, and only `emitFog` of the fog, so a
// creature's eyes and embers are what you see first in the dark. Exact colours only (a part's colour, not a guess at it).
export const CLOSE_VIEW_ACTOR_LOOK = Object.freeze({ fogLate: 2, spectralRim: Object.freeze([.45, .66, .92]), spectralGlow: .7, ghostFull: .4,
  floor: .34, rimWarm: Object.freeze([.19, .15, .11]), rimCool: Object.freeze([.17, .2, .27]), glow: .85, emitFog: .55,
  emissive: Object.freeze([0xf3a55c /* ember: Ashling cracks, the Wayfarer's lamp */, 0xefb15d /* Cinder Wisp core */, 0xd1e86a /* Hanged Choir lamps */,
    0x9dff8a /* Grave Lantern glass */, 0xffc35a /* Cinder Seraph fire */, 0x7fe7ff /* Lumen Wraith light */, 0xff6b8a /* Veil Spinner eyes */,
    0xc58cff /* Rift Lynx seams */, 0xffd25a /* Thunderhorn charge */, 0xff9d4a /* Siege Beetle furnace */, 0x5aa6ff /* Gloomwisp eyes */,
    0x6ab4ff /* Gloomgorge maw */, 0xd88f80 /* Pallid Crawler eyes */, 0xc18a63 /* Ashen Hound eyes */,
    0xc09b58 /* Spark Warden bars and staff */, 0xb896cf /* Void Sentinel eye */, 0xaab7aa /* Glass Mite mandibles */]) });
const glc = (c) => `vec3(${glf((c >> 16) / 255)}, ${glf(((c >> 8) & 255) / 255)}, ${glf((c & 255) / 255)})`;
const glf = (v) => Number(v).toFixed(4);
const MODEL_VS = VS_COMMON + `
in vec3 a_pos; in vec3 a_nrm; in vec3 a_col; in float a_alpha;
out vec3 v_pos; out vec3 v_nrm; out vec3 v_col; out float v_depth; out float v_alpha;
void main() {
  float d;
  gl_Position = project(a_pos, d);
  v_pos = a_pos; v_nrm = a_nrm; v_col = a_col; v_depth = d; v_alpha = a_alpha;
}`;
const MODEL_FS = FS_COMMON + `
in vec3 v_pos; in vec3 v_nrm; in vec3 v_col; in float v_depth; in float v_alpha;
uniform float u_pass; uniform vec3 u_sil;
void main() {
  if (v_pos.z < 0.0) discard;
  // Identical, time-independent coverage in the silhouette and depth-writing body passes.
  // Alpha remains a separate float; a packed 32-bit RGBA integer would lose precision.
  const float bayer[16] = float[16](0.0,8.0,2.0,10.0,12.0,4.0,14.0,6.0,3.0,11.0,1.0,9.0,15.0,7.0,13.0,5.0);
  ivec2 pixel = ivec2(gl_FragCoord.xy) & ivec2(3);
  if (v_alpha <= (bayer[pixel.y * 4 + pixel.x] + 0.5) / 16.0) discard;
  if (u_pass > 0.5) { outColor = vec4(u_sil * 0.1, 0.1); return; }
  vec3 normal = normalize(v_nrm), toEye = normalize(u_eye - v_pos);
  vec3 dif, spe;
  lightsAt(v_pos, normal, 14.0, dif, spe);
  float rim = 1.0 - max(0.0, dot(normal, toEye));
  const vec3 EMIT[${CLOSE_VIEW_ACTOR_LOOK.emissive.length}] = vec3[](${CLOSE_VIEW_ACTOR_LOOK.emissive.map(glc).join(', ')});
  float emit = 0.0; for (int i = 0; i < ${CLOSE_VIEW_ACTOR_LOOK.emissive.length}; i++) { vec3 e = abs(v_col - EMIT[i]); if (e.r + e.g + e.b < 0.012) emit = 1.0; }
  vec3 color = v_col * max(dif, vec3(${glf(CLOSE_VIEW_ACTOR_LOOK.floor)})) + spe * 0.25 + vec3(${CLOSE_VIEW_ACTOR_LOOK.rimWarm.map(glf).join(', ')}) * rim * rim
    + vec3(${CLOSE_VIEW_ACTOR_LOOK.rimCool.map(glf).join(', ')}) * rim * rim * rim;
  color = mix(color, max(color, v_col * ${glf(CLOSE_VIEW_ACTOR_LOOK.glow)}), emit);
  float ghost = clamp((1.0 - v_alpha) / ${glf(CLOSE_VIEW_ACTOR_LOOK.ghostFull)}, 0.0, 1.0);
  color += (v_col * 0.5 + vec3(${CLOSE_VIEW_ACTOR_LOOK.spectralRim.map(glf).join(', ')})) * (0.18 + rim * rim) * ghost * ${glf(CLOSE_VIEW_ACTOR_LOOK.spectralGlow)};
  float late = u_fogP.x + ${glf(CLOSE_VIEW_ACTOR_LOOK.fogLate)}, f = clamp((v_depth - late) / max(u_fogP.y - late, 0.001), 0.0, 1.0); f = f * f * (3.0 - 2.0 * f);
  float hz = u_finish.z > 0.5 ? (1.0 - exp(-v_depth * u_fogP.z)) * exp(-max(v_pos.z, 0.0) / u_fogP.w) : 0.0;
  color = mix(color, u_haze + dif * u_finish.y, clamp(hz, 0.0, 0.8));
  outColor = vec4(finish(mix(color, u_fog, f * (1.0 - emit * (1.0 - ${glf(CLOSE_VIEW_ACTOR_LOOK.emitFog)})))), 1.0);
}`;

// ---------------------------------------------------------------------------------------------- the open world's heightfield
// The overworld's relief (close-view-outdoor.ts outdoorTerrainMesh): each tile's top at its level, shaded exactly as the
// environment shades the open ground (the ordinary art near, the per-tile colour beyond, water, detail), and the faces down
// every level's edge as earth and rock with strata, a pit's walls and floor darkening with depth. a_mat: the face's kind (0
// top, 1 cliff, a branch's edge, underside or limb, 2 a pit's wall, 3 a pit's floor, 5 the ground in a great tree's shade). Drawn opaque with depth before the environment, which then shades only the
// sky and what lies beyond the section.
const TERRAIN_VS = VS_COMMON + `
in vec3 a_pos; in vec3 a_nrm; in vec3 a_col; in float a_mat;
out vec3 v_pos; out vec3 v_nrm; out vec3 v_col; out float v_kind; out float v_depth;
void main() { float d; gl_Position = project(a_pos, d); v_pos = a_pos; v_nrm = a_nrm; v_col = a_col; v_kind = a_mat; v_depth = d; }`;
const TERRAIN_FS = ENV_FS.slice(0, ENV_FS.lastIndexOf("void main() {")) + `
in vec3 v_pos; in vec3 v_nrm; in vec3 v_col; in float v_kind; in float v_depth;
void main() {
  vec3 dir = v_pos - vec3(u_cam, u_hc);
  if (v_kind < 0.5) { outColor = vec4(finish(outdoorGround(v_pos.xy, dir, v_depth, overlayAt(v_pos.xy), v_pos.z)), 1.0); return; }
  if (v_kind > 4.5) { vec3 dif0, spe0; lightsAt(v_pos, vec3(0.0, 0.0, 1.0), 0.0, dif0, spe0); outColor = vec4(finish(atmos(v_col * (0.85 + 0.3 * vnoise(v_pos.xy * 2.0)) * dif0, v_pos, v_depth, dif0)), 1.0); return; } // the ground in a great tree's shade
  vec3 N = normalize(v_nrm); vec2 q = vec2(dot(v_pos.xy, vec2(-N.y, N.x)), v_pos.z);
  float n = fbm(q * vec2(1.7, 2.6)), strata = aline(fract(v_pos.z * 2.3 + n * 0.55) - 0.5, 0.07);
  vec3 c = v_col * (0.5 + 0.38 * n) * (1.0 - 0.22 * strata) + vec3(0.02, 0.018, 0.015);
  if (v_kind > 2.5 && v_kind < 3.5) c = mix(v_col * 0.18, vec3(0.015, 0.016, 0.022), 0.7); // a pit's floor, lost in the dark
  float below = max(0.0, -v_pos.z), fall = exp(-below * 0.75); // a pit's walls: lit stone at the lip, lost in the dark as they go down
  vec3 Nb = u_finish.z > 0.5 ? bump(N, v_pos, (n - strata * 0.4) * 0.05) : N; vec3 dif, spe; lightsAt(v_pos, Nb, 0.0, dif, spe);
  vec3 col = v_kind > 1.5 && v_kind < 3.5 ? c * (dif * 0.55 + u_amb * 0.6 + 0.12) * fall * (0.75 + 0.25 * smoothstep(-0.25, 0.0, v_pos.z)) : c * dif;
  outColor = vec4(finish(atmos(col, v_pos, v_depth, dif)), 1.0);
}`;

// ---------------------------------------------------------------------------------------------- the open world's solids
// Outcrops and standing trees outdoors (close-view-outdoor.ts outdoorMesh): one static buffer a section, drawn opaque before
// the environment so the ground is never shaded under them. a_mat: 0 rock, 1 masonry, 2 ice and crystal, 3 glass and
// obsidian, 4 foliage, 5 bark and wood, 6 vitrified rubble; the props (version 2): 7 painted or oiled wood and cloth,
// 8 metal fittings, 9 a lit ring or band (its own light, a little of the scene's).
const PROP_VS = VS_COMMON + `
in vec3 a_pos; in vec3 a_nrm; in vec3 a_col; in float a_mat;
out vec3 v_pos; out vec3 v_nrm; out vec3 v_col; out float v_mat; out float v_depth;
void main() { float d; gl_Position = project(a_pos, d); v_pos = a_pos; v_nrm = a_nrm; v_col = a_col; v_mat = a_mat; v_depth = d; }`;
const PROP_FS = FS_COMMON + `
in vec3 v_pos; in vec3 v_nrm; in vec3 v_col; in float v_mat; in float v_depth;
void main() {
  vec3 N = normalize(v_nrm), c = v_col; float h = 0.5, shin = 0.0, m = v_mat; bool level = abs(N.z) > 0.6;
  vec2 q = level ? v_pos.xy : vec2(dot(v_pos.xy, vec2(-N.y, N.x)), v_pos.z);
  if (m > 6.5) { // the props' own: painted wood (grain across), metal (bright, sharp highlight), a lit ring (glows)
    if (m < 7.5) { float g = vnoise(vec2(q.x * 22.0, q.y * 2.2)); c *= 0.8 + 0.3 * g; h = g * 0.6; shin = 10.0; }
    else if (m < 8.5) { float g = vnoise(q * 9.0); c *= 0.85 + 0.25 * g; h = g * 0.3; shin = 70.0; }
    else { vec3 dif0, spe0; lightsAt(v_pos, N, 0.0, dif0, spe0); float pulse = 0.85 + 0.15 * sin(u_time * 0.003 + v_pos.x * 3.0 + v_pos.y * 2.0);
      outColor = vec4(finish(atmos(c * (0.9 * pulse + 0.25 * dif0) + c * c * 0.35, v_pos, v_depth, dif0)), 1.0); return; }
  } else if (m < 0.5 || m > 5.5) { // rock and rubble: grain, plates and cracks, strata on the sides; rubble of the waste has a glassy sheen
    float n = fbm(q * 2.4); vec3 k = cells(q * vec2(2.0, 3.0)); float crack = 1.0 - smoothstep(0.015, 0.06, k.y), strata = level ? 0.0 : aline(fract(v_pos.z * 2.6 + n * 0.5) - 0.5, 0.06);
    c *= (0.7 + 0.5 * n) * (0.85 + 0.25 * k.z) * (1.0 - 0.35 * crack) * (1.0 - 0.18 * strata); h = n - crack * 0.5; if (m > 5.5) shin = 18.0;
  } else if (m < 1.5) { vec2 id; float mortar; h = ashlar(q, 0.34, 0.66, 0.04, 0.45, id, mortar); c *= (0.78 + 0.32 * hash12(id)) * (0.85 + 0.25 * vnoise(q * 7.0 + id)); c = mix(c, c * 0.42, mortar);
  } else if (m < 2.5) { float n = vnoise(q * vec2(3.0, 0.8)); c *= 0.85 + 0.25 * n; c += vec3(0.08, 0.1, 0.12) * pow(1.0 - abs(dot(N, normalize(u_eye - v_pos))), 2.0); h = n; shin = 48.0;
  } else if (m < 3.5) { float n = vnoise(q * 5.0); c *= 0.8 + 0.3 * n; h = n; shin = 64.0;
  } else if (m < 4.5) { vec3 k = cells(v_pos.xy * 4.2 + vec2(v_pos.z * 3.1, -v_pos.z * 2.3)); float leaf = smoothstep(0.0, 0.5, k.x); c *= (0.62 + 0.5 * k.z) * (0.75 + 0.35 * leaf); h = leaf * 0.8 + k.z * 0.2;
  } else { float g = vnoise(vec2(q.x * 16.0, q.y * 1.6)); c *= 0.7 + 0.45 * g; h = g; }
  if (u_finish.z > 0.5) N = bump(N, v_pos, h * 0.035);
  vec3 dif, spe; lightsAt(v_pos, N, shin, dif, spe);
  vec3 col = c * dif * (0.55 + 0.45 * smoothstep(0.0, 0.7, v_pos.z)) + spe * (shin > 0.0 ? 0.35 : 0.0); // darker at the foot
  outColor = vec4(finish(atmos(col, v_pos, v_depth, dif)), 1.0);
}`;
// ---------------------------------------------------------------------------------------------- decals, props and glows
// a_loc: -1..1 across the quad; a_meta: kind, alpha, a parameter, light. Kinds, blended: 0 contact shadow, 1 wind-up ring,
// 4 cobweb (a corner triangle), 5 chain, 7 spike (a small metal spike, a card), 8 bones; added in light: 2 wind-up glow,
// 3 flame, 6 dust mote, 9 a flame's halo.
const DECAL_VS = VS_COMMON + `
in vec3 a_pos; in vec2 a_loc; in vec4 a_meta; out vec2 v_loc; out vec4 v_meta; out float v_depth; out vec2 v_world; flat out highp uint v_rgb;
void main() { float d; gl_Position = project(a_pos, d); v_depth = d; v_loc = a_loc; v_meta = a_meta; v_world = a_pos.xy; v_rgb = a_meta.x > 10.5 && a_meta.x < 11.5 ? uint(a_meta.z) : 0u; }`;
const DECAL_FS = `#version 300 es
precision highp float;
precision highp int;
uniform vec3 u_ring; uniform vec3 u_glow; uniform float u_time; uniform vec3 u_fog; uniform vec4 u_fogP; in vec2 v_loc; in vec4 v_meta; in float v_depth; in vec2 v_world; flat in highp uint v_rgb; out vec4 outColor;
uniform highp usampler2D u_mask; uniform ivec2 u_mapSize; uniform vec3 u_hue5; // 2026-11-11: hue 5, the theme's own glow (the Deep's growths)
vec3 hue(float p) { return p < 0.5 ? vec3(1.0, 0.55, 0.22) : p < 1.5 ? vec3(0.3, 0.95, 0.8) : p < 2.5 ? vec3(0.55, 0.72, 1.0) : p < 3.5 ? vec3(1.0, 0.75, 0.35) : p < 4.5 ? vec3(0.62, 0.86, 1.0) : u_hue5; } // warm, bioluminescent, ghost-light, a failing lamp, a starship's light strip
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() { float r = length(v_loc), a, k = v_meta.x, fogK = clamp((v_depth - u_fogP.x) / (u_fogP.y - u_fogP.x), 0.0, 1.0), keep = 1.0 - fogK; vec3 lit = vec3(v_meta.w);
  if (k < 0.5) { a = v_meta.y * (1.0 - smoothstep(0.35, 1.0, r)); outColor = vec4(0.0, 0.0, 0.0, a); return; }
  if (k < 1.5) { float f = max(fwidth(r), 1e-3); a = v_meta.y * (1.0 - smoothstep(v_meta.z - f, v_meta.z + f, abs(r - 1.0 + v_meta.z))); outColor = vec4(u_ring * a, a); return; }
  if (k < 2.5) { a = v_meta.y * pow(max(0.0, 1.0 - r), 1.6); outColor = vec4(u_glow * a, 0.0); return; }
  if (k < 3.5) { // a flame: a teardrop, hot at its root
    vec2 p = v_loc; float w = 0.55 * (1.0 - (p.y + 1.0) * 0.5) + 0.12; float d = length(vec2(p.x / w, (p.y + 0.35) * 0.9)); float fl = 1.0 - smoothstep(0.6, 1.0, d);
    vec3 c = mix(hue(v_meta.z) * vec3(1.0, 0.8, 0.6), vec3(1.0, 0.95, 0.82), smoothstep(0.7, 0.0, d)); a = fl * v_meta.y; outColor = vec4(c * a * keep, 0.0); return; }
  if (k < 4.5) { // a cobweb: strands from the corner and rings across them
    vec2 p = (v_loc + 1.0) * 0.5; float ang = atan(p.y, p.x), rad = length(p); if (p.x + p.y > 1.0) discard;
    float fa = ang / 1.5708 * 6.0, sp = abs(fract(fa) - 0.5), spoke = 1.0 - smoothstep(0.03, 0.03 + 1.5 * fwidth(fa), sp);
    float fr = rad * 7.0 + sin(ang * 6.0) * 0.06, rg = abs(fract(fr) - 0.5), ring = 1.0 - smoothstep(0.035, 0.035 + 1.5 * fwidth(fr), rg);
    a = clamp(spoke + ring * 0.8, 0.0, 1.0) * v_meta.y * (1.0 - smoothstep(0.6, 1.0, p.x + p.y)) * keep; vec3 c = vec3(0.55, 0.55, 0.52) * lit; outColor = vec4(c * a, a); return; }
  if (k < 5.5) { // a chain: oval links, alternately seen face on and edge on
    float y = (v_loc.y + 1.0) * 0.5 * v_meta.z, li = floor(y * 7.0), ly = fract(y * 7.0) - 0.5; float edge = mod(li, 2.0);
    float d = edge > 0.5 ? abs(v_loc.x) * 2.2 : abs(length(vec2(v_loc.x * 1.3, ly * 1.6)) - 0.55); float m = 1.0 - smoothstep(0.18, 0.3, d); if (edge > 0.5) m *= 1.0 - smoothstep(0.42, 0.5, abs(ly));
    a = m * v_meta.y * keep; vec3 c = vec3(0.16, 0.15, 0.14) * lit * (0.7 + 0.6 * (1.0 - abs(v_loc.x))); outColor = vec4(c * a, a); if (a < 0.01) discard; return; }
  if (k < 6.5) { a = v_meta.y * pow(max(0.0, 1.0 - r), 2.0) * keep; outColor = vec4(mix(hue(v_meta.z), vec3(1.0), 0.5) * a, 0.0); return; }
  if (k < 7.5) { // a spike: a narrow cone of iron, lit down one side
    float y = (v_loc.y + 1.0) * 0.5, w = (1.0 - y) * 0.9 + 0.04; if (abs(v_loc.x) > w) discard; float s = 0.5 + 0.5 * (v_loc.x / w);
    vec3 c = mix(vec3(0.12, 0.12, 0.13), vec3(0.62, 0.6, 0.56), s * s) * lit * (0.6 + 0.6 * y); a = v_meta.y; outColor = vec4(mix(c, u_fog, fogK) * a, a); return; }
  if (k < 8.5) { // bones: a scatter of pale shards and a skull's dome
    vec2 p = v_loc; float m = 0.0; for (int i = 0; i < 5; i++) { float fi = float(i); vec2 c0 = vec2(h12(vec2(fi, v_meta.z)) - 0.5, h12(vec2(v_meta.z, fi)) - 0.5) * 1.2; float an = h12(vec2(fi * 3.0, v_meta.z)) * 3.14;
      vec2 q = p - c0; q = vec2(cos(an) * q.x - sin(an) * q.y, sin(an) * q.x + cos(an) * q.y); float bone = 1.0 - smoothstep(0.05, 0.08, length(vec2(max(abs(q.x) - 0.22, 0.0), q.y))); float knob = 1.0 - smoothstep(0.06, 0.09, length(vec2(abs(q.x) - 0.22, abs(q.y) - 0.04))); m = max(m, max(bone, knob)); }
    float skull = 1.0 - smoothstep(0.16, 0.2, length(p - vec2(0.25, -0.2))); m = max(m, skull); float eye = (1.0 - smoothstep(0.03, 0.05, length(p - vec2(0.2, -0.24)))) + (1.0 - smoothstep(0.03, 0.05, length(p - vec2(0.31, -0.24))));
    vec3 c = vec3(0.55, 0.51, 0.42) * lit * (1.0 - 0.8 * clamp(eye, 0.0, 1.0) * skull); a = m * v_meta.y * keep; outColor = vec4(c * a, a); return; }
  if (k > 10.5) {
    ivec2 tile = ivec2(floor(v_world));
    if (any(lessThan(tile, ivec2(0))) || any(greaterThanEqual(tile, u_mapSize)) ||
        (texelFetch(u_mask, tile, 0).r & 2u) != 0u) discard;
    uint rgb = v_rgb;
    vec3 tint = vec3(float(rgb >> 16u), float((rgb >> 8u) & 255u), float(rgb & 255u)) / 255.0;
    float shape = v_meta.w > 0.5 ? (1.0 - abs(v_loc.y)) * smoothstep(-1.0, 1.0, v_loc.x)
      : 1.0 - smoothstep(0.08, 1.0, r);
    outColor = vec4(tint * shape * v_meta.y * keep, 0.0);
    return;
  }
  if (k > 9.5) {
    ivec2 tile = ivec2(floor(v_world));
    if (any(lessThan(tile, ivec2(0))) || any(greaterThanEqual(tile, u_mapSize))) discard;
    uvec4 m = texelFetch(u_mask, tile, 0);
    if ((m.r & 2u) != 0u || (m.a & 1u) != 0u || (m.g != 0u && m.g != 4u)) discard;
    a = v_meta.y * (1.0 - smoothstep(0.32, 1.0, r)) * keep;
    outColor = vec4(0.0, 0.0, 0.0, a);
    return;
  }
  // a flame's halo, added in light
  a = v_meta.y * pow(max(0.0, 1.0 - r), 2.4) * keep; outColor = vec4(hue(v_meta.z) * a, 0.0); }`;

// ---------------------------------------------------------------------------------------------- state
export const closeViewGLStats = { ready: false, failed: false, reason: "", frames: 0, drawCalls: 0, walls: 0, staticVerts: 0, staticBuilds: 0, boards: 0, decals: 0, lights: 0, maskBuilds: 0, uploads: 0, lost: false, models: 0, modelTriangles: 0, props: 0 }; // props: 2026-11-11, CLOSE_VIEW_PROPS models this frame
// Coarse observational history only; never expose driver logs or probe hardware.
const GPU_DIAGNOSTICS={attempted:false,contextLost:false,lastFailure:'none',frameFailure:'none',lastHeroFailure:'none'};
export function closeViewGLDiagnostics(){return {
  state:!GPU_DIAGNOSTICS.attempted?'not-attempted':GPU_DIAGNOSTICS.contextLost?'context-lost':S.gl&&closeViewGLStats.ready?'ready':closeViewGLStats.failed?'unavailable':'not-ready',
  lastFailure:GPU_DIAGNOSTICS.lastFailure,
  heroState:!S.gl||GPU_DIAGNOSTICS.contextLost?'not-prepared':!S.hero?'program-unavailable':S.hero.failed?'upload-failed':S.hero.ready?'ready':'not-prepared',
  lastHeroFailure:GPU_DIAGNOSTICS.lastHeroFailure,
};}
export function noteCloseViewGLFrameAbort(){GPU_DIAGNOSTICS.lastFailure=GPU_DIAGNOSTICS.frameFailure==='none'?'frame-aborted':GPU_DIAGNOSTICS.frameFailure;}
globalThis.__closeViewGL = closeViewGLStats; // read by the browser harness and the lab's console (diagnostics only)
const S = { canvas: null, gl: null, hero: null, beast: null, env: null, wall: null, wallZ: null, board: null, decal: null, model: null, prop: null, vbo: { env: null, wall: null, board: null, decal: null, model: null, prop: null }, vao: { env: null, wall: null, wallZ: null, board: null, decal: null, model: null, prop: null },
  tex: { ground: null, mask: null, grit: null, terrain: null }, outdoorKey: null, outdoorVerts: 0, groundW: 0, groundH: 0, gritReady: false, aniso: null, maskMap: null, maskAt: 0, maskW: 0, maskH: 0, maskData: null, lavaTiles: 0, staticKey: null, staticVerts: 0 };
// The dynamic vertex arrays, grown by doubling (never per frame once warm).
export const WALL_FLOATS = 20, BOARD_FLOATS = 9, DECAL_FLOATS = 9;
export const GLB = { board: new Float32Array(BOARD_FLOATS * 6 * 64), decal: new Float32Array(DECAL_FLOATS * 6 * 160), nBoard: 0, nDecal: 0, nGlowStart: 0 };
export function glEnsure(kind, verts) { const per = kind === "board" ? BOARD_FLOATS : DECAL_FLOATS, need = verts * per; let a = GLB[kind]; if (a.length >= need) return a; let n = a.length; while (n < need) n *= 2; const b = new Float32Array(n); b.set(a); GLB[kind] = b; return b; }

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
  GPU_DIAGNOSTICS.attempted=true;
  if (S.gl) { if (S.gl.isContextLost()) { closeViewGLStats.lost = true; closeViewGLStats.ready = false; closeViewGLStats.failed = true; closeViewGLStats.reason = "context lost"; GPU_DIAGNOSTICS.lastFailure='context-lost';GPU_DIAGNOSTICS.contextLost=true; S.gl = null; return false; } return true; }
  if (closeViewGLStats.failed) return false;
  try {
    if (typeof WebGL2RenderingContext === "undefined") throw new Error("no WebGL2");
    const c = makeCanvas(); const gl = c?.getContext?.("webgl2", { alpha: false, antialias: true, depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: "default" });
    if (!(gl instanceof WebGL2RenderingContext)) throw new Error("no WebGL2 context");
    c.addEventListener?.("webglcontextlost", (e) => { e.preventDefault?.(); closeViewGLStats.lost = true; GPU_DIAGNOSTICS.lastFailure='context-lost';if(S.canvas===c)GPU_DIAGNOSTICS.contextLost=true; });
    c.addEventListener?.("webglcontextrestored", () => { if(S.canvas===c) resetCloseViewGL(); });
    S.env = compile(gl, ENV_VS, ENV_FS); S.wall = compile(gl, WALL_VS, WALL_FS); S.wallZ = compile(gl, WALL_VS, WALL_DEPTH_FS); S.board = compile(gl, BOARD_VS, BOARD_FS); S.decal = compile(gl, DECAL_VS, DECAL_FS);
    S.model = compile(gl, MODEL_VS, MODEL_FS);
    // The optional hero program may fail without taking the ordinary renderer down.
    try { S.hero = createHeroGL(gl, compile, VS_COMMON, FS_COMMON); } catch { S.hero = null; GPU_DIAGNOSTICS.lastHeroFailure='program-unavailable'; }
    try { S.beast = createBeastGL(gl, compile, VS_COMMON, FS_COMMON, CLOSE_VIEW_ACTOR_LOOK); } catch { S.beast = null; } // optional too: beasts keep their billboards without it
    for (const k of ["env", "wall", "board", "decal", "model"]) S.vbo[k] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo.env); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    S.vao.env = layout(gl, S.env, S.vbo.env, 2, [["a_pos", 2]]);
    S.vao.wall = layout(gl, S.wall, S.vbo.wall, WALL_FLOATS, [["a_pos", 3], ["a_tex", 4], ["a_nrm", 4], ["a_col", 3], ["a_meta", 4], ["a_tile", 2]]); S.vao.wallZ = layout(gl, S.wallZ, S.vbo.wall, WALL_FLOATS, [["a_pos", 3], ["a_tex", 4], ["a_nrm", 4], ["a_col", 3], ["a_meta", 4], ["a_tile", 2]]);
    S.vao.board = layout(gl, S.board, S.vbo.board, BOARD_FLOATS, [["a_pos", 3], ["a_uv", 2], ["a_meta", 4]]);
    S.vao.decal = layout(gl, S.decal, S.vbo.decal, DECAL_FLOATS, [["a_pos", 3], ["a_loc", 2], ["a_meta", 4]]);
    S.vao.model = layout(gl, S.model, S.vbo.model, MODEL_FLOATS, [["a_pos", 3], ["a_nrm", 3], ["a_col", 3], ["a_alpha", 1]]);
    for (const k of ["ground", "mask", "grit"]) S.tex[k] = gl.createTexture();
    // The open world's solids are optional too (made after the critical resources): without them the overworld keeps its flat ground.
    try { S.prop = compile(gl, PROP_VS, PROP_FS); S.vbo.prop = gl.createBuffer(); S.vao.prop = layout(gl, S.prop, S.vbo.prop, 10, [["a_pos", 3], ["a_nrm", 3], ["a_col", 3], ["a_mat", 1]]); S.tex.terrain = gl.createTexture(); } catch { S.prop = null; S.vbo.prop = S.vao.prop = S.tex.terrain = null; }
    // the overworld's heightfield (optional again: without it the open ground stays the flat plane and nothing is lifted)
    try { if (!S.prop) throw new Error("no solids"); S.terr = compile(gl, TERRAIN_VS, TERRAIN_FS); S.vbo.terr = gl.createBuffer(); S.vao.terr = layout(gl, S.terr, S.vbo.terr, 10, [["a_pos", 3], ["a_nrm", 3], ["a_col", 3], ["a_mat", 1]]); } catch { S.terr = null; S.vbo.terr = null; S.vao.terr = null; }
    S.outdoorKey = null; S.outdoorVerts = 0; S.terrKey = null; S.terrVerts = 0;
    S.aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    S.canvas = c; S.gl = gl; S.staticKey = null; closeViewGLStats.ready = true;GPU_DIAGNOSTICS.contextLost=false; return true;
  } catch (err) { const message=String(err?.message||err);GPU_DIAGNOSTICS.lastFailure=message==='no WebGL2'?'no-webgl2':message==='no WebGL2 context'?'no-context':'initialization-failed';closeViewGLStats.failed = true; closeViewGLStats.reason = message.slice(0, 400); S.gl = null; return false; }
}
// Critical resources for a frame that will suppress ordinary floor bodies. Optional uniforms may be
// optimized out; programs, buffers, vertex arrays and textures may not. This check is deliberately
// free of GPU commands beyond the existing context-loss check; coarse diagnostic
// recording does not change admission before the ordinary renderer captures the floor.
export function closeViewGLFrameReady() {
  GPU_DIAGNOSTICS.frameFailure='none';
  const gl = S.gl;
  if (!gl || gl.isContextLost?.()) {GPU_DIAGNOSTICS.frameFailure=gl?'context-lost':'frame-unavailable';return false;}
  for (const k of ["env", "wall", "wallZ", "board", "decal", "model"]) if (!S[k]?.p) {GPU_DIAGNOSTICS.frameFailure='frame-resources';return false;}
  for (const k of ["env", "wall", "board", "decal", "model"]) if (!S.vbo[k]) {GPU_DIAGNOSTICS.frameFailure='frame-resources';return false;}
  for (const k of ["env", "wall", "wallZ", "board", "decal", "model"]) if (!S.vao[k]) {GPU_DIAGNOSTICS.frameFailure='frame-resources';return false;}
  for (const k of ["ground", "mask", "grit"]) if (!S.tex[k]) {GPU_DIAGNOSTICS.frameFailure='frame-resources';return false;}
  return true;
}
export const closeViewGLCanvas = () => S.canvas;
export const closeViewOutdoorAvailable = () => !!(S.gl && S.prop && S.tex.terrain); // the open world's solids can be drawn
// Call before admitting the imported body; absent decoded images/context keeps the existing presentation.
// Release 887: a beast's mesh, uploaded once per context; false keeps that beast on its billboard.
export const prepareCloseViewBeastMesh = (mesh) => !!S.gl && !!S.beast && prepareBeastMesh(S.gl, S.beast, mesh);
export const prepareCloseViewHeroGL = (asset) => {const ready=!!S.gl&&prepareHeroGL(S.gl,S.hero,asset);if(S.hero?.failed)GPU_DIAGNOSTICS.lastHeroFailure='upload-failed';return ready;};
// For tests and the lab: forget the context (the next frame asks again).
export function resetCloseViewGL() { GPU_DIAGNOSTICS.contextLost=false;if(S.gl) { disposeHeroGL(S.gl,S.hero,true); disposeBeastGL(S.gl,S.beast,true); } S.hero = null; S.beast = null; S.gl = null; S.canvas = null; S.gritReady = false; S.groundW = S.groundH = 0; S.maskMap = null; S.maskW = S.maskH = 0; S.maskAt = 0; S.staticKey = null; S.staticVerts = 0; S.aniso = null; for(const k of ["ground","mask","grit","terrain"])S.tex[k]=null; S.prop = null; S.vbo.prop = S.vao.prop = null; S.outdoorKey = null; S.outdoorVerts = 0; S.terr = null; S.vbo.terr = S.vao.terr = null; S.terrKey = null; S.terrVerts = 0; closeViewGLStats.failed = false; closeViewGLStats.ready = false; closeViewGLStats.reason = ""; closeViewGLStats.projectedShots = 0; }

// ---------------------------------------------------------------------------------------------- the mask: one texel a tile
// r: bits for ceiling, unseen and skylight; g: 0 floor, 1 hole, 2 lava, 3 chasm, 4 bridge, 5 hall shaft.
// b: low bit a safe drop, remaining bits floor material; a: low bit a wall, remaining bits floor inlay.
// Hazards show only where the Wayfarer has seen (the fog of war keeps its secrets). Pure: tests read it.
const HOLE = /hole|pit|abyss|void/i, LAVA = /lava|magma/i;
export function closeViewHazardCode(t) { if (!t) return 0; if (t.bridge) return 4; if (t.hallVoid) return 5; if (t.chasm) return t.blocked && !/void|chasm|abyss|canyon/i.test(String(t.kind || "")) ? 0 : 3; const k = String(t.kind || ""); if (t.hole || (!t.blocked && HOLE.test(k))) return 1; if (LAVA.test(k)) return 2; return 0; }
// A tile's floor material (the shader's floorMat): 0 the theme's own, 1 mosaic, 2 planks, 3 a rug, 4 ceramic tiles,
// 5 concrete, 6 packed dirt, 7 resin, 8 flesh, 9 crystal resin, 10 plating.
const FLOOR_MATERIAL = Object.freeze({ mosaicFloor: 1, plankFloor: 2, logBridge: 2, bridge: 2, carpetFloor: 3, tileFloor: 4, concreteFloor: 5, cellarFloor: 6, rootFloor: 6, chitinFloor: 7, fleshFloor: 8, crystalFloor: 9, arcFloor: 10, arcologyFloor: 10 });
export const closeViewFloorMaterial = (t) => FLOOR_MATERIAL[t?.kind] || 0;
export function closeViewMask(map, seen = null, safe = null, out = null, remap = null) {
  const w = Math.max(1, Number(map?.width) || 32), tiles = map?.tiles || [], h = Math.max(1, Number(map?.height) || Math.floor(tiles.length / w)), data = out && out.length >= w * h * 4 ? out : new Uint8Array(w * h * 4);
  let lava = 0;
  const skylights = map?.hall?.sky ? (map.hall.features || []).filter((f) => f.kind === "skylight") : [];
  if (map?.hall?.sky && !skylights.length) skylights.push({ x: Math.floor(w / 2), y: Math.floor(h / 2) });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x, t = tiles[k], o = k * 4; if (!t) { data[o] = 0; data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = 1; continue; }
    const open = t.courtyard === true || t.openAir === true || t.pentRoof === true || t.pentBalcony === true || t.open === true || t.kind === "yardGrass";
    const vis = !seen || (t.blocked && seen.wall ? seen.wall(x, y) : seen(x, y)), code = vis ? closeViewHazardCode(t) : 0, mat = closeViewFloorMaterial(t);
    const sky = skylights.length && skylights.some((f) => Math.abs(f.x - x) <= 1 && Math.abs(f.y - y) <= 1);
    const space = t.realm === "ship" && (t.kind === "shipGlass" || t.kind === "shipStarWindow" || (t.chasm && !t.catwalk)), bay = t.realm === "ship" && (t.catwalk || (t.chasm && !t.bored)); // seed realms: the cosmos below (space), and above an open bay and its catwalks (bay)
    data[o] = (open || bay ? 0 : 1) | (vis ? 0 : 2) | (sky ? 4 : 0) | (space ? 8 : 0) | (bay ? 16 : 0); data[o + 1] = code; data[o + 2] = (code === 1 && safe && safe[k] === 1 ? 1 : 0) | ((remap ? remap[mat] ?? mat : mat) << 1); const inlay = !t.blocked && (map.hall || map.building?.adventure) && vis ? (t.sigil === "pupil" ? 4 : t.sigil ? 3 : t.inlay === 2 ? 2 : t.inlay === 1 ? 1 : 0) : 0;
    data[o + 3] = (t.blocked && !code ? 1 : 0) | (inlay << 1); if (code === 2) lava++; }
  return { data, w, h, lava };
}
export function glMask(map, now, seen, safe, everyMs, remap = null) {
  const gl = S.gl; if (!gl) return;
  const buildRevision = buildVisualRevision(map);
  if (S.maskMap === map && S.maskBuildRevision === buildRevision && (!seen || now - S.maskAt < everyMs)) return;
  const m = closeViewMask(map, seen, safe, S.maskData, remap); S.maskData = m.data; S.lavaTiles = m.lava;
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, S.tex.mask); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  if (S.maskMap !== map || S.maskW !== m.w || S.maskH !== m.h) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, m.w, m.h, 0, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, m.data.subarray(0, m.w * m.h * 4)); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); }
  else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, m.w, m.h, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, m.data.subarray(0, m.w * m.h * 4));
  S.maskMap = map; S.maskBuildRevision = buildRevision; S.maskAt = now; S.maskW = m.w; S.maskH = m.h; closeViewGLStats.maskBuilds++;
}
export const glLavaTiles = () => S.lavaTiles;
// The grit atlas: every painted variant side by side (cell = the textures' size), uploaded once.
export function glGrit(build) { if (S.gritReady || !S.gl) return; const c = build(); if (!c) return; const gl = S.gl; gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, S.tex.grit); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); S.gritReady = true; }
// The walls, trim, arches and props of a floor: uploaded once (key: the floor's geometry and theme), drawn every frame.
export function glStaticWalls(key, build) {
  const gl = S.gl; if (!gl || S.staticKey === key) return; const data = build(); if (!data) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo.wall); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); S.staticKey = key; S.staticVerts = data.length / WALL_FLOATS; closeViewGLStats.staticBuilds++; closeViewGLStats.staticVerts = S.staticVerts;
}

// The open world's scene (close-view-outdoor.ts outdoorScene): its per-tile ground and its solids, uploaded only when the
// scene's key changes (a new section, a dig, a felled tree). False without the optional outdoor program.
export function glOutdoor(scene) {
  const gl = S.gl; if (!gl || !S.prop || !S.tex.terrain || !scene) return false; if (S.outdoorKey === scene.key) return true;
  const T = scene.terrain; gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, S.tex.terrain); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, T.w, T.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, T.data.subarray(0, T.w * T.h * 4));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  const solids = scene.solids || scene.mesh; gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo.prop); gl.bufferData(gl.ARRAY_BUFFER, solids.data, gl.STATIC_DRAW);
  S.outdoorKey = scene.key; S.outdoorVerts = solids.verts; closeViewGLStats.outdoorBuilds = (closeViewGLStats.outdoorBuilds || 0) + 1; closeViewGLStats.outdoorVerts = S.outdoorVerts; return true;
}
// An interior floor's props (close-view-outdoor.ts propScene) in the same solids buffer and program, uploaded only when a
// prop changes or the floor does. False without the optional program.
export function glProps(scene) {
  const gl = S.gl; if (!gl || !S.prop || !scene) return false; if (S.outdoorKey === scene.key) return true;
  gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo.prop); gl.bufferData(gl.ARRAY_BUFFER, scene.solids.data, gl.STATIC_DRAW);
  S.outdoorKey = scene.key; S.outdoorVerts = scene.solids.verts; closeViewGLStats.propBuilds = (closeViewGLStats.propBuilds || 0) + 1; closeViewGLStats.outdoorVerts = S.outdoorVerts; return true;
}
export const closeViewPropsAvailable = () => !!(S.gl && S.prop); // props can be drawn as solids (else they stay cards)
export const closeViewReliefAvailable = () => !!(S.gl && S.prop && S.tex.terrain && S.terr); // the overworld's heightfield can be drawn
// The heightfield's triangles, uploaded only when the section's relief changes (a new section, a dig).
export function glRelief(scene) {
  const gl = S.gl; if (!gl || !S.terr || !scene?.ground) return false; if (S.terrKey === scene.ground) return true;
  gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo.terr); gl.bufferData(gl.ARRAY_BUFFER, scene.ground.data, gl.STATIC_DRAW); S.terrKey = scene.ground; S.terrVerts = scene.ground.verts;
  closeViewGLStats.reliefBuilds = (closeViewGLStats.reliefBuilds || 0) + 1; closeViewGLStats.reliefVerts = S.terrVerts; return true;
}
// ---------------------------------------------------------------------------------------------- one frame
// F: the frame's numbers, filled by close-view.ts (a preallocated object). ground: the ground canvas (what lies on the floor
// above F.atlasY, the billboards' atlas below). Draws into the GL canvas; the caller copies it to the screen.
export const GLF = { devW: 1, devH: 1, w: 1, h: 1, cx: 0, cy: 0, fx: 1, fy: 0, rx: 0, ry: 1, hc: 1.6, cosP: 1, sinP: 0, F: 300, ppx: 0, ppy: 0, px: 0, py: 0, fogNear: 3, fogFar: 12, reach: 14,
  fog: new Float32Array(3), haze: new Float32Array(3), fogP: new Float32Array(4), amb: new Float32Array(3), torch: new Float32Array(3), torchP: new Float32Array(4), grade: new Float32Array(4), finish: new Float32Array(4),
  lp: new Float32Array(32), lc: new Float32Array(32), nl: 0, sil: new Float32Array(3), silFoe: new Float32Array(3),
  time: 0, gmapK: 44, gmapX: 0, gmapY: 0, atlasY: 0, mip: true, aniso: 4, ceiling: 1, ceilH: 2.4, ceilDetail: 1,
  // outdoors (close-view-outdoor.ts); sunC stays black and outdoor 0 indoors
  outdoor: 0, sun: new Float32Array([0, 0, 1, 0]), sunC: new Float32Array(3), outdoorP: new Float32Array(4), skyZ: new Float32Array(4), skyH: new Float32Array(4), ridge: new Float32Array(4), outW: new Float32Array(4), outR: new Float32Array(4), outD: new Float32Array(4), outX: new Float32Array(4), outY: new Float32Array(4), mood: new Float32Array(4), moodC: new Float32Array(4), props: 0,
  // the solids drawn in runs (start, count) when a house's roof is left out; nRuns 0: the whole buffer in one call
  runs: new Int32Array(2 * 16), nRuns: 0, relief: 0 };
export function drawSceneGL(ground, U, models = null, hero = null, beasts = null) {
  const gl = S.gl; if (!closeViewGLFrameReady()) return false; const F = GLF; let calls = 0;
  try {
  const c = S.canvas; if (c.width !== F.devW || c.height !== F.devH) { c.width = F.devW; c.height = F.devH; }
  gl.viewport(0, 0, F.devW, F.devH);
  // what lies on the floor (and the billboards' atlas below it): copied up once a frame
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.tex.ground); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  if (S.groundW !== ground.width || S.groundH !== ground.height) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ground); S.groundW = ground.width; S.groundH = ground.height;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, F.mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); if (S.aniso) gl.texParameterf(gl.TEXTURE_2D, S.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(F.aniso, gl.getParameter(S.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1)); }
  else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, ground);
  if (F.mip) gl.generateMipmap(gl.TEXTURE_2D); closeViewGLStats.uploads++;
  const cam = (P) => { gl.uniform2f(P.U.u_cam, F.cx, F.cy); gl.uniform2f(P.U.u_fwd, F.fx, F.fy); gl.uniform2f(P.U.u_right, F.rx, F.ry); gl.uniform1f(P.U.u_hc, F.hc); gl.uniform1f(P.U.u_cosP, F.cosP); gl.uniform1f(P.U.u_sinP, F.sinP); gl.uniform1f(P.U.u_F, F.F); gl.uniform2f(P.U.u_pp, F.ppx, F.ppy); gl.uniform2f(P.U.u_size, F.w, F.h); };
  const light = (P) => { const u = P.U; gl.uniform2f(u.u_player, F.px, F.py); gl.uniform3f(u.u_eye, F.cx, F.cy, F.hc); gl.uniform1f(u.u_time, F.time); gl.uniform2f(u.u_dev, F.devW, F.devH);
    gl.uniform3fv(u.u_amb, F.amb); gl.uniform3fv(u.u_torch, F.torch); gl.uniform4fv(u.u_torchP, F.torchP); gl.uniform4fv(u.u_lp, F.lp); gl.uniform4fv(u.u_lc, F.lc); gl.uniform1i(u.u_nl, F.nl);
    gl.uniform4fv(u.u_fogP, F.fogP); gl.uniform3fv(u.u_fog, F.fog); gl.uniform3fv(u.u_haze, F.haze); gl.uniform4fv(u.u_grade, F.grade); gl.uniform4fv(u.u_finish, F.finish);
    gl.uniform4fv(u.u_sun, F.sun); gl.uniform3fv(u.u_sunC, F.sunC); };
  gl.clearColor(F.fog[0], F.fog[1], F.fog[2], 1); gl.clearDepth(1); gl.disable(gl.SCISSOR_TEST); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // 1. walls, trim, arches and props: the static buffer, opaque, with depth (first, so the environment is never shaded where a wall stands)
  gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, S.tex.mask); gl.activeTexture(gl.TEXTURE0);
  if (S.staticVerts > 0) { const Z = S.wallZ; gl.useProgram(Z.p); cam(Z); gl.uniform1i(Z.U.u_mask, 1); gl.uniform2i(Z.U.u_mapSize, S.maskW, S.maskH); gl.uniform1f(Z.U.u_reach, F.reach); U.arch(gl, Z.U);
    gl.colorMask(false, false, false, false); gl.bindVertexArray(S.vao.wallZ); gl.drawArrays(gl.TRIANGLES, 0, S.staticVerts); calls++; gl.colorMask(true, true, true, true); // depth only
    gl.depthFunc(gl.EQUAL); gl.depthMask(false);
    gl.useProgram(S.wall.p); cam(S.wall); light(S.wall); U.wall(gl, S.wall.U, F);
    U.env(gl,S.wall.U,F,S.lavaTiles); gl.uniform1i(S.wall.U.u_ground,0); gl.uniform4f(S.wall.U.u_gmap,F.gmapK,F.gmapX,F.gmapY,F.atlasY); gl.uniform2f(S.wall.U.u_tex,ground.width,ground.height); gl.uniform1i(S.wall.U.u_grit, 2); gl.uniform1i(S.wall.U.u_mask, 1); gl.uniform2i(S.wall.U.u_mapSize, S.maskW, S.maskH); gl.uniform1f(S.wall.U.u_reach, F.reach);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, S.tex.grit); gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(S.vao.wall); gl.drawArrays(gl.TRIANGLES, 0, S.staticVerts); calls++; gl.depthFunc(gl.LEQUAL); }
  // 1b. outdoors: the outcrops and trees, one static buffer, opaque, with depth
  const outdoor = F.outdoor > 0 && !!S.prop && S.outdoorKey !== null;
  const outdoorU = (P) => { const u = P.U; gl.uniform1i(u.u_ground, 0); gl.uniform1i(u.u_mask, 1); gl.uniform4f(u.u_gmap, F.gmapK, F.gmapX, F.gmapY, F.atlasY); gl.uniform2f(u.u_tex, ground.width, ground.height); gl.uniform2i(u.u_mapSize, S.maskW, S.maskH);
    gl.uniform4f(u.u_outdoor, outdoor ? 1 : 0, F.outdoorP[1], F.outdoorP[2], F.outdoorP[3]); gl.uniform4fv(u.u_skyZ, F.skyZ); gl.uniform4fv(u.u_skyH, F.skyH); gl.uniform4fv(u.u_ridge, F.ridge); gl.uniform4fv(u.u_outW, F.outW); gl.uniform4fv(u.u_outR, F.outR); gl.uniform4fv(u.u_outD, F.outD); gl.uniform4fv(u.u_outX, F.outX); gl.uniform4fv(u.u_outY, F.outY); gl.uniform4fv(u.u_mood, F.mood); gl.uniform4fv(u.u_moodC, F.moodC);
    gl.uniform1i(u.u_terrainTex, outdoor ? 3 : 0); if (outdoor) { gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, S.tex.terrain); gl.activeTexture(gl.TEXTURE0); } };
  // 1a. outdoors: the heightfield (its tops shaded as the open ground, its cliffs and pits), opaque, with depth
  if (outdoor && F.relief > 0 && S.terr && S.terrVerts > 0) { gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.useProgram(S.terr.p); cam(S.terr); light(S.terr); outdoorU(S.terr);
    gl.bindVertexArray(S.vao.terr); gl.drawArrays(gl.TRIANGLES, 0, S.terrVerts); calls++; }
  if ((outdoor || (F.props > 0 && !!S.prop && S.outdoorKey !== null)) && S.outdoorVerts > 0) { gl.depthFunc(gl.LEQUAL); gl.depthMask(true); /* the walls' colour pass leaves depth writes off */ gl.useProgram(S.prop.p); cam(S.prop); light(S.prop); gl.bindVertexArray(S.vao.prop);
    if (F.nRuns > 0) { for (let i = 0; i < F.nRuns; i++) { const a = F.runs[i * 2], c = Math.min(F.runs[i * 2 + 1], S.outdoorVerts - a); if (c > 0) { gl.drawArrays(gl.TRIANGLES, a, c); calls++; } } } // a roof left out: the rest in runs
    else { gl.drawArrays(gl.TRIANGLES, 0, S.outdoorVerts); calls++; } }
  // 2. the environment: floor, ceiling, pits, lava; a full-screen triangle at the far plane, depth-tested and not written, so
  // the early depth test leaves every pixel a wall covers unshaded
  gl.depthMask(false); gl.useProgram(S.env.p); gl.uniform1f(S.env.U.u_terrain,F.terrain?1:0); cam(S.env); light(S.env); U.env(gl, S.env.U, F, S.lavaTiles);
  gl.uniform1i(S.env.U.u_ground, 0); gl.uniform1i(S.env.U.u_mask, 1); gl.uniform4f(S.env.U.u_gmap, F.gmapK, F.gmapX, F.gmapY, F.atlasY); gl.uniform2f(S.env.U.u_tex, ground.width, ground.height); gl.uniform2i(S.env.U.u_mapSize, S.maskW, S.maskH);
  outdoorU(S.env);
  gl.bindVertexArray(S.vao.env); gl.drawArrays(gl.TRIANGLES, 0, 3); calls++;
  // 3. the floor's decals and the props drawn as cards (shadows, rings, cobwebs, chains, spikes, bones): blended, depth-tested, not written
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
  const decalU = () => { cam(S.decal); U.decal(gl, S.decal.U); gl.uniform1i(S.decal.U.u_mask, 1); gl.uniform2i(S.decal.U.u_mapSize, S.maskW, S.maskH); gl.uniform1f(S.decal.U.u_time, F.time); gl.uniform3fv(S.decal.U.u_fog, F.fog); gl.uniform4fv(S.decal.U.u_fogP, F.fogP); };
  if (GLB.nDecal > 0) { gl.useProgram(S.decal.p); decalU(); gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo.decal); gl.bufferData(gl.ARRAY_BUFFER, GLB.decal.subarray(0, GLB.nDecal * DECAL_FLOATS), gl.DYNAMIC_DRAW); gl.bindVertexArray(S.vao.decal);
    if (GLB.nGlowStart > 0) { gl.drawArrays(gl.TRIANGLES, 0, GLB.nGlowStart); calls++; } }
  // Compare silhouettes against wall depth before the opaque models write actor depth.
  const model = S.model, hasModels = !!models?.length, hasHero = uploadHeroFrame(gl,S.hero,hero);
  if (hero && !hasHero) return false;
  const useBoards = () => { gl.useProgram(S.board.p); gl.bindVertexArray(S.vao.board); };
  if (GLB.nBoard > 0) { useBoards(); cam(S.board); gl.uniform1i(S.board.U.u_ground, 0); gl.uniform2f(S.board.U.u_dev, F.devW, F.devH); gl.uniform4fv(S.board.U.u_grade, F.grade); gl.uniform4fv(S.board.U.u_finish, F.finish); gl.uniform3fv(S.board.U.u_fog, F.fog); gl.uniform4fv(S.board.U.u_fogP, F.fogP); gl.uniform3fv(S.board.U.u_sil, F.sil); gl.uniform3fv(S.board.U.u_silFoe, F.silFoe);
    gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo.board); gl.bufferData(gl.ARRAY_BUFFER, GLB.board.subarray(0, GLB.nBoard * BOARD_FLOATS), gl.DYNAMIC_DRAW);
    gl.depthFunc(gl.GREATER); gl.uniform1f(S.board.U.u_pass, 1); gl.drawArrays(gl.TRIANGLES, 0, GLB.nBoard); calls++; gl.depthFunc(gl.LEQUAL); }
  if (hasModels) {
    gl.useProgram(model.p); cam(model); light(model); gl.uniform3fv(model.U.u_sil, F.sil);
    gl.bindVertexArray(S.vao.model); gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo.model);
    gl.bufferData(gl.ARRAY_BUFFER, models, gl.DYNAMIC_DRAW);
    const vertices = models.length / MODEL_FLOATS;
    gl.depthFunc(gl.GREATER); gl.uniform1f(model.U.u_pass, 1); gl.drawArrays(gl.TRIANGLES, 0, vertices); calls++;
  }
  if(hasHero) { gl.depthFunc(gl.GREATER); drawHeroGL(gl,S.hero,hero,1,cam,light,F.sil); calls++; }
  const hasBeasts = !!(beasts?.count && S.beast);
  if(hasBeasts) { gl.depthFunc(gl.GREATER); calls += drawBeastsGL(gl,S.beast,beasts,1,cam,light,F.sil); }
  if(hasModels || hasHero || hasBeasts) {
    gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND);
    if(hasModels) { gl.useProgram(model.p); gl.bindVertexArray(S.vao.model); gl.uniform1f(model.U.u_pass, 0); gl.drawArrays(gl.TRIANGLES, 0, models.length/MODEL_FLOATS); calls++; }
    if(hasHero) { drawHeroGL(gl,S.hero,hero,0,cam,light,F.sil); calls++; }
    if(hasBeasts) calls += drawBeastsGL(gl,S.beast,beasts,0,cam,light,F.sil);
    gl.depthMask(false); gl.enable(gl.BLEND);
  }
  if (GLB.nBoard > 0) { useBoards(); gl.uniform1f(S.board.U.u_pass, 0); gl.drawArrays(gl.TRIANGLES, 0, GLB.nBoard); calls++; }
  closeViewGLStats.modelTriangles = (hasModels ? models.length / (3 * MODEL_FLOATS) : 0) + (hasHero ? hero.indexCount/3 : 0);
  closeViewGLStats.heroTriangles = hasHero ? hero.indexCount/3 : 0;
  { let bt = 0; if (hasBeasts) for (let i = 0; i < beasts.count; i++) { const f = beasts.items[i]; bt += (f.cloud ? f.mesh.triangles : f.mesh.coreTriangles); } closeViewGLStats.beastTriangles = bt; closeViewGLStats.beasts = hasBeasts ? beasts.count : 0; closeViewGLStats.modelTriangles += bt; }
  closeViewGLStats.heroUploadBytes = hasHero ? S.hero.uploadBytes : 0;
  // 5. flames, halos, motes and wind-up glows, added in light
  if (GLB.nDecal > GLB.nGlowStart) { gl.useProgram(S.decal.p); decalU(); gl.bindVertexArray(S.vao.decal); gl.blendFunc(gl.ONE, gl.ONE); gl.drawArrays(gl.TRIANGLES, GLB.nGlowStart, GLB.nDecal - GLB.nGlowStart); calls++; }
  gl.bindVertexArray(null); gl.depthMask(true); gl.disable(gl.BLEND);
  const error=typeof gl.getError === "function"?gl.getError():undefined;
  const lost=gl.isContextLost?.();if (lost || (Number.isFinite(error) && error !== gl.NO_ERROR)) {GPU_DIAGNOSTICS.frameFailure=lost?'context-lost':'frame-error';return false;}
  closeViewGLStats.frames++; closeViewGLStats.drawCalls = calls; closeViewGLStats.walls = S.staticVerts / 6; closeViewGLStats.boards = GLB.nBoard / 6; closeViewGLStats.decals = GLB.nDecal / 6; closeViewGLStats.lights = F.nl;
  return true;
  } catch (err) {
    GPU_DIAGNOSTICS.frameFailure='frame-error';
    closeViewGLStats.reason = String(err?.message || err).slice(0, 400);
    return false;
  }
}
