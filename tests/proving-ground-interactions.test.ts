import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture, describeLabInteraction, dispatchLabInteraction, createLabInteractionLifecycle } from '../src/proving-ground-labs.ts';

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
  assert.match(token.actions[0].unsupported,/main game/);
  assert.equal(dispatchLabInteraction(token,'trade').unsupported,true);assert.deepEqual(unsupported.game.calls,[]);

  const direct=fixture(['speak']);
  direct.game.interact=function(action:string,id:string){this.calls.push([action,id]);this.shopRequested=id;return {ok:true,message:'shop'}};
  const result=dispatchLabInteraction(describeLabInteraction(direct.game,'keep-exit'),'speak');
  assert.equal(result.unsupported,true);assert.equal(direct.game.shopRequested,null);assert.deepEqual(direct.game.calls,[['speak','keep-exit']]);
});

test('real Viewport Inspect is blocked before mutation while ordinary Inspect still dispatches',()=>{
  const fixture=createLabFixture({lab:'close-view',scenario:'routing-keep-baseline',seed:'PG-VIEWPORT',variant:0,now:1000});
  const game:any=fixture.game;game.rx=0;game.ry=0;game.loadArea('overworld');
  const viewport=game.map.objects.find((q:any)=>q.kind==='viewport');game.player.x=viewport.x;game.player.y=viewport.y;
  const before=game.save.viewport?.read;
  const token=describeLabInteraction(game,viewport.id);assert.match(token.actions.find((q:any)=>q.id==='inspect').unsupported,/Viewport/);
  const blocked=dispatchLabInteraction(token,'inspect');assert.equal(blocked.unsupported,true);assert.equal(game.save.viewport?.read,before);
  const ordinary=fixtureForInspect();assert.equal(dispatchLabInteraction(describeLabInteraction(ordinary.game,'marker'),'inspect').ok,true);assert.deepEqual(ordinary.game.calls,[['inspect','marker']]);
});

function fixtureForInspect(){const f=fixture(['inspect']);f.object.id='marker';f.object.kind='ruinMarker';return f}

test('interaction lifecycle closes exactly once and ignores an old generation after reopen',()=>{
  let now=100,resets=0,canResume=true;const calls:any[]=[];
  const game:any={paused:false,lastUpdateNow:40,setPaused(value:boolean,time:number){calls.push([value,time]);this.paused=value}};
  const lifecycle=createLabInteractionLifecycle({resetInput:()=>resets++,now:()=>now,canResume:()=>canResume});
  const first=lifecycle.begin(game);assert.equal(first,1);assert.deepEqual(calls,[[true,40]]);
  now=1100;assert.equal(lifecycle.close(first),true);assert.equal(lifecycle.close(first),false);assert.deepEqual(calls,[[true,40],[false,1100]]);assert.equal(resets,2);
  game.paused=false;const second=lifecycle.begin(game);assert.equal(second,2);assert.equal(lifecycle.close(first),false,'queued close from the old dialog cannot affect the new owner');assert.equal(lifecycle.active,true);
  canResume=false;assert.equal(lifecycle.close(second),true);assert.equal(game.paused,true,'a later user/background pause remains owned by that reason');
});

test('an empty canonical request is validated without acquiring modal pause ownership',()=>{
  const {game,object}=fixture([]);let pauses=0;game.setPaused=()=>pauses++;
  assert.equal(describeLabInteraction(game,object.id),null);assert.equal(pauses,0);assert.equal(game.paused,undefined);
});

test('production PG modal owns one frozen-clock pause and does not tick a zero update',async()=>{
  const source=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../src/proving-ground.ts',import.meta.url),'utf8'));
  assert.match(source,/createLabInteractionLifecycle/);
  assert.match(source,/addEventListener\("submit",event=>\{event\.preventDefault\(\);closeInteraction/);
  assert.match(source,/addEventListener\("close",/);
  assert.doesNotMatch(source,/game\.update\(0/);
  assert.match(source,/interactionNonce\+\+;const result=dispatchLabInteraction/,'old handlers are consumed before dispatch');
  assert.match(source,/if\(!interactionDialog\.open\)input\.update/,'held input is not sampled behind the modal');
});
