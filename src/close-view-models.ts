// Rigid parts are baked once. Local +X is forward, +Y is lateral, and +Z is up.
// Mesh colors are RGB in [0, 1]. Close View supplies world-space lighting.
export const MODEL_FLOATS = 9;

function prism(sides, taper = 1) {
  const low = [], high = [], faces = [];
  for (let i = 0; i < sides; i++) {
    const a = (i + .5) * 2 * Math.PI / sides;
    low.push([Math.cos(a), Math.sin(a), -1]);
    high.push([Math.cos(a) * taper, Math.sin(a) * taper, 1]);
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    faces.push([low[i], low[j], high[j]], [low[i], high[j], high[i]]);
  }
  for (let i = 1; i < sides - 1; i++) {
    faces.push([low[0], low[i + 1], low[i]], [high[0], high[i], high[i + 1]]);
  }
  return faces;
}

const box = prism(4), bevel = prism(6, .81), flare = prism(6, 1.45), taper = prism(4, .18);
const square = Math.SQRT2;
const cloth = 0x64786b, leather = 0x303934, bronze = 0xbf9a64, visor = 0xc7e6c6;
const ash = 0x87503f, coal = 0x372927, ember = 0xf3a55c;
const bark = 0x626c50, darkBark = 0x373e2d, root = 0xb6a06b;
const bone = 0xb7ad91, sinew = 0x625550, crawlerEye = 0xd88f80;
const plate = 0x78434a, iron = 0x3a2a32, brass = 0xc6a46f;

function part(shape, x, y, z, sx, sy, sz, color, swing = 0, px = x, pz = z, rest = 0) {
  const mesh = new Float32Array(shape.length * 3 * MODEL_FLOATS);
  const cos = Math.cos(rest), sin = Math.sin(rest);
  let k = 0;
  for (const triangle of shape) {
    const points = triangle.map(([u, v, w]) => [x + u * sx, y + v * sy, z + w * sz]);
    const [a, b, c] = points;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    for (const [u, v, w] of points) {
      mesh[k++] = (u - px) * cos + (w - pz) * sin;
      mesh[k++] = v;
      mesh[k++] = (w - pz) * cos - (u - px) * sin;
      mesh[k++] = (nx * cos + nz * sin) / length;
      mesh[k++] = ny / length;
      mesh[k++] = (nz * cos - nx * sin) / length;
      mesh[k++] = (color >> 16) / 255;
      mesh[k++] = ((color >> 8) & 255) / 255;
      mesh[k++] = (color & 255) / 255;
    }
  }
  return { mesh, swing, px, pz };
}

function block(x, y, z, sx, sy, sz, color, swing, px, pz, rest) {
  return part(box, x, y, z, sx * square, sy * square, sz, color, swing, px, pz, rest);
}

// Swing groups are left/right leg (+/-1), left/right arm (+/-2), cape (3), coil segments (4/5), and hound tail (6).
// The hood's opening faces +X. Its rolled edge frames a recessed face.
const hoodProfile = [
  [0, .23], [-.116, .191], [-.162, .082], [-.146, -.06],
  [0, -.153], [.146, -.06], [.162, .082], [.116, .191],
];
const hoodBack = hoodProfile.map(([y, z]) => [-.133, y * .68, 1.45 + z * .79]);
const hoodEdge = hoodProfile.map(([y, z]) => [.127 + .27 * z, y, 1.45 + z]);
const hoodWell = hoodProfile.map(([y, z]) => [.105, y * .75, 1.45 + z * .65]);
const hoodShell = [], hoodLining = [], hoodFace = [];
for (let i = 0; i < hoodProfile.length; i++) {
  const j = (i + 1) % hoodProfile.length;
  hoodShell.push([hoodBack[i], hoodBack[j], hoodEdge[j]], [hoodBack[i], hoodEdge[j], hoodEdge[i]]);
  hoodLining.push([hoodEdge[i], hoodEdge[j], hoodWell[j]], [hoodEdge[i], hoodWell[j], hoodWell[i]]);
}
for (let i = 1; i < hoodProfile.length - 1; i++) {
  hoodShell.push([hoodBack[0], hoodBack[i + 1], hoodBack[i]]);
  hoodFace.push([hoodWell[0], hoodWell[i], hoodWell[i + 1]]);
}

const frontPatch = [
  [[0, -1, -1], [0, 1, -1], [0, 1, 1]],
  [[0, -1, -1], [0, 1, 1], [0, -1, 1]],
];
const coat = 0x303934, coatHem = 0x28312e, hoodLiningGreen = 0x46594c;
const faceShadow = 0x232522, amber = 0xf3a55c, satchelLeather = 0x67533b;
const player = [
  part(flare, 0, 0, 1.076, .129, .166, .240, coat),
  part(bevel, -.034, 0, .723, .201, .255, .237, coatHem, 3, -.035, .933, .08),
  part(hoodShell, 0, 0, 0, 1, 1, 1, cloth),
  part(hoodLining, 0, 0, 0, 1, 1, 1, hoodLiningGreen),
  part(hoodFace, 0, 0, 0, 1, 1, 1, faceShadow),
  part(frontPatch, .165, 0, 1.23, 1, .031, .022, bronze),
  block(.007, .228, .831, .105, .063, .09, satchelLeather),
];
for (const side of [-1, 1]) {
  player.push(
    part(frontPatch, .108, side * .048, 1.464, 1, .022, .011, amber),
    part(box, -.005, side * .115, .353, .116, .089, .353, coat, side, 0, .71),
    block(.044, side * .115, .076, .12, .077, .076, leather, side, 0, .71),
    part(bevel, -.014, side * .25, .984, .083, .092, .211, coat, side * 2, 0, 1.19, -.14),
    block(.045, side * .25, .759, .068, .067, .087, leather, side * 2, 0, 1.19),
  );
}
player.push(
  block(.131, -.25, .771, .092, .074, .03, bronze, -2, 0, 1.19),
  part(taper, .155, -.25, .998, .032, .059, .21, bronze, -2, 0, 1.19),
);

// A short two-tone emitter for the ranged stance. It shares the Wayfarer's arm pivot.
const playerTool = [
  ...player.slice(0, -2),
  block(.161, -.25, .783, .163, .066, .052, iron, -2, 0, 1.19),
  block(.303, -.25, .783, .043, .052, .046, bronze, -2, 0, 1.19),
  block(.349, -.25, .783, .012, .033, .032, visor, -2, 0, 1.19),
];

// Ashling: compact cinder body, a glowing crack and two broken crown spikes.
const ashling = [
  part(bevel, 0, 0, .64, .23, .258, .29, ash),
  part(bevel, .085, 0, .986, .211, .216, .208, coal),
  block(.252, 0, .974, .018, .147, .027, ember),
  block(.199, 0, .68, .03, .025, .116, ember),
  part(taper, .01, -.13, 1.227, .081, .071, .14, ash, 0, .01, 1.15, -.37),
  part(taper, .02, .13, 1.2, .081, .079, .098, ash, 0, .02, 1.15, -.31),
];
for (const side of [-1, 1]) {
  ashling.push(
    part(bevel, .056, side * .27, .524, .136, .127, .22, ash, side * 2, .03, .77, -.43),
    block(.10, side * .32, .365, .106, .109, .086, coal, side * 2, .03, .77),
    block(0, side * .133, .237, .11, .097, .173, coal, side, 0, .43),
    block(.071, side * .133, .075, .133, .102, .069, ash, side, 0, .43),
  );
}

// Root Brute: heavy bark shoulders and oversized, knotted forearms.
const rootBrute = [
  part(bevel, 0, 0, 1.035, .32, .403, .48, bark),
  part(bevel, .224, 0, 1.455, .221, .235, .199, darkBark),
  block(.409, 0, 1.468, .027, .143, .024, root),
  block(.261, 0, .977, .074, .05, .252, root),
];
for (const side of [-1, 1]) {
  rootBrute.push(
    part(taper, -.05, side * .363, 1.518, .15, .13, .274, bark, side * 2, -.05, 1.27, -.30),
    part(bevel, .042, side * .465, 1.136, .229, .22, .27, bark, side * 2, .04, 1.27),
    part(bevel, .145, side * .48, .78, .217, .201, .273, darkBark, side * 2, .04, 1.27),
    block(.307, side * .49, .767, .072, .13, .133, root, side * 2, .04, 1.27),
    block(-.045, side * .209, .387, .151, .148, .329, darkBark, side, -.04, .71),
    block(.046, side * .209, .112, .238, .157, .106, bark, side, -.04, .71),
  );
}

// Pallid Crawler: long, floor-hugging back, splayed limbs and a jutting jaw.
const pallidCrawler = [
  part(bevel, -.17, 0, .50, .448, .262, .22, bone),
  part(bevel, .31, 0, .418, .23, .207, .187, bone),
  block(.433, 0, .306, .147, .125, .054, sinew),
];
for (const side of [-1, 1]) {
  pallidCrawler.push(
    block(.483, side * .112, .462, .036, .039, .031, crawlerEye),
    block(.24, side * .254, .328, .101, .165, .098, sinew, side * 2, .14, .48, -.42),
    block(.38, side * .393, .167, .162, .082, .104, bone, side * 2, .14, .48, -.43),
    block(.49, side * .398, .081, .14, .081, .055, bone, side * 2, .14, .48),
    block(-.399, side * .263, .344, .139, .147, .095, sinew, -side, -.34, .45, .40),
    block(-.53, side * .34, .171, .149, .089, .091, bone, -side, -.34, .45, .37),
    block(-.426, side * .355, .071, .151, .084, .052, bone, -side, -.34, .45),
  );
}

// Hollow Marshal: crimson armor, split brass crest, and a long polearm.
const hollowMarshal = [
  part(bevel, 0, 0, 1.179, .26, .354, .435, plate),
  part(flare, -.215, 0, .97, .092, .31, .457, iron, 3, -.21, 1.412, .08),
  part(bevel, .04, 0, 1.737, .234, .243, .247, iron),
  block(.226, 0, 1.737, .047, .147, .057, brass),
  block(.275, 0, 1.745, .006, .105, .017, iron),
  block(.208, 0, 1.254, .053, .143, .096, brass),
  block(.021, 0, .865, .22, .275, .069, iron),
];
for (const side of [-1, 1]) {
  hollowMarshal.push(
    part(taper, .002, side * .132, 2.025, .096, .063, .16, brass, 0, 0, 1.951, -.19),
    block(.004, side * .368, 1.374, .149, .153, .142, plate, side * 2, 0, 1.46),
    block(.032, side * .411, 1.113, .132, .119, .241, iron, side * 2, 0, 1.46),
    block(.034, side * .153, .451, .134, .123, .382, plate, side, 0, .831),
    block(.083, side * .153, .116, .182, .13, .107, iron, side, 0, .831),
  );
}
hollowMarshal.push(
  block(.178, -.432, .903, .034, .037, .661, iron, -2, 0, 1.46, .12),
  part(taper, .241, -.432, 1.578, .074, .142, .221, brass, -2, 0, 1.46, .12),
);

// Ashen Hound: low charcoal body, pointed ears and a rust-colored muzzle.
const houndFur = 0x765244, houndDark = 0x302724, houndEye = 0xc18a63;
const ashenHound = [
  part(bevel, -.072, 0, .449, .395, .204, .173, houndDark, 0, -.072, .449, .09),
  part(bevel, .215, 0, .495, .177, .21, .223, houndFur, 0, .215, .495, -.34),
  part(bevel, .388, 0, .581, .177, .146, .133, houndFur),
  block(.543, 0, .526, .113, .091, .06, houndFur),
  block(.637, 0, .553, .033, .084, .035, houndDark),
  part(taper, -.484, 0, .574, .076, .074, .216, houndFur, 6, -.354, .477, -.95),
];
for (const side of [-1, 1]) {
  ashenHound.push(
    part(taper, .33, side * .097, .719, .068, .061, .122, houndFur, 0, .33, .657, -.38),
    block(.478, side * .113, .609, .028, .014, .021, houndEye),
    block(.235, side * .131, .23, .058, .053, .23, houndDark, side * 2, .237, .45),
    block(.274, side * .131, .037, .092, .064, .037, houndDark, side * 2, .237, .45),
    block(-.293, side * .132, .216, .09, .062, .216, houndDark, -side, -.299, .432),
    block(-.263, side * .132, .035, .087, .059, .035, houndDark, -side, -.299, .432),
  );
}

// Coil Stalker: a raised teal head, mint transverse ribs and two trailing segments.
const coilShell = 0x47716d, coilDark = 0x263a39, coilLight = 0x87c0ad;
const coilStalker = [
  part(bevel, .022, 0, .348, .301, .274, .328, coilDark, 0, .022, .348, .19),
  part(bevel, .142, 0, .519, .123, .293, .041, coilLight, 0, .142, .519, -.15),
  part(bevel, .141, 0, .721, .215, .212, .183, coilShell),
  block(.32, 0, .734, .012, .056, .036, coilLight),
  part(bevel, -.294, 0, .262, .232, .217, .192, coilShell, 4),
  part(bevel, -.375, 0, .263, .054, .223, .197, coilLight, 4),
  part(bevel, -.599, 0, .168, .225, .16, .144, coilDark, 5),
  part(bevel, -.686, 0, .169, .05, .164, .148, coilLight, 5),
];

// Exact renderer kind keys (with "wayfarer" as a caller alias for "player").
const models = { player, wayfarer: player, playerTool, ashling, rootBrute, pallidCrawler, hollowMarshal, ashenHound, coilStalker };
const modelSize = Object.fromEntries(Object.entries(models).map(([kind, parts]) => [
  kind, parts.reduce((size, item) => size + item.mesh.length, 0),
]));
export const MODEL_MAX_VERTICES = Math.max(...Object.values(modelSize)) / MODEL_FLOATS;

export function modelSupported(kind) {
  return Object.hasOwn(models, kind);
}

export function writeCloseViewModel(out, offset, actor) {
  const { kind, x, y, z, yaw, phase, pace, pose, amount } = actor;
  const size = kind === "player" || kind === "wayfarer" || kind === "playerTool" ? .82 : 1;
  if (!modelSupported(kind) || !Number.isSafeInteger(offset) || offset < 0 || offset + modelSize[kind] > out.length) return offset;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(yaw) ||
      !Number.isFinite(phase) || !Number.isFinite(pace) || !Number.isFinite(amount)) return offset;
  const moving = Math.max(0, Math.min(1, pace));
  const progress = Math.max(0, Math.min(1, amount));
  const secondary = actor.reduceMotion ? 0 : 1;
  const playerLike = kind === "player" || kind === "wayfarer" || kind === "playerTool";
  const turnAmount = Number.isFinite(actor.turn) ? Math.max(-1, Math.min(1, actor.turn)) : 0;
  const beat = Math.sin(phase) * moving;
  const heel = Math.cos(phase * 2) * moving;
  const windup = pose === "windup" ? progress : 0;
  // Contact comes early, then the cut carries through before recovering. Damage remains a gameplay event;
  // this curve only makes its already-immediate result read as a committed, weighted blow.
  let strike = 0;
  if (pose === "attack") {
    if (progress < .18) { const t = progress / .18; strike = t * t * (3 - 2 * t); }
    else if (progress < .52) strike = 1;
    else { const t = (progress - .52) / .48; strike = 1 - t * t * (3 - 2 * t); }
  }
  const tool = pose === "tool" ? Math.sin(Math.PI * progress) : 0;
  const cast = pose === "cast" ? Math.sin(Math.PI * progress) : 0;
  const jump = pose === "jump" ? Math.sin(Math.PI * progress) : 0;
  const jumpSettle = pose === "jump" && progress > .72 ? Math.sin((progress - .72) / .28 * Math.PI) : 0;
  const flinch = pose === "hit" ? progress : 0;
  const fall = pose === "death" ? progress : 0;
  const turnLean = turnAmount * .13 * secondary;
  const turn = .21 * strike + .08 * cast + turnLean;
  const cy = Math.cos(yaw + turn), sy = Math.sin(yaw + turn);
  const pitch = -.18 * windup + .29 * strike - .11 * tool - .12 * cast - .12 * jump
    + .09 * jumpSettle - .24 * flinch + 1.52 * fall;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const base = secondary * (.012 * Math.sin(phase * 2) * (1 - moving) + .052 * Math.abs(beat) - .014 * heel)
    * (1 - fall) - .075 * jumpSettle + (kind === "pallidCrawler" ? .61 : .36) * fall;
  const shift = .14 * strike - .06 * tool + .05 * cast - .055 * jump - .08 * flinch;
  const stride = kind === "pallidCrawler" ? .23 : .48;
  const hound = kind === "ashenHound";
  for (const { mesh, swing, px, pz } of models[kind]) {
    const coilSway = swing === 4 || swing === 5
      ? Math.sin(phase - (swing - 4) * .92) * (.028 + .065 * moving) * (1 - fall)
      : 0;
    let angle = 0;
    if (swing === 4 || swing === 5) angle = (.12 + (swing - 4) * .07) * (strike - windup)
      + Math.sign(turnAmount || 1) * .04 * Math.abs(turnAmount) * secondary;
    else if (swing === 6) angle = .19 * beat - .23 * windup + .24 * strike;
    else if (hound && swing) angle = -Math.sign(swing) * beat * .50
      + (Math.abs(swing) === 2 ? .27 * windup - .48 * strike + .28 * jump : -.16 * windup + .24 * strike - .34 * jump);
    else if (swing === 3) angle = -.16 * moving + .11 * beat + .24 * strike - .13 * jump + .08 * turnLean;
    else if (swing === -2) angle = beat * stride + 1.15 * windup - 1.96 * strike - 1.1 * tool
      - (playerLike ? .28 : .08) * cast + .22 * flinch + .58 * jump - .22 * jumpSettle;
    else if (swing === 2) angle = -beat * stride + .35 * windup - .43 * strike
      + (playerLike ? 1.02 : .18) * cast - .18 * flinch + .58 * jump - .22 * jumpSettle;
    else angle = -swing * beat * stride - Math.sign(swing) * .64 * jump + Math.sign(swing) * .28 * jumpSettle;
    const c = Math.cos(angle), s = Math.sin(angle);
    for (let i = 0; i < mesh.length; i += MODEL_FLOATS) {
      const u = mesh[i] * c + mesh[i + 2] * s + px;
      const v = mesh[i + 1] + coilSway;
      const w = mesh[i + 2] * c - mesh[i] * s + pz;
      const f = u * cp + w * sp + shift;
      const nu = mesh[i + 3] * c + mesh[i + 5] * s;
      const nv = mesh[i + 4];
      const nw = mesh[i + 5] * c - mesh[i + 3] * s;
      const nf = nu * cp + nw * sp;
      out[offset++] = x + (f * cy - v * sy) * size;
      out[offset++] = y + (f * sy + v * cy) * size;
      out[offset++] = z + (base + w * cp - u * sp) * size;
      out[offset++] = nf * cy - nv * sy;
      out[offset++] = nf * sy + nv * cy;
      out[offset++] = nw * cp - nu * sp;
      out[offset++] = mesh[i + 6] + (.96 - mesh[i + 6]) * flinch * .6;
      out[offset++] = mesh[i + 7] + (.34 - mesh[i + 7]) * flinch * .6;
      out[offset++] = mesh[i + 8] + (.23 - mesh[i + 8]) * flinch * .6;
    }
  }
  return offset;
}
