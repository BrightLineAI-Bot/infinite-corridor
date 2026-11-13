// The Quandrix Staff (Tim, 2026-11-13; quandrix-staff.ts QUANDRIX, items.ts QUANDRIX_STAFF): a magic primary that scales with
// Focus. Tap: slow spectral hands that pass through foes, striking each again every `rehit` s while inside it, and dissipate on
// walls, at most `maxLive` out. Mage's Hand (a Lattice passive, staff only): hold clenches the last hand into a fist that drags
// foes toward the Wayfarer and bursts. Awakened: hold slams the last hand down (ticks, a perfect-release window, overcharge);
// with Mage's Hand it becomes a suction cup reeled home.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, characterStats, grantMilestoneGear } from '../src/game.ts';
import { createCombatant, wayfarerDamage } from '../src/combat.ts';
import { QUANDRIX_STAFF, FOURFOLD_DAGGERS, PRIMARY_PROFILES, primaryProfile, isQuandrixStaff, isFourfoldDaggers, generateItem, isValidItem, weaponScaling, scaledGearNames } from '../src/items.ts';
import { QUANDRIX, slamWindow, slamBurstShare, slamFill, staffAnchored, latestHand, liveHands, quandrixHandPresentation, drawQuandrix, drawQuandrixStaff } from '../src/quandrix-staff.ts';
import { TOOL_FORMS, TOOL_FORM_KEYS, fieldForm } from '../src/lattice-fields.ts';
import { awakenedText } from '../src/constellation.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';
import { writeCloseViewHeroGear, writeCloseViewHeroEquipment, HERO_EQUIPMENT_MAX_TRIANGLES, MODEL_FLOATS, QUANDRIX_COLOURS, modelSupported, modelTriangleCount } from '../src/close-view-models.ts';
import { CLOSE_VIEW_ACTOR_LOOK } from '../src/close-view-gl.ts';
import { closeViewHeldGear, playerFormModelKey } from '../src/close-view-player-presentation.ts';
import { closeViewPrimaryWeaponKind } from '../src/close-view.ts';

const H = QUANDRIX.hand, F = QUANDRIX.fist, S = QUANDRIX.slam, U = QUANDRIX.suction, KEY = `field:${QUANDRIX.passive}`;
const staff = (power = 15, extra = {}) => ({ id: 'primary-qs-test', name: QUANDRIX_STAFF.name, slot: 'primary', power, basePower: power, upgradeRank: 0, property: QUANDRIX_STAFF.property, tier: 'rare', affixes: [], ...extra });
const BUILDS = { might: { Might: 11, Finesse: 1, Focus: 1, Vigor: 5, Resolve: 1 }, magic: { Might: 1, Finesse: 1, Focus: 11, Vigor: 5, Resolve: 1 }, stamina: { Might: 1, Finesse: 11, Focus: 1, Vigor: 5, Resolve: 1 } };
function arena(foes = [], { primary = staff(), stats = BUILDS.magic, mageHand = false, awakened = false, blocked = [] } = {}) {
  const s = freshSave(); s.seed = 'QUANDRIX'; s.level = 15; s.stats = { ...s.stats, ...stats }; s.equipment.primary = primary;
  if (awakened) s.equipment.primary.awakened = { resonance: 'x', version: 1 };
  s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); if (mageHand) s.lattice.passives = [KEY]; // the Lattice open, as continuous-assault.test.ts
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: blocked.includes(i % 32) ? 'wall' : 'ash', blocked: blocked.includes(i % 32) })) };
  g.area = 'dungeon';
  Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([fx, fy, extra], i) => Object.assign(createCombatant('ashling', 10 + fx, 10 + fy), { id: `foe-${i}`, hp: 1e6, maxHp: 1e6, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] }, extra || {}));
  return { s, g };
}
// Drives the game: `held` is whether Attack is down at that frame (a function of the time).
function run(g, from, to, held = () => false, pin = null) {
  let t = from;
  for (; t < to; t += 20) { if (pin) pin(t); g.player.invulnerableUntil = t + 1e6; g.update(.02, { state: { x: 0, y: 0 }, consume: () => false, held: (k) => k === 'attack' && held(t) }, t); }
  return t;
}
const taken = (e) => 1e6 - e.hp;
// Holds every foe where it stands (their own AI would close in or lunge), for the tests that measure a hand passing through.
const pinned = (g) => { const at = g.enemies.map((e) => [e.x, e.y]); return () => g.enemies.forEach((e, i) => { e.x = at[i][0]; e.y = at[i][1]; }); };
const press = (g, t, action = 'attack') => { g.attackAction = action; try { return g.primaryAttack(t, { x: 1, y: 0 }); } finally { g.attackAction = null; } };

test('the staff: one data table, a magic primary scaling with Focus', () => {
  assert.equal(QUANDRIX_STAFF.name, 'Quandrix Staff'); assert.equal(QUANDRIX_STAFF.key, 'primary-quandrix-staff'); assert.equal(QUANDRIX_STAFF.loot.stream, 'quandrix-staff-loot:v1');
  const P = PRIMARY_PROFILES[QUANDRIX_STAFF.key]; assert.equal(primaryProfile(staff()), P); assert.equal(primaryProfile({ name: 'Quandrix Staff', slot: 'primary' }), P, 'by name, as loot ids are random');
  assert.ok(isQuandrixStaff(staff()) && isValidItem(staff()) && !isQuandrixStaff({ name: 'Salvage Blade' }));
  assert.ok(Math.abs(P.range - H.speed * H.life) < .01, 'the profile reach is where a hand dissipates');
  assert.equal(QUANDRIX.damageType, 'magic'); assert.equal(weaponScaling(staff()), 'magic'); assert.ok(scaledGearNames('magic').includes('Quandrix Staff'));
  assert.ok(H.speed <= 2.5, 'slow'); assert.ok(H.maxLive >= 4 && H.maxLive <= 5); assert.ok(S.perfect[0] < S.perfect[1] && S.perfect[1] < S.max);
  assert.ok(F.time >= 1.2 && F.time <= 1.6, 'the fist holds 1.2-1.6 s');
  // Focus, not Might: the matched build's bonus is +2 a rank, as every primary's own stat gives.
  const hit = (stats) => { const { g } = arena([[3, 0]], { stats }); press(g, 1000, null); run(g, 1000, 3800, undefined, pinned(g)); return { dealt: taken(g.enemies[0]), power: g.quandrixPower() }; };
  const focus = hit(BUILDS.magic), might = hit(BUILDS.might), plain = hit({ Might: 1, Finesse: 1, Focus: 1 });
  assert.equal(focus.power - might.power, 20, 'ten ranks of Focus: +20, as ten of Might give a Might weapon'); assert.equal(might.power, plain.power, 'Might adds nothing');
  assert.ok(focus.dealt > might.dealt * 1.3, `Focus ${focus.dealt} vs Might ${might.dealt}`);
  const s = freshSave(); s.stats.Focus = 21; s.equipment.primary = staff(); assert.equal(characterStats(s).weaponBonus - characterStats(s).meleeBonus, 40);
});

test('a tap: a slow hand drifts forward, passes through and strikes each foe several times, every rehit interval', () => {
  const { g } = arena([[2.5, 0], [4, 0]]), [a, b] = g.enemies, pin = pinned(g);
  assert.equal(press(g, 1000, null).length, 0); assert.equal(liveHands(g), 1);
  const h = latestHand(g), x0 = h.x; run(g, 1000, 2000, undefined, pin); assert.ok(Math.abs(h.x - x0 - H.speed) < .05, `about ${H.speed} tiles in a second (${h.x - x0})`);
  run(g, 2000, 4000, undefined, pin);
  const per = wayfarerDamage(g.quandrixPower() * H.share), hits = (e) => Math.round(taken(e) / per);
  assert.ok(hits(a) >= 3 && hits(b) >= 3, `each foe takes several blows (${hits(a)}, ${hits(b)}) from one hand`);
  // a bigger body is inside the hand longer and takes more blows
  const big = arena([[2.5, 0, { bodyRadius: .9 }]]); press(big.g, 1000, null); run(big.g, 1000, 4000, undefined, pinned(big.g));
  assert.ok(Math.round(taken(big.g.enemies[0]) / per) > hits(a), 'a big body takes more');
  // the per-foe interval: never two blows on one foe within `rehit`
  const q = arena([[2, 0]]), e = q.g.enemies[0], qp = pinned(q.g); let last = -1e9, prev = 0; press(q.g, 1000, null);
  for (let t = 1000; t < 4000; t += 20) { run(q.g, t, t + 20, undefined, qp); if (taken(e) > prev) { assert.ok(t - last >= H.rehit * 1000 - 20, `${t - last} ms apart`); last = t; prev = taken(e); } }
});

test('a hand dissipates on a wall; at most maxLive hands, the oldest giving way', () => {
  const { g } = arena([], { blocked: [13] }); press(g, 1000, null); const h = latestHand(g);
  run(g, 1000, 3000); assert.equal(h.on, false, 'gone at the wall'); assert.ok(h.x < 13, `stopped short of it (${h.x})`);
  const q = arena([]); let t = 1000; const seqs = [];
  for (let i = 0; i < 8; i++) { q.g.player.attackReadyAt = 0; press(q.g, t, null); seqs.push(latestHand(q.g).seq); run(q.g, t, t + 40); t += 40; }
  assert.equal(liveHands(q.g), H.maxLive); assert.equal(q.g.quandrix.hands.length, H.maxLive, 'a fixed pool');
  const live = q.g.quandrix.hands.filter((x) => x.on).map((x) => x.seq).sort((a, b) => a - b); assert.deepEqual(live, seqs.slice(-H.maxLive), 'the newest five');
});

test('Mage\'s Hand: hold clenches only the last hand, drags foes toward the Wayfarer and bursts when the hold runs out', () => {
  { // two hands out: the hold takes the newer; the older drifts on
    const { g } = arena([], { mageHand: true }); let t = 1000; press(g, t, null); const older = latestHand(g); t = run(g, t, t + 200);
    g.player.attackReadyAt = 0; press(g, t, null); const newer = latestHand(g); assert.notEqual(older, newer); t = run(g, t, t + 100);
    g.player.attackReadyAt = 0; press(g, t); run(g, t, t + 260, () => true);
    assert.equal(g.quandrix.hold.hand, newer); assert.equal(newer.mode, 'fist'); assert.ok(older.on && older.mode === 'drift'); assert.equal(liveHands(g), 2, 'no new hand for the hold'); }
  // a tap toward the foe (let go at once), then a held press
  const r = arena([[3.4, 0]], { mageHand: true }), e = r.g.enemies[0]; let t = 1000;
  press(r.g, t); t = run(r.g, t, t + 60, () => false); assert.equal(liveHands(r.g), 1, 'let go within the grace: a tap');
  const first = latestHand(r.g); t = run(r.g, t, t + 900); // it has reached the foe
  r.g.player.attackReadyAt = 0; press(r.g, t); const down = t; t = run(r.g, t, t + 260, () => true);
  assert.equal(r.g.quandrix.hold.mode, 'fist'); assert.equal(r.g.quandrix.hold.hand, first, 'the last cast live hand, not a new one'); assert.equal(first.mode, 'fist');
  const x0 = e.x; t = run(r.g, t, t + 700, () => true);
  assert.ok(r.g.quandrix.hold.n >= 1, 'it grabbed the foe'); assert.ok(e.x < x0 - .3, `dragged toward the Wayfarer (${x0} -> ${e.x})`);
  const before = taken(e); t = run(r.g, t, down + 200 + F.time * 1000 - 60, () => true); assert.equal(taken(e), before, 'no burst before the hold runs out');
  run(r.g, t, t + 200, () => true); assert.ok(taken(e) - before >= wayfarerDamage(r.g.quandrixPower() * F.burst.share) * .99, 'the burst at the timeout'); assert.equal(r.g.quandrix.hold.on, false);
  assert.ok(Math.hypot(e.x + .5 - (r.g.player.x + .5), e.y - r.g.player.y) < 2, 'brought in to the Wayfarer');
});

test('Mage\'s Hand: a far fist bursts where it is; letting go bursts at once; the grab cap; bosses hold their ground', () => {
  // far: the hand has drifted over four tiles; the fist cannot get home in its hold, and bursts out there
  { const { g } = arena([[4.1, 0]], { mageHand: true }), e = g.enemies[0]; let t = 1000; press(g, t); t = run(g, t, t + 40); t = run(g, t, 2600);
    g.player.attackReadyAt = 0; press(g, t); const h = latestHand(g); t = run(g, t, t + 220 + F.time * 1000 + 100, () => true);
    assert.equal(g.quandrix.hold.on, false); assert.ok(taken(e) > 0, 'the foe it held takes the burst'); const burst = g.quandrix.flashes.find((f) => f.kind === 'fist');
    assert.ok(burst && burst.x - (g.player.x + .5) > F.arrive + .3, `burst ${burst.x - (g.player.x + .5)} tiles out, short of the Wayfarer`); assert.equal(h.on, false); }
  // early release
  { const { g } = arena([[2.4, 0]], { mageHand: true }), e = g.enemies[0]; let t = 1000; press(g, t); t = run(g, t, t + 40); t = run(g, t, t + 300);
    g.player.attackReadyAt = 0; press(g, t); t = run(g, t, t + 240, () => true); assert.equal(g.quandrix.hold.mode, 'fist'); const before = taken(e);
    run(g, t, t + 40, () => false); assert.equal(g.quandrix.hold.on, false, 'let go: it bursts at once'); assert.ok(taken(e) > before); }
  // the grab cap
  { const foes = Array.from({ length: 7 }, (_, i) => [2.4 + (i % 2) * .15, -.45 + i * .15]); const { g } = arena(foes, { mageHand: true }); let t = 1000; press(g, t); t = run(g, t, t + 40); t = run(g, t, t + 500);
    g.player.attackReadyAt = 0; press(g, t); t = run(g, t, t + 700, () => true); assert.equal(g.quandrix.hold.n, F.maxGrab, `${g.quandrix.hold.n} held`); }
  // bosses, world beasts and elites hold their ground, but take the burst
  { const { g } = arena([[2.4, 0, { boss: true }], [2.4, .5, { worldBeast: true }], [2.4, -.5, { eliteId: 'x' }]], { mageHand: true }); const at = g.enemies.map((e) => e.x); let t = 1000; press(g, t); t = run(g, t, t + 40); t = run(g, t, t + 400);
    g.player.attackReadyAt = 0; press(g, t); t = run(g, t, t + 220 + F.time * 1000 + 100, () => true);
    assert.equal(g.quandrix.hold.on, false); g.enemies.forEach((e, i) => { assert.ok(Math.abs(e.x - at[i]) < 1e-3, `${e.id} not dragged`); assert.ok(taken(e) > 0); });
    assert.ok(staffAnchored({ boss: true }) && staffAnchored({ worldBeast: true }) && staffAnchored({ eliteId: 'e' }) && !staffAnchored({ kind: 'ashling' })); }
});

test('awakened: the hand slams down and strikes under it every tick while held; perfect release beats an overcharge, which beats nothing', () => {
  assert.equal(slamWindow(S.perfect[0] - .01), 'early'); assert.equal(slamWindow((S.perfect[0] + S.perfect[1]) / 2), 'perfect'); assert.equal(slamWindow(S.perfect[1] + .05), 'late'); assert.equal(slamWindow(S.max), 'overcharge');
  assert.ok(slamBurstShare(S.perfect[0]) > slamBurstShare(S.max) && slamBurstShare(S.max) > slamBurstShare(S.perfect[0] - .05), 'perfect > overcharge > early');
  assert.ok(slamBurstShare(S.perfect[1] + .1) < slamBurstShare(S.perfect[0])); assert.equal(slamFill(S.max * 2), 1);
  const slam = (holdMs) => { const { g } = arena([[2.3, 0]], { awakened: true }), e = g.enemies[0]; let t = 1000; press(g, t); t = run(g, t, t + 40); t = run(g, t, t + 300);
    g.player.attackReadyAt = 0; press(g, t); const start = t + 200; t = run(g, t, start + 20, () => true); const h = g.quandrix.hold.hand, hx = h.x;
    const ticks0 = taken(e); t = run(g, t, start + Math.min(holdMs, 900), () => true); assert.ok(taken(e) > ticks0, 'ticking while held'); assert.equal(h.x, hx, 'it stays where it slammed');
    t = run(g, t, start + holdMs, () => true); const beforeRelease = taken(e); run(g, t, t + 60, () => false); return { g, total: taken(e), burst: taken(e) - beforeRelease, h }; };
  const perfect = slam(1150), early = slam(500), over = slam(S.max * 1000 + 300);
  assert.ok(perfect.burst > early.burst * 1.5, `perfect ${perfect.burst} vs early ${early.burst}`);
  assert.equal(over.g.quandrix.hold.on, false, 'overcharged: it went off by itself'); assert.ok(over.g.quandrix.flashes.some((f) => f.kind === 'overcharge'));
  const perfectBurst = wayfarerDamage(perfect.g.quandrixPower() * S.burst.perfect), overBurst = wayfarerDamage(over.g.quandrixPower() * S.burst.overcharge);
  assert.ok(perfectBurst > overBurst); assert.ok(perfect.g.quandrix.flashes.some((f) => f.kind === 'perfect')); assert.equal(perfect.g.message, QUANDRIX.messages.perfect);
  assert.match(awakenedText(staff(15, { awakened: { resonance: 'x' } })), /slam/);
});

test('awakened with Mage\'s Hand: a suction cup pulls foes in while it is reeled home, then bursts; bosses are not pulled', () => {
  const { g } = arena([[2.6, 0], [2.6, 1.6], [4.2, -.8], [2.6, -1.6, { boss: true }]], { awakened: true, mageHand: true }), [a, b, c, boss] = g.enemies, bx = boss.x;
  let t = 1000; press(g, t); t = run(g, t, t + 40); t = run(g, t, t + 450);
  g.player.attackReadyAt = 0; press(g, t); t = run(g, t, t + 240, () => true);
  assert.equal(g.quandrix.hold.mode, 'suction'); const h = g.quandrix.hold.hand, h0 = h.x;
  t = run(g, t, t + 900, () => true);
  assert.ok(h.x < h0 - .5, `reeled toward the Wayfarer (${h0} -> ${h.x})`);
  for (const e of [b, c]) assert.ok(Math.hypot(e.x + .5 - h.x, e.y + .45 - h.y) < 1.2, `${e.id} pulled into the hand`);
  assert.ok(Math.abs(boss.x - bx) < 1e-3, 'the boss is not pulled');
  const before = taken(a); run(g, t, t + 60, () => false); assert.equal(g.quandrix.hold.on, false); assert.ok(taken(a) > before, 'then it bursts');
});

test('Mage\'s Hand is a staff-only passive; a plain staff simply casts', () => {
  assert.ok(TOOL_FORMS[QUANDRIX.passive] && TOOL_FORM_KEYS.includes(KEY)); assert.equal(fieldForm(KEY).name, "Mage's Hand"); assert.match(fieldForm(KEY).text, /Quandrix Staff/);
  // with the Salvage Blade the passive does nothing: a held press is an ordinary swing, no hands
  const blade = { id: 'salvage-blade', name: 'Salvage Blade', slot: 'primary', power: 15, basePower: 15, upgradeRank: 0, property: 'steady' };
  const { g } = arena([[.9, 0]], { primary: blade, mageHand: true }); assert.equal(g.quandrixMageHand(), false);
  const hits = press(g, 1000); run(g, 1000, 2000, () => true); assert.ok(hits.length >= 1, 'it swung'); assert.equal(g.quandrix, undefined);
  // the staff without the passive or the awakening: a held press is a hand at once and never a fist
  const p = arena([[3, 0]]); press(p.g, 1000); assert.equal(liveHands(p.g), 1, 'cast on the press'); run(p.g, 1000, 2500, () => true); assert.equal(p.g.quandrix.hold.on, false);
  const m = arena([[3, 0]], { mageHand: true }); assert.equal(m.g.quandrixMageHand(), true);
});

test('loot: the staff has its own stream; every other roll is unchanged', () => {
  const prior = QUANDRIX_STAFF.loot.share; let primaries = 0, staffs = 0, changed = 0, daggersBefore = 0, daggersAfter = 0;
  for (let i = 0; i < 3000; i++) {
    const seed = `QS-LOOT-${i}`, now = generateItem(seed, 14); let old;
    try { QUANDRIX_STAFF.loot.share = 0; old = generateItem(seed, 14); } finally { QUANDRIX_STAFF.loot.share = prior; }
    if (isFourfoldDaggers(old)) daggersBefore++; if (isFourfoldDaggers(now)) daggersAfter++;
    if (now.slot === 'primary') primaries++;
    if (isQuandrixStaff(now)) { staffs++; changed++; assert.ok(isValidItem(now)); assert.equal(now.property, QUANDRIX_STAFF.property);
      assert.ok(['Cinder Pike', 'Verge Cleaver'].includes(old.name), `only an ITEM_TABLE weapon becomes the staff (${old.name})`);
      for (const k of ['id', 'slot', 'power', 'tier']) assert.deepEqual(now[k], old[k], k); assert.deepEqual(now.affixes, old.affixes); }
    else assert.deepEqual(now, old, 'everything else is byte-identical');
  }
  assert.equal(daggersAfter, daggersBefore, 'the daggers keep their rolls');
  assert.ok(staffs > primaries * .06 && staffs < primaries * .16, `${staffs} of ${primaries} generated weapons`);
});

test('milestone: the staff at level 16, once', () => {
  const s = freshSave(); s.level = QUANDRIX_STAFF.milestone.level - 1; grantMilestoneGear(s); assert.ok(!s.inventory.some(isQuandrixStaff));
  s.level = QUANDRIX_STAFF.milestone.level; grantMilestoneGear(s); const got = s.inventory.find(isQuandrixStaff);
  assert.ok(got && isValidItem(got)); assert.equal(got.power, QUANDRIX_STAFF.milestone.power); assert.ok(QUANDRIX_STAFF.milestone.level > FOURFOLD_DAGGERS.milestone.level);
  grantMilestoneGear(s); assert.equal(s.inventory.filter(isQuandrixStaff).length, 1);
});

function roundTrip(g, now) {
  const { main, puts } = splitSnapshot(snapshotSave(g.exportSnapshot(now)));
  const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts))));
  assert.equal(v.health, 'healthy', v.error); return v.save;
}
test('saves: the staff is an ordinary item; a reload mid-hold resolves safely with no hand, no hold and no burst', () => {
  const s = freshSave(); s.equipment.primary = staff(12, { awakened: { resonance: 'x', version: 1 }, extra: 'kept' });
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.version, 14); assert.ok(isQuandrixStaff(back.equipment.primary)); assert.equal(back.equipment.primary.extra, 'kept');
  assert.equal(primaryProfile(back.equipment.primary), PRIMARY_PROFILES[QUANDRIX_STAFF.key]);
  // a real journey (the starting ground), a foe beside the Wayfarer, the fist holding it
  const j = freshSave(); j.seed = 'QS-RESUME'; j.level = 15; j.equipment.primary = staff(); j.perception.aperture = 3255; j.farArray = { listeners: 1 }; ensureLattice(j); j.lattice.passives = [KEY];
  const g = new Game(j, 0); g.player.invulnerableUntil = 1e15; j.lastAim = { x: 1, y: 0 };
  const e = Object.assign(createCombatant('ashling', g.player.x + 1.3, g.player.y), { id: 'qs-held', hp: 1e6, maxHp: 1e6 }); g.enemies = [e];
  let t = 1000; press(g, t); t = run(g, t, t + 40); t = run(g, t, t + 200);
  g.player.attackReadyAt = 0; press(g, t); t = run(g, t, t + 500, () => true); assert.ok(g.quandrix.hold.on, 'holding');
  const saved = roundTrip(g, t); assert.ok(!JSON.stringify(saved).includes('"quandrix"'), 'nothing of the hold is saved');
  const h = new Game(saved, 50000); assert.equal(h.quandrix, undefined); assert.ok(h.quandrixEquipped());
  const foe = h.enemies.find((q) => q.id === e.id); if (foe) { assert.ok(Number.isFinite(foe.x) && Number.isFinite(foe.y)); }
  h.update(.02, { state: { x: 0, y: 0 }, consume: () => false, held: () => true }, 50020); assert.ok(!h.quandrix || !h.quandrix.hold.on, 'no hold resumes');
  // pause: everything runs on frame time, so a paused game holds still
  g.setPaused(true, t); const x = g.quandrix.hold.hand.x, held = g.quandrix.hold.held; g.setPaused(false, t + 5000);
  assert.equal(g.quandrix.hold.hand.x, x); assert.equal(g.quandrix.hold.held, held);
});

test('sixty seconds of every mode with the cooldown wiped each frame: no NaN, every pool bounded', () => {
  for (const [mageHand, awakened] of [[false, false], [true, false], [false, true], [true, true]]) {
    const foes = Array.from({ length: 10 }, (_, i) => [1.5 + (i % 5) * .9, -1.5 + Math.floor(i / 5) * 3, i === 0 ? { boss: true } : {}]);
    const { g } = arena(foes, { mageHand, awakened, blocked: [17] }); let t = 1000, k = 0;
    for (; t < 61000; t += 20, k++) {
      g.player.attackReadyAt = 0; if (k % 3 === 0) press(g, t, k % 97 < 60 ? 'attack' : null);
      for (const e of g.enemies) if (e.dead || e.hp < 1e5) { e.dead = false; e.hp = 1e6; }
      g.player.invulnerableUntil = t + 1e6; g.update(.02, { state: { x: 0, y: 0 }, consume: () => false, held: (q) => q === 'attack' && (k % 97) < 60 }, t);
      const K = g.quandrix;
      if (K) { assert.equal(K.hands.length, H.maxLive); assert.equal(K.flashes.length, QUANDRIX.flash.max); assert.ok(K.hold.n <= Math.max(F.maxGrab, U.maxPull));
        for (const h of K.hands) { if (!h.on) continue; assert.ok([h.x, h.y, h.age, h.power].every(Number.isFinite)); assert.ok(Object.keys(h.hits).length <= g.enemies.length); } }
      for (const e of g.enemies) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.hp), `${e.id} finite`);
    }
    assert.ok(g.projectiles.length < 8 && g.effects.length < 16, 'nothing piles up in the shared lists');
    assert.ok(g.enemies.reduce((n, e) => n + taken(e), 0) >= 0);
  }
});

test('Close View: the staff in the left hand within the hero budget, lit crystal; the hands are lit 3D models', () => {
  const socket = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const out = new Float32Array(256 * 3 * MODEL_FLOATS), n = writeCloseViewHeroGear(out, 0, { profile: 'quandrix-staff', rightSocket: socket, leftSocket: socket }), tris = n / MODEL_FLOATS / 3;
  assert.ok(tris >= 60 && tris <= 96, `${tris} triangles: within the largest held gear (96)`); assert.ok(out.slice(0, n).every(Number.isFinite));
  const frame = { powerSuit: true, suitVertexCount: 124 * 3, suitPositionsNormals: new Float32Array(124 * 3 * 6) }, all = new Float32Array((tris + 124) * 3 * MODEL_FLOATS);
  assert.ok(tris + 124 <= HERO_EQUIPMENT_MAX_TRIANGLES); assert.equal(writeCloseViewHeroEquipment(all, 0, { profile: 'quandrix-staff', rightSocket: socket, leftSocket: socket }, frame), all.length, 'fits beside the power suit');
  assert.ok(CLOSE_VIEW_ACTOR_LOOK.emissive.includes(QUANDRIX_COLOURS.crystal) && CLOSE_VIEW_ACTOR_LOOK.emissive.includes(QUANDRIX_COLOURS.core), 'existing lit colours');
  assert.equal(QUANDRIX.colors.emissive, QUANDRIX_COLOURS.crystal);
  assert.deepEqual(closeViewHeldGear('quandrix-staff'), { hand: 'left', scale: 1, grip: 'one' }, 'a primary: in the primary hand');
  assert.equal(closeViewPrimaryWeaponKind(staff()), 'quandrix-staff'); assert.equal(playerFormModelKey({ kind: 'playerIronFists' }, 'quandrix-staff'), playerFormModelKey({ kind: 'playerIronFists' }, 'salvage-blade'));
  for (const kind of ['quandrixHand', 'quandrixFist', 'quandrixSlam']) { assert.ok(modelSupported(kind), kind); const m = modelTriangleCount(kind); assert.ok(m > 20 && m <= 128, `${kind} ${m} triangles`); }
  const h = { on: true, mode: 'drift', x: 3, y: 4, dx: 1, dy: 0, age: .2, life: 2 };
  assert.equal(quandrixHandPresentation(h).kind, 'quandrixHand'); assert.equal(quandrixHandPresentation({ ...h, mode: 'fist' }).kind, 'quandrixFist'); assert.equal(quandrixHandPresentation({ ...h, mode: 'slam' }).kind, 'quandrixSlam');
  assert.equal(quandrixHandPresentation({ ...h, on: false }), null);
});

test('drawing: the standard view and a capture draw without allocation surprises, in reduced motion too', () => {
  const calls = { arc: 0, captured: 0 }, noop = () => {};
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (k === 'arc' ? () => calls.arc++ : noop), set: (o, k, v) => { o[k] = v; return true; } });
  for (const [mageHand, awakened, reduce] of [[false, false, false], [true, false, false], [false, true, true], [true, true, false]]) {
    const { g } = arena([[2.4, 0]], { mageHand, awakened }); g.presentation = { reduceMotion: reduce }; let t = 1000; press(g, t); t = run(g, t, t + 40); t = run(g, t, t + 300);
    g.player.attackReadyAt = 0; press(g, t); t = run(g, t, t + 600, () => true);
    drawQuandrix(ctx, g, (q) => [q.x * 40, q.y * 40], 40, 1);
    drawQuandrix(ctx, g, (q) => [q.x * 40, q.y * 40], 40, 1, { captureActor: (spec) => { calls.captured++; assert.ok(spec.sample()?.kind?.startsWith('quandrix')); spec.draw(ctx, 40); return true; } });
  }
  drawQuandrixStaff(ctx, 100, 100, 40, 'left', false); drawQuandrixStaff(ctx, 100, 100, 40, 'right', true, { x: 0, y: -1 });
  assert.ok(calls.arc > 10 && calls.captured >= 4);
});
