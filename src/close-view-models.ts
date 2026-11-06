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

// Swing groups are left/right leg (+/-1), left/right arm (+/-2), and cape (3).
// Wayfarer: wrapped green coat, gold throat clasp, inset visor and a travel blade.
const player = [
  part(bevel, 0, 0, .98, .21, .30, .34, cloth),
  part(flare, -.16, 0, .79, .105, .27, .35, cloth, 3, -.17, 1.16, .12),
  part(bevel, .014, 0, 1.47, .23, .245, .245, cloth),
  block(.199, 0, 1.445, .035, .153, .072, leather),
  block(.237, 0, 1.46, .009, .122, .022, visor),
  block(.183, 0, 1.193, .041, .058, .054, bronze),
  block(.03, 0, .76, .19, .263, .045, leather),
];
for (const side of [-1, 1]) {
  player.push(
    block(0, side * .13, .382, .119, .105, .34, leather, side, 0, .71),
    block(.045, side * .13, .108, .163, .11, .102, leather, side, 0, .71),
    part(bevel, 0, side * .33, .969, .133, .122, .278, cloth, side * 2, 0, 1.19),
    block(.045, side * .35, .711, .103, .094, .109, leather, side * 2, 0, 1.19),
  );
}
player.push(
  block(.131, -.35, .715, .104, .097, .041, bronze, -2, 0, 1.19),
  part(taper, .155, -.35, .967, .037, .076, .22, bronze, -2, 0, 1.19),
);

// A short two-tone emitter for the ranged stance. It shares the Wayfarer's arm pivot.
const playerTool = [
  ...player.slice(0, -2),
  block(.161, -.35, .746, .193, .085, .063, iron, -2, 0, 1.19),
  block(.315, -.35, .746, .057, .067, .056, bronze, -2, 0, 1.19),
  block(.37, -.35, .746, .017, .04, .037, visor, -2, 0, 1.19),
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

// Exact renderer kind keys (with "wayfarer" as a caller alias for "player").
const models = { player, wayfarer: player, playerTool, ashling, rootBrute, pallidCrawler, hollowMarshal };
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
  const beat = Math.sin(phase) * moving;
  const windup = pose === "windup" ? progress : 0;
  const strike = pose === "attack" ? Math.sin(Math.PI * progress) : 0;
  const tool = pose === "tool" ? Math.sin(Math.PI * progress) : 0;
  const flinch = pose === "hit" ? progress : 0;
  const fall = pose === "death" ? progress : 0;
  const turn = .12 * strike;
  const cy = Math.cos(yaw + turn), sy = Math.sin(yaw + turn);
  const pitch = -.15 * windup + .24 * strike - .11 * tool - .24 * flinch + 1.52 * fall;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const base = (.014 * Math.sin(phase * 2) * (1 - moving) + .044 * Math.abs(beat)) * (1 - fall) + (kind === "pallidCrawler" ? .61 : .36) * fall;
  const shift = .10 * strike - .06 * tool - .08 * flinch;
  const stride = kind === "pallidCrawler" ? .23 : .48;
  for (const { mesh, swing, px, pz } of models[kind]) {
    let angle = 0;
    if (swing === 3) angle = -.12 * moving + .08 * beat + .15 * strike;
    else if (swing === -2) angle = beat * stride + 1.15 * windup - 1.72 * strike - 1.1 * tool + .22 * flinch;
    else if (swing === 2) angle = -beat * stride + .35 * windup - .31 * strike - .18 * flinch;
    else angle = -swing * beat * stride;
    const c = Math.cos(angle), s = Math.sin(angle);
    for (let i = 0; i < mesh.length; i += MODEL_FLOATS) {
      const u = mesh[i] * c + mesh[i + 2] * s + px;
      const v = mesh[i + 1];
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
