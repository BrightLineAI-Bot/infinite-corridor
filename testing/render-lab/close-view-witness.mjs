// Test-only evidence for the three public Stillworks and crawl fixtures.
export const STILLWORKS_CASES = Object.freeze([
  'stillworks-void-walker', 'routing-crawl-keep', 'routing-crawl-pentagon',
]);
export const CLEAVER_CASE = 'cleaver-echo-inspection';
export const SUMMIT_CASE = 'great-tree-summit';
export const COMBAT_ACTION_CASES = ['pike-echo-inspection', 'cast-skill-aerial-step', 'blade-hammerfall-brute'];
export const DOOR_WAYFINDING_CASES = Object.freeze(['terrain-pentagon', 'cube-doors']);

async function holdKey(call, wait, key, ms) {
  const pressed = [];
  try {
    for (const letter of key) {
      const upper = letter.toUpperCase();
      const args = { key:letter, code:'Key' + upper, windowsVirtualKeyCode:upper.charCodeAt(0) };
      await call('Input.dispatchKeyEvent', { ...args, type:'keyDown' });
      pressed.push(args);
    }
    await wait(ms);
  } finally {
    for (const args of pressed.reverse()) await call('Input.dispatchKeyEvent', { ...args, type:'keyUp' });
  }
}

export async function cleaverWitness({ call, evaluate, wait, capture }) {
  const read = () => evaluate(`(() => {
    const g = globalThis.provingGroundGame?.(), a = g?.player?.attackVisual;
    return { weapon:a?.weaponKind, step:a?.primaryMotion?.step,
      acceptedAt:a?.cleaverChoreography?.acceptedLogicalMs, contactMs:a?.meleeAction?.contactMs,
      durationMs:a?.durationMs, pending:!!g?.pendingMeleeContact };
  })()`);
  const before = await read();
  const screenshots = [await capture('before-attack')];
  await holdKey(call, wait, 'j', 45);
  const samples = [];
  for (let i = 0; i < 12; i++) {
    const sample = await read();
    samples.push(sample);
    if (sample.weapon === 'verge-cleaver' && Number.isFinite(sample.acceptedAt)
        && sample.acceptedAt !== before.acceptedAt) break;
    await wait(25);
  }
  const accepted = samples.at(-1);
  const observed = accepted.weapon === 'verge-cleaver' && accepted.step === 1
    && Number.isFinite(accepted.acceptedAt) && accepted.acceptedAt !== before.acceptedAt
    && accepted.contactMs > 0 && accepted.contactMs < accepted.durationMs;
  if (observed) screenshots.push(await capture('after-accepted-attack'));
  return { status: observed ? 'observed' : 'blocked', before, samples, screenshots };
}

export async function combatActionWitness(scenario, { call, evaluate, wait, capture }) {
  const read = () => evaluate(`(() => {
    const g=globalThis.provingGroundGame?.(), p=g?.player, a=p?.attackVisual;
    return { attackUntil:p?.attackUntil, weapon:a?.weaponKind, step:a?.primaryStep,
      castUntil:p?.castUntil, spell:p?.castVisual?.spellKind, jumpUntil:g?.jumpUntil, jumpStart:g?.jumpStart,
      hammerId:g?.hammerfallStartup?.effectId ?? a?.hammerEffectId,
      activeSkill:g?.save.magicSkills?.active?.id, message:g?.message };
  })()`);
  const before=await read(), samples=[];
  const pike=scenario===COMBAT_ACTION_CASES[0], aerial=scenario===COMBAT_ACTION_CASES[1];
  await holdKey(call,wait,pike?'j':aerial?'f':'q',120);
  let accepted;
  for(let i=0;i<8;i++){
    const state=await read();samples.push(state);
    if(pike ? state.weapon==='cinder-pike' && state.step===1 && state.attackUntil>before.attackUntil
      : aerial ? state.spell==='aerial-step' && state.activeSkill==='aerial-step'
        && Number.isFinite(state.castUntil) && state.castUntil>(before.castUntil ?? 0)
      : state.hammerId!=null && state.hammerId!==before.hammerId){
      accepted=state;break;
    }
    await wait(90);
  }
  const screenshots=[];
  let jump;
  if (accepted && aerial) {
    await holdKey(call,wait,'k',120);
    for(let i=0;i<8;i++){
      const state=await read();samples.push(state);
      if(Number.isFinite(state.jumpStart) && state.jumpStart!==before.jumpStart && state.jumpUntil>before.jumpUntil){
        jump=state;break;
      }
      await wait(90);
    }
  }
  if(accepted)screenshots.push(await capture(jump?'aerial-step-jump':'accepted-input'));
  return {status:accepted&&(!aerial||jump)?'observed':'blocked',before,accepted,jump,samples,screenshots};
}

export async function routePanelWitness(scenario, { evaluate, capture }) {
  const report = await evaluate(`(() => {
    const button = document.querySelector('#scenarioRoutes');
    if (!button) return null;
    button.click();
    const panel = document.querySelector('#pgRoutes'), routes = panel?.querySelector('[aria-label="Known floor routes"]');
    const headings = [...(panel?.querySelectorAll('summary') || [])].map(node => node.textContent);
    return { open:panel?.open === true, current:panel?.querySelector('.dungeon-wayfinding p')?.textContent,
      routes:routes ? [...routes.children].map(node => node.textContent) : null, headings };
  })()`);
  if (!report) return null; // Earlier artifacts have no route panel.
  const pentagonOverview = scenario !== 'routing-crawl-pentagon'
    || (report.headings.some(text => text.startsWith('Discovered chambers ('))
      && report.headings.some(text => text.startsWith('Mapped connections (')));
  const observed = report.open && report.current?.startsWith('You are here:')
    && Array.isArray(report.routes) && pentagonOverview;
  return { status: observed ? 'observed' : 'blocked', report,
    screenshots: report.open ? [await capture('known-routes')] : [] };
}

// r868: exercise only the public Proving Ground controls and the production route
// panel. A traversal receipt is optional and is recorded only when normal Act
// changes the production area after a public teleport to an actual door.
export async function doorWayfindingWitness(scenario, { call, evaluate, wait, capture }) {
  let before = await evaluate(`(() => {
    const g=globalThis.provingGroundGame?.(), button=document.querySelector('#scenarioRoutes');
    const report=JSON.parse(document.querySelector('#fixtureDiagnostics').textContent);
    return {area:g?.areaId(),enabled:button?.disabled===false,doors:report.doorWayfinding||[],
      scenario:report.scenario,scratch:report.scratch,player:report.player};
  })()`);
  const screenshots=[];
  let discovery=null;
  if(scenario==='cube-doors'&&before.scratch&&before.doors.length<3){
    discovery=await evaluate(`(() => {
      const select=document.querySelector('#teleportSelect'),id='lab-stair-0-down';
      if(![...select.options].some(option=>option.value===id))return {available:false};
      select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));
      const resume=document.querySelector('#scenarioPause');
      if(resume?.textContent==='Resume')resume.click();
      return {available:true,target:id};
    })()`);
    if(discovery.available){
      await wait(450);
      const refreshed=await evaluate(`(() => {
        const g=globalThis.provingGroundGame?.(),report=JSON.parse(document.querySelector('#fixtureDiagnostics').textContent);
        return {area:g?.areaId(),enabled:document.querySelector('#scenarioRoutes')?.disabled===false,
          doors:report.doorWayfinding||[],scenario:report.scenario,scratch:report.scratch,player:report.player};
      })()`);
      discovery.revealed=refreshed.doors.length;
      before=refreshed;
    }
  }
  if(!before.scratch || before.scenario!==scenario || !before.enabled || !before.doors.length)
    return {status:'blocked',before,discovery,reason:'Public dungeon route controls or doors unavailable',screenshots};
  await evaluate(`document.querySelector('#scenarioRoutes').click()`);
  await wait(120);
  const opened=await evaluate(`(() => {
    const panel=document.querySelector('#pgRoutes'), button=panel?.querySelector('button.dungeon-door-waypoint');
    return {open:panel?.open===true,label:button?.getAttribute('aria-label')||null,
      pressed:button?.getAttribute('aria-pressed')||null,doorId:button?.closest('[data-door-id]')?.dataset.doorId||null};
  })()`);
  if(!opened.open || !opened.label?.startsWith('Add waypoint for ') || opened.pressed!=='false' || !opened.doorId)
    return {status:'blocked',before,opened,reason:'Add waypoint control unavailable',screenshots};
  screenshots.push(await capture('routes-before-waypoint'));
  await evaluate(`document.querySelector('#pgRoutes button.dungeon-door-waypoint').click()`);
  await wait(120);
  const marked=await evaluate(`(() => {
    const panel=document.querySelector('#pgRoutes'), button=panel?.querySelector('[data-door-id=${JSON.stringify(opened.doorId)}] button.dungeon-door-waypoint');
    const report=JSON.parse(document.querySelector('#fixtureDiagnostics').textContent);
    const door=(report.doorWayfinding||[]).find(q=>q.id===${JSON.stringify(opened.doorId)});
    return {open:panel?.open===true,label:button?.getAttribute('aria-label')||null,
      pressed:button?.getAttribute('aria-pressed')||null,door:door||null};
  })()`);
  const markedObserved=marked.open && marked.pressed==='true' && marked.label?.startsWith('Remove waypoint for ')
    && marked.door?.slot===1;
  if(markedObserved)screenshots.push(await capture('routes-selected-waypoint'));

  // Use the same public Add controls for the remaining two slots. The fourth
  // control, when this discovered floor exposes one, must be disabled at the cap.
  const threePoints=await evaluate(`(() => {
    let panel=document.querySelector('#pgRoutes');
    for(let attempt=0;attempt<3&&panel.querySelectorAll('button.dungeon-door-waypoint[aria-pressed="true"]').length<3;attempt++){
      const button=[...panel.querySelectorAll('button.dungeon-door-waypoint')]
        .find(candidate=>candidate.getAttribute('aria-pressed')==='false'&&!candidate.disabled);
      if(!button)break;
      button.click();
      panel=document.querySelector('#pgRoutes');
    }
    const report=JSON.parse(document.querySelector('#fixtureDiagnostics').textContent);
    const selected=(report.doorWayfinding||[]).filter(door=>door.slot>0).sort((a,b)=>a.slot-b.slot);
    const pressed=[...panel.querySelectorAll('button.dungeon-door-waypoint[aria-pressed="true"]')]
      .map(button=>button.closest('[data-door-id]')?.dataset.doorId).filter(Boolean);
    const unselected=[...panel.querySelectorAll('button.dungeon-door-waypoint[aria-pressed="false"]')];
    return {selected,pressed,capDisabled:unselected.length?unselected.every(button=>button.disabled):null};
  })()`);
  threePoints.observed=threePoints.selected.length===3
    && threePoints.selected.every((door,index)=>door.slot===index+1)
    && threePoints.pressed.length===3 && threePoints.selected.every(door=>threePoints.pressed.includes(door.id))
    && threePoints.capDisabled!==false;
  if(threePoints.observed)screenshots.push(await capture('routes-three-waypoints'));

  // Best-effort actual door traversal. The teleport is the supported PG selector;
  // Act remains ordinary keyboard input. Never manufacture a transition receipt.
  const traversal=await evaluate(`(() => {
    const info=JSON.parse(document.querySelector('#fixtureDiagnostics').textContent), select=document.querySelector('#teleportSelect');
    const scoped=${JSON.stringify(opened.doorId)}, raw=scoped.slice(scoped.lastIndexOf('::')+2);
    const g=globalThis.provingGroundGame?.();
    const steps=g?.map.objects.filter(o=>o.kind==='buildingStair'&&o.toId&&!o.lock&&!o.barred&&!o.sigil&&!o.bossGate&&!o.plateLock)||[];
    const step=steps.find(o=>o.id===raw)||steps[0],id=step?.id;
    const door=info.teleportTargets?.find(q=>q.id===id);
    if(!door || ![...select.options].some(o=>o.value===door.id))return {available:false};
    select.value=door.id;select.dispatchEvent(new Event('change',{bubbles:true}));
    return {available:true,target:door,toArea:step.toId,doorName:step.name,doorId:step.id};
  })()`);
  const publicDoorTravel=async step=>{
    if(!step?.available)return {available:false};
    await evaluate(`(() => {
      const select=document.querySelector('#teleportSelect'),id=${JSON.stringify(step.doorId)};
      if(![...select.options].some(o=>o.value===id))return false;
      select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));return true;
    })()`);
    await evaluate(`document.querySelector('#scenarioPause').textContent==='Resume'&&document.querySelector('#scenarioPause').click()`);
    await wait(180);await holdKey(call,wait,'e',80);
    let after;
    for(let i=0;i<8;i++){
      await evaluate(`(() => {
        const dialog=document.querySelector('#pgInteraction');
        if(dialog?.open&&dialog.querySelector('h2')?.textContent===${JSON.stringify(step.doorName)})dialog.querySelector('.pg-interaction-actions button:not(:disabled)')?.click();
      })()`);
      after=await evaluate(`globalThis.provingGroundGame?.().areaId()`);
      if(after===step.toArea)break;
      await wait(100);
    }
    return {...step,after,observed:after===step.toArea};
  };
  const reciprocalStep=toArea=>evaluate(`(() => {
    const info=JSON.parse(document.querySelector('#fixtureDiagnostics').textContent),select=document.querySelector('#teleportSelect'),g=globalThis.provingGroundGame?.();
    const step=g?.map.objects.find(o=>o.kind==='buildingStair'&&o.toId===${JSON.stringify(toArea)}&&!o.lock&&!o.barred&&!o.sigil&&!o.bossGate&&!o.plateLock);
    const door=step&&info.teleportTargets?.find(q=>q.id===step.id);
    return step&&door&&[...select.options].some(o=>o.value===door.id)?{available:true,target:door,toArea:step.toId,doorName:step.name,doorId:step.id}:{available:false};
  })()`);
  const differentStep=exclude=>evaluate(`(() => {
    const info=JSON.parse(document.querySelector('#fixtureDiagnostics').textContent),select=document.querySelector('#teleportSelect'),g=globalThis.provingGroundGame?.();
    const step=g?.map.objects.find(o=>o.kind==='buildingStair'&&o.id!==${JSON.stringify(exclude)}&&o.toId&&!o.lock&&!o.barred&&!o.sigil&&!o.bossGate&&!o.plateLock&&info.teleportTargets?.some(q=>q.id===o.id));
    const door=step&&info.teleportTargets.find(q=>q.id===step.id);
    return step&&door&&[...select.options].some(o=>o.value===door.id)?{available:true,target:door,toArea:step.toId,doorName:step.name,doorId:step.id}:{available:false};
  })()`);
  if(traversal.available){
    await evaluate(`document.querySelector('#pgRoutes form button').click()`);
    Object.assign(traversal,await publicDoorTravel(traversal));
    if(traversal.observed){
      await wait(250);
      traversal.arrival=await evaluate(`JSON.parse(document.querySelector('#fixtureDiagnostics').textContent).doorWayfinding?.find(door=>door.mark==='arrival')||null`);
      screenshots.push(await capture('normal-act-door-traversal'));
      const back=await publicDoorTravel(await reciprocalStep(before.area));
      const different=back.observed?await publicDoorTravel(await differentStep(traversal.doorId)):{available:false};
      const returned=different.observed?await publicDoorTravel(await reciprocalStep(before.area)):{available:false};
      traversal.roundTrip={back,different,returned};
      if(returned.observed){
        await wait(250);
        traversal.returnMarks=await evaluate(`(() => {
          const doors=JSON.parse(document.querySelector('#fixtureDiagnostics').textContent).doorWayfinding||[];
          return {arrival:doors.find(door=>door.mark==='arrival')||null,visited:doors.filter(door=>door.mark==='visited')};
        })()`);
        traversal.differentDoorObserved=traversal.returnMarks.arrival?.id?.endsWith('::'+different.doorId)
          && traversal.returnMarks.visited.some(door=>door.id.endsWith('::'+traversal.doorId));
        if(traversal.differentDoorObserved)screenshots.push(await capture('different-door-return-blue-purple'));
      }
    }
  }
  const required=markedObserved&&(scenario==='cube-doors' ? threePoints.observed
    : traversal.arrival&&traversal.differentDoorObserved);
  return {status:required?'observed':'blocked',before,discovery,opened,marked,threePoints,traversal,
    compassTrueNorth:{status:'not-evaluated-here',reason:'The scratch Proving Ground does not drive the production HUD compass; run.mjs evaluates it separately on the exact release.'},
    remainingVisualRequirement:required?[]:
      [scenario==='cube-doors'?'Three public saved points were not safely observed':'Blue actual arrival or purple prior door after a different-door return was not safely observed'],screenshots};
}

export async function mainHudCompassWitness({ call, evaluate, navigate, wait, capture, releaseUrl }) {
  const seeded=await evaluate(`(() => {
    const g=globalThis.provingGroundGame?.();if(!g)return null;
    g.sync();const copy=structuredClone(g.save);let cleared=0;
    for(const area of Object.values(copy.dungeonDoorNavigation?.areas||{})){
      if(Array.isArray(area.waypointDoorIds)){cleared+=area.waypointDoorIds.length;area.waypointDoorIds=[];}
    }
    localStorage.setItem('infinite-corridor:active-slot-v1','3');
    localStorage.setItem('infinite-corridor:slot-mirror:3',JSON.stringify(copy));
    return {area:g.areaId(),seed:copy.seed,slot:3,cleared,sourceWaypoints:Object.values(g.save.dungeonDoorNavigation?.areas||{}).reduce((n,a)=>n+(a.waypointDoorIds?.length||0),0)};
  })()`);
  if(!seeded||seeded.cleared<3||seeded.sourceWaypoints<3)return {status:'blocked',seeded,reason:'Scratch clone with three source points was unavailable',screenshots:[]};
  await navigate(releaseUrl);
  let before;
  for(let i=0;i<40;i++){
    before=await evaluate(`(() => {
      const compass=document.querySelector('#navCompass'),arrow=document.querySelector('#navManualArrow'),canvas=document.querySelector('#game'),cam=globalThis.__closeViewCam?.get(),rect=canvas?.getBoundingClientRect();
      return {label:compass?.getAttribute('aria-label')||null,hidden:compass?.hidden!==false,north:compass?.classList.contains('north')===true,
        transform:arrow?.style.transform||'',yaw:cam?.yaw,valid:cam?.valid===true,canvas:rect&&{left:rect.left,top:rect.top,width:rect.width,height:rect.height}};
    })()`);
    if(before?.label==='True north'&&!before.hidden&&before.north&&before.valid&&before.canvas?.width>0)break;
    await wait(125);
  }
  const rotation=value=>Number(/^rotate\((-?[\d.]+)deg\)$/.exec(value||'')?.[1]);
  const firstRotation=rotation(before?.transform),screenshots=[];
  if(before?.label!=='True north'||before.hidden||!before.north||!before.valid||!Number.isFinite(firstRotation))
    return {status:'blocked',seeded,before,reason:'Visible normal-game True north HUD was unavailable',screenshots};
  screenshots.push(await capture('hud-true-north-before-drag'));
  const x=before.canvas.left+before.canvas.width*.72,y=before.canvas.top+before.canvas.height*.42;
  await call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+110,y:y+8,button:'left',buttons:1});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+110,y:y+8,button:'left',buttons:0,clickCount:1});
  await wait(350);
  const after=await evaluate(`(() => {
    const compass=document.querySelector('#navCompass'),arrow=document.querySelector('#navManualArrow'),cam=globalThis.__closeViewCam?.get();
    return {label:compass?.getAttribute('aria-label')||null,hidden:compass?.hidden!==false,north:compass?.classList.contains('north')===true,
      transform:arrow?.style.transform||'',yaw:cam?.yaw,valid:cam?.valid===true};
  })()`);
  const secondRotation=rotation(after?.transform),degrees=yaw=>yaw*180/Math.PI,
    wrap=value=>((value+180)%360+360)%360-180;
  const yawChanged=Number.isFinite(before.yaw)&&Number.isFinite(after?.yaw)&&Math.abs(wrap(degrees(after.yaw-before.yaw)))>5;
  const northInvariant=Number.isFinite(firstRotation)&&Number.isFinite(secondRotation)
    && Math.abs(wrap(firstRotation+degrees(before.yaw)+90))<=2
    && Math.abs(wrap(secondRotation+degrees(after.yaw)+90))<=2;
  const observed=yawChanged&&northInvariant&&after.label==='True north'&&!after.hidden&&after.north&&after.valid;
  if(observed)screenshots.push(await capture('hud-true-north-after-drag'));
  return {status:observed?'observed':'blocked',seeded,before:{...before,rotation:firstRotation},after:{...after,rotation:secondRotation},yawChanged,northInvariant,screenshots};
}

export async function seedOverworldManualJourney({ evaluate }) {
  return evaluate(`(() => {
    const g=globalThis.provingGroundGame?.();if(!g)return null;
    g.sync();const copy=structuredClone(g.save),rx=0,ry=0;
    for(const area of Object.values(copy.dungeonDoorNavigation?.areas||{}))if(Array.isArray(area.waypointDoorIds))area.waypointDoorIds=[];
    Object.assign(copy.session,{area:'overworld',rx,ry,x:16,y:16,activeDungeonId:null,activeDungeonLevelId:null,dungeonReturn:null});
    Object.assign(copy.position,{area:'overworld',rx,ry,x:16,y:16});
    copy.overworldCloseView=true;
    copy.manualWaypoint={kind:'section',area:'overworld',rx:rx+1,ry,label:'Render preflight east'};
    localStorage.setItem('infinite-corridor:slot-mirror:2',JSON.stringify(copy));
    return {slot:2,seed:copy.seed,from:{rx,ry},target:{rx:rx+1,ry},bearingDegrees:0,overworldCloseView:copy.overworldCloseView};
  })()`);
}

export async function overworldManualArrowWitness({ call, evaluate, navigate, wait, capture, releaseUrl, seeded }) {
  if(!seeded?.overworldCloseView||seeded.bearingDegrees!==0)return {status:'blocked',seeded,reason:'Synthetic overworld journey was not prepared',screenshots:[]};
  await evaluate(`localStorage.setItem('infinite-corridor:active-slot-v1','2')`);
  await navigate(releaseUrl);
  const read=()=>evaluate(`(() => {
    const compass=document.querySelector('#navCompass'),arrow=document.querySelector('#navManualArrow'),canvas=document.querySelector('#game'),cam=globalThis.__closeViewCam?.get(),rect=canvas?.getBoundingClientRect();
    return {label:compass?.getAttribute('aria-label')||null,compassHidden:compass?.hidden!==false,arrowHidden:arrow?.hidden!==false,
      dormant:arrow?.classList.contains('dormant')===true,arrived:arrow?.classList.contains('arrived')===true,
      transform:arrow?.style.transform||'',yaw:cam?.yaw,valid:cam?.valid===true,canvas:rect&&{left:rect.left,top:rect.top,width:rect.width,height:rect.height}};
  })()`);
  let before;
  for(let i=0;i<40;i++){before=await read();if(before?.label?.includes('Manual waypoint: Render preflight east')&&!before.compassHidden&&!before.arrowHidden&&!before.dormant&&!before.arrived&&before.valid&&before.canvas?.width>0)break;await wait(125);}
  const rotation=value=>Number(/^rotate\((-?[\d.]+)deg\)$/.exec(value||'')?.[1]),firstRotation=rotation(before?.transform),screenshots=[];
  if(!before?.label?.includes('Manual waypoint: Render preflight east')||before.compassHidden||before.arrowHidden||before.dormant||before.arrived||!before.valid||!Number.isFinite(firstRotation))
    return {status:'blocked',seeded,before,reason:'Visible eastward manual arrow was unavailable',screenshots};
  screenshots.push(await capture('overworld-manual-east-before-drag'));
  const x=before.canvas.left+before.canvas.width*.72,y=before.canvas.top+before.canvas.height*.42;
  await call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+110,y:y+8,button:'left',buttons:1});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+110,y:y+8,button:'left',buttons:0,clickCount:1});
  await wait(350);
  const after=await read(),secondRotation=rotation(after?.transform),degrees=yaw=>yaw*180/Math.PI,wrap=value=>((value+180)%360+360)%360-180;
  const yawChanged=Number.isFinite(before.yaw)&&Number.isFinite(after?.yaw)&&Math.abs(wrap(degrees(after.yaw-before.yaw)))>5;
  const beforeBearing=wrap(firstRotation+degrees(before.yaw)),afterBearing=wrap(secondRotation+degrees(after.yaw));
  const bearingStable=Number.isFinite(beforeBearing)&&Number.isFinite(afterBearing)&&Math.abs(wrap(beforeBearing-seeded.bearingDegrees))<=2&&Math.abs(wrap(afterBearing-seeded.bearingDegrees))<=2;
  const observed=yawChanged&&bearingStable&&after.label?.includes('Manual waypoint: Render preflight east')&&!after.compassHidden&&!after.arrowHidden&&!after.dormant&&!after.arrived&&after.valid;
  if(observed)screenshots.push(await capture('overworld-manual-east-after-drag'));
  return {status:observed?'observed':'blocked',seeded,before:{...before,rotation:firstRotation,bearing:beforeBearing},after:{...after,rotation:secondRotation,bearing:afterBearing},yawChanged,bearingStable,screenshots};
}

export async function summitWitness({ call, evaluate, wait, capture }) {
  const read = () => evaluate(`(() => {
    const g = globalThis.provingGroundGame?.();
    const r = JSON.parse(document.querySelector('#fixtureDiagnostics').textContent);
    const run = g?.save.consequences.dungeons[g.areaId()], route = run?.skySummitRoute;
    return { scratch:r.scratch, area:r.area, identity:r.identity, section:r.diagnostics?.section,
      gate:r.diagnostics?.summit?.gateId, alive:r.enemies.alive, wave:run?.skyWave,
      route:route && { from:route.from, to:route.to } };
  })()`);
  const before = await read();
  if (!before.scratch || before.area !== 'overworld' || !before.gate || !before.section)
    return { status: 'blocked', before, screenshots: [] };
  const screenshots = [await capture('summit-gate')];
  await holdKey(call, wait, 'e', 60);
  let after;
  for (let i = 0; i < 8; i++) {
    after = await read();
    if (after.area === 'dungeon') break;
    await wait(100);
  }
  const { from, to } = after.route || {};
  const observed = after.scratch && after.area === 'dungeon' && after.wave === 0 && after.alive > 0
    && from?.rx === before.section.rx && from?.ry === before.section.ry
    && Number.isInteger(to?.rx) && Number.isInteger(to?.ry)
    && (to.rx !== from.rx || to.ry !== from.ry);
  if (observed) screenshots.push(await capture('cloud-hold-entry'));
  return { status: observed ? 'observed' : 'blocked', before, after, screenshots };
}

const directions = [
  ['w', 0], ['d', Math.PI / 2], ['s', Math.PI], ['a', -Math.PI / 2],
];

export function movementKey(yaw, dx, dy) {
  if (![yaw, dx, dy].every(Number.isFinite) || Math.hypot(dx, dy) < .01) return null;
  const angle = Math.atan2(dy, dx) - yaw;
  return directions.reduce((best, next) =>
    Math.cos(angle - next[1]) > Math.cos(angle - best[1]) ? next : best)[0];
}

export async function closeViewWitness(scenario, { call, evaluate, wait, capture, checkpoint, walkerDiagnostics }) {
  const pose = () => evaluate(`(() => {
    const g = globalThis.provingGroundGame?.(), p = g?.player, c = globalThis.__closeViewCam?.get();
    return p && c?.valid && c.drawn ? {x:p.x,y:p.y,hp:p.hp,yaw:c.yaw,inputYaw:c.inputYaw,distance:c.distance,
      area:g.areaId(), support:g.map.tiles[Math.floor(p.y+.75)*g.map.width+Math.floor(p.x+.5)]?.elev,
      awake:g.enemies.some(e=>e.pentFinaleBeast==='voidWalker' && e.pentArenaAwake),
      warnings:(g.packEffects||[]).filter(f=>f.kind.startsWith('void') && f.arming>0).map(f=>f.kind).slice(0,32)} : null;
  })()`);
  const hold = (key, ms) => holdKey(call, wait, key, ms);
  const before = await pose();
  if (!before || !Number.isFinite(before.yaw)) return { status: 'blocked', reason: 'No camera/player observation' };
  if (scenario === STILLWORKS_CASES[0]) {
    const encounter = [];
    const probe=async id=>{
      const expected=await evaluate(`(() => {
        const report=JSON.parse(document.querySelector('#fixtureDiagnostics').textContent);
        const target=report.teleportTargets.find(q=>q.id===${JSON.stringify(id)});
        const select=document.querySelector('#teleportSelect');
        if(!target || ![...select.options].some(o=>o.value===target.id))return null;
        select.value=target.id;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        return target;
      })()`);
      await wait(350);
      const current=await pose();
      return expected && current && Math.hypot(current.x-expected.x,current.y-expected.y)<.35 ? current : null;
    };
    if(walkerDiagnostics){
      checkpoint?.('walker-camera');
      await call('Page.bringToFront',{});
      const setup=await evaluate(`(() => {
        const g=globalThis.provingGroundGame?.(), c=globalThis.__closeViewCam?.get();
        const e=g?.enemies.find(q=>q.pentFinaleBeast==='voidWalker' && q.kind==='voidWalker');
        const info=JSON.parse(document.querySelector('#fixtureDiagnostics').textContent);
        const at=info.teleportTargets.find(q=>q.id==='stillworks-exposed');
        if(!info.scratch || info.scenario!=='stillworks-void-walker' || !g?.map?.stillworks || !e || !at || !c?.valid)return null;
        // Select the attack in this disposable encounter. Production scheduling, aim and effects still run normally.
        e.packAttacks=['voidHand']; e.packBossAttacks=[];
        const target=Math.atan2(e.y-at.y,e.x-at.x), angle=target-c.yaw;
        const error=Math.atan2(Math.sin(angle),Math.cos(angle));
        return {dx:error,paused:g.paused || info.paused,visibility:document.visibilityState,clock:g.lastUpdateNow};
      })()`);
      if(!setup)return {status:'blocked',before,reason:'Stillworks scratch setup unavailable',screenshots:[]};
      if(setup.paused && setup.visibility==='visible')
        await evaluate('document.querySelector("#scenarioPause").textContent==="Resume" && document.querySelector("#scenarioPause").click()');
      const screenshots=[], phases=[];
      const beginPhase=async phase=>evaluate(`(() => {
        const witness={status:'loading'};
        globalThis.__preflightWalkerPhase=witness;
        const deadline=performance.now()+30000;
        import(${JSON.stringify(walkerDiagnostics)}).then(({closeViewRenderDiagnostics,closeViewPan,CLOSE_VIEW})=>{
          if(${JSON.stringify(phase)}==='windup')
            closeViewPan(${JSON.stringify(setup.dx)}/CLOSE_VIEW.crescent.yaw,0,performance.now());
          witness.status='sampling';
          function sample(){
            const g=globalThis.provingGroundGame?.(), e=g?.enemies.find(q=>q.pentFinaleBeast==='voidWalker');
            const d=closeViewRenderDiagnostics();
            const warnings=g?.packEffects.filter(f=>f.owner===e?.id && f.kind==='voidRend' && f.variant==='hand' && f.arming>0) || [];
            witness.sample={attack:e?.pack?.attack,phase:e?.pack?.phase,seq:e?.pack?.seq,remaining:e?.pack?.t,
              hp:g?.player.hp,nativeActors:d.nativeActors,frame:d.frame,backend:d.backend,
              paused:g?.paused,visibility:document.visibilityState,clock:g?.lastUpdateNow,playSeconds:g?.save.playSeconds,
              interactionOpen:document.querySelector('#pgInteraction')?.open,
              boss:e&&{x:e.x,y:e.y,gap:e.pack?.gap,awake:e.pentArenaAwake},yaw:globalThis.__closeViewCam?.get().yaw,
              warnings:warnings.map(f=>({x:f.x,y:f.y,arming:f.arming}))};
            if(witness.sample.attack==='voidHand' && witness.sample.phase===${JSON.stringify(phase)}
              && d.backend==='webgl2' && d.nativeActors>0 && warnings.length===2){
              document.querySelector('#scenarioPause').click();
              witness.status='observed';return;
            }
            if(performance.now()>=deadline || !(witness.sample.hp>0)){witness.status='blocked';return;}
            requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        }).catch(()=>{witness.status='diagnostics-failed'});
        return true;
      })()`);
      const readPhase=async()=>{
        const deadline=Date.now()+34000;
        let result;
        do {
          result=await evaluate('globalThis.__preflightWalkerPhase');
          if(result?.status!=='loading' && result?.status!=='sampling')break;
          await wait(350);
        } while(Date.now()<deadline);
        return {...result?.sample,observed:result?.status==='observed',witnessStatus:result?.status};
      };
      checkpoint?.('walker-exposed');
      await beginPhase('windup');
      const exposed=await probe('stillworks-exposed');
      if(exposed){
        checkpoint?.('walker-windup');
        const sample=await readPhase();phases.push(sample);
        if(sample.observed){
          screenshots.push(await capture('rending-hands-windup'));
          await beginPhase('recover');
          await evaluate('document.querySelector("#scenarioPause").click()');
          checkpoint?.('walker-recovery');
          const recovery=await readPhase();phases.push(recovery);
          if(recovery.observed){
            screenshots.push(await capture('rending-hands-recovery'));
            await evaluate('document.querySelector("#scenarioPause").click()');
          }
          const observed=recovery.observed && recovery.seq===sample.seq && recovery.frame>sample.frame
            && recovery.warnings.every((f,i)=>f.x===sample.warnings[i].x && f.y===sample.warnings[i].y && f.arming<sample.warnings[i].arming);
          return {status:observed?'observed':'blocked',before,advanced:exposed,samples:phases,screenshots};
        }
      }
      screenshots.push(await capture('rending-hands-last-position'));
      return {status:'blocked',before,advanced:exposed,samples:phases,screenshots};
    }
    const covered=await probe('stillworks-cover');
    const screenshots=covered?[await capture('covered')]:[];
    const advanced=await probe('stillworks-exposed');
    if(advanced)screenshots.push(await capture('exposed'));
    let warning=false;
    for (let i = 0; i < 18 && advanced; i++) {
      const state = await pose();
      encounter.push(state);
      if (state?.warnings?.length) {
        screenshots.push(await capture('warning'));
        warning=true;
        break;
      }
      await wait(220);
    }
    return {status:covered && advanced && warning && encounter.some(q=>q?.awake)?'observed':'blocked',
      before,covered,advanced,encounter,screenshots};
  }
  const crawl = await evaluate(`(() => {
    const info = JSON.parse(document.querySelector('#fixtureDiagnostics').textContent);
    const c = info.diagnostics?.crawl;
    if (!c?.active || c.cells?.length !== 3) return null;
    const select = document.querySelector('#teleportSelect');
    if (![...select.options].some(o => o.value === 'crawl-approach')) return null;
    select.value = 'crawl-approach';
    select.dispatchEvent(new Event('change', {bubbles:true}));
    const map=globalThis.provingGroundGame?.()?.map;
    const elev=map?.tiles[c.landing.y*map.width+c.landing.x]?.elev;
    return { approach:c.approach, path:[...c.cells,c.landing], elev, returnSteps:c.returnSteps };
  })()`);
  if (!crawl) return { status: 'blocked', reason: 'Public crawl witness unavailable' };
  await wait(400);
  let state = await pose();
  if (!state || Math.hypot(state.x - crawl.approach.x, state.y - crawl.approach.y) > .25)
    return { status: 'blocked', reason: 'Crawl approach selection did not arrive', crawl, state };
  const start = state, screenshots = [await capture('approach')], samples = [];
  const end=crawl.path.at(-1);
  const landed=() => state?.area===start.area && state.support===crawl.elev
    && Math.floor(state.x+.5)===end.x && Math.floor(state.y+.75)===end.y;
  const deadline=Date.now()+35000;
  for(let i=0;i<48 && Date.now()<deadline && state && !landed();i++){
    const dx=end.x-state.x,dy=end.y-state.y,yaw=state.inputYaw ?? state.yaw;
    const bearing=Math.atan2(dy,dx)-yaw;
    const keys=['w','wd','d','ds','s','sa','a','aw'];
    const key=keys[((Math.round(bearing/(Math.PI/4))%8)+8)%8];
    await hold(key,Math.max(180,Math.min(650,Math.hypot(dx,dy)*480)));
    state=await pose();samples.push({...state,key});
    if(state?.area!==start.area)break;
  }
  await wait(250);
  state=await pose();samples.push(state);
  const observed=landed() && state.hp===start.hp;
  screenshots.push(await capture(observed?'landing':'last-position'));
  return { status: observed ? 'observed' : 'blocked', crawl, start, samples, screenshots };
}
