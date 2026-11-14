import { rng, hashSeed } from "./random.js?v=r955-4e3605d4beed";
import { MAX_LEVEL, interiorTerrain, interiorTileLevel } from "./landscape.js?v=r955-4e3605d4beed";

// Proving Ground candidates only. The production adoption constants remain 4 / 9.
// Original implementation of a room-region / connector graph; no upstream code is ported.
export const CLOSE_VIEW_ROOM_ROUTING = Object.freeze({
  revision: 2, keepVersion: 5, pentagonVersion: 10,
  corridorWidth: 2, extraConnectors: [1, 2], maxRooms: 7, minCircuitSide: 10,
});

// Three finite room grammars; local streams separate topology, geometry and appearance.
const GRAMMARS = [
  { id: "staggered-spine", points: [[.24,.22],[.5,.22],[.76,.22],[.5,.5],[.24,.76],[.5,.76],[.76,.76]], tree: [[0,1],[1,2],[1,3],[3,5],[4,5],[5,6]], loops: [[0,4],[2,6]] },
  { id: "offset-ring", points: [[.22,.24],[.5,.2],[.78,.28],[.78,.72],[.5,.8],[.22,.7]], tree: [[0,1],[1,2],[2,3],[3,4],[4,5]], loops: [[5,0],[1,4]] },
  { id: "paired-wings", points: [[.22,.22],[.22,.5],[.22,.78],[.5,.5],[.78,.22],[.78,.5],[.78,.78]], tree: [[0,1],[1,2],[1,3],[3,5],[4,5],[5,6]], loops: [[0,4],[2,6]] },
];
export function layCloseViewRooms(base, floor, W, H, style, arrive, keepOpen = []) {
  if (!Number.isInteger(W) || !Number.isInteger(H) || W < 33 || H < 30 || W > 64 || H > 64) throw new RangeError("Close View room routing requires a 33–64 by 30–64 floor.");
  const C = CLOSE_VIEW_ROOM_ROUTING, key = `${base}:close-view-rooms:v${C.revision}:floor:${floor}`;
  const roomsRandom = rng(`${key}:rooms`), connectorsRandom = rng(`${key}:connectors`);
  const portsRandom = rng(`${key}:ports`), materialsRandom = rng(`${key}:materials`);
  const grammar = GRAMMARS[hashSeed(`${key}:grammar`) % GRAMMARS.length], reflect = hashSeed(`${key}:orientation`) & 1;
  const grid = new Array(W * H).fill(1), room = new Array(W * H).fill(-1), leaves = [], nodes = [];
  const at = (x, y) => y * W + x, clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const open = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) grid[at(x, y)] = 0; };
  for (const [px, py] of grammar.points) {
    const id = nodes.length, cx = Math.round((reflect ? 1-px : px) * (W-1)), cy = Math.round(py * (H-1));
    const width = 5 + Math.floor(roomsRandom()*3), height = 5 + Math.floor(roomsRandom()*3);
    const x0 = clamp(cx - (width>>1) + Math.floor(roomsRandom()*3)-1, 2, W-width-2);
    const y0 = clamp(cy - (height>>1) + Math.floor(roomsRandom()*3)-1, 2, H-height-2);
    const box = { x0, y0, x1:x0+width-1, y1:y0+height-1 }, shape = Math.floor(roomsRandom()*3);
    leaves.push(box); nodes.push({ id, x:(box.x0+box.x1)>>1, y:(box.y0+box.y1)>>1, shape, role:id===3?'landmark':'chamber' });
    for(let y=box.y0;y<=box.y1;y++)for(let x=box.x0;x<=box.x1;x++) {
      if(shape && (x===box.x0||x===box.x1) && (y===box.y0||y===box.y1))continue;
      if(shape===2 && x===box.x0 && y===box.y0+1)continue;
      open(x,y);room[at(x,y)]=id;
    }
  }
  const loops = grammar.id === "offset-ring" ? 2 : 1 + Math.floor(connectorsRandom()*2);
  const edges = [...grammar.tree.map(([a,b])=>({a,b,loop:false})), ...grammar.loops.slice(0,loops).map(([a,b])=>({a,b,loop:true}))];
  const hall = (a, b, horizontalFirst) => {
    let x = a.x, y = a.y;
    const stamp = () => { for (let dy = 0; dy < C.corridorWidth; dy++) for (let dx = 0; dx < C.corridorWidth; dx++) open(x + dx, y + dy); };
    const step = (axis, end) => { while ((axis === "x" ? x : y) !== end) { if (axis === "x") x += Math.sign(end - x); else y += Math.sign(end - y); stamp(); } };
    stamp();
    if (horizontalFirst) { step("x", b.x); step("y", b.y); } else { step("y", b.y); step("x", b.x); }
  };
  for (const edge of edges) hall(nodes[edge.a], nodes[edge.b], connectorsRandom() < .5);
  // Three-wide junction/landing relief; no new blocked prop is placed in these pockets.
  for (const node of nodes) for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)open(node.x+dx,node.y+dy);
  // Reserve each actual arrival / door and connect it to its nearest room. No connector can
  // replace a semantic destination or erase its lock; all boundary cells stay shut except ports.
  const ports = [arrive, ...keepOpen].filter(Boolean);
  if (ports.length > 32) throw new RangeError("Close View room routing accepts at most 32 reserved ports.");
  for (const port of ports) {
    if (!Number.isInteger(port.x) || !Number.isInteger(port.y) || port.x < 0 || port.y < 0 || port.x >= W || port.y >= H) throw new RangeError("Invalid room routing port.");
    const inside = { x: clamp(port.x, 1, W - 2), y: clamp(port.y, 1, H - 2) };
    const targets = leaves.map((box, id) => ({ id, x: clamp(inside.x, box.x0, box.x1), y: clamp(inside.y, box.y0, box.y1) }));
    targets.sort((a, b) => Math.abs(a.x - inside.x) + Math.abs(a.y - inside.y) - Math.abs(b.x - inside.x) - Math.abs(b.y - inside.y) || a.id - b.id);
    hall(inside, nodes[targets[0].id], portsRandom() < .5);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)open(inside.x+dx,inside.y+dy);
    grid[at(port.x, port.y)] = port.v ?? 0;
  }
  const big = leaves.reduce((best, box, i) => (box.x1 - box.x0 + 1) * (box.y1 - box.y0 + 1) > (leaves[best].x1 - leaves[best].x0 + 1) * (leaves[best].y1 - leaves[best].y0 + 1) ? i : best, 0);
  const mat = leaves.map((box, id) => id === big ? style.hall : style.rooms[Math.floor(materialsRandom() * style.rooms.length)]);
  return { W, H, grid, room, leaves, mat, walls: [], routing: { revision: C.revision, grammar: grammar.id, nodes, edges, ports: ports.map(({ x, y }) => ({ x, y })) } };
}


export const routingKeepAppearance = (base, version) => version === CLOSE_VIEW_ROOM_ROUTING.keepVersion
  && /:keep:\d+r?$/.test(base) && hashSeed(`${base}:appearance:v1`) % 4 === 0
  ? { version: 1, kind: "biomechanical-keep" } : null;
export const biomechanicalKeep = appearance => appearance?.version === 1 && appearance.kind === "biomechanical-keep";

const PADDING_DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const PADDING_TILE_KEYS = new Set(["x", "y", "kind", "detail", "blocked", "doorway", "elev", "slope"]);
const PADDING_FRONT = [-2, -1, 0, 1, 2];

// Select from the generator's immutable result. Callers may finish geometry-dependent
// object dressing against that result, then apply the returned footprint once, last.
export function roomPaddingFootprint(map, reserved = [], treasure = () => false) {
  const {width, height, tiles} = map;
  const plain = tile => tile && !tile.doorway && !tile.slope && Object.keys(tile).every(key => PADDING_TILE_KEYS.has(key));
  for (let y = 3; y < height - 3; y++) for (let x = 3; x < width - 3; x++) {
    for (const [dx, dy] of PADDING_DIRECTIONS) {
      const tile = (depth, side) => {
        const tx = x + depth * dx - side * dy, ty = y + depth * dy + side * dx;
        return tiles[ty * width + tx];
      };
      const floor = tile(-1, 0);
      if (!plain(floor) || floor.blocked || !/Floor$/.test(floor.kind)) continue;
      const sameFloor = (depth, side) => {
        const next = tile(depth, side);
        return plain(next) && !next.blocked && next.kind === floor.kind && next.elev === floor.elev;
      };
      const wall = (depth, side) => {
        const next = tile(depth, side);
        return plain(next) && next.blocked && (next.kind === "keepWall" || next.kind === "cellarWall");
      };
      if (!PADDING_FRONT.every(side => sameFloor(-2, side) && sameFloor(-1, side) && wall(0, side) && wall(1, side))) continue;
      const cells = [-1, 0, 1].map(side => tile(0, side));
      if (reserved.some(point => point && Math.hypot(point.x - x, point.y - y) < 4) ||
          cells.some(cell => treasure(cell.x, cell.y))) continue;
      return {
        cells: cells.map(({x, y}) => ({x, y})),
        walls: cells.map(cell => ({...cell})),
        floor: {kind: floor.kind, elev: floor.elev},
        approach: {x: floor.x, y: floor.y},
        direction: {x: dx, y: dy},
      };
    }
  }
  return null;
}
export function applyRoomPadding(map, footprint) {
  let tiles = null;
  for (const [index, wall] of footprint.walls.entries()) {
    const cell = footprint.cells[index];
    const i = cell.y * map.width + cell.x;
    const current = map.tiles[i];
    const keys = Object.keys(wall);
    // A persistent terrain overlay owns its tile. Preserve the rest of the recess
    // so a change to one cell cannot put a wall through a saved actor in another.
    if (!current || Object.keys(current).length !== keys.length ||
        keys.some(key => !Object.hasOwn(current, key) || current[key] !== wall[key])) continue;
    tiles ??= map.tiles.slice();
    tiles[i] = { ...current, ...footprint.floor, blocked: false };
  }
  if (tiles) map.tiles = tiles;
}

// Exactly two bounded distance maps plus one <=4096-cell scan. Missing safe pairs are explicit.
export function routingStairPair(base, a, b, fromA, fromB, portsA, portsB, terrainBase) {
  if(a.W!==b.W||a.H!==b.H)return {reason:"different floor dimensions"};
  const W=a.W,H=a.H, distance=(F,start)=>{
    const d=new Int32Array(W*H).fill(-1),q=[start.y*W+start.x];d[q[0]]=0;
    for(let i=0;i<q.length;i++){const k=q[i],x=k%W,y=(k/W)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*W+nx;if(nx<1||ny<1||nx>=W-1||ny>=H-1||d[n]>=0||F.grid[n]!==0)continue;d[n]=d[k]+1;q.push(n);}}
    return d;
  };
  const da=distance(a,fromA),db=distance(b,fromB),hash=k=>hashSeed(`${terrainBase}:interior-terrain:v1:${k}`);
  // The inherited terrain ramp strip is shared by a site's floors. Stay wholly on a flat
  // side; actual post-terrain tests validate this against addInteriorTerrain's sampler.
  const level=2+hash("level")%2, vertical=!!(hash("axis")&1), edge=3+hash("edge")%Math.max(1,(vertical?W:H)-8);
  const ports=[...portsA,...portsB];
  let best=null,score=-1;
  for(let y=3;y<H-3;y++)for(let x=3;x<W-3;x++){
    const k=y*W+x,axis=vertical?x:y;
    if(da[k]<CLOSE_VIEW_ROOM_ROUTING.minCircuitSide||db[k]<CLOSE_VIEW_ROOM_ROUTING.minCircuitSide||axis+1>=edge&&axis-1<=edge+level)continue;
    if(ports.some(p=>p&&Math.max(Math.abs(p.x-x),Math.abs(p.y-y))<4))continue;
    let clear=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(a.grid[(y+dy)*W+x+dx]!==0||b.grid[(y+dy)*W+x+dx]!==0)clear=false;
    if(!clear)continue;
    const rank=Math.min(da[k],db[k])*10000+(hashSeed(`${base}:optional-stair:${x},${y}`)%10000);
    if(rank>score){score=rank;best={x,y,walkA:da[k],walkB:db[k]};}
  }
  return best||{reason:"no separated common flat landing"};
}
export const routingNearLanding = (points,x,y) => (points||[]).some(p=>Math.max(Math.abs(p.x-x),Math.abs(p.y-y))<=1);


const CRAWL_DIRECTIONS = [
  { dx: 0, dy: -1, rampDir: "north" },
  { dx: 1, dy: 0, rampDir: "east" },
  { dx: 0, dy: 1, rampDir: "south" },
  { dx: -1, dy: 0, rampDir: "west" },
];
const CRAWL_WALL_KINDS = new Set(["keepWall", "cellarWall"]);
const crawlPoint = ({ x, y }) => ({ x, y });

// Find an optional shortcut between two landings already linked by a safe walk.
// The first step is a ramp and the far lip drops one level onto existing floor.
export function carveCloseViewCrawl(map, key, reserved = []) {
  if (!interiorTerrain(map) || map.tiles.length > 4096) return null;
  const { width, height, tiles } = map;
  const index = (x, y) => y * width + x;
  const tileAt = (x, y) => x >= 0 && y >= 0 && x < width && y < height ? tiles[index(x, y)] : null;
  const floor = tile => tile && !tile.blocked && !tile.doorway && !tile.hole &&
    !tile.openAir && !tile.perch && !tile.build && /Floor$/.test(tile.kind);
  const wall = tile => tile && tile.blocked && CRAWL_WALL_KINDS.has(tile.kind) &&
    Object.keys(tile).every(key => PADDING_TILE_KEYS.has(key));
  const protectedCells = new Set();
  for (const point of reserved.filter(Boolean)) {
    const x = Math.round(point.x), y = Math.round(point.y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (tileAt(x + dx, y + dy)) protectedCells.add(index(x + dx, y + dy));
    }
  }
  const isProtected = tile => protectedCells.has(index(tile.x, tile.y));

  function walkingDistance(from, to) {
    const distances = new Int16Array(tiles.length).fill(-1);
    const queue = [from];
    distances[index(from.x, from.y)] = 0;
    for (let head = 0; head < queue.length; head++) {
      const a = queue[head], distance = distances[index(a.x, a.y)];
      if (a === to) return distance;
      for (const { dx, dy } of CRAWL_DIRECTIONS) {
        const b = tileAt(a.x + dx, a.y + dy);
        if (!floor(b) || isProtected(b)) continue;
        const next = index(b.x, b.y);
        if (distances[next] >= 0) continue;
        const edgeX = a.x + .5 + dx * .5, edgeY = a.y + .5 + dy * .5;
        const drop = interiorTileLevel(a, edgeX, edgeY) - interiorTileLevel(b, edgeX, edgeY);
        if (drop < -1e-5 || drop > 1 + 1e-5) continue;
        distances[next] = distance + 1;
        queue.push(b);
      }
    }
    return -1;
  }

  const candidates = [];
  for (const approach of tiles) {
    if (!floor(approach) || approach.slope || !Number.isInteger(approach.elev) ||
        approach.elev >= MAX_LEVEL || isProtected(approach)) continue;
    for (const direction of CRAWL_DIRECTIONS) {
      const { dx, dy } = direction;
      for (const length of [2, 3]) {
        const landing = tileAt(approach.x + dx * (length + 1), approach.y + dy * (length + 1));
        if (!floor(landing) || landing.slope || landing.elev !== approach.elev || isProtected(landing)) continue;
        const cells = [];
        for (let step = 1; step <= length; step++) {
          const x = approach.x + dx * step, y = approach.y + dy * step;
          const tile = tileAt(x, y);
          if (!wall(tile) || isProtected(tile) || !wall(tileAt(x - dy, y + dx)) ||
              !wall(tileAt(x + dy, y - dx))) break;
          cells.push(tile);
        }
        if (cells.length !== length) continue;
        const rank = hashSeed(`${key}:crawl:v1:${approach.x},${approach.y}:${direction.rampDir}:${length}`);
        candidates.push({ approach, landing, cells, direction, rank });
      }
    }
  }
  candidates.sort((a, b) => a.rank - b.rank);
  for (const { approach, landing, cells, direction } of candidates.slice(0, 32)) {
    const outward = walkingDistance(approach, landing);
    if (outward < cells.length + 6) continue;
    const back = walkingDistance(landing, approach);
    if (back < cells.length + 6) continue;
    const nextTiles = tiles.slice();
    for (const [step, cell] of cells.entries()) {
      const next = { ...cell, kind: approach.kind, blocked: false, elev: approach.elev + 1, slope: step === 0 };
      if (next.slope) next.rampDir = direction.rampDir;
      nextTiles[index(cell.x, cell.y)] = next;
    }
    map.tiles = nextTiles;
    return { approach: crawlPoint(approach), landing: crawlPoint(landing), cells: cells.map(crawlPoint),
      direction, drop: 1, shortcutSteps: cells.length + 1, walkingSteps: outward, returnSteps: back };
  }
  return null;
}
