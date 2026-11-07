import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = readdirSync(resolve(root, 'tests'))
  .filter((name) => name.endsWith('.test.ts'))
  .sort().map((name) => `tests/${name}`);
const isolated = 'tests/tower-seals.test.ts';
if (!files.includes(isolated)) throw new Error('Missing required generation performance suite');
const args = process.argv.slice(2);
let failed = false;
for (const group of [[isolated], files.filter((file) => file !== isolated)]) {
  if (!group.length) continue;
  const result = spawnSync(process.execPath, ['--test', ...args, ...group], {
    cwd: root, stdio: 'inherit', env: process.env,
  });
  if (result.error) throw result.error;
  if (result.signal) {
    console.error(`Test process terminated by ${result.signal}`);
    process.exit(1);
  }
  failed ||= result.status !== 0;
}
process.exitCode = failed ? 1 : 0;
