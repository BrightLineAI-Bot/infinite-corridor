import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('nonpublishing render evidence contracts run in ordinary PR CI without launching Chrome', () => {
  const files = ['testing/render-lab', 'testing/render-preflight'].flatMap(directory =>
    readdirSync(directory).filter(name => name.endsWith('.test.mjs')).sort().map(name => `${directory}/${name}`));
  // Node marks test children with NODE_TEST_CONTEXT; forwarding it can silently skip nested --test files.
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', ...files], { encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024, env });
  assert.equal(result.status, 0, String(result.stdout) + String(result.stderr));
  assert.match(result.stdout, /download authenticates only API redirect/);
  assert.match(result.stdout, /diagnostics import shares the live versioned module instance/);
});
