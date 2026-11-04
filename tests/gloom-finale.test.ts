// The Gloomvast (Tim, 2026-11-04): the Pentagon finale's haunt. "It gives you the curses, but its health and damage output are
// beefed up. It's blue and gorgeous... a move where it makes everything darkness: not completely dark... just a small area of
// light around the Wayfarer. In the darkness you see lots of shadowy blue orbs moving around, and all of them can attack you.
// You can attack them but they don't really take damage. You don't know which one is him; you have to dodge... It could go on
// for a while."
import test from 'node:test';
import assert from 'node:assert/strict';
import { HAUNT, GLOOM_FINALE, gloomFinaleSpawn, gloomVitals, gloomOrbSpots, gloomDarkLevel, darkDue, darkDuration, isGloomFinale, isGloomOrb } from '../src/haunts.ts';
import { MONSTER_PACK, PACK_KINDS, ATTACK_MODULES, BOSS_PACE, updatePackMonster, tickPackEffects, addPackEffect, freshPackState } from '../src/monster-pack.ts';
import { drawPackMonster, drawGloomDark, drawGloomVeiled, HAUNT_SPRITE, hauntSpriteCount, gloomMaskCount } from '../src/monster-render.ts';
import { drawRangedEffects } from '../src/combat-visuals.ts';
import { render } from '../src/renderer.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave } from '../src/types.ts';
import { Game, characterStats, activeDungeonEnemies, settlementSanctuary } from '../src/game.ts';
import { liveBeastReference } from '../src/world-beasts.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';
import { LETHAL_KINDS } from '../src/landscape.ts';

const SEED = 'GLOOM-FINALE', D = GLOOM_FINALE.darkness, FPS = 30;
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const fresh = (seed = SEED) => { const s = freshSave(); s.seed = seed; return s; };
const strong = (seed = 'GLOOM-STRONG') => { const s = fresh(seed); s.level = 26; s.stats = { Might: 60, Finesse: 8, Focus: 2, Vigor: 40, Resolve: 30 }; s.equipment.primary = { ...(s.equipment.primary || {}), power: 30 }; return s; };
const sections = new Map();
// A quiet section of the open world (no settlement, so no sanctuary), the Wayfarer at its middle, nothing else in it.
function arena(save = fresh()) {
  const g = new Game(save, 0); g.paused = false; let at = sections.get(save.seed);
  if (!at) for (let k = 0; k < 80 && !at; k++) { const rx = 3 + (k % 9), ry = 4 + Math.floor(k / 9); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); if (!g.map.settlement && !settlementSanctuary(g.map, rx, ry, g.save)) at = [rx, ry]; }
  sections.set(save.seed, at); g.rx = at[0]; g.ry = at[1]; g.loadArea('overworld', false); g.enemies = []; g.player.x = 16; g.player.y = 16; g.player.hp = g.save.maxHp; return g;
}
// Frames of play; the Wayfarer is kept standing unless `mortal`. Returns the clock.
function play(g, seconds, t, { until = null, mortal = false, each = null } = {}) {
  for (let i = 0; i < Math.round(seconds * FPS); i++) { t += 1000 / FPS; if (!mortal) g.player.hp = g.save.maxHp; each?.(t); g.update(1 / FPS, idle, t); if (until?.(t)) break; }
  return t;
}
const decoys = (g) => g.enemies.filter((e) => e.gloomOrbOf && !e.dead);
function callDark(g, b, t, share = .7) { b.hp = Math.ceil(b.maxHp * share); return play(g, 14, t, { until: () => !!b.gloomDark }); }
function roundTrip(g, now) {
  const { main, puts } = splitSnapshot(snapshotSave(g.exportSnapshot(now)));
  const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts)))); assert.equal(v.health, 'healthy', v.error); return v.save;
}
// A canvas stand-in that records what is filled and stroked.
function recorder() {
  const calls = [], state = { globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000' };
  const ctx = new Proxy({ calls, createRadialGradient: () => ({ stops: [], addColorStop(at, c) { this.stops.push(c); } }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), getTransform: () => undefined,
    fillRect(...a) { calls.push(['fillRect', state.fillStyle, state.globalAlpha, ...a]); }, fill() { calls.push(['fill', state.fillStyle, state.globalAlpha]); }, stroke() { calls.push(['stroke', state.strokeStyle, state.globalAlpha]); }, drawImage() { calls.push(['drawImage']); },
    save() {}, restore() { state.globalAlpha = 1; }, ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } },
  { get: (o, k) => k in o ? o[k] : k in state ? state[k] : () => {}, set: (o, k, v) => { state[k] = v; return true; } });
  return ctx;
}
const alphaOf = (style) => { if (typeof style !== 'string') return null; const m = /^rgba\(([^)]*)\)$/.exec(style); if (m) return Number(m[1].split(',')[3]); if (/^#[0-9a-f]{8}$/i.test(style)) return parseInt(style.slice(7), 16) / 255; return 1; };

test('the Gloomvast and its cold lights: off the ordinary rosters, a telegraphed kit of their own, its look the Gloomgorge grown grand', () => {
  for (const id of ['gloomvast', 'gloomShade']) { const d = MONSTER_PACK[id]; assert.ok(d?.prototypeOnly && d.noEcho && !PACK_KINDS.includes(id), id); for (const a of d.attacks) assert.ok(ATTACK_MODULES[a], `${id}: ${a}`); }
  assert.ok(isGloomFinale({ kind: 'gloomvast' }) && isGloomOrb({ kind: 'gloomShade' }) && !isGloomFinale({ kind: 'gloomgorge' }));
  assert.equal(MONSTER_PACK.gloomvast.render, 'gloomvast'); assert.ok(MONSTER_PACK.gloomvast.form.scale > MONSTER_PACK.gloomgorge.form.scale, 'grander than the Gloomgorge');
  assert.ok(MONSTER_PACK.gloomvast.palette.every((c) => /^#[0-9a-f]{6}$/i.test(c)) && /^#[0-9a-f]{2}[0-9a-f]{2}[c-f][0-9a-f]$/i.test(MONSTER_PACK.gloomvast.palette[2]), 'blue light');
  assert.ok(ATTACK_MODULES.vastDark.scheduled, 'the Dark is called by its health, never picked at random');
  // every move shows where it will land before it lands, and gives at least a half second to see it
  const open = () => true;
  for (const id of MONSTER_PACK.gloomvast.attacks) {
    const A = ATTACK_MODULES[id]; assert.ok(A.windup >= .55, `${id} winds up`);
    const w = { player: { x: 15, y: 12, hp: 1e9 }, dt: 1 / FPS, now: 0, enemies: [], fx: [], open, tileOpen: open, los: () => true, width: 32, height: 32, playerVelocity: { x: 0, y: 0 }, move(e, dx, dy) { e.x += dx; e.y += dy; return true; }, hurt() { return true; }, slow() {}, pull() { return true; }, push() { return true; }, confuse() {}, curse() {}, addEffect(f) { addPackEffect(w.fx, f, w.now); }, effects: () => w.fx };
    const e = Object.assign(createCombatant('gloomvast', 12, 12, true, []), { id: `t-${id}`, aggro: true, packAttacks: [id] }); e.pack = freshPackState(); e.pack.gap = 0; w.enemies.push(e);
    w.player.x = 12 + Math.max(ATTACK_MODULES[id].range[0] + .5, 1.2); let shown = false;
    for (let i = 0; i < FPS * 4 && !shown; i++) { w.now += 1000 / FPS; updatePackMonster(e, w); if (e.pack.attack === id && e.pack.phase === 'windup' && (e.pack.tele || w.fx.some((f) => f.arming > 0))) shown = true; w.fx = tickPackEffects(w.fx, w); }
    assert.ok(shown, `${id} is telegraphed`);
  }
});

test('tuned to the Wayfarer: beefed-up health; its big blows (talons, plunge) take 2 to 3 hits to fell them; the lights a little', () => {
  const builds = [fresh(), strong()];
  for (const save of builds) {
    const g = arena(save), b = g.spawnGloomFinale(19, 16, { id: 'tune' }), st = characterStats(g.save), ref = { ...liveBeastReference(g.save, st), level: g.save.level, maxHp: g.save.maxHp }, v = gloomVitals(ref);
    assert.equal(b.maxHp, Math.round(v.hp * (b.threatRing >= 100 ? 1 : 1))); assert.equal(b.damage, v.damage); assert.ok(b.maxHp >= ref.perHit * GLOOM_FINALE.vitals.hitsToKill, 'health: dozens of the Wayfarer\'s blows');
    const gorge = g.scaleToRegion(g.createEnemyFromSpawn({ id: 'gorge', kind: 'gloomgorge', x: 10, y: 10, traits: [] })); assert.ok(b.maxHp > gorge.maxHp * 3 && b.damage * ATTACK_MODULES.vastPlunge.damage > gorge.damage * ATTACK_MODULES.devourPull.damage, `beefed up beyond the Gloomgorge: ${b.maxHp}/${gorge.maxHp}, ${b.damage}/${gorge.damage}`);
    const blow = (id, src = b) => { const p = g.player; p.hp = g.save.maxHp; p.invulnerableUntil = 0; g.packHurt(src, Math.max(1, Math.ceil(src.damage * ATTACK_MODULES[id].damage)), { source: id }, 1e6); return (g.save.maxHp - p.hp) / g.save.maxHp; };
    for (const id of ['vastRake', 'vastPlunge']) { const k = blow(id), hits = Math.ceil(1 / k); assert.ok(hits >= 2 && hits <= 3, `${id}: ${(k * 100).toFixed(1)}% a blow, ${hits} to fell`); }
    assert.ok(blow('vastPlunge') > blow('vastRake') && blow('vastRake') > blow('vastGloomfall'), 'the plunge is the biggest');
    const orb = g.spawnGloomOrb(b, 12, 12, 'x', 'orbit'); assert.equal(orb.damage, Math.round(b.damage * D.decoyDamage));
    const touch = blow('shadeTouch', orb); assert.ok(touch > 0 && touch < .08, `a light's touch: ${(touch * 100).toFixed(1)}%`);
    assert.ok(!b.kitRole && !b.affixes?.length && !b.hybridAttack, 'its kit is its own');
  }
});

test('its curses: a wail lays two at once with the turning-about, a puff or touch one; they stack up to the haunt cap', () => {
  const g = arena(), b = g.spawnGloomFinale(17.2, 16, { id: 'curse' }); b.packAttacks = ['vastWail']; let t = 1000;
  t = play(g, 6, t, { until: () => (g.player.curses || []).length > 0 });
  assert.equal(g.player.curses.length, GLOOM_FINALE.curse.wail, 'two curses from one wail'); assert.ok(g.player.confusedUntil > t, 'and turned about');
  assert.ok(g.player.curses.every((c) => HAUNT.curses.some((d) => d.id === c.id)) && new Set(g.player.curses.map((c) => c.id)).size === 2);
  let most = 0; t = play(g, 40, t, { each: () => { b.pack.cd.vastWail = Math.min(b.pack.cd.vastWail || 0, .5); most = Math.max(most, (g.player.curses || []).filter((c) => c.until > t).length); } });
  assert.equal(most, HAUNT.curse.cap, 'they stack to the cap and no further');
  // a cold light's touch lays one, through the same haunt curses
  const h = arena(), c = h.spawnGloomFinale(25, 25, { id: 'c2' }); c.gloomDark = { n: 0, left: 99, total: 99, laid: true }; const orb = h.spawnGloomOrb(c, 16.8, 16, 'a', 'duelist'); orb.packAttacks = ['shadeTouch']; c.aggro = false;
  play(h, 8, 1000, { until: () => (h.player.curses || []).length > 0 }); assert.equal(h.player.curses.length, GLOOM_FINALE.curse.touch);
  // never through a dodge
  const k = arena(), src = k.spawnGloomFinale(20, 20, { id: 'dodge' }); k.player.dodgeUntil = 1e9; k.layHauntCurses(src, 2, 5000); assert.equal((k.player.curses || []).length, 0);
});

test('the Dark: called as its health falls past each threshold, 14 to 18 s of a small light round the Wayfarer, never fully black, then the reveal', () => {
  const g = arena(), b = g.spawnGloomFinale(19, 16, { id: 'dark' }); let t = 1000;
  t = play(g, 2, t); assert.equal(b.gloomDarks, 0, 'not before its health falls'); assert.equal(g.gloomDarkness(), null);
  b.hp = Math.ceil(b.maxHp * .7); let rising = 0;
  t = play(g, 8, t, { until: () => !!b.gloomDark, each: () => { const d = g.gloomDarkness(); if (d && d.level > 0 && d.level < 1) rising++; } });
  assert.ok(b.gloomDark, 'the Dark falls'); assert.ok(rising > 10, 'the light drains first, over its windup'); assert.equal(g.message, GLOOM_FINALE.text.dark);
  const total = b.gloomDark.total; assert.ok(total >= D.duration[0] && total <= D.duration[1], `${total} s`); assert.equal(total, darkDuration(`${b.gloomSeed}:${b.id}`, 0));
  assert.equal(g.gloomDarkness().level, 1); assert.ok(GLOOM_FINALE.darkness.light.alpha < 1, 'never fully black');
  assert.equal(decoys(g).length, D.orbs); assert.ok(b.gloomVeil && decoys(g).every((q) => q.gloomVeil), 'all alike');
  const began = t; t = play(g, 20, t, { until: () => !b.gloomDark }); const lasted = (t - began) / 1000;
  assert.ok(Math.abs(lasted - total) < .2, `lasted ${lasted} of ${total}`); assert.equal(decoys(g).length, 0, 'the decoys burst'); assert.ok(!b.gloomVeil && b.gloomReel > 0 && b.poiseBreak > 0, 'it reels');
  assert.equal(g.message, GLOOM_FINALE.text.reveal); assert.ok(g.gloomDarkness().level > 0, 'the dark lifts, not at once');
  t = play(g, D.fadeOut + .2, t); assert.equal(g.gloomDarkness(), null, 'and is gone');
  assert.deepEqual(b.packAttacks, MONSTER_PACK.gloomvast.attacks, 'it fights as itself again');
  // each threshold once; the next only after the gap
  assert.equal(darkDue(b), -1, 'not again at the same threshold'); b.hp = Math.ceil(b.maxHp * .4); t = play(g, D.gap - 1, t, { until: () => !!b.gloomDark }); assert.equal(b.gloomDark, null, 'not inside the gap');
  t = play(g, 12, t, { until: () => !!b.gloomDark }); assert.ok(b.gloomDark, 'the second Dark'); assert.equal(b.gloomDark.n, 1);
  b.gloomDark.left = .01; t = play(g, 1, t); b.hp = 1; t = play(g, D.gap + 8, t, { until: () => !!b.gloomDark }); assert.equal(b.gloomDarks, 3); b.gloomDark.left = .01; t = play(g, D.gap + 4, t); assert.equal(b.gloomDarks, D.at.length, 'three Darks a fight, no more');
  // drawn: one mask round the Wayfarer, the rest flat; nothing it fills is opaque or black
  for (const opts of [{}, { low: true }, { reduceMotion: true }]) {
    const ctx = recorder(); drawGloomDark(ctx, 300, 400, 32, { x0: 0, y0: 0, x1: 390, y1: 844 }, { level: 1, light: D.light }, opts);
    const fills = ctx.calls.filter((c) => c[0] === 'fillRect'); assert.ok(fills.length >= 3 && fills.length <= 5, 'a mask and the flat rest');
    for (const [, style, ga] of fills) { const a = typeof style === 'string' ? alphaOf(style) : D.light.alpha; assert.ok(a * ga < 1 && a * ga > .5, `${style} ${ga}`); assert.ok(typeof style !== 'string' || !/rgba\(0,0,0/.test(style)); }
  }
  { const ctx = recorder(); drawGloomDark(ctx, 300, 400, 32, null, { level: 0, light: D.light }); assert.equal(ctx.calls.length, 0, 'no Dark, nothing drawn'); }
});

test('every light attacks; the decoys keep only a sliver of each blow, the real one takes all of it, and its numbers say so', () => {
  const g = arena(), b = g.spawnGloomFinale(19, 16, { id: 'decoy' }); let t = callDark(g, b, 1000); g.damageNumbers = true;
  const landed = { decoy: 0, it: 0 }, hurt = g.packHurt.bind(g); g.packHurt = (src, amt, o, n) => { const r = hurt(src, amt, o, n); if (r) landed[src?.gloomOrbOf ? 'decoy' : 'it']++; return r; };
  t = play(g, 12, t, { each: () => { g.player.invulnerableUntil = 0; } }); assert.ok(landed.decoy >= 3, `the decoys strike (${landed.decoy})`);
  // one blow on a decoy, one on it
  const p = g.player, orb = decoys(g)[0]; for (const q of g.enemies) if (q !== orb) { q.x = 2; q.y = 2; } orb.x = p.x + 1.2; orb.y = p.y; p.facing = 'right'; p.attackReadyAt = 0; p.curses = [];
  const before = orb.hp; g.primaryAttack(t + 1, { x: 1, y: 0 }); const raw = before - orb.hp; assert.ok(raw > 0, 'the blow lands');
  g.damageFloaters = []; g.update(1 / FPS, idle, t + 2); const kept = before - orb.hp; assert.equal(kept, Math.max(1, Math.round(raw * D.decoyTake)), `kept ${kept} of ${raw}`);
  assert.ok(!orb.dead && orb.hp > orb.maxHp * .9, 'it hardly notices'); assert.ok(g.damageFloaters.every((f) => Number(f.text) <= kept), 'and its number is small');
  orb.x = 2; b.x = p.x + 1.2; b.y = p.y; b.hitStun = 0; p.attackReadyAt = 0; const hb = b.hp; g.primaryAttack(t + 600, { x: 1, y: 0 }); g.update(1 / FPS, idle, t + 601); assert.ok(hb - b.hp >= raw * .9, `the real one takes it all (${hb - b.hp})`);
});

test('the target lock stays on the real one through the Dark, and nothing on screen gives it away', () => {
  const g = arena(), b = g.spawnGloomFinale(19, 16, { id: 'lock' }); g.lockTarget(b.id); let t = callDark(g, b, 1000);
  t = play(g, 3, t); assert.equal(g.lockedTarget(), b, 'still locked'); const d = g.lockedDirection(); assert.ok(d, 'aimed at it');
  const v = { x: b.x - g.player.x, y: b.y - g.player.y }, m = Math.hypot(v.x, v.y); assert.ok(Math.abs(d.x - v.x / m) < .2 && Math.abs(d.y - v.y / m) < .2);
  const brackets = (game) => { const ctx = recorder(); drawRangedEffects(ctx, game, 390, 844); return ctx.calls.filter((c) => c[0] === 'stroke' && c[1] === '#ff6a5a').length; };
  assert.equal(brackets(g), 0, 'no brackets on it in the dark');
  b.gloomDark.left = .01; t = play(g, 1, t); assert.ok(brackets(g) > 0, 'shown again once it is revealed');
  // a decoy can be locked too; when the Dark ends it is gone and so is the lock
  t = play(g, D.gap + .5, t); t = callDark(g, b, t, .4); const orb = decoys(g)[0]; g.lockTarget(orb.id); assert.equal(g.lockedTarget(), orb); b.gloomDark.left = .01; t = play(g, 1, t); assert.equal(g.lockedTarget(), null);
});

test('bounded: at most darkness.cap decoys, always moving, gone with the Dark or with it', () => {
  const g = arena(), b = g.spawnGloomFinale(19, 16, { id: 'cap' }); let t = callDark(g, b, 1000);
  const extra = []; for (let i = 0; i < 20; i++) extra.push(g.spawnGloomOrb(b, 10, 10, `x${i}`, 'orbit')); assert.equal(decoys(g).length, D.cap, 'never past the cap'); assert.ok(extra.filter(Boolean).length === D.cap - D.orbs);
  const act = activeDungeonEnemies(g.enemies, g.player, { activeEnemyCap: 2 }); assert.ok(decoys(g).every((q) => act.includes(q)), 'the decoys always move'); assert.equal(act.filter((q) => !q.gloomOrbOf).length, 1);
  for (const q of decoys(g)) { const x = q.x, y = q.y; play(g, .5, t); assert.ok(q.x !== x || q.y !== y || q.pack?.attack, 'they drift'); break; }
  b.hp = 0; b.dead = true; t = play(g, .1, t); assert.equal(decoys(g).length, 0, 'it falls: its lights go'); assert.equal(g.gloomDarkness(), null); assert.ok(!g.enemies.some((q) => q.gloomOrbOf), 'and leave the area');
});

test('the Dark ends on death and on leaving, and is called again on return', () => {
  { const g = arena(), b = g.spawnGloomFinale(19, 16, { id: 'death' }); let t = callDark(g, b, 1000); assert.equal(b.gloomDarks, 1);
    const area = g.areaStateId(); g.player.hp = 0; g.update(1 / FPS, idle, t + 33); assert.equal(g.gloomDarkness(), null, 'no dark after death');
    assert.ok(!g.enemies.some((q) => q.gloomOrbOf)); const saved = g.save.session.areas[area]?.enemies || []; assert.ok(!saved.some((q) => q.gloomOrbOf), 'no decoy is kept');
    const kept = saved.find((q) => q.id === 'death'); assert.ok(kept && !kept.gloomDark && !kept.gloomVeil && kept.gloomDarks === 0, 'the cut-short Dark is given back'); }
  { const g = arena(), b = g.spawnGloomFinale(19, 16, { id: 'leave' }); let t = callDark(g, b, 1000); const [rx, ry] = [g.rx, g.ry], area = g.areaStateId();
    g.snapshotArea(); g.rx = rx + 1; g.loadArea('overworld', false); assert.equal(g.gloomDarkness(), null); // as a crossing does: the area is kept, then the next is loaded const saved = g.save.session.areas[area].enemies; assert.ok(!saved.some((q) => q.gloomOrbOf)); const boss = saved.find((q) => q.id === 'leave'); assert.ok(boss && !boss.gloomDark);
    g.snapshotArea(); g.rx = rx; g.loadArea('overworld', false); const back = g.enemies.find((q) => q.id === 'leave'); assert.ok(back && !back.dead && back.hp === b.hp, 'it is still there, still hurt'); assert.equal(decoys(g).length, 0);
    g.player.x = 16; g.player.y = 16; back.aggro = true; t = play(g, D.gap + 6, t, { until: () => !!back.gloomDark }); assert.ok(back.gloomDark, 'it calls the Dark again'); assert.equal(back.gloomDark.n, 0); }
});

test('exact resume: a reload mid-Dark keeps the time left and lays the same lights again; a pause holds it', () => {
  const g = arena(), b = g.spawnGloomFinale(19, 16, { id: 'resume' }); let t = callDark(g, b, 1000); t = play(g, 3, t);
  // a pause stops its clock
  const left = b.gloomDark.left; g.setPaused(true, t); for (let i = 0; i < 90; i++) g.update(1 / FPS, idle, t + i * 33); assert.equal(b.gloomDark.left, left); g.setPaused(false, t + 3000); t += 3000;
  const spots = decoys(g).map((q) => q.id).sort(), at = { x: b.x, y: b.y }, h = new Game(roundTrip(g, t), 9e6); h.paused = false;
  const r = h.enemies.find((q) => q.id === 'resume'); assert.ok(r && r.gloomDark && Math.abs(r.gloomDark.left - left) < 1e-6, 'the same time left'); assert.ok(r.gloomVeil && r.hp === b.hp && r.maxHp === b.maxHp);
  assert.equal(decoys(h).length, 0, 'decoys are never saved'); h.player.hp = h.save.maxHp; h.update(1 / FPS, idle, 9e6 + 33);
  assert.deepEqual(decoys(h).map((q) => q.id).sort(), spots, 'the same lights are laid again'); assert.ok(Math.hypot(r.x - at.x, r.y - at.y) < .5, 'it stays where it was');
  assert.equal(h.gloomDarkness().level, 1); const t2 = play(h, 20, 9e6 + 66, { until: () => !r.gloomDark }); assert.ok(Math.abs((t2 - 9e6 - 66) / 1000 - left) < .3, 'and ends on time');
  // saved while it was still calling the Dark: no dark is resumed, and it calls it again
  const k = arena(), c = k.spawnGloomFinale(19, 16, { id: 'calling' }); c.hp = Math.ceil(c.maxHp * .7); let u = play(k, 6, 1000, { until: () => c.pack?.attack === 'vastDark' }); u = play(k, .3, u);
  const n = new Game(roundTrip(k, u), 5e6); n.paused = false; const cc = n.enemies.find((q) => q.id === 'calling'); assert.ok(cc && !cc.gloomDark); assert.equal(n.gloomDarkness(), null);
  play(n, 8, 5e6, { until: () => !!cc.gloomDark }); assert.ok(cc.gloomDark, 'called again after the reload');
});

test('the lights are laid on open, safe floor: never on lethal ground, pits, holes, doorways or objects; the same each time', () => {
  const tiles = Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: (i / 32) | 0, kind: 'grass' })), bad = new Set();
  const lethal = [...LETHAL_KINDS][0];
  for (let i = 0; i < 1024; i++) { const x = i % 32, y = (i / 32) | 0, t = tiles[i], k = (x * 7 + y * 3) % 9; if (k === 0) { t.kind = lethal; bad.add(i); } else if (k === 1) { t.blocked = true; bad.add(i); } else if (k === 2) { t.pit = true; bad.add(i); } else if (k === 3) { t.doorway = true; bad.add(i); } else if (k === 4) { t.hole = true; bad.add(i); } }
  const objects = [{ x: 18, y: 16, kind: 'chest' }, { x: 14, y: 17, kind: 'buildingStair' }], map = { tiles, objects };
  const a = gloomOrbSpots(map, 32, { x: 16, y: 16 }, D.orbs + 1, 'k1'), b2 = gloomOrbSpots(map, 32, { x: 16, y: 16 }, D.orbs + 1, 'k1'), c = gloomOrbSpots(map, 32, { x: 16, y: 16 }, D.orbs + 1, 'k2');
  assert.equal(a.length, D.orbs + 1); assert.deepEqual(a, b2, 'hashed: the same each time'); assert.notDeepEqual(a, c);
  for (const q of a) { assert.ok(!bad.has(q.y * 32 + q.x), `${q.x},${q.y}`); assert.ok(!objects.some((o) => o.x === q.x && o.y === q.y)); const d = Math.hypot(q.x - 16, q.y - 16); assert.ok(d >= D.spread[0] && d <= D.spread[1]); }
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) assert.ok(Math.hypot(a[i].x - a[j].x, a[i].y - a[j].y) >= D.apart);
  assert.equal(gloomOrbSpots({ tiles: tiles.map((t) => ({ ...t, blocked: true })) }, 32, { x: 16, y: 16 }, 5, 'k').length, 0, 'nothing on ground that will not hold them');
  // in a game, the Gloomvast itself slips to one of them
  const g = arena(), boss = g.spawnGloomFinale(19, 16, { id: 'spots' }); callDark(g, boss, 1000); const lit = [boss, ...decoys(g)];
  for (const q of lit) { const tile = g.map.tiles[Math.round(q.y) * 32 + Math.round(q.x)]; assert.ok(tile && !tile.blocked && !LETHAL_KINDS.has(tile.kind)); }
});

test('the arena\'s way in: a spawn record or a call, the same creature, tuned once and regionally scaled once', () => {
  const rec = gloomFinaleSpawn('pent:finale:gloomvast', 14, 7, { name: 'The Gloomvast', hpScale: 1.2 }); assert.equal(rec.kind, 'gloomvast'); assert.ok(rec.boss && rec.gloomFinale.hpScale === 1.2);
  const g = arena(strong()), a = g.scaleToRegion(g.createEnemyFromSpawn(rec)), b = g.spawnGloomFinale(14, 7, { id: 'pent:finale:gloomvast', hpScale: 1.2 });
  assert.equal(a.maxHp, b.maxHp); assert.equal(a.damage, b.damage); assert.equal(g.spawnGloomFinale(1, 1, { id: 'pent:finale:gloomvast' }), b, 'one at a time per id');
  const before = b.maxHp; g.scaleToRegion(b); assert.equal(b.maxHp, before, 'scaled once'); assert.ok(b.threatRing != null);
  const plain = arena(strong()).spawnGloomFinale(14, 7, { id: 'plain' }); assert.ok(Math.abs(b.maxHp - plain.maxHp * 1.2) <= 1, `hpScale: ${b.maxHp} / ${plain.maxHp}`); assert.ok(g.save.codex.creatures.gloomvast, 'its codex entry is found');
  const orb = g.spawnGloomOrb(b, 3, 3, 'r', 'orbit'); assert.equal(orb.threatRing, b.threatRing, 'decoys are scaled through it'); assert.ok(orb.noRewards && orb.summonedBy === b.id);
});

test('headless render: the Gloomvast, its Dark and its lights draw safely on every tier; the sprite caches stay bounded', () => {
  const ctx = recorder();
  for (const st of [null, 'windup', 'active']) for (const id of ['gloomvast', 'gloomShade']) { const e = Object.assign(createCombatant(id, 4, 4, true, []), { id }); if (st) e.pack = { attack: 'vastRake', phase: st }; assert.doesNotThrow(() => drawPackMonster(ctx, e, 32, 1000, 'down')); }
  const g = arena(), b = g.spawnGloomFinale(19, 16, { id: 'draw' }); let t = 1000;
  const frame = (q) => { g.presentation = { ...(g.presentation || {}), ...q }; assert.doesNotThrow(() => render(recorder(), g, 360, 640, t)); assert.doesNotThrow(() => drawRangedEffects(recorder(), g, 360, 640)); };
  frame({ effectiveQuality: 'balanced' }); t = callDark(g, b, t); for (const q of [{ effectiveQuality: 'full' }, { effectiveQuality: 'balanced' }, { effectiveQuality: 'low' }, { reduceMotion: true }]) frame(q);
  const veiled = recorder(); drawGloomVeiled(veiled, [b, ...decoys(g)], 32, t, {}); drawGloomVeiled(veiled, [b, ...decoys(g)], 32, t, { low: true }); assert.ok(veiled.calls.length > 0);
  assert.ok(hauntSpriteCount() <= HAUNT_SPRITE.max); assert.ok(gloomMaskCount() <= 4); assert.equal(gloomDarkLevel(b), 1);
  b.gloomDark.left = .01; t = play(g, 1, t); frame({ effectiveQuality: 'balanced' });
});

test('an arena that tunes the Gloomvast itself (a plain spawn of its kind): its vitals kept, its own kit and its Dark ready', () => {
  const g = arena(strong()), c = g.createEnemyFromSpawn({ id: 'stillworks:finale', kind: 'gloomvast', x: 19, y: 16, boss: true, traits: [], packGuardian: true });
  assert.ok(c.gloomSeed != null && !c.gloomDark && c.gloomDarks === 0, 'its Dark made ready'); assert.deepEqual(c.packAttacks, MONSTER_PACK.gloomvast.attacks); assert.ok(!c.kitRole && !c.hybridAttack && !c.evasive);
  c.maxHp = c.hp = 9000; c.damage = 200; c.aggro = true; g.enemies.push(c); const t = callDark(g, c, 1000);
  assert.ok(c.gloomDark && decoys(g).length === D.orbs, 'it calls the Dark'); assert.equal(c.maxHp, 9000, 'the arena\'s vitals are kept'); assert.equal(decoys(g)[0].damage, Math.round(200 * D.decoyDamage));
  play(g, 20, t, { until: () => !c.gloomDark }); assert.equal(decoys(g).length, 0);
});
