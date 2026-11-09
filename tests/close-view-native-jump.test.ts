import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,JUMP,jumpLift} from '../src/game.ts';
import {freshSave,migrateSave} from '../src/types.ts';
import {ordinaryJumpPresentation} from '../src/close-view-player-presentation.ts';
import {MODEL_FLOATS,writeCloseViewModel,modelTriangleCount,modelSupportsAttachments} from '../src/close-view-models.ts';
const base={kind:'player',x:0,y:0,z:.4,yaw:0,phase:0,pace:0,pose:'jump',amount:.5,reduceMotion:true};
function mesh(extra={}){const out=new Float32Array(10000),n=writeCloseViewModel(out,0,{...base,...extra});assert.equal(n,modelTriangleCount(extra.kind||base.kind)*30);return out.slice(0,n);}
const air=(elapsedMs,durationMs=520)=>({v:1,elapsedMs,remainingMs:durationMs-elapsedMs,durationMs,lift:.4,rise:Math.min(1,elapsedMs/260),fall:Math.max(0,1-(durationMs-elapsedMs)/260)});
const near=(a,b,e=1e-5)=>Math.abs(a-b)<e;
function center(out,start,end){const points=new Map();for(let i=start*30;i<end*30;i+=10){const p=Array.from(out.slice(i,i+3));points.set(p.map(v=>Math.round(v*1e6)).join(','),p);}const ps=[...points.values()];return [0,1,2].map(k=>ps.reduce((n,p)=>n+p[k],0)/ps.length);}
function press(rank=0){const save=freshSave(),g=new Game(save,0);g.loadArea('overworld',false);g.enemies=[];save.magicSkills.learned={quickening:rank};let used=false;g.update(.016,{state:{x:0,y:0},consume:k=>k==='jump'&&!used?(used=true):false,held:()=>false},1000);assert.equal(g.jumpStart,1000);return g;}

test('native ordinary legs fold with captured physical clocks and connected source boots without adding root lift',()=>{
  const source=mesh(),drawn=mesh({jumpAir:air(260)});assert.notDeepEqual(drawn,source);
  // Only the two legs and boots change; the torso/head/weapon retain actor.z exactly.
  for(let t=0;t<238;t++)if(!(t>=108&&t<140||t>=162&&t<194))assert.deepEqual(drawn.slice(t*30,(t+1)*30),source.slice(t*30,(t+1)*30));
  for(const [leg,foot] of [[126,128],[180,182]]){const ankle=center(drawn,leg,leg+2),boot=center(drawn,foot,foot+12);assert.ok(near(Math.hypot(...ankle.map((v,k)=>v-boot[k])),Math.hypot(.044,.076)*.82));}
  const sameLift=mesh({jumpAir:{...air(260),lift:100}});assert.deepEqual(sameLift,drawn,'descriptor lift is never reapplied');
  const hold=mesh({jumpAir:air(260,1040)}),laterHold=mesh({jumpAir:air(600,1040)});assert.deepEqual(hold,laterHold,'extended hang cannot slow or replay physical leg draw-up');
});

test('native jump keeps every profile budget, normalized finite geometry and source endpoints under gait and reduced motion',()=>{
  const counts={player:238,playerUnarmed:214,playerTool:240,playerCinderPike:240,playerVergeCleaver:254,playerIronFists:222,'playerIronFists:emitter':248};
  for(const [kind,count] of Object.entries(counts)){
    assert.equal(modelTriangleCount(kind),count);for(let n=0;n<=3;n++)assert.equal(modelSupportsAttachments(kind,n),count+n*8<=256);
    for(const reduceMotion of [false,true])for(const pace of [0,.7])for(const phase of [0,1.2]){
      const extra={kind,reduceMotion,pace,phase};assert.deepEqual(mesh({...extra,amount:0,jumpAir:air(0)}),mesh({...extra,amount:0}));assert.deepEqual(mesh({...extra,amount:1,jumpAir:air(520)}),mesh({...extra,amount:1}));
      for(const elapsed of [1,15,30,60,100,200,260,400,490,519]){
        const out=mesh({...extra,amount:elapsed/520,jumpAir:air(elapsed)});
        for(let i=0;i<out.length;i+=MODEL_FLOATS){assert.ok(out.slice(i,i+10).every(Number.isFinite),kind);assert.ok(near(Math.hypot(...out.slice(i+3,i+6)),1),`${kind} unit normal`);assert.ok(Math.abs(out[i])<2.5&&Math.abs(out[i+1])<2.5&&out[i+2]>-.2&&out[i+2]<3,kind);}
      }
    }
  }
});

test('legacy, opaque, excluded forms and higher-priority actions retain source geometry and atomic admission',()=>{
  const source=mesh();for(const jumpAir of [null,{...air(100),v:2},{...air(100),rise:NaN},{...air(100),elapsedMs:-1},{...air(100),remainingMs:999},{...air(100),lift:-1}])assert.deepEqual(mesh({jumpAir}),source);
  for(const kind of ['playerRobot','playerPowerSuit','playerEmberForm','playerShadow'])assert.deepEqual(mesh({kind,jumpAir:air(200)}),mesh({kind}));
  for(const pose of ['idle','attack','cast','hit','knockdown','death','tool','fist','windup'])assert.deepEqual(mesh({pose,jumpAir:air(200)}),mesh({pose}));
  const short=new Float32Array(238*30-1).fill(7);assert.equal(writeCloseViewModel(short,0,{...base,jumpAir:air(200)}),0);assert.ok(short.every(v=>v===7));
  const sourceText=readFileSync(new URL('../src/close-view.ts',import.meta.url),'utf8');assert.match(sourceText,/jumpAir: who===player&&pose==='jump'\?ordinaryJumpPresentation\(g,now,d.jumpLift,d.jumpBaseMs\):null/);
});

test('actual pause and schema-14 resume preserve native ordinary-air pose without advancing scratch clocks',()=>{
  const g=press(2);g.lastUpdateNow=1150;g.setPaused(true,1150);const a=ordinaryJumpPresentation(g,1150,jumpLift(g,1150),JUMP.base),b=ordinaryJumpPresentation(g,99999,jumpLift(g,1150),JUMP.base);assert.deepEqual(a,b);
  const captured=mesh({jumpAir:a});mesh({jumpAir:air(400)});assert.deepEqual(mesh({jumpAir:b}),captured);
  const saved=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(99999)))),back=new Game(saved,200000),r=ordinaryJumpPresentation(back,200000,jumpLift(back,200000),JUMP.base);assert.deepEqual(r,a);assert.deepEqual(mesh({jumpAir:r}),captured);
});

test('native ordinary-air frame sampling is continuous at shared 30/60 fps phases and connection edges',()=>{
  const sample=fps=>Array.from({length:Math.floor(520*fps/1000)+1},(_,i)=>{const t=i*1000/fps;return mesh({amount:t/520,jumpAir:air(t)});}),slow=sample(30),fast=sample(60);
  for(let frame=0;frame<slow.length;frame++)for(let i=0;i<slow[frame].length;i++)assert.ok(near(slow[frame][i],fast[frame*2][i]),'shared phases agree after independent 30/60fps sampling');
  for(const t of [0,1,30,59,60,169,260,460,490,519]){
    const a=mesh({amount:t/520,jumpAir:air(t)}),b=mesh({amount:(t+.01)/520,jumpAir:air(t+.01)});let max=0;for(let i=0;i<a.length;i+=10)for(let k=0;k<3;k++)max=Math.max(max,Math.abs(a[i+k]-b[i+k]));assert.ok(max<.002,`${t}: ${max}`);
  }
});

test('jump-only compatible baseline stays inside historical bounds and preserves the idle boundary outside legs',()=>{
  // Historical59d7b88d legacy-jump bounds, before the explicitly authorized knee baseline.
  const oldBounds=[[0,[-.137123943,-.272239984,.4],[.182860002,.272239984,1.777599931]],[.5,[-.471730590,-.272239984,.405948430],[.383769542,.272239984,1.786255956]],[1,[-.137123943,-.272239984,.4],[.182860002,.272239984,1.777599931]]];
  for(const [amount,min,max] of oldBounds){const out=mesh({amount});for(let i=0;i<out.length;i+=10)for(let k=0;k<3;k++)assert.ok(out[i+k]>=min[k]-1e-6&&out[i+k]<=max[k]+1e-6);}
  const idle=mesh({pose:'idle',amount:0}),takeoff=mesh({amount:0,jumpAir:air(0)});
  for(let t=0;t<238;t++)if(!(t>=108&&t<128||t>=162&&t<182))assert.deepEqual(takeoff.slice(t*30,(t+1)*30),idle.slice(t*30,(t+1)*30),'idle boundary changes only the intentional leg topology');
});

test('matching jump topology has positive face area and agrees with geometric winding through every connection weight',()=>{
  const kinds=['player','playerUnarmed','playerTool','playerCinderPike','playerVergeCleaver','playerIronFists','playerIronFists:emitter'];
  for(const kind of kinds)for(const reduceMotion of [false,true])for(const [phase,pace] of [[0,0],[1.2,.7]])for(let elapsed=0;elapsed<=520;elapsed+=5){
    const out=mesh({kind,reduceMotion,phase,pace,amount:elapsed/520,jumpAir:air(elapsed)}),ranges=kind.startsWith('playerIronFists')?[[94,150]]:[[108,140],[162,194]];
    // Check every changed leg/boot face, including the independent35ms triangle174 repro.
    for(const [start,end] of ranges)for(let t=start;t<end;t++){
      const i=t*30,ax=out[i+10]-out[i],ay=out[i+11]-out[i+1],az=out[i+12]-out[i+2],bx=out[i+20]-out[i],by=out[i+21]-out[i+1],bz=out[i+22]-out[i+2],nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,area=Math.hypot(nx,ny,nz);
      assert.ok(area>1e-7,`${kind} ${elapsed} triangle${t} nondegenerate`);
      for(let v=0;v<3;v++){const n=i+v*10+3,dot=(nx*out[n]+ny*out[n+1]+nz*out[n+2])/area;assert.ok(dot>.9,`${kind} ${elapsed} triangle${t} winding ${dot}`);}
    }
  }
});
