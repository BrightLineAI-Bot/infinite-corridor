// Music in background (Tim, 2026-11-19: "when I close the phone or close the app the music keeps playing in the background,
// because it's so good... Make it an option in the audio options"). Options → Audio → Music in background, off by default.
//
// Off: exactly as before. Hiding the page pauses the game (main.ts pause(false, true), exact resume) and suspends the
// AudioContext, so nothing plays or is processed.
// On, and not muted: hiding the page still pauses the game the same way (no rendering, no simulation), but the AudioContext
// keeps running and only the soundtrack plays. Effects are muted, the pause duck is lifted, and the score is scheduled
// further ahead (BACKGROUND_MUSIC.lookahead) so a throttled background timer cannot leave gaps.
//
// How the music leaves the page while on: the music path (main.ts musicBus → filter → compressor → makeup) is routed through
// a MediaStreamAudioDestinationNode into a hidden <audio> element, behind its own gain that mirrors the master level. To the
// operating system that is ordinary media playback: Android Chrome shows a media notification and lock-screen controls and
// keeps the page alive; iOS Safari treats it as playback rather than page sound (best effort: WebKit may still interrupt
// Web Audio in the background). Effects stay on the direct, low-latency path. Where the bridge is unavailable (no
// createMediaStreamDestination, or play() refused) the music stays on the direct path and the context is simply not
// suspended: Android and desktop browsers keep a running AudioContext audible in the background. Nothing throws.
//
// The Media Session (lock screen, notification, headset buttons) pauses and plays the music only. This module holds no
// reference to the game: no handler here can unpause it. Returning to the app clears a lock-screen pause and everything
// resumes as before (the pause menu shows, the game waits for Continue).
export const BACKGROUND_MUSIC = {
  // Seconds of score scheduled ahead while hidden (the visible default is SOUNDTRACK.lookahead, 0.12 s): background timers
  // may run once a second, and this outlasts that.
  lookahead: 1.5,
  metadata: { title: "Infinite Corridor", artist: "Infinite Corridor", album: "Soundtrack" },
  artwork: [{ src: "./icon.svg", sizes: "any", type: "image/svg+xml" }],
  // Actions the score has no use for: cleared, so the lock screen shows play/pause only.
  idleActions: ["previoustrack", "nexttrack", "seekbackward", "seekforward", "seekto"],
};

// What to do with the sound when the page hides or shows. `frozen`: the page is being frozen or cached (no script will run,
// so nothing can be scheduled): always suspend. The game always pauses on hide, whatever this says.
export function audioPlan({ hidden, backgroundMusic, muted, musicPaused = false, frozen = false }) {
  if (!hidden) return { pauseGame: false, background: false, suspendContext: false, resumeContext: !muted, effectsMuted: !!muted, musicPlaying: !muted, lookahead: null };
  const background = !!backgroundMusic && !muted && !musicPaused && !frozen;
  if (background) return { pauseGame: true, background: true, suspendContext: false, resumeContext: false, effectsMuted: true, musicPlaying: true, lookahead: BACKGROUND_MUSIC.lookahead };
  return { pauseGame: true, background: false, suspendContext: true, resumeContext: false, effectsMuted: !!muted, musicPlaying: false, lookahead: null };
}

export class BackgroundMusic {
  // nav / doc / MediaMetadata are injectable for tests; defaults are the page's.
  constructor(options = {}) {
    this.nav = options.nav ?? globalThis.navigator;
    this.doc = options.doc ?? globalThis.document;
    this.Metadata = options.MediaMetadata ?? globalThis.MediaMetadata;
    this.enabled = false; this.hidden = false; this.musicPaused = false; this.active = false;
    this.audio = null; this.bridge = null; this.status = "off"; this.level = 0; this.session = false; this.savedSessionType = null;
  }
  // The audio graph, once the first tap built it (main.ts startAmbience). musicTail feeds master today; master feeds the speakers.
  attach({ ctx, musicTail, master, soundtrack = null, sfx = null, isMuted = () => false, level = 0 }) {
    this.audio = { ctx, musicTail, master, soundtrack, sfx, isMuted }; this.level = level;
    if (this.enabled) { this.enabled = false; this.setEnabled(true); }
  }
  muted() { try { return !!this.audio?.isMuted(); } catch { return false; } }
  // Turn the option on or off. Called from a tap (the setting, or the first tap that builds the graph), so play() is allowed.
  setEnabled(on) {
    on = !!on; if (on === this.enabled) return; this.enabled = on;
    if (!this.audio) return;
    if (on) { this.openBridge(); this.installSession(); this.setSessionType(true); }
    else { this.closeBridge(); this.clearSession(); this.setSessionType(false); this.musicPaused = false; }
  }
  // The master level (mute and master volume) as main.ts sets it on its master gain, mirrored onto the bridged music.
  setMasterLevel(level, ramp = 0) {
    this.level = Math.max(0, Number(level) || 0);
    const g = this.bridge?.gain; if (!g) return;
    try {
      const t = this.audio.ctx.currentTime;
      if (ramp > 0) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(.0001, g.gain.value), t); g.gain.linearRampToValueAtTime(this.level, t + ramp); }
      else g.gain.value = this.level;
    } catch { /* a level is a nicety */ }
  }
  openBridge() {
    const { ctx, musicTail, master } = this.audio;
    this.status = "direct";
    if (typeof ctx.createMediaStreamDestination !== "function" || typeof this.doc?.createElement !== "function") return;
    let bridge = null;
    try {
      const dest = ctx.createMediaStreamDestination(), gain = ctx.createGain(), element = this.doc.createElement("audio");
      gain.gain.value = this.level; gain.connect(dest);
      element.setAttribute?.("playsinline", ""); element.preload = "none"; element.srcObject = dest.stream;
      bridge = this.bridge = { dest, gain, element, routed: false };
      // The system paused the element itself (headphones unplugged, a call): the music counts as paused, so the scheduler
      // stops and the lock screen shows play. Our own pauses arrive here too and change nothing.
      element.onpause = () => { if (this.bridge === bridge && bridge.routed && !this.musicPaused) this.pauseMusic(); };
      const played = element.play();
      const route = () => {
        if (this.bridge !== bridge || bridge.routed) return;
        // The element is playing: the music moves onto it (connect first, so it never falls silent in between).
        musicTail.connect(gain); try { musicTail.disconnect(master); } catch { /* not connected */ }
        bridge.routed = true; this.status = "bridge"; this.setPlaybackState();
      };
      if (played && typeof played.then === "function") played.then(route, () => { if (this.bridge === bridge) this.dropBridge(); });
      else route();
    } catch { if (bridge) this.dropBridge(); else this.bridge = null; }
  }
  // Back to the direct path (the bridge failed, or the option was turned off).
  dropBridge() {
    const b = this.bridge; if (!b) return; this.bridge = null;
    const { musicTail, master } = this.audio;
    if (b.routed) { try { musicTail.connect(master); } catch { /* gone */ } try { musicTail.disconnect(b.gain); } catch { /* gone */ } }
    try { b.element.pause(); } catch { /* fine */ } try { b.element.srcObject = null; } catch { /* fine */ }
    try { b.gain.disconnect(); } catch { /* fine */ }
    this.status = this.enabled ? "direct" : "off";
  }
  closeBridge() { this.dropBridge(); this.status = "off"; }
  // Safari 16.4+: the page's audio is playback (music), not ambient page sound. Put back as it was when turned off.
  setSessionType(on) {
    const s = this.nav?.audioSession; if (!s || !("type" in s)) return;
    try { if (on) { this.savedSessionType ??= s.type; s.type = "playback"; } else if (this.savedSessionType != null) { s.type = this.savedSessionType; this.savedSessionType = null; } } catch { /* unsupported */ }
  }
  installSession() {
    const ms = this.nav?.mediaSession; if (!ms) return;
    this.session = true;
    try { if (typeof this.Metadata === "function") ms.metadata = new this.Metadata({ ...BACKGROUND_MUSIC.metadata, artwork: BACKGROUND_MUSIC.artwork }); } catch { /* fine */ }
    const set = (action, handler) => { try { ms.setActionHandler(action, handler); } catch { /* the browser does not know this action */ } };
    set("play", () => this.playMusic());
    set("pause", () => this.pauseMusic());
    set("stop", () => this.pauseMusic());
    for (const a of BACKGROUND_MUSIC.idleActions) set(a, null);
    this.setPlaybackState();
  }
  clearSession() {
    const ms = this.nav?.mediaSession; if (!ms || !this.session) return; this.session = false;
    for (const a of ["play", "pause", "stop", ...BACKGROUND_MUSIC.idleActions]) { try { ms.setActionHandler(a, null); } catch { /* fine */ } }
    try { ms.metadata = null; } catch { /* fine */ } try { ms.playbackState = "none"; } catch { /* fine */ }
  }
  setPlaybackState() {
    const ms = this.nav?.mediaSession; if (!ms || !this.session) return;
    try { ms.playbackState = this.musicPaused || this.muted() ? "paused" : "playing"; } catch { /* fine */ }
  }
  // ---- the Media Session's buttons: the music only, never the game ----
  pauseMusic() {
    if (!this.audio || this.musicPaused) return;
    this.musicPaused = true; this.active = false;
    try { this.audio.soundtrack?.setMuted(true); } catch { /* fine */ } // nothing scheduled while paused
    try { this.bridge?.element.pause(); } catch { /* fine */ }
    if (this.hidden) try { this.audio.ctx.suspend?.(); } catch { /* fine */ } // nothing left to play: the audio clock sleeps too
    this.setPlaybackState();
  }
  playMusic() {
    if (!this.audio || !this.musicPaused) return;
    this.musicPaused = false;
    const muted = this.muted();
    try { this.audio.soundtrack?.setMuted(muted); } catch { /* fine */ }
    try { const p = this.bridge?.element.play(); p?.catch?.(() => {}); } catch { /* fine */ }
    if (this.hidden) {
      const plan = audioPlan({ hidden: true, backgroundMusic: this.enabled, muted });
      if (plan.background) this.enterBackground(plan);
    }
    this.setPlaybackState();
  }
  // ---- the page hides and shows (main.ts pauses the game itself, before this) ----
  onHidden({ frozen = false } = {}) {
    this.hidden = true;
    const plan = audioPlan({ hidden: true, backgroundMusic: this.enabled, muted: this.muted(), musicPaused: this.musicPaused, frozen });
    if (!this.audio) return plan;
    if (plan.background) this.enterBackground(plan);
    else { this.active = false; try { this.audio.ctx.suspend?.(); } catch { /* fine */ } }
    return plan;
  }
  enterBackground(plan) {
    const { ctx, soundtrack, sfx } = this.audio;
    this.active = true;
    try { sfx?.setMuted(true); } catch { /* fine */ }
    try { soundtrack?.setLookahead?.(plan.lookahead); soundtrack?.setPaused(false); } catch { /* fine */ } // full level, not the pause duck
    try { if (ctx.state === "suspended") ctx.resume?.(); } catch { /* fine */ }
  }
  onVisible() {
    this.hidden = false; this.active = false;
    const muted = this.muted(), plan = audioPlan({ hidden: false, backgroundMusic: this.enabled, muted });
    this.musicPaused = false; // returning resumes everything, as before
    if (!this.audio) return plan;
    const { ctx, soundtrack, sfx, } = this.audio;
    try { soundtrack?.setLookahead?.(null); soundtrack?.setMuted(muted); } catch { /* fine */ }
    try { sfx?.setMuted(plan.effectsMuted); } catch { /* fine */ }
    if (this.bridge?.element?.paused) try { const p = this.bridge.element.play(); p?.catch?.(() => {}); } catch { /* fine */ }
    try { if (plan.resumeContext && ctx.state === "suspended") ctx.resume?.(); } catch { /* fine */ }
    this.setPlaybackState();
    return plan;
  }
}

export const createBackgroundMusic = (options) => new BackgroundMusic(options);
