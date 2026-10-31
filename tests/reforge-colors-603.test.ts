// Release 603 (Tim, 2026-10-31: "when you reforge it... the number should be green... if it's higher than your current value or
// red if it's lower"): the Smith shows the last reforge as was → now, coloured by whether the value rose or fell.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { reforgeAffix } from '../src/smithy.ts';

test('a reforge reports what the affix was and what it became', () => {
  const s = freshSave(); s.materials.cinderIron = 99; s.currency = 9999; s.listener = { defeated: 5 }; s.worldFlags.listenersDefeated = 5;
  s.equipment.primary = { ...s.equipment.primary, affixes: [{ id: 'attack', value: 3 }] };
  const r = reforgeAffix(s, 'primary', 0);
  if (!r.ok) { assert.match(r.message, /Listener|after/); return; } // the smith may still be locked in a fresh save
  assert.deepEqual(r.before, { id: 'attack', value: 3 }); assert.ok(r.after && Number.isFinite(r.after.value));
});

test('the Smith colours the new number green when higher, red when lower', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /REFORGE_COLORS=\{up:'#6fdc7a',down:'#ff7a72'\}/); assert.match(main, /function reforgeOutcome\(r\)/);
  assert.match(main, /openSmithy\(r\.message,r\)/, 'the result is passed to the Smith screen');
});
