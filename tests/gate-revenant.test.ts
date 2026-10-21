import test from 'node:test';
import assert from 'node:assert/strict';

test('Gate tuning, collision, bounds, pause and exact wraith reuse', async () => {
  const { GATE_REVENANT : G, updateGatePredator, tuneGatePredator, tickPackEffects, addPackEffect, resetGateAttack } = await import('../src/monster-pack.ts');
  function fixture(){const e={id:'gate',kind:'gateRevenant',gatePredator:true,x:0,y:0,hp:260,maxHp:260,damage:36,aggro:true};let fx=[];const hits=[];const w={dt:.05,now:0,player:{x:20,y:0},enemies:[e],effects:()=>fx,addEffect:f=>addPackEffect(fx,f,w.now),move:(q,x,y)=>{q.x+=x;q.y+=y;return true},detour:()=>{},los:()=>true,open:()=>true,tileOpen:()=>true,projectileOpen:()=>true,hurt:(o,n,info)=>hits.push({o,n,info})};return {e,w,hits,get fx(){return fx},set fx(v){fx=v}}}
  let q=fixture();for(let i=0;i<20;i++)updateGatePredator(q.e,q.w);assert(Math.abs(q.e.x-3.6)<1e-9);assert(q.e.x>2.88);
  q=fixture();q.e.glyphBaseSpeed=1.12;q.e.speedMultiplier=.56;for(let i=0;i<20;i++)updateGatePredator(q.e,q.w);assert(Math.abs(q.e.x-1.8)<1e-9);
  for(const hp of [60,120,300])for(const level of [1,8,30])for(const guard of [0,.3,.75]){const {e}=fixture();tuneGatePredator(e,{level,maxHp:hp,equipment:{},activeWeaponSlot:'primary'},{damageReduction:guard});assert(e.maxHp>=320&&e.damage>=40);const before=JSON.stringify(e);tuneGatePredator(e,{level,maxHp:hp},{});assert.equal(JSON.stringify(e),before)}
  q=fixture();q.e.hp=100;tuneGatePredator(q.e,{level:1,maxHp:60},{});assert.equal(q.e.maxHp-q.e.hp,160);
  q=fixture();q.w.player.x=5;const kinds=new Set();let peak=0;for(let i=0;i<1600;i++){q.w.now+=50;updateGatePredator(q.e,q.w);q.fx=tickPackEffects(q.fx,q.w);for(const f of q.fx)kinds.add(f.kind);peak=Math.max(peak,q.fx.length)}assert(kinds.has('voidWraith'));assert(kinds.has('gateBreath'));assert(kinds.has('orb'));assert(kinds.has('lavaBomb'));assert(peak<=48);assert(q.e.gateSequence>=6);
  const paused=JSON.stringify(q.e);q.w.dt=0;updateGatePredator(q.e,q.w);assert.equal(JSON.stringify(q.e),paused);
  q.e.dead=true;q.w.dt=.05;q.fx=tickPackEffects(q.fx,q.w);assert.equal(q.fx.length,0);
  q=fixture();q.w.player.x=3;q.w.projectileOpen=(x,y)=>x<1; q.fx=[{kind:'orb',gateOwned:true,owner:'gate',x:0,y:0,vx:100,vy:0,radius:.2,life:2,damage:5}];q.w.dt=.2;q.fx=tickPackEffects(q.fx,q.w);assert.equal(q.hits.length,0);assert.equal(q.fx.length,0);
  q=fixture();q.w.player.x=3;q.w.projectileOpen=(x,y)=>x<1;q.fx=[{kind:'gateBreath',gateOwned:true,owner:'gate',x:0,y:0,dx:1,dy:0,length:7,radius:.5,life:2,nextBite:0,damage:5}];q.fx=tickPackEffects(q.fx,q.w);assert.equal(q.hits.length,0);assert(q.fx[0].length<1);
  q=fixture();q.w.player.x=5;for(let i=0;i<48;i++)q.fx.push({kind:'web',owner:'other',life:10,radius:0,x:-10,y:-10});for(let i=0;i<100;i++)updateGatePredator(q.e,q.w);assert.equal(q.fx.length,48);assert(q.fx.every(f=>f.owner==='other'));
  q=fixture();q.w.player.x=5;q.e.gateSequence=2;for(let i=0;i<20;i++)updateGatePredator(q.e,q.w);assert.equal(q.fx.filter(f=>f.kind==='voidWraith').length,2);for(const f of q.fx){assert.equal(f.life,1.7);assert(Math.abs(Math.hypot(f.vx,f.vy)-3.4)<1e-10);assert.equal(f.nextSlash,.45)}

});

test('Gate barrage cadence and closing pursuit are frame-rate stable', async () => {
  const {updateGatePredator} = await import('../src/monster-pack.ts');
  function run(dt,playerSpeed=0){const e={id:'g',kind:'gateRevenant',gatePredator:true,x:0,y:0,aggro:true,damage:40,gateSequence:5},player={x:playerSpeed?8:5,y:0},fx=[];let count=0,min=100;const w={dt,now:0,player,enemies:[e],effects:()=>[],addEffect:f=>{fx.push(f);if(f.kind==='lavaBomb')count++},los:()=>true,open:()=>true,move:(q,dx,dy)=>{q.x+=dx;q.y+=dy;return true}};for(let t=0;t<60;t+=dt){player.x+=playerSpeed*dt;w.now=t*1000;updateGatePredator(e,w);min=Math.min(min,player.x-e.x);if(!playerSpeed&&e.gateSequence>6)break}return{count,min,gap:player.x-e.x}}
  for(const dt of [.05,1/60,1/144]){assert.equal(run(dt).count,9);for(const sp of [2.4,2.88]){const r=run(dt,sp);assert(r.min<3,JSON.stringify({dt,sp,...r}));}}
});
