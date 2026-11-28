// The Pachycephalosaurus's boss theme (Tim, 2026-11-27: "Let's do a boss theme"): "The Skull Drum" (soundtrack-songs.ts) plays when the
// Wayfarer fights the Pachycephalosaurus of a big room or an ambush (soundtrack-director.ts DIRECTOR.themedBeasts, BOSS_THEMES.pachy),
// never while it lies disguised as a rock, and never during a dino duel (the duel stays music-free: battle sounds only).
import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicDirector, BOSS_THEMES, DIRECTOR, DUEL, sampleMusic, bossSongFor } from '../src/soundtrack-director.ts';
import { SONGS, LINER_NOTES, validateSong } from '../src/soundtrack-songs.ts';

const world = (enemies) => ({ area: 'overworld', rx: 3, ry: 4, map: { landscape: { biome: 'forest' } }, player: { x: 0, y: 0, hp: 90 }, save: { session: {}, activeCheckpoint: { rx: 0, ry: 0, x: 1, y: 1 } }, enemies });
const pachy = (extra = {}) => ({ id: 'pachy-1', kind: 'pachy', pachyRoom: true, boss: false, aggro: true, hp: 500, maxHp: 500, x: 6, y: 0, pack: {}, ...extra });

test('the Skull Drum: its own valid boss theme with liner notes, mapped to the Pachycephalosaurus', () => {
  const song = SONGS.skullDrum;
  assert.ok(song?.boss && !song.variantOf); assert.deepEqual(validateSong(song), []);
  assert.equal(BOSS_THEMES.pachy, 'skullDrum'); assert.equal(bossSongFor('pachy'), 'skullDrum');
  assert.ok(DIRECTOR.themedBeasts.includes('pachy'));
  const note = LINER_NOTES.find((n) => n.id === 'skullDrum'); assert.ok(note && note.title === song.name && note.beast === 'The Pachycephalosaurus' && note.menace === 'overt');
  // heavy and percussive: timpani and toms in the fight, the drive harder still
  assert.ok(song.drums.combat.timp && song.drums.combat.tom && song.drums.drive.timp.split('').filter((c) => c !== '.').length >= 6);
});

test('the theme plays when he is engaged (a big room or an ambush), with the beast beat, and the song from before comes back after', () => {
  for (const flags of [{ pachyRoom: true }, { pachyRoom: undefined, pachyAmbush: true }]) {
    const d = new MusicDirector({ seed: 3 }), memo = {}, foe = pachy(flags), beats = [];
    let out = d.update(sampleMusic(world([]), memo), 0); const before = out.songId;
    for (let t = .5; t <= 10; t += .5) { out = d.update(sampleMusic(world([foe]), memo), t); beats.push(...out.stingers); }
    assert.equal(out.songId, 'skullDrum', JSON.stringify(flags)); assert.equal(out.change, 'boss'); assert.deepEqual(beats, ['beast']);
    foe.hp = 0; foe.dead = true; out = d.update(sampleMusic(world([foe]), memo), 10.5); assert.deepEqual(out.stingers, ['victory']);
    for (let t = 11; t < 11 + DIRECTOR.bossLinger + 2; t += .5) out = d.update(sampleMusic(world([foe]), memo), t);
    assert.equal(out.songId, before);
  }
});

test('no theme while he lies disguised, before he is roused, or for a pachy that is neither a big room\'s nor an ambush\'s', () => {
  assert.equal(sampleMusic(world([pachy({ pachyDisguised: true, aggro: false })]), {}).boss, null);
  assert.equal(sampleMusic(world([pachy({ pachyDisguised: true })]), {}).boss, null);
  assert.equal(sampleMusic(world([pachy({ aggro: false })]), {}).boss, null);
  assert.equal(sampleMusic(world([pachy({ pachyRoom: false })]), {}).boss, null);
  assert.equal(sampleMusic(world([pachy()]), {}).boss.kind, 'pachy');
});

test('a duel stays music-free: no Skull Drum while he fights another dinosaur, and his fall to it is no victory', () => {
  const d = new MusicDirector({ seed: 3 }), memo = {};
  const foe = pachy({ dinoDuel: { foe: 's' } }), spino = { id: 's', kind: 'spinoRex', x: 9, y: 0, hp: 600, maxHp: 600, aggro: true, pack: {}, dinoDuel: { foe: 'pachy-1' } };
  let out = d.update(sampleMusic(world([]), memo), 0); const place = out.songId;
  const seen = new Set(), beats = [];
  for (let t = .25; t <= 12; t += .25) { out = d.update(sampleMusic(world([foe, spino]), memo), t); seen.add(out.songId); beats.push(...out.stingers); if (t > DUEL.leadIn + .5) assert.equal(out.hush, 0, `hushed at ${t}`); }
  assert.ok(!seen.has('skullDrum'), 'no boss theme in the duel'); assert.ok(!beats.includes('beast')); assert.equal(out.songId, place);
  foe.hp = 0; foe.dead = true; foe.noRewards = true; // eaten by the Spinosaurus
  out = d.update(sampleMusic(world([foe, spino]), memo), 12.25); assert.ok(!out.stingers.includes('victory'), 'a beast eaten by the other is no victory');
});
