import "./proving-ground.js?v=icp_d720b6b99e514d4192eb0762_81135070ec57c4c1";
import { SAVE_VERSION } from "./types.js?v=icp_d720b6b99e514d4192eb0762_81135070ec57c4c1";

const errorLog=[];
const remember=value=>{errorLog.push(String(value?.message||value||"Unknown client error").slice(0,180));if(errorLog.length>5)errorLog.shift()};
addEventListener("error",event=>remember(event.error||event.message));
addEventListener("unhandledrejection",event=>remember(event.reason));
const dialog=document.querySelector("#pgDiagnostics"),body=document.querySelector("#pgDiagnosticsBody"),status=document.querySelector("#pgResetStatus");
const storageNamespace="ic-preview-icp_d720b6b99e514d4192eb0762_81135070ec57c4c1-scratch";
async function render(){const registration="serviceWorker"in navigator?await navigator.serviceWorker.getRegistration("./"):null;const params=new URLSearchParams(location.search);const rows={"Game release":"icp_d720b6b99e514d4192eb0762_81135070ec57c4c1","Proving Ground build":"PG-1","Save schema":SAVE_VERSION,"Route":location.pathname,"Scenario":[params.get("lab")||"shelters",params.get("scenario")||"timber"].join(" / "),"Seed":params.get("seed")||"CINDER-VERGE-47","Network":navigator.onLine?"online":"offline","Service worker":registration?(navigator.serviceWorker.controller?"controlling":"registered"):"not registered","Storage namespace":storageNamespace,"Viewport":`${innerWidth} × ${innerHeight}`,"Recent errors":errorLog.length?errorLog.join(" · "):"none"};body.replaceChildren(...Object.entries(rows).flatMap(([key,value])=>{const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=key;dd.textContent=String(value);return[dt,dd]}))}
document.querySelector("#pgDiagnosticsToggle")?.addEventListener("click",async()=>{await render();dialog.showModal()});
document.querySelector("#pgDiagnosticsClose")?.addEventListener("click",()=>dialog.close());
document.querySelector("#pgReset")?.addEventListener("click",()=>{if(!confirm("Reset only Proving Ground scratch data? Production journeys are not affected."))return;for(const storage of [localStorage,sessionStorage])for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key===storageNamespace||key?.startsWith(storageNamespace+":"))storage.removeItem(key)}status.textContent="Proving Ground scratch data cleared. Reloading…";setTimeout(()=>location.reload(),250)});
