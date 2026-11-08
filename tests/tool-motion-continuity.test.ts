import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';
import { sampleToolActionMotion, TOOL_ACTION_TIMING } from '../src/action-motion.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8'));
const raw=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
const tools={'rift-bombard':['Rift Bombard','blast'],blunderbuss:['Blunderbuss','quick'],'lumen-spindle':['Lumen Spindle','focus'],'great-sweep':['Great Sweep','brawler']};
function fixture(kind,swift=false){
  const {game:g}=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000});g.enemies=[];g.projectiles=[];
  g.save.closeView=false; // Explicit legacy/top-down motion path; delayed Close View phases have their own transaction/presentation matrix.
  g.save.equipment.secondary=normalizeSockets({id:'secondary-'+kind,name:tools[kind][0],slot:'secondary',power:5,property:tools[kind][1],tier:'relic'});
  g.save.equipment.primary={id:'primary-cinder-pike',name:'Cinder Pike',slot:'primary',power:5};
  if(swift){g.save.glyphs.swift=3;for(let i=0;i<3;i++)assert.equal(socketGlyph(g.save,'tool',i,'swift').ok,true);}
  return g;
}
const values=p=>[p.yaw,p.side,p.up,p.forward,p.weight];
function socket(record,age){
  const state=createHeroPoseState(asset),frame=createHeroFrame(asset);
  sampleCloseViewHero(asset,state,{nowMs:100000,reducedMotion:false,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:0,gaitPhase:0,heldProfile:record.toolMotion.baseKind,action:{...record,kind:record.toolKind==='great-sweep'?'melee':'ranged',profile:record.toolKind,phase:age/record.durationMs,yaw:0},alpha:1,tint:[1,1,1],hitFlash:0},frame);
  return Array.from(frame.rightSocket.slice(12,15));
}

test('legacy top-down ordinary and Swift gun repeats retain the ready hold through the whole recoil trajectory',()=>{
  for(const kind of Object.keys(tools).filter(k=>k!=='great-sweep'))for(const swift of [false,true]){
    const g=fixture(kind,swift);assert.equal(g.fireSecondary(100000,{x:1,y:0}),true);
    let acceptedAt=100000;
    for(let repeat=0;repeat<4;repeat++){
      const previous=structuredClone(g.player.attackVisual),next=g.player.attackReadyAt;
      const prior=sampleToolActionMotion(previous,next-acceptedAt);assert.equal(prior.weight,1);
      assert.equal(g.fireSecondary(next,{x:1,y:0}),true);acceptedAt=next;
      const record=g.player.attackVisual;assert.deepEqual(values(sampleToolActionMotion(record,0)),values(prior));
      const held=socket(record,0);
      for(let ms=0;ms<=TOOL_ACTION_TIMING[kind].raiseMs;ms+=5){
        const pose=sampleToolActionMotion(record,ms);assert.equal(pose.weight,1,kind+' repeat must not lower the arm at '+ms);
        assert.ok(Math.abs(pose.forward-prior.forward)<=.055+1e-12,'only bounded recoil changes forward hold');
        const hand=socket(record,ms);assert.ok(Math.hypot(...hand.map((x,i)=>x-held[i]))<.08,kind+' actual socket retains its held position');
      }
      assert.equal(sampleToolActionMotion(record,record.durationMs).weight,0,'full recovery remains available after the final shot');
    }
  }
});

test('legacy top-down early accepts and lowering repeats continue exact partial poses without a second cold draw',()=>{
  for(const kind of Object.keys(tools)){
    const g=fixture(kind);let now=100000;assert.equal(g.fireSecondary(now,{x:1,y:0}),true);
    for(const gap of [20,20,TOOL_ACTION_TIMING[kind].holdMs+30]){
      const old=structuredClone(g.player.attackVisual),prior=sampleToolActionMotion(old,gap);assert.ok(prior.weight>0);
      now+=gap;g.player.attackReadyAt=0;g.toolReadyAt=0;assert.equal(g.fireSecondary(now,{x:1,y:0}),true);
      const record=g.player.attackVisual;assert.deepEqual(values(sampleToolActionMotion(record,0)),values(prior));
      let weight=prior.weight;for(let ms=0;ms<=70;ms+=5){const next=sampleToolActionMotion(record,ms);assert.ok(next.weight>=weight-1e-12,kind+' partial entry must rise monotonically toward ready');weight=next.weight;}
      assert.equal(weight,1);
      assert.equal(sampleToolActionMotion(record,record.durationMs).weight,0);
    }
  }
});

test('legacy top-down cold v1 draw stays cold while rapid Sweep continuation retains its raised blend',()=>{
  for(const kind of Object.keys(tools)){
    const g=fixture(kind,true);assert.equal(g.fireSecondary(100000,{x:1,y:0}),true);
    const cold=g.player.attackVisual;assert.deepEqual(cold.toolMotion.entry,[0,0,0,0,0]);assert.equal(sampleToolActionMotion(cold,0).weight,0);assert.ok(sampleToolActionMotion(cold,20).weight<1);
  }
  const g=fixture('great-sweep',true);assert.equal(g.fireSecondary(100000,{x:1,y:0}),true);assert.equal(g.fireSecondary(g.toolReadyAt,{x:1,y:0}),true);
  const continued=g.player.attackVisual;assert.equal(continued.toolMotion.direction,-1);for(let ms=0;ms<=70;ms+=5)assert.equal(sampleToolActionMotion(continued,ms).weight,1);
});
