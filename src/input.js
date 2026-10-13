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
    },
    target = { x: 0, y: 0 },
    keys = new Set(),
    latch = new Set(),
    canvas = root.querySelector("#game");
  let movementPointer = null;
  const pointers = new Map();
  const actions = {
    j: "attack",
    q: "tool",
    r: "tool",
    f: "spell",
    " ": "dodge",
    k: "jump",
    e: "interact",
    h: "potion",
    p: "pause",
    escape: "pause",
    m: "map",
    i: "menu",
    l: "journal",
  };
  function clearPointer() {
    movementPointer = null;
    pointers.clear();
    target.x = target.y = 0;
  }
  function reset() {
    keys.clear();
    latch.clear();
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
  root.querySelectorAll("[data-action]").forEach(
    (b) =>
      (b.onpointerdown = (e) => {
        e.preventDefault();
        latch.add(b.dataset.action);
      }),
  );
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
    consume(k) {
      const v = state[k];
      state[k] = false;
      return v;
    },
  };
}
