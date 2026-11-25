// Native Canvas model. All silhouettes are original procedural ink geometry, not franchise assets.
// Shared by the isolated model preview and eventual production renderer adapter.
export function drawAstralWorm(ctx, { x = 0, y = 0, scale = 24, time = 0, form = 'worm', facing = 1, alpha = 1, reducedMotion = false } = {}) {
  const t = reducedMotion ? 0 : time, TAU = Math.PI * 2;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale * facing, scale); ctx.globalAlpha *= alpha;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = .045;
  const ink = '#07090e', rim = '#697785';
  const oval = (x, y, rx, ry, a = 0, color = ink) => { ctx.fillStyle = color; if (color === ink) { const g = ctx.createRadialGradient(x - rx * .25, y - ry * .4, 0, x, y, Math.max(rx, ry)); g.addColorStop(0, '#263039'); g.addColorStop(.45, '#0b1017'); g.addColorStop(1, '#030508'); ctx.fillStyle = g; } ctx.lineWidth = .025; ctx.strokeStyle = rim; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, TAU); ctx.fill(); ctx.stroke(); };
  const limb = (x, y, ex, ey, hand = false) => {
    ctx.strokeStyle = rim; ctx.lineWidth = .17; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo((x + ex) / 2 + .15, ey - .25); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = ink; ctx.lineWidth = .105; ctx.stroke();
    if (hand) for (let j = 0; j < 4; j++) { ctx.lineWidth = .045; ctx.strokeStyle = rim; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + (j - 1.5) * .1, ey + .2 + (j % 2) * .08); ctx.stroke(); }
  };
  // Lion hind leg: lower leg (gaskin, hock point, metatarsus, padded paw with three toes and short claw
  // tips) painted first, then the muscled thigh over it so the knee tucks under the haunch.
  const hindleg = (hip, knee, hock, paw, far = false) => {
    const body = far ? '#05070b' : ink, edge = far ? '#47525c' : rim, shade = far ? '#1a2128' : '#2c3843', claw = far ? '#7d8790' : '#aeb8c0', g = paw.y;
    // Lower leg as one silhouette: gaskin from the knee down-back to the hock point, then a slim
    // metatarsus forward-down to a padded paw. The front contour bends at the hock joint.
    ctx.fillStyle = body; ctx.strokeStyle = edge; ctx.lineWidth = .024; ctx.beginPath();
    ctx.moveTo(knee.x + .06, knee.y - .04); ctx.quadraticCurveTo(knee.x - .02, hock.y - .02, hock.x + .1, hock.y + .03);
    ctx.quadraticCurveTo(hock.x + .1, (hock.y + g) / 2, paw.x + .06, g - .14);
    ctx.bezierCurveTo(paw.x + .14, g - .17, paw.x + .25, g - .11, paw.x + .24, g - .03); ctx.quadraticCurveTo(paw.x + .23, g, paw.x + .17, g);
    ctx.lineTo(paw.x - .08, g); ctx.quadraticCurveTo(paw.x - .14, g - .02, paw.x - .1, g - .1);
    ctx.quadraticCurveTo(hock.x - .04, (hock.y + g) / 2, hock.x - .07, hock.y);
    ctx.quadraticCurveTo(hock.x - .05, hock.y - .1, knee.x - .14, knee.y - .12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = shade; ctx.lineWidth = .015; ctx.beginPath(); ctx.moveTo(hock.x - .01, hock.y + .04); ctx.quadraticCurveTo(hock.x + .03, (hock.y + g) / 2, paw.x - .03, g - .12); ctx.stroke();
    for (const k of [.06, .14]) { ctx.beginPath(); ctx.moveTo(paw.x + k, g - .1); ctx.quadraticCurveTo(paw.x + k + .02, g - .05, paw.x + k, g - .005); ctx.stroke(); }
    ctx.fillStyle = '#12161c'; ctx.strokeStyle = claw; ctx.lineWidth = .009;
    for (const k of [.1, .18, .24]) { ctx.beginPath(); ctx.moveTo(paw.x + k - .02, g - .03); ctx.quadraticCurveTo(paw.x + k + .035, g - .035, paw.x + k + .04, g + .015); ctx.quadraticCurveTo(paw.x + k + .01, g - .005, paw.x + k - .015, g - .005); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // Muscled teardrop thigh narrowing to the knee.
    const thigh = ctx.createRadialGradient(hip.x - .1, hip.y - .15, .02, hip.x, hip.y, .5); thigh.addColorStop(0, far ? '#151b22' : '#263039'); thigh.addColorStop(.5, '#0b1017'); thigh.addColorStop(1, '#030508');
    ctx.fillStyle = thigh; ctx.strokeStyle = edge; ctx.lineWidth = .026; ctx.beginPath(); ctx.moveTo(hip.x - .34, hip.y - .08);
    ctx.bezierCurveTo(hip.x - .36, hip.y - .4, hip.x + .22, hip.y - .42, hip.x + .28, hip.y - .06);
    ctx.quadraticCurveTo(knee.x + .2, knee.y - .16, knee.x + .08, knee.y + .02);
    ctx.quadraticCurveTo(knee.x - .06, knee.y + .08, knee.x - .2, knee.y - .02);
    ctx.quadraticCurveTo(hip.x - .42, hip.y + .22, hip.x - .34, hip.y - .08); ctx.closePath(); ctx.fill();
    // Outline only the front and underside; the top flows into the body unbroken.
    ctx.beginPath(); ctx.moveTo(hip.x + .26, hip.y - .14); ctx.quadraticCurveTo(hip.x + .29, hip.y - .1, hip.x + .28, hip.y - .06);
    ctx.quadraticCurveTo(knee.x + .2, knee.y - .16, knee.x + .08, knee.y + .02);
    ctx.quadraticCurveTo(knee.x - .06, knee.y + .08, knee.x - .2, knee.y - .02);
    ctx.quadraticCurveTo(hip.x - .42, hip.y + .22, hip.x - .38, hip.y + .02); ctx.stroke();
    ctx.strokeStyle = shade; ctx.lineWidth = .018; ctx.beginPath(); ctx.moveTo(hip.x - .22, hip.y - .24); ctx.quadraticCurveTo(hip.x + .1, hip.y - .3, hip.x + .2, hip.y - .08); ctx.stroke();
  };
  // Raptor foreleg: feathered upper leg with ragged trailing plumes, a tapered scaled tarsus, three
  // jointed forward toes and a rear hallux, each ending in a hooked, pale-edged claw.
  const foreleg = (hx, hy, fx, fy, far = false) => {
    const body = far ? '#05070b' : ink, edge = far ? '#47525c' : rim, scale = far ? '#262f37' : '#3b4752', claw = far ? '#7d8790' : '#aeb8c0';
    const jx = hx + (fx - hx) * .4 - .05, jy = hy + (fy - hy) * .5, ax = fx, ay = fy - .02;
    // Scaled tarsus, slightly forward-raked, with overlapping scutes.
    ctx.fillStyle = body; ctx.strokeStyle = edge; ctx.lineWidth = .022; ctx.beginPath(); ctx.moveTo(jx - .07, jy - .04); ctx.lineTo(jx + .07, jy - .06);
    ctx.quadraticCurveTo(ax + .07, (jy + ay) / 2, ax + .045, ay - .02); ctx.lineTo(ax - .045, ay - .01); ctx.quadraticCurveTo(jx - .02, (jy + ay) / 2 + .04, jx - .07, jy - .04); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = scale; ctx.lineWidth = .013; for (let j = 1; j < 6; j++) { const k = j / 6, cx = jx + (ax - jx) * k + .01, cy = jy + (ay - jy) * k, w = .055 - .015 * k; ctx.beginPath(); ctx.moveTo(cx - w, cy - .01); ctx.quadraticCurveTo(cx, cy + .022, cx + w, cy - .012); ctx.stroke(); }
    const ground = fy + .12, toes = [{ x: .23, y: ground - .07 }, { x: .3, y: ground - .03 }, { x: .2, y: ground - .005 }, { x: -.16, y: ground - .02 }];
    for (const [i, toe] of toes.entries()) {
      // Each toe drops from the ankle and then grips flat along the ground through two knuckle pads.
      const tx = ax + toe.x, ty = toe.y, cx = ax + toe.x * .2, cy = ty - .01, dir = toe.x > 0 ? 1 : -1, w = i === 3 ? .05 : .06;
      ctx.strokeStyle = edge; ctx.lineWidth = w + .026; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, tx, ty); ctx.stroke();
      ctx.strokeStyle = body; ctx.lineWidth = w; ctx.stroke();
      ctx.fillStyle = scale; for (const k of [.45, .75]) { ctx.beginPath(); ctx.ellipse(ax + toe.x * k, ty - .012 + (1 - k) * (ay - ty) * .25, .024, .015, 0, 0, TAU); ctx.fill(); }
      // Slender hooked claw: a sharp crescent curving down into the ground.
      ctx.fillStyle = '#12161c'; ctx.strokeStyle = claw; ctx.lineWidth = .011; ctx.beginPath();
      ctx.moveTo(tx - dir * .012, ty - .026); ctx.quadraticCurveTo(tx + dir * .115, ty - .04, tx + dir * .125, ty + .08);
      ctx.quadraticCurveTo(tx + dir * .07, ty + .005, tx - dir * .008, ty + .022); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // Feathered upper leg over the tarsus top: a rounded front, a trailing hem of layered plume tips swept
    // back, and no outline along the top so it grows out of the breast.
    const tips = [[jx + .07, jy + .06], [jx - .02, jy + .1], [jx - .11, jy + .07], [jx - .19, jy + .02], [jx - .25, jy - .06]];
    ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(hx - .22, hy - .12); ctx.bezierCurveTo(hx - .02, hy - .2, hx + .22, hy - .12, hx + .2, hy + .06);
    ctx.quadraticCurveTo(jx + .14, jy - .08, tips[0][0], tips[0][1]);
    for (let i = 1; i < tips.length; i++) { const [px, py] = tips[i - 1], [qx, qy] = tips[i]; ctx.quadraticCurveTo((px + qx) / 2 + .01, (py + qy) / 2 - .07, qx, qy); }
    ctx.quadraticCurveTo(hx - .3, hy + .14, hx - .22, hy - .12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = .022; ctx.beginPath(); ctx.moveTo(hx + .21, hy - .02); ctx.quadraticCurveTo(hx + .22, hy + .02, hx + .2, hy + .06);
    ctx.quadraticCurveTo(jx + .14, jy - .08, tips[0][0], tips[0][1]);
    for (let i = 1; i < tips.length; i++) { const [px, py] = tips[i - 1], [qx, qy] = tips[i]; ctx.quadraticCurveTo((px + qx) / 2 + .01, (py + qy) / 2 - .07, qx, qy); }
    ctx.quadraticCurveTo(hx - .3, hy + .14, hx - .26, hy - .02); ctx.stroke();
    // Inner feather rows echo the hem.
    ctx.strokeStyle = scale; ctx.lineWidth = .014;
    for (const k of [.35, .65]) { ctx.beginPath(); for (let i = 0; i < tips.length - 1; i++) { const [px, py] = tips[i], [qx, qy] = tips[i + 1], ox = (hx - jx) * k, oy = (hy - jy) * k; if (!i) ctx.moveTo(px + ox, py + oy); ctx.quadraticCurveTo((px + qx) / 2 + ox + .01, (py + qy) / 2 + oy - .06, qx + ox, qy + oy); } ctx.stroke(); }
  };
  oval(-.25, .9, 2.1, .23, 0, '#0a101a70');
  if (form === 'pool') {
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12, r = 1.8 + .2 * Math.sin(t * 2 + i); ctx.fillStyle = ink; ctx.strokeStyle = rim; ctx.beginPath(); ctx.moveTo(Math.cos(a - .18), Math.sin(a - .18) * .5); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * .55 - .12); ctx.lineTo(Math.cos(a + .18), Math.sin(a + .18) * .5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = ink; ctx.strokeStyle = rim; ctx.lineWidth = .025; ctx.beginPath();
    ctx.moveTo(-1.45, -.1); ctx.bezierCurveTo(-1.5, -.45, -.7, -.65, -.2, -.43);
    ctx.bezierCurveTo(.2, -.7, .7, -.3, 1.15, -.3); ctx.bezierCurveTo(1.8, -.2, 1.6, .25, 1.05, .4);
    ctx.bezierCurveTo(.5, .65, .1, .35, -.35, .48); ctx.bezierCurveTo(-.8, .65, -1.75, .4, -1.45, -.1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#37434b'; ctx.lineWidth = .035; ctx.beginPath(); ctx.moveTo(-1.1, -.15); ctx.bezierCurveTo(-.6, -.4, -.15, -.2, .5, -.15); ctx.stroke();
  } else if (form === 'griffin') {
    // Eagle forequarters and a crouched lion rear body, all grown from the same black ink.
    ctx.fillStyle=ink;ctx.strokeStyle=rim;ctx.lineWidth=.028;
    ctx.beginPath();ctx.moveTo(.3,-.3);ctx.bezierCurveTo(-.15,-.9,-.8,-1.25,-1.4,-1.15);ctx.bezierCurveTo(-1.2,-.7,-.6,-.2,-.15,-.18);ctx.closePath();ctx.fill();ctx.stroke();
    // Layered eagle primaries: long separate tips, not bat membranes or triangular spikes.
    for(let i=0;i<7;i++){const bx=.1-i*.1,by=-.35-i*.07,tx=-.45-i*.2,ty=-1.65+i*.105;ctx.fillStyle=i%2?'#0b1017':ink;ctx.beginPath();ctx.moveTo(bx,by);ctx.bezierCurveTo(tx+.28,ty+.02,tx+.08,ty-.035,tx,ty-.12);ctx.bezierCurveTo(tx+.015,ty+.12,bx-.12,by+.1,bx,by);ctx.closePath();ctx.fill();ctx.stroke();}
    oval(-.15,-.46,.43,.24,-.65);
    // Far side first: lion hind leg and raptor foreleg, both a shade darker for depth.
    hindleg({ x: -.62, y: .08 }, { x: -.42, y: .44 }, { x: -.72, y: .6 }, { x: -.58, y: .92 }, true);foreleg(.66,.0,.92,.78,true);
    // Lion tail: an outlined tapering sweep ending in a flame-shaped ink tuft.
    ctx.lineCap='round';ctx.strokeStyle=rim;ctx.lineWidth=.1;ctx.beginPath();ctx.moveTo(-1.0,.02);ctx.bezierCurveTo(-1.65,-.1,-1.5,-.75,-1.86,-.66);ctx.stroke();
    ctx.strokeStyle=ink;ctx.lineWidth=.06;ctx.stroke();
    ctx.fillStyle=ink;ctx.strokeStyle=rim;ctx.lineWidth=.022;ctx.beginPath();ctx.moveTo(-1.8,-.7);
    ctx.quadraticCurveTo(-1.95,-.8,-2.2,-.74);ctx.lineTo(-2.08,-.69);ctx.lineTo(-2.27,-.62);ctx.lineTo(-2.1,-.6);ctx.lineTo(-2.2,-.5);
    ctx.quadraticCurveTo(-1.98,-.52,-1.8,-.62);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#2c3843';ctx.lineWidth=.014;ctx.beginPath();ctx.moveTo(-1.86,-.66);ctx.quadraticCurveTo(-2,-.66,-2.14,-.63);ctx.stroke();
    oval(-.5,-.06,.9,.46);
    // Near lion hind leg: muscled thigh over a backward hock and a heavy padded paw.
    hindleg({ x: -.92, y: .1 }, { x: -.72, y: .48 }, { x: -1.04, y: .66 }, { x: -.9, y: .98 });
    // High, powerful breast narrows into the unmistakable raptor neck.
    const breast=ctx.createRadialGradient(.35,-.3,.05,.35,-.25,.8);breast.addColorStop(0,'#253039');breast.addColorStop(.4,'#0d141c');breast.addColorStop(1,ink);ctx.fillStyle=breast;ctx.beginPath();ctx.moveTo(.05,.28);ctx.bezierCurveTo(.6,.45,.87,.04,.82,-.35);ctx.bezierCurveTo(.86,-.58,1.04,-.61,1.17,-.68);ctx.lineTo(.83,-.89);ctx.bezierCurveTo(.38,-.85,.02,-.54,-.05,-.38);ctx.closePath();ctx.fill();ctx.stroke();
    foreleg(.44,.02,.52,.8);
    ctx.save();ctx.translate(.22,.39);oval(.86,-1.2,.35,.28,-.12);
    // Broad cere, hooked upper beak and separate lower mandible, not a triangular snout.
    ctx.fillStyle='#10151c';ctx.beginPath();ctx.moveTo(.92,-1.34);ctx.bezierCurveTo(1.22,-1.4,1.55,-1.18,1.32,-.88);ctx.lineTo(1.31,-1.08);ctx.quadraticCurveTo(1.17,-1.16,.96,-1.12);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(.97,-1.34);ctx.bezierCurveTo(1.22,-1.4,1.55,-1.18,1.32,-.88);ctx.lineTo(1.31,-1.08);ctx.quadraticCurveTo(1.17,-1.16,1.01,-1.12);ctx.stroke();
    // A swept liquid crest remains modest enough to survive the small gameplay silhouette.
    ctx.fillStyle=ink;ctx.beginPath();ctx.moveTo(.69,-1.38);ctx.quadraticCurveTo(.58,-1.45,.43,-1.43);ctx.lineTo(.58,-1.31);ctx.lineTo(.39,-1.32);ctx.lineTo(.62,-1.17);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(1.05,-1.1);ctx.lineTo(1.3,-1.07);ctx.lineTo(1.13,-1.02);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#b3bcc2';ctx.lineWidth=.035;ctx.beginPath();ctx.moveTo(.81,-1.3);ctx.lineTo(1.02,-1.27);ctx.stroke();oval(.94,-1.24,.033,.024,0,'#abb8c1');
    // Crown and throat feathers retain irregular, liquid points.
    ctx.strokeStyle='#3b4752';ctx.lineWidth=.02;for(let j=0;j<5;j++){ctx.beginPath();ctx.moveTo(.6-j*.045,-1.1+j*.12);ctx.quadraticCurveTo(.52-j*.04,-.99+j*.12,.42-j*.035,-1.03+j*.12);ctx.stroke();}ctx.restore();
  } else {
    if (form === 'flight') {
      for (const side of [-1,1]) for(let j=0;j<2;j++) {
        ctx.save();ctx.translate(-.1-j*.22,-.12);ctx.rotate(side*(.5+j*.4+.025*Math.sin(t*18)));
        const len=2.35-j*.12;ctx.fillStyle='#233442a8';ctx.strokeStyle='#71828d';ctx.lineWidth=.018;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-.5,-.4,-len+.2,-.38,-len,0);ctx.bezierCurveTo(-len+.15,.3,-.65,.3,0,0);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.strokeStyle='#8193a166';ctx.lineWidth=.012;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-1.1,-.1,-len,0);ctx.stroke();
        for(let n=1;n<6;n++){const xx=-n*len/6,spread=.22*Math.sin(n*Math.PI/6);ctx.beginPath();ctx.moveTo(xx+.12,-.025);ctx.quadraticCurveTo(xx-.04,-spread*.5,xx-.17,-spread);ctx.moveTo(xx+.1,-.025);ctx.quadraticCurveTo(xx-.03,spread*.5,xx-.13,spread);ctx.stroke();}
        ctx.restore();
      }
    }
    if (form === 'trample' || form === 'bite') for (let i = 0; i < 20; i++) {
      const xx = .85 - (i % 10) * .3, side = i < 10 ? -1 : 1;
      limb(xx, -.12, xx + .3 * Math.sin(t * 9 + i), side * (.55 + (i % 3) * .15), i % 3 === 0);
    }
    for (let i = 8; i >= 0; i--) {
      const r = .42 - i * .025, xx = .8 - i * .35, yy = -.12 + Math.sin(t * 5 - i * .65) * .13;
      oval(xx, yy, r * 1.1, r); oval(xx - .08, yy - r * .45, r * .6, r * .12, -.15, '#28333b');
    }
    if (form === 'flight') {
      // Paired jointed insect mandibles: broad roots, knuckles, hooked blades and inward teeth.
      for (const side of [-1,1]) {
        const open=.04*Math.sin(t*5);ctx.save();ctx.translate(1.02,-.1);ctx.scale(1,side);
        ctx.fillStyle=ink;ctx.strokeStyle=rim;ctx.lineWidth=.026;ctx.beginPath();
        ctx.moveTo(-.02,.14);ctx.bezierCurveTo(.25,.2,.3,.65+open,.65,.53+open);ctx.bezierCurveTo(.93,.5,1.04,.31,1.05,.18);
        ctx.quadraticCurveTo(.93,.24,.84,.33);ctx.lineTo(.73,.27);ctx.lineTo(.7,.38);ctx.quadraticCurveTo(.65,.35,.59,.33);ctx.lineTo(.52,.43);ctx.bezierCurveTo(.29,.42,.15,.12,.04,.1);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.strokeStyle='#354450';ctx.lineWidth=.018;ctx.beginPath();ctx.moveTo(.15,.22);ctx.bezierCurveTo(.34,.56,.72,.55,.93,.3);ctx.stroke();ctx.restore();
      }
      oval(1.02,-.36,.16,.14,-.2);oval(1.02,.14,.16,.14,.2);
      ctx.strokeStyle='#8e9ba5';ctx.lineWidth=.014;for(let j=0;j<4;j++){ctx.beginPath();ctx.moveTo(.92+j*.055,-.45);ctx.lineTo(.96+j*.04,-.27);ctx.stroke();}
    }
    if (form === 'bite') {
      oval(1.05, -.1, .48, .55, 0, '#4b2830'); oval(1.08, -.1, .35, .42, 0, '#020204');
      oval(1.1, .17, .16, .1, -.2, '#713941');
      for (let i = 0; i < 6; i++) for (const side of [-1, 1]) {
        const xx = .84 + i * .075, edge = -.1 + side * (.3 - Math.abs(i - 2.5) * .018), tip = edge - side * (.1 + (i % 3) * .024);
        ctx.fillStyle = i % 3 ? '#bfb5a6' : '#8b8075'; ctx.beginPath(); ctx.moveTo(xx, edge); ctx.lineTo(xx + .063, edge + side * .015); ctx.lineTo(xx + .055, tip); ctx.lineTo(xx + .012, tip - side * .01); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = '#9a5862'; ctx.lineWidth = .025; ctx.beginPath(); ctx.ellipse(1.08, -.1, .4, .49, -.08, .1, 2.9); ctx.stroke();
    }
  }
  ctx.restore();
}

// Mouth beam with a ground-impact area effect: an expanding pair of shock rings, a hot core splash and
// sparks thrown out and falling back. Driven by the actor's active clock (frozen while paused); reduced
// motion shows a single steady ring. Purely visual; the combat hazard owns damage.
export const ASTRAL_BEAM_FX = Object.freeze({ core: '#fff1fb', glow: '#db9fc5', haze: '#b46b9655', ring: '#f2c4e2', spark: '#ffe3f4',
  width: .07, glowWidth: .2, ringRadius: .62, ringPeriod: .6, sparks: 10, sparkPeriod: .7, sparkReach: .55, sparkRise: .5 });
export function drawAstralBeam(ctx, mouth, ground, unit, time = 0, reducedMotion = false) {
  const F = ASTRAL_BEAM_FX, t = reducedMotion ? 0 : time, TAU = Math.PI * 2, flicker = reducedMotion ? 1 : .85 + .15 * Math.sin(t * 37);
  ctx.save(); ctx.lineCap = 'round';
  // Ground splash under the column.
  ctx.fillStyle = F.haze; ctx.beginPath(); ctx.ellipse(ground.x, ground.y, unit * F.ringRadius * .75, unit * F.ringRadius * .3, 0, 0, TAU); ctx.fill();
  const rings = reducedMotion ? [.6] : [(t / F.ringPeriod) % 1, (t / F.ringPeriod + .5) % 1];
  for (const k of rings) { ctx.globalAlpha = (1 - k) * .85; ctx.strokeStyle = F.ring; ctx.lineWidth = Math.max(1, unit * .035 * (1 - k * .6)); ctx.beginPath(); ctx.ellipse(ground.x, ground.y, unit * F.ringRadius * (.25 + k), unit * F.ringRadius * (.25 + k) * .4, 0, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // Column: soft outer glow, then a bright flickering core.
  ctx.strokeStyle = F.glow; ctx.globalAlpha = .35 * flicker; ctx.lineWidth = Math.max(2, unit * F.glowWidth); ctx.beginPath(); ctx.moveTo(mouth.x, mouth.y); ctx.lineTo(ground.x, ground.y); ctx.stroke();
  ctx.globalAlpha = .8; ctx.strokeStyle = F.glow; ctx.lineWidth = Math.max(1.5, unit * F.width * 1.8); ctx.stroke();
  ctx.globalAlpha = 1; ctx.strokeStyle = F.core; ctx.lineWidth = Math.max(1, unit * F.width * flicker); ctx.stroke();
  ctx.fillStyle = F.core; ctx.beginPath(); ctx.ellipse(ground.x, ground.y, unit * .16, unit * .07, 0, 0, TAU); ctx.fill();
  if (!reducedMotion) for (let i = 0; i < F.sparks; i++) {
    const k = ((t + i * F.sparkPeriod / F.sparks) / F.sparkPeriod) % 1, a = i * 2.39996, dir = Math.cos(a), depth = Math.sin(a) * .4;
    const x = ground.x + dir * unit * F.sparkReach * k, y = ground.y + depth * unit * F.sparkReach * k - unit * F.sparkRise * 4 * k * (1 - k);
    ctx.globalAlpha = 1 - k; ctx.fillStyle = F.spark; ctx.fillRect(x - unit * .022, y - unit * .022, unit * .044, unit * .044);
  }
  ctx.restore();
}

// Geometry descriptors are the same objects consumed by the combat collision predicate.
export function drawAstralHazards(ctx, hazards, project, unit = 24) {
  for (const h of hazards) { const p = project(h.x, h.y); ctx.save(); ctx.translate(p.x, p.y); ctx.strokeStyle = 'rgba(255,130,210,.72)'; ctx.fillStyle = h.active ? 'rgba(255,80,190,.32)' : 'rgba(255,80,190,.14)'; /* release 427: DANGER pink (monster-pack), warning and live */ ctx.lineWidth = Math.max(1, unit * .035);
    ctx.beginPath(); ctx.arc(0, 0, h.outer * unit, 0, Math.PI * 2); ctx.closePath(); if (h.inner > 0) { ctx.moveTo(h.inner * unit, 0); ctx.arc(0, 0, h.inner * unit, 0, Math.PI * 2, true); ctx.closePath(); } ctx.fill('evenodd'); ctx.stroke(); ctx.restore(); }
}

// Smooth active-time dissolve between ink silhouettes. The runtime supplies elapsed phase time;
// never advance this from a wall clock while paused. Reduced motion makes a clean immediate change.
export function drawAstralMorph(ctx, options, previousForm, progress) {
  if (previousForm === options.form) { drawAstralWorm(ctx, options); return; }
  const k = options.reducedMotion ? 1 : Math.max(0, Math.min(1, progress));
  if (k < 1 && previousForm !== options.form) drawAstralWorm(ctx, {...options, form: previousForm, alpha: (options.alpha ?? 1) * (1-k)});
  drawAstralWorm(ctx, {...options, alpha: (options.alpha ?? 1) * k});
}

// Owner-requested riding mount (revised again 2026-10-21): a compact futuristic plinth the Walker stands on.
// A dark gunmetal clamp grips the beast with a violet glow bleeding out beneath it; above, a silver disc
// platform with a glowing seam, and a violet light column rising to about the rider's hips. The 'back'
// layer paints behind the rider; the 'front' layer adds a faint veil over his legs so he stands inside it.
// Pure decoration; it never changes creature geometry or hitboxes.
export const ASTRAL_SADDLE = Object.freeze({ size: .75, width: { worm: .66, griffin: .68, pool: .74, flight: .66 },
  clamp: '#181b22', clampEdge: '#8f99a5', plate: '#b9c2cc', plateSide: '#5b6470', plateShade: '#3a414b', outline: '#0b0d12',
  seam: '#c58bff', glow: '#9b5cff', glowHeight: .46, veilAlpha: .4 });
export function drawAstralSaddle(ctx, {x,y,unit,form='worm',facing=1,layer='back',rise=1}) {
  const S=ASTRAL_SADDLE, W=S.width[form]??S.width.worm, TAU=Math.PI*2, top=-.03, rx=W*.5, ry=.075;
  ctx.save();ctx.translate(x,y);ctx.scale(unit*facing*S.size,unit*S.size);ctx.lineJoin='round';
  const column=(alpha)=>{
    const h=S.glowHeight/S.size*Math.max(0,Math.min(1,rise)); if(!(h>0))return; const g=ctx.createLinearGradient(0,top,0,top-h);
    g.addColorStop(0,S.glow+'ee');g.addColorStop(.5,S.glow+'88');g.addColorStop(1,S.glow+'00');
    const base=ctx.globalAlpha;ctx.globalAlpha=base*alpha;ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-rx*.92,top);ctx.lineTo(-rx*.78,top-h);ctx.lineTo(rx*.78,top-h);ctx.lineTo(rx*.92,top);
    ctx.ellipse(0,top,rx*.92,ry*.85,0,0,Math.PI);ctx.closePath();ctx.fill();
    // Glowing field edges and light streaks fade upward, so the column reads even where the rider covers it.
    const edge=ctx.createLinearGradient(0,top,0,top-h);edge.addColorStop(0,S.seam);edge.addColorStop(1,S.seam+'00');
    ctx.strokeStyle=edge;ctx.lineWidth=.018;ctx.beginPath();ctx.moveTo(-rx*.92,top);ctx.lineTo(-rx*.78,top-h);ctx.moveTo(rx*.92,top);ctx.lineTo(rx*.78,top-h);
    for(const k of [-.45,.1,.55]){ctx.moveTo(rx*k,top+.02);ctx.lineTo(rx*k*.9,top-h*.75);}ctx.stroke();ctx.globalAlpha=base;
  };
  if(layer==='front'){column(S.veilAlpha);ctx.restore();return;}
  // Violet glow beneath, where the clamp meets the beast.
  const under=ctx.createRadialGradient(0,.13,0,0,.13,W*.6);under.addColorStop(0,S.glow+'aa');under.addColorStop(1,S.glow+'00');
  ctx.fillStyle=under;ctx.beginPath();ctx.ellipse(0,.13,W*.6,.12,0,0,TAU);ctx.fill();
  // Gunmetal clamp with silver edges and two bracket feet.
  ctx.fillStyle=S.clamp;ctx.strokeStyle=S.clampEdge;ctx.lineWidth=.014;ctx.beginPath();
  ctx.moveTo(-rx*.78,top+.04);ctx.lineTo(rx*.78,top+.04);ctx.lineTo(rx*.58,.13);ctx.lineTo(rx*.3,.15);ctx.lineTo(-rx*.3,.15);ctx.lineTo(-rx*.58,.13);ctx.closePath();ctx.fill();ctx.stroke();
  for(const sx of [-1,1]){ctx.beginPath();ctx.moveTo(sx*rx*.62,.1);ctx.lineTo(sx*rx*.9,.17);ctx.lineTo(sx*rx*.78,.19);ctx.lineTo(sx*rx*.5,.13);ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.strokeStyle=S.seam;ctx.lineWidth=.012;ctx.beginPath();ctx.moveTo(-rx*.4,.11);ctx.lineTo(rx*.4,.11);ctx.stroke();
  // Light column behind the rider, rising from the platform.
  column(1);
  // Silver disc platform: shaded side band with a glowing seam, then the bright top face.
  ctx.fillStyle=S.plateSide;ctx.strokeStyle=S.outline;ctx.lineWidth=.014;ctx.beginPath();
  ctx.ellipse(0,top+.05,rx,ry,0,0,Math.PI);ctx.lineTo(-rx,top);ctx.ellipse(0,top,rx,ry,0,Math.PI,0,true);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=S.seam;ctx.lineWidth=.016;ctx.beginPath();ctx.ellipse(0,top+.028,rx*.985,ry*.98,0,.15,Math.PI-.15);ctx.stroke();
  ctx.fillStyle=S.plate;ctx.strokeStyle=S.outline;ctx.lineWidth=.014;ctx.beginPath();ctx.ellipse(0,top,rx,ry,0,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle=S.plateShade;ctx.beginPath();ctx.ellipse(0,top+.008,rx*.68,ry*.6,0,0,TAU);ctx.fill();
  ctx.strokeStyle=S.seam;ctx.lineWidth=.01;ctx.beginPath();ctx.ellipse(0,top+.008,rx*.68,ry*.6,0,0,TAU);ctx.stroke();
  ctx.restore();
}

// Boarding presentation. `b` is astralMountPresentation(rider).boarding; positions are world tiles, drawn with
// the shared actor projection (x+.5, y+.82). 'back' paints the flying disk or the latched plinth and its rising
// pillar; 'front' paints the violet phase burst over the rider. riderAlpha() fades him out and in.
export const ASTRAL_BOARDING_FX = Object.freeze({ trail: 4, trailStep: .07, burst: '#c58bff', core: '#f3e6ff', beamWidth: .34, beamHeight: 1.3, ringRadius: .5 });
export function astralBoardingRiderAlpha(b) { return !b ? 1 : b.phase === 'phaseOut' ? 1 - b.k : b.phase === 'phaseIn' ? b.k : 1; }
function boardingDisk(ctx, x, y, unit, spin, alpha) {
  const S=ASTRAL_SADDLE, rx=S.width.worm*.5*S.size*unit, ry=Math.max(.15,Math.abs(Math.cos(spin)))*.075*S.size*unit;
  ctx.save();ctx.globalAlpha*=alpha;
  const g=ctx.createRadialGradient(x,y,0,x,y,rx*1.5);g.addColorStop(0,S.glow+'aa');g.addColorStop(1,S.glow+'00');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,rx*1.5,rx*.9,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=S.plateSide;ctx.strokeStyle=S.outline;ctx.lineWidth=Math.max(1,unit*.01);ctx.beginPath();ctx.ellipse(x,y+ry*.5,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle=S.plate;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle=S.seam;ctx.lineWidth=Math.max(1,unit*.012);ctx.beginPath();ctx.ellipse(x,y,rx*.68,ry*.6,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function phaseBurst(ctx, x, y, unit, k, rising) {
  const F=ASTRAL_BOARDING_FX, a=rising?1-k:k, h=F.beamHeight*unit*(rising?.4+.6*k:1-.6*k), w=F.beamWidth*unit*(1-.5*Math.abs(k-.5));
  ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,.25+a));
  const g=ctx.createLinearGradient(0,y,0,y-h);g.addColorStop(0,F.burst+'ee');g.addColorStop(.6,F.burst+'66');g.addColorStop(1,F.burst+'00');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.lineTo(x-w*.2,y-h);ctx.lineTo(x+w*.2,y-h);ctx.lineTo(x+w/2,y);ctx.closePath();ctx.fill();
  ctx.fillStyle=F.core;ctx.globalAlpha*=.8;ctx.fillRect(x-w*.08,y-h*.85,w*.16,h*.85);
  ctx.globalAlpha=Math.max(0,1-k);ctx.strokeStyle=F.burst;ctx.lineWidth=Math.max(1,unit*.03);ctx.beginPath();ctx.ellipse(x,y,F.ringRadius*unit*(.4+k),F.ringRadius*unit*(.4+k)*.4,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}
export function drawAstralBoarding(ctx, b, {tile, unit, facing=1, riderX, riderY, layer='back', reducedMotion=false}) {
  if(!b)return;
  const at=(p,h=0)=>({x:(p.x+.5)*tile,y:(p.y+.82)*tile-h*tile}), seat=b.seat&&at(b.seat,b.seatLift||0), rider={x:riderX,y:riderY};
  if(layer==='back'){
    if(b.phase==='throw'&&b.disk){
      const F=ASTRAL_BOARDING_FX, from=b.from||b.disk;
      for(let i=F.trail;i>=0;i--){const k=Math.max(0,b.k-i*F.trailStep),seatP=b.seat||b.disk,px={x:from.x+(seatP.x-from.x)*k,y:from.y+(seatP.y-from.y)*k},
        h=(b.disk.h||0)*(i?.95:1),p=at(i?px:b.disk,i?h:b.disk.h);boardingDisk(ctx,p.x,p.y,unit,reducedMotion?0:b.k*Math.PI*6-i*.6,i?.35/i:1);}
    } else if(seat&&b.phase!=='phaseIn') drawAstralSaddle(ctx,{x:seat.x,y:seat.y,unit,form:b.form||'worm',facing,rise:b.phase==='pillar'?b.k:1}); // phaseIn: the riding saddle draws it
    if(b.phase==='pillar'&&seat&&b.k<.4) phaseBurst(ctx,seat.x,seat.y,unit,b.k/.4,true);
  } else {
    if(b.phase==='phaseOut') phaseBurst(ctx,rider.x,rider.y,unit,b.k,true);
    if(b.phase==='phaseIn') phaseBurst(ctx,rider.x,rider.y,unit,b.k,false);
  }
}

// Exactly the combat core's three finite ink descriptors. Ground impact radii and
// visual spreading share the same values; outbound/recall droplets do not damage.
export function drawAstralInkBlobs(ctx, blobs, project, unit=24) {
  for(const blob of blobs){
    const at=project(blob.x,blob.y),r=Math.max(.04,Number(blob.radius)||.14)*unit;
    ctx.save();ctx.lineWidth=Math.max(.7,unit*.018);ctx.lineJoin='round';
    if(blob.phase==='warning'){ if(!blob.target){ctx.restore();continue;}
      const target=project(blob.target.x,blob.target.y);ctx.strokeStyle=blob.blocked?'#46525c':'#8393ab';
      ctx.beginPath();ctx.ellipse(target.x,target.y,r,r*.55,0,0,Math.PI*2);ctx.stroke();
    } else {
      const y=at.y-(Number(blob.height)||0)*unit,splat=blob.phase==='splat';
      ctx.fillStyle=blob.blocked?'#10141b88':'#07090e';ctx.strokeStyle='#5b6978';
      ctx.beginPath();ctx.ellipse(at.x,y,r,splat?r*.56:r*.8,splat?0:-.18,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.strokeStyle='#28343f';ctx.beginPath();ctx.ellipse(at.x-r*.18,y-r*(splat?.12:.2),r*.48,r*.12,-.15,Math.PI,Math.PI*2);ctx.stroke();
      if(splat){ctx.fillStyle='#080b11';for(const sign of [-1,1]){ctx.beginPath();ctx.ellipse(at.x+sign*r*.85,y+r*.12,r*.2,r*.09,sign*.2,0,Math.PI*2);ctx.fill();}}
    }
    ctx.restore();
  }
}
