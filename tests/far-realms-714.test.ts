// Release 714 (Tim, 2026-11-03): realms in the far reaches, beyond 1000 sections of Ember Refuge, starting with the Giants' Reach;
// and the Briar Stag and the Stalker, who are friends, stop to play when they meet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FAR_REALMS, FAR_GIANTS, farRealmAt, farCell, giantify } from '../src/far-realms.ts';
import { BEAST_PLAY } from '../src/world-beasts.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const seed = 'FAR714';
const giantSection = () => { for (let a = 0; a < 6.28; a += .01) { const rx = Math.round(Math.cos(a) * 1100), ry = Math.round(Math.sin(a) * 1100); if (farRealmAt(seed, rx, ry)?.type === 'giants') return [rx, ry]; } return null; };
const plainSection = () => { for (let a = 0; a < 6.28; a += .01) { const rx = Math.round(Math.cos(a) * 1100), ry = Math.round(Math.sin(a) * 1100); if (!farRealmAt(seed, rx, ry)) return [rx, ry]; } return null; };

test('the far realms lie only beyond 1000 sections, straight-line, and only on ground first seen with them', () => {
  assert.equal(FAR_REALMS.start, 1000);
  for (const [rx, ry] of [[0, 0], [700, 700], [999, 0], [0, -999]]) assert.equal(farCell(seed, rx, ry), null, `${rx},${ry}`);
  assert.ok(farCell(seed, 1000, 0) && farCell(seed, 708, 708)); // 708,708 is 1001 straight-line
  let giants = 0, n = 0; for (let a = 0; a < 6.28; a += .002) { const rx = Math.round(Math.cos(a) * 1500), ry = Math.round(Math.sin(a) * 1500); n++; if (farRealmAt(seed, rx, ry)?.type === 'giants') giants++; }
  assert.ok(giants / n > .05 && giants / n < .35, `giants ${giants}/${n}`);
  const [gx, gy] = giantSection(); assert.equal(farRealmAt(seed, gx, gy, 0), null, 'version 0: none'); assert.deepEqual(farRealmAt(seed, gx, gy), farRealmAt(seed, gx, gy), 'deterministic');
  assert.ok(farRealmAt(seed, gx, gy).name && farRealmAt(seed, gx, gy).arrive);
});

test('a creature of the Giants\' Reach is bigger and stronger; world beasts, bosses and the Stalker are not touched', () => {
  const c = createCombatant('ashenHound', 0, 0, false, []), s0 = c.scale || 1, hp0 = c.maxHp, d0 = c.damage; giantify(c);
  assert.ok(c.farGiant && Math.abs(c.scale - s0 * FAR_GIANTS.scale) < 1e-9 && c.maxHp === Math.round(hp0 * FAR_GIANTS.hp) && c.damage >= d0);
  giantify(c); assert.ok(Math.abs(c.scale - s0 * FAR_GIANTS.scale) < 1e-9, 'only once');
  for (const extra of [{ worldBeast: 'briarStag' }, { boss: true }, { stalker: true }]) { const q = Object.assign(createCombatant('ashenHound', 0, 0, false, []), extra), sc = q.scale; giantify(q); assert.equal(q.scale, sc); assert.ok(!q.farGiant); }
});

test('in the game: a section of the Giants\' Reach is pinned in the atlas, named on arrival, and its creatures are giants; older ground keeps none', () => {
  const [gx, gy] = giantSection(), s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = gx; g.ry = gy; g.loadArea('overworld');
  assert.equal(s.atlas[`${gx},${gy}`].farVersion, FAR_REALMS.version); assert.equal(g.farRealm?.type, 'giants');
  assert.ok(s.narrative.journal.some((j) => j.recordId?.startsWith('far-realm:giants:')), 'the journal names it');
  const ordinary = g.enemies.filter((e) => !e.boss && !e.worldBeast && !e.ambient && !e.questingBeast && !e.stalker); if (ordinary.length) assert.ok(ordinary.every((e) => e.farGiant), 'every ordinary creature is a giant');
  const old = freshSave(); old.seed = seed; old.atlas = { [`${gx},${gy}`]: { terrain: 'grass', landscapeVersion: 14 } }; const h = new Game(old, 0); h.rx = gx; h.ry = gy; h.loadArea('overworld');
  assert.equal(h.farRealm, null, 'seen before: no realm'); assert.ok(!old.atlas[`${gx},${gy}`].farVersion); assert.ok(h.enemies.every((e) => !e.farGiant));
  const [px, py] = plainSection(), p = freshSave(); p.seed = seed; const k = new Game(p, 0); k.rx = px; k.ry = py; k.loadArea('overworld'); assert.equal(k.farRealm, null);
});

test('the Briar Stag and the Stalker, meeting, forget the Wayfarer and play for a while; then remember, and not again too soon', () => {
  const s = freshSave(); s.seed = 'PLAY714'; const g = new Game(s, 0), p = g.player;
  const stag = Object.assign(createCombatant('briarStag', p.x + 4, p.y, true, []), { id: 'stag', worldBeast: 'briarStag', aggro: true });
  const cat = Object.assign(createCombatant('ashenHound', p.x + 7, p.y, false, []), { id: 'cat', kind: 'stalker', stalker: true, boss: true, aggro: true });
  g.enemies = [stag, cat]; let t = 1000; g.beastPlay(1 / 30, t);
  assert.ok(stag.playing && cat.playing, 'they play'); assert.equal(g.message, BEAST_PLAY.start);
  const hp = stag.hp; stag.hp -= 5; assert.ok(stag.hp < hp, 'blows still land');
  const a0 = Math.atan2(stag.y - cat.y, stag.x - cat.x); for (let i = 0; i < 30; i++) { t += 1000 / 30; g.beastPlay(1 / 30, t); }
  assert.notEqual(Math.atan2(stag.y - cat.y, stag.x - cat.x).toFixed(2), a0.toFixed(2), 'they circle');
  t += BEAST_PLAY.time * 1000; g.beastPlay(1 / 30, t); assert.ok(!stag.playing && !cat.playing, 'the game ends'); assert.equal(g.message, BEAST_PLAY.end);
  t += 1000; g.beastPlay(1 / 30, t); assert.ok(!stag.playing, 'not again at once');
  t += BEAST_PLAY.gap * 1000; cat.x = stag.x + 3; cat.y = stag.y; g.beastPlay(1 / 30, t); assert.ok(stag.playing, 'and again later');
  g.enemies = [stag]; g.beastPlay(1 / 30, t + 50); assert.ok(!stag.playing, 'alone, no game');
  { stag.playing = cat.playing = false; g.beastPlayState = null; g.enemies = [stag, cat]; cat.x = stag.x + 3; cat.y = stag.y; g.beastPlay(1 / 30, t + 99000); assert.ok(stag.playing); stag.retreating = true; g.beastPlay(1 / 30, t + 99050); assert.ok(!stag.playing && !cat.playing, 'a stag that turns to retreat mid-play is let go'); stag.retreating = false; }
  const far = Object.assign(createCombatant('ashenHound', stag.x + BEAST_PLAY.range + 5, stag.y, false, []), { id: 'cat2', kind: 'stalker', stalker: true }); g.enemies = [stag, far]; g.beastPlayState = null; g.beastPlay(1 / 30, t + 100); assert.ok(!stag.playing, 'too far apart');
});
