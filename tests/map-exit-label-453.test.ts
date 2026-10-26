// Release 453 (Tim, in a crossing whose way out showed only as a cyan block on the map: "there's no exit... now I'm kind
// of just trapped"): every way out, and every dais, carries a word on the dungeon map.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the dungeon map names exits, doors out, the annex way back and daises', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const fn = main.match(/function dungeonMapTag\(o\)\{[^\n]+/)?.[0]; assert.ok(fn);
  for (const word of ['"EXIT"', '"DOOR OUT"', '"WAY BACK"', '"DAIS"']) assert.ok(fn.includes(word), word);
  assert.match(main, /const tag=dungeonMapTag\(o\);if\(tag\)\{/);
});
