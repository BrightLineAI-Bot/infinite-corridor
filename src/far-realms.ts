// The far realms (release 714). Tim, 2026-11-03: "I'm gonna be pushing the world pretty far... at least a 1000... make sure that
// there's still content out in the far reaches... realms where the monsters are all really big... another realm where all of like
// the townspeople and Wanderers are actually monsters... a crystal civilization... a lightning giant civilization... inky black...
// the astral worm's homeland... large mushrooms... over a 1000 squares, straight line distance from 0,0".
//
// Beyond `start` sections of Ember Refuge (straight-line), the world is divided into realm cells `cell` sections across, their
// borders wavered by noise. Each cell rolls one number u in [0, 1) on its own hash; each version of this table gives a realm to a
// further band of u (`bands`), always carved out of what was still `ordinary`, so a cell keeps its realm in every later version.
// Only sections first seen with a version hold a realm (the atlas pins `farVersion`); ground seen before keeps none. Pure.
import { hashSeed } from "./random.ts";

export const FAR_REALMS = {
  version: 1, start: 1000, cell: 40, warp: 9,
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
