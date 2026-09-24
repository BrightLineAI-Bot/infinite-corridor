import { createInput } from "./input.ts";
import { render, renderScaleForViewport } from "./renderer.ts";
import { LABORATORIES, DEFAULT_PROVING_SEED, scenariosForLab, createLabFixture, labReport, teleportTargets } from "./proving-ground-labs.ts";
const canvas=document.querySelector("#game"),app=document.querySelector("#app"),ctx=canvas.getContext("2d");
document.body.classList.add("proving-ground");document.querySelectorAll("#hud, dialog, #eventBanner, .story-scene").forEach(element=>element.hidden=true);
const query=new URLSearchParams(location.search),implemented=LABORATORIES.filter(q=>q.status==="implemented");let selectedLab=implemented.some(q=>q.id===query.get("lab"))?query.get("lab"):"shelters";
const panel=document.createElement("aside");panel.id="provingGroundPanel";panel.innerHTML=`
 <header><strong>Developer Proving Ground</strong><span>Developer Proving Ground — progress is never saved · production systems in scratch state</span></header>
 <button id="labHome">Laboratories</button><section id="labLauncher"></section>
 <section id="labControls" hidden><h2 id="labTitle"></h2><p id="labDescription"></p>
  <label>Scenario <select id="scenarioSelect"></select></label>
  <div class="proving-grid"><label>Seed <input id="seedInput" maxlength="80"></label><label>Variant <input id="variantInput" type="number" min="0" max="999"></label></div>
  <div class="proving-buttons"><button id="scenarioPrevious">Previous</button><button id="scenarioNext">Next</button><button id="scenarioGenerate">Generate</button><button id="scenarioReset">Reset same</button><button id="scenarioPause">Pause</button></div>
  <label>Developer teleport <select id="teleportSelect"><option value="">Select target…</option></select></label>
  <pre id="fixtureDiagnostics" aria-live="polite"></pre><p>Move with drag, WASD, or arrow keys. Production combat and Act controls remain available below.</p>
  <div class="proving-buttons"><button id="fixtureCopy">Copy recipe/report</button><button id="fixtureExit">Exit to normal game</button></div>
 </section>`;document.body.append(panel);
const $=selector=>panel.querySelector(selector),launcher=$("#labLauncher"),controls=$("#labControls"),scenarioSelect=$("#scenarioSelect"),seedInput=$("#seedInput"),variantInput=$("#variantInput"),teleportSelect=$("#teleportSelect");
let fixture=null,game=null,paused=false,last=performance.now(),lastDiagnostic=0,input=createInput(document,globalThis,{controlSmoothing:38});
function renderLauncher(){controls.hidden=true;launcher.hidden=false;launcher.replaceChildren();const intro=document.createElement("p");intro.textContent="Choose a production package to instantiate directly. Planned laboratories are shown honestly and cannot be opened yet.";launcher.append(intro);for(const lab of LABORATORIES){const button=document.createElement("button");button.className="lab-card";button.disabled=lab.status!=="implemented";button.innerHTML=`<strong>${lab.label}</strong><span>${lab.description}</span><small>${lab.status==="implemented"?"Available":"Planned — unavailable"}</small>`;if(!button.disabled)button.onclick=()=>openLab(lab.id);launcher.append(button)}}
function syncUrl(){const q=new URLSearchParams({dev:"proving-ground",lab:selectedLab,scenario:scenarioSelect.value,seed:seedInput.value,variant:String(Number(variantInput.value)||0)});history.replaceState(null,"",`?${q}`)}
function fillScenarios(){scenarioSelect.replaceChildren();for(const q of scenariosForLab(selectedLab))scenarioSelect.add(new Option(q.label,q.id));const requested=query.get("lab")===selectedLab?query.get("scenario"):null;if(requested&&[...scenarioSelect.options].some(q=>q.value===requested))scenarioSelect.value=requested}
function openLab(id){selectedLab=id;const meta=LABORATORIES.find(q=>q.id===id);launcher.hidden=true;controls.hidden=false;$("#labTitle").textContent=meta.label;$("#labDescription").textContent=meta.description;fillScenarios();seedInput.value=query.get("seed")||DEFAULT_PROVING_SEED;variantInput.value=query.get("variant")||"0";generate()}
function generate(){try{fixture=createLabFixture({lab:selectedLab,scenario:scenarioSelect.value,seed:seedInput.value,variant:Number(variantInput.value)||0,now:performance.now()});game=fixture.game;paused=false;input.reset();last=performance.now();fillTeleports();syncUrl();updateDiagnostics(true)}catch(error){$("#fixtureDiagnostics").textContent=`FIXTURE ERROR\n${error.stack||error}`}}
function fillTeleports(){teleportSelect.replaceChildren(new Option("Select target…",""));for(const q of teleportTargets(fixture))teleportSelect.add(new Option(q.label,q.id))}
function report(){const data=labReport(fixture);data.paused=paused;data.url=location.href;data.teleportTargets=teleportTargets(fixture).map(q=>({id:q.id,label:q.label,x:q.x,y:q.y}));return data}
function updateDiagnostics(force=false){if(!fixture)return;const now=performance.now();if(!force&&now-lastDiagnostic<220)return;lastDiagnostic=now;$("#fixtureDiagnostics").textContent=JSON.stringify(report(),null,2);$("#scenarioPause").textContent=paused?"Resume":"Pause"}
function adjacent(delta){const options=[...scenarioSelect.options],index=scenarioSelect.selectedIndex;scenarioSelect.value=options[(index+delta+options.length)%options.length].value;variantInput.value=String(Math.max(0,(Number(variantInput.value)||0)+delta));generate()}
function resize(){const rect=app.getBoundingClientRect(),d=renderScaleForViewport(rect.width,rect.height,devicePixelRatio||1,"balanced");canvas.width=Math.max(1,Math.round(rect.width*d));canvas.height=Math.max(1,Math.round(rect.height*d));canvas.style.width=`${rect.width}px`;canvas.style.height=`${rect.height}px`;ctx.setTransform(d,0,0,d,0,0);ctx.imageSmoothingEnabled=false}
function frame(now){const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;input.update(dt);if(game&&!paused)game.update(dt,input,now);if(game)render(ctx,game,canvas.clientWidth,canvas.clientHeight,now);updateDiagnostics();requestAnimationFrame(frame)}
$("#labHome").onclick=renderLauncher;$("#scenarioPrevious").onclick=()=>adjacent(-1);$("#scenarioNext").onclick=()=>adjacent(1);$("#scenarioGenerate").onclick=generate;$("#scenarioReset").onclick=generate;scenarioSelect.onchange=generate;
$("#scenarioPause").onclick=()=>{paused=!paused;game?.setPaused(paused,performance.now());input.reset();updateDiagnostics(true)};
teleportSelect.onchange=()=>{const target=teleportTargets(fixture).find(q=>q.id===teleportSelect.value);if(target){game.player.x=target.x;game.player.y=target.y;game.projectiles=[];game.effects=[];game.sync();updateDiagnostics(true)}teleportSelect.value=""};
$("#fixtureCopy").onclick=async()=>navigator.clipboard?.writeText(JSON.stringify(report(),null,2));$("#fixtureExit").onclick=()=>location.href=location.pathname;
addEventListener("resize",resize,{passive:true});document.addEventListener("visibilitychange",()=>{if(document.hidden&&game){paused=true;game.setPaused(true,performance.now());input.reset();updateDiagnostics(true)}});
resize();renderLauncher();if(query.get("lab")&&implemented.some(q=>q.id===selectedLab))openLab(selectedLab);requestAnimationFrame(frame);
