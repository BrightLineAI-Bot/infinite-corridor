import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.ts';
import {freshSave} from '../src/types.ts';
import {sampleConsumeVisual} from '../src/consume-visual.ts';

test('successful canonical healing drink stamps only presentation state and exports it',()=>{
  const s=freshSave();s.hp=s.session.playerRuntime.hp=10;
  const g=new Game(s,1000);g.lastUpdateNow=1120;
  assert.equal(g.useConsumable('restorativeDraught',1120),true);
  assert.equal(g.player.consumeVisual.itemKind,'restorativeDraught');
  assert.equal(g.player.consumeVisual.acceptedLogicalMs,1120);
  const out={};assert.equal(sampleConsumeVisual(g.player.consumeVisual,1120,{area:g.area,areaId:g.areaId(),levelId:String(g.map.levelId||'root')},out),out);
  assert.deepEqual(g.exportSnapshot(1200).session.playerRuntime.consumeVisual,g.player.consumeVisual);
});

test('refused drink preserves an existing receipt',()=>{
  const s=freshSave(),g=new Game(s,1000),receipt={v:9,kind:'future',opaque:true};g.player.consumeVisual=receipt;
  assert.equal(g.useConsumable('restorativeDraught',1100),false);
  assert.strictEqual(g.player.consumeVisual,receipt);
});

test('an accepted primary attack cancels a drink while a refused cooldown attack preserves it',()=>{
  const s=freshSave();s.hp=s.session.playerRuntime.hp=10;const g=new Game(s,1000);g.installSystems();
  assert.equal(g.useConsumable('restorativeDraught',1000),true);g.primaryAttack(1100,{x:1,y:0});
  assert.equal(g.player.consumeVisual.cancelled,true);assert.equal(g.player.consumeVisual.cancelReason,'attack');
  g.player.consumeVisual={...g.player.consumeVisual,cancelled:false,cancelReason:undefined};const before=g.player.consumeVisual;
  g.primaryAttack(1101,{x:1,y:0});assert.strictEqual(g.player.consumeVisual,before);
});

test('dodge cancellation follows acceptance and refused dodge keeps the receipt',()=>{
  const make=(stamina:number)=>{const s=freshSave();s.hp=s.session.playerRuntime.hp=10;s.stamina=s.session.playerRuntime.stamina=stamina;const g=new Game(s,1000);g.installSystems();g.useConsumable('restorativeDraught',1000);const used=new Set<string>();const input={state:{x:1,y:0},consume:(a:string)=>a==='dodge'&&!used.has(a)?(used.add(a),true):false,held:()=>false};return {g,input};};
  const accepted=make(50);accepted.g.update(.016,accepted.input,1100);assert.equal(accepted.g.player.consumeVisual.cancelReason,'dodge');assert.ok(accepted.g.player.dodgeUntil>1100);
  const refused=make(0),receipt=refused.g.player.consumeVisual;refused.g.update(.016,refused.input,1100);assert.strictEqual(refused.g.player.consumeVisual,receipt);assert.equal(refused.g.message,'Not enough stamina to dodge.');
});

test('direct drink resolves a real clock and active combat stamps busy without refusing healing',()=>{
  const s=freshSave();s.hp=s.session.playerRuntime.hp=10;const g=new Game(s,1000);g.lastUpdateNow=1200;g.player.attackUntil=1300;
  assert.equal(g.useConsumable('restorativeDraught'),true);assert.equal(g.player.consumeVisual.acceptedLogicalMs,1200);assert.equal(g.player.consumeVisual.cancelReason,'busy');assert.ok(g.player.hp>10);
});

test('same-frame potion then committed hostile damage cancels despite the original hpStart',()=>{
  const s=freshSave();s.hp=s.session.playerRuntime.hp=10;const g=new Game(s,1000);g.installSystems();const drink=g.drinkPotion.bind(g);
  g.drinkPotion=(now:number)=>{const ok=drink(now);assert.equal(ok,true);assert.equal(g.packHurt(null,5,{},now),true);return ok;};
  const used=new Set<string>(),input={state:{x:0,y:0},consume:(a:string)=>a==='potion'&&!used.has(a)?(used.add(a),true):false,held:()=>false};
  g.update(.016,input,1100);assert.equal(g.player.consumeVisual.cancelled,true);assert.equal(g.player.consumeVisual.cancelReason,'hurt');assert.ok(g.player.hp>10);
});
