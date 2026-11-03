// The far realms (release 714). Tim, 2026-11-03: "I'm gonna be pushing the world pretty far... at least a 1000... make sure that
// there's still content out in the far reaches... realms where the monsters are all really big... another realm where all of like
// the townspeople and Wanderers are actually monsters... a crystal civilization... a lightning giant civilization... inky black...
// the astral worm's homeland... large mushrooms... over a 1000 squares, straight line distance from 0,0".
//
// Beyond `start` sections of Ember Refuge (straight-line), the world is divided into realm cells `cell` sections across, their
// borders wavered by noise. Each cell rolls one number u in [0, 1) on its own hash; each version of this table gives a realm to a
// further band of u (`bands`), always carved out of what was still `ordinary`, so a cell keeps its realm in every later version.
// Only sections first seen with a version hold a realm (the atlas pins `farVersion`); ground seen before keeps none. Pure.
import { hashSeed } from "./random.js?v=r715-c5af443391e5";

export const FAR_REALMS = {
  version: 2, start: 1000, cell: 40, warp: 9, // 2 (release 715): the pockets (FAR_POCKETS)
  // [type, from, to] on the cell's roll; later versions only add bands inside what earlier versions left ordinary.
  bands: { 1: [["giants", 0, .18]] },
};
// What each realm does, as data. Giants: every ordinary creature of the overworld is this much bigger and stronger.
export const FAR_GIANTS = { scale: 1.75, body: 1.5, hp: 2.2, damage: 1.35, speed: .88 };
export const FAR_REALM_INFO = {
  giants: { name: "the Giants' Reach", arrive: "Everything here is too big: the tracks in the earth are as wide as doors, and the things that made them are close. You are in the Giants' Reach." },
};

const noise = (seed, x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, h = (i, j) => (hashSeed(`${seed}:far-warp:${xi + i}:${yi + j}`) % 10007) / 10007, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return (h(0, 0) * (1 - sx) + h(1, 0) * sx) * (1 - sy) + (h(0, 1) * (1 - sx) + h(1, 1) * sx) * sy; };
export const farDistance = (rx, ry) => Math.hypot(rx, ry);
// The realm cell a section belongs to (null inside `start`).
export function farCell(seed, rx, ry) {
  if (farDistance(rx, ry) < FAR_REALMS.start) return null;
  const C = FAR_REALMS.cell, W = FAR_REALMS.warp, wx = rx + (noise(`${seed}:x`, rx / 13, ry / 13) - .5) * 2 * W, wy = ry + (noise(`${seed}:y`, rx / 13, ry / 13) - .5) * 2 * W;
  const cx = Math.floor(wx / C), cy = Math.floor(wy / C);
  return { cx, cy, id: `${cx},${cy}`, u: (hashSeed(`${seed}:far-realm:v1:${cx}:${cy}`) % 100003) / 100003 };
}
// The realm of a section seen with far-realm version `version` (0 or missing: none).
export function farRealmAt(seed, rx, ry, version = FAR_REALMS.version) {
  if (!(version > 0)) return null; const c = farCell(seed, rx, ry); if (!c) return null;
  for (let v = 1; v <= version; v++) for (const [type, lo, hi] of FAR_REALMS.bands[v] || []) if (c.u >= lo && c.u < hi) return { type, id: c.id, ...FAR_REALM_INFO[type] };
  return null;
}
// Release 714: a creature of the Giants' Reach. Ordinary creatures only: no world beast, guardian, hunt, ambient or named foe.
export function giantify(c) {
  if (!c || c.worldBeast || c.questingBeast || c.boss || c.ambient || c.stalker || c.stalkerKin || c.farGiant) return c;
  const G = FAR_GIANTS; c.farGiant = true;
  c.scale = (Number(c.scale) || 1) * G.scale; c.bodyRadius = (Number(c.bodyRadius) || .38) * G.body;
  c.maxHp = c.hp = Math.max(1, Math.round((Number(c.maxHp) || 10) * G.hp)); c.damage = Math.max(1, Math.round((Number(c.damage) || 1) * G.damage));
  c.speedMultiplier = (Number(c.speedMultiplier) || 1) * G.speed;
  return c;
}

// Release r715-c5af443391e5 (Tim: "the blob civilization can be just spread out throughout the world... different pockets, like different biome
// regions just have different blobs... groves of stags... spread throughout... after a 1000... there should be lots of moths"):
// pockets. From far-realm version `since`, each world region (landscape.ts regions, about 9 sections across) beyond `start` rolls
// once on its own hash: a stag grove (more likely in wooded regions, `groveLeans`) or a blob pocket whose blob suits the region
// (`blobByRegion`). In a pocket the overworld creatures are its kin (MONSTER_PACK groveStag, groveMoth and the five lesser blobs),
// and `extra` more of them gather there. They are lesser kin, never world beasts.
export const FAR_POCKETS = { since: 2, grove: .14, blob: .14, groveLean: 1.8, extra: { grove: 4, blob: 5 }, spacing: 3,
  groveLeans: ["forest", "jungle", "amber", "savanna", "petrified", "wild", "fungal"],
  grovePool: ["groveStag", "groveStag", "groveStag", "groveMoth", "groveMoth"],
  blobs: ["mossBlob", "emberBlob", "frostBlob", "duskBlob", "saltBlob"],
  blobByRegion: { forest: "mossBlob", jungle: "mossBlob", swamp: "mossBlob", fungal: "mossBlob", reef: "mossBlob", volcanic: "emberBlob", emberlands: "emberBlob", ashfields: "emberBlob", obsidian: "emberBlob", amber: "emberBlob",
    frost: "frostBlob", lakes: "frostBlob", sea: "frostBlob", isles: "frostBlob", lunar: "duskBlob", dream: "duskBlob", fog: "duskBlob", crystal: "duskBlob", alien: "duskBlob", biomech: "duskBlob",
    desert: "saltBlob", salt: "saltBlob", savanna: "saltBlob", glasslands: "saltBlob", petrified: "saltBlob" },
  text: { grove: { name: "a stag grove", arrive: "Antlers move among the trees, and grey moths drift between them like ash. This is a grove of the Briar Stag's kin." },
  blob: { name: "a blob pocket", arrive: "The ground glistens and quivers. Everything that moves here is one shape or another of ooze: a pocket of the Blob's kin." } },
};
export function farPocketAt(seed, rx, ry, version, region) {
  const P = FAR_POCKETS; if (!(version >= P.since) || farDistance(rx, ry) < FAR_REALMS.start || !region?.id) return null;
  const u = (hashSeed(`${seed}:far-pocket:v1:${region.id}`) % 100003) / 100003, g = P.grove * (P.groveLeans.includes(region.type) ? P.groveLean : 1);
  if (u < g) return { type: "grove", id: region.id, kinds: P.grovePool, ...P.text.grove };
  if (u < g + P.blob) { const kind = P.blobByRegion[region.type] || P.blobs[hashSeed(`${seed}:far-pocket:blob:${region.id}`) % P.blobs.length]; return { type: "blob", id: region.id, kinds: [kind], ...P.text.blob }; }
  return null;
}
// The creatures of a pocket: the section's overworld creatures become its kin, and `extra` more gather on open ground.
export function populatePocket(map, seed, rx, ry, pocket) {
  if (!map || !pocket || map.farPocket) return map; map.farPocket = pocket.type;
  const kinds = pocket.kinds, pick = (k) => kinds[hashSeed(`${seed}:far-pocket:kind:${rx}:${ry}:${k}`) % kinds.length], spawns = (map.enemySpawns ||= []);
  spawns.forEach((e, i) => { if (e.packOverworld || !(e.ambient || e.passiveBehavior || e.shelterAmbush || e.districtResident || e.boss || e.elite || e.gatePredator || e.foundryId || e.viewportHuntId || e.domainId || e.huntInstanceId || e.worldBeast || e.questingBeast || e.skirmishId)) e.kind = pick(`c${i}`); }); // every ordinary creature (hunt, domain, ambient and named foes keep theirs)
  const width = Number(map.width) || 32, height = Math.floor((map.tiles?.length || 1024) / width), taken = [...spawns, ...(map.objects || [])].filter((q) => Number.isFinite(q?.x));
  const open = (map.tiles || []).filter((t) => !t.blocked && !t.environment && !t.structure && !t.buildingId && t.x > 2 && t.y > 2 && t.x < width - 3 && t.y < height - 3 && taken.every((q) => Math.hypot(q.x - t.x, q.y - t.y) >= FAR_POCKETS.spacing))
    .sort((a, b) => hashSeed(`${seed}:far-pocket:spot:${rx}:${ry}:${a.x}:${a.y}`) - hashSeed(`${seed}:far-pocket:spot:${rx}:${ry}:${b.x}:${b.y}`));
  let n = 0; const want = FAR_POCKETS.extra[pocket.type] || 0;
  for (const t of open) { if (n >= want) break; if (taken.some((q) => Math.hypot(q.x - t.x, q.y - t.y) < FAR_POCKETS.spacing)) continue;
    const e = { id: `far-pocket:${rx}:${ry}:${n}`, kind: pick(`x${n}`), x: t.x, y: t.y, packOverworld: true, farPocket: pocket.type }; spawns.push(e); taken.push(e); n++; }
  return map;
}
