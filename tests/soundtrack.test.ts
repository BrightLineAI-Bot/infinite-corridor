// The soundtrack (2026-11-14): soundtrack-songs.ts (data), soundtrack.ts (engine), soundtrack-director.ts (director), driven
// here through a fake AudioContext that records every node, start time and automation time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SONGS, STINGERS, LINER_NOTES, MUSIC_SELECTION, MUSIC_CONTEXTS, validateSong, chordPcs, MODES, pc, barSeconds } from '../src/soundtrack-songs.ts';
import { createSoundtrack, SOUNDTRACK, voiceLead, bridgeTone } from '../src/soundtrack.ts';
import { MusicDirector, DIRECTOR, BOSS_THEMES, bossSongFor, musicContext, journeyChapter, songsFor, sampleMusic } from '../src/soundtrack-director.ts';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/persistence.ts';

class FakeParam {
  constructor(ctx, value = 0) { this.ctx = ctx; this.value = value; this.events = []; }
  at(type, v, t) { if (!Number.isFinite(t) || !Number.isFinite(v)) throw new Error(`bad ${type} ${v} @ ${t}`); if (t < this.ctx.currentTime - 1e-9) this.ctx.pastParams++; this.events.push({ type, v, t }); return this; }
  setValueAtTime(v, t) { return this.at('set', v, t); }
  linearRampToValueAtTime(v, t) { return this.at('linear', v, t); }
  exponentialRampToValueAtTime(v, t) { if (!(v > 0)) throw new Error('exponential ramp to zero'); return this.at('exp', v, t); }
  setTargetAtTime(v, t) { return this.at('target', v, t); }
  cancelScheduledValues() { return this; }
}
class FakeNode {
  constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; this.disconnected = false; ctx.nodes.push(this); }
  connect(n) { return n; }
  disconnect() { this.disconnected = true; }
}
class FakeSource extends FakeNode {
  constructor(ctx, kind) { super(ctx, kind); this.startAt = null; this.stopAt = null; this.ended = false; this.onended = null; ctx.sources.push(this); }
  start(t = 0) { if (t < this.ctx.currentTime - 1e-9) this.ctx.pastStarts++; this.startAt = t; }
  stop(t = this.ctx.currentTime) { this.stopAt = t; }
}
class FakeContext {
  constructor() { this.currentTime = 0; this.sampleRate = 8000; this.nodes = []; this.sources = []; this.pastStarts = 0; this.pastParams = 0; this.destination = new FakeNode(this, 'destination'); }
  createGain() { const n = new FakeNode(this, 'gain'); n.gain = new FakeParam(this, 1); return n; }
  createOscillator() { const n = new FakeSource(this, 'osc'); n.frequency = new FakeParam(this, 440); n.detune = new FakeParam(this, 0); return n; }
  createBiquadFilter() { const n = new FakeNode(this, 'filter'); n.frequency = new FakeParam(this, 350); n.Q = new FakeParam(this, 1); return n; }
  createDelay() { const n = new FakeNode(this, 'delay'); n.delayTime = new FakeParam(this, 0); return n; }
  createBufferSource() { return new FakeSource(this, 'buffer'); }
  createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { length, getChannelData: (c) => data[c] }; }
  createConvolver() { return new FakeNode(this, 'convolver'); }
  // Move the clock; sources whose stop time has passed end (and their onended runs), as a real context would.
  advance(t) { this.currentTime = t; for (const s of this.sources) if (!s.ended && s.stopAt != null && s.stopAt <= t) { s.ended = true; s.onended?.(); } }
}
const engine = (options = {}) => { const ctx = new FakeContext(), events = []; const eng = createSoundtrack(ctx, { timer: false, seed: 5, onEvent: (e) => events.push(e), ...options }); return { ctx, eng, events }; };
// Tick every 25 ms from `from` to `to`, calling `each(t)` first.
function run(ctx, eng, from, to, each = () => {}) { for (let t = from; t < to; t += .025) { ctx.advance(t); each(t); eng.tick(t); } ctx.advance(to); }

test('every song validates: in key, patterns the right length, slow tempos, motifs on chord tones', () => {
  assert.ok(Object.keys(SONGS).length >= 9);
  for (const song of Object.values(SONGS)) {
    assert.deepEqual(validateSong(song), [], song.id);
    assert.ok(song.bpm >= 58 && song.bpm <= 84, `${song.id} ${song.bpm} BPM`);
    assert.ok(['dorian', 'phrygian', 'aeolian', 'hijaz'].includes(song.mode), 'modal minor throughout');
    const scale = new Set(MODES[song.mode].map((s) => pc(song.root + s)));
    for (const spec of song.chords) for (const p of chordPcs(song, spec)) assert.ok(scale.has(p));
    for (const tier of ['calm', 'combat', 'drive']) for (const voice of Object.keys(song.drums[tier])) assert.ok(['frame', 'tom', 'timp'].includes(voice), 'no kit drums');
  }
  assert.ok(Object.values(SONGS).some((s) => s.mode === 'hijaz'), 'the travelling scholar piece');
  // The validator catches a clash and a bad pattern.
  const broken = { ...SONGS.moonlitTower, motifs: { ...SONGS.moonlitTower.motifs, a: [[0, 3, 8]] }, drums: { ...SONGS.moonlitTower.drums, calm: { frame: 'X..' } } };
  assert.ok(validateSong(broken).length >= 2);
});

test('the lead lines belong mostly to choir, strings, horn, plucks and bells; winds are an occasional answer', () => {
  const winds = ['flute', 'recorder', 'ney'];
  let all = 0, wind = 0;
  for (const song of Object.values(SONGS)) {
    const turns = song.leads.filter((v) => winds.includes(v)).length;
    assert.ok(turns / song.leads.length <= .25, `${song.id}: winds sing at most one turn in four`);
    all += song.leads.length; wind += turns;
  }
  assert.ok(wind / all <= .15, `winds ${wind}/${all} of all lead turns`);
  for (const id of ['moonlitTower', 'observatory']) { assert.ok(!SONGS[id].leads.some((v) => winds.includes(v)), id); assert.ok(SONGS[id].leads.includes('choir') && SONGS[id].leads.includes('strings')); }
  assert.ok(SONGS.astrolabe.leads.includes('ney') && SONGS.astrolabe.leads.includes('dulcimer'), 'a little ney, shared');
  for (const s of Object.values(STINGERS)) for (const [, inst] of s.events) assert.ok(!winds.includes(inst), 'no wind in the story beats');
  // Every lead voice plays through the engine; in a fight a wind's turn passes to the strings.
  const { ctx, eng } = engine();
  for (const kind of ['choir', 'strings', 'cello', 'horn', 'harpsichord', 'lute', 'dulcimer', 'bell', 'celesta', 'flute', 'recorder', 'ney']) {
    const before = ctx.sources.length; eng.playLead(eng.mix, 1, 76, 2, 1, kind); assert.ok(ctx.sources.length > before, kind);
  }
  // Saltwind's third phrase (bars 16-23) is the flute's turn: in calm the flute sings it, in a fight the strings do.
  assert.equal(SONGS.saltwind.leads[2], 'flute');
  const third = 16.5 * barSeconds(SONGS.saltwind) + .1;
  for (const [intensity, want] of [[0, 'flute'], [.9, 'strings']]) {
    const e = engine(); e.eng.setTarget({ songId: 'saltwind', intensity }); e.eng.start(); run(e.ctx, e.eng, 0, third);
    const d = e.eng.current(); assert.equal(Math.floor(d.bar / 8), 2); assert.equal(d.leadKind, want, `intensity ${intensity}`);
  }
});

test('the liner notes and the selection table cover the album', () => {
  assert.deepEqual(LINER_NOTES.map((n) => n.id).sort(), Object.keys(SONGS).sort(), 'every song has its place in the arc');
  for (const n of LINER_NOTES) assert.ok(['torpid', 'urgent', 'awe'].includes(n.feel) && n.moment);
  for (const [context, id, from, to, w] of MUSIC_SELECTION) { assert.ok(MUSIC_CONTEXTS.includes(context) && SONGS[id] && !SONGS[id].boss && from <= to && w > 0, id); }
  for (const context of MUSIC_CONTEXTS) for (let chapter = 1; chapter <= 4; chapter++) assert.ok(songsFor(context, chapter).length >= 2, `${context} ch${chapter} can rotate`);
  assert.equal(songsFor('day', 1)[0].id, 'roadOut', 'a journey opens on The Road Out');
  assert.equal(songsFor('day', 3)[0].id, 'stormPass', 'later chapters lean on the urgent pieces');
  assert.equal(songsFor('sky', 1)[0].id, 'astrolabe');
});

test('stingers are 2-6 s story beats and duck the score', () => {
  for (const kind of ['departure', 'beast', 'victory', 'rest', 'region', 'death']) {
    const s = STINGERS[kind]; assert.ok(s, kind);
    const span = Math.max(...s.events.map(([b, , , len]) => (b + len) * 60 / s.bpm));
    assert.ok(span >= 2 && span <= 6, `${kind} ${span}s`);
  }
  const { ctx, eng, events } = engine();
  eng.setTarget({ songId: 'moonlitTower', intensity: 0 }); eng.start(); run(ctx, eng, 0, 4);
  const before = ctx.sources.length, seconds = eng.stinger('beast', ctx.currentTime);
  assert.ok(seconds > 2 && seconds < 7.5);
  assert.ok(ctx.sources.length > before, 'the stinger plays notes');
  assert.ok(eng.duck.gain.events.some((e) => e.type === 'target' && e.v === SOUNDTRACK.duck.level), 'the music ducks');
  assert.ok(eng.duck.gain.events.some((e) => e.type === 'target' && e.v === 1 && e.t > ctx.currentTime + 1), 'and comes back');
  assert.equal(eng.stinger('nonsense'), 0);
  assert.ok(events.some((e) => e.type === 'stinger' && e.kind === 'beast'));
  for (const kind of Object.keys(STINGERS)) assert.ok(eng.stinger(kind, ctx.currentTime) > 0, kind);
});

test('the scheduler looks ahead about 120 ms and never schedules in the past, even after a stall', () => {
  const { ctx, eng } = engine();
  eng.setTarget({ songId: 'stormPass', intensity: .9 }); eng.start();
  let worst = 0, seen = 0;
  for (let t = 0; t < 60; t += .025) {
    ctx.advance(t); eng.tick(t);
    for (const s of ctx.sources.slice(seen)) if (s.kind === 'osc' && s.startAt != null) worst = Math.max(worst, s.startAt - t);
    seen = ctx.sources.length;
  }
  assert.ok(worst <= SOUNDTRACK.lookahead + .1, `scheduled ${worst.toFixed(3)} s ahead`);
  assert.ok(worst > .05, 'it does look ahead');
  // A 3 s stall (a frozen tab): the missed steps are skipped, nothing lands before the clock.
  ctx.advance(63); eng.tick(63); run(ctx, eng, 63, 70);
  assert.ok(eng.stats.pastSkips > 0);
  assert.equal(ctx.pastStarts, 0, 'no source starts in the past');
  assert.equal(ctx.pastParams, 0, 'no automation in the past');
});

test('voices stay bounded over 10 minutes of fights, bosses, songs and stingers, and every note is cleaned up', () => {
  const { ctx, eng } = engine();
  const songs = Object.keys(SONGS);
  eng.start();
  let maxLiveSources = 0;
  run(ctx, eng, 0, 600, (t) => {
    const minute = Math.floor(t / 60);
    eng.setTarget({ songId: songs[minute % songs.length], intensity: (Math.sin(t / 9) + 1) / 2, change: minute % 3 ? 'context' : 'boss' });
    if (Math.abs(t % 30) < .02) eng.stinger(Object.keys(STINGERS)[Math.floor(t / 30) % 6], t);
    if (Math.abs(t % 1) < .02) maxLiveSources = Math.max(maxLiveSources, ctx.sources.filter((s) => s.startAt <= t && !s.ended).length);
  });
  assert.ok(eng.stats.peakVoices <= SOUNDTRACK.maxVoices, `peak ${eng.stats.peakVoices}`);
  assert.ok(maxLiveSources <= SOUNDTRACK.maxVoices * 3 + 4, `live sources ${maxLiveSources}`);
  run(ctx, eng, 600, 615);
  const notes = ctx.sources.filter((s) => s.stopAt != null);
  assert.ok(notes.length > 2000);
  assert.ok(notes.every((s) => s.stopAt <= 615 ? s.ended : true));
  const stopped = ctx.sources.filter((s) => s.onended && s.stopAt != null);
  assert.ok(stopped.length > 1000 && stopped.every((s) => s.disconnected || s.stopAt > 610), 'ended notes are disconnected');
  const loose = ctx.sources.filter((s) => s.stopAt == null);
  assert.ok(loose.length <= 2, 'only the tape-wow LFO and the hiss run on');
  assert.ok(eng.stats.liveNodes < 400, `live nodes ${eng.stats.liveNodes}`);
});

test('song changes land on bar lines of the old song, with a bridge and a crossfade', () => {
  const { ctx, eng, events } = engine();
  eng.setTarget({ songId: 'roadOut', intensity: 0, change: 'context' }); eng.start();
  run(ctx, eng, 0, 21);
  eng.setTarget({ songId: 'underhollow', change: 'context' }); run(ctx, eng, 21, 45);
  eng.setTarget({ songId: 'deepbell', change: 'rotate' }); run(ctx, eng, 45, 120);
  eng.setTarget({ songId: 'boss', change: 'boss' }); run(ctx, eng, 120, 140);
  const switches = events.filter((e) => e.type === 'switch');
  assert.deepEqual(switches.map((s) => s.to), ['underhollow', 'deepbell', 'boss']);
  for (const s of switches) {
    assert.equal(s.fromBar % SOUNDTRACK.quantum[s.change], 0, `${s.change} change at bar ${s.fromBar}`);
    const from = SONGS[s.from], bars = (s.at - s.fromStart) / barSeconds(from);
    if (s.from === 'roadOut') assert.ok(Math.abs(bars - Math.round(bars)) < 1e-6, 'on a bar line');
  }
  assert.ok(switches[0].at >= 21 && switches[0].at < 21 + 2 * barSeconds(SONGS.roadOut) + .2, 'a context change comes within two bars');
  assert.ok(switches[2].at < 120 + barSeconds(SONGS.deepbell) + .2, 'a boss comes on the next bar');
  assert.equal(bridgeTone(SONGS.roadOut, SONGS.underhollow), pc(SONGS.underhollow.root), 'E is in D Dorian: the bridge holds the new tonic');
});

test('tiers rise on a bar line and fall after an exhale bar', () => {
  const { ctx, eng, events } = engine();
  eng.setTarget({ songId: 'moonlitTower', intensity: 0 }); eng.start(); run(ctx, eng, 0, 10);
  eng.setTarget({ intensity: .9 }); run(ctx, eng, 10, 30);
  const bars = events.filter((e) => e.type === 'bar');
  assert.equal(bars.at(-1).tier, 2);
  eng.setTarget({ intensity: 0 }); run(ctx, eng, 30, 50);
  const after = events.filter((e) => e.type === 'bar' && e.at >= 30);
  assert.equal(after[0].tier, 2, 'the first bar exhales');
  assert.equal(after.at(-1).tier, 0, 'then it settles');
});

test('the director: intensity rises with enemies and damage, decays over about ten seconds when calm', () => {
  const d = new MusicDirector({ seed: 1 }), base = { context: 'day', chapter: 1, engaged: 0, near: 0, foeHp: 0, playerHp: 100, dead: false, boss: null, bossDefeated: false, checkpoint: null, region: null, atHome: false };
  let t = 0, out;
  for (; t < 5; t += .25) out = d.update({ ...base, engaged: 1, foeHp: 20 }, t);
  const one = out.intensity;
  for (; t < 10; t += .25) out = d.update({ ...base, engaged: 4, foeHp: 80 - (t - 5) * 4, playerHp: 100 - (t - 5) * 2 }, t);
  assert.ok(out.intensity > one && out.intensity > .8, `${one} -> ${out.intensity}`);
  const peak = out.intensity;
  for (; t < 13; t += .25) out = d.update(base, t);
  assert.ok(out.intensity > .5 && out.intensity <= peak, 'it holds and eases');
  for (; t < 26; t += .25) out = d.update(base, t);
  assert.ok(out.intensity < .05, `settled to ${out.intensity}`);
  assert.equal(out.songId, 'roadOut', 'the fight did not change the song, only its urgency');
  const calm = new MusicDirector({ calmOnly: true });
  for (t = 0; t < 5; t += .25) out = calm.update({ ...base, engaged: 5 }, t);
  assert.equal(out.intensity, 0, 'Calm only: no combat lift');
});

test('the director rotates songs every 2-4 minutes, never the same twice running', () => {
  const d = new MusicDirector({ seed: 9 }), snap = { context: 'day', chapter: 2, engaged: 0, near: 0, foeHp: 0, playerHp: 100, dead: false, boss: null, checkpoint: null, region: null, atHome: false };
  const plays = []; let since = 0;
  for (let t = 0; t < 3600; t += .5) {
    const out = d.update(snap, t);
    if (out.songId !== plays.at(-1)?.id) { if (plays.length) { assert.ok(t - since >= DIRECTOR.dwell[0] - 1 && t - since <= DIRECTOR.dwell[1] + 1, `${t - since}s`); assert.equal(out.change, 'rotate'); } plays.push({ id: out.songId, t }); since = t; }
  }
  assert.ok(plays.length >= 15);
  for (let i = 1; i < plays.length; i++) assert.notEqual(plays[i].id, plays[i - 1].id);
  assert.ok(new Set(plays.map((p) => p.id)).size >= 2);
  for (const p of plays) assert.ok(songsFor('day', 2).some((s) => s.id === p.id));
});

test('bosses: the shared boss track, BOSS_THEMES per beast, the beast and victory beats, then the song from before', () => {
  assert.deepEqual(BOSS_THEMES, {}, 'Phase 1: one shared boss track');
  assert.equal(bossSongFor('briarStag'), 'boss');
  assert.equal(bossSongFor('briarStag', { briarStag: 'missing' }), 'boss', 'an unknown theme falls back');
  const songs = { ...SONGS, briarTheme: { ...SONGS.boss, id: 'briarTheme' } };
  assert.equal(bossSongFor('briarStag', { briarStag: 'briarTheme' }, songs), 'briarTheme');
  const base = { context: 'dungeon', chapter: 1, engaged: 0, near: 0, foeHp: 0, playerHp: 100, dead: false, boss: null, bossDefeated: false, checkpoint: null, region: null, atHome: false };
  for (const [themes, want] of [[undefined, 'boss'], [{ briarStag: 'briarTheme' }, 'briarTheme']]) {
    const d = new MusicDirector({ songs, bossThemes: themes });
    let out = d.update(base, 0); const before = out.songId;
    out = d.update({ ...base, boss: { id: 'b1', kind: 'briarStag' }, engaged: 1, foeHp: 900 }, 1);
    assert.equal(out.songId, want); assert.equal(out.change, 'boss'); assert.deepEqual(out.stingers, ['beast']);
    out = d.update({ ...base, boss: { id: 'b1', kind: 'briarStag' }, engaged: 1, foeHp: 800 }, 2);
    assert.deepEqual(out.stingers, [], 'the beast beat plays once');
    out = d.update({ ...base, bossDefeated: true }, 3);
    assert.deepEqual(out.stingers, ['victory']);
    out = d.update(base, 3 + DIRECTOR.bossLinger + .5);
    assert.equal(out.songId, before, 'the song from before picks up again');
  }
});

test('the director tells the story: departure, rest, a new land, death', () => {
  const d = new MusicDirector(), base = { context: 'day', chapter: 1, engaged: 0, near: 0, foeHp: 0, playerHp: 100, dead: false, boss: null, checkpoint: '0,0,1,1', region: 'forest', atHome: true };
  const beats = (snap, t) => d.update(snap, t).stingers;
  assert.deepEqual(beats(base, 0), []);
  assert.deepEqual(beats({ ...base, atHome: false }, 1), ['departure']);
  assert.deepEqual(beats({ ...base, atHome: true }, 2), []);
  assert.deepEqual(beats({ ...base, atHome: false }, 3), [], 'one departure a session');
  assert.deepEqual(beats({ ...base, checkpoint: '4,4,2,2' }, 4), ['rest']);
  assert.deepEqual(beats({ ...base, checkpoint: '4,4,2,2', region: 'savanna' }, 5), ['region']);
  assert.deepEqual(beats({ ...base, checkpoint: '4,4,2,2', region: 'fog' }, 30), [], 'a new land at most every 90 s');
  assert.deepEqual(beats({ ...base, checkpoint: '4,4,2,2', region: 'fog', playerHp: 0, dead: true }, 31), ['death']);
});

test('places and chapters come from what the game and save already hold', () => {
  const g = (area, id, extra = {}) => ({ area, map: { landscape: { biome: extra.biome || 'forest' }, ...extra.map }, save: { session: { activeDungeonId: id }, boat: extra.boat }, ...extra.game });
  assert.equal(musicContext(g('overworld')), 'day');
  assert.equal(musicContext(g('overworld', null, { biome: 'fog' })), 'dusk');
  assert.equal(musicContext(g('overworld', null, { boat: { owned: true, aboard: true } })), 'sea');
  assert.equal(musicContext(g('overworld', null, { game: { swimming: true } })), 'sea');
  assert.equal(musicContext(g('overworld', null, { game: { farRealm: { type: 'ink' } } })), 'sky');
  assert.equal(musicContext(g('overworld', null, { biome: 'castle' })), 'halls');
  assert.equal(musicContext(g('dungeon', 'dungeon:abc:g1:4:5:x')), 'dungeon');
  assert.equal(musicContext(g('dungeon', 'the-deep:abc:1')), 'deep');
  assert.equal(musicContext(g('dungeon', 'pentagon:abc:1:2:f1')), 'halls');
  assert.equal(musicContext(g('dungeon', 'castle:abc:1:2:k:3:f1')), 'halls');
  assert.equal(musicContext(g('dungeon', 'building:abc:1:2:keep:3:f1')), 'halls');
  assert.equal(musicContext(g('dungeon', 'skyland:abc:1')), 'sky');
  assert.equal(musicContext(g('dungeon', 'dive:abc:1:2')), 'sea');
  assert.equal(journeyChapter({}), 1);
  assert.equal(journeyChapter({ worldBeasts: { briarStag: { slain: 1 } } }), 2);
  assert.equal(journeyChapter({ consequences: { dungeons: { 'pentagon:s:1:2:f1': {} } } }), 3);
  assert.equal(journeyChapter({ narrative: { journal: [{ recordId: 'far-realm:ink:3,4' }] } }), 4);
  // The game sample reads enemies, the boss and its fall, and changes nothing.
  const boss = { id: 'world-beast:briarStag:1', kind: 'briarStag', worldBeast: 'briarStag', boss: true, aggro: true, hp: 50, x: 3, y: 0 };
  const game = { area: 'overworld', rx: 1, ry: 0, map: { landscape: { biome: 'forest' } }, player: { x: 0, y: 0, hp: 80 }, save: { session: {}, activeCheckpoint: { rx: 0, ry: 0, x: 1, y: 1 } }, enemies: [boss, { id: 'w', aggro: true, hp: 5, x: 2, y: 2 }, { id: 'far', hp: 5, x: 40, y: 0 }, { id: 'amb', ambient: true, hp: 5, x: 1, y: 0 }] };
  const before = JSON.stringify(game), memo = {};
  let snap = sampleMusic(game, memo);
  assert.equal(snap.engaged, 2); assert.equal(snap.near, 0); assert.equal(snap.boss.kind, 'briarStag'); assert.equal(snap.bossDefeated, false);
  assert.equal(JSON.stringify(game), before, 'reading the game changes nothing');
  boss.dead = true; boss.hp = 0; snap = sampleMusic(game, memo);
  assert.equal(snap.bossDefeated, true); assert.equal(snap.boss, null);
});

test('muted means nothing is scheduled; unmuting starts again; pausing quiets', () => {
  const { ctx, eng } = engine();
  const built = ctx.sources.length;
  eng.setMuted(true); eng.setTarget({ songId: 'roadOut', intensity: .8 }); eng.start();
  run(ctx, eng, 0, 30, (t) => { if (t > 10 && t < 10.03) eng.stinger('beast', t); });
  assert.equal(ctx.sources.length, built, 'muted: not one note, not even a stinger or the hiss');
  eng.setMuted(false); run(ctx, eng, 30, 40);
  assert.ok(ctx.sources.length > built + 20);
  eng.setMuted(true); const at = ctx.sources.length; run(ctx, eng, 40, 60);
  assert.equal(ctx.sources.length, at);
  eng.setMuted(false); eng.setPaused(true);
  assert.ok(eng.pauseGain.gain.events.some((e) => e.type === 'target' && e.v === SOUNDTRACK.pause.level));
});

test('deterministic: the same seed and the same game give the same notes; no Math.random anywhere', () => {
  const play = () => { const { ctx, eng } = engine({ seed: 42 }); eng.setTarget({ songId: 'astrolabe', intensity: .5 }); eng.start(); run(ctx, eng, 0, 40); return ctx.sources.map((s) => s.startAt).join(','); };
  assert.equal(play(), play());
  for (const f of ['soundtrack', 'soundtrack-songs', 'soundtrack-director']) assert.doesNotMatch(readFileSync(new URL(`../src/${f}.ts`, import.meta.url), 'utf8'), /Math\.random/);
  const v = voiceLead(null, [9, 0, 4], 50, 74), w = voiceLead(v, [7, 11, 2], 50, 74);
  assert.ok(w.reduce((n, x, i) => n + Math.abs(x - v[i]), 0) <= 6, 'Am to G moves by steps');
});

test('the Soundtrack setting normalises: Adaptive by default, Calm only when chosen', () => {
  assert.equal(DEFAULT_SETTINGS.soundtrack, 'adaptive');
  assert.equal(normalizeSettings({}).soundtrack, 'adaptive');
  assert.equal(normalizeSettings({ soundtrack: 'calm' }).soundtrack, 'calm');
  assert.equal(normalizeSettings({ soundtrack: 'LOUD' }).soundtrack, 'adaptive');
  assert.equal(normalizeSettings(JSON.parse(JSON.stringify(normalizeSettings({ soundtrack: 'calm' })))).soundtrack, 'calm');
  const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(src, /selectSetting\("soundtrack",\[\["adaptive","Adaptive"\],\["calm","Calm only"\]\]\)/);
  assert.match(src, /calmOnly=settings\.soundtrack==="calm"/);
  assert.match(src, /soundtrack\?\.setMuted\(muted\)/);
  assert.doesNotMatch(src, /function startPulse/);
});
