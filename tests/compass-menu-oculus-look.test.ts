// Tim, 2026-11-19: "Look mode moves to the Oculus button... HOLDING the Oculus button turns Look mode on, and holding it again
// turns it off... A short tap on the Oculus keeps its current function. Remove the hold-to-Look from the compass and the camera
// button." And "Holding the compass opens a quick compass menu... listing everything the compass can point at", then "purely a
// quick chooser... It must not create or place new markers. Keep it fast: open, tap one, done."
// main.ts cannot boot under node (canvas, DOM), so its hold wiring (wireHold), Look toggle (toggleLook) and the menu's own
// functions are lifted from the source and run here against small fakes; the menu's rows are atlas-view.ts compassMenuModel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as CV from '../src/close-view.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { compassMenuModel, compassGuidance, seedHuntObjectives, objectiveKey, compassSectionHint, COMPASS_MENU, MAP_MARKS, normalizeMapMarks } from '../src/atlas-view.ts';
import { freshSave, migrateSave, setCompassChoice } from '../src/types.ts';
import { serializeSave, deserializeSave } from '../src/save-codec.ts';

const MAIN = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const L = CV.CLOSE_VIEW.camera.look;

// One top-level function of main.ts, by name (its braces balance; the functions lifted here hold no regex literals).
function lift(name) {
  const at = MAIN.indexOf(`function ${name}(`); assert.ok(at >= 0, `main.ts has ${name}`);
  const open = /\)\s*\{/g; open.lastIndex = at; let depth = 0, i = open.exec(MAIN).index + 1; while (MAIN[i] !== '{') i++;
  for (; i < MAIN.length; i++) { const c = MAIN[i]; if (c === '{') depth++; else if (c === '}' && --depth === 0) break; }
  return MAIN.slice(at, i + 1);
}

// ---- fakes: a clock, timers, an element with classList and listeners
function clock() {
  const c = { t: 1000, timers: [], next: 1 };
  c.setTimeout = (fn, ms) => { const id = c.next++; c.timers.push({ id, at: c.t + ms, fn }); return id; };
  c.clearTimeout = (id) => { c.timers = c.timers.filter((q) => q.id !== id); };
  c.advance = (ms) => { const end = c.t + ms; for (;;) { const due = c.timers.filter((q) => q.at <= end).sort((a, b) => a.at - b.at)[0]; if (!due) break; c.timers = c.timers.filter((q) => q !== due); c.t = due.at; due.fn(); } c.t = end; };
  c.performance = { now: () => c.t };
  return c;
}
function element() {
  const on = {}, cls = new Set();
  return {
    on, cls, classList: { add: (k) => cls.add(k), remove: (k) => cls.delete(k), contains: (k) => cls.has(k) },
    addEventListener: (t, fn) => (on[t] ||= []).push(fn),
    fire(t, e = {}) { for (const fn of on[t] || []) fn({ pointerId: 1, clientX: 10, clientY: 10, button: 0, preventDefault() {}, ...e }); },
  };
}
// wireHold from main.ts, against the fake clock (timeStamp 0 makes lookStamp read the clock, as a browser without timeStamp does)
function holdKit() {
  const c = clock(), vib = [];
  const make = new Function('createLookHold', 'CLOSE_VIEW', 'performance', 'setTimeout', 'clearTimeout', 'navigator',
    `const lookStamp=e=>Number.isFinite(e.timeStamp)&&e.timeStamp>0?e.timeStamp:performance.now();\n${lift('wireHold')}\nreturn wireHold;`);
  const wireHold = make(CV.createLookHold, CV.CLOSE_VIEW, c.performance, c.setTimeout, c.clearTimeout, { vibrate: (ms) => vib.push(ms) });
  const press = (el, ms, e = {}) => { el.fire('pointerdown', { timeStamp: 0, ...e }); c.advance(ms); el.fire('pointerup', { timeStamp: 0, ...e }); el.fire('click', { detail: 1 }); };
  return { c, wireHold, press, vib };
}
const ctx = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null, getImageData: () => ({ data: new Uint8ClampedArray(4) }) }, {
  get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true; },
});
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ctx }));
let drawAt = 500000;
// A Close View game (the Proving Ground's quiet Close View lab, as look-zoom.test.ts uses) and main.ts's own toggleLook on it
function closeViewGame() {
  const g = createLabFixture({ lab: 'close-view', scenario: 'heart', now: 1000 }).game; g.enemies = [];
  CV.resetCloseViewCamera(); for (let i = 0; i < 3; i++) { drawAt += 16; CV.closeViewFrame(ctx, g, 475, 661, drawAt, () => { const p = { x: g.player.x, y: g.player.y, fn() {} }; CV.closeViewTake([p], p); }); }
  const kit = new Function('closeViewShowing', 'closeViewLookToggle', 'game', `let lookHinted=false;\n${lift('toggleLook')}\nreturn toggleLook;`);
  return { g, toggleLook: kit(CV.closeViewShowing, CV.closeViewLookToggle, g) };
}

test('holding the Oculus in Close View turns Look mode on, and holding it again turns it off; its tap still switches the view', () => {
  const { g, toggleLook } = closeViewGame();
  assert.equal(CV.closeViewShowing(g), true, 'the lab shows Close View');
  const { c, wireHold, press, vib } = holdKit(), oc = element(), taps = [];
  wireHold(oc, oc, { can: () => !g.paused && CV.closeViewShowing(g), fire: toggleLook, tap: () => taps.push(c.t) });
  // the hold: the ring fills while held, then Look mode turns on (and the release is not also a tap)
  oc.fire('pointerdown', { timeStamp: 0 }); assert.equal(oc.cls.has('holding'), true, 'the ring shows while held');
  c.advance(L.holdMs - 50); assert.equal(CV.closeViewLookActive(), false, 'not before holdMs');
  c.advance(70); assert.equal(CV.closeViewLookActive(), true, 'held holdMs: Look mode on'); assert.equal(oc.cls.has('holding'), false, 'the ring goes as it fires');
  oc.fire('pointerup', { timeStamp: 0 }); assert.deepEqual(taps, [], 'a hold is never also a view switch'); assert.deepEqual(vib, [12], 'a short buzz');
  assert.match(g.message, /Hold the Oculus again/);
  // a tap while Look is on: the view switch, as before (no Look change)
  press(oc, 120); assert.equal(taps.length, 1, 'a tap is the Oculus tap'); assert.equal(CV.closeViewLookActive(), true, 'a tap leaves Look mode alone');
  // held again: off
  press(oc, L.holdMs + 40); assert.equal(CV.closeViewLookActive(), false, 'held again: Look mode off'); assert.equal(taps.length, 1);
  // a busy frame delays the timer past the release: the release itself is the hold, once
  oc.fire('pointerdown', { timeStamp: 0 }); c.t += L.holdMs + 200; oc.fire('pointerup', { timeStamp: 0 }); c.advance(50);
  assert.equal(CV.closeViewLookActive(), true, 'a late release still holds'); assert.equal(taps.length, 1, 'and is not a tap');
  CV.closeViewLookSet(g, false, true);
  // a slide is no hold (and, with the finger still on the button, it lifts as a tap)
  oc.fire('pointerdown', { timeStamp: 0 }); oc.fire('pointermove', { clientX: 10 + L.holdSlop + 2 }); assert.equal(oc.cls.has('holding'), false, 'the ring clears on a slide'); c.advance(L.holdMs * 2); oc.fire('pointerup', { timeStamp: 0 });
  assert.equal(CV.closeViewLookActive(), false, 'a slide never turns Look on');
  // Attack (and the other existing exits) still end it
  press(oc, L.holdMs + 20); assert.equal(CV.closeViewLookActive(), true);
  assert.equal(CV.closeViewLookActions(g, { attack: true }), true); assert.equal(CV.closeViewLookActive(), false, 'Attack ends Look mode');
  for (const k of ['dodge', 'spell', 'spell2', 'spell3', 'tool']) assert.ok(CV.LOOK_EXITS.includes(k), `${k} still ends it`);
});

test('outside Close View a held Oculus is only its tap (no ring, no Look mode)', () => {
  const { c, wireHold, press } = holdKit(), oc = element(), taps = [], fired = [];
  wireHold(oc, oc, { can: () => false, fire: () => fired.push(1), tap: () => taps.push(1) });
  oc.fire('pointerdown', { timeStamp: 0 }); assert.equal(oc.cls.has('holding'), false, 'no ring where a hold does nothing');
  c.advance(L.holdMs * 2); oc.fire('pointerup', { timeStamp: 0 });
  assert.deepEqual(fired, []); assert.deepEqual(taps, [1], 'the press switches the view, as a tap'); press(oc, 80); assert.deepEqual(taps, [1, 1]);
});

test('main.ts wiring: the Oculus press is made on release (not on pointerdown), with the same holdMs; key O and Shift+Enter', () => {
  assert.match(MAIN, /oculusButton\.onpointerdown=e=>\{e\.preventDefault\(\);/, 'the input\'s pointerdown press gives way');
  assert.match(MAIN, /wireHold\(oculusButton,oculusButton,\{can:\(\)=>!game\.paused&&closeViewShowing\(game\),fire:toggleLook,tap:\(\)=>\{input\.state\.oculus=true\}\}\)/, 'hold: Look in Close View; tap: the "oculus" press');
  assert.match(MAIN, /oculusButton\.addEventListener\("keydown",e=>\{if\(e\.key==="Enter"&&e\.shiftKey\)\{e\.preventDefault\(\);toggleLook\(\)\}\}\)/);
  assert.match(MAIN, /CLOSE_VIEW\.camera\.look\.holdMs\+10/, 'the hold time is today\'s (CLOSE_VIEW.camera.look.holdMs)');
  assert.equal(L.holdMs, 550, 'unchanged');
  const input = readFileSync(new URL('../src/input.ts', import.meta.url), 'utf8'); assert.match(input, /o: "oculus"/, 'key O still taps');
  assert.match(MAIN, /hudSet\(ob, "class:look-on", closeViewLookActive\(\)\)/, 'the Oculus shows Look mode on');
  assert.match(CSS, /\.left-controls \.oculus-button\.holding::after, \.left-controls \.compass-slot\.holding::after \{[^}]*animation: hud-hold-fill 550ms linear forwards;/, 'the fill ring lasts holdMs');
  assert.match(CSS, /body\.reduce-motion \.left-controls \.oculus-button\.holding::after, body\.reduce-motion \.left-controls \.compass-slot\.holding::after \{ animation: none;/, 'Reduced Motion: no animation');
});

test('the compass and the camera (target) button no longer enter Look mode', () => {
  const toggles = [...MAIN.matchAll(/(?<!function )toggleLook\(\)/g)].length, fires = [...MAIN.matchAll(/fire:toggleLook/g)].length;
  assert.equal(fires, 1, 'only the Oculus hold fires toggleLook'); assert.equal(toggles, 1, 'and only the Oculus\'s Shift+Enter calls it');
  assert.match(MAIN, /const compassHold=wireHold\(navCompass,navCompassSlot,\{can:\(\)=>!game\.paused,fire:\(\)=>openCompassMenu\(\)\}\)/, 'the compass hold opens its menu');
  assert.match(MAIN, /navCompass\.addEventListener\("keydown",e=>\{if\(e\.key==="Enter"&&e\.shiftKey\)\{e\.preventDefault\(\);openCompassMenu\(\);return\}/, 'Shift+Enter on the compass: the menu');
  // the camera button (the Close View target/lock button) has no hold at all: a long press is only its tap
  const cv = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'), mount = cv.slice(cv.indexOf('export function mountCloseViewControls('));
  const lockCode = mount.slice(mount.indexOf('const activateLock'), mount.indexOf('return { svg, lock'));
  assert.doesNotMatch(lockCode, /closeViewLook(Set|Toggle)|createLookHold/, 'the lock button never touches Look mode');
  assert.doesNotMatch(MAIN, /closeViewLock[^\n]*toggleLook|#closeViewLock[^\n]*wireHold/);
  assert.doesNotMatch(HTML, /id="navCompassHelp"[^>]*>[^<]*Look mode/, 'the compass help no longer mentions Look mode');
  assert.match(HTML, /id="navCompassHelp"[^>]*>[^<]*hold[^<]*list/);
});

test('a compass hold opens the menu; a compass tap still cycles (the hold swallows only its own click)', () => {
  const { c, wireHold, press } = holdKit(), compass = element(), slot = element(); let menus = 0, cycles = 0;
  const h = wireHold(compass, slot, { can: () => true, fire: () => { menus++; } });
  compass.on.click = [() => { if (h.takeClick()) return; cycles++; }];
  press(compass, 120); assert.equal(cycles, 1, 'a tap steps the compass'); assert.equal(menus, 0);
  compass.fire('pointerdown', { timeStamp: 0 }); assert.equal(slot.cls.has('holding'), true, 'the ring fills on the compass slot');
  c.advance(L.holdMs + 20); assert.equal(menus, 1, 'held: the menu opens'); compass.fire('pointerup', { timeStamp: 0 }); compass.fire('click', { detail: 1 });
  assert.equal(cycles, 1, 'its release is not a tap'); press(compass, 100); assert.equal(cycles, 2, 'the next tap cycles again');
  // the menu opens in both views: its gate is only "not paused"
  assert.doesNotMatch(lift('openCompassMenu'), /closeViewShowing/);
});

// ---- the menu's rows (atlas-view.ts compassMenuModel)
function world() {
  const quests = [
    { title: 'Hunt: The Ashen Stag', detail: '', at: { rx: 4, ry: -2 } },
    { title: "Old Quillon's errand", detail: '', at: null }, // no section: not a compass target
    { title: 'A great enemy', detail: '', at: { rx: 0, ry: 0 } },
  ];
  const hunts = seedHuntObjectives([{ tower: 'tower:9,9', kind: 'ember', state: 'active', rx: 9, ry: 9, where: 'ground', x: 3, y: 4 }], { ember: 'Ember Seed' }, 2, 2);
  const objectives = [...hunts, { kind: 'challenge', rx: 3, ry: 2, name: 'Crossing: The Long Stair', tag: 'Challenge' }, { kind: 'crossing', rx: 1, ry: 5, name: 'A buried signal', tag: 'Signal' }];
  const marks = [{ rx: 7, ry: 1, color: 0 }, { rx: -3, ry: 2, color: 2 }];
  return { quests, objectives, marks, waypoint: { area: 'overworld', rx: 2, ry: 6, label: 'Old mill' } };
}

test('the menu lists quests, seed hunts, nearby objectives and your markers, grouped, with hints; nothing is made or moved', () => {
  const w = world(), marksBefore = JSON.stringify(w.marks), wpBefore = JSON.stringify(w.waypoint);
  const m = compassMenuModel({ area: 'overworld', here: { rx: 2, ry: 2 }, ...w });
  assert.deepEqual(m.groups.map((g) => g.title), ['Quests', 'Seed hunts', 'Nearby objectives', 'Your markers']);
  const rows = Object.fromEntries(m.groups.map((g) => [g.id, g.rows]));
  assert.deepEqual(rows.quests.map((r) => r.label), ['Hunt: The Ashen Stag', 'A great enemy'], 'quests with a section (the Journal\'s, as "Point compass here")');
  assert.deepEqual(rows.seedHunts.map((r) => r.label), ['Seed hunt · Ember Seed']); assert.equal(rows.seedHunts[0].choose.key, 'seed-hunt:tower:9,9');
  assert.deepEqual(rows.nearby.map((r) => [r.label, r.tag]), [['Crossing: The Long Stair', 'Challenge'], ['A buried signal', 'Signal']]);
  assert.deepEqual(rows.markers.map((r) => r.label), ['Old mill', `${MAP_MARKS.names[0]} mark`, `${MAP_MARKS.names[2]} mark`], 'the waypoint, then every Atlas mark');
  assert.equal(rows.markers[1].color, MAP_MARKS.colors[0]);
  assert.equal(rows.quests[0].hint, '4 sections north-east'); assert.equal(compassSectionHint(2, 2, 2, 2), 'this section');
  assert.equal(m.count, 8); assert.equal(m.groups.flatMap((g) => g.rows).filter((r) => r.current).length, 0, 'nothing followed: nothing highlighted');
  assert.equal(JSON.stringify(w.marks), marksBefore); assert.equal(JSON.stringify(w.waypoint), wpBefore, 'the menu only reads the markers');
  assert.equal(m.clearable, false);
  // a waypoint inside a dungeon is not an overworld target; with nothing at all the menu says so
  assert.equal(compassMenuModel({ area: 'overworld', here: { rx: 0, ry: 0 }, waypoint: { area: 'dungeon', rx: 1, ry: 1 } }).count, 0);
  assert.equal(compassMenuModel({ area: 'arena' }).count, 0);
});

// Changed 2026-11-19 (Tim: the compass is sticky; markers are opt-in): the highlight is exactly the choice (a pin, a followed
// source, a pick), never a guess from the needle's section; a marker is chosen as a followed source, not pinned.
test('the followed target is highlighted: a pin, a followed hunt, quest or marker, or the tap cycle\'s pick', () => {
  const w = world(), here = { rx: 2, ry: 2 }, cur = (m) => m.groups.flatMap((g) => g.rows).filter((r) => r.current).map((r) => r.label);
  assert.deepEqual(cur(compassMenuModel({ area: 'overworld', here, ...w, follow: { kind: 'marker', id: 'mark:0' } })), ['Rose mark']);
  assert.deepEqual(cur(compassMenuModel({ area: 'overworld', here, ...w, follow: { kind: 'marker', id: 'waypoint' } })), ['Old mill']);
  assert.deepEqual(cur(compassMenuModel({ area: 'overworld', here, ...w, pin: { rx: 7, ry: 1, name: 'Rose mark' } })), [], 'a marker is never a pin row');
  assert.deepEqual(cur(compassMenuModel({ area: 'overworld', here, ...w, pin: { rx: 4, ry: -2, name: 'Hunt: The Ashen Stag' } })), ['Hunt: The Ashen Stag']);
  assert.deepEqual(cur(compassMenuModel({ area: 'overworld', here, ...w, pickKey: 'seed-hunt:tower:9,9' })), ['Seed hunt · Ember Seed']);
  assert.deepEqual(cur(compassMenuModel({ area: 'overworld', here, ...w, pickKey: '3,2' })), ['Crossing: The Long Stair']);
  assert.deepEqual(cur(compassMenuModel({ area: 'overworld', here, ...w, guidance: { rx: 4, ry: -2, name: 'The Ashen Stag' } })), [], 'a needle nobody chose is not guessed');
  const followed = [{ title: 'Hunt: The Ashen Stag', at: { rx: 4, ry: -2 }, follow: { kind: 'hunt', id: 'h1' } }, { title: 'Relay leads', at: null, follow: { kind: 'quest', id: 'leads' } }];
  const fm = compassMenuModel({ area: 'overworld', here, quests: followed, follow: { kind: 'quest', id: 'leads' } });
  assert.deepEqual(fm.groups[0].rows.map((r) => [r.label, r.hint, r.current]), [['Hunt: The Ashen Stag', '4 sections north-east', false], ['Relay leads', COMPASS_MENU.waymarksHint, true]], 'a quest with no section is listed when it can be followed');
  assert.deepEqual(fm.groups[0].rows[0].choose, { kind: 'follow', follow: { kind: 'hunt', id: 'h1' }, name: 'Hunt: The Ashen Stag' });
  assert.equal(compassMenuModel({ area: 'overworld', here, ...w, pickKey: '3,2' }).clearable, true);
  assert.equal(fm.clearable, true);
});

test('in a dungeon the menu lists the door points the compass cycles, the chosen one highlighted', () => {
  const doors = [{ id: 'a::1', slot: 1, label: 'OUT', x: 10, y: 4 }, { id: 'a::2', slot: 2, label: 'STAIR to Floor 2', x: 2, y: 4 }];
  const m = compassMenuModel({ area: 'dungeon', here: { x: 5, y: 4 }, doors, doorPick: 'a::2' });
  assert.deepEqual(m.groups.map((g) => g.title), [COMPASS_MENU.groups.doors]);
  assert.deepEqual(m.groups[0].rows.map((r) => [r.label, r.hint, r.current]), [['Door point 1: OUT', '5 paces east', false], ['Door point 2: STAIR to Floor 2', '3 paces west', true]]);
  assert.equal(compassMenuModel({ area: 'dungeon', here: { x: 5, y: 4 }, doors }).groups[0].rows[0].current, true, 'no pick: the first, as the compass points');
});

// ---- choosing a row: main.ts chooseCompassTarget, chooseGuidance and rememberGuidance, lifted with their state (types.ts
// setCompassChoice writes the save). Changed 2026-11-19 (Tim: the compass is sticky; markers are opt-in): a marker is followed, not
// pinned, and a pick is never pinned to beat a tracked hunt, because nothing leads a choice any more.
function chooser(save, objectives) {
  const all = objectives;
  const make = new Function('save', 'compassGuidance', 'objectiveKey', 'setCompassChoice', 'all', `
    let compassPick=null,compassPin=null,compassFollow=null,guidanceSeen=save.guidance,dungeonCompassPick=null,closed=0;const game={message:""},navigationCache={key:1},persist=()=>{};
    const compassObjective=()=>compassPick===null?null:all.find(o=>objectiveKey(o)===compassPick)||null;
    const navigationTargets=()=>({guidance:compassGuidance(save,{area:"overworld",pin:compassPin,follow:compassPin?null:compassFollow,pick:compassPin||compassFollow?null:compassObjective()})});
    const closeCompassMenu=()=>{closed++};
    ${lift('syncGuidance')}
    ${lift('rememberGuidance')}
    ${lift('chooseGuidance')}
    ${lift('chooseCompassTarget')}
    return {choose:chooseCompassTarget,sync:syncGuidance,get state(){return{compassPick,compassPin,compassFollow,dungeonCompassPick,closed,message:game.message,guidance:navigationTargets().guidance}}};`);
  return make(save, compassGuidance, objectiveKey, setCompassChoice, all);
}

test('a row sets the compass (a pick, a pin or a followed source), persists in the save, and closes the menu', () => {
  const w = world(), s = freshSave(); s.seed = 'COMPASS-MENU'; s.mapMarks = w.marks; s.manualWaypoint = { kind: 'section', ...w.waypoint };
  const m = compassMenuModel({ area: 'overworld', here: { rx: 2, ry: 2 }, ...w }), row = (label) => m.groups.flatMap((g) => g.rows).find((r) => r.label === label);
  const k = chooser(s, w.objectives);
  k.choose(row('Seed hunt · Ember Seed'));
  assert.equal(k.state.compassPick, 'seed-hunt:tower:9,9', 'the tap cycle\'s own pick'); assert.equal(k.state.compassPin, null); assert.equal(k.state.closed, 1, 'and the menu closes');
  assert.deepEqual(s.guidance, { pick: 'seed-hunt:tower:9,9', pin: null }, 'kept in the save as the pick is');
  assert.equal(k.state.guidance.rx, 9); assert.equal(k.state.guidance.x, 3, 'the seed itself, as the cycle points'); assert.match(k.state.message, /Compass: Seed hunt · Ember Seed · 7 sections south-east/);
  const back = migrateSave(deserializeSave(serializeSave(s))); assert.deepEqual(back.guidance, { pick: 'seed-hunt:tower:9,9', pin: null }, 'survives a save and load');
  k.choose(row('Violet mark'));
  assert.deepEqual(s.guidance, { pick: null, pin: null, follow: { kind: 'marker', id: 'mark:2' } }, 'a marker is followed, and only because it was chosen');
  assert.equal(k.state.guidance.name, 'Violet mark'); assert.deepEqual([k.state.guidance.rx, k.state.guidance.ry], [-3, 2]); assert.deepEqual(normalizeMapMarks(w.marks).length, 2, 'the marks are unchanged');
  assert.deepEqual(migrateSave(deserializeSave(serializeSave(s))).guidance.follow, { kind: 'marker', id: 'mark:2' }, 'the followed marker survives a save and load');
  k.choose(row('Old mill')); assert.equal(k.state.guidance.name, 'Old mill'); assert.deepEqual(s.guidance.follow, { kind: 'marker', id: 'waypoint' });
  s.manualWaypoint = null; k.sync(); assert.equal(k.state.guidance, null, 'the chosen waypoint cleared: no needle, nothing else takes over');
  k.choose(row('Crossing: The Long Stair')); assert.deepEqual(s.guidance, { pick: '3,2', pin: null }, 'a pick lets the follow go, as the tap cycle does');
  // a tracked Viewport hunt no longer leads a pick
  s.viewport = { activeHuntId: 'h1', contracts: { h1: { id: 'h1', status: 'tracking', title: 'The Ashen Stag', target: { rx: 4, ry: -2 } } } };
  k.choose(row('A buried signal')); assert.deepEqual(s.guidance, { pick: '1,5', pin: null }); assert.equal(k.state.guidance.name, 'A buried signal');
  k.choose(row('Hunt: The Ashen Stag')); assert.deepEqual(s.guidance.pin, { rx: 4, ry: -2, name: 'Hunt: The Ashen Stag' }, 'a quest row without a followed source pins, as the Journal does');
  k.choose({ label: '', choose: { kind: 'none' } }); assert.deepEqual(s.guidance, { pick: null, pin: null }, '"Point nowhere" lets it go'); assert.equal(k.state.closed, 7);
  k.choose({ label: 'Door point 2: STAIR', hint: '', choose: { kind: 'door', id: 'a::2' } }); assert.equal(k.state.dungeonCompassPick, 'a::2', 'in a dungeon: the door point');
});

test('the menu opens paused (as the Atlas and Journal), its X / a tap outside / Back close it and resume', () => {
  const make = new Function(`
    const game={paused:false},calls=[],compassMenu={hidden:true},compassMenuList={replaceChildren(){},querySelector:()=>null,scrollTop:0},pausePanel={open:false},atlas={open:false},panel={open:false},journal={open:false},optionsPanel={open:false};
    let compassMenuOpen=false,compassMenuPaused=false,overlayClosedAt=0,glimpseRun=null;const performance={now:()=>5};const $=()=>({focus(){}});
    const renderCompassMenu=()=>calls.push("render"),pauseForOverlay=()=>{calls.push("pause");game.paused=true},resume=()=>{calls.push("resume");game.paused=false};
    ${lift('openCompassMenu')}
    ${lift('closeCompassMenu')}
    return {openCompassMenu,closeCompassMenu,game,calls,compassMenu,pausePanel};`);
  const k = make();
  assert.equal(k.openCompassMenu(), true); assert.equal(k.compassMenu.hidden, false); assert.equal(k.game.paused, true); assert.deepEqual(k.calls, ['render', 'pause']);
  assert.equal(k.openCompassMenu(), false, 'once');
  assert.equal(k.closeCompassMenu(), true); assert.equal(k.compassMenu.hidden, true); assert.equal(k.game.paused, false, 'closing resumes'); assert.equal(k.closeCompassMenu(), false);
  k.game.paused = true; assert.equal(k.openCompassMenu(), false, 'not over another pause'); k.game.paused = false;
  k.openCompassMenu(); k.pausePanel.open = true; k.closeCompassMenu(); assert.equal(k.game.paused, true, 'under the pause menu it stays paused');
  // the controls that close it
  assert.match(MAIN, /\$\("#compassMenuClose"\)\?\.addEventListener\("click",\(\)=>closeCompassMenu\(\)\)/, 'the red X');
  assert.match(MAIN, /compassMenu\?\.querySelector\("\.compass-menu-backdrop"\)\?\.addEventListener\("pointerdown",e=>\{e\.preventDefault\(\);e\.stopPropagation\(\);closeCompassMenu\(\)\}\)/, 'a tap outside, which does nothing else');
  assert.match(MAIN, /if\(closeCompassMenu\(\)\)return; \/\/ 2026-11-19: Back/, 'Back');
  assert.match(MAIN, /if \(show\) closeCompassMenu\(false\);/, 'the pause menu closes it'); assert.match(lift('resume'), /closeCompassMenu\(false\)/);
});

test('the panel: left of the compass and Oculus, red X top-left, readable rows, scrolls, fits 360 px', () => {
  assert.match(HTML, /<div id="compassMenu" class="compass-menu" hidden>\s*<div class="compass-menu-backdrop"><\/div>\s*<section class="compass-menu-panel" role="dialog"[^>]*>\s*<header class="compass-menu-head"><button id="compassMenuClose" class="compass-menu-close"/, 'the X is the header\'s first child (top left)');
  const panel = CSS.match(/\.compass-menu-panel \{([^}]*)\}/)[1];
  assert.match(panel, /right: calc\(env\(safe-area-inset-right\) \+ 56px\)/, 'its right edge is left of the compass and Oculus column (8 + 40 + 8)');
  assert.match(panel, /width: min\(22rem, calc\(100vw - env\(safe-area-inset-left\) - env\(safe-area-inset-right\) - 64px\)\)/, 'never wider than the screen: 296 px at 360');
  assert.match(panel, /max-height: min\(36rem, calc\(100dvh/); assert.match(CSS, /\.compass-menu-list \{ overflow-y: auto;/, 'it scrolls');
  assert.match(CSS, /\.compass-menu-close \{[^}]*width: 44px; height: 44px;[^}]*border: 1px solid #e0574f;[^}]*color: #ff6a5e;/, 'a red X, thumb sized');
  assert.match(CSS, /\.compass-menu-row \{[^}]*min-height: 48px;/); assert.match(CSS, /\.compass-menu-row \.cm-name \{[^}]*font: 600 \.95rem[^}]*overflow-wrap: anywhere;/, 'names wrap, in rem (the Text size option)');
  assert.match(CSS, /\.compass-menu-row\[aria-pressed="true"\] \{ border-color: #f0c86a;/, 'the followed row is highlighted');
  assert.match(CSS, /\.compass-menu\[hidden\] \{ display: none; \}/);
});
