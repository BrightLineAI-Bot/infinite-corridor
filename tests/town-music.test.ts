// Town music (Tim, 2026-11-28): a town has a music context of its own. Entering one starts a town song (and the HUD's
// now-playing title shows it as for any new song); leaving returns to the place's music; a boss or the dino duel in a town
// still wins. Towns: Ember Refuge, the hamlets (hamlet, village, outpost, market town), the old settlements and the towns
// raised where a Listener fell.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, MORE_SONGS, TOWN_SONGS, LINER_NOTES, MUSIC_SELECTION, MUSIC_CONTEXTS, validateSong } from '../src/soundtrack-songs.ts';
import { MusicDirector, DIRECTOR, DUEL, musicContext, inTown, songsFor, sampleMusic, nowPlayingCue } from '../src/soundtrack-director.ts';
import { createSoundtrack } from '../src/soundtrack.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { hamletSection, oldTownSections } from '../src/settlements.ts';

const NEW = ['wellSquare', 'lamplighter'];
const TOWN = ['wellSquare', 'lanternCross', 'lamplighter', 'hearthsmoke'];
const WINDS = ['flute', 'recorder', 'ney'];
const base = { engaged: 0, near: 0, foeHp: 0, playerHp: 100, dead: false, boss: null, bossDefeated: false, checkpoint: null, region: null, atHome: false };
const SEED = 'TOWN-MUSIC';

// One real journey, moved from section to section the way the tests elsewhere do (loadArea builds the section's map).
function journey() { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.enemies = []; return g; }
function goTo(g, rx, ry) { g.rx = rx; g.ry = ry; g.loadArea('overworld'); g.enemies = []; return g; }
// Sections around the start: one with a hamlet built, one nominated that grew none, and plain wild ground.
function findSections(g) {
  const out = { hamlet: null, kinds: new Map(), empty: null, wild: null };
  for (let r = 1; r <= 8; r++) for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r) continue;
    if (hamletSection(SEED, x, y)) {
      if (out.kinds.size >= 4 && out.empty) continue;
      goTo(g, x, y);
      if (g.map.settlement?.procedural) { if (!out.kinds.has(g.map.settlement.kind)) out.kinds.set(g.map.settlement.kind, { rx: x, ry: y }); out.hamlet ||= { rx: x, ry: y }; }
      else out.empty ||= { rx: x, ry: y };
    }
  }
  for (let x = 2; x < 12 && !out.wild; x++) for (let y = 2; y < 12 && !out.wild; y++) {
    if (hamletSection(SEED, x, y) || oldTownSections(SEED).has(`${x},${y}`)) continue;
    goTo(g, x, y);
    if (!g.map.settlement && ['day', 'dusk'].includes(musicContext(g))) out.wild = { rx: x, ry: y };
  }
  return out;
}

test('the two town songs exist, validate, keep the house style and are their own', () => {
  assert.deepEqual(Object.keys(TOWN_SONGS), NEW);
  assert.deepEqual(Object.keys(MORE_SONGS).length, 10, 'the ten more tracks are untouched');
  for (const id of NEW) {
    const song = SONGS[id];
    assert.equal(song, TOWN_SONGS[id], `${id} is on the album`);
    assert.deepEqual(validateSong(song), [], id);
    assert.ok(!song.boss && !song.dark && !song.dissonance, `${id} is no boss theme`);
    assert.ok(song.bpm >= 58 && song.bpm <= 76, `${id}: downtempo`);
    assert.ok(song.leads.filter((v) => WINDS.includes(v)).length / song.leads.length <= .25, `${id}: winds are an occasional answer`);
    for (const tier of ['calm', 'combat', 'drive']) assert.ok(song.drums[tier], `${id}: adaptive ${tier} drums`);
    const note = LINER_NOTES.find((n) => n.id === id);
    assert.ok(note && note.title === song.name && note.moment && note.story.length > 60 && ['torpid', 'urgent', 'awe'].includes(note.feel), `${id}: liner note`);
    assert.ok(!note.menace && !note.beast);
    for (const other of Object.values(SONGS)) {
      if (other === song) continue;
      assert.notDeepEqual(song.chords, other.chords, `${id} repeats the chords of ${other.id}`);
      assert.notEqual(song.name, other.name);
      for (const [name, notes] of Object.entries(song.motifs)) for (const [on, theirs] of Object.entries(other.motifs)) assert.notDeepEqual(notes, theirs, `${id}.${name} repeats ${other.id}.${on}`);
    }
  }
});

test('the town place: at least three town songs in every chapter, opening on a town song of its own; other places unchanged', () => {
  assert.ok(MUSIC_CONTEXTS.includes('town'));
  for (let chapter = 1; chapter <= 4; chapter++) {
    const list = songsFor('town', chapter).map((s) => s.id);
    assert.ok(list.length >= 3, `town ch${chapter}: ${list.length} songs`);
    assert.deepEqual(list.slice().sort(), TOWN.slice().sort(), `town ch${chapter}`);
    assert.equal(list[0], 'wellSquare', 'a town opens on The Well in the Square');
    for (const id of list) assert.ok(!SONGS[id].boss);
  }
  // Every other place keeps its songs and its opener; Lanterns at the Market Cross stays in the day and dusk rotations too.
  const others = MUSIC_SELECTION.filter(([c]) => c !== 'town');
  assert.ok(!others.some(([, id]) => NEW.includes(id)), 'the new songs are the towns\' alone');
  assert.equal(songsFor('day', 1)[0].id, 'roadOut'); assert.equal(songsFor('day', 3)[0].id, 'stormPass');
  assert.equal(songsFor('dusk', 1)[0].id, 'moonlitTower'); assert.equal(songsFor('dungeon', 1)[0].id, 'underhollow');
  assert.ok(songsFor('day', 2).some((s) => s.id === 'lanternCross') && songsFor('dusk', 2).some((s) => s.id === 'lanternCross'));
});

test('a town is detected for every kind of town, and not outside one', () => {
  const g = journey();
  assert.equal(g.area, 'overworld'); assert.equal(`${g.rx},${g.ry}`, '0,0');
  assert.equal(musicContext(g), 'town', 'Ember Refuge');
  const found = findSections(g);
  assert.ok(found.hamlet && found.empty && found.wild, JSON.stringify({ ...found, kinds: [...found.kinds.keys()] }));
  assert.ok(found.kinds.size >= 3, `kinds found: ${[...found.kinds.keys()]}`);
  for (const [kind, at] of found.kinds) { goTo(g, at.rx, at.ry); assert.equal(g.map.settlement.kind, kind); assert.equal(musicContext(g), 'town', `a ${kind}`); }
  goTo(g, found.empty.rx, found.empty.ry); assert.notEqual(musicContext(g), 'town', 'a nominated section that grew no hamlet');
  goTo(g, found.wild.rx, found.wild.ry); assert.ok(['day', 'dusk'].includes(musicContext(g)), 'the wilds');
  // The old settlements (Glasshaven, Coilmarket: world.ts addSettlement), wherever this seed's frame turned them.
  const olds = [...oldTownSections(SEED).keys()].map((k) => k.split(',').map(Number));
  let oldSeen = 0;
  for (const [rx, ry] of olds) { goTo(g, rx, ry); if (!g.map.settlement || g.map.settlement.procedural) continue; oldSeen++; assert.equal(musicContext(g), 'town', `the old settlement ${g.map.settlement.name}`); }
  assert.ok(oldSeen >= 1, 'an old settlement was visited');
  // A town raised where a Listener fell (hometowns.ts), and so a hometown, on wild ground.
  g.save.hometowns = { towns: [{ rx: found.wild.rx, ry: found.wild.ry, name: 'Testmere', listener: 1, mouth: true }], home: `${found.wild.rx},${found.wild.ry}` };
  goTo(g, found.wild.rx, found.wild.ry); assert.equal(musicContext(g), 'town', 'a Listener town, the home');
  g.save.hometowns = { towns: [], home: null };
  // Not a town: a dungeon entered from a town, the sea aboard the boat, a far realm.
  goTo(g, 0, 0);
  const at = (patch) => musicContext({ ...g, ...patch, save: { ...g.save, ...(patch.save || {}) } });
  assert.equal(at({}), 'town');
  assert.equal(at({ area: 'dungeon', save: { session: { activeDungeonId: 'dungeon:abc:g1:0:0:x' } } }), 'dungeon', 'a dungeon below the Refuge');
  assert.equal(at({ area: 'dungeon', save: { session: { activeDungeonId: 'dive:abc:0:0' } } }), 'sea');
  assert.equal(at({ save: { boat: { owned: true, aboard: true } } }), 'sea', 'aboard the boat');
  assert.equal(at({ farRealm: { type: 'giantFolk' } }), 'sky', 'a far realm keeps its own music');
  assert.equal(at({ swimming: true }), 'town', 'a swim in the town pond is still the town');
  // Plain objects (as the older tests build them) without a section are no town.
  assert.equal(inTown({ area: 'overworld', map: {}, save: {} }), false);
  assert.equal(inTown({ area: 'overworld', rx: 0, ry: 0, map: {}, save: {} }), true);
  assert.equal(inTown({ area: 'overworld', rx: 3, ry: 4, map: { settlement: { id: 'x' } }, save: {} }), true);
});

test('entering a town switches to a town song and its title shows; leaving returns to the place; deterministic', () => {
  const walk = (seed) => {
    const d = new MusicDirector({ seed }), log = [];
    const at = (context, from, to) => { for (let t = from; t < to; t += .25) { const out = d.update({ ...base, context, chapter: 2 }, t); if (out.songId !== log.at(-1)?.id) log.push({ id: out.songId, t, change: out.change }); } };
    at('day', 0, 60); at('town', 60, 120); at('day', 120, 180); at('town', 180, 240);
    return log;
  };
  const log = walk(9);
  assert.ok(songsFor('day', 2).some((s) => s.id === log[0].id));
  const entered = log.find((e) => e.t === 60);
  assert.ok(entered && TOWN.includes(entered.id) && entered.change === 'context', `entering: ${JSON.stringify(log)}`);
  assert.equal(entered.id, 'wellSquare', 'the town\'s opener');
  const left = log.find((e) => e.t === 120);
  assert.ok(left && songsFor('day', 2).some((s) => s.id === left.id) && left.change === 'context', 'leaving: the place\'s music again');
  assert.ok(TOWN.includes(log.find((e) => e.t === 180)?.id), 'and back again');
  assert.deepEqual(walk(9), log, 'the same seed, the same songs');
  // A long stay rotates among the town songs only.
  const d = new MusicDirector({ seed: 4 }), heard = new Set();
  for (let t = 0; t < 3 * 3600; t += 1) heard.add(d.update({ ...base, context: 'town', chapter: 3 }, t).songId);
  assert.deepEqual([...heard].sort(), TOWN.slice().sort());
});

// The engine end to end (as tests/soundtrack.test.ts drives it): the director's town song becomes a "switch" event, and the
// now-playing label shows its title.
class FakeParam { constructor(ctx, value = 0) { this.ctx = ctx; this.value = value; } setValueAtTime() { return this; } linearRampToValueAtTime() { return this; } exponentialRampToValueAtTime() { return this; } setTargetAtTime() { return this; } cancelScheduledValues() { return this; } }
class FakeNode { constructor(ctx) { this.ctx = ctx; } connect(n) { return n; } disconnect() {} }
class FakeSource extends FakeNode { constructor(ctx) { super(ctx); this.stopAt = null; this.ended = false; this.onended = null; ctx.sources.push(this); } start() {} stop(t = this.ctx.currentTime) { this.stopAt = t; } }
class FakeContext {
  constructor() { this.currentTime = 0; this.sampleRate = 8000; this.sources = []; this.destination = new FakeNode(this); }
  createGain() { const n = new FakeNode(this); n.gain = new FakeParam(this, 1); return n; }
  createOscillator() { const n = new FakeSource(this); n.frequency = new FakeParam(this, 440); n.detune = new FakeParam(this, 0); return n; }
  createBiquadFilter() { const n = new FakeNode(this); n.frequency = new FakeParam(this, 350); n.Q = new FakeParam(this, 1); return n; }
  createDelay() { const n = new FakeNode(this); n.delayTime = new FakeParam(this, 0); return n; }
  createBufferSource() { return new FakeSource(this); }
  createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { length, getChannelData: (c) => data[c] }; }
  createConvolver() { return new FakeNode(this); }
  advance(t) { this.currentTime = t; for (const s of this.sources) if (!s.ended && s.stopAt != null && s.stopAt <= t) { s.ended = true; s.onended?.(); } this.sources = this.sources.filter((s) => !s.ended); }
}

test('a real journey: the Refuge plays a town song with its title, the road out the place\'s, a hamlet a town song again', () => {
  const g = journey(), found = findSections(g); goTo(g, 0, 0);
  const ctx = new FakeContext(), titles = [], memo = {}, on = { muted: false, level: .5, enabled: true, duel: 'off', paused: false };
  const eng = createSoundtrack(ctx, { timer: false, seed: 5, onEvent: (e) => { if (e.type === 'start' || e.type === 'switch') { const cue = nowPlayingCue(memo, on, e); if (cue) titles.push(cue.title); } } });
  const d = new MusicDirector({ seed: 3 }), mm = {};
  let started = false;
  const play = (from, to) => { for (let t = from; t < to; t += .25) { ctx.advance(t); const out = d.update(sampleMusic(g, mm), t); eng.setTarget(out); if (!started) { eng.start(); started = true; } eng.tick(t); } };
  play(0, 30);
  assert.equal(d.songId, 'wellSquare', 'a journey starts in Ember Refuge, on its town song');
  assert.deepEqual(titles, ['The Well in the Square'], 'and the first song shows its title');
  goTo(g, found.wild.rx, found.wild.ry); play(30, 70);
  assert.ok(songsFor(musicContext(g), 1).some((s) => s.id === d.songId), `out of town: ${d.songId}`);
  assert.equal(titles.length, 2, 'the place\'s song shows its title');
  goTo(g, found.hamlet.rx, found.hamlet.ry); play(70, 110);
  assert.ok(TOWN.includes(d.songId), `a hamlet: ${d.songId}`);
  assert.equal(titles.length, 3); assert.equal(titles[2], SONGS[d.songId].name, 'the town song\'s title');
});

test('a boss or the dino duel in a town still wins; afterwards the town song picks up again', () => {
  const town = (enemies) => ({ area: 'overworld', rx: 0, ry: 0, map: { landscape: { biome: 'forest' } }, player: { x: 16, y: 16, hp: 90 }, save: { session: {}, activeCheckpoint: { rx: 0, ry: 0, x: 1, y: 1 } }, enemies });
  const d = new MusicDirector({ seed: 2 }), memo = {};
  let out = d.update(sampleMusic(town([]), memo), 0);
  assert.equal(out.songId, 'wellSquare');
  const moth = { id: 'world-beast:ashenMoth:0', kind: 'ashenMoth', worldBeast: 'ashenMoth', boss: true, aggro: true, hp: 500, x: 20, y: 16 };
  for (let t = .5; t <= 10; t += .5) out = d.update(sampleMusic(town([moth]), memo), t);
  assert.equal(out.songId, 'cinderWings', 'the boss theme in the Refuge'); assert.equal(out.change, 'boss');
  moth.hp = 0; moth.dead = true;
  for (let t = 10.5; t <= 10.5 + DIRECTOR.bossLinger + 2; t += .5) out = d.update(sampleMusic(town([moth]), memo), t);
  assert.equal(out.songId, 'wellSquare', 'the town song from before picks up again');
  // The dino duel in a town: hushed, as anywhere.
  const spino = { id: 's', kind: DUEL.kinds[0], aggro: true, hp: 900, x: 18, y: 16, pack: {} }, stego = { id: 't', kind: DUEL.kinds[1], aggro: true, hp: 900, x: 20, y: 16, pack: {} };
  const d2 = new MusicDirector({ seed: 2 }), m2 = {};
  d2.update(sampleMusic(town([]), m2), 0);
  for (let t = .5; t <= 6; t += .5) out = d2.update(sampleMusic(town([spino, stego]), m2), t);
  assert.equal(out.duel, 'on'); assert.equal(out.hush, 0, 'the duel hushes the town song');
  assert.equal(sampleMusic(town([spino, stego]), {}).context, 'town', 'the place is still the town under it');
});
