// Ten more tracks and the HUD's now-playing title (Tim, 2026-11-27: "come up with 10 more tracks ... and let's scroll the title
// of the track in the heads-up display when a new song comes up").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SONGS, MORE_SONGS, LINER_NOTES, MUSIC_SELECTION, MUSIC_CONTEXTS, validateSong } from '../src/soundtrack-songs.ts';
import { MusicDirector, DIRECTOR, songsFor, NOW_PLAYING, nowPlayingCue, nowPlayingSeconds } from '../src/soundtrack-director.ts';
import { normalizeSettings, DEFAULT_SETTINGS } from '../src/persistence.ts';

const TEN = ['lanternCross', 'thistledown', 'hearthsmoke', 'fenLights', 'undercroft', 'rootVault', 'drownedCistern', 'shoalGulls', 'dustBanners', 'glassMeridian'];
const WINDS = ['flute', 'recorder', 'ney'];
const base = { engaged: 0, near: 0, foeHp: 0, playerHp: 100, dead: false, boss: null, bossDefeated: false, checkpoint: null, region: null, atHome: false };

test('the ten new songs exist, validate, keep the house style and are not boss themes', () => {
  assert.deepEqual(Object.keys(MORE_SONGS), TEN);
  for (const id of TEN) {
    const song = SONGS[id];
    assert.equal(song, MORE_SONGS[id], `${id} is on the album`);
    assert.equal(song.id, id);
    assert.deepEqual(validateSong(song), [], id);
    assert.ok(!song.boss && !song.dark && !song.dissonance, `${id} is no boss theme`);
    assert.ok(song.bpm >= 58 && song.bpm <= 76, `${id}: downtempo (${song.bpm} BPM)`);
    assert.ok(song.name && song.mood, id);
    assert.ok(song.leads.filter((v) => WINDS.includes(v)).length / song.leads.length <= .25, `${id}: winds are an occasional answer`);
    for (const tier of ['calm', 'combat', 'drive']) assert.ok(song.drums[tier], `${id}: adaptive ${tier} drums`);
    for (const tier of ['calm', 'combat']) assert.ok(Array.isArray(song.bass[tier]), `${id}: ${tier} bass`);
  }
  assert.equal(new Set(TEN.map((id) => SONGS[id].name)).size, 10, 'ten distinct titles');
});

test('each new song is its own: no chord progression or lead motif shared with any other song', () => {
  for (const id of TEN) for (const other of Object.values(SONGS)) {
    const song = SONGS[id];
    if (other === song) continue;
    assert.notDeepEqual(song.chords, other.chords, `${id} repeats the chords of ${other.id}`);
    assert.notEqual(song.name, other.name);
    for (const [name, notes] of Object.entries(song.motifs)) for (const [on, theirs] of Object.entries(other.motifs)) assert.notDeepEqual(notes, theirs, `${id}.${name} repeats ${other.id}.${on}`);
  }
});

test('every new song has its liner note: title, moment, feel and story', () => {
  for (const id of TEN) {
    const note = LINER_NOTES.find((n) => n.id === id);
    assert.ok(note, id);
    assert.equal(note.title, SONGS[id].name, id);
    assert.ok(['torpid', 'urgent', 'awe'].includes(note.feel) && note.moment && note.story.length > 60, id);
    assert.ok(!note.menace && !note.beast, `${id}: not a beast's theme`);
  }
});

test('the selection table spreads them over the thinnest places, below each opener', () => {
  const placesOf = (id) => new Set(MUSIC_SELECTION.filter(([, s]) => s === id).map(([c]) => c));
  for (const id of TEN) assert.ok(placesOf(id).size >= 1, `${id} is listed somewhere`);
  // Every place gains at least one new song, in every chapter.
  for (const context of MUSIC_CONTEXTS) for (let chapter = 1; chapter <= 4; chapter++) {
    const list = songsFor(context, chapter).map((s) => s.id);
    assert.ok(list.some((id) => TEN.includes(id)), `${context} ch${chapter} has a new song`);
    assert.ok(list.length >= 3, `${context} ch${chapter}: ${list.length} songs to rotate`);
    assert.ok(!TEN.includes(list[0]), `${context} ch${chapter} still opens on its own song`);
  }
  assert.equal(songsFor('day', 1)[0].id, 'roadOut');
  assert.equal(songsFor('day', 3)[0].id, 'stormPass');
  assert.equal(songsFor('sky', 1)[0].id, 'astrolabe');
});

test('the director rotates every new song in, deterministically by seed', () => {
  const heard = new Set();
  const rotation = (seed, context, chapter) => {
    const d = new MusicDirector({ seed }), plays = [];
    for (let t = 0; t < 4 * 3600; t += 1) { const out = d.update({ ...base, context, chapter }, t); if (out.songId !== plays.at(-1)) plays.push(out.songId); }
    return plays;
  };
  for (const context of MUSIC_CONTEXTS) for (const chapter of [1, 4]) for (const id of rotation(3, context, chapter)) heard.add(id);
  for (const id of TEN) assert.ok(heard.has(id), `${id} is reached by the director`);
  assert.deepEqual(rotation(7, 'dusk', 2), rotation(7, 'dusk', 2), 'the same seed, the same rotation');
  const plays = rotation(7, 'dusk', 2);
  for (let i = 1; i < plays.length; i++) assert.notEqual(plays[i], plays[i - 1], 'never the same song twice running');
  assert.ok(plays.length > 4 * 3600 / DIRECTOR.dwell[1]);
});

test('now playing: a title only when a new song starts, never on a repeat', () => {
  const memo = {}, on = { muted: false, level: .5, enabled: true, duel: 'off', paused: false };
  assert.deepEqual(nowPlayingCue(memo, on, { type: 'start', songId: 'roadOut', at: 0 }), { id: 'roadOut', title: 'The Road Out' });
  assert.equal(nowPlayingCue(memo, on, { type: 'bar', songId: 'roadOut', bar: 8 }), null, 'a bar or a loop is no new song');
  assert.equal(nowPlayingCue(memo, on, { type: 'phrase', songId: 'roadOut' }), null);
  assert.equal(nowPlayingCue(memo, on, { type: 'start', songId: 'roadOut', at: 30 }), null, 'the same song resuming after a mute');
  assert.equal(nowPlayingCue(memo, on), null, 'nothing waiting');
  assert.deepEqual(nowPlayingCue(memo, on, { type: 'switch', from: 'roadOut', to: 'hearthsmoke' }), { id: 'hearthsmoke', title: 'Hearthsmoke' });
  assert.equal(nowPlayingCue(memo, on, { type: 'switch', from: 'hearthsmoke', to: 'hearthsmoke' }), null);
  assert.equal(nowPlayingCue(memo, on, { type: 'switch', from: 'hearthsmoke', to: 'nonsense' }), null, 'an unknown song shows nothing');
  // After a boss, the song from before picking up again is a song starting again: it shows.
  assert.equal(nowPlayingCue(memo, on, { type: 'switch', from: 'hearthsmoke', to: 'briarHunt' }).title, 'The Briar Hunt');
  assert.equal(nowPlayingCue(memo, on, { type: 'switch', from: 'briarHunt', to: 'hearthsmoke' }).title, 'Hearthsmoke');
});

test('now playing: passed over while muted, silent, switched off or during the dino duel; waits through a pause', () => {
  const on = { muted: false, level: .5, enabled: true, duel: 'off', paused: false };
  for (const [why, state] of [['muted', { muted: true }], ['volume 0', { level: 0 }], ['Show track titles off', { enabled: false }], ['the duel leads in', { duel: 'lead' }], ['the duel', { duel: 'on' }], ['the duel tail', { duel: 'tail' }]]) {
    const memo = {};
    assert.equal(nowPlayingCue(memo, { ...on, ...state }, { type: 'switch', from: 'roadOut', to: 'thistledown' }), null, why);
    assert.equal(nowPlayingCue(memo, on), null, `${why}: not shown later either`);
    assert.equal(nowPlayingCue(memo, on, { type: 'start', songId: 'thistledown' }), null, `${why}: it was this song, so no title on resuming`);
  }
  const memo = {};
  assert.equal(nowPlayingCue(memo, { ...on, paused: true }, { type: 'switch', from: 'roadOut', to: 'glassMeridian' }), null, 'paused: it waits');
  assert.equal(nowPlayingCue(memo, { ...on, paused: true }), null);
  assert.equal(nowPlayingCue(memo, on).title, 'The Glass Meridian', 'shown once play resumes');
  assert.equal(nowPlayingCue(memo, on), null, 'once');
  // A newer song while paused replaces the waiting one.
  nowPlayingCue(memo, { ...on, paused: true }, { type: 'switch', from: 'glassMeridian', to: 'fenLights' });
  nowPlayingCue(memo, { ...on, paused: true }, { type: 'switch', from: 'fenLights', to: 'shoalGulls' });
  assert.equal(nowPlayingCue(memo, on).id, 'shoalGulls');
});

test('now playing: how long it stays up; reduced motion is a still label', () => {
  assert.equal(nowPlayingSeconds(300, 200, true), NOW_PLAYING.seconds, 'reduced motion: a fixed time, no slide');
  assert.ok(nowPlayingSeconds(0, 0) >= NOW_PLAYING.minSeconds);
  const short = nowPlayingSeconds(80, 200), long = nowPlayingSeconds(260, 200);
  assert.ok(long > short && long <= 14, `${short} ${long}`);
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /body\.reduce-motion \.np-title \{[^}]*animation: none !important/, 'no scrolling with Reduce motion');
  assert.match(css, /\.now-playing \{[^}]*pointer-events: none/, 'it never takes a touch');
  assert.match(css, /\.now-playing \{[^}]*env\(safe-area-inset-left\)/, 'it respects the safe area');
  assert.match(css, /body\.proving-ground \.now-playing \{ display: none !important; \}/, 'hidden in the Proving Ground, like the HUD');
  assert.match(css, /@keyframes np-scroll/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<aside id="nowPlaying" class="now-playing"[^>]*hidden>/, 'hidden until a song starts');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /onEvent: \(e\) => \{ if \(e\.type === "start" \|\| e\.type === "switch"\) nowPlaying\(e\); \}/, 'driven by the engine\'s own song events');
  assert.match(main, /settingRow\("Show track titles",toggleSetting\("trackTitles"\)/, 'Options -> Audio has the toggle');
});

test('Show track titles: on by default, off only when turned off, kept in the device settings', () => {
  assert.equal(DEFAULT_SETTINGS.trackTitles, true);
  assert.equal(normalizeSettings({}).trackTitles, true, 'settings saved before the option existed');
  assert.equal(normalizeSettings({ trackTitles: false }).trackTitles, false);
  assert.equal(normalizeSettings(JSON.parse(JSON.stringify(normalizeSettings({ trackTitles: false })))).trackTitles, false, 'round trip');
  assert.equal(normalizeSettings({ trackTitles: 'no' }).trackTitles, true, 'only an explicit false turns it off');
});
