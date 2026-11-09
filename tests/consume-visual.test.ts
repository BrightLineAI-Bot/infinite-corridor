import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeConsumeVisual, sampleConsumeVisual, cancelConsumeVisual, CONSUME_VISUAL_MS} from '../src/consume-visual.ts';
import {Game} from '../src/game.ts';
import {freshSave} from '../src/types.ts';
import {serializeSave, deserializeSave} from '../src/save-codec.ts';
const scope = Object.freeze({area:'overworld',areaId:'overworld:7:4:g4',levelId:'root'});
const receipt = (extra={}) => ({v:1,kind:'drink',itemKind:'restorativeDraught',acceptedLogicalMs:1000,durationMs:CONSUME_VISUAL_MS,...scope,...extra});
function freeze(q){if(q&&typeof q==='object'){for(const x of Object.values(q))freeze(x);Object.freeze(q);}return q;}
test('only truthful supported healing identities have a bounded visual receipt; normalization preserves extras',()=>{
 for(const itemKind of ['restorativeDraught','highPotion','maxPotion']){const raw=freeze(receipt({itemKind,extra:{future:[1,2]}})),copy=normalizeConsumeVisual(raw);assert.deepEqual(copy,{...raw,cancelled:false});assert.notStrictEqual(copy,raw);assert.deepEqual(raw.extra,{future:[1,2]});}
 for(const itemKind of ['ironbarkTonic','lumenPhial','clearrootAmpoule','submersible','hullShield','futurePotion'])assert.equal(normalizeConsumeVisual(receipt({itemKind})),null);
 for(const bad of [null,undefined,[],{},receipt({v:'1'}),receipt({v:0}),receipt({v:1.5}),receipt({kind:'cast'}),receipt({cancelled:'false'}),receipt({cancelReason:'future'}),receipt({durationMs:'360'}),receipt({durationMs:0}),receipt({durationMs:361})])assert.equal(normalizeConsumeVisual(bad),null);
});
test('corrupt clocks and scope fail closed without coercion or mutation',()=>{
 for(const acceptedLogicalMs of [NaN,Infinity,-1,1e12+1,'1000',null])assert.equal(normalizeConsumeVisual(receipt({acceptedLogicalMs})),null);
 for(const patch of [{area:'sea'},{areaId:''},{areaId:'x'.repeat(513)},{levelId:'root\n'},{levelId:null}])assert.equal(normalizeConsumeVisual(receipt(patch)),null);
 const raw=freeze(receipt()),out={};for(const now of [NaN,Infinity,-1,1e12+1,'1000',null,999]){assert.equal(sampleConsumeVisual(raw,now,scope,out),null);assert.equal(out.active,false);}
 for(const current of [null,{}, {...scope,areaId:'other'}, {...scope,levelId:'another'}, {...scope,area:'dungeon'}])assert.equal(sampleConsumeVisual(raw,1100,current,out),null);
 assert.equal(sampleConsumeVisual(raw,1100,scope,raw),null);assert.equal(sampleConsumeVisual(raw,1100,scope,scope),null);
});
test('entry is immediate, expiry is exclusive and reusable sampling never replays effects',()=>{
 const raw=freeze(receipt()),out={sentinel:7};for(const elapsed of [0,1,120,180,359.999]){assert.strictEqual(sampleConsumeVisual(raw,1000+elapsed,scope,out),out);assert.equal(out.active,true);assert.equal(out.elapsedMs,elapsed);assert.equal(out.phase,elapsed/360);assert.equal(out.remainingMs,360-elapsed);assert.equal(out.sentinel,7);}
 for(const now of [1360,10000]){assert.equal(sampleConsumeVisual(raw,now,scope,out),null);assert.equal(out.active,false);assert.equal(out.itemKind,'');assert.equal(out.remainingMs,0);}
 const zero=receipt({acceptedLogicalMs:0});assert.equal(sampleConsumeVisual(zero,0,scope,out).phase,0);
});
test('accepted interruptions cancel permanently and idempotently while unknown/refused events cannot alter a receipt',()=>{
 const reasons=['attack','tool','cast','charge','dodge','jump','hurt','knockdown','death','area-transition','form-change','equipment-switch','busy'];
 for(const reason of reasons){const raw=freeze(receipt({extra:{keep:true}})),stopped=cancelConsumeVisual(raw,reason);assert.equal(stopped.cancelled,true);assert.equal(stopped.cancelReason,reason);assert.deepEqual(stopped.extra,raw.extra);assert.strictEqual(cancelConsumeVisual(stopped,'hurt'),stopped);for(const now of [1000,1100,1360])assert.equal(sampleConsumeVisual(stopped,now,scope,{}),null);assert.equal(raw.cancelled,undefined);}
 const raw=freeze(receipt());for(const reason of [undefined,'refused','cooldown','contact','echo','clone'])assert.strictEqual(cancelConsumeVisual(raw,reason),raw);
});
test('future receipts survive normalization, cancellation and canonical transport but remain neutral',()=>{
 const raw=freeze({v:9,kind:'future',future:{keep:[1,2]},durationMs:'opaque'}),copy=normalizeConsumeVisual(raw);assert.deepEqual(copy,raw);assert.notStrictEqual(copy,raw);assert.strictEqual(cancelConsumeVisual(raw,'attack'),raw);assert.equal(sampleConsumeVisual(raw,1000,scope,{}),null);
 const s=freshSave();s.session.playerRuntime.consumeVisual=raw;assert.deepEqual(deserializeSave(serializeSave(s)).session.playerRuntime.consumeVisual,raw);
});
test('existing Game logical clock and canonical unknown-field transport preserve phase across pause and reload',()=>{
 const s=freshSave();s.seed='DRINK-HELPER-CLOCK';const g=new Game(s,1000),raw=freeze(receipt({...scope,extra:{keep:true}}));
 // This module is unwired: retain the additive payload as unknown runtime data, and
 // use the existing authoritative clock without claiming Game consumes the receipt.
 g.save.session.playerRuntime.consumeVisual=raw;g.setPaused(true,1120);
 const snapshot=g.exportSnapshot(50000),restored=new Game(deserializeSave(serializeSave(snapshot)),900000),out={};
 assert.equal(restored.paused,true);const logical=restored.pauseStarted-(restored.presentationPausedMs||0);
 assert.equal(sampleConsumeVisual(restored.save.session.playerRuntime.consumeVisual,logical,scope,out).elapsedMs,120);
 restored.setPaused(false,950000);const resumed=950000-(restored.presentationPausedMs||0);
 assert.equal(sampleConsumeVisual(restored.save.session.playerRuntime.consumeVisual,resumed,scope,out).elapsedMs,120);
 assert.equal(sampleConsumeVisual(raw,resumed+239,scope,out).elapsedMs,359);assert.equal(sampleConsumeVisual(raw,resumed+240,scope,out),null);
 assert.deepEqual(restored.save.session.playerRuntime.consumeVisual,raw);
});
