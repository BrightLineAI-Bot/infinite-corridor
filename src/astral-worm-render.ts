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
  // Raptor foreleg: feathered upper leg with ragged trailing plumes, a tapered scaled tarsus, three
  // jointed forward toes and a rear hallux, each ending in a hooked, pale-edged claw.
  const foreleg = (hx, hy, fx, fy, far = false) => {
    const body = far ? '#05070b' : ink, edge = far ? '#47525c' : rim, scale = far ? '#262f37' : '#3b4752', claw = far ? '#7d8790' : '#aeb8c0';
    const jx = hx + (fx - hx) * .4 - .07, jy = hy + (fy - hy) * .48;
    ctx.lineWidth = .024; ctx.strokeStyle = edge; ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(hx - .2, hy - .1); ctx.bezierCurveTo(hx, hy - .16, hx + .24, hy - .06, hx + .2, hy + .08);
    ctx.quadraticCurveTo(jx + .16, jy - .14, jx + .1, jy + .02);
    ctx.lineTo(jx + .02, jy + .1); ctx.lineTo(jx - .03, jy + .01); ctx.lineTo(jx - .1, jy + .08); ctx.lineTo(jx - .13, jy - .03);
    ctx.lineTo(jx - .21, jy + .01); ctx.quadraticCurveTo(hx - .24, hy + .2, hx - .2, hy - .1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = scale; ctx.lineWidth = .016; for (let j = 0; j < 3; j++) { const k = .3 + j * .2; ctx.beginPath(); ctx.moveTo(hx - .12 + (jx - hx) * k, hy + (jy - hy) * k - .02); ctx.quadraticCurveTo(hx + (jx - hx) * k, hy + (jy - hy) * k + .05, hx + .1 + (jx - hx) * k, hy + (jy - hy) * k - .01); ctx.stroke(); }
    const ax = fx, ay = fy - .02;
    ctx.fillStyle = body; ctx.strokeStyle = edge; ctx.lineWidth = .022; ctx.beginPath(); ctx.moveTo(jx - .075, jy + .02); ctx.lineTo(jx + .075, jy); ctx.lineTo(ax + .05, ay - .02); ctx.lineTo(ax - .045, ay - .01); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = scale; ctx.lineWidth = .014; for (let j = 1; j < 6; j++) { const k = j / 6, cx = jx + (ax - jx) * k, cy = jy + (ay - jy) * k, w = .07 - .02 * k; ctx.beginPath(); ctx.moveTo(cx - w, cy - .012); ctx.quadraticCurveTo(cx, cy + .02, cx + w, cy - .012); ctx.stroke(); }
    const ground = fy + .12, toes = [{ x: .3, y: ground - .03 }, { x: .2, y: ground - .005 }, { x: .23, y: ground - .07 }, { x: -.16, y: ground - .02 }];
    for (const [i, toe] of toes.entries()) {
      // Each toe drops from the ankle and then grips flat along the ground through two knuckle pads.
      const tx = ax + toe.x, ty = toe.y, cx = ax + toe.x * .2, cy = ty - .01, dir = toe.x > 0 ? 1 : -1, w = i === 3 ? .052 : .064;
      ctx.strokeStyle = edge; ctx.lineWidth = w + .026; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, tx, ty); ctx.stroke();
      ctx.strokeStyle = body; ctx.lineWidth = w; ctx.stroke();
      ctx.fillStyle = scale; for (const k of [.45, .75]) { ctx.beginPath(); ctx.ellipse(ax + toe.x * k, ty - .012 + (1 - k) * (ay - ty) * .25, .026, .016, 0, 0, TAU); ctx.fill(); }
      // Slender hooked claw: a sharp crescent curving down into the ground.
      ctx.fillStyle = '#12161c'; ctx.strokeStyle = claw; ctx.lineWidth = .011; ctx.beginPath();
      ctx.moveTo(tx - dir * .012, ty - .026); ctx.quadraticCurveTo(tx + dir * .115, ty - .04, tx + dir * .125, ty + .08);
      ctx.quadraticCurveTo(tx + dir * .07, ty + .005, tx - dir * .008, ty + .022); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
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
    // Far legs, hock and weight-bearing paws.
    limb(-.55,.15,-.35,.85);oval(-.27,.85,.2,.1);foreleg(.66,.0,.92,.78,true);
    ctx.lineWidth=.13;ctx.strokeStyle=ink;ctx.beginPath();ctx.moveTo(-1.0,.02);ctx.bezierCurveTo(-1.65,-.1,-1.55,-.8,-1.93,-.65);ctx.stroke();
    ctx.lineWidth=.035;ctx.strokeStyle=rim;ctx.stroke();oval(-1.96,-.65,.16,.1,-.2);
    oval(-.5,-.06,.9,.46);oval(-.92,.18,.42,.45,-.4);
    ctx.fillStyle=ink;ctx.strokeStyle=rim;ctx.lineWidth=.03;ctx.beginPath();ctx.moveTo(-.92,.22);ctx.bezierCurveTo(-.75,.26,-.52,.43,-.59,.59);ctx.quadraticCurveTo(-.68,.74,-.86,.87);ctx.quadraticCurveTo(-1.05,1.0,-1.18,.92);ctx.quadraticCurveTo(-1.28,.8,-1.02,.72);ctx.bezierCurveTo(-1.13,.6,-1.29,.46,-1.2,.38);ctx.closePath();ctx.fill();ctx.stroke();
    oval(-.98,.88,.27,.12);for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(-1.16+j*.11,.88);ctx.lineTo(-1.2+j*.11,.98);ctx.stroke();}
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
    ctx.strokeStyle=rim;ctx.lineWidth=.025;for(let j=0;j<5;j++){ctx.beginPath();ctx.moveTo(.59-j*.045,-1.12+j*.12);ctx.lineTo(.38-j*.035,-.98+j*.12);ctx.lineTo(.55-j*.04,-.98+j*.12);ctx.stroke();}ctx.restore();
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

// Geometry descriptors are the same objects consumed by the combat collision predicate.
export function drawAstralHazards(ctx, hazards, project, unit = 24) {
  for (const h of hazards) { const p = project(h.x, h.y); ctx.save(); ctx.translate(p.x, p.y); ctx.strokeStyle = h.active ? '#ee97b8' : '#9eafce'; ctx.fillStyle = h.active ? '#b46b9638' : '#8b9fc319'; ctx.lineWidth = Math.max(1, unit * .035);
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

// Owner-requested riding seat (revised 2026-10-21): a traditional tan leather saddle, large enough to read
// on a phone against the black ink body, over an oxblood pad, with cream stitching and a steel stirrup.
// Pure decoration; it never changes creature geometry or hitboxes.
export const ASTRAL_SADDLE = Object.freeze({ width: { worm: .64, griffin: .68, pool: .74, flight: .64 },
  leather: '#8a5428', shadow: '#5a3216', shine: '#c08a52', outline: '#2a1609', pad: '#6a2621', stitch: '#e2c48e', iron: '#bfc5ca' });
export function drawAstralSaddle(ctx, {x,y,unit,form='worm',facing=1}) {
  const S=ASTRAL_SADDLE, W=S.width[form]??S.width.worm;
  ctx.save();ctx.translate(x,y);ctx.scale(unit*facing,unit);ctx.lineJoin='round';ctx.lineCap='round';
  // Wool pad peeks out under the tree, front and back.
  ctx.fillStyle=S.pad;ctx.strokeStyle=S.outline;ctx.lineWidth=.016;ctx.beginPath();
  ctx.moveTo(-W*.56,-.05);ctx.quadraticCurveTo(-W*.6,.1,-W*.48,.13);ctx.lineTo(W*.5,.13);ctx.quadraticCurveTo(W*.6,.1,W*.56,-.05);ctx.closePath();ctx.fill();ctx.stroke();
  // Tree and seat: a high cantle behind, a dished seat and a raised pommel in front.
  ctx.fillStyle=S.leather;ctx.beginPath();ctx.moveTo(-W*.5,.02);
  ctx.quadraticCurveTo(-W*.56,-.17,-W*.44,-.22);ctx.quadraticCurveTo(-W*.38,-.24,-W*.33,-.17);
  ctx.bezierCurveTo(-W*.18,-.1,W*.12,-.1,W*.3,-.15);ctx.quadraticCurveTo(W*.4,-.25,W*.5,-.2);
  ctx.quadraticCurveTo(W*.55,-.08,W*.47,.03);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=S.shine;ctx.lineWidth=.014;ctx.beginPath();ctx.moveTo(-W*.3,-.15);ctx.bezierCurveTo(-W*.16,-.09,W*.1,-.09,W*.27,-.13);ctx.stroke();
  ctx.fillStyle=S.shadow;ctx.beginPath();ctx.ellipse(-W*.44,-.17,W*.05,.04,-.3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(W*.46,-.17,W*.04,.035,.3,0,Math.PI*2);ctx.fill();
  // Hanging fender with stitched border, then stirrup leather and a steel stirrup.
  ctx.fillStyle=S.shadow;ctx.strokeStyle=S.outline;ctx.lineWidth=.016;ctx.beginPath();
  ctx.moveTo(-W*.2,-.04);ctx.lineTo(W*.17,-.04);ctx.quadraticCurveTo(W*.21,.13,W*.15,.26);ctx.quadraticCurveTo(0,.29,-W*.17,.26);ctx.quadraticCurveTo(-W*.23,.13,-W*.2,-.04);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=S.stitch;ctx.lineWidth=.009;ctx.setLineDash([.026,.02]);ctx.beginPath();
  ctx.moveTo(-W*.16,0);ctx.lineTo(W*.13,0);ctx.quadraticCurveTo(W*.16,.13,W*.115,.225);ctx.quadraticCurveTo(0,.25,-W*.135,.225);ctx.quadraticCurveTo(-W*.19,.13,-W*.16,0);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle=S.outline;ctx.lineWidth=.04;ctx.beginPath();ctx.moveTo(W*.02,.2);ctx.lineTo(W*.02,.33);ctx.stroke();
  ctx.strokeStyle=S.leather;ctx.lineWidth=.024;ctx.stroke();
  ctx.strokeStyle=S.outline;ctx.lineWidth=.036;ctx.beginPath();ctx.moveTo(W*.02-.06,.33);ctx.lineTo(W*.02+.06,.33);ctx.lineTo(W*.02+.075,.42);ctx.lineTo(W*.02-.075,.42);ctx.closePath();ctx.stroke();
  ctx.strokeStyle=S.iron;ctx.lineWidth=.02;ctx.stroke();
  ctx.restore();
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
