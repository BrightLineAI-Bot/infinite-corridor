// The Elder Wanderers (release 197). Rare creatures that walk the Corridor's roads and wander its crossings. They speak
// no language: each one speaks a single elementary cellular automaton rule (Stephen Wolfram's 256 rules, which fall
// into 88 essentially different ones under mirroring and colour inversion). Hearing an Elder records its rule; the
// Reciter's Tome counts the 88, and hearing all of them completes the recitation. Pure data and rules: no DOM.
import { hashSeed } from "./random.js?v=r393-1e203e556d15";
import { ensureLore, noteCompletionOf } from "./lore.js?v=r393-1e203e556d15";

// Balance: how often an Elder walks a section or a crossing level, and how strongly a new Elder leans toward a rule
// not yet heard (the rest are rules already known, so the last few are hard to find).
export const ELDERS = { version: 1, chance: { trail: .08, wild: .05, dungeon: .035 }, minDepth: 2, unheardShare: .6, speed: .45, rows: 46, width: 72 };
export const ELDER_NAME = "Elder Wanderer";

function mirror(rule) { let out = 0; for (let i = 0; i < 8; i++) if ((rule >> i) & 1) out |= 1 << (((i & 1) << 2) | (i & 2) | ((i >> 2) & 1)); return out; }
function invert(rule) { let out = 0; for (let i = 0; i < 8; i++) if (!((rule >> (7 - i)) & 1)) out |= 1 << i; return out; }
// The smallest rule number among a rule's mirror and inverse images names its class.
export function elderClass(rule) { const r = rule & 255; return Math.min(r, mirror(r), invert(r), mirror(invert(r))); }
export const ELDER_RULES = [...new Set(Array.from({ length: 256 }, (_, r) => elderClass(r)))].sort((a, b) => a - b);

// Saved as one 256-bit hex string in save.lore.elders: bit r set once rule class r has been heard.
function bit(hex, i) { return (parseInt(hex[i >> 2] || "0", 16) >> (i & 3)) & 1; }
function setBit(hex, i) { const at = i >> 2, s = hex.padEnd(at + 1, "0"); return s.slice(0, at) + (parseInt(s[at], 16) | (1 << (i & 3))).toString(16) + s.slice(at + 1); }
export function elderHeard(save, rule) { return !!bit(save.lore?.elders || "", elderClass(rule)); }
export function eldersHeard(save) { return ELDER_RULES.filter((r) => elderHeard(save, r)); }
export function elderProgress(save) { const found = eldersHeard(save).length; return { found, total: ELDER_RULES.length, mastered: found >= ELDER_RULES.length }; }

// Does an Elder walk here, and which rule does it speak? `key` names the place (section or dungeon level). The roll
// changes as more rules are heard, so the Corridor's Elders keep moving: a section without one may have one later.
export function elderPlan(save, key, chance) {
  const heard = eldersHeard(save).length, h = hashSeed(`${save?.seed}:elder:v${ELDERS.version}:${key}:${heard}`);
  if ((h % 10000) / 10000 >= chance) return null;
  const unheard = ELDER_RULES.filter((r) => !elderHeard(save, r)), pick = (list, salt) => list[hashSeed(`${h}:${salt}`) % list.length];
  const rule = unheard.length && (hashSeed(`${h}:lean`) % 1000) / 1000 < ELDERS.unheardShare ? pick(unheard, "new") : pick(ELDER_RULES, "any");
  return { rule, seed: h };
}
// An Elder speaks: its rule is recorded. Returns { rule, first, completed }.
export function hearElder(save, rule) {
  ensureLore(save);
  const r = elderClass(rule), first = !elderHeard(save, r);
  if (first) save.lore.elders = setBit(save.lore.elders || "", r);
  const completed = first && elderProgress(save).mastered;
  if (completed) noteCompletionOf("elders");
  return { rule: r, first, completed };
}
// Rows of a rule from a starting row (wrapping at the edges). `start` is "single" (one live cell) or a seed number for
// a random row. Returns an array of Uint8Array rows.
export function ruleRows(rule, width, rows, start = "single") {
  let row = new Uint8Array(width);
  if (start === "single") row[width >> 1] = 1;
  else { let s = (Number(start) >>> 0) || 1; for (let i = 0; i < width; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; row[i] = s >>> 31; } }
  const out = [row];
  for (let k = 1; k < rows; k++) {
    const next = new Uint8Array(width);
    for (let i = 0; i < width; i++) next[i] = (rule >> ((row[(i + width - 1) % width] << 2) | (row[i] << 1) | row[(i + 1) % width])) & 1;
    out.push(next); row = next;
  }
  return out;
}
