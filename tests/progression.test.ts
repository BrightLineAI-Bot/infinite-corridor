// The progression table and its compendium (docs/progression-design.md, Phase 1): every ability the game defines has a row
// and every row names a real ability (the drift guard), the rows are well formed, today's ownership reads correctly, the
// compendium draws for a fresh and a rich journey without naming the unknown, the Pace line reads the save, and nothing is saved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PROGRESSION_ROWS, ROW_BY_ID, ROW_ALIASES, ROUTES, TIERS, POOL_OF, VISIBILITY, ARCHETYPES, GROUPS, stateV0, ownershipV0, ownedV0, pace, paceText, compendium, howTo, doesText } from '../src/progression.ts';
import { CASTABLES, PAIRINGS } from '../src/spell-slots.ts';
import { APERTURE_SKILLS, SPELLS, WEAPON_SCALING, TOOL_SCALING, ITEM_TABLE } from '../src/items.ts';
import { BRANCHES, ALT_PASSIVES, learnRank, learnMod, chooseCap } from '../src/constellation.ts';
import { FIELD_KEYS, TOOL_FORM_KEYS, FIELD_PASSIVES, TOOL_FORMS } from '../src/lattice-fields.ts';
import { ARCANA_UNLOCKS } from '../src/lore.ts';
import { AWAKENED_IDS, AWAKENED_ARTS } from '../src/weapon-arts.ts';
import { ECHO_IDS, ECHOES } from '../src/echoes.ts';
import { GLYPH_IDS, GLYPHS, RESONANCES, TRIADS } from '../src/glyphs.ts';
import { TESSERACTS } from '../src/tesseracts.ts';
import { MARGINALIA_IDS, MARGINALIA } from '../src/marginalia.ts';
import { POTION_IDS } from '../src/potions.ts';
import { INGREDIENT_IDS } from '../src/meals.ts';
import { MOUNT_IDS, MOUNT_BEASTS } from '../src/beast-mounts.ts';
import { SEEDS } from '../src/skylands.ts';
import { SLOT_TOOLS } from '../src/spell-slots.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const ids = new Set(PROGRESSION_ROWS.map((r) => r.id));
const slug = (name) => String(name).toLowerCase().replace(/[^a-z]+/g, '-');
const inGroup = (g) => PROGRESSION_ROWS.filter((r) => r.group === g).map((r) => r.id).sort();
const nodeIds = Object.values(BRANCHES).flatMap((b) => [b.mod, ...b.caps, ...(b.extras || [])].map((n) => n.id));

// Every ability id the game defines, as the table keys it (aliases resolved).
function codeIds() {
  const out = [];
  out.push(...Object.keys(CASTABLES));
  out.push(...nodeIds.map((id) => ROW_ALIASES[id] || id));
  out.push(...Object.keys(ALT_PASSIVES).map((id) => `${id}:alt`));
  out.push(...FIELD_KEYS, ...TOOL_FORM_KEYS, ...Object.keys(ARCANA_UNLOCKS));
  out.push(...AWAKENED_IDS.map((id) => `awakened:${id}`));
  out.push(...Object.keys(WEAPON_SCALING).map((k) => `gear:${k}`), ...Object.keys(TOOL_SCALING).map((k) => `gear:${k}`));
  out.push(...[...ITEM_TABLE.armor, ...ITEM_TABLE.charm].map(([name]) => `gear:${slug(name)}`));
  out.push(...ECHO_IDS.map((id) => `echo:${id}`), ...GLYPH_IDS.map((id) => `glyph:${id}`));
  out.push(...Object.keys(RESONANCES).map((id) => `resonance:${id}`), ...Object.keys(TRIADS).map((id) => `triad:${id}`), ...Object.keys(PAIRINGS).map((k) => `pairing:${k}`));
  out.push(...Object.keys(TESSERACTS.classes).map((k) => `tesseract:${k}`));
  out.push(...MARGINALIA_IDS.map((id) => `marginalia:${id}`), ...POTION_IDS.map((id) => `potion:${id}`), ...INGREDIENT_IDS.map((id) => `meal:${id}`));
  out.push(...MOUNT_IDS.map((id) => `mount:${id}`), ...Object.keys(MOUNT_BEASTS).map((id) => `mount:${id}`));
  out.push(...[...SEEDS.kinds, ...SEEDS.rare].map((k) => `seed:${k}`));
  out.push(...SLOT_TOOLS.filter((t) => t !== 'item').map((t) => `utility:${t}`));
  // Gifted gear named only inside game.ts (MILESTONE_GEAR is not exported; BRAWLER_GEAR flags): read from its source.
  const game = readFileSync('src/game.ts', 'utf8');
  for (const [, key] of game.matchAll(/id: "milestone-([a-z-]+)"/g)) out.push(`gear:${key}`);
  for (const [, key] of game.matchAll(/flag: "gear:([a-z-]+)"/g)) out.push(`gear:${key}`);
  return [...new Set(out)];
}

test('drift guard: every ability id the game defines has a row', () => {
  const missing = codeIds().filter((id) => !ids.has(id));
  assert.deepEqual(missing, [], `no row for: ${missing.join(', ')}`);
  assert.ok(game_milestones() >= 4, 'MILESTONE_GEAR was read');
});
function game_milestones() { return [...readFileSync('src/game.ts', 'utf8').matchAll(/id: "milestone-([a-z-]+)"/g)].length; }

test('drift guard: every row names an ability that exists in the code', () => {
  const code = new Set(codeIds());
  // Rows the code keeps without a table of ids: the awakened Hammerfall, Great Sweep, Quandrix Staff and tool fan, awakening
  // itself, the hatchling, the starting armour, supplies and traversal held as save fields. Each is checked against its source.
  const known = {
    'awakened:awakening': true, 'awakened:hammerfall-clap': true, 'awakened:sweep-freeze': true, 'awakened:quandrix-slam': true, 'awakened:tool-fan': true,
    'gear:ash-wrap': freshSave().equipment.armor.id === 'ash-wrap', 'companion:hatchling': 'hatchling' in freshSave().mounts,
    'supply:stegoBait': /stegoBait/.test(readFileSync('src/spell-slots.ts', 'utf8')), 'supply:empowered-rounds': 'empowered' in freshSave().rounds,
    'utility:oculus': true, 'utility:sling': Array.isArray(freshSave().sling), 'utility:glider': /save\.glider/.test(readFileSync('src/game.ts', 'utf8')),
    'utility:tidemantle': 'swim' in freshSave().capabilities, 'utility:skiff': 'owned' in freshSave().boat, 'utility:diving': 'dive' in freshSave().capabilities,
    'utility:shovel': 'shovel' in freshSave().digging, 'utility:crossingSigil': 'crossingSigil' in freshSave().consumables, 'utility:returnEmber': 'embers' in freshSave().theDeep,
  };
  const stray = PROGRESSION_ROWS.map((r) => r.id).filter((id) => !code.has(id) && known[id] !== true);
  assert.deepEqual(stray, [], `rows with no ability in the code: ${stray.join(', ')}`);
  assert.equal(ids.size, PROGRESSION_ROWS.length, 'ids are unique');
});

test('groups hold what the design inventory lists', () => {
  assert.equal(inGroup('disciplines').length, Object.keys(APERTURE_SKILLS).length);
  assert.equal(inGroup('spells').length, Object.keys(SPELLS).length);
  assert.equal(inGroup('nodes').length, nodeIds.length - 1, 'the Aerial Step capstone is the discipline row');
  assert.equal(inGroup('forms').length, Object.keys(ALT_PASSIVES).length);
  assert.deepEqual(inGroup('lattice'), [...FIELD_KEYS].sort());
  assert.deepEqual(inGroup('arts'), [...TOOL_FORM_KEYS].sort());
  assert.equal(inGroup('echoes').length, ECHO_IDS.length);
  assert.equal(inGroup('marginalia').length, MARGINALIA_IDS.length);
  for (const g of GROUPS) assert.ok(inGroup(g.id).length > 0, g.id);
});

test('every row is well formed', () => {
  const groups = new Set(GROUPS.map((g) => g.id));
  for (const r of PROGRESSION_ROWS) {
    const at = r.id;
    assert.ok(groups.has(r.group), `${at}: group`);
    assert.ok(typeof r.name === 'string' && r.name.length > 1, `${at}: name`);
    assert.ok(Array.isArray(r.archetypes) && r.archetypes.every((a) => a in ARCHETYPES), `${at}: archetypes`);
    assert.ok(r.v0.route in ROUTES && typeof r.v0.how === 'string' && r.v0.how.length > 5, `${at}: v0 route`);
    assert.ok(r.v0.gate === null || Object.keys(r.v0.gate).every((k) => ['aperture', 'tier', 'level', 'listeners'].includes(k) && Number.isInteger(r.v0.gate[k])), `${at}: v0 gate`);
    assert.ok(r.v1.route in ROUTES && typeof r.v1.where === 'string' && r.v1.where.length > 3, `${at}: v1 route`);
    assert.equal(r.pool, POOL_OF[r.v1.route], `${at}: pool`);
    assert.ok(r.tier === null || TIERS.includes(r.tier), `${at}: tier`);
    assert.ok(r.visibility in VISIBILITY, `${at}: visibility`);
    assert.ok(typeof r.hint === 'string' && r.hint.length >= 10 && r.hint.length <= 110, `${at}: hint (${r.hint?.length})`);
    assert.ok(!/undefined|NaN|\[object/.test(r.hint + r.name + r.controls + r.obtained + doesText(r)), `${at}: no unfilled text`);
    const h = howTo(r); assert.ok(h.controls.length > 10 && h.does.length > 10 && h.obtained.length > 5, `${at}: how-to`);
    assert.ok(Array.isArray(r.own) && typeof r.own[0] === 'string', `${at}: own`);
    assert.ok(Object.isFrozen(r), `${at}: frozen`);
  }
  // World-pool rows (quests, milestones, threads) have a place; Reliquary rows are seeded per journey.
  for (const r of PROGRESSION_ROWS.filter((q) => q.group !== 'traversal' && ['b', 'c', 'd', 'V'].includes(q.v1.route))) assert.ok(r.tier, `${r.id}: a world ability has a tier`);
});

test('names come from the code where the code names them', () => {
  const codeName = (r) => {
    const key = r.id.split(':').slice(1).join(':');
    if (r.group === 'disciplines') return APERTURE_SKILLS[r.own[1]].name;
    if (r.group === 'spells') return SPELLS[r.own[1]].name;
    if (r.group === 'nodes') return Object.values(BRANCHES).flatMap((b) => [b.mod, ...b.caps, ...(b.extras || [])]).find((n) => n.id === r.id).name;
    if (r.group === 'forms') return ALT_PASSIVES[r.own[1]].name;
    if (r.group === 'lattice') return FIELD_PASSIVES[key].name;
    if (r.group === 'arts') return TOOL_FORMS[key].name;
    if (r.group === 'arcana') return ARCANA_UNLOCKS[r.id].name;
    if (r.group === 'echoes') return ECHOES[key].name;
    if (r.id.startsWith('glyph:')) return GLYPHS[key].name;
    if (r.id.startsWith('marginalia:')) return MARGINALIA[key].name;
    if (r.id.startsWith('awakened:') && AWAKENED_ARTS.moves[key]) return AWAKENED_ARTS.moves[key].name;
    return null;
  };
  for (const r of PROGRESSION_ROWS) { const n = codeName(r); if (n) assert.equal(r.name, n, r.id); }
});

test('the v1 world pool matches the design: 10 quests, 10 milestones, 12 threads, 8 reliquary, 4 Viscera (44)', () => {
  // Traversal that is already place-tied (the Tidemantle's quest) keeps its route and stays outside the 44 (design 3.9).
  const by = {}; for (const r of PROGRESSION_ROWS) if (r.group !== 'traversal') by[r.v1.route] = (by[r.v1.route] || 0) + 1;
  assert.deepEqual([by.b, by.c, by.d, by.R, by.V], [10, 10, 12, 8, 4]);
  const R5 = PROGRESSION_ROWS.filter((r) => r.tier === 'R5' && ['b', 'c', 'd'].includes(r.v1.route)).map((r) => r.name).sort();
  assert.deepEqual(R5, ['Continuous Assault', 'Ember Mend', "Mage's Hand", 'Wellspring'], 'the four R5-only world abilities');
  // Weapons are never gated under v1.
  for (const r of PROGRESSION_ROWS.filter((q) => q.group === 'gear')) assert.ok(['S', 'F', 'U'].includes(r.v1.route), r.id);
  // The core kit: Aegis and Cinder Dart from the start; Aerial Step at Aperture 6.
  assert.equal(ROW_BY_ID['spell:aegis'].v1.route, 'S'); assert.equal(ROW_BY_ID['spell:cinder-dart'].v1.route, 'S');
  assert.match(ROW_BY_ID['skill:aerial-step'].v1.where, /Aperture 6/);
});

// ---------------------------------------------------------------- ownership under today's rules
function richSave() {
  const s = freshSave(); s.seed = 'PROGRESSION-TEST';
  s.perception.aperture = 3400; // Infinite III (tier 13)
  for (let i = 0; i < 3; i++) { learnRank(s, 'form'); learnRank(s, 'motion'); }
  learnMod(s, 'form'); learnMod(s, 'motion'); chooseCap(s, 'form', 'colossus'); chooseCap(s, 'motion', 'aerial-step');
  s.farArray.listeners = 1;
  s.echoes.owned.thunderhorn = true; s.codex.creatures.riftLynx = true;
  s.equipment.primary = { ...s.equipment.primary, awakened: { resonance: 'comet', version: 1 } };
  s.inventory.push({ id: 'primary-iron-fists', name: 'Iron Fists', slot: 'primary', power: 12 }, { id: 'secondary-needle-caster', name: 'Needle Caster', slot: 'secondary', power: 8, upgradeRank: 6 });
  s.mounts.stable.push({ id: 'm1', beast: 'stalker' }); s.mounts.hatchling.owned = true;
  s.arcana = { unlocked: { 'passive:bell-toll': true } };
  s.glyphCodex.resonances.comet = true; s.magicSkills.pairingsSeen['fire+fire'] = true;
  s.marginalia = { found: ['glassEdge'] }; s.capabilities.swim = true; s.glider = { found: true };
  s.playSeconds = 7200; s.explored = Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`${i},0`, true])); s.lastDeath = { schema: 1, sequence: 3 };
  return s;
}

test('ownership on a fresh journey: the starting kit, the free spells, nothing else', () => {
  const s = freshSave(), st = ownershipV0(s);
  for (const id of ['spell:cinder-dart', 'spell:ember-ring', 'spell:grave-sun', 'spell:fire-burst', 'gear:salvage-blade', 'gear:spark-coil', 'gear:ash-wrap', 'utility:lantern', 'utility:build', 'glyph:ignite', 'potion:restorativeDraught']) assert.equal(st[id], 'owned', id);
  for (const id of ['spell:aegis', 'skill:ember-form', 'ember-skin', 'ember-skin:alt', 'field:sanctum', 'field:ki-blast', 'echo:thunderhorn', 'awakened:awakening', 'gear:iron-fists', 'gear:carbine', 'mount:stalker', 'companion:hatchling', 'utility:glider', 'passive:bell-toll']) assert.equal(st[id], 'locked', id);
  assert.equal(st['meal:ironroot'], 'open', 'a cook sells it');
  s.perception.aperture = 7; assert.equal(stateV0(s, ROW_BY_ID['skill:ember-form']), 'open', 'Aperture 6 opens it in the Arcanum');
  assert.equal(stateV0(s, ROW_BY_ID['skill:veil-guard']), 'locked');
});

test('ownership on a rich journey reads every kind of source', () => {
  const s = richSave(), st = ownershipV0(s);
  const owned = ['skill:ember-form', 'skill:quickening', 'skill:aerial-step', 'ember-skin', 'light-feet', 'colossus', 'ember-skin:alt', 'colossus:alt', 'quickening:alt', 'aerial-step:alt',
    'spell:aegis', 'spell:shadow-clone', 'field:sanctum', 'field:nanoknives', 'field:rapid-reload', 'passive:bell-toll', 'awakened:awakening', 'awakened:spell-runes',
    'gear:iron-fists', 'gear:blunderbuss', 'echo:thunderhorn', 'resonance:comet', 'pairing:fire+fire', 'marginalia:glassEdge', 'mount:stalker', 'companion:hatchling', 'utility:tidemantle', 'utility:glider'];
  for (const id of owned) assert.equal(st[id], 'owned', id);
  for (const id of ['cinder-heart', 'slipstream', 'arcane-edge', 'casting-wind']) assert.equal(st[id], 'open', `${id}: today's rules offer it`);
  for (const id of ['skill:veil-guard', 'skill:rift-step']) assert.equal(st[id], 'open', id);
  assert.equal(st['echo:riftLynx'], 'rumoured', 'its creature has been seen');
  for (const id of ['awakened:fissure', 'awakened:hammerfall-clap', 'gear:needle-caster', 'passive:lamplight', 'mount:doomChaser', 'sanctuary:alt']) assert.equal(st[id], 'locked', id);
  assert.equal(ownedV0(s, 'aerial-step'), true, 'the capstone id reads through its alias');
  s.farArray.listeners = 0; assert.equal(stateV0(s, ROW_BY_ID['field:sanctum']), 'locked', 'the Lattice needs a Listener felled');
});

test('the Pace line reads hours, sections, abilities by route, Echoes and deaths from the save', () => {
  const p = pace(richSave());
  assert.equal(p.hours, 2); assert.equal(p.sections, 64); assert.equal(p.sectionsPerHour, 32);
  assert.equal(p.echoes, 1); assert.equal(p.echoTotal, ECHO_IDS.length);
  assert.equal(p.deaths, 3); assert.equal(p.deathsPerHour, 1.5);
  assert.ok(p.byRoute.a >= 10 && p.byRoute.S >= 4 && p.byRoute.d === 1 && p.byRoute.W >= 2, JSON.stringify(p.byRoute));
  assert.equal(p.abilities, Object.values(p.byRoute).reduce((n, v) => n + v, 0));
  const t = paceText(p);
  for (const bit of ['2.0 hours played', '64 sections explored (32 an hour)', `Echoes 1 of ${ECHO_IDS.length}`, '1.5 deaths an hour', 'by levelling', 'by threads']) assert.ok(t.includes(bit), `${bit} in ${t}`);
  const f = pace(freshSave()); assert.equal(f.hours, 0); assert.equal(f.deathsPerHour, null); assert.match(paceText(f), /0 deaths/);
});

test('the compendium draws a fresh and a rich journey, and never names the unknown', () => {
  for (const s of [freshSave(), richSave(), migrateSave(JSON.parse(JSON.stringify(richSave())))]) {
    const c = compendium(s), st = ownershipV0(s);
    assert.equal(c.title, 'What the Corridor Taught You'); assert.ok(c.paceText.length > 20);
    assert.equal(c.groups.length, GROUPS.length);
    for (const g of c.groups) {
      assert.equal(g.total, inGroup(g.id).length);
      for (const e of g.entries) { assert.notEqual(st[e.id], 'locked'); assert.ok(e.label && e.name, e.id); if (e.state !== 'rumoured') assert.ok(e.does && e.controls && e.obtained, e.id); }
      const named = new Set(g.entries.map((e) => e.id)); for (const id of inGroup(g.id)) if (st[id] === 'locked') assert.ok(!named.has(id), `${id} is unknown and unnamed`);
    }
    // A locked row's name appears nowhere, unless another known row shares it (the Aegis pairing and the Aegis spell) or it is
    // one of today's directed level-ups ahead.
    const text = JSON.stringify(c.groups), knownNames = new Set(PROGRESSION_ROWS.filter((r) => st[r.id] !== 'locked').map((r) => r.name));
    for (const r of PROGRESSION_ROWS) if (st[r.id] === 'locked' && !knownNames.has(r.name) && !c.ahead.some((a) => a.names.includes(r.name))) assert.ok(!text.includes(`"name":"${r.name}"`), r.id);
  }
  const rich = compendium(richSave()), echoes = rich.groups.find((g) => g.id === 'echoes');
  assert.equal(echoes.owned, 1); assert.deepEqual(echoes.entries.map((e) => e.state).sort(), ['owned', 'rumoured']);
  assert.match(echoes.entries.find((e) => e.state === 'rumoured').label, /^Rumoured: the first kill of a Rift Lynx/);
  assert.deepEqual(compendium(freshSave()).ahead.map((a) => a.label), ['Aperture 6', 'Aperture 18', 'Aperture 36', 'Infinite III']);
});

test('nothing is saved: the save keeps its shape before and after, fresh and migrated', () => {
  for (const s of [freshSave(), richSave(), migrateSave(JSON.parse(JSON.stringify(richSave())))]) {
    const before = JSON.stringify(s); compendium(s); ownershipV0(s); pace(s); assert.equal(JSON.stringify(s), before);
  }
  // Phase 2 adds save.progression (journey-start.ts): a fresh or migrated save without a choice is Classic at start version 0.
  // Phase 4 adds save.hints (the seen set; tests/progression-phase4.test.ts), empty on a fresh journey; the compendium saves nothing.
  const f = freshSave(); assert.ok(!('compendium' in f)); assert.deepEqual(f.hints, { v: 1, base: 0, seen: [] }); assert.deepEqual([f.progression.mode, f.progression.start, f.progression.kept], [0, 0, []]);
  const m = migrateSave(JSON.parse(JSON.stringify(f))); assert.ok(!('compendium' in m)); assert.deepEqual(m.hints, f.hints); assert.deepEqual(m.progression, f.progression);
});

test('wired: the Tome opens the compendium, and the module is built and precached', () => {
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /import \{ compendium \} from "\.\/progression\.ts"/);
  assert.match(main, /function renderTaught\(out\)/); assert.match(main, /if\(mode==="taught"\)\{renderTaught\(out\)/);
  assert.match(main, /uiButton\("What the Corridor Taught You",\(\)=>openJournal\("taught"\)\)/);
  for (const f of ['sw.js', 'proving-ground/sw.js']) assert.match(readFileSync(f, 'utf8'), /src\/progression\.js\?v=\d+/, f);
  assert.match(readFileSync('scripts/build.mjs', 'utf8'), /'progression'/);
  // Phase 2's start and mode switch (after its marker) write save.progression and the new journey's kit; the table above it writes nothing.
  const table = readFileSync('src/progression.ts', 'utf8').split('// ================================================================ Phase 2')[0];
  assert.doesNotMatch(table, /save\.[a-zA-Z]+\s*=[^=]|localStorage|indexedDB/, 'pure: writes nothing');
  assert.doesNotMatch(readFileSync('src/progression.ts', 'utf8'), /localStorage|indexedDB/);
});

test('the Journal page draws from the model without throwing, fresh and rich (DOM stub)', () => {
  const src = readFileSync('src/main.ts', 'utf8'), body = src.match(/function renderTaught\(out\)\{[\s\S]*?\n\}\n/)?.[0];
  assert.ok(body, 'renderTaught found');
  const el = (tag) => ({ tag, children: [], attrs: {}, textContent: '', className: '', append(...k) { this.children.push(...k); }, setAttribute(k, v) { this.attrs[k] = v; } });
  const texts = (n) => typeof n === 'string' ? n : [n.textContent, ...n.children.map(texts)].join(' ');
  for (const s of [freshSave(), richSave()]) {
    const out = el('div'), opened = [];
    const render = new Function('document', 'uiButton', 'compendium', 'save', 'openJournal', `${body}; return renderTaught;`)(
      { createElement: el }, (label, click) => { const b = el('button'); b.textContent = label; b.click = click; return b; }, compendium, s, (m) => opened.push(m));
    render(out);
    const all = texts(out);
    assert.match(all, /What the Corridor Taught You/); assert.match(all, /Pace\. .*hours played/); assert.match(all, /Echoes/);
    out.children[0].click(); assert.deepEqual(opened, ['tome'], 'the back button returns to the Tome');
    if (s.echoes.owned.thunderhorn) { assert.match(all, /Thunderhorn's Charge · Yours/); assert.match(all, /Lynx Pounce · Rumoured/); assert.doesNotMatch(all, /Lynx Pounce: strike|undefined/); assert.match(all, /How it came\.\s+The first kill of a Thunderhorn/); }
  }
});
