// Progression Phase 4, leads, hints and how-to (docs/progression-design.md rev 3, sections 2.2, 2.5 G2, 2.6, 4.1-4.3, 4A and
// 7 row 4). save.hints (the seen set) and save.leads are additive at schema 14; hints keep their budget and stay out of fights;
// each shows once; Options → Hints turns them off; the lead floor holds over a walk; the Refuge's first-journey lines and Maud's
// plain errand (Exploration) point the way and her errand points the compass at the nearest crossing; the first free
// constellation point is a banner and a dot; how-to pages are built from the progression table; Classic keeps today's lines.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { ensureHints, ensureLeads, EXPLORATION } from '../src/journey-start.ts';
import { startJourney, howToPage, hintFor, hintSubjectsHeld, HINT_SUBJECTS, GATE_HINTS, PROGRESSION_ROWS, compendium } from '../src/progression.ts';
import { HINT_BUDGET, HINT_MODES, hintMode, hintQueue, hintScan, offerHint, hintStep, hintSeen, packDot, clearPackDot } from '../src/hints.ts';
import { LEADS, FIRST_JOURNEY, firstJourneyLine, compassCaption, nearestCrossing, rumourTurn, leadCount, liveRumours, rumourLeads, noteFollow, leadDot, questLeadCount } from '../src/leads.ts';
import { compassGuidance } from '../src/atlas-view.ts';
import { crossingRolled } from '../src/world.ts';
import { CAIRN_KEEPER, CAIRN_LINES } from '../src/surveyor.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/persistence.ts';
import { Game } from '../src/game.ts';

const v1Save = (seed = 'PHASE4') => { const s = freshSave(); s.seed = seed; return startJourney(s, {}); };
const classicSave = (seed = 'PHASE4-C') => { const s = freshSave(); s.seed = seed; return startJourney(s, { mode: 0 }); };
const hint = (id, kind = 'ability') => ({ id, kind, text: `hint ${id}` });
const S = 1000;

test('save.hints and save.leads: additive at schema 14, normalised by freshSave and migrateSave, unknown fields kept', () => {
  const f = freshSave();
  assert.deepEqual(f.hints, { v: 1, base: 0, seen: [] }); assert.deepEqual(f.leads, { v: 1, told: {}, rumours: [], followedAt: 0 });
  const old = JSON.parse(JSON.stringify(f)); delete old.hints; delete old.leads;
  const m = migrateSave(old); assert.deepEqual(m.hints, f.hints, 'a journey from before gets an empty seen set'); assert.deepEqual(m.leads, f.leads);
  const odd = JSON.parse(JSON.stringify(f));
  odd.hints = { seen: ['row:spell:aegis', 'row:spell:aegis', 7, '', 'gate:awakened:awakening'], base: 1, mine: 'kept' };
  odd.leads = { told: { 'warden-oren': true, x: 'yes' }, rumours: [{ id: 'arcana:bells', kind: 'bells', text: 't', rx: 1.5, ry: 2 }, { id: 'arcana:bells', kind: 'bells', text: 'dup' }, null, { kind: 'x' }], followedAt: -4, extra: 1 };
  const n = migrateSave(odd);
  assert.deepEqual(n.hints, { seen: ['row:spell:aegis', 'gate:awakened:awakening'], base: 1, mine: 'kept', v: 1 });
  assert.deepEqual(n.leads.told, { 'warden-oren': true }); assert.equal(n.leads.extra, 1); assert.equal(n.leads.followedAt, 0);
  assert.deepEqual(n.leads.rumours, [{ id: 'arcana:bells', kind: 'bells', text: 't' }], 'one record per id; a broken place is dropped, not the rumour');
  // the persisted seen set survives a save round trip
  const s = v1Save(); hintScan(s); assert.ok(s.hints.seen.length > 0 && s.hints.base === 1);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(back.hints, s.hints);
  assert.equal(ensureHints(back), back.hints); assert.equal(ensureLeads(back), back.leads);
});

test('the hint budget: one at a time, 45 s apart, at most 4 in 10 minutes, a queue of 3, stale ones dropped', () => {
  assert.deepEqual([HINT_BUDGET.onScreen, HINT_BUDGET.queueMax, HINT_BUDGET.gapMs, HINT_BUDGET.windowMs, HINT_BUDGET.perWindow, HINT_BUDGET.calmMs, HINT_BUDGET.expireMs, HINT_BUDGET.checkEvery], [1, 3, 45000, 600000, 4, 5000, 180000, 500]);
  const s = v1Save(), q = hintQueue();
  for (const id of ['a', 'b', 'c', 'd']) assert.ok(offerHint(s, q, hint(id), 0));
  assert.deepEqual(q.queue.map((h) => h.id), ['b', 'c', 'd'], 'past the cap the oldest is dropped');
  assert.ok(hintSeen(s, 'a'), 'a dropped hint is passed over for good');
  assert.equal(offerHint(s, q, hint('b'), 0), false, 'already queued');
  const first = hintStep(s, q, 10 * S); assert.equal(first.id, 'b'); assert.ok(hintSeen(s, 'b'));
  assert.equal(hintStep(s, q, 12 * S), null, 'one card at once');
  assert.equal(hintStep(s, q, 40 * S), null, 'not before 45 s');
  assert.equal(hintStep(s, q, 56 * S).id, 'c');
  assert.equal(hintStep(s, q, 102 * S).id, 'd');
  // at most four in any ten minutes
  const t = v1Save(), r = hintQueue(); let shown = 0;
  for (let i = 0; i < 12; i++) offerHint(t, r, hint(`h${i}`), i * 45 * S);
  for (let now = 0; now < 600 * S; now += 500) { offerHint(t, r, hint(`x${now}`), now); if (hintStep(t, r, now)) shown++; }
  assert.equal(shown, 4, 'four in the first ten minutes');
  // a queued hint older than three minutes is dropped, not shown late
  const u = v1Save(), w = hintQueue(); offerHint(u, w, hint('late'), 0);
  assert.equal(hintStep(u, w, 1000, { busy: true }), null);
  assert.equal(hintStep(u, w, 181 * S), null); assert.ok(hintSeen(u, 'late') && !w.queue.length);
});

test('hints are suppressed in fights, scenes and menus, wait for 5 s of calm, and only show standing still or just after arriving', () => {
  const s = v1Save(), q = hintQueue(); offerHint(s, q, hint('calm'), 0);
  assert.equal(hintStep(s, q, 50 * S, { busy: true }), null, 'none while busy (a foe engaged, a scene, a menu, Look mode)');
  assert.equal(hintStep(s, q, 53 * S), null, 'waits for 5 s of calm');
  assert.equal(hintStep(s, q, 56 * S, { moving: true, arrivedAt: 0 }), null, 'not while walking about');
  assert.equal(hintStep(s, q, 56.5 * S, { moving: true, arrivedAt: 55 * S }).id, 'calm', 'just after an area loads it may');
  // main.ts reads the fight, the scenes and the menus
  const main = readFileSync('src/main.ts', 'utf8'), busy = main.match(/function hintBusy\(\)\{[\s\S]*?\n\}/)?.[0] || '';
  for (const k of ['game.paused', 'glimpseRun', 'compassMenuOpen', 'closeViewLookActive()', 'game.rite', 'game.fall', 'journal', 'e.aggro', 'e.pentArenaAwake']) assert.ok(busy.includes(k), k);
  assert.match(main, /watchHints\(performance\.now\(\)\); \/\/ Progression Phase 4/);
});

test('each hint shows once per journey; the first scan of a journey notes what it holds without a word', () => {
  const s = v1Save(), q = hintQueue();
  assert.deepEqual(hintScan(s), [], 'the start kit is noted, not announced'); assert.ok(hintSeen(s, 'row:spell:aegis'));
  assert.deepEqual(hintScan(s), [], 'nothing new');
  s.level = 3; const [h] = hintScan(s);
  assert.equal(h.id, 'row:spell:ember-ring'); assert.equal(h.text, 'Level 3: Ember Ring is yours. Set it in a slot in Pack → Arcanum.', 'a gated spell opening at its level');
  assert.equal(h.howTo, 'spell:ember-ring'); offerHint(s, q, h, 0); assert.equal(hintStep(s, q, 6 * S).id, h.id);
  assert.deepEqual(hintScan(s), [], 'shown: never again'); assert.equal(offerHint(s, q, h, 100 * S), false);
  // hint text is the progression table's, at most a short line
  for (const r of PROGRESSION_ROWS) if (r.hint) assert.ok(r.hint.length <= 140, `${r.id}: ${r.hint.length}`);
  for (const H of [...Object.values(HINT_SUBJECTS).map((x) => x.text), ...Object.values(GATE_HINTS)]) assert.ok(H.length <= 90, H);
});

test('awakening and the hatchling open at Infinite II with a hint on Exploration; Classic opens them as today, unannounced', () => {
  const s = v1Save(); hintScan(s); s.perception.aperture = APERTURE_BANDS[12].threshold;
  const ids = hintScan(s).map((h) => h.id);
  assert.ok(ids.includes('gate:awakened:awakening') && ids.includes('gate:companion:hatchling'), ids.join());
  assert.equal(hintFor(s, 'gate:awakened:awakening').text, GATE_HINTS['awakened:awakening']);
  const c = classicSave(); hintScan(c); c.perception.aperture = APERTURE_BANDS[12].threshold;
  assert.ok(!hintScan(c).some((h) => h.id.startsWith('gate:')), 'no gate hints in Classic');
  assert.ok(!hintSubjectsHeld(c).some((id) => id.startsWith('gate:')));
  // Classic's spells carry the row's own hint, not a level line
  const d = classicSave('P4-CL'); d.level = 1; hintScan(d); assert.doesNotMatch(hintFor(d, 'row:spell:ember-ring').text, /^Level/);
});

test('the first free constellation point: a one-time banner, then a dot on the Pack button until the Arcanum opens', () => {
  const s = v1Save(), q = hintQueue(); hintScan(s);
  s.perception.aperture = 6; // one point per 6 Aperture
  const h = hintScan(s).find((x) => x.id === 'point:constellation');
  assert.ok(h, 'offered once a point is earned'); assert.equal(h.kind, 'banner'); assert.equal(h.title, 'A CONSTELLATION POINT');
  assert.equal(packDot(s), false, 'no dot before the banner');
  offerHint(s, q, h, 0); const shown = hintStep(s, q, 6 * S); assert.equal(shown.kind, 'banner');
  assert.equal(packDot(s), true, 'the dot, once the banner has shown'); assert.equal(packDot(s, 'off'), false);
  clearPackDot(s); assert.equal(packDot(s), false, 'opening the Arcanum clears it for good');
  assert.ok(!hintScan(s).some((x) => x.id === 'point:constellation'), 'never again');
  // a journey that had points before hints began: no banner, no dot
  const old = v1Save('P4-OLD'); old.perception.aperture = 12; hintScan(old); assert.equal(packDot(old), false);
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /hudSet\(packButton,"class:has-dot",packDot\(save,mode\)\)/); assert.match(main, /if\(packDot\(save,hintMode\(settings\)\)\)clearPackDot\(save\)/);
  assert.match(main, /questQueue\.push\(\{title:h\.title,detail:h\.text,kind:"discovery"\}\)/, 'banners go through the banner queue (never stacked)');
});

test('Options → Hints: on by default, per device; Only new abilities leaves out statuses; off shows none and replays none', () => {
  assert.equal(DEFAULT_SETTINGS.hints, 'on'); assert.equal(normalizeSettings({}).hints, 'on');
  assert.equal(normalizeSettings({ hints: 'off' }).hints, 'off'); assert.equal(normalizeSettings({ hints: 'abilities' }).hints, 'abilities'); assert.equal(normalizeSettings({ hints: 'loud' }).hints, 'on');
  assert.deepEqual(HINT_MODES.map(([k]) => k), ['on', 'abilities', 'off']); assert.equal(hintMode({}), 'on'); assert.equal(hintMode({ hints: 'off' }), 'off');
  const s = v1Save(), q = hintQueue();
  assert.equal(offerHint(s, q, hintFor(s, 'status:encumbered'), 0, 'abilities'), false, 'a status is left out'); assert.ok(hintSeen(s, 'status:encumbered'));
  assert.ok(offerHint(s, q, hint('ab'), 0, 'abilities')); assert.equal(hintStep(s, q, 6 * S, { mode: 'off' }), null, 'off: nothing shows');
  // off: what is gained meanwhile is noted, so turning hints back on never replays it
  const t = v1Save(); hintScan(t); t.level = 6; assert.deepEqual(hintScan(t, 'off'), []); assert.ok(hintSeen(t, 'row:spell:ember-ring')); assert.deepEqual(hintScan(t, 'on'), []);
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /"Accessibility","Hints","Audio"/); assert.match(main, /if\(category==="Hints"\)grid\.append\(settingRow\("Hints",selectSetting\("hints",HINT_MODES\)/);
});

test('the lead floor holds over a simulated walk: a speaker tells a rumour while fewer than 2 leads stand, never more', () => {
  for (const make of [v1Save, classicSave]) {
    const s = make(`P4-WALK-${make === v1Save ? 1 : 0}`); s.atlas = {}; let told = 0;
    for (let i = 0; i < 80; i++) {
      const rx = i % 2 ? i >> 1 : -(i >> 1), ry = (i * 7) % 11 - 5; s.atlas[`${rx},${ry}`] = { seen: true };
      if (i % 4) continue;
      const before = leadCount(s), r = rumourTurn(s, 'warden-oren', rx, ry);
      if (before >= LEADS.floor) { assert.equal(r, null, 'enough leads: the idle line stands'); assert.equal(leadCount(s), before); }
      else { assert.ok(r, `a rumour at ${rx},${ry}`); assert.equal(leadCount(s), before + 1, 'one person, one rumour'); told++; }
      if (told >= LEADS.floor) assert.ok(leadCount(s) >= LEADS.floor - 1, `the floor is never far: step ${i}`);
      // the next person spoken to tops it up again
      if (leadCount(s) < LEADS.floor) { rumourTurn(s, 'keeper-sela', rx, ry); told++; }
      assert.ok(leadCount(s) >= Math.min(LEADS.floor, told), `floor after speaking at step ${i}`);
    }
    assert.ok(told >= 2); const ids = liveRumours(s).map((r) => r.id); assert.equal(new Set(ids).size, ids.length, 'never the same lead twice');
  }
  // a quest in progress counts; rumours resolve when done
  const s = v1Save('P4-Q'); s.arcana = { starter: 'set' }; assert.equal(questLeadCount(s), 1);
  rumourTurn(s, 'keeper-sela'); assert.equal(leadCount(s), 2); assert.equal(rumourTurn(s, 'keeper-sela'), null);
  const r = liveRumours(s)[0]; assert.equal(r.id, 'arcana:lamplighter'); s.arcana.unlocked = { 'passive:lamplight': true };
  assert.equal(liveRumours(s).length, 0, 'the round walked: the rumour is done');
  assert.deepEqual(rumourLeads(v1Save()), []);
});

test('rumours: hinted homes on the turned frame, Exploration-only awakening and hatchling from Infinite II, never in Classic', () => {
  const s = v1Save('P4-R'); s.perception.aperture = APERTURE_BANDS[12].threshold;
  const a = rumourTurn(s, 'vendor-vela'), b = rumourTurn(s, 'vendor-vela');
  assert.deepEqual([a.rumour.id, b.rumour.id], ['hatchling', 'awakening']); assert.ok(a.first && !b.first);
  assert.match(a.text, /Beast Hotel/); assert.match(b.text, /asleep, she says, not dead/);
  const c = classicSave('P4-RC'); c.perception.aperture = APERTURE_BANDS[13].threshold;
  const x = rumourTurn(c, 'vendor-vela'), y = rumourTurn(c, 'vendor-vela');
  assert.deepEqual([x.rumour.id, y.rumour.id], ['arcana:lamplighter', 'arcana:bells'], 'Classic already opens awakening and the hatchling');
  assert.match(x.text, /of the Refuge, 3 to 18 sections out/); assert.ok(Number.isInteger(x.rumour.rx) && Number.isInteger(x.rumour.ry));
  assert.ok(rumourLeads(c).every((r) => r.at && r.title && r.detail), 'each rumour row can point the compass');
});

test('the Journal dot (4.3): no needle and no lead followed for 15 new sections', () => {
  const s = v1Save('P4-DOT'); s.arcana = { starter: 'set' }; s.explored = {};
  for (let i = 0; i < 14; i++) s.explored[`${i},0`] = true; assert.equal(leadDot(s), false);
  s.explored['14,0'] = true; assert.equal(leadDot(s), true); assert.equal(leadDot(s, true), false, 'a needle is set');
  noteFollow(s); assert.equal(leadDot(s), false); assert.equal(s.leads.followedAt, 15);
});

test('first-journey lines (Exploration): Vela, Oren, Sela and Hollis send a new Wayfarer to Maud, once each; Classic keeps its lines', () => {
  assert.deepEqual(Object.keys(FIRST_JOURNEY.lines).sort(), ['keeper-sela', 'refuge-farmer', 'vendor-vela', 'warden-oren']);
  for (const line of Object.values(FIRST_JOURNEY.lines)) assert.match(line, /Maud/);
  const s = v1Save('P4-FIRST'), g = new Game(s, 0); g.rx = 0; g.ry = 0; g.loadArea('overworld', false);
  const talk = (id) => { const o = g.map.objects.find((q) => q.id === id); assert.ok(o, id); Object.assign(g.player, { x: o.x, y: o.y + .6 }); g.interact('speak', o.id); return g.message; };
  assert.equal(talk('warden-oren'), `Oren Vale: “${FIRST_JOURNEY.lines['warden-oren']}”`);
  assert.equal(talk('keeper-sela'), `Sela Rook: “${FIRST_JOURNEY.lines['keeper-sela']}”`);
  assert.match(talk('vendor-vela'), /Go and see Maud by the cairn/);
  assert.equal(s.narrative.facts['crossing.objective'], true, "Vela's story still moves on");
  assert.match(talk('refuge-farmer'), /Maud by the cairn won't feed you/);
  assert.doesNotMatch(talk('warden-oren'), /talk to Maud/, 'once each');
  // Classic: no first-journey line; with leads enough, today's words (below the floor a rumour may take an idle line's place)
  const c = classicSave('P4-FIRST-C'), h = new Game(c, 0); h.rx = 0; h.ry = 0; h.loadArea('overworld', false);
  const o = h.map.objects.find((q) => q.id === 'warden-oren'); Object.assign(h.player, { x: o.x, y: o.y + .6 }); h.interact('speak', o.id);
  assert.doesNotMatch(h.message, /Maud/); assert.match(h.message, /lamplighter's round/, 'the lead floor: an idle line became a rumour');
  rumourTurn(c, 'keeper-sela'); assert.ok(leadCount(c) >= LEADS.floor); h.interact('speak', o.id);
  assert.equal(h.message, 'Oren: “One loss leaves a scar. Lose all three of us and nothing keeps the creatures out.”');
  assert.equal(firstJourneyLine(c, 'warden-oren'), null);
  // once Maud's errand is taken they say their usual words
  const t = v1Save('P4-TAKEN'); t.arcana = { starter: 'set' }; assert.equal(firstJourneyLine(t, 'warden-oren'), null);
});

test("Maud's errand (Exploration): stated plainly; taking it points the compass, and the errand points at the nearest crossing", () => {
  const s = v1Save('P4-MAUD'), g = new Game(s, 0); g.rx = 0; g.ry = 0; g.loadArea('overworld', false);
  const keeper = g.map.objects.find((o) => o.id === CAIRN_KEEPER.id); Object.assign(g.player, { x: keeper.x, y: keeper.y + .6 });
  const r = g.interact('speak', keeper.id); assert.ok(r.started);
  assert.equal(g.message, `${CAIRN_KEEPER.name}: ${CAIRN_LINES.plain.first}`); assert.match(g.message, /Go into the first crossing you find/); assert.doesNotMatch(g.message, /Abel Corwin/, 'no riddle first');
  assert.deepEqual(s.guidance.follow, { kind: 'quest', id: 'errand' }, 'taking it points the compass');
  assert.match(g.interact('speak', keeper.id).message, /Your compass points to the nearest one/);
  // in the Refuge: its own crossing's gate
  const gate = g.map.objects.find((o) => o.id === 'dungeon-gate');
  const here = compassGuidance(s, { follow: s.guidance.follow, here: { rx: 0, ry: 0, objects: g.map.objects } });
  assert.deepEqual([here.rx, here.ry, here.x, here.y, here.name], [0, 0, gate.x, gate.y, 'The nearest crossing']);
  // out in the land: the nearest section a crossing's roll gives (or the Refuge)
  for (const [rx, ry] of [[3, 4], [-6, 2], [9, -9]]) {
    const t = compassGuidance(s, { follow: s.guidance.follow, here: { rx, ry, objects: [] } }), d = Math.abs(t.rx - rx) + Math.abs(t.ry - ry);
    assert.ok((t.rx === 0 && t.ry === 0) || crossingRolled(s.seed, t.rx, t.ry, 1), `${t.rx},${t.ry}`);
    for (let x = rx - d + 1; x < rx + d; x++) for (let y = ry - d + 1; y < ry + d; y++) if (Math.abs(x - rx) + Math.abs(y - ry) < d) assert.ok(!crossingRolled(s.seed, x, y, 1) && !(x === 0 && y === 0), `nothing nearer than ${d}`);
  }
  assert.deepEqual(nearestCrossing(s, 3, 4), nearestCrossing(s, 3, 4), 'deterministic');
  // the link found: the errand is done, the compass has nothing to follow
  s.lore.surveyor = { links: [0], where: {} }; assert.equal(compassGuidance(s, { follow: s.guidance.follow, here: { rx: 3, ry: 4, objects: [] } }), null);
  // Classic keeps today's riddle and the errand's waymarks
  const c = classicSave('P4-MAUD-C'), h = new Game(c, 0); h.rx = 0; h.ry = 0; h.loadArea('overworld', false);
  const k = h.map.objects.find((o) => o.id === CAIRN_KEEPER.id); Object.assign(h.player, { x: k.x, y: k.y + .6 }); h.interact('speak', k.id);
  assert.equal(h.message, `${CAIRN_KEEPER.name}: ${CAIRN_LINES.first.join(' ')}`);
  assert.equal(compassGuidance(c, { follow: c.guidance.follow, here: { rx: 3, ry: 4, objects: [] } }), null, 'no waymark here, no needle: as today');
});

test('the idle compass caption: first session only, until a quest is taken', () => {
  const s = v1Save('P4-CAP'); s.playSeconds = 0;
  assert.equal(compassCaption(s, { idle: true }), FIRST_JOURNEY.caption); assert.equal(FIRST_JOURNEY.caption, 'Talk to the people of the Refuge to find work.');
  assert.equal(compassCaption(s, { idle: false }), null); assert.equal(compassCaption(s, { idle: true, area: 'dungeon' }), null);
  s.playSeconds = FIRST_JOURNEY.captionSeconds; assert.equal(compassCaption(s, { idle: true }), null);
  s.playSeconds = 10; s.arcana = { starter: 'set' }; assert.equal(compassCaption(s, { idle: true }), null);
  assert.match(readFileSync('src/main.ts', 'utf8'), /updateCompassCaption\(\); \/\/ the idle compass's first-session caption/);
});

test('how-to pages: built from the progression table, only for what the player knows', () => {
  const s = v1Save('P4-HOW'), p = howToPage(s, 'spell:aegis');
  assert.equal(p.name, 'Aegis'); assert.equal(p.group, 'Spells'); assert.equal(p.state, 'owned');
  assert.deepEqual(p.sections.map(([k]) => k), ['Controls', 'What it does', 'Where it came from']);
  assert.match(p.sections[2][1], /from the start/);
  assert.equal(howToPage(s, 'spell:grave-sun'), null, 'not yet known: no page, no spoiler');
  assert.equal(howToPage(s, 'nope'), null);
  s.codex.creatures = { riftLynx: true }; const rum = compendium(s).groups.find((g) => g.id === 'echoes').entries.find((e) => e.state === 'rumoured');
  if (rum) assert.equal(howToPage(s, rum.id), null, 'a rumour names it, no more');
  s.perception.aperture = 6; const open = howToPage(s, 'skill:aerial-step'); assert.equal(open.state, 'open'); assert.match(open.sections.at(-1)[1], /^Not yet yours/);
  // every owned entry of the compendium has a page
  for (const g of compendium(s).groups) for (const e of g.entries) if (e.state === 'owned') assert.ok(howToPage(s, e.id)?.sections.length, e.id);
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /if\(mode\.startsWith\("howto:"\)\)\{renderHowTo\(out,mode\.slice\(6\)\)/); assert.match(main, /function renderHowTo\(out,id\)/);
  assert.match(main, /uiButton\("How-to page",\(\)=>openJournal\(`howto:\$\{e\.id\}`\)\)/);
  assert.match(main, /hintCard\.how\.onclick=\(\)=>\{hideHint\(\);openJournal\(`howto:\$\{h\.howTo\}`\)\}/, "the hint card's How to opens the page");
});

test('wired: Leads in the Journal, rumours in the compass menu, modules built and precached', () => {
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /\["quests","Leads"\]/); assert.match(main, /h\.textContent="Leads"/);
  assert.match(main, /quests:\[\.\.\.activeQuests\(\),\.\.\.rumourLeads\(save\)/);
  for (const f of ['sw.js', 'proving-ground/sw.js']) for (const m of ['leads', 'hints']) assert.match(readFileSync(f, 'utf8'), new RegExp(`src/${m}\\.js\\?v=\\d+`), `${f} ${m}`);
  assert.match(readFileSync('scripts/build.mjs', 'utf8'), /'leads','hints'/);
  const game = readFileSync('src/game.ts', 'utf8');
  assert.match(game, /rumourInstead\(o\) \{/); assert.match(game, /noteWonderLead\(this\.save, this\.rx, this\.ry, o\.id \|\| o\.name\)/);
  assert.equal(EXPLORATION.gates['companion:hatchling'].tier, 12);
});
