// Diagnostic probe (release 165; Tim, 2026-10-17). Options → System starts a timed recording (5 minutes by default)
// while the player plays normally. Every unpaused frame contributes its interval, the time spent in each measured
// phase (input, update, render, hud, notices, persist), the time no phase accounts for (browser painting, compositing
// and garbage collection), ground-cache work, and what was on screen. Frames are grouped by situation (overworld,
// dungeon, aboard, open sea) so the report says where the dips are and which phase they come from. Touch and pointer
// events are logged too, to diagnose multi-touch input on a given device. Pure data: main.ts feeds it and copies the
// report; nothing here touches the save.
export const PROBE = { durationSeconds: 300, longFrames: 40, pointerLog: 600, eventLog: 300, hitchMs: 100 };
const PHASES = ["input", "update", "render", "hud", "notices", "persist"];

function percentile(sorted, p) { return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] : 0; }
function stats(values) {
  const sorted = Float64Array.from(values).sort(), n = sorted.length, sum = values.reduce((a, b) => a + b, 0);
  const r = (v) => Math.round(v * 100) / 100;
  return { n, mean: r(n ? sum / n : 0), p50: r(percentile(sorted, .5)), p95: r(percentile(sorted, .95)), p99: r(percentile(sorted, .99)), max: r(n ? sorted[n - 1] : 0) };
}

export function createProbe(clock = () => performance.now()) {
  let state = null, last = null;
  const probe = {
    get running() { return !!state; },
    get remaining() { return state ? Math.max(0, state.endsAt - clock()) / 1000 : 0; },
    get report() { return last; },
    start(info = {}, seconds = PROBE.durationSeconds) {
      const now = clock();
      state = { startedAt: now, endsAt: now + seconds * 1000, wall: new Date().toISOString(), info, buckets: new Map(), longFrames: [], pointer: [], events: [], hitches: 0, frames: 0, lastContext: null };
      return probe;
    },
    // One unpaused frame. sample: { interval, phases: {kind: ms}, context: {...}, ground: {builds, patches} }.
    frame(sample) {
      if (!state) return;
      const now = clock(), ctx = sample.context || {}, key = [ctx.area || "?", ctx.aboard ? "boat" : "", ctx.openSea ? "openSea" : ""].filter(Boolean).join("/");
      let b = state.buckets.get(key);
      if (!b) { b = { interval: [], unaccounted: [], phases: Object.fromEntries(PHASES.map((k) => [k, []])), over33: 0, over50: 0, over100: 0, groundBuilds: 0, groundPatches: 0, enemies: 0, projectiles: 0 }; state.buckets.set(key, b); }
      const iv = Math.max(0, Number(sample.interval) || 0), phases = sample.phases || {};
      let accounted = 0;
      for (const k of PHASES) { const v = Number(phases[k]) || 0; b.phases[k].push(v); accounted += v; }
      b.interval.push(iv); b.unaccounted.push(Math.max(0, iv - accounted));
      if (iv > 33.4) b.over33++; if (iv > 50) b.over50++; if (iv > 100) b.over100++;
      b.groundBuilds += sample.ground?.builds || 0; b.groundPatches += sample.ground?.patches || 0;
      b.enemies = Math.max(b.enemies, ctx.enemies || 0); b.projectiles = Math.max(b.projectiles, ctx.projectiles || 0);
      state.frames++;
      if (iv >= PROBE.hitchMs) state.hitches++;
      const where = `${key} ${ctx.section || ""}`;
      if (state.lastContext !== where) { probe.event("context", { where }); state.lastContext = where; }
      const lf = state.longFrames;
      if (lf.length < PROBE.longFrames || iv > lf[lf.length - 1].interval) {
        lf.push({ t: Math.round((now - state.startedAt) / 100) / 10, interval: Math.round(iv * 10) / 10, phases: Object.fromEntries(PHASES.map((k) => [k, Math.round((Number(phases[k]) || 0) * 10) / 10])), unaccounted: Math.round(Math.max(0, iv - accounted) * 10) / 10, ground: sample.ground, context: ctx, recent: state.events.slice(-4) });
        lf.sort((a, c) => c.interval - a.interval); if (lf.length > PROBE.longFrames) lf.length = PROBE.longFrames;
      }
      if (now >= state.endsAt) probe.stop();
    },
    event(type, detail = {}) {
      if (!state) return;
      state.events.push({ t: Math.round((clock() - state.startedAt) / 100) / 10, type, ...detail });
      if (state.events.length > PROBE.eventLog) state.events.shift();
    },
    pointer(e) {
      if (!state || state.pointer.length >= PROBE.pointerLog) return;
      const t = e.target, target = t?.dataset?.action ? `action:${t.dataset.action}` : t?.id ? `#${t.id}` : t?.tagName ? `${t.tagName.toLowerCase()}${t.className && typeof t.className === "string" ? "." + t.className.split(" ")[0] : ""}` : "?";
      state.pointer.push({ t: Math.round((clock() - state.startedAt) / 10) / 100, type: e.type, id: e.pointerId ?? null, kind: e.pointerType || (e.touches ? "touch" : ""), touches: e.touches ? e.touches.length : undefined, target, x: Math.round(e.clientX ?? e.touches?.[0]?.clientX ?? 0), y: Math.round(e.clientY ?? e.touches?.[0]?.clientY ?? 0) });
    },
    stop() {
      if (!state) return last;
      const s = state; state = null;
      const buckets = {};
      for (const [key, b] of s.buckets) {
        const iv = stats(b.interval);
        buckets[key] = { frames: iv.n, fps: iv.mean ? Math.round(1000 / iv.mean * 10) / 10 : 0, interval: iv, over33ms: b.over33, over50ms: b.over50, over100ms: b.over100, unaccounted: stats(b.unaccounted), phases: Object.fromEntries(PHASES.map((k) => [k, stats(b.phases[k])])), groundBuilds: b.groundBuilds, groundPatches: b.groundPatches, maxEnemies: b.enemies, maxProjectiles: b.projectiles };
      }
      last = { probe: 1, started: s.wall, seconds: Math.round((clock() - s.startedAt) / 1000), frames: s.frames, hitchesOver100ms: s.hitches, info: s.info, note: "interval = time between frames; phases = game code per frame; unaccounted = interval minus phases (browser painting, compositing, garbage collection, or waiting for the screen)", buckets, longFrames: s.longFrames, events: s.events, pointer: s.pointer };
      return last;
    },
  };
  return probe;
}
