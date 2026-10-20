// High-fidelity drawing for the Dungeon Monster Pack: layered gradients, rim light, animated
// limbs and emissive details, plus every pack telegraph and ground effect. Pure canvas calls;
// no images, so it scales cleanly with the device pixel ratio.
import { MONSTER_PACK, isPackKind, BLOB, WORM } from "./monster-pack.js?v=r237-74592043bc57";

const TAU = Math.PI * 2;

function glow(ctx, x, y, r, color, alpha = .55) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color + Math.round(alpha * 255).toString(16).padStart(2, "0"));
  g.addColorStop(1, color + "00");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function shade(ctx, x, y, r, light, dark) {
  const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r * 1.1);
  g.addColorStop(0, light); g.addColorStop(1, dark); return g;
}
function outline(ctx, width, color = "#0b0a0dcc") { ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke(); }
function eye(ctx, x, y, r, color) { glow(ctx, x, y, r * 3.2, color, .5); ctx.fillStyle = "#fffef4"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r * .55, 0, TAU); ctx.fill(); }
function shadowAt(ctx, x, y, rx, ry, alpha = .55) { ctx.fillStyle = `rgba(4,4,6,${alpha})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }

// ---------------------------------------------------------------- creatures

const BODY = {
  lumenWraith(ctx, q) {
    const { k, b, u, t, p, flip } = q, lift = u * (.35 + Math.sin(t * 2.1) * .06), cy = b - lift - u * .45;
    shadowAt(ctx, k, b, u * .32, u * .1, .35);
    for (let i = 0; i < 4; i++) { // trailing light ribbons
      ctx.strokeStyle = p[2] + (i % 2 ? "66" : "aa"); ctx.lineWidth = Math.max(1, u * (.05 - i * .008)); ctx.beginPath();
      const ox = (i - 1.5) * u * .12; ctx.moveTo(k + ox, cy + u * .25);
      ctx.bezierCurveTo(k + ox - flip * u * .25, cy + u * .55, k + ox + flip * u * .2 * Math.sin(t * 3 + i), cy + u * .75, k + ox - flip * u * .35, cy + u * (.95 + i * .05)); ctx.stroke();
    }
    glow(ctx, k, cy, u * .9, p[2], .32);
    ctx.beginPath(); // hooded shroud
    ctx.moveTo(k, cy - u * .5); ctx.bezierCurveTo(k + u * .42, cy - u * .42, k + u * .38, cy + u * .1, k + u * .3 + Math.sin(t * 4) * u * .04, cy + u * .42);
    for (let i = 3; i >= -3; i--) ctx.lineTo(k + i * u * .1, cy + u * (.36 + (i % 2 ? .08 : 0) + Math.sin(t * 5 + i) * .03));
    ctx.bezierCurveTo(k - u * .38, cy + u * .1, k - u * .42, cy - u * .42, k, cy - u * .5); ctx.closePath();
    const g = ctx.createLinearGradient(k, cy - u * .5, k, cy + u * .45); g.addColorStop(0, p[3] + "f0"); g.addColorStop(.45, p[0] + "c8"); g.addColorStop(1, p[1] + "40");
    ctx.fillStyle = g; ctx.fill(); outline(ctx, Math.max(1, u * .025), p[1] + "aa");
    ctx.fillStyle = p[1] + "ee"; ctx.beginPath(); ctx.ellipse(k + flip * u * .03, cy - u * .2, u * .17, u * .2, 0, 0, TAU); ctx.fill(); // hood void
    const pulse = .7 + Math.sin(t * 6) * .3; glow(ctx, k + flip * u * .04, cy - u * .2, u * .32 * pulse, p[2], .9); // lens core
    ctx.fillStyle = p[3]; ctx.beginPath(); ctx.arc(k + flip * u * .04, cy - u * .2, u * .06, 0, TAU); ctx.fill();
    ctx.strokeStyle = p[2] + "cc"; ctx.lineWidth = Math.max(1, u * .02); ctx.beginPath(); ctx.arc(k + flip * u * .04, cy - u * .2, u * .11, t * 2, t * 2 + 4.2); ctx.stroke();
  },
  sunderjaw(ctx, q) {
    const { k, b, u, t, p, flip, e } = q;
    if (e.hidden) { // only the travelling mound shows
      ctx.fillStyle = p[1] + "cc"; ctx.beginPath(); ctx.ellipse(k, b - u * .05, u * .45, u * .16, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 6; i++) { const a = t * 3 + i; ctx.fillStyle = p[0] + "99"; ctx.fillRect(k + Math.cos(a) * u * .4, b - u * .12 - Math.abs(Math.sin(a * 1.7)) * u * .12, Math.max(2, u * .05), Math.max(2, u * .05)); }
      return;
    }
    shadowAt(ctx, k, b, u * .5, u * .14);
    for (let i = 2; i >= 1; i--) { // armoured trailing segments
      const sx = k - flip * u * .36 * i, sy = b - u * .3 + Math.sin(t * 4 + i) * u * .03;
      ctx.beginPath(); ctx.ellipse(sx, sy, u * (.3 - i * .04), u * (.24 - i * .03), 0, 0, TAU); ctx.fillStyle = shade(ctx, sx, sy, u * .3, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1, u * .03));
      ctx.strokeStyle = p[2] + "88"; ctx.lineWidth = Math.max(1, u * .02); ctx.beginPath(); ctx.arc(sx, sy, u * (.22 - i * .03), Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
    const hx = k + flip * u * .1, hy = b - u * .38, open = q.state === "windup" || q.state === "attack" ? .55 + Math.sin(t * 18) * .1 : .25, rear = Math.atan2(0, -flip);
    ctx.beginPath(); ctx.ellipse(hx, hy, u * .46, u * .3, 0, 0, TAU); ctx.fillStyle = shade(ctx, hx, hy, u * .46, p[3], p[1]); ctx.fill(); outline(ctx, Math.max(1.5, u * .04)); // armoured head
    for (let r = 0; r < 4; r++) { const bx = hx - flip * u * (.28 - r * .12); ctx.strokeStyle = r % 2 ? p[1] + "cc" : p[1] + "88"; ctx.lineWidth = Math.max(1.5, u * .035); ctx.beginPath(); ctx.ellipse(bx, hy, u * .07, u * (.28 - Math.abs(r - 1.5) * .03), 0, Math.PI * .5, Math.PI * 1.5, flip < 0); ctx.stroke(); } // plating bands
    for (let i = 0; i < 4; i++) { const sx = hx - flip * u * (.32 - i * .14), sy = hy - u * .27; ctx.fillStyle = p[1]; ctx.beginPath(); ctx.moveTo(sx - u * .04, sy + u * .03); ctx.lineTo(sx - flip * u * .05, sy - u * .1); ctx.lineTo(sx + u * .04, sy + u * .03); ctx.fill(); } // dorsal spines
    const mx = hx + flip * u * .4, mr = u * (.13 * open + .06); // forward ring maw at the snout
    ctx.fillStyle = p[1]; ctx.beginPath(); ctx.ellipse(mx, hy + u * .02, mr * .7 + u * .04, mr + u * .05, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#1a0d0a"; ctx.beginPath(); ctx.ellipse(mx, hy + u * .02, mr * .6, mr, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + t * .6; ctx.fillStyle = p[3]; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * mr * .6, hy + u * .02 + Math.sin(a) * mr); ctx.lineTo(mx + Math.cos(a + .2) * mr * .25, hy + u * .02 + Math.sin(a + .2) * mr * .45); ctx.lineTo(mx + Math.cos(a + .4) * mr * .6, hy + u * .02 + Math.sin(a + .4) * mr); ctx.fill(); } // inward teeth
    glow(ctx, mx, hy, u * .22, p[2], .3);
    for (const dy of [-.1, .02]) { ctx.fillStyle = p[2]; ctx.fillRect(hx + flip * u * .16 - u * .05, hy + dy * u, u * .1, Math.max(1.5, u * .025)); } // heat-sense slits
    void rear;
  },
  graveLantern(ctx, q) {
    const { k, b, u, t, p } = q, sway = Math.sin(t * 1.8) * .12, top = b - u * (1.05 + Math.sin(t * 2.2) * .05);
    shadowAt(ctx, k, b, u * .22, u * .07, .3);
    ctx.strokeStyle = p[2] + "55"; ctx.lineWidth = Math.max(1, u * .025); ctx.setLineDash([u * .06, u * .05]); ctx.beginPath(); ctx.moveTo(k, top - u * .35); ctx.lineTo(k + sway * u, top); ctx.stroke(); ctx.setLineDash([]); // ghost chain
    const lx = k + sway * u, ly = top + u * .32;
    glow(ctx, lx, ly, u * .85, p[2], .38);
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(sway * .6);
    ctx.fillStyle = p[1]; ctx.beginPath(); ctx.moveTo(-u * .12, -u * .34); ctx.lineTo(u * .12, -u * .34); ctx.lineTo(u * .2, -u * .22); ctx.lineTo(-u * .2, -u * .22); ctx.fill(); // cap
    ctx.beginPath(); ctx.moveTo(-u * .2, -u * .22); ctx.lineTo(u * .2, -u * .22); ctx.lineTo(u * .24, u * .2); ctx.lineTo(-u * .24, u * .2); ctx.closePath();
    const glass = ctx.createLinearGradient(0, -u * .22, 0, u * .2); glass.addColorStop(0, p[3] + "aa"); glass.addColorStop(.5, p[2] + "dd"); glass.addColorStop(1, p[2] + "55"); ctx.fillStyle = glass; ctx.fill(); outline(ctx, Math.max(1.5, u * .035), p[1]);
    for (const x of [-.12, 0, .12]) { ctx.strokeStyle = p[0]; ctx.lineWidth = Math.max(1, u * .025); ctx.beginPath(); ctx.moveTo(x * u, -u * .22); ctx.lineTo(x * u * 1.2, u * .2); ctx.stroke(); } // cage bars
    const flame = .8 + Math.sin(t * 9) * .2; ctx.fillStyle = p[3]; ctx.beginPath(); ctx.moveTo(0, -u * .12 * flame); ctx.quadraticCurveTo(u * .09, u * .04, 0, u * .1); ctx.quadraticCurveTo(-u * .09, u * .04, 0, -u * .12 * flame); ctx.fill();
    ctx.fillStyle = "#0e140c"; ctx.beginPath(); ctx.arc(-u * .04, 0, u * .018, 0, TAU); ctx.arc(u * .04, 0, u * .018, 0, TAU); ctx.fill(); // face in the flame
    ctx.fillStyle = p[1]; ctx.fillRect(-u * .22, u * .2, u * .44, u * .06);
    for (const x of [-.18, .18]) { ctx.strokeStyle = p[0] + "cc"; ctx.lineWidth = Math.max(1, u * .015); ctx.beginPath(); ctx.moveTo(x * u, u * .26); ctx.lineTo(x * u + Math.sin(t * 3 + x * 9) * u * .05, u * .5); ctx.stroke(); glow(ctx, x * u + Math.sin(t * 3 + x * 9) * u * .05, u * .52, u * .07, p[2], .8); } // censers
    ctx.restore();
    const curse = q.e.pack?.stillT || 0; if (curse > .3) { ctx.strokeStyle = p[2] + "cc"; ctx.lineWidth = Math.max(1, u * .03); ctx.beginPath(); ctx.arc(lx, ly, u * .5, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, curse / 1.25)); ctx.stroke(); }
  },
  riftLynx(ctx, q) {
    const { k, b, u, t, p, flip, e } = q, run = (e.ai?.step || 0) * Math.PI;
    shadowAt(ctx, k, b, u * .38, u * .1);
    for (let i = 1; i <= 2; i++) { ctx.globalAlpha = .18 / i; drawLynxBody(ctx, k - flip * u * .18 * i, b, u, t, p, flip, run); } // afterimages
    ctx.globalAlpha = 1; drawLynxBody(ctx, k, b, u, t, p, flip, run);
  },
  siegeBeetle(ctx, q) {
    const { k, b, u, t, p, flip, state } = q, step = t * 7;
    shadowAt(ctx, k, b, u * .55, u * .15);
    for (let i = 0; i < 3; i++) for (const side of [-1, 1]) { // six legs
      const lx = k + (i - 1) * u * .26, ly = b - u * .18, phase = Math.sin(step + i * 2 + (side > 0 ? Math.PI : 0)) * u * .05;
      ctx.strokeStyle = p[1]; ctx.lineWidth = Math.max(2, u * .06); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(lx, ly - u * .08); ctx.lineTo(lx + side * u * .05 + phase, ly + u * .08 * side + u * .05); ctx.stroke();
    }
    const bx = k, by = b - u * .38;
    ctx.beginPath(); ctx.ellipse(bx, by, u * .52, u * .34, 0, 0, TAU); ctx.fillStyle = shade(ctx, bx, by, u * .52, p[3], p[1]); ctx.fill(); outline(ctx, Math.max(1.5, u * .04));
    ctx.strokeStyle = p[1]; ctx.lineWidth = Math.max(1, u * .03); ctx.beginPath(); ctx.moveTo(bx, by - u * .34); ctx.lineTo(bx, by + u * .34); ctx.stroke(); // elytra seam
    for (const side of [-1, 1]) for (let r = 0; r < 3; r++) { ctx.fillStyle = p[2] + "44"; ctx.beginPath(); ctx.arc(bx + side * u * (.18 + r * .1), by - u * .06 + r * u * .08, u * .035, 0, TAU); ctx.fill(); } // rivets
    const recoil = state === "attack" ? Math.sin(t * 20) * u * .03 : 0, tx = bx - flip * u * .05, ty = by - u * .28; // mortar tube
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(-flip * .5);
    ctx.fillStyle = shade(ctx, 0, -u * .1, u * .2, "#7a7068", "#201c19"); ctx.fillRect(-u * .1, -u * .38 + recoil, u * .2, u * .38); ctx.strokeStyle = "#0b0a0d"; ctx.lineWidth = Math.max(1, u * .03); ctx.strokeRect(-u * .1, -u * .38 + recoil, u * .2, u * .38);
    ctx.fillStyle = "#14100d"; ctx.beginPath(); ctx.ellipse(0, -u * .38 + recoil, u * .1, u * .04, 0, 0, TAU); ctx.fill();
    if (state !== "idle") glow(ctx, 0, -u * .4, u * .25, p[2], .6);
    ctx.restore();
    for (const side of [-1, 1]) glow(ctx, bx + side * u * .32, by + u * .12, u * .1, p[2], .7); // vents
    const hx = bx + flip * u * .48, hy = by + u * .05; ctx.beginPath(); ctx.ellipse(hx, hy, u * .18, u * .15, 0, 0, TAU); ctx.fillStyle = shade(ctx, hx, hy, u * .18, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1, u * .03));
    eye(ctx, hx + flip * u * .07, hy - u * .03, u * .03, p[2]);
    for (const side of [-1, 1]) { ctx.strokeStyle = p[3]; ctx.lineWidth = Math.max(1, u * .03); ctx.beginPath(); ctx.moveTo(hx + flip * u * .14, hy + side * u * .05); ctx.quadraticCurveTo(hx + flip * u * .28, hy + side * u * .12, hx + flip * u * .22, hy + side * u * .02); ctx.stroke(); } // mandibles
  },
  veilSpinner(ctx, q) {
    const { k, b, u, t, p, flip, e } = q, step = t * 9, lift = e.hopLift ? e.hopLift * u : 0, cy = b - u * .42 - lift;
    shadowAt(ctx, k, b, u * .45 * (1 - lift / (u * 2)), u * .12);
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) for (const side of [-1, 1]) { // eight jointed legs
      const a0 = (i - 1.5) * .45, phase = Math.sin(step + i * 1.6 + (side > 0 ? 1.6 : 0)) * .18, kx = k + side * u * (.32 + i * .03), ky = cy - u * (.28 - i * .1) + phase * u * .3;
      ctx.strokeStyle = p[1]; ctx.lineWidth = Math.max(2, u * .05); ctx.beginPath(); ctx.moveTo(k + side * u * .08, cy + a0 * u * .1); ctx.lineTo(kx, ky); ctx.lineTo(kx + side * u * .18, b - lift * .3 - (i % 2) * u * .02); ctx.stroke();
      ctx.strokeStyle = p[3] + "55"; ctx.lineWidth = Math.max(1, u * .015); ctx.beginPath(); ctx.moveTo(kx - side * u * .02, ky); ctx.lineTo(kx + side * u * .12, ky + u * .08); ctx.stroke();
    }
    const ax = k - flip * u * .2, ay = cy + u * .02; ctx.beginPath(); ctx.ellipse(ax, ay, u * .3, u * .25, 0, 0, TAU); ctx.fillStyle = shade(ctx, ax, ay, u * .3, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1, u * .03)); // abdomen
    ctx.fillStyle = p[3] + "cc"; ctx.beginPath(); ctx.moveTo(ax, ay - u * .16); ctx.lineTo(ax + u * .06, ay); ctx.lineTo(ax, ay + u * .14); ctx.lineTo(ax - u * .06, ay); ctx.fill(); // hourglass mark
    ctx.fillStyle = p[4] || p[3]; ctx.fillRect(ax - u * .02, ay - u * .04, u * .04, u * .08);
    const hx = k + flip * u * .12, hy = cy - u * .02; ctx.beginPath(); ctx.ellipse(hx, hy, u * .17, u * .15, 0, 0, TAU); ctx.fillStyle = shade(ctx, hx, hy, u * .17, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1, u * .03));
    for (let i = 0; i < 6; i++) { const ex = hx + flip * u * .05 + ((i % 3) - 1) * u * .045, ey = hy - u * .05 + Math.floor(i / 3) * u * .04; ctx.fillStyle = p[3] === undefined ? "#ff6b8a" : (q.p[3]); ctx.fillStyle = "#ff6b8a"; ctx.beginPath(); ctx.arc(ex, ey, u * (i < 3 ? .022 : .014), 0, TAU); ctx.fill(); }
    glow(ctx, hx + flip * u * .05, hy - u * .03, u * .12, "#ff6b8a", .35);
  },
  strataEel(ctx, q) {
    const { k, b, u, t, p, flip, e } = q, n = 5, cy = b - u * .3;
    if (!e.phasing) shadowAt(ctx, k, b, u * .5, u * .1, .4);
    const pts = []; for (let i = 0; i < n; i++) pts.push({ x: k - flip * u * .26 * i, y: cy + Math.sin(t * 6 - i * .9) * u * .09 });
    for (let i = n - 1; i >= 0; i--) {
      const q2 = pts[i], r = u * (.24 - i * .025);
      ctx.beginPath(); ctx.ellipse(q2.x, q2.y, r * 1.15, r, 0, 0, TAU); ctx.fillStyle = shade(ctx, q2.x, q2.y, r, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1, u * .025));
      glow(ctx, q2.x, q2.y + r * .5, r * .55, p[2], .55); // photophores
      if (i < n - 1) { ctx.strokeStyle = p[2] + "77"; ctx.lineWidth = Math.max(1, u * .02); ctx.beginPath(); ctx.moveTo(q2.x, q2.y - r); ctx.lineTo(q2.x - flip * r * .5, q2.y - r * 1.5); ctx.stroke(); } // dorsal fin rays
    }
    const h = pts[0]; ctx.beginPath(); ctx.moveTo(h.x + flip * u * .42, h.y); ctx.quadraticCurveTo(h.x + flip * u * .2, h.y - u * .26, h.x - flip * u * .05, h.y - u * .18); ctx.lineTo(h.x - flip * u * .05, h.y + u * .18); ctx.quadraticCurveTo(h.x + flip * u * .2, h.y + u * .24, h.x + flip * u * .42, h.y); ctx.closePath();
    ctx.fillStyle = shade(ctx, h.x + flip * u * .1, h.y, u * .3, p[3], p[0]); ctx.fill(); outline(ctx, Math.max(1.5, u * .03));
    ctx.strokeStyle = "#08201f"; ctx.lineWidth = Math.max(1, u * .025); ctx.beginPath(); ctx.moveTo(h.x + flip * u * .42, h.y); ctx.lineTo(h.x + flip * u * .12, h.y + u * .04); ctx.stroke(); // jawline
    eye(ctx, h.x + flip * u * .2, h.y - u * .07, u * .035, p[2]);
  },
  // The Listener (release 138): a cloaked figure shaped like the Wayfarer, its face a violet void; hidden it fades.
  listener(ctx, q) {
    const { k, b, u, t, p, flip, state, e } = q, sway = Math.sin(t * 3) * u * .03, walled = e.listenerPhase === "walled";
    if (e.untargetable) ctx.globalAlpha *= .25;
    glow(ctx, k, b - u * .55, u * .9, p[2], .22 + .08 * Math.sin(t * 5));
    shadowAt(ctx, k, b, u * .38, u * .1);
    ctx.beginPath(); ctx.moveTo(k - u * (walled ? .42 : .3), b - u * .02); ctx.lineTo(k - u * .2, b - u * .85 + sway); ctx.lineTo(k + u * .2, b - u * .85 + sway); ctx.lineTo(k + u * (walled ? .42 : .3), b - u * .02); ctx.closePath();
    ctx.fillStyle = shade(ctx, k, b - u * .45, u * .45, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1.5, u * .035));
    ctx.beginPath(); ctx.arc(k, b - u * .95 + sway, u * .19, 0, TAU); ctx.fillStyle = p[1]; ctx.fill(); outline(ctx, Math.max(1, u * .03), p[2] + "aa");
    ctx.fillStyle = p[2]; ctx.beginPath(); ctx.ellipse(k + flip * u * .03, b - u * .94 + sway, u * .1, u * .06, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = p[3]; ctx.lineWidth = Math.max(2, u * .05); ctx.beginPath(); ctx.moveTo(k + flip * u * .22, b - u * .55); ctx.lineTo(k + flip * u * (state === "windup" ? .2 : .55), b - u * (state === "windup" ? 1.15 : .7)); ctx.stroke();
    if (walled) { ctx.strokeStyle = "#0d0b14"; ctx.lineWidth = Math.max(1, u * .03); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(k - u * .3, b - u * (.15 + i * .18)); ctx.lineTo(k + u * .3, b - u * (.15 + i * .18)); ctx.stroke(); } }
  },
  // The Questing Beast (release 116): a hunched, horned, winged brute. Spines are pale when fresh, black when it is
  // enraged (below half health); a spent volley leaves its back bare for a moment.
  // Release 187 (Tim): a lean, muscular hunter drawn with its own detailed recipe rather than the pack's ellipses. Side
  // view in body units (x forward, y up from the ground): deep chest, tucked waist, heavy haunches, long jointed legs
  // with a stride, an angular horned skull, folded membrane wings, a spined back and tail, and a furnace core that
  // flares while it winds up or fires. Enraged, its veins burn.
  questingBeast(ctx, q) {
    const { k, b, u, t, p, flip, state, e } = q, enraged = e.hp <= e.maxHp * .5, rear = state === "windup", attacking = state === "attack";
    const vel = e.pack?.vel, moving = !vel || Math.hypot(vel.x, vel.y) > .15, casting = e.pack?.attack === "qbSpiral" || e.pack?.attack === "qbBarrage";
    const crouch = rear ? .07 : 0, step = t * (enraged ? 9 : 7), stride = moving ? .42 : .08;
    const X = (x) => k + flip * x * u, Y = (y) => b - (y - crouch * (y > .3 ? 1 : 0)) * u, P = (x, y) => [X(x), Y(y)];
    const hide = p[0], dark = p[1], ember = p[2], bone = p[3], lw = Math.max(1, u * .018);
    const smooth = (pts, widths, fill, line) => { // a limb as round-capped strokes: one dark pass for the outline, one in the fill
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const pass of [0, 1]) for (let i = 0; i < pts.length - 1; i++) { ctx.beginPath(); ctx.moveTo(...pts[i]); ctx.lineTo(...pts[i + 1]); ctx.lineWidth = (widths[i] + widths[i + 1]) / 2 * u + (pass ? 0 : line * 2); ctx.strokeStyle = pass ? fill : "#0b0a0dcc"; ctx.stroke(); }
      ctx.lineCap = "butt"; ctx.lineJoin = "miter";
    };
    const muscle = (a, c, rx, ry, fill, near) => { const mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2, ang = Math.atan2(c[1] - a[1], c[0] - a[0]), len = Math.hypot(c[0] - a[0], c[1] - a[1]) / 2 + rx * u * .3; ctx.beginPath(); ctx.ellipse(mx, my, len, ry * u, ang, 0, TAU); ctx.fillStyle = fill; ctx.fill(); if (near) { ctx.beginPath(); ctx.ellipse(mx - flip * u * .02, my - u * .02, len * .7, ry * u * .45, ang, Math.PI * .9, Math.PI * 1.9); ctx.strokeStyle = "#ffffff18"; ctx.lineWidth = Math.max(1, u * .025); ctx.stroke(); } };
    const claws = (paw) => { ctx.fillStyle = "#0a090c"; for (let c = 0; c < 3; c++) { const x = paw[0] + flip * (c - .5) * u * .03, y = paw[1]; ctx.beginPath(); ctx.moveTo(x, y - u * .03); ctx.quadraticCurveTo(x + flip * u * .06, y - u * .02, x + flip * u * .075, y + u * .02); ctx.lineTo(x + flip * u * .015, y); ctx.closePath(); ctx.fill(); } };
    const leg = (hipX, hipY, phase, fore, near) => { // jointed leg: muscled upper part, lean shin, digitigrade foot
      const sw = Math.sin(step + phase) * stride, lift = Math.max(0, Math.cos(step + phase)) * stride * .18, up = fore && rear ? .16 : 0;
      const hip = P(hipX, hipY), a1 = (fore ? .12 : -.4) + sw, a2 = (fore ? -.08 : .6) + sw * .5;
      const j1 = [hip[0] + flip * Math.sin(a1) * u * (fore ? .34 : .32), hip[1] + Math.cos(a1) * u * (fore ? .34 : .32) - up * u];
      const j2 = [j1[0] + flip * Math.sin(a2) * u * (fore ? .32 : .3), j1[1] + Math.cos(a2) * u * (fore ? .32 : .3) - lift * u];
      const paw = [j2[0] + flip * u * (fore ? .06 : .02), Math.min(b - u * .01, j2[1] + u * (fore ? .12 : .2))];
      const base = near ? hide : dark, low = near ? "#26232b" : "#100e13";
      smooth([hip, j1, j2, paw], fore ? [.14, .1, .07, .06] : [.16, .1, .07, .06], low, lw);
      muscle(hip, j1, fore ? .14 : .2, fore ? .085 : .12, near ? grad(ctx, hip[0], hip[1] - u * .1, j1[0], j1[1], [[0, hide], [.55, hide], [1, low]]) : base, near);
      if (near) { ctx.strokeStyle = "#ffffff22"; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(hip[0] - flip * u * .06, hip[1] - u * .02); ctx.quadraticCurveTo((hip[0] + j1[0]) / 2 + flip * u * .06, (hip[1] + j1[1]) / 2, j1[0] + flip * u * .02, j1[1]); ctx.stroke(); ctx.strokeStyle = "#0b0a0d66"; ctx.beginPath(); ctx.moveTo(j1[0], j1[1]); ctx.lineTo(j2[0] + flip * u * .02, j2[1]); ctx.stroke(); if (enraged) { ctx.strokeStyle = ember + "bb"; ctx.beginPath(); ctx.moveTo(hip[0], hip[1] + u * .05); ctx.quadraticCurveTo((hip[0] + j1[0]) / 2 - flip * u * .03, (hip[1] + j1[1]) / 2, j1[0], j1[1]); ctx.lineTo(j2[0], j2[1]); ctx.stroke(); } }
      claws(paw);
    };
    const grad = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); for (const [o, col] of stops) g.addColorStop(o, col); return g; };
    // aura and shadow
    glow(ctx, X(.1), Y(.8), u * (enraged ? 1.35 : 1.05), ember, (enraged ? .22 : .1) + .05 * Math.sin(t * 9));
    shadowAt(ctx, k, b, u * .9, u * .14);
    // far-side legs, darker
    leg(.36, .83, Math.PI, true, false); leg(-.42, .86, 0, false, false);
    // tail: long, sinuous, continuously tapering, ending in a bone blade
    { const pts = []; for (let i = 0; i <= 10; i++) { const f = i / 10, sway = Math.sin(step * .5 - f * 2.6) * .14 * f; pts.push(P(-.6 - f * .9, .82 + f * .22 - f * f * .5 + sway)); }
      const w = (i) => (.12 - i * .009) * u; ctx.lineCap = "round";
      for (const pass of [0, 1]) for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(...pts[i]); ctx.lineTo(...pts[i + 1]); ctx.lineWidth = Math.max(1.5, w(i) + (pass ? 0 : lw * 2)); ctx.strokeStyle = pass ? (i < 4 ? hide : dark) : "#0b0a0dcc"; ctx.stroke(); }
      for (let i = 2; i < 9; i += 2) { const q = pts[i]; ctx.beginPath(); ctx.moveTo(q[0] - flip * u * .02, q[1] - w(i) / 2); ctx.lineTo(q[0] - flip * u * .07, q[1] - w(i) / 2 - u * .07); ctx.lineTo(q[0] + flip * u * .02, q[1] - w(i) / 2); ctx.closePath(); ctx.fillStyle = dark; ctx.fill(); }
      const tip = pts[10], prev = pts[9], ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
      ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0, -u * .05); ctx.quadraticCurveTo(u * .14, -u * .08, u * .24, 0); ctx.quadraticCurveTo(u * .14, u * .03, 0, u * .04); ctx.closePath(); ctx.fillStyle = grad(ctx, 0, 0, u * .24, 0, [[0, "#3a3540"], [1, enraged ? ember : bone]]); ctx.fill(); outline(ctx, lw); ctx.restore(); ctx.lineCap = "butt"; }
    // far wing, folded
    const wingLift = rear ? .38 : Math.sin(step * .35) * .04;
    const wing = (dx, near) => { // folded bat wing: arm and finger bones over a scalloped membrane
      const spread = Math.max(0, wingLift - .05), root = P(.18 + dx, 1.0), elbow = P(-.06 + dx, 1.22 + wingLift), wrist = P(-.42 + dx - spread * .5, 1.18 + wingLift * 1.3), fingers = [P(-.6 + dx - spread * 1.1, 1.06 + wingLift * .9), P(-.46 + dx - spread * .9, .98 + spread * .3), P(-.24 + dx - spread * .3, .97)];
      ctx.beginPath(); ctx.moveTo(...root); ctx.lineTo(...elbow); ctx.lineTo(...wrist); ctx.lineTo(...fingers[0]);
      let last = fingers[0]; for (const f of [...fingers.slice(1), root]) { const mx = (last[0] + f[0]) / 2, my = (last[1] + f[1]) / 2 - u * .06; ctx.quadraticCurveTo(mx, my, ...f); last = f; } ctx.closePath();
      ctx.fillStyle = near ? grad(ctx, elbow[0], elbow[1], fingers[1][0], fingers[1][1], [[0, "#4a4352b0"], [1, ember + "40"]]) : "#14111880"; ctx.fill(); outline(ctx, lw);
      ctx.lineCap = "round"; ctx.strokeStyle = near ? "#2a2630" : "#151217"; ctx.lineWidth = Math.max(1.5, u * .035); ctx.beginPath(); ctx.moveTo(...root); ctx.lineTo(...elbow); ctx.lineTo(...wrist); ctx.stroke();
      ctx.lineWidth = Math.max(1, u * .018); for (const f of fingers) { ctx.beginPath(); ctx.moveTo(...wrist); ctx.lineTo(...f); ctx.stroke(); }
      ctx.fillStyle = bone; ctx.beginPath(); ctx.moveTo(wrist[0], wrist[1]); ctx.lineTo(wrist[0] - flip * u * .02, wrist[1] - u * .09); ctx.lineTo(wrist[0] + flip * u * .03, wrist[1] - u * .01); ctx.fill(); ctx.lineCap = "butt"; };
    wing(.06, false);
    // body: deep chest, tucked waist, heavy haunch
    const body = () => { ctx.beginPath(); ctx.moveTo(...P(-.64, .74)); ctx.bezierCurveTo(X(-.66), Y(.98), X(-.46), Y(1.04), X(-.3), Y(.96)); ctx.bezierCurveTo(X(-.12), Y(.88), X(.06), Y(.9), X(.24), Y(1.0)); ctx.bezierCurveTo(X(.36), Y(1.07), X(.5), Y(1.04), X(.58), Y(.96)); ctx.bezierCurveTo(X(.68), Y(.86), X(.66), Y(.66), X(.5), Y(.56)); ctx.bezierCurveTo(X(.36), Y(.48), X(.2), Y(.56), X(.04), Y(.66)); ctx.bezierCurveTo(X(-.12), Y(.72), X(-.24), Y(.6), X(-.42), Y(.6)); ctx.bezierCurveTo(X(-.58), Y(.6), X(-.64), Y(.66), X(-.64), Y(.74)); ctx.closePath(); };
    body(); ctx.fillStyle = grad(ctx, X(0), Y(1.06), X(0), Y(.5), [[0, hide], [.45, hide], [1, dark]]); ctx.fill(); outline(ctx, Math.max(1.5, u * .025));
    ctx.save(); body(); ctx.clip();
    ctx.strokeStyle = "#ffffff26"; ctx.lineWidth = Math.max(1, u * .03); ctx.beginPath(); ctx.moveTo(X(-.62), Y(.92)); ctx.bezierCurveTo(X(-.4), Y(1.04), X(-.1), Y(.86), X(.26), Y(1.0)); ctx.bezierCurveTo(X(.4), Y(1.05), X(.52), Y(1.02), X(.6), Y(.94)); ctx.stroke(); // rim light along the back
    ctx.strokeStyle = "#0a090c55"; ctx.lineWidth = Math.max(1, u * .02);
    ctx.beginPath(); ctx.arc(X(.36), Y(.8), u * .2, Math.PI * .55, Math.PI * 1.35); ctx.stroke(); // shoulder mass
    ctx.beginPath(); ctx.arc(X(-.42), Y(.8), u * .22, -Math.PI * .4, Math.PI * .45); ctx.stroke(); // haunch mass
    for (let i = 0; i < 4; i++) { const x = .06 + i * .08; ctx.beginPath(); ctx.moveTo(X(x), Y(.84)); ctx.quadraticCurveTo(X(x - .05), Y(.7), X(x - .02), Y(.6)); ctx.stroke(); } // ribs over a lean flank
    ctx.strokeStyle = "#ffffff14"; ctx.beginPath(); ctx.arc(X(.36), Y(.82), u * .14, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); ctx.beginPath(); ctx.arc(X(-.42), Y(.84), u * .15, Math.PI * 1.15, Math.PI * 1.7); ctx.stroke();
    if (enraged) { ctx.strokeStyle = ember + "99"; ctx.lineWidth = Math.max(1, u * .015); for (const [x0, y0, x1, y1] of [[-.5, .78, -.2, .68], [.2, .66, .45, .78], [-.1, .8, .15, .74]]) { ctx.beginPath(); ctx.moveTo(X(x0), Y(y0)); ctx.quadraticCurveTo(X((x0 + x1) / 2), Y((y0 + y1) / 2 + .05), X(x1), Y(y1)); ctx.stroke(); } }
    ctx.restore();
    // furnace core in the chest
    { const hot = rear || casting, beat = .5 + .5 * Math.sin(t * (hot ? 22 : 6)), cx = X(.46), cy = Y(.72);
      glow(ctx, cx, cy, u * (hot ? .5 : .24), ember, hot ? .8 : .45);
      ctx.strokeStyle = ember + "dd"; ctx.lineWidth = Math.max(1, u * .015); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + Math.cos(a + .4) * u * .08, cy + Math.sin(a + .4) * u * .06, cx + Math.cos(a) * u * .15, cy + Math.sin(a) * u * .1); ctx.stroke(); }
      ctx.fillStyle = hot ? "#fff6e0" : "#ffb59a"; ctx.beginPath(); ctx.arc(cx, cy, u * (.035 + beat * (hot ? .04 : .015)), 0, TAU); ctx.fill(); }
    // spines down the back, longest over the shoulders
    for (let i = 0; i < 15; i++) { const f = i / 14, x = .44 - f * 1.0, y = f < .7 ? 1.0 - Math.sin(f * 4.2) * .06 + (f > .55 ? .02 : 0) : .96, h = (.22 - Math.abs(f - .25) * .18) * (i % 2 ? .75 : 1), base = P(x, y);
      ctx.beginPath(); ctx.moveTo(base[0] - flip * u * .03, base[1]); ctx.quadraticCurveTo(X(x - .05), Y(y + h * .6), X(x - .09), Y(y + h)); ctx.lineTo(base[0] + flip * u * .035, base[1]); ctx.closePath(); ctx.fillStyle = grad(ctx, base[0], base[1], X(x - .09), Y(y + h), [[0, dark], [.7, enraged ? dark : "#3a3540"], [1, enraged ? ember : bone]]); ctx.fill(); outline(ctx, Math.max(.8, u * .012)); }
    // near-side legs
    leg(-.4, .82, Math.PI, false, true); leg(.38, .8, 0, true, true);
    // neck and head: long neck, angular skull, horns, jaw that opens to show the fire
    const headDrop = rear ? -.08 : attacking ? -.04 : Math.sin(step * .5) * .015, jaw = rear || attacking ? .07 : .015;
    const hx = (x) => X(x), hy = (y) => Y(y + headDrop);
    ctx.beginPath(); ctx.moveTo(X(.44), Y(1.0)); ctx.bezierCurveTo(X(.58), Y(1.12), hx(.7), hy(1.16), hx(.8), hy(1.12)); ctx.lineTo(hx(.84), hy(.96)); ctx.bezierCurveTo(X(.72), Y(.86), X(.64), Y(.74), X(.58), Y(.68)); ctx.closePath(); ctx.fillStyle = grad(ctx, X(.5), Y(1.1), X(.6), Y(.7), [[0, hide], [1, dark]]); ctx.fill(); outline(ctx, lw);
    ctx.strokeStyle = "#0a090c66"; ctx.lineWidth = lw; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(X(.6 + i * .06), Y(1.06 - i * .01)); ctx.lineTo(X(.64 + i * .06), Y(.84 - i * .02)); ctx.stroke(); }
    // lower jaw
    ctx.beginPath(); ctx.moveTo(hx(.8), hy(1.0)); ctx.lineTo(hx(1.08), hy(.97 - jaw)); ctx.lineTo(hx(1.02), hy(.92 - jaw)); ctx.lineTo(hx(.82), hy(.92)); ctx.closePath(); ctx.fillStyle = dark; ctx.fill(); outline(ctx, lw);
    if (jaw > .03) glow(ctx, hx(.98), hy(.98 - jaw / 2), u * .12, ember, .8);
    // skull: wedge from the brow to a narrow muzzle
    ctx.beginPath(); ctx.moveTo(hx(.74), hy(1.2)); ctx.lineTo(hx(.92), hy(1.24)); ctx.bezierCurveTo(hx(1.02), hy(1.2), hx(1.12), hy(1.1), hx(1.16), hy(1.03)); ctx.lineTo(hx(1.1), hy(1.0)); ctx.lineTo(hx(.82), hy(1.0)); ctx.bezierCurveTo(hx(.74), hy(1.04), hx(.7), hy(1.12), hx(.74), hy(1.2)); ctx.closePath();
    ctx.fillStyle = grad(ctx, hx(.8), hy(1.24), hx(.9), hy(.98), [[0, hide], [.6, hide], [1, dark]]); ctx.fill(); outline(ctx, Math.max(1.2, u * .022));
    ctx.strokeStyle = "#ffffff22"; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(hx(.78), hy(1.2)); ctx.lineTo(hx(1.1), hy(1.07)); ctx.stroke(); // muzzle ridge highlight
    ctx.fillStyle = bone; for (let i = 0; i < 5; i++) { const x = .86 + i * .05; ctx.beginPath(); ctx.moveTo(hx(x), hy(1.0)); ctx.lineTo(hx(x + .015), hy(.955)); ctx.lineTo(hx(x + .03), hy(1.0)); ctx.fill(); }
    // brow ridge and slit eye
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(hx(.84), hy(1.17)); ctx.lineTo(hx(.98), hy(1.16)); ctx.lineTo(hx(.92), hy(1.12)); ctx.closePath(); ctx.fill();
    glow(ctx, hx(.92), hy(1.12), u * .1, ember, .7); ctx.fillStyle = "#fff1d8"; ctx.beginPath(); ctx.ellipse(hx(.92), hy(1.12), u * .03, u * .012, 0, 0, TAU); ctx.fill(); ctx.fillStyle = ember; ctx.fillRect(hx(.92) - u * .004, hy(1.12) - u * .012, u * .008, u * .024);
    // horns: thick at the brow, swept back over the skull, ridged, tips turning up
    for (const near of [false, true]) { const o = near ? 0 : .05, by0 = near ? 0 : .02;
      ctx.beginPath(); ctx.moveTo(hx(.86 - o), hy(1.24 + by0)); ctx.bezierCurveTo(hx(.74 - o), hy(1.36 + by0), hx(.56 - o), hy(1.4 + by0), hx(.4 - o), hy(1.5 + by0)); ctx.bezierCurveTo(hx(.36 - o), hy(1.53 + by0), hx(.34 - o), hy(1.5 + by0), hx(.38 - o), hy(1.46 + by0)); ctx.bezierCurveTo(hx(.52 - o), hy(1.34 + by0), hx(.64 - o), hy(1.25 + by0), hx(.76 - o), hy(1.19 + by0)); ctx.closePath();
      ctx.fillStyle = near ? grad(ctx, hx(.84), hy(1.22), hx(.38), hy(1.5), [[0, "#2a2530"], [.55, "#8c8478"], [1, bone]]) : "#1c1920"; ctx.fill(); outline(ctx, lw);
      if (near) { ctx.strokeStyle = "#0b0a0d77"; ctx.lineWidth = Math.max(.8, u * .012); for (let i = 1; i <= 4; i++) { const f = i / 5, x = .82 - f * .38, y = 1.22 + f * .24; ctx.beginPath(); ctx.moveTo(hx(x), hy(y - .03)); ctx.lineTo(hx(x - .025), hy(y + .04)); ctx.stroke(); } } }
    // near wing over the shoulder
    wing(0, true);
    if (enraged) { glow(ctx, hx(.92), hy(1.12), u * .16, ember, .5); }
  },
  thunderhorn(ctx, q) {
    const { k, b, u, t, p, flip, state, e } = q, stunned = e.pack?.phase === "stunned", step = t * 6, charging = e.pack?.attack === "ramCharge" && e.pack.phase === "active";
    shadowAt(ctx, k, b, u * .6, u * .15);
    for (const lx of [-.32, -.12, .14, .32]) { const ph = Math.sin(step * (charging ? 2.2 : 1) + lx * 10) * u * .05; ctx.fillStyle = shade(ctx, k + lx * u, b - u * .2, u * .2, p[0], p[1]); ctx.fillRect(k + lx * u - u * .065, b - u * .34, u * .13, u * .3 + ph); ctx.fillStyle = "#16110d"; ctx.fillRect(k + lx * u - u * .075, b - u * .06 + ph, u * .15, u * .07); }
    const bx = k - flip * u * .05, by = b - u * .6; // shaggy body
    ctx.beginPath(); ctx.ellipse(bx, by, u * .55, u * .34, 0, 0, TAU); ctx.fillStyle = shade(ctx, bx, by, u * .55, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1.5, u * .04));
    ctx.strokeStyle = p[1] + "aa"; ctx.lineWidth = Math.max(1, u * .02); for (let i = 0; i < 9; i++) { const x = bx - u * .45 + i * u * .11; ctx.beginPath(); ctx.moveTo(x, by - u * .3); ctx.lineTo(x - flip * u * .04, by - u * .12); ctx.stroke(); }
    const hx = bx + flip * u * .5, hy = by + u * .05 + (charging ? u * .08 : 0); // lowered head when charging
    ctx.beginPath(); ctx.ellipse(hx, hy, u * .24, u * .22, 0, 0, TAU); ctx.fillStyle = shade(ctx, hx, hy, u * .24, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1, u * .035));
    for (const side of [-1, 1]) { // great curled horns
      ctx.beginPath(); ctx.moveTo(hx - flip * u * .05, hy - u * .12); ctx.bezierCurveTo(hx - flip * u * .3, hy - u * .5 * (side > 0 ? 1 : .8), hx + flip * u * .35, hy - u * .5, hx + flip * u * .38, hy - u * (side > 0 ? .12 : .02));
      ctx.lineWidth = Math.max(3, u * .1); ctx.strokeStyle = shade(ctx, hx, hy - u * .3, u * .3, p[3], "#5c4a2e"); ctx.stroke();
    }
    ctx.strokeStyle = p[2] + (state === "windup" ? "ff" : "66"); ctx.lineWidth = Math.max(1, u * .025); ctx.beginPath(); ctx.moveTo(hx, hy - u * .3); ctx.lineTo(hx + flip * u * .08, hy - u * .2); ctx.lineTo(hx - flip * u * .02, hy - u * .12); ctx.stroke(); // arc between horns
    if (state === "windup" || charging) glow(ctx, hx + flip * u * .2, hy - u * .25, u * .35, p[2], .45);
    eye(ctx, hx + flip * u * .12, hy - u * .02, u * .03, stunned ? "#9aa0ff" : p[2]);
    if (stunned) for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; ctx.fillStyle = "#fff1c2"; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * u * .25, hy - u * .45 + Math.sin(a) * u * .06, u * .04, 0, TAU); ctx.fill(); }
  },
  mirrorShade(ctx, q) {
    const { k, b, u, t, p, flip, e } = q, sway = Math.sin(t * 2) * u * .03, top = b - u * 1.05;
    shadowAt(ctx, k, b, u * .28, u * .08);
    ctx.beginPath(); ctx.moveTo(k + sway, top + u * .25); ctx.lineTo(k + u * .3, b - u * .05); ctx.lineTo(k - u * .3, b - u * .05); ctx.closePath(); // long coat
    const coat = ctx.createLinearGradient(k - u * .3, 0, k + u * .3, 0); coat.addColorStop(0, p[1]); coat.addColorStop(.5, p[0]); coat.addColorStop(1, p[1]); ctx.fillStyle = coat; ctx.fill(); outline(ctx, Math.max(1, u * .03));
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = ["#ff9ee8", "#9ee9ff", "#fff19e", "#b6ff9e"][i] + "88"; ctx.lineWidth = Math.max(1, u * .015); ctx.beginPath(); ctx.moveTo(k + u * (.3 - i * .01), b - u * .05); ctx.lineTo(k + sway + u * .02, top + u * .27); ctx.stroke(); } // prismatic edge
    const fx = k + sway, fy = top + u * .12; // cracked mirror mask
    ctx.beginPath(); ctx.ellipse(fx, fy, u * .17, u * .21, 0, 0, TAU); const mask = ctx.createLinearGradient(fx - u * .17, fy - u * .2, fx + u * .17, fy + u * .2); mask.addColorStop(0, "#ffffff"); mask.addColorStop(.4, p[2]); mask.addColorStop(.6, "#8a95a8"); mask.addColorStop(1, "#f0f6ff"); ctx.fillStyle = mask; ctx.fill(); outline(ctx, Math.max(1, u * .03));
    ctx.strokeStyle = "#2a2f3a"; ctx.lineWidth = Math.max(1, u * .015); ctx.beginPath(); ctx.moveTo(fx - u * .05, fy - u * .2); ctx.lineTo(fx + u * .02, fy - u * .02); ctx.lineTo(fx - u * .08, fy + u * .1); ctx.moveTo(fx + u * .02, fy - u * .02); ctx.lineTo(fx + u * .13, fy + u * .05); ctx.stroke();
    ctx.fillStyle = "#11141b"; ctx.beginPath(); ctx.ellipse(fx - u * .06, fy - u * .03, u * .03, u * .02, 0, 0, TAU); ctx.ellipse(fx + u * .06, fy - u * .03, u * .03, u * .02, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = p[0]; ctx.lineWidth = Math.max(2, u * .045); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(k + flip * u * .15, top + u * .45); ctx.lineTo(k + flip * u * .45, top + u * .55 + Math.sin(t * 3) * u * .03); ctx.stroke(); // blade arm
    ctx.strokeStyle = "#f4fbff"; ctx.lineWidth = Math.max(1, u * .025); ctx.beginPath(); ctx.moveTo(k + flip * u * .45, top + u * .55); ctx.lineTo(k + flip * u * .85, top + u * .62); ctx.stroke();
    if (e.illusion) { ctx.strokeStyle = "#dff3ff55"; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(k - u * .25, top + u * (.4 + i * .2) + Math.sin(t * 9 + i) * u * .02); ctx.lineTo(k + u * .25, top + u * (.42 + i * .2)); ctx.stroke(); } }
  },
  cinderSeraph(ctx, q) {
    const { k, b, u, t, p, e } = q, hover = u * (.45 + Math.sin(t * 2.4) * .06), cy = b - hover - u * .45, beat = Math.sin(t * 8) * .25;
    shadowAt(ctx, k, b, u * .4, u * .12, .45);
    glow(ctx, k, cy, u * 1.1, p[2], .3);
    for (let pair = 0; pair < 3; pair++) for (const side of [-1, 1]) { // six ember wings
      const a = side * (.55 + pair * .55 + beat * (1 - pair * .3)), len = u * (.85 - pair * .12);
      ctx.save(); ctx.translate(k, cy); ctx.rotate(-Math.PI / 2 + a);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * .35, -u * .18, len, 0); ctx.quadraticCurveTo(len * .45, u * .12, 0, 0);
      const wing = ctx.createLinearGradient(0, 0, len, 0); wing.addColorStop(0, p[3] + "ff"); wing.addColorStop(.5, p[2] + "dd"); wing.addColorStop(1, p[0] + "22"); ctx.fillStyle = wing; ctx.fill();
      ctx.strokeStyle = p[1] + "88"; ctx.lineWidth = Math.max(1, u * .015); ctx.stroke(); ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(k, cy, u * .16, u * .26, 0, 0, TAU); ctx.fillStyle = shade(ctx, k, cy, u * .26, p[3], p[0]); ctx.fill(); outline(ctx, Math.max(1, u * .03)); // body
    ctx.beginPath(); ctx.arc(k, cy - u * .3, u * .13, 0, TAU); ctx.fillStyle = shade(ctx, k, cy - u * .3, u * .13, "#fff8e0", p[2]); ctx.fill(); outline(ctx, Math.max(1, u * .025)); // mask
    ctx.fillStyle = p[1]; ctx.fillRect(k - u * .07, cy - u * .32, u * .14, u * .025);
    for (let i = 0; i < 10; i++) { const a = t * 1.4 + i * TAU / 10, r = u * .3; ctx.fillStyle = "#e9e3d6"; ctx.save(); ctx.translate(k + Math.cos(a) * r, cy - u * .3 + Math.sin(a) * r * .35); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, -u * .05); ctx.lineTo(u * .015, 0); ctx.lineTo(0, u * .05); ctx.lineTo(-u * .015, 0); ctx.fill(); ctx.restore(); } // halo of knives
    for (let i = 0; i < 4; i++) { const ex = k + Math.sin(t * 3 + i * 2) * u * .3, ey = cy + u * .3 + ((t * 40 + i * 25) % 30) / 30 * u * .6; ctx.fillStyle = p[2] + "cc"; ctx.fillRect(ex, ey, Math.max(2, u * .03), Math.max(2, u * .03)); } // falling embers
    if (e.aloft) { ctx.globalAlpha = .45; }
  },
  // ---- dungeon-only grotesques
  weepingSaint(ctx, q) {
    const { k, b, u, t, p, e } = q, stone = e.watched, top = b - u * 1.35, sway = stone ? 0 : Math.sin(t * 7) * u * .02;
    shadowAt(ctx, k, b, u * .26, u * .07);
    ctx.beginPath(); ctx.moveTo(k + sway, top + u * .18); ctx.bezierCurveTo(k + u * .3, top + u * .5, k + u * .26, b - u * .3, k + u * .34, b - u * .02);
    for (let i = 4; i >= -4; i--) ctx.lineTo(k + i * u * .085, b - u * (.02 + (i % 2 ? .05 : 0)));
    ctx.bezierCurveTo(k - u * .26, b - u * .3, k - u * .3, top + u * .5, k + sway, top + u * .18); ctx.closePath(); // long veil
    const veil = ctx.createLinearGradient(k, top, k, b); veil.addColorStop(0, stone ? "#9b968d" : p[2]); veil.addColorStop(1, stone ? "#5d5953" : p[1]); ctx.fillStyle = veil; ctx.fill(); outline(ctx, Math.max(1, u * .025));
    ctx.strokeStyle = stone ? "#4a4743aa" : "#00000055"; ctx.lineWidth = Math.max(1, u * .015); for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(k + i * u * .05 + sway, top + u * .35); ctx.lineTo(k + i * u * .1, b - u * .05); ctx.stroke(); } // folds
    const hx = k + sway, hy = top + u * .2;
    ctx.fillStyle = stone ? "#8e8a83" : "#d8cfc0"; ctx.beginPath(); ctx.ellipse(hx, hy, u * .13, u * .17, 0, 0, TAU); ctx.fill(); outline(ctx, Math.max(1, u * .02)); // hooded head
    for (const side of [-1, 1]) { // long-fingered hands over the face
      ctx.fillStyle = stone ? "#9a958d" : "#e6ddd0"; ctx.beginPath(); ctx.ellipse(hx + side * u * .05, hy + u * .03, u * .06, u * .09, side * .3, 0, TAU); ctx.fill();
      ctx.strokeStyle = stone ? "#6f6b65" : "#b9ab98"; ctx.lineWidth = Math.max(1, u * .012); for (let f = 0; f < 4; f++) { ctx.beginPath(); ctx.moveTo(hx + side * u * (.02 + f * .02), hy + u * .1); ctx.lineTo(hx + side * u * (.01 + f * .025), hy - u * (.12 + (f % 2) * .03)); ctx.stroke(); }
    }
    if (!stone) { ctx.fillStyle = p[3]; for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + side * u * .045, hy + u * .08); ctx.lineTo(hx + side * u * .05, hy + u * .22); ctx.lineWidth = 1; ctx.strokeStyle = p[3]; ctx.stroke(); } } // weeping trails
    if (stone) { ctx.strokeStyle = "#3a3734"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx - u * .08, hy - u * .1); ctx.lineTo(hx - u * .02, hy + u * .05); ctx.lineTo(hx + u * .06, hy + u * .02); ctx.stroke(); }
  },
  amalgam(ctx, q) {
    const { k, b, u, t, p } = q, breathe = 1 + Math.sin(t * 2.4) * .04, cy = b - u * .45;
    shadowAt(ctx, k, b, u * .62, u * .16);
    for (let i = 0; i < 7; i++) { // fused bodies
      const a = i * TAU / 7 + t * .2, r = u * .3, x = k + Math.cos(a) * r * 1.1, y = cy + Math.sin(a) * r * .6;
      ctx.beginPath(); ctx.ellipse(x, y, u * .24 * breathe, u * .2 * breathe, a, 0, TAU); ctx.fillStyle = shade(ctx, x, y, u * .24, p[2], p[0]); ctx.fill(); outline(ctx, Math.max(1, u * .02), "#2a0f12aa");
    }
    ctx.beginPath(); ctx.ellipse(k, cy, u * .42 * breathe, u * .34 * breathe, 0, 0, TAU); ctx.fillStyle = shade(ctx, k, cy, u * .42, p[2], p[1]); ctx.fill(); outline(ctx, Math.max(1.5, u * .03));
    const faces = [[-.18, -.1], [.15, -.14], [0, .08], [-.1, .16], [.2, .1]];
    for (const [fx, fy] of faces) { // faces pressing out of the mass
      const x = k + fx * u, y = cy + fy * u;
      ctx.fillStyle = "#e9c8bd"; ctx.beginPath(); ctx.ellipse(x, y, u * .07, u * .085, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#1a0a0c"; ctx.beginPath(); ctx.arc(x - u * .025, y - u * .015, u * .012, 0, TAU); ctx.arc(x + u * .025, y - u * .015, u * .012, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y + u * .035, u * .02, u * .025 * (1 + Math.sin(t * 3 + fx * 9) * .5), 0, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.sin(t + i) * .2; ctx.strokeStyle = "#d8b0a6"; ctx.lineWidth = Math.max(1.5, u * .035); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(k + Math.cos(a) * u * .35, cy + Math.sin(a) * u * .25); ctx.lineTo(k + Math.cos(a) * u * .62, b - u * .05 + Math.sin(t * 4 + i) * u * .02); ctx.stroke(); } // grasping arms
  },
  // Release 235: the Morphing Blob. A translucent mound of living ooze whose outline never holds still; nuclei and a few
  // suspended eyes drift inside it, bubbles rise and burst, drips pool at its edge; tendrils lash out along their lanes.
  morphingBlob(ctx, q) {
    const { k, b, u, t, p, flip, state, e } = q, R = u * .62, cy = b - R * .6, s0 = e.pack, enraged = e.hp <= e.maxHp * .5;
    const wob = (a) => 1 + .07 * Math.sin(3 * a + t * 2.1) + .05 * Math.sin(5 * a - t * 3.2) + .035 * Math.sin(7 * a + t * 1.4) + (state === "windup" ? .04 * Math.sin(t * 22) : 0);
    shadowAt(ctx, k, b + u * .02, R * 1.15, R * .3, .5);
    for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + .3, d = R * (1.02 + .1 * Math.sin(t * 1.3 + i)); ctx.fillStyle = p[1] + "cc"; ctx.beginPath(); ctx.ellipse(k + Math.cos(a) * d, b - u * .02 + Math.sin(a) * R * .12, R * .12, R * .05, 0, 0, TAU); ctx.fill(); } // drips pooled at its edge
    // Tendrils: coiled stubs while it winds up, then lashing out along each lane and drawing back.
    const lash = s0?.attack === "blobTendrils" && s0.data?.dirs;
    if (lash) {
      const scale = Math.max(.6, Number(e.scale) || 1), tile = u / scale, L = (BLOB.tendrilLength + (Number(e.bodyRadius) || .4) * .6) * tile;
      const out = s0.phase === "windup" ? .12 : Math.max(0, Math.min(1, (s0.t || 0) / .3)) * .95 + .05;
      for (const [i, d] of s0.data.dirs.entries()) {
        const sx = k + d.x * R * .7, sy = cy + d.y * R * .45, len = L * out, segs = 10;
        ctx.lineCap = "round";
        for (const pass of [0, 1]) { ctx.beginPath(); ctx.moveTo(sx, sy);
          for (let j = 1; j <= segs; j++) { const f = j / segs, wave = Math.sin(f * 7 + t * 14 + i) * u * .06 * (1 - f), x = sx + d.x * len * f - d.y * wave, y = sy + d.y * len * f * .75 + d.x * wave; ctx.lineTo(x, y); }
          ctx.strokeStyle = pass ? p[0] + "ee" : p[1]; ctx.lineWidth = (pass ? .09 : .13) * u; ctx.stroke(); }
        ctx.fillStyle = p[3] + "aa"; for (let j = 2; j < 9; j += 2) { const f = j / 10; ctx.beginPath(); ctx.arc(sx + d.x * len * f, sy + d.y * len * f * .75, u * .018, 0, TAU); ctx.fill(); } // suckers
      }
    }
    // The body: one wobbling outline, flat where it meets the ground.
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, r = R * wob(a), x = k + Math.cos(a) * r, y = Math.min(b, cy + Math.sin(a) * r * .78); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
    const g = ctx.createRadialGradient(k - R * .35, cy - R * .45, R * .05, k, cy, R * 1.2); g.addColorStop(0, p[3] + "f2"); g.addColorStop(.3, p[0] + "e6"); g.addColorStop(.8, p[1] + "e0"); g.addColorStop(1, p[1] + "f5");
    ctx.fillStyle = g; ctx.fill(); outline(ctx, Math.max(1, u * .02), p[1] + "cc");
    ctx.save(); ctx.clip();
    glow(ctx, k, cy + R * .25, R * .9, p[1], .45); // the dark heart of the mass
    for (let i = 0; i < 6; i++) { // nuclei drifting inside
      const a = i * 2.3 + t * (.3 + i * .05), x = k + Math.cos(a) * R * .45 * Math.sin(t * .4 + i), y = cy + Math.sin(a * 1.3) * R * .3;
      glow(ctx, x, y, R * .2, p[2], enraged ? .4 : .25); ctx.fillStyle = p[1] + "aa"; ctx.beginPath(); ctx.ellipse(x, y, R * .08, R * .06, a, 0, TAU); ctx.fill(); ctx.strokeStyle = p[2] + "88"; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let i = 0; i < 3; i++) { // eyes sunk in the ooze, turning toward the Wayfarer: lime irises, slit pupils, veined
      const x = k + (i - 1) * R * .44 + Math.sin(t * .7 + i * 2) * R * .06, y = cy - R * (.1 - .1 * Math.abs(i - 1)) + Math.cos(t * .9 + i) * R * .05, er = R * (i === 1 ? .1 : .07), blink = Math.max(.15, Math.abs(Math.sin(t * .5 + i * 1.9)) > .985 ? .15 : 1);
      ctx.fillStyle = "#e4dcc0b8"; ctx.beginPath(); ctx.ellipse(x, y, er, er * .8 * blink, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#a0303060"; ctx.lineWidth = 1; for (let v = 0; v < 3; v++) { const va = v * 2.1 + i; ctx.beginPath(); ctx.moveTo(x + Math.cos(va) * er, y + Math.sin(va) * er * .8); ctx.quadraticCurveTo(x + Math.cos(va + .3) * er * .6, y + Math.sin(va + .3) * er * .5, x + Math.cos(va) * er * .45, y + Math.sin(va) * er * .4); ctx.stroke(); }
      ctx.fillStyle = enraged ? "#ff6a3a" : p[2]; ctx.beginPath(); ctx.ellipse(x + flip * er * .3, y, er * .5, er * .55 * blink, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#0a0c04"; ctx.beginPath(); ctx.ellipse(x + flip * er * .33, y, er * .1, er * .45 * blink, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffffff99"; ctx.beginPath(); ctx.arc(x + flip * er * .1 - er * .25, y - er * .3, er * .12, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = p[0] + "38"; ctx.fillRect(k - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6); // a film of ooze over everything inside, so the eyes sit in it
    for (let i = 0; i < 9; i++) { const f = (t * .35 + i * .113) % 1, x = k + Math.sin(i * 2.7 + t * .5) * R * .7 * (1 - f * .3), y = cy + R * .45 - f * R * 1.1, r = R * (.025 + .03 * (i % 3) / 2); ctx.strokeStyle = p[3] + Math.round((1 - f) * 160).toString(16).padStart(2, "0"); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); } // rising bubbles
    ctx.restore();
    ctx.strokeStyle = p[3] + "aa"; ctx.lineWidth = Math.max(1, u * .03); ctx.lineCap = "round"; ctx.beginPath(); ctx.ellipse(k - R * .25, cy - R * .42, R * .32, R * .14, -.35, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke(); // wet highlight
    ctx.fillStyle = p[3] + "cc"; ctx.beginPath(); ctx.ellipse(k - R * .42, cy - R * .38, R * .05, R * .03, -.4, 0, TAU); ctx.fill();
    if (state === "windup" && (s0?.attack === "blobGasJet" || s0?.attack === "blobGasCloud")) for (let i = 0; i < 5; i++) glow(ctx, k + Math.sin(t * 3 + i * 1.3) * R * .5, cy - R * (.6 + ((t * 1.5 + i * .2) % 1) * .6), R * .3, "#c8e85a", .3); // gas gathering
  },
  // Release r237-74592043bc57: the Tremor Worm. Under the ground, a mound of heaving earth; up, a ringed column of sand-coloured armour
  // standing out of a hole of broken ground, its head a round maw ringed with teeth and lit from deep in the throat, small
  // tentacles writhing at its lips (lashing out along their lanes when it strikes). It drinks the air with its maw wide.
  tremorWorm(ctx, q) {
    const { k, b, u, t, p, flip, e, state } = q, s0 = e.pack, W = s0?.worm, rising = s0?.attack === "wormRise";
    if (e.hidden || (rising && e.untargetable)) { // travelling under the ground, or about to burst up: heaving earth
      const R = u * .55, heave = rising && s0.phase === "erupt" ? 1.3 : 1;
      ctx.fillStyle = p[1] + "aa"; ctx.beginPath(); ctx.ellipse(k, b - u * .04, R * heave, R * .32 * heave, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = p[0] + "cc"; ctx.beginPath(); ctx.ellipse(k, b - u * .1 * heave, R * .8 * heave, R * .24 * heave, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = "#140c06cc"; ctx.lineWidth = Math.max(1, u * .015); for (let i = 0; i < 6; i++) { const a = i * 1.05 + .3; ctx.beginPath(); ctx.moveTo(k, b - u * .08); ctx.lineTo(k + Math.cos(a) * R * .55 * heave, b - u * .08 + Math.sin(a) * R * .18 * heave); ctx.lineTo(k + Math.cos(a + .2) * R * .9 * heave, b - u * .06 + Math.sin(a + .2) * R * .28 * heave); ctx.stroke(); } // cracks
      for (let i = 0; i < 8; i++) { const a = t * 4 + i * .8, h = Math.abs(Math.sin(a * 1.3)) * u * .2 * heave; ctx.fillStyle = i % 2 ? p[0] : "#6a5238"; ctx.fillRect(k + Math.cos(a) * R * .7, b - u * .12 - h, Math.max(2, u * .05), Math.max(2, u * .04)); } // thrown earth
      return;
    }
    const up = W?.mode === "emerge" ? Math.max(.05, 1 - Math.max(0, W.t) / WORM.emergeTime) : 1, scale = Math.max(.6, Number(e.scale) || 1), tile = u / scale;
    const suck = s0?.attack === "wormSuction" && s0.phase !== "recover", lash = s0?.attack === "wormMaw" && s0.data?.dirs;
    const open = suck ? .95 + Math.sin(t * 16) * .05 : state === "windup" ? .85 : .7 + Math.sin(t * 1.7) * .06;
    // The hole it stands in: broken ground, a dark pit, rubble on the rim.
    const hr = u * .5; shadowAt(ctx, k, b, hr * 1.25, hr * .38, .55);
    ctx.fillStyle = "#120a06"; ctx.beginPath(); ctx.ellipse(k, b - u * .03, hr, hr * .3, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + .2, r = hr * (1 + (i % 3) * .06); ctx.fillStyle = i % 2 ? "#7a6044" : "#56422e"; ctx.beginPath(); ctx.ellipse(k + Math.cos(a) * r, b - u * .03 + Math.sin(a) * r * .3, u * (.06 + (i % 3) * .02), u * .04, a, 0, TAU); ctx.fill(); }
    // The body: a ringed column rising out of the hole and curving toward the Wayfarer, drawn bottom to top.
    const H = u * 1.4 * up, lean = flip * u * .28 * up, sway = Math.sin(t * 1.3) * u * .07, n = 10, pts = [];
    for (let i = 0; i <= n; i++) { const f = i / n, x = k + lean * f * f + sway * Math.sin(f * Math.PI), y = b - u * .06 - H * f + (suck ? Math.sin(t * 18 + f * 6) * u * .01 : 0); pts.push({ x, y, f }); }
    for (let i = 0; i < n; i++) {
      const a = pts[i], c = pts[i + 1], mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2, rw = u * (.36 + .04 * Math.sin(i * 1.7) + .05 * (i / n)), rh = rw * .55;
      ctx.beginPath(); ctx.ellipse(mx, my, rw, rh, 0, 0, TAU); ctx.fillStyle = shade(ctx, mx - flip * rw * .3, my - rh * .4, rw * 1.2, i % 2 ? p[3] : "#e6c896", i % 2 ? p[0] : "#9a7448"); ctx.fill(); outline(ctx, Math.max(1, u * .02), "#1a100acc");
      ctx.strokeStyle = p[1] + "aa"; ctx.lineWidth = Math.max(1, u * .025); ctx.beginPath(); ctx.ellipse(mx, my + rh * .15, rw * .96, rh * .8, 0, .15, Math.PI - .15); ctx.stroke(); // the lower lip of the ring plate
      ctx.strokeStyle = "#fff4dc55"; ctx.lineWidth = Math.max(1, u * .018); ctx.beginPath(); ctx.ellipse(mx - flip * rw * .1, my - rh * .2, rw * .7, rh * .5, 0, Math.PI * 1.15, Math.PI * 1.75); ctx.stroke(); // light on the ridge
      if (i % 2 === 0) { ctx.fillStyle = "#3a2a1a88"; for (const sx of [-.55, .55]) { ctx.beginPath(); ctx.arc(mx + sx * rw, my, rw * .07, 0, TAU); ctx.fill(); } } // breathing pores
    }
    // The head: a round maw tilted toward the Wayfarer.
    const hx = pts[n].x + flip * u * .06, hy = pts[n].y - u * .02, R = u * .46, ry = R * .82;
    ctx.beginPath(); ctx.ellipse(hx, hy, R, ry, flip * .15, 0, TAU); ctx.fillStyle = shade(ctx, hx - flip * R * .3, hy - ry * .4, R * 1.2, p[3], p[0]); ctx.fill(); outline(ctx, Math.max(1.5, u * .03), "#1a100a");
    for (let r = 0; r < 3; r++) { ctx.strokeStyle = r % 2 ? "#8a6a4a99" : "#5a442e99"; ctx.lineWidth = Math.max(1, u * .02); ctx.beginPath(); ctx.ellipse(hx, hy, R * (.92 - r * .05), ry * (.92 - r * .05), flip * .15, Math.PI * .1, Math.PI * .9); ctx.stroke(); } // lip folds
    const mr = R * .84 * open, mry = ry * .84 * open;
    ctx.fillStyle = "#1a0604"; ctx.beginPath(); ctx.ellipse(hx, hy, mr, mry, flip * .15, 0, TAU); ctx.fill(); // throat
    glow(ctx, hx, hy, mr * .9, p[2], suck ? .85 : .55); ctx.fillStyle = "#ffcf8a"; ctx.beginPath(); ctx.ellipse(hx, hy, mr * .12, mry * .12, 0, 0, TAU); ctx.fill(); // fire deep in it
    for (let ring = 0; ring < 3; ring++) { // rings of hooked teeth, the inner rings turning
      const rr = 1 - ring * .27, cnt = 16 - ring * 3, turn = ring * .2 + (suck ? t * (ring % 2 ? -2 : 2) : Math.sin(t + ring) * .05);
      ctx.fillStyle = ring ? "#d8ccb0" : "#f3ead2";
      for (let i = 0; i < cnt; i++) { const a = i / cnt * TAU + turn, x0 = hx + Math.cos(a) * mr * rr, y0 = hy + Math.sin(a) * mry * rr, x1 = hx + Math.cos(a) * mr * (rr - .22), y1 = hy + Math.sin(a) * mry * (rr - .22), wv = .1; ctx.beginPath(); ctx.moveTo(hx + Math.cos(a - wv) * mr * rr, hy + Math.sin(a - wv) * mry * rr); ctx.lineTo(x1, y1); ctx.lineTo(hx + Math.cos(a + wv) * mr * rr, hy + Math.sin(a + wv) * mry * rr); ctx.closePath(); ctx.fill(); }
    }
    // Tentacles at the lips: writhing stubs, or lashing out along the lanes.
    ctx.lineCap = "round";
    const stubs = lash ? s0.data.dirs : Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + (i - 2) * .7 + Math.sin(t * 2 + i) * .2; return { x: Math.cos(a), y: Math.sin(a), stub: true }; });
    const out = lash ? (s0.phase === "windup" ? .15 : Math.max(0, Math.min(1, (s0.t || 0) / .35)) * .95 + .05) : 1;
    for (const [i, d] of stubs.entries()) {
      const sx = hx + d.x * mr * .85, sy = hy + d.y * mry * .85, len = d.stub ? u * (.3 + .06 * Math.sin(t * 3 + i)) : WORM.mawLength * tile * out, segs = 10;
      for (const pass of [0, 1]) { ctx.beginPath(); ctx.moveTo(sx, sy);
        for (let j = 1; j <= segs; j++) { const f = j / segs, wave = Math.sin(f * 6 + t * (d.stub ? 5 : 14) + i) * u * (d.stub ? .07 : .07) * (1 - f * .5), x = sx + d.x * len * f - d.y * wave, y = sy + d.y * len * f * (d.stub ? 1 : .75) + d.x * wave + (d.stub ? -Math.sin(f * Math.PI) * u * .05 : 0); ctx.lineTo(x, y); }
        ctx.strokeStyle = pass ? "#c98a6a" : "#3a1a12"; ctx.lineWidth = (pass ? .06 : .09) * u * (d.stub ? .9 : 1.2); ctx.stroke(); }
      ctx.fillStyle = "#ffe0c0aa"; for (let j = 2; j < 9; j += 2) { const f = j / 10; ctx.beginPath(); ctx.arc(sx + d.x * len * f, sy + d.y * len * f * (d.stub ? 1 : .75), u * .014, 0, TAU); ctx.fill(); } // suckers
    }
    const spew = s0?.attack === "wormLavaSpew" && s0.data?.aim;
    if (spew && s0.phase === "windup") { glow(ctx, hx, hy, mr * 1.4, "#ff7a2a", .5 + .3 * Math.sin(t * 20)); for (let i = 0; i < 3; i++) { const f = (t * 2 + i / 3) % 1; ctx.fillStyle = "#ffb02a"; ctx.beginPath(); ctx.arc(hx + Math.sin(i * 2.1) * mr * .4, hy + mry * .5 + f * u * .35, u * .03 * (1 - f * .5), 0, TAU); ctx.fill(); } } // lava welling up and dripping from the lips
    if (spew && s0.phase === "active") { // the stream: a thick arcing gush from the maw to where the lava is landing
      const tx = k + s0.data.aim.x * (s0.data.front || 0) * tile, ty = b + s0.data.aim.y * (s0.data.front || 0) * tile - tile * .2, mx = (hx + tx) / 2, my = Math.min(hy, ty) - u * .35;
      for (const [w2, c] of [[.2, "#a8200888"], [.13, "#ff6a1a"], [.06, "#ffe08a"]]) { ctx.strokeStyle = c; ctx.lineWidth = u * w2 * (1 + .1 * Math.sin(t * 30)); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke(); }
      glow(ctx, hx, hy, mr * 1.3, "#ff7a2a", .8); glow(ctx, tx, ty, u * .3, "#ff9a2a", .7);
    }
    if (suck) for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + t * 3, f = 1 - ((t * 2 + i / 10) % 1), r = u * (.6 + f * 2.2); ctx.fillStyle = `rgba(220,190,140,${.7 * (1 - f)})`; ctx.fillRect(hx + Math.cos(a) * r, hy + Math.sin(a) * r * .6, Math.max(2, u * .03), Math.max(2, u * .03)); } // dust drawn in
    if (W?.mode === "emerge") { ctx.globalAlpha = 1 - up; for (let i = 0; i < 10; i++) { const a = i * TAU / 10; ctx.fillStyle = "#b9a184"; ctx.beginPath(); ctx.arc(k + Math.cos(a) * hr * (1 + up), b - u * .05 + Math.sin(a) * hr * .3 * (1 + up) - up * u * .3, u * .05, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; } // earth thrown off as it comes up
  },
  // A tentacle the Tremor Worm raised: a tapering limb out of broken ground, suckers along its inside curve; the fire ones
  // carry a glowing orifice at the tip, the laser ones a single lidded lens.
  wormTentacle(ctx, q) {
    const { k, b, u, t, p, flip, e } = q, up = 1 - Math.max(0, Math.min(1, Number(e.rising) || 0)), laser = e.tentacleMode === "laser";
    if (e.hidden) return; // under the ground, on its way to you
    shadowAt(ctx, k, b, u * .32, u * .1, .5);
    ctx.fillStyle = "#120a06"; ctx.beginPath(); ctx.ellipse(k, b - u * .02, u * .24, u * .08, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.fillStyle = i % 2 ? "#7a6044" : "#56422e"; ctx.beginPath(); ctx.ellipse(k + Math.cos(a) * u * .25, b - u * .02 + Math.sin(a) * u * .08, u * .05, u * .03, a, 0, TAU); ctx.fill(); }
    if (up <= .02) return;
    const H = u * 1.2 * up, n = 12, pts = [];
    for (let i = 0; i <= n; i++) { const f = i / n, curl = Math.sin(t * 2.2 + f * 2.5 + e.x) * u * .16 * f, x = k + curl + flip * u * .15 * f * f, y = b - u * .04 - H * f; pts.push({ x, y, w: u * (.2 - .14 * f) }); }
    ctx.beginPath(); ctx.moveTo(pts[0].x - pts[0].w, pts[0].y); for (const q2 of pts) ctx.lineTo(q2.x - q2.w, q2.y); for (let i = n; i >= 0; i--) ctx.lineTo(pts[i].x + pts[i].w, pts[i].y); ctx.closePath();
    ctx.fillStyle = shade(ctx, k - u * .1, b - H * .6, H * .7, "#e0a080", p[1]); ctx.fill(); outline(ctx, Math.max(1, u * .025), "#1a0a06cc");
    ctx.fillStyle = "#ffd8c0aa"; for (let i = 1; i < n - 1; i += 2) { const q2 = pts[i]; ctx.beginPath(); ctx.ellipse(q2.x + flip * q2.w * .55, q2.y, q2.w * .3, q2.w * .22, 0, 0, TAU); ctx.fill(); } // suckers
    ctx.strokeStyle = "#3a1a1255"; ctx.lineWidth = 1; for (let i = 1; i < n; i++) { const q2 = pts[i]; ctx.beginPath(); ctx.moveTo(q2.x - q2.w * .9, q2.y); ctx.quadraticCurveTo(q2.x, q2.y + q2.w * .25, q2.x + q2.w * .9, q2.y); ctx.stroke(); } // ring creases
    const tip = pts[n], tr = u * .1;
    if (laser) { ctx.fillStyle = p[1]; ctx.beginPath(); ctx.ellipse(tip.x, tip.y, tr * 1.3, tr * 1.1, 0, 0, TAU); ctx.fill(); glow(ctx, tip.x, tip.y, tr * 3, "#ff3a2a", .7); ctx.fillStyle = "#ffe8d0"; ctx.beginPath(); ctx.ellipse(tip.x, tip.y, tr * .8, tr * .7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#c01a10"; ctx.beginPath(); ctx.arc(tip.x + flip * tr * .2, tip.y, tr * .4, 0, TAU); ctx.fill(); ctx.fillStyle = "#1a0604"; ctx.beginPath(); ctx.arc(tip.x + flip * tr * .25, tip.y, tr * .15, 0, TAU); ctx.fill(); } // a lens
    else { const pulse = .6 + .4 * Math.sin(t * 9); glow(ctx, tip.x, tip.y, tr * 3 * pulse, p[2], .8); ctx.fillStyle = "#2a0a04"; ctx.beginPath(); ctx.ellipse(tip.x, tip.y, tr, tr * .7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffcf6a"; ctx.beginPath(); ctx.ellipse(tip.x, tip.y, tr * .5 * pulse, tr * .35 * pulse, 0, 0, TAU); ctx.fill(); } // a burning mouth
  },
  bloblet(ctx, q) {
    const { k, b, u, t, p, flip } = q, R = u * .5, cy = b - R * .55, hop = Math.abs(Math.sin(t * 8)) * u * .06;
    shadowAt(ctx, k, b, R * .9, R * .22, .45);
    ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, r = R * (1 + .08 * Math.sin(3 * a + t * 6)), x = k + Math.cos(a) * r, y = Math.min(b, cy - hop + Math.sin(a) * r * .75); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath();
    ctx.fillStyle = shade(ctx, k, cy - hop, R, p[3], p[0]); ctx.fill(); outline(ctx, Math.max(1, u * .03), p[1] + "cc");
    ctx.fillStyle = "#f4f0dc"; ctx.beginPath(); ctx.ellipse(k + flip * R * .2, cy - hop - R * .1, R * .22, R * .2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#14200a"; ctx.beginPath(); ctx.ellipse(k + flip * R * .3, cy - hop - R * .1, R * .1, R * .14, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = p[3] + "aa"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(k - R * .3, cy - hop - R * .4, R * .2, R * .08, -.3, Math.PI, Math.PI * 1.7); ctx.stroke();
  },
  pallidCrawler(ctx, q) {
    const { k, b, u, t, p, flip, e } = q, lift = e.hopLift ? e.hopLift * u : 0, cy = b - u * .28 - lift, step = t * 14;
    shadowAt(ctx, k, b, u * .3, u * .08);
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) for (const side of [-1, 1]) { const ph = Math.sin(step + i * 2 + (side > 0 ? 1 : 0)) * u * .06; ctx.strokeStyle = p[0]; ctx.lineWidth = Math.max(1.5, u * .05); ctx.beginPath(); ctx.moveTo(k + (i - 1) * u * .14, cy); ctx.lineTo(k + (i - 1) * u * .16 + ph, cy + side * u * .1 - u * .06); ctx.lineTo(k + (i - 1) * u * .2 + ph, b - lift * .3); ctx.stroke(); } // too many limbs
    ctx.beginPath(); ctx.ellipse(k, cy, u * .3, u * .14, 0, 0, TAU); ctx.fillStyle = shade(ctx, k, cy, u * .3, p[2], p[0]); ctx.fill(); outline(ctx, Math.max(1, u * .02), "#3b2a2a");
    ctx.strokeStyle = "#b9a49a"; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(k + i * u * .08, cy - u * .04, u * .035, Math.PI, 0); ctx.stroke(); } // ribs
    const hx = k + flip * u * .3; ctx.beginPath(); ctx.ellipse(hx, cy - u * .02, u * .12, u * .11, 0, 0, TAU); ctx.fillStyle = p[0]; ctx.fill(); outline(ctx, Math.max(1, u * .02), "#3b2a2a");
    ctx.fillStyle = "#1a0a0c"; ctx.beginPath(); ctx.ellipse(hx + flip * u * .03, cy, u * .06, u * .07, 0, 0, TAU); ctx.fill(); // eyeless mouth
    ctx.fillStyle = "#f4ece6"; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; ctx.fillRect(hx + flip * u * .03 + Math.cos(a) * u * .045, cy + Math.sin(a) * u * .05, Math.max(1, u * .015), Math.max(1, u * .02)); }
  },
  hangedChoir(ctx, q) {
    const { k, b, u, t, p, e } = q, top = b - u * 1.9, aloft = e.aloft;
    ctx.strokeStyle = "#2b2622"; ctx.lineWidth = Math.max(2, u * .04); ctx.beginPath(); ctx.moveTo(k - u * .5, top); ctx.lineTo(k + u * .5, top); ctx.stroke(); // ceiling beam
    for (let i = 0; i < 4; i++) {
      const x = k + (i - 1.5) * u * .26, swing = Math.sin(t * 1.3 + i * 1.7) * u * .05, len = u * (.6 + (i % 2) * .18), hy = top + len;
      ctx.strokeStyle = "#5c554e"; ctx.lineWidth = Math.max(1, u * .015); ctx.setLineDash([u * .03, u * .02]); ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + swing, hy - u * .1); ctx.stroke(); ctx.setLineDash([]); // chains
      ctx.beginPath(); ctx.moveTo(x + swing - u * .09, hy); ctx.quadraticCurveTo(x + swing, hy - u * .2, x + swing + u * .09, hy); ctx.lineTo(x + swing + u * .07, hy + u * .55); ctx.lineTo(x + swing - u * .07, hy + u * .55); ctx.closePath();
      ctx.fillStyle = shade(ctx, x + swing, hy + u * .2, u * .3, p[2], p[1]); ctx.fill(); outline(ctx, Math.max(1, u * .015), "#0b0908cc"); // shroud
      glow(ctx, x + swing, hy + u * .06, u * .1, p[3], aloft ? .3 : .7); ctx.fillStyle = p[3]; ctx.beginPath(); ctx.arc(x + swing - u * .025, hy + u * .06, u * .012, 0, TAU); ctx.arc(x + swing + u * .025, hy + u * .06, u * .012, 0, TAU); ctx.fill(); // lantern eyes
      ctx.strokeStyle = "#cbbfa866"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + swing - u * .05, hy + u * .55); ctx.lineTo(x + swing - u * .03, hy + u * .62); ctx.moveTo(x + swing + u * .04, hy + u * .55); ctx.lineTo(x + swing + u * .02, hy + u * .64); ctx.stroke(); // dangling feet
    }
    shadowAt(ctx, k, b, u * .4, u * .1, .3);
  },
  gnawingMaw(ctx, q) {
    const { k, b, u, t, p, e } = q, cy = b - u * .45, inhale = e.pack?.attack === "devourPull", open = inhale ? .9 + Math.sin(t * 14) * .08 : .45 + Math.sin(t * 2) * .1;
    ctx.fillStyle = "#2b2420"; ctx.fillRect(k - u * .55, cy - u * .5, u * 1.1, u * 1); // masonry it lives in
    ctx.strokeStyle = "#141110"; ctx.lineWidth = 1; for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(k - u * .55, cy - u * .5 + r * u * .25); ctx.lineTo(k + u * .55, cy - u * .5 + r * u * .25); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(k, cy, u * .44, u * .38 * open + u * .06, 0, 0, TAU); ctx.fillStyle = shade(ctx, k, cy, u * .44, p[0], p[1]); ctx.fill(); // lips of flesh
    ctx.fillStyle = "#120607"; ctx.beginPath(); ctx.ellipse(k, cy, u * .34, u * .3 * open, 0, 0, TAU); ctx.fill(); // throat
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14, rx = u * .34, ry = u * .3 * open; ctx.fillStyle = p[2]; ctx.beginPath(); ctx.moveTo(k + Math.cos(a) * rx, cy + Math.sin(a) * ry); ctx.lineTo(k + Math.cos(a + .11) * rx * .72, cy + Math.sin(a + .11) * ry * .72); ctx.lineTo(k + Math.cos(a + .22) * rx, cy + Math.sin(a + .22) * ry); ctx.fill(); } // ring of teeth
    ctx.strokeStyle = "#9c3a3f"; ctx.lineWidth = Math.max(1.5, u * .03); ctx.beginPath(); ctx.moveTo(k - u * .1, cy + u * .05); ctx.quadraticCurveTo(k, cy - u * .05 * open, k + u * .12, cy + u * .06); ctx.stroke(); // tongue
    if (inhale) for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 4, r = u * (1.4 - ((t * 2 + i / 6) % 1)); ctx.fillStyle = "#e8d9c266"; ctx.fillRect(k + Math.cos(a) * r, cy + Math.sin(a) * r * .6, 2, 2); } // dust drawn in
  },
};

function drawLynxBody(ctx, k, b, u, t, p, flip, run) {
  const by = b - u * .38;
  ctx.lineCap = "round";
  for (const [lx, off] of [[-.22, 0], [-.12, Math.PI], [.14, Math.PI * .5], [.24, Math.PI * 1.5]]) { ctx.strokeStyle = p[1]; ctx.lineWidth = Math.max(2, u * .06); ctx.beginPath(); ctx.moveTo(k + flip * lx * u, by + u * .08); ctx.lineTo(k + flip * lx * u + Math.sin(run + off) * u * .08, b - u * .02); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(k - flip * u * .34, by); ctx.quadraticCurveTo(k, by - u * .2, k + flip * u * .3, by - u * .04); ctx.quadraticCurveTo(k + flip * u * .05, by + u * .2, k - flip * u * .34, by); ctx.closePath();
  ctx.fillStyle = shade(ctx, k, by, u * .4, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1, u * .03));
  ctx.strokeStyle = p[1]; ctx.lineWidth = Math.max(2, u * .05); ctx.beginPath(); ctx.moveTo(k - flip * u * .32, by - u * .02); ctx.quadraticCurveTo(k - flip * u * .55, by - u * .35, k - flip * u * .45, by - u * .48 + Math.sin(t * 4) * u * .05); ctx.stroke(); // tail
  const hx = k + flip * u * .34, hy = by - u * .14;
  ctx.beginPath(); ctx.ellipse(hx, hy, u * .15, u * .13, 0, 0, TAU); ctx.fillStyle = shade(ctx, hx, hy, u * .15, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1, u * .025));
  for (const side of [-1, 1]) { ctx.fillStyle = p[1]; ctx.beginPath(); ctx.moveTo(hx + side * u * .05, hy - u * .1); ctx.lineTo(hx + side * u * .1, hy - u * .26); ctx.lineTo(hx + side * u * .12, hy - u * .08); ctx.fill(); }
  for (let i = 0; i < 6; i++) { const a = -Math.PI * .9 + i * .3, r = u * (.2 + (i % 2) * .08); ctx.fillStyle = p[2] + "cc"; ctx.beginPath(); ctx.moveTo(hx - flip * u * .06, hy); ctx.lineTo(hx - flip * u * .06 + Math.cos(a) * r * flip, hy + Math.sin(a) * r); ctx.lineTo(hx - flip * u * .06 + Math.cos(a + .15) * r * .6 * flip, hy + Math.sin(a + .15) * r * .6); ctx.fill(); } // crystal mane
  eye(ctx, hx + flip * u * .07, hy - u * .02, u * .025, p[2]);
}

// Pack creature sprites (release 167). Each creature is several dozen gradient and path draws; a screen of them cost
// more than everything else in the overworld and pushed Firefox's canvas onto its slow software path. A creature is now
// painted into its own small image, repainted at most PACK_SPRITE.fps times a second (and at once when its pose or
// state changes), and that image is copied to the screen each frame. Movement stays smooth at the display's rate;
// only limb and glow animation steps at the sprite rate. The box (in creature units from the feet) holds every pose,
// boss glow and flight lift (measured for each kind, release 167); a hit flash, which lightens what lies beneath, is
// drawn directly over the copy.
export const PACK_SPRITE = { fps: 24, left: 1.5, right: 1.5, up: 3.1, down: .75, keep: 48, staleMs: 4000 };
const sprites = new Map();
function makeSpriteCanvas() { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(1, 1); if (typeof document !== "undefined") return document.createElement("canvas"); return null; }
function spriteState(e) { const s0 = e.pack; return s0?.attack ? (s0.phase === "windup" ? "windup" : "attack") : "idle"; }
function drawPackSprite(ctx, e, s, now, facing, def) {
  const m = typeof ctx.getTransform === "function" && typeof ctx.drawImage === "function" ? ctx.getTransform() : null;
  if (!m || !Number.isFinite(m.a) || m.b || m.c || m.a <= 0 || m.d <= 0 || !e.id) return false;
  if (e.kind === "morphingBlob" || e.kind === "tremorWorm") return false; // release 235: its tendrils reach far past the sprite box; one creature, painted directly
  const scale = Math.max(.6, Number(e.scale) || 1), u = s * scale, k = (e.x + .5) * s, b = (e.y + .82) * s - (e.hopLift || 0) * s * .2;
  const L = PACK_SPRITE.left * u, R = PACK_SPRITE.right * u, U = PACK_SPRITE.up * u, D = PACK_SPRITE.down * u;
  const flip = e.facingX ? (e.facingX < 0 ? -1 : 1) : facing === "left" ? -1 : 1, step = Math.floor(now * PACK_SPRITE.fps / 1000);
  const key = `${e.kind}|${step}|${flip}|${spriteState(e)}|${scale}|${s}|${m.a}|${m.d}|${!!e.boss}|${!!e.aloft}`;
  let sp = sprites.get(e.id);
  if (!sp) { const canvas = makeSpriteCanvas(); if (!canvas) return false; sp = { canvas, key: null, used: now }; sprites.set(e.id, sp); }
  if (sp.key !== key) {
    const c = sp.canvas, w = Math.ceil((L + R) * m.a) + 2, h = Math.ceil((U + D) * m.d) + 2;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext("2d"); if (!g) { sprites.delete(e.id); return false; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    // The creature's feet land at (L, U) in the sprite; paint it as if it stood at the origin of that frame.
    g.setTransform(m.a, 0, 0, m.d, (L - k) * m.a + 1, (U - b) * m.d + 1);
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    paintPackMonster(g, { ...e, hitFlash: 0, phasing: false, phases: false, illusion: false }, s, step * 1000 / PACK_SPRITE.fps, facing, def, true);
    sp.key = key;
  }
  sp.used = now;
  const alpha = (e.phasing || (e.phases && e.untargetable)) ? .45 : e.aloft && e.kind === "cinderSeraph" ? .35 : 1, prior = ctx.globalAlpha;
  ctx.globalAlpha = prior * alpha * (e.illusion ? .92 : 1);
  ctx.drawImage(sp.canvas, k - L - 1 / m.a, b - U - 1 / m.d, sp.canvas.width / m.a, sp.canvas.height / m.d);
  ctx.globalAlpha = prior;
  if (e.hitFlash > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; glow(ctx, k, b - u * .4, u * .55, "#ffffff", .5); ctx.restore(); }
  if (sprites.size > PACK_SPRITE.keep) for (const [id, q] of sprites) if (now - q.used > PACK_SPRITE.staleMs || now < q.used) sprites.delete(id);
  return true;
}
export function packSpriteCount() { return sprites.size; }

// Draw one pack creature at its world position (s = tile size in pixels).
export function drawPackMonster(ctx, e, s, now, facing = "down") {
  const def = MONSTER_PACK[e.kind];
  if (!def) return false;
  if (drawPackSprite(ctx, e, s, now, facing, def)) return true;
  return paintPackMonster(ctx, e, s, now, facing, def, false);
}
function paintPackMonster(ctx, e, s, now, facing, def, sprite) {
  const scale = Math.max(.6, Number(e.scale) || 1), u = s * scale, k = (e.x + .5) * s, b = (e.y + .82) * s - (e.hopLift || 0) * s * .2, t = now / 1000 + ((e.id?.length || 3) * 1.7);
  const flip = e.facingX ? (e.facingX < 0 ? -1 : 1) : facing === "left" ? -1 : 1, s0 = e.pack;
  const state = s0?.attack ? (s0.phase === "windup" ? "windup" : "attack") : "idle";
  const q = { k, b, u, t, p: def.palette, flip, e, state };
  ctx.save();
  if (e.phasing || (e.phases && e.untargetable)) ctx.globalAlpha = .45;
  if (e.aloft && e.kind === "cinderSeraph") { if (!sprite) ctx.globalAlpha = .35; q.b -= u * .9; }
  if (e.illusion) ctx.globalAlpha *= .92;
  if (e.boss) { glow(ctx, k, b - u * .4, u * 1.05, def.palette[2], .18); }
  BODY[def.render]?.(ctx, q);
  if (e.hitFlash > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, k, b - u * .4, u * .55, "#ffffff", .5); }
  ctx.restore();
  return true;
}

// Telegraphs of in-progress attacks (drawn under creatures).
export function drawPackTelegraphs(ctx, enemies, s, now, visible = () => true) {
  for (const e of enemies) {
    const tele = e.pack?.tele;
    if (e.dead || !tele || !visible(e)) continue;
    const def = MONSTER_PACK[e.kind], c = def?.palette?.[2] || "#ff7a6b", cx = (e.x + .5) * s, cy = (e.y + .45) * s, pulse = .55 + Math.sin(now / 90) * .25;
    ctx.save(); ctx.lineCap = "round";
    if (tele.type === "arc") { const a = Math.atan2(tele.aim.y, tele.aim.x), half = tele.arc * Math.PI / 360; ctx.fillStyle = "#c0404034"; ctx.strokeStyle = "#ff9a7acc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, tele.radius * s, a - half, a + half); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (tele.type === "rect") { const a = tele.aim, w = tele.width * s, px = -a.y * w, py = a.x * w, l = tele.length * s; ctx.fillStyle = "#c0404034"; ctx.strokeStyle = "#ff9a7acc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + px, cy + py); ctx.lineTo(cx + a.x * l + px, cy + a.y * l + py); ctx.lineTo(cx + a.x * l - px, cy + a.y * l - py); ctx.lineTo(cx - px, cy - py); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (tele.type === "beam") {
      const ex = cx + Math.cos(tele.angle) * tele.length * s, ey = cy + Math.sin(tele.angle) * tele.length * s;
      if (tele.charging) { ctx.strokeStyle = c + "99"; ctx.lineWidth = Math.max(1, s * .04 * pulse); ctx.setLineDash([s * .2, s * .12]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]); }
      else { const bc = tele.laser ? "#ff3a2a" : c; for (const [w, a] of [[.55, "33"], [.3, "88"], [.12, "ff"]]) { ctx.strokeStyle = (w < .2 ? "#ffffff" : bc) + a; ctx.lineWidth = s * w * (.9 + pulse * .2); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke(); } glow(ctx, ex, ey, s * .45, bc, .7); }
    } else if (tele.type === "circle") { drawWarningCircle(ctx, (tele.x + .5) * s, (tele.y + .6) * s, tele.radius * s, tele.erupt ? "#e0b071" : c, pulse, 1 - Math.max(0, tele.left ?? e.pack.t) / (tele.total || .75)); }
    else if (tele.type === "blink") { const bx = (tele.x + .5) * s, by = (tele.y + .6) * s; glow(ctx, bx, by - s * .2, s * .6, c, .6 * pulse); ctx.strokeStyle = c + "cc"; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(bx, by, s * (.25 + i * .15) * pulse, s * (.12 + i * .07) * pulse, 0, 0, TAU); ctx.stroke(); } }
    else if (tele.type === "lane") { const a = tele.aim, w = tele.width * s, px = -a.y * w, py = a.x * w, l = tele.length * s; ctx.fillStyle = tele.phase ? c + "22" : "#c0404030"; ctx.strokeStyle = tele.phase ? c + "cc" : "#ff9a7acc"; ctx.lineWidth = 2; if (tele.phase) ctx.setLineDash([s * .18, s * .1]); ctx.beginPath(); ctx.moveTo(cx + px, cy + py); ctx.lineTo(cx + a.x * l + px, cy + a.y * l + py); ctx.lineTo(cx + a.x * l - px, cy + a.y * l - py); ctx.lineTo(cx - px, cy - py); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); for (let i = 1; i < 5; i++) { const f = ((now / 400 + i / 5) % 1) * l; ctx.fillStyle = "#ffd2a0aa"; ctx.beginPath(); ctx.moveTo(cx + a.x * (f + s * .2), cy + a.y * (f + s * .2)); ctx.lineTo(cx + a.x * f + px * .6, cy + a.y * f + py * .6); ctx.lineTo(cx + a.x * f - px * .6, cy + a.y * f - py * .6); ctx.fill(); } }
    else if (tele.type === "ring" && tele.inhale) { ctx.strokeStyle = "#ff4a4a88"; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const rr = tele.radius * s * (1 - ((now / 900 + i / 3) % 1)); ctx.beginPath(); ctx.ellipse(cx, cy + s * .15, rr, rr * .6, 0, 0, TAU); ctx.stroke(); } }
    else if (tele.type === "ring") { ctx.strokeStyle = "#ffd25a99"; ctx.lineWidth = 2; ctx.setLineDash([s * .15, s * .1]); ctx.beginPath(); ctx.ellipse(cx, cy + s * .15, tele.radius * s, tele.radius * s * .7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    else if (tele.type === "shadow") { const sx = (tele.x + .5) * s, sy = (tele.y + .6) * s; ctx.fillStyle = tele.locked ? "#3a0d06aa" : "#1a0a0688"; ctx.beginPath(); ctx.ellipse(sx, sy, s * 1.6, s * 1.6 * .6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = tele.locked ? "#ffc35aee" : "#ffc35a77"; ctx.lineWidth = tele.locked ? 3 : 2; ctx.stroke(); }
    else if (tele.type === "spit") { ctx.strokeStyle = "#e7d6f2aa"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo((tele.target.x + .5) * s, (tele.target.y + .6) * s); ctx.stroke(); ctx.setLineDash([]); }
    else if (tele.type === "tendrils") { for (const a of tele.dirs) { const w = tele.width * s, px = -a.y * w, py = a.x * w, l = tele.length * s; ctx.fillStyle = tele.flesh ? "#c0604026" : "#7ac04a26"; ctx.strokeStyle = tele.flesh ? "#ffb08acc" : "#c8ff6acc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + px, cy + py); ctx.lineTo(cx + a.x * l + px, cy + a.y * l + py); ctx.lineTo(cx + a.x * l - px, cy + a.y * l - py); ctx.lineTo(cx - px, cy - py); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    else if (tele.type === "cone") { const a = Math.atan2(tele.aim.y, tele.aim.x), half = tele.arc * Math.PI / 360, l = tele.length * s; ctx.fillStyle = tele.gas ? "#b8e04a2a" : tele.lava ? "#ff6a1a2a" : "#c0404030"; ctx.strokeStyle = tele.gas ? "#d8ff6acc" : tele.lava ? "#ffb04acc" : "#ff9a7acc"; ctx.lineWidth = 2; ctx.setLineDash([s * .18, s * .1]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, l, a - half, a + half); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); }
    else if (tele.type === "brace" || tele.type === "shimmer" || tele.type === "rise" || tele.type === "submerge") { glow(ctx, cx, cy, s * .9, c, .35 * pulse); }
    ctx.restore();
  }
}

function drawWarningCircle(ctx, x, y, r, color, pulse, progress = 0) {
  ctx.fillStyle = color + "2a"; ctx.strokeStyle = color + "dd"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.fill(); ctx.stroke();
  const inner = Math.max(0, Math.min(1, progress)); ctx.fillStyle = color + "55"; ctx.beginPath(); ctx.ellipse(x, y, r * inner, r * .6 * inner, 0, 0, TAU); ctx.fill();
}

// Ground effects (mortars, sigils, ruptures, webs, embers, shockwaves, dust).
// Puddles and clouds lie on the ground they cover, so they are drawn raised with it (`lift`, in tiles; release 237).
const ON_GROUND = new Set(["ooze", "lava", "gas", "web", "flesh"]);
function lavaCool(f, life) { return 1 - Math.max(0, Math.min(1, life / (f.total || 1.8))); }
function lavaShape(ctx, f, x, y, r, k) {
  const seed = f.x * 7.3 + f.y * 3.1, vx = f.vx || 0, vy = f.vy || 0, m = Math.hypot(vx, vy) || 1, ax = vx / m, ay = vy / m;
  ctx.beginPath(); for (let i = 0; i <= 18; i++) { const a = i / 18 * TAU, along = Math.cos(a) * ax + Math.sin(a) * ay, rr = r * k * (1 + .14 * Math.sin(a * 3 + seed) + .08 * Math.sin(a * 5 - seed) + .3 * Math.max(0, along)); i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .6) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .6); } ctx.closePath();
}
export function drawPackEffects(ctx, effects, s, now, visible = () => true, lift = () => 0) {
  // Release r237-74592043bc57: the glow and dark rims of every settled lava pool first, so pools that touch read as one spill.
  for (const f of effects || []) {
    if (f.kind !== "lava" || f.arming > 0 || !visible(f)) continue;
    const x = (f.x + .5) * s, y = (f.y + .62 - (Number(lift(f)) || 0)) * s, r = (f.radius || 1) * s, life = Math.max(0, f.life ?? 0), cool = lavaCool(f, life);
    ctx.save(); ctx.globalAlpha = Math.min(1, life * 2.5); glow(ctx, x, y, r * 1.7, "#ff5a1a", .35 * (1 - cool)); lavaShape(ctx, f, x, y, r, 1.08); ctx.fillStyle = cool > .6 ? "#2a1a14" : "#5a1408"; ctx.fill(); ctx.restore();
  }
  for (const f of effects || []) {
    if (!visible(f)) continue;
    const x = (f.x + .5) * s, y = (f.y + .62 - (ON_GROUND.has(f.kind) ? Number(lift(f)) || 0 : 0)) * s, r = (f.radius || 1) * s, pulse = .6 + Math.sin(now / 80) * .25;
    ctx.save();
    if (f.arming > 0) {
      const total = f.armTotal ??= f.arming, progress = 1 - f.arming / total;
      if (f.kind === "web") { drawWeb(ctx, x, y, r, .5 * progress); }
      else if (f.kind === "sigil" || f.kind === "condemn") { drawSigil(ctx, x, y, r, f.kind === "condemn" ? "#9dff8a" : "#7fe7ff", now, progress); }
      else if (f.kind === "ooze") { const fx = ((f.from?.x ?? f.x) + .5) * s, fy = ((f.from?.y ?? f.y) + .3) * s, bx = fx + (x - fx) * progress, by = fy + (y - fy) * progress - Math.sin(progress * Math.PI) * s * 1.1; ctx.fillStyle = "#5fbf6e"; ctx.beginPath(); ctx.ellipse(bx, by, s * .16, s * .13, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#f4ffe8aa"; ctx.beginPath(); ctx.arc(bx - s * .05, by - s * .04, s * .04, 0, TAU); ctx.fill(); ctx.strokeStyle = "#c8ff6a55"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.stroke(); }
      else if (f.kind === "lava") { const fx = ((f.from?.x ?? f.x) + .5) * s, fy = ((f.from?.y ?? f.y) + .1) * s, bx = fx + (x - fx) * progress, by = fy + (y - fy) * progress - Math.sin(progress * Math.PI) * s * .5; glow(ctx, bx, by, s * .35, "#ff7a2a", .7); ctx.fillStyle = "#ffd25a"; ctx.beginPath(); ctx.ellipse(bx, by, s * .14, s * .11, 0, 0, TAU); ctx.fill(); }
      else if (f.kind === "mortar" || f.kind === "lavaBomb") { drawWarningCircle(ctx, x, y, r, f.kind === "lavaBomb" ? "#ff5a2a" : "#ff9d4a", pulse, progress); if (f.from) { const fx = (f.from.x + .5) * s, fy = (f.from.y + .3) * s, k = progress, sx = fx + (x - fx) * k, sy = fy + (y - fy) * k - Math.sin(k * Math.PI) * s * 2.2; if (f.rock) { ctx.fillStyle = "#6a5238"; ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + k * 6, rr = s * (.22 + .05 * Math.sin(i * 2.3)); i ? ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr) : ctx.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#2a1c12"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = "#b9a184"; ctx.beginPath(); ctx.arc(sx - s * .06, sy - s * .07, s * .05, 0, TAU); ctx.fill(); } else { ctx.fillStyle = "#2a1c12"; ctx.beginPath(); ctx.arc(sx, sy, s * .14, 0, TAU); ctx.fill(); glow(ctx, sx, sy, s * .3, "#ff9d4a", .6); } } }
      else drawWarningCircle(ctx, x, y, r, f.kind === "ember" ? "#ffc35a" : f.kind === "rupture" ? "#e0b071" : "#ff7a6b", pulse, progress);
    } else {
      const life = Math.max(0, f.life ?? 0);
      if (f.kind === "web") drawWeb(ctx, x, y, r, Math.min(.85, life));
      else if (f.kind === "ooze") { ctx.globalAlpha = Math.min(1, life); const g = ctx.createRadialGradient(x - r * .3, y - r * .2, r * .1, x, y, r); g.addColorStop(0, "#c8ff8acc"); g.addColorStop(.5, "#4fa85ecc"); g.addColorStop(1, "#143a1d99"); ctx.fillStyle = g; ctx.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * TAU, rr = r * (1 + .1 * Math.sin(a * 3 + (f.x + f.y) * 7)); i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .55) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .55); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#f4ffe866"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x - r * .25, y - r * .15, r * .3, r * .1, -.2, Math.PI, TAU); ctx.stroke(); const bub = (now / 700 + f.x) % 1; ctx.strokeStyle = `rgba(230,255,200,${.6 * (1 - bub)})`; ctx.beginPath(); ctx.arc(x + Math.sin(f.y * 9) * r * .4, y - bub * r * .3, r * .1 * (.5 + bub), 0, TAU); ctx.stroke(); }
      else if (f.kind === "lava") { // release 237: the molten top of a spilled tongue of lava (its rim is drawn for all lava first, so touching pools run together)
        const cool = lavaCool(f, life); ctx.globalAlpha = Math.min(1, life * 2.5);
        lavaShape(ctx, f, x, y, r, .86); const g = ctx.createRadialGradient(x, y - r * .1, r * .05, x, y, r); g.addColorStop(0, cool > .7 ? "#7a3a1a" : "#fff0a0"); g.addColorStop(.4, cool > .7 ? "#5a2a14" : "#ffb02a"); g.addColorStop(1, cool > .7 ? "#3a2018" : "#e8480e"); ctx.fillStyle = g; ctx.fill();
        const seed = f.x * 7.3 + f.y * 3.1;
        if (cool > .35) { ctx.globalAlpha *= Math.min(1, (cool - .35) * 2); ctx.strokeStyle = "#1a100c"; ctx.lineWidth = Math.max(1, s * .04); for (let i = 0; i < 4; i++) { const a = seed + i * 1.6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * .15, y + Math.sin(a) * r * .1); ctx.lineTo(x + Math.cos(a + .4) * r * .6, y + Math.sin(a + .4) * r * .35); ctx.stroke(); } } // the crust cracking as it cools
        else { const b = (now / 500 + seed) % 1; ctx.fillStyle = `rgba(255,250,200,${.8 * (1 - b)})`; ctx.beginPath(); ctx.arc(x + Math.sin(seed) * r * .3, y - b * r * .2, r * .08 * (1 + b), 0, TAU); ctx.fill(); } // a bubble bursting
      }
      else if (f.kind === "gas") { ctx.globalAlpha = Math.min(.85, life * .6); for (let i = 0; i < 4; i++) { const a = i * 1.7 + now / 900, gx = x + Math.cos(a) * r * .35, gy = y - s * .2 + Math.sin(a) * r * .2, g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * .9); g.addColorStop(0, "#d8ef6a66"); g.addColorStop(.6, "#9ac04a33"); g.addColorStop(1, "#6a903a00"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(gx, gy, r * .9, r * .65, 0, 0, TAU); ctx.fill(); } }
      else if (f.kind === "flesh") { ctx.globalAlpha = Math.min(.9, life); ctx.fillStyle = "#7a1f2a99"; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.fill(); for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + now / 900, rr = r * (.4 + ((i * 37) % 10) / 20); ctx.fillStyle = i % 2 ? "#c98a86" : "#3a0d12"; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .6, s * .09, s * .05 * (1 + Math.sin(now / 200 + i) * .3), a, 0, TAU); ctx.fill(); } }
      else if (f.kind === "orb" && f.fire) { const vx = f.vx || 0, vy = f.vy || 0, m = Math.hypot(vx, vy) || 1, oy = y - s * .3; for (let i = 3; i >= 1; i--) { ctx.fillStyle = `rgba(255,${90 + i * 30},40,${.5 / i})`; ctx.beginPath(); ctx.arc(x - vx / m * r * i * .9, oy - vy / m * r * i * .9, r * (1 - i * .15), 0, TAU); ctx.fill(); } glow(ctx, x, oy, r * 2, "#ff7a2a", .75); ctx.fillStyle = "#ffe6a0"; ctx.beginPath(); ctx.arc(x, oy, r * .5, 0, TAU); ctx.fill(); } // release 237: a worm tentacle's fireball
      else if (f.kind === "orb") { const vx = f.vx || 0, vy = f.vy || 0, m = Math.hypot(vx, vy) || 1, oy = y - s * .3; ctx.strokeStyle = "#ff4a3a66"; ctx.lineWidth = r * 1.1; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - vx / m * r * 2.2, oy - vy / m * r * 2.2); ctx.lineTo(x, oy); ctx.stroke(); glow(ctx, x, oy, r * 2.2, "#ff4a3a", .7); ctx.fillStyle = "#ffd9b8"; ctx.beginPath(); ctx.arc(x, oy, r * .55, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x - r * .12, oy - r * .12, r * .22, 0, TAU); ctx.fill(); }
      else if (f.kind === "shock" && f.energy) { const rr = (f.ring ?? 0) * s; ctx.strokeStyle = "#ff4a3a55"; ctx.lineWidth = Math.max(6, s * .5); ctx.beginPath(); ctx.ellipse(x, y - s * .1, rr, rr * .6, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = "#ffb08aee"; ctx.lineWidth = Math.max(2, s * .16); ctx.stroke(); ctx.strokeStyle = "#fff4e8"; ctx.lineWidth = Math.max(1, s * .05); ctx.stroke(); }
      else if (f.kind === "shock") { const rr = (f.ring ?? 0) * s; ctx.strokeStyle = "#ffe08acc"; ctx.lineWidth = Math.max(2, s * .18); ctx.beginPath(); ctx.ellipse(x, y - s * .1, rr, rr * .6, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = "#ffffff88"; ctx.lineWidth = Math.max(1, s * .05); ctx.stroke(); }
      else if (f.kind === "blinkTrail") { glow(ctx, x, y - s * .3, r, "#c58cff", Math.min(.7, life * 2)); }
      else if (f.kind === "dust" || f.kind === "crash") { ctx.globalAlpha = Math.min(1, life * 2); for (let i = 0; i < 10; i++) { const a = i * TAU / 10, d = r * (1 - life * .8); ctx.fillStyle = f.kind === "crash" ? "#ffb04acc" : "#b9a184aa"; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .6, s * .09, 0, TAU); ctx.fill(); } }
      else { ctx.globalAlpha = Math.min(1, life * 2.5); const c = f.kind === "ember" ? "#ffc35a" : f.kind === "lavaBomb" ? "#ff5a2a" : f.kind === "mortar" ? "#ff9d4a" : f.kind === "condemn" ? "#9dff8a" : f.kind === "sigil" ? "#7fe7ff" : "#e0b071"; glow(ctx, x, y, r * 1.2, c, .8); ctx.strokeStyle = "#fff3d0"; ctx.lineWidth = Math.max(1, s * .05); for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + now / 300; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * .6 - s * .3); ctx.stroke(); } }
    }
    ctx.restore();
  }
}

function drawSigil(ctx, x, y, r, color, now, progress) {
  ctx.strokeStyle = color + "cc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.stroke();
  ctx.save(); ctx.translate(x, y); ctx.scale(1, .6); ctx.rotate(now / 600);
  ctx.strokeStyle = color + "aa"; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= 5; i++) { const a = i * TAU * 2 / 5; const px = Math.cos(a) * r * .8, py = Math.sin(a) * r * .8; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke();
  ctx.restore();
  ctx.fillStyle = color + "40"; ctx.beginPath(); ctx.ellipse(x, y, r * progress, r * .6 * progress, 0, 0, TAU); ctx.fill();
}

function drawWeb(ctx, x, y, r, alpha) {
  ctx.globalAlpha = alpha; ctx.strokeStyle = "#e7e0f0"; ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * .6); ctx.stroke(); }
  for (let ring = 1; ring <= 3; ring++) { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * TAU / 8, rr = r * ring / 3.2; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * .6; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); }
  ctx.globalAlpha = 1;
}

// Bestiary portrait: the same field art, framed on a small canvas.
export function drawPackPortrait(ctx, kind, size, now = 0) {
  if (!isPackKind(kind)) return false;
  const def = MONSTER_PACK[kind], tile = size / (1.6 + (def.form.scale || 1) * .9);
  ctx.save(); ctx.clearRect(0, 0, size, size);
  const bg = ctx.createRadialGradient(size / 2, size * .55, size * .05, size / 2, size * .55, size * .7); bg.addColorStop(0, def.palette[2] + "33"); bg.addColorStop(1, "#0b0a0d00"); ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
  paintPackMonster(ctx, { id: `portrait-${kind}`, kind, x: size / tile / 2 - .5, y: size / tile * .62 - .82, scale: def.form.scale || 1, facingX: 1, pack: null }, tile, now, "down", def, false);
  ctx.restore(); return true;
}
