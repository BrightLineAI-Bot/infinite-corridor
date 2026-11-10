// Test-only evidence for the three public Stillworks and crawl fixtures.
export const STILLWORKS_CASES = Object.freeze([
  'stillworks-void-walker', 'routing-crawl-keep', 'routing-crawl-pentagon',
]);

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
    return p && c ? {x:p.x,y:p.y,hp:p.hp,yaw:c.yaw,distance:c.distance,
      area:g.areaId(), effects:(g.packEffects||[]).map(f=>f.kind).slice(0,32)} : null;
  })()`);
  const hold = async (key, ms) => {
    const args = { key, code: 'Key' + key.toUpperCase(), windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) };
    await call('Input.dispatchKeyEvent', { ...args, type: 'keyDown' });
    try { await wait(ms); }
    finally { await call('Input.dispatchKeyEvent', { ...args, type: 'keyUp' }); }
  };
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
      if (state?.effects?.some(kind => /^void/.test(kind))) {
        screenshots.push(await capture('warning'));
        break;
      }
      await wait(220);
    }
    const moved = advanced?.area === before.area && Math.hypot(advanced.x - before.x, advanced.y - before.y) > 2;
    return { status: moved ? 'observed' : 'blocked', before, advanced, encounter, screenshots };
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
      const key = movementKey(state.yaw, dx, dy);
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
