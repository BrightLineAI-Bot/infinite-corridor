import "./proving-ground.ts";
import { SAVE_VERSION } from "./types.ts";
import { GLIMPSES, GLIMPSE_ORDER } from "./glimpses.ts";
import { startGlimpse } from "./glimpse-render.ts";

const errorLog=[];
const remember=value=>{errorLog.push(String(value?.message||value||"Unknown client error").slice(0,180));if(errorLog.length>5)errorLog.shift()};
addEventListener("error",event=>remember(event.error||event.message));
addEventListener("unhandledrejection",event=>remember(event.reason));
const dialog=document.querySelector("#pgDiagnostics"),body=document.querySelector("#pgDiagnosticsBody"),status=document.querySelector("#pgResetStatus");
const storageNamespace="ic-proving-ground-scratch-v1";
async function render(){const registration="serviceWorker"in navigator?await navigator.serviceWorker.getRegistration("./"):null;const params=new URLSearchParams(location.search);const rows={"Game release":"439","Proving Ground build":"PG-1","Save schema":SAVE_VERSION,"Route":location.pathname,"Scenario":[params.get("lab")||"shelters",params.get("scenario")||"timber"].join(" / "),"Seed":params.get("seed")||"CINDER-VERGE-47","Network":navigator.onLine?"online":"offline","Service worker":registration?(navigator.serviceWorker.controller?"controlling":"registered"):"not registered","Storage namespace":storageNamespace,"Viewport":`${innerWidth} × ${innerHeight}`,"Recent errors":errorLog.length?errorLog.join(" · "):"none"};body.replaceChildren(...Object.entries(rows).flatMap(([key,value])=>{const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=key;dd.textContent=String(value);return[dt,dd]}))}
document.querySelector("#pgDiagnosticsToggle")?.addEventListener("click",async()=>{await render();dialog.showModal()});
document.querySelector("#pgDiagnosticsClose")?.addEventListener("click",()=>dialog.close());
document.querySelector("#pgReset")?.addEventListener("click",()=>{if(!confirm("Reset only Proving Ground scratch data? Production journeys are not affected."))return;for(const storage of [localStorage,sessionStorage])for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key===storageNamespace||key?.startsWith(storageNamespace+":"))storage.removeItem(key)}status.textContent="Proving Ground scratch data cleared. Reloading…";setTimeout(()=>location.reload(),250)});
// Release 195: a Glimpse viewer, so a preview can show every Glimpse (the production game opens them in play).
const glimpses=document.querySelector("#pgGlimpses"),glimpseRoot=document.querySelector("#glimpse"),glimpseHint=document.querySelector("#glimpseHint");let glimpseRun=null;
function playGlimpse(id){if(glimpseRun)return;glimpses.close();glimpseRoot.hidden=false;glimpseHint.classList.remove("shown");const started=performance.now(),hintTimer=setTimeout(()=>glimpseHint.classList.add("shown"),2500);const finish=()=>{if(!glimpseRun)return;glimpseRun.stop();glimpseRun=null;clearTimeout(hintTimer);glimpseRoot.hidden=true};glimpseRun=startGlimpse(document.querySelector("#glimpseCanvas"),id,{reduceMotion:matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false,onEnd:finish});glimpseRoot.onclick=()=>{if(performance.now()-started>900)finish()}}
document.querySelector("#pgGlimpseList")?.replaceChildren(...GLIMPSE_ORDER.map(id=>{const b=document.createElement("button");b.type="button";b.textContent=GLIMPSES[id].name;b.addEventListener("click",()=>playGlimpse(id));return b}));
document.querySelector("#pgGlimpsesToggle")?.addEventListener("click",()=>glimpses.showModal());
document.querySelector("#pgGlimpsesClose")?.addEventListener("click",()=>glimpses.close());
