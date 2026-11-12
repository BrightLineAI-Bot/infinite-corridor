// The Stego Bait's hook (Tim, 2026-11-12). The Wild Stegosaurus's tail, cut off (monster-pack.ts STEGO), becomes one "Stego Bait":
// placed on the ground it holds every monster's attention for STEGO.baitSeconds. monster-pack.ts calls onStegoTailSevered(e, w)
// once, on the frame the tail comes away. This is a minimal stand-in: it records where the tail fell (e.stegoTailDrop, a plain
// field kept with the beast) and asks the world, if it can, to lay the severed tail down as a pickup (w.dropStegoTail). The Bait
// item, its pickup and its use are built in this module later; it imports nothing, so it can never form an import cycle.
export function onStegoTailSevered(e, w) {
  if (!e || e.stegoTailDrop) return null;
  const h = e.stegoHeading || { x: e.facingX || 1, y: 0 }, m = Math.hypot(h.x, h.y) || 1, back = (Number(e.bodyRadius) || .4) * 1.8;
  const drop = { x: Math.round(((Number(e.x) || 0) - h.x / m * back) * 100) / 100, y: Math.round(((Number(e.y) || 0) - h.y / m * back) * 100) / 100, item: "stegoBait", at: Number(w?.now) || 0 };
  e.stegoTailDrop = drop;
  w?.dropStegoTail?.(e, drop);
  return drop;
}
