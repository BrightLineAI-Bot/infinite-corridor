// Release 737 (Tim, 2026-11-04): the haunts' puffs and howls lay stacking curses ("one that you can't shoot, one that you can't
// attack, one that you can't jump, another one you can't dodge... can't use tools... can't use spells... can't use
// items/potions", and one that chunks maximum health for a while, like the Stalker's mist). Up to four at once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HAUNT, curseDef, rollCurses, layCurse, curseBlocking, expireCurses, cursesOut, cursesIn } from '../src/haunts.ts';
import { ATTACK_MODULES, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { healthCeiling } from '../src/water-traversal.ts';
import { Game } from '../src/game.ts';

const ACTIONS = ['shoot', 'attack', 'jump', 'dodge', 'tools', 'spells', 'items'];
const game = (now = 0) => { const s = freshSave(); s.seed = 'CURSE737'; return new Game(s, now); };
const curse = (g, id, now, seconds = 30) => { const c = layCurse((g.player.curses ||= []), id, now); c.curse.until = now + seconds * 1000; return c.curse; };
const press = (...names) => { const want = new Set(names); return { state: { x: 0, y: 0 }, consume: (a) => want.delete(a), held: () => false }; };
const blocker = (action) => HAUNT.curses.find((c) => c.blocks === action);

test('the curse table: an id, a short label, a duration and a weight each; one per action, and the frailty', () => {
  const ids = new Set();
  for (const c of HAUNT.curses) { assert.ok(c.id && !ids.has(c.id)); ids.add(c.id); assert.ok(c.label.length <= 10 && c.label === c.label.toUpperCase(), c.label); assert.ok(c.duration > 0 && c.weight > 0 && c.text); }
  for (const a of ACTIONS) assert.equal(HAUNT.curses.filter((c) => c.blocks === a).length, 1, a);
  assert.ok(curseDef('frail').maxHp > 0 && curseDef('frail').maxHp < .5 && !curseDef('frail').blocks);
  assert.equal(HAUNT.curse.cap, 4); assert.equal(HAUNT.curse.lay.wisp, 1); assert.equal(HAUNT.curse.lay.gorge, 2);
  // hashed per haunt and per hit: the same each time, distinct within one hit, and every curse turns up
  assert.deepEqual(rollCurses('w1:3', 2), rollCurses('w1:3', 2)); const seen = new Set();
  for (let i = 0; i < 400; i++) { const r = rollCurses(`w${i}:1`, 2); assert.equal(new Set(r).size, 2); r.forEach((id) => seen.add(id)); }
  assert.equal(seen.size, HAUNT.curses.length);
});

test('each curse blocks exactly its own action, and walking always works', () => {
  for (const def of HAUNT.curses) {
    const g = game(); curse(g, def.id, 0);
    for (const a of ACTIONS) assert.equal(!!curseBlocking(g.player.curses, a, 1000), def.blocks === a, `${def.id} vs ${a}`);
  }
  // at the entry points: refused under the curse (with its message), answered without
  const t = 1000;
  { const g = game(); curse(g, 'noAttack', 0); assert.deepEqual(g.primaryAttack(t), []); assert.equal(g.player.attackReadyAt || 0, 0); assert.equal(g.message, curseDef('noAttack').text);
    assert.ok(g.fireSecondary(t, { x: 1, y: 0 }), 'shooting still works'); }
  { const g = game(); g.primaryAttack(t); assert.ok(g.player.attackReadyAt > t, 'uncursed, the swing lands'); }
  { const g = game(); curse(g, 'noShoot', 0); assert.equal(g.fireSecondary(t, { x: 1, y: 0 }), false); assert.equal(g.message, curseDef('noShoot').text); assert.equal(g.projectiles.length, 0);
    assert.ok(g.primaryAttack(t + 600).length >= 0 && g.player.attackReadyAt > t, 'swinging still works'); }
  { const g = game(); curse(g, 'noSpells', 0); assert.equal(g.castSpell('ember-ring'), false); assert.equal(g.message, curseDef('noSpells').text); assert.equal(g.activateApertureSkill('aerial-step'), false);
    assert.ok(g.fireSecondary(t, { x: 1, y: 0 })); }
  { const g = game(); assert.ok(g.castSpell('ember-ring'), 'uncursed, the spell answers'); }
  { const g = game(); g.player.hp = 10; const n = g.save.consumables.restorativeDraught; curse(g, 'noItems', 0); assert.equal(g.useConsumable('restorativeDraught', t), false); assert.equal(g.drinkPotion(t), false);
    assert.equal(g.save.consumables.restorativeDraught, n); assert.equal(g.player.hp, 10); assert.equal(g.message, curseDef('noItems').text); assert.ok(g.castSpell('ember-ring'), 'spells still work'); }
  { const g = game(); curse(g, 'noTools', 0); assert.equal(g.pressBuild(false), false); assert.equal(g.message, curseDef('noTools').text); assert.equal(g.brawlerTool('hammerfall', t), false);
    assert.equal(g.buildAt(g.player.x + 1, g.player.y).ok, false); assert.ok(g.fireSecondary(t, { x: 1, y: 0 }), 'the secondary weapon still shoots'); }
  { const g = game(); g.rx = 0; g.ry = 0; g.loadArea('overworld'); g.enemies = []; curse(g, 'noDodge', 0); const p = g.player;
    g.update(1 / 30, press('dodge'), t); assert.ok(!(p.dodgeUntil > t), 'no dodge'); assert.equal(g.message, curseDef('noDodge').text);
    g.update(1 / 30, press('jump'), t + 40); assert.ok(g.jumpUntil > t, 'a jump still goes'); }
  { const g = game(); g.rx = 0; g.ry = 0; g.loadArea('overworld'); g.enemies = []; curse(g, 'noJump', 0); const p = g.player;
    g.update(1 / 30, press('jump'), t); assert.ok(!(g.jumpUntil > t), 'no jump'); assert.equal(g.message, curseDef('noJump').text);
    g.update(1 / 30, press('dodge'), t + 40); assert.ok(p.dodgeUntil > t, 'a dodge still goes'); }
  { const g = game(); g.rx = 0; g.ry = 0; g.loadArea('overworld'); g.enemies = []; ['noShoot', 'noAttack', 'noJump', 'noDodge'].forEach((id) => curse(g, id, 0)); const p = g.player, x0 = p.x;
    const walk = { state: { x: 1, y: 0 }, consume: () => false, held: () => false }; for (let i = 0; i < 15; i++) g.update(1 / 30, walk, t + i * 33); assert.ok(p.x > x0, 'walking works under every curse'); }
});

test('stacking: up to four; laying one already on you extends it (to a cap); a fifth replaces the oldest', () => {
  const list = [], ids = ['noShoot', 'noAttack', 'noJump', 'noDodge', 'noTools'];
  ids.slice(0, 4).forEach((id, i) => layCurse(list, id, i * 100)); assert.equal(list.length, 4);
  const d = curseDef('noShoot').duration * 1000, again = layCurse(list, 'noShoot', 1000);
  assert.equal(again.fresh, false); assert.equal(list.length, 4); assert.equal(list[0].until, 2 * d, 'extended by its duration');
  layCurse(list, 'noShoot', 1000); assert.equal(list[0].until, 1000 + d * HAUNT.curse.extendCap, 'but never past extendCap durations');
  const fifth = layCurse(list, 'noTools', 2000); assert.equal(fifth.dropped.id, 'noShoot', 'the oldest made room'); assert.equal(list.length, 4); assert.deepEqual(list.map((c) => c.id).sort(), ['noAttack', 'noDodge', 'noJump', 'noTools']);
  assert.deepEqual(expireCurses(list, 1e9).length, 4); assert.equal(list.length, 0);
  // through the game: a gorge's howl lays two, distinct, and they wear off
  const g = game(), src = { id: 'gorge-1' }, laid = g.layHauntCurses(src, 2, 1000); assert.equal(laid.length, 2); assert.notEqual(laid[0].id, laid[1].id); assert.equal(src.hauntHits, 1);
  for (let i = 0; i < 6; i++) g.layHauntCurses(src, 2, 2000 + i); assert.ok(g.player.curses.length <= HAUNT.curse.cap);
  g.curseTick(1e9); assert.equal(g.player.curses.length, 0);
  // a dodge slips it
  const h = game(); h.player.dodgeUntil = 5000; assert.equal(h.layHauntCurses(src, 1, 4000).length, 0);
});

const frailSource = () => { for (let i = 0; ; i++) if (rollCurses(`f${i}:1`, 1)[0] === 'frail') return { id: `f${i}` }; };

test('FRAIL holds back maximum health the Stalker\'s way, and gives it back when it wears off or is replaced', () => {
  const g = game(), max = g.save.maxHp, take = Math.round(max * curseDef('frail').maxHp);
  const [c] = g.layHauntCurses(frailSource(), 1, 1000); assert.equal(c.id, 'frail'); assert.equal(g.save.rot, take); assert.equal(c.rot, take);
  assert.equal(healthCeiling(g.save), max - take); assert.ok(g.player.hp <= max - take);
  g.layHauntCurses({ id: 'x' }, 0, 1500); layCurse(g.player.curses, 'frail', 2000); assert.equal(g.save.rot, take, 'a refresh takes no more');
  g.curseTick(1000 + curseDef('frail').duration * 1000 * HAUNT.curse.extendCap + 1); assert.equal(g.save.rot, 0, 'worn off: whole again'); assert.equal(healthCeiling(g.save), max);
  // it never kills: on top of heavy rot it takes at most what leaves one point
  const k = game(); k.save.rot = k.save.maxHp - 2; k.layHauntCurses(frailSource(), 1, 1000); assert.ok(k.save.rot <= k.save.maxHp - 1); assert.ok(k.player.hp > 0);
  // replaced as the oldest of five: given back
  const r = game(); r.layHauntCurses(frailSource(), 1, 100); ['noShoot', 'noAttack', 'noJump'].forEach((id, i) => { const q = layCurse(r.player.curses, id, 200 + i); assert.equal(q.dropped, null); });
  const q = layCurse(r.player.curses, 'noTools', 500); assert.equal(q.dropped.id, 'frail'); r.curseRelease(q.dropped); assert.equal(r.save.rot, 0);
  // the mire's rot and a rest: resting clears all rot, and the curse then gives nothing back twice
  const m = game(); m.layHauntCurses(frailSource(), 1, 100); m.save.rot = 0; m.curseRested(); m.save.rot = 5; m.curseTick(1e9); assert.equal(m.save.rot, 5, 'rot laid since the rest is untouched');
});

test('death clears every curse (and the health comes back); a reload keeps them; a pause does not burn them', () => {
  const g = game(); g.layHauntCurses(frailSource(), 1, 1000); curse(g, 'noDodge', 1000, 8); g.player.confusedUntil = 4000; assert.ok(g.save.rot > 0);
  g.player.hp = 0; g.recoverFromDeath(2000); assert.equal(g.player.curses.length, 0); assert.equal(g.save.rot, 0); assert.equal(g.player.confusedUntil, 0); assert.equal(g.player.hp, g.save.maxHp);
  // reload: what each has left survives the save, and the held-back health with it
  const a = game(); a.layHauntCurses(frailSource(), 1, 1000); curse(a, 'noSpells', 1000, 6); a.player.confusedUntil = 3000; const rot = a.save.rot;
  const saved = migrateSave(JSON.parse(JSON.stringify(a.exportSnapshot(2000))));
  assert.equal(saved.session.playerRuntime.curses.length, 2); assert.equal(saved.session.playerRuntime.confused, 1000);
  const b = new Game(saved, 50000); assert.equal(b.save.rot, rot); assert.deepEqual(b.player.curses.map((c) => [c.id, c.until - 50000]), [['frail', curseDef('frail').duration * 1000 - 1000], ['noSpells', 5000]]);
  assert.equal(b.player.confusedUntil, 51000); assert.ok(curseBlocking(b.player.curses, 'spells', 54000)); assert.ok(!curseBlocking(b.player.curses, 'spells', 55001));
  b.curseTick(50000 + curseDef('frail').duration * 1000); assert.equal(b.save.rot, 0, 'and given back after the reload');
  // pause: a minute paused costs nothing
  const p = game(); curse(p, 'noJump', 1000, 5); p.player.confusedUntil = 4000; p.setPaused(true, 2000); p.setPaused(false, 62000);
  assert.equal(p.player.curses[0].until, 66000); assert.equal(p.player.confusedUntil, 64000); p.curseTick(63000); assert.equal(p.player.curses.length, 1);
  // saved while paused: measured from the pause
  const s = game(); curse(s, 'noJump', 1000, 5); s.setPaused(true, 2000); assert.equal(s.exportSnapshot(30000).session.playerRuntime.curses[0].left, 4000);
  // a damaged save: dropped quietly
  const bad = freshSave(); bad.session.playerRuntime.curses = 'junk'; bad.session.playerRuntime.confused = 'x'; const m = migrateSave(JSON.parse(JSON.stringify(bad)));
  assert.deepEqual(m.session.playerRuntime.curses, []); assert.equal(m.session.playerRuntime.confused, 0);
  const odd = freshSave(); odd.session.playerRuntime.curses = [{ id: 'nope', left: 5 }, { id: 'noJump', left: -1 }, { id: 'noJump', left: 900, future: 1 }, null];
  const o = migrateSave(JSON.parse(JSON.stringify(odd))); assert.equal(o.session.playerRuntime.curses.length, 2); assert.equal(o.session.playerRuntime.curses[1].future, 1, 'unknown fields kept');
  assert.deepEqual(cursesIn(o.session.playerRuntime.curses, 0).map((c) => c.id), ['noJump']); assert.deepEqual(cursesOut([{ id: 'noJump', at: 0, until: 10, rot: 0 }], 20), []);
});

test('a landed puff lays one curse, the howl two (and none through a dodge)', () => {
  for (const id of ['gloomwisp', 'gloomgorge']) {
    const open = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32; let laid = 0;
    const w = { player: { x: 13, y: 12, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true, walkable: null, playerVelocity: { x: 0, y: 0 },
      move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; }, hurt() { return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {}, grab() { return false; }, held() { return false; }, release() {},
      confuse() {}, curse(src, n) { assert.equal(src.kind, id); laid = Math.max(laid, n); }, addEffect(f) { addPackEffect(w.fx, f, w.now); }, effects: () => w.fx };
    const e = Object.assign(createCombatant(id, 12, 12, false, []), { id: `${id}-1`, aggro: true }); w.enemies.push(e);
    for (let t = 0; t < 40; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); w.player.x = 13 + Math.sin(t / 2) * 1.2; }
    assert.equal(laid, id === 'gloomwisp' ? HAUNT.curse.lay.wisp : HAUNT.curse.lay.gorge, id);
  }
  assert.ok(ATTACK_MODULES.wispBewilder && ATTACK_MODULES.gorgeHowl);
  const g = game(); g.rx = 0; g.ry = 0; g.loadArea('overworld'); const pw = g.packWorld(1 / 30, 5000);
  pw.curse({ id: 'w9' }, 1); assert.equal(g.player.curses.length, 1); g.player.dodgeUntil = 9000; g.packWorld(1 / 30, 8000).curse({ id: 'w9' }, 1); assert.equal(g.player.curses.length, 1, 'a dodge slips it');
});
