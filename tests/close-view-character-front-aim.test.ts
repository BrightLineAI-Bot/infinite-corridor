import test from 'node:test';
import assert from 'node:assert/strict';
import {createLabFixture} from '../src/proving-ground-labs.ts';
import {createCombatant} from '../src/combat.ts';
import {render} from '../src/renderer.ts';
import {resetCloseViewGL} from '../src/close-view-gl.ts';
import * as CV from '../src/close-view.ts';
const {setCloseViewCanvasFactory,CLOSE_VIEW_HOOKS}=CV;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const near=(a,b)=>assert.ok(Math.abs(wrap(a-b))<1e-8,`${a} versus ${b}`);
const yaw=d=>Math.atan2(d.y??d.dy,d.x??d.dx);
const context = (log = []) => new Proxy({
  canvas: null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}),
}, { get: (o, key) => key in o ? o[key] : (...args) => { log.push([key, ...args]); }, set: (o, key, v) => { o[key] = v; return true; } });
class MockGL {
  uploads = []; sources = []; program = null;
  constructor() { let id = 1; const constants = new Map(); return new Proxy(this, { get: (o, key) => {
    if (key in o) return o[key];
    if (typeof key === 'string' && /^[A-Z][A-Z0-9_]+$/.test(key)) { if (!constants.has(key)) constants.set(key, id++); return constants.get(key); }
    return () => {};
  } }); }
  isContextLost() { return false; } createShader() { return {}; } createProgram() { return { shaders: [] }; }
  shaderSource(shader, text) { shader.text = text; this.sources.push(text); } attachShader(program, shader) { program.shaders.push(shader); }
  useProgram(program) { this.program = program; }
  createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; }
  getProgramParameter(p, key) { return key === this.ACTIVE_UNIFORMS || key === this.ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; }
  bufferData(target, data) { if (data instanceof Float32Array && this.program?.shaders?.some(s => s.text.includes('in float a_alpha'))) this.uploads.push(Float32Array.from(data)); }
}
function withGPU(run) {
  const previous = globalThis.WebGL2RenderingContext; globalThis.WebGL2RenderingContext = MockGL;
  const gl = new MockGL(), log = [], screen = context(log);
  const canvas = { width: 390, height: 844, addEventListener() {}, getContext: kind => kind === 'webgl2' ? gl : context(log) };
  screen.canvas = canvas; setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL();
  try { run({ gl, log, screen }); } finally {
    CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null);
    if (previous === undefined) delete globalThis.WebGL2RenderingContext; else globalThis.WebGL2RenderingContext = previous;
  }
}




const start=800000;
function fixture(screen,facing='right',camera=Math.PI,family='attack'){
  const g=createLabFixture({lab:'close-view',scenario:'heart',now:start}).game;
  g.enemies=[];g.effects=[];g.projectiles=[];g.presentation={effectiveQuality:'full',reduceMotion:true};
  g.player.facing=facing;const a={right:0,left:Math.PI,up:-Math.PI/2,down:Math.PI/2}[facing];g.save.lastAim={x:Math.cos(a),y:Math.sin(a)};
  g.save.equipment.secondary={id:'secondary-rift-bombard',name:'Rift Bombard',slot:'secondary',power:5,property:'blast'};
  if(family==='cleaver')g.save.equipment.primary={id:'primary-verge-cleaver',name:'Verge Cleaver',slot:'primary',power:12};
  if(family==='fist')g.save.equipment.primary={id:'primary-iron-fists',name:'Iron Fists',slot:'primary',power:12};
  CV.resetCloseViewCamera();for(let i=0;i<5;i++)render(screen,g,390,844,start+i*16);
  CV.closeViewPan((camera-CV.closeViewCamera().yaw)/CV.CLOSE_VIEW.crescent.yaw,0,start+80);render(screen,g,390,844,start+80);
  return g;
}
function step(g,action,now=start+96,state={x:0,y:0},held=false){
  const q=new Set(action?[action]:[]),steered=CV.closeViewSteer(g,state,now);
  try{g.update(.016,{state,consume:k=>q.delete(k),held:k=>held&&k==='attack'},now);}finally{if(steered)CV.closeViewUnsteer(state);}
}
function accept(g,family){
  const action=['cleaver','fist'].includes(family)?'attack':family;
  step(g,action,start+96,{x:0,y:0},family==='fist');
  if(family==='fist')step(g,null,start+112);
  const v=g.player.attackVisual||g.player.castVisual;assert.ok(v?.aim,`${family} accepted`);return v;
}
test('actual neutral steer→Game.update preserves displayed front across orbit, facings and action families',()=>withGPU(({screen})=>{
  for(const facing of ['right','left','up','down'])for(const camera of [0,Math.PI/2,Math.PI])for(const family of ['attack','cleaver','fist','tool','spell']){
    const g=fixture(screen,facing,camera,family),body=CV.closeViewPlayerFacingYaw(g,start+80),v=accept(g,family);
    near(yaw(v.aim),body);
    if(g.pendingToolUse)near(yaw(g.pendingToolUse.aim),body);
    if(g.pendingMeleeContact)near(yaw(g.pendingMeleeContact.aim),body);
  }
}));
test('lock, auto aim and fresh explicit tool/spell taps retain their production priorities',()=>withGPU(({screen})=>{
  for(const control of ['lock','auto','tap'])for(const family of ['attack','tool','spell']){
    const g=fixture(screen,'right',Math.PI/4,family);
    if(control==='tap')g.aimAt(g.player.x+.5,g.player.y+1.45);
    else{const e=Object.assign(createCombatant('glassMite',g.player.x+.8,g.player.y),{id:'front-aim-target'});g.enemies=[e];if(control==='lock')assert.ok(g.lockTarget(e.id));}
    const v=accept(g,family);near(yaw(v.aim),control==='tap'&&family!=='attack'?Math.PI/2:0);
  }
}));
test('neutral orbit preserves committed startup descriptors, pause state and movement input ownership',()=>withGPU(({screen})=>{
  const g=fixture(screen);assert.equal(g.fireSecondary(start+96,{x:0,y:1}),true);
  const pending=structuredClone(g.pendingToolUse),visual=structuredClone(g.player.attackVisual),aim=structuredClone(g.save.lastAim);
  CV.closeViewPan(1,0,start+100);CV.closeViewSteer(g,{x:0,y:0});
  assert.deepEqual(g.pendingToolUse,pending);assert.deepEqual(g.player.attackVisual,visual);assert.deepEqual(g.save.lastAim,aim);
  g.paused=true;g.pauseStarted=start+100;const save=JSON.stringify(g.save);
  assert.equal(CV.closeViewSteer(g,{x:0,y:0}),false);assert.equal(JSON.stringify(g.save),save);
  const moving=fixture(screen,'right',Math.PI/2),state={x:0,y:-1};step(moving,null,start+96,state);
  assert.deepEqual(state,{x:0,y:-1},'unsteer returns raw joystick ownership');near(yaw(moving.save.lastAim),Math.PI/2);
}));
test('first-frame and non-native fallback use character facing rather than a stale saved camera aim',()=>withGPU(({screen})=>{
  for(const facing of ['left','up']){
    const g=fixture(screen,facing,Math.PI/4);g.save.lastAim={x:1,y:0};CV.resetCloseViewCamera();
    CV.closeViewSteer(g,{x:0,y:0},start+96);near(yaw(g.save.lastAim),facing==='left'?Math.PI:-Math.PI/2);
    // A canvas-only frame has no native player track; its front remains explicit cardinal facing.
    CV.CLOSE_VIEW_HOOKS.gl=false;render(screen,g,390,844,start+96);g.save.lastAim={x:1,y:0};
    CV.closeViewSteer(g,{x:0,y:0},start+96);near(yaw(g.save.lastAim),facing==='left'?Math.PI:-Math.PI/2);
    CV.CLOSE_VIEW_HOOKS.gl=true;
  }
}));


test('explicit first-frame clock distinguishes restored active actions from expired timers',()=>withGPU(({screen})=>{
  for(const field of ['actionVisualUntil','attackUntil','castUntil','dodgeUntil','stunnedUntil'])for(const active of [false,true]){
    const g=fixture(screen,'left',Math.PI/4),clock=start+96;
    g.save.lastAim={x:0,y:1};g.player[field]=clock+(active?100:-1);CV.resetCloseViewCamera();
    const save=JSON.stringify(g.save),timers=JSON.stringify(g.player);
    CV.closeViewSteer(g,{x:0,y:0},clock);
    near(yaw(g.save.lastAim),active?Math.PI/2:Math.PI);
    if(active)assert.equal(JSON.stringify(g.save),save,'restored active aim is unchanged');
    assert.equal(JSON.stringify(g.player),timers,'input fallback never rebases player timers or descriptors');
  }
  const g=fixture(screen,'left',Math.PI/4);g.save.lastAim={x:0,y:1};CV.resetCloseViewCamera();
  CV.closeViewSteer(g,{x:0,y:0});near(yaw(g.save.lastAim),Math.PI/2,'unknown clock preserves aim conservatively');
  g.player.castUntil=10;CV.closeViewSteer(g,{x:0,y:0},0);near(yaw(g.save.lastAim),Math.PI/2,'explicit zero is a valid busy clock');
}));
