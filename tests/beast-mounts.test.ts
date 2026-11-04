// Beast mounts (Tim, 2026-11-04): a pen that holds catches the beast; the Wayfarer keeps three in a stable and rides them.
// Tim's decisions the same day: a catch pays nothing (the only reward is riding it), and the Questing Beast, the Psychic
// Crystal, the Void Walker and the Lightning Giant can never be penned or caught.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MOUNT_BEASTS, MOUNT_IDS, MOUNT_NEVER, MOUNT_RIDE, ensureMounts, stableMount, catchRefusal } from '../src/beast-mounts.ts';
import { BUILD, placeBuild, enclosureAt, ENCLOSURE, PEN_COST } from '../src/building.ts';
import { WORLD_BEASTS } from '../src/world-beasts.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, JUMP } from '../src/game.ts';

const W = 32;
function flat(g) { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) Object.assign(g.map.tiles[y * W + x], { kind: 'grass', blocked: false, structure: null, buildingId: null, perch: false, door: null, slope: null, elev: 0, environment: null, encSides: undefined, enclosure: undefined, landscape: undefined, chasm: undefined, skyPlatform: undefined }); g.map.objects = []; }
function game(seed = 'MOUNTS') {
  const s = freshSave(); s.seed = seed; s.materials = { ...s.materials, wood: 400, stone: 400, cinderIron: 400 };
  const g = new Game(s, 0); g.rx = 4; g.ry = 3; g.loadArea('overworld', false); flat(g);
  g.enemies = []; g.builds = []; g.player.x = 10; g.player.y = 6; g.player.facing = 'down'; return g;
}
const n0 = (id) => MOUNT_BEASTS[id]?.pen || 2;
// A beast of `id` standing in a pen of side n (built for it), the pen open to the north.
function penned(g, id, hpShare = .1) {
  let e;
  if (id === 'stalker') { e = g.spawnStalker({ x: 10.5, y: 8 }, true, 0); Object.assign(e, { stalkForm: 'cat', stalkAct: { kind: 'prowl', t: 1, total: 1 }, stalkLurk: null, hidden: false, untargetable: false }); }
  else { g.save.worldBeasts[id].active = { rx: g.rx, ry: g.ry, tries: 0 }; e = g.createEnemyFromSpawn({ id: `world-beast:${id}:${g.save.worldBeasts[id].cycle}`, kind: WORLD_BEASTS[id].kind, x: 10.5, y: 8, boss: true, worldBeast: id, traits: [] }, 'overworld'); }
  Object.assign(e, { retreating: false, fleeTo: null, untargetable: false, aloft: false, hidden: false }); e.hp = Math.max(1, Math.round(e.maxHp * hpShare));
  g.enemies = [e]; g.player.x = 10; g.player.y = 6; g.player.facing = 'down';
  const r = placeBuild(g, 10, 7, 'enclosure'); assert.ok(r.ok, r.message); const pen = g.builds[g.builds.length - 1], n = pen.size;
  e.x = pen.x + n / 2 - .5; e.y = pen.y + n / 2 - .75; assert.equal(enclosureAt(g, e.x + .5, e.y + .75), pen, `${id} stands in the pen`);
  return { e, pen, n };
}
// Closes the pen (a second one across its opening). A slip breaks both pieces (Tim: the materials are lost), so each new try builds
// the enclosure round the beast again, then its closing piece, until it holds or `tries` run out. Returns { message, slips }.
function close(g, pen, tries = 40) {
  let last = '', slips = 0; const e = g.enemies.find((q) => !q.dead);
  for (let i = 0; i < tries; i++) {
    if (!g.builds.includes(pen)) { g.player.x = 10; g.player.y = 6; g.player.facing = 'down'; const r0 = placeBuild(g, 10, 7, 'enclosure'); assert.ok(r0.ok, r0.message); pen = g.builds[g.builds.length - 1]; e.x = pen.x + pen.size / 2 - .5; e.y = pen.y + pen.size / 2 - .75; }
    g.player.x = 10; g.player.y = pen.y - pen.size - 2; g.player.facing = 'down';
    const r = placeBuild(g, 10, pen.y - pen.size, 'enclosure'); assert.ok(r.ok, r.message); last = r.message;
    if (!/slips out/.test(r.message)) return { message: r.message, slips };
    slips++; assert.match(r.message, /pen breaks, and the materials in both pieces are lost/); assert.equal(g.builds.length, 0, 'both pieces are broken');
  }
  return { message: last, slips };
}
const rewardState = (s) => JSON.stringify({ currency: s.currency, xp: s.xp, level: s.level, spheres: [s.materials.weaponSphere, s.materials.armorSphere, s.materials.lumenDust], consumables: s.consumables, echoes: s.echoes?.owned, glyphs: s.glyphs, flags: Object.keys(s.worldFlags || {}).filter((k) => k.startsWith('drop:')), slain: Object.fromEntries(Object.entries(s.worldBeasts).map(([k, v]) => [k, [v.slain, !!v.spoils]])), kills: s.stalker?.kills });

test('every catchable beast is caught in a pen sized for it, its hunt ends, and nothing is paid', () => {
  assert.deepEqual([...MOUNT_IDS].sort(), ['ashenMoth', 'astralWorm', 'briarStag', 'crimsonTyrant', 'doomChaser', 'morphingBlob', 'mountainTurtle', 'stalker', 'tremorWorm']);
  for (const id of MOUNT_IDS) {
    const g = game(`MOUNTS-${id}`), { pen, n } = penned(g, id);
    assert.equal(n, n0(id), `${id}: the pen is ${n0(id)}×${n0(id)}`);
    const before = rewardState(g.save), cyc = id === 'stalker' ? null : g.save.worldBeasts[id].cycle;
    const { message: msg } = close(g, pen); assert.match(msg, /caught/, `${id}: ${msg}`);
    assert.equal(g.save.mounts.stable.length, 1); assert.equal(g.save.mounts.stable[0].beast, id);
    assert.ok(!g.enemies.some((q) => q.worldBeast === id || q.stalker), 'it is gone from the field');
    if (id === 'stalker') { assert.equal(g.save.stalker.active, null); assert.ok(g.save.stalker.quiet > 0, 'it rests before it hunts again'); }
    else { const q = g.save.worldBeasts[id]; assert.equal(q.active, null); assert.equal(q.cycle, cyc + 1); assert.equal(q.cooldown, WORLD_BEASTS[id].cooldownSlain); }
    assert.equal(rewardState(g.save), before, `${id}: no marks, materials, spoils, XP or reward flags`);
    assert.equal(g.defeatNotice?.title, 'CAUGHT');
  }
});

test('the Questing Beast, the Psychic Crystal, the Void Walker, the Lightning Giant and the Nanobot Knight can never be penned or caught', () => {
  assert.deepEqual(MOUNT_NEVER, ['questingBeast', 'psychicCrystal', 'voidWalker', 'lightningGiant', 'nanobotKnight']);
  for (const id of ['psychicCrystal', 'voidWalker', 'lightningGiant', 'nanobotKnight']) {
    assert.equal(MOUNT_BEASTS[id], undefined);
    const g = game(`NEVER-${id}`); g.save.worldBeasts[id].active = { rx: g.rx, ry: g.ry, tries: 0 };
    const e = g.createEnemyFromSpawn({ id: `world-beast:${id}:0`, kind: WORLD_BEASTS[id].kind, x: 10.5, y: 8, boss: true, worldBeast: id, traits: [] }, 'overworld');
    Object.assign(e, { untargetable: false, retreating: false }); e.hp = 1; g.enemies = [e];
    placeBuild(g, 10, 7, 'enclosure'); const pen = g.builds[0]; assert.equal(pen.size, 2, 'no pen is sized for it'); e.x = pen.x + .5; e.y = pen.y + .25;
    const before = rewardState(g.save), wood = g.save.materials.wood, { message: msg } = close(g, pen, 3);
    assert.match(msg, /cannot be penned.*materials returned/, `${id}: ${msg}`); assert.equal(g.save.materials.wood, wood, 'no try: the closing piece is refunded'); assert.deepEqual(g.builds, [pen], 'and taken down; the first pen stands'); assert.ok(!e.dead, 'still free'); assert.equal(ensureMounts(g.save).stable.length, 0);
    assert.ok(g.save.worldBeasts[id].active, 'its hunt goes on'); assert.equal(rewardState(g.save), before);
  }
  assert.match(catchRefusal({ questingBeast: true, id: 'qb', hp: 1, maxHp: 10 }, { size: 4 }), /Questing Beast cannot be penned/);
});

test('a pen too small for the beast does not hold it; big pens cost more', () => {
  const g = game('SMALL'); g.player.x = 10; g.player.y = 6;
  placeBuild(g, 10, 7, 'enclosure'); const pen = g.builds[0]; assert.equal(pen.size, ENCLOSURE.size, 'built with no beast near: 2×2');
  g.save.worldBeasts.mountainTurtle.active = { rx: g.rx, ry: g.ry, tries: 0 };
  const e = g.createEnemyFromSpawn({ id: 'world-beast:mountainTurtle:0', kind: 'mountainTurtle', x: pen.x + .5, y: pen.y + .25, boss: true, worldBeast: 'mountainTurtle', traits: [] }, 'overworld'); e.hp = 1; g.enemies = [e];
  // Closed on it (with a closing piece that is itself only 2x2), the try is refused as too small, and both come down, refunded.
  const wood = g.save.materials.wood; g.penSize = () => 2; g.player.x = 10; g.player.y = 3; const r = placeBuild(g, 10, 5, 'enclosure'); delete g.penSize;
  assert.match(r.message, /Too small: .*too big for this pen: it takes one 4×4.*Both pens come down, their materials returned/); assert.equal(g.builds.length, 0, 'cleanly dismantled');
  assert.equal(g.save.materials.wood, wood + BUILD.kinds.enclosure.cost.wood, 'both pieces refunded'); assert.ok(!e.dead && g.save.worldBeasts.mountainTurtle.active);
  // Built again near it, the pen is sized for it, and costs its PEN_COST row.
  assert.equal(g.penSize(), 4, 'built near the Turtle, a pen is 4×4');
  assert.ok(PEN_COST[3].wood > PEN_COST[2].wood && PEN_COST[4].wood > PEN_COST[3].wood && PEN_COST[2].wood === BUILD.kinds.enclosure.cost.wood, 'cost grows with the pen');
  const before = { ...g.save.materials }; g.player.x = 20; g.player.y = 6; assert.ok(placeBuild(g, 20, 7, 'enclosure').ok);
  assert.equal(g.builds[g.builds.length - 1].size, 4); for (const [k, n] of Object.entries(PEN_COST[4])) assert.equal(before[k] - g.save.materials[k], n, k);
  const poor = game('POOR'); poor.enemies = [e]; poor.save.materials = { ...poor.save.materials, wood: 4, stone: 99, cinderIron: 99 }; e.x = 12; e.y = 12;
  assert.match(placeBuild(poor, 10, 7, 'enclosure').message, /A 4×4 enclosure \(sized for the beast near\) takes 5 wood, 5 stone, 4 cinder iron/, 'the cost is shown');
});

test('the stable keeps three: a fourth catch lets the oldest go, with a clear message', () => {
  const s = freshSave(); const a = stableMount(s, 'briarStag').mount, b = stableMount(s, 'stalker').mount, c = stableMount(s, 'ashenMoth').mount;
  assert.equal(s.mounts.stable.length, 3); const r = stableMount(s, 'doomChaser');
  assert.equal(r.released.id, a.id, 'the oldest goes'); assert.deepEqual(s.mounts.stable.map((m) => m.id), [b.id, c.id, r.mount.id]);
  const g = game('CAP'); for (const id of ['briarStag', 'stalker', 'ashenMoth']) stableMount(g.save, id);
  const { pen } = penned(g, 'morphingBlob'); const { message: msg } = close(g, pen); assert.match(msg, /caught/); assert.match(msg, /stable holds 3: the Briar Stag, the oldest, is let go/);
  assert.deepEqual(g.save.mounts.stable.map((m) => m.beast), ['stalker', 'ashenMoth', 'morphingBlob']);
  assert.equal(MOUNT_RIDE.cap, 3);
});

test('a beast that slips out breaks the pen: the materials of both pieces are lost, and both are built again to try again', () => {
  let seen = 0;
  for (const id of ['briarStag', 'stalker', 'crimsonTyrant']) {
    const g = game(`SLIP-${id}`), { pen } = penned(g, id, 1), n = pen.size, cost = n > 2 ? PEN_COST[n] : BUILD.kinds.enclosure.cost; // at full health it mostly slips
    for (let i = 0; i < 12; i++) {
      if (!g.builds.length) { g.player.x = 10; g.player.y = 6; assert.ok(placeBuild(g, 10, 7, 'enclosure').ok); const p0 = g.builds[0], e = g.enemies[0]; e.x = p0.x + n / 2 - .5; e.y = p0.y + n / 2 - .75; }
      const p0 = g.builds[0], before = { ...g.save.materials }; g.player.x = 10; g.player.y = p0.y - n - 2;
      const r = placeBuild(g, 10, p0.y - n, 'enclosure'); assert.ok(r.ok, r.message);
      if (/caught/.test(r.message)) break;
      assert.match(r.message, /slips out before the pen can close on it\. The pen breaks, and the materials in both pieces are lost/); seen++;
      assert.equal(g.builds.length, 0, 'both pieces break'); for (const [k, c] of Object.entries(cost)) assert.equal(before[k] - g.save.materials[k], c, 'the closing piece is not refunded');
      assert.ok(!g.enemies[0].dead && g.enemies[0].hp === g.enemies[0].maxHp, 'it is still free');
    }
  }
  assert.ok(seen >= 3, `slips were seen (${seen})`);
});

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
test('summon and dismount: Act with nothing near calls the mount beside you, and again gets you down; it never fights', () => {
  const g = game('RIDE'); assert.match(g.interact().message, /Nothing nearby responds/, 'an empty stable: Act is as before');
  const { mount } = stableMount(g.save, 'briarStag');
  const r = g.interact(); assert.ok(r.ok, r.message); assert.match(r.message, /Briar Stag answers your call/); assert.equal(g.save.mounts.riding, mount.id); assert.equal(g.mountRide().id, mount.id);
  assert.equal(g.enemies.length, 0, 'no creature is added: it is only drawn under you'); assert.deepEqual(mount.seen, ['4,3'], 'the section it was called in counts');
  const d = g.interact(); assert.match(d.message, /climb down/); assert.equal(g.save.mounts.riding, null); assert.equal(g.save.mounts.stable.length, 1, 'it waits in the stable');
  assert.match(g.summonMount(mount.id).message, /answers/); g.save.mech = { ...(g.save.mech || {}), active: true, mode: 'robot', built: true };
  g.update(.05, idle, 1000); assert.equal(g.save.mounts.riding, null, 'the robot comes up: you get down first'); g.save.mech.active = false;
  assert.match(g.summonMount(mount.id).message, /answers/); g.loadArea('dungeon', false); assert.equal(g.save.mounts.riding, null, 'not inside a dungeon'); assert.match(g.summonMount(mount.id).message, /cannot be ridden in here/);
});

function walk(g, frames, x = 1, jumpAt = -1, t0 = 1000) { let t = t0; for (let i = 0; i < frames; i++) { t += 50; g.update(.05, { state: { x, y: 0 }, consume: (k) => k === 'jump' && i === jumpAt, held: () => false }, t); } return t; }
test('mounted: faster on foot, dodges unchanged, and a jump that clears a chasm the Wayfarer alone falls into', () => {
  const foot = game('SPEED'); foot.player.x = 4; foot.player.y = 12; walk(foot, 20); const d0 = foot.player.x - 4;
  const ride = game('SPEED'); stableMount(ride.save, 'briarStag'); ride.player.x = 4; ride.player.y = 12; ride.summonMount(); walk(ride, 20); const d1 = ride.player.x - 4;
  assert.ok(d1 / d0 > MOUNT_BEASTS.briarStag.speed * .95 && d1 / d0 < MOUNT_BEASTS.briarStag.speed * 1.05, `the Stag carries you ${MOUNT_BEASTS.briarStag.speed}× as fast (${d0.toFixed(2)} → ${d1.toFixed(2)})`);
  // Dodges are unchanged: one dodging frame carries the rider as far as the Wayfarer on foot.
  const dodgeStep = (g) => { const x0 = g.player.x; g.update(.05, { state: { x: 1, y: 0 }, consume: (k) => k === 'dodge', held: () => false }, 5000); return g.player.x - x0; };
  const df = game('DODGE'); df.player.x = 4; df.player.y = 12; const dm = game('DODGE'); stableMount(dm.save, 'briarStag'); dm.player.x = 4; dm.player.y = 12; dm.summonMount();
  const sf = dodgeStep(df), sm = dodgeStep(dm); assert.ok(sf > 0 && Math.abs(sf - sm) < 1e-9, `dodge ${sf} on foot, ${sm} mounted`);
  // A two-tile canyon across the field.
  const gap = (g) => { for (let y = 0; y < 32; y++) for (const x of [13, 14]) Object.assign(g.map.tiles[y * W + x], { kind: 'canyon' }); g.player.x = 12.2; g.player.y = 12; };
  const a = game('GAP'); gap(a); walk(a, 30, 1, 0); assert.equal(a.save.worldFlags.deaths, 1, 'on foot, the jump falls short into the canyon'); assert.match(a.message, /Lost to the canyon/);
  const b = game('GAP'); stableMount(b.save, 'briarStag'); b.summonMount(); gap(b); walk(b, 30, 1, 0);
  assert.ok(!b.save.worldFlags.deaths && b.rx === 4 && b.player.x > 14.5, `mounted, the leap clears it (x ${b.player.x.toFixed(2)})`); assert.ok(b.jumpDur >= JUMP.base * MOUNT_BEASTS.briarStag.jump - 1, 'the jump lasts longer');
  // Where it lands is checked: a leap that comes down in the canyon still falls.
  const c = game('GAP'); stableMount(c.save, 'briarStag'); c.summonMount(); for (let y = 0; y < 32; y++) for (let x = 13; x < 22; x++) Object.assign(c.map.tiles[y * W + x], { kind: 'canyon' }); c.player.x = 12.2; c.player.y = 12; walk(c, 40, 1, 0);
  assert.equal(c.save.worldFlags.deaths, 1, 'landing in the canyon is a fall'); assert.equal(c.save.mounts.riding, null, 'death gets you down'); assert.equal(c.save.mounts.stable.length, 1, 'the mount stays stabled');
});

test('a mount is spent by riding time or by different sections ridden, whichever comes first', () => {
  const g = game('LIFE'); const { mount } = stableMount(g.save, 'ashenMoth'); g.summonMount(); g.player.x = 16; g.player.y = 16;
  mount.left = 1; g.update(.05, idle, 1000); assert.ok(g.save.mounts.riding);
  for (let i = 0, t = 1050; i < 30; i++, t += 50) g.update(.05, idle, t);
  assert.equal(g.save.mounts.stable.length, 0, 'out of time: gone from the stable'); assert.equal(g.save.mounts.riding, null); assert.match(g.message, /carried you as far as it will in time/);
  const h = game('LIFE2'); const m2 = stableMount(h.save, 'stalker').mount; h.summonMount();
  for (let i = 1; i < MOUNT_RIDE.sections - 1; i++) { h.rx = 4 + i; h.loadArea('overworld', false); }
  assert.equal(m2.seen.length, MOUNT_RIDE.sections - 1); assert.ok(h.save.mounts.riding, 'still riding');
  h.rx = 4; h.loadArea('overworld', false); assert.equal(m2.seen.length, MOUNT_RIDE.sections - 1, 'a section ridden before does not count again');
  h.rx = 200; h.loadArea('overworld', false); assert.equal(h.save.mounts.stable.length, 0, `the ${MOUNT_RIDE.sections}th different section spends it`); assert.match(h.message, /across the land/);
  assert.ok(MOUNT_RIDE.seconds >= 600 && MOUNT_RIDE.seconds <= 900 && MOUNT_RIDE.sections >= 30 && MOUNT_RIDE.sections <= 40);
});

test('save and reload mid-ride: riding, time and sections left and the stable resume exactly; paused time does not count', () => {
  const g = game('RESUME'); stableMount(g.save, 'crimsonTyrant'); stableMount(g.save, 'briarStag'); g.summonMount(g.save.mounts.stable[0].id); g.player.x = 16.25; g.player.y = 15.5;
  let t = 1000; for (let i = 0; i < 40; i++) { t += 50; g.update(.05, idle, t); }
  const before = JSON.parse(JSON.stringify(g.save.mounts)); assert.ok(Math.abs(before.stable[0].left - (MOUNT_RIDE.seconds - 2)) < 1e-6);
  g.setPaused(true, t); for (let i = 0; i < 20; i++) g.update(.05, idle, t + i * 50); assert.deepEqual(JSON.parse(JSON.stringify(g.save.mounts)), before, 'paused: nothing runs down');
  const back = new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(t)))), 9000);
  assert.deepEqual(JSON.parse(JSON.stringify(back.save.mounts)), before); assert.equal(back.mountRide()?.beast, 'crimsonTyrant', 'still in the saddle');
  assert.equal(back.player.x, 16.25); assert.equal(back.player.y, 15.5);
  // Normalising keeps unknown fields and drops what cannot be a mount.
  const s = freshSave(); s.mounts = { stable: [{ id: 'm1', beast: 'briarStag', left: 100, seen: ['1,1', '1,1'], note: 'kept' }, { id: 'm2', beast: 'voidWalker', left: 5 }, null], riding: 'm2', extra: 1 };
  const m = ensureMounts(s); assert.equal(m.stable.length, 1); assert.deepEqual(m.stable[0].seen, ['1,1']); assert.equal(m.stable[0].note, 'kept'); assert.equal(m.riding, null); assert.equal(m.extra, 1);
  assert.deepEqual(ensureMounts(freshSave()).stable, []);
});

test('death gets you down; the mount stays stabled with its time; a heavy blow throws you off', () => {
  const g = game('DEATH'); const { mount } = stableMount(g.save, 'morphingBlob'); g.summonMount(); mount.left = 300;
  g.player.hp = 0; g.update(.05, idle, 1000); assert.equal(g.save.mounts.riding, null); assert.equal(mountLeft(g), 300); assert.equal(g.mountRide(), null);
  const h = game('THROWN'); stableMount(h.save, 'morphingBlob'); h.summonMount(); h.player.hp = h.save.maxHp; h.update(.05, idle, 1000);
  h.player.hp = Math.round(h.save.maxHp * .5); h.update(.05, idle, 1050); assert.equal(h.save.mounts.riding, null, 'half its health in one blow throws you off'); assert.match(h.message, /throws you from/); assert.equal(h.save.mounts.stable.length, 1);
});
const mountLeft = (g) => g.save.mounts.stable[0].left;

test('a whole 4×4 try (both pieces) costs 10 wood, 10 stone, 8 cinder iron; a 3×3 lies between; the 2×2 is unchanged', () => {
  const both = (n) => Object.fromEntries(Object.entries(PEN_COST[n]).map(([k, v]) => [k, v * 2]));
  assert.deepEqual(both(4), { wood: 10, stone: 10, cinderIron: 8 }); assert.deepEqual(PEN_COST[3], { wood: 4, stone: 4, cinderIron: 3 }); assert.deepEqual(PEN_COST[2], BUILD.kinds.enclosure.cost);
});

test('mounted, hits land on the rider where drawn; the ground under the mount still counts at its feet', () => {
  const blast = (g, dy) => { const p = g.player; g.effects = [{ id: 'fx', hostile: true, x: p.x + .5, y: p.y + .52 + dy, radius: .4, damage: 20, life: 1 }]; const hp = p.hp; g.update(.05, idle, 2000 + Math.random()); return hp - p.hp; };
  const lift = MOUNT_BEASTS.mountainTurtle.seat;
  const on = game('RIDER'); stableMount(on.save, 'mountainTurtle'); on.summonMount(); on.player.x = 16; on.player.y = 16;
  assert.ok(blast(on, -lift) > 0, 'a blast where the rider is drawn hits'); on.player.invulnerableUntil = 0;
  assert.equal(on.player.y, 16, 'the Wayfarer is back at the feet after the frame'); assert.equal(on.player.riderShift || 0, 0);
  const on2 = game('RIDER'); stableMount(on2.save, 'mountainTurtle'); on2.summonMount(); on2.player.x = 16; on2.player.y = 16;
  assert.equal(blast(on2, 0), 0, 'a blast at the mount\'s feet misses the rider');
  const off = game('RIDER'); off.player.x = 16; off.player.y = 16; assert.ok(blast(off, 0) > 0, 'on foot, the feet are where you are'); assert.equal(blast(game('RIDER'), -lift), 0);
  // Ground: lethal ground under the rider's drawn place is nothing; under the mount's feet it is a fall.
  const g = game('RIDER-GROUND'); stableMount(g.save, 'mountainTurtle'); g.summonMount(); g.player.x = 16; g.player.y = 16;
  for (let x = 0; x < 32; x++) for (const y of [13, 14]) Object.assign(g.map.tiles[y * W + x], { kind: 'canyon' });
  for (let i = 0; i < 10; i++) g.update(.05, idle, 3000 + i * 50); assert.ok(!g.save.worldFlags.deaths, 'canyon under the drawn rider is not underfoot');
  for (let x = 0; x < 32; x++) Object.assign(g.map.tiles[16 * W + x], { kind: 'canyon' }); g.update(.05, idle, 4000); assert.equal(g.save.worldFlags.deaths, 1, 'canyon under the feet is');
  // A knock while mounted moves the mount's feet through the collision mover, against the ground they stand on.
  const k = game('RIDER-KNOCK'); stableMount(k.save, 'mountainTurtle'); k.summonMount(); k.player.x = 16; k.player.y = 16;
  for (let x = 0; x < 32; x++) Object.assign(k.map.tiles[17 * W + x], { blocked: true }); k.riderUp(); assert.ok(k.player.y < 16);
  k.stalkerWorld(.05, 5000).displace(0, 1.5); k.riderDown(); assert.ok(k.player.y < 16.2, `the wall under the feet stops the knock (y ${k.player.y.toFixed(2)})`);
});

test('mounted, ground pools meet the mount\'s feet; blasts meet the rider where drawn', () => {
  const lift = MOUNT_BEASTS.mountainTurtle.seat;
  const hit = (fx, at) => { const g = game('POOLS'); stableMount(g.save, 'mountainTurtle'); g.summonMount(); g.player.x = 16; g.player.y = 16; g.player.invulnerableUntil = 0;
    g.packEffects = [{ ...fx, x: 16, y: 16 + at }]; const hp = g.player.hp; g.update(.05, idle, 2000); assert.equal(g.player.y, 16); return hp - g.player.hp; };
  const lava = { kind: 'lava', owner: 'none', vx: 0, vy: 0, radius: .6, grow: .6, arming: 0, life: 5, total: 5, damage: 20 };
  const tar = { kind: 'darkPool', owner: 'none', radius: .6, arming: 0, life: 5, total: 5, damage: 20 };
  const meteor = { kind: 'dragonMeteor', owner: 'none', radius: .6, arming: 0, life: .4, total: .4, damage: 20, pool: 0 };
  assert.ok(hit(lava, 0) > 0, 'lava under the mount\'s feet burns'); assert.equal(hit(lava, -lift), 0, 'lava where the rider is drawn is only ground below them');
  assert.ok(hit(tar, 0) > 0, 'a dark pool at the feet burns'); assert.equal(hit(tar, -lift), 0);
  assert.ok(hit(meteor, -lift) > 0, 'a fireball bursting on the rider strikes'); assert.equal(hit(meteor, 0), 0, 'one bursting at the feet misses the rider');
  // On foot, both meet the Wayfarer where they stand.
  const foot = (fx) => { const g = game('POOLS'); g.player.x = 16; g.player.y = 16; g.packEffects = [{ ...fx, x: 16, y: 16 }]; const hp = g.player.hp; g.update(.05, idle, 2000); return hp - g.player.hp; };
  assert.ok(foot(lava) > 0 && foot(meteor) > 0);
});
