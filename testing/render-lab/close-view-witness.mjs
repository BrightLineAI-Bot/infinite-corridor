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

export async function closeViewWitness(scenario, { call, evaluate, wait, capture }) {
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
