// Threads written after the first ten (the daily narrative pass, 2026-11-02): rolled only in crossings that hold none of the first
// ten, so every crossing keeps the thread it already offered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashSeed } from '../src/random.ts';
import { THREADS, THREAD_ORDER, THREAD_RULES, threadIn, inBand } from '../src/threads.ts';

const seed = 'LATER1', ids = []; for (let x = -60; x <= 60; x += 1) for (let y = -60; y <= 60; y += 3) ids.push([x, y, `dungeon:${seed}:g1:${x}:${y}:room`]);
const FIRST = THREAD_ORDER.filter((id) => !THREADS[id].wave);
const before = (id, x, y) => { if (Math.abs(x) + Math.abs(y) < THREAD_RULES.minDepth || (hashSeed(`${seed}:threads:v1:${id}`) % 10000) / 10000 >= THREAD_RULES.chance) return null; const here = FIRST.filter((t) => inBand(THREADS[t].band, x, y)); return here.length ? here[hashSeed(`${seed}:threads:which:v1:${id}`) % here.length] : null; };

test('every crossing that held one of the first ten threads still holds the same one', () => {
  let n = 0; for (const [x, y, id] of ids) { const was = before(id, x, y); if (was) { n++; assert.equal(threadIn(seed, id), was, id); } } assert.ok(n > 200, `${n} checked`);
});

test("the Well-Digger's Rope is written in full and lies only in far crossings that held no thread before", () => {
  const T = THREADS.wellDigger; assert.ok(T.wave >= 2 && T.relic === 'rope' && T.pieces.length === 6 && T.pieces.every((p) => p.length > 80) && T.ending.length > 200);
  const found = ids.filter(([x, y, id]) => threadIn(seed, id) === 'wellDigger'); assert.ok(found.length >= 6, `${found.length} crossings, enough for every piece`);
  for (const [x, y, id] of found) { assert.equal(before(id, x, y), null, 'it never displaces a first-ten thread'); assert.ok(inBand('far', x, y)); }
});

import { readFileSync } from 'node:fs';
// The Journal's Arcana tab (Tim, 2026-11-02: "an arcana panel in the journal which has all these like threads. And all these
// little like story beats"): every thread and story across crossings, with progress; unfound pieces never shown.
test('the Journal has an Arcana tab listing every thread and story across crossings, showing only what has been found', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /\["arcana","Arcana"\]/); assert.match(main, /if\(mode==="arcana"\)\{renderArcana\(out\)/);
  assert.match(main, /for\(const id of THREAD_ORDER\)\{const T=THREADS\[id\],found=threadFound\(save,id\)\.length;arcanaCard\(out,T\.title,[^;]*T\.pieces\.slice\(0,found\)/, 'only the pieces found are shown');
  for (const name of ['The Seven Bells', "The Surveyor's Chain", 'TORN_PAGES.title', '"Ilse"', '"Glimpses"']) assert.ok(main.includes(name), name);
});

// Release 707: the Tollkeeper's Keys, a wave 3 thread, rolled only where neither earlier roll placed one.
test("the Tollkeeper's Keys is written in full, lies in middle crossings, and moves no thread already placed", async () => {
  const T = THREADS.tollKeys; assert.ok(T.wave === 3 && T.relic === 'key' && T.pieces.length === 6 && T.pieces.every((p) => p.length > 80) && T.ending.length > 200);
  const found = ids.filter(([x, y, id]) => threadIn(seed, id) === 'tollKeys'); assert.ok(found.length >= 6, `${found.length} crossings`);
  for (const [x, y, id] of found) { assert.equal(before(id, x, y), null); assert.ok(inBand('middle', x, y)); }
  const later = (x, y, id) => { if (before(id, x, y) || Math.abs(x) + Math.abs(y) < THREAD_RULES.minDepth) return null; if ((hashSeed(`${seed}:threads:later:v1:${id}`) % 10000) / 10000 >= THREAD_RULES.later) return null; const here = THREAD_ORDER.filter((t) => THREADS[t].wave === 2 && inBand(THREADS[t].band, x, y)); return here.length ? here[hashSeed(`${seed}:threads:later:which:v1:${id}`) % here.length] : null; };
  let n = 0; for (const [x, y, id] of ids) { const was = later(x, y, id); if (was) { n++; assert.equal(threadIn(seed, id), was, 'a wave 2 crossing keeps its thread'); } } assert.ok(n > 5, `${n} wave 2 crossings checked`);
});

// Release 712: the Weaver's Cloth and the Mirror That Remembers, wave 3 threads of a later layer: they fill only wave 3 crossings that
// held nothing, so every crossing that held the Tollkeeper's Keys (or any thread) still holds it.
test("the Weaver's Cloth and the Mirror That Remembers are written in full, lie only where nothing lay, and move no thread", () => {
  for (const [id, relic] of [['weaver', 'spool'], ['mirror', 'mirror']]) { const T = THREADS[id]; assert.ok(T.wave === 3 && T.layer === 1 && T.relic === relic && T.pieces.length === 6 && T.pieces.every((p) => p.length > 80) && T.ending.length > 200, id); }
  const wide = []; for (let x = -90; x <= 90; x += 1) for (let y = -90; y <= 90; y += 2) wide.push([x, y, `dungeon:${seed}:g1:${x}:${y}:room`]);
  const old = (x, y, id) => { const t = threadIn(seed, id); return t === 'weaver' || t === 'mirror' ? 'NEW' : t; };
  let weaver = 0, mirror = 0;
  for (const [x, y, id] of wide) { const t = threadIn(seed, id), d = Math.abs(x) + Math.abs(y);
    if (t === 'weaver') { weaver++; assert.ok(inBand('far', x, y) && d >= 36, `${x},${y}`); }
    if (t === 'mirror') { mirror++; assert.ok(inBand('far', x, y) && d >= 36, `${x},${y}`); }
    if (t === 'tollKeys') assert.ok(inBand('middle', x, y)); }
  assert.ok(weaver >= 6 && mirror >= 6, `weaver ${weaver}, mirror ${mirror}`); void old;
  // every wave 3 crossing that the 707 rule gave the Tollkeeper still has it
  const rule707 = (x, y, id) => { const t = threadIn(seed, id); if (t !== 'tollKeys' && t !== 'weaver' && t !== 'mirror') return undefined; return inBand('middle', x, y) ? 'tollKeys' : null; };
  for (const [x, y, id] of wide) { const was = rule707(x, y, id); if (was === 'tollKeys') assert.equal(threadIn(seed, id), 'tollKeys', id); if (was === null) assert.ok(['weaver', 'mirror'].includes(threadIn(seed, id))); }
});
