import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ProposalWorkflow, POLICY, canonical, digest } from '../src/proposal-workflow.mjs';
import { inventory, inventoryDigest, validatePreview } from '../src/release-artifact.mjs';

class FixtureWorkflow extends ProposalWorkflow {
 fixture={head:'a'.repeat(40),tree:'b'.repeat(40),branch:'candidate/test',dirty:false,dirtyDigest:digest(''),originMain:'c'.repeat(40),originPages:'d'.repeat(40),remote:POLICY.remote};
 snapshot(){return {...this.fixture}}
 gitText(...args:string[]){return args[0]==='diff'?'src/example.ts':''}
 remoteRefs(){return {main:this.fixture.originMain,ghPages:this.fixture.originPages}}
}
function setup(){
 const root=mkdtempSync(join(tmpdir(),'ic-owner-root-')),store=mkdtempSync(join(tmpdir(),'ic-owner-store-'));
 for(const dir of ['.change-control','dist/src','dist/assets','dist/proving-ground'])mkdirSync(join(root,dir),{recursive:true});
 writeFileSync(join(root,'.change-control/project.json'),JSON.stringify({projectId:POLICY.projectId}));
 writeFileSync(join(root,'package.json'),'{}');
 const files={ 'index.html':'<script type="module" src="./src/main.js?v=91"></script>', 'sw.js':'const CACHE_PREFIX="infinite-corridor-",CACHE=`${CACHE_PREFIX}v91`;', 'manifest.webmanifest':'{}',
 'styles.css':'body{color:white}', 'icon.svg':'<svg/>', 'assets/test.png':'fake-pixels', 'src/main.js':'const release="91";',
 'src/proving-ground-mobile.js':'import "./proving-ground.js?v=91";const storageNamespace="ic-proving-ground-scratch-v1";',
 'src/proving-ground.js':'export const scratch=true;', 'src/persistence.js':'throw new Error("never import preview persistence");',
 'proving-ground/index.html':'<title>Infinite Corridor - Proving Ground</title><link rel="stylesheet" href="../styles.css?v=91"><strong>PROVING GROUND</strong><script>const release = "91"; const entry = "../src/proving-ground-mobile.js";</script>',
 'proving-ground/manifest.webmanifest':JSON.stringify({name:'Lab',icons:[{src:'../icon.svg'}]}), 'proving-ground/sw.js':'// old lab worker' };
 for(const [file,text] of Object.entries(files))writeFileSync(join(root,'dist',file),text);
 const runner={run(command:string,args:string[]){return {command:[command,...args],startedAt:'2026-10-03T01:00:00Z',finishedAt:'2026-10-03T01:00:01Z',exitCode:0,stdoutDigest:digest('ok'),stderrDigest:digest('')}}};
 const workflow=new FixtureWorkflow({root,store,runner:runner as any,now:()=>Date.parse('2026-10-03T01:00:00Z')});
 return {workflow,root,store};
}
const create=(w:any)=>w.create({channelId:POLICY.channelId});
function ready(){const s=setup(),p=create(s.workflow),validated=s.workflow.validate(p.proposalId);assert.equal(validated.ok,true);return {...s,p:validated.proposal}}
function published(w:any,p:any){return w.change(p,{previewPublication:{pagesCommit:'e'.repeat(40),artifactDigest:p.artifactDigest,url:p.previewUrl}},'fixture-preview-published')}
function approve(w:any,p:any){const reviewDigest=w.reviewDigest(p);return w.decide(p.proposalId,{channelId:POLICY.channelId,reviewDigest,previewTested:true,ownerDecision:`approve ${p.proposalId} ${reviewDigest}`})}

test('canonical hashes do not depend on object key order',()=>assert.equal(digest({b:2,a:1}),digest({a:1,b:2})));
test('isolated candidate retains logical project identity and candidate branch',()=>{const {workflow}=setup(),p=create(workflow);assert.equal(p.repository,POLICY.repository);assert.equal(p.branch,'candidate/test');assert.equal(p.policyVersion,2);assert.match(p.proposalId,/^icp_[a-f0-9]{24}_[a-f0-9]{16}$/)});
test('wrong ownership and remote are rejected',()=>{const {root,store,workflow}=setup();writeFileSync(join(root,'.change-control/project.json'),'{"projectId":"foreign"}');assert.throws(()=>new ProposalWorkflow({root,store}),/foreign/);workflow.fixture.remote='https://example.invalid/';assert.throws(()=>create(workflow),/wrong Git remote/)});
test('wrong channel, unknown IDs and path traversal fail',()=>{const {workflow}=setup();assert.throws(()=>workflow.create({channelId:'wrong'}),/unauthorized/);assert.throws(()=>workflow.push(undefined,{channelId:'wrong'}),/unauthorized/);assert.throws(()=>workflow.show('../escape'),/invalid/);assert.throws(()=>workflow.show(`icp_${'a'.repeat(24)}_${'b'.repeat(16)}`),/unknown/)});
test('real validation seals every file and enters owner review idempotently',()=>{const {workflow,p}=ready();assert.equal(p.state,'OWNER_REVIEW');assert.ok(p.files.release['assets/test.png']);assert.ok(p.files.release['src/main.js']);assert.equal(workflow.validate(p.proposalId).idempotent,true);assert.equal(workflow.show(p.proposalId).decision,null)});
test('synthetic validation and synthetic receipts cannot qualify',()=>{const {workflow}=setup(),p=create(workflow);assert.throws(()=>workflow.validate(p.proposalId,{execute:false}),/synthetic/);(workflow as any).runner={run:()=>({exitCode:0,fixture:true})};assert.equal(workflow.validate(p.proposalId).ok,false);assert.equal(workflow.show(p.proposalId).state,'FAILED')});
test('validation failure and source drift during checks cannot qualify',()=>{const {workflow}=setup(),p=create(workflow);(workflow as any).runner={run:()=>{workflow.fixture.head='f'.repeat(40);return {exitCode:0,startedAt:'x',finishedAt:'y'}}};const r=workflow.validate(p.proposalId);assert.equal(r.ok,false);assert.ok(r.proposal.blockers.includes('candidate drift'))});
test('complete inventory rejects modified, missing and extra files',()=>{for(const mutation of ['modified','missing','extra']){const {workflow,p}=ready(),dir=join(workflow.artifactDir(p),'release'),path=join(dir,'assets/test.png');if(mutation==='modified')writeFileSync(path,'changed');if(mutation==='missing')rmSync(path);if(mutation==='extra')writeFileSync(join(dir,'extra.js'),'x');assert.throws(()=>workflow.preview(p.proposalId),/artifact changed/)}});
test('preview URLs, cache and module graph remain local and scratch-only',()=>{const {workflow,p}=ready(),dir=join(workflow.artifactDir(p),'preview-site'),files=inventory(dir);assert.equal(validatePreview(dir).ok,true);assert.equal(files['src/main.js'],undefined);assert.equal(files['src/persistence.js'],undefined);assert.ok(readFileSync(join(dir,'index.html'),'utf8').includes('./src/proving-ground-mobile.js'));const sw=readFileSync(join(dir,'sw.js'),'utf8');assert.ok(sw.includes(`ic-preview-${p.proposalId}`));assert.ok(sw.includes('c.match(e.request'));assert.ok(sw.includes('self.registration.scope'));assert.equal(sw.includes('caches.match'),false);assert.equal(sw.includes('caches.delete'),false);assert.ok(readFileSync(join(dir,'src/proving-ground-mobile.js'),'utf8').includes(`ic-preview-${p.proposalId}-scratch`))});
test('preview identity changes between candidates and mutable dist is ignored later',()=>{const {workflow,p,root}=ready(),before=workflow.preview(p.proposalId).artifactDigest;writeFileSync(join(root,'dist/src/main.js'),'mutable untested replacement');assert.equal(workflow.preview(p.proposalId).artifactDigest,before);const second=create(workflow);assert.notEqual(second.previewUrl,p.previewUrl)});
test('bare push and unapproved promotion never mutate externally',()=>{const {workflow,p}=ready();assert.equal(workflow.push(undefined,{channelId:POLICY.channelId}).ok,false);const r=workflow.push(p.proposalId,{channelId:POLICY.channelId});assert.equal(r.ok,false);assert.equal(r.externalMutations,false);assert.throws(()=>workflow.promote(p.proposalId,{channelId:POLICY.channelId}),/owner approval/)});
test('approval must match full review digest and explicit owner text',()=>{const {workflow,p}=ready(),rd=workflow.reviewDigest(p);assert.throws(()=>workflow.decide(p.proposalId,{channelId:POLICY.channelId,reviewDigest:'bad',ownerDecision:'approve'}),/digest mismatch/);assert.throws(()=>workflow.decide(p.proposalId,{channelId:POLICY.channelId,reviewDigest:rd,ownerDecision:'yes'}),/exact owner/);assert.throws(()=>approve(workflow,p),/published preview/)});
test('owner approval requires preview testing; rejection prevents promotion',()=>{const {workflow,p}=ready(),pub=published(workflow,p),rd=workflow.reviewDigest(pub);assert.throws(()=>workflow.decide(p.proposalId,{channelId:POLICY.channelId,reviewDigest:rd,ownerDecision:`approve ${p.proposalId} ${rd}`}),/testing/);const r=workflow.decide(p.proposalId,{channelId:POLICY.channelId,reviewDigest:rd,ownerDecision:`reject ${p.proposalId} ${rd}`});assert.equal(r.proposal.state,'REJECTED');assert.equal(workflow.push(p.proposalId,{channelId:POLICY.channelId}).ok,false)});
test('approved promotion plan binds immutable artifact and expected remote refs',()=>{const {workflow,p}=ready(),pub=published(workflow,p),r=approve(workflow,pub);assert.equal(r.proposal.state,'APPROVED');const plan=workflow.push(p.proposalId,{channelId:POLICY.channelId});assert.equal(plan.ok,true);assert.equal(plan.mode,'PLAN_ONLY');assert.equal(plan.artifactDigest,p.artifactDigest);assert.equal(plan.expectedRefs.ghPages,'e'.repeat(40));assert.equal(plan.externalMutations,false);assert.equal(workflow.show(p.proposalId).consumedAt,null)});
test('expired, dirty, dependency and source drift invalidate decisions',()=>{for(const kind of ['expired','dirty','dependency','source']){const {workflow,p,root}=ready(),pub=published(workflow,p);if(kind==='expired')workflow.now=()=>Date.parse(p.expiresAt)+1;if(kind==='dirty')workflow.fixture.dirty=true;if(kind==='dependency')writeFileSync(join(root,'package.json'),'{} ');if(kind==='source')workflow.fixture.tree='f'.repeat(40);assert.equal(approve(workflow,pub).ok,false)}});
test('legacy proposals cannot inherit new owner policy',()=>{const {workflow,p}=ready();const legacy=workflow.change(p,{policyVersion:1,state:'WAITING_FOR_VERDICT_GATE'},'fixture-legacy');assert.equal(workflow.reconcile(legacy).ok,false)});
test('remote drift stops preview publishing before any git mutation',()=>{const {workflow,p}=ready();workflow.fixture.originPages='f'.repeat(40);(workflow as any).runGit=()=>assert.fail('must not mutate');assert.throws(()=>workflow.publishPreview(p.proposalId,{channelId:POLICY.channelId,execute:true}),/remote refs changed/);assert.equal(workflow.show(p.proposalId).publication,null)});
test('interrupted successful preview push reconciles recorded remote target',()=>{const {workflow,p}=ready();workflow.change(p,{publication:{kind:'preview',pagesCommit:'e'.repeat(40),artifactDigest:p.artifactDigest}},'fixture-pending');workflow.fixture.originPages='e'.repeat(40);(workflow as any).runGit=()=>assert.fail('must not repush');const r=workflow.publishPreview(p.proposalId,{channelId:POLICY.channelId,execute:true});assert.equal(r.proposal.previewPublication.pagesCommit,'e'.repeat(40));assert.equal(r.proposal.publication,null)});
test('consumed approvals cannot be replayed and supersession is durable',()=>{const {workflow,p}=ready();workflow.change(p,{state:'CONSUMED',consumedAt:'fixture'},'fixture-consumed');assert.equal(workflow.push(p.proposalId,{channelId:POLICY.channelId}).ok,false);const other=create(workflow);assert.equal(workflow.supersede(other.proposalId,{channelId:POLICY.channelId}).proposal.state,'SUPERSEDED');assert.equal(workflow.supersede(other.proposalId,{channelId:POLICY.channelId}).idempotent,true)});
test('manifest tampering and substituted project identity fail integrity',()=>{const {workflow,p}=ready(),path=join(workflow.proposalDir(p.proposalId),'current.json'),value=JSON.parse(readFileSync(path,'utf8'));value.artifactDigest='fake';writeFileSync(path,JSON.stringify(value));assert.throws(()=>workflow.show(p.proposalId),/integrity/)});

function publicationFixture(workflow:any){
 let remote={main:workflow.fixture.originMain,ghPages:workflow.fixture.originPages},work='',pushes:any[]=[];
 workflow.remoteRefs=()=>({...remote});workflow.publicationHead=()=> '9'.repeat(40);workflow.verifyPublication=()=>{};
 workflow.runGit=(cwd:string,...args:string[])=>{
  if(args[0]==='clone'){work=args.at(-1)!;mkdirSync(join(work,'.git'),{recursive:true});mkdirSync(join(work,'previews','other'),{recursive:true});writeFileSync(join(work,'index.html'),'existing production');writeFileSync(join(work,'previews','other','index.html'),'other preview');}
  if(args[0]==='push'){pushes.push(args);assert.ok(args.includes('--atomic'));assert.ok(args.some(a=>a.startsWith('--force-with-lease=refs/heads/gh-pages:')));remote.ghPages='9'.repeat(40);const main=args.find(a=>a.endsWith(':refs/heads/main'));if(main)remote.main=main.split(':')[0];}
  return {exitCode:0};
 };
 return {get work(){return work},pushes,setRemote(value:any){remote=value}};
}
test('preview publication changes only candidate route and retains production bytes',()=>{
 const {workflow,p}=ready(),fixture=publicationFixture(workflow);const result=workflow.publishPreview(p.proposalId,{channelId:POLICY.channelId,execute:true});
 assert.equal(result.ok,true);assert.equal(readFileSync(join(fixture.work,'index.html'),'utf8'),'existing production');
 assert.equal(readFileSync(join(fixture.work,'previews','other','index.html'),'utf8'),'other preview');
 assert.equal(inventoryDigest(inventory(join(fixture.work,'previews',p.proposalId))),inventoryDigest(p.files.preview));
 assert.equal(fixture.pushes[0].filter((a:string)=>a.endsWith(':refs/heads/main')).length,0);assert.equal(result.proposal.decision,null);
});
test('promotion copies sealed release not dist and atomically pushes exact source and pages',()=>{
 const {workflow,p,root}=ready(),pub=published(workflow,p);approve(workflow,pub);workflow.fixture.originPages='e'.repeat(40);const fixture=publicationFixture(workflow);
 writeFileSync(join(root,'dist/src/main.js'),'untested mutable dist');const result=workflow.promote(p.proposalId,{channelId:POLICY.channelId,execute:true});
 assert.equal(result.proposal.state,'CONSUMED');assert.ok(fixture.pushes[0].includes(`${p.candidateCommit}:refs/heads/main`));
 assert.equal(readFileSync(join(fixture.work,'src/main.js'),'utf8'),readFileSync(join(workflow.artifactDir(p),'release/src/main.js'),'utf8'));
 assert.equal(readFileSync(join(fixture.work,'previews/other/index.html'),'utf8'),'other preview');
 assert.equal(workflow.promote(p.proposalId,{channelId:POLICY.channelId,execute:true}).ok,false);assert.equal(fixture.pushes.length,1);
});
test('candidate namespace reset avoids unrelated session storage and parent URLs are rejected',()=>{
 const mobile=readFileSync(new URL('../src/proving-ground-mobile.ts',import.meta.url),'utf8');assert.equal(mobile.includes('sessionStorage.clear()'),false);assert.ok(mobile.includes('storageNamespace+":"'));
 const {workflow,p}=ready(),root=join(workflow.artifactDir(p),'preview-site');writeFileSync(join(root,'leak.js'),'import "../src/game.js";');assert.throws(()=>validatePreview(root),/parent reference/);
});
test('artifact junctions cannot escape into another directory',()=>{
 const {workflow,p}=ready(),root=join(workflow.artifactDir(p),'preview-site'),target=mkdtempSync(join(tmpdir(),'ic-outside-'));symlinkSync(target,join(root,'outside'),'junction');assert.throws(()=>inventory(root),/symlinks/);
});
test('concurrent supersession cannot pass the shared publication lock',()=>{
 const {workflow,p}=ready(),fixture=publicationFixture(workflow),original=(workflow as any).runGit;
 (workflow as any).runGit=(cwd:string,...args:string[])=>{if(args[0]==='clone')assert.throws(()=>workflow.supersede(p.proposalId,{channelId:POLICY.channelId}),/EEXIST/);return original(cwd,...args)};
 assert.equal(workflow.publishPreview(p.proposalId,{channelId:POLICY.channelId,execute:true}).ok,true);
 assert.equal(workflow.show(p.proposalId).state,'OWNER_REVIEW');
});
test('inventories include __proto__ and reject reserved release directories',()=>{
 const {workflow,p,root}=ready(),artifact=join(workflow.artifactDir(p),'release');writeFileSync(join(artifact,'__proto__'),'must hash this');assert.ok(Object.keys(inventory(artifact)).includes('__proto__'));
 mkdirSync(join(root,'dist','previews'));const second=create(workflow);assert.throws(()=>workflow.validate(second.proposalId),/reserved release path/);
});
test('real Git verification detects line-ending conversion and accepts raw committed payload',()=>{
 const {workflow,p}=ready(),work=mkdtempSync(join(tmpdir(),'ic-git-bytes-')),source=join(workflow.artifactDir(p),'release');cpSync(source,work,{recursive:true});
 writeFileSync(join(work,'crlf.txt'),'one\r\ntwo\r\n');const expected={...p,files:{...p.files,release:inventory(work)}};
 const git=(...args:string[])=>{const r=spawnSync('git',args,{cwd:work,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);return r.stdout.trim()};
 git('init');git('config','core.autocrlf','true');git('add','--all');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','normalized');
 assert.throws(()=>workflow.verifyPublication(work,git('rev-parse','HEAD'),expected,'production'),/committed release bytes differ/);
 git('config','core.autocrlf','false');mkdirSync(join(work,'.git','info'),{recursive:true});writeFileSync(join(work,'.git','info','attributes'),'* -text -filter -ident\n');git('add','--renormalize','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','exact');
 assert.doesNotThrow(()=>workflow.verifyPublication(work,git('rev-parse','HEAD'),expected,'production'));
});
test('stale lock recovery requires dead process, exact digest and unambiguous refs',()=>{
 const {workflow,p}=ready(),lock=join(workflow.proposalDir(p.proposalId),'publication.lock');
 writeFileSync(lock,JSON.stringify({pid:process.pid,operation:'preview'}));assert.throws(()=>workflow.recoverLock(p.proposalId,{channelId:POLICY.channelId}),/still alive/);
 writeFileSync(lock,JSON.stringify({pid:2147483647,operation:'preview'}));workflow.change(p,{publication:{kind:'preview',pagesCommit:'e'.repeat(40),expectedRefs:{main:p.baseCommit,ghPages:p.pagesBefore},artifactDigest:p.artifactDigest}},'fixture-interrupted');
 const plan=workflow.recoverLock(p.proposalId,{channelId:POLICY.channelId});assert.equal(plan.resolution,'pending-publication-retain-lock');assert.throws(()=>workflow.recoverLock(p.proposalId,{channelId:POLICY.channelId,execute:true,lockDigest:plan.lockDigest}),/child may still be running/);
 workflow.fixture.originPages='e'.repeat(40);assert.throws(()=>workflow.recoverLock(p.proposalId,{channelId:POLICY.channelId,execute:true,lockDigest:'wrong'}),/digest mismatch/);
 const recovered=workflow.recoverLock(p.proposalId,{channelId:POLICY.channelId,execute:true,lockDigest:plan.lockDigest});assert.equal(recovered.proposal.publication,null);assert.equal(recovered.externalMutations,false);
});
test('completed promotion stale lock cleanup never reopens a consumed approval',()=>{
 const {workflow,p}=ready(),target={kind:'production',pagesCommit:'e'.repeat(40),expectedRefs:{main:p.baseCommit,ghPages:p.pagesBefore},artifactDigest:p.artifactDigest};
 workflow.change(p,{state:'CONSUMED',publication:target,deployedRefs:{main:p.candidateCommit,ghPages:target.pagesCommit}},'fixture-completed');
 workflow.fixture.originMain=p.candidateCommit;workflow.fixture.originPages=target.pagesCommit;
 const lock=join(workflow.proposalDir(p.proposalId),'publication.lock');writeFileSync(lock,JSON.stringify({pid:2147483647,operation:'production'}));
 const plan=workflow.recoverLock(p.proposalId,{channelId:POLICY.channelId});assert.equal(plan.resolution,'cleanup-completed-publication-lock');
 const r=workflow.recoverLock(p.proposalId,{channelId:POLICY.channelId,lockDigest:plan.lockDigest,execute:true});assert.equal(r.proposal.state,'CONSUMED');assert.equal(workflow.push(p.proposalId,{channelId:POLICY.channelId}).ok,false);
});
