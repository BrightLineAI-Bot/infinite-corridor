// High-fidelity drawing for the Dungeon Monster Pack: layered gradients, rim light, animated
// limbs and emissive details, plus every pack telegraph and ground effect. Pure canvas calls;
// no images, so it scales cleanly with the device pixel ratio.
import { MONSTER_PACK, isPackKind, BLOB, WORM, CRYSTAL, VOID, TURTLE, DANGER, effectFootprint, bodyHitFootprint } from "./monster-pack.js?v=r439-a6fb9615c252";
import { MORPH_FORM, beamAngle } from "./listener-morph.js?v=r439-a6fb9615c252";

import { drawAstralMorph, drawAstralHazards, drawAstralSaddle, drawAstralInkBlobs, drawAstralBeam, drawAstralBoarding, astralBoardingRiderAlpha } from "./astral-worm-render.js?v=r439-a6fb9615c252";

import { astralMountPresentation } from "./astral-worm-mount.js?v=r439-a6fb9615c252";
import { drawLightningGiant, drawGiantCloud, drawGiantEffect, GIANT_EFFECT_KINDS } from "./lightning-giant-render.js?v=r439-a6fb9615c252";
import { ASTRAL, astralBeamAnchors } from "./astral-worm.js?v=r439-a6fb9615c252";

import { liftAt, LIFT_PER_LEVEL } from "./landscape.js?v=r439-a6fb9615c252";

const TAU = Math.PI * 2;

// A spatially smooth flight height: rise before a cliff and descend after clearing it. Unlike lagging temporal
// easing this never sinks into higher ground, needs no saved state, and follows the same position while paused.
export function crystalFlightLift(map, width, x, y) {
  if (!map?.landscape) return 0;
  const px = x + .5, py = y + .75, tx = Math.floor(px), ty = Math.floor(py), height = Math.floor(map.tiles.length / width), reach = CRYSTAL.terrainLookahead;
  let lift = Math.max(0, liftAt(map, width, x, y));
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const ix = tx + dx, iy = ty + dy;
    if (ix < 0 || iy < 0 || ix >= width || iy >= height) continue;
    const tile = map.tiles[iy * width + ix], d = Math.hypot(Math.max(ix - px, 0, px - ix - 1), Math.max(iy - py, 0, py - iy - 1));
    if (!tile || d >= reach) continue;
    const k = d / reach, weight = 1 - k * k * (3 - 2 * k);
    lift = Math.max(lift, ((tile.elev || 0) - (tile.slope ? .5 : 0)) * LIFT_PER_LEVEL * weight);
  }
  return lift;
}

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

// A personal skiff, only 1.12 tiles long: no ship-sized hull, inventory, sail or player-boat state.
// The rear deck goes below the unchanged player-scale body; the near gunwale finishes in front of its boots.
function drawWalkerSkiff(ctx, q, foreground = false) {
  const { k, b, u, e, flip } = q, quiet = !!e.reduceMotion, time = quiet ? 0 : q.t;
  const X = x => k + flip * x * u, Y = y => b + y * u;
  const hull = () => { ctx.beginPath(); ctx.moveTo(X(-.56), Y(-.015)); ctx.quadraticCurveTo(X(-.39), Y(.17), X(.34), Y(.15)); ctx.lineTo(X(.56), Y(-.045)); ctx.quadraticCurveTo(X(.13), Y(.025), X(-.56), Y(-.015)); ctx.closePath(); };
  ctx.save(); if (e.voidTeleport > 0 || e.pack?.phase === "teleport") ctx.globalAlpha *= .64;
  const alpha = ctx.globalAlpha;
  if (!foreground) {
    ctx.strokeStyle = "#a8e6ec66"; ctx.lineWidth = Math.max(.8, u * .012);
    for (let i = 0; i < 2; i++) { const phase = quiet ? .35 + i * .3 : (time * .35 + i * .5) % 1; ctx.globalAlpha *= .8; ctx.beginPath(); ctx.ellipse(k - flip * u * .05, Y(.11), u * (.57 + phase * .15), u * (.12 + phase * .07), 0, .08, Math.PI - .08); ctx.stroke(); }
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.moveTo(X(-.56), Y(-.015)); ctx.quadraticCurveTo(X(-.26), Y(-.21), X(.56), Y(-.045)); ctx.quadraticCurveTo(X(.18), Y(.095), X(-.56), Y(-.015)); ctx.closePath();
    ctx.fillStyle = "#564850"; ctx.fill(); ctx.strokeStyle = "#c3a897"; ctx.lineWidth = Math.max(.9, u * .018); ctx.stroke();
    ctx.strokeStyle = "#211c2a"; ctx.lineWidth = Math.max(.7, u * .012);
    for (const x of [-.3, .28]) { ctx.beginPath(); ctx.moveTo(X(x), Y(-.115)); ctx.lineTo(X(x + .04), Y(.035)); ctx.stroke(); }
    ctx.strokeStyle = "#8f7581"; ctx.beginPath(); ctx.moveTo(X(-.4), Y(-.035)); ctx.lineTo(X(.4), Y(-.045)); ctx.stroke();
  } else {
    hull(); const wood = ctx.createLinearGradient(k, Y(-.02), k, Y(.16)); wood.addColorStop(0, "#73606a"); wood.addColorStop(.45, "#45333f"); wood.addColorStop(1, "#211b2c"); ctx.fillStyle = wood; ctx.fill(); ctx.strokeStyle = "#1a1422"; ctx.lineWidth = Math.max(.8, u * .014); ctx.stroke();
    ctx.strokeStyle = "#bda3a6"; ctx.lineWidth = Math.max(1, u * .018); ctx.beginPath(); ctx.moveTo(X(-.55), Y(-.014)); ctx.quadraticCurveTo(X(.05), Y(.06), X(.55), Y(-.044)); ctx.stroke();
    ctx.strokeStyle = "#b48dd166"; ctx.lineWidth = Math.max(.7, u * .01); ctx.beginPath(); ctx.moveTo(X(-.4), Y(.065)); ctx.quadraticCurveTo(X(.04), Y(.13), X(.39), Y(.065)); ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- creatures

const BODY = {
  lightningGiant(ctx, q) { drawLightningGiant(ctx, q, q.t * 1000); },
  astralWorm(ctx,q) { const a=q.e.astral;
    // The downward beam is painted first, behind the mandibles, so it reads as leaving the mouth.
    if(a?.form==='flight'){
      const anchors=astralBeamAnchors({...a,x:q.e.x,y:q.e.y,scale:Math.max(.6,Number(q.e.scale)||1),facingX:q.flip});
      const groundLift=Number(q.e.astralBeamGroundLiftDelta)||0;
      drawAstralBeam(ctx,{x:(anchors.mouth.x+.5)*q.s,y:(anchors.mouth.y+.62)*q.s},{x:(anchors.ground.x+.5)*q.s,y:(anchors.ground.y+.62+groundLift)*q.s},q.u,a.clock||0,!!q.e.reduceMotion);
    }
    drawAstralMorph(ctx,{x:q.k,y:q.b-(a?.form==='flight'?q.u*.8+Math.max(0,Number(a.flightLiftExtra)||0)*q.s:0),scale:q.u*.65,time:a?.clock||0,form:a?.form||'worm',facing:q.flip,alpha:q.e.kind==='astralMirage'?.5:1,reducedMotion:!!q.e.reduceMotion},a?.previousForm||'worm',a?(a.clock-a.morphStart)/ASTRAL.morphTime:1);
  },
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
  // The Void Walker: a Wayfarer-sized traveller, not an armoured boss. Its 0.80-unit body matches the player's
  // hood-to-boot height at scale 1. The small galaxy within the hood hints at its rends; attacks live outside the
  // body, so casting never turns into a giant weapon or a punching animation. Cloth/face detail remains provisional.
  voidWalker(ctx, q) {
    const { k, b, u, p, flip, e, state } = q, s0 = e.pack, quiet = !!e.reduceMotion, t = quiet ? 0 : q.t;
    const dash = !!e.voidDashing || s0?.phase === "dash", teleport = Number(e.voidTeleport) > 0 || s0?.phase === "teleport";
    const boat = !!e.marine, casting = state !== "idle" && !dash && !teleport, moving = !boat && !casting && !dash && !teleport && Math.hypot(s0?.vel?.x || 0, s0?.vel?.y || 0) > .12;
    const stride = quiet || !moving ? 0 : Math.sin(t * 8) * .035, breath = quiet || dash || teleport ? 0 : Math.sin(t * 2) * .006;
    const cloth = p[0] || "#494256", dark = p[1] || "#18151f", violet = p[2] || "#ad7df2", pale = p[3] || "#e5d7ff";
    const X = x => k + flip * x * u, Y = y => b + y * u, lw = Math.max(.65, u * .009);
    const poly = (pts, fill, edge) => { ctx.beginPath(); ctx.moveTo(X(pts[0]), Y(pts[1])); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(X(pts[i]), Y(pts[i + 1])); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = lw; ctx.stroke(); } };
    if (boat) drawWalkerSkiff(ctx, q); else shadowAt(ctx, k, b + u * .025, u * .26, u * .075, teleport ? .23 : .45);
    if (teleport) {
      // A narrow rend behind the traveller: the silhouette remains legible as it slips through.
      glow(ctx, k, Y(-.36), u * .5, violet, quiet ? .22 : .3);
      ctx.fillStyle = "#100a1bcc"; ctx.strokeStyle = violet + "bb"; ctx.lineWidth = Math.max(1, u * .015);
      ctx.beginPath(); ctx.ellipse(k, Y(-.36), u * .23, u * .42, -.08 * flip, 0, TAU); ctx.fill(); ctx.stroke();
      if (!quiet) for (let i = 0; i < 9; i++) { const a = i * 2.399 + t * .4, r = u * (.22 + (i % 3) * .025); ctx.fillStyle = i % 3 ? violet + "77" : pale; ctx.fillRect(k + Math.cos(a) * r, Y(-.36) + Math.sin(a) * u * .38, Math.max(.8, u * .012), Math.max(.8, u * .012)); }
    } else if (casting) glow(ctx, k, Y(-.5), u * .42, violet, state === "windup" ? .19 : .27);
    ctx.save();
    if (teleport) ctx.globalAlpha *= .64;
    if (dash) { ctx.translate(k, b); ctx.transform(1, 0, -flip * .24, 1, 0, 0); ctx.translate(-k, -b); }
    // Familiar Wayfarer proportions: two visible boots beneath a short, split traveller's coat.
    poly([-.19, -.12 - stride, -.075, -.12 - stride, -.07, .04 - stride, -.2, .04 - stride], "#14121b", "#09080d");
    poly([.075, -.12 + stride, .18, -.12 + stride, .2, .04 + stride, .07, .04 + stride], "#1f1b29", "#09080d");
    poly([-.215, -.565 + breath, .205, -.565 + breath, .22, -.09, .075, -.075, .01, -.15, -.055, -.075, -.22, -.09], dark, "#0d0b14");
    // Layered cloth, not segmented plates. The left fold keeps the silhouette readable on dim dungeon floors.
    poly([-.215, -.565 + breath, -.055, -.54 + breath, -.075, -.13, -.19, -.1], cloth);
    poly([-.055, -.54 + breath, .205, -.565 + breath, .17, -.12, .015, -.15], shade(ctx, k, Y(-.4), u * .38, "#373044", dark));
    ctx.strokeStyle = violet + "88"; ctx.lineWidth = Math.max(.8, u * .012); ctx.beginPath(); ctx.moveTo(X(-.2), Y(-.12)); ctx.lineTo(X(-.08), Y(-.1)); ctx.moveTo(X(.045), Y(-.12)); ctx.lineTo(X(.18), Y(-.11)); ctx.stroke();
    // Quiet sleeves stay at its sides even while casting: the rends do the attacking.
    poly([-.21, -.51 + breath, -.15, -.48 + breath, -.18, -.29, -.245, -.3], "#302a3d", "#13101c");
    poly([.17, -.5 + breath, .23, -.49 + breath, .25, -.3, .18, -.29], "#252032", "#13101c");
    poly([.19, -.31, .25, -.31, .245, -.26, .205, -.26], "#171022");
    // Hood top and boots span exactly the same 0.80 tile as the ordinary main character.
    poly([-.18, -.76 + breath, .14, -.76 + breath, .19, -.7 + breath, .18, -.48 + breath, -.17, -.48 + breath, -.2, -.66 + breath], cloth, "#15101f");
    poly([-.18, -.76 + breath, -.04, -.735 + breath, -.105, -.68 + breath, -.145, -.52 + breath, -.18, -.49 + breath, -.2, -.66 + breath], "#5c526f");
    poly([-.04, -.735 + breath, .14, -.76 + breath, .19, -.7 + breath, .145, -.65 + breath], "#655878");
    const face = () => { ctx.beginPath(); ctx.moveTo(X(-.105), Y(-.69 + breath)); ctx.lineTo(X(.125), Y(-.69 + breath)); ctx.lineTo(X(.13), Y(-.54 + breath)); ctx.lineTo(X(-.105), Y(-.535 + breath)); ctx.closePath(); };
    face(); ctx.fillStyle = "#090615"; ctx.fill();
    ctx.save(); face(); ctx.clip();
    // A slanted nebula with tiny stars, not a pair of glowing eyes or a visor.
    const nebula = ctx.createLinearGradient(X(-.1), Y(-.69), X(.14), Y(-.53)); nebula.addColorStop(0, "#140e30"); nebula.addColorStop(.45, "#68419b"); nebula.addColorStop(.57, "#ba91eb"); nebula.addColorStop(.7, "#382355"); nebula.addColorStop(1, "#090615");
    ctx.fillStyle = nebula; ctx.fillRect(k - u * .16, Y(-.7 + breath), u * .32, u * .18);
    ctx.fillStyle = "#0a081575"; ctx.beginPath(); ctx.ellipse(X(.03), Y(-.615 + breath), u * .065, u * .04, -.5 * flip, 0, TAU); ctx.fill();
    for (const [x, y, r] of [[-.075, -.657, .006], [.095, -.665, .009], [.055, -.568, .006], [-.055, -.56, .004]]) { ctx.fillStyle = pale; ctx.beginPath(); ctx.arc(X(x), Y(y + breath), Math.max(.45, u * r), 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = violet + (casting ? "dd" : "77"); ctx.lineWidth = Math.max(.7, u * .009); ctx.beginPath(); ctx.moveTo(X(-.105), Y(-.69 + breath)); ctx.lineTo(X(.125), Y(-.69 + breath)); ctx.lineTo(X(.13), Y(-.54 + breath)); ctx.stroke();
    // One small clasp, never a breastplate/core. Its hue ties the traveller to the cosmic effects.
    poly([.015, -.505 + breath, .038, -.485 + breath, .015, -.46 + breath, -.006, -.485 + breath], violet);
    if (teleport && !quiet) { ctx.strokeStyle = pale + "88"; ctx.lineWidth = Math.max(.8, u * .008); for (let i = 0; i < 4; i++) { const y = -.19 - i * .13, shift = Math.sin(t * 6 + i * 1.8) * .035; ctx.beginPath(); ctx.moveTo(X(-.22 + shift), Y(y)); ctx.lineTo(X(.2 + shift), Y(y - .015)); ctx.stroke(); } }
    ctx.restore();
    if (boat) drawWalkerSkiff(ctx, q, true);
  },
  // The Listener (release 138): a cloaked figure shaped like the Wayfarer, its face a violet void; hidden it fades.
  listener(ctx, q) {
    if (q.e.morphWorm) return drawMorphWorm(ctx, q); // release 385
    if (q.e.listenerPhase === "walled" && q.e.morphScaled) return drawMorphling(ctx, q); // release 385: the Morphling
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
  // Release 237: the Tremor Worm. Under the ground, a mound of heaving earth; up, a ringed column of sand-coloured armour
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
      if (e.fleeTo && e.fleeDir) for (let i = 1; i <= 3; i++) { const hx = k - e.fleeDir.x * R * 1.1 * i, hy = b - u * .04 - e.fleeDir.y * R * .55 * i, rise = Math.max(0, Math.sin(t * 7 - i * 1.3)), hr = R * (.7 - i * .12); ctx.fillStyle = "#c8a274"; ctx.beginPath(); ctx.ellipse(hx, hy - rise * u * .08, hr, hr * .4 * (.5 + rise * .5), 0, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = "#2a1c10aa"; ctx.lineWidth = Math.max(1, u * .015); ctx.stroke(); ctx.fillStyle = "#3a2a1a88"; ctx.beginPath(); ctx.ellipse(hx, hy, hr, hr * .18, 0, 0, Math.PI); ctx.fill(); } // release 239: its back rolls through the ground behind it as it flees
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
  // Release 241: the Mountain Turtle, an ancient tortoise carrying a weathered ziggurat. Flat-shaded and angular (no
  // gradients, so it is cheap to draw every frame): a stepped shell of chiselled terraces, each face split into lit, mid
  // and shadowed facets, cracked and chipped, a crag of a summit with snow, ice crystals growing from the ledges, a tomb
  // door; four faceted pillar legs; a long, folded neck and a wedge of a skull with a heavy, half-closed, impassive eye.
  // Spinning or tucked it draws legs and head in; its ice shield is a faceted dome.
  mountainTurtle(ctx, q) {
    const { k, b, u, t, p, flip, e, state } = q, s0 = e.pack, tucked = !!(e.tucked || e.spinning), W = u * .5, H = u * .5, legH = tucked ? u * .05 : u * .2, base = b - legH;
    const step = t * 2.2, comet = s0?.attack === "turtleComet" && state === "windup";
    const C = { lit: "#9c978a", mid: "#7b776c", dark: "#55524a", deep: "#3a3833", ledge: "#b3ae9f", line: "#2a2824", ice: "#a8dcef", iceLit: "#e4f5fb", iceDark: "#6aa6c4", skin: "#6d6a5f", skinLit: "#8a8679", skinDark: "#48463f" };
    const poly = (pts, fill, stroke) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, u * .006); ctx.stroke(); } };
    const crystal = (x, y, h, lean) => { const w = h * .32; poly([x - w, y, x + lean * h * .3, y - h, x + w, y], C.ice, C.iceDark); poly([x + lean * h * .3, y - h, x + w, y, x + w * .1, y], C.iceLit); }; // a shard: lit face and shade face
    ctx.fillStyle = "rgba(4,4,6,.5)"; ctx.beginPath(); ctx.ellipse(k + flip * W * .2, b, W * 1.3, W * .22, 0, 0, TAU); ctx.fill(); // shadow
    const leg = (x, near, ph) => { // a faceted pillar of a leg, ringed with old folds, on a broad foot
      const lift = tucked ? 0 : Math.max(0, Math.sin(step + ph)) * u * .04, lw = u * (near ? .11 : .095), y0 = base - u * .08, y1 = b - lift;
      poly([x - lw, y0, x - lw * 1.08, y1, x - lw * .1, y1, x - lw * .05, y0], near ? C.skinLit : C.skin, C.line);
      poly([x - lw * .05, y0, x - lw * .1, y1, x + lw * 1.08, y1, x + lw, y0], near ? C.skin : C.skinDark, C.line);
      ctx.strokeStyle = C.line; ctx.lineWidth = Math.max(1, u * .005); for (let i = 1; i < 4; i++) { const yy = y0 + (y1 - y0) * i / 4; ctx.beginPath(); ctx.moveTo(x - lw * 1.04, yy); ctx.lineTo(x - lw * .1, yy + u * .008); ctx.lineTo(x + lw * 1.04, yy - u * .004); ctx.stroke(); }
      poly([x - lw * 1.3, y1, x - lw * 1.1, y1 - u * .035, x + lw * 1.1, y1 - u * .035, x + lw * 1.3, y1], C.skinDark, C.line); // the foot
      ctx.fillStyle = "#b8b29e"; for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * lw * .75 - lw * .14, y1 - u * .012, lw * .28, u * .012); // nails
    };
    if (!tucked) { leg(k - flip * W * .5, false, Math.PI); leg(k + flip * W * .72, false, 0); leg(k - flip * W * .74, true, 0); leg(k + flip * W * .48, true, Math.PI); }
    ctx.save(); ctx.translate(k, base);
    // The ziggurat: four terraces, each face cut into three facets, a lit ledge on top of each, set back as it rises.
    const tiers = 4, th = H * .2, setback = H * .05;
    let y0 = H * .06; const ice = [];
    for (let i = 0; i < tiers; i++) {
      const w0 = W * (1.06 - i * .22), w1 = w0 * .93, y1 = y0 - th, a = w0 * .36, a1 = w1 * .36;
      poly([-w0, y0, -a, y0, -a1, y1, -w1, y1], C.mid, C.line);           // left facet
      poly([-a, y0, a, y0, a1, y1, -a1, y1], C.lit, C.line);              // the face toward the light
      poly([a, y0, w0, y0, w1, y1, a1, y1], C.dark, C.line);              // the shadowed facet
      const nw = W * (1.06 - (i + 1) * .22);
      poly([-w1, y1, w1, y1, nw * 1.0, y1 - setback, -nw * 1.0, y1 - setback], C.ledge, C.line); // the ledge
      ctx.strokeStyle = C.line; ctx.lineWidth = Math.max(1, u * .005); // block joints
      for (let j = -2; j <= 2; j++) { const x = (j + (i % 2) * .5) * w0 * .36; if (Math.abs(x) < w0 * .95) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x * .95, y1); ctx.stroke(); } }
      ctx.beginPath(); ctx.moveTo(-w0 * .98, y0 - th * .5); ctx.lineTo(w0 * .98, y0 - th * .5); ctx.stroke();
      ctx.fillStyle = "#6f7a5a"; for (let j = 0; j < 3; j++) { const lx = (((i * 5 + j * 11) % 9) / 4.5 - 1) * w0 * .8, ly = y0 - th * (.2 + (j % 2) * .45); ctx.fillRect(lx, ly, w0 * .12, th * .12); } // lichen
      const nick = (x, y, sz) => poly([x, y, x + sz, y + sz * .4, x + sz * .3, y + sz, x - sz * .4, y + sz * .5], C.deep); // a chip broken out of a corner
      nick(-w1 * .98, y1 + th * .05, th * .35); nick(w0 * .8, y0 - th * .45, th * .3);
      ctx.strokeStyle = C.deep; ctx.lineWidth = Math.max(1, u * .007); ctx.beginPath(); const cx0 = ((i * 37) % 7 - 3) / 3 * w0 * .6; ctx.moveTo(cx0, y1); ctx.lineTo(cx0 + th * .2, y1 + th * .4); ctx.lineTo(cx0 - th * .1, y1 + th * .7); ctx.lineTo(cx0 + th * .15, y0); ctx.stroke(); // a crack down the course
      if (i < 3) for (let c = 0; c < 2; c++) ice.push([(c ? .55 : -.6) * w1 + ((i * 13) % 5) * u * .006, y1 - setback * .3, th * (.85 + ((i + c) % 3) * .3), c ? .5 : -.4]); // ice grown on the ledges
      y0 = y1 - setback;
    }
    if (!e.spinning) { // the tomb door in the second terrace: a dark doorway, lit faintly from deep inside
      const dw = W * .1, dy = H * .06 - th - setback, dh = th * .85;
      poly([-dw * 1.4, dy, dw * 1.4, dy, dw * 1.4, dy - dh * .12, -dw * 1.4, dy - dh * .12], C.ledge, C.line); // the sill
      poly([-dw, dy - dh * .12, dw, dy - dh * .12, dw * .85, dy - dh, -dw * .85, dy - dh], "#1b1d1f", C.line);
      poly([-dw * .5, dy - dh * .12, dw * .5, dy - dh * .12, dw * .45, dy - dh * .75, -dw * .45, dy - dh * .75], "#5f8fa266");
      poly([-dw * 1.15, dy - dh, dw * 1.15, dy - dh, dw * .9, dy - dh * 1.15, -dw * .9, dy - dh * 1.15], C.lit, C.line); // the lintel
    }
    // The summit: a broken crag with snow, crystals at its foot.
    const sw = W * .3, sy = y0;
    poly([-sw, sy, -sw * .55, sy - H * .22, -sw * .2, sy - H * .16, sw * .05, sy - H * .36, sw * .35, sy - H * .2, sw * .7, sy - H * .26, sw, sy], C.mid, C.line);
    poly([sw * .05, sy - H * .36, sw * .35, sy - H * .2, sw * .7, sy - H * .26, sw, sy, sw * .2, sy], C.dark);
    poly([-sw * .55, sy - H * .22, -sw * .38, sy - H * .17, -sw * .2, sy - H * .16, sw * .05, sy - H * .36, sw * .2, sy - H * .27, sw * .02, sy - H * .24, -sw * .25, sy - H * .12, -sw * .42, sy - H * .16], "#e9eef0"); // snow
    for (const q2 of ice) crystal(...q2); // ice on the ledges, drawn over the terraces above them
    crystal(-sw * .9, sy, H * .14, -.3); crystal(sw * .85, sy, H * .11, .4);
    poly([-W * 1.08, H * .06, W * 1.08, H * .06, W * 1.0, H * .13, -W * 1.0, H * .13], C.deep, C.line); // the worn plinth it all stands on
    ctx.restore();
    if (tucked) { for (const x of [-.72, -.25, .25, .72]) poly([k + x * W - u * .06, b, k + x * W - u * .045, b - u * .05, k + x * W + u * .045, b - u * .05, k + x * W + u * .06, b], C.skinDark, C.line); } // drawn in
    else { // the long neck, folded skin in angular plates, reaching forward and up; the head a heavy wedge
      const nx0 = k + flip * W * .78, ny0 = base - u * .03, hx = k + flip * (W * 1.75), hy = base - u * .2 + Math.sin(step * .4) * u * .012, hl = u * .23, hh = u * .105, segs = 5;
      const cx1 = nx0 + flip * W * .45, cy1 = hy - u * .12, at = (f) => [(1 - f) * (1 - f) * nx0 + 2 * f * (1 - f) * cx1 + f * f * (hx - flip * hl * .3), (1 - f) * (1 - f) * ny0 + 2 * f * (1 - f) * cy1 + f * f * hy]; // the neck rises, then reaches forward
      for (let i = 0; i < segs; i++) { const f0 = i / segs, f1 = (i + 1) / segs, [x0, yA] = at(f0), [x1, yB] = at(f1), r0 = u * (.125 - f0 * .05), r1 = u * (.125 - f1 * .05);
        const tx = x1 - x0, ty = yB - yA, tm = Math.hypot(tx, ty) || 1, nx = ty / tm * flip, ny = -Math.abs(tx) / tm; // the side of the neck facing up
        poly([x0 + nx * r0, yA + ny * r0, x1 + nx * r1, yB + ny * r1, x1, yB, x0, yA], i % 2 ? C.skinLit : C.skin, C.line); poly([x0, yA, x1, yB, x1 - nx * r1 * .8, yB - ny * r1 * .8, x0 - nx * r0 * .8, yA - ny * r0 * .8], C.skinDark, C.line); } // upper and under plates of each fold
      const fx = (f) => hx + flip * f * hl;
      poly([fx(-.35), hy - hh * .9, fx(.2), hy - hh * 1.05, fx(.5), hy - hh * .5, fx(.62), hy + hh * .05, fx(.5), hy + hh * .5, fx(-.1), hy + hh * .6, fx(-.4), hy + hh * .35], C.skinLit, C.line); // the skull
      poly([fx(-.4), hy + hh * .35, fx(-.1), hy + hh * .6, fx(.5), hy + hh * .5, fx(.4), hy + hh * .2, fx(-.2), hy + hh * .15], C.skinDark); // the jaw in shadow
      poly([fx(.42), hy - hh * .45, fx(.7), hy + hh * .1, fx(.52), hy + hh * .45, fx(.4), hy + hh * .1], "#2e2c27", C.line); // the beak
      ctx.strokeStyle = C.line; ctx.lineWidth = Math.max(1, u * .006); ctx.beginPath(); ctx.moveTo(fx(.5), hy + hh * .35); ctx.lineTo(fx(.1), hy + hh * .3); ctx.lineTo(fx(-.25), hy + hh * .18); ctx.stroke(); // the line of the mouth
      ctx.beginPath(); ctx.moveTo(fx(-.3), hy - hh * .75); ctx.lineTo(fx(0), hy - hh * .62); ctx.moveTo(fx(.05), hy - hh * .9); ctx.lineTo(fx(.25), hy - hh * .7); ctx.stroke(); // plates on the skull
      if (comet) { const o = .45 + .2 * Math.sin(t * 18); poly([fx(.5), hy + hh * .35, fx(.1), hy + hh * (.32 + o * .5), fx(-.15), hy + hh * .25], "#bfe8ff"); glow(ctx, fx(.35), hy + hh * .4, hl * .6, p[2], .7); } // cold light in the mouth
      const ex = fx(.12), ey = hy - hh * .3; // the eye: a narrow, half-shut, impassive slit under a heavy lid
      poly([ex - hh * .2, ey, ex, ey - hh * .08, ex + hh * .2, ey, ex, ey + hh * .07], "#1a1c1e");
      poly([ex - hh * .14, ey + hh * .005, ex + hh * .14, ey + hh * .005, ex, ey + hh * .05], "#9fc8d8"); // a pale glint of the iris below the lid
      poly([ex - hh * .26, ey - hh * .02, ex, ey - hh * .2, ex + hh * .26, ey - hh * .02, ex, ey - hh * .06], C.skin, C.line); // the lid, half down
    }
    if (e.spinning) { // the tornado of ice around it
      const spin = t * 9; for (let i = 0; i < 4; i++) { const rr = W * (1.15 + i * .12), yy = b - H * (.2 + i * .25); ctx.strokeStyle = `rgba(200,236,255,${.55 - i * .1})`; ctx.lineWidth = Math.max(2, u * (.03 - i * .005)); ctx.beginPath(); ctx.ellipse(k, yy, rr, rr * .25, 0, spin + i, spin + i + Math.PI * 1.3); ctx.stroke(); }
      ctx.fillStyle = "#e8f6ff"; for (let i = 0; i < 14; i++) { const a = spin * 1.3 + i * TAU / 14, rr = W * (1.05 + (i % 3) * .15); ctx.fillRect(k + Math.cos(a) * rr, b - H * (.2 + (i % 5) * .2) + Math.sin(a) * rr * .25, Math.max(2, u * .015), Math.max(2, u * .015)); }
    }
    if (e.iceShield) { // a faceted dome of ice over everything
      const R = W * 1.35, cyy = base - H * .3, pts = [];
      for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI, rr = R * (1 + .05 * ((i * 7) % 3)); pts.push(k + Math.cos(a) * rr, cyy + Math.sin(a) * rr); }
      pts.push(k + R, b, k - R, b); poly(pts, "rgba(160,220,255,.22)", "#d8f2ffcc");
      ctx.strokeStyle = "#ffffff55"; ctx.lineWidth = 1; for (let i = 1; i < 8; i += 2) { ctx.beginPath(); ctx.moveTo(pts[i * 2], pts[i * 2 + 1]); ctx.lineTo(k + (pts[i * 2] - k) * .45, cyy + (pts[i * 2 + 1] - cyy) * .45); ctx.stroke(); }
    }
  },
  // Release 245: the Nanobot Knight. Black plate with a red seam of light, flat-shaded and angular: a tall helm with a red
  // visor slit, a tattered cape fraying into nanobot motes, a long black greatsword with a red edge, an arm that opens into
  // a cannon. In mist it is only a swarm; struck by plain steel it scatters apart and pulls itself back together.
  nanobotKnight(ctx, q) {
    const { k, b, u, t, p, flip, e, state } = q, s0 = e.pack, att = s0?.attack, red = p[2], scat = Math.max(0, Number(e.scattered) || 0);
    const poly = (pts, fill, stroke) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, u * .008); ctx.stroke(); } };
    const motes = (n, cx, cy, spread, rise, size) => { for (let i = 0; i < n; i++) { const ph = (t * .7 + i * .137) % 1, a = i * 2.39, x = cx + Math.cos(a) * spread * (.3 + ph) - flip * ph * spread * .6, y = cy + Math.sin(a) * spread * .5 - ph * rise; ctx.fillStyle = i % 5 ? `rgba(20,20,26,${1 - ph})` : `rgba(255,60,50,${.9 * (1 - ph)})`; ctx.fillRect(x, y, size, size); } };
    ctx.fillStyle = "rgba(4,4,6,.5)"; ctx.beginPath(); ctx.ellipse(k, b, u * .3, u * .08, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 6; i++) { const ph = (t * .12 + i / 6) % 1, a = i * 2.1 + t * .2, hx0 = k + Math.cos(a) * u * (.25 + ph * .3), hy0 = b - u * (.15 + ph * .55); ctx.fillStyle = i % 3 ? `rgba(28,10,14,${.22 * Math.sin(ph * Math.PI)})` : `rgba(120,20,24,${.14 * Math.sin(ph * Math.PI)})`; ctx.beginPath(); ctx.ellipse(hx0, hy0, u * (.16 + ph * .14), u * (.09 + ph * .08), a, 0, TAU); ctx.fill(); } // release 245: a faint miasma hanging about it, drifting up and thinning
    if (e.mist) { motes(110, k, b - u * .45, u * .3, u * .55, Math.max(2.5, u * .035)); glow(ctx, k, b - u * .5, u * .4, p[2], .25); return; } // only the swarm
    const H = u * 1.05, hip = b - H * .44, sh = b - H * .76, lean = e.sliding ? .35 : att === "knightSlide" ? .15 : 0, step = Math.sin(t * 5) * u * .02;
    const jit = scat > 0 ? (n) => (Math.sin(t * 60 + n * 7) * u * .05 * scat / .45) : () => 0;
    ctx.save(); if (scat > 0) ctx.globalAlpha *= .55 + .45 * (1 - scat / .45);
    ctx.translate(k, 0); if (lean) { ctx.translate(0, b); ctx.transform(1, 0, -flip * lean * .6, 1, 0, 0); ctx.translate(0, -b); }
    // the cape: not cloth but the swarm itself, a stream of motes pouring off its shoulders and trailing out behind it,
    // billowing (harder when it slides) and thinning to nothing at the tail; a few faint wisps of smoke (Tim chose this
    // trailing version, 2026-10-20)
    const gust = e.sliding ? 1.8 : 1, trail = u * (.5 + .08 * Math.sin(t * 1.3)) * gust, at = (f, g) => [
      -flip * (u * .12 + f * trail) + (g - .5) * u * .26 * (1 - f * .3) + Math.sin(t * 2.6 - f * 6 + g * 3) * u * .05 * gust * f,
      sh + u * .02 + f * (b - sh - u * .06) * (1 - f * .25 * gust) - Math.sin(t * 1.9 - f * 4 + g * 2) * u * .05 * gust * f];
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) { const g = (i + .5) / 4; ctx.strokeStyle = `rgba(14,12,18,${.35 - i * .04})`; ctx.lineWidth = Math.max(2, u * (.05 - i * .006)); ctx.beginPath(); for (let j = 0; j <= 6; j++) { const [x2, y2] = at(j / 6 * .9, g); j ? ctx.lineTo(x2, y2) : ctx.moveTo(x2, y2); } ctx.stroke(); } // wisps of smoke
    for (let i = 0; i < 90; i++) { // the motes: each flows from the shoulders to the tail and starts again
      const g = ((i * 37) % 90) / 90, f = (t * (.35 + (i % 7) * .03) + i * .618) % 1, [x2, y2] = at(f, g), sz = Math.max(1.5, u * (.04 - f * .028));
      ctx.fillStyle = i % 9 === 0 ? `rgba(255,50,40,${.8 * (1 - f)})` : `rgba(${12 + (i % 3) * 8},${10 + (i % 3) * 6},${16 + (i % 3) * 8},${.95 * (1 - f * f)})`;
      ctx.fillRect(x2 - sz / 2, y2 - sz / 2, sz, sz);
    }
    // legs: angular greaves, a wide stance
    for (const [side, ph] of [[-1, 0], [1, Math.PI]]) { const lx = side * u * .1 + jit(side), lift = Math.max(0, Math.sin(t * 5 + ph)) * u * .02 * (att ? 0 : 1);
      poly([lx - u * .06, hip, lx + u * .06, hip, lx + u * .05, b - u * .2 - lift, lx - u * .055, b - u * .2 - lift], side * flip > 0 ? "#2a2a32" : "#1a1a20", "#000"); // thigh
      poly([lx - u * .06, b - u * .22 - lift, lx + u * .065, b - u * .22 - lift, lx + u * .05, b - u * .2 - lift + u * .03, lx - u * .055, b - u * .18 - lift], "#3a3a44", "#000"); // knee
      poly([lx - u * .05, b - u * .19 - lift, lx + u * .05, b - u * .19 - lift, lx + u * .045, b - u * .03 - lift, lx - u * .045, b - u * .03 - lift], side * flip > 0 ? "#24242c" : "#16161c", "#000"); // greave
      poly([lx - u * .05, b - u * .035 - lift, lx + u * .05 + flip * u * .05, b - u * .03 - lift, lx + u * .045 + flip * u * .06, b - lift, lx - u * .05, b - lift], "#101014", "#000"); } // sabaton
    // the torso: breastplate, faulds, pauldrons, the red seam
    poly([-u * .17 + jit(1), sh, u * .17 + jit(2), sh, u * .12, hip - u * .04, -u * .12, hip - u * .04], "#22222a", "#000");
    poly([flip * u * .02, sh, flip * u * .17, sh, flip * u * .12, hip - u * .04, flip * u * .01, hip - u * .04], "#30303a"); // the lit half
    poly([-u * .13, hip - u * .05, u * .13, hip - u * .05, u * .15, hip + u * .05, -u * .15, hip + u * .05], "#18181e", "#000"); // faulds
    ctx.strokeStyle = red; ctx.lineWidth = Math.max(1, u * .012); ctx.beginPath(); ctx.moveTo(flip * u * .015, sh + u * .03); ctx.lineTo(0, hip - u * .05); ctx.moveTo(-u * .12, hip - u * .045); ctx.lineTo(u * .12, hip - u * .045); ctx.stroke(); // the seam of light
    for (const side of [-1, 1]) poly([side * u * .1, sh - u * .03, side * u * .25, sh + u * .01, side * u * .23, sh + u * .1, side * u * .12, sh + u * .07], side * flip > 0 ? "#34343e" : "#1c1c22", "#000"); // pauldrons
    // the helm: tall, angular, a red visor slit, a spike
    const hx = flip * u * .015 + jit(3), hy = sh - u * .02;
    poly([hx - u * .085, hy, hx + u * .085, hy, hx + u * .095, hy - u * .17, hx + u * .03, hy - u * .25, hx - u * .07, hy - u * .2], "#26262e", "#000");
    poly([hx + flip * u * .01, hy, hx + flip * u * .085, hy, hx + flip * u * .095, hy - u * .17, hx + flip * u * .03, hy - u * .25], "#34343e");
    poly([hx - u * .05 + flip * u * .02, hy - u * .12, hx + u * .07 * flip + flip * u * .02, hy - u * .125, hx + u * .07 * flip + flip * u * .02, hy - u * .105, hx - u * .05 + flip * u * .02, hy - u * .1], red); // the visor slit
    glow(ctx, hx + flip * u * .03, hy - u * .115, u * .07, red, .6);
    poly([hx + u * .03, hy - u * .25, hx - u * .01, hy - u * .34, hx + u * .005, hy - u * .23], "#16161c", "#000"); // spike
    // the cannon arm (rear arm): at its side, or raised and opened along the beam
    const cannon = att === "knightCannon", ang = cannon ? (s0.data?.angle ?? 0) : 0, ax = -flip * u * .2, ay = sh + u * .05;
    if (cannon) { const dx = Math.cos(ang), dy = Math.sin(ang) * .75, L = u * .38, wv = u * .055, nx = -dy, ny = dx, ex2 = ax + dx * L, ey2 = ay + dy * L;
      poly([ax + nx * wv, ay + ny * wv, ex2 + nx * wv * 1.4, ey2 + ny * wv * 1.4, ex2 - nx * wv * 1.4, ey2 - ny * wv * 1.4, ax - nx * wv, ay - ny * wv], "#1e1e26", "#000");
      poly([ex2 + nx * wv * 1.6, ey2 + ny * wv * 1.6, ex2 + dx * u * .06 + nx * wv * 1.2, ey2 + dy * u * .06 + ny * wv * 1.2, ex2 + dx * u * .06 - nx * wv * 1.2, ey2 + dy * u * .06 - ny * wv * 1.2, ex2 - nx * wv * 1.6, ey2 - ny * wv * 1.6], "#2e2e38", "#000"); // the opened muzzle
      glow(ctx, ex2 + dx * u * .06, ey2 + dy * u * .06, u * (state === "windup" ? .14 + .05 * Math.sin(t * 30) : .2), red, .9); }
    else poly([ax - u * .045, ay, ax + u * .045, ay, ax + u * .035, hip + u * .02, ax - u * .04, hip + u * .02], "#1a1a20", "#000");
    // the sword arm and greatsword: held low behind; swept forward and up in a cut; trailing low in a slide
    const swing = s0?.data?.mode === "cut" || s0?.phase === "strike" || (s0?.phase === "recover" && (att === "knightSlide" || att === "knightMist")), bx = flip * u * .2, by = sh + u * .06;
    const thrust = e.thrusting, bladeA = thrust ? Math.atan2(thrust.y * .75, thrust.x) : e.swing === "back" ? Math.atan2(.6, -flip * 1) : e.sliding ? Math.atan2(.35, -flip * 1) : swing || e.swing === "fore" ? Math.atan2(-.55, flip * 1) : Math.atan2(.95, flip * .32), BL = u * .85, bw = u * .03; // release 247: outstretched in a thrust, swept low behind in a back cut
    const hx2 = bx + Math.cos(bladeA) * u * .12, hy2 = by + Math.sin(bladeA) * u * .12, tx2 = hx2 + Math.cos(bladeA) * BL, ty2 = hy2 + Math.sin(bladeA) * BL, pnx = -Math.sin(bladeA), pny = Math.cos(bladeA);
    poly([bx - u * .045, by, bx + u * .045, by, hx2 + u * .03, hy2, hx2 - u * .03, hy2], "#202028", "#000"); // gauntleted forearm
    poly([hx2 + pnx * bw, hy2 + pny * bw, tx2, ty2, hx2 - pnx * bw, hy2 - pny * bw], "#0a0a0e", "#000"); // the blade
    ctx.strokeStyle = red; ctx.lineWidth = Math.max(1, u * .008); ctx.beginPath(); ctx.moveTo(hx2 + pnx * bw * .7, hy2 + pny * bw * .7); ctx.lineTo(tx2, ty2); ctx.stroke(); // its red edge
    poly([hx2 + pnx * u * .07, hy2 + pny * u * .07, hx2 + pnx * u * .07 + Math.cos(bladeA) * u * .02, hy2 + pny * u * .07 + Math.sin(bladeA) * u * .02, hx2 - pnx * u * .07 + Math.cos(bladeA) * u * .02, hy2 - pny * u * .07 + Math.sin(bladeA) * u * .02, hx2 - pnx * u * .07, hy2 - pny * u * .07], "#30303a", "#000"); // crossguard
    if (swing && s0?.data?.aim) { ctx.strokeStyle = "rgba(255,60,50,.55)"; ctx.lineWidth = Math.max(2, u * .05); ctx.beginPath(); const a0 = Math.atan2(s0.data.aim.y, s0.data.aim.x); ctx.ellipse(0, hip - u * .1, u * .55, u * .35, 0, a0 - 1, a0 + 1); ctx.stroke(); } // the arc of the cut
    ctx.restore();
    motes(scat > 0 ? 40 : 10, k, sh, scat > 0 ? u * .45 : u * .18, u * .35, Math.max(1.5, u * .018)); // motes drifting off it (a burst when it scatters)
  },
  // Release 249: the Psychic Crystal. A long faceted crystal floating at head height, flat-shaded (lit, mid and shadow
  // faces), smaller shards circling it, a cold core; its aura says what it means: a hazy white at rest, red and larger
  // when it attacks, violet and drawn tight just before it takes hold of you.
  psychicCrystal(ctx, q) {
    // Release 259: a poise break (`e.crystalFall` 0..1) drops it out of the air: it sinks to the floor, tips over, and its
    // aura goes grey until it rises again.
    const fall = Math.max(0, Math.min(1, Number(q.e.crystalFall) || 0));
    const { k, b, u, e, state } = q, t = e.reduceMotion ? 0 : q.t, s0 = e.pack, att = s0?.attack, bob = Math.sin(t * 1.6) * u * .05 * (1 - fall), cy = b - u * .8 + bob - q.bodyLift * (1 - fall) + fall * u * .42, H = u * .55, W = u * .17;
    const grab = att === "psyGrab", hostile = att && !grab && att !== "psyWall", aura = fall > 0 ? [140, 145, 165] : grab ? [170, 90, 255] : hostile ? [255, 60, 60] : [235, 240, 255], ar = u * (grab ? .42 + .04 * Math.sin(t * 12) : hostile ? .66 + .05 * Math.sin(t * 9) : .52);
    const poly = (pts, fill) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    ctx.fillStyle = "rgba(4,4,8,.35)"; ctx.beginPath(); ctx.ellipse(k, b, u * .22, u * .06, 0, 0, TAU); ctx.fill(); // its shadow far below
    if (fall) { ctx.save(); ctx.translate(k, b - u * .05); ctx.rotate(fall * 1.25 * (e.facingX < 0 ? -1 : 1)); ctx.translate(-k, -(b - u * .05)); } // tipped over on the floor
    for (let i = 0; i < 3; i++) { const a2 = (hostile ? .13 - i * .035 : .18 - i * .05) * (state === "windup" ? 1.3 : 1); ctx.fillStyle = `rgba(${aura[0]},${aura[1]},${aura[2]},${a2})`; ctx.beginPath(); ctx.ellipse(k + Math.sin(t * .9 + i * 2) * u * .03, cy, ar * (1 + i * .22), ar * (1.15 + i * .2), 0, 0, TAU); ctx.fill(); } // the aura, in three soft layers
    if (!fall) for (const side of [-1, 1]) { const bx = k + side * W * 1.2, by = cy + H * .35, h2 = H * .5, w2 = W * .45, lean = side * W * .5; // two lesser crystals grown from its foot
      poly([bx + lean, by - h2, bx - w2, by - h2 * .2, bx, by + h2 * .25], side < 0 ? "#8a95c4" : "#4a5288"); poly([bx + lean, by - h2, bx + w2, by - h2 * .2, bx, by + h2 * .25], side < 0 ? "#cdd6f6" : "#6d78a8"); }
    const spin = t * .8, sx = Math.cos(spin) * W * .35; // the crystal turns: its lit face slides across
    poly([k, cy - H, k - W + sx * .3, cy - H * .25, k - W * .9 + sx * .3, cy + H * .35, k, cy + H], "#7d88b8");
    poly([k, cy - H, k + sx, cy - H * .2, k + sx * .9, cy + H * .4, k, cy + H], "#dfe6ff");
    poly([k, cy - H, k + W + sx * .3, cy - H * .25, k + W * .9 + sx * .3, cy + H * .35, k, cy + H], "#4a5288");
    ctx.strokeStyle = "#20244a"; ctx.lineWidth = Math.max(1, u * .008); ctx.beginPath(); ctx.moveTo(k, cy - H); ctx.lineTo(k - W + sx * .3, cy - H * .25); ctx.lineTo(k - W * .9 + sx * .3, cy + H * .35); ctx.lineTo(k, cy + H); ctx.lineTo(k + W * .9 + sx * .3, cy + H * .35); ctx.lineTo(k + W + sx * .3, cy - H * .25); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = "#ffffff88"; ctx.beginPath(); ctx.moveTo(k + sx * .5, cy - H * .7); ctx.lineTo(k + sx * .5, cy + H * .5); ctx.stroke(); // a glint down its edge
    ctx.fillStyle = `rgba(${aura[0]},${aura[1]},${aura[2]},.9)`; ctx.beginPath(); ctx.ellipse(k, cy, W * .35, H * .22, 0, 0, TAU); ctx.fill(); // the core takes the aura's colour
    if (!fall) for (let i = 0; i < 4; i++) { const a2 = t * 1.2 + i * TAU / 4, ox = k + Math.cos(a2) * u * .3, oy = cy + Math.sin(a2) * u * .12, h2 = u * .07, w2 = u * .025; poly([ox, oy - h2, ox + w2, oy, ox, oy + h2, ox - w2, oy], Math.sin(a2) > 0 ? "#dfe6ff" : "#6d78a8"); } // shards circling it
    if (fall) {
      ctx.restore();
      // The lesser crystals and the circling shards clatter to the floor around it, with a small bounce as they land.
      const ease = fall * fall * (3 - 2 * fall), hop = Math.abs(Math.sin(ease * Math.PI * 2)) * (1 - ease) * u * .06, floatY = b - u * .8 - q.bodyLift, gy = b - u * .04;
      for (const side of [-1, 1]) {
        const fx = k + side * W * 1.2, fy = floatY + H * .35, x = fx + (k + side * u * .36 - fx) * ease, y = fy + (gy - fy) * ease - hop, h2 = H * .5, w2 = W * .45, lean = side * W * .5;
        ctx.save(); ctx.translate(x, y); ctx.rotate(side * ease * 1.45);
        poly([lean, -h2, -w2, -h2 * .2, 0, h2 * .25], side < 0 ? "#8a95c4" : "#4a5288"); poly([lean, -h2, w2, -h2 * .2, 0, h2 * .25], side < 0 ? "#cdd6f6" : "#6d78a8"); ctx.restore();
      }
      for (let i = 0; i < 4; i++) {
        const a2 = i * TAU / 4 + .6, fx = k + Math.cos(a2) * u * .3, fy = floatY + Math.sin(a2) * u * .12, tx = k + Math.cos(i * 1.9 + .4) * u * .5, ty = gy + Math.sin(i * 2.3) * u * .05;
        const x = fx + (tx - fx) * ease, y = fy + (ty - fy) * ease - hop * (1 + i * .3), h2 = u * .07 * (1 - .45 * ease), w2 = u * .025 * (1 + 1.6 * ease); // lying flat
        poly([x, y - h2, x + w2, y, x, y + h2, x - w2, y], i % 2 ? "#dfe6ff" : "#6d78a8");
      }
    }
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
  if (e.kind === "astralWorm" || e.kind === "astralMirage") return false; // Continuous morphology has state outside the shared sprite key.
  const m = typeof ctx.getTransform === "function" && typeof ctx.drawImage === "function" ? ctx.getTransform() : null;
  if (!m || !Number.isFinite(m.a) || m.b || m.c || m.a <= 0 || m.d <= 0 || !e.id) return false;
  if (e.kind === "morphingBlob" || e.kind === "tremorWorm" || e.kind === "mountainTurtle" || e.kind === "nanobotKnight" || e.kind === "psychicCrystal" || e.kind === "voidWalker" || e.kind === "lightningGiant") return false; // exceptional bodies/poses are painted directly, including the Walker's teleport and dash states
  const scale = Math.max(.6, Number(e.scale) || 1), u = s * scale, k = (e.x + .5) * s, b = (e.y + .82) * s - (["astralWorm","astralMirage"].includes(e.kind)?0:e.hopLift || 0) * s * .2;
  const L = PACK_SPRITE.left * u, R = PACK_SPRITE.right * u, U = PACK_SPRITE.up * u, D = PACK_SPRITE.down * u;
  const flip = ["astralWorm","astralMirage"].includes(e.kind)&&e.astral?.facingX ? (e.astral.facingX<0?-1:1) : e.facingX ? (e.facingX < 0 ? -1 : 1) : facing === "left" ? -1 : 1, step = Math.floor(now * PACK_SPRITE.fps / 1000);
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
  const alpha = ((e.phasing || (e.phases && e.untargetable)) ? .45 : e.aloft && e.kind === "cinderSeraph" ? .35 : 1) * (e.fleeFade ?? 1), prior = ctx.globalAlpha;
  ctx.globalAlpha = prior * alpha * (e.illusion ? .92 : 1);
  ctx.drawImage(sp.canvas, k - L - 1 / m.a, b - U - 1 / m.d, sp.canvas.width / m.a, sp.canvas.height / m.d);
  ctx.globalAlpha = prior;
  if (e.hitFlash > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; glow(ctx, k, b - u * .4, u * .55, "#ffffff", .5); ctx.restore(); }
  if (sprites.size > PACK_SPRITE.keep) for (const [id, q] of sprites) if (now - q.used > PACK_SPRITE.staleMs || now < q.used) sprites.delete(id);
  return true;
}
export function packSpriteCount() { return sprites.size; }

// Draw one pack creature at its world position (s = tile size in pixels).
// ---- the Morphling (release 385; listener-morph.ts) ----------------------------------------------------------------------
// A huge, muscular, hunched body of dark violet flesh with ram horns and a cluster of eyes. Its arms never keep one shape:
// each stretches like putty and its end cycles fist → claw → tentacle → cable → stone. Spinning, the arms fan out round it;
// lunging, it becomes a writhing, toothed mass; sunk, only a bubbling pool and a few tips show.
const MORPH_INK = { flesh: "#3a1d44", mid: "#2a1433", deep: "#110812", sheen: "#9a62b0", rim: "#e08cff", cool: "#5fb8d8", vein: "#c45cff", core: "#ff7be6", eye: "#ff4fd8", bone: "#e2d6c0", horn: "#b9a888", cable: "#262a33", spark: "#9fe8ff" };
// A tapered limb along a quadratic spine from (x0,y0) through (cx,cy) to (x1,y1): filled body, a lit edge, ridges and suckers.
function morphTendril(ctx, x0, y0, cx, cy, x1, y1, w0, w1, t, i, opt = {}) {
  const C = MORPH_INK, N = 18, L = [], R = [], spine = [];
  for (let k = 0; k <= N; k++) {
    const f = k / N, wob = Math.sin(t * (opt.speed || 5) - f * 6 + i * 1.7) * (opt.wobble ?? .08) * f * Math.hypot(x1 - x0, y1 - y0);
    const x = (1 - f) * (1 - f) * x0 + 2 * (1 - f) * f * cx + f * f * x1, y = (1 - f) * (1 - f) * y0 + 2 * (1 - f) * f * cy + f * f * y1;
    const dx = 2 * (1 - f) * (cx - x0) + 2 * f * (x1 - cx), dy = 2 * (1 - f) * (cy - y0) + 2 * f * (y1 - cy), m = Math.hypot(dx, dy) || 1, nx = -dy / m, ny = dx / m;
    const w = (w0 + (w1 - w0) * Math.pow(f, .8)) * (1 + .12 * Math.sin(f * 9 + t * 3 + i)) / 2;
    spine.push([x + nx * wob, y + ny * wob, nx, ny, w]); L.push([x + nx * (wob + w), y + ny * (wob + w)]); R.push([x + nx * (wob - w), y + ny * (wob - w)]);
  }
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (const p of L) ctx.lineTo(p[0], p[1]); for (let k = R.length - 1; k >= 0; k--) ctx.lineTo(R[k][0], R[k][1]); ctx.closePath();
  const g = ctx.createLinearGradient(L[0][0], L[0][1], R[0][0], R[0][1]); g.addColorStop(0, opt.light || C.sheen); g.addColorStop(.45, opt.base || C.flesh); g.addColorStop(1, C.deep);
  ctx.fillStyle = g; ctx.fill(); if (opt.outline !== false) { ctx.lineWidth = Math.max(1, w0 * .08); ctx.strokeStyle = "#07040acc"; ctx.stroke(); }
  ctx.lineCap = "round"; ctx.strokeStyle = (opt.rim || C.rim) + "88"; ctx.lineWidth = Math.max(1, w0 * .1); ctx.beginPath(); for (let k = 1; k < N - 1; k++) { const [x, y, nx, ny, w] = spine[k]; ctx[k > 1 ? "lineTo" : "moveTo"](x + nx * w * .62, y + ny * w * .62); } ctx.stroke();
  if (opt.ridges !== false) { ctx.strokeStyle = C.deep + "66"; ctx.lineWidth = Math.max(.8, w0 * .035); for (let k = 3; k < N - 1; k += 3) { const [x, y, nx, ny, w] = spine[k]; ctx.beginPath(); ctx.moveTo(x + nx * w * .85, y + ny * w * .85); ctx.quadraticCurveTo(x - ny * w * .3, y + nx * w * .3, x - nx * w * .85, y - ny * w * .85); ctx.stroke(); } }
  if (opt.suckers) { for (let k = 4; k < N; k += 2) { const [x, y, nx, ny, w] = spine[k]; const r = Math.max(.8, w * .32); ctx.fillStyle = "#c98fd0"; ctx.beginPath(); ctx.ellipse(x - nx * w * .55, y - ny * w * .55, r, r * .8, 0, 0, TAU); ctx.fill(); ctx.fillStyle = C.deep; ctx.beginPath(); ctx.arc(x - nx * w * .55, y - ny * w * .55, r * .45, 0, TAU); ctx.fill(); } }
  const end = spine[N], prev = spine[N - 2]; return { x: end[0], y: end[1], a: Math.atan2(end[1] - prev[1], end[0] - prev[0]), w: end[4] * 2 };
}
// What a limb's end becomes, cycling: fist, claw, tentacle curl, cable plug, stone, dragon jaw.
function morphTip(ctx, tip, u, t, i, form) {
  const C = MORPH_INK, { x, y, a } = tip, r = Math.max(u * .09, tip.w * .9);
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  if (form === 0) { // a knuckled fist
    const g = ctx.createRadialGradient(-r * .3, -r * .4, r * .1, 0, 0, r * 1.3); g.addColorStop(0, C.sheen); g.addColorStop(1, C.deep); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(r * .35, 0, r * 1.15, r, 0, 0, TAU); ctx.fill(); outline(ctx, Math.max(1, u * .02));
    ctx.strokeStyle = C.deep; ctx.lineWidth = Math.max(1, u * .015); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(r * .9, k * r * .45); ctx.lineTo(r * 1.35, k * r * .45); ctx.stroke(); }
  } else if (form === 1) { // hooked claws
    ctx.fillStyle = C.flesh; ctx.beginPath(); ctx.ellipse(0, 0, r * .9, r * .75, 0, 0, TAU); ctx.fill();
    for (let k = -1.5; k <= 1.5; k++) { ctx.fillStyle = C.bone; ctx.beginPath(); ctx.moveTo(r * .5, k * r * .4); ctx.quadraticCurveTo(r * 2, k * r * .7 - r * .2, r * 2.3, k * r * .9 + r * .5); ctx.quadraticCurveTo(r * 1.6, k * r * .5 + r * .1, r * .5, k * r * .4 + r * .28); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#5b4d3a"; ctx.lineWidth = Math.max(.8, u * .01); ctx.stroke(); }
  } else if (form === 2) { // a curling tentacle tip
    ctx.strokeStyle = C.flesh; ctx.lineCap = "round"; for (let k = 0; k < 3; k++) { ctx.lineWidth = Math.max(1, r * (.7 - k * .2)); ctx.beginPath(); ctx.arc(r * (1 + k * .4), 0, r * (.9 - k * .2), Math.PI + Math.sin(t * 4 + i + k) * .4, Math.PI * (2.4 - k * .2)); ctx.stroke(); }
  } else if (form === 3) { // a cable end, sparking
    ctx.fillStyle = C.cable; ctx.fillRect(-r * .2, -r * .55, r * 1.4, r * 1.1); ctx.fillStyle = "#59606b"; ctx.fillRect(r * .9, -r * .35, r * .5, r * .7); ctx.fillStyle = "#a8b0bb"; for (const k of [-.18, .18]) ctx.fillRect(r * 1.4, k * r - r * .06, r * .45, r * .12);
    glow(ctx, r * 1.9, 0, r * 1.4, C.spark, .6 + .3 * Math.sin(t * 24 + i)); ctx.fillStyle = "#eaffff"; ctx.beginPath(); ctx.arc(r * 1.9, 0, r * .18, 0, TAU); ctx.fill();
  } else if (form === 4) { // a fist of stone
    ctx.fillStyle = "#4d4552"; ctx.beginPath(); for (let k = 0; k < 7; k++) { const q = k * TAU / 7 + i, rr = r * (1.15 + .25 * Math.sin(k * 2.3 + i)); ctx[k ? "lineTo" : "moveTo"](r * .4 + Math.cos(q) * rr, Math.sin(q) * rr); } ctx.closePath(); ctx.fill(); outline(ctx, Math.max(1, u * .02)); ctx.strokeStyle = "#7a7180"; ctx.lineWidth = Math.max(.8, u * .012); ctx.beginPath(); ctx.moveTo(0, -r * .5); ctx.lineTo(r * .6, r * .1); ctx.lineTo(r * .3, r * .7); ctx.stroke();
  } else { // a dragon's head, mouth working
    const open = .25 + .2 * Math.sin(t * 6 + i), L = r * 2.6;
    for (const sg of [-1, 1]) { ctx.save(); ctx.rotate(sg * open); ctx.fillStyle = C.flesh; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, sg * r * .15); ctx.lineTo(L * .85, sg * r * .7); ctx.lineTo(0, sg * r * .8); ctx.closePath(); ctx.fill(); outline(ctx, Math.max(1, u * .015)); ctx.fillStyle = C.bone; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(L * k / 5, sg * r * .12); ctx.lineTo(L * k / 5 + r * .12, -sg * r * .15); ctx.lineTo(L * k / 5 + r * .24, sg * r * .12); ctx.fill(); } ctx.restore(); }
    eye(ctx, L * .25, -r * .55, Math.max(1, u * .02), C.eye);
  }
  ctx.restore();
}
// Release 389 (Tim: "it doesn't look very muscular... I like... the direction... like he has a chamber inside of him... increase
// the fidelity of his tentacles and arms and the overall look"): a hulking, V-shaped titan on goat's legs. Massive traps and
// deltoids, plated pectorals split by a glowing chamber of teeth, a ridged abdomen, two great arms that run out into tapered,
// ridged, suckered tendrils whose ends keep changing, a crown of back tentacles, and a low horned head full of eyes.
function drawMorphling(ctx, q) {
  const { k, b, u, t, flip, state, e } = q, C = MORPH_INK, m = e.morph || {}, br = Math.sin(t * 2.2) * u * .02, wind = state === "windup";
  if (m.sunk) { // under the floor: a bubbling pool and a few tips
    shadowAt(ctx, k, b, u * .8, u * .22, .7); const pg = ctx.createRadialGradient(k, b, 0, k, b, u * .7); pg.addColorStop(0, C.vein + "88"); pg.addColorStop(.5, C.deep); pg.addColorStop(1, C.deep + "00"); ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(k, b, u * .75, u * .2, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 5; i++) { const x = k + Math.cos(t * 2 + i * 1.3) * u * .45, h = u * (.25 + .15 * Math.sin(t * 5 + i)); morphTendril(ctx, x, b, x + u * .1, b - h * .5, x - u * .06, b - h, u * .09, u * .015, t, i, { wobble: .2, ridges: false }); }
    return;
  }
  const lunging = m.move === "lunge" && m.lunge && m.lunge.gone > 0, spinning = m.move === "spin";
  shadowAt(ctx, k, b, u * .78, u * .2);
  glow(ctx, k, b - u * .75, u * 1.3, C.vein, .14 + .05 * Math.sin(t * 3));
  if (lunging) { // a writhing wave of tentacles with teeth
    const d = m.lunge.dir, ang = Math.atan2(d.y, d.x), cx = k, cy = b - u * .5;
    for (let i = 0; i < 11; i++) { const a = ang + Math.PI + (i - 5) * .2, len = u * (1.35 + .3 * Math.sin(t * 9 + i)); morphTendril(ctx, cx, cy, cx + Math.cos(a) * len * .5 + Math.sin(t * 8 + i) * u * .15, cy + Math.sin(a) * len * .5, cx + Math.cos(a + Math.sin(t * 6 + i) * .3) * len, cy + Math.sin(a) * len * .8, u * .22, u * .03, t * 1.5, i, { wobble: .14, suckers: i % 2 === 0 }); }
    const g = ctx.createRadialGradient(cx - u * .2, cy - u * .25, u * .1, cx, cy, u * .75); g.addColorStop(0, C.sheen); g.addColorStop(.45, C.flesh); g.addColorStop(1, C.deep); ctx.fillStyle = g; ctx.beginPath();
    for (let i = 0; i <= 28; i++) { const a2 = i / 28 * TAU, r = u * (.6 + .07 * Math.sin(a2 * 5 + t * 9) + .05 * Math.sin(a2 * 3 - t * 6)); ctx[i ? "lineTo" : "moveTo"](cx + Math.cos(a2 + ang) * r * 1.1, cy + Math.sin(a2 + ang) * r * .72); }
    ctx.closePath(); ctx.fill(); outline(ctx, Math.max(1.5, u * .025), C.rim + "aa");
    ctx.strokeStyle = C.vein + "99"; ctx.lineWidth = Math.max(1, u * .012); for (let i = 0; i < 6; i++) { const a2 = ang + Math.PI + (i - 2.5) * .35; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a2) * u * .55, cy + Math.sin(a2) * u * .35); ctx.quadraticCurveTo(cx + Math.cos(a2) * u * .2, cy + Math.sin(a2) * u * .3, cx + Math.cos(ang) * u * .1, cy); ctx.stroke(); }
    for (let i = 0; i < 6; i++) eye(ctx, cx - Math.cos(ang) * u * .1 + Math.cos(i * 2.4) * u * .12, cy - u * .3 + Math.sin(i * 2.4) * u * .06, Math.max(1, u * .015), C.eye);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.fillStyle = "#070307"; ctx.beginPath(); ctx.ellipse(u * .35, 0, u * .38, u * .28, 0, 0, TAU); ctx.fill(); ctx.fillStyle = C.bone; for (let i = 0; i < 12; i++) { const a2 = i / 12 * TAU, x = u * .35 + Math.cos(a2) * u * .36, y = Math.sin(a2) * u * .26; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(u * .35 + Math.cos(a2) * u * .2, Math.sin(a2) * u * .14); ctx.lineTo(x + Math.cos(a2 + 1.6) * u * .05, y + Math.sin(a2 + 1.6) * u * .05); ctx.closePath(); ctx.fill(); } glow(ctx, u * .35, 0, u * .25, C.core, .5); ctx.restore();
    return;
  }
  const S = { x: k, y: b - u * 1.18 + br }; // the shoulder line
  const muscle = (x, y, rx, ry, rot, lit = .5) => { const g = ctx.createRadialGradient(x - rx * .35, y - ry * .45, rx * .1, x, y, Math.max(rx, ry) * 1.1); g.addColorStop(0, lit > .5 ? C.sheen : C.flesh); g.addColorStop(1, C.mid); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); ctx.strokeStyle = "#07040a99"; ctx.lineWidth = Math.max(1, u * .012); ctx.stroke(); };
  // Back tentacles: a crown fanning from behind the shoulders.
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1, j = i % 3, base = spinning ? t * 9 + i * TAU / 6 : -Math.PI / 2 + side * (.55 + j * .42) + Math.sin(t * 1.4 + i) * .18, len = u * (spinning ? 1.45 : .95 + .2 * Math.sin(t * 1.9 + i * 2.1) + j * .12);
    const x0 = S.x + side * u * (.25 + j * .1), y0 = S.y + u * .05, x1 = x0 + Math.cos(base) * len, y1 = y0 + Math.sin(base) * len;
    const tip = morphTendril(ctx, x0, y0, x0 + Math.cos(base - side * .9) * len * .6, y0 + Math.sin(base - side * .9) * len * .6, x1, y1, u * (.27 - j * .03), u * .025, t, i, { suckers: j === 1, wobble: .16, light: C.flesh, base: C.mid });
    if (j === 2) morphTip(ctx, tip, u, t, i, Math.floor(t * .6 + i * 1.37) % 6);
  }
  for (let i = 0; i < 7; i++) { const a2 = i / 7 * TAU + Math.sin(t + i) * .2, x0 = k + Math.cos(a2) * u * .32, y0 = b + Math.sin(a2) * u * .06, len = u * (.22 + .1 * Math.sin(t * 3 + i)); morphTendril(ctx, x0, y0, x0 + Math.cos(a2) * len * .6, y0 - u * .05, x0 + Math.cos(a2) * len, y0 + Math.sin(a2) * len * .25 - u * .02, u * .06, u * .01, t, i + 30, { ridges: false, outline: false, wobble: .3, light: C.flesh, base: C.mid }); } // spawn writhing at its feet
  // Goat's legs: a heavy thigh, a backward-bent shank, a cloven hoof.
  for (const sx of [-1, 1]) {
    const hip = { x: k + sx * u * .2, y: b - u * .46 }, knee = { x: k + sx * u * .36, y: b - u * .25 }, hock = { x: k + sx * u * .22, y: b - u * .13 }, hoof = { x: k + sx * u * .3, y: b - u * .02 };
    morphTendril(ctx, hip.x, hip.y, hip.x + sx * u * .2, hip.y + u * .02, knee.x, knee.y, u * .44, u * .22, t, sx + 20, { wobble: 0, ridges: false, outline: false, light: sx < 0 ? C.sheen : C.flesh });
    morphTendril(ctx, knee.x, knee.y, knee.x - sx * u * .02, knee.y + u * .1, hock.x, hock.y, u * .2, u * .13, t, sx + 22, { wobble: 0, ridges: false, outline: false });
    morphTendril(ctx, hock.x, hock.y, hock.x + sx * u * .02, hock.y + u * .06, hoof.x, hoof.y, u * .13, u * .1, t, sx + 24, { wobble: 0, ridges: false, outline: false });
    muscle(hip.x + sx * u * .08, hip.y + u * .08, u * .2, u * .14, sx * .5, sx < 0 ? .8 : .35);
    ctx.fillStyle = "#18121a"; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hoof.x + d * u * .015, hoof.y - u * .02); ctx.lineTo(hoof.x + d * u * .07, hoof.y - u * .015); ctx.lineTo(hoof.x + d * u * .06, b); ctx.lineTo(hoof.x + d * u * .005, b); ctx.closePath(); ctx.fill(); }
  }
  // The arms: deltoid, a swelling bicep, a heavy forearm, and from the wrist a tendril with a changing end.
  for (const sx of [-1, 1]) {
    const reach = spinning ? 1.35 : (.62 + .16 * Math.sin(t * 2.1 + sx)) * (wind ? 1.35 : 1), ang = spinning ? t * 9 + (sx > 0 ? 0 : Math.PI) : (sx > 0 ? .95 : Math.PI - .95) + Math.sin(t * 1.7 + sx * 2) * .12 - (wind ? sx * .5 : 0);
    const ax = k + sx * u * .66, ay = S.y + u * .14, el = { x: ax + sx * u * .2 + Math.cos(ang) * u * .12, y: ay + u * .38 }, wr = { x: el.x + Math.cos(ang) * u * .34, y: el.y + Math.sin(ang) * u * .34 };
    morphTendril(ctx, ax, ay, ax + sx * u * .2, ay + u * .16, el.x, el.y, u * .34, u * .24, t, sx + 5, { wobble: 0, ridges: false, outline: false, light: sx < 0 ? C.sheen : C.flesh }); // upper arm
    muscle(ax + sx * u * .1, ay + u * .2, u * .13, u * .17, sx * .3, sx < 0 ? .9 : .4); // bicep
    morphTendril(ctx, el.x, el.y, (el.x + wr.x) / 2 + sx * u * .06, (el.y + wr.y) / 2, wr.x, wr.y, u * .3, u * .2, t, sx + 7, { wobble: 0, ridges: false, outline: false, light: sx < 0 ? C.sheen : C.flesh }); // forearm
    { const g2 = ctx.createRadialGradient(el.x - u * .03, el.y - u * .03, 0, el.x, el.y, u * .13); g2.addColorStop(0, sx < 0 ? C.sheen : C.flesh); g2.addColorStop(1, C.flesh + "00"); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(el.x, el.y, u * .13, 0, TAU); ctx.fill(); } // the elbow, soft over the joint
    ctx.strokeStyle = C.vein + "99"; ctx.lineWidth = Math.max(1, u * .01); ctx.beginPath(); ctx.moveTo(ax + sx * u * .05, ay + u * .1); ctx.quadraticCurveTo(el.x - sx * u * .05, el.y - u * .05, wr.x, wr.y); ctx.stroke();
    { const g3 = ctx.createRadialGradient(wr.x - u * .03, wr.y - u * .03, 0, wr.x, wr.y, u * .15); g3.addColorStop(0, sx < 0 ? C.sheen : C.flesh); g3.addColorStop(.7, C.mid); g3.addColorStop(1, C.mid + "00"); ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(wr.x, wr.y, u * .15, 0, TAU); ctx.fill(); } // the wrist swells into the tendril
    const tx = wr.x + Math.cos(ang + sx * .25) * u * reach, ty = wr.y + Math.sin(ang + sx * .25) * u * reach * .8;
    const tip = morphTendril(ctx, wr.x, wr.y, wr.x + Math.cos(ang - sx * .5) * u * reach * .55, wr.y + Math.sin(ang - sx * .5) * u * reach * .55, tx, ty, u * .19, u * .07, t, sx + 9, { suckers: true, wobble: .1 });
    morphTip(ctx, tip, u, t, sx + 3, Math.floor(t * .7 + (sx > 0 ? 2.5 : 0)) % 6);
  }
  // The torso: a V from massive shoulders to a narrow waist.
  const tg = ctx.createLinearGradient(k - u * .8, S.y, k + u * .8, b - u * .4); tg.addColorStop(0, C.sheen); tg.addColorStop(.35, C.flesh); tg.addColorStop(1, C.deep);
  ctx.beginPath(); ctx.moveTo(k - u * .24, b - u * .44); ctx.bezierCurveTo(k - u * .36, b - u * .7, k - u * .78, S.y + u * .25, k - u * .7, S.y + u * .02); ctx.quadraticCurveTo(k - u * .52, S.y - u * .2, k - u * .16, S.y - u * .14); ctx.lineTo(k + u * .16, S.y - u * .14); ctx.quadraticCurveTo(k + u * .52, S.y - u * .2, k + u * .7, S.y + u * .02); ctx.bezierCurveTo(k + u * .78, S.y + u * .25, k + u * .36, b - u * .7, k + u * .24, b - u * .44); ctx.closePath(); ctx.fillStyle = tg; ctx.fill(); outline(ctx, Math.max(1.5, u * .025));
  ctx.save(); ctx.clip(); { const lg = ctx.createLinearGradient(k - u * .75, 0, k + u * .75, 0); lg.addColorStop(0, C.rim + "40"); lg.addColorStop(.12, "#00000000"); lg.addColorStop(.75, "#00000000"); lg.addColorStop(1, "#000000aa"); ctx.fillStyle = lg; ctx.fillRect(k - u, S.y - u * .3, u * 2, u * 1.2); }
  ctx.strokeStyle = C.deep + "aa"; ctx.lineWidth = Math.max(1, u * .012); for (let r = 0; r < 4; r++) for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k + sx * u * .48, S.y + u * (.22 + r * .09)); ctx.quadraticCurveTo(k + sx * u * .58, S.y + u * (.26 + r * .09), k + sx * u * .6, S.y + u * (.34 + r * .09)); ctx.stroke(); }
  ctx.restore();
  muscle(k - u * .32, S.y - u * .08, u * .26, u * .12, -.25, .8); muscle(k + u * .32, S.y - u * .08, u * .26, u * .12, .25, .3); // traps
  muscle(k - u * .62, S.y + u * .1, u * .2, u * .2, 0, .9); muscle(k + u * .62, S.y + u * .1, u * .2, u * .2, 0, .4); // deltoids
  muscle(k - u * .22, S.y + u * .2, u * .24, u * .16, .12, .8); muscle(k + u * .22, S.y + u * .2, u * .24, u * .16, -.12, .4); // pectorals
  for (let r = 0; r < 3; r++) for (const sx of [-1, 1]) muscle(k + sx * u * .085, S.y + u * (.44 + r * .14), u * .075, u * .06, 0, sx < 0 ? .7 : .4); // the abdomen
  for (const sx of [-1, 1]) for (let r = 0; r < 3; r++) { ctx.strokeStyle = C.deep + "cc"; ctx.lineWidth = Math.max(1, u * .014); ctx.beginPath(); ctx.moveTo(k + sx * u * .3, S.y + u * (.34 + r * .1)); ctx.lineTo(k + sx * u * .42, S.y + u * (.3 + r * .1)); ctx.stroke(); } // serratus
  // The chamber: a split between the pectorals, glowing, rimmed with teeth.
  const gape = wind ? .16 : .07 + .02 * Math.sin(t * 4), cy = S.y + u * .38;
  glow(ctx, k, cy, u * .4, C.core, .35 + .15 * Math.sin(t * 5)); ctx.fillStyle = "#0a0309"; ctx.beginPath(); ctx.ellipse(k, cy, u * gape, u * .26, 0, 0, TAU); ctx.fill();
  const cg = ctx.createRadialGradient(k, cy, 0, k, cy, u * .2); cg.addColorStop(0, "#fff0fb"); cg.addColorStop(.3, C.core); cg.addColorStop(1, C.core + "00"); ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(k, cy, u * gape * .7, u * .18, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = C.bone; for (let i = 0; i < 7; i++) { const y = cy - u * .22 + i * u * .073; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k + sx * u * gape, y - u * .025); ctx.lineTo(k + sx * u * gape * .25, y); ctx.lineTo(k + sx * u * gape, y + u * .025); ctx.closePath(); ctx.fill(); } }
  for (let i = 0; i < 6; i++) { const f = ((t * .6 + i / 6) % 1), x = k + Math.sin(i * 2.1 + t * 2) * u * .05 * (1 + f), y = cy - f * u * .55; ctx.fillStyle = C.core + Math.round((1 - f) * 200).toString(16).padStart(2, "0"); ctx.beginPath(); ctx.arc(x, y, Math.max(.8, u * .014 * (1 - f * .5)), 0, TAU); ctx.fill(); } // motes rising from the chamber
  ctx.strokeStyle = C.vein + "aa"; ctx.lineWidth = Math.max(1, u * .012); for (let i = 0; i < 5; i++) { const sx = i % 2 ? 1 : -1; ctx.beginPath(); ctx.moveTo(k + sx * u * .12, cy - u * .1 + i * u * .05); ctx.bezierCurveTo(k + sx * u * .3, cy - u * .2 + i * u * .06, k + sx * u * .45, cy + i * u * .03, k + sx * u * .58, cy - u * .3 + i * u * .02); ctx.stroke(); }
  // The head (release 391; Tim: "remove his horns... make his head... more mechanical, electromechanical, like cyborg...
  // tubes... Ghost in the Shell... but not so overly futuristic... more so like Remnant: From the Ashes"): a hunched skull of
  // flesh caged in corroded, riveted iron, a slatted breathing grille over the jaw with ribbed hoses running down into the
  // shoulders, cables from the back of the skull, and mismatched optics: one big dull lens and a small cluster.
  const hx = k + flip * u * .03, hy = S.y - u * .13, iron = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, "#8d877c"); g.addColorStop(.45, "#4e4a45"); g.addColorStop(1, "#1f1c1b"); return g; };
  const hose = (x0, y0, cx, cy, x1, y1, w) => { ctx.lineCap = "round"; ctx.strokeStyle = "#141114"; ctx.lineWidth = w * 1.25; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke(); ctx.strokeStyle = "#3b3634"; ctx.lineWidth = w; ctx.stroke(); ctx.strokeStyle = "#6d665e"; ctx.lineWidth = Math.max(.8, w * .25); ctx.stroke();
    ctx.strokeStyle = "#141114"; ctx.lineWidth = Math.max(.8, w * .14); for (let r = 1; r < 10; r++) { const f = r / 10, x = (1 - f) ** 2 * x0 + 2 * (1 - f) * f * cx + f * f * x1, y = (1 - f) ** 2 * y0 + 2 * (1 - f) * f * cy + f * f * y1, dx = 2 * (1 - f) * (cx - x0) + 2 * f * (x1 - cx), dy = 2 * (1 - f) * (cy - y0) + 2 * f * (y1 - cy), m = Math.hypot(dx, dy) || 1; ctx.beginPath(); ctx.moveTo(x - dy / m * w * .55, y + dx / m * w * .55); ctx.lineTo(x + dy / m * w * .55, y - dx / m * w * .55); ctx.stroke(); } };
  for (const sx of [-1, 1]) { ctx.strokeStyle = "#1a1719"; ctx.lineWidth = Math.max(1, u * .016); ctx.beginPath(); ctx.moveTo(hx + sx * u * .1, hy - u * .12); ctx.bezierCurveTo(hx + sx * u * .25, hy - u * .3, hx + sx * u * .42, hy - u * .2, hx + sx * u * .48, S.y + u * .02); ctx.stroke(); ctx.strokeStyle = "#5b2a2a"; ctx.lineWidth = Math.max(.8, u * .007); ctx.stroke(); } // cables from the back of the skull
  ctx.fillStyle = shade(ctx, hx, hy, u * .22, C.sheen, C.deep); ctx.beginPath(); ctx.moveTo(hx - u * .17, hy - u * .02); ctx.quadraticCurveTo(hx - u * .02, hy - u * .26, hx + u * .17, hy - u * .04); ctx.quadraticCurveTo(hx + u * .15, hy + u * .14, hx, hy + u * .2); ctx.quadraticCurveTo(hx - u * .15, hy + u * .14, hx - u * .17, hy - u * .02); ctx.fill(); outline(ctx, Math.max(1, u * .02)); // the skull of flesh
  ctx.fillStyle = iron(hx - u * .18, hy - u * .25, hx + u * .1, hy + u * .05); ctx.beginPath(); ctx.moveTo(hx - u * .19, hy + u * .02); ctx.quadraticCurveTo(hx - u * .17, hy - u * .2, hx - u * .02, hy - u * .245); ctx.quadraticCurveTo(hx + u * .12, hy - u * .24, hx + u * .16, hy - u * .12); ctx.lineTo(hx + u * .05, hy - u * .1); ctx.lineTo(hx - u * .02, hy - u * .02); ctx.lineTo(hx - u * .1, hy + u * .05); ctx.closePath(); ctx.fill(); outline(ctx, Math.max(1, u * .016), "#0d0b0c"); // the iron cage over the crown
  ctx.fillStyle = "#7a4a2c88"; for (const [rx, ry, rr] of [[-.12, -.15, .03], [.06, -.2, .022], [-.15, -.02, .02]]) { ctx.beginPath(); ctx.arc(hx + rx * u, hy + ry * u, rr * u, 0, TAU); ctx.fill(); } // rust
  ctx.strokeStyle = "#1a1719"; ctx.lineWidth = Math.max(.8, u * .009); ctx.beginPath(); ctx.moveTo(hx - u * .17, hy - u * .08); ctx.lineTo(hx + u * .1, hy - u * .17); ctx.stroke(); // a plate seam
  ctx.fillStyle = "#b9b1a3"; for (const [rx, ry] of [[-.16, -.06], [-.13, -.16], [-.04, -.22], [.07, -.21], [.13, -.13], [-.08, .02]]) { ctx.beginPath(); ctx.arc(hx + rx * u, hy + ry * u, Math.max(.8, u * .009), 0, TAU); ctx.fill(); } // rivets
  // The jaw grille, and its hoses down into the shoulders.
  for (const sx of [-1, 1]) hose(hx + sx * u * .07, hy + u * .14, hx + sx * u * .22, hy + u * .32, hx + sx * u * .36, S.y + u * .1, Math.max(2, u * .05));
  ctx.fillStyle = iron(hx - u * .1, hy + u * .04, hx + u * .1, hy + u * .22); ctx.beginPath(); ctx.moveTo(hx - u * .11, hy + u * .05); ctx.lineTo(hx + u * .11, hy + u * .05); ctx.lineTo(hx + u * .08, hy + u * .19); ctx.lineTo(hx, hy + u * .22); ctx.lineTo(hx - u * .08, hy + u * .19); ctx.closePath(); ctx.fill(); outline(ctx, Math.max(1, u * .014), "#0d0b0c");
  ctx.strokeStyle = "#0d0b0c"; ctx.lineWidth = Math.max(.8, u * .012); for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(hx + i * u * .03, hy + u * .08); ctx.lineTo(hx + i * u * .026, hy + u * .18); ctx.stroke(); }
  glow(ctx, hx, hy + u * .14, u * .08, C.core, .25 + .15 * Math.sin(t * 3)); // breath glowing through the slats
  // The optics: one big dull lens in an iron socket, a cluster of small ones on the other side.
  const big = { x: hx + flip * u * .07, y: hy - u * .03 }, small = { x: hx - flip * u * .075, y: hy - u * .045 };
  ctx.fillStyle = "#1a1719"; ctx.beginPath(); ctx.arc(big.x, big.y, u * .058, 0, TAU); ctx.fill(); ctx.strokeStyle = "#6d665e"; ctx.lineWidth = Math.max(1, u * .012); ctx.stroke();
  const lens = ctx.createRadialGradient(big.x - u * .012, big.y - u * .012, 0, big.x, big.y, u * .042); lens.addColorStop(0, "#ffd2a0"); lens.addColorStop(.35, "#ff6a2a"); lens.addColorStop(1, "#3a0d06"); ctx.fillStyle = lens; ctx.beginPath(); ctx.arc(big.x, big.y, u * .04, 0, TAU); ctx.fill();
  glow(ctx, big.x, big.y, u * .1, "#ff6a2a", .3 + .1 * Math.sin(t * 2.5));
  for (const [dx, dy, r] of [[0, 0, .018], [-.025, .025, .012], [.02, .028, .01]]) { ctx.fillStyle = "#1a1719"; ctx.beginPath(); ctx.arc(small.x + dx * u, small.y + dy * u, (r + .007) * u, 0, TAU); ctx.fill(); ctx.fillStyle = "#ff5a3a"; ctx.beginPath(); ctx.arc(small.x + dx * u, small.y + dy * u, r * u * (.8 + .2 * Math.sin(t * 5 + dx * 50)), 0, TAU); ctx.fill(); }
}
function drawMorphWorm(ctx, q) {
  const { k, b, u, t, e } = q, C = MORPH_INK, f = e.facing || { x: 1, y: 0 }, ang = Math.atan2(f.y, f.x), nip = (e.nipUntil || 0) > t * 1000 ? .35 : 0, segs = 7;
  shadowAt(ctx, k, b, u * .5, u * .12);
  for (let i = segs - 1; i >= 0; i--) { const back = i * u * .16, wig = Math.sin(t * 12 - i * .9 + (e.seed || 1)) * u * .1, x = k - Math.cos(ang) * back - Math.sin(ang) * wig, y = b - u * .18 - Math.sin(ang) * back * .6 + Math.cos(ang) * wig * .6 - (i === 0 ? nip * u : 0), r = u * (.17 - i * .012);
    ctx.fillStyle = i % 2 ? C.flesh : C.sheen; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); outline(ctx, Math.max(1, u * .03)); if (i === 0) { ctx.fillStyle = "#080306"; ctx.beginPath(); ctx.arc(x + Math.cos(ang) * r * .5, y, r * .45, 0, TAU); ctx.fill(); ctx.fillStyle = C.bone; ctx.beginPath(); ctx.arc(x + Math.cos(ang) * r * .5, y, r * .45, 0, TAU); ctx.lineWidth = Math.max(1, u * .02); ctx.strokeStyle = C.bone; ctx.stroke(); } }
}
// The Morphling's reach in world space (drawn with the pack effects): cables and their pulses, the stretching jaw arm,
// the lunge's warning band and where it will rise from the floor.
export function drawMorphEffects(ctx, enemies, s, now) {
  const C = MORPH_INK;
  for (const e of enemies || []) {
    const m = e.morph; if (!m || e.dead) continue;
    ctx.save(); ctx.lineCap = "round";
    for (const c of m.cables || []) {
      if (now >= c.until) continue; const live = now >= c.liveAt, ax = c.a.x * s, ay = c.a.y * s, bx = c.b.x * s, by = c.b.y * s;
      ctx.strokeStyle = live ? C.cable : DANGER.edge; ctx.lineWidth = live ? Math.max(2, s * .1) : Math.max(1, s * .04); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      if (live) { ctx.strokeStyle = C.sheen + "77"; ctx.lineWidth = Math.max(1, s * .03); ctx.stroke(); const f = ((now - c.liveAt) / 1000) * 8 / Math.max(1, c.len), g = f - 2 * Math.floor(f / 2), u2 = g <= 1 ? g : 2 - g, px = ax + (bx - ax) * u2, py = ay + (by - ay) * u2; glow(ctx, px, py, s * .7, "#9fe8ff", .7); ctx.fillStyle = "#e9fbff"; ctx.beginPath(); ctx.arc(px, py, s * .16, 0, TAU); ctx.fill(); }
      else { ctx.fillStyle = C.vein + "88"; ctx.beginPath(); ctx.arc(bx, by, s * .12, 0, TAU); ctx.fill(); }
    }
    if (m.move === "jaw" && m.jaw) { // the arm stretches out, and a dragon's head opens at its end
      const j = m.jaw, reach = Math.min(1, (now - m.t0) / 650), fx = j.from.x * s, fy = (j.from.y - .3) * s, tx = (j.from.x + (j.to.x - j.from.x) * reach) * s, ty = (j.from.y - .3 + (j.to.y - j.from.y + .3) * reach) * s, ang = Math.atan2(ty - fy, tx - fx), open = j.bit ? 0 : Math.min(1, Math.max(0, (now - m.t0 - 650) / 450)) * .7;
      ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); ctx.arc(j.to.x * s, j.to.y * s, 1.15 * s, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.flesh; ctx.lineWidth = Math.max(3, s * .22); ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo((fx + tx) / 2 + Math.sin(now / 80) * s * .3, (fy + ty) / 2 - s * .6, tx, ty); ctx.stroke(); ctx.strokeStyle = C.sheen + "88"; ctx.lineWidth = Math.max(1, s * .06); ctx.stroke();
      ctx.translate(tx, ty); ctx.rotate(ang); const L = s * .9;
      for (const sg of [-1, 1]) { ctx.save(); ctx.rotate(sg * open); ctx.fillStyle = C.flesh; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, sg * s * .08); ctx.lineTo(L * .85, sg * s * .3); ctx.lineTo(0, sg * s * .32); ctx.closePath(); ctx.fill(); outline(ctx, Math.max(1, s * .03)); ctx.fillStyle = C.bone; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(L * i / 6, sg * s * .06); ctx.lineTo(L * i / 6 + s * .05, -sg * s * .06); ctx.lineTo(L * i / 6 + s * .1, sg * s * .06); ctx.fill(); } if (sg < 0) eye(ctx, L * .35, -s * .2, Math.max(1, s * .05), C.eye); ctx.restore(); }
      ctx.rotate(-ang); ctx.translate(-tx, -ty);
    }
    if (m.move === "beams" && m.beams) { // release 389: four beams in a cross, turning round it
      const bm = m.beams, live = now >= bm.liveAt, cx = (e.x + .5) * s, cy = (e.y + .45) * s, L = MORPH_FORM.beams.length * s;
      for (let i = 0; i < MORPH_FORM.beams.count; i++) { const a = beamAngle(bm, i, now), ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L;
        if (!live) { ctx.strokeStyle = DANGER.edge; ctx.lineWidth = Math.max(1, s * .08); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke(); continue; }
        for (const [w, c] of [[s * .9, "#c45cff22"], [s * .5, "#e08cff55"], [s * .22, "#ff9bf0cc"], [s * .08, "#fff2fd"]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke(); }
        glow(ctx, cx, cy, s * .8, "#ff7be6", .5); }
    }
    if (m.move === "lunge" && m.lunge && now < m.lunge.goAt) { const l = m.lunge, x = l.from.x * s, y = l.from.y * s, ang = Math.atan2(l.dir.y, l.dir.x); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = Math.floor(now / 90) % 2 ? DANGER.fillStrong : DANGER.fill; ctx.fillRect(0, -s * .75, s * 9, s * 1.5); ctx.rotate(-ang); ctx.translate(-x, -y); }
    if (m.move === "sink" && m.sink) { const x = (m.sink.to.x + .5) * s, y = (m.sink.to.y + .82) * s, k2 = Math.min(1, (now - m.t0) / 1300); ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); ctx.ellipse(x, y, s * 2.3, s * .7, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, y, s * 2.3 * k2, s * .7 * k2, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = C.deep + "aa"; ctx.beginPath(); ctx.ellipse(x, y, s * .5 * k2, s * .15 * k2, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}

export function drawPackMonster(ctx, e, s, now, facing = "down") {
  const def = MONSTER_PACK[e.kind];
  if (!def) return false;
  const stun = Math.max(0, Math.min(1, Number(e.poiseBreak) || 0));
  if (stun > 0) { // release 307: a staggered boss sags and sways on its base, dazed
    const k = (e.x + .5) * s, b = (e.y + .82) * s, t = now / 1000, sway = Math.sin(t * 7) * .09 * stun, sag = .14 * Math.min(1, (1 - stun) * 6, stun * 3);
    ctx.save(); ctx.translate(k, b); ctx.rotate(sway); ctx.scale(1 + sag * .4, 1 - sag); ctx.translate(-k, -b);
  }
  const drawn = drawPackSprite(ctx, e, s, now, facing, def) || paintPackMonster(ctx, e, s, now, facing, def, false);
  if (stun > 0) { ctx.restore(); drawDazed(ctx, e, s, now, stun); }
  return drawn;
}
// Stars circling over a staggered boss, and a cracked ring at its feet that closes as it recovers.
function drawDazed(ctx, e, s, now, stun) {
  const scale = Math.max(.6, Number(e.scale) || 1), k = (e.x + .5) * s, b = (e.y + .82) * s, top = b - s * scale * 1.15, t = now / 1000, r = s * scale * .42;
  ctx.save();
  ctx.strokeStyle = `rgba(255,226,140,${.55 * stun})`; ctx.lineWidth = Math.max(2, s * .06); ctx.setLineDash([s * .18, s * .1]);
  ctx.beginPath(); ctx.ellipse(k, b, s * scale * .7, s * scale * .22, 0, 0, Math.PI * 2 * stun); ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < 4; i++) { const a = t * 4 + i * Math.PI / 2, x = k + Math.cos(a) * r, y = top + Math.sin(a) * r * .3, z = s * .1 * (1 + .25 * Math.sin(a));
    ctx.fillStyle = i % 2 ? "#fff3b0" : "#ffd25a"; ctx.beginPath(); for (let j = 0; j < 10; j++) { const q = j * Math.PI / 5 - Math.PI / 2, rr = j % 2 ? z * .45 : z; ctx.lineTo(x + Math.cos(q) * rr, y + Math.sin(q) * rr); } ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function paintPackMonster(ctx, e, s, now, facing, def, sprite) {
  const scale = Math.max(.6, Number(e.scale) || 1), u = s * scale, k = (e.x + .5) * s, b = (e.y + .82) * s - (["astralWorm","astralMirage"].includes(e.kind)?0:e.hopLift || 0) * s * .2 - (astralMountPresentation(e)?.lift || 0) * s, t = now / 1000 + ((e.id?.length || 3) * 1.7);
  const flip = ["astralWorm","astralMirage"].includes(e.kind)&&e.astral?.facingX ? (e.astral.facingX<0?-1:1) : e.facingX ? (e.facingX < 0 ? -1 : 1) : facing === "left" ? -1 : 1, s0 = e.pack;
  const state = s0?.attack ? (s0.phase === "windup" ? "windup" : "attack") : "idle";
  const bodyLift = e.kind === "psychicCrystal" ? (Number(e.flightLiftDelta) || 0) * s : 0;
  const q = { k, b, u, s, t, p: def.palette, flip, e, state, bodyLift };
  ctx.save();
  if (e.phasing || (e.phases && e.untargetable)) ctx.globalAlpha = .45;
  if (e.aloft && e.kind === "cinderSeraph") { if (!sprite) ctx.globalAlpha = .35; q.b -= u * .9; }
  if (e.illusion) ctx.globalAlpha *= .92;
  if (e.fleeFade != null && e.giantCloud) { q.b -= (1 - e.fleeFade) * u * 2.4; drawGiantCloud(ctx, k, q.b, u, e.fleeFade, t, -flip); ctx.globalAlpha *= Math.min(1, e.fleeFade * 1.6); } // release 257: up into the sky on its cloud
  else if (e.fleeFade != null) { ctx.globalAlpha *= e.fleeFade; q.b += (1 - e.fleeFade) * u * .5; } // release 239: going into its home ground
  if (e.boss) { glow(ctx, k, b - u * .4 - bodyLift, u * 1.05, def.palette[2], .18); }
  const riding=astralMountPresentation(e), boarding=riding?.boarding;
  if(boarding)drawAstralBoarding(ctx,{...boarding,form:riding.form},{tile:s,unit:u,facing:flip,riderX:k,riderY:b,reducedMotion:!!e.reduceMotion});
  if(riding?.riding)drawAstralSaddle(ctx,{x:k,y:b,unit:u,form:riding.form,facing:flip});
  const riderAlpha=astralBoardingRiderAlpha(boarding),fullAlpha=ctx.globalAlpha;ctx.globalAlpha*=riderAlpha;
  if(riderAlpha>0)BODY[def.render]?.(ctx, q);
  ctx.globalAlpha=fullAlpha;
  if(riding?.riding)drawAstralSaddle(ctx,{x:k,y:b,unit:u,form:riding.form,facing:flip,layer:'front'});
  if(boarding)drawAstralBoarding(ctx,boarding,{tile:s,unit:u,facing:flip,riderX:k,riderY:b,layer:'front'});
  if (e.hitFlash > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, k, b - u * .4 - bodyLift, u * .55, "#ffffff", .5); }
  ctx.restore();
  return true;
}

// Telegraphs of in-progress attacks (drawn under creatures).
export function drawPackTelegraphs(ctx, enemies, s, now, visible = () => true, heights = {}) {
  for (const e of enemies) {
    if(e.astralAllyOf&&!e.dead&&visible(e)&&e.astralAllyEffects?.length) drawPackEffects(ctx,e.astralAllyEffects,s,now,()=>true,(x,y)=>heights.ground?.(x,y)||0,{reduceMotion:!!heights.reduceMotion});
    if(e.kind==='astralWorm'&&!e.dead&&visible(e)&&e.astral){
      const project=(x,y)=>({x:(x+.5)*s,y:(y+.62-(heights.ground?.(x,y)||0))*s});
      drawAstralHazards(ctx,e.astral.hazards,project,s);
      drawAstralInkBlobs(ctx,e.astral.blobs||[],project,s);
    }
    { const b = !e.dead && visible(e) && bodyHitFootprint(e); if (b) { const by = (e.y + .6 - (heights.ground?.(e.x, e.y) || 0)) * s, R = b.radius * s; ctx.save(); ctx.fillStyle = b.armed ? DANGER.fillStrong : DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 2; if (!b.armed) ctx.setLineDash([s * .15, s * .1]); ctx.beginPath(); ctx.ellipse((e.x + .5) * s, by, R, R * .6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); } } // release 427: the body's own reach while it hits with it
    const tele = e.pack?.tele;
    if (e.dead || !tele || !visible(e)) continue;
    const crystal = e.kind === "psychicCrystal", walker = e.kind === "voidWalker", ground = crystal || walker ? heights.ground?.(e.x, e.y) || 0 : 0;
    const lift = crystal && ["tether", "brace", "shimmer"].includes(tele.type) ? heights.body?.(e) ?? ground : ground;
    const def = MONSTER_PACK[e.kind], c = def?.palette?.[2] || "#ff7a6b", cx = (e.x + .5) * s, cy = (e.y + .45 - lift) * s, pulse = .55 + Math.sin(now / 90) * .25;
    ctx.save(); ctx.lineCap = "round";
    if (walker && tele.void) {
      const quiet = !!(heights.reduceMotion || heights.safeMode || e.reduceMotion), clock = quiet ? 0 : now / 1000;
      if (tele.type === "lane") { const a = Math.atan2(tele.aim.y, tele.aim.x); drawVoidLane(ctx, cx, cy + s * .17, a, tele.length * s, tele.width * s, true, s); }
      else if (tele.type === "blink") drawVoidGalaxy(ctx, (tele.x + .5) * s, (tele.y + .28 - (heights.ground?.(tele.x, tele.y) || 0)) * s, s * .25, s * .44, -.1, clock, .65);
      else glow(ctx, cx, cy - s * .15, s * .52, "#b779ff", .2);
    }
    else if (tele.type === "arc") { const a = Math.atan2(tele.aim.y, tele.aim.x), half = tele.arc * Math.PI / 360; ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, tele.radius * s, a - half, a + half); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (tele.type === "rect") { const a = tele.aim, w = tele.width * s, px = -a.y * w, py = a.x * w, l = tele.length * s; ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + px, cy + py); ctx.lineTo(cx + a.x * l + px, cy + a.y * l + py); ctx.lineTo(cx + a.x * l - px, cy + a.y * l - py); ctx.lineTo(cx - px, cy - py); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (tele.type === "beam") {
      const ex = cx + Math.cos(tele.angle) * tele.length * s, ey = cy + Math.sin(tele.angle) * tele.length * s;
      if (tele.charging) { ctx.strokeStyle = DANGER.edge; ctx.lineWidth = Math.max(1, s * .04 * pulse); ctx.setLineDash([s * .2, s * .12]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]); }
      else { const bc = tele.laser ? "#ff3a2a" : c; for (const [w, a] of [[.55, "33"], [.3, "88"], [.12, "ff"]]) { ctx.strokeStyle = (w < .2 ? "#ffffff" : bc) + a; ctx.lineWidth = s * w * (.9 + pulse * .2); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke(); } glow(ctx, ex, ey, s * .45, bc, .7); }
    } else if (tele.type === "circle") { drawWarningCircle(ctx, (tele.x + .5) * s, (tele.y + .6) * s, tele.radius * s, DANGER.hex, pulse, 1 - Math.max(0, tele.left ?? e.pack.t) / (tele.total || .75)); }
    else if (tele.type === "blink") { const bx = (tele.x + .5) * s, by = (tele.y + .6) * s; glow(ctx, bx, by - s * .2, s * .6, c, .6 * pulse); ctx.strokeStyle = c + "cc"; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(bx, by, s * (.25 + i * .15) * pulse, s * (.12 + i * .07) * pulse, 0, 0, TAU); ctx.stroke(); } }
    else if (tele.type === "lane") { const a = tele.aim, w = tele.width * s, px = -a.y * w, py = a.x * w, l = tele.length * s; ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 2; if (tele.phase) ctx.setLineDash([s * .18, s * .1]); ctx.beginPath(); ctx.moveTo(cx + px, cy + py); ctx.lineTo(cx + a.x * l + px, cy + a.y * l + py); ctx.lineTo(cx + a.x * l - px, cy + a.y * l - py); ctx.lineTo(cx - px, cy - py); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); for (let i = 1; i < 5; i++) { const f = ((now / 400 + i / 5) % 1) * l; ctx.fillStyle = DANGER.edge; ctx.beginPath(); ctx.moveTo(cx + a.x * (f + s * .2), cy + a.y * (f + s * .2)); ctx.lineTo(cx + a.x * f + px * .6, cy + a.y * f + py * .6); ctx.lineTo(cx + a.x * f - px * .6, cy + a.y * f - py * .6); ctx.fill(); } }
    else if (crystal && (tele.type === "ring" || tele.type === "tether" && tele.reaching)) { // release 405 (Tim: "the pull move and the grab move should have a wave... where you're gonna get... in the grab range or in the push range"): the reach filled in pink, with waves travelling the way the force moves
      const gx = (e.x + .5) * s, gy = (e.y + .6 - ground) * s, grab = tele.type === "tether", R = (grab ? CRYSTAL.grabRange : tele.radius) * s, inward = grab || !!tele.inhale;
      ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(gx, gy, R, R * .6, 0, 0, TAU); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 3; i++) { const f = ((now / 700 + i / 3) % 1), k = inward ? 1 - f : f; ctx.strokeStyle = `rgba(255,130,210,${(.75 * (inward ? f : 1 - f)).toFixed(3)})`; ctx.lineWidth = Math.max(1.5, s * .06); ctx.beginPath(); ctx.ellipse(gx, gy, R * Math.max(.04, k), R * .6 * Math.max(.04, k), 0, 0, TAU); ctx.stroke(); }
      if (grab) { const tx = (tele.x + .5) * s, ty = (tele.y + .6 - (heights.ground?.(tele.x, tele.y) || 0)) * s; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = Math.max(1.5, s * .05); ctx.setLineDash([s * .18, s * .12]); ctx.lineDashOffset = now / 30; ctx.beginPath(); ctx.moveTo(gx, gy - s * .3); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); for (let i = 0; i < 3; i++) { const f = (now / 450 + i / 3) % 1; ctx.fillStyle = DANGER.edge; ctx.beginPath(); ctx.arc(gx + (tx - gx) * f, gy - s * .3 + (ty - gy + s * .3) * f, Math.max(2, s * .09), 0, TAU); ctx.fill(); } }
    }
    else if (tele.type === "ring" && tele.inhale) { ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const rr = tele.radius * s * (1 - ((now / 900 + i / 3) % 1)); ctx.beginPath(); ctx.ellipse(cx, cy + s * .15, rr, rr * .6, 0, 0, TAU); ctx.stroke(); } }
    else if (tele.type === "ring") { ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 2; ctx.setLineDash([s * .15, s * .1]); ctx.beginPath(); ctx.ellipse(cx, cy + s * .15, tele.radius * s, tele.radius * s * .7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    else if (tele.type === "shadow") { const sx = (tele.x + .5) * s, sy = (tele.y + .6) * s; ctx.fillStyle = tele.locked ? "#3a0d06aa" : "#1a0a0688"; ctx.beginPath(); ctx.ellipse(sx, sy, s * 1.6, s * 1.6 * .6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = DANGER.edge; ctx.lineWidth = tele.locked ? 3 : 2; ctx.stroke(); }
    else if (tele.type === "spit") { ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo((tele.target.x + .5) * s, (tele.target.y + .6) * s); ctx.stroke(); ctx.setLineDash([]); }
    else if (tele.type === "tendrils") { for (const a of tele.dirs) { const w = tele.width * s, px = -a.y * w, py = a.x * w, l = tele.length * s; ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + px, cy + py); ctx.lineTo(cx + a.x * l + px, cy + a.y * l + py); ctx.lineTo(cx + a.x * l - px, cy + a.y * l - py); ctx.lineTo(cx - px, cy - py); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    else if (tele.type === "cone") { const a = Math.atan2(tele.aim.y, tele.aim.x), half = tele.arc * Math.PI / 360, l = tele.length * s; ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 2; ctx.setLineDash([s * .18, s * .1]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, l, a - half, a + half); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); }
    else if (tele.type === "tether") { const px = (tele.x + .5) * s, py = (tele.y + .45 - (crystal ? heights.ground?.(tele.x, tele.y) || 0 : 0)) * s, held = tele.holding; ctx.strokeStyle = held ? "rgba(190,110,255,.85)" : `rgba(190,110,255,${.35 + .3 * pulse})`; ctx.lineWidth = held ? Math.max(3, s * .1) : 2; if (!held) ctx.setLineDash([s * .2, s * .12]); ctx.beginPath(); ctx.moveTo(cx, cy - s * .6); ctx.quadraticCurveTo((cx + px) / 2, Math.min(cy, py) - s * 1.2, px, py); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.ellipse(px, py + s * .2, s * (held ? .55 : .7 * pulse), s * (held ? .3 : .38 * pulse), 0, 0, TAU); ctx.stroke(); if (held) glow(ctx, px, py - s * .1, s * .7, "#b06aff", .45); } // release 249: the Crystal's reach, and its hold
    else if (tele.type === "brace" || tele.type === "shimmer" || tele.type === "rise" || tele.type === "submerge") { glow(ctx, cx, cy, s * .9, c, .35 * pulse); }
    ctx.restore();
  }
}

function drawWarningCircle(ctx, x, y, r, color, pulse, progress = 0) {
  ctx.fillStyle = color + "22"; ctx.strokeStyle = color + "99"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.fill(); ctx.stroke();
  const inner = Math.max(0, Math.min(1, progress)); ctx.fillStyle = color + "3a"; ctx.beginPath(); ctx.ellipse(x, y, r * inner, r * .6 * inner, 0, 0, TAU); ctx.fill();
}

// Ground effects (mortars, sigils, ruptures, webs, embers, shockwaves, dust).
// Puddles and clouds lie on the ground they cover, so they are drawn raised with it (`lift`, in tiles; release 237).
const ON_GROUND = new Set(["ooze", "lava", "gas", "web", "flesh", "flameTrail", "frostTrail", "furrow", "scorch", "orbital"]);
const VOID_EFFECTS = new Set(["voidRend", "voidRift", "voidWraith", "voidBeam", "voidHorizon", "voidNova", "voidParticle", "voidEruption", "voidAfterimage"]);
const VOID_COLORS = { edge: "#be91ff", core: "#f0dcff", dark: "#110923", warn: "#dfbaff" };
// Original cosmic motifs shared by the Walker's effects. Stars are deterministic and the draw path never changes
// combat state. Reduced motion freezes decorative rotation, but preserves warning, activation and expiry states.
function drawVoidGalaxy(ctx, x, y, rx, ry, angle, time, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha *= alpha;
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fillStyle = "#0a0616"; ctx.fill();
  ctx.save(); ctx.clip();
  const g = ctx.createLinearGradient(-rx, -ry, rx, ry); g.addColorStop(0, "#0b0820"); g.addColorStop(.34, "#211341"); g.addColorStop(.49, "#7547a8"); g.addColorStop(.54, "#bc8cec"); g.addColorStop(.62, "#39245b"); g.addColorStop(1, "#090615");
  ctx.fillStyle = g; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
  ctx.strokeStyle = "#ceb6ff44"; ctx.lineWidth = Math.max(.7, rx * .025);
  for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(0, 0, rx * (.38 + i * .2), ry * (.17 + i * .14), -.45 + time * .08, i * Math.PI, i * Math.PI + 4.6); ctx.stroke(); }
  for (let i = 0; i < 16; i++) { const a = i * 2.399, d = .2 + ((i * 7) % 13) / 16, sx = Math.cos(a) * rx * d, sy = Math.sin(a) * ry * d; ctx.fillStyle = i % 4 ? "#eedcffaa" : "#ffffff"; ctx.beginPath(); ctx.arc(sx, sy, Math.max(.55, Math.min(1.6, Math.min(rx, ry) * (i % 4 ? .016 : .025))), 0, TAU); ctx.fill(); }
  ctx.restore(); ctx.strokeStyle = VOID_COLORS.edge; ctx.lineWidth = Math.max(1, Math.min(rx, ry) * .045); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = "#f3dfffaa"; ctx.lineWidth = Math.max(.7, Math.min(rx, ry) * .015); ctx.beginPath(); ctx.ellipse(0, 0, rx * 1.035, ry * 1.035, 0, -.9, 1.4); ctx.stroke(); ctx.restore();
}
function drawVoidWarning(ctx, x, y, r, progress) { // release 427: in the one damage pink, as every boss's warnings are
  ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = "#f2dfff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, Math.min(1, progress))); ctx.stroke();
}
function drawVoidLane(ctx, x, y, angle, length, half, arming, s) {
  const dx = Math.cos(angle), dy = Math.sin(angle), nx = -dy * half, ny = dx * half;
  ctx.fillStyle = arming ? DANGER.fill : DANGER.fillStrong; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = arming ? 1.5 : 1; // release 427: pink lanes
  if (arming) ctx.setLineDash([s * .12, s * .1]);
  ctx.beginPath(); ctx.moveTo(x + nx, y + ny); ctx.lineTo(x + dx * length + nx, y + dy * length + ny); ctx.arc(x + dx * length, y + dy * length, half, angle + Math.PI / 2, angle - Math.PI / 2, true); ctx.lineTo(x - nx, y - ny); ctx.arc(x, y, half, angle - Math.PI / 2, angle + Math.PI / 2, true); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
}
function drawVoidEffect(ctx, f, s, now, lift, presentation) {
  const quiet = !!(presentation?.reduceMotion || presentation?.safeMode || f.reduceMotion), time = quiet ? 0 : now / 1000;
  const x = (f.x + .5) * s, y = (f.y + .62 - (Number(lift(f)) || 0)) * s, r = Math.max(.04, Number(f.radius) || .5) * s;
  const arming = (Number(f.arming) || 0) > 0, life = Math.max(0, Number(f.life) || 0), age = Math.max(0, Number(f.age) || 0);
  const armTotal = Math.max(.001, Number(f.armTotal) || (Number(f.arming) || 0) + age), progress = arming ? Math.max(0, Math.min(1, 1 - f.arming / armTotal)) : 1;
  const edge = VOID_COLORS.edge, core = VOID_COLORS.core, fade = Math.min(1, life * 5), angle = Number(f.angle) || 0;
  const line = (ax, ay, bx, by, width, color) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); };
  const polygon = (pts, color, border = edge) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); if (border) { ctx.strokeStyle = border; ctx.lineWidth = Math.max(.8, s * .025); ctx.stroke(); } };
  ctx.save(); ctx.globalAlpha *= fade; ctx.lineJoin = "round";
  if (f.kind === "voidRend") {
    const lane = f.variant === "claw" || f.variant === "sword", length = Math.max(0, Number(f.length) || 0) * s, half = Math.max(.04, Number(f.width) || .3) * s;
    if (lane) {
      drawVoidLane(ctx, x, y, angle, length, half, arming, s);
      drawVoidGalaxy(ctx, x, y, s * .24, s * .5, angle, time, arming ? .65 : 1);
      if (!arming) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
        if (f.variant === "sword") { polygon([0, -half * .45, length * .76, -half * .45, length, 0, length * .76, half * .45, 0, half * .45], "#47266c", core); line(s * .1, 0, length * .91, 0, Math.max(1, s * .04), "#c79af6"); line(s * .14, -half * .85, s * .14, half * .85, Math.max(2, s * .06), "#9565c5"); }
        else for (let i = -1; i <= 1; i++) { const yy = i * half * .65; ctx.beginPath(); ctx.moveTo(0, yy - half * .09); ctx.quadraticCurveTo(length * .65, yy - half * .35, length, yy + half * .18); ctx.quadraticCurveTo(length * .5, yy + half * .02, 0, yy + half * .08); ctx.closePath(); ctx.fillStyle = "#43205f"; ctx.fill(); ctx.strokeStyle = core; ctx.lineWidth = Math.max(1, s * .025); ctx.stroke(); }
        ctx.restore();
      }
      ctx.restore(); return;
    }
    if (arming) drawVoidWarning(ctx, x, y, r, progress);
    else { ctx.strokeStyle = "#cf98ff99"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
    const spike = f.variant === "spike", py = spike ? y : y - r * .72;
    if (arming || f.variant !== "slash") drawVoidGalaxy(ctx, x, py, r * (spike ? .75 : .55), r * (spike ? .2 : .66), spike ? 0 : -.15, time, arming ? .6 : 1);
    if (!arming) {
      ctx.translate(x, y); if (f.variant !== "hand" && !spike) ctx.rotate(angle);
      if (f.variant === "hand") { // an open hand with five distinct fingers, never a clenched fist
        polygon([-r * .22, -r * .85, r * .2, -r * .85, r * .34, -r * .2, r * .21, r * .05, -r * .22, r * .05, -r * .34, -r * .24], "#382052");
        ctx.lineCap = "round";
        for (let i = 0; i < 5; i++) { const ax = (i - 2) * r * .13, bx = (i - 2) * r * .22, ey = r * (.55 - Math.abs(i - 2) * .09); line(ax, -r * .16, bx, ey, Math.max(2, r * .13), "#28133e"); line(ax - r * .025, -r * .16, bx - r * .02, ey, Math.max(1, r * .035), "#c9a5f3"); }
        ctx.strokeStyle = "#e9caff88"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -r * .1, r * .18, 0, Math.PI); ctx.stroke();
      } else if (spike) {
        for (let i = -1; i <= 1; i++) { const xx = i * r * .38, h = r * (i ? .78 : 1.35); polygon([xx - r * .18, r * .15, xx + r * .02, -h, xx + r * .19, r * .15], i ? "#27123e" : "#4f2b73"); line(xx + r * .02, -h, xx + r * .03, r * .05, 1, core); }
      } else { for (const a of [-.35, .35]) { ctx.save(); ctx.rotate(a); ctx.strokeStyle = core; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath(); ctx.arc(-r * .6, 0, r * 1.2, -.8, .8); ctx.stroke(); ctx.restore(); } }
    }
  } else if (f.kind === "voidRift") {
    const py = y - s * .35, rx = r * .58, ry = r * .88;
    glow(ctx, x, py, r * 1.3, edge, f.activated ? .14 : .3); drawVoidGalaxy(ctx, x, py, rx, ry, -.12, time, f.activated ? .42 : 1);
    // The small rim mark indicates a pending output; an exhausted constellation rend becomes visibly dim.
    if (!f.activated) { const activation = f.tracking ? Math.min(1, age / Math.max(.1, Number(f.activationAt) || 1)) : progress; ctx.strokeStyle = f.output === "beam" ? "#efd3ff" : f.output === "walker" ? "#b3d6ff" : edge; ctx.lineWidth = Math.max(2, s * .04); ctx.beginPath(); ctx.arc(x, py, rx * .92, -Math.PI / 2, -Math.PI / 2 + .9 + activation * 1.5); ctx.stroke(); }
  } else if (f.kind === "voidBeam") {
    const dx = Math.cos(angle), dy = Math.sin(angle), length = Math.max(0, Number(f.length) || 0) * s, half = Math.max(.04, Number(f.width) || .18) * s, tx = x + dx * length, ty = y + dy * length;
    if (arming) { drawVoidLane(ctx, x, y, angle, length, half, true, s); line(x, y, tx, ty, Math.max(1, half * .2), "#b078d866"); }
    else { ctx.lineCap = "round"; line(x, y, tx, ty, half * 2, "#6e35b285"); line(x, y, tx, ty, half * 1.05, "#c38affdd"); line(x, y, tx, ty, Math.max(1, half * .24), core); }
  } else if (f.kind === "voidWraith") {
    if (arming) { drawVoidWarning(ctx, x, y, r, progress); drawVoidGalaxy(ctx, x, y - s * .3, s * .25, s * .45, -.1, time, .7); ctx.restore(); return; }
    const yy = y - s * .3, rr = Math.min(r, s * .5);
    ctx.save(); ctx.translate(x, yy); ctx.rotate(angle); polygon([-rr * .8, -rr * .43, rr * .55, -rr * .3, rr * .85, 0, rr * .55, rr * .3, -rr * .8, rr * .43, -rr * .35, 0], "#2e184bd9");
    drawVoidGalaxy(ctx, rr * .18, 0, rr * .32, rr * .28, 0, time);
    ctx.restore();
    if (f.slashFlash > 0) { ctx.strokeStyle = "#c59aee77"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.strokeStyle = core; ctx.lineWidth = Math.max(2, s * .05); ctx.beginPath(); ctx.arc(x, y, r, angle - 1.15, angle + 1.15); ctx.stroke(); }
  } else if (f.kind === "voidHorizon") {
    const coreR = Math.max(.1, Number(f.coreRadius) || .35) * s;
    ctx.strokeStyle = "#a675dc66"; ctx.lineWidth = 1; ctx.setLineDash([s * .12, s * .14]); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 3; i++) { const rr = coreR + (r - coreR) * (.25 + i * .23), a = time * .5 + i * 2.1; ctx.strokeStyle = "#c399ff55"; ctx.beginPath(); ctx.arc(x, y, rr, a, a + 1.8); ctx.stroke(); }
    glow(ctx, x, y, coreR * 2.6, edge, .4); drawVoidGalaxy(ctx, x, y, coreR * 1.55, coreR * .66, -.35, time);
    ctx.fillStyle = "#050309"; ctx.beginPath(); ctx.arc(x, y, coreR, 0, TAU); ctx.fill(); ctx.strokeStyle = core; ctx.lineWidth = Math.max(1.2, s * .035); ctx.stroke();
    if (arming) drawVoidWarning(ctx, x, y, coreR, progress);
    if (f.pulsar) { const dx = Math.cos(angle), dy = Math.sin(angle); line(x + dx * coreR, y + dy * coreR, x + dx * coreR * 2.4, y + dy * coreR * 2.4, Math.max(2, s * .04), f.pulseFlash > 0 ? core : "#af73e9aa"); }
  } else if (f.kind === "voidNova") {
    const charge = f.stage === "charge", burst = f.stage === "burst";
    drawVoidGalaxy(ctx, x, y, r, r, -.2, time * .3, charge ? .62 : .42);
    ctx.strokeStyle = charge ? "#d2a4ffdd" : "#a879df77"; ctx.lineWidth = Math.max(1.5, s * .04); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    const chargeProgress = Math.min(1, Math.max(0, Number(f.elapsed) || 0) / VOID.novaCharge), coreR = s * (burst ? .8 : charge ? .3 + chargeProgress * .3 : .28); glow(ctx, x, y, coreR * 2, edge, charge ? .6 : .3);
    ctx.fillStyle = charge ? "#e8cbff" : "#3e2361"; ctx.beginPath(); ctx.arc(x, y, coreR * .4, 0, TAU); ctx.fill();
    if (charge) for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + time * .12; line(x + Math.cos(a) * r * .62, y + Math.sin(a) * r * .62, x + Math.cos(a) * r * .45, y + Math.sin(a) * r * .45, Math.max(1, s * .025), "#dbc3ff66"); }
    // Burst damage is represented by separate, wall-colliding particles, not a misleading solid lethal ring.
  } else if (f.kind === "voidParticle") {
    const m = Math.hypot(f.vx || 0, f.vy || 0) || 1, dx = (f.vx || 0) / m, dy = (f.vy || 0) / m;
    line(x - dx * r * 2.6, y - dy * r * 2.6, x, y, Math.max(1, r), "#bd83f366");
    polygon([x + dx * r, y + dy * r, x - dy * r * .6, y + dx * r * .6, x - dx * r, y - dy * r, x + dy * r * .6, y - dx * r * .6], core, edge);
  } else if (f.kind === "voidEruption") {
    if (arming) drawVoidWarning(ctx, x, y, r, progress);
    else { glow(ctx, x, y, r * 1.3, edge, .45); ctx.strokeStyle = core; ctx.lineWidth = Math.max(1.5, s * .04); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + f.x * .7, dx = Math.cos(a), dy = Math.sin(a); polygon([x + dx * r * .25 - dy * r * .09, y + dy * r * .25 + dx * r * .09, x + dx * r * .85, y + dy * r * .85 - s * .22, x + dx * r * .25 + dy * r * .09, y + dy * r * .25 - dx * r * .09], i % 2 ? "#71449c" : "#c39be9", core); } }
  } else if (f.kind === "voidAfterimage") {
    const tx = ((Number(f.tx) || 0) + .5) * s, ty = ((Number(f.ty) || 0) + .62 - (Number(lift(f)) || 0)) * s;
    ctx.globalAlpha *= Math.max(.22, Math.min(1, life / (Number(f.total) || 1))); ctx.lineCap = "round";
    // This whole band is the one-second damage footprint. It is not merely cosmetic smoke.
    line(x, y, tx, ty, r * 2, "#9c60e36b"); line(x, y, tx, ty, Math.max(1, r * .6), "#dfb9ffbb");
    ctx.setLineDash([s * .12, s * .1]); line(x, y, tx, ty, Math.max(1, s * .025), core); ctx.setLineDash([]);
  }
  ctx.restore();
}
function lavaCool(f, life) { return 1 - Math.max(0, Math.min(1, life / (f.total || 1.8))); }
function lavaShape(ctx, f, x, y, r, k) {
  const seed = f.x * 7.3 + f.y * 3.1, vx = f.vx || 0, vy = f.vy || 0, m = Math.hypot(vx, vy) || 1, ax = vx / m, ay = vy / m;
  ctx.beginPath(); for (let i = 0; i <= 18; i++) { const a = i / 18 * TAU, along = Math.cos(a) * ax + Math.sin(a) * ay, rr = r * k * (1 + .14 * Math.sin(a * 3 + seed) + .08 * Math.sin(a * 5 - seed) + .3 * Math.max(0, along)); i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .6) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .6); } ctx.closePath();
}
function drawCrystalWater(ctx, f, s, now, lift, presentation) {
  const quiet = !!(presentation?.reduceMotion || presentation?.safeMode || f.reduceMotion), time = quiet ? 0 : now / 1000;
  const x = (f.x + .5) * s, y = (f.y + .62 - (Number(lift(f)) || 0)) * s, r = (f.radius || CRYSTAL.debrisRadius) * s;
  const raised = Math.max(0, f.lift || 0), ry = y - (raised + .2) * s;
  ctx.save(); ctx.lineCap = "round";
  if (f.state === "splash") {
    const progress = 1 - Math.max(0, Math.min(1, f.life / (f.total || CRYSTAL.waterSplashLife))), spread = quiet ? .9 : .4 + progress;
    ctx.globalAlpha *= 1 - progress; ctx.strokeStyle = "#ccf9ff"; ctx.lineWidth = Math.max(1, s * .035);
    ctx.beginPath(); ctx.ellipse(x, y, r * spread * 1.6, r * spread * .6, 0, 0, TAU); ctx.stroke();
    if (!quiet) for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + (f.shape || 0), dx = Math.cos(a) * r * spread * 1.5, dy = Math.sin(a) * r * spread * .6 - Math.sin(progress * Math.PI) * r; ctx.fillStyle = "#bcefffcc"; ctx.beginPath(); ctx.ellipse(x + dx, y + dy, r * .1, r * .17, a, 0, TAU); ctx.fill(); }
    ctx.restore(); return;
  }
  // A bright reflection and a lifting water filament distinguish this from the dry, angular stone.
  ctx.strokeStyle = "#79dae8aa"; ctx.lineWidth = Math.max(.8, s * .018); ctx.beginPath(); ctx.ellipse(x, y, r * 1.05, r * .38, 0, 0, TAU); ctx.stroke();
  if (f.state === "lift") {
    ctx.strokeStyle = "#79d8ec66"; ctx.lineWidth = Math.max(1, r * .18 * (1 - raised / (CRYSTAL.debrisRise * 1.3)));
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x - r * .5, y - s * .2, x + r * .4, ry + r * .9, x, ry + r * .45); ctx.stroke();
  }
  const speed = Math.hypot(f.vx || 0, f.vy || 0), dx = speed ? f.vx / speed : 0, dy = speed ? f.vy / speed : 0;
  if (f.state === "thrown") {
    for (let i = 3; i >= 1; i--) { ctx.fillStyle = `rgba(111,219,244,${.32 / i})`; ctx.beginPath(); ctx.ellipse(x - dx * r * i * .65, ry - dy * r * i * .65, r * (.7 - i * .12), r * (.45 - i * .07), Math.atan2(dy, dx), 0, TAU); ctx.fill(); }
  }
  glow(ctx, x, ry, r * 1.8, "#96dfff", .25);
  ctx.save(); ctx.translate(x, ry); if (f.state === "thrown") ctx.rotate(Math.atan2(dy, dx));
  const wide = f.state === "thrown" ? 1.2 : 1, high = f.state === "thrown" ? .65 : .85;
  const water = ctx.createRadialGradient(-r * .3, -r * .35, r * .05, 0, 0, r * 1.25);
  water.addColorStop(0, "#e7fcffed"); water.addColorStop(.3, "#85def5de"); water.addColorStop(.75, "#309fcbd9"); water.addColorStop(1, "#22658da8");
  ctx.beginPath(); ctx.ellipse(0, 0, r * wide, r * high, 0, 0, TAU); ctx.fillStyle = water; ctx.fill(); ctx.strokeStyle = "#b3f3ffcc"; ctx.lineWidth = Math.max(.8, s * .02); ctx.stroke();
  ctx.strokeStyle = "#e5fcffcc"; ctx.lineWidth = Math.max(.8, s * .018); ctx.beginPath(); ctx.ellipse(-r * .18, -r * .13, r * .58, r * .38, -.3, 3.2 + Math.sin(time * 1.8) * .2, 5.7); ctx.stroke();
  ctx.restore(); ctx.restore();
}

export function drawPackEffects(ctx, effects, s, now, visible = () => true, lift = () => 0, presentation = {}) {
  // Release 237: the glow and dark rims of every settled lava pool first, so pools that touch read as one spill.
  for (const f of effects || []) {
    if (f.kind !== "lava" || f.arming > 0 || !visible(f)) continue;
    const x = (f.x + .5) * s, y = (f.y + .62 - (Number(lift(f)) || 0)) * s, r = (f.radius || 1) * s, life = Math.max(0, f.life ?? 0), cool = lavaCool(f, life);
    ctx.save(); ctx.globalAlpha = Math.min(1, life * 2.5); glow(ctx, x, y, r * 1.7, "#ff5a1a", .35 * (1 - cool)); lavaShape(ctx, f, x, y, r, 1.08); ctx.fillStyle = cool > .6 ? "#2a1a14" : "#5a1408"; ctx.fill(); ctx.restore();
  }
  // Release 427: every damage-carrying effect's real hit footprint, in DANGER pink on the floor beneath it.
  for (const f of effects || []) {
    const R = visible(f) && effectFootprint(f); if (!R) continue;
    const x = (f.x + .5) * s, y = (f.y + .62 - (Number(lift(f)) || 0)) * s, armed = !(f.arming > 0);
    ctx.save(); ctx.fillStyle = armed ? DANGER.fill : "rgba(255,80,190,.1)"; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 1.5; if (!armed) ctx.setLineDash([s * .12, s * .1]);
    ctx.beginPath(); ctx.ellipse(x, y, R * s, R * s * .6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  for (const f of effects || []) {
    if (!visible(f)) continue;
    if (VOID_EFFECTS.has(f.kind)) { drawVoidEffect(ctx, f, s, now, lift, presentation); continue; }
    if (GIANT_EFFECT_KINDS.has(f.kind)) { drawGiantEffect(ctx, f, s, now, presentation); continue; }
    if (f.kind === "debris" && f.medium === "water") { drawCrystalWater(ctx, f, s, now, lift, presentation); continue; }
    const x = (f.x + .5) * s, y = (f.y + .62 - (ON_GROUND.has(f.kind) ? Number(lift(f)) || 0 : 0)) * s, r = (f.radius || 1) * s, pulse = .6 + Math.sin(now / 80) * .25;
    ctx.save();
    if (f.kind === "gateBreath") {
      // Gate-only flame silhouette within the unchanged wall-clipped damage lane.
      // Deterministic, bounded tongues/embers; accessibility modes freeze all flicker.
      const quiet = !!(presentation?.reduceMotion || presentation?.safeMode || f.reduceMotion);
      const clock = quiet ? 0 : now / 1000, length = Math.max(0, f.length * s);
      ctx.translate(x, y); ctx.rotate(Math.atan2(f.dy, f.dx));
      for (const [scale, color, phase] of [[1, "#e94d19dc", 0], [.74, "#ff9829ee", 1.7], [.38, "#ffe6a1", 3.2]]) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, 0);
        for (const side of [-1, 1]) {
          for (let j = 0; j <= 24; j++) {
            const u = side < 0 ? j / 24 : 1 - j / 24;
            const envelope = Math.sin(Math.PI * u) ** .5 * (.42 + .58 * u);
            const tongue = .72 + .18 * Math.sin(u * 39 - clock * 8 + phase + side) + .1 * Math.sin(u * 73 - clock * 5 + phase);
            ctx.lineTo(u * length, side * r * scale * envelope * tongue);
          }
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = "#ffc15baa";
      for (let i = 0; i < 6; i++) {
        const u = .18 + ((i * .137 + clock * .18) % .76), side = i % 2 ? 1 : -1;
        const size = Math.min(s * .035, length * .015), yy = side * r * (.55 + .12 * Math.sin(i * 2.1));
        // Embers stay inside the collision lane, never imply damage past a clipped wall.
        ctx.fillRect(Math.max(0, Math.min(length - size, u * length)), yy - size / 2, Math.min(size, length), size);
      }
      ctx.restore(); continue;
    }
    if (f.arming > 0) {
      const total = f.armTotal ??= f.arming, progress = 1 - f.arming / total;
      if (f.kind === "web") { drawWeb(ctx, x, y, r, .5 * progress); }
      else if (f.kind === "sigil" || f.kind === "condemn") { drawSigil(ctx, x, y, r, f.kind === "condemn" ? "#9dff8a" : "#7fe7ff", now, progress); }
      else if (f.kind === "ooze") { const fx = ((f.from?.x ?? f.x) + .5) * s, fy = ((f.from?.y ?? f.y) + .3) * s, bx = fx + (x - fx) * progress, by = fy + (y - fy) * progress - Math.sin(progress * Math.PI) * s * 1.1; ctx.fillStyle = "#5fbf6e"; ctx.beginPath(); ctx.ellipse(bx, by, s * .16, s * .13, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#f4ffe8aa"; ctx.beginPath(); ctx.arc(bx - s * .05, by - s * .04, s * .04, 0, TAU); ctx.fill(); ctx.strokeStyle = "#c8ff6a55"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.stroke(); }
      else if (f.kind === "swordfall") { drawWarningCircle(ctx, x, y, r, "#ff2a2a", pulse, progress); const drop = (1 - progress) * s * 6, sy = y - s * .3 - drop; ctx.globalAlpha = Math.min(1, progress * 2); ctx.fillStyle = "#0a0a0e"; ctx.beginPath(); ctx.moveTo(x, sy + s * .45); ctx.lineTo(x - s * .05, sy + s * .3); ctx.lineTo(x - s * .04, sy - s * .5); ctx.lineTo(x + s * .04, sy - s * .5); ctx.lineTo(x + s * .05, sy + s * .3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#ff2a2a"; ctx.lineWidth = 1; ctx.stroke(); } // release 245: a sword falling onto its mark
      else if (f.kind === "orbital") { drawWarningCircle(ctx, x, y, r, "#ff2a2a", pulse, progress); ctx.fillStyle = `rgba(255,42,42,${.15 * progress})`; ctx.fillRect(x - r * .2, y - s * 12, r * .4, s * 12); }
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
      else if (f.kind === "flameTrail") { ctx.globalAlpha = Math.min(1, life * 1.5); ctx.fillStyle = "#2a1408aa"; ctx.beginPath(); ctx.ellipse(x, y, r, r * .45, 0, 0, TAU); ctx.fill(); glow(ctx, x, y - s * .2, r * 1.7, "#ff6a1a", .65); for (let i = 0; i < 5; i++) { const ph = (now / 260 + i * .37 + f.x) % 1, fx = x + Math.sin(i * 2.4 + f.y) * r * .6, fh = s * (.6 + .35 * Math.sin(i + now / 180)) * (1 - ph * .4); ctx.fillStyle = i % 2 ? "#ffb02aee" : "#ff5a1add"; ctx.beginPath(); ctx.moveTo(fx - s * .1, y); ctx.quadraticCurveTo(fx - s * .05, y - fh * .6, fx + Math.sin(now / 120 + i) * s * .05, y - fh); ctx.quadraticCurveTo(fx + s * .05, y - fh * .6, fx + s * .1, y); ctx.fill(); } } // release 241: the Turtle's fire
      else if (f.kind === "frostTrail") { const k2 = Math.min(1, life * 2), warn = f.burst && life < .8 ? .5 + .5 * Math.sin(now / 50) : 0; ctx.globalAlpha = k2; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "#e8f8ffee"); g.addColorStop(.7, "#8fd8ffaa"); g.addColorStop(1, "#4a90c044"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * .55, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = warn ? `rgba(255,255,255,${warn})` : "#ffffff88"; ctx.lineWidth = warn ? 2 : 1; ctx.stroke(); ctx.fillStyle = "#ffffffcc"; for (let i = 0; i < 5; i++) { const a = i * 1.3 + f.x * 3, rr = r * (.2 + (i % 3) * .25); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .55 - s * .14); ctx.lineTo(x + Math.cos(a) * rr - s * .04, y + Math.sin(a) * rr * .55); ctx.lineTo(x + Math.cos(a) * rr + s * .04, y + Math.sin(a) * rr * .55); ctx.fill(); } } // ice: crystals standing up; it flickers white before it bursts
      else if (f.kind === "twister") { ctx.globalAlpha = Math.min(1, life); const h = s * 1.7, spin2 = now / 90 + f.x; for (let i = 0; i < 6; i++) { const yy = y - h * i / 6, rr = r * (.35 + i * .13); ctx.strokeStyle = `rgba(220,244,255,${.75 - i * .07})`; ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); ctx.ellipse(x + Math.sin(spin2 * .3 + i * .6) * s * .08, yy, rr, rr * .3, 0, spin2 + i, spin2 + i + Math.PI * 1.4); ctx.stroke(); } ctx.fillStyle = "#c8ecff88"; ctx.beginPath(); ctx.ellipse(x, y, r * .5, r * .2, 0, 0, TAU); ctx.fill(); } // a small ice twister
      else if (f.kind === "comet") { if (f.to) { const lx = (f.to.x + .5) * s, ly = (f.to.y + .62) * s, rr = TURTLE.cometBlast * s; ctx.save(); ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(lx, ly, rr, rr * .6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); } /* release 397: where the comet will land */  const m = Math.hypot(f.vx, f.vy) || 1, cy2 = y - s * .55; for (let i = 5; i >= 1; i--) { ctx.fillStyle = `rgba(190,232,255,${.5 / i})`; ctx.beginPath(); ctx.arc(x - f.vx / m * r * i * .9, cy2 - f.vy / m * r * i * .9, r * (1 - i * .12), 0, TAU); ctx.fill(); } glow(ctx, x, cy2, r * 2.4, "#8fd8ff", .8); const g = ctx.createRadialGradient(x - r * .3, cy2 - r * .3, r * .1, x, cy2, r); g.addColorStop(0, "#ffffff"); g.addColorStop(.6, "#bfe8ff"); g.addColorStop(1, "#5aa8d8"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy2, r, 0, TAU); ctx.fill(); ctx.fillStyle = "#00000022"; ctx.beginPath(); ctx.ellipse(x, y, r * .9, r * .35, 0, 0, TAU); ctx.fill(); } // the ice comet and its shadow
      else if (f.kind === "iceBurst") { const k2 = 1 - Math.max(0, life) / (f.total || .5); ctx.globalAlpha = 1 - k2; ctx.strokeStyle = "#e8f8ff"; ctx.lineWidth = Math.max(1.5, s * .05); for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + f.x, r0 = r * k2 * .3, r1 = r * (.4 + k2 * .7); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * .6); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * .6 - s * .1); ctx.stroke(); } glow(ctx, x, y, r * (1 - k2 * .5), "#bfe8ff", .6 * (1 - k2)); } // shards flung out
      else if (f.kind === "debris") { const lift = (f.lift ?? .7) * s, ry = y - lift - s * .2; ctx.fillStyle = "rgba(4,4,8,.3)"; ctx.beginPath(); ctx.ellipse(x, y, r * .9, r * .35, 0, 0, TAU); ctx.fill(); glow(ctx, x, ry, r * 2, "#b08aff", .35); const sh2 = f.shape || 0, rr = r * 1.3; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + sh2 + now / 400, k2 = rr * (.75 + ((i * 7 + sh2 * 3) % 5) / 10); i ? ctx.lineTo(x + Math.cos(a) * k2, ry + Math.sin(a) * k2 * .8) : ctx.moveTo(x + Math.cos(a) * k2, ry + Math.sin(a) * k2 * .8); } ctx.closePath(); ctx.fillStyle = "#6e665a"; ctx.fill(); ctx.strokeStyle = "#2a2622"; ctx.lineWidth = 1; ctx.stroke(); } // release 249: a lifted stone
      else if (f.kind === "psyWall") { // the mirror wall: a standing pane of light, edge-lit, with motes rising through it
        const k2 = Math.min(1, life * 2), half = 1.7 * s, px = -f.ny, py = f.nx * .6, hgt = s * 1.3, flick = .75 + .25 * Math.sin(now / 70), ax = x - px * half, ay = y - py * half, bx2 = x + px * half, by2 = y + py * half;
        ctx.globalAlpha = k2; ctx.fillStyle = `rgba(190,210,255,${.22 * flick})`; ctx.beginPath(); const lean = s * .45; ctx.moveTo(ax, ay); ctx.lineTo(bx2, by2); ctx.lineTo(bx2 + lean, by2 - hgt); ctx.lineTo(ax + lean, ay - hgt); ctx.closePath(); ctx.fill(); // leaning back a little, so a wall seen end-on still reads
        ctx.strokeStyle = `rgba(235,245,255,${.85 * flick})`; ctx.lineWidth = Math.max(1.5, s * .05); ctx.stroke();
        ctx.strokeStyle = `rgba(235,245,255,${.3 * flick})`; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { const f2 = i / 6, lx = ax + (bx2 - ax) * f2, ly = ay + (by2 - ay) * f2; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + lean, ly - hgt); ctx.stroke(); }
        ctx.fillStyle = "rgba(255,255,255,.75)"; for (let i = 0; i < 8; i++) { const f2 = ((i * 37) % 8) / 8 + .06, ph = ((now / 900) + i * .13) % 1, lx = ax + (bx2 - ax) * f2, ly = ay + (by2 - ay) * f2 - ph * hgt; ctx.fillRect(ph * lean + lx - 1.5, ly - 1.5, 3, 3); }
      }
      else if (f.kind === "psyRing") { const k2 = 1 - Math.max(0, life) / (f.total || .4), rr = r * (.3 + k2 * .8); ctx.globalAlpha = 1 - k2; ctx.strokeStyle = "rgba(255,90,90,.85)"; ctx.lineWidth = Math.max(2, s * .12 * (1 - k2)); ctx.beginPath(); ctx.ellipse(x, y - s * .3, rr, rr * .6, 0, 0, TAU); ctx.stroke(); } // a ring of force
      else if (f.kind === "swordArc") { const k2 = 1 - Math.max(0, life) / (f.total || .28), half = (f.arc || 120) * Math.PI / 360, cy2 = y - s * (f.lift ?? .2); ctx.globalAlpha = 1 - k2 * .8; ctx.lineCap = "round"; for (const [w2, c] of [[.32, "rgba(255,40,40,.35)"], [.16, "rgba(255,80,70,.85)"], [.05, "#ffe0d8"]]) { ctx.strokeStyle = c; ctx.lineWidth = Math.max(1.5, s * w2 * (1 - k2 * .5)); ctx.beginPath(); ctx.ellipse(x, cy2, r * (.85 + k2 * .15), r * (.6 + k2 * .1), 0, f.angle - half, f.angle + half); ctx.stroke(); } } // release 247: an arc of energy thrown off the sword
      else if (f.kind === "swordBeam") { const k2 = 1 - Math.max(0, life) / (f.total || .3), sy2 = y - s * (f.lift ?? .22), tx = (f.to.x + .5) * s, ty = (f.to.y + .62) * s - s * (f.lift ?? .22); ctx.globalAlpha = 1 - k2 * .7; ctx.lineCap = "round"; for (const [w2, c] of [[.3, "rgba(255,40,40,.35)"], [.14, "rgba(255,80,70,.9)"], [.05, "#ffe0d8"]]) { ctx.strokeStyle = c; ctx.lineWidth = Math.max(1.5, s * w2 * (1 - k2 * .4)); ctx.beginPath(); ctx.moveTo(x, sy2); ctx.lineTo(tx, ty); ctx.stroke(); } glow(ctx, tx, ty, s * .35, "#ff2a2a", .7 * (1 - k2)); } // a beam of energy off the tip of a thrust
      else if (f.kind === "swordfall") { const k2 = 1 - Math.max(0, life) / 1.4; ctx.globalAlpha = 1 - k2 * k2; ctx.fillStyle = "#0a0a0e"; ctx.beginPath(); ctx.moveTo(x - s * .05, y - s * .1); ctx.lineTo(x, y + s * .05); ctx.lineTo(x + s * .05, y - s * .1); ctx.lineTo(x + s * .04, y - s * .9); ctx.lineTo(x - s * .04, y - s * .9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#ff2a2a"; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = "#30303a"; ctx.fillRect(x - s * .14, y - s * .9, s * .28, s * .05); ctx.strokeStyle = "rgba(255,60,50,.5)"; ctx.beginPath(); ctx.ellipse(x, y, r * .7, r * .35, 0, 0, TAU); ctx.stroke(); } // release 245: a fallen sword, standing in the ground
      else if (f.kind === "orbital") { const k2 = Math.min(1, life * 2); ctx.globalAlpha = k2; ctx.fillStyle = "rgba(255,42,42,.28)"; ctx.fillRect(x - r * .45, y - s * 12, r * .9, s * 12); ctx.fillStyle = "rgba(255,200,190,.85)"; ctx.fillRect(x - r * .14, y - s * 12, r * .28, s * 12); glow(ctx, x, y, r * 1.6, "#ff2a2a", .8); ctx.strokeStyle = "#ffd0c8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r, r * .55, 0, 0, TAU); ctx.stroke(); } // the lance from the sky
      else if (f.kind === "scorch") { ctx.globalAlpha = .75 * Math.max(0, Math.min(1, life / (f.total || 1.5))); ctx.fillStyle = "#241920"; ctx.beginPath(); ctx.ellipse(x, y, r, r * .55, 0, 0, TAU); ctx.fill(); } // a cool, harmless mark, fading away rather than a lingering fire hazard
      else if (f.kind === "nanoOrb") { const oy = y - s * .4; glow(ctx, x, oy, r * 2.4, "#ff2a2a", .55); ctx.fillStyle = "#0a0a0e"; ctx.beginPath(); ctx.arc(x, oy, r, 0, TAU); ctx.fill(); ctx.strokeStyle = "#ff3a32"; ctx.lineWidth = Math.max(1.5, s * .04); ctx.beginPath(); ctx.arc(x, oy, r * .75, now / 150, now / 150 + 4); ctx.stroke(); } // a seeker orb
      else if (f.kind === "missile") { const m = Math.hypot(f.vx, f.vy) || 1, ux = f.vx / m, uy = f.vy / m, oy = y - s * .4; for (let i = 1; i <= 4; i++) { ctx.fillStyle = `rgba(255,${80 + i * 30},60,${.6 / i})`; ctx.beginPath(); ctx.arc(x - ux * s * .16 * i, oy - uy * s * .16 * i, s * (.11 - i * .015), 0, TAU); ctx.fill(); } ctx.fillStyle = "#14141a"; ctx.beginPath(); ctx.moveTo(x + ux * s * .28, oy + uy * s * .28); ctx.lineTo(x - uy * s * .08, oy + ux * s * .08); ctx.lineTo(x - ux * s * .18, oy - uy * s * .18); ctx.lineTo(x + uy * s * .08, oy - ux * s * .08); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#ff2a2a"; ctx.fillRect(x - s * .02, oy - s * .02, s * .04, s * .04); } // a missile and its exhaust
      else if (f.kind === "nanoBurst") { const k2 = 1 - Math.max(0, life) / (f.total || .4); ctx.globalAlpha = 1 - k2; glow(ctx, x, y - s * .2, r * (.6 + k2), "#ff3a2a", .8); ctx.fillStyle = "#14141a"; for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + f.x, rr = r * (.2 + k2); ctx.fillRect(x + Math.cos(a) * rr, y - s * .2 + Math.sin(a) * rr * .6, Math.max(2, s * .05), Math.max(2, s * .05)); } } // a missile bursting into motes
      else if (f.kind === "furrow") { // release 239: churned earth in the fleeing worm's wake, settling as it fades
        const k2 = Math.max(0, Math.min(1, life / (f.total || 1.6))), d = f.dir || { x: 1, y: 0 }, a = Math.atan2(d.y * .6, d.x), seed = f.x * 5.1 + f.y * 2.3;
        ctx.globalAlpha = k2; ctx.translate(x, y); ctx.rotate(a);
        ctx.fillStyle = "#24170cee"; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r * .5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#4a3420"; ctx.beginPath(); ctx.ellipse(0, r * .05, r * .95, r * .32, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#c09a68"; ctx.beginPath(); ctx.ellipse(0, -r * .1, r * .85, r * .3 * (.3 + k2 * .7), 0, Math.PI, TAU); ctx.fill(); // the ridge, sinking
        for (let i = 0; i < 6; i++) { const ox = Math.sin(seed + i * 2.1) * r * .9, oy = (i % 2 ? 1 : -1) * r * (.3 + .1 * Math.sin(seed * 3 + i)); ctx.fillStyle = i % 3 ? "#6a5238" : "#a08060"; ctx.beginPath(); ctx.ellipse(ox, oy, s * .06, s * .045, i, 0, TAU); ctx.fill(); } // clods
      }
      else if (f.kind === "gas") { ctx.globalAlpha = Math.min(.85, life * .6); for (let i = 0; i < 4; i++) { const a = i * 1.7 + now / 900, gx = x + Math.cos(a) * r * .35, gy = y - s * .2 + Math.sin(a) * r * .2, g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * .9); g.addColorStop(0, "#d8ef6a66"); g.addColorStop(.6, "#9ac04a33"); g.addColorStop(1, "#6a903a00"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(gx, gy, r * .9, r * .65, 0, 0, TAU); ctx.fill(); } }
      else if (f.kind === "flesh") { ctx.globalAlpha = Math.min(.9, life); ctx.fillStyle = "#7a1f2a99"; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.fill(); for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + now / 900, rr = r * (.4 + ((i * 37) % 10) / 20); ctx.fillStyle = i % 2 ? "#c98a86" : "#3a0d12"; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .6, s * .09, s * .05 * (1 + Math.sin(now / 200 + i) * .3), a, 0, TAU); ctx.fill(); } }
      else if (f.kind === "orb" && f.icicle) { const vx = f.vx || 0, vy = f.vy || 0, m = Math.hypot(vx, vy) || 1, ux = vx / m, uy = vy / m, oy = y - s * .35, L = s * .55, Wd = s * .09; ctx.fillStyle = "#c8ecff55"; ctx.beginPath(); ctx.moveTo(x - ux * L * 1.6, oy - uy * L * 1.6); ctx.lineTo(x - uy * Wd, oy + ux * Wd); ctx.lineTo(x + uy * Wd, oy - ux * Wd); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#e6f7ff"; ctx.beginPath(); ctx.moveTo(x + ux * L * .5, oy + uy * L * .5); ctx.lineTo(x - uy * Wd, oy + ux * Wd); ctx.lineTo(x - ux * L * .5, oy - uy * L * .5); ctx.lineTo(x + uy * Wd, oy - ux * Wd); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#6aa6c4"; ctx.lineWidth = 1; ctx.stroke(); } // release 243: a flung icicle and its frost streak
      else if (f.kind === "orb" && f.fire) { const vx = f.vx || 0, vy = f.vy || 0, m = Math.hypot(vx, vy) || 1, oy = y - s * .3; for (let i = 3; i >= 1; i--) { ctx.fillStyle = `rgba(255,${90 + i * 30},40,${.5 / i})`; ctx.beginPath(); ctx.arc(x - vx / m * r * i * .9, oy - vy / m * r * i * .9, r * (1 - i * .15), 0, TAU); ctx.fill(); } glow(ctx, x, oy, r * 2, "#ff7a2a", .75); ctx.fillStyle = "#ffe6a0"; ctx.beginPath(); ctx.arc(x, oy, r * .5, 0, TAU); ctx.fill(); } // release 237: a worm tentacle's fireball
      else if (f.kind === "orb") { const vx = f.vx || 0, vy = f.vy || 0, m = Math.hypot(vx, vy) || 1, oy = y - s * .3; ctx.strokeStyle = "#ff4a3a66"; ctx.lineWidth = r * 1.1; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - vx / m * r * 2.2, oy - vy / m * r * 2.2); ctx.lineTo(x, oy); ctx.stroke(); glow(ctx, x, oy, r * 2.2, "#ff4a3a", .7); ctx.fillStyle = "#ffd9b8"; ctx.beginPath(); ctx.arc(x, oy, r * .55, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x - r * .12, oy - r * .12, r * .22, 0, TAU); ctx.fill(); }
      else if (f.kind === "shock" && f.energy) { const rr = (f.ring ?? 0) * s; ctx.strokeStyle = "#ff4a3a55"; ctx.lineWidth = Math.max(6, s * .5); ctx.beginPath(); ctx.ellipse(x, y - s * .1, rr, rr * .6, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = "#ffb08aee"; ctx.lineWidth = Math.max(2, s * .16); ctx.stroke(); ctx.strokeStyle = "#fff4e8"; ctx.lineWidth = Math.max(1, s * .05); ctx.stroke(); }
      else if (f.kind === "shock" && f.stone) { const rr = (f.ring ?? 0) * s; ctx.strokeStyle = "#8a7a6488"; ctx.lineWidth = Math.max(6, s * .45); ctx.beginPath(); ctx.ellipse(x, y - s * .1, rr, rr * .6, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = "#d8c8a8ee"; ctx.lineWidth = Math.max(2, s * .12); ctx.stroke(); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.fillStyle = "#6a5a44"; ctx.fillRect(x + Math.cos(a) * rr, y - s * .1 + Math.sin(a) * rr * .6 - s * .15, Math.max(2, s * .08), Math.max(2, s * .08)); } } // release 241: the stomp's ring of heaved ground
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
