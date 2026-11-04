// Release 737: the Wayfarer's mount, drawn with the beast's own renderer at its mount scale (MOUNT_BEASTS), under the Wayfarer.
// The pack beasts reuse monster-render's cached sprites (one per mount id); the Stalker is drawn as its cat.
import { MOUNT_BEASTS } from "./beast-mounts.ts";
import { drawPackMonster } from "./monster-render.ts";
import { drawStalker } from "./stalker-render.ts";

// One reused actor per frame (no per-frame allocation beyond it).
const actor = { id: "", kind: "", packKind: "", x: 0, y: 0, scale: 1, facingX: 1, boss: false, hopLift: 0, stalkForm: "cat", stalkAct: { kind: "prowl", t: 0, total: 0 }, pack: null, mountView: true };
// Draws the mount of `m` under the Wayfarer at `p` (raised `liftPx` by a jump). Returns how far up the Wayfarer sits, in pixels.
export function drawMount(ctx, m, p, s, now, liftPx = 0, reduceMotion = false) {
  const B = MOUNT_BEASTS[m?.beast]; if (!B) return 0;
  const moving = (p.walkPhase || 0) % 2, face = p.facing === "left" ? -1 : p.facing === "right" ? 1 : (p.mountFace || 1); p.mountFace = face;
  Object.assign(actor, { id: `mount:${m.id}`, kind: m.beast, packKind: m.beast, x: p.x, y: p.y - liftPx / s, scale: B.scale, facingX: face, hopLift: reduceMotion ? 0 : Math.abs(Math.sin(moving * Math.PI)) * .5 });
  try {
    if (m.beast === "stalker") { actor.scale = 1.4 * B.scale; drawStalker(ctx, actor, s, now, reduceMotion); }
    else drawPackMonster(ctx, actor, s, now, p.facing);
  } catch { /* a renderer that needs fight state it does not have draws nothing; the rider still shows */ }
  return B.seat * s;
}
