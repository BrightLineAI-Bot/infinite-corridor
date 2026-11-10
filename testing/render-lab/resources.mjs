import { existsSync, realpathSync } from 'node:fs';
import { dirname, basename, join, relative, resolve, sep } from 'node:path';
// Resolve aliases through the closest existing ancestor, including nonexistent outputs.
export function canonicalPath(path) {
  let parent=resolve(path);const tail=[];
  while(!existsSync(parent)){const next=dirname(parent);if(next===parent)throw Error('cannot resolve path');tail.unshift(basename(parent));parent=next;}
  return join(realpathSync(parent),...tail);
}
export function disjointPaths(input, output) {
  const root=canonicalPath(input), out=canonicalPath(output);
  const outside=(a,b)=>{const rel=relative(a,b);return rel==='..'||rel.startsWith(`..${sep}`);};
  if(!outside(root,out)||!outside(out,root))throw Error('output and candidate must be disjoint');
  return {root,out};
}
export function bounded(promise, ms, message='operation timed out') {
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms)})]).finally(()=>clearTimeout(timer));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// A false readiness signal can settle; a failed browser command is a transport
// error and must not be swallowed and retried for the rest of the job.
export async function waitForBrowserScene(probe, { budgetMs=12000, now=Date.now, delay=sleep }={}) {
  const end=now()+budgetMs;
  while(now()<end) {
    if(await probe()) return true;
    if(now()<end) await delay(100);
  }
  return false;
}

// Events may arrive before Page.navigate replies. Match the reported loader and
// frame against the buffered events, and use a live default execution context.
export function navigationObservation(events, sessionId, { frameId, loaderId }) {
  let committed = false, domReady = false, contextId;
  let failedRequests = 0, exceptions = 0;
  for (const { sessionId: session, method, params: p } of events) {
    if (session !== sessionId) continue;
    if (method === 'Page.frameNavigated' && p.frame.id === frameId) {
      committed = p.frame.loaderId === loaderId;
      if (!committed) domReady = false;
    } else if (method === 'Page.lifecycleEvent' && p.frameId === frameId && p.loaderId === loaderId && p.name === 'DOMContentLoaded') {
      domReady = true;
    } else if (method === 'Runtime.executionContextsCleared') contextId = undefined;
    else if (method === 'Runtime.executionContextCreated' && p.context.auxData?.frameId === frameId && p.context.auxData?.isDefault) contextId = p.context.id;
    else if (method === 'Runtime.executionContextDestroyed' && p.executionContextId === contextId) contextId = undefined;
    else if (method === 'Network.loadingFailed' || (method === 'Network.responseReceived' && p.response.status >= 400)) failedRequests++;
    else if (method === 'Runtime.exceptionThrown') exceptions++;
  }
  return { committed, domReady, contextId, failedRequests, exceptions };
}

// The runner launches one detached POSIX process group, never targets existing processes.
export async function stopBrowser(child, {signal=(pid,sig)=>process.kill(pid,sig), delay=sleep, attempts=30}={}) {
  if(!child?.pid)return true;
  const alive=()=>{try{signal(-child.pid,0);return true}catch(e){if(e.code==='ESRCH')return false;throw e}};
  if(!alive())return true;
  for(const sig of ['SIGTERM','SIGKILL']) {
    try{signal(-child.pid,sig)}catch(e){if(e.code==='ESRCH')return true;throw e}
    for(let i=0;i<attempts;i++){if(!alive())return true;await delay(100)}
  }
  return false;
}

// Closed argument list; do not weaken Chrome's normal sandbox or force a renderer.
export function normalBrowserFlags(profile) {
  return ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-background-networking', 'about:blank'];
}
