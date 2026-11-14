// The adventure creatures, drawn (adventure-creatures.ts). Original designs. Each body is painted once per kind, pose, stance, facing
// and drawn size into a small canvas (at t = 0) and stamped every frame, lifted by its hop (`hopLift`) over a plain ground shadow, so a
// screen of them costs a few drawImage calls; the cache is bounded (`max`). Without a DOM canvas (tests) a body is painted directly.
// Their effects (pots, smoke, darts, glass) are plain paths, no gradients. Reduced motion holds the bob and the flicker still.
const TAU = Math.PI * 2;
export const ADVENTURE_SPRITE = Object.freeze({
  box: Object.freeze({ galleryLurker: [2.2, 2, 1.5], censerWarden: [2, 2.6, 2.15], vinehookLeaper: [2.3, 2.1, 1.6], thornspitterBloom: [2, 2.1, 1.65], sinkmaw: [2.6, 1.8, 1.25], cinderKite: [2.8, 1.6, 1.05],
    lamplighter: [2.2, 2.9, 2.45], knellkeeper: [2.4, 2.3, 1.85], spindriftMedusa: [2, 2.3, 1.95], prismStilt: [2.2, 2.8, 2.4], rimeSentinel: [2.2, 2.6, 2.15], lakeGlider: [2.6, 1.5, 1.15], hookhanger: [2.2, 2.6, 1.6], slagwright: [2.4, 2.4, 1.95] }), // [width, height, feet] in body units
  max: 64, bob: Object.freeze([1.5, .03]), lift: .55, shadow: .3,
});
const sprites = new Map();
export const adventureSpriteCount = () => sprites.size;
export const clearAdventureSprites = () => sprites.clear();
const canMake = () => typeof document !== "undefined" && typeof document.createElement === "function";
// The pose a sprite is keyed by: idle, a windup or a strike (of which attack), and a stance (clinging, buried, aloft).
export function adventurePose(e, state) {
  const a = e?.pack?.attack || "", stance = e?.advBuried ? "buried" : e?.advCling ? "cling" : e?.aloft ? "air" : "ground";
  return `${state === "windup" ? `w:${a}` : state === "attack" ? `a:${a}` : "idle"}:${e?.advPose || ""}:${stance}`;
}
function stamp(ctx, q, draw) {
  const e = q.e, box = ADVENTURE_SPRITE.box[e.kind], lift = Math.max(0, Number(e.hopLift) || 0) * q.u * ADVENTURE_SPRITE.lift, quiet = !!e.reduceMotion;
  if (!e.advBuried) { ctx.fillStyle = `rgba(0,0,0,${ADVENTURE_SPRITE.shadow / (1 + lift / q.u)})`; ctx.beginPath(); ctx.ellipse(q.k, q.b, q.u * (e.kind === "sinkmaw" ? .55 : e.kind === "cinderKite" ? .4 : .32), q.u * .1, 0, 0, TAU); ctx.fill(); }
  const pose = adventurePose(e, q.state), r = { ...q, pose, b: q.b - lift };
  if (!canMake()) return draw(ctx, r);
  const u = Math.max(4, Math.round(q.u)), key = `${e.kind}:${pose}:${q.flip}:${u}`;
  let sprite = sprites.get(key);
  if (!sprite) {
    sprite = document.createElement("canvas"); sprite.width = Math.ceil(u * box[0]); sprite.height = Math.ceil(u * box[1]);
    const g = sprite.getContext("2d"); if (!g) return draw(ctx, r);
    draw(g, { ...r, u, k: sprite.width / 2, b: u * box[2], t: 0 });
    sprites.set(key, sprite); if (sprites.size > ADVENTURE_SPRITE.max) sprites.delete(sprites.keys().next().value);
  }
  const scale = q.u / u, bob = quiet || e.advBuried ? 0 : Math.sin(q.t * ADVENTURE_SPRITE.bob[0]) * q.u * ADVENTURE_SPRITE.bob[1];
  ctx.drawImage(sprite, q.k - sprite.width * scale / 2, r.b - u * box[2] * scale + bob, sprite.width * scale, sprite.height * scale);
}
const wind = (q) => q.state === "windup" ? 1 : 0, strike = (q) => q.state === "attack" ? 1 : 0;
function eye(ctx, x, y, r, color) { ctx.fillStyle = color + "55"; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, TAU); ctx.fill(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function limb(ctx, pts, w, color) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }

// Gallery Lurker: a hunched grey climber with long clawed arms and amber eyes; clinging, it hangs arms-up from the wall's lip.
function drawGalleryLurker(ctx, q) {
  const { k, b, u, flip, p } = q, cling = q.pose.endsWith(":cling"), lean = wind(q), hit = strike(q), f = flip;
  const hx = k + f * u * (.28 + lean * .12), hy = b - u * (cling ? .95 : .72 - lean * .12);
  ctx.save();
  // hind legs
  limb(ctx, [[k - f * u * .12, b - u * .45], [k - f * u * .3, b - u * .22], [k - f * u * .2, b - u * .02]], Math.max(2, u * .08), p[1]);
  limb(ctx, [[k + f * u * .02, b - u * .45], [k - f * u * .08, b - u * .2], [k + f * u * .05, b - u * .02]], Math.max(2, u * .08), p[1]);
  // the hunched back
  const g = ctx.createLinearGradient(k, b - u * 1.05, k, b - u * .35); g.addColorStop(0, p[3]); g.addColorStop(.35, p[0]); g.addColorStop(1, p[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(k - f * u * .38, b - u * .42); ctx.quadraticCurveTo(k - f * u * .2, b - u * (cling ? 1.15 : 1.0), hx - f * u * .05, hy - u * .1); ctx.lineTo(hx + f * u * .02, hy + u * .16); ctx.quadraticCurveTo(k, b - u * .3, k - f * u * .38, b - u * .42); ctx.fill();
  ctx.fillStyle = p[3] + "aa"; for (let i = 0; i < 3; i++) { const x = k - f * u * (.24 - i * .14), y = b - u * (.86 + (i === 1 ? .08 : 0)) - (cling ? u * .12 : 0); ctx.beginPath(); ctx.moveTo(x - u * .04, y + u * .04); ctx.lineTo(x, y - u * .1); ctx.lineTo(x + u * .04, y + u * .04); ctx.fill(); }
  // the arms: raised to the lip when clinging, spread when striking, reaching forward when leaning
  const reach = cling ? [[hx, hy], [hx + f * u * .1, hy - u * .45], [hx + f * u * .02, hy - u * .78]] : hit ? [[hx - f * u * .05, hy + u * .05], [hx + f * u * .45, hy - u * .12], [hx + f * u * .7, hy + u * .2]] : [[hx - f * u * .05, hy + u * .05], [hx + f * u * (.22 + lean * .2), hy + u * .28], [hx + f * u * (.34 + lean * .3), b - u * .04]];
  for (const off of [-.05, .05]) limb(ctx, reach.map(([x, y]) => [x, y + off * u]), Math.max(2, u * .07), off < 0 ? p[1] : p[0]);
  const [cx, cy] = reach[2]; ctx.fillStyle = p[3]; for (const d of [-.06, 0, .06]) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + f * u * .14, cy + u * d + (cling ? -u * .08 : u * .05)); ctx.lineTo(cx + f * u * .02, cy + u * .03); ctx.fill(); }
  // the head
  ctx.fillStyle = p[0]; ctx.beginPath(); ctx.ellipse(hx, hy, u * .17, u * .13, f * .3, 0, TAU); ctx.fill();
  ctx.fillStyle = p[1]; ctx.beginPath(); ctx.ellipse(hx + f * u * .1, hy + u * .07, u * .1, u * .04, f * .3, 0, TAU); ctx.fill();
  eye(ctx, hx + f * u * .07, hy - u * .03, u * .03, p[2]); eye(ctx, hx + f * u * .13, hy - u * .01, u * .025, p[2]);
  ctx.restore();
}
// Censer Warden: a tall hooded robe, two lamp-eyes in the dark of the hood, a censer swung on a long chain.
function drawCenserWarden(ctx, q) {
  const { k, b, u, flip, p } = q, f = flip, w = wind(q), top = b - u * 1.9;
  ctx.save();
  const g = ctx.createLinearGradient(k, top, k, b); g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(k - u * .14, top + u * .2); ctx.quadraticCurveTo(k, top - u * .06, k + u * .14, top + u * .2); ctx.lineTo(k + u * .34, b - u * .02);
  for (let i = 4; i >= -4; i--) ctx.lineTo(k + i * u * .085, b - u * (i % 2 ? .08 : .01)); ctx.lineTo(k - u * .34, b - u * .02); ctx.closePath(); ctx.fill();
  ctx.fillStyle = p[1]; ctx.beginPath(); ctx.ellipse(k + f * u * .03, top + u * .3, u * .1, u * .12, 0, 0, TAU); ctx.fill();
  eye(ctx, k + f * u * .0, top + u * .29, u * .022, p[2]); eye(ctx, k + f * u * .07, top + u * .29, u * .022, p[2]);
  // sleeves
  limb(ctx, [[k - f * u * .14, top + u * .55], [k - f * u * .22, top + u * .9]], Math.max(2, u * .09), p[0]);
  const hx = k + f * u * .2, hy = top + u * .62, sx = hx + f * u * (.12 + w * .2), sy = hy + u * (.18 - w * .5);
  limb(ctx, [[k + f * u * .12, top + u * .5], [hx, hy], [sx, sy]], Math.max(2, u * .09), p[0]);
  // chain and censer (raised high in the windup)
  const px = sx + f * u * (w ? .25 : .08), py = sy + u * (w ? -.35 : .62);
  ctx.strokeStyle = "#b08a4a"; ctx.lineWidth = Math.max(1, u * .02); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + px) / 2 + f * u * .05, (sy + py) / 2, px, py); ctx.stroke();
  ctx.fillStyle = "#b08a4a"; ctx.beginPath(); ctx.ellipse(px, py + u * .07, u * .1, u * .09, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = p[2]; ctx.fillRect(px - u * .07, py + u * .04, u * .14, u * .03);
  ctx.fillStyle = "#9a948c66"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px - f * u * .05 * i, py - u * (.1 + i * .12), u * (.05 + i * .02), 0, TAU); ctx.fill(); }
  ctx.restore();
}
// Vinehook Leaper: a crouched green climber with long hooked forearms and a curled vine tail.
function drawVinehookLeaper(ctx, q) {
  const { k, b, u, flip, p } = q, f = flip, c = wind(q), air = q.pose.endsWith(":air"), crouch = c ? .14 : air ? -.05 : 0;
  ctx.save();
  limb(ctx, [[k - f * u * .25, b - u * .5], [k - f * u * .55, b - u * .45], [k - f * u * .62, b - u * .75], [k - f * u * .45, b - u * .82]], Math.max(2, u * .05), p[2]); // tail
  limb(ctx, [[k - f * u * .1, b - u * .45 + crouch * u], [k + f * u * .05, b - u * .2], [k - f * u * .05, b - u * .02]], Math.max(2, u * .09), p[1]);
  limb(ctx, [[k + f * u * .05, b - u * .45 + crouch * u], [k + f * u * .2, b - u * .22], [k + f * u * .1, b - u * .02]], Math.max(2, u * .09), p[1]);
  const g = ctx.createLinearGradient(k, b - u * 1.1, k, b - u * .4); g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(k, b - u * (.68 - crouch), u * .26, u * .3, f * .25, 0, TAU); ctx.fill();
  const hx = k + f * u * .2, hy = b - u * (1.05 - crouch);
  ctx.fillStyle = p[1]; ctx.beginPath(); ctx.ellipse(hx, hy, u * .14, u * .12, 0, 0, TAU); ctx.fill();
  eye(ctx, hx + f * u * .07, hy - u * .02, u * .026, p[3]);
  const arm = (dx, lift, col) => { const sx = k + f * u * (.14 + dx), sy = b - u * (.9 - crouch), ex = sx + f * u * (air ? .5 : .35), ey = air ? sy - u * .35 : b - u * (.12 + lift); limb(ctx, [[sx, sy], [(sx + ex) / 2 + f * u * .1, (sy + ey) / 2 - u * .1], [ex, ey]], Math.max(2, u * .07), col); ctx.strokeStyle = p[2]; ctx.lineWidth = Math.max(2, u * .05); ctx.beginPath(); ctx.arc(ex + f * u * .06, ey, u * .07, f > 0 ? Math.PI : 0, f > 0 ? Math.PI * 2.4 : -Math.PI * 1.4, f < 0); ctx.stroke(); };
  arm(-.06, .05, p[1]); arm(.04, 0, p[0]);
  ctx.restore();
}
// Thornspitter Bloom: a root mound, a bent stalk, a bulb with five petals round a toothed mouth (they open wide to fire).
function drawThornspitterBloom(ctx, q) {
  const { k, b, u, flip, p } = q, f = flip, open = wind(q) || strike(q) ? 1 : 0, bx = k + f * u * .08, by = b - u * 1.0;
  ctx.save();
  ctx.fillStyle = p[1]; ctx.beginPath(); ctx.ellipse(k, b - u * .06, u * .36, u * .13, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 4; i++) limb(ctx, [[k + (i - 1.5) * u * .16, b - u * .05], [k + (i - 1.5) * u * .34, b - u * .01]], Math.max(1.5, u * .04), p[1]);
  limb(ctx, [[k, b - u * .12], [k - f * u * .1, b - u * .55], [bx, by + u * .15]], Math.max(3, u * .1), p[0]);
  ctx.fillStyle = p[0]; ctx.beginPath(); ctx.moveTo(k - f * u * .05, b - u * .5); ctx.quadraticCurveTo(k - f * u * .35, b - u * .7, k - f * u * .3, b - u * .4); ctx.fill(); // a leaf
  for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - Math.PI / 2, r = u * (.26 + open * .14), x = bx + Math.cos(a) * r, y = by + Math.sin(a) * r;
    ctx.fillStyle = i % 2 ? p[2] : p[3]; ctx.beginPath(); ctx.ellipse(x, y, u * (.11 + open * .03), u * .07, a, 0, TAU); ctx.fill(); }
  const g = ctx.createRadialGradient(bx - u * .05, by - u * .05, u * .02, bx, by, u * .22); g.addColorStop(0, p[3]); g.addColorStop(.5, p[0]); g.addColorStop(1, p[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, u * .2, 0, TAU); ctx.fill();
  ctx.fillStyle = p[1]; ctx.beginPath(); ctx.ellipse(bx + f * u * .05, by, u * (.07 + open * .04), u * (.05 + open * .04), 0, 0, TAU); ctx.fill();
  ctx.fillStyle = p[3]; for (let i = 0; i < 5; i++) { const a = i * TAU / 5, x = bx + f * u * .05 + Math.cos(a) * u * (.07 + open * .04), y = by + Math.sin(a) * u * (.05 + open * .04); ctx.fillRect(x - 1, y - 1, Math.max(2, u * .025), Math.max(2, u * .025)); }
  if (open) eye(ctx, bx + f * u * .05, by, u * .03, p[2]);
  ctx.restore();
}
// Sinkmaw: buried, a dimple in the sand ringed by ripples; up, a wide ringed mouth with two hooked mandibles.
function drawSinkmawBody(ctx, q) {
  const { k, b, u, flip, p } = q, f = flip, open = wind(q) || strike(q) ? 1 : 0;
  ctx.save();
  ctx.fillStyle = p[1] + "aa"; ctx.beginPath(); ctx.ellipse(k, b - u * .02, u * .62, u * .2, 0, 0, TAU); ctx.fill(); // the sand it broke
  const g = ctx.createLinearGradient(k, b - u * .9, k, b); g.addColorStop(0, p[3]); g.addColorStop(.3, p[0]); g.addColorStop(1, p[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(k - f * u * .12, b - u * .35, u * .55, u * .38, 0, Math.PI, TAU); ctx.lineTo(k + f * u * .5, b - u * .1); ctx.quadraticCurveTo(k, b + u * .02, k - f * u * .6, b - u * .1); ctx.fill();
  ctx.strokeStyle = p[1] + "aa"; ctx.lineWidth = Math.max(1, u * .025); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(k - f * u * (.3 - i * .12), b - u * .3, u * (.4 - i * .05), Math.PI * 1.15, Math.PI * 1.55); ctx.stroke(); }
  const mx = k + f * u * .3, my = b - u * .42, r = u * (.2 + open * .08);
  ctx.fillStyle = p[1]; ctx.beginPath(); ctx.ellipse(mx, my, r * .7, r, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = p[2]; ctx.beginPath(); ctx.ellipse(mx, my, r * .35, r * .55, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = p[3]; for (let i = 0; i < 8; i++) { const a = i * TAU / 8, x = mx + Math.cos(a) * r * .62, y = my + Math.sin(a) * r * .88; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(mx + Math.cos(a) * r * .35, my + Math.sin(a) * r * .5); ctx.lineTo(x + Math.sin(a) * u * .03, y - Math.cos(a) * u * .03); ctx.fill(); }
  for (const s of [-1, 1]) limb(ctx, [[mx, my + s * r * .8], [mx + f * u * (.25 + open * .1), my + s * r * (1.1 + open * .4)], [mx + f * u * (.42 + open * .1), my + s * r * (.5 + open * .3)]], Math.max(2, u * .06), p[1]);
  ctx.restore();
}
function drawSinkmaw(ctx, q) {
  const e = q.e; if (!e.advBuried) return stamp(ctx, q, drawSinkmawBody);
  drawSinkmawDimple(ctx, q.k, q.b, q.u, q.p, e.reduceMotion ? 0 : q.t, .32);
}
// A buried Sinkmaw's only sign: a dimple in the sand and slow ripples round it. `squash` flattens the rings for the standard view's
// slant; Close View paints it onto its floor texture seen from above (squash 1). `t` 0 holds the ripples still (reduced motion).
export function drawSinkmawDimple(ctx, k, b, u, p, t = 0, squash = 1) {
  const ring = (t * .6) % 1;
  ctx.save(); ctx.fillStyle = p[1] + "40"; ctx.beginPath(); ctx.ellipse(k, b - u * .05, u * .3, u * .3 * Math.max(.33, squash), 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = p[0] + "99"; ctx.lineWidth = Math.max(1, u * .02); for (const r of [.35, .55]) { const rr = u * (r + ring * .12); ctx.beginPath(); ctx.ellipse(k, b - u * .05, rr, rr * squash, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
// Cinder Kite: two rust sails on bone ribs, a narrow body, a hooked beak and three trailing tail ribbons.
function drawCinderKite(ctx, q) {
  const { k, b, u, flip, p } = q, f = flip, bank = q.pose.includes(":bank") || wind(q) ? .35 : 0, cy = b - u * .55;
  ctx.save(); ctx.translate(k, cy); ctx.rotate(f * bank * .5); ctx.translate(-k, -cy);
  for (let i = 0; i < 3; i++) limb(ctx, [[k - f * u * .2, cy + u * .02], [k - f * u * .5, cy + u * (.08 + i * .06)], [k - f * u * .78, cy + u * (.02 + i * .1)]], Math.max(1.5, u * .035), i === 1 ? p[2] : p[0]);
  for (const s of [-1, 1]) {
    const tip = { x: k + s * u * .95, y: cy - u * (.28 - bank * s * f * .3) }, back = { x: k + s * u * .55, y: cy + u * .12 };
    ctx.fillStyle = s < 0 ? p[0] : p[0] + "dd"; ctx.beginPath(); ctx.moveTo(k + s * u * .06, cy - u * .06); ctx.quadraticCurveTo(k + s * u * .45, cy - u * .45, tip.x, tip.y); ctx.lineTo(back.x, back.y); ctx.quadraticCurveTo(k + s * u * .25, cy + u * .02, k + s * u * .06, cy + u * .06); ctx.fill();
    limb(ctx, [[k + s * u * .06, cy - u * .04], [k + s * u * .45, cy - u * .36], [tip.x, tip.y]], Math.max(1, u * .025), p[3]);
    limb(ctx, [[k + s * u * .06, cy], [back.x, back.y]], Math.max(1, u * .02), p[3]);
  }
  ctx.fillStyle = p[1]; ctx.beginPath(); ctx.ellipse(k, cy, u * .2, u * .07, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = p[1]; ctx.beginPath(); ctx.arc(k + f * u * .2, cy - u * .02, u * .07, 0, TAU); ctx.fill();
  ctx.fillStyle = p[3]; ctx.beginPath(); ctx.moveTo(k + f * u * .26, cy - u * .04); ctx.lineTo(k + f * u * .36, cy + u * .02); ctx.lineTo(k + f * u * .25, cy + u * .02); ctx.fill();
  eye(ctx, k + f * u * .22, cy - u * .04, u * .018, p[2]);
  limb(ctx, [[k - f * u * .02, cy + u * .06], [k + f * u * .03, cy + u * (.2 + strike(q) * .1)]], Math.max(1, u * .025), p[3]);
  ctx.restore();
}

// ---- the second set
// Lamplighter: a long coat and a tall hat; a lamp hung from a pole twice its height (raised back to throw, thrust forward to stab).
function drawLamplighter(ctx, q) {
  const { k, b, u, flip, p } = q, f = flip, throwing = q.pose.includes(":throw"), stab = q.pose.includes("poleThrust") || q.pose.includes(":thrust"), top = b - u * 1.7;
  ctx.save();
  limb(ctx, [[k - u * .08, b - u * .55], [k - u * .1, b - u * .02]], Math.max(2, u * .08), p[1]); limb(ctx, [[k + u * .08, b - u * .55], [k + u * .1, b - u * .02]], Math.max(2, u * .08), p[1]);
  const g = ctx.createLinearGradient(k, top, k, b); g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(k - u * .16, top + u * .28); ctx.lineTo(k + u * .16, top + u * .28); ctx.lineTo(k + u * .3, b - u * .35); ctx.lineTo(k - u * .3, b - u * .35); ctx.closePath(); ctx.fill();
  ctx.fillStyle = p[1]; ctx.fillRect(k - u * .2, top + u * .02, u * .4, u * .05); ctx.fillRect(k - u * .11, top - u * .2, u * .22, u * .24); // the hat
  ctx.fillStyle = "#2a2c30"; ctx.beginPath(); ctx.ellipse(k + f * u * .02, top + u * .17, u * .09, u * .1, 0, 0, TAU); ctx.fill(); eye(ctx, k + f * u * .05, top + u * .16, u * .02, p[3]);
  const hx = k + f * u * .22, hy = top + u * .62, ang = throwing ? -2.2 : stab ? -.15 : -1.15, len = u * 1.25, ex = hx + f * Math.cos(ang) * len, ey = hy + Math.sin(ang) * len;
  limb(ctx, [[k + f * u * .12, top + u * .4], [hx, hy]], Math.max(2, u * .08), p[0]);
  ctx.strokeStyle = "#3a3026"; ctx.lineWidth = Math.max(2, u * .04); ctx.beginPath(); ctx.moveTo(hx - f * Math.cos(ang) * u * .25, hy - Math.sin(ang) * u * .25); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = "#8a7a5a"; ctx.lineWidth = Math.max(1, u * .015); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex, ey + u * .12); ctx.stroke();
  ctx.fillStyle = p[2] + "55"; ctx.beginPath(); ctx.arc(ex, ey + u * .22, u * .3, 0, TAU); ctx.fill();
  ctx.fillStyle = "#3a3026"; ctx.fillRect(ex - u * .08, ey + u * .1, u * .16, u * .22); ctx.fillStyle = p[2]; ctx.fillRect(ex - u * .055, ey + u * .13, u * .11, u * .15); ctx.fillStyle = p[3]; ctx.fillRect(ex - u * .02, ey + u * .16, u * .04, u * .08);
  ctx.restore();
}
// Knellkeeper: a hunched ringer whose back is a bronze bell, a clapper-hammer in its fists.
function drawKnellkeeper(ctx, q) {
  const { k, b, u, flip, p } = q, f = flip, raise = q.pose.includes(":raise") || wind(q) ? 1 : 0, bx = k - f * u * .1, by = b - u * .78;
  ctx.save();
  limb(ctx, [[k - u * .12, b - u * .4], [k - u * .18, b - u * .02]], Math.max(3, u * .1), p[1]); limb(ctx, [[k + u * .12, b - u * .4], [k + u * .16, b - u * .02]], Math.max(3, u * .1), p[1]);
  const g = ctx.createLinearGradient(bx - u * .4, by, bx + u * .4, by); g.addColorStop(0, p[1]); g.addColorStop(.45, p[2]); g.addColorStop(1, p[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - u * .18, by - u * .45); ctx.quadraticCurveTo(bx, by - u * .62, bx + u * .18, by - u * .45); ctx.quadraticCurveTo(bx + u * .3, by - u * .05, bx + u * .46, by + u * .32); ctx.lineTo(bx - u * .46, by + u * .32); ctx.quadraticCurveTo(bx - u * .3, by - u * .05, bx - u * .18, by - u * .45); ctx.fill();
  ctx.strokeStyle = p[3] + "88"; ctx.lineWidth = Math.max(1, u * .025); ctx.beginPath(); ctx.moveTo(bx - u * .4, by + u * .2); ctx.lineTo(bx + u * .4, by + u * .2); ctx.stroke();
  const hx = k + f * u * .28, hy = b - u * .95; ctx.fillStyle = p[0]; ctx.beginPath(); ctx.ellipse(hx, hy, u * .14, u * .12, 0, 0, TAU); ctx.fill(); eye(ctx, hx + f * u * .06, hy - u * .02, u * .025, p[3]);
  const ax = hx + f * u * .1, ay = hy + u * .15, mx = ax + f * u * (raise ? .05 : .32), my = ay + u * (raise ? -.55 : .25);
  limb(ctx, [[ax - f * u * .05, ay], [mx, my]], Math.max(2, u * .08), p[0]); ctx.fillStyle = p[2]; ctx.beginPath(); ctx.arc(mx, my, u * .1, 0, TAU); ctx.fill();
  ctx.restore();
}
// Spindrift Medusa: a glass bell of violet membrane lit from inside, a curtain of fine tendrils below.
function drawSpindriftMedusa(ctx, q) {
  const { k, b, u, p } = q, swell = wind(q) ? 1 : 0, cy = b - u * 1.15, r = u * (.38 + swell * .06);
  ctx.save();
  for (let i = 0; i < 9; i++) { const x = k + (i - 4) * r * .2; limb(ctx, [[x, cy + r * .3], [x + (i % 2 ? 1 : -1) * u * .05, cy + r * .9], [x + (i % 3 - 1) * u * .06, b - u * .15]], Math.max(1, u * .02), i % 2 ? p[2] + "aa" : p[0] + "cc"); }
  const g = ctx.createRadialGradient(k, cy, r * .1, k, cy, r * 1.1); g.addColorStop(0, p[3] + "ee"); g.addColorStop(.4, p[2] + "aa"); g.addColorStop(1, p[0] + "cc");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(k, cy, r, r * .8, 0, Math.PI, TAU); ctx.quadraticCurveTo(k + r * .5, cy + r * .45, k, cy + r * .3); ctx.quadraticCurveTo(k - r * .5, cy + r * .45, k - r, cy); ctx.fill();
  ctx.strokeStyle = p[3] + "88"; ctx.lineWidth = Math.max(1, u * .015); for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(k, cy - r * .78); ctx.quadraticCurveTo(k + i * r * .35, cy - r * .3, k + i * r * .42, cy + r * .2); ctx.stroke(); }
  ctx.restore();
}
// Prism Stilt: three needle legs under a cut-crystal head with a bright lens.
function drawPrismStilt(ctx, q) {
  const { k, b, u, flip, p } = q, f = flip, hy = b - u * 1.75, charge = wind(q) || strike(q) ? 1 : 0;
  ctx.save();
  for (const [dx, lean] of [[-.32, -.1], [.32, .1], [0, 0]]) limb(ctx, [[k + u * dx * .2, hy + u * .2], [k + u * (dx * .7 + lean), b - u * .8], [k + u * dx, b - u * .02]], Math.max(1.5, u * .04), dx === 0 ? p[0] : p[1]);
  const pts = [[0, -.32], [.26, -.08], [.18, .2], [-.18, .2], [-.26, -.08]], g = ctx.createLinearGradient(k - u * .3, hy - u * .3, k + u * .3, hy + u * .2); g.addColorStop(0, p[3]); g.addColorStop(.5, p[2]); g.addColorStop(1, p[0]);
  ctx.fillStyle = g; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(k + x * u, hy + y * u) : ctx.moveTo(k + x * u, hy + y * u))); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = p[3] + "aa"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(k, hy - u * .32); ctx.lineTo(k + f * u * .05, hy + u * .2); ctx.stroke();
  eye(ctx, k + f * u * .12, hy - u * .02, u * (.04 + charge * .03), p[2]);
  ctx.restore();
}
// Rime Sentinel: a sentry under a crust of frost, a spear raised (to call the icicles) or levelled (to stab).
function drawRimeSentinel(ctx, q) {
  const { k, b, u, flip, p } = q, f = flip, raise = q.pose.includes(":raise") ? 1 : 0, stab = q.pose.includes("poleThrust"), top = b - u * 1.65;
  ctx.save();
  limb(ctx, [[k - u * .1, b - u * .6], [k - u * .12, b - u * .02]], Math.max(2, u * .1), p[1]); limb(ctx, [[k + u * .1, b - u * .6], [k + u * .12, b - u * .02]], Math.max(2, u * .1), p[1]);
  const g = ctx.createLinearGradient(k, top, k, b - u * .5); g.addColorStop(0, p[3]); g.addColorStop(.5, p[0]); g.addColorStop(1, p[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(k - u * .28, top + u * .4); ctx.lineTo(k + u * .28, top + u * .4); ctx.lineTo(k + u * .22, b - u * .55); ctx.lineTo(k - u * .22, b - u * .55); ctx.closePath(); ctx.fill();
  ctx.fillStyle = p[3]; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(k + i * u * .1 - u * .03, top + u * .4); ctx.lineTo(k + i * u * .1, top + u * (.55 + (i % 2 ? .06 : .12))); ctx.lineTo(k + i * u * .1 + u * .03, top + u * .4); ctx.fill(); } // icicles off the shoulders
  ctx.fillStyle = p[0]; ctx.beginPath(); ctx.arc(k, top + u * .22, u * .16, 0, TAU); ctx.fill(); ctx.fillStyle = p[1]; ctx.fillRect(k - u * .12, top + u * .18, u * .24, u * .05); eye(ctx, k + f * u * .05, top + u * .2, u * .02, p[2]);
  const hx = k + f * u * .3, hy = top + u * .65, ang = raise ? -1.45 : stab ? 0 : -.9, sx = hx + f * Math.cos(ang) * u * .9, sy = hy + Math.sin(ang) * u * .9;
  limb(ctx, [[k + f * u * .2, top + u * .45], [hx, hy]], Math.max(2, u * .08), p[0]);
  ctx.strokeStyle = "#5a6672"; ctx.lineWidth = Math.max(2, u * .035); ctx.beginPath(); ctx.moveTo(hx - f * Math.cos(ang) * u * .4, hy - Math.sin(ang) * u * .4); ctx.lineTo(sx, sy); ctx.stroke();
  ctx.fillStyle = p[2]; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + f * Math.cos(ang - .3) * -u * .15, sy - Math.sin(ang - .3) * u * .15); ctx.lineTo(sx + f * Math.cos(ang) * u * .18, sy + Math.sin(ang) * u * .18); ctx.lineTo(sx + f * Math.cos(ang + .3) * -u * .15, sy - Math.sin(ang + .3) * u * .15); ctx.fill();
  ctx.restore();
}
// Lake Glider: long, low and pale on four blade-shaped legs; it crouches flat to skate.
function drawLakeGlider(ctx, q) {
  const { k, b, u, flip, p } = q, f = flip, low = q.pose.includes(":crouch") || strike(q) ? .1 : 0, cy = b - u * (.38 - low);
  ctx.save();
  for (const [dx, s] of [[-.32, 1], [-.12, -1], [.14, 1], [.34, -1]]) { const x = k + f * u * dx; limb(ctx, [[x, cy], [x + f * u * .1 * s, b - u * .12], [x + f * u * .2, b - u * .03]], Math.max(1.5, u * .035), p[1]); ctx.strokeStyle = p[3]; ctx.lineWidth = Math.max(1, u * .02); ctx.beginPath(); ctx.moveTo(x + f * u * .05, b - u * .02); ctx.lineTo(x + f * u * .3, b - u * .02); ctx.stroke(); }
  const g = ctx.createLinearGradient(k, cy - u * .2, k, cy + u * .12); g.addColorStop(0, p[3]); g.addColorStop(.5, p[0]); g.addColorStop(1, p[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(k, cy, u * .55, u * .15, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = p[0]; ctx.beginPath(); ctx.moveTo(k + f * u * .45, cy - u * .1); ctx.lineTo(k + f * u * .82, cy - u * .02); ctx.lineTo(k + f * u * .45, cy + u * .08); ctx.fill();
  eye(ctx, k + f * u * .6, cy - u * .04, u * .02, p[2]); limb(ctx, [[k - f * u * .5, cy], [k - f * u * .8, cy - u * .08]], Math.max(1, u * .03), p[0]);
  ctx.restore();
}
// Hookhanger: a soot-black body of chain and plate with a great hook for a hand, hanging from a chain when it clings.
function drawHookhanger(ctx, q) {
  const { k, b, u, flip, p } = q, f = flip, cling = q.pose.endsWith(":cling"), swing = q.pose.includes("pendulumSwing"), cy = b - u * .7;
  ctx.save();
  if (cling || swing) { ctx.strokeStyle = "#6a6058"; ctx.lineWidth = Math.max(2, u * .04); ctx.setLineDash([u * .06, u * .04]); ctx.beginPath(); ctx.moveTo(k, cy - u * .3); ctx.lineTo(k - f * (swing ? u * .4 : 0), cy - u * 1.3); ctx.stroke(); ctx.setLineDash([]); }
  limb(ctx, [[k - u * .08, cy + u * .25], [k - u * .14, b - u * .02]], Math.max(2, u * .08), p[1]); limb(ctx, [[k + u * .08, cy + u * .25], [k + u * .12, b - u * .02]], Math.max(2, u * .08), p[1]);
  const g = ctx.createLinearGradient(k, cy - u * .35, k, cy + u * .3); g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(k, cy, u * .22, u * .32, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = p[2] + "aa"; ctx.lineWidth = Math.max(1, u * .02); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(k - u * .18, cy + i * u * .12); ctx.lineTo(k + u * .18, cy + i * u * .12); ctx.stroke(); }
  eye(ctx, k + f * u * .08, cy - u * .2, u * .03, p[2]);
  const hx = k + f * u * (wind(q) ? .2 : .35), hy = cy + u * (wind(q) ? -.15 : .1); limb(ctx, [[k + f * u * .15, cy - u * .05], [hx, hy]], Math.max(2, u * .07), p[1]);
  ctx.strokeStyle = p[3]; ctx.lineWidth = Math.max(2, u * .05); ctx.beginPath(); ctx.arc(hx + f * u * .1, hy + u * .1, u * .12, f > 0 ? -Math.PI / 2 : Math.PI * 1.5, f > 0 ? Math.PI * .8 : Math.PI * .2, f < 0); ctx.stroke();
  ctx.restore();
}
// Slagwright: a riveted foundry hand with a long ladle that glows when it tips.
function drawSlagwright(ctx, q) {
  const { k, b, u, flip, p } = q, f = flip, tip = q.pose.includes(":tip") ? 1 : 0, top = b - u * 1.5;
  ctx.save();
  limb(ctx, [[k - u * .12, b - u * .6], [k - u * .16, b - u * .02]], Math.max(3, u * .11), p[1]); limb(ctx, [[k + u * .12, b - u * .6], [k + u * .16, b - u * .02]], Math.max(3, u * .11), p[1]);
  const g = ctx.createLinearGradient(k, top, k, b - u * .5); g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(k - u * .3, top + u * .25); ctx.lineTo(k + u * .3, top + u * .25); ctx.lineTo(k + u * .26, b - u * .55); ctx.lineTo(k - u * .26, b - u * .55); ctx.closePath(); ctx.fill();
  ctx.fillStyle = p[3] + "aa"; for (let i = 0; i < 4; i++) ctx.fillRect(k - u * .22 + i * u * .14, top + u * .32, u * .03, u * .03);
  ctx.fillStyle = p[1]; ctx.fillRect(k - u * .13, top, u * .26, u * .22); ctx.fillStyle = p[2]; ctx.fillRect(k - u * .1 + f * u * .02, top + u * .08, u * .2, u * .04);
  const hx = k + f * u * .32, hy = top + u * .55, ang = tip ? .5 : -.35, ex = hx + f * Math.cos(ang) * u * .85, ey = hy + Math.sin(ang) * u * .85;
  limb(ctx, [[k + f * u * .2, top + u * .35], [hx, hy]], Math.max(2, u * .09), p[0]);
  ctx.strokeStyle = "#3a3028"; ctx.lineWidth = Math.max(2, u * .04); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.fillStyle = "#3a3028"; ctx.beginPath(); ctx.ellipse(ex, ey + u * .05, u * .15, u * .1, f * ang, 0, Math.PI); ctx.fill();
  ctx.fillStyle = p[2]; ctx.beginPath(); ctx.ellipse(ex, ey + u * .03, u * .12, u * .04, f * ang, 0, TAU); ctx.fill();
  if (tip) { ctx.fillStyle = p[2] + "cc"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(ex + f * u * .14, ey + u * (.15 + i * .12), u * (.05 - i * .01), 0, TAU); ctx.fill(); } }
  ctx.restore();
}
export const ADVENTURE_BODIES = {
  galleryLurker(ctx, q) { stamp(ctx, q, drawGalleryLurker); },
  censerWarden(ctx, q) { stamp(ctx, q, drawCenserWarden); },
  vinehookLeaper(ctx, q) { stamp(ctx, q, drawVinehookLeaper); },
  thornspitterBloom(ctx, q) { stamp(ctx, q, drawThornspitterBloom); },
  sinkmaw(ctx, q) { drawSinkmaw(ctx, q); },
  cinderKite(ctx, q) { stamp(ctx, q, drawCinderKite); },
  lamplighter(ctx, q) { stamp(ctx, q, drawLamplighter); },
  knellkeeper(ctx, q) { stamp(ctx, q, drawKnellkeeper); },
  spindriftMedusa(ctx, q) { stamp(ctx, q, drawSpindriftMedusa); },
  prismStilt(ctx, q) { stamp(ctx, q, drawPrismStilt); },
  rimeSentinel(ctx, q) { stamp(ctx, q, drawRimeSentinel); },
  lakeGlider(ctx, q) { stamp(ctx, q, drawLakeGlider); },
  hookhanger(ctx, q) { stamp(ctx, q, drawHookhanger); },
  slagwright(ctx, q) { stamp(ctx, q, drawSlagwright); },
};

// ---------------------------------------------------------------- effects
export const ADVENTURE_EFFECT_KINDS = new Set(["censerPot", "censerSmoke", "thornDart", "glassShard", "tollRing", "tendrilFall", "icicle", "iceSlick", "slagPool", "lampFire"]);
function warn(ctx, x, y, r, color, k) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = color + "33"; ctx.beginPath(); ctx.ellipse(x, y, r * Math.max(.05, k), r * .6 * Math.max(.05, k), 0, 0, TAU); ctx.fill(); }
// One adventure effect at tile size `s` (screen space is the pack effects' own: x + .5, y + .62 tiles).
export function drawAdventureEffect(ctx, f, s, now, presentation = {}) {
  const quiet = !!(presentation.reduceMotion || presentation.safeMode), x = (f.x + .5) * s, y = (f.y + .62) * s, r = (f.radius || 1) * s;
  ctx.save();
  if (f.kind === "censerPot" || f.kind === "glassShard" || f.kind === "tendrilFall" || f.kind === "icicle") {
    const tone = f.kind === "censerPot" ? (f.lamp ? "#f0a840" : "#ffb347") : f.kind === "glassShard" ? "#ffd27a" : f.kind === "tendrilFall" ? "#70e0f0" : "#bfe8ff";
    if (f.arming > 0) {
      const total = f.armTotal ??= f.arming, k = 1 - f.arming / total;
      warn(ctx, x, y, r, tone, k);
      if (f.kind === "tendrilFall" || f.kind === "icicle") { const drop = (1 - k) * s * 2.2; ctx.strokeStyle = tone; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); ctx.moveTo(x, y - s * .2 - drop - s * .5); ctx.lineTo(x, y - s * .2 - drop); ctx.stroke(); }
      if (f.kind === "censerPot" && f.from) { const fx = (f.from.x + .5) * s, fy = (f.from.y + .3) * s, bx = fx + (x - fx) * k, by = fy + (y - fy) * k - Math.sin(k * Math.PI) * s * 1.4; ctx.fillStyle = "#b08a4a"; ctx.beginPath(); ctx.arc(bx, by, s * .12, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffb347"; ctx.fillRect(bx - s * .06, by - s * .02, s * .12, s * .04); }
      if (f.kind === "glassShard") { ctx.fillStyle = "#fff3d6"; for (let i = 0; i < 4; i++) { const a = i * 1.7 + (quiet ? 0 : now / 300), d = r * .4 * ((i % 2) + .5); ctx.fillRect(x + Math.cos(a) * d - 1, y + Math.sin(a) * d * .6 - 1, 3, 3); } }
    } else { const life = Math.max(0, f.life ?? 0); ctx.globalAlpha = Math.min(1, life * 3); ctx.fillStyle = tone + "bb"; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.fill(); }
  } else if (f.kind === "iceSlick") {
    const life = Math.max(0, f.life ?? 0); ctx.globalAlpha = .6 * Math.min(1, life / .6); ctx.fillStyle = "#cfefff"; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - r * .5, y - r * .1); ctx.lineTo(x + r * .3, y + r * .15); ctx.stroke();
  } else if (f.kind === "tollRing") {
    if (!(f.arming > 0)) { const rr = (f.ring || 0) * s; ctx.globalAlpha = Math.max(.2, Math.min(1, (f.life ?? 0) * 2)); ctx.strokeStyle = "#ff7ccf"; ctx.lineWidth = Math.max(2, s * .12); ctx.beginPath(); ctx.ellipse(x, y, rr, rr * .6, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = "#f2e4c0"; ctx.lineWidth = Math.max(1, s * .04); ctx.stroke(); }
  } else if (f.kind === "slagPool") {
    if (f.arming > 0) { const total = f.armTotal ??= f.arming; warn(ctx, x, y, r, "#ff7a20", 1 - f.arming / total); }
    else { const life = Math.max(0, f.life ?? 0), cool = Math.min(1, life / .8); ctx.globalAlpha = cool; ctx.fillStyle = "#3a1a0a"; ctx.beginPath(); ctx.ellipse(x, y, r * 1.08, r * .65, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#ff7a20"; ctx.beginPath(); ctx.ellipse(x, y, r * .9, r * .52, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffe0a0"; ctx.beginPath(); ctx.ellipse(x - r * .2, y - r * .08, r * .3, r * .14, 0, 0, TAU); ctx.fill(); }
  } else if (f.kind === "lampFire") {
    const life = Math.max(0, f.life ?? 0); ctx.globalAlpha = Math.min(1, life * 1.5); ctx.fillStyle = "#2a1408aa"; ctx.beginPath(); ctx.ellipse(x, y, r, r * .55, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 5; i++) { const a = i * 1.3, h = s * (.25 + .15 * Math.sin((quiet ? 0 : now / 180) + i * 2)), fx = x + Math.cos(a) * r * .5, fy = y + Math.sin(a) * r * .25; ctx.fillStyle = i % 2 ? "#f0a840" : "#ffe0a0"; ctx.beginPath(); ctx.moveTo(fx - s * .07, fy); ctx.lineTo(fx, fy - h); ctx.lineTo(fx + s * .07, fy); ctx.fill(); }
  } else if (f.kind === "censerSmoke") {
    const life = Math.max(0, f.life ?? 0), k = Math.min(1, life / .6); ctx.globalAlpha = .55 * k;
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + (quiet ? 0 : now / 2400), d = r * .45; ctx.fillStyle = i % 2 ? "#8f877c" : "#a9a196"; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .55 - s * .1, r * .42, 0, TAU); ctx.fill(); }
  } else if (f.kind === "thornDart") {
    const a = Math.atan2(f.vy || 0, f.vx || 1); ctx.translate(x, y - s * .55); ctx.rotate(a);
    ctx.fillStyle = "#3e6b4a"; ctx.fillRect(-s * .22, -s * .03, s * .3, s * .06); ctx.fillStyle = "#ff6a8a"; ctx.beginPath(); ctx.moveTo(s * .08, -s * .05); ctx.lineTo(s * .2, 0); ctx.lineTo(s * .08, s * .05); ctx.fill();
  }
  ctx.restore();
}
