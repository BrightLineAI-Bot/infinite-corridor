// Tim, 2026-11-13: on a phone, holding a button with words on it selected the text in Chrome. The game's UI is never
// selectable and never opens the long-press callout; text inputs still are.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('buttons and the HUD are not text-selectable; inputs are', () => {
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const rule = css.match(/html, body, button[^{]*\{([^}]*)\}/);
  assert.ok(rule, 'a page-wide no-select rule'); assert.match(rule[1], /user-select: none/); assert.match(rule[1], /-webkit-user-select: none/); assert.match(rule[1], /-webkit-touch-callout: none/);
  const inputs = css.match(/input, textarea[^{]*\{([^}]*)\}/); assert.ok(inputs, 'inputs stay selectable'); assert.match(inputs[1], /user-select: text/);
  assert.ok(css.lastIndexOf('input, textarea') > css.lastIndexOf('html, body, button'), 'the input rule comes after, so it wins');
});
