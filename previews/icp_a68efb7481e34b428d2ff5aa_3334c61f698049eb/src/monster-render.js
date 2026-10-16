// High-fidelity drawing for the Dungeon Monster Pack: layered gradients, rim light, animated
// limbs and emissive details, plus every pack telegraph and ground effect. Pure canvas calls;
// no images, so it scales cleanly with the device pixel ratio.
import { MONSTER_PACK, isPackKind } from "./monster-pack.js?v=icp_a68efb7481e34b428d2ff5aa_3334c61f698049eb";

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
  // The Questing Beast (release 116): a hunched, horned, winged brute. Spines are pale when fresh, black when it is
  // enraged (below half health); a spent volley leaves its back bare for a moment.
  questingBeast(ctx, q) {
    const { k, b, u, t, p, flip, state, e } = q, enraged = e.hp <= e.maxHp * .5, step = t * (enraged ? 7 : 5), rear = state === "windup";
    const spine = enraged ? "#16121a" : p[3], tip = enraged ? p[2] : "#c9c0b0", lift = rear ? u * .1 : 0;
    if (enraged) glow(ctx, k, b - u * .55, u * 1.1, p[2], .16 + .06 * Math.sin(t * 9));
    shadowAt(ctx, k, b, u * .75, u * .18);
    // hind legs
    for (const lx of [-.42, -.22]) { const ph = Math.sin(step + lx * 9) * u * .05; ctx.fillStyle = shade(ctx, k - flip * lx * u, b - u * .25, u * .2, p[0], p[1]); ctx.fillRect(k + flip * lx * u - u * .08, b - u * .36, u * .16, u * .34 + ph); }
    // body
    const bx = k - flip * u * .12, by = b - u * .62 - lift;
    ctx.beginPath(); ctx.ellipse(bx, by, u * .6, u * .34, -flip * .18, 0, TAU); ctx.fillStyle = shade(ctx, bx, by, u * .6, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1.5, u * .04));
    // back spines
    if (!e.spikesSpent || state !== "attack") for (let i = 0; i < 7; i++) {
      const x = bx - flip * u * .45 + flip * i * u * .14, y = by - u * .28 + Math.abs(i - 3) * u * .025, h = u * (.2 + (i % 2) * .08);
      ctx.beginPath(); ctx.moveTo(x - u * .05, y); ctx.lineTo(x - flip * u * .06, y - h); ctx.lineTo(x + u * .05, y); ctx.closePath(); ctx.fillStyle = spine; ctx.fill(); outline(ctx, Math.max(1, u * .02)); ctx.fillStyle = tip; ctx.fillRect(x - flip * u * .06 - u * .015, y - h, u * .03, u * .05);
    }
    // folded wing-arms with spine rows
    for (const side of [-1, 1]) {
      const wx = bx + side * u * .18, wy = by - u * .12 - lift * .5, sweep = rear ? -.5 : Math.sin(step * .5) * .08;
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx - flip * u * .55, wy - u * (.45 - sweep)); ctx.lineTo(wx - flip * u * .75, wy - u * .05); ctx.closePath();
      ctx.fillStyle = side < 0 ? p[1] : shade(ctx, wx, wy, u * .5, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1, u * .03));
      for (let j = 1; j <= 4; j++) { const sx = wx - flip * u * .14 * j, sy = wy - u * (.11 - sweep * .25) * j; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - flip * u * .08, sy - u * .13); ctx.lineTo(sx + flip * u * .03, sy - u * .02); ctx.closePath(); ctx.fillStyle = spine; ctx.fill(); }
    }
    // heavy forelimbs (raised when rearing to slam)
    for (const lx of [.25, .45]) { const ph = Math.sin(step + lx * 7) * u * .06, up = rear ? u * .22 : 0; ctx.fillStyle = shade(ctx, k + flip * lx * u, b - u * .3, u * .24, p[0], p[1]); ctx.beginPath(); ctx.ellipse(k + flip * lx * u, b - u * .3 - up + ph * .5, u * .1, u * .22, 0, 0, TAU); ctx.fill(); outline(ctx, Math.max(1, u * .025)); ctx.fillStyle = "#0d0b0f"; for (let c = -1; c <= 1; c++) ctx.fillRect(k + flip * lx * u + c * u * .05 - u * .015, b - u * .1 - up + ph * .5, u * .03, u * .08); }
    // head and horns
    const hx = bx + flip * u * .62, hy = by + u * .02 - lift * .6;
    ctx.beginPath(); ctx.ellipse(hx, hy, u * .24, u * .19, flip * .2, 0, TAU); ctx.fillStyle = shade(ctx, hx, hy, u * .24, p[0], p[1]); ctx.fill(); outline(ctx, Math.max(1, u * .035));
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx - flip * u * .05, hy - u * .12 + side * u * .02); ctx.quadraticCurveTo(hx - flip * u * .2, hy - u * .55, hx + flip * u * .22, hy - u * (.42 + side * .06)); ctx.lineWidth = Math.max(2, u * .07); ctx.strokeStyle = side < 0 ? "#2a2530" : p[3]; ctx.stroke(); }
    ctx.fillStyle = "#0d0b0f"; ctx.fillRect(hx + flip * u * .08, hy + u * .06, flip * u * .16, u * .05); // jaw
    eye(ctx, hx + flip * u * .1, hy - u * .04, Math.max(1.5, u * .035), p[2]);
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

// Draw one pack creature at its world position (s = tile size in pixels).
export function drawPackMonster(ctx, e, s, now, facing = "down") {
  const def = MONSTER_PACK[e.kind];
  if (!def) return false;
  const scale = Math.max(.6, Number(e.scale) || 1), u = s * scale, k = (e.x + .5) * s, b = (e.y + .82) * s - (e.hopLift || 0) * s * .2, t = now / 1000 + ((e.id?.length || 3) * 1.7);
  const flip = e.facingX ? (e.facingX < 0 ? -1 : 1) : facing === "left" ? -1 : 1, s0 = e.pack;
  const state = s0?.attack ? (s0.phase === "windup" ? "windup" : "attack") : "idle";
  const q = { k, b, u, t, p: def.palette, flip, e, state };
  ctx.save();
  if (e.phasing || (e.phases && e.untargetable)) ctx.globalAlpha = .45;
  if (e.aloft && e.kind === "cinderSeraph") { ctx.globalAlpha = .35; q.b -= u * .9; }
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
      else { for (const [w, a] of [[.55, "33"], [.3, "88"], [.12, "ff"]]) { ctx.strokeStyle = (w < .2 ? "#ffffff" : c) + a; ctx.lineWidth = s * w * (.9 + pulse * .2); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke(); } glow(ctx, ex, ey, s * .45, c, .7); }
    } else if (tele.type === "circle") { drawWarningCircle(ctx, (tele.x + .5) * s, (tele.y + .6) * s, tele.radius * s, tele.erupt ? "#e0b071" : c, pulse, 1 - Math.max(0, e.pack.t) / .75); }
    else if (tele.type === "blink") { const bx = (tele.x + .5) * s, by = (tele.y + .6) * s; glow(ctx, bx, by - s * .2, s * .6, c, .6 * pulse); ctx.strokeStyle = c + "cc"; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(bx, by, s * (.25 + i * .15) * pulse, s * (.12 + i * .07) * pulse, 0, 0, TAU); ctx.stroke(); } }
    else if (tele.type === "lane") { const a = tele.aim, w = tele.width * s, px = -a.y * w, py = a.x * w, l = tele.length * s; ctx.fillStyle = tele.phase ? c + "22" : "#c0404030"; ctx.strokeStyle = tele.phase ? c + "cc" : "#ff9a7acc"; ctx.lineWidth = 2; if (tele.phase) ctx.setLineDash([s * .18, s * .1]); ctx.beginPath(); ctx.moveTo(cx + px, cy + py); ctx.lineTo(cx + a.x * l + px, cy + a.y * l + py); ctx.lineTo(cx + a.x * l - px, cy + a.y * l - py); ctx.lineTo(cx - px, cy - py); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); for (let i = 1; i < 5; i++) { const f = ((now / 400 + i / 5) % 1) * l; ctx.fillStyle = "#ffd2a0aa"; ctx.beginPath(); ctx.moveTo(cx + a.x * (f + s * .2), cy + a.y * (f + s * .2)); ctx.lineTo(cx + a.x * f + px * .6, cy + a.y * f + py * .6); ctx.lineTo(cx + a.x * f - px * .6, cy + a.y * f - py * .6); ctx.fill(); } }
    else if (tele.type === "ring" && tele.inhale) { ctx.strokeStyle = "#ff4a4a88"; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const rr = tele.radius * s * (1 - ((now / 900 + i / 3) % 1)); ctx.beginPath(); ctx.ellipse(cx, cy + s * .15, rr, rr * .6, 0, 0, TAU); ctx.stroke(); } }
    else if (tele.type === "ring") { ctx.strokeStyle = "#ffd25a99"; ctx.lineWidth = 2; ctx.setLineDash([s * .15, s * .1]); ctx.beginPath(); ctx.ellipse(cx, cy + s * .15, tele.radius * s, tele.radius * s * .7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    else if (tele.type === "shadow") { const sx = (tele.x + .5) * s, sy = (tele.y + .6) * s; ctx.fillStyle = tele.locked ? "#3a0d06aa" : "#1a0a0688"; ctx.beginPath(); ctx.ellipse(sx, sy, s * 1.6, s * 1.6 * .6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = tele.locked ? "#ffc35aee" : "#ffc35a77"; ctx.lineWidth = tele.locked ? 3 : 2; ctx.stroke(); }
    else if (tele.type === "spit") { ctx.strokeStyle = "#e7d6f2aa"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo((tele.target.x + .5) * s, (tele.target.y + .6) * s); ctx.stroke(); ctx.setLineDash([]); }
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
export function drawPackEffects(ctx, effects, s, now, visible = () => true) {
  for (const f of effects || []) {
    if (!visible(f)) continue;
    const x = (f.x + .5) * s, y = (f.y + .62) * s, r = (f.radius || 1) * s, pulse = .6 + Math.sin(now / 80) * .25;
    ctx.save();
    if (f.arming > 0) {
      const total = f.armTotal ??= f.arming, progress = 1 - f.arming / total;
      if (f.kind === "web") { drawWeb(ctx, x, y, r, .5 * progress); }
      else if (f.kind === "sigil" || f.kind === "condemn") { drawSigil(ctx, x, y, r, f.kind === "condemn" ? "#9dff8a" : "#7fe7ff", now, progress); }
      else if (f.kind === "mortar" || f.kind === "lavaBomb") { drawWarningCircle(ctx, x, y, r, f.kind === "lavaBomb" ? "#ff5a2a" : "#ff9d4a", pulse, progress); if (f.from) { const fx = (f.from.x + .5) * s, fy = (f.from.y + .3) * s, k = progress, sx = fx + (x - fx) * k, sy = fy + (y - fy) * k - Math.sin(k * Math.PI) * s * 2.2; ctx.fillStyle = "#2a1c12"; ctx.beginPath(); ctx.arc(sx, sy, s * .14, 0, TAU); ctx.fill(); glow(ctx, sx, sy, s * .3, "#ff9d4a", .6); } }
      else drawWarningCircle(ctx, x, y, r, f.kind === "ember" ? "#ffc35a" : f.kind === "rupture" ? "#e0b071" : "#ff7a6b", pulse, progress);
    } else {
      const life = Math.max(0, f.life ?? 0);
      if (f.kind === "web") drawWeb(ctx, x, y, r, Math.min(.85, life));
      else if (f.kind === "flesh") { ctx.globalAlpha = Math.min(.9, life); ctx.fillStyle = "#7a1f2a99"; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.fill(); for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + now / 900, rr = r * (.4 + ((i * 37) % 10) / 20); ctx.fillStyle = i % 2 ? "#c98a86" : "#3a0d12"; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .6, s * .09, s * .05 * (1 + Math.sin(now / 200 + i) * .3), a, 0, TAU); ctx.fill(); } }
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
  drawPackMonster(ctx, { id: `portrait-${kind}`, kind, x: size / tile / 2 - .5, y: size / tile * .62 - .82, scale: def.form.scale || 1, facingX: 1, pack: null }, tile, now);
  ctx.restore(); return true;
}
