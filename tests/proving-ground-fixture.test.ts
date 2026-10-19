import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const root = fileURLToPath(new URL('../', import.meta.url));
const windows = process.platform === 'win32';
const npm = windows ? 'npm.cmd' : 'npm';
const options = { cwd: root, shell: windows };

function request(path: string): Promise<{status: number, type: string, body: string}> {
  return new Promise((resolve, reject) => {
    const req = http.get({hostname: '127.0.0.1', port: 5174, path}, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({status: res.statusCode!, type: String(res.headers['content-type']), body}));
    });
    req.setTimeout(5000, () => req.destroy(new Error('HTTP timeout')));
    req.on('error', reject);
  });
}

test('npm run build succeeds and emits production-backed laboratory assets', () => {
  const result = spawnSync(npm, ['run', 'build'], {...options, encoding: 'utf8', timeout: 60000});
  assert.equal(result.status, 0, `${result.error || ''}\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Built static offline PWA/);
  assert.match(readFileSync(new URL('../dist/proving-ground/index.html', import.meta.url), 'utf8'), /PROVING GROUND/);
  assert.match(readFileSync(new URL('../dist/src/proving-ground-mobile.js', import.meta.url), 'utf8'), /proving-ground/);
});

test('actual npm fixture builds then serves fixed loopback production assets, not repository files', {timeout: 60000}, async () => {
  const child = spawn(npm, ['run', 'start:proving-ground:fixture'], {
    ...options, detached: !windows, stdio: ['ignore', 'pipe', 'pipe'],
    // Fixture mode must not honor LAN host or alternate-port overrides.
    env: {...process.env, HOST: '0.0.0.0', PORT: '5999'},
  });
  let output = '';
  let errors = '';
  child.stderr!.on('data', chunk => { errors += chunk; });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Readiness timeout: ${output}\n${errors}`)), 30000);
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.on('exit', code => { clearTimeout(timer); reject(new Error(`Fixture exited ${code}: ${output}\n${errors}`)); });
      child.stdout!.on('data', chunk => {
        output += chunk;
        if (output.includes('Infinite Corridor at http://127.0.0.1:5174/proving-ground/')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    assert.match(output, /Built static offline PWA/);
    const page = await request('/proving-ground/?lab=ordinary-dungeon&seed=fixture');
    assert.equal(page.status, 200);
    assert.match(page.type, /text\/html/);
    assert.match(page.body, /PROVING GROUND/);
    assert.equal(page.body, readFileSync(new URL('../dist/proving-ground/index.html', import.meta.url), 'utf8'));
    for (const path of ['/styles.css?v=199', '/src/proving-ground-mobile.js?v=199', '/src/proving-ground.js?v=199', '/proving-ground/manifest.webmanifest', '/proving-ground/sw.js', '/icon.svg']) {
      const result = await request(path);
      assert.equal(result.status, 200, path);
      assert.ok(result.body.length > 0, path);
      if (path.includes('.js')) assert.match(result.type, /text\/javascript/);
    }
    const worker = await request('/proving-ground/sw.js');
    assert.match(worker.body, /ic-proving-ground-/);
    const module = await request('/src/proving-ground-mobile.js?v=199');
    assert.equal(module.body, readFileSync(new URL('../dist/src/proving-ground-mobile.js', import.meta.url), 'utf8'));
    for (const path of ['/package.json', '/AGENTS.md', '/scripts/dev.mjs', '/src/proving-ground-mobile.ts', '/%2e%2e/package.json', '/%2e%2e%2finfinite-corridor/package.json', '/%ZZ']) {
      assert.equal((await request(path)).status, 404, path);
    }
  } finally {
    if (child.pid) {
      if (windows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {encoding: 'utf8'});
      else {
        try { process.kill(-child.pid, 'SIGTERM'); } catch (error: any) { if (error.code !== 'ESRCH') throw error; }
      }
    }
    if (child.exitCode === null && child.signalCode === null) await new Promise<void>(resolve => child.once('exit', () => resolve()));
  }
});
