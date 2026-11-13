// The Mountain Turtle in Close View: the same beast as its standard-view art (monster-render.ts BODY.mountainTurtle: a
// tortoise the size of a barrow, its shell a ziggurat of four fitted-stone terraces, set back as they rise, a lit ledge on
// each, block joints, lichen and cracks, ice grown on the ledges, a tomb door lit faintly from deep inside, a broken crag with
// snow on top; pillar legs ringed with old folds on broad nailed feet; a long neck of folded skin plates reaching forward and
// up to a heavy wedge of a head with a dark beak and a half-shut eye), as a solid skinned body on the shared beast rig
// (close-view-beast-rig.ts), animated from its real attack clocks (monster-pack.ts ATTACK_MODULES.turtle*, TURTLE).
// The stomp lands as its wind-up ends; the dash rushes on its active clock; both spins turn it in its shell inside the ice
// tornado while the game has it spinning; the comet leaves its mouth as the wind-up ends; the ice shield grows over the
// wind-up and stands while the game has it shielded; the shell tuck is its dodge. Nothing here changes timing, damage, reach
// or targeting.
//
// Body units are the standard view's (a tile times the actor's scale). monster-pack.ts reaches close-view.ts, which loads this
// module before monster-pack.ts has finished loading, so its tables are read lazily (never at module load).
import { ATTACK_MODULES, BOSS_PACE } from "./monster-pack.js?v=r928-60da61d95073";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, boneLocalToWorld, writeSkin, solveTwoBone,
  createGait, stepGait, meshBuilder, clamp01, smooth, easeIn, easeOut, span, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r928-60da61d95073";

export const TURTLE_RIG = Object.freeze({
  closeViewScale: 1.25, // drawn a quarter larger than the standard view, like every Close View beast (presentation only)
  hip: .27, halfWidth: .27, foreX: .33, hindX: -.33, upper: .115, lower: .105, foot: .03, stand: .03, // stand: knees a little bent at rest, so planted feet have reach
  walk: Object.freeze({ stride: .16, stance: .72 }), dash: Object.freeze({ stride: .3, stance: .5 }), footLift: .06,
  settle: 3, stepAt: .06, stepTime: .5, turnRate: 1.4, standTurnRate: 1.1, standTurnMax: .7, attackTurnRate: 5,
  blendMs: 240, impactMs: 520, hitMs: 280, landMs: 400, deathMs: 2600, spinRate: 14, breathe: .22, bob: .012, roll: .035,
  // body poses: rear (+ front lifts on the hind legs), head (+ neck raised), reach (+ neck thrust out), tuck (0 out .. 1 legs
  // and neck drawn into the shell), crouch (body down), open (jaw), swing (head turned, + right), lean (+ nose down)
  poses: Object.freeze({
    idle: { rear: 0, head: 0, reach: 0, tuck: 0, crouch: 0, open: .05, swing: 0, lean: 0 },
    rear: { rear: .32, head: .35, reach: -.25, crouch: -.02, open: .35 },
    stamp: { rear: -.05, head: -.25, reach: .15, crouch: .07, open: .5 },
    dashLoad: { crouch: .06, head: -.35, reach: -.3, lean: .08, open: .2 },
    dash: { rear: -.04, head: -.25, reach: .3, lean: .12, open: .35 },
    tuck: { tuck: 1, crouch: 0 },
    breathLoad: { rear: .12, head: .5, reach: -.5, open: .45 },
    breath: { rear: -.03, head: -.05, reach: .6, open: 1 },
    brace: { crouch: .05, head: .2, reach: -.35, open: .15 },
    dazed: { crouch: .05, head: -.55, reach: .15, swing: .25, open: .3 },
  }),
});
const PK = ['rear', 'head', 'reach', 'tuck', 'crouch', 'open', 'swing', 'lean'], K = PK.length;
const POSE_VEC = Object.freeze(Object.fromEntries(Object.entries(TURTLE_RIG.poses).map(([n, p]) => [n, Float64Array.from(PK.map((k) => p[k] || 0))])));

// ------------------------------------------------------------------------------------------------ skeleton
const R = TURTLE_RIG;
const LEGS = [ // gait order: hind left, fore left, hind right, fore right
  { tag: 'HL', hind: true, side: -1 }, { tag: 'FL', hind: false, side: -1 }, { tag: 'HR', hind: true, side: 1 }, { tag: 'FR', hind: false, side: 1 },
].map((L) => Object.freeze({ ...L, top: 'leg' + L.tag, low: 'shin' + L.tag, foot: 'foot' + L.tag, x: L.hind ? R.hindX : R.foreX }));
export const TURTLE_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'body', parent: 'root', at: [0, 0, R.hip] }, // the shell and plinth: everything stone rides on it
  { name: 'tail', parent: 'body', at: [-.52, 0, -.01] },
  // the neck arches up out of the front of the shell and comes down forward to the head (the standard view's curve)
  { name: 'neck0', parent: 'body', at: [.4, 0, -.01] }, { name: 'neck1', parent: 'neck0', at: [.1, 0, .14] }, { name: 'neck2', parent: 'neck1', at: [.11, 0, .1] },
  { name: 'head', parent: 'neck2', at: [.14, 0, -.06] }, { name: 'jaw', parent: 'head', at: [.02, 0, -.05] },
  ...LEGS.flatMap((L) => [{ name: L.top, parent: 'body', at: [L.x, L.side * R.halfWidth, -.02] }, { name: L.low, parent: L.top, at: [0, 0, -R.upper] }, { name: L.foot, parent: L.low, at: [0, 0, -R.lower] }]),
  { name: 'dome', parent: 'root', at: [0, 0, 0] }, // the ice shield
  { name: 'twister', parent: 'root', at: [0, 0, 0] }, // the ice tornado
]);
const BI = TURTLE_SKELETON.index;
const E_DOOR = 1, E_MOUTH = 2, E_SHIELD = 3, E_WIND = 4;
const WALK_PHASE = [0, .25, .5, .75], DASH_PHASE = [0, .5, .5, 0];

// ------------------------------------------------------------------------------------------------ the body
const C = Object.freeze({ lit: 0x9c978a, mid: 0x7b776c, dark: 0x55524a, deep: 0x3a3833, ledge: 0xb3ae9f, line: 0x2a2824, ice: 0xa8dcef, iceLit: 0xe4f5fb,
  iceDark: 0x6aa6c4, skin: 0x6d6a5f, skinLit: 0x8a8679, skinDark: 0x48463f, lichen: 0x6f7a5a, worn: 0x6a665c, moss: 0x66704f, pale: 0x948f82, snow: 0xe9eef0, nail: 0xb8b29e, door: 0x1b1d1f, doorGlow: 0x8fd8ff,
  beak: 0x2e2c27, eye: 0x1a1c1e, iris: 0x9fc8d8, mouth: 0xbfe8ff });
// the terraces: [half length, half width, base height]; four courses of fitted stone, each set back from the one below
const TERRACES = Object.freeze([0, 1, 2, 3].map((i) => Object.freeze([.55 * (1 - .2 * i), .46 * (1 - .2 * i), .255 + i * .115])));
const COURSE = .1;
function buildTurtleMesh(tier) {
  const d = TIER_DETAIL[tier], full = tier === 'full', low = tier === 'low', B = meshBuilder(TURTLE_SKELETON, d), bw = TURTLE_SKELETON.bindWorld;
  const at = (bone, p) => { const i = BI[bone] * 3; return [p[0] - bw[i], p[1] - bw[i + 1], p[2] - bw[i + 2]]; };
  const UP = [0, 0, 1];
  // a hash in [0, 1) for the stonework's irregularity: the same every build
  const h = (a, b = 0) => ((((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000) / 1000;
  // ---- the plinth it all stands on: worn dark stone, the rim of the plastron
  B.bone('body').color(C.deep).box({ at: at('body', [0, 0, .21]), size: [.57, .48, .045], bevel: .3 });
  if (!low) B.color(C.dark).box({ at: at('body', [0, 0, .252]), size: [.565, .475, .006], bevel: 0 }); // the worn rim
  if (!low) for (let k = 0; k < (full ? 9 : 5); k++) { const side = k % 4, f = (h(k, 21) * 1.6 - .8), p = side < 2 ? [(side ? 1 : -1) * .575, f * .45, .17] : [f * .55, (side === 2 ? 1 : -1) * .485, .17], len = .03 + .04 * h(k, 22);
    B.color(k % 2 ? C.ice : C.iceLit).lathe({ at: at('body', p), F: [0, 0, -1], U: [1, 0, 0], rings: [[0, .009 + .006 * h(k, 23)], [len, 0]], seg: 4, caps: false, smooth: false }); } // icicles hanging from the rim
  // ---- the four terraces: each a block of fitted stone with sloped faces, a lit ledge on top
  for (let i = 0; i < 4; i++) {
    const [L, Wd, z0] = TERRACES[i];
    B.bone('body').color(C.deep).box({ at: at('body', [0, 0, z0 + COURSE / 2]), size: [L, Wd, COURSE / 2], taper: .07, bevel: .3 }); // the mortar and core, worn round at the edges
    B.color(C.ledge).box({ at: at('body', [0, 0, z0 + COURSE + .004]), size: [L * .93, Wd * .93, .006], bevel: 0 });
    // snow lies on the upper ledges, drifted against the course above
    if (i >= 1) B.color(C.snow).box({ at: at('body', [-.01 * i, .005, z0 + COURSE + .011]), size: [L * (.86 - .04 * i), Wd * (.86 - .04 * i), .003], bevel: 0 });
    if (low) continue;
    // (Tim, 2026-11-11: "make his shell more weathered"): each face laid in courses of stone blocks of uneven width and
    // mixed weathering (grey, darkened, moss-green, pale), set a little proud of the mortar so the joints read between them;
    // some blocks worn down at the top, some cracked, now and then one fallen out; the faces lean in as the course rises
    const tones = [C.mid, C.dark, C.lit, C.worn, C.moss, C.pale, C.mid, C.worn];
    const rows = full && i === 0 ? 2 : 1; // the bottom course in two staggered rows
    for (let row = 0; row < rows; row++) for (const [axis, sg] of [[0, -1], [0, 1], [1, -1], [1, 1]]) {
      const half = axis === 0 ? Wd : L, dist = axis === 0 ? L : Wd, n = (half > .35 ? 6 : half > .22 ? 5 : 4) - (full ? 0 : 2) + row;
      const nrm = axis === 0 ? [sg * COURSE, 0, .07 * dist] : [0, sg * COURSE, .07 * dist], up = axis === 0 ? [-sg * .07 * dist, 0, COURSE] : [0, -sg * .07 * dist, COURSE];
      // uneven widths: cut points jittered along the face (the same every build)
      const cuts = [-half * .97]; for (let k = 1; k < n; k++) cuts.push(-half * .97 + (2 * half * .97) * (k - row * .5 + (h(i * 7 + axis + row * 31, k * 3 + sg + 4) - .5) * .5) / n); cuts.push(half * .97);
      for (let k = 0; k < n; k++) {
        const a = cuts[k] + .004, b = cuts[k + 1] - .004, mid = (a + b) / 2, hw = (b - a) / 2, r = h(i * 13 + k + row * 17, axis * 5 + sg + 9);
        if (r < .06) continue; // a block fallen out: the dark core shows
        if (i === 1 && axis === 0 && sg > 0 && Math.abs(mid) < .09) continue; // the tomb door is here
        const rh = COURSE * (rows > 1 ? .21 : .44), worn = r > .8 ? .55 + .3 * h(k, i) : 1, hu = rh * worn, zc = z0 + (rows > 1 ? COURSE * (.25 + .5 * row) : COURSE * .5) - (rh - hu);
        const off = dist - .07 * dist * ((zc - z0) / COURSE) + .003;
        const at0 = axis === 0 ? [sg * off, mid, zc] : [mid, sg * off, zc];
        B.color(tones[Math.floor(r * 997) % tones.length]).box({ at: at('body', at0), size: [.004, hw, hu], bevel: 0, F: nrm, U: up });
        if (full && r > .55 && r < .68) { // a crack across it
          const tilt = h(k, i + 3) > .5 ? .55 : -.55, cr = axis === 0 ? [0, Math.cos(tilt) * 0 + Math.sin(tilt), 0] : [Math.sin(tilt), 0, 0];
          const cu = [up[0] + cr[0] * COURSE, up[1] + cr[1] * COURSE, up[2]];
          B.color(C.line).box({ at: at('body', [at0[0] + (axis === 0 ? sg * .003 : 0), at0[1] + (axis === 1 ? sg * .003 : 0), at0[2]]), size: [.003, .0025, hu * .85], bevel: 0, F: nrm, U: cu });
        }
      }
    }
  }
  // ---- the tomb door in the second terrace, toward the head: a dark doorway lit faintly from deep inside, sill and lintel
  { const [L, , z0] = TERRACES[1], x = L * .965;
    B.bone('body').color(C.door).box({ at: at('body', [x + .004, 0, z0 + .046]), size: [.006, .045, .038], bevel: 0 });
    B.color(C.doorGlow, E_DOOR).box({ at: at('body', [x + .009, 0, z0 + .036]), size: [.003, .022, .024], bevel: 0 });
    B.color(C.ledge).box({ at: at('body', [x + .01, 0, z0 + .006]), size: [.012, .066, .006], bevel: 0 });
    B.color(C.lit).box({ at: at('body', [x + .01, 0, z0 + .088]), size: [.012, .06, .008], bevel: 0 }); }
  // ---- ice grown on the ledges: shards at the corners and along the edges, a lit one beside a shaded one
  const shard = (p, lean, hgt, tone = C.ice) => B.bone('body').color(tone).lathe({ at: at('body', p), F: [lean[0], lean[1], 1], U: [1, 0, 0], rings: [[0, hgt * .3], [hgt * .55, hgt * .22], [hgt, 0]], seg: 5, smooth: false, phase: h(Math.round(p[0] * 99), Math.round(p[1] * 99)) * 6 });
  for (let i = 0; i < 3; i++) { const [L, Wd, z0] = TERRACES[i], [nL, nW] = TERRACES[i + 1], top = z0 + COURSE + .008;
    const spots = low ? [[1, 1]] : full ? [[1, 1], [-1, -1], [1, -1], [-.2, 1], [-1, .3]] : [[1, 1], [-1, -1], [-.3, 1]];
    spots.forEach(([fx, fy], j) => { const x = fx * (nL + (L - nL) * .45), y = fy * (nW + (Wd - nW) * .45), hg = .07 + .06 * h(i, j);
      shard([x, y, top], [fx * .25, fy * .3], hg, j % 2 ? C.iceLit : C.ice); if (full) shard([x - fx * .03, y + fy * .02, top], [fx * .4, -fy * .1], hg * .6, C.iceDark); }); }
  // ---- the summit: a broken crag with snow on its peaks, crystals at its foot
  { const top = TERRACES[3][2] + COURSE;
    B.bone('body').color(C.mid).lathe({ at: at('body', [-.02, .01, top]), F: UP, U: [1, 0, 0], rings: [[0, .14], [.07, .11], [.14, .055], [.2, 0]], rs: .8, seg: 6, smooth: false, phase: .4 });
    B.color(C.snow).lathe({ at: at('body', [-.02, .01, top + .118]), F: UP, U: [1, 0, 0], rings: [[0, .07], [.04, .045], [.085, 0]], rs: .8, seg: 6, smooth: false, phase: .4 });
    B.color(C.dark).lathe({ at: at('body', [.07, -.05, top]), F: [.25, -.2, 1], U: [1, 0, 0], rings: [[0, .07], [.08, .04], [.13, 0]], seg: 5, smooth: false, phase: 1 });
    if (!low) B.color(C.snow).lathe({ at: at('body', [.07 + .25 * .085, -.05 - .2 * .085, top + .085]), F: [.25, -.2, 1], U: [1, 0, 0], rings: [[0, .028], [.047, 0]], seg: 5, smooth: false, phase: 1 });
    B.color(C.lit).lathe({ at: at('body', [-.1, .07, top]), F: [-.3, .2, 1], U: [1, 0, 0], rings: [[0, .06], [.1, 0]], seg: 5, smooth: false });
    shard([-.13, -.12, top], [-.35, -.3], .1, C.iceLit); shard([.12, .1, top], [.4, .3], .08); }
  // ---- the skin: legs, neck, head and tail, folded in plates (alternate courses lit and shaded, darker beneath)
  const fold = (i, k, st) => st < -.35 ? C.skinDark : i % 2 ? C.skinLit : C.skin;
  // pillar legs, ringed with old folds, on broad feet; a shoulder of skin where each leaves the shell
  for (const L of LEGS) { const x = L.x, y = L.side * R.halfWidth, z = R.hip - .02, b = [L.top, L.low, L.foot];
    B.bone(L.top).color(C.skinDark).ellipsoid({ at: at(L.top, [x, y, z + .02]), radius: [.12, .11, .07], rings: 3, seg: 8 });
    const S = [[z + .03, .1, 0, 0], [z - .03, .097, 0, 0], [z - .08, .093, 0, 0], [z - .115, .09, 0, 1, .5], [z - .15, .09, 1], [z - .19, .094, 1], [.05, .1, 1, 2, .5], [.035, .11, 2], [.012, .118, 2], [.002, .116, 2], [0, 0, 2]];
    B.color(C.skin).loft({ seg: low ? 6 : 9, sections: S.map(([zz, r, a, bb, w]) => ({ at: [x, y, zz], rx: r, rz: r, bones: [b[a], b[bb ?? a], w || 0] })), up: [1, 0, 0],
      tone: (i, k, st) => i >= 6 ? C.skinDark : i % 2 ? C.skin : C.skinLit, caps: false });
    for (const c of low ? [0] : [-1, 0, 1]) B.bone(L.foot).color(C.nail).lathe({ at: at(L.foot, [x + .1, y + c * .05, .016]), F: [1, c * .3, -.25], rings: [[0, .02], [.035, 0]], seg: 4, caps: false }); }
  // the neck (Tim, 2026-11-11: "more segmented, like it's made of stone"): a chain of faceted stone drums along the arch, each
  // carried by its own bone so the neck bends block by block, a dark seam where one drum meets the next, the top of each lit
  const ARCH = [[.34, .245, .122, 'body'], [.43, .285, .116, 'neck0'], [.5, .36, .108, 'neck0'], [.55, .425, .1, 'neck1'], [.61, .47, .093, 'neck1'], [.68, .485, .087, 'neck2'], [.745, .462, .082, 'head']];
  const arch = low ? ARCH.filter((_, j) => j % 2 === 0) : ARCH;
  for (let j = 0; j < arch.length - 1; j++) {
    const [f0, u0, r0, bone] = arch[j], [f1, u1, r1] = arch[j + 1], d = [f1 - f0, 0, u1 - u0], len = Math.hypot(d[0], d[2]), r = (r0 + r1) / 2;
    B.bone(bone).color(j % 2 ? C.mid : C.lit).lathe({ at: at(bone, [f0, 0, u0]), F: d, U: [0, 0, 1], rings: [[-.01, r * .9], [len * .2, r], [len * .75, r * .98], [len + .006, r * .88]], rs: 1.05, seg: low ? 5 : 6, smooth: false, phase: j * .4, caps: j === 0 });
    if (!low) B.color(C.line).lathe({ at: at(bone, [f1, 0, u1]), F: d, U: [0, 0, 1], rings: [[-.008, r * .9], [.008, r * .9]], rs: 1.05, seg: 6, smooth: false, phase: j * .4, caps: false }); // the seam
  }
  // the head: a heavy wedge, flat-topped and broad behind the eyes, narrowing to a dark hooked beak
  const HEAD = [[.74, .452, .082, .08], [.8, .462, .088, .088], [.87, .458, .082, .08], [.93, .443, .068, .066], [.98, .428, .05, .048], [1.01, .418, .03, .03], [1.032, .41, 0, 0]];
  B.color(C.skinLit).loft({ seg: low ? 7 : 12, sections: HEAD.map(([f, u, rx, rz]) => ({ at: [f, 0, u], rx, rz, bones: ['head', 'head', 0] })), tone: (i, k, st) => i >= 4 ? C.beak : st < -.3 ? C.mid : st > .5 ? C.ledge : C.lit }); // stone, like the neck
  // the lower jaw (it drops for the comet), and the cold light inside the mouth
  B.color(C.skinDark).loft({ seg: low ? 5 : 8, sections: [[.78, .405, .062, .026], [.86, .395, .06, .025], [.94, .388, .046, .019], [.99, .383, .022, .01], [1.012, .38, 0, 0]].map(([f, u, rx, rz]) => ({ at: [f, 0, u], rx, rz, bones: ['jaw', 'jaw', 0] })),
    tone: (i) => i >= 3 ? C.beak : C.skinDark });
  B.bone('head').color(C.mouth, E_MOUTH).ellipsoid({ at: at('head', [.88, 0, .408]), radius: [.08, .046, .014], rings: 3, seg: 7 });
  // plates on the skull, and the eye: a narrow, half-shut, impassive slit under a heavy lid, a pale glint below it
  if (!low) for (const [x, w] of [[.79, .05], [.86, .044]]) B.color(C.lit).box({ at: at('head', [x, 0, .548]), size: [.028, w, .005], bevel: 0 });
  for (const s of [-1, 1]) {
    B.bone('head').color(C.eye).ellipsoid({ at: at('head', [.865, s * .074, .478]), radius: [.026, .008, .009], rings: 2, seg: 5 });
    if (!low) B.color(C.iris).ellipsoid({ at: at('head', [.868, s * .079, .472]), radius: [.014, .005, .004], rings: 2, seg: 4 });
    B.color(C.skin).box({ at: at('head', [.865, s * .075, .49]), size: [.034, .014, .008], bevel: 0, F: [1, 0, -.12] });
  }
  // a stub of a tail
  B.color(C.skinDark).loft({ seg: low ? 5 : 7, sections: [[-.48, .24, .06, .05, 'body'], [-.56, .225, .045, .04, 'body', 'tail', .6], [-.63, .2, .02, .02, 'tail'], [-.66, .19, 0, 0, 'tail']].map(([f, u, rx, rz, a, b, w]) => ({ at: [f, 0, u], rx, rz, bones: [a, b ?? a, w || 0] })) });
  // ---- optional: drawn only while it shields or spins
  B.mark();
  // the ice shield: a faceted dome of ice over everything (pale, translucent)
  B.bone('dome').color(C.ice, E_SHIELD).lathe({ at: at('dome', [0, 0, .16]), F: UP, U: [1, 0, 0], rings: [[0, .84], [.22, .82], [.44, .72], [.62, .54], [.76, .3], [.83, 0]], rs: .86, us: 1.28, seg: low ? 7 : 11, smooth: false, caps: false });
  // the ice tornado: broken bands of wind circling it, wider as they rise, and flecks of ice
  for (let i = 0; i < 4; i++) { const rr = .66 + i * .1, z = .22 + i * .2, n = low ? 6 : 10, a0 = i * 1.7, pts = [];
    for (let k = 0; k <= n; k++) { const a = a0 + k / n * 3.6; pts.push([Math.cos(a) * rr, Math.sin(a) * rr, z + .03 * Math.sin(a * 2)]); }
    B.bone('twister').color(i % 2 ? C.iceLit : C.ice, E_WIND).bolt({ at: at('twister', [0, 0, 0]), points: pts, width: .045 - i * .006 }); }
  for (let i = 0; i < (low ? 6 : 16); i++) { const a = i * 2 * Math.PI / 16 * 1.3, rr = .62 + (i % 3) * .12;
    B.color(C.iceLit, E_WIND).box({ at: at('twister', [Math.cos(a) * rr, Math.sin(a) * rr, .2 + (i % 5) * .2]), size: [.025, .018, .025], bevel: 0, F: [Math.cos(a), Math.sin(a), .4] }); }
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function turtleMesh(tier = 'full') { return MESHES[tier] ||= buildTurtleMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track
export function createTurtleTrack() {
  return {
    pose: createPose(TURTLE_SKELETON),
    gait: createGait(LEGS.map((L, k) => ({ side: L.side * R.halfWidth, fore: L.x, phase: WALK_PHASE[k] }))),
    yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(K), shown: new Float64Array(K),
    hp: NaN, hitAt: -Infinity, hitSide: 1, impactAt: -Infinity, impactK: 0, contactWas: 0, dash: 0,
    spin: 0, spinVel: 0, dome: 0, domeA: 0, wind: 0, deathAt: null, x: 0, y: 0, z: 0, deathDir: 1,
    frame: { kind: 'mountainTurtle', tier: 'full', mesh: null, skin: null, boneCount: TURTLE_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(8), phase: '', contact: 0, cloud: false },
  };
}

// ------------------------------------------------------------------------------------------------ what it is doing
const V = new Float64Array(K), W = new Float64Array(K);
const setVec = (o, n) => o.set(POSE_VEC[n] || POSE_VEC.idle);
function lerpVec(o, a, b, t) { const A = POSE_VEC[a] || POSE_VEC.idle, Bv = POSE_VEC[b] || POSE_VEC.idle; for (let k = 0; k < K; k++) o[k] = A[k] + (Bv[k] - A[k]) * t; }
function lerpInto(o, b, t) { const Bv = POSE_VEC[b] || POSE_VEC.idle; for (let k = 0; k < K; k++) o[k] += (Bv[k] - o[k]) * t; }
function phaseOf(pack, id) {
  const m = ATTACK_MODULES[id] || {}, dur = pack.phase === 'windup' ? (m.windup || .5) * (pack.paced ? BOSS_PACE.windup : 1) : pack.phase === 'active' ? m.active || 0 : m.recover || .5;
  return dur > 0 ? clamp01(1 - (Number(pack.t) || 0) / dur) : 1;
}
// spin: 0 still .. 1 full speed in its shell; shield: the dome's growth (0..1); paw: the forefeet scrape before the rush
const ACT = { aim: false, aimX: 0, aimY: 0, watch: false, still: false, dash: false, contact: 0, phase: '', spin: 0, shield: 0, wind: 0, glow: 0, paw: 0, heavy: 0 };
function act(e, tr, now, target) {
  const s = e.pack, id = s?.attack, ph = s?.phase, d = s?.data || {}, x = id ? phaseOf(s, id) : 0;
  ACT.aim = false; ACT.watch = false; ACT.still = !!id; ACT.dash = false; ACT.contact = 0; ACT.phase = id ? `${id}:${ph}` : 'move'; ACT.spin = 0; ACT.shield = 0; ACT.wind = 0; ACT.glow = 0; ACT.paw = 0; ACT.heavy = 0;
  const aimAt = (px, py) => { const dx = px - e.x, dy = py - e.y, l = Math.hypot(dx, dy); if (l > .01) { ACT.aimX = dx / l; ACT.aimY = dy / l; ACT.aim = true; } };
  const aimDir = (a) => { if (a && Math.hypot(a.x, a.y) > .01) { const l = Math.hypot(a.x, a.y); ACT.aimX = a.x / l; ACT.aimY = a.y / l; ACT.aim = true; } };
  if (e.tucked && !id) { setVec(V, 'tuck'); ACT.still = true; ACT.phase = 'tuck'; return; } // its dodge: drawn into the shell
  if (!id) { setVec(V, 'idle'); ACT.watch = true; return; }
  if (target && id !== 'turtleDash' && id !== 'turtleCyclone') aimAt(target.x, target.y);
  if (id === 'turtleStomp' || id === 'shockwave') {
    // rears on its hind legs over the wind-up, and the forefeet come down as it ends: the ground heaves and the ring rolls out
    const big = id === 'shockwave' ? 1 : .8;
    if (ph === 'windup') { lerpVec(V, 'idle', 'rear', easeOut(clamp01(x / .72)) * big); if (x > .8) lerpInto(V, 'stamp', easeIn(span(x, .8, 1))); ACT.contact = x > .98 ? 1 : 0; ACT.heavy = 1; }
    else { setVec(V, 'stamp'); lerpInto(V, 'idle', smooth(span(x, .25, 1))); if (x < .08) ACT.contact = 1; ACT.heavy = 1; }
  } else if (id === 'turtleDash') {
    aimDir(d.aim);
    if (ph === 'windup') { lerpVec(V, 'idle', 'dashLoad', smooth(x / .5)); ACT.paw = x < .85 ? 1 : 0; }
    else if (ph === 'active') { setVec(V, 'dash'); ACT.dash = true; ACT.still = false; ACT.contact = s.hitOnce && !tr.dashHitSeen ? 1 : 0; }
    else { setVec(V, 'dash'); lerpInto(V, 'idle', smooth(x)); }
  } else if (id === 'turtleSpin' || id === 'turtleCyclone') {
    // draws in over the wind-up and starts to turn; spins in its shell inside the tornado while active; slows and comes out
    if (id === 'turtleCyclone') aimDir(d.dir || d.aim);
    if (ph === 'windup') { lerpVec(V, 'idle', 'tuck', smooth(x / .6)); ACT.spin = easeIn(span(x, .5, 1)) * .5; ACT.wind = smooth(span(x, .4, 1)); }
    else if (ph === 'active') { setVec(V, 'tuck'); ACT.spin = 1; ACT.wind = 1; ACT.still = id === 'turtleSpin'; }
    else { setVec(V, 'tuck'); lerpInto(V, 'idle', smooth(span(x, .3, 1))); ACT.spin = 1 - smooth(x / .6); ACT.wind = 1 - smooth(x / .5); }
    ACT.aim = id === 'turtleCyclone' ? ACT.aim : false;
  } else if (id === 'turtleComet') {
    // draws its head back and up while cold light gathers in its mouth; thrusts it out and the comet leaves as the wind-up ends
    if (ph === 'windup') { lerpVec(V, 'idle', 'breathLoad', smooth(x / .8)); if (x > .86) lerpInto(V, 'breath', easeIn(span(x, .86, 1))); ACT.glow = smooth(x); ACT.contact = x > .98 ? 1 : 0; }
    else { setVec(V, 'breath'); lerpInto(V, 'idle', smooth(x)); ACT.glow = 1 - smooth(x / .5); if (x < .08) ACT.contact = 1; }
  } else if (id === 'turtleShield') {
    if (ph === 'windup') { lerpVec(V, 'idle', 'brace', smooth(x)); ACT.shield = easeOut(x); }
    else if (ph === 'active') { setVec(V, 'brace'); ACT.shield = 1; }
    else { lerpVec(V, 'brace', 'idle', smooth(x)); ACT.shield = 1 + x; } // above 1: the dome cracks and falls away
  } else setVec(V, 'idle');
}

// ------------------------------------------------------------------------------------------------ the pose
const H = new Float64Array(3), T = new Float64Array(3), J = new Float64Array(3), POLE = new Float64Array(3);
export function sampleTurtle(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), P = tr.pose, G = TURTLE_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  if (!dead) act(e, tr, now, env.target);
  else { setVec(V, 'dazed'); ACT.aim = false; ACT.watch = false; ACT.still = true; ACT.dash = false; ACT.contact = 0; ACT.phase = 'death'; ACT.spin = 0; ACT.shield = 0; ACT.wind = 0; ACT.glow = 0; ACT.paw = 0; ACT.heavy = 0; }
  // facing: the blow's aim; else where it goes; standing, the Wayfarer (slowly: it is a mountain)
  const dx = env.x - tr.gait.x, dy = env.y - tr.gait.y; let want = tr.yaw;
  if (ACT.aim) want = Math.atan2(ACT.aimY, ACT.aimX);
  else if (Number.isFinite(dx) && Math.hypot(dx, dy) > .004 * Math.max(1, dt * 60) && !(ACT.spin > .5)) want = Math.atan2(dy, dx);
  else if (ACT.watch && env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .3) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead && !(ACT.spin > .5)) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)), rate = e.pack?.attack ? G.attackTurnRate : tr.gait.moving < .1 ? G.standTurnRate : G.turnRate;
    let turn = Math.max(-1, Math.min(1, dt * rate)) * delta; if (!e.pack?.attack && tr.gait.moving < .1) turn = Math.max(-G.standTurnMax * dt, Math.min(G.standTurnMax * dt, turn)); tr.yaw += turn; }
  // the spin in its shell: speeds up and slows down; the body's yaw carries it, so the shell comes out of it facing a new way
  const spinWant = reduce ? 0 : ACT.spin * G.spinRate; tr.spinVel += (spinWant - tr.spinVel) * Math.min(1, dt * 4); tr.spin = (tr.spin + tr.spinVel * dt) % (Math.PI * 2);
  if (!(ACT.spin > 0) && Math.abs(tr.spinVel) < .4 && tr.spin !== 0) { const back = Math.atan2(Math.sin(-tr.spin), Math.cos(-tr.spin)); tr.spin += back * Math.min(1, dt * 3); if (Math.abs(back) < .01) tr.spin = 0; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // crossfade between acts (never across a contact: those live inside an act's timeline)
  const key = e.pack?.attack ? `${e.pack.attack}:${e.pack.seq}` : dead ? 'death' : e.tucked ? 'tuck' : 'move';
  if (tr.key === '' || !(gapMs <= G.blendMs)) { if (key !== tr.key) tr.blendAt = -Infinity; tr.shown.set(V); tr.from.set(V); tr.key = key; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  for (let k = 0; k < K; k++) tr.shown[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  W.set(tr.shown);
  // the stamp's shudder: the whole mountain shakes as its feet come down
  if (ACT.contact && !tr.contactWas) { tr.impactAt = now; tr.impactK = ACT.heavy ? 1 : .6; }
  tr.contactWas = ACT.contact; tr.dashHitSeen = !!e.pack?.hitOnce;
  const impT = (now - tr.impactAt) / 1000, impact = impT < G.impactMs / 1000 ? kick(impT, 24, 8) * tr.impactK : 0;
  W[4] += .02 * Math.abs(impact); W[1] -= .15 * impact;
  // hits and stagger: it pulls its head back and the shell rocks
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp;
  const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 14, 9) : 0;
  W[2] -= .35 * hit; W[6] -= .3 * hit * tr.hitSide; W[1] += .15 * hit;
  const stun = dead ? 0 : Math.max(0, Math.min(1, Number(e.poiseBreak) || 0));
  if (stun > 0) { const dz = POSE_VEC.dazed; for (let k = 0; k < K; k++) W[k] += (dz[k] - W[k]) * stun; }
  const daze = stun > 0 && !reduce ? stun * Math.sin(t * 2.6) : 0;
  // gait: a slow, heavy walk; in the rush a lumbering run on short quick strides
  const dashing = ACT.dash && !dead; tr.dash += ((dashing ? 1 : 0) - tr.dash) * Math.min(1, dt * 6);
  const gs = dashing ? G.dash : G.walk, phases = dashing ? DASH_PHASE : WALK_PHASE, tuck = clamp01(W[3]);
  for (let k = 0; k < 4; k++) { tr.gait.offsets[k] = phases[k]; tr.gait.side[k] = LEGS[k].side * (G.halfWidth + .02) * S; tr.gait.fore[k] = LEGS[k].x * S; }
  const still = (ACT.still && !dashing) || tuck > .3 || dead || e.fleeFade != null;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: gs.stride * S, stance: gs.stance, settle: G.settle, still, snapDistance: 3 * S, stepAt: G.stepAt * S, stepTime: G.stepTime, maxStepping: 2 });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  // root and body: the body lurches from side to side with each heavy step, rears on the hind legs (pivoting about them),
  // sinks onto its plinth when it tucks or dies, and breathes
  resetPose(P);
  let alpha = 1, roll = 0;
  if (e.fleeFade != null) alpha = clamp01(e.fleeFade);
  if (dead) { // the legs give, it settles onto its plinth, the neck sinks to the ground; it rolls a little onto one side
    const sink = smooth(death / .35), lean = easeIn(span(death, .3, .6)); W[4] = .17 * sink; W[3] = 0; W[1] = -.9 * sink; W[2] = .25 * sink; roll = .08 * lean * tr.deathDir;
    alpha *= 1 - span(death, .82, 1);
    if (death < 1e-9) { const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.deathDir = (px - e.x) * -sf + (py - e.y) * cf > 0 ? -1 : 1; }
  }
  setEuler(P, BI.root, yaw + tr.spin, 0, roll); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z);
  const breathe = reduce ? 0 : Math.sin(t * Math.PI * 2 * G.breathe);
  const bob = moving * G.bob * (1 + tr.dash) * (.5 - .5 * Math.cos(cyc * 2)), lurch = moving * G.roll * Math.sin(cyc) * (1 - .5 * tr.dash);
  const rear = W[0], sink = W[4] + tuck * .18 + bob + G.stand * (1 - tuck), lift = rear * .36; // rearing pivots about the hind feet: the front rises
  setOffset(P, BI.body, rear * .1, 0, lift - sink + breathe * .004);
  setEuler(P, BI.body, 0, -rear * .55 + W[7] * .15 + (reduce ? 0 : tr.dash * moving * .04 * Math.sin(cyc * 2)), lurch + daze * .05 + (reduce ? 0 : impact * .02)); resolveBone(P, BI.body);
  setEuler(P, BI.tail, (reduce ? 0 : .2 * Math.sin(t * 1.3)) * (1 - tuck), .15 * rear, 0); P.scl[BI.tail] = 1 - .6 * tuck; resolveBone(P, BI.tail);
  // the neck: raised, thrust out, drawn back into the shell, turned toward the Wayfarer; the head kept nearly level
  let look = 0;
  if (env.target && !dead && !ACT.contact) { const lx = env.target.x - e.x, ly = env.target.y - e.y, a = Math.atan2(ly, lx) - yaw; look = Math.max(-.7, Math.min(.7, Math.atan2(Math.sin(a), Math.cos(a)))) * .7; }
  const up = W[1], reach = W[2], swing = W[6] + look * (1 - tuck);
  setOffset(P, BI.neck0, .06 * reach - .3 * tuck, 0, -.03 * tuck); setEuler(P, BI.neck0, swing * .45, -up * .45 + reach * .25 + rear * .3, 0); P.scl[BI.neck0] = 1 - .6 * tuck; resolveBone(P, BI.neck0);
  setEuler(P, BI.neck1, swing * .3, -up * .3 + reach * .1 + (reduce ? 0 : .02 * wobble(t * .5, 3)), 0); resolveBone(P, BI.neck1);
  setEuler(P, BI.neck2, swing * .2, -up * .15 - reach * .1, 0); resolveBone(P, BI.neck2);
  setEuler(P, BI.head, swing * .1, up * .55 - reach * .2 - rear * .3 + (reduce ? 0 : .015 * wobble(t * .7, 5)), swing * .1); resolveBone(P, BI.head);
  setEuler(P, BI.jaw, 0, .5 * W[5] * (1 + (reduce ? 0 : .08 * Math.sin(t * 22)) * ACT.glow), 0); resolveBone(P, BI.jaw);
  // legs: pillars, nearly straight; two-bone IK from the hip to the ankle above a flat foot, knees bending outward and a little
  // forward; drawn up into the shell when it tucks; the forefeet scrape before the rush; lifted off the ground when it rears
  for (let k = 0; k < 4; k++) {
    const L = LEGS[k], top = BI[L.top], ls = 1 - .7 * tuck, footH = G.foot * S * ls;
    P.scl[top] = ls; resolveBone(P, top); const hi = top * 3; H[0] = P.wp[hi]; H[1] = P.wp[hi + 1]; H[2] = P.wp[hi + 2];
    let fx = tr.gait.out[k * 4], fy = tr.gait.out[k * 4 + 1], fl = tr.gait.out[k * 4 + 2], fz = env.z + footH + fl * G.footLift * S * (1 + tr.dash);
    const reared = !L.hind && rear > .05 ? rear : 0;
    if (tuck > .02 || reared > 0 || dead) { // under the hip (tucked in, splayed when dead), or hanging from the raised front
      const p = boneLocalToWorld(P, 'body', L.x, L.side * (G.halfWidth + (dead ? .08 * smooth(death / .3) : 0)), -G.hip + G.foot, T);
      const w = Math.max(tuck, reared > 0 ? 1 : 0, dead ? 1 : 0); fx += (p[0] - fx) * w; fy += (p[1] - fy) * w; fz += (Math.max(env.z + footH, p[2] - G.lower * S * .15 * reared) - fz) * w;
      if (tuck > .02) fz = Math.max(fz, H[2] - (G.upper + G.lower) * S * ls * .8);
    }
    if (!L.hind && ACT.paw && !reduce && !dead) { const pw = Math.max(0, Math.sin(t * 7 + (L.side > 0 ? 0 : Math.PI))); fz += pw * .05 * S; fx -= cf * pw * .04 * S; fy -= sf * pw * .04 * S; }
    T[0] = fx; T[1] = fy; T[2] = fz;
    // pole: out to the side and a little forward (the knee bulges outward like a tortoise's)
    POLE[0] = -sf * L.side * .8 + cf * .4; POLE[1] = cf * L.side * .8 + sf * .4; POLE[2] = 0;
    const L1 = G.upper * S * ls, L2 = G.lower * S * ls;
    solveTwoBone(H, T, L1, L2, POLE, J);
    aimWorld(P, top, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], cf, sf, 0); resolveBone(P, top);
    const lo = BI[L.low]; aimWorld(P, lo, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], cf, sf, 0); resolveBone(P, lo);
    const fo = BI[L.foot]; aimWorld(P, fo, 0, cf, sf, fl > .01 ? -.3 * fl : 0, 0, 0, 1); resolveBone(P, fo);
    tr.frame.feet[k * 2] = tr.gait.out[k * 4 + 3]; tr.frame.feet[k * 2 + 1] = fl;
  }
  // the shield: grows over the wind-up, stands, then cracks and falls away; the tornado: spins round it, faster than the shell
  const shieldUp = ACT.shield > 0 && ACT.shield <= 1 ? ACT.shield : 0, falling = ACT.shield > 1 ? ACT.shield - 1 : 0;
  tr.dome = shieldUp > 0 ? shieldUp : falling > 0 ? 1 + .08 * falling : 0; tr.domeA = shieldUp > 0 ? .3 + .45 * shieldUp : falling > 0 ? .75 * (1 - falling) : 0;
  if (dead) { tr.dome = 0; tr.domeA = 0; }
  setEuler(P, BI.dome, -yaw - tr.spin, 0, 0); P.scl[BI.dome] = Math.max(.001, tr.dome); resolveBone(P, BI.dome);
  tr.wind += ((dead ? 0 : ACT.wind) - tr.wind) * Math.min(1, dt * 5);
  setEuler(P, BI.twister, (reduce ? 0 : t * 9) - yaw - tr.spin, 0, 0); P.scl[BI.twister] = .85 + .15 * tr.wind; resolveBone(P, BI.twister);
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 2) : 1;
  F.emitK[0] = life * (.75 + (reduce ? 0 : .12 * Math.sin(t * 1.1))); // the cold light in the tomb door
  F.emitK[1] = life * (.4 + 1.4 * ACT.glow + (reduce || !ACT.glow ? 0 : .2 * Math.sin(t * 18))); // the comet gathering in its mouth
  F.emitK[2] = .55; F.emitK[3] = .7;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = tr.domeA; F.emitA[3] = tr.wind > .02 ? .85 * tr.wind : 0;
  F.tier = env.tier || 'full'; F.mesh = turtleMesh(F.tier); F.skin = P.skin; F.alpha = alpha; F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = 0; F.shadow = 1; F.phase = ACT.phase; F.contact = ACT.contact; F.cloud = F.emitA[2] > 0 || F.emitA[3] > 0;
  return F;
}
export const turtleBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
