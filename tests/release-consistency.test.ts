import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Every release reference must name the same release (Tim, 2026-10-16). Release 156 left Copy diagnostics'
// `release:155` in src/main.ts while every other file said 156; the publisher refused with "index.html does not
// reference release 155". This test catches such a partial bump before it is merged.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const release = /const release = "(\d+)"/.exec(read('index.html'))?.[1];

// [file, pattern with one capture group for the release number]. Each pattern must match at least once.
const REFERENCES: [string, RegExp][] = [
  ['index.html', /const release = "(\d+)"/g],
  ['index.html', /\?v=(\d+)/g],
  ['sw.js', /\?v=(\d+)/g],
  ['sw.js', /\$\{CACHE_PREFIX\}v(\d+)/g],
  ['proving-ground/index.html', /const release = "(\d+)"/g],
  ['proving-ground/index.html', /\?v=(\d+)/g],
  ['proving-ground/index.html', /Release (\d+)/g],
  ['proving-ground/sw.js', /\?v=(\d+)/g],
  ['proving-ground/sw.js', /pg1-r(\d+)/g],
  ['scripts/build.mjs', /release='(\d+)'/g],
  ['src/main.ts', /\brelease\s*:\s*(\d+)/g], // Copy diagnostics data
  ['src/main.ts', /`Release (\d+)\\n/g], // Options → System text
  ['src/proving-ground-mobile.ts', /"Game release":"(\d+)"/g],
  ['src/release-artifact.mjs', /\?v=(\d+)/g],
  ['src/release-artifact.mjs', /const release = "(\d+)"/g],
  ['src/release-artifact.mjs', /"Game release":"(\d+)"/g],
  ['src/release-artifact.mjs', /\{CACHE_PREFIX\}v(\d+)/g],
  ['src/release-artifact.mjs', /pg1-r(\d+)/g],
  ['src/release-artifact.mjs', /\\s\*(\d+)\\b/g], // the regex literal /\brelease\s*:\s*N\b/g
  ['src/release-artifact.mjs', /Release (\d+)/g],
];

test('every release reference names the same release as index.html', () => {
  assert.match(release ?? '', /^\d+$/, 'index.html declares const release = "N"');
  const mismatches: string[] = [];
  for (const [file, pattern] of REFERENCES) {
    const found = [...read(file).matchAll(pattern)].map((m) => m[1]);
    if (!found.length) mismatches.push(`${file}: no match for ${pattern}`);
    for (const n of new Set(found)) if (n !== release) mismatches.push(`${file}: ${pattern} says ${n}`);
  }
  assert.deepEqual(mismatches, [], `release ${release} expected everywhere`);
});
