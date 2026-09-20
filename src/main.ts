import { screenToWorld, drawWaymarkIcon } from "./renderer.ts";
import { vendorShop, buyFromVendor } from "./game.ts";
import { CREATURE_TRAITS } from "./combat.ts";
import { hashSeed } from "./random.ts";
function uiButton(label, click) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.onclick = click;
  return b;
}
export function itemIconDescriptor(item, slot = item?.slot || "empty") {
  const name=String(item?.name||""),property=String(item?.property||"empty"),h=hashSeed(`${item?.id||name}:${property}:${item?.power||0}`),family=slot==="primary"?(name.includes("Pike")?"pike":name.includes("Cleaver")?"cleaver":"sword"):slot==="secondary"?(name.includes("Bombard")?"bombard":name.includes("Spindle")?"spindle":"caster"):slot==="armor"?(name.includes("Mantle")?"mantle":"coat"):slot==="charm"?"charm":"empty",
    accent=name.match(/Cinder|Ember|Kiln/i)?"#e47a48":name.match(/Glass|Needle/i)?"#72d7df":name.match(/Lumen|Rift|Quiet/i)?"#b28cda":({reach:"#7cc8b5",impact:"#d89a52",focus:"#a98bd4",quick:"#75cad8",blast:"#d56755",guard:"#d2ad68",stamina:"#7fbd8c",discovery:"#b28cda",steady:"#b8b1a2"}[property]||"#9e9b90");
  return{family,accent,rune:h%6,power:Math.max(0,Number(item?.power)||0),variant:(h>>>4)%4};
}
function gearIcon(item,slot){
  const q=itemIconDescriptor(item,slot),c=document.createElement("canvas");c.width=c.height=72;const x=c.getContext("2d");c.className="gear-icon";c.dataset.family=q.family;c.dataset.accent=q.accent;c.setAttribute("role","img");c.setAttribute("aria-label",item?`${item.name} equipment icon`:`Empty ${slot} slot`);if(!x)return c;x.translate(36,36);x.lineCap="round";x.lineJoin="round";x.fillStyle="#11171b";x.strokeStyle="#665f52";x.lineWidth=2;x.beginPath();x.arc(0,0,31,0,7);x.fill();x.stroke();x.shadowColor=q.accent;x.shadowBlur=8;x.strokeStyle=q.accent;x.fillStyle=q.accent+"55";x.lineWidth=4;
  if(q.family==="sword"){x.beginPath();x.moveTo(-14,18);x.lineTo(15,-20);x.lineTo(20,-23);x.lineTo(18,-16);x.lineTo(-9,22);x.closePath();x.fill();x.stroke();x.beginPath();x.moveTo(-17,11);x.lineTo(-6,20);x.stroke();}
  else if(q.family==="pike"){x.beginPath();x.moveTo(-19,23);x.lineTo(13,-17);x.stroke();x.beginPath();x.moveTo(13,-17);x.lineTo(23,-25);x.lineTo(19,-11);x.closePath();x.fill();x.stroke();}
  else if(q.family==="cleaver"){x.beginPath();x.moveTo(-19,23);x.lineTo(3,-5);x.stroke();x.beginPath();x.moveTo(2,-5);x.lineTo(7,-25);x.lineTo(23,-16);x.lineTo(12,1);x.closePath();x.fill();x.stroke();}
  else if(q.family==="caster"){x.beginPath();x.moveTo(-22,-5);x.lineTo(13,-5);x.lineTo(23,2);x.lineTo(8,7);x.lineTo(-20,7);x.closePath();x.fill();x.stroke();x.beginPath();x.moveTo(-2,8);x.lineTo(-7,20);x.stroke();}
  else if(q.family==="spindle"){x.beginPath();x.arc(-5,1,18,-1.1,1.15);x.stroke();x.beginPath();x.arc(8,-2,13,2.15,4.25);x.stroke();x.beginPath();x.arc(0,0,5,0,7);x.fill();}
  else if(q.family==="bombard"){x.beginPath();x.arc(0,4,17,0,7);x.fill();x.stroke();x.beginPath();x.moveTo(8,-13);x.quadraticCurveTo(18,-24,23,-13);x.stroke();}
  else if(q.family==="mantle"||q.family==="coat"){x.beginPath();x.moveTo(-9,-21);x.lineTo(-22,-11);x.lineTo(-16,23);x.lineTo(0,16);x.lineTo(16,23);x.lineTo(22,-11);x.lineTo(9,-21);x.quadraticCurveTo(0,-12,-9,-21);x.closePath();x.fill();x.stroke();if(q.family==="coat"){x.beginPath();x.moveTo(0,-9);x.lineTo(0,17);x.stroke();}}
  else if(q.family==="charm"){x.beginPath();x.arc(0,0,20,0,7);x.stroke();x.rotate(q.variant*.18);x.beginPath();x.moveTo(0,-21);x.lineTo(6,-6);x.lineTo(21,0);x.lineTo(6,6);x.lineTo(0,21);x.lineTo(-6,6);x.lineTo(-21,0);x.lineTo(-6,-6);x.closePath();x.fill();x.stroke();}
  else{x.setLineDash([4,4]);x.beginPath();x.arc(0,0,18,0,7);x.stroke();x.beginPath();x.moveTo(-8,-8);x.lineTo(8,8);x.moveTo(8,-8);x.lineTo(-8,8);x.stroke()}
  x.setLineDash([]);x.shadowBlur=0;x.fillStyle=q.accent;x.font="bold 12px monospace";x.textAlign="center";x.fillText(["·","Ⅰ","Ⅱ","Ⅲ","Ⅳ","Ⅴ"][q.rune],0,5);for(let i=0;i<Math.min(5,Math.ceil(q.power/3));i++){x.globalAlpha=.55+i*.08;x.fillRect(-12+i*6,27,4,2)}x.globalAlpha=1;return c;
}
export function equipFromInventory(save, index) {
  const item = save.inventory[index];
  if (!item || !["primary", "secondary", "armor", "charm"].includes(item.slot))
    return false;
  const prior = save.equipment[item.slot] || null;
  save.equipment[item.slot] = { ...item };
  save.inventory.splice(index, 1);
  if (prior) save.inventory.push(prior);
  return true;
}
function drawRangedEffects() {
  const s = Math.max(28, Math.min(44, innerWidth / 12)),
    toScreen = (q) => [
      innerWidth / 2 + (q.x - game.player.x) * s,
      innerHeight / 2 + (q.y - game.player.y) * s,
    ];
  for (const p of game.projectiles) {
    const [x, y] = toScreen(p);
    ctx.fillStyle = p.hostile ? (p.path==="grenade"?"#e36b4f":p.path==="arc"?"#f0c66e":"#d28af0") : p.damageType === "magic" ? "#9fe8db" : "#d6b276";
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
function openShop(vendorId = "vendor-vela") {
  pauseForOverlay();
  body.replaceChildren();
  const names = {
      "vendor-vela": "Vela’s Verge Supplies",
      "vendor-iona": "Glasshaven Exchange",
      "vendor-mora": "Coilmarket Provisions",
    },
    h = document.createElement("h2"),
    intro = document.createElement("p");
  h.textContent = names[vendorId] || "Waystation Supplies";
  const shop = vendorShop(save, vendorId);
  intro.textContent = `${save.currency} marks. Restorative draughts remain dependable; limited stock and equipment rotate after every four newly charted sections. Stock cycle ${shop.rotation ?? 0}.${game.message ? ` ${game.message}` : ""}`;
  body.append(h, intro);
  const
    offers = [
      [
        "restorativeDraught",
        "Restorative Draught",
        3,
        99 - (save.consumables.restorativeDraught || 0),
      ],
      ["ironbarkTonic", "Ironbark Tonic", 8, shop.limited.ironbarkTonic],
      ["lumenPhial", "Lumen Phial", 9, shop.limited.lumenPhial],
      ["crossingSigil", "Crossing Sigil", 30, shop.limited.crossingSigil],
    ];
  for (const [id, name, price, stock] of offers) {
    const row = document.createElement("div"),
      title = document.createElement("strong");
    row.className = "item";
    title.textContent = `${name} · ${price} marks · ${id === "restorativeDraught" ? "unlimited" : (stock || 0) + " left"}`;
    const buy = (n) => {
      const r = buyFromVendor(save, vendorId, id, n);
      game.message = r.message;
      persist();
      openShop(vendorId);
    };
    row.append(
      title,
      uiButton("Buy 1", () => buy(1)),
    );
    if (id === "restorativeDraught")
      row.append(uiButton("Buy up to 5", () => buy(5)));
    body.append(row);
  }
  for (const item of shop.equipment) {
    const row = document.createElement("div"),
      price = 12 + item.power * 4,
      title = document.createElement("strong");
    row.className = "item";
    title.textContent = `${item.name} · power ${item.power} · ${price} marks${shop.purchased[item.id] ? " · sold" : ""}`;
    row.append(
      title,
      uiButton("Buy", () => {
        const r = buyFromVendor(save, vendorId, item.id);
        game.message = r.message;
        persist();
        openShop(vendorId);
      }),
    );
    body.append(row);
  }
  if (!panel.open) panel.showModal();
}
setTimeout(() => {
  canvas.addEventListener("worldtap", (e) => {
    if (game.paused) return;
    const r = canvas.getBoundingClientRect(),
      q = screenToWorld(
        game,
        r.width,
        r.height,
        e.detail.clientX - r.left,
        e.detail.clientY - r.top,
      );
    game.aimAt(q.x, q.y);
    const direction = {
      x: q.x - game.player.x - 0.5,
      y: q.y - game.player.y - 0.45,
    };
    if (save.aimMode === "attack")
      game.primaryAttack(performance.now(), direction);
    else if (save.aimMode === "tool" || (!save.aimMode && save.activeWeaponSlot === "secondary"))
      game.fireSecondary(performance.now(), direction);
    else if (save.aimMode === "act") game.interactAt(q.x, q.y);
    persist();
  });
  setInterval(() => {
    if (game.interactionRequested) {
      const id = game.interactionRequested;
      game.interactionRequested = null;
      openInteraction(id);
    }
    if (game.shopRequested) {
      game.shopRequested = false;
      openShop();
    }
    const tool = document.querySelector('[data-action="tool"]'),
      attack = document.querySelector('[data-action="attack"]'),
      act = document.querySelector('[data-action="interact"]');
    $("#attackInfo").textContent =
      `ATTACK ${save.equipment[save.activeWeaponSlot]?.name || "none"}`;
    $("#spellInfo").textContent =
      `SPELL ${(SPELLS[save.equippedSpell] || SPELLS["ember-ring"]).name}`;
    $("#toolInfo").textContent =
      `TOOL ${save.equipment.secondary?.name || "none"}${save.aimMode === "tool" ? " [ACTIVE]" : ""}`;
    tool?.classList.toggle("selected", save.aimMode === "tool");
    attack?.classList.toggle("selected", save.aimMode === "attack");
    act?.classList.toggle("selected", save.aimMode === "act");
  }, 100);
}, 0);
import { loadSave, saveGame } from "./persistence.ts";
import {
  Game,
  actionReadiness,
  enemyDangerRadius,
  characterStats,
  syncCharacterStats,
  EQUIPMENT_CAPACITY,
  salvageInventoryItem,
} from "./game.ts";
import { createInput } from "./input.ts";
import { render as baseRender, renderScaleForViewport } from "./renderer.ts";
import { STATS } from "./types.ts";
import { SPELLS, ITEM_TIERS, itemTier, itemScore, describeAffixes, compareItemStats } from "./items.ts";
import { currentObjective, validActions } from "./interactions.ts";
import { worldStewardReport } from "./story.ts";
import {
  generateRegion as generateWorldRegion,
  generateDungeon,
  sectionSummary,
  sectionSites,
  regionalThreat,
  apertureTier,
  APERTURE_THRESHOLDS,
  perceived,
  wayfindingCues,
} from "./world.ts";
const $ = (s) => document.querySelector(s),
  canvas = $("#game"),
  ctx = canvas.getContext("2d"),
  input = createInput(document),
  save = await loadSave(),
  game = new Game(save, performance.now()),
  panel = $("#panel"),
  body = $("#panelBody"),
  pausePanel = $("#pausePanel"),
  atlas = $("#atlas"),
  journal = $("#journal"),
  mapCanvas = $("#mapCanvas"),
  mctx = mapCanvas.getContext("2d");
globalThis.corridorStewardReport=()=>worldStewardReport(save);
const inventoryView = { slot: "all", tier: "all", sort: "score" };
let last = performance.now(),
  clock = 0,
  mapView = { x: game.rx, y: game.ry, zoom: 1, selected: null, panX: 0, panY: 0 },
  mapMode = "atlas";
let atlasDrag = null,
  atlasPinch = null,
  overlayPause = false,
  suppressMapClick = false,
  bannerTimer = 0,
  nearbyNotice = "",
  atlasOpenedAt = -Infinity;
const atlasPointers = new Map();
const announcedThreats = new Set();
function showEventBanner(title, detail = "", kind = "discovery") {
  const banner = $("#eventBanner");
  banner.querySelector("strong").textContent = title;
  banner.querySelector("span").textContent = detail;
  banner.className = kind;
  requestAnimationFrame(() => banner.classList.add("visible"));
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.classList.remove("visible"), 3200);
}
function updateWorldNotices() {
  if(game.defeatNotice){const notice=game.defeatNotice;game.defeatNotice=null;showEventBanner(notice.title,notice.detail,notice.kind);}
  for (const e of game.enemies) if (!e.dead && (e.boss || e.apertureEncounter) && !announcedThreats.has(e.id)) {
    announcedThreats.add(e.id);
    showEventBanner(e.boss ? "MAJOR THREAT" : "CORRIDOR BREACH", e.kind.replace(/([A-Z])/g," $1").trim() + " has entered this section", "danger");
  }
  const activatedHere=!!save.checkpoints?.[`${game.rx},${game.ry}`],o=(game.map.objects||[]).filter(q=>["checkpoint","dungeon","shrine","ruinMarker","bossCue"].includes(q.kind)&&!(q.kind==="checkpoint"&&activatedHere)).sort((a,b)=>Math.hypot(a.x-game.player.x,a.y-game.player.y)-Math.hypot(b.x-game.player.x,b.y-game.player.y))[0],key=o&&Math.hypot(o.x-game.player.x,o.y-game.player.y)<2.4?game.areaId()+":"+o.id:"";
  if(key&&key!==nearbyNotice){nearbyNotice=key;let title=o.kind==="checkpoint"?"WAYGLASS REACHED":o.kind==="dungeon"?"CROSSING REACHED":o.kind==="bossCue"?"CORRIDOR BREACH":"SITE REACHED",detail=o.name||({dungeon:"Buried Crossing",checkpoint:"Wayglass Beacon",shrine:"Singing Array",ruinMarker:"Broken Observatory",bossCue:"Major Threat"}[o.kind]||"Unusual Site");if(o.kind==="shrine"){title="REST POINT REACHED";detail=`${detail} · respawn updated; no fast travel`;save.activeCheckpoint={rx:game.rx,ry:game.ry,x:o.x,y:o.y,name:o.name||"Singing Array"};save.worldFlags[`rest:${game.rx},${game.ry}:${o.id}`]=true;game.sync()}showEventBanner(title,detail,o.kind==="bossCue"?"danger":"discovery");}
  else if(!key)nearbyNotice="";
}
function apertureStatsCard() {
  const p = save.perception,
    tier = apertureTier(p.aperture),
    next = APERTURE_THRESHOLDS[tier],
    q = regionalThreat(game.rx, game.ry),
    card = document.createElement("section");
  card.className = "aperture-card item";
  card.dataset.aperture = "stats";
  const h = document.createElement("strong"),
    text = document.createElement("p");
  h.textContent = `APERTURE ${p.aperture} · TIER ${tier}`;
  text.textContent = next
    ? `${next - p.aperture} until the next perception break.`
    : "All current perception breaks reached.";
  card.append(h, text);
  if (tier >= 1) {
    const detail = document.createElement("p");
    detail.textContent = `Threat ring ${q.ring} · enemy vitality ×${q.hpMultiplier.toFixed(2)} · memories ${p.discoveries.memories}`;
    card.append(detail);
  }
  if (tier >= 2) {
    const detail = document.createElement("p");
    detail.textContent = `Unseen crossings found ${p.discoveries.doors}. Completed dungeons may now contain annex doors.`;
    card.append(detail);
  }
  if (tier >= 3) {
    const detail = document.createElement("p");
    detail.textContent = `Deep relics ${p.discoveries.relics}. Fine enemy and environmental structures are visible.`;
    card.append(detail);
  }
  return card;
}
new MutationObserver(() => {
  if (
    body.querySelector("h2")?.textContent === String(save.name) &&
    !body.querySelector('[data-aperture="stats"]')
  )
    body.querySelector("h2").after(apertureStatsCard());
}).observe(body, { childList: true, subtree: false });
function render(ctx, game, w, h, now) {
  const attackUntil = game.player.attackUntil,
    telegraphs = game.enemies.map((e) => e.telegraph),
    objects = game.map.objects;
  game.map.objects = objects.filter((o) => perceived(o, game.save));
  game.player.attackUntil = 0;
  for (const e of game.enemies) e.telegraph = 0;
  baseRender(ctx, game, w, h, now);
  drawApertureVisuals();
  game.map.objects = objects;
  game.player.attackUntil = attackUntil;
  for (let i = 0; i < game.enemies.length; i++)
    game.enemies[i].telegraph = telegraphs[i];
}
function drawApertureVisuals() {
  const s = Math.max(28, Math.min(44, innerWidth / 12)),
    sx = (x) => innerWidth / 2 + (x - game.player.x) * s,
    sy = (y) => innerHeight / 2 + (y - game.player.y) * s,
    t = performance.now() / 600;
  ctx.save();
  for (const o of game.map.objects)
    if (perceived(o, save) && o.visualTier) {
      const x = sx(o.x + 0.5),
        y = sy(o.y + 0.5);
      ctx.strokeStyle = o.visualTier > 2 ? "#f0c8ff" : "#ad7bd6";
      ctx.fillStyle = o.visualTier > 2 ? "#7b3fa655" : "#563f7955";
      ctx.lineWidth = 2 + o.visualTier;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.55);
      ctx.lineTo(x + s * 0.42, y);
      ctx.lineTo(x, y + s * 0.55);
      ctx.lineTo(x - s * 0.42, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  for (const e of game.enemies)
    if (!e.dead && e.traits?.includes("orbital")) {
      const x = sx(e.x + 0.5),
        y = sy(e.y + 0.45),
        r = s * Math.max(.68,(Number(e.scale)||1)*.62);
      ctx.strokeStyle = e.visualTier > 2 ? "#f1d6ff" : "#bb83df";
      ctx.lineWidth = 2.25;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = t + (i * Math.PI) / 5,
          q = r * (1.1 + (i % 2) * 0.25);
        ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  ctx.restore();
}
const objective = $("#objective"),
  hud = $("#hud"),
  hudDetails = $("#hudDetails"),
  hudToggles = [$("#hudExpand"), $("#fieldMenuToggle")],
  navCompass = $("#navCompass"),
  navArrow = $("#navArrow");
function navigationTarget() {
  if (game.area !== "overworld") return null;
  if (save.waypoint) return { ...save.waypoint, kind: "waypoint", name: "Atlas waypoint" };
  const objectiveOpen = !save.consequences.choices.relay ||
    (save.narrative.facts["leads.active"] && !save.narrative.facts["leads.complete"]);
  if (!objectiveOpen) return null;
  const cues = wayfindingCues(save.seed, game.rx, game.ry, save.worldGeneration, save, game.map),
    cue = cues.find((q) => q.signalKind === "crossing") ||
      cues.find((q) => q.signalKind === "danger") ||
      cues.find((q) => q.signalKind === "event");
  return cue && { rx: cue.targetRx, ry: cue.targetRy, kind: "quest", name: cue.name || "Quest signal" };
}
function updateNavigationCompass() {
  const target = navigationTarget();
  navCompass.hidden = !target;
  if (!target) return;
  const dx = (target.rx - game.rx) * 32 + 16 - game.player.x,
    dy = (target.ry - game.ry) * 32 + 16 - game.player.y,
    arrived = target.rx === game.rx && target.ry === game.ry;
  navCompass.classList.toggle("quest", target.kind === "quest");
  navCompass.classList.toggle("arrived", arrived);
  navArrow.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI + 90}deg)`;
  navCompass.setAttribute("aria-label", arrived ? `${target.name} reached` : `${target.name}, ${Math.max(Math.abs(target.rx - game.rx), Math.abs(target.ry - game.ry))} sections away`);
  navCompass.title = navCompass.getAttribute("aria-label");
}
const mute = document.createElement("button");
mute.type = "button";
mute.textContent =
  localStorage.getItem("corridor-muted") === "1" ? "Unmute" : "Mute";
mute.dataset.audio = "toggle";
$("#hudMenu").prepend(mute);
function setHudExpanded(open) {
  hud.classList.toggle("expanded", open);
  hudDetails.hidden = !open;
  for (const b of hudToggles) b.setAttribute("aria-expanded", String(open));
}
for (const b of hudToggles) b.onclick = () => setHudExpanded(hudDetails.hidden);
let audio = null,
  audioGain = null,
  musicBus = null,
  muted = localStorage.getItem("corridor-muted") === "1";
function voice(
  freq,
  when,
  duration,
  gain = 0.08,
  type = "triangle",
  destination = musicBus,
) {
  const o = audio.createOscillator(),
    g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  o.connect(g).connect(destination);
  o.start(when);
  o.stop(when + duration + 0.05);
}
function startAmbience() {
  if (audio) {
    if (audio.state === "suspended") audio.resume();
    return;
  }
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return;
  audio = new A();
  audioGain = audio.createGain();
  musicBus = audio.createGain();
  const compressor = audio.createDynamicsCompressor(),
    filter = audio.createBiquadFilter(),
    delay = audio.createDelay(1),
    echo = audio.createGain();
  audioGain.gain.value = muted ? 0 : 0.06;
  musicBus.gain.value = 0.72;
  filter.type = "lowpass";
  filter.frequency.value = 1150;
  filter.Q.value = 0.7;
  delay.delayTime.value = 0.37;
  echo.gain.value = 0.18;
  musicBus
    .connect(filter)
    .connect(compressor)
    .connect(audioGain)
    .connect(audio.destination);
  filter.connect(delay).connect(echo).connect(compressor);
  const chords = [
      [55, 82.41, 110, 130.81],
      [49, 73.42, 98, 123.47],
      [43.65, 65.41, 87.31, 110],
      [51.91, 77.78, 103.83, 123.47],
    ],
    melody = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 246.94],
    drones = [audio.createOscillator(), audio.createOscillator()];
  drones[0].type = "triangle";
  drones[0].frequency.value = 55;
  drones[1].type = "sine";
  drones[1].frequency.value = 82.41;
  drones[1].detune.value = -7;
  const droneGain = audio.createGain();
  droneGain.gain.value = 0.055;
  for (const o of drones) {
    o.connect(droneGain);
    o.start();
  }
  droneGain.connect(filter);
  let bar = 0;
  const score = () => {
    if (!audio) return;
    const t = audio.currentTime + 0.03,
      chord = chords[bar % chords.length],
      dungeon = game.area === "dungeon";
    drones[0].frequency.exponentialRampToValueAtTime(chord[0], t + 0.8);
    drones[1].frequency.exponentialRampToValueAtTime(chord[1], t + 0.8);
    for (let i = 1; i < chord.length; i++)
      voice(
        chord[i],
        t + i * 0.035,
        5.8,
        dungeon ? 0.045 : 0.032,
        i === 2 ? "sine" : "triangle",
      );
    voice(
      melody[(bar * 3) % melody.length],
      t + 1.4,
      1.9,
      dungeon ? 0.055 : 0.04,
      "sine",
    );
    if (bar % 2)
      voice(
        melody[(bar * 3 + 2) % melody.length] / 2,
        t + 3.6,
        2.1,
        0.035,
        "triangle",
      );
    bar++;
    setTimeout(score, 6200);
  };
  score();
}
addEventListener("pointerdown", startAmbience, { once: true });
addEventListener("keydown", startAmbience, { once: true });
mute.onclick = () => {
  muted = !muted;
  localStorage.setItem("corridor-muted", muted ? "1" : "0");
  mute.textContent = muted ? "Unmute" : "Mute";
  if (!audio && !muted) startAmbience();
  if (audioGain) {
    const t = audio.currentTime;
    audioGain.gain.cancelScheduledValues(t);
    audioGain.gain.setValueAtTime(Math.max(0.0001, audioGain.gain.value), t);
    audioGain.gain.linearRampToValueAtTime(muted ? 0 : 0.06, t + 0.35);
  }
};
setInterval(() => {
  const value = save.perception?.aperture || 0,
    tier = apertureTier(value),
    next = APERTURE_THRESHOLDS[tier],
    unlock = tier === 0 ? "inscriptions" : tier === 1 ? "annexes" : tier === 2 ? "deep relics" : "all current structures visible";
  objective.textContent = `${currentObjective(save)} · Aperture ${value}${next ? "/" + next : ""}: ${unlock}`;
}, 250);
function drawDungeonSystems() {
  const s = Math.max(28, Math.min(44, innerWidth / 12)),
    sx = (x) => innerWidth / 2 + (x - game.player.x) * s,
    sy = (y) => innerHeight / 2 + (y - game.player.y) * s;
  ctx.save();
  for (const o of game.map.objects) {
    if (o.kind === "trap") {
      const active = o.phase === "active",
        warning = o.phase === "warning";
      ctx.strokeStyle = active ? "#e66a3d" : warning ? "#c99a58" : "#756b5a";
      ctx.fillStyle = active ? "#a43c2638" : "#17151288";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (o.trapType === "fire") {
        ctx.moveTo(sx(o.x), sy(o.y + 0.2));
        ctx.lineTo(sx(o.x + (active ? 3 : 1)), sy(o.y + 0.2));
      } else ctx.rect(sx(o.x) - s * 0.35, sy(o.y) - s * 0.35, s * 0.7, s * 0.7);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#29251f";
      ctx.beginPath();
      ctx.moveTo(sx(o.x) - s * 0.3, sy(o.y) + s * 0.15);
      ctx.lineTo(sx(o.x) + s * 0.3, sy(o.y) - s * 0.15);
      ctx.stroke();
    }
    if (o.kind === "vine") {
      ctx.strokeStyle = "#587052";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx(o.x), sy(o.y));
      ctx.quadraticCurveTo(
        (sx(o.x) + sx(o.toX)) / 2,
        Math.min(sy(o.y), sy(o.toY)) - s * 1.3,
        sx(o.toX),
        sy(o.toY),
      );
      ctx.stroke();
    }
  }
  if (
    performance.now() < (game.player.attackUntil || 0) &&
    game.player.meleeAim
  ) {
    const d = game.player.meleeAim,
      cx = sx(game.player.x + 0.5),
      cy = sy(game.player.y + 0.35),
      profile = game.attackProfile || { range: 1.7, arc: 100 };
    ctx.strokeStyle = "#d0aa6d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (profile.shape === "thrust") {
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + d.x * s * profile.range, cy + d.y * s * profile.range);
    } else {
      const a = Math.atan2(d.y, d.x),
        half = (profile.arc * Math.PI) / 360;
      ctx.arc(cx, cy, s * profile.range, a - half, a + half);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function startPulse() {
  if (!audio || startPulse.running) return;
  startPulse.running = true;
  let step = 0;
  const bass = [55, 0, 55, 65.41, 0, 49, 55, 43.65],
    ticks = [0, 1, 0, 0, 0, 1, 0, 1];
  setInterval(() => {
    if (!audio || audio.state !== "running" || game.paused) return;
    const t = audio.currentTime,
      f = bass[step % bass.length],
      dungeon = game.area === "dungeon";
    if (f) {
      const o = audio.createOscillator(),
        g = audio.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(f * 1.25, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.24);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(dungeon ? 0.11 : 0.07, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g).connect(musicBus);
      o.start(t);
      o.stop(t + 0.45);
    }
    if (ticks[step % ticks.length]) {
      const length = Math.floor(audio.sampleRate * 0.055),
        buffer = audio.createBuffer(1, length, audio.sampleRate),
        data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++)
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const noise = audio.createBufferSource(),
        hp = audio.createBiquadFilter(),
        g = audio.createGain();
      noise.buffer = buffer;
      hp.type = "highpass";
      hp.frequency.value = 2800;
      g.gain.value = dungeon ? 0.025 : 0.012;
      noise.connect(hp).connect(g).connect(musicBus);
      noise.start(t);
    }
    step++;
  }, 775);
}
addEventListener("pointerdown", () => setTimeout(startPulse, 0), {
  once: true,
});
addEventListener("keydown", () => setTimeout(startPulse, 0), { once: true });
export function combatIndicatorGeometry(game, now = performance.now()) {
  const out = { melee: null, enemies: [], traps: [], effects: [] };
  if (now < (game.player.meleeUntil || 0) && game.player.meleeStrike)
    out.melee = { ...game.player.meleeStrike };
  for (const e of game.enemies)
    if (!e.dead && e.telegraph > 0)
      out.enemies.push({
        kind: "circle",
        x: e.x + 0.5,
        y: e.y + 0.5,
        radius: enemyDangerRadius(e),
        large: (Number(e.scale) || 1) > 1.25,
      });
  for (const o of game.map.objects)
    if (o.kind === "trap")
      out.traps.push(
        o.trapType === "fire"
          ? {
              kind: "rect",
              x: o.x - 1,
              y: o.y - 0.55,
              width: 4,
              height: 1.1,
              active: o.phase === "active",
            }
          : {
              kind: "circle",
              x: o.x,
              y: o.y,
              radius: 0.72,
              active: o.phase === "active",
            },
      );
  for (const fx of game.effects)
    out.effects.push({ kind: "circle", x: fx.x, y: fx.y, radius: fx.radius });
  return out;
}
function drawTruthfulCombatGeometry() {
  const s = Math.max(28, Math.min(44, innerWidth / 12)),
    sx = (x) => innerWidth / 2 + (x - game.player.x) * s,
    sy = (y) => innerHeight / 2 + (y - game.player.y) * s,
    g = combatIndicatorGeometry(game);
  ctx.save();
  for (const q of g.traps) {
    ctx.fillStyle = q.active ? "#a43c2638" : "#17151288";
    ctx.strokeStyle = q.active ? "#ef8158" : "#8c806d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (q.kind === "rect")
      ctx.rect(sx(q.x), sy(q.y), q.width * s, q.height * s);
    else ctx.arc(sx(q.x), sy(q.y), q.radius * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  for (const q of g.enemies) {
    ctx.fillStyle = q.large ? "transparent" : "#783b3430";
    ctx.strokeStyle = q.large ? "#db866c99" : "#db866ccc";
    ctx.lineWidth = q.large ? 3 : 2.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(sx(q.x), sy(q.y), q.radius * s, 0, Math.PI * 2);
    if (!q.large) ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const q of g.effects) {
    ctx.strokeStyle = "#d99a5288";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx(q.x), sy(q.y), q.radius * s, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (g.melee) {
    const q = g.melee,
      a = Math.atan2(q.dy, q.dx),
      half = (q.arc * Math.PI) / 360,
      cx = sx(q.x),
      cy = sy(q.y),
      r = q.range * s,
      progress =
        1 - Math.max(0, (game.player.meleeUntil - performance.now()) / 240),
      sweep = a - half + Math.min(1, progress) * half * 2;
    ctx.strokeStyle = "#e6bd78";
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 5]);
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(cx + q.innerRadius * s, cy);
    ctx.arc(cx, cy, q.innerRadius * s, 0, Math.PI * 2);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - half) * r, cy + Math.sin(a - half) * r);
    ctx.arc(cx, cy, r, a - half, a + half);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#ffe0a0";
    ctx.shadowColor = "#d79548";
    ctx.shadowBlur = 9;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, Math.max(a - half, sweep - 0.48), sweep);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff1c8";
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(sweep) * r * 0.9,
      cy + Math.sin(sweep) * r * 0.9,
      3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}
drawDungeonSystems = drawTruthfulCombatGeometry;
const generateRegion = (seed, rx, ry) =>
  generateWorldRegion(seed, rx, ry, save.worldGeneration);
let resizeFrame = 0;
function resize() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    const rect = $("#app").getBoundingClientRect(),
      w = Math.max(1, Math.round(rect.width)),
      h = Math.max(1, Math.round(rect.height)),
      d = renderScaleForViewport(w, h, devicePixelRatio || 1);
    if (
      canvas.width !== Math.round(w * d) ||
      canvas.height !== Math.round(h * d)
    ) {
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
    }
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.imageSmoothingEnabled = false;
    input.reset();
  });
}
addEventListener(
  "resize",
  () => {
    resize();
    updateMessage(game.message, true);
  },
  { passive: true },
);
visualViewport?.addEventListener("resize", resize, { passive: true });
screen.orientation?.addEventListener("change", resize);
new ResizeObserver(resize).observe($("#app"));
resize();
const persist = () => saveGame(game.exportSnapshot(performance.now()));
function pause(show = true) {
  if (show) overlayPause = false;
  game.setPaused(true, performance.now());
  input.reset();
  persist();
  if (show && !pausePanel.open) pausePanel.showModal();
}
function pauseForOverlay() {
  overlayPause = true;
  pause(false);
}
function resume() {
  overlayPause = false;
  for (const d of [pausePanel, atlas, panel, journal]) if (d.open) d.close();
  game.setPaused(false, performance.now());
  input.reset();
  last = performance.now();
  persist();
}
function drawDungeonMap() {
  const selectedLevel=$("#dungeonLevelSelect")?.value,currentLevel=game.map.levelId||"root",map=selectedLevel&&selectedLevel!==currentLevel?generateDungeon(save.seed,game.areaId(),{levelId:selectedLevel}):game.map,d=Math.min(devicePixelRatio,2),w=Math.min(innerWidth*.9,680),h=Math.min(innerHeight*.65,520),cols=map.width||24,rows=map.height||Math.floor(map.tiles.length/cols),pad=18,cell=Math.max(2,Math.min((w-pad*2)/cols,(h-pad*2)/rows)),ox=(w-cell*cols)/2,oy=(h-cell*rows)/2;
  mapCanvas.width=w*d;mapCanvas.height=h*d;mapCanvas.style.width=w+"px";mapCanvas.style.height=h+"px";mctx.setTransform(d,0,0,d,0,0);mctx.imageSmoothingEnabled=false;mctx.fillStyle="#091018";mctx.fillRect(0,0,w,h);
  for(const tile of map.tiles){const x=ox+tile.x*cell,y=oy+tile.y*cell;mctx.fillStyle=tile.kind==="dungeonWater"?"#245967":tile.blocked?"#182129":({hollow:"#51484a",cistern:"#36565a",kiln:"#68463a"}[map.recipe]||"#51484a");mctx.fillRect(x,y,Math.ceil(cell),Math.ceil(cell));if(!tile.blocked&&cell>9){mctx.strokeStyle="#ffffff0b";mctx.strokeRect(x,y,cell,cell)}}
  const colors={exit:"#72d7df",chest:"#d8bd83",supplyCache:"#7fc992",relayTerminal:"#b28cda",trap:"#d16b62",vine:"#77b98b",apertureDoor:"#c493dd",sealedGate:"#d16b62",deepReturn:"#7bc7d3",hubAnchor:"#e4cf7a",deepTransition:"#dbc18a",deepShortcut:"#9fd0ae",deepPortal:"#bbb4ef",storyActor:"#d9e7ef",storyScene:"#efb18f"};
  for(const o of map.objects||[]){if(!colors[o.kind]||o.state==="hidden")continue;const x=ox+(o.x+.5)*cell,y=oy+(o.y+.5)*cell;mctx.fillStyle=colors[o.kind];mctx.strokeStyle="#0b1014";mctx.lineWidth=2;mctx.beginPath();if(o.kind==="exit"||o.kind==="deepShortcut"){mctx.rect(x-cell*.32,y-cell*.42,cell*.64,cell*.84)}else if(o.kind==="trap"){mctx.moveTo(x,y-cell*.42);mctx.lineTo(x+cell*.4,y+cell*.35);mctx.lineTo(x-cell*.4,y+cell*.35);mctx.closePath()}else{mctx.arc(x,y,Math.max(3,cell*.28),0,7)}mctx.fill();mctx.stroke()}
  if(map===game.map){const px=ox+(game.player.x+.5)*cell,py=oy+(game.player.y+.5)*cell;mctx.fillStyle="#fff4a8";mctx.strokeStyle="#17140b";mctx.lineWidth=2;mctx.beginPath();mctx.arc(px,py,Math.max(4,cell*.34),0,7);mctx.fill();mctx.stroke();mctx.fillStyle="#e7ece7";mctx.font="12px monospace";mctx.fillText("YOU",px+7,py-7);}else{mctx.fillStyle="#dbc18a";mctx.font="12px monospace";mctx.fillText(`INSPECTING ${map.levelName||map.levelId}`,12,18)}
}
function drawAtlasLabels(labels,bounds,fontSize){const placed=[],overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;mctx.font=`${fontSize}px system-ui`;mctx.fillStyle="#edf3df";for(const label of labels){let text=label.name,max=bounds.right-bounds.left-10;while(text.length>4&&mctx.measureText(text).width>max)text=text.slice(0,-2)+"…";const width=mctx.measureText(text).width,candidates=[[label.x+7,label.y-5],[label.x+7,label.y+fontSize+3],[label.x-width-7,label.y-5],[label.x-width-7,label.y+fontSize+3],[label.x-width/2,label.y-fontSize],[label.x-width/2,label.y+fontSize*2]],spots=candidates.map(([cx,cy])=>{const x=Math.max(bounds.left+5,Math.min(bounds.right-width-5,cx)),y=Math.max(bounds.top+fontSize+5,Math.min(bounds.bottom-6,cy));return{x,y,left:x-2,right:x+width+2,top:y-fontSize-2,bottom:y+3}}),spot=spots.find(q=>!placed.some(p=>overlap(p,q)));if(!spot)continue;mctx.fillText(text,spot.x,spot.y);placed.push(spot)}return placed}
function drawMap() {
  if(mapMode==="dungeon"&&game.area==="dungeon")return drawDungeonMap();
  const d = Math.min(devicePixelRatio, 2),
    w = Math.min(innerWidth * 0.9, 680),
    h = Math.min(innerHeight * 0.65, 520);
  mapCanvas.width = w * d;
  mapCanvas.height = h * d;
  mapCanvas.style.width = w + "px";
  mapCanvas.style.height = h + "px";
  mctx.setTransform(d, 0, 0, d, 0, 0);
  mctx.imageSmoothingEnabled = false;
  mctx.fillStyle = "#091018";
  mctx.fillRect(0, 0, w, h);
  const signals=wayfindingCues(save.seed,game.rx,game.ry,save.worldGeneration,save,game.area==="overworld"?game.map:null),signalBySection=new Map(signals.map(q=>[`${q.targetRx},${q.targetRy}`,q])),cell = 52 * mapView.zoom,
    cols = Math.ceil(w / (2 * cell)) + 1,
    rows = Math.ceil(h / (2 * cell)) + 1;
  for (let j = -rows; j <= rows; j++)
    for (let i = -cols; i <= cols; i++) {
      const rx = mapView.x + i,
        ry = mapView.y + j,
        key = `${rx},${ry}`,
        x = w / 2 + i * cell - cell / 2 + mapView.panX,
        y = h / 2 + j * cell - cell / 2 + mapView.panY,
        seen = !!save.explored[key],signal=signalBySection.get(key),
        frontier =
          !seen &&
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].some(([a, b]) => save.explored[`${rx + a},${ry + b}`]);
      if (!seen && !frontier && !signal) continue;
      const record = save.atlas?.[key], terrain = record?.terrain || (rx===game.rx&&ry===game.ry?game.map.dominant:"ash");
      mctx.fillStyle = seen
        ? { ash: "#51464a", glass: "#315b62", ember: "#794735" }[
            terrain
          ]
        : signal ? "#241f31" : "#202833";
      mctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      mctx.strokeStyle = frontier ? "#596675" : "#9eb9b2";
      mctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
      if (seen) {
        const detailed=(rx===game.rx&&ry===game.ry)||(mapView.selected?.rx===rx&&mapView.selected?.ry===ry),sites=record?.sites||[],compact=[...new Map(sites.map(s=>[s.kind,s])).values()];
        const displaySites=detailed?sites:compact,labelSites=[];
        for (const [n,site] of displaySites.entries()) {
          const sx = detailed?x + Math.max(0.1, Math.min(0.9, (site.x + .5) / 32)) * cell:x+cell*(.32+(n%3)*.18),
            sy = detailed?y + Math.max(0.1, Math.min(0.9, (site.y + .5) / 32)) * cell:y+cell*(.42+Math.floor(n/3)*.2);
          drawAtlasSite(site.kind, sx, sy, Math.max(3, Math.min(9, cell * .095)));
          if (detailed && mapView.zoom >= 2.2) labelSites.push({name:site.name,x:sx,y:sy});
        }
        if(labelSites.length)drawAtlasLabels(labelSites,{left:x+2,top:y+2,right:x+cell-2,bottom:y+cell-2},Math.max(8,5*mapView.zoom));
        mctx.fillStyle = "#d7dedb";
        mctx.font = `${Math.max(8, 10 * mapView.zoom)}px monospace`;
        mctx.fillText(`${rx},${ry}`, x + 5, y + 14);
      }
      if(signal&&!seen){mctx.save();mctx.globalAlpha=.9;mctx.translate(x+cell/2,y+cell/2);drawWaymarkIcon(mctx,signal.signalKind,Math.max(18,cell*.72));mctx.restore();if(mapView.zoom>=1.35){mctx.fillStyle="#cfc5de";mctx.font=`${Math.max(8,8*mapView.zoom)}px monospace`;mctx.fillText("UNRESOLVED SIGNAL",x+5,y+cell-7)}}
      if (rx === game.rx && ry === game.ry) {
        mctx.fillStyle = "#fff4a8";
        mctx.beginPath();
        mctx.arc(x + cell / 2, y + cell / 2, 5, 0, 7);
        mctx.fill();
      }
      if (save.waypoint?.rx === rx && save.waypoint?.ry === ry) {
        mctx.strokeStyle = "#ef7b66";
        mctx.strokeRect(x + 8, y + 8, cell - 16, cell - 16);
      }
    }
  mctx.fillStyle = "#dce7e2";
  mctx.fillText(
    `Center ${mapView.x},${mapView.y} · ${Object.keys(save.explored).length} sections explored · ${signals.length} unresolved signals`,
    10,
    h - 10,
  );
}
const ATLAS_SYMBOLS=[
  {kind:"checkpoint",label:"Wayglass",description:"Activate it to add a fast-travel destination and make it your recovery point."},
  {kind:"shrine",label:"Singing Array",description:"A common rest point. Reaching it updates where death returns you, but it does not permit fast travel."},
  {kind:"dungeon",label:"Crossing / Glass Kiln",description:"An entrance to a bounded dungeon. A Glass Kiln is a sentinel den built around heat, traps, and stronger rewards."},
  {kind:"supplyCache",label:"Supply Cache",description:"A one-use field cache containing a deterministic equipment or material drop."},
  {kind:"shack",label:"Shelter",description:"An enterable overworld building that may hold a merchant, passive creature, ambush, or displacement device."},
  {kind:"architecturalDistrict",label:"District / Ruin",description:"A larger enterable group of buildings, streets, residents, enemies, and architectural lore."},
  {kind:"bossCue",label:"Major Danger",description:"A boss-scale or exceptional threat is associated with this section."},
  {kind:"ruinMarker",label:"Unusual Site",description:"An inspectable ruin or signal site that may reveal lore, objectives, or a distant lead."},
];
function atlasSignal(kind){return kind==="checkpoint"?"beacon":kind==="shrine"?"array":kind==="dungeon"?"crossing":kind==="bossCue"?"danger":kind==="shack"?"shack":kind==="architecturalDistrict"?"district":kind==="supplyCache"?"cache":"event"}
function drawAtlasGlyph(context,kind,x,y,size){
  const signal=atlasSignal(kind),colors={beacon:"#72d7df",array:"#8ed1c1",crossing:"#d5a464",danger:"#d16b62",event:"#a68ad2",shack:"#d8bd83",district:"#c9a58b",cache:"#d7b96f"};context.save();context.translate(x,y);context.lineWidth=Math.max(1.4,size*.22);context.strokeStyle=colors[signal];context.fillStyle=context.strokeStyle;context.beginPath();
  if(signal==="beacon")context.arc(0,0,size*.7,0,Math.PI*1.65);else if(signal==="array"){context.arc(0,0,size*.62,0,Math.PI*2);context.moveTo(-size*.7,0);context.lineTo(size*.7,0);context.moveTo(0,-size*.7);context.lineTo(0,size*.7)}else if(signal==="cache"){context.rect(-size*.65,-size*.45,size*1.3,size*.9);context.moveTo(-size*.65,-size*.12);context.lineTo(size*.65,-size*.12)}else if(signal==="crossing"){context.moveTo(-size*.7,-size*.55);context.lineTo(size*.55,0);context.lineTo(-size*.7,size*.55)}else if(signal==="danger"){context.moveTo(-size*.65,size*.6);context.lineTo(0,-size*.75);context.lineTo(size*.65,size*.6);context.closePath()}else if(signal==="shack"){context.moveTo(-size*.75,0);context.lineTo(0,-size*.7);context.lineTo(size*.75,0);context.lineTo(size*.55,0);context.lineTo(size*.55,size*.7);context.lineTo(-size*.55,size*.7);context.lineTo(-size*.55,0);context.closePath()}else if(signal==="district"){context.rect(-size*.65,-size*.65,size*1.3,size*1.3);context.moveTo(-size*.65,0);context.lineTo(size*.65,0);context.moveTo(0,-size*.65);context.lineTo(0,size*.65)}else{context.arc(0,0,size*.65,0,Math.PI*1.5);context.lineTo(size*.75,0)}context.stroke();if(signal==="danger"){context.beginPath();context.moveTo(0,-size*.75);context.lineTo(-size*.18,-size*.42);context.lineTo(size*.18,-size*.42);context.closePath();context.fill()}else if(["beacon","crossing","event"].includes(signal)){context.beginPath();context.moveTo(size*.72,0);context.lineTo(size*1.05,-size*.3);context.lineTo(size*1.05,size*.3);context.closePath();context.fill()}context.restore();
}
function drawAtlasSite(kind,x,y,size){drawAtlasGlyph(mctx,kind,x,y,size)}
function atlasMark(kind){const canvas=document.createElement("canvas");canvas.width=canvas.height=44;canvas.className="atlas-symbol";canvas.setAttribute("role","img");canvas.setAttribute("aria-label",ATLAS_SYMBOLS.find(q=>q.kind===kind)?.label||kind);const context=canvas.getContext("2d");if(context)drawAtlasGlyph(context,kind,22,22,13);return canvas}
function renderAtlasLegend(){const legend=$("#mapLegend");legend.replaceChildren();for(const symbol of ATLAS_SYMBOLS){const item=document.createElement("span");item.className="atlas-legend-item";item.append(atlasMark(symbol.kind),document.createTextNode(symbol.label));legend.append(item)}}
function refreshWayglassDestinations(){
  const select=$("#mapWayglassSelect"),prior=select.value,entries=Object.entries(save.checkpoints||{}).sort((a,b)=>(a[1].name||a[0]).localeCompare(b[1].name||b[0]));
  select.replaceChildren(...entries.map(([key,c])=>{const option=document.createElement("option");option.value=key;option.textContent=`${c.name||"Wayglass"} · ${c.rx},${c.ry}`;return option}));
  const selected=mapView.selected&&`${mapView.selected.rx},${mapView.selected.ry}`,active=save.activeCheckpoint&&`${save.activeCheckpoint.rx},${save.activeCheckpoint.ry}`;
  select.value=save.checkpoints?.[selected]?selected:save.checkpoints?.[prior]?prior:active||entries[0]?.[0]||"";
}
function selectedWayglassKey(){const explicit=$("#mapWayglassSelect")?.value;if(save.checkpoints?.[explicit])return explicit;const q=mapView.selected,key=q&&`${q.rx},${q.ry}`;return save.checkpoints?.[key]?key:null}
function updateMapTravelButton() {
  const travel = $("#mapTravel"), selected = mapView.selected,
    checkpoint = save.checkpoints?.[selectedWayglassKey()] || (selected && save.checkpoints?.[`${selected.rx},${selected.ry}`]);
  travel.textContent = game.area === "dungeon"
    ? `Use Crossing Sigil ×${save.consumables.crossingSigil || 0}`
    : checkpoint
      ? `Travel to ${checkpoint.name || "Wayglass"}`
      : "Return to active checkpoint";
  travel.disabled = game.area === "dungeon" && !(save.consumables.crossingSigil > 0);
  $("#mapHome").disabled = game.area === "dungeon";
}
function updateMapModeUI(){
  const dungeon=game.area==="dungeon",local=dungeon&&mapMode==="dungeon";
  $("#mapModeToggle").hidden=!dungeon;$("#mapModeToggle").textContent=local?"Corridor Atlas":"Dungeon Map";$("#mapTitle").textContent=local?`${game.map.name||"Dungeon"} Map`:"Corridor Atlas";atlas.querySelector(".maptools").hidden=local;$("#mapHome").hidden=local;$("#mapWaypoint").hidden=local;$("#mapLegend").hidden=local;const picker=$("#dungeonLevelPicker"),select=$("#dungeonLevelSelect"),progress=game.map.deepProgress;picker.hidden=!local||!game.map.multiLevel;if(!picker.hidden){const discovered=new Set(progress?.discoveredLevelIds||[game.map.levelId]);select.replaceChildren(...(game.map.levels||[]).filter(q=>discovered.has(q.id)).map(q=>{const option=document.createElement("option");option.value=q.id;option.textContent=`${q.index+1}. ${q.name}${q.id===game.map.levelId?" · current":""}`;return option}));if(![...select.options].some(q=>q.value===select.value))select.value=game.map.levelId;}$("#mapInstructions").textContent=local?"A bounded floor plan. Gold marks your current position. Use Discovered level to inspect known floors; hidden routes and levels remain absent until found.":"Tap an explored section to select it, then press Set waypoint. The center compass points toward that manual destination before quest guidance.";
  if(local){const cols=game.map.width||24,rows=game.map.height||Math.floor(game.map.tiles.length/cols),progress=game.map.deepProgress,required=progress?.requiredObjectiveIds?.length||game.map.objectives?.filter(q=>q.required).length||game.map.wings?.length||0,done=game.map.recipe==="deep-v1"?(progress?.defeatedWingIds?.length||0):(progress?.completedObjectiveIds?.length||0),deep=(game.map.deepDungeon||game.map.recipe==="deep-v1")?` · ${game.map.archetype||"threefold"}${game.map.multiLevel?` · level ${game.map.levelName}`:""} · objectives ${done}/${required}${progress?.gateOpened?" · final gate open":""}${progress?.activeAnchor?` · recovery ${progress.activeAnchor.name}`:""}`:"";$("#mapDetail").textContent=`${game.map.identity||"Dungeon"} · bounded ${cols} × ${rows} floor${deep} · position ${Math.floor(game.player.x)}, ${Math.floor(game.player.y)}`;}
  updateMapWaypointButton();
  updateMapTravelButton();
}
function updateMapWaypointButton(){const button=$("#mapWaypoint"),selected=mapView.selected,same=selected&&save.waypoint?.rx===selected.rx&&save.waypoint?.ry===selected.ry;button.disabled=!selected||!save.explored[`${selected.rx},${selected.ry}`];button.textContent=same?"Clear selected waypoint":"Set waypoint to selected section"}
function showMapDetail(rx, ry) {
  const key = `${rx},${ry}`;
  if (!save.explored[key]) {
    mapView.selected = null;
    $("#mapDetail").textContent =
      `Section ${rx}, ${ry} · uncharted. No terrain or landmark data has been recorded.`;
    updateMapWaypointButton();
    updateMapTravelButton();
    return false;
  }
  mapView.selected = { rx, ry };
  if(save.checkpoints?.[key])$("#mapWayglassSelect").value=key;
  const s = sectionSummary(save.seed, rx, ry, save.worldGeneration, save);
  const sites = s.sites.length ? ` · sites: ${s.sites.map((q) => q.name).join(", ")}` : " · no discovered sites";
  $("#mapDetail").textContent =
    `Section ${rx}, ${ry} · ${s.terrain} terrain${sites}${s.checkpoint ? " · checkpoint" : ""}${s.current ? " · current" : ""}${s.waypoint ? " · waypoint" : ""}`;
  updateMapWaypointButton();
  updateMapTravelButton();
  return true;
}
function openMap() {
  atlasOpenedAt = performance.now();
  pauseForOverlay();
  if (pausePanel.open) pausePanel.close();
  mapView.x = game.rx;
  mapView.y = game.ry;
  mapMode = game.area === "dungeon" ? "dungeon" : "atlas";
  if (!atlas.open) atlas.showModal();
  refreshWayglassDestinations();
  renderAtlasLegend();
  updateMapModeUI();
  if(mapMode==="atlas")showMapDetail(game.rx, game.ry);
  drawMap();
}
function openPack() {
  pauseForOverlay();
  if (pausePanel.open) pausePanel.close();
  body.replaceChildren();
  const heading = document.createElement("h2"),
    summary = document.createElement("p"),
    xp = document.createElement("progress"),
    derived = characterStats(save);
  heading.textContent = String(save.name);
  summary.textContent = `LEVEL ${save.level} · XP ${save.xp}/${save.nextXp} · ${save.statPoints} stat point${save.statPoints === 1 ? "" : "s"} available · ${save.currency} marks`;
  xp.className = "level-progress";
  xp.max = save.nextXp;
  xp.value = save.xp;
  const character = document.createElement("div");
  character.className = "character-summary";
  for (const text of [
    `${save.maxHp} maximum health`,
    `${save.maxStamina} maximum stamina`,
    `${Math.round(derived.damageReduction * 100)}% damage resistance`,
    `+${derived.meleeBonus} melee bonus`,
    `+${derived.magicBonus} spell/projectile bonus`,
    `+${Math.round(derived.attackReach*100)}% melee and projectile reach`,
  ]) {
    const span = document.createElement("span");
    span.textContent = text;
    character.append(span);
  }
  body.append(heading, summary, xp, character);
  for(const [kind,label] of [['weapon','Weapon sphere'],['armor','Armor sphere']]){const row=document.createElement('div'),key=kind+'Sphere';row.className='item';row.textContent=`${label} ×${save.materials[key]||0}`;row.append(uiButton('Fuse',()=>{game.useUpgradeSphere(kind);persist();openPack()}));body.append(row)}
  const statHelp = {
    Might: "+2 melee damage per rank.",
    Finesse: "+3 maximum stamina per rank.",
    Focus: "+1 spell and projectile damage per rank.",
    Vigor: "+8 maximum health per rank.",
    Resolve: "+2% damage resistance per rank.",
  };
  for (const stat of STATS) {
    const row = document.createElement("div"),
      name = document.createElement("strong"),
      help = document.createElement("small");
    row.className = "item stat-row";
    name.textContent = `${stat} ${save.stats[stat]}`;
    help.textContent = statHelp[stat];
    row.append(name, help);
    if (save.statPoints)
      row.append(
        uiButton("Increase", () => {
          game.allocate(stat);
          persist();
          openPack();
        }),
      );
    body.append(row);
  }
  const resource = document.createElement("p");
  resource.textContent = `Cinder Iron ${save.materials.cinderIron} · weapon +${save.weaponLevel || 0} · section ${game.rx},${game.ry} `;
  resource.append(uiButton("Reinforce weapon · 3 iron", () => {
    game.upgrade();
    persist();
    openPack();
  }));
  body.append(resource);
  const gearHeading = document.createElement("h3");
  gearHeading.textContent = "Equipped gear and effects";
  const gear = document.createElement("div");
  gear.className = "gear-grid";
  for (const slot of ["primary", "secondary", "armor", "charm"]) {
    const item = save.equipment[slot],
      card = document.createElement("div");
    card.className = "gear-card";
    card.dataset.slot = slot;
    const baseEffect =
      slot === "armor"
        ? `${(Number(item?.power || 0) * 2.5).toFixed(1)}% resistance`
        : slot === "charm"
          ? `${Number(item?.power || 0)}% resistance`
          : slot === "primary"
            ? `power ${item?.power || 0}; contributes to melee damage`
            : `power ${item?.power || 0}; contributes to projectile and spell damage`,
      affixes = describeAffixes(item),
      effect = `${item ? itemTier(item).toUpperCase() + " · " : ""}${baseEffect}${affixes.length ? " · " + affixes.join(" · ") : ""}`;
    const label=document.createElement("small"),name=document.createElement("strong"),detail=document.createElement("span");label.textContent=slot.toUpperCase();name.textContent=item?.name||"Empty slot";detail.textContent=effect;card.append(gearIcon(item,slot),label,name,detail);
    gear.append(card);
  }
  body.append(gearHeading, gear);
  const spellTitle = document.createElement("p");
  spellTitle.textContent = "Equipped spell — choose a cooldown/power profile:";
  body.append(spellTitle);
  for (const spell of Object.values(SPELLS)) {
    const row = document.createElement("div");
    row.className = "item inventory-card";
    row.dataset.slot = "spell";
    row.textContent = `${spell.name} · ${spell.cooldown}s cooldown · power ${spell.damage}`;
    row.append(
      uiButton(save.equippedSpell === spell.id ? "Equipped" : "Equip", () => {
        save.equippedSpell = spell.id;
        persist();
        openPack();
      }),
    );
    body.append(row);
  }
  for (const [type, name, description] of [
    [
      "restorativeDraught",
      "Restorative Draught",
      "Heals 30 health; never consumed at full health.",
    ],
    [
      "ironbarkTonic",
      "Ironbark Tonic",
      "Reduces incoming damage by 35% for 45 seconds.",
    ],
    [
      "lumenPhial",
      "Lumen Phial",
      "Empowers magic projectiles by 40% for 45 seconds.",
    ],
    ["clearrootAmpoule","Clearroot Ampoule","Immediately ends elite poison."],
  ]) {
    const row = document.createElement("div"),
      title = document.createElement("strong"),
      text = document.createElement("p");
    row.className = "item consumable";
    title.textContent = `${name} ×${save.consumables[type] || 0}`;
    text.textContent = description;
    row.append(
      title,
      text,
      uiButton("Use", () => {
        game.useConsumable(type, performance.now());
        persist();
        openPack();
      }),
    );
    body.append(row);
  }
  const inventoryHeading = document.createElement("h3");
  inventoryHeading.textContent = `Carried equipment (${save.inventory.length}/${EQUIPMENT_CAPACITY})`;
  body.append(inventoryHeading);
  const inventoryTools = document.createElement("div"),
    slotFilter = document.createElement("select"),
    tierFilter = document.createElement("select"),
    sortFilter = document.createElement("select"),
    makeOptions = (select, values, selected) => {
      select.replaceChildren(...values.map(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = value === selected;
        return option;
      }));
    };
  inventoryTools.className = "inventory-tools";
  makeOptions(slotFilter, [["all","All gear"],["primary","Primary"],["secondary","Secondary"],["armor","Armor"],["charm","Charms"]], inventoryView.slot);
  makeOptions(tierFilter, [["all","All tiers"],...ITEM_TIERS.map((q) => [q, q.toUpperCase()])], inventoryView.tier);
  makeOptions(sortFilter, [["score","Best first"],["power","Power"],["name","Name"],["slot","Type"]], inventoryView.sort);
  slotFilter.onchange = () => { inventoryView.slot = slotFilter.value; openPack(); };
  tierFilter.onchange = () => { inventoryView.tier = tierFilter.value; openPack(); };
  sortFilter.onchange = () => { inventoryView.sort = sortFilter.value; openPack(); };
  inventoryTools.append(slotFilter, tierFilter, sortFilter);
  body.append(inventoryTools);
  const visibleItems = save.inventory.map((item, index) => ({ item, index }))
    .filter(({item}) => inventoryView.slot === "all" || item.slot === inventoryView.slot)
    .filter(({item}) => inventoryView.tier === "all" || itemTier(item) === inventoryView.tier)
    .sort((a,b) => inventoryView.sort === "name" ? a.item.name.localeCompare(b.item.name)
      : inventoryView.sort === "slot" ? a.item.slot.localeCompare(b.item.slot) || itemScore(b.item)-itemScore(a.item)
      : inventoryView.sort === "power" ? b.item.power-a.item.power : itemScore(b.item)-itemScore(a.item));
  for (const { item, index: i } of visibleItems) {
    if (!["primary", "secondary", "armor", "charm"].includes(item.slot))
      continue;
    const row = document.createElement("div"),title=document.createElement("strong"),comparison=document.createElement("div");
    row.className = "item inventory-card";comparison.className="item-comparison";
    title.textContent = `${itemTier(item).toUpperCase()} · ${item.name} · ${item.slot}`;
    for(const stat of compareItemStats(item,save.equipment[item.slot])){const value=document.createElement("span");value.className=`stat-${stat.direction}`;value.textContent=`${stat.direction==='up'?'↑ ':stat.direction==='down'?'↓ ':''}${stat.label} ${stat.formatted}`;value.title=stat.direction==='same'?`Matches equipped ${stat.label.toLowerCase()}`:`${Math.abs(stat.difference)} ${stat.direction==='up'?'more':'less'} than equipped`;comparison.append(value)}
    row.append(
      title,
      comparison,
      uiButton("Equip", () => {
        equipFromInventory(save, i);
        persist();
        openPack();
      }),
      uiButton("Salvage", () => {
        salvageInventoryItem(save, i);
        persist();
        openPack();
      }),
    );
    body.append(row);
  }
  if (!panel.open) panel.showModal();
}
const CODEX = {
  creatures: {
    ashling:["Ashling","A scavenger shaped by furnace dust; closes carefully for a short strike."],glassMite:["Glass Mite","A low crystal feeder whose small frame hides a quick bite."],sparkWarden:["Spark Warden","A walking conductor that launches visible bolts across distance."],ashenHound:["Ashen Hound","A fast pack hunter following heat and fresh tracks."],veilMoth:["Veil Moth","A drifting predator that casts force from beyond sword reach."],rootBrute:["Root Brute","A slow, durable growth animated by buried machinery."],coilStalker:["Coil Stalker","A patient hybrid that pressures from the middle distance."],cinderWisp:["Cinder Wisp","A fragile ember-spirit dangerous while it remains at range."],voidSentinel:["Void Sentinel","A rare floating hunter whose independently curling appendages frame a long-range bolt."],hollowMarshal:["Hollow Marshal","A dungeon guardian carrying the authority of a dead crossing."],riftColossus:["Rift Colossus","A world-scale anomaly gathered into predatory mass."],mossGrazer:["Moss Grazer","A quiet corridor browser that grazes among ashwood growths."],lanternDoe:["Lantern Doe","A curious light-bearing animal that may follow a patient Wayfarer."],hushling:["Hushling","A shy violet presence that disappears when approached directly."],gateRevenant:["Gate Revenant","An exceptionally rare dungeon predator that remembers fear, crosses an open gate, and should be escaped long before it can be killed."]
  },
  places: {
    "terrain:ash":["Ash Verge","Dry chambers where furnace residue gathers."],"terrain:glass":["Glass Reach","Cold mineral corridors that hold light too long."],"terrain:ember":["Ember Vault","Heat-scarred rooms surrounding old power lines."],"dungeon:hollow":["Hollow Relay","Separated halls joined by a failing relay."],"dungeon:cistern":["Root-Sunk Cistern","A salvage vault overtaken by roots and standing water."],"dungeon:kiln":["Glass Kiln","A sentinel den built around heat and mechanical traps."],"settlement:glasshaven":["Glasshaven","A sparse settlement of traders and glassworkers."],"settlement:coilmarket":["Coilmarket","A waystation built around signal salvage."],"district:city":["Hollow Ward","An abandoned city block of enterable apartments and monster-haunted streets."],"district:arcology":["Lumen Arcology","Futuristic relay structures whose upper facades still carry stray current."],"district:cloister":["Thorn Cloister","An old shrine compound of courts, sanctums, and weathered ceremonial walls."]
  },
  features: {
    shrine:["Singing Array","A machine-shrine and intermediate rest point. Reaching it changes where death returns you, but does not unlock Atlas travel."],checkpoint:["Wayglass Beacon","An activated beacon permits Atlas fast travel and also becomes your active recovery point."],supplyCache:["Supply Cache","A one-use field cache containing a deterministic equipment or material drop."],ruinMarker:["Broken Observatory","A collapsed instrument still pointing beyond the visible corridor."],dungeon:["Buried Crossing","A sealed route into a self-contained dungeon. Named crossings such as Glass Kilns have their own traps, guardians, and rewards."],shack:["Wayfarer Shack","A roofed field shelter whose interior remains part of the overworld."],architecturalDistrict:["Architectural District","A rare overworld complex with enterable structures, streets, and its own unresolved history."],tree:["Ashwood Grove","Trees may be cut or ignited through Act."],rock:["Shiftstone","Boulders may be moved or broken with sufficient Might."],relayTerminal:["Crossing Terminal","A consequential relay interface."],"trap:fire":["Kiln Vent","Scorch marks warn of a directional fire trap."],"trap:spikes":["Crossing Spikes","Floor seams can reveal the trap before it rises."],vine:["Transit Vine","A living traversal line spanning an otherwise impassable gap."],bossCue:["Colossus Trace","A sign that something much larger inhabits the region."]
  }
};
const STAT_GLOSSARY=[
  ["Power","An item's base strength. Primary-weapon Power contributes to melee damage; secondary-weapon Power contributes to projectile and spell damage; armor Power grants 2.5% resistance per point; charm Power grants 1% resistance per point."],
  ["Attack","A flat damage bonus supplied by an item affix. On a primary weapon it improves melee attacks; on a secondary weapon it improves projectiles and spells."],
  ["Reach","A percentage increase to both melee range and projectile travel distance. Reach does not enlarge explosions or spell areas."],
  ["Blast radius","The fixed area affected by a bomb or explosive projectile. It is determined by the weapon profile and is separate from Reach."],
  ["Spell radius","The fixed area affected by a spell pulse. Reach does not change it."],
  ["Might","Each rank adds 2 melee damage."],
  ["Focus","Each rank adds 1 projectile and spell damage."],
  ["Finesse","Each rank adds 3 maximum stamina."],
  ["Vigor","Each rank adds 8 maximum health."],
  ["Resolve","Each rank adds 2% damage resistance."],
  ["Resistance","Reduces incoming damage, up to the current 45% cap. Armor, charms, Resolve, and Ward affixes contribute."],
  ["Movement","A percentage increase to ordinary movement speed; it does not reduce stamina costs."],
];
const PLACE_LORE={
  "terrain:ash":"The Ash Verge is the Corridor after heat has departed: relay dust, exhausted furnaces, and paths repeatedly buried by their own residue. Its openness makes travel legible, but tracks remain visible to hunters.",
  "terrain:glass":"Glass Reaches formed where old transmission heat vitrified the Corridor walls. Light and motion persist in their mineral seams, causing signals to echo long after their senders have vanished.",
  "terrain:ember":"Ember Vaults surround dormant power lines that never cooled completely. Their warmth sustains unusual growth, wakes damaged machinery, and draws creatures that feed on residual current.",
  "dungeon:hollow":"The Hollow Relay was once a controlled transfer station between distant regions. Its missing operators left the route repeating incomplete commands, and each restored circuit risks teaching the wider Corridor how to find Ember Refuge.",
  "dungeon:cistern":"The Root-Sunk Cistern stored coolant and drinking water for a vanished settlement. Roots now brace its flooded chambers, conceal salvage vaults, and remember every vibration moving through the water.",
  "dungeon:kiln":"A Glass Kiln fused signal crystal, weapons, and architectural glass under sentinel supervision. Its mechanical wardens still treat living intruders as contaminated material to be sorted, burned, and recast.",
  "settlement:glasshaven":"Glasshaven survives by reading flaws in recovered signal glass. Its traders know that every polished lens can reveal a route—and that some routes look back.",
  "settlement:coilmarket":"Coilmarket is a temporary town that became permanent around piles of relay salvage. Its residents barter in repair, rumor, and the safe disposal of devices whose original purposes are better forgotten.",
  "district:city":"The Hollow Ward preserves the ordinary scale of lost Corridor life: apartments, markets, infirmaries, and civic halls. Its emptiness makes every intact room feel recently abandoned.",
  "district:arcology":"The Lumen Arcology concentrated housing, transit, and signal research into vertical relay blocks. Stray current still crosses its facades, and sealed laboratories continue experiments without witnesses.",
  "district:cloister":"The Thorn Cloister treated the Corridor as a sacred wound rather than a machine. Its courts and sanctums preserve rites meant to calm crossings, though many symbols now answer to something else."
};
function placeMark(id){const canvas=document.createElement("canvas"),context=canvas.getContext("2d"),kind=id.split(":")[0],h=hashSeed(id),colors={terrain:"#75928c",dungeon:"#d5a464",settlement:"#d8bd83",district:"#a98bd4"};canvas.width=canvas.height=64;canvas.className=`place-symbol place-${kind}`;canvas.setAttribute("role","img");canvas.setAttribute("aria-label",`${kind} place sigil`);context.translate(32,32);context.strokeStyle=colors[kind]||"#c8bda4";context.fillStyle=context.strokeStyle;context.lineWidth=4;context.beginPath();if(kind==="terrain"){for(let y=-12;y<=12;y+=12){context.moveTo(-20,y);context.quadraticCurveTo(-8+(h%7),y-8,2,y);context.quadraticCurveTo(12,y+8,20,y)}}else if(kind==="dungeon"){context.moveTo(-18,20);context.lineTo(-18,-4);context.quadraticCurveTo(0,-28,18,-4);context.lineTo(18,20);context.moveTo(-8,20);context.lineTo(-8,2);context.quadraticCurveTo(0,-9,8,2);context.lineTo(8,20)}else if(kind==="settlement"){context.moveTo(-23,2);context.lineTo(0,-18);context.lineTo(23,2);context.moveTo(-17,-1);context.lineTo(-17,20);context.lineTo(17,20);context.lineTo(17,-1);context.moveTo(0,-18);context.lineTo(0,20)}else{context.rect(-21,-21,17,17);context.rect(4,-21,17,17);context.rect(-21,4,17,17);context.rect(4,4,17,17)}context.stroke();return canvas}
function placeDetails(id,entry){const details=document.createElement("details"),summary=document.createElement("summary"),intro=document.createElement("p"),lore=document.createElement("p");details.className="place-details";summary.textContent=entry[0];intro.textContent=entry[1];lore.className="place-lore";lore.textContent=PLACE_LORE[id]||"This place has entered the Wayfarer's record, but its deeper relation to the Corridor remains unresolved.";details.append(summary,intro,lore);return details}
const FEATURE_LORE={
  shrine:"Singing Arrays translate old relay harmonics into memory and direction. Their field is stable enough to recover a fallen Wayfarer, but too local to carry a living traveler between sections.",
  checkpoint:"Wayglass uses paired signal glass to hold a route open across the Atlas. Activation records both the physical beacon and the Wayfarer's current recovery line.",
  supplyCache:"These sealed caches were distributed for maintenance crews who never returned. Their contents remain deterministic because each lock recognizes a single finder and then burns out.",
  ruinMarker:"Observatories and signal ruins do not transport travelers; they preserve intent. Inspecting one may expose a coordinate, story fact, or unresolved lead.",
  dungeon:"A buried Crossing is a bounded route folded away from the overworld. Its internal state persists independently until the Wayfarer resolves or abandons it.",
  shack:"Field shelters belong to the overworld rather than a separate instance. Their occupants can leave, pursue, trade, hide, or turn the structure into an ambush.",
  architecturalDistrict:"Districts preserve several enterable buildings and streets in one section. Their scale supports local histories, residents, merchants, and enemies beyond the roadside shelter system.",
  tree:"Ashwood stores heat and can alter traversal when cut near a bank. Some growths hide paths; others become crossings.",
  rock:"Shiftstone is dense relay aggregate. Sufficient force can move or break it, permanently changing the section.",
  relayTerminal:"A Crossing Terminal changes persistent story state. Its choices are consequential and cannot always be reversed.",
  "trap:fire":"Kiln Vents announce a directional burn before ignition. Their scorch geometry is the warning and the damage boundary.",
  "trap:spikes":"Crossing Spikes hide below visible floor seams. Timing, jumping, and careful movement matter more than raw defense.",
  vine:"Transit Vines are living lines across otherwise impassable gaps. Traversal commits the Wayfarer until the crossing completes.",
  bossCue:"A Colossus Trace is evidence of an exceptional creature rather than the creature itself. Its presence marks a section where preparation or retreat is warranted."
};
const FEATURE_VISUAL={tree:"A branching ashwood silhouette rooted directly in the floor.",rock:"A low faceted boulder with an angular mineral outline.",relayTerminal:"A narrow console with a bright central command line.","trap:fire":"A vent grate marked by warm orange slits and old scorch lines.","trap:spikes":"A row of triangular floor seams; the points rise from those exact lines.",vine:"A curved living cable spanning a visible gap.",bossCue:"A large red triangular trace and disturbed ground marking a threat far larger than an ordinary creature."};
function featureMark(id){if(ATLAS_SYMBOLS.some(q=>q.kind===id))return atlasMark(id);const canvas=document.createElement("canvas"),context=canvas.getContext("2d");canvas.width=canvas.height=64;canvas.className="place-symbol feature-symbol";canvas.setAttribute("role","img");canvas.setAttribute("aria-label",FEATURE_VISUAL[id]||`${id} field silhouette`);context.translate(32,32);context.strokeStyle=id==="bossCue"?"#d16b62":id.startsWith("trap:")?"#df9a61":"#9fc1ae";context.fillStyle=context.strokeStyle;context.lineWidth=4;context.beginPath();
  if(id==="tree"){context.moveTo(0,24);context.lineTo(0,-20);context.moveTo(0,-9);context.lineTo(-17,-22);context.moveTo(0,-3);context.lineTo(18,-17);context.moveTo(0,8);context.lineTo(-13,0)}
  else if(id==="rock"){context.moveTo(-23,12);context.lineTo(-14,-13);context.lineTo(5,-22);context.lineTo(23,-3);context.lineTo(17,18);context.lineTo(-12,21);context.closePath();context.moveTo(-14,-13);context.lineTo(4,4);context.lineTo(23,-3)}
  else if(id==="relayTerminal"){context.rect(-16,-24,32,48);context.moveTo(-9,-11);context.lineTo(9,-11);context.moveTo(-9,0);context.lineTo(9,0);context.moveTo(-9,11);context.lineTo(2,11)}
  else if(id==="trap:fire"){context.rect(-22,8,44,13);for(let x=-15;x<=15;x+=10){context.moveTo(x,8);context.quadraticCurveTo(x-8,-5,x,-22);context.quadraticCurveTo(x+8,-6,x,8)}}
  else if(id==="trap:spikes"){for(let x=-24;x<24;x+=12){context.moveTo(x,19);context.lineTo(x+6,-19);context.lineTo(x+12,19)}}
  else if(id==="vine"){context.moveTo(-25,18);context.bezierCurveTo(-12,-27,8,28,25,-18);context.moveTo(-9,-9);context.lineTo(-18,-18);context.moveTo(10,8);context.lineTo(19,17)}
  else if(id==="bossCue"){context.moveTo(-24,21);context.lineTo(0,-26);context.lineTo(24,21);context.closePath();context.moveTo(-7,8);context.lineTo(0,-8);context.lineTo(7,8)}
  else{context.arc(0,0,21,0,7)}context.stroke();return canvas}
function featureDetails(id,entry){const details=document.createElement("details"),summary=document.createElement("summary"),functionText=document.createElement("p"),visual=document.createElement("p"),lore=document.createElement("p");details.className="place-details feature-details";summary.textContent=entry[0];functionText.textContent="FIELD FUNCTION — "+entry[1];visual.textContent="VISUAL CUE — "+(FEATURE_VISUAL[id]||"Its Atlas symbol and field silhouette are shown at left.");lore.className="place-lore";lore.textContent="CORRIDOR RECORD — "+(FEATURE_LORE[id]||"Its deeper purpose has not yet been recovered.");details.append(summary,functionText,visual,lore);return details}
const CREATURE_PORTRAITS={ashling:[0,0],glassMite:[1,0],sparkWarden:[2,0],coilStalker:[3,0],veilMoth:[0,1],rootBrute:[1,1],cinderWisp:[2,1],voidSentinel:[3,1],riftColossus:[3,1],ashenHound:[0,0],hollowMarshal:[2,0],mossGrazer:[1,1],lanternDoe:[0,0],hushling:[0,1],gateRevenant:[3,1]};
Object.assign(CODEX.creatures,{vesperwing:['Vesperwing — The Ashen Meridian','A winged elite that dives and casts from range. Its additional aspects are fixed by the encounter seed.'],gravitantBell:['Gravitant Bell — The Weight Below','A hovering elite whose readable gravity field pulls loose bodies inward before a radial strike.'],mireApostle:['Mire Apostle — Saint of the Low Water','A plated ooze beast that leaves bounded venom pools and carries Clearroot in its drowned shell.'],knifeChoir:['Choir of Knives — The Divided Cantor','A segmented summoner whose orbiting shard-creatures are capped and yield no rewards.']});
const ELITE_PORTRAITS={vesperwing:[0,0],gravitantBell:[1,0],mireApostle:[2,0],knifeChoir:[3,0]};
function trailMark(kind){const canvas=document.createElement("canvas"),signal={ring:"beacon",chevron:"crossing",triangle:"danger",spiral:"event"}[kind];canvas.width=canvas.height=96;const ctx=canvas.getContext("2d");canvas.className=`trail-symbol ${kind}`;canvas.setAttribute("role","img");canvas.setAttribute("aria-label",`${signal} floor mark pointing right`);if(ctx){ctx.translate(48,48);drawWaymarkIcon(ctx,signal,82)}return canvas}
const TRAIT_MARKS={plated:["◆","armor"],feral:["▲","damage"],swift:["»","speed"],vital:["●","vitality"],keen:["✦","precision"],farcasting:["⌁","range"],orbital:["◎","orbit"]};
function traitBadge(id){const meta=CREATURE_TRAITS[id]||{name:id,text:"Unknown trait."},mark=TRAIT_MARKS[id]||["·","unknown"],badge=document.createElement("span");badge.className=`trait-badge trait-${id}`;badge.textContent=`${mark[0]} ${meta.name}`;badge.title=`${mark[1]} — ${meta.text}`;return badge}
function openCreatureViewer(id,name,coords,elite){const dialog=$("#creatureViewer"),canvas=$("#creatureViewerCanvas"),context=canvas.getContext("2d"),image=new Image(),[column,row]=coords;$("#creatureViewerTitle").textContent=name;context.clearRect(0,0,canvas.width,canvas.height);image.onload=()=>{const columns=4,rows=elite?1:2,sw=image.naturalWidth/columns,sh=image.naturalHeight/rows,side=Math.min(sw,sh),sx=column*sw+(sw-side)/2,sy=row*sh+(sh-side)/2;context.imageSmoothingEnabled=false;context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,sx,sy,side,side,0,0,canvas.width,canvas.height)};image.src=elite?"./assets/elite-bestiary-atlas-v1-wide.png":"./assets/bestiary-atlas-v1.png";if(!dialog.open)dialog.showModal()}
function creatureVariants(kind,baseName){const variants=Object.values(save.codex?.variants||{}).filter(v=>v.kind===kind&&v.traits?.length),details=document.createElement("details"),summary=document.createElement("summary"),list=document.createElement("div");details.className="creature-details";summary.textContent=baseName;list.className="variant-list";for(const variant of variants){const row=document.createElement("div"),name=document.createElement("strong"),badges=document.createElement("div");row.className="variant-entry";name.textContent=variant.traits.map(t=>CREATURE_TRAITS[t]?.name||t).join(" ")+" "+baseName;badges.className="trait-badges";for(const trait of variant.traits)badges.append(traitBadge(trait));row.append(name,badges);list.append(row)}if(!variants.length){const empty=document.createElement("p");empty.textContent="No variants of this creature have been recorded yet.";list.append(empty)}details.append(summary,list);return details}
function openJournal(mode = "chronicle") {
  if(typeof mode!=="string")mode="chronicle";
  pauseForOverlay();
  if (pausePanel.open) pausePanel.close();
  const out = $("#journalBody");
  out.replaceChildren();
  const nav=document.createElement("div");nav.className="codex-tabs";
  for(const [id,label] of [["chronicle","Chronicle"],["dungeons","Deep expeditions"],["creatures","Creatures"],["places","Places"],["features","Encountered features"],["rules","Symbols & controls"],["glossary","Glossary"]])nav.append(uiButton(label,()=>openJournal(id)));
  out.append(nav);
  if(mode!=="chronicle"){
    if(mode==="dungeons"){
      const heading=document.createElement("h3");heading.textContent="Deep expeditions";out.append(heading);
      const records=Object.entries(save.consequences?.dungeons||{}).filter(([,h])=>h.deep?.name);
      if(!records.length){const empty=document.createElement("p");empty.textContent="No deep landmark has been entered yet.";out.append(empty)}
      for(const[id,h]of records){const p=h.deep,article=document.createElement("article"),title=document.createElement("h3"),text=document.createElement("p"),story=document.createElement("p");article.className="item codex-card place-card";title.textContent=`${p.name} · ${p.archetype}`;text.textContent=`Objectives ${p.completedObjectiveIds?.length||p.defeatedWingIds?.length||0}/${p.requiredObjectiveIds?.length||3} · discovered levels ${p.discoveredLevelIds?.length||1} · recovery ${p.activeAnchor?.name||"entrance"} · opened routes ${p.openedShortcutIds?.length||p.defeatedWingIds?.length||0} · ${p.completed?"cleared":"unresolved"}.`;story.textContent=p.story?.started?`Story: ${p.story.storyId} · beats ${p.story.completedBeatIds?.length||0} · scenes ${p.story.scenesWitnessed?.length||0} · ${p.story.completed?"resolved":"in progress"}.`:"No formal story has been discovered here.";article.append(title,text,story);out.append(article)}
      if(!journal.open)journal.showModal();return;
    }
    const entries=mode==="glossary"?STAT_GLOSSARY.map((entry,i)=>[`term-${i}`,entry]):mode==="rules"?[
      ["ring",["Open ring — Wayglass","Cyan marks lead toward an activated recovery point and Atlas destination. The open side of the ring faces the route."]],
      ["chevron",["Open chevron — Crossing","Amber marks lead toward a dungeon entrance or buried route. The vertex where the two lines meet points toward the crossing."]],
      ["triangle",["Hollow triangle — Major danger","Red marks lead toward a world boss or exceptional threat. The corner filled with a red wedge faces the route."]],
      ["spiral",["Open spiral — Unusual site","Violet marks lead toward a shrine, ruin, or strange discovery. The open end of the spiral faces the route."]],
      ...ATLAS_SYMBOLS.map(symbol=>[`atlas-${symbol.kind}`,[symbol.label,symbol.description]]),
      ["atlas",["Atlas controls","Drag with one finger to pan. Pinch with two fingers or use +/− to zoom. Tap an explored section to select it, then use Set waypoint to guide the constellation compass."]],
      ["travel",["Travel","Activate Wayglass beacons to travel to them from the Atlas. Dungeon travel remains sealed without a Crossing Sigil."]],
      ["combat",["Combat","Red or violet telegraphs show the exact threatened area. Dodge spends stamina; jumping avoids grounded impacts."]],
      ["aperture",["Aperture","Exploration, discoveries, and significant enemies raise Aperture, revealing hidden layers of known places."]]
    ]:mode==="creatures"?[
      ...Object.entries(CODEX.creatures).filter(([id])=>save.codex?.creatures?.[id]),
      ...Object.entries(save.codex?.foundry||{}).map(([id,q])=>[id,[q.name||"Unclassified creature",`${q.role||"unknown"} · observed modules: ${(q.modules||[]).join(", ")}${q.defeated?" · defeated":" · unresolved"}`]])
    ]:Object.entries(CODEX[mode]).filter(([id])=>save.codex?.[mode]?.[id]);
    const heading=document.createElement("h3"),scope=document.createElement("p");heading.textContent=mode==="rules"?"Map symbols and controls":mode==="features"?"Encountered feature records":mode==="glossary"?"Combat and equipment terms":`${mode[0].toUpperCase()+mode.slice(1)} encountered`;scope.textContent=mode==="rules"?"A universal reference for reading the Atlas, floor marks, and controls. Encounter-specific history belongs under Features.":mode==="features"?"Objects recorded through exploration. Open a feature for its field function and its place in the Corridor.":"";out.append(heading);if(scope.textContent)out.append(scope);
    if(!entries.length){const empty=document.createElement("p");empty.textContent="No entries recorded yet. Encounter them in the world to unlock this section.";out.append(empty);}
    for(const [id,entry] of entries){
      const article=document.createElement("article"),title=document.createElement("h3"),text=document.createElement("p");article.className="item codex-card";title.textContent=entry[0];text.textContent=entry[1];
      if(mode==="rules"&&["ring","chevron","triangle","spiral"].includes(id)){const badge=document.createElement("span");badge.className="symbol-badge";badge.append(trailMark(id));article.classList.add("symbol-card");article.prepend(badge)}
      else if(mode==="rules"&&id.startsWith("atlas-")){const badge=document.createElement("span");badge.className="symbol-badge";badge.append(atlasMark(id.slice(6)));article.classList.add("symbol-card");article.prepend(badge)}
      const portraitData=mode==="creatures"&&(ELITE_PORTRAITS[id]||CREATURE_PORTRAITS[id]);
      if(portraitData){const portrait=document.createElement("button"),[x,y]=portraitData,elite=!!ELITE_PORTRAITS[id];portrait.type="button";portrait.className="creature-portrait creature-portrait-button"+(elite?" elite-portrait":"");portrait.style.setProperty("--portrait-x",`${x*33.333}%`);portrait.style.setProperty("--portrait-y",`${y*100}%`);portrait.setAttribute("aria-label",`Enlarge ${entry[0]} field illustration`);portrait.onclick=()=>openCreatureViewer(id,entry[0],portraitData,elite);article.prepend(portrait)}
      if(mode==="creatures")article.append(creatureVariants(id,entry[0]),text);
      else if(mode==="places"){article.classList.add("place-card");article.prepend(placeMark(id));article.append(placeDetails(id,entry))}
      else if(mode==="features"){article.classList.add("place-card","feature-card");article.prepend(featureMark(id));article.append(featureDetails(id,entry))}
      else article.append(title,text);out.append(article);
    }
    if(!journal.open)journal.showModal();
    return;
  }
  const summary = document.createElement("p"),
    refuge = save.consequences.settlements["ember-refuge"];
  summary.textContent =
    "Ember Refuge: " +
    refuge.status +
    " · reputation " +
    refuge.reputation +
    " · Relay: " +
    (save.consequences.choices.relay || "undecided");
  out.append(summary);
  const arc=save.story?.arcs?.cartographersEcho;
  if(arc){
    const p=document.createElement("p"),leadCount=Object.keys(arc.leads||{}).length;
    p.textContent=`Unresolved pattern — Cartographer’s Echo: ${arc.status} · traces ${leadCount}/2${arc.site&&!arc.completed?` · Atlas signal ${arc.site.rx},${arc.site.ry}`:""}`;
    out.append(p);
  }
  for (const [id, thread] of Object.entries(save.consequences.threads)) {
    const p = document.createElement("p");
    p.textContent =
      id +
      ": " +
      thread.status +
      (thread.ending ? " · ending: " + thread.ending : "");
    out.append(p);
  }
  for (const [id, d] of Object.entries(save.consequences.dungeons)) {
    const p = document.createElement("p");
    p.textContent =
      (id === `dungeon:${save.seed}:g${save.worldGeneration}`
        ? "Hollow Relay"
        : "Buried Crossing " + id.split(":").slice(-3, -1).join(",")) +
      ": " +
      (d.resolved ? "resolved" : d.visits ? "unresolved" : "unexplored") +
      " · visits " +
      d.visits +
      " · left unfinished " +
      d.abandoned +
      (d.bypassed ? " · bypassed" : "");
    out.append(p);
  }
  if (!save.narrative.journal.length) {
    const empty = document.createElement("p");
    empty.textContent = "No discoveries recorded yet.";
    out.append(empty);
  } else
    for (const entry of save.narrative.journal) {
      const article = document.createElement("article"),
        title = document.createElement("h3"),
        text = document.createElement("p");
      article.className = "item";
      title.textContent = `${String(entry.title || "Discovery")}${entry.category?` · ${String(entry.category).replaceAll("-"," ")}`:""}`;
      text.textContent = String(entry.text || "");
      article.append(title, text);
      out.append(article);
    }
  if (!journal.open) journal.showModal();
}
let displayedMessage = "";
export function tickerSeconds(distance) {
  return Math.max(10, Math.round((Math.max(0, distance) / 45 + 6) * 10) / 10);
}
function updateMessage(text, force = false) {
  const el = $("#message"),
    viewport = $("#messageViewport");
  if (text === displayedMessage && !force) return;
  displayedMessage = text;
  el.classList.remove("ticker");
  el.style.removeProperty("--ticker-distance");
  el.style.removeProperty("--ticker-duration");
  el.textContent = text;
  requestAnimationFrame(() => {
    const distance = Math.max(0, el.scrollWidth - viewport.clientWidth);
    if (distance > 4) {
      el.style.setProperty("--ticker-distance", `${distance}px`);
      el.style.setProperty("--ticker-duration", `${tickerSeconds(distance)}s`);
      el.classList.add("ticker");
    }
  });
}
function updateHud(now) {
  const health = Math.max(0, Math.ceil(game.player.hp)),
    stamina = Math.max(0, Math.ceil(game.player.stamina)),
    next = Math.max(1, save.nextXp || 30);
  $("#healthText").textContent = `${health}/${save.maxHp}`;
  $("#healthBar").max = save.maxHp;
  $("#healthBar").value = health;
  $("#staminaBar").max = save.maxStamina;
  $("#staminaBar").value = stamina;
  const aperture = save.perception?.aperture || 0,
    tier = apertureTier(aperture),
    apertureNext = APERTURE_THRESHOLDS[tier];
  $("#xpCompact").textContent = `LEVEL ${save.level} · XP ${save.xp}/${next} · AP ${aperture}${apertureNext ? "/" + apertureNext : " MAX"}`;
  const states = actionReadiness(game, now);
  for (const [action, state] of Object.entries(states)) {
    const button = document.querySelector(`[data-action="${action}"]`);
    if (!button) continue;
    const cooling = state.remaining > 0,
      fraction = cooling ? Math.min(1, state.remaining / state.duration) : 0;
    button.style.setProperty("--cooldown", `${fraction * 100}%`);
    button.classList.toggle("cooling", cooling);
    button.classList.toggle("unavailable", state.available === false);
    button.dataset.cooldown = cooling
      ? `${state.remaining.toFixed(state.remaining < 1 ? 1 : 0)}s`
      : action === "potion"
        ? `×${state.count}`
        : action === "dodge"
          ? `${state.cost} STA`
          : "READY";
    button.setAttribute("aria-label", `${action} ${button.dataset.cooldown}`);
  }
}
let nextUiRefresh = 0;
function frame(now) {
  try {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  input.update(dt);
  if (input.consume("pause")) game.paused ? resume() : pause();
  if (input.consume("map")) openMap();
  if (input.consume("journal")) openJournal();
  if (input.consume("menu")) openPack();
  game.update(dt, input, now);
  if (game.paused) return;
  render(ctx, game, innerWidth, innerHeight, now);
  drawDungeonSystems();
  drawRangedEffects();
  updateMessage(game.message);
  if (now >= nextUiRefresh) {
    nextUiRefresh = now + 100;
    updateWorldNotices();
    $("#place").textContent =
      game.area === "dungeon"
        ? game.map.name
        : game.rx === 0 && game.ry === 0
          ? save.consequences.settlements["ember-refuge"].status === "fallen"
            ? "Ember Refuge · FALLEN"
            : "Ember Refuge · standing"
          : `Cinder Verge · ${game.rx}, ${game.ry}`;
    updateHud(now);
    updateNavigationCompass();
    const buffs = [];
    if (game.guardRemaining > 0)
      buffs.push(`IRONBARK ${Math.ceil(game.guardRemaining)}s`);
    if (game.magicBuffRemaining > 0)
      buffs.push(`LUMEN SURGE ${Math.ceil(game.magicBuffRemaining)}s`);
    if(save.elites?.status?.poison>0)buffs.push(`POISON ${Math.ceil(save.elites.status.poison)}s`);
    $("#buff").textContent = buffs.join(" · ");
  }
  if ((clock += dt) > 3) {
    clock = 0;
    persist();
  }
  } catch(error) {
    console.error("Infinite Corridor frame recovered from an error",error);
    game.message="The Corridor stuttered, then found its rhythm again.";
  } finally {
    requestAnimationFrame(frame);
  }
}
$("#resume").onclick = resume;
$("#pausedPack").onclick = openPack;
$("#pausedMap").onclick = openMap;
$("#pausedJournal").onclick = openJournal;
$("#journalClose").onclick = () => journal.close();
$("#creatureViewerClose").onclick=()=>$("#creatureViewer").close();
$("#close").onclick = () => panel.close();
$("#mapClose").onclick = () => atlas.close();
$("#mapWayglassSelect").onchange=()=>{const key=$("#mapWayglassSelect").value,c=save.checkpoints?.[key];if(!c)return;mapView.x=c.rx;mapView.y=c.ry;showMapDetail(c.rx,c.ry);drawMap()};
$("#mapModeToggle").onclick=()=>{mapMode=mapMode==="dungeon"?"atlas":"dungeon";mapView.x=game.rx;mapView.y=game.ry;updateMapModeUI();if(mapMode==="atlas")showMapDetail(game.rx,game.ry);drawMap()};
$("#dungeonLevelSelect").onchange=()=>{updateMapModeUI();drawMap()};
$("#mapCenter").onclick = () => {
  if(mapMode==="dungeon")return;
  mapView.x = game.rx;
  mapView.y = game.ry;
  drawMap();
};
$("#mapPlus").onclick = () => {
  if(mapMode==="dungeon")return;
  mapView.zoom = Math.min(3.2, mapView.zoom + 0.2);
  drawMap();
};
$("#mapMinus").onclick = () => {
  if(mapMode==="dungeon")return;
  mapView.zoom = Math.max(0.6, mapView.zoom - 0.2);
  drawMap();
};
$("#mapTravel").onclick = () => {
  if (performance.now() - atlasOpenedAt < 500) return;
  const key = selectedWayglassKey();
  game.area === "dungeon"
    ? game.useCrossingSigil()
    : game.travelToCheckpoint(save.checkpoints?.[key] ? key : null);
  persist();
  resume();
};
$("#mapHome").onclick = () => {
  if (performance.now() - atlasOpenedAt < 500) return;
  game.returnHome();
  persist();
  resume();
};
$("#mapWaypoint").onclick=()=>{const selected=mapView.selected;if(!selected||!save.explored[`${selected.rx},${selected.ry}`])return;save.waypoint=save.waypoint?.rx===selected.rx&&save.waypoint?.ry===selected.ry?null:{rx:selected.rx,ry:selected.ry};updateMapWaypointButton();showMapDetail(selected.rx,selected.ry);drawMap();persist()};
for (const [id, dx, dy] of [
  ["mapN", 0, -1],
  ["mapS", 0, 1],
  ["mapW", -1, 0],
  ["mapE", 1, 0],
])
  $("#" + id).onclick = () => {
    if(mapMode==="dungeon")return;
    mapView.x += dx;
    mapView.y += dy;
    drawMap();
  };
mapCanvas.onclick = (e) => {
  if(mapMode==="dungeon")return;
  if (suppressMapClick) {
    suppressMapClick = false;
    return;
  }
  const r = mapCanvas.getBoundingClientRect(),
    cell = 52 * mapView.zoom,
    rx =
      mapView.x +
      Math.floor((e.clientX - r.left - r.width / 2 + cell / 2) / cell),
    ry =
      mapView.y +
      Math.floor((e.clientY - r.top - r.height / 2 + cell / 2) / cell);
  if (save.explored[`${rx},${ry}`]) showMapDetail(rx, ry);
  drawMap();
  persist();
};
mapCanvas.addEventListener("pointerdown", (e) => {
  if(mapMode==="dungeon")return;
  atlasPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  mapCanvas.setPointerCapture(e.pointerId);
  mapCanvas.classList.add("dragging");
  if (atlasPointers.size === 1)
    atlasDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  else if (atlasPointers.size === 2) {
    const [a, b] = [...atlasPointers.values()];
    atlasPinch = { distance: Math.hypot(b.x - a.x, b.y - a.y), zoom: mapView.zoom };
    atlasDrag = null;
    mapView.panX = mapView.panY = 0;
    suppressMapClick = true;
  }
});
mapCanvas.addEventListener("pointermove", (e) => {
  if(mapMode==="dungeon")return;
  if (!atlasPointers.has(e.pointerId)) return;
  atlasPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (atlasPinch && atlasPointers.size >= 2) {
    const [a, b] = [...atlasPointers.values()], distance = Math.hypot(b.x - a.x, b.y - a.y);
    if (atlasPinch.distance > 0)
      mapView.zoom = Math.max(0.6, Math.min(3.2, atlasPinch.zoom * distance / atlasPinch.distance));
    drawMap();
    return;
  }
  if (!atlasDrag || e.pointerId !== atlasDrag.id) return;
  const dx = e.clientX - atlasDrag.x, dy = e.clientY - atlasDrag.y;
  if (Math.hypot(dx, dy) > 7) atlasDrag.moved = true;
  if (!atlasDrag.moved) return;
  mapView.panX = dx;
  mapView.panY = dy;
  drawMap();
});
function finishAtlasDrag(e) {
  if(mapMode==="dungeon")return;
  if (!atlasPointers.has(e.pointerId)) return;
  const wasPinching = !!atlasPinch;
  atlasPointers.delete(e.pointerId);
  if (!wasPinching && atlasDrag?.id === e.pointerId && atlasDrag.moved) {
    const cell = 52 * mapView.zoom;
    mapView.x -= Math.round(mapView.panX / cell);
    mapView.y -= Math.round(mapView.panY / cell);
    suppressMapClick = true;
  }
  mapView.panX = mapView.panY = 0;
  atlasPinch = null;
  atlasDrag = null;
  if (atlasPointers.size === 1) {
    const [id, q] = [...atlasPointers.entries()][0];
    atlasDrag = { id, x: q.x, y: q.y, moved: false };
  } else if (!atlasPointers.size) mapCanvas.classList.remove("dragging");
  drawMap();
  showMapDetail(mapView.x, mapView.y);
}
mapCanvas.addEventListener("pointerup", finishAtlasDrag);
mapCanvas.addEventListener("pointercancel", finishAtlasDrag);
for (const id of ["mapCenter", "mapN", "mapS", "mapW", "mapE"])
  $("#" + id).addEventListener("click", () =>
    showMapDetail(mapView.x, mapView.y),
  );
for (const d of [panel, atlas, journal])
  d.addEventListener("close", () => {
    if (
      game.paused &&
      !document.hidden &&
      !pausePanel.open &&
      !atlas.open &&
      !panel.open &&
      !journal.open
    ) {
      if (overlayPause) resume();
      else pausePanel.showModal();
    }
  });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    overlayPause = false;
    pause(false);
  }
  else if (game.paused && !pausePanel.open) pausePanel.showModal();
});
addEventListener("pagehide", () => {
  overlayPause = false;
  pause(false);
});
addEventListener("freeze", () => {
  overlayPause = false;
  pause(false);
});
if (game.paused) pausePanel.showModal();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
requestAnimationFrame(frame);
function openInteraction(id, confirmAttack = false) {
  const o = game.map.objects.find((q) => q.id === id);
  if (!o) return;
  pauseForOverlay();
  if (pausePanel.open) pausePanel.close();
  body.replaceChildren();
  const title = document.createElement("h2"),
    description = document.createElement("p");
  title.textContent =
    o.name || (o.kind === "dungeon" ? "Buried Crossing" : "Crossing Terminal");
  if (o.kind === "npc") {
    const n = save.consequences.npcs[id];
    description.textContent =
      o.role +
      " · " +
      (n.status === "dead"
        ? "dead"
        : n.disposition + " · " + n.hp + "/36 health") +
      ". Harm and death persist. " +
      (id === "vendor-vela"
        ? "Vela supplies the refuge."
        : "Each resident helps hold the refuge together.");
  } else if(o.kind==="shelterMerchant")description.textContent=(o.role||"Wandering specialist")+" · Their stock is deterministic, rare, and rotates as you chart the Corridor.";
  else if(o.kind==="displacementDevice")description.textContent="A rare threshold into a finite sealed crossing. Defeat its guardian to emerge in a distant unexplored region, or use a Crossing Sigil to abort back here.";
  else if (o.kind === "relayTerminal")
    description.textContent =
      "Restore: reopen the line and recover two draughts. Sever: silence the line and recover three lumen dust. This decision is permanent; either resolves the Missing Crossing.";
  else
    description.textContent =
      "Enter now, or record that you are leaving this crossing unexplored. You may return later; defeated enemies and collected supplies stay changed.";
  body.append(title, description);
  if (confirmAttack) {
    const warning = document.createElement("p");
    warning.textContent =
      "Strike " +
      o.name +
      " for 18 damage? Repeated strikes can kill them permanently. You may stand down while they live.";
    body.append(
      warning,
      uiButton("Strike " + o.name, () => performInteraction(id, "attack")),
      uiButton("Keep weapon lowered", () => openInteraction(id)),
    );
  } else
    for (const action of validActions(o, save)) {
      const labels = {
        speak: "Speak",
        trade: "Trade",
        attack: "Attack " + o.name + "…",
        standDown: "Stand down / Spare",
        enter: "Enter",
        bypass: "Leave unexplored",
        restore: "Restore the Relay",
        sever: "Sever the Relay",
        inspect: "Inspect terminal",
      };
      body.append(
        uiButton(labels[action] || action, () =>
          action === "attack"
            ? openInteraction(id, true)
            : performInteraction(id, action),
        ),
      );
    }
  body.append(uiButton("Return to world", resume));
  if (!panel.open) panel.showModal();
}
function performInteraction(id, action) {
  const result = game.interact(action, id);
  persist();
  if (
    result?.ok &&
    ["enter", "exit", "bypass", "restore", "sever"].includes(action)
  ) {
    resume();
    return;
  }
  if (action === "trade" && result?.ok) {
    game.shopRequested = false;
    openShop(id);
    return;
  }
  openInteraction(id);
  const message = document.createElement("p");
  message.textContent = result?.message || game.message;
  body.append(message);
}
