// Offline creature importer (build-time only; never shipped, never run by the game or by npm scripts).
//
//   node tools/creature-import/convert.mjs --assets <folder holding the downloaded packs> [--out assets/creatures] [kind ...]
//
// For each kind in kinds.json it reads the CC0 source (glTF or binary FBX, as data), then:
//   1. segments the skinned mesh into rigid parts by each triangle's dominant bone (small bones fold into their parent);
//   2. converts to Close View model space (x forward, y left, z up; feet on z = 0; scaled to the kind's height);
//   3. decimates the parts to at most `triangles` (256) with meshoptimizer through `npx @gltf-transform/cli simplify`,
//      one primitive per part and colour slot so part and colour boundaries survive;
//   4. bakes the idle, walk and attack clips to per-part 3x4 transforms at `fps` (12) and finds the attack's coil end and
//      strike peak (the frame the body reaches furthest forward);
//   5. writes assets/creatures/<kind>.json (header, palette slots, clip table) and <kind>.bin (float32 arrays).
// Colours are palette slots (0 body, 1 dark, 2 accent, 3 light) with a shade, so the game recolours each kind to its own palette.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadSource } from './source.mjs';
import { localPose, worldMatrices } from './rig.mjs';
import { mul, invert, xform } from './math.mjs';
import { decodePng, samplePng } from './png.mjs';
import { readGltf } from './gltf.mjs';

const here = dirname(fileURLToPath(import.meta.url));
// Each kind's palette as monster-pack.ts holds it (body, dark, accent, light); the game recolours the slots with it.
const { MONSTER_PACK } = await import('../../src/monster-pack.ts');
const PALETTES = Object.fromEntries(Object.entries(MONSTER_PACK).map(([k, v]) => [k, v.palette]));
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const assetsDir = opt('--assets', process.env.CREATURE_IMPORT_ASSETS || ''), outDir = resolve(opt('--out', join(here, '../../assets/creatures')));
const config = JSON.parse(readFileSync(opt('--config', join(here, 'kinds.json')), 'utf8'));
const kinds = argv.length ? argv : Object.keys(config.kinds);
if (!assetsDir) throw new Error('--assets <folder> is required');
mkdirSync(outDir, { recursive: true });

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const hex = (s) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
const AXES = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

for (const kind of kinds) convert(kind, config.kinds[kind]);
writeCredits();

function convert(kind, cfg) {
  const file = join(assetsDir, cfg.source), rig = loadSource(file), fps = cfg.fps || config.fps, budget = cfg.triangles || config.triangles;
  const clip = (name) => { const c = rig.clips.find(k => k.name === name); if (!c) throw new Error(`${kind}: no clip ${name}`); return c; };
  // idle, walk, the default attack, and per-attack clips (attack.<attack id>) where a kind's attacks differ in motion
  const clips = { idle: clip(cfg.clips.idle), walk: clip(cfg.clips.walk), attack: clip(cfg.clips.attack) };
  const repeats = {};
  for (const [attackId, spec] of Object.entries(cfg.attacks || {})) {
    clips['attack.' + attackId] = clip(typeof spec === 'string' ? spec : spec.clip);
    if (spec.repeats > 1) repeats['attack.' + attackId] = spec.repeats;
  }
  const rest = worldMatrices(rig, localPose(rig, null, 0));
  const jointSet = new Set(rig.joints);
  const boneOfNode = (n) => { for (let i = n; i >= 0; i = rig.nodes[i].parent) if (jointSet.has(i)) return i; return n; };
  // source triangles in rest model space, each with its dominant bone and colour
  const tris = [], bindInverse = new Map();
  for (const m of rig.meshes) {
    const pos = m.positions, img = m.material >= 0 && rig.materials[m.material]?.image ? decodePng(rig.materials[m.material].image) : null;
    // Skinned geometry stays in its bind space (a part then moves by world(t) * inverseBind); rigid geometry is placed at rest.
    if (m.jointNodes) m.jointNodes.forEach((j, k) => { if (!bindInverse.has(j)) bindInverse.set(j, m.inverseBind.subarray(k * 16, k * 16 + 16)); });
    const vert = (i) => {
      const v = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
      return m.jointNodes ? v : xform(rest[m.node], v);
    };
    for (let t = 0; t < m.indices.length; t += 3) {
      const ids = [m.indices[t], m.indices[t + 1], m.indices[t + 2]];
      let bone;
      if (m.jointNodes) {
        const score = new Map();
        for (const i of ids) for (let s = 0; s < 4; s++) { const w = m.weights[i * 4 + s]; if (w) { const b = m.jointNodes[m.joints[i * 4 + s]]; score.set(b, (score.get(b) || 0) + w); } }
        bone = [...score.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? boneOfNode(m.node);
      } else bone = boneOfNode(m.node);
      const matIndex = m.triMaterial ? m.triMaterial[t / 3] : m.material;
      let color = rig.materials[matIndex]?.color || [.7, .7, .7];
      if (img && m.uvs) { const u = ids.reduce((s, i) => s + m.uvs[i * 2], 0) / 3, v = ids.reduce((s, i) => s + m.uvs[i * 2 + 1], 0) / 3; color = samplePng(img, u, v); }
      tris.push({ p: ids.map(vert), bone, color, material: rig.materials[matIndex]?.name || '', shell: m.jointNodes ? -1 : m.node });
    }
  }
  // fold small bones into their parent bone
  const parentBone = (b) => { for (let i = rig.nodes[b].parent; i >= 0; i = rig.nodes[i].parent) if (jointSet.has(i)) return i; return -1; };
  const minTris = Math.max(1, Math.round(tris.length * (cfg.minShare ?? config.minShare)));
  for (let pass = 0; pass < 64; pass++) {
    const count = new Map();
    for (const t of tris) count.set(t.bone, (count.get(t.bone) || 0) + 1);
    const ranked = [...count.entries()].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const victim = ranked.find(([b, n]) => (n < minTris || ranked.length > (cfg.maxParts || config.maxParts)) && parentBone(b) >= 0 && !(cfg.keepBones || []).includes(rig.nodes[b].name));
    if (!victim) break;
    const to = parentBone(victim[0]);
    for (const t of tris) if (t.bone === victim[0]) t.bone = to;
  }
  // model-space conversion: source forward -> +x, source up -> +z, y = z x x (left)
  const F = AXES[cfg.forward], U = AXES[cfg.up], L = cross(U, F);
  const axis = new Float64Array([F[0], L[0], U[0], 0, F[1], L[1], U[1], 0, F[2], L[2], U[2], 0, 0, 0, 0, 1]);
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (const p of t.p) { const q = xform(axis, p); for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i]); } }
  const k = cfg.height / (hi[2] - lo[2]), cx = (cfg.centerX ?? .5) * (lo[0] + hi[0]), cy = .5 * (lo[1] + hi[1]);
  const G = mul(new Float64Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, -k * cx, -k * cy, -k * lo[2], 1]), axis), Gi = invert(G);
  // colour slots: the nearest reference colour in cfg.slots ([hex, slot, shade])
  const refs = cfg.slots.map(([h, slot, shade]) => ({ c: hex(h), slot, shade }));
  const classify = (t) => {
    const byName = cfg.materialSlots?.[t.material];
    if (byName) return byName;
    let best = refs[0], bd = Infinity;
    for (const r of refs) { const d = (r.c[0] - t.color[0]) ** 2 + (r.c[1] - t.color[1]) ** 2 + (r.c[2] - t.color[2]) ** 2; if (d < bd) { bd = d; best = r; } }
    return [best.slot, best.shade];
  };
  const bones = [...new Set(tris.map(t => t.bone))].sort((a, b) => a - b);
  if (process.env.CREATURE_IMPORT_DEBUG) console.error(kind, bones.map(b => `${rig.nodes[b].name}:${tris.filter(t => t.bone === b).length}`).join(" "));
  // One group per part; each triangle's colour (slot and shade) is a code the simplifier carries as a vertex colour, so
  // colour seams survive and a part simplifies as one surface (no cracks between colour patches).
  const codes = [], codeOf = new Map(), groups = new Map();
  for (const t of tris) {
    const [slot, shade] = classify(t), key = `${slot}_${Math.round(shade * 100)}`;
    if (!codeOf.has(key)) { codeOf.set(key, codes.length); codes.push({ slot, shade }); }
    // a rigid mesh hung on a bone (antlers, a weapon) simplifies on its own, with its own share of the budget
    const part = bones.indexOf(t.bone), gk = `${part}:${t.shell}`;
    if (!groups.has(gk)) groups.set(gk, { part, tris: [], codes: [] });
    groups.get(gk).tris.push(t.p.map(p => xform(G, p)));
    groups.get(gk).codes.push(codeOf.get(key));
  }
  const simplified = decimate([...groups.values()], budget, cfg, codes);
  // bake clips: part transform = G * world_b(t) * inverseBind_b * G^-1 (a rigid node: world_b(rest)^-1 in place of the inverse bind)
  const restInv = bones.map(b => bindInverse.get(b) || invert(rest[b]));
  const bake = (c) => {
    const frames = Math.max(2, Math.round(c.duration * fps) + 1), data = new Float32Array(frames * bones.length * 12);
    for (let f = 0; f < frames; f++) {
      const w = worldMatrices(rig, localPose(rig, c, Math.min(c.duration, f / fps)));
      bones.forEach((b, i) => {
        const M = mul(mul(G, mul(w[b], restInv[i])), Gi), o = (f * bones.length + i) * 12;
        for (let col = 0; col < 4; col++) for (let row = 0; row < 3; row++) data[o + col * 3 + row] = M[col * 4 + row];
      });
    }
    return { frames, data };
  };
  const baked = Object.fromEntries(Object.entries(clips).map(([key, c]) => [key, bake(c)]));
  const marks = Object.fromEntries(Object.keys(clips).filter(key => key.startsWith('attack')).map(key => [key, cfg.marks?.[key] || attackMarks(simplified, baked[key], bones.length)]));
  // binary: positions f32 (tri*9), normals f32 (tri*9), parts u8 (tri), slots u8 (tri), shades u8 (tri, x/100), clip transforms f32
  const triCount = simplified.length, chunks = [], arrays = {};
  let offset = 0;
  const push = (name, typed, type) => { const pad = (4 - offset % 4) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; } arrays[name] = { byteOffset: offset, count: typed.length, componentType: type }; const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength); chunks.push(b); offset += b.length; };
  const P = new Float32Array(triCount * 9), N = new Float32Array(triCount * 9), part = new Uint8Array(triCount), slot = new Uint8Array(triCount), shade = new Uint8Array(triCount);
  simplified.forEach((t, i) => {
    t.p.forEach((p, j) => P.set(p, i * 9 + j * 3));
    const n = normal(t.p); for (let j = 0; j < 3; j++) N.set(n, i * 9 + j * 3);
    part[i] = t.part; slot[i] = t.slot; shade[i] = Math.round(t.shade * 100);
  });
  push('positions', P, 'f32'); push('normals', N, 'f32'); push('parts', part, 'u8'); push('slots', slot, 'u8'); push('shades', shade, 'u8');
  for (const [key, b] of Object.entries(baked)) push('clip_' + key.replace('.', '_'), b.data, 'f32');
  const bin = Buffer.concat(chunks), source = readFileSync(file);
  const header = {
    version: 1, kind, triangles: triCount, palette: PALETTES[kind], parts: bones.length, partBones: bones.map(b => rig.nodes[b].name), height: cfg.height,
    source: { pack: cfg.pack, file: cfg.source.split('/').pop(), sha256: sha256(source), author: cfg.author, license: cfg.license, url: cfg.url, sourceTriangles: tris.length, sourceBones: rig.joints.length },
    clips: Object.fromEntries(Object.entries(clips).map(([key, c]) => [key, { source: c.name, duration: +c.duration.toFixed(4), fps, frames: baked[key].frames, array: 'clip_' + key.replace('.', '_'), loop: !key.startsWith('attack'), ...(marks[key] ? { coil: marks[key].coil, strike: marks[key].strike } : {}), ...(repeats[key] ? { repeats: repeats[key] } : {}) }])),
    binary: `${kind}.bin`, binarySha256: sha256(bin), arrays,
  };
  writeFileSync(join(outDir, `${kind}.bin`), bin);
  writeFileSync(join(outDir, `${kind}.json`), JSON.stringify(header, null, 1) + '\n');
  console.log(`${kind}: ${tris.length} -> ${triCount} tris, ${bones.length} parts, ${bin.length} bytes, marks`, marks);
}

function normal([a, b, c]) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], n = cross(u, v), l = Math.hypot(...n) || 1;
  return n.map(x => x / l);
}

// meshoptimizer (through the gltf-transform CLI), one part at a time. Each part first finds the fewest triangles the simplifier
// reaches for it (a part of many small shells, such as a head with eyes and teeth, cannot go below some count); the budget is
// then shared by surface area above those floors, and each part's ratio is searched to land at or just under its share.
function decimate(groups, budget, cfg, codes) {
  const total = groups.reduce((n, g) => n + g.tris.length, 0), keep = (g, tris) => tris.map((p, i) => ({ p, part: g.part, ...codes[g.codes[i]] }));
  if (total <= budget) return groups.flatMap(g => keep(g, g.tris));
  const dir = mkdtempSync(join(tmpdir(), 'creature-import-'));
  let runs = 0;
  const run = (gi, ratio) => {
    const input = join(dir, `part${gi}.glb`), output = join(dir, `out${runs++}.glb`);
    writeFileSync(input, groupsGlb([groups[gi]]));
    execFileSync('npx', ['-y', '@gltf-transform/cli@4.5.1', 'simplify', input, output, '--ratio', ratio.toFixed(5), '--error', String(cfg.simplifyError ?? 1)], { stdio: 'pipe' });
    return readSimplified(output, groups[gi], codes);
  };
  try {
    const minimal = groups.map((g, gi) => g.tris.length <= (cfg.minPartTriangles ?? 6) ? keep(g, g.tris) : run(gi, 0));
    const floors = minimal.map(m => m.length);
    if (floors.reduce((a, b) => a + b, 0) > budget) throw new Error(`parts cannot simplify below ${floors.reduce((a, b) => a + b, 0)} triangles`);
    const areas = groups.map(g => g.tris.reduce((a, p) => a + area(p), 0) ** (cfg.areaPower ?? .8)), sum = areas.reduce((a, b) => a + b, 0);
    const targets = groups.map((g, i) => Math.min(g.tris.length, Math.max(floors[i], Math.floor(budget * areas[i] / sum))));
    // hand spare triangles to the largest parts that can use them, or take them back from those above their floors
    for (let spare = budget - targets.reduce((a, b) => a + b, 0), guard = 0; spare !== 0 && guard < 4000; guard++) {
      const order = groups.map((_, i) => i).sort((a, b) => areas[b] - areas[a]);
      const i = spare > 0 ? order.find(k => targets[k] < groups[k].tris.length) : order.find(k => targets[k] > floors[k]);
      if (i === undefined) break;
      targets[i] += spare > 0 ? 1 : -1; spare += spare > 0 ? -1 : 1;
    }
    const result = [];
    groups.forEach((g, gi) => {
      if (g.tris.length <= targets[gi]) { result.push(...keep(g, g.tris)); return; }
      let lo = 0, hi = 1, ratio = targets[gi] / g.tris.length, best = minimal[gi];
      for (let i = 0; i < (cfg.searchSteps ?? 8) && best.length < targets[gi] * .92; i++) {
        const out = run(gi, ratio);
        if (out.length <= targets[gi] && out.length > best.length) best = out;
        if (out.length > targets[gi]) hi = ratio; else lo = ratio;
        ratio = (lo + hi) / 2;
      }
      if (process.env.CREATURE_IMPORT_DEBUG) console.error(`  part ${g.part}: ${g.tris.length} -> ${best.length} (target ${targets[gi]}, floor ${floors[gi]})`);
      result.push(...best);
    });
    return result;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
function readSimplified(file, g, codes) {
  const res = readGltf(file), out = [];
  for (const m of res.meshes) {
    const width = m.colors.length / (m.positions.length / 3);
    for (let t = 0; t < m.indices.length; t += 3) {
      const ids = [0, 1, 2].map(j => m.indices[t + j]), p = ids.map(v => [m.positions[v * 3], m.positions[v * 3 + 1], m.positions[v * 3 + 2]]);
      const votes = ids.map(v => Math.round(m.colors[v * width] * 255)), code = votes[1] === votes[2] ? votes[1] : votes[0];
      if (area(p) > 1e-9) out.push({ p, part: g.part, ...codes[code] });
    }
  }
  return out;
}
function area(p) { return Math.hypot(...cross([p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]])); }

// A GLB with one node/mesh per group (named g<index>), positions welded by exact value within the group.
function groupsGlb(groups) {
  const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [] };
  const chunks = [];
  let offset = 0;
  const view = (typed, target) => { const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength); json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: b.length, target }); chunks.push(b); offset += b.length; const pad = (4 - offset % 4) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; } return json.bufferViews.length - 1; };
  groups.forEach((g, gi) => {
    const map = new Map(), pos = [], idx = [], col = [];
    g.tris.forEach((tri, ti) => { for (const p of tri) { const key = p.map(x => x.toFixed(6)).join(',') + '/' + g.codes[ti]; if (!map.has(key)) { map.set(key, pos.length / 3); pos.push(...p); col.push(g.codes[ti] / 255, 0, 0); } idx.push(map.get(key)); } });
    const P = Float32Array.from(pos), I = Uint32Array.from(idx), Cv = Float32Array.from(col), lo = [0, 1, 2].map(i => Math.min(...pos.filter((_, k) => k % 3 === i))), hi = [0, 1, 2].map(i => Math.max(...pos.filter((_, k) => k % 3 === i)));
    json.accessors.push({ bufferView: view(P, 34962), componentType: 5126, count: P.length / 3, type: 'VEC3', min: lo, max: hi });
    json.accessors.push({ bufferView: view(Cv, 34962), componentType: 5126, count: Cv.length / 3, type: 'VEC3' });
    json.accessors.push({ bufferView: view(I, 34963), componentType: 5125, count: I.length, type: 'SCALAR' });
    json.meshes.push({ primitives: [{ attributes: { POSITION: json.accessors.length - 3, COLOR_0: json.accessors.length - 2 }, indices: json.accessors.length - 1 }] });
    json.nodes.push({ name: 'g' + gi, mesh: gi });
    json.scenes[0].nodes.push(gi);
  });
  const bin = Buffer.concat(chunks);
  json.buffers.push({ byteLength: bin.length });
  let js = Buffer.from(JSON.stringify(json));
  js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, jh, js, bh, bin]);
}

// The attack's strike peak: the frame its posed body reaches furthest forward (+x); the coil end: the least forward reach
// before that peak (the wind-up). Shares of the clip's duration.
function attackMarks(tris, baked, partCount) {
  const reach = [];
  for (let f = 0; f < baked.frames; f++) {
    let best = -Infinity;
    for (const t of tris) for (const p of t.p) {
      const o = (f * partCount + t.part) * 12, d = baked.data;
      best = Math.max(best, d[o] * p[0] + d[o + 3] * p[1] + d[o + 6] * p[2] + d[o + 9]);
    }
    reach.push(best);
  }
  let peak = 0;
  for (let f = 1; f < reach.length; f++) if (reach[f] > reach[peak]) peak = f;
  let coil = 0;
  for (let f = 1; f < peak; f++) if (reach[f] < reach[coil]) coil = f;
  const last = baked.frames - 1;
  if (coil === 0) coil = Math.round(peak * .6);
  if (peak <= coil) return { coil: .35, strike: .55 };
  return { coil: +(coil / last).toFixed(4), strike: +(peak / last).toFixed(4) };
}

// assets/creatures/CREDITS.md, rebuilt from every converted header in the folder (so it always lists every shipped file).
function writeCredits() {
  const headers = readdirSync(outDir).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(readFileSync(join(outDir, f), 'utf8')));
  const lines = ['# Imported creature bodies: credits', '',
    'Converted offline by `tools/creature-import/convert.mjs` (rigid parts by dominant bone, meshoptimizer decimation, clips baked',
    'at 12 fps). The sources are CC0 1.0 Universal public-domain dedications; no credit is required, and it is given here anyway.',
    'Downloaded only from the creator\'s own pack page and its linked Google Drive folder. Nothing in a source file was executed.', ''];
  for (const h of headers) {
    const cfg = config.kinds[h.kind] || {}, src = h.source;
    lines.push(`## ${h.kind}`, '',
      `- Files: \`${h.kind}.json\` (sha256 \`${sha256(readFileSync(join(outDir, h.kind + '.json')))}\`), \`${h.binary}\` (sha256 \`${h.binarySha256}\`)`,
      `- Source: ${src.pack}, \`${src.file}\` by ${src.author} (sha256 \`${src.sha256}\`, ${src.sourceTriangles} triangles, ${src.sourceBones} bones)`,
      `- Page: ${src.url}`,
      `- Licence: ${cfg.licenseQuote || src.license}`,
      `- Clips: ${Object.entries(h.clips).map(([k, c]) => `${k} = ${c.source}`).join(', ')}`,
      `- Result: ${h.triangles} triangles in ${h.parts} rigid parts, recoloured to the monster-pack.ts palette ${h.palette.join(' ')}`, '');
  }
  writeFileSync(join(outDir, 'CREDITS.md'), lines.join('\n'));
}

