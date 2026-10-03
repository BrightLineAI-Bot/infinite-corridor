import { dungeonPointDiscovered } from "./dungeon-framework.ts";
export function drawRangedEffects(ctx,game,width,height) {
  const s = Math.max(28, Math.min(44, width / 12)),
    toScreen = (q) => [
      width / 2 + (q.x - game.player.x) * s,
      height / 2 + (q.y - game.player.y) * s,
    ];
  for (const p of game.projectiles) {
    if(!dungeonPointDiscovered(game.map,p))continue;
    const [x, y] = toScreen(p);
    ctx.fillStyle = p.hostile ? (p.path==="grenade"?"#e36b4f":p.path==="arc"?"#f0c66e":p.homingTurnRate?"#b7ce83":p.splitAfter!=null?"#ef9b70":"#d28af0") : p.damageType === "magic" ? "#9fe8db" : "#d6b276";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    if (p.path === "boomerang") {
      const a = Math.atan2(p.dy, p.dx);
      ctx.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
      ctx.lineTo(x + Math.cos(a + 2.35) * 7, y + Math.sin(a + 2.35) * 7);
      ctx.lineTo(x + Math.cos(a - 2.35) * 7, y + Math.sin(a - 2.35) * 7);
      ctx.closePath();
    } else if(p.path==="grenade"){ctx.arc(x,y,7,0,7);ctx.moveTo(x,y-7);ctx.lineTo(x+4,y-11)}else if(p.path==="arc"){const a=Math.atan2(p.dy,p.dx);ctx.ellipse(x,y,8,3,a,0,7)}else ctx.arc(x, y, p.damageType === "magic" ? 5 : 3, 0, 7);
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
