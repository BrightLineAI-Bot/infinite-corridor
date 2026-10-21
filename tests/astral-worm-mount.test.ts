import test from 'node:test';
import assert from 'node:assert/strict';
import { ASTRAL_MOUNT, mountAstralWalker, syncAstralMount, dismountAstralWalker, recordAstralRiderDamage, astralMountPresentation } from '../src/astral-worm-mount.ts';

function fixture() {
  const owner = { id:'worm-1', kind:'astralWorm', x:4, y:5, hp:900, maxHp:1400, astral:{form:'worm'} };
  const rider = { id:'walker-1', kind:'voidWalker', x:4.5, y:5, hp:400, maxHp:500, flying:false, attackGap:.2 };
  const host = { alignment:'hostile', findOwner:id=>id===owner.id?owner:null, findLanding:()=>({x:3,y:5}), canLand:(_r,p)=>p.x===3&&p.y===5 };
  return {owner,rider,host};
}
const clone = value => JSON.parse(JSON.stringify(value));

test('Astral riding accepts every form, keeps both HP pools unchanged, and has no time expiry', () => {
  const {owner,rider,host}=fixture(); assert.equal(mountAstralWalker(owner,rider,host),true);
  for (const form of ['worm','pool','trample','bite','flight','griffin','mirage','rings']) {
    owner.astral.form=form; owner.x+=.2; owner.y+=.3;
    for(let i=0;i<600;i++) assert.equal(syncAstralMount(rider,host),true);
    assert.equal(rider.x,owner.x); assert.equal(rider.y,owner.y);
    assert.equal(astralMountPresentation(rider).form,form);
  }
  assert.deepEqual([owner.hp,owner.maxHp,rider.hp,rider.maxHp],[900,1400,400,500]);
  assert.equal(rider.flying,false); assert.equal(rider.attackGap,.2); assert.equal(rider.untargetable,undefined);
  assert.equal(owner.untargetable,undefined); assert.equal(rider.astralMount.damageTaken,0);
});

test('Astral knockoff accumulates only supplied actual damage and never alters HP or refreshes on duplicate mount', () => {
  const {owner,rider,host}=fixture(); mountAstralWalker(owner,rider,host);
  assert.equal(rider.astralMount.knockoffDamage,500*ASTRAL_MOUNT.knockoffHpShare);
  for(const amount of [0,-1,NaN,Infinity]) assert.equal(recordAstralRiderDamage(rider,amount,{playerInflicted:true},host),false);
  rider.hp-=35; assert.equal(recordAstralRiderDamage(rider,35,{playerInflicted:true},host),false);
  assert.equal(mountAstralWalker(owner,rider,host),false); assert.equal(rider.astralMount.damageTaken,35);
  // Damage/heal/damage cannot hide the accumulated damage behind a net HP comparison.
  rider.hp+=20; rider.hp-=64; assert.equal(recordAstralRiderDamage(rider,64,{playerInflicted:true},host),false);
  rider.hp--; assert.equal(recordAstralRiderDamage(rider,1,{playerInflicted:true},host),true);
  assert.equal(rider.hp,320); assert.equal(rider.maxHp,500); assert.equal(owner.hp,900);
  assert.equal(rider.astralMount.status,'dismounted'); assert.equal(rider.astralMount.reason,'damage');
  assert.deepEqual([rider.x,rider.y],[3,5]); assert.equal(astralMountPresentation(rider),null);
});

test('ordinary per-actor pierce and splash hit filtering can damage both without paired immunity or merged health', () => {
  for(const kind of ['pierce','splash']) {
    const {owner,rider,host}=fixture(); mountAstralWalker(owner,rider,host);
    // Simulated ordinary hit filtering, not a claim of production hit-loop integration.
    for(const e of [owner,rider]) {
      if(e.untargetable||e.dead||Math.hypot(e.x-owner.x,e.y-owner.y)>.5)continue;
      const before=e.hp; e.hp=Math.max(0,e.hp-25);
      if(e===rider)recordAstralRiderDamage(e,before-e.hp,{playerInflicted:true},host);
    }
    assert.equal(owner.hp,875,kind); assert.equal(rider.hp,375,kind);
    assert.equal(rider.astralMount.damageTaken,25); assert.equal(rider.astralMount.status,'mounted');
  }
});

test('safe dismount restores independent positioning, does not change combat fields, and permits an explicit later remount', () => {
  const {owner,rider,host}=fixture(); mountAstralWalker(owner,rider,host);
  assert.equal(dismountAstralWalker(rider,'voluntary',host),true);
  rider.x=2; owner.x=8; assert.equal(syncAstralMount(rider,host),false); assert.equal(rider.x,2);
  rider.attackGap-=.1; assert.equal(rider.attackGap,.1); assert.equal(rider.hp,400);
  assert.equal(dismountAstralWalker(rider,'again',host),false);
  owner.x=2; assert.equal(mountAstralWalker(owner,rider,host),true);
  assert.equal(rider.astralMount.damageTaken,0);
});

test('water knockoff stays detached and pending until host confirms a valid full-footprint landing', () => {
  const {owner,rider,host}=fixture(); mountAstralWalker(owner,rider,host);
  owner.x=12; syncAstralMount(rider,host); host.canLand=()=>false;
  assert.equal(dismountAstralWalker(rider,'damage',host),false);
  assert.equal(rider.astralMount.status,'landing'); assert.equal(rider.x,12);
  owner.x=15; syncAstralMount(rider,host); assert.equal(rider.x,12);
  assert.equal(astralMountPresentation(rider).pendingLanding,true);
  assert.equal(astralMountPresentation(rider).riding,false); assert.equal(rider.untargetable,undefined);
  host.canLand=()=>true; syncAstralMount(rider,host);
  assert.equal(rider.astralMount.status,'dismounted'); assert.deepEqual([rider.x,rider.y],[3,5]);
});

test('invalid, missing or unvalidated landing coordinates never move the rider onto guessed terrain', () => {
  for(const candidate of [null,{x:NaN,y:3},{x:Infinity,y:3},{y:3}]) {
    const {owner,rider,host}=fixture(); mountAstralWalker(owner,rider,host);
    host.findLanding=()=>candidate; assert.equal(dismountAstralWalker(rider,'voluntary',host),false);
    assert.deepEqual([rider.x,rider.y],[4,5]); assert.equal(rider.astralMount.status,'landing');
  }
  const {owner,rider,host}=fixture(); mountAstralWalker(owner,rider,host); delete host.canLand;
  assert.equal(dismountAstralWalker(rider,'voluntary',host),false); assert.equal(rider.x,4);
});

test('owner death, owner disappearance, owner retreat and rider retreat detach without healing either actor', () => {
  for(const reason of ['owner-dead','owner-missing','owner-retreat','rider-retreat']) {
    const {owner,rider,host}=fixture(); mountAstralWalker(owner,rider,host);
    if(reason==='owner-dead')owner.hp=0;
    if(reason==='owner-missing')host.findOwner=()=>null;
    if(reason==='owner-retreat')owner.retreating=true;
    if(reason==='rider-retreat')rider.fleeTo={x:1,y:1};
    assert.equal(syncAstralMount(rider,host),false);
    assert.equal(rider.astralMount.reason,reason); assert.equal(rider.astralMount.status,'dismounted');
    assert.equal(rider.hp,400); assert.equal(owner.hp,reason==='owner-dead'?0:900);
  }
});

test('dead rider detaches without a landing call or resurrection even while a landing is pending', () => {
  for(const pending of [false,true]) {
    const {owner,rider,host}=fixture(); mountAstralWalker(owner,rider,host);
    if(pending){host.canLand=()=>false;dismountAstralWalker(rider,'damage',host);}
    host.findLanding=()=>{throw new Error('A corpse does not request a safe landing');}; rider.hp=0;
    syncAstralMount(rider,host); assert.equal(rider.astralMount.status,'dismounted');
    assert.equal(rider.astralMount.reason,'rider-dead'); assert.equal(rider.hp,0); assert.equal(owner.hp,900);
  }
});

test('pause and unload preserve exact mounted and pending-landing JSON, then deterministic resume survives serialization', () => {
  for(const suspension of ['paused','unloaded']) for(const pending of [false,true]) {
    const {owner,rider,host}=fixture(); mountAstralWalker(owner,rider,host); recordAstralRiderDamage(rider,37,{playerInflicted:true},host);
    if(pending){host.canLand=()=>false;dismountAstralWalker(rider,'voluntary',host);}
    host[suspension]=true; const before=JSON.stringify(rider); owner.x=9;
    syncAstralMount(rider,host); recordAstralRiderDamage(rider,100,{playerInflicted:true},host); dismountAstralWalker(rider,'pause',host);
    assert.equal(JSON.stringify(rider),before);
    const restored=clone(rider); host[suspension]=false; host.canLand=()=>true;
    syncAstralMount(rider,host); syncAstralMount(restored,host); assert.deepEqual(restored,rider);
    if(!pending){recordAstralRiderDamage(rider,63,{playerInflicted:true},host);recordAstralRiderDamage(restored,63,{playerInflicted:true},host);assert.deepEqual(restored,rider);}
  }
});

test('mount rejects invalid actors, excessive reach, denied host attachment, retreat, and suspended worlds', () => {
  for(const mutate of [f=>f.owner.hp=0,f=>f.rider.dead=true,f=>f.owner.kind='astralMirage',f=>f.rider.kind='goblin',
    f=>f.rider.x=100,f=>f.owner.x=NaN,f=>f.rider.maxHp=0,f=>f.owner.retreating=true,f=>f.host.paused=true,
    f=>f.host.unloaded=true,f=>f.host.canMount=()=>false]) {
    const f=fixture();mutate(f);assert.equal(mountAstralWalker(f.owner,f.rider,f.host),false);assert.equal(f.rider.astralMount,undefined);
  }
});


test('only hostile pairs may mount; allied helpers and unverified pair alignment never mount', () => {
  for(const alignment of [undefined,'ally','neutral']) {
    const {owner,rider,host}=fixture();host.alignment=alignment;
    assert.equal(mountAstralWalker(owner,rider,host),false);assert.equal(rider.astralMount,undefined);
  }
  const {owner,rider,host}=fixture();rider.astralAllyOf=owner.id;
  assert.equal(mountAstralWalker(owner,rider,host),false);
});

test('owner, environmental, allied and unattributed damage cannot count toward player knockoff', () => {
  const {owner,rider,host}=fixture();mountAstralWalker(owner,rider,host);
  owner.hp-=200;
  for(const source of [undefined,{}, {playerInflicted:false}, {kind:'environment'}, {kind:'ally'}, {kind:'player'}]) {
    rider.hp-=1;assert.equal(recordAstralRiderDamage(rider,1,source,host),false);
  }
  assert.equal(rider.astralMount.damageTaken,0);assert.equal(rider.astralMount.status,'mounted');
  assert.equal(owner.hp,700);assert.equal(rider.hp,394);
  rider.hp-=100;assert.equal(recordAstralRiderDamage(rider,100,{playerInflicted:true},host),true);
  assert.equal(rider.astralMount.status,'dismounted');assert.equal(rider.hp,294);
});


test('mount presentation follows form-specific seat height and scaled flight altitude without changing collision coordinates', () => {
  const {owner,rider,host}=fixture();owner.scale=1.5;mountAstralWalker(owner,rider,host);
  for(const [form,lift] of [['worm',.3],['pool',.18],['griffin',.45],['flight',1.5]]) {
    owner.astral.form=form;syncAstralMount(rider,host);
    assert.ok(Math.abs(astralMountPresentation(rider).lift-lift)<1e-9);
    assert.equal(rider.astralMount.ownerScale,1.5);assert.deepEqual([rider.x,rider.y],[owner.x,owner.y]);
  }
  const restored=clone(rider);assert.deepEqual(astralMountPresentation(restored),astralMountPresentation(rider));
});
