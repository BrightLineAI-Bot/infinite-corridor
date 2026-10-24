// Release 405 (Tim: "the pull move and the grab move should have a wave... where you're gonna get... in the grab range or
// in the push range"): the Crystal's push, pull and grab windups fill their reach in pink with waves moving the force's way.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the Crystal push, pull and grab draw their reach and waves in the warning colour', () => {
  const src = readFileSync(new URL('../src/monster-render.ts', import.meta.url), 'utf8');
  const at = src.indexOf('else if (crystal && (tele.type === "ring" || tele.type === "tether" && tele.reaching))'); assert.ok(at > 0);
  const block = src.slice(at, src.indexOf('else if (tele.type === "ring" && tele.inhale)', at));
  assert.match(block, /CRYSTAL\.grabRange/); assert.match(block, /DANGER\.fill/); assert.match(block, /inward = grab \|\| !!tele\.inhale/);
});
