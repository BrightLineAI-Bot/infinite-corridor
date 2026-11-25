// Tim, 2026-11-25 (Android, Close View): "I had locked onto [the Stalker] and the shots weren't firing at him. It was
// intermittent throughout. Hit attack and the Quandrix Staff would launch it just at the bottom of the screen. Then hit tool,
// and it would still launch at the bottom of the screen. Then hit the Quandrix Staff again and it would start tracking."
// Reproduced with the real Game: while the locked Stalker lurks, veils, casts its mirage or turns untargetable (its tide, the
// mist), the lock gave no direction, so the staff and the tool fell back to the stick (pulled back: toward the camera, the
// bottom of the screen); and a tap that missed a button (aimAt) beat the lock for the staff, and the primary wrapper restored
// that tap after the staff had used it, so the next tool shot went there too. AIM_RESOLVE: the lock always wins, a hiding
// lock aims where it was last seen, a lock Close View lets go of for hiding keeps that spot a moment, and a tap is used once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, AIM_RESOLVE } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { QUANDRIX_STAFF } from '../src/items.ts';
import { latestHand } from '../src/quandrix-staff.ts';
import { snapshotSave } from '../src/persistence.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import * as CV from '../src/close-view.ts';

const staff = () => ({ id: 'qs-aim', name: QUANDRIX_STAFF.name, slot: 'primary', power: 15, basePower: 15, upgradeRank: 0, property: QUANDRIX_STAFF.property, tier: 'rare', affixes: [] });
// An open floor (the open world for the Stalker, which hunts only there); the Wayfarer at (16, 20) facing up the screen, the foe six tiles north of her.
function arena({ stalker = false, foeAt = [16, 14] } = {}) {
  const s: any = freshSave(); s.seed = 'AIM-RESOLVE'; s.level = 20; s.equipment.primary = staff(); s.perception.aperture = 80;
  const g: any = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = stalker ? 'overworld' : 'dungeon'; g.rx = 9; g.ry = 7; Object.assign(g.player, { x: 16, y: 20, facing: 'up', invulnerableUntil: 1e15 }); s.lastAim = { x: 0, y: -1 };
  const base = stalker ? g.spawnStalker({ x: foeAt[0], y: foeAt[1] }, false, 0) : createCombatant('ashling', foeAt[0], foeAt[1]);
  assert.ok(base, 'the foe stands');
  const e = Object.assign(base, { id: stalker ? base.id : 'plain-foe', hp: 1e6, maxHp: 1e6, damage: 0, x: foeAt[0], y: foeAt[1] });
  g.enemies = [e];
  return { s, g, e };
}
const input = (keys: string[] = [], sx = 0, sy = 0) => { const k = new Set(keys); return { state: { x: sx, y: sy }, consume: (a: string) => k.delete(a), held: () => false }; };
const toward = (g: any, x: number, y: number) => { const dx = x + .5 - (g.player.x + .5), dy = y + .45 - (g.player.y + .45), m = Math.hypot(dx, dy); return { x: dx / m, y: dy / m }; };
const near = (d: any, want: any, what: string) => { assert.ok(d, `${what}: fired`); assert.ok(d.x * want.x + d.y * want.y > .99, `${what}: ${JSON.stringify(d)} vs ${JSON.stringify(want)}`); };
const hand = (g: any) => { const h = latestHand(g); return h && { x: h.dx, y: h.dy }; };
const shot = (g: any) => { const p = g.projectiles.filter((q: any) => !q.hostile).at(-1); return p && { x: p.dx, y: p.dy }; };
// Holds the foe where it stands (and in a state) through the Game's own frames.
function step(g: any, e: any, t: number, keys: string[] = [], sx = 0, sy = 0, hold: any = null) {
  const at = { x: e.x, y: e.y }; if (hold) Object.assign(e, hold);
  g.update(.02, input(keys, sx, sy), t); e.x = at.x; e.y = at.y; if (hold) Object.assign(e, hold);
}

test('the first shot after a lock goes at the target: the staff, then the tool, with the stick pulled back', () => {
  for (const stalker of [false, true]) {
    const { g, e } = arena({ stalker }); let t = 1000;
    step(g, e, t, [], 0, 1); t += 20; // walking back toward the camera: the stick (and lastAim) points down the screen
    assert.ok(g.save.lastAim.y > .9, 'the stick aims back');
    g.lockTarget(e.id); // and the very next press, before any frame has followed the lock
    step(g, e, t, ['attack'], 0, 1); t += 20; near(hand(g), toward(g, e.x, e.y), `${e.kind}: the staff's first hand`);
    t += 1200; step(g, e, t, ['tool'], 0, 1); near(shot(g), toward(g, e.x, e.y), `${e.kind}: the tool's first shot`);
  }
});

test('the first shot at an obvious auto-aim target (no lock) goes at it, whatever the stale aim says', () => {
  const { s, g, e } = arena({ foeAt: [16, 16] }); let t = 1000; s.lastAim = { x: 0, y: 1 }; // the save's default: down the screen
  step(g, e, t, ['attack']); t += 20; near(hand(g), toward(g, e.x, e.y), 'the staff');
  t += 1200; s.lastAim = { x: 0, y: 1 }; step(g, e, t, ['tool']); near(shot(g), toward(g, e.x, e.y), 'the tool');
});

test('a locked Stalker that lurks, veils, casts its mirage or turns untargetable is still aimed at, where it was last seen', () => {
  const states: Record<string, any> = {
    lurk: { hidden: true, untargetable: true, stalkHide: 1 },
    veil: { hidden: true },
    mirage: { hidden: true },
    tide: { untargetable: true },
    mist: { untargetable: true, stalkForm: 'mist' },
  };
  for (const [name, flags] of Object.entries(states)) {
    const { g, e } = arena({ stalker: true }); let t = 1000; g.lockTarget(e.id);
    step(g, e, t); t += 20; const seen = { x: e.x, y: e.y };
    // it slips away while hidden: the aim stays on the spot it vanished from, not on where it went, nor down the stick
    const hold = { ...flags, x: e.x + 3, y: e.y - 1 }; Object.assign(e, hold);
    step(g, e, t, [], 0, 1, hold); t += 20;
    assert.equal(g.lockedTarget()?.id, e.id, `${name}: the lock holds`);
    near(g.save.lastAim, toward(g, seen.x, seen.y), `${name}: the aim follows the last seen spot`);
    step(g, e, t, ['attack'], 0, 1, hold); t += 20; near(hand(g), toward(g, seen.x, seen.y), `${name}: the staff`);
    t += 1200; step(g, e, t, ['tool'], 0, 1, hold); near(shot(g), toward(g, seen.x, seen.y), `${name}: the tool`);
    // it shows itself again: straight back onto it
    for (const k of Object.keys(flags)) if (k !== 'stalkForm') e[k] = k === 'stalkHide' ? 0 : false;
    t += 1200; step(g, e, t, ['attack'], 0, 1); near(hand(g), toward(g, e.x, e.y), `${name}: revealed, the staff tracks it`);
  }
});

test('the Stalker\'s decoys never draw a locked shot; a lock on a decoy that fades moves on', () => {
  const { g, e } = arena({ stalker: true }); let t = 1000; g.lockTarget(e.id);
  const decoy = Object.assign(createCombatant('ashenHound', 16, 21.5), { id: 'decoy-1', stalkerDecoy: true, stalkerOf: e.id, hp: 1, maxHp: 1, damage: 0 });
  g.enemies.push(decoy); step(g, e, t, [], 0, 1); t += 20; decoy.x = 16; decoy.y = 21.5;
  step(g, e, t, ['attack'], 0, 1); t += 20; near(hand(g), toward(g, e.x, e.y), 'locked on the Stalker, the decoy at her back is ignored');
  g.lockTarget(decoy.id); decoy.dead = true; t += 1200; step(g, e, t, ['tool'], 0, 0);
  assert.equal(g.lockedTarget(), null, 'a faded decoy leaves no lock');
  near(shot(g), toward(g, e.x, e.y), 'and the next shot finds the Stalker by auto aim');
});

test('a tap that missed a button never beats the lock, and is never carried over to the next tool shot', () => {
  const { s, g, e } = arena(); let t = 1000; g.lockTarget(e.id); step(g, e, t); t += 20;
  // a thumb just off Attack: a world tap at the bottom of the screen (main.ts worldtap: aimAt, then the press toward it)
  g.aimAt(16.5, 23.4); s.aimMode = 'attack'; g.primaryAttack(t, { x: 0, y: 3 });
  near(hand(g), toward(g, e.x, e.y), 'the staff stays on the lock');
  assert.equal(s.pendingAim, null, 'the tap is spent'); t += 1200;
  step(g, e, t, ['tool']); near(shot(g), toward(g, e.x, e.y), 'the tool stays on the lock');
  // no lock: the tap aims the staff once; the next tool shot takes auto aim, not the old tap
  const b = arena(); t = 1000; step(b.g, b.e, t); t += 20;
  b.g.aimAt(20.5, 20.45); b.s.aimMode = 'attack'; b.g.primaryAttack(t, { x: 4, y: 0 });
  near(hand(b.g), { x: 1, y: 0 }, 'the tap aims the staff');
  assert.equal(b.s.pendingAim, null, 'and is used up by it (the swing wrapper no longer restores it)');
  t += 1200; step(b.g, b.e, t, ['tool']); near(shot(b.g), toward(b.g, b.e.x, b.e.y), 'the next tool shot goes at the foe');
  // a tap whose reticle has faded is dropped, not fired at
  const c = arena({ foeAt: [12, 20] }); t = 1000; c.g.aimAt(16.5, 25); step(c.g, c.e, t); t += 20;
  for (let i = 0; i < 80; i++) { step(c.g, c.e, t); t += 20; } assert.ok(!(c.g.reticle.life > 0), 'the reticle is gone');
  step(c.g, c.e, t, ['tool']); near(shot(c.g), toward(c.g, c.e.x, c.e.y), 'a stale tap is ignored');
  assert.equal(snapshotSave(c.s).pendingAim ?? null, null, 'nor saved');
});

test('Close View lets go of a hiding lock: its last seen spot stays the aim for AIM_RESOLVE.memoryMs; a lock let go on purpose does not', () => {
  const { s, g, e } = arena({ stalker: true }); let t = 1000; g.lockTarget(e.id); step(g, e, t); t += 20; const seen = { x: e.x, y: e.y };
  const hold = { hidden: true, untargetable: true, x: e.x + 4, y: e.y }; Object.assign(e, hold);
  g.lockTarget(null, { keepSeen: true }); // what close-view.ts lockKeep does the frame the foe hides
  step(g, e, t, ['attack'], 0, 1, hold); t += 20; near(hand(g), toward(g, seen.x, seen.y), 'the staff, just after');
  t += 1200; step(g, e, t, ['tool'], 0, 1, hold); near(shot(g), toward(g, seen.x, seen.y), 'the tool, still within the memory');
  t += AIM_RESOLVE.memoryMs; step(g, e, t, ['tool'], 0, 1, hold); near(shot(g), { x: 0, y: 1 }, 'past it: the stick again');
  const b = arena({ stalker: true }); t = 1000; b.g.lockTarget(b.e.id); step(b.g, b.e, t); t += 20; b.g.lockTarget(null);
  const h2 = { hidden: true, untargetable: true }; step(b.g, b.e, t, ['attack'], 0, 1, h2); near(hand(b.g), { x: 0, y: 1 }, 'released on purpose: no memory');
  void s;
});

test('in the real Close View: a locked foe that hides is let go, and the next shot still goes where it was', () => {
  const ctx: any = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
  CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ctx }));
  try {
    const g: any = createLabFixture({ lab: 'close-view', scenario: 'heart', now: 1000 }).game; g.enemies = []; g.save.equipment.primary = staff();
    let best = { x: g.player.x, y: g.player.y, r: -1 };
    for (const q of g.map.tiles) if (!q.blocked) { let r = 0; outer: for (; r < 5; r++) for (let y = q.y - r; y <= q.y + r; y++) for (let x = q.x - r; x <= q.x + r; x++) if (CV.closeViewWallAt(g.map, x + .5, y + .5)) break outer; if (r > best.r) best = { x: q.x, y: q.y, r }; }
    Object.assign(g.player, { x: best.x, y: best.y, invulnerableUntil: 1e15 }); CV.resetCloseViewCamera();
    const e = Object.assign(createCombatant('ashling', best.x + 2, best.y), { id: 'cv-foe', hp: 1e6, maxHp: 1e6, damage: 0 }); g.enemies.push(e);
    let now = 300000; const frame = (keys: string[] = [], sx = 0) => { now += 16; const at = { x: e.x, y: e.y }; g.update(.016, input(keys, sx, 0), now); e.x = at.x; e.y = at.y; CV.closeViewFrame(ctx, g, 390, 844, now, () => {}); };
    g.lockTarget(e.id); for (let i = 0; i < 10; i++) frame(); const seen = { x: e.x, y: e.y };
    e.hidden = true; e.x += 1; frame([], -1); assert.equal(g.lockedTarget(), null, 'Close View let go of the hiding foe at once (as before)');
    frame(['attack'], -1); near(hand(g), toward(g, seen.x, seen.y), 'backing away from it, the staff still goes where it was seen, not back along the stick');
  } finally { CV.resetCloseViewCamera(); CV.setCloseViewCanvasFactory(null); }
});

test('a pause keeps the last seen spot (its clock shifts); death or another place forgets it', () => {
  const { g, e } = arena({ stalker: true }); let t = 1000; g.lockTarget(e.id); step(g, e, t); t += 20; const seen = { x: e.x, y: e.y };
  const hold = { hidden: true, untargetable: true, x: e.x + 4, y: e.y }; Object.assign(e, hold); g.lockTarget(null, { keepSeen: true });
  g.setPaused(true, t); t += 10000; g.setPaused(false, t); // ten seconds in the pause menu
  step(g, e, t, ['attack'], 0, 1, hold); t += 20; near(hand(g), toward(g, seen.x, seen.y), 'resumed: still the spot it vanished from');
  const b = arena({ stalker: true }); t = 1000; b.g.lockTarget(b.e.id); step(b.g, b.e, t); t += 20; b.g.lockTarget(null, { keepSeen: true });
  b.g.map = { ...b.g.map }; assert.equal(b.g.lockSeenDirection(), null, 'another map: nothing remembered');
  const c = arena({ stalker: true }); t = 1000; c.g.lockTarget(c.e.id); step(c.g, c.e, t); t += 20; c.g.lockTarget(null, { keepSeen: true });
  c.g.player.hp = 0; assert.equal(c.g.lockSeenDirection(), null, 'fallen: nothing remembered');
  assert.ok(Object.keys(AIM_RESOLVE).length === 1 && AIM_RESOLVE.memoryMs > 0, 'one data table');
});
