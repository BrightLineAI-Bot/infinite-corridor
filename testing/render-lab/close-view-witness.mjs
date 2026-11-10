// Test-only evidence for the three public Stillworks and crawl fixtures.
export const STILLWORKS_CASES = Object.freeze([
  'stillworks-void-walker', 'routing-crawl-keep', 'routing-crawl-pentagon',
]);
export const CLEAVER_CASE = 'cleaver-echo-inspection';
export const SUMMIT_CASE = 'great-tree-summit';
export const COMBAT_ACTION_CASES = ['pike-echo-inspection', 'cast-skill-aerial-step', 'blade-hammerfall-brute'];

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
      const camera=await evaluate(`(() => {
        const g=globalThis.provingGroundGame?.(), c=globalThis.__closeViewCam?.get();
        const e=g?.enemies.find(q=>q.pentFinaleBeast==='voidWalker');
        const info=JSON.parse(document.querySelector('#fixtureDiagnostics').textContent);
        const at=info.teleportTargets.find(q=>q.id==='stillworks-exposed');
        const rect=document.querySelector('#game').getBoundingClientRect();
        return { target:Math.atan2(e.y-at.y,e.x-at.x), yaw:c.yaw,
          x:Math.round(rect.left+rect.width*.75), y:Math.round(rect.top+rect.height*.32) };
      })()`);
      for(let i=0;i<4;i++){
        const c=await pose(), angle=camera.target-c.yaw;
        const error=Math.atan2(Math.sin(angle),Math.cos(angle));
        if(Math.abs(error)<.25)break;
        const dx=Math.max(-145,Math.min(145,Math.round(error/.009)));
        const point={x:camera.x,y:camera.y};
        await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});
        await wait(300);
        const moved={x:point.x+dx,y:point.y};
        try { await call('Input.dispatchMouseEvent',{type:'mouseMoved',...moved,button:'none',buttons:1}); }
        finally { await call('Input.dispatchMouseEvent',{type:'mouseReleased',...moved,button:'left',buttons:0,clickCount:1}); }
        await wait(250);
      }
      const screenshots=[], phases=[];
      const beginPhase=async phase=>evaluate(`(() => {
        const witness={status:'loading'};
        globalThis.__preflightWalkerPhase=witness;
        const deadline=performance.now()+30000;
        import(${JSON.stringify(walkerDiagnostics)}).then(({closeViewRenderDiagnostics})=>{
          witness.status='sampling';
          function sample(){
            const g=globalThis.provingGroundGame?.(), e=g?.enemies.find(q=>q.pentFinaleBeast==='voidWalker');
            const d=closeViewRenderDiagnostics();
            const warnings=g?.packEffects.filter(f=>f.owner===e?.id && f.kind==='voidRend' && f.variant==='hand' && f.arming>0) || [];
            witness.sample={attack:e?.pack?.attack,phase:e?.pack?.phase,seq:e?.pack?.seq,remaining:e?.pack?.t,
              hp:g?.player.hp,nativeActors:d.nativeActors,frame:d.frame,backend:d.backend,
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
