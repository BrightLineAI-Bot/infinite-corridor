import test from 'node:test';
import assert from 'node:assert/strict';
import { render, rendererDiagnostics } from '../src/renderer.ts';
import { freshSave } from '../src/types.ts';
import { liftAt, safeVoidScarTransition } from '../src/landscape.ts';
import { drawTraversalCues, drawHazardBrinks } from '../src/landscape-render.ts';
import { consumeVoidTerrain } from '../src/world-beasts.ts';
import { createCombatant } from '../src/combat.ts';
import { applyDungeonDiscovery, dungeonPointDiscovered, revealDungeonAt, dungeonChunkId } from '../src/dungeon-framework.ts';

// Dependency-free command canvas exercises the production renderer, including its offscreen ground cache.
// Pixel-level visual proof is generated separately by the installed native canvas in .local-validation.
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
function fixture({ discovered = false, scar = true, actors = false, objects = false } = {}) {
  const width = 24, height = 24;
  const map = { name: 'Void fog regression', width, height, levelStableId: 'fog-floor', dungeonContract: { discoveryEnabled: true, graph: { chunks: [] } },
    tiles: Array.from({ length: width * height }, (_, i) => { const x = i % width, y = Math.floor(i / width), inside = Math.hypot(x - 14, y - 12) <= 3.5;
      return { x, y, kind: scar && inside ? 'voidScar' : x === 15 ? 'wall' : 'floor', blocked: !(scar && inside) && x === 15, elev: 0 }; }), objects: [], wallGlints: [] };
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) map.dungeonContract.graph.chunks.push({ id: `fog-floor:${cx},${cy}`, cx, cy });
  const ids = []; for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < (discovered ? 4 : 2); cx++) ids.push(`fog-floor:${cx},${cy}`);
  applyDungeonDiscovery(map, ids);
  map._voidScarCircles = [{ x: 14.5, y: 12.62, radius: 3.5, visualLift: 0 }]; map._voidScarLegacyCells = [];
  if (objects) map.objects = [{ id: 'hidden-chest', kind: 'cache', x: 14, y: 10, state: 'closed' }, { id: 'hidden-shrine', kind: 'shrine', x: 16, y: 13 }, { id: 'hidden-checkpoint', kind: 'checkpoint', x: 14, y: 14 }, { id: 'hidden-memory', kind: 'apertureMemory', x: 15, y: 9 }];
  const enemy = createCombatant('voidWalker', 15, 13, false, []); enemy.telegraph = .4; enemy.eliteWindup = .3;
  return { area: 'dungeon', rx: 0, ry: 0, map, save: freshSave(), player: { x: 11, y: 12, facing: 'right', walkPhase: 0 }, enemies: actors ? [enemy] : [], effects: [], projectiles: [], packEffects: [], eliteHazards: [], glyphVisuals: [], echoPatches: [], presentation: { effectiveQuality: 'low', weather: false, reduceMotion: true } };
}
function nova(stage = 'charge') { return { kind: 'voidNova', id: 'fog-nova', owner: 'fog-walker', x: 14, y: 12, radius: 3.5, stage, elapsed: 1.8, age: 1.8, life: 5, arming: 0 }; }
function capture(g, { cached = false, now = 1800 } = {}) {
  const prior = globalThis.OffscreenCanvas;
  try {
    if (cached) globalThis.OffscreenCanvas = CommandCanvas; else delete globalThis.OffscreenCanvas;
    const canvas = new CommandCanvas(576, 480); if (!cached) canvas.context.getTransform = undefined;
    render(canvas.context, g, 576, 480, now);
    return structuredClone(canvas.context.calls);
  } finally { if (prior === undefined) delete globalThis.OffscreenCanvas; else globalThis.OffscreenCanvas = prior; }
}
function deepFreeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.freeze(value); for (const v of Object.values(value)) deepFreeze(v); return value; }
function allCalls(calls) { return calls.flatMap(call => call[0] === 'drawImage' ? [call, ...allCalls(call[1])] : [call]); }
function styleCalls(calls, style) { return allCalls(calls).filter(call => call.at(-1)?.fillStyle === style || call.at(-1)?.strokeStyle === style); }

for (const cached of [false, true]) {
  const path = cached ? 'cached ground' : 'per-tile fallback';
  test(`Void aftermath is crisp white with deterministic static red fractures (${path})`, () => {
    const g = fixture({ discovered: true });
    const first = capture(g, { cached, now: 1000 }), later = capture(g, { cached, now: 55000 });
    assert.deepEqual(later, first, 'scar does not animate as presentation time advances');
    assert.ok(styleCalls(first, '#fffefd').length > 0, 'scar paints white solid floor');
    assert.ok(styleCalls(first, '#ba3e4d').length > 0, 'scar paints red fractures');
    assert.ok(allCalls(first).some(call => call[0] === 'arc' && call[1] === 14.5 * 44 && call[2] === 12.62 * 44 && call[3] === 3.5 * 44), 'scar uses an exact continuous circle, not tile-stepped white cells');
    assert.equal(g.packEffects.length, 0, 'aftermath needs no effect, hazard, or per-frame simulation');
  });

  test(`Supernova overlays unexplored fog without revealing hidden terrain, enemies or objects (${path})`, () => {
    const hidden = fixture({ actors: true, objects: true }); hidden.packEffects = [nova()];
    const empty = fixture(); empty.packEffects = [nova()];
    assert.deepEqual(capture(hidden, { cached }), capture(empty, { cached }), 'hidden bodies, health, telegraphs, objects and animated object halos are absent');
    const changed = fixture({ scar: false }); changed.packEffects = [nova()];
    // Preserve the already discovered side; alter only the unknown side behind the active field.
    for (let i = 0; i < changed.map.tiles.length; i++) if (changed.map.tiles[i].x < 12) changed.map.tiles[i] = { ...empty.map.tiles[i] };
    assert.deepEqual(capture(empty, { cached }), capture(changed, { cached }), 'opaque fog hides whether the underlying ground is a scar, wall, or floor');
    const withNova = capture(hidden, { cached }); hidden.packEffects = [];
    assert.notDeepEqual(withNova, capture(hidden, { cached }), 'active Nova is still visible over the unknown region');
    assert.equal(dungeonPointDiscovered(hidden.map, { x: 15, y: 13 }), false);
  });

  test(`After Nova expires, scar remains hidden until normal dungeon discovery (${path})`, () => {
    const g = fixture({ actors: true, objects: true }), before = capture(g, { cached });
    g.packEffects = [nova('aftermath')]; capture(g, { cached }); g.packEffects = [];
    assert.deepEqual(capture(g, { cached }), before, 'ending the effect restores exactly the same fog');
    const prior = [...g.map._dungeonRevealed];
    applyDungeonDiscovery(g.map, revealDungeonAt(g.map, prior, 14, 12));
    assert.equal(g.map._dungeonRevealMode, 'normal');
    assert.ok(g.map._dungeonRevealed.has(dungeonChunkId(g.map, 14, 12)));
    const explored = capture(g, { cached }); assert.notDeepEqual(explored, before);
    assert.ok(styleCalls(explored, '#fffefd').length > 0, 'normal discovery clips the white circle to newly explored space');
    const clean = fixture(); applyDungeonDiscovery(clean.map, [...g.map._dungeonRevealed]);
    assert.notDeepEqual(explored, capture(clean, { cached }), 'objects and enemy become visible only in a normally discovered chunk');
  });

  test(`Rendering cannot mutate Supernova simulation, terrain or discovery state (${path})`, () => {
    const g = fixture({ actors: true, objects: true }); g.packEffects = [nova()];
    const before = structuredClone(g), reveal = g.map._dungeonRevealed, ids = [...reveal], mode = g.map._dungeonRevealMode;
    deepFreeze(g); capture(g, { cached }); capture(g, { cached, now: 99999 });
    assert.deepEqual(structuredClone(g), before); assert.equal(g.map._dungeonRevealed, reveal);
    assert.deepEqual([...reveal], ids); assert.equal(g.map._dungeonRevealMode, mode);
  });
}

test('Destroyed gate and door imagery cannot repaint scar floor or delete their progression records', () => {
  const empty = fixture({ discovered: true });
  const g = fixture({ discovered: true });
  g.map.objects = ['sealedGate', 'door', 'deepShortcut'].map((kind, i) => ({ id: kind, kind, x: 13 + i, y: 12, state: 'closed', key: 'retained-quest-state' }));
  const before = structuredClone(g.map.objects);
  assert.deepEqual(capture(g), capture(empty)); assert.deepEqual(g.map.objects, before);
});

test('Fully consumed buildings cannot visually restore their walls, roof or label', () => {
  for (const kind of ['shack', 'architecturalBuilding']) {
    const g = fixture({ discovered: true }), empty = fixture({ discovered: true });
    const footprint = [{ x: 13, y: 11 }, { x: 14, y: 11 }, { x: 13, y: 12 }, { x: 14, y: 12 }];
    g.map.objects = [{ id: 'consumed-building', kind, name: 'Not restored', x: 13, y: 11, bounds: { x: 13, y: 11, w: 2, h: 2 }, footprint, door: { x: 13, y: 12 } }];
    assert.deepEqual(capture(g), capture(empty), kind); assert.equal(g.map.objects.length, 1);
  }
});

test('Partially consumed building visuals are clipped to surviving, normally discovered cells', () => {
  const g = fixture({ discovered: true }), footprint = [{ x: 10, y: 11 }, { x: 11, y: 11 }, { x: 10, y: 12 }, { x: 11, y: 12 }];
  g.map.objects = [{ id: 'partial-building', kind: 'shack', name: 'Surviving shell', x: 10, y: 11, bounds: { x: 10, y: 11, w: 2, h: 2 }, footprint, door: { x: 11, y: 12 }, shape: 'rect' }];
  // Three of the four building cells were consumed; leave one physically intact.
  for (const cell of footprint.slice(1)) Object.assign(g.map.tiles[cell.y * g.map.width + cell.x], { kind: 'voidScar', blocked: false });
  const calls = capture(g), clip = calls.findLastIndex(call => call[0] === 'clip');
  assert.ok(clip > 0); assert.equal(calls[clip - 1][0], 'rect');
  assert.deepEqual(calls[clip - 1].slice(1, 5), [10 * 44, 11 * 44, 44, 44], 'only the surviving cell is a permitted roof/facade area');
  assert.ok(rendererDiagnostics().visibleObjects > 0);
});

test('Unexplored buildings and their names stay hidden even under an active Nova overlay', () => {
  const g = fixture(), empty = fixture(); g.packEffects = [nova()]; empty.packEffects = [nova()];
  g.map.objects = [{ id: 'hidden-building', kind: 'shack', name: 'Do not reveal', x: 15, y: 12, bounds: { x: 14, y: 11, w: 3, h: 3 }, footprint: [{ x: 14, y: 11 }, { x: 15, y: 11 }], door: { x: 15, y: 13 } }];
  assert.deepEqual(capture(g), capture(empty));
});

test('Overworld scars use the same static white/red material with no animated aftermath', () => {
  const g = fixture({ discovered: true }); g.area = 'overworld';
  const first = capture(g, { now: 1000 }), later = capture(g, { now: 10000 });
  assert.deepEqual(first, later); assert.ok(styleCalls(first, '#fffefd').length); assert.ok(styleCalls(first, '#ba3e4d').length);
});

test('A changed exact circle union invalidates ground cache even when no collision tile changes', () => {
  const g = fixture({ discovered: true }), tiles = g.map.tiles.slice();
  const first = capture(g, { cached: true }), builds = rendererDiagnostics().groundBuilds;
  // The new sub-tile lobe is an additional cast; no whole-cell replacement is necessary.
  g.map._voidScarCircles.push({ x: 14.65, y: 12.62, radius: 3.5, visualLift: 0 });
  const second = capture(g, { cached: true });
  assert.equal(rendererDiagnostics().groundBuilds, builds + 1); assert.notDeepEqual(first, second);
  assert.ok(g.map.tiles.every((tile, i) => tile === tiles[i]));
  g.map._voidScarCircles[1].radius = 3.55;
  const third = capture(g, { cached: true }); assert.notDeepEqual(third, second);
  assert.equal(rendererDiagnostics().groundBuilds, builds + 2, 'in-place circle content changes are also noticed');
  const previous = rendererDiagnostics().groundBuilds;
  g.map._voidScarCircles = g.map._voidScarCircles.map(c => ({ ...c })); capture(g, { cached: true });
  assert.equal(rendererDiagnostics().groundBuilds, previous + 1, 'a newly replayed metadata identity refreshes the cache');
  capture(g, { cached: true, now: 99999 });
  assert.equal(rendererDiagnostics().groundBuilds, previous + 1, 'unchanged static aftermath does not rebuild per frame');
});

test('Raised-ground aftermath matches the Nova cast-center projection without per-tile warping', () => {
  const g = fixture({ discovered: true }); g.map.landscape = true; g.map._hasLevels = true;
  g.map.tiles = g.map.tiles.map(t => ({ ...t, landscape: true, elev: 2 }));
  const f = nova(), visualLift = liftAt(g.map, g.map.width, f.x, f.y); assert.ok(visualLift > 0);
  g.map._voidScarCircles[0].visualLift = visualLift; g.packEffects = [f];
  // Uneven terrain elsewhere must not scallop, ellipse, or vertically split the cosmetic disk.
  g.map.tiles[11 * g.map.width + 13].elev = 4;
  const calls = allCalls(capture(g)), sameCircle = call => call[0] === 'arc' && call[1] === (f.x + .5) * 44 && call[2] === (f.y + .62 - visualLift) * 44 && call[3] === f.radius * 44;
  assert.equal(calls.filter(sameCircle).length, 2, 'the persistent white boundary and live Nova use exactly the same circular center/radius');
  g.packEffects = []; const before = capture(g);
  const circle = { ...g.map._voidScarCircles[0] };
  g.map._voidScarCircles = [circle]; assert.deepEqual(capture(g), before, 'saved lift reproduces the same raised disk');
  assert.deepEqual(g.map._voidScarCircles[0], circle);
});

test('Fresh exact-circle scars have sparse fine fractures, while legacy cell-only saves retain their footprint', () => {
  const g = fixture({ discovered: true }), calls = allCalls(capture(g));
  const red = calls.filter(c => c[0] === 'stroke' && c.at(-1)?.strokeStyle === '#ba3e4d');
  assert.equal(red.length, 1, 'the entire circle uses one sparse crack stroke, not one network per tile');
  assert.ok(red[0].at(-1).lineWidth < 1, 'fractures stay subpixel-fine at 44px tiles');
  const start = calls.findLastIndex(c => c[0] === 'beginPath' && calls.indexOf(c) < calls.indexOf(red[0]));
  const crackPath = calls.slice(start, calls.indexOf(red[0]));
  assert.equal(crackPath.filter(c => c[0] === 'moveTo').length, 7, 'five primary cracks and two small branches total');
  delete g.map._voidScarCircles; delete g.map._voidScarLegacyCells;
  const legacy = capture(g); assert.ok(styleCalls(legacy, '#fffefd').some(c => c[0] === 'fillRect'));
  assert.notDeepEqual(legacy, calls, 'legacy cell-only state does not invent an exact cast center');
});

test('Cached scar material is composited once over animated lower terrain, including overlaps', () => {
  const g = fixture({ discovered: true }); g.area = 'overworld'; g.map.landscape = true; g.map._hasLevels = true;
  g.map.tiles = g.map.tiles.map(t => ({ ...t, landscape: true, elev: t.kind === 'voidScar' ? 4 : 0, kind: t.kind === 'voidScar' ? 'voidScar' : 'lakeWater' }));
  g.map._voidScarCircles = [{ x: 14.5, y: 12.62, radius: 3.5, visualLift: 1.36 }, { x: 15, y: 12.62, radius: 3.5, visualLift: 1.36 }];
  const calls = capture(g, { cached: true });
  assert.equal(calls.filter(c => c[0] === 'clip' && c[1] === 'evenodd').length, 0, 'no per-circle inverse clips are needed');
  assert.equal(calls.filter(c => c[0] === 'drawImage' && styleCalls(c[1], '#ba3e4d').length).length, 1, 'one transparent static layer covers both projected disks');
});

test('Width-less native overworld sections hide consumed door, gate and shortcut imagery', () => {
  const g = fixture({ discovered: true }); g.area = 'overworld';
  delete g.map.width; delete g.map.height;
  g.map.tiles = Array.from({ length: 32 * 32 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'floor', blocked: false, elev: 0 }));
  g.map._voidScarCircles = []; g.map._voidScarLegacyCells = ['14,12', '15,12', '16,12'];
  const objects = ['door', 'sealedGate', 'deepShortcut'].map((kind, i) => ({ id: `native-${kind}`, kind, x: 14 + i, y: 12, state: 'closed' }));
  for (const o of objects) g.map.tiles[o.y * 32 + o.x].kind = 'voidScar';
  const empty = capture(g); g.map.objects = objects;
  assert.deepEqual(capture(g), empty, 'native 32-tile section fallback locates each consumed physical object');
  assert.equal(g.map.objects, objects); assert.equal(g.map.objects.length, 3, 'interaction records remain intact');
});

function producedHeightScar() {
  const g = fixture({ discovered: true }); g.area = 'overworld'; g.player.x = 12; g.player.y = 12;
  g.map.landscape = true; g.map._hasLevels = true;
  g.map.tiles = g.map.tiles.map(t => ({ x: t.x, y: t.y, kind: 'floor', blocked: false, landscape: true, elev: t.x <= 12 ? 4 : 0, detail: 0 }));
  const center = { x: 12.5, y: 12.62, visualLift: liftAt(g.map, g.map.width, 12, 12) };
  const result = consumeVoidTerrain(g.save, g.map, 'overworld:0,0', center, 7);
  assert.equal(result.ok, true); assert.ok(result.changed > 0);
  assert.equal(safeVoidScarTransition(g.map.tiles[12 * 24 + 12], g.map.tiles[12 * 24 + 13]), true);
  return g;
}
function traversalCommands(g, now = 1000, hint = undefined) {
  const canvas = new CommandCanvas(600, 600); drawTraversalCues(canvas.context, g.map, g.map.width, g.player, 44, now, hint); return canvas.context.calls;
}

for (const cached of [false, true]) test(`Real consumed height joins have no obsolete animated cliff or climb cues (${cached ? 'cached' : 'fallback'})`, () => {
  const g = producedHeightScar(), before = structuredClone(g);
  assert.equal(traversalCommands(g).length, 0, 'safe scar joins need neither drop stripes nor cannot-climb Xs');
  assert.deepEqual(capture(g, { cached, now: 1000 }), capture(g, { cached, now: 4000 }), 'varied preserved elevations do not animate the permanent scar');
  assert.deepEqual(structuredClone(g), before, 'presentation does not flatten elevations or mutate simulation');
});

test('Ordinary cliff, uphill and surviving lethal-edge warnings remain visible', () => {
  const g = producedHeightScar();
  for (const t of g.map.tiles) { delete t.voidScar; t.kind = 'floor'; }
  const a = traversalCommands(g, 1000), b = traversalCommands(g, 4000);
  assert.notDeepEqual(a, b, 'ordinary dangerous cliffs retain their pulsing stripes');
  assert.ok(a.some(c => c.at(-1)?.fillStyle?.startsWith('rgba(230,40,40,')));
  assert.ok(a.some(c => c.at(-1)?.strokeStyle === 'rgba(255,95,80,.85)'), 'ordinary impassable climbs keep red Xs');
  const high = g.map.tiles[12 * 24 + 12], low = g.map.tiles[12 * 24 + 13];
  high.voidScar = true; high.kind = 'voidScar'; low.kind = 'lava';
  assert.equal(safeVoidScarTransition(high, low), false);
  const canvas = new CommandCanvas(600, 600); drawHazardBrinks(canvas.context, g.map, 24, 12, 12, 13, 13, 44);
  assert.ok(canvas.context.calls.some(c => c.at(-1)?.fillStyle === '#ffb35c'), 'real lava keeps its warning brink beside a scar');
  assert.ok(traversalCommands(g).some(c => c.at(-1)?.fillStyle?.startsWith('rgba(230,40,40,')), 'surviving lethal drop keeps its warning stripes');
});

test('Only stale hints and slope cues on now-safe scar transitions disappear', () => {
  const g = producedHeightScar(), hint = { x: 13, y: 12, kind: 'tooHigh', until: 5000 };
  assert.equal(traversalCommands(g, 1000, hint).length, 0);
  assert.equal(traversalCommands(g, 1000, { ...hint, kind: 'brink' }).length, 0);
  g.map.tiles[12 * 24 + 13].kind = 'lava';
  assert.ok(traversalCommands(g, 1000, { ...hint, kind: 'brink' }).some(c => c[0] === 'strokeText' && c[1] === 'EDGE'), 'real hazard hints remain');
  const slope = producedHeightScar(); slope.map.tiles[12 * 24 + 12].slope = true;
  assert.equal(traversalCommands(slope).length, 0, 'scar-safe slope joins need no old ascent chevron');
});

test('Active Nova, rend and pulsar attack warnings remain visible over safe white scars', () => {
  const g = producedHeightScar(), quiet = capture(g);
  for (const f of [nova(), { kind: 'voidHorizon', x: 13, y: 12, radius: 2.2, coreRadius: .35, pulsar: true, angle: 0, arming: .3, armTotal: .6, age: .1, life: 1 }, { kind: 'voidRend', x: 13, y: 12, variant: 'spike', radius: 1.2, arming: .3, armTotal: .6, age: .1, life: 1 }, { kind: 'voidBeam', x: 13, y: 12, radius: .25, width: .25, angle: 0, length: 5, arming: .3, armTotal: .6, age: .1, life: 1 }]) {
    g.packEffects = [f]; assert.notDeepEqual(capture(g), quiet, `${f.kind} combat warning is not a terrain-cue suppression target`);
  }
});

test('Hundreds of retained circles use one static raster blit per frame without mutating history', () => {
  const g = fixture({ discovered: true });
  g.map._voidScarCircles = Array.from({ length: 500 }, (_, i) => ({ x: 14.5 + Math.sin(i * 2.399) * .5, y: 12.62 + Math.cos(i * 2.399) * .5, radius: 3.5, visualLift: 0 }));
  const before = structuredClone(g.map._voidScarCircles);
  capture(g, { cached: true }); const builds = rendererDiagnostics().scarBuilds;
  for (const now of [2000, 3000, 4000]) {
    const calls = capture(g, { cached: true, now });
    assert.equal(rendererDiagnostics().scarBuilds, builds, 'unchanged geometry reuses the raster');
    assert.equal(calls.filter(c => c[0] === 'drawImage' && styleCalls(c[1], '#ba3e4d').length).length, 1);
    assert.equal(calls.filter(c => c[0] === 'clip' && c[1] === 'evenodd').length, 0);
  }
  assert.deepEqual(g.map._voidScarCircles, before); assert.equal(g.map._voidScarCircles.length, 500);
});

test('Scar raster invalidates on ordinary exploration without showing unknown circles early', () => {
  const g = fixture(); capture(g, { cached: true }); const builds = rendererDiagnostics().scarBuilds;
  const hidden = capture(g, { cached: true }); assert.equal(rendererDiagnostics().scarBuilds, builds);
  applyDungeonDiscovery(g.map, revealDungeonAt(g.map, [...g.map._dungeonRevealed], 14, 12));
  const revealed = capture(g, { cached: true }); assert.equal(rendererDiagnostics().scarBuilds, builds + 1);
  assert.notDeepEqual(hidden, revealed); assert.equal(g.map._dungeonRevealMode, 'normal');
  capture(g, { cached: true }); assert.equal(rendererDiagnostics().scarBuilds, builds + 1);
});

test('Large-map ground fallback retains a bounded native-resolution scar viewport cache', () => {
  const g = fixture(); g.map.width = 128; g.map.height = 128; g.player.x = 64; g.player.y = 64;
  g.map.tiles = Array.from({ length: 128 * 128 }, (_, i) => ({ x: i % 128, y: Math.floor(i / 128), kind: 'floor', blocked: false, elev: 0 }));
  applyDungeonDiscovery(g.map, [], 'full');
  assert.equal(consumeVoidTerrain(g.save, g.map, 'dungeon:large-scar', { x: 64.5, y: 64.62 }, 7).ok, true);
  const groundBuilds = rendererDiagnostics().groundBuilds;
  capture(g, { cached: true }); const builds = rendererDiagnostics().scarBuilds;
  assert.equal(rendererDiagnostics().groundBuilds, groundBuilds, 'large dungeon uses the existing per-tile base-ground fallback');
  assert.ok(rendererDiagnostics().scarPixels <= 8.4e6); assert.equal(rendererDiagnostics().scarScale, 1, 'visible scar stays at native resolution, not whole-map downsampling');
  capture(g, { cached: true, now: 4000 }); assert.equal(rendererDiagnostics().scarBuilds, builds);
  g.player.x += .1; capture(g, { cached: true }); assert.equal(rendererDiagnostics().scarBuilds, builds, 'small movement remains inside the padded raster region');
  const history = structuredClone(g.map._voidScarCircles);
  g.player.x = 100; capture(g, { cached: true }); assert.equal(rendererDiagnostics().scarBuilds, builds + 1, 'leaving the cached region rebuilds one bounded raster');
  assert.ok(rendererDiagnostics().scarPixels <= 8.4e6); assert.deepEqual(g.map._voidScarCircles, history);
});
