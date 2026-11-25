// The compass, rebuilt (Tim, 2026-11-25): "Fix the compass so it's consistent, shows all the things, and just works; it needs to
// be reliable." One target, one readout a frame (atlas-view.ts compassReadout) that the dial, the Close View Ribbon and the standard
// view's edge arrow all draw; one matcher (types.ts compassChoiceIs) for the Journal's Leads, Paths and the quick menu; hinted
// leads as an uncertainty arc that narrows and turns warm; up to four nearby places, known or sensed; WAYPOINT REACHED with the
// diamond's collapse and a haptic tick; and every choice kept through a save, a reload and an exact resume.
// main.ts cannot boot under node, so its compass functions are lifted from the source and run against small fakes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { freshSave, migrateSave, normalizeGuidance, setCompassChoice, setCompassDoor, compassChoiceIs } from '../src/types.ts';
import { serializeSave, deserializeSave } from '../src/save-codec.ts';
import {
  COMPASS_TARGET_KINDS, COMPASS_RIBBON, RIBBON_CARDINALS, compassReadoutState, compassReadout, compassDistanceText, compassDistanceKey, ribbonX, ribbonArc, ribbonPlace, ribbonLayout, RIBBON_SLOTS,
  compassEdge, nearbyPlaces, compassDiscovery, senseRadius, NEARBY_KINDS, compassGuidance, compassTargetArrived, compassArrivalState, compassArrivalStep, compassArrivalReset,
  compassMenuModel, MOUTH_PINS, seedHuntObjectives, objectiveKey,
} from '../src/atlas-view.ts';
import { closeViewCompassRotation } from '../src/close-view.ts';
import { rumourZone, rumourLeads, RUMOURS } from '../src/leads.ts';
import { trailTarget } from '../src/thread-trails.ts';
import { pathsModel } from '../src/paths.ts';
import { hamletSection } from '../src/settlements.ts';
import { crossingRolled } from '../src/world.ts';
import { APERTURE_BANDS } from '../src/items.ts';

const MAIN = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
function lift(name) {
  const at = MAIN.indexOf(`function ${name}(`); assert.ok(at >= 0, `main.ts has ${name}`);
  let i = MAIN.indexOf('{', MAIN.indexOf(')', at)), depth = 0;
  for (; i < MAIN.length; i++) { const c = MAIN[i]; if (c === '{') depth++; else if (c === '}' && --depth === 0) break; }
  return MAIN.slice(at, i + 1);
}
const journey = (seed = 'RIBBON') => { const s = freshSave(); s.seed = seed; return s; };
const here = (rx, ry, x = 16, y = 16, area = 'overworld', yaw = NaN) => ({ area, rx, ry, x, y, yaw, elev: NaN, targetElev: NaN });
const facing = (h, yaw) => { h.yaw = yaw; return h; };
const DEG = 180 / Math.PI;

// The dial's needle (main.ts updateNavigationArrow), lifted: with the readout it must turn exactly by the readout's vector.
function dial(game) {
  const make = new Function('game', 'hudSet', 'compassRotation', 'compassHeading', `${lift('updateNavigationArrow')}\nreturn updateNavigationArrow;`);
  return make(game, (e, k, v) => { e[k] = v; }, (dx, dy) => closeViewCompassRotation(dx, dy), () => 'east');
}

// ---------------------------------------------------------------- one target, every view
test('every target kind resolves once and the dial, the Ribbon, the edge arrow and the arrival agree on it', () => {
  const s = journey();
  s.viewport.contracts.h1 = { id: 'h1', title: 'The Glass Stag', status: 'accepted', target: { rx: 3, ry: -2 } };
  s.farQuests = { storm: { status: 'open', rx: -5, ry: 4 } };
  s.relayNetwork = { coordinate: { rx: 7, ry: 7 } };
  s.manualWaypoint = { rx: -2, ry: -6, label: 'Old mill' };
  s.mapMarks = [{ rx: 4, ry: 1, color: 1 }];
  const seed = seedHuntObjectives([{ tower: 'tower:x', kind: 'ember', state: 'active', rx: 2, ry: 3, where: 'ground', x: 5, y: 9 }], { ember: 'Ember Seed' }, 0, 0)[0];
  const cases = {
    pick: compassGuidance(s, { pick: { rx: 1, ry: -1, x: 4, y: 20, name: 'Crossing' } }),
    seedHunt: compassGuidance(s, { pick: seed }),
    pin: compassGuidance(s, { pin: { rx: -3, ry: 2, name: 'A quest' } }),
    mouth: compassGuidance(s, { pin: { rx: 1, ry: 1, name: 'The Array Mouth' } }),
    hunt: compassGuidance(s, { follow: { kind: 'hunt', id: 'h1' } }),
    far: compassGuidance(s, { follow: { kind: 'far', id: 'storm', name: 'Storm folk' } }),
    rescue: compassGuidance(s, { follow: { kind: 'rescue' }, rescue: { area: 'overworld', rx: 6, ry: -1, x: 3, y: 3, kind: 'guidance', name: 'Rescue' } }),
    marker: compassGuidance(s, { follow: { kind: 'marker', id: 'waypoint' } }),
    mark: compassGuidance(s, { follow: { kind: 'marker', id: 'mark:1' } }),
    door: { local: true, x: 20, y: 9, level: 1 },
  };
  assert.deepEqual([cases.mouth.rx, cases.mouth.ry], [7, 7], 'a Mouth pin follows the live Mouth (never a stale coordinate)');
  for (const [kind, t] of Object.entries(cases)) {
    assert.ok(t, kind);
    const game = { area: 'overworld', rx: 0, ry: 0, player: { x: 10, y: 12 } }, h = here(0, 0, 10, 12);
    for (const yaw of [NaN, 0, -Math.PI / 2, 2.4]) {
      const r = compassReadout(compassReadoutState(), t, facing(h, yaw));
      assert.ok(r.on && !r.dormant, kind);
      // the same bearing everywhere: the dial (north-up), the Ribbon (facing), the edge arrow (screen, north-up)
      const arrow = {}; dial(game)(arrow, t.local ? null : t, r);
      if (!t.local) assert.equal(arrow.transform, `rotate(${closeViewCompassRotation(r.dx, r.dy)}deg)`, `${kind}: the dial turns by the readout`);
      const legacy = {}; if (!t.local) { dial(game)(legacy, t); assert.equal(legacy.transform, arrow.transform, `${kind}: and that is what the needle always showed`); }
      const want = Math.atan2(r.dy, r.dx);
      assert.ok(Math.abs(r.bearing - want) < 1e-12, kind);
      const rel = Math.atan2(Math.sin(want - (Number.isFinite(yaw) ? yaw : -Math.PI / 2)), Math.cos(want - (Number.isFinite(yaw) ? yaw : -Math.PI / 2)));
      assert.ok(Math.abs(r.rel - rel) < 1e-9, `${kind}: the Ribbon's bearing`);
      assert.equal(r.x, ribbonX(r.rel));
      const e = compassEdge({}, r, 390, 844, 32);
      if (e.on) assert.equal(e.deg, Math.round(want * DEG) + 90, `${kind}: the edge arrow's bearing`);
    }
  }
  // the dungeon's door point: the same vector the dungeon needle uses (main.ts pointDungeonCompass: point - player)
  const r = compassReadout(compassReadoutState(), cases.door, here(0, 0, 10, 12, 'dungeon'));
  assert.deepEqual([r.dx, r.dy, r.level], [10, -3, 1]); assert.match(MAIN, /const dx = point\.x - game\.player\.x, dy = point\.y - game\.player\.y;/);
  // the table names every follow kind the save can hold, and the door point
  const ids = COMPASS_TARGET_KINDS.map((k) => k.id);
  for (const k of ['pick', 'seedHunt', 'pin', 'mouth', 'hunt', 'far', 'rescue', 'quest', 'thread', 'second', 'errand', 'leads', 'marker', 'door']) assert.ok(ids.includes(k), k);
});

test('a target outside this area is dormant in every view (a pick as much as a pin or a follow), and in other sections reads in seconds', () => {
  const t = compassGuidance(journey(), { pin: { rx: 2, ry: 0, name: 'P' } });
  const r = compassReadout(compassReadoutState(), t, here(0, 0, 16, 16, 'dungeon'));
  assert.equal(r.dormant, true); assert.equal(compassDistanceText(r), 'outside'); assert.equal(compassEdge({}, r, 390, 844, 32).on, false);
  assert.match(MAIN, /function dormantPick\(\)\{if\(game\.area==="overworld"\|\|compassPin\|\|compassFollow\|\|compassPick===null\)return null;/);
  const o = compassReadout(compassReadoutState(), t, here(0, 0));
  assert.equal(compassDistanceText(o), `${Math.round(64 / COMPASS_RIBBON.walk)} sec`, 'two sections east: seconds of walking');
  const same = compassReadout(compassReadoutState(), { area: 'overworld', rx: 0, ry: 0, x: 26, y: 15, name: 's' }, { ...here(0, 0, 10.5, 15.5), elev: 0, targetElev: 2 });
  assert.equal(compassDistanceText(same), '16 m ↑', 'in this section: metres, and a level up');
  const down = compassReadout(compassReadoutState(), { local: true, x: 4, y: 4, level: -1 }, here(0, 0, 4, 9, 'dungeon'));
  assert.equal(compassDistanceText(down), '5 m ↓');
  assert.equal(compassDistanceText(compassReadout(compassReadoutState(), { area: 'overworld', rx: 40, ry: 0, name: 'far' }, here(0, 0))), `${Math.round(40 * 32 / COMPASS_RIBBON.walk / 60)} min`);
});

test('behind you: the diamond holds the bar\'s nearer edge; the cardinals and marks outside the span are not drawn', () => {
  const t = { area: 'overworld', rx: 0, ry: 3, name: 'south' }, north = -Math.PI / 2;
  const r = compassReadout(compassReadoutState(), t, facing(here(0, 0), north));
  assert.equal(r.behind, true); assert.ok(r.x === 0 || r.x === 1, 'clamped to an end');
  const ahead = compassReadout(compassReadoutState(), { area: 'overworld', rx: 0, ry: -3, name: 'n' }, facing(here(0, 0), north));
  assert.equal(ahead.behind, false); assert.ok(Math.abs(ahead.x - .5) < 1e-9, 'dead ahead is the middle');
  const east = compassReadout(compassReadoutState(), { area: 'overworld', rx: 3, ry: 0, name: 'e' }, facing(here(0, 0), -Math.PI / 4));
  assert.ok(east.x > .5 && east.x < 1, 'east of a north-east facing is right of centre');
  const at = (label, yaw) => ribbonPlace(RIBBON_CARDINALS.find((c) => c.label === label).bearing, yaw);
  assert.equal(at('N', north), .5); assert.ok(Number.isNaN(at('S', north)), 'S is behind'); assert.ok(at('NE', north) > .5 && Number.isNaN(at('E', north)), 'E is 90° off: past the bar\'s 75°'); assert.ok(at('NW', north) < .5);
  assert.equal(COMPASS_RIBBON.spanDeg, 75); assert.equal(COMPASS_RIBBON.widthPct, 56);
  assert.match(CSS, /\.compass-ribbon \{[^}]*calc\(\(100vw - env\(safe-area-inset-left\) - env\(safe-area-inset-right\)\) \* \.56\)/, 'inside the safe area, 56% wide');
  assert.match(CSS, /mask-image: linear-gradient\(90deg, transparent, #000 14%, #000 86%, transparent\)/, 'faded ends');
});

// ---------------------------------------------------------------- the uncertainty arc
test('a hinted lead: an arc that narrows as the Wayfarer nears, a warm glow with no direction inside, the edge glow widening the same way', () => {
  const zone = { rx: 10, ry: 0, r: 3, site: false }, t = { area: 'overworld', rx: 7, ry: 0, kind: 'guidance', name: 'Bells', zone };
  let last = Infinity; const widths = [];
  for (const rx of [-20, -8, 0, 4, 6]) {
    const r = compassReadout(compassReadoutState(), t, here(rx, 0)); assert.ok(r.hinted && !r.warm, `${rx}`);
    assert.ok(r.halfDeg <= last + 1e-9, `narrows: ${r.halfDeg} at ${rx}`); last = r.halfDeg;
    assert.ok(r.halfDeg >= COMPASS_RIBBON.hint.minDeg && r.halfDeg <= COMPASS_RIBBON.hint.maxDeg);
    assert.ok(Math.abs(r.bearing) < 1e-9, 'aimed at the zone, not the pinned edge section');
    const a = ribbonArc(r); assert.ok(a.x0 < r.x && a.x1 > r.x || a.x0 === 0 || a.x1 === 1);
    widths.push(compassEdge({}, r, 390, 844, 32).spread);
    assert.match(compassDistanceText(r), /^≈/, 'only roughly how far');
  }
  assert.ok(widths[0] >= widths[widths.length - 1] && widths[0] > 0, 'the edge glow narrows with the arc');
  const inside = compassReadout(compassReadoutState(), t, here(9, 1));
  assert.equal(inside.warm, true); assert.equal(ribbonArc(inside), null, 'no arc'); assert.equal(compassDistanceText(inside), 'close');
  assert.equal(compassEdge({}, inside, 390, 844, 32).on, false, 'no arrow: the soft all-round glow instead');
  const game = { area: 'overworld', rx: 9, ry: 1, player: { x: 16, y: 16 } }, arrow = {};
  dial(game)(arrow, t, inside); assert.equal(arrow['class:warm'], true); assert.equal(arrow.transform, '', 'the dial gives no direction either');
  // arriving at a hint with no site is entering its zone; with a site, its section
  assert.equal(compassTargetArrived(t, 'overworld', 9, 1, 16, 16), true); assert.equal(compassTargetArrived(t, 'overworld', 5, 0, 16, 16), false);
  const site = { ...t, zone: { ...zone, site: true } };
  assert.equal(compassTargetArrived(site, 'overworld', 9, 1, 16, 16), false); assert.equal(compassTargetArrived(site, 'overworld', 7, 0, 3, 3), true);
  assert.match(MAIN, /hudSet\(compassWarmEl,"class:on",!close&&r\.on&&r\.warm\)/);
});

test('rumours carry their hint zone through the Journal, the quick menu and the save; a wonder\'s site lies inside its zone', () => {
  const s = journey('ZONES');
  for (const [kind, extra] of [['wonder', { rx: 9, ry: -4 }], ['horde', { rx: -6, ry: 3 }], ['bells', { rx: 1, ry: 1 }]]) {
    const z = rumourZone(s, { id: `${kind}:x`, kind, ...extra }); assert.ok(z, kind);
    if (kind !== 'bells') { assert.equal(z.site, true); assert.ok(Math.hypot(z.rx - extra.rx, z.ry - extra.ry) <= z.r, `${kind}: the site is inside`); }
    else { assert.equal(z.site, false); assert.ok(z.r >= 1); assert.equal(RUMOURS.bells.set, 'bells'); }
  }
  assert.equal(rumourZone(s, { id: 'awakening', kind: 'awakening' }), null, 'no place, no zone');
  // the menu's quest row pins with the zone; the pin keeps it through setCompassChoice and a save/load
  const zone = { rx: 4, ry: 4, r: 2, site: true };
  const m = compassMenuModel({ area: 'overworld', here: { rx: 0, ry: 0 }, quests: [{ title: 'A wonder', at: { rx: 5, ry: 4 }, zone }] });
  const row = m.groups[0].rows[0]; assert.deepEqual(row.choose.zone, zone);
  setCompassChoice(s, { pin: { rx: row.choose.rx, ry: row.choose.ry, name: row.choose.name, zone: row.choose.zone } });
  const back = migrateSave(deserializeSave(serializeSave(s)));
  assert.deepEqual(back.guidance.pin, { rx: 5, ry: 4, name: 'A wonder', zone });
  assert.deepEqual(compassGuidance(back, { pin: back.guidance.pin }).zone, zone);
  assert.match(MAIN, /for\(const r of rumours\)row\(r\.title,r\.detail,r\.at\|\|null,r\.title,null,r\.zone\|\|null\)/, 'the Journal\'s rumour rows pin with the zone');
  assert.match(MAIN, /else if\(c\.kind==="pin"\)chooseGuidance\(\{pin:\{rx:c\.rx,ry:c\.ry,name:c\.name,\.\.\.\(c\.zone\?\{zone:c\.zone\}:\{\}\)\}\}\)/);
  assert.ok(Array.isArray(rumourLeads(s)));
});

// ---------------------------------------------------------------- nearby places
test('nearby places: known filled, sensed hollow (reach grows with the Aperture), at most four, nearest first, never loot or monsters', () => {
  const s = journey('NEARBY');
  s.atlas = { '0,0': { sites: [] }, '1,0': { sites: [{ kind: 'checkpoint', name: 'Wayglass', x: 4, y: 5 }, { kind: 'supplyCache', name: 'Supply Cache', x: 9, y: 9 }, { kind: 'bossCue', x: 3, y: 3 }] }, '0,1': { sites: [{ kind: 'dungeon', name: 'The Kiln', x: 20, y: 12 }] } };
  s.explored = { '0,0': 1, '1,0': 1, '0,1': 1 };
  const out = nearbyPlaces(s, 0, 0, 16, 16);
  assert.ok(out.length <= COMPASS_RIBBON.marksMax && out.length >= 2);
  for (let i = 1; i < out.length; i++) assert.ok(out[i].d >= out[i - 1].d, 'nearest first');
  assert.ok(!out.some((m) => /Supply|boss/i.test(m.name) || /supplyCache|bossCue/.test(m.key)), 'no loot, no monsters');
  assert.ok(!out.some((m) => m.key === 'refuge:0,0'), 'the place the Wayfarer stands in needs no mark'); assert.ok(out.find((m) => m.name === 'The Kiln')?.known); assert.ok(out.every((m) => m.d >= COMPASS_RIBBON.minDist));
  assert.ok(nearbyPlaces(s, 1, 0, 16, 16).find((m) => m.key === 'refuge:0,0')?.known, 'from the next section the Refuge is a filled mark');
  assert.ok(!('supplyCache' in NEARBY_KINDS) && !('bossCue' in NEARBY_KINDS) && !('storyEcho' in NEARBY_KINDS));
  // sensed: only on ground not yet seen, within the Aperture's reach
  const far = journey('NEARBY'); far.atlas = {}; far.explored = {};
  const reach = (ap) => { far.perception.aperture = ap; return senseRadius(far); };
  assert.equal(reach(0), COMPASS_RIBBON.sense.base); assert.ok(reach(APERTURE_BANDS[APERTURE_BANDS.length - 1].threshold) > reach(0), 'the Aperture widens it');
  assert.ok(reach(1e9) <= COMPASS_RIBBON.sense.max);
  let found = null;
  for (let rx = 30; rx < 200 && !found; rx += 3) { far.perception.aperture = 0; const list = nearbyPlaces(far, rx, 0, 16, 16); if (list.length) found = { rx, list }; }
  assert.ok(found, 'some sensed place within reach somewhere');
  for (const m of found.list) {
    assert.equal(m.known, false, 'unseen ground is only sensed'); assert.ok(Math.abs(m.rx - found.rx) + Math.abs(m.ry) <= COMPASS_RIBBON.sense.base + 0 || /^(skyway|tree|starfield):/.test(m.key));
    if (m.key.startsWith('hamlet:')) assert.ok(hamletSection(far.seed, m.rx, m.ry)); else if (m.key.startsWith('crossing:')) assert.ok(crossingRolled(far.seed, m.rx, m.ry, 1));
  }
  far.perception.aperture = 1e9; assert.ok(nearbyPlaces(far, found.rx, 0).length <= 4, 'the cap holds at the widest reach');
});

test('a hollow mark that fills announces DISCOVERED · <place>; a known one does not again', () => {
  const s = journey('DISC'); s.atlas = {};
  const sensed = [{ key: 'hamlet:3,1', known: false, name: 'a hamlet' }];
  s.atlas['3,1'] = { hamletVersion: 1, sites: [] };
  assert.equal(compassDiscovery(s, new Set(sensed.map((m) => m.key)), [{ key: 'hamlet:3,1', known: true, name: 'Ashby' }]), 'Ashby');
  assert.equal(compassDiscovery(s, new Set(), [{ key: 'hamlet:3,1', known: true, name: 'Ashby' }]), null, 'known before: nothing');
  assert.equal(compassDiscovery(s, new Set(['skyway:3,1']), []), 'A skyway', 'a sensed wonder whose section is now on the Atlas');
  assert.equal(COMPASS_RIBBON.discovered, 'DISCOVERED');
  assert.match(MAIN, /const found=compassDiscovery\(save,compassSensed,compassMarks\);if\(found&&now>=compassCollapseUntil\)showEventBanner\(COMPASS_RIBBON\.discovered,found,"discovery"\)/);
  assert.match(lift('refreshCompassMarks'), /if\(compassMarksMap===game\.map&&now<compassMarksCheck\)return;/, 'rebuilt on a new section (a new map), checked for a new Aperture band once a second, never per frame');
});

// ---------------------------------------------------------------- arrival, cycle, hold
test('arrival: WAYPOINT REACHED once, the diamond collapses into the centre, a haptic tick; a journey resumed at its target stays quiet', () => {
  const s = compassArrivalState();
  assert.equal(compassArrivalStep(s, true, 'a', 1, 1), true); assert.equal(s.count, 1); assert.equal(compassArrivalStep(s, true, 'a', 1, 1), false); assert.equal(s.count, 1);
  compassArrivalStep(s, false); compassArrivalReset(s); assert.equal(compassArrivalStep(s, true, 'a', 1, 1), true); assert.equal(s.count, 2);
  const resumed = compassArrivalState(true);
  assert.equal(compassArrivalStep(resumed, true, 'a', 1, 1), false, 'reloaded standing on it: no second banner'); assert.equal(resumed.on, true);
  compassArrivalStep(resumed, false); assert.equal(compassArrivalStep(resumed, true, 'a', 1, 1), true, 'leave and come back: the banner');
  const quietThenAway = compassArrivalState(true); compassArrivalStep(quietThenAway, false); assert.equal(compassArrivalStep(quietThenAway, true, 'b', 0, 0), true, 'resumed away from it: the first arrival is announced');
  assert.match(MAIN, /const compassArrival = compassArrivalState\(true\);/);
  const views = lift('renderCompassViews');
  assert.match(views, /if\(compassArrival\.count!==compassArrivals\)\{compassArrivals=compassArrival\.count;compassCollapseUntil=now\+COMPASS_RIBBON\.collapseMs;navigator\.vibrate\?\.\(COMPASS_RIBBON\.haptic\)\}/);
  assert.match(views, /const q=collapsing\|\|r\.dormant\|\|r\.warm\?500:Math\.round\(r\.x\*1000\)/, 'collapsing: the diamond goes to the centre');
  assert.match(CSS, /\.cr-target\.collapse \.cr-diamond \{ transform: rotate\(45deg\) scale\(0\)/);
  assert.match(lift('updateNavigationCompass'), /showEventBanner\(COMPASS_ARRIVAL\.banner,g\.name,"discovery"\)/, 'WAYPOINT REACHED stays');
});

test('the tap still cycles, the hold still opens the quick menu, and accepting a quest still points the compass', () => {
  assert.match(MAIN, /const compassHold=wireHold\(navCompass,navCompassSlot,\{can:\(\)=>!game\.paused,fire:\(\)=>openCompassMenu\(\)\}\)/);
  assert.match(MAIN, /compassPick=objectiveKey\(next\);compassPin=null;compassFollow=null;rememberGuidance\(\);/);
  assert.match(MAIN, /if\(r\.ok\)chooseGuidance\(\{follow:\{kind:'hunt',id:q\.id\}\}\)/);
  // the Ribbon and the edge arrow take no input: the dial stays the one thing to tap and hold
  assert.match(CSS, /\.compass-ribbon \{[^}]*pointer-events: none;/); assert.match(CSS, /\.compass-edge \{[^}]*pointer-events: none;/);
});

// ---------------------------------------------------------------- one matcher
test('one matcher says which row the compass follows: the Journal\'s Leads, Paths and the quick menu agree', () => {
  const g = { pick: null, pin: { rx: 2, ry: 3, name: 'Bells' } };
  assert.equal(compassChoiceIs(g, { pin: { rx: 2, ry: 3, name: 'Bells' } }), true);
  assert.equal(compassChoiceIs(g, { pin: { rx: 2, ry: 3, name: 'Another lead' } }), false, 'two leads in one section are two choices');
  assert.equal(compassChoiceIs({ pin: { rx: 1, ry: 1, name: 'The Far Array' } }, { pin: { rx: 7, ry: 7, name: 'The Array Mouth' } }), true, 'the Mouth is one target by either name, wherever it is now');
  assert.equal(compassChoiceIs({ pin: null, follow: { kind: 'quest', id: 'leads' } }, { follow: { kind: 'quest', id: 'leads' } }), true);
  assert.equal(compassChoiceIs({ pin: { rx: 0, ry: 0, name: 'p' }, follow: { kind: 'quest', id: 'leads' } }, { follow: { kind: 'quest', id: 'leads' } }), false, 'a pin outranks');
  assert.equal(compassChoiceIs({ pick: '3,2', pin: null }, { pick: '3,2' }), true);
  // the quick menu marks the same row
  const quests = [{ title: 'Bells', at: { rx: 2, ry: 3 } }, { title: 'Another lead', at: { rx: 2, ry: 3 } }];
  const m = compassMenuModel({ area: 'overworld', here: { rx: 0, ry: 0 }, quests, pin: g.pin });
  for (const r of m.groups[0].rows) assert.equal(r.current, compassChoiceIs(g, { pin: { rx: r.choose.rx, ry: r.choose.ry, name: r.choose.name } }), r.label);
  // the Journal and the Mouth button use it; Paths uses it
  assert.match(MAIN, /if\(follow\)\{const followed=compassChoiceIs\(save\.guidance,\{follow\}\);/);
  assert.match(MAIN, /const pinned=compassChoiceIs\(save\.guidance,\{pin:\{rx:at\.rx,ry:at\.ry,name\}\}\)/);
  assert.match(MAIN, /const pinned=compassChoiceIs\(save\.guidance,\{pin:\{rx:c\.rx,ry:c\.ry,name:"The Array Mouth"\}\}\)/);
  assert.match(readFileSync(new URL('../src/paths.ts', import.meta.url), 'utf8'), /const following = \(ctx, c\) => compassChoiceIs\(ctx\.compass, c\);/);
  const s = journey(); s.relayNetwork = { coordinate: { rx: 4, ry: 4 } }; setCompassChoice(s, { pin: { rx: 1, ry: 1, name: 'The Array Mouth' } });
  assert.equal(compassChoiceIs(s.guidance, { pin: { rx: 4, ry: 4, name: 'The Far Array' } }), true); assert.equal(typeof pathsModel, 'function'); assert.deepEqual(MOUTH_PINS, ['The Array Mouth', 'The Far Array']);
});

// ---------------------------------------------------------------- reliability: stale, lost, resumed
test('nothing is stale: a moved Mouth, a thread piece read and a far signal keep the needle on the live target', () => {
  const key = lift('navigationTargets');
  assert.match(key, /save\.relayNetwork\?\.coordinate\?\.rx,save\.relayNetwork\?\.coordinate\?\.ry/, 'the Mouth moving rebuilds the target');
  assert.match(key, /f\.id\.startsWith\("thread:"\)\?\(save\.lore\?\.threads\?\.\[f\.id\.slice\(7\)\]\|\|\[\]\)\.length/, 'a thread piece read rebuilds it');
  const s = journey(); s.relayNetwork = { coordinate: { rx: 2, ry: 2 } };
  const pin = { rx: 2, ry: 2, name: 'The Array Mouth' };
  assert.deepEqual([compassGuidance(s, { pin }).rx, compassGuidance(s, { pin }).ry], [2, 2]);
  s.relayNetwork.coordinate = { rx: -8, ry: 5 }; assert.deepEqual([compassGuidance(s, { pin }).rx, compassGuidance(s, { pin }).ry], [-8, 5], 'the Listener moved: so does the needle');
  // a chosen signal stays chosen when the Wayfarer walks beyond the waymarks' reach, until its section is explored
  const list = lift('objectiveList');
  assert.match(list, /!save\.explored\?\.\[compassPick\]\)\{const\[prx,pry\]=compassPick\.split\(","\)\.map\(Number\),sig=sectionSignals\(save\.seed,prx,pry,save\.worldGeneration\|\|1\)/);
  assert.match(list, /all:\[\.\.\.hunts,\.\.\.all,\.\.\.kept\]/, 'kept for the lookup, never added to the tap cycle');
  assert.equal(typeof trailTarget, 'function');
});

test('exact resume: the overworld choice, a hint zone and the dungeon door point survive a save, a load and a migration', () => {
  const s = journey();
  setCompassChoice(s, { pin: { rx: 3, ry: -1, name: 'Bells', zone: { rx: 5, ry: -2, r: 4, site: false } } });
  setCompassDoor(s, 'dungeon:x:g1:0:1::stair-up');
  const back = migrateSave(deserializeSave(serializeSave(s)));
  assert.deepEqual(back.guidance, { pick: null, pin: { rx: 3, ry: -1, name: 'Bells', zone: { rx: 5, ry: -2, r: 4, site: false } }, door: 'dungeon:x:g1:0:1::stair-up' });
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(back))).guidance, back.guidance, 'idempotent');
  setCompassChoice(back, { pick: '1,1' }); assert.equal(back.guidance.door, 'dungeon:x:g1:0:1::stair-up', 'an overworld choice keeps the door point');
  setCompassDoor(back, null); assert.equal(back.guidance.door, undefined);
  const only = journey(); setCompassDoor(only, 'a::1'); assert.deepEqual(normalizeGuidance(only.guidance), { pick: null, pin: null, door: 'a::1' }, 'a door point alone is a choice');
  setCompassDoor(only, null); assert.equal(only.guidance, undefined, 'and letting it go leaves no record');
  assert.equal(normalizeGuidance({ door: 'no-area-scope' }), null, 'a door id must be area-scoped');
  assert.deepEqual(normalizeGuidance({ pin: { rx: 1, ry: 1, name: 'x', zone: { rx: 'a' } } }), { pick: null, pin: { rx: 1, ry: 1, name: 'x' } }, 'a bad zone is dropped');
  assert.match(MAIN, /let dungeonCompassPick = save\.guidance\?\.door \?\? null;/, 'the door point comes back on load');
  assert.match(lift('renderCompassViews'), /setCompassDoor\(save,dungeonCompassPick\)/, 'and is kept as it changes');
  assert.equal(freshSave().guidance, undefined, 'a fresh journey has no choice');
});

// ---------------------------------------------------------------- cost
test('cost: the readout, the Ribbon\'s places and the edge arrow allocate nothing a frame', () => {
  // measured in a fresh process: the other tests here feed the helpers many shapes, which a real frame loop never does
  const AV = new URL('../src/atlas-view.ts', import.meta.url).href;
  const code = `import v8 from 'node:v8'; import vm from 'node:vm'; import * as A from ${JSON.stringify(AV)};
    v8.setFlagsFromString('--expose-gc'); const gc = vm.runInNewContext('gc');
    const r = A.compassReadoutState(), e = { on: false, x: 0, y: 0, deg: 0, spread: 0 }, arc = { x0: 0, x1: 0 }, places = new Float64Array(A.RIBBON_SLOTS);
    const t = { area: 'overworld', rx: 3, ry: -2, x: 4, y: 7, kind: 'guidance', name: 'T' }, hint = { area: 'overworld', rx: 3, ry: -2, kind: 'guidance', name: 'H', zone: { rx: 6, ry: -3, r: 2, site: false } };
    const h = { area: 'overworld', rx: 0, ry: 0, x: 10.5, y: 12.5, yaw: NaN, elev: NaN, targetElev: NaN }, marks = [{ rx: 1, ry: 0, x: 4, y: 5, known: true }, { rx: -1, ry: 1, x: 15.5, y: 15.5, known: false }];
    const T = { now: t }, frame = (i) => { h.x = 10 + (i & 7) * .25; h.yaw = (i & 3) - 1.5; A.compassReadout(r, T.now, h); A.ribbonArc(r, arc); A.compassEdge(e, r, 390, 844, 32); A.ribbonLayout(places, h, marks); A.compassDistanceKey(r); };
    const run = (n) => { for (let i = 0; i < n; i++) frame(i); }, out = [];
    for (const target of [t, hint]) { T.now = target; for (let k = 0; k < 10; k++) run(5000); }
    for (const target of [t, hint]) { T.now = target; run(2000); gc(); const b = v8.getHeapStatistics().used_heap_size; run(20000); out.push(v8.getHeapStatistics().used_heap_size - b); }
    out.push(A.compassReadout(r, t, h) === r ? 1 : 0); console.log(JSON.stringify(out));`;
  const [plain, hinted, same] = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' }).trim().split('\n').pop());
  assert.equal(same, 1, 'the same object back');
  for (const [name, grew] of [['a site', plain], ['a hinted lead', hinted]]) assert.ok(grew < 128 * 1024, `${name}: 20 000 frames grew the heap by ${grew} bytes (one object or one boxed number a frame would be 320 000 or more)`);
  // main.ts: the distance words are built only when they change; positions are written only when they move
  const views = lift('renderCompassViews');
  assert.match(views, /if\(!Object\.is\(r\.distKey,compassDistKey\)\)\{compassDistKey=r\.distKey;const t=compassDistanceText\(r\)/);
  assert.match(MAIN, /function compassPct\(el,q\)\{if\(compassNums\.get\(el\)===q\)return;/);
  assert.match(views, /ribbonLayout\(P,compassHere,compassMarks\)/); assert.match(lift('readCompass'), /h\.yaw=[^;]*;[^\n]*\n  return compassReadout\(compassNow,t,h\);/);
  const p = ribbonLayout(new Float64Array(RIBBON_SLOTS), { area: 'overworld', rx: 0, ry: 0, x: 16, y: 16, yaw: -Math.PI / 2 }, [{ rx: 0, ry: -1, x: 15.5, y: 15.5 }]);
  assert.equal(p[0], .5, 'N dead ahead'); assert.equal(p[8], .5, 'a place due north, dead ahead'); assert.ok(Number.isNaN(p[4]), 'S behind');
  assert.match(views, /if\(x!==compassEdgeOut\.lx\|\|y!==compassEdgeOut\.ly\)/);
  assert.doesNotMatch(views, /nearbyPlaces\(/, 'the places are never rebuilt in the frame itself');
});
