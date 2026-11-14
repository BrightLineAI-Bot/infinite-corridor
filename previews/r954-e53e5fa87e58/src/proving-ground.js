import { currentDungeonDoors } from './game.js?v=r954-e53e5fa87e58';
import { dungeonWayfinding, dungeonNavigationDoors, renderDungeonWayfindingPanel } from "./atlas-view.js?v=r954-e53e5fa87e58";
import { serializeSave, deserializeSave } from './save-codec.js?v=r954-e53e5fa87e58';
import { RECOVERY_CONTEXT, recoveryScope, createRecoveryEnvelope, readRecoveryCheckpoint, writeRecoveryCheckpoint, clearRecoveryCheckpoint } from './proving-ground-recovery.js?v=r954-e53e5fa87e58';
import { drawRangedEffects } from "./combat-visuals.js?v=r954-e53e5fa87e58";
import { drawOculusDais } from "./oculus.js?v=r954-e53e5fa87e58"; // release 874
import { UTILITY, PRESETS, presetUtility, setPresetUtility } from "./spell-slots.js?v=r954-e53e5fa87e58"; // release 874: the lab's utility button
import { createInput } from "./input.js?v=r954-e53e5fa87e58";
import { render, renderScaleForViewport, screenToWorld } from "./renderer.js?v=r954-e53e5fa87e58";
import { CLOSE_VIEW_HOOKS, closeViewDrawsProps, invalidateCloseViewDiagnostics, closeViewSteer, closeViewUnsteer, closeViewShowing, closeViewScreenToWorld, mountCloseViewControls } from "./close-view.js?v=r954-e53e5fa87e58"; // the Close View lab
import { LABORATORIES, DEFAULT_PROVING_SEED, scenariosForLab, createLabFixture, labReport, teleportTargets, refreshTeleportOptions, resolveTeleportTarget, selectLabBuildMaterial, describeLabInteraction, dispatchLabInteraction, createLabInteractionLifecycle, labInteractionClockReady, COMBAT_ENVIRONMENTS, TEST_TILE, stampTestTile, naturalLanternRecoveryReady, naturalLanternRecoveryWitness, restoreNaturalLanternRecoveryFixture } from "./proving-ground-labs.js?v=r954-e53e5fa87e58";
import { createSimClock, simClockStep, simClockDraw } from "./sim-clock.js?v=r954-e53e5fa87e58"; // feel pass 1: fixed steps and interpolated drawing, as in the game
import { takeHandoff, createJourneyFixture, exitTarget } from "./proving-ground-handoff.js?v=r954-e53e5fa87e58"; // release 791: Enter Proving Ground from Options
const canvas=document.querySelector("#game"),app=document.querySelector("#app"),ctx=canvas.getContext("2d");
document.body.classList.add("proving-ground");document.querySelectorAll("#hud, dialog, #eventBanner, .story-scene").forEach(element=>element.hidden=true);
const query=new URLSearchParams(location.search),implemented=LABORATORIES.filter(q=>q.status==="implemented");let selectedLab=implemented.some(q=>q.id===query.get("lab"))?query.get("lab"):"shelters";
const panel=document.createElement("aside");panel.id="provingGroundPanel";panel.innerHTML=`
 <header><strong>Developer Proving Ground</strong><button id="pgCollapse" type="button" aria-expanded="true" aria-controls="provingGroundPanel" title="Hide the developer menu (&#96; key)">Hide</button><span>Developer Proving Ground — scratch state; only explicit candidate recovery checkpoints persist</span></header>
 <button id="labHome">Laboratories</button><section id="labLauncher"></section>
 <section id="labControls" hidden><h2 id="labTitle"></h2><p id="labDescription"></p>
  <label id="environmentLabel" hidden>Environment <select id="environmentSelect"></select></label>
  <label>Scenario <select id="scenarioSelect"></select></label>
  <fieldset id="buildPracticeControls" hidden><legend>Build practice · scratch materials</legend><label>Build with <select id="buildMaterialSelect"><option value="stone">Stone block · 5 stone</option><option value="wood">Wood wall · 4 wood</option></select></label><label>View <select id="buildViewSelect"><option value="close">Close View</option><option value="world">World view</option></select></label><p>Build raises the tile ahead. Tap the block to stack. Jump onto one block; two require an adjacent one-block step. Builds last 10 active seconds. Reset same restores the starting stock.</p></fieldset>
  <fieldset id="recoveryControls" hidden><legend>Candidate scratch recovery · not a production journey</legend>
   <p>Observe the naturally generated borrowed leap, pause and save this live scratch Game, then reload this candidate page. Restoring a record is not contact acceptance: resume and verify contact through normal controls.</p>
   <div class="proving-buttons"><button id="recoveryCapture" type="button">Capture next natural leap</button><button id="recoveryReload" type="button">Reload and restore checkpoint</button><button id="recoveryClear" type="button">Clear saved checkpoint</button></div><p id="recoveryStatus" role="status" aria-live="polite"></p>
  </fieldset>
  <div class="proving-grid"><label>Seed <input id="seedInput" maxlength="80"></label><label>Variant <input id="variantInput" type="number" min="0" max="999"></label><label id="sizeProfileLabel">Size <select id="sizeProfileSelect"><option value="compact">Compact</option><option value="standard" selected>Standard</option><option value="extended">Extended</option></select></label><label id="revealModeLabel">Reveal <select id="revealModeSelect"><option value="normal">Normal discovery</option><option value="explored">Explored only</option><option value="full">Full diagnostic topology</option></select></label></div>
  <div class="proving-buttons"><button id="scenarioPrevious">Previous</button><button id="scenarioNext">Next</button><button id="scenarioGenerate" class="pg-start">Start test</button><button id="scenarioReset">Reset same</button><button id="scenarioCompare">Compare same seed</button><button id="scenarioEntrance">Start at entrance</button><button id="scenarioPause">Pause</button><button id="scenarioRoutes" disabled>View routes</button></div>
  <label><input id="pgOverworldCloseView" type="checkbox"> Overworld Close View</label>
  <label>Utility button <select id="pgUtility"><option value="build">Build</option><option value="oculus">Oculus</option><option value="robot">Robot</option><option value="drone">Drone</option></select></label>
  <label>Developer teleport <select id="teleportSelect"><option value="">Select target…</option></select></label>
  <pre id="fixtureDiagnostics" aria-live="polite"></pre><p>Use the movement control, WASD, or arrow keys. In Close View, use the left joystick to move and drag the scene to look. Production combat and Act controls remain available below.</p>
  <div class="proving-buttons"><button id="fixtureCopy">Copy recipe/report</button><button id="fixtureExit">Exit to normal game</button></div>
 </section>`;document.body.append(panel);
const overworldCloseViewToggle=panel.querySelector("#pgOverworldCloseView");
overworldCloseViewToggle.checked=query.get("overworldCloseView")==="1";
// Release 874: the scratch save's utility button (both presets), so the Oculus can be tried on any fixture; ?utility=oculus.
const utilitySelect=panel.querySelector("#pgUtility");utilitySelect.value=UTILITY.choices.includes(query.get("utility"))?query.get("utility"):UTILITY.default;
const applyLabUtility=()=>{if(game)for(let i=0;i<PRESETS;i++)setPresetUtility(game.save,i,utilitySelect.value)};
const interactionDialog=document.createElement("dialog");interactionDialog.id="pgInteraction";interactionDialog.innerHTML=`<form method="dialog"><h2></h2><p class="pg-interaction-lore"></p><p class="pg-interaction-status" aria-live="polite"></p><div class="pg-interaction-actions"></div><button value="cancel">Return to world</button></form>`;document.body.append(interactionDialog);interactionDialog.hidden=false;
const routesDialog=document.createElement("dialog");routesDialog.id="pgRoutes";
routesDialog.innerHTML=`<h2>Known dungeon routes</h2><p>Scratch fixture paused. Close this panel, then press Resume to continue.</p><div class="pg-route-body"></div><form method="dialog"><button>Close routes</button></form>`;
document.body.append(routesDialog);
const routesBody=routesDialog.querySelector(".pg-route-body");
const $=selector=>panel.querySelector(selector),launcher=$("#labLauncher"),controls=$("#labControls"),scenarioSelect=$("#scenarioSelect"),seedInput=$("#seedInput"),variantInput=$("#variantInput"),sizeProfileSelect=$("#sizeProfileSelect"),revealModeSelect=$("#revealModeSelect"),teleportSelect=$("#teleportSelect"),environmentSelect=$("#environmentSelect");
// Release 279 (Tim, 2026-10-22: "there should just be a drop down for whichever arena... and then... a start simulation button"):
// the combat lab picks its environment from a list, and nothing starts until Start test.
for(const q of COMBAT_ENVIRONMENTS)environmentSelect.add(new Option(q.label,q.id));environmentSelect.value=COMBAT_ENVIRONMENTS.some(q=>q.id===query.get("env"))?query.get("env"):"test-tile";
function ready(){if(recoveryBusy)return;invalidateCloseViewDiagnostics();invalidateInteraction();fixture=null;game=null;paused=false;resetRecoveryState();$("#buildPracticeControls").hidden=true;teleportSignature="";teleportSelect.replaceChildren(new Option("Select target…",""));$("#fixtureDiagnostics").textContent="Ready. Choose the "+(selectedLab==="combat"?"environment and creature":"scenario")+", then press Start test.";syncUrl()}
// Collapse the developer menu to a small chip so the game is playable on a phone; remembered per device.
const COLLAPSE_KEY="ic-proving-ground-panel-collapsed",collapseButton=$("#pgCollapse");
function setPanelCollapsed(value){panel.classList.toggle("collapsed",value);collapseButton.textContent=value?"Dev menu":"Hide";collapseButton.setAttribute("aria-expanded",String(!value));collapseButton.title=value?"Show the developer menu (`)":"Hide the developer menu (`)";try{localStorage.setItem(COLLAPSE_KEY,value?"1":"0")}catch{}}
collapseButton.onclick=()=>setPanelCollapsed(!panel.classList.contains("collapsed"));
document.addEventListener("keydown",event=>{if(event.key==="`"&&!event.target?.closest?.("input,select,textarea")){event.preventDefault();setPanelCollapsed(!panel.classList.contains("collapsed"))}});
try{setPanelCollapsed(localStorage.getItem(COLLAPSE_KEY)==="1")}catch{setPanelCollapsed(false)}
globalThis.provingGroundGame=()=>game;const closePan=mountCloseViewControls(()=>game); // Close View: the pan crescent and its lock button
 // developer handle (the lab's scratch game only), for headless checks such as the Close View blend
CLOSE_VIEW_HOOKS.groundLayers.push((c,W,H,projectedShots)=>{if(game){drawRangedEffects(c,game,W,H,projectedShots);if(game.oculus&&!closeViewDrawsProps())labOculus(c,W,H,performance.now())/* 2026-11-11: the GPU scene stands the dais up */}});
// Release 874: the Oculus's dais in the lab (its scratch save's utility button), drawn as the game draws it.
function labOculus(c,W,H,now){const o=game?.oculus;if(!o||o.map!==game.map)return;const s=Math.round(Math.max(28,Math.min(44,W/12))),p=game.player;drawOculusDais(c,o,now,x=>W/2+(x-p.x)*s,y=>H/2+(y-p.y)*s,s,!!(game.presentation?.reduceMotion||game.presentation?.safeMode))}
let journeyRecord=null,fixture=null,game=null,paused=false,last=performance.now(),simClock=createSimClock(),lastDiagnostic=0,teleportSignature="",comparison=null,input=createInput(document,globalThis,{controlSmoothing:38});
let recoveryEpoch=0,recoveryBinding=null,recoveryRecord=null,recoveryArmed=false,recoveryBusy=false,recoveryStatus='unavailable',recoveryNote='',recoveryResetActive=false;
let recoveryBootPending=query.get('lab')===RECOVERY_CONTEXT.lab&&query.get('scenario')===RECOVERY_CONTEXT.scenario&&query.get('seed')===RECOVERY_CONTEXT.seed;
function resetRecoveryState(){recoveryEpoch++;recoveryBinding=null;recoveryRecord=null;recoveryArmed=false;recoveryStatus='unavailable';recoveryNote='';updateRecoveryControls();}
function updateRecoveryControls(note){
  if(note!==undefined)recoveryNote=note;
  const active=!!fixture?.recoveryContext,available=active&&!!recoveryBinding;
  $('#recoveryControls').hidden=!active;
  $('#recoveryCapture').textContent=recoveryArmed?'Cancel capture watch':game?.paused&&naturalLanternRecoveryReady(game)?'Save paused natural leap':'Capture next natural leap';
  $('#recoveryCapture').disabled=!available||recoveryBusy||['unsupported','damaged','mismatch'].includes(recoveryStatus);
  $('#recoveryReload').disabled=!available||recoveryBusy||!recoveryRecord;
  $('#recoveryClear').disabled=!available||recoveryBusy||!recoveryRecord;
  $('#recoveryStatus').textContent=recoveryNote;
  seedInput.disabled=active;variantInput.disabled=active;
}
function recoveryOptions(){return{binding:recoveryBinding,context:RECOVERY_CONTEXT,href:location.href};}
function currentRecoveryRoute(){const q=new URL(location.href).searchParams;return q.get('lab')===RECOVERY_CONTEXT.lab&&q.get('scenario')===RECOVERY_CONTEXT.scenario&&q.get('seed')===RECOVERY_CONTEXT.seed;}
function setRecoveryBusy(value){recoveryBusy=value;for(const id of ['#scenarioGenerate','#scenarioReset','#scenarioPrevious','#scenarioNext','#labHome','#scenarioSelect','#environmentSelect','#scenarioPause','#scenarioEntrance','#teleportSelect','#scenarioCompare','#fixtureExit','#fixtureCopy','#sizeProfileSelect','#revealModeSelect'])$(id).disabled=value;updateRecoveryControls();}
async function initializeRecovery(restoreOnLoad){
  const epoch=recoveryEpoch;setRecoveryBusy(true);paused=true;game.setPaused(true,performance.now());
  updateRecoveryControls('Checking this frozen candidate identity. No production storage is opened.');
  try{
    const response=await fetch('./release-identity.json',{cache:'no-store'});if(!response.ok)throw new Error('No frozen candidate identity is available.');
    const binding=await response.json();recoveryScope(binding,location.href);
    if(epoch!==recoveryEpoch||!fixture?.recoveryContext||!currentRecoveryRoute())return;
    recoveryBinding=binding;const loaded=await readRecoveryCheckpoint(recoveryOptions());
    if(epoch!==recoveryEpoch)return;
    recoveryStatus=loaded.status;recoveryRecord=loaded.status==='ready'?loaded.record:null;
    if(restoreOnLoad&&recoveryRecord){
      invalidateCloseViewDiagnostics();
      fixture=restoreNaturalLanternRecoveryFixture(deserializeSave(recoveryRecord.saveText),recoveryRecord.preWitness,performance.now());
      game=fixture.game;paused=game.paused;last=performance.now();input.reset();invalidateInteraction();fillTeleports();
      const checks=fixture.diagnostics.restoration.passed?'Reconstruction diagnostics agree.':'Reconstruction diagnostics FAILED; inspect the report.';
      updateRecoveryControls(`Checkpoint restored on page initialization through the canonical save reader and a fresh Game. ${checks} Still paused; resume and verify actual contact. This is not a production database load.`);
    }else if(loaded.status==='empty'||loaded.status==='ready'){
      // Initialization never resumes play after an awaited operation. In particular,
      // a newer background/explicit pause remains authoritative after hide-return.
      game.setPaused(true,performance.now());paused=true;last=performance.now();
      updateRecoveryControls(loaded.status==='ready'?'Fresh scratch scenario initialized and paused. A saved checkpoint is available; Reload and restore loads that checkpoint. To start fresh, arm capture and press Resume. Reset same never overwrites it.':'Natural scenario initialized and paused. Capture next natural leap arms the real-AI watch; then press Resume. Only this candidate scratch checkpoint can be saved.');
    }else updateRecoveryControls(`${loaded.status}: ${loaded.error||'Checkpoint is preserved unchanged.'} Reset same does not erase it.`);
    updateDiagnostics(true);
  }catch(error){if(epoch!==recoveryEpoch)return;recoveryStatus='unavailable';recoveryBinding=null;updateRecoveryControls(`Recovery unavailable: ${error?.message||error} The scratch Game remains paused; no checkpoint was restored.`);}
  finally{if(epoch===recoveryEpoch)setRecoveryBusy(false);}
}
async function captureRecovery(now){
  if(recoveryBusy||!recoveryBinding||!fixture?.recoveryContext||!naturalLanternRecoveryReady(game))return;
  recoveryArmed=false;setRecoveryBusy(true);const epoch=recoveryEpoch;
  try{
    game.setPaused(true,now);paused=true;input.reset();
    const capturedAt=Date.now(),before={...naturalLanternRecoveryWitness(game),capturedAt},saveText=serializeSave(game.exportSnapshot(now));
    const record=createRecoveryEnvelope({...recoveryOptions(),saveText,preWitness:before,capturedAt});
    updateRecoveryControls('Natural positive-lift leap paused. Waiting for durable candidate scratch checkpoint commit…');
    await writeRecoveryCheckpoint({...recoveryOptions(),record});
    if(epoch!==recoveryEpoch)return;
    recoveryRecord=record;recoveryStatus='ready';updateRecoveryControls('Checkpoint committed to this candidate scratch database. Use Reload and restore checkpoint for a real page reload. No restoration or contact acceptance is claimed yet.');updateDiagnostics(true);
  }catch(error){if(epoch!==recoveryEpoch)return;recoveryRecord=null;recoveryStatus='error';updateRecoveryControls(`Checkpoint was not confirmed: ${error?.message||error}. The live Game remains paused. Reset same can recheck storage; nothing was reported saved.`);}
  finally{setRecoveryBusy(false);}
}
// The diagnostics Reset button may run from any lab on this candidate. Outside
// a candidate page it must never open a recovery database or fetch production identity.
export function releaseCandidateRecoveryReset(error) {
  if (!recoveryResetActive) return;
  recoveryResetActive = false; setRecoveryBusy(false);
  if (error) updateRecoveryControls(`Reset stopped: ${error?.message || error}. The scratch Game remains paused; no automatic reload was performed.`);
}
export async function clearCandidateRecoveryForReset(href = location.href) {
  const url = new URL(href);
  if (!/\/r\d+-[0-9a-f]{12}\/(?:index\.html)?$/.test(url.pathname)) return { status: 'not-candidate' };
  if (recoveryBusy) throw new Error('Wait for the current recovery operation before resetting scratch data.');
  // Acquire the lock before the first await. Keep it through the mobile handler's
  // handoff reset and reload, so no observer or new write can race the deletion.
  recoveryResetActive = true; recoveryArmed = false; recoveryEpoch++; setRecoveryBusy(true);
  if (game) { game.setPaused(true, performance.now()); paused = true; input.reset(); }
  try {
    const response = await fetch(new URL('./release-identity.json', href), { cache: 'no-store' });
    if (!response.ok) throw new Error('Candidate identity could not be verified; recovery data was not cleared.');
    const binding = await response.json(); recoveryScope(binding, href);
    const cleared = await clearRecoveryCheckpoint({ binding, context: RECOVERY_CONTEXT, href });
    if (cleared.status !== 'empty' && cleared.status !== 'cleared') {
      recoveryStatus = cleared.status;
      throw new Error(`${cleared.status}: ${cleared.error || 'Unrecognized checkpoint preserved; reset stopped.'}`);
    }
    recoveryRecord = null; recoveryStatus = 'empty'; updateRecoveryControls();
    return cleared;
  } catch (error) { releaseCandidateRecoveryReset(error); throw error; }
}

function observeRecovery(now){if(!recoveryArmed)return;if(naturalLanternRecoveryReady(game)){void captureRecovery(now);return;}const w=naturalLanternRecoveryWitness(game);if(w.attack==='leapSlam'&&w.phase==='active'&&w.hopLift>0&&!w.stableEnemyFootprint)updateRecoveryControls('Real positive-lift leap observed, but its current ground footprint would relocate on reload. Waiting for a naturally supported frame; no coordinates or AI are changed.');}
$('#recoveryCapture').onclick=()=>{if(!recoveryBinding||recoveryBusy)return;if(recoveryArmed){recoveryArmed=false;updateRecoveryControls('Capture watch cancelled; AI and any saved checkpoint are unchanged.');return;}if(game.paused&&naturalLanternRecoveryReady(game)){void captureRecovery(game.pauseStarted);return;}recoveryArmed=true;updateRecoveryControls(game.paused?'Watching the next qualifying natural leap after Resume. No attack, phase or lift is forced.':'Watching real AI for the borrowed leap with positive lift. The capture watch does not change actor state.');};
$('#recoveryReload').onclick=()=>{if(recoveryRecord&&!recoveryBusy&&currentRecoveryRoute())location.reload();};
$('#recoveryClear').onclick=async()=>{if(!recoveryBinding||recoveryBusy)return;setRecoveryBusy(true);try{const cleared=await clearRecoveryCheckpoint(recoveryOptions());if(cleared.status==='cleared'||cleared.status==='empty'){recoveryRecord=null;recoveryStatus='empty';updateRecoveryControls('This candidate scratch checkpoint is cleared. The live Game and production journeys are unchanged.');}else{recoveryStatus=cleared.status;updateRecoveryControls(`${cleared.status}: ${cleared.error||'Checkpoint preserved unchanged.'}`);}}catch(error){updateRecoveryControls(`Checkpoint clear failed: ${error?.message||error}`);}finally{setRecoveryBusy(false);updateDiagnostics(true);}};

const interactionLifecycle=createLabInteractionLifecycle({resetInput:()=>input.reset(),now:()=>performance.now(),canResume:()=>!paused});
let interactionToken=null,interactionNonce=0,interactionGeneration=0,interactionFocus=null,attackConfirmation="",closingGenerations=[],interactionRequestClock=null;
function closeInteraction(resume=true,generation=interactionGeneration){if(generation!==interactionGeneration)return false;interactionNonce++;interactionToken=null;attackConfirmation="";if(resume)interactionLifecycle.close(generation);if(interactionDialog.open){closingGenerations.push(generation);interactionDialog.close()}interactionFocus?.focus?.();interactionFocus=null;last=performance.now();return true}
function invalidateInteraction(){interactionRequestClock=null;closeInteraction(true);if(game)game.interactionRequested=null}
function renderInteraction(token,status=""){interactionToken=token;const nonce=++interactionNonce,actions=interactionDialog.querySelector(".pg-interaction-actions");interactionDialog.querySelector("h2").textContent=token.name;interactionDialog.querySelector(".pg-interaction-lore").textContent=token.lore;interactionDialog.querySelector(".pg-interaction-status").textContent=status;actions.replaceChildren();for(const action of token.actions){const button=document.createElement("button");button.type="button";button.textContent=action.label;button.disabled=action.unsupported;button.title=action.unsupported?"Use this action in the main game.":"";button.onclick=()=>{if(nonce!==interactionNonce||button.disabled)return;if(action.id==="attack"&&attackConfirmation!==action.id){attackConfirmation=action.id;button.textContent="Confirm attack";interactionDialog.querySelector(".pg-interaction-status").textContent="Press Confirm attack to strike.";return}for(const q of actions.querySelectorAll("button"))q.disabled=true;interactionNonce++;const result=dispatchLabInteraction(token,action.id);if(!result?.ok){const fresh=describeLabInteraction(game,token.objectId);if(fresh){renderInteraction(fresh,result?.message||"The action was not completed.");return}closeInteraction(true);return}if(game.interactionRequested){const fresh=describeLabInteraction(game);game.interactionRequested=null;if(fresh){renderInteraction(fresh,result?.message||"");return}}closeInteraction(true);updateDiagnostics(true)};actions.append(button)}if(!interactionDialog.open){interactionFocus=document.activeElement;interactionDialog.showModal()}actions.querySelector("button:not(:disabled)")?.focus()}
function pollInteraction(){if(!game||interactionDialog.open)return;const direct=["shopRequested","smithyRequested","kitchenRequested"].find(key=>game[key]);if(!game.interactionRequested&&!direct)return;if(!labInteractionClockReady(game,interactionRequestClock))return;interactionRequestClock=null;const requested=game.interactionRequested;game.interactionRequested=null;if(paused||document.hidden||game.paused){$("#fixtureDiagnostics").textContent="Interaction waiting: resume the Proving Ground before choosing an action.";return}const token=direct?{game,name:"Main-game action",lore:"This controller is not available in the Proving Ground.",actions:[]}:describeLabInteraction(game,requested);if(!token)return;interactionGeneration=interactionLifecycle.begin(game);if(!interactionGeneration)return;if(direct){game[direct]=null;renderInteraction(token,"Return to the main game to use it.");return}renderInteraction(token)}
interactionDialog.addEventListener("keydown",event=>event.stopPropagation());interactionDialog.addEventListener("cancel",event=>{event.preventDefault();closeInteraction(true,interactionGeneration)});interactionDialog.addEventListener("submit",event=>{event.preventDefault();closeInteraction(true,interactionGeneration)});interactionDialog.addEventListener("close",()=>{if(closingGenerations.length){closingGenerations.shift();return}closeInteraction(true,interactionGeneration)});
canvas.addEventListener("worldtap",event=>{if(!game||paused||game.paused||interactionDialog.open)return;const rect=canvas.getBoundingClientRect(),point=closeViewScreenToWorld(game,rect.width,rect.height,event.detail.clientX-rect.left,event.detail.clientY-rect.top)||screenToWorld(game,rect.width,rect.height,event.detail.clientX-rect.left,event.detail.clientY-rect.top),direction={x:point.x-game.player.x-.5,y:point.y-game.player.y-.45};game.aimAt(point.x,point.y);if(game.save.aimMode==="attack")game.primaryAttack(performance.now(),direction);else if(game.save.aimMode==="tool"||(!game.save.aimMode&&game.save.activeWeaponSlot==="secondary"))game.fireSecondary(performance.now(),direction);else if(game.save.aimMode==="act"){game.interactAt(point.x,point.y);interactionRequestClock=game.lastUpdateNow;pollInteraction()}else if(game.save.aimMode==="build")game.buildAt(point.x,point.y);updateDiagnostics(true)});
function renderLauncher(){if(recoveryBusy)return;invalidateCloseViewDiagnostics();invalidateInteraction();fixture=null;game=null;paused=false;input.reset();resetRecoveryState();controls.hidden=true;launcher.hidden=false;launcher.replaceChildren();const intro=document.createElement("p");intro.textContent="Choose a production package to instantiate directly. Every laboratory is isolated from normal saves.";launcher.append(intro);if(journeyRecord){const b=document.createElement("button");b.className="lab-card";b.innerHTML="<strong>Your journey</strong><span>A scratch copy of the save you came from: world, character, place and gear. Nothing here is saved.</span><small>Available</small>";b.onclick=()=>openLab("journey");launcher.append(b)}for(const lab of LABORATORIES){const button=document.createElement("button");button.className="lab-card";button.disabled=lab.status!=="implemented";button.innerHTML=`<strong>${lab.label}</strong><span>${lab.description}</span><small>${lab.status==="implemented"?"Available":"Planned — unavailable"}</small>`;if(!button.disabled)button.onclick=()=>openLab(lab.id);launcher.append(button)}}
function syncUrl(){if(selectedLab==="journey")return;const q=new URLSearchParams({dev:"proving-ground",lab:selectedLab,env:environmentSelect.value,scenario:scenarioSelect.value,seed:seedInput.value,variant:String(Number(variantInput.value)||0),size:sizeProfileSelect.value,reveal:revealModeSelect.value});if(overworldCloseViewToggle.checked)q.set("overworldCloseView","1");if(utilitySelect.value!==UTILITY.default)q.set("utility",utilitySelect.value);history.replaceState(null,"",`?${q}`)}
function fillScenarios(){scenarioSelect.replaceChildren();for(const q of scenariosForLab(selectedLab))scenarioSelect.add(new Option(q.label,q.id));const requested=query.get("lab")===selectedLab?query.get("scenario"):null;if(requested&&[...scenarioSelect.options].some(q=>q.value===requested))scenarioSelect.value=requested}
function openJourney(){if(recoveryBusy)return;invalidateCloseViewDiagnostics();invalidateInteraction();fixture=null;game=null;paused=false;resetRecoveryState();selectedLab="journey";launcher.hidden=true;controls.hidden=false;$("#labTitle").textContent="Your journey";$("#labDescription").textContent="A scratch copy of the journey you came from. Play, spend, die, break things: none of it is saved. Exit to game returns to your journey as you left it; Reset same starts this copy over.";for(const id of["#sizeProfileLabel","#revealModeLabel","#environmentLabel"])$(id).hidden=true;scenarioSelect.replaceChildren(new Option("From your save","your-journey"));seedInput.value=journeyRecord.save.seed||"";generate()}
function openLab(id){if(recoveryBusy)return;if(id==="journey"&&journeyRecord)return openJourney();selectedLab=id;const meta=LABORATORIES.find(q=>q.id===id),dungeon=["ordinary-dungeon","deep-dungeon","threefold"].includes(id);launcher.hidden=true;controls.hidden=false;$("#labTitle").textContent=meta.label;$("#labDescription").textContent=meta.description;$("#sizeProfileLabel").hidden=!dungeon;$("#revealModeLabel").hidden=!dungeon;$("#environmentLabel").hidden=id!=="combat";fillScenarios();seedInput.value=query.get("seed")||DEFAULT_PROVING_SEED;variantInput.value=query.get("variant")||"0";sizeProfileSelect.value=query.get("size")||"standard";revealModeSelect.value=query.get("reveal")||"normal";if((query.get("lab")===id&&query.get("scenario"))||AUTO_START.has(id)){generate();if(AUTO_START.has(id)&&innerWidth<700)setPanelCollapsed(true)}else ready()}
// Release 790 (Tim: "can't see Close View"): the Close View lab starts its first scenario at once (it was black until Start
// test), folds the developer menu away on a phone so the view shows, and a new scenario chosen there starts at once too.
const AUTO_START=new Set(["close-view"]);
// With no test running the canvas says what to do, instead of staying black.
function idlePrompt() {
  invalidateCloseViewDiagnostics();
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.save();
  ctx.fillStyle = "#0b0b0e";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#cec7b6";
  ctx.font = "15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(controls.hidden ? "Choose a laboratory to begin." : "Choose a scenario, then press Start test.", w / 2, h / 2, Math.max(1, w - 32));
  ctx.restore();
}
function generate(){if(recoveryBusy)return;invalidateCloseViewDiagnostics();resetRecoveryState();invalidateInteraction();try{comparison=null;fixture=selectedLab==="journey"?createJourneyFixture(journeyRecord,performance.now()):createLabFixture({lab:selectedLab,scenario:scenarioSelect.value,seed:seedInput.value,variant:Number(variantInput.value)||0,sizeProfile:sizeProfileSelect.value,revealMode:revealModeSelect.value,environment:environmentSelect.value,now:performance.now()});game=fixture.game;if(selectedLab==="journey"){overworldCloseViewToggle.checked=game.save.overworldCloseView===true;utilitySelect.value=presetUtility(game.save)}else{game.save.overworldCloseView=overworldCloseViewToggle.checked;applyLabUtility()}paused=false;input.reset();last=performance.now();fillTeleports();if(fixture.recoveryContext){seedInput.value=fixture.seed;variantInput.value='0';}syncUrl();updateRecoveryControls();updateDiagnostics(true);if(fixture.recoveryContext){const restore=recoveryBootPending;recoveryBootPending=false;void initializeRecovery(restore);}}catch(error){$("#fixtureDiagnostics").textContent=`FIXTURE ERROR\n${error.stack||error}`}}
function fillTeleports(){teleportSignature=refreshTeleportOptions(teleportSelect,teleportTargets(fixture),teleportSignature)}
function report(){const data=labReport(fixture);data.paused=paused;if(game.area==="dungeon")data.doorWayfinding=CLOSE_VIEW_HOOKS.navigationDoors(game).map(({id,x,y,mark,slot})=>({id,x,y,mark,slot}));data.url=location.href;data.sameSeedComparison=comparison;if(fixture.recoveryContext)data.scratchRecovery={status:recoveryStatus,binding:recoveryBinding,armed:recoveryArmed,busy:recoveryBusy,checkpoint:recoveryRecord?{capturedAt:recoveryRecord.capturedAt,preWitness:recoveryRecord.preWitness}:null,contactAcceptance:'Not automatically established; resume and verify through normal controls.'};data.teleportTargets=teleportTargets(fixture).map(q=>({id:q.id,label:q.label,x:q.x,y:q.y}));return data}
function updateDiagnostics(force=false){$("#scenarioRoutes").disabled=!game||game.area!=="dungeon"||recoveryBusy;if(!fixture)return;const now=performance.now();if(!force&&now-lastDiagnostic<220)return;lastDiagnostic=now;fillTeleports();$("#fixtureDiagnostics").textContent=JSON.stringify(report(),null,2);$("#scenarioPause").textContent=paused?"Resume":"Pause";$("#buildPracticeControls").hidden=!fixture.buildPractice;if(fixture.buildPractice){$("#buildMaterialSelect").value=game.save.build.kind;$("#buildViewSelect").value=game.save.closeView?"close":"world"}}
function adjacent(delta){const options=[...scenarioSelect.options],index=scenarioSelect.selectedIndex;scenarioSelect.value=options[(index+delta+options.length)%options.length].value;variantInput.value=String(Math.max(0,(Number(variantInput.value)||0)+delta));generate()}
function resize(){const rect=app.getBoundingClientRect(),d=renderScaleForViewport(rect.width,rect.height,devicePixelRatio||1,"balanced");invalidateCloseViewDiagnostics();canvas.width=Math.max(1,Math.round(rect.width*d));canvas.height=Math.max(1,Math.round(rect.height*d));canvas.style.width=`${rect.width}px`;canvas.style.height=`${rect.height}px`;ctx.setTransform(d,0,0,d,0,0);ctx.imageSmoothingEnabled=false}
function frame(now){const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(!interactionDialog.open)input.update(dt);if(game&&!paused&&!interactionDialog.open){simClockStep(simClock,game,dt,now,(stepDt,stepNow)=>{closeViewSteer(game,input.state,stepNow);try{game.update(stepDt,input,stepNow)}finally{closeViewUnsteer(input.state)}});pollInteraction();observeRecovery(now)}/* feel pass 1 (sim-clock.ts): fixed 60 Hz steps, as in the game */if(fixture?.testTile&&game?.area==="overworld"&&game.rx===TEST_TILE.rx&&game.ry===TEST_TILE.ry&&!game.map.testTile){stampTestTile(game.map);game.sync()}/* release 279: the test tile stays as it is when the Wayfarer comes back out */if(game)simClockDraw(simClock,game,()=>{render(ctx,game,canvas.clientWidth,canvas.clientHeight,now);if(!closeViewShowing(game)){drawRangedEffects(ctx,game,canvas.clientWidth,canvas.clientHeight);if(game.oculus)labOculus(ctx,canvas.clientWidth,canvas.clientHeight,now)}});else idlePrompt();closePan.sync();updateDiagnostics();requestAnimationFrame(frame)}
$("#labHome").onclick=()=>{invalidateInteraction();renderLauncher()};$("#scenarioPrevious").onclick=()=>adjacent(-1);$("#scenarioNext").onclick=()=>adjacent(1);$("#scenarioGenerate").onclick=generate;$("#scenarioReset").onclick=generate;scenarioSelect.onchange=()=>AUTO_START.has(selectedLab)?generate():ready();environmentSelect.onchange=ready;
sizeProfileSelect.onchange=ready;revealModeSelect.onchange=ready;
// Exercise the production route panel against the isolated scratch save. Stay paused after dismissal.
$("#scenarioRoutes").onclick=()=>{
  if(!game||game.area!=="dungeon"||recoveryBusy||interactionDialog.open)return;
  paused=true;game.setPaused(true,performance.now());input.reset();
  renderScratchDungeonRoutes();
  routesDialog.showModal();updateDiagnostics(true);
};
function renderScratchDungeonRoutes(){
  const areaId=game.areaId(),candidates=game.map.building?.labyrinth||game.map.building?.pentagon?currentDungeonDoors(game.map,areaId):[];
  const view=dungeonWayfinding(game.save,game.map,game.player,{areaId,previous:game.pentagonPrevious,candidates});
  renderDungeonWayfindingPanel(routesBody,view,game.map,{onToggleDoor:door=>{
    if(game.toggleDungeonDoorWaypoint(door.doorId)){renderScratchDungeonRoutes();updateDiagnostics(true)}
  }});
}
CLOSE_VIEW_HOOKS.navigationDoors = g => g.area==="dungeon" ? dungeonNavigationDoors(g.save,g.map,g.areaId(),currentDungeonDoors(g.map,g.areaId())) : [];
$("#buildMaterialSelect").onchange=()=>{if(selectLabBuildMaterial(fixture,$("#buildMaterialSelect").value))updateDiagnostics(true)};
$("#buildViewSelect").onchange=()=>{if(fixture?.buildPractice){game.save.closeView=$("#buildViewSelect").value==="close";updateDiagnostics(true)}};
$("#scenarioCompare").onclick=()=>{try{const other=createLabFixture({lab:selectedLab,scenario:scenarioSelect.value,seed:seedInput.value,variant:Number(variantInput.value)||0,sizeProfile:sizeProfileSelect.value,revealMode:revealModeSelect.value,now:performance.now()}),a=labReport(fixture).topologyHash,b=labReport(other).topologyHash;comparison={first:a,second:b,match:a===b,checkedAt:new Date().toISOString()};updateDiagnostics(true)}catch(error){comparison={match:false,error:String(error?.message||error)};updateDiagnostics(true)}};
$("#scenarioEntrance").onclick=()=>{invalidateInteraction();const entry=game?.map?.entry||fixture?.primary||game?.map?.objects?.find(q=>q.kind==="exit")||game?.map?.objects?.find(q=>q.actions?.length);if(entry){game.player.x=entry.x;game.player.y=entry.y;game.updateDungeonDiscovery(true);game.sync();updateDiagnostics(true)}};
overworldCloseViewToggle.onchange=()=>{if(game)game.save.overworldCloseView=overworldCloseViewToggle.checked;syncUrl()};
utilitySelect.onchange=()=>{applyLabUtility();syncUrl()}; // release 874
$("#scenarioPause").onclick=()=>{paused=!paused;game?.setPaused(paused,performance.now());input.reset();updateDiagnostics(true)};
teleportSelect.onchange=()=>{recoveryArmed=false;invalidateInteraction();if(!fixture)return;const target=resolveTeleportTarget(teleportTargets(fixture),teleportSelect.value);if(target){game.player.x=target.x;game.player.y=target.y;game.projectiles=[];game.effects=[];game.updateDungeonDiscovery(true);game.sync();updateDiagnostics(true)}teleportSelect.value=""};
$("#fixtureCopy").onclick=async()=>fixture&&navigator.clipboard?.writeText(JSON.stringify(report(),null,2));$("#fixtureExit").onclick=exitToGame;
addEventListener("resize",resize,{passive:true});document.addEventListener("visibilitychange",()=>{if(document.hidden&&game){paused=true;game.setPaused(true,performance.now());input.reset();updateDiagnostics(true)}});
resize();renderLauncher();if(query.get("lab")&&implemented.some(q=>q.id===selectedLab))openLab(selectedLab);requestAnimationFrame(frame);
// Release 791: Enter Proving Ground (Options → System) hands one copy of the journey over; it is taken (and deleted) once
// and played in memory. Exit to game goes back to the production page, which resumes the journey it saved before leaving.
// The root ?dev=proving-ground route and a frozen candidate preview have no game beside them, so Exit keeps its old target.
function exitToGame(){location.replace(exitTarget(location.href,journeyRecord)||location.pathname)}
{const exit=document.querySelector("#pgExit");if(exit){exit.hidden=!exitTarget(location.href,null);exit.onclick=exitToGame}}
globalThis.provingGroundJourney=()=>fixture?.journey===true;
if(query.get("from")==="game")takeHandoff().then(record=>{if(record){journeyRecord=record;renderLauncher();openJourney();return}const note=document.createElement("p");note.textContent="No journey was waiting to be loaded (it is taken once, when you enter from Options → System). Exit to game and enter again to load it.";launcher.prepend(note)},error=>{const note=document.createElement("p");note.textContent=`The journey could not be loaded here (${error?.message||error}). Your journey is unchanged: Exit to game.`;launcher.prepend(note)});
