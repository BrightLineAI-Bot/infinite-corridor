// Pentagon finding is hands-off (Tim, 2026-11-05): "No, it shouldn't set your compass to it. When a pentagon hunt opens, it's
// gonna be on you to find them. Sure, you can see the sigils, but it's gonna be on you to find them. I don't want to interrupt the
// game... It's just a portion of the world that exists... it's completely on you to find it." A sigil read and a hunt laid out
// touch neither the compass nor the Atlas; a hunt opens with no banner, only a Journal line in words; the found and complete
// notices stay. game.ts readPentagonSigil / offerPentagonHunt, pentagon.ts PENTAGON_FINDING.messages, main.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { PENTAGON_FINDING, pentagonSigilRoll, pentagonHuntsOpen, pentagonHeading, pentagonFarWords } from '../src/pentagon.ts';

const F = PENTAGON_FINDING;
const visit = (g, rx, ry) => { g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
const fresh = (seed) => { const s = freshSave(); s.seed = seed; return s; };
const COORDS = /-?\d+\s*,\s*-?\d+/; // "cx, cy" anywhere in a line
const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
function firstSigil(g, rx, ry, span = 40) {
  for (let k = 0; k < span * span; k++) { const x = rx + (k % span), y = ry + Math.floor(k / span); if (!pentagonSigilRoll(g.save.seed, x, y)) continue;
    visit(g, x, y); const o = g.map.objects.find((q) => q.kind === 'pentWaysign'); if (o) return { x, y, o }; }
  return null;
}

test('reading a sigil leaves the compass, compassRequest and the guidance alone; it still says which way and how far, in words', () => {
  for (const [seed, rx, ry] of [['TIM1', 10, -30], ['PF2', -40, 20]]) {
    const s = fresh(seed); s.guidance = { pick: '3,4', pin: { rx: 7, ry: 8, name: 'My own pin' } }; s.manualWaypoint = { kind: 'section', area: 'overworld', rx: 1, ry: 2, label: 'Mine' };
    const g = new Game(s, 0), found = firstSigil(g, rx, ry); assert.ok(found, `${seed}: a sigil`); const { x, y, o } = found;
    g.player.x = o.x; g.player.y = o.y; const guidance = structuredClone(s.guidance), manual = structuredClone(s.manualWaypoint), notices = (g.questNotices || []).length;
    const r = g.interact('read', o.id); assert.ok(r.ok);
    assert.equal(g.compassRequest, undefined, 'no compass request');
    assert.deepEqual(s.guidance, guidance, 'the compass pin and pick unchanged'); assert.deepEqual(s.manualWaypoint, manual, 'the waypoint unchanged');
    assert.equal((g.questNotices || []).length, notices, 'no notice');
    assert.doesNotMatch(r.message, /compass/i); assert.doesNotMatch(r.message, COORDS, 'no coordinates in the message');
    const heading = pentagonHeading(o.targetRx - x, o.targetRy - y), far = pentagonFarWords(Math.round(Math.hypot(o.targetRx - x, o.targetRy - y)));
    assert.ok(r.message.includes(`points ${heading}`) && r.message.includes(far), r.message);
    const line = s.narrative.journal.find((j) => j.recordId === `pentagon-sigil:${o.targetRx}:${o.targetRy}`); assert.ok(line, 'a Journal line');
    assert.equal(line.text, F.messages.sigilJournal(heading, far)); assert.doesNotMatch(line.text, COORDS, `words only: ${line.text}`);
    assert.deepEqual([s.pentagonFinding.follow.cx, s.pentagonFinding.follow.cy], [o.targetRx, o.targetRy], 'the line is still remembered (for the arrival notice)');
  }
});

test('a hunt opens quietly: no questNotices, no banner; a Journal line with the heading and distance in words, never the section', () => {
  const s = fresh('TIM1'), g = new Game(s, 0); g.rx = 20; g.ry = 20; g.questNotices = []; g.defeatNotice = null;
  for (let i = 0; i < 8 && pentagonHuntsOpen(s).length < 2; i++) g.offerPentagonHunt();
  const open = pentagonHuntsOpen(s); assert.equal(open.length, 2);
  assert.deepEqual(g.questNotices, [], 'nothing pushed into questNotices'); assert.equal(g.defeatNotice, null, 'no banner of any kind');
  for (const h of open) { const line = s.narrative.journal.find((j) => j.recordId === `pentagon-hunt:${h.id}`); assert.ok(line, 'a Journal line');
    assert.equal(line.text, F.messages.huntJournal(pentagonHeading(h.cx - 20, h.cy - 20), pentagonFarWords(Math.round(Math.hypot(h.cx - 20, h.cy - 20)))));
    assert.doesNotMatch(line.text, COORDS, `words only: ${line.text}`); assert.ok(!line.text.includes(String(h.cx)) || !line.text.includes(String(h.cy))); }
  // the rewards for arriving stay: found, then complete
  const [a] = open; visit(g, a.cx + 1, a.cy); assert.equal(a.status, 'found'); assert.ok(g.questNotices.some((q) => q.title === F.messages.huntFound));
  s.consequences.dungeons[`${g.pentagonBase(a.cx, a.cy)}:f1`] = { pentArenaWon: true }; visit(g, a.cx + 3, a.cy + 3); assert.ok(g.questNotices.some((q) => q.title === F.messages.huntDone));
  assert.equal(F.messages.huntOffer, undefined, 'the opening banner text is gone'); assert.equal(F.messages.follow, undefined, 'and the compass line');
});

test('main.ts: no hunt pins on the Atlas, no hunt or sigil guidance entries, no compass request; an old sigil pin is let go', () => {
  assert.doesNotMatch(main, /label:\s*"Pentagon hunt"/, 'no Atlas pin'); assert.doesNotMatch(main, /#ffd36a/i, 'no gold hunt pin colour');
  assert.doesNotMatch(main, /pentagonHuntsOpen/, 'hunts are not read for the map, the compass or the quest list');
  assert.doesNotMatch(main, /add\("Pentagon hunt"/); assert.doesNotMatch(main, /A Pentagon sigil's line/);
  assert.doesNotMatch(main, /compassRequest/, 'nothing turns a sigil into compassPin');
  assert.match(main, /compassPin=\(q=>q\?\.name===PENTAGON_FINDING\.retiredPin\?null:q\)\(save\.guidance\?\.pin\?\?null\)/);
  assert.equal(F.retiredPin, "The Pentagon (the sigil's)");
  const game = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'); assert.doesNotMatch(game, /compassRequest\s*=/, 'game.ts never asks the compass');
});

test('the save: existing follow and hunts data is kept as it was (only no longer shown), and migrates unchanged', () => {
  const f = freshSave(), pf = { version: 1, follow: { cx: 16, cy: -24, rx: 3, ry: 4 }, hunts: [{ id: 'pentagon-hunt-1', n: 1, cx: 40, cy: 8, status: 'open', from: { rx: 0, ry: 0 } }], n: 1, read: 2, later: { kept: true } };
  const m = migrateSave(JSON.parse(JSON.stringify({ ...f, pentagonFinding: pf }))); assert.deepEqual(m.pentagonFinding, pf); assert.equal(m.version, 14);
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(m))).pentagonFinding, pf);
});
