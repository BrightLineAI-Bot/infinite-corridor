import test from 'node:test';
import assert from 'node:assert/strict';
import {render, rendererDiagnostics} from '../src/renderer.ts';
import {freshSave} from '../src/types.ts';
import {consumeVoidTerrain} from '../src/world-beasts.ts';
import {createCombatant} from '../src/combat.ts';
import {Game} from '../src/game.ts';
import {drawPackMonster, drawPackEffects} from '../src/monster-render.ts';
import {CRYSTAL, freshPackState, updatePackMonster, tickPackEffects, addPackEffect, PACK_EFFECT_CAP, rayLength} from '../src/monster-pack.ts';

// Dependency-free production drawing commands. Native pixel/video evidence is separate;
// this file must run in CI without Canvas, FFmpeg, a browser, or capture dependencies.
class CommandCanvas {
  width; height; context;
  constructor(width, height) { this.width = width; this.height = height; this.context = commandContext(this); }
  getContext() { return this.context; }
}
function commandContext(canvas) {
  const calls = [], stack = [], state = { globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1 };
  const methods = {
    canvas, calls,
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    measureText: text => ({ width: String(text).length * 7 }),
    createLinearGradient: (...args) => gradient('linear', args),
    createRadialGradient: (...args) => gradient('radial', args),
    save() { stack.push({ ...state }); calls.push(['save']); },
    restore() { const saved = stack.pop(); for (const key of Object.keys(state)) delete state[key]; Object.assign(state, saved); calls.push(['restore']); },
    clearRect(...args) { if (args[0] === 0 && args[1] === 0 && args[2] >= canvas.width && args[3] >= canvas.height) calls.length = 0; calls.push(['clearRect', ...args]); },
    drawImage(source, ...args) { calls.push(['drawImage', structuredClone(source.context.calls), ...args]); },
  };
  function gradient(kind, args) { const stops = []; return { kind, args, stops, addColorStop(at, color) { stops.push([at, color]); } }; }
  const copyState = prop => {
    const keys = prop.startsWith('fill') ? ['globalAlpha', 'fillStyle'] : prop.startsWith('stroke') ? ['globalAlpha', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin'] : [];
    if (prop.endsWith('Text')) keys.push('font', 'textAlign', 'textBaseline');
    return JSON.parse(JSON.stringify(Object.fromEntries(keys.filter(key => Object.hasOwn(state, key)).map(key => [key, state[key]]))));
  };
  return new Proxy(methods, {
    get(target, prop) {
      if (Object.hasOwn(target, prop)) return target[prop];
      if (Object.hasOwn(state, prop)) return state[prop];
      return (...args) => calls.push([prop, ...args, copyState(prop)]);
    },
    set(target, prop, value) { if (Object.hasOwn(target, prop)) target[prop] = value; else state[prop] = value; return true; },
  });
}

function fixture(coast = true) {
 const width=32, map={width,height:32,landscape:true,name:'Ocean material regression',objects:[],tiles:Array.from({length:1024},(_,i)=>({x:i%32,y:Math.floor(i/32),kind:!coast||i%32>=16?'ocean':'floor',blocked:!coast||i%32>=16,elev:0,landscape:!coast||i%32>=16?'sea':'grass',detail:0}))};
 return {area:'overworld',rx:6,ry:0,map,save:freshSave(),player:{x:13,y:18,facing:'down',walkPhase:0},enemies:[],effects:[],projectiles:[],packEffects:[],eliteHazards:[],glyphVisuals:[],echoPatches:[],presentation:{effectiveQuality:'low',weather:false,reduceMotion:true}};
}
function capture(g,cached){const old=globalThis.OffscreenCanvas;try{if(cached)globalThis.OffscreenCanvas=CommandCanvas;else delete globalThis.OffscreenCanvas;const c=new CommandCanvas(800,600);if(!cached)c.context.getTransform=undefined;render(c.context,g,800,600,1000);return structuredClone(c.context.calls);}finally{if(old===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=old}}
const allCalls=calls=>calls.flatMap(c=>c[0]==='drawImage'?[c,...allCalls(c[1])]:[c]);
for(const cached of [false,true]){
 test(`Coastal material excludes actual ocean polygons without discarding land circle (${cached?'cached':'fallback'})`,()=>{const g=fixture();const before=JSON.stringify(g.map.tiles.filter(t=>t.kind==='ocean'));const r=consumeVoidTerrain(g.save,g.map,'overworld:OCEAN-TEST:g1:6:0',{x:15.5,y:14.62},4.8);assert.ok(r.ok);const calls=allCalls(capture(g,cached));assert.equal(JSON.stringify(g.map.tiles.filter(t=>t.kind==='ocean')),before);assert.ok(calls.some(c=>c[0]==='clip'&&c[1]==='evenodd'));assert.ok(calls.some(c=>c[0]==='fill'&&c.at(-1)?.fillStyle==='#fffefd'));assert.ok(calls.some(c=>c[0]==='arc'&&Math.abs(c[3]-4.8*44)<1e-8));});
 test(`All-ocean blast has no permanent material or circle history (${cached?'cached':'fallback'})`,()=>{const g=fixture(false);const before=JSON.stringify(g.map.tiles);const r=consumeVoidTerrain(g.save,g.map,'overworld:OCEAN-TEST:g1:6:0',{x:15.5,y:14.62},7);assert.ok(r.ok);assert.equal(r.changed,0);assert.equal(JSON.stringify(g.map.tiles),before);assert.equal(g.save.voidScars.areas['overworld:OCEAN-TEST:g1:6:0'],undefined);const calls=allCalls(capture(g,cached));assert.ok(!calls.some(c=>c.at(-1)?.fillStyle==='#fffefd'));});
}
test('Cached coastal material rebuilds after an in-place ocean-mask change',()=>{const g=fixture();consumeVoidTerrain(g.save,g.map,'overworld:OCEAN-TEST:g1:6:0',{x:15.5,y:14.62},4.8);capture(g,true);const first=rendererDiagnostics().scarBuilds;capture(g,true);assert.equal(rendererDiagnostics().scarBuilds,first);Object.assign(g.map.tiles[14*32+15],{kind:'ocean',blocked:true});capture(g,true);assert.equal(rendererDiagnostics().scarBuilds,first+1);});

function drawBody(actor, now = 1000) {
  const canvas = new CommandCanvas(400, 300);
  drawPackMonster(canvas.context, actor, 100, now);
  return structuredClone(canvas.context.calls);
}
function drawEffects(effects, now = 1000, presentation = {}, lift = () => 0) {
  const canvas = new CommandCanvas(400, 300);
  drawPackEffects(canvas.context, effects, 100, now, () => true, lift, presentation);
  return structuredClone(canvas.context.calls);
}
const usesStyle = (calls, style) => allCalls(calls).some(c => c.at(-1)?.fillStyle === style || c.at(-1)?.strokeStyle === style);
function body(marine, extra = {}) {
  return {id:'ocean-render-walker', kind:'voidWalker', x:1, y:1, scale:1, hp:100, maxHp:100, pack:{}, facingX:1, reduceMotion:true, marine, ...extra};
}
function waterEffect(state = 'lift', extra = {}) {
  return {kind:'debris', medium:'water', owner:'water-owner', state, x:1, y:1, radius:CRYSTAL.debrisRadius,
    life:state === 'splash' ? .2 : 2, total:CRYSTAL.waterSplashLife, arming:0, shape:2, lift:CRYSTAL.debrisRise, vx:7.5, vy:0, ...extra};
}

test('Walker gets a small separate skiff only over marine terrain, without changing body state', () => {
  const dry = body(false), wet = body(true), before = structuredClone(wet);
  const dryCalls = drawBody(dry), wetCalls = drawBody(wet);
  assert.equal(usesStyle(dryCalls, '#564850'), false);
  assert.equal(usesStyle(wetCalls, '#564850'), true, 'personal skiff deck is drawn');
  const deck = wetCalls.findIndex(c => c[0] === 'fill' && c.at(-1)?.fillStyle === '#564850');
  const start = wetCalls.findLastIndex((c, i) => i < deck && c[0] === 'beginPath');
  const xs = wetCalls.slice(start, deck).flatMap(c => c[0] === 'moveTo' ? [c[1]] : c[0] === 'quadraticCurveTo' ? [c[1], c[3]] : []);
  assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - 112) < 1e-8, 'skiff is only 1.12 tiles long');
  assert.deepEqual(wet, before, 'drawing cannot create inventory or boat state');
  assert.deepEqual(drawBody(wet, 100), drawBody(wet, 10000), 'quiet body and wake stay still');
});

test('world renderer derives skiff occupancy at the same fractional shoreline as production oceanAt', () => {
  for (const y of [15.20, 15.24, 15.249, 15.25, 15.251, 15.26, 15.30]) {
    const g = fixture();
    for (const tile of g.map.tiles) Object.assign(tile, {kind:tile.y >= 16 ? 'ocean' : 'floor', blocked:tile.y >= 16, landscape:tile.y >= 16 ? 'sea' : 'grass'});
    const actor = {...createCombatant('voidWalker',14,y,false,[]), ...body(y < 15.25, {x:14, y})}; // Actual pack actor, deliberately stale/inverted visual flag.
    g.enemies = [actor];
    const expected = Game.prototype.packWorld.call(g, .05, 1000).oceanAt(actor.x, actor.y);
    const before = structuredClone(actor);
    assert.equal(expected, y >= 15.25);
    assert.equal(usesStyle(capture(g, false), '#564850'), expected, `shoreline y=${y}`);
    assert.deepEqual(actor, before, 'world drawing derives a copy rather than mutating actor state');
  }
});

for (const [stage, effect] of [
  ['rising filament', waterEffect('lift', {lift:.12})],
  ['held orbit', waterEffect('lift')],
  ['thrown water bolt', waterEffect('thrown')],
  ['harmless splash', waterEffect('splash')],
]) {
  test(`Crystal ${stage} has water-specific art, stable reduced motion and no render mutation`, () => {
    const effects = [effect], before = structuredClone(effects);
    const calls = drawEffects(effects, 100, {reduceMotion:true});
    assert.deepEqual(drawEffects(effects, 10000, {reduceMotion:true}), calls);
    assert.deepEqual(effects, before);
    assert.ok(calls.some(c => c[0] === 'ellipse'), 'water uses rounded droplets/ripples');
    assert.ok(usesStyle(calls, effect.state === 'splash' ? '#ccf9ff' : '#b3f3ffcc'));
    if (effect.state !== 'splash') {
      const dry = {...effect}; delete dry.medium;
      const dryCalls = drawEffects([dry]);
      assert.equal(usesStyle(dryCalls, '#b3f3ffcc'), false, 'ordinary debris remains the original stone branch');
      assert.notDeepEqual(dryCalls, calls);
    }
    if (effect.state === 'lift') assert.ok(calls.some(c => c[0] === 'bezierCurveTo'), 'visible lifting filament');
  });
}

test('water effect ground reflection and harmless splash follow supplied terrain projection', () => {
  for (const effect of [waterEffect('lift'), waterEffect('splash')]) {
    const plain = drawEffects([effect], 100, {reduceMotion:true});
    const raised = drawEffects([effect], 100, {reduceMotion:true}, () => .8);
    const a = plain.find(c => c[0] === 'ellipse'), b = raised.find(c => c[0] === 'ellipse');
    assert.equal(a[1], b[1]); assert.ok(Math.abs(a[2] - b[2] - 80) < 1e-8);
  }
});

function combatFixture(water) {
  const w = {dt:.05, now:0, area:'overworld', player:{x:17,y:12,hp:1e6}, enemies:[], fx:[], hurts:[], emitted:[],
    open:()=>true, tileOpen:()=>!water, projectileOpen:()=>true, los:()=>true, move:()=>true, slow(){},
    hurt(owner,amount,options){w.hurts.push({owner:owner?.id,amount,...options});}, effects:()=>w.fx,
    addEffect(f){w.emitted.push({...f});addPackEffect(w.fx,f,w.now);}, oceanAt:()=>water};
  const e = createCombatant('psychicCrystal',10,12,true,[]);
  Object.assign(e,{id:'water-owner',worldBeast:'psychicCrystal',aggro:true,evasive:false,hp:3000,maxHp:3000,damage:20,marine:!water});
  e.pack=freshPackState();e.pack.gap=0;e.packAttacks=['psyDebris'];e.packBossAttacks=[];w.enemies=[e];
  return {w,e};
}
function frame(w,e) { w.now+=w.dt*1000;updatePackMonster(e,w);w.fx=tickPackEffects(w.fx,w); }
function cast(w,e) {
  frame(w,e);e.packAttacks=[];
  for(let i=0;i<20&&!w.fx.length;i++)frame(w,e);
  assert.equal(w.fx.length,CRYSTAL.debris);
}

for (const water of [false,true]) {
  test(`Crystal ${water?'water':'dry'} volley preserves four-shot damage, finite cleanup and material selected from terrain`, () => {
    const {w,e}=combatFixture(water);cast(w,e);
    assert.ok(w.fx.every(f=>water?f.medium==='water':f.medium===undefined));
    assert.equal(w.emitted.length,4);assert.ok(w.fx.every(f=>f.state==='lift'));
    for(let i=0;i<140;i++){frame(w,e);assert.ok(w.fx.length<=PACK_EFFECT_CAP);}
    assert.equal(w.hurts.length,4);assert.ok(w.hurts.every(h=>h.amount===20&&h.source==='psyDebris'));
    assert.equal(w.fx.length,0);assert.equal(e.pack.attack,null);
  });
}

test('water volley retains its captured material after the Crystal crosses onto land', () => {
  const {w,e}=combatFixture(true);cast(w,e);w.oceanAt=()=>false;e.marine=false;
  for(let i=0;i<25;i++)frame(w,e);
  assert.ok(w.emitted.every(f=>f.medium==='water'));
  assert.ok(w.fx.length>0&&w.fx.every(f=>f.medium==='water'));
});

for (const reason of ['interrupted','retreat','dead','removed']) {
  test(`held water becomes a bounded harmless same-slot splash when its owner is ${reason}`, () => {
    const {w,e}=combatFixture(true);cast(w,e);const original=[...w.fx];
    if(reason==='interrupted')e.pack.attack=null;
    if(reason==='retreat')e.retreating=true;
    if(reason==='dead')e.dead=true;
    if(reason==='removed')w.enemies=[];
    w.fx=tickPackEffects(w.fx,w);
    assert.equal(w.fx.length,original.length);
    assert.ok(w.fx.every((f,i)=>f===original[i]),'cleanup reuses slots, never spawns extra effects');
    assert.ok(w.fx.every(f=>f.state==='splash'&&f.damage===0&&f.vx===0&&f.vy===0));
    for(let i=0;i<8;i++)w.fx=tickPackEffects(w.fx,w);
    assert.equal(w.fx.length,0);assert.equal(w.hurts.length,0);
  });
}

test('water sweep stops at a wall before the target even during a long frame', () => {
  const {w,e}=combatFixture(true);w.dt=1;w.marineProjectileOpen=x=>x<13;
  const f=waterEffect('thrown',{owner:e.id,x:10,y:12,vx:7.5,vy:0,life:2.2,damage:20});w.fx=[f];
  w.fx=tickPackEffects(w.fx,w);
  assert.equal(w.hurts.length,0);assert.ok(f.x<12.5);assert.equal(f.state,'splash');assert.equal(f.damage,0);
});

test('water sweep detects a crossed target exactly once and cannot damage from the splash', () => {
  const {w,e}=combatFixture(true);w.dt=1;w.player.x=14;
  const f=waterEffect('thrown',{owner:e.id,x:10,y:12,vx:7.5,vy:0,life:2.2,damage:20});w.fx=[f];
  w.fx=tickPackEffects(w.fx,w);assert.equal(w.hurts.length,1);assert.equal(f.state,'splash');assert.equal(f.damage,0);
  w.fx=tickPackEffects(w.fx,w);assert.equal(w.hurts.length,1);
});

test('water flight travels only its remaining lifetime before becoming harmless', () => {
  const {w,e}=combatFixture(true);w.dt=1;w.player.x=14;
  const f=waterEffect('thrown',{owner:e.id,x:10,y:12,vx:7.5,vy:0,life:.1,damage:20});w.fx=[f];
  w.fx=tickPackEffects(w.fx,w);assert.equal(w.hurts.length,0);assert.ok(Math.abs(f.x-10.75)<1e-8);
  assert.equal(f.state,'splash');assert.equal(f.damage,0);
});

test('pause freezes lifted water and cosmetic splash lifetime', () => {
  const {w,e}=combatFixture(true);cast(w,e);w.fx.push(waterEffect('splash'));w.dt=0;
  const before=structuredClone(w.fx);w.fx=tickPackEffects(w.fx,w);assert.deepEqual(w.fx,before);
});

test('marine ray callback remains Crystal-specific rather than changing Knight rays', () => {
  const world={tileOpen:()=>false,marineTileOpen:()=>true};
  assert.equal(rayLength(world,{x:1,y:1,kind:'psychicCrystal'},{x:1,y:0},8),8);
  assert.equal(rayLength(world,{x:1,y:1,kind:'nanobotKnight'},{x:1,y:0},8),.25);
});

test('Walker rift placement uses the explicit marine callback rather than weakening generic ground', () => {
  const {w}=combatFixture(true),e=createCombatant('voidWalker',10,12,true,[]);
  Object.assign(e,{id:'marine-rift-contract',worldBeast:'voidWalker',aggro:true,packAttacks:['voidRifts'],packBossAttacks:[]});
  e.pack=freshPackState();e.pack.gap=0;w.enemies=[e];w.open=()=>false;w.marineOpen=()=>true;
  for(let i=0;i<20;i++)frame(w,e);
  assert.equal(w.fx.filter(f=>f.kind==='voidRift').length,3);
});

test('at the shared cap a spent water splash yields its slot before an existing armed attack', () => {
  const effects=[];
  for(let i=0;i<PACK_EFFECT_CAP;i++)addPackEffect(effects,{kind:i===20?'debris':'voidRend',state:i===20?'splash':'active',medium:i===20?'water':undefined,owner:'budget',x:i,y:0,life:1,arming:.4},i);
  const armed=effects.filter(f=>f.kind==='voidRend');
  addPackEffect(effects,{kind:'voidBeam',owner:'budget',x:0,y:0,life:1,arming:.4},100);
  assert.equal(effects.length,PACK_EFFECT_CAP);assert.ok(!effects.some(f=>f.state==='splash'));
  assert.ok(armed.every(f=>effects.includes(f)),'an existing warning is not silently truncated');
  assert.ok(effects.some(f=>f.kind==='voidBeam'));
});
