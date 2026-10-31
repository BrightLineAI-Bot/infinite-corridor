import { BOAT, forgeSubmersible } from "./boats.ts"; // release 311
import { subGate, droneGate, setMechMode, MECH_POWER } from "./vehicle-gates.ts";
import { swapPreset, stashForOtherPreset } from "./build-presets.ts"; // release 393; 541: preset gear
import { SLING, ensureSling, toSling, fromSling, equipFromSling } from "./sling.ts"; // release 543
import { surveyorChainPath, surveyorComplete } from "./surveyor.ts"; // release 551; 559
import { SMITHY, smithOpen, salvageItem, reforgeAffix, addSocket, masterwork } from "./smithy.ts";
import { MEAL, INGREDIENTS, INGREDIENT_IDS, mealName, mealPrice, mealPercent } from "./meals.ts"; // release 447
import { MARGINALIA, RULES as MARGIN_RULES, marginRun, ensureMarginalia } from "./marginalia.ts"; // release 459 // release 395 // release 315; 321: the drone
import { POTIONS, potionChoice, setPotionChoice, craftPotion, potionToDrink, potionsReady } from "./potions.ts"; // release 339; 341
import { BUILD, BUILD_KINDS, ensureBuild, setBuildKind, setContinuousBuild, activeBuildKind } from "./building.ts";
import { stageOf, tierCap, apertureCeiling, listenerKills, STAGES } from "./stages.ts";
import { drawRangedEffects as drawCombatEffects } from "./combat-visuals.ts";
import { screenToWorld, drawWaymarkIcon, rendererDiagnostics } from "./renderer.ts";
import { renderTimings } from "./renderer.ts";
import { createProbe, PROBE } from "./diagnostic-probe.ts";
import { vendorShop, buyFromVendor, walkerCrossingMap } from "./game.ts";
import { sectionAtlasColor } from "./atlas-colors.ts";
import { sectionRegion, regionName, REGIONS } from "./landscape.ts"; // release 573
import { skylandLabel } from "./skylands.ts";
import { CREATURE_TRAITS } from "./combat.ts";
import { PACK_KINDS, MONSTER_PACK, ATTACK_MODULES, MOVEMENT_MODES, BRAINS, isPackKind, staggerClass } from "./monster-pack.ts"; // release 403: staggerClass marks bosses on the dungeon map
import { drawPackPortrait } from "./monster-render.ts";
import { landscapeAtlasColor } from "./landscape-render.ts";
import { hashSeed } from "./random.ts";
import { ensureReciters, libraryBooks, setReciterMode, resetReciter } from "./travelers.ts";
import { READINGS, READING_ORDER, bookProgress, ensureLore, readingAt, readingKnown, takeCompletedReading } from "./lore.ts";
import { hamletSection, legacyMouthHamlet, hamletIdentity } from "./settlements.ts";
import { linksKnown } from "./linked-dungeons.ts";
import { DIG } from "./digging.ts";
import { ATLAS_ZOOM, clampZoom, sectionPixels, worldView, exploredSections, boundsOf, frame as frameSections, panStep, atlasPlaces, MAP_MARKS, mapMarkAt, toggleMapMark } from "./atlas-view.ts";
import { GLIMPSES, GLIMPSE_ORDER, glimpseFor, witnessGlimpse, witnessedGlimpses, glimpseAllowed } from "./glimpses.ts";
import { startGlimpse, paintRule } from "./glimpse-render.ts";
import { eldersHeard, elderProgress, ruleRows } from "./elders.ts";
import { relayRuleAt, crossingSection, knownRelaySections } from "./relay-network.ts";
import { questingBeastTriesLeft } from "./questing-beast.ts";
import { ensureFarArray, piecesNeeded, relayLean, listenerForm, BOONS, chooseBoon, chooseEnding, relaysUntilReturn } from "./far-array.ts";
import { ensureSceneState,scenePlaybackPlan,commitScene,replayableScenes,queueScene } from "./scenes.ts";
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
  if (prior && !stashForOtherPreset(save, item.slot, prior)) save.inventory.push(prior); // release 541: or it stays the other preset's
  return true;
}
function drawRangedEffects() { drawCombatEffects(ctx,game,innerWidth,innerHeight); }
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
  intro.textContent = shop.profile==="dungeon-relics"?`${save.currency} marks. This delver carries equipment recovered below: fewer necessities, but a markedly better chance of rare, epic, or relic-quality finds. Stock cycle ${shop.rotation ?? 0}.${game.message ? ` ${game.message}` : ""}`:`${save.currency} marks. Restorative draughts remain dependable; limited stock and equipment rotate after every four newly charted sections. Stock cycle ${shop.rotation ?? 0}.${game.message ? ` ${game.message}` : ""}`;
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
  for (const [id, name, price, stock] of shop.profile==="dungeon-relics"?[]:offers) {
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
      title = document.createElement("strong"),comparison=document.createElement("div");
    row.className = "item";
    comparison.className="item-comparison";
    title.textContent = `${item.name} · ${item.tier||"common"} · power ${item.power} · ${price} marks${shop.purchased[item.id] ? " · sold" : ""}`;
    for(const stat of compareItemStats(item,save.equipment[item.slot])){const value=document.createElement("span");value.className=`stat-${stat.direction}`;value.textContent=`${stat.direction==='up'?'↑ ':stat.direction==='down'?'↓ ':stat.direction==='empty'?'◇ ':''}${stat.label} ${stat.formatted}`;comparison.append(value)}
    row.append(
      title,
      comparison,
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
    const hit = save.aimMode !== "build" && save.aimMode !== "act" && game.enemyAt(q.x, q.y); // release 309: tap a creature to lock on
    if (!hit && game.placeShadowClone?.(q.x, q.y)) { persist(); return; } // release 365: the tap after a Shadow Clone sets it; 387: a tap on a creature locks it instead
    if (hit) { game.lockTarget(hit.id); return; }
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
    else if (save.aimMode === "build") game.buildAt(q.x, q.y); // release 267: build mode
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
    if (game.smithyRequested) { game.smithyRequested = null; openSmithy(game.message); } // release 441: Act at the town smith opens the forge
    if (game.area === "dungeon" && !panel.open && !game.paused && marginRun(save, game.areaId())?.offer?.length) { game.marginOfferRequested = false; openMarginOffer(); } // release 459: a page left on offer by an older release (473 applies pages at once)
    if (game.marginPasteRequested) { game.marginPasteRequested = false; openScrapbookPaste(); } // release 459
    if (game.kitchenRequested) { const id = game.kitchenRequested; game.kitchenRequested = null; kitchenPick = []; openKitchen(id, game.message); } // release 447: Act at a cook opens the kitchen
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
    document.querySelector('[data-action="build"]')?.classList.toggle("selected", save.aimMode === "build");
  }, 100);
}, 0);
import { loadSave, saveGame, setWriteTimingListener, flushSaves, loadSettings, saveSettings, effectiveQuality, getActiveSlot, setActiveSlot, listJourneySlots, journeyStats, createJourney, renameJourney, duplicateJourney, deleteJourney, exportJourney, importJourney, recoverJourney, storageReport, createExclusiveOperation, commitNewJourneyTransition } from "./persistence.ts";
import {
  Game,
  actionReadiness,
  enemyDangerRadius,
  characterStats,
  syncCharacterStats,
  EQUIPMENT_CAPACITY,
  salvageInventoryItem,
  salvageInventoryItems,
} from "./game.ts";
import { createInput } from "./input.ts";
import { render as baseRender, renderScaleForViewport } from "./renderer.ts";
import { STATS } from "./types.ts";
import { SPELLS, ITEM_TIERS, itemTier, itemScore, describeAffixes, compareItemStats, upgradeCost, lateUpgradeOpen, LATE_UPGRADE, SMELT, smeltSphere, APERTURE_SKILLS, availableApertureSkills, skillRank, learnApertureSkill, apertureBand, APERTURE_BANDS, spellOpen } from "./items.ts";
import { GLYPHS, GLYPH_IDS, RESONANCES, TRIADS, socketGlyph, craftGlyph, describeHost, DUST_PER_GLYPH, SPELL_SOCKETS, LAYOUT_HOSTS, saveGlyphLayout, applyGlyphLayout } from "./glyphs.ts";
import { ECHOES, ECHO_IDS, NOTCHES, notchesUsed, toggleEcho, toggleLatticeEcho } from "./echoes.ts";
// Release 291: names and HUD glyphs for items on a preset's Build button.
// Release 293 (Tim: "convincing symbols... relevant and easy to discern"): solid, filled item icons (spells stay line drawings).
const ITEM_NAMES = { restorativeDraught: "Restorative Draught", highPotion: "High Potion", maxPotion: "Max Potion", ironbarkTonic: "Ironbark Tonic", lumenPhial: "Lumen Phial", clearrootAmpoule: "Clearroot Ampoule", hullShield: "Hull Shield", submersible: "Submersible Frame" };
const ITEM_ICONS = {
  // Release 339: the potion tiers, the same bottle in red, amber and gold (a star on the Max Potion).
  restorativeDraught: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9.6" y="1.6" width="4.8" height="2.4" rx=".7" fill="#8a5a32" stroke="#4a2f17" stroke-width=".6"/><path d="M10.1 4h3.8v4.3a6.6 6.6 0 1 1-3.8 0z" fill="#1d2228" fill-opacity=".55" stroke="#ece2cc" stroke-width="1"/><path d="M5.9 14.6a6.1 6.1 0 0 0 12.2 0z" fill="#d8443e"/><path d="M6.6 13.4h10.8" stroke="#ff8a7a" stroke-width=".6"/><ellipse cx="9.4" cy="11.6" rx=".9" ry="1.7" fill="#fff" opacity=".55"/></svg>',
  highPotion: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9.6" y="1.6" width="4.8" height="2.4" rx=".7" fill="#8a5a32" stroke="#4a2f17" stroke-width=".6"/><path d="M10.1 4h3.8v4.3a6.6 6.6 0 1 1-3.8 0z" fill="#1d2228" fill-opacity=".55" stroke="#ece2cc" stroke-width="1"/><path d="M5.9 14.6a6.1 6.1 0 0 0 12.2 0z" fill="#e8862e"/><path d="M6.6 13.4h10.8" stroke="#ffc07a" stroke-width=".6"/><ellipse cx="9.4" cy="11.6" rx=".9" ry="1.7" fill="#fff" opacity=".55"/><path d="M17.6 3.2l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="#ffd9a0"/></svg>',
  maxPotion: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9.6" y="1.6" width="4.8" height="2.4" rx=".7" fill="#8a5a32" stroke="#4a2f17" stroke-width=".6"/><path d="M10.1 4h3.8v4.3a6.6 6.6 0 1 1-3.8 0z" fill="#1d2228" fill-opacity=".55" stroke="#ece2cc" stroke-width="1"/><path d="M5.9 14.6a6.1 6.1 0 0 0 12.2 0z" fill="#f2c33a"/><path d="M6.6 13.4h10.8" stroke="#fff0a8" stroke-width=".6"/><ellipse cx="9.4" cy="11.6" rx=".9" ry="1.7" fill="#fff" opacity=".55"/><path d="M18.4 1.6l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z" fill="#fff3b0" stroke="#a07a14" stroke-width=".4"/></svg>',
  // Ironbark Tonic: a shield of bark, iron-rimmed (damage taken down).
  ironbarkTonic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2 20 5v6.2c0 5-3.4 8.6-8 10.6-4.6-2-8-5.6-8-10.6V5z" fill="#6b4426" stroke="#9aa3ab" stroke-width="1.6"/><path d="M8.3 6.5c.8 3-.6 5.4.4 9M12 5.2c-.7 3.6.8 6.8-.2 12M15.7 6.5c-.6 2.6.7 5-.3 8.4" stroke="#3e2614" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M6.4 9.4 12 7.8l5.6 1.6" stroke="#c9ced3" stroke-width="1.2" fill="none"/></svg>',
  // Lumen Phial: a slim vial of light, rays around it (spells brighter).
  lumenPhial: '<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#ffe9a3" stroke-width="1.3" stroke-linecap="round"><path d="M12 1.2v2.2M4.2 6.2l1.6 1.2M19.8 6.2l-1.6 1.2M3 13.5h2M19 13.5h2"/></g><rect x="10" y="3.6" width="4" height="2.4" rx=".6" fill="#8a5a32"/><path d="M9.6 6h4.8v3.2c2.2 1.1 3.4 3.1 3.4 5.5 0 3.5-2.6 6.3-5.8 6.3s-5.8-2.8-5.8-6.3c0-2.4 1.2-4.4 3.4-5.5z" fill="#f5c542" stroke="#fff3c4" stroke-width="1"/><path d="M12 11.2l1 2.4 2.5.2-1.9 1.6.6 2.5-2.2-1.4-2.2 1.4.6-2.5-1.9-1.6 2.5-.2z" fill="#fffdf0"/></svg>',
  // Clearroot Ampoule: a sealed green ampoule, pale roots in it (poison cleared).
  clearrootAmpoule: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6c1 2.2 1.6 3.6 1.6 5.2v1.4c2.6 1.3 4.2 3.8 4.2 6.7 0 4-2.6 7.5-5.8 7.5s-5.8-3.5-5.8-7.5c0-2.9 1.6-5.4 4.2-6.7V6.8c0-1.6.6-3 1.6-5.2z" fill="#4f9a5a" stroke="#c9f2c4" stroke-width="1"/><path d="M12 10.5v8.8M12 14.2l-2.6 2.6M12 15.6l2.8 2.2M12 12.4l2 1.6M12 17.6l-1.8 2" stroke="#eafbe3" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>',
  // Hull Shield: a skiff's hull under a shield (the hull takes no damage).
  // Release 311: a silver submersible with its great round window and a manipulator arm.
  submersible: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.6" width="2.6" height="7" rx=".8" fill="#8f979f"/><rect x="16.4" y="2.6" width="2.6" height="7" rx=".8" fill="#8f979f"/><circle cx="12" cy="10" r="7" fill="#c9cfd6" stroke="#3a4048" stroke-width="1"/><circle cx="12" cy="9.4" r="4.2" fill="#2a6f86" stroke="#3a4048" stroke-width="1"/><path d="M10 7.8a2.6 2.6 0 0 1 3-1" stroke="#ffffff" stroke-width="1" fill="none"/><path d="M5.6 11.6 2.8 14.4l.6 2.6M18.4 11.6l2.8 2.8-.6 2.6" stroke="#7d858e" stroke-width="1.6" fill="none" stroke-linecap="round"/><rect x="8.4" y="16.4" width="2.4" height="3.4" fill="#7d858e"/><rect x="13.2" y="16.4" width="2.4" height="3.4" fill="#7d858e"/><path d="M7.8 20.4h3.6M12.6 20.4h3.6" stroke="#4b525a" stroke-width="1.6" stroke-linecap="round"/></svg>',  // release 315: the robot
  hullShield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.6 14.4h18.8l-2.8 5.6H5.4z" fill="#8a5a32" stroke="#3e2614" stroke-width="1"/><path d="M12 2.4 17.4 4.4v4.3c0 3.3-2.3 5.4-5.4 6.6-3.1-1.2-5.4-3.3-5.4-6.6V4.4z" fill="#3fb6c8" stroke="#d8f6fb" stroke-width="1.2"/><path d="M12 5.4v6.4M9.4 7.8h5.2" stroke="#0f3a42" stroke-width="1.4" stroke-linecap="round"/><path d="M1.6 21.4c2-1 4-1 6 0s4 1 6 0 4-1 6 0 2.6.5 3 .3" stroke="#7fc6e6" stroke-width="1.2" fill="none"/></svg>',
};
import { buffLeft, slotTool, CASTABLES, ATTRIBUTES, PAIRINGS, pairKey, slotted, setSlot, availableCastables, activePairing, ensureSlots , togglePreset, PRESETS, BUTTON_ITEMS, presetButton, setPresetButton, assignPresetItem, activeButton } from "./spell-slots.ts";
import { BRANCHES, BRANCH_IDS, NODE_EFFECTS, POINT_EVERY, pointsEarned, pointsFree, hasNode, branchCaps, learnRank, learnMod, chooseCap, respec, respecCost, awakenCheck, awaken, awakenedText, AWAKEN_COST, ALT_PASSIVES, ALT_UNLOCK_TIER, altUnlocked, altChosen, toggleAlt, passiveForm, PASSIVE_KEYS, toggleLatticePassive, latticePassiveGroups } from "./constellation.ts";
import { homeName, homeKey, homeCandidate, setHome, townAt } from "./hometowns.ts";
import { DUNGEON_TRAPS } from "./dungeon-traps.ts";
import { FIELD_KEYS, TOOL_FORM_KEYS, fieldForm } from "./lattice-fields.ts";
import { ensureLattice, latticeOpen, latticeWhy, latticeSlots, nextSlotCost, unlockSlot, latticePassives, latticeEchoes, TRANSIT_LATTICE, LATTICE_LORE, KINDS as LATTICE_KINDS } from "./transit-lattice.ts";
import { currentObjective, validActions, dungeonHistory, journalOnce, STAT_RESPEC } from "./interactions.ts";
import { applyDungeonDiscovery, dungeonPointDiscovered, dungeonTileVisibility } from "./dungeon-framework.ts";
import { worldStewardReport } from "./story.ts";
import { ensureViewportState,acceptViewportHunt,deferViewportHunt,archiveViewportHunt,foundryTrialDecision,foundryAdmission,huntIntegrationDiagnostics } from "./foundry.ts";
import {
  generateRegion as generateWorldRegion,
  generateDungeon,
  sectionSummary,
  sectionSites,
  regionalThreat,
  apertureTier,
  APERTURE_THRESHOLDS,
  perceived,
  wayfindingTargets,
  wayfindingCues,
} from "./world.ts";
import { warmWayfindingSignals } from "./world.ts";
import { bellsRung, BELLS } from "./bells.ts"; // release 431
import { pagesFound, PAGE_TEXT, PAGES_FINAL, TORN_PAGES } from "./torn-pages.ts"; // release 595
import { WORLD_BEASTS, retreatsUnderWay } from "./world-beasts.ts"; // release 605
const $ = (s) => document.querySelector(s),
  canvas = $("#game"),
  ctx = canvas.getContext("2d", { alpha: false }), // release 159: opaque; render() paints every pixel
  settings = loadSettings(),
  input = createInput(document, globalThis, settings),
  save = await loadSave(),
  game = new Game(save, performance.now()),
  panel = $("#panel"),
  body = $("#panelBody"),
  pausePanel = $("#pausePanel"),
  optionsPanel = $("#optionsPanel"),
  optionsBody = $("#optionsBody"),
  atlas = $("#atlas"),
  journal = $("#journal"),
  mapCanvas = $("#mapCanvas"),
  mctx = mapCanvas.getContext("2d");
globalThis.corridorStewardReport=()=>worldStewardReport(save);
const perfEnabled = new URLSearchParams(location.search).has("perf") || settings.diagnostics,
  perfSamples = { frame: [], input: [], update: [], render: [], hud: [], notices: [], persist: [] },
  navigationStats = { lookups: 0, rebuilds: 0 };
function currentQuality(){return effectiveQuality(settings,{width:innerWidth,height:innerHeight,deviceMemory:navigator.deviceMemory,hardwareConcurrency:navigator.hardwareConcurrency})}
game.deathPause = true; // release 329: the played game pauses after a world beast fells the Wayfarer (Game.tickFallen)
function applyPresentationSettings(){game.beastTries=settings.beastTries!==false;/* release 345 */game.damageNumbers=settings.damageNumbers!==false;/* release 461 */document.documentElement.style.setProperty("--ui-scale",String(settings.uiScale));document.documentElement.style.fontSize=`${16*settings.textScale}px`;document.body.classList.toggle("high-contrast",settings.highContrast);document.body.classList.toggle("reduce-motion",settings.reduceMotion||settings.safeMode);game.presentation={...settings,effectiveQuality:currentQuality()};if(audioGain)audioGain.gain.value=muted?0:AUDIO_MIX.master*settings.masterVolume;if(musicBus)musicBus.gain.value=AUDIO_MIX.music*settings.musicVolume;resize()}
// Diagnostic probe (release 165): a timed recording started from Options → System; see diagnostic-probe.ts.
const probe = createProbe(), PROBE_REPORT_KEY = "corridor-probe-report";
setWriteTimingListener((t)=>probe.save(t)); // release 555: each save write, with the database's main-thread copy time
let probePhases = {}, probeGround = { builds: 0, patches: 0 }, probeInterval = 0, probePrevious = null;
for (const type of ["pointerdown", "pointerup", "pointercancel", "lostpointercapture", "touchstart", "touchend", "touchcancel"]) document.addEventListener(type, (e) => probe.pointer(e), { capture: true, passive: true });
function storedProbeReport(){if(probe.report)return probe.report;try{return JSON.parse(localStorage.getItem(PROBE_REPORT_KEY)||"null")}catch{return null}}
function probeSample(interval){
  const r=rendererDiagnostics(),builds=r.groundBuilds||0,patches=r.groundPatches||0,ground={builds:builds-probeGround.builds,patches:patches-probeGround.patches};probeGround={builds,patches};
  const current={phases:probePhases,render:{ground:renderTimings.ground,world:renderTimings.world,overlay:renderTimings.overlay},ground,context:{area:game.area,aboard:!!save.boat?.aboard,openSea:!!game.map?.openSea,section:game.area==="overworld"?`${game.rx},${game.ry}`:String(game.areaId?.()||"").split(":").slice(-2).join(":"),enemies:game.enemies.length,projectiles:game.projectiles.length,effects:game.effects.length,visibleTiles:r.visibleTiles,visibleObjects:r.visibleObjects}};
  // Release 167: the interval ending at this frame's start covers the previous frame (its work and the browser painting
  // it), so it is paired with that frame's phases; release 165 paired it with this frame's and misplaced every hitch.
  if(probePrevious)probe.frame({interval,...probePrevious});
  probePrevious=current;probePhases={};
  if(!probe.running){const report=probe.report;try{localStorage.setItem(PROBE_REPORT_KEY,JSON.stringify(report))}catch{}game.message=`Diagnostic probe finished (${report.seconds}s, ${report.frames} frames). Options → System → Copy probe report, then paste it to Claude.`}
}
function recordPerf(kind, value) {
  if (!perfEnabled) return;
  const values = perfSamples[kind];
  values.push(value);
  if (values.length > 600) values.shift();
}
function measured(kind, fn) {
  if (!perfEnabled && !probe.running) return fn();
  const start = performance.now(), value = fn(), took = performance.now() - start;
  recordPerf(kind, took);
  if (probe.running) probePhases[kind] = (probePhases[kind] || 0) + took;
  return value;
}
function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}
globalThis.corridorPerfReport = () => {
  const summary = {};
  for (const [kind, values] of Object.entries(perfSamples))
    summary[kind] = {
      samples: values.length,
      median: percentile(values, .5),
      p95: percentile(values, .95),
      p99: percentile(values, .99),
      over25: values.filter((q) => q > 25).length,
      over40: values.filter((q) => q > 40).length,
      over60: values.filter((q) => q > 60).length,
    };
  return {
    enabled: perfEnabled,
    area: game.area,
    quality: currentQuality(),
    canvas: { width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight },
    active: { objects: game.map.objects.length, enemies: game.enemies.filter((e) => !e.dead).length, projectiles: game.projectiles.length, effects: game.effects.length },
    navigation: { ...navigationStats, source: "cached-dual-targets" },
    renderer: rendererDiagnostics(),
    simulation: game.performanceStats ? { ...game.performanceStats } : null,
    hunts: huntIntegrationDiagnostics(save),
    scene: { active: sceneRuntime?.active || null, shot: sceneRuntime?.shot || 0, actors: sceneRuntime?.plan?.shots?.[sceneRuntime.shot]?.choreography?.length || 0 },
    summary,
  };
};
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
// Release 559 (Tim: "when you complete a hunt or... whatever quest you active quest you have, it's a quest complete... just
// get a banner"): QUEST COMPLETE banners wait in a queue and show one at a time, after any other banner of that moment.
// Hunts queue theirs (game.questNotices); the rest are noticed here: Old Quillon's errand done, the seventh bell rung, the
// Surveyor's Chain whole. The first look at a journey only notes where things stand.
const QUEST_BANNER={gap:3400,checkEvery:500},questQueue=[],questWatch={ready:false};let questBannerFreeAt=0,questCheckedAt=-1e9;
function watchQuests(now){
  if(game.questNotices?.length){questQueue.push(...game.questNotices);game.questNotices.length=0}
  if(now-questCheckedAt>=QUEST_BANNER.checkEvery){questCheckedAt=now;
  if(questWatch.save!==save)questWatch.ready=false; // another journey: look first, announce nothing
  const w=save.wanderer?.quest,sig={errand:w?.done?`${save.wanderer.stage}:${w.type}`:null,bells:bellsRung(save).length,surveyor:surveyorComplete(save)};
  if(questWatch.ready){
    if(sig.errand&&sig.errand!==questWatch.errand)questQueue.push({title:"QUEST COMPLETE",detail:"Old Quillon's errand · find him on the road for your reward",kind:"quest"});
    if(sig.bells>=BELLS.count&&questWatch.bells<BELLS.count)questQueue.push({title:"QUEST COMPLETE",detail:"The Seven Bells · all seven have rung",kind:"quest"});
    if(sig.surveyor&&!questWatch.surveyor)questQueue.push({title:"QUEST COMPLETE",detail:"The Surveyor's Chain · all its links recovered",kind:"quest"});
  }
  Object.assign(questWatch,sig,{ready:true,save});}
  if(questQueue.length&&now>=questBannerFreeAt){const q=questQueue.shift();showEventBanner(q.title,q.detail,q.kind);questBannerFreeAt=now+QUEST_BANNER.gap}
}
function updateWorldNotices() {
  if(game.defeatNotice){const notice=game.defeatNotice;game.defeatNotice=null;showEventBanner(notice.title,notice.detail,notice.kind);questBannerFreeAt=performance.now()+QUEST_BANNER.gap;}
  watchQuests(performance.now());
  {const done=takeCompletedReading();if(done)showEventBanner("RECITATION COMPLETE",`${done==="elders"?"The Elder Wanderers":READINGS[done].name} · Mastered`,"discovery");} // release 191 (Tim)
  if(game.glimpseCue){const cue=game.glimpseCue;game.glimpseCue=null;const id=glimpseRun?null:glimpseFor(save,cue,game.rx,game.ry,Math.random,{family:settings.familySafe});if(id)playGlimpse(id)} // release 193
  for (const e of game.enemies) if (!e.dead && (e.boss || e.apertureEncounter) && !announcedThreats.has(e.id)) {
    announcedThreats.add(e.id);
    // Release 527 (Tim: "when you're in a dungeon, [it] should only say major threat when there's a world boss... there
    // shouldn't be any announcement when you get into the dungeon"): in a crossing only a world beast is announced.
    if (game.area !== "dungeon" || e.worldBeast || e.worldBoss) showEventBanner(e.boss ? "MAJOR THREAT" : "CORRIDOR BREACH", e.kind.replace(/([A-Z])/g," $1").trim() + " has entered this section", "danger");
    if(e.boss&&(e.eliteId||e.worldBoss||e.kind==="riftColossus"))queueScene(save,"rift-arrival",e.id);
  }
  const activatedHere=!!save.checkpoints?.[`${game.rx},${game.ry}`];let o=null,nearest=Infinity;for(const q of game.map.objects||[]){if(!["checkpoint","dungeon","shrine","ruinMarker","bossCue"].includes(q.kind)||(q.kind==="checkpoint"&&activatedHere))continue;const distance=Math.hypot(q.x-game.player.x,q.y-game.player.y);if(distance<nearest){nearest=distance;o=q}}const key=o&&nearest<2.4?game.areaId()+":"+o.id:"";
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
  h.textContent = `APERTURE ${p.aperture} · ${apertureBand(p.aperture).name.toUpperCase()} (TIER ${tier})`;
  const held = p.aperture >= apertureCeiling(save); // release 279: the stage holds the Aperture
  text.textContent = held
    ? `Stage ${stageOf(save)}: the Aperture holds at tier ${tierCap(save)} until the Listener falls${listenerKills(save) >= STAGES.firstKills ? " again" : ""} at the Far Gate.`
    : next ? `${next - p.aperture} until the ${apertureBand(next).name} band.` : "Every band reached.";
  card.append(h, text);
  if (tier > 3) {
    const r = tier - 3, detail = document.createElement("p");
    detail.textContent = `Resonance ${r}: +${r * 6} maximum health, +${r * 2} melee and +${r * 2} spell damage. Aperture encounters grow stronger and more frequent with each band.`;
    card.append(detail);
  }
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
    telegraphs = game.enemies.map((e) => e.telegraph);
  try {
    game.renderObjectPredicate ||= (o) => perceived(o, game.save);
    game.player.attackUntil = 0;
    for (const e of game.enemies) e.telegraph = 0;
    baseRender(ctx, game, w, h, now);
    drawApertureVisuals();
  } finally {
    game.player.attackUntil = attackUntil;
    for (let i = 0; i < game.enemies.length; i++)
      game.enemies[i].telegraph = telegraphs[i];
  }
}
function drawApertureVisuals() {
  const s = Math.round(Math.max(28, Math.min(44, innerWidth / 12))),
    sx = (x) => innerWidth / 2 + (x - game.player.x) * s,
    sy = (y) => innerHeight / 2 + (y - game.player.y) * s,
    t = performance.now() / 600;
  ctx.save();
  for (const o of game.map.objects)
    if (perceived(o, save) && o.visualTier) {
      const x = sx(o.x + 0.5),
        y = sy(o.y + 0.5);
      // Release 479 (Tim: "the crystals that the rift... the guardians spawn... they're the same crystalline, it's kind of
      // confusing... like a starburst... or a different color... or a different outline"): the Unseen Crossing, the rift a
      // fallen guardian opens, is a slowly turning teal eight-pointed starburst; the inscription and relic stay violet diamonds.
      if (o.kind === "apertureDoor") {
        ctx.strokeStyle = "#8ff0e0"; ctx.fillStyle = "#1f8a7a55"; ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) { const a = t * 0.35 + (i * Math.PI) / 8, q = s * (i % 2 ? 0.24 : 0.6); ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#e6fffa"; ctx.beginPath(); ctx.arc(x, y, s * 0.09, 0, Math.PI * 2); ctx.fill();
        continue;
      }
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
  hudToggles = [$("#hudExpand")].filter(Boolean), // release 113: the bottom-row Menu toggle became spell slot B
  navCompass = $("#navCompass"),
  navGuidanceArrow = $("#navGuidanceArrow"),
  navManualArrow = $("#navManualArrow");
let navigationCache = { key: null, map: null, guidance: null, manual: null }, announcedManualArrival = null;
// Release 153: the compass always has somewhere to point. Objectives are ranked nearest first (ties by kind, in this
// order); tapping the compass steps to the next one. Explored sections still holding an unfinished challenge (an
// Atlas site whose dungeon or arena is not resolved) count as objectives, as do story targets and nearby signals.
const OBJECTIVE_KINDS={hunt:{rank:0,label:"Hunt"},story:{rank:1,label:"Story"},challenge:{rank:2,label:"Challenge"},danger:{rank:3,label:"Danger"},crossing:{rank:4,label:"Signal"},event:{rank:5,label:"Signal"}};
// Release 185 (Tim): a Major Danger (Colossus Trace) is evidence, not a task; nothing ever resolves it, so counting it
// kept its section framed gold on the Atlas forever. It still shows as a danger sign; only crossings and arenas are open.
const CHALLENGE_SITES={dungeon:"Crossing",arenaEntrance:"Arena"},COMPASS_OBJECTIVE_LIMIT=12;
let objectiveCache={key:null,list:[],all:[]},compassPick=save.guidance?.pick??null,compassPin=save.guidance?.pin??null; // compassPin: a quest chosen in the Journal (release 155)
// Release 279 (Tim: "when you close the map... it changes whatever way marker... or whatever active quest you have... it doesn't
// maintain it"): the compass's choice and a Journal pin are kept in the save (save.guidance, additive), so nothing but the
// Wayfarer's own choice changes them.
function rememberGuidance(){save.guidance={pick:compassPick,pin:compassPin?{rx:compassPin.rx,ry:compassPin.ry,name:String(compassPin.name||"")}:null};navigationCache.key=null;persist()}
// The section an area id belongs to: dungeon:seed:gN[:rx:ry:...] and arena:vN:seed:rx,ry.
function sectionOfAreaId(id){const d=/^dungeon:[^:]+:g\d+(?::(-?\d+):(-?\d+))?/.exec(id);if(d)return d[1]===undefined?"0,0":`${d[1]},${d[2]}`;const a=/^arena:v\d+:[^:]+:(-?\d+),(-?\d+)/.exec(id);return a?`${a[1]},${a[2]}`:null}
function openChallengeSections(){
  const resolved=new Set();for(const[id,h]of Object.entries(save.consequences?.dungeons||{}))if(h?.resolved){const at=sectionOfAreaId(id);if(at)resolved.add(at)}
  const open=new Map();for(const[key,record]of Object.entries(save.atlas||{})){if(resolved.has(key))continue;const site=(record?.sites||[]).find((q)=>CHALLENGE_SITES[q.kind]);if(site)open.set(key,site)}
  return open;
}
function objectiveList(){
  // Release 159: a cheap key first (section and one-second bucket), so the frame loop does no counting between rebuilds.
  const quick=`${game.rx},${game.ry},${Math.floor(performance.now()/1000)}`;if(objectiveCache.quick===quick)return objectiveCache.list;
  const resolvedCount=Object.values(save.consequences?.dungeons||{}).filter((h)=>h?.resolved).length,
    key=[game.rx,game.ry,Object.keys(save.atlas||{}).length,resolvedCount,save.viewport?.activeHuntId,save.relayNetwork?.coordinate?.rx,save.questingBeast?.active?.rx,save.wanderer?.quest?.done,Math.floor(performance.now()/5000)].join(":");
  if(objectiveCache.key===key){objectiveCache.quick=quick;return objectiveCache.list}
  const byKey=new Map(),add=(o)=>{const k=`${o.rx},${o.ry}`,prior=byKey.get(k);if(!prior||OBJECTIVE_KINDS[o.kind].rank<OBJECTIVE_KINDS[prior.kind].rank)byKey.set(k,o)},open=openChallengeSections();
  for(const t of wayfindingTargets(save.seed,game.rx,game.ry,save.worldGeneration,save))if(t.kind!=="beacon"&&!(t.kind==="crossing"&&save.explored[`${t.rx},${t.ry}`]&&!open.has(`${t.rx},${t.ry}`)))add({kind:t.kind==="story"&&t.name===save.viewport?.contracts?.[save.viewport?.activeHuntId]?.title?"hunt":t.kind,rx:t.rx,ry:t.ry,name:t.name});
  for(const[k,site]of open){const[rx,ry]=k.split(",").map(Number);add({kind:"challenge",rx,ry,name:site.name&&site.name!==site.kind?`${CHALLENGE_SITES[site.kind]}: ${site.name}`:CHALLENGE_SITES[site.kind],x:site.x,y:site.y})}
  const here=(o)=>Math.max(Math.abs(o.rx-game.rx),Math.abs(o.ry-game.ry));
  const all=[...byKey.values()].filter((o)=>here(o)>0||o.kind==="challenge").sort((a,b)=>here(a)-here(b)||OBJECTIVE_KINDS[a.kind].rank-OBJECTIVE_KINDS[b.kind].rank);
  objectiveCache={key,quick,list:all.slice(0,COMPASS_OBJECTIVE_LIMIT),all}; // release 279: the chosen target is looked up in all of them
  return objectiveCache.list;
}
function compassObjective(){const list=objectiveList();return objectiveCache.all.find((o)=>`${o.rx},${o.ry}`===compassPick)||list[0]||null} // release 279: a pick that is merely far off is kept; only a finished one falls back
function compassHeading(dx,dy){if(!dx&&!dy)return"here";return`${dy<0?"north":dy>0?"south":""}${dy&&dx?"-":""}${dx<0?"west":dx>0?"east":""}`}
function navigationTargets() {
  navigationStats.lookups++;
  const huntId=save.viewport?.activeHuntId||null,hunt=huntId?save.viewport?.contracts?.[huntId]:null,
    huntActive=!!hunt&&["accepted","tracking","target-located"].includes(hunt.status),manual=save.manualWaypoint;
  const objectiveOpen = !save.consequences.choices.relay ||
    (save.narrative.facts["leads.active"] && !save.narrative.facts["leads.complete"]);
  const pick=game.area==="overworld"&&!huntActive&&!compassPin?compassObjective():null;
  const key=[game.area,game.rx,game.ry,huntId,hunt?.status,hunt?.target?.rx,hunt?.target?.ry,objectiveOpen,manual?.area,manual?.rx,manual?.ry,manual?.label,pick?.rx,pick?.ry,pick?.name,compassPin?.rx,compassPin?.ry,compassPin?.name].join(":");
  if(navigationCache.map===game.map&&navigationCache.key===key)return navigationCache;
  navigationStats.rebuilds++;
  let guidance=compassPin?{area:"overworld",rx:compassPin.rx,ry:compassPin.ry,kind:"guidance",name:compassPin.name}:huntActive&&Number.isInteger(hunt.target?.rx)&&Number.isInteger(hunt.target?.ry)?{area:"overworld",rx:hunt.target.rx,ry:hunt.target.ry,kind:"guidance",name:hunt.title||"Viewport guidance"}:null;
  if(!guidance&&game.area==="overworld"&&objectiveOpen&&!compassPick){
    const cues=game.map.objects.filter(q=>q.kind==="wayfindingCue"),cue=cues.find(q=>q.signalKind==="crossing")||cues.find(q=>q.signalKind==="danger")||cues.find(q=>q.signalKind==="event");
    guidance=cue?{area:"overworld",rx:cue.targetRx,ry:cue.targetRy,kind:"guidance",name:cue.name||"Quest signal"}:null;
  }
  if(!guidance&&pick)guidance={area:"overworld",rx:pick.rx,ry:pick.ry,x:pick.x,y:pick.y,kind:"guidance",name:pick.name};
  navigationCache={key,map:game.map,guidance,manual:manual?{...manual,kind:"manual",name:manual.label||"Manual waypoint"}:null};
  return navigationCache;
}
function updateNavigationArrow(arrow,target){
  if(arrow.hidden!==!target)arrow.hidden=!target;if(!target)return null;
  const dormant=game.area!==target.area,arrived=!dormant&&target.rx===game.rx&&target.ry===game.ry&&!Number.isFinite(target.x);
  hudSet(arrow,"class:dormant",dormant);hudSet(arrow,"class:arrived",arrived);
  // A target with a known site position points at the site itself; otherwise at the middle of its section.
  if(!dormant&&!arrived){const dx=(target.rx-game.rx)*32+(Number.isFinite(target.x)?target.x+.5:16)-game.player.x,dy=(target.ry-game.ry)*32+(Number.isFinite(target.y)?target.y+.5:16)-game.player.y;hudSet(arrow,"transform",`rotate(${Math.round(Math.atan2(dy,dx)*180/Math.PI+90)}deg)`)}else hudSet(arrow,"transform","");
  const away=Math.max(Math.abs(target.rx-game.rx),Math.abs(target.ry-game.ry));
  return dormant?`${target.name} resumes beyond this ${game.area}`:arrived?`${target.name} reached`:away?`${target.name}, ${away} section${away===1?"":"s"} ${compassHeading(target.rx-game.rx,target.ry-game.ry)}`:`${target.name}, in this section`;
}
function updateNavigationCompass() {
  const targets=navigationTargets(),guidanceLabel=updateNavigationArrow(navGuidanceArrow,targets.guidance),manualLabel=updateNavigationArrow(navManualArrow,targets.manual),labels=[];
  if(guidanceLabel)labels.push(`Guidance: ${guidanceLabel}`);if(manualLabel)labels.push(`Manual waypoint: ${manualLabel}`);
  if(navCompass.hidden!==!labels.length)navCompass.hidden=!labels.length;if(!labels.length)return;
  const manualArrived=targets.manual&&game.area===targets.manual.area&&targets.manual.rx===game.rx&&targets.manual.ry===game.ry,arrivalKey=manualArrived?`${targets.manual.rx},${targets.manual.ry}`:null;
  if(arrivalKey&&announcedManualArrival!==arrivalKey)showEventBanner("WAYPOINT REACHED",targets.manual.name,"discovery");announcedManualArrival=arrivalKey;
  const label=labels.join(". ");hudSet(navCompass,"aria-label",label);hudSet(navCompass,"title",label);
}
// Active quests (Journal tab, release 155): every hunt, errand and story lead in progress, with where it is and a
// button that points the compass at it. Nothing here is drawn on the compass itself.
function activeQuests(){
  const out=[],add=(title,detail,at)=>out.push({title,detail,at:at&&Number.isInteger(at.rx)&&Number.isInteger(at.ry)?{rx:at.rx,ry:at.ry}:null});
  for(const c of Object.values(save.viewport?.contracts||{}))if(["accepted","tracking","target-located"].includes(c?.status))add(`Hunt: ${c.title||"Viewport hunt"}`,`${c.id===save.viewport.activeHuntId?"Tracked hunt · ":""}${String(c.status).replace("-"," ")}${c.summary?` · ${c.summary}`:""}`,c.target);
  const w=save.wanderer?.quest;if(w)add("Old Quillon's errand",w.done?"Done. Find Quillon on the road to collect your pay.":w.type==="hunt"?`Defeat creatures: ${w.progress}/${w.goal}.`:w.type==="cache"?"Find his buried satchel.":"Stand in any town square.",w.type==="cache"&&!w.done?w.target:null);
  const beast=save.questingBeast?.active;if(beast)add("The Questing Beast",`It roams this section. ${questingBeastTriesLeft(save)} tries remain.`,beast);
  const far=save.relayNetwork?.coordinate;if(far){const f=ensureFarArray(save);if(!f.quiet)add("The Far Array",`Gate ${f.gate}: ${f.pieces}/${piecesNeeded(f.gate)} pieces. Enter at the Array Mouth.`,far)}
  const echo=save.story?.arcs?.cartographersEcho;if(echo?.site&&!echo.completed)add("The Unwritten Meridian","The cartographer's echo waits here.",echo.site);
  if(save.narrative?.facts?.["leads.active"]&&!save.narrative.facts["leads.complete"])add("Relay leads","Follow the wayfinding marks toward the buried crossings.",null);
  if(!save.worldFlags?.worldBossDead)add("A great enemy","Something vast waits at the heart of the Corridor.",{rx:0,ry:0});
  return out;
}
function renderQuests(out){
  const h=document.createElement("h3");h.textContent="Active quests";out.append(h);
  const row=(title,detail,at,name)=>{const card=document.createElement("div"),t=document.createElement("strong"),d=document.createElement("p");card.className="item";t.textContent=title;const away=at?Math.max(Math.abs(at.rx-game.rx),Math.abs(at.ry-game.ry)):0;d.textContent=detail+(at?` · section ${at.rx},${at.ry} · ${away?`${away} section${away===1?"":"s"} ${compassHeading(at.rx-game.rx,at.ry-game.ry)}`:"in this section"}`:"");card.append(t,d);
    if(at){const pinned=compassPin?.rx===at.rx&&compassPin?.ry===at.ry;card.append(uiButton(pinned?"Compass points here":"Point compass here",()=>{compassPin={rx:at.rx,ry:at.ry,name};rememberGuidance();openJournal("quests")}))}out.append(card)};
  const quests=activeQuests();if(!quests.length){const p=document.createElement("p");p.className="options-note";p.textContent="No hunts or errands in progress. Viewport posts hunts; Old Quillon gives errands on the road.";out.append(p)}
  for(const q of quests)row(q.title,q.detail,q.at,q.title);
  const near=objectiveList().filter((o)=>o.kind==="challenge");if(near.length){const h2=document.createElement("h3");h2.textContent="Unfinished challenges you have found";out.append(h2);for(const o of near)row(o.name,"Not yet cleared",{rx:o.rx,ry:o.ry},o.name)}
  if(compassPin)out.append(uiButton("Let the compass choose again",()=>{compassPin=null;rememberGuidance();openJournal("quests")}));
}
// Tapping the compass names its target and steps to the next objective (release 153).
navCompass.setAttribute("role","button");navCompass.tabIndex=0;
let overlayClosedAt=-1e9; // release 279: the tap that closes the Atlas (or any panel) must not land on the compass beneath
navCompass.addEventListener("click",()=>{
  if(performance.now()-overlayClosedAt<500)return;
  if(game.area!=="overworld"){game.message="The compass settles while you are inside. It points again once you are back in the open.";return}
  const list=objectiveList();if(!list.length){game.message="The compass finds nothing unfinished nearby. Explore further to give it something to find.";return}
  // The first tap names the nearest objective; each later tap moves on to the next one.
  const current=compassObjective(),next=compassPick===null?current:list[(list.indexOf(current)+1)%list.length];
  compassPick=`${next.rx},${next.ry}`;compassPin=null;rememberGuidance();
  const away=Math.max(Math.abs(next.rx-game.rx),Math.abs(next.ry-game.ry));
  game.message=`Compass (${list.indexOf(next)+1}/${list.length}): ${next.name} · ${away?`${away} section${away===1?"":"s"} ${compassHeading(next.rx-game.rx,next.ry-game.ry)}`:"in this section"} · section ${next.rx},${next.ry}. Tap again for the next.`;
});
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
// Release 327 (Tim: "the music and the game is too low... on my headphones... too understated, so it just needs to be
// louder"): the whole mix measured about -50 dBFS RMS. A gentler compressor with makeup gain, a higher master and a
// brighter filter bring the score to about -20 dBFS RMS (peaks near -11), roughly 30 dB louder, with room for the pulse.
const AUDIO_MIX = { master: 0.45, music: 0.72, makeup: 3, lowpass: 2200, compressor: { threshold: -30, knee: 18, ratio: 3 } };
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
    echo = audio.createGain(),
    makeup = audio.createGain();
  compressor.threshold.value = AUDIO_MIX.compressor.threshold;
  compressor.knee.value = AUDIO_MIX.compressor.knee;
  compressor.ratio.value = AUDIO_MIX.compressor.ratio;
  makeup.gain.value = AUDIO_MIX.makeup;
  audioGain.gain.value = muted ? 0 : AUDIO_MIX.master * settings.masterVolume;
  musicBus.gain.value = AUDIO_MIX.music * settings.musicVolume;
  filter.type = "lowpass";
  filter.frequency.value = AUDIO_MIX.lowpass;
  filter.Q.value = 0.7;
  delay.delayTime.value = 0.37;
  echo.gain.value = 0.18;
  musicBus
    .connect(filter)
    .connect(compressor)
    .connect(makeup)
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
    audioGain.gain.linearRampToValueAtTime(muted ? 0 : AUDIO_MIX.master * settings.masterVolume, t + 0.35);
  }
};
setInterval(() => {
  const value = save.perception?.aperture || 0,
    tier = apertureTier(value),
    next = APERTURE_THRESHOLDS[tier],
    unlock = tier === 0 ? "inscriptions" : tier === 1 ? "annexes" : tier === 2 ? "deep relics" : `${apertureBand(value).name} · Resonance ${tier - 3}`;
  objective.textContent = `${currentObjective(save)} · Aperture ${value}${next ? "/" + next : ""}: ${unlock}`;
}, 250);
// Release 523 (dungeon-traps.ts): a pentagram etched in the floor, a cracked lava vent, a dart slit in a wall. Each glows
// while it warns.
function drawNewTrap(o, x, y, s, t) {
  const warn = o.phase === "warning", rest = o.phase === "rest", pulse = .5 + .5 * Math.sin(t * 14);
  ctx.save(); ctx.lineWidth = 2;
  if (o.trapType === "sigil") {
    const r = s * .38; ctx.strokeStyle = warn ? `rgba(230,160,255,${.6 + .4 * pulse})` : rest ? "#5d4a6a" : "#8a6aa8"; ctx.fillStyle = warn ? "#b35cff33" : "#1a12228a";
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath();
    for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 4 / 5, px = x + Math.cos(a) * r * .9, py = y + Math.sin(a) * r * .9; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke();
  } else if (o.trapType === "lava") {
    const r = s * .34; ctx.fillStyle = warn ? `rgba(255,${120 + 80 * pulse},40,.75)` : rest ? "#3a1e1488" : "#5a2a1499"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = warn ? "#ffd27a" : "#c4582a"; ctx.beginPath(); ctx.moveTo(x - r * .8, y - r * .2); ctx.lineTo(x - r * .1, y + r * .2); ctx.lineTo(x + r * .3, y - r * .3); ctx.lineTo(x + r * .8, y + r * .1); ctx.moveTo(x - r * .1, y + r * .2); ctx.lineTo(x, y + r * .8); ctx.stroke();
  } else if (o.trapType === "pit") { // release 525: cracks as it warns, then a black hole
    const h = s * .46;
    if (o.phase === "open") { ctx.fillStyle = "#050307"; ctx.fillRect(x - h, y - h, h * 2, h * 2); ctx.strokeStyle = "#3a2c22"; ctx.lineWidth = 3; ctx.strokeRect(x - h, y - h, h * 2, h * 2); ctx.fillStyle = "#00000088"; ctx.fillRect(x - h, y - h, h * 2, h * .5); }
    else { if (warn) { ctx.fillStyle = `rgba(220,40,20,${.25 + .3 * pulse})`; ctx.fillRect(x - h, y - h, h * 2, h * 2); } /* release 527: it glows red as it crumbles */ ctx.strokeStyle = warn ? `rgba(255,70,40,${.6 + .4 * pulse})` : "#5e5244"; ctx.lineWidth = warn ? 2.5 : 1.5; ctx.strokeRect(x - h, y - h, h * 2, h * 2); if (warn) { ctx.beginPath(); ctx.moveTo(x - h, y - h * .2); ctx.lineTo(x - h * .2, y + h * .1); ctx.lineTo(x + h * .3, y - h * .5); ctx.moveTo(x - h * .2, y + h * .1); ctx.lineTo(x + h * .1, y + h); ctx.moveTo(x + h * .3, y - h * .5); ctx.lineTo(x + h, y - h * .1); ctx.stroke(); } }
  } else if (o.trapType === "vortex") { // release 527: a rune ring that drags you to its eye
    const r = s * DUNGEON_TRAPS.vortex.radius, live = warn || o.phase === "pulling";
    ctx.strokeStyle = o.phase === "pulling" ? `rgba(255,120,60,${.7 + .3 * pulse})` : warn ? `rgba(120,200,255,${.5 + .5 * pulse})` : rest ? "#3c4a5a" : "#5b7590"; ctx.lineWidth = live ? 3 : 1.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.beginPath(); for (let i = 0; i < 3; i++) { const a0 = t * (live ? 6 : 1.2) + i * 2.09; ctx.moveTo(x + Math.cos(a0) * r * .9, y + Math.sin(a0) * r * .9); ctx.quadraticCurveTo(x + Math.cos(a0 + .9) * r * .45, y + Math.sin(a0 + .9) * r * .45, x, y); } ctx.stroke();
  } else if (o.trapType === "dart") {
    const bx = x - (o.dirX || 0) * s * .45, by = y - (o.dirY || 0) * s * .45, along = Math.atan2(o.dirY || 0, o.dirX || 1) + Math.PI / 2;
    ctx.strokeStyle = warn ? `rgba(255,220,120,${.6 + .4 * pulse})` : "#8c7a5a"; ctx.lineWidth = 3;
    for (const k of [-1, 0, 1]) { const ox = Math.cos(along) * k * s * .18, oy = Math.sin(along) * k * s * .18; ctx.beginPath(); ctx.moveTo(bx + ox, by + oy); ctx.lineTo(bx + ox + (o.dirX || 0) * s * .12, by + oy + (o.dirY || 0) * s * .12); ctx.stroke(); }
  }
  ctx.restore();
}
function drawDungeonSystems() {
  const s = Math.round(Math.max(28, Math.min(44, innerWidth / 12))),
    sx = (x) => innerWidth / 2 + (x - game.player.x) * s,
    sy = (y) => innerHeight / 2 + (y - game.player.y) * s;
  ctx.save();
  for (const o of game.map.objects) {
    if (o.kind === "trap" && o.newTrap) continue; // release 523: drawNewTraps
    if (o.kind === "trap") {
      const active = o.phase === "active",
        warning = o.phase === "warning";
      ctx.strokeStyle = o.gas ? (active ? "#9fe85a" : warning ? "#c8d86a" : "#5c6b48") : active ? "#e66a3d" : warning ? "#c99a58" : "#756b5a"; // release 303: green gas jets
      ctx.fillStyle = o.gas ? (active ? "#7cbf3a55" : "#17151288") : active ? "#a43c2638" : "#17151288";
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
    if (!e.dead && e.telegraph > 0 && dungeonPointDiscovered(game.map,e))
      out.enemies.push({
        kind: "circle",
        x: e.x + 0.5,
        y: e.y + 0.5,
        radius: enemyDangerRadius(e),
        large: (Number(e.scale) || 1) > 1.25,
      });
  for (const o of game.map.objects)
    if (o.kind === "trap" && !o.newTrap && dungeonPointDiscovered(game.map,o)) // release 523: drawNewTraps draws the new ones
      out.traps.push(
        o.trapType === "fire"
          ? {
              kind: "rect",
              x: o.x,
              y: o.y,
              dirX: Number(o.dirX)||1,
              dirY: Number(o.dirY)||0,
              width: (Number(o.range)||3)+1,
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
    if(dungeonPointDiscovered(game.map,fx))out.effects.push({ kind: "circle", x: fx.x, y: fx.y, radius: fx.radius });
  return out;
}
// Release 523: the new traps and the sigil orbs, on the live combat layer.
function drawNewTraps(s, sx, sy) {
  if (game.area !== "dungeon") return;
  const t = performance.now() / 1000;
  for (const o of game.map.objects) if (o.kind === "trap" && o.newTrap && dungeonPointDiscovered(game.map, o)) drawNewTrap(o, sx(o.x + .5), sy(o.y + .5), s, t);
  for (const q of game.trapSeeds || []) { // the sigil orbs, landing and spinning
    const x = sx(q.x), y = sy(q.y), landed = q.t >= DUNGEON_TRAPS.sigil.flight, r = s * (landed ? .22 : .16);
    ctx.fillStyle = "#c46bff44"; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, 7); ctx.fill();
    ctx.fillStyle = "#f2d9ff"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (landed) { ctx.strokeStyle = "#d58bff"; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 5; i++) { const a = q.spin + t * 9 + i * Math.PI * 4 / 5, px = x + Math.cos(a) * r * 2.4, py = y + Math.sin(a) * r * 2.4; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); }
  }}
function drawTruthfulCombatGeometry() {
  const s = Math.round(Math.max(28, Math.min(44, innerWidth / 12))),
    sx = (x) => innerWidth / 2 + (x - game.player.x) * s,
    sy = (y) => innerHeight / 2 + (y - game.player.y) * s,
    g = combatIndicatorGeometry(game);
  ctx.save();
  drawNewTraps(s, sx, sy); // release 523
  for (const q of g.traps) {
    ctx.fillStyle = q.active ? "#a43c2638" : "#17151288";
    ctx.strokeStyle = q.active ? "#ef8158" : "#8c806d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (q.kind === "rect"){
      const angle=Math.atan2(q.dirY,q.dirX);ctx.save();ctx.translate(sx(q.x),sy(q.y));ctx.rotate(angle);ctx.rect(-s,-q.height*s/2,q.width*s,q.height*s);ctx.fill();ctx.stroke();ctx.restore();continue;
    }
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
    ctx.strokeStyle = "rgba(215,149,72,.38)"; // release 469: a wide soft stroke under the edge instead of shadowBlur (costly on phone GPUs)
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, Math.max(a - half, sweep - 0.48), sweep);
    ctx.stroke();
    ctx.strokeStyle = "#ffe0a0";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, Math.max(a - half, sweep - 0.48), sweep);
    ctx.stroke();
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
      d = renderScaleForViewport(w, h, devicePixelRatio || 1, currentQuality());
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
    // The canvas area label sits just beneath Map and Pack (release 183, Tim), aligned with them, and stops short of the
    // first control to its right (the action cluster, or Potion where the bottom row holds it).
    const controls = document.querySelector(".left-controls")?.getBoundingClientRect();
    if (controls?.height) {
      const labelTop = controls.bottom + 5, right = [...document.querySelectorAll(".action-diamond, .quick-row button")].map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.left > controls.left && r.bottom > labelTop && r.top < labelTop + 24).reduce((m, r) => Math.min(m, r.left), innerWidth);
      game.labelInset = Math.round(innerHeight - labelTop);
      game.labelX = Math.round(controls.left);
      game.labelMaxWidth = Math.max(90, Math.round(right - controls.left - 8));
    } else game.labelInset = 122;
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
applyPresentationSettings();
const persist = () => measured("persist", () => saveGame(game.exportSnapshot(performance.now())));
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
  overlayPause = false; gearPick = null; // release 469
  $("#pauseError")?.remove();
  for (const d of [pausePanel, atlas, panel, journal, optionsPanel]) if (d.open) d.close();
  game.setPaused(false, performance.now());
  input.reset();
  last = performance.now();
  persist();
}
pausePanel.addEventListener("cancel",(event)=>event.preventDefault());
// Release 125: Android's back gesture can close the pause menu even though its cancel is prevented (Chrome skips the
// cancel event when there was no tap since the menu opened, e.g. after returning from the background). The game then
// stayed paused with no menu: a freeze. Back on the pause menu now means Continue. Overlay transitions close the menu
// after pauseForOverlay(), so they are not mistaken for a dismissal.
pausePanel.addEventListener("close",()=>{if(!pausePanel.open&&game.paused&&!overlayPause&&!document.hidden&&![atlas,panel,journal,optionsPanel].some((d)=>d.open))resume()});
// Release 145: an overlay that throws while opening has already paused the game (and may have closed the pause menu),
// leaving nothing on screen. Wherever the error surfaces (the frame loop, a button handler, a promise), show the pause
// menu with the error, so play can continue and the cause can be reported.
// Release 149: the last few errors, newest last, for Copy diagnostics (repeats of the same message are counted, not stored).
const recentErrors=[];
function noteError(error){
  const message=String(error?.message||error||"unknown error"),last=recentErrors[recentErrors.length-1];
  if(last?.message===message){last.count++;return}
  recentErrors.push({at:new Date().toISOString(),message,stack:String(error?.stack||"").split("\n").slice(0,8).join("\n"),count:1});
  if(recentErrors.length>8)recentErrors.shift();
}
function recoverOverlay(error){
  noteError(error);
  if(!game.paused||document.hidden||[pausePanel,atlas,panel,journal,optionsPanel].some((d)=>d.open))return;
  overlayPause=false;let note=$("#pauseError");
  if(!note){note=document.createElement("p");note.id="pauseError";note.className="options-note options-danger";pausePanel.append(note)}
  note.textContent=`That screen could not open (${error?.message||error||"unknown error"}). Resume to keep playing.`;
  try{pausePanel.showModal()}catch{resume()}
}
addEventListener("error",(event)=>recoverOverlay(event.error||event.message));
addEventListener("unhandledrejection",(event)=>recoverOverlay(event.reason));
const optionCategories=["Journeys","Performance","Controls","Accessibility","Audio","System"];
let optionCategory="Journeys";
function optionMessage(text,isError=false){let p=$("#optionsStatus");if(!p){p=document.createElement("p");p.id="optionsStatus";optionsBody.prepend(p)}p.textContent=text;p.className=isError?"options-note options-danger":"options-note"}
function downloadText(name,text){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([text],{type:"application/json"}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
const journeyOperation=createExclusiveOperation();
async function switchJourney(slot){if(slot===getActiveSlot()){resume();return}try{const result=await journeyOperation.run(async()=>{await persist();await flushSaves();setActiveSlot(slot)});if(result.busy)return optionMessage("Another journey operation is already finishing.",true);location.reload()}catch(error){optionMessage(`Journey switch failed: ${error?.message||error}`,true)}}
function journeyInput(label,value="",placeholder=""){const row=document.createElement("label"),caption=document.createElement("strong"),input=document.createElement("input");row.className="setting-row journey-input";caption.textContent=label;input.type="text";input.value=value;input.placeholder=placeholder;input.autocomplete="off";row.append(caption,input);return{row,input}}
function renderJourneyCreator(meta){optionsBody.replaceChildren();const heading=document.createElement("h3"),note=document.createElement("p"),name=journeyInput("Journey name","Wayfarer"),seed=journeyInput("World seed","","Leave blank to generate a seed"),actions=document.createElement("div"),replace=!meta.empty;heading.textContent=replace?`Replace ${meta.name}`:`Start Journey ${meta.slot}`;note.className="options-note";note.textContent=replace?"The current journey will be retained as a recovery snapshot. Creation begins only after explicit confirmation.":"This creates an independent schema-14 journey and makes it active after the save completes.";actions.className="slot-actions";let confirmed=!replace,confirmInput=null;if(replace){const confirmRow=document.createElement("label");confirmInput=document.createElement("input");confirmInput.type="checkbox";confirmRow.className="setting-row";confirmRow.append("I understand this replaces the occupied slot",confirmInput);optionsBody.append(heading,note,name.row,seed.row,confirmRow)}else optionsBody.append(heading,note,name.row,seed.row);const create=uiButton(replace?"Confirm and start new journey":"Create journey",async()=>{confirmed=!replace||!!confirmInput?.checked;if(!confirmed)return optionMessage("Confirm replacement before creating the new journey.",true);create.disabled=true;cancel.disabled=true;optionMessage("Creating the new journey…");try{const result=await journeyOperation.run(()=>commitNewJourneyTransition({activeSlot:getActiveSlot(),targetSlot:meta.slot,targetEmpty:meta.empty,options:{name:name.input.value,seed:seed.input.value,replace},saveCurrent:persist}));if(result.busy){create.disabled=false;cancel.disabled=false;return optionMessage("Another journey operation is already finishing.",true)}location.reload()}catch(error){create.disabled=false;cancel.disabled=false;optionMessage(`New journey was not created: ${error?.message||error}`,true)}}),cancel=uiButton("Cancel",()=>renderOptions("Journeys"));if(replace){create.disabled=true;confirmInput.onchange=()=>{create.disabled=!confirmInput.checked}}actions.append(create,cancel);optionsBody.append(actions);name.input.focus()}
function renderJourneyRename(meta){optionsBody.replaceChildren();const heading=document.createElement("h3"),name=journeyInput("Journey name",meta.name),actions=document.createElement("div");heading.textContent=`Rename ${meta.name}`;actions.className="slot-actions";const saveName=uiButton("Save name",async()=>{const value=name.input.value.trim();if(!value)return optionMessage("Enter a journey name.",true);saveName.disabled=true;try{await renameJourney(meta.slot,value);await renderOptions("Journeys")}catch(error){saveName.disabled=false;optionMessage(`Rename failed: ${error?.message||error}`,true)}});actions.append(saveName,uiButton("Cancel",()=>renderOptions("Journeys")));optionsBody.append(heading,name.row,actions);name.input.focus()}
async function renderJourneys(){
  const active=getActiveSlot(),slots=await listJourneySlots(),grid=document.createElement("div");grid.className="slot-grid";
  for(const meta of slots){const card=document.createElement("section");card.className=`slot-card ${meta.health}${meta.slot===active?" active":""}`;const h=document.createElement("h3"),health=document.createElement("span"),details=document.createElement("p"),actions=document.createElement("div");h.textContent=meta.empty?`Empty Journey ${meta.slot}`:meta.name;health.className="health-badge";health.textContent=meta.slot===active?`${meta.health} · active`:meta.health;details.textContent=meta.empty?"Ready for a new Corridor.":`Level ${meta.level} · ${meta.location} · ${meta.explored} sections · ${meta.playSeconds?`${(meta.playSeconds/3600).toFixed(1)} h played · `:""}${Math.ceil(meta.bytes/1024)} KB${meta.updatedAt?` · ${new Date(meta.updatedAt).toLocaleDateString()}`:""}`;actions.className="slot-actions";
    if(meta.empty){actions.append(uiButton("New journey",()=>renderJourneyCreator(meta)))}
    else if(meta.health==="healthy"){
      actions.append(uiButton(meta.slot===active?"Continue":"Continue here",()=>switchJourney(meta.slot)),uiButton("Start new here",()=>renderJourneyCreator(meta)),uiButton("Rename",()=>renderJourneyRename(meta)),uiButton("Duplicate",async()=>{const target=slots.find(q=>q.empty)?.slot;if(!target)return optionMessage("All three journey slots are occupied.",true);try{await duplicateJourney(meta.slot,target);await renderOptions("Journeys")}catch(e){optionMessage(e.message,true)}}),uiButton("Export",async()=>{try{downloadText(`infinite-corridor-${meta.slot}.json`,await exportJourney(meta.slot))}catch(e){optionMessage(e.message,true)}}));
    }else actions.append(uiButton("Recover",async()=>{try{await recoverJourney(meta.slot);await renderOptions("Journeys")}catch(e){optionMessage(e.message,true)}}));
    if(!meta.empty){const del=uiButton("Delete",async()=>{if(!confirm(`Delete ${meta.name}? A recovery snapshot is kept.`)||!confirm("Confirm deletion of this journey slot."))return;try{await flushSaves();await deleteJourney(meta.slot);if(meta.slot===active){setActiveSlot(slots.find(q=>q.slot!==meta.slot&&!q.empty)?.slot||slots.find(q=>q.slot!==meta.slot)?.slot||1);location.reload();return}await renderOptions("Journeys")}catch(e){optionMessage(e.message,true)}});del.className="options-danger";actions.append(del)}
    const importer=uiButton("Import",()=>{const file=document.createElement("input");file.type="file";file.accept="application/json,.json";file.onchange=async()=>{try{const text=await file.files[0].text(),replace=!meta.empty&&confirm("Replace this slot? Its healthy save will be kept as a recovery snapshot.");if(!meta.empty&&!replace)return;await importJourney(meta.slot,text,replace);await renderOptions("Journeys")}catch(e){optionMessage(e.message,true)}};file.click()});actions.append(importer);card.append(h,health,details,actions);grid.append(card)}
  optionsBody.append(grid);
}
function settingRow(label,control,description=""){const row=document.createElement("label"),text=document.createElement("span");row.className="setting-row";text.innerHTML=`<strong>${label}</strong>${description?`<br><small>${description}</small>`:""}`;row.append(text,control);return row}
function selectSetting(key,choices){const s=document.createElement("select");for(const[value,label]of choices){const o=document.createElement("option");o.value=value;o.textContent=label;s.append(o)}s.value=String(settings[key]);s.onchange=()=>updateSetting(key,s.value);return s}
function rangeSetting(key,min,max,step){const input=document.createElement("input");input.type="range";input.min=min;input.max=max;input.step=step;input.value=settings[key];input.oninput=()=>updateSetting(key,Number(input.value));return input}
function toggleSetting(key){const input=document.createElement("input");input.type="checkbox";input.checked=!!settings[key];input.onchange=()=>updateSetting(key,input.checked);return input}
function updateSetting(key,value){Object.assign(settings,saveSettings({...settings,[key]:value}));applyPresentationSettings();optionMessage(`${key.replace(/([A-Z])/g," $1")} updated. Quality changes apply without changing journey data.`)}
// The Far Gate (Journal tab, release 139): the Gate drawn as a ring of pieces that light as relay guardians fall, with
// its tier, the Listener's form, chosen boons, any pending boon or ending choice, and the run history.
function drawGate(canvas,f){const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height,cx=w/2,cy=h/2+6,R=Math.min(w,h)*.36,need=piecesNeeded(f.gate),open=f.pieces>=need,t=performance.now()/1000;
  ctx.clearRect(0,0,w,h);const bg=ctx.createRadialGradient(cx,cy,R*.2,cx,cy,R*1.5);bg.addColorStop(0,open?"#3a2a5a":"#1a1722");bg.addColorStop(1,"#0b0a10");ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  for(let i=0;i<need;i++){const a0=-Math.PI/2+i*2*Math.PI/need+.04,a1=a0+2*Math.PI/need-.08,lit=i<f.pieces;ctx.beginPath();ctx.arc(cx,cy,R,a0,a1);ctx.arc(cx,cy,R*.72,a1,a0,true);ctx.closePath();ctx.fillStyle=lit?(open?"#d9b8ff":"#9f7ad9"):"#2a2633";ctx.fill();ctx.strokeStyle=lit?"#f3eaff":"#4a4458";ctx.lineWidth=2;ctx.stroke();
    if(lit){const am=(a0+a1)/2;ctx.fillStyle="#fff8";ctx.beginPath();ctx.arc(cx+Math.cos(am)*R*.86,cy+Math.sin(am)*R*.86,3,0,7);ctx.fill()}}
  ctx.beginPath();ctx.arc(cx,cy,R*.62,0,7);ctx.fillStyle=open?`rgba(201,166,255,${.35+.15*Math.sin(t*3)})`:"#120f18";ctx.fill();ctx.strokeStyle="#6b5a8a";ctx.stroke();
  ctx.fillStyle=open?"#f3eaff":"#8f86a6";ctx.font="bold 15px monospace";ctx.textAlign="center";ctx.fillText(`GATE ${f.gate}`,cx,cy-4);ctx.font="12px monospace";ctx.fillText(open?"OPEN":`${f.pieces} / ${need}`,cx,cy+14)}
function renderFarGate(out){
  const f=ensureFarArray(save),h=document.createElement("h3"),p=document.createElement("p");h.textContent="The Far Gate";p.className="options-note";out.append(h,p);
  if(!save.relayNetwork?.coordinate){p.textContent="The relay line has not answered yet. Answer five relays (restore or sever them) and the network will give you a coordinate.";return}
  const c=save.relayNetwork.coordinate,lean=relayLean(save),form=listenerForm(save);
  p.textContent=`${f.quiet?`The Listener has left the Mouth at ${c.rx}, ${c.ry}. Answer ${relaysUntilReturn(save)} more relay${relaysUntilReturn(save)===1?"":"s"} (restore or sever) and the line will say where it went.`:`The Array Mouth stands at ${c.rx}, ${c.ry}. Each guardian you fell in the Array locks a piece of the Gate; when it is whole, the Listener waits below.`} Relays answered: ${lean.answered} (${lean.restored} restored, ${lean.severed} severed); every relay answered makes the Listener stronger, and it ${form==="open"?"wears your face":form==="walled"?"starves behind walls":"is both, by turns"}.`;
  if(!f.quiet){const pinned=compassPin?.rx===c.rx&&compassPin?.ry===c.ry;out.append(uiButton(pinned?"The compass points to the Mouth":"Point compass to the Array Mouth",()=>{compassPin={rx:c.rx,ry:c.ry,name:"The Array Mouth"};rememberGuidance();openJournal("gate")}));} // release 443 (Tim: "a button... make this your active compass... so I can just start navigating to it")
  const canvas=document.createElement("canvas");canvas.width=300;canvas.height=220;canvas.style.width="100%";canvas.style.maxWidth="300px";canvas.style.display="block";canvas.style.margin="8px auto";out.append(canvas);drawGate(canvas,f);
  const stats=document.createElement("p");stats.className="options-note";stats.textContent=`Runs ${f.runs} · Listeners felled ${f.listeners}${f.ending?` · You chose to ${f.ending==="close"?"close the last line":"leave the line open"}`:""}`;out.append(stats);
  if(f.offer.length){const t=document.createElement("h3");t.textContent="Choose a boon";out.append(t);for(const id of f.offer){const b=BOONS[id];out.append(settingRow(b.name,uiButton("Take",()=>{chooseBoon(save,id);syncCharacterStats(save);persist();openJournal("gate")}),b.text))}}
  if(f.endingPending){const t=document.createElement("h3"),q=document.createElement("p");t.textContent="The last line";q.className="options-note";q.textContent="The terminal waits for one answer. Either way, the Gate will climb again.";out.append(t,q,uiButton("Close the last line",()=>{chooseEnding(save,"close");journalOnce(save,"far-array-ending","You closed the last line. Relays across the Corridor fall quiet, but the Gate remembers, and climbs.","The Far Gate");persist();openJournal("gate")}),uiButton("Leave it open",()=>{chooseEnding(save,"open");journalOnce(save,"far-array-ending","You left the line open. Somewhere further out, another coordinate begins to hum.","The Far Gate");persist();openJournal("gate")}))}
  if(f.boons.length){const t=document.createElement("h3");t.textContent="Boons";out.append(t);for(const id of f.boons){const d=document.createElement("p");d.className="options-note";d.textContent=`${BOONS[id].name}: ${BOONS[id].text}`;out.append(d)}}
}
// The Reciter's Tome (Journal tab; releases 122, 124): every book walking the Corridor and, under each, the reciters of
// it you have met, each with their own order (linear or random) and a reset. Books are added by the developer, not in game.
// Release 193: a Glimpse plays full-screen over the paused game. Tapping lets go of it (after a moment). A first
// sighting is recorded and may give the region a fragment; replays (Tome, Options) record nothing.
let glimpseRun=null;
function playGlimpse(id,{replay=false,after=null}={}){
  if(glimpseRun||!GLIMPSES[id])return;
  for(const d of [pausePanel,atlas,panel,journal,optionsPanel])if(d.open)d.close();
  pauseForOverlay();
  const root=$("#glimpse"),hint=$("#glimpseHint"),started=performance.now();root.hidden=false;hint.classList.remove("shown");
  const hintTimer=setTimeout(()=>hint.classList.add("shown"),2500);
  const finish=()=>{
    if(!glimpseRun)return;glimpseRun.stop();glimpseRun=null;clearTimeout(hintTimer);root.hidden=true;root.onclick=null;
    if(!replay){const found=witnessGlimpse(save,id,game.rx,game.ry);if(found&&!found.completed)game.message=readingKnown(save,found.readingId)?`A fragment of ${READINGS[found.readingId].name} is remembered.`:"A fragment is remembered.";persist()}
    if(after)after();else resume();
  };
  glimpseRun=startGlimpse($("#glimpseCanvas"),id,{reduceMotion:!!settings.reduceMotion,quality:currentQuality(),onEnd:finish});
  root.onclick=()=>{if(performance.now()-started>900)finish()};
}
function renderTome(out){
  ensureReciters(save);const rerender=()=>openJournal("tome");
  const h=document.createElement("h3"),intro=document.createElement("p"),status=document.createElement("p");h.textContent="The Reciter's Tome";
  intro.className="options-note";intro.textContent="The books you have heard in the Corridor. Reciters you have met appear under their book; choose how each one recites, or send them back to the first line.";status.className="options-note";out.append(h,intro,status);
  // Release 191: what the Corridor remembers, one entry per Reading with its fragments found. Only Readings already
  // heard are listed, and nothing hints at how many others there are (Tim, 2026-10-19).
  ensureLore(save);const books=document.createElement("section"),bth=document.createElement("h3"),bnote=document.createElement("p");books.className="library-book lore-books";bth.textContent="What the Corridor Remembers";bnote.className="options-note";bnote.textContent="Every region holds the residue of lives that are gone. Its fragments are passages heard from travellers and reciters, things glimpsed, and words found in crossings.";books.append(bth,bnote);
  let shown=0;for(const id of READING_ORDER){const p=bookProgress(save,id);if(!readingKnown(save,id))continue;shown++;const row=document.createElement("p");row.className="lore-book"+(p.mastered?" mastered":"");row.textContent=`${READINGS[id].name} · ${p.found} of ${p.total} fragments${p.mastered?" · Mastered":""}`;books.append(row)}
  if(!shown){const none=document.createElement("p");none.className="options-note library-empty";none.textContent="Nothing yet. Listen to the people on the roads.";books.append(none)}
  out.append(books);
  // Release 595: the Torn Pages, once one is found: each page read so far; with all of them, the last book fills with the Journal.
  {const found=pagesFound(save);if(found.length){const ps=document.createElement("section"),ph=document.createElement("h3");ps.className="library-book";ph.textContent=TORN_PAGES.title;ps.append(ph);
    for(const id of found){const p=document.createElement("p");p.className="options-note";p.textContent=`"${PAGE_TEXT[id]}…"`;ps.append(p)}
    if(found.length>=READING_ORDER.length){const last=document.createElement("p"),fill=document.createElement("p");last.className="lore-book mastered";last.textContent=PAGES_FINAL;fill.className="options-note";const lines=(save.narrative?.journal||[]).slice(-6).map((j)=>j.text||j.title).filter(Boolean);fill.textContent=lines.length?lines.join(" · "):"…";ps.append(last,fill)}
    out.append(ps)}}
  // Release 197: the Elder Wanderers, once one has been heard: every rule heard, drawn small, and the count.
  const elderRules=eldersHeard(save);if(elderRules.length){const es=document.createElement("section"),eh=document.createElement("h3"),en=document.createElement("p"),grid=document.createElement("div"),p=elderProgress(save);es.className="library-book";eh.textContent="The Elder Wanderers";en.className="lore-book"+(p.mastered?" mastered":"");en.textContent=`${p.found} of ${p.total} patterns${p.mastered?" · Mastered":""}`;grid.className="elder-grid";es.append(eh,en,grid);out.append(es);
    for(const rule of elderRules){const c=document.createElement("canvas");c.title=`Rule ${rule}`;grid.append(c);requestAnimationFrame(()=>paintRule(c,rule,"single",{cols:31,rows:16,reduceMotion:true,rowsOf:ruleRows}))}}
  // Release 193: Glimpses already seen can be seen again here (replays record nothing).
  const seen=witnessedGlimpses(save).filter((id)=>glimpseAllowed(id,settings.familySafe));if(seen.length){const gs=document.createElement("section"),gh=document.createElement("h3");gs.className="library-book";gh.textContent="Glimpses";gs.append(gh);for(const id of seen){const row=settingRow(GLIMPSES[id].name,uiButton("See again",()=>playGlimpse(id,{replay:true,after:()=>openJournal("tome")})));gs.append(row)}out.append(gs)}
  // Release 191: a book appears only once you have heard it or met its reciter; the rest of the library stays unknown.
  for(const b of libraryBooks(save).filter((b)=>b.readers.length||b.voices.some((v)=>/[1-9a-f]/.test(save.lore.heard[v]||"")))){
    const sec=document.createElement("section"),bh=document.createElement("h3"),meta=document.createElement("p");sec.className="library-book";
    bh.textContent=b.book;meta.className="options-note";meta.textContent=`${b.sources.join(" · ")} · ${b.lines} lines`;sec.append(bh,meta);
    if(!b.readers.length){const none=document.createElement("p");none.className="options-note library-empty";none.textContent="You have not met anyone who recites this yet.";sec.append(none)}
    for(const q of b.readers){
      const mode=document.createElement("select");for(const[value,label]of[["random","Random"],["linear","Linear"]]){const o=document.createElement("option");o.value=value;o.textContent=label;mode.append(o)}
      mode.value=q.mode;mode.onchange=()=>{setReciterMode(save,q.id,mode.value);persist();status.textContent=`${q.voice}: ${mode.value}.`};
      const row=settingRow(`${q.voice}`,mode,`${q.name} · ${q.mode==="random"?"random lines":`in order, line ${q.at+1} of ${q.count}`}`);
      const reset=uiButton("Reset",()=>{resetReciter(save,q.id);persist();rerender()});reset.className+=" small";row.append(reset);
      sec.append(row);
    }
    out.append(sec);
  }
}
async function renderSettings(category){const grid=document.createElement("div");grid.className="settings-grid";
  if(category==="Performance"){grid.append(settingRow("Quality mode",selectSetting("quality",[["auto","Auto"],["low","Low"],["balanced","Balanced"],["full","Full"]]),`Active: ${currentQuality()}. Low uses a stable 1× render scale; other modes cap at 2×.`),settingRow("Safe mode",toggleSetting("safeMode"),"Reversible low-load presentation mode."),settingRow("Weather detail",toggleSetting("weather"),"Allows ambient weather when the renderer supports it."),settingRow("Performance diagnostics",toggleSetting("diagnostics"),"Records frame timings after the next reload."))}
  if(category==="Controls")grid.append(settingRow("Drag sensitivity",rangeSetting("controlSensitivity",.7,1.8,.05),"Higher values reach full speed with a shorter finger drag."),settingRow("Movement deadzone",rangeSetting("controlDeadzone",0,.3,.01)),settingRow("Movement smoothing",rangeSetting("controlSmoothing",10,60,1),"Higher values respond more immediately."));
  if(category==="Accessibility")grid.append(settingRow("Damage numbers (what you deal, in gold; what you take, in red)",toggleSetting("damageNumbers")),settingRow("Child-safe Glimpses (no horror or violence scenes; creatures stay)",toggleSetting("familySafe")),settingRow("World boss tries (on: 4 deaths and the boss leaves; off: no tries, it loses patience after 3 minutes of fighting, 5 once it is below half health)",toggleSetting("beastTries")),settingRow("Reduce motion",toggleSetting("reduceMotion")),settingRow("High contrast",toggleSetting("highContrast")),settingRow("Interface scale",rangeSetting("uiScale",.85,1.3,.05)),settingRow("Text scale",rangeSetting("textScale",.9,1.35,.05)));
  if(category==="Audio")grid.append(settingRow("Master volume",rangeSetting("masterVolume",0,1,.05)),settingRow("Music volume",rangeSetting("musicVolume",0,1,.05)),settingRow("Effects volume",rangeSetting("effectsVolume",0,1,.05)));
  // Release 149: Copy diagnostics always works (performance recording is a separate, optional part) and carries what a
  // bug report needs: release, browser, screen, recent errors and the active journey's save.
  if(category==="System"){const report=await storageReport(),pre=document.createElement("pre"),browser=navigator.userAgent,standalone=matchMedia?.("(display-mode: standalone)")?.matches||false,copy=uiButton("Copy diagnostics",async()=>{const data={release:617,copiedAt:new Date().toISOString(),browser,standalone,screen:{width:innerWidth,height:innerHeight,pixelRatio:devicePixelRatio},quality:currentQuality(),settings,storage:report,recentErrors,performance:perfEnabled?globalThis.corridorPerfReport():"off",save},text=JSON.stringify(data);try{await navigator.clipboard.writeText(text);optionMessage(`Diagnostics copied (${Math.ceil(text.length/1024)} KB), including your save. Paste it to Claude.`)}catch{downloadText(`corridor-diagnostics-${Date.now()}.json`,text);optionMessage("Copying was blocked, so the diagnostics were downloaded as a file instead.")}});pre.textContent=`Release 617\nBrowser: ${browser}\nInstalled app: ${standalone?"yes":"no"}\nActive journey: ${getActiveSlot()}\nJourney storage: ${Math.ceil(report.totalJourneyBytes/1024)} KB\nBrowser storage: ${report.usage==null?"unavailable":`${Math.ceil(report.usage/1048576)} / ${Math.ceil(report.quota/1048576)} MB`}\nRecent errors: ${recentErrors.length?recentErrors.map((e)=>e.message).join(" | "):"none"}\nPerformance recording: ${perfEnabled?"on":"off (optional; Copy diagnostics works without it)"}`;// Release 185 (Tim): the home-screen app has no reload button. "Get latest release" asks the service worker to fetch
    // a new build, waits for it to take over (at most 15 s), saves, and reloads; with nothing new it simply reloads.
    const latest=uiButton("Get latest release",async()=>{latest.disabled=true;optionMessage("Checking for the latest release…");try{const reg=await navigator.serviceWorker?.getRegistration?.();if(reg){await reg.update();const worker=reg.installing||reg.waiting;if(worker){optionMessage("Downloading the latest release…");await new Promise((done)=>{const check=()=>{if(worker.state==="activated"||worker.state==="redundant")done()};worker.addEventListener("statechange",check);check();setTimeout(done,15000)})}}}catch(error){console.warn("Release check failed; reloading the current build.",error)}optionMessage("Reloading…");await persist();await flushSaves?.();location.reload()});
    grid.append(pre,copy,latest);
    // Release 193: preview every Glimpse (for judging them; nothing is recorded).
    const glimpsePreviews=document.createElement("div");glimpsePreviews.className="settings-grid";for(const id of GLIMPSE_ORDER.filter((q)=>glimpseAllowed(q,settings.familySafe)))glimpsePreviews.append(uiButton(GLIMPSES[id].name,()=>playGlimpse(id,{replay:true,after:()=>openOptions()})));
    const gRow=document.createElement("div"),gText=document.createElement("span");gRow.className="setting-row";gText.innerHTML="<strong>Glimpse previews</strong><br><small>Play each first-person Glimpse. Previews do not count as finding them.</small>";gRow.append(gText,glimpsePreviews);grid.append(gRow);
   // Diagnostic probe (release 165): record five minutes of play, then copy the report.
   const probeNote=document.createElement("p");probeNote.className="options-note";const saved=storedProbeReport();
   probeNote.textContent=probe.running?`Probe running: ${Math.ceil(probe.remaining)} s left. Close this and keep playing.`:saved?`Last probe: ${saved.started} · ${saved.seconds} s · ${saved.frames} frames.`:`The diagnostic probe records ${PROBE.durationSeconds/60} minutes of play (frame times, what each part of the game costs, where you were, touches) so slowdowns can be traced. Start it, then play normally: walk, sail, fight, enter a dungeon.`;
   grid.append(probeNote);
   if(probe.running)grid.append(uiButton("Stop probe now",()=>{probe.stop();try{localStorage.setItem(PROBE_REPORT_KEY,JSON.stringify(probe.report))}catch{}renderOptions("System")}));
   else grid.append(uiButton(`Start diagnostic probe (${PROBE.durationSeconds/60} min)`,()=>{probeGround={builds:rendererDiagnostics().groundBuilds||0,patches:rendererDiagnostics().groundPatches||0};probePhases={};probePrevious=null;probe.start({release:617,browser:navigator.userAgent,screen:{width:innerWidth,height:innerHeight,pixelRatio:devicePixelRatio},canvas:{width:canvas.width,height:canvas.height},quality:currentQuality(),settings:{...settings},standalone:matchMedia?.("(display-mode: standalone)")?.matches||false,hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory});resume();game.message=`Diagnostic probe running for ${PROBE.durationSeconds/60} minutes: play normally. Menus pause it.`}));
   if(storedProbeReport()&&!probe.running)grid.append(uiButton("Copy probe report",async()=>{const text=JSON.stringify(storedProbeReport());try{await navigator.clipboard.writeText(text);optionMessage(`Probe report copied (${Math.ceil(text.length/1024)} KB). Paste it to Claude.`)}catch{downloadText(`corridor-probe-${Date.now()}.json`,text);optionMessage("Copying was blocked, so the probe report was downloaded as a file instead.")}}));
}
  optionsBody.append(grid);
}
async function renderOptions(category=optionCategory){optionCategory=category;optionsBody.replaceChildren();const tabs=$("#optionsTabs");tabs.replaceChildren();for(const name of optionCategories){const b=uiButton(name,()=>renderOptions(name));b.setAttribute("aria-selected",String(name===category));tabs.append(b)}if(category==="Journeys")await renderJourneys();else await renderSettings(category)}
async function openOptions(){pauseForOverlay();if(pausePanel.open)pausePanel.close();setHudExpanded(false);await renderOptions();if(!optionsPanel.open)optionsPanel.showModal()}
// Release 453 (Tim, on a crossing whose exit showed only as a cyan block: "there's no exit... now I'm kind of just trapped"):
// ways out and daises carry a word on the dungeon map.
function dungeonMapTag(o){if(o.kind==="exit")return String(game.areaId()).endsWith(":aperture-annex")?"WAY BACK":o.completionExit||o.id==="threshold-door"?"DOOR OUT":"EXIT";if(o.kind==="warpDais")return"DAIS";if(o.kind==="deepReturn")return"EXIT";return""}
function drawDungeonMap() {
  const selectedLevel=$("#dungeonLevelSelect")?.value,currentLevel=game.map.levelId||"root",map=selectedLevel&&selectedLevel!==currentLevel?generateDungeon(save.seed,game.areaId(),{levelId:selectedLevel}):game.map,d=Math.min(devicePixelRatio,2),w=Math.min(innerWidth*.9,680),h=atlasMapHeight(),cols=map.width||24,rows=map.height||Math.floor(map.tiles.length/cols),pad=18,cell=Math.max(2,Math.min((w-pad*2)/cols,(h-pad*2)/rows)),ox=(w-cell*cols)/2,oy=(h-cell*rows)/2;
  if(map!==game.map&&map.dungeonContract?.discoveryEnabled){const history=dungeonHistory(save,game.areaId()),level=map.levelStableId||map.levelId||"root";applyDungeonDiscovery(map,history.discovery?.levels?.[level]||[])}
  mapCanvas.width=w*d;mapCanvas.height=h*d;mapCanvas.style.width=w+"px";mapCanvas.style.height=h+"px";mctx.setTransform(d,0,0,d,0,0);mctx.imageSmoothingEnabled=false;mctx.fillStyle="#091018";mctx.fillRect(0,0,w,h);
  for(const tile of map.tiles){const x=ox+tile.x*cell,y=oy+tile.y*cell,visibility=dungeonTileVisibility(map,tile.x,tile.y);mctx.fillStyle=visibility==="unseen"?"#05080b":tile.kind==="dungeonWater"?"#245967":tile.blocked?"#182129":({hollow:"#51484a",cistern:"#36565a",kiln:"#68463a"}[map.recipe]||"#51484a");mctx.fillRect(x,y,Math.ceil(cell),Math.ceil(cell));if(visibility!=="unseen"&&!tile.blocked&&cell>9){mctx.strokeStyle="#ffffff0b";mctx.strokeRect(x,y,cell,cell)}}
  const colors={warpDais:"#c9a6ff",/* release 401 (Tim: "the teleportation daises in dungeons should show on the map once you find them") */exit:"#72d7df",chest:"#d8bd83",supplyCache:"#7fc992",relayTerminal:"#b28cda",relayNode:"#ff7a7a",trap:"#d16b62",vine:"#77b98b",apertureDoor:"#c493dd",sealedGate:"#d16b62",deepReturn:"#7bc7d3",hubAnchor:"#e4cf7a",deepTransition:"#dbc18a",deepShortcut:"#9fd0ae",deepPortal:"#bbb4ef",storyActor:"#d9e7ef",storyScene:"#efb18f"};
  for(const o of map.objects||[]){if(!colors[o.kind]||o.state==="hidden"||!dungeonPointDiscovered(map,o))continue;const x=ox+(o.x+.5)*cell,y=oy+(o.y+.5)*cell;mctx.fillStyle=colors[o.kind];mctx.strokeStyle="#0b1014";mctx.lineWidth=2;mctx.beginPath();if(o.kind==="exit"||o.kind==="deepShortcut"){mctx.rect(x-cell*.32,y-cell*.42,cell*.64,cell*.84)}else if(o.kind==="trap"){mctx.moveTo(x,y-cell*.42);mctx.lineTo(x+cell*.4,y+cell*.35);mctx.lineTo(x-cell*.4,y+cell*.35);mctx.closePath()}else if(o.kind==="warpDais"){mctx.arc(x,y,Math.max(4,cell*.42),0,7);mctx.fill();mctx.stroke();mctx.beginPath();mctx.fillStyle="#f3eaff";mctx.arc(x,y,Math.max(1.5,cell*.13),0,7)}else{mctx.arc(x,y,Math.max(3,cell*.28),0,7)}mctx.fill();mctx.stroke();const tag=dungeonMapTag(o);if(tag){mctx.font="bold 11px monospace";const tw=mctx.measureText(tag).width,tx=x+cell*.6+tw>w-4?x-cell*.6-tw:x+cell*.6;mctx.lineWidth=3;mctx.strokeStyle="#0b1014";mctx.fillStyle=colors[o.kind];mctx.strokeText(tag,tx,y+4);mctx.fillText(tag,tx,y+4)}}
  if(map===game.map)for(const e of game.enemies||[]){const k=staggerClass(e);if(e.dead||(k!=="boss"&&k!=="revenant"))continue;const x=ox+(e.x+.5)*cell,y=oy+(e.y+.5)*cell,r=Math.max(5,cell*.5);mctx.fillStyle="#ff5ab4";mctx.strokeStyle="#1a0710";mctx.lineWidth=2;mctx.beginPath();mctx.moveTo(x,y-r);mctx.lineTo(x+r,y);mctx.lineTo(x,y+r);mctx.lineTo(x-r,y);mctx.closePath();mctx.fill();mctx.stroke();mctx.fillStyle="#1a0710";mctx.beginPath();mctx.arc(x,y,Math.max(1.5,r*.28),0,7);mctx.fill()} // release 403 (Tim: "the Psychic Crystal and the Void Walker... any bosses... should be indicated in the dungeon, where they are"): every living boss on this level, wherever it is
  if(map===game.map){const px=ox+(game.player.x+.5)*cell,py=oy+(game.player.y+.5)*cell;mctx.fillStyle="#fff4a8";mctx.strokeStyle="#17140b";mctx.lineWidth=2;mctx.beginPath();mctx.arc(px,py,Math.max(4,cell*.34),0,7);mctx.fill();mctx.stroke();mctx.fillStyle="#e7ece7";mctx.font="12px monospace";mctx.fillText("YOU",px+7,py-7);}else{mctx.fillStyle="#dbc18a";mctx.font="12px monospace";mctx.fillText(`INSPECTING ${map.levelName||map.levelId}`,12,18)}
}
function drawAtlasLabels(labels,bounds,fontSize){const placed=[],overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;mctx.font=`${fontSize}px system-ui`;mctx.fillStyle="#edf3df";for(const label of labels){let text=label.name,max=bounds.right-bounds.left-10;while(text.length>4&&mctx.measureText(text).width>max)text=text.slice(0,-2)+"…";const width=mctx.measureText(text).width,candidates=[[label.x+7,label.y-5],[label.x+7,label.y+fontSize+3],[label.x-width-7,label.y-5],[label.x-width-7,label.y+fontSize+3],[label.x-width/2,label.y-fontSize],[label.x-width/2,label.y+fontSize*2]],spots=candidates.map(([cx,cy])=>{const x=Math.max(bounds.left+5,Math.min(bounds.right-width-5,cx)),y=Math.max(bounds.top+fontSize+5,Math.min(bounds.bottom-6,cy));return{x,y,left:x-2,right:x+width+2,top:y-fontSize-2,bottom:y+3}}),spot=spots.find(q=>!placed.some(p=>overlap(p,q)));if(!spot)continue;mctx.fillText(text,spot.x,spot.y);placed.push(spot)}return placed}
// Atlas map height: leaves room for the title, level picker and map tools, so on short screens (the Fold's outer
// screen held sideways) the tools stay in view instead of falling below the dialog.
// Release 175 (Tim, 2026-10-17): the map also shrinks to leave its tools and layer buttons on screen, measured from the
// open Atlas, so any screen shows the whole working area without scrolling (the details below still scroll).
function atlasMapHeight(){const base=Math.max(140,Math.min(innerHeight*.65,innerHeight-(innerHeight<560?205:260),520));if(!atlas.open)return base;const A=atlas.getBoundingClientRect(),C=mapCanvas.getBoundingClientRect(),L=$("#mapLayers")?.getBoundingClientRect();if(!A.height||!C.height)return base;const above=C.top-A.top+atlas.scrollTop,below=Math.max(0,(L&&L.height?L.bottom:C.bottom)-C.bottom);return Math.max(140,Math.min(base,Math.floor(atlas.clientHeight-above-below-6)))}
// Relay overlay (release 142, Atlas button): the relays you have answered as bright nodes joined to answered neighbours
// within two sections. Release 559: violet triangles mark only explored crossings that really hold a relay still waiting
// (no longer every cell of the pattern, which read as relays that were not there).
let relayOverlay=false;
// Atlas layers (release 155): the buttons under the Atlas switch each kind of marking on or off. The choice is a
// per-device convenience kept in localStorage.
// Release 209/213 (Tim): Wayglasses have a layer of their own, so everything else can be hidden; Places are towns,
// crossings and the other sites worth finding; "Waypoint & death" is the manual waypoint and the last death.
const ATLAS_LAYERS=[["wayglasses","Wayglasses"],["sites","Places"],["signals","Signals"],["objectives","Objectives"],["waypoints","Waypoint & death"],["regions","Regions"]],ATLAS_LAYER_KEY="corridor-atlas-layers";
const atlasLayers=(()=>{const all=Object.fromEntries(ATLAS_LAYERS.map(([k])=>[k,true]));try{return{...all,...JSON.parse(localStorage.getItem(ATLAS_LAYER_KEY)||"{}")}}catch{return all}})();
// Release 213 (Tim): supply caches and shelters are no longer marked on the Atlas.
const CROSSING_KINDS=new Set(["dungeon","arenaEntrance"]),UNMARKED_SITES=new Set(["supplyCache","shack"]);
function siteLayerOn(kind){return kind==="checkpoint"?atlasLayers.wayglasses:UNMARKED_SITES.has(kind)?false:atlasLayers.sites}
function renderAtlasLayerButtons(){
  const row=$("#mapLayers");if(!row)return;row.replaceChildren();
  const save_=()=>{try{localStorage.setItem(ATLAS_LAYER_KEY,JSON.stringify(atlasLayers))}catch{}renderAtlasLayerButtons();drawMap()};
  for(const[k,label]of ATLAS_LAYERS){const b=uiButton(label,()=>{atlasLayers[k]=!atlasLayers[k];save_()});b.setAttribute("aria-pressed",String(atlasLayers[k]));row.append(b)}
  const allOn=ATLAS_LAYERS.every(([k])=>atlasLayers[k]),all=uiButton(allOn?"All off":"All on",()=>{for(const[k]of ATLAS_LAYERS)atlasLayers[k]=!allOn;save_()});row.append(all);
}
function drawRelayOverlay(w,h,cell,cols,rows){
  const at=(rx,ry)=>({x:w/2+(rx-mapView.x)*cell+mapView.panX,y:h/2+(ry-mapView.y)*cell+mapView.panY}),answered=[];
  for(const[id,n]of Object.entries(save.relayNetwork?.nodes||{})){const c=crossingSection(id);if(c)answered.push({...c,choice:n.choice})}
  mctx.save();
  const known=knownRelaySections(save); // release 559: only explored crossings that really hold a relay
  for(let j=-rows;j<=rows;j++)for(let i=-cols;i<=cols;i++){const rx=mapView.x+i,ry=mapView.y+j;if(known.get(`${rx},${ry}`)!=="dormant")continue;const p=at(rx,ry),r=Math.max(2.5,cell*.09);mctx.fillStyle="#c9a6ffdd";mctx.beginPath();mctx.moveTo(p.x,p.y-r*1.6);mctx.lineTo(p.x+r*1.3,p.y+r*.9);mctx.lineTo(p.x-r*1.3,p.y+r*.9);mctx.closePath();mctx.fill()}
  mctx.lineWidth=Math.max(1.5,cell*.04);
  // Each answered relay links to its (at most) two nearest answered neighbours within two sections: chains, not webs.
  const links=new Set();for(const p of answered){const near2=answered.filter(q=>q!==p&&Math.max(Math.abs(p.rx-q.rx),Math.abs(p.ry-q.ry))<=2).sort((a,b)=>Math.hypot(a.rx-p.rx,a.ry-p.ry)-Math.hypot(b.rx-p.rx,b.ry-p.ry)).slice(0,2);for(const q of near2)links.add([p,q].sort((a,b)=>a.rx-b.rx||a.ry-b.ry).map(n=>`${n.rx},${n.ry},${n.choice}`).join("|"))}
  for(const l of links){const[p,q]=l.split("|").map(t=>{const[rx,ry,choice]=t.split(",");return{rx:+rx,ry:+ry,choice}}),A=at(p.rx,p.ry),B=at(q.rx,q.ry);mctx.strokeStyle=p.choice==="sever"&&q.choice==="sever"?"#6a5a7a99":"#7fe7ffaa";mctx.beginPath();mctx.moveTo(A.x,A.y);mctx.lineTo(B.x,B.y);mctx.stroke()}
  for(const n of answered){const p=at(n.rx,n.ry),r=Math.max(3,cell*.1);mctx.fillStyle=n.choice==="restore"?"#7fe7ff":"#2a2236";mctx.strokeStyle=n.choice==="restore"?"#e8fbff":"#9b86c4";mctx.beginPath();mctx.arc(p.x,p.y,r,0,7);mctx.fill();mctx.stroke();if(n.choice==="restore"){mctx.fillStyle="#7fe7ff33";mctx.beginPath();mctx.arc(p.x,p.y,r*2.4,0,7);mctx.fill()}}
  mctx.fillStyle="#cdb8ff";mctx.font="11px monospace";mctx.fillText(`Relays · ${[...known.values()].filter(v=>v==="dormant").length} waiting · ${answered.length} answered · ${relayRuleAt(save.seed,mapView.x,mapView.y)}`,10,16);
  mctx.restore();
}
function drawMap() {
  if(mapMode==="dungeon"&&game.area==="dungeon"){drawDungeonMap();drawDungeonDeathMarker();return}
  // Release 205: held sideways on a short screen, the map takes the left of the whole screen.
  const wide = matchMedia?.("(orientation: landscape) and (max-height: 540px)")?.matches && atlas.open,
    d = Math.min(devicePixelRatio, 2),
    w = wide ? Math.max(220, atlas.clientWidth - 300) : Math.min(innerWidth * 0.9, 680),
    h = wide ? Math.max(160, atlas.clientHeight - 20) : atlasMapHeight();
  mapCanvas.width = w * d;
  mapCanvas.height = h * d;
  mapCanvas.style.width = w + "px";
  mapCanvas.style.height = h + "px";
  mctx.setTransform(d, 0, 0, d, 0, 0);
  mctx.imageSmoothingEnabled = false;
  mctx.fillStyle = "#091018";
  mctx.fillRect(0, 0, w, h);
  const signals=wayfindingCues(save.seed,game.rx,game.ry,save.worldGeneration,save,game.area==="overworld"?game.map:null),signalBySection=new Map(signals.map(q=>[`${q.targetRx},${q.targetRy}`,q])),cell = sectionPixels(mapView.zoom),
    cols = Math.ceil(w / (2 * cell)) + 1,
    rows = Math.ceil(h / (2 * cell)) + 1;
  if(worldView(mapView.zoom)){drawAtlasWorld(w,h,cell,signals);return} // release 205
  // Release 153: the compass target gets a gold frame and unfinished challenges a dashed violet one.
  const openSections=atlasLayers.objectives?openChallengeSections():new Map(),compassTarget=atlasLayers.objectives?navigationTargets().guidance:null,targetKey=compassTarget?.area==="overworld"?`${compassTarget.rx},${compassTarget.ry}`:null;
  for (let j = -rows; j <= rows; j++)
    for (let i = -cols; i <= cols; i++) {
      const rx = mapView.x + i,
        ry = mapView.y + j,
        key = `${rx},${ry}`,
        x = w / 2 + i * cell - cell / 2 + mapView.panX,
        y = h / 2 + j * cell - cell / 2 + mapView.panY,
        seen = !!save.explored[key],signal=atlasLayers.signals?signalBySection.get(key):null,
        frontier =
          !seen &&
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].some(([a, b]) => save.explored[`${rx + a},${ry + b}`]);
      if (!seen && !frontier && !signal && key !== targetKey) continue;
      const record = save.atlas?.[key], terrain = record?.terrain || (rx===game.rx&&ry===game.ry?game.map.dominant:"ash");
      const landscape = record?.landscape || (rx===game.rx&&ry===game.ry?game.map.landscape?.biome:null);
      mctx.fillStyle = seen
        ? record?.color || landscapeAtlasColor(landscape) || { ash: "#51464a", glass: "#315b62", ember: "#794735" }[
            terrain
          ]
        : signal ? "#241f31" : "#202833";
      mctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      mctx.strokeStyle = frontier ? "#596675" : "#9eb9b2";
      mctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
      if (seen) {
        const detailed=(rx===game.rx&&ry===game.ry)||(mapView.selected?.rx===rx&&mapView.selected?.ry===ry),sites=record?.sites||[],compact=[...new Map(sites.map(s=>[s.kind,s])).values()];
        // Release 213: a town (hamlet) in the section is marked like a site, under Places.
        const town=atlasLayers.sites&&((rx===0&&ry===0)||(record?.hamletVersion&&(hamletSection(save.seed,rx,ry)||legacyMouthHamlet(save,rx,ry)||townAt(save,rx,ry))))?{kind:"town",name:rx===0&&ry===0?"Ember Refuge":hamletIdentity(save.seed,rx,ry).name,x:16,y:16}:null;
        const displaySites=[...(town?[town]:[]),...(detailed?sites:compact).filter(s=>siteLayerOn(s.kind))],labelSites=[];
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
      if (atlasLayers.waypoints && save.manualWaypoint?.rx === rx && save.manualWaypoint?.ry === ry) {
        mctx.strokeStyle = "#5fe7ee";
        mctx.strokeRect(x + 8, y + 8, cell - 16, cell - 16);
      }
      if(atlasLayers.waypoints&&seen&&save.lastDeath?.rx===rx&&save.lastDeath?.ry===ry)drawDeathGlyph(mctx,x+cell-13,y+13,Math.max(5,cell*.1),save.lastDeath.valid===false);
      if(openSections.has(key)){mctx.save();mctx.strokeStyle=ATLAS_FRAMES.openChallenge;mctx.lineWidth=2;mctx.setLineDash([5,3]);mctx.strokeRect(x+5,y+5,cell-10,cell-10);mctx.restore()}
      if(key===targetKey){mctx.save();mctx.strokeStyle=ATLAS_FRAMES.compassTarget;mctx.lineWidth=3;mctx.strokeRect(x+1.5,y+1.5,cell-3,cell-3);mctx.restore()}
    }
  if(relayOverlay)drawRelayOverlay(w,h,cell,cols,rows);
  drawLinkedDungeons(w,h,cell);
  {const id=readingAt(mapView.x,mapView.y);if(atlasLayers.regions&&readingKnown(save,id)){mctx.font="bold 13px system-ui, sans-serif";mctx.textAlign="left";mctx.lineWidth=3;mctx.strokeStyle="#091018";mctx.strokeText(READINGS[id].name,10,22);mctx.fillStyle="#f0d58a";mctx.fillText(READINGS[id].name,10,22);mctx.font="11px monospace"}} // release 205: where you are looking
  drawAtlasPins(w,h,cell);
  mctx.fillStyle = "#dce7e2"; mctx.font = "11px monospace";
  mctx.fillText(
    `Center ${mapView.x},${mapView.y} · ${Object.keys(save.explored).length} sections explored · ${signals.length} unresolved signals`,
    10,
    h - 10,
  );
}
// Release 205: the world view. Every explored section is one pixel of a cached image (rebuilt when more of the world is
// explored or a region is heard), drawn scaled; regions you have heard are tinted and named; markers keep a fixed size.
const READING_TINT={longCampaign:"#c8743a",riverThatRemembers:"#3aa0c8",transparentEye:"#8ad06a",yellowCity:"#e0c040",pathAlone:"#a0a0b8",threeBrothers:"#c05a8a",bookOfImages:"#d8a060",underTheFloor:"#6a5ac0",secondCampaign:"#b05a3a",dreamlands:"#9a6fe0"};
let atlasWorldCache=null;
// Release 559 (Tim: "I want to see the world that I actually am exploring not like some fake picture"): a section's own
// colour (atlas-colors.ts, recorded on each visit) is what the Atlas draws; a heard Reading only tints it lightly. Sections
// explored before 559 have none yet: while the Atlas is open they are coloured from their pinned map, nearest the view
// first, one per frame (about 40 ms each on a desktop), and the world image is redrawn as they come in.
const ATLAS_READING_TINT={coloured:.14,plain:.38},ATLAS_BACKFILL={redrawEvery:8};
let atlasColoured=0,atlasBackfilling=false;
function atlasBackfill(){
  if(atlasBackfilling)return;atlasBackfilling=true;let done=0;
  const step=()=>{
    if(!atlas.open){atlasBackfilling=false;if(done)drawMap();return}
    let best=null,bd=Infinity;for(const key of Object.keys(save.explored||{})){const rec=save.atlas?.[key];if(!rec||rec.color)continue;const[rx,ry]=key.split(",").map(Number);if(!Number.isFinite(rx)||!Number.isFinite(ry))continue;const d=Math.abs(rx-mapView.x)+Math.abs(ry-mapView.y);if(d<bd){bd=d;best=[rx,ry,rec]}}
    if(!best){atlasBackfilling=false;if(done)drawMap();return}
    try{best[2].color=sectionAtlasColor(walkerCrossingMap(save,best[0],best[1]))||"#51464a"}catch(error){best[2].color="#51464a";console.warn("Atlas colour failed",error)}
    atlasColoured++;done++;if(done%ATLAS_BACKFILL.redrawEvery===0)drawMap();requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function atlasRgb(c){const h=String(c||"#51464a").replace("#",""),f=h.length===3?h.split("").map(x=>x+x).join(""):h,n=parseInt(f,16);return[(n>>16)&255,(n>>8)&255,n&255]}
// Release 573: a named land region is labelled once `min` of its sections are explored; readings outrank it (`weight`).
const ATLAS_REGION_NAMES={min:3,weight:.5};
function atlasWorldImage(){
  const list=exploredSections(save),key=`${save.seed}:${list.length}:${atlasColoured}:${Object.keys(save.consequences?.dungeons||{}).length}:${Object.keys(save.relayNetwork?.nodes||{}).length}:${Object.keys(save.lore?.entered||{}).join()}:${atlasLayers.regions}:${relayOverlay}`; // seed: another journey never reuses this image
  if(atlasWorldCache?.key===key)return atlasWorldCache;
  const b=boundsOf(list);if(!b)return null;
  const W=b.maxX-b.minX+1,H=b.maxY-b.minY+1,c=document.createElement("canvas");c.width=W;c.height=H;
  const g=c.getContext("2d"),img=g.createImageData(W,H),groups=new Map(),lands=new Map(),crossings=[];
  for(const[rx,ry]of list){const rec=save.atlas?.[`${rx},${ry}`],base=atlasRgb(rec?.color||landscapeAtlasColor(rec?.landscape)||{ash:"#51464a",glass:"#315b62",ember:"#794735"}[rec?.terrain||"ash"]),id=readingAt(rx,ry),known=atlasLayers.regions&&readingKnown(save,id),tint=known?atlasRgb(READING_TINT[id]):null,i=((ry-b.minY)*W+(rx-b.minX))*4;
    const tw=rec?.color?ATLAS_READING_TINT.coloured:ATLAS_READING_TINT.plain;for(let k=0;k<3;k++)img.data[i+k]=tint?Math.round(base[k]*(1-tw)+tint[k]*tw):base[k];img.data[i+3]=255;
    if(known){const q=groups.get(id)||{x:0,y:0,n:0};q.x+=rx;q.y+=ry;q.n++;groups.set(id,q)}
    if(atlasLayers.regions&&rec?.landscapeVersion>=4&&Math.hypot(rx+.5,ry+.5)>=REGIONS.heartland){const r=sectionRegion(save.seed,rx,ry,rec.landscapeVersion),q=lands.get(r.id)||{x:0,y:0,n:0,r};q.x+=rx;q.y+=ry;q.n++;lands.set(r.id,q)} // release 573: the land's own regions, named
    for(const s of rec?.sites||[])if(CROSSING_KINDS.has(s.kind)){crossings.push([rx,ry]);break}}
  g.putImageData(img,0,0);
  atlasWorldCache={key,canvas:c,bounds:b,places:atlasPlaces(save),crossings,relays:relayOverlay?atlasRelayImage(list,b):null,labels:[...groups.entries()].map(([id,q])=>({name:READINGS[id].name,rx:q.x/q.n,ry:q.y/q.n,n:q.n})).concat([...lands.values()].filter(q=>q.n>=ATLAS_REGION_NAMES.min).map(q=>({name:regionName(save.seed,q.r).replace(/^the /,"The "),rx:q.x/q.n,ry:q.y/q.n,n:q.n*ATLAS_REGION_NAMES.weight,land:true})))};
  return atlasWorldCache;
}
// Release 209 (Tim): the relay pattern stays visible zoomed out. Release 559 (Tim: "if there's no relays in the area, then
// it shouldn't show up on the map as a relay, because it's confusing"): only explored sections whose crossing really holds
// an unanswered relay are violet (relay-network.ts knownRelaySections); answered relays are drawn on top as before.
function atlasRelayImage(list,b){
  const M=1,W=b.maxX-b.minX+1+2*M,H=b.maxY-b.minY+1+2*M,c=document.createElement("canvas");c.width=W;c.height=H;
  const g=c.getContext("2d"),img=g.createImageData(W,H),done=new Set();
  for(const[k,state]of knownRelaySections(save)){if(state!=="dormant"||done.has(k))continue;done.add(k);const[rx,ry]=k.split(",").map(Number);if(rx<b.minX||rx>b.maxX||ry<b.minY||ry>b.maxY)continue;const i=((ry-b.minY+M)*W+(rx-b.minX+M))*4;img.data[i]=190;img.data[i+1]=150;img.data[i+2]=255;img.data[i+3]=235}
  g.putImageData(img,0,0);return{canvas:c,minX:b.minX-M,minY:b.minY-M,count:done.size};
}
// Release 217 (Tim): the two mouths of a linked dungeon, joined by a dashed green line with green rings, so they read
// as one crossing and never as a relay (violet) or an ordinary crossing (orange). Shown under Places.
const LINKED_COLOR="#7dff9e";
function drawLinkedDungeons(w,h,cell){
  if(!atlasLayers.sites)return;const links=linksKnown(save);if(!links.length)return;
  const at=(rx,ry)=>[w/2+(rx-mapView.x)*cell+mapView.panX,h/2+(ry-mapView.y)*cell+mapView.panY],r=Math.max(6,Math.min(14,cell*.32));
  mctx.save();mctx.strokeStyle=LINKED_COLOR;mctx.lineWidth=2;
  for(const l of links){const[ax,ay]=at(l.a.rx,l.a.ry),[bx,by]=at(l.b.rx,l.b.ry);mctx.setLineDash([6,5]);mctx.globalAlpha=.85;mctx.beginPath();mctx.moveTo(ax,ay);mctx.lineTo(bx,by);mctx.stroke();
    mctx.setLineDash([]);mctx.globalAlpha=1;for(const[x,y]of[[ax,ay],[bx,by]]){mctx.beginPath();mctx.arc(x,y,r,0,7);mctx.stroke();mctx.beginPath();mctx.arc(x,y,r*.45,0,7);mctx.stroke()}}
  mctx.restore();
}
// Release 223 (Tim): the waypoint and the quest marker stay on the Atlas at every zoom, at a fixed size, on top of
// everything. Off the map's edge, an arrow at the edge points to each with its distance in sections, so zooming out to
// find the quest marker always finds it.
const ATLAS_PIN={size:9,edge:18};
function drawAtlasPins(w,h,cell){
  const at=(rx,ry)=>[w/2+(rx-mapView.x)*cell+mapView.panX,h/2+(ry-mapView.y)*cell+mapView.panY],pins=[];
  const t=navigationTargets();
  { // Release 551 (surveyor.ts): with Corwin's twelve links, the crossings they lay in join into a brass chain on the Atlas, running on to his statue.
    const chain=surveyorChainPath(save); if(chain.length>1){mctx.save();mctx.strokeStyle="#c79a3e";mctx.lineWidth=2;mctx.setLineDash([5,3]);mctx.beginPath();chain.forEach((q,i)=>{const[x,y]=at(q.rx,q.ry);if(i)mctx.lineTo(x,y);else mctx.moveTo(x,y)});mctx.stroke();mctx.setLineDash([]);mctx.fillStyle="#e6c46a";for(const q of chain.slice(0,-1)){const[x,y]=at(q.rx,q.ry);mctx.beginPath();mctx.ellipse(x,y,3.5,2,0,0,7);mctx.fill()}mctx.restore();const st=chain.at(-1);pins.push({rx:st.rx,ry:st.ry,color:"#d9d4c6",label:"Abel Corwin's statue",mark:true})}}
  for(const m of save.mapMarks||[])pins.push({rx:m.rx,ry:m.ry,color:MAP_MARKS.colors[m.color],label:`${MAP_MARKS.names[m.color]} mark`,mark:true}); // release 355: drawn under the waypoint and the quest
  for(const r of retreatsUnderWay(save))pins.push({rx:r.rx,ry:r.ry,color:"#ff8f4a",label:`${WORLD_BEASTS[r.id].name}, retreating`}); // release 605: a retreat can be followed on the Atlas
  if(save.manualWaypoint&&Number.isInteger(save.manualWaypoint.rx))pins.push({rx:save.manualWaypoint.rx,ry:save.manualWaypoint.ry,color:"#5fe7ee",label:save.manualWaypoint.label||"Waypoint"});
  if(t.guidance?.area==="overworld"&&!(save.manualWaypoint&&t.guidance.rx===save.manualWaypoint.rx&&t.guidance.ry===save.manualWaypoint.ry))pins.push({rx:t.guidance.rx,ry:t.guidance.ry,color:ATLAS_FRAMES.compassTarget,label:t.guidance.name||"Quest"});
  const S=ATLAS_PIN.size,E=ATLAS_PIN.edge;
  for(const p of pins){
    const[x,y]=at(p.rx,p.ry);mctx.save();mctx.lineJoin="round";
    if(x>=E&&y>=E&&x<=w-E&&y<=h-E){ // on the map: a pin standing on its section
      mctx.fillStyle="rgba(0,0,0,.35)";mctx.beginPath();mctx.ellipse(x,y,S*.55,S*.22,0,0,7);mctx.fill();
      if(p.mark){mctx.strokeStyle="#091018";mctx.lineWidth=2;mctx.beginPath();mctx.moveTo(x,y);mctx.lineTo(x,y-S*2.6);mctx.stroke();mctx.beginPath();mctx.moveTo(x,y-S*2.6);mctx.lineTo(x+S*1.6,y-S*2.1);mctx.lineTo(x,y-S*1.6);mctx.closePath();mctx.fillStyle=p.color;mctx.fill();mctx.stroke();mctx.restore();continue} // release 355: a map mark is a small flag
      mctx.beginPath();mctx.moveTo(x,y);mctx.bezierCurveTo(x-S*.2,y-S*.8,x-S,y-S*1.3,x-S,y-S*2);mctx.arc(x,y-S*2,S,Math.PI,0);mctx.bezierCurveTo(x+S,y-S*1.3,x+S*.2,y-S*.8,x,y);mctx.closePath();
      mctx.fillStyle=p.color;mctx.strokeStyle="#091018";mctx.lineWidth=2;mctx.fill();mctx.stroke();
      mctx.fillStyle="#091018";mctx.beginPath();mctx.arc(x,y-S*2,S*.38,0,7);mctx.fill();
    }else{ // off the map: an arrow at the edge, pointing to it, with how far it is
      const cx=w/2,cy=h/2,dx=x-cx,dy=y-cy,k=Math.min((w/2-E)/Math.abs(dx||1e-6),(h/2-E)/Math.abs(dy||1e-6)),ex=cx+dx*k,ey=cy+dy*k,a=Math.atan2(dy,dx);
      mctx.translate(ex,ey);mctx.rotate(a);mctx.beginPath();mctx.moveTo(S*1.3,0);mctx.lineTo(-S*.8,-S*.95);mctx.lineTo(-S*.35,0);mctx.lineTo(-S*.8,S*.95);mctx.closePath();
      mctx.fillStyle=p.color;mctx.strokeStyle="#091018";mctx.lineWidth=2;mctx.fill();mctx.stroke();mctx.rotate(-a);
      const far=Math.max(Math.abs(p.rx-Math.round(mapView.x)),Math.abs(p.ry-Math.round(mapView.y))),txt=`${far}`;
      mctx.font="bold 11px monospace";mctx.textAlign="center";mctx.lineWidth=3;mctx.strokeStyle="#091018";const ty=ey>h/2?-S*1.6:S*2.2;mctx.strokeText(txt,0,ty);mctx.fillStyle=p.color;mctx.fillText(txt,0,ty);mctx.textAlign="left";
    }
    mctx.restore();
  }
}
function drawAtlasWorld(w,h,cell,signals){
  const at=(rx,ry)=>[w/2+(rx-mapView.x)*cell+mapView.panX,h/2+(ry-mapView.y)*cell+mapView.panY],world=atlasWorldImage();
  // With Relays on, the land dims so the relay pattern reads as one shape.
  if(world){const[x,y]=at(world.bounds.minX-.5,world.bounds.minY-.5);mctx.imageSmoothingEnabled=false;mctx.save();mctx.globalAlpha=relayOverlay?.28:1;mctx.drawImage(world.canvas,x,y,world.canvas.width*cell,world.canvas.height*cell);mctx.restore()}
  if(world&&relayOverlay&&world.relays){const R=world.relays,[x,y]=at(R.minX-.5,R.minY-.5);mctx.save();mctx.globalAlpha=1;mctx.drawImage(R.canvas,x,y,R.canvas.width*cell,R.canvas.height*cell);mctx.restore();
    // Answered relays and their links on top, at a fixed size.
    const answered=[];for(const[id,n]of Object.entries(save.relayNetwork?.nodes||{})){const s=crossingSection(id);if(s)answered.push({...s,choice:n.choice})}
    mctx.lineWidth=2;for(const p of answered)for(const q of answered.filter(q=>q!==p&&Math.max(Math.abs(p.rx-q.rx),Math.abs(p.ry-q.ry))<=2).sort((a,b)=>Math.hypot(a.rx-p.rx,a.ry-p.ry)-Math.hypot(b.rx-p.rx,b.ry-p.ry)).slice(0,2)){const[ax,ay]=at(p.rx,p.ry),[bx,by]=at(q.rx,q.ry);mctx.strokeStyle=p.choice==="sever"&&q.choice==="sever"?"#6a5a7a99":"#7fe7ffcc";mctx.beginPath();mctx.moveTo(ax,ay);mctx.lineTo(bx,by);mctx.stroke()}
    for(const n of answered){const[px,py]=at(n.rx,n.ry);mctx.fillStyle=n.choice==="restore"?"#7fe7ff":"#2a2236";mctx.strokeStyle=n.choice==="restore"?"#e8fbff":"#9b86c4";mctx.beginPath();mctx.arc(px,py,3.5,0,7);mctx.fill();mctx.stroke()}
    mctx.fillStyle="#cdb8ff";mctx.font="11px monospace";mctx.fillText(`Relays · ${world.relays?.count||0} waiting · ${answered.length} answered`,10,16)}
  // Fixed-size markers: Wayglasses and towns once there is room, signals, the waypoint, the compass target, the last death, you.
  const dot=(rx,ry,r,fill,stroke)=>{const[x,y]=at(rx,ry);if(x<-20||y<-20||x>w+20||y>h+20)return;mctx.beginPath();mctx.arc(x,y,r,0,7);if(fill){mctx.fillStyle=fill;mctx.fill();mctx.strokeStyle="#091018";mctx.lineWidth=1.5;mctx.stroke()}if(stroke){mctx.strokeStyle=stroke;mctx.lineWidth=2;mctx.stroke()}};
  if(world&&cell>=3)for(const g of world.places)for(const p of g.places){if(p.kind==="checkpoint"){if(atlasLayers.wayglasses)dot(p.rx,p.ry,4,"#5fe7ee")}else if((p.kind==="hamlet"||p.kind==="refuge")&&atlasLayers.sites)dot(p.rx,p.ry,4,"#f0c070");else if(p.kind==="architecturalDistrict"&&atlasLayers.sites)dot(p.rx,p.ry,4,"#c9a58b")}
  if(world&&atlasLayers.sites)for(const[rx,ry]of world.crossings){const[x,y]=at(rx,ry);if(x<-8||y<-8||x>w+8||y>h+8)continue;const r=Math.max(4.5,Math.min(7,cell*.45));mctx.fillStyle="#e0a050";mctx.strokeStyle="#091018";mctx.lineWidth=1.5;mctx.beginPath();mctx.moveTo(x,y-r);mctx.lineTo(x+r,y+r*.8);mctx.lineTo(x-r,y+r*.8);mctx.closePath();mctx.fill();mctx.stroke()} // crossings, glass kilns and arenas
  drawLinkedDungeons(w,h,cell);
  if(atlasLayers.signals)for(const s of signals)dot(s.targetRx,s.targetRy,2.5,"#b8a0e0");
  if(atlasLayers.waypoints&&save.lastDeath){const[x,y]=at(save.lastDeath.rx,save.lastDeath.ry);drawDeathGlyph(mctx,x,y,5,save.lastDeath.valid===false)}
  if(mapView.selected)dot(mapView.selected.rx,mapView.selected.ry,5,null,"#ffffff");
  dot(game.rx,game.ry,4,"#fff4a8","#091018");dot(game.rx,game.ry,8,null,"rgba(255,244,168,.55)");
  // Region names over their explored land.
  if(world&&atlasLayers.regions){mctx.textAlign="center";mctx.font=`bold ${Math.max(11,Math.min(18,cell*4))}px system-ui, sans-serif`;mctx.lineWidth=4;
    const placed=[];for(const l of [...world.labels].sort((a,b)=>b.n-a.n)){const[x,y]=at(l.rx,l.ry),tw=mctx.measureText(l.name).width,box={l:x-tw/2-4,r:x+tw/2+4,t:y-14,b:y+4};if(x<0||x>w||y<0||y>h)continue;
      const clash=(q)=>q.l<box.r&&q.r>box.l&&q.t<box.b&&q.b>box.t;for(let k=0;k<6&&placed.some(clash);k++){box.t+=16;box.b+=16}if(placed.some(clash))continue;placed.push(box); // larger regions first; others step down or are left out
      const ly=box.b-4;mctx.strokeStyle="rgba(9,16,24,.85)";mctx.strokeText(l.name,x,ly);mctx.fillStyle=l.land?"#cfe3f0":"#f0d58a";mctx.fillText(l.name,x,ly)}mctx.textAlign="left"}
  drawAtlasPins(w,h,cell);
  mctx.font="11px monospace";mctx.fillStyle="#dce7e2";
  mctx.fillText(`World view · ${Object.keys(save.explored).length} sections explored · pinch or + to look closer`,10,h-10);
}
function drawDeathGlyph(context,x,y,size,faded=false){context.save();context.translate(x,y);context.globalAlpha=faded?.45:1;context.strokeStyle="#ff718f";context.lineWidth=Math.max(1.5,size*.2);context.beginPath();context.arc(0,0,size*.65,0,7);context.moveTo(-size*.42,-size*.42);context.lineTo(size*.42,size*.42);context.moveTo(size*.42,-size*.42);context.lineTo(-size*.42,size*.42);context.stroke();context.restore()}
function drawDungeonDeathMarker(){const death=save.lastDeath;if(!death||death.areaKind!=="dungeon"||death.dungeonId!==game.areaId())return;const selected=$("#dungeonLevelSelect")?.value||game.map.levelId||"root";if(death.levelId&&death.levelId!==selected)return;const map=game.map,d=Math.min(devicePixelRatio,2),w=Math.min(innerWidth*.9,680),h=atlasMapHeight(),cols=map.width||24,rows=map.height||Math.floor(map.tiles.length/cols),pad=18,cell=Math.max(2,Math.min((w-pad*2)/cols,(h-pad*2)/rows)),ox=(w-cell*cols)/2,oy=(h-cell*rows)/2;mctx.setTransform(d,0,0,d,0,0);drawDeathGlyph(mctx,ox+(death.x+.5)*cell,oy+(death.y+.5)*cell,Math.max(5,cell*.36),death.valid===false)}
const ATLAS_FRAMES={compassTarget:"#ffd34d",openChallenge:"#b48cff"};
const ATLAS_SYMBOLS=[
  {kind:"checkpoint",label:"Wayglass",description:"Activate it to add a fast-travel destination and make it your recovery point."},
  {kind:"shrine",label:"Singing Array",description:"A common rest point. Reaching it updates where death returns you, but it does not permit fast travel."},
  {kind:"dungeon",label:"Crossing / Glass Kiln",description:"An entrance to a bounded dungeon. A Glass Kiln is a sentinel den built around heat, traps, and stronger rewards."},
  {kind:"linkedDungeon",label:"Linked crossing",description:"Two mouths of one dungeon, joined in green. Past its second level, the guardian's door leads out of the other mouth."},
  {kind:"town",label:"Town",description:"Ember Refuge and the hamlets: people, trade and rest. Marked under Places."},
  {kind:"architecturalDistrict",label:"District / Ruin",description:"A larger enterable group of buildings, streets, residents, enemies, and architectural lore."},
  {kind:"bossCue",label:"Major Danger",description:"A boss-scale or exceptional threat is associated with this section."},
  {kind:"skyStair",label:"Sky Stair",description:"A way into the Skylands, and you never know what waits: a divine challenge of echoes of the beasts you have felled, a cloud hold of winged things whose gate drops you far off, both at once, or a sky gate that simply throws you across the map. As hard as the Ascension you choose; Ascension Sigils open the higher tiers. Marked under Places."}, // release 571; 589: four modes
  {kind:"watcherTomb",label:"Watcher's shrine",description:"A pristine tomb with the Watcher's sigil. Touched, it folds the Corridor and carries you somewhere else, once. Marked under Places."}, // release 465
  {kind:"ruinMarker",label:"Unusual Site",description:"An inspectable ruin or signal site that may reveal lore, objectives, or a distant lead."},
  {kind:"lastDeath",label:"Last death",description:"The latest place the Wayfarer fell. Dungeon deaths mark their entrance section here and their exact discovered floor locally; the mark is never a waypoint or travel target."},
];
function atlasSignal(kind){return kind==="town"?"town":kind==="checkpoint"?"beacon":kind==="shrine"?"array":kind==="dungeon"?"crossing":kind==="bossCue"?"danger":kind==="shack"?"shack":kind==="architecturalDistrict"?"district":kind==="supplyCache"?"cache":kind==="watcherTomb"?"watcher":kind==="skyStair"?"sky":"event"}
function drawAtlasGlyph(context,kind,x,y,size){
  const signal=atlasSignal(kind),colors={beacon:"#72d7df",array:"#8ed1c1",crossing:"#d5a464",danger:"#d16b62",event:"#a68ad2",shack:"#d8bd83",district:"#c9a58b",cache:"#d7b96f",town:"#f0c070",watcher:"#c9b8ff",sky:"#fff1c8"};context.save();context.translate(x,y);context.lineWidth=Math.max(1.4,size*.22);context.strokeStyle=colors[signal];context.fillStyle=context.strokeStyle;context.beginPath();
  if(signal==="beacon")context.arc(0,0,size*.7,0,Math.PI*1.65);else if(signal==="array"){context.arc(0,0,size*.62,0,Math.PI*2);context.moveTo(-size*.7,0);context.lineTo(size*.7,0);context.moveTo(0,-size*.7);context.lineTo(0,size*.7)}else if(signal==="cache"){context.rect(-size*.65,-size*.45,size*1.3,size*.9);context.moveTo(-size*.65,-size*.12);context.lineTo(size*.65,-size*.12)}else if(signal==="crossing"){context.moveTo(-size*.7,-size*.55);context.lineTo(size*.55,0);context.lineTo(-size*.7,size*.55)}else if(signal==="danger"){context.moveTo(-size*.65,size*.6);context.lineTo(0,-size*.75);context.lineTo(size*.65,size*.6);context.closePath()}else if(signal==="shack"||signal==="town"){context.moveTo(-size*.75,0);context.lineTo(0,-size*.7);context.lineTo(size*.75,0);context.lineTo(size*.55,0);context.lineTo(size*.55,size*.7);context.lineTo(-size*.55,size*.7);context.lineTo(-size*.55,0);context.closePath()}else if(signal==="watcher"){context.moveTo(-size*.85,0);context.quadraticCurveTo(0,-size*.8,size*.85,0);context.quadraticCurveTo(0,size*.8,-size*.85,0);context.moveTo(size*.3,0);context.arc(0,0,size*.3,0,Math.PI*2)}else if(signal==="district"){context.rect(-size*.65,-size*.65,size*1.3,size*1.3);context.moveTo(-size*.65,0);context.lineTo(size*.65,0);context.moveTo(0,-size*.65);context.lineTo(0,size*.65)}else{context.arc(0,0,size*.65,0,Math.PI*1.5);context.lineTo(size*.75,0)}context.stroke();if(signal==="danger"){context.beginPath();context.moveTo(0,-size*.75);context.lineTo(-size*.18,-size*.42);context.lineTo(size*.18,-size*.42);context.closePath();context.fill()}else if(["beacon","crossing","event"].includes(signal)){context.beginPath();context.moveTo(size*.72,0);context.lineTo(size*1.05,-size*.3);context.lineTo(size*1.05,size*.3);context.closePath();context.fill()}context.restore();
}
function drawAtlasSite(kind,x,y,size){drawAtlasGlyph(mctx,kind,x,y,size)}
function atlasMark(kind){const canvas=document.createElement("canvas");canvas.width=canvas.height=44;canvas.className="atlas-symbol";canvas.setAttribute("role","img");canvas.setAttribute("aria-label",ATLAS_SYMBOLS.find(q=>q.kind===kind)?.label||kind);const context=canvas.getContext("2d");if(context)drawAtlasGlyph(context,kind,22,22,13);return canvas}
function deathMark(){const canvas=document.createElement("canvas");canvas.width=canvas.height=44;canvas.className="atlas-symbol";canvas.setAttribute("role","img");canvas.setAttribute("aria-label","Last death");drawDeathGlyph(canvas.getContext("2d"),22,22,13);return canvas}function frameMark(color,dashed){const canvas=document.createElement("canvas");canvas.width=canvas.height=44;canvas.className="atlas-symbol";const c=canvas.getContext("2d");if(c){c.strokeStyle=color;c.lineWidth=dashed?3:5;if(dashed)c.setLineDash([7,4]);c.strokeRect(8,8,28,28)}return canvas}
function linkMark(){const canvas=document.createElement("canvas");canvas.width=canvas.height=44;canvas.className="atlas-symbol";canvas.setAttribute("role","img");canvas.setAttribute("aria-label","Linked crossing");const c=canvas.getContext("2d");if(c){c.strokeStyle=LINKED_COLOR;c.lineWidth=2.5;c.setLineDash([4,3]);c.beginPath();c.moveTo(11,33);c.lineTo(33,11);c.stroke();c.setLineDash([]);for(const[x,y]of[[11,33],[33,11]]){c.beginPath();c.arc(x,y,7,0,7);c.stroke()}}return canvas}
function renderAtlasLegend(){const legend=$("#mapLegend");legend.replaceChildren();for(const symbol of ATLAS_SYMBOLS){const item=document.createElement("span");item.className="atlas-legend-item";item.append(symbol.kind==="lastDeath"?deathMark():symbol.kind==="linkedDungeon"?linkMark():atlasMark(symbol.kind),document.createTextNode(symbol.label));legend.append(item)}
  for(const[color,dashed,label]of[[ATLAS_FRAMES.compassTarget,false,"Compass target (tap the compass for the next)"],[ATLAS_FRAMES.openChallenge,true,"Unfinished challenge"]]){const item=document.createElement("span");item.className="atlas-legend-item";item.append(frameMark(color,dashed),document.createTextNode(label));legend.append(item)}}
function refreshWayglassDestinations(){
  const select=$("#mapWayglassSelect"),prior=select.value,entries=Object.entries(save.checkpoints||{}).sort((a,b)=>(a[1].rx-b[1].rx)||(a[1].ry-b[1].ry)||(a[1].name||a[0]).localeCompare(b[1].name||b[0])); // release 443 (Tim: "arranged numerically, so I can just scroll down"): by section, east-west then north-south
  select.replaceChildren(...entries.map(([key,c])=>{const option=document.createElement("option");option.value=key;option.textContent=`${c.rx}, ${c.ry} · ${c.name||"Wayglass"}`;return option}));
  const selected=mapView.selected&&`${mapView.selected.rx},${mapView.selected.ry}`,active=save.activeCheckpoint&&`${save.activeCheckpoint.rx},${save.activeCheckpoint.ry}`;
  select.value=save.checkpoints?.[selected]?selected:save.checkpoints?.[prior]?prior:active||entries[0]?.[0]||"";
}
// Release 443: the Wayglass of a tapped section, or of the nearest section within ATLAS_WAYGLASS_REACH (a zoomed-out tap rarely lands on the exact one).
const ATLAS_WAYGLASS_REACH = 1;
function atlasWayglassNear(rx, ry){const exact=`${rx},${ry}`;if(save.checkpoints?.[exact])return exact;let best=null;for(const[k,c]of Object.entries(save.checkpoints||{})){const d=Math.max(Math.abs(c.rx-rx),Math.abs(c.ry-ry));if(d<=ATLAS_WAYGLASS_REACH&&(!best||d<best.d))best={k,d}}return best?.k||null}
function selectedWayglassKey(){const explicit=$("#mapWayglassSelect")?.value;if(save.checkpoints?.[explicit])return explicit;const q=mapView.selected,key=q&&`${q.rx},${q.ry}`;return save.checkpoints?.[key]?key:null}
function updateMapTravelButton() {
  const travel = $("#mapTravel"), selected = mapView.selected,
    checkpoint = save.checkpoints?.[selectedWayglassKey()] || (selected && save.checkpoints?.[`${selected.rx},${selected.ry}`]);
  travel.textContent = game.area === "dungeon"
    ? `Use Crossing Sigil ×${save.consumables.crossingSigil || 0} → ${checkpoint ? checkpoint.name || "Wayglass" : "dungeon entrance"}` // release 449
    : checkpoint
      ? `Travel to ${checkpoint.name || "Wayglass"}`
      : "Return to active checkpoint";
  travel.disabled = game.area === "dungeon" && !(save.consumables.crossingSigil > 0);
  $("#mapHome").disabled = game.area === "dungeon";
  $("#mapHome").textContent = `Return to ${homeName(save)}`; // release 371
  // Release 541 (Tim: "I'm not seeing the option to set a listener town as my home... in the atlas"): the section you tapped,
  // the Wayglass picked in the list, or where you stand, whichever is a town that can be home; the Wayglass list used to win
  // even when you had tapped the town. A town whose Wayglass is unlit says so on the button.
  const homeTarget = () => [mapView.selected && `${mapView.selected.rx},${mapView.selected.ry}`, selectedWayglassKey(), `${game.rx},${game.ry}`].find((k) => k && homeCandidate(save, k) && k !== homeKey(save)) || null;
  { let b = $("#mapSetHome"); if (!b) { b = document.createElement("button"); b.id = "mapSetHome"; b.type = "button"; $("#mapHome").after(b); b.onclick = () => { const k = homeTarget(), r = setHome(save, k); game.message = r.message; const d = $("#mapDetail"); if (d) d.textContent = r.message; persist(); updateMapTravelButton(); drawMap(); }; }
    const k = homeTarget(), can = !!k;
    b.hidden = !can; if (can) { const [x, y] = k.split(",").map(Number), t = townAt(save, x, y); b.disabled = !save.checkpoints?.[k]; b.textContent = `Make ${t ? t.name : "Ember Refuge"} my home${b.disabled ? " (light its Wayglass first)" : ""}`; b.title = b.disabled ? "Light its Wayglass first." : ""; } }
  { let n = $("#mapTowns"); if (!n) { n = document.createElement("p"); n.id = "mapTowns"; n.className = "arc-hint"; $("#mapSetHome").after(n); } // release 541: where your Listener towns are
    const towns = save.hometowns?.towns || []; n.hidden = !towns.length; n.textContent = towns.length ? `Listener towns: ${towns.map((t) => `${t.name} (${t.rx}, ${t.ry})${homeKey(save) === `${t.rx},${t.ry}` ? " · home" : save.checkpoints?.[`${t.rx},${t.ry}`] ? "" : " · Wayglass unlit"}`).join("; ")}. Tap one on the map to make it home.` : ""; }
}
function updateMapModeUI(){
  const dungeon=game.area==="dungeon",local=dungeon&&mapMode==="dungeon";
  $("#mapModeToggle").hidden=!dungeon;$("#mapModeToggle").textContent=local?"Corridor Atlas":"Dungeon Map";$("#mapTitle").textContent=local?`${game.map.name||"Dungeon"} Map`:"Corridor Atlas";atlas.querySelector(".maptools").hidden=local;$("#mapHome").hidden=local;$("#mapWaypoint").hidden=local;mapMarkButton().hidden=local;$("#mapLegend").hidden=local;const picker=$("#dungeonLevelPicker"),select=$("#dungeonLevelSelect"),progress=game.map.deepProgress;picker.hidden=!local||!game.map.multiLevel;if(!picker.hidden){const discovered=new Set(progress?.discoveredLevelIds||[game.map.levelId]);select.replaceChildren(...(game.map.levels||[]).filter(q=>discovered.has(q.id)).map(q=>{const option=document.createElement("option");option.value=q.id;option.textContent=`${q.index+1}. ${q.name}${q.id===game.map.levelId?" · current":""}`;return option}));if(![...select.options].some(q=>q.value===select.value))select.value=game.map.levelId;}$("#mapInstructions").textContent=local?"A bounded floor plan. Gold marks your current position. Use Discovered level to inspect known floors; hidden routes and levels remain absent until found.":"Tap an explored section to set the persistent cyan manual arrow. Violet guidance continues independently for quests and hunts.";
  if(local){const cols=game.map.width||24,rows=game.map.height||Math.floor(game.map.tiles.length/cols),progress=game.map.deepProgress,required=progress?.requiredObjectiveIds?.length||game.map.objectives?.filter(q=>q.required).length||game.map.wings?.length||0,done=game.map.recipe==="deep-v1"?(progress?.defeatedWingIds?.length||0):(progress?.completedObjectiveIds?.length||0),deep=(game.map.deepDungeon||game.map.recipe==="deep-v1")?` · ${game.map.archetype||"threefold"}${game.map.multiLevel?` · level ${game.map.levelName}`:""} · objectives ${done}/${required}${progress?.gateOpened?" · final gate open":""}${progress?.activeAnchor?` · recovery ${progress.activeAnchor.name}`:""}`:"";$("#mapDetail").textContent=`${game.map.identity||"Dungeon"} · bounded ${cols} × ${rows} floor${deep} · position ${Math.floor(game.player.x)}, ${Math.floor(game.player.y)}`;}
  updateMapWaypointButton();
  updateMapTravelButton();
}
// Release 355: the map-mark button sits under the waypoint button (created here, so both pages share it).
function mapMarkButton(){let b=$("#mapMark");if(!b){b=document.createElement("button");b.id="mapMark";b.type="button";$("#mapWaypoint").after(b);b.onclick=()=>{const q=mapView.selected;if(!q||!mapView.chosen)return;const r=toggleMapMark(save,q.rx,q.ry);optionMessageOnMap(r.message);updateMapWaypointButton();drawMap();persist()}}return b}
function optionMessageOnMap(text){const d=$("#mapDetail");if(d)d.textContent=text}
function updateMapMarkButton(){const b=mapMarkButton(),q=mapView.selected,here=q&&mapMarkAt(save,q.rx,q.ry),full=(save.mapMarks||[]).length>=MAP_MARKS.max;b.disabled=!q||!mapView.chosen||(!here&&full);b.textContent=here?`Clear ${MAP_MARKS.names[here.color]} mark`:full?`Marks ${MAP_MARKS.max}/${MAP_MARKS.max} set`:`Mark selected section (${(save.mapMarks||[]).length}/${MAP_MARKS.max})`;b.style.borderColor=here?MAP_MARKS.colors[here.color]:""}
function updateMapWaypointButton(){const button=$("#mapWaypoint"),selected=mapView.selected,same=selected&&save.manualWaypoint?.rx===selected.rx&&save.manualWaypoint?.ry===selected.ry;button.disabled=!selected||!mapView.chosen||!save.explored[`${selected.rx},${selected.ry}`];/* release 279: never on the section the Atlas opened on until the Wayfarer picks one */button.textContent=same?"Clear manual waypoint":"Set manual waypoint";updateMapMarkButton()}
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
  const death=save.lastDeath?.rx===rx&&save.lastDeath?.ry===ry?` · Last death${save.lastDeath.areaKind==="dungeon"?` inside ${save.lastDeath.label.replace(/^Inside /,"")}`:""}${save.lastDeath.valid===false?" (inaccessible)":""}`:"";
  const readingId=readingAt(rx,ry),reading=readingKnown(save,readingId)?` · ${READINGS[readingId].name}${bookProgress(save,readingId).mastered?" (mastered)":""}`:""; // release 191: only Readings already heard
  $("#mapDetail").textContent =
    `Section ${rx}, ${ry}${reading} · ${s.terrain} terrain${sites}${s.checkpoint ? " · checkpoint" : ""}${s.current ? " · current" : ""}${s.waypoint ? " · waypoint" : ""}${death}`;
  updateMapWaypointButton();
  updateMapTravelButton();
  return true;
}
// Release 449: the Atlas opened from the Crossing Sigil: the corridor view, the Wayglass list ready, the sigil on the button.
function openSigilAtlas(){openMap();mapMode="atlas";updateMapModeUI();drawMap();$("#mapDetail").textContent="Choose a Wayglass (tap its section or pick it from the list), then press Use Crossing Sigil.";}
function openMap() {
  atlasOpenedAt = performance.now();
  pauseForOverlay();
  if (pausePanel.open) pausePanel.close();
  mapView.x = game.rx;
  mapView.y = game.ry;
  mapMode = game.area === "dungeon" ? "dungeon" : "atlas";
  if (!atlas.open) atlas.showModal();
  refreshWayglassDestinations();
  refreshAtlasPlaces();
  renderAtlasLegend();
  renderAtlasLayerButtons();
  updateMapModeUI();
  mapView.chosen=false;if(mapMode==="atlas")showMapDetail(game.rx, game.ry);
  drawMap();
  atlasBackfill(); // release 559
}
// Release 151: each part of the Pack is built separately, so a fault in one (seen on a player's save, cause still
// unknown) shows a note naming the part and its error instead of stopping the whole Pack from opening.
function packSectionFailed(name,error){noteError(error);console.error(`Pack section ${name} failed`,error);const note=document.createElement("p");note.className="options-note options-danger";note.textContent=`${name} could not be shown (${error?.message||error}). Options → System → Copy diagnostics, then paste it to Claude.`;body.append(note)}
// Release 259 (Tim, 2026-10-21: "I get to the pack, I should just hit... Arcanum and it should just take me there... there
// should be just buttons to get through things... spells and echoes... under one tab, and then the armor and weapon
// upgrading system should be another tab"): the Pack is tabbed, and one tab bar runs across the Pack, the Forge and the
// Arcanum, so everything is a tap apart. The Arcanum keeps its own sub-tabs (Spells & Constellation, Glyphs, Echoes).
const PACK_TABS=[['wayfarer','Wayfarer'],['gear','Gear'],['forge','Forge'],['arcanum','Arcanum'],['supplies','Supplies']];
let packTab='wayfarer';
var gearPick=null; // release 469: the pieces chosen to salvage (null: not choosing)
function packTabBar(current){const bar=document.createElement('nav');bar.className='codex-tabs pack-tabs';bar.setAttribute('aria-label','Pack');
 for(const[id,label]of PACK_TABS){const b=uiButton(label,()=>id==='arcanum'?openSkills():id==='forge'?openForge():openPack(id));if(id===current)b.setAttribute('aria-current','page');bar.append(b)}
 return bar}
function openPack(tab) {
  if (typeof tab === "string" && PACK_TABS.some(([id]) => id === tab && id !== "arcanum" && id !== "forge")) packTab = tab; // a click event is not a tab
  if (packTab === "arcanum" || packTab === "forge") packTab = "wayfarer";
  pauseForOverlay();
  if (pausePanel.open) pausePanel.close();
  body.replaceChildren(packTabBar(packTab));
  if (packTab !== "wayfarer") body.append(Object.assign(document.createElement("h2"), { textContent: packTab === "gear" ? "Gear" : "Supplies" }));
  if (packTab === "wayfarer") try{
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
  { const box = document.createElement("div"), h3 = document.createElement("h3"); box.className = "character-summary journey-stats"; h3.textContent = "Your journey"; for (const [label, value] of journeyStats(save)) box.append(Object.assign(document.createElement("span"), { textContent: `${label}: ${value}` })); body.append(h3, box); } // release 387
  }catch(error){packSectionFailed("Character",error)}
  if (packTab === "supplies") try{
  for(const [kind,label] of [['weapon','Weapon sphere'],['armor','Armor sphere']]){const row=document.createElement('div'),key=kind+'Sphere';row.className='item sphere-row';row.textContent=`${label} ×${save.materials[key]||0} · strengthens fitted equipment at the Forge.`;body.append(row)}
  }catch(error){packSectionFailed("Spheres",error)}
  if (packTab === "wayfarer") try{
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
  }catch(error){packSectionFailed("Stats",error)}
  if (packTab === "supplies") try{
  // Release 283/287 (Tim: "much smaller... symbols... just next to each other... a dot between each one"): one quiet line
  // of counts, the shovel's digs beneath it, then the build section: "Build with", its choices underneath (the chosen one
  // gold, as everywhere in the menus), Continuous build, and every recipe.
  const m = save.materials || {}, line = document.createElement("p"); line.className = "resource-line";
  line.innerHTML = [["wood", "🪵", "Wood", m.wood], ["stone", "🪨", "Stone", m.stone], ["iron", "⛓", "Cinder Iron", m.cinderIron]].map(([k, icon, label, n]) => `<span class="res ${k}" title="${label}"><i aria-hidden="true">${icon}</i>${Number(n) || 0} <small>${label}</small></span>`).join('<span class="sep" aria-hidden="true">·</span>');
  const note = document.createElement("p"); note.className = "resource-note"; note.textContent = `⛏ Shovel: ${save.digging?.shovel ? `${save.digging.shovel} dig${save.digging.shovel === 1 ? "" : "s"} left` : "none yet (made as you dig)"} · Iron shovel: ${save.digging?.iron ? `${save.digging.iron} dig${save.digging.iron === 1 ? "" : "s"} left` : "made from 1 cinder iron and 1 wood when rock resists"} · Weapon +${save.weaponLevel || 0}`;
  { const first = body.querySelector(".sphere-row"); if (first) first.before(line, note); else body.append(line, note); } // the counts lead the tab
  const buildRow = document.createElement("div"); buildRow.className = "item build-pick";
  const chosen = ensureBuild(save).build.kind, now = activeBuildKind(save);
  const bt = document.createElement("strong"); bt.textContent = `Build with: ${BUILD.kinds[chosen].name}`;
  const pick = document.createElement("div"); pick.className = "build-choice";
  pick.append(...BUILD_KINDS.map((k) => { const b = uiButton(`${BUILD.kinds[k].name} · ${Object.entries(BUILD.kinds[k].cost).map(([mat, n]) => `${n} ${mat}`).join(", ")}`, () => { setBuildKind(save, k); persist(); openPack("supplies"); }); if (k === chosen) b.setAttribute("aria-current", "true"); return b; }));
  const cont = document.createElement("label"); cont.className = "continuous-build";
  const box = Object.assign(document.createElement("input"), { type: "checkbox", checked: !!save.build.continuous }); box.onchange = () => { setContinuousBuild(save, box.checked); persist(); openPack("supplies"); };
  cont.append(box, document.createTextNode(" Continuous build: when it runs out, build with the next material"));
  const status = document.createElement("small"); status.className = "build-status"; status.textContent = now ? `Build raises: ${BUILD.kinds[now].name}.` : "Nothing to build with: not enough wood or stone for any build.";
  const rt = document.createElement("strong"); rt.className = "recipe-title"; rt.textContent = "Recipes";
  const recipes = document.createElement("ul"); recipes.className = "recipe-list";
  for (const line of [`Wood wall: ${BUILD.kinds.wood.cost.wood} wood. Blocks the way and one blow.`, `Stone block: ${BUILD.kinds.stone.cost.stone} stone. Takes two blows; jump onto it, and stack two (two high stops fliers).`, `Builds crumble after ${BUILD.life} s; ${BUILD.maxOut} stand at most (a sixth replaces the oldest).`, `Shovel: ${DIG.recipe.wood} wood and ${DIG.recipe.stone} stone (Act facing a dungeon wall).`, "Skiff: 3 wood (Act at deep water)."]) { const li = document.createElement("li"); li.textContent = line; recipes.append(li); }
  buildRow.append(bt, pick, cont, status, rt, recipes);
  body.append(buildRow);
  }catch(error){packSectionFailed("Resources",error)}
  if (packTab === "gear") try{
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
    const label=document.createElement("small"),name=document.createElement("strong"),detail=document.createElement("span");label.textContent=slot.toUpperCase();name.textContent=item?`${item.name} +${item.upgradeRank||0}`:"Empty slot";detail.textContent=effect;card.append(gearIcon(item,slot),label,name,detail);
    gear.append(card);
  }
  body.append(gearHeading, gear);
  { // Release 541: the other preset's own pieces, kept out of the pack (no selling or salvage) until you switch to it.
    const other=1-(save.magicSkills?.preset||0),held=save.presetGear?.[other]||{},names=[["primary","Weapon"],["secondary","Tool"]].map(/* release 553: armor stays with you */([k,l])=>`${l}: ${held[k]?`${held[k].name} +${held[k].upgradeRank||0}`:"shares this preset's"}`);
    const note=document.createElement("p");note.className="arc-hint";note.textContent=`Preset ${other+1} keeps — ${names.join(" · ")}. Switch presets to use or change them; they cannot be sold or salvaged while kept.`;body.append(note);
  }
  }catch(error){packSectionFailed("Equipped gear",error)}
  if (packTab === "wayfarer") try{
  // Spells, disciplines and capstones live in one place: the Arcanum tab (release 109; tabbed in release 259).
  const arcane=document.createElement('div');arcane.className='item';
  const sa=slotted(save,'a'),sb=slotted(save,'b'),pr=activePairing(save);
  arcane.textContent=`Slot A: ${sa?`${sa.symbol} ${sa.name}`:'empty'} · Slot B: ${sb?`${sb.symbol} ${sb.name}`:'empty'}${pr?` · Pairing: ${pr.name}`:''} · ${pointsFree(save)} constellation point${pointsFree(save)===1?'':'s'} free · Echoes ${notchesUsed(save.echoes?.equipped||[])}/${NOTCHES} notches`;
  body.append(arcane);
  }catch(error){packSectionFailed("Arcanum",error)}
  if (packTab === "supplies") try{
  for (const [type, name, description] of [
    [
      "restorativeDraught",
      "Restorative Draught",
      "Heals 30 health; never consumed at full health.",
    ],
    ["highPotion", "High Potion", `Heals ${POTIONS.highPotion.heal} health. Brew one from ${POTIONS.highPotion.cost} Restorative Draughts.`], // release 339
    ["maxPotion", "Max Potion", `Heals you to full. Brew one from ${POTIONS.maxPotion.cost} Restorative Draughts.`],
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
    ["hullShield","Hull Shield","Deploy aboard your skiff: the hull takes no damage for 3 minutes. The Shipwright sells them."],
    ["submersible","Submersible Frame",`${subGate(save).ok ? "" : subGate(save).why + " "}Fit it aboard your skiff and it becomes a silver submersible robot: ${BOAT.sub.hull} more hull, 5% less damage to you, Dodge dives under, and (from Infinite III, with the Void Walker and a Listener beaten) dive buoys take you down with no rig or lens. Used on land (from Infinite III, with the second Gate open) it becomes a robot you wear: plating, a guard, and Hold Jump to boost. It stays up until you stow it. Press the button again for Empowered mode: it burns 1 cinder iron every 20s for 25% more damage, a stronger guard and twice the boost; a third press stows it. Plating that gives out is re-forged from ${MECH_POWER.replate} cinder iron while you carry that much. From the fourth Gate it can be a drone instead, flying beside you with homing rockets, mending you on command or when you are low, and carrying you while you hold Jump. Another frame mends its plating. Forge one from ${BOAT.sub.cinderIron} cinder iron (you have ${save.materials?.cinderIron || 0}).`],
  ]) {
    const row = document.createElement("div"),
      title = document.createElement("strong"),
      text = document.createElement("p");
    row.className = "item consumable";
    title.textContent = `${name} ×${save.consumables[type] || 0}`; if (ITEM_ICONS[type]) title.insertAdjacentHTML("afterbegin", `<span class="item-icon">${ITEM_ICONS[type]}</span>`); // release 293
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
    if (type === "submersible") { const forge = uiButton("Forge", () => { const r = forgeSubmersible(save); game.message = r.message; persist(); openPack("supplies"); }); if (!subGate(save).ok) { forge.disabled = true; forge.title = subGate(save).why; } row.append(forge);
      if (droneGate(save).ok) { const drone = save.mech?.mode === "drone", pick = uiButton(drone ? "Ashore: Drone" : "Ashore: Robot", () => { const r = setMechMode(save, drone ? "robot" : "drone"); game.message = r.message; persist(); openPack("supplies"); }); pick.title = "Choose what the frame calls up on land"; row.append(pick); } } // release 311; 315: unlocked by subGate; 321: robot or drone
    if (POTIONS[type]) { // release 339: brew the higher tiers; choose what the Potion button drinks
      if (POTIONS[type].cost) { const brew = uiButton("Brew", () => { const r = craftPotion(save, type); game.message = r.message; persist(); openPack("supplies"); }); if ((save.consumables.restorativeDraught || 0) < POTIONS[type].cost) { brew.disabled = true; brew.title = `Needs ${POTIONS[type].cost} Restorative Draughts`; } row.append(brew); }
    }
    if (type === "restorativeDraught") { // release 341: one toggle for the Potion button's tier; higher tiers brew themselves from draughts as needed
      const pick = document.createElement("div"); pick.className = "potion-tiers"; pick.append(el("small", "", "Potion button drinks:"));
      ["restorativeDraught", "highPotion", "maxPotion"].forEach((id, i) => { const b = uiButton(`${i + 1} · ${POTIONS[id].short}`, () => { const r = setPotionChoice(save, id); game.message = r.message; persist(); openPack("supplies"); }); if (potionChoice(save) === id) b.setAttribute("aria-current", "true"); pick.append(b); });
      pick.append(el("small", "", potionChoice(save) === "restorativeDraught" ? "" : `Brewed from draughts as you drink: ${potionsReady(save)} ready.`)); row.append(pick);
    }
    // Release 291: put the item on a preset's Build button (a preset set to Build cannot take one).
    if (BUTTON_ITEMS.includes(type)) for (let i = 0; i < PRESETS; i++) { const pb = presetButton(save, i), b = uiButton(`Preset ${i + 1}`, () => { const r = assignPresetItem(save, i, type); game.message = r.message; persist(); openPack("supplies"); }); b.classList.add("preset-pick"); const pr = save.magicSkills.presets[i]; if (pb.button !== "item" && pr?.a !== "item" && pr?.b !== "item") { /* release 309: any slot set to Item */ b.disabled = true; b.title = `Preset ${i + 1}'s button is Build (change it in Arcanum → presets).`; } else if (pb.item === type) b.setAttribute("aria-current", "true"); row.append(b); }
    body.append(row);
  }
  { // Release 291 (Tim: "I don't see crossing sigils in the supplies menu anymore"): they are listed again.
    const row = document.createElement("div"), title = document.createElement("strong"), text = document.createElement("p");
    row.className = "item consumable"; title.textContent = `Crossing Sigil ×${save.consumables.crossingSigil || 0}`; text.textContent = "Carries you out of a dungeon and across the corridor. Use it inside a dungeon: choose a Wayglass in the Atlas, then press Use Crossing Sigil (with none chosen, it takes you to the dungeon entrance).";
    // Release 449 (Tim: "Crossing sigil is still not something I can use"): Use opens the Atlas, ready to choose where it takes you.
    const use = uiButton(game.area === "dungeon" ? "Use" : "Use (inside a dungeon)", () => { if (game.area !== "dungeon") return; panel.close(); openSigilAtlas(); });
    use.disabled = game.area !== "dungeon" || !(save.consumables.crossingSigil > 0);
    row.append(title, text, use); body.append(row);
    { const found = ensureMarginalia(save).found, sb = document.createElement("div"), st = document.createElement("strong"), sp = document.createElement("p"); sb.className = "item consumable"; st.textContent = `Scrapbook · ${found.length} of ${Object.keys(MARGINALIA).length} marginalia`; sp.textContent = found.length ? found.map((id) => `${MARGINALIA[id].name}: ${MARGINALIA[id].text}`).join(" · ") : `From Infinite IV, Margin Wardens in the crossings offer marginalia: rules that hold for one crossing. Each one you take is kept here, to paste in as you enter.`; sb.append(st, sp); body.append(sb); } // release 459
  }
  }catch(error){packSectionFailed("Consumables",error)}
  if (packTab === "gear") try{
  const inventoryHeading = document.createElement("h3");
  inventoryHeading.textContent = `Carried equipment (${save.inventory.length}/${EQUIPMENT_CAPACITY})`;
  { // Release 543 (sling.ts): up to ten pieces kept out of the pack, safe from selling and salvage.
    const sling = ensureSling(save), box = document.createElement("div"), h = document.createElement("h3"); h.textContent = `Sling (${sling.length}/${SLING.size})`; box.append(h);
    if (!sling.length) { const p = document.createElement("p"); p.className = "arc-hint"; p.textContent = "Keep up to ten pieces here, out of the pack: they take no pack space and can't be sold or salvaged. Use “To sling” on a piece below."; box.append(p); }
    sling.forEach((item, i) => { const row = document.createElement("div"); row.className = "item inventory-card"; const t = document.createElement("strong"); t.textContent = `${itemTier(item).toUpperCase()} · ${item.name} +${item.upgradeRank || 0} · ${item.slot}${item.masterwork ? " · masterwork" : ""}`;
      row.append(t, uiButton("Equip", () => { const r = equipFromSling(save, i); game.message = r.message; game.refreshDerivedStats?.(); persist(); openPack(); }), uiButton("To pack", () => { const r = fromSling(save, i, EQUIPMENT_CAPACITY); game.message = r.message; persist(); openPack(); })); box.append(row); });
    body.append(box); }
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
  // Release 469: Select all, tap a card to leave it out, then salvage the rest. The choice lasts while the Pack is open.
  gearPick = gearPick ? new Set([...gearPick].filter((q) => save.inventory.includes(q))) : null;
  const visibleItems = save.inventory.map((item, index) => ({ item, index }))
    .filter(({item}) => item && typeof item === "object") // release 151: a damaged entry must not hide the rest
    .filter(({item}) => inventoryView.slot === "all" || item.slot === inventoryView.slot)
    .filter(({item}) => inventoryView.tier === "all" || itemTier(item) === inventoryView.tier)
    .sort((a,b) => inventoryView.sort === "name" ? a.item.name.localeCompare(b.item.name)
      : inventoryView.sort === "slot" ? a.item.slot.localeCompare(b.item.slot) || itemScore(b.item)-itemScore(a.item)
      : inventoryView.sort === "power" ? b.item.power-a.item.power : itemScore(b.item)-itemScore(a.item));
  { const bar = document.createElement("div"); bar.className = "inventory-tools";
    if (!gearPick) bar.append(uiButton("Select all", () => { gearPick = new Set(visibleItems.map((q) => q.item)); openPack(); }));
    else { const n = gearPick.size, iron = [...gearPick].reduce((t, q) => t + Math.max(1, ITEM_TIERS.indexOf(itemTier(q)) + 1), 0), go = uiButton(`Salvage selected (${n}) · ${iron} iron`, () => { const r = salvageInventoryItems(save, [...gearPick]); gearPick = null; game.message = `Salvaged ${r.count} piece${r.count === 1 ? "" : "s"} for ${r.iron} cinder iron.`; persist(); openPack(); }); go.disabled = !n;
      const tip = document.createElement("span"); tip.className = "options-note"; tip.textContent = "Tap a piece to leave it out (or put it back).";
      bar.append(go, uiButton("Select all", () => { gearPick = new Set(visibleItems.map((q) => q.item)); openPack(); }), uiButton("Cancel", () => { gearPick = null; openPack(); }), tip); }
    body.append(bar); }
  for (const { item, index: i } of visibleItems) {
    if (!["primary", "secondary", "armor", "charm"].includes(item.slot))
      continue;
    const row = document.createElement("div"),title=document.createElement("strong"),comparison=document.createElement("div");
    row.className = "item inventory-card";comparison.className="item-comparison";
    if (gearPick) { const on = gearPick.has(item); row.style.outline = on ? "2px solid #f0c070" : "1px dashed #4a4a44"; row.style.opacity = on ? "1" : ".6"; row.style.cursor = "pointer"; row.onclick = (ev) => { if (ev.target.closest("button")) return; if (gearPick.has(item)) gearPick.delete(item); else gearPick.add(item); openPack(); }; } // release 469
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
      uiButton("To sling", () => { const r = toSling(save, i); game.message = r.message; persist(); openPack(); }), // release 543
    );
    body.append(row);
  }
  }catch(error){packSectionFailed("Carried equipment",error)}
  if (!panel.open) panel.showModal();
}
const CODEX = {
  creatures: {
    ashling:["Ashling","A scavenger shaped by furnace dust; closes carefully for a short strike."],glassMite:["Glass Mite","A low crystal feeder whose small frame hides a quick bite."],sparkWarden:["Spark Warden","A walking conductor that launches visible bolts across distance."],ashenHound:["Ashen Hound","A fast pack hunter following heat and fresh tracks."],veilMoth:["Veil Moth","A drifting predator that casts force from beyond sword reach."],rootBrute:["Root Brute","A slow, durable growth animated by buried machinery."],coilStalker:["Coil Stalker","A patient hybrid that pressures from the middle distance."],cinderWisp:["Cinder Wisp","A fragile ember-spirit dangerous while it remains at range."],voidSentinel:["Void Sentinel","A rare floating hunter whose independently curling appendages frame a long-range bolt."],hollowMarshal:["Hollow Marshal","A dungeon guardian carrying the authority of a dead crossing."],riftColossus:["Rift Colossus","A world-scale anomaly gathered into predatory mass."],mossGrazer:["Moss Grazer","A quiet corridor browser that grazes among ashwood growths."],lanternDoe:["Lantern Doe","A curious light-bearing animal that may follow a patient Wayfarer."],hushling:["Hushling","A shy violet presence that disappears when approached directly."],gateRevenant:["Gate Revenant","A relentless dungeon predator that follows through open gates. Rift-wraiths and rapid fire punish hesitation; shelter breaks its pursuit."]
  },
  places: {
    "terrain:ash":["Ash Verge","Dry chambers where furnace residue gathers."],"terrain:glass":["Glass Reach","Cold mineral corridors that hold light too long."],"terrain:ember":["Ember Vault","Heat-scarred rooms surrounding old power lines."],"dungeon:hollow":["Hollow Relay","Separated halls joined by a failing relay."],"dungeon:cistern":["Root-Sunk Cistern","A salvage vault overtaken by roots and standing water."],"dungeon:kiln":["Glass Kiln","A sentinel den built around heat and mechanical traps."],"settlement:glasshaven":["Glasshaven","A sparse settlement of traders and glassworkers."],"settlement:coilmarket":["Coilmarket","A waystation built around signal salvage."],"district:city":["Hollow Ward","An abandoned city block of enterable apartments and monster-haunted streets."],"district:arcology":["Lumen Arcology","Futuristic relay structures whose upper facades still carry stray current."],"district:cloister":["Thorn Cloister","An old shrine compound of courts, sanctums, and weathered ceremonial walls."]
  },
  features: {
    shrine:["Singing Array","A machine-shrine and intermediate rest point. Reaching it changes where death returns you, but does not unlock Atlas travel."],checkpoint:["Wayglass Beacon","An activated beacon permits Atlas fast travel and also becomes your active recovery point."],supplyCache:["Supply Cache","A one-use field cache containing a deterministic equipment or material drop."],ruinMarker:["Broken Observatory","A collapsed instrument still pointing beyond the visible corridor."],dungeon:["Buried Crossing","A sealed route into a self-contained dungeon. Named crossings such as Glass Kilns have their own traps, guardians, and rewards."],shack:["Wayfarer Shack","A roofed field shelter whose interior remains part of the overworld."],architecturalDistrict:["Architectural District","A rare overworld complex with enterable structures, streets, and its own unresolved history."],tree:["Ashwood Grove","Trees may be cut or ignited through Act."],rock:["Shiftstone","Boulders may be moved or broken with sufficient Might."],relayTerminal:["Crossing Terminal","A consequential relay interface."],"trap:fire":["Kiln Vent","Scorch marks warn of a directional fire trap."],"trap:spikes":["Crossing Spikes","Floor seams can reveal the trap before it rises."],vine:["Transit Vine","A living traversal line spanning an otherwise impassable gap."],bossCue:["Colossus Trace","A sign that something much larger inhabits the region."]
  }
};
// Dungeon Monster Pack bestiary records, generated from the shared attribute tables.
for(const id of PACK_KINDS){const d=MONSTER_PACK[id],attacks=[...d.attacks,...d.bossAttacks].map(a=>ATTACK_MODULES[a]?.name).filter(Boolean);CODEX.creatures[id]=[`${d.name} — ${d.epithet}`,`${d.lore} ${MOVEMENT_MODES[d.movement].name}; ${BRAINS[d.brain].name.toLowerCase()}. Abilities: ${attacks.join(', ')}. ${d.attacks.map(a=>ATTACK_MODULES[a]?.text).filter(Boolean).join(' ')}`]}
const STAT_GLOSSARY=[
  ["Power","An item's base strength. Primary-weapon Power contributes to melee damage; secondary-weapon Power contributes to projectile and spell damage; armor Power grants 2.5% resistance per point; charm Power grants 1% resistance per point."],
  ["Attack","A flat damage bonus supplied by an item affix. On a primary weapon it improves melee attacks; on a secondary weapon it improves projectiles and spells."],
  ["Reach","A percentage increase to both melee range and projectile travel distance. Reach does not enlarge explosions or spell areas."],
  ["Blast radius","The fixed area affected by a bomb or explosive projectile. It is determined by the weapon profile and is separate from Reach."],
  ["Spell radius","The fixed area affected by a spell pulse. Reach does not change it."],
  ["Weapon Sphere","A permanent forging material. Sela spends an increasing number to raise an equipped primary or secondary weapon by one bounded upgrade rank."],
  ["Armor Sphere","A permanent forging material. Sela spends an increasing number to raise equipped armor or a charm by one bounded upgrade rank."],
  ["Upgrade rank","A preserved +rank on one item. It raises Power without rerolling identity, tier, affixes, set membership, or special behavior."],
  ["Aperture band","Dormant, Stirring, Open, and Resonant thresholds unlock disciplines and add deterministic possibilities to future eligible encounters without scaling every creature."],
  ["Aerial Step","A short traversal discipline that permits movement across lethal water or pits. It cannot cross blocked walls or gates and returns the Wayfarer to stable ground if it expires over danger."],
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
  relayNode:"A Dormant Relay sits in some crossings, held by the crossing's guardian. Restore or sever it to hear the next fragment of the far transmission. Five answered relays wake the buried network.",
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
// Surface sea creatures (water world W3).
Object.assign(CODEX.creatures,{lanceeel:['Lanceeel — the wake that lunges','Hides below the surface, shows a pale wake line, then charges straight along it and dives. Step off the line.'],ringcoil:['Ringcoil Serpent — the closing circle','Circles a swimmer or skiff, tightening until it bites. Strike it and the coil is thrown wide.'],sinewake:['Sinewake Serpent — the weaving body','Weaves toward its prey in an S, a long segmented body trailing; bites, then backs off.'],breachfin:['Breachfin — the falling fin','Marks a dark landing shadow, leaps from the water in an arc and crashes down. It can only be struck in the air.'],mireLeech:['Mire Leech — the bog nip','Hops through fen water and nips at anything that wades.'],bogLurker:['Bog Lurker — the drowned ambush','Waits unseen in the mire. Bubbles rise, then it bites and drags its prey a step closer.']});
// Grotto beasts (water world W6).
Object.assign(CODEX.creatures,{grottoEel:['Grotto Eel — the cave lance','Hides in the grotto, shows a pale wake, then charges straight along it.'],angler:['Lantern Angler — the false light','Its glowing lure hangs in the dark even while it hides. Come close and it bites and drags you in.'],abyssalBeast:['Abyssal Beast — the weaving bulk','A heavy grotto predator that weaves toward divers and bites hard.'],elderWyrm:['Elder Wyrm — the coil in the deep','Guards the sunken cache in every grotto. Its long body weaves toward you; then it marks a line and lunges along it.']});
// Leviathans (water world W4).
Object.assign(CODEX.creatures,{greywhale:['Greywhale — the calm giant','Drifts through deep water and harms no one — until struck. Then it sounds beneath you, its vast shadow spreads, and it breaches.'],tyrantMosasaur:['Tyrant Mosasaur — the shadow that hunts','A sea-lizard as long as a boat: a pointed snout, jaws full of teeth, a heavy body rowed by four flippers and driven by a shark-like tail. It stalks below with only its shadow showing, locks on and lunges across the surface with its jaws open. After a lunge it lies exposed.'],undertowLeviathan:['Undertow Leviathan — the long pull of the deep','A long, segmented thing of the open ocean. Like the Mosasaur it hunts from below, locks on and lunges across the surface, then lies exposed for a moment.'],reefKraken:['Reef Kraken — the rising limbs','Marks rings in the water around its prey, and tentacles burst up through them. Each limb can be cut down.'],abyssalKraken:['Abyssal Kraken — the drowning grip','Marks its prey, then seizes and drags it toward its maw. Heavy blows break the grip.'],stormkraken:['Stormkraken — the ink in the dark','Raises a tentacle at a time and clouds the sea with ink, hiding everything beyond arm\'s reach.']});
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
  for(const [id,label] of [["chronicle","Chronicle"],["quests","Active quests"],["dungeons","Deep expeditions"],["creatures","Creatures"],["places","People & Places"],["features","Encountered features"],["rules","Symbols & controls"],["glossary","Glossary"],["tome","Reciter's Tome"],["gate","The Far Gate"]]){const b=uiButton(label,()=>openJournal(id));if(id===mode)b.setAttribute('aria-current','page');nav.append(b)} // release 287: the open tab is marked (gold)
  out.append(nav);
  if(mode!=="chronicle"){
    if(mode==="quests"){renderQuests(out);if(!journal.open)journal.showModal();return;}
    if(mode==="tome"){renderTome(out);if(!journal.open)journal.showModal();return;}
    if(mode==="gate"){renderFarGate(out);if(!journal.open)journal.showModal();return;}
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
      ["guidance-arrow",["Violet compass arrow — Guidance","Tracks the active quest, Viewport hunt, or Corridor objective. It changes as that objective advances and never replaces a manual waypoint."]],
      ["manual-arrow",["Cyan compass arrow — Manual waypoint","Tracks the explored Atlas section you selected. It remains until you clear or replace it, even while guidance is active."]],
      ...ATLAS_SYMBOLS.map(symbol=>[`atlas-${symbol.kind}`,[symbol.label,symbol.description]]),
      ["atlas",["Atlas controls","Drag with one finger to pan. Pinch with two fingers, use the mouse wheel or +/− to zoom; double-tap a section to zoom in on it. Zoomed far out, the Atlas becomes a world view of everything you have explored, with the regions you have heard tinted and named. World shows all of it; Go to… jumps to a region, or to a town, district or Wayglass inside it. Tap a section with a Wayglass to choose it for travel. Tap an explored section to select it, then use Set waypoint to guide the constellation compass."]],
      ["travel",["Travel","Activate Wayglass beacons to travel to them from the Atlas. Dungeon travel remains sealed without a Crossing Sigil."]],
      ["combat",["Combat","Red or violet telegraphs show the exact threatened area. Dodge spends stamina; jumping avoids grounded impacts."]],
      ["aperture",["Aperture","Exploration, discoveries, and significant enemies raise Aperture, revealing hidden layers of known places."]]
    ]:mode==="creatures"?[
      ...Object.entries(CODEX.creatures).filter(([id])=>save.codex?.creatures?.[id]),
      ...Object.entries(save.codex?.foundry||{}).map(([id,q])=>[id,[q.name||"Unclassified creature",`${q.role||"unknown"} · observed modules: ${(q.modules||[]).join(", ")}${q.defeated?" · defeated":" · unresolved"}`]])
    ]:mode==="places"?[
      ...Object.entries(CODEX.places).filter(([id])=>save.codex?.places?.[id]),
      ...Object.entries(save.codex?.peoplePlaces||{}).map(([id,q])=>[`${q.type||"place"}:${id}`,[q.name||id,`${q.role?q.role+" · ":""}${q.summary||"A discovered Corridor record."} ${(q.facts||[]).join(" ")}${q.crossRefs?.length?` Related: ${q.crossRefs.join(", ")}.`:""}${q.outcome?` Status: ${q.outcome}.`:""}`]])
    ]:Object.entries(CODEX[mode]).filter(([id])=>save.codex?.[mode]?.[id]);
    const heading=document.createElement("h3"),scope=document.createElement("p");heading.textContent=mode==="rules"?"Map symbols and controls":mode==="features"?"Encountered feature records":mode==="glossary"?"Combat and equipment terms":`${mode[0].toUpperCase()+mode.slice(1)} encountered`;scope.textContent=mode==="rules"?"A universal reference for reading the Atlas, floor marks, and controls. Encounter-specific history belongs under Features.":mode==="features"?"Objects recorded through exploration. Open a feature for its field function and its place in the Corridor.":"";out.append(heading);if(scope.textContent)out.append(scope);
    if(!entries.length){const empty=document.createElement("p");empty.textContent="No entries recorded yet. Encounter them in the world to unlock this section.";out.append(empty);}
    for(const [id,entry] of entries){
      const article=document.createElement("article"),title=document.createElement("h3"),text=document.createElement("p");article.className="item codex-card";title.textContent=entry[0];text.textContent=entry[1];
      if(mode==="rules"&&["ring","chevron","triangle","spiral"].includes(id)){const badge=document.createElement("span");badge.className="symbol-badge";badge.append(trailMark(id));article.classList.add("symbol-card");article.prepend(badge)}
      else if(mode==="rules"&&id.startsWith("atlas-")){const badge=document.createElement("span");badge.className="symbol-badge";badge.append(atlasMark(id.slice(6)));article.classList.add("symbol-card");article.prepend(badge)}
      if(mode==="creatures"&&isPackKind(id)){const portrait=document.createElement("canvas");portrait.width=portrait.height=128;portrait.className="creature-portrait pack-portrait";portrait.setAttribute("role","img");portrait.setAttribute("aria-label",`${entry[0]} field illustration`);const pc=portrait.getContext("2d");if(pc)drawPackPortrait(pc,id,128,1200);article.prepend(portrait)}
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
  const witnessed=replayableScenes(save);if(witnessed.length){const heading=document.createElement("h3");heading.textContent="Witnessed scenes";out.append(heading);for(const scene of witnessed){const button=uiButton(`Replay · ${scene.title}`,()=>{journal.close();startScene(scene.id,{replay:true})});button.className="journal-replay";out.append(button)}}
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
// Release 159: the HUD ran every frame and rewrote text, attributes and styles even when nothing had changed, which
// forced a style recalculation and layout each frame. hudSet() writes a property only when its value differs from the
// last one written, and element lookups are cached.
const hudEls=new Map(),hudLast=new WeakMap();
function hudEl(sel){let e=hudEls.get(sel);if(!e||!e.isConnected){e=$(sel);hudEls.set(sel,e)}return e}
// Release 507: once built, the submersible on a button calls the robot (the frame count reads 0), so the button shows the
// robot's state instead: DRONE, EMP, ON, OFF or the seconds until it can be called. Null for anything else, or aboard.
function robotTag(save, item) {
  const m = save.mech; if (item !== "submersible" || !m?.built || (save.boat?.owned && save.boat?.aboard)) return null;
  return m.active ? (m.mode === "drone" ? "DRONE" : m.empowered ? "EMP" : "ON") : m.cooldown > 0 ? `${Math.ceil(m.cooldown)}s` : "OFF";
}
function hudSet(el,key,value){if(!el)return;let m=hudLast.get(el);if(!m)hudLast.set(el,m={});if(m[key]===value)return;m[key]=value;
  if(key==="text")el.textContent=value;else if(key==="max"||key==="value")el[key]=value;else if(key.startsWith("--")||key==="transform")key==="transform"?el.style.transform=value:el.style.setProperty(key,value);else if(key.startsWith("class:"))el.classList.toggle(key.slice(6),value);else if(key.startsWith("data-"))el.dataset[key.slice(5)]=value;else el.setAttribute(key,value)}
function updateHud(now) {
  const health = Math.max(0, Math.ceil(game.player.hp)),
    stamina = Math.max(0, Math.ceil(game.player.stamina)),
    next = Math.max(1, save.nextXp || 30);
  const rot = Math.floor(save.rot || 0);
  hudSet(hudEl("#healthText"),"text",(rot > 0 ? `${health}/${save.maxHp - rot} (rot −${rot})` : `${health}/${save.maxHp}`) + (game.map?.underwater ? ` · air ${Math.ceil(save.session.breath ?? 20)}s` : ""));
  hudSet(hudEl("#healthBar"),"max",save.maxHp);
  hudSet(hudEl("#healthBar"),"--rot",`${rot > 0 ? Math.min(100, rot / Math.max(1, save.maxHp) * 100).toFixed(1) : 0}%`); // release 283: the rotted share of the bar turns grey (styles.css)
  hudSet(hudEl("#healthBar"),"value",health);
  hudSet(hudEl("#staminaBar"),"max",save.maxStamina);
  hudSet(hudEl("#staminaBar"),"value",stamina);
  // Release 257: Lightning Giant shock pips (shown only while charged or knocked down).
  { const pips = hudEl("#shockPips"), stunned = now < (game.player.stunnedUntil || 0), count = stunned ? 3 : Math.max(0, Math.min(3, game.player.shockCount || 0)); hudSet(pips,"class:off",!count); hudSet(pips,"class:stunned",stunned); hudSet(pips,"data-count",String(count)); }
  const aperture = save.perception?.aperture || 0,
    tier = apertureTier(aperture),
    apertureNext = APERTURE_THRESHOLDS[tier];
  const short=(n)=>n>=10000?`${(n/1000).toFixed(n>=100000?0:1)}k`:String(n);hudSet(hudEl("#xpCompact"),"text",`LV ${save.level} · XP ${short(save.xp)}/${short(next)}`);hudSet(hudEl("#apCompact"),"text",`AP ${short(aperture)}${apertureNext ? "/" + short(apertureNext) : ""} · T${tier} · S${stageOf(save)}`);/* release 279: the creature stage */hudSet(hudEl("#apCompact"),"title",`${apertureBand(aperture).name} band`);
  const states = actionReadiness(game, now);
  for (const [action, state] of Object.entries(states)) {
    const button = hudEl(`[data-action="${action}"]`);
    if (!button) continue;
    const cooling = state.remaining > 0,
      fraction = cooling ? Math.min(1, state.remaining / state.duration) : 0,
      label = cooling
      ? `${state.remaining.toFixed(state.remaining < 1 ? 1 : 0)}s`
      : action === "potion"
        ? `×${state.count}`
        : action === "dodge"
          ? `${state.cost} STA`
          : "READY";
    hudSet(button,"--cooldown",`${Math.round(fraction * 100)}%`);
    hudSet(button,"class:cooling",cooling);
    hudSet(button,"class:unavailable",state.available === false);
    hudSet(button,"data-cooldown",label);
    hudSet(button,"aria-label",`${action} ${label}`);
  }
  { const pb = hudEl('[data-action="potion"]'); if (pb) hudSet(pb, "data-tier", potionToDrink(save)); } // release 339: the bottle takes the tier's colour
  // Release 261: the spell preset button shows which preset (1 or 2) is in the slots.
  { const pb = hudEl('[data-action="preset"]'), n = String((save.magicSkills?.preset || 0) + 1); if (pb) { hudSet(pb, "text", n); hudSet(pb, "aria-label", `Spell preset ${n}: tap to switch`); } }
  // Release 283: the Build button names what it will raise now (continuous build may have moved on to the next material),
  // REPAIR beside a damaged skiff, and is barred (a red circle and slash over the hammer) when no build can be afforded.
  { const bb = hudEl('[data-action="build"]'), btn = activeButton(save); if (bb && btn.mode === "item") { setBuffFill(bb, 0); // release 291: a preset's item button
      const n = btn.item ? save.consumables?.[btn.item] || 0 : 0; let glyph = bb.querySelector(".item-glyph"); if (!glyph) { glyph = document.createElement("span"); glyph.className = "item-glyph"; glyph.setAttribute("aria-hidden", "true"); bb.append(glyph); }
      if (glyph.dataset.item !== (btn.item || "")) { glyph.dataset.item = btn.item || ""; glyph.innerHTML = ITEM_ICONS[btn.item] || "?"; glyph.classList.remove("cast-glyph"); glyph.style.color = ""; } const robot = robotTag(save, btn.item); /* release 507: the built robot shows its state, not the spent frame count */ hudSet(bb, "class:item-mode", true); hudSet(bb, "class:spent", !n && !robot); hudSet(bb, "data-cooldown", robot || (btn.item ? `×${n}` : "ITEM")); hudSet(bb, "aria-label", btn.item ? `Use ${ITEM_NAMES[btn.item] || btn.item} (${n} left)` : "Item button: choose an item in Supplies");
    } else if (bb && btn.mode === "cast") { // release 309: a spell or discipline on the Build button
      const c = CASTABLES[btn.key], cd = save.magicSkills?.cooldowns || {}, left = c ? Math.ceil(c.kind === "spell" ? cd[`spell:${c.id}`] || 0 : cd[c.id] || 0) : 0; let glyph = bb.querySelector(".item-glyph"); if (!glyph) { glyph = document.createElement("span"); glyph.className = "item-glyph"; glyph.setAttribute("aria-hidden", "true"); bb.append(glyph); }
      if (glyph.dataset.item !== btn.key) { glyph.dataset.item = btn.key; glyph.textContent = c?.symbol || "?"; glyph.style.color = c ? ATTRIBUTES[c.attr].color : ""; glyph.classList.add("cast-glyph"); }
      hudSet(bb, "class:item-mode", true); hudSet(bb, "class:spent", left > 0); hudSet(bb, "data-cooldown", left > 0 ? `${left}s` : ""); setBuffFill(bb, spellOrSkillLeft(btn.key)); /* release 313 */ hudSet(bb, "aria-label", c ? `Cast ${c.id.replace(/-/g, " ")}` : "Spell button")
    } else if (bb) { const k = activeBuildKind(save), mend = !!game.mendTarget?.(); hudSet(bb, "class:item-mode", false); setBuffFill(bb, 0); { const g = bb.querySelector(".item-glyph"); if (g && g.dataset.item && CASTABLES[g.dataset.item]) { g.dataset.item = ""; g.textContent = ""; g.style.color = ""; g.classList.remove("cast-glyph"); } } hudSet(bb, "aria-label", mend ? "Repair the skiff" : k ? `Build a ${BUILD.kinds[k].name.toLowerCase()}` : "Nothing to build with"); hudSet(bb, "data-cooldown", mend ? "REPAIR" : k ? k.toUpperCase() : ""); hudSet(bb, "data-kind", k || "none"); hudSet(bb, "class:spent", !mend && !k); } } // release 265
  // Spell slots A and B (release 113): each shows its castable's symbol in its attribute colour.
  for (const [action, slot] of [["spell", "a"], ["spell2", "b"]]) {
    const button = hudEl(`[data-action="${action}"]`), c = slotted(save, slot), t = !c && slotTool(save, slot); // release 309: Build or the item in A or B
    if (!button) continue;
    const key = c ? c.key : t ? `tool:${t.tool}:${t.item || ""}` : "empty";
    if (button.dataset.slotKey !== key) { button.dataset.slotKey = key; const sym = Object.assign(document.createElement("span"), { className: "slot-sym", textContent: c ? c.symbol : t?.tool === "build" ? "⚒" : t ? "" : "+" }); if (t?.tool === "item") sym.innerHTML = ITEM_ICONS[t.item] || "?"; button.replaceChildren(sym, Object.assign(document.createElement("span"), { className: "slot-letter", textContent: slot.toUpperCase() })); button.style.setProperty("--slot", c ? c.color : t?.tool === "build" ? "#c08a52" : t ? "#d8c49a" : "#76684e"); }
    if (t?.tool === "item") hudSet(button, "data-cooldown", robotTag(save, t.item) || (t.item ? `×${save.consumables?.[t.item] || 0}` : "ITEM")); // release 507
    setBuffFill(button, c ? spellOrSkillLeft(c.key) : 0); // release 313; 517: spells too
    hudSet(button,"aria-label",`Slot ${slot.toUpperCase()}: ${c ? c.name : t ? (t.tool === "build" ? "Build" : t.item ? ITEM_NAMES[t.item] || t.item : "item (none chosen)") : "empty"} ${button.dataset.cooldown || ""}`);
  }
}
// Release 313: while a skill's effect runs, its button glows gold, and the gold drains away from the left as it ends.
// Release 517: a skill's buff (spell-slots buffLeft), or a cast spell's time left (Game.spellBuffLeft).
function spellOrSkillLeft(key) { const c = CASTABLES[key]; return c?.kind === "spell" ? game.spellBuffLeft(c.id) : c?.id === "rift-step" ? Math.max(buffLeft(save, key), game.riftFlashLeft()) : buffLeft(save, key); } // release 519: Rift Step flashes
function setBuffFill(button, f) {
  let fill = button.querySelector(".buff-fill");
  if (f > 0 && !fill) { fill = document.createElement("span"); fill.className = "buff-fill"; fill.setAttribute("aria-hidden", "true"); button.append(fill); }
  hudSet(button, "class:buffing", f > 0); if (fill) fill.style.width = `${Math.round(f * 1000) / 10}%`;
}
let nextSlowUiRefresh = 0;
const sceneRuntime={active:null,plan:null,shot:0,started:0,revealSkip:false,image:null,wasPaused:false};
function scenePanelPosition(panel){return{0:["0%","0%"],1:["100%","0%"],2:["0%","100%"],3:["100%","100%"]}[panel]||["0%","0%"]}
function startScene(id,{replay=false}={}){const plan=scenePlaybackPlan(save,id,{reduceMotion:settings.reduceMotion||settings.safeMode,quality:currentQuality(),replay});if(!plan)return false;sceneRuntime.active=id;sceneRuntime.plan=plan;sceneRuntime.shot=plan.startShot||0;sceneRuntime.started=performance.now();sceneRuntime.revealSkip=false;sceneRuntime.wasPaused=game.paused;sceneRuntime.image=new Image();sceneRuntime.image.src="./assets/story-scenes-v1.png";game.setPaused(true,performance.now());showSceneShot();return true}
function showSceneShot(){const root=$("#storyScene"),shot=sceneRuntime.plan.shots[sceneRuntime.shot],[x,y]=scenePanelPosition(shot.panel),actors=$("#sceneActors");root.hidden=false;$("#sceneArt").style.backgroundImage="url('./assets/story-scenes-v1.png')";root.dataset.effect=shot.effect;root.dataset.camera=shot.camera;root.style.setProperty("--scene-duration",`${shot.duration}ms`);$("#sceneArt").style.setProperty("--scene-x",x);$("#sceneArt").style.setProperty("--scene-y",y);$("#sceneArt").setAttribute("aria-label",`${sceneRuntime.plan.title}: ${shot.caption}`);actors.replaceChildren();for(const cue of shot.choreography||[]){const actor=document.createElement("div");actor.className="scene-actor";actor.dataset.actor=cue.actor;actor.dataset.cue=cue.cue;actor.style.setProperty("--actor-x",`${cue.to?.[0]??50}%`);actor.style.setProperty("--actor-y",`${cue.to?.[1]??55}%`);actor.textContent=cue.actor==="wayfarer"?"◆":"◇";actors.append(actor)}$("#sceneTitle").textContent=sceneRuntime.plan.title;$("#sceneCaption").textContent=shot.caption;$("#sceneSkip").hidden=!sceneRuntime.revealSkip}
function finishScene(){const replay=sceneRuntime.plan?.replay,id=sceneRuntime.active;if(!replay)commitScene(save,id);$("#storyScene").hidden=true;$("#sceneArt").style.backgroundImage="none";$("#sceneActors").replaceChildren();sceneRuntime.image=null;sceneRuntime.active=null;sceneRuntime.plan=null;if(!sceneRuntime.wasPaused)game.setPaused(false,performance.now());persist()}
function tickScene(now){if(!sceneRuntime.active){const pending=save.scenes?.pending;if(pending)startScene(pending.sceneId);return false}const shot=sceneRuntime.plan.shots[sceneRuntime.shot];if(now-sceneRuntime.started>=shot.duration){sceneRuntime.shot++;if(sceneRuntime.shot>=sceneRuntime.plan.shots.length)finishScene();else{sceneRuntime.started=now;if(!sceneRuntime.plan.replay){const pending=save.scenes?.pending;if(pending){pending.shot=sceneRuntime.shot;pending.elapsed=0}persist()}showSceneShot()}}return true}
$("#storyScene").onclick=()=>{if(!sceneRuntime.active)return;if(!sceneRuntime.revealSkip){sceneRuntime.revealSkip=true;showSceneShot()}else finishScene()};$("#sceneSkip").onclick=e=>{e.stopPropagation();finishScene()};
// Release 167: between frames, generate the sections the next crossing's compass cues will ask about, so crossing into
// a new section no longer generates five to ten of them inside one frame. Idle time is used while it lasts; a busy
// phone with none still gets one section every 300 ms.
const whenIdle = typeof requestIdleCallback === "function" ? (fn) => requestIdleCallback(fn, { timeout: 300 }) : (fn) => setTimeout(() => fn(null), 300);
let compassWarmFor = null, compassWarming = false;
function compassWarmKey() { return game.area === "overworld" ? `${save.seed}:${save.worldGeneration}:${game.rx},${game.ry}` : null; }
function warmCompassSignals() {
  const key = compassWarmKey();
  if (!key || key === compassWarmFor || compassWarming) return;
  compassWarming = true;
  whenIdle(function step(deadline) {
    try {
      if (compassWarmKey() !== key) { compassWarming = false; return; } // moved on: the next frame starts again from there
      let done = warmWayfindingSignals(save.seed, game.rx, game.ry, save.worldGeneration, 1);
      while (!done && deadline && !deadline.didTimeout && deadline.timeRemaining() > 4) done = warmWayfindingSignals(save.seed, game.rx, game.ry, save.worldGeneration, 1);
      if (done) { compassWarmFor = key; compassWarming = false; }
      else whenIdle(step);
    } catch (error) { compassWarmFor = key; compassWarming = false; console.warn("Compass warm-up failed", error); }
  });
}
function frame(now) {
  try {
  probeInterval = now - last;
  const dt = Math.min(0.05, (now - last) / 1000);
  recordPerf("frame", now - last);
  last = now;
  measured("input",()=>input.update(dt));
  // Release 199: while a Glimpse plays nothing else runs: no keys, no update, whatever has tried to resume the game.
  if (glimpseRun) { game.setPaused(true, now); return; }
  if (input.consume("pause")) game.paused ? resume() : pause();
  if (input.consume("map")) openMap();
  if (input.consume("journal")) openJournal();
  if (input.consume("menu")) openPack();
  if(tickScene(now))return;
  // Release 281 (Tim's Dodge probes): the probe records what became of every Dodge press: dodged (and how far), or why not.
  const dodgeAsked = probe.running && input.state.dodge ? { x: game.player.x, y: game.player.y, stamina: game.player.stamina, held: now < (game.player.heldUntil || 0), stunned: now < (game.player.stunnedUntil || 0) } : null;
  measured("update", () => game.update(dt, input, now));
  if (dodgeAsked) probe.event("dodge", game.player.dodgeUntil > now ? { result: "dodged", stamina: Math.round(dodgeAsked.stamina), moved: Math.round(Math.hypot(game.player.x - dodgeAsked.x, game.player.y - dodgeAsked.y) * 100) / 100 } : { result: dodgeAsked.stunned ? "stunned" : dodgeAsked.held ? "held (struggle)" : dodgeAsked.stamina < 15 ? "no stamina" : "refused", stamina: Math.round(dodgeAsked.stamina) });
  if (game.paused) return;
  warmCompassSignals();
  measured("render", () => {
    renderTimings.on = probe.running;
    render(ctx, game, innerWidth, innerHeight, now);
    drawDungeonSystems();
    drawRangedEffects();
  });
  updateMessage(game.message);
  measured("hud", () => {
    updateHud(now);
    updateNavigationCompass();
  });
  if (now >= nextSlowUiRefresh) {
    nextSlowUiRefresh = now + 100;
    measured("notices",updateWorldNotices);
    $("#place").textContent =
      game.area === "dungeon"
        ? game.map.name
        : game.rx === 0 && game.ry === 0
          ? save.consequences.settlements["ember-refuge"].status === "fallen"
            ? "Ember Refuge · FALLEN"
            : "Ember Refuge · standing"
          : `Cinder Verge · ${game.rx}, ${game.ry}`;
    const buffs = [];
    if (game.guardRemaining > 0)
      buffs.push(`IRONBARK ${Math.ceil(game.guardRemaining)}s`);
    if (game.magicBuffRemaining > 0)
      buffs.push(`LUMEN SURGE ${Math.ceil(game.magicBuffRemaining)}s`);
    if(save.meal)buffs.push(`MEAL ${mealLeft(save.meal)}`); // release 447
    {const run=game.area==="dungeon"&&marginRun(save,game.areaId());if(run?.perks?.length)buffs.push(`MARGINALIA ${run.perks.map(id=>MARGINALIA[id]?.name||id).join(", ")}`)} // release 459
    if(save.elites?.status?.poison>0)buffs.push(`POISON ${Math.ceil(save.elites.status.poison)}s`);
    if(probe.running){const left=Math.ceil(probe.remaining);buffs.push(`PROBE ${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`)}
    $("#buff").textContent = buffs.join(" · ");
  }
  if ((clock += dt) > 8) {
    clock = 0;
    persist();
  }
  } catch(error) {
    console.error("Infinite Corridor frame recovered from an error",error);
    game.message="The Corridor stuttered, then found its rhythm again.";
    // Release 126: an overlay that throws while opening (Pack, Map, Journal) falls back to the pause menu (release 145:
    // which now names the error).
    recoverOverlay(error);
  } finally {
    requestAnimationFrame(frame);
    // Only real play counts: frames while paused, in a menu or hidden are left out of the probe.
    if (probe.running) { try { if (!game.paused && !document.hidden && ![pausePanel,atlas,panel,journal,optionsPanel].some((d)=>d.open)) probeSample(probeInterval); else { probePhases = {}; probePrevious = null; } } catch (error) { console.warn("Probe sample failed", error); } }
  }
}
$("#resume").onclick = resume;
$("#pausedPack").onclick = openPack;
$("#pausedMap").onclick = openMap;
$("#pausedJournal").onclick = openJournal;
$("#pausedOptions").onclick = openOptions;
$("#optionsButton").onclick = openOptions;
$("#optionsClose").onclick = () => optionsPanel.close();
$("#journalClose").onclick = () => journal.close();
$("#creatureViewerClose").onclick=()=>$("#creatureViewer").close();
$("#close").onclick = () => panel.close();
$("#mapClose").onclick = () => atlas.close();
$("#mapWayglassSelect").onchange=()=>{const key=$("#mapWayglassSelect").value,c=save.checkpoints?.[key];if(!c)return;mapView.chosen=true;mapView.x=c.rx;mapView.y=c.ry;showMapDetail(c.rx,c.ry);drawMap()};
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
  mapView.zoom = clampZoom(mapView.zoom * ATLAS_ZOOM.step);
  drawMap();
};
$("#mapMinus").onclick = () => {
  if(mapMode==="dungeon")return;
  mapView.zoom = clampZoom(mapView.zoom / ATLAS_ZOOM.step);
  drawMap();
};
$("#mapUnstick").onclick = () => {
  if (performance.now() - atlasOpenedAt < 500) return;
  const moved = game.unstick(performance.now());
  persist();
  if (moved) resume();
  else $("#mapDetail").textContent = game.message;
};
$("#mapTravel").onclick = () => {
  if (performance.now() - atlasOpenedAt < 500) return;
  const key = selectedWayglassKey();
  const travelled=game.area === "dungeon"
    ? game.useCrossingSigil(save.checkpoints?.[key] ? key : null) // release 449: on to the chosen Wayglass
    : game.travelToCheckpoint(save.checkpoints?.[key] ? key : null);
  persist();
  if(travelled)resume();
  else{$("#mapDetail").textContent=game.message;drawMap()}
};
$("#mapHome").onclick = () => {
  if (performance.now() - atlasOpenedAt < 500) return;
  game.returnHome();
  persist();
  resume();
};
$("#mapRelays").onclick=()=>{relayOverlay=!relayOverlay;$("#mapRelays").setAttribute("aria-pressed",String(relayOverlay));drawMap()};
$("#mapWaypoint").onclick=()=>{const selected=mapView.selected;if(!selected||!mapView.chosen||!save.explored[`${selected.rx},${selected.ry}`])return;const same=save.manualWaypoint?.rx===selected.rx&&save.manualWaypoint?.ry===selected.ry;save.manualWaypoint=same?null:{kind:"section",area:"overworld",rx:selected.rx,ry:selected.ry,label:`Section ${selected.rx}, ${selected.ry}`};navigationCache.key=null;updateMapWaypointButton();showMapDetail(selected.rx,selected.ry);drawMap();persist()};
for (const [id, dx, dy] of [
  ["mapN", 0, -1],
  ["mapS", 0, 1],
  ["mapW", -1, 0],
  ["mapE", 1, 0],
])
  $("#" + id).onclick = () => {
    if(mapMode==="dungeon")return;
    const step = panStep(mapView.zoom, mapCanvas.clientWidth || 600); // release 205: a third of the view at any zoom
    mapView.x += dx * step;
    mapView.y += dy * step;
    drawMap();
  };
mapCanvas.onclick = (e) => {
  if(mapMode==="dungeon")return;
  if (suppressMapClick) {
    suppressMapClick = false;
    return;
  }
  const r = mapCanvas.getBoundingClientRect(),
    cell = sectionPixels(mapView.zoom),
    rx =
      mapView.x +
      Math.floor((e.clientX - r.left - r.width / 2 + cell / 2) / cell),
    ry =
      mapView.y +
      Math.floor((e.clientY - r.top - r.height / 2 + cell / 2) / cell);
  // Release 205: a second tap on the same section within a moment zooms in on it.
  const now = performance.now(), again = lastMapTap && now - lastMapTap.at < 350 && lastMapTap.rx === rx && lastMapTap.ry === ry;
  lastMapTap = again ? null : { at: now, rx, ry };
  if (again) { mapView.x = rx; mapView.y = ry; mapView.zoom = clampZoom(Math.max(mapView.zoom * 2.2, ATLAS_ZOOM.detail)); }
  if (save.explored[`${rx},${ry}`]) { mapView.chosen = true; showMapDetail(rx, ry); } // release 279: a tapped section is a choice
  // Release 213 (Tim): a tapped section with a Wayglass is chosen for travel and the Travel button comes into view.
  { const k = atlasWayglassNear(rx, ry); if (k) { const sel = $("#mapWayglassSelect"); if (![...sel.options].some((o) => o.value === k)) refreshWayglassDestinations(); sel.value = k; updateMapTravelButton(); } } // release 443 (Tim: "when I select a section that has a Wayglass... it should just automatically populate the... travel to Wayglass")
  if (atlasWayglassNear(rx, ry) && game.area !== "dungeon") { const b = $("#mapTravel"); b.scrollIntoView?.({ block: "nearest", behavior: "smooth" }); b.classList.remove("ready"); void b.offsetWidth; b.classList.add("ready"); }
  drawMap();
  persist();
};
let lastMapTap = null;
mapCanvas.addEventListener("wheel", (e) => { if (mapMode === "dungeon") return; e.preventDefault(); mapView.zoom = clampZoom(mapView.zoom * Math.exp(-e.deltaY * .0015)); drawMap(); }, { passive: false });
// The World button and the Places list (release 205): the whole explored world, each region heard, and the towns,
// shelters and Wayglasses inside it.
function fitAtlas(bounds) { const f = frameSections(bounds, mapCanvas.clientWidth || 600, mapCanvas.clientHeight || 400); if (!f) return; mapView.x = f.x; mapView.y = f.y; mapView.zoom = f.zoom; mapView.panX = mapView.panY = 0; drawMap(); }
function refreshAtlasPlaces() {
  const sel = $("#mapPlaces"); if (!sel) return;
  const groups = atlasPlaces(save), options = [new Option("Go to…", "")];
  options.push(new Option("The whole explored world", "world"), new Option("Where I am", "here"));
  sel.replaceChildren(...options);
  groups.forEach((g, i) => { const og = document.createElement("optgroup"); og.label = g.name; og.append(new Option(`All of ${g.name}`, `region:${i}`)); g.places.forEach((p, j) => og.append(new Option(`${p.name} (${p.rx},${p.ry})`, `place:${i}:${j}`))); sel.append(og); });
  sel.onchange = () => {
    const v = sel.value; sel.value = ""; if (!v) return;
    if (v === "world") fitAtlas(boundsOf(exploredSections(save)));
    else if (v === "here") { mapView.x = game.rx; mapView.y = game.ry; mapView.zoom = Math.max(mapView.zoom, ATLAS_ZOOM.placeZoom); drawMap(); }
    else { const [kind, i, j] = v.split(":").map((x, k) => k ? Number(x) : x), g = groups[i]; if (kind === "region") fitAtlas(g.bounds); else { const p = g.places[j]; mapView.x = p.rx; mapView.y = p.ry; mapView.zoom = ATLAS_ZOOM.placeZoom; showMapDetail(p.rx, p.ry); drawMap(); } }
  };
}
$("#mapWorld").onclick = () => { if (mapMode === "dungeon") return; fitAtlas(boundsOf(exploredSections(save))); };
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
      mapView.zoom = clampZoom(atlasPinch.zoom * distance / atlasPinch.distance);
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
    const cell = sectionPixels(mapView.zoom);
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
  $("#" + id).addEventListener("click", () => {
    mapView.chosen = true; showMapDetail(mapView.x, mapView.y); // release 279: so is one stepped to
  });
for (const d of [panel, atlas, journal, optionsPanel])
  d.addEventListener("close", () => {
    overlayClosedAt = performance.now(); // release 279
    // A dialog closed to make way for a Glimpse must not unpause the game under it (close fires asynchronously).
    if (
      !glimpseRun &&
      game.paused &&
      !document.hidden &&
      !pausePanel.open &&
      !atlas.open &&
      !panel.open &&
      !journal.open &&
      !optionsPanel.open
    ) {
      if (overlayPause) resume();
      else pausePanel.showModal();
    }
  });
// Release 259 (Tim, 2026-10-21: the phone's back button "just freezes the game... it should go back to pause or resume,
// it should give me that menu"). One back action, from either route a phone sends it by: a dialog's close request
// (cancel) or browser history (popstate, kept armed by a guard entry so back never leaves the game page).
// A menu open: close it and show the pause menu. Only the creature viewer: close it, back to the codex under it.
// The pause menu open: Continue (as release 125). In play: open the pause menu.
function backPressed(){
  if(glimpseRun)return;
  const viewer=$("#creatureViewer");if(viewer?.open){viewer.close();return}
  const open=[panel,atlas,journal,optionsPanel].filter((d)=>d.open);
  if(open.length){overlayPause=false;for(const d of open)d.close();pause(true);return}
  if(pausePanel.open){resume();return}
  pause(true);
}
for(const d of [panel,atlas,journal,optionsPanel,pausePanel,$("#creatureViewer")])d?.addEventListener("cancel",(event)=>{event.preventDefault();backPressed()}); // release 291: the pause menu too (back on it resumes; before, the dialog closed and play stayed frozen)
const backGuard=()=>{try{history.pushState({icBack:true},"")}catch{}};
if(!history.state?.icBack)backGuard();
// Release 291 (Tim: the back button "should open that pause menu... hit back again... unpause"): Chrome skips history
// entries made without a user gesture when the back button is pressed, so the guard made at load could be passed over and
// back left the app. The first touch or key arms a fresh guard that counts.
{let armed=false;const arm=()=>{if(armed)return;armed=true;backGuard();removeEventListener("pointerdown",arm,true);removeEventListener("keydown",arm,true)};addEventListener("pointerdown",arm,true);addEventListener("keydown",arm,true)}
addEventListener("popstate",()=>{backPressed();backGuard()});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    overlayPause = false;
    pause(false);
  }
  else if (game.paused && !pausePanel.open && !glimpseRun) pausePanel.showModal();
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
requestAnimationFrame(frame);
function viewportReward(q){const bits=[];if(q.reward?.marks)bits.push(`${q.reward.marks} marks`);if(q.reward?.weaponSphere)bits.push(`${q.reward.weaponSphere} weapon sphere`);if(q.reward?.armorSphere)bits.push(`${q.reward.armorSphere} armor sphere`);if(q.reward?.draughts)bits.push(`${q.reward.draughts} draughts`);return bits.join(' · ')||'field knowledge'}
function openViewport(){pauseForOverlay();if(pausePanel.open)pausePanel.close();const viewport=ensureViewportState(save);viewport.read=true;body.replaceChildren();const heading=document.createElement('h2'),intro=document.createElement('p');heading.textContent='Viewport';intro.textContent='Viewport gathers what the Corridor permits Ember to see. Some reports are clear. Others become legible only through travel.';body.append(heading,intro);
 const groups=[['active','Active hunt'],['available','Hunts & emerging threats'],['dormant','Resting in the rotation'],['recent','Recent arrivals'],['archive','Completed records']];
 for(const[group,label]of groups){const title=document.createElement('h3');title.textContent=label;body.append(title);let entries=[];if(group==='active')entries=Object.values(viewport.contracts).filter(q=>['accepted','tracking','target-located'].includes(q.status));else if(group==='available')entries=Object.values(viewport.contracts).filter(q=>['available','deferred'].includes(q.status));else if(group==='dormant')entries=Object.values(viewport.contracts).filter(q=>q.status==='dormant');else if(group==='recent')entries=viewport.recent;else entries=Object.values(viewport.contracts).filter(q=>['completed','archived'].includes(q.status));if(!entries.length){const empty=document.createElement('p');empty.className='viewport-empty';empty.textContent=group==='recent'?'Nothing meaningful has entered the record yet.':'No records in this section.';body.append(empty);continue}
  for(const q of entries){const card=document.createElement('article'),name=document.createElement('h3'),text=document.createElement('p'),meta=document.createElement('small'),actions=document.createElement('div');card.className='item viewport-card';name.textContent=q.title||q.id;text.textContent=q.text||q.summary||'The record remains incomplete.';meta.textContent=`${q.kind||'record'} · ${q.status||'recorded'}${q.target?` · ${q.target.rx},${q.target.ry}`:''}${q.reward?` · ${viewportReward(q)}`:''}`;actions.className='viewport-actions';if(['available','deferred'].includes(q.status)){actions.append(uiButton('Accept hunt',()=>{const r=acceptViewportHunt(save,q.id,{avoid:(x,y)=>game.huntSiteAvoided(x,y)});/* release 557: off explored ground */if(q.kind==='tracking'){save.narrative.facts['leads.active']=true}navigationCache.key=null;game.message=r.message;persist();openViewport()}));actions.append(uiButton('Archive',()=>{archiveViewportHunt(save,q.id);navigationCache.key=null;persist();openViewport()}))}else if(['accepted','tracking','target-located'].includes(q.status)){actions.append(uiButton('Guidance active',()=>{save.viewport.activeHuntId=q.id;navigationCache.key=null;game.message=`${q.title} is now shown by the violet guidance arrow.`;persist();openViewport()}),uiButton('Defer',()=>{deferViewportHunt(save,q.id);navigationCache.key=null;persist();openViewport()}))}else if((q.kind==='trial'||q.foundry)&&q.status==='completed'&&!q.decision){/* release 134: the decision now really admits the lifeform (Viewport bestiary) */for(const[d,l]of[['corridor','Let it enter the Corridor'],['rare','Let it roam, but rarely'],['dungeon','Reserve for dungeons'],...(q.kind==='trial'?[['rework','Rework and return later']]:[]),['archive','Archive']])actions.append(uiButton(l,()=>{if(q.kind==='trial')foundryTrialDecision(save,q.id,d);if(d!=='rework'){q.status='completed';foundryAdmission(save,q.id,d)}persist();openViewport()}))}else if(q.decision&&q.foundry||q.kind==='trial'&&q.decision){const done=document.createElement('p');done.className='viewport-empty';done.textContent={corridor:'Admitted: it now roams the Corridor.',rare:'Admitted: it roams, rarely.',dungeon:'Admitted to the dungeons.',archive:'Archived.',rework:'Set aside for rework.'}[q.decision]||'';actions.append(done)}card.append(name,text,meta,actions);body.append(card)}
 }
 body.append(uiButton('Return to world',resume));if(!panel.open)panel.showModal();}
// ---------------------------------------------------------------- the Arcanum (release 109)
// One place for spells, the Aperture Constellation, Glyphs and Echoes (Tim, 2026-10-16), styled understated at his
// request. Tabs share one shell; nodes, sockets and tiles are tapped instead of picked from lists.
// Game rules are unchanged and live in constellation.ts, glyphs.ts and echoes.ts.
let spellPathScroll=0; // release 497: the spell row's sideways scroll
const ARCANUM_TABS=[['constellation','Spells & Constellation'],['glyphs','Glyphs'],['echoes','Echoes'],['lattice','Transit Lattice']];
let arcanumFocus=null,arcanumSocket=null,arcanumAtShrine=false;
function el(tag,cls,text){ // small DOM helper for the Arcanum
 const q=document.createElement(tag);if(cls)q.className=cls;if(text!==undefined)q.textContent=text;return q}
function arcanumShell(tab,title,subtitle){pauseForOverlay();if(pausePanel.open)pausePanel.close();body.replaceChildren(packTabBar('arcanum'));
 const h=el('h2','',title),sub=el('p','',subtitle),tabs=el('div','codex-tabs arc-subtabs');
 for(const[id,label]of ARCANUM_TABS){const b=uiButton(label,()=>({constellation:()=>openSkills(arcanumAtShrine),glyphs:openGlyphs,echoes:openEchoes,lattice:openLattice})[id]());if(id===tab)b.setAttribute('aria-current','page');tabs.append(b)}
 body.append(h,sub,tabs);if(!panel.open)panel.showModal()}
function arcanumFooter(){const f=el('footer','arc-foot');f.append(uiButton('Sphere forge',openForge),uiButton('Pack',openPack),uiButton('Return to world',resume));body.append(f)}
// Release 157: element badges and Active/Passive tags so it is clear what each entry is and what it touches.
function elemBadge(attr){const a=ATTRIBUTES[attr],b=el('span','arc-elem',`${a.icon} ${a.name}`);b.style.setProperty('--elem',a.color);return b}
function kindTag(text,active){return el('span',`arc-kind ${active?'active':'passive'}`,text)}
function nodeKind(n,skill){if(n.id==='active')return['Active · cast it from slot A or B',true];const k=n.alt?ALT_PASSIVES[n.ref]?.kind:NODE_EFFECTS[n.ref||n.id]?.kind;return k==='cast'?['Active · a new ability for slot A or B',true]:k==='always'?['Passive · always on',false]:k==='changes'?[`Passive · changes how ${skill.name} works`,false]:[`Passive · works while ${skill.name} is active`,false]}
// Constellation: each branch is a path of glowing nodes — the active (with rank pips), its modifier, then two capstones.
function openSkills(atShrine=false){arcanumAtShrine=atShrine;const value=save.perception?.aperture||0,free=pointsFree(save);
 arcanumShell('constellation',`Spells & Constellation`,`${free} point${free===1?'':'s'} free · Aperture ${value} (${apertureBand(value).name}), one point per ${POINT_EVERY}${save.constellation.bonus?`, ${save.constellation.bonus} kept from before`:''}. Ranks and modifiers cost 1, capstones 2; a mastered branch can take both. Tap an entry to read it.${atShrine?' This shrine can reset everything.':' Respec at a shrine.'}`);
 const sky=el('div','arc-sky');ensureSlots(save);
 {const key=el('section','arc-key');key.append(el('p','','Elements:'));for(const a of Object.keys(ATTRIBUTES))key.append(elemBadge(a));key.append(el('p','',''),kindTag('⚡ Active',true),el('span','',' you cast it from slot A or B, then it recovers. '),kindTag('Passive',false),el('span','',' works by itself once learned: always, or while its discipline is active.'));sky.append(key)}
 const inSlot=(key)=>['a','b'].find(q=>save.magicSkills.slots[q]===key),slotButtons=(key,after)=>[...['a','b'].map(q=>{const here=save.magicSkills.slots[q]===key,b=uiButton(here?`In slot ${q.toUpperCase()}`:`Set in ${q.toUpperCase()}`,()=>{const r=setSlot(save,q,key);game.message=r.message;persist();after();openSkills(atShrine)});if(here)b.disabled=true;return b}),
   (()=>{const i=save.magicSkills.preset||0,here=presetButton(save,i).button===key,b=uiButton(here?'On Build button':'Set on Build button',()=>{setPresetButton(save,i,key);game.message=`Preset ${i+1}: the Build button casts it.`;persist();after();openSkills(atShrine)});if(here)b.disabled=true;return b})()]; // release 309
 // Slots A and B, and the Pairing their two attributes make.
 {const box=el('section','arc-branch arc-slots');box.append(el('h3','','Spell slots'));
  // Release 261: two spell presets; the slots below belong to the active one (the HUD's preset button switches them too).
  {const row=el('div','codex-tabs arc-presets');for(let i=0;i<PRESETS;i++){const b=uiButton(`Preset ${i+1}`,()=>{if((save.magicSkills.preset||0)!==i){const r=swapPreset(save);game.message=r.message;game.refreshDerivedStats?.();/* release 541 */persist()}openSkills(atShrine)});if((save.magicSkills.preset||0)===i)b.setAttribute('aria-current','page');row.append(b)}box.append(row)
   // Release 291: each preset also sets the Build button: Build, or Item (its item is chosen in Pack → Supplies).
   for(let i=0;i<PRESETS;i++){const cur=presetButton(save,i),line=el('div','codex-tabs arc-preset-button');line.append(el('small','',`Preset ${i+1} · Build button:`));for(const mode of ['build','item']){const b=uiButton(mode==='build'?'Build':`Item${mode===cur.button&&cur.item?` (${ITEM_NAMES[cur.item]||cur.item})`:''}`,()=>{setPresetButton(save,i,mode);persist();openSkills(atShrine)});if(cur.button===mode)b.setAttribute('aria-current','true');line.append(b)}if(CASTABLES[cur.button]){const c=CASTABLES[cur.button],b=uiButton(`${c.symbol} ${c.kind==='spell'?SPELLS[c.id]?.name:APERTURE_SKILLS[c.id]?.name}`,()=>{});b.setAttribute('aria-current','true');line.append(b)}box.append(line)}}
  for(const q of ['a','b']){const c=slotted(save,q),t=!c&&slotTool(save,q),row=el('div','arc-slot');const sym=el('span','slot-sym',c?c.symbol:t?.tool==='build'?'⚒':t?'◇':'+');sym.style.color=c?c.color:'';row.append(el('strong','',q.toUpperCase()),sym,el('span','',c?c.name:t?(t.tool==='build'?'Build':`Item${t.item?` (${ITEM_NAMES[t.item]||t.item})`:' (choose it in Supplies)'}`):'Empty — choose below'));if(c)row.append(elemBadge(c.attr));
   // Release 309 (Tim: "you can put build in any one of those three available slots"): Build or the preset's item in A or B.
   for(const tool of ['build','item']){const b=uiButton(tool==='build'?'Build':'Item',()=>{const r=setSlot(save,q,t?.tool===tool?null:tool);game.message=r.message;persist();openSkills(atShrine)});if(t?.tool===tool)b.setAttribute('aria-current','true');row.append(b)}
   if(c||t){const clear=uiButton('Clear',()=>{const r=setSlot(save,q,null);game.message=r.message;persist();openSkills(atShrine)});row.append(clear)}box.append(row)}
  const pr=activePairing(save);box.append(el('p','',pr?`Pairing: ${pr.name} — ${pr.text}`:'Fill both slots: their two attributes form a Pairing, a small bonus while both stay set.'));
  sky.append(box)}
 // The spell branch: the cast-button spell, with its glyph sockets.
 {const card=el('section','arc-branch spells');card.dataset.branch='spells';const head=el('header','arc-branch-head');head.append(el('h3','','Spells'),kindTag('Active',true));
  const path=el('div','arc-path spell-path'),detail=el('div','arc-detail'),focus=arcanumFocus?.branch==='spells'?SPELLS[arcanumFocus.node]:null,show=focus||SPELLS[presetCastables().find(c=>c.kind==='spell')?.id]||SPELLS[save.equippedSpell||'ember-ring']; /* release 335: the active preset's spell */
  for(const sp of Object.values(SPELLS)){const on=!!inSlot(`spell:${sp.id}`),row=el('button',`arc-node core ${on?'owned':spellOpen(save,sp.id)?'ready':'locked'}${focus===sp?' focus':''}`),n=row;row.type='button';row.dataset.slot='spell';const attr=CASTABLES[`spell:${sp.id}`]?.attr||'fire',orb=el('span','arc-node-orb',CASTABLES[`spell:${sp.id}`]?.symbol||'✶');orb.style.color=ATTRIBUTES[attr].color;n.append(orb,el('span','arc-node-name',`${sp.name} ${ATTRIBUTES[attr].icon}`),el('span','arc-sockets-mini',(save.spellGlyphs?.[sp.id]||[null,null]).map(g=>g?GLYPHS[g].sigil:'○').join(' ')));n.onclick=()=>{arcanumFocus={branch:'spells',node:sp.id};openSkills(atShrine)};path.append(n)}
  // Release 497 (Tim: "the spells have become... clumped together... they should just become a scrollable line where you can
  // just scroll left or right"): one row of full-width cards that scrolls sideways; where you left it survives a tap's redraw.
  path.onscroll=()=>{spellPathScroll=path.scrollLeft};requestAnimationFrame(()=>{path.scrollLeft=spellPathScroll});
  const sockets=(save.spellGlyphs?.[show.id]||[]).filter(Boolean).map(g=>`${GLYPHS[g].sigil} ${GLYPHS[g].name}`);
  {const tags=el('div','arc-tags');tags.append(elemBadge(CASTABLES[`spell:${show.id}`]?.attr||'fire'),kindTag('Active spell',true));detail.append(el('strong','',show.name),tags)}
  if(show.text)detail.append(el('p','',show.text)); // release 365
  detail.append(el('p','',show.brawler?`${show.cooldown}s cooldown · a brawler spell: its damage follows your melee damage, and it aims like a swing. Glyphs: ${sockets.length?sockets.join(', '):'none set (Glyphs tab)'}.`:show.id==='shadow-clone'?`${show.cooldown}s cooldown · lasts ${show.lifetime}s · hold to send it up to ${show.maxRange} tiles away · copies your blows at half damage.`:`${show.cooldown}s cooldown · power ${show.damage} · reach ${show.maxRange} · radius ${show.radius}. Glyphs: ${sockets.length?sockets.join(', '):'none set (Glyphs tab)'}.`));
  // What changes your spells: Focus, the Pairing, and the few constellation nodes that reach them (NODE_EFFECTS.spells).
  {const boosts=[`Focus ${save.stats?.Focus||1}: +${characterStats(save).magicBonus} spell damage`],pr=activePairing(save);if(pr&&(pr.mods.spellDamage||pr.mods.cooldown))boosts.push(`Pairing ${pr.name}: ${pr.text}`);
   for(const bid of BRANCH_IDS){const b=BRANCHES[bid];for(const node of[b.mod,...b.caps]){const fx=NODE_EFFECTS[node.id];if(fx?.spells)boosts.push(`${node.name} (${b.name}, ${hasNode(save,node.id)?'learned':'not learned'}): ${fx.spells} Only while ${APERTURE_SKILLS[b.active].name} is active.`)}}
   const list=el('ul','arc-boosts');for(const t of boosts)list.append(el('li','',t));detail.append(el('small','arc-hint','What affects your spells:'),list,el('small','arc-hint','Other constellation entries change their own discipline, not your spells.'))}
  if(spellOpen(save,show.id))detail.append(...slotButtons(`spell:${show.id}`,()=>{arcanumFocus={branch:'spells',node:show.id}}));else detail.append(el('small','arc-why',`Opens at the ${APERTURE_BANDS[show.unlockTier].name} band of the Aperture.`)); // release 365
  card.append(head,path,detail);sky.append(card)}
 for(const bid of BRANCH_IDS){const b=BRANCHES[bid],skill=APERTURE_SKILLS[b.active],rank=skillRank(save,skill.id),modOn=!!save.constellation.mods[b.mod.id],caps=branchCaps(save,bid),mastered=rank>=skill.maxRank,open=value>=skill.threshold;
  const card=el('section','arc-branch'+(open?'':' sealed'));card.dataset.branch=bid;
  const attr=CASTABLES[`skill:${skill.id}`]?.attr,head=el('header','arc-branch-head'),slotOf=inSlot(`skill:${skill.id}`)||(bid==='motion'?inSlot('skill:aerial-step'):null),bound=!!slotOf;if(attr){card.dataset.elem=attr;card.style.setProperty('--elem',ATTRIBUTES[attr].color)}head.append(el('h3','',b.name),...(attr?[elemBadge(attr)]:[]),el('span','arc-branch-state',`${bound?`◉ Slot ${slotOf.toUpperCase()} · `:''}${!open?`Opens at Aperture ${skill.threshold}`:caps.length===2?'Fully crowned':mastered?'Mastered':`${rank}/${skill.maxRank}`}`));if(bound)card.classList.add('bound');
  const path=el('div','arc-path'),detail=el('div','arc-detail');
  const nodes=[{id:'active',name:skill.name,text:skill.description,state:rank>=skill.maxRank?'owned':rank>0?'partial':open?'ready':'locked',pips:[rank,skill.maxRank],cost:1,can:open&&rank<skill.maxRank,act:()=>learnRank(save,bid),verb:`Learn rank ${rank+1}`},
   {id:'mod',ref:b.mod.id,name:b.mod.name,text:b.mod.text,state:modOn?'owned':rank>0?'ready':'locked',cost:1,can:rank>0&&!modOn,act:()=>learnMod(save,bid),verb:'Learn'},
   ...b.caps.map(c=>({id:c.id,ref:c.id,cap:true,name:c.name,text:c.text,state:caps.includes(c.id)?'owned':modOn&&mastered?'ready':'locked',cost:2,can:modOn&&mastered&&!caps.includes(c.id),act:()=>chooseCap(save,bid,c.id),verb:'Crown with'}))];
  // Release 359: a passive whose secondary form is chosen shows that form (name, text and kind).
  for(const n of nodes)if(n.ref&&altChosen(save,n.ref)){const A=ALT_PASSIVES[n.ref];Object.assign(n,{primaryName:n.name,primaryText:n.text,name:`${A.name} ⇄`,text:A.text,alt:true})}
  const focus=arcanumFocus?.branch===bid?nodes.find(n=>n.id===arcanumFocus.node):null;
  nodes.forEach((n,i)=>{if(i===1||i===2)path.append(el('i','arc-link'+(n.state!=='locked'?' lit':'')));if(i===2)path.append(el('div','arc-caps'));
   const node=el('button',`arc-node ${n.cap?'cap':i===0?'core':'mod'} ${n.state}${focus===n?' focus':''}`);node.type='button';node.setAttribute('aria-label',`${n.name}: ${n.state}`);
   const orb=el('span','arc-node-orb',n.cap?'✦':i===0?'✶':'◆');if(attr&&n.state!=='locked')orb.style.color=ATTRIBUTES[attr].color;node.append(orb,el('span','arc-node-name',`${n.name}${nodeKind(n,skill)[1]?' ⚡':''}`));
   if(n.pips){const pips=el('span','arc-pips');for(let k=0;k<n.pips[1];k++)pips.append(el('i',k<n.pips[0]?'on':''));node.append(pips)}
   node.onclick=()=>{arcanumFocus={branch:bid,node:n.id};openSkills(atShrine)};(i>=2?path.lastElementChild:path).append(node)});
  const show=focus||nodes.find(n=>n.can)||nodes[0];
  {const[label,active]=nodeKind(show,skill),tags=el('div','arc-tags');if(attr)tags.append(elemBadge(attr));tags.append(kindTag(label,active));detail.append(el('strong','',show.name),tags,el('p','',show.text));if(NODE_EFFECTS[show.ref]?.spells)detail.append(el('small','arc-hint',`Also affects your spells: ${NODE_EFFECTS[show.ref].spells}`))}
  // Release 359: the other form of a passive, and the button that swaps them (from Infinite III, once learned).
  if(show.ref&&ALT_PASSIVES[show.ref]){const A=ALT_PASSIVES[show.ref],learned=show.state==='owned',open=altUnlocked(save),other=show.alt?{name:show.primaryName,text:show.primaryText,label:'Primary'}:{name:A.name,text:A.text,label:'Secondary'};
   const box=el('div','arc-alt');box.append(el('small','arc-hint',`${show.alt?'Secondary form in use.':'Primary form in use.'} ${other.label} form: ${other.name} — ${other.text}`));
   const swap=uiButton(`⇄ Use ${other.label.toLowerCase()}: ${other.name}`,()=>{const r=toggleAlt(save,show.ref);game.message=r.message;syncCharacterStats(save);persist();arcanumFocus={branch:bid,node:show.id};openSkills(atShrine)});
   if(!open||!learned){swap.disabled=true;swap.title=!open?`Opens at the ${APERTURE_BANDS[ALT_UNLOCK_TIER].name} band of the Aperture.`:'Learn it first.'}box.append(swap);if(!open)box.append(el('small','arc-why',`Secondary forms open at the ${APERTURE_BANDS[ALT_UNLOCK_TIER].name} band of the Aperture.`));detail.append(box)}
  if(show.can){const go=uiButton(`${show.verb} · ${show.cost} pt${show.cost>1?'s':''}`,()=>{const r=show.act();game.message=r.message;persist();arcanumFocus={branch:bid,node:show.id};openSkills(atShrine)});go.className='arc-go';detail.append(go)}
  // A learned discipline (or Aerial Step, a castable capstone) can go in slot A or B.
  const castId=show.id==='active'&&rank>0?skill.id:show.id==='aerial-step'&&caps.includes('aerial-step')&&!show.alt?'aerial-step':null;
  if(castId)detail.append(...slotButtons(`skill:${castId}`,()=>{arcanumFocus={branch:bid,node:show.id}}));
  if(!show.can&&show.state==='locked')detail.append(el('small','arc-why',show.cap?(modOn?`Master ${skill.name} (${skill.maxRank} ranks) first.`:`Take ${b.mod.name} and master ${skill.name} first.`):show.id==='mod'?`Learn ${skill.name} first.`:`Opens at Aperture ${skill.threshold}.`));
  card.append(head,path,detail);sky.append(card)}
 body.append(sky);
 const seen=Object.keys(PAIRINGS).filter(k=>save.magicSkills.pairingsSeen?.[k]);body.append(el('h3','',`Pairings · ${seen.length} of ${Object.keys(PAIRINGS).length} found`));
 for(const k of Object.keys(PAIRINGS)){if(!seen.includes(k))continue;const p=PAIRINGS[k],[x,y]=k.split('+');body.append(el('p','arc-pairing',`${p.name} (${ATTRIBUTES[x].name} + ${ATTRIBUTES[y].name}) — ${p.text}`))}
 if(seen.length<Object.keys(PAIRINGS).length)body.append(el('p','arc-why','Set two castables of different (or matching) attributes in A and B to find more.'));
 if(atShrine){const r=uiButton(`Respec everything · ${respecCost(save)} lumen dust (you have ${save.materials.lumenDust||0})`,()=>{const q=respec(save);game.message=q.message;persist();openSkills(true)});r.className='arc-respec';body.append(r)}
 arcanumFooter()}
// Release 295: armor glyphs change health and stamina, so the Wayfarer's maxima follow them at once.
// Release 335 (Tim: "the arcanum... glyphs that appear don't reflect the... spells that are actively selected for that preset"):
// what the active preset casts: slots A and B, then a castable bound to its Build button.
function presetCastables(){const b=presetButton(save).button;return[...new Set([slotted(save,'a'),slotted(save,'b'),CASTABLES[b]||null].filter(Boolean))]}
function syncArmorGlyphs(){syncCharacterStats(save);game.player.maxStamina=save.maxStamina;game.player.hp=Math.min(game.player.hp,save.maxHp);game.sync?.()}
// Glyphs: tap a socket, then tap a glyph tile to set it; resonating pairs glow.
function openGlyphs(){arcanumShell('glyphs','Glyphs & Resonances',`Glyph dust ${save.glyphDust||0}. Tap a socket, then a glyph to set it. The same glyph acts differently in a weapon, a tool, a spell, an Aperture skill or armor (armor glyphs give steady bonuses); two in one host can wake a Resonance. Glyphs always come back out intact.`);
 // one spell host per slotted spell (release 113); describeHost reads the readied spell, so it is set per host below
 const slotSpells=[...new Set(presetCastables().filter(c=>c.kind==='spell').map(c=>c.id))],spellIds=slotSpells,readied=save.equippedSpell; // release 335: only the active preset's spells (A, B and its Build button); none when it holds none
 for(const id of spellIds)save.spellGlyphs[id]||=Array(SPELL_SOCKETS).fill(null);
 // Release 297: an Aperture skill slotted in A or B has its own two sockets (glyphs.ts SKILL_GLYPHS).
 const slotSkills=[...new Set(presetCastables().filter(c=>c.kind==='skill').map(c=>c.id))];for(const id of slotSkills)save.spellGlyphs[`skill:${id}`]||=Array(SPELL_SOCKETS).fill(null);
 const hosts=[['melee','Primary',save.equipment.primary,save.equipment.primary?.glyphs],['tool','Tool',save.equipment.secondary,save.equipment.secondary?.glyphs],['armor','Armor',save.equipment.armor,save.equipment.armor?.glyphs],...spellIds.map(id=>[`spell:${id}`,'Spell',SPELLS[id],save.spellGlyphs[id]]),...slotSkills.map(id=>[`skill:${id}`,'Skill',APERTURE_SKILLS[id],save.spellGlyphs[`skill:${id}`]])];
 const altar=el('div','arc-altar');
 for(const[host,label,item,sockets]of hosts){const isSpell=host.startsWith('spell:');if(isSpell)save.equippedSpell=host.slice(6);const isSkill=host.startsWith('skill:'),d=isSkill?{glyphs:(sockets||[]).filter(Boolean).map(id=>({id,name:GLYPHS[id].name,text:GLYPHS[id].text.skill})),resonances:[]}:sockets?.length?describeHost(save,isSpell?'spell':host):{glyphs:[],resonances:[]};save.equippedSpell=readied;const lit=d.resonances.length>0,card=el('section','arc-host'+(lit?' resonant':''));
  card.append(el('small','arc-host-label',label),el('strong','',item?.name||'Nothing equipped'));
  const ring=el('div','arc-socket-row');
  if(!sockets?.length)ring.append(el('span','arc-empty',item?'No sockets.':'Equip one to set glyphs.'));
  else sockets.forEach((g,i)=>{const sel=arcanumSocket&&arcanumSocket.host===host&&arcanumSocket.index===i,b=el('button','arc-socket'+(g?' filled':'')+(sel?' focus':''),g?GLYPHS[g].sigil:'');b.type='button';if(g)b.style.setProperty('--glyph',GLYPHS[g].color);b.setAttribute('aria-label',`${label} socket ${i+1}: ${g?GLYPHS[g].name:'empty'}`);b.onclick=()=>{arcanumSocket=sel?null:{host,index:i};openGlyphs()};ring.append(b)});
  card.append(ring);
  if(LAYOUT_HOSTS.includes(host)&&sockets?.length){const row=el('div','arc-layout');row.append(uiButton('Save layout',()=>{const r=saveGlyphLayout(save,host);game.message=r.message;persist();openGlyphs()}));if(save.glyphLayouts?.[host])row.append(uiButton('Apply saved layout',()=>{const r=applyGlyphLayout(save,host);game.message=r.message;if(host==='armor')syncArmorGlyphs();persist();openGlyphs()}));card.append(row)} // release 295
  for(const q of d.glyphs)card.append(el('p','arc-glyph-line',`${GLYPHS[q.id].sigil} ${q.name}: ${q.text}`));
  for(const r of d.resonances)card.append(el('p','arc-reso-line',save.glyphCodex.resonances[r.id]?`✦ ${r.name}: ${r.text}`:'✦ These glyphs hum together. Use them to learn what they make.'));
  altar.append(card)}
 body.append(altar);
 const target=arcanumSocket,hostKey=target?(target.host.startsWith('spell:')?target.host.slice(6):target.host):null,current=target?hosts.find(h=>h[0]===target.host)?.[3]?.[target.index]:null;
 const hint=el('p','arc-hint',target?`Choose a glyph for the ${target.host==='melee'?'primary':target.host==='armor'?'armor':target.host.startsWith('spell:')?SPELLS[target.host.slice(6)].name:target.host.startsWith('skill:')?APERTURE_SKILLS[target.host.slice(6)]?.name||'skill':target.host} socket ${target.index+1}${current?`, or clear ${GLYPHS[current].name}`:''}.`:'Tap a socket above to start setting glyphs.');body.append(hint);
 if(target&&current){const clear=uiButton(`Clear ${GLYPHS[current].name}`,()=>{const r=socketGlyph(save,hostKey,target.index,null);game.message=r.message;if(hostKey==='armor')syncArmorGlyphs();persist();openGlyphs()});clear.className='arc-go';body.append(clear)}
 const pouch=el('div','arc-tiles');
 for(const id of GLYPH_IDS){const known=save.glyphCodex.glyphs[id],n=save.glyphs[id]||0,t=el('div','arc-tile'+(known?'':' unknown')+(target&&known&&n>0?' pickable':''));t.style.setProperty('--glyph',GLYPHS[id].color);
  t.append(el('span','arc-tile-sigil',known?GLYPHS[id].sigil:'?'),el('strong','',known?GLYPHS[id].name:'Unknown'),el('small','',known?`×${n}`:'Find one to learn it'));
  if(known){const more=el('details','arc-tile-more'),sum=el('summary','','Effects');more.append(sum,el('p','',`Weapon: ${GLYPHS[id].text.melee}`),el('p','',`Tool: ${GLYPHS[id].text.tool}`),el('p','',`Spell: ${GLYPHS[id].text.spell}`),el('p','',`Armor: ${GLYPHS[id].text.armor}`),el('p','',`Skill: ${GLYPHS[id].text.skill}`));const ins=uiButton(`Inscribe · ${DUST_PER_GLYPH} dust`,()=>{const r=craftGlyph(save,id);game.message=r.message;persist();openGlyphs()});more.append(ins);t.append(more)}
  if(target&&known&&n>0){const set=uiButton('Set here',()=>{const r=socketGlyph(save,hostKey,target.index,id);game.message=r.message;if(hostKey==='armor')syncArmorGlyphs();persist();arcanumSocket=null;openGlyphs()});set.className='arc-go';t.append(set)}
  pouch.append(t)}
 body.append(el('h3','','Glyph pouch'),pouch);
 const found=Object.keys(RESONANCES).filter(id=>save.glyphCodex.resonances[id]);body.append(el('h3','',`Resonances · ${found.length} of ${Object.keys(RESONANCES).length}`));
 const rs=el('div','arc-resos');for(const[id,r]of Object.entries(RESONANCES)){const k=save.glyphCodex.resonances[id],q=el('div','arc-reso'+(k?' known':''));q.append(el('strong','',k?`✦ ${r.name}`:'✧ Undiscovered'),el('small','',k?`${GLYPHS[r.pair[0]].sigil} ${GLYPHS[r.pair[0]].name} + ${GLYPHS[r.pair[1]].sigil} ${GLYPHS[r.pair[1]].name} — ${r.text}`:'Pair glyphs in one host and use it to find out.'));rs.append(q)}
 body.append(rs);
 // Release 529: triads, three different glyphs in one host (armor resonates only through these).
 {const tf=Object.keys(TRIADS).filter(id=>save.glyphCodex.resonances[id]);body.append(el('h3','',`Triads · ${tf.length} of ${Object.keys(TRIADS).length}`));const ts=el('div','arc-resos');for(const[id,r]of Object.entries(TRIADS)){const k=save.glyphCodex.resonances[id],q=el('div','arc-reso'+(k?' known':''));q.append(el('strong','',k?`✦ ${r.name}`:'✧ Undiscovered'),el('small','',k?`${r.pair.map(g=>`${GLYPHS[g].sigil} ${GLYPHS[g].name}`).join(' + ')} — ${r.text} In armor: ${r.armorText}`:'Set three different glyphs in one three-socket weapon, tool or armor and use it to find out.'));ts.append(q)}body.append(ts)}
 arcanumFooter()}
// Creature Echoes (release 99): defeated creatures' signature moves set into three notches.
function openEchoes(){const used=notchesUsed(save.echoes.equipped);
 arcanumShell('echoes',`Creature Echoes`,`${used} of ${NOTCHES} notches set. An Echo is a defeated creature’s signature move, carried in you; it triggers on your own dodges, jumps, kills, wounds, casts and shots. Guardians always leave theirs.`);
 body.append(el('p','arc-notches',`Notches ${'◆'.repeat(used)}${'◇'.repeat(Math.max(0,NOTCHES-used))}`));
 const grid=el('div','arc-grid');
 for(const id of ECHO_IDS){const e=ECHOES[id],owned=save.echoes.owned[id],on=save.echoes.equipped.includes(id),creature=MONSTER_PACK[id]?.name||id,c=el(owned?'button':'div','arc-card echo-card'+(on?' on':'')+(owned?'':' unknown'));if(owned)c.type='button';
  c.append(el('span','arc-card-sigil','◆'.repeat(e.cost)),el('strong','',owned?e.name:'Unknown Echo'),el('small','',owned?`${creature} — ${e.text}`:`Defeat a ${creature} to take it.`));
  if(owned){c.append(el('em','arc-state',on?'Set — tap to set aside':`Tap to set · ${e.cost} notch${e.cost===1?'':'es'}`));c.onclick=()=>{const r=toggleEcho(save,id);game.message=r.message;persist();openEchoes()}}
  grid.append(c)}
 body.append(grid);arcanumFooter()}
// Release 363: the Transit Lattice. Passive forms and Echoes drawn in from other histories hold here beyond the usual rules.
// Release 575 (Tim: "split it up a little bit... passives based on the skill that they benefit... force channel... quickening...
// all the passives that are associated with that specific skill can just be underneath it... click on it... expand... the all
// view... the passive tab... echoes could be a separate subtab... these are just the passes for spells... skills... general"):
// three views. Passives: the passive slots, then the choices folded by what they serve (each skill's modifier and capstones in
// both forms, then Spells, Tools and General: what is always on), each fold saying how many of its passives are set. Echoes:
// the Echo slots and Echoes. All: everything in one list, as before.
const LATTICE_VIEWS=[['passives','Passives'],['echoes','Echoes'],['all','All']],latticeFolds=new Set();let latticeView='passives';
function openLattice(view=latticeView){latticeView=view;const L=ensureLattice(save),open=latticeOpen(save),cost=nextSlotCost(save);
 arcanumShell('lattice','Transit Lattice',`${L.coordinates} Transit Coordinate${L.coordinates===1?'':'s'} held. A fallen Listener pays its Gate: one coordinate for each piece it needed, and one for the Listener.`);
 body.append(el('p','arc-lore',LATTICE_LORE));
 if(!open){body.append(el('p','arc-why',latticeWhy(save)));arcanumFooter();return}
 const views=el('div','codex-tabs arc-subtabs lattice-views');for(const[id,label]of LATTICE_VIEWS){const b=uiButton(label,()=>openLattice(id));if(id===view)b.setAttribute('aria-current','page');views.append(b)}body.append(views);
 const held=latticePassives(save),echoes=latticeEchoes(save),rerun=(r)=>{game.message=r.message;syncCharacterStats(save);persist();openLattice()};
 const passiveCard=(key,showUnknown)=>{const field=String(key).startsWith('field:'),f=field?fieldForm(key):passiveForm(key),on=held.includes(key);if(!f)return null;const known=field||hasNode(save,f.id);if(!known&&!showUnknown)return null;
  const working=!field&&f.alt===altChosen(save,f.id),c=el('button','arc-card'+(on?' on':'')+(known?'':' unknown'));c.type='button';
  c.append(el('strong','',field?`${f.name} · only in the Lattice`:`${f.name}${f.alt?' · secondary':' · primary'}`),el('small','',f.text),el('em','arc-state',!known?'Learn it in the constellation first':on?'In the Lattice — tap to clear':working?'Already working (your chosen form)':'Tap to draw it in'));
  if(!known||(working&&!on))c.disabled=true;c.onclick=()=>rerun(toggleLatticePassive(save,key));return c};
 const echoCard=(id)=>{const e=ECHOES[id],on=echoes.includes(id),notched=save.echoes.equipped.includes(id),c=el('button','arc-card echo-card'+(on?' on':''));c.type='button';c.append(el('strong','',e.name),el('small','',e.text),el('em','arc-state',on?'In the Lattice — tap to clear':notched?'Already set in your notches':'Tap to draw it in (no notches used)'));if(notched&&!on)c.disabled=true;c.onclick=()=>rerun(toggleLatticeEcho(save,id));return c};
 const slotsBox=(kind)=>{const slots=latticeSlots(save,kind),set=kind==='echo'?echoes:held,box=el('section','arc-branch arc-lattice');box.append(el('h3','',kind==='echo'?`Echo slots · ${set.length}/${slots}`:`Passive slots · ${set.length}/${slots}`));
  for(let i=0;i<slots;i++){const key=set[i],row=el('div','arc-slot');if(key){const f=kind==='echo'?{name:ECHOES[key]?.name,text:ECHOES[key]?.text}:passiveForm(key);row.append(el('strong','',`◈ ${f?.name||key}${kind==='passive'&&f?.alt?' (secondary)':''}`),el('small','',` ${f?.text||''} `),uiButton('Clear',()=>rerun(kind==='echo'?toggleLatticeEcho(save,key):toggleLatticePassive(save,key))))}else row.append(el('span','','◇ Empty'));box.append(row)}
  if(L.extra[kind]<TRANSIT_LATTICE.extra[kind]){const b=uiButton(cost===null?'No more slots':`Unlock another ${kind==='echo'?'Echo':'passive'} slot · ${cost} coordinates`,()=>rerun(unlockSlot(save,kind)));if(cost===null||L.coordinates<cost){b.disabled=true;b.title=`${L.coordinates} held`}box.append(b)}
  return box};
 const echoChoices=(box)=>{const choices=el('div','arc-grid');for(const id of ECHO_IDS)if(save.echoes.owned[id])choices.append(echoCard(id));if(!choices.children.length)box.append(el('small','arc-why','Take an Echo first: guardians and great beasts leave theirs.'));box.append(choices)};
 if(view==='passives'){body.append(slotsBox('passive'));
  body.append(el('h3','lattice-head','Skills'));for(const g of latticePassiveGroups()){if(!g.skill&&!body.querySelector('.lattice-head.more'))body.append(el('h3','lattice-head more','Spells, tools and the rest'));const cards=g.keys.map((k)=>passiveCard(k,true)).filter(Boolean),set=g.keys.filter((k)=>held.includes(k)).length,known=cards.filter((c)=>!c.classList.contains('unknown')).length,d=el('details','arc-branch lattice-group'+(set?' on':''));d.dataset.group=g.id;if(latticeFolds.has(g.id))d.open=true;d.ontoggle=()=>{d.open?latticeFolds.add(g.id):latticeFolds.delete(g.id)};
   const sum=el('summary','',`${set?'◈':'◇'} ${g.title}`);sum.append(el('small','',`${g.sub?` · ${g.sub}`:''} · ${known}/${cards.length} known${set?` · ${set} set`:''}`));const grid=el('div','arc-grid');grid.append(...cards);d.append(sum,grid);body.append(d)}}
 else if(view==='echoes'){const box=slotsBox('echo');echoChoices(box);body.append(box)}
 else for(const kind of LATTICE_KINDS){const box=slotsBox(kind);if(kind==='passive'){const choices=el('div','arc-grid');for(const key of[...PASSIVE_KEYS,...FIELD_KEYS,...TOOL_FORM_KEYS]){const c=passiveCard(key,false);if(c)choices.append(c)}
   if(!choices.children.length)box.append(el('small','arc-why','Learn constellation passives first (Spells & Constellation); either form of a passive you know can be drawn in.'));box.append(choices)}else echoChoices(box);body.append(box)}
 arcanumFooter()}
// Release 395: the town smith (smithy.ts): salvage from the pack, reforge an affix, cut a socket, make a masterwork.
// Release 603 (Tim, 2026-10-31: "when you reforge it... the number should be green... if it's higher than your current value or
// red if it's lower"): the last reforge is shown as was → now, the new number green when it rose, red when it fell (the same
// affix); a different affix shows what was lost in red and what was gained in green.
export const REFORGE_COLORS={up:'#6fdc7a',down:'#ff7a72'};
function reforgeOutcome(r){if(!r?.ok||!r.before||!r.after)return null;const row=document.createElement('p'),span=(text,color)=>{const e=document.createElement('strong');e.textContent=text;if(color)e.style.color=color;return e},was=describeAffixes({affixes:[r.before]})[0],now=describeAffixes({affixes:[r.after]})[0],same=r.before.id===r.after.id,up=Number(r.after.value)>Number(r.before.value),down=Number(r.after.value)<Number(r.before.value);
 row.className='reforge-outcome';row.append('Reforged: ',span(was,same?null:REFORGE_COLORS.down),' → ',span(now,same?(up?REFORGE_COLORS.up:down?REFORGE_COLORS.down:null):REFORGE_COLORS.up),same?(up?' (higher)':down?' (lower)':' (the same)'):' (a different affix)');return row}
function openSmithy(note='',last=null){pauseForOverlay();if(pausePanel.open)pausePanel.close();body.replaceChildren();const h=document.createElement('h2'),intro=document.createElement('p');h.textContent='The Smith';intro.textContent=`${note&&!reforgeOutcome(last)?note+' ':''}Cinder Iron ${save.materials.cinderIron||0} · Lumen Dust ${save.materials.lumenDust||0} · ${save.currency||0} marks.`;body.append(h,intro);{const o=reforgeOutcome(last);if(o)body.append(o)}
 const act=(r)=>{game.message=r.message;persist();openSmithy(r.message,r)},lock=(svc)=>smithOpen(save,svc)?'':` (after ${SMITHY.unlock[svc]} Listener${SMITHY.unlock[svc]===1?'':'s'})`;
 for(const slot of ['primary','secondary','armor','charm']){const item=save.equipment[slot];if(!item)continue;const row=document.createElement('div'),t=document.createElement('strong');row.className='item';t.textContent=`${slot.toUpperCase()} · ${item.name} +${item.upgradeRank||0}${item.masterwork?' · masterwork':''}${item.extraSockets?' · +1 socket':''}`;row.append(t);
  (item.affixes||[]).forEach((a,i)=>row.append(uiButton(`Reforge ${describeAffixes({affixes:[a]})[0]} · ${SMITHY.reforge.iron} iron, ${SMITHY.reforge.marks} marks${lock('reforge')}`,()=>act(reforgeAffix(save,slot,i)))));
  if(slot!=='charm'&&!item.extraSockets)row.append(uiButton(`Add a socket · ${SMITHY.socket.iron} iron, ${SMITHY.socket.lumenDust} lumen dust${lock('socket')}`,()=>act(addSocket(save,slot))));
  if(!item.masterwork)row.append(uiButton(`Masterwork (+1 rank cap) · ${SMITHY.masterwork.iron} iron, ${SMITHY.masterwork.marks} marks${lock('masterwork')}`,()=>act(masterwork(save,slot))));body.append(row)}
 const sh=document.createElement('h3');sh.textContent='Salvage from your pack';body.append(sh);if(!(save.inventory||[]).length)body.append(Object.assign(document.createElement('p'),{textContent:'Nothing in your pack to salvage.'}));
 (save.inventory||[]).forEach((item,i)=>{const row=document.createElement('div');row.className='item';row.textContent=`${item.name} (${item.tier||'common'}) `;row.append(uiButton(`Salvage · ${SMITHY.salvage.iron[item.tier]||1} iron${lock('salvage')}`,()=>act(salvageItem(save,i))));body.append(row)});
 body.append(uiButton('Return to world',resume));if(!panel.open)panel.showModal()}
// Release 459 (marginalia.ts): a fallen Margin Warden's offer, and the Scrapbook on entering a crossing.
function marginCard(id,label,onPick){const g=MARGINALIA[id],row=document.createElement('div'),t=document.createElement('strong'),d=document.createElement('p');row.className='item';t.textContent=g.name;d.textContent=g.text;row.append(t,d,uiButton(label,onPick));return row}
function openMarginOffer(){const run=marginRun(save,game.areaId());if(!run?.offer?.length)return;pauseForOverlay();if(pausePanel.open)pausePanel.close();body.replaceChildren();const h=document.createElement('h2'),p=document.createElement('p'),found=ensureMarginalia(save).found;h.textContent='A Margin Warden falls';p.textContent='Its margin is written over with rules. Take one: it holds until you leave this crossing, and a new one goes into your Scrapbook. The crossing is calling reinforcements.';body.append(h,p);
 for(const id of run.offer)body.append(marginCard(id,found.includes(id)?'Take (in your Scrapbook)':'Take · new',()=>{game.chooseMarginaliaPage(id);persist();resume()}));if(!panel.open)panel.showModal()}
function openScrapbookPaste(){const run=marginRun(save,game.areaId()),found=ensureMarginalia(save).found;if(!run||!found.length)return;pauseForOverlay();if(pausePanel.open)pausePanel.close();body.replaceChildren();const h=document.createElement('h2'),p=document.createElement('p');h.textContent='Your Scrapbook';p.textContent=`Paste ${MARGIN_RULES.pasteSlots===1?'one page':MARGIN_RULES.pasteSlots+' pages'} into this crossing. It holds until you leave. Margin Wardens here offer more.`;body.append(h,p);
 for(const id of found)body.append(marginCard(id,'Paste in',()=>{game.pasteMarginaliaPage(id);persist();resume()}));body.append(uiButton('Go in without one',resume));if(!panel.open)panel.showModal()}
// Release 447 (meals.ts): the cook's kitchen. Pick two ingredients (the same one twice for a hearty helping), then eat.
var kitchenPick=[];
function mealLeft(m){const t=Math.ceil(m.remaining);return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`}
function openKitchen(cookId,note=''){pauseForOverlay();if(pausePanel.open)pausePanel.close();body.replaceChildren();const cook=game.map.objects.find((o)=>o.id===cookId),h=document.createElement('h2'),intro=document.createElement('p');h.textContent=`${cook?.name||'The Cook'}'s Kitchen`;
 intro.textContent=`${note?note+' ':''}Choose two things from the pantry. A meal lasts ${MEAL.seconds/60} minutes, is eaten here, and replaces the one before. You have ${save.currency||0} marks.`;body.append(h,intro);
 if(save.meal){const now=document.createElement('p');now.textContent=`Now: ${mealName(save.meal.a,save.meal.b)} · ${mealPercent(save.meal.a,save.meal.b)} · ${mealLeft(save.meal)} left.`;body.append(now)}
 const sh=document.createElement('h3');sh.textContent='The pantry';body.append(sh);
 for(const id of INGREDIENT_IDS){const g=INGREDIENTS[id],row=document.createElement('div'),n=kitchenPick.filter((k)=>k===id).length;row.className='item';row.textContent=`${g.name} · ${g.price} marks · ${g.text}${n?` · chosen${n>1?' twice':''}`:''} `;
  row.append(uiButton(kitchenPick.length<2?'Choose':'Choose instead',()=>{kitchenPick=kitchenPick.length<2?[...kitchenPick,id]:[kitchenPick[1],id];openKitchen(cookId)}));body.append(row)}
 if(kitchenPick.length===2){const [a,b]=kitchenPick,row=document.createElement('div'),t=document.createElement('strong');row.className='item';t.textContent=`${mealName(a,b)} · ${mealPrice(a,b)} marks`;const d=document.createElement('div');d.textContent=`${mealPercent(a,b)}, for ${MEAL.seconds/60} minutes.`;
  row.append(t,d,uiButton('Eat',()=>{const r=game.eatAt(cookId,a,b);persist();if(r.ok){kitchenPick=[];resume()}else openKitchen(cookId,r.message)}),uiButton('Clear',()=>{kitchenPick=[];openKitchen(cookId)}));body.append(row)}
 else{const p=document.createElement('p');p.textContent=kitchenPick.length?`${INGREDIENTS[kitchenPick[0]].name}, and…`:'Nothing chosen yet.';body.append(p)}
 body.append(uiButton('Return to world',resume));if(!panel.open)panel.showModal()}
function openForge(){pauseForOverlay();if(pausePanel.open)pausePanel.close();body.replaceChildren(packTabBar('forge'));const h=document.createElement('h2'),intro=document.createElement('p');h.textContent='Sela’s Sphere Forge';intro.textContent=`Weapon Spheres ${save.materials.weaponSphere||0} · Armor Spheres ${save.materials.armorSphere||0}. Rank cost rises by one sphere each step; affixes and identity are preserved.`;body.append(h,intro);for(const slot of ['primary','secondary','armor','charm']){const item=save.equipment[slot];if(!item)continue;const cost=upgradeCost(item,save),/* release 457 */row=document.createElement('div'),title=document.createElement('strong'),preview=document.createElement('div'),next={...item,basePower:item.basePower??item.power,upgradeRank:(item.upgradeRank||0)+1,power:(item.basePower??item.power)+(item.upgradeRank||0)+1};row.className='item';preview.className='item-comparison';title.textContent=`${slot.toUpperCase()} · ${item.name} +${item.upgradeRank||0}`;for(const stat of compareItemStats(next,item)){if(stat.direction==='same')continue;const q=document.createElement('span');q.className=`stat-${stat.direction}`;q.textContent=`↑ ${stat.label} ${stat.current} → ${stat.value}`;preview.append(q)}row.append(title,preview,uiButton(cost.eligible?`Strengthen · ${cost.amount} ${cost.kind==='weaponSphere'?'weapon':'armor'} sphere${cost.amount===1?'':'s'}`:lateUpgradeOpen(save)?'Upgrade limit reached':`Limit reached (Infinite IV + second Gate: +${LATE_UPGRADE.ranks})`,()=>{game.upgradeEquipmentSlot(slot);persist();openForge()}));body.append(row)}for(const slot of ['primary','secondary']){const item=save.equipment[slot];if(!item)continue;const row=document.createElement('div'),t=document.createElement('strong'),c=awakenCheck(save,slot);row.className='item';t.textContent=item.awakened?`${slot.toUpperCase()} · ${item.name} · ${awakenedText(item)}`:`Awaken ${item.name}: ${c.message}`;row.append(t);if(c.ok)row.append(uiButton(`Awaken · ${AWAKEN_COST} lumen dust`,()=>{const r=awaken(save,slot);game.message=r.message;persist();openForge()}));body.append(row)}
 const iron=document.createElement('div');iron.className='item';iron.textContent=`Cinder Iron ${save.materials.cinderIron||0} · weapon +${save.weaponLevel||0}`;iron.append(uiButton('Reinforce weapon · 3 iron',()=>{game.upgrade();persist();openForge()}),uiButton(`Smelt weapon sphere · ${SMELT.cost} iron`,()=>{game.message=smeltSphere(save,'weaponSphere').message;persist();openForge()}),uiButton(`Smelt armor sphere · ${SMELT.cost} iron`,()=>{game.message=smeltSphere(save,'armorSphere').message;persist();openForge()}));body.append(iron); // release 259: moved here from the Pack; 383: smelting
 body.append(uiButton('Return to world',resume));if(!panel.open)panel.showModal()}
function openInteraction(id, confirmAttack = false) {
  const o = game.map.objects.find((q) => q.id === id);
  if (!o) return;
  if(o.kind==='viewport')return openViewport();
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
  else if (o.kind === "relayNode")
    description.textContent =
      "Restore: open the line toward the far Array (a restorative draught). Sever: close it forever (two lumen dust). Either answer counts toward the Relay Network and reveals the next transmission fragment.";
  else if (o.kind === "relayTerminal")
    description.textContent =
      "Restore: reopen the line and recover two draughts. Sever: silence the line and recover three lumen dust. This decision is permanent; either resolves the Missing Crossing.";
  // Only crossings get the enter/leave text; travellers, villagers and other later kinds show their role (Tim, release 183).
  else if (o.kind === "dungeon" || validActions(o, save).some((a) => a === "enter" || a === "bypass"))
    description.textContent =
      "Enter now, or record that you are leaving this crossing unexplored. You may return later; defeated enemies and collected supplies stay changed.";
  // Release 191: written lore (summit stones, ruins, wrecks) is shown when you touch the object.
  else description.textContent = o.lore ? (o.role ? `${o.role}. ` : "") + o.lore : o.role || "";
  body.append(title);
  if (description.textContent) body.append(description);
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
        speak: o.elder ? "Listen" : "Speak",
        touch: "Touch",
        chip: "Chip stone",
        dig: "Dig",
        trade: "Trade",
        attack: "Attack " + o.name + "…",
        standDown: "Stand down / Spare",
        retrain: `Retrain stats (${STAT_RESPEC.marks} marks)`, // release 347
        enter: "Enter",
        bypass: "Leave unexplored",
        restore: "Restore the Relay",
        sever: "Sever the Relay",
        inspect: "Inspect terminal",
        upgrade:"Use sphere forge",
        attune:"Attune (constellation)",
        buySkiff:"Buy a skiff",
        buyRig:"Buy a dive rig",
        buyShield:"Buy a hull shield (40 marks)",
        dive:"Dive",
        surface:"Surface",
        board:"Board the skiff",
        repair:"Repair the hull",
      };
      body.append(
        uiButton(labels[action] || skylandLabel(action, save) || action, () =>
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
  if(action==='upgrade'&&result?.ok){openForge();return}
  if(result?.smithy){game.smithyRequested=null;openSmithy(result.message);return} // release 395
  if(result?.kitchen){game.kitchenRequested=null;kitchenPick=[];openKitchen(id,result.message);return} // release 447
  if(action==='attune'&&result?.ok){openSkills(!!result.shrine);return}
  openInteraction(id);
  // Release 197: an Elder Wanderer answers with a pattern, not words.
  if(result?.pattern){const c=document.createElement("canvas");c.className="elder-pattern";body.append(c);paintRule(c,result.pattern.rule,result.pattern.seed,{reduceMotion:!!settings.reduceMotion,rowsOf:ruleRows});if(result.message){const note=document.createElement("p");note.className="options-note";note.textContent=result.message;body.append(note)}return}
  const message = document.createElement("p");
  message.textContent = result?.message || game.message;
  body.append(message);
}
