// The Triceratops hatchling's pure rules (hatchling.ts): growth from a share of fight experience, forms that stay unlocked, the
// baby's buffs (stacked by kind, refreshed never doubled), the version-pinned rescue site and the save normalisation.
import test from "node:test";
import assert from "node:assert/strict";
import { freshSave, migrateSave } from "../src/types.ts";
import { serializeSave, deserializeSave } from "../src/save-codec.ts";
import { ensureMounts } from "../src/beast-mounts.ts";
import {
  HATCHLING, HATCH_BUFF_IDS, HATCH_MOVE_IDS, ensureHatchling, feedHatchling, formUnlocked, unlockedForms, chooseForm, growthProgress,
  grantBuff, tickBuffs, clearBuffs, hatchlingBonus, nextBuffKind, rescueCandidates, chooseRescueSite, guardKind, pickMove, moveTime, rescueGuidance,
} from "../src/hatchling.ts";

const owned = () => { const s = freshSave(); s.seed = "HATCH-RULES"; const h = s.mounts.hatchling; h.owned = true; h.quest.state = "rescued"; h.quest.rx = 3; h.quest.ry = 0; return { s, h }; };

test("every save carries a normalised hatchling record: not owned, quest not started, baby chosen", () => {
  for (const s of [freshSave(), migrateSave({ ...freshSave(), mounts: undefined }), deserializeSave(serializeSave(freshSave()))]) {
    const h = s.mounts.hatchling;
    assert.equal(h.owned, false); assert.equal(h.quest.state, "none"); assert.equal(h.xp, 0); assert.equal(h.form, "baby"); assert.equal(h.out, null); assert.deepEqual(h.buffs, {});
  }
});

test("growth is a data-table share of fight experience; forms unlock at the table's thresholds and stay unlocked", () => {
  const { h } = owned(), G = HATCHLING.growth;
  assert.ok(G.share > 0 && G.share < 1 && G.young > 0 && G.big > G.young, "balance lives in the table");
  assert.deepEqual(unlockedForms(h), ["baby"]);
  assert.deepEqual(feedHatchling(h, 100), []); assert.equal(h.xp, Math.floor(100 * G.share));
  const need = Math.ceil((G.young - h.xp) / G.share);
  assert.deepEqual(feedHatchling(h, need), ["young"]); assert.ok(formUnlocked(h, "young")); assert.ok(!formUnlocked(h, "big"));
  assert.deepEqual(growthProgress(h).next, "big");
  assert.deepEqual(feedHatchling(h, Math.ceil((G.big - h.xp) / G.share)), ["big"]); assert.deepEqual(unlockedForms(h), ["baby", "young", "big"]);
  assert.equal(growthProgress(h).next, null);
  // a bigger fight (an elite or a world beast already gives more experience) grows him faster with no separate bonus
  const a = owned().h, b = owned().h; feedHatchling(a, 10); feedHatchling(b, 35); assert.ok(b.xp > a.xp);
  // not owned, no growth
  const s2 = freshSave(); assert.deepEqual(feedHatchling(s2.mounts.hatchling, 1000), []); assert.equal(s2.mounts.hatchling.xp, 0);
});

test("form selection accepts only unlocked forms; the big form never has a companion out", () => {
  const { h } = owned();
  assert.equal(chooseForm(h, "young"), false); assert.equal(h.form, "baby");
  h.xp = HATCHLING.growth.young; assert.equal(chooseForm(h, "young"), true); assert.equal(h.form, "young");
  h.out = { area: "a", x: 1, y: 1 }; assert.equal(chooseForm(h, "big"), false);
  h.xp = HATCHLING.growth.big; assert.equal(chooseForm(h, "big"), true); assert.equal(h.out, null);
  // a stored form that is not unlocked falls back to the baby on load
  const { s } = owned(); s.mounts.hatchling.form = "big"; ensureHatchling(s.mounts); assert.equal(s.mounts.hatchling.form, "baby");
});

test("buffs stack across kinds, never two of a kind: a repeat refreshes its time", () => {
  const { s, h } = owned(), T = HATCHLING.buffs.seconds;
  assert.equal(hatchlingBonus(s), null);
  assert.equal(grantBuff(h, "damage"), true); tickBuffs(h, 10); assert.equal(h.buffs.damage, T - 10);
  assert.equal(grantBuff(h, "damage"), false, "a second damage buff is a refresh"); assert.equal(h.buffs.damage, T);
  assert.equal(Object.keys(h.buffs).filter((k) => k === "damage").length, 1);
  grantBuff(h, "defence"); grantBuff(h, "stamina");
  const B = hatchlingBonus(s), K = HATCHLING.buffs.kinds;
  assert.equal(B.attackDamage, K.damage.bonus.attackDamage); assert.equal(B.defense, K.defence.bonus.defense); assert.equal(B.staminaRegen, K.stamina.bonus.staminaRegen);
  assert.equal(grantBuff(h, "nonsense"), false);
  tickBuffs(h, T + 1); assert.deepEqual(h.buffs, {}); assert.equal(hatchlingBonus(s), null);
  grantBuff(h, "damage"); clearBuffs(h); assert.deepEqual(h.buffs, {});
});

test("the buff order is random-ish but never gives the kind just given", () => {
  let last = null; const seen = new Set();
  for (let i = 0; i < 60; i++) { const k = nextBuffKind("SEED", i, last); assert.ok(HATCH_BUFF_IDS.includes(k)); assert.notEqual(k, last); seen.add(k); last = k; }
  assert.equal(seen.size, HATCH_BUFF_IDS.length);
  assert.equal(nextBuffKind("SEED", 7, "damage"), nextBuffKind("SEED", 7, "damage"), "deterministic");
});

test("the rescue site is version-pinned: the same seed, hometown and version give the same place; a new version may differ", () => {
  const a = rescueCandidates("PIN", "2,3"), b = rescueCandidates("PIN", "2,3");
  assert.deepEqual(a, b);
  const [lo, hi] = HATCHLING.quest.band;
  for (const c of a) { const d = Math.max(Math.abs(c.rx - 2), Math.abs(c.ry - 3)); assert.ok(d >= lo && d <= hi); }
  assert.notDeepEqual(rescueCandidates("PIN", "2,3", 2), a, "version 2 would be its own order");
  // the first candidate whose ground holds is chosen; at most `loads` are looked at
  let looked = 0; const site = chooseRescueSite("PIN", "2,3", (rx, ry) => { looked++; return looked === 3; });
  assert.deepEqual(site, a[2]); assert.ok(looked <= HATCHLING.quest.loads);
  looked = 0; assert.deepEqual(chooseRescueSite("PIN", "2,3", () => { looked++; return false; }), a[0]); assert.equal(looked, HATCHLING.quest.loads);
  assert.ok(HATCHLING.quest.guardKinds.includes(guardKind("PIN", 0))); assert.equal(guardKind("PIN", 1), guardKind("PIN", 1));
});

test("the young form's move choice follows the table's ranges and cooldowns", () => {
  const out = { cd: {}, seq: 0 };
  assert.equal(pickMove(out, 6), "beam"); out.cd.beam = 3; assert.equal(pickMove(out, 6), "gatling"); out.cd.gatling = 1; assert.equal(pickMove(out, 6), null);
  for (const k of HATCH_MOVE_IDS) assert.ok(moveTime(k) > 0 && moveTime(k) < 3);
  const near = pickMove({ cd: {}, seq: 3 }, 1); assert.ok(["whirl", "stomp", "bite"].includes(near));
  assert.equal(pickMove({ cd: { whirl: 1, stomp: 1, bite: 1 }, seq: 0 }, 1), null);
});

test("normalisation keeps unknown fields, clamps timers and drops a malformed companion", () => {
  const { s, h } = owned();
  h.extra = { keep: 1 }; h.quest.note = "kept"; h.buffs = { damage: 999, future: 5 }; h.xp = -4.5;
  h.out = { area: "overworld:0:0:g1", x: 3, y: 4, face: -7, timers: { buff: 99, heal: -1 }, cd: { beam: 999, junk: 1 }, act: { kind: "beam", left: 2, n: 0, x: 1, y: 0 }, mine: "kept" };
  ensureMounts(s);
  assert.deepEqual(h.extra, { keep: 1 }); assert.equal(h.quest.note, "kept"); assert.equal(h.buffs.damage, HATCHLING.buffs.seconds); assert.equal(h.buffs.future, 5);
  assert.equal(h.xp, 0); assert.equal(h.out.face, -1); assert.equal(h.out.timers.buff, HATCHLING.buffs.every); assert.equal(h.out.timers.heal, 0); assert.equal(h.out.cd.beam, HATCHLING.young.moves.beam.cd); assert.equal(h.out.cd.junk, undefined); assert.equal(h.out.mine, "kept"); assert.equal(h.out.act.kind, "beam");
  h.out = { x: "no" }; ensureMounts(s); assert.equal(h.out, null);
  // a quest whose site was lost cannot be followed: back to "none" until the mother is spoken to again
  const t = freshSave(); t.mounts.hatchling.quest = { state: "active" }; ensureMounts(t); assert.equal(t.mounts.hatchling.quest.state, "none");
  assert.equal(rescueGuidance(t.mounts.hatchling), null);
  const u = freshSave(); Object.assign(u.mounts.hatchling.quest, { state: "active", rx: 4, ry: -2 }); assert.deepEqual(rescueGuidance(u.mounts.hatchling), { area: "overworld", rx: 4, ry: -2, kind: "guidance", name: HATCHLING.quest.names.quest });
});
