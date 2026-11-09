import { rng, hashSeed } from "./random.js?v=r854-467e9d974308";

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
