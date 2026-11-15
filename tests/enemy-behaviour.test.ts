// Ordinary creature behaviour (Tim, 2026-11-14; src/enemy-behaviour.ts): awareness and the alert beat, group calls, arrival,
// attack tokens that rotate fairly, a ring with spacing, varied blows (heavy, combos, feints), guards, poise and flinches with a
// stagger immunity window, retreat, determinism, resume, and a 40-creature soak. Everything runs on the headless harness
// (tests/enemy-behaviour-harness.ts); without a squad board the creatures behave exactly as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEHAVIOUR, behaviourProfile, createSquad, squadFrame, squadRequest, holdsToken, markArrival } from '../src/enemy-behaviour.ts';
import { MONSTER_PACK, PACK_EFFECT_CAP, resetPackRuntime, COMBO_MOVES, freshPackState } from '../src/monster-pack.ts';
import { createCombatant, MELEE_PATTERNS } from '../src/combat.ts';
import { flatWorld, spawn, frame, fight, busyByPool, mixedPack, swarm } from './enemy-behaviour-harness.ts';

const run = (w, seconds, each = null) => { for (let t = 0; t < seconds; t += w.dt) { frame(w); each?.(w, t); } };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('the table: every listed kind has a family; bosses, beasts, elites, uniques, guardians and the like have none', () => {
  for (const [kind, entry] of Object.entries(BEHAVIOUR.kinds)) {
    const family = Array.isArray(entry) ? entry[0] : entry; assert.ok(BEHAVIOUR.families[family], `${kind}: ${family}`);
    if (MONSTER_PACK[kind]) assert.ok(!MONSTER_PACK[kind].unique, `${kind} is not a unique beast`);
    if (!Array.isArray(entry) || !entry[1]?.moves) continue;
    for (const id of entry[1].moves) assert.ok(MELEE_PATTERNS[id], `${kind}: ${id}`);
  }
  for (const F of Object.values(BEHAVIOUR.families)) if (!F.tokensOnly) { assert.ok(F.poise > 0 && F.stagger > 0 && F.immune > 0); assert.ok(F.band[0] < F.band[1]); }
  const lynx = createCombatant('riftLynx', 5, 5);
  assert.equal(behaviourProfile(lynx).family, 'beast');
  for (const patch of [{ boss: true }, { eliteId: 'x' }, { worldBeast: 'blob' }, { dungeonRole: 'gateWarden' }, { illusion: true }, { passiveBehavior: 'graze' }, { skirmishId: 's' }, { domainFamily: 'rootbound' }, { dead: true }])
    assert.equal(behaviourProfile({ ...lynx, ...patch }), null, JSON.stringify(patch));
  for (const kind of ['morphingBlob', 'questingBeast', 'wildStego', 'spinoRex', 'bloblet', 'gloomvast', 'vesperwing']) assert.equal(behaviourProfile(createCombatant(kind, 5, 5)), null, kind);
  assert.equal(behaviourProfile({ ...lynx, dungeonRole: 'hunter' }).family, 'beast', 'ordinary encounter roles keep it');
});

test('without a squad board nothing changes: no record, no flags', () => {
  const w = flatWorld({ squad: false }); mixedPack(w); run(w, 4);
  for (const e of w.enemies) { assert.equal(e.bhv, undefined); assert.equal(e.alert, undefined); assert.equal(e.arrive, undefined); }
});

test('awareness: an unaware creature notices with an alert beat, then engages; its kin are called after staggered delays', () => {
  const w = flatWorld(), P = w.player;
  const a = spawn(w, 'pallidCrawler', P.x + 5, P.y), b = spawn(w, 'pallidCrawler', P.x + 9.5, P.y + 1), c = spawn(w, 'crystalCrab', P.x + 10, P.y - 2), far = spawn(w, 'pallidCrawler', P.x + 18, P.y + 15);
  const start = { x: a.x, y: a.y }; let alertFrames = 0, maxAlert = 0;
  frame(w); assert.equal(a.aggro, true); assert.ok(a.alert > 0, 'the alert flag is up'); const beat = a.bhv.alertMax;
  assert.ok(beat >= BEHAVIOUR.awareness.alert[0] && beat <= BEHAVIOUR.awareness.alert[1], `beat ${beat}`);
  const heard = {};
  run(w, 3, (w, t) => { if (a.alert > 0) { alertFrames++; maxAlert = t; assert.equal(dist(a, start) < 1e-9, true, 'it stands still in its alert beat'); assert.equal(a.pack.attack, null); } for (const q of [b, c]) if (q.aggro && heard[q.id] == null) heard[q.id] = t; });
  assert.ok(alertFrames > 8 && maxAlert <= beat + .05);
  assert.ok(heard[b.id] > 0 && heard[c.id] > 0, 'kin beyond sight are called');
  assert.notEqual(Math.round(heard[b.id] * 30), Math.round(heard[c.id] * 30), 'one after another, not all at once');
  assert.ok(b.bhv.alertMax > 0, 'a called creature has its own alert beat');
  assert.ok(!far.aggro, 'beyond the call it never hears');
});

test('arrival: a creature made in play beside the Wayfarer climbs out harmless, then engages; one already standing there does not arrive', () => {
  const w = flatWorld(), P = w.player;
  const e = markArrival(spawn(w, 'pallidCrawler', P.x + 1, P.y, { aggro: true })), old = spawn(w, 'riftLynx', P.x - 1.2, P.y);
  const fly = markArrival(spawn(w, 'hangedChoir', P.x, P.y + 2, { aggro: true }));
  frame(w); assert.equal(e.arrive > .9, true); assert.equal(e.arriveStyle, 'emerge'); assert.equal(fly.arriveStyle, 'drop'); assert.equal(old.arrive, undefined);
  const hurtBy = (q) => w.hurts.filter((h) => h.kind === q.kind).length; let during = 0;
  run(w, BEHAVIOUR.arrival.time - .1, () => { assert.equal(e.pack.attack, null, 'no attack while it arrives'); during = hurtBy(e); });
  assert.equal(during, 0, 'harmless while it lasts');
  run(w, .3); assert.equal(e.arrive, 0); assert.equal(e.aggro, true);
  const w2 = flatWorld(), far = markArrival(spawn(w2, 'pallidCrawler', w2.player.x + 12, w2.player.y)); frame(w2); assert.equal(far.arrive, undefined, 'far away it simply walks in');
});

test('tokens: the cap holds every frame, grows with the group, and turns rotate fairly', () => {
  const w = flatWorld(), P = w.player; w.player.inv = Infinity; // the Wayfarer takes nothing, so every creature keeps attacking
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; spawn(w, i % 2 ? 'riftLynx' : 'crystalCrab', P.x + Math.cos(a) * 3, P.y + Math.sin(a) * 3, { aggro: true }); }
  const started = {}; let peak = 0, lastSeq = {};
  run(w, 30, (w) => {
    const busy = busyByPool(w); peak = Math.max(peak, busy.melee);
    assert.ok(busy.melee <= w.squad.cap.melee, `melee ${busy.melee} > cap ${w.squad.cap.melee}`); assert.ok(busy.ranged <= w.squad.cap.ranged);
    for (const e of w.enemies) { if (e.pack.seq !== lastSeq[e.id] && e.pack.attack) started[e.id] = (started[e.id] || 0) + 1; lastSeq[e.id] = e.pack.seq; }
  });
  assert.equal(w.squad.cap.melee, 3, 'eight engaged: three close tokens'); assert.equal(peak, 3);
  const counts = w.enemies.map((e) => started[e.id] || 0);
  assert.ok(Math.min(...counts) >= 3, `everyone gets turns (${counts})`);
  assert.ok(Math.max(...counts) <= Math.min(...counts) * 3, `fair (${counts})`);
  // the swarm pool is wider
  const s = createSquad(), crawlers = Array.from({ length: 12 }, (_, i) => Object.assign(createCombatant('pallidCrawler', i, 0), { id: `c${i}`, aggro: true, bhv: { v: 1, wait: 0, press: 0, comboLeft: 0 } }));
  squadFrame(s, crawlers, { x: 0, y: 0 }, 0, 1 / 30); assert.equal(s.cap.swarm, BEHAVIOUR.tokens.swarm.max);
  let granted = 0; for (const e of crawlers) if (squadRequest(s, e, e.bhv, 'swarm')) granted++; assert.equal(granted, BEHAVIOUR.tokens.swarm.max);
});

test('fairness: with one token left, the creature that waited longest is served first', () => {
  const s = createSquad(), mk = (id) => Object.assign(createCombatant('riftLynx', 0, 0), { id, aggro: true, bhv: { v: 1, wait: 0, press: 0, comboLeft: 0, pool: null } });
  const [a, b, c] = ['a', 'b', 'c'].map(mk), holder = mk('h'); holder.bhv.press = 1; holder.bhv.pool = 'melee';
  squadFrame(s, [a, b, c, holder], { x: 0, y: 0 }, 0, 1 / 30); s.busy.melee = s.cap.melee; // full
  a.bhv.wait = 0; b.bhv.wait = 0; c.bhv.wait = 0;
  for (let i = 0; i < 20; i++) squadRequest(s, b, b.bhv, 'melee'); // b waits longest
  squadRequest(s, a, a.bhv, 'melee');
  squadFrame(s, [a, b, c, holder], { x: 0, y: 0 }, 0, 1 / 30); s.busy.melee = s.cap.melee - 1; // one free
  assert.equal(squadRequest(s, a, a.bhv, 'melee'), false, 'a newer waiter is held back');
  assert.equal(squadRequest(s, b, b.bhv, 'melee'), true, 'the longest waiter gets it');
});

test('spacing: waiting creatures hold a ring round the Wayfarer, strafing, and keep apart', () => {
  const w = flatWorld(), P = w.player; w.player.inv = Infinity;
  const pack = Array.from({ length: 7 }, (_, i) => spawn(w, 'mirrorShade', P.x + 4 + (i % 3) * .2, P.y + (i - 3) * .3, { aggro: true }));
  let minSep = Infinity, nearest = 0, samples = 0, ringFrames = 0, inBand = 0, moved = 0; const last = new Map(pack.map((e) => [e.id, { x: e.x, y: e.y }]));
  run(w, 12, (w, t) => {
    if (t < 4) return;
    for (const e of pack) { const prev = last.get(e.id); if (!holdsToken(e) && !(e.bhv.back > 0) && dist(e, prev) > 1e-4) moved++; last.set(e.id, { x: e.x, y: e.y }); }
    const waiting = pack.filter((e) => !holdsToken(e) && !e.pack.attack);
    for (let i = 0; i < waiting.length; i++) { let n = Infinity; for (let j = 0; j < waiting.length; j++) if (j !== i) n = Math.min(n, dist(waiting[i], waiting[j])); if (n < Infinity) { minSep = Math.min(minSep, n); nearest += n; samples++; } }
    for (const e of pack) if (!holdsToken(e) && !e.pack.attack) { ringFrames++; const d = dist(e, P); if (d >= 1.8 && d <= 4.5) inBand++; }
  });
  assert.ok(minSep >= .3 && nearest / samples >= .9, `kin kept apart (closest ${minSep.toFixed(2)}, mean nearest ${(nearest / samples).toFixed(2)})`);
  assert.ok(inBand / ringFrames > .7, `waiters hold their band (${(inBand / ringFrames).toFixed(2)})`);
  assert.ok(moved > 100, 'they strafe while they wait');
});

test('varied blows: two moves, heavy and light, combos and feints for the families that have them; older creatures vary too', () => {
  const w = flatWorld(), P = w.player; w.player.inv = Infinity;
  const lynx = spawn(w, 'riftLynx', P.x + 2, P.y, { aggro: true }), shade = spawn(w, 'mirrorShade', P.x - 2, P.y, { aggro: true }), crawler = spawn(w, 'pallidCrawler', P.x, P.y + 2, { aggro: true });
  const hound = spawn(w, 'ashenHound', P.x, P.y - 2.2, { aggro: true });
  const used = {}, heavy = {}, light = {}, combos = {}, feints = {}, legacyMoves = new Set();
  run(w, 60, (w) => {
    for (const e of [lynx, shade, crawler]) {
      if (e.pack.attack) { (used[e.id] ||= new Set()).add(e.pack.attack); if (COMBO_MOVES.has(e.pack.attack) && e.pack.phase === 'windup') (e.heavy ? heavy : light)[e.id] = true; }
      if (e.pack.combo >= 2) combos[e.id] = Math.max(combos[e.id] || 0, e.pack.combo);
      if (e.feint > 0) feints[e.id] = true;
    }
    if (hound.meleePhase) legacyMoves.add(hound.meleePhase.id);
    if (hound.feint > 0) feints[hound.id] = true;
  });
  assert.ok(used[lynx.id].size >= 2, `the lynx blinks and claws (${[...used[lynx.id]]})`);
  assert.ok(used[shade.id].size >= 2, `the shade uses more than its stab (${[...used[shade.id]]})`);
  assert.ok(heavy[lynx.id] && light[lynx.id], 'heavy and light blows');
  assert.ok(combos[crawler.id] >= 2 && combos[shade.id] >= 2, `combos (${JSON.stringify(combos)})`);
  assert.ok(feints[shade.id] && (feints[lynx.id] || feints[hound.id]), `the smart ones feint (${JSON.stringify(feints)})`);
  assert.equal(feints[crawler.id], undefined, 'brood never feints');
  assert.deepEqual([...legacyMoves].sort(), ['lunge', 'zigzag'], 'an older creature uses both its moves');
});

test('readable windups: never shorter than the attack module or legacy pattern; a heavy blow is longer and leaves it open', () => {
  const w = flatWorld(), P = w.player; w.player.inv = Infinity; const e = spawn(w, 'thunderhorn', P.x + 1.6, P.y, { aggro: true, packAttacks: ['bite'] });
  let seenHeavy = 0, seenLight = 0, openLonger = 0;
  run(w, 60, () => {
    const s = e.pack; if (s.attack !== 'bite') return;
    if (s.phase === 'windup' && s.data.wind && !s.data.checked) { s.data.checked = true; assert.ok(s.data.wind >= .45 - 1e-9); if (e.heavy) { seenHeavy++; assert.ok(s.data.wind >= .45 * BEHAVIOUR.families.brute.heavy.windup - 1e-9); } else seenLight++; }
    if (s.phase === 'recover' && s.data.bRecover && e.heavy && s.t > .7) openLonger++;
  });
  assert.ok(seenHeavy > 0 && seenLight > 0, `${seenHeavy} heavy, ${seenLight} light`); assert.ok(openLonger > 0, 'the punish window');
});

test('guard: a humanoid braces against a swing in reach and blows from the front lose a share; from behind they do not', () => {
  const w = flatWorld(), P = w.player; const e = spawn(w, 'mirrorShade', P.x + 1.5, P.y, { aggro: true, packAttacks: ['longStab'] }); e.pack.gap = 9;
  frame(w); w.playerSwinging = true; let guarded = false;
  for (let i = 0; i < 900 && !guarded; i++) { w.player.x = e.x - 1.5; w.player.y = e.y; w.playerSwinging = (i % 30) < 8; frame(w); guarded = e.guard > 0; }
  assert.ok(guarded, 'it braced'); const before = e.hp; e.hp -= 10; frame(w);
  assert.ok(Math.abs(before - e.hp - 10 * (1 - BEHAVIOUR.families.humanoid.guard.reduce)) < 1e-9, `front blow reduced (${before - e.hp})`);
  // from behind: move the Wayfarer round it
  e.bhv.guard = .5; e.bhv.sx = -1; e.bhv.sy = 0; w.player.x = e.x + 1.5; const b2 = e.hp; e.hp -= 10; frame(w); assert.equal(b2 - e.hp, 10, 'from behind the guard does nothing');
});

test('dodge: the lynx sidesteps a swing in reach, untargetable only for the step', () => {
  const w = flatWorld(), P = w.player; const e = spawn(w, 'riftLynx', P.x + 1.5, P.y, { aggro: true }); e.pack.gap = 99; e.pack.cd = { blinkStrike: 99, clawSweep: 99 };
  let dodged = false, during = false; const at = { x: e.x, y: e.y };
  for (let i = 0; i < 900 && !dodged; i++) { w.playerSwinging = (i % 24) < 6; frame(w); if (e.dodge > 0) { dodged = true; during = e.untargetable; } }
  assert.ok(dodged && during); run(w, .5); assert.equal(e.untargetable, false); assert.ok(dist(e, at) > .5, 'it stepped aside');
});

test('flinch and poise: light creatures flinch on every blow, a poise break interrupts a windup, then a stagger immunity window; poise comes back', () => {
  const w = flatWorld(), P = w.player; w.player.inv = Infinity; const e = spawn(w, 'riftLynx', P.x + 1.5, P.y, { aggro: true, hp: 200, maxHp: 200 });
  frame(w); e.hp -= 2; frame(w); assert.ok(e.flinch > 0, 'a small blow flinches a light creature'); assert.ok(e.bhv.poise < 1);
  run(w, .4); assert.equal(e.flinch, 0);
  // wait for a windup, then break its poise
  for (let i = 0; i < 600 && !(e.pack.attack && e.pack.phase === 'windup'); i++) frame(w);
  assert.equal(e.pack.phase, 'windup'); e.hp -= 200 * BEHAVIOUR.families.beast.poise + 1; frame(w);
  assert.equal(e.pack.attack, null, 'interrupted'); assert.ok(e.bhv.stagger > 0 && e.bhv.immune > 0);
  const poise = e.bhv.poise; e.hp -= 30; frame(w); assert.equal(e.bhv.poise, poise, 'no poise lost in the immunity window'); assert.ok(e.bhv.stagger > 0);
  run(w, BEHAVIOUR.families.beast.stagger + BEHAVIOUR.families.beast.immune + .1); assert.equal(e.bhv.immune, 0);
  e.hp -= 10; frame(w); assert.ok(e.bhv.poise < 1); run(w, 5); assert.equal(e.bhv.poise, 1, 'it regenerates');
  // a brute shrugs off small blows
  const w2 = flatWorld(), t = spawn(w2, 'thunderhorn', w2.player.x + 3, w2.player.y, { aggro: true }); frame(w2); t.hp -= 3; frame(w2); assert.equal(t.flinch || 0, 0, 'mid creatures flinch only on heavy blows'); t.hp -= t.maxHp * .2; frame(w2); assert.ok(t.flinch > 0);
});

test('stun lock is impossible: endless blows break poise at most once per stagger and immunity window', () => {
  const w = flatWorld(), P = w.player; w.player.inv = Infinity; const e = spawn(w, 'pallidCrawler', P.x + 1.2, P.y, { aggro: true, hp: 1e6, maxHp: 1e6 }); const F = BEHAVIOUR.families.brood;
  let breaks = 0, last = 0, attacks = 0; frame(w);
  run(w, 20, () => { e.hp -= 1e6 * F.poise / 2; if (e.bhv.stagger > 0 && last <= 0) breaks++; last = e.bhv.stagger; if (e.pack.attack && e.pack.phase === 'windup') attacks++; });
  assert.ok(breaks >= 1 && breaks <= Math.ceil(20 / (F.stagger + F.immune)) + 1, `${breaks} breaks`); assert.ok(attacks > 0, 'it still attacks between');
});

test('retreat: a badly hurt coward backs off, then comes back to the fight', () => {
  const w = flatWorld(), P = w.player; w.player.inv = Infinity; const e = spawn(w, 'crystalCrab', P.x + 1.5, P.y, { aggro: true }); frame(w);
  e.hp = Math.floor(e.maxHp * .15); let regroup = false, far = 0, back = false;
  run(w, 8, () => { if (e.regroup) { regroup = true; far = Math.max(far, dist(e, P)); } else if (regroup && e.pack.attack) back = true; });
  assert.ok(regroup && far > 3, `backed off to ${far.toFixed(2)}`); assert.ok(back, 'and attacked again'); assert.equal(e.bhv.fled, true, 'once only');
});

test('legacy creatures: tokens, the ring, combos and the strike scale', () => {
  const w = flatWorld(), P = w.player; w.player.inv = Infinity;
  const pack = Array.from({ length: 6 }, (_, i) => spawn(w, 'ashling', P.x + Math.cos(i) * 3, P.y + Math.sin(i) * 3, { aggro: true }));
  let combo = 0, scales = new Set();
  run(w, 20, (w) => { const busy = busyByPool(w); assert.ok(busy.swarm <= w.squad.cap.swarm); for (const e of pack) { combo = Math.max(combo, e.comboStep || 0); if (e.telegraph > 0) scales.add(e.strikeScale); } });
  assert.ok(combo >= 2, 'a two-blow combo'); assert.ok(scales.has(BEHAVIOUR.families.brood.combo.damage) && scales.has(1));
});

test('determinism: the same fight twice is the same fight', () => {
  const once = () => { const w = flatWorld(); mixedPack(w); const r = fight(w, 'mid', { limit: 20 }); return JSON.stringify([r, w.enemies.map((e) => [e.x, e.y, e.hp, e.bhv?.n, e.pack?.seq ?? e.telegraph])]); };
  assert.equal(once(), once());
});

test('resume mid-fight: a saved creature reloads with no token, combo, feint, guard or dodge, and the board re-derives the caps', () => {
  const w = flatWorld(); mixedPack(w); w.player.inv = Infinity; run(w, 6);
  assert.ok(w.enemies.some((e) => holdsToken(e)), 'someone is attacking at the save');
  const saved = JSON.parse(JSON.stringify(w.enemies));
  const w2 = flatWorld(); Object.assign(w2.player, { x: w.player.x, y: w.player.y, inv: Infinity }); w2.now = w.now;
  w2.enemies = saved.map((e) => (e.packKind ? resetPackRuntime(e) : e));
  for (const e of saved) assert.equal('bhv' in e, false, 'the record is never saved');
  for (const e of w2.enemies) if (e.packKind) { assert.equal(holdsToken(e), false); assert.equal(e.guard || 0, 0); assert.equal(e.untargetable, false); }
  run(w2, 6, (w) => { const busy = busyByPool(w); for (const k of ['melee', 'swarm', 'ranged']) assert.ok(busy[k] <= w.squad.cap[k], `${k} ${busy[k]}`); for (const e of w.enemies) assert.ok(!(e.arrive > 0), 'nobody arrives again'); });
  assert.ok(w2.hurts.length >= 0);
});

test('the 40-creature soak: bounded tokens, effects and time per frame', () => {
  const soak = (squad) => { const w = flatWorld({ size: 60, player: { x: 30, y: 30 }, squad }); w.player.inv = Infinity; const kinds = ['pallidCrawler', 'riftLynx', 'crystalCrab', 'ashling', 'glassMite', 'veilSpinner', 'lumenWraith', 'thunderhorn'];
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = 3 + (i % 5); spawn(w, kinds[i % kinds.length], 30 + Math.cos(a) * r, 30 + Math.sin(a) * r, { aggro: true }); }
    let worst = 0; const t0 = performance.now(); let frames = 0;
    run(w, 10, (w) => { frames++; if (w.squad) { const b = busyByPool(w); for (const k of ['melee', 'swarm', 'ranged']) assert.ok(b[k] <= w.squad.cap[k]); } worst = Math.max(worst, w.effects.length); });
    return { ms: (performance.now() - t0) / frames, worst };
  };
  soak(true); soak(false); // warm up
  const before = soak(false), after = soak(true);
  assert.ok(after.worst <= PACK_EFFECT_CAP && before.worst <= PACK_EFFECT_CAP);
  assert.ok(after.ms < 4, `a frame of 40 creatures costs ${after.ms.toFixed(3)} ms (before ${before.ms.toFixed(3)} ms)`);
  assert.ok(after.ms < before.ms * 3 + .5, `within reach of the old cost (${after.ms.toFixed(3)} vs ${before.ms.toFixed(3)} ms)`);
});

test('balance: damage taken stays roughly level against a mixed pack and a swarm for early, mid and late builds', () => {
  const total = { before: 0, after: 0 };
  for (const group of ['mixed', 'swarm']) for (const build of ['early', 'mid', 'late']) for (const squad of [false, true]) {
    for (let k = 0; k < 3; k++) { const w = flatWorld({ squad }); w.player.x += k * .37; group === 'mixed' ? mixedPack(w, 1 + k * .15) : swarm(w, 12 + k * 2); const r = fight(w, build, { limit: 120 }); assert.ok(r.cleared, `${group} ${build} cleared`); total[squad ? 'after' : 'before'] += r.taken; }
  }
  const ratio = total.after / total.before;
  assert.ok(ratio > .6 && ratio < 1.6, `damage taken after/before ${ratio.toFixed(2)} (${total.after} vs ${total.before})`);
});
