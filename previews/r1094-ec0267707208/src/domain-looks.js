// The looks and layouts of the world beasts' domains (release 724; far-domains.ts builds them, landscape-render.ts draws them).
// Data only, no imports, so landscape.ts, atlas-colors.ts, landscape-render.ts and far-domains.ts can all read it.
//
// Every domain is the same plan in its own dress: a fighting floor (`floor` radius) at the centre; landmarks (`features`: a ring
// of clusters and a few beyond, each with a tall `tower` on its front tile) drawn in their `shape`; a hazard (`hazard`) in a
// ring, winding rivers and pools beyond (or, `sea`, everywhere past the ring), never on the causeways to the four gates; strewn
// ground (`scatter`) round the landmarks and plain ground elsewhere. Its tiles are the kinds `<prefix>Ground`, `<prefix>Floor`,
// `<prefix>Scatter` and `<prefix>Feature` (blocked), and the hazard's own kind (`lava`, `abyss`, `ocean`, `toxicWater`, or the
// blocked `<prefix>Thicket`), each carrying `look` (the domain id) so it is drawn in the domain's colours.
export const DOMAIN_LOOKS = {
  voidWalker: { prefix: "unlit", weather: "fog", floor: 6.5,
    ground: ["#1b1d26", "#101118", "#3a3d55", "#6a6fa055"], floorTone: ["#2b2d3b", "#1e1f2a", "#8c90c0"], scatter: ["#9aa0ff", "#e6e8ff"],
    features: { shape: "slab", count: [6, 8], ring: [8.2, 10], size: [.8, 1.4], outer: 5, outerRing: [12.5, 15], tower: [1.8, 3], hues: [["#0b0c12", "#262838", "#9d8cff"], ["#0b0c12", "#1f2a36", "#7fd4ff"]] },
    hazard: { kind: "abyss", look: "void", ring: [10.8, 12.4], river: .06, riverScale: 5, pools: .58, poolScale: 3 },
    atlas: ["#1b1d26", "#2b2d3b", "#3a3d55", "#262838"] },
  crimsonTyrant: { prefix: "redthrone", weather: "embers", floor: 7,
    ground: ["#3a1814", "#22100d", "#6a2a1e", "#ff5a2a55"], floorTone: ["#2a1412", "#1a0b0a", "#ff7a3a"], scatter: ["#ff4a2a", "#ffb08a"],
    features: { shape: "spike", count: [8, 11], ring: [8.4, 10.4], size: [.7, 1.3], outer: 7, outerRing: [12.6, 15.5], tower: [2.2, 3.8], hues: [["#1a0505", "#6e1410", "#ff6a4a"], ["#120404", "#4a0e0c", "#ff9a6a"]] },
    hazard: { kind: "lava", look: "lava", ring: [11, 12.8], river: .065, riverScale: 5, pools: .6, poolScale: 3 },
    atlas: ["#3a1814", "#2a1412", "#6a2a1e", "#6e1410"] },
  doomChaser: { prefix: "blackpyre", weather: "embers", floor: 7,
    ground: ["#2a2a2e", "#16161a", "#4a4a52", "#9a6aff44"], floorTone: ["#222226", "#141417", "#b48cff"], scatter: ["#2e2a36", "#c9a8ff"],
    features: { shape: "column", count: [7, 9], ring: [8.4, 10.2], size: [.7, 1.2], outer: 6, outerRing: [12.5, 15.5], tower: [1.8, 3.2], hues: [["#141218", "#565062", "#b48cff"], ["#141218", "#625a6c", "#ff8aff"]] },
    hazard: { kind: "lava", look: "blackfire", ring: [11.2, 12.6], river: .055, riverScale: 5.5, pools: .64, poolScale: 3.2 },
    atlas: ["#2a2a2e", "#222226", "#4a4a52", "#2a2830"] },
  morphingBlob: { prefix: "renderpit", weather: "drip", floor: 7,
    ground: ["#3a3a22", "#25261a", "#5a5a30", "#9adf4a33"], floorTone: ["#4a4530", "#302d1e", "#c8d07a"], scatter: ["#d8d2b8", "#9adf4a"],
    features: { shape: "rib", count: [6, 8], ring: [8.4, 10.2], size: [.8, 1.4], outer: 6, outerRing: [12.5, 15.5], tower: [1.6, 2.6], hues: [["#5a5440", "#cfc6a8", "#f2ecd6"], ["#4a4632", "#bdb390", "#e6dcc0"]] },
    hazard: { kind: "toxicWater", look: "toxic", ring: [11, 12.6], river: .06, riverScale: 5, pools: .58, poolScale: 3 },
    atlas: ["#3a3a22", "#4a4530", "#5a5a30", "#cfc6a8"] },
  tremorWorm: { prefix: "hollowdunes", weather: null, floor: 7.5,
    ground: ["#c9a25e", "#a8823e", "#e2c48a", "#7a5a2a44"], floorTone: ["#d6b476", "#bc9858", "#f0dcae"], scatter: ["#8a6a3a", "#f4e4c0"],
    features: { shape: "rib", count: [5, 7], ring: [8.6, 10.4], size: [.8, 1.5], outer: 5, outerRing: [12.5, 15.5], tower: [1.8, 3], hues: [["#8a6232", "#c89a5e", "#f2d8a8"], ["#7a5228", "#b8884a", "#e8c890"]] },
    hazard: { kind: "abyss", look: "pit", ring: null, river: 0, riverScale: 5, pools: .6, poolScale: 2.6 },
    atlas: ["#c9a25e", "#d6b476", "#e2c48a", "#c89a5e"] },
  mountainTurtle: { prefix: "glassshoal", weather: "snow", floor: 7,
    ground: ["#cfe2ec", "#a9c6d6", "#ffffff", "#6aa0c855"], floorTone: ["#b8d6e6", "#94b8cc", "#ffffff"], scatter: ["#7fc8e8", "#ffffff"],
    features: { shape: "spike", count: [7, 9], ring: [8, 9.6], size: [.7, 1.2], outer: 0, outerRing: [12, 13], tower: [2, 3.4], hues: [["#3a7a9a", "#a8e4ff", "#ffffff"], ["#2a6a8a", "#8fd0f0", "#f4fdff"]] },
    hazard: { kind: "ocean", look: "sea", sea: 11, ring: null, river: 0, riverScale: 5, pools: 2, poolScale: 3 },
    atlas: ["#cfe2ec", "#b8d6e6", "#ffffff", "#a8e4ff"] },
  ashenMoth: { prefix: "cinderorchard", weather: "embers", floor: 7,
    ground: ["#4a4440", "#2e2a28", "#6a625c", "#ff8a3a44"], floorTone: ["#5a544e", "#3c3834", "#d8cfc4"], scatter: ["#8a8078", "#ffb06a"],
    features: { shape: "tree", count: [8, 10], ring: [8.2, 10.4], size: [.6, 1], outer: 8, outerRing: [12, 15.5], tower: [2.2, 3.4], hues: [["#1a1412", "#3a2e28", "#e8dcc8"], ["#141010", "#2e2420", "#d8c8b0"]] },
    hazard: { kind: "lava", look: "embers", ring: null, river: 0, riverScale: 5, pools: .66, poolScale: 2.6 },
    atlas: ["#4a4440", "#5a544e", "#6a625c", "#3a2e28"] },
  nanobotKnight: { prefix: "forgespire", weather: null, floor: 7,
    ground: ["#3a3f46", "#272b31", "#5a626c", "#7fd8ff33"], floorTone: ["#4a5058", "#353a41", "#9ae4ff"], scatter: ["#6a7480", "#ffb04a"],
    features: { shape: "pylon", count: [6, 8], ring: [8.4, 10.2], size: [.8, 1.3], outer: 6, outerRing: [12.5, 15.5], tower: [2.2, 3.6], hues: [["#1a1d22", "#4a525c", "#7fe0ff"], ["#1a1d22", "#545c66", "#ffb04a"]] },
    hazard: { kind: "lava", look: "slag", ring: [11.2, 12.4], river: .05, riverScale: 6, pools: .66, poolScale: 3 },
    atlas: ["#3a3f46", "#4a5058", "#5a626c", "#4a525c"] },
  briarStag: { prefix: "thornheart", weather: null, floor: 7,
    ground: ["#2e4a26", "#1e3418", "#4a6a3a", "#c8e07a33"], floorTone: ["#4a6a34", "#344e24", "#d6f08a"], scatter: ["#6a8a3a", "#e8a0c0"],
    features: { shape: "briar", count: [7, 9], ring: [8.4, 10.2], size: [.8, 1.4], outer: 7, outerRing: [12.5, 15.5], tower: [1.8, 2.8], hues: [["#2a1c10", "#5a3a20", "#e86a8a"], ["#24180c", "#4a3018", "#f0a0c0"]] },
    hazard: { kind: "thicket", look: "thicket", ring: [11, 12.4], river: .05, riverScale: 5, pools: .62, poolScale: 3 },
    atlas: ["#2e4a26", "#4a6a34", "#4a6a3a", "#5a3a20"] },
};
export const DOMAIN_LOOK_IDS = Object.keys(DOMAIN_LOOKS);
const kinds = (L) => ({ ground: `${L.prefix}Ground`, floor: `${L.prefix}Floor`, scatter: `${L.prefix}Scatter`, feature: `${L.prefix}Feature`, thicket: `${L.prefix}Thicket` });
export const domainKinds = (id) => kinds(DOMAIN_LOOKS[id]);
export const DOMAIN_WALKABLE = DOMAIN_LOOK_IDS.flatMap((id) => { const k = domainKinds(id); return [k.ground, k.floor, k.scatter]; });
export const DOMAIN_BLOCKED = DOMAIN_LOOK_IDS.flatMap((id) => { const k = domainKinds(id); return [k.feature, k.thicket]; });
export const DOMAIN_ATLAS = Object.fromEntries(DOMAIN_LOOK_IDS.flatMap((id) => { const k = domainKinds(id), a = DOMAIN_LOOKS[id].atlas; return [[k.ground, a[0]], [k.floor, a[1]], [k.scatter, a[2]], [k.feature, a[3]], [k.thicket, a[3]]]; }));
// the hazards' colours: [deep, bright, glow, crust]
export const DOMAIN_MELTS = { lava: ["#ff6a18", "rgba(255,230,120,.75)", "rgba(255,110,30,.42)", "#3a120a"], blackfire: ["#1a0e2a", "rgba(190,120,255,.7)", "rgba(160,90,255,.4)", "#08050c"],
  toxic: ["#5aa82a", "rgba(200,255,120,.6)", "rgba(150,230,60,.35)", "#2a3a12"], slag: ["#ff8a2a", "rgba(255,240,180,.7)", "rgba(255,150,60,.4)", "#2a2a2e"],
  sea: ["#1d5a86", "rgba(140,210,255,.45)", "rgba(120,200,255,.25)", "#e8f4fa"], void: ["#05050a", "rgba(140,130,255,.35)", "rgba(110,100,255,.3)", "#2a2c3c"],
  pit: ["#2a1c0c", "rgba(90,60,30,.5)", "rgba(40,25,10,.35)", "#8a6232"], embers: ["#ff5a1a", "rgba(255,200,90,.7)", "rgba(255,120,40,.38)", "#2a2220"],
  thicket: ["#1a2a12", "rgba(90,130,50,.5)", "rgba(0,0,0,.2)", "#0e1a0a"] };
