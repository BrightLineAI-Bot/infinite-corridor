import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { closeViewToolFacingYaw, closeViewPlayerAction, closeViewPlayerFacingYaw, closeViewCamera, CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const near = (a, b) => assert.ok(Math.abs(wrap(a-b)) < 1e-8, `${a} versus ${b}`);
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



function action(toolKind, id, angle, elapsed, startup=120, phase='startup') {
  return { active: true, amount: elapsed/720, record: { toolKind, profile: 'emitter', durationMs:720,
    aim:{x:Math.cos(angle),y:Math.sin(angle)}, toolUse:{v:1,id,startupMs:startup,phase} } };
}
test('known accepted tools use a bounded shortest arc and stored shortened startup', () => {
  for (const kind of ['rift-bombard','blunderbuss','lumen-spindle','great-sweep']) {
    for (const startup of [1,30,60,120]) {
      const track={yaw:0}, before=structuredClone(track), record=action(kind,'one',Math.PI/3,0,startup);
      near(closeViewToolFacingYaw(track,record),0);
      const samples=[0,.25,.5,.75,1].map(t=>closeViewToolFacingYaw(track,action(kind,'one',Math.PI/3,t*startup,startup)));
      near(samples[2],Math.PI/6); near(samples[4],Math.PI/3);
      assert.ok(samples.every((a,i)=>Number.isFinite(a)&&a>=0&&a<=Math.PI/3+1e-10&&(!i||a>=samples[i-1])));
      near(closeViewToolFacingYaw(track,action(kind,'one',Math.PI/3,0,startup,'released')),Math.PI/3);
      assert.deepEqual(record,action(kind,'one',Math.PI/3,0,startup),'accepted record is untouched');
      assert.equal(before.yaw,track.yaw,'sampler owns only its ephemeral entry cache');
    }
  }
  const track={yaw:179*Math.PI/180};
  near(closeViewToolFacingYaw(track,action('rift-bombard','wrap',-179*Math.PI/180,60)),Math.PI);
  assert.ok(Math.abs(wrap(closeViewToolFacingYaw(track,action('rift-bombard','wrap',-179*Math.PI/180,120))-track.yaw))<.04);
});
test('fresh tracks, legacy, unknown and cancelled records preserve their prior ownership', () => {
  const a=action('rift-bombard','reload',1,30);
  near(closeViewToolFacingYaw(null,a),1);
  for(const patch of [{active:false},{record:{...a.record,toolUse:null}},{record:{...a.record,toolKind:'future-tool'}},{record:{...a.record,toolUse:{...a.record.toolUse,v:2}}}])
    assert.ok(Number.isNaN(closeViewToolFacingYaw({yaw:0},{...a,...patch})));
  const t={yaw:0}; closeViewToolFacingYaw(t,a);t.yaw=.4;
  near(closeViewToolFacingYaw(t,action('rift-bombard','next',1,0)),.4,'new accepted id starts at its displayed heading');
});
test('production heading turns through startup, freezes on pause and releases the exact accepted shot', () => withGPU(({screen})=>{
  const now=100000, g=createLabFixture({lab:'close-view',scenario:'heart',now}).game;
  g.enemies=[];g.projectiles=[];g.effects=[];g.presentation={effectiveQuality:'full',reduceMotion:true};
  g.save.equipment.secondary={id:'secondary-rift-bombard',name:'Rift Bombard',slot:'secondary',power:5,property:'blast'};
  g.player.facing='right';resetCloseViewCamera();render(screen,g,390,844,now);
  const entry=closeViewPlayerFacingYaw(g,now),goal=wrap(entry+Math.PI/3),aim={x:Math.cos(goal),y:Math.sin(goal)};
  assert.equal(g.fireSecondary(now,aim),true);
  const pending=structuredClone(g.pendingToolUse), visual=structuredClone(g.player.attackVisual);
  render(screen,g,390,844,now);near(closeViewCamera().bodyYaw,entry);
  const middle=now+pending.startupMs/2;
  render(screen,g,390,844,middle);near(closeViewCamera().bodyYaw,wrap(entry+Math.PI/6));
  g.paused=true;g.pauseStarted=middle;
  render(screen,g,390,844,middle+5000);near(closeViewCamera().bodyYaw,wrap(entry+Math.PI/6));
  assert.deepEqual(g.pendingToolUse,pending);assert.deepEqual(g.player.attackVisual,visual);
  // This direct pause control isolates presentation; gameplay release uses its unchanged stored deadline.
  g.paused=false;g.player.x+=.2;
  render(screen,g,390,844,pending.releaseAt);near(closeViewCamera().bodyYaw,goal);
  assert.equal(g.releasePendingToolUse(pending.releaseAt).released,true);
  const shot=g.projectiles.find(p=>p.id===`${pending.id}-base`);
  assert.ok(shot);near(Math.atan2(shot.dy,shot.dx),goal);
  assert.ok(Math.abs(shot.x-(g.player.x+.5+pending.aim.x*.35))<1e-9);
  assert.ok(Math.abs(shot.y-(g.player.y+.45+pending.aim.y*.35))<1e-9);
  assert.equal(g.player.attackVisual.toolUse.releaseOffsetMs,pending.startupMs);
  assert.ok(closeViewGLStats.models<=20);
}));
