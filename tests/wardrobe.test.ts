// The Wardrobe (Pack → Wardrobe, wardrobe.ts): the tab, the quick swap through the Pack's own equip, the preview's own GL
// (never the game's Close View context), its pose, and the Standard View helper that restores the sprite globals.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { freshSave } from '../src/types.ts';
import { decodeCloseViewHero, closeViewHeroBodyAsset } from '../src/close-view-hero.ts';
import { WARDROBE, WARDROBE_SLOTS, WARDROBE_GEAR_FLOATS, wardrobeOwned, wardrobeEquip, wardrobePresetLines, wardrobeHeld, createWardrobePose, poseWardrobe, wardrobeCamera } from '../src/wardrobe.ts';
import { drawWayfarerSprite, wayfarerSpriteGlobals } from '../src/renderer.ts';
import { setWayfarerBody } from '../src/journey-start.ts';

const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const main = read('../src/main.ts'), source = read('../src/wardrobe.ts');
const item = (id: string, name: string, slot: string, extra = {}) => ({ id, name, slot, power: 6, tier: 'rare', ...extra });
const journey = () => { const s: any = freshSave(); s.seed = 'WARDROBE'; return s; };

test('the Pack has a Wardrobe tab, right after Gear, and the Gear tab keeps its own Equip', () => {
  const m = /const PACK_TABS=(\[.*?\]\]);/.exec(main); assert.ok(m, 'PACK_TABS');
  const ids = [...m![1].matchAll(/\['(\w+)','(\w+)'\]/g)].map((q) => q[1]);
  assert.deepEqual(ids, ['wayfarer', 'gear', 'wardrobe', 'forge', 'arcanum', 'supplies']);
  assert.match(main, /if \(packTab === "wardrobe"\) try\{[\s\S]*?mountWardrobe\(body,/);
  assert.match(main, /uiButton\("Equip", \(\) => \{\s*equipCarried\(i\);/, 'the Gear tab equips through the shared function');
  assert.match(main, /function equipCarried\(index\) \{ const ok = equipFromInventory\(save, index\);/, 'which keeps equipFromInventory\'s rules');
  assert.match(main, /carried: \(i\) => equipCarried\(i\), slung: \(i\) => equipSlung\(i\)/, 'the Wardrobe hands in the same functions');
  assert.match(main, /swapPreset: \(\) => swapPresetNow\(\)/);
  assert.match(main, /if\(\(save\.magicSkills\.preset\|\|0\)!==i\)swapPresetNow\(\)/, 'the Arcanum switches presets the same way');
  // released whenever the Pack shows anything else, and when the Pack closes
  assert.match(main, /function packTabBar\(current\)\{closeWardrobe\(\);/);
  assert.match(main, /panel\.addEventListener\("close",closeWardrobe\)/);
});

test('quick swap lists what you own by slot and equips only through the functions handed in', () => {
  const s = journey();
  s.inventory.push(item('primary-verge-cleaver', 'Verge Cleaver', 'primary'), item('armor-x', 'Glass Coat', 'armor'), item('charm-x', 'Charm', 'charm'), null);
  s.sling = [item('secondary-great-sweep', 'Great Sweep', 'secondary')];
  const groups = wardrobeOwned(s);
  assert.deepEqual(groups.map((g) => g.slot), WARDROBE_SLOTS.map(([slot]) => slot));
  assert.deepEqual(groups.map((g) => g.items.map((e) => `${e.source}:${e.item.name}`)), [
    [`equipped:${s.equipment.primary.name}`, 'pack:Verge Cleaver'],
    [`equipped:${s.equipment.secondary.name}`, 'sling:Great Sweep'],
    [`equipped:${s.equipment.armor.name}`, 'pack:Glass Coat'],
  ]);
  const calls: string[] = [], equip = { carried: (i: number) => { calls.push(`pack ${i}`); return true; }, slung: (i: number) => { calls.push(`sling ${i}`); return { ok: true, message: '' }; } };
  for (const g of groups) for (const e of g.items) wardrobeEquip(e, equip);
  assert.deepEqual(calls, [`pack ${s.inventory.findIndex((q: any) => q?.name === 'Verge Cleaver')}`, 'sling 0', `pack ${s.inventory.findIndex((q: any) => q?.name === 'Glass Coat')}`]);
  assert.equal(wardrobeEquip(groups[0].items[0], equip), false, 'the equipped piece is not equipped again');
  assert.doesNotMatch(source, /save\.equipment\[[^\]]+\]\s*=/, 'the Wardrobe never writes the equipment itself');
  const lines = wardrobePresetLines(s);
  assert.match(lines[0], /^Preset 1 \(in use\): /); assert.match(lines[1], /^Preset 2: preset 1's weapon · preset 1's tool$/);
  s.presetGear = [{ primary: null, secondary: null }, { primary: item('primary-cinder-pike', 'Cinder Pike', 'primary'), secondary: null }];
  assert.match(wardrobePresetLines(s)[1], /^Preset 2: Cinder Pike \+0 · preset 1's tool$/);
});

test('the preview has its own context and programs: it never touches the game\'s Close View GL state', () => {
  const imports = [...source.matchAll(/^import .* from '([^']+)';/gm)].map((m) => m[1]);
  assert.ok(imports.length > 5 && !imports.includes('./close-view-gl.ts') && !imports.includes('./close-view.ts'), 'no import of the game\'s Close View GL module or the view that owns it');
  assert.doesNotMatch(source, /import\(/, 'nor a dynamic one');
  assert.doesNotMatch(source, /closeViewGLReady|resetCloseViewGL|prepareCloseViewHeroGL|drawSceneGL|closeViewGLCanvas/);
  assert.match(source, /canvas\.getContext\('webgl2'/, 'its own WebGL2 context on its own canvas');
  assert.match(source, /createHeroGL\(gl, compile, VS_COMMON, FS_COMMON\)/, 'its own hero program');
  assert.match(source, /loseContext\(\)/, 'released when the tab closes');
  // the module list: built and precached in both workers
  assert.match(read('../scripts/build.mjs'), /'build-presets','wardrobe'/);
  assert.ok(read('../sw.js').includes('"./src/wardrobe.js?v='));
  assert.ok(read('../proving-ground/sw.js').includes('"../src/wardrobe.js?v='));
});

test('what the preview holds is what the game holds at rest', () => {
  const s = journey();
  s.equipment.primary = item('primary-verge-cleaver', 'Verge Cleaver', 'primary'); s.equipment.secondary = item('secondary-great-sweep', 'Great Sweep', 'secondary');
  assert.deepEqual(wardrobeHeld(s), { held: 'verge-cleaver', profile: 'verge-cleaver', offhand: 'great-sweep', single: false, carbine: false });
  assert.equal(wardrobeHeld(s, false, true).offhand, 'great-sweep', 'the sweep is held beside the weapon either way');
  s.equipment.secondary = item('spark-coil', 'Spark Coil', 'secondary');
  assert.equal(wardrobeHeld(s).profile, 'verge-cleaver');
  assert.deepEqual(wardrobeHeld(s, false, true), { held: 'emitter', profile: 'spark-coil', offhand: '', single: false, carbine: false });
  assert.equal(wardrobeHeld(s, true).held, 'fist', 'the Iron Fists');
});

test('the preview pose: finite, both bodies, held gear written, idle sways only without reduced motion', () => {
  const meta = JSON.parse(read('../assets/wayfarer/rogue-v2.json')), file = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
  const male = decodeCloseViewHero(meta, file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  const s = journey(); s.equipment.secondary = item('secondary-great-sweep', 'Great Sweep', 'secondary');
  for (const body of ['male', 'female']) {
    setWayfarerBody(s, body); const asset = closeViewHeroBodyAsset(male, body), st = createWardrobePose(asset);
    assert.equal(st.gearVertices.length, WARDROBE_GEAR_FLOATS);
    for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI / 4]) {
      assert.equal(poseWardrobe(st, s, { yaw: WARDROBE.frontYaw + yaw, nowMs: 1234 }), true, `${body} ${yaw}`);
      for (const v of st.frame.positionsNormals) assert.ok(Number.isFinite(v));
      assert.ok(st.gearFloats > 0 && st.gearFloats % 10 === 0, 'the weapon, the kit and the sweep');
      for (let i = 0; i < st.gearFloats; i++) assert.ok(Number.isFinite(st.gearVertices[i]));
    }
    let top = -Infinity; for (let i = 2; i < st.frame.positionsNormals.length; i += 6) top = Math.max(top, st.frame.positionsNormals[i]);
    assert.ok(top > 1 && top < 1.6, `standing about ${WARDROBE.height.toFixed(2)} tiles tall (${top})`);
    const at = (ms: number, reducedMotion: boolean) => { poseWardrobe(st, s, { nowMs: ms, reducedMotion }); return Float32Array.from(st.frame.positionsNormals); };
    assert.deepEqual(at(1000, true), at(2600, true), 'reduced motion: held still');
    assert.notDeepEqual(at(1000, false), at(2600, false), 'otherwise the idle breathes');
  }
  const cam = wardrobeCamera(400, 500);
  assert.ok(cam.sinP > 0 && cam.hc > WARDROBE.camera.target, 'chest height, looking a little down');
  assert.deepEqual([cam.rx, cam.ry], [-cam.fy, cam.fx], 'the game\'s right-hand convention');
});

test('drawWayfarerSprite draws the Wayfarer alone and restores the sprite globals, even when the draw throws', () => {
  const calls: string[] = [];
  const ctx: any = new Proxy({}, { get: (_t, k) => k === 'fillRect' ? (...a: number[]) => calls.push(a.join(',')) : typeof k === 'string' && /^[a-z]/.test(k) && !['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'lineCap'].includes(k) ? () => {} : undefined, set: () => true });
  const before = wayfarerSpriteGlobals(); assert.deepEqual(before, { handsFree: false, salvage: false, body: 'male' });
  const s = journey(); setWayfarerBody(s, 'female'); s.equipment.primary = { id: 'salvage-blade', name: 'Salvage Blade', slot: 'primary', power: 1 };
  drawWayfarerSprite(ctx, s, 40, 1, 1);
  assert.ok(calls.length > 8, 'rects drawn');
  assert.deepEqual(wayfarerSpriteGlobals(), before);
  const male: string[] = []; const ctx2: any = new Proxy(ctx, { get: (t, k) => k === 'fillRect' ? (...a: number[]) => male.push(a.join(',')) : t[k] });
  setWayfarerBody(s, 'male'); drawWayfarerSprite(ctx2, s, 40, 1, 1); assert.notDeepEqual(male, calls, 'the body is the save\'s');
  const broken: any = new Proxy({}, { get: () => { throw new Error('no canvas'); }, set: () => true });
  setWayfarerBody(s, 'female'); assert.throws(() => drawWayfarerSprite(broken, s, 40)); assert.deepEqual(wayfarerSpriteGlobals(), before);
});
