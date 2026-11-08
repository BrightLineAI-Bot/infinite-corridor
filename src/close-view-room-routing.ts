import { rng } from "./random.ts";

// Proving Ground candidates only. The production adoption constants remain 4 / 9.
// Original implementation of a room-region / connector graph; no upstream code is ported.
export const CLOSE_VIEW_ROOM_ROUTING = Object.freeze({
  revision: 1, keepVersion: 5, pentagonVersion: 10,
  columns: 3, rows: 3, corridorWidth: 2, extraConnectors: [1, 2],
});

// Nine separated rooms, a randomized spanning tree, then one or two loop edges.
// Work is bounded by nine rooms, twelve candidate edges and the supplied map area.
// Floor-local stages never share RNG state with decoration or another floor.
export function layCloseViewRooms(base, floor, W, H, style, arrive, keepOpen = []) {
  if (!Number.isInteger(W) || !Number.isInteger(H) || W < 33 || H < 30 || W > 64 || H > 64) {
    throw new RangeError("Close View room routing requires a 33–64 by 30–64 floor.");
  }
  const C = CLOSE_VIEW_ROOM_ROUTING, key = `${base}:close-view-rooms:v${C.revision}:floor:${floor}`;
  const roomsRandom = rng(`${key}:rooms`), connectorsRandom = rng(`${key}:connectors`);
  const portsRandom = rng(`${key}:ports`), materialsRandom = rng(`${key}:materials`);
  const grid = new Array(W * H).fill(1), room = new Array(W * H).fill(-1), leaves = [], nodes = [], candidates = [];
  const at = (x, y) => y * W + x;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const open = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) grid[at(x, y)] = 0; };
  for (let row = 0; row < C.rows; row++) for (let col = 0; col < C.columns; col++) {
    const x0 = 1 + Math.floor(col * (W - 2) / C.columns), x1 = Math.floor((col + 1) * (W - 2) / C.columns);
    const y0 = 1 + Math.floor(row * (H - 2) / C.rows), y1 = Math.floor((row + 1) * (H - 2) / C.rows);
    const box = { x0: x0 + 1 + Math.floor(roomsRandom() * 2), y0: y0 + 1 + Math.floor(roomsRandom() * 2), x1: x1 - 1, y1: y1 - 1 };
    const id = leaves.length; leaves.push(box);
    nodes.push({ id, x: (box.x0 + box.x1) >> 1, y: (box.y0 + box.y1) >> 1 });
    for (let y = box.y0; y <= box.y1; y++) for (let x = box.x0; x <= box.x1; x++) { open(x, y); room[at(x, y)] = id; }
    if (col) candidates.push({ a: id - 1, b: id });
    if (row) candidates.push({ a: id - C.columns, b: id });
  }
  // Fisher–Yates, with a fixed edge set: no rejection loop or time cutoff.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(connectorsRandom() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const parent = nodes.map((n) => n.id), root = (id) => { while (parent[id] !== id) id = parent[id]; return id; };
  const edges = [], extra = [];
  for (const edge of candidates) {
    const a = root(edge.a), b = root(edge.b);
    if (a !== b) { parent[a] = b; edges.push({ ...edge, loop: false }); }
    else extra.push(edge);
  }
  const loops = C.extraConnectors[0] + Math.floor(connectorsRandom() * (C.extraConnectors[1] - C.extraConnectors[0] + 1));
  edges.push(...extra.slice(0, loops).map((edge) => ({ ...edge, loop: true })));
  const hall = (a, b, horizontalFirst) => {
    let x = a.x, y = a.y;
    const stamp = () => { for (let dy = 0; dy < C.corridorWidth; dy++) for (let dx = 0; dx < C.corridorWidth; dx++) open(x + dx, y + dy); };
    const step = (axis, end) => { while ((axis === "x" ? x : y) !== end) { if (axis === "x") x += Math.sign(end - x); else y += Math.sign(end - y); stamp(); } };
    stamp();
    if (horizontalFirst) { step("x", b.x); step("y", b.y); } else { step("y", b.y); step("x", b.x); }
  };
  for (const edge of edges) hall(nodes[edge.a], nodes[edge.b], connectorsRandom() < .5);
  // Reserve each actual arrival / door and connect it to its nearest room. No connector can
  // replace a semantic destination or erase its lock; all boundary cells stay shut except ports.
  const ports = [arrive, ...keepOpen].filter(Boolean);
  if (ports.length > 32) throw new RangeError("Close View room routing accepts at most 32 reserved ports.");
  for (const port of ports) {
    if (!Number.isInteger(port.x) || !Number.isInteger(port.y) || port.x < 0 || port.y < 0 || port.x >= W || port.y >= H) throw new RangeError("Invalid room routing port.");
    const inside = { x: clamp(port.x, 1, W - 2), y: clamp(port.y, 1, H - 2) };
    const targets = leaves.map((box, id) => ({ id, x: clamp(inside.x, box.x0, box.x1), y: clamp(inside.y, box.y0, box.y1) }));
    targets.sort((a, b) => Math.abs(a.x - inside.x) + Math.abs(a.y - inside.y) - Math.abs(b.x - inside.x) - Math.abs(b.y - inside.y) || a.id - b.id);
    hall(inside, targets[0], portsRandom() < .5);
    grid[at(port.x, port.y)] = port.v ?? 0;
  }
  const big = leaves.reduce((best, box, i) => (box.x1 - box.x0 + 1) * (box.y1 - box.y0 + 1) > (leaves[best].x1 - leaves[best].x0 + 1) * (leaves[best].y1 - leaves[best].y0 + 1) ? i : best, 0);
  const mat = leaves.map((box, id) => id === big ? style.hall : style.rooms[Math.floor(materialsRandom() * style.rooms.length)]);
  return { W, H, grid, room, leaves, mat, walls: [], routing: { revision: C.revision, nodes, edges, ports: ports.map(({ x, y }) => ({ x, y })) } };
}
