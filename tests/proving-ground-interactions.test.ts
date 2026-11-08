import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture, describeLabInteraction, dispatchLabInteraction } from '../src/proving-ground-labs.ts';

function fixture(actions=['enter']) {
  const object={id:'keep-exit',kind:'exit',name:'Keep threshold',lore:'A road continues beyond.',x:4,y:5,actions};
  const game:any={map:{objects:[object]},save:{},player:{x:4,y:5},area:'overworld',rx:0,ry:0,calls:[],reachOf(q:any){return Math.hypot(q.x-this.player.x,q.y-this.player.y)},areaStateId(){return `${this.area}:${this.rx}:${this.ry}`},interact(action:string,id:string){this.calls.push([action,id]);return {ok:true,message:'done'}}};
  return {game,object};
}

test('chooser describes canonical actions and dispatches only the explicit choice',()=>{
  const {game}=fixture(['enter','bypass']);
  const token=describeLabInteraction(game,'keep-exit');
  assert.deepEqual(token.actions.map((q:any)=>[q.id,q.label]),[['enter','Enter'],['bypass','Bypass']]);
  assert.deepEqual(game.calls,[],'describing never auto-enters or selects the first action');
  assert.deepEqual(dispatchLabInteraction(token,'enter'),{ok:true,message:'done'});
  assert.deepEqual(game.calls,[['enter','keep-exit']]);
});

test('actual baseline keep can leave, request re-entry, and dispatch the explicit choice',()=>{
  const fixture=createLabFixture({lab:'close-view',scenario:'routing-keep-baseline',seed:'PG-CHOOSER',variant:0,now:1000});
  const game:any=fixture.game,exit=game.map.objects.find((q:any)=>q.id==='building-exit');
  game.player.x=exit.x;game.player.y=exit.y;
  assert.equal(game.interact(null,exit.id).ok,true);assert.equal(game.area,'overworld');
  const entrance=game.map.objects.find((q:any)=>(q.actions||[]).includes('enter')&&q.dungeonId);
  game.player.x=entrance.x;game.player.y=entrance.y;
  assert.equal(game.interact(null,entrance.id).ok,true);assert.equal(game.interactionRequested,entrance.id);assert.equal(game.area,'overworld');
  const token=describeLabInteraction(game,game.interactionRequested);
  assert.ok(token.actions.some((q:any)=>q.id==='enter'));
  assert.equal(dispatchLabInteraction(token,'enter').ok,true);assert.equal(game.area,'dungeon');
});

test('chooser rejects every stale context without finding a nearby substitute',()=>{
  for(const mutate of [
    ({game}:any)=>game.map={objects:game.map.objects},
    ({game}:any)=>game.rx=1,
    ({game,object}:any)=>game.map.objects=[{...object}],
    ({game}:any)=>game.player.x=20,
    ({object}:any)=>object.actions=['exit'],
  ]){
    const f=fixture();const token=describeLabInteraction(f.game,'keep-exit');mutate(f);
    const result=dispatchLabInteraction(token,'enter');
    assert.equal(result.ok,false);assert.equal(result.stale,true);assert.deepEqual(f.game.calls,[]);
  }
});

test('main-game-only controllers are disabled and direct requests are consumed honestly',()=>{
  const unsupported=fixture(['trade']);
  const token=describeLabInteraction(unsupported.game,'keep-exit');
  assert.equal(token.actions[0].unsupported,true);
  assert.equal(dispatchLabInteraction(token,'trade').unsupported,true);assert.deepEqual(unsupported.game.calls,[]);

  const direct=fixture(['speak']);
  direct.game.interact=function(action:string,id:string){this.calls.push([action,id]);this.shopRequested=id;return {ok:true,message:'shop'}};
  const result=dispatchLabInteraction(describeLabInteraction(direct.game,'keep-exit'),'speak');
  assert.equal(result.unsupported,true);assert.equal(direct.game.shopRequested,null);assert.deepEqual(direct.game.calls,[['speak','keep-exit']]);
});

test('production PG modal owns one frozen-clock pause and does not tick a zero update',async()=>{
  const source=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../src/proving-ground.ts',import.meta.url),'utf8'));
  assert.match(source,/setPaused\(true,Number\.isFinite\(game\.lastUpdateNow\)\?game\.lastUpdateNow:performance\.now\(\)\)/);
  assert.match(source,/closingGame\.setPaused\(false,performance\.now\(\)\)/);
  assert.doesNotMatch(source,/game\.update\(0/);
  assert.match(source,/interactionNonce\+\+;const result=dispatchLabInteraction/,'old handlers are consumed before dispatch');
  assert.match(source,/if\(!interactionDialog\.open\)input\.update/,'held input is not sampled behind the modal');
});
