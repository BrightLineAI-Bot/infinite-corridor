import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sampleMeleeActionPose } from '../src/close-view-player-presentation.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, writeCloseViewModel } from '../src/close-view-models.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';

const cleaver={v:1 as const,kind:'verge-cleaver' as const,move:'cleaver' as const,contactMs:96,durationMs:320};
const fist=(move:'dash'|'jab'|'uppercut')=>({v:1 as const,kind:'iron-fists' as const,move,contactMs:90,durationMs:300});

test('melee sampler uses the declared common contact and four alternating bounded cuts',()=>{
  for(let step=1;step<=4;step++){
    const before=sampleMeleeActionPose(cleaver,.1,step)!,contact=sampleMeleeActionPose(cleaver,.3,step)!,after=sampleMeleeActionPose(cleaver,.55,step)!,end=sampleMeleeActionPose(cleaver,1,step)!;
    assert.equal(contact.phase,'follow-through');assert.equal(contact.weight,1);assert.ok(before.weight<contact.weight);assert.ok(after.weight>0,'follow-through remains committed');assert.equal(end.weight,0);
    assert.equal(Math.sign(contact.yaw),step<3?-1:1);assert.ok(Math.abs(contact.pitch)<1.1&&Math.abs(contact.yaw)<.5);
    const afterContact = sampleMeleeActionPose(cleaver, contact.contact + 1e-5, step)!;
    assert.ok(Math.abs(afterContact.pitch - contact.pitch) < .001, 'blade does not snap backward immediately after contact');
  }
  assert.equal(sampleMeleeActionPose({...cleaver,contactMs:321},.5),null);
  assert.equal(sampleMeleeActionPose({...cleaver,durationMs:Infinity},.5),null);
  assert.equal(sampleMeleeActionPose({v:1,kind:'iron-fists',move:'cleaver',contactMs:90,durationMs:300},.5),null);
});
test('new Cleaver sampler gives three quick continuations and constrains blade pitch at contact',()=>{
  const action={v:2,kind:'verge-cleaver',move:'cleaver',contactMs:75,durationMs:260};
  const cuts=[1,2,3].map(step=>sampleMeleeActionPose(action,75/260,step)!);
  assert.ok(cuts.every(q=>q&&Math.abs(q.pitch)<.08&&q.kind==='verge-cleaver'));
  assert.ok(cuts[0].yaw*cuts[1].yaw<0&&cuts[1].yaw*cuts[2].yaw<0,'continuations reverse their cutting line');
  assert.equal(sampleMeleeActionPose({...action,durationMs:261},1,1)?.recovery,1);
});

test('dash, opposite jab and uppercut alternate the lead and recover their guard',()=>{
  for(const opening of ['right','left'] as const){const sign=opening==='right'?1:-1,dash=sampleMeleeActionPose(fist('dash'),.3,1,opening)!,jab=sampleMeleeActionPose(fist('jab'),.3,2,opening)!,upper=sampleMeleeActionPose(fist('uppercut'),.3,3,opening)!;
    assert.equal(dash.lead,sign);assert.equal(jab.lead,-sign);assert.equal(upper.lead,sign);assert.equal(dash.openingLead,sign);
    assert.ok(dash.drive>.7&&jab.drive>.7&&upper.drive>.7);
  }
  for(const move of ['dash','jab','uppercut'] as const){const recovered=sampleMeleeActionPose(fist(move),1)!;assert.equal(recovered.weight,0);assert.equal(recovered.recovery,1);}
});

test('native weighted melee remains finite under reduced motion while legacy geometry is byte-stable',()=>{
  const render=(extra:any={})=>{const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),end=writeCloseViewModel(out,0,{kind:'playerVergeCleaver',x:1,y:2,z:3,yaw:.4,phase:1.2,pace:.8,pose:'attack',amount:.3,reduceMotion:true,...extra});assert.ok(end>0);assert.ok(out.slice(0,end).every(Number.isFinite));return out.slice(0,end);};
  const legacyA=render(),legacyB=render();assert.deepEqual(legacyA,legacyB);
  const weighted=render({meleeAction:cleaver,primaryStage:{kind:'cleaver-four',step:4}});assert.notDeepEqual(weighted,legacyA);
  for(const move of ['dash','jab','uppercut'] as const){const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),end=writeCloseViewModel(out,0,{kind:'playerIronFists',x:0,y:0,z:0,yaw:0,phase:0,pace:1,pose:'fist',amount:.3,reduceMotion:true,meleeAction:fist(move)});assert.ok(end>0&&out.slice(0,end).every(Number.isFinite));}
});

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8'));
const file=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
const hero=(action:any,reducedMotion=false,nowMs=2000,heldProfile:any=action?.meleeAction?.kind==='verge-cleaver'?'verge-cleaver':null)=>{const state=createHeroPoseState(asset),frame=createHeroFrame(asset);assert.ok(sampleCloseViewHero(asset,state,{nowMs,reducedMotion,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:1.2,gaitPhase:1.1,heldProfile,action,alpha:1,tint:[1,1,1],hitFlash:0},frame));return{state,frame};};

test('imported hero shares contact poses in full and reduced motion and returns to locomotion',()=>{
  for(const [descriptor,profile,step] of [[cleaver,'verge-cleaver',4],[fist('dash'),'fist',1],[fist('jab'),'fist',2],[fist('uppercut'),'fist',3]] as const){
    const action={kind:'melee',profile,phase:.3,durationMs:descriptor.durationMs,poseMs:1910,primaryStep:step,fistStep:step,primaryStage:{kind:'cleaver-four',step},meleeAction:descriptor};
    const full=hero(action),reduced=hero(action,true);assert.match(full.state.clip,/derived-weighted/);assert.equal(full.state.clip,reduced.state.clip);
    assert.ok(full.frame.positionsNormals.every(Number.isFinite)&&reduced.frame.positionsNormals.every(Number.isFinite));
    const end=hero({...action,phase:1}),held=descriptor.kind==='verge-cleaver'?'verge-cleaver':null,idle=hero(null,false,1910+descriptor.durationMs,held);
    const delta=(a:Float32Array,b:Float32Array)=>{let sum=0;for(let i=0;i<a.length;i+=6)sum+=Math.hypot(a[i]-b[i],a[i+1]-b[i+1],a[i+2]-b[i+2]);return sum/(a.length/6);};
    assert.ok(delta(end.frame.positionsNormals,idle.frame.positionsNormals)<delta(full.frame.positionsNormals,idle.frame.positionsNormals),'recovery returns toward locomotion/carry');
  }
});

test('imported cleaver drives the canonical left-hand rightSocket through four distinct continuous paths',()=>{
  const carry=hero(null,false,2000,'verge-cleaver').frame,points:number[][]=[];
  for(let step=1;step<=4;step++){
    const base={kind:'melee',profile:'verge-cleaver',durationMs:320,poseMs:1904,primaryMotion:{v:2,step},meleeAction:cleaver};
    const before=hero({...base,phase:.3-1e-5}).frame,at=hero({...base,phase:.3}).frame,after=hero({...base,phase:.3+1e-5}).frame;
    const point=Array.from(at.rightSocket.slice(12,15));points.push(point);
    const move=(key:'leftSocket'|'rightSocket')=>Math.hypot(at[key][12]-carry[key][12],at[key][13]-carry[key][13],at[key][14]-carry[key][14]);
    assert.ok(move('rightSocket')>move('leftSocket')+.015,`cut ${step} moves canonical grip most`);
    for(const near of [before,after])assert.ok(Math.hypot(near.rightSocket[12]-point[0],near.rightSocket[13]-point[1],near.rightSocket[14]-point[2])<.002,`cut ${step} is continuous at contact`);
  }
  for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)assert.ok(Math.hypot(points[a][0]-points[b][0],points[a][1]-points[b][1],points[a][2]-points[b][2])>.01,`cuts ${a+1}/${b+1} are distinct`);
});

test('weighted cleaver converges to the same low carry at both epsilon boundaries',()=>{
  const maxDelta=(a:Float32Array,b:Float32Array)=>{let d=0;for(let i=0;i<a.length;i++)d=Math.max(d,Math.abs(a[i]-b[i]));return d;};
  for(let step=1;step<=4;step++){const base={kind:'melee',profile:'verge-cleaver',durationMs:320,poseMs:2000,primaryMotion:{v:2,step},meleeAction:cleaver},
    start=hero({...base,phase:0},true).frame,startNear=hero({...base,phase:1e-6},true).frame,endNear=hero({...base,phase:1-1e-6},true).frame,end=hero({...base,phase:1},true).frame;
    assert.ok(maxDelta(start.positionsNormals,startNear.positionsNormals)<1e-4,`cut ${step} continuous from carry`);
    assert.ok(maxDelta(endNear.positionsNormals,end.positionsNormals)<1e-4,`cut ${step} continuous into carry`);
    assert.ok(Math.hypot(startNear.leftSocket[12]-start.leftSocket[12],startNear.leftSocket[13]-start.leftSocket[13],startNear.leftSocket[14]-start.leftSocket[14])<1e-4);
    assert.ok(Math.hypot(endNear.leftSocket[12]-end.leftSocket[12],endNear.leftSocket[13]-end.leftSocket[13],endNear.leftSocket[14]-end.leftSocket[14])<1e-4);
  }
});

test('imported Iron Fists mirrors accepted leads and keeps the jab opposite',()=>{
  for(const lead of ['right','left'] as const){const leadKey=`${lead}Socket` as const,otherKey=`${lead==='right'?'left':'right'}Socket` as const;
    for(const [move,expected] of [['dash',leadKey],['jab',otherKey],['uppercut',leadKey]] as const){const frame=hero({kind:'melee',profile:'fist',phase:.3,durationMs:300,poseMs:1910,fistLead:lead,fistStep:move==='dash'?1:move==='jab'?2:3,meleeAction:fist(move)}).frame;
      const guard=expected===leadKey?otherKey:leadKey,axis=move==='uppercut'?14:12;
      assert.ok(frame[expected][axis]>frame[guard][axis]+.015,`${lead} ${move} extends expected hand`);
    }
  }
});

test('weighted fist startup preserves the accepted charge pose and leaves it continuously',()=>{
  for(const fistLead of ['right','left'] as const)for(const [move,step] of [['dash',1],['jab',2],['uppercut',3]] as const){const held=hero({kind:'melee',profile:'fistCharge',phase:1,durationMs:240,poseMs:2000,fistLead,fistStep:step}).frame,
    entry=hero({kind:'melee',profile:'fist',phase:0,durationMs:300,poseMs:2000,fistLead,fistStep:step,fistCharge:1,meleeAction:fist(move)}).frame,
    next=hero({kind:'melee',profile:'fist',phase:.001,durationMs:300,poseMs:2000,fistLead,fistStep:step,fistCharge:1,meleeAction:fist(move)}).frame;
    let entryDelta=0,nextDelta=0;for(let i=0;i<entry.positionsNormals.length;i+=6){entryDelta=Math.max(entryDelta,Math.abs(entry.positionsNormals[i]-held.positionsNormals[i]),Math.abs(entry.positionsNormals[i+1]-held.positionsNormals[i+1]),Math.abs(entry.positionsNormals[i+2]-held.positionsNormals[i+2]));nextDelta=Math.max(nextDelta,Math.abs(next.positionsNormals[i]-entry.positionsNormals[i]),Math.abs(next.positionsNormals[i+1]-entry.positionsNormals[i+1]),Math.abs(next.positionsNormals[i+2]-entry.positionsNormals[i+2]));}
    assert.ok(entryDelta<1e-6,`${fistLead} ${move} charge is exact at weighted entry`);assert.ok(nextDelta<.02,`${fistLead} ${move} startup is continuous`);
  }
});

test('stale weighted metadata cannot override a selected reaction',()=>{
  const {state}=hero({kind:'hit',profile:'fist',phase:.2,durationMs:300,meleeAction:fist('dash')});
  assert.equal(state.clip,'RecieveHit');
  const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),end=writeCloseViewModel(out,0,{kind:'playerIronFists',x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose:'hit',amount:.2,reduceMotion:false,meleeAction:fist('dash')});
  assert.ok(end>0&&out.slice(0,end).every(Number.isFinite));
});
