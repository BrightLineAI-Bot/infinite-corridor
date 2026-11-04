// The Pentagon (Tim, 2026-11-04: "so large that you don't know where it's gonna go... when you're walking by, you're like,
// what is that... as large as the Houses of Parliament... the Pentagon... so many different corridors... a central Courtyard...
// intimidating and imposing... then you get to go inside... explore the abandoned building... inhabited by ghouls"; roads go
// round it; ghouls, its story in relics; keys, trial rooms and pressure plates).
//
// A Pentagon covers a 3×3 block of sections round its centre section. Seen from the land it is a five-sided wall of building
// that runs on from section to section. Inside its outer ring of building lie five ring courts, walled apart at the corners;
// inside them an inner ring of building; inside that the central court, and in it the Heart, whose way down leads to the vault.
// The rings' buildings are chambers (areas of their own, like a labyrinth's): ten round the outer ring, five round the inner,
// joined round each ring by doors (some fallen shut), and opening onto the courts by doors of their own. Two gates in the
// outer facade let you in. The way to the Heart passes a sealed door whose key lies elsewhere, a door held shut unless a block
// is built onto its pressure plate, and the Heart itself stays sealed until three trial chambers have been cleared of their
// ghouls. Relics in the chambers tell what happened to the Fivefold Court. Everything is a hash of the seed and the centre;
// a Pentagon stands only where all nine sections are new ground (`atlas.pentVersion`).
import { hashSeed, rng } from "./random.ts";
import { BUILDINGS, layFloor, farthest } from "./great-buildings.ts";
import { carveMaze } from "./labyrinths.ts";

export const PENTAGON = {
  version: 5, // 5: release 732 (below); 4: release 730; 3: release 729; 2: release 728; 1: release 727 (the key, the plate, three trials, a Heart of three floors); 2: release 728 (below)
  every: 8, chance: .5, minRing: 10, // centre sections on a grid of `every`; this share of the eligible ones
  bands: { out: 36, outer: 29, court: 23, inner: 18, heart: 3 }, // pentagon "apothem" bands (tiles from the centre, along each face's normal)
  approach: 12, // tiles of paved way out from each gate
  wall: 1.3, // half-width of the walls between the ring courts, at the corners
  floors: { outer: 4, inner: 3, heart: 5, radial: 1 },
  size: [27, 19],
  guards: ["weepingSaint", "hangedChoir", "graveLantern", "pallidCrawler", "mirrorShade", "ashling"], ghouls: [2, 3], trialGuards: 5,
  regent: "hollowMarshal", trials: 3, broken: 3, // ring doors fallen shut (of the ten outer)
  name: "The Pentagon", court: "the Fivefold Court",
  relics: [
    "A tablet, its letters worn: “Five sat at the five faces, and none above the others. So the Court was made, and it was good.”",
    "Scratched into a door: “The Heart beneath the court was never to be opened. The Regent opened it.”",
    "A ledger, the last page torn: “Grain for the North Face: none. Grain for the South Face: none. Lamps for the Heart: forty.”",
    "On a cracked plinth: “They came up out of the Heart in the third winter, and they were the people we had lost.”",
    "A child’s chalk on a wall: five faces in a ring, and in the middle one face with no eyes.",
    "A bronze plaque, half melted: “By order of the Regent the five gates are shut. None leaves. None mourns.”",
    "A last note, folded small: “If you have come this far, do not wake her in the vault. Or wake her, and end it.”",
  ],
  names: { outer: "Outer Ring", inner: "Inner Ring", heart: ["The Heart", "The Under-Heart", "The Regent's Vault"], faces: ["North-East Face", "South-East Face", "South Face", "South-West Face", "North-West Face"] },
  // Version 2 (Tim, 2026-11-04: "like Bloodborne... you're going so far... then you finally get like a puzzle piece... on lots
  // of doors... it actually gets kind of scary... actual bosses... the Chalice Dungeons... deeper and deeper... pull three
  // levers... at different portions within the courtyard... then the gate opens... not too tedious"):
  // - three levers in three ring courts; until all three are pulled the inner ring's doors into the central court stay shut;
  // - the Fivefold Seal, in the chamber farthest from the gates: it opens every sigil door (the fallen ring doors, doors from
  //   outer chambers into their courts, and the way down past the Under-Heart), shortcuts back across the rings;
  // - the trial chambers each hold a lord (a named boss) and two ghouls; the Heart runs six floors down, a boss on each, its
  //   way down shut while that boss lives; the Regent in the vault at the bottom;
  // - the deeper in, the darker (`dread`, the share of the screen the dark closes over).
  // Version 3 (Tim, 2026-11-04: "when you get the Fivefold Seal, I don't want it to unlock all the doors... if you get to the
  // end without beating all the bosses or unlocking all the doors, that's fine. But I still want you to be able to go back and
  // complete any other puzzles and secrets"):
  // - the Seal opens only the way on below the Under-Heart;
  // - the fallen ring doors are shortcuts barred from the far side (open them from there, and they stay open);
  // - two hidden reliquaries, each behind a door that wants its own shard; one shard lies somewhere in the rings, the other
  //   deep in the Heart; each reliquary holds a Tesseract glyph (tesseracts.ts);
  // - the Heart's keepers are champions, not gates: a keeper's way down is never held shut. The deep keepers (from the Bone
  //   Stair down) each give a Tesseract glyph; the Regent's hoard gives a Sovereign one if every champion (the lords and the
  //   keepers) fell before him.
  // Version 4 (Tim, 2026-11-04: "you have to beat all the bosses to get through... you can't go through their ladders until you
  // beat them... the doors that are locked when you get to the final boss remain locked. But you can get that [Seal]... any
  // door that you find will just become unlocked... when you go to them and interact with them"; the Regent drops it; the
  // reliquaries keep their shards):
  // - every keeper holds its ladder down shut until it falls (as in version 2);
  // - the Fivefold Seal is the Regent's: it is yours when he falls;
  // - the sigil doors (the fallen ring doors, and doors into the courts where none stood) stay shut until, Seal in hand, you
  //   open each one by using it (`sigilKey`, recorded in pentOpened); none open by themselves;
  // - the reliquaries and their shards as in version 3.
  // Version 5 (Tim, 2026-11-04: "there might be secrets and things that you hadn't seen... that you can access with the key"):
  // three sealed chambers, each off a chamber of the rings behind a sigil door of its own, so reached only with the Regent's
  // Seal: in each a warden (a named boss), a Sealed Tesseract glyph (tesseracts.ts) and a relic found nowhere else.
  sealed: 3, sealedNames: ["Sealed Chamber of the Five Faces", "Sealed Chamber of the Eyeless One", "Sealed Chamber of the Last Court"],
  sealedRelics: [
    "Under the dust, a throne of five seats with one seat taken: “She sits here still, in the Heart. We sealed the door on her and on ourselves.”",
    "A mirror with no glass, and behind it a name scratched out five times: the Regent's own, before she took the Heart.",
    "A will, unsigned: “To whoever holds the Seal: the Court is yours now. Keep the doors shut, or open them all and let the Pentagon breathe.”",
  ],
  warden: { hp: 3.4, damage: 1.4, affixes: 2, ghouls: 2 },
  secrets: 2, shardDeep: 3, deepGlyphFrom: 2, // reliquaries; the Heart floor that holds the second shard; keepers from this floor give glyphs
  secretNames: ["Hidden Reliquary of the Faces", "Hidden Reliquary of the Heart"], shardNames: ["Shard of the Faces", "Shard of the Heart"],
  levers: 3,
  deep: ["The Heart", "The Under-Heart", "The Bone Stair", "The Drowned Choir", "The Lightless Nave", "The Regent's Vault"],
  bosses: { weepingSaint: "The Weeping Abbess", hangedChoir: "The Hanged Choir", amalgam: "The Amalgam of the Lost", gnawingMaw: "The Maw Beneath",
    cinderSeraph: "The Ash Seraph", lumenWraith: "The Lamplighter's Wraith", veilSpinner: "The Veil Spinner", riftLynx: "The Regent's Hound",
    sunderjaw: "Sunderjaw, Keeper of the Gate", thunderhorn: "The Thunderhorn", mirrorShade: "The Mirror Steward", graveLantern: "The Grave Lantern",
    pallidCrawler: "The Pallid Crawler", siegeBeetle: "The Siege Beetle" },
  lord: { hp: 3.2, damage: 1.35, affixes: 2, ghouls: 2 }, // a trial's lord
  deepBoss: { hp: 3.6, damage: 1.4, affixes: 2, perFloor: .35, ghouls: [1, 2] }, // a Heart floor's boss (hp and damage grow `perFloor` a floor down)
  regentBoss: { hp: 6, damage: 1.7, affixes: 3 },
  dread: { outer: .3, inner: .45, heart: .58, perFloor: .06, max: .86 },
  messages: {
    lever: "The lever grinds down. Somewhere in the rings, chains run",
    leversDone: "Far off, the inner ring's great doors grind open onto the central court.",
    gate: "The great door will not move. Its chains run off into the courts: levers pulled",
    sigil: "A five-sided sigil is cut into the door. It wants the Fivefold Seal.",
    sigilV4: "A five-sided sigil is cut into the door. It wants the Fivefold Seal, and the Regent holds it.",
    sigilOpens: "The Fivefold Seal fits the sigil. The door grinds open, and stays open.",
    sealV4: "In her hand, the Fivefold Seal: every sigil door in the rings will open to it, one by one, as you come to them.",
    seal: "The Fivefold Seal: five faces round an eyeless one. Every sigil door in the rings will open to it now.",
    bossGate: "The way down is held shut while its keeper lives",
    hoardHeld: "The Regent's hand is still on her hoard. It will not open while she lives.",
    bossDown: "falls. The way down opens",
    arrive: "A wall of building runs on as far as you can see, its face turning at a great angle: the Pentagon.",
    sealed: "The Heart is sealed. Three trials remain to be cleared within the rings",
    plate: "The door will not hold open. Something heavy on the plate would hold it: build a block there.",
    rubble: "You take what stone the rubble gives",
    trial: "A trial chamber falls silent",
    relic: "A relic of the Fivefold Court",
  },
};

const mod = (a, n) => ((a % n) + n) % n;
// The centre section of a Pentagon this section could belong to.
export function pentagonCentre(rx, ry) { const E = PENTAGON.every, cx = Math.round(rx / E) * E, cy = Math.round(ry / E) * E; return Math.abs(rx - cx) <= 1 && Math.abs(ry - cy) <= 1 ? { cx, cy } : null; }
export function pentagonAt(seed, cx, cy, ok) { const P = PENTAGON; if ((hashSeed(`${seed}:pentagon:v1:${cx}:${cy}`) % 1000) / 1000 >= P.chance) return false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const rx = cx + dx, ry = cy + dy; if (Math.abs(rx) + Math.abs(ry) < P.minRing || !ok(rx, ry)) return false; } return true; }
const toGlobal = (cx, cy, rx, ry, x, y) => ({ gx: (rx - cx + 1) * 32 + x, gy: (ry - cy + 1) * 32 + y });
const toLocal = (cx, cy, gx, gy) => ({ rx: cx - 1 + Math.floor(gx / 32), ry: cy - 1 + Math.floor(gy / 32), x: mod(gx, 32), y: mod(gy, 32) });

// The geometry: each face i of the pentagon (point up) has its outward normal at -54° + 72°·i.
const C0 = 48, NORM = [0, 1, 2, 3, 4].map((i) => { const a = (-54 + 72 * i) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; });
const VERT = [0, 1, 2, 3, 4].map((i) => { const a = (-90 + 72 * i) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; }); // vertex i sits between faces i-1 and i
export function regionAt(gx, gy) {
  const B = PENTAGON.bands, dx = gx + .5 - C0, dy = gy + .5 - C0; let m = -1e9, face = 0;
  for (let i = 0; i < 5; i++) { const v = dx * NORM[i][0] + dy * NORM[i][1]; if (v > m) { m = v; face = i; } }
  if (m > B.out) return { kind: "outside", face, m };
  if (m > B.outer) { const t = dx * -NORM[face][1] + dy * NORM[face][0]; return { kind: "outer", face, half: t < 0 ? 0 : 1, m }; }
  if (m > B.court) { for (const [vx, vy] of VERT) { const along = dx * vx + dy * vy, across = Math.abs(dx * -vy + dy * vx); if (along > 0 && across < PENTAGON.wall) return { kind: "wall", face, m }; } return { kind: "court", face, m }; }
  if (m > B.inner) return { kind: "inner", face, m };
  if (Math.abs(dx) <= B.heart && Math.abs(dy) <= B.heart) return { kind: "heart", face, m };
  return { kind: "central", face, m };
}
// WG-03: within one Pentagon its courts run on over section edges, so the Wayfarer crosses a seam where they stand. Is the
// stretch of edge at `along` (tiles a..b along it) open court on both sides of the seam from section (rx, ry) by (dx, dy)?
// Only the court and the central court count: anywhere else (building, the walls between the courts, outside) the seam is
// crossed at the lane, as every other edge is.
export function pentagonSeamOpen(cx, cy, rx, ry, dx, dy, a, b) {
  const nx = rx + dx, ny = ry + dy; if (Math.abs(nx - cx) > 1 || Math.abs(ny - cy) > 1 || Math.abs(rx - cx) > 1 || Math.abs(ry - cy) > 1) return false;
  const open = (sx, sy, x, y) => { const g = toGlobal(cx, cy, sx, sy, x, y), k = regionAt(g.gx, g.gy).kind; return k === "court" || k === "central"; };
  for (let v = a; v <= b; v++) { if (v < 0 || v > 31) return false;
    const here = dx ? [dx > 0 ? 31 : 0, v] : [v, dy > 0 ? 31 : 0], there = dx ? [dx > 0 ? 0 : 31, v] : [v, dy > 0 ? 0 : 31];
    if (!open(rx, ry, ...here) || !open(nx, ny, ...there)) return false; }
  return true;
}
// A point a distance `m` out along face i's normal, `t` along the face.
const facePoint = (i, m, t) => { const [nx, ny] = NORM[i]; return { gx: Math.floor(C0 + nx * m - ny * t), gy: Math.floor(C0 + ny * m + nx * t) }; };

// ------------------------------------------------------------------------------------------------ the maze of chambers
// Nodes: o0..o9 (outer ring, two a face), i0..i4 (inner ring), h0..h2 (the Heart down to the vault). World places: the land,
// the ring courts c0..c4, the central court.
const memo = new Map();
export function pentagonPlan(seed, cx, cy, V = 1) {
  const key = `${seed}:${cx}:${cy}`, mkey = `${key}:v${V}`; if (memo.has(mkey)) return memo.get(mkey);
  const P = PENTAGON, r = rng(`pentagon:${key}:plan`), B = P.bands, N = P.names, nodes = [], edges = [];
  const add = (id, kind, name, floorKind) => { const q = { id, kind, name, floorKind, ports: [], n: nodes.length }; nodes.push(q); return q; };
  for (let i = 0; i < 10; i++) add(`o${i}`, "outer", `${N.outer} · ${N.faces[i >> 1]}${i & 1 ? " (east)" : " (west)"}`, r() < .35 ? "cellar" : "hall");
  for (let i = 0; i < 5; i++) add(`i${i}`, "inner", `${N.inner} · ${N.faces[i]}`, r() < .3 ? "cellar" : "hall");
  const nh = V >= 2 ? P.deep.length : 3; for (let i = 0; i < nh; i++) add(`h${i}`, "heart", V >= 2 ? P.deep[i] : N.heart[i], (V >= 2 ? i & 1 : i === 1) ? "cellar" : "hall");
  const node = (id) => nodes.find((q) => q.id === id), pass = (a, b, extra = {}) => edges.push({ a, b, ...extra });
  // round the outer ring (some doors fallen shut), round the inner, down the Heart
  const shut = new Set(); while (shut.size < P.broken) shut.add(Math.floor(r() * 10));
  for (let i = 0; i < 10; i++) if (!shut.has(i)) pass(`o${i}`, `o${(i + 1) % 10}`); else if (V === 3) pass(`o${i}`, `o${(i + 1) % 10}`, { shortcut: `fall${i}` }); else if (V >= 2) pass(`o${i}`, `o${(i + 1) % 10}`, { sigil: true }); // v2: a fallen door opens to the Seal; v3: a shortcut barred from its far side
  for (let i = 0; i < 5; i++) if (r() < .6) pass(`i${i}`, `i${(i + 1) % 5}`);
  for (let i = 0; i < nh - 1; i++) pass(`h${i}`, `h${i + 1}`, (V === 2 || V === 3) && i === 1 ? { sigil: true } : {});
  // world doors: two gates in the outer facade; court doors from the outer ring and into the inner; the central court's doors
  const world = []; const gates = []; while (gates.length < 2) { const g = Math.floor(r() * 10); if (!gates.includes(g) && (gates.length === 0 || Math.abs(g - gates[0]) >= 3)) gates.push(g); }
  for (const g of gates) world.push({ node: `o${g}`, place: "land", key: `gate${g}` });
  for (let i = 0; i < 10; i++) if (r() < .55) world.push({ node: `o${i}`, place: `c${i >> 1}`, key: `court${i}` });
  for (let f = 0; f < 5; f++) { if (!world.some((w) => w.place === `c${f}`)) world.push({ node: `o${2 * f + (r() < .5 ? 0 : 1)}`, place: `c${f}`, key: `court${2 * f}x` }); if (r() < .7) world.push({ node: `i${f}`, place: `c${f}`, key: `ring${f}` }); }
  for (let f = 0; f < 5; f++) if (r() < .45) world.push({ node: `i${f}`, place: "central", key: `centre${f}` });
  if (!world.some((w) => w.place === "central")) world.push({ node: "i0", place: "central", key: "centre0" });
  world.push({ node: "h0", place: "central", key: "heart", sealed: "trials" });
  world.push({ node: `h${nh - 1}`, place: "land", key: "vaultout", toGate: true }); // the vault's way out: to the first gate
  // solvability over places and chambers (ignoring locks), then the locks laid on the way
  const graph = () => { const adj = new Map(), link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
    for (const e of edges) if (!e.cut && !e.sigil && !e.shortcut) link(e.a, e.b); for (const w of world) if (!w.toGate && !w.sigil) link(w.node, w.place); return adj; }; // sigil doors are shortcuts, never the only way
  const reach = (from, skip = () => false) => { const adj = graph(), seen = new Set([from]), st = [from]; while (st.length) { const v = st.pop(); for (const u of adj.get(v) || []) if (!seen.has(u) && !skip(v, u)) { seen.add(u); st.push(u); } } return seen; };
  // make sure every chamber (and so the central court) can be reached: reopen a fallen ring door, or join the inner ring, as need be
  const lost = () => nodes.some((q) => q.kind !== "heart" && !reach("land").has(q.id));
  for (const i of [...shut].sort((a, b) => a - b)) if (lost()) { const e = edges.find((q) => q.a === `o${i}` && (q.sigil || q.shortcut)); if (e) { delete e.sigil; delete e.shortcut; } else pass(`o${i}`, `o${(i + 1) % 10}`); }
  for (let i = 0; i < 5 && lost(); i++) if (!edges.some((e) => e.a === `i${i}` && e.b === `i${(i + 1) % 5}`)) pass(`i${i}`, `i${(i + 1) % 5}`);
  for (let f = 0; f < 5 && lost(); f++) if (!world.some((w) => w.node === `i${f}` && w.place === `c${f}`)) world.push({ node: `i${f}`, place: `c${f}`, key: `ring${f}` });
  // v2: the outer ring and its courts must be open without the central court (its doors wait on the levers)
  if (V >= 2) { const lostOuter = () => nodes.some((q) => q.kind === "outer" && !reach("land", (v, u) => v === "central" || u === "central").has(q.id));
    for (const i of [...shut].sort((a, b) => a - b)) if (lostOuter()) { const e = edges.find((q) => q.a === `o${i}` && (q.sigil || q.shortcut)); if (e) { delete e.sigil; delete e.shortcut; } } }
  // v2: sigil doors from outer chambers into their courts where no door stands
  if (V === 2 || V >= 4) for (let i = 0; i < 10; i++) if (!world.some((w) => w.node === `o${i}` && w.place === `c${i >> 1}`)) world.push({ node: `o${i}`, place: `c${i >> 1}`, key: `sigil${i}`, sigil: true });
  if (V >= 4) for (let i = 0; i < 5; i++) if (!edges.some((e) => e.a === `i${i}` && e.b === `i${(i + 1) % 5}`)) pass(`i${i}`, `i${(i + 1) % 5}`, { sigil: true }); // v4: and round the inner ring where it is broken
  if (V === 2 || V >= 4) for (let f = 0; f < 5; f++) if (!world.some((w) => w.node === `i${f}` && w.place === `c${f}`)) world.push({ node: `i${f}`, place: `c${f}`, key: `isigil${f}`, sigil: true }); // and from inner chambers
  let keyNode = null, lockW = null, sealNode = null; const levers = [];
  if (V < 2) {
    // the key: on a door the way to the central court must pass if it can; the key in a chamber reachable without it
    const centralDoors = world.filter((w) => w.place === "central" && w.node.startsWith("i"));
    lockW = centralDoors.length === 1 ? centralDoors[0] : centralDoors[Math.floor(r() * centralDoors.length)];
    const before = reach("land", (v, u) => (v === lockW.node && u === "central") || (u === lockW.node && v === "central")), keyRoom = [...before].filter((v) => /^[oi]\d/.test(v) && v !== lockW.node);
    keyNode = keyRoom.length ? keyRoom[Math.floor(r() * keyRoom.length)] : null;
    if (keyNode) { lockW.lock = "key0"; node(keyNode).key = { id: "key0", name: "Regent's Key" }; }
  } else { // v2: the Seal in the chamber farthest from the land; the central doors shut on three levers in three courts
    const adj = graph(), dist = new Map([["land", 0]]), q = ["land"]; while (q.length) { const v = q.shift(); for (const u of adj.get(v) || []) if (!dist.has(u)) { dist.set(u, dist.get(v) + 1); q.push(u); } }
    sealNode = nodes.filter((n) => /^[oi]\d/.test(n.id) && dist.has(n.id)).sort((a, b) => dist.get(b.id) - dist.get(a.id) || a.n - b.n)[0].id; if (V >= 4) sealNode = null; else node(sealNode).seal = true; // v4: the Regent's
    for (const w of world) if (w.place === "central" && w.node.startsWith("i")) w.gate = "levers";
    while (levers.length < P.levers) { const f = Math.floor(r() * 5); if (!levers.includes(f)) levers.push(f); }
  }
  // the plate: on a ring door in a chamber reachable from the land
  const ring = edges.filter((e) => e.a.startsWith("o") && e.b.startsWith("o") && !e.sigil && !e.shortcut && reach("land").has(e.a)); const plateE = ring.length ? ring[Math.floor(r() * ring.length)] : null;
  if (plateE) plateE.plate = plateE.a; // the plate stands in chamber `a`, by its door to `b`
  // three trial chambers (not the Heart), reachable from the land
  const can = [...reach("land")].filter((v) => /^[oi]\d/.test(v) && v !== keyNode && v !== sealNode); const trials = [];
  while (trials.length < Math.min(P.trials, can.length)) { const t = can[Math.floor(r() * can.length)]; if (!trials.includes(t)) trials.push(t); }
  for (const t of trials) node(t).trial = true;
  if (V >= 2) { const kinds = Object.keys(P.bosses), used = new Set(); // v2: each trial's lord, each Heart floor's keeper
    const pick = (id) => { for (let j = 0; ; j++) { const k = kinds[hashSeed(`${key}:boss:${id}:${j}`) % kinds.length]; if (!used.has(k) || j > 20) { used.add(k); return { kind: k, name: P.bosses[k] }; } } };
    for (const t of trials) node(t).lord = pick(t); for (let i = 0; i < nh - 1; i++) node(`h${i}`).boss = pick(`h${i}`); }
  // v3: the hidden reliquaries, each off a chamber of the rings by a door that wants its shard
  if (V >= 3) { const hosts = nodes.filter((n) => /^[oi]\d/.test(n.id) && n.id !== sealNode).sort((a, b) => hashSeed(`${key}:host:${a.id}`) - hashSeed(`${key}:host:${b.id}`));
    for (let k = 0; k < P.secrets; k++) { const host = hosts[k], sq = add(`s${k}`, "secret", P.secretNames[k], "cellar"); sq.reliquary = true; pass(host.id, sq.id, { secret: `shard${k}`, shardName: P.shardNames[k] });
      const keep = k === 1 ? node(`h${Math.min(P.shardDeep, nh - 2)}`) : hosts.slice(P.secrets).find((n) => !n.trial && n.id !== host.id && !n.key); if (keep) keep.shard = { id: `shard${k}`, name: P.shardNames[k] }; }
    const adj = graph(), dist = new Map([["land", 0]]), q = ["land"]; while (q.length) { const v = q.shift(); for (const u of adj.get(v) || []) if (!dist.has(u)) { dist.set(u, dist.get(v) + 1); q.push(u); } }
    for (const e of edges) if (e.shortcut) e.far = (dist.get(e.a) ?? 99) >= (dist.get(e.b) ?? 99) ? e.a : e.b;
    if (V >= 5) { const used = new Set(edges.filter((e) => e.secret).map((e) => e.a)), kinds = Object.keys(P.bosses), taken = new Set(nodes.flatMap((n) => [n.lord?.kind, n.boss?.kind]).filter(Boolean)); // v5: the sealed chambers
      const hostsK = nodes.filter((n) => /^[oi]\d/.test(n.id) && !used.has(n.id)).sort((a, b) => hashSeed(`${key}:sealed-host:${a.id}`) - hashSeed(`${key}:sealed-host:${b.id}`));
      for (let k = 0; k < P.sealed; k++) { const host = hostsK[k], kq = add(`k${k}`, "sealed", P.sealedNames[k], k === 1 ? "cellar" : "hall"); kq.sealedVault = k; pass(host.id, kq.id, { sigil: true });
        let wk = kinds[hashSeed(`${key}:warden:${k}`) % kinds.length]; for (let j = 0; taken.has(wk) && j < kinds.length; j++) wk = kinds[(kinds.indexOf(wk) + 1) % kinds.length]; taken.add(wk); kq.warden = { kind: wk, name: P.bosses[wk] }; } } } // a shortcut opens from its far side
  // relics, one a chamber in seven of them
  const relicRooms = nodes.filter((q) => q.kind !== "heart" && q.kind !== "sealed").sort(() => r() - .5).slice(0, P.relics.length); relicRooms.forEach((q, i) => (q.relic = i));
  // ports: each chamber's doors on its walls (world doors top and bottom, ring doors left and right, the Heart's ladders inside)
  const [W, H] = P.size;
  for (const q of nodes) { const used = new Set(), slot = (side, k) => { for (let j = 0; j < 30; j++) { const h = hashSeed(`${key}:port:${q.id}:${k}:${j}`), along = side === "top" || side === "bottom" ? W : H, p = 3 + 2 * (h % Math.floor((along - 6) / 2)), x = side === "left" ? 0 : side === "right" ? W - 1 : p, y = side === "top" ? 0 : side === "bottom" ? H - 1 : p, id = `${x},${y}`;
        if (!used.has(id)) { used.add(id); return { x, y, inner: { x: x === 0 ? 1 : x === W - 1 ? W - 2 : x, y: y === 0 ? 1 : y === H - 1 ? H - 2 : y } }; } } return null; };
    for (const e of edges) if (e.a === q.id || e.b === q.id) { const other = e.a === q.id ? e.b : e.a, heart = q.kind === "heart";
      const side = heart ? null : other.startsWith("s") || other.startsWith("k") ? "top" : q.kind === "secret" || q.kind === "sealed" ? "bottom" : (other === `${q.id[0]}${(Number(q.id.slice(1)) + 1) % (q.kind === "outer" ? 10 : 5)}` ? "right" : "left");
      q.ports.push({ kind: "pass", to: other, edge: e, ...(heart ? (() => { const h = hashSeed(`${key}:ladder:${q.id}:${other}`); const x = 3 + 2 * (h % 10), y = 3 + 2 * ((h >>> 5) % 6); return { x, y, inner: { x, y } }; })() : slot(side, other)) }); }
    for (const w of world) if (w.node === q.id) q.ports.push({ kind: "world", world: w, ...slot(w.place === "land" || w.place.startsWith("c") && q.kind === "inner" ? "bottom" : "top", w.key) }); }
  // world positions of every world door (pure: from the geometry)
  const T = 9; // how far along a face from its middle a half's door stands
  for (const w of world) { const i = Number(w.node.slice(1)), f = w.node.startsWith("o") ? i >> 1 : w.node.startsWith("i") ? i : 0, t = w.node.startsWith("o") ? (i & 1 ? T : -T) : 0;
    if (w.key === "heart") { w.door = { gx: C0, gy: C0 + B.heart - 1 }; w.out = { gx: C0, gy: C0 + B.heart }; continue; }
    if (w.toGate) continue;
    const [mDoor, mOut] = w.place === "land" ? [B.out - .5, B.out + 1.2] : w.place === "central" ? [B.inner + .5, B.inner - 1.2] : w.node.startsWith("o") ? [B.outer + .5, B.outer - 1.2] : [B.court - .5, B.court + 1.2];
    w.door = facePoint(f, mDoor, t); w.out = facePoint(f, mOut, t); }
  const first = world.find((w) => w.place === "land" && !w.toGate); world.find((w) => w.toGate).out = first.out;
  // a lever stands on the side of its court the ring's roofs do not hide from view (the near side of a south-facing court)
  const leverAt = levers.map((f) => { const t = hashSeed(`${key}:lever:${f}`) & 1 ? 4 : -4, m = NORM[f][1] > 0 ? B.court + 1.5 : B.outer - 1.5; let at = facePoint(f, m, t);
    for (let k = 0; k < 6 && regionAt(at.gx, at.gy).kind !== "court"; k++) at = facePoint(f, m, t * (1 - (k + 1) / 6)); return { f, ...at }; });
  const plan = { key, seed, cx, cy, V, base: `pentagon:${seed}:${cx}:${cy}${V >= 2 ? `:v${V}` : ""}`, nodes, edges, world, W, H, trials, keyNode, plateE, lockW, gate: first, sealNode, levers: leverAt, nh };
  if (memo.size > 8) memo.clear(); memo.set(mkey, plan); return plan;
}
const chamberId = (plan, q) => `${plan.base}:f${q.n + 1}`;
const ID = /^pentagon:(.+):(-?\d+):(-?\d+):(?:v(\d+):)?f(\d+)$/;
export const isPentagonId = (id) => ID.test(String(id || ""));
export function parsePentagonId(id) { const m = String(id || "").match(ID); return m ? { seed: m[1], cx: Number(m[2]), cy: Number(m[3]), V: Number(m[4] || 1), n: Number(m[5]) - 1, base: `pentagon:${m[1]}:${m[2]}:${m[3]}${m[4] ? `:v${m[4]}` : ""}` } : null; }

// ------------------------------------------------------------------------------------------------ a section of it, outside
const I = (x, y) => y * 32 + x;
export function placePentagonSection(map, seed, cx, cy, rx, ry, V = 1) {
  if (!map?.tiles?.length || map.greatBuilding) return null;
  const P = PENTAGON, plan = pentagonPlan(seed, cx, cy, V), cells = { outer: [], inner: [], wall: [], heart: [] };
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const { gx, gy } = toGlobal(cx, cy, rx, ry, x, y), R = regionAt(gx, gy), i = I(x, y);
    if (R.kind === "outside") continue;
    const t = map.tiles[i], built = R.kind !== "court" && R.kind !== "central";
    map.tiles[i] = { ...t, x, y, kind: built ? "castleWall" : "castleCourt", landscape: "castle", blocked: built, elev: 0, slope: false, environment: undefined, canopy: undefined, structure: undefined, greatBuilding: true, pentagon: R.kind, courtyard: !built || undefined };
    if (built) cells[R.kind].push({ x, y }); }
  // approaches before the gates (a short paved way out from each)
  // (each section paints the stretch that falls in it, so an approach runs on over a section's edge; it bridges canyon and rock)
  for (const w of plan.world) if (w.place === "land" && !w.toGate) { const [nx, ny] = NORM[Number(w.node.slice(1)) >> 1];
    for (let k = 0; k < P.approach; k += .5) for (const side of [-1, -.5, 0, .5, 1]) { const gx = Math.floor(w.out.gx + .5 + nx * k - ny * side), gy = Math.floor(w.out.gy + .5 + ny * k + nx * side), l = toLocal(cx, cy, gx, gy); if (l.rx !== rx || l.ry !== ry) continue; const i = I(l.x, l.y); if (map.tiles[i].greatBuilding) continue; map.tiles[i] = { ...map.tiles[i], kind: "castleCourt", landscape: "castle", blocked: false, elev: 0, slope: false, environment: undefined, structure: undefined, canopy: undefined, causeway: true }; } }
  const inP = (o) => { const t = map.tiles[I(Math.round(o.x), Math.round(o.y))]; return t?.greatBuilding || t?.causeway; };
  map.objects = (map.objects || []).filter((o) => !inP(o)); map.enemySpawns = (map.enemySpawns || []).filter((e) => !inP(e));
  // the doors that stand in this section
  const N = P.names, doors = [];
  for (const w of plan.world) { if (w.toGate) continue; const L = toLocal(cx, cy, w.out.gx, w.out.gy), D = toLocal(cx, cy, w.door.gx, w.door.gy); if (L.rx !== rx || L.ry !== ry) continue;
    const q = plan.nodes.find((n) => n.id === w.node), name = w.key === "heart" ? N.heart[0] : w.place === "land" ? `${P.name}: a gate` : q.name;
    map.objects.push({ id: `pent-${w.key}`, kind: "dungeon", buildingDoor: true, pentagonDoor: true, dungeonId: chamberId(plan, q), pentBase: plan.base, dungeonType: "pentagon", ...(w.sigil ? { sigil: true, ...(V >= 4 ? { sigilKey: `w:${w.key}` } : {}) } : {}), name, identity: w.place === "land" ? "one of the five-sided wall's two gates" : "a door into the rings", x: L.x, y: L.y, state: "open", actions: ["enter"], enterAt: w.key, ...(w.sealed ? { pentSeal: w.sealed } : {}), ...(w.place === "land" ? { landmark: true, lore: `${P.name}: a wall of building on five faces, round courts within courts. The Fivefold Court is long gone; something else keeps it now.` } : {}) });
    if (D.rx === rx && D.ry === ry) doors.push({ x: D.x, y: D.y, face: L.y > D.y ? "south" : L.y < D.y ? "north" : L.x > D.x ? "east" : "west" }); }
  // v2: the great levers, one in each of three courts
  for (const L of plan.levers) { const l = toLocal(cx, cy, L.gx, L.gy); if (l.rx !== rx || l.ry !== ry) continue;
    map.objects.push({ id: `pent-lever-${L.f}`, kind: "pentLever", lever: L.f, pentBase: plan.base, name: `A great lever · ${P.names.faces[L.f]} court`, x: l.x, y: l.y, state: "waiting", actions: ["pull"], lore: "A lever as tall as a man, its chain running off under the paving toward the inner ring." }); }
  // the courts are held
  const hh = (k) => hashSeed(`${seed}:pent-court:${cx}:${cy}:${rx}:${ry}:${k}`), court = map.tiles.filter((t) => t.courtyard && t.pentagon), kinds = P.guards;
  for (let i = 0; i < Math.min(3, Math.floor(court.length / 60)); i++) { const c = court[hh(`g${i}`) % court.length]; if (!map.objects.some((o) => Math.round(o.x) === c.x && Math.round(o.y) === c.y)) map.enemySpawns.push({ id: `pent-${rx}-${ry}-${i}`, kind: kinds[hh(`k${i}`) % kinds.length], x: c.x, y: c.y, courtyardGuard: true }); }
  const F = P.floors, blocks = [{ part: "outer", cells: cells.outer, faceH: 1 + F.outer * .55, floors: F.outer }, { part: "inner", cells: cells.inner, faceH: 1 + F.inner * .55, floors: F.inner }, { part: "wall", cells: cells.wall, faceH: 1.1, floors: 1, wall: true }, { part: "t", cells: cells.heart, faceH: 1 + F.heart * .5, floors: F.heart }].filter((b) => b.cells.length);
  if (!blocks.length && !doors.length) return null;
  const all = blocks.flatMap((b) => b.cells), xs = all.map((c) => c.x), ys = all.map((c) => c.y), bx = xs.length ? Math.min(...xs) : 0, by = ys.length ? Math.min(...ys) : 0;
  const rec = { id: `pentagon-${cx}-${cy}-${rx}-${ry}`, kind: "greatBuilding", v: 2, pentagon: true, big: true, name: P.name, style: "keep", x: 16, y: 31, bounds: { x: bx, y: by, w: xs.length ? Math.max(...xs) - bx + 1 : 1, h: ys.length ? Math.max(...ys) - by + 1 : 1 }, footprint: all, blocks, doors, hatches: [], crumbled: [], grain: hh("grain") % 97, state: "closed", actions: [] };
  map.objects.push(rec); map.greatBuilding = { id: rec.id, pentagon: true, cx, cy, version: V }; map.pentagon = { cx, cy, V, base: plan.base };
  return rec;
}

// ------------------------------------------------------------------------------------------------ a chamber
export function generatePentagonChamber(seed, id) {
  const Pp = parsePentagonId(id); if (!Pp) return null; const plan = pentagonPlan(Pp.seed, Pp.cx, Pp.cy, Pp.V), q = plan.nodes[Pp.n]; if (!q) return null;
  const P = PENTAGON, S = BUILDINGS.styles.keep, { W, H } = plan, base = `${Pp.base}:${q.id}`, open = q.ports.map((p) => ({ x: p.x, y: p.y, inner: p.inner, wall: p.x === 0 || p.y === 0 || p.x === W - 1 || p.y === H - 1 }));
  const plateSpot = plan.plateE && plan.plateE.plate === q.id ? q.ports.find((p) => p.edge === plan.plateE) : null;
  const arrive = open[0]?.inner || { x: W >> 1, y: H >> 1 };
  let grid, room = null, mat = null;
  if (q.floorKind === "cellar") grid = carveMaze(base, { n: q.n }, W, H, open);
  else { const F = layFloor(base, 1, W, H, S, arrive, open.flatMap((p) => [{ x: p.x, y: p.y, v: 2 }, { ...p.inner, v: 2 }])); grid = F.grid; room = F.room; mat = F.mat; }
  const tiles = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, v = grid[k], cellar = q.floorKind === "cellar";
    if (v === 1 || v === 4) tiles.push({ x, y, kind: v === 4 ? "rubbleFloor" : cellar ? "cellarWall" : S.wall, blocked: true, detail: (x * 3 + y) % 4 });
    else tiles.push({ x, y, kind: cellar ? "cellarFloor" : room && room[k] >= 0 ? mat[room[k]] : S.hall, blocked: false, doorway: v === 2, detail: (x * 7 + y * 3) % 4 }); }
  if (plan.V >= 2) { // v2: a ladder that the rooms' walls fell on is dug free, and joined to the floor by the shortest way
    const free = (x, y) => { const t = tiles[y * W + x]; if (t.blocked) tiles[y * W + x] = { ...t, kind: q.floorKind === "cellar" ? "cellarFloor" : S.hall, blocked: false }; };
    for (const p of q.ports) if (p.kind === "pass" && q.kind === "heart") { free(p.x, p.y); const seen = new Set([arrive.y * W + arrive.x]), st = [arrive]; while (st.length) { const c = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = tiles[k]; if (!t || t.blocked || seen.has(k)) continue; seen.add(k); st.push({ x, y }); } }
      if (seen.has(p.y * W + p.x)) continue; let best = null; for (const k of seen) { const x = k % W, y = (k / W) | 0, d = Math.abs(x - p.x) + Math.abs(y - p.y); if (!best || d < best.d) best = { x, y, d }; }
      if (best) { let x = p.x, y = p.y; while (x !== best.x) { x += Math.sign(best.x - x); free(x, y); } while (y !== best.y) { y += Math.sign(best.y - y); free(x, y); } } } }
  const objects = [], exitsTo = {}, entries = {}, N = P.names;
  for (const p of q.ports) { if (p.kind === "world") { const w = p.world, oid = `building-exit-${w.key}`; entries[w.key] = { ...p.inner };
      const to = w.toGate ? plan.gate.out : w.out, L = toLocal(plan.cx, plan.cy, to.gx, to.gy);
      objects.push({ id: oid, kind: "exit", name: w.toGate ? "Way out · the outer gate" : w.place === "land" ? "Gate out" : w.place === "central" ? "Door · the central court" : `Door · ${N.faces[Number(w.place.slice(1))]} court`, x: p.x, y: p.y, state: "open", actions: ["exit"], ...(w.lock ? { lock: w.lock, lockName: "Regent's Key" } : {}), ...(w.gate ? { gate: w.gate } : {}), ...(w.sigil ? { sigil: true, ...(plan.V >= 4 ? { sigilKey: `w:${w.key}` } : {}) } : {}) });
      exitsTo[oid] = { rx: L.rx, ry: L.ry, x: L.x, y: L.y }; continue; }
    const o = plan.nodes.find((n) => n.id === p.to), there = o.ports.find((pp) => pp.kind === "pass" && pp.to === q.id), heart = q.kind === "heart", dir = heart ? (o.n > q.n ? "down" : "up") : "door";
    objects.push({ id: `lab-pass-${o.n}`, kind: "buildingStair", name: `${dir === "door" ? "Door" : dir === "down" ? "Ladder down" : "Ladder up"} · ${o.name}`, x: p.x, y: p.y, state: "open", actions: [dir === "down" ? "descend" : "climb"], toId: chamberId(plan, o), toX: there.inner.x, toY: there.inner.y, dir, labyrinth: true, ...(plateSpot && p === plateSpot ? { plateLock: true } : {}), ...(p.edge.sigil ? { sigil: true } : {}), ...(dir === "down" && q.boss && (plan.V === 2 || plan.V >= 4) ? { bossGate: true } : {}), ...(p.edge.sigil && plan.V >= 4 ? { sigilKey: `e:${p.edge.a}-${p.edge.b}` } : {}),
      ...(p.edge.shortcut ? (p.edge.far === q.id ? { shortcutOpens: p.edge.shortcut } : { barred: true, shortcutKey: p.edge.shortcut }) : {}), ...(p.edge.secret && o.kind === "secret" ? { lock: p.edge.secret, lockName: p.edge.shardName, secretDoor: true } : {}) }); }
  const h = (k) => hashSeed(`${id}:${k}`), taken = new Set(objects.map((o) => o.y * W + o.x)), ok = (x, y) => { const t = tiles[y * W + x]; return t && !t.blocked && !t.doorway && !taken.has(y * W + x); };
  const reach = new Set([arrive.y * W + arrive.x]), st = [arrive]; while (st.length) { const c = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = tiles[k]; if (!t || t.blocked || reach.has(k)) continue; reach.add(k); st.push({ x, y }); } }
  const cells = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (ok(x, y) && reach.has(y * W + x) && Math.abs(x - arrive.x) + Math.abs(y - arrive.y) >= 5) cells.push({ x, y });
  cells.sort((a, b) => hashSeed(`${id}:c:${a.x},${a.y}`) - hashSeed(`${id}:c:${b.x},${b.y}`)); const take = () => { const c = cells.find((p) => !taken.has(p.y * W + p.x)); if (c) taken.add(c.y * W + c.x); return c; };
  // the pressure plate beside its door, and rubble to build with
  if (plateSpot) { const near = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]].map(([dx, dy]) => ({ x: plateSpot.inner.x + dx, y: plateSpot.inner.y + dy })).find((c) => ok(c.x, c.y) && reach.has(c.y * W + c.x));
    if (near) { tiles[near.y * W + near.x] = { ...tiles[near.y * W + near.x], plate: true }; taken.add(near.y * W + near.x); }
    const rub = take(); if (rub) objects.push({ id: "pent-rubble", kind: "pentRubble", name: "Loose rubble", x: rub.x, y: rub.y, state: "open", actions: ["take"], lore: "Fallen masonry: enough sound stone for a block or two." }); }
  if (q.key) { const c = take(); if (c) objects.push({ id: `lab-${q.key.id}`, kind: "labKey", keyId: q.key.id, name: q.key.name, x: c.x, y: c.y, state: "waiting", actions: ["take"], lore: "The Regent's key, heavy and cold. A sealed door into the central court waits for it." }); }
  if (q.relic !== undefined) { const c = take(); if (c) objects.push({ id: `pent-relic-${q.relic}`, kind: "pentRelic", relic: q.relic, name: "A relic of the Fivefold Court", x: c.x, y: c.y, state: "waiting", actions: ["read"], lore: P.relics[q.relic] }); }
  if (q.shard) { const c = take(); if (c) objects.push({ id: `lab-${q.shard.id}`, kind: "labKey", keyId: q.shard.id, name: q.shard.name, x: c.x, y: c.y, state: "waiting", actions: ["take"], lore: "A shard of carved stone, warm to the touch. Somewhere a hidden door has a hollow it would fit." }); }
  if (q.sealedVault !== undefined) { const c = take(); if (c) objects.push({ id: "pent-sealed", kind: "chest", sealedVault: true, name: `${q.name}: its hoard`, x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache });
    const r = take(); if (r) objects.push({ id: `pent-relic-${P.relics.length + q.sealedVault}`, kind: "pentRelic", relic: P.relics.length + q.sealedVault, name: "A relic of the Fivefold Court", x: r.x, y: r.y, state: "waiting", actions: ["read"], lore: P.sealedRelics[q.sealedVault] }); }
  if (q.reliquary) { const c = take(); if (c) objects.push({ id: "pent-reliquary", kind: "chest", reliquary: true, name: q.name, x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache }); }
  if (q.seal) { const c = take(); if (c) objects.push({ id: "pent-seal", kind: "pentSigil", name: "The Fivefold Seal", x: c.x, y: c.y, state: "waiting", actions: ["take"], lore: P.messages.seal }); }
  const V2 = plan.V >= 2, vault = q.id === `h${plan.nh - 1}`, enemySpawns = [], hi = q.kind === "heart" ? Number(q.id.slice(1)) : 0;
  const ng = V2 && q.warden ? P.warden.ghouls : V2 && q.lord ? P.lord.ghouls : V2 && q.boss ? P.deepBoss.ghouls[0] + h("n") % (P.deepBoss.ghouls[1] - P.deepBoss.ghouls[0] + 1) : q.trial ? P.trialGuards : P.ghouls[0] + h("n") % (P.ghouls[1] - P.ghouls[0] + 1);
  // v2: a lord or a floor's keeper, a named boss: a lord at the far end of its hall, a keeper by the way down it holds
  const boss = V2 && (q.lord || q.boss || q.warden); if (boss) { const down = q.ports.find((p) => p.kind === "pass" && plan.nodes.find((n) => n.id === p.to).n > q.n), toward = down ? down.inner : null, d = (c) => toward ? Math.abs(c.x - toward.x) + Math.abs(c.y - toward.y) : -(Math.abs(c.x - arrive.x) + Math.abs(c.y - arrive.y));
    const c = cells.filter((p) => !taken.has(p.y * W + p.x)).sort((a, b) => d(a) - d(b))[0]; if (c) { taken.add(c.y * W + c.x); const B = q.lord ? P.lord : q.warden ? P.warden : P.deepBoss, grow = q.lord || q.warden ? 1 : 1 + B.perFloor * hi;
      enemySpawns.push({ id: `${id}:lord`, kind: boss.kind, x: c.x, y: c.y, buildingGuard: true, boss: true, packGuardian: true, pentBoss: { name: boss.name, hp: B.hp * grow, damage: B.damage * grow, affixes: B.affixes } }); } }
  for (let i = 0; i < ng; i++) { const c = take(); if (!c) break; enemySpawns.push({ id: `${id}:g${i}`, kind: P.guards[h(`k${i}`) % P.guards.length], x: c.x, y: c.y, buildingGuard: true }); }
  if (V2 ? vault : q.id === "h2") { const c = take(); if (c) objects.push({ id: "building-cache", kind: "chest", name: "The Regent's Hoard", x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache });
    const g = take(); if (g) enemySpawns.push({ id: `${id}:guardian`, kind: P.regent, x: g.x, y: g.y, buildingGuard: true, buildingGuardian: true, ...(V2 ? { boss: true, packGuardian: true, pentBoss: { name: "The Regent", ...P.regentBoss } } : {}) }); }
  const D = P.dread, dread = V2 ? Math.min(D.max, q.kind === "outer" ? D.outer : q.kind === "inner" || q.kind === "secret" || q.kind === "sealed" ? D.inner : D.heart + D.perFloor * hi) : 0;
  const depth = q.kind === "outer" ? 1 : q.kind === "inner" || q.kind === "secret" || q.kind === "sealed" ? 2 : 3 + Number(q.id.slice(1));
  return { seed, id, recipe: "greatBuilding", name: `${P.name} · ${q.name}${q.trial ? " · a trial" : ""}`, identity: `${P.name}: ${q.name}`, danger: "ghouls", width: W, height: H, tiles, entry: { ...arrive }, exit: null, objects, enemySpawns,
    building: { base: Pp.base, style: "keep", floor: depth, floors: V2 ? 3 + plan.nh - 1 : 5, labyrinth: true, pentagon: true, node: q.n, kind: q.floorKind, of: plan.nodes.length, keys: plan.keyNode ? [{ id: "key0", name: "Regent's Key" }] : plan.V >= 3 ? P.shardNames.slice(0, P.secrets).map((name, k) => ({ id: `shard${k}`, name })) : [], trial: !!q.trial, trials: plan.trials.length, entries, exitsTo, vault: V2 ? vault : q.id === "h2", ...(V2 ? { V: plan.V, dread, boss: !!boss, levers: plan.levers.length, champions: plan.trials.length + plan.nh - 1, heartFloor: q.kind === "heart" ? hi : -1 } : {}), breachEntry: null, roofLadder: null, fallTo: null }, layoutVersion: 1, themePool: 0 };
}
