import test from 'node:test';
import assert from 'node:assert/strict';
import { ProposalWorkflow, POLICY } from '../src/owner-release-workflow.mjs';

// Stop at clone creation: no network, artifact mutation, or publication is performed.
test('owner-release publisher requests clone-local long paths before any checkout',()=>{
 const id=`icp_${'a'.repeat(24)}_${'b'.repeat(16)}`;
 const p={state:'OWNER_REVIEW',baseCommit:'c'.repeat(40),pagesBefore:'d'.repeat(40),artifactDigest:'sealed',publication:null,previewPublication:null};
 const calls:{cwd:string,args:string[]}[]=[];
 const stop=new Error('captured isolated clone');
 const workflow=Object.create(ProposalWorkflow.prototype);
 workflow.load=()=>p;
 workflow.reconcile=()=>({ok:true});
 workflow.checkArtifact=()=>({digest:p.artifactDigest});
 workflow.proposalDir=()=>'/private/candidate';
 workflow.remoteRefs=()=>({main:p.baseCommit,ghPages:p.pagesBefore});
 workflow.runGit=(cwd:string,...args:string[])=>{calls.push({cwd,args});throw stop};
 assert.throws(()=>workflow.publishLocked(id,'preview',{channelId:POLICY.channelId,execute:true}),error=>error===stop);
 assert.equal(calls.length,1);
 assert.deepEqual(calls[0].args.slice(0,-1),['clone','--no-checkout','--config','core.longpaths=true',POLICY.remote]);
 assert.match(calls[0].args.at(-1)!,/^\/private\/candidate\/publication-preview-/);
 assert.equal(calls[0].args.includes('--global'),false);
 assert.equal(p.state,'OWNER_REVIEW');assert.equal(p.publication,null);
});

test('owner-release plan keeps sealed artifact and expected release refs without Git mutation',()=>{
 const workflow=Object.create(ProposalWorkflow.prototype);
 const p={state:'OWNER_REVIEW',baseCommit:'c'.repeat(40),pagesBefore:'d'.repeat(40),artifactDigest:'sealed',previewPublication:null};
 workflow.load=()=>p;workflow.reconcile=()=>({ok:true});workflow.checkArtifact=()=>({digest:'sealed'});
 workflow.runGit=()=>assert.fail('plan must not execute Git');
 const result=workflow.publishLocked('unused-plan-id','preview',{channelId:POLICY.channelId});
 assert.equal(result.mode,'PLAN_ONLY');assert.equal(result.externalMutations,false);
 assert.equal(result.artifactDigest,p.artifactDigest);
 assert.deepEqual(result.expectedRefs,{main:p.baseCommit,ghPages:p.pagesBefore});
});
