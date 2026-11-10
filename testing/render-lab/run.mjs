#!/usr/bin/env node
// Dependency-free Node 24 + installed Chromium. Uses a disposable browser profile.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyCandidate } from '../../scripts/pages-release.mjs';
import { assess, capturedWebGLFrames, classifyRenderer, safePath, diagnosticsModulePath, diagnosticsFromRows } from './evidence.mjs';
import { disjointPaths, bounded, stopBrowser, normalBrowserFlags, waitForBrowserScene, navigationObservation } from './resources.mjs';
import { cleaverWitness, combatActionWitness, closeViewWitness, doorWayfindingWitness, routePanelWitness, summitWitness, CLEAVER_CASE, COMBAT_ACTION_CASES, DOOR_WAYFINDING_CASES, STILLWORKS_CASES, SUMMIT_CASE } from './close-view-witness.mjs';
const args = process.argv.slice(2), option = name => { const i=args.indexOf(`--${name}`); return i<0?undefined:args[i+1]; };
const candidatePath=option('candidate'), expected=option('digest'), output=option('out');
if (!candidatePath || !/^[a-f0-9]{64}$/.test(expected||'') || !output) throw Error('Usage: node testing/render-lab/run.mjs --candidate DIR --digest TRUSTED_SHA256 --out NEW_DIR [--chromium PATH]');
const {root,out}=disjointPaths(candidatePath,output);
if (existsSync(out)) throw Error('refusing to overwrite evidence');
mkdirSync(out,{recursive:true});
const receipt={schema:1, startedAt:new Date().toISOString(), scope:'local frozen artifact render probe, not publication acceptance', status:'blocked', scenarios:[], restrictions:['No visual approval','No physical phone performance evidence','No production or hosted-origin testing'], errors:[],rendererClass:'unknown',physicalPhone:'not-measured',failureScreenshot:{status:'unavailable',reason:'No page available'}};
let server, browser, profile, cdp, pageCall, currentObservation, logs='', networkCut=false, deniedRequests=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const checkpoint = phase => {
  receipt.phase = phase;
  writeFileSync(join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
};
try {
  checkpoint('candidate-verification');
  const candidate=verifyCandidate(root);
  if(candidate.digest!==expected) throw Error('candidate digest differs from trusted input');
  receipt.candidate={id:candidate.id,commit:candidate.commit,tree:candidate.tree,digest:candidate.digest};
  const site=join(root,'preview-site');
  const diagnosticsPath=diagnosticsModulePath(readFileSync(join(site,'src/proving-ground-mobile.js'),'utf8'),candidate.id);
  receipt.diagnosticsModule=diagnosticsPath;
  const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
  server=createServer((req,res)=>{
    try {
      if(networkCut){deniedRequests++;res.writeHead(503).end();return;}
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
      const name=safePath(new URL(req.url,'http://localhost').pathname);
      // Serve only the already verified inventory, never arbitrary workspace files.
      if(!candidate.files.preview[name]){res.writeHead(404).end();return;}
      const data=readFileSync(join(site,name));
      res.writeHead(200,{'Content-Type':mime[extname(name)]||'application/octet-stream','Cache-Control':'no-store'});
      res.end(req.method==='HEAD'?undefined:data);
    }catch{res.writeHead(400).end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  receipt.serving='loopback-only disposable origin';
  const origin=`http://127.0.0.1:${server.address().port}`;
  checkpoint('chrome-start');
  profile=mkdtempSync(join(tmpdir(),'ic-render-profile-'));
  // Never --no-sandbox, --ignore-gpu-blocklist, software-renderer overrides or real user profiles.
  const flags=normalBrowserFlags(profile);
  receipt.browserFlags=flags.map(f=>f.startsWith('--user-data-dir=')?'--user-data-dir=<disposable>':f);
  browser=spawn(option('chromium')||'chromium',flags,{detached:true,stdio:['ignore','ignore','pipe']});
  browser.stderr.on('data',b=>{logs=(logs+b).slice(-64000)});
  let spawnError; browser.on('error',e=>{spawnError=e});
  for(let i=0;i<100&&!logs.includes('DevTools listening on')&&browser.exitCode===null&&browser.signalCode===null&&!spawnError;i++) await wait(100);
  writeFileSync(join(out,'chromium.log'),logs);
  if(spawnError)throw spawnError;
  const endpoint=/DevTools listening on (ws:\/\/[^\s]+)/.exec(logs)?.[1];
  if(!endpoint)throw Error('Chromium could not start with its normal sandbox; see chromium.log');
  const ws=new WebSocket(endpoint);
  try{await bounded(new Promise((r,j)=>{ws.onopen=r;ws.onerror=j}),10000,'CDP socket open timed out')}catch(e){ws.close();throw e}
  let seq=0;const pending=new Map(), events=[], browserDeadline=Date.now()+360000;
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}}else events.push(m)};
  cdp={send:(method,params={},sessionId)=>new Promise((resolve,reject)=>{
    const timeout=Math.min(8000,browserDeadline-Date.now());
    if(timeout<=0)return reject(Error('Browser probe deadline exceeded'));
    const id=++seq;
    const timer=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`))},timeout);
    pending.set(id,{resolve,reject,timer});
    try{ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));}
    catch(error){pending.delete(id);clearTimeout(timer);reject(error);}
  }),close:()=>ws.close()};
  checkpoint('chrome-connected');
  receipt.browser=await cdp.send('Browser.getVersion');
  try{const info=await cdp.send('SystemInfo.getInfo');receipt.gpu={devices:info.gpu.devices,featureStatus:info.gpu.featureStatus,auxAttributes:info.gpu.auxAttributes};receipt.rendererClass=classifyRenderer(receipt.gpu)}
  catch(error){if(/CDP timeout|probe deadline/.test(error.message))throw error;receipt.rendererClass='unknown'}
  const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await cdp.send('Target.attachToTarget',{targetId,flatten:true});
  const call=(method,params)=>cdp.send(method,params,sessionId);pageCall=call;
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  await call('Page.setLifecycleEventsEnabled',{enabled:true});
  // Keep the software runner's pixel load bounded with ordinary display and game settings.
  receipt.display={width:768,height:540,deviceScaleFactor:1,mobile:false};
  receipt.requestedCloseViewQuality='low';
  await call('Emulation.setDeviceMetricsOverride',receipt.display);
  let contextId;
  const evaluate=async (expression,awaitPromise=false)=>{const r=await call('Runtime.evaluate',{expression,contextId,awaitPromise,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  const navigate=async url=>{
    const start=events.length;
    const navigation=await call('Page.navigate',{url});
    if(navigation.errorText || !navigation.loaderId || !navigation.frameId) throw Error('Browser did not start the expected document navigation');
    const observe=()=>navigationObservation(events.slice(start),sessionId,navigation);
    if(!await waitForBrowserScene(()=>{const o=observe();return o.committed&&o.domReady&&Number.isInteger(o.contextId);}))
      throw Error('Browser did not load the expected document');
    contextId=observe().contextId;
    return observe;
  };
  const fixtures = readFileSync(join(site,'src/proving-ground-labs.js'),'utf8');
  const walker = /^r866-/.test(candidate.id);
  const wholeWorld = /^r867-/.test(candidate.id);
  const doorWayfinding = /^r868-/.test(candidate.id);
  const worldFixtures = {standard:'test-tile',coast:'landscape','great-tree-summit':'landscape',ashling:'combat'};
  const cases = doorWayfinding ? [...DOOR_WAYFINDING_CASES] : wholeWorld ? Object.keys(worldFixtures) : walker ? [STILLWORKS_CASES[0]]
    : [COMBAT_ACTION_CASES[1], ...STILLWORKS_CASES.slice(1).filter(id => fixtures.includes(`"${id}"`))];
  receipt.scope=doorWayfinding?'Dungeon door wayfinding on exact frozen r868'
    :wholeWorld?'Overworld Close View and toggle on exact frozen r867'
    :walker?'Rending Hands witness on exact frozen r866':'remaining online gameplay witnesses for exact frozen r865';
  for(const scenario of cases) {
    const start=events.length, entry={scenario,status:'blocked',samples:[],errors:[],captures:[]};receipt.scenarios.push(entry);
    checkpoint('scenario-navigate');
    const closeView=STILLWORKS_CASES.includes(scenario);
    const summit=!wholeWorld && scenario===SUMMIT_CASE;
    const lab=wholeWorld?worldFixtures[scenario]:doorWayfinding?'close-view':summit?'landscape':closeView?'close-view':'combat-assets';
    const query=new URLSearchParams({dev:'proving-ground',lab,env:lab==='combat'?'dungeon-hollow':'test-tile',scenario,seed:doorWayfinding&&scenario==='cube-doors'?'R13':walker?'TIM1':closeView?'CINDER-VERGE-47':'RENDER-LAB-1',variant:'0',size:'standard',reveal:'normal',cvQuality:receipt.requestedCloseViewQuality});
    if(wholeWorld)query.set('overworldCloseView','1');
    const url=`${origin}/?${query}`;
    const observe=await navigate(url);
    currentObservation=()=>{
      entry.navigation=observe();
      entry.webglCaptured=capturedWebGLFrames(entry);
    };
    currentObservation();
    // Bounded wait for the real entry point. No altered game state or renderer globals.
    checkpoint('scenario-ready');
    const ready=await waitForBrowserScene(()=>evaluate('!!document.querySelector("#scenarioPause") && !!globalThis.provingGroundGame?.()'));
    if(ready && wholeWorld)await evaluate('document.querySelector("#scenarioPause").textContent==="Pause" && document.querySelector("#scenarioPause").click()');
    if(!ready)throw Error(`scenario did not boot: ${scenario}`);
    const capture=async suffix=>{
      const name=`${scenario}${suffix ? '-' + suffix : ''}.png`;
      const screenshot=await call('Page.captureScreenshot',{format:'png'});
      writeFileSync(join(out,name),Buffer.from(screenshot.data,'base64'));
      entry.captures.push(name);
      checkpoint(receipt.phase);
      return name;
    };
    checkpoint('scenario-first-capture');
    entry.firstScreenshot=await capture('startup');
    checkpoint('scenario-settle');
    await wait(1500);
    checkpoint('scenario-diagnostics');
    const readDiagnostics=async()=>{
      await evaluate('document.querySelector("#pgDiagnosticsToggle").click()');
      let observation;
      const opened = await waitForBrowserScene(async ()=>{
        observation=await evaluate(`(() => {
          const panel=document.querySelector('#pgDiagnostics');
          if(!panel?.open)return null;
          const rows=Object.fromEntries([...panel.querySelectorAll('#pgDiagnosticsBody dt')]
            .map(term=>[term.textContent,term.nextElementSibling?.textContent]));
          const effectiveQuality=globalThis.provingGroundGame?.()?.presentation?.effectiveQuality ?? null;
          return {rows,effectiveQuality};
        })()`);
        return !!observation;
      });
      if(!opened)throw Error('Public renderer diagnostics did not open');
      await evaluate('document.querySelector("#pgDiagnosticsClose").click()');
      return {...diagnosticsFromRows(observation.rows,candidate.id),effectiveQuality:observation.effectiveQuality};
    };
    const readFramePair=async()=>{
      const deadline=Date.now()+12000;
      let first=await readDiagnostics();
      const startup=first;
      while(first.asset!=='failed' && (first.player!=='imported' || first.gpu?.heroState!=='ready') && Date.now()<deadline){
        await wait(450);
        first=await readDiagnostics();
      }
      await wait(300);
      return {startup, samples:[first,await readDiagnostics()]};
    };
    if(!summit){
      const frames=await readFramePair();
      entry.startupSample=frames.startup;
      entry.samples=frames.samples;
    }
    // Keep the sampled scene even if an input witness later fails.
    checkpoint('scenario-screenshot');
    entry.screenshot=await capture();
    checkpoint('scenario-witness');
    const witness = doorWayfinding ? doorWayfindingWitness.bind(null,scenario) : wholeWorld ? async () => {
      const observeWorld=()=>evaluate(`(() => {
        const g=globalThis.provingGroundGame?.(), cam=globalThis.__closeViewCam?.get(), toggle=document.querySelector('#pgOverworldCloseView');
        return {area:g?.areaId(), hp:g?.player.hp, drawn:cam?.drawn, checked:toggle?.checked, enabled:g?.save.overworldCloseView};
      })()`);
      const screenshots=[], samples=[], before=await observeWorld();
      await evaluate('document.querySelector("#pgOverworldCloseView").click()');
      const disabled=await waitForBrowserScene(async()=>{const state=await observeWorld();return !state.drawn && state.checked===false && state.enabled===false;});
      samples.push(await observeWorld());
      if(disabled)screenshots.push(await capture('overhead'));
      await evaluate('document.querySelector("#pgOverworldCloseView").click()');
      const enabled=await waitForBrowserScene(async()=>{const state=await observeWorld();return state.drawn && state.checked===true && state.enabled===true;});
      const after=await observeWorld();samples.push(after);
      if(enabled)screenshots.push(await capture('restored-close-view'));
      const observed=before.drawn && before.enabled && disabled && enabled && before.area===after.area && before.hp===after.hp;
      return {status:observed?'observed':'blocked',before,samples,screenshots};
    } : summit ? summitWitness : closeView ? closeViewWitness.bind(null, scenario)
      : scenario === CLEAVER_CASE && Number(/^r(\d+)-/.exec(candidate.id)?.[1]) >= 863 ? cleaverWitness
      : COMBAT_ACTION_CASES.includes(scenario) && Number(/^r(\d+)-/.exec(candidate.id)?.[1]) >= 865 ? combatActionWitness.bind(null,scenario) : null;
    const witnessTools={call,evaluate,wait,capture,checkpoint,walkerDiagnostics:walker?diagnosticsPath:null};
    if(witness) entry.witness=await witness(witnessTools);
    if(scenario.startsWith('routing-crawl-') && entry.witness?.status==='observed'){
      const panel=await routePanelWitness(scenario,witnessTools);
      if(panel){
        entry.witness.routePanel=panel.report;
        entry.witness.screenshots.push(...panel.screenshots);
        if(panel.status==='blocked') entry.witness.status='blocked';
      }
    }
    entry.errors=events.slice(start).filter(e=>e.sessionId===sessionId&&(e.method==='Runtime.exceptionThrown'||(e.method==='Network.responseReceived'&&e.params.response.status>=400)||e.method==='Network.loadingFailed')).map(e=>({method:e.method,details:e.params}));
    // Chrome's optional root favicon is absent from the frozen inventory. Keep the
    // receipt, but a failed browser decoration is independent of application assets.
    entry.optionalBrowserRequests=entry.errors.filter(({details})=>details?.type==='Other'
      && details.response?.status===404 && details.response.url===`${origin}/favicon.ico`);
    entry.errors=entry.errors.filter(error=>!entry.optionalBrowserRequests.includes(error));
    if(entry.samples.some(sample=>sample.clientError))entry.errors.push({method:'Public renderer diagnostics reported a client error'});
    if(summit){
      entry.scene='world-map';
      entry.reasons=entry.errors.length ? ['Browser errors in summit fixture'] : [];
      entry.status=entry.errors.length ? 'blocked' : 'render-observed';
    }else Object.assign(entry,assess(entry.samples,entry.errors));
    if(witness && entry.witness?.status!=='observed'){
      entry.status='blocked';
      entry.reasons.push('Required input or encounter witness was not observed');
    }
    currentObservation();currentObservation=null;
    checkpoint('scenario-observed');
    if(scenario===CLEAVER_CASE && Number(/^r(\d+)-/.exec(candidate.id)?.[1])>=865){
      checkpoint('offline-cleaver');
      const beforeContext=contextId;
      const workerUrl=`${origin}/sw.js?v=${candidate.id}`;
      const controller=()=>evaluate('navigator.serviceWorker.controller?.scriptURL');
      const conditions=offline=>call('Network.emulateNetworkConditions',{offline,latency:0,downloadThroughput:-1,uploadThroughput:-1});
      receipt.offline={status:'blocked',scenario,worker:false};
      if(!await waitForBrowserScene(async()=>await controller()===workerUrl,{budgetMs:18000}))
        throw Error('Exact Preview service worker did not control the warm page');
      receipt.offline.worker=true;
      await call('Network.setCacheDisabled',{cacheDisabled:true});
      try{
        networkCut=true;
        await conditions(true);
        await navigate(url);
        const recovered=await waitForBrowserScene(()=>evaluate('!!globalThis.provingGroundGame?.() && !!document.querySelector("#scenarioPause")'));
        if(!recovered || contextId===beforeContext || await controller()!==workerUrl || await evaluate('navigator.onLine')!==false)
          throw Error('Offline reload did not restore the controlled candidate fixture');
        receipt.offline.reloaded=true;
        const {samples}=await readFramePair();
        const action=await cleaverWitness({...witnessTools,capture:suffix=>capture('offline-'+suffix)});
        const png=await capture('offline-scene');
        const renderer=assess(samples,samples.some(sample=>sample.clientError)?['client error']:[]);
        Object.assign(receipt.offline,{samples,action,png,deniedRequests,renderer,
          status:action.status==='observed'&&renderer.status==='render-observed'?'observed':'blocked'});
      }finally{
        networkCut=false;
        await conditions(false);
        await call('Network.setCacheDisabled',{cacheDisabled:false});
        const head=await fetch(`${origin}/release-identity.json`,{method:'HEAD'});
        receipt.offline.networkRestored=head.ok && await evaluate('navigator.onLine')===true;
        if(!receipt.offline.networkRestored)receipt.offline.status='blocked';
      }
      checkpoint('offline-complete');
    }
  }
  receipt.status=receipt.scenarios.every(s=>s.status==='render-observed')&&(!receipt.offline||receipt.offline.status==='observed')?'render-observed':'blocked';
  // Recheck source bytes after execution, not just before serving them.
  if(verifyCandidate(root).digest!==expected)throw Error('candidate changed during execution');
}catch(error){
  receipt.errors.push(String(error.message||error));receipt.status='blocked';
  currentObservation?.();
  if(pageCall && !/CDP timeout|probe deadline/.test(String(error.message)))try{
    const image=await pageCall('Page.captureScreenshot',{format:'png'});
    writeFileSync(join(out,'failure.png'),Buffer.from(image.data,'base64'));
    receipt.failureScreenshot={status:'captured',file:'failure.png',visualAcceptance:'not-reviewed'};
  }catch{receipt.failureScreenshot={status:'unavailable',reason:'Page capture failed; no screenshot pass inferred'}}
}
finally {
  cdp?.close();
  let stopped=false;
  try{stopped=await stopBrowser(browser);if(!stopped)throw Error('browser process group termination unconfirmed; disposable profile retained')}catch(e){receipt.errors.push(e.message);receipt.status='blocked'}
  browser?.unref();browser?.stderr?.destroy();
  if(server){server.closeAllConnections();try{await bounded(new Promise(r=>server.close(()=>r())),3000,'server shutdown unconfirmed')}catch(e){receipt.errors.push(e.message);receipt.status='blocked';server.unref()}}
  if(profile&&stopped)rmSync(profile,{recursive:true,force:true});
  receipt.cleanup={browserGroupStopped:stopped,profileRemoved:!!profile&&stopped};
  writeFileSync(join(out,'chromium.log'),logs);
  receipt.finishedAt=new Date().toISOString();writeFileSync(join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(`${receipt.status}: ${join(out,'receipt.json')}`);process.exitCode=receipt.status==='render-observed'?0:2;
}
