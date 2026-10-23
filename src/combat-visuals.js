import { dungeonPointDiscovered } from "./dungeon-framework.js?v=r347-6aae356afb82";
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
    const color = p.hostile ? (p.path==="grenade"?"#e36b4f":p.path==="arc"?"#f0c66e":p.homingTurnRate?"#b7ce83":p.splitAfter!=null?"#ef9b70":"#d28af0") : p.droneRocket ? "#ff8a3d" : p.damageType === "magic" ? "#9fe8db" : "#d6b276"; // release 321: the drone's rockets burn orange
    let list = groups.get(color); if (!list) groups.set(color, list = []); list.push(p);
  }
  for (const [color, list] of groups) {
    ctx.fillStyle = color;
    // A translucent halo instead of shadowBlur (release 159), which Firefox renders as a separate blur per projectile.
    ctx.globalAlpha = .28; ctx.beginPath();
    for (const p of list) { const [x, y] = toScreen(p), r = p.damageType === "magic" ? 10 : 8; ctx.moveTo(x + r, y); ctx.ellipse(x, y, r, r, 0, 0, 7); }
    ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath();
    for (const p of list) {
      const [x, y] = toScreen(p);
      if (p.path === "boomerang") {
        const a = Math.atan2(p.dy, p.dx);
        ctx.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
        ctx.lineTo(x + Math.cos(a + 2.35) * 7, y + Math.sin(a + 2.35) * 7);
        ctx.lineTo(x + Math.cos(a - 2.35) * 7, y + Math.sin(a - 2.35) * 7);
        ctx.closePath();
      } else if(p.path==="grenade"){ctx.moveTo(x+7,y);ctx.arc(x,y,7,0,7);ctx.moveTo(x,y-7);ctx.lineTo(x+4,y-11)}else if(p.path==="arc"){const a=Math.atan2(p.dy,p.dx);ctx.moveTo(x+Math.cos(a)*8,y+Math.sin(a)*8);ctx.ellipse(x,y,8,3,a,0,7)}else{const r=p.damageType === "magic" ? 5 : 3;ctx.moveTo(x+r,y);ctx.arc(x, y, r, 0, 7)}
    }
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  for (const fx of game.effects) {
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
