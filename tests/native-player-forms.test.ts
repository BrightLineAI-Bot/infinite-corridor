import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, BRAWLER_GEAR } from '../src/game.ts';
import { migrateSave } from '../src/types.ts';
import { learnApertureSkill } from '../src/items.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { playerFormPresentation, playerFormModelKey, PLAYER_HELD_PROFILES } from '../src/close-view-player-presentation.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelTriangleCount, writeCloseViewModel } from '../src/close-view-models.ts';
import { CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory, closeViewPlayerAction } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { render, drawNativePlayerDecorations } from '../src/renderer.ts';
import { orreryPress, tickOrrery } from '../src/tool-forms.ts';
const kinds=['playerIronFists','playerRobot','playerPowerSuit','playerEmberForm'];
const idle={state:{x:0,y:0},consume:()=>false,held:()=>false};
function fixture(scenario='terrain-ramps',lab='close-view') { const {game:g}=createLabFixture({lab,scenario,now:100000});g.enemies=[];g.presentation={effectiveQuality:'full',reduceMotion:true};g.save.perception.aperture=3255;return g; }
function activate(g,kind) {
  if(kind==='playerIronFists')g.save.equipment.primary={...BRAWLER_GEAR[0].item};
  else if(kind==='playerEmberForm'){assert.equal(learnApertureSkill(g.save,'ember-form').ok,true);assert.equal(g.activateApertureSkill('ember-form'),true);}
  else {g.save.farArray={listeners:3,gate:3};g.save.consumables.submersible=1;g.save.materials.cinderIron=10;assert.equal(g.useConsumable('submersible',100000),true);if(kind==='playerPowerSuit')assert.equal(g.useConsumable('submersible',100000),true);}
  assert.equal(playerFormPresentation(g)?.kind,kind);
}
function mesh(kind,extra={}){const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),n=writeCloseViewModel(out,0,{kind,x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose:'idle',amount:0,reduceMotion:true,...extra});return out.slice(0,n);}
const positions=a=>Array.from(a).filter((_,i)=>i%MODEL_FLOATS<3);
const ctx=(log=[])=>new Proxy({canvas:null,globalAlpha:1,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:(...args)=>log.push([k,...args]),set:(o,k,v)=>{o[k]=v;return true;}});
class MockGL {
  uploads=[];program=null;
  constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}
  isContextLost(){return false;}createShader(){return{};}createProgram(){return{shaders:[]};}shaderSource(s,t){s.text=t;}attachShader(p,s){p.shaders.push(s);}useProgram(p){this.program=p;}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}
  bufferData(t,d){if(d instanceof Float32Array&&this.program?.shaders?.some(s=>s.text.includes('in float a_alpha')))this.uploads.push(Float32Array.from(d));}
}
function gpu(run){const old=globalThis.WebGL2RenderingContext;globalThis.WebGL2RenderingContext=MockGL;const gl=new MockGL(),log=[],screen=ctx(log),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:ctx(log)};screen.canvas=canvas;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();try{run({gl,log,screen});}finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);if(old===undefined)delete globalThis.WebGL2RenderingContext;else globalThis.WebGL2RenderingContext=old;}}


test('real equipment, mech cycle and timed Ember activation select forms without activating gameplay',()=>{
  for(const kind of kinds){const g=fixture();assert.equal(playerFormPresentation(g),null);activate(g,kind);const before=structuredClone(g.save),player=structuredClone(g.player);for(let i=0;i<3;i++)playerFormPresentation(g);assert.deepEqual(g.save,before);assert.deepEqual(g.player,player);
    if(kind==='playerIronFists'){g.save.equipment.primary=null;assert.equal(playerFormPresentation(g),null);}
    else if(kind==='playerEmberForm'){const active=structuredClone(g.save.magicSkills.active);assert.equal(g.activateApertureSkill('ember-form'),false);assert.deepEqual(g.save.magicSkills.active,active);g.save.magicSkills.active.remaining=.01;g.update(.05,idle,100050);assert.equal(playerFormPresentation(g),null);}
    else {if(kind==='playerRobot')assert.equal(g.useConsumable('submersible',100010),true);assert.equal(playerFormPresentation(g).kind,'playerPowerSuit');assert.equal(g.useConsumable('submersible',100020),true);assert.equal(playerFormPresentation(g),null);}
  }
});

test('every form retains its authored body with every known held profile within 256 triangles',()=>{
  for(const kind of kinds)for(const held of PLAYER_HELD_PROFILES){const key=playerFormModelKey({kind},held),n=modelTriangleCount(key),data=mesh(key);assert.ok(n>0&&n<=256,`${key}: ${n}`);assert.equal(data.length,30*n);assert.ok(data.every(Number.isFinite));const body=mesh(kind);assert.deepEqual(Array.from(data.slice(0,body.length)),Array.from(body),`${key} keeps the body`);}
  for(const kind of kinds){const key=kind+':fist',idle=positions(mesh(key)),rush=positions(mesh(key,{pose:'fist',amount:.3,fistStep:1})),jab=positions(mesh(key,{pose:'fist',amount:.3,fistStep:2})),upper=positions(mesh(key,{pose:'fist',amount:.3,fistStep:3}));assert.notDeepEqual(rush,idle);assert.notDeepEqual(jab,rush);assert.notDeepEqual(upper,rush);assert.notDeepEqual(rush,positions(mesh(key,{pose:'attack',amount:.3})),'punches are not blade cuts');assert.notDeepEqual(positions(mesh(key,{pose:'fistCharge',amount:1})),idle);}
});

test('canonical primaries retain each special form existing melee-held recipe without expanding caps',()=>{
  for(const kind of kinds)for(const held of ['salvage-blade','cinder-pike','verge-cleaver']){const form={kind},key=playerFormModelKey(form,held);assert.equal(key,`${kind}:melee`);assert.equal(modelTriangleCount(key),modelTriangleCount(`${kind}:melee`));assert.ok(modelTriangleCount(key)<=256);assert.deepEqual(mesh(key),mesh(`${kind}:melee`));}
});

test('canonical named tools retain each special form through its existing native equipment family',()=>{
  const tools={'rift-bombard':'emitter',blunderbuss:'emitter','lumen-spindle':'emitter','great-sweep':'sweep'};
  for(const kind of kinds)for(const [tool,family] of Object.entries(tools)){const key=playerFormModelKey({kind},tool),expected=`${kind}:${family}`,body=mesh(kind),data=mesh(key);assert.equal(key,expected,`${kind}/${tool}`);assert.equal(modelTriangleCount(key),modelTriangleCount(expected));assert.ok(modelTriangleCount(key)>0&&modelTriangleCount(key)<=256,`${key}: ${modelTriangleCount(key)}`);assert.deepEqual(Array.from(data.slice(0,body.length)),Array.from(body),`${key} retains the authored form body`);if(family==='emitter')assert.ok(data.length>body.length,`${key} retains visible generic emitter equipment`);}
});

test('normal fallback primaries have distinct bounded silhouettes and immediate committed motion',()=>{
  const pike=mesh('playerCinderPike'),cleaver=mesh('playerVergeCleaver');
  for(const kind of ['playerCinderPike','playerVergeCleaver']){assert.ok(modelTriangleCount(kind)>0&&modelTriangleCount(kind)<=256);assert.ok(mesh(kind).every(Number.isFinite));const idle=positions(mesh(kind)),contact=positions(mesh(kind,{pose:'attack',amount:.08})),end=positions(mesh(kind,{pose:'attack',amount:1}));assert.notDeepEqual(contact,idle,`${kind} commits by 19.2ms`);assert.deepEqual(end,idle,`${kind} returns to ready hold`);}
  assert.notDeepEqual(positions(pike),positions(cleaver),'Pike shaft and Cleaver blade are not aliases');
  assert.notDeepEqual(positions(mesh('playerCinderPike',{pose:'attack',amount:.2})),positions(mesh('playerVergeCleaver',{pose:'attack',amount:.2})),'thrust and broad cut remain distinct');
});

test('normal native fallback keeps the canonical silhouette from idle through accepted recovery',()=>gpu(({screen})=>{
  for(const [scenario,kind] of [['pike-spindle-hound','playerCinderPike'],['cleaver-bombard-crawler','playerVergeCleaver']]){const g=fixture(scenario,'combat-assets');resetCloseViewCamera();render(screen,g,390,844,100000);assert.equal(closeViewGLStats.modelTriangles,modelTriangleCount(kind),`${kind} idle`);g.primaryAttack(100000);render(screen,g,390,844,100000);assert.equal(closeViewGLStats.modelTriangles,modelTriangleCount(kind),`${kind} accepted`);g.update(.24,idle,100240);render(screen,g,390,844,100240);assert.equal(closeViewGLStats.modelTriangles,modelTriangleCount(kind),`${kind} recovered`);}
}));

test('canonical player gear never replaces a live nonplayer model',()=>gpu(({screen})=>{
  for(const [item,playerKind] of [[{id:'primary-cinder-pike',name:'Cinder Pike',slot:'primary'},'playerCinderPike'],[{id:'primary-verge-cleaver',name:'Verge Cleaver',slot:'primary'},'playerVergeCleaver']]){const {game:g}=createLabFixture({lab:'combat-assets',scenario:'pike-spindle-hound',now:100000});g.save.equipment.primary=item;g.presentation={effectiveQuality:'full',reduceMotion:true};assert.ok(g.enemies.length>0);const enemyKind=g.enemies[0].kind;resetCloseViewCamera();render(screen,g,390,844,100000);assert.equal(closeViewGLStats.models,2,item.name);assert.equal(closeViewGLStats.modelTriangles,modelTriangleCount(playerKind)+modelTriangleCount(enemyKind),`${item.name} retains ${enemyKind}`);}
}));

test('accepted fist combo identity survives pause and schema-14 reload; refusal keeps prior motion',()=>{
  const g=fixture();activate(g,'playerIronFists');
  for(const step of [1,2,3]){const now=100000+step*100;assert.equal(g.fistPress(now,{x:1,y:0}),true);assert.equal(g.player.attackVisual.fistStep,step);assert.equal(g.player.attackVisual.profile,'fist');assert.equal(g.effects.at(-1).kind,step===3?'fist-uppercut':'iron-fist');}
  const visual=structuredClone(g.player.attackVisual),until=g.player.attackUntil;assert.equal(g.fistPress(100301,{x:0,y:1}),false);assert.deepEqual(g.player.attackVisual,visual);assert.equal(g.player.attackUntil,until);
  g.setPaused(true,100350);const amount=closeViewPlayerAction(g,100350).amount,saved=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(900000))));assert.equal(saved.version,14);assert.equal(saved.session.playerRuntime.attackVisual.fistStep,3);const back=new Game(saved,1000000);assert.equal(back.player.attackVisual.fistStep,3);assert.equal(closeViewPlayerAction(back,back.pauseStarted).amount,amount);back.setPaused(false,1100000);assert.equal(closeViewPlayerAction(back,1100000).amount,amount);
  const charge=fixture();activate(charge,'playerIronFists');assert.equal(charge.fistPress(100000,{x:0,y:1},'attack'),true);const before=structuredClone(charge.fistCharge);assert.equal(charge.fistPress(100010),false);assert.deepEqual(charge.fistCharge,before);
});


test('actual accepted tool producers keep every native form and use existing model passes',()=>gpu(({gl,screen})=>{
  const cases=[['blade-spark-ashling','emitter'],['blade-hammerfall-brute','hammer'],['cleaver-sweep-marshal','sweep'],['cleaver-mirage-stalker','mirage'],['blade-orrery-sentinel','orrery-tap']];
  let calls=0;
  for(const kind of kinds)for(const [scenario,held] of cases){const g=fixture(scenario,'combat-assets');activate(g,kind);resetCloseViewCamera();g.player.attackReadyAt=0;assert.equal(g.fireSecondary(100010,{x:0,y:-1}),true,`${kind}/${held}`);assert.equal(g.player.attackVisual.profile,held);const prior=structuredClone(g.player.attackVisual);assert.equal(g.fireSecondary(100011,{x:1,y:0}),false);assert.deepEqual(g.player.attackVisual,prior);
    const map=g.map,p=g.player,save=g.save,xy=[p.x,p.y],mech=structuredClone(save.mech),active=structuredClone(save.magicSkills.active);
    render(screen,g,390,844,100050);assert.equal(closeViewGLStats.models,1,`${kind}/${held}`);assert.equal(closeViewGLStats.modelTriangles,modelTriangleCount(kind+':'+held),`${kind}/${held} exact body plus held part`);assert.ok(gl.uploads.at(-1).every(Number.isFinite));assert.equal(g.map,map);assert.equal(g.player,p);assert.equal(g.save,save);assert.deepEqual([p.x,p.y],xy);assert.deepEqual(save.mech,mech);assert.deepEqual(save.magicSkills.active,active);if(!calls)calls=closeViewGLStats.drawCalls;assert.ok(closeViewGLStats.drawCalls<=calls+2,'only the existing residual board/glow passes may become nonempty');
    if(held==='orrery-tap'){assert.equal(orreryPress(g,100060,{x:1,y:0},'tool'),true);tickOrrery(g,.25,100070,true);tickOrrery(g,.01,100080,false);assert.equal(g.player.attackVisual.profile,'orrery-release');render(screen,g,390,844,100090);assert.equal(closeViewGLStats.modelTriangles,modelTriangleCount(kind+':orrery-release'));}
  }
}));

test('actual accepted named tools select the mapped native form family without changing their identity',()=>gpu(({gl,screen})=>{
  const cases=[['cleaver-bombard-crawler','rift-bombard','emitter'],['blade-arc-wave-wisp','blunderbuss','emitter'],['pike-spindle-hound','lumen-spindle','emitter'],['cleaver-sweep-marshal','great-sweep','sweep']];
  for(const kind of ['playerRobot','playerPowerSuit','playerEmberForm'])for(const [scenario,tool,family] of cases){const g=fixture(scenario,'combat-assets');activate(g,kind);resetCloseViewCamera();g.player.attackReadyAt=0;g.toolReadyAt=0;assert.equal(g.fireSecondary(100010,{x:0,y:-1}),true,`${kind}/${tool}`);assert.equal(g.player.attackVisual.toolKind,tool);render(screen,g,390,844,100050);const key=`${kind}:${family}`,body=mesh(kind),data=mesh(key);assert.equal(closeViewGLStats.models,1,`${kind}/${tool}`);assert.equal(closeViewGLStats.modelTriangles,modelTriangleCount(key),`${kind}/${tool} keeps ${family}`);assert.ok(closeViewGLStats.modelTriangles<=256);assert.ok(gl.uploads.at(-1).every(Number.isFinite));assert.deepEqual(Array.from(data.slice(0,body.length)),Array.from(body),`${kind}/${tool} retains body`);}
}));

test('native forms retain burn, poison, knockdown and exact paused geometry without fake Ember flames',()=>gpu(({gl,screen})=>{
  for(const kind of kinds){const g=fixture();activate(g,kind);g.player.castUntil=0;resetCloseViewCamera();render(screen,g,390,844,100100);const plain=gl.uploads.at(-1),decals=closeViewGLStats.decals;
    g.playerFire={left:2};g.save.elites.status.poison=2;render(screen,g,390,844,100100);assert.equal(closeViewGLStats.models,1);assert.equal(closeViewGLStats.decals,decals+3,`${kind} only actual burn adds fire cards`);const poison=gl.uploads.at(-1);assert.notDeepEqual(Array.from(plain).filter((_,i)=>i%10>=6&&i%10<=8),Array.from(poison).filter((_,i)=>i%10>=6&&i%10<=8));
    g.player.stunnedAt=100000;g.player.stunnedUntil=101000;g.setPaused(true,100400);render(screen,g,390,844,100500);const knocked=gl.uploads.at(-1);assert.notDeepEqual(positions(poison),positions(knocked));render(screen,g,390,844,130000);assert.deepEqual(positions(gl.uploads.at(-1)),positions(knocked));assert.equal(closeViewGLStats.models,1);assert.equal(closeViewGLStats.decals,decals+3);assert.ok(closeViewGLStats.boards>=1,'stun sparks retained');
    g.presentation={effectiveQuality:'low',reduceMotion:true,safeMode:true};render(screen,g,390,844,140000);assert.equal(closeViewGLStats.models,1);assert.ok(closeViewGLStats.modelTriangles<=256);
  }
}));

test('actual boost adds one body lift and preserves bounded residual mech cues',()=>gpu(({gl,screen})=>{
  for(const kind of ['playerRobot','playerPowerSuit']){const g=fixture();activate(g,kind);g.player.castUntil=0;resetCloseViewCamera();render(screen,g,390,844,100100);const ground=gl.uploads.at(-1);g.mechBoosting=true;render(screen,g,390,844,100100);const up=gl.uploads.at(-1);assert.equal(up.length,ground.length);for(let i=2;i<up.length;i+=MODEL_FLOATS)assert.ok(Math.abs(up[i]-ground[i]-.22)<1e-5,'boost applied once');
    const a=[],b=[];drawNativePlayerDecorations(ctx(a),g,32,100100);drawNativePlayerDecorations(ctx(b),g,32,110000);assert.deepEqual(a,b,'reduced motion residual effects freeze');assert.equal(a.filter(r=>r[0]==='fillRect').length,kind==='playerPowerSuit'?4:3,'plate, fuel and empowered marker');assert.equal(a.filter(r=>r[0]==='closePath').length,2,'two jet triangles');assert.equal(a.filter(r=>r[0]==='arc').length,kind==='playerPowerSuit'?1:0,'real empowered furnace only');
  }
}));

test('suit spiral sits outside the chest and uses the existing frozen clock, while actual jumps freeze their lift',()=>gpu(({gl,screen})=>{
  const a=mesh('playerPowerSuit',{reduceMotion:false,effectTime:1000}),b=mesh('playerPowerSuit',{reduceMotion:false,effectTime:2000});assert.notDeepEqual(positions(a),positions(b),'the authored spiral slowly turns');assert.deepEqual(positions(mesh('playerPowerSuit',{effectTime:1000})),positions(mesh('playerPowerSuit',{effectTime:2000})),'quiet spiral freezes');
  let glyph=0;for(let i=0;i<a.length;i+=10)if(Math.abs(a[i+6]-0xb9/255)<1e-6&&Math.abs(a[i+7]-0x92/255)<1e-6){assert.ok(a[i]>.31*.82,'sigil stays in front of the chest plate');glyph++;}assert.equal(glyph,60,'two arms and core, twenty triangles');
  const g=fixture();activate(g,'playerIronFists');g.update(.01,{...idle,consume:k=>k==='jump'},100000);assert.ok(g.jumpUntil>100000);g.setPaused(true,100120);resetCloseViewCamera();render(screen,g,390,844,100130);const before=positions(gl.uploads.at(-1));render(screen,g,390,844,100999);assert.deepEqual(positions(gl.uploads.at(-1)),before,'actual jump pose and support lift freeze together');
}));

test('canonical gallery bodies submit natively; held charge pauses but remains runtime-only across reload',()=>gpu(({gl,screen})=>{
  for(const [id,kind] of [['wayfarer-iron-fists','playerIronFists'],['wayfarer-active-robot','playerRobot'],['wayfarer-empowered-suit','playerPowerSuit'],['wayfarer-ember-form','playerEmberForm']]){const g=fixture(id,'creature-assets');assert.equal(playerFormPresentation(g).kind,kind);resetCloseViewCamera();render(screen,g,390,844,100010);assert.equal(closeViewGLStats.models,1,id);assert.deepEqual({...closeViewGLStats.modelFallbacks},{},id);}
  const g=fixture('wayfarer-iron-fists','creature-assets');assert.equal(g.fistPress(100000,{x:1,y:0},'attack'),true);resetCloseViewCamera();render(screen,g,390,844,100000);const start=positions(gl.uploads.at(-1));render(screen,g,390,844,100900);const charged=positions(gl.uploads.at(-1));assert.notDeepEqual(charged,start);g.setPaused(true,100900);render(screen,g,390,844,900000);assert.deepEqual(positions(gl.uploads.at(-1)),charged);
  const saved=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(900000))));g.setPaused(false,1000000);render(screen,g,390,844,1000000);assert.deepEqual(positions(gl.uploads.at(-1)),charged,'pause shifts the existing charge clock');const back=new Game(saved,1000000);back.enemies=[];back.presentation=g.presentation;assert.equal(back.fistCharge,undefined,'unaccepted held input remains runtime-only, matching Game');assert.equal(closeViewPlayerAction(back,back.pauseStarted).active,false);resetCloseViewCamera();render(screen,back,390,844,1100000);assert.equal(closeViewGLStats.models,1);assert.notDeepEqual(positions(gl.uploads.at(-1)),charged,'reload does not synthesize a held input or punch');
}));
