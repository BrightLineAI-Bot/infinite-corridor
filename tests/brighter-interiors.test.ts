// Brighter interiors (Tim, 2026-11-15: "Every room as soon as you go inside is really dark, maybe a little too dark... we can't
// really see the world around us or interact with it. We have a Lantern, so that's fine"). Close View lifts an interior's
// ambient so that INTERIOR_LIGHT.keep of its darkness is left (40% less; the Deep 15% less), and moves the fog's near edge
// out; the theme tables, the torch and the fog's far edge are unchanged. The Lantern still lengthens the torch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLOSE_VIEW, CLOSE_VIEW_DEEP, INTERIOR_LIGHT, interiorAmbient, interiorDarkness, interiorLightKind } from '../src/close-view.ts';
import { LANTERN, lanternLift, lanternReach, litDarkness } from '../src/spell-slots.ts';

const mean = (a: number[]) => (a[0] + a[1] + a[2]) / 3;
const deep = new Set(Object.values(CLOSE_VIEW_DEEP.themes));
const themes = Object.entries(CLOSE_VIEW.themes).filter(([, t]: any) => t?.light?.ambient) as [string, any][];
// the shader's falloff (close-view-gl.ts falloff), to weigh the carried light against the ambient
const falloff = (d: number, R: number) => { const x = d / R, k = Math.max(0, 1 - x * x); return k * k / (1 + 2.5 * x * x); };

test('INTERIOR_LIGHT: one frozen table with the chosen numbers', () => {
  assert.ok(Object.isFrozen(INTERIOR_LIGHT) && Object.isFrozen(INTERIOR_LIGHT.keep) && Object.isFrozen(INTERIOR_LIGHT.fogNear));
  assert.equal(INTERIOR_LIGHT.version, 2); // version 2 (room-light-mix.test.ts): by tier, lit / gloomy / dark; gloomy is version 1's
  assert.deepEqual(JSON.parse(JSON.stringify(INTERIOR_LIGHT.keep)), { interior: [.4, .6, .92], deep: [.7, .85, .95] });
  assert.deepEqual(JSON.parse(JSON.stringify(INTERIOR_LIGHT.fogNear)), { interior: [2, 1.2, .3], deep: [1, .5, .15] });
  assert.equal(INTERIOR_LIGHT.dread, .85);
  assert.ok(INTERIOR_LIGHT.keep.interior[1] >= 1 / 2 && INTERIOR_LIGHT.keep.interior[1] <= 2 / 3, 'gloomy interiors: a third to a half less darkness');
  assert.ok(INTERIOR_LIGHT.keep.deep[1] > INTERIOR_LIGHT.keep.interior[1] && INTERIOR_LIGHT.keep.deep[1] >= .8, 'the Deep: only a little lighter');
});

test('every interior theme keeps 60% of its darkness, its tint kept, brighter than before', () => {
  let n = 0;
  for (const [id, t] of themes) {
    if (deep.has(t)) continue; n++;
    assert.equal(interiorLightKind(t), 'interior', id);
    const before = mean(t.light.ambient) / 255, lifted = interiorAmbient(t.light.ambient, 'interior', 255), after = mean(lifted) / 255;
    assert.ok(Math.abs((1 - after) / (1 - before) - INTERIOR_LIGHT.keep.interior[1]) < 1e-9, `${id}: darkness x ${INTERIOR_LIGHT.keep.interior[1]} (gloomy)`);
    assert.ok(after > before * 5 && after < .5, `${id}: brighter (${before.toFixed(3)} -> ${after.toFixed(3)}), never washed out`);
    for (let c = 0; c < 3; c++) assert.ok(Math.abs(lifted[c] / lifted[0] - t.light.ambient[c] / t.light.ambient[0]) < 1e-9, `${id}: tint kept`);
    assert.ok(lifted.every((v: number) => v <= 255), id);
    assert.ok(mean(t.light.ambient) <= 16, `${id}: the theme table itself is unchanged (still dark)`);
  }
  assert.ok(n >= 8, 'keeps, lived-in keeps, the Pentagon, root cellars, hives, Old Keeps, arcologies, the starship');
  // the 2D fallback (CLOSE_VIEW.light.ambient .2): .52 indoors
  assert.equal(CLOSE_VIEW.light.ambient, .2);
  assert.ok(Math.abs(interiorAmbient(CLOSE_VIEW.light.ambient, 'interior') - .52) < 1e-9);
  assert.ok(Math.abs(interiorDarkness(.2, 'interior') - .48) < 1e-9);
  // outside an interior nothing changes
  assert.equal(interiorAmbient(.2, null), .2); assert.deepEqual(interiorAmbient([10, 10, 12], undefined, 255), [10, 10, 12]);
});

test('the deliberately dark places stay dark: the Deep only 15% lighter, darker than any interior', () => {
  let n = 0, deepMax = 0, interiorMin = Infinity;
  for (const [id, t] of themes) {
    const k = interiorLightKind(t), after = mean(interiorAmbient(t.light.ambient, k, 255)) / 255, before = mean(t.light.ambient) / 255;
    if (k === 'deep') { n++; deepMax = Math.max(deepMax, after);
      assert.ok((1 - after) / (1 - before) >= .8 && (1 - after) / (1 - before) < 1, `${id}: lightened only slightly`);
      assert.ok(after <= .2, `${id}: still dark (${after.toFixed(3)})`); }
    else interiorMin = Math.min(interiorMin, after);
  }
  assert.equal(n, Object.keys(CLOSE_VIEW_DEEP.themes).length);
  assert.ok(deepMax < interiorMin, 'the Deep stays darker than every other interior');
  for (let i = 0; i < 3; i++) assert.ok(INTERIOR_LIGHT.fogNear.deep[i] < INTERIOR_LIGHT.fogNear.interior[i]);
  for (const [id, t] of themes) assert.ok(t.fog.near + Math.max(...INTERIOR_LIGHT.fogNear[interiorLightKind(t)]) < t.fog.far - 1, `${id}: the fog still closes in before its far edge`);
  assert.ok(CLOSE_VIEW.fog.near + Math.max(...INTERIOR_LIGHT.fogNear.interior) < CLOSE_VIEW.fog.far - 1);
  assert.ok(INTERIOR_LIGHT.dread >= .8 && INTERIOR_LIGHT.dread < 1, 'the Pentagon dread: a little lighter, still closing in');
});

test('the Lantern still lifts the darkness and visibly lengthens the torch indoors', () => {
  assert.ok(litDarkness(.6, 0) < .6 * .25 && litDarkness(.6, LANTERN.radius) === .6 && litDarkness(.6, 1, false) === .6);
  assert.ok(lanternLift(1) > .7);
  const lit = { lantern: { lit: true } }, dark = { lantern: { lit: false } };
  assert.equal(lanternReach(dark, 'dungeon'), 1); assert.ok(lanternReach(lit, 'dungeon') >= 1.4);
  for (const [id, t] of themes) {
    const amb = mean(interiorAmbient(t.light.ambient, interiorLightKind(t), 255)) / 255, torch = mean(t.light.torch) / 255 * t.light.strength;
    const at = (d: number, reach: number) => amb + torch * falloff(d, reach), R = t.light.reach;
    assert.ok(at(4, R * LANTERN.closeReach) > at(4, R) * 1.3, `${id}: four tiles out the Lantern adds a third and more`);
    assert.ok(at(R + .5, R * LANTERN.closeReach) > at(R + .5, R) * 1.05, `${id}: past the torch's reach the Lantern still lights`);
  }
});

test('wiring: Close View reads INTERIOR_LIGHT indoors only; the Standard View dread reads it; no per-frame allocation', () => {
  const cv = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'), rd = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(cv, /const lightKind = flatWorld \|\| outdoor \|\| stillworksCloseView\(g\.map\) \? null : interiorLightKind\(themeOf\(g\.map\)\);/);
  assert.match(cv, /air\.near \+ fogShift \+ \(lightKind \? tierValue\(INTERIOR_LIGHT\.fogNear\[lightKind\], roomS\) : 0\)/);
  assert.match(cv, /ambMean: \(L\.ambient\[0\] \+ L\.ambient\[1\] \+ L\.ambient\[2\]\) \/ 765/, 'the theme\'s mean is made once a theme (themeGL)');
  assert.match(cv, /if \(air \|\| flatWorld \|\| !ROOM_FRAME\.kind\) F\.amb\.set\(air\?\.ambient \|\| tg\.amb\);/);
  assert.equal((cv.match(/Lt\.ambient/g) || []).length, 2, 'the 2D fallback reads the lifted ambient everywhere (made once, kept as is outdoors)');
  assert.match(cv, /GROUND\.torchA !== amb/, 'the cached torch gradient is rebuilt only when the ambient changes');
  assert.match(rd, /const D = INTERIOR_LIGHT\.dread;/);
  assert.match(rd, /\(\.5 \+ share \* \.35\) \* D/);
  assert.match(rd, /penumbra: \{ inner: 2\.2, outer: 6\.5, dark: \.88 \}/, 'the chasm crossing keeps its starfield dark');
});
