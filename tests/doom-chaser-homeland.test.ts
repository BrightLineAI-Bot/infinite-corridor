// The Doom Chaser keeps to the Stillworks (Tim, 2026-11-05: "The Doom Chaser should still just remain in the Stillworks. That's just
// his place... the Stillworks is the only place where he exists"). No new hunt claims a section for him, he never passes through, and
// his far domain (the Black Pyre) stands empty; a hunt already under way runs its course, and everything earned from him is kept.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { WORLD_BEASTS, WORLD_BEAST_IDS, BEAST_HOMELANDS, beastRoams, ENCOUNTER, worldBeastFor, passingBeastFor, ensureWorldBeasts } from '../src/world-beasts.ts';
import { FAR_DOMAINS, farDomainCentre, openFarQuest } from '../src/far-realms.ts';
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
// Every claim over a long walk east: `rx:beast`, the claimed hunt cleared each time so the next can come.
const walk = (s, n = 600) => { const out = []; for (let rx = 6; rx < 6 + n; rx++) { s.beastGap.fresh = ENCOUNTER.newSections; const m = worldBeastFor(s, open(), rx, 6); if (m) { out.push(`${rx}:${m.worldBeast}`); s.worldBeasts[m.worldBeast].active = null; } } return out; };

test('the rule is data: only the Doom Chaser keeps to a homeland, his row stays (the Stillworks measures him from it), and he is still a Stillworks finale', () => {
  assert.deepEqual(BEAST_HOMELANDS, { doomChaser: 'stillworks' }); assert.equal(beastRoams('doomChaser'), false);
  for (const id of WORLD_BEAST_IDS.filter((k) => k !== 'doomChaser')) assert.equal(beastRoams(id), true, id);
  assert.ok(WORLD_BEASTS.doomChaser); assert.ok(pentagonArenaRoster(isPackKind).some((r) => r.id === 'doomChaser' && r.beast === 'doomChaser'), 'the Stillworks keeps him');
  assert.ok(PENTAGON_ARENA.roster.find((r) => r.id === 'doomChaser'));
});

test('no section is claimed for him, however lucky the roll; every other beast claims exactly as it did', () => {
  scaled(60, () => {
    const alone = fresh(); for (const id of WORLD_BEAST_IDS) alone.worldBeasts[id].cooldown = id === 'doomChaser' ? 0 : 1e9;
    assert.deepEqual(walk(alone), [], 'the Doom Chaser alone, every roll passing: nothing');
    const now = walk(fresh(), 400), before = fresh(); before.worldBeasts.doomChaser.cooldown = 1e9; // as if he had never rolled at all
    assert.deepEqual(now, walk(before, 400)); assert.ok(now.length > 20, `${now.length} claims`); assert.ok(!now.some((k) => k.endsWith(':doomChaser')));
  });
});

test('he never passes through a section; the others still do', () => {
  const s = fresh(); let seen = 0; const kinds = new Set(), ids = WORLD_BEAST_IDS.filter((id) => id !== 'astralWorm' && id !== 'voidWalker');
  for (let i = 0; i < 4000; i++) { const p = passingBeastFor(s, open(), 12 + (i % 40), 3 + Math.floor(i / 40), i);
    if (p) { seen++; kinds.add(p.passingBeast); assert.notEqual(p.passingBeast, 'doomChaser'); assert.notEqual(p.kind, 'doomChaser'); } }
  assert.ok(seen > 60, `${seen} passed`); assert.ok(kinds.size >= ids.length - 2, [...kinds].join());
});

test('the Black Pyre is still there as it was built, and stands empty: nothing comes on the finding visit or later, and a hunt elsewhere is not drawn to it', () => {
  const s = fresh(), c = farDomainCentre(seed, 'doomChaser'); let g = load(s, c.rx, c.ry); const tiles = g.map.tiles.map((t) => t.kind).join();
  assert.equal(g.map.farDomain, 'doomChaser'); assert.equal(g.message, FAR_DOMAINS.doomChaser.arrive); assert.equal(s.farQuests.doomChaser.status, 'found');
  for (let i = 0; i < 300; i++) g.domainTick(1 / 30); assert.ok(!g.enemies.some((e) => e.kind === 'doomChaser' || e.worldBeast), 'nothing comes'); assert.equal(s.worldBeasts.doomChaser.active, null);
  g = load(s, c.rx, c.ry); assert.equal(g.message, FAR_DOMAINS.doomChaser.vacant); assert.equal(g.map.tiles.map((t) => t.kind).join(), tiles, 'the same pyre');
  for (let t = 0; t < 150; t += 1 / 15) g.domainTick(1 / 15); assert.ok(!g.enemies.some((e) => e.worldBeast));
  s.worldBeasts.doomChaser.active = { rx: 50, ry: 60, tries: 2 }; g = load(s, c.rx, c.ry); for (let t = 0; t < 150; t += 1 / 15) g.domainTick(1 / 15);
  assert.deepEqual(s.worldBeasts.doomChaser.active, { rx: 50, ry: 60, tries: 2 }, 'a hunt under way stays where it is'); assert.ok(!g.enemies.some((e) => e.worldBeast));
  // the other domains are untouched: the Red Throne's beast still comes home
  const r = fresh(), rc = farDomainCentre(seed, 'crimsonTyrant'), h = load(r, rc.rx, rc.ry); for (let i = 0; i < 90; i++) h.domainTick(1 / 30); assert.equal(h.enemies.filter((e) => e.worldBeast === 'crimsonTyrant').length, 1);
});

test('a save mid-hunt keeps its hunt: he is where he was, with his tries and wounds, through migration and exact resume; once it ends he is not met on the land again', () => {
  const s = fresh(); s.worldBeasts.doomChaser.active = { rx: 40, ry: 3, tries: 2, wounds: .5 }; const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(m.worldBeasts.doomChaser.active, { rx: 40, ry: 3, tries: 2, wounds: .5 }); assert.equal(m.version, 14);
  let g = load(m, 40, 3); let d = g.enemies.find((e) => e.worldBeast === 'doomChaser'); assert.ok(d && !d.dead, 'he is there'); assert.ok(d.hp < d.maxHp, 'his wounds kept');
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(300))), 900); assert.ok(r.enemies.some((e) => e.worldBeast === 'doomChaser' && !e.dead), 'exact resume');
  // in his pyre already (brought home before): still there when you come back
  const q = fresh(), c = farDomainCentre(seed, 'doomChaser'); q.worldBeasts.doomChaser.active = { rx: c.rx, ry: c.ry, tries: 1 }; const h = load(q, c.rx, c.ry);
  assert.equal(h.enemies.filter((e) => e.worldBeast === 'doomChaser').length, 1, 'standing in his domain, he is there as before');
  // slain: paid as ever, and the quest to his pyre opens far out; then no new hunt
  d = g.enemies.find((e) => e.worldBeast === 'doomChaser'); d.hp = 0; d.dead = true; g.defeatEnemy(d); assert.equal(m.worldBeasts.doomChaser.active, null); assert.equal(m.worldBeasts.doomChaser.slain, 1); assert.equal(m.worldBeasts.doomChaser.spoils, true);
  m.worldBeasts.doomChaser.cooldown = 0; for (const id of WORLD_BEAST_IDS) if (id !== 'doomChaser') m.worldBeasts[id].cooldown = 1e9; scaled(60, () => assert.deepEqual(walk(m, 300), []));
  const o = fresh(); assert.equal(openFarQuest(o, 'doomChaser', 1100, 9), 'doomChaser', 'a far kill from a hunt under way still opens its quest');
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
