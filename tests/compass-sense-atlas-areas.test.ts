// Tim's decisions of 2026-11-26: (1) the compass senses only Pentagons, Sky Stairs, great trees, Wayglasses / Watcher's shrines and
// world beasts (a red mark); (2) nothing is pointed at or pinned unless the player chose it or it belongs to an accepted quest: the
// Atlas's automatic skyway (blue), great tree (green) and Starfield (violet) pins are gone, and a great tree is named only where one
// really stands; (3) a rumour is shown on the Atlas as an area, sized by its difficulty, the same area the compass turns warm in;
// (4) the Journal's repeated status lines fold into count lines, as the crossings did in release 1065.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave, setCompassChoice } from '../src/types.ts';
import { serializeSave, deserializeSave } from '../src/save-codec.ts';
import { nearbyPlaces, compassDiscovery, SENSED_PLACES, NEARBY_KINDS, COMPASS_RIBBON, zoneSections, zoneRadius, compassReadoutState, compassReadout, compassGuidance } from '../src/atlas-view.ts';
import { Game, greatTreeKnown, greatTreeProbe, greatTreeCandidate, pentagonSensed } from '../src/game.ts';
import { wonderAt, nearestWonders, WONDERS } from '../src/wonders.ts';
import { sectionSignals } from '../src/world.ts';
import { guideHost } from '../src/waymark-guides.ts';
import { WORLD_BEAST_IDS } from '../src/world-beasts.ts';
import { rumourZone, rumourDifficulty, RUMOUR_ZONE } from '../src/leads.ts';
import { journalOnce, journalDisplayEntries, JOURNAL_FOLDS, JOURNAL_CROSSINGS } from '../src/interactions.ts';

const MAIN = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const journey = (seed = 'SENSE') => { const s: any = freshSave(); s.seed = seed; return s; };
const loaded = (seed: string, rx: number, ry: number) => { const g: any = new Game(journey(seed), 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); return g.map; };
const probeOf = (s: any) => ({ tree: (x: number, y: number) => greatTreeKnown(s, x, y), pentagon: (cx: number, cy: number) => pentagonSensed(s, cx, cy) });
function lift(name: string) {
  const at = MAIN.indexOf(`function ${name}(`); assert.ok(at >= 0, `main.ts has ${name}`);
  let i = MAIN.indexOf('{', MAIN.indexOf(')', at)), depth = 0;
  for (let j = i; j < MAIN.length; j++) { if (MAIN[j] === '{') depth++; else if (MAIN[j] === '}' && --depth === 0) return MAIN.slice(at, j + 1); }
  throw new Error(name);
}

// ---------------------------------------------------------------- 1. what the compass senses
test('the compass senses only the five kinds; nothing else on the Atlas or the ground is marked', () => {
  assert.deepEqual(Object.keys(SENSED_PLACES).sort(), ['boss', 'pentagon', 'shrine', 'skyway', 'tree', 'wayglass']);
  assert.deepEqual(NEARBY_KINDS, { checkpoint: 'wayglass', watcherTomb: 'shrine', skyStair: 'skyway' });
  const s = journey();
  s.atlas = { '1,0': { sites: ['dungeon', 'shrine', 'ruinMarker', 'shipwright', 'diveSite', 'arenaEntrance', 'architecturalDistrict', 'supplyCache', 'bossCue', 'storyEcho', 'shack'].map((kind, i) => ({ kind, name: kind, x: 2 + i * 2, y: 4 })) },
    '0,1': { hamletVersion: 1, sites: [{ kind: 'watcherTomb', name: "Watcher's Shrine", x: 6, y: 6 }] } };
  const out = nearbyPlaces(s, 0, 0, 16, 16, [], probeOf(s));
  assert.ok(out.every((m: any) => Object.keys(SENSED_PLACES).includes(m.kind)), JSON.stringify(out.map((m: any) => m.key)));
  assert.ok(out.some((m: any) => m.key === 'shrine:0,1' && m.known && m.name === "Watcher's Shrine"), 'a known Watcher\'s Shrine is marked');
  assert.ok(!out.some((m: any) => /^(hamlet|crossing|refuge|starfield)/.test(m.key)), 'no town, no crossing, no Starfield');
  // an attuned place with no site of its own (a Crown Rest) is a known Wayglass mark
  s.checkpoints = { '-1,0': { rx: -1, ry: 0, x: 10, y: 10, name: 'Crown Rest' } }; s.atlas['-1,0'] = { sites: [] };
  assert.ok(nearbyPlaces(s, 0, 0, 16, 16, [], probeOf(s)).some((m: any) => m.key === 'wayglass:-1,0' && m.known && m.name === 'Crown Rest'));
});

test('a world beast nearby is a red mark where it is now; it is never announced as discovered', () => {
  const s = journey(); s.atlas = {}; s.perception.aperture = 1e9; const id = WORLD_BEAST_IDS[0];
  s.worldBeasts = { ...(s.worldBeasts || {}), [id]: { ...(s.worldBeasts?.[id] || {}), active: { rx: 2, ry: 1, x: 7, y: 9 } } };
  const m = nearbyPlaces(s, 0, 0, 16, 16, [], probeOf(s)).find((q: any) => q.key === `boss:${id}`);
  assert.ok(m && m.boss && m.rx === 2 && m.ry === 1 && m.x === 7 && m.y === 9, JSON.stringify(m));
  s.questingBeast = { ...(s.questingBeast || {}), active: { rx: -1, ry: 1 } };
  assert.ok(nearbyPlaces(s, 0, 0, 16, 16, [], probeOf(s)).some((q: any) => q.key === 'boss:questingBeast' && q.boss));
  s.worldBeasts[id].active = { rx: 30, ry: 30 }; assert.ok(!nearbyPlaces(s, 0, 0, 16, 16, [], probeOf(s)).some((q: any) => q.key === `boss:${id}`), 'out of reach: no mark');
  assert.match(CSS, /\.cr-mark\.boss \{ background: #ff4b4b;/); assert.match(MAIN, /hudSet\(el,"class:boss",!!compassMarks\[i\]\.boss\)/);
  assert.equal(compassDiscovery(s, new Set([`boss:${id}`]), [{ key: `boss:${id}`, known: true, boss: true, name: 'x' }]), null);
});

test('every sensed Sky Stair, Wayglass, Watcher\'s shrine and Pentagon stands there on arrival; a Starfield is never sensed', () => {
  const seed = 'SENSE-REAL', s = journey(seed); s.perception.aperture = 1e9; const seen = new Map();
  for (let rx = -40; rx <= 40 && seen.size < 14; rx += 9) for (let ry = -40; ry <= 40 && seen.size < 14; ry += 9)
    for (const m of nearbyPlaces(s, rx, ry, 16, 16, [], { tree: () => false, pentagon: (cx: number, cy: number) => pentagonSensed(s, cx, cy) })) if (!seen.has(m.key)) seen.set(m.key, m);
  const kinds = new Set([...seen.values()].map((m: any) => m.kind)); assert.ok(kinds.size >= 2, [...kinds].join());
  let checked = 0;
  for (const m of [...seen.values()].slice(0, 8) as any[]) {
    const map = loaded(seed, m.rx, m.ry), has = (k: string) => map.objects.some((o: any) => o.kind === k);
    if (m.kind === 'skyway') { assert.ok(wonderAt(seed, m.rx, m.ry, 'skyway')); if (!map.settlement) assert.ok(has('skyStair'), m.key); }
    if (m.kind === 'wayglass') { assert.ok(sectionSignals(seed, m.rx, m.ry, 1).wayglass); assert.ok(has('checkpoint'), m.key); }
    if (m.kind === 'shrine') { assert.ok(guideHost(seed, 'shrine', m.rx, m.ry)); assert.ok(has('watcherTomb'), m.key); }
    if (m.kind === 'pentagon') assert.ok(map.pentagon, m.key);
    checked++;
  }
  assert.ok(checked >= 4);
  // a Pentagon centre found by its rule holds the Pentagon
  let pc: any = null; for (let x = -60; x <= 60 && !pc; x++) for (let y = -60; y <= 60 && !pc; y++) if (pentagonSensed(s, x, y)) pc = { x, y };
  assert.ok(pc); assert.ok(loaded(seed, pc.x, pc.y).pentagon, 'the Pentagon stands at its centre');
  for (const m of seen.values() as any) assert.ok(!/starfield/.test(m.key));
});

test('a great tree is sensed only once its terrain is built and holds one; the probe agrees with arrival and never touches the save', () => {
  const seed = 'TIMX', s = journey(seed); s.atlas = {}; s.perception.aperture = 1e9;
  const cands: any[] = []; for (let x = -31; x <= 20 && cands.length < 6; x += 3) for (const y of [-15, 15, 20, 25]) if (cands.length < 6 && greatTreeCandidate(s, x, y)) cands.push({ x, y });
  assert.ok(cands.length >= 4);
  const before = JSON.stringify(s);
  let grew = 0; for (const c of cands) {
    assert.equal(greatTreeKnown(s, c.x, c.y), null, 'not built: unknown, so not shown');
    const said = greatTreeProbe(s, c.x, c.y); assert.equal(greatTreeKnown(s, c.x, c.y), said, 'the answer is kept');
    assert.equal(!!loaded(seed, c.x, c.y).canopy, said, `${c.x},${c.y}: the probe says what arrival builds`); if (said) grew++;
  }
  assert.ok(grew >= 1);
  assert.equal(JSON.stringify(s), before, 'the probe never writes the save');
  assert.equal(greatTreeKnown(s, 5, 5) === false || greatTreeCandidate(s, 5, 5), true, 'no candidate: known false at once');
  // nearbyPlaces: an unbuilt candidate is pending (main.ts builds it in idle time), a built one is a hollow mark
  const t = cands.find((c) => greatTreeKnown(s, c.x, c.y) === true);
  const out = nearbyPlaces(s, t.x + 1, t.y, 16, 16, [], probeOf(s));
  assert.ok(out.some((m: any) => m.key === `tree:${t.x},${t.y}` && !m.known && m.name === 'a great tree'));
  const fresh = journey('TREE-PENDING'); fresh.perception.aperture = 1e9; let pending = null;
  for (let x = 0; x < 400 && !pending; x += 3) for (const ap of [0, 1e9]) { fresh.perception.aperture = ap; const o: any = nearbyPlaces(fresh, x, 7, 16, 16, [], probeOf(fresh)); if (!pending && o.pending.length) pending = o; }
  assert.ok(pending && pending.pending.every((p: any) => greatTreeCandidate(fresh, p.rx, p.ry) && greatTreeKnown(fresh, p.rx, p.ry) === null));
  assert.ok(!pending.some((m: any) => m.kind === 'tree' && pending.pending.some((p: any) => p.rx === m.rx && p.ry === m.ry)), 'a pending tree is not a mark');
  // main.ts: the probe answers from kept results only; building happens in idle time
  assert.match(MAIN, /const compassSenseProbe=\{tree:\(x,y\)=>greatTreeKnown\(save,x,y\),pentagon:\(cx,cy\)=>pentagonSensed\(save,cx,cy\),signals:\(x,y\)=>keptSectionSignals\(save\.seed,x,y,save\.worldGeneration\|\|1\)\}/);
  assert.match(lift('probeCompassTrees'), /whenIdle\(function step\(\)\{[\s\S]*if\(next\.kind==="tree"\)greatTreeProbe\(save,next\.rx,next\.ry\);else sectionSignals\(save\.seed,next\.rx,next\.ry,save\.worldGeneration\|\|1\)/);
  // a region not yet generated: its Wayglass waits (pending "signals"), nothing is generated inside the call
  const cold = journey('SIGNALS-COLD'); cold.perception.aperture = 1e9; const o: any = nearbyPlaces(cold, 200, 200, 16, 16, [], { ...probeOf(cold), signals: () => null });
  assert.ok(o.pending.some((p: any) => p.kind === 'signals') && !o.some((m: any) => m.kind === 'wayglass'));
  assert.match(lift('refreshCompassMarks'), /if\(compassMarks\.pending\.length\)probeCompassTrees\(\)/);
});

// ---------------------------------------------------------------- 2. no automatic markers
test('the Atlas pins only what the player chose or an accepted quest; the automatic wonder pins are gone', () => {
  const pins = lift('drawAtlasPins');
  assert.doesNotMatch(pins, /nearestWonders|WONDERS/, 'no skyway (blue), great tree (green) or Starfield (violet) pin by itself');
  assert.doesNotMatch(MAIN, /from "\.\/wonders\.ts"/, 'main.ts reads no wonder for the Atlas');
  // what remains, each player-chosen or quest-tied (and the Stalker, which Tim keeps)
  for (const src of [/save\.mapMarks/, /rescueGuidance\(save\.mounts\?\.hatchling\)/, /activeSeedHunts\(save\)/, /stalkerLairPin/, /retreatsUnderWay\(save\)/, /save\.manualWaypoint/, /surveyorChainPath\(save\)/, /atlasTargetZone\(t\.guidance\)/]) assert.match(pins, src);
  assert.equal((pins.match(/pins\.push\(/g) || []).length, 9, 'no other pin');
});

test('a great tree a traveller names really stands (nearestWonders builds at most treeChecks candidates)', () => {
  const s = journey('TIMX');
  const tree = nearestWonders(s, 0, 0).find((q: any) => q.kind === 'tree');
  assert.ok(WONDERS.treeChecks >= 1 && tree);
  assert.ok(loaded('TIMX', tree.rx, tree.ry).canopy, 'the named tree stands');
  const again = nearestWonders(journey('TIMX'), 0, 0).find((q: any) => q.kind === 'tree');
  assert.deepEqual(again, tree, 'the same tree every time');
});

// ---------------------------------------------------------------- 3. rumours as areas
test('a rumour\'s zone grows with its difficulty, holds its site, and the old difficulty-1 zones are unchanged', () => {
  const s = journey('ZONES');
  const W = (kind: string, rx: number, ry: number) => ({ id: `wonder:${rx},${ry}`, kind: 'wonder', rx, ry, name: (WONDERS.kinds as any)[kind].atlas });
  assert.equal(rumourDifficulty(W('skyway', 1, 1)), 1); assert.equal(rumourDifficulty(W('tree', 1, 1)), 1); assert.equal(rumourDifficulty(W('starfield', 1, 1)), 2);
  assert.equal(rumourDifficulty({ id: 'horde:3,3', kind: 'horde', rx: 3, ry: 3 }), 3);
  assert.ok(RUMOUR_ZONE.radius[1] < RUMOUR_ZONE.radius[2] && RUMOUR_ZONE.radius[2] < RUMOUR_ZONE.radius[3]);
  for (let i = 0; i < 60; i++) {
    for (const r of [W('skyway', i, -i), W('starfield', -i, 2 * i), { id: `horde:${i},${i}`, kind: 'horde', rx: i, ry: i }] as any[]) {
      const z: any = rumourZone(s, r), area = zoneSections(z);
      assert.equal(z.r, RUMOUR_ZONE.radius[rumourDifficulty(r)]);
      assert.ok(area.some((q: any) => q.rx === r.rx && q.ry === r.ry), `${r.id}: the site lies in its area`);
    }
    // release 1068's formula for radius 2: unchanged
    const r = W('tree', i, 3), z: any = rumourZone(s, r); assert.ok(Math.abs(z.rx - r.rx) <= 1 && Math.abs(z.ry - r.ry) <= 1 && z.r === 2);
  }
});

test('the Atlas area is where the compass turns warm, through a save and a reload', () => {
  const s = journey('AREA'), r = { id: 'horde:9,-4', kind: 'horde', rx: 9, ry: -4 }, zone = rumourZone(s, r);
  setCompassChoice(s, { pin: { rx: r.rx, ry: r.ry, name: 'A Revenant horde', zone } });
  const back: any = migrateSave(deserializeSave(serializeSave(s)));
  const g: any = compassGuidance(back, { area: 'overworld', pin: back.guidance.pin });
  assert.deepEqual(g.zone, zone, 'the pin keeps its zone');
  const area = new Set(zoneSections(g.zone).map((q: any) => `${q.rx},${q.ry}`)), R = compassReadoutState(), n = Math.ceil(zoneRadius(g.zone)) + 2;
  assert.ok(area.size > 9, 'more than a section: an area');
  for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) {
    const rx = g.zone.rx + dx, ry = g.zone.ry + dy;
    compassReadout(R, g, { area: 'overworld', rx, ry, x: 16, y: 16, yaw: NaN, elev: NaN, targetElev: NaN } as any);
    assert.equal(R.warm, area.has(`${rx},${ry}`), `${rx},${ry}: the Atlas area and the warm compass agree`);
  }
  // main.ts draws the zone, never the section, for a hinted target
  const pins = lift('drawAtlasPins');
  assert.match(pins, /const zone=atlasTargetZone\(t\.guidance\);if\(zone\)\{drawAtlasZone\(w,h,cell,zone\)/);
  assert.match(pins, /if\(p\.zone\)\{mctx\.restore\(\);continue\}/, 'no pin on the map for an area');
  assert.match(lift('drawMap'), /targetKey=compassTarget\?\.area==="overworld"&&!atlasTargetZone\(compassTarget\)/, 'no single-section gold frame');
  assert.match(lift('drawAtlasZone'), /zoneSections\(zone\)/);
});

// ---------------------------------------------------------------- 4. the Journal's status lines
test('the Journal folds each kind of repeated status line into one count line where the first stood; the save is untouched', () => {
  const s: any = freshSave(); s.consequences.dungeons = {};
  journalOnce(s, 'early', 'An earlier entry.', 'Discovery');
  for (let i = 0; i < 4; i++) journalOnce(s, `abandon:dungeon:S:g1:${i}:0:x:1`, 'You left a buried crossing unresolved. Its progress remains; you can return.', 'Crossings');
  journalOnce(s, 'world-beast-slain:x:1', 'You slew The Void Walker at 3,4.', 'The Void Walker');
  for (let i = 0; i < 3; i++) journalOnce(s, `expedition-cleared:dungeon:S:g1:${i}:1:x`, 'Glass Kiln is cleared. Every required guardian fell.', 'Glass Kiln');
  journalOnce(s, 'questing-beast-try:1:3', 'The Questing Beast still holds 4,5. 3 tries remain.', 'The Questing Beast');
  journalOnce(s, 'world-beast-try:7,5:{}', 'The Mountain Turtle still holds 7,5. 2 tries remain.', 'World beasts');
  journalOnce(s, 'skirmish:v1:1,-3', 'At 1,-3, glass mites and ashlings fought.', 'Skirmishes');
  journalOnce(s, 'later', 'A later entry.', 'Discovery');
  const before = JSON.stringify(s.narrative.journal), shown = journalDisplayEntries(s), ids = shown.map((j: any) => j.recordId);
  assert.equal(JSON.stringify(s.narrative.journal), before, 'display only');
  const fold = (id: string) => shown.find((j: any) => j.recordId === id);
  assert.equal(fold('crossings-left-folded').folded, 4); assert.match(fold('crossings-left-folded').text, /4 times\. Latest: You left a buried crossing unresolved/);
  assert.equal(fold('expeditions-cleared-folded').folded, 3);
  assert.equal(fold('beast-tries-folded').folded, 2); assert.match(fold('beast-tries-folded').text, /Latest: The Mountain Turtle still holds 7,5\. 2 tries remain\./, 'the newest status in its own words');
  assert.ok(ids.includes('skirmish:v1:1,-3') && !fold('skirmishes-folded'), 'a lone entry is shown as it is');
  assert.ok(ids.includes('world-beast-slain:x:1'), 'a kill stands');
  assert.ok(!ids.some((id: string) => /^(abandon|expedition-cleared|questing-beast-try|world-beast-try):/.test(id)));
  const order = ['early', 'crossings-left-folded', 'world-beast-slain:x:1', 'expeditions-cleared-folded', 'beast-tries-folded', 'skirmish:v1:1,-3', 'later'];
  assert.deepEqual(ids.filter((id: string) => order.includes(id)), order, 'each count line where its first entry stood');
  // with the 1065 crossings fold in the same list
  const ds = ['dungeon:S:g1:1:2:a', 'dungeon:S:g1:3:4:b'];
  for (const id of ds) { s.consequences.dungeons[id] = { resolved: true, relayNode: false }; journalOnce(s, `resolved:${id}`, 'You cleared the guardian of this buried crossing.', 'Crossings'); }
  const both = journalDisplayEntries(s).map((j: any) => j.recordId);
  assert.equal(both.indexOf(JOURNAL_CROSSINGS.foldedId), both.indexOf('later') + 1); assert.equal(both.indexOf('crossings-left-folded'), both.indexOf('early') + 1);
  assert.equal(new Set(JOURNAL_FOLDS.map((f: any) => f.id)).size, JOURNAL_FOLDS.length);
});
