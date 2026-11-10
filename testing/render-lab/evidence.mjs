// Test tooling only. No game imports, renderer overrides or production writes.
export function classifyRenderer(info) {
  const text = JSON.stringify(info || {});
  if (/swiftshader|llvmpipe|softpipe|software rasterizer/i.test(text)) return 'software';
  // A name alone does not prove hardware acceleration.
  return 'unknown';
}
export function assess(samples, errors = []) {
  const reasons = [];
  if (samples.length < 2) reasons.push('missing consecutive observations');
  if (samples.some(s => !s?.active || s.backend !== 'webgl2' || !(s.frame > 0))) reasons.push('no active WebGL2 scene');
  if (samples.length >= 2 && !(samples.at(-1).frame > samples[0].frame)) reasons.push('render frames did not advance');
  if (samples.some(s => s?.player !== 'imported' || s?.asset !== 'ready' || s?.gpu?.state !== 'ready' || s.gpu?.heroState !== 'ready')) reasons.push('imported character not drawn and GPU-ready');
  if (errors.length) reasons.push('runtime or asset errors');
  return { status: reasons.length ? 'blocked' : 'render-observed', reasons,
    visualAcceptance: 'not-reviewed', devicePerformance: 'not-measured' };
}
// Keep the cold startup receipt, but use two advancing, ready frames to decide
// whether the imported renderer settled. Never extend the acquisition window on a retry.
export async function stableFramePair(read, wait, { now=Date.now, timeoutMs=22000, intervalMs=350 }={}) {
  const deadline=now()+timeoutMs;
  const startup=await read();
  let samples=[startup];
  while(now()<deadline && samples.at(-1).asset!=='failed' && !samples.at(-1).clientError){
    await wait(intervalMs);
    samples=[samples.at(-1),await read()];
    if(assess(samples).status==='render-observed')break;
  }
  return {startup,samples};
}
export function capturedWebGLFrames(scenario) {
  const { samples, screenshot } = scenario;
  return !!screenshot && samples?.length >= 2
    && samples.every(s => s?.active && s.backend === 'webgl2' && s.frame > 0)
    && samples.at(-1).frame > samples[0].frame;
}
export function diagnosticsFromRows(rows, candidateId) {
  if (rows?.['Game release'] !== candidateId) throw Error('Diagnostics show a different candidate');
  const scene = /^(active|inactive; historical): (\w+), completed frame (\d+)$/.exec(rows['Close View scene']);
  const player = /^(?:active|inactive; historical): (\w+)$/.exec(rows['Player representation']);
  const readiness = value => /^readiness: ([\w-]+);/.exec(value)?.[1];
  return {
    active: scene?.[1] === 'active', backend: scene?.[2], frame: Number(scene?.[3] ?? 0),
    player: player?.[1], asset: rows['Hero asset'],
    gpu: { state: readiness(rows['GPU scene']), heroState: readiness(rows['Hero GPU']) },
    clientError: rows['Recent errors'] !== 'none',
  };
}
export function safePath(pathname) {
  let path;
  try { path = decodeURIComponent(pathname).replace(/^\//, ''); } catch { throw Error('malformed path'); }
  if (path.includes('\\') || path.includes('\0') || path.split('/').some(p => p === '..' || p === '.')) throw Error('unsafe path');
  return path || 'index.html';
}
// Browser module identity includes the query string. Reuse the live entry's exact import.
export function diagnosticsModulePath(entrySource, candidateId) {
  if (!/^r\d+-[0-9a-f]{12}$/.test(candidateId)) throw Error('invalid candidate module identity');
  const imports = [...entrySource.matchAll(/(?:from\s*|import\s*)["'](\.\/close-view\.js(?:\?[^"']*)?)["']/g)].map(match => match[1]);
  if (imports.length !== 1 || imports[0] !== `./close-view.js?v=${candidateId}`) throw Error('verified entry lacks exact versioned diagnostics module import');
  return `./src/close-view.js?v=${candidateId}`;
}
