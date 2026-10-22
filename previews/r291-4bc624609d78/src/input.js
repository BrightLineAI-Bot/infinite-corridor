export function normalizeVector(x, y) {
  const m = Math.hypot(x, y);
  return m > 1 ? { x: x / m, y: y / m } : { x, y };
}
export function shapeStick(x, y, dead = 0.16, curve = 2) {
  const raw = Math.hypot(x, y);
  if (raw <= dead) return { x: 0, y: 0 };
  const magnitude = Math.min(1, (raw - dead) / (1 - dead)) ** curve,
    scale = magnitude / raw;
  return { x: x * scale, y: y * scale };
}
export function smoothAxis(current, target, dt, response = 30) {
  return (
    current + (target - current) * (1 - Math.exp(-response * Math.max(0, dt)))
  );
}
export function dragVector(dx, dy, radius = 52, deadzone = .08) {
  return shapeStick(dx / radius, dy / radius, deadzone, 1.2);
}
export function createInput(root, host = globalThis, options = {}) {
  const state = {
      x: 0,
      y: 0,
      attack: false,
      tool: false,
      spell: false,
      dodge: false,
      jump: false,
      interact: false,
      potion: false,
      menu: false,
      pause: false,
      map: false,
      journal: false,
      preset: false,
      build: false,
    },
    target = { x: 0, y: 0 },
    keys = new Set(),
    latch = new Set(),
    heldButtons = new Set(),
    canvas = root.querySelector("#game");
  let movementPointer = null;
  const pointers = new Map();
  const actions = {
    j: "attack",
    q: "tool",
    r: "tool",
    f: "spell",
    g: "spell2",
    " ": "dodge",
    k: "jump",
    e: "interact",
    h: "potion",
    p: "pause",
    escape: "pause",
    m: "map",
    i: "menu",
    l: "journal",
    t: "preset",
    b: "build",
  };
  function clearPointer() {
    movementPointer = null;
    pointers.clear();
    target.x = target.y = 0;
  }
  function reset() {
    keys.clear();
    latch.clear();
    heldButtons.clear();
    clearPointer();
    state.x = state.y = 0;
    for (const k in state) if (k !== "x" && k !== "y") state[k] = false;
  }
  function keydown(e) {
    const k = e.key.toLowerCase();
    keys.add(k);
    if (actions[k] && !e.repeat) latch.add(actions[k]);
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
      e.preventDefault();
  }
  function move(e) {
    const record = pointers.get(e.pointerId);
    if (!record) return;
    const dx = e.clientX - record.x,
      dy = e.clientY - record.y;
    if (Math.hypot(dx, dy) > 10) record.moved = true;
    if (movementPointer !== e.pointerId) return;
    const sensitivity = Math.max(.7, Math.min(1.8, Number(options.controlSensitivity) || 1)),
      v = dragVector(dx * sensitivity, dy * sensitivity, 52, Math.max(0, Math.min(.3, Number(options.controlDeadzone) || .08)));
    target.x = v.x;
    target.y = v.y;
  }
  canvas.onpointerdown = (e) => {
    pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      moved: false,
      started: performance.now(),
    });
    if (movementPointer === null) movementPointer = e.pointerId;
    canvas.setPointerCapture?.(e.pointerId);
  };
  canvas.onpointermove = move;
  const release = (e) => {
    const record = pointers.get(e.pointerId);
    if (!record) return;
    const tap = !record.moved && performance.now() - record.started < 450,
      detail = {
        clientX: e.clientX,
        clientY: e.clientY,
        pointerType: e.pointerType,
      };
    pointers.delete(e.pointerId);
    if (movementPointer === e.pointerId) {
      movementPointer = null;
      target.x = target.y = 0;
    }
    if (tap) canvas.dispatchEvent(new CustomEvent("worldtap", { detail }));
  };
  canvas.onpointerup = release;
  canvas.onpointercancel = (e) => {
    pointers.delete(e.pointerId);
    if (movementPointer === e.pointerId) {
      movementPointer = null;
      target.x = target.y = 0;
    }
  };
  canvas.onlostpointercapture = (e) => {
    if (pointers.has(e.pointerId)) canvas.onpointercancel(e);
  };
  host.addEventListener?.("keydown", keydown);
  host.addEventListener?.("keyup", (e) => keys.delete(e.key.toLowerCase()));
  host.addEventListener?.("blur", reset);
  root.addEventListener?.("visibilitychange", () => {
    if (root.hidden) reset();
  });
  // Release 126: action buttons fire on pointerdown, so an overlay (Pack, Map, Journal) can open under the finger
  // before the tap ends. The browser then delivers that same tap's click to whatever button now lies beneath it
  // (the Arcanum, Increase, Equip, Salvage...). Swallow the click that belongs to the action button's own gesture.
  let actionTap = null;
  const press = (b, e) => {
    e.preventDefault();
    actionTap = { button: b, pointerId: e.pointerId, until: performance.now() + 1500 };
    latch.add(b.dataset.action);
    heldButtons.add(b.dataset.action);
    // Release 281 (Tim: "We just want the button to be more responsive"): the button lights the instant it is touched.
    b.classList?.add("pressed"); clearTimeout(b.pressedTimer); b.pressedTimer = setTimeout(() => b.classList?.remove("pressed"), 160);
    // The release arrives where the press landed: the button itself, or the cluster for a press in a gap (release 181).
    const source = e.currentTarget || b, id = e.pointerId;
    const up = (q) => { if (q?.pointerId != null && id != null && q.pointerId !== id) return; heldButtons.delete(b.dataset.action); for (const t of ["pointerup", "pointercancel", "pointerleave"]) source.removeEventListener(t, up); };
    for (const t of ["pointerup", "pointercancel", "pointerleave"]) source.addEventListener(t, up);
  };
  root.querySelectorAll("[data-action]").forEach((b) => (b.onpointerdown = (e) => press(b, e)));
  // Release 179 (Tim's probe, 2026-10-18): a thumb that lands in the gap between action buttons pressed nothing; his
  // Dodge presses landed just off Dodge's lower-left curve. A press on the cluster itself goes to the button whose edge
  // is nearest, within GAP_REACH pixels, and Dodge (the action that has to land at once) wins ties by GAP_PRIORITY.
  const GAP_REACH = 24, GAP_PRIORITY = { dodge: 16 }; // release 281: wider, and Dodge wins any near tie (Tim: "Dodge needs to be incredibly sensitive")
  root.querySelectorAll?.(".action-diamond").forEach((d) => (d.onpointerdown = (e) => {
    if (e.target !== d) return;
    let best = null, bestGap = GAP_REACH;
    for (const b of d.querySelectorAll("[data-action]")) {
      const r = b.getBoundingClientRect?.();
      if (!r || !r.width || b.hidden) continue;
      const gap = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) - Math.min(r.width, r.height) / 2 - (GAP_PRIORITY[b.dataset.action] || 0);
      if (gap < bestGap) { bestGap = gap; best = b; }
    }
    if (best) press(best, e);
  }));
  root.addEventListener?.("click", (e) => {
    const tap = actionTap;
    actionTap = null;
    if (!tap || performance.now() > tap.until || tap.button.contains(e.target)) return;
    if (e.pointerId != null && e.pointerId >= 0 && e.pointerId !== tap.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  return {
    state,
    reset,
    update(dt = 1 / 60) {
      if (movementPointer === null) {
        const v = normalizeVector(
          (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
            (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
          (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
            (keys.has("w") || keys.has("arrowup") ? 1 : 0),
        );
        target.x = v.x;
        target.y = v.y;
      }
      const response = Math.max(10, Math.min(60, Number(options.controlSmoothing) || 30));
      state.x = smoothAxis(state.x, target.x, dt, response);
      state.y = smoothAxis(state.y, target.y, dt, response);
      for (const a of latch) state[a] = true;
      latch.clear();
    },
    // True while an action's key or on-screen button is held down (release 158: hold Act to leave the skiff).
    held(a) {
      if (heldButtons.has(a)) return true;
      for (const k in actions) if (actions[k] === a && keys.has(k)) return true;
      return false;
    },
    consume(k) {
      const v = state[k];
      state[k] = false;
      return v;
    },
  };
}
