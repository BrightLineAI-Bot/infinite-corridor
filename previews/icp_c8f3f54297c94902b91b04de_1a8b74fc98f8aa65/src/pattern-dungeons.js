// Pattern dungeons (release 147): a catalogue of simple programs from Wolfram's "A New Kind of Science" whose pictures
// become dungeon floors. Elementary and three-colour automata, Life-like rules, two-dimensional growth from one cell,
// Langton's ant and other turmites, and nested substitution figures (Hilbert and dragon curves, Pascal's triangle
// modulo a prime, Sierpinski carpets). Some patterns fill the whole map; for wide ones a window is cut from a larger
// run. Separate pieces of a pattern are joined afterwards by short tunnels (stitchPattern), so the picture survives.

export const PATTERN_CATALOG = [
  // Elementary automata (two colours, nearest neighbours). Rows run from the entry toward the guardian.
  { id: "e90", family: "elementary", rule: 90, seed: "single", name: "Sierpinski Halls" },
  { id: "e18", family: "elementary", rule: 18, seed: "single", name: "Sparse Sierpinski" },
  { id: "e22", family: "elementary", rule: 22, seed: "single", name: "Branching Halls" },
  { id: "e26", family: "elementary", rule: 26, seed: "single", name: "Pennant Halls" },
  { id: "e30", family: "elementary", rule: 30, seed: "single", name: "Chaos Warrens" },
  { id: "e30s", family: "elementary", rule: 30, seed: "scatter", name: "Chaos Warrens" },
  { id: "e45s", family: "elementary", rule: 45, seed: "scatter", name: "Rule 45 Static" },
  { id: "e60", family: "elementary", rule: 60, seed: "single", name: "Sierpinski Slant" },
  { id: "e62", family: "elementary", rule: 62, seed: "single", name: "Terrace Steps" },
  { id: "e73s", family: "elementary", rule: 73, seed: "scatter", name: "Rule 73 Columns" },
  { id: "e94", family: "elementary", rule: 94, seed: "single", name: "Colonnade" },
  { id: "e110", family: "elementary", rule: 110, seed: "single", name: "Rule 110 Wedge" },
  { id: "e110s", family: "elementary", rule: 110, seed: "scatter", name: "Glider Galleries" },
  { id: "e54s", family: "elementary", rule: 54, seed: "scatter", name: "Glider Galleries" },
  { id: "e106s", family: "elementary", rule: 106, seed: "scatter", name: "Drift Galleries" },
  { id: "e126", family: "elementary", rule: 126, seed: "single", name: "Lattice Halls" },
  { id: "e126s", family: "elementary", rule: 126, seed: "scatter", name: "Foam Halls" },
  { id: "e150", family: "elementary", rule: 150, seed: "single", name: "Woven Halls" },
  { id: "e154", family: "elementary", rule: 154, seed: "single", name: "Braided Stairs" },
  { id: "e184s", family: "elementary", rule: 184, seed: "scatter", name: "Traffic Lanes" },
  // Three-colour totalistic automata (NKS chapter 3): the new colour is a digit of the code, read at the sum of three cells.
  { id: "t1599", family: "ternary", code: 1599, name: "Code 1599 Tangle" },
  { id: "t1635", family: "ternary", code: 1635, name: "Code 1635 Nest" },
  { id: "t2040", family: "ternary", code: 2040, name: "Code 2040 Vault" },
  { id: "t777", family: "ternary", code: 777, name: "Code 777 Chevrons" },
  { id: "t1086", family: "ternary", code: 1086, name: "Code 1086 Spires" },
  { id: "t1329", family: "ternary", code: 1329, name: "Code 1329 Ladders" },
  // Additive rules modulo a prime: Pascal's triangle, nested in threes, fives and sevens.
  { id: "p3", family: "pascal", mod: 3, name: "Pascal's Halls, Mod 3" },
  { id: "p5", family: "pascal", mod: 5, name: "Pascal's Halls, Mod 5" },
  { id: "p7", family: "pascal", mod: 7, name: "Pascal's Halls, Mod 7" },
  // Life-like (outer totalistic) rules run from a random soup.
  { id: "lMaze", family: "life", born: [3], survive: [1, 2, 3, 4, 5], fill: .3, steps: 60, floor: 0, name: "Maze (B3/S12345)" },
  { id: "lMazectric", family: "life", born: [3], survive: [1, 2, 3, 4], fill: .3, steps: 60, floor: 0, name: "Mazectric (B3/S1234)" },
  { id: "lAnneal", family: "life", born: [4, 6, 7, 8], survive: [3, 5, 6, 7, 8], fill: .5, steps: 30, floor: 1, name: "Anneal Caves" },
  { id: "lDayNight", family: "life", born: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8], fill: .5, steps: 40, floor: 1, name: "Day & Night" },
  { id: "lDiamoeba", family: "life", born: [3, 5, 6, 7, 8], survive: [5, 6, 7, 8], fill: .53, steps: 30, floor: 1, name: "Diamoeba Pools" },
  { id: "lWalled", family: "life", born: [4, 5, 6, 7, 8], survive: [2, 3, 4, 5], fill: .45, steps: 40, floor: 1, name: "Walled Cities" },
  { id: "lAssim", family: "life", born: [3, 4, 5], survive: [4, 5, 6, 7], fill: .2, steps: 30, floor: 1, name: "Assimilation" },
  // Two-dimensional growth from a single cell (NKS chapter 5): five-neighbour outer totalistic codes. Symmetric figures.
  { id: "g462", family: "growth", code: 462, name: "Snowflake 462" },
  { id: "g942", family: "growth", code: 942, name: "Crystal 942" },
  { id: "g750", family: "growth", code: 750, name: "Frost 750" },
  { id: "g510", family: "growth", code: 510, name: "Bloom 510" },
  { id: "g374", family: "growth", code: 374, name: "Lacework 374" },
  { id: "g758", family: "growth", code: 758, name: "Quilt 758" },
  { id: "g182", family: "growth", code: 182, name: "Thorn 182" },
  // Turmites: Langton's ant and its many-colour relatives. Every square the ant leaves coloured is floor.
  { id: "aRL", family: "ant", turns: "RL", name: "Langton's Ant" },
  { id: "aRLR", family: "ant", turns: "RLR", name: "Ant Tangle (RLR)" },
  { id: "aLLRR", family: "ant", turns: "LLRR", name: "Ant Mirror (LLRR)" },
  { id: "aSquare", family: "ant", turns: "LRRRRRLLR", name: "Ant Square (LRRRRRLLR)" },
  { id: "aTri", family: "ant", turns: "RRLLLRLLLRRR", name: "Ant Delta (RRLLLRLLLRRR)" },
  // Nested substitution figures.
  { id: "nHilbert", family: "hilbert", name: "Hilbert Corridors" },
  { id: "nDragon", family: "dragon", name: "Dragon Fold" },
  { id: "nCarpet", family: "carpet", invert: false, name: "Sierpinski Carpet" },
  { id: "nCantor", family: "carpet", invert: true, name: "Cantor Rooms" },
];

// The organic catalogue (release 148): fewer recognisable figures, more grown and worn shapes. Chaotic rules are drawn
// through a smooth warp so their lines bend; new families add Young's activator–inhibitor model (the spots and stripes
// of animal coats, NKS chapter 8), aggregation (branching growth from sticking particles, chapter 7) and burrowing
// walkers. Histories on layout pool 4 draw from this list; pool 3 keeps PATTERN_CATALOG.
export const ORGANIC_CATALOG = [
  ...["lMaze", "lMazectric", "lAnneal", "lDayNight", "lDiamoeba", "lWalled", "lAssim", "aRL", "aRLR", "aLLRR"].map((id) => PATTERN_CATALOG.find((p) => p.id === id)),
  { id: "lVote", family: "life", born: [5, 6, 7, 8], survive: [4, 5, 6, 7, 8], fill: .52, steps: 20, floor: 1, name: "Vote Caves" },
  { id: "yLeopard", family: "turing", r1: 2, r2: 5, weight: .32, steps: 5, floor: 1, name: "Leopard Rooms" },
  { id: "yZebra", family: "turing", r1: 2.3, r2: 4.5, weight: .55, steps: 5, floor: 0, name: "Zebra Halls" },
  { id: "yBrain", family: "turing", r1: 1.5, r2: 3.5, weight: .45, steps: 6, floor: 1, name: "Brain Coral" },
  { id: "dCoral", family: "dla", seeds: 1, mass: .3, name: "Coral Branches" },
  { id: "dFern", family: "dla", seeds: 4, mass: .32, name: "Frost Ferns" },
  { id: "bWorm", family: "burrow", worms: 5, length: 90, turn: .7, chambers: .04, name: "Worm Burrows" },
  { id: "bRoots", family: "burrow", worms: 10, length: 55, turn: 1.1, chambers: .02, name: "Root Tunnels" },
  { id: "w30", family: "elementary", rule: 30, seed: "scatter", warp: 4, name: "Melted Chaos" },
  { id: "w110", family: "elementary", rule: 110, seed: "scatter", warp: 4, name: "Drifting Gliders" },
  { id: "w54", family: "elementary", rule: 54, seed: "scatter", warp: 5, name: "Kelp Galleries" },
  { id: "w106", family: "elementary", rule: 106, seed: "scatter", warp: 4, name: "Rippled Drift" },
  { id: "w45", family: "elementary", rule: 45, seed: "scatter", warp: 5, name: "Weathered Static" },
  { id: "w73", family: "elementary", rule: 73, seed: "scatter", warp: 5, name: "Bent Columns" },
  { id: "w126", family: "elementary", rule: 126, seed: "scatter", warp: 4, name: "Sea Foam" },
  { id: "w90", family: "elementary", rule: 90, seed: "single", warp: 5, name: "Crumbled Sierpinski" },
  { id: "w1599", family: "ternary", code: 1599, seed: "scatter", warp: 4, name: "Tangled Roots" },
  { id: "w2040", family: "ternary", code: 2040, seed: "scatter", warp: 4, name: "Washed Vaults" },
];

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Smooth value noise in [-1, 1] on a lattice of `cell` tiles.
function noiseField(w, h, rand, cell) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, v = Array.from({ length: gw * gh }, () => rand() * 2 - 1);
  return (x, y) => { const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), at = (a, b) => v[(iy + b) * gw + ix + a];
    return (at(0, 0) * (1 - sx) + at(1, 0) * sx) * (1 - sy) + (at(0, 1) * (1 - sx) + at(1, 1) * sx) * sy; };
}

// Runs one-dimensional automata. `step(l,c,r)` gives the next colour; returns `rows` rows of width `width`.
function run1d(width, rows, first, step) {
  const out = []; let row = first;
  for (let y = 0; y < rows; y++) {
    out.push(row);
    const next = new Uint8Array(width);
    for (let x = 0; x < width; x++) next[x] = step(x > 0 ? row[x - 1] : 0, row[x], x < width - 1 ? row[x + 1] : 0);
    row = next;
  }
  return out;
}

// Carves the chosen pattern into grid `g` (1 = floor). Returns the pattern's catalogue entry.
export function carvePattern(g, w, h, rand, start, goal, carve, choice = null, catalog = PATTERN_CATALOG) {
  const pick = choice || catalog[Math.floor(rand() * catalog.length)];
  if (pick.warp) {
    // Draw the pattern unbent, then read it back through a smooth displacement so straight lines meander.
    const t = new Uint8Array(w * h);
    carvePattern(t, w, h, rand, start, goal, (x, y) => { if (x > 0 && y > 0 && x < w - 1 && y < h - 1) t[y * w + x] = 1; }, { ...pick, warp: 0 });
    const nx = noiseField(w, h, rand, 9), ny = noiseField(w, h, rand, 9);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { const sx = Math.round(x + pick.warp * nx(x, y)), sy = Math.round(y + pick.warp * ny(x, y)); if (sx > 0 && sy > 0 && sx < w - 1 && sy < h - 1 && t[sy * w + sx]) carve(x, y); }
    return pick;
  }
  const flip = start.y > goal.y, mirror = start.x > goal.x;
  // Places a pattern cell (cx, cy) as a bw×bh block on a pitch of 2, oriented so time runs from the entry.
  const block = (cx, cy, bw = 3, bh = 2) => {
    const tx = 2 + cx * 2, ty = 2 + cy * 2;
    for (let dy = 0; dy < bh; dy++) for (let dx = 0; dx < bw; dx++) { const x = mirror ? w - 1 - (tx + dx) : tx + dx, y = flip ? h - 1 - (ty + dy) : ty + dy; carve(x, y); }
  };
  const cw = Math.max(8, Math.floor((w - 4) / 2)), ch = Math.max(6, Math.floor((h - 4) / 2));
  const blit1d = (rows) => {
    const live = rows.reduce((a, r) => a + r.reduce((b, v) => b + (v ? 1 : 0), 0), 0) / (cw * ch), open = live > .45 ? 0 : 1;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if ((rows[y][x] ? 1 : 0) === open) block(x, y);
  };
  // Wide runs, then a window cut from them, so the edges are true pattern rather than a wall.
  const wide = cw * 3, cut = (rows, off) => rows.map((r) => r.slice(off, off + cw));
  const offset = () => Math.floor(cw + (rand() - .5) * cw * .8);
  if (pick.family === "elementary") {
    const first = new Uint8Array(wide);
    if (pick.seed === "single") first[Math.floor(wide / 2)] = 1; else for (let x = 0; x < wide; x++) first[x] = rand() < .3 ? 1 : 0;
    // Rules that turn empty ground black (bit 0) are drawn on alternate rows in negative, as Wolfram does.
    const odd = pick.rule & 1;
    const rows = run1d(wide, ch, first, (l, c, r) => (pick.rule >> (l << 2 | c << 1 | r)) & 1);
    if (odd) rows.forEach((r, y) => { if (y % 2) for (let x = 0; x < r.length; x++) r[x] ^= 1; });
    blit1d(cut(rows, pick.seed === "single" ? Math.floor(wide / 2 - cw / 2 + (rand() - .5) * cw * .4) : offset()));
  } else if (pick.family === "ternary") {
    const first = new Uint8Array(wide);
    if (pick.seed === "scatter") for (let x = 0; x < wide; x++) first[x] = rand() < .4 ? 1 + Math.floor(rand() * 2) : 0; else first[Math.floor(wide / 2)] = 1;
    const digit = (s) => Math.floor(pick.code / 3 ** s) % 3;
    blit1d(cut(run1d(wide, ch, first, (l, c, r) => digit(l + c + r)), Math.floor(wide / 2 - cw / 2)));
  } else if (pick.family === "pascal") {
    const first = new Uint8Array(wide); first[Math.floor(wide / 2)] = 1;
    blit1d(cut(run1d(wide, ch, first, (l, c, r) => (l + r) % pick.mod), Math.floor(wide / 2 - cw / 2 + (rand() - .5) * cw * .5)));
  } else if (pick.family === "life") {
    let cells = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) cells[y * w + x] = rand() < pick.fill ? 1 : 0;
    const born = new Set(pick.born), survive = new Set(pick.survive);
    for (let s = 0; s < pick.steps; s++) {
      const next = new Uint8Array(w * h);
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && cells[(y + dy) * w + x + dx]) n++;
        next[y * w + x] = cells[y * w + x] ? (survive.has(n) ? 1 : 0) : (born.has(n) ? 1 : 0);
      }
      cells = next;
    }
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) if (cells[y * w + x] === pick.floor) carve(x, y);
  } else if (pick.family === "growth") {
    const gw = Math.floor((w - 3) / 2), gh = Math.floor((h - 3) / 2), steps = Math.floor(Math.min(gw, gh) / 2) - 1;
    let cells = new Uint8Array(gw * gh); cells[(gh >> 1) * gw + (gw >> 1)] = 1;
    for (let s = 0; s < steps; s++) {
      const next = new Uint8Array(gw * gh);
      for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) { const n = cells[y * gw + x - 1] + cells[y * gw + x + 1] + cells[(y - 1) * gw + x] + cells[(y + 1) * gw + x]; next[y * gw + x] = (pick.code >> (2 * n + cells[y * gw + x])) & 1; }
      cells = next;
    }
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (cells[y * gw + x]) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) carve(2 + x * 2 + dx, 2 + y * 2 + dy);
  } else if (pick.family === "ant") {
    const n = pick.turns.length, col = new Uint8Array(w * h);
    let x = w >> 1, y = h >> 1, d = Math.floor(rand() * 4);
    const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
    for (let s = 0; s < 40000; s++) {
      const i = y * w + x, c = col[i];
      d = (d + (pick.turns[c] === "R" ? 1 : 3)) % 4; col[i] = (c + 1) % n;
      x += DX[d]; y += DY[d];
      if (x < 2 || y < 2 || x > w - 3 || y > h - 3) break;
    }
    for (let i = 0; i < w * h; i++) if (col[i] % 2) carve(i % w, Math.floor(i / w));
  } else if (pick.family === "hilbert") {
    const span = Math.min(w, h) - 4, order = span >= 48 ? 4 : 3, cells = 2 ** order, pitch = Math.floor(span / cells), ox = 2 + Math.floor((w - 4 - pitch * cells) / 2), oy = 2 + Math.floor((h - 4 - pitch * cells) / 2);
    const pt = (i) => { let x = 0, y = 0, t = i; for (let s = 1; s < cells; s *= 2) { const rx = 1 & (t >> 1), ry = 1 & (t ^ rx); if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } [x, y] = [y, x]; } x += s * rx; y += s * ry; t >>= 2; } return { x: ox + x * pitch + (pitch >> 1), y: oy + y * pitch + (pitch >> 1) }; };
    const wide2 = pitch >= 4 ? 2 : 1;
    for (let i = 1; i < cells * cells; i++) { const a = pt(i - 1), b = pt(i), n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)); for (let k = 0; k <= n; k++) for (let q = 0; q < wide2; q++) { const px = a.x + Math.sign(b.x - a.x) * k, py = a.y + Math.sign(b.y - a.y) * k; carve(px + (a.y === b.y ? 0 : q), py + (a.x === b.x ? 0 : q)); } }
  } else if (pick.family === "dragon") {
    // The paper-folding sequence: turn i is right when the bit above the lowest set bit of i is 0.
    // The largest fold that still leaves walls between its corridors (a scale of at least two tiles per step).
    let pts, minX, maxX, minY, maxY, step = 0;
    for (let k = 10; k >= 4 && step < 2; k--) {
      pts = [{ x: 0, y: 0 }]; let d = 0;
      for (let i = 1; i <= 2 ** k; i++) { const p = pts[pts.length - 1]; pts.push({ x: p.x + [1, 0, -1, 0][d], y: p.y + [0, 1, 0, -1][d] }); d = (d + ((((i & -i) << 1) & i) ? 3 : 1)) % 4; }
      minX = Math.min(...pts.map((p) => p.x)); maxX = Math.max(...pts.map((p) => p.x)); minY = Math.min(...pts.map((p) => p.y)); maxY = Math.max(...pts.map((p) => p.y));
      step = Math.min(Math.floor((w - 6) / (maxX - minX + 1)), Math.floor((h - 6) / (maxY - minY + 1)));
    }
    step = Math.max(1, step);
    const ox = 3 + Math.floor((w - 6 - step * (maxX - minX)) / 2), oy = 3 + Math.floor((h - 6 - step * (maxY - minY)) / 2);
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; for (let k = 0; k <= step; k++) carve(ox + (a.x - minX) * step + (b.x - a.x) * k, oy + (a.y - minY) * step + (b.y - a.y) * k); }
  } else if (pick.family === "turing") {
    // Young's model: each cell is pushed on by active cells within r1 and off by those in the ring out to r2.
    let c = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) c[i] = rand() < .5 ? 1 : 0;
    const near = [], far = [], R = Math.ceil(pick.r2);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const d = Math.hypot(dx, dy); if (d <= pick.r1) near.push(dy * w + dx); else if (d <= pick.r2) far.push(dy * w + dx); }
    for (let s = 0; s < pick.steps; s++) {
      const next = c.slice();
      for (let y = R; y < h - R; y++) for (let x = R; x < w - R; x++) { const i = y * w + x; let a = 0, b = 0; for (const o of near) a += c[i + o]; for (const o of far) b += c[i + o]; const v = a - pick.weight * b; next[i] = v > 0 ? 1 : v < 0 ? 0 : c[i]; }
      c = next;
    }
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) if (c[y * w + x] === pick.floor) carve(x, y);
  } else if (pick.family === "dla") {
    // Aggregation on a grid of 2×2 tiles: wandering particles stick when they touch the growth.
    const gw = Math.floor((w - 4) / 2), gh = Math.floor((h - 4) / 2), cl = new Uint8Array(gw * gh);
    const toCell = (p) => ({ x: Math.max(0, Math.min(gw - 1, Math.floor((p.x - 2) / 2))), y: Math.max(0, Math.min(gh - 1, Math.floor((p.y - 2) / 2))) });
    const s0 = toCell(start); cl[s0.y * gw + s0.x] = 1;
    for (let k = 1; k < pick.seeds; k++) cl[Math.floor(rand() * gh) * gw + Math.floor(rand() * gw)] = 1;
    const target = Math.floor(gw * gh * pick.mass); let mass = pick.seeds, budget = 400000;
    const touches = (x, y) => (x > 0 && cl[y * gw + x - 1]) || (x < gw - 1 && cl[y * gw + x + 1]) || (y > 0 && cl[(y - 1) * gw + x]) || (y < gh - 1 && cl[(y + 1) * gw + x]);
    while (mass < target && budget > 0) {
      let x = Math.floor(rand() * gw), y = Math.floor(rand() * gh);
      if (cl[y * gw + x]) continue;
      for (let s = 0; s < 600 && budget > 0; s++, budget--) {
        if (touches(x, y)) { cl[y * gw + x] = 1; mass++; break; }
        const d = Math.floor(rand() * 4); x = Math.max(0, Math.min(gw - 1, x + [1, -1, 0, 0][d])); y = Math.max(0, Math.min(gh - 1, y + [0, 0, 1, -1][d]));
      }
    }
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (cl[y * gw + x]) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) carve(2 + x * 2 + dx, 2 + y * 2 + dy);
  } else if (pick.family === "burrow") {
    // Burrowers: each sets out from the entry or from a point already dug, turning a little at every step,
    // leaning toward the guardian, now and then hollowing a chamber.
    const dug = [{ x: start.x, y: start.y }], disc = (cx, cy, r) => { for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) if (dx * dx + dy * dy <= r * r + .5) carve(Math.round(cx + dx), Math.round(cy + dy)); };
    for (let k = 0; k < pick.worms; k++) {
      const from = k === 0 ? dug[0] : dug[Math.floor(rand() * dug.length)];
      let x = from.x, y = from.y, a = k === 0 ? Math.atan2(goal.y - y, goal.x - x) : rand() * Math.PI * 2, wid = .6 + rand() * .9;
      for (let s = 0; s < pick.length; s++) {
        a += (rand() - .5) * pick.turn; const toward = Math.atan2(goal.y - y, goal.x - x); if (k === 0) a += Math.sin(toward - a) * .15;
        x += Math.cos(a); y += Math.sin(a);
        if (x < 3 || x > w - 4) { a = Math.PI - a; x = Math.max(3, Math.min(w - 4, x)); }
        if (y < 3 || y > h - 4) { a = -a; y = Math.max(3, Math.min(h - 4, y)); }
        wid = Math.max(.5, Math.min(1.8, wid + (rand() - .5) * .3));
        disc(x, y, wid); if (s % 4 === 0) dug.push({ x: Math.round(x), y: Math.round(y) });
        if (rand() < pick.chambers) disc(x, y, 2 + rand() * 2);
      }
    }
  } else if (pick.family === "carpet") {
    const scale = 1 + Math.floor(rand() * 2), sx = Math.floor(rand() * 27), sy = Math.floor(rand() * 27);
    const hole = (x, y) => { for (let a = x, b = y; a > 0 || b > 0; a = Math.floor(a / 3), b = Math.floor(b / 3)) if (a % 3 === 1 && b % 3 === 1) return true; return false; };
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { const isHole = hole((Math.floor(x / scale) + sx) % 27, (Math.floor(y / scale) + sy) % 27); if (isHole === pick.invert) carve(x, y); }
  }
  return pick;
}

// Joins the separate pieces of a pattern to the piece the entry stands in, with the shortest tunnel through rock,
// one piece at a time. Specks smaller than `minSize` cells are left as rock.
export function stitchPattern(g, w, h, start, minSize = 4) {
  const comp = new Int32Array(w * h).fill(-1), sizes = [];
  for (let i = 0; i < w * h; i++) if (g[i] && comp[i] < 0) {
    const id = sizes.length, q = [i]; comp[i] = id;
    for (let k = 0; k < q.length; k++) { const c = q[k], x = c % w, y = Math.floor(c / w); for (const [dx, dy] of N4) { const n = (y + dy) * w + x + dx; if (x + dx > 0 && y + dy > 0 && x + dx < w - 1 && y + dy < h - 1 && g[n] && comp[n] < 0) { comp[n] = id; q.push(n); } } }
    sizes.push(q.length);
  }
  for (let i = 0; i < w * h; i++) if (g[i] && sizes[comp[i]] < minSize && i !== start.y * w + start.x) g[i] = 0;
  const joined = new Uint8Array(w * h);
  for (let guard = 0; guard < 400; guard++) {
    // Flood everything already joined to the entry, then search outward through rock for the nearest other piece.
    joined.fill(0); const q = [start.y * w + start.x]; joined[q[0]] = 1;
    for (let k = 0; k < q.length; k++) { const c = q[k], x = c % w, y = Math.floor(c / w); for (const [dx, dy] of N4) { const n = (y + dy) * w + x + dx; if (x + dx > 0 && y + dy > 0 && x + dx < w - 1 && y + dy < h - 1 && g[n] && !joined[n]) { joined[n] = 1; q.push(n); } } }
    const from = new Int32Array(w * h).fill(-2), front = [];
    for (const c of q) { from[c] = -1; front.push(c); }
    let hit = -1;
    for (let k = 0; k < front.length && hit < 0; k++) { const c = front[k], x = c % w, y = Math.floor(c / w); for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, n = ny * w + nx; if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1 || from[n] !== -2) continue; from[n] = c; if (g[n]) { hit = n; break; } front.push(n); } }
    if (hit < 0) return;
    for (let c = from[hit]; c >= 0 && !joined[c]; c = from[c]) g[c] = 1;
  }
}
