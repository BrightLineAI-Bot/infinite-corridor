import { enemyDangerRadius } from "./game.js?v=51";
export function cameraTransform(
  g,
  w,
  h,
  tileSize = Math.max(28, Math.min(44, w / 12)),
) {
  return {
    tileSize,
    x: w / 2 - g.player.x * tileSize,
    y: h / 2 - g.player.y * tileSize,
  };
}
export function screenToWorld(g, w, h, x, y) {
  const c = cameraTransform(g, w, h);
  return { x: (x - c.x) / c.tileSize, y: (y - c.y) / c.tileSize };
}
const PAL = {
  ash: ["#3b3834", "#5a5049"],
  glass: ["#345052", "#52716d"],
  ember: ["#553b34", "#85584a"],
  refuge: ["#485848", "#6f8067"],
  floor: ["#3b403d", "#555750"],
  blocked: ["#232522", "#45423d"],
  wall: ["#1d211f", "#403d37"],
  river: ["#203f48", "#2b5962"],
  canyon: ["#171616", "#302721"],
  bridge: ["#67533d", "#856b4b"],
  logBridge: ["#5b442e", "#866847"],
  cityFloor: ["#45454a", "#57565b"],
  cityWall: ["#292a2d", "#59585c"],
  arcologyFloor: ["#293e43", "#3d5960"],
  arcologyWall: ["#1b2d32", "#49666b"],
  cloisterFloor: ["#493f43", "#665459"],
  cloisterWall: ["#2d272b", "#625158"],
};
function h(x, y) {
  return (Math.imul(x + 37, 73856093) ^ Math.imul(y + 19, 19349663)) >>> 0;
}
function tile(ctx, t, x, y, s, map, w) {
  const p = PAL[t.kind] || PAL.ash,
    d = Number.isFinite(t.detail) ? t.detail : h(x, y),
    px = x * s,
    py = y * s;
  ctx.fillStyle = p[d & 1];
  ctx.fillRect(px, py, s + 1, s + 1);
  if (t.kind === "river") {
    ctx.strokeStyle = (d & 1) ? "#8fc2c477" : "#659ca166"; ctx.lineWidth = 2;
    for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(px + ((d + q * 11) % 13), py + 7 + q * s * .26); ctx.quadraticCurveTo(px + s * .5, py + 2 + q * s * .26, px + s - 3, py + 7 + q * s * .26); ctx.stroke(); }
    return;
  }
  if (t.kind === "canyon") {
    ctx.fillStyle = "#070707cc"; ctx.fillRect(px + 3, py, s - 6, s + 1); ctx.strokeStyle = "#75584488"; ctx.beginPath(); ctx.moveTo(px + 2, py); ctx.lineTo(px + 7 + (d % 5), py + s * .45); ctx.lineTo(px + 3, py + s); ctx.stroke(); ctx.strokeStyle = "#8c6a4b55"; ctx.beginPath(); ctx.moveTo(px + s - 3, py); ctx.lineTo(px + s - 8, py + s * .6); ctx.lineTo(px + s - 2, py + s); ctx.stroke(); return;
  }
  if (t.kind === "bridge" || t.kind === "logBridge") {
    ctx.fillStyle = "#2b2119"; ctx.fillRect(px, py + 2, s + 1, s - 4); ctx.fillStyle = p[d & 1]; for (let q = 2; q < s; q += 7) ctx.fillRect(px + 2, py + q, s - 4, 5); ctx.strokeStyle = "#b594603f"; ctx.strokeRect(px + 2, py + 2, s - 4, s - 4); return;
  }
  if (t.structure === "districtDoor") {
    ctx.fillStyle = p[d & 1]; ctx.fillRect(px, py, s + 1, s + 1); ctx.fillStyle="#0b0d0d";ctx.fillRect(px+s*.2,py+s*.08,s*.6,s*.86);ctx.strokeStyle="#b79c7166";ctx.lineWidth=2;ctx.strokeRect(px+s*.18,py+s*.06,s*.64,s*.9);ctx.fillStyle="#c6a66a";ctx.fillRect(px+s*.66,py+s*.5,3,3);return;
  }
  if (t.blocked) {
    if (t.structure === "districtWall") {
      const colors={city:["#37383c","#77757b"],arcology:["#20373d","#66939a"],cloister:["#3b3036","#8a6d75"]}[t.districtStyle]||["#333","#777"];
      const same=(dx,dy)=>map[(y+dy)*w+x+dx]?.buildingId===t.buildingId;
      ctx.fillStyle=colors[0];ctx.fillRect(px,py,s+1,s+1);ctx.fillStyle=colors[1]+"33";ctx.fillRect(px,py+s*.12,s+1,s*.12);ctx.fillRect(px,py+s*.58,s+1,s*.1);ctx.strokeStyle="#d5c6a22d";ctx.lineWidth=1;for(let q=.33;q<1;q+=.34){ctx.beginPath();ctx.moveTo(px,py+s*q);ctx.lineTo(px+s,py+s*q);ctx.stroke()}for(let q=.25;q<1;q+=.5){const off=((y+Math.round(q*4))&1)*s*.25;ctx.beginPath();ctx.moveTo(px+s*q-off,py);ctx.lineTo(px+s*q-off,py+s);ctx.stroke()}ctx.strokeStyle="#080a0acc";ctx.lineWidth=2;if(!same(-1,0)){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+s);ctx.stroke()}if(!same(1,0)){ctx.beginPath();ctx.moveTo(px+s,py);ctx.lineTo(px+s,py+s);ctx.stroke()}if(!same(0,-1)){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+s,py);ctx.stroke()}if(!same(0,1)){ctx.beginPath();ctx.moveTo(px,py+s);ctx.lineTo(px+s,py+s);ctx.stroke()}return;
    }
    const up = y > 0 && map[(y - 1) * w + x]?.blocked,
      down = map[(y + 1) * w + x]?.blocked;
    ctx.fillStyle = p[1];
    ctx.fillRect(px + 2, py + (up ? 1 : 5), s - 4, s - (up ? 3 : 8));
    ctx.fillStyle = "#11100ed0";
    ctx.fillRect(px, py + s * 0.55, s, 2);
    ctx.fillRect(px + (d % 5) * s * 0.12, py + 4, 2, s * 0.42);
    if (!up) {
      ctx.fillStyle = "#9b947b33";
      ctx.fillRect(px + 4, py + 2, s - 9, 2);
      ctx.fillStyle = "#13120f";
      ctx.fillRect(px + (d % 7) + 3, py + 2, 3, 2);
    }
    if (!down) {
      ctx.fillStyle = "#05050599";
      ctx.fillRect(px + 2, py + s - 7, s - 4, 7);
    }
  } else {
    ctx.fillStyle = "#d2c6aa12";
    ctx.fillRect(px + 3, py + 3, s - 7, 1);
    ctx.fillStyle = "#09090835";
    for (let i = 0; i < 2; i++)
      ctx.fillRect(
        px + 4 + ((d >> (i * 4)) % (s - 8)),
        py + 5 + ((d >> (i * 7)) % (s - 10)),
        2,
        2,
      );
    ctx.strokeStyle = "#17151266";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 3 + (d % 8), py + s - 4);
    ctx.lineTo(px + s * 0.4, py + s * 0.55);
    ctx.lineTo(px + s - 5, py + 5 + (d % 7));
    ctx.stroke();
    if ((d & 7) === 0) {
      ctx.fillStyle = "#14120f88";
      ctx.fillRect(px, py + s - 3, 5 + (d % 9), 3);
    }
    if((d&15)===3){ctx.strokeStyle=t.kind==='ember'?'#c1744748':t.kind==='glass'?'#76b4ac42':'#93836a42';ctx.beginPath();ctx.arc(px+s*.62,py+s*.42,s*.13,0,Math.PI*1.5);ctx.stroke();ctx.fillStyle="#11130f88";ctx.fillRect(px+s*.58,py+s*.38,3,3)}
    if((d&31)===11){ctx.fillStyle="#c6a66a38";for(let q=0;q<3;q++)ctx.fillRect(px+6+q*5,py+s-8-(q%2)*3,2,2)}
  }
}
const COLORS = {
  player: ["#79877b", "#252b2a", "#b9925f"],
  ashling: ["#87503f", "#342727", "#b78a62"],
  glassMite: ["#607c79", "#283b3b", "#aab7aa"],
  sparkWarden: ["#6b6472", "#35313d", "#c09b58"],
  ashenHound: ["#765244", "#302724", "#c18a63"],
  veilMoth: ["#786887", "#302c39", "#b8a7cd"],
  rootBrute: ["#667052", "#303629", "#a99a67"],
  coilStalker: ["#47716d", "#263a39", "#87c0ad"],
  cinderWisp: ["#a95d3c", "#4b2923", "#efb15d"],
  hollowMarshal: ["#78434a", "#332429", "#b99b68"],
  riftColossus: ["#713841", "#2b2022", "#c18352"],
  npc: ["#9b815d", "#453832", "#879b8d"],
  shrine: ["#557b74", "#263c3b", "#b7c1aa"],
  checkpoint: ["#668b91", "#304448", "#c7b887"],
  door: ["#76533b", "#382b25", "#9d805d"],
  tree: ["#65513b", "#353229", "#596344"],
  rock: ["#666a65", "#343735", "#90948b"],
  dungeon: ["#62576b", "#332d39", "#63817a"],
  chest: ["#8d6938", "#443326", "#b7a06a"],
  exit: ["#53796c", "#293a35", "#9aac99"],
  ruinMarker: ["#806b52", "#433a31", "#b09b79"],
  bossCue: ["#873f43", "#391f24", "#bd8257"],
  cache: ["#9a8549", "#4a4229", "#c1ae72"],
};
function actor(
  ctx,
  x,
  y,
  s,
  kind,
  facing = "down",
  frame = 0,
  state = "idle",
  boss = false,
) {
  const p = COLORS[kind] || COLORS.ashling,
    k = x * s + s / 2,
    base = y * s + s * 0.82,
    bob = frame % 2,
    sc = boss ? 1.28 : 1;
  if (state === "telegraph") {
    const range = ({sparkWarden:5,riftColossus:3,veilMoth:4,coilStalker:2,cinderWisp:5})[kind]||0,
      r = enemyDangerRadius({ range }) * s,
      ranged = range > 0;
    ctx.save();
    ctx.fillStyle = ranged ? "#594a6230" : "#783b3438";
    ctx.strokeStyle = ranged ? "#a99abecc" : "#c37a5dcc";
    ctx.lineWidth = ranged ? 2 : 2.5;
    ctx.setLineDash(ranged ? [8, 6] : [3, 5]);
    ctx.beginPath();
    ctx.arc(k, (y + 0.5) * s, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = ranged ? "#80758f77" : "#9a594777";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(k, (y + 0.5) * s, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (kind !== "player") {
    ctx.fillStyle = "#050504aa";
    ctx.beginPath();
    ctx.ellipse(k, base, s * 0.3 * sc, s * 0.1, 0, 0, 7);
    ctx.fill();
  }
  const rect = (c, a, b, w, h) => {
    ctx.fillStyle = c;
    ctx.fillRect(
      Math.round(k + a * s * sc),
      Math.round(base + b * s * sc - bob),
      Math.max(2, Math.round(w * s * sc)),
      Math.max(2, Math.round(h * s * sc)),
    );
  };
  if (kind === "player") {
    rect(p[1], -0.22, -0.57, 0.44, 0.5);
    rect(p[0], -0.18, -0.76, 0.36, 0.28);
    rect("#171817", -0.12, -0.69, 0.24, 0.14);
    rect(p[2], -0.07, -0.66, 0.04, 0.04);
    rect(p[2], 0.04, -0.66, 0.04, 0.04);
    rect("#24231f", -0.2, -0.08, 0.13, 0.12);
    rect("#24231f", 0.07, -0.08, 0.13, 0.12);
    rect(p[2], facing === "left" ? -0.38 : 0.2, -0.48, 0.18, 0.05);
  } else if (kind === "glassMite") {
    rect(p[1], -0.31, -0.29, 0.62, 0.22);
    for (const q of [-0.3, -0.1, 0.12, 0.3]) rect(p[0], q, -0.12, 0.05, 0.19);
    rect(p[0], -0.17, -0.48, 0.18, 0.25);
    rect(p[2], -0.09, -0.43, 0.04, 0.1);
    rect(p[0], 0.04, -0.42, 0.15, 0.19);
  } else if (kind === "sparkWarden") {
    rect(p[1], -0.15, -0.7, 0.3, 0.65);
    rect(p[0], -0.2, -0.78, 0.4, 0.16);
    rect(p[2], -0.3, -0.75, 0.05, 0.7);
    for (let q = 0; q < 3; q++) rect(p[2], -0.1, -0.57 + q * 0.15, 0.2, 0.04);
  } else if (kind === "ashenHound") {
    rect(p[1],-.32,-.34,.62,.3);rect(p[0],.12,-.48,.3,.28);rect(p[2],.34,-.42,.06,.06);rect(p[0],-.38,-.45,.2,.09);rect(p[1],-.25,-.12,.08,.18);rect(p[1],.18,-.12,.08,.18);
  } else if (kind === "veilMoth") {
    rect(p[1],-.07,-.55,.14,.5);rect(p[0],-.42,-.62,.34,.35);rect(p[0],.08,-.62,.34,.35);rect(p[2],-.03,-.7,.06,.08);
  } else if (kind === "rootBrute") {
    rect(p[1],-.34,-.62,.68,.6);rect(p[0],-.27,-.82,.54,.27);rect(p[2],-.14,-.73,.08,.05);rect(p[0],-.47,-.5,.16,.52);rect(p[0],.31,-.5,.16,.52);
  } else if (kind === "coilStalker") {
    rect(p[1],-.28,-.5,.56,.42);rect(p[0],-.18,-.7,.36,.24);rect(p[2],-.34,-.4,.68,.06);rect(p[2],-.04,-.62,.08,.08);
  } else if (kind === "cinderWisp") {
    rect(p[1],-.18,-.55,.36,.38);rect(p[0],-.12,-.72,.24,.24);rect(p[2],-.06,-.63,.12,.12);rect(p[2],-.1,-.18,.2,.12);
  } else if (kind === "hollowMarshal") {
    rect(p[1], -0.29, -0.66, 0.58, 0.62);
    rect(p[0], -0.36, -0.62, 0.72, 0.18);
    rect(p[0], -0.23, -0.83, 0.46, 0.23);
    rect("#181717", -0.15, -0.75, 0.3, 0.07);
    rect(p[2], 0.3, -0.57, 0.09, 0.48);
  } else if (kind === "riftColossus") {
    rect(p[1], -0.41, -0.72, 0.7, 0.68);
    rect(p[0], -0.49, -0.57, 0.35, 0.48);
    rect(p[0], 0.13, -0.88, 0.38, 0.75);
    rect("#22191a", -0.18, -0.8, 0.28, 0.22);
    rect(p[2], -0.09, -0.7, 0.08, 0.07);
  } else if (kind === "ashling") {
    rect(p[1], -0.2, -0.55, 0.4, 0.5);
    rect(p[0], -0.16, -0.72, 0.32, 0.24);
    rect(p[0], -0.25, -0.83, 0.08, 0.2);
    rect(p[0], 0.17, -0.83, 0.08, 0.2);
    rect(p[2], -0.08, -0.65, 0.04, 0.04);
    rect(p[1], -0.28, -0.28, 0.12, 0.25);
  } else if (kind === "npc") {
    rect(p[1], -0.22, -0.58, 0.44, 0.56);
    rect(p[0], -0.18, -0.75, 0.36, 0.23);
    rect(p[2], -0.1, -0.68, 0.04, 0.04);
    rect(p[2], 0.06, -0.68, 0.04, 0.04);
    rect(p[0], -0.29, -0.48, 0.1, 0.38);
  } else {
    rect(p[1], -0.25, -0.42, 0.5, 0.42);
    rect(p[0], -0.18, -0.66, 0.36, 0.3);
    if (kind === "tree") {
      if(state === "fallen") { rect(p[1], -.43, -.18, .86, .16); rect(p[0], -.35, -.27, .28, .22); }
      else if(state === "charred") { rect("#29231f", -.09, -.75, .18, .72); rect("#3b2d25", -.3, -.78, .25, .16); }
      else { rect(p[1], -0.1, -0.82, 0.2, 0.8); rect(p[0], -0.38, -0.86, 0.76, 0.32); rect("#71845b", -.27, -1.02, .54, .22); }
    } else if (kind === "rock" && (state === "moved" || state === "broken")) {
      rect("#4f514d", -.32, -.2, .2, .12); rect("#73766f", -.04, -.16, .24, .1); rect("#3c3f3b", .2, -.12, .13, .08);
    } else if (kind === "checkpoint" || kind === "shrine") {
      rect(p[2], -0.05, -0.85, 0.1, 0.65);
      rect(p[0], -0.24, -0.34, 0.48, 0.18);
    } else if (kind === "door" || kind === "dungeon" || kind === "exit") {
      rect(p[0], -0.34, -0.82, 0.68, 0.82);
      rect("#171614", -0.23, -0.66, 0.46, 0.66);
    } else if (kind === "chest" || kind === "cache") {
      rect(p[0], -0.3, -0.38, 0.6, 0.35);
      rect(p[2], -0.04, -0.31, 0.08, 0.12);
    }
  }
  if (state === "attack" || state === "telegraph")
    rect(
      state === "telegraph" ? "#c57b55" : p[2],
      facing === "left" ? -0.42 : 0.25,
      -0.45,
      0.17,
      0.05,
    );
}
export function drawWaymarkIcon(ctx,signalKind,s){
  const colors={beacon:'#72d7df',crossing:'#d5a464',danger:'#d16b62',event:'#a68ad2'},c=colors[signalKind]||'#b7b49d';ctx.strokeStyle=c;ctx.fillStyle=c+'22';ctx.lineWidth=Math.max(2,s*.07);ctx.beginPath();
  if(signalKind==='beacon')ctx.arc(0,0,s*.27,0,Math.PI*1.65);
  else if(signalKind==='crossing'){ctx.moveTo(-s*.25,-s*.2);ctx.lineTo(s*.22,0);ctx.lineTo(-s*.25,s*.2);}
  else if(signalKind==='danger'){ctx.moveTo(-s*.22,-s*.25);ctx.lineTo(-s*.22,s*.25);ctx.lineTo(s*.25,0);ctx.closePath();}
  else{ctx.arc(0,0,s*.23,0,Math.PI*1.5);ctx.lineTo(s*.28,0);}
  ctx.fill();ctx.stroke();if(signalKind==='danger'){ctx.lineWidth=Math.max(2,s*.055);ctx.beginPath();ctx.moveTo(s*.25,0);ctx.lineTo(s*.43,0);ctx.stroke()}return c;
}
function waymark(ctx,o,s){
  const cx=(o.x+.5)*s,cy=(o.y+.55)*s,a=Math.atan2(o.dirY,o.dirX);ctx.save();ctx.translate(cx,cy);ctx.rotate(a);drawWaymarkIcon(ctx,o.signalKind,s);ctx.restore();
}
function shack(ctx,o,s,p,map){
  const b=o.bounds||{x:o.x-2,y:o.y-2,w:5,h:4},inside=p.x>=b.x+1&&p.x<b.x+b.w-1&&p.y>=b.y+1&&p.y<b.y+b.h-1,x=b.x*s,y=b.y*s,w=b.w*s,h=b.h*s;
  ctx.save();if(inside){ctx.strokeStyle="#9a795066";ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);ctx.restore();return}ctx.globalAlpha=1;ctx.fillStyle="#2a2520";ctx.beginPath();ctx.moveTo(x-s*.12,y+s*.25);ctx.lineTo(x+w*.5,y-s*.65);ctx.lineTo(x+w+s*.12,y+s*.25);ctx.lineTo(x+w-s*.2,y+h*.38);ctx.lineTo(x+s*.2,y+h*.38);ctx.closePath();ctx.fill();ctx.strokeStyle="#9a7950";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#171714";ctx.fillRect(x+w*.42,y+h*.12,s*.7,s*.95);ctx.fillStyle="#ad8b58";ctx.font=`${Math.max(8,s*.22)}px monospace`;ctx.textAlign="center";ctx.fillText("WAYFARER SHACK",x+w/2,y-s*.72);ctx.textAlign="start";ctx.restore();
}
function architecturalBuilding(ctx,o,s,p,map){
  const b=o.bounds,mw=32,pt=map[Math.floor(p.y)*mw+Math.floor(p.x)],inside=pt?.buildingId===o.id,colors={city:["#393a3f","#858188"],arcology:["#18333b","#58a0a6"],cloister:["#3b2d35","#9a737f"]}[o.districtStyle]||["#333","#888"],accent={copper:"#b37954",ivory:"#d5c8a7",oxide:"#9a6457",violet:"#9278a8"}[o.accent]||colors[1],cells=o.footprint||[];
  ctx.save();if(inside){ctx.strokeStyle=accent+"77";ctx.lineWidth=2;for(const c of cells){const set=new Set(cells.map(q=>`${q.x},${q.y}`));if(!set.has(`${c.x-1},${c.y}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo(c.x*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x+1},${c.y}`)){ctx.beginPath();ctx.moveTo((c.x+1)*s,c.y*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x},${c.y-1}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo((c.x+1)*s,c.y*s);ctx.stroke()}if(!set.has(`${c.x},${c.y+1}`)){ctx.beginPath();ctx.moveTo(c.x*s,(c.y+1)*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}}ctx.restore();return}
  ctx.fillStyle=colors[0];for(const c of cells)ctx.fillRect(c.x*s,c.y*s,s+1,s+1);ctx.globalAlpha=.28;ctx.fillStyle=colors[1];for(const c of cells)if(((c.x+c.y+o.signGlyph)&3)===0)ctx.fillRect(c.x*s+s*.12,c.y*s+s*.12,s*.76,s*.12);ctx.globalAlpha=1;
  const x=b.x*s,y=b.y*s,w=b.w*s,h=b.h*s;ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.strokeRect(x+s*.08,y+s*.08,w-s*.16,h-s*.16);if(o.roofProfile==='gable'||o.roofProfile==='spire'){ctx.beginPath();ctx.moveTo(x+s*.18,y+h*.48);ctx.lineTo(x+w*.5,y+(o.roofProfile==='spire'?s*.12:h*.2));ctx.lineTo(x+w-s*.18,y+h*.48);ctx.stroke()}else if(o.roofProfile==='stepped'){for(let q=1;q<=3;q++)ctx.strokeRect(x+s*q*.28,y+s*q*.22,w-s*q*.56,h-s*q*.44)}else{for(let q=s*.7;q<w-s*.5;q+=s*1.6)ctx.fillRect(x+q,y+s*.55,s*.44,s*.22)}
  const doorX=(o.door.x+.12)*s,doorY=(o.door.y+.05)*s;ctx.fillStyle="#090b0b";ctx.fillRect(doorX,doorY,s*.76,s*.9);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.strokeRect(doorX,doorY,s*.76,s*.9);const frontY=o.door.side==='north'?y+s*.32:y+h-s*.58,step=o.facadeRhythm==='narrow'?1:o.facadeRhythm==='broad'?3:2;ctx.fillStyle=accent+"bb";for(let q=1;q<b.w-1;q+=step)if(Math.abs(b.x+q-o.door.x)>1)ctx.fillRect(x+q*s+s*.18,frontY,s*.5,s*.2);
  ctx.fillStyle=accent;ctx.beginPath();const gx=x+w*.5,gy=o.door.side==='north'?y+s*.7:y+h-s*.7,r=s*.18;for(let q=0;q<4;q++){const a=(o.signGlyph+q)*Math.PI/2;ctx.lineTo(gx+Math.cos(a)*r,gy+Math.sin(a)*r)}ctx.closePath();ctx.stroke();ctx.fillStyle="#dfd4b2";ctx.font=`${Math.max(8,s*.2)}px monospace`;ctx.textAlign="center";ctx.fillText(o.name.toUpperCase(),x+w/2,y-s*.2);ctx.textAlign="start";ctx.restore();
}
export function render(ctx, g, w, h, now) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#141816";
  ctx.fillRect(0, 0, w, h);
  const s = Math.max(28, Math.min(44, w / 12)),
    p = g.player,
    mw = g.area === "dungeon" ? 24 : 32,
    l = Math.max(0, Math.floor(p.x - w / s / 2) - 2),
    t = Math.max(0, Math.floor(p.y - h / s / 2) - 2),
    r = Math.min(mw, l + Math.ceil(w / s) + 5),
    b = Math.min(mw, t + Math.ceil(h / s) + 5),
    jumping = now < (g.jumpUntil || 0),
    lift = jumping
      ? Math.sin(
          Math.max(0, Math.min(1, (g.jumpUntil - now) / 520)) * Math.PI,
        ) *
        s *
        0.42
      : 0,
    dodging = now < (p.dodgeUntil || 0);
  ctx.save();
  ctx.translate(Math.round(w / 2 - p.x * s), Math.round(h / 2 - p.y * s));
  for (let y = t; y < b; y++)
    for (let x = l; x < r; x++)
      tile(ctx, g.map.tiles[y * mw + x], x, y, s, g.map.tiles, mw);
  for (const e of g.enemies)
    if (!e.dead && e.telegraph > 0) {
      const pulse = 0.65 + (0.9 - e.telegraph) * 0.2;
      ctx.fillStyle = "#873f4338";
      ctx.strokeStyle = "#bd8257bb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        (e.x + 0.5) * s,
        (e.y + 0.68) * s,
        s * pulse,
        s * pulse * 0.56,
        0,
        0,
        7,
      );
      ctx.fill();
      ctx.stroke();
    }
  if (dodging) {
    ctx.globalAlpha = 0.28;
    actor(
      ctx,
      p.x - (p.dodgeX || 0) * 0.32,
      p.y - (p.dodgeY || 0) * 0.32,
      s,
      "player",
      p.facing,
      0,
      "walk",
    );
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#9a8a6966";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(
      (p.x - (p.dodgeX || 0) * 0.7 + 0.5) * s,
      (p.y - (p.dodgeY || 0) * 0.7 + 0.75) * s,
    );
    ctx.lineTo((p.x + 0.5) * s, (p.y + 0.75) * s);
    ctx.stroke();
  }
  const draws = [];
  for (const o of g.map.objects)
    if (!(o.kind === "cache" && o.state === "hidden"))
      draws.push({
        y: o.y,
        fn: () => {
          if (o.kind === "wayfindingCue") waymark(ctx,o,s);
          else if (o.kind === "npc") {
            const n = g.save.consequences.npcs[o.id],
              cx = (o.x + 0.5) * s,
              cy = o.y * s;
            if (n?.status === "dead") {
              ctx.fillStyle = "#67574f";
              ctx.fillRect(cx - s * 0.3, cy + s * 0.55, s * 0.6, s * 0.16);
            } else {
              actor(ctx, o.x, o.y, s, o.kind, "down", 0, "idle");
              ctx.fillStyle =
                n?.disposition === "hostile" ? "#d9977a" : "#9cc8b5";
              ctx.beginPath();
              ctx.arc(cx, cy - 6, 3, 0, 7);
              ctx.fill();
            }
            ctx.textAlign = "center";
            ctx.font = "10px monospace";
            ctx.fillStyle = "#e2d5ba";
            ctx.fillText(
              o.name + (n?.status === "dead" ? " †" : ""),
              cx,
              cy - 15,
            );
            ctx.font = "8px monospace";
            ctx.fillStyle = "#a9b9ab";
            ctx.fillText(o.role, cx, cy - 27);
            ctx.textAlign = "start";
          } else if (o.kind === "shack" || o.kind === "architecturalBuilding") { /* roofs render after actors so exterior views conceal contents */ }
          else if (o.kind === "architecturalDistrict") { /* district title is carried by its buildings */ }
          else if (o.kind === "relayTerminal") {
            actor(ctx, o.x, o.y, s, "shrine");
            ctx.fillStyle = "#d2c090";
            ctx.font = "10px monospace";
            ctx.fillText("RELAY", o.x * s, (o.y - 0.3) * s);
          } else actor(ctx, o.x, o.y, s, o.kind, "down", 0, o.state || "idle");
        },
      });
  for (const e of g.enemies)
    if (!e.dead)
      draws.push({
        y: e.y,
        fn: () => {
          const f = e.ai?.facing || "down",
            q = e.recoil > 0 ? 0.12 : 0,
            ox = f === "left" ? q : f === "right" ? -q : 0,
            oy = f === "up" ? q : f === "down" ? -q : 0;
          if (e.hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = "#d9b38b";
            ctx.fillRect((e.x - 0.15) * s, (e.y - 0.1) * s, s * 0.8, s * 0.75);
            ctx.restore();
          }
          actor(
            ctx,
            e.x + ox,
            e.y + oy,
            s,
            e.kind,
            f,
            Math.floor(e.ai?.step || 0),
            e.telegraph > 0 ? "telegraph" : e.strike > 0 ? "attack" : "walk",
            e.boss,
          );
          if (e.strike > 0) {
            ctx.strokeStyle = "#c28152cc";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo((e.x + 0.5) * s, (e.y + 0.35) * s);
            const v = {
              left: [-0.8, 0],
              right: [0.8, 0],
              up: [0, -0.8],
              down: [0, 0.8],
            }[f];
            ctx.lineTo((e.x + 0.5 + v[0]) * s, (e.y + 0.35 + v[1]) * s);
            ctx.stroke();
          }
        },
      });
  draws.push({
    y: p.y,
    fn: () => {
      if (jumping) {
        ctx.fillStyle = "#05050477";
        ctx.beginPath();
        ctx.ellipse(
          (p.x + 0.5) * s,
          (p.y + 0.82) * s,
          s * 0.19,
          s * 0.055,
          0,
          0,
          7,
        );
        ctx.fill();
      }
      actor(
        ctx,
        p.x,
        p.y - lift / s,
        s,
        "player",
        p.facing,
        Math.floor(p.walkPhase || 0),
        now < (p.attackUntil || 0) ? "attack" : "walk",
      );
      if (now < (p.attackUntil || 0)) {
        const a = {
            right: 0,
            down: Math.PI / 2,
            left: Math.PI,
            up: -Math.PI / 2,
          }[p.facing],
          cx = (p.x + 0.5) * s,
          cy = (p.y + 0.35 - lift / s) * s,
          profile = g.attackProfile || { shape: "cone", range: 1.7, arc: 100 };
        ctx.strokeStyle = "#c6a36a";
        ctx.lineWidth = profile.shape === "thrust" ? 4 : 5;
        ctx.beginPath();
        if (profile.shape === "thrust") {
          ctx.moveTo(cx, cy);
          ctx.lineTo(
            cx + Math.cos(a) * s * profile.range,
            cy + Math.sin(a) * s * profile.range,
          );
        } else {
          const half = (profile.arc * Math.PI) / 360;
          ctx.arc(cx, cy, s * profile.range, a - half, a + half);
        }
        ctx.stroke();
        ctx.strokeStyle = "#3b2e23";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    },
  });
  draws.sort((a, b) => a.y - b.y);
  for (const d of draws) d.fn();
  for (const e of g.enemies)
    if (!e.dead) {
      ctx.fillStyle = "#211617";
      ctx.fillRect(e.x * s, (e.y - 0.1) * s, s, 3);
      ctx.fillStyle = "#9b4d50";
      ctx.fillRect(e.x * s, (e.y - 0.1) * s, (s * e.hp) / e.maxHp, 3);
    }
  for(const o of g.map.objects){if(o.kind==="shack")shack(ctx,o,s,p,g.map.tiles);else if(o.kind==="architecturalBuilding")architecturalBuilding(ctx,o,s,p,g.map.tiles)}
  const motion = now / 1000;
  for (const o of g.map.objects)
    if (["shrine", "checkpoint", "ruinMarker", "apertureMemory"].includes(o.kind)) {
      const cx = (o.x + 0.5) * s,
        cy = (o.y + 0.35) * s,
        spin = motion * 0.55 + ((o.x * 13 + o.y * 7) % 11);
      ctx.strokeStyle = o.kind === "apertureMemory" ? "#c49be0aa" : "#a8bda066";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.52, spin, spin + Math.PI * 1.25);
      ctx.stroke();
      ctx.fillStyle = "#d9d1b877";
      ctx.beginPath();
      ctx.arc(cx + Math.cos(spin) * s * 0.52, cy + Math.sin(spin) * s * 0.52, 2, 0, 7);
      ctx.fill();
    }
  ctx.restore();
  if(g.area==="overworld"&&g.map.weather==="rain"){
    ctx.strokeStyle="#9ec8d04d";ctx.lineWidth=1.4;ctx.beginPath();for(let i=0;i<34;i++){const x=((i*83+motion*210+g.rx*41)%(w+80))-40,y=((i*47+motion*330+g.ry*59)%(h+90))-45;ctx.moveTo(x,y);ctx.lineTo(x-8,y+19)}ctx.stroke();ctx.fillStyle="#1d3b4730";ctx.fillRect(0,0,w,h);
  }else if(g.area==="overworld"&&g.map.weather==="snow"){
    ctx.fillStyle="#dae2d78c";for(let i=0;i<28;i++){const x=((i*97+motion*(12+i%4)*3+g.rx*29)%(w+30))-15,y=((i*61+motion*(25+i%5)*4+g.ry*37)%(h+30))-15;ctx.beginPath();ctx.arc(x,y,1+(i%3)*.55,0,7);ctx.fill()}
  }else if(g.area==="overworld"&&g.map.weather==="sunbreak"){
    const glow=ctx.createLinearGradient(0,0,w*.8,h);glow.addColorStop(0,"#e7c87324");glow.addColorStop(.45,"#d8ad5220");glow.addColorStop(.7,"#0000");ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  }
  ctx.fillStyle = "#d8c9aa55";
  for (let i = 0; i < 16; i++) {
    const phase = motion * (8 + (i % 4) * 2) + i * 97 + g.rx * 31 + g.ry * 17,
      x = ((phase * 3.1) % (w + 80)) - 40,
      y = ((i * 73 + Math.sin(phase * 0.07) * 45) % (h + 60)) - 30;
    ctx.fillRect(x, y, i % 3 === 0 ? 3 : 2, 1);
  }
  ctx.fillStyle = "#5c4a3b0c";
  ctx.fillRect(0, 0, w, h);
  const v = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.26,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.7,
  );
  v.addColorStop(0, "#0000");
  v.addColorStop(1, "#080a0870");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#151411ee";
  ctx.fillRect(8, h - 34, 190, 24);
  ctx.fillStyle = "#cec7b6";
  ctx.font = "12px monospace";
  ctx.fillText(
    g.area === "overworld"
      ? `SECTION ${g.rx},${g.ry}`
      : g.map.name.toUpperCase(),
    16,
    h - 18,
  );
}
