import test from 'node:test';
import assert from 'node:assert/strict';
import { cleaverWitness, closeViewWitness, doorWayfindingWitness, hasQuickCleaverMarker, mainHudCompassWitness, overworldManualArrowWitness, seedOverworldManualJourney, movementKey, routePanelWitness, summitWitness } from './close-view-witness.mjs';
import { waitForBrowserScene, navigationObservation } from './resources.mjs';

test('crawl movement maps the desired world heading to the camera-relative keys', () => {
  assert.equal(movementKey(-Math.PI / 2, 1, 0), 'd');
  assert.equal(movementKey(Math.PI, 1, 0), 's');
  assert.equal(movementKey(Math.PI / 2, 0, 1), 'w');
  assert.equal(movementKey(NaN, 1, 0), null);
});

test('quick Cleaver selection requires the exact emitted timing marker',()=>{
  assert.equal(hasQuickCleaverMarker('cleaverQuick:Object.freeze({durationMs:260,contactMs:75})'),true);
  assert.equal(hasQuickCleaverMarker('cleaver:Object.freeze({durationMs:260,contactMs:75})'),false);
  assert.equal(hasQuickCleaverMarker('cleaverQuick:Object.freeze({durationMs:360,contactMs:75})'),false);
  assert.equal(hasQuickCleaverMarker('cleaverQuick:Object.freeze({durationMs:260,contactMs:60})'),false);
});

test('Cleaver evidence preserves the legacy newly accepted first cut witness', async () => {
  const attack = { weapon: 'verge-cleaver', motionVersion:2, step: 1, acceptedAt: 42, contactMs: 75, durationMs: 360 };
  const input = [], samples = [{}, {}, attack];
  const result = await cleaverWitness({
    call: async (method, args) => input.push([method, args.key, args.type]),
    evaluate: async () => samples.shift(),
    wait: async () => {},
    capture: async name => name,
  });
  assert.equal(result.status, 'observed');
  assert.deepEqual(input, [['Input.dispatchKeyEvent', 'j', 'keyDown'], ['Input.dispatchKeyEvent', 'j', 'keyUp']]);
  assert.deepEqual(result.screenshots, ['before-attack', 'after-accepted-attack']);
  const stale = await cleaverWitness({
    call: async () => {}, evaluate: async () => attack, wait: async () => {}, capture: async name => name,
  });
  assert.equal(stale.status, 'blocked');
  assert.deepEqual(stale.screenshots, ['before-attack']);
});

test('quick Cleaver evidence requires three exact advancing cuts from normal Attack input', async () => {
  const states=[{}];
  for(let step=1;step<=3;step++){
    const accepted={weapon:'verge-cleaver',motionVersion:3,step,meleeVersion:2,
      acceptedAt:1000+step*420,contactMs:75,durationMs:260,pending:true};
    states.push(accepted,{...accepted,pending:false,contactAt:accepted.acceptedAt+75},{...accepted,pending:false,contactAt:accepted.acceptedAt+75});
  }
  const input=[], waits=[];
  const result=await cleaverWitness({
    call:async(method,args)=>input.push([method,args.key,args.type]),
    evaluate:async()=>states.shift()??{},wait:async ms=>waits.push(ms),capture:async name=>name,
  });
  assert.equal(result.status,'observed');
  assert.equal(result.mode,'quick-three-cut');
  assert.deepEqual(result.cuts.map(c=>c.accepted.step),[1,2,3]);
  assert.ok(result.cuts.every(c=>c.contactObserved&&c.recoveryObserved));
  assert.equal(input.filter(([,key,type])=>key==='j'&&type==='keyDown').length,3);
  assert.deepEqual(result.screenshots,[
    'before-attack','cut-1-startup','cut-1-contact','cut-1-recovery',
    'cut-2-startup','cut-2-contact','cut-2-recovery',
    'cut-3-startup','cut-3-contact','cut-3-recovery',
  ]);
  assert.equal(waits.filter(ms=>ms===240).length,2);
  assert.equal(result.remainingVisualLimitations.length,2);
});

test('quick Cleaver evidence blocks a repeated or inexact cut stage', async () => {
  const accepted={weapon:'verge-cleaver',motionVersion:3,step:1,meleeVersion:2,
    acceptedAt:1420,contactMs:75,durationMs:260,pending:true};
  const states=[{},accepted,{...accepted,pending:false,contactAt:1495},{...accepted,pending:false,contactAt:1495},
    {...accepted,acceptedAt:1840}];
  const result=await cleaverWitness({call:async()=>{},evaluate:async()=>states.shift()??{},
    wait:async()=>{},capture:async name=>name});
  assert.equal(result.status,'blocked');
  assert.deepEqual(result.cuts.map(c=>[c.cut,c.accepted.step,c.exact]),[[1,1,true],[2,1,false]]);
});

test('quick Cleaver evidence blocks labels without an observed contact transition', async () => {
  const accepted={weapon:'verge-cleaver',motionVersion:3,step:1,meleeVersion:2,
    acceptedAt:1420,contactMs:75,durationMs:260,pending:true};
  const states=[{},accepted,...Array.from({length:4},()=>({...accepted}))];
  const captures=[];
  const result=await cleaverWitness({call:async()=>{},evaluate:async()=>states.shift()??accepted,
    wait:async()=>{},capture:async name=>(captures.push(name),name)});
  assert.equal(result.status,'blocked');
  assert.equal(result.cuts[0].contactObserved,false);
  assert.deepEqual(captures,['before-attack','cut-1-startup']);
});

test('a failed public teleport is blocked instead of producing a landing receipt', async () => {
  const start = { x: 2, y: 3, yaw: 0, hp: 60, area: 'keep' };
  const crawl = { approach: { x: 8, y: 9 }, path: [], returnSteps: 12 };
  const results = [start, crawl, start];
  const witness = await closeViewWitness('routing-crawl-keep', {
    evaluate: async () => results.shift(),
    call: async () => assert.fail('no movement input before teleport verification'),
    wait: async () => {},
    capture: async () => assert.fail('no approach or landing screenshot before teleport verification'),
  });
  assert.equal(witness.status, 'blocked');
  assert.match(witness.reason, /did not arrive/);
});

test('route panel witnesses current-floor cues and requires the Pentagon overview', async () => {
  const state = { open: true, current: 'You are here: a chamber', routes: [], headings: [] };
  const capture = async name => name;
  const check = (scenario, report) => routePanelWitness(scenario, { evaluate: async () => report, capture });
  assert.equal(await check('routing-crawl-keep', null), null);
  assert.equal((await check('routing-crawl-keep', state)).status, 'observed');
  assert.equal((await check('routing-crawl-pentagon', state)).status, 'blocked');
  const headings = ['Discovered chambers (1)', 'Mapped connections (0)'];
  const result = await check('routing-crawl-pentagon', { ...state, headings });
  assert.equal(result.status, 'observed');
  assert.deepEqual(result.screenshots, ['known-routes']);
});

test('door wayfinding uses the public route panel and requires its numbered pressed diagnostic', async () => {
  const states = [
    { area:'cube:f2', enabled:true, doors:[{id:'cube:f2::door-a'},{id:'cube:f2::door-b'}], scenario:'cube-doors', scratch:true },
    { available:true,target:'lab-stair-0-down' },
    { area:'cube:f2', enabled:true, doors:[{id:'cube:f2::door-a'},{id:'cube:f2::door-b'},{id:'cube:f2::door-c'},{id:'cube:f2::door-d'}], scenario:'cube-doors', scratch:true },
    true,
    { open:true, label:'Add waypoint for DOOR at 4, 5', pressed:'false', doorId:'cube:f2::door-a' },
    true,
    { open:true, label:'Remove waypoint for DOOR at 4, 5', pressed:'true', door:{id:'cube:f2::door-a',slot:1} },
    { selected:[{id:'cube:f2::door-a',slot:1},{id:'cube:f2::door-b',slot:2},{id:'cube:f2::door-c',slot:3}],
      pressed:['cube:f2::door-a','cube:f2::door-b','cube:f2::door-c'],capDisabled:true },
    { available:false },
  ];
  const result=await doorWayfindingWitness('cube-doors',{
    evaluate:async()=>states.shift(), call:async()=>assert.fail('Act is not sent without a public door teleport'),
    wait:async()=>{}, capture:async name=>name,
  });
  assert.equal(result.status,'observed');
  assert.deepEqual(result.screenshots,['routes-before-waypoint','routes-selected-waypoint','routes-three-waypoints']);
  assert.deepEqual(result.discovery,{available:true,target:'lab-stair-0-down',revealed:4});
  assert.equal(result.threePoints.observed,true);
  assert.deepEqual(result.remainingVisualRequirement,[]);
  assert.equal(result.compassTrueNorth.status,'not-evaluated-here');
  const blocked=await doorWayfindingWitness('terrain-pentagon',{
    evaluate:async()=>({area:'pentagon',enabled:true,doors:[],scenario:'terrain-pentagon',scratch:true}),
    call:async()=>{},wait:async()=>{},capture:async()=>assert.fail('no screenshot without doors'),
  });
  assert.equal(blocked.status,'blocked');
});

test('normal-game north compass stays in world coordinates after a real camera drag', async () => {
  const states=[
    {area:'cube:f2',seed:'R13',slot:3,cleared:3,sourceWaypoints:3},
    {label:'True north',hidden:false,north:true,transform:'rotate(0deg)',yaw:-Math.PI/2,valid:true,canvas:{left:0,top:0,width:768,height:540}},
    {label:'True north',hidden:false,north:true,transform:'rotate(90deg)',yaw:-Math.PI,valid:true},
  ],calls=[],navigations=[];
  const result=await mainHudCompassWitness({
    evaluate:async()=>states.shift(),navigate:async url=>navigations.push(url),wait:async()=>{},capture:async name=>name,
    call:async(method,args)=>calls.push([method,args.type,args.x,args.y]),releaseUrl:'http://127.0.0.1/__release__/',
  });
  assert.equal(result.status,'observed');
  assert.equal(result.yawChanged,true);assert.equal(result.northInvariant,true);
  assert.deepEqual(navigations,['http://127.0.0.1/__release__/']);
  assert.deepEqual(calls.map(q=>q.slice(0,2)),[['Input.dispatchMouseEvent','mousePressed'],['Input.dispatchMouseEvent','mouseMoved'],['Input.dispatchMouseEvent','mouseReleased']]);
  assert.deepEqual(result.screenshots,['hud-true-north-before-drag','hud-true-north-after-drag']);
});

test('r869 Overworld Close View manual arrow keeps its east world bearing after camera drag', async () => {
  const seeded={slot:2,seed:'R13',from:{rx:0,ry:0},target:{rx:1,ry:0},bearingDegrees:0,overworldCloseView:true};
  assert.deepEqual(await seedOverworldManualJourney({evaluate:async expression=>expression.includes('structuredClone')?seeded:null}),seeded);
  const states=[undefined,
    {label:'Manual waypoint: Render preflight east, 1 section east',compassHidden:false,arrowHidden:false,dormant:false,arrived:false,transform:'rotate(90deg)',yaw:-Math.PI/2,valid:true,canvas:{left:0,top:0,width:768,height:540}},
    {label:'Manual waypoint: Render preflight east, 1 section east',compassHidden:false,arrowHidden:false,dormant:false,arrived:false,transform:'rotate(180deg)',yaw:-Math.PI,valid:true},
  ],calls=[];
  const result=await overworldManualArrowWitness({seeded,releaseUrl:'http://127.0.0.1/__release__/',
    evaluate:async()=>states.shift(),navigate:async()=>{},wait:async()=>{},capture:async name=>name,
    call:async(method,args)=>calls.push([method,args.type])});
  assert.equal(result.status,'observed');assert.equal(result.yawChanged,true);assert.equal(result.bearingStable,true);
  assert.deepEqual(calls,[['Input.dispatchMouseEvent','mousePressed'],['Input.dispatchMouseEvent','mouseMoved'],['Input.dispatchMouseEvent','mouseReleased']]);
  assert.deepEqual(result.screenshots,['overworld-manual-east-before-drag','overworld-manual-east-after-drag']);
});

test('summit staging accepts real Act admission only to a fresh cloud encounter with a distinct target', async () => {
  const from = { rx: 38, ry: 18 }, to = { rx: 37, ry: 15 };
  const before = { scratch: true, area: 'overworld', section: from, gate: 'cloud' };
  const after = { scratch: true, area: 'dungeon', wave: 0, alive: 4, route: { from, to } };
  const input = [];
  const check = (state) => {
    const states = [before, state];
    return summitWitness({
      evaluate: async () => states.shift(), capture: async name => name, wait: async () => {},
      call: async (method, args) => input.push([method, args.key, args.type]),
    });
  };
  const result = await check(after);
  assert.equal(result.status, 'observed');
  assert.deepEqual(result.screenshots, ['summit-gate', 'cloud-hold-entry']);
  assert.deepEqual(input, [['Input.dispatchKeyEvent', 'e', 'keyDown'], ['Input.dispatchKeyEvent', 'e', 'keyUp']]);
  assert.equal((await check({ ...after, route: { from, to: from } })).status, 'blocked');
  assert.equal((await check({ ...after, alive: 0 })).status, 'blocked');
});

test('readiness waits for a loading scene but stops on the first browser transport failure', async () => {
  let clock = 0, calls = 0;
  const timing = { budgetMs: 250, now: () => clock, delay: async ms => { clock += ms; } };
  assert.equal(await waitForBrowserScene(async () => ++calls === 3, timing), true);
  clock = calls = 0;
  await assert.rejects(waitForBrowserScene(async () => {
    calls++;
    throw Error('CDP timeout: Runtime.evaluate');
  }, timing), /CDP timeout/);
  assert.equal(calls, 1);
  assert.equal(clock, 0);
});

test('navigation readiness ties buffered events to the new loader and live default context', () => {
  const event = (method, params, sessionId = 'target') => ({ method, params, sessionId });
  const events = [
    event('Page.frameNavigated', { frame: { id: 'main', loaderId: 'old' } }),
    event('Runtime.executionContextCreated', { context: { id: 1, auxData: { frameId: 'main', isDefault: true } } }),
    event('Page.lifecycleEvent', { frameId: 'main', loaderId: 'old', name: 'DOMContentLoaded' }),
    event('Runtime.executionContextsCleared', {}),
    event('Page.frameNavigated', { frame: { id: 'main', loaderId: 'next' } }),
    event('Runtime.executionContextCreated', { context: { id: 2, auxData: { frameId: 'main', isDefault: false } } }),
    event('Runtime.executionContextCreated', { context: { id: 3, auxData: { frameId: 'main', isDefault: true } } }),
    event('Page.lifecycleEvent', { frameId: 'main', loaderId: 'next', name: 'DOMContentLoaded' }),
    event('Network.loadingFailed', {}, 'other-tab'),
  ];
  const observe = () => navigationObservation(events, 'target', { frameId: 'main', loaderId: 'next' });
  assert.deepEqual(observe(), { committed: true, domReady: true, contextId: 3, failedRequests: 0, exceptions: 0 });
  events.push(event('Runtime.executionContextDestroyed', { executionContextId: 3 }), event('Network.loadingFailed', {}));
  assert.equal(observe().contextId, undefined);
  assert.equal(observe().failedRequests, 1);
});
