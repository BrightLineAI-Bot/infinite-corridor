import test from 'node:test';
import assert from 'node:assert/strict';
import { assess, stableFramePair, capturedWebGLFrames, classifyRenderer, safePath, diagnosticsModulePath, diagnosticsFromRows } from './evidence.mjs';
const sample=frame=>({active:true,frame,backend:'webgl2',player:'imported',asset:'ready',gpu:{state:'ready',heroState:'ready'}});
test('public diagnostics must report the exact candidate and real imported WebGL frames',()=>{
  const id='r865-1532e8b05f7f';
  const rows={'Game release':id,'Close View scene':'active: webgl2, completed frame 12','Player representation':'active: imported',
    'Hero asset':'ready','GPU scene':'readiness: ready; last failure (historical): none',
    'Hero GPU':'readiness: ready; last failure (historical): none','Recent errors':'none'};
  const result=diagnosticsFromRows(rows,id);
  assert.deepEqual(result,{...sample(12),clientError:false});
  assert.throws(()=>diagnosticsFromRows(rows,'r864-9be7ed5f7dd5'),/different candidate/);
  const historical=diagnosticsFromRows({...rows,'Close View scene':'inactive; historical: webgl2, completed frame 12'},id);
  assert.equal(assess([historical,sample(13)]).status,'blocked');
});
test('actual advancing imported renderer observations do not grant visual or device acceptance',()=>{const r=assess([sample(1),sample(2)]);assert.equal(r.status,'render-observed');assert.equal(r.visualAcceptance,'not-reviewed');assert.equal(r.devicePerformance,'not-measured')});
test('captured native WebGL frames remain evidence without satisfying the imported-hero gate',()=>{
  const samples=[sample(7),sample(10)].map(s=>({...s,player:'native',asset:'loading'}));
  assert.equal(capturedWebGLFrames({samples,captures:['startup.png']}),false);
  assert.equal(capturedWebGLFrames({samples,screenshot:'sampled.png'}),true);
  assert.equal(assess(samples).status,'blocked');
});
for(const [name,patch] of Object.entries({billboard:{backend:'2d',player:'billboard'},native:{player:'native'},stale:{active:false},missingAsset:{asset:'not-requested'},lost:{gpu:{state:'context-lost',heroState:'ready'}},missingUpload:{gpu:{state:'ready',heroState:'not-prepared'}}}))test(`${name} is blocked`,()=>assert.equal(assess([{...sample(1),...patch},{...sample(2),...patch}]).status,'blocked'));
test('slow imported hero readiness retains startup fallback but requires two advancing ready frames',async()=>{
  let t=0, index=0;
  const startup={...sample(16),player:'native',asset:'loading',gpu:{state:'ready',heroState:'not-prepared'}};
  const frames=[startup,sample(19),sample(19),sample(22)];
  const receipt=await stableFramePair(async()=>frames[index++],async ms=>{t+=ms;},{now:()=>t,timeoutMs:1000,intervalMs:100});
  assert.deepEqual(receipt,{startup,samples:[sample(19),sample(22)]});
  const stalled=await stableFramePair(async()=>startup,async ms=>{t+=ms;},{now:()=>t,timeoutMs:200,intervalMs:100});
  assert.equal(assess(stalled.samples).status,'blocked');
});
test('empty samples are blocked',()=>assert.equal(assess([]).status,'blocked'));
test('stationary frames are blocked',()=>assert.equal(assess([sample(4),sample(4)]).status,'blocked'));
test('runtime errors are blocked',()=>assert.equal(assess([sample(1),sample(2)],['shader failure']).status,'blocked'));
test('software rendering labelled, unidentified graphics never certified hardware',()=>{assert.equal(classifyRenderer({renderer:'ANGLE SwiftShader'}),'software');assert.equal(classifyRenderer({renderer:'llvmpipe'}),'software');assert.equal(classifyRenderer({renderer:'NVIDIA'}),'unknown');assert.equal(classifyRenderer(null),'unknown')});
for(const p of ['../x','/%2e%2e/secret','/a\\b','/%00x','/%zz'])test(`reject ${p}`,()=>assert.throws(()=>safePath(p)));
test('normal candidate paths are safe',()=>{assert.equal(safePath('/'),'index.html');assert.equal(safePath('/assets/wayfarer/rogue-v2.json'),'assets/wayfarer/rogue-v2.json')});

for(const entry of ['import { x } from "./close-view.js";', 'import { x } from "./close-view.js?v=other";', ''])test(`missing/extraneous diagnostics query blocks: ${entry}`,()=>{
  assert.throws(()=>diagnosticsModulePath(entry,'r852-aaaaaaaaaaaa'));
});
test('diagnostics import shares the live versioned module instance, never a fresh unversioned copy',async t=>{
  const {mkdtempSync,mkdirSync,writeFileSync,rmSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {pathToFileURL}=await import('node:url');
  const root=mkdtempSync(join(tmpdir(),'ic-module-identity-'));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'src'));
  writeFileSync(join(root,'package.json'),'{"type":"module"}');
  writeFileSync(join(root,'src/close-view.js'),'let frame=0;export function advance(){frame++}export function closeViewRenderDiagnostics(){return {frame}}');
  const entry='import { advance } from "./close-view.js?v=r852-aaaaaaaaaaaa";advance();';
  writeFileSync(join(root,'src/proving-ground-mobile.js'),entry);
  await import(pathToFileURL(join(root,'src/proving-ground-mobile.js')).href);
  const modulePath=diagnosticsModulePath(entry,'r852-aaaaaaaaaaaa');
  const live=await import(new URL(modulePath,pathToFileURL(join(root,'index.html'))).href);
  const unversioned=await import(pathToFileURL(join(root,'src/close-view.js')).href);
  assert.equal(live.closeViewRenderDiagnostics().frame,1);
  assert.equal(unversioned.closeViewRenderDiagnostics().frame,0);
});
