#!/usr/bin/env node
// Dependency-free Node 24 + installed Chromium. Uses a disposable browser profile.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyCandidate } from '../../scripts/pages-release.mjs';
import { assess, classifyRenderer, safePath, diagnosticsModulePath } from './evidence.mjs';
import { disjointPaths, bounded, stopBrowser, normalBrowserFlags } from './resources.mjs';
import { closeViewWitness, STILLWORKS_CASES } from './close-view-witness.mjs';
const args = process.argv.slice(2), option = name => { const i=args.indexOf(`--${name}`); return i<0?undefined:args[i+1]; };
const candidatePath=option('candidate'), expected=option('digest'), output=option('out');
if (!candidatePath || !/^[a-f0-9]{64}$/.test(expected||'') || !output) throw Error('Usage: node testing/render-lab/run.mjs --candidate DIR --digest TRUSTED_SHA256 --out NEW_DIR [--chromium PATH]');
const {root,out}=disjointPaths(candidatePath,output);
if (existsSync(out)) throw Error('refusing to overwrite evidence');
mkdirSync(out,{recursive:true});
const receipt={schema:1, startedAt:new Date().toISOString(), scope:'local frozen artifact render probe, not publication acceptance', status:'blocked', scenarios:[], restrictions:['No visual approval','No physical phone performance evidence','No production or hosted-origin testing'], errors:[],rendererClass:'unknown',physicalPhone:'not-measured',failureScreenshot:{status:'unavailable',reason:'No page available'}};
let server, browser, profile, cdp, pageCall, logs='';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try {
  const candidate=verifyCandidate(root);
  if(candidate.digest!==expected) throw Error('candidate digest differs from trusted input');
  receipt.candidate={id:candidate.id,commit:candidate.commit,tree:candidate.tree,digest:candidate.digest};
  const site=join(root,'preview-site');
  const diagnosticsPath=diagnosticsModulePath(readFileSync(join(site,'src/proving-ground-mobile.js'),'utf8'),candidate.id);
  receipt.diagnosticsModule=diagnosticsPath;
  const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
  server=createServer((req,res)=>{
    try {
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
  let seq=0;const pending=new Map(), events=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}}else events.push(m)};
  cdp={send:(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`))},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));}) ,close:()=>ws.close()};
  receipt.browser=await cdp.send('Browser.getVersion');
  try{const info=await cdp.send('SystemInfo.getInfo');receipt.gpu={devices:info.gpu.devices,featureStatus:info.gpu.featureStatus,auxAttributes:info.gpu.auxAttributes};receipt.rendererClass=classifyRenderer(receipt.gpu)}catch{receipt.rendererClass='unknown'}
  const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await cdp.send('Target.attachToTarget',{targetId,flatten:true});
  const call=(method,params)=>cdp.send(method,params,sessionId);pageCall=call;
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:900,height:700,deviceScaleFactor:1,mobile:false});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  const fixtures = readFileSync(join(site,'src/proving-ground-labs.js'),'utf8');
  const cases = ['cleaver-echo-inspection','pike-echo-inspection','cast-skill-aerial-step','blade-hammerfall-brute'];
  // An old frozen artifact need not contain the newer fixtures.
  cases.push(...STILLWORKS_CASES.filter(id => fixtures.includes(`"${id}"`)));
  for(const scenario of cases) {
    const start=events.length, entry={scenario,status:'blocked',samples:[],errors:[]};receipt.scenarios.push(entry);
    const closeView=STILLWORKS_CASES.includes(scenario);
    const query=new URLSearchParams({dev:'proving-ground',lab:closeView?'close-view':'combat-assets',env:'test-tile',scenario,seed:closeView?'CINDER-VERGE-47':'RENDER-LAB-1',variant:'0',size:'standard',reveal:'normal'});
    await call('Page.navigate',{url:`${origin}/?${query}`});
    // Bounded wait for the real entry point. No altered game state or renderer globals.
    let ready=false;
    for(let i=0;i<80;i++){await wait(100);try{ready=await evaluate('!!document.querySelector("#scenarioPause") && !!globalThis.provingGroundGame?.()')}catch{}if(ready)break;}
    if(!ready)throw Error(`scenario did not boot: ${scenario}`);
    await wait(4000);
    for(let i=0;i<2;i++){entry.samples.push(await evaluate(`(async()=>{const m=await import(new URL(${JSON.stringify(diagnosticsPath)},location.href));return m.closeViewRenderDiagnostics()})()`));await wait(300);}
    if(closeView) entry.witness=await closeViewWitness(scenario,{call,evaluate,wait,capture:async suffix=>{
      const name=`${scenario}-${suffix}.png`;
      const image=await call('Page.captureScreenshot',{format:'png'});
      writeFileSync(join(out,name),Buffer.from(image.data,'base64'));
      return name;
    }});
    // A PNG is evidence for human review, not an automatic aesthetic verdict.
    const image=await call('Page.captureScreenshot',{format:'png'});writeFileSync(join(out,`${scenario}.png`),Buffer.from(image.data,'base64'));
    entry.errors=events.slice(start).filter(e=>e.sessionId===sessionId&&(e.method==='Runtime.exceptionThrown'||(e.method==='Network.responseReceived'&&e.params.response.status>=400)||e.method==='Network.loadingFailed')).map(e=>({method:e.method,details:e.params}));
    Object.assign(entry,assess(entry.samples,entry.errors));
    entry.screenshot=`${scenario}.png`;
  }
  receipt.status=receipt.scenarios.every(s=>s.status==='render-observed')?'render-observed':'blocked';
  // Recheck source bytes after execution, not just before serving them.
  if(verifyCandidate(root).digest!==expected)throw Error('candidate changed during execution');
}catch(error){
  receipt.errors.push(String(error.message||error));receipt.status='blocked';
  if(pageCall)try{
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
