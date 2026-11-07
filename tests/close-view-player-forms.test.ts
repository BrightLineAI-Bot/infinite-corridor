import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOSE_VIEW_PLAYER_FORM_MODELS, CLOSE_VIEW_PLAYER_FORM_PROFILES } from '../src/close-view-player-forms.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelSupported, modelTriangleCount, writeCloseViewModel } from '../src/close-view-models.ts';

const keys=['playerIronFists','playerRobot','playerPowerSuit','playerEmberForm'];
const actor=(kind,extra={})=>({kind,x:0,y:0,z:0,yaw:0,phase:.4,pace:0,pose:'idle',amount:0,...extra});
const written=(kind,extra={})=>{const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),end=writeCloseViewModel(out,0,actor(kind,extra));return out.slice(0,end);};
const bounds=(data)=>{const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i+=MODEL_FLOATS)for(let q=0;q<3;q++){lo[q]=Math.min(lo[q],data[i+q]);hi[q]=Math.max(hi[q],data[i+q]);}return{lo,hi,span:hi.map((v,i)=>v-lo[i])};};

test('player forms register as finite authored meshes with future triangle room',()=>{
  assert.deepEqual(Object.keys(CLOSE_VIEW_PLAYER_FORM_MODELS),keys);
  for(const key of keys){assert.equal(modelSupported(key),true);const n=modelTriangleCount(key);assert.ok(n>70,`${key} authored detail`);assert.ok(n<=232,`${key} triangle room: ${n}`);const data=written(key);assert.equal(data.length/MODEL_FLOATS/3,n);for(const v of data)assert.ok(Number.isFinite(v),key);}
});

test('the source identities have distinct silhouettes rather than palette-only bodies',()=>{
  const b=Object.fromEntries(keys.map(k=>[k,bounds(written(k))]));
  assert.ok(b.playerIronFists.span[1]>.78,'paired broad gauntlets');
  assert.ok(b.playerRobot.span[1]>1.1&&b.playerRobot.span[2]>1.2,'larger viewport robot');
  assert.ok(b.playerPowerSuit.span[1]<b.playerRobot.span[1]*.72,'svelte empowered suit');
  assert.ok(b.playerEmberForm.hi[2]>1.5&&b.playerEmberForm.span[1]>.95,'grown crested striking form');
  assert.notDeepEqual([...written('playerIronFists')],[...written('playerPowerSuit')]);
});

test('form joints preserve gait, windup and contact readability under reduced motion',()=>{
  for(const key of keys){const idle=written(key),walk=written(key,{pace:1,phase:2}),wind=written(key,{pose:'windup',amount:.8,reduceMotion:true}),hit=written(key,{pose:'attack',amount:.3,reduceMotion:true});assert.notDeepEqual([...walk],[...idle],`${key} gait`);assert.notDeepEqual([...wind],[...idle],`${key} windup`);assert.notDeepEqual([...hit],[...wind],`${key} contact`);}
});

test('profiles are geometry-only integration data and name no activation state',()=>{
  assert.deepEqual(Object.keys(CLOSE_VIEW_PLAYER_FORM_PROFILES),keys);
  for(const [key,p] of Object.entries(CLOSE_VIEW_PLAYER_FORM_PROFILES)){assert.ok(Number.isFinite(p.head)&&p.head>1);assert.equal(p.lift,0);assert.equal(typeof p.pose,'string');assert.equal('active' in p,false,`${key} cannot activate gameplay`);}
});
