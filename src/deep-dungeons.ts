import { hashSeed, rng } from "./random.ts";

export const DEEP_DUNGEON_SCHEMA_VERSION = 2;
export const DEEP_ARCHETYPE_IDS = ["threefold", "descent", "loop", "flooded", "fortress"];

export const DEEP_ARCHETYPES = {
  threefold: { name: "The Threefold Deep", identity: "three-wing sealed undercroft", emphasis: "combat", history: "Three wardens were entombed around a central oath-gate." },
  descent: { name: "The Long Descent", identity: "layered abyssal expedition", emphasis: "endurance", history: "Successive survey parties built anchors downward and never returned to remove them." },
  loop: { name: "The Returning Archive", identity: "self-revising circular ruin", emphasis: "navigation", history: "Its custodians folded every forbidden catalogue back toward the reading chamber." },
  flooded: { name: "The Drowned Processional", identity: "partially submerged memorial complex", emphasis: "mechanisms", history: "A funeral road was drowned to keep its final passenger from reaching the gate." },
  fortress: { name: "The Buried Ward", identity: "subterranean fortress-settlement", emphasis: "inhabitants", history: "A complete ward was sealed below the Corridor with defenders and civilians still inside." },
};

export const DEEP_STORY_PACKAGES = {
  none: null,
  boundSpirit: {
    id: "bound-spirit-v1", version: 1, title: "The Unquiet Warden", initiator: "ghost", reward: { aperture: 3 },
    beats: ["meet", "avenge", "release"], summary: "A bound spirit asks that the guardian carrying its name be destroyed.",
  },
  resonantDead: {
    id: "resonant-dead-v1", version: 1, title: "Three Notes for the Dead", initiator: "mechanism", reward: { armorSphere: 1 },
    beats: ["tone-one", "tone-two", "tone-three", "procession"], summary: "Three tones reconstruct the last procession and open its memorial chamber.",
  },
  lostBearer: {
    id: "lost-bearer-v1", version: 1, title: "The Name Returned", initiator: "relic", reward: { weaponSphere: 1 },
    beats: ["find-relic", "return-relic", "reunion"], summary: "A recovered nameplate can reunite a dead bearer with the companion waiting at the anchor.",
  },
};

export function deepV2Archetype(seed, generation = 1, rx = 0, ry = 0) {
  return DEEP_ARCHETYPE_IDS[hashSeed(`${seed}:deep-v2:archetype:g${generation}:${rx}:${ry}`) % DEEP_ARCHETYPE_IDS.length];
}
export function deepV2Id(seed, generation = 1, rx = 0, ry = 0, archetype = deepV2Archetype(seed, generation, rx, ry)) {
  return `dungeon:${seed}:g${generation}:${rx}:${ry}:deep-v2:${archetype}`;
}
export function isDeepV2Id(id) { return typeof id === "string" && /:deep-v2:(threefold|descent|loop|flooded|fortress)$/.test(id); }
export function deepV2ArchetypeFromId(id) { return String(id).match(/:deep-v2:([^:]+)$/)?.[1] || "threefold"; }

function storyFor(seed, id, archetype) {
  const choices = archetype === "flooded" ? ["none", "resonantDead", "lostBearer"] : archetype === "fortress" ? ["none", "boundSpirit", "lostBearer"] : ["none", "boundSpirit", "resonantDead"];
  const key = choices[hashSeed(`${seed}:deep-story-v1:${id}`) % choices.length], template = DEEP_STORY_PACKAGES[key];
  return template ? { ...template, beats: [...template.beats], reward: { ...template.reward } } : null;
}

function canvas(width, height) {
  const tiles = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) tiles.push({ x, y, kind: "deepWall", blocked: true, detail: (x * 3 + y * 5) % 4 });
  const floor = (x, y, extra = {}) => { if (x > 0 && y > 0 && x < width - 1 && y < height - 1) tiles[y * width + x] = { x, y, kind: "deepFloor", blocked: false, detail: (x + y) % 4, ...extra }; };
  const rect = (x0, y0, x1, y1, extra = {}) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) floor(x, y, extra); };
  const hall = (x0, y0, x1, y1, radius = 1) => { let x = x0, y = y0; for (;;) { for (let oy = -radius; oy <= radius; oy++) for (let ox = -radius; ox <= radius; ox++) floor(x + ox, y + oy); if (x === x1 && y === y1) break; if (x !== x1) x += Math.sign(x1 - x); else y += Math.sign(y1 - y); } };
  return { tiles, floor, rect, hall };
}

function sealTiles(map, gate, cells) {
  map.finalGateTiles = cells;
  for (const p of cells) map.tiles[p.y * map.width + p.x] = { ...map.tiles[p.y * map.width + p.x], kind: "sealedGate", blocked: true, gateId: gate.id };
}

function baseMap(seed, id, archetype, width, height, entry, hub) {
  const meta = DEEP_ARCHETYPES[archetype], c = canvas(width, height), prefix = `deep-v2-${archetype}`;
  return { seed, id, recipe: "deep-v2", deepDungeon: true, schemaVersion: DEEP_DUNGEON_SCHEMA_VERSION, archetype, ...meta, depth: "deep", width, height, entry, hub, tiles: c.tiles, objects: [{ id: `${prefix}-exit`, kind: "exit", ...entry, state: "open", actions: ["exit"] }, { id: `${prefix}-entry-anchor`, kind: "entryAnchor", ...entry, state: "stable", actions: [] }, { id: `${prefix}-hub-anchor`, kind: "hubAnchor", ...hub, state: "stable", actions: [] }], enemySpawns: [], objectives: [], zones: [], layoutGraph: { nodes: [], edges: [] }, shortcuts: [], finalGateTiles: [], finalEnemyIds: [], storyPackage: storyFor(seed, id, archetype), ...c };
}

function addObjective(map, q) {
  map.objectives.push({ required: true, ...q });
  if (q.type === "guardian") map.enemySpawns.push({ id: q.enemyId, kind: q.enemyKind, x: q.x, y: q.y, boss: true, deepDungeon: true, dungeonRole: "objectiveGuardian", objectiveId: q.id });
  else map.objects.push({ id: q.objectId, kind: "deepMechanism", name: q.name, x: q.x, y: q.y, state: "dormant", actions: ["activate"], objectiveId: q.id });
  if (q.anchor) {
    const anchor = { id: `${q.id}-anchor`, kind: "deepAnchor", name: q.anchor.name, x: q.anchor.x, y: q.anchor.y, state: "dormant", actions: [], unlockObjectiveId: q.id };
    map.objects.push(anchor); map.shortcuts.push(anchor.id);
  }
}

function finalize(map, gate, finalBoss, cells) {
  gate.requires = map.objectives.filter((q) => q.required).map((q) => q.id);
  map.objects.push(gate); sealTiles(map, gate, cells);
  map.enemySpawns.push(finalBoss); map.finalGate = gate; map.finalGateId = gate.id; map.finalArena = { id: finalBoss.arenaId, sealedBy: gate.id, bossId: finalBoss.id }; map.finalEnemyIds = [finalBoss.id];
  if (map.storyPackage) {
    const p = map.storyPackage, near = map.hub;
    if (p.initiator === "ghost") map.objects.push({ id: `${p.id}-ghost`, kind: "storyGhost", name: "Waiting Shade", x: near.x + 2, y: near.y, state: "waiting", actions: ["listen"], storyId: p.id });
    if (p.initiator === "relic") { map.objects.push({ id: `${p.id}-relic`, kind: "storyRelic", name: "Lost Nameplate", x: near.x - 3, y: near.y - 4, state: "unclaimed", actions: ["collect"], storyId: p.id }); map.objects.push({ id: `${p.id}-bearer`, kind: "storyGhost", name: "Nameless Bearer", x: near.x + 2, y: near.y, state: "waiting", actions: ["listen"], storyId: p.id }); }
    if (p.initiator === "mechanism") for (let i = 0; i < 3; i++) map.objects.push({ id: `${p.id}-tone-${i + 1}`, kind: "storyTone", name: `Processional Tone ${i + 1}`, x: near.x + (i - 1) * 5, y: near.y + (i % 2 ? 4 : -4), state: "silent", actions: ["sound"], storyId: p.id, beatId: `tone-${["one", "two", "three"][i]}` });
  }
  delete map.floor; delete map.rect; delete map.hall;
  return map;
}

function threefold(seed, id) {
  const m = baseMap(seed, id, "threefold", 64, 64, { x: 31, y: 59 }, { x: 32, y: 33 });
  m.rect(27, 27, 37, 38); m.rect(28, 56, 35, 62); m.hall(31, 58, 31, 35); m.rect(3, 25, 16, 40); m.hall(27, 32, 14, 32); m.rect(47, 25, 60, 40); m.hall(37, 32, 49, 32); m.rect(9, 43, 23, 55); m.hall(29, 37, 21, 47); m.rect(23, 3, 41, 17); m.hall(32, 27, 32, 15);
  addObjective(m, { id: "west-seal", type: "guardian", name: "West Warden", enemyId: "deep-v2-threefold-west", enemyKind: "rootBrute", x: 7, y: 32, anchor: { name: "West Return", x: 15, y: 34 } });
  addObjective(m, { id: "east-seal", type: "guardian", name: "East Warden", enemyId: "deep-v2-threefold-east", enemyKind: "sparkWarden", x: 57, y: 32, anchor: { name: "East Return", x: 48, y: 34 } });
  addObjective(m, { id: "south-seal", type: "guardian", name: "South Warden", enemyId: "deep-v2-threefold-south", enemyKind: "coilStalker", x: 16, y: 52, anchor: { name: "South Return", x: 21, y: 46 } });
  m.zones = [{ id: "hub", name: "Oath Rotunda" }, { id: "west", name: "Root Wing" }, { id: "east", name: "Glass Wing" }, { id: "south", name: "Coil Wing" }, { id: "final", name: "Sealed Choir" }];
  return finalize(m, { id: "deep-v2-threefold-final-gate", kind: "sealedGate", x: 32, y: 24, state: "sealed", actions: ["inspect"] }, { id: "deep-v2-threefold-final", kind: "gateRevenant", x: 32, y: 9, boss: true, deepDungeon: true, dungeonRole: "finalBoss", arenaId: "threefold-final" }, [30, 31, 32, 33, 34].map((x) => ({ x, y: 24 })));
}

function descent(seed, id) {
  const m = baseMap(seed, id, "descent", 64, 72, { x: 32, y: 68 }, { x: 32, y: 61 });
  for (const [y0, y1] of [[58, 69], [40, 53], [22, 35], [3, 16]]) m.rect(20, y0, 44, y1); m.hall(32, 68, 32, 8);
  addObjective(m, { id: "survey-warden", type: "guardian", name: "Survey Warden", enemyId: "deep-v2-descent-warden", enemyKind: "hollowMarshal", x: 25, y: 47, anchor: { name: "Second Survey Anchor", x: 39, y: 51 } });
  addObjective(m, { id: "depth-engine", type: "mechanism", name: "Depth Engine", objectId: "deep-v2-depth-engine", x: 25, y: 29, anchor: { name: "Third Survey Anchor", x: 39, y: 33 } });
  m.zones = ["Mouth Survey", "Broken Lift", "Pressure Vault", "Lowest Camp"].map((name, i) => ({ id: `depth-${i}`, name, floor: i + 1 }));
  return finalize(m, { id: "deep-v2-descent-threshold", kind: "sealedGate", x: 32, y: 19, state: "sealed", actions: ["inspect"] }, { id: "deep-v2-descent-final", kind: "gravitantBell", x: 32, y: 9, boss: true, deepDungeon: true, dungeonRole: "finalBoss", arenaId: "lowest-camp" }, [30, 31, 32, 33, 34].map((x) => ({ x, y: 19 })));
}

function loop(seed, id) {
  const m = baseMap(seed, id, "loop", 68, 68, { x: 34, y: 63 }, { x: 34, y: 55 });
  m.rect(8, 8, 59, 15); m.rect(8, 52, 59, 59); m.rect(8, 15, 15, 52); m.rect(52, 15, 59, 52); m.hall(34, 63, 34, 8); m.hall(12, 34, 56, 34); m.rect(25, 25, 43, 43);
  addObjective(m, { id: "west-index", type: "mechanism", name: "West Index", objectId: "deep-v2-loop-west-index", x: 11, y: 34, anchor: { name: "West Reading Mark", x: 16, y: 34 } });
  addObjective(m, { id: "east-index", type: "mechanism", name: "East Index", objectId: "deep-v2-loop-east-index", x: 56, y: 34, anchor: { name: "East Reading Mark", x: 51, y: 34 } });
  for (let x = 8; x <= 59; x++) m.tiles[20 * m.width + x] = { x, y: 20, kind: "deepWall", blocked: true, detail: x % 4 };
  addObjective(m, { id: "south-index", type: "mechanism", name: "South Index", objectId: "deep-v2-loop-south-index", x: 34, y: 55, anchor: { name: "South Reading Mark", x: 34, y: 50 } });
  m.zones = [{ id: "outer-ring", name: "Returning Stacks" }, { id: "cross-index", name: "Cross Index" }, { id: "heart", name: "Forbidden Catalogue" }];
  return finalize(m, { id: "deep-v2-loop-catalogue-gate", kind: "sealedGate", x: 34, y: 20, state: "sealed", actions: ["inspect"] }, { id: "deep-v2-loop-final", kind: "knifeChoir", x: 34, y: 11, boss: true, deepDungeon: true, dungeonRole: "finalBoss", arenaId: "forbidden-catalogue" }, [32, 33, 34, 35, 36].map((x) => ({ x, y: 20 })));
}

function flooded(seed, id) {
  const m = baseMap(seed, id, "flooded", 68, 68, { x: 34, y: 63 }, { x: 34, y: 55 });
  m.rect(6, 48, 61, 64); m.rect(6, 20, 16, 48); m.rect(51, 20, 61, 48); m.rect(20, 5, 47, 18); m.hall(11, 34, 56, 34); m.hall(34, 55, 34, 12);
  for (let y = 22; y <= 46; y++) for (let x = 19; x <= 48; x++) if (!m.tiles[y * m.width + x].blocked) m.tiles[y * m.width + x] = { x, y, kind: "dungeonWater", blocked: true, environment: "river", waterDepth: "deep", optionalUnderwater: true };
  for (let y = 22; y <= 46; y++) for (let x = 32; x <= 36; x++) m.floor(x, y, { kind: "bridge", bridgeOver: "river", permanent: true });
  addObjective(m, { id: "west-sluice", type: "mechanism", name: "West Sluice", objectId: "deep-v2-west-sluice", x: 11, y: 27, anchor: { name: "West Dry Anchor", x: 14, y: 40 } });
  addObjective(m, { id: "east-drowned-warden", type: "guardian", name: "Drowned Warden", enemyId: "deep-v2-drowned-warden", enemyKind: "mireApostle", x: 56, y: 28, anchor: { name: "East Dry Anchor", x: 53, y: 40 } });
  m.zones = [{ id: "landing", name: "Dry Landing" }, { id: "processional", name: "Flooded Processional" }, { id: "sluices", name: "Twin Sluices" }, { id: "memorial", name: "Sunken Memorial" }];
  return finalize(m, { id: "deep-v2-flooded-memorial-gate", kind: "sealedGate", x: 34, y: 19, state: "sealed", actions: ["inspect"] }, { id: "deep-v2-flooded-final", kind: "voidSentinel", x: 34, y: 11, boss: true, deepDungeon: true, dungeonRole: "finalBoss", arenaId: "sunken-memorial" }, [32, 33, 34, 35, 36].map((x) => ({ x, y: 19 })));
}

function fortress(seed, id) {
  const m = baseMap(seed, id, "fortress", 72, 72, { x: 36, y: 67 }, { x: 36, y: 58 });
  for (const r of [[5, 44, 25, 63], [27, 44, 45, 63], [47, 44, 66, 63], [5, 20, 25, 40], [27, 20, 45, 40], [47, 20, 66, 40], [24, 3, 48, 16]]) m.rect(...r); m.hall(15, 52, 57, 52); m.hall(15, 30, 57, 30); m.hall(36, 67, 36, 10);
  addObjective(m, { id: "barracks-captain", type: "guardian", name: "Buried Captain", enemyId: "deep-v2-buried-captain", enemyKind: "rootBrute", x: 15, y: 30, anchor: { name: "Barracks Anchor", x: 22, y: 38 } });
  addObjective(m, { id: "ward-engine", type: "mechanism", name: "Ward Engine", objectId: "deep-v2-ward-engine", x: 57, y: 30, anchor: { name: "Foundry Anchor", x: 50, y: 38 } });
  addObjective(m, { id: "occupied-square", type: "guardian", name: "Occupation Beast", enemyId: "deep-v2-occupation-beast", enemyKind: "coilStalker", x: 36, y: 52, anchor: { name: "Market Anchor", x: 36, y: 45 } });
  m.objects.push({ id: "deep-v2-fortress-merchant", kind: "shelterMerchant", name: "Quartermaster Ilex", x: 31, y: 57, state: "calm", actions: ["trade"] });
  m.zones = [{ id: "market", name: "Buried Market" }, { id: "barracks", name: "Silent Barracks" }, { id: "foundry", name: "Ward Foundry" }, { id: "cathedral", name: "Oath Cathedral" }];
  return finalize(m, { id: "deep-v2-fortress-cathedral-gate", kind: "sealedGate", x: 36, y: 18, state: "sealed", actions: ["inspect"] }, { id: "deep-v2-fortress-final", kind: "gateRevenant", x: 36, y: 9, boss: true, deepDungeon: true, dungeonRole: "finalBoss", arenaId: "oath-cathedral" }, [34, 35, 36, 37, 38].map((x) => ({ x, y: 18 })));
}

export function generateDeepV2Dungeon(seed, id) {
  const archetype = deepV2ArchetypeFromId(id), fn = { threefold, descent, loop, flooded, fortress }[archetype] || threefold;
  return fn(seed, id);
}

export function deepV2Descriptor(id) {
  const archetype = deepV2ArchetypeFromId(id), meta = DEEP_ARCHETYPES[archetype] || DEEP_ARCHETYPES.threefold;
  return { recipe: "deep-v2", archetype, name: meta.name, identity: meta.identity, danger: "expedition-class", depth: "deep", schemaVersion: DEEP_DUNGEON_SCHEMA_VERSION };
}
