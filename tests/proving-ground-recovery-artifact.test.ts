import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { freeze, verifyCandidate, sourceRelease } from '../scripts/pages-release.mjs';
import { recoveryScope } from '../src/proving-ground-recovery.ts';
import { inventory, inventoryDigest } from '../src/release-artifact.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFileSync(join(root,p),'utf8');
const modules=['save-codec','proving-ground-recovery'];

test('recovery dependency registration retains both offline workers and canonical build',()=>{
 const build=read('scripts/build.mjs'),N=sourceRelease(root);
 for(const name of modules){assert.ok(build.includes(`'${name}'`));for(const worker of ['sw.js','proving-ground/sw.js'])assert.ok(read(worker).includes(`/src/${name}.js?v=${N}`),`${worker} ${name}`);}
 assert.ok(read('src/proving-ground.ts').includes('./save-codec.ts'));
 assert.ok(read('src/proving-ground.ts').includes('./proving-ground-recovery.ts'));
 for(const name of modules)assert.doesNotMatch(read(`src/${name}.ts`),/(?:from\s*|import\s*)['"]\.\/(?:main|persistence)\.ts/);
});

test('actual build freezes recovery graph without production entry or persistence and never mutates prior artifacts',()=>{
 const build=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:root,encoding:'utf8',timeout:60000});assert.equal(build.status,0,`${build.error||''} ${build.stderr}`);
 const temp=mkdtempSync(join(tmpdir(),'ic-recovery-artifact-')),dist=join(root,'dist'),before=inventoryDigest(inventory(dist));
 try{
  const first=join(temp,'first'),second=join(temp,'second'),A=freeze({root,dist,out:first,commit:'a'.repeat(40),tree:'1'.repeat(40)});
  const firstDigest=inventoryDigest(inventory(first));
  const B=freeze({root,dist,out:second,commit:'b'.repeat(40),tree:'2'.repeat(40)});assert.notEqual(A.id,B.id);
  for(const out of [first,second]){
   verifyCandidate(out);
   for(const name of modules){assert.ok(existsSync(join(out,`preview-site/src/${name}.js`)));const id=out===first?A.id:B.id;const expected=readFileSync(join(dist,`src/${name}.js`),'utf8').replaceAll(`?v=${sourceRelease(root)}`,`?v=${id}`);assert.equal(readFileSync(join(out,`preview-site/src/${name}.js`),'utf8'),expected,'only canonical module URL versions change; recovery namespaces need no freezer rewrite');}
   assert.equal(existsSync(join(out,'preview-site/src/main.js')),false);assert.equal(existsSync(join(out,'preview-site/src/persistence.js')),false);
   const graph=inventory(join(out,'preview-site'));const idb=Object.keys(graph).filter(p=>/^src\/.*\.js$/.test(p)&&/indexedDB/.test(readFileSync(join(out,'preview-site',p),'utf8'))).map(p=>p.slice(4,-3)).sort();assert.deepEqual(idb,['proving-ground-handoff','proving-ground-recovery'],'only the two reviewed adapters can access IndexedDB');
   assert.ok(existsSync(join(out,'release/src/main.js')));assert.ok(existsSync(join(out,'release/src/persistence.js')));
  }
  assert.equal(inventoryDigest(inventory(first)),firstDigest,'second candidate leaves first frozen artifact byte-identical');assert.equal(inventoryDigest(inventory(dist)),before,'freezing leaves build bytes unchanged');
  writeFileSync(join(second,'preview-site/src/proving-ground-recovery.js'),'tampered');assert.throws(()=>verifyCandidate(second),/artifact changed/);verifyCandidate(first);
  // Prove the existing forbidden-import gate is still active, rather than merely observing absent files.
  const mobile=join(dist,'src/proving-ground-mobile.js'),original=readFileSync(mobile,'utf8');
  try{writeFileSync(mobile,original+'\nimport "./persistence.js";');assert.throws(()=>freeze({root,dist,out:join(temp,'forbidden'),commit:'c'.repeat(40),tree:'3'.repeat(40)}),/preview imports production persistence/);}finally{writeFileSync(mobile,original);}
  assert.equal(inventoryDigest(inventory(dist)),before);
 }finally{rmSync(temp,{recursive:true,force:true});}
});

test('recovery namespace is bound to verified candidate identity and exact page scope without freezer rewriting',()=>{
 const binding={proposalId:'r849-aaaaaaaaaaaa',candidateCommit:'a'.repeat(40),candidateTree:'1'.repeat(40)},href=`https://example.test/corridor/previews/${binding.proposalId}/index.html`,a=recoveryScope(binding,href);
 assert.equal(a.store,'checkpoint');assert.equal(a.key,'natural-lantern-leap-reload');assert.deepEqual(a.binding,binding);
 assert.ok(a.db.startsWith(`ic-preview-${binding.proposalId}-scratch:recovery:${binding.candidateTree}:`));assert.notEqual(a.db,'infinite-corridor');assert.notEqual(a.db,'proving-ground-handoff');
 assert.equal(recoveryScope(binding,new URL('./?lab=recovery',href).href).db,a.db);
 const alternatives=[
  [{proposalId:'r850-bbbbbbbbbbbb',candidateCommit:'b'.repeat(40),candidateTree:'2'.repeat(40)},'https://example.test/corridor/previews/r850-bbbbbbbbbbbb/'],
  [{...binding,candidateTree:'2'.repeat(40)},href],
  [binding,href.replace('/corridor/','/alias/')],
  [binding,href.replace('example.test','separate.test')]
 ];for(const[b,url]of alternatives)assert.notEqual(recoveryScope(b,url).db,a.db);
 for(const url of ['https://example.test/corridor/','https://example.test/corridor/proving-ground/',href.replace(binding.proposalId,'r849-bbbbbbbbbbbb'),href.replace('https://','https://user:password@'),'file:///previews/'+binding.proposalId+'/'])assert.throws(()=>recoveryScope(binding,url));
 for(const b of [{...binding,candidateCommit:'b'.repeat(40)},{...binding,candidateTree:'short'},{...binding,proposalId:'849'},{...binding,candidateCommit:'A'.repeat(40)}])assert.throws(()=>recoveryScope(b,href));
});
