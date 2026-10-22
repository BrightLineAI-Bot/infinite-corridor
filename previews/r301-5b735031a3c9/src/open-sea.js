// Open seas (release 152; Tim, 2026-10-16). Sections that are mostly sea are open water from edge to edge
// (landscape.ts OPEN_SEA), and a skiff can sail across any border where the water runs on. Open-sea sections may
// carry environmental hazards, all deterministic per section and transient (nothing is saved):
//   whirlpool  Maelstrom: drags anything afloat toward its eye in a spiral; the eye batters the hull.
//   wave       Rogue wave: a foam crest sweeps the whole section on a cycle; it shoves and swamps the skiff it catches,
//              unless the Wayfarer drives through it with an oar burst (dodge).
//   iceberg    Drifting ice (cold seas): slow floes that bounce off land and each other; ramming one cracks the hull.
// Data and pure rules; game.ts supplies the world (water test, hurt, hull) and draws through renderer.ts.
import { hashSeed, rng } from "./random.js?v=r301-5b735031a3c9";
import { coldSea } from "./landscape.js?v=r301-5b735031a3c9";
export { coldSea };

// Version 2 (release 156): sea features (landscape.ts addSeaFeatures) in sections first seen from then on.
// Version 3 (release 158): rarer buoys.
export const OPEN_SEA_VERSION = 3;
export const SEA_HAZARDS = {
  whirlpool: { chance: .4, max: 2, radius: [3, 4.6], pull: 1.9, spin: 2.4, eye: .9, eyeDamage: 9, eyeEvery: .8, fling: 2.6 },
  wave: { chance: .45, period: [10, 15], speed: 5, width: 1.4, push: 3.2, damage: 7, warn: 2.5 },
  // Release 154: currents, reefs, fog banks, and storm fronts that travel across many sections.
  current: { chance: .4, width: [2.5, 4.5], speed: 1.7 },
  reef: { chance: .35, count: [2, 4], radius: [1.2, 2.3], damage: 3, every: .6 },
  fog: { chance: .3, coldChance: .6, count: [2, 3], radius: [5, 8], drift: .35, sight: 3.6 },
  storm: { cell: 10, every: 2, period: 720, radius: 2.4, wind: .9, wavePeriod: 6.5 },
  iceberg: { count: [2, 5], radius: [.9, 1.8], speed: [.25, .6], damage: 8, every: 1.2, bounce: 1.4 },
};


const DEEP = new Set(["ocean", "deepOcean"]);
const deepAt = (map, x, y) => DEEP.has(map.tiles[Math.floor(y) * 32 + Math.floor(x)]?.kind);
// True when every tile within `r` of (x, y) is deep water.
function clearWater(map, x, y, r) {
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) if (dx * dx + dy * dy <= r * r && !deepAt(map, x + dx, y + dy)) return false;
  return true;
}

// The hazards of one open-sea section, or null. Positions are tile coordinates (centres at +.5).
export function seaHazards(seed, rx, ry, map) {
  if (!map?.openSea) return null;
  const r = rng(`${seed}:sea-hazards:v1:${rx}:${ry}`), H = SEA_HAZARDS, out = { whirlpools: [], wave: null, bergs: [], cold: coldSea(seed, rx, ry), clock: 0 };
  const spots = map.tiles.filter((t) => DEEP.has(t.kind) && t.x > 3 && t.y > 3 && t.x < 28 && t.y < 28);
  const spot = () => spots[Math.floor(r() * spots.length)];
  if (spots.length && r() < H.whirlpool.chance * (out.cold ? .5 : 1)) {
    const n = 1 + Math.floor(r() * H.whirlpool.max);
    for (let i = 0; i < n * 6 && out.whirlpools.length < n; i++) {
      const t = spot(), radius = H.whirlpool.radius[0] + r() * (H.whirlpool.radius[1] - H.whirlpool.radius[0]), x = t.x + .5, y = t.y + .5;
      if (clearWater(map, x, y, radius) && out.whirlpools.every((w) => Math.hypot(w.x - x, w.y - y) > w.radius + radius + 2)) out.whirlpools.push({ x, y, radius, dir: r() < .5 ? 1 : -1 });
    }
  }
  if (r() < H.wave.chance) {
    const a = Math.floor(r() * 4) * Math.PI / 2 + (r() - .5) * .6;
    out.wave = { dx: Math.cos(a), dy: Math.sin(a), period: H.wave.period[0] + r() * (H.wave.period[1] - H.wave.period[0]), phase: r() * 10, cycle: -1, hit: -1 };
  }
  if (out.cold && spots.length) {
    const n = H.iceberg.count[0] + Math.floor(r() * (H.iceberg.count[1] - H.iceberg.count[0] + 1));
    for (let i = 0; i < n * 6 && out.bergs.length < n; i++) {
      const t = spot(), radius = H.iceberg.radius[0] + r() * (H.iceberg.radius[1] - H.iceberg.radius[0]), x = t.x + .5, y = t.y + .5, a = r() * Math.PI * 2, v = H.iceberg.speed[0] + r() * (H.iceberg.speed[1] - H.iceberg.speed[0]);
      if (clearWater(map, x, y, radius + .5) && out.bergs.every((b) => Math.hypot(b.x - x, b.y - y) > b.radius + radius + 1.5)) out.bergs.push({ x, y, radius, vx: Math.cos(a) * v, vy: Math.sin(a) * v, spin: r() * 6, shape: Math.floor(r() * 1e6), cooldown: 0 });
    }
  }
  // Release 154 additions draw from their own stream, so the hazards above stay as they were.
  const r2 = rng(`${seed}:sea-hazards:v2:${rx}:${ry}`);
  if (r2() < H.current.chance) {
    const a = r2() * Math.PI * 2;
    out.current = { dx: Math.cos(a), dy: Math.sin(a), offset: (r2() - .5) * 14, width: H.current.width[0] + r2() * (H.current.width[1] - H.current.width[0]) };
  }
  out.reefs = [];
  if (spots.length && r2() < H.reef.chance) {
    const n = H.reef.count[0] + Math.floor(r2() * (H.reef.count[1] - H.reef.count[0] + 1));
    for (let i = 0; i < n * 6 && out.reefs.length < n; i++) {
      const t = spots[Math.floor(r2() * spots.length)], radius = H.reef.radius[0] + r2() * (H.reef.radius[1] - H.reef.radius[0]), x = t.x + .5, y = t.y + .5;
      if (out.whirlpools.every((w) => Math.hypot(w.x - x, w.y - y) > w.radius + radius + 1) && out.reefs.every((q) => Math.hypot(q.x - x, q.y - y) > q.radius + radius + 1)) out.reefs.push({ x, y, radius, shape: Math.floor(r2() * 1e6), clock: 0 });
    }
  }
  out.fog = [];
  if (r2() < (out.cold ? H.fog.coldChance : H.fog.chance)) {
    const n = H.fog.count[0] + Math.floor(r2() * (H.fog.count[1] - H.fog.count[0] + 1)), a = r2() * Math.PI * 2;
    for (let i = 0; i < n; i++) out.fog.push({ x: r2() * 32, y: r2() * 32, radius: H.fog.radius[0] + r2() * (H.fog.radius[1] - H.fog.radius[0]), vx: Math.cos(a) * H.fog.drift, vy: Math.sin(a) * H.fog.drift });
  }
  return out;
}

// Storm fronts: one may cross each `cell`×`cell` block of sections (every `every`-th block), drifting along a heading so
// that it crosses the whole block once per `period` seconds of real time. Returns the storm over section (rx, ry) at
// time `t` (seconds) as { strength 0..1, windX, windY }, or null. Pure, so any section can ask without loading.
export function stormAt(seed, rx, ry, t) {
  const S = SEA_HAZARDS.storm, mx = Math.floor(rx / S.cell), my = Math.floor(ry / S.cell);
  let best = null;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = mx + dx, cy = my + dy, n = hashSeed(`${seed}:storm:${cx}:${cy}`);
    if (n % S.every) continue;
    const a = (n % 360) * Math.PI / 180, f = ((t / S.period) + (n % 1000) / 1000) % 1, along = (f - .5) * S.cell * 1.6, side = (Math.floor(n / 1024) % 100 / 100 - .5) * S.cell * .6;
    const x = cx * S.cell + S.cell / 2 + Math.cos(a) * along - Math.sin(a) * side, y = cy * S.cell + S.cell / 2 + Math.sin(a) * along + Math.cos(a) * side;
    const d = Math.hypot(rx + .5 - x, ry + .5 - y);
    if (d < S.radius && (!best || 1 - d / S.radius > best.strength)) best = { strength: 1 - d / S.radius, windX: Math.cos(a), windY: Math.sin(a), x, y };
  }
  return best;
}
export function fogAround(state, x, y) { return !!state?.fog?.some((f) => Math.hypot(x - f.x, y - f.y) < f.radius); }

// The rogue wave's crest: distance along its heading (section centre is 0), or null between waves. The crest runs from
// one side of the section to the other over `travel` seconds, then the sea is calm until the next cycle.
export function waveCrest(w, clock) {
  const t = (clock + w.phase) % w.period, travel = 46 / SEA_HAZARDS.wave.speed;
  return { cycle: Math.floor((clock + w.phase) / w.period), pos: t < travel ? -23 + t * SEA_HAZARDS.wave.speed : null, until: travel - t };
}

// One tick. `w` = { player, aboard, dodging, move(dx, dy) -> bool, hurt(n, why), hull(n, why), water(x, y) }.
export function tickSeaHazards(state, dt, w) {
  if (!state) return;
  state.clock += dt;
  const p = w.player, px = p.x + .5, py = p.y + .7, H = SEA_HAZARDS, afloat = w.aboard || w.swimming;
  for (const v of state.whirlpools) {
    const dx = v.x - px, dy = v.y - py, d = Math.hypot(dx, dy);
    if (!afloat || d >= v.radius) { v.eyeClock = 0; continue; }
    const k = 1 - d / v.radius, inward = H.whirlpool.pull * k * k + .3, around = H.whirlpool.spin * k * v.dir;
    const mx = (dx / (d || 1) * inward - dy / (d || 1) * around) * dt, my = (dy / (d || 1) * inward + dx / (d || 1) * around) * dt;
    w.move(mx, my);
    if (d < H.whirlpool.eye) {
      v.eyeClock = (v.eyeClock || 0) - dt;
      if (v.eyeClock <= 0) {
        v.eyeClock = H.whirlpool.eyeEvery;
        w.aboard ? w.hull(H.whirlpool.eyeDamage, "whirlpool") : w.hurt(H.whirlpool.eyeDamage, "whirlpool");
        // The eye spits the vessel back out to the rim, the way it came in.
        const a = Math.atan2(py - v.y, px - v.x) + v.dir * 1.2; w.move(Math.cos(a) * H.whirlpool.fling, Math.sin(a) * H.whirlpool.fling);
      }
    }
  }
  if (state.current && afloat) {
    const c = state.current, off = (px - 16) * -c.dy + (py - 16) * c.dx - c.offset;
    if (Math.abs(off) < c.width / 2) w.move(c.dx * H.current.speed * dt, c.dy * H.current.speed * dt);
  }
  for (const q of state.reefs || []) {
    if (!afloat || Math.hypot(px - q.x, py - q.y) >= q.radius) continue;
    q.clock -= dt;
    if (q.clock <= 0) { q.clock = H.reef.every; w.aboard ? w.hull(H.reef.damage, "reef") : w.hurt(H.reef.damage, "reef"); }
  }
  // Fog banks drift and wrap around a 48-tile loop (8 tiles beyond each edge), so a bank leaving one side returns on the other.
  const wrap = (v) => ((v + 8) % 48 + 48) % 48 - 8;
  for (const f of state.fog || []) { f.x = wrap(f.x + f.vx * dt); f.y = wrap(f.y + f.vy * dt); f.swirl = (f.swirl || 0) + dt * .12; }
  // How deep the Wayfarer is in fog (0 clear .. 1 thick), eased so it thickens and thins gradually.
  let depth = 0;
  for (const f of state.fog || []) { const d = Math.hypot(px - f.x, py - f.y) / f.radius; if (d < 1) depth = Math.max(depth, Math.min(1, (1 - d) * 1.8)); }
  state.fogLevel = (state.fogLevel || 0) + (depth - (state.fogLevel || 0)) * Math.min(1, dt * 1.5);
  if (w.storm && afloat) w.move(w.storm.windX * H.storm.wind * w.storm.strength * dt, w.storm.windY * H.storm.wind * w.storm.strength * dt);
  if (w.storm && !state.wave) state.wave = { dx: w.storm.windX, dy: w.storm.windY, period: H.storm.wavePeriod, phase: 0, cycle: -1, hit: -1, storm: true };
  if (state.wave?.storm && !w.storm) state.wave = null;
  if (state.wave) {
    const wv = state.wave, c = waveCrest(wv, state.clock), along = (px - 16) * wv.dx + (py - 16) * wv.dy;
    if (c.pos !== null && wv.hit !== c.cycle && afloat && along <= c.pos && along >= c.pos - H.wave.width) {
      wv.hit = c.cycle;
      if (!w.dodging) { w.aboard ? w.hull(H.wave.damage, "wave") : w.hurt(H.wave.damage, "wave"); for (let i = 0; i < 8; i++) w.move(wv.dx * H.wave.push / 8, wv.dy * H.wave.push / 8); }
      else w.note?.("You drive the skiff through the crest.");
    }
  }
  for (const b of state.bergs) {
    b.spin += dt * .05;
    let nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    if (!clearWater({ tiles: w.tiles }, nx, ny, b.radius)) { b.vx = -b.vx; b.vy = -b.vy; nx = b.x; ny = b.y; }
    for (const o of state.bergs) if (o !== b) { const d = Math.hypot(o.x - nx, o.y - ny); if (d < o.radius + b.radius) { const ux = (nx - o.x) / (d || 1), uy = (ny - o.y) / (d || 1), sp = Math.hypot(b.vx, b.vy); b.vx = ux * sp; b.vy = uy * sp; nx = b.x; ny = b.y; } }
    for (const v of state.whirlpools) { const d = Math.hypot(v.x - nx, v.y - ny); if (d < v.radius + b.radius) { b.vx = (nx - v.x) / (d || 1) * Math.hypot(b.vx, b.vy); b.vy = (ny - v.y) / (d || 1) * Math.hypot(b.vx, b.vy); } }
    b.x = nx; b.y = ny;
    b.cooldown = Math.max(0, b.cooldown - dt);
    const d = Math.hypot(px - b.x, py - b.y);
    if (d < b.radius + .45) {
      const ux = (px - b.x) / (d || 1), uy = (py - b.y) / (d || 1);
      w.move(ux * (b.radius + .5 - d), uy * (b.radius + .5 - d));
      if (b.cooldown <= 0 && afloat) { b.cooldown = H.iceberg.every; const sp = Math.hypot(b.vx, b.vy); b.vx = -ux * sp; b.vy = -uy * sp; w.aboard ? w.hull(H.iceberg.damage, "iceberg") : w.hurt(H.iceberg.damage, "iceberg"); w.move(ux * H.iceberg.bounce, uy * H.iceberg.bounce); }
    }
  }
}

// True when a position is blocked by a drifting iceberg (for the skiff's footprint test).
export function bergAt(state, x, y) { return !!state?.bergs?.some((b) => Math.hypot(x + .5 - b.x, y + .7 - b.y) < b.radius + .3); }

// Supernova fog (release 257; Tim, 2026-10-21): a Void Walker Supernova set off in a section that can hold fog (an open-
// sea section) or that is at least `oceanShare` ocean blankets the section in fog banks for `duration` seconds, fading
// in and out over `fade` s; another Supernova there renews it. Transient like the sea's own fog: nothing is saved.
export const NOVA_FOG = { oceanShare: .7, duration: 30, fade: 3, radius: [7.5, 9.5], drift: .25 };
export function novaFogCapable(map) {
  if (map?.openSea) return true;
  const tiles = map?.tiles || []; if (!tiles.length) return false;
  let ocean = 0; for (const t of tiles) if (DEEP.has(t?.kind)) ocean++;
  return ocean / tiles.length >= NOVA_FOG.oceanShare;
}
// Returns the fog state after a Supernova at (x, y): a fresh blanket, or the existing one renewed.
export function novaFog(state, x, y, seq = 0) {
  if (state) { state.left = NOVA_FOG.duration; return state; }
  const r = rng(`nova-fog:${seq}:${Math.round(x)}:${Math.round(y)}`), a = r() * Math.PI * 2, R = NOVA_FOG.radius, size = () => R[0] + r() * (R[1] - R[0]);
  // One bank on the blast and a ring of six around the section's centre, so the whole section goes grey.
  const fog = [{ x, y, radius: size() }];
  for (let i = 0; i < 6; i++) { const b = a + i * Math.PI / 3; fog.push({ x: 16 + Math.cos(b) * 10, y: 16 + Math.sin(b) * 10, radius: size() }); }
  fog.push({ x: 16, y: 16, radius: size() });
  for (const f of fog) { f.vx = Math.cos(a) * NOVA_FOG.drift; f.vy = Math.sin(a) * NOVA_FOG.drift; f.swirl = r() * 6; }
  return { fog, left: NOVA_FOG.duration, age: 0, alpha: 0, fogLevel: 0 };
}
// One tick; returns null once the fog has cleared. `alpha` (0..1) fades the banks in and out.
export function tickNovaFog(state, dt, player) {
  if (!state) return null;
  state.left -= dt; state.age += dt; if (state.left <= 0) return null;
  state.alpha = Math.max(0, Math.min(1, state.age / NOVA_FOG.fade, state.left / NOVA_FOG.fade));
  const wrap = (v) => ((v + 8) % 48 + 48) % 48 - 8, px = player.x + .5, py = player.y + .7;
  let depth = 0;
  for (const f of state.fog) { f.x = wrap(f.x + f.vx * dt); f.y = wrap(f.y + f.vy * dt); f.swirl += dt * .12; const d = Math.hypot(px - f.x, py - f.y) / f.radius; if (d < 1) depth = Math.max(depth, Math.min(1, (1 - d) * 1.8)); }
  state.fogLevel += (depth * state.alpha - state.fogLevel) * Math.min(1, dt * 1.5);
  return state;
}
