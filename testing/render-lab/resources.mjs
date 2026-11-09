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
