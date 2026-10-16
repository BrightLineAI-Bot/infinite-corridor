// Travellers, trails and the wandering cartographer (release 115).
// Trails: every edge between two sections is either a trail or not (a hash of the edge), so trails continue across
// sections; a town's four edges are always trails, so paths radiate from towns and wander off across the wilds.
// Travellers: groups of people (some mounted) walk the trails or wander a section, stop when the Wayfarer comes near,
// and talk. Peddlers trade. Old Quillon, a wandering cartographer, gives one errand at a time; finish it and the next
// time you meet him he pays and hands you the next.
import { hashSeed, rng, pick } from "./random.js?v=icp_9f34de81828b4eb4b9da3e8d_5da2cecfd9c86909";
import { LETHAL_KINDS } from "./landscape.js?v=icp_9f34de81828b4eb4b9da3e8d_5da2cecfd9c86909";
import { hamletSection } from "./settlements.js?v=icp_9f34de81828b4eb4b9da3e8d_5da2cecfd9c86909";
import { RECITERS, RECITATIONS } from "./recitations.js?v=icp_9f34de81828b4eb4b9da3e8d_5da2cecfd9c86909";

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
  if (path.length < 2) return null;
  const startAt = hashSeed(plan.id) % path.length, objects = [];
  plan.members.forEach((m, i) => {
    const p = path[Math.max(0, startAt - i)] || path[0];
    objects.push({ id: `${plan.id}:${i}`, kind: "traveler", name: m.name, role: plan.title, look: m.look, mount: m.mount, lines: m.lines, talk: 0, x: p.x, y: p.y, state: "walking", actions: m.trader ? ["speak", "trade"] : ["speak"], shopId: m.trader ? "traveler-peddler" : null, groupId: plan.id, leader: i === 0, facing: "down" });
  });
  map.objects.push(...objects);
  map.travelers = { ...plan, path, index: (startAt + 1) % path.length, dir: 1 };
  return map.travelers;
}

// Per-frame: the leader walks the path (back and forth), the rest follow in a line; everyone stops near the Wayfarer.
export function tickTravelers(map, player, dt) {
  const face = (o, x, y) => { o.facing = Math.abs(x - o.x) > Math.abs(y - o.y) ? (x > o.x ? "right" : "left") : (y > o.y ? "down" : "up"); };
  const wanderer = map?.objects?.find((o) => o.kind === "traveler" && o.wanderer);
  if (wanderer && Math.hypot(wanderer.x - player.x, wanderer.y - player.y) < TRAVEL.pauseRadius * 2) face(wanderer, player.x, player.y);
  const reciter = map?.objects?.find((o) => o.kind === "traveler" && o.reciter), walk = map?.reciterWalk;
  if (reciter && walk) {
    if (Math.hypot(reciter.x - player.x, reciter.y - player.y) < TRAVEL.pauseRadius) { reciter.state = "listening"; face(reciter, player.x, player.y); }
    else {
      const goal = walk.path[walk.index], d = Math.hypot(goal.x - reciter.x, goal.y - reciter.y), step = TRAVEL.speed * .8 * dt;
      reciter.state = "walking"; face(reciter, goal.x, goal.y);
      if (d <= step) { reciter.x = goal.x; reciter.y = goal.y; if (walk.index + walk.dir >= walk.path.length || walk.index + walk.dir < 0) walk.dir = -walk.dir; walk.index += walk.dir; }
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
  let ahead = lead;
  for (const o of group) {
    if (o === lead) continue;
    const gap = Math.hypot(ahead.x - o.x, ahead.y - o.y);
    o.state = "walking"; face(o, ahead.x, ahead.y);
    if (gap > TRAVEL.spacing) { const k = Math.min(gap - TRAVEL.spacing, step * 1.3) / gap; o.x += (ahead.x - o.x) * k; o.y += (ahead.y - o.y) * k; }
    ahead = o;
  }
}

// Talking to a traveller: their lines in turn.
export function travelerTalk(o) {
  const lines = o.lines?.length ? o.lines : ["Safe roads."], line = lines[(o.talk || 0) % lines.length];
  o.talk = (o.talk || 0) + 1;
  return `${o.name}${o.role ? ` (${o.role})` : ""}${o.mount ? `, riding a ${o.mount.replace(/([A-Z])/g, " $1").toLowerCase()}` : ""}: “${line}”`;
}

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

// ------------------------------------------------------------------ reciters (releases 117, 118)
// A lone walker who recites one story, one line each time you speak. The story library is the built-in books
// (src/recitations.ts) plus up to STORY_LIMITS.stories stories the player pastes in (Options → Stories). Per journey,
// save.reciters keeps each story's place (`progress`), the order (`mode`: linear, or random lines), and which stories
// travellers carry (`disabled`). Reciters walk the wilds, towns (more often) and dungeons.
export const STORY_LIMITS = { stories: 8, lines: 600, lineLength: 400, titleLength: 60 };
export const RECITER_CHANCE = { wild: 0.12, town: 0.45, dungeon: 0.18 };
export function ensureReciters(s) {
  const r = s.reciters && typeof s.reciters === "object" ? s.reciters : {};
  const custom = (Array.isArray(r.custom) ? r.custom : []).filter((c) => c && typeof c.id === "string" && Array.isArray(c.lines)).slice(0, STORY_LIMITS.stories)
    .map((c) => ({ id: c.id, title: String(c.title || "A story").slice(0, STORY_LIMITS.titleLength), lines: c.lines.map(String).filter(Boolean).slice(0, STORY_LIMITS.lines).map((l) => l.slice(0, STORY_LIMITS.lineLength)) }))
    .filter((c) => c.lines.length);
  const known = new Set([...Object.keys(RECITATIONS), ...custom.map((c) => c.id)]), progress = {};
  for (const [id, n] of Object.entries(r.progress || {})) if (known.has(id) && Number.isInteger(n) && n >= 0) progress[id] = n;
  s.reciters = { v: 2, progress, mode: r.mode === "random" ? "random" : "linear", disabled: [...new Set((Array.isArray(r.disabled) ? r.disabled : []).filter((id) => known.has(id)))], custom };
  return s;
}
// Every story a reciter can carry: built-in books, then the player's own.
export function storyCatalog(save) {
  const own = (save?.reciters?.custom || []).map((c) => ({ id: c.id, name: "A traveller with a handwritten book", book: c.title, voice: "your own story", look: "traveler", source: "Added by you", custom: true, count: c.lines.length }));
  return [...RECITERS.map((r) => ({ ...r, count: RECITATIONS[r.id].length })), ...own];
}
export function storyLines(save, id) { return RECITATIONS[id] || save?.reciters?.custom?.find((c) => c.id === id)?.lines || []; }
// Splits pasted text into recitation lines: verse (mostly short lines) line by line, prose sentence by sentence.
export function splitStory(text) {
  const raw = String(text || "").replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (!raw.length) return [];
  const short = raw.filter((l) => l.length < 80).length / raw.length > .6;
  const pieces = short ? raw : raw.join(" ").split(/(?<=[.!?…"”])\s+(?=[A-Z0-9"“'‘])/);
  const out = [];
  for (const p of pieces) { const t = p.trim(); if (!t) continue; if (out.length && out[out.length - 1].length + t.length < 90 && !short) out[out.length - 1] += " " + t; else out.push(t.slice(0, STORY_LIMITS.lineLength)); }
  return out.slice(0, STORY_LIMITS.lines);
}
export function addCustomStory(save, title, text) {
  ensureReciters(save); const r = save.reciters;
  if (r.custom.length >= STORY_LIMITS.stories) return { ok: false, message: `You can keep ${STORY_LIMITS.stories} stories of your own. Remove one first.` };
  const lines = splitStory(text); if (lines.length < 2) return { ok: false, message: "Paste at least two lines or sentences." };
  const id = `custom-${Date.now().toString(36)}`;
  r.custom.push({ id, title: String(title || "").trim().slice(0, STORY_LIMITS.titleLength) || "Untitled story", lines });
  return { ok: true, id, message: `Added ${lines.length} lines. A traveller will start carrying it on the road.` };
}
export function removeCustomStory(save, id) { ensureReciters(save); const r = save.reciters; r.custom = r.custom.filter((c) => c.id !== id); delete r.progress[id]; r.disabled = r.disabled.filter((q) => q !== id); }
export function reciterPlan(seed, key, save, chance = RECITER_CHANCE.wild) {
  const h = hashSeed(`${seed}:reciter:v1:${key}`);
  if ((h % 1000) / 1000 >= chance) return null;
  const off = new Set(save?.reciters?.disabled || []), pool = storyCatalog(save).filter((q) => !off.has(q.id));
  return pool.length ? pool[Math.floor(h / 1000) % pool.length] : null;
}
function placeReciter(map, who, id, open, r, width) {
  const trail = (map.trails || [])[0];
  let path = trail && trail.length > 4 ? trail.filter((p) => walkable(map.tiles[p.y * width + p.x])) : [0, 1, 2, 3].map(() => open[Math.floor(r() * open.length)]).filter(Boolean).map((t) => ({ x: t.x, y: t.y }));
  if (path.length < 2) return null;
  const at = path[Math.floor(r() * path.length)];
  const o = { id, kind: "traveler", reciter: who.id, name: who.name, role: `reciting ${who.book}`, look: who.look, mount: null, x: at.x, y: at.y, state: "walking", actions: ["speak"], facing: "down" };
  map.objects.push(o);
  map.reciterWalk = { path, index: (path.indexOf(at) + 1) % path.length, dir: 1 };
  return o;
}
export function addReciter(map, seed, rx, ry, save = null) {
  if (!map || map.reciterWalk || map.skirmish || map.tiles?.length !== 1024 || Math.abs(rx) + Math.abs(ry) < TRAVEL.minDepth) return null;
  const who = reciterPlan(seed, `${rx}:${ry}`, save, map.settlement ? RECITER_CHANCE.town : RECITER_CHANCE.wild); if (!who) return null;
  const r = rng(`${seed}:reciter-walk:${rx}:${ry}`), open = map.tiles.filter((t) => t.x > 4 && t.y > 4 && t.x < 27 && t.y < 27 && walkable(t));
  return placeReciter(map, who, `reciter:${rx},${ry}`, open, r, 32);
}
// In a dungeon level: a reciter strolls near the entrance.
export function addDungeonReciter(map, areaId, save, width) {
  if (!map || map.reciterWalk || !map.tiles?.length || !width) return null;
  const who = reciterPlan(save?.seed, `dungeon:${areaId}:${map.levelStableId || ""}`, save, RECITER_CHANCE.dungeon); if (!who) return null;
  const entry = map.entry || map.tiles.find(walkable), r = rng(`${areaId}:reciter-walk`);
  const open = map.tiles.filter((t) => walkable(t) && !t.environment && Math.hypot(t.x - entry.x, t.y - entry.y) > 1.5 && Math.hypot(t.x - entry.x, t.y - entry.y) < 7);
  if (open.length < 4) return null;
  return placeReciter(map, who, `reciter:${areaId}`, open, r, width);
}
export function reciterTalk(o, save) {
  ensureReciters(save);
  const who = storyCatalog(save).find((q) => q.id === o.reciter), lines = storyLines(save, o.reciter);
  if (!who || !lines.length) return "They hum something you almost recognise.";
  if (save.reciters.mode === "random") { const n = Math.floor(Math.random() * lines.length); return `${who.name}, from ${who.book} (line ${n + 1} of ${lines.length}): “${lines[n]}”`; }
  const n = save.reciters.progress[who.id] || 0, line = lines[n % lines.length], next = n + 1;
  save.reciters.progress[who.id] = next >= lines.length ? 0 : next;
  const opening = n === 0 ? ` (${who.voice}, ${who.book})` : "", ending = next >= lines.length ? " …and the book is done. They close it, and open it again at the first page." : "";
  return `${who.name}${opening}, line ${n + 1} of ${lines.length}: “${line}”${ending}`;
}
