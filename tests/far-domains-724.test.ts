// Release 724 (Tim, 2026-11-03: "let's build all those boss arenas"): a domain for nine more world beasts, each a bespoke arena
// section beyond 1000, opened as a quest by its beast's fall far out, where the beast comes home if you wait.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FAR_DOMAINS, farDomainCentre, openFarQuest, activeFarQuest } from '../src/far-realms.ts';
import { domainReach } from '../src/far-domains.ts';
import { DOMAIN_LOOKS, DOMAIN_LOOK_IDS, domainKinds } from '../src/domain-looks.ts';
import { WORLD_BEASTS, worldBeastFor } from '../src/world-beasts.ts';
import { isLandscapeKind } from '../src/landscape.ts';
import { drawLandscapeTile } from '../src/landscape-render.ts';
import { ATLAS_TILE_COLORS } from '../src/atlas-colors.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const seed = 'DOM724';
const fresh = () => { const s = freshSave(); s.seed = seed; s.perception = { ...(s.perception || {}), aperture: 1e6 }; return s; };
const load = (save, rx, ry) => { const g = new Game(save, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); return g; };
const IDS = ['voidWalker', 'crimsonTyrant', 'doomChaser', 'morphingBlob', 'tremorWorm', 'mountainTurtle', 'ashenMoth', 'nanobotKnight', 'briarStag'];

test('nine more domains, each a world beast\'s, far out at their own places, with their own tiles', () => {
  assert.deepEqual([...DOMAIN_LOOK_IDS].sort(), [...IDS].sort());
  const at = new Set();
  for (const id of IDS) {
    const D = FAR_DOMAINS[id], c = farDomainCentre(seed, id), d = Math.hypot(c.rx, c.ry); assert.ok(WORLD_BEASTS[id] && D.beast === id, id);
    assert.ok(d >= D.min - 1 && d <= D.min + D.span + 1, `${id} ${d}`); assert.ok(D.name && D.arrive && D.quest && D.comes && D.waiting, id); at.add(`${c.rx},${c.ry}`);
    const K = domainKinds(id); for (const k of [K.ground, K.floor, K.scatter, K.feature, K.thicket]) { assert.ok(isLandscapeKind(k), k); assert.ok(ATLAS_TILE_COLORS[k], k); }
  }
  assert.equal(at.size, IDS.length, 'no two share a section');
});

test('each is built whole: floor, landmarks with towers, its hazard, every gate and all open ground reached, only its beast', () => {
  for (const id of IDS) {
    const s = fresh(), c = farDomainCentre(seed, id), g = load(s, c.rx, c.ry), m = g.map, L = DOMAIN_LOOKS[id], K = domainKinds(id);
    assert.equal(m.farDomain, id); assert.equal(m.tiles[16 * 32 + 16].kind, K.floor, id);
    const feats = m.tiles.filter((t) => t.kind === K.feature); assert.ok(feats.length >= 8 && feats.every((t) => t.blocked) && feats.some((t) => t.tower), id);
    const hz = L.hazard.kind === 'thicket' ? K.thicket : L.hazard.kind; assert.ok(m.tiles.filter((t) => t.kind === hz).length > 20, `${id} hazard`);
    assert.ok(m.tiles.every((t) => t.landscape === 'arena' && t.look === id && !(t.elev > 0)), id);
    const seen = domainReach(m), ex = m.exits;
    for (const [x, y] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) assert.ok(seen[y * 32 + x], `${id} gate ${x},${y}`);
    assert.ok(m.tiles.every((t) => t.blocked || ['lava', 'abyss', 'ocean', 'toxicWater'].includes(t.kind) || seen[t.y * 32 + t.x]), `${id}: nothing cut off`);
    assert.ok(m.objects.every((o) => o.kind === 'wayfindingCue'), id); assert.ok(g.enemies.every((e) => e.worldBeast === id), `${id}: ${g.enemies.map((e) => e.kind)}`);
    assert.equal(worldBeastFor(s, m, c.rx, c.ry), null, `${id}: no other beast claims it`);
    assert.deepEqual(load(fresh(), c.rx, c.ry).map.tiles.map((t) => t.kind), m.tiles.map((t) => t.kind), `${id}: the same each time`);
    assert.equal(g.message, FAR_DOMAINS[id].arrive); assert.equal(s.farQuests[id].status, 'found');
  }
});

test('its beast comes home: at once on the finding visit, after a wait later, leaving another hunt; and is there when you come back', () => {
  for (const id of IDS) {
    const s = fresh(), c = farDomainCentre(seed, id); let g = load(s, c.rx, c.ry);
    for (let i = 0; i < 90; i++) g.domainTick(1 / 30); let b = g.enemies.filter((e) => e.worldBeast === id && !e.dead);
    assert.equal(b.length, 1, `${id} comes`); assert.equal(b[0].kind, WORLD_BEASTS[id].kind); assert.equal(g.message, FAR_DOMAINS[id].comes);
    assert.deepEqual([s.worldBeasts[id].active.rx, s.worldBeasts[id].active.ry], [c.rx, c.ry]);
    g = load(s, c.rx, c.ry); assert.equal(g.enemies.filter((e) => e.worldBeast === id).length, 1, `${id}: still there on return`);
    s.worldBeasts[id].active = { rx: 50, ry: 60, tries: 2 }; g = load(s, c.rx, c.ry); assert.ok(!g.enemies.some((e) => e.worldBeast === id), `${id}: away`);
    assert.equal(g.message, FAR_DOMAINS[id].waiting); for (let t = 0; t < 120; t += 1 / 15) g.domainTick(1 / 15);
    assert.equal(g.enemies.filter((e) => e.worldBeast === id).length, 1, `${id}: back`); assert.deepEqual(s.worldBeasts[id].active, { rx: c.rx, ry: c.ry, tries: 2 });
  }
  const s = freshSave(); s.seed = seed; s.perception = { aperture: 0 }; const c = farDomainCentre(seed, 'doomChaser'), g = load(s, c.rx, c.ry);
  for (let i = 0; i < 300; i++) g.domainTick(1 / 30); assert.ok(!g.enemies.some((e) => e.worldBeast), 'a beast the Aperture has not opened does not come');
});

test('a beast slain far out opens the quest to its domain; the compass follows; the save keeps it; arriving completes it', () => {
  for (const id of IDS) {
    const s = fresh(); assert.equal(openFarQuest(s, id, 200, 0), null); assert.equal(openFarQuest(s, id, 1100, 9), id, id);
    const q = s.farQuests[id]; assert.equal(activeFarQuest(s).id, id); assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).farQuests[id], q);
    const g = load(s, q.rx, q.ry); assert.equal(g.map.farDomain, id); assert.equal(s.farQuests[id].status, 'found'); assert.ok(g.questNotices.some((n) => n.title === 'QUEST COMPLETE'));
  }
  const t = fresh(), h = load(t, 1100, 9); t.worldBeasts.briarStag.active = { rx: 1100, ry: 9, tries: 0 };
  h.defeatEnemy(Object.assign(createCombatant('briarStag', 5, 5, true, []), { id: 'bs', worldBeast: 'briarStag', boss: true, dead: true }));
  assert.equal(t.farQuests.briarStag?.status, 'open'); assert.ok(t.narrative.journal.some((j) => j.recordId === 'far-quest:briarStag'));
});

test('every domain draws, tile by tile', () => {
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  for (const id of IDS) { const c = farDomainCentre(seed, id), m = load(fresh(), c.rx, c.ry).map; for (const t of m.tiles) assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, 32), true, `${id} ${t.kind}`); }
});
