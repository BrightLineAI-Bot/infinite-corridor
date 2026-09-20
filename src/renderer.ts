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
  deepFloor: ["#242b30", "#364149"],
  deepWall: ["#12171b", "#2c343b"],
  sealedGate: ["#482b31", "#7b454e"],
  river: ["#203f48", "#2b5962"],
  dungeonWater: ["#183b46", "#245763"],
  canyon: ["#171616", "#302721"],
  bridge: ["#67533d", "#856b4b"],
  logBridge: ["#5b442e", "#866847"],
  cityFloor: ["#45454a", "#57565b"],
  cityWall: ["#292a2d", "#59585c"],
  arcologyFloor: ["#293e43", "#3d5960"],
  arcologyWall: ["#1b2d32", "#49666b"],
  cloisterFloor: ["#493f43", "#665459"],
  cloisterWall: ["#2d272b", "#625158"],
  supplyCache: ["#765f3c", "#2b251d", "#d7b96f"],
};
function h(x, y) {
  return (Math.imul(x + 37, 73856093) ^ Math.imul(y + 19, 19349663)) >>> 0;
}
function tile(ctx, t, x, y, s, map, w, activeBuildingId=null) {
  const p = PAL[t.kind] || PAL.ash,
    d = Number.isFinite(t.detail) ? t.detail : h(x, y),
    px = x * s,
    py = y * s;
  ctx.fillStyle = p[d & 1];
  ctx.fillRect(px, py, s + 1, s + 1);
  if (t.kind === "river" || t.kind === "dungeonWater") {
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
  if (t.structure === "districtWall") {
    const colors={city:["#37383c","#77757b"],arcology:["#20373d","#66939a"],cloister:["#3b3036","#8a6d75"],fortress:["#332f2b","#947c64"]}[t.districtStyle]||["#333","#777"],sides=t.wallSides||[];
    if(activeBuildingId===t.buildingId){const thick=s*.22;ctx.fillStyle=PAL[t.kind.replace('Wall','Floor')]?.[0]||"#41413f";ctx.fillRect(px,py,s+1,s+1);ctx.fillStyle=colors[0];if(sides.includes("west"))ctx.fillRect(px,py,thick,s+1);if(sides.includes("east"))ctx.fillRect(px+s-thick,py,thick+1,s+1);if(sides.includes("north"))ctx.fillRect(px,py,s+1,thick);if(sides.includes("south"))ctx.fillRect(px,py+s-thick,s+1,thick+1);ctx.strokeStyle=colors[1]+"66";ctx.strokeRect(px+s*.04,py+s*.04,s*.92,s*.92);return}
    ctx.fillStyle=colors[0];ctx.fillRect(px,py,s+1,s+1);ctx.fillStyle=colors[1]+"33";ctx.fillRect(px,py+s*.12,s+1,s*.12);ctx.fillRect(px,py+s*.58,s+1,s*.1);ctx.strokeStyle="#d5c6a22d";ctx.lineWidth=1;for(let q=.33;q<1;q+=.34){ctx.beginPath();ctx.moveTo(px,py+s*q);ctx.lineTo(px+s,py+s*q);ctx.stroke()}for(let q=.25;q<1;q+=.5){const off=((y+Math.round(q*4))&1)*s*.25;ctx.beginPath();ctx.moveTo(px+s*q-off,py);ctx.lineTo(px+s*q-off,py+s);ctx.stroke()}ctx.strokeStyle="#080a0acc";ctx.lineWidth=2;if(sides.includes("west")){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+s);ctx.stroke()}if(sides.includes("east")){ctx.beginPath();ctx.moveTo(px+s,py);ctx.lineTo(px+s,py+s);ctx.stroke()}if(sides.includes("north")){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+s,py);ctx.stroke()}if(sides.includes("south")){ctx.beginPath();ctx.moveTo(px,py+s);ctx.lineTo(px+s,py+s);ctx.stroke()}return;
  }
  if (t.structure === "shackWall") {
    ctx.fillStyle = PAL[t.kind]?.[d & 1] || PAL.floor[d & 1];
    ctx.fillRect(px, py, s + 1, s + 1);
    if (activeBuildingId === t.buildingId) {
      const thick = s * .22, sides = t.wallSides || [];
      ctx.fillStyle = "#39342e";
      if (sides.includes("west")) ctx.fillRect(px, py, thick, s + 1);
      if (sides.includes("east")) ctx.fillRect(px + s - thick, py, thick + 1, s + 1);
      if (sides.includes("north")) ctx.fillRect(px, py, s + 1, thick);
      if (sides.includes("south")) ctx.fillRect(px, py + s - thick, s + 1, thick + 1);
      ctx.strokeStyle = "#87776288";
      ctx.lineWidth = 1;
      if (sides.includes("west")) { ctx.beginPath(); ctx.moveTo(px + thick, py); ctx.lineTo(px + thick, py + s); ctx.stroke(); }
      if (sides.includes("east")) { ctx.beginPath(); ctx.moveTo(px + s - thick, py); ctx.lineTo(px + s - thick, py + s); ctx.stroke(); }
      if (sides.includes("north")) { ctx.beginPath(); ctx.moveTo(px, py + thick); ctx.lineTo(px + s, py + thick); ctx.stroke(); }
      if (sides.includes("south")) { ctx.beginPath(); ctx.moveTo(px, py + s - thick); ctx.lineTo(px + s, py + s - thick); ctx.stroke(); }
    }
    return;
  }
  if (t.blocked) {
    if (t.structure === "shack") {
      const same=(dx,dy)=>map[(y+dy)*w+x+dx]?.buildingId===t.buildingId;
      if(activeBuildingId===t.buildingId){const thick=s*.48;ctx.fillStyle="#3b403d";ctx.fillRect(px,py,s+1,s+1);ctx.fillStyle="#39342e";if(!same(-1,0))ctx.fillRect(px,py,thick,s+1);if(!same(1,0))ctx.fillRect(px+s-thick,py,thick+1,s+1);if(!same(0,-1))ctx.fillRect(px,py,s+1,thick);if(!same(0,1))ctx.fillRect(px,py+s-thick,s+1,thick+1);ctx.strokeStyle="#87776288";ctx.lineWidth=1;if(!same(-1,0)||!same(1,0)){ctx.beginPath();ctx.moveTo(px+s*.25,py);ctx.lineTo(px+s*.25,py+s);ctx.stroke()}if(!same(0,-1)||!same(0,1)){ctx.beginPath();ctx.moveTo(px,py+s*.25);ctx.lineTo(px+s,py+s*.25);ctx.stroke()}return}
      ctx.fillStyle="#39342e";ctx.fillRect(px,py,s+1,s+1);ctx.strokeStyle="#87776288";ctx.lineWidth=1;for(let q=.28;q<1;q+=.28){ctx.beginPath();ctx.moveTo(px,py+s*q);ctx.lineTo(px+s,py+s*q);ctx.stroke()}for(let q=.22;q<1;q+=.44){const off=(y&1)*s*.22;ctx.beginPath();ctx.moveTo(px+s*q-off,py);ctx.lineTo(px+s*q-off,py+s);ctx.stroke()}ctx.strokeStyle="#171512";ctx.lineWidth=2;if(!same(-1,0)){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+s);ctx.stroke()}if(!same(1,0)){ctx.beginPath();ctx.moveTo(px+s,py);ctx.lineTo(px+s,py+s);ctx.stroke()}if(!same(0,-1)){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+s,py);ctx.stroke()}if(!same(0,1)){ctx.beginPath();ctx.moveTo(px,py+s);ctx.lineTo(px+s,py+s);ctx.stroke()}return;
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
  voidSentinel: ["#645375", "#282333", "#b896cf"],
  hollowMarshal: ["#78434a", "#332429", "#b99b68"],
  riftColossus: ["#713841", "#2b2022", "#c18352"],
  mossGrazer: ["#667052", "#303629", "#a3b978"],
  lanternDoe: ["#8b7654", "#39332a", "#e8c66d"],
  hushling: ["#76698c", "#282431", "#cab7df"],
  gateRevenant: ["#311b34", "#100d15", "#e14f72"],
  vesperwing:["#8b4b35","#251d1d","#ed8a45"],gravitantBell:["#54726e","#252b2a","#c0a66b"],mireApostle:["#71804d","#25291f","#b6d05c"],knifeChoir:["#675174","#211b29","#c28fe0"],
  npc: ["#9b815d", "#453832", "#879b8d"],
  shrine: ["#557b74", "#263c3b", "#b7c1aa"],
  checkpoint: ["#668b91", "#304448", "#c7b887"],
  door: ["#76533b", "#382b25", "#9d805d"],
  tree: ["#65513b", "#353229", "#596344"],
  treeShrub: ["#536044", "#30372c", "#77855d"],
  treeSpindle: ["#675642", "#312c27", "#6d7653"],
  rock: ["#666a65", "#343735", "#90948b"],
  dungeon: ["#62576b", "#332d39", "#63817a"],
  chest: ["#8d6938", "#443326", "#b7a06a"],
  exit: ["#53796c", "#293a35", "#9aac99"],
  ruinMarker: ["#806b52", "#433a31", "#b09b79"],
  bossCue: ["#873f43", "#391f24", "#bd8257"],
  cache: ["#9a8549", "#4a4229", "#c1ae72"],
  deepAnchor: ["#4c7b78", "#243c3c", "#b7ddd1"],
  deepMechanism: ["#806b48", "#3b3328", "#e0bd70"],
  sealedGate: ["#743f4a", "#2d2026", "#e07886"],
  storyGhost: ["#72668d", "#272332", "#d8c7ef"],
  storyActor: ["#6e7f91", "#222a33", "#d9e7ef"],
  storyScene: ["#8d5d4f", "#32221e", "#efb18f"],
  deepShortcut: ["#596d62", "#202923", "#9fd0ae"],
  deepPortal: ["#535384", "#20203a", "#bbb4ef"],
  deepTransition: ["#675c49", "#28241d", "#dbc18a"],
  storyRelic: ["#8c7650", "#382f24", "#f0cf83"],
  storyTone: ["#557d82", "#26383b", "#9fe6dd"],
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
  scale = 1,
  segments = 1,
  segmentSpacing = 0,
) {
  const p = COLORS[kind] || COLORS.ashling,
    k = x * s + s / 2,
    base = y * s + s * 0.82,
    bob = frame % 2,
    sc = Math.max(0.6, Number(scale) || (boss ? 1.45 : 1));
  if (kind !== "player") {
    if (segments > 1) {
      const [fx, fy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[facing] || [0, 1],
        px = -fy,
        py = fx;
      for (let i = segments - 1; i >= 1; i--) {
        const wave = Math.sin((frame + i) * 0.9) * 0.1,
          cx = k - fx * s * segmentSpacing * i + px * s * wave,
          cy = base - fy * s * segmentSpacing * i + py * s * wave - s * 0.25 * sc;
        ctx.fillStyle = p[i % 2];
        ctx.strokeStyle = p[2];
        ctx.lineWidth = Math.max(1, s * 0.035);
        ctx.beginPath();
        ctx.ellipse(cx, cy, s * 0.27 * sc, s * 0.19 * sc, Math.atan2(fy, fx), 0, 7);
        ctx.fill();
        ctx.stroke();
      }
    }
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
  if(kind==="voidSentinel" || kind==="gateRevenant"){
    ctx.lineCap="round";
    for(let i=0;i<7;i++){
      const side=i%2?-1:1,a=-Math.PI*.15+(i/6)*Math.PI*1.3,wave=Math.sin(Number(frame)*.18+i*1.7)*.18,len=(.48+(i%3)*.12)*s*sc;
      ctx.strokeStyle=i===0&&state==="attack"?"#ff6e89":p[i%2];ctx.lineWidth=Math.max(2,s*.07*sc);ctx.beginPath();ctx.moveTo(k,base-s*.38*sc);ctx.quadraticCurveTo(k+Math.cos(a+wave)*len*.55+side*s*.08,base-s*.38*sc+Math.sin(a+wave)*len*.45,k+Math.cos(a+wave)*len,base-s*.38*sc+Math.sin(a+wave)*len);ctx.stroke();
    }
  }
  if (kind === "player") {
    rect(p[1], -0.22, -0.57, 0.44, 0.5);
    rect(p[0], -0.18, -0.76, 0.36, 0.28);
    rect("#171817", -0.12, -0.69, 0.24, 0.14);
    rect(p[2], -0.07, -0.66, 0.04, 0.04);
    rect(p[2], 0.04, -0.66, 0.04, 0.04);
    rect("#24231f", -0.2, -0.08, 0.13, 0.12);
    rect("#24231f", 0.07, -0.08, 0.13, 0.12);
    rect(p[2], facing === "left" ? -0.38 : 0.2, -0.48, 0.18, 0.05);
  } else if(kind==='vesperwing'){rect(p[1],-.09,-.62,.18,.56);ctx.fillStyle=p[0];ctx.beginPath();ctx.moveTo(k-s*.08*sc,base-s*.5*sc);ctx.lineTo(k-s*.7*sc,base-s*.85*sc);ctx.lineTo(k-s*.48*sc,base-s*.22*sc);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(k+s*.08*sc,base-s*.5*sc);ctx.lineTo(k+s*.7*sc,base-s*.85*sc);ctx.lineTo(k+s*.48*sc,base-s*.22*sc);ctx.closePath();ctx.fill();rect(p[2],-.07,-.55,.14,.18)}
  else if(kind==='gravitantBell'){ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(k,base-s*.48*sc,s*.38*sc,s*.43*sc,0,0,7);ctx.fill();ctx.strokeStyle=p[2];ctx.stroke();for(let q=-2;q<=2;q++)rect(p[1],q*.12,-.18,.06,.28)}
  else if(kind==='mireApostle'){ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(k,base-s*.25*sc,s*.48*sc,s*.32*sc,0,0,7);ctx.fill();rect(p[0],-.32,-.65,.64,.44);rect(p[2],-.08,-.53,.16,.16)}
  else if(kind==='knifeChoir'){rect(p[1],-.2,-.72,.4,.68);for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.strokeStyle=p[0];ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(k,base-s*.4*sc);ctx.lineTo(k+Math.cos(a)*s*.55*sc,base-s*.4*sc+Math.sin(a)*s*.45*sc);ctx.stroke()}rect(p[2],-.08,-.62,.16,.14)}
  else if (kind === "glassMite") {
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
  } else if (kind === "voidSentinel") {
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(k,base-s*.42*sc,s*.3*sc,s*.36*sc,0,0,7);ctx.fill();ctx.strokeStyle=p[2];ctx.lineWidth=Math.max(2,s*.04);ctx.stroke();rect(p[0],-.2,-.66,.4,.22);rect(p[2],-.07,-.57,.14,.08);
  } else if (kind === "gateRevenant") {
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(k,base-s*.48*sc,s*.34*sc,s*.4*sc,0,0,7);ctx.fill();ctx.strokeStyle=p[2];ctx.lineWidth=Math.max(2,s*.045);ctx.stroke();rect(p[0],-.31,-.75,.62,.24);rect("#050308",-.17,-.67,.34,.13);rect(p[2],-.12,-.63,.06,.06);rect(p[2],.06,-.63,.06,.06);ctx.fillStyle=p[0];ctx.beginPath();ctx.moveTo(k-s*.25*sc,base-s*.62*sc);ctx.lineTo(k-s*.68*sc,base-s*.94*sc);ctx.lineTo(k-s*.5*sc,base-s*.36*sc);ctx.fill();ctx.beginPath();ctx.moveTo(k+s*.25*sc,base-s*.62*sc);ctx.lineTo(k+s*.68*sc,base-s*.94*sc);ctx.lineTo(k+s*.5*sc,base-s*.36*sc);ctx.fill();
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
  } else if (kind === "mossGrazer") {
    rect(p[1], -.34, -.35, .62, .28); rect(p[0], .16, -.52, .27, .25); rect(p[2], .33, -.45, .06, .06); rect(p[1], -.24, -.13, .07, .18); rect(p[1], .18, -.13, .07, .18);
  } else if (kind === "lanternDoe") {
    rect(p[1], -.28, -.39, .55, .3); rect(p[0], .12, -.62, .25, .28); rect(p[2], .25, -.55, .07, .07); rect(p[1], -.2, -.14, .06, .22); rect(p[1], .16, -.14, .06, .22); rect(p[2], .19, -.79, .04, .21); rect(p[2], .31, -.79, .04, .21);
  } else if (kind === "hushling") {
    ctx.fillStyle=p[2]+"55";ctx.beginPath();ctx.arc(k,base-s*.4*sc,s*.38*sc,0,7);ctx.fill();rect(p[1],-.18,-.55,.36,.4);rect(p[0],-.13,-.7,.26,.24);rect(p[2],-.05,-.62,.1,.08);
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
    if (kind === "tree" || kind === "treeShrub" || kind === "treeSpindle") {
      if(state === "fallen") { rect(p[1], -.43, -.18, .86, .16); rect(p[0], -.35, -.27, .28, .22); }
      else if(state === "charred") { rect("#29231f", -.09, -.75, .18, .72); rect("#3b2d25", -.3, -.78, .25, .16); }
      else if(kind === "treeShrub") { rect(p[1],-.07,-.35,.14,.31);rect(p[0],-.38,-.48,.34,.31);rect(p[0],.03,-.52,.38,.35);rect(p[2],-.18,-.65,.38,.25); }
      else if(kind === "treeSpindle") { rect(p[1],-.07,-.91,.14,.87);rect(p[0],-.31,-.73,.28,.1);rect(p[0],.03,-.55,.33,.09);rect(p[2],-.22,-1.03,.18,.25); }
      else { rect(p[1], -0.1, -0.82, 0.2, 0.8); rect(p[0], -0.38, -0.86, 0.76, 0.32); rect("#71845b", -.27, -1.02, .54, .22); }
    } else if (kind === "rock" && (state === "moved" || state === "broken")) {
      rect("#4f514d", -.32, -.2, .2, .12); rect("#73766f", -.04, -.16, .24, .1); rect("#3c3f3b", .2, -.12, .13, .08);
    } else if (kind === "checkpoint" || kind === "shrine") {
      rect(p[2], -0.05, -0.85, 0.1, 0.65);
      rect(p[0], -0.24, -0.34, 0.48, 0.18);
    } else if (kind === "door" || kind === "dungeon" || kind === "exit") {
      rect(p[0], -0.34, -0.82, 0.68, 0.82);
      rect("#171614", -0.23, -0.66, 0.46, 0.66);
    } else if (kind === "chest" || kind === "cache" || kind === "supplyCache") {
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
  ctx.fill();ctx.stroke();if(signalKind==='danger'){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(s*.25,0);ctx.lineTo(s*.07,-s*.09);ctx.lineTo(s*.07,s*.09);ctx.closePath();ctx.fill()}return c;
}
function waymark(ctx,o,s){
  const cx=(o.x+.5)*s,cy=(o.y+.55)*s,a=Math.atan2(o.dirY,o.dirX);ctx.save();ctx.translate(cx,cy);ctx.rotate(a);drawWaymarkIcon(ctx,o.signalKind,s);ctx.restore();
}
function shelterSigil(ctx,cx,cy,r,glyph){
  const kind=Math.abs(glyph||0)%4;ctx.beginPath();
  if(kind===0){ctx.arc(cx,cy,r,Math.PI*.25,Math.PI*1.75);ctx.moveTo(cx+r*.2,cy-r*.7);ctx.lineTo(cx+r*.72,cy)}
  else if(kind===1){ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r*.82,cy);ctx.lineTo(cx,cy+r);ctx.lineTo(cx-r*.82,cy);ctx.closePath();ctx.moveTo(cx,cy-r*.46);ctx.lineTo(cx+r*.36,cy);ctx.lineTo(cx,cy+r*.46)}
  else if(kind===2){ctx.moveTo(cx-r*.8,cy-r*.7);ctx.quadraticCurveTo(cx,cy-r*.08,cx+r*.8,cy-r*.7);ctx.moveTo(cx,cy-r*.08);ctx.lineTo(cx,cy+r);ctx.moveTo(cx-r*.55,cy+r*.48);ctx.quadraticCurveTo(cx,cy+r*.15,cx+r*.55,cy+r*.48)}
  else{for(let q=0;q<3;q++){const a=-Math.PI/2+q*Math.PI*2/3;ctx.moveTo(cx+Math.cos(a)*r+r*.18,cy+Math.sin(a)*r);ctx.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,r*.18,0,7)}ctx.moveTo(cx,cy-r*.34);ctx.lineTo(cx+r*.3,cy+r*.18);ctx.lineTo(cx-r*.3,cy+r*.18);ctx.closePath()}
  ctx.stroke();
}
function insideShelter(o,p,map){
  const b=o.bounds||{x:o.x-2,y:o.y-2,w:5,h:4},cx=p.x+.5,cy=p.y+.7,inset=.22;
  if(map){const t=map[Math.floor(cy)*32+Math.floor(cx)];return t?.buildingId===o.id&&t?.structure==='shackInterior'}
  return cx>b.x+inset&&cx<b.x+b.w-inset&&cy>b.y+inset&&cy<b.y+b.h-inset;
}
function shack(ctx,o,s,p,map){
  const b=o.bounds||{x:o.x-2,y:o.y-2,w:5,h:4},inside=insideShelter(o,p,map),x=b.x*s,y=b.y*s,w=b.w*s,h=b.h*s,accent={pilgrim:"#8f7658",relay:"#527d7b",chapel:"#806777",workshop:"#8c5944",stoneCottage:"#8b8170",ruinedKeep:"#9a8168",gatehouse:"#89765f",shrineHouse:"#706986",neonKiosk:"#42b8b2",relayBunker:"#4d8e9c",prismVault:"#a78cce",orbitalPod:"#7ea3bd",ribNest:"#9b647f",carapace:"#735e86"}[o.facadeStyle]||"#8f7658",condition=o.condition||"weathered",grain=(o.signGlyph||0)+b.x*3+b.y*5,masonry=['stoneCottage','ruinedKeep','gatehouse','shrineHouse'].includes(o.facadeStyle);
  ctx.save();
  const cells=o.footprint||[],set=new Set(cells.map(c=>`${c.x},${c.y}`));
  if(inside){ctx.strokeStyle=accent+"66";ctx.lineWidth=2;if(cells.length){for(const c of cells){if(!set.has(`${c.x-1},${c.y}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo(c.x*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x+1},${c.y}`)){ctx.beginPath();ctx.moveTo((c.x+1)*s,c.y*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x},${c.y-1}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo((c.x+1)*s,c.y*s);ctx.stroke()}if(!set.has(`${c.x},${c.y+1}`)){ctx.beginPath();ctx.moveTo(c.x*s,(c.y+1)*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}}}else ctx.strokeRect(x+s*.08,y+s*.08,w-s*.16,h-s*.16);ctx.restore();return}
  if(cells.length&&o.shape!=='rect'){
   const palette={timber:['#2b2822','#8f7658'],masonry:['#34332e','#8b8170'],ruinedGatehouse:['#302d29','#9a8168'],cyberRelay:['#152b31','#42b8b2'],alienGeometric:['#24243b','#a78cce'],biomechanical:['#30222d','#9b647f']}[o.family]||['#292720',accent];ctx.fillStyle=palette[0];ctx.beginPath();for(const c of cells)ctx.rect(c.x*s,c.y*s,s+1,s+1);ctx.fill();ctx.strokeStyle=palette[1];ctx.lineWidth=2;for(const c of cells){for(const [dx,dy,ax,ay,bx,by]of[[-1,0,0,0,0,1],[1,0,1,0,1,1],[0,-1,0,0,1,0],[0,1,0,1,1,1]])if(!set.has(`${c.x+dx},${c.y+dy}`)){ctx.beginPath();ctx.moveTo((c.x+ax)*s,(c.y+ay)*s);ctx.lineTo((c.x+bx)*s,(c.y+by)*s);ctx.stroke()}}
   ctx.globalAlpha=.38;for(const c of cells)if(((c.x*3+c.y+grain)&3)===0){ctx.fillStyle=o.family==='cyberRelay'?'#65fff0':o.family==='biomechanical'?'#ca6e9e':'#d7c79a';ctx.beginPath();ctx.arc((c.x+.5)*s,(c.y+.5)*s,s*(o.family==='biomechanical'?.22:.1),0,7);ctx.fill()}ctx.globalAlpha=1;const door=o.door||cells[cells.length-1];ctx.fillStyle='#090b0b';ctx.fillRect((door.x+.16)*s,(door.y+.08)*s,s*Math.max(.65,(door.width||1)-.32),s*.84);ctx.strokeStyle=accent;ctx.strokeRect((door.x+.16)*s,(door.y+.08)*s,s*Math.max(.65,(door.width||1)-.32),s*.84);ctx.fillStyle='#c8bda4';ctx.font=`${Math.max(8,s*.18)}px monospace`;ctx.textAlign='center';ctx.fillText(o.name.toUpperCase(),x+w/2,y-s*.12);ctx.textAlign='start';ctx.restore();return;
  }
  const backY=y+s*.16,frontY=y+h-s*3.12,skew=s*.38,wallTop=frontY+s*.18;ctx.fillStyle=masonry?(condition==="kept"?"#39372f":"#302f2a"):(condition==="kept"?"#302d27":"#282720");ctx.fillRect(x,wallTop,w,Math.max(0,y+h-wallTop));
  ctx.fillStyle=masonry?"#686052":"#3a362d";for(let q=wallTop-y+s*.08,n=0;q<h;q+=s*(masonry?.3:.45+((grain+n)%3)*.04),n++){const inset=((grain+n*7)%5)*s*.035;ctx.fillRect(x+inset,y+q,w-inset-s*((grain+n)%4===0?.12:0),s*(masonry?.07:.055+((grain+n)%2)*.035))}
  if(masonry){ctx.strokeStyle="#17181588";ctx.lineWidth=1;for(let yy=wallTop+s*.32,row=0;yy<y+h;yy+=s*.32,row++){ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+w,yy);ctx.stroke();for(let xx=x+s*(row%2?.5:1);xx<x+w;xx+=s){ctx.beginPath();ctx.moveTo(xx,yy-s*.32);ctx.lineTo(xx,yy);ctx.stroke()}}}
  ctx.strokeStyle=accent+"88";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+s*.08,wallTop);ctx.lineTo(x+s*.06,y+h-s*.08);ctx.moveTo(x+w-s*.07,wallTop);ctx.lineTo(x+w-s*.12,y+h-s*.06);ctx.stroke();
  ctx.fillStyle=o.roofProfile==="gable"?"#39342b":"#35312a";ctx.strokeStyle=accent+"88";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+s*.2,backY);ctx.lineTo(x+w-s*.2,backY);ctx.lineTo(x+w+skew,frontY);ctx.lineTo(x-skew,frontY);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle="#5a514188";ctx.lineWidth=1;for(let q=.18;q<1;q+=.16){const yy=backY+(frontY-backY)*q;ctx.beginPath();ctx.moveTo(x+s*.2-skew*q,yy);ctx.lineTo(x+w-s*.2+skew*q,yy);ctx.stroke()}
  if(o.roofProfile==="gable"){ctx.strokeStyle=accent+"99";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+w*.5,backY-s*.04);ctx.lineTo(x+w*.5,frontY+s*.04);ctx.stroke();ctx.fillStyle="#17171433";ctx.beginPath();ctx.moveTo(x+s*.2,backY);ctx.lineTo(x+w*.5,backY);ctx.lineTo(x+w*.5,frontY);ctx.lineTo(x-skew,frontY);ctx.closePath();ctx.fill()}
  if(o.roofProfile==="stepped"){ctx.fillStyle="#24211d";ctx.strokeStyle=accent+"77";ctx.lineWidth=2;ctx.fillRect(x+w*.3,y+(frontY-y)*.32,w*.4,s*.5);ctx.strokeRect(x+w*.3,y+(frontY-y)*.32,w*.4,s*.5)}
  if(o.facadeStyle==="ruinedKeep"||o.facadeStyle==="gatehouse"){ctx.fillStyle=accent+"cc";for(let q=0;q<5;q++)if(q!==2||o.facadeStyle==="gatehouse")ctx.fillRect(x+q*w/5,frontY-s*.18,w/10,s*.28)}
  ctx.fillStyle="#211f1b";ctx.strokeStyle=accent+"99";ctx.beginPath();ctx.moveTo(x-skew,frontY);ctx.lineTo(x+w+skew,frontY);ctx.lineTo(x+w+s*.12,frontY+s*.22);ctx.lineTo(x-s*.12,frontY+s*.22);ctx.closePath();ctx.fill();ctx.stroke();
  if(condition==="collapsed"){ctx.fillStyle="#10110f";ctx.beginPath();ctx.moveTo(x+w*.62,y+s*.56);ctx.lineTo(x+w*.74,y+s*.38);ctx.lineTo(x+w*.82,y+s*.82);ctx.lineTo(x+w*.68,y+s*1.08);ctx.closePath();ctx.fill()}
  const door=o.door||{x:b.x+Math.floor(b.w/2),y:b.y+b.h-1,width:1},doorWidth=Math.max(1,door.width||1),dx=(door.x+.15)*s,dy=(door.y+.05)*s,dw=(doorWidth-.3)*s;ctx.fillStyle="#0c0d0c";ctx.fillRect(dx,dy,dw,s*.95);ctx.strokeStyle=accent+"aa";ctx.lineWidth=2;ctx.strokeRect(dx,dy,dw,s*.95);
  const windows=Math.max(2,Math.floor(b.w/2));for(let q=0;q<windows;q++){const wx=x+s*.65+q*(w-s*1.3)/Math.max(1,windows-1);if(wx>(door.x-.15)*s&&wx<(door.x+doorWidth+.15)*s||condition==="collapsed"&&(q+grain)%3===0)continue;ctx.fillStyle=o.facadeStyle==="relay"?"#557f7b55":"#ad8b5d33";ctx.fillRect(wx-s*.28,y+h-s*.72,s*.56,s*.3);ctx.strokeStyle=accent+"77";ctx.strokeRect(wx-s*.28,y+h-s*.72,s*.56,s*.3);if(condition!=="kept"&&(q+grain)%2===0){ctx.beginPath();ctx.moveTo(wx-s*.32,y+h-s*.68);ctx.lineTo(wx+s*.31,y+h-s*.43);ctx.moveTo(wx+s*.3,y+h-s*.7);ctx.lineTo(wx-s*.3,y+h-s*.42);ctx.stroke()}}
  if(condition==="patched"||condition==="collapsed"){ctx.fillStyle="#4a4031aa";const px=x+w*(.2+Math.abs(grain%4)*.13);ctx.fillRect(px,y+h-s*1.42,s*.85,s*.68);ctx.strokeStyle="#74624c99";ctx.strokeRect(px,y+h-s*1.42,s*.85,s*.68)}
  if(condition!=="kept"){ctx.strokeStyle="#6c5b43aa";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+s*.18,y+h-s*.18);ctx.lineTo(x+s*1.22,wallTop+s*.12);if(condition==="collapsed"){ctx.moveTo(x+w-s*.22,y+h-s*.14);ctx.lineTo(x+w-s*1.35,wallTop)}ctx.stroke()}
  if(condition==="overgrown"){ctx.strokeStyle="#435a3f";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w-s*.18,y+h);ctx.quadraticCurveTo(x+w-s*.85,y+h*.62,x+w-s*.38,wallTop);ctx.quadraticCurveTo(x+w-s*.08,y+s*1.08,x+w-s*.55,y+s*.62);ctx.stroke()}
  ctx.strokeStyle=accent+"bb";ctx.lineWidth=2;shelterSigil(ctx,x+w*.5,frontY-s*.42,s*.16,o.signGlyph);ctx.fillStyle="#c8bda4";ctx.font=`${Math.max(8,s*.18)}px monospace`;ctx.textAlign="center";ctx.fillText(o.name.toUpperCase(),x+w/2,y-s*.12);ctx.textAlign="start";ctx.restore();
}
function architecturalBuilding(ctx,o,s,p,map){
  const b=o.bounds,mw=32,pt=map[Math.floor(p.y)*mw+Math.floor(p.x)],inside=pt?.buildingId===o.id&&pt?.structure==="districtInterior",colors={city:["#393a3f","#858188"],arcology:["#18333b","#58a0a6"],cloister:["#3b2d35","#9a737f"],fortress:["#302b27","#9b8268"]}[o.districtStyle]||["#333","#888"],accent={copper:"#b37954",ivory:"#d5c8a7",oxide:"#9a6457",violet:"#9278a8"}[o.accent]||colors[1],cells=o.footprint||[],set=new Set(cells.map(q=>`${q.x},${q.y}`));
  ctx.save();if(inside){ctx.strokeStyle=accent+"77";ctx.lineWidth=2;for(const c of cells){if(!set.has(`${c.x-1},${c.y}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo(c.x*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x+1},${c.y}`)){ctx.beginPath();ctx.moveTo((c.x+1)*s,c.y*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x},${c.y-1}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo((c.x+1)*s,c.y*s);ctx.stroke()}if(!set.has(`${c.x},${c.y+1}`)){ctx.beginPath();ctx.moveTo(c.x*s,(c.y+1)*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}}ctx.restore();return}
  ctx.fillStyle=colors[0];ctx.beginPath();for(const c of cells)ctx.rect(c.x*s,c.y*s,s+1,s+1);ctx.fill();ctx.globalAlpha=.28;ctx.fillStyle=colors[1];for(const c of cells)if(((c.x+c.y+o.signGlyph)&3)===0)ctx.fillRect(c.x*s+s*.12,c.y*s+s*.12,s*.76,s*.12);ctx.globalAlpha=1;
  const x=b.x*s,y=b.y*s,w=b.w*s,h=b.h*s;ctx.strokeStyle=accent;ctx.lineWidth=3;for(const c of cells){if(!set.has(`${c.x-1},${c.y}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo(c.x*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x+1},${c.y}`)){ctx.beginPath();ctx.moveTo((c.x+1)*s,c.y*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x},${c.y-1}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo((c.x+1)*s,c.y*s);ctx.stroke()}if(!set.has(`${c.x},${c.y+1}`)){ctx.beginPath();ctx.moveTo(c.x*s,(c.y+1)*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}}if((o.shape==='rect'||o.shape==='keep')&&(o.roofProfile==='gable'||o.roofProfile==='spire')){ctx.beginPath();ctx.moveTo(x+s*.18,y+h*.48);ctx.lineTo(x+w*.5,y+(o.roofProfile==='spire'?s*.12:h*.2));ctx.lineTo(x+w-s*.18,y+h*.48);ctx.stroke()}else if(o.districtStyle==='fortress'){ctx.fillStyle=accent+"bb";for(const c of cells)if(!set.has(`${c.x},${c.y-1}`)&&(c.x+c.y)%2===0)ctx.fillRect(c.x*s+s*.12,c.y*s-s*.12,s*.42,s*.3)}else{ctx.strokeStyle=accent+"66";ctx.lineWidth=1;for(const c of cells)if(!set.has(`${c.x},${c.y-1}`)){ctx.beginPath();ctx.moveTo(c.x*s+s*.12,c.y*s+s*.25);ctx.lineTo((c.x+1)*s-s*.12,c.y*s+s*.25);ctx.stroke()}}
  const doorX=(o.door.x+.12)*s,doorY=(o.door.y+.05)*s;ctx.fillStyle="#090b0b";ctx.fillRect(doorX,doorY,s*.76,s*.9);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.strokeRect(doorX,doorY,s*.76,s*.9);const frontTileY=o.door.side==='north'?b.y:b.y+b.h-1,frontY=o.door.side==='north'?y+s*.32:y+h-s*.58,step=o.facadeRhythm==='narrow'?1:o.facadeRhythm==='broad'?3:2;ctx.fillStyle=accent+"bb";for(let q=1;q<b.w-1;q+=step)if(set.has(`${b.x+q},${frontTileY}`)&&Math.abs(b.x+q-o.door.x)>1)ctx.fillRect(x+q*s+s*.18,frontY,s*.5,s*.2);
  ctx.fillStyle=accent;ctx.beginPath();const gx=(o.door.x+.5)*s,gy=o.door.side==='north'?doorY+s*1.18:doorY-s*.28,r=s*.18;for(let q=0;q<4;q++){const a=(o.signGlyph+q)*Math.PI/2,px=gx+Math.cos(a)*r,py=gy+Math.sin(a)*r;q?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.stroke();ctx.fillStyle="#dfd4b2";ctx.font=`${Math.max(8,s*.2)}px monospace`;ctx.textAlign="center";ctx.fillText(o.name.toUpperCase(),x+w/2,y-s*.2);ctx.textAlign="start";ctx.restore();
}
export function render(ctx, g, w, h, now) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#141816";
  ctx.fillRect(0, 0, w, h);
  const s = Math.max(28, Math.min(44, w / 12)),
    p = g.player,
    mw = Math.max(1,Number(g.map?.width)||(g.area === "dungeon" ? 24 : 32)),
    mh = Math.max(1,Number(g.map?.height)||Math.floor(g.map.tiles.length/mw)),
    l = Math.max(0, Math.floor(p.x - w / s / 2) - 2),
    t = Math.max(0, Math.floor(p.y - h / s / 2) - 2),
    r = Math.min(mw, l + Math.ceil(w / s) + 5),
    b = Math.min(mh, t + Math.ceil(h / s) + 5),
    jumping = now < (g.jumpUntil || 0),
    lift = jumping
      ? Math.sin(
          Math.max(0, Math.min(1, (g.jumpUntil - now) / 520)) * Math.PI,
        ) *
        s *
        0.42
      : 0,
    dodging = now < (p.dodgeUntil || 0);
  const activeShelter=g.map.objects.find(o=>o.kind==="shack"&&insideShelter(o,p,g.map.tiles)),
    playerTile=g.map.tiles[Math.floor(p.y)*mw+Math.floor(p.x)],
    activeBuildingId=activeShelter?.id||(String(playerTile?.structure||"").startsWith("district")?playerTile.buildingId:null);
  ctx.save();
  ctx.translate(Math.round(w / 2 - p.x * s), Math.round(h / 2 - p.y * s));
  for (let y = t; y < b; y++)
    for (let x = l; x < r; x++)
      tile(ctx, g.map.tiles[y * mw + x], x, y, s, g.map.tiles, mw,activeBuildingId);
  for(const h of g.eliteHazards||[]){ctx.fillStyle="#81994a55";ctx.strokeStyle="#b7ce6877";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse((h.x+.5)*s,(h.y+.65)*s,h.radius*s,h.radius*s*.55,0,0,7);ctx.fill();ctx.stroke()}
  for(const e of g.enemies)if(!e.dead&&e.eliteWindup>0){ctx.strokeStyle=e.kind==='gravitantBell'?"#8bb8bdcc":"#c6885ccc";ctx.lineWidth=3;ctx.setLineDash([8,6]);ctx.beginPath();ctx.arc((e.x+.5)*s,(e.y+.4)*s,(e.kind==='gravitantBell'?6:2.3)*s,0,7);ctx.stroke();ctx.setLineDash([])}
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
    if (!(o.kind === "cache" && o.state === "hidden")&&!(o.kind==="displacementTrap"&&o.state!=="used"))
      draws.push({
        y: o.y,
        fn: () => {
          if (o.kind === "wayfindingCue") waymark(ctx,o,s);
          else if(o.kind==="shelterHazard"){const cx=(o.x+.5)*s,cy=(o.y+.5)*s;ctx.strokeStyle=o.state==='armed'?'#d68b58aa':'#6e665c77';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,s*.28,0,7);ctx.moveTo(cx-s*.2,cy);ctx.lineTo(cx+s*.2,cy);ctx.moveTo(cx,cy-s*.2);ctx.lineTo(cx,cy+s*.2);ctx.stroke()}
          else if(o.kind==="displacementTrap"){const cx=(o.x+.5)*s,cy=(o.y+.5)*s;ctx.strokeStyle='#806d8b66';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,cy,s*.22,.3,5.5);ctx.stroke()}
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
          } else {const kind=o.kind==="tree"&&o.vegetationForm==="shrub"?"treeShrub":o.kind==="tree"&&o.vegetationForm==="spindle"?"treeSpindle":o.kind;actor(ctx,o.x,o.y,s,kind,"down",0,o.state||"idle",false,o.scale||1);}
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
            const flashScale = Math.max(.7,Number(e.scale)||1);
            ctx.fillRect((e.x + .5 - .4*flashScale) * s, (e.y + .45 - .42*flashScale) * s, s * .8*flashScale, s * .75*flashScale);
            ctx.restore();
          }
          actor(
            ctx,
            e.x + ox,
            e.y + oy,
            s,
            e.kind,
            f,
            e.kind==="voidSentinel"?now/180:Math.floor(e.ai?.step || 0),
            e.telegraph > 0 ? "telegraph" : e.strike > 0 ? "attack" : "walk",
            e.boss,
            e.scale,
            e.segments,
            e.segmentSpacing,
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
    if (!e.dead && !e.ambient) {
      ctx.fillStyle = "#211617";
      ctx.fillRect(e.x * s, (e.y - 0.1) * s, s, 3);
      ctx.fillStyle = "#9b4d50";
      ctx.fillRect(e.x * s, (e.y - 0.1) * s, (s * e.hp) / e.maxHp, 3);
    }
  for(const o of g.map.objects){if(o.kind==="shack")shack(ctx,o,s,p,g.map.tiles);else if(o.kind==="architecturalBuilding")architecturalBuilding(ctx,o,s,p,g.map.tiles)}
  const frontShelter=g.map.objects.find(o=>o.kind==="shack"&&p.x>=o.bounds.x-.6&&p.x<=o.bounds.x+o.bounds.w-.4&&p.y>=o.bounds.y+o.bounds.h-1&&p.y<=o.bounds.y+o.bounds.h+1.35);
  if(frontShelter)actor(ctx,p.x,p.y-lift/s,s,"player",p.facing,Math.floor(p.walkPhase||0),now<(p.attackUntil||0)?"attack":"walk");
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
