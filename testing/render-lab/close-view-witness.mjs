// Test-only evidence for the three public Stillworks and crawl fixtures.
export const STILLWORKS_CASES = Object.freeze([
  'stillworks-void-walker', 'routing-crawl-keep', 'routing-crawl-pentagon',
]);
export const CLEAVER_CASE = 'cleaver-echo-inspection';
export const SUMMIT_CASE = 'great-tree-summit';

async function holdKey(call, wait, key, ms) {
  const upper = key.toUpperCase();
  const args = { key, code: 'Key' + upper, windowsVirtualKeyCode: upper.charCodeAt(0) };
  await call('Input.dispatchKeyEvent', { ...args, type: 'keyDown' });
  try { await wait(ms); }
  finally { await call('Input.dispatchKeyEvent', { ...args, type: 'keyUp' }); }
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
      area:g.areaId(), warnings:(g.packEffects||[]).filter(f=>f.kind.startsWith('void') && f.arming>0).map(f=>f.kind).slice(0,32)} : null;
  })()`);
  const hold = (key, ms) => holdKey(call, wait, key, ms);
  const before = await pose();
  if (!before || !Number.isFinite(before.yaw)) return { status: 'blocked', reason: 'No camera/player observation' };
  if (scenario === STILLWORKS_CASES[0]) {
    await hold('w', 1900);
    const advanced = await pose();
    const screenshots = [await capture('floor')];
    await hold('w', 900);
    const encounter = [];
    for (let i = 0; i < 6; i++) {
      const state = await pose();
      encounter.push(state);
      if (state?.warnings?.length) {
        screenshots.push(await capture('warning'));
        break;
      }
      await wait(220);
    }
    const moved = advanced?.area === before.area && Math.hypot(advanced.x - before.x, advanced.y - before.y) > 2;
    return { status: moved && screenshots.length === 2 ? 'observed' : 'blocked', before, advanced, encounter, screenshots };
  }
  const crawl = await evaluate(`(() => {
    const info = JSON.parse(document.querySelector('#fixtureDiagnostics').textContent);
    const c = info.diagnostics?.crawl;
    if (!c?.active || c.cells?.length !== 3) return null;
    const select = document.querySelector('#teleportSelect');
    if (![...select.options].some(o => o.value === 'crawl-approach')) return null;
    select.value = 'crawl-approach';
    select.dispatchEvent(new Event('change', {bubbles:true}));
    return { approach:c.approach, path:[...c.cells,c.landing], returnSteps:c.returnSteps };
  })()`);
  if (!crawl) return { status: 'blocked', reason: 'Public crawl witness unavailable' };
  await wait(400);
  let state = await pose();
  if (!state || Math.hypot(state.x - crawl.approach.x, state.y - crawl.approach.y) > .25)
    return { status: 'blocked', reason: 'Crawl approach selection did not arrive', crawl, state };
  const start = state, screenshots = [await capture('approach')], samples = [];
  for (const point of crawl.path) {
    for (let i = 0; i < 8 && state; i++) {
      const dx = point.x - state.x, dy = point.y - state.y, distance = Math.hypot(dx, dy);
      if (distance <= .25) break;
      const key = movementKey(state.inputYaw ?? state.yaw, dx, dy);
      if (!key) break;
      await hold(key, Math.max(45, Math.min(155, distance * 170)));
      state = await pose();
    }
    samples.push(state);
    if (!state || Math.hypot(point.x - state.x, point.y - state.y) > .35 || state.area !== start.area) break;
  }
  screenshots.push(await capture('landing'));
  const end = crawl.path.at(-1), landed = state?.area === start.area && Math.hypot(end.x - state.x, end.y - state.y) <= .35;
  return { status: landed && state.hp === start.hp ? 'observed' : 'blocked', crawl, start, samples, screenshots };
}
