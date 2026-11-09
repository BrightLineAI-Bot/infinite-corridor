import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { disjointPaths, bounded, stopBrowser, normalBrowserFlags } from './resources.mjs';
test('canonical path containment rejects ..prefixed child and symlink aliases',()=>{const dir=mkdtempSync(join(tmpdir(),'render-path-test-'));try{const c=join(dir,'candidate');mkdirSync(c);symlinkSync(c,join(dir,'alias'),'dir');for(const out of [c,join(c,'..evidence'),join(dir,'alias','evidence'),dir])assert.throws(()=>disjointPaths(c,out));assert.deepEqual(disjointPaths(c,join(dir,'evidence')),{root:c,out:join(dir,'evidence')})}finally{rmSync(dir,{recursive:true,force:true})}});
test('bounded timeout rejects stalled operations',async()=>{await assert.rejects(bounded(new Promise(()=>{}),5,'bounded'),/bounded/);assert.equal(await bounded(Promise.resolve(7),100),7)});
test('termination escalates only own process group and confirms absence',async()=>{const calls=[];let alive=true;const stopped=await stopBrowser({pid:123},{attempts:1,delay:async()=>{},signal:(pid,sig)=>{assert.equal(pid,-123);calls.push(sig);if(!alive)throw Object.assign(Error(),{code:'ESRCH'});if(sig==='SIGKILL')alive=false}});assert.equal(stopped,true);assert.ok(calls.includes('SIGTERM'));assert.ok(calls.includes('SIGKILL'))});
test('unconfirmed process group cleanup returns false, never claims stopped',async()=>assert.equal(await stopBrowser({pid:123},{attempts:1,delay:async()=>{},signal:()=>{}}),false));
test('missing child is already stopped',async()=>assert.equal(await stopBrowser(undefined),true));

test('normal sandbox browser flags are closed and never force GPU or software rendering',()=>{
  assert.deepEqual(normalBrowserFlags('/tmp/disposable'),['--headless','--remote-debugging-port=0','--user-data-dir=/tmp/disposable','--no-first-run','--disable-background-networking','about:blank']);
});
