import { clearCandidateRecoveryForReset, releaseCandidateRecoveryReset } from "./proving-ground.js?v=r852-94fdbc27f9f9";
import { closeViewRenderDiagnostics } from "./close-view.js?v=r852-94fdbc27f9f9";
import { SAVE_VERSION } from "./types.js?v=r852-94fdbc27f9f9";
import { GLIMPSES } from "./glimpses.js?v=r852-94fdbc27f9f9";
import { startGlimpse } from "./glimpse-render.js?v=r852-94fdbc27f9f9";
import { clearHandoff, releaseIdentityUrl, productionHome } from "./proving-ground-handoff.js?v=r852-94fdbc27f9f9"; // release 791

const errorLog=[];
const remember=value=>{errorLog.push(String(value?.message||value||"Unknown client error").slice(0,180));if(errorLog.length>5)errorLog.shift()};
addEventListener("error",event=>remember(event.error||event.message));
addEventListener("unhandledrejection",event=>remember(event.reason));
const dialog=document.querySelector("#pgDiagnostics"),body=document.querySelector("#pgDiagnosticsBody"),status=document.querySelector("#pgResetStatus");
const storageNamespace="ic-preview-r852-94fdbc27f9f9-scratch";
// Snapshot only on opening Diagnostics. No renderer startup, polling or hardware probes.
function renderDiagnosticsRows(d){
  const scope=d.active?'active':'inactive; historical',failures=Object.entries(d.fallbacks).map(([reason,count])=>`${reason}: ${count}`).join(', ')||'none';
  return {'Close View scene':d.frame?`${scope}: ${d.backend}, completed frame ${d.frame}`:'inactive; no completed Close View frame',
    'GPU scene':`readiness: ${d.gpu.state}; last failure (historical): ${d.gpu.lastFailure}`,
    'Native admission':d.backend==='webgl2'?`${scope}: ${d.nativeActors} native / ${d.actors} admitted; fallback reasons: ${failures}`:'not applicable to last completed scene',
    'Hero asset':d.asset,'Hero GPU':`readiness: ${d.gpu.heroState}; last failure (historical): ${d.gpu.lastHeroFailure}`,
    'Player representation':d.frame?`${scope}: ${d.player}`:'not sampled'};
}
async function render(){const registration="serviceWorker"in navigator?await navigator.serviceWorker.getRegistration("./"):null;const params=new URLSearchParams(location.search);const rows={"Game release":"r852-94fdbc27f9f9","Proving Ground build":"PG-1","Save schema":SAVE_VERSION,"Route":location.pathname,"Scenario":[params.get("lab")||"shelters",params.get("scenario")||"timber"].join(" / "),"Seed":params.get("seed")||"CINDER-VERGE-47","Network":navigator.onLine?"online":"offline","Service worker":registration?(navigator.serviceWorker.controller?"controlling":"registered"):"not registered","Storage namespace":storageNamespace,"Viewport":`${innerWidth} × ${innerHeight}`,"Recent errors":errorLog.length?errorLog.join(" · "):"none",...renderDiagnosticsRows(closeViewRenderDiagnostics())};body.replaceChildren(...Object.entries(rows).flatMap(([key,value])=>{const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=key;dd.textContent=String(value);return[dt,dd]}))}
document.querySelector("#pgDiagnosticsToggle")?.addEventListener("click",async()=>{await render();dialog.hidden=false;dialog.showModal()}); // release 467 (Codex audit F002)
document.querySelector("#pgDiagnosticsClose")?.addEventListener("click",()=>dialog.close());
async function resetScratchData(){
  if(!confirm("Reset only Proving Ground scratch data? Production journeys are not affected."))return;
  const button=document.querySelector('#pgReset');if(button)button.disabled=true;
  status.textContent='Waiting for scratch recovery and handoff reset…';
  try{
    await clearCandidateRecoveryForReset(location.href);
    await clearHandoff();
    for(const storage of [localStorage,sessionStorage])for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key===storageNamespace||key?.startsWith(storageNamespace+":"))storage.removeItem(key);}
    status.textContent='Proving Ground scratch data cleared. Reloading…';location.reload();
  }catch(error){releaseCandidateRecoveryReset(error);status.textContent=`Reset stopped: ${error?.message||error}. No automatic reload was performed.`;if(button)button.disabled=false;}
}
document.querySelector('#pgReset')?.addEventListener('click',resetScratchData);
// Release 195: a Glimpse viewer, so a preview can show every Glimpse (the production game opens them in play).
const glimpses=document.querySelector("#pgGlimpses"),glimpseRoot=document.querySelector("#glimpse"),glimpseHint=document.querySelector("#glimpseHint");let glimpseRun=null;
function playGlimpse(id){if(glimpseRun)return;glimpses.close();glimpseRoot.hidden=false;glimpseHint.classList.remove("shown");const started=performance.now(),hintTimer=setTimeout(()=>glimpseHint.classList.add("shown"),2500);const finish=()=>{if(!glimpseRun)return;glimpseRun.stop();glimpseRun=null;clearTimeout(hintTimer);glimpseRoot.hidden=true};glimpseRun=startGlimpse(document.querySelector("#glimpseCanvas"),id,{reduceMotion:matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false,onEnd:finish});glimpseRoot.onclick=()=>{if(performance.now()-started>900)finish()}}
document.querySelector("#pgGlimpseList")?.replaceChildren(...Object.keys(GLIMPSES).map(id=>{const b=document.createElement("button");b.type="button";b.textContent=GLIMPSES[id].name;b.addEventListener("click",()=>playGlimpse(id));return b}));
document.querySelector("#pgGlimpsesToggle")?.addEventListener("click",()=>glimpses.showModal());
document.querySelector("#pgGlimpsesClose")?.addEventListener("click",()=>glimpses.close());
// Release 791 (Tim: a "get latest release" button in the Proving Ground): show this build's release and the newest published
// one, then ask both workers (the laboratory's and the game's) for the new build, wait for them to take over (at most 15 s
// each) and reload onto it. Already on the newest release: nothing reloads.
const latestButton=document.querySelector("#pgLatest"),latestStatus=document.querySelector("#pgLatestStatus");
const currentRelease=()=>document.documentElement.dataset.release||"852";
async function latestRelease(){try{const response=await fetch(releaseIdentityUrl(location.href),{cache:"no-store"});if(!response.ok)return null;const identity=await response.json();return typeof identity?.proposalId==="string"?identity.proposalId:null}catch{return null}}
async function updateWorker(scope){const reg=await navigator.serviceWorker?.getRegistration?.(scope);if(!reg)return null;await reg.update();const worker=reg.installing||reg.waiting;if(worker)await new Promise(done=>{const check=()=>{if(worker.state==="activated"||worker.state==="redundant")done()};worker.addEventListener("statechange",check);check();setTimeout(done,15000)});return reg.scope}
latestButton?.addEventListener("click",async()=>{latestButton.disabled=true;const current=currentRelease();latestStatus.textContent=`Release ${current} · checking…`;const latest=await latestRelease();
  if(latest&&latest===current){latestStatus.textContent=`Release ${current} is the latest.`;latestButton.disabled=false;return}
  if(globalThis.provingGroundJourney?.()&&!confirm("Updating reloads the Proving Ground and closes this scratch copy of your journey (your journey itself is unchanged). Continue?")){latestStatus.textContent=`Release ${current} · latest ${latest||"unknown"}`;latestButton.disabled=false;return}
  latestStatus.textContent=`Release ${current} → ${latest||"latest"} · downloading…`;
  for(const scope of[new URL("./",location.href).href,productionHome(location.href)].filter(Boolean))try{await updateWorker(scope)}catch(error){console.warn("Release check failed; reloading the current build.",error)}
  latestStatus.textContent=`Release ${current} → ${latest||"latest"} · reloading…`;location.reload()});
