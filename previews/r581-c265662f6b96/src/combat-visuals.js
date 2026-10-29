import { dungeonPointDiscovered } from "./dungeon-framework.js?v=r581-c265662f6b96";
import { SHADOW_CLONE } from "./late-spells.js?v=r581-c265662f6b96";
import { drawBrawler, drawBrawlerAuras } from "./brawler-spells.js?v=r581-c265662f6b96";
import { drawOrbit } from "./orbit-volley.js?v=r581-c265662f6b96";
import { drawToolForms } from "./tool-forms.js?v=r581-c265662f6b96";
export function drawRangedEffects(ctx,game,width,height) {
  const s = Math.round(Math.max(28, Math.min(44, width / 12))),
    toScreen = (q) => [
      width / 2 + (q.x - game.player.x) * s,
      height / 2 + (q.y - game.player.y) * s,
    ];
  // Release 169: projectiles are drawn in batches, one halo path and one body path per colour, rather than two fills and
  // two alpha changes per projectile. An awakened Lumen Spindle with Echo keeps thirty or more in the air, and on
  // Firefox each separate fill is costly.
  const groups = new Map();
  for (const p of game.projectiles) {
    if(!dungeonPointDiscovered(game.map,p))continue;
    if(p.knife||p.arcWave||p.fireBomb)continue; // release 533: drawn by drawToolForms; 547: Fire Burst shells
    const color = p.hostile ? (p.morphOrb?"#ff7be6":p.morphBarb?"#9a62b0":p.path==="grenade"?"#e36b4f":p.path==="arc"?"#f0c66e":p.homingTurnRate?"#b7ce83":p.splitAfter!=null?"#ef9b70":"#d28af0") : p.droneRocket ? "#ff8a3d" : p.damageType === "magic" ? "#9fe8db" : "#d6b276"; // release 321: the drone's rockets burn orange
    let list = groups.get(color); if (!list) groups.set(color, list = []); list.push(p);
  }
  for (const [color, list] of groups) {
    ctx.fillStyle = color;
    // A translucent halo instead of shadowBlur (release 159), which Firefox renders as a separate blur per projectile.
    ctx.globalAlpha = .28; ctx.beginPath();
    for (const p of list) { const [x, y] = toScreen(p), r = (p.damageType === "magic" ? 10 : 8) * (p.scale || 1); /* release 515: Charged Air */ ctx.moveTo(x + r, y); ctx.ellipse(x, y, r, r, 0, 0, 7); }
    ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath();
    for (const p of list) {
      const [x, y] = toScreen(p);
      if (p.path === "boomerang") {
        const a = Math.atan2(p.dy, p.dx);
        ctx.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
        ctx.lineTo(x + Math.cos(a + 2.35) * 7, y + Math.sin(a + 2.35) * 7);
        ctx.lineTo(x + Math.cos(a - 2.35) * 7, y + Math.sin(a - 2.35) * 7);
        ctx.closePath();
      } else if(p.path==="grenade"){const gr=p.bomblet?4:7;/* release 537: Cluster Shell bomblets */ctx.moveTo(x+gr,y);ctx.arc(x,y,gr,0,7);ctx.moveTo(x,y-gr);ctx.lineTo(x+gr*.57,y-gr*1.57)}else if(p.path==="arc"){const a=Math.atan2(p.dy,p.dx);ctx.moveTo(x+Math.cos(a)*8,y+Math.sin(a)*8);ctx.ellipse(x,y,8,3,a,0,7)}else{const r=(p.damageType === "magic" ? 5 : 3)*(p.scale||1);ctx.moveTo(x+r,y);ctx.arc(x, y, r, 0, 7)}
    }
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  for (const fx of game.effects) {
    if (fx.brawler || fx.kind === "golem-punch") continue; // release 483: drawn by drawBrawler; 535: the golem by drawToolForms
    const [x, y] = toScreen(fx);
    ctx.strokeStyle = fx.hostile ? "#e35248cc" : "#b75235aa";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, fx.radius * s, 0, 7);
    ctx.stroke();
    ctx.strokeStyle = "#d99a5255";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, fx.radius * s * (0.72 + 0.08 * Math.sin(fx.life * 12)), 0, 7);
    ctx.stroke();
  }
  // Release 365: Gravity Well (a turning spiral) and Stillpoint (still clock rings) over their circles; the Shadow Clone.
  {const t = performance.now() / 1000;
  drawBrawler(ctx, game, toScreen, s, t); // release 483: Hammerfall, Great Sweep, Iron Fist
  drawBrawlerAuras(ctx, game, toScreen, s, t); // release 485: Aegis, Shadow Boxing
  drawOrbit(ctx, game, toScreen, s, t); // release 487: Orbit Volley
  drawToolForms(ctx, game, toScreen, s, t); // release 533: Nanoknives and the Arc Wave
  for (const fx of game.effects) {
    if (fx.kind !== "gravity-well" && fx.kind !== "stillpoint") continue;
    const [x, y] = toScreen(fx), R = fx.radius * s;
    if (fx.kind === "gravity-well") { ctx.strokeStyle = "#c06faecc"; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let a = 0; a < 5.5; a += .25) { const r = R * (1 - a / 6), q = a + t * 3 + k * 2.1; a ? ctx.lineTo(x + Math.cos(q) * r, y + Math.sin(q) * r) : ctx.moveTo(x + Math.cos(q) * r, y + Math.sin(q) * r); } ctx.stroke(); } ctx.fillStyle = "#1a0d2acc"; ctx.beginPath(); ctx.arc(x, y, s * .3, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = "#7c9fcf22"; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); ctx.strokeStyle = "#cfe3ffaa"; ctx.lineWidth = 1.5; for (const k of [.4, .7]) { ctx.beginPath(); ctx.arc(x, y, R * k, 0, 7); ctx.stroke(); } ctx.beginPath(); for (let h = 0; h < 12; h++) { const a = h * Math.PI / 6; ctx.moveTo(x + Math.cos(a) * R * .88, y + Math.sin(a) * R * .88); ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); } ctx.stroke(); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - R * .55); ctx.stroke(); }
  }
  for (const e of game.enemies) { const f = !e.dead && e.mirror?.frozen; if (!f?.length) continue; // release 369: shots held around the Listener
    f.forEach((q, i) => { const [x, y] = toScreen(q), r = 5 + Math.sin(t * 9 + i) * 1.5; ctx.fillStyle = "#c9a6ff55"; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.fill(); ctx.fillStyle = "#f3eaff"; ctx.beginPath(); ctx.arc(x, y, r * .6, 0, 7); ctx.fill(); });
    const [lx, ly] = toScreen({ x: e.x + .5, y: e.y + .45 }); ctx.strokeStyle = "#c9a6ff88"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(lx, ly, 2.2 * s, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  const sc = game.shadowCloneActive?.() && game.shadowClone;
  if (sc) {
    const [x, y] = toScreen({ x: game.player.x + sc.ox + .5, y: game.player.y + sc.oy + .45 }), left = Math.max(0, (sc.until - (game.lastUpdateNow || 0)) / 1000), a = Math.min(1, left / 1.5) * (.62 + .08 * Math.sin(t * 6));
    ctx.save(); ctx.globalAlpha = a;
    if (sc.charging) { // release 417: while the button is held, only a shadow travels the floor, inside the reach ring
      const [px, py] = toScreen({ x: game.player.x + .5, y: game.player.y + .45 }), R = SHADOW_CLONE.distance * s, pulse = .5 + .5 * Math.sin(t * 10);
      ctx.globalAlpha = .7; ctx.strokeStyle = "#b48cff"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = .35; ctx.strokeStyle = "#7a5fc0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py + s * .36); ctx.lineTo(x, y + s * .36); ctx.stroke();
      ctx.globalAlpha = .78; ctx.fillStyle = "#140a24"; ctx.beginPath(); ctx.ellipse(x, y + s * .3, s * .42, s * .17, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = .5 + .3 * pulse; ctx.strokeStyle = "#b48cff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y + s * .3, s * .48, s * .2, 0, 0, 7); ctx.stroke();
      ctx.restore();
    } else {
    ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(x, y + s * .36, s * .3, s * .1, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#1b1030"; ctx.beginPath(); ctx.moveTo(x - s * .24, y + s * .34); ctx.quadraticCurveTo(x - s * .28, y - s * .1, x - s * .12, y - s * .2); ctx.lineTo(x + s * .12, y - s * .2); ctx.quadraticCurveTo(x + s * .28, y - s * .1, x + s * .24, y + s * .34); ctx.closePath(); ctx.fill(); // cloak
    ctx.beginPath(); ctx.arc(x, y - s * .32, s * .15, 0, 7); ctx.fill(); // hood
    ctx.fillStyle = "#b48cff"; ctx.fillRect(x - s * .07, y - s * .34, s * .04, s * .03); ctx.fillRect(x + s * .03, y - s * .34, s * .04, s * .03); // eyes
    ctx.strokeStyle = "#7a5fc0"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(x, y, s * .45, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    if ((sc.swingUntil || 0) > (game.lastUpdateNow || 0) && sc.swingDir) { const ang = Math.atan2(sc.swingDir.y, sc.swingDir.x); ctx.strokeStyle = "#b48cffcc"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, s * .9, ang - .9, ang + .9); ctx.stroke(); }
    if (game.cloneAim) { ctx.globalAlpha = .5; ctx.strokeStyle = "#b48cff"; ctx.lineWidth = 1; ctx.setLineDash([2, 5]); const [px, py] = toScreen({ x: game.player.x + .5, y: game.player.y + .45 }); ctx.beginPath(); ctx.arc(px, py, 2 * s, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    if ((sc.blockedUntil || 0) > (game.lastUpdateNow || 0)) { ctx.globalAlpha = 1; ctx.font = `bold ${Math.round(s * .36)}px monospace`; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "#091018"; ctx.strokeText("BLOCKED", x, y - s * .7); ctx.fillStyle = "#ff7a7a"; ctx.fillText("BLOCKED", x, y - s * .7); ctx.textAlign = "left"; }
    ctx.restore();}
  }}
  const target = game.lockedTarget?.(); // release 309: brackets on the locked target
  if (target) {
    const [x, y] = toScreen({ x: target.x + .5, y: target.y + .45 }), r = Math.max(.6, (Number(target.bodyRadius) || .4) + .3, (Number(target.scale) || 1) * .45) * s, k = r * .45, t = performance.now() / 1000;
    ctx.strokeStyle = "#ff6a5a"; ctx.lineWidth = 2.5; ctx.globalAlpha = .75 + .25 * Math.sin(t * 5); ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(x + sx * r, y + sy * (r - k)); ctx.lineTo(x + sx * r, y + sy * r); ctx.lineTo(x + sx * (r - k), y + sy * r); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (game.reticle?.life > 0) {
    const [x, y] = toScreen(game.reticle);
    ctx.globalAlpha = Math.min(1, game.reticle.life * 2);
    ctx.strokeStyle = "#d7c58b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 7);
    ctx.moveTo(x - 18, y);
    ctx.lineTo(x - 7, y);
    ctx.moveTo(x + 7, y);
    ctx.lineTo(x + 18, y);
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x, y - 7);
    ctx.moveTo(x, y + 7);
    ctx.lineTo(x, y + 18);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
