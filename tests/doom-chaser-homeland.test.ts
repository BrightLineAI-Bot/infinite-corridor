// The Doom Chaser's homeland. Release 760 (Tim, 2026-11-05: "The Doom Chaser should still just remain in the Stillworks"), refined the
// same day: "the Doom Chaser can appear only in the Pentagon [Stillworks] - but if you go out past one thousand he can appear as a normal
// world boss, and then if you kill him past a thousand you'll get the quest for his home territory where you can go and fight him. Also,
// you can just stumble onto his territory, and it'll function like the other monsters, where he'll be more likely to come there."
// Inside 1000 sections (straight-line, the far realms' own `start`) no section is claimed for him and he never passes through; beyond it
// he is an ordinary world beast, exactly as before release 760; the Black Pyre is his domain again. Every other beast is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { PASSING, WORLD_BEASTS, WORLD_BEAST_IDS, BEAST_HOMELANDS, beastRoams, beastRoamsAt, ENCOUNTER, RETREAT, worldBeastFor, passingBeastFor, ensureWorldBeasts, canPursue, beginRetreat, replanRetreat, retreatSide, advanceRetreat } from '../src/world-beasts.ts';
import { FAR_REALMS, FAR_DOMAINS, farDomainCentre, farDistance, openFarQuest } from '../src/far-realms.ts';
import { PENTAGON_ARENA, pentagonArenaRoster } from '../src/pentagon-arena.ts';
import { isPackKind } from '../src/monster-pack.ts';
import { ECHOES } from '../src/echoes.ts';
import { stableMount, MOUNT_BEASTS } from '../src/beast-mounts.ts';
import { createCombatant } from '../src/combat.ts';

const seed = 'HOMELAND';
const fresh = () => { const s = freshSave(); s.seed = seed; s.perception = { ...(s.perception || {}), aperture: 1e6 }; ensureWorldBeasts(s); return s; };
const open = () => ({ width: 32, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'floor', blocked: false })), objects: [] });
const load = (save, rx, ry) => { const g = new Game(save, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); return g; };
const scaled = (k, f) => { const was = ENCOUNTER.chanceScale; ENCOUNTER.chanceScale = k; try { return f(); } finally { ENCOUNTER.chanceScale = was; } };
// As before release 760: no homeland at all.
const unbound = (f) => { const was = BEAST_HOMELANDS.doomChaser; delete BEAST_HOMELANDS.doomChaser; try { return f(); } finally { BEAST_HOMELANDS.doomChaser = was; } };
// Every claim over a long walk along a row: `rx:beast`, the claimed hunt cleared each time so the next can come.
const walk = (s, from, n, ry) => { const out = []; for (let rx = from; rx < from + n; rx++) { s.beastGap.fresh = ENCOUNTER.newSections; const m = worldBeastFor(s, open(), rx, ry); if (m) { out.push(`${rx}:${m.worldBeast}`); s.worldBeasts[m.worldBeast].active = null; } } return out; };
const onlyHim = (s) => { for (const id of WORLD_BEAST_IDS) s.worldBeasts[id].cooldown = id === 'doomChaser' ? 0 : 1e9; return s; };

test('the rule is data: his line is the far realms\' start, measured straight from Ember Refuge; no other beast has one, and the Stillworks keeps him', () => {
  assert.deepEqual(BEAST_HOMELANDS, { doomChaser: { home: 'stillworks', beyond: FAR_REALMS.start } }); assert.equal(FAR_REALMS.start, 1000);
  assert.equal(beastRoams('doomChaser'), false, 'he does not roam everywhere');
  for (const [rx, ry, ok] of [[0, 0, false], [999, 0, false], [1000, 0, true], [0, -1000, true], [707, 707, false], [708, 708, true], [-1400, 300, true], [700, -700, false]])
    assert.equal(beastRoamsAt('doomChaser', rx, ry), ok, `${rx},${ry} (${farDistance(rx, ry).toFixed(1)})`);
  for (const id of WORLD_BEAST_IDS.filter((k) => k !== 'doomChaser')) { assert.equal(beastRoams(id), true, id); assert.equal(beastRoamsAt(id, 10, 10), true, id); assert.equal(beastRoamsAt(id, 1200, 0), true, id); }
  assert.ok(pentagonArenaRoster(isPackKind).some((r) => r.id === 'doomChaser' && r.beast === 'doomChaser'), 'the Stillworks keeps him'); assert.ok(PENTAGON_ARENA.roster.find((r) => r.id === 'doomChaser'));
});

test('inside 1000 no section is claimed for him, however lucky the roll; every other beast claims exactly as it did (760)', () => {
  scaled(60, () => {
    assert.deepEqual(walk(onlyHim(fresh()), 6, 600, 6), [], 'the Doom Chaser alone, every roll passing: nothing');
    assert.deepEqual(walk(onlyHim(fresh()), 300, 690, -40), [], 'nor right up to the line');
    const now = walk(fresh(), 6, 400, 6), before = fresh(); before.worldBeasts.doomChaser.cooldown = 1e9; // as if he had never rolled at all
    assert.deepEqual(now, walk(before, 6, 400, 6)); assert.ok(now.length > 20, `${now.length} claims`); assert.ok(!now.some((k) => k.endsWith(':doomChaser')));
  });
});

test('beyond 1000 he is an ordinary world beast: he claims sections on his old roll, and every claim (his and the others\') is as before release 760', () => {
  scaled(60, () => {
    const mine = walk(onlyHim(fresh()), 1000, 400, 0); assert.ok(mine.length > 10, `${mine.length} claims`); assert.ok(mine.every((k) => k.endsWith(':doomChaser')));
    assert.deepEqual(mine, unbound(() => walk(onlyHim(fresh()), 1000, 400, 0)), 'his own roll, unchanged');
    const now = walk(fresh(), 1000, 400, 0), old = unbound(() => walk(fresh(), 1000, 400, 0)); assert.deepEqual(now, old); assert.ok(now.length > 20, `${now.length} claims`);
    // across the line: only beyond it
    const across = walk(onlyHim(fresh()), 900, 200, 0); assert.ok(across.length > 3); for (const k of across) assert.ok(Number(k.split(':')[0]) >= 1000, k);
  });
  // at the game's own chance (not scaled), the old tier and depth hold: Aperture 8, chance .01
  assert.equal(WORLD_BEASTS.doomChaser.chance, .01); const low = fresh(); low.perception.aperture = 0; onlyHim(low); scaled(60, () => assert.deepEqual(walk(low, 1000, 200, 0), [], 'still needs his Aperture tier'));
});

test('he never passes through inside 1000; beyond it he does, and every passer is as before release 760', () => {
  const s = fresh(); let seen = 0, his = 0; const kinds = new Set(), ids = WORLD_BEAST_IDS.filter((id) => id !== 'astralWorm' && id !== 'voidWalker' && !PASSING.not.includes(id)); /* 2026-11-12: beasts never seen passing (the Wild Stegosaurus, the Spinosaurus) are not counted */
  for (let i = 0; i < 4000; i++) { const p = passingBeastFor(s, open(), 12 + (i % 40), 3 + Math.floor(i / 40), i);
    if (p) { seen++; kinds.add(p.passingBeast); assert.notEqual(p.passingBeast, 'doomChaser'); assert.notEqual(p.kind, 'doomChaser'); } }
  assert.ok(seen > 60, `${seen} passed`); assert.ok(kinds.size >= ids.length - 2, [...kinds].join());
  const far = (i) => passingBeastFor(s, open(), 1100 + (i % 40), 3 + Math.floor(i / 40), i);
  for (let i = 0; i < 4000; i++) { const p = far(i), q = unbound(() => far(i)); assert.deepEqual(p, q); if (p?.passingBeast === 'doomChaser') his++; }
  assert.ok(his > 3, `${his} times he passed far out`);
});

test('he does not follow the Wayfarer in across his line; beyond it he follows as any beast; a hunt from before 760 inside it keeps following', () => {
  const s = fresh(), at = (rx, ry) => { s.worldBeasts.doomChaser.active = { rx, ry, tries: 1 }; };
  at(1000, 0); assert.equal(canPursue(s, 'doomChaser', 1000, 0, -1, 0), false, 'not in across the line'); assert.equal(canPursue(s, 'doomChaser', 1000, 0, 1, 0), true); assert.equal(canPursue(s, 'doomChaser', 1000, 0, 0, 1), true);
  at(1001, 0); assert.equal(canPursue(s, 'doomChaser', 1001, 0, -1, 0), true, 'still beyond');
  at(40, 3); assert.equal(canPursue(s, 'doomChaser', 40, 3, 1, 0), true, 'a hunt under way inside runs its course');
  s.worldBeasts.doomChaser.active = null; s.worldBeasts.crimsonTyrant.active = { rx: 1000, ry: 0, tries: 1 }; assert.equal(canPursue(s, 'crimsonTyrant', 1000, 0, -1, 0), true, 'the others are untouched');
});

test('a retreat begun beyond the line stays beyond it: home, fallback and every leg; the others retreat as they did', () => {
  const none = () => ({}), canyons = () => ({ canyon: true });
  for (let cycle = 0; cycle < 40; cycle++) for (const [rx, ry] of [[1000, 0], [-1000, 2], [3, 1000], [707, 708], [-708, -707]]) {
    const s = fresh(); s.worldBeasts.doomChaser.cycle = cycle; s.worldBeasts.doomChaser.active = { rx, ry, tries: 1 };
    const r = beginRetreat(s, 'doomChaser', rx, ry, none); assert.ok(beastRoamsAt('doomChaser', r.home.rx, r.home.ry), `fallback ${r.home.rx},${r.home.ry} from ${rx},${ry}`);
    s.worldBeasts.doomChaser.active = { rx, ry, tries: 1 }; const h = beginRetreat(s, 'doomChaser', rx, ry, canyons); assert.ok(h.home.found && beastRoamsAt('doomChaser', h.home.rx, h.home.ry), `home ${h.home.rx},${h.home.ry}`);
    const p = replanRetreat(s, 'doomChaser', rx, ry, none); assert.ok(beastRoamsAt('doomChaser', p.home.rx, p.home.ry), `replanned ${p.home.rx},${p.home.ry}`);
    const t = fresh(); t.worldBeasts.crimsonTyrant.cycle = cycle; t.worldBeasts.crimsonTyrant.active = { rx, ry, tries: 1 }; const u = fresh(); u.worldBeasts.crimsonTyrant.cycle = cycle; u.worldBeasts.crimsonTyrant.active = { rx, ry, tries: 1 };
    assert.deepEqual(beginRetreat(t, 'crimsonTyrant', rx, ry, none), unbound(() => beginRetreat(u, 'crimsonTyrant', rx, ry, none)));
  }
  // a leg that would cut in across the line goes the other way round; others (and his own legs inside it) step as ever
  const r = { home: { rx: 620, ry: 790, found: true } }; assert.equal(beastRoamsAt('doomChaser', 706, 708), false); assert.ok(beastRoamsAt('doomChaser', 620, 790));
  assert.equal(retreatSide(r, 707, 708, 'doomChaser'), 'south'); assert.equal(retreatSide(r, 707, 708, 'crimsonTyrant'), 'west'); assert.equal(retreatSide(r, 707, 708), 'west'); assert.equal(retreatSide(r, 600, 600, 'doomChaser'), retreatSide(r, 600, 600));
  const s = fresh(); s.playSeconds = 0; s.worldBeasts.doomChaser.active = { rx: 707, ry: 708, tries: 1, retreat: { home: { rx: 620, ry: 790, found: true }, side: null, legs: 0, movedAt: 0 } }; const path = [];
  for (let k = 1; k < 200 && s.worldBeasts.doomChaser.active; k++) { s.playSeconds = k * RETREAT.legSeconds; advanceRetreat(s, 'doomChaser', 0, 0); const a = s.worldBeasts.doomChaser.active; if (a) path.push([a.rx, a.ry]); }
  assert.ok(path.length > 50); for (const [x, y] of path) assert.ok(beastRoamsAt('doomChaser', x, y), `leg ${x},${y}`); assert.deepEqual(path.at(-1), [620, 790]);
});

test('the Black Pyre is his domain again: stumbled onto, he comes at once; later after a wait; a hunt elsewhere comes home; and a journey that saw it empty works', () => {
  const s = fresh(), c = farDomainCentre(seed, 'doomChaser'); assert.ok(farDistance(c.rx, c.ry) >= 1000, 'every far domain lies beyond the line');
  for (const id of Object.keys(FAR_DOMAINS)) { const d = farDomainCentre(seed, id); assert.ok(farDistance(d.rx, d.ry) >= FAR_REALMS.start, id); }
  assert.equal(FAR_DOMAINS.doomChaser.vacant, undefined, 'the empty pyre\'s line is gone');
  let g = load(s, c.rx, c.ry); assert.equal(g.map.farDomain, 'doomChaser'); assert.equal(g.message, FAR_DOMAINS.doomChaser.arrive); assert.equal(s.farQuests.doomChaser.status, 'found');
  for (let i = 0; i < 90; i++) g.domainTick(1 / 30); let b = g.enemies.filter((e) => e.worldBeast === 'doomChaser' && !e.dead);
  assert.equal(b.length, 1, 'he comes at once'); assert.equal(b[0].kind, 'doomChaser'); assert.equal(g.message, FAR_DOMAINS.doomChaser.comes); assert.deepEqual([s.worldBeasts.doomChaser.active.rx, s.worldBeasts.doomChaser.active.ry], [c.rx, c.ry]);
  g = load(s, c.rx, c.ry); assert.equal(g.enemies.filter((e) => e.worldBeast === 'doomChaser').length, 1, 'there when you come back');
  // a journey that saw the empty pyre (760): found, journalled, visited, no hunt. Now it waits for him like any other
  const v = fresh(); v.farQuests = { doomChaser: { status: 'found', rx: c.rx, ry: c.ry } }; v.narrative.journal.push({ recordId: `far-domain:doomChaser`, text: FAR_DOMAINS.doomChaser.arrive, title: 'The Black Pyre' });
  v.worldBeasts.doomChaser.active = { rx: 50, ry: 60, tries: 2 }; // a hunt from before 760, inside the line: it comes home, its tries kept
  const m = migrateSave(JSON.parse(JSON.stringify(v))); g = load(m, c.rx, c.ry); assert.equal(g.message, FAR_DOMAINS.doomChaser.waiting); assert.ok(!g.enemies.some((e) => e.worldBeast));
  let t = 0; for (; t < 150 && !g.enemies.some((e) => e.worldBeast === 'doomChaser'); t += 1 / 15) g.domainTick(1 / 15);
  assert.ok(t >= 40 && t < 150, `he comes after a wait (${t.toFixed(1)} s)`); assert.equal(g.message, FAR_DOMAINS.doomChaser.comes); assert.deepEqual(m.worldBeasts.doomChaser.active, { rx: c.rx, ry: c.ry, tries: 2 });
  // the other domains are untouched
  const r = fresh(), rc = farDomainCentre(seed, 'crimsonTyrant'), h = load(r, rc.rx, rc.ry); for (let i = 0; i < 90; i++) h.domainTick(1 / 30); assert.equal(h.enemies.filter((e) => e.worldBeast === 'crimsonTyrant').length, 1);
});

test('a far kill pays once and opens the quest to the Black Pyre; a kill inside the line (a hunt from before 760) pays but opens nothing', () => {
  const kill = (rx, ry) => { const s = fresh(); s.worldBeasts.doomChaser.active = { rx, ry, tries: 0 }; const g = load(s, rx, ry), d = g.enemies.find((e) => e.worldBeast === 'doomChaser'); assert.ok(d, `he is at ${rx},${ry}`);
    const was = Number(s.currency) || 0; d.hp = 0; d.dead = true; g.defeatEnemy(d); const paid = s.currency - was; g.defeatEnemy(d); assert.equal(s.currency - was, paid, 'paid once'); return { s, g, paid }; };
  let rx = 1100, ry = 37, far = null; for (let k = 0; k < 12 && !far; k++, ry++) { try { far = kill(rx, ry); } catch { far = null; } }
  assert.ok(far); const { s, paid } = far; assert.ok(paid > 0, `paid ${paid}`); assert.equal(s.worldBeasts.doomChaser.slain, 1); assert.equal(s.worldBeasts.doomChaser.active, null);
  assert.equal(s.farQuests.doomChaser?.status, 'open', 'the quest to his pyre'); assert.ok(s.narrative.journal.some((j) => j.recordId === 'far-quest:doomChaser'));
  const t = farDomainCentre(seed, 'doomChaser'); assert.ok(farDistance(s.farQuests.doomChaser.rx, s.farQuests.doomChaser.ry) >= farDistance(t.rx, t.ry) - 1);
  const near = kill(40, 3); assert.equal(near.s.worldBeasts.doomChaser.slain, 1); assert.equal(near.s.farQuests.doomChaser, undefined, 'no quest from inside the line'); assert.equal(openFarQuest(fresh(), 'doomChaser', 999, 0), null);
});

test('a save mid-hunt inside the line keeps its hunt through migration and exact resume; once it ends he is not met inside again', () => {
  const s = fresh(); s.worldBeasts.doomChaser.active = { rx: 40, ry: 3, tries: 2, wounds: .5 }; const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(m.worldBeasts.doomChaser.active, { rx: 40, ry: 3, tries: 2, wounds: .5 }); assert.equal(m.version, 14);
  const g = load(m, 40, 3), d = g.enemies.find((e) => e.worldBeast === 'doomChaser'); assert.ok(d && !d.dead, 'he is there'); assert.ok(d.hp < d.maxHp, 'his wounds kept');
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(300))), 900); assert.ok(r.enemies.some((e) => e.worldBeast === 'doomChaser' && !e.dead), 'exact resume');
  d.hp = 0; d.dead = true; g.defeatEnemy(d); assert.equal(m.worldBeasts.doomChaser.active, null); assert.equal(m.worldBeasts.doomChaser.slain, 1); assert.equal(m.worldBeasts.doomChaser.spoils, true);
  m.worldBeasts.doomChaser.cooldown = 0; for (const id of WORLD_BEAST_IDS) if (id !== 'doomChaser') m.worldBeasts[id].cooldown = 1e9; scaled(60, () => assert.deepEqual(walk(m, 6, 300, 6), []));
  // a far hunt saved mid-fight resumes far out
  const f = fresh(); f.worldBeasts.doomChaser.active = { rx: 1180, ry: 4, tries: 1, wounds: .4 }; const mf = migrateSave(JSON.parse(JSON.stringify(f))); assert.deepEqual(mf.worldBeasts.doomChaser.active, { rx: 1180, ry: 4, tries: 1, wounds: .4 });
});

test('everything already earned from him is kept: Echo, spoils, mount, the found pyre and its quest, journal entries', () => {
  const s = fresh(), c = farDomainCentre(seed, 'doomChaser'); assert.ok(ECHOES.doomChaser); assert.ok(MOUNT_BEASTS.doomChaser);
  s.echoes = { ...(s.echoes || {}), owned: { doomChaser: true }, equipped: ['doomChaser'] }; Object.assign(s.worldBeasts.doomChaser, { slain: 2, escaped: 1, spoils: true, cycle: 3 });
  const { mount } = stableMount(s, 'doomChaser'); s.farQuests = { doomChaser: { status: 'found', rx: c.rx, ry: c.ry } };
  s.narrative.journal.push({ recordId: 'far-domain:doomChaser', text: FAR_DOMAINS.doomChaser.arrive, title: 'The Black Pyre' });
  const m = migrateSave(JSON.parse(JSON.stringify(s))), g = new Game(m, 0), back = new Game(deserializeSave(serializeSave(g.exportSnapshot(100))), 200);
  for (const q of [m, g.save, back.save]) { assert.equal(q.echoes.owned.doomChaser, true); assert.deepEqual(q.echoes.equipped, ['doomChaser']); assert.equal(q.worldBeasts.doomChaser.slain, 2); assert.equal(q.worldBeasts.doomChaser.spoils, true);
    assert.ok(q.mounts.stable.some((x) => x.id === mount.id && x.beast === 'doomChaser')); assert.equal(q.farQuests.doomChaser.status, 'found'); assert.ok(q.narrative.journal.some((j) => j.recordId === 'far-domain:doomChaser')); }
  const fell = Object.assign(createCombatant('doomChaser', 5, 5, true, []), { id: 'dc', worldBeast: 'doomChaser', boss: true }); assert.equal(fell.kind, 'doomChaser', 'the creature itself still exists');
});
