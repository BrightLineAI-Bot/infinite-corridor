import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { createCombatant } from '../src/combat.ts';
import { updateEffects, Game } from '../src/game.ts';
import { migrateSave } from '../src/types.ts';
import { GOLEM, golemPresentation, drawToolForms } from '../src/tool-forms.ts';
import { CLOSE_VIEW_COMPANION_MODELS } from '../src/close-view-companion-models.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelTriangleCount, writeCloseViewModel } from '../src/close-view-models.ts';
function fixture(){const {game:g}=createLabFixture({lab:'creature-assets',scenario:'corridor-golem',now:100000});assert.ok(g.golem);g.enemies=[];return g;}
function foe(id,x,y){return Object.assign(createCombatant('rootBrute',x,y),{id,hp:100000,maxHp:100000});}
function mesh(p,reduceMotion){const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),n=writeCloseViewModel(out,0,{...p,z:p.lift,phase:0,reduceMotion});assert.equal(n/MODEL_FLOATS,528);assert.ok(out.slice(0,n).every(Number.isFinite));return Array.from(out.slice(0,n)).filter((_,i)=>i%MODEL_FLOATS<3);}
test('actual Hammerfall Golem retains three blows, one living target and radius multihits',()=>{
 const g=fixture(),q=g.golem,start=q.start,ready=g.golemReadyAt;const a=foe('held',q.x+.3,q.y),b=foe('nearby',q.x+.6,q.y);g.enemies=[a,b];
 assert.equal(golemPresentation(q,start-1),null);assert.equal(golemPresentation(q,start).alpha,0);assert.ok(golemPresentation(q,start+GOLEM.rise*500).lift<0);
 g.tickGolem(q.nextAt-1);assert.equal(q.punches,3);
 for(let i=0;i<3;i++){
  const at=q.nextAt;g.tickGolem(at);assert.equal(q.punchAt,at);assert.equal(q.nextAt,at+GOLEM.gap*1000);assert.equal(q.punches,2-i);assert.equal(q.targetId,a.id);
  const fx=g.effects.at(-1);assert.equal(fx.kind,'golem-punch');assert.equal(fx.glyphHost,'tool');assert.equal(fx.radius,GOLEM.radius);const hp=[a.hp,b.hp];updateEffects([fx],g.enemies,.01);assert.ok(a.hp<hp[0]&&b.hp<hp[1]);
 }
 assert.equal(g.effects.filter(e=>e.kind==='golem-punch').length,3);assert.equal(g.golemReadyAt,ready);
 g.tickGolem(q.nextAt);assert.ok(q.sinkAt);assert.equal(q.start,start);assert.ok(golemPresentation(q,q.sinkAt+GOLEM.sink*500).lift<0);g.tickGolem(q.sinkAt+GOLEM.sink*1000);assert.equal(g.golem,null);
});
test('real retarget and reposition stay immediate; event-derived alternating fists recover continuously in both motion modes',()=>{
 const g=fixture(),q=g.golem,a=foe('first',q.x+.5,q.y),b=foe('second',q.x+1,q.y+.3);g.enemies=[a,b];
 g.tickGolem(q.nextAt);const at=q.punchAt,p0=golemPresentation(q,at);assert.equal(p0.fistStep,1);assert.equal(p0.amount,0);assert.equal(p0.x,q.x);assert.equal(p0.y,q.y+.32);
 for(const reduce of [false,true]){
  const contact=mesh(p0,reduce),recover=mesh(golemPresentation(q,at+190),reduce),almost=mesh(golemPresentation(q,at+380-1e-6),reduce),idle=mesh(golemPresentation(q,at+380),reduce);
  assert.notDeepEqual(contact,recover);assert.ok(Math.max(...almost.map((v,i)=>Math.abs(v-idle[i])))<1e-5);
  assert.ok(Math.abs(Math.min(...idle.filter((_,i)=>i%3===2)))<1e-6,'planted feet reach support');
 }
 assert.equal(golemPresentation(q,at+380).pose,'idle');a.dead=true;g.tickGolem(q.nextAt);assert.equal(q.targetId,b.id);assert.equal(golemPresentation(q,q.punchAt).fistStep,2);
 const captured=structuredClone(q);for(let i=0;i<40;i++)golemPresentation(q,q.punchAt+i*10);assert.deepEqual(q,captured);
 assert.equal(modelTriangleCount('corridorGolem'),176);assert.equal(CLOSE_VIEW_COMPANION_MODELS.corridorGolem.filter(p=>Math.abs(p.swing)===1).length,2);
});
test('paused source clocks freeze, reload cancels runtime summon and unsupported capture keeps the articulated fallback',()=>{
 const g=fixture(),q=g.golem;g.enemies=[foe('target',q.x+.4,q.y)];g.tickGolem(q.nextAt);g.lastUpdateNow=q.punchAt+40;g.setPaused(true,g.lastUpdateNow);const at=g.pauseStarted;
 const before=mesh(golemPresentation(q,at),true);g.update(.1,at+10000);assert.deepEqual(mesh(golemPresentation(q,g.pauseStarted),true),before);
 const back=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(at+10000)))),200000);assert.equal(back.golem,undefined);
 const logs=[],ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...args)=>logs.push([k,...args]),set:(o,k,v)=>(o[k]=v,true)});drawToolForms(ctx,g,p=>[p.x*32,p.y*32],32,0,{now:at,captureActor:()=>false});assert.ok(logs.filter(e=>e[0]==='arcTo').length>=16,'feet, body and head survive fallback');
});
