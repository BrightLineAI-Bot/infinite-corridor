// The Wayfarer as the thing the Corridor fears (Tim, 2026-11-15; docs/narrative-bible.md section 1; src/lore.ts WAYFARER_DREAD).
// An undercurrent only: a few hushed lines, one rare Glimpse, and a few lesser creatures that cower for a moment. Everything is
// hashed (the same journey answers the same way), rare, and pinned to ground first seen from its version on: on ground explored
// before, nobody hushes, nothing cowers and the Glimpse is never offered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, pinDungeonLayout } from '../src/game.ts';
import { WAYFARER_DREAD, HUSHED_LINES, HUSHED_WARDEN_LINES, dreadLive, hushedSpeaker, hushesNow, hushedLine, hushedSpeech, cowerChance, cowerRoll, dreadGlimpseOffered, ensureLore } from '../src/lore.ts';
import { BEHAVIOUR, behaviourProfile } from '../src/enemy-behaviour.ts';
import { MONSTER_PACK } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { GLIMPSES, GLIMPSE_ORDER, GLIMPSE_PLACED, GLIMPSE_CHANCE, glimpseFor, pickGlimpse, witnessGlimpse, glimpseAllowed } from '../src/glimpses.ts';
import { hasGlimpseRenderer, drawGlimpse } from '../src/glimpse-render.ts';
import { flatWorld, spawn, frame } from './enemy-behaviour-harness.ts';

const D = WAYFARER_DREAD, C = D.cower;
const save = (seed) => { const s = freshSave(); s.seed = seed; return s; };
const run = (w, seconds, each = null) => { for (let t = 0; t < seconds; t += w.dt) { frame(w); each?.(w, t); } };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const ctx = () => new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), getTransform: () => ({}), ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
const traveller = (i) => ({ id: `travelers:${i},${-i}:0`, kind: 'traveler', name: 'Pim', role: 'Pilgrims' });
const folk = (i) => ({ id: `hamlet-${i}-3-folk-0`, kind: 'villager', name: 'Odile', role: 'Weaver', line: 'Rest a while.', settlement: `hamlet-${i}-3` });

test('the table: data only, small, rare; only lesser ordinary creatures, never rats', () => {
  assert.equal(D.version, 1);
  for (const [role, p] of Object.entries(D.speech)) assert.ok(p > 0 && p <= .08, `${role} ${p}`);
  assert.ok(D.glimpse.chance > 0 && D.glimpse.chance <= .15 && D.glimpse.deaths >= 2);
  const kinds = Object.keys(C.kinds); assert.ok(kinds.length >= 6 && kinds.length <= 14, `${kinds.length} kinds`);
  const top = Math.max(...C.levels.map(([, k]) => k));
  for (const [kind, [p, mode]] of Object.entries(C.kinds)) {
    assert.ok(p > 0 && p * top <= .1, `${kind}: at most one in ten, even at full strength`);
    assert.ok(mode in C.time && mode in C.speed, kind);
    const entry = BEHAVIOUR.kinds[kind]; assert.ok(entry, `${kind} is an ordinary creature`);
    assert.notEqual(Array.isArray(entry) ? entry[0] : entry, 'brute', `${kind}: nothing proud`);
    if (MONSTER_PACK[kind]) assert.ok(!MONSTER_PACK[kind].unique, `${kind} is not a unique beast`);
    assert.ok(!C.never.test(kind), kind);
  }
  for (let i = 1; i < C.levels.length; i++) assert.ok(C.levels[i][0] > C.levels[i - 1][0] && C.levels[i][1] >= C.levels[i - 1][1], 'likelier as the Wayfarer grows');
  for (const rat of ['rat', 'gutterRat', 'ratKing', 'ratling', 'plagueRat']) assert.ok(C.never.test(rat), rat);
  for (const kind of ['strataEel', 'pirate', 'crystalCrab', 'pallidCrawler']) assert.ok(!C.never.test(kind), kind);
  assert.ok(C.cooldown >= 10 && C.far > 3);
});

test('the lines: short, original, never naming the Wayfarer, none repeated', () => {
  assert.ok(HUSHED_LINES.length >= 10 && HUSHED_LINES.length <= 64);
  for (const l of [...HUSHED_LINES, ...HUSHED_WARDEN_LINES]) { assert.ok(l.length <= 100, l); assert.doesNotMatch(l, /Wayfarer|you are|it'?s you/i, l); }
  assert.equal(new Set([...HUSHED_LINES, ...HUSHED_WARDEN_LINES]).size, HUSHED_LINES.length + HUSHED_WARDEN_LINES.length);
});

test('who hushes: travellers, reciters and a hamlet\'s folk; never the named, the cartographer or the Elders', () => {
  assert.equal(hushedSpeaker(traveller(1)), 'traveler');
  assert.equal(hushedSpeaker({ ...traveller(1), reciter: 'siddhartha' }), 'reciter');
  assert.equal(hushedSpeaker(folk(1)), 'villager');
  assert.equal(hushedSpeaker({ ...folk(1), guard: true, role: 'Warden' }), 'villager');
  for (const o of [{ ...traveller(1), wanderer: true }, { ...traveller(1), elder: true }, { ...folk(1), cook: true }, { ...folk(1), talkKey: 'farmer:talks' }, { ...folk(1), settlement: 'ember-refuge' }, { kind: 'villager', id: 'cairn', cairnKeeper: true, settlement: 'ember-refuge' }, { kind: 'ilse', id: 'ilse' }, { kind: 'npc', id: 'warden-oren' }, { ...folk(1), hushed: true }, null])
    assert.equal(hushedSpeaker(o), null, JSON.stringify(o));
});

test('hushed speech is hashed, rare, at most once a speaker, and absent on ground explored before', () => {
  const N = 20000;
  for (const [role, mk] of [['traveler', traveller], ['reciter', (i) => ({ ...traveller(i), reciter: 'rilke', name: 'A reciter' })], ['villager', folk]]) {
    let n = 0;
    for (let i = 0; i < N; i++) { const o = mk(i); const a = hushesNow('DREAD', o, 1, 1); assert.equal(hushesNow('DREAD', o, 1, 1), a, 'the same answer every time'); if (a) n++; assert.equal(hushesNow('DREAD', o, 1, 0), false, 'version 0: never'); assert.equal(hushesNow('DREAD', o, 1, undefined), false); }
    const p = D.speech[role], share = n / N; assert.ok(Math.abs(share - p) < .01, `${role}: ${share} vs ${p}`);
  }
  // A speaker spoken to again and again hushes at most once, then speaks as usual.
  const s = save('HUSH'); let speakers = 0, hushed = 0;
  for (let i = 0; i < 400; i++) { const o = folk(i); let times = 0; for (let k = 0; k < 30; k++) if (hushedSpeech(s, o, 1)) times++; assert.ok(times <= 1, o.id); speakers++; hushed += times; }
  assert.ok(hushed > 0 && hushed < speakers * .9, `${hushed} of ${speakers}`);
  const old = save('HUSH'); for (let i = 0; i < 400; i++) { const o = folk(i); for (let k = 0; k < 30; k++) assert.equal(hushedSpeech(old, o, 0), null); }
  assert.equal(old.lore.hushed, undefined, 'nothing written where it never spoke');
  // the same journey and speaker answer the same way
  const a = save('SAME'), b = save('SAME'), said = (s) => Array.from({ length: 300 }, (_, i) => { const o = traveller(i); return [1, 2, 3].map(() => hushedSpeech(s, o, 1)).join('|'); }).join('\n');
  assert.equal(said(a), said(b));
});

test('no hushed line repeats until all are heard; wardens keep their own; the record survives a save and load', () => {
  const s = save('LINES'), heard = [];
  for (let i = 0; i < HUSHED_LINES.length; i++) heard.push(hushedLine(s, folk(i), 1));
  assert.equal(new Set(heard).size, HUSHED_LINES.length, 'every line once');
  assert.ok(HUSHED_LINES.includes(hushedLine(s, folk(99), 1)), 'then any');
  assert.ok(HUSHED_WARDEN_LINES.includes(hushedLine(s, { ...folk(3), guard: true }, 1)));
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.lore.hushed, s.lore.hushed); assert.equal(back.version, 14);
  assert.equal(freshSave().lore.hushed, undefined, 'a fresh save carries nothing new');
  assert.equal(ensureLore({ lore: { hushed: 'zz' } }).lore.hushed, '');
  const keep = ensureLore({ lore: { hushed: '3f', futureThing: 1 } }).lore; assert.equal(keep.hushed, '3f'); assert.equal(keep.futureThing, 1, 'unknown fields kept');
});

test('who cowers: hashed per creature, rare, likelier as the Wayfarer grows; never rats, bosses, elites, world beasts or guardians', () => {
  const N = 20000;
  for (const kind of Object.keys(C.kinds)) {
    const base = createCombatant(kind, 0, 0); assert.ok(behaviourProfile({ ...base, id: 'x' }), `${kind} is ordinary`);
    for (const level of [1, 25, 60]) {
      let n = 0; for (let i = 0; i < N; i++) { const e = { ...base, id: `${kind}:${i}` }, r = cowerRoll(e, level); assert.deepEqual(cowerRoll(e, level), r); if (r) { n++; assert.equal(r.mode, C.kinds[kind][1]); const [lo, hi] = C.time[r.mode]; assert.ok(r.time >= lo && r.time <= hi); } }
      const p = cowerChance(base, level); assert.ok(Math.abs(n / N - p) < .006, `${kind} L${level}: ${n / N} vs ${p}`); assert.ok(n / N <= .11);
    }
    assert.ok(cowerChance(base, 60) > cowerChance(base, 1));
    for (const patch of [{ boss: true }, { eliteId: 'e' }, { elite: true }, { worldBeast: 'blob' }, { questingBeast: true }, { dungeonRole: 'gateWarden' }, { packGuardian: true }, { pentBoss: true }, { dead: true }])
      for (let i = 0; i < 2000; i++) assert.equal(cowerRoll({ ...base, ...patch, id: `${kind}:${i}` }, 99), null, `${kind} ${JSON.stringify(patch)}`);
    assert.equal(cowerChance(base, 99, false), 0, 'not ordinary: never');
  }
  // Rats never: not even if someone lists one.
  const saved = { ...C.kinds };
  try { for (const rat of ['rat', 'gutterRat', 'ratKing']) { C.kinds[rat] = [1, 'flee']; for (let i = 0; i < 2000; i++) assert.equal(cowerRoll({ kind: rat, id: `${rat}:${i}`, hp: 5, maxHp: 5 }, 99), null, rat); } }
  finally { for (const k of Object.keys(C.kinds)) if (!(k in saved)) delete C.kinds[k]; }
  // Most things still fight: nothing outside the table cowers.
  for (const kind of ['riftLynx', 'thunderhorn', 'mirrorShade', 'rootBrute', 'lumenWraith', 'hollowMarshal']) for (let i = 0; i < 2000; i++) assert.equal(cowerRoll({ ...createCombatant(kind, 0, 0), id: `${kind}:${i}` }, 99), null, kind);
});

test('in a fight: without the dread on the board nothing cowers; with it, one creature backs off for a moment and then comes on, and never a whole pack', () => {
  // Off (every board the game hands out on ground explored before, and every older fixture): no record of cowering, ever.
  const off = flatWorld(), P0 = off.player; for (let i = 0; i < 14; i++) spawn(off, 'pallidCrawler', P0.x + 5 + (i % 4), P0.y - 3 + (i >> 2));
  let cowered = 0; run(off, 6, (w) => { for (const e of w.enemies) if (e.bhv?.cower > 0) cowered++; }); assert.equal(cowered, 0);
  // Two identical worlds, the dread off in both: frame for frame the same.
  const twin = () => { const w = flatWorld(), P = w.player; for (let i = 0; i < 6; i++) spawn(w, i % 2 ? 'glassMite' : 'pallidCrawler', P.x + 4 + i, P.y + (i % 3)); run(w, 3); return JSON.stringify(w.enemies.map((e) => [e.x, e.y, e.hp, e.aggro])); };
  assert.equal(twin(), twin());
  // On, with every crawler made to cower (a test-only table edit): only one at a time, for its time, then it fights.
  const keep = C.kinds.pallidCrawler;
  try {
    C.kinds.pallidCrawler = [1, 'flee'];
    const w = flatWorld(), P = w.player; w.squad.wayfarerDread = { level: 60, next: 0 };
    for (let i = 0; i < 12; i++) spawn(w, 'pallidCrawler', P.x + 5 + (i % 3) * .9, P.y - 2 + (i >> 2) * .9);
    let most = 0, first = null, start = null, farthest = 0;
    run(w, 8, (w) => { const now = w.enemies.filter((e) => e.bhv?.cower > 0); most = Math.max(most, now.length); if (now.length && !first) { first = now[0]; start = dist(first, P); } if (first) farthest = Math.max(farthest, dist(first, P)); });
    assert.equal(most, 1, 'never a whole pack: one at a time');
    assert.ok(first && farthest > start + .5, `it backed away (${start} -> ${farthest})`);
    assert.ok(w.enemies.filter((e) => e !== first).every((e) => e.aggro), 'the rest came on');
    assert.ok(!(first.bhv.cower > 0) && first.aggro, 'and then it came on too');
    assert.ok(w.hurts.length > 0, 'the fight was not emptied');
    // Struck while cowering, it fights at once.
    const v = flatWorld(), Q = v.player; v.squad.wayfarerDread = { level: 60, next: 0 }; const c = spawn(v, 'pallidCrawler', Q.x + 4, Q.y);
    let t = 0; while (!(c.bhv?.cower > 0) && t++ < 120) frame(v); assert.ok(c.bhv.cower > 0);
    c.hp -= 1; frame(v); assert.equal(c.bhv.cower, 0, 'struck: it fights');
  } finally { C.kinds.pallidCrawler = keep; }
  // A boss of a cowering kind never cowers, even on a live board.
  const b = flatWorld(), B = b.player; b.squad.wayfarerDread = { level: 99, next: 0 }; spawn(b, 'pallidCrawler', B.x + 4, B.y, { boss: true }); spawn(b, 'thunderhorn', B.x - 4, B.y);
  let any = 0; run(b, 4, (w) => { for (const e of w.enemies) if (e.bhv?.cower > 0) any++; }); assert.equal(any, 0);
});

test('the Glimpse of the one who keeps returning: drawn, kept out of the general pool, offered rarely and only on new ground, seen once', () => {
  const G = GLIMPSES[D.glimpse.id]; assert.ok(G && hasGlimpseRenderer(D.glimpse.id)); assert.equal(G.place, 'returning'); assert.ok(!G.mature && glimpseAllowed(D.glimpse.id, true), 'family-safe');
  assert.ok(G.seconds >= 8 && G.seconds <= 20 && G.reduced.length >= 2);
  assert.ok(!GLIMPSE_ORDER.includes(D.glimpse.id)); assert.deepEqual(GLIMPSE_PLACED.returning, [D.glimpse.id]); assert.equal(GLIMPSE_CHANCE.returning, 1);
  const s = save('SHUT'); let r = 0; const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 400; i++) assert.notEqual(pickGlimpse(s, 10, 10, rand), D.glimpse.id);
  for (const cue of ['touch', 'crossing', 'strange', 'pentagon']) for (let i = 0; i < 100; i++) assert.notEqual(glimpseFor(s, cue, 10, 10, rand), D.glimpse.id, cue);
  assert.equal(glimpseFor(s, 'returning', 10, 10, () => .999), D.glimpse.id);
  witnessGlimpse(s, D.glimpse.id, 10, 10); assert.equal(glimpseFor(s, 'returning', 10, 10, () => 0), null, 'once');
  // the offer: hashed per crossing and deaths, rare, after a few deaths, never where the dread is not live
  let n = 0; const N = 20000;
  for (let i = 0; i < N; i++) { const id = `dungeon:SHUT:g1:${i}:3:x`, a = dreadGlimpseOffered('SHUT', id, 5, 1); assert.equal(dreadGlimpseOffered('SHUT', id, 5, 1), a); if (a) n++;
    assert.equal(dreadGlimpseOffered('SHUT', id, 5, 0), false); assert.equal(dreadGlimpseOffered('SHUT', id, D.glimpse.deaths - 1, 1), false); }
  assert.ok(Math.abs(n / N - D.glimpse.chance) < .01, `${n / N}`);
  // drawn cheaply at every moment and size: one canvas painted once
  const keep = globalThis.OffscreenCanvas, keepPath = globalThis.Path2D; let made = 0; globalThis.OffscreenCanvas = class { constructor(w, h) { made++; this.width = w; this.height = h; } getContext() { return ctx(); } };
  globalThis.Path2D = class { moveTo() {} lineTo() {} quadraticCurveTo() {} bezierCurveTo() {} closePath() {} arc() {} ellipse() {} rect() {} addPath() {} };
  try { for (const [w, h] of [[360, 640], [1280, 720]]) { const state = { quality: 'low' }; for (let t = 0; t <= 1.0001; t += .02) assert.doesNotThrow(() => drawGlimpse(ctx(), D.glimpse.id, t, w, h, state), `t ${t}`); const after = made; for (let t = 0; t <= 1.0001; t += .02) drawGlimpse(ctx(), D.glimpse.id, t, w, h, state); for (const t of G.reduced) drawGlimpse(ctx(), D.glimpse.id, t, w, h, state); assert.equal(made, after, 'no new canvases once painted'); assert.ok(state.shutter); } }
  finally { if (keep === undefined) delete globalThis.OffscreenCanvas; else globalThis.OffscreenCanvas = keep; if (keepPath === undefined) delete globalThis.Path2D; else globalThis.Path2D = keepPath; }
});

test('pinned to new ground: a section or crossing first seen now carries the version; ground explored before keeps none and nobody there hushes', () => {
  assert.equal(dreadLive(1), true); assert.equal(dreadLive(0), false); assert.equal(dreadLive(undefined), false);
  const s = save('PIN'), g = new Game(s, 0); g.rx = 4; g.ry = 3; g.loadArea('overworld');
  assert.equal(s.atlas['4,3'].wayfarerDreadVersion, D.version, 'new ground'); assert.equal(g.wayfarerDreadHere(), D.version);
  // A crossing never entered takes the version; one visited before does not.
  const fresh = pinDungeonLayout(s, 'dungeon:PIN:g1:9:9:x'); assert.equal(fresh.wayfarerDreadVersion, D.version);
  s.consequences.dungeons['dungeon:PIN:g1:9:8:x'] = { discovered: true, bypassed: false, visits: 1, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false };
  assert.equal(pinDungeonLayout(s, 'dungeon:PIN:g1:9:8:x').wayfarerDreadVersion, undefined, 'visited before: unchanged');
  // An old journey: the same section, its Atlas entry written before the dread. Reloading keeps it unwritten, and speech is as it was.
  const o = save('PIN'), old = new Game(o, 0); old.rx = 4; old.ry = 3; old.loadArea('overworld'); delete o.atlas['4,3'].wayfarerDreadVersion;
  old.loadArea('overworld'); assert.equal(o.atlas['4,3'].wayfarerDreadVersion, undefined, 'an entry from before keeps none'); assert.equal(old.wayfarerDreadHere(), 0);
  const speak = (game, i) => { const p = game.player, v = { ...folk(i), x: Math.round(p.x), y: Math.round(p.y), state: 'calm', actions: ['speak'] }; game.map.objects.push(v); const out = []; for (let k = 0; k < 6; k++) out.push(game.interact('speak', v.id).message); game.map.objects.pop(); return out; };
  for (let i = 0; i < 150; i++) for (const m of speak(old, i)) assert.equal(m, 'Odile (Weaver): “Rest a while.”');
  let hushedNew = 0; for (let i = 0; i < 150; i++) for (const m of speak(g, i)) if (/lowering their voice/.test(m)) hushedNew++;
  assert.ok(hushedNew > 0 && hushedNew <= 90, `${hushedNew} of 150 speakers hushed`); // each at most once
  // The board: live only here.
  g.update(.05, idle, 1000); old.update(.05, idle, 1000);
  assert.ok(g.squad?.wayfarerDread && g.squad.wayfarerDread.level >= 1, 'live on new ground'); assert.equal(old.squad?.wayfarerDread, null, 'never on ground explored before');
});
