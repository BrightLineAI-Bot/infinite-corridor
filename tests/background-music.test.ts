// Music in background (2026-11-19): the setting, the hide/show decision, the Media Session and the music bridge
// (background-music.ts), driven through stub navigator/document/AudioContext objects.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BACKGROUND_MUSIC, audioPlan, createBackgroundMusic } from '../src/background-music.ts';
import { createSoundtrack, SOUNDTRACK } from '../src/soundtrack.ts';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/persistence.ts';

// ---- stubs ----
class Param {
  constructor(value = 1) { this.value = value; this.events = []; }
  setValueAtTime(v, t) { this.events.push(['set', v, t]); return this; }
  linearRampToValueAtTime(v, t) { this.events.push(['linear', v, t]); this.value = v; return this; }
  exponentialRampToValueAtTime(v, t) { this.events.push(['exp', v, t]); return this; }
  setTargetAtTime(v, t) { this.events.push(['target', v, t]); return this; }
  cancelScheduledValues() { return this; }
}
class Node {
  constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; this.outs = new Set(); ctx.nodes.push(this); }
  connect(n) { this.outs.add(n); return n; }
  disconnect(n) { if (n === undefined) this.outs.clear(); else if (this.outs.has(n)) this.outs.delete(n); else throw new Error('not connected'); }
}
class Source extends Node {
  constructor(ctx, kind) { super(ctx, kind); this.startAt = null; this.stopAt = null; this.ended = false; this.onended = null; ctx.sources.push(this); }
  start(t = 0) { if (t < this.ctx.currentTime - 1e-9) this.ctx.pastStarts++; this.startAt = t; }
  stop(t = this.ctx.currentTime) { this.stopAt = t; }
}
class Ctx {
  constructor({ stream = true } = {}) {
    this.currentTime = 0; this.sampleRate = 8000; this.nodes = []; this.sources = []; this.pastStarts = 0; this.state = 'running'; this.calls = [];
    this.destination = new Node(this, 'destination');
    if (!stream) this.createMediaStreamDestination = undefined;
  }
  createGain() { const n = new Node(this, 'gain'); n.gain = new Param(1); return n; }
  createOscillator() { const n = new Source(this, 'osc'); n.frequency = new Param(440); n.detune = new Param(0); return n; }
  createBiquadFilter() { const n = new Node(this, 'filter'); n.frequency = new Param(350); n.Q = new Param(1); return n; }
  createDelay() { const n = new Node(this, 'delay'); n.delayTime = new Param(0); return n; }
  createBufferSource() { return new Source(this, 'buffer'); }
  createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { length, getChannelData: (c) => data[c] }; }
  createConvolver() { return new Node(this, 'convolver'); }
  createMediaStreamDestination() { const n = new Node(this, 'stream'); n.stream = { id: 'music-stream' }; return n; }
  suspend() { this.calls.push('suspend'); this.state = 'suspended'; return Promise.resolve(); }
  resume() { this.calls.push('resume'); this.state = 'running'; return Promise.resolve(); }
  advance(t) { this.currentTime = t; for (const s of this.sources) if (!s.ended && s.stopAt != null && s.stopAt <= t) { s.ended = true; s.onended?.(); } }
}
function stubDoc({ refuse = false } = {}) {
  const elements = [];
  return { elements, createElement(tag) {
    const el = { tag, attrs: {}, paused: true, srcObject: null, calls: [],
      setAttribute(k, v) { this.attrs[k] = v; },
      play() { this.calls.push('play'); if (refuse) return Promise.reject(new Error('NotAllowedError')); this.paused = false; return Promise.resolve(); },
      pause() { this.calls.push('pause'); const was = this.paused; this.paused = true; if (!was) this.onpause?.(); } };
    elements.push(el); return el;
  } };
}
function stubNav({ session = true, audioSession = true } = {}) {
  const handlers = new Map(), nav = {};
  if (session) nav.mediaSession = { metadata: undefined, playbackState: 'none', handlers,
    setActionHandler(action, fn) { if (action === 'seekto' && fn) throw new Error('unsupported'); if (fn) handlers.set(action, fn); else handlers.delete(action); } };
  if (audioSession) nav.audioSession = { type: 'auto' };
  return nav;
}
class Metadata { constructor(init) { Object.assign(this, init); } }
const spy = (name, log) => (...a) => log.push([name, ...a]);
function rig(options = {}) {
  const ctx = new Ctx(options), doc = stubDoc(options), nav = stubNav(options), log = [];
  const makeup = ctx.createGain(), master = ctx.createGain(); makeup.connect(master); master.connect(ctx.destination);
  const soundtrack = { setMuted: spy('music.setMuted', log), setPaused: spy('music.setPaused', log), setLookahead: spy('music.setLookahead', log) };
  const sfx = { setMuted: spy('sfx.setMuted', log) };
  // A game stub that records any change: the module is never handed it, and nothing here may unpause it.
  const game = { paused: true, setPaused(p) { log.push(['game.setPaused', p]); this.paused = p; } };
  const state = { muted: false };
  const bg = createBackgroundMusic({ nav, doc, MediaMetadata: Metadata });
  const attach = () => bg.attach({ ctx, musicTail: makeup, master, soundtrack, sfx, isMuted: () => state.muted, level: .36 });
  return { ctx, doc, nav, log, makeup, master, soundtrack, sfx, game, state, bg, attach };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

// ---- the setting ----
test('Music in background is off by default, normalised strictly and kept through a save round trip', () => {
  assert.equal(DEFAULT_SETTINGS.backgroundMusic, false);
  assert.equal(normalizeSettings({}).backgroundMusic, false);
  assert.equal(normalizeSettings({ backgroundMusic: true }).backgroundMusic, true);
  for (const junk of ['yes', 1, 'true', null, {}]) assert.equal(normalizeSettings({ backgroundMusic: junk }).backgroundMusic, false, String(junk));
  const stored = JSON.parse(JSON.stringify(normalizeSettings({ backgroundMusic: true, musicVolume: .4, someFutureField: 7 })));
  const back = normalizeSettings(stored);
  assert.equal(back.backgroundMusic, true); assert.equal(back.musicVolume, .4); assert.equal(back.someFutureField, 7, 'unknown fields kept');
  // Older settings without the field stay as they were, and gain only the off default.
  const old = normalizeSettings({ masterVolume: .5, soundtrack: 'calm' });
  assert.equal(old.backgroundMusic, false); assert.equal(old.soundtrack, 'calm'); assert.equal(old.masterVolume, .5);
});

// ---- the decision ----
test('hidden with the option on: the music plays on, effects are muted, the game pauses, the context is not suspended', () => {
  const p = audioPlan({ hidden: true, backgroundMusic: true, muted: false });
  assert.deepEqual(p, { pauseGame: true, background: true, suspendContext: false, resumeContext: false, effectsMuted: true, musicPlaying: true, lookahead: BACKGROUND_MUSIC.lookahead });
});
test('hidden with the option off, muted, music paused from the lock screen, or frozen: everything sleeps as before', () => {
  const asToday = { pauseGame: true, background: false, suspendContext: true, resumeContext: false, musicPlaying: false, lookahead: null };
  for (const extra of [{ backgroundMusic: false }, { backgroundMusic: true, muted: true }, { backgroundMusic: true, musicPaused: true }, { backgroundMusic: true, frozen: true }]) {
    const p = audioPlan({ hidden: true, muted: false, ...extra });
    for (const [k, v] of Object.entries(asToday)) assert.equal(p[k], v, `${JSON.stringify(extra)} ${k}`);
  }
  assert.equal(audioPlan({ hidden: true, backgroundMusic: false, muted: false }).effectsMuted, false, 'effects state untouched when off');
});
test('returning to the page resumes as before, whatever the option', () => {
  for (const backgroundMusic of [true, false]) {
    assert.deepEqual(audioPlan({ hidden: false, backgroundMusic, muted: false }), { pauseGame: false, background: false, suspendContext: false, resumeContext: true, effectsMuted: false, musicPlaying: true, lookahead: null });
    assert.equal(audioPlan({ hidden: false, backgroundMusic, muted: true }).resumeContext, false, 'muted stays asleep');
  }
});

// ---- the controller ----
test('off: hiding suspends the context and touches nothing else; showing resumes it (exactly the old behaviour)', () => {
  const r = rig(); r.attach();
  r.bg.onHidden();
  assert.deepEqual(r.ctx.calls, ['suspend']);
  assert.deepEqual(r.log, [], 'no music, effects or game calls');
  assert.equal(r.doc.elements.length, 0, 'no media element');
  assert.equal(r.nav.mediaSession.handlers.size, 0, 'no media session');
  assert.equal(r.nav.audioSession.type, 'auto');
  assert.deepEqual([...r.makeup.outs], [r.master], 'graph unchanged');
  r.bg.onVisible();
  assert.deepEqual(r.ctx.calls, ['suspend', 'resume']);
  assert.ok(r.log.every(([n]) => n !== 'game.setPaused'));
});

test('on: the music is bridged through a media element, the context keeps running while hidden, effects mute, then all resumes', async () => {
  const r = rig(); r.bg.setEnabled(true); r.attach(); await flush();
  assert.equal(r.bg.status, 'bridge');
  const [el] = r.doc.elements, gain = [...r.makeup.outs][0];
  assert.equal(el.paused, false); assert.equal(el.srcObject.id, 'music-stream'); assert.equal(el.attrs.playsinline, '');
  assert.ok(!r.makeup.outs.has(r.master), 'music no longer reaches the speakers directly');
  assert.equal(gain.gain.value, .36, 'bridged music at the master level'); assert.equal([...gain.outs][0].kind, 'stream');
  assert.equal(r.nav.audioSession.type, 'playback');
  assert.equal(r.nav.mediaSession.metadata.title, 'Infinite Corridor');
  assert.equal(r.nav.mediaSession.playbackState, 'playing');
  assert.deepEqual([...r.nav.mediaSession.handlers.keys()].sort(), ['pause', 'play', 'stop']);

  const plan = r.bg.onHidden();
  assert.equal(plan.background, true); assert.equal(r.bg.active, true);
  assert.ok(!r.ctx.calls.includes('suspend'), 'the music node keeps running');
  assert.deepEqual(r.log, [['sfx.setMuted', true], ['music.setLookahead', BACKGROUND_MUSIC.lookahead], ['music.setPaused', false]]);
  r.log.length = 0;
  r.bg.onVisible();
  assert.equal(r.bg.active, false);
  assert.deepEqual(r.log, [['music.setLookahead', null], ['music.setMuted', false], ['sfx.setMuted', false]]);
  assert.equal(r.game.paused, true, 'returning never unpauses: the pause menu waits for Continue');

  r.bg.setMasterLevel(0, .35); assert.equal(gain.gain.value, 0, 'mute follows onto the bridge');
  r.bg.setEnabled(false);
  assert.deepEqual([...r.makeup.outs], [r.master], 'turning it off restores the direct path');
  assert.equal(el.paused, true); assert.equal(el.srcObject, null);
  assert.equal(r.nav.mediaSession.handlers.size, 0); assert.equal(r.nav.mediaSession.metadata, null); assert.equal(r.nav.mediaSession.playbackState, 'none');
  assert.equal(r.nav.audioSession.type, 'auto', 'the audio session type is put back');
});

test('Media Session play and pause act on the music only and never unpause the game', async () => {
  const r = rig(); r.attach(); r.bg.setEnabled(true); await flush();
  const h = r.nav.mediaSession.handlers, [el] = r.doc.elements;
  r.bg.onHidden(); r.log.length = 0; r.ctx.calls.length = 0;
  h.get('pause')();
  assert.equal(r.bg.musicPaused, true); assert.equal(el.paused, true);
  assert.deepEqual(r.ctx.calls, ['suspend'], 'paused while hidden: the audio clock sleeps too');
  assert.equal(r.nav.mediaSession.playbackState, 'paused');
  h.get('play')();
  assert.equal(r.bg.musicPaused, false); assert.equal(el.paused, false); assert.equal(r.ctx.state, 'running');
  assert.equal(r.nav.mediaSession.playbackState, 'playing');
  h.get('stop')(); h.get('play')();
  // While visible too: the notification's pause silences the music, the game keeps whatever state it had.
  r.bg.onVisible(); h.get('pause')(); h.get('play')();
  assert.equal(r.game.paused, true);
  assert.ok(r.log.every(([n]) => n.startsWith('music.') || n.startsWith('sfx.')), JSON.stringify(r.log));
  assert.ok(!r.log.some(([n]) => n === 'game.setPaused'));
  // The system pausing the element itself (headphones out) counts as a music pause, and still leaves the game alone.
  el.pause(); assert.equal(r.bg.musicPaused, true); assert.equal(r.nav.mediaSession.playbackState, 'paused');
  h.get('play')(); assert.equal(r.bg.musicPaused, false); assert.equal(r.game.paused, true);
  // The module never receives the game, and main.ts gives it no way to resume play.
  const src = readFileSync(new URL('../src/background-music.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /\bgame\b\.|setPaused\(false\)[^;]*game|resume\(\)\s*;?\s*\/\/ game/);
  assert.doesNotMatch(src, /import /, 'no imports: nothing of the game reachable');
});

test('a muted game: hiding sleeps even with the option on, and lock-screen play does not wake sound', async () => {
  const r = rig(); r.state.muted = true; r.attach(); r.bg.setEnabled(true); await flush();
  r.ctx.calls.length = 0;
  assert.equal(r.bg.onHidden().background, false); assert.deepEqual(r.ctx.calls, ['suspend']);
  assert.equal(r.nav.mediaSession.playbackState, 'paused');
});

test('falls back without errors: no MediaStream destination, a refused play(), no Media Session', async () => {
  const a = rig({ stream: false }); a.bg.setEnabled(true); a.attach(); await flush();
  assert.equal(a.bg.status, 'direct'); assert.deepEqual([...a.makeup.outs], [a.master]);
  a.ctx.calls.length = 0; assert.equal(a.bg.onHidden().background, true); assert.deepEqual(a.ctx.calls, [], 'direct path keeps playing');
  const b = rig({ refuse: true }); b.attach(); b.bg.setEnabled(true); await flush();
  assert.equal(b.bg.status, 'direct'); assert.deepEqual([...b.makeup.outs], [b.master], 'refused element: direct path kept');
  assert.equal(b.bg.bridge, null);
  const c = rig({ session: false, audioSession: false }); c.attach(); c.bg.setEnabled(true); await flush();
  assert.equal(c.bg.status, 'bridge'); c.bg.onHidden(); c.bg.pauseMusic(); c.bg.playMusic(); c.bg.onVisible();
  const d = createBackgroundMusic({ nav: {}, doc: undefined }); d.setEnabled(true); assert.equal(d.onHidden().background, true); d.onVisible(); // no audio yet: nothing to do
});

test('the background lookahead keeps the score continuous when timers run once a second', () => {
  // Every note a 25 ms timer would play, from 3 s to 40 s: the same seed schedules the same score whatever the tick rate.
  const play = (lookahead, step) => {
    const ctx = new Ctx(), eng = createSoundtrack(ctx, { timer: false, seed: 5 });
    eng.setTarget({ songId: 'moonlitTower', intensity: .2 }); eng.start(); eng.setLookahead(lookahead);
    for (let t = 0; t < 2; t += .025) { ctx.advance(t); eng.tick(t); }
    const before = eng.stats.pastSkips;
    for (let t = 2; t <= 40.0001; t += step) { ctx.advance(t); eng.tick(t); }
    const starts = ctx.sources.filter((s) => s.kind === 'osc' && s.startAt >= 3 && s.startAt < 39).map((s) => +s.startAt.toFixed(4)).sort((a, b) => a - b);
    return { skips: eng.stats.pastSkips - before, starts, past: ctx.pastStarts, eng };
  };
  const reference = play(null, .025), bg = play(BACKGROUND_MUSIC.lookahead, 1), fg = play(null, 1);
  assert.ok(reference.starts.length > 50);
  assert.equal(bg.skips, 0, 'nothing skipped'); assert.equal(bg.past, 0, 'nothing scheduled in the past');
  assert.deepEqual(bg.starts, reference.starts, 'once-a-second ticks play every note a 25 ms timer would');
  assert.ok(fg.skips > 0 && fg.starts.length < reference.starts.length / 2, 'the visible lookahead would drop most of each second');
  assert.equal(fg.eng.lookahead, SOUNDTRACK.lookahead); bg.eng.setLookahead(null); assert.equal(bg.eng.lookahead, SOUNDTRACK.lookahead);
});

test('main.ts wiring: the game still pauses before the music decision, the option is in Options → Audio', () => {
  const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const vis = src.slice(src.indexOf('document.addEventListener("visibilitychange"'), src.indexOf('// Release 734', src.indexOf('document.addEventListener("visibilitychange"')));
  assert.match(vis, /pause\(false, true\);\s*\/\/[^\n]*\n\s*backgroundMusic\.onHidden\(\)/, 'hidden: pause (exact resume) first');
  assert.match(vis, /addEventListener\("pagehide"[\s\S]*?pause\(false, true\);\s*backgroundMusic\.onHidden/);
  assert.match(vis, /addEventListener\("freeze"[\s\S]*?pause\(false, true\);\s*backgroundMusic\.onHidden\(\{ frozen: true \}\)/);
  assert.doesNotMatch(vis, /\bresume\(\)/, 'nothing here resumes play');
  assert.match(src, /createBackgroundMusic\(\)/, 'created without the game');
  assert.match(src, /settingRow\("Music in background",toggleSetting\("backgroundMusic"\)/);
  assert.match(src, /soundtrack\.setPaused\(game\.paused && !backgroundMusic\.active\)/);
  // A new module ships offline.
  for (const f of ['../scripts/build.mjs', '../sw.js', '../proving-ground/sw.js']) assert.match(readFileSync(new URL(f, import.meta.url), 'utf8'), /background-music/, f);
  // The Proving Ground plays no audio and keeps no settings of its own: nothing to cross over.
  const pg = readFileSync(new URL('../src/proving-ground.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(pg, /background-music|AudioContext|settings-v1/);
});
