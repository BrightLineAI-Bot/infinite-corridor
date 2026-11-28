// The now-playing title in the place box (Tim, 2026-11-28): a new song's "♪ Title" scrolls through the box under Map and Pack
// ("SECTION 0,0") in place of the place's name, then the box shows the place again; with no box on screen (Close View on a map
// with no name) it stays the pill under the HUD. The rules for when a title shows are unchanged (tests/ten-more-tracks.test.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { placeLabelDrawn, PLACE_LABEL_BOX } from '../src/close-view.ts';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('the renderers keep where the place box is, in one module object, never on the game', () => {
  const box = PLACE_LABEL_BOX;
  placeLabelDrawn(30, 600, 150);
  assert.deepEqual({ x: box.x, y: box.y, w: box.w, h: box.h }, { x: 30, y: 600, w: 150, h: 24 });
  assert.ok(box.at > 0);
  placeLabelDrawn(28, 420, 190);
  assert.equal(PLACE_LABEL_BOX, box, 'no new object a frame');
  assert.deepEqual([box.x, box.y, box.w], [28, 420, 190]);
  const renderer = read('src/renderer.ts');
  assert.match(renderer, /ctx\.fillText\(label, labelX \+ 8, labelY \+ 16, boxW - 16\);\n\s*if \(!closeViewCapturing\(\)\) placeLabelDrawn\(labelX, labelY, boxW\);/, 'the Standard View records the box it drew on screen (not a capture)');
  assert.match(read('src/close-view.ts'), /function drawPlaceLabel[\s\S]{0,600}placeLabelDrawn\(x, y, bw\);/, 'Close View records its own label');
  assert.doesNotMatch(renderer + read('src/close-view.ts'), /g\.placeLabelBox/, 'a render never writes to the game');
});

test('main.ts lays the title over the box when one is on screen, else the pill', () => {
  const main = read('src/main.ts');
  assert.match(main, /nowPlayingEl\.classList\.toggle\("in-box", !!box\);/);
  assert.match(main, /function placeBoxNow\(\) \{ const B = PLACE_LABEL_BOX; return B && B\.w > 0 && performance\.now\(\) - B\.at < NOW_PLAYING_BOX\.fresh \? B : null; \}/);
  assert.match(main, /followPlaceBox\(\); \/\/ the place box moved/, 'kept on the box on the music timer, not the game loop');
  assert.match(main, /--np-top/, 'the pill remains the fallback');
  assert.match(main, /onEvent: \(e\) => \{ if \(e\.type === "start" \|\| e\.type === "switch"\) nowPlaying\(e\); \}/, 'the same song events');
  assert.match(main, /settingRow\("Show track titles",toggleSetting\("trackTitles"\)/, 'the toggle stays');
});

test('the box style: the box\'s own size and 12 px type, opaque over the name, still under Reduce motion, never a touch', () => {
  const css = read('styles.css');
  const rule = css.match(/\.now-playing\.in-box \{([^}]*)\}/)?.[1] || '';
  assert.match(rule, /top: var\(--np-y/); assert.match(rule, /left: var\(--np-x/); assert.match(rule, /width: var\(--np-w/); assert.match(rule, /height: var\(--np-h, 24px\)/);
  assert.match(rule, /font: 12px\/24px monospace/, 'px, so neither text nor UI scale grows it past the box');
  assert.match(rule, /background: #151411;/, 'opaque: the place name is hidden under it');
  assert.match(rule, /overflow: hidden/);
  assert.match(css, /\.now-playing\.in-box\.visible \{ opacity: 1; \}/);
  assert.match(css, /\.now-playing \{[^}]*pointer-events: none/);
  assert.match(css, /body\.reduce-motion \.np-title \{[^}]*animation: none !important/);
  assert.match(css, /body\.reduce-motion \.np-window \{[^}]*text-overflow: ellipsis/);
  assert.match(css, /body\.proving-ground \.now-playing \{ display: none !important; \}/);
  assert.match(read('index.html'), /<aside id="nowPlaying" class="now-playing"[^>]*hidden>/);
});
