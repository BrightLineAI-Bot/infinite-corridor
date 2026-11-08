import test from 'node:test';
import assert from 'node:assert/strict';
import { closeViewHeroAssetUrl } from '../src/close-view-hero.ts';

test('hero metadata URL preserves the normal hosted application base', () => {
  assert.equal(
    closeViewHeroAssetUrl('https://example.test/infinite-corridor/src/close-view-hero.js').href,
    'https://example.test/infinite-corridor/assets/wayfarer/rogue-v2.json',
  );
});

test('hero metadata URL preserves the exact nested preview candidate prefix', () => {
  assert.equal(
    closeViewHeroAssetUrl('https://example.test/releases/previews/candidate_820/src/close-view-hero.js').href,
    'https://example.test/releases/previews/candidate_820/assets/wayfarer/rogue-v2.json',
  );
});

test('module query and hash never leak into the asset URL', () => {
  assert.equal(
    closeViewHeroAssetUrl('https://example.test/previews/candidate_820/src/close-view-hero.js?v=820#module').href,
    'https://example.test/previews/candidate_820/assets/wayfarer/rogue-v2.json',
  );
});

test('file URLs retain Windows drive and encoded workspace paths', () => {
  assert.equal(
    closeViewHeroAssetUrl('file:///C:/Users/Example/Infinite%20Corridor/src/close-view-hero.ts?dev=1#source').href,
    'file:///C:/Users/Example/Infinite%20Corridor/assets/wayfarer/rogue-v2.json',
  );
  assert.equal(
    closeViewHeroAssetUrl(new URL('file:///workspace/project/src/close-view-hero.js')).href,
    'file:///workspace/project/assets/wayfarer/rogue-v2.json',
  );
});

test('unsupported module layouts are refused without an origin-wide fallback', () => {
  for (const url of [
    'https://example.test/infinite-corridor/dist/close-view-hero.js',
    'https://example.test/infinite-corridor/src/runtime/close-view-hero.js',
    'https://example.test/infinite-corridor/src/close-view-hero.mjs',
    'file:///C:/workspace/close-view-hero.ts',
  ]) assert.throws(() => closeViewHeroAssetUrl(url), /Unsupported hero module URL layout/);
});
