// Travellers, trails and the wandering cartographer (release 115).
// Trails: every edge between two sections is either a trail or not (a hash of the edge), so trails continue across
// sections; a town's four edges are always trails, so paths radiate from towns and wander off across the wilds.
// Travellers: groups of people (some mounted) walk the trails or wander a section, stop when the Wayfarer comes near,
// and talk. Peddlers trade. Old Quillon, a wandering cartographer, gives one errand at a time; finish it and the next
// time you meet him he pays and hands you the next.
import { hashSeed, rng, pick } from "./random.js?v=r487-99f7bac84927";
import { LETHAL_KINDS } from "./landscape.js?v=r487-99f7bac84927";
import { hamletSection } from "./settlements.js?v=r487-99f7bac84927";
import { RECITERS, RECITATIONS } from "./recitations.js?v=r487-99f7bac84927";
import { ELDERS, ELDER_NAME, elderPlan } from "./elders.js?v=r487-99f7bac84927";
import { READINGS, readingAt, nextReadingLine, hearLine, heardLine, bookPieces, ensureLore, discoverReading, readingKnown } from "./lore.js?v=r487-99f7bac84927";

export const TRAVEL_VERSION = 1;
export const TRAVEL = { reciterChance: 0.12, trailChance: 0.08, trailNearTown: 0.6, groupChance: 0.2, groupChanceOnTrail: 0.42, minDepth: 1, speed: 1.15, pauseRadius: 2.4, spacing: 0.9, wandererChance: 0.07, wandererChanceReady: 0.22 };

// ------------------------------------------------------------------ trails
// The passage positions on each edge, matching world.ts sectionExits (5..26 along the edge).
function passage(seed, axis, a, b) { const r = rng(`${seed}:edge:${axis}:${a}:${b}`); return 5 + Math.floor(r() * 22); }
// An edge is a trail more often when a town sits on either side of it, so towns sit on trails that wander outward.
function edgeTrail(seed, axis, a, b, nearTown) { return (hashSeed(`${seed}:trail:v${TRAVEL_VERSION}:${axis}:${a}:${b}`) % 1000) / 1000 < (nearTown ? TRAVEL.trailNearTown : TRAVEL.trailChance); }
// Which of a section's four exits carry a trail. Both sections sharing an edge agree, so trails continue across them.
export function sectionTrails(seed, rx, ry) {
  const town = (x, y) => hamletSection(seed, x, y), here = town(rx, ry);
  return {
    north: edgeTrail(seed, "h", rx, ry, here || town(rx, ry - 1)),
    south: edgeTrail(seed, "h", rx, ry + 1, here || town(rx, ry + 1)),
    west: edgeTrail(seed, "v", rx, ry, here || town(rx - 1, ry)),
    east: edgeTrail(seed, "v", rx + 1, ry, here || town(rx + 1, ry)),
  };
}
const walkable = (t) => !!t && !t.blocked && !t.structure && !LETHAL_KINDS.has(t.kind) && t.kind !== "shallows";
// ------------------------------------------------------------------ walking the real ground (release 130)
// Walkers move tile to tile over connected, walkable ground: never across chasms, water, lava or walls, and only
// between tiles of the same height unless a ramp joins them. Paths are routed with a bounded breadth-first search.
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const widthOf = (map) => map.width || Math.round(Math.sqrt(map.tiles.length));
function stepOK(map, w, ax, ay, bx, by) {
  const h = map.tiles.length / w; if (bx < 0 || by < 0 || bx >= w || by >= h) return false;
  const a = map.tiles[ay * w + ax], b = map.tiles[by * w + bx];
  if (!walkable(b)) return false;
  const ea = a?.elev || 0, eb = b.elev || 0;
  return ea === eb || (!!(a?.slope || b.slope) && Math.abs(ea - eb) <= 1);
}
// Every tile reachable on foot from `start` (up to `limit` tiles).
export function groundRegion(map, w, start, limit = 1200) {
  const seen = new Set([start.y * w + start.x]), out = [{ x: start.x, y: start.y }];
  for (let i = 0; i < out.length && out.length < limit; i++) for (const [dx, dy] of N4) {
    const x = out[i].x + dx, y = out[i].y + dy, k = y * w + x;
    if (!seen.has(k) && stepOK(map, w, out[i].x, out[i].y, x, y)) { seen.add(k); out.push({ x, y }); }
  }
  return out;
}
// The shortest walk from `from` to `to` (inclusive), or null.
export function groundPath(map, w, from, to, limit = 1600) {
  const key = (x, y) => y * w + x, prev = new Map([[key(from.x, from.y), -1]]), queue = [from];
  for (let i = 0; i < queue.length && queue.length < limit; i++) {
    const c = queue[i];
    if (c.x === to.x && c.y === to.y) { const path = []; let k = key(c.x, c.y); while (k !== -1) { path.push({ x: k % w, y: Math.floor(k / w) }); k = prev.get(k); } return path.reverse(); }
    for (const [dx, dy] of N4) { const x = c.x + dx, y = c.y + dy, k = key(x, y); if (!prev.has(k) && stepOK(map, w, c.x, c.y, x, y)) { prev.set(k, key(c.x, c.y)); queue.push({ x, y }); } }
  }
  return null;
}
// Joins waypoints into one continuous walk; waypoints that cannot be reached are skipped.
function stitch(map, w, points) {
  const out = [points[0]];
  for (const p of points.slice(1)) { const seg = groundPath(map, w, out[out.length - 1], p); if (seg) out.push(...seg.slice(1)); }
  return out.length > 1 ? out : null;
}
// Lays trail tiles from each trail exit toward the section's hub (a town square or the middle) with a gentle wobble.
// Returns the list of trail routes (each a list of tiles from the exit inward) or [].
export function applyTrails(map, seed, rx, ry) {
  if (!map || map.trails || map.tiles?.length !== 1024 || (rx === 0 && ry === 0)) return [];
  const ends = sectionTrails(seed, rx, ry), routes = [], hub = map.settlement?.procedural ? { x: map.settlement.x, y: map.settlement.y + 3 } : { x: 16, y: 16 };
  const starts = { north: [passage(seed, "h", rx, ry), 1], south: [passage(seed, "h", rx, ry + 1), 30], west: [1, passage(seed, "v", rx, ry)], east: [30, passage(seed, "v", rx + 1, ry)] };
  for (const [side, on] of Object.entries(ends)) {
    if (!on) continue;
    let [x, y] = starts[side]; const route = [], r = rng(`${seed}:trail-walk:v${TRAVEL_VERSION}:${rx}:${ry}:${side}`);
    for (let n = 0; n < 70 && Math.abs(x - hub.x) + Math.abs(y - hub.y) > 1; n++) {
      const t = map.tiles[y * 32 + x];
      if (walkable(t) && t.kind !== "refuge") { map.tiles[y * 32 + x] = { ...t, trail: true }; }
      route.push({ x, y });
      const dx = Math.sign(hub.x - x), dy = Math.sign(hub.y - y), horizontal = Math.abs(hub.x - x) > Math.abs(hub.y - y) ? r() < .8 : r() < .2;
      if (horizontal && dx) x += dx; else if (dy) y += dy; else x += dx;
    }
    if (route.length > 4) routes.push(route);
  }
  map.trails = routes;
  return routes;
}

// ------------------------------------------------------------------ travellers
// Group kinds: who walks together, what they look like, whether one rides, whether one trades.
export const TRAVELER_GROUPS = [
  { id: "pilgrims", title: "Pilgrims", looks: ["pilgrim"], size: [2, 4], mount: 0, trade: false, pools: ["lore", "odd", "pilgrim"] },
  { id: "caravan", title: "Caravan", looks: ["peddler", "mercenary"], size: [2, 3], mount: .8, trade: true, pools: ["trade", "witty", "road"] },
  { id: "lone", title: "Lone wanderer", looks: ["traveler"], size: [1, 1], mount: .35, trade: false, pools: ["odd", "witty", "classic"] },
  { id: "minstrels", title: "Minstrels", looks: ["minstrel"], size: [2, 3], mount: 0, trade: false, pools: ["song", "witty", "classic"] },
  { id: "scholars", title: "Scholars", looks: ["scholar"], size: [1, 2], mount: .3, trade: false, pools: ["lore", "classic", "odd"] },
  { id: "riders", title: "Outriders", looks: ["mercenary"], size: [2, 3], mount: 1, trade: false, pools: ["road", "witty", "lore"] },
  { id: "peddler", title: "Peddler", looks: ["peddler"], size: [1, 1], mount: .5, trade: true, pools: ["trade", "odd", "witty"] },
];
export const MOUNTS = ["mossGrazer", "lanternDoe", "ashenHound"];
const NAMES = ["Abernathy", "Brisk", "Calloway", "Dun", "Esper", "Farrow", "Gilt", "Hob", "Ines", "Jory", "Kestrel", "Lisbet", "Mott", "Nell", "Orrin", "Pim", "Quill", "Rosk", "Sable", "Tobiah", "Ulla", "Vane", "Wick", "Yarrow", "Zell"];
// Original lines, written for the Corridor, plus a handful of short public-domain quotations.
export const TRAVELER_LINES = {
  witty: [
    "I've walked this corridor so long my shadow asked for a raise.",
    "Never trust a map that's smiling.",
    "They say all roads lead somewhere. Mine mostly lead to other roads.",
    "I'd tell you the way, but I'm currently lost in a very confident manner.",
    "The trick to travelling light is losing things early.",
    "My boots have more stories than I do. Worse ones, too.",
    "If you see a mite wearing a hat, no you didn't.",
    "Adventure is just inconvenience with better lighting.",
    "I keep a journal. It mostly says 'walked'.",
  ],
  odd: [
    "The third tree back there owes me a song.",
    "Have you noticed the sky repeats? Every eleventh cloud. Count them.",
    "I met myself coming the other way once. Terrible conversationalist.",
    "Somewhere down there, a door is waiting for you to be ready. It's very patient. It's very hungry.",
    "Spoons. That's all I'll say. Spoons.",
    "The Wayglass hums in B flat. Except on Thursdays. There are no Thursdays here.",
    "I traded my name for a good night's sleep. Worth it.",
    "Don't step on the yellow stones. Nothing happens. I just don't like it.",
    "A moth told me a secret. I've forgotten it, but I remember it was rude.",
  ],
  lore: [
    "The dungeons go down. Some say they go down forever. Some say they go sideways when you aren't looking.",
    "Ember Refuge is the loudest fire on the road, not the only one.",
    "My grandmother said the Corridor was a hallway between two dreams, and we're the furniture.",
    "The relays still hum. Someone, somewhere, is still listening.",
    "Every Wayglass you light, the Corridor remembers a little more of you. Make sure it's the good parts.",
    "The glass marshes were a city once. Or will be. Time is loose out there.",
    "When the Aperture opens, look away from what looks back.",
    "The guardians below aren't angry. They're just very, very bored.",
  ],
  pilgrim: [
    "We walk to the edge of the map. Every year it's a little further.",
    "Our shrine is wherever we stop. Today, it's here. Mind the incense.",
    "Pray for us? No, just wave. Waving is fine.",
    "We left our sins at the last town. They'll catch up by supper.",
  ],
  trade: [
    "Buying, selling, and occasionally haggling with myself.",
    "Everything's for sale except the mule. The mule is family.",
    "Fair prices, honest scales, slightly dishonest smile.",
    "I carry what the towns forget they need.",
  ],
  road: [
    "Trail's clear to the next town. Mostly. Some of it bit me.",
    "Saw glass mites fighting ashlings two ridges over. Nobody won. Everybody lost a leg.",
    "Keep to the paths after dark. The paths keep to you.",
    "We ride the long loop: three towns, two rivers, one very rude brute.",
  ],
  song: [
    "♪ Oh the corridor's long and the corridor's wide, and nobody knows what's on the other side ♪",
    "We play for coin, for bread, and occasionally to make the hounds go away.",
    "Request a song? We know four. Three are about soup.",
    "♪ Light the glass, light the glass, and the dark will let you pass ♪",
  ],
  classic: [
    "\"Not all those who wander...\" — no, wait, that one's taken. I just wander.",
    "As the old book says: \"It was the best of times, it was the worst of times.\" Mostly the second.",
    "\"Curiouser and curiouser,\" said a girl in a story. She'd have loved it here.",
    "An old play says all the world's a stage. This one's a corridor. Same idea, worse lighting.",
    "\"Call me Ishmael,\" a sailor once wrote. Call me tired.",
    "\"Quoth the raven, nevermore.\" The ravens out here say considerably more.",
    "A wise man once wrote that we are all in the gutter, but some of us are looking at the stars. I'm looking at my feet. Rocks.",
    "The old tales say there's no place like home. They never said where home was.",
  ],
};

export function travelerPlan(seed, rx, ry, onTrail) {
  if (Math.abs(rx) + Math.abs(ry) < TRAVEL.minDepth) return null;
  const r = rng(`${seed}:travelers:v${TRAVEL_VERSION}:${rx}:${ry}`);
  if (r() >= (onTrail ? TRAVEL.groupChanceOnTrail : TRAVEL.groupChance)) return null;
  const group = pick(r, TRAVELER_GROUPS), n = group.size[0] + Math.floor(r() * (group.size[1] - group.size[0] + 1));
  const names = [...NAMES].sort((a, b) => hashSeed(`${rx},${ry}:${a}`) - hashSeed(`${rx},${ry}:${b}`));
  const members = [];
  for (let i = 0; i < n; i++) {
    const pool = group.pools.flatMap((k) => TRAVELER_LINES[k]), lines = [pick(r, pool), pick(r, pool), pick(r, pool)].filter((l, j, a) => a.indexOf(l) === j);
    const trader = group.trade && i === 0;
    members.push({ name: names[i], look: group.looks[i % group.looks.length], mount: r() < group.mount ? pick(r, MOUNTS) : null, lines, trader });
  }
  return { id: `travelers:${rx},${ry}`, group: group.id, title: group.title, members };
}

// Places a group on the map as moving `traveler` objects. Returns the group or null.
export function addTravelers(map, seed, rx, ry) {
  if (!map || map.travelers || map.skirmish || map.tiles?.length !== 1024) return null;
  const routes = map.trails || [], plan = travelerPlan(seed, rx, ry, routes.length > 0);
  if (!plan) return null;
  let path;
  if (routes.length >= 2) path = [...routes[0], ...[...routes[1]].reverse()];
  else if (routes.length === 1) path = routes[0];
  else { // no trail: stroll between a few open points
    const r = rng(`${plan.id}:stroll`), open = map.tiles.filter((t) => t.x > 4 && t.y > 4 && t.x < 27 && t.y < 27 && walkable(t));
    path = open.length ? [0, 1, 2, 3].map(() => open[Math.floor(r() * open.length)]).map((t) => ({ x: t.x, y: t.y })) : [];
  }
  path = path.filter((p) => walkable(map.tiles[p.y * 32 + p.x]));
  path = path.length >= 2 ? stitch(map, 32, path) : null; // connect the trail tiles on foot, around any gap
  if (!path || path.length < 2) return null;
  const startAt = hashSeed(plan.id) % path.length, objects = [];
  plan.members.forEach((m, i) => {
    const p = path[Math.max(0, startAt - i)] || path[0];
    objects.push({ id: `${plan.id}:${i}`, kind: "traveler", name: m.name, role: plan.title, look: m.look, mount: m.mount, lines: m.lines, talk: 0, x: p.x, y: p.y, state: "walking", actions: m.trader ? ["speak", "trade"] : ["speak"], shopId: m.trader ? "traveler-peddler" : null, groupId: plan.id, leader: i === 0, facing: "down" });
  });
  map.objects.push(...objects);
  // Walk on from the start tile, turning back if it is the end of the path (never wrap: that would cut across country).
  const forward = startAt + 1 < path.length;
  map.travelers = { ...plan, path, index: forward ? startAt + 1 : startAt - 1, dir: forward ? 1 : -1 };
  return map.travelers;
}

// Per-frame: the leader walks the path (back and forth), the rest follow in a line; everyone stops near the Wayfarer.
export function tickTravelers(map, player, dt) {
  const face = (o, x, y) => { o.facing = Math.abs(x - o.x) > Math.abs(y - o.y) ? (x > o.x ? "right" : "left") : (y > o.y ? "down" : "up"); };
  tickElder(map, player, dt, face);
  const wanderer = map?.objects?.find((o) => o.kind === "traveler" && o.wanderer);
  if (wanderer && Math.hypot(wanderer.x - player.x, wanderer.y - player.y) < TRAVEL.pauseRadius * 2) face(wanderer, player.x, player.y);
  const reciter = map?.objects?.find((o) => o.kind === "traveler" && o.reciter), walk = map?.reciterWalk;
  if (reciter && walk) {
    reciter.age = (reciter.age || 0) + dt;
    if (Math.hypot(reciter.x - player.x, reciter.y - player.y) < TRAVEL.pauseRadius) { reciter.state = "listening"; face(reciter, player.x, player.y); }
    else {
      if (!walk.leaving && reciter.leaveAfter != null && reciter.age >= reciter.leaveAfter) {
        // Time to go: walk to the nearest reachable section edge (or the dungeon entrance) and vanish there.
        const w = walk.width, h = map.tiles.length / w, here = { x: Math.round(reciter.x), y: Math.round(reciter.y) }, entry = map.entry;
        const exits = walk.region.filter((q) => w === 32 ? q.x <= 1 || q.y <= 1 || q.x >= w - 2 || q.y >= h - 2 : entry && q.x === entry.x && q.y === entry.y);
        exits.sort((a, b) => Math.abs(a.x - here.x) + Math.abs(a.y - here.y) - Math.abs(b.x - here.x) - Math.abs(b.y - here.y));
        const out = exits.length ? groundPath(map, w, here, exits[0], 2400) : null;
        if (out && out.length > 1) Object.assign(walk, { path: out, index: 1, dir: 1, leaving: true }); else reciter.leaveAfter = null;
      }
      const goal = walk.path[walk.index], d = Math.hypot(goal.x - reciter.x, goal.y - reciter.y), step = TRAVEL.speed * .8 * dt;
      reciter.state = "walking"; face(reciter, goal.x, goal.y);
      if (d <= step) {
        reciter.x = goal.x; reciter.y = goal.y;
        if (walk.leaving && walk.index >= walk.path.length - 1) { map.objects = map.objects.filter((q) => q !== reciter); map.reciterWalk = null; }
        else { if (walk.index + walk.dir >= walk.path.length || walk.index + walk.dir < 0) walk.dir = -walk.dir; walk.index += walk.dir; }
      }
      else { reciter.x += (goal.x - reciter.x) / d * step; reciter.y += (goal.y - reciter.y) / d * step; }
    }
  }
  const t = map?.travelers; if (!t) return;
  const group = map.objects.filter((o) => o.kind === "traveler" && o.groupId === t.id);
  const near = group.some((o) => Math.hypot(o.x - player.x, o.y - player.y) < TRAVEL.pauseRadius);
  if (near) { for (const o of group) { o.state = "listening"; face(o, player.x, player.y); } return; }
  const lead = group.find((o) => o.leader && o.groupId === t.id); if (!lead) return;
  const goal = t.path[t.index], d = Math.hypot(goal.x - lead.x, goal.y - lead.y), step = TRAVEL.speed * (lead.mount ? 1.25 : 1) * dt;
  lead.state = "walking"; face(lead, goal.x, goal.y);
  if (d <= step) { lead.x = goal.x; lead.y = goal.y; if (t.index + t.dir >= t.path.length || t.index + t.dir < 0) t.dir = -t.dir; t.index += t.dir; }
  else { lead.x += (goal.x - lead.x) / d * step; lead.y += (goal.y - lead.y) / d * step; }
  // Followers walk the same path a few tiles behind, so they too stay on the ground.
  let n = 0;
  for (const o of group) {
    if (o === lead) continue;
    n++;
    // Each follower keeps its own place on the path and steps one tile at a time toward its slot behind the leader.
    const slot = Math.max(0, Math.min(t.path.length - 1, t.index - t.dir * (n + 1)));
    if (!Number.isInteger(o.pathIndex)) o.pathIndex = t.path.findIndex((q) => q.x === Math.round(o.x) && q.y === Math.round(o.y));
    if (o.pathIndex < 0) o.pathIndex = slot;
    const next = o.pathIndex === slot ? slot : o.pathIndex + Math.sign(slot - o.pathIndex), target = t.path[next], gap = Math.hypot(target.x - o.x, target.y - o.y);
    o.state = "walking"; face(o, target.x, target.y);
    if (gap <= step * 1.15) { o.x = target.x; o.y = target.y; o.pathIndex = next; }
    else { const k = step * 1.15 / gap; o.x += (target.x - o.x) * k; o.y += (target.y - o.y) * k; }
  }
}

// Talking to a traveller. Since release 191 travellers speak in the voice of the Reading they walk in (src/lore.ts):
// a passage not yet heard, sometimes one that is a piece of the Reading's book. The joke pools above are retired from
// speech (travelerPlan still draws them so the seeded groups, mounts and names stay exactly as they were); without a
// save (tests, old callers) a traveller still says their own lines in turn.
export function travelerTalk(o, save = null) {
  const who = `${o.name}${o.role ? ` (${o.role})` : ""}${o.mount ? `, riding a ${o.mount.replace(/([A-Z])/g, " $1").toLowerCase()}` : ""}`;
  const here = save ? readingAt(save.session?.rx ?? 0, save.session?.ry ?? 0) : null, said = here ? readingSpeech(save, here, { reciter: false }) : null;
  if (said) return `${who}: “${said.text}”${placeNote(discoverReading(save, here))}${pieceNote(said.found, save)}`;
  const lines = o.lines?.length ? o.lines : ["Safe roads."], line = lines[(o.talk || 0) % lines.length];
  o.talk = (o.talk || 0) + 1;
  return `${who}: “${line}”`;
}
// The next line in a Reading, recorded as heard. Travellers never speak a reciter's recitation pieces.
function readingSpeech(save, readingId, { reciter, voices = null }) {
  const said = nextReadingLine(save, readingId, Math.random, { voices, recitations: reciter });
  if (!said) return null;
  return { ...said, found: hearLine(save, said.voice, said.line, { reciter }) };
}
// The first voice heard in a Reading names it; nothing names a Reading you have not heard.
function placeNote(found) { return found ? ` · You are in ${found.name.replace(/^The /, "the ")}.` : ""; }
// A fragment of a Reading not yet heard is noted without naming it (release 193).
function pieceNote(found, save = null) { return !found ? "" : found.completed ? ` · Recitation complete: ${READINGS[found.readingId].name}.` : save && !readingKnown(save, found.readingId) ? " · A fragment is remembered (Reciter's Tome)." : ` · A fragment of ${READINGS[found.readingId].name} is remembered (Reciter's Tome)`; }

// ------------------------------------------------------------------ the wandering cartographer
// One errand at a time. Kinds: hunt (defeat creatures), cache (find a satchel at a section), town (reach a town).
export const WANDERER_QUESTS = [
  { type: "hunt", goal: 5, reward: 40, ask: "My mule is afraid of everything. Kindly make there be less of everything: defeat five creatures." },
  { type: "cache", reward: 60, ask: "I buried a satchel of maps at {at}. My knees have opinions about digging. Fetch it?" },
  { type: "town", reward: 50, ask: "There's a town out there I haven't drawn yet. Go and stand in any town square and tell me what it smells like." },
  { type: "hunt", goal: 8, reward: 70, ask: "The trails are getting toothy. Thin them out: eight creatures, if you'd be so kind." },
  { type: "cache", reward: 90, ask: "Another satchel. Yes, I bury a lot of things. {at}. Don't read the love letters." },
];
export const WANDERER = { name: "Old Quillon", role: "Wandering cartographer" };
export function ensureWanderer(s) {
  const w = s.wanderer && typeof s.wanderer === "object" ? s.wanderer : {};
  s.wanderer = { v: 1, stage: Math.max(0, Number(w.stage) || 0), completed: Math.max(0, Number(w.completed) || 0), met: !!w.met, quest: w.quest && typeof w.quest === "object" ? w.quest : null };
  return s;
}
// Does the cartographer stand in this section for the current stage? Likelier once an errand is done and owed.
export function wandererHere(save, rx, ry) {
  if (Math.abs(rx) + Math.abs(ry) < 2) return false;
  const w = save.wanderer, ready = !!w?.quest?.done, chance = ready || !w?.quest ? TRAVEL.wandererChanceReady : TRAVEL.wandererChance;
  return (hashSeed(`${save.seed}:wanderer:v1:${w?.stage || 0}:${ready ? 1 : 0}:${rx}:${ry}`) % 1000) / 1000 < chance;
}
export function addWanderer(map, save, rx, ry) {
  if (!map || map.tiles?.length !== 1024 || map.skirmish || !wandererHere(save, rx, ry)) return null;
  const open = map.tiles.filter((t) => t.x > 6 && t.y > 6 && t.x < 25 && t.y < 25 && walkable(t)).sort((a, b) => hashSeed(`${rx},${ry}:${a.x},${a.y}`) - hashSeed(`${rx},${ry}:${b.x},${b.y}`));
  const at = open[0]; if (!at) return null;
  const o = { id: `wanderer:${rx},${ry}`, kind: "traveler", wanderer: true, name: WANDERER.name, role: WANDERER.role, look: "cartographer", mount: "mossGrazer", x: at.x, y: at.y, state: "listening", actions: ["speak"], facing: "down" };
  map.objects.push(o);
  return o;
}
function questTarget(save, rx, ry) {
  const h = hashSeed(`${save.seed}:wanderer-target:${save.wanderer.stage}`), dist = 3 + (h % 3), angle = (h >>> 4) % 8;
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]][angle];
  return { rx: rx + dirs[0] * dist, ry: ry + dirs[1] * dist };
}
// Speaking with the cartographer: turn in a finished errand (pay), then give the next; or remind of the current one.
export function wandererTalk(save, rx, ry) {
  ensureWanderer(save); const w = save.wanderer, out = { message: "", reward: 0, journal: null };
  const intro = w.met ? "" : "“Ah, a walker! Name's Quillon. I draw the Corridor; the Corridor draws back.” ";
  w.met = true;
  if (w.quest?.done) {
    out.reward = w.quest.reward; save.currency = (Number(save.currency) || 0) + out.reward; w.completed++; w.stage++; w.quest = null;
    out.message = `${WANDERER.name}: “Splendid. Here, ${out.reward} marks, and a sketch of you I'll never show anyone.” `;
    out.journal = `Old Quillon paid ${out.reward} marks for an errand (${w.completed} done).`;
  } else if (w.quest) {
    const q = w.quest;
    out.message = `${intro}${WANDERER.name}: “Still waiting on that errand. ${q.type === "hunt" ? `${q.progress}/${q.goal} creatures.` : q.type === "cache" ? `The satchel's at ${q.target.rx},${q.target.ry}.` : "Any town square will do."}”`;
    return out;
  }
  const def = WANDERER_QUESTS[w.stage % WANDERER_QUESTS.length], cycle = Math.floor(w.stage / WANDERER_QUESTS.length);
  const q = { type: def.type, goal: def.goal || 1, progress: 0, reward: Math.round(def.reward * (1 + cycle * .5)), done: false, stage: w.stage };
  if (def.type === "cache") q.target = questTarget(save, rx, ry);
  w.quest = q;
  out.message += `${intro}${WANDERER.name}: “${def.ask.replace("{at}", q.target ? `${q.target.rx},${q.target.ry}` : "")}”`;
  out.journal ||= `Old Quillon asked: ${def.ask.replace("{at}", q.target ? `${q.target.rx},${q.target.ry}` : "")}`;
  return out;
}
// Progress hooks. Each returns a message when the errand completes, or null.
export function wandererKill(save) {
  const q = save.wanderer?.quest; if (!q || q.done || q.type !== "hunt") return null;
  q.progress++; if (q.progress < q.goal) return null;
  q.done = true; return "Quillon's errand is done. Find him on the road to collect.";
}
export function wandererArrive(save, map, rx, ry) {
  const q = save.wanderer?.quest; if (!q || q.done) return null;
  if (q.type === "town" && map?.settlement) { q.done = true; return "You stand in a town square. Quillon will want to hear about it."; }
  if (q.type === "cache" && q.target?.rx === rx && q.target?.ry === ry) {
    const open = map.tiles.filter((t) => t.x > 5 && t.y > 5 && t.x < 26 && t.y < 26 && walkable(t)), at = open[hashSeed(`cache:${rx},${ry}`) % Math.max(1, open.length)];
    if (at) map.objects.push({ id: `wanderer-cache:${rx},${ry}`, kind: "wandererCache", name: "Quillon's Satchel", x: at.x, y: at.y, state: "ready", actions: ["collect"], landmark: true });
    return "Somewhere in this section: Quillon's buried satchel.";
  }
  return null;
}
export function collectWandererCache(save) {
  const q = save.wanderer?.quest; if (!q || q.done || q.type !== "cache") return { ok: false, message: "An empty hole. Someone got here first, or no one buried anything." };
  q.done = true; return { ok: true, message: "You dig up Quillon's satchel: maps, a pressed flower, and letters you don't read. Find Quillon to return it." };
}

// ------------------------------------------------------------------ reciters (releases 117–122)
// A lone walker who recites one book (src/recitations.ts), one line each time you speak. Per journey, save.reciters
// keeps each reciter's place (`progress`), whom you have met (`met`), and each met reciter's order (`modes`: linear by
// default, or random). Options → Library lists every book and, under it, the reciters you have met. Books are added
// to the game by the developer; there is no in-game way to add stories. Reciters walk the wilds, towns and dungeons.
export const RECITER_LINES_PER_MEETING = 3;
export const RECITER_CHANCE = { wild: 0.05, town: 0.2, dungeon: 0.08 }; // rarer since release 130
export function ensureReciters(s) {
  const r = s.reciters && typeof s.reciters === "object" ? s.reciters : {}, known = new Set(Object.keys(RECITATIONS)), progress = {}, met = {}, modes = {};
  for (const [id, n] of Object.entries(r.progress || {})) if (known.has(id) && Number.isInteger(n) && n >= 0) progress[id] = n;
  for (const id of Object.keys(r.met || {})) if (known.has(id) && r.met[id]) met[id] = true;
  for (const id of Object.keys(progress)) met[id] = true; // anyone whose place was kept before release 122 was met
  // Release 128: random is the default (missing = random); only an explicit "linear" choice is stored.
  for (const [id, m] of Object.entries(r.modes || {})) if (known.has(id) && m === "linear" && r.v >= 4) modes[id] = "linear";
  s.reciters = { v: 4, progress, met, modes, disabled: [...new Set((Array.isArray(r.disabled) ? r.disabled : []).filter((id) => known.has(id)))], ...(Array.isArray(r.custom) && r.custom.length ? { custom: r.custom } : {}) };
  return s;
}
export function storyCatalog() { return RECITERS.map((r) => ({ ...r, count: RECITATIONS[r.id].length })); }
export function storyLines(save, id) { return RECITATIONS[id] || []; }
// The Library: every book, with the reciters of it the player has met.
export function libraryBooks(save) {
  const r = save?.reciters || {}, books = new Map();
  for (const q of storyCatalog()) {
    const b = books.get(q.book) || { book: q.book, sources: new Set(), lines: 0, readers: [], voices: [] };
    b.sources.add(q.source); b.lines += q.count; b.voices.push(q.id);
    if (r.met?.[q.id]) b.readers.push({ ...q, at: r.progress?.[q.id] || 0, mode: r.modes?.[q.id] === "linear" ? "linear" : "random" });
    books.set(q.book, b);
  }
  return [...books.values()].map((b) => ({ ...b, sources: [...b.sources] }));
}
export function setReciterMode(save, id, mode) { ensureReciters(save); if (mode === "linear") save.reciters.modes[id] = "linear"; else delete save.reciters.modes[id]; }
export function resetReciter(save, id) { ensureReciters(save); save.reciters.progress[id] = 0; }
// Since release 191 a reciter is more often (READING_VOICE_SHARE) one of the voices of the Reading the section lies in.
export const READING_VOICE_SHARE = 0.7;
export function reciterPlan(seed, key, save, chance = RECITER_CHANCE.wild, readingId = null) {
  const h = hashSeed(`${seed}:reciter:v1:${key}`);
  if ((h % 1000) / 1000 >= chance) return null;
  const off = new Set(save?.reciters?.disabled || []), pool = storyCatalog().filter((q) => !off.has(q.id));
  const own = new Set((READINGS[readingId]?.voices || []).map(([id]) => id)), local = pool.filter((q) => own.has(q.id));
  if (local.length && (hashSeed(`${seed}:reciter-reading:v1:${key}`) % 1000) / 1000 < READING_VOICE_SHARE) return local[Math.floor(h / 1000) % local.length];
  return pool.length ? pool[Math.floor(h / 1000) % pool.length] : null;
}
// A reciter mills about its patch of ground; most (RECITER_LEAVE.share) leave after a while: they walk to the edge of
// the section (or back to a dungeon's entrance) and are gone.
export const RECITER_LEAVE = { share: 0.6, after: [25, 70] };
function placeReciter(map, who, id, open, r, width, preview = false) {
  if (!open.length) return null;
  const start = open[Math.floor(r() * open.length)], region = groundRegion(map, width, start, 900);
  if (region.length < 6) return null;
  const path = stitch(map, width, [start, ...[0, 1, 2, 3].map(() => region[Math.floor(r() * region.length)])]);
  if (!path) return null;
  const leaves = !preview && Math.random() < RECITER_LEAVE.share, [lo, hi] = RECITER_LEAVE.after;
  const o = { id, kind: "traveler", reciter: who.id, name: who.name, role: "Wandering reciter", look: who.look, mount: null, x: start.x, y: start.y, state: "walking", actions: ["speak"], facing: "down",
    // How much they will say this meeting: one to three lines, then nothing more until you meet them again.
    linesLeft: preview ? 1 : 1 + Math.floor(Math.random() * RECITER_LINES_PER_MEETING), age: 0, leaveAfter: leaves ? lo + Math.random() * (hi - lo) : null };
  map.objects.push(o);
  map.reciterWalk = { path, index: 1, dir: 1, region, width };
  return o;
}
export function addReciter(map, seed, rx, ry, save = null, preview = false) {
  if (!map || map.reciterWalk || map.skirmish || map.tiles?.length !== 1024 || Math.abs(rx) + Math.abs(ry) < TRAVEL.minDepth) return null;
  const who = reciterPlan(seed, `${rx}:${ry}`, save, map.settlement ? RECITER_CHANCE.town : RECITER_CHANCE.wild, readingAt(rx, ry)); if (!who) return null;
  const r = rng(`${seed}:reciter-walk:${rx}:${ry}`), open = map.tiles.filter((t) => t.x > 4 && t.y > 4 && t.x < 27 && t.y < 27 && walkable(t));
  // Route previews need only seeded occupancy, never live conversation/departure randomness.
  return placeReciter(map, who, `reciter:${rx},${ry}`, open, r, 32, preview);
}
// ------------------------------------------------------------------ the Elder Wanderers (release 197)
// An Elder walks the section's road when it has one (they are road creatures), otherwise a stitched stroll; in a
// crossing it wanders near the entrance. It carries its rule (elders.ts) and speaks it as a pattern, never in words.
function placeElder(map, plan, id, path, region, width) {
  if (!path || path.length < 2) return null;
  const at = path[0], o = { id, kind: "traveler", elder: true, rule: plan.rule, name: ELDER_NAME, role: "", look: "elder", mount: null, x: at.x, y: at.y, state: "walking", actions: ["speak"], facing: "down", phase: (plan.seed % 1000) / 1000 };
  map.objects.push(o); map.elderWalk = { path, index: 1, dir: 1, region, width };
  return o;
}
export function addElder(map, save, rx, ry) {
  if (!map || map.elderWalk || map.skirmish || map.tiles?.length !== 1024 || Math.abs(rx) + Math.abs(ry) < ELDERS.minDepth) return null;
  const roads = (map.trails || []).filter((p) => p.length > 6), plan = elderPlan(save, `${rx}:${ry}`, roads.length ? ELDERS.chance.trail : ELDERS.chance.wild);
  if (!plan) return null;
  if (roads.length) { const road = roads[plan.seed % roads.length].filter((p) => walkable(map.tiles[p.y * 32 + p.x])); return placeElder(map, plan, `elder:${rx},${ry}`, road, road, 32); }
  const r = rng(`${plan.seed}:elder-walk`), open = map.tiles.filter((t) => t.x > 4 && t.y > 4 && t.x < 27 && t.y < 27 && walkable(t));
  if (!open.length) return null;
  const start = open[Math.floor(r() * open.length)], region = groundRegion(map, 32, start, 900);
  if (region.length < 6) return null;
  return placeElder(map, plan, `elder:${rx},${ry}`, stitch(map, 32, [start, ...[0, 1, 2, 3].map(() => region[Math.floor(r() * region.length)])]), region, 32);
}
export function addDungeonElder(map, areaId, save, width) {
  if (!map || map.elderWalk || !map.tiles?.length || !width) return null;
  const plan = elderPlan(save, `dungeon:${areaId}:${map.levelStableId || ""}`, ELDERS.chance.dungeon); if (!plan) return null;
  const entry = map.entry || map.tiles.find(walkable), r = rng(`${plan.seed}:elder-walk`);
  const open = map.tiles.filter((t) => walkable(t) && !t.environment && Math.hypot(t.x - entry.x, t.y - entry.y) > 2 && Math.hypot(t.x - entry.x, t.y - entry.y) < 9);
  if (open.length < 4) return null;
  const start = open[Math.floor(r() * open.length)], region = groundRegion(map, width, start, 900);
  if (region.length < 6) return null;
  return placeElder(map, plan, `elder:${areaId}`, stitch(map, width, [start, ...[0, 1, 2, 3].map(() => region[Math.floor(r() * region.length)])]), region, width);
}
function tickElder(map, player, dt, face) {
  const elder = map?.objects?.find((o) => o.kind === "traveler" && o.elder), walk = map?.elderWalk;
  if (!elder || !walk) return;
  if (Math.hypot(elder.x - player.x, elder.y - player.y) < TRAVEL.pauseRadius) { elder.state = "listening"; face(elder, player.x, player.y); return; }
  const goal = walk.path[walk.index], d = Math.hypot(goal.x - elder.x, goal.y - elder.y), step = TRAVEL.speed * ELDERS.speed * dt;
  elder.state = "walking"; face(elder, goal.x, goal.y);
  if (d <= step) { elder.x = goal.x; elder.y = goal.y; if (walk.index + walk.dir >= walk.path.length || walk.index + walk.dir < 0) walk.dir = -walk.dir; walk.index += walk.dir; }
  else { elder.x += (goal.x - elder.x) / d * step; elder.y += (goal.y - elder.y) / d * step; }
}
// In a dungeon level: a reciter strolls near the entrance.
export function addDungeonReciter(map, areaId, save, width) {
  if (!map || map.reciterWalk || !map.tiles?.length || !width) return null;
  const who = reciterPlan(save?.seed, `dungeon:${areaId}:${map.levelStableId || ""}`, save, RECITER_CHANCE.dungeon, readingAt(save?.session?.rx ?? 0, save?.session?.ry ?? 0)); if (!who) return null;
  const entry = map.entry || map.tiles.find(walkable), r = rng(`${areaId}:reciter-walk`);
  const open = map.tiles.filter((t) => walkable(t) && !t.environment && Math.hypot(t.x - entry.x, t.y - entry.y) > 1.5 && Math.hypot(t.x - entry.x, t.y - entry.y) < 7);
  if (open.length < 4) return null;
  return placeReciter(map, who, `reciter:${areaId}`, open, r, width);
}
// Release 128: just a name and a line. Each meeting gives 1–RECITER_LINES_PER_MEETING lines, then they fall quiet. The
// book and character are named only in the Reciter's Tome, which this call fills in by marking the reciter met.
// Release 191: random mode never repeats a line until the reciter's whole book has been heard, and leans toward the
// passages that are pieces of a Reading's book; linear continues the book. Every line spoken is recorded as heard.
export function reciterTalk(o, save) {
  ensureReciters(save); ensureLore(save);
  const who = storyCatalog().find((q) => q.id === o.reciter), lines = storyLines(save, o.reciter);
  if (!who || !lines.length) return "They hum something you almost recognise.";
  save.reciters.met[who.id] = true;
  if (!(o.linesLeft > 0)) return `${who.name} has nothing more to say.`;
  o.linesLeft--;
  let at;
  if (save.reciters.modes[who.id] === "linear") { const n = save.reciters.progress[who.id] || 0; at = n % lines.length; save.reciters.progress[who.id] = n + 1 >= lines.length ? 0 : n + 1; }
  else at = unheardLine(save, who.id, lines.length);
  const found = hearLine(save, who.id, at, { reciter: true });
  // A reciter names the Reading only when it is one of that Reading's own voices.
  const here = readingAt(save.session?.rx ?? 0, save.session?.ry ?? 0), local = READINGS[here].voices.some(([id]) => id === who.id);
  return `${who.name}: “${lines[at]}”${local ? placeNote(discoverReading(save, here)) : ""}${pieceNote(found, save)}`;
}
export const RECITER_PIECE_CHANCE = 0.4;
function unheardLine(save, id, n) {
  const pieces = new Set();
  for (const r of Object.keys(READINGS)) for (const p of bookPieces(r)) if (p.voice === id && !heardLine(save, id, p.line)) pieces.add(p.line);
  if (pieces.size && Math.random() < RECITER_PIECE_CHANCE) { const list = [...pieces]; return list[Math.floor(Math.random() * list.length)]; }
  const fresh = []; for (let i = 0; i < n; i++) if (!heardLine(save, id, i)) fresh.push(i);
  return fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : Math.floor(Math.random() * n);
}
