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
    limb(-.55,.15,-.35,.85);oval(-.27,.85,.2,.1);limb(.65,.05,.98,.86);
    ctx.strokeStyle=rim;ctx.lineWidth=.025;for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(.95,.83);ctx.quadraticCurveTo(1.04+j*.08,.87,1.03+j*.08,.97);ctx.stroke();}
    ctx.lineWidth=.13;ctx.strokeStyle=ink;ctx.beginPath();ctx.moveTo(-1.0,.02);ctx.bezierCurveTo(-1.65,-.1,-1.55,-.8,-1.93,-.65);ctx.stroke();
    ctx.lineWidth=.035;ctx.strokeStyle=rim;ctx.stroke();oval(-1.96,-.65,.16,.1,-.2);
    oval(-.5,-.06,.9,.46);oval(-.92,.18,.42,.45,-.4);
    ctx.fillStyle=ink;ctx.strokeStyle=rim;ctx.lineWidth=.03;ctx.beginPath();ctx.moveTo(-.92,.22);ctx.bezierCurveTo(-.75,.26,-.52,.43,-.59,.59);ctx.quadraticCurveTo(-.68,.74,-.86,.87);ctx.quadraticCurveTo(-1.05,1.0,-1.18,.92);ctx.quadraticCurveTo(-1.28,.8,-1.02,.72);ctx.bezierCurveTo(-1.13,.6,-1.29,.46,-1.2,.38);ctx.closePath();ctx.fill();ctx.stroke();
    oval(-.98,.88,.27,.12);for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(-1.16+j*.11,.88);ctx.lineTo(-1.2+j*.11,.98);ctx.stroke();}
    // High, powerful breast narrows into the unmistakable raptor neck.
    const breast=ctx.createRadialGradient(.35,-.3,.05,.35,-.25,.8);breast.addColorStop(0,'#253039');breast.addColorStop(.4,'#0d141c');breast.addColorStop(1,ink);ctx.fillStyle=breast;ctx.beginPath();ctx.moveTo(.05,.28);ctx.bezierCurveTo(.6,.45,.87,.04,.82,-.35);ctx.bezierCurveTo(.86,-.58,1.04,-.61,1.17,-.68);ctx.lineTo(.83,-.89);ctx.bezierCurveTo(.38,-.85,.02,-.54,-.05,-.38);ctx.closePath();ctx.fill();ctx.stroke();
    limb(.48,.05,.5,.79);
    // Scaled raptor tarsus and three curled, separate front talons.
    ctx.strokeStyle=rim;ctx.lineWidth=.025;for(let j=0;j<4;j++){ctx.beginPath();ctx.moveTo(.47,.51+j*.065);ctx.lineTo(.57,.51+j*.065);ctx.stroke();}
    for(let j=0;j<3;j++){const xx=.42+j*.12;ctx.fillStyle=ink;ctx.beginPath();ctx.moveTo(.52,.75);ctx.quadraticCurveTo(xx+.18,.82,xx+.2,.91);ctx.lineTo(xx+.14,1.0);ctx.quadraticCurveTo(xx+.13,.87,xx,.88);ctx.closePath();ctx.fill();ctx.stroke();}
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
