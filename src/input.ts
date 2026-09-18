export function normalizeVector(x, y) {
  const m = Math.hypot(x, y);
  return m > 1 ? { x: x / m, y: y / m } : { x, y };
}
export function shapeStick(x, y, dead = 0.16) {
  const raw = Math.hypot(x, y);
  if (raw <= dead) return { x: 0, y: 0 };
  const magnitude = Math.min(1, (raw - dead) / (1 - dead)) ** 2,
    scale = magnitude / raw;
  return { x: x * scale, y: y * scale };
}
export function smoothAxis(current, target, dt, response = 18) {
  return (
    current + (target - current) * (1 - Math.exp(-response * Math.max(0, dt)))
  );
}
export function dragVector(dx, dy, radius = 72) {
  return shapeStick(dx / radius, dy / radius, 0.12);
}
export function createInput(root, host = globalThis) {
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
  let pointer = null,
    origin = null,
    moved = false,
    started = 0;
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
    pointer = null;
    origin = null;
    moved = false;
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
    if (pointer !== e.pointerId || !origin) return;
    const dx = e.clientX - origin.x,
      dy = e.clientY - origin.y;
    if (Math.hypot(dx, dy) > 10) moved = true;
    const v = dragVector(dx, dy);
    target.x = v.x;
    target.y = v.y;
  }
  canvas.onpointerdown = (e) => {
    if (pointer !== null) return;
    pointer = e.pointerId;
    origin = { x: e.clientX, y: e.clientY };
    started = performance.now();
    moved = false;
    canvas.setPointerCapture?.(pointer);
  };
  canvas.onpointermove = move;
  const release = (e) => {
    if (pointer !== e.pointerId) return;
    const tap = !moved && performance.now() - started < 450,
      detail = {
        clientX: e.clientX,
        clientY: e.clientY,
        pointerType: e.pointerType,
      };
    clearPointer();
    if (tap) canvas.dispatchEvent(new CustomEvent("worldtap", { detail }));
  };
  canvas.onpointerup = release;
  canvas.onpointercancel = clearPointer;
  canvas.onlostpointercapture = (e) => {
    if (pointer === e.pointerId) clearPointer();
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
      if (pointer === null) {
        const v = normalizeVector(
          (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
            (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
          (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
            (keys.has("w") || keys.has("arrowup") ? 1 : 0),
        );
        target.x = v.x;
        target.y = v.y;
      }
      state.x = smoothAxis(state.x, target.x, dt);
      state.y = smoothAxis(state.y, target.y, dt);
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
