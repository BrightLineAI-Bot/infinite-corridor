import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Every module the build ships must parse as JavaScript (Tim, 2026-11-11). Release 875 put a `//` comment in the
// middle of a one-line statement in src/main.ts; the comment swallowed the rest of the line, dist/src/main.js no
// longer parsed and the game failed to load, while every test and the build itself passed. This test applies the
// build's own transform (scripts/build.mjs) to each shipped module and parses the result as an ES module.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('every module the build ships parses as an ES module', () => {
  const build = read('scripts/build.mjs');
  const list = /for\(const f of\[('main'[^\]]*)\]\)\{let s=await readFile/.exec(build)?.[1];
  assert.ok(list, 'module list not found in scripts/build.mjs');
  const modules = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(modules.length > 100, `only ${modules.length} modules found`);
  const sources = modules.map((name) => {
    const s = read(`src/${name}.ts`).replaceAll(".ts'", ".js?v=0'").replaceAll('.ts"', '.js?v=0"');
    return [name, s];
  });
  const checker = `
    const vm = require('node:vm');
    const bad = [];
    for (const [name, source] of JSON.parse(require('node:fs').readFileSync(0, 'utf8'))) {
      try { new vm.SourceTextModule(source, { identifier: 'dist/src/' + name + '.js' }); }
      catch (error) { bad.push(name + '.js: ' + String(error && error.message)); }
    }
    process.stdout.write(JSON.stringify(bad));`;
  const result = spawnSync(process.execPath, ['--experimental-vm-modules', '--no-warnings', '-e', checker], {
    input: JSON.stringify(sources), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), []);
});
