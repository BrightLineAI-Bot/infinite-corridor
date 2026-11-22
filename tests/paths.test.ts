// Paths, the progression view (part 1): the pure model (src/paths.ts), the three corrected Arcanum messages, and the Arcanum's
// Paths tab wiring. The sim fixtures are the 20-hour engine playthrough's saves at 1, 10 and 20 hours (Exploration), trimmed to
// what the progression reads (tests/fixtures/paths-sim-h*.json; a full save gives the same model).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave, setCompassChoice } from '../src/types.ts';
import { startJourney, compendium, PROGRESSION_ROWS, ROW_BY_ID } from '../src/progression.ts';
import { pathsModel, pathsHeaderText, pathsReason, bandOpensText, listenerGated, PATHS, PATH_FAMILIES, PATH_SUMMARIES, FAMILY_ROWS } from '../src/paths.ts';
import { questLeads } from '../src/quest-places.ts';
import { WORLD_WAIT } from '../src/constellation.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { RELIQUARY } from '../src/world-routes.ts';

const load = (h) => migrateSave(JSON.parse(readFileSync(new URL(`./fixtures/paths-sim-${h}.json`, import.meta.url), 'utf8')));
const clone = (s) => JSON.parse(JSON.stringify(s));
const v1Save = (seed = 'PATHS') => { const s = freshSave(); s.seed = seed; return startJourney(s, {}); };
const entryOf = (m, id) => m.entries[id] || m.extra.find((e) => e.id === id) || null;
const band = (t) => APERTURE_BANDS[t].threshold;
// The secrets (visibility X thread rewards) and the reliquary pool: never named until yours.
const SECRET_NAMES = ['Shadow Clone', 'Continuous Assault', 'The Second Wayfarer', "The Tinker's Tags"];
const RELIQUARY_NAMES = RELIQUARY.pool.map((id) => ROW_BY_ID[id].name);

test('every progression row belongs to exactly one family or summary', () => {
  const seen = new Map();
  for (const id of [...PATH_FAMILIES.map((f) => f.id), ...PATH_SUMMARIES]) for (const r of FAMILY_ROWS[id]) seen.set(r.id, (seen.get(r.id) || 0) + 1);
  assert.equal(seen.size, PROGRESSION_ROWS.length);
  assert.ok([...seen.values()].every((n) => n === 1));
  assert.ok(FAMILY_ROWS.veil.some((r) => r.id === 'pocket-time') && FAMILY_ROWS.motion.some((r) => r.id === 'quickening:alt') && FAMILY_ROWS.form.some((r) => r.id === 'skill:ember-form'));
});

test('the 1-hour save: the core kit yours, the world half ahead, the next gate within Stage 1', () => {
  const m = pathsModel(load('h01'));
  assert.equal(m.header.exploration, true); assert.equal(m.header.world.owned, 0);
  assert.deepEqual(m.families.find((f) => f.id === 'veil').held.map((h) => h.name), ['Veil Guard', 'Thorned Veil', 'Sanctuary', 'Mirror Veil']);
  const ward = entryOf(m, 'ember-skin:alt'); assert.equal(ward.state, 'next'); assert.deepEqual(ward.progress, { n: 1, need: 20 }); assert.match(ward.step, /Set burning, and lived: 1 of 20/);
  assert.equal(entryOf(m, 'resonant-force:alt').state, 'silhouette', 'a hinted milestone not yet begun has no name');
  assert.equal(entryOf(m, 'resonant-force:alt').name, null);
  const golem = entryOf(m, 'field:corridor-golem'); assert.equal(golem.state, 'next'); assert.deepEqual(golem.progress, { n: 0, need: 5 }); assert.ok(golem.at && golem.away > 0 && golem.threat >= 1);
  assert.equal(entryOf(m, 'field:power-aegis').state, 'known'); assert.match(entryOf(m, 'field:power-aegis').step, /opens at Infinite\./);
  assert.equal(entryOf(m, 'spell:shadow-boxing').state, 'known'); assert.match(entryOf(m, 'spell:shadow-boxing').step, /Infinite III, once a Listener falls/);
  assert.equal(entryOf(m, 'awakened:awakening').state, 'next'); assert.match(entryOf(m, 'awakened:awakening').step, /Infinite II: Aperture 2,231/);
  assert.equal(m.ladder.next.band, 'Infinite'); assert.equal(m.ladder.next.listener, false); assert.deepEqual(m.ladder.opens, ["Power Aegis's quest"]);
  assert.ok(m.next.length === PATHS.nextCount && m.next.every((e) => e.state === 'next'));
  assert.ok(m.longRoad && m.longRoad.bold, 'one long road: a Bold place');
});

test('the 10-hour save: the Listener chain on the Ladder, the six quests as next steps, the Bold ones marked', () => {
  const s = load('h10'), m = pathsModel(s);
  assert.equal(m.ladder.next.band, 'Infinite III'); assert.equal(m.ladder.next.listener, true); assert.equal(m.ladder.held, false);
  assert.deepEqual(m.ladder.chain.map((c) => [c.id, c.done]), [['aperture', false], ['relays', true], ['mouth', true], ['listener', false]]);
  assert.deepEqual(m.ladder.compass, { pin: { rx: 47, ry: 58, name: 'The Far Array' } });
  assert.deepEqual(m.ladder.opens, ['4 spells: Shadow Boxing, Imbue Weapon, Orbit Volley, Stillpoint', 'the Transit Lattice and 3 passives', 'secondary forms', "Essence Walk's quest"]);
  for (const id of ['field:corridor-golem', 'field:tempo', 'field:blade-stream', 'glyph-mine', 'field:arc-wave', 'field:power-aegis']) assert.equal(entryOf(m, id).state, 'next', id);
  assert.equal(m.header.reach, 2.04);
  assert.equal(entryOf(m, 'field:tempo').bold, true); assert.equal(entryOf(m, 'field:power-aegis').bold, true); assert.equal(entryOf(m, 'field:corridor-golem').bold, false);
  assert.ok(entryOf(m, 'field:power-aegis').threat > m.header.reach * PATHS.bold);
  assert.deepEqual(entryOf(m, 'resonant-force:alt').progress, { n: 1, need: 10 });
  assert.equal(entryOf(m, 'field:sanctum').state, 'known');
  assert.match(pathsHeaderText(m), /^10\.0 h · 215 sections · reach: foes ×2\.0 · world abilities 0 of \d+ \(\d+ more past 1,000 sections\)$/);
  // a quest's steps are the ordered list a later "line" can rank: done flags and the current one
  const arc = entryOf(m, 'field:arc-wave'); assert.ok(Array.isArray(arc.steps) && arc.steps.length === 1 && arc.steps[0].current);
  const gm = entryOf(m, 'glyph-mine'); assert.deepEqual(gm.steps.map((x) => [x.key, x.done, x.current]), [['wraiths', false, true], ['sela', false, false]]);
});

test('the 20-hour save: the Aperture held for the Listener, a reliquary find yours, a seeded thread rumoured', () => {
  const m = pathsModel(load('h20'));
  assert.equal(m.ladder.held, true); assert.equal(m.ladder.chain[0].done, true); assert.equal(m.ladder.chain[3].done, false);
  assert.ok(m.families.find((f) => f.id === 'rift').held.some((h) => h.id === 'rift-wake:alt'), 'Rift Ward, from the bottom of the Deep');
  assert.equal(m.header.world.owned, 1);
  const wg = entryOf(m, 'field:wellspring'); assert.equal(wg.state, 'rumoured'); assert.match(wg.step, /Seeds for an Orchard: 1 of 6/);
  assert.equal(entryOf(m, 'passive:bell-toll').state, 'next');
  assert.deepEqual(entryOf(m, 'anchor:alt').progress, { n: 1, need: 10 });
  assert.equal(m.summaries.find((x) => x.id === 'mounts').steps[0].id, 'companion:hatchling');
});

test('Paths never writes the save: not the seeded thread picks, not a quest place, not the Far Array', () => {
  for (const h of ['h01', 'h10', 'h20']) {
    const s = load(h); delete s.quests.threads; // as a journey from before the picks were read
    const before = clone(s);
    pathsModel(s); for (const r of PROGRESSION_ROWS) pathsReason(s, r.id);
    assert.deepEqual(clone(s), before, h); // the save as it persists (migrateSave leaves some keys undefined, which JSON drops)
  }
  const f = v1Save('PATHS-FRESH'), before = clone(f);
  pathsModel(f); for (const r of PROGRESSION_ROWS) pathsReason(f, r.id);
  assert.deepEqual(clone(f), before);
  const g = clone(f); compendium(g); assert.notDeepEqual(g.quests.threads, f.quests.threads, 'the hazard is real: the compendium saves the picks');
  assert.deepEqual(pathsModel(clone(g)).entries['echoing-cast'], pathsModel(f).entries['echoing-cast'], 'the pure read agrees with the saved pick');
});

test('secrets are never listed or counted until yours; reliquary finds stay unnamed', () => {
  for (const s of [v1Save('SECRET'), load('h01'), load('h10'), load('h20')]) {
    const m = pathsModel(s), text = JSON.stringify(m);
    for (const n of SECRET_NAMES) assert.ok(!text.includes(n), n);
    const owned = new Set(m.families.flatMap((f) => f.held.map((h) => h.name)));
    for (const n of RELIQUARY_NAMES) if (!owned.has(n)) assert.ok(!text.includes(`"${n}"`), n);
    assert.ok(!m.entries['spell:shadow-clone'] && !m.entries['field:continuous-assault']);
    for (const e of Object.values(m.entries)) if (e.state === 'silhouette') assert.equal(e.name, null);
  }
  const s = load('h10'); s.feats.earned['spell:shadow-clone'] = { route: 'd', from: 'second', at: 1 }; s.perception.aperture = band(13); s.farArray.listeners = 1;
  const m = pathsModel(s); assert.ok(m.families.find((f) => f.id === 'spells').held.some((h) => h.name === 'Shadow Clone'), 'yours: drawn');
});

test('Classic and Exploration: the same view, Classic without silhouettes and with its quests as extra routes', () => {
  const ex = load('h10'), cl = clone(ex); cl.progression.mode = 0;
  const me = pathsModel(ex), mc = pathsModel(cl);
  assert.equal(mc.header.exploration, false); assert.equal(mc.header.mode, 'Classic'); assert.doesNotMatch(pathsHeaderText(mc), /world abilities/);
  assert.ok(Object.values(me.entries).some((e) => e.state === 'silhouette'));
  assert.ok(!Object.values(mc.entries).some((e) => e.state === 'silhouette'), 'Classic withholds nothing');
  assert.equal(mc.entries['field:tempo'].state, 'known'); assert.match(mc.entries['field:tempo'].step, /Transit Lattice, which opens at Infinite III, once a Listener falls/);
  const tempo = mc.extra.find((e) => e.id === 'field:tempo'); assert.ok(tempo && tempo.extraRoute && tempo.route === 'b');
  assert.match(tempo.note, /extra route/); assert.match(tempo.note, new RegExp(`pays ${RELIQUARY.consolation.dust} lumen dust`));
  assert.ok(mc.extra.some((e) => e.id === 'ember-skin:alt' && e.route === 'c'), 'a Classic milestone under way');
  // a late Classic journey: the Listener felled, the Lattice open
  const late = clone(cl); late.perception.aperture = band(14); late.farArray.listeners = 5;
  const ml = pathsModel(late);
  assert.ok(ml.families.find((f) => f.id === 'lattice').held.some((h) => h.id === 'field:tempo'));
  assert.equal(ml.ladder.next.listener, false); assert.equal(ml.ladder.chain.length, 0);
  assert.equal(listenerGated(late, 13), false); assert.equal(bandOpensText(late, 13), 'Opens at the Infinite III band of the Aperture.');
});

test('compass actions are the Journal\'s: the same follow for a quest, the same pin for the Far Array, one following state', () => {
  const s = load('h10'), m = pathsModel(s), leads = questLeads(clone(s));
  const quests = Object.values(m.entries).filter((e) => e.compass?.follow?.kind === 'quest');
  assert.equal(quests.length, leads.length);
  for (const l of leads) assert.ok(quests.some((e) => JSON.stringify(e.compass.follow) === JSON.stringify(l.follow)), l.title);
  const golem = m.entries['field:corridor-golem'], g = clone(s);
  setCompassChoice(g, { follow: golem.compass.follow });
  const mg = pathsModel(g); assert.equal(mg.entries['field:corridor-golem'].following, true); assert.equal(mg.entries['field:tempo'].following, false); assert.equal(mg.ladder.following, false);
  const p = clone(s); setCompassChoice(p, { pin: m.ladder.compass.pin });
  const mp = pathsModel(p); assert.equal(mp.ladder.following, true); assert.equal(mp.entries['field:corridor-golem'].following, false, 'a pin outranks a follow');
  const h = pathsModel(load('h20')).summaries.find((x) => x.id === 'mounts').steps[0]; assert.deepEqual(h.compass, { follow: { kind: 'rescue' } });
});

test('message fix 1: a world-withheld extra node no longer reads "Learn Veil Guard first."', () => {
  const s = load('h10'); assert.ok(s.magicSkills.learned['veil-guard'] >= 1);
  const r = pathsReason(s, 'pocket-time'); assert.ok(r); assert.doesNotMatch(r, /Learn/); assert.match(r, /^Not found yet: the end of a story you have not begun/);
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /show\.extra&&worldWithheld\(save,show\.id\)\?pathsReason\(save,show\.id\)\|\|WORLD_WAIT/);
});

test('message fix 2: "Not found yet" points to Leads only for what Leads lists', () => {
  assert.doesNotMatch(WORLD_WAIT, /Leads/);
  const s = load('h10');
  assert.equal(pathsReason(s, 'spell:shadow-clone'), 'Not found yet. No one speaks of how.');
  assert.doesNotMatch(pathsReason(s, 'spell:gravity-well'), /Leads/);
  assert.match(pathsReason(s, 'field:tempo'), /a quest for Vela is under way \(Journal → Leads\)/);
  assert.match(pathsReason(s, 'casting-wind'), /^Not found yet: a milestone\. Spells cast while gliding or air-walking: 0 of 30\.$/);
  assert.match(pathsReason(s, 'cinder-heart:alt'), /end of something/);
  assert.match(pathsReason(load('h20'), 'field:wellspring'), /Seeds for an Orchard \(Journal → Arcana\)/);
  assert.equal(pathsReason(s, 'skill:veil-guard'), null, 'not withheld: the Arcanum keeps its own reason');
  const c = clone(s); c.progression.mode = 0; assert.equal(pathsReason(c, 'pocket-time'), null, 'Classic withholds nothing');
});

test('message fix 3: the Listener is named where its rewards are', () => {
  const s = load('h10');
  assert.equal(bandOpensText(s, 13), 'Opens at the Infinite III band of the Aperture, once a Listener falls.');
  assert.equal(bandOpensText(s, 12), 'Opens at the Infinite II band of the Aperture.');
  const ahead = compendium(clone(s)).ahead.find((a) => a.label === 'Infinite III'); assert.equal(ahead.note, 'once a Listener falls');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /show\.unlockTier\?bandOpensText\(save,show\.unlockTier\)/);
  assert.match(main, /Secondary forms open at the \$\{APERTURE_BANDS\[ALT_UNLOCK_TIER\]\.name\} band of the Aperture\$\{listenerGated/);
  assert.match(main, /It opens only once a Listener falls at the Far Gate/);
});

test('the Arcanum opens Paths as its first sub-tab, built only when opened', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /const ARCANUM_TABS=\[\['paths','Paths'\],\['constellation','Spells & Constellation'\]/);
  assert.match(main, /paths:\(\)=>openPaths\(\)/);
  assert.match(main, /function pathsCompass\(c\)\{if\(c\.follow\)chooseGuidance\(\{follow:c\.follow\}\);else if\(c\.pin\)\{compassPin=/);
  assert.equal((main.match(/pathsModel\(/g) || []).length, 1, 'one call, in openPaths');
  assert.doesNotMatch(main.slice(main.indexOf('function frame('), main.indexOf('function frame(') + 4000), /pathsModel/);
});

test('build time: under 5 ms on a big save', () => {
  const big = load('h20');
  // about four times the sections of a real 41-hour journey (1,301), out to about 50 sections
  for (let i = 0; i < 5000; i++) big.explored[`${(i % 100) - 50},${Math.floor(i / 100) - 25}`] = 1;
  for (let i = 0; i < 3; i++) pathsModel(load('h01')); // warm
  // The cost of a build, not the machine's load: the best of seven per save (the suite runs files in parallel), all under 5 ms.
  const best = {};
  for (const [k, s] of [['h01', load('h01')], ['h10', load('h10')], ['h20', load('h20')], ['big', big]]) { let b = Infinity; for (let i = 0; i < 7; i++) { const t0 = performance.now(); pathsModel(s); b = Math.min(b, performance.now() - t0); } best[k] = b; }
  console.log(`paths build, best of 7: ${Object.entries(best).map(([k, v]) => `${k} ${v.toFixed(2)} ms`).join(', ')}`);
  for (const [k, v] of Object.entries(best)) assert.ok(v < 5, `${k}: ${v}`);
});

test('the new module is in the build and both precache lists, and names no model', () => {
  const build = readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8'), sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), pg = readFileSync(new URL('../proving-ground/sw.js', import.meta.url), 'utf8');
  assert.ok(build.includes("'paths'")); assert.ok(sw.includes('./src/paths.js?v=')); assert.ok(pg.includes('../src/paths.js?v='));
  assert.ok(!/claude|opus|sonnet|fable/i.test(readFileSync(new URL('../src/paths.ts', import.meta.url), 'utf8')));
});
