// Tim, 2026-11-19: (1) "the compass points at exactly the one target the player last actively chose". Active choices: a row of
// the compass menu, a tap-cycle step, the Journal's "Point compass here", and accepting a quest or hunt. Nothing else retargets it:
// not walking near something, a nearer seed hunt appearing, a hunt's status changing or entering and leaving sections. A chosen
// target that is finished or gone leaves the compass needleless until the next choice. (2) Markers are opt-in: the Atlas waypoint
// and the coloured marks draw a needle only when chosen in the menu; placing one points nothing. (3) The dungeon compass with no
// door point is idle (no needle to north, no second N badge) and says how to set one.
// main.ts cannot boot under node, so its compass functions are lifted from the source and run against small fakes (as
// tests/compass-menu-oculus-look.test.ts does); game.ts's acceptance hooks run on a real Game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave, normalizeGuidance, setCompassChoice, normalizeCompassFollow } from '../src/types.ts';
import { serializeSave, deserializeSave } from '../src/save-codec.ts';
import { compassGuidance, compassQuest, objectiveKey, seedHuntObjectives, MAP_MARKS } from '../src/atlas-view.ts';
import { rescueGuidance, HATCHLING } from '../src/hatchling.ts';
import { CAIRN_KEEPER } from '../src/surveyor.ts';
import { Game } from '../src/game.ts';

const MAIN = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const GAME = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
function lift(name) {
  const at = MAIN.indexOf(`function ${name}(`); assert.ok(at >= 0, `main.ts has ${name}`);
  const open = /\)\s*\{/g; open.lastIndex = at; let depth = 0, i = open.exec(MAIN).index + 1; while (MAIN[i] !== '{') i++;
  for (; i < MAIN.length; i++) { const c = MAIN[i]; if (c === '{') depth++; else if (c === '}' && --depth === 0) break; }
  return MAIN.slice(at, i + 1);
}

// main.ts's compass state and navigationTargets, with the objective list the tap cycle would hold (`objectives()`).
function compass(save, game, objectives = () => []) {
  const make = new Function('save', 'game', 'compassGuidance', 'compassQuest', 'rescueGuidance', 'setCompassChoice', 'objectiveKey', 'objectives', `
    let navigationStats={lookups:0,rebuilds:0},navigationCache={key:null,map:null,guidance:null,manual:null},objectiveCache={all:[]};
    let compassPick=save.guidance?.pick??null,compassPin=save.guidance?.pin??null,compassFollow=save.guidance?.follow??null,guidanceSeen=save.guidance;
    const persist=()=>{};
    function objectiveList(){objectiveCache={all:objectives()};return objectiveCache.all}
    ${lift('compassObjective')}
    ${lift('syncGuidance')}
    ${lift('rememberGuidance')}
    ${lift('chooseGuidance')}
    ${lift('navigationTargets')}
    return {targets:navigationTargets,choose:chooseGuidance,tapTo:(o)=>{compassPick=objectiveKey(o);compassPin=null;compassFollow=null;rememberGuidance()}};`);
  return make(save, game, compassGuidance, compassQuest, rescueGuidance, setCompassChoice, objectiveKey, objectives);
}
const journey = (seed = 'STICKY') => { const s = freshSave(); s.seed = seed; return s; };
const place = (rx, ry, area = 'overworld') => ({ area, rx, ry, map: { objects: [] }, player: { x: 16, y: 16 } });

test('a chosen objective stays chosen: a nearer objective or seed hunt appearing, walking about and sections in and out change nothing', () => {
  const s = journey(), game = place(0, 0), far = { kind: 'crossing', rx: 6, ry: 0, name: 'Crossing: The Far Kiln' };
  let list = [far];
  const k = compass(s, game, () => list);
  assert.equal(k.targets().guidance, null, 'nothing chosen: no needle');
  k.tapTo(far); assert.equal(k.targets().guidance.name, far.name);
  // a seed hunt starts one section away and a nearer crossing turns up; the Wayfarer walks next to both
  s.seedHunts = { 'tower:STICKY:1:0:1:9:0': { v: 1, tower: 'tower:STICKY:1:0:1:9:0', from: { rx: 0, ry: 0 }, rx: 1, ry: 0, kind: 'ember', state: 'active', where: 'ground', x: 4, y: 4 } };
  list = [...seedHuntObjectives(Object.values(s.seedHunts), { ember: 'Ember Seed' }, 0, 0), { kind: 'crossing', rx: 1, ry: 1, name: 'Crossing: Near' }, far];
  for (const [rx, ry] of [[1, 0], [1, 1], [2, 0]]) { game.rx = rx; game.ry = ry; game.map = { objects: [] }; assert.equal(k.targets().guidance.name, far.name, `still the chosen crossing at ${rx},${ry}`); }
  // into a dungeon and out again
  game.area = 'dungeon'; assert.equal(k.targets().guidance, null, 'a pick is an overworld target (no needle inside)');
  game.area = 'overworld'; assert.equal(k.targets().guidance.name, far.name, 'and back out it is still the choice');
  assert.deepEqual(s.guidance, { pick: '6,0', pin: null }, 'the save holds only the choice');
});

test('a followed hunt stays followed through its status changes; finished, the compass goes needleless and no other hunt takes over', () => {
  const s = journey(), game = place(0, 0);
  s.viewport.contracts.h1 = { id: 'h1', title: 'The Glass Stag', kind: 'hunt', status: 'accepted', target: { rx: 3, ry: -2 } };
  s.viewport.contracts.h2 = { id: 'h2', title: 'The Ash Hound', kind: 'hunt', status: 'tracking', target: { rx: -1, ry: 0 } };
  s.viewport.activeHuntId = 'h2';
  const k = compass(s, game);
  assert.equal(k.targets().guidance, null, 'a tracked hunt nobody chose leads nothing (it no longer overrides)');
  k.choose({ follow: { kind: 'hunt', id: 'h1' } }); assert.equal(k.targets().guidance.name, 'The Glass Stag');
  s.viewport.activeHuntId = 'h1'; s.viewport.contracts.h1.status = 'target-located'; s.viewport.contracts.h1.target = { rx: 4, ry: -2 };
  assert.deepEqual([k.targets().guidance.rx, k.targets().guidance.ry], [4, -2], 'the same hunt, its target located');
  game.area = 'dungeon'; assert.equal(k.targets().guidance.name, 'The Glass Stag', 'shown (dormant) indoors'); game.area = 'overworld';
  s.viewport.contracts.h1.status = 'completed'; s.viewport.activeHuntId = 'h2';
  assert.equal(k.targets().guidance, null, 'done: no needle, and the other live hunt does not take over');
});

test('accepting a hunt or quest is a choice: the Viewport, the hatchling\'s mother, the Cairn Keeper and a far quest set the compass', () => {
  // the Viewport (main.ts): Accept hunt and Guidance active follow the hunt
  assert.match(MAIN, /uiButton\('Accept hunt',\(\)=>\{const r=acceptViewportHunt\([^\n]*?if\(r\.ok\)chooseGuidance\(\{follow:\{kind:'hunt',id:q\.id\}\}\)/);
  assert.match(MAIN, /uiButton\('Guidance active',\(\)=>\{save\.viewport\.activeHuntId=q\.id;chooseGuidance\(\{follow:\{kind:'hunt',id:q\.id\}\}\)/);
  // a far quest that opens (game.ts, on the beast's defeat) is followed
  assert.equal((GAME.match(/setCompassChoice\(this\.save, \{ follow: \{ kind: "far", id: (civ|dom)/g) || []).length, 2, 'both far quests');
  // the hatchling's mother: a real Game
  const s = journey('STICKY-HATCH'); s.guidance = { pick: '2,2', pin: null }; const g = new Game(s, 0);
  const k = compass(s, place(0, 0));
  g.hatchMamaTalk(null); const q = s.mounts.hatchling.quest;
  assert.deepEqual(s.guidance, { pick: null, pin: null, follow: { kind: 'rescue' } }, 'taking the quest replaces the old choice');
  const t = k.targets().guidance; assert.deepEqual([t.rx, t.ry, t.name], [q.rx, q.ry, HATCHLING.quest.names.quest], 'main.ts picks up the choice game.ts wrote');
  g.hatchMamaTalk(null); assert.deepEqual(s.guidance.follow, { kind: 'rescue' }, 'asking again changes nothing');
  s.mounts.hatchling.owned = true; assert.equal(k.targets().guidance, null, 'rescued: no needle');
  // the Cairn Keeper's errand: followed by its waymarks
  const c = journey('CAIRN'); const cg = new Game(c, 0); cg.rx = 0; cg.ry = 0; cg.loadArea('overworld', false);
  const keeper = cg.map.objects.find((o) => o.id === CAIRN_KEEPER.id); Object.assign(cg.player, { x: keeper.x, y: keeper.y + .6 });
  assert.ok(cg.interact('speak', keeper.id).started); assert.deepEqual(c.guidance.follow, { kind: 'quest', id: 'errand' });
  c.guidance = { pick: '1,1', pin: null }; cg.interact('speak', keeper.id); assert.deepEqual(c.guidance, { pick: '1,1', pin: null }, 'speaking again is no new quest');
});

test('markers are opt-in: the waypoint and the marks draw no needle (and no second needle) until chosen; placing one points nothing', () => {
  const s = journey(), game = place(0, 0), k = compass(s, game);
  s.manualWaypoint = { kind: 'section', area: 'overworld', rx: 2, ry: 3, label: 'Old mill' }; s.mapMarks = [{ rx: -4, ry: 1, color: 1 }];
  let t = k.targets(); assert.equal(t.guidance, null); assert.equal(t.manual, null, 'no manual needle');
  k.choose({ pin: { rx: 9, ry: 9, name: 'The Unwritten Meridian' } });
  s.manualWaypoint = { kind: 'section', area: 'overworld', rx: 5, ry: 5, label: 'New spot' }; s.mapMarks.push({ rx: 0, ry: 7, color: 2 });
  t = k.targets(); assert.equal(t.guidance.name, 'The Unwritten Meridian', 'a new marker leaves the choice alone'); assert.equal(t.manual, null);
  k.choose({ follow: { kind: 'marker', id: 'mark:1' } }); t = k.targets(); assert.deepEqual([t.guidance.rx, t.guidance.ry, t.guidance.name], [-4, 1, `${MAP_MARKS.names[1]} mark`]);
  s.mapMarks = s.mapMarks.filter((m) => m.color !== 1); assert.equal(k.targets().guidance, null, 'the chosen mark removed: no needle');
  k.choose({ follow: { kind: 'marker', id: 'waypoint' } }); assert.equal(k.targets().guidance.name, 'New spot');
  // the waypoint button on the Atlas writes the waypoint only
  const button = MAIN.slice(MAIN.indexOf('$("#mapWaypoint").onclick'), MAIN.indexOf('\n', MAIN.indexOf('$("#mapWaypoint").onclick')));
  assert.doesNotMatch(button, /guidance|compassPin|compassPick|compassFollow|chooseGuidance/);
});

test('the dungeon compass with no door point is idle: no needle to north, no N badge, and it says how to set one', () => {
  const DUNGEON_COMPASS_IDLE = /const DUNGEON_COMPASS_IDLE = ("[^"]+");/.exec(MAIN); assert.ok(DUNGEON_COMPASS_IDLE);
  const text = JSON.parse(DUNGEON_COMPASS_IDLE[1]);
  assert.equal(text, 'No door point. Open the Map and tap a door you have found to number it (up to 3); the compass then points to it. Tap the compass to switch between them.');
  const game = { area: 'dungeon', rx: 0, ry: 0, player: { x: 5, y: 5 } }, el = () => ({ hidden: false }), navCompass = { hidden: true, 'class:north': true }, guide = el(), manual = el();
  const make = new Function('game', 'navCompass', 'navGuidanceArrow', 'navManualArrow', 'hudSet', 'compassRotation', 'compassHeading', 'DUNGEON_COMPASS_IDLE',
    `${lift('updateNavigationArrow')}\n${lift('idleCompass')}\n${lift('pointDungeonCompass')}\nreturn {pointDungeonCompass};`);
  const k = make(game, navCompass, guide, manual, (e, key, v) => { e[key] = v; }, () => 90, () => 'east', text);
  k.pointDungeonCompass(null);
  assert.equal(navCompass['class:north'], false, 'no north class (and so no N badge)'); assert.equal(guide.hidden, true); assert.equal(manual.hidden, true, 'no needle');
  assert.equal(navCompass.hidden, false, 'the dial stays'); assert.equal(navCompass['aria-label'], text); assert.equal(navCompass.title, text);
  k.pointDungeonCompass({ slot: 1, label: 'OUT', x: 9, y: 5 });
  assert.equal(manual.hidden, false, 'a door point: its needle'); assert.equal(navCompass['class:north'], false); assert.equal(manual.transform, 'rotate(90deg)'); assert.match(navCompass['aria-label'], /^Door point 1: OUT/);
  // the badge is gone from the stylesheet; the dial's own N stays; the tap says the same; nowhere else points to north
  assert.doesNotMatch(CSS, /\.nav-compass\.north/); assert.match(MAIN, /<i class="nav-dial-n">N<\/i>/);
  assert.match(MAIN, /:DUNGEON_COMPASS_IDLE;\n    return;/); assert.doesNotMatch(MAIN, /"class:north", !point|True north|points to true north/);
});

test('save.guidance.follow: additive at schema 14, normalised, kept through a save and load; one writer leaves one choice', () => {
  assert.equal(freshSave().guidance, undefined, 'a fresh journey has no choice');
  const s = journey(); s.guidance = { pick: null, pin: null, follow: { kind: 'hunt', id: 'h7', later: 1 }, extra: 'kept' };
  const back = migrateSave(deserializeSave(serializeSave(s)));
  assert.deepEqual(back.guidance, { pick: null, pin: null, follow: { kind: 'hunt', id: 'h7', later: 1 }, extra: 'kept' }, 'unknown fields kept'); assert.equal(back.version, 14);
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(back))).guidance, back.guidance, 'idempotent');
  for (const bad of [{ kind: 'nearest' }, { kind: 'hunt' }, { kind: 'quest', id: 'pentagon' }, { kind: 'marker', id: 'mark:x' }, 'hunt', null])
    assert.equal(normalizeCompassFollow(bad), null, JSON.stringify(bad));
  assert.equal(normalizeGuidance({ follow: { kind: 'nearest' } }), null, 'a bad follow alone is no choice');
  assert.deepEqual(normalizeGuidance({ pick: '1,2', follow: { kind: 'x' } }), { pick: '1,2', pin: null }, 'a bad follow is dropped');
  assert.deepEqual(normalizeCompassFollow({ kind: 'rescue', id: 3 }), { kind: 'rescue', id: 3 });
  assert.deepEqual(normalizeCompassFollow({ kind: 'far', id: 'storm', name: 7 }), { kind: 'far', id: 'storm', name: '7' });
  // an older save (pick/pin only) migrates unchanged
  const old = journey(); old.guidance = { pick: '3,-2', pin: { rx: 4, ry: 1, name: 'Hunt' } };
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(old))).guidance, { pick: '3,-2', pin: { rx: 4, ry: 1, name: 'Hunt' } });
  // setCompassChoice: the new choice replaces all three; other fields stay
  const w = journey(); w.guidance = { pick: '1,1', pin: { rx: 2, ry: 2, name: 'p' }, follow: { kind: 'rescue' }, extra: 1 };
  assert.deepEqual(setCompassChoice(w, { follow: { kind: 'quest', id: 'leads' } }), { extra: 1, pick: null, pin: null, follow: { kind: 'quest', id: 'leads' } });
  assert.deepEqual(setCompassChoice(w, { pick: '0,4' }), { extra: 1, pick: '0,4', pin: null });
  assert.deepEqual(setCompassChoice(w), { extra: 1, pick: null, pin: null }, 'Point nowhere');
});
