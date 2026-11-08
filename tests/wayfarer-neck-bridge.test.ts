import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero,HERO_BODY_TRIANGLES} from '../src/close-view-hero.ts';

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8'));
const bytes=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));

test('neck bridge joins the original collar and follows the unscaled Rogue head',()=>{
  const bridge=meta.meshes.find(m=>m.name==='NeckBridge');assert.ok(bridge);
  assert.equal(bridge.vertexCount,19);assert.equal(bridge.indexCount/3,30);
  assert.ok(meta.indexCount/3<=HERO_BODY_TRIANGLES);
  assert.equal(bridge.materialLayer,0);assert.equal(bridge.paletteClass,'wayfarer-body');
  const a=asset.arrays,lower=meta.derivatives.neckBridgeLowerRingVertexIndices,collar=meta.headAttachment.collarVertexIndices;
  assert.equal(lower.length,6);assert.equal(meta.headAttachment.defaultScale,.4);
  for(let i=0;i<6;i++)for(const [name,width] of [['positions',3],['joints',4],['weights',4]])
    assert.deepEqual(a[name].slice(lower[i]*width,(lower[i]+1)*width),a[name].slice(collar[i]*width,(collar[i]+1)*width));
  const skin=meta.skins[bridge.skin];
  for(let v=bridge.firstVertex+6;v<bridge.firstVertex+bridge.vertexCount;v++){
    let total=0;for(let k=0;k<4;k++){const w=a.weights[v*4+k];if(w>0)assert.equal(skin.joints[a.joints[v*4+k]],3,'upper bridge follows Rogue Head, never scaled Cleric attachment');total+=w;}
    assert.equal(total,1);
  }
});

test('actual sampled neck/collar seams remain exact through gait, action, inversion and recovery',()=>{
  const state=createHeroPoseState(asset),frame=createHeroFrame(asset),lower=meta.derivatives.neckBridgeLowerRingVertexIndices,collar=meta.headAttachment.collarVertexIndices;
  const poses=[['idle',null,'',0],['walk',null,'',1.2],['run',null,'',3],['blade','melee','melee',0],['roll','dodge','melee',0],['hit','hit','melee',0],['cast','cast','mirage',0],['jump','jump','melee',0],['knockdown','hit','knockdown',0]];
  let sampled=0;
  for(const [label,kind,profile,speed] of poses)for(let step=0;step<=20;step++){
    const phase=step/20,input={nowMs:1000+phase*2000,reducedMotion:false,x:1.2,y:3.4,groundZ:.7,liftZ:.17,yaw:.31,height:1.3776,speed,gaitPhase:phase*Math.PI*2,action:kind?{kind,profile,phase,durationMs:1000,yaw:.31}:null,alpha:1,tint:[1,1,1],hitFlash:0};
    assert.equal(sampleCloseViewHero(asset,state,input,frame),true);assert.equal(frame.ready,true);
    for(let i=0;i<6;i++)for(let k=0;k<3;k++)assert.equal(frame.positionsNormals[lower[i]*6+k],frame.positionsNormals[collar[i]*6+k],`${label}/${phase}/seam${i}/${k}`);
    sampled++;
  }
  assert.equal(sampled,189);
});
