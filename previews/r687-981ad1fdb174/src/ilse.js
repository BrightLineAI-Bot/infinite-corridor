// Ilse, the Lamplighter (release 415; docs/narrative-bible.md section 4, recurring character 1, and section 7, step 6): "As a
// child she lights lamps along a road; each one goes out as she passes, and she doesn't mind. As a woman she carries the last
// lamp that stays lit, and asks you to hold it while she sleeps (it is gone when she wakes). As an old woman she does not
// know you, and asks how the story ends. Five meetings; the last one is in the Far Sleep."
//
// She is rare and placed by seed: on a wild overworld section at least `minDepth` from Ember Refuge, a roll under `chance`
// sets her somewhere on open ground. Meetings 1–4 come in whatever order the Corridor deals them (a seeded pick among those
// not yet had), because the Corridor meets people out of order; the fifth waits for the Far Sleep and for three earlier
// meetings. Each meeting is spoken once and remembered in save.lore.ilse (the meetings had, as a string of digits; additive,
// normalised here). All writing is original to the game. Pure rules: no DOM.
import { hashSeed } from "./random.js?v=r687-981ad1fdb174";

export const ILSE = { chance: .045, minDepth: 3, finalAfter: 3 };
export const ILSE_MEETINGS = {
  1: { age: "child", name: "A girl with a taper", lines: [
    "“Don’t mind them going out. They’re only lamps. Lighting them is the part that’s mine.”",
    "She reaches up on her toes to the next lamp, and the one behind her quietly goes dark.",
    "“My name is Ilse. If you see a lit one, it was me. If you see a dark one, it was me before that.”"] },
  2: { age: "young", name: "Ilse, a young lamplighter", lines: [
    "“I counted them once. A hundred and twelve on this road, and every one went out behind me.”",
    "She shrugs, and her taper sputters and steadies.",
    "“My father says it’s a waste. I say the road was dark for a moment less. That’s not nothing.”"] },
  3: { age: "woman", name: "Ilse, carrying the last lamp", lines: [
    "She is older, and the lamp in her hands is the only one still burning. It does not go out.",
    "“Would you hold it? Only while I sleep. I haven’t slept since it started staying lit.”",
    "You hold it. It is warm, and heavier than a lamp should be. When she wakes, your hands are empty, and she thanks you anyway."] },
  4: { age: "old", name: "An old woman by a dark lamp", lines: [
    "She looks at you kindly and does not know you.",
    "“I used to light these. All of them. A long road of them.”",
    "“You have the look of someone who has heard a story through. Tell me how it ends. I always left before the end.”"] },
  5: { age: "child", name: "A girl beside a lamp that needs no one", lines: [
    "In the Far Sleep a lamp burns in the meadow with no post beneath it. A small girl sits beside it with an unlit taper.",
    "“You held it,” she says. “I knew someone would. That’s how it ends.”",
    "She blows out her taper, and the lamp keeps burning."] },
};
// The meetings had, as a sorted string of digits ("" when none).
export function ilseMet(save) { const raw = String(save?.lore?.ilse || ""); return [...new Set(raw.split("").filter((d) => ILSE_MEETINGS[d]))].sort().join(""); }
// Which meeting this section offers, or 0: `far` says whether the section lies in the Far Sleep.
export function ilseMeetingAt(save, rx, ry, far = false) {
  const met = ilseMet(save);
  if (met.includes("5") || Math.abs(rx) + Math.abs(ry) < ILSE.minDepth) return 0;
  const h = hashSeed(`${save?.seed}:ilse:v1:${rx}:${ry}`);
  if ((h % 10000) / 10000 >= ILSE.chance) return 0;
  if (far) return met.length >= ILSE.finalAfter ? 5 : 0;
  const open = [1, 2, 3, 4].filter((n) => !met.includes(String(n)));
  return open.length ? open[(h >>> 8) % open.length] : 0;
}
// Places her on open ground in a wild section. Returns the object or null.
export function addIlse(map, save, rx, ry, far = false) {
  if (!map?.tiles?.length || map.settlement || map.skirmish || map.objects?.some((o) => o.kind === "ilse")) return null;
  const stage = ilseMeetingAt(save, rx, ry, far); if (!stage) return null;
  const w = map.width || 32, taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const open = map.tiles.filter((t) => !t.blocked && !t.structure && !t.environment && t.x > 6 && t.y > 6 && t.x < w - 7 && t.y < w - 7 && !taken.has(`${t.x},${t.y}`) && !/water|ocean|lava|chasm|canyon|pit/i.test(String(t.kind)));
  if (!open.length) return null;
  const at = open[hashSeed(`${save.seed}:ilse-at:${rx}:${ry}`) % open.length], m = ILSE_MEETINGS[stage];
  const o = { id: `ilse-${stage}-${rx}-${ry}`, kind: "ilse", stage, age: m.age, name: m.name, x: at.x, y: at.y, state: "waiting", actions: ["speak"] };
  map.objects.push(o); return o;
}
// Speaking with her: her lines, once; the meeting is remembered. Returns { ok, message, first }.
export function meetIlse(save, o) {
  const m = ILSE_MEETINGS[o?.stage]; if (!m) return { ok: false, message: "No one is there." };
  save.lore ||= {}; const met = ilseMet(save), first = !met.includes(String(o.stage));
  if (first) save.lore.ilse = ilseMet({ lore: { ilse: met + o.stage } });
  return { ok: true, first, message: m.lines.join(" ") };
}
