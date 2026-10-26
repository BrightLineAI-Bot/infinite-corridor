// Release 443 (Tim: the Wayglass list "should just be arranged numerically, so I can just scroll down"; selecting a section
// with a Wayglass in the Atlas "should just automatically populate the... travel to Wayglass"; the Far Gate journal should
// have a button that makes the new Gate "your active compass... so I can just start navigating to it").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');

test('Wayglass destinations are listed by section, numerically', () => {
  assert.match(main, /sort\(\(a,b\)=>\(a\[1\]\.rx-b\[1\]\.rx\)\|\|\(a\[1\]\.ry-b\[1\]\.ry\)/);
  assert.match(main, /option\.textContent=`\$\{c\.rx\}, \$\{c\.ry\} · \$\{c\.name\|\|"Wayglass"\}`/);
});

test('tapping a section with (or right beside) a Wayglass chooses it for travel', () => {
  assert.match(main, /const ATLAS_WAYGLASS_REACH = 1;/);
  assert.match(main, /const k = atlasWayglassNear\(rx, ry\); if \(k\) \{ const sel = \$\("#mapWayglassSelect"\);[^\n]*sel\.value = k; updateMapTravelButton\(\);/);
  // The helper's rule, checked in isolation: exact section first, else the nearest within reach.
  const src = main.match(/function atlasWayglassNear\(rx, ry\)\{[^\n]*\}/)[0];
  const near = new Function('save', 'ATLAS_WAYGLASS_REACH', `${src}; return atlasWayglassNear;`);
  const f = near({ checkpoints: { '3,4': { rx: 3, ry: 4 }, '9,9': { rx: 9, ry: 9 } } }, 1);
  assert.equal(f(3, 4), '3,4'); assert.equal(f(4, 5), '3,4'); assert.equal(f(6, 6), null);
});

test('the Far Gate journal can point the compass at the Array Mouth', () => {
  assert.match(main, /uiButton\(pinned\?"The compass points to the Mouth":"Point compass to the Array Mouth",\(\)=>\{compassPin=\{rx:c\.rx,ry:c\.ry,name:"The Array Mouth"\};rememberGuidance\(\)/);
});
