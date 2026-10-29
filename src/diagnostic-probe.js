// Diagnostic probe (release 165; Tim, 2026-10-17). Options → System starts a timed recording (5 minutes by default)
// while the player plays normally. Every unpaused frame contributes its interval, the time spent in each measured
// phase (input, update, render, hud, notices, persist), the time no phase accounts for (browser painting, compositing
// and garbage collection), ground-cache work, and what was on screen. Frames are grouped by situation (overworld,
// dungeon, aboard, open sea) so the report says where the dips are and which phase they come from. Touch and pointer
// events are logged too, to diagnose multi-touch input on a given device. Pure data: main.ts feeds it and copies the
// report; nothing here touches the save. Release 167: main.ts pairs each interval with the frame it measures (the one
// before it) and adds the render split.
export const PROBE = { durationSeconds: 300, longFrames: 40, pointerLog: 600, eventLog: 300, hitchMs: 100, loafs: 40, loafMs: 50, saves: 120, heapDropMb: 2 };
// Release 555 (Tim's probe: 80-108 ms frames where the game's own work was ~1.5 ms): three more things, so a report says
// where the rest went.
// - The browser's own account of each long frame (Long Animation Frames, Chrome 123+; else "longtask" entries): how long it
//   blocked, how much was rendering and style, and the scripts that ran in it.
// - The JS heap (Chrome's performance.memory) before and after each long frame: a big drop means garbage collection ran.
// - Every save write: how long the database's copy took on the main thread, and how many areas it carried.
const MB = 1048576, r1 = (v) => Math.round(v * 10) / 10;
const heapNow = () => { try { const m = globalThis.performance?.memory; return m && Number.isFinite(m.usedJSHeapSize) ? m.usedJSHeapSize : null; } catch { return null; } };
const shortSource = (u) => String(u || "").split("?")[0].split("/").slice(-1)[0];
const PHASES = ["input", "update", "render", "hud", "notices", "persist"];
// Release 167: render is split into the ground (cached terrain and its animated water), the world (hazards, creatures,
// objects, buildings) and the overlay (fog, weather, tint, vignette, label), so a report says which part is slow.
const RENDER_PARTS = ["ground", "world", "overlay"];

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
      state = { startedAt: now, endsAt: now + seconds * 1000, wall: new Date().toISOString(), info, buckets: new Map(), longFrames: [], pointer: [], events: [], hitches: 0, frames: 0, lastContext: null, loafs: [], saves: [], observer: null, heapPrev: heapNow(), heap: { start: heapNow(), min: null, max: null, drops: 0 } };
      try { // release 555: the browser's own long-frame entries, where it gives them
        const types = globalThis.PerformanceObserver?.supportedEntryTypes || [], type = types.includes("long-animation-frame") ? "long-animation-frame" : types.includes("longtask") ? "longtask" : null;
        if (type) { const st = state; st.observer = new PerformanceObserver((list) => { for (const e of list.getEntries()) probe.loaf(e, type, st); }); st.observer.observe({ type, buffered: false }); }
      } catch {}
      return probe;
    },
    // One unpaused frame. sample: { interval, phases: {kind: ms}, render: {part: ms}, context: {...}, ground: {builds, patches} }.
    frame(sample) {
      if (!state) return;
      const now = clock(), ctx = sample.context || {}, key = [ctx.area || "?", ctx.aboard ? "boat" : "", ctx.openSea ? "openSea" : ""].filter(Boolean).join("/");
      let b = state.buckets.get(key);
      if (!b) { b = { interval: [], unaccounted: [], phases: Object.fromEntries(PHASES.map((k) => [k, []])), renderParts: Object.fromEntries(RENDER_PARTS.map((k) => [k, []])), over33: 0, over50: 0, over100: 0, groundBuilds: 0, groundPatches: 0, enemies: 0, projectiles: 0 }; state.buckets.set(key, b); }
      const iv = Math.max(0, Number(sample.interval) || 0), phases = sample.phases || {};
      const heap = heapNow(), heapDrop = heap !== null && state.heapPrev !== null ? state.heapPrev - heap : null; // release 555
      if (heap !== null) { const h = state.heap; h.min = h.min === null ? heap : Math.min(h.min, heap); h.max = h.max === null ? heap : Math.max(h.max, heap); if (heapDrop > PROBE.heapDropMb * MB) h.drops++; state.heapPrev = heap; }
      let accounted = 0;
      for (const k of PHASES) { const v = Number(phases[k]) || 0; b.phases[k].push(v); accounted += v; }
      b.interval.push(iv); b.unaccounted.push(Math.max(0, iv - accounted));
      for (const k of RENDER_PARTS) b.renderParts[k].push(Number(sample.render?.[k]) || 0);
      if (iv > 33.4) b.over33++; if (iv > 50) b.over50++; if (iv > 100) b.over100++;
      b.groundBuilds += sample.ground?.builds || 0; b.groundPatches += sample.ground?.patches || 0;
      b.enemies = Math.max(b.enemies, ctx.enemies || 0); b.projectiles = Math.max(b.projectiles, ctx.projectiles || 0);
      state.frames++;
      if (iv >= PROBE.hitchMs) state.hitches++;
      const where = `${key} ${ctx.section || ""}`;
      if (state.lastContext !== where) { probe.event("context", { where }); state.lastContext = where; }
      const lf = state.longFrames;
      if (lf.length < PROBE.longFrames || iv > lf[lf.length - 1].interval) {
        lf.push({ t: Math.round((now - state.startedAt) / 100) / 10, interval: Math.round(iv * 10) / 10, phases: Object.fromEntries(PHASES.map((k) => [k, Math.round((Number(phases[k]) || 0) * 10) / 10])), render: Object.fromEntries(RENDER_PARTS.map((k) => [k, Math.round((Number(sample.render?.[k]) || 0) * 10) / 10])), unaccounted: Math.round(Math.max(0, iv - accounted) * 10) / 10, ...(heap !== null ? { heapMb: r1(heap / MB), heapDropMb: r1((heapDrop || 0) / MB) } : {}), ground: sample.ground, context: ctx, recent: state.events.slice(-4) });
        lf.sort((a, c) => c.interval - a.interval); if (lf.length > PROBE.longFrames) lf.length = PROBE.longFrames;
      }
      if (now >= state.endsAt) probe.stop();
    },
    // Release 555: one Long Animation Frame (or long task) from the browser; the `loafs` longest are kept.
    loaf(e, type = "long-animation-frame", st = state) {
      if (!st || st !== state || !(e?.duration >= PROBE.loafMs)) return;
      const end = e.startTime + e.duration, entry = { t: r1((e.startTime - st.startedAt) / 1000), type, ms: r1(e.duration),
        ...(e.blockingDuration !== undefined ? { blocking: r1(e.blockingDuration) } : {}),
        ...(e.renderStart ? { render: r1(end - e.renderStart) } : {}), ...(e.styleAndLayoutStart ? { styleLayout: r1(end - e.styleAndLayoutStart) } : {}),
        ...(Array.isArray(e.scripts) ? { scripts: e.scripts.slice().sort((a, b) => b.duration - a.duration).slice(0, 3).map((q) => ({ ms: r1(q.duration), invoker: String(q.invoker || "").slice(0, 60), type: q.invokerType || "", fn: q.sourceFunctionName || "", src: shortSource(q.sourceURL), ...(q.forcedStyleAndLayoutDuration ? { forcedLayout: r1(q.forcedStyleAndLayoutDuration) } : {}) })) } : {}) };
      const list = st.loafs; list.push(entry); list.sort((a, b) => b.ms - a.ms); if (list.length > PROBE.loafs) list.length = PROBE.loafs;
    },
    // Release 555: one save write (persistence.ts setWriteTimingListener): { ms, areas, of }.
    save(detail = {}) { if (!state || state.saves.length >= PROBE.saves) return; state.saves.push({ t: r1((clock() - state.startedAt) / 1000), ...detail }); },
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
      try { s.observer?.disconnect(); } catch {}
      const buckets = {};
      for (const [key, b] of s.buckets) {
        const iv = stats(b.interval);
        buckets[key] = { frames: iv.n, fps: iv.mean ? Math.round(1000 / iv.mean * 10) / 10 : 0, interval: iv, over33ms: b.over33, over50ms: b.over50, over100ms: b.over100, unaccounted: stats(b.unaccounted), phases: Object.fromEntries(PHASES.map((k) => [k, stats(b.phases[k])])), renderParts: Object.fromEntries(RENDER_PARTS.map((k) => [k, stats(b.renderParts[k])])), groundBuilds: b.groundBuilds, groundPatches: b.groundPatches, maxEnemies: b.enemies, maxProjectiles: b.projectiles };
      }
      last = { probe: 1, started: s.wall, seconds: Math.round((clock() - s.startedAt) / 1000), frames: s.frames, hitchesOver100ms: s.hitches, info: s.info, note: "interval = time from this frame's start to the next (the frame's own work plus the browser painting it); phases = game code in that frame; renderParts = render split into ground, world and overlay; unaccounted = interval minus phases (browser painting, compositing, garbage collection, or waiting for the screen); heapMb/heapDropMb = JS heap at the long frame and how much it shrank since the frame before (a big drop is garbage collection); loafs = the browser's own longest frames (blocking, render and style time, and the scripts that ran); saves = each save write and how long the database's copy took on the main thread", buckets, longFrames: s.longFrames, loafs: s.loafs, heap: s.heap.start === null ? null : { startMb: r1(s.heap.start / MB), minMb: r1(s.heap.min / MB), maxMb: r1(s.heap.max / MB), dropsOver2Mb: s.heap.drops }, saves: s.saves, events: s.events, pointer: s.pointer };
      return last;
    },
  };
  return probe;
}
