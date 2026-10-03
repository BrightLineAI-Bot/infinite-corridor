import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { freezeArtifact, verifyArtifact, inventory, inventoryDigest, inside, sha256 } from './release-artifact.mjs';

export const POLICY = Object.freeze({ schema:'infinite-corridor-proposal/2.0.0', projectId:'8225aa1c-9d77-49ac-a8a9-f6b740f7d6f6',
 repository:'C:\\AI-PROJECTS\\infinite-corridor', remote:'https://github.com/BrightLineAI-Bot/infinite-corridor.git', channelId:'1552902598372237312',
 mainBranch:'main', pagesBranch:'gh-pages', productionUrl:'https://brightlineai-bot.github.io/infinite-corridor/',
 provingGroundUrl:'https://brightlineai-bot.github.io/infinite-corridor/proving-ground/', approvalPolicy:'explicit-owner-exact-candidate', maxAgeMs:7*24*60*60*1000 });
export const STATES = Object.freeze(['DRAFT','OWNER_REVIEW','APPROVED','REJECTED','CONSUMED','SUPERSEDED','FAILED','WAITING_FOR_VERDICT_GATE']);
const ID_RE = /^icp_[a-f0-9]{24}_[a-f0-9]{16}$/;
export function canonical(v) { if(Array.isArray(v))return `[${v.map(canonical).join(',')}]`;if(v&&typeof v==='object')return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;return JSON.stringify(v); }
export const digest = v => createHash('sha256').update(typeof v==='string'?v:canonical(v)).digest('hex');
function atomicJson(path,value) { mkdirSync(resolve(path,'..'),{recursive:true});const temp=`${path}.${randomUUID()}.tmp`;writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx'});renameSync(temp,path); }
export class CommandRunner {
 constructor(root=POLICY.repository){this.root=resolve(root)}
 run(command,args,timeout=300000,cwd=this.root){
  const startedAt=new Date().toISOString(),cmd=process.platform==='win32'&&command.endsWith('.cmd');
  const r=spawnSync(cmd?process.env.ComSpec||'C:\\Windows\\System32\\cmd.exe':command,cmd?['/d','/s','/c',command,...args]:args,{cwd,encoding:'utf8',timeout,windowsHide:true,maxBuffer:8*1024*1024,shell:false});
  const stdout=String(r.stdout||''),stderr=String(r.stderr||'');
  return {command:[command,...args],startedAt,finishedAt:new Date().toISOString(),exitCode:Number.isInteger(r.status)?r.status:-1,signal:r.signal||null,error:r.error?.message||null,stdoutDigest:digest(stdout),stderrDigest:digest(stderr),outputTail:`${stdout}\n${stderr}`.trim().slice(-4000)};
 }
}
export class ProposalWorkflow {
 constructor({root=POLICY.repository,store,runner,now=()=>Date.now()}={}){
  this.root=realpathSync(root);const contract=JSON.parse(readFileSync(join(this.root,'.change-control/project.json'),'utf8'));
  if(contract.projectId!==POLICY.projectId)throw new Error('foreign project ownership');
  this.store=resolve(store||process.env.IC_PROPOSAL_STORE||join(this.root,'.proposal-store'));mkdirSync(this.store,{recursive:true});this.runner=runner||new CommandRunner(this.root);this.now=now;
 }
 gitText(...args){const r=spawnSync('git',args,{cwd:this.root,encoding:'utf8',windowsHide:true,shell:false});if(r.status!==0)throw new Error(`git ${args[0]} failed: ${String(r.stderr||'').slice(-1000)}`);return String(r.stdout||'').trim()}
 snapshot(){
  if(realpathSync(this.gitText('rev-parse','--show-toplevel'))!==this.root)throw new Error('wrong Git checkout root');
  const dirty=this.gitText('status','--porcelain=v1');return {head:this.gitText('rev-parse','HEAD'),tree:this.gitText('rev-parse','HEAD^{tree}'),branch:this.gitText('branch','--show-current'),dirty:Boolean(dirty),dirtyDigest:digest(dirty),originMain:this.gitText('rev-parse','origin/main'),originPages:this.gitText('rev-parse','origin/gh-pages'),remote:this.gitText('remote','get-url','origin')};
 }
 assertChannel(channelId){if(channelId!==POLICY.channelId&&channelId!=='dot-owner')throw new Error('unauthorized project channel')}
 proposalDir(id){if(!ID_RE.test(String(id||'')))throw new Error('invalid proposal ID');return inside(this.store,join(this.store,id))}
 load(id){const path=join(this.proposalDir(id),'current.json');if(!existsSync(path))throw new Error('unknown proposal ID');const p=JSON.parse(readFileSync(path,'utf8'));if(p.projectId!==POLICY.projectId||p.repository!==POLICY.repository)throw new Error('foreign proposal binding');const {manifestDigest,...unsigned}=p;if(manifestDigest!==digest(unsigned))throw new Error('proposal manifest integrity failure');return p}
 save(value,event){const {manifestDigest,...unsigned}=value,next={...unsigned,manifestDigest:digest(unsigned)},dir=this.proposalDir(value.proposalId);atomicJson(join(dir,'revisions',`${String(value.revision).padStart(4,'0')}.json`),next);atomicJson(join(dir,'current.json'),next);atomicJson(join(dir,'events',`${String(value.revision).padStart(4,'0')}-${event}.json`),{event,at:new Date(this.now()).toISOString(),proposalId:value.proposalId,revision:value.revision,state:value.state,manifestDigest:next.manifestDigest});return next}
 change(p,changes,event){return this.save({...p,...changes,revision:p.revision+1,updatedAt:new Date(this.now()).toISOString()},event)}
 withLock(id,action,operation){const lock=join(this.proposalDir(id),'publication.lock');mkdirSync(this.proposalDir(id),{recursive:true});writeFileSync(lock,JSON.stringify({pid:process.pid,operation,at:new Date(this.now()).toISOString()}),{flag:'wx'});try{return action()}finally{rmSync(lock)}}
 recoverLock(id,{channelId,lockDigest,execute=false}={}){
  this.assertChannel(channelId);const dir=this.proposalDir(id),lock=join(dir,'publication.lock'),text=readFileSync(lock,'utf8'),identity=digest(text),record=JSON.parse(text);
  if(!Number.isInteger(record.pid)||record.pid<1)throw new Error('unknown lock process ownership');
  try{process.kill(record.pid,0);throw new Error('lock process is still alive')}catch(error){if(error.code!=='ESRCH')throw error}
  let p=this.load(id),r=this.reconcile(p);if(!r.ok&&!(p.state==='CONSUMED'&&r.problems.every(q=>q==='proposal is CONSUMED')))return {ok:false,reconciliation:r};if(p.artifactDigest)this.checkArtifact(p);
  let resolution='release-abandoned-operation';
  if(p.publication){const refs=this.remoteRefs(),target=p.publication;
   if(refs.ghPages===target.pagesCommit&&(target.kind==='preview'?refs.main===p.baseCommit:refs.main===p.candidateCommit))resolution=p.state==='CONSUMED'?'cleanup-completed-publication-lock':'reconcile-successful-publication';
   else if(refs.main===target.expectedRefs.main&&refs.ghPages===target.expectedRefs.ghPages)resolution='pending-publication-retain-lock';
   else throw new Error('remote refs ambiguous; retain stale lock and inspect');
  }
  if(!execute)return {ok:true,mode:'PLAN_ONLY',lockDigest:identity,record,resolution,externalMutations:false};
  if(resolution==='pending-publication-retain-lock')throw new Error('publication child may still be running; retain lock and recorded target for operator inspection');
  if(lockDigest!==identity)throw new Error('stale lock digest mismatch');
  const recovery=join(dir,'recovery.lock');writeFileSync(recovery,JSON.stringify({pid:process.pid}),{flag:'wx'});
  try{
   if(readFileSync(lock,'utf8')!==text||this.load(id).manifestDigest!==p.manifestDigest)throw new Error('lock or proposal changed during recovery');
   if(resolution==='reconcile-successful-publication')p=this.finishPublication(p,p.publication.kind).proposal;
   else p=this.change(p,{publication:null,lockRecovery:{lockDigest:identity,record,resolution}},'abandoned-operation-recovered');
   rmSync(lock);return {ok:true,resolution,proposal:p,externalMutations:false};
  }finally{rmSync(recovery)}
 }
 list(){return readdirSync(this.store,{withFileTypes:true}).filter(e=>e.isDirectory()&&ID_RE.test(e.name)).map(e=>this.load(e.name))}
 status(){const s=this.snapshot();return {ok:true,projectId:POLICY.projectId,head:s.head,clean:!s.dirty,approvalPolicy:POLICY.approvalPolicy,proposals:this.list().map(p=>({proposalId:p.proposalId,state:p.state})),nextBoundary:'OWNER_REVIEW',automaticPromotion:false}}
 show(id){return this.load(id)}
 create({channelId,title='Infinite Corridor candidate',requirements=[]}={}){
  this.assertChannel(channelId);const s=this.snapshot();if(s.remote.toLowerCase()!==POLICY.remote.toLowerCase())throw new Error('wrong Git remote');if(!s.branch||(s.branch!=='main'&&!s.branch.startsWith('candidate/')))throw new Error('use main or candidate/* branch');if(s.dirty)throw new Error('proposal creation requires a clean committed candidate');
  const nonce=randomUUID().replaceAll('-',''),proposalId=`icp_${nonce.slice(0,24)}_${digest(nonce).slice(0,16)}`,createdAt=new Date(this.now()).toISOString();
  return this.save({schema:POLICY.schema,policyVersion:2,projectId:POLICY.projectId,repository:POLICY.repository,checkout:this.root,proposalId,revision:1,title:String(title).slice(0,200),state:'DRAFT',createdAt,updatedAt:createdAt,expiresAt:new Date(this.now()+POLICY.maxAgeMs).toISOString(),candidateCommit:s.head,candidateTree:s.tree,baseCommit:s.originMain,pagesBefore:s.originPages,branch:s.branch,changedFiles:this.gitText('diff','--name-only',`${s.originMain}..${s.head}`).split(/\r?\n/).filter(Boolean).sort(),dependencySnapshotDigest:digest(readFileSync(join(this.root,'package.json'),'utf8')),requirements,rollback:{main:s.originMain,ghPages:s.originPages},evidence:[],evidenceBundleDigest:null,artifactDigest:null,approvalPolicy:POLICY.approvalPolicy,decision:null,publication:null,previewPublication:null,consumedAt:null,previewUrl:`${POLICY.productionUrl}previews/${proposalId}/`,productionUrl:POLICY.productionUrl},'created');
 }
 reconcile(p){const s=this.snapshot(),problems=[];if(p.policyVersion!==2)problems.push('legacy proposal requires fresh validation; old approvals are never imported');if(s.remote.toLowerCase()!==POLICY.remote.toLowerCase())problems.push('wrong remote');if(s.head!==p.candidateCommit||s.tree!==p.candidateTree)problems.push('candidate drift');if(s.dirty)problems.push('working tree is dirty');if(!Number.isFinite(Date.parse(p.expiresAt))||this.now()>Date.parse(p.expiresAt))problems.push('proposal expired');if(['REJECTED','SUPERSEDED','FAILED','CONSUMED'].includes(p.state))problems.push(`proposal is ${p.state}`);if(p.dependencySnapshotDigest!==digest(readFileSync(join(this.root,'package.json'),'utf8')))problems.push('dependency drift');return {ok:!problems.length,problems,snapshot:s}}
 artifactDir(p){return join(this.proposalDir(p.proposalId),'artifact')}
 checkArtifact(p){if(!p.artifactDigest)throw new Error('candidate has no tested artifact');return verifyArtifact(this.artifactDir(p),p.artifactDigest)}
 reviewDigest(p){return digest({projectId:p.projectId,proposalId:p.proposalId,candidateCommit:p.candidateCommit,candidateTree:p.candidateTree,artifactDigest:p.artifactDigest,evidenceBundleDigest:p.evidenceBundleDigest,dependencySnapshotDigest:p.dependencySnapshotDigest,baseCommit:p.baseCommit,pagesBefore:p.pagesBefore,previewPublication:p.previewPublication,rollback:p.rollback,destination:POLICY.remote,productionUrl:POLICY.productionUrl,previewUrl:p.previewUrl,expiry:p.expiresAt,policy:POLICY.approvalPolicy})}
 validate(id,options={}){return this.withLock(id,()=>this.validateLocked(id,options),'validate')}
 validateLocked(id,options={}){
  if(options.execute===false)throw new Error('synthetic validation is not allowed');let p=this.load(id),r=this.reconcile(p);if(!r.ok)return {ok:false,reconciliation:r};
  if(['OWNER_REVIEW','APPROVED'].includes(p.state)){this.checkArtifact(p);return {ok:true,idempotent:true,proposal:p}}if(p.state!=='DRAFT')throw new Error(`cannot validate ${p.state}`);
  const results=[this.runner.run('npm.cmd',['test'],600000),this.runner.run('npm.cmd',['run','build'],300000)];r=this.reconcile(p);
  if(!r.ok||!results.every(q=>q.exitCode===0&&!q.fixture&&!q.synthetic&&q.startedAt&&q.finishedAt))return {ok:false,proposal:this.change(p,{state:'FAILED',evidence:results,blockers:[...r.problems,'real test/build validation failed']},'validation-failed')};
  const artifact=freezeArtifact(join(this.root,'dist'),this.artifactDir(p),{proposalId:id,candidateCommit:p.candidateCommit,candidateTree:p.candidateTree});
  const evidenceBundleDigest=digest({candidateCommit:p.candidateCommit,candidateTree:p.candidateTree,artifactDigest:artifact.digest,results,node:process.version});
  p=this.change(p,{state:'OWNER_REVIEW',evidence:results,evidenceBundleDigest,artifactDigest:artifact.digest,files:artifact.files,toolVersions:{node:process.version}},'validated-owner-review');
  return {ok:true,proposal:p,reviewDigest:this.reviewDigest(p),localPreview:artifact.preview};
 }
 preview(id){const p=this.load(id),r=this.reconcile(p);if(p.artifactDigest)this.checkArtifact(p);return {ok:r.ok&&Boolean(p.artifactDigest),proposalId:id,state:p.state,reviewDigest:p.artifactDigest?this.reviewDigest(p):null,localPreview:join(this.artifactDir(p),'preview-site'),previewUrl:p.previewUrl,artifactDigest:p.artifactDigest,candidateCommit:p.candidateCommit,candidateTree:p.candidateTree,files:p.files,evidence:p.evidence,rollback:p.rollback,blockers:r.problems,mutationsPerformed:false}}
 // Trusted operator only, after a real owner message. This audit text is not
 // authentication and must never be inferred or generated by a coding model.
 decide(id,options={}){return this.withLock(id,()=>this.decideLocked(id,options),'owner-decision')}
 decideLocked(id,{channelId,ownerDecision,reviewDigest,previewTested=false}={}){
  this.assertChannel(channelId);const p=this.load(id),r=this.reconcile(p);if(!r.ok)return {ok:false,reconciliation:r};this.checkArtifact(p);if(reviewDigest!==this.reviewDigest(p))throw new Error('owner decision review digest mismatch');
  const approve=ownerDecision===`approve ${id} ${reviewDigest}`,reject=ownerDecision===`reject ${id} ${reviewDigest}`;if(!approve&&!reject)throw new Error('explicit exact owner approve/reject text required');if(p.state!=='OWNER_REVIEW')throw new Error('candidate is not awaiting owner review');if(approve&&(!previewTested||!p.previewPublication))throw new Error('published preview and owner testing confirmation required');
  return {ok:true,proposal:this.change(p,{state:approve?'APPROVED':'REJECTED',decision:{text:ownerDecision,reviewDigest,channelId,previewTested,recordedAt:new Date(this.now()).toISOString()}},approve?'owner-approved':'owner-rejected')};
 }
 remoteRefs(){const refs={};for(const line of this.gitText('ls-remote',POLICY.remote,'refs/heads/main','refs/heads/gh-pages').split(/\r?\n/)){const [hash,ref]=line.split(/\s+/);if(ref)refs[ref]=hash}if(!refs['refs/heads/main']||!refs['refs/heads/gh-pages'])throw new Error('remote branch identity unavailable');return {main:refs['refs/heads/main'],ghPages:refs['refs/heads/gh-pages']}}
 push(id,{channelId}={}){this.assertChannel(channelId);if(!id)return {ok:false,message:'Bare push never deploys. Review an exact candidate first.',externalMutations:false};const p=this.load(id),r=this.reconcile(p);if(!r.ok)return {ok:false,reconciliation:r,message:'proposal reconciliation failed'};this.checkArtifact(p);const ready=p.state==='APPROVED'&&p.decision?.reviewDigest===this.reviewDigest(p);return {ok:ready,mode:'PLAN_ONLY',proposalId:id,state:p.state,artifactDigest:p.artifactDigest,source:join(this.artifactDir(p),'release'),expectedRefs:{main:p.baseCommit,ghPages:p.previewPublication?.pagesCommit||p.pagesBefore},rollback:p.rollback,message:ready?'Exact approved artifact can be promoted with an explicit execute command.':'Explicit owner approval of the tested preview required.',externalMutations:false}}
 runGit(cwd,...args){const r=this.runner.run('git',args,120000,cwd);if(r.exitCode!==0)throw new Error(`publication Git command failed: ${r.outputTail}`);return r}
 publicationHead(work){const target=spawnSync('git',['rev-parse','HEAD'],{cwd:work,encoding:'utf8',windowsHide:true});if(target.status!==0)throw new Error('publication commit missing');return target.stdout.trim()}
 gitInventory(work,commit){
  const listing=spawnSync('git',['ls-tree','-r','-z',commit],{cwd:work,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(listing.status!==0)throw new Error('committed tree inventory failed');
  const files=Object.create(null);
  for(const record of listing.stdout.split('\0').filter(Boolean)){const tab=record.indexOf('\t'),[mode,type,hash]=record.slice(0,tab).split(' '),path=record.slice(tab+1);if(type!=='blob'||!['100644','100755'].includes(mode))throw new Error('deployment tree contains links or submodules');
   const blob=spawnSync('git',['cat-file','blob',hash],{cwd:work,windowsHide:true,maxBuffer:64*1024*1024});if(blob.status!==0)throw new Error('committed blob read failed');files[path]={bytes:blob.stdout.length,sha256:sha256(blob.stdout)};
  }return files;
 }
 verifyPublication(work,commit,p,kind){
  const files=this.gitInventory(work,commit);
  if(kind==='production'){for(const file of Object.keys(files))if(file.startsWith('previews/'))delete files[file];if(inventoryDigest(files)!==inventoryDigest(p.files.release))throw new Error('committed release bytes differ from tested artifact')}
  else{const prefix=`previews/${p.proposalId}/`,preview=Object.create(null),rest=Object.create(null);for(const [path,value] of Object.entries(files)){if(path.startsWith(prefix))preview[path.slice(prefix.length)]=value;else rest[path]=value}if(inventoryDigest(preview)!==inventoryDigest(p.files.preview))throw new Error('committed preview bytes differ from tested artifact');if(inventoryDigest(rest)!==inventoryDigest(this.gitInventory(work,p.pagesBefore)))throw new Error('preview publication changed production or another preview')}
 }
 publishPreview(id,options={}){return this.publish(id,'preview',options)}
 promote(id,options={}){return this.publish(id,'production',options)}
 publish(id,kind,options={}){if(!options.execute)return this.publishLocked(id,kind,options);return this.withLock(id,()=>this.publishLocked(id,kind,options),`publish-${kind}`)}
 publishLocked(id,kind,{channelId,execute=false}={}){
  this.assertChannel(channelId);let p=this.load(id),r=this.reconcile(p);if(!r.ok)return {ok:false,reconciliation:r};this.checkArtifact(p);if(kind==='preview'&&p.state!=='OWNER_REVIEW')throw new Error('preview requires validated owner-review state');if(kind==='production'&&!this.push(id,{channelId}).ok)throw new Error('exact owner approval required');
  const expected={main:p.baseCommit,ghPages:p.previewPublication?.pagesCommit||p.pagesBefore};if(!execute)return {ok:true,mode:'PLAN_ONLY',kind,expectedRefs:expected,artifactDigest:p.artifactDigest,externalMutations:false};
  const dir=this.proposalDir(id);
   const remote=this.remoteRefs();
   if(p.publication?.kind===kind&&remote.ghPages===p.publication.pagesCommit&&(kind==='preview'||remote.main===p.candidateCommit))return this.finishPublication(p,kind);
   if(remote.main!==expected.main||remote.ghPages!==expected.ghPages)throw new Error('remote refs changed; new review required');
   if(p.publication)throw new Error('interrupted publication must be reconciled against its recorded targets');
   const work=inside(dir,join(dir,`publication-${kind}-${randomUUID()}`));this.runGit(dir,'clone','--no-checkout',POLICY.remote,work);
   this.runGit(work,'config','core.autocrlf','false');mkdirSync(join(work,'.git','info'),{recursive:true});writeFileSync(join(work,'.git','info','attributes'),'* -text -filter -ident\n');
   this.runGit(work,'checkout','--detach',expected.ghPages);
   inventory(work,{ignoreGit:true});
   const source=join(this.artifactDir(p),kind==='preview'?'preview-site':'release');
   if(kind==='preview'){const dest=inside(work,join(work,'previews',id));if(existsSync(dest))throw new Error('candidate preview route already exists');cpSync(source,dest,{recursive:true});if(inventoryDigest(inventory(dest))!==inventoryDigest(p.files.preview))throw new Error('preview copy mismatch')}
   else{
    for(const entry of readdirSync(work))if(entry!=='.git'&&entry!=='previews')rmSync(inside(work,join(work,entry)),{recursive:true,force:false});
    for(const entry of readdirSync(source))cpSync(join(source,entry),inside(work,join(work,entry)),{recursive:true});
    const staged=inventory(work,{ignoreGit:true});for(const file of Object.keys(staged))if(file.startsWith('previews/'))delete staged[file];
    if(inventoryDigest(staged)!==inventoryDigest(p.files.release))throw new Error('release copy mismatch');
   }
   this.checkArtifact(p);this.runGit(work,'add','--all');this.runGit(work,'-c','user.name=Infinite Corridor release','-c','user.email=BrightLineAI-Bot@users.noreply.github.com','commit','-m',`${kind==='preview'?'Preview':'Promote'} ${id}`);
   const pagesCommit=this.publicationHead(work);
   this.verifyPublication(work,pagesCommit,p,kind);
   if(kind==='production'){this.runGit(work,'fetch',this.root,p.candidateCommit);this.runGit(work,'merge-base','--is-ancestor',p.baseCommit,p.candidateCommit)}
   if(!this.reconcile(p).ok||this.load(id).manifestDigest!==p.manifestDigest)throw new Error('source or proposal changed during publication');this.checkArtifact(p);
   p=this.change(p,{publication:{kind,pagesCommit,expectedRefs:expected,artifactDigest:p.artifactDigest,work}},'publication-prepared');
   const refs=[`${pagesCommit}:refs/heads/gh-pages`],leases=[`--force-with-lease=refs/heads/gh-pages:${expected.ghPages}`];if(kind==='production'){refs.push(`${p.candidateCommit}:refs/heads/main`);leases.push(`--force-with-lease=refs/heads/main:${expected.main}`)}
   this.runGit(work,'push','--atomic',...leases,POLICY.remote,...refs);const after=this.remoteRefs();if(after.ghPages!==pagesCommit||(kind==='production'&&after.main!==p.candidateCommit))throw new Error('remote verification failed; inspect recorded targets before retry');return this.finishPublication(p,kind);
 }
 finishPublication(p,kind){if(kind==='preview')return {ok:true,proposal:this.change(p,{previewPublication:{pagesCommit:p.publication.pagesCommit,artifactDigest:p.artifactDigest,url:p.previewUrl},publication:null},'preview-published')};return {ok:true,proposal:this.change(p,{state:'CONSUMED',consumedAt:new Date(this.now()).toISOString(),deployedRefs:{main:p.candidateCommit,ghPages:p.publication.pagesCommit}},'production-promoted')}}
 supersede(id,options={}){return this.withLock(id,()=>this.supersedeLocked(id,options),'supersede')}
 supersedeLocked(id,{channelId}={}){this.assertChannel(channelId);const p=this.load(id);if(p.state==='SUPERSEDED')return {ok:true,idempotent:true,proposal:p};if(p.state==='CONSUMED'||p.publication)throw new Error('published or interrupted candidate cannot be superseded');return {ok:true,proposal:this.change(p,{state:'SUPERSEDED'},'superseded')}}
}
