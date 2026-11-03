// Release 723 (Tim, 2026-11-03): the domains, a bespoke arena section for a world beast beyond 1000; first the Questing Beast's
// Thornglass Caldera (crystal and lava), opened as a quest by its fall far out, where it comes back if you wait.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FAR_DOMAINS, farDomainCentre, farDomainAt, farDomainTarget, openFarQuest, activeFarQuest, ensureFarQuests } from '../src/far-realms.ts';
import { THORNGLASS, domainReach, domainWait } from '../src/far-domains.ts';
import { worldBeastFor } from '../src/world-beasts.ts';
import { questingBeastFor } from '../src/questing-beast.ts';
import { isLandscapeKind } from '../src/landscape.ts';
import { drawLandscapeTile } from '../src/landscape-render.ts';
import { ATLAS_TILE_COLORS } from '../src/atlas-colors.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const seed = 'DOM723';
const load = (save, rx, ry) => { const g = new Game(save, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); return g; };
const fresh = () => { const s = freshSave(); s.seed = seed; return s; };

test('the Thornglass Caldera lies far out at a seeded place; ground seen before is never turned into it', () => {
  const D = FAR_DOMAINS.questingBeast, c = farDomainCentre(seed, 'questingBeast'), d = Math.hypot(c.rx, c.ry);
  assert.ok(d >= D.min - 1 && d <= D.min + D.span + 1, `${d}`); assert.deepEqual(farDomainCentre(seed, 'questingBeast'), c);
  assert.notDeepEqual(farDomainCentre('OTHER', 'questingBeast'), c);
  const s = fresh(); assert.equal(farDomainAt(s, c.rx, c.ry), 'questingBeast'); assert.equal(farDomainAt(s, c.rx, c.ry, true), null, 'explored before: left as it was');
  assert.equal(farDomainAt(s, c.rx + 1, c.ry), null);
  s.atlas = { [`${c.rx},${c.ry}`]: { terrain: 'grass', landscapeVersion: 17 } }; const t = farDomainTarget(s, 'questingBeast');
  assert.ok(!s.atlas[`${t.rx},${t.ry}`] && Math.hypot(t.rx, t.ry) > d, 'a quest leads on to ground not yet seen');
  for (const k of ['thornBasalt', 'thornFloor', 'thornShards', 'thornCrystal']) { assert.ok(isLandscapeKind(k), k); assert.ok(ATLAS_TILE_COLORS[k], k); }
});

test('the caldera is built whole: a fighting floor, crystal towers, lava beyond, every gate reached, nothing else living there', () => {
  const s = fresh(), c = farDomainCentre(seed, 'questingBeast'), g = load(s, c.rx, c.ry), m = g.map, at = (x, y) => m.tiles[y * 32 + x];
  assert.equal(m.farDomain, 'questingBeast'); assert.equal(m.weather, 'embers');
  assert.equal(at(16, 16).kind, 'thornFloor'); assert.ok(m.tiles.filter((t) => t.kind === 'thornFloor').length > 100);
  const crystals = m.tiles.filter((t) => t.kind === 'thornCrystal'); assert.ok(crystals.length > 10 && crystals.every((t) => t.blocked));
  assert.ok(crystals.filter((t) => t.tower).length >= THORNGLASS.crystals.count[0], 'every cluster has its tower');
  assert.ok(m.tiles.some((t) => t.kind === 'lava')); assert.ok(m.tiles.every((t) => t.landscape === 'thornglass' && !(t.elev > 0)));
  const seen = domainReach(m), ex = m.exits;
  for (const [x, y] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) assert.ok(seen[y * 32 + x], `gate ${x},${y} reached`);
  assert.ok(m.tiles.every((t) => t.blocked || t.kind === 'lava' || seen[t.y * 32 + t.x]), 'no open ground cut off');
  assert.ok(m.objects.every((o) => o.kind === 'wayfindingCue'), 'only the compass waymarks'); assert.ok(g.enemies.every((e) => e.questingBeast), g.enemies.map((e) => e.kind).join());
  assert.deepEqual(load(fresh(), c.rx, c.ry).map.tiles.map((t) => t.kind), m.tiles.map((t) => t.kind), 'the same caldera each time');
  assert.equal(worldBeastFor(s, m, c.rx, c.ry), null, 'no other world beast claims it');
  assert.ok(s.narrative.journal.some((j) => j.recordId === 'far-domain:questingBeast'));
  assert.deepEqual(s.farQuests.questingBeast, { status: 'found', rx: c.rx, ry: c.ry }, 'found by wandering, it is remembered');
});

test('the Questing Beast comes home: at once on the visit that finds the caldera, after a wait on later visits, leaving any other hunt', () => {
  const s = fresh(), c = farDomainCentre(seed, 'questingBeast'); let g = load(s, c.rx, c.ry);
  assert.equal(g.domainVisit.wait, 2); for (let i = 0; i < 90; i++) g.domainTick(1 / 30);
  let qb = g.enemies.find((e) => e.questingBeast); assert.ok(qb && qb.aggro, 'it comes'); assert.equal(g.message, FAR_DOMAINS.questingBeast.comes);
  assert.deepEqual([s.questingBeast.active.rx, s.questingBeast.active.ry], [c.rx, c.ry]); assert.equal(g.map.tiles[Math.round(qb.y) * 32 + Math.round(qb.x)].kind, 'thornFloor');
  // slain; later it hunts elsewhere; the Wayfarer comes back and waits
  s.questingBeast.active = { rx: 40, ry: 40, tries: 1 }; s.questingBeast.cooldown = 9;
  g = load(s, c.rx, c.ry); assert.ok(!g.enemies.some((e) => e.questingBeast), 'not there at first'); assert.equal(g.message, FAR_DOMAINS.questingBeast.waiting);
  const W = FAR_DOMAINS.questingBeast.wait; assert.ok(g.domainVisit.wait >= W[0] && g.domainVisit.wait <= W[1]);
  for (let t = 0; t < W[0] - 1; t += 1 / 30) g.domainTick(1 / 30); assert.ok(!g.enemies.some((e) => e.questingBeast), 'not yet');
  for (let t = 0; t < W[1]; t += 1 / 30) g.domainTick(1 / 30); qb = g.enemies.filter((e) => e.questingBeast); assert.equal(qb.length, 1, 'it comes, once');
  assert.deepEqual(s.questingBeast.active, { rx: c.rx, ry: c.ry, tries: 1 }, 'it left its other hunt for its own ground, its tries kept');
  assert.equal(s.questingBeast.cooldown, 0);
  assert.equal(domainWait(seed, 'questingBeast', c.rx, c.ry, 5), domainWait(seed, 'questingBeast', c.rx, c.ry, 5));
  // no roll for it in its domain unless it is here
  const t = fresh(); t.perception = { aperture: 9999 }; assert.equal(questingBeastFor(t, { ...g.map }, c.rx, c.ry), null);
});

test('its fall far out opens the quest; the compass follows it; the save keeps it; arriving completes it', () => {
  const s = fresh(); assert.equal(openFarQuest(s, 'questingBeast', 300, 0), null, 'not near home');
  assert.equal(openFarQuest(s, 'questingBeast', 1200, 0), 'questingBeast'); const q = s.farQuests.questingBeast;
  assert.equal(q.status, 'open'); assert.deepEqual(activeFarQuest(s), { id: 'questingBeast', rx: q.rx, ry: q.ry, name: FAR_DOMAINS.questingBeast.name });
  assert.equal(openFarQuest(s, 'questingBeast', 1200, 0), null, 'once');
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).farQuests.questingBeast, q);
  const bad = { farQuests: { questingBeast: { status: 'odd', rx: 1, ry: 1 } } }; ensureFarQuests(bad); assert.deepEqual(bad.farQuests, {});
  const g = load(s, q.rx, q.ry); assert.equal(g.map.farDomain, 'questingBeast'); assert.equal(s.farQuests.questingBeast.status, 'found');
  assert.ok(g.questNotices.some((n) => n.title === 'QUEST COMPLETE')); assert.equal(activeFarQuest(s), null);
  // in the game, the beast's fall opens it
  const t = fresh(), h = load(t, 1200, 4); t.questingBeast.active = { rx: 1200, ry: 4, tries: 0 };
  const beast = Object.assign(createCombatant('questingBeast', 5, 5, true, []), { id: 'qb', questingBeast: true, boss: true, dead: true }); h.defeatEnemy(beast);
  assert.equal(t.farQuests.questingBeast?.status, 'open'); assert.ok(t.narrative.journal.some((j) => j.recordId === 'far-quest:questingBeast'));
});

test('the caldera draws: crystal towers, lava with its crust, rock with the lava\'s glow', () => {
  const s = fresh(), c = farDomainCentre(seed, 'questingBeast'), m = load(s, c.rx, c.ry).map, calls = new Set();
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => { calls.add(k); }, set: () => true });
  for (const t of m.tiles) assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, 32), true, t.kind);
  assert.ok(calls.has('clip') && calls.has('lineTo') && calls.has('ellipse'));
});
