// Release 409 (Tim: the white Supernova scar hid enemies and the Void Walker in dungeons): creatures on scarred ground and
// world beasts are always drawn.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('scarred ground counts as seen for creatures, and world beasts are always drawn', () => {
  const src = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(src, /const discoveredInDungeon=\(g,point\)=>g\.area!=="dungeon"\|\|!!point\?\.worldBeast\|\|scarredAt\(g,point\)\|\|dungeonPointDiscovered\(g\.map,point\);/);
  assert.match(src, /return !!t\?\.voidScar/);
});
