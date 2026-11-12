// The far realms (release 714). Tim, 2026-11-03: "I'm gonna be pushing the world pretty far... at least a 1000... make sure that
// there's still content out in the far reaches... realms where the monsters are all really big... another realm where all of like
// the townspeople and Wanderers are actually monsters... a crystal civilization... a lightning giant civilization... inky black...
// the astral worm's homeland... large mushrooms... over a 1000 squares, straight line distance from 0,0".
//
// Beyond `start` sections of Ember Refuge (straight-line), the world is divided into realm cells `cell` sections across, their
// borders wavered by noise. Each cell rolls one number u in [0, 1) on its own hash; each version of this table gives a realm to a
// further band of u (`bands`), always carved out of what was still `ordinary`, so a cell keeps its realm in every later version.
// Only sections first seen with a version hold a realm (the atlas pins `farVersion`); ground seen before keeps none. Pure.
import { hashSeed, byHash } from "./random.js?v=r915-8e160cc9bc37";

export const FAR_REALMS = {
  version: 6, start: 1000, cell: 40, warp: 9, // 5 (719): the Ink Wastes; 6 (720): the folk realms; // 2 (release 715): the pockets (FAR_POCKETS); 3 (716): the civilisations (FAR_CIVS); 4 (717): the Storm Halls' people
  // [type, from, to] on the cell's roll; later versions only add bands inside what earlier versions left ordinary.
  bands: { 1: [["giants", 0, .18]], 5: [["ink", .18, .3]], 6: [["monsterFolk", .3, .38], ["giantFolk", .38, .46]] },
};
// What each realm does, as data. Giants: every ordinary creature of the overworld is this much bigger and stronger.
export const FAR_GIANTS = { scale: 1.75, body: 1.5, hp: 2.2, damage: 1.35, speed: .88 };
export const FAR_REALM_INFO = {
  monsterFolk: { name: "the Hollow Kin", arrive: "Smoke rises from the hearths here, and people walk the roads like anywhere else. Look closer: they do not blink. This is the country of the Hollow Kin." },
  giantFolk: { name: "the Tall Country", arrive: "The doors here are twice the height of a man and the people who use them bend to look at you, kindly, spears on their backs. This is the Tall Country." },
  ink: { name: "the Ink Wastes", arrive: "The ground is black and soft and runs like wet paint; things move in it, and the things that walk here are black as the ground. This is the Astral Worm's homeland: the Ink Wastes." },
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

// Release 715 (Tim: "the blob civilization can be just spread out throughout the world... different pockets, like different biome
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
    desert: "saltBlob", salt: "saltBlob", savanna: "saltBlob", glasslands: "saltBlob", petrified: "saltBlob", terraces: "saltBlob", reckoning: "duskBlob", glacier: "frostBlob" },
  text: { grove: { name: "a stag grove", arrive: "Antlers move among the trees, and grey moths drift between them like ash. This is a grove of the Briar Stag's kin." },
  blob: { name: "a blob pocket", arrive: "The ground glistens and quivers. Everything that moves here is one shape or another of ooze: a pocket of the Blob's kin." } },
};
export function farPocketAt(seed, rx, ry, version, region) {
  const P = FAR_POCKETS; if (!(version >= P.since) || farDistance(rx, ry) < FAR_REALMS.start || !region?.id) return null;
  const civ = farCivAt(seed, rx + .5, ry + .5); if (civ && version >= civ.since) return { type: civ.id, civ: true, id: civ.id, kinds: civ.kinds, name: civ.name, arrive: civ.arrive }; // release 716: a civilisation's whole country
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
    .sort(byHash((a) => `${seed}:far-pocket:spot:${rx}:${ry}:${a.x}:${a.y}`));
  let n = 0; const want = FAR_POCKETS.extra[pocket.type] ?? FAR_CIVS[pocket.type]?.extra ?? 0;
  for (const t of open) { if (n >= want) break; if (taken.some((q) => Math.hypot(q.x - t.x, q.y - t.y) < FAR_POCKETS.spacing)) continue;
    const e = { id: `far-pocket:${rx}:${ry}:${n}`, kind: pick(`x${n}`), x: t.x, y: t.y, packOverworld: true, farPocket: pocket.type }; spawns.push(e); taken.push(e); n++; }
  return map;
}

// Release 716 (Tim: "a large crystal civilization that you can find... all the monsters... are psychic crystals or variations...
// some of them can be smaller, like half crystals... crystal walkers, like the crystal crabs... we won't have the other regular
// monsters in that section... dungeons... regular... a quest which takes you there... after you beat the crystal over a 1000"):
// the civilisations. Each is one great round country (`radius` sections) whose centre lies `min` to `min + span` sections out at a
// bearing set by the seed. Its land is the civilisation's own region type (landscape.ts regionAt from version 15) and, from far-realm
// version `since`, its overworld creatures are its kin (as in a pocket). Slay its world beast (`beast`) `FAR_REALMS.start` or more
// out and the Journal opens a quest to it (`save.farQuests[id]`), which the compass follows until you arrive.
export const FAR_CIVS = {
  crystal: { since: 3, landSince: 15, min: 1150, span: 300, radius: 26, land: "crystal", beast: "psychicCrystal", extra: 6, kinds: ["shardling", "shardling", "prismWarden", "crystalStrider", "crystalStrider"],
    name: "the Crystal Civilisation", arrive: "The ground rings underfoot. Spires of crystal stand in rows like streets, and things of crystal float and walk between them. You have found the Crystal Civilisation.",
    quest: "With the Psychic Crystal fallen, its thoughts scatter, and one goes home: far out, there is a whole country of its kind. Your compass knows the way to the Crystal Civilisation.",
    found: "You have reached the Crystal Civilisation." },
  // Release 717: the Lightning Giant's people, on the pillar lands, in the far quarter the seed sets.
  storm: { since: 4, landSince: 16, min: 1200, span: 300, radius: 26, land: "pillars", beast: "lightningGiant", extra: 6, kinds: ["stormling", "stormling", "sparkHauler", "sparkHauler", "coilWarden"],
    name: "the Storm Halls", arrive: "Thunder rolls without a cloud. Tall stone stands everywhere like towers, coils hum on their heads, and the robots of the Lightning Giant's people walk between them. You have found the Storm Halls.",
    quest: "With the Lightning Giant fallen, its last charge runs out along the ground toward home: far out, its people have built a whole country. Your compass knows the way to the Storm Halls.",
    found: "You have reached the Storm Halls." },
};
const civCache = new Map();
export function farCivCentre(seed, id) {
  const key = `${seed}:${id}`; let c = civCache.get(key); if (c) return c; const C = FAR_CIVS[id], h = (k) => (hashSeed(`${seed}:far-civ:v1:${id}:${k}`) % 100003) / 100003;
  const a = h("bearing") * Math.PI * 2, d = C.min + h("distance") * C.span; c = { id, rx: Math.round(Math.cos(a) * d), ry: Math.round(Math.sin(a) * d), radius: C.radius }; civCache.set(key, c); return c;
}
// The civilisation at a point in section units (sx, sy), or null.
export function farCivAt(seed, sx, sy) {
  for (const id of Object.keys(FAR_CIVS)) { const c = farCivCentre(seed, id); if (Math.hypot(sx - c.rx - .5, sy - c.ry - .5) <= c.radius) return { id, ...FAR_CIVS[id], centre: c }; }
  return null;
}
// The quests to the civilisations, kept in the save (additive at schema 14; normalised from ensureWorldBeasts).
// Release 723: the domains (far-domains.ts): one bespoke section each, the arena a world beast comes home to. Found by wandering
// onto it, or by the quest its beast's fall opens a thousand sections or more out (the same quests as the civilisations').
export const FAR_DOMAINS = {
  questingBeast: { beast: "questingBeast", min: 1100, span: 250, version: 1, name: "the Thornglass Caldera",
    arrive: "Heat beats up from the ground. Crystals as tall as towers have burst out of black rock, and lava runs between them. This is the Questing Beast's own ground: the Thornglass Caldera.",
    quest: "The Questing Beast falls, but something of it runs on, far out, to the place it was made: a caldera of crystal and fire. Your compass knows the way to the Thornglass Caldera.",
    found: "You have reached the Thornglass Caldera.",
    wait: [45, 110], // seconds spent in the caldera before its beast comes, hashed per visit
    comes: "A roar rolls round the caldera. The Questing Beast has come home, and it has found you here.",
    waiting: "The Questing Beast is not here now. Wait in its caldera, and it may come back." },
  voidWalker: { beast: "voidWalker", min: 1100, span: 250, version: 1, name: "the Unlit Shore", wait: [45, 110], // release 724
    arrive: "Islands of black rock stand in a sea of starless dark. Nothing shines here; even the fog is dim. This is the Void Walker's shore.",
    quest: "The Void Walker falls, and the dark it carried runs home, far out, to a shore where there are no stars. Your compass knows the way to the Unlit Shore.",
    found: "You have reached the Unlit Shore.", comes: "The fog thickens and something walks out of it. The Void Walker has come back to its shore.", waiting: "The Void Walker is not on its shore now. Wait here in the dark, and it may come back." },
  crimsonTyrant: { beast: "crimsonTyrant", min: 1137, span: 250, version: 1, name: "the Red Throne", wait: [45, 110], // release 724
    arrive: "A plateau of red glass rises out of a lake of fire, set about with spikes of black and crimson. This is the Crimson Tyrant's throne.",
    quest: "The Crimson Tyrant falls, but its fire remembers a throne far out, where the mountain is all red glass. Your compass knows the way to the Red Throne.",
    found: "You have reached the Red Throne.", comes: "A shadow crosses the fire and the air bursts hot. The Crimson Tyrant has come back to its throne.", waiting: "The Crimson Tyrant's throne is empty now. Wait, and it may come back to claim it." },
  doomChaser: { beast: "doomChaser", min: 1174, span: 250, version: 1, name: "the Black Pyre", wait: [45, 110], // release 724
    arrive: "Ash lies deep over everything, and black fire burns in it without smoke. Charred pillars stand like the bones of a building. This is the Doom Chaser's pyre.",
    quest: "The Doom Chaser falls, and its black fire goes on burning, far out, where it was first lit. Your compass knows the way to the Black Pyre.",
    found: "You have reached the Black Pyre.", comes: "The black fire leaps all at once. The Doom Chaser has come back to its pyre.", waiting: "The black fire burns low. Wait here, and the Doom Chaser may come back to feed it." }, // release 760 left it empty; since the 2026-11-05 refinement he comes home here like the others (world-beasts.ts BEAST_HOMELANDS `beyond`)
  morphingBlob: { beast: "morphingBlob", min: 1211, span: 250, version: 1, name: "the Rendering Pit", wait: [45, 110], // release 724
    arrive: "A sunken basin of sour mud, its pools green and steaming, its edges piled with old bones. This is where the Morphing Blob was rendered down.",
    quest: "The Morphing Blob falls, and what is left of it seeps away toward a pit far out, where it began. Your compass knows the way to the Rendering Pit.",
    found: "You have reached the Rendering Pit.", comes: "The pools heave and climb out of themselves. The Morphing Blob has come back to its pit.", waiting: "The pools lie still. Wait here, and the Morphing Blob may rise out of them." },
  tremorWorm: { beast: "tremorWorm", min: 1248, span: 250, version: 1, name: "the Hollow Dunes", wait: [45, 110], // release 724
    arrive: "A bowl of pale sand, ribbed with the bones of the ground and holed with burrows that go down and down. This is the Tremor Worm's hollow.",
    quest: "The Tremor Worm falls, and far out the dunes shift where it was born. Your compass knows the way to the Hollow Dunes.",
    found: "You have reached the Hollow Dunes.", comes: "The sand trembles, then heaves. The Tremor Worm has come back to its hollow.", waiting: "The sand is quiet. Wait here, and the Tremor Worm may come up out of it." },
  mountainTurtle: { beast: "mountainTurtle", min: 1105, span: 250, version: 1, name: "the Glass Shoal", wait: [45, 110], // release 724
    arrive: "An atoll of blue ice in an open sea, ringed with spires of frozen glass. This is the Mountain Turtle's shoal.",
    quest: "The Mountain Turtle falls, and far out a shoal of ice is waiting for it to come home. Your compass knows the way to the Glass Shoal.",
    found: "You have reached the Glass Shoal.", comes: "The ice cracks and groans under a great weight. The Mountain Turtle has come back to its shoal.", waiting: "The shoal is empty. Wait here on the ice, and the Mountain Turtle may come back." },
  ashenMoth: { beast: "ashenMoth", min: 1142, span: 250, version: 1, name: "the Cinder Orchard", wait: [45, 110], // release 724
    arrive: "Rows of burnt trees, their branches hung with split husks, stand in ash still warm underfoot. This is the Ashen Moth's orchard.",
    quest: "The Ashen Moth falls, and its dust drifts away toward an orchard far out where it grew. Your compass knows the way to the Cinder Orchard.",
    found: "You have reached the Cinder Orchard.", comes: "Ash rises from the ground in a whirl of wings. The Ashen Moth has come back to its orchard.", waiting: "No wings stir in the orchard now. Wait here, and the Ashen Moth may come back." },
  nanobotKnight: { beast: "nanobotKnight", min: 1179, span: 250, version: 1, name: "the Forge Spire", wait: [45, 110], // release 724
    arrive: "Plated ground, humming pylons and channels of molten slag: a foundry with no one left to work it. This is the Nanobot Knight's forge.",
    quest: "The Nanobot Knight falls, and its swarm scatters, homing on a forge far out where it was made. Your compass knows the way to the Forge Spire.",
    found: "You have reached the Forge Spire.", comes: "The pylons flare and a swarm pours together. The Nanobot Knight has come back to its forge.", waiting: "The pylons hum and nothing comes. Wait here, and the Nanobot Knight may come back to its forge." },
  briarStag: { beast: "briarStag", min: 1216, span: 250, version: 1, name: "the Thornheart Glade", wait: [45, 110], // release 724
    arrive: "A glade walled with briars older than any forest, their thorns as long as swords and hung with pale flowers. This is the Briar Stag's heart.",
    quest: "The Briar Stag falls, and far out the briars stir where it first took root. Your compass knows the way to the Thornheart Glade.",
    found: "You have reached the Thornheart Glade.", comes: "The briars part with a crack of wood. The Briar Stag has come back to its glade.", waiting: "The glade is still. Wait here among the briars, and the Briar Stag may come back." },
};
// Where a domain lies: a seeded bearing and distance; for a quest, the first section along that bearing not yet explored.
const domainCache = new Map();
export function farDomainCentre(seed, id) {
  const key = `${seed}:${id}`; let c = domainCache.get(key); if (c) return c; const D = FAR_DOMAINS[id], h = (k) => (hashSeed(`${seed}:far-domain:v1:${id}:${k}`) % 100003) / 100003;
  const a = h("bearing") * Math.PI * 2, d = D.min + h("distance") * D.span; c = { id, rx: Math.round(Math.cos(a) * d), ry: Math.round(Math.sin(a) * d), a }; domainCache.set(key, c); return c;
}
export function farDomainTarget(save, id) {
  const c = farDomainCentre(save.seed, id);
  for (let k = 0; k < 64; k++) { const d = Math.hypot(c.rx, c.ry) + k * 3, rx = Math.round(Math.cos(c.a) * d), ry = Math.round(Math.sin(c.a) * d); if (!save.atlas?.[`${rx},${ry}`]) return { rx, ry }; }
  return { rx: c.rx, ry: c.ry };
}
// The domain at a section, or null: the one a quest record names there, else the seeded one on ground not seen before.
export function farDomainAt(save, rx, ry, seenBefore = false) {
  for (const id of Object.keys(FAR_DOMAINS)) {
    const q = save?.farQuests?.[id]; if (q) { if (q.rx === rx && q.ry === ry) return id; continue; }
    const c = farDomainCentre(save.seed, id); if (!seenBefore && c.rx === rx && c.ry === ry) return id;
  }
  return null;
}
const FAR_QUEST_IDS = () => [...Object.keys(FAR_CIVS), ...Object.keys(FAR_DOMAINS)];
export const farQuestInfo = (id) => FAR_CIVS[id] || FAR_DOMAINS[id] || null;
export function ensureFarQuests(save) {
  const raw = save?.farQuests, out = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    // Release 736 (review S7): a known quest keeps fields a newer release added (unknown quest ids are still dropped).
    for (const id of FAR_QUEST_IDS()) { const q = raw[id]; if (q && typeof q === "object" && ["open", "found"].includes(q.status) && Number.isInteger(q.rx) && Number.isInteger(q.ry)) out[id] = { ...q, status: q.status, rx: q.rx, ry: q.ry }; }
  }
  if (save) save.farQuests = out; return save;
}
// A world beast slain at (rx, ry): opens the quest to its civilisation when far enough out. Returns the civ id opened, or null.
export function openFarQuest(save, beast, rx, ry) {
  if (farDistance(rx, ry) < FAR_REALMS.start) return null; ensureFarQuests(save);
  for (const [id, C] of Object.entries(FAR_CIVS)) if (C.beast === beast && !save.farQuests[id]) { const c = farCivCentre(save.seed, id); save.farQuests[id] = { status: "open", rx: c.rx, ry: c.ry }; return id; }
  for (const [id, D] of Object.entries(FAR_DOMAINS)) if (D.beast === beast && !save.farQuests[id]) { const c = farDomainTarget(save, id); save.farQuests[id] = { status: "open", rx: c.rx, ry: c.ry }; return id; } // release 723
  return null;
}
// The open quest the compass follows (the first open one), or null.
export function activeFarQuest(save) { for (const [id, q] of Object.entries(save?.farQuests || {})) if (q.status === "open") return { id, rx: q.rx, ry: q.ry, name: farQuestInfo(id)?.name || id }; return null; }

// Release 719: the Ink Wastes (realm `ink`). Its land is washed in ink where the ground is drawn (renderer.ts inkWash, once per
// section), every ordinary creature is ink-black (`farInk`, tinted in its cached sprite), and `share` of them are the Worm's own
// shapes (`kinds`), with `extra` more.
export const FAR_INK = { share: .5, extra: 3, kinds: ["inkPool", "inkGriffin", "inkWing", "inkStrider", "inkMaw"],
  // the ordinary creatures that are painted black: the overworld roster drawn through the cached sprite (monster-render), so the tint holds
  painted: ["thunderhorn", "siegeBeetle", "cinderSeraph", "riftLynx", "graveLantern", "veilSpinner", "lumenWraith", "mirrorShade"] };
export function populateInk(map, seed, rx, ry) {
  if (!map || map.farInkPopulated) return map; map.farInkPopulated = true; map.farInk = true;
  const I = FAR_INK, spawns = (map.enemySpawns ||= []), h = (k) => hashSeed(`${seed}:far-ink:${rx}:${ry}:${k}`), ordinary = (e) => e.packOverworld || !(e.ambient || e.passiveBehavior || e.shelterAmbush || e.districtResident || e.boss || e.elite || e.gatePredator || e.foundryId || e.viewportHuntId || e.domainId || e.huntInstanceId || e.worldBeast || e.questingBeast || e.skirmishId);
  spawns.forEach((e, i) => { if (!ordinary(e)) return; if ((h(`s${i}`) % 1000) / 1000 < I.share) e.kind = I.kinds[h(`k${i}`) % I.kinds.length]; else if (!e.packOverworld) { e.kind = I.painted[h(`o${i}`) % I.painted.length]; e.packOverworld = true; } });
  const width = Number(map.width) || 32, height = Math.floor((map.tiles?.length || 1024) / width), taken = [...spawns, ...(map.objects || [])].filter((q) => Number.isFinite(q?.x));
  const open = (map.tiles || []).filter((t) => !t.blocked && !t.environment && !t.structure && !t.buildingId && t.x > 2 && t.y > 2 && t.x < width - 3 && t.y < height - 3).sort((a, b) => h(`p${a.x},${a.y}`) - h(`p${b.x},${b.y}`));
  let n = 0; for (const t of open) { if (n >= I.extra) break; if (taken.some((q) => Math.hypot(q.x - t.x, q.y - t.y) < 3)) continue; const e = { id: `far-ink:${rx}:${ry}:${n}`, kind: I.kinds[h(`x${n}`) % I.kinds.length], x: t.x, y: t.y, packOverworld: true }; spawns.push(e); taken.push(e); n++; }
  return map;
}

// Release 720 (Tim: "another realm where all of like the townspeople and Wanderers are actually monsters... they come in waves of
// monsters that are just townspeople, and then another version where all the townspeople are just really, really big too, and they
// can throw spears... during the fights"): the folk realms. In the Hollow Kin's country the travellers and the hamlets' folk turn when
// the Wayfarer comes within `reveal` tiles: each becomes one of `kinds`, and `waves` - 1 more waves of `waveSize` come in from the
// edges, each once fewer than `next` of the last remain (no sanctuary there). In the Tall Country the folk are `scale` times the
// Wayfarer's size and every `spear.every` s each throws a spear at the nearest hostile creature within `spear.range`, for
// `spear.share` of its health (at least `spear.min`).
export const FAR_FOLK = { reveal: 4.5, waves: 3, waveSize: 4, next: 2, gap: 4, kinds: ["mirrorShade", "riftLynx", "graveLantern", "veilSpinner", "siegeBeetle", "cinderSeraph"],
  scale: 1.8, spear: { every: 2.2, range: 9, share: .22, min: 12, life: .3 },
  turn: "The people turn toward you all at once, and their faces come apart. They were never people. More are coming down the road.",
  wave: "More of the Hollow Kin come out of the hearths and down the roads.", done: "The road is quiet. No more of them are coming." };
export const isFolk = (o) => o && (o.kind === "traveler" || o.kind === "villager") && !o.wanderer && !o.elder;
