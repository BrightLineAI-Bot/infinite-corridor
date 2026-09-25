import "./proving-ground.ts";
import { SAVE_VERSION } from "./types.ts";

const errorLog=[];
const remember=value=>{errorLog.push(String(value?.message||value||"Unknown client error").slice(0,180));if(errorLog.length>5)errorLog.shift()};
addEventListener("error",event=>remember(event.error||event.message));
addEventListener("unhandledrejection",event=>remember(event.reason));
const dialog=document.querySelector("#pgDiagnostics"),body=document.querySelector("#pgDiagnosticsBody"),status=document.querySelector("#pgResetStatus");
const storageNamespace="ic-proving-ground-scratch-v1";
async function render(){const registration="serviceWorker"in navigator?await navigator.serviceWorker.getRegistration("./"):null;const params=new URLSearchParams(location.search);const rows={"Game release":"91","Proving Ground build":"PG-1","Save schema":SAVE_VERSION,"Route":location.pathname,"Scenario":[params.get("lab")||"shelters",params.get("scenario")||"timber"].join(" / "),"Seed":params.get("seed")||"CINDER-VERGE-47","Network":navigator.onLine?"online":"offline","Service worker":registration?(navigator.serviceWorker.controller?"controlling":"registered"):"not registered","Storage namespace":storageNamespace,"Viewport":`${innerWidth} × ${innerHeight}`,"Recent errors":errorLog.length?errorLog.join(" · "):"none"};body.replaceChildren(...Object.entries(rows).flatMap(([key,value])=>{const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=key;dd.textContent=String(value);return[dt,dd]}))}
document.querySelector("#pgDiagnosticsToggle")?.addEventListener("click",async()=>{await render();dialog.showModal()});
document.querySelector("#pgDiagnosticsClose")?.addEventListener("click",()=>dialog.close());
document.querySelector("#pgReset")?.addEventListener("click",()=>{if(!confirm("Reset only Proving Ground scratch data? Production journeys are not affected."))return;for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key?.startsWith(storageNamespace))localStorage.removeItem(key)}sessionStorage.clear();status.textContent="Proving Ground scratch data cleared. Reloading…";setTimeout(()=>location.reload(),250)});
