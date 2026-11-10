import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCloseViewHero } from '../src/close-view-hero.ts';
import { render } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { CLOSE_VIEW_HOOKS, closeViewStats, closeViewCamera, closeViewActorSupport, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL, GLF } from '../src/close-view-gl.ts';

const noopContext = () => new Proxy({
  canvas: null,
  measureText: () => ({ width: 10 }),
  getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  createRadialGradient: () => ({ addColorStop() {} }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createPattern: () => ({}),
}, {
  get: (object, key) => key in object ? object[key] : () => {},
  set: (object, key, value) => { object[key] = value; return true; },
});

class MockWebGL2RenderingContext {
  constructor() {
    let constant = 1; const constants = new Map();
    return new Proxy(this, {
      get: (object, key) => {
        if (key in object) return object[key];
        if (typeof key === 'string' && /^[A-Z][A-Z0-9_]+$/.test(key)) { if (!constants.has(key)) constants.set(key, constant++); return constants.get(key); }
        return () => {};
      },
    });
  }
  bufferData(target,data,usage) { if(data instanceof Float32Array && usage===this.DYNAMIC_DRAW && data.length%10===0)this.models=data.slice(); }
  bufferSubData(target,offset,data) { if(data instanceof Float32Array)this.hero=data.slice(); }
  isContextLost() { return false; }
  createShader() { return {}; }
  createProgram() { return {}; }
  createBuffer() { return {}; }
  createTexture() { return {}; }
  createVertexArray() { return {}; }
  getShaderParameter() { return true; }
  getProgramParameter(program, parameter) {
    return parameter === this.ACTIVE_UNIFORMS || parameter === this.ACTIVE_ATTRIBUTES ? 0 : true;
  }
  getExtension() { return null; }
}


import { galleryLiftSupportZ, writeGalleryLiftDeck, GALLERY_DECK_FLOATS } from '../src/gallery-lift-render.ts';
import { LIFT_PER_LEVEL, interiorSurfaceHeight } from '../src/landscape.ts';

const fixture = () => createLabFixture({lab:'close-view',scenario:'vertical-gallery-lift',now:1000}).game;
test('accepted deck mesh is bounded, opaque and has its top exactly at rider feet', () => {
  const game=fixture(),q=game.scratchGalleryLift, out=new Float32Array(GALLERY_DECK_FLOATS);
  for(const elapsed of [0,2,4,5.2,7,9]) {
    game.installScratchGalleryLift(q.track,{elapsed,rider:true});
    assert.equal(writeGalleryLiftDeck(out,0,game),GALLERY_DECK_FLOATS);
    const z=galleryLiftSupportZ(game), pose=game.scratchGalleryLift.pose;
    let top=-Infinity;
    for(let i=0;i<out.length;i+=10) {
      assert.ok(Math.abs(out[i]-pose.x-.5)<=q.track.deck.halfWidth+1e-6);
      assert.ok(Math.abs(out[i+1]-pose.y-.75)<=q.track.deck.halfDepth+1e-6);
      assert.ok(out[i+2]>=z-.120001&&out[i+2]<=z+1e-6);
      assert.equal(out[i+9],1); top=Math.max(top,out[i+2]);
    }
    assert.ok(Math.abs(top-z)<1e-6);
    assert.equal(closeViewActorSupport(game.map,{supportZ:z},game.player.x+.5,game.player.y+.75),z);
    const before=out.slice();game.paused=true;assert.equal(writeGalleryLiftDeck(out,0,game),GALLERY_DECK_FLOATS);assert.deepEqual(out,before);
  }
  assert.equal(writeGalleryLiftDeck(new Float32Array(10),0,game),0);
  game.scratchGalleryLift.rider=false;assert.equal(galleryLiftSupportZ(game),undefined);
  const x=game.player.x+.5,y=game.player.y+.75;
  assert.equal(closeViewActorSupport(game.map,{},x,y),interiorSurfaceHeight(game.map,x,y));
  game.scratchGalleryLift.map={};assert.equal(writeGalleryLiftDeck(out,0,game),0);
});

test('real native and imported renders share accepted deck support with the camera', async () => {
  const names=['window','fetch','createImageBitmap'],old=new Map(names.map(n=>[n,globalThis[n]]));
  const previous=globalThis.WebGL2RenderingContext;globalThis.WebGL2RenderingContext=MockWebGL2RenderingContext;
  const gl=new MockWebGL2RenderingContext(),screen=noopContext();
  const canvas={width:390,height:844,addEventListener(){},getContext:kind=>kind==='webgl2'?gl:noopContext()};screen.canvas=canvas;
  setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();
  try {
    const game=fixture(),track=game.scratchGalleryLift.track;game.presentation={effectiveQuality:'full'};
    for(const imported of [false,true]) {
    if(imported) {
      globalThis.window={};globalThis.createImageBitmap=async()=>({width:1024,height:1024});
      globalThis.fetch=async(url)=>{const u=new URL(url);assert.equal(u.protocol,'file:');const b=fs.readFileSync(u);return {ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};
      assert.ok(await loadCloseViewHero());
    }
    let lowerEye,lowerFeet;
    for(const elapsed of [track.timing.dwellLower+track.timing.travel,track.timing.dwellLower+track.timing.travel+track.timing.rise]) {
      game.installScratchGalleryLift(track,{elapsed,rider:true});resetCloseViewCamera();
      for(let i=0;i<4;i++)render(screen,game,390,844,1000+i*16);
      assert.equal(closeViewStats.gl,1);assert.equal(closeViewGLStats.galleryDeckVertices,36);assert.ok(closeViewGLStats.models>0);
      const eye=closeViewCamera().height;
      const mesh=imported?gl.hero:gl.models,stride=imported?6:10,end=imported?mesh.length:mesh.length-GALLERY_DECK_FLOATS;
      assert.ok(mesh&&end>0);let feet=Infinity;for(let i=2;i<end;i+=stride)feet=Math.min(feet,mesh[i]);
      if(lowerFeet===undefined)lowerFeet=feet;else assert.ok(Math.abs(feet-lowerFeet-track.upper.elevation*LIFT_PER_LEVEL)<1e-5,`rig elevation follows deck: ${imported}`);
      if(lowerEye===undefined)lowerEye=eye;else assert.ok(eye>lowerEye+track.upper.elevation*LIFT_PER_LEVEL-.2);
    }
    }
    game.scratchGalleryLift=null;render(screen,game,390,844,1100);assert.equal(closeViewGLStats.galleryDeckVertices,0);
  } finally {
    for(const n of names){if(old.get(n)===undefined)delete globalThis[n];else globalThis[n]=old.get(n);}
    CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);
    if(previous===undefined)delete globalThis.WebGL2RenderingContext;else globalThis.WebGL2RenderingContext=previous;
  }
});
