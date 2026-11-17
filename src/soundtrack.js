// The soundtrack engine (Tim, 2026-11-14). Plays soundtrack-songs.ts through WebAudio, everything synthesized: no audio files,
// no dependencies, offline. soundtrack-director.ts decides what should play; this module decides when and how.
//
// - Scheduling is the "two clocks" pattern: a 25 ms timer schedules every note that falls in the next 120 ms on the
//   AudioContext clock. Nothing is ever scheduled before the context's current time; a stalled timer skips ahead.
// - Changes are bar-quantised: tiers (calm / combat / driving) change at a bar line, with one "exhale" bar on the way down;
//   a new song starts on a bar line of the old one (SOUNDTRACK.quantum) and crossfades over 1-2 bars, with a bridge (a
//   held drone and a bell on a tone both keys share), the new song's tempo easing in from the old, and its layers
//   entering one by one, so a change reads as turning a page.
// - Voices are bounded: at most SOUNDTRACK.maxVoices sound at once (lower-priority notes are dropped first); every source
//   is stopped when its note ends and its nodes disconnected when it has. One noise buffer and one reverb impulse are
//   built once, never per note.
// - Muted means nothing is scheduled at all. It never reads or writes game state.
import { SONGS, STINGERS, WINDS, stepToSemi, chordSemis, pc, MODES } from "./soundtrack-songs.js?v=r984-93a51644afcb";

export const SOUNDTRACK = {
  lookahead: .12, interval: 25,
  maxVoices: 40, lowMaxVoices: 28,
  // Share of the voice budget each priority may fill: 1 ornaments (arps, bells, edge taps), 2 harmony, 3 pulse and melody.
  share: { 1: .7, 2: .88, 3: 1 },
  // Bars between allowed change points, and crossfade length in bars, by the kind of change the director asks for.
  quantum: { boss: 1, context: 2, chapter: 4, rotate: 8 },
  crossfade: { boss: 1, context: 2, chapter: 2, rotate: 2 },
  easeBars: 2,
  tiers: { up: [.34, .7], down: [.22, .58] },
  duck: { level: .3, attack: .15, release: 1.6 },
  pause: { level: .3, time: .25 },
  hiss: .0022,
  wobble: { base: .012, depth: .0008, rate: .45 },
  // Depth of a song's string tremolo (soundtrack-songs.ts `tremolo`): the level swings between 1 - 2 * depth and 1.
  tremolo: .35,
  reverb: { seconds: 2.6, decay: 2.4, return: .55 },
  echoFeedback: .36,
  pad: [50, 74], bass: [36, 50], drone: [38, 49],
  // Peak gain of each instrument's note before stem and song mix.
  level: {
    strings: .075, choir: .055, drone: .035, bass: .08, harpsichord: .08, lute: .11, dulcimer: .095, bell: .07,
    // Winds about 5 dB under their first mix (2026-11-14, Tim: "a little too flute heavy"); the other lead voices are set
    // to sit at the level the flute did.
    flute: .073, recorder: .062, ney: .082, frame: .34, edge: .12, tom: .26, timp: .28, bridge: .05,
    choirLine: .16, stringLine: .1, cello: .08, horn: .12, celesta: .16,
  },
  // Lead voices: the highest note each sits comfortably at (a line above it drops an octave), and the gain a pluck or
  // bell gets when it carries the melody rather than an arpeggio.
  leadCeiling: { cello: 67, horn: 74, choir: 79, strings: 86, harpsichord: 86, lute: 81, dulcimer: 88, bell: 88, celesta: 91, flute: 88, recorder: 86, ney: 84 },
  leadGain: { harpsichord: 3, lute: 1.9, dulcimer: 1.35, bell: 1.15 },
  // A wind's turn in a fight passes to this voice (no flute doubling in combat).
  combatLead: "strings",
  velocity: { X: 1, x: .75, o: .4 },
  // Stem sends to the shared reverb and echo.
  sends: { reverb: { bed: .8, groove: .25, motion: .8, lead: .9 }, echo: { bed: 0, groove: 0, motion: 1, lead: .7 } },
  // Choir formants (Hz) by vowel: a boss theme's `dark.vowel` darkens its choir.
  vowels: { aah: [720, 1180], oh: [480, 860], oo: [340, 740] },
  // The boss themes' menace devices (soundtrack-songs.ts MENACE_DEVICES; Tim, 2026-11-15: "darker and unsafe"). Peak gains of
  // the menace voices, how much brightness a fully shaded pad loses, the level a drop falls to, and a sag's depth in cents.
  menace: {
    sub: .05, beat: .028, shadow: .6, cluster: .036, growl: .55, pont: .02, rumble: .16, dive: .045, toll: .4, heart: .75, lurch: .7,
    shade: .5, drop: .05, sag: [25, 60],
  },
};
const STEMS = ["bed", "groove", "motion", "lead"];
const DRUM_SET = ["calm", "combat", "drive"];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export function seededRandom(seed) {
  let s = (Number(seed) >>> 0) || 1;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hashText = (text) => { let h = 2166136261; for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const into = (n, lo, hi) => { while (n < lo) n += 12; while (n > hi) n -= 12; return n; };

// Close-position voicings of a chord's pitch classes inside [lo, hi]; the one that moves least from `prev`.
export function voiceLead(prev, pcs, lo, hi) {
  let best = null, bestCost = Infinity;
  for (let r = 0; r < pcs.length; r++) for (const lift of [0, 12]) {
    const order = pcs.slice(r).concat(pcs.slice(0, r)), notes = [];
    let n = lo + lift + pc(order[0] - lo);
    for (let i = 0; i < order.length; i++) { if (i) { n += pc(order[i] - n) || 12; } notes.push(n); }
    if (notes[notes.length - 1] > hi) continue;
    const cost = prev?.length ? notes.reduce((sum, x) => sum + Math.min(...prev.map((p) => Math.abs(p - x))), 0)
      : Math.abs(notes.reduce((a, b) => a + b, 0) / notes.length - (lo + hi) / 2);
    if (cost < bestCost) { bestCost = cost; best = notes; }
  }
  return best || pcs.map((p) => into(lo + pc(p - lo), lo, hi)).sort((a, b) => a - b);
}
// The pitch class two keys share that best bridges them: the new tonic if the old scale holds it, else the old tonic, else any.
export function bridgeTone(from, to) {
  const scale = (s) => new Set(MODES[s.mode].map((x) => pc(s.root + x))), a = scale(from), b = scale(to);
  if (a.has(pc(to.root))) return pc(to.root);
  if (b.has(pc(from.root))) return pc(from.root);
  for (const p of b) if (a.has(p)) return p;
  return pc(to.root);
}
// A song's lead motifs indexed by grid step (0-31) once, not per note.
const motifIndex = new WeakMap();
function motifSteps(song, name) {
  let all = motifIndex.get(song);
  if (!all) { all = {}; motifIndex.set(song, all); }
  if (!all[name]) { const m = new Map(); for (const note of song.motifs[name] || []) { if (!m.has(note[0])) m.set(note[0], []); m.get(note[0]).push(note); } all[name] = m; }
  return all[name];
}

export class Soundtrack {
  constructor(ctx, options = {}) {
    this.ctx = ctx; this.songs = options.songs || SONGS; this.stingerTable = options.stingers || STINGERS;
    this.quality = options.quality || "balanced"; this.onEvent = options.onEvent || null; this.useTimer = options.timer !== false;
    this.rand = seededRandom(options.seed ?? 7); this.seed = options.seed ?? 7;
    this.decks = []; this.retired = []; this.live = []; this.timer = null; this.hissSource = null;
    this.target = { songId: null, intensity: 0, change: "context" };
    this.muted = false; this.paused = false; this.running = false;
    this.stats = { voices: 0, peakVoices: 0, dropped: 0, notes: 0, liveNodes: 0, pastSkips: 0 };
    this.maxVoices = this.quality === "low" ? SOUNDTRACK.lowMaxVoices : SOUNDTRACK.maxVoices;
    this.buildGraph(options.out || ctx.destination, options.echo || null);
  }
  buildGraph(out, echo) {
    const ctx = this.ctx, S = SOUNDTRACK, low = this.quality === "low";
    // One high-pass at the output: nothing below 40 Hz (phones cannot play it and it only spends headroom).
    this.floor = ctx.createBiquadFilter(); this.floor.type = "highpass"; this.floor.frequency.value = 40; this.floor.Q.value = .7; this.floor.connect(out); out = this.floor;
    this.out = out; this.mix = ctx.createGain(); this.duck = ctx.createGain(); this.pauseGain = ctx.createGain(); this.stingBus = ctx.createGain(); this.stingUntil = 0;
    // `hush` (setHush): the score's own level, faded out while the dinosaurs duel; story beats (the stingBus) pass it by.
    this.hush = ctx.createGain(); this.hushLevel = 1;
    this.mix.connect(this.duck); this.duck.connect(this.hush); this.hush.connect(this.pauseGain); this.stingBus.connect(this.pauseGain);
    // Tape wow: the whole score through one short delay whose time drifts (skipped on the low tier).
    if (!low) {
      this.wobble = ctx.createDelay(.1); this.wobble.delayTime.value = S.wobble.base;
      this.wobbleLfo = ctx.createOscillator(); this.wobbleLfo.frequency.value = S.wobble.rate;
      this.wobbleDepth = ctx.createGain(); this.wobbleDepth.gain.value = S.wobble.depth;
      this.wobbleLfo.connect(this.wobbleDepth); this.wobbleDepth.connect(this.wobble.delayTime); this.wobbleLfo.start();
      this.pauseGain.connect(this.wobble); this.wobble.connect(out);
    } else this.pauseGain.connect(out);
    // One shared noise buffer (drum skins, breath, hiss), seeded so tests and previews repeat.
    const len = Math.floor(ctx.sampleRate), buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0), r = seededRandom(this.seed + 99);
    for (let i = 0; i < len; i++) data[i] = r() * 2 - 1;
    this.noise = buf;
    // Reverb: one convolver with a generated, darkened decaying-noise impulse (built once). Low tier: the echo only.
    this.revIn = ctx.createGain();
    if (!low && ctx.createConvolver) {
      // Mono and under three seconds: convolution is the engine's largest cost, and this halves it.
      const n = Math.floor(ctx.sampleRate * S.reverb.seconds), ir = ctx.createBuffer(1, n, ctx.sampleRate);
      for (let ch = 0; ch < 1; ch++) { const d = ir.getChannelData(ch); let lp = 0; for (let i = 0; i < n; i++) { lp += ((r() * 2 - 1) - lp) * .35; d[i] = lp * Math.exp(-i / ctx.sampleRate * 6.9 / S.reverb.decay); } }
      this.reverb = ctx.createConvolver(); this.reverb.buffer = ir; this.revOut = ctx.createGain(); this.revOut.gain.value = S.reverb.return;
      this.revIn.connect(this.reverb); this.reverb.connect(this.revOut); this.revOut.connect(this.duck);
    }
    // Echo: the game's echo delay (main.ts) fed from the arps and lead, with a darkened feedback path; tempo-synced per song.
    this.echoSend = ctx.createGain(); this.echoTone = ctx.createBiquadFilter(); this.echoTone.type = "lowpass"; this.echoTone.frequency.value = 2400;
    this.echo = echo || ctx.createDelay(1);
    if (!echo) this.echo.connect(this.duck);
    this.echoFeedback = ctx.createGain(); this.echoFeedback.gain.value = S.echoFeedback;
    this.echoSend.connect(this.echoTone); this.echoTone.connect(this.echo); this.echo.connect(this.echoFeedback); this.echoFeedback.connect(this.echoTone);
    if (low) this.revIn.connect(this.echoSend);
    this.stingBus.connect(this.revIn);
  }
  emit(event) { try { this.onEvent?.(event); } catch { /* listeners never stop the music */ } }
  now() { return this.ctx.currentTime; }

  // ---- control ----
  start() {
    if (this.running) return; this.running = true;
    if (!this.muted) this.resume();
  }
  resume() {
    if (this.useTimer && !this.timer) this.timer = setInterval(() => this.tick(), SOUNDTRACK.interval);
    this.startHiss();
  }
  stop() { this.running = false; this.halt(); }
  halt() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const t = this.now();
    for (const d of this.decks) { d.gain.gain.cancelScheduledValues(t); d.gain.gain.setValueAtTime(d.gain.gain.value, t); d.gain.gain.linearRampToValueAtTime(0, t + .3); d.endAt = t; this.retire(d, t); }
    this.decks = [];
    if (this.hissSource) { try { this.hissSource.stop(t + .05); } catch { /* already stopped */ } this.hissSource = null; }
  }
  setMuted(muted) {
    muted = !!muted; if (muted === this.muted) return; this.muted = muted;
    if (muted) this.halt(); else if (this.running) this.resume();
  }
  setPaused(paused) {
    paused = !!paused; if (paused === this.paused) return; this.paused = paused;
    const t = this.now(), g = this.pauseGain.gain; g.cancelScheduledValues(t); g.setTargetAtTime(paused ? SOUNDTRACK.pause.level : 1, t, SOUNDTRACK.pause.time);
  }
  // The score's level (0-1) reached over `seconds` from where it is now: the dino duel's fade out and back (soundtrack-director.ts DUEL).
  setHush(level, seconds = 1.5, now = this.now()) {
    level = Math.max(0, Math.min(1, Number(level) || 0)); if (level === this.hushLevel) return false; this.hushLevel = level;
    const g = this.hush.gain, from = Math.max(0, Math.min(1, Number(g.value)));
    g.cancelScheduledValues(now); g.setValueAtTime(from, now); g.linearRampToValueAtTime(level, now + Math.max(.05, seconds));
    this.emit({ type: "hush", level, at: now, seconds });
    return true;
  }
  setQuality(quality) {
    this.quality = quality; this.maxVoices = quality === "low" ? SOUNDTRACK.lowMaxVoices : SOUNDTRACK.maxVoices;
    if (quality === "low" && this.hissSource) { try { this.hissSource.stop(); } catch { /* fine */ } this.hissSource = null; } else if (!this.muted && this.running) this.startHiss();
  }
  // { songId, intensity 0-1, change: "boss" | "context" | "chapter" | "rotate" }
  setTarget(target = {}) {
    if (target.songId && this.songs[target.songId]) this.target.songId = target.songId;
    if (Number.isFinite(target.intensity)) this.target.intensity = Math.max(0, Math.min(1, target.intensity));
    if (target.change) this.target.change = target.change;
  }
  startHiss() {
    if (this.hissSource || this.quality === "low" || this.muted || !this.running) return;
    const ctx = this.ctx, src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise; src.loop = true; hp.type = "highpass"; hp.frequency.value = 3800; g.gain.value = SOUNDTRACK.hiss;
    src.connect(hp); hp.connect(g); g.connect(this.pauseGain); src.start(this.now());
    src.onended = () => { src.disconnect(); hp.disconnect(); g.disconnect(); };
    this.hissSource = src;
  }
  current() { for (let i = this.decks.length - 1; i >= 0; i--) if (this.decks[i].endAt === Infinity) return this.decks[i]; return this.decks[this.decks.length - 1] || null; }
  state() { const d = this.current(); return { songId: d?.song.id || null, tier: d?.tier ?? 0, bar: d?.bar ?? 0, decks: this.decks.length, intensity: this.target.intensity, voices: this.liveVoices(this.now()) }; }

  // ---- the clock ----
  tick(now = this.now()) {
    if (!this.running || this.muted) return;
    if (!this.decks.length && this.target.songId) {
      const d = this.newDeck(this.songs[this.target.songId], now + .08, 2.5, null);
      d.motionFrom = 1; d.leadFrom = 2;
      this.emit({ type: "start", songId: d.song.id, at: d.start });
    }
    const horizon = now + SOUNDTRACK.lookahead;
    for (let i = 0; i < this.decks.length; i++) {
      const d = this.decks[i];
      if (d.next < now) this.catchUp(d, now);
      while (d.next < horizon && d.next < d.endAt) this.step(d, now);
    }
    for (const d of this.decks) if (d.next >= d.endAt) this.retire(d, d.endAt);
    this.decks = this.decks.filter((d) => d.next < d.endAt);
    // Never more than three decks, even if changes pile up: the oldest goes at once.
    while (this.decks.length > 3) { const d = this.decks.shift(); d.endAt = now; this.retire(d, now); }
    this.retired = this.retired.filter((d) => { if (now < d.retireAt) return true; for (const n of d.nodes) try { n.disconnect(); } catch { /* gone */ } return false; });
  }
  retire(d, at) { if (d.retireAt === Infinity) { d.retireAt = at + 7; this.retired.push(d); } }
  // The timer stalled (a background tab, a long frame): skip the missed steps without playing them.
  catchUp(d, now) {
    let skipped = 0;
    while (d.next < now && d.next < d.endAt) { this.advance(d); skipped++; }
    if (skipped) { this.stats.pastSkips += skipped; d.needBed = true; }
  }
  advance(d) {
    d.next += d.stepDur; d.step++;
    if (d.step === 16) { d.step = 0; d.bar++; }
    if (d.ease) { const k = Math.min(1, (d.bar * 16 + d.step) / (d.ease.bars * 16)); d.stepDur = d.ease.from + (d.baseStep - d.ease.from) * k; if (k >= 1) d.ease = null; }
  }
  newDeck(song, start, fadeIn, from) {
    const ctx = this.ctx, S = SOUNDTRACK, g = ctx.createGain(), nodes = [g];
    g.gain.setValueAtTime(fadeIn > 0 ? 0 : 1, start); if (fadeIn > 0) g.gain.linearRampToValueAtTime(1, start + fadeIn);
    g.connect(this.mix);
    const stems = {};
    for (const k of STEMS) {
      const s = ctx.createGain(); s.gain.value = song.mix[k]; s.connect(g); stems[k] = s; nodes.push(s);
      const rv = S.sends.reverb[k] * song.reverb, ec = S.sends.echo[k] * song.echo;
      if (rv > 0) { const r = ctx.createGain(); r.gain.value = rv; s.connect(r); r.connect(this.revIn); nodes.push(r); }
      if (ec > 0) { const e = ctx.createGain(); e.gain.value = ec; s.connect(e); e.connect(this.echoSend); nodes.push(e); }
    }
    const base = 15 / song.bpm;
    const d = {
      song, start, next: start, bar: 0, step: 0, baseStep: base, stepDur: from ? from.stepDur : base,
      ease: from && Math.abs(from.stepDur - base) > 1e-6 ? { from: from.stepDur, bars: S.easeBars } : null,
      gain: g, stems, nodes, tier: this.tierFor(this.intensityFor(song), 0), exhale: false, chordSpec: null, voicing: null,
      bassNote: null, form: null, leadPhrase: false, lead: false, motionOn: false, motionFrom: 0, leadFrom: 0, needBed: false,
      endAt: Infinity, retireAt: Infinity, rand: seededRandom(hashText(song.id) ^ this.seed ^ Math.floor(start * 1000)),
    };
    if (this.echo?.delayTime) { const beat = 60 / song.bpm, t = Math.max(start, this.now()); this.echo.delayTime.setTargetAtTime(Math.min(.95, beat * .75), t, .4); }
    this.decks.push(d);
    return d;
  }
  intensityFor(song) { return Math.max(this.target.intensity, song.intensityFloor || 0); }
  tierFor(i, cur) {
    const T = SOUNDTRACK.tiers, up = i >= T.up[1] ? 2 : i >= T.up[0] ? 1 : 0, down = i >= T.down[1] ? 2 : i >= T.down[0] ? 1 : 0;
    return up > cur ? up : down < cur ? down : cur;
  }

  // ---- one sixteenth ----
  step(d, now) {
    const t = d.next, s = d.step, song = d.song;
    if (s === 0) this.barStart(d, t);
    const at = t + (s % 2 ? song.swing * d.stepDur : 0);
    if (at >= now) {
      const drums = song.drums[DRUM_SET[d.tier]] || {};
      for (const voice in drums) { const c = drums[voice][s]; if (c && c !== ".") this.drum(d, voice, at, c); }
      for (const [start, tone, len] of song.bass[d.tier ? "combat" : "calm"]) if (start === s) this.bassNote(d, at, tone, len * d.stepDur);
      if (d.motionOn) { const ch = song.arps[d.tier >= 2 ? "busy" : "calm"][s]; if (ch && ch !== ".") this.arpNote(d, at + d.rand() * .006, Number(ch), s === 0); }
      if (d.lead) for (const [, step, len] of d.leadSteps.get((d.bar % 2) * 16 + s) || []) this.leadNote(d, at + d.rand() * .008, song.root + 12 * song.leadOct + stepToSemi((d.key || song).mode, step), len * d.stepDur);
      if (song.dark) this.menaceStep(d, at, s);
    } else this.stats.pastSkips++;
    this.advance(d);
  }
  barStart(d, t) {
    const song = d.song, idx = d.bar % 8, barDur = 16 * d.stepDur, S = SOUNDTRACK;
    if (d === this.current() && d.endAt === Infinity) this.maybeSwitch(d, t);
    // Tiers rise at once on the bar; they fall after one exhale bar in which the pulse fades.
    const want = this.tierFor(this.intensityFor(song), d.tier), groove = d.stems.groove.gain, full = song.mix.groove;
    if (want > d.tier) { groove.cancelScheduledValues(t); groove.setValueAtTime(full * .4, t); groove.linearRampToValueAtTime(full, t + barDur * .5); d.tier = want; d.exhale = false; }
    else if (want < d.tier && !d.exhale) { d.exhale = true; groove.cancelScheduledValues(t); groove.setValueAtTime(full, t); groove.linearRampToValueAtTime(full * .35, t + barDur); }
    else if (want < d.tier) { d.tier = want; d.exhale = false; groove.cancelScheduledValues(t); groove.setValueAtTime(full * .5, t); groove.linearRampToValueAtTime(full, t + barDur * .5); }
    else if (d.exhale) { d.exhale = false; groove.cancelScheduledValues(t); groove.setValueAtTime(full * .5, t); groove.linearRampToValueAtTime(full, t + barDur * .5); }
    if (idx === 0 || !d.form) {
      const phrase = Math.floor(d.bar / 8);
      d.form = song.forms[phrase === 0 ? 0 : Math.floor(d.rand() * song.forms.length)];
      d.leadPhrase = !!song.leadPlan[phrase % song.leadPlan.length] || d.tier > 0;
      // A song with `modes` (a shape-shifter) turns to the next mode each phrase: its chords and lines keep their degrees, their colour shifts.
      const mode = song.modes ? song.modes[phrase % song.modes.length] : song.mode;
      d.key = mode === song.mode ? song : { root: song.root, mode };
      this.emit({ type: "phrase", songId: song.id, at: t, phrase, form: d.form });
    }
    if (d.tier > 0 && !d.leadPhrase && idx % 2 === 0) d.leadPhrase = true;
    d.leadSteps = motifSteps(song, d.form[Math.floor(idx / 2)]);
    // Who sings this phrase: the song's leads in turn; a wind's turn passes to the strings once a fight starts.
    const voice = song.leads[Math.floor(d.bar / 8) % song.leads.length];
    d.leadKind = d.tier > 0 && WINDS.includes(voice) ? song.combatLead || S.combatLead : voice;
    d.lead = d.leadPhrase && d.bar >= d.leadFrom;
    d.motionOn = d.bar >= d.motionFrom && (d.tier > 0 || song.arps.motionCalm !== false);
    const spec = song.chords[idx];
    if (spec !== d.chordSpec || idx === 0 || d.needBed) {
      let hold = 1; while (idx + hold < 8 && song.chords[idx + hold] === spec) hold++;
      this.bed(d, t, spec, hold * barDur);
      d.chordSpec = spec;
    }
    if (song.pedal && (idx === 0 || d.needBed)) this.drone(d.stems.bed, t, into(song.root, S.drone[0], S.drone[1]), 8 * barDur + 1.5, 1, 2);
    if (song.dark) this.menaceBar(d, t, idx, barDur);
    d.needBed = false;
    this.emit({ type: "bar", songId: song.id, at: t, bar: d.bar, tier: d.tier });
  }
  maybeSwitch(d, t) {
    const tg = this.target, song = this.songs[tg.songId];
    if (!song || song === d.song) return;
    const S = SOUNDTRACK, q = S.quantum[tg.change] || 2;
    if (d.bar % q !== 0) return;
    const xf = (S.crossfade[tg.change] || 2) * 16 * d.stepDur;
    d.endAt = t + xf; d.gain.gain.cancelScheduledValues(t); d.gain.gain.setValueAtTime(1, t); d.gain.gain.linearRampToValueAtTime(0, t + xf);
    const nd = this.newDeck(song, t, xf * .8, d), urgent = this.intensityFor(song) >= S.tiers.up[0];
    nd.motionFrom = urgent ? 0 : 1; nd.leadFrom = urgent ? 0 : 2;
    this.bridge(d.song, song, t, xf);
    this.emit({ type: "switch", from: d.song.id, to: song.id, at: t, fromStart: d.start, fromBar: d.bar, change: tg.change });
  }
  // The page turn: a drone and a distant bell on the tone both keys share, held across the crossfade.
  bridge(from, to, t, xf) {
    const tone = bridgeTone(from, to), S = SOUNDTRACK;
    this.drone(this.mix, t, into(tone + 48, S.drone[0] + 6, S.drone[1] + 6), xf + 2.5, .8, 1.2, 3);
    // Into a dark boss theme the bell is quieter and colder: no sweet tone over its tonic.
    this.bell(this.mix, t + .02, into(tone + 72, 72, 83), to.dark ? .45 : .7, to.dark ? 1 : 0);
  }

  // ---- parts ----
  bed(d, t, spec, dur) {
    const song = d.song, S = SOUNDTRACK, semis = chordSemis(d.key || song, spec), pcs = semis.map((s) => pc(song.root + s));
    d.voicing = voiceLead(d.voicing, pcs, S.pad[0], S.pad[1]);
    // A dark theme's pads lose part of their top (`dark.shade`).
    const bright = (1 + .3 * d.tier) * (1 - S.menace.shade * (song.dark?.shade || 0)), dest = d.stems.bed;
    if (song.pad !== "choir") this.strings(dest, t, d.voicing, dur + .3, song.pad === "both" ? .8 : 1, bright, song.tremolo || 0);
    if (song.pad !== "strings") this.choir(dest, t, d.voicing, dur + .3, song.pad === "both" ? .7 : 1, song.dark?.vowel);
    if (!song.pedal) this.drone(dest, t, into(song.root + semis[0], S.drone[0], S.drone[1]), dur + .6, .8, 1.5);
    if (song.dark) this.menaceBed(d, t, semis, dur);
  }
  bassNote(d, t, tone, dur) {
    const song = d.song, S = SOUNDTRACK, semis = chordSemis(d.key || song, d.chordSpec || song.chords[d.bar % 8]);
    // T and b (a dark theme's listed dissonance): the tritone and the minor 2nd over the chord root.
    const semi = tone === "P" ? 0 : tone === "3" ? semis[1] : tone === "5" ? semis[2] : tone === "7" ? (semis[3] ?? semis[2]) : tone === "T" ? semis[0] + 6 : tone === "b" ? semis[0] + 1 : semis[0];
    let n = into(song.root + semi, S.bass[0], S.bass[1]);
    if (d.bassNote != null && tone !== "P") { const alt = n + 12 <= S.bass[1] + 2 ? n + 12 : n - 12; if (alt >= S.bass[0] - 2 && Math.abs(alt - d.bassNote) < Math.abs(n - d.bassNote)) n = alt; }
    d.bassNote = n;
    this.bass(d.stems.groove, t, tone === "8" ? n + 12 : n, dur, (tone === "P" ? .7 : 1) * (d.tier ? 1 : .7));
  }
  arpNote(d, t, i, accent) {
    const song = d.song, tones = d.voicing || [song.root + 12], lift = 12 * (song.arpOct ?? 1), n = tones.length;
    const midi = tones[i % n] + lift + 12 * Math.floor(i / n), vel = (accent ? 1 : .78) * (.92 + d.rand() * .16);
    // A dark theme's bells ring colder (the other plucks take no fifth argument).
    this[song.arp](d.stems.motion, t, midi, vel, song.dark?.shade || 0);
  }
  leadNote(d, t, midi, dur) {
    // `dark.sag`: the chance a held note (over a second) sags in pitch as it fades; its oscillators are collected to bend them.
    const k = d.song.dark, sag = k?.sag && dur > 1 && d.rand() < k.sag ? [] : null;
    this.made = sag;
    this.playLead(d.stems.lead, t, midi, dur, .9 + d.rand() * .1, d.leadKind || d.song.leads[0], k);
    this.made = null;
    if (sag?.length) this.sag(sag, t, dur, d.rand());
  }
  // One melody note in a given voice, dropped by octaves into that voice's range. `dark`: a boss theme's devices (vowel, cold bells).
  playLead(dest, t, midi, dur, vel, kind, dark = null) {
    const top = SOUNDTRACK.leadCeiling[kind] ?? 88;
    while (midi > top) midi -= 12;
    if (WINDS.includes(kind)) this.wind(dest, t, midi, dur * .8, vel, kind);
    // A dark theme's sung melody darkens only to "oh", so it still carries over the pad.
    else if (kind === "choir") this.choirLine(dest, t, midi, dur, vel, dark?.vowel ? "oh" : "aah");
    else if (kind === "strings" || kind === "cello") this.stringLine(dest, t, midi, dur, vel, kind === "cello");
    else if (kind === "horn") this.horn(dest, t, midi, dur, vel);
    else if (kind === "celesta") this.celesta(dest, t, midi, vel);
    else if (kind === "bell") this.bell(dest, t, midi, vel * SOUNDTRACK.leadGain.bell, dark?.shade || 0);
    else {
      // A plucked melody (harpsichord, lute, dulcimer): a long note is struck again halfway, softer.
      const v = vel * (SOUNDTRACK.leadGain[kind] || 1);
      this[kind](dest, t, midi, v);
      if (dur > 1.6) this[kind](dest, t + dur / 2, midi, v * .7);
    }
  }
  drum(d, voice, t, c) {
    // `dark.skip`: now and then a soft hit of the pulse is missing (never an accent).
    const skip = d.song.dark?.skip;
    if (skip && c !== "X" && d.rand() < skip) return;
    const v = SOUNDTRACK.velocity[c] || .7, dest = d.stems.groove;
    if (voice === "frame") { if (c === "o") this.edge(dest, t, v); else this.frame(dest, t, v); }
    else if (voice === "tom") this.tom(dest, t, v);
    else if (voice === "timp") this.timp(dest, t, into(d.song.root, 38, 49), v);
  }

  // ---- voices ----
  liveVoices(t) { this.live = this.live.filter((e) => e > t); return this.live.length; }
  // Reserve a voice from t to end, or refuse (the note is dropped) when the budget for its priority is spent.
  claim(priority, t, end) {
    const n = this.liveVoices(t), limit = Math.floor(this.maxVoices * SOUNDTRACK.share[priority]);
    if (n >= limit) { this.stats.dropped++; return false; }
    this.live.push(end); this.stats.notes++;
    if (n + 1 > this.stats.peakVoices) this.stats.peakVoices = n + 1;
    return true;
  }
  // Stop the sources at `end` and disconnect every node of the note once it has ended.
  finish(sources, nodes, end) {
    for (const s of sources) s.stop(end);
    this.stats.liveNodes += nodes.length;
    sources[0].onended = () => { for (const n of nodes) try { n.disconnect(); } catch { /* gone */ } this.stats.liveNodes -= nodes.length; };
    this.emit({ type: "note", at: sources[0]._startedAt, end, nodes: nodes.length });
  }
  osc(type, freq, t) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.start(t); o._startedAt = t; this.made?.push(o); return o; }
  gain(v = 1) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  filter(type, f, q = .7) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  noiseSource(t) { const n = this.ctx.createBufferSource(); n.buffer = this.noise; n.loop = true; n.start(t, this.rand() * .8); n._startedAt = t; return n; }
  // Percussive envelope: up in `a`, exponential fall to silence by t + a + decay.
  hit(param, t, a, peak, decay) { param.setValueAtTime(0, t); param.linearRampToValueAtTime(peak, t + a); param.exponentialRampToValueAtTime(.0001, t + a + decay); }
  // Sustained envelope: up in `a`, held, released over `rel` before `end`.
  swell(param, t, a, peak, end, rel) { param.setValueAtTime(0, t); param.linearRampToValueAtTime(peak, t + Math.min(a, (end - t) * .5)); param.setValueAtTime(peak, Math.max(t + Math.min(a, (end - t) * .5), end - rel)); param.linearRampToValueAtTime(0, end); }

  // `trem` (Hz): bowed tremolo, one LFO on the section's level (not a voice of its own).
  strings(dest, t, notes, dur, vel, bright, trem = 0) {
    const L = SOUNDTRACK.level.strings * vel / Math.sqrt(notes.length), end = t + dur + 1.4, f = this.filter("lowpass", 700 * bright, .5), g = this.gain(0), src = [];
    f.frequency.setValueAtTime(900 * bright, t); f.frequency.linearRampToValueAtTime(2600 * bright, t + Math.min(dur, 4));
    this.swell(g.gain, t, 1.2, L, end, 1.4); f.connect(g);
    const extra = [];
    if (trem > 0) {
      const D = SOUNDTRACK.tremolo, tg = this.gain(1 - D), lfo = this.osc("sine", trem, t), lg = this.gain(D);
      lfo.connect(lg); lg.connect(tg.gain); g.connect(tg); tg.connect(dest); extra.push(lfo, lg, tg);
    } else g.connect(dest);
    for (const m of notes) {
      if (!this.claim(2, t, end)) continue;
      for (const cents of [-7, 6]) { const o = this.osc("sawtooth", mtof(m), t); o.detune.value = cents + (this.rand() - .5) * 4; o.connect(f); src.push(o); }
    }
    if (src.length) this.finish([...src, ...extra.slice(0, 1)], [...src, f, g, ...extra], end);
    else { if (extra.length) extra[0].stop(t); for (const n of [f, g, ...extra]) n.disconnect(); }
  }
  // A choir "aah": a saw stack through two vowel formants.
  choir(dest, t, notes, dur, vel, vowel = "aah", rel = 1.8) {
    const [v1, v2] = SOUNDTRACK.vowels[vowel] || SOUNDTRACK.vowels.aah;
    const L = SOUNDTRACK.level.choir * vel / Math.sqrt(notes.length), end = t + dur + rel, g = this.gain(0), f1 = this.filter("bandpass", v1, 3.5), f2 = this.filter("bandpass", v2, 5), g2 = this.gain(.6), src = [];
    this.swell(g.gain, t, 1.6, L * 2.6, end, rel); f1.connect(g); f2.connect(g2); g2.connect(g); g.connect(dest);
    for (const m of notes) {
      if (!this.claim(2, t, end)) continue;
      const o = this.osc("sawtooth", mtof(m), t); o.detune.value = (this.rand() - .5) * 10; o.connect(f1); o.connect(f2); src.push(o);
    }
    if (src.length) this.finish(src, [...src, f1, f2, g2, g], end); else for (const n of [f1, f2, g2, g]) n.disconnect();
  }
  drone(dest, t, midi, dur, vel = 1, attack = 2, priority = 2) {
    const end = t + dur; if (!this.claim(priority, t, end)) return;
    const a = this.osc("sine", mtof(midi), t), b = this.osc("triangle", mtof(midi + 12), t), bg = this.gain(.25), f = this.filter("lowpass", 700), g = this.gain(0);
    b.detune.value = 4; a.connect(f); b.connect(bg); bg.connect(f); f.connect(g); g.connect(dest);
    this.swell(g.gain, t, attack, SOUNDTRACK.level.drone * vel, end, Math.min(2, dur * .4));
    this.finish([a, b], [a, b, bg, f, g], end);
  }
  bass(dest, t, midi, dur, vel) {
    const end = t + dur + .12; if (!this.claim(3, t, end)) return;
    const a = this.osc("sine", mtof(midi), t), b = this.osc("triangle", mtof(midi + 12), t), bg = this.gain(.3), f = this.filter("lowpass", 650), g = this.gain(0);
    a.connect(f); b.connect(bg); bg.connect(f); f.connect(g); g.connect(dest);
    this.swell(g.gain, t, dur > 2 ? .4 : .015, SOUNDTRACK.level.bass * vel, end, .12);
    this.finish([a, b], [a, b, bg, f, g], end);
  }
  harpsichord(dest, t, midi, vel) {
    const end = t + 1.3; if (!this.claim(1, t, end)) return;
    const a = this.osc("sawtooth", mtof(midi), t), b = this.osc("square", mtof(midi + 12), t), bg = this.gain(.18), hp = this.filter("highpass", 260), f = this.filter("lowpass", 6500, 1.2), g = this.gain(0);
    f.frequency.setValueAtTime(6500, t); f.frequency.exponentialRampToValueAtTime(1800, t + .25);
    a.connect(hp); b.connect(bg); bg.connect(hp); hp.connect(f); f.connect(g); g.connect(dest);
    this.hit(g.gain, t, .002, SOUNDTRACK.level.harpsichord * vel, 1.2);
    this.finish([a, b], [a, b, bg, hp, f, g], end);
  }
  lute(dest, t, midi, vel) {
    const end = t + 1.1; if (!this.claim(1, t, end)) return;
    const a = this.osc("triangle", mtof(midi), t), b = this.osc("sawtooth", mtof(midi), t), bg = this.gain(.3), f = this.filter("lowpass", 2400, 1), g = this.gain(0);
    b.detune.value = 3; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(800, t + .35);
    a.connect(f); b.connect(bg); bg.connect(f); f.connect(g); g.connect(dest);
    this.hit(g.gain, t, .004, SOUNDTRACK.level.lute * vel, 1);
    this.finish([a, b], [a, b, bg, f, g], end);
  }
  // Hammered dulcimer: two slightly detuned FM tines.
  dulcimer(dest, t, midi, vel) {
    const end = t + 1.9; if (!this.claim(1, t, end)) return;
    const f0 = mtof(midi), c1 = this.osc("sine", f0, t), c2 = this.osc("sine", f0 * 1.003, t), m = this.osc("sine", f0 * 2, t), mg = this.gain(0), g = this.gain(0);
    this.hit(mg.gain, t, .001, f0 * 1.4, .35);
    m.connect(mg); mg.connect(c1.frequency); mg.connect(c2.frequency); c1.connect(g); c2.connect(g); g.connect(dest);
    this.hit(g.gain, t, .002, SOUNDTRACK.level.dulcimer * vel, 1.8);
    this.finish([c1, c2, m], [c1, c2, m, mg, g], end);
  }
  // `cold` (0-1, a dark theme's shade): an inharmonic, shorter, less sweet ring.
  bell(dest, t, midi, vel, cold = 0) {
    const decay = 3.3 * (1 - .4 * cold), end = t + decay + .1; if (!this.claim(1, t, end)) return;
    const f0 = mtof(midi), c = this.osc("sine", f0, t), m = this.osc("sine", f0 * (3.5 + .91 * cold), t), mg = this.gain(0), p = this.osc("sine", f0 * (2.76 + .45 * cold), t), pg = this.gain(0), g = this.gain(0);
    this.hit(mg.gain, t, .001, f0 * 1.6 * (1 - .35 * cold), 2.2 * (1 - .4 * cold)); this.hit(pg.gain, t, .001, .35 + .2 * cold, 1.1);
    m.connect(mg); mg.connect(c.frequency); c.connect(g); p.connect(pg); pg.connect(g); g.connect(dest);
    this.hit(g.gain, t, .003, SOUNDTRACK.level.bell * vel, decay);
    this.finish([c, m, p], [c, m, mg, p, pg, g], end);
  }
  // Flute, recorder and ney: a soft wave with delayed vibrato and a breath of noise.
  wind(dest, t, midi, dur, vel, kind = "flute") {
    const end = t + dur + .25; if (!this.claim(3, t, end)) return;
    const f0 = mtof(midi), ney = kind === "ney", rec = kind === "recorder";
    const o = this.osc(ney ? "sine" : "triangle", f0, t), lfo = this.osc("sine", ney ? 4.6 : 5.2, t), lg = this.gain(0), nz = this.noiseSource(t), bp = this.filter("bandpass", Math.min(8000, f0 * 2), 1.2), bg = this.gain(0), f = this.filter("lowpass", rec ? 2400 : 1900), g = this.gain(0);
    if (ney) { o.frequency.setValueAtTime(f0 * .985, t); o.frequency.linearRampToValueAtTime(f0, t + .12); }
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f0 * (rec ? .003 : .006), t + Math.min(.6, dur));
    lfo.connect(lg); lg.connect(o.frequency); o.connect(f); nz.connect(bp); bp.connect(bg); bg.connect(f); f.connect(g); g.connect(dest);
    const L = SOUNDTRACK.level[kind] * vel, breath = ney ? .45 : .2;
    bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(breath, t + .03); bg.gain.linearRampToValueAtTime(breath * .3, t + .25);
    this.swell(g.gain, t, ney ? .12 : .07, L, end, .22);
    this.finish([o, lfo, nz], [o, lfo, lg, nz, bp, bg, f, g], end);
  }
  // A slow sung melody: two detuned saws through the same "aah" formants as the choir pad.
  choirLine(dest, t, midi, dur, vel, vowel = "aah") {
    const end = t + dur + .6; if (!this.claim(3, t, end)) return;
    const [v1, v2] = SOUNDTRACK.vowels[vowel] || SOUNDTRACK.vowels.aah;
    const f0 = mtof(midi), a = this.osc("sawtooth", f0, t), b = this.osc("sawtooth", f0, t), f1 = this.filter("bandpass", v1, 3.5), f2 = this.filter("bandpass", v2, 5), g2 = this.gain(.6), g = this.gain(0);
    a.detune.value = -6; b.detune.value = 6;
    a.connect(f1); b.connect(f1); a.connect(f2); b.connect(f2); f1.connect(g); f2.connect(g2); g2.connect(g); g.connect(dest);
    this.swell(g.gain, t, Math.min(.35, dur * .4), SOUNDTRACK.level.choirLine * vel, end, .55);
    this.finish([a, b], [a, b, f1, f2, g2, g], end);
  }
  // A string line (or a solo cello: lower, darker, quicker to speak): detuned saws, a soft lowpass, delayed vibrato.
  stringLine(dest, t, midi, dur, vel, cello = false) {
    const end = t + dur + .4; if (!this.claim(3, t, end)) return;
    const f0 = mtof(midi), a = this.osc("sawtooth", f0, t), b = this.osc("sawtooth", f0, t), lfo = this.osc("sine", 5, t), lg = this.gain(0), f = this.filter("lowpass", cello ? 1300 : 2600, .8), g = this.gain(0);
    a.detune.value = -8; b.detune.value = 7;
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f0 * .004, t + Math.min(.7, dur));
    lfo.connect(lg); lg.connect(a.frequency); lg.connect(b.frequency); a.connect(f); b.connect(f); f.connect(g); g.connect(dest);
    this.swell(g.gain, t, cello ? .12 : .2, SOUNDTRACK.level[cello ? "cello" : "stringLine"] * vel, end, .4);
    this.finish([a, b, lfo], [a, b, lfo, lg, f, g], end);
  }
  // A soft synth horn: a saw whose filter opens as it speaks, warm and round.
  horn(dest, t, midi, dur, vel) {
    const end = t + dur + .35; if (!this.claim(3, t, end)) return;
    const f0 = mtof(midi), a = this.osc("sawtooth", f0, t), b = this.osc("triangle", f0 * .5, t), bg = this.gain(.4), f = this.filter("lowpass", 400, 1.1), g = this.gain(0);
    a.detune.value = 3;
    f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(1500, t + .14); f.frequency.linearRampToValueAtTime(1000, t + .5);
    a.connect(f); b.connect(bg); bg.connect(f); f.connect(g); g.connect(dest);
    this.swell(g.gain, t, .1, SOUNDTRACK.level.horn * vel, end, .35);
    this.finish([a, b], [a, b, bg, f, g], end);
  }
  // A glassy celesta: a sine with a quickly fading partial two octaves up.
  celesta(dest, t, midi, vel) {
    const end = t + 1.6; if (!this.claim(3, t, end)) return;
    const f0 = mtof(midi), a = this.osc("sine", f0, t), b = this.osc("sine", f0 * 4, t), bg = this.gain(0), g = this.gain(0);
    this.hit(bg.gain, t, .001, .3, .25);
    a.connect(g); b.connect(bg); bg.connect(g); g.connect(dest);
    this.hit(g.gain, t, .002, SOUNDTRACK.level.celesta * vel, 1.5);
    this.finish([a, b], [a, b, bg, g], end);
  }
  frame(dest, t, vel) {
    const end = t + .7; if (!this.claim(3, t, end)) return;
    const o = this.osc("sine", 86, t), g = this.gain(0), nz = this.noiseSource(t), bp = this.filter("bandpass", 240, 1.1), ng = this.gain(0);
    o.frequency.exponentialRampToValueAtTime(54, t + .2);
    o.connect(g); nz.connect(bp); bp.connect(ng); ng.connect(g); g.connect(dest);
    this.hit(g.gain, t, .004, SOUNDTRACK.level.frame * vel, .6); this.hit(ng.gain, t, .002, .6, .12);
    this.finish([o, nz], [o, g, nz, bp, ng], end);
  }
  edge(dest, t, vel) {
    const end = t + .15; if (!this.claim(1, t, end)) return;
    const nz = this.noiseSource(t), bp = this.filter("bandpass", 1500, 2), g = this.gain(0);
    nz.connect(bp); bp.connect(g); g.connect(dest);
    this.hit(g.gain, t, .002, SOUNDTRACK.level.edge * vel, .1);
    this.finish([nz], [nz, bp, g], end);
  }
  tom(dest, t, vel) {
    const end = t + .8; if (!this.claim(2, t, end)) return;
    const o = this.osc("sine", 128, t), g = this.gain(0), nz = this.noiseSource(t), lp = this.filter("lowpass", 500), ng = this.gain(0);
    o.frequency.exponentialRampToValueAtTime(78, t + .3);
    o.connect(g); nz.connect(lp); lp.connect(ng); ng.connect(g); g.connect(dest);
    this.hit(g.gain, t, .004, SOUNDTRACK.level.tom * vel, .7); this.hit(ng.gain, t, .002, .4, .08);
    this.finish([o, nz], [o, g, nz, lp, ng], end);
  }
  // `decay` (s): the menace heartbeat uses a short one.
  timp(dest, t, midi, vel, decay = 2.3) {
    const end = t + decay + .1; if (!this.claim(3, t, end)) return;
    const f0 = mtof(midi), a = this.osc("sine", f0 * 1.03, t), b = this.osc("sine", f0 * 1.5, t), bg = this.gain(.3), g = this.gain(0), nz = this.noiseSource(t), lp = this.filter("lowpass", 380), ng = this.gain(0);
    a.frequency.exponentialRampToValueAtTime(f0, t + .15);
    a.connect(g); b.connect(bg); bg.connect(g); nz.connect(lp); lp.connect(ng); ng.connect(g); g.connect(dest);
    this.hit(g.gain, t, .006, SOUNDTRACK.level.timp * vel, decay); this.hit(ng.gain, t, .002, .7, .1);
    this.finish([a, b, nz], [a, b, bg, g, nz, lp, ng], end);
  }

  // ---- menace: a boss theme's `dark` devices (soundtrack-songs.ts MENACE_DEVICES; Tim, 2026-11-15) ----
  // Each device is one bounded voice claimed like any other, or a change to a note already playing. No voice outlives its phrase
  // by more than a breath, and no note starts beyond the step being played (a drop's return is a gain ramp on the bar line).
  // The low tier leaves out the sub, the rumble, the ponticello and the growl, and keeps the cluster to two notes.
  // Once a phrase: the sub (and its beating pair) and the rumble. A drop ends on the next bar line with a hit.
  menaceBar(d, t, idx, barDur) {
    const k = d.song.dark, root = d.song.root;
    if (d.dropped) {
      d.dropped = false;
      this.timp(d.stems.groove, t, into(root, 38, 49), 1); this.tom(d.stems.groove, t + .01, 1);
      if (k.cluster) this.cluster(d.stems.bed, t, into(root, 50, 59), k.cluster, barDur * .5, 1.6, .02);
    }
    if (idx !== 0 && !d.needBed) return;
    const len = (8 - idx) * barDur + 1.5;
    // The low tier (phones that cannot sound a sub) leaves it out, and its beating pair with it.
    if ((k.sub || k.beat) && this.quality !== "low") this.sub(d.stems.bed, t, into(root, 33, 44), len, k.sub || 0, k.beat || 0);
    if (k.rumble && this.quality !== "low") this.rumble(d.stems.bed, t, len, k.rumble * (.75 + .25 * d.tier));
  }
  // Under each chord: the hidden shadow tone, the cluster, and in a fight the growl and the ponticello.
  menaceBed(d, t, semis, dur) {
    const k = d.song.dark, M = SOUNDTRACK.menace, low = this.quality === "low", root = d.song.root + semis[0], dest = d.stems.bed;
    for (const iv of k.shadow || []) this.drone(dest, t, into(root + iv, 50, 61), dur + .6, M.shadow, 2);
    if (k.cluster) this.cluster(dest, t, into(root, 50, 59), low ? 2 : k.cluster, dur);
    if (k.growl && d.tier > 0 && !low) { const n = into(root, 40, 47); this.choir(dest, t, [n, n + 1], dur, M.growl * k.growl, "oo", .7); }
    if (k.pont && d.tier > 0 && !low && d.voicing) this.pont(dest, t, d.voicing.slice(-2).map((n) => n + 12), dur + .3, k.pont);
  }
  // On the grid: the heartbeat, the off-meter accents, the cold bell figure, the dives, and the fall into a drop.
  menaceStep(d, t, s) {
    const k = d.song.dark, M = SOUNDTRACK.menace, song = d.song, idx = d.bar % 8, groove = d.stems.groove;
    const timp = song.drums[DRUM_SET[d.tier]]?.timp;
    if (k.heart && (s === 0 || s === 2) && (d.tier > 0 || d.bar % 2 === 0) && !(timp && timp[s] !== ".")) this.timp(groove, t, into(song.root, 38, 49), M.heart * k.heart * (s ? .55 : 1) * (d.tier ? 1 : .7), .8);
    if (k.lurch && d.tier > 0 && k.lurch[s] !== ".") this.tom(groove, t, M.lurch * (SOUNDTRACK.velocity[k.lurch[s]] || .7));
    if (k.toll && d.bar % k.toll.every === k.toll.every - 1) {
      const i = k.toll.steps.indexOf(s);
      if (i >= 0) this.bell(d.stems.motion, t, into(song.root + k.toll.ints[i % k.toll.ints.length], 74, 86), M.toll, 1);
    }
    if (k.dive && s === 8 && d.bar % k.dive === k.dive - 1) this.dive(d.stems.bed, t, into(song.root + 7, 67, 78), 24 * d.stepDur, d.tier > 1 ? 19 : 12);
    if (k.drop && idx === 7 && s === 4 && d.bar >= 4 && d.endAt === Infinity && Math.floor(d.bar / 8) % k.drop === k.drop - 1 && !(t < this.stingUntil)) { // review 975: a stinger owns the duck until its release is done
      // The whole score, its reverb and echo tails too (the duck), falls away and comes back on the bar line, whatever happens meanwhile.
      const g = this.duck.gain, back = t + 12 * d.stepDur;
      g.cancelScheduledValues(t); g.setValueAtTime(1, t); g.linearRampToValueAtTime(M.drop, t + .12); g.setValueAtTime(M.drop, back - .02); g.linearRampToValueAtTime(1, back);
      d.dropped = true;
    }
  }
  // Bend the oscillators of a held lead note down by 25-60 cents over its second half.
  sag(oscs, t, dur, r) {
    const [lo, hi] = SOUNDTRACK.menace.sag, cents = lo + (hi - lo) * r;
    for (const o of oscs) { const v = o.detune.value; o.detune.setValueAtTime(v, t + dur * .5); o.detune.linearRampToValueAtTime(v - cents, t + dur); }
  }
  // A low sine under the drone (vel 0: none); with `beat` (Hz), two voices an octave up beating slowly. One voice.
  sub(dest, t, midi, dur, vel, beat) {
    const end = t + dur; if (!this.claim(2, t, end)) return;
    const M = SOUNDTRACK.menace, f = mtof(midi), rel = Math.min(2, dur * .3), a = this.osc("sine", f, t), g = this.gain(0), src = [a], nodes = [a, g];
    a.connect(g); g.connect(dest); this.swell(g.gain, t, 3, M.sub * vel, end, rel);
    if (beat > 0) {
      const b = this.osc("triangle", f * 2, t), c = this.osc("triangle", f * 2 + beat, t), bg = this.gain(0);
      b.connect(bg); c.connect(bg); bg.connect(dest); this.swell(bg.gain, t, 4, M.beat, end, rel);
      src.push(b, c); nodes.push(b, c, bg);
    }
    this.finish(src, nodes, end);
  }
  // Low noise through two low-passes, breathing slowly. One voice.
  rumble(dest, t, dur, vel) {
    const end = t + dur; if (!this.claim(2, t, end)) return;
    const nz = this.noiseSource(t), lp = this.filter("lowpass", 140, 1), lp2 = this.filter("lowpass", 160, .7), g = this.gain(0), lfo = this.osc("sine", .13, t), lg = this.gain(.35), out = this.gain(1);
    nz.connect(lp); lp.connect(lp2); lp2.connect(g); g.connect(out); out.connect(dest); lfo.connect(lg); lg.connect(out.gain);
    this.swell(g.gain, t, 3, SOUNDTRACK.menace.rumble * vel, end, Math.min(2.5, dur * .3));
    this.finish([nz, lfo], [nz, lp, lp2, g, lfo, lg, out], end);
  }
  // Notes a semitone apart, low and murky. A short one (`attack` small) is the stab after a drop.
  cluster(dest, t, base, size, dur, vel = 1, attack = 1.4) {
    const end = t + dur + .6, f = this.filter("lowpass", 850, .6), g = this.gain(0), src = [];
    this.swell(g.gain, t, Math.min(attack, dur * .5), SOUNDTRACK.menace.cluster * vel / Math.sqrt(size), end, .6); f.connect(g); g.connect(dest);
    for (let i = 0; i < size; i++) {
      if (!this.claim(2, t, end)) continue;
      const o = this.osc("sawtooth", mtof(base + i), t); o.detune.value = (this.rand() - .5) * 6; o.connect(f); src.push(o);
    }
    if (src.length) this.finish(src, [...src, f, g], end); else for (const n of [f, g]) n.disconnect();
  }
  // Sul ponticello: thin, bright, nervous; saws through a high band with a fast tremolo on the level.
  pont(dest, t, notes, dur, rate) {
    const end = t + dur + .8, hp = this.filter("highpass", 1500, .8), lp = this.filter("lowpass", 4800, .7), g = this.gain(0), tg = this.gain(.5), lfo = this.osc("sine", rate, t), lg = this.gain(.5), src = [];
    this.swell(g.gain, t, .8, SOUNDTRACK.menace.pont / Math.sqrt(notes.length), end, .8);
    hp.connect(lp); lp.connect(g); g.connect(tg); tg.connect(dest); lfo.connect(lg); lg.connect(tg.gain);
    for (const m of notes) {
      if (!this.claim(2, t, end)) continue;
      const o = this.osc("sawtooth", mtof(m), t); o.detune.value = (this.rand() - .5) * 14; o.connect(hp); src.push(o);
    }
    if (src.length) this.finish([...src, lfo], [...src, hp, lp, g, tg, lfo, lg], end);
    else { lfo.stop(t); for (const n of [hp, lp, g, tg, lfo, lg]) n.disconnect(); }
  }
  // A falling glissando swell: two saws sliding down `depth` semitones as the filter closes. One voice.
  dive(dest, t, midi, dur, depth) {
    const end = t + dur; if (!this.claim(2, t, end)) return;
    const f0 = mtof(midi), f1 = f0 / Math.pow(2, depth / 12), a = this.osc("sawtooth", f0, t), b = this.osc("sawtooth", f0, t), f = this.filter("lowpass", 1800, .8), g = this.gain(0);
    b.detune.value = 9;
    for (const o of [a, b]) { o.frequency.setValueAtTime(f0, t + dur * .2); o.frequency.exponentialRampToValueAtTime(f1, end); }
    f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(380, end);
    a.connect(f); b.connect(f); f.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(SOUNDTRACK.menace.dive, t + dur * .4); g.gain.linearRampToValueAtTime(0, end);
    this.finish([a, b], [a, b, f, g], end);
  }

  // ---- stingers: story beats over the ducked score ----
  stinger(kind, now = this.now()) {
    const s = this.stingerTable[kind]; if (!s || this.muted || !this.running) return 0;
    const S = SOUNDTRACK, home = this.current()?.song || this.songs[this.target.songId], base = 60 + pc(home ? home.root : 57), beat = 60 / s.bpm, t0 = now + .06;
    let last = 0;
    for (const [b, inst, steps, len, vel] of s.events) {
      const t = t0 + b * beat, dur = len * beat, notes = (Array.isArray(steps) ? steps : [steps]).map((st) => base + stepToSemi(s.mode, st)), dest = this.stingBus;
      last = Math.max(last, b * beat + dur);
      if (inst === "strings") this.strings(dest, t, notes, dur, vel, 1.1);
      else if (inst === "choir") this.choir(dest, t, notes, dur, vel);
      else if (inst === "drone") this.drone(dest, t, into(notes[0], S.drone[0], S.drone[1]), dur + .8, vel, .4, 3);
      else if (inst === "timp") this.timp(dest, t, into(notes[0], 38, 49), vel);
      else if (WINDS.includes(inst) || ["horn", "cello", "celesta"].includes(inst)) this.playLead(dest, t, notes[0], dur, vel, inst);
      else for (const n of notes) this[inst](dest, t, n, vel);
    }
    const seconds = last + 1.2, g = this.duck.gain;
    this.stingUntil = Math.max(this.stingUntil, now + seconds + S.duck.release); // the menace drop leaves the duck alone until then
    g.cancelScheduledValues(now); g.setTargetAtTime(S.duck.level, now, S.duck.attack / 3); g.setTargetAtTime(1, now + Math.max(.5, seconds - 1.2), S.duck.release / 3);
    this.emit({ type: "stinger", kind, at: t0, seconds });
    return seconds;
  }
}
export const createSoundtrack = (ctx, options) => new Soundtrack(ctx, options);
