import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero,loadCloseViewHero,getCloseViewHeroAsset,HERO_PROPORTIONS} from '../src/close-view-hero.ts';
import {writeCloseViewHeroGear,writeCloseViewModel,modelTriangleCount,MODEL_FLOATS,MODEL_MAX_VERTICES} from '../src/close-view-models.ts';
import {knockdownPose} from '../src/lightning-giant-render.ts';
import {acceptCleaverChoreography,cleaverCarryFrame,sampleCleaverChoreography} from '../src/action-motion.ts';
const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8'));
const file=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const bytes=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),asset=decodeCloseViewHero(meta,bytes);
const input=(extra={})=>({nowMs:100000,reducedMotion:false,x:3,y:4,groundZ:.3,liftZ:0,yaw:0,height:1.3776,speed:0,gaitPhase:0,action:null,alpha:1,tint:[1,1,1],hitFlash:0,...extra});
function sample(i=input()){const s=createHeroPoseState(asset),f=createHeroFrame(asset);assert.equal(sampleCloseViewHero(asset,s,i,f),true);return{s,f};}
test('the left-hand Cleaver crosses four distinct blade paths and returns to carry',()=>{
  const held={heldProfile:'verge-cleaver',handProfile:'verge-cleaver',x:0,y:0,groundZ:0,height:1.38};
  const joints=(frame,nowMs)=>{
    const {f,s}=sample(input({...held,nowMs,cleaverFrame:frame}));
    assert.equal(s.clip,'derived-choreographed-cleaver');
    assert.ok(s.primaryGripResidual<.05);
    const hand=[...f.rightSocket.slice(12,15)],tip=hand.map((v,i)=>v+f.rightSocket[i]*.6);
    return {hand,tip};
  };
  const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
  let prior=null, previousFinish=null;
  for(let step=1;step<=4;step++){
    const at=1000+(step-1)*420;
    const record={weaponKind:'verge-cleaver',primaryMotion:{v:2,step},meleeAction:{v:1,kind:'verge-cleaver',move:'cleaver',contactMs:75,durationMs:360},cleaverChoreography:{...acceptCleaverChoreography(prior,at),contactLogicalMs:at+75}};
    const atMs=ms=>joints(sampleCleaverChoreography(record,at+ms),at+ms);
    const start=atMs(0),contact=atMs(75),finish=atMs(180);
    if(previousFinish)assert.ok(distance(start.hand,previousFinish.hand)<.02);
    const side=finish.hand[1]-start.hand[1],height=finish.hand[2]-start.hand[2];
    assert.ok((step%2===1?side:-side)>.25);
    if(step===1)assert.ok(height>.25&&finish.tip[2]-start.tip[2]>.30);
    else if(step===3)assert.ok(height<-.20&&finish.tip[2]-start.tip[2]<-.20);
    else assert.ok(Math.abs(height)<.05&&Math.abs(finish.tip[2]-start.tip[2])<.05);
    assert.ok(contact.tip[0]>Math.max(start.tip[0],finish.tip[0])+.05);
    previousFinish=atMs(420);
    prior=record;
    if(step===4)assert.deepEqual(previousFinish,joints(cleaverCarryFrame(),at+420));
  }
});
test('cache pickup reaches with the free hand and blends back into the same gait', () => {
  const base={nowMs:135,speed:1.2,gaitPhase:.9,heldProfile:'verge-cleaver',handProfile:'verge-cleaver'};
  const reach=(phase,reducedMotion=false,overrides={})=>sample(input({...base,reducedMotion,...overrides,action:{kind:'interact',profile:'cache-pickup',phase,durationMs:400}}));
  const normal=sample(input(base)).f, reduced=sample(input({...base,reducedMotion:true})).f;
  const socketTravel=(a,b)=>Math.hypot(...[12,13,14].map(i=>a[i]-b[i]));
  const maxDelta=(a,b)=>a.reduce((max,v,i)=>Math.max(max,Math.abs(v-b[i])),0);
  for(const phase of [0,1])assert.ok(maxDelta(reach(phase).f.positionsNormals,normal.positionsNormals)<1e-6);
  const middle=reach(.48);
  assert.equal(middle.s.clip,'derived-cache-pickup');
  const handTravel=socketTravel(middle.f.leftSocket,normal.leftSocket);
  assert.ok(handTravel>.12,`free hand travel: ${handTravel}, from ${normal.leftSocket.slice(12,15)} to ${middle.f.leftSocket.slice(12,15)}`);
  assert.ok(maxDelta(middle.f.rightSocket,normal.rightSocket)<1e-6,'the anatomical left keeps the Cleaver');
  assert.ok(socketTravel(reach(.48,true).f.leftSocket,reduced.leftSocket)<socketTravel(middle.f.leftSocket,normal.leftSocket));
  const pike={heldProfile:'cinder-pike',handProfile:'cinder-pike'};
  const pikeCarry=sample(input({...base,...pike})).f,pikeCue=reach(.48,false,pike).f;
  assert.ok(maxDelta(pikeCarry.positionsNormals,pikeCue.positionsNormals)>.01);
  for(const hand of ['leftSocket','rightSocket'])assert.ok(maxDelta(pikeCue[hand],pikeCarry[hand])<1e-6,'both Pike grips stay planted');
});
test('chest opening reaches and lifts the free hand while the Cleaver stays in its grip',()=>{
  const base={nowMs:135,heldProfile:'verge-cleaver',handProfile:'verge-cleaver'};
  const sampleChest=phase=>sample(input({...base,action:{kind:'interact',profile:'chest-open',phase,durationMs:510}}));
  const reach=sampleChest(.32),lift=sampleChest(.57),rest=sample(input(base)).f;
  assert.equal(lift.s.clip,'derived-chest-open');
  assert.ok(lift.f.leftSocket[14]>reach.f.leftSocket[14]+.06);
  assert.deepEqual(lift.f.rightSocket,rest.rightSocket);
  assert.deepEqual(sampleChest(0).f.leftSocket,rest.leftSocket);
  assert.deepEqual(sampleChest(1).f.leftSocket,rest.leftSocket);
});
test('native cache reach stays within existing geometry and returns to idle',()=>{
  const render=(pose,amount)=>{
    const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS);
    const end=writeCloseViewModel(out,0,{kind:'playerVergeCleaver',x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose,amount,scale:1,alpha:1,reduceMotion:false});
    assert.equal(end,modelTriangleCount('playerVergeCleaver')*3*MODEL_FLOATS);
    return out.slice(0,end);
  };
  const idle=render('idle',0),middle=render('collect',.48);
  assert.deepEqual(render('collect',0),idle);
  assert.deepEqual(render('collect',1),idle);
  assert.ok(middle.every(Number.isFinite));
  assert.ok(middle.some((v,i)=>i%MODEL_FLOATS<3&&Math.abs(v-idle[i])>.1));
});
test('ordinary hurt has neutral endpoints and a smaller reduced-motion recoil', () => {
  const neutral = sample(input({nowMs:0})).f;
  const hurt = (phase, reducedMotion = false) => sample(input({
    nowMs:0, reducedMotion, action:{kind:'hit', profile:'hurt', phase, durationMs:240},
  }));
  for (const endpoint of [0,1]) {
    let delta = 0;
    hurt(endpoint).f.positionsNormals.forEach((value, i) => { delta = Math.max(delta, Math.abs(value-neutral.positionsNormals[i])); });
    assert.ok(delta < 1e-6, `endpoint ${endpoint} position/normal drift ${delta}`);
  }
  const full = hurt(.35), reduced = hurt(.35, true);
  const shift = frame => Math.hypot(...[12,13,14].map(i => frame.rightSocket[i]-neutral.rightSocket[i]));
  assert.equal(full.s.clip, 'RecieveHit');
  assert.ok(shift(full.f) > .02);
  assert.ok(shift(reduced.f) > 0 && shift(reduced.f) < shift(full.f));
});
test('hero imports do not fetch, and pure decoding validates bounded arrays',async()=>{
  let calls=0;const old=globalThis.fetch;globalThis.fetch=()=>{calls++;throw new Error('unexpected fetch');};try{assert.equal(getCloseViewHeroAsset(),null);assert.equal(await loadCloseViewHero(),null);assert.equal(calls,0);}finally{globalThis.fetch=old;}
  assert.equal(asset.indexCount/3,3170);assert.throws(()=>decodeCloseViewHero({...meta,indexCount:100000},bytes));assert.throws(()=>decodeCloseViewHero(meta,bytes.slice(0,40)));
});
test('hybrid reference has finite normalized normals, exact height and a seated unscaled collar',()=>{
  const {s,f}=sample(input({nowMs:0,reducedMotion:true,groundZ:0}));let min=Infinity,max=-Infinity;
  for(let i=0;i<f.positionsNormals.length;i+=6){for(let k=0;k<6;k++)assert.ok(Number.isFinite(f.positionsNormals[i+k]));min=Math.min(min,f.positionsNormals[i+2]);max=Math.max(max,f.positionsNormals[i+2]);assert.ok(Math.abs(Math.hypot(...f.positionsNormals.slice(i+3,i+6))-1)<1e-5);}
  assert.ok(Math.abs(min)<1e-6);assert.ok(Math.abs(max-1.3776)<1e-5);assert.ok(s.seatY<0&&s.seatY>-.3);assert.equal(s.headScale,.4);
  let collar=Infinity,head=Infinity;for(const v of meta.headAttachment.collarVertexIndices)collar=Math.min(collar,s.vertices[v*6+1]);for(const m of meta.meshes)if(m.node===41)for(let v=m.firstVertex;v<m.firstVertex+m.vertexCount;v++)head=Math.min(head,s.vertices[v*6+1]);assert.ok(Math.abs(head-(collar-.01))<1e-5);
  assert.ok(Math.abs(s.pose[3*10+7]-asset.rest[3*10+7])<1e-5,'Rogue Head and collar were not scaled');
});
test('sampled source feet keep their independent root hierarchy and animated translation',()=>{
  assert.equal(meta.nodes[1].parent,38);assert.equal(meta.nodes[36].parent,38);
  const a=sample(input({speed:4,gaitPhase:0})),b=sample(input({speed:4,gaitPhase:Math.PI}));assert.notDeepEqual(a.s.pose.slice(10,13),b.s.pose.slice(10,13));assert.equal(a.s.clip,'Run');
});
test('fist charge release shares its exact gait-aware entry and recovers to locomotion',()=>{
  assert.ok(createHeroPoseState(asset).fistMirrorRestError<1e-6,'bind-relative reflection maps immutable rest rotations onto homologous rest rotations');
  for(const lead of ['left','right'])for(const step of [1,2])for(const [speed,gaitPhase] of [[0,0],[.7,1.3],[2.4,4.1]]){const base=input({nowMs:4321,speed,gaitPhase}),held=sample({...base,action:{kind:'melee',profile:'fistCharge',phase:1,durationMs:240,poseMs:4321,fistStep:step,fistLead:lead}}),entry=sample({...base,action:{kind:'melee',profile:'fist',phase:0,durationMs:240,poseMs:4321,fistStep:step,fistLead:lead,fistCharge:1}}),end=sample({...base,nowMs:4561,action:{kind:'melee',profile:'fist',phase:1,durationMs:240,poseMs:4321,fistStep:step,fistLead:lead,fistCharge:1}}),idle=sample({...base,nowMs:4561});let delta=0;for(let i=0;i<entry.f.positionsNormals.length;i+=6)delta=Math.max(delta,Math.hypot(entry.f.positionsNormals[i]-held.f.positionsNormals[i],entry.f.positionsNormals[i+1]-held.f.positionsNormals[i+1],entry.f.positionsNormals[i+2]-held.f.positionsNormals[i+2]));assert.ok(delta<1e-6,`charge release local position ${delta}`);for(const key of ['leftSocket','rightSocket'])for(let i=0;i<16;i++)assert.ok(Math.abs(entry.f[key][i]-held.f[key][i])<1e-6);assert.deepEqual(end.f.positionsNormals,idle.f.positionsNormals);}
});
test('fist stages use the cycle lead, opposite jab, then cycle lead again',()=>{const base=sample(input({nowMs:5000})).f,move=(f,key)=>Math.hypot(f[key][12]-base[key][12],f[key][13]-base[key][13],f[key][14]-base[key][14]);for(const lead of ['right','left']){const opening=sample(input({nowMs:5120,action:{kind:'melee',profile:'fist',phase:.5,durationMs:240,poseMs:5000,fistStep:1,fistLead:lead}})).f,jab=sample(input({nowMs:5120,action:{kind:'melee',profile:'fist',phase:.5,durationMs:240,poseMs:5000,fistStep:2,fistLead:lead}})).f,upper=sample(input({nowMs:5120,action:{kind:'melee',profile:'fist',phase:.5,durationMs:240,poseMs:5000,fistStep:3,fistLead:lead}})).f,leadKey=lead+'Socket',otherKey=(lead==='right'?'left':'right')+'Socket';assert.ok(move(opening,leadKey)>move(opening,otherKey)+.01,`${lead} opener extends its lead hand`);assert.ok(move(jab,otherKey)>move(jab,leadKey)+.01,`${lead} cycle jab extends the opposite hand`);assert.ok(move(upper,leadKey)>move(upper,otherKey)+.01,`${lead} uppercut returns to its cycle lead`);}}
);
test('derived primary stages preserve grips, source geometry and exact carry endpoints',()=>{
  const original=Float32Array.from(asset.arrays.positions),s=createHeroPoseState(asset),f=createHeroFrame(asset),idle=createHeroFrame(asset);let worst=0;
  for(const profile of ['cinder-pike','verge-cleaver'])for(const primaryStep of [1,2,3])for(const reducedMotion of [false,true])for(const speed of [0,.6,2.4,4])for(const gaitPhase of [0,1.2,3,5])for(let step=0;step<=21;step++){
    const phase=step/21,i=input({nowMs:1234+phase*240,yaw:.7,speed,gaitPhase,reducedMotion,heldProfile:profile,primaryCarryStage:profile==='verge-cleaver'?{kind:'legacy',step:primaryStep}:null,action:{kind:'melee',profile,primaryStep,phase,durationMs:240,poseMs:1234,yaw:.7}});
    assert.ok(sampleCloseViewHero(asset,s,i,f));assert.ok(f.positionsNormals.every(Number.isFinite));worst=Math.max(worst,s.primaryGripResidual*i.height/s.referenceHeight);
    if(step===10&&gaitPhase===0)for(let k=3;k<f.positionsNormals.length;k+=6)assert.ok(Math.abs(Math.hypot(f.positionsNormals[k],f.positionsNormals[k+1],f.positionsNormals[k+2])-1)<1e-5);
    if(step===0||step===21){sampleCloseViewHero(asset,s,{...i,action:null},idle);assert.deepEqual(f.positionsNormals,idle.positionsNormals);assert.deepEqual(f.leftSocket,idle.leftSocket);assert.deepEqual(f.rightSocket,idle.rightSocket);}
    if(profile==='cinder-pike'){const dx=f.leftSocket[12]-f.rightSocket[12],dy=f.leftSocket[13]-f.rightSocket[13],dz=f.leftSocket[14]-f.rightSocket[14],l=Math.hypot(dx,dy,dz),ax=f.rightSocket[0],ay=f.rightSocket[1],az=f.rightSocket[2],al=Math.hypot(ax,ay,az);assert.ok(l>.05);assert.ok(Math.hypot(dy/l*az/al-dz/l*ay/al,dz/l*ax/al-dx/l*az/al,dx/l*ay/al-dy/l*ax/al)<.03,'two Pike grips share the weapon frame');}
  }
  assert.ok(worst<.01,`world grip residual ${worst}`);assert.deepEqual(asset.arrays.positions,original);
});
test('held primaries retain reduced-motion cast free-hand release and exact dodge endpoints',()=>{
  for(const heldProfile of ['cinder-pike','verge-cleaver']){const s=createHeroPoseState(asset),idleFrame=createHeroFrame(asset),endIdle=createHeroFrame(asset),castFrame=createHeroFrame(asset),dodge0=createHeroFrame(asset),dodge1=createHeroFrame(asset),base=input({nowMs:1200,reducedMotion:true,heldProfile,primaryCarryStage:heldProfile==='verge-cleaver'?{kind:'legacy',step:1}:null});assert.ok(sampleCloseViewHero(asset,s,base,idleFrame));assert.ok(sampleCloseViewHero(asset,s,{...base,nowMs:1460},endIdle));assert.ok(sampleCloseViewHero(asset,s,{...base,action:{kind:'cast',profile:'focus-forward',phase:.5,durationMs:360,yaw:0}},castFrame));assert.equal(s.clip,'derived-cast');assert.ok(Math.hypot(castFrame.leftSocket[12]-idleFrame.leftSocket[12],castFrame.leftSocket[13]-idleFrame.leftSocket[13],castFrame.leftSocket[14]-idleFrame.leftSocket[14])>.1,`${heldProfile} cast releases the free hand`);assert.ok(Math.hypot(castFrame.rightSocket[12]-idleFrame.rightSocket[12],castFrame.rightSocket[13]-idleFrame.rightSocket[13],castFrame.rightSocket[14]-idleFrame.rightSocket[14])<1e-5,`${heldProfile} cast preserves the weapon hand`);for(const [phase,frame] of [[0,dodge0],[1,dodge1]])assert.ok(sampleCloseViewHero(asset,s,{...base,action:{kind:'dodge',profile:heldProfile,phase,durationMs:260,poseMs:1200,yaw:0,moveX:1,moveY:0}},frame));assert.deepEqual(dodge0.positionsNormals,idleFrame.positionsNormals);assert.deepEqual(dodge1.positionsNormals,endIdle.positionsNormals);assert.deepEqual(dodge0.rightSocket,idleFrame.rightSocket);assert.deepEqual(dodge1.rightSocket,endIdle.rightSocket);}
});
test('held primaries keep the original full-motion jump brace witness',()=>{
  for(const heldProfile of ['cinder-pike','verge-cleaver']){const s=createHeroPoseState(asset),idleFrame=createHeroFrame(asset),jumpFrame=createHeroFrame(asset),base=input({nowMs:1200,reducedMotion:false,heldProfile,primaryCarryStage:heldProfile==='verge-cleaver'?{kind:'legacy',step:1}:null});assert.ok(sampleCloseViewHero(asset,s,base,idleFrame));assert.ok(sampleCloseViewHero(asset,s,{...base,action:{kind:'jump',profile:heldProfile,phase:.5,durationMs:420,yaw:0}},jumpFrame));assert.equal(s.clip,'derived-jump');assert.ok(Math.hypot(jumpFrame.rightSocket[12]-idleFrame.rightSocket[12],jumpFrame.rightSocket[13]-idleFrame.rightSocket[13],jumpFrame.rightSocket[14]-idleFrame.rightSocket[14])>.05,`${heldProfile} full-motion jump braces the weapon hand`);}
});
test('gameplay elevation/lift and XY translation apply exactly once to vertices and sockets',()=>{
  const a=sample(input()),b=sample(input({x:5,y:1,groundZ:.7,liftZ:.4}));
  for(let i=0;i<a.f.positionsNormals.length;i+=6){assert.ok(Math.abs(b.f.positionsNormals[i]-a.f.positionsNormals[i]-2)<1e-5);assert.ok(Math.abs(b.f.positionsNormals[i+1]-a.f.positionsNormals[i+1]+3)<1e-5);assert.ok(Math.abs(b.f.positionsNormals[i+2]-a.f.positionsNormals[i+2]-.8)<1e-5);}
  assert.ok(Math.abs(b.f.rightSocket[14]-a.f.rightSocket[14]-.8)<1e-5);
});
test('pause and exact-resume sampling are independent of render history',()=>{
  const i=input({action:{kind:'melee',profile:'hammer',phase:.37,durationMs:240,yaw:1}}),{s,f}=sample(i),copy=Float32Array.from(f.positionsNormals);
  sampleCloseViewHero(asset,s,i,f);assert.deepEqual(f.positionsNormals,copy);const resumed=sample(i);assert.deepEqual(resumed.f.positionsNormals,copy);assert.deepEqual(resumed.f.rightSocket,f.rightSocket);
});
test('partial accepted-action blend does not advance with a resumed wall clock',()=>{
  const action={kind:'melee',profile:'melee',phase:.025,durationMs:240,yaw:0},before=sample(input({nowMs:100006,action})),after=sample(input({nowMs:105006,action}));
  assert.deepEqual(before.f.positionsNormals,after.f.positionsNormals);assert.deepEqual(before.f.rightSocket,after.f.rightSocket);
});
test('actual knockdown clock holds the complete hero down and recovers body and gear together',()=>{
  const amount=t=>-knockdownPose(t,1000,true).angle/(Math.PI/2),action=p=>({kind:'hit',profile:'knockdown',phase:p,durationMs:1000,yaw:.7});
  const base=input({nowMs:0,reducedMotion:true,yaw:.7,groundZ:.3,liftZ:.2}),upright=sample(base),down=sample({...base,nowMs:400,action:action(amount(400))});
  assert.equal(amount(400),1);assert.equal(down.s.clip,'derived-knockdown');
  let low=Infinity,high=-Infinity,maxDifference=0;for(let i=0;i<down.f.positionsNormals.length;i+=6){low=Math.min(low,down.f.positionsNormals[i+2]);high=Math.max(high,down.f.positionsNormals[i+2]);maxDifference=Math.max(maxDifference,Math.abs(down.f.positionsNormals[i]-upright.f.positionsNormals[i]));assert.ok(Math.abs(Math.hypot(...down.f.positionsNormals.slice(i+3,i+6))-1)<1e-5);}
  assert.ok(low>=.5-1e-5,'down body remains above its actual elevation and gameplay lift');assert.ok(high<1.05,'held-down hero is horizontal, not standing');assert.ok(maxDifference>.5);
  const paused=sample({...base,nowMs:500400,action:action(amount(400))});assert.deepEqual(down.f.positionsNormals,paused.f.positionsNormals);assert.deepEqual(down.f.leftSocket,paused.f.leftSocket);
  const recovered=sample({...base,nowMs:1000,action:action(amount(1000))});assert.deepEqual(recovered.f.positionsNormals,upright.f.positionsNormals);assert.deepEqual(recovered.f.rightSocket,upright.f.rightSocket);
  const gettingUp=sample({...base,nowMs:950,action:action(amount(950))});assert.ok(amount(950)>0&&amount(950)<1);assert.ok(Math.max(...gettingUp.f.positionsNormals.filter((_,i)=>i%6===2))>high+.5);
  const a=new Float32Array(256*3*MODEL_FLOATS),b=new Float32Array(a.length),end=writeCloseViewHeroGear(a,0,{profile:'hammer',rightSocket:upright.f.rightSocket}),endDown=writeCloseViewHeroGear(b,0,{profile:'hammer',rightSocket:down.f.rightSocket});assert.equal(end,endDown);
  const cy=Math.cos(.7),sy=Math.sin(.7),lift=down.s.downClearance*base.height/down.s.referenceHeight;
  for(let i=0;i<end;i+=MODEL_FLOATS){const x=a[i]-base.x,y=a[i+1]-base.y,z=a[i+2]-.5,f=x*cy+y*sy,l=-x*sy+y*cy;assert.ok(Math.abs(b[i]-(base.x-z*cy-l*sy))<2e-5);assert.ok(Math.abs(b[i+1]-(base.y-z*sy+l*cy))<2e-5);assert.ok(Math.abs(b[i+2]-(.5+f+lift))<2e-5);}
});
test('accepted contact phase samples source contact without changing input or emitting events',()=>{
  const i=input({action:{kind:'melee',profile:'melee',phase:.18,durationMs:240,yaw:.7}}),before=JSON.stringify(i),{s}=sample(i);assert.equal(s.clip,'Dagger_Attack');assert.ok(Math.abs(s.clipTime-asset.clips.Dagger_Attack.duration*.35)<1e-10);assert.equal(JSON.stringify(i),before);
});
test('directional quickstep uses the coherent source crouch and anchors Body and socket horizontally',()=>{
  const {s,f}=sample(input({action:{kind:'dodge',profile:'dodge',phase:.45,durationMs:260,yaw:.3,moveX:1,moveY:0}}));const o=meta.reference.bodyNode*16;
  assert.ok(Math.abs(s.global[o+12]+s.rollCompX-s.rollX)<1e-7);assert.ok(Math.abs(s.global[o+14]+s.rollCompZ-s.rollZ)<1e-7);
  assert.notEqual(s.pose[33*10+2],asset.rest[33*10+2]);
  assert.equal(s.clip,'derived-quickstep-forward');assert.ok(s.clipTime>=0&&s.clipTime<=1);
  const scale=1.3776/s.referenceHeight,cy=Math.cos(.3),sy=Math.sin(.3),g=s.global,k=meta.sockets.right.node*16;
  assert.ok(Math.abs(f.rightSocket[12]-(3+((g[k+14]+s.rollCompZ)*cy-(g[k+12]+s.rollCompX)*sy)*scale))<1e-6);
});
test('unknown future profiles are neutral and missing clips use explicit derived pose labels',()=>{
  const neutral=sample(input({reducedMotion:true})),unknown=sample(input({action:{kind:'melee',profile:'future-tool',phase:.5,durationMs:240,yaw:0}}));assert.deepEqual(neutral.f.positionsNormals,unknown.f.positionsNormals);
  for(const kind of ['ranged','cast','jump']){const{s,f}=sample(input({action:{kind,profile:'emitter',phase:.5,durationMs:240,yaw:0}}));assert.equal(s.clip,'derived-'+kind);assert.ok(f.positionsNormals.every(Number.isFinite));}
});
test('all source action phases stay finite and bounded without modifying the source asset',()=>{
  const before=Float32Array.from(asset.arrays.positions),s=createHeroPoseState(asset),f=createHeroFrame(asset),i=input();
  for(const kind of ['melee','dodge','hit','death','interact','ranged','cast','jump'])for(const phase of [0,.1,.25,.5,.8,1]){i.action={kind,profile:'melee',phase,durationMs:240,yaw:.9};assert.ok(sampleCloseViewHero(asset,s,i,f));assert.ok(f.positionsNormals.every(Number.isFinite));}
  assert.deepEqual(asset.arrays.positions,before);
});
test('derived Hammerfall stomp stays finite, closes both fists and returns exactly to locomotion',()=>{
  for(const [speed,gaitPhase] of [[0,0],[1.2,2.1]]){const base=input({speed,gaitPhase}),idle=sample(base);for(const phase of [0,160/570,240/570,(320-.001)/570,320/570,400/570,1]){const {s,f}=sample({...base,action:{kind:'melee',profile:'hammer',phase,durationMs:570,poseMs:base.nowMs,yaw:0}});assert.equal(s.clip,phase===0||phase===1?(speed?'Walk':'Idle'):'derived-hammerfall-stomp');assert.ok(f.positionsNormals.every(Number.isFinite));}const end=sample({...base,action:{kind:'melee',profile:'hammer',phase:1,durationMs:570,poseMs:base.nowMs,yaw:0}});assert.deepEqual(end.f.positionsNormals,idle.f.positionsNormals);}
});
test('Hammerfall connected-leg, planted-elbow and native fallback geometry meet the authored bounds',()=>{
  const base=input({speed:1.2,gaitPhase:2.1}),entry=sample(base),raised=sample({...base,action:{kind:'melee',profile:'hammer',phase:160/570,durationMs:570,poseMs:base.nowMs,yaw:0}}),plant=sample({...base,action:{kind:'melee',profile:'hammer',phase:400/570,durationMs:570,poseMs:base.nowMs,yaw:0}});
  const point=(s,n)=>[s.global[n*16+12],s.global[n*16+13],s.global[n*16+14]],ankle=(s,left)=>{const lower=left?29:31,o=lower*16,k=left?0:3,g=s.global,a=s.ankleLocal,x=a[k],y=a[k+1],z=a[k+2];return[g[o]*x+g[o+4]*y+g[o+8]*z+g[o+12],g[o+1]*x+g[o+5]*y+g[o+9]*z+g[o+13],g[o+2]*x+g[o+6]*y+g[o+10]*z+g[o+14]];},angle=(s,a,e,w)=>{const A=point(s,a),E=point(s,e),W=point(s,w),u=A.map((v,i)=>v-E[i]),v=W.map((q,i)=>q-E[i]);return Math.acos(u.reduce((n,q,i)=>n+q*v[i],0)/(Math.hypot(...u)*Math.hypot(...v)))*180/Math.PI;};
  assert.ok(point(raised.s,36)[1]-point(entry.s,36)[1]>.25,'raised sole clears its gait baseline');
  const ready=Math.abs(point(entry.s,1)[0]-point(entry.s,36)[0]),wide=Math.abs(point(plant.s,1)[0]-point(plant.s,36)[0]);assert.ok(wide/ready>=1.4&&wide/ready<=1.7,`wide stance ratio ${wide/ready}`);
  for(const [left,foot] of [[true,1],[false,36]])assert.ok(Math.hypot(...point(plant.s,foot).map((v,i)=>v-ankle(plant.s,left)[i]))<.005,'virtual ankle connects at full layer');
  for(const q of [angle(plant.s,12,11,7),angle(plant.s,22,21,18)])assert.ok(q>=75&&q<=130,`planted elbow ${q}`);
  assert.equal(modelTriangleCount('playerHammerStomp'),254);const snapshots=[];for(const amount of [0,160/570,320/570,400/570,1]){const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),end=writeCloseViewModel(out,0,{kind:'playerHammerStomp',x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose:'attack',amount,scale:1,alpha:1,turn:0,reduceMotion:false});assert.equal(end,254*3*MODEL_FLOATS);assert.ok(out.slice(0,end).every(Number.isFinite));snapshots.push(out.slice(0,end));}assert.notDeepEqual(snapshots[1],snapshots[0]);assert.notDeepEqual(snapshots[3],snapshots[1]);for(let i=0;i<snapshots[0].length;i++)assert.equal(Math.abs(snapshots[4][i]-snapshots[0][i]),0);
});
test('held gear is body-free, bounded, transformed by the final socket and future-safe',()=>{
  const {f}=sample(),out=new Float32Array(256*3*MODEL_FLOATS);const gear={profile:'hammer',rightSocket:f.rightSocket,leftSocket:f.leftSocket,alpha:.5,tint:f.tint,hitFlash:0};
  const end=writeCloseViewHeroGear(out,0,gear);assert.ok(end>0&&end<=out.length);assert.ok(out.slice(0,end).every(Number.isFinite));for(let i=9;i<end;i+=MODEL_FLOATS)assert.equal(out[i],.5);
  const translated=Float32Array.from(f.leftSocket);translated[12]+=2;const b=new Float32Array(out.length);assert.equal(writeCloseViewHeroGear(b,0,{...gear,leftSocket:translated}),end);for(let i=0;i<end;i+=MODEL_FLOATS)assert.ok(Math.abs(b[i]-out[i]-2)<1e-5);
  assert.equal(writeCloseViewHeroGear(out,0,{...gear,profile:'future-tool'}),0);assert.equal(writeCloseViewHeroGear(new Float32Array(10),0,gear),0);
  assert.equal(writeCloseViewHeroGear(out,0,{...gear,profile:'constructor'}),0);assert.equal(writeCloseViewHeroGear(out,0,{...gear,profile:'toString'}),0);
  const atomic=new Float32Array(out.length).fill(7),before=Float32Array.from(atomic),singular=Float32Array.from(f.rightSocket);singular[0]=singular[1]=singular[2]=0;
  assert.equal(writeCloseViewHeroGear(atomic,0,{...gear,profile:'fist',rightSocket:singular}),0);assert.deepEqual(atomic,before,'a bad second fist socket is rejected before either gauntlet writes');
});
test('bind-space slimming preserves original height, intact head geometry, tracks and source buffers',()=>{
  const originalPositions=Float32Array.from(asset.arrays.positions),originalRest=Float64Array.from(asset.rest),before=createHeroPoseState(asset,{width:1,depth:1,hands:1}),after=createHeroPoseState(asset),a=createHeroFrame(asset),b=createHeroFrame(asset),i=input({nowMs:0,reducedMotion:true,groundZ:0});
  sampleCloseViewHero(asset,before,i,a);sampleCloseViewHero(asset,after,i,b);
  assert.deepEqual(after.proportions,HERO_PROPORTIONS);assert.deepEqual(before.pose,after.pose);assert.deepEqual(asset.rest,originalRest);assert.deepEqual(asset.arrays.positions,originalPositions);
  const body=meta.meshes.find(m=>m.skin>=0&&m.paletteClass==='wayfarer-body'),head=meta.meshes.find(m=>m.node===41);
  assert.ok(body&&head);for(let v=body.firstVertex;v<body.firstVertex+body.vertexCount;v++){assert.ok(Math.abs(after.fit.positions[v*3]-originalPositions[v*3]*.8)<1e-7);assert.equal(after.fit.positions[v*3+1],originalPositions[v*3+1]);assert.ok(Math.abs(after.fit.positions[v*3+2]-originalPositions[v*3+2]*.82)<1e-7);}
  for(let v=head.firstVertex*3;v<(head.firstVertex+head.vertexCount)*3;v++)assert.equal(after.fit.positions[v],asset.arrays.positions[v]);
  for(const f of [a,b]){const heights=f.positionsNormals.filter((_,k)=>k%6===2);assert.ok(Math.abs(Math.max(...heights)-i.height)<1e-5);assert.ok(Math.abs(Math.min(...heights))<1e-5);}
  const span=(s,axis)=>{let lo=Infinity,hi=-Infinity;for(let v=body.firstVertex;v<body.firstVertex+body.vertexCount;v++){const y=asset.arrays.positions[v*3+1];if(y>.8&&y<1.8){lo=Math.min(lo,s.vertices[v*6+axis]);hi=Math.max(hi,s.vertices[v*6+axis]);}}return hi-lo;};
  assert.ok(span(after,0)<span(before,0)*.88);assert.ok(span(after,2)<span(before,2)*.9);
});
test('hand reduction acts independently around wrists and moves gear grips without shrinking equipment',()=>{
  const before=createHeroPoseState(asset,{width:.8,depth:.82,hands:1}),after=createHeroPoseState(asset),a=createHeroFrame(asset),b=createHeroFrame(asset),i=input({nowMs:0,reducedMotion:true});sampleCloseViewHero(asset,before,i,a);sampleCloseViewHero(asset,after,i,b);
  for(const root of [7,9,18,20])for(let k=12;k<15;k++)assert.ok(Math.abs(before.global[root*16+k]-after.global[root*16+k])<1e-8,'wrist pivot stays put');
  const handNodes=new Set([7,6,5]);let checked=0;
  for(const m of meta.meshes)if(m.skin>=0)for(let v=m.firstVertex;v<m.firstVertex+m.vertexCount;v++){let weight=0;for(let k=0;k<4;k++)if(handNodes.has(asset.skins[m.skin].joints[asset.arrays.joints[v*4+k]]))weight+=asset.arrays.weights[v*4+k];if(weight<.99999)continue;checked++;const root=7*16;
    for(let axis=0;axis<3;axis++){const origin=before.global[root+12+axis],delta=before.vertices[v*6+axis]-origin;assert.ok(Math.abs(after.vertices[v*6+axis]-(origin+delta*.62))<1e-6);}
  }assert.ok(checked>10);
  const dx=b.rightSocket[12]-a.rightSocket[12],dy=b.rightSocket[13]-a.rightSocket[13],dz=b.rightSocket[14]-a.rightSocket[14];assert.ok(Math.hypot(dx,dy,dz)>.01);
  for(const profile of ['melee','emitter','hammer']){const oldGear=new Float32Array(256*3*MODEL_FLOATS),newGear=new Float32Array(oldGear.length),end=writeCloseViewHeroGear(oldGear,0,{profile,rightSocket:a.rightSocket});assert.equal(writeCloseViewHeroGear(newGear,0,{profile,rightSocket:b.rightSocket}),end);assert.ok(end>0);
    for(let k=0;k<end;k+=MODEL_FLOATS){assert.ok(Math.abs(newGear[k]-oldGear[k]-dx)<1e-6);assert.ok(Math.abs(newGear[k+1]-oldGear[k+1]-dy)<1e-6);assert.ok(Math.abs(newGear[k+2]-oldGear[k+2]-dz)<1e-6);}
  }
});
test('fitted feet preserve source locomotion translations and all action rotations',()=>{
  const original=createHeroPoseState(asset,{width:1,depth:1,hands:1}),fitted=createHeroPoseState(asset),a=createHeroFrame(asset),b=createHeroFrame(asset),i=input({speed:4}),offsets=[];
  for(const phase of [0,Math.PI/2,Math.PI,Math.PI*1.5]){i.gaitPhase=phase;sampleCloseViewHero(asset,original,i,a);sampleCloseViewHero(asset,fitted,i,b);assert.deepEqual(fitted.pose,original.pose);
    const delta=[];for(const node of [1,36])for(let axis=0;axis<3;axis++)delta.push(fitted.global[node*16+12+axis]-original.global[node*16+12+axis]);offsets.push(delta);
  }
  for(const delta of offsets)for(let k=0;k<delta.length;k++)assert.ok(Math.abs(delta[k]-offsets[0][k])<1e-6,'foot stroke keeps its original amplitude');
  for(const kind of ['melee','dodge','death','cast']){i.action={kind,profile:'melee',phase:.4,durationMs:240,yaw:0};sampleCloseViewHero(asset,original,i,a);sampleCloseViewHero(asset,fitted,i,b);assert.deepEqual(fitted.pose,original.pose);assert.ok(b.positionsNormals.every(Number.isFinite));}
});
