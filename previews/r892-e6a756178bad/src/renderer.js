import { drawRealmTile, drawRealmCosmos, drawRealmObject } from "./seed-realm-render.js?v=r892-e6a756178bad"; // seed realms
import { biomechanicalKeep } from "./close-view-room-routing.js?v=r892-e6a756178bad";
import { PENTAGON_MURALS } from "./pentagon-halls.js?v=r892-e6a756178bad"; // release 795: the grand halls' murals, drawn small
import { FAR_FOLK } from "./far-realms.js?v=r892-e6a756178bad";
import { astralBeamAnchors } from "./astral-worm.js?v=r892-e6a756178bad";
import { astralMountPresentation } from "./astral-worm-mount.js?v=r892-e6a756178bad";
import { knockdownPose, drawShockSparks } from "./lightning-giant-render.js?v=r892-e6a756178bad";
import { playerFormPresentation } from './close-view-player-presentation.js?v=r892-e6a756178bad';
import { enemyMeleeGeometry, MELEE_PATTERNS } from "./combat.js?v=r892-e6a756178bad";
import { enemyPatternWindup } from "./enemy-patterns.js?v=r892-e6a756178bad";
import { ruleRows } from "./elders.js?v=r892-e6a756178bad";
import { SEA_CREATURES } from "./sea-creatures.js?v=r892-e6a756178bad";
import { BOAT } from "./boats.js?v=r892-e6a756178bad";
import { MECH, DRONE, DRONE_FIZZLE } from "./vehicle-gates.js?v=r892-e6a756178bad";
import { isMarineTile } from "./world-beasts.js?v=r892-e6a756178bad";
import { jumpLift, JUMP, STARFIELD_PLATFORMS, platformPos, PRIMARY_ECHO_VISUAL } from "./game.js?v=r892-e6a756178bad"; // 613: Starfield rafts
import { SEASONS, treeSeason } from "./seasons.js?v=r892-e6a756178bad";
import { setTreeSeason } from "./landscape-render.js?v=r892-e6a756178bad";
import { drawLandscapeTile, setLandscapeClock, drawTraversalCues, drawHazardBrinks, levelName, setLandscapeStaticPass, landscapeTileAnimated, animateLandscapeTiles, landscapeTileLift, watcherSigil, drawCanopyBehindTrunk, drawCanopyAboveCrown } from "./landscape-render.js?v=r892-e6a756178bad";
import { elevationAt, LETHAL_KINDS } from "./landscape.js?v=r892-e6a756178bad";
import { interiorTerrain, interiorSurfaceLevel, liftAt, tileUnder, LIFT_PER_LEVEL, CANOPY_LIFT, tileLiftScale } from "./landscape.js?v=r892-e6a756178bad";
import { TREES } from "./trees.js?v=r892-e6a756178bad";
import { AFFIXES, dronePos, affixNames } from "./affixes.js?v=r892-e6a756178bad";
import { actorPresentation, playerDroneVisualAnchor } from "./actor-presentation.js?v=r892-e6a756178bad";
import { KIT_MOVES } from "./boss-kit.js?v=r892-e6a756178bad";
import { SKY_DISCS, SEEDS } from "./skylands.js?v=r892-e6a756178bad"; // release 587; travel seeds
import { drawPackMonster, drawPackTelegraphs, drawPackEffects, crystalFlightLift, drawMorphEffects, drawTurtleShell, drawGloomDark, drawGloomVeiled, drawDazed, drawNativePackEffects, drawNativePackFloor, hasNativePackEffects } from "./monster-render.js?v=r892-e6a756178bad";
import { TURTLE_SHELL } from "./turtle-shell.js?v=r892-e6a756178bad"; // the Mountain Turtle's shell
import { drawStalker, drawStalkerMarks, drawStalkerMarker } from "./stalker-render.js?v=r892-e6a756178bad"; // release 678
import { drawStillworksTile, drawStillworksObject, drawStillworksBeyond, drawStillworksLight } from "./pentagon-arena-render.js?v=r892-e6a756178bad"; // the Pentagon's finale arena, the Stillworks
import { penSide } from "./building.js?v=r892-e6a756178bad"; // release 748: pens sized for the beast
import { drawMount, drawMountFront } from "./beast-mounts-render.js?v=r892-e6a756178bad"; // release 748: the Wayfarer riding
import { GATE_REVENANT, DANGER, BOSS_PACE, bossPaced } from "./monster-pack.js?v=r892-e6a756178bad";
import { drawRelayNode } from "./relay-network.js?v=r892-e6a756178bad";
import { structureOccupancy } from "./world.js?v=r892-e6a756178bad";
import { dungeonPointDiscovered, dungeonTileVisibility, DUNGEON_CHUNK_SIZE } from "./dungeon-framework.js?v=r892-e6a756178bad";
import { LANTERN, LANTERN_STOPS, lanternShines } from "./spell-slots.js?v=r892-e6a756178bad"; // the Lantern: its light over the dark (below, marked LANTERN)
import { HOLE_DROPS, holeDrops, LAB_FOG, labFogOf, labFogLook, labFogTile, labFogAt, labFogState, ROOM_VIEW, roomViewBelow } from "./labyrinths.js?v=r892-e6a756178bad";
import { closeViewFrame, closeViewCapturing, closeViewTake, closeViewBareFloor, closeViewWorldCapture, CLOSE_VIEW_HOOKS, closeViewDoorTorchPosition, drawCloseViewLightsStd } from "./close-view.js?v=r892-e6a756178bad"; // Close View: three hooks below, marked CLOSE VIEW

// Native bodies retain their semantic decorations. These callbacks are used only by the GPU capture;
// the ordinary renderer's complete closure below is unchanged. Floor geometry never becomes a standing card.
export function nativeWindupDuration(e) {
  if (!actorPresentation(e)?.decoration || !(e.telegraph > 0)) return null;
  if (e.meleePhase?.stage === 1) return .42;
  const pattern = MELEE_PATTERNS[e.meleePhase?.id], phase = e.boss && e.hp <= e.maxHp * .5 ? .82 : 1;
  let duration = Math.max(.48, e.minimumAttackWindup || 0, (pattern?.telegraph || enemyPatternWindup(e)) * (e.telegraphScale || 1) * phase) * (bossPaced(e) ? BOSS_PACE.windup : 1);
  if (!pattern && e.range >= 2.5 && !e.instantStrike) duration = Math.max(duration, enemyPatternWindup(e));
  return duration;
}
export function nativeActionShape(e) { return e.telegraph > 0 ? MELEE_PATTERNS[e.meleePhase?.id]?.shape || null : e.strikeGeometry?.kind || null; }
// Native player bodies replace only the body. These existing state-owned cues remain in the residual atlas.
export function drawNativePlayerDecorations(ctx, g, s, now) {
  const p=g.player,form=playerFormPresentation(g),quiet=!!(g.presentation?.reduceMotion||g.presentation?.safeMode),t=quiet?0:now;
  const x=(p.x+.5)*s,foot=(p.y+.82)*s;
  ctx.save();
  if(now<(p.stunnedUntil||0))drawShockSparks(ctx,x,(p.y+.9)*s,s,t);
  if(form?.mech){
    const m=g.save.mech;
    if(form.empowered){const r=s*(.72+.05*Math.sin(t/140)),glow=ctx.createRadialGradient(x,foot-.27*s,r*.2,x,foot-.27*s,r);glow.addColorStop(0,'#ffb05a55');glow.addColorStop(1,'#ff5a1f00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,foot-.27*s,r,0,Math.PI*2);ctx.fill();}
    if(g.mechBoosting===true){
      for(const side of [-1,1]){const jx=x+side*s*.17,top=foot-s*.06,len=s*(.24+(quiet?0:.04*Math.sin(t/70+side))),jet=ctx.createLinearGradient(jx,top,jx,top+len);jet.addColorStop(0,'#e8f6ff');jet.addColorStop(.35,'#7fb9d8aa');jet.addColorStop(1,'#4a7fa000');ctx.fillStyle=jet;ctx.beginPath();ctx.moveTo(jx-s*.035,top);ctx.lineTo(jx+s*.035,top);ctx.lineTo(jx,top+len);ctx.closePath();ctx.fill();}
    }
    // Gauges stay below the feet at the pre-boost height, as in the ordinary player closure.
    const bx=(p.x+.08)*s,by=(p.y+1.1+form.lift)*s,bw=s*.84,bh=Math.max(3,s*.08);
    ctx.fillStyle='#0b1218cc';ctx.fillRect(bx-1,by-1,bw+2,bh*2+3);
    ctx.fillStyle='#d8dee5';ctx.fillRect(bx,by,bw*Math.max(0,Math.min(1,m.plate/MECH.plate)),bh);
    ctx.fillStyle='#5fc6e0';ctx.fillRect(bx,by+bh+1,bw*Math.max(0,Math.min(1,m.fuel/(MECH.boost*(m.empowered?2:1)))),bh);
    if(form.empowered){ctx.fillStyle='#ff8a3d';ctx.fillRect(bx,by+bh*2+2,bw,Math.max(2,bh*.6));}
  }
  if(g.droneUp?.()&&g.droneAt){const m=g.save.mech,bx=(p.x+.08)*s,by=(p.y+1.1)*s,bw=s*.84,bh=Math.max(3,s*.08);ctx.fillStyle='#0b1218cc';ctx.fillRect(bx-1,by-1,bw+2,bh*2+3);ctx.fillStyle='#5fc6e0';ctx.fillRect(bx,by,bw*Math.max(0,Math.min(1,m.fuel/DRONE.carry)),bh);ctx.fillStyle=m.healCd>0?'#3f7f52':'#7dff9a';ctx.fillRect(bx,by+bh+1,bw*Math.max(0,Math.min(1,1-(m.healCd||0)/DRONE.healCooldown)),bh);}
  ctx.restore();
}
const ELDER_ROWS = new WeakMap();
function elderRuleRows(o){let rows=o.rows||ELDER_ROWS.get(o);if(!rows){rows=Array.from({length:16},(_,k)=>ruleRows(o.rule,33,26,Math.floor((o.phase||.5)*1e6)+7+k*7919).map(r=>r.slice(12,21))).flat();ELDER_ROWS.set(o,rows);}return rows;}
const RECITER_NATIVE_LOOKS = new Set(['pilgrim','mercenary','minstrel','scholar','traveler','cartographer']);
function hueRGB(h,s,l){h=((h%360)+360)%360/360;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h*12)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))));};return (f(0)<<16)|(f(8)<<8)|f(4);}
export function nativeTraveler(o,now,quiet){
  if(o?.kind!=='traveler'||o.mount||o.folkGiant||o.customArt)return null;
  const facing={up:-Math.PI/2,down:Math.PI/2,left:Math.PI,right:0}[o.facing];
  if(o.elder===true&&Number.isInteger(o.rule)&&o.rule>=0&&o.rule<=255){const hue=(o.rule*137.508)%360;return {kind:'elderWanderer',yaw:facing,paletteMap:{[0x17101d]:hueRGB(hue,.4,.08),[0x342b38]:hueRGB(hue,.25,.22),[0xe8e5dc]:hueRGB(hue,.3,.88)},pose:o.state==='walking'?undefined:'idle',pace:o.state==='walking'?undefined:0};}
  if(o.reciter&&RECITER_NATIVE_LOOKS.has(o.look)){const colors=COLORS[o.look].map(c=>Number.parseInt(c.slice(1),16));return {kind:'dungeonReciter:'+o.look,yaw:facing,paletteMap:{[0x5f6f92]:colors[0],[0x2f3550]:colors[1],[0xc9cfe6]:colors[2]},pose:o.state==='walking'?undefined:'idle',pace:o.state==='walking'?undefined:0};}
  return null;
}
export function drawNativeTravelerDetails(ctx,o,s,now,quiet=false){
  if(!o.elder)return;
  const hue=(o.rule*137.508)%360,T=(quiet?0:now/1000)+(o.phase||0)*10,cx=(o.x+.5)*s,foot=(o.y+.82)*s,H=s*2.2,bodyW=s*.5,bodyTop=foot-H,bodyBot=foot-H*.42;
  const rows=elderRuleRows(o);
  const cols=9,rowsShown=15,cw=bodyW/cols,ch=(bodyBot-bodyTop)/rowsShown,scroll=(T*2.2)%(rows.length-rowsShown),top=Math.floor(scroll);
  ctx.save();ctx.beginPath();ctx.moveTo(cx-bodyW/2,bodyBot);ctx.lineTo(cx-bodyW/2,bodyTop+bodyW*.4);ctx.quadraticCurveTo(cx,bodyTop-bodyW*.2,cx+bodyW/2,bodyTop+bodyW*.4);ctx.lineTo(cx+bodyW/2,bodyBot);ctx.closePath();ctx.clip();
  ctx.fillStyle=`hsl(${hue},85%,64%)`;
  for(let y=0;y<=rowsShown;y++){const row=rows[(top+y)%rows.length];for(let x=0;x<cols;x++)if(row[x])ctx.fillRect(cx-bodyW/2+x*cw+cw*.1,bodyBot-(y+1-(scroll-top))*ch+ch*.1,cw*.8,ch*.8);}
  ctx.restore();
  const hy=foot-s*2.52,halo=ctx.createRadialGradient(cx,hy,0,cx,hy,s*.45);halo.addColorStop(0,`hsla(${hue},90%,80%,.45)`);halo.addColorStop(1,`hsla(${hue},90%,80%,0)`);ctx.fillStyle=halo;ctx.fillRect(cx-s*.45,hy-s*.45,s*.9,s*.9);
}
export function drawNativeCreatureFloor(ctx, g, e, s, now) {
  const p = actorPresentation(e); if (!p || e.gloomVeil || e.dead) return;
  const quiet = !!(g.presentation?.reduceMotion || g.presentation?.safeMode), t = quiet ? 0 : now / 1000;
  if (e.hidden) { drawNativePackFloor(ctx, e, s, now, quiet); return; }
  const x = (e.x + .5) * s, y = (e.y + .82) * s, radius = Number(e.bodyRadius) || .4;
  ctx.save(); ctx.globalAlpha = p.alpha;
  const ring = (r, color, width) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); };
  if (e.fracRank) ring(s * (.42 + radius * .6), e.fracRank === 'rare' ? '#ffc446cc' : '#6eaaffbb', Math.max(2, s * .07));
  if (e.fracWarden) { const r = s * (.5 + radius * .7); ctx.strokeStyle = '#ff4678cc'; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath();
    for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2 + t * .4, rr = r * (i % 2 ? .82 : 1.08); ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.stroke(); }
  if (e.fracShaman) {
    for (const k of [0, 1]) { const f = (t * .8 + k * .5) % 1; ctx.globalAlpha = p.alpha * (1 - f); ring(s * (.8 + f * .9), '#be78ffcc', Math.max(2, s * .07)); }
    ctx.globalAlpha = p.alpha * .35; ctx.strokeStyle = '#be78ff'; ctx.lineWidth = Math.max(2, s * .07);
    let links = 0; for (const m of g.enemies) { if (links >= 20) break; if (m.dead || m.hidden || m.gloomVeil || m.wardBy !== e.id || !m.warded || !shownInDungeon(g, m)) continue;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo((m.x + .5) * s, (m.y + .82) * s); ctx.stroke(); links++; }
  }
  if (p.stagger) drawDazed(ctx, e, s, quiet ? 0 : now, p.stagger, 'floor');
  ctx.restore();
}
export function drawNativeCreatureDecorations(ctx, e, s, now, presentation) {
  const p = actorPresentation(e); if (!p || e.hidden || e.gloomVeil || e.dead) return;
  const quiet = !!(presentation?.reduceMotion || presentation?.safeMode), x = (e.x + .5) * s, foot = (e.y + .82) * s;
  ctx.save(); ctx.globalAlpha = p.alpha; ctx.textAlign = 'center'; ctx.lineWidth = 3;
  drawNativePackEffects(ctx, e, s, now, presentation || {}, p);
  let labelY = foot - (p.head + .15) * s;
  const label = (text, color, font) => { ctx.font = font; ctx.strokeStyle = '#000b'; ctx.fillStyle = color; ctx.strokeText(text, x, labelY, s * 1.95 * p.scale); ctx.fillText(text, x, labelY, s * 1.95 * p.scale); labelY -= s * .26 * p.scale; };
  if (e.fracRank === 'rare' && e.packName) label(e.packName, '#ffd77a', `bold ${Math.max(10, s * .3)}px serif`);
  if (e.fracWarden) label('Fracture Warden', '#ff8fb0', `bold ${Math.max(10, s * .3)}px serif`);
  const names = affixNames(e); if (names.length) label(names.join(' · '), '#ffe2b0', `${Math.max(9, s * .24)}px sans-serif`);
  if (e.warded) { ctx.strokeStyle = '#b48cffcc'; ctx.lineWidth = Math.max(2, s * .05); ctx.beginPath(); ctx.ellipse(x, foot - (p.bodyLift + (p.head - p.bodyLift) * .45) * s, s * (.55 + (e.bodyRadius || .4) * .5), s * (p.head - p.bodyLift) * .65, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (p.stagger) drawDazed(ctx, e, s, quiet ? 0 : now, p.stagger, 'body', p.head + .1);
  ctx.restore();
}

// Release 159: the tile size is a whole number of pixels everywhere it is computed (renderer, combat visuals, main),
// so cached tile textures and the ground image blit 1:1 instead of being resampled every frame.
export function cameraTransform(
  g,
  w,
  h,
  tileSize = Math.round(Math.max(28, Math.min(44, w / 12))),
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
export function renderScaleForViewport(width, height, deviceScale = 1, quality = "balanced") {
  if (quality === "low") return 1;
  return Math.min(Math.max(1, Number(deviceScale) || 1), 2);
}
export function presentationBudget(presentation = {}, area = "overworld") {
  const quality = ["low", "balanced", "full"].includes(presentation.effectiveQuality) ? presentation.effectiveQuality : "balanced";
  return { quality, weather: area === "overworld" && presentation.weather !== false && quality !== "low", ambientMotes: quality === "full" ? 16 : quality === "balanced" ? 6 : 0 };
}
export function visibleInCamera(o, left, top, right, bottom, padding = 2) {
  if (!o) return false;
  const b = o.bounds;
  if (b)
    return b.x + b.w >= left - padding && b.x <= right + padding &&
      b.y + b.h >= top - padding && b.y <= bottom + padding;
  return Number(o.x) >= left - padding && Number(o.x) <= right + padding &&
    Number(o.y) >= top - padding && Number(o.y) <= bottom + padding;
}
// Release 409 (Tim: "the white cracked area [after the Supernova]... overlays enemies and the Void Walker himself, so I can't
// see him... the characters and all enemies should still be visible"): ground the Supernova has scarred counts as seen, and
// a world beast is always drawn, so nothing fights unseen inside the white.
const scarredAt=(g,point)=>{const w=g.map?.width||32,t=g.map?.tiles?.[Math.floor(Number(point?.y)+.5)*w+Math.floor(Number(point?.x)+.5)];return !!t?.voidScar};
const discoveredInDungeon=(g,point)=>g.area!=="dungeon"||!!point?.worldBeast||scarredAt(g,point)||dungeonPointDiscovered(g.map,point);
// LAB_FOG (labyrinths.ts): in a labyrinth chamber an object shows on a tile seen (now or before); everywhere else this is discoveredInDungeon.
export const seenInDungeon=(g,o)=>discoveredInDungeon(g,o)&&(g.area!=="dungeon"||!!o?.worldBeast||labFogState(g.map,o?.x,o?.y)>0);
// LAB_FOG (labyrinths.ts): in a labyrinth chamber a creature shows only while its tile is in sight (objects on any tile seen,
// above; in sight is always seen); everywhere else this is discoveredInDungeon.
export const shownInDungeon=(g,e)=>discoveredInDungeon(g,e)&&(g.area!=="dungeon"||!!e?.worldBeast||labFogState(g.map,e?.x,e?.y)===2);

const structureRenderCache = new WeakMap();
const mapObjectCache = new WeakMap();
const renderCacheStats = { structureBuilds: 0, objectListBuilds: 0, visibleTiles: 0, visibleObjects: 0 };
function structureRenderMeta(o) {
  const cells = o.footprint || [], prior = structureRenderCache.get(o);
  if (prior && prior.cells === cells && prior.length === cells.length) return prior;
  const meta = { cells, length: cells.length, set: new Set(cells.map((c) => `${c.x},${c.y}`)) };
  structureRenderCache.set(o, meta);
  renderCacheStats.structureBuilds++;
  return meta;
}
function mapObjectLists(map) {
  const objects = map?.objects || [], prior = mapObjectCache.get(map);
  if (prior && prior.objects === objects && prior.length === objects.length) return prior;
  const value = {
    objects,
    length: objects.length,
    structures: objects.filter((o) => o.kind === "shack" || o.kind === "architecturalBuilding" || o.kind === "greatBuilding"),
    shelters: objects.filter((o) => o.kind === "shack" || o.kind === "greatBuilding"), // a great building has no inside on the overworld; listed so the Wayfarer stays in front of its facade
    animated: objects.filter((o) => ["shrine", "checkpoint", "ruinMarker", "apertureMemory"].includes(o.kind)),
  };
  mapObjectCache.set(map, value);
  renderCacheStats.objectListBuilds++;
  return value;
}
export function rendererDiagnostics() { return { ...renderCacheStats }; }
// Where render time goes (release 167): the diagnostic probe switches this on and reads the three parts each frame.
export const renderTimings = { on: false, ground: 0, world: 0, overlay: 0 };
function renderableObject(g,o){
  // Keep progression/interaction records, but do not repaint a consumed physical door or gate.
  const width = Math.max(1,Number(g.map?.width)||(g.area === "dungeon" ? 24 : 32));
  if ((o.kind === "sealedGate" || o.kind === "door" || o.kind === "deepShortcut") &&
      g.map?.tiles?.[Math.floor(o.y) * width + Math.floor(o.x)]?.kind === "voidScar") return false;
  return !g.renderObjectPredicate||g.renderObjectPredicate(o);
}
const PAL = {
  // great buildings (great-buildings.ts): their walls and floors
  keepWall: ["#4a443b", "#544d43"], aptWall: ["#55595d", "#5f6367"],
  mosaicFloor: ["#5a4a3a", "#5e4d3c"], carpetFloor: ["#5b2a2c", "#5f2c2e"], plankFloor: ["#6a4a2e", "#6e4d30"], flagFloor: ["#5a5650", "#5e5a53"],
  tileFloor: ["#8a8a84", "#7e7e78"], concreteFloor: ["#5b5d5e", "#585a5b"], rubbleFloor: ["#4a4640", "#46423c"], floorHole: ["#060607", "#060607"], hallVoid: ["#030308", "#04040a"], /* release 795: a grand hall's open shaft */
  hedgeWall: ["#2c4a2a", "#30502e"], yardGrass: ["#4f6a3a", "#53703d"], cellarWall: ["#1c1a18", "#211f1c"], cellarFloor: ["#33302b", "#36332e"], // labyrinths
  hiveWall: ["#3a2a44", "#40304a"], chitinFloor: ["#3d3046", "#42344b"], fleshFloor: ["#5a2e3e", "#5e3142"], crystalFloor: ["#3a4a66", "#3e4f6b"], // compounds' hives
  ash: ["#3b3834", "#5a5049"],
  glass: ["#345052", "#52716d"],
  ember: ["#553b34", "#85584a"],
  refuge: ["#485848", "#6f8067"],
  floor: ["#3b403d", "#555750"],
  hollowFloor: ["#46575a", "#53666a"],
  hollowWall: ["#101619", "#20292d"],
  cisternFloor: ["#344b47", "#405b54"],
  cisternWall: ["#25352f", "#3f5549"],
  kilnFloor: ["#594039", "#6b4b40"],
  kilnWall: ["#36231f", "#5d352a"],
  blocked: ["#232522", "#45423d"],
  tunnel: ["#2a2620", "#46403a"], // release 225: rough rubble floor where a shovel dug
  wall: ["#1d211f", "#403d37"],
  deepFloor: ["#242b30", "#364149"],
  deepWall: ["#12171b", "#2c343b"],
  threefoldDeepFloor: ["#4b4540", "#62584e"], threefoldDeepWall: ["#171515", "#302827"],
  descentDeepFloor: ["#27343d", "#344852"], descentDeepWall: ["#0e171d", "#1b2a32"],
  loopDeepFloor: ["#3d3648", "#51465e"], loopDeepWall: ["#17131e", "#30283b"],
  floodedDeepFloor: ["#294746", "#39605c"], floodedDeepWall: ["#102423", "#24413e"],
  fortressDeepFloor: ["#4a4035", "#615242"], fortressDeepWall: ["#1b1815", "#382e27"],
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
const TRAVELER_LOOKS = new Set(["pilgrim", "peddler", "mercenary", "minstrel", "scholar", "traveler", "cartographer"]);
// Trails (release 115): a worn dirt track drawn over whatever ground the tile already shows.
// A frozen sea tile: pale blue-white ice with a lighter rim and a few cracks, seeded by position.
function seaIceTile(ctx, x, y, s) {
  const px = x * s, py = y * s, d = h(x, y);
  ctx.fillStyle = "#cfe6f2"; ctx.fillRect(px, py, s, s);
  ctx.fillStyle = "#e9f6fc"; ctx.fillRect(px + s * .06, py + s * .06, s * .88, s * .3);
  ctx.strokeStyle = "#8fb4c8"; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath();
  ctx.moveTo(px + s * (.15 + (d % 5) * .1), py + s * .2); ctx.lineTo(px + s * .5, py + s * (.45 + (d % 3) * .08)); ctx.lineTo(px + s * (.85 - (d % 4) * .08), py + s * .8);
  ctx.moveTo(px + s * .5, py + s * (.45 + (d % 3) * .08)); ctx.lineTo(px + s * .25, py + s * .85); ctx.stroke();
}
// Release 265: Shale, the quarry keeper (Tim: "a small stone turtle... looks kind of like the mountain turtle, but...
// smaller... no ice on him... He could be wearing a hat"). A fitted-stone shell, stubby legs, a patient head and a
// wide-brimmed straw hat; he breathes slowly.
function quarryTurtle(ctx, x, y, s, now) {
  const cx = (x + .5) * s, cy = (y + .62) * s, b = 1 + Math.sin(now / 900) * .02, u = s / 32;
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = "#00000040"; ctx.beginPath(); ctx.ellipse(0, 9 * u, 14 * u, 4 * u, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#5d6660"; for (const [lx, ly] of [[-10, 5], [10, 5], [-7, 9], [7, 9]]) { ctx.beginPath(); ctx.ellipse(lx * u, ly * u, 3.4 * u, 2.6 * u, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#6f7a72"; ctx.beginPath(); ctx.ellipse(13 * u, 0, 5 * u, 4 * u, 0, 0, 7); ctx.fill(); // head, looking right
  ctx.fillStyle = "#1e2420"; ctx.beginPath(); ctx.arc(15 * u, -1 * u, 1.1 * u, 0, 7); ctx.fill();
  ctx.scale(1, b); ctx.fillStyle = "#7d8780"; ctx.beginPath(); ctx.ellipse(0, 0, 12 * u, 9 * u, 0, Math.PI, 0); ctx.lineTo(12 * u, 3 * u); ctx.lineTo(-12 * u, 3 * u); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#4b534e"; ctx.lineWidth = Math.max(1, u * .9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-11 * u, -2 * u); ctx.lineTo(11 * u, -2 * u); ctx.moveTo(-6 * u, -2 * u); ctx.lineTo(-5 * u, -8 * u); ctx.moveTo(4 * u, -2 * u); ctx.lineTo(5 * u, -8 * u); ctx.moveTo(-1 * u, -8.5 * u); ctx.lineTo(-1 * u, -2 * u); ctx.stroke(); // fitted stones
  ctx.fillStyle = "#c9a85a"; ctx.beginPath(); ctx.ellipse(0, -9 * u, 11 * u, 2.6 * u, 0, 0, 7); ctx.fill(); // the hat's brim
  ctx.fillStyle = "#b8954a"; ctx.beginPath(); ctx.ellipse(0, -12 * u, 5.5 * u, 4 * u, 0, Math.PI, 0); ctx.lineTo(5.5 * u, -9.5 * u); ctx.lineTo(-5.5 * u, -9.5 * u); ctx.fill();
  ctx.fillStyle = "#7a4a2a"; ctx.fillRect(-5.5 * u, -11 * u, 11 * u, 1.6 * u); // band
  ctx.restore();
}
// Release 265: a wood wall (upright planks with a cross brace) or a stone block (a cut block, a second course when stacked).
function buildTile(ctx, t, x, y, s) {
  const px = x * s, py = y * s;
  if (t.build === "wood" && (t.buildRun === "ne" || t.buildRun === "nw")) { // release 267: a fence on the diagonal
    const up = t.buildRun === "ne", ax = px + s * .1, bx = px + s * .9, ay = up ? py + s * .88 : py + s * .2, by = up ? py + s * .2 : py + s * .88;
    ctx.strokeStyle = "#00000045"; ctx.lineWidth = s * .12; ctx.beginPath(); ctx.moveTo(ax, ay + s * .06); ctx.lineTo(bx, by + s * .06); ctx.stroke();
    ctx.strokeStyle = "#6b4426"; ctx.lineWidth = s * .07; ctx.beginPath(); ctx.moveTo(ax, ay - s * .12); ctx.lineTo(bx, by - s * .12); ctx.stroke();
    for (let k = 0; k < 5; k++) {
      const f = (k + .5) / 5, x0 = ax + (bx - ax) * f, y0 = ay + (by - ay) * f, w = s * .14;
      ctx.fillStyle = k % 2 ? "#8a5a32" : "#a06d3e"; ctx.beginPath(); ctx.moveTo(x0 - w / 2, y0); ctx.lineTo(x0 - w / 2, y0 - s * .34); ctx.lineTo(x0, y0 - s * .46); ctx.lineTo(x0 + w / 2, y0 - s * .34); ctx.lineTo(x0 + w / 2, y0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#4e321a"; ctx.lineWidth = Math.max(1, s * .025); ctx.stroke();
    }
    return;
  }
  if (t.build === "wood" && t.buildRun === "v") { // release 265: built facing sideways, the fence runs up and down
    ctx.fillStyle = "#00000045"; ctx.fillRect(px + s * .5, py + s * .06, s * .14, s * .94);
    for (let k = 0; k < 4; k++) {
      const y0 = py + s * (.02 + k * .24);
      ctx.fillStyle = k % 2 ? "#8a5a32" : "#a06d3e"; ctx.beginPath(); ctx.moveTo(px + s * .38, y0 + s * .26); ctx.lineTo(px + s * .38, y0 + s * .06); ctx.lineTo(px + s * .47, y0 - s * .04); ctx.lineTo(px + s * .56, y0 + s * .06); ctx.lineTo(px + s * .56, y0 + s * .26); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#4e321a"; ctx.lineWidth = Math.max(1, s * .025); ctx.stroke();
    }
    ctx.fillStyle = "#6b4426"; ctx.fillRect(px + s * .43, py, s * .08, s);
    return;
  }
  if (t.build === "wood") { // a thin palisade of pointed stakes on a crossbar
    ctx.fillStyle = "#00000045"; ctx.fillRect(px + s * .02, py + s * .74, s * .96, s * .1);
    for (let k = 0; k < 5; k++) {
      const x0 = px + s * (.03 + k * .19), w = s * .17;
      ctx.fillStyle = k % 2 ? "#8a5a32" : "#a06d3e"; ctx.beginPath(); ctx.moveTo(x0, py + s * .78); ctx.lineTo(x0, py + s * .3); ctx.lineTo(x0 + w / 2, py + s * .16); ctx.lineTo(x0 + w, py + s * .3); ctx.lineTo(x0 + w, py + s * .78); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#4e321a"; ctx.lineWidth = Math.max(1, s * .025); ctx.stroke();
    }
    ctx.fillStyle = "#6b4426"; ctx.fillRect(px, py + s * .5, s, s * .08);
    return;
  }
  const level = t.buildLevel || 1;
  for (let k = 0; k < level; k++) {
    const top = py + s * (.18 - k * .16);
    ctx.fillStyle = "#00000038"; ctx.fillRect(px + s * .06, top + s * .74, s * .9, s * .12);
    ctx.fillStyle = "#7b7f86"; ctx.fillRect(px + s * .06, top + s * .5, s * .88, s * .3);
    ctx.fillStyle = "#a9aeb5"; ctx.fillRect(px + s * .06, top + s * .14, s * .88, s * .38);
    ctx.strokeStyle = "#4e5258"; ctx.lineWidth = Math.max(1, s * .04); ctx.strokeRect(px + s * .06, top + s * .14, s * .88, s * .66);
    ctx.beginPath(); ctx.moveTo(px + s * .06, top + s * .52); ctx.lineTo(px + s * .94, top + s * .52); ctx.stroke();
  }
}
function tile(ctx, t, x, y, s, map, w, activeBuildingId=null, scarSurface=null) {
  if (t?.kind === "seaIce") { seaIceTile(ctx, x, y, s); return; } // release 261: the Mountain Turtle's ice floor
  if (t?.build) { tileBase(ctx, t.buildOrig || t, x, y, s, map, w, activeBuildingId, scarSurface); buildTile(ctx, t, x, y, s); return; }
  tileBase(ctx, t, x, y, s, map, w, activeBuildingId, scarSurface);
  if (t?.trail) {
    const d = Number.isFinite(t.detail) ? t.detail : h(x, y), px = x * s, py = y * s;
    ctx.fillStyle = "#8a744f55"; ctx.fillRect(px + s * .12, py + s * .12, s * .76, s * .76);
    ctx.fillStyle = "#c2a87a33"; ctx.fillRect(px + s * (.2 + (d % 3) * .12), py + s * (.3 + (d % 2) * .25), s * .14, s * .1);
  }
  if (t?.sigil) sigilInlay(ctx, t, x, y, s);
  if (t?.inlay) hallInlay(ctx, t, x, y, s); // release 795: a grand hall's floor mural
}
// Release 795: a floor mural's tile (pentagon-halls.ts muralPattern): a lit line (2) or a dark groove (1) set in the floor.
function hallInlay(ctx, t, x, y, s) { const px = x * s, py = y * s; ctx.fillStyle = t.inlay === 2 ? "#e8d8a055" : "#00000033"; ctx.fillRect(px + s * .14, py + s * .14, s * .72, s * .72); if (t.inlay === 2) { ctx.strokeStyle = "#f4e6b066"; ctx.lineWidth = Math.max(1, s * .03); ctx.strokeRect(px + s * .2, py + s * .2, s * .6, s * .6); } }
// Release 289: a tile of the Watcher's sigil (watcher.ts): pale violet inlaid stone, the eye's pupil brightest; in arenas a
// border and tesserae of small tiles around it; on a shrine, the raised platforms (their faces are the landscape's own).
const SIGIL_INLAY = { lid: ["#b8b0d855", "#e6e0ff66"], ring: ["#b8b0d855", "#e6e0ff66"], eye: ["#a79ed066", "#e6e0ff55"], pupil: ["#d8d0ff99", "#ffffffaa"], orbit: ["#9f96c855", "#d8d2f855"], tools: ["#a79ed055", "#e6e0ff55"], border: ["#c9a15c44", "#e2c04f55"], tessera: ["#6d5f8a33", "#b8b0d833"] };
function sigilInlay(ctx, t, x, y, s) {
  const [fill, edge] = SIGIL_INLAY[t.sigil] || SIGIL_INLAY.ring, px = x * s, py = y * s - (t.landscape ? landscapeTileLift(t, s) : 0), d = Number.isFinite(t.detail) ? t.detail : h(x, y);
  if (t.sigil === "tessera") { for (let k = 0; k < 4; k++) { ctx.fillStyle = (d + k) % 3 ? fill : edge; ctx.fillRect(px + s * (.08 + (k % 2) * .44), py + s * (.08 + Math.floor(k / 2) * .44), s * .38, s * .38); } return; }
  ctx.fillStyle = fill; ctx.fillRect(px + s * .06, py + s * .06, s * .88, s * .88);
  ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, s * .04); ctx.strokeRect(px + s * .1, py + s * .1, s * .8, s * .8);
  if (t.sigil === "pupil") { ctx.fillStyle = "#ffffffcc"; ctx.beginPath(); ctx.arc(px + s * .5, py + s * .5, s * .16, 0, Math.PI * 2); ctx.fill(); }
}
// Release 289 (Tim: "pristine, where the glyph is just very bright... a little halo above it... super rare"): the pristine
// Watcher's tomb. Opened, its lid is pushed aside and the sigil dark.
function drawWatcherTomb(ctx, o, s, now) {
  const x0 = (o.x + .18) * s, y0 = (o.y + .02) * s, w = s * .64, hh = s * .9, open = o.state === "opened";
  ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse((o.x + .5) * s, (o.y + .95) * s, s * .38, s * .1, 0, 0, Math.PI * 2); ctx.fill();
  if (open) { ctx.fillStyle = "#14110e"; ctx.fillRect(x0, y0, w, hh); }
  ctx.save(); if (open) { ctx.translate(s * .14, s * .05); ctx.rotate(.18); }
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, "#d9d4e6"); g.addColorStop(1, "#9c96ac"); ctx.fillStyle = g; ctx.fillRect(x0, y0, w, hh);
  ctx.strokeStyle = "#2a2433"; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y0, w, hh);
  const cx = (o.x + .5) * s, cy = (o.y + .4) * s, pulse = open ? 0 : .5 + .5 * Math.sin(now / 520);
  if (!open) { ctx.fillStyle = `rgba(207,196,255,${.16 + pulse * .12})`; ctx.beginPath(); ctx.arc(cx, cy, s * (.27 + pulse * .04), 0, Math.PI * 2); ctx.fill(); } // release 469: a soft disc, not shadowBlur (costly on phone GPUs)
  watcherSigil(ctx, cx, cy, s * .17, s, open ? .25 : .95, open ? "#6d6680" : "#f4f0ff");
  ctx.restore();
  if (!open) { ctx.strokeStyle = `rgba(236,230,255,${.45 + pulse * .35})`; ctx.lineWidth = Math.max(1.5, s * .035); ctx.beginPath(); ctx.ellipse(cx, (o.y - .32) * s - pulse * s * .04, s * .24, s * .07, 0, 0, Math.PI * 2); ctx.stroke(); }
}
// Release 301: a Watcher's dais, a round stepped stone with the sigil inlaid; dim while dormant, lit and haloed once attuned.
function drawWarpDais(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .55) * s, lit = o.state === "attuned", pulse = .5 + .5 * Math.sin(now / 480);
  ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(cx, cy + s * .14, s * .5, s * .2, 0, 0, Math.PI * 2); ctx.fill();
  for (const [r, top, c0, c1] of [[.5, .1, "#77708a", "#4a4458"], [.4, 0, "#a39cb6", "#6c6680"]]) { const g = ctx.createLinearGradient(cx - s * r, 0, cx + s * r, 0); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy - top * s, s * r, s * r * .42, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#2a2433"; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, .45); if (lit) { ctx.fillStyle = `rgba(216,200,255,${.18 + pulse * .12})`; ctx.beginPath(); ctx.arc(0, 0, s * (.3 + pulse * .04), 0, Math.PI * 2); ctx.fill(); } /* release 469: no shadowBlur */
  watcherSigil(ctx, 0, 0, s * .2, s, lit ? .95 : .4, lit ? "#f4f0ff" : "#3a3448"); ctx.restore();
  if (lit) { ctx.strokeStyle = `rgba(216,200,255,${.35 + pulse * .35})`; ctx.lineWidth = Math.max(1.5, s * .03); ctx.beginPath(); ctx.ellipse(cx, cy - s * (.55 + pulse * .05), s * .22, s * .06, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(216,200,255,${.08 + pulse * .06})`; ctx.beginPath(); ctx.moveTo(cx - s * .3, cy); ctx.lineTo(cx - s * .16, cy - s * .55); ctx.lineTo(cx + s * .16, cy - s * .55); ctx.lineTo(cx + s * .3, cy); ctx.closePath(); ctx.fill(); }
}
// Exact Supernova disks are static material on the cast-center ground plane. A single constant
// visual lift preserves a true circle across uneven physical tiles and survives later revisits.
const voidScarSurfaceCache = new WeakMap();
function voidScarSurface(map, area) {
  const source = map._voidScarCircles, legacySource = map._voidScarLegacyCells;
  const circles = (Array.isArray(source) ? source : []).filter(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)&&Number.isFinite(c.radius)&&c.radius>0);
  const legacy = Array.isArray(legacySource) ? legacySource : [];
  // Only the active overworld section is scanned. Water never acquires scar material, even where
  // a saved exact circle overlaps a coast; include the mask in cache identity for in-place changes.
  const marine = area === 'overworld' && circles.length ? (map.tiles || []).flatMap((tile, i) => isMarineTile(tile) ? [i] : []) : [];
  const signature = circles.map(c=>`${c.x},${c.y},${c.radius},${Number(c.visualLift)||0}`).join(';')+'|'+legacy.join(';')+'|water:'+marine.join(',');
  const prior = voidScarSurfaceCache.get(map);
  if(prior&&prior.source===source&&prior.legacySource===legacySource&&prior.signature===signature)return prior;
  const shapes=circles.map(circle=>{
    const {x,radius:r}=circle,y=circle.y-(Number(circle.visualLift)||0),seed=h(Math.round(x*1000),Math.round(circle.y*1000)),cracks=[];
    // Five fine rents across an entire disk, not a busy crack network in every tile.
    for(let i=0;i<5;i++){
      const a=(seed%628)/100+i*Math.PI*2/5,dx=Math.cos(a),dy=Math.sin(a),bend=((seed>>>(i*3))&7)/7-.5;
      const point=(rad,side)=>[x+r*(dx*rad-dy*side),y+r*(dy*rad+dx*side)];
      const path=[point(.94,0),point(.76,bend*.09),point(.61,-bend*.1),point(.4+(i%3)*.055,bend*.035)];
      cracks.push(path);
      if(i===1||i===4)cracks.push([path[2],point(.56,bend*.1+.07),point(.5,bend*.1+.12)]);
    }
    return {...circle,y,cracks};
  });
  const surface={source,legacySource,signature,shapes,marine,legacy:new Set(legacy),legacyAll:!Array.isArray(source)&&!Array.isArray(legacySource)};
  voidScarSurfaceCache.set(map,surface);return surface;
}
function drawVoidScarTile(ctx,t,x,y,s,map,w,activeBuildingId,surface){
  // Collision uses whole cells. Corners outside the exact disk remain ordinary harmless floor,
  // never a surviving wall or a white stair-step around the circular visual boundary.
  tileBase(ctx,{kind:'floor',blocked:false,detail:t.detail},x,y,s,map,w,activeBuildingId);
  if(surface&&!surface.legacyAll&&!surface.legacy.has(`${x},${y}`))return;
  // Old cell-only saves have no recoverable center. Preserve only those historical footprints.
  const px=x*s,py=y*s;ctx.fillStyle='#fffefd';ctx.fillRect(px,py,s,s);
  if(h(x,y)%5!==0)return;
  ctx.strokeStyle='#ba3e4d';ctx.lineWidth=Math.max(.65,s*.02);ctx.beginPath();
  ctx.moveTo(px+s*.18,py+s*.34);ctx.lineTo(px+s*.42,py+s*.48);ctx.lineTo(px+s*.7,py+s*.4);ctx.stroke();
}
function drawVoidScarSurface(ctx,g,s,mw,mh,surface){
  if(!surface.shapes.length)return;
  ctx.save();ctx.beginPath();
  if(g.area==='dungeon'&&g.map.dungeonContract?.discoveryEnabled&&g.map._dungeonRevealMode!=='full'){
    // Clip by ordinary discovery only, never reveal because a blast crossed into a chunk.
    for(let y=0;y<mh;y+=DUNGEON_CHUNK_SIZE)for(let x=0;x<mw;x+=DUNGEON_CHUNK_SIZE)
      if(dungeonTileVisibility(g.map,x,y)!=='unseen')ctx.rect(x*s,y*s,Math.min(DUNGEON_CHUNK_SIZE,mw-x)*s,Math.min(DUNGEON_CHUNK_SIZE,mh-y)*s);
  }else ctx.rect(0,0,mw*s,mh*s);
  ctx.clip();
  if(surface.marine.length){
    // Nonoverlapping row runs subtract ocean from the continuous disk, not from terrain/fog.
    // The outer blast contour stays smooth; shoreline clipping follows the existing tile geometry.
    ctx.beginPath();ctx.rect(0,0,mw*s,mh*s);
    for(let i=0;i<surface.marine.length;i++){
      const start=surface.marine[i],row=Math.floor(start/mw);let end=start;
      while(i+1<surface.marine.length&&surface.marine[i+1]===end+1&&Math.floor((end+1)/mw)===row)end=surface.marine[++i];
      ctx.rect((start%mw)*s,row*s,(end-start+1)*s,s);
    }
    ctx.clip('evenodd');
  }
  ctx.fillStyle='#fffefd';
  // Opaque raster fills form the exact circle union without a superlinear overlapping vector clip.
  // Every fracture segment lies inside its own convex disk, so no additional union clip is needed.
  for(const c of surface.shapes){ctx.beginPath();ctx.arc(c.x*s,c.y*s,c.radius*s,0,Math.PI*2);ctx.fill()}
  ctx.strokeStyle='#ba3e4d';ctx.lineWidth=Math.max(.65,s*.02);ctx.lineCap='butt';ctx.lineJoin='miter';ctx.beginPath();
  for(const c of surface.shapes)for(const crack of c.cracks){ctx.moveTo(crack[0][0]*s,crack[0][1]*s);for(let i=1;i<crack.length;i++)ctx.lineTo(crack[i][0]*s,crack[i][1]*s)}
  ctx.stroke();ctx.restore();
}
// Release 621 (Tim: "the power armor floats above the surface... a slight crater around it... where the water is depressed due
// to the thrusters"): at sea the empowered robot hovers (SEA_SUIT.hover tiles, bobbing) over a dip in the water: a darker
// hollow under it with a bright rim, and a ring of spray spreading out every `ringMs`. Diving, it sinks beneath, dim.
export const SEA_SUIT = { hover: .3, bob: .04, bobMs: 320, at: .74, dip: [.42, .15], ringMs: 900, ring: [.42, .78] };
function drawThrustDip(ctx, x, y, s, now) {
  const cx = (x + .5) * s, cy = (y + SEA_SUIT.at) * s, [rx, ry] = SEA_SUIT.dip, f = (now % SEA_SUIT.ringMs) / SEA_SUIT.ringMs, r = SEA_SUIT.ring[0] + (SEA_SUIT.ring[1] - SEA_SUIT.ring[0]) * f, flick = .85 + .15 * Math.sin(now / 45);
  ctx.save();
  // the hollow the thrust presses into the water: dark at its heart, lit by the jets
  const hollow = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * s); hollow.addColorStop(0, `rgba(150,230,255,${(.45 * flick).toFixed(3)})`); hollow.addColorStop(.35, "rgba(10,40,60,.55)"); hollow.addColorStop(1, "rgba(10,40,60,0)");
  ctx.fillStyle = hollow; ctx.beginPath(); ctx.ellipse(cx, cy, rx * s, ry * s, 0, 0, Math.PI * 2); ctx.fill();
  // the raised lip of churned water round it: bright in front, softer behind
  ctx.lineWidth = Math.max(1.5, s * .045); ctx.strokeStyle = "#eaf9ffcc"; ctx.beginPath(); ctx.ellipse(cx, cy, rx * s, ry * s, 0, 0, Math.PI); ctx.stroke();
  ctx.lineWidth = Math.max(1, s * .025); ctx.strokeStyle = "#cdeefa77"; ctx.beginPath(); ctx.ellipse(cx, cy, rx * s, ry * s, 0, Math.PI, Math.PI * 2); ctx.stroke();
  // spray spreading out
  ctx.globalAlpha = .6 * (1 - f); ctx.lineWidth = Math.max(1, s * .02); ctx.strokeStyle = "#dff6ff"; ctx.beginPath(); ctx.ellipse(cx, cy, r * s, r * s * .36, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
// Release 589: a Skyland with a mode stands on cloud: open sky where the arena has void, soft cloud underfoot, and a darker
// underside where cloud meets sky. Other tiles (hazards, bridges) draw as they always do.
// Release 593 (Tim: "stars in the background... a penumbra around the character as he moves, and the background is kind of like
// glittering stars"): a chasm crossing's drop is open night sky. The tile holds a few fixed stars (cached with the ground); each
// frame a bounded handful glitter (CHASM_STARS.twinkle of the tiles in view), and a penumbra of light follows the Wayfarer.
export const CHASM_STARS = { sky: "#0b0e11", stars: 3, star: ["#ffffff2e", "#fff0c444"], glint: .4, // release 613 (Tim: "the background to be like the fog... dark... faint, faint specks of light... you won't be able to really discern... depth vs blackness"): the fog's own black, faint stars
  twinkleEvery: 3, penumbra: { inner: 2.2, outer: 6.5, dark: .88 } }; // release 615 (Tim: "the wayfarer is really the only real point of light"): was 2.6 / 7.5 / .78
function drawStarChasm(ctx, t, x, y, s) {
  const px = x * s, py = y * s;
  ctx.fillStyle = CHASM_STARS.sky; ctx.fillRect(px, py, s + 1, s + 1);
  for (let i = 0; i < CHASM_STARS.stars; i++) { const q = h(x * 13 + i * 31, y * 17 + i * 7); if (q % 3 === 0) continue; ctx.fillStyle = CHASM_STARS.star[q % 5 ? 0 : 1]; const r = q % 11 === 0 ? 1.4 : 1; ctx.fillRect(px + (q % 97) / 97 * s, py + ((q >> 8) % 97) / 97 * s, r, r); }
}
// The Pentagon's finale (pentagon.ts PENTAGON.finale): the walkway among the stars is pale stone, like the Starfield's rafts,
// edged with faint light where it meets the dark and thick-edged on its underside; the dais's landing is warmer stone, its
// stepped rings painted across its tiles (each tile knows the dais's centre). Painted with the ground (cached), not per frame.
export const STAR_WALK = { stone: ["#cfc6b4", "#c8bfac"], dais: ["#ddd0ad", "#d6c9a5"], under: "#7d7566", rim: "rgba(170,200,255,.55)", ring: ["#b9ab86", "#efe3c2", "#c8b98f"], rings: [2.2, 1.6, 1.05], shard: ["#5d5a63", "#77737e", "#3c3a42"] };
function drawStarWalk(ctx, t, x, y, s, tiles, w) {
  const P = STAR_WALK, d = Number.isFinite(t.detail) ? t.detail : 0, px = x * s, py = y * s, dais = t.kind === "starDais", at = (dx, dy) => tiles?.[(y + dy) * w + x + dx], gap = (dx, dy) => { const q = at(dx, dy); return !q || q.chasm; };
  ctx.fillStyle = (dais ? P.dais : P.stone)[d & 1]; ctx.fillRect(px, py, s + 1, s + 1);
  if (dais && Number.isFinite(t.daisX)) { ctx.save(); ctx.beginPath(); ctx.rect(px, py, s + 1, s + 1); ctx.clip(); const cx = (t.daisX + .5) * s, cy = (t.daisY + .5) * s;
    P.rings.forEach((r, i) => { ctx.strokeStyle = P.ring[i % P.ring.length]; ctx.lineWidth = Math.max(1.5, s * .08); ctx.beginPath(); ctx.arc(cx, cy, s * r, 0, 7); ctx.stroke(); }); ctx.restore(); }
  else if (d === 2) { ctx.fillStyle = "#00000014"; ctx.fillRect(px + s * .5, py, 1, s); } // a joint between slabs
  ctx.fillStyle = P.rim; const k = Math.max(1, s * .06);
  if (gap(0, -1)) ctx.fillRect(px, py, s + 1, k); if (gap(-1, 0)) ctx.fillRect(px, py, k, s + 1); if (gap(1, 0)) ctx.fillRect(px + s - k, py, k + 1, s + 1);
  if (gap(0, 1)) { ctx.fillStyle = P.under; ctx.fillRect(px, py + s * .8, s + 1, s * .2 + 1); ctx.fillStyle = P.rim; ctx.fillRect(px, py + s * .8 - k, s + 1, k); } // its edge, seen from above: the walkway floats
}
function drawStarShard(ctx, t, x, y, s) {
  const P = STAR_WALK.shard, q = h(x * 29 + 3, y * 23 + 5), cx = (x + .3 + (q % 40) / 100) * s, cy = (y + .3 + ((q >> 6) % 40) / 100) * s, r = s * (.16 + (q % 7) / 40);
  ctx.fillStyle = P[2]; ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx - r * .3, cy + r * 1.1); ctx.lineTo(cx + r * .8, cy + r * .4); ctx.closePath(); ctx.fill(); // its broken underside
  ctx.fillStyle = P[q & 1]; ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx - r * .2, cy - r * .7); ctx.lineTo(cx + r, cy - r * .2); ctx.lineTo(cx + r * .8, cy + r * .4); ctx.closePath(); ctx.fill();
}
// Per frame: the glittering stars over the chasm tiles in view (`list` is tile, x, y triples).
function glitterChasm(ctx, list, s, now) {
  for (let i = 0; i < list.length; i += 3) {
    const x = list[i + 1], y = list[i + 2], q = h(x * 5 + 1, y * 3 + 2), a = Math.sin(now / (520 + q % 600) + q) ; if (a < .55) continue;
    const px = x * s + (q % 89) / 89 * s, py = y * s + ((q >> 7) % 89) / 89 * s, r = 1 + (a - .55) * 4.5;
    ctx.fillStyle = `rgba(255,248,225,${(a - .55) * 2 * CHASM_STARS.glint})`; ctx.fillRect(px - r, py - .5, r * 2, 1); ctx.fillRect(px - .5, py - r, 1, r * 2);
  }
}
// Release 613: a Starfield raft: a slab of pale stone edged with faint light, its shadow lost in the stars below.
function drawRafts(ctx, g, s, now) { // release 615: risen rafts lift, sunken ones show as dim shapes beneath the level
  const t = Number(g.save?.playSeconds) || 0, H = STARFIELD_PLATFORMS.half;
  for (const m of g.map.movers) { const c = platformPos(m, t); if (g.area === "dungeon" && dungeonTileVisibility(g.map, Math.floor(c.x), Math.floor(c.y)) === "unseen") continue;
    const lift = discLift(c.z) * s, under = c.z < -.3, x = (c.x - H) * s, y = (c.y - H) * s - lift, w = H * 2 * s, glow = .45 + .25 * Math.sin(now / 500 + (m.phase || 0) * 6);
    ctx.save(); if (under) ctx.globalAlpha = Math.max(.18, .6 + c.z * .25);
    ctx.fillStyle = "#00000066"; ctx.fillRect(x + s * .12, y + lift + s * .22, w, w); // its shadow stays on the level
    ctx.fillStyle = under ? "#4d4a52" : "#cfc6b4"; ctx.fillRect(x, y, w, w); ctx.fillStyle = under ? "#36343b" : "#b3aa97"; ctx.fillRect(x, y + w * .78, w, w * .22);
    ctx.strokeStyle = `rgba(170,200,255,${glow})`; ctx.lineWidth = Math.max(1.5, s * .06); ctx.strokeRect(x + 1, y + 1, w - 2, w - 2);
    ctx.fillStyle = `rgba(200,220,255,${glow * .8})`; for (const [u, v] of [[.2, .2], [.8, .2], [.2, .8], [.8, .8]]) ctx.fillRect(x + w * u - 1.5, y + w * v - 1.5, 3, 3);
    ctx.restore(); }
}
let cloudSky = false; // set each frame from g.map.skyCloud (tile painters are handed the tile array, not the map)
export const CLOUD_PAINT = { sky: ["#6f9cc9", "#77a3cf"], puff: "#ffffff22", floor: ["#dfe6ef", "#d6dfeb"], shade: "#b4c3d666", rim: "#8ea4bf", gleam: "#ffffff44" };
function drawCloudTile(ctx, t, x, y, s, tiles, w) {
  const C = CLOUD_PAINT, d = Number.isFinite(t.detail) ? t.detail : h(x, y), px = x * s, py = y * s, below = tiles?.[(y + 1) * w + x];
  if (t.kind === "void") {
    ctx.fillStyle = C.sky[d & 1]; ctx.fillRect(px, py, s + 1, s + 1);
    if (d % 5 === 0) { ctx.fillStyle = C.puff; ctx.beginPath(); ctx.ellipse(px + s * .5, py + s * .55, s * .55, s * .22, 0, 0, Math.PI * 2); ctx.fill(); }
    return true;
  }
  if (t.blocked || t.environment || /bridge|canyon|water|river|gate/i.test(String(t.kind))) return false;
  ctx.fillStyle = C.floor[d & 1]; ctx.fillRect(px, py, s + 1, s + 1);
  ctx.fillStyle = C.shade; ctx.beginPath(); ctx.arc(px + s * (.25 + (d % 3) * .2), py + s * .7, s * .18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.gleam; ctx.beginPath(); ctx.arc(px + s * (.3 + (d % 4) * .12), py + s * .3, s * .14, 0, Math.PI * 2); ctx.fill();
  if (below?.kind === "void") { ctx.fillStyle = C.rim; ctx.fillRect(px, py + s * .78, s + 1, s * .22 + 1); }
  return true;
}
function tileBase(ctx, t, x, y, s, map, w, activeBuildingId=null, scarSurface=null) {
  if (t?.kind === "voidScar") { drawVoidScarTile(ctx,t,x,y,s,map,w,activeBuildingId,scarSurface); return; }
  if (drawStillworksTile(ctx, t, x, y, s)) return; // the Stillworks (pentagon-arena-render.ts): cached sprites per band and edge
  if (t?.landscape && drawLandscapeTile(ctx, t, x, y, s, map, w, closeViewWorldCapture())) return;
  if (cloudSky && drawCloudTile(ctx, t, x, y, s, map, w)) return; // release 589
  if (t?.realm && drawRealmTile(ctx, t, x, y, s, map, w)) return; // seed realms (seed-realm-render.ts)
  if (t?.chasm) { drawStarChasm(ctx, t, x, y, s); if (t.kind === "starShard") drawStarShard(ctx, t, x, y, s); return; } // release 593; the Pentagon's finale: a stone adrift
  if (t?.kind === "starWalk" || t?.kind === "starDais") { drawStarWalk(ctx, t, x, y, s, map, w); return; } // the Pentagon's finale: the walkway among the stars
  const p = PAL[t.kind] || PAL.ash,
    d = Number.isFinite(t.detail) ? t.detail : h(x, y),
    px = x * s,
    py = y * s;
  ctx.fillStyle = p[d & 1];
  ctx.fillRect(px, py, s + 1, s + 1);
  if (BUILDING_TILES.has(t.kind)) { paintBuildingTile(ctx, t, x, y, s, d, map, w); if (t.plate) drawPressurePlate(ctx, x, y, s); return; } // great buildings (and the Pentagon's pressure plate)
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
  if(t.kind==="hollowWall"){ctx.fillStyle=p[d&1];ctx.fillRect(px,py,s+1,s+1);ctx.fillStyle="#05090b55";ctx.fillRect(px+3,py+3,s-6,s-6);ctx.strokeStyle="#82979b55";ctx.lineWidth=1.5;ctx.strokeRect(px+2,py+2,s-4,s-4);ctx.beginPath();ctx.moveTo(px+s*.18,py+s*.08);ctx.lineTo(px+s*.42,py+s*.42);ctx.lineTo(px+s*.31,py+s*.9);ctx.moveTo(px+s*.72,py+s*.12);ctx.lineTo(px+s*.62,py+s*.58);ctx.lineTo(px+s*.86,py+s*.86);ctx.stroke();if((d&3)===1){ctx.fillStyle="#9fb2b238";ctx.fillRect(px+s*.12,py+s*.48,s*.76,2)}return}
  if(t.kind==="cisternWall"){ctx.fillStyle=p[d&1];ctx.fillRect(px,py,s+1,s+1);ctx.strokeStyle="#18231f99";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,py+s*.34);ctx.lineTo(px+s,py+s*.34);ctx.moveTo(px,py+s*.68);ctx.lineTo(px+s,py+s*.68);ctx.stroke();ctx.strokeStyle="#6f988052";ctx.lineWidth=1;for(let q=.16;q<.9;q+=.34){ctx.beginPath();ctx.moveTo(px+s*q,py);ctx.quadraticCurveTo(px+s*(q-.12),py+s*.48,px+s*(q+.05),py+s);ctx.stroke()}if((d&3)===2){ctx.strokeStyle="#79aaa466";ctx.beginPath();ctx.arc(px+s*.62,py+s*.76,s*.16,.1,2.7);ctx.stroke()}return}
  if(t.kind==="kilnWall"){ctx.fillStyle=p[d&1];ctx.fillRect(px,py,s+1,s+1);ctx.strokeStyle="#1a0d0bba";ctx.lineWidth=2;for(let row=0;row<3;row++){const yy=py+(row+1)*s/3;ctx.beginPath();ctx.moveTo(px,yy);ctx.lineTo(px+s,yy);ctx.stroke();const offset=(row+(d&1))%2?s*.28:s*.68;ctx.beginPath();ctx.moveTo(px+offset,yy-s/3);ctx.lineTo(px+offset,yy);ctx.stroke()}ctx.strokeStyle="#d8713b42";ctx.lineWidth=1;ctx.strokeRect(px+2,py+2,s-4,s-4);if((d&3)===0){ctx.fillStyle="#e47a4833";ctx.fillRect(px+3,py+s-4,s-6,2)}return}
  if(/DeepWall$/.test(t.kind)){const family=t.kind.replace("DeepWall","");ctx.fillStyle=p[d&1];ctx.fillRect(px,py,s+1,s+1);ctx.strokeStyle={threefold:"#c9956b55",descent:"#79a9bc55",loop:"#b294c955",flooded:"#83bbb055",fortress:"#c1a06f55"}[family]||"#87949a55";ctx.lineWidth=1.5;if(family==="threefold"){ctx.strokeRect(px+3,py+3,s-6,s-6);ctx.beginPath();ctx.moveTo(px+s*.5,py+3);ctx.lineTo(px+s*.5,py+s-3);ctx.stroke()}else if(family==="descent"){for(let q=5;q<s;q+=9){ctx.beginPath();ctx.moveTo(px+3,py+q);ctx.lineTo(px+s-3,py+q+3);ctx.stroke()}}else if(family==="loop"){ctx.beginPath();ctx.arc(px+s*.5,py+s*.5,s*.3,0,5.3);ctx.stroke()}else if(family==="flooded"){ctx.beginPath();ctx.moveTo(px+2,py+s*.3);ctx.quadraticCurveTo(px+s*.5,py+s*.12,px+s-2,py+s*.3);ctx.moveTo(px+2,py+s*.7);ctx.quadraticCurveTo(px+s*.5,py+s*.52,px+s-2,py+s*.7);ctx.stroke()}else{for(let q=s*.33;q<s;q+=s*.33){ctx.beginPath();ctx.moveTo(px,py+q);ctx.lineTo(px+s,py+q);ctx.stroke()}}return}
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
    if(t.kind==="hollowFloor"){ctx.strokeStyle="#94a9aa28";ctx.beginPath();ctx.moveTo(px+s*.12,py+s*.74);ctx.lineTo(px+s*.48,py+s*.38);ctx.lineTo(px+s*.8,py+s*.5);ctx.stroke();if((d&3)===0){ctx.fillStyle="#0c111244";ctx.fillRect(px+s*.62,py+s*.18,s*.18,s*.18)}return}
    if(t.kind==="cisternFloor"){ctx.strokeStyle="#8ab8aa42";ctx.strokeRect(px+2,py+2,s-4,s-4);ctx.fillStyle="#18363255";ctx.beginPath();ctx.ellipse(px+s*(.35+(d&1)*.25),py+s*.62,s*.22,s*.09,0,0,7);ctx.fill();ctx.strokeStyle="#a1c8bd44";ctx.beginPath();ctx.arc(px+s*.55,py+s*.55,s*.18,.2,2.8);ctx.stroke();return}
    if(t.kind==="kilnFloor"){ctx.strokeStyle="#241411aa";ctx.lineWidth=2;ctx.strokeRect(px+2,py+2,s-4,s-4);ctx.fillStyle="#c26a3c55";for(const [qx,qy]of[[.18,.18],[.82,.18],[.18,.82],[.82,.82]]){ctx.beginPath();ctx.arc(px+s*qx,py+s*qy,2,0,7);ctx.fill()}ctx.strokeStyle="#dc7a4544";ctx.beginPath();ctx.moveTo(px+s*.1,py+s*.66);ctx.quadraticCurveTo(px+s*.5,py+s*.5,px+s*.9,py+s*.7);ctx.stroke();return}
    if(/DeepFloor$/.test(t.kind)){const family=t.kind.replace("DeepFloor","");ctx.strokeStyle={threefold:"#d4b08344",descent:"#8dc4d344",loop:"#c6a5dc44",flooded:"#9ad3c844",fortress:"#d0ae7544"}[family]||"#aab3b744";ctx.lineWidth=1;ctx.strokeRect(px+2,py+2,s-4,s-4);if(family==="threefold"){ctx.beginPath();ctx.moveTo(px+s*.5,py+5);ctx.lineTo(px+s*.78,py+s*.72);ctx.lineTo(px+s*.22,py+s*.72);ctx.closePath();ctx.stroke()}else if(family==="loop"){ctx.beginPath();ctx.arc(px+s*.5,py+s*.5,s*.22,0,6);ctx.stroke()}else if(family==="flooded"){ctx.beginPath();ctx.moveTo(px+4,py+s*.62);ctx.quadraticCurveTo(px+s*.5,py+s*.45,px+s-4,py+s*.62);ctx.stroke()}else if(family==="descent"){ctx.beginPath();ctx.moveTo(px+s*.2,py+s*.25);ctx.lineTo(px+s*.5,py+s*.75);ctx.lineTo(px+s*.8,py+s*.25);ctx.stroke()}else{ctx.fillStyle="#d6b77933";for(const[qx,qy]of[[.2,.2],[.8,.2],[.2,.8],[.8,.8]])ctx.fillRect(px+s*qx-1,py+s*qy-1,3,3)}return}
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
  latticeHunter: ["#3e7f88", "#142a32", "#d86ae8"],
  riftGrazer: ["#839b67", "#29372b", "#d7e58d"],
  archiveBehemoth: ["#6b3d78", "#1d1527", "#f0a052"],
  vesperwing:["#8b4b35","#251d1d","#ed8a45"],gravitantBell:["#54726e","#252b2a","#c0a66b"],mireApostle:["#71804d","#25291f","#b6d05c"],knifeChoir:["#675174","#211b29","#c28fe0"],
  npc: ["#9b815d", "#453832", "#879b8d"],
  villager: ["#a88d62", "#4d5a48", "#d9c9a0"],
  pilgrim: ["#b9ad92", "#6b5f4c", "#e7dcc0"],
  peddler: ["#9a6f45", "#5a3f2a", "#e0b35e"],
  mercenary: ["#6f6a62", "#3a3f46", "#b8a27a"],
  minstrel: ["#a35f6c", "#4a2f4f", "#e6c069"],
  scholar: ["#5f6f92", "#2f3550", "#c9cfe6"],
  traveler: ["#8c7d64", "#45403a", "#c7b48c"],
  cartographer: ["#7d8f6a", "#3b4a3a", "#f0d58a"],
  wandererCache: ["#7a5a3a", "#3a2a1c", "#e0c070"],
  militia: ["#8a7a5c", "#3f4a5a", "#c9b27a"],
  shipwright: ["#4f7f9a", "#3a2c22", "#d8c39a"],
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
  viewport: ["#3f7478", "#172b30", "#8de4df"],
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
  annexStair: ["#3a3f7a", "#15172e", "#f2e6a8"], // release 675: a deep annex's stair down
  deepShaft: ["#1b1b22", "#0a0a0e", "#c9b27a"], deepStair: ["#3b2f4a", "#151019", "#e8c2ff"], emberDoor: ["#7a3a1c", "#2a120a", "#ffb35a"], // release 677: the Deep
  storyRelic: ["#8c7650", "#382f24", "#f0cf83"],
  storyTone: ["#557d82", "#26383b", "#9fe6dd"],
};
// Surface sea creatures (water world W3). Submerged: a ripple ring only. Telegraphs: a wake line (Lanceeel), a
// landing shadow (Breachfin), a tight coil ring (Ringcoil), jaws (Sinewake) and bubbles (Bog Lurker).
export function drawSeaCreature(ctx, e, s, now, colors, g) { // exported for the creature preview tests
  const cx = (e.x + .5) * s, cy = (e.y + .72) * s, t = e.seaTele;
  ctx.save();
  if (t?.type === "line") { ctx.strokeStyle = "#ff8a6acc"; ctx.lineWidth = Math.max(2, s * .12); ctx.setLineDash([s * .3, s * .18]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + t.dx * t.len * s, cy + t.dy * t.len * s); ctx.stroke(); ctx.setLineDash([]); }
  if (t?.type === "shadow") { const k = t.big ? 2.4 : e.leviathan ? 1.8 : 1; ctx.fillStyle = "#0b1a2a88"; ctx.strokeStyle = "#ff8a6acc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse((t.x + .5) * s, (t.y + .72) * s, s * .6 * k, s * .3 * k, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  if (t?.type === "rings") for (const m of t.marks) { ctx.strokeStyle = "#ff8a6acc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc((m.x + .5) * s, (m.y + .72) * s, s * (.5 + .1 * Math.sin(now / 90)), 0, 7); ctx.stroke(); }
  if (t?.type === "mark" || t?.type === "grip") { const p = g.player; ctx.strokeStyle = t.type === "grip" ? "#b48cffee" : "#ff8a6acc"; ctx.lineWidth = Math.max(2, s * .08); ctx.beginPath(); if (t.type === "grip") { ctx.moveTo(cx, cy); ctx.quadraticCurveTo((cx + (p.x + .5) * s) / 2, cy - s, (p.x + .5) * s, (p.y + .72) * s); } else ctx.arc((p.x + .5) * s, (p.y + .72) * s, s * .7, 0, 7); ctx.stroke(); }
  if (t?.type === "coil" || t?.type === "jaw") { ctx.strokeStyle = "#ff8a6a99"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, s * .7, 0, 7); ctx.stroke(); }
  if (t?.type === "bubbles") for (let i = 0; i < 5; i++) { const f = (now / 500 + i * .2) % 1; ctx.fillStyle = `rgba(200,230,140,${1 - f})`; ctx.beginPath(); ctx.arc(cx + Math.sin(i * 2.1) * s * .35, cy - f * s * .6, s * (.05 + f * .05), 0, 7); ctx.fill(); }
  if (e.kind === "angler") { const lx = cx + Math.sin(now / 600) * s * .1, ly = cy - s * .55, glow = .6 + .4 * Math.sin(now / 250); ctx.fillStyle = `rgba(255,242,160,${.25 * glow})`; ctx.beginPath(); ctx.arc(lx, ly, s * .35, 0, 7); ctx.fill(); ctx.fillStyle = "#fff2a0"; ctx.beginPath(); ctx.arc(lx, ly, s * .07, 0, 7); ctx.fill(); } // the lure shows even when it hides
  if (e.hidden) { // only a ripple betrays it
    const f = (now / 900 + (e.x + e.y) * .1) % 1; ctx.strokeStyle = `rgba(220,240,255,${.45 * (1 - f)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, cy, s * (.2 + f * .4), s * (.08 + f * .15), 0, 0, 7); ctx.stroke(); ctx.restore(); return;
  }
  if (e.kind === "tentacle") { // a rising limb: a curling column with suckers; a pale ring before it slams
    if (t?.type === "slam") { ctx.strokeStyle = "#ff8a6acc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, s * .95, 0, 7); ctx.stroke(); }
    const sway = Math.sin(now / 240 + e.x) * s * .2; ctx.strokeStyle = e.hitFlash > 0 ? "#f3d2b0" : colors[0]; ctx.lineCap = "round"; ctx.lineWidth = s * .32;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + sway, cy - s * .8, cx - sway * .6, cy - s * 1.5); ctx.stroke();
    ctx.fillStyle = colors[2]; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(cx + sway * i / 4, cy - s * .38 * i, s * .05, 0, 7); ctx.fill(); }
    ctx.restore(); return;
  }
  if (e.leviathan && /Kraken|kraken/.test(e.kind)) { // a kraken body: mantle and resting arms around it
    const k = e.scale || 2;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.sin(now / 700 + i) * .2; ctx.strokeStyle = colors[1]; ctx.lineWidth = s * .16; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + Math.cos(a) * s * k * .5, cy + Math.sin(a) * s * k * .3, cx + Math.cos(a + .4) * s * k * .75, cy + Math.sin(a + .4) * s * k * .45); ctx.stroke(); }
    ctx.fillStyle = e.hitFlash > 0 ? "#f3d2b0" : colors[0]; ctx.strokeStyle = colors[2]; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy - s * .35 * k, s * .42 * k, s * .5 * k, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = colors[2]; for (const q of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + q * s * .16 * k, cy - s * .25 * k, s * .07 * k, 0, 7); ctx.fill(); }
    ctx.restore(); return;
  }
  if ((e.seaKind || e.kind) === "tyrantMosasaur") { drawMosasaur(ctx, e, cx, cy, s, now, colors); ctx.restore(); return; } // release 229
  const lift = (e.leapHeight || 0) * s, f = e.ai?.facing || "down", [fx, fy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[f], n = e.segments || 1;
  if (lift) { ctx.fillStyle = "#00000044"; ctx.beginPath(); ctx.ellipse(cx, cy, s * .4, s * .14, 0, 0, 7); ctx.fill(); }
  for (let i = n - 1; i >= 0; i--) { // trailing body, head last
    const sz = e.scale || 1, wave = Math.sin(now / 160 + i * .9) * s * .12 * sz, bx = cx - fx * s * .32 * sz * i - fy * wave, by = cy - lift - fy * s * .32 * sz * i + fx * wave, r = s * sz * (i ? Math.max(.08, .2 - i * .012) : .27);
    ctx.fillStyle = e.hitFlash > 0 ? "#f3d2b0" : colors[i % 2 ? 1 : 0]; ctx.strokeStyle = colors[2]; ctx.lineWidth = Math.max(1, s * .03);
    ctx.beginPath(); ctx.ellipse(bx, by, Math.max(2, r), Math.max(2, r * .72), Math.atan2(fy, fx), 0, 7); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = colors[2]; ctx.beginPath(); ctx.arc(cx + fx * s * .14 - fy * s * .08, cy - lift + fy * s * .14 + fx * s * .08 - s * .04, Math.max(1.5, s * .05), 0, 7); ctx.fill(); // eye
  if (e.kind === "breachfin") { ctx.fillStyle = colors[1]; ctx.beginPath(); ctx.moveTo(cx - s * .1, cy - lift - s * .15); ctx.lineTo(cx, cy - lift - s * .5); ctx.lineTo(cx + s * .12, cy - lift - s * .15); ctx.fill(); }
  ctx.restore();
}

// Release 229 (Tim): the Tyrant Mosasaur, seen from above as it swims. Its body is semi-segmented: a spine of joints
// laid along the path its head has swum (kept per creature in MOSASAUR_TRAILS, never saved), so it bends through its
// turns; and a whale-like kick runs down it, lifting and dropping the tail more toward its end (raised parts draw
// higher and a little larger; the fluke dips under the surface and fades on the downstroke). Over that spine: a long
// pointed snout whose toothed jaws gape as it locks on and lunges, a heavy banded barrel body with pale flanks, four
// paddle flippers rowing in turn and a downturned, shark-like fluke.
const MOSASAUR_TRAILS = new WeakMap();
const MOSASAUR_KICK = .14; // how high the tail's end rises and falls, as a share of the body's length
const MOSASAUR_WIDTH = [[0, .012], [.06, .035], [.16, .07], [.22, .095], [.32, .145], [.42, .14], [.52, .11], [.64, .07], [.78, .04], [.92, .02], [1, .014]]; // half-widths along the body, as a share of its length
const mosaWidth = (u) => { for (let i = 1; i < MOSASAUR_WIDTH.length; i++) { const [a, wa] = MOSASAUR_WIDTH[i - 1], [b, wb] = MOSASAUR_WIDTH[i]; if (u <= b) return wa + (wb - wa) * (u - a) / (b - a); } return .012; };
function mosasaurSpine(e, lenTiles, n) {
  const dir = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[e.ai?.facing || "down"] || [0, 1];
  let trail = MOSASAUR_TRAILS.get(e);
  if (!trail) { trail = [[e.x, e.y]]; MOSASAUR_TRAILS.set(e, trail); }
  const [hx, hy] = trail[0], moved = Math.hypot(e.x - hx, e.y - hy);
  if (moved > 2.5) trail.splice(0, trail.length, [e.x, e.y]); // a jump (a reload, a long lunge step): start over
  else if (moved > .05) trail.unshift([e.x, e.y]);
  // Keep just enough path for the body; past its end, the body runs straight back from the last point.
  let acc = 0; for (let i = 1; i < trail.length; i++) { acc += Math.hypot(trail[i][0] - trail[i - 1][0], trail[i][1] - trail[i - 1][1]); if (acc > lenTiles + 1) { trail.length = i + 1; break; } }
  const out = []; let seg = 0, along = 0;
  for (let k = 0; k <= n; k++) {
    const want = k / n * lenTiles;
    while (seg < trail.length - 1) { const [ax, ay] = trail[seg], [bx, by] = trail[seg + 1], d = Math.hypot(bx - ax, by - ay); if (along + d >= want) { const f = d ? (want - along) / d : 0; out.push([ax + (bx - ax) * f, ay + (by - ay) * f]); break; } along += d; seg++; }
    if (out.length === k) { const [lx, ly] = trail[trail.length - 1], back = want - along, [px, py] = trail.length > 1 ? trail[trail.length - 2] : [lx + dir[0], ly + dir[1]], dl = Math.hypot(px - lx, py - ly) || 1; out.push([lx - (px - lx) / dl * back, ly - (py - ly) / dl * back]); }
  }
  return out;
}
function drawMosasaur(ctx, e, cx, cy, s, now, colors) {
  const L = s * (e.scale || 3) * 1.15, T = now / 1000, n = 14, phase = e.sea?.phase, striking = phase === "strike";
  const gape = striking ? .55 : phase === "telegraph" ? .32 + .08 * Math.sin(now / 70) : .05 + .03 * Math.sin(T * 1.3);
  const flash = e.hitFlash > 0, back = flash ? "#f3d2b0" : colors[1], hide = flash ? "#f8e0c0" : colors[0], belly = colors[2];
  const ox = cx - (e.x + .5) * s, oy = cy - (e.y + .72) * s; // tile → screen offset, so the spine sits where the creature is drawn
  const spine = mosasaurSpine(e, L / s, n).map(([x, y]) => [(x + .5) * s + ox, (y + .72) * s + oy]);
  // The kick: height above the water (px) at each joint, growing toward the tail; a small side sway as well.
  const rate = striking ? 9 : 3.4, P = spine.map(([x, y], i) => {
    const u = i / n, z = Math.sin(T * rate - u * 3.6) * L * MOSASAUR_KICK * Math.pow(u, 1.5), a = spine[Math.max(0, i - 1)], b = spine[Math.min(n, i + 1)], tx = a[0] - b[0], ty = a[1] - b[1], tl = Math.hypot(tx, ty) || 1;
    const side = Math.sin(T * rate * .5 - u * 3) * L * .015 * u; return { x: x - ty / tl * side, y: y + tx / tl * side - z, z, ux: tx / tl, uy: ty / tl, u };
  });
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
  // Its shadow on the water, where the body would be without the kick.
  ctx.fillStyle = "#00000038"; for (let i = 2; i < n; i += 2) { const [x, y] = spine[i]; ctx.beginPath(); ctx.ellipse(x, y + L * .03, L * mosaWidth(i / n) * 1.1, L * mosaWidth(i / n) * .5, 0, 0, 7); ctx.fill(); }
  const nrm = (p) => [-p.uy, p.ux], at = (u) => { const f = u * n, i = Math.min(n - 1, Math.floor(f)), k = f - i, A = P[i], B = P[i + 1]; return { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k, z: A.z + (B.z - A.z) * k, ux: A.ux, uy: A.uy }; };
  const flipper = (u, side, len, wid, off) => { const p = at(u), [nx, ny] = nrm(p), row = Math.sin(T * 3.2 + off) * .35, w = L * mosaWidth(u), base = Math.atan2(ny * side, nx * side) + Math.atan2(-p.uy, -p.ux) * 0;
    ctx.save(); ctx.translate(p.x + nx * side * w * .8, p.y + ny * side * w * .8); ctx.rotate(Math.atan2(ny * side, nx * side) + side * (.9 - row) * (p.ux * ny - p.uy * nx > 0 ? 1 : -1)); ctx.fillStyle = back; ctx.beginPath(); ctx.ellipse(len * .5, 0, len * .55, wid, 0, 0, 7); ctx.fill(); ctx.strokeStyle = belly + "66"; ctx.lineWidth = Math.max(1, L * .006); ctx.beginPath(); ctx.moveTo(len * .1, wid * .3); ctx.quadraticCurveTo(len * .6, wid * .7, len * 1.02, 0); ctx.stroke(); ctx.restore(); };
  // The fluke, at the tail's end: larger as the tail rises, fading under the surface as it falls.
  { const t = P[n], q = P[n - 1], a = Math.atan2(t.y - q.y, t.x - q.x), up = t.z / (L * MOSASAUR_KICK), sc = 1 + up * .35;
    ctx.save(); ctx.globalAlpha = Math.max(.25, Math.min(1, .7 + up * .5)); ctx.translate(t.x, t.y); ctx.rotate(a); ctx.scale(sc, sc); ctx.fillStyle = back; ctx.beginPath(); ctx.moveTo(-L * .02, 0); ctx.quadraticCurveTo(L * .03, -L * .05, L * .02, -L * .1); ctx.quadraticCurveTo(L * .07, -L * .03, L * .05, 0); ctx.quadraticCurveTo(L * .09, L * .05, L * .06, L * .15); ctx.quadraticCurveTo(L * .03, L * .05, -L * .02, 0); ctx.fill(); ctx.restore(); }
  for (const side of [-1, 1]) flipper(.52, side, L * .15, L * .04, side > 0 ? 1.6 : 0); // rear flippers
  // The body from just behind the head to the tail: one outline through the joints, raised parts a little wider.
  const edge = (i, side) => { const p = P[i], [nx, ny] = nrm(p), w = L * mosaWidth(p.u) * (1 + p.z / L * 1.5); return [p.x + nx * w * side, p.y + ny * w * side]; };
  const body = new Path2D(), from = 3; body.moveTo(...edge(from, 1)); for (let i = from + 1; i <= n; i++) body.lineTo(...edge(i, 1)); for (let i = n; i >= from; i--) body.lineTo(...edge(i, -1)); body.closePath();
  ctx.fillStyle = belly; ctx.fill(body);
  ctx.save(); ctx.clip(body); ctx.lineWidth = L * .12; ctx.strokeStyle = hide; ctx.beginPath(); for (let i = from; i <= n; i++) i === from ? ctx.moveTo(P[i].x, P[i].y) : ctx.lineTo(P[i].x, P[i].y); ctx.stroke();
  ctx.lineWidth = L * .055; ctx.strokeStyle = back; ctx.stroke(); // the dark back down the middle, flanks paler
  ctx.strokeStyle = "#0000004a"; ctx.lineWidth = L * .022; for (let u = .28; u <= .62; u += .068) { const p = at(u), [nx, ny] = nrm(p), w = L * mosaWidth(u); ctx.beginPath(); ctx.moveTo(p.x + nx * w, p.y + ny * w); ctx.quadraticCurveTo(p.x - p.ux * L * .02, p.y - p.uy * L * .02, p.x - nx * w, p.y - ny * w); ctx.stroke(); } // bands across the back
  ctx.restore();
  ctx.strokeStyle = belly + "77"; ctx.lineWidth = Math.max(1, L * .005); ctx.stroke(body);
  for (const side of [-1, 1]) flipper(.3, side, L * .19, L * .05, side > 0 ? 0 : 1.6); // front flippers, larger
  // The head at the front joint: a heavy skull, and jaws that part from a hinge behind the eyes.
  const h = at(.2), hx = h.x, hy = h.y, ha = Math.atan2(P[0].y - h.y, P[0].x - h.x);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ha);
  const jaw = (sign) => { ctx.save(); ctx.rotate(sign * gape * .5); ctx.fillStyle = sign < 0 ? hide : mixHex(hide, belly, .35); ctx.beginPath(); ctx.moveTo(0, sign * L * .075); ctx.quadraticCurveTo(L * .13, sign * L * .07, L * .27, sign * L * .008); ctx.lineTo(L * .27, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f4ecd2"; for (let k = 1; k < 9; k++) { const x = k / 9 * L * .25; ctx.beginPath(); ctx.moveTo(x - L * .007, 0); ctx.lineTo(x, -sign * L * .02); ctx.lineTo(x + L * .007, 0); ctx.fill(); } ctx.restore(); };
  if (gape > .08) { ctx.fillStyle = "#5a1414"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-gape * .5) * L * .26, Math.sin(-gape * .5) * L * .26); ctx.lineTo(Math.cos(gape * .5) * L * .26, Math.sin(gape * .5) * L * .26); ctx.closePath(); ctx.fill(); }
  jaw(1); jaw(-1);
  ctx.fillStyle = back; ctx.beginPath(); ctx.ellipse(-L * .01, 0, L * .075, L * .08, 0, 0, 7); ctx.fill();
  for (const side of [-1, 1]) { ctx.fillStyle = "#f2c84a"; ctx.beginPath(); ctx.ellipse(L * .03, side * L * .05, L * .016, L * .011, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#120c06"; ctx.beginPath(); ctx.ellipse(L * .033, side * L * .05, L * .004, L * .009, 0, 0, 7); ctx.fill(); }
  ctx.restore(); ctx.restore();
}
const mixHex = (a, b, k) => { const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), x = p(a), y = p(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(",")})`; };

// The skiff (water world W2): a plank hull with a bow pointing along `facing`, bobbing on the water.
function drawSkiff(ctx, x, y, s, facing, now) {
  const cx = (x + .5) * s, cy = (y + .72) * s + Math.sin(now / 420 + x) * s * .03, along = facing === "left" || facing === "right";
  ctx.save(); ctx.translate(cx, cy); if (!along) ctx.rotate(Math.PI / 2); if (facing === "left" || facing === "up") ctx.scale(-1, 1);
  ctx.fillStyle = "#00000044"; ctx.beginPath(); ctx.ellipse(0, s * .08, s * .62, s * .2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#6b4a2e"; ctx.beginPath(); ctx.moveTo(-s * .55, -s * .16); ctx.lineTo(s * .38, -s * .16); ctx.quadraticCurveTo(s * .66, 0, s * .38, s * .16); ctx.lineTo(-s * .55, s * .16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#c9a571"; ctx.lineWidth = Math.max(1, s * .04); ctx.stroke();
  ctx.fillStyle = "#8d6a43"; for (const k of [-.3, .05]) ctx.fillRect(k * s, -s * .13, s * .07, s * .26);
  ctx.restore();
}
// Release 269 (Tim: "it can turn into... a Viking longboat with a sail and a mast... the head of the Viking boat...
// something interesting, something cosmic, something understated... [for] the Wanderer's position in this whole cosmic
// nightmare"; then "show it in a profile in like an isometric view... we can see... the sides of a hull that are
// somewhat submerged in the water as it rides along the water"): while the hull guard holds, the skiff is a clinker-
// built longboat seen three-quarters on: a foreshortened deck, the near side of the hull with its strakes and a row of
// round shields, the lower hull under a foaming waterline, a stem post curling up into a spiral from which a
// lantern hangs, a little spiral galaxy behind its glass, a lower stern curl, and an upright mast with a striped square sail. It always shows its
// side: heading up or down it keeps its last side-on bearing.
// Release 311/315: the submersible is a small robot (Tim, release 315: "the submersible should kind of look like a robot...
// with a big large viewpoint... some very short legs... 2 robotic arms that extend from it... some boosters on the back...
// a little bit larger than the player"). part "back" draws the boosters, shell and the viewport's frame behind the
// Wayfarer; "front" draws the glass over them, the lower body (hiding their legs), the short legs and the arms. At sea
// (`water`) everything below the waterline is drowned in blue; diving, only an arm breaks the surface, with bubbles.
// Release 321: the drone. A round silver body with a blue eye toward its facing, two rotor arms with spinning discs, a
// rocket pod underneath; carrying, two claws reach down to the Wayfarer's shoulders. `heal` (0..1) glows it green.
function drawDrone(ctx, x, y, s, facing, now, carrying = false, heal = 0, residual = false) {
  const cx = (x + .5) * s, cy = (y + .45) * s + Math.sin(now / 260) * s * .04, u = s * .34, dir = facing === "left" ? -1 : 1, spin = now / 40;
  ctx.save();
  if(!residual){
  if (carrying) { ctx.strokeStyle = "#6f7880"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.lineCap = "round"; for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + side * u * .5, cy + u * .55); ctx.lineTo(cx + side * u * .95, cy + u * 1.6); ctx.lineTo(cx + side * u * .7, cy + u * 2.05); ctx.stroke(); } }
  ctx.fillStyle = "#00000033"; ctx.beginPath(); ctx.ellipse(cx, cy + s * (carrying ? 1.75 : 1.05), u * 1.1, u * .3, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#4b525a"; ctx.lineWidth = Math.max(1.5, s * .06); ctx.beginPath(); ctx.moveTo(cx - u * 1.55, cy - u * .35); ctx.lineTo(cx + u * 1.55, cy - u * .35); ctx.stroke();
  for (const side of [-1, 1]) { const rx = cx + side * u * 1.55, ry = cy - u * .55; ctx.fillStyle = "#3a4048"; ctx.fillRect(rx - u * .12, ry, u * .24, u * .3); ctx.fillStyle = "#d8e6ee88"; ctx.beginPath(); ctx.ellipse(rx, ry, u * .8, u * .2, 0, 0, 7); ctx.fill(); ctx.strokeStyle = "#ffffffdd"; ctx.lineWidth = Math.max(1.5, s * .04); ctx.beginPath(); ctx.moveTo(rx - Math.cos(spin + side) * u * .75, ry - Math.sin(spin + side) * u * .14); ctx.lineTo(rx + Math.cos(spin + side) * u * .75, ry + Math.sin(spin + side) * u * .14); ctx.stroke(); }
  ctx.fillStyle = "#5d656e"; ctx.fillRect(cx - u * .45, cy + u * .45, u * .9, u * .32); ctx.fillStyle = "#e0623c"; for (const k of [-.25, 0, .25]) { ctx.beginPath(); ctx.arc(cx + k * u, cy + u * .78, u * .09, 0, 7); ctx.fill(); }
  const body = ctx.createRadialGradient(cx - u * .3, cy - u * .35, u * .1, cx, cy, u); body.addColorStop(0, "#f4f7fa"); body.addColorStop(.6, "#b9c2ca"); body.addColorStop(1, "#6d767f");
  ctx.fillStyle = body; ctx.strokeStyle = "#3a4048"; ctx.lineWidth = Math.max(1, s * .035); ctx.beginPath(); ctx.ellipse(cx, cy, u, u * .78, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#14202a"; ctx.beginPath(); ctx.ellipse(cx + dir * u * .38, cy, u * .36, u * .3, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#5fd6f0"; ctx.beginPath(); ctx.arc(cx + dir * u * .45, cy, u * .15, 0, 7); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(cx + dir * u * .5, cy - u * .06, u * .05, 0, 7); ctx.fill();
  }
  if (heal > 0) { ctx.globalAlpha = Math.min(1, heal) * .7; ctx.strokeStyle = "#7dff9a"; ctx.lineWidth = Math.max(2, s * .08); ctx.beginPath(); ctx.ellipse(cx, cy, u * 1.35, u * 1.1, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
}
// The drone fizzle (Tim, 2026-11-04: "your drone will explode or fizzle out, noticeably"; vehicle-gates.ts DRONE_FIZZLE): where the
// lift failed, a white-hot flash, a ring bursting outward, DRONE_FIZZLE.sparks sparks flying off and falling, and a dark puff. With
// reduced motion a short still flash and ring. Fixed angles per spark (no allocation, nothing random).
function drawDroneFizzle(ctx, fz, s, now, reduce = false) {
  const span = Math.max(1, fz.until - fz.at), k = Math.max(0, Math.min(1, (now - fz.at) / span)); if (k >= 1) return;
  const cx = (fz.x + .5) * s, cy = (fz.y - .52) * s, u = s * .34, fade = 1 - k; // where the carrying drone was drawn
  ctx.save();
  if (k < .25) { const f = 1 - k / .25, glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, u * 2.4); glow.addColorStop(0, `rgba(255,250,220,${.95 * f})`); glow.addColorStop(.4, `rgba(140,220,255,${.6 * f})`); glow.addColorStop(1, "rgba(140,220,255,0)"); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, u * 2.4, 0, 7); ctx.fill(); }
  ctx.globalAlpha = fade; ctx.strokeStyle = "#9fe6ff"; ctx.lineWidth = Math.max(1.5, s * .06 * fade); ctx.beginPath(); ctx.arc(cx, cy, u * (reduce ? 1.4 : .6 + 2.6 * Math.sqrt(k)), 0, 7); ctx.stroke();
  if (!reduce) {
    ctx.strokeStyle = "#fff2b0"; ctx.lineCap = "round"; ctx.lineWidth = Math.max(1, s * .04);
    for (let i = 0; i < DRONE_FIZZLE.sparks; i++) { const a = i * 2.39996 + .4, sp = .9 + (i * 37 % 10) / 10, r = u * (.4 + 3.2 * k * sp), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r + s * 1.6 * k * k, tail = u * .35 * fade;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * tail, y - Math.sin(a) * tail - s * .3 * k); ctx.stroke(); }
    ctx.globalAlpha = .45 * fade; ctx.fillStyle = "#2a2f36"; ctx.beginPath(); ctx.arc(cx, cy - s * .5 * k, u * (.5 + 1.2 * k), 0, 7); ctx.fill();
  }
  ctx.restore();
}
// The empowered robot (release 389; redrawn in release 391, Tim: "less... more understated... more like a spacesuit...
// almost like a Black Panther suit, but still spacey, like Iron Man or War Machine... it looks too much like a Gundam or
// Ultraman Tiga... we don't want to depart from the overall gritty, down-to-earth feel"). Drawn in place of the Wayfarer, at
// their size: a dark graphite pressure suit, segmented and scuffed, with low plates at chest, shoulders, knees and forearms,
// a smooth helmet with one smoked visor band, a compact life-support pack with hoses to the chest, a dim amber status
// light (violet in releases 393 to 473, amber in 475, the Wayfarer's eye colour from 477), and small, cold thrusters at the back and heels that only show while it boosts.
export function drawPowerSuit(ctx, x, y, s, facing, now, frame = 0, attacking = false, boosting = false) {
  const t = now / 1000, k = x * s + s / 2, base = y * s + s * .84, u = s * .9, side = facing === "left" || facing === "right", back = facing === "up", dir = facing === "left" ? -1 : 1;
  const plate = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, "#5d636b"); g.addColorStop(.4, "#363a41"); g.addColorStop(1, "#1a1c20"); return g; };
  const suit = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, "#2c3036"); g.addColorStop(1, "#121418"); return g; };
  const edge = "#0a0b0d", worn = "#8a8f96", amber = COLORS.player[2], lw = Math.max(1, u * .016); // release 393 made it violet; 475 amber; 477 the Wayfarer's eye colour
  // Release 393 (Tim: "the same purple cosmic world as the lantern, rather than that golden... emblem... all the gold [should]
  // be that same color"): a small orb of night glass with a two-armed spiral of light and a bright core. Release 475 (Tim:
  // "the sigil on his armor should be yellow, not purple... the same sigil, but the golden or amber... the same as his eyes"):
  // the same sigil, in amber.
  // Release 477 (Tim: "take out the penumbra or the glow around it... just have the sigil... the color that his eyes are, and
  // that's it"): no halo, no glass orb, no motes; only the two-armed spiral and its core, in the Wayfarer's eye colour.
  const cosmos = (cx, cy, r) => { const eye = COLORS.player[2]; ctx.strokeStyle = eye; ctx.lineWidth = Math.max(.6, r * .18); ctx.lineCap = "round"; const spin = t * .5;
    for (const arm of [0, Math.PI]) { ctx.beginPath(); for (let q = 0; q <= 1.0001; q += .1) { const a = arm + spin + q * 4.2, rr = r * (.08 + q * .8); ctx[q ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .85); } ctx.stroke(); }
    ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(cx, cy, Math.max(.7, r * .2), 0, Math.PI * 2); ctx.fill(); ctx.lineCap = "butt"; };
  const poly = (pts, fill, stroke = edge) => { ctx.beginPath(); pts.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](px, py)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); };
  const seg = (x0, y0, x1, y1, w0, w1, fill) => { const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a); poly([[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]], fill || suit(x0 - w0, y0, x1 + w1, y1)); };
  const glowAt = (gx, gy, r, c, a) => { const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, c + Math.round(a * 255).toString(16).padStart(2, "0")); g.addColorStop(1, c + "00"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill(); };
  const scuff = (x0, y0, x1, y1) => { ctx.strokeStyle = worn + "66"; ctx.lineWidth = Math.max(.6, u * .006); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
  const jet = (jx, jy, len) => { const g = ctx.createLinearGradient(jx, jy, jx, jy + len); g.addColorStop(0, "#e8f6ff"); g.addColorStop(.35, "#7fb9d8aa"); g.addColorStop(1, "#4a7fa000"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(jx - u * .025, jy); ctx.lineTo(jx + u * .025, jy); ctx.lineTo(jx, jy + len); ctx.closePath(); ctx.fill(); };
  ctx.save(); ctx.translate(k, base); if (side) ctx.scale(dir, 1);
  ctx.fillStyle = "rgba(4,6,10,.45)"; ctx.beginPath(); ctx.ellipse(0, 0, u * .26, u * .07, 0, 0, Math.PI * 2); ctx.fill();
  const walk = frame ? Math.sin(t * 9) : 0, bob = Math.abs(walk) * u * .012; ctx.translate(0, -bob);
  if (boosting) { const fl = u * (.22 + .06 * Math.sin(t * 38)); for (const jx of side ? [-u * .17] : [-u * .09, u * .09]) jet(jx, -u * .5, fl); for (const jx of side ? [0] : [-u * .07, u * .07]) jet(jx, 0, fl * .7); }
  if (side) {
    const st = walk * u * .09;
    for (const [o, a] of [[-1, .65], [1, 1]]) { const fx = o * st; ctx.globalAlpha = a; seg(0, -u * .38, fx * .5 + u * .01, -u * .2, u * .05, u * .045); seg(fx * .5 + u * .01, -u * .2, fx, -u * .03, u * .042, u * .04); poly([[fx - u * .05, -u * .045], [fx + u * .08, -u * .03], [fx + u * .085, 0], [fx - u * .055, 0]], plate(fx - u * .05, -u * .05, fx + u * .08, 0)); poly([[fx * .5 - u * .025, -u * .25], [fx * .5 + u * .055, -u * .24], [fx * .5 + u * .05, -u * .17], [fx * .5 - u * .02, -u * .17]], plate(0, -u * .25, u * .05, -u * .17)); ctx.globalAlpha = 1; } // legs, knee plates, boots
    poly([[-u * .2, -u * .73], [-u * .09, -u * .75], [-u * .08, -u * .48], [-u * .19, -u * .46]], plate(-u * .2, -u * .75, -u * .08, -u * .46)); // the life-support pack
    ctx.strokeStyle = "#202328"; ctx.lineWidth = Math.max(1.5, u * .022); ctx.beginPath(); ctx.moveTo(-u * .1, -u * .52); ctx.quadraticCurveTo(-u * .02, -u * .5, u * .06, -u * .6); ctx.stroke(); // a hose round to the chest
    poly([[-u * .085, -u * .4], [u * .065, -u * .4], [u * .085, -u * .55], [u * .075, -u * .74], [-u * .09, -u * .75], [-u * .095, -u * .55]], suit(-u * .1, -u * .75, u * .09, -u * .4)); // torso
    poly([[-u * .02, -u * .72], [u * .075, -u * .71], [u * .085, -u * .56], [u * .0, -u * .55]], plate(0, -u * .72, u * .09, -u * .55)); // chest plate
    ctx.fillStyle = "#24272c"; ctx.fillRect(-u * .09, -u * .44, u * .17, u * .035); // belt
    cosmos(u * .062, -u * .645, u * .028);
    const ex = attacking ? u * .1 : u * .015, ey = attacking ? -u * .62 : -u * .56, hx = attacking ? u * .21 : u * .035, hy = attacking ? -u * .62 : -u * .43;
    seg(0, -u * .71, ex, ey, u * .035, u * .03); seg(ex, ey, hx, hy, u * .036, u * .032, plate(ex, ey, hx, hy)); ctx.fillStyle = "#16181b"; ctx.beginPath(); ctx.arc(hx, hy, u * .028, 0, Math.PI * 2); ctx.fill(); // arm, forearm plate, glove
    poly([[-u * .075, -u * .78], [u * .035, -u * .79], [u * .045, -u * .7], [-u * .07, -u * .69]], plate(-u * .07, -u * .79, u * .04, -u * .69)); // shoulder plate
    // Helmet: a smooth dome, the visor band wrapping forward, a small side module.
    ctx.fillStyle = plate(-u * .1, -u * .98, u * .1, -u * .78); ctx.beginPath(); ctx.ellipse(-u * .005, -u * .875, u * .095, u * .1, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = edge; ctx.stroke();
    const vg = ctx.createLinearGradient(0, -u * .92, 0, -u * .84); vg.addColorStop(0, "#3c5560"); vg.addColorStop(.5, "#0c1216"); vg.addColorStop(1, "#1b2a30"); ctx.fillStyle = vg; ctx.beginPath(); ctx.moveTo(u * .0, -u * .915); ctx.quadraticCurveTo(u * .095, -u * .915, u * .093, -u * .865); ctx.quadraticCurveTo(u * .09, -u * .835, u * .0, -u * .84); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#9cc6d455"; ctx.lineWidth = Math.max(.6, u * .007); ctx.beginPath(); ctx.moveTo(u * .02, -u * .905); ctx.lineTo(u * .07, -u * .9); ctx.stroke();
    poly([[-u * .07, -u * .9], [-u * .035, -u * .9], [-u * .035, -u * .85], [-u * .07, -u * .85]], plate(-u * .07, -u * .9, -u * .03, -u * .85)); scuff(u * .02, -u * .7, u * .05, -u * .66);
  } else {
    for (const sx of [-1, 1]) { const lx = sx * u * .07, lo = (frame ? Math.sin(t * 9 + (sx > 0 ? Math.PI : 0)) : 0) * u * .018;
      seg(lx, -u * .38, lx + sx * u * .005, -u * .2 + lo, u * .055, u * .046); seg(lx + sx * u * .005, -u * .2 + lo, lx, -u * .035 + lo, u * .045, u * .04);
      poly([[lx - u * .045, -u * .25 + lo], [lx + u * .045, -u * .25 + lo], [lx + u * .04, -u * .17 + lo], [lx - u * .04, -u * .17 + lo]], plate(lx - u * .05, -u * .26, lx + u * .05, -u * .17)); // knee plates
      poly([[lx - u * .055, -u * .05 + lo], [lx + u * .055, -u * .05 + lo], [lx + u * .06, lo], [lx - u * .06, lo]], plate(lx - u * .06, -u * .05, lx + u * .06, 0)); } // boots
    poly([[-u * .11, -u * .4], [u * .11, -u * .4], [u * .145, -u * .62], [u * .13, -u * .75], [-u * .13, -u * .75], [-u * .145, -u * .62]], suit(-u * .15, -u * .76, u * .15, -u * .4)); // the torso, a dark pressure suit
    ctx.strokeStyle = "#0e1013"; ctx.lineWidth = Math.max(.8, u * .01); for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(-u * .1, -u * (.46 + r * .025)); ctx.lineTo(u * .1, -u * (.46 + r * .025)); ctx.stroke(); } // ribbed waist
    ctx.fillStyle = "#24272c"; ctx.fillRect(-u * .12, -u * .43, u * .24, u * .035); for (const sx of [-1, 1]) { ctx.fillStyle = "#2e3238"; ctx.fillRect(sx * u * .07 - u * .025, -u * .43, u * .05, u * .045); } // belt and pouches
    if (back) { poly([[-u * .1, -u * .74], [u * .1, -u * .74], [u * .095, -u * .48], [-u * .095, -u * .48]], plate(-u * .1, -u * .74, u * .1, -u * .48)); for (const sx of [-1, 1]) { ctx.fillStyle = "#121418"; ctx.beginPath(); ctx.ellipse(sx * u * .055, -u * .5, u * .025, u * .014, 0, 0, Math.PI * 2); ctx.fill(); } ctx.strokeStyle = "#0e1013"; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-u * .08, -u * .66); ctx.lineTo(u * .08, -u * .66); ctx.stroke(); glowAt(u * .06, -u * .7, u * .025, amber, .5); } // the life-support pack
    else { poly([[-u * .1, -u * .73], [u * .1, -u * .73], [u * .11, -u * .6], [u * .05, -u * .55], [-u * .05, -u * .55], [-u * .11, -u * .6]], plate(-u * .1, -u * .74, u * .1, -u * .55)); // the chest plate
      for (const sx of [-1, 1]) { ctx.strokeStyle = "#1c1f23"; ctx.lineWidth = Math.max(1.5, u * .02); ctx.beginPath(); ctx.moveTo(sx * u * .12, -u * .7); ctx.quadraticCurveTo(sx * u * .15, -u * .6, sx * u * .08, -u * .56); ctx.stroke(); } // hoses from the pack
      cosmos(0, -u * .64, u * .042); // the lantern's cosmos at the heart of the chest plate
      scuff(-u * .08, -u * .7, -u * .04, -u * .66); scuff(u * .03, -u * .6, u * .07, -u * .63); }
    for (const sx of [-1, 1]) { const ax = sx * u * .165, raise = attacking && sx > 0 ? -u * .08 : 0;
      seg(ax, -u * .7, ax + sx * u * .012, -u * .53 + raise, u * .036, u * .032); seg(ax + sx * u * .012, -u * .53 + raise, ax + sx * u * .018, -u * .39 + raise, u * .036, u * .032, plate(ax - u * .04, -u * .53, ax + u * .04, -u * .39)); // arm, forearm plate
      ctx.fillStyle = "#16181b"; ctx.beginPath(); ctx.arc(ax + sx * u * .018, -u * .37 + raise, u * .028, 0, Math.PI * 2); ctx.fill(); // glove
      poly([[sx * u * .1, -u * .775], [sx * u * .21, -u * .76], [sx * u * .215, -u * .68], [sx * u * .14, -u * .67]], plate(sx * u * .1, -u * .78, sx * u * .22, -u * .67)); } // shoulder plates
    // Helmet: a smooth dome, one smoked visor band, a small side module and its stub antenna.
    ctx.fillStyle = plate(-u * .1, -u * .98, u * .1, -u * .78); ctx.beginPath(); ctx.ellipse(0, -u * .875, u * .095, u * .1, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = edge; ctx.stroke();
    ctx.fillStyle = "#1a1c20"; ctx.fillRect(-u * .05, -u * .79, u * .1, u * .025); // neck seal
    if (!back) { const vg = ctx.createLinearGradient(0, -u * .92, 0, -u * .835); vg.addColorStop(0, "#3c5560"); vg.addColorStop(.45, "#0c1216"); vg.addColorStop(1, "#1b2a30"); ctx.fillStyle = vg; ctx.beginPath(); ctx.moveTo(-u * .082, -u * .9); ctx.quadraticCurveTo(0, -u * .925, u * .082, -u * .9); ctx.quadraticCurveTo(u * .085, -u * .855, u * .06, -u * .838); ctx.quadraticCurveTo(0, -u * .83, -u * .06, -u * .838); ctx.quadraticCurveTo(-u * .085, -u * .855, -u * .082, -u * .9); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#9cc6d455"; ctx.lineWidth = Math.max(.6, u * .007); ctx.beginPath(); ctx.moveTo(-u * .055, -u * .898); ctx.quadraticCurveTo(-u * .02, -u * .91, u * .01, -u * .905); ctx.stroke(); }
    poly([[u * .088, -u * .9], [u * .112, -u * .9], [u * .112, -u * .85], [u * .088, -u * .85]], plate(u * .088, -u * .9, u * .112, -u * .85)); ctx.strokeStyle = "#2a2d32"; ctx.lineWidth = Math.max(.8, u * .008); ctx.beginPath(); ctx.moveTo(u * .1, -u * .9); ctx.lineTo(u * .1, -u * .97); ctx.stroke();
  }
  ctx.restore();
}
function drawSubmersible(ctx, x, y, s, facing, now, part = "back", diving = 0, water = true, boosting = false) {
  const cx = (x + .5) * s, base = (y + .98) * s + (water ? Math.sin(now / 420 + x) * s * .03 : 0), dir = facing === "left" ? -1 : 1, t = now / 1000, u = s * 1.2;
  const metal = (y0, y1) => { const g = ctx.createLinearGradient(-u * .5, y0, u * .5, y1); g.addColorStop(0, "#f2f5f8"); g.addColorStop(.5, "#b9c1ca"); g.addColorStop(1, "#6f7883"); return g; };
  ctx.save(); ctx.translate(cx, base); ctx.scale(dir, 1);
  const waterline = -u * .3;
  if (diving > 0) {
    if (part === "back") {
      ctx.globalAlpha = .5; ctx.fillStyle = "#0b2a3a"; ctx.beginPath(); ctx.ellipse(0, -u * .2, u * .42, u * .22, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = "#d8f2ff99"; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { const k = (t * 1.6 + i * .21) % 1; ctx.beginPath(); ctx.arc(u * (.2 - i * .1), -u * (.3 + k * .4), u * (.025 + k * .03), 0, 7); ctx.stroke(); }
      ctx.strokeStyle = "#c9cfd6"; ctx.lineWidth = u * .07; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(u * .18, -u * .28); ctx.lineTo(u * .26, -u * .62); ctx.stroke();
      ctx.lineWidth = u * .035; ctx.beginPath(); ctx.moveTo(u * .26, -u * .62); ctx.lineTo(u * .18, -u * .74); ctx.moveTo(u * .26, -u * .62); ctx.lineTo(u * .35, -u * .72); ctx.moveTo(u * .26, -u * .62); ctx.lineTo(u * .28, -u * .76); ctx.stroke(); ctx.lineCap = "butt";
    }
    ctx.restore(); return;
  }
  const torsoY = -u * .62, torsoR = u * .4;
  if (part === "back") {
    ctx.fillStyle = "#00000040"; ctx.beginPath(); ctx.ellipse(0, 0, u * .48, u * .12, 0, 0, 7); ctx.fill();
    // boosters on the back, with a flicker of flame
    for (const bx of [-u * .3, u * .3]) { ctx.fillStyle = "#8f979f"; ctx.fillRect(bx - u * .07, torsoY - u * .3, u * .14, u * .36); ctx.strokeStyle = "#3a4048"; ctx.lineWidth = 1; ctx.strokeRect(bx - u * .07, torsoY - u * .3, u * .14, u * .36);
      if (!water) { const len = boosting ? .55 + .12 * Math.sin(t * 25) : .16 + .05 * Math.sin(t * 15), wide = boosting ? .08 : .05; ctx.fillStyle = `rgba(255,170,70,${.5 + .3 * Math.sin(t * 12 + bx)})`; ctx.beginPath(); ctx.moveTo(bx - u * wide, torsoY + u * .06); ctx.lineTo(bx, torsoY + u * len); ctx.lineTo(bx + u * wide, torsoY + u * .06); ctx.fill(); if (boosting) { ctx.fillStyle = "#fff3c0cc"; ctx.beginPath(); ctx.moveTo(bx - u * .03, torsoY + u * .06); ctx.lineTo(bx, torsoY + u * len * .55); ctx.lineTo(bx + u * .03, torsoY + u * .06); ctx.fill(); } } }
    ctx.fillStyle = metal(torsoY - torsoR, torsoY + torsoR); ctx.beginPath(); ctx.ellipse(0, torsoY, torsoR, torsoR * 1.02, 0, 0, 7); ctx.fill(); ctx.strokeStyle = "#3a4048"; ctx.lineWidth = Math.max(1, u * .025); ctx.stroke();
    ctx.fillStyle = "#3a4048"; ctx.beginPath(); ctx.arc(0, torsoY - u * .05, u * .27, 0, 7); ctx.fill(); // the viewport's frame
    ctx.fillStyle = "#123848"; ctx.beginPath(); ctx.arc(0, torsoY - u * .05, u * .23, 0, 7); ctx.fill();
  } else {
    // the lower body (over the Wayfarer's legs), then the short legs
    ctx.save(); ctx.beginPath(); ctx.rect(-u, torsoY + u * .14, u * 2, u); ctx.clip();
    ctx.fillStyle = metal(torsoY - torsoR, torsoY + torsoR); ctx.beginPath(); ctx.ellipse(0, torsoY, torsoR, torsoR * 1.02, 0, 0, 7); ctx.fill(); ctx.strokeStyle = "#3a4048"; ctx.lineWidth = Math.max(1, u * .025); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = "#3a4048"; ctx.lineWidth = Math.max(1.5, u * .03); ctx.beginPath(); ctx.arc(0, torsoY - u * .05, u * .26, Math.PI * .1, Math.PI * .9); ctx.stroke();
    const step = water ? 0 : Math.sin(t * 6) * u * .03;
    for (const [lx, k] of [[-u * .16, 1], [u * .16, -1]]) { ctx.fillStyle = "#7d858e"; ctx.fillRect(lx - u * .06, torsoY + torsoR * .8, u * .12, u * .2 + k * step); ctx.fillStyle = "#4b525a"; ctx.beginPath(); ctx.ellipse(lx, torsoY + torsoR * .8 + u * .2 + k * step, u * .11, u * .045, 0, 0, 7); ctx.fill(); }
    // the glass
    const glass = ctx.createRadialGradient(-u * .07, torsoY - u * .14, u * .02, 0, torsoY - u * .05, u * .23); glass.addColorStop(0, "#d8f6ff55"); glass.addColorStop(1, "#5fc6e033"); ctx.fillStyle = glass; ctx.beginPath(); ctx.arc(0, torsoY - u * .05, u * .23, 0, 7); ctx.fill();
    ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = Math.max(1, u * .02); ctx.beginPath(); ctx.arc(0, torsoY - u * .05, u * .17, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    ctx.strokeStyle = "#c9cfd6"; ctx.lineWidth = Math.max(1.5, u * .03); ctx.beginPath(); ctx.arc(0, torsoY - u * .05, u * .24, 0, 7); ctx.stroke();
    // two robotic arms from the shoulders, elbows bent, with three-fingered manipulators
    const sway = Math.sin(t * 2.2) * .12; ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      const sx = side * torsoR * .92, sy = torsoY + u * .02, ex = sx + side * u * .2, ey = sy + u * (.12 + side * sway * .3), hx = ex + side * u * .08, hy = ey + u * .2;
      ctx.strokeStyle = "#5d656e"; ctx.lineWidth = u * .09; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = "#d3d9df"; ctx.lineWidth = u * .045; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = "#3a4048"; ctx.beginPath(); ctx.arc(ex, ey, u * .045, 0, 7); ctx.fill();
      ctx.strokeStyle = "#3a4048"; ctx.lineWidth = Math.max(1, u * .028); ctx.beginPath(); for (const f of [-.5, 0, .5]) { ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.sin(f) * u * .06, hy + Math.cos(f) * u * .08); } ctx.stroke();
    }
    ctx.lineCap = "butt";
    if (water) { // below the waterline the sea covers it
      ctx.save(); ctx.beginPath(); ctx.rect(-u, waterline, u * 2, u); ctx.clip();
      const sea = ctx.createRadialGradient(0, waterline, u * .1, 0, waterline, u * .62); sea.addColorStop(0, "#1d5a86f2"); sea.addColorStop(.75, "#1d5a86d0"); sea.addColorStop(1, "#1d5a8600");
      ctx.fillStyle = sea; ctx.beginPath(); ctx.ellipse(0, waterline, u * .62, u * .42, 0, 0, 7); ctx.fill(); ctx.restore();
      ctx.strokeStyle = "#cfefffaa"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, waterline, u * (.46 + .03 * Math.sin(t * 2)), u * .08, 0, 0, 7); ctx.stroke(); // a ring of ripples where it meets the water
    }
  }
  ctx.restore();
}
function drawLongboat(ctx, x, y, s, facing, now, side = "right", part = "back") {
  const dir = facing === "left" || (facing !== "right" && side === "left") ? -1 : 1, rock = Math.sin(now / 480 + x) * s * .035;
  const cx = (x + .5) * s, gy = (y + .6) * s + rock, L = s * .86, D = s * .13, H = s * .26, wl = H * .6;
  ctx.save(); ctx.translate(cx, gy); ctx.scale(dir, 1);
  // the hull's near side, from gunwale (y 0) down past the waterline, its ends sweeping up into the posts
  const hull = () => { ctx.beginPath(); ctx.moveTo(-L, -s * .06); ctx.quadraticCurveTo(-L * .86, H, -L * .55, H); ctx.lineTo(L * .55, H); ctx.quadraticCurveTo(L * .86, H, L, -s * .06); ctx.lineTo(L * .95, 0); ctx.lineTo(-L * .95, 0); ctx.closePath(); };
  if (part === "front") { // drawn over the Wayfarer, so they sit inside the boat
  ctx.fillStyle = "#00000040"; ctx.beginPath(); ctx.ellipse(0, wl + s * .04, L * 1.02, s * .09, 0, 0, 7); ctx.fill();
  hull(); ctx.fillStyle = "#6a4629"; ctx.fill();
  ctx.save(); hull(); ctx.clip(); ctx.strokeStyle = "#8c6039"; ctx.lineWidth = Math.max(1, s * .022);
  for (const k of [.28, .55, .82]) { ctx.beginPath(); ctx.moveTo(-L, k * H - s * .04); ctx.quadraticCurveTo(0, k * H + s * .015, L, k * H - s * .04); ctx.stroke(); } // clinker strakes
  ctx.restore();
  hull(); ctx.strokeStyle = "#3e2614"; ctx.lineWidth = Math.max(1, s * .03); ctx.stroke();
  for (let k = 0; k < 5; k++) { // the near shields, hung along the gunwale
    const sx = -L * .5 + k * L * .25, sy = s * .03; ctx.fillStyle = ["#7b2f2a", "#c9b48c", "#2f4a5a"][k % 3];
    ctx.beginPath(); ctx.arc(sx, sy, s * .068, 0, 7); ctx.fill(); ctx.strokeStyle = "#2a1a0e"; ctx.lineWidth = Math.max(1, s * .02); ctx.stroke();
    ctx.fillStyle = "#b9a27a"; ctx.beginPath(); ctx.arc(sx, sy, s * .022, 0, 7); ctx.fill();
  }
  // the waterline: the sea laps over the lower hull, with a line of foam
  ctx.fillStyle = "#1d4f78b0"; ctx.beginPath(); ctx.moveTo(-L * 1.05, wl); for (let k = 0; k <= 12; k++) { const qx = -L * 1.05 + k * L * 2.1 / 12; ctx.lineTo(qx, wl + Math.sin(now / 300 + k * 1.3) * s * .012); } ctx.lineTo(L * 1.05, H + s * .08); ctx.lineTo(-L * 1.05, H + s * .08); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#e8f4ffcc"; ctx.lineWidth = Math.max(1, s * .025); ctx.beginPath(); for (let k = 0; k <= 12; k++) { const qx = -L * 1.02 + k * L * 2.04 / 12, qy = wl + Math.sin(now / 300 + k * 1.3) * s * .012; k ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); } ctx.stroke();
    ctx.restore(); return;
  }
  // the deck, foreshortened behind the near gunwale
  ctx.beginPath(); ctx.moveTo(-L * .95, 0); ctx.quadraticCurveTo(-L * .7, -D, -L * .4, -D); ctx.lineTo(L * .4, -D); ctx.quadraticCurveTo(L * .7, -D, L * .95, 0); ctx.closePath();
  ctx.fillStyle = "#8a6038"; ctx.fill(); ctx.strokeStyle = "#3e2614"; ctx.lineWidth = Math.max(1, s * .025); ctx.stroke();
  ctx.strokeStyle = "#6f4b2c"; ctx.lineWidth = Math.max(1, s * .015); for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * L * .2, -D * .9); ctx.lineTo(k * L * .2, -s * .01); ctx.stroke(); } // thwarts
  for (let k = 0; k < 5; k++) { const sx = -L * .5 + k * L * .25; ctx.fillStyle = "#4a3324"; ctx.beginPath(); ctx.ellipse(sx, -D * .95, s * .05, s * .022, 0, Math.PI, 0); ctx.fill(); } // the far shields' rims
  // the posts: the stem rises and curls into a spiral from which the lantern hangs; the stern curls lower
  const post = (px, up, r, sgn) => { ctx.strokeStyle = "#4a2f17"; ctx.lineWidth = Math.max(1.5, s * .045); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(px, -s * .06); ctx.quadraticCurveTo(px + sgn * s * .1, -up * .5, px + sgn * s * .06, -up); for (let t = 0; t <= 5; t += .25) { const rr = r * (1 - t / 6), a = Math.PI + t * sgn; ctx.lineTo(px + sgn * s * .06 + r + Math.cos(a) * rr * sgn, -up + Math.sin(a) * rr - (r - rr) * .2); } ctx.stroke(); };
  post(L, s * .42, s * .1, 1); post(-L, s * .26, s * .07, -1);
  const hx = L + s * .16, hy = -s * .44, glow = .6 + Math.sin(now / 1300) * .2;
  // a lantern hangs still from the curl (Tim: "the figurehead should be a lantern... a spiral in it... like a spiral
  // galaxy"): a short cord, a dark iron cap and frame, and behind the glass a small two-armed spiral of pale light
  const lx = hx - s * .02, ly = hy + s * .1, lw = s * .11, lh = s * .14;
  ctx.strokeStyle = "#2a1a0e"; ctx.lineWidth = Math.max(1, s * .018); ctx.beginPath(); ctx.moveTo(lx, hy - s * .02); ctx.lineTo(lx, ly - lh / 2); ctx.stroke();
  ctx.fillStyle = `rgba(150,170,255,${glow * .28})`; ctx.beginPath(); ctx.arc(lx, ly, s * .14, 0, 7); ctx.fill();
  ctx.fillStyle = "#121726"; ctx.fillRect(lx - lw / 2, ly - lh / 2, lw, lh); // the glass, dark like night
  ctx.save(); ctx.beginPath(); ctx.rect(lx - lw / 2, ly - lh / 2, lw, lh); ctx.clip();
  ctx.strokeStyle = `rgba(214,226,255,${.75 + glow * .25})`; ctx.lineWidth = Math.max(1, s * .016); ctx.lineCap = "round";
  for (const arm of [0, Math.PI]) { ctx.beginPath(); for (let t = 0; t <= 1; t += .1) { const a = arm + t * 4.2, r = s * (.005 + t * .042); const qx = lx + Math.cos(a) * r, qy = ly + Math.sin(a) * r * .8; t ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); } ctx.stroke(); }
  ctx.fillStyle = "#f4f2ff"; ctx.beginPath(); ctx.arc(lx, ly, Math.max(1, s * .014), 0, 7); ctx.fill(); // its bright core
  ctx.restore();
  ctx.strokeStyle = "#3a2c22"; ctx.lineWidth = Math.max(1, s * .02); ctx.strokeRect(lx - lw / 2, ly - lh / 2, lw, lh); // the frame
  ctx.fillStyle = "#3a2c22"; ctx.beginPath(); ctx.moveTo(lx - lw * .62, ly - lh / 2); ctx.lineTo(lx, ly - lh / 2 - s * .045); ctx.lineTo(lx + lw * .62, ly - lh / 2); ctx.closePath(); ctx.fill(); // the cap
  ctx.fillRect(lx - lw * .6, ly + lh / 2, lw * 1.2, s * .02); // the base
  // the mast and its square sail, upright, forward of the Wayfarer who sits amidships
  const mx = L * .42, top = -s * 1.32, sw = s * .6, belly = s * (.08 + Math.sin(now / 760) * .02);
  ctx.strokeStyle = "#3a2412"; ctx.lineWidth = Math.max(2, s * .055); ctx.beginPath(); ctx.moveTo(mx, -D * .5); ctx.lineTo(mx, top - s * .08); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mx - sw / 2, top); ctx.quadraticCurveTo(mx, top - belly * .4, mx + sw / 2, top); ctx.lineTo(mx + sw / 2 + belly * .2, top + s * .7); ctx.quadraticCurveTo(mx, top + s * .7 + belly, mx - sw / 2 - belly * .2, top + s * .7); ctx.closePath();
  ctx.fillStyle = "#e9dcbc"; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = "#a33a2f"; for (let k = 0; k < 4; k++) ctx.fillRect(mx - sw / 2 + k * sw / 3.5, top - s * .1, sw / 7, s); ctx.restore();
  ctx.strokeStyle = "#6e5a3c"; ctx.lineWidth = Math.max(1, s * .025); ctx.stroke();
  ctx.strokeStyle = "#3a2412"; ctx.lineWidth = Math.max(1.5, s * .045); ctx.beginPath(); ctx.moveTo(mx - sw / 2 - s * .05, top); ctx.lineTo(mx + sw / 2 + s * .05, top); ctx.stroke(); // the yard
  ctx.restore();
}
// Release 269: a small REPAIR tag over a skiff the Build button would patch.
function repairTag(ctx, x, y, s) { const bx = (x + .5) * s, by = (y + .2) * s; ctx.fillStyle = "#1d1c19e0"; ctx.fillRect(bx - s * .5, by - s * .32, s, s * .3); ctx.strokeStyle = "#b58c50"; ctx.lineWidth = 1; ctx.strokeRect(bx - s * .5, by - s * .32, s, s * .3); ctx.fillStyle = "#f0dbb5"; ctx.font = `bold ${Math.max(8, Math.round(s * .2))}px monospace`; ctx.textAlign = "center"; ctx.fillText("REPAIR", bx, by - s * .11); ctx.textAlign = "start"; }
// Release 197: an Elder Wanderer. Tall and faceless on four stilt legs; its body is its own rule, unfolding upward
// row by row, in the rule's colour. A pale disc floats where a head would be.
export function drawElder(ctx, o, s, now) {
  const hue = (o.rule * 137.508) % 360, walking = o.state === "walking", T = now / 1000 + (o.phase || 0) * 10;
  const cx = (o.x + .5) * s, foot = (o.y + .95) * s, H = s * 2.2, bodyW = s * .5, bodyTop = foot - H, bodyBot = foot - H * .42, bob = walking ? Math.sin(T * 3) * s * .03 : Math.sin(T) * s * .015;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(cx, foot, s * .45, s * .12, 0, 0, 7); ctx.fill();
  // Four long jointed legs, stepping in turn.
  ctx.strokeStyle = `hsl(${hue},25%,22%)`; ctx.lineWidth = Math.max(1.5, s * .045); ctx.lineCap = "round";
  for (let k = 0; k < 4; k++) {
    const side = k < 2 ? -1 : 1, front = k % 2 ? 1 : -1, ph = walking ? Math.sin(T * 3 + k * 1.6) : 0;
    const hip = [cx + side * bodyW * .3, bodyBot + bob], toe = [cx + side * s * (.28 + front * .1) + ph * s * .12, foot - Math.max(0, ph) * s * .08], knee = [cx + side * s * .48, (hip[1] + toe[1]) / 2 - s * .2];
    ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...knee); ctx.lineTo(...toe); ctx.stroke();
  }
  // The body: a cloak of its rule, rows rising; a fresh random row every 26 rows, so even rules that die out show
  // their character.
  const cols = 9, rowsShown = 15, rows = elderRuleRows(o), cw = bodyW / cols, ch = (bodyBot - bodyTop) / rowsShown, scroll = (T * 2.2) % (rows.length - rowsShown);
  const top = Math.floor(scroll);
  ctx.save(); ctx.beginPath(); ctx.moveTo(cx - bodyW / 2, bodyBot + bob); ctx.lineTo(cx - bodyW / 2, bodyTop + bodyW * .4 + bob); ctx.quadraticCurveTo(cx, bodyTop - bodyW * .2 + bob, cx + bodyW / 2, bodyTop + bodyW * .4 + bob); ctx.lineTo(cx + bodyW / 2, bodyBot + bob); ctx.closePath();
  ctx.fillStyle = `hsl(${hue},40%,8%)`; ctx.fill(); ctx.clip();
  ctx.fillStyle = `hsl(${hue},85%,64%)`;
  for (let y = 0; y <= rowsShown; y++) { const row = rows[(top + y) % rows.length]; for (let x = 0; x < cols; x++) if (row[x]) ctx.fillRect(cx - bodyW / 2 + x * cw + cw * .1, bodyBot + bob - (y + 1 - (scroll - top)) * ch + ch * .1, cw * .8, ch * .8); }
  ctx.restore();
  ctx.strokeStyle = `hsla(${hue},70%,70%,.6)`; ctx.lineWidth = 1; ctx.strokeRect(cx - bodyW / 2, bodyTop + bodyW * .4 + bob, bodyW, bodyBot - bodyTop - bodyW * .4);
  // The head: a pale floating disc with a faint halo, no face.
  const hy = bodyTop - s * .32 + bob + Math.sin(T * 1.3) * s * .04;
  const halo = ctx.createRadialGradient(cx, hy, 0, cx, hy, s * .45); halo.addColorStop(0, `hsla(${hue},90%,80%,.45)`); halo.addColorStop(1, `hsla(${hue},90%,80%,0)`);
  ctx.fillStyle = halo; ctx.fillRect(cx - s * .45, hy - s * .45, s * .9, s * .9);
  ctx.fillStyle = `hsl(${hue},30%,88%)`; ctx.beginPath(); ctx.ellipse(cx, hy, s * .13, s * .16, 0, 0, 7); ctx.fill();
  ctx.restore();
}
// Release 215: a strange tree, shrub or stone (strange.ts). Its own shape, but wrong: a pale ghost of it drifts half a
// step out of place and back, it flickers now and then, and slow motes rise from it. No label: you notice it or not.
// Release 225: something in the rock. A faint glint on the face of a wall block that hides treasure: a few points of
// light that brighten and fade in turn, so it reads as catching the light, not as a marker.
// HOLE_DROPS (labyrinths.ts): the green rim round a hole you can drop through safely. Only the tiles within `rim.near` of the
// Wayfarer are looked at (a small box, no allocation; the safe mask is cached per floor), each edge drawn where the safe hole
// meets anything else, fading in from `near` to `full`. Reduced motion: no breath. Low quality: a thinner line.
export function drawSafeDropRims(ctx, map, mw, p, s, now, quality, quiet, seen = () => true) {
  const mask = holeDrops(map); if (!mask) return;
  const R = HOLE_DROPS.rim, mh = map.height || Math.floor(map.tiles.length / mw), cx = p.x + .5, cy = p.y + .5, n = Math.ceil(R.near);
  const x0 = Math.max(0, Math.floor(cx) - n), x1 = Math.min(mw - 1, Math.floor(cx) + n), y0 = Math.max(0, Math.floor(cy) - n), y1 = Math.min(mh - 1, Math.floor(cy) + n);
  const breath = quiet ? 1 : 1 - R.pulseDepth * (.5 + .5 * Math.sin(now / R.pulse * Math.PI * 2)), lw = Math.max(1, s * (quality === "low" ? R.lowWidth : R.width)), safe = (x, y) => x >= 0 && y >= 0 && x < mw && y < mh && mask[y * mw + x] === 1;
  let begun = false;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (mask[y * mw + x] !== 1 || !seen(x, y)) continue;
    const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d > R.near) continue;
    const a = Math.min(1, (R.near - d) / Math.max(.01, R.near - R.full)) * R.alpha * breath; if (a < .03) continue;
    if (!begun) { ctx.save(); ctx.lineWidth = lw; ctx.lineCap = "round"; begun = true; }
    ctx.strokeStyle = `rgba(${R.rgb},${a.toFixed(3)})`; ctx.beginPath();
    const px = x * s, py = y * s, i = lw / 2;
    if (!safe(x, y - 1)) { ctx.moveTo(px, py + i); ctx.lineTo(px + s, py + i); }
    if (!safe(x, y + 1)) { ctx.moveTo(px, py + s - i); ctx.lineTo(px + s, py + s - i); }
    if (!safe(x - 1, y)) { ctx.moveTo(px + i, py); ctx.lineTo(px + i, py + s); }
    if (!safe(x + 1, y)) { ctx.moveTo(px + s - i, py); ctx.lineTo(px + s - i, py + s); }
    ctx.stroke();
  }
  if (begun) ctx.restore();
}
export function drawWallGlint(ctx, q, s, now) {
  const cx = (q.x + .5) * s, cy = (q.y + .55) * s;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const ph = now / 900 + i * 2.1 + q.x * .7 + q.y * 1.3, a = Math.max(0, Math.sin(ph)) ** 6, px = cx + Math.sin(i * 2.4 + q.y) * s * .28, py = cy + Math.cos(i * 1.7 + q.x) * s * .22;
    if (a < .02) continue;
    ctx.fillStyle = `rgba(255,236,170,${.85 * a})`; ctx.beginPath(); ctx.arc(px, py, Math.max(1, s * .035), 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,236,170,${.5 * a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - s * .1 * a, py); ctx.lineTo(px + s * .1 * a, py); ctx.moveTo(px, py - s * .1 * a); ctx.lineTo(px, py + s * .1 * a); ctx.stroke();
  }
  ctx.restore();
}
// Release 225: a patch of disturbed earth (or, once dug, turned earth): a low mound of darker soil ringed by a few stones.
// Release 431: a cracked bronze bell on a weathered frame; a rung one hangs still with a faint warm glow.
// Release 595: a torn page lying on the floor, its corner lifting; an unread one gives off a faint light.
// Release 633: the great tree above its own tiles. The trunk's tiles (a column `top` levels high, drawn in the ground cache with
// the branches round it, so branches in front cover it and those behind are hidden) end there; from that top the trunk goes on up,
// `rise` tiles past it (far beyond the top of the screen), boughs and masses of leaf on alternating sides, a crown at the very top.
// Sorted with the actors at the trunk's top row. A few dozen shapes, only while in view.
// Release 635: the sky above the great trees (from `from` levels it fades in, solid by `full`) and the leaf glider.
export const SKY = { from: 9, full: 20, top: "#5fa8e8", bottom: "#cfe8fb", clouds: 7 };
function drawSkyAbove(ctx, x0, y0, w, h, a, now, s) {
  ctx.save(); ctx.globalAlpha = a; const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, SKY.top); g.addColorStop(1, SKY.bottom); ctx.fillStyle = g; ctx.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
  ctx.fillStyle = "#ffffffd0"; for (let i = 0; i < SKY.clouds; i++) { const cx = x0 + ((i * 173 + now / (60 + i * 9)) % (w + 240)) - 120, cy = y0 + h * ((i * 0.37) % 1), r = s * (1 + (i % 3) * .5);
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.8, r * .6, 0, 0, Math.PI * 2); ctx.ellipse(cx + r, cy - r * .3, r, r * .55, 0, 0, Math.PI * 2); ctx.ellipse(cx - r, cy - r * .2, r * .9, r * .5, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function drawLeafGlider(ctx, p, s, now) {
  const cx = (p.x + .5) * s, cy = (p.y - .45) * s, sway = Math.sin(now / 260) * s * .04, span = s * .95;
  ctx.save(); ctx.strokeStyle = "#5a3d22"; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath(); ctx.moveTo(cx - s * .12, cy + s * .55); ctx.lineTo(cx - span * .7, cy + sway); ctx.moveTo(cx + s * .12, cy + s * .55); ctx.lineTo(cx + span * .7, cy - sway); ctx.stroke(); // the vine lines
  ctx.fillStyle = "#3f8a35"; ctx.strokeStyle = "#1f4a1a"; ctx.beginPath(); ctx.moveTo(cx - span, cy + s * .12 + sway); ctx.quadraticCurveTo(cx, cy - s * .42, cx + span, cy + s * .12 - sway); ctx.quadraticCurveTo(cx, cy - s * .12, cx - span, cy + s * .12 + sway); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#6fb85a"; ctx.beginPath(); for (let k = -3; k <= 3; k++) { ctx.moveTo(cx, cy - s * .2); ctx.lineTo(cx + k * span * .3, cy + s * .02); } ctx.stroke();
  ctx.restore();
}
export const CANOPY_LOOK = { leaf: ["#2c6326", "#3f8a35", "#1f4a1a", "#4f9a3f"], bark: ["#6b4a2c", "#3e2916"], rise: 30, boughEvery: 3.2, vines: 5 };
function drawCanopyDressing(ctx, c, s, now, tiles = null, mw = 32, box = null) {
  const look = c.look != null ? TREES.looks[c.look] : null, C0 = look ? { ...CANOPY_LOOK, bark: look.bark, leaf: look.leaf, rise: c.low ? 0 : CANOPY_LOOK.rise } : CANOPY_LOOK, C = SEASON && SEASONS.canopy[SEASON] ? { ...C0, leaf: SEASONS.canopy[SEASON] } : C0 /* release 679 */, x0 = c.x0 * s, w = c.size * s, cx = x0 + w / 2, topY = c.y0 * s - discLift(c.top) * CANOPY_LIFT * s, sway = Math.sin(now / 1700) * s * .05, end = topY - C.rise * s;
  ctx.save();
  if (c.boughs) drawTreeBoughs(ctx, c, C, s, sway, tiles, mw, box); // release 645: the decorative boughs down the trunk (twigs now, kept off the platforms)
  if (c.low) { // release 645: a grove's lesser tree: its crown is a level of the canopy, ringed with leaves, with vines below
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, r = w * .62; ctx.fillStyle = C.leaf[k % C.leaf.length]; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r + sway, topY + s * .5 + Math.sin(a) * r * .6 + (Math.sin(a) < 0 ? 0 : s * .4), s * (.55 + (k % 3) * .12), 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); return;
  }
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, C.bark[0]); g.addColorStop(.6, C.bark[1]); g.addColorStop(1, "#1d1209"); ctx.fillStyle = g;
  // The trunk goes on up from the crown's back edge (it stood on the crown's front half and hid it: great-tree review, 2026-11-05).
  ctx.beginPath(); ctx.moveTo(x0, topY); ctx.lineTo(x0 + w * .12, end); ctx.lineTo(x0 + w * .88, end); ctx.lineTo(x0 + w, topY); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#00000033"; ctx.lineWidth = Math.max(1, s * .05); for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0 + w * k / 4, topY); ctx.lineTo(x0 + w * (.12 + .76 * k / 4), end); ctx.stroke(); }
  for (let y = topY - s * 1.2, i = 0; y > end; y -= C.boughEvery * s, i++) { // twigs and leaf masses on alternating sides (thin: nothing up here is a platform)
    const side = i % 2 ? 1 : -1, bx = side > 0 ? x0 + w * .9 : x0 + w * .1, reach = s * (2.4 + (i * 37 % 10) / 6), ey = y - s * .9;
    ctx.strokeStyle = C.bark[1]; ctx.lineWidth = Math.max(1.5, s * TREE_LIMBS.above); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + side * reach * .5, y - s * .2, bx + side * reach + sway, ey); ctx.stroke();
    for (let k = 0; k < 4; k++) { ctx.fillStyle = C.leaf[(i + k) % C.leaf.length]; ctx.beginPath(); ctx.arc(bx + side * reach + sway + (k - 1.5) * s * .55, ey - s * (.2 + (k % 2) * .4), s * (.75 - k * .08), 0, Math.PI * 2); ctx.fill(); }
  }
  for (let k = 0; k < 7; k++) { ctx.fillStyle = C.leaf[k % C.leaf.length]; ctx.beginPath(); ctx.arc(cx + (k - 3) * s * .9 + sway, end + s * (k % 2 ? .3 : -.4), s * 1.5, 0, Math.PI * 2); ctx.fill(); } // the crown, far above
  ctx.strokeStyle = "#3f8a35"; ctx.lineWidth = Math.max(1, s * .05); // vines down the trunk to the landing
  for (let i = 0; i < C.vines; i++) { const vx = x0 + (i + .5) / C.vines * w, len = s * (2 + (i * 29 % 10) / 3); ctx.beginPath(); ctx.moveTo(vx, topY); ctx.quadraticCurveTo(vx + sway * 4, topY + len * .5, vx + sway, topY + len); ctx.stroke(); }
  ctx.restore();
}
// Release 645: boughs off a great tree's trunk that nothing walks on: a curved limb out to one side at a hashed height,
// tipped with a spray of leaves. They hang from the trunk's sides, so the climb on the branches stays in sight.
// Great-tree review (Tim, 2026-11-05: "the brown portions that look like platforms should be what you can walk on"; "branches
// with orange leaves... look like footholds but aren't"): a bough is a twig now (`TREE_LIMBS.bough` of a tile thick, against
// the platforms' full tile of wood), its leaves are the point of it, and any bough that would cross a platform's drawn face is
// not drawn at all (`boughsClear`, worked out once per tree and kept on its record). Every brown slab you see is wood you can
// stand on.
export const TREE_LIMBS = { bough: .07, above: .1, clear: .35 }; // line widths in tiles; `clear`: a bough keeps this far from any platform's drawn face
export function boughsClear(c, tiles, w, box) {
  if (c._boughsClear && c._boughsTiles === tiles) return c._boughsClear;
  const rects = []; if (tiles && box) for (let y = Math.max(0, box.y); y < Math.min(Math.floor(tiles.length / w), box.y + box.n); y++) for (let x = Math.max(0, box.x); x < Math.min(w, box.x + box.n); x++) { const t = tiles[y * w + x]; if (t?.canopy && t.kind !== "canopyTrunk") { const h = Math.max(0, (t.elev || 0) - (t.slope ? .5 : 0)) * LIFT_PER_LEVEL * tileLiftScale(t); rects.push([x, y - h, x + 1, y - h + 1.26]); } }
  const foot = c.y0 + c.size, M = TREE_LIMBS.clear;
  c._boughsClear = (c.boughs || []).filter((b) => { const y = foot - discLift(Math.max(2, b.at * c.top)) * CANOPY_LIFT, bx = b.side > 0 ? c.x0 + c.size : c.x0, ex = bx + b.side * b.len, x0 = Math.min(bx, ex) - M, x1 = Math.max(bx, ex) + M, y0 = y - .4 - b.lift - .7 - M, y1 = y + .2 + M; return !rects.some(([a, b0, a1, b1]) => x1 > a && x0 < a1 && y1 > b0 && y0 < b1); });
  c._boughsTiles = tiles; return c._boughsClear;
}
function drawTreeBoughs(ctx, c, C, s, sway, tiles, w, box) {
  const x0 = c.x0 * s, wd = c.size * s, foot = (c.y0 + c.size) * s;
  ctx.lineCap = "round";
  for (const b of boughsClear(c, tiles, w, box)) {
    const y = foot - discLift(Math.max(2, b.at * c.top)) * CANOPY_LIFT * s, bx = b.side > 0 ? x0 + wd : x0, len = b.len * s, ex = bx + b.side * len + sway, ey = y - s * (.4 + b.lift);
    ctx.strokeStyle = C.bark[1]; ctx.lineWidth = Math.max(1.5, s * TREE_LIMBS.bough); ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + b.side * len * .55, y + s * .15, ex, ey); ctx.stroke();
    ctx.strokeStyle = C.bark[0]; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); ctx.moveTo(bx + b.side * len * .45, y + s * .05); ctx.lineTo(bx + b.side * len * .7, y - s * .45); ctx.stroke(); // a twig
    for (let k = 0; k < b.leaves + 2; k++) { ctx.fillStyle = C.leaf[k % C.leaf.length]; ctx.beginPath(); ctx.arc(ex + (k - (b.leaves + 1) / 2) * s * .32, ey - s * (.1 + (k % 2) * .28), s * (.42 - k * .03), 0, Math.PI * 2); ctx.fill(); }
  }
}
// The crown veil (Tim, 2026-11-05: "the skyway door at the top should not be visible from the ground... once you're high enough
// that the ground beneath starts to become obscured, the gate starts to become visible"). From the ground the door tree's crown,
// its door and its Crown Rest lie under a mass of leaves; the mass thins as the Wayfarer climbs, from the height the sky
// begins to show to `below` levels under the crown, where it is gone. Since the tall spires came back (Tim accepted "about
// halfway up") it starts thinning `from` of the way up the climb (never below SKY.from, where the ground starts to fade), not at
// SKY.from itself, and is gone `below` levels under the crown whatever the tree's height (a 48-level spire's veil had gone by
// level 20, under halfway). Rendering only. Drawn after
// everything on the crown, only while it still has any alpha; a dozen arcs, no state, still under reduced motion.
export const CROWN_VEIL = { from: .5, below: 2, leaves: 12, pad: .5, rise: 1.3, leaf: .62, grow: .18 }; // pad: tiles past the crown's sides; rise: tiles above its top; leaf: a leaf mass's radius in tiles, every third one `grow` larger
// Does this object stand in the strip a great tree's trunk is drawn up (its columns, from its foot to its drawn crown)?
export function behindGreatTrunk(cn, o) { for (const tr of cn.trees || [cn]) { if (o.x + .5 >= tr.x0 - .3 && o.x + .5 <= tr.x0 + tr.size + .3 && o.y < tr.y0 + tr.size && o.y >= tr.y0 - discLift(tr.top) * CANOPY_LIFT - 1) return true; } return false; }
// The canopy grove (trees.ts TREES_V21.canopy; Tim, 2026-11-05: "a canopy area up above the floor, where the floor is kind of
// invisible"): up among its crowns the ground is gone. From `below` levels under the access crown the sky shows whole whatever
// the height (SKY alone would still show some ground under a low canopy), and `leaves` leaf masses hang `under` levels beneath the
// bridges, so the crowns read as a roof of leaves over a floor you cannot see. Rendering only; a fixed handful of arcs, worked
// out from the record each frame (no state), drawn only on a canopy grove's section while the Wayfarer is up there.
export const CANOPY_FLOOR = { below: 3, ramp: 4, leaves: 16, under: 4, leaf: 1.1, alpha: .55 };
export function canopyFloorReveal(canopy, height) {
  if (canopy?.form !== "canopy" || !Number.isFinite(height)) return 0; const base = Number(canopy.trees?.[0]?.top) || Number(canopy.top) || 0, full = base - CANOPY_FLOOR.below;
  return Math.max(0, Math.min(1, (height - (full - CANOPY_FLOOR.ramp)) / CANOPY_FLOOR.ramp));
}
function drawCanopyFloor(ctx, c, s, alpha) {
  const F = CANOPY_FLOOR, b = c.box, base = Number(c.trees?.[0]?.top) || c.top, look = c.trees?.[0]?.look != null ? TREES.looks[c.trees[0].look] : null, leaf = (SEASON && SEASONS.canopy[SEASON]) || (look ? look.leaf : CANOPY_LOOK.leaf), lift = discLift(Math.max(0, base - F.under)) * CANOPY_LIFT * s;
  ctx.save(); ctx.globalAlpha = alpha * F.alpha;
  for (let k = 0; k < F.leaves; k++) { const u = ((k * 7) % F.leaves + .5) / F.leaves, v = ((k * 5) % F.leaves + .5) / F.leaves; ctx.fillStyle = leaf[k % leaf.length]; ctx.beginPath(); ctx.arc((b.x + u * b.n) * s, (b.y + v * b.n) * s - lift, s * F.leaf * (1 + (k % 3) * .25), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
export function crownReveal(height, top) { const from = Math.max(SKY.from, top * CROWN_VEIL.from), full = Math.max(from + 1, top - CROWN_VEIL.below); return Math.max(0, Math.min(1, (height - from) / (full - from))); }
function drawCrownVeil(ctx, c, s, now, alpha, still) {
  const look = c.look != null ? TREES.looks[c.look] : null, leaf = (SEASON && SEASONS.canopy[SEASON]) || (look ? look.leaf : CANOPY_LOOK.leaf), V = CROWN_VEIL;
  const x0 = (c.x0 - V.pad) * s, x1 = (c.x0 + c.size + V.pad) * s, topY = c.y0 * s - discLift(c.top) * CANOPY_LIFT * s, y0 = topY - V.rise * s, y1 = topY + (c.size + .4) * s, sway = still ? 0 : Math.sin(now / 1900) * s * .04;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = leaf[1] || leaf[0]; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2 + sway, (y0 + y1) / 2, (x1 - x0) * .5, (y1 - y0) * .45, 0, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < V.leaves; k++) { const u = (k * 7 % V.leaves) / V.leaves, v = (k * 5 % V.leaves) / V.leaves; ctx.fillStyle = leaf[k % leaf.length]; ctx.beginPath(); ctx.arc(x0 + u * (x1 - x0) + sway, y0 + v * (y1 - y0), s * (V.leaf + (k % 3) * V.grow), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// Release 631: the door in the giant tree's crown: an arch of woven branches and vine, filled with stars (to a Starfield
// crossing) or with drifting cloud (to a cloud hold).
export function drawCanopyGate(ctx, o, s, now) {
  const cx = (o.x + .5) * s, base = (o.y + .9) * s, w = s * .42, hgt = s * 1.15, stars = o.dest === "starfield";
  ctx.save();
  ctx.beginPath(); ctx.moveTo(cx - w, base); ctx.lineTo(cx - w, base - hgt * .6); ctx.quadraticCurveTo(cx, base - hgt * 1.15, cx + w, base - hgt * .6); ctx.lineTo(cx + w, base); ctx.closePath();
  if (stars) { ctx.fillStyle = "#0b0e11"; ctx.fill(); ctx.save(); ctx.clip(); for (let i = 0; i < 9; i++) { const a = (i * 2.399 + now / 4000) % 6.283, rr = (i % 4 + 1) * s * .08; ctx.fillStyle = i % 3 ? "#ffffffaa" : "#fff0c4"; ctx.fillRect(cx + Math.cos(a) * rr, base - hgt * .45 + Math.sin(a) * rr, Math.max(1, s * .03), Math.max(1, s * .03)); } ctx.restore(); }
  else { const g = ctx.createLinearGradient(0, base - hgt, 0, base); g.addColorStop(0, "#f4f8ff"); g.addColorStop(1, "#b9d4ef"); ctx.fillStyle = g; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = "#ffffffcc"; for (let i = 0; i < 3; i++) { const x = cx - w + ((now / 1800 + i * .4) % 1.2) * w * 2; ctx.beginPath(); ctx.ellipse(x, base - hgt * (.25 + i * .18), s * .2, s * .07, 0, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
  ctx.strokeStyle = "#5a3d22"; ctx.lineWidth = Math.max(2, s * .1); ctx.lineJoin = "round"; ctx.stroke();
  ctx.strokeStyle = "#3f8a35"; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); for (let k = 0; k <= 12; k++) { const t = k / 12, x = cx - w + t * 2 * w, y = base - hgt * (.6 + .5 * Math.sin(t * Math.PI)) + Math.sin(k * 1.7) * s * .04; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
  ctx.restore();
}
// Release 627: a thread's piece (threads.ts): a small object in the thread's colour, by its `relic` shape, glowing until read.
export function drawThreadRelic(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .62) * s, read = o.state === "read", c = o.colour || "#e8dcc0", bob = read ? 0 : Math.sin(now / 650 + o.x) * s * .03;
  ctx.save();
  if (!read) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * .7); g.addColorStop(0, c + "55"); g.addColorStop(1, c + "00"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, s * .7, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#00000040"; ctx.beginPath(); ctx.ellipse(cx, cy + s * .28, s * .22, s * .06, 0, 0, 7); ctx.fill();
  ctx.translate(cx, cy + bob); ctx.globalAlpha = read ? .6 : 1; ctx.fillStyle = c; ctx.strokeStyle = "#2a241c"; ctx.lineWidth = Math.max(1, s * .03);
  const R = (x, y, w, h) => { ctx.fillRect(x * s, y * s, w * s, h * s); ctx.strokeRect(x * s, y * s, w * s, h * s); };
  switch (o.relic) {
    case "lamp": ctx.beginPath(); ctx.moveTo(-s * .12, -s * .1); ctx.lineTo(s * .12, -s * .1); ctx.lineTo(s * .09, s * .2); ctx.lineTo(-s * .09, s * .2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = read ? "#fff2c0" : "#ffb347"; ctx.beginPath(); ctx.arc(0, s * .05, s * .05, 0, 7); ctx.fill(); ctx.strokeStyle = "#2a241c"; ctx.beginPath(); ctx.arc(0, -s * .16, s * .06, Math.PI, 0); ctx.stroke(); break;
    case "letter": ctx.rotate(-.15); R(-.2, -.13, .4, .26); ctx.beginPath(); ctx.moveTo(-s * .2, -s * .13); ctx.lineTo(0, s * .02); ctx.lineTo(s * .2, -s * .13); ctx.stroke(); break;
    case "stone": ctx.beginPath(); ctx.ellipse(0, 0, s * .17, s * .25, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#1b1a20"; ctx.beginPath(); ctx.arc(0, -s * .06, s * .045, 0, 7); ctx.fill(); break;
    case "clock": ctx.beginPath(); ctx.arc(0, 0, s * .17, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * .11); ctx.moveTo(0, 0); ctx.lineTo(s * .07, s * .03); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -s * .2, s * .04, 0, 7); ctx.stroke(); break;
    case "coin": ctx.beginPath(); ctx.ellipse(0, s * .08, s * .16, s * .08, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, s * .02, s * .16, s * .08, 0, 0, 7); ctx.fill(); ctx.stroke(); break;
    case "moth": for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(k * s * .11, 0, s * .12, s * .16, k * .5, 0, 7); ctx.fill(); ctx.stroke(); } ctx.fillStyle = "#3a3040"; ctx.fillRect(-s * .025, -s * .14, s * .05, s * .28); break;
    case "book": R(-.18, -.14, .36, .28); ctx.fillStyle = "#2a241c55"; ctx.fillRect(-s * .02, -s * .14, s * .04, s * .28); break;
    case "seed": ctx.rotate(.2); ctx.beginPath(); ctx.moveTo(0, -s * .2); ctx.quadraticCurveTo(s * .16, 0, 0, s * .16); ctx.quadraticCurveTo(-s * .16, 0, 0, -s * .2); ctx.fill(); ctx.stroke(); break;
    case "rope": ctx.lineWidth = Math.max(2, s * .05); for (let r = .16; r > .04; r -= .045) { ctx.beginPath(); ctx.ellipse(0, s * .06, s * r, s * r * .55, 0, 0, 7); ctx.stroke(); } ctx.strokeStyle = c; ctx.lineWidth = Math.max(1.5, s * .035); for (let r = .16; r > .04; r -= .045) { ctx.beginPath(); ctx.ellipse(0, s * .06, s * r, s * r * .55, 0, 0, 7); ctx.stroke(); } ctx.strokeStyle = "#2a241c"; ctx.beginPath(); ctx.moveTo(s * .14, s * .06); ctx.quadraticCurveTo(s * .2, -s * .12, s * .08, -s * .2); ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(s * .08, -s * .2, s * .04, 0, 7); ctx.fill(); ctx.stroke(); break; // the Well-Digger's Rope
    case "key": ctx.lineWidth = Math.max(1.5, s * .035); ctx.strokeStyle = "#2a241c"; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-s * .1, 0, s * .07, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#2a241c"; ctx.beginPath(); ctx.arc(-s * .1, 0, s * .025, 0, 7); ctx.fill(); ctx.fillStyle = c; ctx.fillRect(-s * .04, -s * .018, s * .2, s * .036); ctx.strokeRect(-s * .04, -s * .018, s * .2, s * .036); ctx.fillRect(s * .1, s * .018, s * .03, s * .05); ctx.fillRect(s * .05, s * .018, s * .03, s * .035); break; // release 707: the Tollkeeper's Keys
    case "spool": R(-.12, -.18, .24, .05); R(-.12, .13, .24, .05); ctx.fillStyle = "#c8a0b8"; ctx.fillRect(-s * .08, -s * .13, s * .16, s * .26); ctx.strokeStyle = "#7a5070"; for (let y2 = -.11; y2 < .12; y2 += .045) { ctx.beginPath(); ctx.moveTo(-s * .08, y2 * s); ctx.lineTo(s * .08, (y2 + .02) * s); ctx.stroke(); } break; // release 712
    case "mirror": ctx.beginPath(); ctx.moveTo(-s * .16, -s * .12); ctx.lineTo(s * .02, -s * .2); ctx.lineTo(s * .17, -s * .02); ctx.lineTo(s * .06, s * .18); ctx.lineTo(-s * .14, s * .1); ctx.closePath(); ctx.fillStyle = "#b8d0e0"; ctx.fill(); ctx.stroke(); ctx.strokeStyle = "#ffffffaa"; ctx.beginPath(); ctx.moveTo(-s * .08, -s * .08); ctx.lineTo(s * .04, -s * .13); ctx.stroke(); break; // release 712
    case "slate": ctx.rotate(-.08); ctx.fillStyle = "#6a5440"; R(-.2, -.24, .4, .46); ctx.fillStyle = c; R(-.16, -.2, .32, .38); ctx.strokeStyle = "#f2efe6"; ctx.lineWidth = Math.max(1, s * .025); ctx.beginPath(); ctx.moveTo(-s * .1, s * .08); ctx.lineTo(-s * .05, -s * .1); ctx.lineTo(0, s * .08); ctx.moveTo(s * .04, -s * .1); ctx.lineTo(s * .04, s * .08); ctx.stroke(); break; // the Tall Child's Slates (story version 2): a framed slate with chalk letters on it
    case "print": ctx.rotate(.12); R(-.19, -.19, .38, .38); ctx.strokeStyle = "#5a402a99"; ctx.lineWidth = Math.max(1, s * .018); for (let a = 0; a < 6.28; a += .52) { ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * .025, Math.sin(a) * s * .025); ctx.lineTo(Math.cos(a) * s * .14, Math.sin(a) * s * .14); ctx.stroke(); } break; // the Spore Prints (story version 2): a square of paper, a spore print fanned on it
    case "census": ctx.rotate(-.06); ctx.fillStyle = "#efe9dc"; R(-.18, -.22, .36, .42); ctx.strokeStyle = "#7a6a5a99"; ctx.lineWidth = Math.max(1, s * .015); ctx.beginPath(); for (let y2 = -.13; y2 < .1; y2 += .065) { ctx.moveTo(-s * .14, y2 * s); ctx.lineTo(s * .14, y2 * s); } ctx.moveTo(-s * .05, -s * .18); ctx.lineTo(-s * .05, s * .08); ctx.stroke(); ctx.strokeStyle = "#2a241c"; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(s * .1, s * .04); ctx.lineTo(s * .17, s * .14); ctx.lineTo(s * .1, s * .24); ctx.lineTo(s * .03, s * .14); ctx.closePath(); ctx.fill(); ctx.stroke(); break; // the Enumerator's Count (story version 3): a ruled census sheet held down by a violet crystal chip
    case "tag": ctx.rotate(-.2); ctx.fillStyle = "#efe9dc"; R(-.13, .06, .17, .13); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-s * .17, -s * .08); ctx.lineTo(s * .07, -s * .08); ctx.lineTo(s * .16, 0); ctx.lineTo(s * .07, s * .08); ctx.lineTo(-s * .17, s * .08); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#1b1a20"; ctx.beginPath(); ctx.arc(s * .08, 0, s * .025, 0, 7); ctx.fill(); ctx.strokeStyle = "#7a4a22"; ctx.beginPath(); ctx.moveTo(-s * .12, -s * .03); ctx.lineTo(-s * .12, s * .03); ctx.moveTo(-s * .07, -s * .03); ctx.lineTo(-s * .04, s * .03); ctx.lineTo(-s * .01, -s * .03); ctx.stroke(); ctx.strokeStyle = "#a8aeb6"; ctx.beginPath(); ctx.ellipse(s * .17, -s * .05, s * .07, s * .05, .4, 0, 7); ctx.stroke(); break; // the Tinker's Tags (story version 3): a stamped copper repair tag on a wire loop, its card behind it
    case "blotter":ctx.fillStyle = "#e8e2d4"; R(-.2, -.14, .4, .26); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(-s * .04, -s * .01, s * .09, s * .05, .3, 0, 7); ctx.fill(); ctx.fillRect(s * .03, s * .03, s * .12, s * .02); ctx.fillStyle = "#3a2e22"; ctx.beginPath(); ctx.ellipse(0, s * .17, s * .14, s * .05, 0, Math.PI, 0); ctx.fill(); break; // the Ink-Clerk's Blotters (story version 2): a sheet of blotting paper with an ink blot, on a rocker blotter
    case "jar": R(-.13, -.12, .26, .3); ctx.fillStyle = "#f4e2b0"; R(-.15, -.19, .3, .07); ctx.fillStyle = "#fff4d0aa"; ctx.fillRect(-s * .08, -s * .07, s * .04, s * .18); break; // the Beekeeper's Jars (2026-11-04): a honey jar under a wax lid
    case "handle": ctx.rotate(-.5); ctx.beginPath(); ctx.moveTo(-s * .03, -s * .22); ctx.quadraticCurveTo(s * .045, 0, -s * .025, s * .22); ctx.lineTo(s * .035, s * .22); ctx.quadraticCurveTo(s * .085, 0, s * .03, -s * .22); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = "#2a241c88"; for (const y2 of [.1, .14, .18]) { ctx.beginPath(); ctx.moveTo(-s * .02, y2 * s); ctx.lineTo(s * .045, (y2 - .015) * s); ctx.stroke(); } break; // the Toolmaker's Handles (2026-11-05): a worn wooden handle with no tool on it, a grip worn into its foot
    case "compass": ctx.beginPath(); ctx.arc(0, 0, s * .16, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#b03a2e"; ctx.beginPath(); ctx.moveTo(0, -s * .12); ctx.lineTo(s * .04, 0); ctx.lineTo(-s * .04, 0); ctx.fill(); break;
    default: ctx.beginPath(); ctx.moveTo(-s * .18, s * .14); ctx.quadraticCurveTo(-s * .2, -s * .16, s * .02, -s * .18); ctx.quadraticCurveTo(s * .22, -s * .1, s * .12, s * .1); ctx.quadraticCurveTo(0, s * .2, -s * .18, s * .14); ctx.fill(); ctx.stroke(); // a shell
  }
  ctx.restore();
}
export function drawTornPage(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .6) * s, read = o.state === "read", lift = read ? 0 : Math.sin(now / 700 + o.x) * .06;
  ctx.save();
  if (!read) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * .7); g.addColorStop(0, "rgba(255,236,190,.32)"); g.addColorStop(1, "rgba(255,236,190,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, s * .7, 0, 7); ctx.fill(); }
  ctx.translate(cx, cy); ctx.rotate(-.18);
  ctx.fillStyle = "#00000033"; ctx.fillRect(-s * .26, -s * .3 + s * .05, s * .52, s * .62);
  ctx.fillStyle = read ? "#cbbf9f" : "#ece2c4"; ctx.beginPath(); ctx.moveTo(-s * .26, -s * .32); ctx.lineTo(s * .2, -s * .32); ctx.lineTo(s * .26, -s * .2 - lift * s); ctx.lineTo(s * .24, s * .3);
  for (let i = 0; i < 5; i++) ctx.lineTo(s * (.14 - i * .1), s * (.26 + (i % 2) * .06)); ctx.closePath(); ctx.fill(); // the torn edge along the foot
  ctx.strokeStyle = "#6b5a3f88"; ctx.lineWidth = Math.max(1, s * .02); for (let i = 0; i < 5; i++) { const y = -s * .2 + i * s * .1; ctx.beginPath(); ctx.moveTo(-s * .19, y); ctx.lineTo(s * (.12 - (i === 4 ? .14 : 0)), y); ctx.stroke(); }
  ctx.restore();
}
export function drawCrackedBell(ctx, o, s, now) {
  const cx = (o.x + .5) * s, base = (o.y + .9) * s, top = (o.y - .55) * s, rung = o.state === "rung", sway = rung ? 0 : Math.sin(now / 900 + o.x) * .05;
  ctx.save(); ctx.strokeStyle = "#4a3a2a"; ctx.lineWidth = Math.max(2, s * .09); ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - s * .55, base); ctx.lineTo(cx - s * .45, top); ctx.lineTo(cx + s * .45, top); ctx.lineTo(cx + s * .55, base); ctx.stroke();
  ctx.translate(cx, top + s * .08); ctx.rotate(sway);
  if (rung) { const g = ctx.createRadialGradient(0, s * .45, 0, 0, s * .45, s * .8); g.addColorStop(0, "rgba(255,210,140,.35)"); g.addColorStop(1, "rgba(255,210,140,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, s * .45, s * .8, 0, 7); ctx.fill(); }
  ctx.strokeStyle = "#2a2018"; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * .1); ctx.stroke();
  const bell = ctx.createLinearGradient(-s * .32, 0, s * .32, 0); bell.addColorStop(0, "#5c3f1c"); bell.addColorStop(.45, rung ? "#c8964f" : "#9c7136"); bell.addColorStop(1, "#4a3216");
  ctx.fillStyle = bell; ctx.beginPath(); ctx.moveTo(-s * .14, s * .1); ctx.quadraticCurveTo(-s * .2, s * .45, -s * .34, s * .72); ctx.lineTo(s * .34, s * .72); ctx.quadraticCurveTo(s * .2, s * .45, s * .14, s * .1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1e150c"; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath(); ctx.moveTo(s * .04, s * .18); ctx.lineTo(-s * .03, s * .36); ctx.lineTo(s * .06, s * .5); ctx.lineTo(-s * .02, s * .68); ctx.stroke(); // the crack
  ctx.fillStyle = "#2a1d10"; ctx.beginPath(); ctx.arc(0, s * .74, s * .06, 0, 7); ctx.fill();
  ctx.restore();
}
// Release 455: writing in the stone. A low slab with a column of cut lines and, beside it, a smaller slanted hand; an
// unread one holds a faint pale light in its letters.
// Release 505: a brass chain-link lying in the dust, glinting until it is taken; then only its print remains.
export function drawSurveyorLink(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .62) * s, taken = o.state === "taken";
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.5);
  if (taken) { ctx.strokeStyle = "rgba(40,36,30,.5)"; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); ctx.ellipse(0, 0, s * .24, s * .1, 0, 0, 7); ctx.stroke(); ctx.restore(); return; }
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(s * .03, s * .06, s * .28, s * .12, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#8a6a2e"; ctx.lineWidth = Math.max(2, s * .09); ctx.beginPath(); ctx.ellipse(0, 0, s * .24, s * .1, 0, 0, 7); ctx.stroke();
  ctx.strokeStyle = "#e6c46a"; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); ctx.ellipse(0, -s * .01, s * .22, s * .085, 0, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
  const glint = .5 + .5 * Math.sin(now / 500 + o.x * 3); ctx.fillStyle = `rgba(255,240,190,${.25 + .5 * glint})`; ctx.beginPath(); ctx.arc(-s * .12, -s * .06, Math.max(1, s * .035), 0, 7); ctx.fill();
  ctx.restore();
}
// Release 551: Abel Corwin's statue, kneeling on a low plinth in pale Far Sleep stone, a brass chain from his boot to his hand.
export function drawSurveyorStatue(ctx, o, s, now) {
  const cx = (o.x + .5) * s, base = (o.y + .92) * s, stone = "#d9d4c6", shade = "#a8a294", edge = "#5f5a50";
  ctx.save(); ctx.lineJoin = "round";
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(cx, base, s * .5, s * .14, 0, 0, 7); ctx.fill();
  ctx.fillStyle = shade; ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, s * .03); ctx.fillRect(cx - s * .42, base - s * .2, s * .84, s * .2); ctx.strokeRect(cx - s * .42, base - s * .2, s * .84, s * .2); // the plinth
  ctx.fillStyle = edge; for (let i = 0; i < 7; i++) ctx.fillRect(cx - s * .36 + i * s * .1, base - s * .12, s * .05, s * .025); // the column of numbers
  const g = ctx.createLinearGradient(cx - s * .3, 0, cx + s * .3, 0); g.addColorStop(0, stone); g.addColorStop(1, shade); ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cx - s * .3, base - s * .2); ctx.lineTo(cx - s * .28, base - s * .42); ctx.lineTo(cx - s * .02, base - s * .44); ctx.lineTo(cx + s * .04, base - s * .2); ctx.closePath(); ctx.fill(); ctx.stroke(); // the kneeling leg
  ctx.beginPath(); ctx.moveTo(cx + s * .04, base - s * .2); ctx.lineTo(cx + s * .22, base - s * .2); ctx.lineTo(cx + s * .2, base - s * .36); ctx.lineTo(cx + s * .06, base - s * .38); ctx.closePath(); ctx.fill(); ctx.stroke(); // the planted boot
  ctx.beginPath(); ctx.moveTo(cx - s * .22, base - s * .4); ctx.lineTo(cx - s * .16, base - s * .9); ctx.lineTo(cx + s * .1, base - s * .92); ctx.lineTo(cx + s * .12, base - s * .4); ctx.closePath(); ctx.fill(); ctx.stroke(); // the coat
  ctx.beginPath(); ctx.arc(cx - s * .02, base - s * 1.02, s * .11, 0, 7); ctx.fill(); ctx.stroke(); // the bowed head
  ctx.beginPath(); ctx.moveTo(cx + s * .08, base - s * .82); ctx.lineTo(cx + s * .3, base - s * .62); ctx.lineTo(cx + s * .26, base - s * .55); ctx.lineTo(cx + s * .05, base - s * .7); ctx.closePath(); ctx.fill(); ctx.stroke(); // the arm held out
  ctx.strokeStyle = "#c79a3e"; ctx.lineWidth = Math.max(1.2, s * .035); ctx.setLineDash([Math.max(2, s * .05), Math.max(1, s * .025)]); ctx.beginPath(); ctx.moveTo(cx + s * .14, base - s * .22); ctx.quadraticCurveTo(cx + s * .34, base - s * .34, cx + s * .29, base - s * .6); ctx.stroke(); ctx.setLineDash([]); // brass chain, boot to hand
  if (o.state !== "seen") { const glint = .5 + .5 * Math.sin(now / 600); ctx.fillStyle = `rgba(255,236,170,${.3 + .5 * glint})`; ctx.beginPath(); ctx.arc(cx + s * .29, base - s * .6, Math.max(1, s * .04), 0, 7); ctx.fill(); }
  ctx.restore();
}
export function drawMarginNote(ctx, o, s, now) {
  const x = o.x * s + s * .14, y = o.y * s + s * .18, w = s * .72, h = s * .7, read = o.state === "read";
  ctx.save(); ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + s * .04, w * .55, s * .1, 0, 0, 7); ctx.fill();
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, "#6f6a62"); g.addColorStop(1, "#4a4640"); ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + s * .1); ctx.quadraticCurveTo(x + w / 2, y - s * .06, x + w, y + s * .1); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2c2925"; ctx.lineWidth = Math.max(1, s * .03); ctx.stroke();
  const glow = read ? 0 : .35 + .25 * Math.sin(now / 700 + o.x);
  ctx.strokeStyle = read ? "#2e2b27" : `rgba(236,226,196,${.55 + glow * .4})`; ctx.lineWidth = Math.max(1, s * .035);
  for (let i = 0; i < 4; i++) { const ly = y + s * (.2 + i * .12); ctx.beginPath(); ctx.moveTo(x + w * .12, ly); ctx.lineTo(x + w * (i === 3 ? .4 : .58), ly); ctx.stroke(); }
  ctx.lineWidth = Math.max(.8, s * .022); ctx.strokeStyle = read ? "#3a3530" : `rgba(214,190,150,${.5 + glow * .4})`;
  for (let i = 0; i < 3; i++) { const ly = y + s * (.22 + i * .14); ctx.beginPath(); ctx.moveTo(x + w * .68, ly + s * .03); ctx.lineTo(x + w * .88, ly - s * .02); ctx.stroke(); }
  ctx.restore();
}
// Release 415: Ilse the Lamplighter, at the age the Corridor deals her. A child or young woman with a lit taper beside a lamp
// post (lit), the woman holding the last lamp, the old woman beside a dark lamp, and in the Far Sleep a lamp with no post.
export function drawIlse(ctx, o, s, now) {
  const age = o.age, scale = age === "child" ? .74 : age === "young" ? .9 : 1, cx = (o.x + .5) * s, flick = .85 + .15 * Math.sin(now / 130 + o.x);
  const glow = (x, y, r, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,214,140,${a})`); g.addColorStop(1, "rgba(255,214,140,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  const lamp = (x, y, lit) => { ctx.fillStyle = "#2b2420"; ctx.fillRect(x - s * .1, y - s * .14, s * .2, s * .26); ctx.fillStyle = lit ? `rgba(255,220,150,${.9 * flick})` : "#4a4440"; ctx.fillRect(x - s * .06, y - s * .1, s * .12, s * .16); if (lit) glow(x, y, s * 1.1, .35 * flick); };
  const postX = cx + s * .7, top = (o.y - .9) * s;
  if (o.stage !== 3 && o.stage !== 5) { ctx.strokeStyle = "#3a302a"; ctx.lineWidth = Math.max(2, s * .08); ctx.beginPath(); ctx.moveTo(postX, (o.y + .85) * s); ctx.lineTo(postX, top); ctx.stroke(); lamp(postX, top, o.stage !== 4); }
  if (o.stage === 5) { const fy = top - s * .2 + Math.sin(now / 700) * s * .08; lamp(postX, fy, true); }
  actor(ctx, o.x, o.y, s, "villager", "down", 0, "idle", false, scale);
  if (age === "old") { ctx.strokeStyle = "#6b5a48"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); ctx.moveTo(cx - s * .32, (o.y + .85) * s); ctx.lineTo(cx - s * .28, (o.y + .15) * s); ctx.stroke(); }
  const hx = cx + s * .26, hy = (o.y + .38) * s;
  if (o.stage === 3) lamp(hx, hy, true);
  else if (o.stage === 1 || o.stage === 2) { ctx.strokeStyle = "#d9c39a"; ctx.lineWidth = Math.max(1.2, s * .04); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + s * .1, hy - s * .5); ctx.stroke(); ctx.fillStyle = `rgba(255,200,110,${flick})`; ctx.beginPath(); ctx.ellipse(hx + s * .1, hy - s * .56, s * .04, s * .08, 0, 0, 7); ctx.fill(); glow(hx + s * .1, hy - s * .56, s * .45, .3 * flick); }
}
export function drawDigSpot(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .72) * s, dug = o.state === "dug";
  ctx.save();
  ctx.fillStyle = dug ? "#2a2018" : "#4a3a28"; ctx.beginPath(); ctx.ellipse(cx, cy, s * .42, s * .2, 0, 0, 7); ctx.fill();
  if (!dug) { ctx.fillStyle = "#5e4a32"; ctx.beginPath(); ctx.ellipse(cx - s * .05, cy - s * .05, s * .28, s * .12, -.1, 0, 7); ctx.fill(); }
  else { ctx.fillStyle = "#120c08"; ctx.beginPath(); ctx.ellipse(cx, cy, s * .22, s * .09, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#8a8478";
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .4; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * s * .5, cy + Math.sin(a) * s * .25, s * .07, s * .05, a, 0, 7); ctx.fill(); }
  ctx.restore();
}
// Release 573 (Tim: "taller trees... that reach beyond the frame... you can't see the tops of some of them... you can walk
// behind them... maybe you can see like a silhouette"): a giant forest tree, its trunk `height` tiles tall and its crown above.
// The Wayfarer behind one is drawn again, faint (`ghost`), over it (giantTreeHides).
export const GIANT_TREE = { height: 9, trunk: .36, crown: 2.3, sway: .06, ghost: .45 };
// The crown's leaf masses [dx, dy, r (× crown), colour]: drawn by drawGiantTree and tested by giantTreeHides (release 667).
const GIANT_CROWN = [[-.55, .35, .75, "#1e3a24"], [.6, .4, .7, "#1e3a24"], [0, 0, 1, "#26482b"], [-.35, -.35, .7, "#2f5733"], [.4, -.3, .62, "#2f5733"], [0, -.62, .5, "#3a6a3c"]];
// Release 679 (seasons.ts): the season of the woods this section belongs to, set each frame; null outside them.
let SEASON = null;
// An ordinary tree in its season: bare branches (some snow-capped in winter), or its crown in the season's colours, with blossom.
function drawSeasonTree(ctx, o, s, kind) {
  const T = treeSeason(SEASON, o.x, o.y), sc = Math.max(.6, Number(o.scale) || 1), k = o.x * s + s / 2, base = o.y * s + s * .82;
  if (!T) return actor(ctx, o.x, o.y, s, kind, "down", 0, "idle", false, sc);
  if (T.bare) {
    ctx.save(); ctx.strokeStyle = "#4a3a2c"; ctx.lineCap = "round"; ctx.lineWidth = Math.max(2, s * .12 * sc); const top = base - s * .95 * sc;
    ctx.beginPath(); ctx.moveTo(k, base); ctx.lineTo(k, top); ctx.stroke(); ctx.lineWidth = Math.max(1, s * .05 * sc);
    const arms = [[-.32, -.55, -.42], [.3, -.62, -.5], [-.18, -.82, -.28], [.2, -.86, -.3]]; ctx.beginPath(); for (const [dx, y0, dy] of arms) { ctx.moveTo(k, base + y0 * s * sc); ctx.lineTo(k + dx * s * sc, base + (y0 + dy) * s * sc * .6); } ctx.stroke();
    if (T.snow) { ctx.fillStyle = SEASONS.snowCap; for (const [dx, y0, dy] of arms) { ctx.beginPath(); ctx.ellipse(k + dx * s * sc, base + (y0 + dy) * s * sc * .6 - 1, s * .09 * sc, s * .035 * sc, 0, 0, 7); ctx.fill(); } }
    ctx.restore(); return;
  }
  actor(ctx, o.x, o.y, s, kind, "down", 0, "idle", false, sc, 1, 0, [T.leaves[0], T.leaves[1], T.leaves[2], T.leaves[2]]);
  if (T.bloom) { ctx.fillStyle = T.bloom; for (let i = 0; i < 6; i++) { const a = i * 2.4 + o.x, r = (.12 + (i % 3) * .08) * s * sc; ctx.fillRect(k + Math.cos(a) * r * 1.6 - 1, base - s * .72 * sc + Math.sin(a) * r - 1, Math.max(2, s * .06), Math.max(2, s * .06)); } }
  if (T.snow) { ctx.fillStyle = SEASONS.snowCap; ctx.fillRect(k - s * .3 * sc, base - s * .96 * sc, s * .6 * sc, s * .08 * sc); }
}
export function drawGiantTree(ctx, o, s, now) {
  const G = GIANT_TREE, k = (o.x + .5) * s, base = (o.y + .82) * s, top = base - G.height * s, w = G.trunk * s, sway = Math.sin(now / 1900 + o.x * 1.7 + o.y) * G.sway * s;
  ctx.fillStyle = "#00000044"; ctx.beginPath(); ctx.ellipse(k, base, s * .9, s * .26, 0, 0, 7); ctx.fill();
  const bark = ctx.createLinearGradient(k - w, 0, k + w, 0); bark.addColorStop(0, "#2a1e15"); bark.addColorStop(.45, "#5a4330"); bark.addColorStop(1, "#22180f");
  ctx.fillStyle = bark; ctx.beginPath(); ctx.moveTo(k - w * 1.6, base); ctx.quadraticCurveTo(k - w, base - s * .5, k - w * .8, base - s); ctx.lineTo(k - w * .55 + sway, top + s); ctx.lineTo(k + w * .55 + sway, top + s); ctx.lineTo(k + w * .8, base - s); ctx.quadraticCurveTo(k + w, base - s * .5, k + w * 1.6, base); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a120c99"; ctx.lineWidth = Math.max(1, s * .03); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(k + i * w * .4, base - s * .2); ctx.lineTo(k + i * w * .3 + sway * .8, top + s * 1.5); ctx.stroke(); }
  const SC = SEASON && SEASONS.crown[SEASON], bareGiant = SEASON === "fall" && treeSeason(SEASON, o.x, o.y)?.bare; // release 679: the season's crown
  ctx.strokeStyle = "#3d2c1f"; ctx.lineWidth = Math.max(2, s * .1); for (const [h, d] of [[.42, -1], [.58, 1], [.72, -1]]) { const y = base - G.height * s * h, x = k + sway * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + d * s * .8, y - s * .3, x + d * s * 1.5, y - s * .9); ctx.stroke(); if (bareGiant) continue; ctx.fillStyle = SC ? SC[0] : "#24402a"; ctx.beginPath(); ctx.arc(x + d * s * 1.5, y - s * .95, s * .55, 0, 7); ctx.fill(); if (SEASON === "winter") { ctx.fillStyle = SEASONS.snowCap; ctx.beginPath(); ctx.ellipse(x + d * s * 1.5, y - s * 1.3, s * .42, s * .16, 0, 0, 7); ctx.fill(); } }
  const cx = k + sway, cy = top, R = G.crown * s;
  GIANT_CROWN.forEach(([dx, dy, r, c], i) => { if (bareGiant && i % 2) return; ctx.fillStyle = SC ? (SEASON === "spring" && i === 5 ? SC[2] : SC[i < 2 ? 0 : i < 5 ? 1 : 2]) : c; ctx.beginPath(); ctx.arc(cx + dx * R, cy + dy * R, r * R, 0, 7); ctx.fill();
    if (SEASON === "winter" && dy <= 0) { ctx.fillStyle = SEASONS.snowCap; ctx.beginPath(); ctx.ellipse(cx + dx * R, cy + dy * R - r * R * .62, r * R * .72, r * R * .3, 0, 0, 7); ctx.fill(); } });
}
// Release 587: a floating disc of a skyway (skylands.ts SKY_DISCS): its shadow on the ground, the disc `level` lifts above it, a
// gentle bob. `d` is in foot coordinates (the Wayfarer's x + .5, y + .75).
export function discLift(level) { return level * LIFT_PER_LEVEL; }
export function drawSkyDisc(ctx, d, s, now, flat = false) {
  const bob = Math.sin(now / 900 + d.x + d.y) * .05 * s, cx = d.x * s, gy = d.y * s, cy = flat ? gy : gy - discLift(d.level) * s + bob, rx = d.r * s, ry = d.r * s * (flat ? 1 : .55);
  ctx.fillStyle = "#00000033"; ctx.beginPath(); ctx.ellipse(cx, gy, rx * .9, ry * .8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#8f8aa0"; ctx.beginPath(); ctx.ellipse(cx, cy + s * .16, rx * .96, ry * .9, 0, 0, 7); ctx.fill();
  const top = ctx.createRadialGradient(cx - rx * .3, cy - ry * .35, 0, cx, cy, rx); top.addColorStop(0, "#ffffff"); top.addColorStop(.7, "#e9e4f2"); top.addColorStop(1, "#cfc7de");
  ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#d9b866"; ctx.lineWidth = Math.max(1, s * .05); ctx.stroke();
  ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, rx * .62, ry * .62, 0, 0, 7); ctx.stroke();
}
// Does a giant tree at `o` stand in front of the Wayfarer at `p` (drawn over them)?
// Release 667 (Tim: "towards the edges... your character disappears"): the test covers every leaf mass of the crown, the boughs
// and the trunk, at the Wayfarer's head, middle and feet, with a little margin, instead of one circle at the crown's middle.
export function giantTreeHides(o, p) {
  if (!(o.y > p.y)) return false; const G = GIANT_TREE, tx = o.x + .5, base = o.y + .82, top = base - G.height, R = G.crown, px = p.x + .5;
  for (const py of [p.y - .25, p.y + .35, p.y + .8]) {
    if (Math.abs(px - tx) < G.trunk * 1.6 + .3 && py < base && py > top) return true; // the trunk
    if (py > top + G.height * .2 && py < base - G.height * .35 && Math.abs(px - tx) < 1.8 && py < base) return true; // the boughs
    for (const [dx, dy, r] of GIANT_CROWN) if (Math.hypot(px - (tx + dx * R), py - (top + dy * R)) < r * R + .3) return true;
  }
  return false;
}
export function drawStrange(ctx, o, s, kind, now) {
  const T = now / 1000 + (o.x * 7 + o.y * 13) % 10, drift = Math.sin(T * .7) * .09, flick = Math.sin(T * 9) * Math.sin(T * 2.3) > .9 ? .35 : 1;
  ctx.save(); ctx.globalAlpha = flick; actor(ctx, o.x, o.y, s, kind, "down", 0, o.state || "idle", false, o.scale || 1); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .45 + .15 * Math.sin(T * 1.3);
  actor(ctx, o.x + drift, o.y - .04 - Math.abs(drift) * .5, s, kind, "down", 0, o.state || "idle", false, (o.scale || 1) * 1.04); ctx.restore();
  const cx = (o.x + .5) * s, cy = (o.y + .2) * s;
  const pulse = .3 + .12 * Math.sin(T * 1.9), g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.3); g.addColorStop(0, `rgba(190,170,255,${pulse})`); g.addColorStop(.5, `rgba(150,200,255,${pulse * .4})`); g.addColorStop(1, "rgba(200,190,255,0)");
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(cx - s * 1.3, cy - s * 1.3, s * 2.6, s * 2.6); ctx.restore();
  for (let k = 0; k < 9; k++) { const p = ((T * .18 + k / 9) % 1), x = cx + Math.sin(T * .9 + k * 2.1) * s * .45, y = cy + s * .35 - p * s * 1.7, m = Math.max(2, s * .07); ctx.fillStyle = k % 3 ? `rgba(230,240,255,${(1 - p) * .95})` : `rgba(200,160,255,${(1 - p) * .95})`; ctx.fillRect(x, y, m, m); }
}
// The Rite of Ascendancy (ascendancy.ts): its dais is one of the strange trees (drawStrange); while the rite burns the tree is
// on fire and burns down (o.burn 0 → 1: darker, lower, the flames over it); done, a heap of grey ashes with embers in it.
function drawRiteTree(ctx, o, s, now) {
  const T = now / 1000, cx = (o.x + .5) * s, base = (o.y + .85) * s;
  if (o.kind === "riteAshes") {
    ctx.fillStyle = "#00000044"; ctx.beginPath(); ctx.ellipse(cx, base, s * .55, s * .17, 0, 0, 7); ctx.fill();
    for (const [dx, dy, r, c] of [[0, -.08, .42, "#5b5752"], [-.18, -.04, .24, "#6e6a64"], [.2, -.05, .22, "#4c4844"], [.02, -.18, .2, "#7c7770"]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(cx + dx * s, base + dy * s, r * s, r * s * .45, 0, 0, 7); ctx.fill(); }
    for (let k = 0; k < 6; k++) { const a = Math.max(0, Math.sin(T * 2 + k * 1.7)); if (a < .2) continue; ctx.fillStyle = `rgba(255,${120 + k * 15},40,${a * .9})`; ctx.fillRect(cx + Math.sin(k * 2.3) * s * .28 - 1.5, base - s * (.08 + (k % 3) * .05) - 1.5, 3, 3); }
    for (let k = 0; k < 3; k++) { const p = (T * .25 + k / 3) % 1; ctx.fillStyle = `rgba(140,135,130,${(1 - p) * .35})`; ctx.beginPath(); ctx.arc(cx + Math.sin(T + k) * s * .12, base - s * (.2 + p * 1.1), s * (.08 + p * .14), 0, 7); ctx.fill(); }
    return;
  }
  if (o.state !== "burning") { drawStrange(ctx, o, s, "tree", now); return; }
  const b = Math.max(0, Math.min(1, o.burn || 0)), sc = (o.scale || 1) * (1 - b * .7);
  ctx.save(); ctx.filter = `brightness(${Math.round(100 - b * 75)}%)`; ctx.translate(cx, base); ctx.scale(1, 1 - b * .55); ctx.translate(-cx, -base); actor(ctx, o.x, o.y, s, "tree", "down", 0, "standing", false, sc); ctx.restore(); ctx.filter = "none";
  const top = base - s * (1.5 - b * 1.1);
  for (let k = 0; k < 9; k++) { const x = cx + Math.sin(k * 1.9) * s * (.4 - b * .2), f = .7 + .3 * Math.sin(T * 10 + k * 1.3), h = s * (.55 + .35 * f) * (1 - b * .4), y = top + (k % 3) * s * .35;
    const g = ctx.createLinearGradient(x, y, x, y - h); g.addColorStop(0, "rgba(255,110,30,.9)"); g.addColorStop(.6, "rgba(255,200,80,.6)"); g.addColorStop(1, "rgba(255,240,170,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s * .16, y); ctx.quadraticCurveTo(x - s * .1, y - h * .5, x + Math.sin(T * 6 + k) * s * .06, y - h); ctx.quadraticCurveTo(x + s * .1, y - h * .5, x + s * .16, y); ctx.closePath(); ctx.fill(); }
  const glow = ctx.createRadialGradient(cx, base - s * .5, 0, cx, base - s * .5, s * 1.4); glow.addColorStop(0, "rgba(255,150,60,.35)"); glow.addColorStop(1, "rgba(255,150,60,0)"); ctx.fillStyle = glow; ctx.fillRect(cx - s * 1.4, base - s * 1.9, s * 2.8, s * 2.8);
}
// Release 271 (Tim, 2026-10-21: "let's see if we can do a model rework on the gate revenant... increase its Fidelity,
// without increasing... processing requirements"). A hooded, horned wraith in a tattered cloak with the Gate's arch burning
// on its chest. Flat fills and batched paths only (no gradients or blur): about a dozen fills and strokes a frame, no more
// than the old ellipse, slabs and seven tendrils. Its pose shows its mind: faded while it stalks, an afterimage as it
// slips a blow, down on one knee while its poise is broken, eyes and sigil flaring as it winds up.
export function drawGateRevenant(ctx, e, s, now, ox = 0, oy = 0) { // exported for the creature preview tests
  const [cloth, shade, ember] = COLORS.gateRevenant, sc = Math.max(.6, Number(e.scale) || 1), u = s * sc, T = now / 1000;
  const k = (e.x + ox + .5) * s, base = (e.y + oy) * s + s * .82, fx = (e.facingX || 1) < 0 ? -1 : 1;
  const broken = e.gateBroken > 0, flare = e.telegraph > 0 || e.strike > 0 || e.gateAttack?.phase === "windup" || e.gateUnstoppable > 0;
  // Tim, 2026-10-21: in the long lava barrage "his chest... opens up to a large mouth that spews out lava, and [the] cape
  // flies back to be like wings... that reveals his true nature... his body is actually just a gaping maw". `maw` is 0..1:
  // opening through the warning, wide while the bombs fly, closing through the recovery.
  const atk = e.gateAttack, maw = broken || atk?.move !== "barrage" ? 0 : atk.phase === "warn" ? Math.min(1, 1 - atk.left / GATE_REVENANT.barrage.warn) : atk.phase === "recover" ? Math.max(0, atk.left / GATE_REVENANT.recover) : 1;
  const hover = broken ? 0 : Math.sin(T * 2.3 + (e.x + e.y) * .7) * .035 * u, sway = Math.sin(T * 3.1 + e.x) * .05;
  ctx.fillStyle = "#050504aa"; ctx.beginPath(); ctx.ellipse(k, base, u * .32, u * .1, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(k, base - hover); ctx.scale(fx * u, (broken ? .74 : 1) * u);
  if (broken) ctx.rotate(-.12);
  if (!e.aggro && !broken) ctx.globalAlpha = .7; // stalking: half in the dark
  const cloak = (dx) => { // shoulders to a ragged, drifting hem
    ctx.beginPath(); ctx.moveTo(dx - .2, -.74); ctx.quadraticCurveTo(dx - .42, -.4, dx - .38 - sway * .6, -.02);
    for (let i = 0; i < 5; i++) { const a = dx - .38 + (i + .5) * .152, w = Math.sin(T * 4 + i * 1.9) * .025; ctx.lineTo(a - .04 + sway * .4, -.13 + w); ctx.lineTo(a + .076 + sway * .3, (i % 2 ? .02 : -.05) + w); }
    ctx.quadraticCurveTo(dx + .44, -.4, dx + .2, -.74); ctx.closePath();
  };
  if (e.gateEvade) { const g = ctx.globalAlpha; ctx.globalAlpha = g * .3; ctx.fillStyle = ember; cloak(-(e.gateEvade.x || 0) * fx * .45); ctx.fill(); ctx.globalAlpha = g; }
  if (maw > 0) { // the cape flung back into wings
    const span = .45 + .5 * maw, lift = .25 * maw, flap = Math.sin(T * 9) * .03 * maw;
    ctx.fillStyle = shade; ctx.strokeStyle = ember + "8c"; ctx.lineWidth = .03; ctx.beginPath();
    for (const d of [-1, 1]) {
      ctx.moveTo(d * .14, -.72); ctx.quadraticCurveTo(d * span * .7, -.98 - lift - flap, d * span, -.92 - lift + flap);
      for (let i = 1; i <= 4; i++) { const f = 1 - i / 4.4; ctx.lineTo(d * span * f + d * .03, -.6 - lift * f + (i % 2 ? .1 : 0)); ctx.lineTo(d * span * (f - .08), -.72 - lift * f * 1.1); }
      ctx.lineTo(d * .16, -.3); ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
  }
  // Trailing tatters, one stroke.
  ctx.strokeStyle = cloth; ctx.lineWidth = .05; ctx.lineCap = "round"; ctx.beginPath();
  for (let i = 0; i < 4; i++) { const y0 = -.55 + i * .13, w = Math.sin(T * 3.4 + i * 1.3) * .08; ctx.moveTo(-.3, y0); ctx.quadraticCurveTo(-.52, y0 + .05 + w, -.66 + w * .5, y0 + .16 + w); }
  ctx.stroke();
  if (maw > 0) { ctx.save(); ctx.scale(1 - .3 * maw, 1); } // the cape gone to wings, the body narrows
  ctx.fillStyle = shade; cloak(0); ctx.fill(); ctx.strokeStyle = ember + "8c"; ctx.lineWidth = .03; ctx.stroke();
  if (maw > 0) ctx.restore();
  // The inner fold, lit from the sigil.
  ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(-.1, -.68); ctx.quadraticCurveTo(-.17, -.32, -.12 + sway * .3, -.06); ctx.lineTo(.12 + sway * .3, -.08); ctx.quadraticCurveTo(.17, -.32, .1, -.68); ctx.closePath(); ctx.fill();
  // Pauldrons and talons.
  ctx.fillStyle = cloth; ctx.beginPath();
  for (const d of [-1, 1]) { ctx.moveTo(d * .1, -.76); ctx.quadraticCurveTo(d * .38, -.82, d * .4, -.6); ctx.quadraticCurveTo(d * .27, -.66, d * .12, -.62); ctx.closePath(); }
  ctx.fill();
  const reach = flare ? .14 : 0; ctx.strokeStyle = "#cfc2d6"; ctx.lineWidth = .028; ctx.beginPath();
  for (const t of [-.05, .02, .09]) { ctx.moveTo(.33, -.42 + t); ctx.lineTo(.47 + reach, -.36 + t * 1.5); }
  ctx.stroke();
  if (maw > .05) { // the chest split into one gaping mouth, fangs above and below, lava glowing in its throat
    const w = .2 + .1 * maw, h = .27 * maw, cy = -.4, pulse = .5 + .5 * Math.sin(T * 6);
    const lips = (g) => { ctx.beginPath(); ctx.moveTo(-w - g, cy); ctx.quadraticCurveTo(0, cy - h * 2 - g, w + g, cy); ctx.quadraticCurveTo(0, cy + h * 2 + g, -w - g, cy); ctx.closePath(); };
    ctx.fillStyle = "#4a0c18"; lips(.035); ctx.fill();
    ctx.fillStyle = "#c2321c"; lips(0); ctx.fill();
    ctx.fillStyle = "#ff8a2e"; ctx.beginPath(); ctx.ellipse(0, cy + h * .25, w * .62, h * (.75 + .1 * pulse), 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffe08a"; ctx.beginPath(); ctx.ellipse(0, cy + h * .35, w * .28, h * (.35 + .1 * pulse), 0, 0, 7); ctx.fill();
    // Teeth: a row of small ones along each lip, pointing into the mouth...
    const lipAt = (up, t) => cy + up * h * 4 * t * (1 - t);
    ctx.fillStyle = "#ece2d4"; ctx.beginPath();
    for (const [up, n] of [[-1, 8], [1, 7]]) for (let i = 0; i < n; i++) {
      const t = (i + .5) / n, x = -w + 2 * w * t, lip = lipAt(up, t), half = w / n * .75, len = Math.min(h * .6, .045);
      ctx.moveTo(x - half, lip); ctx.lineTo(x, lip - up * len); ctx.lineTo(x + half, lip);
    }
    ctx.fill();
    // ...and four great curved canines (Tim: "more pronounced, like canine. Fangs"), the upper pair reaching past the lower lip.
    ctx.beginPath();
    for (const [up, t, len] of [[-1, .22, .62], [-1, .78, .62], [1, .35, .26], [1, .65, .26]]) { // the lower pair small and apart: the lava's way out
      const x = -w + 2 * w * t, lip = lipAt(up, t), L = h * 2 * len * .8 + .02, half = (up > 0 ? .7 : 1) * (.026 + .012 * maw), bow = (t < .5 ? 1 : -1) * .03;
      // A cone: broad at the gum, tapering to a point that curves in toward the middle of the mouth.
      ctx.moveTo(x - half, lip + up * .012); ctx.quadraticCurveTo(x - half * .85, lip - up * L * .45, x + bow, lip - up * L);
      ctx.quadraticCurveTo(x + half * .55, lip - up * L * .4, x + half, lip + up * .012); ctx.closePath();
    }
    ctx.fill(); ctx.strokeStyle = "#7d5f55"; ctx.lineWidth = .012; ctx.stroke();
    if (atk?.phase === "active") { ctx.fillStyle = "#ff8a3a"; ctx.beginPath(); for (let i = 0; i < 4; i++) { const q = (T * 2.6 + i / 4) % 1, r = .045 * (1 - q * .5), x = Math.sin(i * 2.1 + T * 3) * .1 * q, y = cy - h - q * .55; ctx.moveTo(x + r, y); ctx.ellipse(x, y, r, r, 0, 0, 7); } ctx.fill(); }
  } else {
  // The Gate burning on its chest: a pointed arch and its keystone.
  const glow = broken ? .25 + .25 * (Math.sin(T * 17) > .3) : flare ? 1 : .55 + .2 * Math.sin(T * 2.6);
  ctx.globalAlpha *= glow; ctx.strokeStyle = ember; ctx.lineWidth = .035; ctx.beginPath();
  ctx.moveTo(-.07, -.3); ctx.lineTo(-.07, -.44); ctx.quadraticCurveTo(-.07, -.53, 0, -.58); ctx.quadraticCurveTo(.07, -.53, .07, -.44); ctx.lineTo(.07, -.3);
  ctx.moveTo(0, -.58); ctx.lineTo(0, -.5); ctx.stroke(); ctx.globalAlpha /= glow;
  }
  // Horns swept back, bone pale, then the hood over them.
  ctx.fillStyle = "#a58f9e"; ctx.beginPath();
  ctx.moveTo(-.17, -.86); ctx.quadraticCurveTo(-.44, -.86, -.52, -1.13); ctx.quadraticCurveTo(-.3, -1.0, -.06, -.98);
  ctx.moveTo(.04, -.99); ctx.quadraticCurveTo(-.02, -1.13, -.17, -1.25); ctx.quadraticCurveTo(.1, -1.17, .17, -.9); ctx.fill();
  ctx.fillStyle = shade; ctx.beginPath(); ctx.moveTo(-.19, -.68); ctx.quadraticCurveTo(-.22, -.96, .02, -1.02); ctx.quadraticCurveTo(.2, -.95, .19, -.68); ctx.quadraticCurveTo(0, -.62, -.19, -.68); ctx.fill();
  ctx.strokeStyle = ember + "b0"; ctx.lineWidth = .03; ctx.stroke();
  ctx.fillStyle = "#050308"; ctx.beginPath(); ctx.ellipse(.02, -.8, .1, .085, 0, 0, 7); ctx.fill();
  // Eyes: slits, brighter on the hunt.
  ctx.fillStyle = flare ? "#ffd0dc" : e.aggro ? "#ff6e89" : ember; ctx.beginPath();
  for (const d of [-.045, .065]) { ctx.moveTo(d - .03, -.81); ctx.lineTo(d + .03, -.825); ctx.lineTo(d + .02, -.795); ctx.closePath(); }
  ctx.fill();
  ctx.restore();
}
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
  palette = null, // release 679: a tree's seasonal colours
) {
  const p = palette || COLORS[kind] || COLORS.ashling,
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
  } else if (kind === "npc" || kind === "shipwright" || kind === "villager" || kind === "militia" || TRAVELER_LOOKS.has(kind)) {
    rect(p[1], -0.22, -0.58, 0.44, 0.56);
    rect(p[0], -0.18, -0.75, 0.36, 0.23);
    rect(p[2], -0.1, -0.68, 0.04, 0.04);
    rect(p[2], 0.06, -0.68, 0.04, 0.04);
    rect(p[0], -0.29, -0.48, 0.1, 0.38);
    if (kind === "peddler") { rect(p[1], -0.42, -0.62, 0.2, 0.34); rect(p[2], -0.4, -0.58, 0.16, 0.05); }
    if (kind === "minstrel") { rect(p[2], 0.2, -0.5, 0.18, 0.22); rect(p[1], 0.26, -0.72, 0.04, 0.24); }
    if (kind === "scholar" || kind === "cartographer") { rect(p[2], 0.22, -0.46, 0.16, 0.2); rect(p[0], -0.24, -0.86, 0.48, 0.1); }
    if (kind === "pilgrim") { rect(p[2], 0.3, -0.95, 0.05, 0.94); rect(p[2], 0.24, -1, 0.17, 0.06); }
    if (kind === "militia" || kind === "mercenary") { rect(p[2], 0.3, -0.95, 0.06, 0.92); rect("#d8d2c4", 0.27, -1.02, 0.12, 0.1); rect(p[2], -0.22, -0.4, 0.44, 0.08); }
  } else {
    rect(p[1], -0.25, -0.42, 0.5, 0.42);
    rect(p[0], -0.18, -0.66, 0.36, 0.3);
    if (kind === "tree" || kind === "treeShrub" || kind === "treeSpindle") {
      if(state === "fallen") { rect(p[1], -.43, -.18, .86, .16); rect(p[0], -.35, -.27, .28, .22); }
      else if(state === "charred") { rect("#29231f", -.09, -.75, .18, .72); rect("#3b2d25", -.3, -.78, .25, .16); }
      else if(kind === "treeShrub") { rect(p[1],-.07,-.35,.14,.31);rect(p[0],-.38,-.48,.34,.31);rect(p[0],.03,-.52,.38,.35);rect(p[2],-.18,-.65,.38,.25); }
      else if(kind === "treeSpindle") { rect(p[1],-.07,-.91,.14,.87);rect(p[0],-.31,-.73,.28,.1);rect(p[0],.03,-.55,.33,.09);rect(p[2],-.22,-1.03,.18,.25); }
      else { rect(p[1], -0.1, -0.82, 0.2, 0.8); rect(p[0], -0.38, -0.86, 0.76, 0.32); rect(p[3] || "#71845b", -.27, -1.02, .54, .22); }
    } else if (kind === "rock" && (state === "moved" || state === "broken")) {
      rect("#4f514d", -.32, -.2, .2, .12); rect("#73766f", -.04, -.16, .24, .1); rect("#3c3f3b", .2, -.12, .13, .08);
    } else if (kind === "checkpoint") {
      rect("#b8f5f2", -0.08, -1.02, 0.16, 0.7);rect("#315c65", -0.32, -0.34, 0.64, 0.2);rect("#72d7df", -0.2, -0.92, 0.4, 0.12);
      ctx.strokeStyle="#d8ffff";ctx.lineWidth=Math.max(2,s*.06);ctx.beginPath();ctx.arc(k,base-s*.68,s*.25,Math.PI*.18,Math.PI*1.82);ctx.stroke();
    } else if (kind === "listenerDais") { // release 375: a round dais of dark glass, its rim lit, a column of the line above it
      const t=performance.now()/1000,pulse=.5+.5*Math.sin(t*3);ctx.fillStyle="#120f18";ctx.beginPath();ctx.ellipse(k,base-s*.2,s*.48,s*.2,0,0,7);ctx.fill();ctx.strokeStyle=`rgba(201,166,255,${.55+.4*pulse})`;ctx.lineWidth=Math.max(2,s*.06);ctx.beginPath();ctx.ellipse(k,base-s*.2,s*.42,s*.16,0,0,7);ctx.stroke();
      ctx.lineWidth=Math.max(1,s*.03);ctx.beginPath();ctx.ellipse(k,base-s*.2,s*.24,s*.09,t%6.3,0,4.2);ctx.stroke();const g=ctx.createLinearGradient(0,base-s*1.6,0,base-s*.2);g.addColorStop(0,"rgba(201,166,255,0)");g.addColorStop(1,`rgba(201,166,255,${.25+.25*pulse})`);ctx.fillStyle=g;ctx.fillRect(k-s*.18,base-s*1.6,s*.36,s*1.4);
    } else if (kind === "skyStair") { // release 571: pale steps climbing into the air, a glow where they end
      const t=performance.now()/1000,pulse=.5+.5*Math.sin(t*2);ctx.fillStyle="#00000044";ctx.beginPath();ctx.ellipse(k,base,s*.42,s*.12,0,0,7);ctx.fill();
      for(let i=0;i<5;i++){const w=s*(.5-i*.07),y=base-s*(.12+i*.22);ctx.fillStyle=i%2?"#e8e2f4":"#d4cce6";ctx.fillRect(k-w/2,y-s*.12,w,s*.14);ctx.fillStyle="#9c93b866";ctx.fillRect(k-w/2,y,w,s*.03)}
      const g=ctx.createRadialGradient(k,base-s*1.35,0,k,base-s*1.35,s*.5);g.addColorStop(0,`rgba(255,244,214,${.55+.35*pulse})`);g.addColorStop(1,"rgba(255,244,214,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(k,base-s*1.35,s*.5,0,7);ctx.fill();
    } else if (kind === "saplingDais") { // the Rite of Ascendancy (ascendancy.ts): a gold-leaved sapling in a ring of old stone; burning while its rite runs
      const t=performance.now()/1000,lit=state==="burning",pulse=.5+.5*Math.sin(t*(lit?6:2));ctx.fillStyle="#00000055";ctx.beginPath();ctx.ellipse(k,base,s*.5,s*.16,0,0,7);ctx.fill();
      for(let i=0;i<8;i++){const a=i/8*6.283,x=k+Math.cos(a)*s*.42,y=base-s*.06+Math.sin(a)*s*.14;ctx.fillStyle=i%2?"#8a8270":"#a39a84";ctx.fillRect(x-s*.06,y-s*.08,s*.12,s*.09)}
      ctx.strokeStyle="#5a3e22";ctx.lineWidth=Math.max(2,s*.07);ctx.lineCap="round";ctx.beginPath();ctx.moveTo(k,base-s*.06);ctx.quadraticCurveTo(k+s*.05,base-s*.5,k-s*.02,base-s*.82);ctx.stroke();
      ctx.lineWidth=Math.max(1,s*.035);for(const [dx,dy] of [[-.2,-.62],[.2,-.55],[-.12,-.86],[.14,-.92]]){ctx.beginPath();ctx.moveTo(k,base-s*(-dy-.25));ctx.lineTo(k+s*dx,base+s*dy);ctx.stroke()}
      const g=ctx.createRadialGradient(k,base-s*.8,0,k,base-s*.8,s*(lit?.75:.5));g.addColorStop(0,`rgba(255,226,120,${(lit?.55:.3)+.25*pulse})`);g.addColorStop(1,"rgba(255,226,120,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(k,base-s*.8,s*(lit?.75:.5),0,7);ctx.fill();
      for(const [dx,dy,r] of [[-.2,-.66,.1],[.2,-.6,.1],[-.12,-.9,.09],[.14,-.95,.09],[0,-1.02,.11]]){ctx.fillStyle=lit?"#ffd27a":"#e8c45a";ctx.beginPath();ctx.ellipse(k+s*dx,base+s*dy,s*r,s*r*.65,dx*2,0,7);ctx.fill();ctx.fillStyle="#7da84a";ctx.beginPath();ctx.ellipse(k+s*dx*.9,base+s*(dy+.03),s*r*.45,s*r*.3,dx*2,0,7);ctx.fill()}
    } else if (kind === "visceraBloom") { // the Rite of Ascendancy's prize on its tree's crown: a slow-beating bloom of Divine Viscera
      const t=performance.now()/1000,beat=.85+.15*Math.sin(t*3.4);ctx.fillStyle="#00000044";ctx.beginPath();ctx.ellipse(k,base,s*.3,s*.1,0,0,7);ctx.fill();
      const g=ctx.createRadialGradient(k,base-s*.5,0,k,base-s*.5,s*.7);g.addColorStop(0,"rgba(255,120,110,.55)");g.addColorStop(1,"rgba(255,120,110,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(k,base-s*.5,s*.7,0,7);ctx.fill();
      for(let i=0;i<6;i++){const a=i/6*6.283+t*.4;ctx.fillStyle=i%2?"#c23a4a":"#e2667a";ctx.beginPath();ctx.ellipse(k+Math.cos(a)*s*.18,base-s*.5+Math.sin(a)*s*.12,s*.16*beat,s*.08*beat,a,0,7);ctx.fill()}
      ctx.fillStyle="#ffe6a8";ctx.beginPath();ctx.arc(k,base-s*.5,s*.1*beat,0,7);ctx.fill();
    } else if (kind === "listeningStone") { // release 373: a dark standing stone with the Listener's violet, ringed like an ear
      ctx.fillStyle="#00000055";ctx.beginPath();ctx.ellipse(k,base,s*.36,s*.1,0,0,7);ctx.fill();
      ctx.fillStyle="#1c1726";ctx.beginPath();ctx.moveTo(k-s*.26,base);ctx.lineTo(k-s*.18,base-s*1.15);ctx.lineTo(k,base-s*1.32);ctx.lineTo(k+s*.18,base-s*1.15);ctx.lineTo(k+s*.26,base);ctx.closePath();ctx.fill();ctx.strokeStyle="#3b3550";ctx.lineWidth=Math.max(1,s*.04);ctx.stroke();
      const pulse=.55+.45*Math.sin(performance.now()/420);ctx.strokeStyle=`rgba(201,166,255,${.5+.4*pulse})`;ctx.lineWidth=Math.max(1.5,s*.05);
      for(const [r,a0,a1] of [[.2,-.4,3.6],[.12,.4,4.6],[.05,0,6.3]]){ctx.beginPath();ctx.arc(k,base-s*.7,s*r,a0,a1);ctx.stroke()}
      ctx.fillStyle="#f3eaff";ctx.beginPath();ctx.arc(k,base-s*1.2,s*.04+pulse*s*.02,0,7);ctx.fill();
    } else if (kind === "townSmith") { // release 395: the town smith: a stone forge with its coals, an anvil, the smith in a leather apron
      const t=performance.now()/1000,heat=.6+.3*Math.sin(t*2.3)+.1*Math.sin(t*7.1);ctx.fillStyle="#00000055";ctx.beginPath();ctx.ellipse(k,base,s*.46,s*.11,0,0,7);ctx.fill();
      rect("#3b3530",-0.46,-0.62,0.3,0.6);rect("#2a2420",-0.44,-0.72,0.26,0.12);ctx.fillStyle=`rgba(255,${Math.round(110+60*heat)},40,${.75*heat})`;ctx.fillRect(k-s*.4,base-s*.36,s*.22,s*.1);
      const g=ctx.createRadialGradient(k-s*.29,base-s*.32,0,k-s*.29,base-s*.32,s*.45);g.addColorStop(0,`rgba(255,140,50,${.35*heat})`);g.addColorStop(1,"rgba(255,140,50,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(k-s*.29,base-s*.32,s*.45,0,7);ctx.fill();
      rect("#4a4d52",-0.02,-0.3,0.3,0.08);rect("#2e3034",0.06,-0.22,0.14,0.2);rect("#3a3d42",0.02,-0.04,0.22,0.05);
      rect("#2c2622",0.3,-0.86,0.18,0.5);rect("#5a3f28",0.28,-0.62,0.22,0.3);ctx.fillStyle="#c79a76";ctx.beginPath();ctx.arc(k+s*.39,base-s*.92,s*.09,0,7);ctx.fill();rect("#1d1916",0.32,-0.36,0.06,0.36);rect("#1d1916",0.42,-0.36,0.06,0.36);
      ctx.strokeStyle="#6b5136";ctx.lineWidth=Math.max(2,s*.04);ctx.beginPath();ctx.moveTo(k+s*.31,base-s*.7);ctx.lineTo(k+s*.14,base-s*.5+Math.sin(t*3)*s*.04);ctx.stroke();rect("#5c6067",0.08,-0.56,0.12,0.07);
    } else if (kind === "shrine") {
      rect("#806f91", -0.06, -0.62, 0.12, 0.5);rect("#4d665f", -0.3, -0.2, 0.6, 0.17);
      ctx.strokeStyle="#8ed1c1";ctx.lineWidth=Math.max(2,s*.055);ctx.beginPath();ctx.arc(k,base-s*.55,s*.25,0,Math.PI*1.45);ctx.stroke();ctx.beginPath();ctx.arc(k,base-s*.55,s*.13,Math.PI*.3,Math.PI*1.8);ctx.stroke();
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
  const colors={beacon:'#72d7df',crossing:'#d5a464',danger:'#d16b62',event:'#a68ad2',wonder:'#ffd36a'},c=colors[signalKind]||'#b7b49d';ctx.strokeStyle=c;ctx.fillStyle=c+'22';ctx.lineWidth=Math.max(2,s*.07);ctx.beginPath();
  if(signalKind==='wonder'){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx[i?'lineTo':'moveTo'](Math.cos(a)*s*.24,Math.sin(a)*s*.24)}ctx.closePath();ctx.moveTo(s*.24,0);ctx.lineTo(s*.42,0);} // release 729: a megastructure (a pentagon, its point the way)
  else if(signalKind==='beacon')ctx.arc(0,0,s*.27,0,Math.PI*1.65);
  else if(signalKind==='crossing'){ctx.moveTo(-s*.25,-s*.2);ctx.lineTo(s*.22,0);ctx.lineTo(-s*.25,s*.2);}
  else if(signalKind==='danger'){ctx.moveTo(-s*.22,-s*.25);ctx.lineTo(-s*.22,s*.25);ctx.lineTo(s*.25,0);ctx.closePath();}
  else{ctx.arc(0,0,s*.23,0,Math.PI*1.5);ctx.lineTo(s*.28,0);}
  ctx.fill();ctx.stroke();if(signalKind==='danger'){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(s*.25,0);ctx.lineTo(s*.07,-s*.09);ctx.lineTo(s*.07,s*.09);ctx.closePath();ctx.fill()}return c;
}
function waymark(ctx,o,s){
  const cx=(o.x+.5)*s,cy=(o.y+.55)*s,a=Math.atan2(o.dirY,o.dirX);ctx.save();ctx.translate(cx,cy);ctx.rotate(a);drawWaymarkIcon(ctx,o.signalKind,s);ctx.restore();
}
// Pentagon finding (pentagon.ts PENTAGON_FINDING): a five-sided sigil cut into the ground, wider than a tile, one of its points
// drawn out long into an arrowhead along the true bearing to its Pentagon (dirX, dirY); a dark cut under a gold line, so it reads on
// any ground. Paths only, nothing allocated.
function pentagonSigilMark(ctx,o,s){
  const cx=(o.x+.5)*s,cy=(o.y+.5)*s,r=s*.62,a=Math.atan2(o.dirY,o.dirX);ctx.save();ctx.translate(cx,cy);ctx.rotate(a);ctx.lineJoin="round";
  const path=()=>{ctx.beginPath();ctx.moveTo(r*2.3,0);for(let i=1;i<5;i++){const t=i*Math.PI*2/5;ctx.lineTo(Math.cos(t)*r,Math.sin(t)*r)}ctx.closePath();ctx.moveTo(r*2.3,0);ctx.lineTo(r*1.75,-r*.32);ctx.moveTo(r*2.3,0);ctx.lineTo(r*1.75,r*.32);ctx.moveTo(r*.42,0);ctx.arc(0,0,r*.42,0,Math.PI*2)};
  path();ctx.fillStyle="rgba(20,14,4,.28)";ctx.fill();ctx.strokeStyle="rgba(16,10,2,.6)";ctx.lineWidth=Math.max(3,s*.16);ctx.stroke();
  ctx.strokeStyle=o.state==="read"?"#e7c46a":"#ffd36a";ctx.lineWidth=Math.max(1.5,s*.07);ctx.stroke();ctx.restore();
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
  if(map)return structureOccupancy(map,32,p.x,p.y,o.id)===o.id;
  return cx>b.x+inset&&cx<b.x+b.w-inset&&cy>b.y+inset&&cy<b.y+b.h-inset;
}
function shack(ctx,o,s,p,map){
  const b=o.bounds||{x:o.x-2,y:o.y-2,w:5,h:4},inside=insideShelter(o,p,map),x=b.x*s,y=b.y*s,w=b.w*s,h=b.h*s,accent={pilgrim:"#8f7658",relay:"#527d7b",chapel:"#806777",workshop:"#8c5944",stoneCottage:"#8b8170",ruinedKeep:"#9a8168",gatehouse:"#89765f",shrineHouse:"#706986",neonKiosk:"#42b8b2",relayBunker:"#4d8e9c",prismVault:"#a78cce",orbitalPod:"#7ea3bd",ribNest:"#9b647f",carapace:"#735e86"}[o.facadeStyle]||"#8f7658",condition=o.condition||"weathered",grain=(o.signGlyph||0)+b.x*3+b.y*5,masonry=['stoneCottage','ruinedKeep','gatehouse','shrineHouse'].includes(o.facadeStyle);
  ctx.save();
  const meta=structureRenderMeta(o),cells=meta.cells,set=meta.set;
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
// Roof report (2026-11-04): is the Wayfarer standing on a roof (structure "buildingRoof")? The tile under the feet, as landscape.ts tileUnder
// and movement read it (x + .5, y + .75), so the drawing, the roof's cutaway and a fall all agree on where they are.
export const roofTileUnder = (tiles, w, p) => !!p && tiles?.[Math.floor(p.y + .75) * w + Math.floor(p.x + .5)]?.structure === "buildingRoof";
export const standingOnRoof = (g, w) => g.area === "overworld" && roofTileUnder(g.map?.tiles, w, g.player); // (or lifted off it by the drone, or gliding from it)
// ... and on the ground just north of a building's block, where its roof and facade, drawn after the creatures, hide them?
export const behindRoof = (tiles, w, p) => { const x = Math.floor(p.x + .5), y = Math.floor(p.y + .75); for (let dy = 1; dy <= 4; dy++) { const t = tiles?.[(y + dy) * w + x]; if (t?.greatBuilding) return true; } return false; };
// Great buildings (great-buildings.ts): a closed block seen from outside, a roof over a facade with a row of windows a floor
// and the door; a keep in dressed stone under a parapet, an arcology in stained concrete with dead neon. A broken back shows
// as a torn gap in the roof's far edge (or the facade, when the door faces north).
function greatBuilding(ctx,o,s,p,map){
  const b=o.bounds,keep=o.style==="keep",grain=o.grain||0,floors=o.floors||3,south=o.door?.side!=="north",faceH=o.faceH||Math.min(b.h-2.2,1+floors*.5);
  const C=keep&&biomechanicalKeep(o.appearance)?{roof:"#353e37",roofLine:"#788271",wall:"#454e45",wallDark:"#252e28",mortar:"#171e19",trim:"#a4a084",glass:"#141d16",lit:"#c5d69a"}:keep?{roof:"#3a3631",roofLine:"#5b544a",wall:"#5d564b",wallDark:"#3f3a33",mortar:"#2b2823",trim:"#a18d6d",glass:"#1b1d22",lit:"#e8b860"}:{roof:"#3b3f44",roofLine:"#575d63",wall:"#6a6e72",wallDark:"#45494d",mortar:"#2f3236",trim:"#58c7c2",glass:"#142328",lit:"#62f0e6"};
  // a block seen from the south: the roof is the footprint raised by the facade's height (where the Wayfarer stands on it), the facade below it
  const x=b.x*s,w=b.w*s,roofY=(b.y-faceH)*s,roofH=b.h*s,faceY=(b.y+b.h-faceH)*s,fH=faceH*s,foot=(b.y+b.h)*s;
  const onRoof=!!o.roof&&!!p&&(map?roofTileUnder(map,32,p):p.x>=b.x-.5&&p.x<b.x+b.w-.5&&p.y>=b.y-.5&&p.y<b.y+b.h-.5),behind=!onRoof&&p&&p.x>=b.x-.7&&p.x<b.x+b.w-.3&&p.y>=b.y-faceH-.8&&p.y<b.y+.4;
  ctx.save();if(behind)ctx.globalAlpha=.42; // walk behind it and it lets you see yourself
  ctx.fillStyle="#00000055";ctx.fillRect(x+s*.18,foot-s*.05,w,s*.28); // a shadow at its foot
  // the roof
  ctx.fillStyle=C.roof;ctx.fillRect(x,roofY,w,roofH);ctx.strokeStyle=C.roofLine;ctx.lineWidth=1;
  if(keep){for(let q=roofY+s*.5;q<roofY+roofH-s*.2;q+=s*.5){ctx.beginPath();ctx.moveTo(x+s*.3,q);ctx.lineTo(x+w-s*.3,q);ctx.stroke()}
    ctx.fillStyle=C.wallDark;for(let q=0;q<w;q+=s*.5){if(((q/s*2)|0)%2===0){ctx.fillRect(x+q,roofY,s*.32,s*.24);ctx.fillRect(x+q,roofY+roofH-s*.24,s*.32,s*.24)}} // the parapet's merlons
    ctx.fillStyle=C.wall;for(const cx of [x,x+w-s*1.1]){ctx.fillRect(cx,roofY,s*1.1,s*1.1);ctx.strokeStyle=C.mortar;ctx.strokeRect(cx+.5,roofY+.5,s*1.1-1,s*1.1-1)} // corner turrets
    ctx.fillStyle="#5c2f2a";ctx.beginPath();ctx.moveTo(x+w*.5,roofY+s*.35);ctx.lineTo(x+w*.5+s*.5,roofY+s*.55);ctx.lineTo(x+w*.5,roofY+s*.75);ctx.closePath();ctx.fill();ctx.strokeStyle="#2a2522";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w*.5,roofY+s*.3);ctx.lineTo(x+w*.5,roofY+s*1.15);ctx.stroke(); // a torn banner
  }else{for(let q=x+s;q<x+w-s*.5;q+=s){ctx.beginPath();ctx.moveTo(q,roofY+s*.2);ctx.lineTo(q,roofY+roofH-s*.2);ctx.stroke()}
    ctx.fillStyle="#2d3135";ctx.fillRect(x+s*.6,roofY+s*.5,s*1.2,s*.8);ctx.fillRect(x+w-s*2,roofY+s*.7,s*.9,s*.9); // plant and vents
    ctx.fillStyle="#53585e";ctx.beginPath();ctx.arc(x+w-s*1.55,roofY+s*1.15,s*.32,0,7);ctx.fill(); // a water tank
    ctx.strokeStyle=C.trim+"88";ctx.lineWidth=2;ctx.strokeRect(x+s*.15,roofY+s*.15,w-s*.3,roofH-s*.3); // the rim's dead neon
    ctx.fillStyle="#1d1f22";ctx.fillRect(x+w*.35,roofY+roofH-s*.62,w*.3,s*.42);ctx.fillStyle=C.trim+(grain%3?"55":"cc");ctx.font=`${Math.max(7,s*.26)}px monospace`;ctx.textAlign="center";ctx.fillText(grain%2?"HAB":"ARC",x+w*.5,roofY+roofH-s*.3);ctx.textAlign="start"; // its sign
  }
  if(o.roof){const lift=faceH*s; // a roof you can stand on: where it has fallen in, and its hatch
    for(const c of o.roof.crumbled||[]){const cx=c.x*s,cy=c.y*s-lift,k=(c.x*7+c.y*3)%5;ctx.fillStyle="#060607";ctx.beginPath();ctx.moveTo(cx+s*.1,cy+s*.2);ctx.lineTo(cx+s*(.4+k*.05),cy+s*.05);ctx.lineTo(cx+s*.9,cy+s*.25);ctx.lineTo(cx+s*.85,cy+s*.85);ctx.lineTo(cx+s*.3,cy+s*.95);ctx.closePath();ctx.fill();ctx.fillStyle=C.wallDark;ctx.fillRect(cx+s*.62,cy+s*.6,s*.2,s*.14);ctx.fillRect(cx+s*.15,cy+s*.4,s*.16,s*.12)}
    const hx=o.roof.hatch.x*s,hy=o.roof.hatch.y*s-lift;ctx.fillStyle="#1a1612";ctx.fillRect(hx+s*.12,hy+s*.12,s*.76,s*.76);ctx.strokeStyle=C.trim;ctx.lineWidth=2;ctx.strokeRect(hx+s*.12,hy+s*.12,s*.76,s*.76);ctx.strokeStyle="#8a7650";ctx.beginPath();ctx.moveTo(hx+s*.32,hy+s*.12);ctx.lineTo(hx+s*.32,hy+s*.88);ctx.moveTo(hx+s*.68,hy+s*.12);ctx.lineTo(hx+s*.68,hy+s*.88);for(let q=.28;q<.9;q+=.2){ctx.moveTo(hx+s*.32,hy+s*q);ctx.lineTo(hx+s*.68,hy+s*q)}ctx.stroke();
    ctx.strokeStyle="#00000066";ctx.lineWidth=3;ctx.strokeRect(x+1.5,roofY+1.5,w-3,roofH-3);}
  // the facade: a band a floor, windows in each
  ctx.fillStyle=C.wall;ctx.fillRect(x,faceY,w,fH);ctx.fillStyle="#00000033";ctx.fillRect(x,faceY,w,s*.14);
  const band=fH/floors;
  for(let f=0;f<floors;f++){const by=faceY+fH-band*(f+1);ctx.strokeStyle=C.mortar;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,by);ctx.lineTo(x+w,by);ctx.stroke();
    if(keep){for(let q=x+s*.3;q<x+w;q+=s*.5){ctx.beginPath();ctx.moveTo(q+(f%2)*s*.25,by);ctx.lineTo(q+(f%2)*s*.25,by+band);ctx.stroke()}}
    const n=Math.max(2,Math.floor(b.w/(keep?2:1.3)));
    for(let i=0;i<n;i++){const wx=x+(i+.5)*w/n,wy=by+band*.22,ww=s*(keep?.22:.42),wh=band*.56,k=(grain*7+i*13+f*31)%11;
      if(f===0&&south&&Math.abs(wx-(o.door.x+.5)*s)<s*.9)continue;
      ctx.fillStyle=k===0?C.lit+"cc":k<3?"#090a0c":C.glass;
      if(keep){ctx.beginPath();ctx.moveTo(wx-ww/2,wy+wh);ctx.lineTo(wx-ww/2,wy+ww/2);ctx.arc(wx,wy+ww/2,ww/2,Math.PI,0);ctx.lineTo(wx+ww/2,wy+wh);ctx.closePath();ctx.fill()}
      else{ctx.fillRect(wx-ww/2,wy,ww,wh);ctx.strokeStyle=k<3?"#5e646a":C.trim+"55";ctx.strokeRect(wx-ww/2+.5,wy+.5,ww-1,wh-1);if(k===1){ctx.strokeStyle="#9aa3aa88";ctx.beginPath();ctx.moveTo(wx-ww/2,wy);ctx.lineTo(wx+ww*.1,wy+wh*.6);ctx.lineTo(wx+ww/2,wy+wh*.2);ctx.stroke()}}}
  }
  ctx.strokeStyle=C.trim+"99";ctx.lineWidth=2;ctx.strokeRect(x+1,roofY+1,w-2,foot-roofY-2);ctx.beginPath();ctx.moveTo(x,faceY);ctx.lineTo(x+w,faceY);ctx.stroke();
  ctx.strokeStyle="#1a1a1a99";ctx.lineWidth=1.5;ctx.beginPath();const cx0=x+w*(.2+(grain%5)*.12);ctx.moveTo(cx0,faceY+s*.1);ctx.lineTo(cx0+s*.2,faceY+fH*.35);ctx.lineTo(cx0-s*.1,faceY+fH*.6);ctx.stroke(); // weathering
  for(let i=0;i<b.w;i++){const wr=(Math.imul(b.x+i+31,73856093)^Math.imul(b.y+17,19349663)^Math.imul(grain+7,83492791))>>>0,u=wr%100,v=(wr>>>8)%100,cx1=x+i*s; // age, column by column: chips along the top, moss, vines, rubble at the foot, fallen roof
    if(u<40){ctx.fillStyle="#08080a";ctx.beginPath();ctx.moveTo(cx1+s*.1,faceY);ctx.lineTo(cx1+s*.3,faceY+s*.2);ctx.lineTo(cx1+s*.55,faceY);ctx.closePath();ctx.fill()}
    if(v<20){ctx.fillStyle="#3f5a2e77";ctx.fillRect(cx1+s*.4,faceY,s*.12,fH*(.35+(u%4)*.1))}
    if(u>=82){ctx.fillStyle="#5d5446";for(let j=0;j<3;j++){const rx=cx1+s*(.1+j*.28),ry=foot-s*.04;ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx+s*.1,ry-s*.1);ctx.lineTo(rx+s*.2,ry);ctx.closePath();ctx.fill()}}
    if(v>=88){ctx.fillStyle="#4f6a3a88";ctx.beginPath();ctx.arc(cx1+s*.5,roofY+roofH*(.3+(u%5)*.1),s*.16,0,7);ctx.fill()}
    if(v>=50&&v<54){ctx.fillStyle="#0a0a0c";ctx.fillRect(cx1+s*.2,roofY+roofH*.4,s*.6,s*.5)}}
  // the door
  if(o.door){const dx=(o.door.x+.08)*s,dw=s*.84;if(south){const dh=Math.min(band*.95,s*1.1),dy=foot-dh;ctx.fillStyle="#08090a";ctx.fillRect(dx,dy,dw,dh);if(keep){ctx.beginPath();ctx.arc(dx+dw/2,dy,dw/2,Math.PI,0);ctx.fill()}ctx.strokeStyle=C.trim;ctx.lineWidth=2;ctx.strokeRect(dx,dy,dw,dh);ctx.fillStyle=C.trim+"55";ctx.fillRect(dx-s*.12,foot-s*.08,dw+s*.24,s*.08)}
    else{ctx.fillStyle="#08090a";ctx.fillRect(dx,roofY,dw,s*.55);ctx.strokeStyle=C.trim;ctx.lineWidth=2;ctx.strokeRect(dx,roofY,dw,s*.55)}}
  // a broken back
  if(o.breach){const bx=(o.breach.x+.5)*s,top=o.breach.y===b.y,yy=top?roofY:foot;ctx.fillStyle="#07080a";ctx.beginPath();if(top){ctx.moveTo(bx-s*.75,yy);ctx.lineTo(bx-s*.35,yy+s*.7);ctx.lineTo(bx,yy+s*.45);ctx.lineTo(bx+s*.3,yy+s*.85);ctx.lineTo(bx+s*.8,yy)}else{ctx.moveTo(bx-s*.75,yy);ctx.lineTo(bx-s*.4,yy-s*.9);ctx.lineTo(bx,yy-s*.6);ctx.lineTo(bx+s*.35,yy-s*1.05);ctx.lineTo(bx+s*.8,yy)}ctx.closePath();ctx.fill();
    ctx.fillStyle=C.wallDark;for(let i=0;i<5;i++)ctx.fillRect(bx-s*.7+i*s*.3,(top?yy-s*.18:yy-s*.05)+((grain+i)%2)*s*.08,s*.22,s*.16)}
  ctx.fillStyle="#d8ccae";ctx.font=`${Math.max(8,s*.2)}px monospace`;ctx.textAlign="center";ctx.fillText(String(o.name).toUpperCase(),x+w/2,roofY-s*.14);ctx.textAlign="start";
  ctx.restore();
}
// Compounds (compounds.ts): blocks of cells, each seen from the south: every cell's roof raised by its block's facade height
// (where the Wayfarer stands on it), a facade under every cell whose south side is open, a window a floor in each; drawn north
// to south so nearer walls stand in front. Doors on a south face are drawn in the facade; on other faces, as a dark arch at the
// roof's edge. Faded while you stand behind it.
// The Pentagon v7 (pentagon.ts PENTAGON.balconies, .stair): a balcony or a step of the outer stair, raised ground outside the
// outer face drawn at its height on the roof's scale (where movement lifts the Wayfarer): a stone slab, a pier down to the
// ground with its coursing, and on a balcony's door cell the door into the wall behind it. Drawn after the roof row behind.
function drawPentLedge(ctx,c,s,tiles,C,ledgeAt){
  const t=tiles?.[c.y*32+c.x],level=(c.elev||0)-(t?.slope?.5:0),lift=Math.max(0,level)*LIFT_PER_LEVEL*(t?.roofLift||1)*s,x=c.x*s,y=c.y*s-lift,foot=(c.y+1)*s,has=(dx,dy)=>ledgeAt.has((c.y+dy)*32+c.x+dx);
  ctx.fillStyle="#00000044";ctx.fillRect(x+s*.1,foot-s*.08,s*.9,s*.16); // its shadow at the foot
  ctx.fillStyle=C.wall;ctx.fillRect(x,y+s,s+1,Math.max(0,lift-s*.02)); // the pier
  ctx.strokeStyle=C.mortar;ctx.lineWidth=1;ctx.beginPath();for(let q=y+s+s*.34;q<foot-2;q+=s*.34){ctx.moveTo(x,q);ctx.lineTo(x+s,q)}ctx.stroke();
  ctx.fillStyle="#00000030";ctx.fillRect(x+s*.72,y+s,s*.28,lift);
  if(c.kind==="balcony"){ctx.fillStyle="#4c463c";ctx.fillRect(x,y,s+1,s+1);ctx.fillStyle=C.trim+"66";if(!has(0,1))ctx.fillRect(x,y+s*.86,s+1,s*.14);if(!has(-1,0))ctx.fillRect(x,y,s*.1,s);if(!has(1,0))ctx.fillRect(x+s*.9,y,s*.1,s); // the slab and its rail
    ctx.fillStyle=C.dark;for(const k of [.2,.62])ctx.fillRect(x+s*k,y+s,s*.18,s*.3); // corbels under the lip
    if(c.door){const dx=c.door.x-c.x,dy=c.door.y-c.y;ctx.fillStyle="#08090a";ctx.strokeStyle=C.trim;ctx.lineWidth=1.5;
      if(dy<0){ctx.fillRect(x+s*.2,y-s*.82,s*.6,s*.82);ctx.beginPath();ctx.arc(x+s*.5,y-s*.82,s*.3,Math.PI,0);ctx.fill();ctx.strokeRect(x+s*.2,y-s*.82,s*.6,s*.82)}
      else if(dy>0){ctx.beginPath();ctx.moveTo(x+s*.2,y+s*.9);ctx.lineTo(x+s*.2,y+s*.5);ctx.arc(x+s*.5,y+s*.5,s*.3,Math.PI,0);ctx.lineTo(x+s*.8,y+s*.9);ctx.closePath();ctx.fill();ctx.stroke()}
      else{const ex=dx<0?x:x+s*.7;ctx.fillRect(ex,y-s*.5,s*.3,s*1.1);ctx.strokeRect(ex,y-s*.5,s*.3,s*1.1)}}}
  else{ctx.fillStyle="#5a5347";ctx.fillRect(x,y,s+1,s+1);ctx.strokeStyle=C.mortar;ctx.lineWidth=1.5;ctx.beginPath();for(const k of [.33,.66]){ctx.moveTo(x+s*k,y+s*.08);ctx.lineTo(x+s*k,y+s*.92)}ctx.stroke();ctx.fillStyle="#ffffff14";ctx.fillRect(x,y,s+1,s*.12)} // a step of the stair
}
function greatBlocks(ctx,o,s,p,map,view){
  const st=o.style,grain=o.grain||0,C=st==="keep"&&biomechanicalKeep(o.appearance)?{roof:"#353e37",line:"#788271",wall:"#454e45",dark:"#252e28",mortar:"#171e19",trim:"#a4a084",glass:"#141d16",lit:"#c5d69a",court:null}:st==="keep"?{roof:"#3a3631",line:"#5b544a",wall:"#5d564b",dark:"#3f3a33",mortar:"#2b2823",trim:"#a18d6d",glass:"#1b1d22",lit:"#e8b860",court:null}:st==="hive"?{roof:"#2e2238",line:"#4b3858",wall:"#4a3550",dark:"#2a1d31",mortar:"#1f1524",trim:"#b07ad0",glass:"#120b18",lit:"#d58cff"}:{roof:"#3b3f44",line:"#575d63",wall:"#6a6e72",dark:"#45494d",mortar:"#2f3236",trim:"#58c7c2",glass:"#142328",lit:"#62f0e6"};
  const vis=(c,b)=>!view||(c.x>=view.l-1&&c.x<=view.r+1&&c.y>=view.t-1&&c.y-b.faceH<=view.b+1); // the Pentagon's sections hold hundreds of cells: draw the ones in view
  const all=[];for(const b of o.blocks){const set=new Set(b.cells.map(c=>c.y*32+c.x));for(const c of b.cells)if(vis(c,b))all.push({c,b,set})}
  for(const c of o.ledges||[])if(vis(c,{faceH:3}))all.push({c,ledge:true}); // the Pentagon v7: its balconies and outer stair, each drawn after the roof row behind it
  all.sort((a,q)=>a.c.y-q.c.y||(a.ledge?1:0)-(q.ledge?1:0)||a.c.x-q.c.x);
  const parapet=new Set((o.parapet||[]).map(c=>c.y*32+c.x)),ledgeAt=new Set((o.ledges||[]).map(c=>c.y*32+c.x));
  const onRoof=roofTileUnder(map,32,p),px=Math.round(p.x),py=p.y+.5; // roof report 2026-11-04: the tile under the feet, as movement and the player draw read it
  const covers=(c,b,set)=>!onRoof&&Math.abs(c.x-px)<=1&&py>=c.y-b.faceH-.5&&py<c.y+(set.has((c.y+1)*32+c.x)?0:1); // what stands between you and the camera fades, nothing else
  const doorAt=new Map((o.doors||[]).map(d=>[`${d.x},${d.y}`,d])),hatchAt=new Map((o.hatches||[]).map(q=>[`${q.x},${q.y}`,q])),fallen=new Set((o.crumbled||[]).map(c=>`${c.x},${c.y}`));
  ctx.save();
  for(const item of all){if(item.ledge){ctx.globalAlpha=1;drawPentLedge(ctx,item.c,s,map,C,ledgeAt);continue}const {c,b,set}=item;ctx.globalAlpha=covers(c,b,set)?.38:1;const lift=b.faceH*s,x=c.x*s,y=c.y*s-lift,has=(dx,dy)=>set.has((c.y+dy)*32+c.x+dx),k=(c.x*7+c.y*13+grain)%11;
    // roof
    ctx.fillStyle=b.part==="t"?C.dark:C.roof;ctx.fillRect(x,y,s+1,s+1);ctx.strokeStyle=C.line;ctx.lineWidth=1;
    if(st==="keep"){ctx.beginPath();ctx.moveTo(x,y+s*.5);ctx.lineTo(x+s,y+s*.5);ctx.stroke();if(!has(0,-1)||!has(0,1)){ctx.fillStyle=C.dark;if(((c.x+grain)&1)===0)ctx.fillRect(x+s*.2,has(0,-1)?y+s*.76:y,s*.6,s*.24)}}
    if(parapet.size&&parapet.has(c.y*32+c.x)){ctx.fillStyle=C.dark;ctx.fillRect(x,y,s+1,s+1);ctx.fillStyle=C.wall;for(const [mx,my] of [[.08,.1],[.56,.1],[.32,.56]])ctx.fillRect(x+s*mx,y+s*my,s*.36,s*.32);ctx.strokeStyle=C.mortar;ctx.strokeRect(x+.5,y+.5,s-1,s-1)} // the v7 roof's parapet: merlons along the roof's inner edge
    if(st==="keep"){}else if(st==="hive"){ctx.fillStyle=C.line+"55";ctx.beginPath();ctx.ellipse(x+s*.5,y+s*.5,s*.32,s*.22,(k%3)*.6,0,7);ctx.fill()}
    else{ctx.strokeRect(x+.5,y+.5,s-1,s-1);if(k===3){ctx.fillStyle="#2d3135";ctx.fillRect(x+s*.2,y+s*.2,s*.5,s*.4)}}
    ctx.strokeStyle=C.trim+"99";ctx.lineWidth=2;ctx.beginPath();if(!has(-1,0)){ctx.moveTo(x+1,y);ctx.lineTo(x+1,y+s)}if(!has(1,0)){ctx.moveTo(x+s-1,y);ctx.lineTo(x+s-1,y+s)}if(!has(0,-1)){ctx.moveTo(x,y+1);ctx.lineTo(x+s,y+1)}ctx.stroke();
    // age (Tim: "they should be old... falling apart... parts of the walls aren't there... more detail to the walls"): every
    // cell weathered by its own hash: the stone's tone, moss, a fallen-in patch, broken battlements along an open edge
    const wear=(Math.imul(c.x+31,73856093)^Math.imul(c.y+17,19349663)^Math.imul(grain+7,83492791))>>>0,w1=wear%100,w2=(wear>>>8)%100,w3=(wear>>>16)%100;
    ctx.fillStyle=w1<50?"#00000022":"#ffffff10";ctx.fillRect(x+s*((w2%3)*.2),y+s*((w3%3)*.2),s*.5,s*.45);
    if(w2<22){ctx.fillStyle=st==="hive"?"#5a3a6a88":"#4f6a3a99";for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x+s*(.25+((w3+i*29)%5)*.12),y+s*(.3+((w1+i*17)%5)*.1),s*(.09+i*.02),0,7);ctx.fill()}} // moss
    if(!b.wall&&w3<9&&!map?.[c.y*32+c.x]?.pentRoof&&has(-1,0)&&has(1,0)&&has(0,-1)&&has(0,1)){ctx.fillStyle="#0a0a0c";ctx.beginPath();ctx.moveTo(x+s*.2,y+s*.25);ctx.lineTo(x+s*.55,y+s*.12);ctx.lineTo(x+s*.82,y+s*.4);ctx.lineTo(x+s*.66,y+s*.82);ctx.lineTo(x+s*.25,y+s*.7);ctx.closePath();ctx.fill();ctx.fillStyle=C.dark;ctx.fillRect(x+s*.36,y+s*.5,s*.18,s*.12)} // fallen in
    if(st==="keep"&&(!has(0,-1)||!has(0,1))){const top=!has(0,-1)?y:y+s*.76;ctx.fillStyle="#00000055";for(let i=0;i<3;i++)if(((wear>>>(i*3))&7)<2)ctx.fillRect(x+s*(.05+i*.33),top,s*.26,s*.24)} // battlements broken away
    if(fallen.has(`${c.x},${c.y}`)){ctx.fillStyle="#060607";ctx.beginPath();ctx.moveTo(x+s*.1,y+s*.2);ctx.lineTo(x+s*(.4+(k%5)*.05),y+s*.05);ctx.lineTo(x+s*.9,y+s*.25);ctx.lineTo(x+s*.85,y+s*.85);ctx.lineTo(x+s*.3,y+s*.95);ctx.closePath();ctx.fill();ctx.fillStyle=C.dark;ctx.fillRect(x+s*.62,y+s*.6,s*.2,s*.14)}
    const hq=hatchAt.get(`${c.x},${c.y}`);if(hq){ctx.fillStyle="#1a1612";ctx.fillRect(x+s*.12,y+s*.12,s*.76,s*.76);ctx.strokeStyle=C.trim;ctx.lineWidth=2;ctx.strokeRect(x+s*.12,y+s*.12,s*.76,s*.76);ctx.strokeStyle="#8a7650";ctx.beginPath();ctx.moveTo(x+s*.32,y+s*.12);ctx.lineTo(x+s*.32,y+s*.88);ctx.moveTo(x+s*.68,y+s*.12);ctx.lineTo(x+s*.68,y+s*.88);for(let q=.28;q<.9;q+=.2){ctx.moveTo(x+s*.32,y+s*q);ctx.lineTo(x+s*.68,y+s*q)}ctx.stroke()}
    const d=doorAt.get(`${c.x},${c.y}`);if(d&&d.face!=="south"){ctx.fillStyle="#08090a";const w=s*.6;if(d.face==="north"){ctx.fillRect(x+s*.2,y,w,s*.34)}else if(d.face==="west"){ctx.fillRect(x,y+s*.2,s*.3,w)}else{ctx.fillRect(x+s*.7,y+s*.2,s*.3,w)}ctx.strokeStyle=C.trim;ctx.lineWidth=1.5;ctx.strokeRect(d.face==="north"?x+s*.2:d.face==="west"?x:x+s*.7,d.face==="north"?y:y+s*.2,d.face==="north"?w:s*.3,d.face==="north"?s*.34:w)}
    if(o.lever&&o.lever.x===c.x&&o.lever.y===c.y)drawPentLever(ctx,{x:c.x,y:c.y-b.faceH,state:o.lever.state},s,0); // TOWER_SEAL: the lever on a sealed tower's top, drawn with its roof
    // the facade under an open south side
    if(!has(0,1)){const fy=(c.y+1)*s-lift,band=lift/b.floors;ctx.fillStyle=C.wall;ctx.fillRect(x,fy,s+1,lift);ctx.fillStyle="#00000033";ctx.fillRect(x,fy,s+1,s*.1);
      for(let f=0;f<b.floors;f++){const by=fy+lift-band*(f+1);ctx.strokeStyle=C.mortar;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,by);ctx.lineTo(x+s,by);ctx.stroke();
        if(b.wall){ctx.strokeStyle=C.mortar;ctx.beginPath();ctx.moveTo(x+s*((c.y&1)?.3:.7),by);ctx.lineTo(x+s*((c.y&1)?.3:.7),by+band);ctx.stroke();continue} // a curtain wall: coursed stone, no windows
        if(f===0&&d?.face==="south")continue;const q=(k+f*5)%9,ww=s*(st==="keep"?.22:.42),wh=band*.56,wx=x+s*.5,wy=by+band*.22;ctx.fillStyle=q===0?C.lit+"cc":q<3?"#090a0c":C.glass;
        if(st==="keep"){ctx.beginPath();ctx.moveTo(wx-ww/2,wy+wh);ctx.lineTo(wx-ww/2,wy+ww/2);ctx.arc(wx,wy+ww/2,ww/2,Math.PI,0);ctx.lineTo(wx+ww/2,wy+wh);ctx.closePath();ctx.fill()}
        else if(st==="hive"){ctx.beginPath();ctx.ellipse(wx,wy+wh/2,ww/2,wh/2,0,0,7);ctx.fill()}
        else{ctx.fillRect(wx-ww/2,wy,ww,wh);ctx.strokeStyle=C.trim+"55";ctx.strokeRect(wx-ww/2+.5,wy+.5,ww-1,wh-1)}}
      if(d?.face==="south"){const dh=Math.min(band*.95,s*1.05),dx=x+s*.1,dw=s*.8,dy=(c.y+1)*s-dh;ctx.fillStyle="#08090a";ctx.fillRect(dx,dy,dw,dh);if(st==="keep"){ctx.beginPath();ctx.arc(dx+dw/2,dy,dw/2,Math.PI,0);ctx.fill()}ctx.strokeStyle=C.trim;ctx.lineWidth=2;ctx.strokeRect(dx,dy,dw,dh)}
      ctx.strokeStyle=C.trim+"77";ctx.lineWidth=1.5;ctx.beginPath();if(!has(-1,0)){ctx.moveTo(x+1,fy);ctx.lineTo(x+1,fy+lift)}if(!has(1,0)){ctx.moveTo(x+s-1,fy);ctx.lineTo(x+s-1,fy+lift)}ctx.stroke();
      { const fy2=(c.y+1)*s-lift; // the facade's age: a chipped top, a crack, a moss streak, a stain; rubble at its foot; a stretch fallen to a heap
        ctx.fillStyle="#0000002a";ctx.fillRect(x+s*((w3%4)*.2),fy2+s*.1,s*.3,lift*.8);
        if(w1<38){ctx.fillStyle="#08080a";ctx.beginPath();ctx.moveTo(x+s*(.1+(w2%4)*.12),fy2);ctx.lineTo(x+s*(.25+(w2%4)*.12),fy2+s*(.18+(w3%3)*.06));ctx.lineTo(x+s*(.45+(w2%4)*.12),fy2);ctx.closePath();ctx.fill()}
        if(w2>=40&&w2<62){ctx.strokeStyle="#151517cc";ctx.lineWidth=1.3;ctx.beginPath();const cx2=x+s*(.3+(w3%4)*.12);ctx.moveTo(cx2,fy2+s*.05);ctx.lineTo(cx2+s*.12,fy2+lift*.35);ctx.lineTo(cx2-s*.06,fy2+lift*.62);ctx.lineTo(cx2+s*.05,fy2+lift*.9);ctx.stroke()}
        if(w3>=60&&w3<78){ctx.fillStyle=st==="hive"?"#6a3a7a55":"#3f5a2e77";ctx.fillRect(x+s*(.15+(w1%4)*.15),fy2,s*.12,lift*(.4+(w2%5)*.1));ctx.beginPath();ctx.arc(x+s*(.21+(w1%4)*.15),fy2,s*.12,0,7);ctx.fill()} // vine
        if(w1>=80){ctx.fillStyle="#5d5446";for(let i=0;i<4;i++){const rx2=x+s*(.08+((w2+i*23)%9)*.1),ry2=(c.y+1)*s-s*(.04+((w3+i*11)%3)*.05);ctx.beginPath();ctx.moveTo(rx2,ry2);ctx.lineTo(rx2+s*.12,ry2-s*.1);ctx.lineTo(rx2+s*.22,ry2);ctx.closePath();ctx.fill()}} // rubble at its foot
        if(b.wall&&w2<14){ctx.fillStyle=C.roof;ctx.fillRect(x,fy2,s+1,lift*.55);ctx.fillStyle="#6a6152";ctx.beginPath();ctx.moveTo(x,(c.y+1)*s);ctx.lineTo(x+s*.15,fy2+lift*.5);ctx.lineTo(x+s*.4,fy2+lift*.62);ctx.lineTo(x+s*.6,fy2+lift*.45);ctx.lineTo(x+s*.85,fy2+lift*.6);ctx.lineTo(x+s,(c.y+1)*s);ctx.closePath();ctx.fill();ctx.fillStyle="#4a4339";ctx.fillRect(x+s*.3,(c.y+1)*s-s*.2,s*.2,s*.12)} } // a stretch of curtain fallen to a heap (still impassable)
      ctx.fillStyle="#00000044";ctx.fillRect(x,(c.y+1)*s-2,s+1,4);}
  }
  ctx.globalAlpha=1;const b=o.bounds;ctx.fillStyle="#d8ccae";ctx.font=`${Math.max(8,s*.2)}px monospace`;ctx.textAlign="center";ctx.fillText(String(o.name).toUpperCase(),(b.x+b.w/2)*s,(b.y-Math.max(...o.blocks.map(q=>q.faceH)))*s-s*.14);ctx.textAlign="start";
  ctx.restore();
}
// The way down and the way out (Tim, 2026-11-03: "I'll get to the end and there'll be the way out versus the way down... and
// it'll just take me out... I'm not sure which one I actually should go to... it should just be better marked"): over every
// way down (an annex stair, the Deep's stair, a deep dungeon's stair down) a gold beam and "▼ WAY DOWN · FLOOR n"; over every
// way out (a door out, the cleared return, the Ember Door) "WAY OUT" in red. When the way down is off the screen, an arrow at
// the edge points to it.
const WAY_DOWN = new Set(["annexStair", "deepStair"]);
export function wayKind(o, map) {
  if (WAY_DOWN.has(o.kind) || (o.kind === "deepTransition" && o.direction === "down")) return "down";
  if (o.kind === "exit" || o.kind === "emberDoor") return map?.building?.labyrinth || map?.building ? null : "out"; // buildings name their own doors
  return null;
}
export function wayLabel(o, map) { // the way's name (its interaction name carries it; nothing is written in the world)
  if (o.kind === "annexStair") return `▼ WAY DOWN · FLOOR ${o.floor}`;
  if (o.kind === "deepStair") return `▼ WAY DOWN · FLOOR ${(map.deepFloor || 1) + 1}`;
  if (o.kind === "deepTransition") return `▼ WAY DOWN`;
  if (o.kind === "emberDoor") return "WAY OUT · burns an ember";
  return o.completionExit ? "WAY OUT · leave the dungeon" : "WAY OUT";
}
function drawWayMarks(ctx, g, s, now) {
  const pulse = .5 + .5 * Math.sin(now / 380);
  for (const o of g.map.objects || []) { const k = wayKind(o, g.map); if (!k || o.state === "hidden" || !renderableObject(g, o) || !seenInDungeon(g, o)) continue;
    const cx = (o.x + .5) * s, top = o.y * s - s * .9;
    ctx.save();
    ctx.strokeStyle = k === "down" ? `rgba(255,226,140,${.45 + .3 * pulse})` : `rgba(120,230,190,${.35 + .25 * pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, o.y * s + s * .84, s * .46, s * .14, 0, 0, 7); ctx.stroke();
    ctx.restore(); }
}
// Tim: "we shouldn't use [the red block] for the exit... a different sprite... stairs lead up or lead down... an upfacing chevron
// on its head and a downfacing chevron on its head". A way's marker: a squat stone with a glowing chevron above it, ▼ gold for
// the way down, ▲ green for a way up or out (amber for the Ember Door, which burns an ember).
function drawWayMarker(ctx, o, s, now, dir, ember = false) {
  const cx = (o.x + .5) * s, base = (o.y + .92) * s, pulse = .5 + .5 * Math.sin(now / 360), col = dir === "down" ? [255, 226, 140] : ember ? [255, 170, 80] : [120, 230, 190];
  ctx.save(); ctx.fillStyle = "#00000060"; ctx.beginPath(); ctx.ellipse(cx, base, s * .36, s * .1, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#3e3c44"; ctx.beginPath(); ctx.moveTo(cx - s * .3, base); ctx.lineTo(cx - s * .24, base - s * .46); ctx.lineTo(cx + s * .24, base - s * .46); ctx.lineTo(cx + s * .3, base); ctx.closePath(); ctx.fill(); // the stone
  ctx.fillStyle = "#57555f"; ctx.fillRect(cx - s * .24, base - s * .5, s * .48, s * .08); ctx.fillStyle = `rgba(${col},${.25 + .2 * pulse})`; ctx.fillRect(cx - s * .16, base - s * .38, s * .32, s * .26); // its lit face
  const cy = base - s * (.82 + .05 * Math.sin(now / 420)), k = s * .2, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * .45); g.addColorStop(0, `rgba(${col},${.35 + .25 * pulse})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, s * .45, 0, 7); ctx.fill();
  ctx.strokeStyle = "#000b"; ctx.lineWidth = Math.max(4, s * .13); ctx.lineCap = "round"; ctx.lineJoin = "round"; const d = dir === "down" ? 1 : -1;
  ctx.beginPath(); ctx.moveTo(cx - k, cy - d * k * .5); ctx.lineTo(cx, cy + d * k * .5); ctx.lineTo(cx + k, cy - d * k * .5); ctx.stroke(); // its chevron, outlined
  ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = Math.max(2, s * .08); ctx.stroke(); ctx.restore();
}
function drawWayDownPointer(ctx, g, w, h, s, p, lift, now) {
  const down = (g.map.objects || []).find((o) => wayKind(o, g.map) === "down" && o.state !== "hidden" && renderableObject(g, o) && seenInDungeon(g, o)); if (!down) return; // only a way you have found
  const sx = w / 2 + (down.x + .5 - p.x) * s, sy = h / 2 + (down.y + .5 - p.y + lift) * s, m = 38;
  if (sx > m && sx < w - m && sy > m && sy < h - m) return; // on the screen: its own mark shows it
  const dx = sx - w / 2, dy = sy - h / 2, k = Math.min((w / 2 - m) / Math.max(1e-6, Math.abs(dx)), (h / 2 - m) / Math.max(1e-6, Math.abs(dy))), ax = w / 2 + dx * k, ay = h / 2 + dy * k, a = Math.atan2(dy, dx), pulse = .6 + .4 * Math.sin(now / 300);
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.fillStyle = `rgba(255,226,140,${pulse})`; ctx.strokeStyle = "#000c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-4, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
}
// A labyrinth's key on a little plinth, turning and glowing.
function drawLabKey(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .5) * s, t = now / 1000, bob = Math.sin(t * 2.4) * s * .05, glow = .5 + .5 * Math.sin(t * 3);
  ctx.save(); ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(cx, cy + s * .34, s * .3, s * .09, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#4a443b"; ctx.fillRect(cx - s * .2, cy + s * .14, s * .4, s * .2);
  const g = ctx.createRadialGradient(cx, cy - s * .1 + bob, 0, cx, cy - s * .1 + bob, s * .5); g.addColorStop(0, `rgba(255,220,130,${.35 + .3 * glow})`); g.addColorStop(1, "rgba(255,220,130,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy - s * .1 + bob, s * .5, 0, 7); ctx.fill();
  ctx.strokeStyle = "#e8c45a"; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath(); ctx.arc(cx - s * .12, cy - s * .1 + bob, s * .1, 0, 7); ctx.moveTo(cx - s * .02, cy - s * .1 + bob); ctx.lineTo(cx + s * .22, cy - s * .1 + bob); ctx.moveTo(cx + s * .14, cy - s * .1 + bob); ctx.lineTo(cx + s * .14, cy - s * .02 + bob); ctx.moveTo(cx + s * .2, cy - s * .1 + bob); ctx.lineTo(cx + s * .2, cy - s * .03 + bob); ctx.stroke();
  ctx.restore();
}
// The Pentagon (pentagon.ts): a pressure plate let into the floor, its rim worn bright; loose rubble to build a block with; a
// relic of the Fivefold Court, a cracked tablet on a low plinth with a faint glow until it is read.
function drawPressurePlate(ctx, x, y, s) {
  ctx.save(); ctx.fillStyle = "#00000066"; ctx.fillRect(x + s * .1, y + s * .12, s * .8, s * .8); ctx.fillStyle = "#6e6452"; ctx.fillRect(x + s * .14, y + s * .14, s * .72, s * .72);
  ctx.strokeStyle = "#c9b27a"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.strokeRect(x + s * .14, y + s * .14, s * .72, s * .72); ctx.strokeStyle = "#3a342b"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + s * .3, y + s * .5); ctx.lineTo(x + s * .7, y + s * .5); ctx.moveTo(x + s * .5, y + s * .3); ctx.lineTo(x + s * .5, y + s * .7); ctx.stroke(); ctx.restore();
}
function drawPentRubble(ctx, o, s) {
  const x = o.x * s, y = o.y * s; ctx.save(); ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(x + s * .5, y + s * .82, s * .4, s * .12, 0, 0, 7); ctx.fill();
  for (const [dx, dy, r, c] of [[.3, .66, .17, "#6b6152"], [.62, .7, .2, "#5a5144"], [.46, .5, .15, "#7d7262"], [.72, .52, .1, "#4c453a"], [.22, .48, .09, "#82776a"]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + s * (dx - r), y + s * (dy + r * .6)); ctx.lineTo(x + s * (dx - r * .5), y + s * (dy - r)); ctx.lineTo(x + s * (dx + r * .7), y + s * (dy - r * .7)); ctx.lineTo(x + s * (dx + r), y + s * (dy + r * .6)); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function drawPentRelic(ctx, o, s, now) {
  const cx = (o.x + .5) * s, y = o.y * s, lit = o.state !== "read", glow = .5 + .5 * Math.sin(now / 520); ctx.save();
  ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(cx, y + s * .86, s * .32, s * .1, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#3f3a33"; ctx.fillRect(cx - s * .26, y + s * .66, s * .52, s * .18); // the plinth
  if (lit) { const g = ctx.createRadialGradient(cx, y + s * .42, 0, cx, y + s * .42, s * .5); g.addColorStop(0, `rgba(190,215,255,${.25 + .2 * glow})`); g.addColorStop(1, "rgba(190,215,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, y + s * .42, s * .5, 0, 7); ctx.fill(); }
  ctx.fillStyle = lit ? "#8d8574" : "#6a6457"; ctx.beginPath(); ctx.moveTo(cx - s * .18, y + s * .68); ctx.lineTo(cx - s * .18, y + s * .28); ctx.arc(cx, y + s * .28, s * .18, Math.PI, 0); ctx.lineTo(cx + s * .18, y + s * .68); ctx.closePath(); ctx.fill(); // the tablet
  ctx.strokeStyle = "#2b2823"; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(cx - s * .1, y + s * (.34 + i * .1)); ctx.lineTo(cx + s * .1, y + s * (.34 + i * .1)); } ctx.moveTo(cx + s * .06, y + s * .14); ctx.lineTo(cx - s * .02, y + s * .4); ctx.lineTo(cx + s * .08, y + s * .6); ctx.stroke(); // its letters, and the crack through them
  ctx.restore();
}
// Marks in a Pentagon's wall (PENTAGON_LORE): a few uneven scratches on a worn slab against the wall, faintly warm until read.
function drawPentInscription(ctx, o, s, now) {
  const x = o.x * s, y = o.y * s, lit = o.state !== "read", warm = .5 + .5 * Math.sin(now / 900 + o.x); ctx.save();
  ctx.fillStyle = "#2c2a2e"; ctx.fillRect(x + s * .18, y + s * .2, s * .64, s * .62); ctx.strokeStyle = "#18171a"; ctx.lineWidth = 1; ctx.strokeRect(x + s * .18, y + s * .2, s * .64, s * .62);
  ctx.strokeStyle = lit ? `rgba(240,190,140,${.45 + .3 * warm})` : "#4a4648"; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath();
  for (let i = 0; i < 4; i++) { const ly = y + s * (.32 + i * .12), a = x + s * (.28 + (i % 2) * .05); ctx.moveTo(a, ly); ctx.lineTo(a + s * (.3 + ((i * 7) % 3) * .05), ly + s * .02 * (i % 2 ? 1 : -1)); }
  ctx.stroke(); ctx.restore();
}
// Release 795 (pentagon-halls.ts): the grand halls' marks, drawn small, for the top-down view (Close View paints them large later).
// The Watcher's sigil in a few strokes: a shut lid, an open eye, the stroke through it, the tools below.
function watcherGlyph(ctx, cx, cy, r, color) { ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, r * .16); ctx.beginPath(); ctx.arc(cx, cy - r * .62, r * .34, .15 * Math.PI, .85 * Math.PI); ctx.moveTo(cx + r * .32, cy); ctx.arc(cx, cy, r * .32, 0, 7); ctx.moveTo(cx - r * .7, cy + r * .42); ctx.lineTo(cx + r * .7, cy - r * .42); ctx.moveTo(cx - r * .1, cy + r * .52); ctx.lineTo(cx + r * .1, cy + r * .66); ctx.lineTo(cx, cy + r * .9); ctx.stroke(); ctx.fillStyle = color; ctx.fillRect(cx - r * .07, cy - r * .07, r * .14, r * .14); }
function drawHallMarks(ctx, map, s, l, t, r, b) {
  ctx.save();
  for (const m of map.murals || []) { if (m.place !== "wall" || !visibleInCamera(m, l, t, r, b)) continue; const M = PENTAGON_MURALS.find((q) => q.id === m.muralId), pal = M?.palette || ["#2a2520", "#8a7a5e", "#e0c890"], px = m.x * s, py = m.y * s;
    const along = m.side === "north" || m.side === "south", half = Math.min(2, (m.scale - 1) >> 1), x0 = px - (along ? half * s : 0), y0 = py - (along ? 0 : half * s), w = along ? (half * 2 + 1) * s : s, h = along ? s : (half * 2 + 1) * s;
    const fy = m.side === "north" ? py + s * .45 : y0, fh = m.side === "north" ? s * .5 : h; ctx.fillStyle = pal[0] + "cc"; ctx.fillRect(x0 + s * .08, fy, w - s * .16, fh); ctx.strokeStyle = pal[1]; ctx.lineWidth = Math.max(1, s * .05); ctx.strokeRect(x0 + s * .1, fy + s * .03, w - s * .2, fh - s * .06);
    ctx.strokeStyle = pal[2] + "aa"; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath(); const n = (along ? half * 2 + 1 : 1) * 3; for (let i = 0; i < n; i++) { const qx = x0 + s * .2 + (w - s * .4) * (i + .5) / n, qy = fy + fh * .5; ctx.moveTo(qx, qy - fh * .22); ctx.lineTo(qx + s * .05, qy + fh * .22); } ctx.stroke(); }
  for (const g of map.sigils || []) { if (g.kind === "inlay" || !visibleInCamera(g, l, t, r, b)) continue; const cx = (g.x + .5) * s, cy = (g.y + (g.kind === "column" ? .3 : g.side === "north" ? .7 : .5)) * s;
    if (g.kind === "banner") { const bx = cx - s * .26, by = g.side === "north" ? (g.y + .45) * s : (g.y + .12) * s; ctx.fillStyle = "#3a2a4ae6"; ctx.fillRect(bx, by, s * .52, s * .72); ctx.fillStyle = "#c9a15c"; ctx.fillRect(bx, by, s * .52, s * .05); watcherGlyph(ctx, cx, by + s * .34, s * .22, "#d8d0ffcc"); }
    else watcherGlyph(ctx, cx, cy, s * (g.kind === "lintel" ? .2 : .18), g.kind === "lintel" ? "#b8b0d8bb" : "#a79ed0aa"); }
  ctx.restore();
}
function drawPentMural(ctx, o, s, now) { const cx = (o.x + .5) * s, cy = (o.y + .55) * s, lit = o.state !== "read", a = lit ? .35 + .25 * (.5 + .5 * Math.sin(now / 1100 + o.x)) : .18; ctx.save();
  ctx.strokeStyle = `rgba(230,214,170,${a})`; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); ctx.ellipse(cx, cy, s * .3, s * .14, 0, 0, 7); ctx.stroke();
  if (o.place === "ceiling") { ctx.beginPath(); ctx.moveTo(cx - s * .12, cy - s * .02); ctx.lineTo(cx, cy - s * .2); ctx.lineTo(cx + s * .12, cy - s * .02); ctx.stroke(); } // look up
  ctx.restore(); }
// Version 2 (release 728): the Fivefold Seal's sigil, cut into a door it has not yet opened; the great levers in the courts;
// the Seal itself, a five-sided disc with an eyeless face, turning; the dread that closes in the deeper you go.
const pentPath = (ctx, cx, cy, r, a0 = -Math.PI / 2) => { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = a0 + i * Math.PI * 2 / 5; ctx[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.closePath(); };
function drawSigilMark(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .45) * s, pulse = .5 + .5 * Math.sin(now / 500); ctx.save(); ctx.strokeStyle = `rgba(176,140,255,${.55 + .35 * pulse})`; ctx.lineWidth = Math.max(1.5, s * .06);
  pentPath(ctx, cx, cy, s * .26); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, s * .08, 0, 7); ctx.stroke(); ctx.restore();
}
function drawPentLever(ctx, o, s, now) {
  const x = o.x * s, y = o.y * s, down = o.state === "pulled", a = down ? .75 : -.75; ctx.save(); ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(x + s * .5, y + s * .88, s * .4, s * .12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#3e3a33"; ctx.fillRect(x + s * .2, y + s * .6, s * .6, s * .3); ctx.fillStyle = "#57524a"; ctx.fillRect(x + s * .2, y + s * .6, s * .6, s * .07); // its block
  ctx.strokeStyle = "#7a6a4e"; ctx.lineWidth = Math.max(3, s * .1); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + s * .5, y + s * .66); ctx.lineTo(x + s * (.5 + Math.sin(a) * .42), y + s * (.66 - Math.cos(a) * .42)); ctx.stroke(); // its arm
  ctx.fillStyle = down ? "#8a7a5a" : `rgba(232,196,90,${.7 + .3 * Math.sin(now / 400)})`; ctx.beginPath(); ctx.arc(x + s * (.5 + Math.sin(a) * .44), y + s * (.66 - Math.cos(a) * .44), s * .09, 0, 7); ctx.fill(); ctx.restore();
}
// Version 6: the shortcut links. A lift cage, a ladder, a door or a portcullis; shut, it shows its bars (the near side) or its
// winch, bolt or lever (the deep side, lit gold: use it); open, it stands clear. A short dust ring when one opens.
function drawDungeonDoorTorch(ctx,point,s,mark,now,reduceMotion){
  const x=point.x*s,y=point.y*s;
  const flame=mark==="arrival"?"#55c6ff":mark==="visited"?"#b578ff":"#eac18a";
  const sway=reduceMotion?0:Math.sin(now/230+point.x+point.y)*s*.025;
  ctx.save();
  ctx.fillStyle="#302a27";ctx.fillRect(x-s*.08,y-s*.70,s*.16,s*.19);
  ctx.fillStyle="#a29a81";ctx.fillRect(x-s*.105,y-s*.72,s*.21,s*.055);
  ctx.globalAlpha*=.30;ctx.fillStyle=flame;
  ctx.beginPath();ctx.ellipse(x,y-s*.82,s*.16,s*.21,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha/=.30;
  ctx.beginPath();ctx.moveTo(x-s*.07,y-s*.73);
  ctx.quadraticCurveTo(x-s*.1,y-s*.82,x+sway,y-s*.98);
  ctx.quadraticCurveTo(x+s*.09,y-s*.82,x+s*.065,y-s*.73);ctx.fill();
  ctx.fillStyle="#fff6e2";ctx.fillRect(x-s*.02,y-s*.82,s*.04,s*.075);
  ctx.restore();
}
function drawBars(ctx, o, s) { const x = o.x * s, y = o.y * s; ctx.save(); ctx.strokeStyle = "#8a8172"; ctx.lineWidth = Math.max(2, s * .08); ctx.beginPath(); for (const q of [.28, .5, .72]) { ctx.moveTo(x + s * q, y + s * .08); ctx.lineTo(x + s * q, y + s * .95); } ctx.moveTo(x + s * .16, y + s * .5); ctx.lineTo(x + s * .84, y + s * .5); ctx.stroke(); ctx.restore(); }
function drawPentShortcut(ctx, o, s, now) {
  const x = o.x * s, y = o.y * s, open = o.state === "open", deep = o.end === "deep", pulse = .5 + .5 * Math.sin(now / 420), k = o.linkKind; ctx.save();
  ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(x + s * .5, y + s * .9, s * .42, s * .11, 0, 0, 7); ctx.fill();
  if (k === "lift") { ctx.fillStyle = "#2a2620"; ctx.fillRect(x + s * .1, y + s * .2, s * .8, s * .72); ctx.strokeStyle = "#9a8458"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.strokeRect(x + s * .1, y + s * .2, s * .8, s * .72);
    ctx.beginPath(); ctx.moveTo(x + s * .3, y + s * .2); ctx.lineTo(x + s * .3, y - s * .4); ctx.moveTo(x + s * .7, y + s * .2); ctx.lineTo(x + s * .7, y - s * .4); ctx.stroke(); } // a cage on its chains
  else if (k === "ladder") { ctx.strokeStyle = "#8a6a3e"; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath(); const top = open ? .1 : -.5, bot = open ? .92 : .3; ctx.moveTo(x + s * .3, y + s * top); ctx.lineTo(x + s * .3, y + s * bot); ctx.moveTo(x + s * .7, y + s * top); ctx.lineTo(x + s * .7, y + s * bot); for (let q = top + .12; q < bot; q += .2) { ctx.moveTo(x + s * .3, y + s * q); ctx.lineTo(x + s * .7, y + s * q); } ctx.stroke(); } // hooked up out of reach until kicked down
  else { ctx.fillStyle = "#3a2f24"; ctx.fillRect(x + s * .08, y + s * .06, s * .84, s * .9); ctx.fillStyle = open ? "#0b0b0d" : "#4a3d2e"; ctx.fillRect(x + s * .2, y + s * .2, s * .6, s * .76); } // a door, or a portcullis's arch
  if (!open && !deep) drawBars(ctx, o, s);
  if (!open && deep) { ctx.fillStyle = `rgba(232,196,90,${.55 + .4 * pulse})`; ctx.beginPath(); ctx.arc(x + s * .5, y + s * .52, s * .11, 0, 7); ctx.fill(); } // the winch, the bolt, the hook or the lever: use it
  if (open) { ctx.strokeStyle = `rgba(242,230,168,${.35 + .35 * pulse})`; ctx.lineWidth = 2; ctx.strokeRect(x + s * .06, y + s * .04, s * .88, s * .92); }
  ctx.restore();
}
// The Pentagon's finale: the vault's opened wall (stars beyond it), and from the walkway the doorway back (lamplight beyond);
// the dais's pedestal, its five-sided inlay lit, and the word cut in it. No gradients: arcs and fills only.
function drawPentFinaleWall(ctx, o, s, now) {
  const x = o.x * s, y = o.y * s, pulse = .5 + .5 * Math.sin(now / 520); ctx.save();
  ctx.fillStyle = o.back ? "#6c6457" : "#3a2f24"; ctx.fillRect(x + s * .02, y - s * .1, s * .96, s * 1.08); // the frame
  ctx.fillStyle = o.back ? "#2a1e12" : CHASM_STARS.sky; ctx.beginPath(); ctx.moveTo(x + s * .16, y + s * .98); ctx.lineTo(x + s * .16, y + s * .36); ctx.arc(x + s * .5, y + s * .36, s * .34, Math.PI, 0); ctx.lineTo(x + s * .84, y + s * .98); ctx.closePath(); ctx.fill();
  if (o.back) { ctx.fillStyle = `rgba(232,180,96,${.35 + .25 * pulse})`; ctx.fillRect(x + s * .3, y + s * .5, s * .4, s * .48); } // the vault's lamps beyond
  else { ctx.fillStyle = "#fff6dc"; for (const [u, v, r] of [[.32, .3, 1.2], [.6, .5, 1], [.45, .72, 1.4], [.7, .26, 1], [.28, .84, 1]]) ctx.fillRect(x + s * u, y + s * v, r, r);
    ctx.fillStyle = `rgba(150,180,255,${.12 + .12 * pulse})`; ctx.beginPath(); ctx.arc(x + s * .5, y + s * .6, s * .3, 0, 7); ctx.fill(); } // stars beyond, and their light
  ctx.strokeStyle = `rgba(200,220,255,${.35 + .35 * pulse})`; ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); ctx.moveTo(x + s * .16, y + s * .98); ctx.lineTo(x + s * .16, y + s * .36); ctx.arc(x + s * .5, y + s * .36, s * .34, Math.PI, 0); ctx.lineTo(x + s * .84, y + s * .98); ctx.stroke();
  ctx.restore();
}
function drawPentDais(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .5) * s, pulse = .5 + .5 * Math.sin(now / 640), a0 = -Math.PI / 2 + now / 9000; ctx.save();
  ctx.fillStyle = "#00000033"; ctx.beginPath(); ctx.ellipse(cx, cy + s * .14, s * .82, s * .32, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#b9ab86"; ctx.beginPath(); ctx.arc(cx, cy, s * .78, 0, 7); ctx.fill(); ctx.fillStyle = "#efe3c2"; ctx.beginPath(); ctx.arc(cx, cy - s * .05, s * .62, 0, 7); ctx.fill(); // two steps up
  ctx.fillStyle = `rgba(176,196,255,${.22 + .2 * pulse})`; ctx.beginPath(); ctx.arc(cx, cy - s * .05, s * (.54 + .06 * pulse), 0, 7); ctx.fill();
  ctx.fillStyle = "#3d3560"; pentPath(ctx, cx, cy - s * .05, s * .34, a0); ctx.fill(); ctx.strokeStyle = `rgba(236,226,255,${.55 + .4 * pulse})`; ctx.lineWidth = Math.max(1.5, s * .045); ctx.stroke(); // the five-sided inlay, lit
  ctx.fillStyle = `rgba(250,244,220,${.7 + .3 * pulse})`; ctx.beginPath(); ctx.arc(cx, cy - s * .05, s * .07, 0, 7); ctx.fill();
  for (let i = 0; i < 3; i++) { const k = ((now / 2600 + i / 3) % 1), mx = cx + Math.sin(i * 2.1 + now / 1300) * s * .25; ctx.fillStyle = `rgba(236,230,255,${.6 * (1 - k)})`; ctx.fillRect(mx, cy - s * (.1 + k * .9), 2, 2); } // motes rising
  ctx.fillStyle = "#5b4f3a"; ctx.font = `bold ${Math.max(7, Math.round(s * .2))}px serif`; ctx.textAlign = "center"; ctx.fillText("TRANSIT", cx, cy + s * .58); // the word cut in its face
  ctx.restore();
}
function drawShortcutBurst(ctx, g, s, now) {
  const b = g.shortcutBurst; if (b.t0 == null) b.t0 = now; const k = (now - b.t0) / (1000 * (b.life || 1.2)); if (k >= 1 || k < 0) { g.shortcutBurst = null; return; }
  ctx.save(); ctx.strokeStyle = `rgba(232,214,170,${.7 * (1 - k)})`; ctx.lineWidth = Math.max(2, s * .12 * (1 - k)); ctx.beginPath(); ctx.arc((b.x + .5) * s, (b.y + .5) * s, s * (.4 + 1.6 * k), 0, 7); ctx.stroke(); ctx.restore();
}
function drawPentSeal(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .4) * s + Math.sin(now / 420) * s * .04, a0 = now / 1800, glow = .5 + .5 * Math.sin(now / 300); ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * .6); g.addColorStop(0, `rgba(176,140,255,${.35 + .25 * glow})`); g.addColorStop(1, "rgba(176,140,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, s * .6, 0, 7); ctx.fill();
  ctx.fillStyle = "#cfc6e8"; pentPath(ctx, cx, cy, s * .24, a0); ctx.fill(); ctx.strokeStyle = "#5b4a8a"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#5b4a8a"; for (let i = 0; i < 5; i++) { const a = a0 + i * Math.PI * 2 / 5 - Math.PI / 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * s * .15, cy + Math.sin(a) * s * .15, s * .03, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.arc(cx, cy, s * .06, 0, 7); ctx.fill(); ctx.restore();
}
// The dread (a cached screen image like the vignette): the dark closes in from the edges, leaving `share` of the view lit.
function drawDread(ctx, w, h, share) {
  if (!(share > 0)) return; let o = render.dread; const key = `${w}x${h}:${share.toFixed(2)}`;
  if (!o || o.key !== key) { const c = makeGroundCanvas(); const x = c?.getContext?.("2d"); if (!x) { ctx.fillStyle = `rgba(0,0,0,${share * .5})`; ctx.fillRect(0, 0, w, h); return; } c.width = w; c.height = h;
    const R = Math.max(w, h) * .75, v = x.createRadialGradient(w / 2, h / 2, R * (1 - share) * .45, w / 2, h / 2, R * (1.05 - share * .5)); v.addColorStop(0, "rgba(2,2,6,0)"); v.addColorStop(.6, `rgba(2,2,6,${.5 + share * .35})`); v.addColorStop(1, `rgba(2,2,6,${.8 + share * .18})`); x.fillStyle = v; x.fillRect(0, 0, w, h); o = render.dread = { key, canvas: c }; }
  ctx.drawImage(o.canvas, 0, 0, w, h);
}
// Release 593: the Starfield penumbra, clear to `inner` tiles round the screen's centre and `dark` by `outer`: the same
// drawing as render()'s own line (kept there as it was), for the Lantern to draw through its layer.
function drawChasmPenumbra(ctx, w, h, s) { const P = CHASM_STARS.penumbra, cx = w / 2, cy = h / 2, gr = ctx.createRadialGradient(cx, cy, s * P.inner, cx, cy, s * P.outer); gr.addColorStop(0, "rgba(4,3,14,0)"); gr.addColorStop(1, `rgba(4,3,14,${P.dark})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); }
// LANTERN (spell-slots.ts): one cached mask (warm light whose alpha is lanternLift, sampled in LANTERN_STOPS) and one reused
// screen-sized layer. Nothing is made per frame: the mask once, the layer once and again only when the screen resizes.
const lanternRender = { mask: null, layer: null, lx: null };
function lanternMask() {
  if (lanternRender.mask) return lanternRender.mask;
  const c = makeGroundCanvas(), x = c?.getContext?.("2d"); if (!x) return null; const D = LANTERN.maskPx, r = D / 2; c.width = c.height = D;
  const gr = x.createRadialGradient(r, r, 0, r, r, r); for (const [o, a] of LANTERN_STOPS) gr.addColorStop(o, `rgba(${LANTERN.glowRGB},${a.toFixed(3)})`);
  x.fillStyle = gr; x.fillRect(0, 0, D, D); return (lanternRender.mask = c);
}
// Its warm light on the floor round the Wayfarer at (x, y) (world or screen pixels), added over what is drawn.
function drawLanternGlow(ctx, x, y, s) {
  const m = lanternMask(); if (!m) return; const R = LANTERN.radius * s;
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = LANTERN.glow; ctx.drawImage(m, x - R, y - R, 2 * R, 2 * R); ctx.restore();
}
// A screen darkness overlay (`draw(ctx, w, h, arg)`): unlit, drawn as it always was; lit, drawn into the layer, the lantern's
// light taken out of it round (x, y) in screen pixels (destination-out: lanternLift of the darkness, none beyond the radius),
// and the layer laid over the screen. The overlay itself is unchanged.
export function drawLanternDark(ctx, w, h, s, lit, x, y, draw, arg) {
  const cw = ctx.canvas?.width, ch = ctx.canvas?.height, m = lit && cw > 0 && ch > 0 && typeof ctx.drawImage === "function" ? lanternMask() : null;
  if (!m) { draw(ctx, w, h, arg); return; }
  if (!lanternRender.layer) { const c = makeGroundCanvas(), lx = c?.getContext?.("2d"); if (!lx) { draw(ctx, w, h, arg); return; } lanternRender.layer = c; lanternRender.lx = lx; }
  const c = lanternRender.layer, lx = lanternRender.lx; if (c.width !== cw) c.width = cw; if (c.height !== ch) c.height = ch;
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = "source-over"; lx.globalAlpha = 1; lx.clearRect(0, 0, cw, ch); lx.setTransform(cw / w, 0, 0, ch / h, 0, 0);
  draw(lx, w, h, arg);
  const R = LANTERN.radius * s; lx.globalCompositeOperation = "destination-out"; lx.globalAlpha = LANTERN.strength; lx.drawImage(m, x - R, y - R, 2 * R, 2 * R); lx.globalCompositeOperation = "source-over"; lx.globalAlpha = 1;
  ctx.drawImage(c, 0, 0, w, h);
}
// A great building's ladder (Tim: "a ladder to the next floor and you just climb the ladder"): up, a ladder standing against
// the dark of the hatch above it; down, a hatch in the floor with the ladder's top showing. Its edge is lit.
function drawBuildingStair(ctx, o, s, now) {
  const x = o.x * s, y = o.y * s, up = o.dir !== "down", pulse = .5 + .5 * Math.sin(now / 420);
  ctx.save();
  if (o.dir === "door") { // a labyrinth's door: an arch in the wall, dark beyond, its frame lit
    ctx.fillStyle = "#3a2f24"; ctx.fillRect(x + s * .06, y + s * .04, s * .88, s * .96); ctx.fillStyle = "#070708"; ctx.beginPath(); ctx.moveTo(x + s * .2, y + s); ctx.lineTo(x + s * .2, y + s * .42); ctx.arc(x + s * .5, y + s * .42, s * .3, Math.PI, 0); ctx.lineTo(x + s * .8, y + s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(242,230,168,${.4 + .4 * pulse})`; ctx.lineWidth = 2; ctx.stroke();
    if (o.lock && !o.unlocked) { ctx.fillStyle = "#c9a24a"; ctx.fillRect(x + s * .38, y + s * .5, s * .24, s * .2); ctx.strokeStyle = "#c9a24a"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); ctx.arc(x + s * .5, y + s * .5, s * .09, Math.PI, 0); ctx.stroke(); } // sealed: a padlock
    if (o.barred && !o.opened) { ctx.strokeStyle = "#6a6458"; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath(); for (const q of [.3, .5, .7]) { ctx.moveTo(x + s * q, y + s * .2); ctx.lineTo(x + s * q, y + s); } ctx.moveTo(x + s * .2, y + s * .55); ctx.lineTo(x + s * .8, y + s * .55); ctx.stroke(); } // barred from the other side
    ctx.restore(); return; }
  ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(x + s * .5, y + s * .9, s * .4, s * .1, 0, 0, 7); ctx.fill();
  if (up) { ctx.fillStyle = "#070708"; ctx.fillRect(x + s * .14, y - s * .55, s * .72, s * .32); ctx.strokeStyle = `rgba(242,230,168,${.4 + .4 * pulse})`; ctx.lineWidth = 2; ctx.strokeRect(x + s * .14, y - s * .55, s * .72, s * .32); // the hatch above
    ctx.strokeStyle = "#8a6a3e"; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath(); ctx.moveTo(x + s * .3, y + s * .9); ctx.lineTo(x + s * .34, y - s * .45); ctx.moveTo(x + s * .7, y + s * .9); ctx.lineTo(x + s * .66, y - s * .45); ctx.stroke();
    ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); for (let q = -.3; q < .85; q += .22) { ctx.moveTo(x + s * .32, y + s * q); ctx.lineTo(x + s * .68, y + s * q); } ctx.stroke(); }
  else { ctx.fillStyle = "#050506"; ctx.fillRect(x + s * .12, y + s * .12, s * .76, s * .76); ctx.strokeStyle = `rgba(242,230,168,${.4 + .4 * pulse})`; ctx.lineWidth = 2; ctx.strokeRect(x + s * .12, y + s * .12, s * .76, s * .76);
    ctx.strokeStyle = "#8a6a3e"; ctx.lineWidth = Math.max(2, s * .06); ctx.beginPath(); ctx.moveTo(x + s * .34, y + s * .16); ctx.lineTo(x + s * .34, y + s * .7); ctx.moveTo(x + s * .66, y + s * .16); ctx.lineTo(x + s * .66, y + s * .7); ctx.moveTo(x + s * .34, y + s * .3); ctx.lineTo(x + s * .66, y + s * .3); ctx.moveTo(x + s * .34, y + s * .5); ctx.lineTo(x + s * .66, y + s * .5); ctx.stroke(); }
  if (o.dir === "roof" || (o.dir === "roofExit" && o.roofExit?.roof)) { ctx.fillStyle = `rgba(160,200,255,${.25 + .25 * pulse})`; ctx.fillRect(x + s * .18, y - s * .51, s * .64, s * .24); } // daylight through the roof hatch (release 746: and the vault's roof exit)
  if ((o.lock && !o.unlocked) || o.sealed) { ctx.fillStyle = "#c9a24a"; ctx.fillRect(x + s * .38, y + s * .4, s * .24, s * .2); ctx.strokeStyle = "#c9a24a"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); ctx.arc(x + s * .5, y + s * .4, s * .09, Math.PI, 0); ctx.stroke(); } // a sealed ladder
  ctx.restore();
}
// Inside a great building: dressed or concrete walls with a face where they stand over open floor, and each room's floor.
const BUILDING_TILES = new Set(["hallVoid", "hedgeWall", "yardGrass", "cellarWall", "cellarFloor", "keepWall", "aptWall", "hiveWall", "mosaicFloor", "carpetFloor", "plankFloor", "flagFloor", "tileFloor", "concreteFloor", "rubbleFloor", "floorHole", "chitinFloor", "fleshFloor", "crystalFloor"]);
function paintBuildingTile(ctx, t, x, y, s, d, map, w) {
  const px = x * s, py = y * s, k = t.kind, at = (dx, dy) => map[(y + dy) * w + x + dx], same = (dx, dy) => at(dx, dy)?.kind === k;
  if (k === "hedgeWall") { const below = at(0, 1), face = below && !below.blocked; // a labyrinth court's hedge: clipped leaves, darker where it meets the path
    ctx.fillStyle = "#243f22"; ctx.fillRect(px, py, s + 1, s + 1); for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? "#3a6334" : "#2f552b"; ctx.beginPath(); ctx.arc(px + s * (.2 + ((d + i * 3) % 5) * .15), py + s * (.18 + ((d * 2 + i) % 4) * .14), s * .17, 0, 7); ctx.fill(); }
    if (face) { ctx.fillStyle = "#1d331b"; ctx.fillRect(px, py + s * .62, s + 1, s * .38 + 1); ctx.fillStyle = "#2a4826"; for (let i = 0; i < 3; i++) ctx.fillRect(px + s * (.1 + i * .3), py + s * .66, s * .18, s * .1); ctx.fillStyle = "#00000044"; ctx.fillRect(px, py + s - 3, s + 1, 3); }
    return; }
  if (k === "cellarWall") { const below = at(0, 1), face = below && !below.blocked; ctx.fillStyle = "#151311"; ctx.fillRect(px, py, s + 1, s + 1); ctx.fillStyle = "#24211d"; ctx.fillRect(px + 1, py + 1, s - 2, (face ? s * .45 : s) - 2);
    if (face) { ctx.fillStyle = "#3a352e"; ctx.fillRect(px, py + s * .45, s + 1, s * .55 + 1); ctx.strokeStyle = "#1e1b17"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py + s * .7); ctx.lineTo(px + s, py + s * .7); ctx.moveTo(px + s * ((y & 1) ? .3 : .65), py + s * .45); ctx.lineTo(px + s * ((y & 1) ? .3 : .65), py + s * .7); ctx.stroke(); if ((d & 3) === 0) { ctx.fillStyle = "#3e5a3a55"; ctx.fillRect(px + s * .5, py + s * .78, s * .2, s * .14); } ctx.fillStyle = "#00000055"; ctx.fillRect(px, py + s - 3, s + 1, 3); }
    return; }
  if (k === "hiveWall") { const below = at(0, 1), face = below && !below.blocked; // a hive's wall: ridged chitin, its face veined
    ctx.fillStyle = "#24182c"; ctx.fillRect(px, py, s + 1, s + 1); ctx.fillStyle = "#33243d"; ctx.beginPath(); ctx.ellipse(px + s * .5, py + s * .3, s * .48, s * .26, 0, 0, 7); ctx.fill();
    if (face) { ctx.fillStyle = "#5a3f66"; ctx.fillRect(px, py + s * .45, s + 1, s * .55 + 1); ctx.strokeStyle = "#b07ad055"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + s * .2, py + s * .5); ctx.quadraticCurveTo(px + s * .5, py + s * .75, px + s * .3, py + s); ctx.moveTo(px + s * .75, py + s * .5); ctx.quadraticCurveTo(px + s * .55, py + s * .7, px + s * .8, py + s); ctx.stroke(); ctx.fillStyle = "#00000044"; ctx.fillRect(px, py + s - 3, s + 1, 3); }
    return; }
  if (k === "keepWall" || k === "aptWall") {
    const keep = k === "keepWall", below = at(0, 1), face = below && !below.blocked;
    ctx.fillStyle = keep ? "#2d2925" : "#2b2e31"; ctx.fillRect(px, py, s + 1, s + 1); // the wall's top
    ctx.fillStyle = keep ? "#3a352f" : "#3a3e42"; ctx.fillRect(px + 1, py + 1, s - 2, (face ? s * .45 : s) - 2);
    if (face) { ctx.fillStyle = keep ? "#6b6255" : "#74787b"; ctx.fillRect(px, py + s * .45, s + 1, s * .55 + 1); // the face, over open floor
      ctx.strokeStyle = keep ? "#3a342c" : "#4a4e52"; ctx.lineWidth = 1;
      if (keep) { for (const q of [.62, .8]) { ctx.beginPath(); ctx.moveTo(px, py + s * q); ctx.lineTo(px + s, py + s * q); ctx.stroke(); } const o = (y & 1) * s * .5; ctx.beginPath(); ctx.moveTo(px + s * .25 + o * .5, py + s * .45); ctx.lineTo(px + s * .25 + o * .5, py + s * .62); ctx.moveTo(px + s * .7 - o * .3, py + s * .62); ctx.lineTo(px + s * .7 - o * .3, py + s * .8); ctx.stroke(); }
      else { ctx.strokeRect(px + .5, py + s * .45 + .5, s - 1, s * .55 - 1); if ((d & 3) === 1) { ctx.fillStyle = "#58c7c233"; ctx.fillRect(px + s * .2, py + s * .6, s * .6, s * .06); } }
      ctx.fillStyle = "#00000044"; ctx.fillRect(px, py + s - 3, s + 1, 3); }
    return;
  }
  if (k === "hallVoid") { // release 795: a grand hall's open shaft (pentagon-halls.ts): no floor, a few far lights below, the lip lit where floor meets it
    ctx.fillStyle = "#030308"; ctx.fillRect(px, py, s + 1, s + 1); if ((d & 3) === 1) { ctx.fillStyle = "#6e5aa855"; ctx.fillRect(px + s * (.2 + (x % 3) * .2), py + s * (.3 + (y % 2) * .3), Math.max(1, s * .06), Math.max(1, s * .06)); }
    ctx.fillStyle = "#3a345055"; for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const n = at(dx, dy); if (n && !n.blocked) { if (dy) ctx.fillRect(px, py + (dy < 0 ? 0 : s * .86), s + 1, s * .14); else ctx.fillRect(px + (dx < 0 ? 0 : s * .86), py, s * .14, s + 1); } }
    return; }
  if (k === "floorHole") { // a hole through to the floor below: dark, its broken edge, a glint of the floor beneath
    ctx.fillStyle = "#020203"; ctx.fillRect(px, py, s + 1, s + 1); ctx.fillStyle = "#16130f"; ctx.fillRect(px + s * .3, py + s * .55, s * .4, s * .3);
    ctx.fillStyle = "#3d342a"; for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const n = at(dx, dy); if (n && n.kind !== "floorHole" && !n.blocked) { for (let i = 0; i < 3; i++) { const q = (d + i * 5) % 7 / 7; if (dy) ctx.fillRect(px + q * s * .8, dy < 0 ? py : py + s - s * .12, s * .2, s * .12); else ctx.fillRect(dx < 0 ? px : px + s - s * .12, py + q * s * .8, s * .12, s * .2); } } }
    return;
  }
  ctx.lineWidth = 1;
  if (k === "mosaicFloor") { const cols = ["#8a6a3e", "#6e3a2e", "#3e5a5a", "#9a8a62"], n = 4, q = s / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = ((x * n + i) * 7 + (y * n + j) * 3 + ((x * n + i) ^ (y * n + j))) % 9; ctx.fillStyle = v < 4 ? cols[v] : (i + j + x + y) % 2 ? "#5a4a3a" : "#64523f"; ctx.fillRect(px + i * q + .5, py + j * q + .5, q - 1, q - 1); } }
  else if (k === "carpetFloor") { const border = !same(-1, 0) || !same(1, 0) || !same(0, -1) || !same(0, 1); ctx.fillStyle = "#7a3236"; ctx.fillRect(px, py, s + 1, s + 1); ctx.strokeStyle = "#c19a5a66"; ctx.beginPath(); ctx.moveTo(px + s * .5, py + s * .2); ctx.lineTo(px + s * .8, py + s * .5); ctx.lineTo(px + s * .5, py + s * .8); ctx.lineTo(px + s * .2, py + s * .5); ctx.closePath(); ctx.stroke();
    if (border) { ctx.fillStyle = "#3e1d22"; if (!same(-1, 0)) ctx.fillRect(px, py, s * .14, s + 1); if (!same(1, 0)) ctx.fillRect(px + s * .86, py, s * .14 + 1, s + 1); if (!same(0, -1)) ctx.fillRect(px, py, s + 1, s * .14); if (!same(0, 1)) ctx.fillRect(px, py + s * .86, s + 1, s * .14 + 1); }
    if ((d & 3) === 3) { ctx.fillStyle = "#2a141633"; ctx.fillRect(px + s * .55, py + s * .1, s * .3, s * .35); } }
  else if (k === "plankFloor") { for (let i = 0; i < 4; i++) { const yy = py + i * s / 4; ctx.fillStyle = (i + y + d) % 3 === 0 ? "#5e4128" : (i + y) % 2 ? "#6f4d2f" : "#76533a"; ctx.fillRect(px, yy, s + 1, s / 4); ctx.strokeStyle = "#3a2716"; ctx.beginPath(); ctx.moveTo(px, yy + .5); ctx.lineTo(px + s, yy + .5); const seam = px + ((x * 5 + i * 3 + y) % 4) * s / 4; ctx.moveTo(seam, yy); ctx.lineTo(seam, yy + s / 4); ctx.stroke(); }
    if ((d & 3) === 2) { ctx.fillStyle = "#1d140c"; ctx.fillRect(px + s * .6, py + s * .26, s * .22, s * .2); } }
  else if (k === "flagFloor") { ctx.strokeStyle = "#35322c"; ctx.lineWidth = 1.5; const o = (y & 1) * s * .5; ctx.beginPath(); ctx.moveTo(px, py + s * .5); ctx.lineTo(px + s, py + s * .5); ctx.moveTo(px + (o + s * .25) % s, py); ctx.lineTo(px + (o + s * .25) % s, py + s * .5); ctx.moveTo(px + (o + s * .75) % s, py + s * .5); ctx.lineTo(px + (o + s * .75) % s, py + s); ctx.stroke(); ctx.fillStyle = "#6a655c33"; ctx.fillRect(px + s * .08, py + s * .08, s * .3, s * .3); }
  else if (k === "tileFloor") { const q = s / 2; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j + x + y) % 2 ? "#9c9c95" : "#6a6d6c"; ctx.fillRect(px + i * q, py + j * q, q, q); } ctx.strokeStyle = "#3f413f88"; ctx.strokeRect(px + .5, py + .5, s - 1, s - 1); if ((d & 3) === 1) { ctx.strokeStyle = "#2a2c2b"; ctx.beginPath(); ctx.moveTo(px + s * .1, py + s * .3); ctx.lineTo(px + s * .45, py + s * .55); ctx.lineTo(px + s * .7, py + s * .45); ctx.stroke(); } }
  else if (k === "concreteFloor") { ctx.fillStyle = "#4a4c4d"; for (let i = 0; i < 5; i++) ctx.fillRect(px + ((d * 7 + i * 11 + x * 3) % 10) / 10 * s, py + ((d * 3 + i * 7 + y * 5) % 10) / 10 * s, 2, 2); ctx.strokeStyle = "#47494a"; ctx.strokeRect(px + .5, py + .5, s - 1, s - 1); if ((d & 3) === 0 && (x + y) % 3 === 0) { ctx.fillStyle = "#58c7c222"; ctx.fillRect(px + s * .15, py + s * .7, s * .7, s * .05); } }
  else if (k === "rubbleFloor") { for (let i = 0; i < (t.blocked ? 7 : 4); i++) { const rx = px + ((d * 5 + i * 7) % 9) / 9 * s * .8, ry = py + ((d * 3 + i * 5) % 9) / 9 * s * .8, r = s * (t.blocked ? .22 : .13); ctx.fillStyle = i % 2 ? "#6a6359" : "#57514a"; ctx.beginPath(); ctx.moveTo(rx, ry + r); ctx.lineTo(rx + r * .8, ry); ctx.lineTo(rx + r * 1.7, ry + r * .6); ctx.lineTo(rx + r, ry + r * 1.4); ctx.closePath(); ctx.fill(); } if (t.blocked) { ctx.fillStyle = "#00000055"; ctx.fillRect(px + 2, py + s - 5, s - 4, 4); } }
  else if (k === "yardGrass") { ctx.strokeStyle = "#6b8a4a"; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { const gx = px + s * (.15 + ((d + i * 7) % 7) * .11), gy = py + s * (.3 + ((d * 3 + i * 5) % 6) * .1); ctx.beginPath(); ctx.moveTo(gx, gy + s * .12); ctx.lineTo(gx + s * .03, gy); ctx.stroke(); } if ((x * 3 + y) % 7 === 0) { ctx.fillStyle = "#9a8f6a55"; ctx.fillRect(px + s * .3, py + s * .4, s * .4, s * .25); } }
  else if (k === "cellarFloor") { ctx.strokeStyle = "#24211d"; ctx.lineWidth = 1; ctx.strokeRect(px + .5, py + .5, s - 1, s - 1); if ((d & 3) === 1) { ctx.fillStyle = "#1a2a2a55"; ctx.beginPath(); ctx.ellipse(px + s * .5, py + s * .6, s * .25, s * .1, 0, 0, 7); ctx.fill(); } if ((d & 3) === 2) { ctx.fillStyle = "#4a443b"; ctx.fillRect(px + s * .2, py + s * .3, s * .12, s * .08); } }
  else if (k === "chitinFloor") { ctx.strokeStyle = "#5a4868"; ctx.lineWidth = 1; for (const [cx, cy] of [[.25, .25], [.75, .25], [.5, .7]]) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, qx = px + s * cx + Math.cos(a) * s * .2, qy = py + s * cy + Math.sin(a) * s * .2; i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); } ctx.closePath(); ctx.stroke(); } }
  else if (k === "fleshFloor") { ctx.fillStyle = "#7a3a4e"; ctx.beginPath(); ctx.ellipse(px + s * (.3 + (d & 1) * .3), py + s * .5, s * .26, s * .16, (d % 3) * .5, 0, 7); ctx.fill(); ctx.strokeStyle = "#9a5468aa"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py + s * .3); ctx.quadraticCurveTo(px + s * .5, py + s * .1, px + s, py + s * .4); ctx.stroke(); }
  else if (k === "crystalFloor") { ctx.fillStyle = "#6a86b8"; ctx.beginPath(); ctx.moveTo(px + s * .2, py + s * .8); ctx.lineTo(px + s * .35, py + s * .3); ctx.lineTo(px + s * .5, py + s * .8); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#a8c0e8aa"; ctx.beginPath(); ctx.moveTo(px + s * .55, py + s * .7); ctx.lineTo(px + s * .7, py + s * .2); ctx.lineTo(px + s * .82, py + s * .7); ctx.closePath(); ctx.fill(); }
  if (t.doorway) { ctx.fillStyle = "#00000022"; ctx.fillRect(px, py, s + 1, s + 1); }
  // shadow cast by a wall standing to the north
  const n = at(0, -1); if (n?.blocked && n.kind !== "rubbleFloor") { ctx.fillStyle = "#00000040"; ctx.fillRect(px, py, s + 1, s * .22); }
}
function architecturalBuilding(ctx,o,s,p,map){
  const meta=structureRenderMeta(o),b=o.bounds,inside=structureOccupancy(map,32,p.x,p.y,o.id)===o.id,colors={city:["#393a3f","#858188"],arcology:["#18333b","#58a0a6"],cloister:["#3b2d35","#9a737f"],fortress:["#302b27","#9b8268"]}[o.districtStyle]||["#333","#888"],accent={copper:"#b37954",ivory:"#d5c8a7",oxide:"#9a6457",violet:"#9278a8"}[o.accent]||colors[1],cells=meta.cells,set=meta.set;
  ctx.save();if(inside){ctx.strokeStyle=accent+"77";ctx.lineWidth=2;for(const c of cells){if(!set.has(`${c.x-1},${c.y}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo(c.x*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x+1},${c.y}`)){ctx.beginPath();ctx.moveTo((c.x+1)*s,c.y*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x},${c.y-1}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo((c.x+1)*s,c.y*s);ctx.stroke()}if(!set.has(`${c.x},${c.y+1}`)){ctx.beginPath();ctx.moveTo(c.x*s,(c.y+1)*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}}ctx.restore();return}
  ctx.fillStyle=colors[0];ctx.beginPath();for(const c of cells)ctx.rect(c.x*s,c.y*s,s+1,s+1);ctx.fill();ctx.globalAlpha=.28;ctx.fillStyle=colors[1];for(const c of cells)if(((c.x+c.y+o.signGlyph)&3)===0)ctx.fillRect(c.x*s+s*.12,c.y*s+s*.12,s*.76,s*.12);ctx.globalAlpha=1;
  const x=b.x*s,y=b.y*s,w=b.w*s,h=b.h*s;ctx.strokeStyle=accent;ctx.lineWidth=3;for(const c of cells){if(!set.has(`${c.x-1},${c.y}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo(c.x*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x+1},${c.y}`)){ctx.beginPath();ctx.moveTo((c.x+1)*s,c.y*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x},${c.y-1}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo((c.x+1)*s,c.y*s);ctx.stroke()}if(!set.has(`${c.x},${c.y+1}`)){ctx.beginPath();ctx.moveTo(c.x*s,(c.y+1)*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}}if((o.shape==='rect'||o.shape==='keep')&&(o.roofProfile==='gable'||o.roofProfile==='spire')){ctx.beginPath();ctx.moveTo(x+s*.18,y+h*.48);ctx.lineTo(x+w*.5,y+(o.roofProfile==='spire'?s*.12:h*.2));ctx.lineTo(x+w-s*.18,y+h*.48);ctx.stroke()}else if(o.districtStyle==='fortress'){ctx.fillStyle=accent+"bb";for(const c of cells)if(!set.has(`${c.x},${c.y-1}`)&&(c.x+c.y)%2===0)ctx.fillRect(c.x*s+s*.12,c.y*s-s*.12,s*.42,s*.3)}else{ctx.strokeStyle=accent+"66";ctx.lineWidth=1;for(const c of cells)if(!set.has(`${c.x},${c.y-1}`)){ctx.beginPath();ctx.moveTo(c.x*s+s*.12,c.y*s+s*.25);ctx.lineTo((c.x+1)*s-s*.12,c.y*s+s*.25);ctx.stroke()}}
  const doorX=(o.door.x+.12)*s,doorY=(o.door.y+.05)*s;ctx.fillStyle="#090b0b";ctx.fillRect(doorX,doorY,s*.76,s*.9);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.strokeRect(doorX,doorY,s*.76,s*.9);const frontTileY=o.door.side==='north'?b.y:b.y+b.h-1,frontY=o.door.side==='north'?y+s*.32:y+h-s*.58,step=o.facadeRhythm==='narrow'?1:o.facadeRhythm==='broad'?3:2;ctx.fillStyle=accent+"bb";for(let q=1;q<b.w-1;q+=step)if(set.has(`${b.x+q},${frontTileY}`)&&Math.abs(b.x+q-o.door.x)>1)ctx.fillRect(x+q*s+s*.18,frontY,s*.5,s*.2);
  ctx.fillStyle=accent;ctx.beginPath();const gx=(o.door.x+.5)*s,gy=o.door.side==='north'?doorY+s*1.18:doorY-s*.28,r=s*.18;for(let q=0;q<4;q++){const a=(o.signGlyph+q)*Math.PI/2,px=gx+Math.cos(a)*r,py=gy+Math.sin(a)*r;q?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.stroke();ctx.fillStyle="#dfd4b2";ctx.font=`${Math.max(8,s*.2)}px monospace`;ctx.textAlign="center";ctx.fillText(o.name.toUpperCase(),x+w/2,y-s*.2);ctx.textAlign="start";ctx.restore();
}
// Release 159: the overworld's ground (tiles, trails and cliffs) was repainted tile by tile every frame,
// about ten times the dungeon's paint cost. It is now drawn once per section into an offscreen image at the screen's
// pixel scale and blitted each frame; only animated landscape overlays (water, lava, glow) are redrawn per frame.
// The image is rebuilt when the map, tile size, scale or occupied building changes, or when any tile is replaced or
// changes kind, blocking or elevation. Without an offscreen canvas (tests, old browsers) the per-tile path is used.
const GROUND_MAX_PIXELS = 8.4e6; // ~32 MB; larger sections are cached at a reduced scale
const ground = { canvas: null, map: null, s: 0, scale: 0, building: null, top: 0, reveal: null, revealSize: 0, revealIds: null, refs: [], kinds: [], blocked: [], elev: [], scarSurface: null };
function makeGroundCanvas() { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(1, 1); if (typeof document !== "undefined") return document.createElement("canvas"); return null; }
// Release 719: the Ink Wastes' ground: everything drawn washed nearly black, with soft glossy runs of ink and drips, painted into the
// cached ground image once (never per frame). Deterministic per section size, so a revisit looks the same.
export const INK_WASH = { wash: "rgba(6,5,12,.8)", blobs: 46, blob: "rgba(12,11,22,.92)", gloss: "rgba(150,170,220,.16)", drip: .45 };
export function inkWash(gc, mw, mh, s, top) {
  const W = INK_WASH, rnd = (i) => { const v = Math.sin(i * 12.9898 + mw * 78.233) * 43758.5453; return v - Math.floor(v); };
  gc.save(); gc.globalCompositeOperation = "source-atop"; gc.fillStyle = W.wash; gc.fillRect(0, -top, mw * s, mh * s + top);
  for (let i = 0; i < W.blobs; i++) { const x = rnd(i) * mw * s, y = rnd(i + 97) * mh * s, r = (.8 + rnd(i + 191) * 2.2) * s;
    gc.fillStyle = W.blob; gc.beginPath(); gc.ellipse(x, y, r, r * .55, 0, 0, Math.PI * 2); gc.fill();
    if (rnd(i + 313) < W.drip) { gc.beginPath(); gc.ellipse(x + r * .3, y + r * .5, r * .12, r * .35, 0, 0, Math.PI * 2); gc.fill(); }
    gc.strokeStyle = W.gloss; gc.lineWidth = Math.max(1, s * .06); gc.beginPath(); gc.ellipse(x - r * .25, y - r * .15, r * .45, r * .18, -.2, Math.PI * 1.1, Math.PI * 1.8); gc.stroke(); }
  gc.restore();
}
function drawGroundCache(ctx, g, s, mw, mh, activeBuildingId, view, scarSurface) {
  const T = g.map?.tiles, m = typeof ctx.getTransform === "function" ? ctx.getTransform() : null;
  if (!T || T.length !== mw * mh || !m || typeof ctx.drawImage !== "function") return false;
  // Dungeons (release 159) also cache their fog: the image changes whenever discovery installs a new revealed set.
  const dungeon = g.area === "dungeon", reveal = dungeon ? (g.map._dungeonRevealMode === "full" ? "full" : g.map._dungeonRevealed || null) : null, revealSize = reveal && reveal !== "full" ? reveal.size : 0;
  let dirty = !ground.canvas || ground.map !== g.map || ground.s !== s || ground.building !== activeBuildingId || ground.refs.length !== T.length || ground.scarSurface !== scarSurface;
  if (!dirty) for (let i = 0; i < T.length; i++) { const q = T[i]; if (q !== ground.refs[i] || q.kind !== ground.kinds[i] || q.blocked !== ground.blocked[i] || q.elev !== ground.elev[i]) { dirty = true; break; } }
  let top = 0; if (dirty) for (const q of T) top = Math.max(top, landscapeTileLift(q, s));
  const want = Math.hypot(m.a, m.b) || 1, fit = Math.sqrt(GROUND_MAX_PIXELS / (mw * s * (mh * s + (dirty ? top : ground.top)))), scale = Math.min(want, fit);
  if (dungeon && fit < want) return false; // a large dungeon at high pixel density would cache blurred: draw it per tile
  if (!dirty && Math.abs(scale - ground.scale) > 1e-6) dirty = true;
  // Release 165: exploring a dungeon reveals chunks one at a time. Redrawing the whole image for each (up to 4096
  // tiles, about once a second while exploring) was a visible hitch, so newly revealed chunks are repainted in place.
  let added = null;
  if (!dirty && (ground.reveal !== reveal || ground.revealSize !== revealSize)) {
    const was = ground.revealIds, now = reveal && reveal !== "full" ? reveal : null;
    if (was && now && [...was].every((id) => now.has(id))) added = [...now].filter((id) => !was.has(id)); else dirty = true;
  }
  const seen = (x, y) => !dungeon || dungeonTileVisibility(g.map, x, y) !== "unseen";
  if (!dirty && added?.length) {
    const gc = ground.canvas.getContext("2d"), reach = Math.ceil(ground.top / s) + 2; // fog hatching and tile edges paint up to a tile past their own square
    setLandscapeStaticPass(true);
    try {
      for (const id of added) {
        const c = /:(\d+),(\d+)$/.exec(id); if (!c) continue;
        const x0 = Number(c[1]) * DUNGEON_CHUNK_SIZE, y0 = Number(c[2]) * DUNGEON_CHUNK_SIZE, x1 = Math.min(mw, x0 + DUNGEON_CHUNK_SIZE), y1 = Math.min(mh, y0 + DUNGEON_CHUNK_SIZE);
        if (x0 >= mw || y0 >= mh) continue;
        // Clip to the chunk grown by one tile on every side (a neighbour's fog hatching reaches into it) plus the band its
        // raised tiles reach, then repaint, in order, every tile that can paint there: the region then matches a full
        // rebuild exactly.
        const cx0 = Math.max(0, x0 - 1) * s, cx1 = Math.min(mw, x1 + 1) * s, cy0 = Math.max(0, y0 - 1) * s - ground.top, cy1 = Math.min(mh, y1 + 1) * s;
        gc.save(); gc.beginPath(); gc.rect(cx0, cy0, cx1 - cx0, cy1 - cy0); gc.clip(); gc.clearRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
        for (let y = Math.max(0, y0 - 1 - reach); y < Math.min(mh, y1 + 1 + reach); y++) for (let x = Math.max(0, x0 - 3); x < Math.min(mw, x1 + 3); x++) { if (!seen(x, y)) fogTile(gc, x, y, s); else tile(gc, T[y * mw + x], x, y, s, T, mw, activeBuildingId, scarSurface); }
        gc.restore();
      }
    } finally { setLandscapeStaticPass(false); }
    Object.assign(ground, { reveal, revealSize, revealIds: new Set(reveal) });
    renderCacheStats.groundPatches = (renderCacheStats.groundPatches || 0) + added.length;
  } else if (!dirty && added) Object.assign(ground, { reveal, revealSize, revealIds: new Set(reveal) });
  if (dirty) {
    const c = ground.canvas || (ground.canvas = makeGroundCanvas()); if (!c) return false;
    // Release 167: a section of the same size reuses the image rather than reallocating it (tens of milliseconds on a
    // phone, on every section crossing).
    const cw = Math.ceil(mw * s * scale), ch = Math.ceil((mh * s + top) * scale);
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    const gc = c.getContext("2d"); if (!gc) { ground.canvas = null; return false; }
    gc.setTransform(1, 0, 0, 1, 0, 0); gc.clearRect(0, 0, cw, ch);
    gc.setTransform(scale, 0, 0, scale, 0, top * scale); gc.imageSmoothingEnabled = false;
    setLandscapeStaticPass(true);
    try { for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { if (!seen(x, y)) fogTile(gc, x, y, s); else tile(gc, T[y * mw + x], x, y, s, T, mw, activeBuildingId, scarSurface); }
      if (!dungeon && g.map?.canopy?.box) drawCanopyBehindTrunk(gc, T, mw, s, g.map.canopy.box, (q, x, y) => tile(gc, q, x, y, s, T, mw, activeBuildingId, scarSurface)); } // great-tree review: platforms behind the trunk, drawn over its face
    finally { setLandscapeStaticPass(false); }
    if (g.map.farInk && !dungeon) inkWash(gc, mw, mh, s, top); // release 719: the Ink Wastes
    Object.assign(ground, { map: g.map, s, scale, building: activeBuildingId, scarSurface, top, reveal, revealSize, revealIds: reveal && reveal !== "full" ? new Set(reveal) : null, refs: T.slice(), kinds: T.map((q) => q.kind), blocked: T.map((q) => q.blocked), elev: T.map((q) => q.elev) });
    renderCacheStats.groundBuilds = (renderCacheStats.groundBuilds || 0) + 1;
  }
  // Copy only the part on screen (view: visible tile bounds), rather than handing the browser the whole image to clip.
  const k = ground.scale, sx = Math.max(0, view.l * s), sy = Math.max(0, view.t * s), ex = Math.min(mw * s, view.r * s), ey = Math.min(mh * s + ground.top, view.b * s + ground.top);
  if (ex > sx && ey > sy) ctx.drawImage(ground.canvas, sx * k, sy * k, (ex - sx) * k, (ey - sy) * k, sx, sy - ground.top, ex - sx, ey - sy);
  return true;
}
// Permanent scars are one derived transparent raster layer, composited after animated terrain.
// Retained circle history never adds per-frame clip operations; geometry work happens only on a cache miss.
const scarOverlay = { canvas:null, map:null, surface:null, s:0, scale:0, want:0, width:0, height:0, reveal:null, revealSize:0, area:null, x0:0, y0:0, x1:0, y1:0 };
function drawVoidScarOverlay(ctx,g,s,mw,mh,view,surface){
  if(!surface.shapes.length)return;
  const m=typeof ctx.getTransform==='function'?ctx.getTransform():null;
  if(!m||typeof ctx.drawImage!=='function'){drawVoidScarSurface(ctx,g,s,mw,mh,surface);return}
  const want=Math.hypot(m.a,m.b)||1;
  const reveal=g.area==='dungeon'&&g.map.dungeonContract?.discoveryEnabled?(g.map._dungeonRevealMode==='full'?'full':g.map._dungeonRevealed||null):'full',revealSize=reveal&&reveal!=='full'?reveal.size:0;
  const covered=view.l*s>=scarOverlay.x0&&view.t*s>=scarOverlay.y0&&view.r*s<=scarOverlay.x1&&view.b*s<=scarOverlay.y1;
  if(!scarOverlay.canvas||scarOverlay.map!==g.map||scarOverlay.surface!==surface||scarOverlay.s!==s||scarOverlay.want!==want||scarOverlay.width!==mw||scarOverlay.height!==mh||scarOverlay.reveal!==reveal||scarOverlay.revealSize!==revealSize||scarOverlay.area!==g.area||!covered){
    const canvas=scarOverlay.canvas||(scarOverlay.canvas=makeGroundCanvas());
    if(!canvas){drawVoidScarSurface(ctx,g,s,mw,mh,surface);return}
    // Large dungeons keep a padded, chunk-aligned viewport raster at native pixel scale instead of
    // downsampling the whole map or falling back to historical-circle work every frame.
    const full=mw*s*mh*s*want*want<=GROUND_MAX_PIXELS,chunk=8;
    const x0=full?0:Math.max(0,Math.floor(view.l/chunk)*chunk)*s,y0=full?0:Math.max(0,Math.floor(view.t/chunk)*chunk)*s;
    const x1=full?mw*s:Math.min(mw,Math.ceil(view.r/chunk)*chunk)*s,y1=full?mh*s:Math.min(mh,Math.ceil(view.b/chunk)*chunk)*s;
    const scale=Math.min(want,Math.sqrt(GROUND_MAX_PIXELS/((x1-x0)*(y1-y0))));
    const cw=Math.max(1,Math.floor((x1-x0)*scale)),ch=Math.max(1,Math.floor((y1-y0)*scale));
    if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
    const gc=canvas.getContext('2d');
    if(!gc){scarOverlay.canvas=null;drawVoidScarSurface(ctx,g,s,mw,mh,surface);return}
    gc.setTransform(1,0,0,1,0,0);gc.clearRect(0,0,cw,ch);gc.setTransform(scale,0,0,scale,-x0*scale,-y0*scale);
    drawVoidScarSurface(gc,g,s,mw,mh,surface);
    Object.assign(scarOverlay,{map:g.map,surface,s,scale,want,width:mw,height:mh,reveal,revealSize,area:g.area,x0,y0,x1,y1});
    renderCacheStats.scarBuilds=(renderCacheStats.scarBuilds||0)+1;
    renderCacheStats.scarPixels=cw*ch;renderCacheStats.scarScale=scale;
  }
  const sx=Math.max(scarOverlay.x0,view.l*s),sy=Math.max(scarOverlay.y0,view.t*s),ex=Math.min(scarOverlay.x1,view.r*s),ey=Math.min(scarOverlay.y1,view.b*s),k=scarOverlay.scale;
  if(ex>sx&&ey>sy){ctx.drawImage(scarOverlay.canvas,(sx-scarOverlay.x0)*k,(sy-scarOverlay.y0)*k,(ex-sx)*k,(ey-sy)*k,sx,sy,ex-sx,ey-sy);renderCacheStats.scarBlits=(renderCacheStats.scarBlits||0)+1}
}
// The warm tint and vignette over the whole screen (release 167: painted once into a screen-sized image and copied each
// frame; filling the radial gradient anew every frame was the costliest single draw when Firefox renders on the CPU).
function drawScreenOverlay(ctx, w, h) {
  const m = typeof ctx.getTransform === "function" ? ctx.getTransform() : null, cw = ctx.canvas?.width, ch = ctx.canvas?.height;
  if (!m || !Number.isFinite(cw) || !Number.isFinite(ch) || !cw || !ch || typeof ctx.drawImage !== "function") return false;
  let o = render.overlay;
  if (!o || o.cw !== cw || o.ch !== ch || o.w !== w || o.h !== h || o.a !== m.a || o.d !== m.d) {
    const c = makeGroundCanvas(); if (!c) return false;
    c.width = cw; c.height = ch;
    const x = c.getContext("2d"); if (!x) return false;
    x.setTransform(m.a, 0, 0, m.d, 0, 0);
    x.fillStyle = "#5c4a3b0c"; x.fillRect(0, 0, w, h);
    const v = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.26, w / 2, h / 2, Math.max(w, h) * 0.7);
    v.addColorStop(0, "#0000"); v.addColorStop(1, "#080a0870");
    x.fillStyle = v; x.fillRect(0, 0, w, h);
    o = render.overlay = { canvas: c, cw, ch, w, h, a: m.a, d: m.d };
  }
  ctx.drawImage(o.canvas, 0, 0, w, h);
  return true;
}
// The standard view's floor (renderer.ts render): `flatInterior`, a versioned interior heightfield (landscape.ts interiorTerrain)
// is painted flat here, so its actors are drawn on the flat floor rather than lifted by levels nobody sees.
export const STANDARD_VIEW_FLOOR = { flatInterior: true };
export function render(ctx, g, w, h, now) {
  if (!closeViewCapturing() && closeViewFrame(ctx, g, w, h, now, render)) return; // CLOSE VIEW (1/3): indoors, the camera behind the Wayfarer, and the blend between cameras (close-view.ts)
  const timed = renderTimings.on, t0 = timed ? performance.now() : 0;
  SEASON = g.area === "overworld" ? g.season || null : null; setTreeSeason(SEASON); // release 679
  ctx.imageSmoothingEnabled = false;
  const bareFloor = closeViewBareFloor(), worldCapture = closeViewWorldCapture();
  const stillworksCapture = bareFloor && !!g.map?.stillworks;
  if (bareFloor) ctx.clearRect(0, 0, w, h); else { ctx.fillStyle = "#141816";
  ctx.fillRect(0, 0, w, h); }
  const budget = presentationBudget(g.presentation, g.area),
    s = Math.round(Math.max(28, Math.min(44, w / 12))),
    p = g.player,
    mw = Math.max(1,Number(g.map?.width)||(g.area === "dungeon" ? 24 : 32)),
    mh = Math.max(1,Number(g.map?.height)||Math.floor(g.map.tiles.length/mw)),
    l = Math.max(0, Math.floor(p.x - w / s / 2) - 2),
    up = worldCapture ? 0 : g.glide && g.area === "overworld" ? Math.ceil(discLift(g.glide.z) * CANOPY_LIFT) : g.map?.canopy?.top ? Math.ceil(liftAt(g.map, mw, p.x, p.y)) : 0, // high in a great tree the world camera looks down on rows far to the south
    t = Math.max(0, Math.floor(p.y - up - h / s / 2) - 2),
    r = Math.min(mw, l + Math.ceil(w / s) + 5),
    b = Math.min(mh, t + Math.ceil(h / s) + 5 + (!worldCapture && g.map?.canopy?.top ? Math.ceil(g.map.canopy.top * LIFT_PER_LEVEL * CANOPY_LIFT) : 0) + up),
    jumping = now < (g.jumpUntil || 0),
    lift = (interiorTerrain(g.map) && closeViewCapturing() ? 0 : jumpLift(g, now)) * s,
    dodging = now < (p.dodgeUntil || 0);
  const objectLists=mapObjectLists(g.map), scarSurface=voidScarSurface(g.map,g.area);
  if (g.area === "dungeon" && labFogOf(g.map)) { const at = labFogTile(p); labFogLook(g.map, at.x, at.y); } // LAB_FOG: the sight is current before anything asks it (the game normally worked it out this frame)
  renderCacheStats.visibleTiles=(r-l)*(b-t);
  renderCacheStats.visibleObjects=0;
  const activeBuildingId=structureOccupancy(g.map.tiles,mw,p.x,p.y),activeShelter=objectLists.shelters.find(o=>o.id===activeBuildingId&&renderableObject(g,o));
  setLandscapeClock(now);
  const flatCapture = worldCapture || (g.map?.interiorTerrain?.version === 1 || g.map?.building) && closeViewCapturing();
  // STANDARD_VIEW_FLOOR (Tim, 2026-11-11: in the Pentagons "the character seems to be kind of like floating above the ground"):
  // this view paints a versioned interior heightfield's floor flat (its tiles carry no landscape lift), so whoever stands on its
  // raised half is drawn on that flat floor too; a hop or the drone is drawn by its height over the floor under it, as Close
  // View's flat capture does. Close View draws the heights themselves.
  const flatFloor = flatCapture || STANDARD_VIEW_FLOOR.flatInterior && interiorTerrain(g.map);
  const groundLift = (x, y) => (flatFloor ? 0 : g.map?.landscape || g.map?.building ? liftAt(g.map, mw, x, y) : 0);
  const crystalLift = e => flatFloor ? 0 : crystalFlightLift(g.map, mw, e.x, e.y);
  const marineAt = e => g.area === "overworld" && isMarineTile(tileUnder(g.map, mw, e.x, e.y));
  ctx.save();
  const interior = interiorTerrain(g.map);
  const supportLevel = interior ? interiorSurfaceLevel(g.map, p.x + .5, p.y + .75) : 0;
  const hopLift = interior && g.skyAir != null && jumping
    ? Math.max(flatFloor ? 0 : supportLevel, g.skyAir - (flatFloor ? supportLevel : 0)) * LIFT_PER_LEVEL
    : g.area === "overworld" && g.skyAir != null && jumping
      ? Math.max(groundLift(p.x, p.y), g.skyAir * LIFT_PER_LEVEL * (g.skyAirScale || 1) - (worldCapture ? liftAt(g.map, mw, p.x, p.y) : 0))
      : null;
  const viewLift = worldCapture ? 0 : g.glide && g.area === "overworld" ? discLift(g.glide.z) * CANOPY_LIFT : hopLift ?? groundLift(p.x, p.y); // 637: a glide is drawn at the great tree's scale // release 635: the camera follows a glide's height
  ctx.translate(Math.round(w / 2 - p.x * s), Math.round(h / 2 - (p.y - viewLift) * s));
  cloudSky = !!g.map?.skyCloud; // release 589
  if (g.area === "dungeon" && g.map?.stillworks && !stillworksCapture) drawStillworksBeyond(ctx, g, s, w, h); // the formations go on past the map's edge
  const groundCached = !bareFloor && !worldCapture && (g.area === "overworld" || g.area === "dungeon") && drawGroundCache(ctx, g, s, mw, mh, activeBuildingId, { l, t, r, b }, scarSurface);
  if (groundCached) {
    const animated = render.animatedTiles || (render.animatedTiles = []), glitter = render.chasmGlitter || (render.chasmGlitter = []); animated.length = 0; glitter.length = 0;
    for (let y = t; y < b; y++) for (let x = l; x < r; x++) {
      const q = g.map.tiles[y * mw + x];
      if (q?.chasm && (x + y * 3) % CHASM_STARS.twinkleEvery === 0 && dungeonTileVisibility(g.map, x, y) !== "unseen") glitter.push(q, x, y); // release 593
      // In a dungeon, a lethal tile right beside the Wayfarer shows through the fog (as the per-tile path always did).
      if (g.area === "dungeon" && LETHAL_KINDS.has(q?.kind) && Math.hypot(x - p.x, y - p.y) < 2.6 && dungeonTileVisibility(g.map, x, y) === "unseen") tile(ctx, q, x, y, s, g.map.tiles, mw, activeBuildingId, scarSurface);
      else if (landscapeTileAnimated(q) && (g.area !== "dungeon" || dungeonTileVisibility(g.map, x, y) !== "unseen")) animated.push(q, x, y);
    }
    animateLandscapeTiles(ctx, animated, s); // release 185: one stroke per water kind, not one per tile
    if (glitter.length) glitterChasm(ctx, glitter, s, now);
    if (g.map.movers?.length) drawRafts(ctx, g, s, now); // release 613
  }
  else if (!bareFloor) { for (let y = t; y < b; y++)
    for (let x = l; x < r; x++) {
      if(g.area==="dungeon"&&dungeonTileVisibility(g.map,x,y)==="unseen"&&!(LETHAL_KINDS.has(g.map.tiles[y*mw+x]?.kind)&&Math.hypot(x-p.x,y-p.y)<2.6)){fogTile(ctx,x,y,s);continue}
      tile(ctx, g.map.tiles[y * mw + x], x, y, s, g.map.tiles, mw,activeBuildingId, scarSurface);
    }
    if (worldCapture && g.map.movers?.length) drawRafts(ctx, g, s, now);
    if (!worldCapture && g.area === "overworld" && g.map?.canopy?.box) drawCanopyBehindTrunk(ctx, g.map.tiles, mw, s, g.map.canopy.box, (q, x, y) => tile(ctx, q, x, y, s, g.map.tiles, mw, activeBuildingId, scarSurface)); } // great-tree review
  drawVoidScarOverlay(ctx,g,s,mw,mh,{l,t,r,b},scarSurface);
  if (g.area === "dungeon" && g.map?.seedRealm) drawRealmCosmos(ctx, g, s, { l, t, r, b }, now, p.x + .5, p.y + .5 - viewLift, !!(g.presentation?.reduceMotion || g.presentation?.safeMode)); // seed realms: the galaxy through the glass
  if (g.area === "dungeon" && g.map?.stillworks) drawStillworksLight(ctx, g, s, now, budget.quality, !!(g.presentation?.reduceMotion || g.presentation?.safeMode), !stillworksCapture); // its great order, the heart's figure, the light falling inward, the counting in the grain
  // Release 635: high up, the ground gives way to sky: blue fading in with height, drifting cloud, the great tree drawn again
  // over it so its branches stay in sight. Height in levels: a glide's, or the tile underfoot's on a great tree's section.
  let skyA = 0, heightNow = 0; // the Wayfarer's height in levels on a great tree's section (the crown veil reads it)
  if (g.area === "overworld" && !worldCapture) { const H = g.glide ? g.glide.z : g.map?.canopy?.top ? (g.skyAir != null && jumping ? Math.max(g.skyAir, tileUnder(g.map, mw, p.x, p.y)?.elev || 0) : (tileUnder(g.map, mw, p.x, p.y)?.elev || 0)) : 0, floor = g.glide ? 0 : canopyFloorReveal(g.map?.canopy, H), a = Math.max(floor, Math.min(1, (H - SKY.from) / (SKY.full - SKY.from))); skyA = a; heightNow = H; // a hop over a gap keeps its height; a canopy grove's floor is gone up among its crowns (CANOPY_FLOOR)
    if (a > 0) { drawSkyAbove(ctx, p.x * s - w / 2, (p.y - viewLift) * s - h / 2, w, h, a, now, s); if (floor > 0) drawCanopyFloor(ctx, g.map.canopy, s, floor); const c = g.map?.canopy?.box; if (c) { for (let y = Math.max(0, c.y); y < Math.min(mh, c.y + c.n); y++) for (let x = Math.max(0, c.x); x < Math.min(mw, c.x + c.n); x++) { const q = g.map.tiles[y * mw + x]; if (q?.canopy) tile(ctx, q, x, y, s, g.map.tiles, mw); } drawCanopyBehindTrunk(ctx, g.map.tiles, mw, s, c, (q, x, y) => tile(ctx, q, x, y, s, g.map.tiles, mw)); } } }
  const t1 = timed ? performance.now() : 0;
  for(const h of g.eliteHazards||[])if(visibleInCamera(h,l,t,r,b,h.radius||2)){const root=h.kind==='root-eruption',arming=h.arming>0;ctx.fillStyle=root?(arming?'#d1a75d22':'#758f3f66'):"#81994a55";ctx.strokeStyle=root?(arming?'#efd389cc':'#b7ce68dd'):"#b7ce6877";ctx.lineWidth=arming?3:2;ctx.beginPath();ctx.ellipse((h.x+.5)*s,(h.y+.65)*s,h.radius*s,h.radius*s*.55,0,0,7);ctx.fill();ctx.stroke();if(root){ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.moveTo((h.x+.5)*s,(h.y+.65)*s);ctx.lineTo((h.x+.5+Math.cos(a)*h.radius)*s,(h.y+.65+Math.sin(a)*h.radius*.55)*s)}ctx.stroke()}}
  if(g.area==="overworld"&&g.seaHazards)drawSeaHazards(ctx,g.seaHazards,s,now,l,t,r,b,g.map);
  const seenTile=(x,y)=>g.area!=="dungeon"||(dungeonTileVisibility(g.map,x,y)!=="unseen"&&labFogState(g.map,x,y)>0);
  const sightTile=(x,y)=>seenTile(x,y)&&(g.area!=="dungeon"||labFogState(g.map,x,y)===2); // LAB_FOG: a safe drop's rim only in sight
  drawHazardBrinks(ctx,g.map,mw,l,t,r,b,s,seenTile); // per frame: brinks sit over animated water, as before
  drawTraversalCues(ctx,g.map,mw,p,s,now,g.ledgeHint,seenTile);
  if (g.area === "dungeon" && g.map?.building?.roomMaze && !closeViewCapturing()) drawRoomViewBelow(ctx, g, s, { l, t, r, b }); // ROOM_VIEW: through a gallery's void, the barrier below (Close View skips it)
  if (g.area === "dungeon" && g.map?.building) drawSafeDropRims(ctx, g.map, mw, p, s, now, budget.quality, !!(g.presentation?.reduceMotion || g.presentation?.safeMode), sightTile); // HOLE_DROPS: a safe drop shows its green rim only close up
  if (g.area === "dungeon" && g.map?.canyon && g.drillTile) { const d = g.drillTile, x = d.x * s, y = d.y * s, k = Math.min(1, d.progress / (d.need || 1)); // Canyon craters: the auger's cracks, and a yellow clod's strain
    ctx.save(); ctx.strokeStyle = `rgba(20,12,6,${.4 + .5 * k})`; ctx.lineWidth = Math.max(1, s * .06); ctx.beginPath(); for (let i = 0; i < 2 + Math.floor(k * 5); i++) { const a = i * 2.1 + d.x, r = s * (.15 + .35 * k); ctx.moveTo(x + s / 2, y + s / 2); ctx.lineTo(x + s / 2 + Math.cos(a) * r, y + s / 2 + Math.sin(a) * r); } ctx.stroke();
    if (d.strain > 0) { const f = Math.min(1, d.strain / 1); ctx.fillStyle = "#0008"; ctx.fillRect(x + s * .1, y - s * .22, s * .8, s * .12); ctx.fillStyle = f > .75 ? "#ff4a3a" : f > .45 ? "#ffd24a" : "#7ddf6a"; ctx.fillRect(x + s * .1, y - s * .22, s * .8 * f, s * .12); }
    ctx.fillStyle = `rgba(150,120,80,${.25 + .3 * Math.sin(now / 60)})`; for (let i = 0; i < 3; i++) ctx.fillRect(x + s * (.2 + ((now / 90 + i * 7) % 6) / 10), y + s * (.75 - i * .15), 2, 2); ctx.restore(); }
  // Release 695 (Tim: "make it low to the ground... the tops of buildings and trees are visible through it... every other creature
  // is pretty visible"): the Stalker's fog is the sea fog's banks and closing-in wash, painted over the ground only, before the
  // marks, the objects and the creatures, so treetops, roofs and other creatures stand out of it (and the marks still show).
  if (g.area === "overworld" && g.stalkFog?.fog) { const F = g.stalkFog, fade = F.level || 0, time = now / 1000;
    if (fade > .01) { for (const f of F.fog) for (let i = 0; i < 7; i++) {
        const a = (f.swirl || 0) + i * 2.399 + Math.sin(time * .2 + i) * .15, d = f.radius * (.15 + .55 * ((i * 37) % 10) / 10), pr = f.radius * (.45 + .1 * Math.sin(time * .3 + i * 1.7));
        const x = (f.x + Math.cos(a) * d) * s, y = (f.y + Math.sin(a) * d) * s, gr = ctx.createRadialGradient(x, y, 0, x, y, pr * s);
        gr.addColorStop(0, `rgba(222,231,236,${.3 * fade})`); gr.addColorStop(1, "rgba(222,231,236,0)"); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, pr * s, 0, 7); ctx.fill(); }
      const px = (p.x + .5) * s, py = (p.y + .6) * s, lv = fade * .9, gr = ctx.createRadialGradient(px, py, s * (1.4 + (1 - lv) * 3), px, py, s * (3.6 + (1 - lv) * 7));
      gr.addColorStop(0, "rgba(207,217,223,0)"); gr.addColorStop(1, `rgba(207,217,223,${.9 * lv})`); ctx.fillStyle = gr; ctx.fillRect(px - w, py - h, w * 2, h * 2); } }
  // Release 696: the Enclosure, a 2x2 pen of planks on a stone footing banded with cinder iron, walled on three sides; holding the
  // Stalker, iron bars close its open side.
  if (g.area === "overworld") for (const pen of g.builds || []) if (pen.kind === "enclosure" && visibleInCamera({ x: pen.x + penSide(pen) / 2, y: pen.y + penSide(pen) / 2 }, l, t, r, b, 3 + penSide(pen))) {
    const n = penSide(pen), X = pen.x * s, Y = pen.y * s, S2 = n * s, wallH = .55 * s, th = .16 * s;
    ctx.save(); ctx.fillStyle = "rgba(120,112,100,.55)"; ctx.fillRect(X, Y, S2, S2); ctx.strokeStyle = "rgba(70,64,58,.5)"; ctx.lineWidth = 1; for (let i = 1; i < 2 * n; i++) { ctx.beginPath(); ctx.moveTo(X + i * S2 / (2 * n), Y); ctx.lineTo(X + i * S2 / (2 * n), Y + S2); ctx.stroke(); } // flagstones
    const wall = (x1, y1, x2, y2) => { const horiz = y1 === y2; ctx.fillStyle = "#6d6a66"; if (horiz) ctx.fillRect(x1, y1 - th / 2, x2 - x1, th); else ctx.fillRect(x1 - th / 2, y1, th, y2 - y1); // the stone footing
      ctx.fillStyle = "#8a6440"; ctx.strokeStyle = "#4a321e"; ctx.lineWidth = 1; if (horiz) { ctx.fillRect(x1, y1 - wallH, x2 - x1, wallH - th / 2); ctx.strokeRect(x1, y1 - wallH, x2 - x1, wallH - th / 2); for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x1 + (x2 - x1) * k / 4, y1 - wallH); ctx.lineTo(x1 + (x2 - x1) * k / 4, y1 - th / 2); ctx.stroke(); } }
      else { ctx.fillRect(x1 - th, y1 - wallH * .6, th * 2, y2 - y1); ctx.strokeRect(x1 - th, y1 - wallH * .6, th * 2, y2 - y1); }
      ctx.fillStyle = "#3c4048"; if (horiz) { ctx.fillRect(x1, y1 - wallH * .72, x2 - x1, s * .05); ctx.fillRect(x1, y1 - wallH * .3, x2 - x1, s * .05); } else { ctx.fillRect(x1 - th, y1 + (y2 - y1) * .3, th * 2, s * .05); ctx.fillRect(x1 - th, y1 + (y2 - y1) * .7, th * 2, s * .05); } }; // cinder-iron bands
    const sides = { north: [X, Y, X + S2, Y], south: [X, Y + S2, X + S2, Y + S2], west: [X, Y, X, Y + S2], east: [X + S2, Y, X + S2, Y + S2] };
    for (const [side, seg] of Object.entries(sides)) if (side !== pen.open) wall(...seg);
    if (pen.trapped) { const [x1, y1, x2, y2] = sides[pen.open]; ctx.strokeStyle = "#2f333a"; ctx.lineWidth = Math.max(2, s * .07); for (let k = 0; k <= 6; k++) { const px = x1 + (x2 - x1) * k / 6, py = y1 + (y2 - y1) * k / 6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - wallH); ctx.stroke(); } } // the bars, shut
    for (const [cx, cy] of [[X, Y], [X + S2, Y], [X, Y + S2], [X + S2, Y + S2]]) { ctx.fillStyle = "#5b3d22"; ctx.fillRect(cx - th * .7, cy - wallH - 2, th * 1.4, wallH + th / 2); } // corner posts
    ctx.restore(); }
  // Active combat effects, including Supernova, intentionally paint over fog. They never reveal tiles or actors.
  const draws = [];
  const captureRift = stillworksCapture ? (effect, draw) => draws.push({ x: effect.x, y: effect.y, fn: draw }) : null;
  drawPackEffects(ctx,g.packEffects,s,now,(f)=>visibleInCamera(f,l,t,r,b,Math.max(3,f.radius||0,f.length||0)),(f)=>groundLift(f.x,f.y),g.presentation,captureRift);
  drawMorphEffects(ctx,g.enemies,s,now); // release 385: the Morphling's cables, jaw, lunge and rising
  drawPackTelegraphs(ctx,g.enemies.filter(e=>e.packKind&&!e.gloomVeil&&shownInDungeon(g,e)),s,now,(e)=>visibleInCamera(e,l,t,r,b,10),{ ground: groundLift, body: crystalLift, reduceMotion: !!(g.presentation?.reduceMotion || g.presentation?.safeMode) });
  for (const h of g.affixHazards || []) { const A = AFFIXES[h.kind] || KIT_MOVES[h.kind] /* release 668 */, x = h.x * s, y = h.y * s, R = h.radius * s, arming = now < h.armAt, k = arming ? Math.max(0, Math.min(1, 1 - (h.armAt - now) / ((A?.arm || .5) * 1000))) : 1; /* release 694: rounding put k a hair below 0 the frame a mark was laid, and a negative radius threw */ if (!A) continue; ctx.save(); // release 657: affix telegraphs and strikes
    if (arming) { ctx.strokeStyle = A.color; ctx.globalAlpha = .45 + .45 * k; ctx.lineWidth = Math.max(2, s * .06); ctx.beginPath(); ctx.ellipse(x, y, R, R * .6, 0, 0, 7); ctx.stroke(); ctx.fillStyle = A.color + "40"; ctx.beginPath(); ctx.ellipse(x, y, R * k, R * .6 * k, 0, 0, 7); ctx.fill(); }
    else if (h.kind === "volcanic" || h.kind === "venomous") { ctx.globalAlpha = Math.min(1, (h.until - now) / 600) * .75; const gr = ctx.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, h.kind === "volcanic" ? "#ffd27a" : "#d8ff9a"); gr.addColorStop(.5, A.color); gr.addColorStop(1, A.color + "00"); ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, R, R * .6, 0, 0, 7); ctx.fill(); }
    else { const f = Math.max(0, (h.until - now) / 250); ctx.globalAlpha = f; if (h.kind === "skyAssault") { ctx.fillStyle = "#e9f8ff"; ctx.fillRect(x - R * .35, y - s * 6, R * .7, s * 6); } ctx.fillStyle = A.color; if (h.kind === "spiked") { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .35; ctx.moveTo(x + (i - 2) * R * .3, y); ctx.lineTo(x + Math.cos(a) * R * .2 + (i - 2) * R * .3, y - R * (1.1 - Math.abs(i - 2) * .25)); ctx.lineTo(x + (i - 2) * R * .3 + R * .12, y); } ctx.fill(); } else { ctx.beginPath(); ctx.ellipse(x, y, R, R * .6, 0, 0, 7); ctx.fill(); } }
    ctx.restore(); }
  for(const e of g.enemies)if(!e.dead&&shownInDungeon(g,e)&&e.eliteWindup>0&&visibleInCamera(e,l,t,r,b,e.kind==='gravitantBell'?6:3)){ctx.strokeStyle=DANGER.edge;ctx.lineWidth=3;/* release 397: the uniform warning colour */ctx.setLineDash([8,6]);ctx.beginPath();ctx.arc((e.x+.5)*s,(e.y+.4)*s,(e.kind==='gravitantBell'?6:2.3)*s,0,7);ctx.stroke();ctx.setLineDash([])}
  for (const e of g.enemies)
    if (!e.dead && shownInDungeon(g,e) && e.telegraph > 0 && visibleInCamera(e,l,t,r,b,e.threatRange||2)) {
      const pulse = e.threatRange||(.65 + (0.9 - e.telegraph) * 0.2);
      ctx.fillStyle = DANGER.fill; // release 397: the uniform warning colour
      ctx.strokeStyle = DANGER.edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (e.meleePhase) {
        const q=enemyMeleeGeometry(e),x=q.x*s,y=q.y*s,padding=.38,range=(q.range+padding)*s;
        if(q.kind==='stab') {
          const width=(q.width+padding)*s, px=-q.dy*width,py=q.dx*width;
          ctx.moveTo(x+px,y+py);ctx.lineTo(x+q.dx*range+px,y+q.dy*range+py);ctx.lineTo(x+q.dx*range-px,y+q.dy*range-py);ctx.lineTo(x-px,y-py);ctx.closePath();
        } else if(q.kind==='slam') ctx.arc(x,y,range,0,Math.PI*2);
        else {const a=Math.atan2(q.dy,q.dx),half=q.arc*Math.PI/360;ctx.moveTo(x,y);ctx.arc(x,y,range,a-half,a+half);ctx.closePath();}
      } else ctx.arc((e.x+.5)*s,(e.y+.45)*s,s*pulse,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
    }
  for (const e of g.enemies) if(!e.dead && e.strike>0 && e.strikeGeometry && shownInDungeon(g,e)) {
    const q=e.strikeGeometry;
    if(!visibleInCamera({x:q.x,y:q.y},l,t,r,b,q.range))continue;
    ctx.strokeStyle=e.tentacles?'#927d9dcc':'#c2a77dcc';ctx.lineWidth=Math.max(2,s*.06);ctx.beginPath();
    if(q.kind==='stab'){ctx.moveTo(q.x*s,q.y*s);ctx.lineTo((q.x+q.dx*q.range)*s,(q.y+q.dy*q.range)*s)}
    else if(q.kind==='slam')ctx.arc(q.x*s,q.y*s,q.radius*s,0,Math.PI*2);
    else{const a=Math.atan2(q.dy,q.dx),half=q.arc*Math.PI/360;ctx.arc(q.x*s,q.y*s,q.range*s,a-half,a+half)}
    ctx.stroke();
  }
  if (dodging && now < (p.echoMist?.until || 0)) { // release 699: Stalker's Mist, the Wayfarer drawn as blue-grey mist
    const cx = (p.x + .5) * s, cy = (p.y + .45) * s, tm = now / 1000;
    for (let k = 0; k < 4; k++) { const ox = Math.cos(tm * 3 + k * 1.6) * s * .22 - (p.dodgeX || 0) * s * .18 * k, oy = Math.sin(tm * 2.4 + k * 2.1) * s * .14 - (p.dodgeY || 0) * s * .18 * k, r = s * (.62 - k * .08), gr = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r);
      gr.addColorStop(0, "rgba(218,230,244,.5)"); gr.addColorStop(.6, "rgba(160,182,210,.22)"); gr.addColorStop(1, "rgba(120,146,180,0)"); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx + ox, cy + oy, r, 0, 7); ctx.fill(); }
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
  if (g.area === "dungeon" && g.map.wallGlints?.length) for (const q of g.map.wallGlints) if (visibleInCamera(q, l, t, r, b) && seenInDungeon(g, q)) drawWallGlint(ctx, q, s, now); // release 225
  if (stillworksCapture) {
    for (const gate of g.map.objects) {
      if (gate.kind !== "pentArenaGate" || !seenInDungeon(g, gate) || !visibleInCamera(gate, l, t, r, b, 2)) continue;
      // Stand the gate card against the arena-facing side of the blocked tile.
      const faceY = gate.y + (gate.inner.y > gate.y ? 1.10 : -.10);
      const art = { ...gate, y: faceY - .95 };
      draws.push({ x: art.x, y: faceY - .82, wallAligned: true,
        fn: () => drawStillworksObject(ctx, art, s, now, !!(g.presentation?.reduceMotion || g.presentation?.safeMode)) });
    }
  }
  const navigationDoors=closeViewCapturing()?CLOSE_VIEW_HOOKS.navigationDoors?.(g):null;
  if(navigationDoors?.length)for(const door of navigationDoors){
    if(!visibleInCamera(door,l,t,r,b,1))continue;
    const point=closeViewDoorTorchPosition(g.map,door),x=point.x-.5,y=point.y-.82;
    draws.push({x,y,nativeSupportX:point.x,nativeSupportY:point.y,
      fn:()=>drawDungeonDoorTorch(ctx,point,s,door.mark,now,!!(g.presentation?.reduceMotion||g.presentation?.safeMode))});
  }
  for (const o of g.map.objects)
    if (!(stillworksCapture && (o.kind === "pentArenaGate" || o.kind === "stillMonolith")) && renderableObject(g,o)&&seenInDungeon(g,o)&&visibleInCamera(o,l,t,r,b,o.vegetationForm==="giant"?GIANT_TREE.height+3:2)&&!(o.kind === "cache" && o.state === "hidden")&&!(o.kind==="displacementTrap"&&o.state!=="used")&&!(o.kind==="deepShortcut"&&o.state==="hidden")&&(renderCacheStats.visibleObjects++,true))
      draws.push({
        object:o,
        ...(closeViewCapturing()&&nativeTraveler(o,now,false)?{nativeAux:{source:o,sample:(clock,quiet)=>nativeTraveler(o,clock,quiet)},nativeHeight:o.elder?3.05:1.8,nativePanelOffset:o.elder?.29:0,nativeEffects:!!o.elder,
          nativeDecorations:()=>drawNativeTravelerDetails(ctx,o,s,g.paused&&Number.isFinite(g.pauseStarted)?g.pauseStarted:now,!!(g.presentation?.reduceMotion||g.presentation?.safeMode)),
          nativeFloor:()=>{ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse((o.x+.5)*s,(o.y+.82)*s,s*(o.elder?.45:.3),s*.12,0,0,7);ctx.fill();}}:{}),
        y: o.disc ? o.y + SKY_DISCS.radius + .002 : o.y, x: o.x, lift: o.disc ? discLift(o.elev || 0) : 0, // release 587: a skyway door stands on its disc
        alpha: o.kind === "tree" && g.area === "overworld" && g.map?.canopy?.top && behindGreatTrunk(g.map.canopy, o) ? GIANT_TREE.ghost : undefined, // great-tree review: a wood's tree standing where the trunk is drawn shows faint, behind it (version 18 ground grows none there)
        fn: () => {
          if (o.kind === "wayfindingCue") waymark(ctx,o,s);
          else if (o.kind === "pentWaysign") pentagonSigilMark(ctx,o,s); // Pentagon finding: a sigil cut in the ground, its long point toward its Pentagon
          else if(o.kind==="shelterHazard"){const cx=(o.x+.5)*s,cy=(o.y+.5)*s;ctx.strokeStyle=o.state==='armed'?'#d68b58aa':'#6e665c77';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,s*.28,0,7);ctx.moveTo(cx-s*.2,cy);ctx.lineTo(cx+s*.2,cy);ctx.moveTo(cx,cy-s*.2);ctx.lineTo(cx,cy+s*.2);ctx.stroke()}
          else if(o.kind==="displacementTrap"){const cx=(o.x+.5)*s,cy=(o.y+.5)*s;ctx.strokeStyle='#806d8b66';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,cy,s*.22,.3,5.5);ctx.stroke()}
          else if (o.kind === "warpDais") drawWarpDais(ctx, o, s, now); // release 301
          else if (o.realmObject) drawRealmObject(ctx, o, s, now); // seed realms
          else if (g.area === "dungeon" && wayKind(o, g.map) || (o.kind === "deepTransition")) drawWayMarker(ctx, o, s, now, o.kind === "deepTransition" ? (o.direction === "down" ? "down" : "up") : wayKind(o, g.map) === "down" ? "down" : "up", o.kind === "emberDoor"); // a way: a marker stone with a chevron
          else if (o.kind === "buildingStair") drawBuildingStair(ctx, o, s, now); // great buildings
          else if (o.kind === "labKey") drawLabKey(ctx, o, s, now); // a labyrinth's key
          else if (o.kind === "turtleShell") { const L = groundLift(o.x, o.y) * s; ctx.save(); ctx.translate(0, -L); drawTurtleShell(ctx, o.x, o.y, s, TURTLE_SHELL.sprite); ctx.restore(); } // the Mountain Turtle's shell (its gateway is its tomb door)
          else if (o.kind === "pentRubble") drawPentRubble(ctx, o, s); // the Pentagon's rubble
          else if (o.kind === "pentRelic") drawPentRelic(ctx, o, s, now); // and its relics
          else if (o.kind === "pentInscription") drawPentInscription(ctx, o, s, now); // the marks in its walls
          else if (o.kind === "pentMural") drawPentMural(ctx, o, s, now); // release 795: where a grand hall's mural is read
          else if (o.kind === "pentLever") drawPentLever(ctx, o, s, now); // its levers (v2)
          else if (o.kind === "towerLever") {} // TOWER_SEAL: drawn on the tower's top with its roof (greatBlocks)
          else if (o.kind === "labGate") { if (o.state !== "open") drawBars(ctx, o, s); } // a room maze's barred door (labyrinths.ts ROOM_MAZES)
          else if (o.kind === "pentSigil") drawPentSeal(ctx, o, s, now); // and the Fivefold Seal
          else if (o.kind === "pentShortcut") drawPentShortcut(ctx, o, s, now); // and its shortcut links (v6)
          else if (o.kind === "pentFinaleWall") drawPentFinaleWall(ctx, o, s, now); // the finale's opened wall
          else if (o.kind === "pentDais") drawPentDais(ctx, o, s, now); // and its dais
          else if (o.kind === "stillMonolith" || o.kind === "pentArenaGate") drawStillworksObject(ctx, o, s, now, !!(g.presentation?.reduceMotion || g.presentation?.safeMode)); // the Stillworks' standing lattices and gates
          else if (o.kind === "watcherTomb") { const L = groundLift(o.x, o.y + .5) * s; ctx.save(); ctx.translate(0, -L); drawWatcherTomb(ctx, o, s, now); ctx.restore(); } // release 289 (lifted onto a shrine's eye)
          else if (o.kind === "traveler" && o.elder) drawElder(ctx, o, s, now);
          else if (o.kind === "traveler") {
            if (o.folkGiant) { ctx.save(); ctx.translate((o.x + .5) * s, (o.y + 1) * s); ctx.scale(FAR_FOLK.scale, FAR_FOLK.scale); ctx.translate(-(o.x + .5) * s, -(o.y + 1) * s); } // release 720: the Tall Country
            const f = o.facing || "down", step = o.state === "walking" ? Math.floor(now / 180) : 0, lift = o.mount ? .42 : 0;
            if (o.mount) actor(ctx, o.x, o.y + .05, s, o.mount, f, step, o.state === "walking" ? "walk" : "idle");
            actor(ctx, o.x, o.y - lift, s, o.look || "traveler", f, step, "idle");
            if (o.wanderer) { const q = g.save.wanderer?.quest; ctx.fillStyle = !q || q.done ? "#f0d58a" : "#9cc8b5"; ctx.font = `bold ${Math.max(10, s * .32)}px monospace`; ctx.textAlign = "center"; ctx.fillText(!q || q.done ? "!" : "…", (o.x + .5) * s, (o.y - lift - .25) * s); }
            if (o.folkGiant) ctx.restore();
          }
          else if (o.kind === "wandererCache") { if (o.state !== "used") { actor(ctx, o.x, o.y, s, "wandererCache", "down", 0, "idle"); } }
          else if (o.quarryTurtle) quarryTurtle(ctx, o.x, o.y, s, now); // release 265: Shale, the quarry keeper
          else if (o.kind === "villager" && o.folkGiant) { ctx.save(); ctx.translate((o.x + .5) * s, (o.y + 1) * s); ctx.scale(FAR_FOLK.scale, FAR_FOLK.scale); ctx.translate(-(o.x + .5) * s, -(o.y + 1) * s); actor(ctx, o.x, o.y, s, o.guard ? "militia" : "villager", "down", 0, "idle"); ctx.restore(); } // release 720: the Tall Country
          else if (o.kind === "villager") { actor(ctx, o.x, o.y, s, o.guard ? "militia" : "villager", "down", 0, "idle"); ctx.fillStyle = "#9cc8b5"; ctx.beginPath(); ctx.arc((o.x + 0.5) * s, o.y * s - 6, 3, 0, 7); ctx.fill(); }
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
          } else if (o.kind === "shack" || o.kind === "architecturalBuilding" || o.kind === "greatBuilding" || o.buildingDoor) { /* roofs render after actors so exterior views conceal contents; a great building draws its own doors */ }
          else if (o.kind === "architecturalDistrict") { /* district title is carried by its buildings */ }
          else if (o.kind === "viewport") {
            actor(ctx, o.x, o.y, s, "viewport");
            ctx.strokeStyle = "#8de4df";
            ctx.lineWidth = Math.max(1.5, s * .055);
            ctx.strokeRect((o.x - .34) * s, (o.y - .82) * s, s * .68, s * .42);
            ctx.beginPath();ctx.moveTo((o.x-.22)*s,(o.y-.68)*s);ctx.lineTo((o.x+.2)*s,(o.y-.68)*s);ctx.moveTo((o.x-.12)*s,(o.y-.56)*s);ctx.lineTo((o.x+.28)*s,(o.y-.56)*s);ctx.stroke();
            ctx.fillStyle = "#d5efdf";
            ctx.font = "9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("VIEWPORT", (o.x + .5) * s, (o.y - .95) * s);
            ctx.textAlign = "start";
          } else if (o.kind === "diveSite") { // a bobbing red-and-white buoy with a dive flag
            const bx = (o.x + .5) * s, by = (o.y + .7) * s + Math.sin(now / 500 + o.x) * s * .04;
            ctx.strokeStyle = "#e8f4ff88"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(bx, by + s * .1, s * (.35 + .1 * Math.sin(now / 400)), s * .12, 0, 0, 7); ctx.stroke();
            ctx.fillStyle = "#d8463a"; ctx.beginPath(); ctx.arc(bx, by, s * .22, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#f4f1ea"; ctx.fillRect(bx - s * .22, by - s * .02, s * .44, s * .08);
            ctx.fillStyle = "#3a2c22"; ctx.fillRect(bx - 1, by - s * .7, 2, s * .5); ctx.fillStyle = "#d8463a"; ctx.fillRect(bx + 1, by - s * .7, s * .3, s * .2); ctx.strokeStyle = "#f4f1ea"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 1, by - s * .7); ctx.lineTo(bx + 1 + s * .3, by - s * .5); ctx.stroke();
          } else if (o.kind === "airPocket") { // a rising column of bubbles
            for (let i = 0; i < 7; i++) { const f = (now / 1100 + i / 7) % 1, bx = (o.x + .5) * s + Math.sin(now / 300 + i * 2) * s * .15; ctx.fillStyle = `rgba(220,245,255,${.85 * (1 - f)})`; ctx.beginPath(); ctx.arc(bx, (o.y + .7) * s - f * s * 1.6, s * (.05 + (i % 3) * .025), 0, 7); ctx.fill(); }
            ctx.strokeStyle = "#bfe9ff99"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc((o.x + .5) * s, (o.y + .7) * s, s * .45, 0, 7); ctx.stroke();
          } else if (o.kind === "diveExit") { // the surface line: a rope rising out of view
            ctx.strokeStyle = "#d9c39a"; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath(); ctx.moveTo((o.x + .5) * s, (o.y + .8) * s); ctx.quadraticCurveTo((o.x + .7) * s, (o.y - 1) * s, (o.x + .45) * s, (o.y - 3) * s); ctx.stroke();
            ctx.fillStyle = "#e2d5ba"; ctx.font = "10px monospace"; ctx.textAlign = "center"; ctx.fillText("SURFACE", (o.x + .5) * s, (o.y + 1.2) * s); ctx.textAlign = "start";
          } else if (o.kind === "shipwreck") { // a broken hull heeled over on the sand, ribs showing
            const bx = (o.x + .5) * s, by = (o.y + .6) * s, spent = o.state === "used";
            ctx.save(); ctx.translate(bx, by); ctx.rotate(-.35);
            ctx.fillStyle = spent ? "#4a3a2c" : "#5d4330"; ctx.beginPath(); ctx.moveTo(-s * 1.6, -s * .1); ctx.quadraticCurveTo(0, s * .9, s * 1.5, -s * .2); ctx.lineTo(s * 1.1, -s * .45); ctx.quadraticCurveTo(0, s * .25, -s * 1.2, -s * .4); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#d8c7a6"; ctx.lineWidth = Math.max(1.5, s * .06); for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * s * .35, -s * .35); ctx.quadraticCurveTo(i * s * .38, -s * .9, i * s * .3, -s * 1.1); ctx.stroke(); }
            ctx.strokeStyle = "#3a2c22"; ctx.lineWidth = Math.max(2, s * .09); ctx.beginPath(); ctx.moveTo(s * .2, -s * .3); ctx.lineTo(s * .55, -s * 1.7); ctx.stroke();
            ctx.restore();
            if (!spent) { ctx.fillStyle = "#e2d5ba"; ctx.font = "10px monospace"; ctx.textAlign = "center"; ctx.fillText("WRECK", bx, by - s * 1.4); ctx.textAlign = "start"; }
          } else if (o.kind === "digSpot") { drawDigSpot(ctx, o, s, now);
          } else if (o.kind === "ilse") { drawIlse(ctx, o, s, now);
          } else if (o.kind === "crackedBell") { drawCrackedBell(ctx, o, s, now);
          } else if (o.kind === "saplingDais" || o.kind === "riteAshes") { drawRiteTree(ctx, o, s, now); // the Rite of Ascendancy
          } else if (o.kind === "crownRest") { const cx = (o.x + .5) * s, cy = (o.y + .6) * s, lit = g.save?.activeCheckpoint?.crown && g.save.activeCheckpoint.rx === g.rx && g.save.activeCheckpoint.ry === g.ry, pulse = .55 + .45 * Math.sin(now / 420); ctx.save(); ctx.strokeStyle = lit ? `rgba(160,255,170,${.5 + .4 * pulse})` : "rgba(200,230,190,.45)"; ctx.lineWidth = Math.max(2, s * .06); ctx.beginPath(); ctx.ellipse(cx, cy, s * .42, s * .2, 0, 0, 7); ctx.stroke(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + now / 2000; ctx.fillStyle = lit ? "#9dffae" : "#cfe8c4"; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * s * .42, cy + Math.sin(a) * s * .2, s * .07, s * .035, a, 0, 7); ctx.fill(); } ctx.restore(); // release 669: the Crown Rest
          } else if (o.kind === "canopyGate") { drawCanopyGate(ctx, o, s, now); // release 631
          } else if (o.kind === "seedFind") { drawSeedFind(ctx, o, s, now); // travel seeds
          } else if (o.kind === "tideBearer") { actor(ctx, o.x, o.y, s, "npc", "down", 0, "idle"); drawTideLantern(ctx, o, s, now); // travel seeds
          } else if (o.kind === "threadRelic") { drawThreadRelic(ctx, o, s, now); // release 627
          } else if (o.kind === "tornPage") { drawTornPage(ctx, o, s, now); // release 595
          } else if (o.kind === "surveyorLink") { drawSurveyorLink(ctx, o, s, now); // release 505
          } else if (o.kind === "surveyorStatue") { drawSurveyorStatue(ctx, o, s, now); // release 551
          } else if (o.kind === "marginNote") { drawMarginNote(ctx, o, s, now);
          } else if (o.kind === "townKeeper") { actor(ctx, o.x, o.y, s, "npc", "down", 0, "idle"); ctx.strokeStyle = "#c9a6ff"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); ctx.arc((o.x + .5) * s, (o.y - .15) * s, s * .14, 0, 7); ctx.stroke(); // release 441: a keeper with an Aperture lens
          } else if (o.kind === "skiff") {
            drawSkiff(ctx, o.x, o.y, s, "right", performance.now());
            if (o.id === "skiff-moored" && g.mendTarget?.() && !g.mendTarget().aboard) repairTag(ctx, o.x, o.y, s); // release 269
          } else if (o.kind === "shipwright") {
            actor(ctx, o.x, o.y, s, "shipwright", "down", 0, "idle");
            ctx.fillStyle = "#e2d5ba"; ctx.font = "10px monospace"; ctx.textAlign = "center";
            ctx.fillText("SHIPWRIGHT", (o.x + .5) * s, (o.y - .3) * s); ctx.textAlign = "start";
          } else if (o.kind === "relayNode" || o.kind === "arrayPylon") {
            drawRelayNode(ctx, o, s, performance.now());
          } else if (o.kind === "relayTerminal") {
            actor(ctx, o.x, o.y, s, "shrine");
            ctx.fillStyle = "#d2c090";
            ctx.font = "10px monospace";
            ctx.fillText("RELAY", o.x * s, (o.y - 0.3) * s);
          } else if (o.kind === "tree" && o.vegetationForm === "giant" && o.state === "standing" && !o.strange) { drawGiantTree(ctx, o, s, now); // release 573
          } else {const kind=o.kind==="tree"&&o.vegetationForm==="shrub"?"treeShrub":o.kind==="tree"&&o.vegetationForm==="spindle"?"treeSpindle":o.kind;if(o.strange&&!o.strangeUsed)drawStrange(ctx,o,s,kind,now);else if(SEASON&&o.kind==="tree"&&o.state==="standing")drawSeasonTree(ctx,o,s,kind);else actor(ctx,o.x,o.y,s,kind,"down",0,o.state||"idle",false,o.scale||1);}
        },
      });
  for (const e of g.enemies)
    if (!e.dead && !e.gloomVeil /* the Gloomvast's Dark: its cold lights are drawn over the darkness, below */ && shownInDungeon(g,e) && visibleInCamera(e,l,t,r,b,e.kind === "psychicCrystal" || e.kind === "lightningGiant" ? 5 : 2))
      draws.push({
        y: e.y + (astralMountPresentation(e) ? .001 : 0), x: e.x,
        enemy: e,
        nativeWindup: nativeWindupDuration(e),
        nativeActionShape: nativeActionShape(e),
        nativeFloor: (time = now) => drawNativeCreatureFloor(ctx, g, e, s, time),
        nativeDecorations: () => drawNativeCreatureDecorations(ctx, e, s, g.paused && Number.isFinite(g.pauseStarted) ? g.pauseStarted : now, g.presentation),
        nativePackEffects: (time = now) => drawNativePackEffects(ctx, e, s, time, g.presentation, actorPresentation(e) || {}),
        nativeEffects: hasNativePackEffects(e),
        nativeLift: Math.max(0, Number(e.hopLift) || 0),
        fn: () => {
          if (e.seaKind) { drawSeaCreature(ctx, e, s, now, SEA_CREATURES[e.seaKind].colors, g); return; }
          if (e.fracRank) { const rare = e.fracRank === "rare", pulse = .55 + .45 * Math.sin(now / 260), R = s * (.42 + (e.bodyRadius || .4) * .6); ctx.save(); ctx.strokeStyle = rare ? `rgba(255,196,70,${.5 + .4 * pulse})` : `rgba(110,170,255,${.45 + .35 * pulse})`; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath(); ctx.ellipse((e.x + .5) * s, (e.y + .82) * s, R, R * .42, 0, 0, Math.PI * 2); ctx.stroke(); if (rare && e.packName) { ctx.font = `bold ${Math.max(10, s * .3)}px serif`; ctx.textAlign = "center"; ctx.fillStyle = "#ffd77a"; ctx.strokeStyle = "#000a"; ctx.lineWidth = 3; const ty = (e.y - (e.scale || 1) * .55) * s; ctx.strokeText(e.packName, (e.x + .5) * s, ty); ctx.fillText(e.packName, (e.x + .5) * s, ty); } ctx.restore(); } // release 651: Fractured mode's champions (blue) and rares (gold, named)
          if (e.fracWarden) { const cx = (e.x + .5) * s, cy = (e.y + .82) * s, R = s * (.5 + (e.bodyRadius || .5) * .7), tt = now / 1000; ctx.save(); ctx.strokeStyle = `rgba(255,70,120,${.55 + .35 * Math.sin(now / 200)})`; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath(); for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2 + tt * .4, rr = R * (i % 2 ? .82 : 1.08); ctx[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .42); } ctx.stroke(); ctx.font = `bold ${Math.max(10, s * .3)}px serif`; ctx.textAlign = "center"; ctx.fillStyle = "#ff8fb0"; ctx.strokeStyle = "#000a"; ctx.lineWidth = 3; const ty = (e.y - (e.scale || 1) * .6) * s; ctx.strokeText("Fracture Warden", cx, ty); ctx.fillText("Fracture Warden", cx, ty); ctx.restore(); } // release 666: a jagged crimson ring and its name
          if ((e.affixes?.length || e.warded || e.fracShaman) && !(e.stalker && e.hidden)) { ctx.save(); const cx = (e.x + .5) * s, cy = (e.y + .45) * s, tt = now / 1000; // release 657: affixes, wards, shamans; 691: a lurking Stalker gives nothing away (695: nor a veiled or mirage one); 694: the comment had swallowed the save and cx/cy/tt
            if (e.affixes?.includes("droneSwarm")) for (let i = 0; i < AFFIXES.droneSwarm.count; i++) { const d = dronePos(e, i, tt), dx = d.x * s, dy = d.y * s; ctx.fillStyle = "#2b3a1e"; ctx.strokeStyle = AFFIXES.droneSwarm.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(dx, dy - s * .12); ctx.lineTo(dx + s * .12, dy); ctx.lineTo(dx, dy + s * .12); ctx.lineTo(dx - s * .12, dy); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#e9ffb0"; ctx.fillRect(dx - 1.5, dy - 1.5, 3, 3); }
            if (e.warded) { ctx.strokeStyle = `rgba(180,140,255,${.5 + .3 * Math.sin(now / 180)})`; ctx.lineWidth = Math.max(2, s * .05); ctx.beginPath(); ctx.arc(cx, cy, s * (.55 + (e.bodyRadius || .4) * .5), 0, 7); ctx.stroke(); }
            if (e.fracShaman) { ctx.strokeStyle = `rgba(190,120,255,${.55 + .35 * Math.sin(now / 140)})`; ctx.lineWidth = Math.max(2, s * .07); for (const k of [0, 1]) { const rr = s * (.8 + ((tt * .8 + k * .5) % 1) * .9); ctx.globalAlpha = 1 - ((tt * .8 + k * .5) % 1); ctx.beginPath(); ctx.ellipse(cx, (e.y + .82) * s, rr, rr * .45, 0, 0, 7); ctx.stroke(); } ctx.globalAlpha = .35; for (const m of g.enemies) if (!m.dead && m.wardBy === e.id && m.warded) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo((m.x + .5) * s, (m.y + .45) * s); ctx.stroke(); } ctx.globalAlpha = 1; }
            const names = affixNames(e); if (names.length) { ctx.font = `${Math.max(9, s * .24)}px sans-serif`; ctx.textAlign = "center"; ctx.fillStyle = "#ffe2b0"; ctx.strokeStyle = "#000b"; ctx.lineWidth = 3; const ty = (e.y - (e.scale || 1) * .55) * s + ((e.packName && e.fracRank === "rare") || e.fracWarden ? s * .32 : 0); ctx.strokeText(names.join(" · "), cx, ty); ctx.fillText(names.join(" · "), cx, ty); }
            ctx.restore(); }
          const f = e.ai?.facing || "down",
            q = e.recoil > 0 && !["astralWorm","astralMirage"].includes(e.kind) ? 0.12 : 0,
            ox = f === "left" ? q : f === "right" ? -q : 0,
            oy = f === "up" ? q : f === "down" ? -q : 0;
          if (e.hitFlash > 0 && e.kind !== "psychicCrystal") {
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = "#d9b38b";
            const flashScale = Math.max(.7,Number(e.scale)||1);
            ctx.fillRect((e.x + .5 - .4*flashScale) * s, (e.y + .45 - .42*flashScale) * s, s * .8*flashScale, s * .75*flashScale);
            ctx.restore();
          }
          if (e.kind === "stalker") { drawStalkerMarks(ctx, e, s, now); drawStalker(ctx, e, s, now, !!(g.presentation?.reduceMotion || g.presentation?.safeMode)); return; } // release 678
          if (e.packKind && drawPackMonster(ctx, { ...e, x: e.x + ox, y: e.y + oy, ...(["voidWalker", "psychicCrystal", "lightningGiant"].includes(e.kind) ? { marine: !astralMountPresentation(e) && marineAt(e) } : {}), ...(e.kind === "astralWorm" ? { astralBeamGroundLiftDelta: (()=>{ const a=astralBeamAnchors({...e.astral,x:e.x,y:e.y,scale:Math.max(.6,Number(e.scale)||1),facingX:e.astral?.facingX||e.facingX||1});return groundLift(e.x,e.y)-groundLift(a.ground.x,a.ground.y); })() } : {}), ...(["voidWalker", "astralWorm", "astralMirage", "lightningGiant"].includes(e.kind) ? { reduceMotion: !!(g.presentation?.reduceMotion || g.presentation?.safeMode) } : {}), ...(e.kind === "psychicCrystal" ? { flightLiftDelta: crystalLift(e) - groundLift(e.x, e.y), reduceMotion: !!(g.presentation?.reduceMotion || g.presentation?.safeMode) } : {}) }, s, now, f)) return;
          if (e.kind === "gateRevenant") drawGateRevenant(ctx, e, s, now, ox, oy); // release 271
          else actor(
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
  // Release 587: the skyway's floating discs, each sorted at its front edge; the Wayfarer standing on one is drawn just after it, lifted.
  const onDisc = g.skyLevel > 0 && g.map?.skyDiscs ? g.map.skyDiscs.find((d) => d.level === g.skyLevel && Math.hypot(p.x + .5 - d.x, p.y + .75 - d.y) <= d.r + .05) : null;
  for (const d of g.map?.skyDiscs || []) if (visibleInCamera({ x: d.x, y: d.y }, l, t, r, b, 3)) {
    if (worldCapture) drawSkyDisc(ctx, d, s, now, true);
    else draws.push({ y: d.y - .75 + d.r, fn: () => drawSkyDisc(ctx, d, s, now) });
  }
  const captureDrone=closeViewCapturing()&&closeViewBareFloor()&&!!g.droneUp?.()&&!!g.droneAt;
  const playerDraw = {
    nativeLift: playerFormPresentation(g)?.lift || 0,
    nativeEffects: captureDrone || !!playerFormPresentation(g)?.mech || (g.paused&&Number.isFinite(g.pauseStarted)?g.pauseStarted:now) < (p.stunnedUntil || 0),
    nativeDecorations: () => drawNativePlayerDecorations(ctx,g,s,g.paused&&Number.isFinite(g.pauseStarted)?g.pauseStarted:now),
    jumpBaseMs: JUMP.base,
    jumpLift: jumpLift(g, g.paused&&Number.isFinite(g.pauseStarted)?g.pauseStarted:now),
    y: onDisc && !worldCapture ? onDisc.y - .75 + onDisc.r + .001 : p.y, x: p.x, lift: g.droneLift && interior
      ? Math.max(0, g.droneLift.z - supportLevel) * LIFT_PER_LEVEL
      : g.droneLift && g.area === "overworld" ? Math.max(0, g.droneLift.z - (tileUnder(g.map, mw, p.x, p.y)?.elev || 0)) * LIFT_PER_LEVEL * tileLiftScale(tileUnder(g.map, mw, p.x, p.y)) : g.glide && g.area === "overworld" ? Math.max(0, discLift(g.glide.z) * CANOPY_LIFT - groundLift(p.x, p.y)) : /* release 647: the drone's booster lifts the Wayfarer */ hopLift != null ? Math.max(0, hopLift - groundLift(p.x, p.y)) : /* a sky hop stays at its platform's height over the gap */ g.skyLevel > 0 && !worldCapture ? discLift(g.skyLevel) : g.raftZ ? discLift(g.raftZ) : 0, // 635: a glide's height alpha: g.raftZ < -.3 ? Math.max(.25, .65 + g.raftZ * .2) : 1, // release 615: riding a raft above or beneath the level
    fn: () => {
      if (g.glide && g.area === "overworld" && g.glide.open !== false) drawLeafGlider(ctx, p, s, now); // release 635; 641: only while open
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
      if (g.area === "overworld" && g.save.boat?.aboard) {
        // A jump lifts the skiff with the Wayfarer (release 158: leap a rogue wave's crest).
        const shieldLeft = Number(g.save.boat.shield) || 0; // release 269: under the hull guard, the skiff is a longboat (flickering back in its last 10 s)
        if (p.facing === "left" || p.facing === "right") g.longboatSide = p.facing;
        g._longboatFront = shieldLeft > 0 && (shieldLeft > 10 || Math.floor(now / 200) % 2 === 1); // the near hull goes over the Wayfarer, below
        g._subDive = (g.save.boat.sub || g.save.boat.mechSub) ? Math.max(0, ((g.subDiveUntil || 0) - now) / 1000) : 0; // release 311
        g._seaSuit = !!(g.save.boat.mechSub && g.save.mech?.active && g.save.mech.empowered); // release 621: the power armor hovers instead
        if (g._seaSuit) { if (!(g._subDive > 0)) drawThrustDip(ctx, p.x, p.y - lift / s, s, now); }
        else if ((g.save.boat.sub || g.save.boat.mechSub) && !g._longboatFront) drawSubmersible(ctx, p.x, p.y - lift / s, s, p.facing, now, "back", g._subDive);
        else (g._longboatFront ? drawLongboat : drawSkiff)(ctx, p.x, p.y - lift / s, s, p.facing, now, g.longboatSide || "right");
        if (g.mendTarget?.()) repairTag(ctx, p.x, p.y - .9 - lift / s, s);
        // Hull gauge under the skiff: green to amber to red as the hull takes damage.
        const hull = Math.max(0, Math.min(1, (g.save.boat.hull || 0) / BOAT.maxHull)), bx = (p.x + .08) * s, by = (p.y + 1.12) * s, bw = s * .84, bh = Math.max(3, s * .09);
        ctx.fillStyle = "#0b1218cc"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        ctx.fillStyle = hull > .6 ? "#6fcf7a" : hull > .3 ? "#e3b04b" : "#e2574a"; ctx.fillRect(bx, by, bw * hull, bh);
        if (hull <= .3 && Math.floor(now / 350) % 2) { ctx.strokeStyle = "#ffb3a8"; ctx.lineWidth = 1; ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2); }
        // Release 263/269: the hull guard (the skiff itself becomes a longboat).
        const shield = Number(g.save.boat.shield) || 0;
        // Release 269: the guard's own bar, bright fuchsia, extends the hull gauge to the right; blows eat into it, and when it is gone so is the guard.
        if (g.save.boat.sub) { const sw = bw * BOAT.sub.hull / BOAT.maxHull, left = Math.min(1, (Number(g.save.boat.subHull) || 0) / BOAT.sub.hull); ctx.fillStyle = "#0b1218cc"; ctx.fillRect(bx - sw - 3, by - 1, sw + 2, bh + 2); ctx.fillStyle = "#d8dee5"; ctx.fillRect(bx - 2 - sw * left, by, sw * left, bh); } // release 311: the submersible's plating, silver, to the left
        if (shield > 0) { const gw = bw * BOAT.shield.bonus / BOAT.maxHull, left = Math.min(1, (Number(g.save.boat.guardHull) || 0) / BOAT.shield.bonus); ctx.fillStyle = "#0b1218cc"; ctx.fillRect(bx + bw + 1, by - 1, gw + 2, bh + 2); ctx.fillStyle = "#ff2fb4"; ctx.fillRect(bx + bw + 2, by, gw * left, bh); }
      }
      const ride = g.area === "overworld" ? g.mountRide?.() : null, seatInfo = ride ? drawMount(ctx, ride, p, s, now, lift, !!(g.presentation?.reduceMotion || g.presentation?.safeMode)) : null, seat = seatInfo ? seatInfo.up : 0; // release 748: riding
      // Release 257: knocked flat by the Lightning Giant's shock, the Wayfarer tips over, shakes, and gets back up.
      const knocked = now < (p.stunnedUntil || 0), kd = knocked ? knockdownPose(now - (p.stunnedAt || now), (p.stunnedUntil || now) - (p.stunnedAt || now), !!(g.presentation?.reduceMotion || g.presentation?.safeMode)) : null;
      if (kd) { const fx = (p.x + .5) * s + kd.shake, fy = (p.y + .9) * s - lift; ctx.save(); ctx.translate(fx, fy); ctx.rotate(kd.angle * (p.facing === "left" ? -1 : 1)); ctx.translate(-(p.x + .5) * s, -(p.y + .9) * s + lift); }
      const drone = !!g.droneUp?.() && !!g.droneAt, mech = !!g.mechUp?.(), mechLift = (mech || drone) && g.mechBoosting ? s * (drone ? .35 : .22) : 0; // release 317: the robot ashore, lifted while it boosts; 321: the drone carries higher
      if (mech && g.save.mech?.empowered) { const cx = (p.x + .5) * s, cy = (p.y + .55) * s - lift - mechLift, r = s * (.72 + .05 * Math.sin(now / 140)), glow = ctx.createRadialGradient(cx, cy, r * .2, cx, cy, r); glow.addColorStop(0, "#ffb05a55"); glow.addColorStop(1, "#ff5a1f00"); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); } // release 383: the empowered robot's furnace glow
      const seaSuit = g.area === "overworld" && !!g.save.boat?.aboard && g._seaSuit, hover = seaSuit && !(g._subDive > 0) ? s * (SEA_SUIT.hover + SEA_SUIT.bob * Math.sin(now / SEA_SUIT.bobMs)) : 0; // release 621
      const suited = (mech && g.save.mech?.empowered === true) || seaSuit; // release 389: empowered, the robot is a svelte silver suit in the Wayfarer's place
      if (mech && !suited) drawSubmersible(ctx, p.x, p.y - (lift + mechLift) / s, s, p.facing, now, "back", 0, false, g.mechBoosting);
      const subHidden = g.area === "overworld" && g.save.boat?.aboard && g._subDive > 0; if (subHidden) { ctx.save(); ctx.globalAlpha = .12; } // release 311: under the surface
      if (suited) drawPowerSuit(ctx, p.x, p.y - (lift + mechLift + hover) / s, s, p.facing, now, Math.floor(p.walkPhase || 0), now < (p.attackUntil || 0), g.mechBoosting || seaSuit); else actor(
        ctx,
        p.x + (seatInfo ? seatInfo.dx / s : 0), // release 748: on the mount's back
        p.y - (lift + (mech ? mechLift : 0) + seat) / s, // release 543: in the robot, the Wayfarer rises with it (a boost left their legs below it)
        s,
        "player",
        p.facing,
        Math.floor(p.walkPhase || 0),
        now < (p.attackUntil || 0) ? "attack" : "walk",false,g.save.magicSkills?.active?.id==='ember-form'?1.25+.05*(g.save.magicSkills.active.rank||1):1,
      );
      if (seatInfo) drawMountFront(ctx); // release 748: a riding bowl's near rim over the rider
      if (kd) { ctx.restore(); drawShockSparks(ctx, (p.x + .5) * s, (p.y + .9) * s - lift, s, now); }
      if (subHidden) ctx.restore();
      if (mech && !suited) drawSubmersible(ctx, p.x, p.y - (lift + mechLift) / s, s, p.facing, now, "front", 0, false, g.mechBoosting);
      if (drone&&!captureDrone) { const carry = !!g.mechBoosting; drawDrone(ctx, carry ? p.x : g.droneAt.x, carry ? p.y - (lift + mechLift) / s - .62 : g.droneAt.y - lift / s, s, p.facing, now, carry, g.droneHealFx || 0); // release 321
        const m = g.save.mech, bx = (p.x + .08) * s, by = (p.y + 1.1) * s - lift, bw = s * .84, bh = Math.max(3, s * .08); // carry (blue) and mend readiness (green)
        ctx.fillStyle = "#0b1218cc"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh * 2 + 3); ctx.fillStyle = "#5fc6e0"; ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, m.fuel / DRONE.carry)), bh); ctx.fillStyle = (m.healCd || 0) > 0 ? "#3f7f52" : "#7dff9a"; ctx.fillRect(bx, by + bh + 1, bw * Math.max(0, Math.min(1, 1 - (m.healCd || 0) / DRONE.healCooldown)), bh); }
      if (mech) { const m = g.save.mech, bx = (p.x + .08) * s, by = (p.y + 1.1) * s - lift, bw = s * .84, bh = Math.max(3, s * .08); // plating (silver) and boost (blue)
        ctx.fillStyle = "#0b1218cc"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh * 2 + 3); ctx.fillStyle = "#d8dee5"; ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, m.plate / MECH.plate)), bh); ctx.fillStyle = "#5fc6e0"; ctx.fillRect(bx, by + bh + 1, bw * Math.max(0, Math.min(1, m.fuel / (MECH.boost * (m.empowered ? 2 : 1)))), bh); if (m.empowered) { ctx.fillStyle = "#ff8a3d"; ctx.fillRect(bx, by + bh * 2 + 2, bw, Math.max(2, bh * .6)); } } // release 383: an ember line while empowered
      if (g.area === "overworld" && g.save.boat?.aboard && !g._seaSuit && (g.save.boat.sub || g.save.boat.mechSub) && !g._longboatFront) drawSubmersible(ctx, p.x, p.y - lift / s, s, p.facing, now, "front", g._subDive); // release 311: the window's glass and the arms
      if (g._longboatFront && g.area === "overworld" && g.save.boat?.aboard) drawLongboat(ctx, p.x, p.y - lift / s, s, p.facing, now, g.longboatSide || "right", "front"); // release 269
      // Poisoned (release 165): the Wayfarer pulses green while poison lasts.
      if (g.playerFire?.left > 0) { const t = now / 1000, cx = (p.x + .5) * s, cy = (p.y - lift / s + .55) * s; for (let i = 0; i < 6; i++) { const ph = (t * 1.6 + i / 6) % 1, fx = cx + Math.sin(i * 2.3 + t * 3) * s * .22, fh = s * (.28 + .2 * Math.sin(i + t * 9)) * (1 - ph * .5); ctx.fillStyle = i % 2 ? "rgba(255,176,42,.85)" : "rgba(255,90,26,.75)"; ctx.beginPath(); ctx.moveTo(fx - s * .07, cy - ph * s * .5); ctx.quadraticCurveTo(fx, cy - ph * s * .5 - fh, fx + s * .07, cy - ph * s * .5); ctx.fill(); } } // release 708: on fire
      if (g.save.elites?.status?.poison > 0) { const pulse = .5 + .5 * Math.sin(now / 160); ctx.fillStyle = `rgba(120,230,90,${.12 + pulse * .22})`; ctx.strokeStyle = `rgba(150,255,110,${.35 + pulse * .45})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse((p.x + .5) * s, (p.y - lift / s + .35) * s, s * (.42 + pulse * .08), s * (.55 + pulse * .08), 0, 0, 7); ctx.fill(); ctx.stroke(); }
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
  };
  // Release 631: the giant tree's dressing, sorted with the actors at the crown's foot: a broad trunk under the crown, vines
  // hanging from its rim, and a fringe of leaves overhanging the crown's edges (never over the crown itself, so whoever stands
  // there stays in view). A few dozen shapes, only while the tree is in view.
  const cn = g.area === "overworld" && g.map?.canopy?.top ? g.map.canopy : null; // release 633: only trees built tall
  if (cn) for (const tr of cn.trees || [cn]) if (Math.abs(tr.x0 + 1.5 - p.x) < w / s + 4) {
    draws.push({ y: tr.y0 - .5, inSky: true, fn: () => { drawCanopyDressing(ctx, tr, s, now, g.map.tiles, mw, cn.box); if (!tr.low) drawCanopyAboveCrown(ctx, g.map.tiles, mw, s, tr, (q, x, y) => tile(ctx, q, x, y, s, g.map.tiles, mw)); } }); // release 645: every tree of a grove; the platforms the rising trunk would cover, painted again
    const reveal = tr.low ? 1 : crownReveal(heightNow, tr.top); // the crown veil: the door tree's crown, door and rest hidden from the ground, shown as you climb
    if (reveal < 1) draws.push({ y: tr.y0 + tr.size + .6, inSky: true, fn: () => drawCrownVeil(ctx, tr, s, now, 1 - reveal, !!(g.presentation?.reduceMotion || g.presentation?.safeMode)) });
  }
  if (g.glide && g.area === "overworld") { const gl = groundLift(p.x, p.y) * s, sz = Math.max(.25, 1 - g.glide.z / 40); ctx.fillStyle = "#00000040"; ctx.beginPath(); ctx.ellipse((p.x + .5) * s, (p.y + .82) * s - gl, s * .45 * sz, s * .14 * sz, 0, 0, Math.PI * 2); ctx.fill(); } // release 635: the glide's shadow far below
  // Tim's roof report (2026-11-04: "two versions of the character... it looked like it stood at an edge"): standing on a great
  // building's or compound's roof (the tile under the feet, as movement reads it), the Wayfarer is drawn once, after the roofs,
  // lifted to the roof's drawn height; never in this pass, where the roof drawn later covered it.
  const roofUnder = standingOnRoof(g, mw);
  if(captureDrone){
    const source=g.droneAt,clock=g.paused&&Number.isFinite(g.pauseStarted)?g.pauseStarted:now,quiet=!!(g.presentation?.reduceMotion||g.presentation?.safeMode),carry=!!g.mechBoosting;
    const x=carry?p.x:source.x,y=carry?p.y:source.y,rawY=y-(carry?.97:0),lift=(playerDraw.lift||0)+(playerDraw.jumpLift||0),sample=()=>{const a=playerDroneVisualAnchor(p,source,{carrying:carry,lift,now:clock,quiet});return a?{kind:'corridorDrone',x:a.x,y:a.y,supportX:p.x+.5,supportY:p.y+.75,lift:a.z,pose:'idle',phase:0,pace:0,amount:0,carrying:carry,yaw:a.yaw}:null;};
    draws.push({x,y,lift,nativeSupportX:p.x+.5,nativeSupportY:p.y+.75,nativeHeight:2.1,nativeAux:{source,sample},nativeEffects:g.droneHealFx>0,
      nativeFloor:()=>{ctx.fillStyle='#00000033';ctx.beginPath();ctx.ellipse((x+.5)*s,(y+.82)*s,s*.34*1.1,s*.34*.3,0,0,7);ctx.fill();},
      fn:()=>drawDrone(ctx,x,rawY,s,p.facing,quiet?0:clock,carry,g.droneHealFx||0),
      nativeDecorations:()=>drawDrone(ctx,x,rawY,s,p.facing,quiet?0:clock,carry,g.droneHealFx||0,true)});
  }
  if (!roofUnder || worldCapture) draws.push(playerDraw);
  { const fz = g.area === "overworld" ? g.droneFizzleFx : null; if (fz && now < fz.until && visibleInCamera(fz, l, t, r, b, 4)) { const under = tileUnder(g.map, mw, fz.x, fz.y); draws.push({ y: fz.y + .01, x: fz.x, lift: (fz.levels || 0) * LIFT_PER_LEVEL * tileLiftScale(under), inSky: true, fn: () => drawDroneFizzle(ctx, fz, s, now, !!(g.presentation?.reduceMotion || g.presentation?.safeMode)) }); } } // the drone fizzle
  if (closeViewCapturing()) closeViewTake(draws.splice(0), playerDraw); // CLOSE VIEW (2/3): the actors become billboards
  draws.sort((a, b) => a.y - b.y);
  for (const d of draws) {
    const raise = (Number.isFinite(d.x) ? groundLift(d.x, d === playerDraw ? p.y : d.y) : 0) + (d.lift || 0);
    // Release 635: high above, what stands on the ground fades with it into the sky; the Wayfarer, the great tree and what is on it stay.
    if (skyA > 0 && d !== playerDraw && !d.inSky && !(Number.isFinite(d.x) && tileUnder(g.map, mw, d.x, d.y)?.canopy)) { if (skyA >= .98) continue; ctx.save(); if (raise) ctx.translate(0, -raise * s); ctx.globalAlpha = (d.alpha ?? 1) * (1 - skyA); d.fn(); ctx.restore(); continue; }
    if (raise || (d.alpha ?? 1) < 1) { ctx.save(); if (raise) ctx.translate(0, -raise * s); if ((d.alpha ?? 1) < 1) ctx.globalAlpha = d.alpha; d.fn(); ctx.restore(); } else d.fn(); // release 615: a beneath-the-level rider is a dim shape
  }
  for (const o of g.map.objects) if (o.sigil && !o.unsealed && visibleInCamera(o, l, t, r, b) && seenInDungeon(g, o)) drawSigilMark(ctx, o, s, now); // the Pentagon's sigil doors, still sealed
  for (const o of g.map.objects) if (o.pentagonDoor && o.barred && !o.opened && visibleInCamera(o, l, t, r, b)) drawBars(ctx, o, s); // v6: an exterior shortcut door, bolted from within
  if (g.area === "dungeon" && (g.map.murals || g.map.sigils)) drawHallMarks(ctx, g.map, s, l, t, r, b); // release 795: murals carved in a grand hall's walls, the Watcher's sigil over doors, on banners and columns
  if (g.area === "dungeon" && !closeViewCapturing()) drawCloseViewLightsStd(ctx, g, s, now, l, t, r, b); // the sconces and candles Close View places in an interior, in this view too (close-view.ts)
  if (g.shortcutBurst) drawShortcutBurst(ctx, g, s, now); // a shortcut just opened
  // Release 573: behind a giant tree the Wayfarer shows through, faint.
  if (!worldCapture && g.area === "overworld" && (g.map.objects.some((o) => o.vegetationForm === "giant" && o.state === "standing" && giantTreeHides(o, p)) || (cn && (cn.trees || [cn]).some((tr) => p.y < tr.y0 && Math.abs(p.x + .5 - (tr.x0 + tr.size / 2)) < tr.size / 2 + 1.2)))) { // 633: or behind the great tree's trunk
    const raise = groundLift(p.x, p.y) + (playerDraw.lift || 0); ctx.save(); ctx.globalAlpha = GIANT_TREE.ghost; if (raise) ctx.translate(0, -raise * s); playerDraw.fn(); ctx.restore();
  }
  // Under water (W5): a blue-green wash with slow light shafts.
  if (g.map?.underwater) {
    ctx.fillStyle = "rgba(20,70,110,.28)"; ctx.fillRect(l * s, t * s, (r - l) * s, (b - t) * s);
    for (let i = 0; i < 4; i++) { const x0 = (l + ((i * 7 + now / 900) % (r - l + 6)) - 3) * s; ctx.fillStyle = "rgba(200,240,255,.06)"; ctx.beginPath(); ctx.moveTo(x0, t * s); ctx.lineTo(x0 + s * 1.5, t * s); ctx.lineTo(x0 + s * 4, b * s); ctx.lineTo(x0 + s * 2, b * s); ctx.fill(); }
  }
  // Stormkraken ink (W4): the sea goes dark beyond a small circle around the Wayfarer.
  if (g.area === "overworld" && (g.seaHazards?.fog?.length || g.novaFog)) {
    // Fog banks (release 156; release 158 smooths them): each bank is a cluster of soft puffs turning slowly about its
    // centre. Inside a bank the mist closes in around the Wayfarer gradually (fogLevel is eased in open-sea.ts).
    // Release 257: a Supernova's fog (g.novaFog) draws the same way, faded in and out by its alpha.
    const level = g.seaHazards?.fogLevel || 0, time = now / 1000; // release 407 (Tim: "the Supernova... covers the entire world, so I can't see him... the Supernova shouldn't cover the Void Walker or other creatures"): its fog no longer closes in around the Wayfarer, and its mist is thin
    for (const [f, fade] of [...(g.seaHazards?.fog || []).map((f) => [f, 1]), ...(g.novaFog?.fog || []).map((f) => [{ ...f, nova: true }, g.novaFog.alpha ?? 1])]) {
      if (fade <= 0) continue;
      for (let i = 0; i < 7; i++) {
        const a = (f.swirl || 0) + i * 2.399 + Math.sin(time * .2 + i) * .15, d = f.radius * (.15 + .55 * ((i * 37) % 10) / 10), pr = f.radius * (.45 + .1 * Math.sin(time * .3 + i * 1.7));
        const x = (f.x + Math.cos(a) * d) * s, y = (f.y + Math.sin(a) * d) * s, gr = ctx.createRadialGradient(x, y, 0, x, y, pr * s);
        gr.addColorStop(0, `rgba(222,231,236,${(f.nova ? .1 : .22) * fade * (1 - level * .5)})`); gr.addColorStop(1, "rgba(222,231,236,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, pr * s, 0, 7); ctx.fill();
      }
    }
    if (level > .01) {
      const px = (p.x + .5) * s, py = (p.y + .6) * s, gr = ctx.createRadialGradient(px, py, s * (1.4 + (1 - level) * 3), px, py, s * (3.6 + (1 - level) * 7));
      gr.addColorStop(0, "rgba(207,217,223,0)"); gr.addColorStop(1, `rgba(207,217,223,${.92 * level})`); ctx.fillStyle = gr; ctx.fillRect(px - w, py - h, w * 2, h * 2);
    }
    // Release 269 (Tim: "in fog it should cast a... violet glow"): the longboat's lantern lights the mist around it,
    // more strongly the deeper the fog.
    if (g._longboatFront && g.save.boat?.aboard) {
      const dir = g.longboatSide === "left" ? -1 : 1, lx = (p.x + .5) * s + dir * s * 1.0, ly = (p.y + .6) * s - s * .34, pulse = .9 + Math.sin(now / 1300) * .1, k = (.4 + .55 * level) * pulse;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, s * 3.6); lg.addColorStop(0, `rgba(205,70,255,${Math.min(1, 1.1 * k)})`); lg.addColorStop(.25, `rgba(165,40,245,${.65 * k})`); lg.addColorStop(.6, `rgba(130,25,215,${.28 * k})`); lg.addColorStop(1, "rgba(110,20,190,0)");
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, s * 3.6, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = "source-over"; const tint = ctx.createRadialGradient(lx, ly, 0, lx, ly, s * 2.4); tint.addColorStop(0, `rgba(150,40,230,${.28 * k})`); tint.addColorStop(1, "rgba(150,40,230,0)"); ctx.fillStyle = tint; ctx.beginPath(); ctx.arc(lx, ly, s * 2.4, 0, 7); ctx.fill(); ctx.restore(); // the mist itself takes the colour
    }
  }
  if (g.area === "overworld" && g.storm) { ctx.fillStyle = `rgba(16,24,38,${.28 * g.storm.strength})`; ctx.fillRect((p.x + .5) * s - w, (p.y + .6) * s - h, w * 2, h * 2); }
  if (g.area === "overworld" && now < (g.inkUntil || 0)) {
    const fade = Math.min(1, (g.inkUntil - now) / 600), px = (p.x + .5) * s, py = (p.y + .6) * s, grad = ctx.createRadialGradient(px, py, s * 1.4, px, py, s * 4.5);
    grad.addColorStop(0, "rgba(6,10,18,0)"); grad.addColorStop(1, `rgba(6,10,18,${.92 * fade})`);
    ctx.fillStyle = grad; ctx.fillRect(l * s, t * s, (r - l) * s, (b - t) * s);
  }
  { // The Gloomvast's Dark (haunts.ts GLOOM_FINALE): the view darkened to a small light round the Wayfarer (one cached mask), then
    // its cold lights (decoys and itself, alike) and their warnings over the dark
    const dark = g.gloomDarkness?.(), veiled = dark ? g.enemies.filter((e) => e.gloomVeil && !e.dead && visibleInCamera(e, l, t, r, b, 3)) : [] /* only while a Dark shows */, quiet = !!(g.presentation?.reduceMotion || g.presentation?.safeMode);
    if (dark) { const vx = p.x * s - w / 2 - 2, vy = (p.y - viewLift) * s - h / 2 - 2; drawGloomDark(ctx, (p.x + .5) * s, (p.y + .6 - viewLift) * s, s, { x0: vx, y0: vy, x1: vx + w + 4, y1: vy + h + 4 }, dark, { low: budget.quality === "low", reduceMotion: quiet, now }); }
    if (veiled.length) { drawPackTelegraphs(ctx, veiled, s, now, () => true, { ground: groundLift, reduceMotion: quiet }); drawGloomVeiled(ctx, veiled, s, now, { low: budget.quality === "low", reduceMotion: quiet }); }
  }
  for (const e of g.enemies)
    if (!e.dead && shownInDungeon(g,e) && !e.ambient && !e.hidden && !e.aloft && !e.gloomVeil && visibleInCamera(e,l,t,r,b,e.kind === "psychicCrystal" || e.kind === "lightningGiant" ? 5 : 2)) {
      const barY = e.kind === "stalker" ? e.y - .1 - Math.max(0, (Number(e.scale) || 1) - 1) * .75 - (Number(e.stalkLift) || 0) : e.packKind ? e.y - 0.1 - Math.max(0, (Number(e.scale) || 1) - 1) * 0.75 - (e.flying ? 0.35 : 0) - (e.kind === "psychicCrystal" ? crystalLift(e) : 0) : e.y - 0.1;
      ctx.fillStyle = "#211617";
      ctx.fillRect(e.x * s, barY * s, s, 3);
      ctx.fillStyle = "#9b4d50";
      ctx.fillRect(e.x * s, barY * s, (s * e.hp) / e.maxHp, 3);
    }
  drawEchoPatches(ctx,g,s,now);
  drawGlyphStatus(ctx,g,s,now,(e)=>shownInDungeon(g,e)&&visibleInCamera(e,l,t,r,b,2),bareFloor);
  if(g.damageNumbers)drawDamageNumbers(ctx,g,s,now); // release 461
  { const m=g.aimMark; if(m&&now<m.until){const e=g.enemies.find(q=>q.id===m.id&&!q.dead&&shownInDungeon(g,q)&&!q.gloomVeil/* never gives the Gloomvast away in its Dark */);if(e){const k=(m.until-now)/450,cx=(e.x+.5)*s,cy=(e.y+.45)*s,r=s*(.5+Math.max(0,Number(e.bodyRadius)||0)*.6+(1-k)*.12),a=r*.45;ctx.save();ctx.globalAlpha=Math.min(1,k*1.6);ctx.strokeStyle="#fff1c8";ctx.lineWidth=Math.max(2,s*.07);ctx.beginPath();for(const[sx,sy]of[[-1,-1],[1,-1],[1,1],[-1,1]]){ctx.moveTo(cx+sx*r,cy+sy*r-sy*a);ctx.lineTo(cx+sx*r,cy+sy*r);ctx.lineTo(cx+sx*r-sx*a,cy+sy*r)}ctx.stroke();ctx.restore()}}} // release 469: where the swing went
  if(skyA<.98){if(skyA>0){ctx.save();ctx.globalAlpha=1-skyA} // release 635: roofs far below fade into the sky
  for(const o of objectLists.structures)if(renderableObject(g,o)&&seenInDungeon(g,o)&&visibleInCamera(o,l,t,r,b,o.kind==="greatBuilding"?16:2)){const drawStructure=o.kind==="shack"?shack:o.kind==="greatBuilding"?(o.blocks?greatBlocks:greatBuilding):architecturalBuilding;
    // Object records outlive consumed building tiles. Clip roofs/facades to their surviving footprint
    // so they cannot visually restore destroyed walls or expose unexplored building geometry.
    const bounds = o.bounds || { x:o.x-2, y:o.y-2, w:5, h:4 };
    const cells = o.footprint?.length ? o.footprint : Array.from({length:Math.max(0,bounds.w*bounds.h)},(_,i)=>({x:bounds.x+i%bounds.w,y:bounds.y+Math.floor(i/bounds.w)}));
    let surviving = 0;
    for(const c of cells)if(g.map.tiles[c.y*mw+c.x]?.kind!=="voidScar"&&seenInDungeon(g,c))surviving++;
    if(!surviving)continue;
    ctx.save();
    if(surviving!==cells.length){
      ctx.beginPath();
      for(const c of cells)if(g.map.tiles[c.y*mw+c.x]?.kind!=="voidScar"&&seenInDungeon(g,c))ctx.rect(c.x*s,c.y*s,s,s);
      ctx.clip();
    }
    drawStructure(ctx,o,s,p,g.map.tiles,{l,t,r,b});
    ctx.restore();
  }
  if(skyA>0)ctx.restore()}
  const frontShelter=objectLists.shelters.find(o=>!worldCapture&&!roofUnder&&renderableObject(g,o)&&seenInDungeon(g,o)&&p.x>=o.bounds.x-.6&&p.x<=o.bounds.x+o.bounds.w-.4&&p.y>=o.bounds.y+o.bounds.h-1&&p.y<=o.bounds.y+o.bounds.h+1.35);
  // roof report 2026-11-04: not from a roof's front row (it drew a second Wayfarer on the ground below), and at the ground's own height
  const shelterRaise=frontShelter?groundLift(p.x,p.y):0;if(shelterRaise){ctx.save();ctx.translate(0,-shelterRaise*s)}
  if(frontShelter)actor(ctx,p.x,p.y-lift/s,s,"player",p.facing,Math.floor(p.walkPhase||0),now<(p.attackUntil||0)?"attack":"walk",false,g.save.magicSkills?.active?.id==='ember-form'?1.25+.05*(g.save.magicSkills.active.rank||1):1);
  if(shelterRaise)ctx.restore();
  if(roofUnder){ // roof report 2026-11-04: on a roof, the Wayfarer stands over it, at the roof's height (the one draw), and the roof's lethal edges near them are marked over it
    drawTraversalCues(ctx,g.map,mw,p,s,now,null,(x,y)=>g.map.tiles[y*mw+x]?.structure==="buildingRoof");
    if (!worldCapture) { const raise=groundLift(p.x,p.y)+(playerDraw.lift||0);ctx.save();if(raise)ctx.translate(0,-raise*s);playerDraw.fn();ctx.restore(); } }
  else if(!worldCapture&&g.area==="overworld"&&g.map?.greatBuilding&&behindRoof(g.map.tiles,mw,p)){ // roof report 2026-11-04: walking behind a building's facade, a faint Wayfarer shows through it
    const raise=groundLift(p.x,p.y)+(playerDraw.lift||0);ctx.save();ctx.globalAlpha=GIANT_TREE.ghost;if(raise)ctx.translate(0,-raise*s);playerDraw.fn();ctx.restore(); }
  const motion = now / 1000;
  for (const o of objectLists.animated)
    if (renderableObject(g,o)&&seenInDungeon(g,o)&&visibleInCamera(o,l,t,r,b)) {
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
  if (!closeViewCapturing() && lanternShines(g.save, g.area)) drawLanternGlow(ctx, (p.x + .5) * s, (p.y + .55 - viewLift) * s, s); // LANTERN: its warm light on the floor (under the fog of war)
  if (g.area === "dungeon") drawLabFog(ctx, g, s, { l, t, r, b }, budget.quality); // LAB_FOG: a labyrinth chamber's fog of war, over everything on its floor
  if (g.area === "dungeon") drawWayMarks(ctx, g, s, now); // which way is down and which is out, plainly marked
  ctx.restore();
  if (closeViewCapturing()) return; // CLOSE VIEW (3/3): the ground texture is done; the screen overlays are Close View's own
  // Release 661 (Tim: "something on the heads up display that just shows the different levels... on the right side... little
  // dots... pretty unobtrusive"): in a dungeon of several floors, a column of dots at the right edge, the top one the first floor:
  // the floor you stand on lit and ringed, floors you have found dim, the rest faint.
  if (g.area === "dungeon" && g.map?.deepFloor) { const x = w - 16, y = h / 2, e = Math.min(6, g.save?.theDeep?.embers || 0); ctx.save(); // the Deep: its floor as a number in a purple badge, the Return Embers as dots under it (Tim: "an easy to identify number or... dots")
    ctx.fillStyle = "#2a1f38d0"; ctx.strokeStyle = "#c9a6ffaa"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#efe0ff"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(String(g.map.deepFloor), x, y + 4);
    for (let i = 0; i < e; i++) { ctx.fillStyle = "#ffb35a"; ctx.beginPath(); ctx.arc(x - (e - 1) * 3.5 + i * 7, y + 19, 2.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); } // release 725: was the words "THE DEEP · FLOOR n" and the ember count
  if (g.area === "dungeon" && g.map?.annexFloor && !g.map.multiLevel) { const A = g.map.annexFloor, gap = 14, x = w - 12, y0 = h / 2 - (A.of - 1) * gap / 2; // release 675: a deep annex's floors
    ctx.save(); ctx.strokeStyle = "#ffffff26"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + (A.of - 1) * gap); ctx.stroke();
    for (let i = 0; i < A.of; i++) { const y = y0 + i * gap, here = i + 1 === A.floor; ctx.fillStyle = here ? "#ffe7a6" : i + 1 < A.floor ? "#c9c2b0aa" : "#ffffff30"; ctx.beginPath(); ctx.arc(x, y, here ? 4 : 3, 0, Math.PI * 2); ctx.fill(); if (here) { ctx.strokeStyle = "#ffe7a6aa"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke(); } }
    ctx.restore(); }
  if (g.area === "dungeon" && g.map?.multiLevel && (g.map.levels?.length || 0) > 1) { const L = g.map.levels, found = g.save?.consequences?.dungeons?.[g.areaId?.()]?.deep?.discoveredLevelIds || [], gap = 14, x = w - 12, y0 = h / 2 - (L.length - 1) * gap / 2;
    ctx.save(); ctx.strokeStyle = "#ffffff26"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + (L.length - 1) * gap); ctx.stroke();
    L.forEach((lv, i) => { const y = y0 + i * gap, here = lv.id === g.map.levelId, seen = here || i === 0 || found.includes(lv.id); ctx.fillStyle = here ? "#ffe7a6" : seen ? "#c9c2b0aa" : "#ffffff30"; ctx.beginPath(); ctx.arc(x, y, here ? 4 : 3, 0, Math.PI * 2); ctx.fill(); if (here) { ctx.strokeStyle = "#ffe7a6aa"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke(); } });
    ctx.restore(); }
  drawStalkerMarker(ctx, g.stalkerMarker?.(), w, h, now); // release 678: the Stalker's silver marker at the screen edge
  // Release 666: the fracture meter, top centre while Fractured mode holds here: kills toward the Fracture Warden, then its health.
  { const m = g.fractureMeter?.(); if (m) { const bw = Math.min(180, w * .4), bx = (w - bw) / 2, by = 8, warden = m.warden, k = warden ? Math.max(0, warden.hp) / Math.max(1, warden.maxHp) : m.kills / Math.max(1, m.need);
    ctx.save(); ctx.fillStyle = "#0a0610b0"; ctx.fillRect(bx - 2, by - 2, bw + 4, 10); ctx.fillStyle = warden ? "#ff4a7a" : m.kills >= m.need ? `rgba(255,120,170,${.6 + .4 * Math.sin(now / 120)})` : "#c06aff"; ctx.fillRect(bx, by, bw * Math.min(1, k), 6);
    ctx.strokeStyle = "#ffffff40"; ctx.lineWidth = 1; ctx.strokeRect(bx - .5, by - .5, bw + 1, 7); ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#f2e6ff"; ctx.strokeStyle = "#000c"; ctx.lineWidth = 3;
    const label = warden ? "FRACTURE WARDEN" : m.kills >= m.need ? "THE FRACTURE TEARS" : `FRACTURE ${m.kills}/${m.need}`; ctx.strokeText(label, w / 2, by + 19); ctx.fillText(label, w / 2, by + 19); ctx.restore(); } }
  const lanternLit = lanternShines(g.save, g.area), lanternX = w / 2 + .5 * s, lanternY = h / 2 + .55 * s; // LANTERN: where its light lifts the screen's dark
  if (g.area === "dungeon" && g.map?.chasm && lanternLit) drawLanternDark(ctx, w, h, s, lanternLit, lanternX, lanternY, drawChasmPenumbra, s); // LANTERN: the penumbra below, drawn through the Lantern's layer
  else if (g.area === "dungeon" && g.map?.chasm) { const P = CHASM_STARS.penumbra, cx = w / 2, cy = h / 2, gr = ctx.createRadialGradient(cx, cy, s * P.inner, cx, cy, s * P.outer); gr.addColorStop(0, "rgba(4,3,14,0)"); gr.addColorStop(1, `rgba(4,3,14,${P.dark})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); } // release 593: the penumbra
  if (budget.weather && SEASON && !g.map.weather && SEASONS.weather[SEASON]) { // release 679: the season's weather in the woods (light: a few motes)
    const kind = SEASONS.weather[SEASON], count = budget.quality === "full" ? 18 : 9;
    for (let i = 0; i < count; i++) { const f = (motion * (.05 + (i % 4) * .012) + i * .29) % 1, x = ((i * 127 + g.rx * 37 + Math.sin(motion * .7 + i) * 26) % w + w) % w, y = f * (h + 20) - 10;
      if (kind === "snow") { ctx.fillStyle = "#f4f8fbcc"; ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * .55, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = kind === "leaves" ? ["#c4562acc", "#d68a2acc", "#8a4a24cc", "#efb54acc"][i % 4] : ["#f6c8dccc", "#fff2f6cc", "#f0a8c8cc"][i % 3]; ctx.beginPath(); ctx.ellipse(x, y, kind === "leaves" ? 3.2 : 2.6, 1.4, motion * 1.4 + i, 0, 7); ctx.fill(); } }
    if (SEASON === "winter") { ctx.fillStyle = "#dfe8f014"; ctx.fillRect(0, 0, w, h); }
  }
  const t2 = timed ? performance.now() : 0;
  // Dungeons with their own weather (Underlands themes) show it too: snow in a cave, sparks rising from a lava bog.
  if(!budget.weather&&g.area==="dungeon"&&g.map.weather&&budget.quality!=="low"&&g.presentation?.weather!==false)budget.weather=true;
  if(budget.weather&&g.map.weather==="rain"){
    const count=budget.quality==="full"?34:18;ctx.strokeStyle="#9ec8d04d";ctx.lineWidth=1.4;ctx.beginPath();for(let i=0;i<count;i++){const x=((i*83+motion*210+g.rx*41)%(w+80))-40,y=((i*47+motion*330+g.ry*59)%(h+90))-45;ctx.moveTo(x,y);ctx.lineTo(x-8,y+19)}ctx.stroke();ctx.fillStyle="#1d3b4730";ctx.fillRect(0,0,w,h);
  }else if(budget.weather&&g.map.weather==="snow"){
    const count=budget.quality==="full"?28:14;ctx.fillStyle="#dae2d78c";for(let i=0;i<count;i++){const x=((i*97+motion*(12+i%4)*3+g.rx*29)%(w+30))-15,y=((i*61+motion*(25+i%5)*4+g.ry*37)%(h+30))-15;ctx.beginPath();ctx.arc(x,y,1+(i%3)*.55,0,7);ctx.fill()}
  }else if(budget.weather&&g.map.weather==="embers"){
    const count=budget.quality==="full"?26:14;for(let i=0;i<count;i++){const x=((i*79+Math.sin(motion+i)*20)%(w+20)+w)%(w+20)-10,y=h-((i*53+motion*(30+i%5*9))%(h+20));ctx.fillStyle=i%3?"#ff8a3acc":"#ffd06acc";ctx.fillRect(x,y,2,2)}ctx.fillStyle="#3a120614";ctx.fillRect(0,0,w,h);
  }else if(budget.weather&&g.map.weather==="drip"){
    const count=budget.quality==="full"?16:8;ctx.strokeStyle="#9ec8d066";ctx.lineWidth=1.2;ctx.beginPath();for(let i=0;i<count;i++){const x=(i*131)%w,y=((i*67+motion*260)%(h+40))-20;ctx.moveTo(x,y);ctx.lineTo(x,y+7)}ctx.stroke();
  }else if(budget.weather&&g.map.weather==="spores"){
    const count=budget.quality==="full"?30:16;for(let i=0;i<count;i++){const x=((i*97+Math.sin(motion*.6+i)*30)%w+w)%w,y=((i*61+Math.cos(motion*.4+i)*30+motion*6)%h+h)%h;ctx.fillStyle=i%2?"#a6ffdc88":"#d9b8ff88";ctx.beginPath();ctx.arc(x,y,1.2+(i%3)*.5,0,7);ctx.fill()}
  }else if(budget.weather&&g.map.weather==="petals"){ // release 305: the Far Sleep, pale petals drifting down a violet dusk
    const count=budget.quality==="full"?22:11;for(let i=0;i<count;i++){const f=(motion*(.05+(i%4)*.012)+i*.29)%1,x=((i*127+g.rx*37+Math.sin(motion*.7+i)*26)%w+w)%w,y=f*(h+20)-10,a=motion*1.4+i;ctx.fillStyle=["#f6e6ffcc","#ffe9b8cc","#d8f4ffcc","#ffd6eccc"][i%4];ctx.beginPath();ctx.ellipse(x,y,3,1.4,a,0,7);ctx.fill()}ctx.fillStyle="#3a2c6a1c";ctx.fillRect(0,0,w,h);
  }else if(budget.weather&&g.map.weather==="glints"){ // release 299: Geode Hollow, light catching on crystal dust
    const count=budget.quality==="full"?22:10;for(let i=0;i<count;i++){const p=Math.sin(motion*1.7+i*2.3);if(p<.55)continue;const x=(i*113+g.rx*29)%w,y=((i*71+motion*4)%h+h)%h,k=(p-.55)*9;ctx.fillStyle=i%2?"#f2e8ffcc":"#c7a8ffcc";ctx.fillRect(x-k,y-.6,k*2,1.2);ctx.fillRect(x-.6,y-k,1.2,k*2)}ctx.fillStyle="#2a1a4414";ctx.fillRect(0,0,w,h);
  }else if(budget.weather&&g.map.weather==="steam"){ // release 299: Brass Engine, steam rising from the pipes
    const count=budget.quality==="full"?12:6;for(let i=0;i<count;i++){const f=(motion*.18+i*.37)%1,x=(i*149+g.rx*31)%w+Math.sin(motion+i)*12,y=h*(1-f)-(i*53)%(h*.3);ctx.fillStyle=`rgba(220,214,200,${.16*(1-f)})`;ctx.beginPath();ctx.arc(x,y,10+f*26,0,7);ctx.fill()}ctx.fillStyle="#3a2a1210";ctx.fillRect(0,0,w,h);
  }else if(budget.weather&&g.map.weather==="fog"){ // release 617: fog moors, slow grey banks drifting across
    const count=budget.quality==="full"?7:4;for(let i=0;i<count;i++){const x=((i*211+motion*(9+i*3))%(w+400))-200,y=((i*137+g.ry*53)%(h+120))-60+Math.sin(motion*.3+i)*20,r=160+(i%3)*70,f=ctx.createRadialGradient(x,y,0,x,y,r);f.addColorStop(0,"rgba(205,214,212,.22)");f.addColorStop(1,"rgba(205,214,212,0)");ctx.fillStyle=f;ctx.fillRect(x-r,y-r,r*2,r*2)}
  }else if(budget.weather&&g.map.weather==="sunbreak"){
    const glow=ctx.createLinearGradient(0,0,w*.8,h);glow.addColorStop(0,"#e7c87324");glow.addColorStop(.45,"#d8ad5220");glow.addColorStop(.7,"#0000");ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  }
  ctx.fillStyle = "#d8c9aa55";
  for (let i = 0; i < budget.ambientMotes; i++) {
    const phase = motion * (8 + (i % 4) * 2) + i * 97 + g.rx * 31 + g.ry * 17,
      x = ((phase * 3.1) % (w + 80)) - 40,
      y = ((i * 73 + Math.sin(phase * 0.07) * 45) % (h + 60)) - 30;
    ctx.fillRect(x, y, i % 3 === 0 ? 3 : 2, 1);
  }
  if (g.area === "dungeon" && g.map?.building?.dread) drawLanternDark(ctx, w, h, s, lanternLit, lanternX, lanternY, drawDread, g.map.building.dread); // the Pentagon's dread (v2), the Lantern's light through it
  if (!drawScreenOverlay(ctx, w, h)) {
    ctx.fillStyle = "#5c4a3b0c";
    ctx.fillRect(0, 0, w, h);
    const priorVignette = render.vignette,
      v = priorVignette?.ctx === ctx && priorVignette.w === w && priorVignette.h === h
        ? priorVignette.gradient
        : ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.26,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.7,
    );
    if (v !== priorVignette?.gradient) {
      v.addColorStop(0, "#0000");
      v.addColorStop(1, "#080a0870");
      render.vignette = { ctx, w, h, gradient: v };
    }
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  // Area label, plus the player's height wherever the map has levels (operator ask 2026-10-14).
  ctx.font = "12px monospace";
  const place = g.area === "overworld" ? `SECTION ${g.rx},${g.ry}` : g.map.name.toUpperCase(),
    hasLevels = g.map?.landscape && (g.map._hasLevels ??= g.map.tiles.some((q) => (q.elev || 0) > 0)),
    label = hasLevels ? `${place} · ${levelName(elevationAt(g.map, mw, g.player.x, g.player.y))}` : place;
  ctx.fillStyle = "#151411ee";
  // Sits just beneath Map and Pack (release 183), aligned with them, never wider than the space before the next control.
  const labelY = h - (g.labelInset ?? 122), labelX = g.labelX ?? 8,
    boxW = Math.min(Math.max(150, ctx.measureText(label).width + 20), g.labelMaxWidth ?? Infinity);
  ctx.fillRect(labelX, labelY, boxW, 24);
  ctx.fillStyle = "#cec7b6";
  ctx.fillText(label, labelX + 8, labelY + 16, boxW - 16);
  if (g.area === "dungeon") drawWayDownPointer(ctx, g, w, h, s, p, viewLift, now); // off the screen, a chevron at the edge toward the way down
  if (timed) { const t3 = performance.now(); renderTimings.ground = t1 - t0; renderTimings.world = t2 - t1; renderTimings.overlay = t3 - t2; }
}

// LAB_FOG (labyrinths.ts): a labyrinth chamber's fog of war. The fog is a tiny image, one pixel a tile (the dark over tiles never
// seen, the dim over tiles seen and out of sight, clear in sight), painted in runs of a row and redrawn only when the sight
// changes (the Wayfarer steps onto another tile); each frame it is one scaled copy, blurred across a tile's width on the
// balanced and full tiers, crisp on low. Nothing moves in it, so reduced motion and safe mode need nothing else. Without an
// offscreen canvas (tests, old browsers) the runs on screen are filled straight onto the view, at most one per run of a row.
const labFogImage = { canvas: null, map: null, stamp: 0, w: 0, h: 0 };
const LAB_FOG_FILL = [`rgba(${LAB_FOG.rgb},${LAB_FOG.dark})`, `rgba(${LAB_FOG.rgb},${LAB_FOG.dim})`];
function paintLabFog(c, F, x0, x1, y0, y1, k) {
  let runs = 0;
  for (let state = 0; state < 2; state++) { c.fillStyle = LAB_FOG_FILL[state];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1;) { if (labFogAt(F, x, y) !== state) { x++; continue; } let e = x + 1; while (e < x1 && labFogAt(F, e, y) === state) e++; c.fillRect(x * k, y * k, (e - x) * k, k); runs++; x = e; } }
  return runs;
}
export function drawLabFog(ctx, g, s, view, quality) {
  const F = labFogOf(g.map); if (!F) return false;
  const I = labFogImage, c = typeof ctx.drawImage === "function" ? I.canvas || (I.canvas = makeGroundCanvas()) : null, gc = c?.getContext?.("2d");
  if (gc) {
    if (I.map !== g.map || I.stamp !== F.stamp || I.w !== F.W || I.h !== F.H) {
      if (c.width !== F.W || c.height !== F.H) { c.width = F.W; c.height = F.H; }
      gc.clearRect(0, 0, F.W, F.H); paintLabFog(gc, F, 0, F.W, 0, F.H, 1);
      Object.assign(I, { map: g.map, stamp: F.stamp, w: F.W, h: F.H }); renderCacheStats.labFogBuilds = (renderCacheStats.labFogBuilds || 0) + 1; }
    ctx.save(); ctx.imageSmoothingEnabled = LAB_FOG.soft[quality] !== false; ctx.drawImage(c, 0, 0, F.W, F.H, 0, 0, F.W * s, F.H * s); ctx.restore();
  } else renderCacheStats.labFogRuns = paintLabFog(ctx, F, Math.max(0, view.l), Math.min(F.W, view.r), Math.max(0, view.t), Math.min(F.H, view.b), s);
  renderCacheStats.labFogDraws = (renderCacheStats.labFogDraws || 0) + 1;
  return true;
}
// ROOM_VIEW (labyrinths.ts roomViewBelow): on a room maze's upper floor or roof, the void over a barrier shows the floor below it,
// dim. One image a tile a pixel, painted only for void tiles in sight (LAB_FOG), rebuilt only when the sight changes (the fog's
// stamp) or the map does; each frame it is one scaled copy. Without an offscreen canvas (tests) the void tiles in view are
// filled straight onto the view (bounded by the barrier columns in view).
const roomViewImage = { canvas: null, map: null, stamp: -1 };
function paintRoomView(c, V, F, x0, x1, y0, y1, k) {
  let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = y * V.W + x, code = V.codes[i]; if (!code || (F && !F.sight[i])) continue; c.fillStyle = ROOM_VIEW.colors[code]; c.fillRect(x * k, y * k, k, k); n++; }
  return n;
}
export function drawRoomViewBelow(ctx, g, s, view) {
  const V = roomViewBelow(g.map); if (!V) return false; const F = labFogOf(g.map), I = roomViewImage;
  const c = typeof ctx.drawImage === "function" ? I.canvas || (I.canvas = makeGroundCanvas()) : null, gc = c?.getContext?.("2d");
  ctx.save(); ctx.globalAlpha = ROOM_VIEW.alpha;
  if (gc) {
    const stamp = F ? F.stamp : 0;
    if (I.map !== g.map || I.stamp !== stamp) { if (c.width !== V.W || c.height !== V.H) { c.width = V.W; c.height = V.H; } gc.clearRect(0, 0, V.W, V.H); paintRoomView(gc, V, F, 0, V.W, 0, V.H, 1); I.map = g.map; I.stamp = stamp; renderCacheStats.roomViewBuilds = (renderCacheStats.roomViewBuilds || 0) + 1; }
    ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, V.W, V.H, 0, 0, V.W * s, V.H * s);
  } else renderCacheStats.roomViewTiles = paintRoomView(ctx, V, F, Math.max(0, Math.floor(view.l)), Math.min(V.W, Math.ceil(view.r)), Math.max(0, Math.floor(view.t)), Math.min(V.H, Math.ceil(view.b)), s);
  ctx.restore(); renderCacheStats.roomViewDraws = (renderCacheStats.roomViewDraws || 0) + 1; return true;
}
// Unexplored dungeon space: dark slate with a faint diagonal hatch, distinct from the indigo depth of a chasm.
function fogTile(ctx, x, y, s) {
  ctx.fillStyle = "#0b0e11"; ctx.fillRect(x * s, y * s, s + .5, s + .5);
  ctx.strokeStyle = "#161c22"; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = -1; k < 3; k++) { const o = k * s / 2 + ((x + y) % 2) * s / 4; ctx.moveTo(x * s + o, y * s + s); ctx.lineTo(x * s + o + s / 2, y * s); }
  ctx.stroke();
}

// Glyph statuses and strikes (release 98): flames on burning foes, a teal ring on slowed ones, frost on frozen ones,
// plus chain arcs and burst rings from glyphVisuals.
// Release 461: damage numbers, rising and fading: gold for what you deal, red for what you take.
function drawDamageNumbers(ctx,g,s,now){const list=g.damageFloaters;if(!list?.length)return;ctx.save();ctx.textAlign="center";ctx.lineJoin="round";
  for(const f of list){const k=Math.min(1,Math.max(0,(now-f.born)/900));if(k>=1)continue;const taken=f.kind==="taken",size=Math.max(11,Math.round(s*(taken?.36:.32))),x=(f.x+f.jitter)*s,y=(f.y-k*.9)*s;
    ctx.globalAlpha=k<.7?1:1-(k-.7)/.3;ctx.font=`bold ${size}px system-ui,sans-serif`;ctx.lineWidth=3;ctx.strokeStyle="rgba(0,0,0,.85)";ctx.strokeText(taken?`-${f.text}`:f.text,x,y);ctx.fillStyle=taken?"#ff6b6b":"#ffd970";ctx.fillText(taken?`-${f.text}`:f.text,x,y)}
  ctx.restore()}
function drawGlyphStatus(ctx,g,s,now,visible,bareFloor=false){
  const t=now/1000;
  for(const e of g.enemies){if(e.dead||!visible(e))continue;const cx=(e.x+.5)*s,cy=(e.y+.45)*s;
    if((e.glyphBurn?.until||0)>now){for(let k=0;k<3;k++){const f=(t*2.2+k/3)%1;ctx.fillStyle=`rgba(255,${140+k*30},60,${.75*(1-f)})`;ctx.beginPath();ctx.arc(cx+(k-1)*s*.18,cy-s*.1-f*s*.45,s*(.09-.05*f),0,7);ctx.fill()}}
    if((e.glyphSlow?.until||0)>now){ctx.strokeStyle="#6fd0c4cc";ctx.lineWidth=Math.max(1.5,s*.05);ctx.setLineDash([s*.12,s*.08]);ctx.beginPath();ctx.ellipse(cx,cy+s*.35,s*.42,s*.14,0,0,7);ctx.stroke();ctx.setLineDash([])}
    if((e.hitStun||0)>.35){ctx.fillStyle="#dbe8ff55";ctx.beginPath();ctx.arc(cx,cy,s*.42,0,7);ctx.fill();ctx.strokeStyle="#eef5ffaa";ctx.lineWidth=1;for(let k=0;k<3;k++){const a=k*2.1+.4;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*s*.38,cy+Math.sin(a)*s*.38);ctx.stroke()}}}
  for(const v of g.glyphVisuals||[]){const a=Math.max(0,v.life/v.max);
    if(v.kind==="arc"){ctx.strokeStyle=v.color;ctx.globalAlpha=a;ctx.lineWidth=Math.max(1.5,s*.06);ctx.beginPath();ctx.moveTo(v.x*s,v.y*s);const mx=(v.x+v.tx)/2*s+Math.sin(t*40)*s*.15,my=(v.y+v.ty)/2*s+Math.cos(t*37)*s*.15;ctx.lineTo(mx,my);ctx.lineTo(v.tx*s,v.ty*s);ctx.stroke();ctx.globalAlpha=1}
    else if(v.kind==="heal"){const rise=(1-a)*s*.6;ctx.font=`bold ${Math.max(10,Math.round(s*.32))}px system-ui,sans-serif`;ctx.textAlign="center";ctx.lineWidth=3;ctx.strokeStyle=`rgba(0,0,0,${a*.8})`;ctx.fillStyle=`rgba(120,240,140,${a})`;ctx.strokeText(`+${v.amount}`,v.x*s,v.y*s-rise);ctx.fillText(`+${v.amount}`,v.x*s,v.y*s-rise);ctx.textAlign="start"}
    else if(v.kind==="mist"){const r=s*(.35+(1-a)*.5),gr=ctx.createRadialGradient(v.x*s,v.y*s,0,v.x*s,v.y*s,r);gr.addColorStop(0,`rgba(214,226,240,${.55*a})`);gr.addColorStop(1,"rgba(150,172,200,0)");ctx.fillStyle=gr;ctx.beginPath();ctx.arc(v.x*s,v.y*s,r,0,7);ctx.fill()}/* release 699: Stalker's Mist rots a foe */
    else if(v.kind==="steam"){const f=1-a;ctx.fillStyle=`rgba(236,248,250,${.42*a})`;for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(v.x*s+(k-1)*s*.2+Math.sin(f*5+k*2)*s*.06,v.y*s-f*s*(.5+k*.12),s*(.06+.07*f),0,7);ctx.fill()}}/* the healing hot springs (HOT_SPRINGS): a wisp of steam */
    else if(v.kind==="primaryEcho"&&!bareFloor){
      const draw=(q,alpha,memory=false)=>{if(!q)return;const d=Math.hypot(q.dx,q.dy)||1,dx=q.dx/d,dy=q.dy/d,angle=Math.atan2(dy,dx),shape=q.shape==='thrust'?'thrust':'sweep';ctx.save();ctx.globalAlpha=Math.max(0,a*alpha);ctx.strokeStyle=memory?'#d8c8ff':'#c9a7ff';ctx.fillStyle=memory?'#d8c8ff':'#c9a7ff';ctx.lineCap='round';ctx.lineJoin='round';
        if(shape==='thrust'){const nx=-dy,ny=dx,x0=q.x+dx*.18,y0=q.y+dy*.18,x1=q.x+dx*q.range,y1=q.y+dy*q.range,w=PRIMARY_ECHO_VISUAL.thrustWidth*(memory?.72:1);ctx.beginPath();ctx.moveTo((x0+nx*w)*s,(y0+ny*w)*s);ctx.lineTo(x1*s,y1*s);ctx.lineTo((x0-nx*w)*s,(y0-ny*w)*s);ctx.closePath();ctx.fill();}
        else {const half=(Number(q.arc)||100)*Math.PI/360,step=memory?Math.max(1,Math.min(3,Number(q.primaryStep)||1)):0,offset=step===1?-.28:step===2?.28:0,start=angle-half+offset,end=angle+half+offset,r=Math.max(.2,Number(q.range)||1.7)*s;ctx.lineWidth=Math.max(2,s*PRIMARY_ECHO_VISUAL.sweepWidth*(memory?.65:1));ctx.beginPath();for(let i=0;i<=PRIMARY_ECHO_VISUAL.sweepSegments;i++){const t=i/PRIMARY_ECHO_VISUAL.sweepSegments,b=start+(end-start)*t,x=q.x*s+Math.cos(b)*r,y=q.y*s+Math.sin(b)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}ctx.restore();};
      const m=v.memory,q=v.actual,different=m&&(Math.hypot(m.x-q.x,m.y-q.y)>.08||Math.hypot(m.dx-q.dx,m.dy-q.dy)>.08||m.shape!==q.shape||Math.abs(m.range-q.range)>.08||m.weaponKind==='verge-cleaver'&&m.primaryStep!==3);draw(q,PRIMARY_ECHO_VISUAL.actualAlpha);if(different&&!g.presentation?.reduceMotion&&!g.presentation?.safeMode)draw(m,PRIMARY_ECHO_VISUAL.memoryAlpha,true);
    }
    else if(v.kind==="burst"){ctx.strokeStyle=`rgba(255,210,92,${a})`;ctx.lineWidth=Math.max(2,s*.08);ctx.beginPath();ctx.arc(v.x*s,v.y*s,v.radius*s*(1.1-a*.6),0,7);ctx.stroke();ctx.fillStyle=`rgba(255,180,70,${a*.25})`;ctx.fill()}}
}

// Echo ground patches (release 99): webs, living flesh and incoming mortar marks.
function drawEchoPatches(ctx,g,s,now){
  for(const q of g.echoPatches||[]){const left=Math.max(0,(q.until-now)/1000),x=q.x*s,y=q.y*s,r=q.radius*s;
    if(q.kind==="web"){ctx.strokeStyle=`rgba(230,235,240,${Math.min(.7,left)})`;ctx.lineWidth=1;ctx.beginPath();for(let k=0;k<8;k++){const a=k*Math.PI/4;ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.6)}ctx.stroke();for(const f of[.4,.75,1]){ctx.beginPath();ctx.ellipse(x,y,r*f,r*f*.6,0,0,7);ctx.stroke()}}
    else if(q.kind==="flesh"){ctx.fillStyle=`rgba(150,40,60,${Math.min(.45,left*.2)})`;ctx.beginPath();ctx.ellipse(x,y,r,r*.6,0,0,7);ctx.fill();ctx.fillStyle=`rgba(220,120,130,${Math.min(.5,left*.2)})`;for(let k=0;k<5;k++){ctx.beginPath();ctx.arc(x+Math.cos(k*1.3+now/700)*r*.6,y+Math.sin(k*1.7)*r*.35,s*.06,0,7);ctx.fill()}}
    else if(q.kind==="mortar"){const t=1-Math.min(1,left/.65);ctx.strokeStyle=q.voidEcho?`rgba(206,150,255,${.4+t*.5})`:`rgba(255,200,90,${.4+t*.5})`;ctx.lineWidth=Math.max(2,s*.06);ctx.beginPath();ctx.ellipse(x,y,r,r*.6,0,0,7);ctx.stroke();ctx.fillStyle=q.voidEcho?`rgba(151,82,224,${t*.3})`:`rgba(255,170,60,${t*.3})`;ctx.fill()}}
}

const SEA_SURFACE = new Set(["ocean", "deepOcean", "shallows"]);
// Open-sea hazards (release 152): spiralling maelstroms, the rogue wave's foam crest, and drifting ice.
function drawSeaHazards(ctx, sea, s, now, l, t, r, b, map) {
  const time = now / 1000, wet = (x, y) => SEA_SURFACE.has(map?.tiles?.[Math.floor(y) * 32 + Math.floor(x)]?.kind);
  for (const v of sea.whirlpools) {
    if (v.x + v.radius < l || v.x - v.radius > r || v.y + v.radius < t || v.y - v.radius > b) continue;
    const cx = v.x * s, cy = v.y * s, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, v.radius * s);
    g.addColorStop(0, "#02101cee"); g.addColorStop(.35, "#0a2a44aa"); g.addColorStop(1, "#1d4f7a00");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, v.radius * s, 0, 7); ctx.fill();
    ctx.strokeStyle = "#cfeaffaa"; ctx.lineWidth = Math.max(1, s * .06);
    for (let arm = 0; arm < 4; arm++) {
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) { const f = k / 30, rad = v.radius * s * (1 - f * .92), a = arm * Math.PI / 2 + v.dir * (f * 5.5 + time * 2.2); const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
  }
  if (sea.current) {
    const c = sea.current, nx = -c.dy, ny = c.dx;
    ctx.strokeStyle = "#bfe6ff55"; ctx.lineWidth = Math.max(1, s * .05);
    for (let lane = -1; lane <= 1; lane++) for (let k = -26; k < 26; k += 3) {
      const f = ((time * 1.7 + k + lane * 1.3) % 52 + 52) % 52 - 26, ox = 16 + nx * (c.offset + lane * c.width / 3) + c.dx * f, oy = 16 + ny * (c.offset + lane * c.width / 3) + c.dy * f;
      if (!wet(ox, oy) || !wet(ox + c.dx * .9, oy + c.dy * .9) || ox < l - 1 || ox > r + 1 || oy < t - 1 || oy > b + 1) continue;
      ctx.beginPath(); ctx.moveTo(ox * s, oy * s); ctx.lineTo((ox + c.dx * .9) * s, (oy + c.dy * .9) * s); ctx.stroke();
    }
  }
  for (const q of sea.reefs || []) {
    if (q.x + q.radius < l || q.x - q.radius > r || q.y + q.radius < t || q.y - q.radius > b) continue;
    for (let i = 0; i < 26; i++) { const a = i * 2.39996 + (q.shape % 7), d = q.radius * Math.sqrt((i + .5) / 26), rad = s * (.08 + ((q.shape >> (i % 20)) & 3) * .04);
      ctx.fillStyle = ["#d9776a88", "#e0a35a88", "#c46a9a88", "#f0d2a077"][(q.shape >> (i % 20)) & 3]; ctx.beginPath(); ctx.arc((q.x + Math.cos(a) * d) * s, (q.y + Math.sin(a) * d) * s, rad, 0, 7); ctx.fill(); }
    ctx.strokeStyle = "#f6e7d266"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(q.x * s, q.y * s, q.radius * s, 0, 7); ctx.stroke();
  }
  const w = sea.wave;
  if (w) {
    const travel = 46 / 5, tt = (sea.clock + w.phase) % w.period;
    if (tt < travel) {
      const pos = -23 + tt * 5, nx = -w.dy, ny = w.dx;
      for (const [off, col, lw] of [[-1.4, "#1d4f7a66", 1.4], [-.6, "#9fd3f0aa", .5], [0, "#f4fbffee", .18]]) {
        const ox = 16 + w.dx * (pos + off), oy = 16 + w.dy * (pos + off);
        ctx.strokeStyle = col; ctx.lineWidth = lw * s; ctx.beginPath();
        let pen = false;
        for (let k = -24; k <= 24; k += .5) { const wob = Math.sin(k * .7 + time * 3) * .25, wx = ox + nx * k + w.dx * wob, wy = oy + ny * k + w.dy * wob; if (!wet(wx, wy)) { pen = false; continue; } pen ? ctx.lineTo(wx * s, wy * s) : ctx.moveTo(wx * s, wy * s); pen = true; }
        ctx.stroke();
      }
    }
  }
  for (const berg of sea.bergs) {
    if (berg.x + berg.radius < l || berg.x - berg.radius > r || berg.y + berg.radius < t || berg.y - berg.radius > b) continue;
    const pts = []; for (let i = 0; i < 9; i++) { const a = berg.spin + i * Math.PI * 2 / 9, j = .78 + ((berg.shape >> (i * 2)) & 3) * .08; pts.push([(berg.x + Math.cos(a) * berg.radius * j) * s, (berg.y + Math.sin(a) * berg.radius * j) * s]); }
    ctx.fillStyle = "#0a223855"; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x + s * .15, y + s * .25) : ctx.moveTo(x + s * .15, y + s * .25)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e6f4fb"; ctx.strokeStyle = "#8fb8cf"; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#b9dcef"; ctx.beginPath(); ctx.moveTo(berg.x * s, berg.y * s); for (let i = 0; i < 3; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill();
  }
}

// Travel seeds (skylands.ts SEEDS): a seed lying in the open, a small glint over it; and the Tide Bearer's lantern of still water.
function drawSeedFind(ctx, o, s, now) {
  const S = SEEDS[o.seed] || SEEDS.opal, cx = (o.x + .5) * s, cy = (o.y + .72) * s, pulse = .5 + .5 * Math.sin(now / 420 + o.x);
  ctx.save(); ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(cx, cy + s * .1, s * .16, s * .06, 0, 0, 7); ctx.fill();
  ctx.fillStyle = S.color; ctx.strokeStyle = "#0008"; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath(); ctx.ellipse(cx, cy - s * .02, s * .11, s * .15, .5, 0, 7); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = .45 + .5 * pulse; ctx.fillStyle = S.glint; ctx.beginPath(); ctx.arc(cx - s * .03, cy - s * .08, s * .035, 0, 7); ctx.fill();
  ctx.strokeStyle = S.glint; ctx.lineWidth = Math.max(1, s * .025); const r = s * (.2 + .06 * pulse); ctx.beginPath(); ctx.moveTo(cx, cy - r - s * .1); ctx.lineTo(cx, cy - r - s * .22); ctx.moveTo(cx - s * .06, cy - r - s * .16); ctx.lineTo(cx + s * .06, cy - r - s * .16); ctx.stroke();
  ctx.restore();
}
function drawTideLantern(ctx, o, s, now) {
  const cx = (o.x + .82) * s, cy = (o.y + .35) * s, pulse = .5 + .5 * Math.sin(now / 600);
  ctx.save(); ctx.strokeStyle = "#cfe6ee"; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath(); ctx.moveTo(cx, cy - s * .22); ctx.lineTo(cx, cy - s * .1); ctx.stroke();
  ctx.fillStyle = `rgba(150,220,235,${.35 + .35 * pulse})`; ctx.beginPath(); ctx.arc(cx, cy, s * .1, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#e2f4f8"; ctx.font = "10px monospace"; ctx.textAlign = "center"; ctx.fillText("TIDE BEARER", (o.x + .5) * s, (o.y - .3) * s); ctx.textAlign = "start";
  ctx.restore();
}
