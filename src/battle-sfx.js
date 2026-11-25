// The dino duel's battle sounds (Tim, 2026-11-14: when the Spinosaurus and the Wild Stegosaurus fight each other "there is NO music.
// Instead there are the sounds of battle ... This is literally the only place in the game where there are sounds of battle").
//
// - Everything is synthesized with WebAudio on the game's audio graph: oscillators and the soundtrack's one noise buffer (never a
//   buffer per sound), through this module's own `sfx` bus and a limiter into the master gain, so mute, the master volume and the
//   Effects volume all hold. "Calm only" (the Soundtrack setting) is about the music: the duel's sounds still play.
// - Voices are bounded (BATTLE_SFX.maxVoices, fewer on the low tier): a sound that would pass its priority's share of the budget is
//   dropped; the same sound again within `debounce` s is dropped; every source stops when its sound ends and every node of the sound
//   is disconnected once it has.
// - Where a sound is: only loudness (inverse distance past `distance.ref` tiles, silent past `distance.max`) and an equal-power
//   stereo pan (one StereoPannerNode a sound) from the Wayfarer's position. No 3D panners.
// - What plays (DUEL_SOUNDS): the game's cues (monster-pack.ts dinoCue: a wind-up, a swing, a roar, a landing, a blow) mapped to
//   sounds. A blow's sound plays only when one duellist's blow connects with the other; wind-ups, roars, swings, landings,
//   footfalls, the rolling wheel and the shed play only while the director (soundtrack-director.ts DUEL) holds a duel; outside one
//   these dinosaurs are silent, as before. When the Spinosaurus roars, the Wild Stegosaurus bellows back (`answer`) if it is not
//   mid-move: sound only. Under the duel, if DUEL.undercurrent: one sub drone and a slow heartbeat, -30 dB or less, on the music bus.
// - Muted means nothing is scheduled at all. It never reads or writes the save, and never changes the game.
import { seededRandom } from "./soundtrack.js?v=r1059-3629aeded9d0";
import { DUEL } from "./soundtrack-director.js?v=r1059-3629aeded9d0";

export const BATTLE_SFX = {
  maxVoices: 12, lowMaxVoices: 8,
  // Share of the voice budget each priority may fill: 1 footfalls and patter, 2 wind-ups and swings, 3 blows, roars and landings.
  share: { 1: .6, 2: .85, 3: 1 },
  debounce: .08, lead: .01,
  bus: 1.6, limiter: { threshold: -3, knee: 3, ratio: 20, attack: .001, release: .18 },
  pause: { level: .3, time: .25 },
  distance: { ref: 5, max: 24 }, pan: { width: 12, max: .8 },
  // The Stegosaurus answers a Spinosaurus roar after `delay` s (hashed in the range), at most once in `gap` s.
  answer: { delay: [.6, 1.1], gap: 2.5 },
  // Footfalls: one each `stride` tiles walked on the ground, `stepGap` s apart at the least.
  stride: { spinoRex: 1.7, wildStego: 1.25, earthApato: 1.9 }, stepGap: .3,
  roll: { max: 4.4, release: .25 },
  // The Wild Stegosaurus's roar (bellowStego, bellowShort): its fundamental (Hz; the Spinosaurus's sits at 48-72), the second saw's
  // detune, the snarl's rise (s), the rasp's band (Hz), its level and its formant's, the growl's tremolo (Hz) and the drive into the soft clipper.
  stegoRoar: { f0: 98, detune: 1.021, snarl: .09, rasp: 2100, raspLevel: 1.4, growl: 38, drive: 2.6, raspFormant: 1.1 },
  // The undercurrent (DUEL.undercurrent): a `hz` drone with its octave, and a lub-dub heartbeat every `beat` s; `gain` sets the
  // drone (about -37 dB RMS at the output with default volumes, its beats peaking near -27 dB), `thump` the heartbeat.
  undercurrent: { gain: .012, hz: 49, octave: .35, beat: 1.35, dub: .3, thump: .022, fade: 2, ahead: .5 },
  // Each sound's peak level and priority.
  sounds: {
    roarSpino: [.6, 3], roarBig: [.7, 3], growlSpino: [.42, 2], inhale: [.22, 2], bellowStego: [1.3, 3], bellowShort: [1.1, 2],
    biteSpino: [.85, 3], biteStego: [.62, 3], rakeSpino: [.42, 3], rakeStego: [.36, 3], whoosh: [.32, 2], whooshHeavy: [.36, 2], whooshLight: [.24, 2],
    tailSpino: [.85, 3], tailStego: [.72, 3], slam: [.85, 3], slamBig: [.95, 3], impact: [.8, 3], wheelRoll: [.34, 3], wheelCrunch: [.75, 3],
    digScrape: [.3, 2], fling: [.42, 2], rockets: [.45, 3], boneVolley: [.42, 3], boneCrackle: [.32, 2], spear: [.62, 3], crunch: [.85, 3],
    chew: [.6, 3], woodCrack: [.75, 3], roarHit: [.6, 3], footSpino: [.42, 1], footStego: [.32, 1], footApato: [.5, 1], shed: [.5, 3],
    thrash: [.62, 3], strain: [.4, 2], rockfall: [.62, 3],
  },
};
// The game's cues (monster-pack.ts dinoCue: phase and move) to sounds.
export const DUEL_SOUNDS = {
  windup: {
    spinoRoar: "inhale", spinoLeapSlam: "roarSpino", spinoBodySlam: "roarSpino", spinoGrab: "growlSpino", spinoBite: "growlSpino", spinoDigFling: "digScrape", spinoRibSpears: "boneCrackle", spinoBoneVolley: "boneCrackle",
    apatoNeckSlam: "bellowShort", apatoWrap: "strain", apatoBeam: "inhale", apatoBeamSweep: "inhale", apatoStomp: "bellowStego", apatoHydra: "digScrape",
    stegoWheel: "bellowStego", stegoTailSlam: "bellowStego", stegoTreeClub: "bellowStego", stegoPounce: "bellowShort", stegoRearSwipe: "bellowShort", stegoPlateRockets: "bellowShort",
  },
  roar: { spinoRoar: "roarBig", spinoArrive: "roarBig", apatoBeam: "roarBig", apatoBeamSweep: "roarBig" },
  swing: { apatoLash: "whooshHeavy", apatoWrap: "whoosh", apatoLeaves: "whooshLight", stegoTailWhack: "whoosh", stegoRearSwipe: "whooshLight", spinoTailSwipe: "whooshHeavy", spinoRibSpears: "boneCrackle", spinoRibThrust: "whooshLight" },
  land: { stegoPounce: "slam", stegoTailSlam: "slam", stegoBreach: "slam", stegoTreeClub: "slam", spinoLeapSlam: "slamBig", spinoBodySlam: "slam", spinoGrabThrow: "slam", spinoGrabSlam: "slamBig", stegoJawsSlam: "slamBig", apatoNeckSlam: "slamBig", apatoStomp: "slamBig", apatoStep: "slam", apatoSpires: "impact", apatoSpireStamp: "slam", apatoSeeds: "slam", apatoWrapThrow: "slam" },
  // A blow that connects with the other duellist (and only then).
  hit: {
    spinoBite: "biteSpino", spinoBodySlam: "biteSpino", spinoClaw: "rakeSpino", spinoTailSwipe: "tailSpino", spinoLeapSlam: "impact", spinoGrab: "chew", spinoRibSpears: "spear", spinoRoar: "roarHit",
    stegoBite: "biteStego", stegoClaw: "rakeStego", stegoRearSwipe: "rakeStego", stegoTailWhack: "tailStego", stegoTailSlam: "tailStego", stegoWheel: "wheelCrunch", stegoPounce: "impact", stegoTreeClub: "woodCrack", stegoBreach: "impact", stegoJaws: "thrash", spinoGrabSlam: "impact",
    apatoNeckSlam: "impact", apatoLash: "biteStego", apatoWrap: "thrash", apatoStomp: "impact", apatoSpires: "spear", apatoLeaves: "rakeStego", apatoHydra: "rakeSpino", apatoHands: "impact",
  },
  grab: { spinoGrab: "crunch", stegoJaws: "crunch", apatoWrap: "crunch" }, lift: { spinoGrab: "strain", stegoJaws: "bellowShort" }, rock: { dinoRock: "rockfall" }, feed: { dinoFeed: "chew" },
  flee: { spinoRex: "growlSpino", wildStego: "bellowStego", earthApato: "bellowStego" }, shed: { spinoFossil: "shed" }, roll: { stegoWheel: "wheelRoll" },
  fling: { spinoDigFling: "fling", apatoHands: "fling" }, launch: { stegoPlateRockets: "rockets", spinoBoneVolley: "boneVolley", apatoHydra: "digScrape", apatoHands: "digScrape" },
};
// Blows and grabs play whatever the duel's state (they are the duel); the rest only while one is held.
const CONTACT = new Set(["hit", "grab"]);
const RIVAL = { spinoRex: "wildStego", wildStego: "spinoRex" };
// The Earth Apatosaurus (Tim, 2026-11-18) duels both: a blow between any duelling pair (dino-duel.ts DINO_DUEL.pairs) is contact.
const rivals = (who, victim) => RIVAL[who] === victim || (who === "earthApato" && (victim === "spinoRex" || victim === "wildStego")) || (victim === "earthApato" && (who === "spinoRex" || who === "wildStego"));
const ROARS = new Set(["roarSpino", "roarBig"]);
export const SFX_NAMES = Object.keys(BATTLE_SFX.sounds);

export class BattleSfx {
  constructor(ctx, options = {}) {
    this.ctx = ctx; this.seed = options.seed ?? 13; this.rand = seededRandom(this.seed);
    this.quality = options.quality || "balanced"; this.onEvent = options.onEvent || null;
    this.muted = false; this.paused = false; this.duelState = "off"; this.pair = null;
    this.live = []; this.last = {}; this.rolls = {}; this.steps = {}; this.answerAt = -Infinity; this.under = null;
    this.stats = { played: 0, dropped: 0, debounced: 0, peakVoices: 0, liveNodes: 0, byName: {} };
    this.maxVoices = this.quality === "low" ? BATTLE_SFX.lowMaxVoices : BATTLE_SFX.maxVoices;
    const out = options.out || ctx.destination;
    this.bus = ctx.createGain(); this.bus.gain.value = BATTLE_SFX.bus * (options.volume ?? 1);
    this.pauseGain = ctx.createGain(); this.bus.connect(this.pauseGain);
    if (ctx.createDynamicsCompressor) {
      const L = BATTLE_SFX.limiter, c = ctx.createDynamicsCompressor();
      c.threshold.value = L.threshold; c.knee.value = L.knee; c.ratio.value = L.ratio; c.attack.value = L.attack; c.release.value = L.release;
      this.pauseGain.connect(c); c.connect(out); this.limiter = c;
    } else this.pauseGain.connect(out);
    this.musicOut = options.musicOut || this.bus;
    // The soundtrack's noise buffer when given; else one built once, here.
    if (options.noise) this.noise = options.noise;
    else { const len = Math.floor(ctx.sampleRate), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), r = seededRandom(this.seed + 99); for (let i = 0; i < len; i++) d[i] = r() * 2 - 1; this.noise = buf; }
  }
  emit(event) { try { this.onEvent?.(event); } catch { /* listeners never stop a sound */ } }
  now() { return this.ctx.currentTime; }

  // ---- control (as the music: mute schedules nothing, pause lowers, a hidden tab suspends the context in main.ts) ----
  setMuted(muted) {
    muted = !!muted; if (muted === this.muted) return; this.muted = muted;
    if (muted) { const t = this.now(); for (const id of Object.keys(this.rolls)) this.stopRoll(id, t); this.stopUndercurrent(t, .05); }
  }
  setPaused(paused) {
    paused = !!paused; if (paused === this.paused) return; this.paused = paused;
    const t = this.now(), g = this.pauseGain.gain; g.cancelScheduledValues(t); g.setTargetAtTime(paused ? BATTLE_SFX.pause.level : 1, t, BATTLE_SFX.pause.time);
  }
  setVolume(v) { this.bus.gain.value = BATTLE_SFX.bus * Math.max(0, Math.min(1, Number(v) || 0)); }
  setQuality(q) { this.quality = q; this.maxVoices = q === "low" ? BATTLE_SFX.lowMaxVoices : BATTLE_SFX.maxVoices; }
  // The director's duel state ("off" | "lead" | "on" | "tail") and the pair (soundtrack-director.ts sampleDuel, kept in its memo).
  setDuel(state, pair = null, now = this.now()) {
    const was = this.duelState; this.duelState = state || "off"; if (pair) this.pair = pair;
    if (this.duelState === "off") { if (was !== "off") { for (const id of Object.keys(this.rolls)) this.stopRoll(id, now); this.stopUndercurrent(now); this.steps = {}; } this.pair = pair; }
    else if (DUEL.undercurrent) this.startUndercurrent(now);
  }
  get dueling() { return this.duelState !== "off"; }

  // ---- where a sound is ----
  place(x, y, listener) {
    if (!listener || !Number.isFinite(x) || !Number.isFinite(y)) return { gain: 1, pan: 0 };
    const D = BATTLE_SFX.distance, P = BATTLE_SFX.pan, dx = x - (Number(listener.x) || 0), d = Math.hypot(dx, y - (Number(listener.y) || 0));
    if (d > D.max) return null;
    return { gain: d <= D.ref ? 1 : D.ref / d, pan: Math.max(-P.max, Math.min(P.max, dx / P.width)) };
  }

  // ---- the game's cues ----
  // `c`: { who, id, phase, move, x, y, victim?, arms?, land? } (monster-pack.ts dinoCue). `listener`: the Wayfarer.
  cue(c, listener, now = this.now()) {
    if (!c || this.muted) return false;
    const table = DUEL_SOUNDS[c.phase], name = table?.[c.move];
    if (CONTACT.has(c.phase)) { if (!name || !rivals(c.who, c.victim)) return false; }
    else if (!this.dueling) return false;
    if (c.phase === "rollEnd") { this.stopRoll(c.id, now); return true; }
    if (!name) return false;
    if (c.phase === "roll") return this.startRoll(c, listener, now);
    const ok = this.play(name, { x: c.x, y: c.y, listener, at: now + BATTLE_SFX.lead, opts: c });
    if (ok && ROARS.has(name) && c.who === "spinoRex") this.answer(listener, now);
    return ok;
  }
  // The Stegosaurus bellows back at a roar, if it is not mid-move (choreography: sound only).
  answer(listener, now) {
    const st = this.pair?.stego, A = BATTLE_SFX.answer;
    if (!this.dueling || !st || st.dead || st.pack?.attack || now - this.answerAt < A.gap) return false;
    this.answerAt = now;
    return this.play("bellowStego", { x: st.x, y: st.y, listener, at: now + A.delay[0] + (A.delay[1] - A.delay[0]) * this.rand() });
  }
  // Every frame: footfalls of the pair while the duel is held, the rolling wheel following (or stopping with) the stego, the heartbeat.
  track(listener, now = this.now()) {
    if (this.muted || this.paused) return;
    this.tickUndercurrent(now);
    for (const [id, r] of Object.entries(this.rolls)) {
      const e = r.who;
      if (now >= r.end || !e || e.dead || !(e.stegoRoll >= 1)) { this.stopRoll(id, now); continue; }
      const at = this.place(e.x, e.y, listener) || { gain: 0, pan: 0 };
      r.where.gain.setTargetAtTime(at.gain, now, .05); if (r.pan) r.pan.pan.setTargetAtTime(at.pan, now, .05);
    }
    if (!this.dueling || !this.pair) return;
    for (const e of [this.pair.spino, this.pair.stego, this.pair.apato]) {
      if (!e || e.dead) continue;
      const st = this.steps[e.id] ||= { x: e.x, y: e.y, at: -Infinity }, up = e.aloft || e.spinoAir > .05 || e.stegoAir > .05 || e.stegoRoll > 0 || e.stegoSwim === 1 || e.spinoHeldBy;
      if (up) { st.x = e.x; st.y = e.y; continue; }
      if (Math.hypot(e.x - st.x, e.y - st.y) >= (BATTLE_SFX.stride[e.kind] || 1.5) && now - st.at >= BATTLE_SFX.stepGap) {
        st.x = e.x; st.y = e.y; st.at = now;
        this.play(e.kind === "spinoRex" ? "footSpino" : e.kind === "earthApato" ? "footApato" : "footStego", { x: e.x, y: e.y, listener, at: now + BATTLE_SFX.lead });
      }
    }
  }

  // ---- voices ----
  liveVoices(t) { this.live = this.live.filter((v) => v.end > t); return this.live.length; }
  claim(priority, t, end) {
    const n = this.liveVoices(t), limit = Math.floor(this.maxVoices * (BATTLE_SFX.share[priority] || 1));
    if (n >= limit) { this.stats.dropped++; return null; }
    const v = { end }; this.live.push(v); if (n + 1 > this.stats.peakVoices) this.stats.peakVoices = n + 1;
    return v;
  }
  // One sound: `at` its start (never before the clock), placed from (x, y) for the listener, `opts` read by its builder.
  play(name, { x = null, y = null, listener = null, at = this.now() + BATTLE_SFX.lead, gain = 1, opts = {} } = {}) {
    const spec = BATTLE_SFX.sounds[name], build = SYNTH[name];
    if (!spec || !build || this.muted) return false;
    const t = Math.max(at, this.now()), where = this.place(x, y, listener); if (!where) return false;
    if (t - (this.last[name] ?? -Infinity) < BATTLE_SFX.debounce) { this.stats.debounced++; return false; }
    const v = this.claim(spec[1], t, t + 3); if (!v) return false;
    this.last[name] = t;
    const ctx = this.ctx, w = ctx.createGain(); w.gain.value = where.gain * gain;
    let pan = null; if (ctx.createStereoPanner) { pan = ctx.createStereoPanner(); pan.pan.value = where.pan; w.connect(pan); pan.connect(this.bus); } else w.connect(this.bus);
    const made = build.call(this, t, w, spec[0], opts);
    v.end = made.end; this.finish(made.src, [...made.nodes, w, ...(pan ? [pan] : [])], made.end);
    this.stats.played++; this.stats.byName[name] = (this.stats.byName[name] || 0) + 1;
    this.emit({ type: "sfx", name, at: t, end: made.end, gain: where.gain, pan: where.pan });
    return made.handle || true;
  }
  finish(sources, nodes, end) {
    for (const s of sources) s.stop(end);
    this.stats.liveNodes += nodes.length;
    sources[0].onended = () => { for (const n of nodes) try { n.disconnect(); } catch { /* gone */ } this.stats.liveNodes -= nodes.length; };
  }
  osc(type, f, t) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); return o; }
  gain(v = 1) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  filter(type, f, q = .7) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  noiseSrc(t) { const n = this.ctx.createBufferSource(); n.buffer = this.noise; n.loop = true; n.start(t, this.rand() * .8); return n; }
  // Up in `a`, an exponential fall to silence by t + a + decay.
  hit(param, t, a, peak, decay) { param.setValueAtTime(0, t); param.linearRampToValueAtTime(peak, t + a); param.exponentialRampToValueAtTime(.0001, t + a + decay); }
  // Short grains on one gain: each up in 2 ms and down within `decay` (never past the next grain).
  spikes(param, times, peaks, decay) {
    param.setValueAtTime(0, Math.max(0, times[0] - .001));
    times.forEach((ti, i) => { const room = i + 1 < times.length ? times[i + 1] - ti - .002 : decay; const dec = Math.max(.004, Math.min(decay, room)); param.setValueAtTime(.0001, ti); param.linearRampToValueAtTime(peaks[i], ti + .002); param.exponentialRampToValueAtTime(.0001, ti + .002 + dec); });
  }
  // `n` grain times from t0 to t1, thinning out (hashed), sorted.
  scatter(n, t0, t1) {
    const out = [];
    for (let i = 0; i < n; i++) { const k = i / Math.max(1, n - 1), x = t0 + (t1 - t0) * Math.pow(k, 1.6) + this.rand() * .02; out.push(out.length ? Math.max(x, out[out.length - 1] + .012) : x); }
    return out;
  }
  // Parts a sound is made of, each adding its nodes and sources to `p` and returning its end.
  thump(p, t, out, L, f0, f1, decay) {
    const o = this.osc("sine", f0, t), g = this.gain(0), nz = this.noiseSrc(t), lp = this.filter("lowpass", 260), ng = this.gain(0);
    o.frequency.exponentialRampToValueAtTime(f1, t + decay * .5); o.connect(g); g.connect(out); nz.connect(lp); lp.connect(ng); ng.connect(out);
    this.hit(g.gain, t, .005, L, decay); this.hit(ng.gain, t, .003, L * .55, decay * .35);
    p.src.push(o, nz); p.nodes.push(o, g, nz, lp, ng); return t + decay + .05;
  }
  crack(p, t, out, L, partials, decay) {
    const nz = this.noiseSrc(t), hp = this.filter("highpass", 3200), ng = this.gain(0); nz.connect(hp); hp.connect(ng); ng.connect(out); this.hit(ng.gain, t, .001, L * .7, .03);
    p.src.push(nz); p.nodes.push(nz, hp, ng);
    partials.forEach((f, i) => { const o = this.osc(i % 2 ? "triangle" : "sine", f, t), g = this.gain(0); o.frequency.exponentialRampToValueAtTime(f * .97, t + decay); o.connect(g); g.connect(out); this.hit(g.gain, t, .001, L * .32 / (i + 1), decay / (1 + i * .3)); p.src.push(o); p.nodes.push(o, g); });
    return t + decay + .05;
  }
  noiseBurst(p, t, out, L, type, f, q, a, decay) {
    const nz = this.noiseSrc(t), b = this.filter(type, f, q), g = this.gain(0); nz.connect(b); b.connect(g); g.connect(out); this.hit(g.gain, t, a, L, decay);
    p.src.push(nz); p.nodes.push(nz, b, g); return { end: t + a + decay + .03, band: b };
  }
  sweep(p, t, out, L, dur, lo, hi, q = 1.1) {
    const nz = this.noiseSrc(t), b = this.filter("bandpass", lo, q), g = this.gain(0); nz.connect(b); b.connect(g); g.connect(out);
    b.frequency.setValueAtTime(lo, t); b.frequency.exponentialRampToValueAtTime(hi, t + dur * .6); b.frequency.exponentialRampToValueAtTime(lo * 1.2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(L, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    p.src.push(nz); p.nodes.push(nz, b, g); return t + dur + .03;
  }
  grains(p, t, out, L, times, f, q, decay) {
    const nz = this.noiseSrc(t), b = this.filter("bandpass", f, q), g = this.gain(0); nz.connect(b); b.connect(g); g.connect(out);
    this.spikes(g.gain, times, times.map((_, i) => L * (1 - .7 * i / Math.max(1, times.length))), decay);
    p.src.push(nz); p.nodes.push(nz, b, g); return times[times.length - 1] + decay + .05;
  }
  // A growl or roar: saws through a growling tremolo and two sweeping formants, with a noise breath. `big`: a sub boom and a wide tail.
  roarVoice(t, out, L, o) {
    const p = { src: [], nodes: [] }, dur = o.dur, a = this.osc("sawtooth", o.f0, t), b = this.osc("sawtooth", o.f0 * 1.013, t), nz = this.noiseSrc(t), nlp = this.filter("lowpass", 1500), ng = this.gain(.5);
    const am = this.gain(.6), lfo = this.osc("sine", o.am, t), lg = this.gain(.4), fa = this.filter("bandpass", o.f1[0], 3.5), fb = this.filter("bandpass", o.f2[0], 5), fbg = this.gain(.7), body = this.filter("lowpass", 360), bg = this.gain(.8), env = this.gain(0);
    for (const osc of [a, b]) { const f = osc.frequency, k = osc === b ? 1.013 : 1; f.setValueAtTime(o.f0 * .8 * k, t); f.linearRampToValueAtTime(o.f0 * 1.25 * k, t + dur * .2); f.linearRampToValueAtTime(o.f0 * 1.05 * k, t + dur * .6); f.linearRampToValueAtTime(o.f0 * .7 * k, t + dur); }
    fa.frequency.setValueAtTime(o.f1[0], t); fa.frequency.linearRampToValueAtTime(o.f1[1], t + dur * .25); fa.frequency.linearRampToValueAtTime(o.f1[2], t + dur);
    fb.frequency.setValueAtTime(o.f2[0], t); fb.frequency.linearRampToValueAtTime(o.f2[1], t + dur * .3); fb.frequency.linearRampToValueAtTime(o.f2[2], t + dur);
    a.connect(am); b.connect(am); nz.connect(nlp); nlp.connect(ng); ng.connect(am); lfo.connect(lg); lg.connect(am.gain);
    am.connect(fa); fa.connect(env); am.connect(fb); fb.connect(fbg); fbg.connect(env); am.connect(body); body.connect(bg); bg.connect(env); env.connect(out);
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(L, t + .14); env.gain.linearRampToValueAtTime(L * .85, t + dur * .55); env.gain.exponentialRampToValueAtTime(.0001, t + dur);
    p.src.push(a, b, nz, lfo); p.nodes.push(a, b, nz, nlp, ng, am, lfo, lg, fa, fb, fbg, body, bg, env);
    let end = t + dur + .05;
    if (o.big) {
      const sub = this.osc("sine", 56, t), sg = this.gain(0); sub.frequency.exponentialRampToValueAtTime(34, t + 1.2); sub.connect(sg); sg.connect(out); this.hit(sg.gain, t + .05, .03, L * 1.1, 1.8);
      p.src.push(sub); p.nodes.push(sub, sg); end = Math.max(end, t + 1.9);
      // The tail: the roar's voice delayed and spread wide, past the sound's own pan.
      if (this.ctx.createStereoPanner) for (const [side, delay] of [[-.95, .023], [.95, .041]]) {
        const dl = this.ctx.createDelay(.1), tg = this.gain(0), sp = this.ctx.createStereoPanner(), lp = this.filter("lowpass", 1800);
        dl.delayTime.value = delay; sp.pan.value = side; env.connect(dl); dl.connect(lp); lp.connect(tg); tg.connect(sp); sp.connect(this.bus);
        tg.gain.setValueAtTime(0, t); tg.gain.linearRampToValueAtTime(.35, t + dur * .4); tg.gain.linearRampToValueAtTime(.55, t + dur); tg.gain.linearRampToValueAtTime(0, t + dur + .4);
        p.nodes.push(dl, tg, sp, lp); end = Math.max(end, t + dur + .5);
      }
    }
    return { ...p, end };
  }
  // The Wild Stegosaurus's roar (Tim, 2026-11-14: "too much like a goat bleat"): a snarl, then a throaty, rasping roar body. Two
  // detuned saws (beating against each other) and a heavy rasp of noise through a fast growl tremolo, driven into the shared soft
  // clipper (BATTLE_SFX.stegoRoar.drive), shaped by throat formants. Higher and raspier than the Spinosaurus's deep roar, a bark and
  // a snarl more than a bellow; no vibrato (it bleated).
  bellowVoice(t, out, L, dur) {
    const R = BATTLE_SFX.stegoRoar, p = { src: [], nodes: [] }, f0 = R.f0, a = this.osc("sawtooth", f0, t), b = this.osc("sawtooth", f0 * R.detune, t);
    for (const [osc, k] of [[a, 1], [b, R.detune]]) { const f = osc.frequency; f.setValueAtTime(f0 * .78 * k, t); f.linearRampToValueAtTime(f0 * 1.3 * k, t + R.snarl); f.linearRampToValueAtTime(f0 * 1.12 * k, t + dur * .35); f.linearRampToValueAtTime(f0 * .74 * k, t + dur); }
    const nz = this.noiseSrc(t), rasp = this.filter("bandpass", R.rasp, 1.1), rg = this.gain(R.raspLevel), mix = this.gain(.5), am = this.gain(.55), lfo = this.osc("sine", R.growl, t), lg = this.gain(.45);
    const drive = this.gain(R.drive), clip = this.shaper(), post = this.gain(1 / R.drive);
    const f1 = this.filter("bandpass", 480, 3), f2 = this.filter("bandpass", 1350, 4), f2g = this.gain(.8), f3 = this.filter("bandpass", 2600, 2.5), f3g = this.gain(R.raspFormant), body = this.filter("lowpass", 420), bg = this.gain(.7), env = this.gain(0);
    f1.frequency.setValueAtTime(480, t); f1.frequency.linearRampToValueAtTime(760, t + dur * .3); f1.frequency.linearRampToValueAtTime(520, t + dur);
    a.connect(mix); b.connect(mix); nz.connect(rasp); rasp.connect(rg); rg.connect(mix); mix.connect(am); lfo.connect(lg); lg.connect(am.gain);
    am.connect(drive); if (clip) { drive.connect(clip); clip.connect(post); } else drive.connect(post);
    post.connect(f1); f1.connect(env); post.connect(f2); f2.connect(f2g); f2g.connect(env); post.connect(f3); f3.connect(f3g); f3g.connect(env); post.connect(body); body.connect(bg); bg.connect(env); env.connect(out);
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(L * 1.6, t + .025); env.gain.linearRampToValueAtTime(L * 1.15, t + R.snarl + .05); env.gain.linearRampToValueAtTime(L * 1.05, t + dur * .6); env.gain.exponentialRampToValueAtTime(.0001, t + dur);
    p.src.push(a, b, nz, lfo); p.nodes.push(a, b, nz, rasp, rg, mix, am, lfo, lg, drive, post, f1, f2, f2g, f3, f3g, body, bg, env); if (clip) p.nodes.push(clip);
    return { ...p, end: t + dur + .05 };
  }
  // The soft clipper the stego's roar is driven into: one curve, made once and shared; one WaveShaperNode a sound (null without one).
  shaper() {
    if (!this.ctx.createWaveShaper) return null;
    if (!this.clipCurve) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * 2.5) / Math.tanh(2.5); } this.clipCurve = c; }
    const w = this.ctx.createWaveShaper(); w.curve = this.clipCurve; return w;
  }
  biteVoice(t, out, L, heavy) {
    const p = { src: [], nodes: [] }, nz = this.noiseSrc(t), hp = this.filter("highpass", heavy ? 2400 : 3000), cg = this.gain(0), bp = this.filter("bandpass", heavy ? 380 : 520, 1.6), wg = this.gain(0);
    nz.connect(hp); hp.connect(cg); cg.connect(out); nz.connect(bp); bp.connect(wg); wg.connect(out);
    this.spikes(cg.gain, heavy ? [t, t + .045] : [t], heavy ? [L * .9, L * .6] : [L * .8], .02);
    wg.gain.setValueAtTime(0, t + .005); wg.gain.linearRampToValueAtTime(L * .6, t + .012); wg.gain.exponentialRampToValueAtTime(.0001, t + (heavy ? .2 : .13));
    p.src.push(nz); p.nodes.push(nz, hp, cg, bp, wg);
    const end = this.thump(p, t + .004, out, L, heavy ? 100 : 150, heavy ? 44 : 70, heavy ? .32 : .2);
    return { ...p, end: Math.max(end, t + .25) };
  }
  rakeVoice(t, out, L, heavy) {
    const p = { src: [], nodes: [] }, n = heavy ? 4 : 3, gap = .07, nz = this.noiseSrc(t), bp = this.filter("bandpass", 3000, 2.2), hp = this.filter("highpass", 600), g = this.gain(0), times = [];
    nz.connect(bp); bp.connect(hp); hp.connect(g); g.connect(out);
    for (let k = 0; k < n; k++) { const tk = t + k * gap; times.push(tk); bp.frequency.setValueAtTime(heavy ? 2300 : 3400, tk); bp.frequency.linearRampToValueAtTime(heavy ? 800 : 1300, tk + .065); }
    this.spikes(g.gain, times, times.map((_, k) => L * (1 - k * .12)), .065);
    p.src.push(nz); p.nodes.push(nz, bp, hp, g);
    return { ...p, end: t + n * gap + .15 };
  }
  slamVoice(t, out, L, big) {
    const p = { src: [], nodes: [] }, sub = this.osc("sine", big ? 60 : 68, t), sg = this.gain(0), nz = this.noiseSrc(t), cb = this.filter("bandpass", 850, .9), cg = this.gain(0), lp = this.filter("lowpass", 150, .8), rg = this.gain(0), pb = this.filter("bandpass", 2600, 1.4), pg = this.gain(0);
    sub.frequency.exponentialRampToValueAtTime(30, t + .7); sub.connect(sg); sg.connect(out); this.hit(sg.gain, t, .008, L, big ? 1.6 : 1.2);
    nz.connect(cb); cb.connect(cg); cg.connect(out); this.hit(cg.gain, t, .003, L * .7, .12);
    nz.connect(lp); lp.connect(rg); rg.connect(out); rg.gain.setValueAtTime(0, t); rg.gain.linearRampToValueAtTime(L * .9, t + .05); rg.gain.exponentialRampToValueAtTime(.0001, t + (big ? 2.2 : 1.6));
    const times = this.scatter(big ? 14 : 10, t + .12, t + 1.1); nz.connect(pb); pb.connect(pg); pg.connect(out); this.spikes(pg.gain, times, times.map((_, i) => L * .32 * (1 - .7 * i / times.length)), .02);
    p.src.push(sub, nz); p.nodes.push(sub, sg, nz, cb, cg, lp, rg, pb, pg);
    return { ...p, end: t + (big ? 2.3 : 1.7) };
  }
}

// Each sound's builder: (t, out, level, cue) -> { src, nodes, end }, called on the BattleSfx.
const SYNTH = {
  roarSpino(t, out, L) { return this.roarVoice(t, out, L, { dur: 1.9, f0: 62, am: 27, f1: [320, 640, 300], f2: [950, 1500, 760] }); },
  roarBig(t, out, L) { return this.roarVoice(t, out, L, { dur: 2.5, f0: 54, am: 24, f1: [300, 660, 280], f2: [900, 1550, 700], big: true }); },
  growlSpino(t, out, L) { return this.roarVoice(t, out, L, { dur: .8, f0: 72, am: 33, f1: [380, 520, 330], f2: [1000, 1250, 850] }); },
  inhale(t, out, L) { const p = { src: [], nodes: [] }; return { ...p, end: this.sweep(p, t, out, L, 1.1, 420, 1300, 1.3) }; },
  bellowStego(t, out, L) { return this.bellowVoice(t, out, L, .95); },
  bellowShort(t, out, L) { return this.bellowVoice(t, out, L, .5); },
  biteSpino(t, out, L) { return this.biteVoice(t, out, L, true); },
  biteStego(t, out, L) { return this.biteVoice(t, out, L, false); },
  rakeSpino(t, out, L) { return this.rakeVoice(t, out, L, true); },
  rakeStego(t, out, L) { return this.rakeVoice(t, out, L, false); },
  whoosh(t, out, L) { const p = { src: [], nodes: [] }; return { ...p, end: this.sweep(p, t, out, L, .3, 380, 1500) }; },
  whooshHeavy(t, out, L) { const p = { src: [], nodes: [] }; return { ...p, end: this.sweep(p, t, out, L, .42, 260, 1100) }; },
  whooshLight(t, out, L) { const p = { src: [], nodes: [] }; return { ...p, end: this.sweep(p, t, out, L, .2, 700, 2600) }; },
  tailSpino(t, out, L) { const p = { src: [], nodes: [] }, a = this.thump(p, t, out, L, 95, 42, .45), b = this.noiseBurst(p, t, out, L * .6, "bandpass", 600, 1, .004, .14).end; return { ...p, end: Math.max(a, b) }; },
  tailStego(t, out, L) { const p = { src: [], nodes: [] }, a = this.thump(p, t, out, L * .85, 120, 55, .35), b = this.crack(p, t + .004, out, L, [1250, 2890, 4630], .13); return { ...p, end: Math.max(a, b) }; },
  slam(t, out, L) { return this.slamVoice(t, out, L, false); },
  slamBig(t, out, L) { return this.slamVoice(t, out, L, true); },
  impact(t, out, L) { const p = { src: [], nodes: [] }, a = this.thump(p, t, out, L, 110, 48, .3), b = this.noiseBurst(p, t, out, L * .7, "bandpass", 700, 1, .003, .1).end, c = this.grains(p, t + .05, out, L * .3, this.scatter(4, t + .05, t + .35), 2400, 1.5, .02); return { ...p, end: Math.max(a, b, c) }; },
  wheelRoll(t, out, L) {
    const p = { src: [], nodes: [] }, nz = this.noiseSrc(t), lp = this.filter("lowpass", 380), rg = this.gain(.5), l1 = this.osc("sine", 11, t), l1g = this.gain(.5), bp = this.filter("bandpass", 1500, 2), gg = this.gain(.25), l2 = this.osc("square", 17, t), l2g = this.gain(.22), hum = this.osc("sine", 48, t), hg = this.gain(.35), env = this.gain(0);
    nz.connect(lp); lp.connect(rg); l1.connect(l1g); l1g.connect(rg.gain); rg.connect(env); nz.connect(bp); bp.connect(gg); l2.connect(l2g); l2g.connect(gg.gain); gg.connect(env); hum.connect(hg); hg.connect(env); env.connect(out);
    const R = BATTLE_SFX.roll; env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(L, t + .3); env.gain.setValueAtTime(L, t + R.max - R.release); env.gain.linearRampToValueAtTime(0, t + R.max);
    p.src.push(nz, l1, l2, hum); p.nodes.push(nz, lp, rg, l1, l1g, bp, gg, l2, l2g, hum, hg, env);
    return { ...p, end: t + R.max, handle: { env, sources: p.src } };
  },
  wheelCrunch(t, out, L) { const p = { src: [], nodes: [] }, a = this.noiseBurst(p, t, out, L * .8, "bandpass", 1100, .9, .003, .14).end, b = this.thump(p, t, out, L * .8, 100, 50, .3), c = this.crack(p, t + .01, out, L * .8, [1350, 3050], .1); return { ...p, end: Math.max(a, b, c) }; },
  digScrape(t, out, L) {
    const p = { src: [], nodes: [] }, nz = this.noiseSrc(t), bp = this.filter("bandpass", 500, 1.2), g = this.gain(0), am = this.gain(.5), lfo = this.osc("sine", 9, t), lg = this.gain(.5), dur = .9;
    bp.frequency.setValueAtTime(500, t); bp.frequency.linearRampToValueAtTime(950, t + dur * .5); bp.frequency.linearRampToValueAtTime(600, t + dur);
    nz.connect(bp); bp.connect(am); lfo.connect(lg); lg.connect(am.gain); am.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(L, t + dur * .3); g.gain.linearRampToValueAtTime(L * .7, t + dur * .8); g.gain.linearRampToValueAtTime(0, t + dur);
    p.src.push(nz, lfo); p.nodes.push(nz, bp, g, am, lfo, lg); return { ...p, end: t + dur + .03 };
  },
  fling(t, out, L, c) {
    const p = { src: [], nodes: [] }, land = Math.max(.3, Math.min(1.6, Number(c?.land) || .8)), a = this.sweep(p, t, out, L * .6, .25, 500, 1700);
    const times = this.scatter(9, t + land, t + land + .55), b = this.grains(p, t + land, out, L, times, 2200, 3, .03), d = this.grains(p, t + land, out, L * .8, times.filter((_, i) => i % 2 === 0), 520, 1, .06);
    return { ...p, end: Math.max(a, b, d) };
  },
  rockets(t, out, L, c) {
    const p = { src: [], nodes: [] }, arms = (Array.isArray(c?.arms) && c.arms.length ? c.arms : [.7, 1, 1.3]).slice(0, 8).map((a) => t + Math.max(.2, Number(a) || .7)), first = arms[0];
    const o = this.osc("sine", 800, t), wg = this.gain(0); o.frequency.exponentialRampToValueAtTime(2400, first); o.connect(wg); wg.connect(out);
    wg.gain.setValueAtTime(0, t); wg.gain.linearRampToValueAtTime(L * .22, t + .1); wg.gain.linearRampToValueAtTime(L * .3, first - .03); wg.gain.linearRampToValueAtTime(0, first);
    p.src.push(o); p.nodes.push(o, wg);
    const a = this.grains(p, first, out, L, arms, 1800, .8, .07), b = this.grains(p, first, out, L * .7, arms, 600, 1, .14);
    return { ...p, end: Math.max(a, b) };
  },
  boneVolley(t, out, L, c) {
    const p = { src: [], nodes: [] }, arms = (Array.isArray(c?.arms) && c.arms.length ? c.arms : [.55, .77, .99]).slice(0, 8).map((a) => t + Math.max(.2, Number(a) || .5));
    const rattle = Array.from({ length: 6 }, (_, j) => t + j * .035), a = this.grains(p, t, out, L * .8, rattle, 2900, 7, .025);
    const b = this.grains(p, arms[0], out, L, arms, 1100, .8, .1), d = this.grains(p, arms[0], out, L * .6, arms, 3100, 5, .04);
    return { ...p, end: Math.max(a, b, d) };
  },
  boneCrackle(t, out, L) { const p = { src: [], nodes: [] }; return { ...p, end: this.grains(p, t, out, L, this.scatter(10, t, t + .5), 3400, 2.5, .02) }; },
  spear(t, out, L) { const p = { src: [], nodes: [] }, a = this.sweep(p, t, out, L * .5, .12, 900, 2600), b = this.crack(p, t + .09, out, L, [1700, 3100], .09), d = this.thump(p, t + .09, out, L * .7, 140, 70, .2); return { ...p, end: Math.max(a, b, d) }; },
  crunch(t, out, L) { const p = { src: [], nodes: [] }, a = this.biteVoice(t, out, L, true), b = this.crack(p, t + .02, out, L * .8, [900, 2300, 3700], .12); return { src: [...a.src, ...p.src], nodes: [...a.nodes, ...p.nodes], end: Math.max(a.end, b) }; },
  chew(t, out, L) { const p = { src: [], nodes: [] }, a = this.thump(p, t, out, L * .8, 85, 48, .25), b = this.noiseBurst(p, t + .01, out, L * .5, "bandpass", 420, 1.5, .006, .12).end, d = this.crack(p, t + .02, out, L * .4, [1500], .04); return { ...p, end: Math.max(a, b, d) }; },
  woodCrack(t, out, L) { const p = { src: [], nodes: [] }, a = this.noiseBurst(p, t, out, L, "bandpass", 1700, 3, .001, .06).end, b = this.noiseBurst(p, t + .02, out, L * .5, "bandpass", 800, 2, .01, .25).end, d = this.thump(p, t, out, L * .8, 90, 45, .4); return { ...p, end: Math.max(a, b, d) }; },
  roarHit(t, out, L) { const p = { src: [], nodes: [] }, a = this.thump(p, t, out, L, 70, 36, .5), b = this.noiseBurst(p, t, out, L * .6, "lowpass", 140, .8, .04, 1).end; return { ...p, end: Math.max(a, b) }; },
  footSpino(t, out, L) { const p = { src: [], nodes: [] }; return { ...p, end: this.thump(p, t, out, L, 58, 36, .34) }; },
  footApato(t, out, L) { const p = { src: [], nodes: [] }; return { ...p, end: this.thump(p, t, out, L, 44, 28, .42) }; }, // the Earth Apatosaurus: the deepest tread
  footStego(t, out, L) { const p = { src: [], nodes: [] }; return { ...p, end: this.thump(p, t, out, L, 76, 48, .24) }; },
  // the grabs: the slammed body coming down (a swish and a heavy body thump), the lift's strain (a low, straining growl), and rockfall
  thrash(t, out, L) { const p = { src: [], nodes: [] }, a = this.sweep(p, t, out, L * .55, .22, 300, 1100), b = this.thump(p, t + .14, out, L, 88, 40, .34), d = this.noiseBurst(p, t + .14, out, L * .45, "bandpass", 520, 1.2, .004, .12).end; return { ...p, end: Math.max(a, b, d) }; },
  strain(t, out, L) { return this.roarVoice(t, out, L, { dur: .75, f0: 48, am: 19, f1: [300, 420, 340], f2: [800, 950, 820] }); },
  rockfall(t, out, L) {
    const p = { src: [], nodes: [] }, a = this.thump(p, t, out, L, 74, 38, .42), b = this.noiseBurst(p, t, out, L * .6, "bandpass", 1300, 1, .002, .09).end;
    const c = this.grains(p, t + .03, out, L * .45, this.scatter(9, t + .03, t + .6), 2900, 1.8, .02), d = this.noiseBurst(p, t + .02, out, L * .4, "lowpass", 170, .8, .03, .7).end;
    return { ...p, end: Math.max(a, b, c, d) };
  },
  shed(t, out, L) {
    const p = { src: [], nodes: [] }, a = this.grains(p, t, out, L, this.scatter(26, t, t + 1.4), 3400, 2.5, .02), b = this.grains(p, t + .05, out, L * .6, this.scatter(9, t + .05, t + 1.2), 1600, 6, .035);
    const d = this.noiseBurst(p, t, out, L * .4, "lowpass", 300, .8, .3, 1.1).end; return { ...p, end: Math.max(a, b, d) };
  },
};

Object.assign(BattleSfx.prototype, {
  // ---- the rolling wheel: a loop that follows the stego until it uncurls (or `roll.max` s) ----
  startRoll(c, listener, now) {
    if (this.rolls[c.id]) return true;
    const who = this.pair?.stego?.id === c.id ? this.pair.stego : null, at = now + BATTLE_SFX.lead;
    const spec = BATTLE_SFX.sounds.wheelRoll, where = this.place(c.x, c.y, listener); if (!where) return false;
    const v = this.claim(spec[1], at, at + BATTLE_SFX.roll.max); if (!v) return false;
    const w = this.ctx.createGain(); w.gain.value = where.gain; let pan = null;
    if (this.ctx.createStereoPanner) { pan = this.ctx.createStereoPanner(); pan.pan.value = where.pan; w.connect(pan); pan.connect(this.bus); } else w.connect(this.bus);
    const made = SYNTH.wheelRoll.call(this, at, w, spec[0], c);
    this.finish(made.src, [...made.nodes, w, ...(pan ? [pan] : [])], made.end);
    this.rolls[c.id] = { who: who || { x: c.x, y: c.y, stegoRoll: 1 }, voice: v, end: made.end, env: made.handle.env, sources: made.src, where: w, pan };
    this.stats.played++; this.stats.byName.wheelRoll = (this.stats.byName.wheelRoll || 0) + 1;
    this.emit({ type: "sfx", name: "wheelRoll", at, end: made.end, gain: where.gain, pan: where.pan });
    return true;
  },
  stopRoll(id, now = this.now()) {
    const r = this.rolls[id]; if (!r) return; delete this.rolls[id];
    if (now >= r.end) return;
    const end = now + BATTLE_SFX.roll.release, g = r.env.gain; g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, end);
    for (const s of r.sources) s.stop(end + .02);
    r.voice.end = end + .02; r.end = end;
  },
  // ---- the undercurrent (DUEL.undercurrent): a sub drone and a slow heartbeat on the music bus ----
  startUndercurrent(now = this.now()) {
    if (this.under || this.muted) return;
    const U = BATTLE_SFX.undercurrent, a = this.osc("sine", U.hz, now), b = this.osc("sine", U.hz * 2, now), bg = this.gain(U.octave), g = this.gain(0);
    a.connect(g); b.connect(bg); bg.connect(g); g.connect(this.musicOut);
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(U.gain, now + U.fade);
    this.under = { a, b, bg, g, next: now + U.fade * .5 };
    this.emit({ type: "undercurrent", on: true, at: now });
  },
  stopUndercurrent(now = this.now(), fade = BATTLE_SFX.undercurrent.fade) {
    const u = this.under; if (!u) return; this.under = null;
    u.g.gain.cancelScheduledValues(now); u.g.gain.setValueAtTime(u.g.gain.value, now); u.g.gain.linearRampToValueAtTime(0, now + fade);
    u.a.stop(now + fade + .05); u.b.stop(now + fade + .05); u.a.onended = () => { for (const n of [u.a, u.b, u.bg, u.g]) try { n.disconnect(); } catch { /* gone */ } };
    this.emit({ type: "undercurrent", on: false, at: now });
  },
  tickUndercurrent(now) {
    const u = this.under; if (!u) { if (this.dueling && DUEL.undercurrent) this.startUndercurrent(now); return; }
    const U = BATTLE_SFX.undercurrent;
    if (u.next < now) u.next = now + .05;
    while (u.next < now + U.ahead) {
      for (const [dt, k] of [[0, 1], [U.dub, .6]]) {
        const t = u.next + dt, o = this.osc("sine", 62, t), g = this.gain(0); o.frequency.exponentialRampToValueAtTime(40, t + .2); o.connect(g); g.connect(this.musicOut);
        this.hit(g.gain, t, .006, U.thump * k, .32); o.stop(t + .4); o.onended = () => { o.disconnect(); g.disconnect(); };
      }
      u.next += U.beat;
    }
  },
});
export const createBattleSfx = (ctx, options) => new BattleSfx(ctx, options);
