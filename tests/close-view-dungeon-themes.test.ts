// Tim, 2026-11-11, in THE DEEP · FLOOR 1: "the dungeon themes need to extend to the Close View walls"; Close View
// is allowed where it already worked and in the Deep, and refused ("The view is occluded.") in ordinary dungeons and crossings
// with the saved setting kept; Aperture crystals float, lit from within; the Oculus's dais is blue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { deepIdFor, deepShaft, floorPlan, THE_DEEP } from '../src/the-deep.ts';
import { perceived } from '../src/world.ts';
import * as CV from '../src/close-view.ts';
import { CLOSE_VIEW_HOOKS, setCloseViewCanvasFactory, resetCloseViewCamera, closeViewShowing } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL, CLOSE_VIEW_ACTOR_LOOK } from '../src/close-view-gl.ts';
import { writeCloseViewModel, MODEL_FLOATS, MODEL_MAX_VERTICES, modelSupported, modelTriangleCount, CLOSE_VIEW_PROP_MODELS } from '../src/close-view-models.ts';
import { OCULUS, OCULUS_HOOKS, oculusAvailable, pressOculus } from '../src/oculus.ts';
import { generateDeepDungeon, deepDungeonId } from '../src/world.ts';
import { generateDiveSite } from '../src/diving.ts';
import { generateGrotto } from '../src/grottoes.ts';

// No server/browser/transport: this exercises the actual render transaction with a storage-aware GL.
class TransactionGL {
  lost=false; error=0; fault=''; nullKind=''; created:any={program:0,buffer:0,vao:0,texture:0};
  allocated=new WeakSet(); boundTexture:any=null; unallocatedUpdates=0; heroUploads=0;
  constructor(){let next=1;const constants=new Map();return new Proxy(this,{get:(o:any,k:any)=>{
    if(k in o)return o[k];
    if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!constants.has(k))constants.set(k,next++);return constants.get(k);}
    return()=>{};
  }});}
  isContextLost(){return this.lost;}
  getError(){const error=this.error;this.error=0;return error||this.NO_ERROR;}
  getExtension(){return null;}
  createShader(){return{};}getShaderParameter(){return true;}
  resource(kind:string,index:number){this.created[kind]++;return this.nullKind===kind&&this.created[kind]===index?null:{};}
  createProgram(){return this.resource('program',1);}
  getProgramParameter(_p:any,k:any){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}
  createBuffer(){return this.resource('buffer',4);}
  createVertexArray(){return this.resource('vao',5);}
  createTexture(){return this.resource('texture',1);}
  bindTexture(_target:any,texture:any){this.boundTexture=texture;}
  texImage2D(){if(this.fault==='texture')throw new Error('texture upload');if(this.boundTexture)this.allocated.add(this.boundTexture);}
  texSubImage2D(){if(this.boundTexture&&!this.allocated.has(this.boundTexture)){this.unallocatedUpdates++;this.error=this.INVALID_OPERATION;}}
  bufferData(_target:any,data:any){if(data instanceof Float32Array&&data.length>6&&this.fault==='upload')throw new Error('buffer upload');}
  bufferSubData(){this.heroUploads++;if(this.fault==='hero')throw new Error('selected hero upload');}
  drawArrays(){if(this.fault==='draw')throw new Error('draw');if(this.fault==='loss')this.lost=true;if(this.fault==='error')this.error=this.INVALID_OPERATION;}
}
function context(log:any[],tag:string){return new Proxy({canvas:null as any,globalAlpha:1,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{
  get:(o:any,k:any)=>k in o?o[k]:(...args:any[])=>log.push([tag,k,...args]),
  set:(o:any,k:any,v:any)=>{if(k==='fillStyle'||k==='strokeStyle')log.push([tag,k,v]);o[k]=v;return true;},
});}
function withGPU(options:any,run:(x:any)=>void){
  const previous=(globalThis as any).WebGL2RenderingContext,gl:any=new TransactionGL();Object.assign(gl,options);
  const log:any[]=[],screen:any=context(log,'screen'),canvases:any[]=[],ground:any={width:390,height:844,getContext:()=>context(log,'ground')};
  let made=0;screen.canvas={width:390,height:844};(globalThis as any).WebGL2RenderingContext=TransactionGL;
  setCloseViewCanvasFactory(()=>{if(++made===1)return ground;const canvas={width:390,height:844,addEventListener(){},getContext:(kind:string)=>{if(kind==='webgl2'){if(!canvases.includes(canvas))canvases.push(canvas);return gl;}return context(log,'atlas');}};return canvas;});
  CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();resetCloseViewCamera();
  try{run({gl,log,screen,canvases});}finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();resetCloseViewCamera();setCloseViewCanvasFactory(null);if(previous===undefined)delete (globalThis as any).WebGL2RenderingContext;else (globalThis as any).WebGL2RenderingContext=previous;}
}
function game(){
  const g:any=createLabFixture({lab:'combat-assets',scenario:'cleaver-echo-inspection',now:100000}).game;
  g.presentation={effectiveQuality:'full',reduceMotion:false};
  g.save.equipment.primary.glyphs=['echo'];
  Object.assign(g.enemies[0],{fracRank:'rare',packName:'Transaction Native'});
  g.primaryAttack(100000,{x:1,y:0});g.tickGlyphs(.001,100250);
  assert.equal(g.glyphVisuals.filter((v:any)=>v.kind==='primaryEcho').length,1);
  g.glyphVisuals.find((v:any)=>v.kind==='primaryEcho').actual.shape='arc';
  const ready=Math.max(100250,g.player.attackReadyAt||0);assert.equal(g.fireSecondary(ready,{x:1,y:0}),true);assert.equal(g.projectiles.length,1);g.lastUpdateNow=ready+16;
  return g;
}

const hex = (r: number, g: number, b: number) => (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
function colours(kind: string) {
  const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS), n = writeCloseViewModel(out, 0, { kind, x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, amount: 0, pose: 'idle', alpha: 1 });
  const seen = new Map<number, number>(); for (let i = 0; i < n; i += MODEL_FLOATS) { const c = hex(out[i + 6], out[i + 7], out[i + 8]); seen.set(c, (seen.get(c) || 0) + 1); }
  return { seen, vertices: n / MODEL_FLOATS, out: out.subarray(0, n) };
}
// A floor of the Deep laid in `env` (the first floor of a shaft whose plan gives it), with the Wayfarer standing in it.
function deepGame(env: string | null, seed = 'DEEP-885') {
  const rx = 9, ry = 3, id = deepIdFor(seed, rx, ry); let floor = 0;
  for (let f = 1; f < 600 && !floor; f++) if ((floorPlan(seed, id, f).theme || null) === env) floor = f;
  assert.ok(floor, `a floor in ${env}`);
  const save: any = freshSave(); save.seed = seed; save.overworldCloseView = true; save.perception.aperture = 200; deepShaft(save, id).floor = floor;
  Object.assign(save.session, { area: 'overworld', rx, ry, x: 16, y: 16 }); Object.assign(save.position, { area: 'overworld', rx, ry, x: 16, y: 16 });
  const g: any = new Game(save, 100000); g.installSystems(); save.session.activeDungeonId = id; save.session.dungeonReturn = { rx, ry, x: 16, y: 16 }; g.loadArea('dungeon', false);
  g.lastUpdateNow = 100000; g.presentation = { effectiveQuality: 'full', reduceMotion: false }; g.renderObjectPredicate = (o: any) => perceived(o, save);
  return g;
}
function crossing(seed = 'DEEP-885') { // an ordinary crossing: the overworld switch on, then into a dungeon of the world
  const save: any = freshSave(); save.seed = seed; save.overworldCloseView = true; save.closeView = true;
  const g: any = new Game(save, 100000); g.installSystems(); g.lastUpdateNow = 100000;
  const map = { id: 'dungeon:DEEP-885:3:4:hollow', name: 'Hollow Relay', width: 24, height: 24, tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'deepFloor', blocked: false })), objects: [], entry: { x: 5, y: 5 } };
  return { save, g: { area: 'dungeon', map, player: { x: 5, y: 5, facing: 'down' }, save, message: '' } as any, game: g };
}
const sha = (a: Float32Array) => createHash('sha256').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex').slice(0, 16);

test('every place kind has its theme: the Deep takes its environment\'s, buildings and seed realms keep theirs', () => {
  const D = CV.CLOSE_VIEW_DEEP;
  for (const env of THE_DEEP.themes) assert.equal(CV.closeViewDeepThemeId({ deepFloor: 3, theme: env }), env ? D.byEnv[env] : D.none, `the Deep in ${env}`);
  assert.equal(CV.closeViewTheme({ deepFloor: 1, theme: 'fungal', tiles: [] }).id, 'deepFungal');
  assert.equal(CV.closeViewTheme({ deepFloor: 4, tiles: [] }).id, 'deepStone', 'a Deep floor laid with no environment');
  assert.equal(CV.closeViewTheme({ building: { style: 'hive', base: 'h' }, theme: 'fungal', tiles: [] }).id, 'hive', 'a building keeps its own');
  assert.equal(CV.closeViewTheme({ building: { pentagon: true, kind: 'cellar', base: 'p', floor: 1, node: 1 }, tiles: [] }).id, 'rootCellar');
  assert.equal(CV.closeViewTheme({ seedRealm: { realm: 'ship' }, tiles: [] }).id, 'starship');
  assert.equal(CV.closeViewTheme({ building: { style: 'apartment', base: 'a' }, tiles: [] }).id, 'arcology');
  // a real floor of the Deep, generated as a journey generates it
  const g = deepGame('fungal'); assert.equal(g.map.deepFloor > 0, true); assert.equal(CV.closeViewTheme(g.map).id, 'deepFungal');
  assert.equal(CV.closeViewPlace(g), 'deep');
  // its own palette: mossy dark stone, glowing teal growth, purple spores; not the keep's warm dressed stone
  const F = CV.CLOSE_VIEW.themes.deepFungal, K = CV.CLOSE_VIEW.themes.keep;
  assert.equal(F.wall.kind, 7, 'the Deep\'s living rock'); assert.equal(F.ceiling.kind, 5); assert.notDeepEqual(F.wall.rgb, K.wall.rgb);
  assert.ok(F.wall.rgb[1] > F.wall.rgb[0] && F.wall.rgb[1] > F.wall.rgb[2], 'green-dark stone'); assert.ok(F.glow[1] > F.glow[0] && F.glow[2] > F.glow[0], 'teal glow');
  assert.ok(F.deco2[2] > F.deco2[1] && F.deco2[0] > F.deco2[1], 'purple spores'); assert.equal(F.features.glowcap.form, 'cap', 'its glowcaps stand as giant caps, not wall blocks');
});

test('the Deep\'s themes are dark, bounded data with known materials and forms', () => {
  const D = CV.CLOSE_VIEW_DEEP, forms = new Set(['cap', 'shard', 'column', 'knot', 'pipe', 'slab', 'pool']);
  const ids = [...Object.values(D.byEnv), D.none]; assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) { const t: any = CV.CLOSE_VIEW.themes[id]; assert.ok(t, id); assert.ok(Object.isFrozen(t) && Object.isFrozen(t.wall), `${id}: frozen`);
    const amb = t.light.ambient.reduce((a: number, v: number) => a + v, 0) / 3, fog = t.fog.rgb.reduce((a: number, v: number) => a + v, 0) / 3;
    assert.ok(amb <= 16 && fog <= 12, `${id}: dark`); assert.ok(t.light.reach >= 4 && t.light.reach <= 7 && t.fog.far <= 14 && t.fog.near < t.fog.far, id);
    assert.ok([0, 1, 2, 3, 7].includes(t.wall.kind) && [0, 1, 2, 3, 5].includes(t.ceiling.kind), `${id}: materials`);
    assert.ok(t.light.sources.share > 0 && t.light.sources.share <= .2 && t.light.sources.spacing >= 3, `${id}: lights sparse`);
    if (t.wall.kind === 7) { assert.equal(t.cave.length, 6, `${id}: cave`); assert.ok(t.arch.none && t.ceiling.kind === 5, `${id}: a cave has no masonry arches or beams`); }
    if (t.light.sources.hue === 5) assert.ok(t.growth, `${id}: a glowing light grows from something`);
    for (const f of Object.values(t.features || {}) as any[]) assert.ok(forms.has(f.form), `${id}: ${f.form}`); }
});

test('existing themes build byte-identical static geometry; a Deep floor builds its rock, features and growths once, bounded', () => {
  const pins: any = { keep: 'df5937df0c6a8da2', 'lived-in': '51b46f7c28517157', hive: 'a4a32159df938d92', arcology: 'ca7144a07a0c76b7', cellar: '7b69ab280a95c4fe', heart: '08cf0f375a845582', 'grand-hall': 'fc394ff7b4f2f8be' };
  for (const [sc, want] of Object.entries(pins)) { resetCloseViewCamera(); const g = createLabFixture({ lab: 'close-view', scenario: sc, now: 1000 }).game; const st = CV.closeViewStatic(g.map);
    const h = createHash('sha256'); h.update(Buffer.from(st.data.buffer, st.data.byteOffset, st.data.byteLength)); h.update(Buffer.from(st.lightList.buffer)); h.update(Buffer.from(st.cardList.buffer));
    assert.equal(h.digest('hex').slice(0, 16), want, `${sc}: the release 884 geometry`); }
  const g = deepGame('fungal'), st = CV.closeViewStatic(g.map), again = CV.closeViewStatic(g.map);
  assert.equal(st.data, again.data, 'built once a floor and cached'); assert.ok(st.verts > 0 && st.verts < 200000, `bounded (${st.verts})`);
  const W = 20; let growth = 0, rock = 0, arches = 0; for (let i = 0; i < st.data.length; i += W) { const part = st.data[i + 9], mat = st.data[i + 10]; if (part >= 11.5 && part < 12.5) growth++; if (part === 0 && mat === 7) rock++; if (part === 4 || part === 5) arches++; }
  assert.ok(rock > 0, 'living-rock walls'); assert.ok(growth > 0, 'features and growths'); assert.equal(arches, 0, 'no masonry arches in a cave');
  const caps = g.map.tiles.filter((t: any) => t.kind === 'glowcap'); assert.ok(caps.length > 0, 'the floor has glowcaps');
  for (const t of caps.slice(0, 6)) { let face = false; for (let i = 0; i < st.data.length; i += W) if (st.data[i + 9] === 0 && st.data[i + 18] === t.x && st.data[i + 19] === t.y) face = true; assert.equal(face, false, `glowcap ${t.x},${t.y} is no wall block`); }
  const lights = st.lightList; let glow = 0; for (let i = 0; i < lights.length; i += CV.LIGHT_FLOATS) if (lights[i + 5] === 5) glow++; assert.ok(glow > 0, 'its lights are the theme\'s own glow');
  // a rebuilt copy of the same floor builds the same bytes (a resume, a revisit)
  const g2 = deepGame('fungal'); assert.equal(sha(CV.closeViewStatic(g2.map).data), sha(st.data));
});

test('Close View is allowed by place kind; ordinary dungeons refuse it, saying the view is occluded, and keep the setting', () => {
  const P = CV.CLOSE_VIEW_PLACES, place = (area: string, map: any) => CV.closeViewPlace({ area, map });
  assert.equal(place('overworld', {}), 'overworld');
  assert.equal(place('dungeon', { building: { style: 'keep' } }), 'keep'); assert.equal(place('dungeon', { building: { style: 'keep', castle: true } }), 'keep');
  assert.equal(place('dungeon', { building: { pentagon: true } }), 'pentagon'); assert.equal(place('dungeon', { building: { labyrinth: true, style: 'keep' } }), 'cube');
  assert.equal(place('dungeon', { building: { style: 'hive' } }), 'hive'); assert.equal(place('dungeon', { building: { style: 'apartment' } }), 'arcology');
  assert.equal(place('dungeon', { stillworks: {}, building: { arena: true } }), 'stillworks'); assert.equal(place('dungeon', { seedRealm: { realm: 'husk' } }), 'seedRealm');
  assert.equal(place('dungeon', { deepFloor: 7, theme: 'fungal' }), 'deep'); assert.equal(place('dungeon', { skyCloud: true }), 'sky'); assert.equal(place('dungeon', { canopy: { top: 3 } }), 'sky');
  // Tim, 2026-11-11: dive sites and grottoes refuse it; the Threefold Deep and the Starfield Deep Annex are ordinary dungeons
  assert.equal(place('dungeon', generateDiveSite('S', 'dive:S:1:1')), 'underwater'); assert.equal(place('dungeon', generateGrotto('S', 'grotto:S:1:1')), 'underwater');
  assert.equal(place('dungeon', generateDeepDungeon('S', deepDungeonId('S'))), 'crossing', 'the Threefold Deep');
  assert.equal(place('dungeon', { id: 'dungeon:S:g1:4:5:x:annex3', theme: 'geode' }), 'crossing', 'a Starfield Deep Annex floor');
  assert.equal(place('dungeon', { id: 'proving:combat:ashling:0' }), 'lab');
  for (const id of ['dungeon:S:1:2:hollow', 'the-deep-v1:x', 'hunt-instance:x', 'elite-portal:x', 'x:annex2']) assert.equal(place('dungeon', { id, theme: 'fungal' }), 'crossing', id);
  for (const [k, v] of Object.entries(P.allowed)) assert.equal(v, k !== 'crossing' && k !== 'underwater', k);
  assert.equal(P.occluded, 'The view is occluded.');
  // in a crossing: the switch stays on but does not apply; the Oculus refuses with the HUD message and changes nothing
  const { g, save } = crossing(), before = JSON.stringify({ c: save.closeView, w: save.overworldCloseView });
  assert.equal(CV.overworldCloseViewApplies(g), false); assert.equal(CV.closeViewApplies(g), false); assert.equal(CV.closeViewWanted(g), false);
  OCULUS_HOOKS.gpu = () => true;
  try {
    assert.deepEqual(oculusAvailable(g), { ok: false, why: 'The view is occluded.' });
    assert.equal(pressOculus(g, 1000, () => true), false); assert.equal(g.message, 'The view is occluded.'); assert.equal(g.oculus ?? null, null);
    assert.equal(JSON.stringify({ c: save.closeView, w: save.overworldCloseView }), before, 'both switches kept');
    // the same switch, back on the overworld (or in the Deep), applies again
    const out = { ...g, area: 'overworld', map: { width: 32, height: 32, tiles: Array.from({ length: 1024 }, () => ({ kind: 'grass' })) } };
    assert.equal(CV.overworldCloseViewApplies(out), true);
    const deep = deepGame('fungal'); assert.equal(CV.overworldCloseViewApplies(deep), true);
    assert.equal(oculusAvailable(deep).ok, true); assert.equal(oculusAvailable(deep).setting, 'overworldCloseView');
  } finally { OCULUS_HOOKS.gpu = null; }
});

test('Close View draws in the Deep with its theme; a crossing with the switch on shows the top-down view', () => withGPU({}, (h: any) => {
  const g = deepGame('fungal'), frame = (game: any) => { h.log.length = 0; render(h.screen, game, 390, 844, game.lastUpdateNow); return closeViewShowing(game); };
  assert.equal(frame(g), true); assert.equal(closeViewGLStats.theme, 'deepFungal');
  const lab = createLabFixture({ lab: 'combat', scenario: '', now: 100000 }).game as any; lab.presentation = { effectiveQuality: 'low', reduceMotion: true }; lab.save.overworldCloseView = true;
  assert.equal(frame(lab), true, 'the Proving Ground\'s fixtures stay open to it');
  const { game } = crossing(); const save = game.save; save.session.activeDungeonId = 'dungeon:DEEP-885:3:4:hollow';
  game.area = 'dungeon'; game.map = { ...crossing().g.map }; game.player.x = 5; game.player.y = 5; game.presentation = { effectiveQuality: 'low', reduceMotion: true };
  assert.equal(frame(game), false, 'refused in a crossing'); assert.equal(save.overworldCloseView, true, 'the setting is kept');
}));

test('Aperture crystals float as emissive models, bob bounded, turn slowly, still under Reduced Motion', () => {
  const P = CV.CLOSE_VIEW_PROPS, C = P.crystal, E = new Set(CLOSE_VIEW_ACTOR_LOOK.emissive);
  for (const kind of ['apertureCrystal', 'apertureRift']) { assert.ok(modelSupported(kind), kind); assert.ok(modelTriangleCount(kind) <= 256);
    const { seen } = colours(kind); assert.ok([...seen.keys()].some((c) => E.has(c)), `${kind} is lit from within`); }
  assert.ok(colours('apertureCrystal').seen.has(0xc58cff), 'violet, as the standard view\'s diamond');
  assert.equal(P.objects.apertureMemory, 'apertureCrystal'); assert.equal(P.objects.apertureRelic, 'apertureCrystal'); assert.equal(P.objects.apertureDoor, 'apertureRift');
  let lo = Infinity, hi = -Infinity; const o = { x: 7, y: 4, visualTier: 3 };
  for (let t = 0; t < 20000; t += 37) { const q = CV.closeViewPropPose('apertureCrystal', o, t); lo = Math.min(lo, q.lift); hi = Math.max(hi, q.lift); assert.ok(Number.isFinite(q.yaw)); }
  assert.ok(lo >= C.hover - C.bob - 1e-9 && hi <= C.hover + C.bob + 1e-9, `bob within ${C.bob} (${lo}..${hi})`); assert.ok(hi - lo > C.bob, 'it does bob'); assert.ok(lo > .5, 'hovering in the air, not on the floor');
  const a = CV.closeViewPropPose('apertureCrystal', o, 1000, true), b = CV.closeViewPropPose('apertureCrystal', o, 9000, true); assert.deepEqual(a, b, 'held still under Reduced Motion'); assert.equal(a.lift, C.hover);
  const turn = CV.closeViewPropPose('apertureCrystal', o, 1000).yaw - CV.closeViewPropPose('apertureCrystal', o, 0).yaw; assert.ok(turn > 0 && turn < 2 * Math.PI / 6, 'a slow turn: under a sixth of a turn a second');
  assert.ok(CV.closeViewPropPose('apertureCrystal', o, 0).scale > CV.closeViewPropPose('apertureCrystal', { ...o, visualTier: 1 }, 0).scale, 'the relic is larger');
});

test('in the GPU scene the crystals, the Ember Door and the Oculus\'s dais are models, and their flat marks are left off', () => withGPU({}, (h: any) => {
  const g = deepGame('fungal'), p = g.player, near = (kind: string, dx: number, dy: number) => { const o = g.map.objects.find((q: any) => q.kind === kind); assert.ok(o, kind); o.x = Math.floor(p.x) + dx; o.y = Math.floor(p.y) + dy; return o; };
  // clear a little room round the Wayfarer so every prop is in plain sight
  const W = g.map.width; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const t = g.map.tiles[(Math.floor(p.y) + y) * W + Math.floor(p.x) + x]; if (t) Object.assign(t, { blocked: false, kind: 'fungusFloor', environment: undefined }); }
  g.map._dungeonRevealMode = 'full'; g.enemies = []; near('apertureRelic', 0, -2); near('apertureMemory', 1, -2); near('emberDoor', -1, -2);
  g.oculus = { x: Math.floor(p.x), y: Math.floor(p.y) + 1, born: 99000, until: 104000, to: 'top', setting: 'overworldCloseView', map: g.map };
  let flat = 0; const layer = () => { if (!CV.closeViewDrawsProps()) flat++; }; CLOSE_VIEW_HOOKS.groundLayers.push(layer);
  try { render(h.screen, g, 390, 844, 100000); } finally { CLOSE_VIEW_HOOKS.groundLayers.pop(); }
  assert.equal(closeViewShowing(g), true); assert.equal(flat, 0, 'the floor layer is told to leave the flat marks off');
  assert.ok(closeViewGLStats.props >= 3, `props drawn as models (${closeViewGLStats.props})`); assert.ok(closeViewGLStats.props <= CV.CLOSE_VIEW_PROPS.cap);
  // the floor under a standing glowcap shows its neighbour, not the glowcap's flat top-down art
  assert.ok(h.log.some((q: any) => q[0] === 'ground' && q[1] === 'drawImage'), 'feature tiles re-floored on the ground texture');
}));

test('the Oculus\'s dais in Close View is the standard view\'s blue, whichever way it leads', () => {
  const { seen } = colours('oculusDais'), E = new Set(CLOSE_VIEW_ACTOR_LOOK.emissive), blue = (c: number) => (c & 255) > (c >> 16) && (c & 255) >= ((c >> 8) & 255) * .9;
  assert.ok(seen.has(0x7fe7ff) && E.has(0x7fe7ff), 'a glowing blue iris and lens'); assert.ok(seen.has(0x1c4a52), 'the standard view\'s dark teal rim (OCULUS.colors.close.rim)');
  for (const c of seen.keys()) assert.ok(blue(c) || ((c >> 8) & 255) >= (c >> 16), `${c.toString(16)}: no amber or purple`);
  const glow = CV.CLOSE_VIEW_PROPS.glow.oculusDais; assert.ok(glow[2] >= glow[1] && glow[1] > glow[0], 'its light is blue');
  assert.equal(OCULUS.colors.close.rim, '#1c4a52'); assert.equal(CV.CLOSE_VIEW_PROPS.dais.open, OCULUS.open); assert.equal(CV.CLOSE_VIEW_PROPS.dais.fade, OCULUS.fade);
  assert.ok(Object.keys(CLOSE_VIEW_PROP_MODELS).includes('oculusDais') && modelTriangleCount('oculusDais') <= 256);
  const a = CV.closeViewPropPose('oculusDais', { x: 1, y: 1, to: 'top' }, 500), b = CV.closeViewPropPose('oculusDais', { x: 1, y: 1, to: 'close' }, 500); assert.deepEqual(a, b, 'the same dais toward either view');
});

test('walking into a refused place with Close View on says the view is occluded, once per entry; allowed places say nothing', () => {
  const C = CV.CLOSE_VIEW_PLACES.occluded, save: any = freshSave(); save.seed = 'DEEP-885'; save.overworldCloseView = true;
  const g: any = new Game(save, 100000); g.installSystems();
  const enter = (id: string) => { g.message = ''; save.session.activeDungeonId = id; save.session.dungeonReturn = { rx: g.rx, ry: g.ry, x: 16, y: 16 }; g.loadArea('dungeon', false); return g.message; };
  const said = enter(deepDungeonId('DEEP-885')); assert.ok(said.includes(C), `the Threefold Deep: ${said}`);
  assert.equal(said.split(C).length - 1, 1, 'said once'); assert.equal(save.overworldCloseView, true, 'the setting is kept');
  for (let i = 0; i < 20; i++) g.update(.016, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, 100000 + i * 16);
  assert.equal(String(g.message).split(C).length - 1 <= 1, true, 'not repeated every frame');
  g.message = ''; g.loadArea('overworld', false); assert.equal(String(g.message).includes(C), false, 'nothing on the overworld');
  const deep = deepGame('fungal'); assert.equal(String(deep.message).includes(C), false, 'nothing in the Deep');
  save.overworldCloseView = false; save.closeView = false; assert.equal(enter(deepDungeonId('DEEP-885')).includes(C), false, 'nothing with Close View off');
});
