import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { candidateId, freeze, verifyCandidate, stagePreview, stageRelease, previewsByAge, resolveCandidate, sourceRelease } from '../scripts/pages-release.mjs';

// GitHub Actions previews and publishing (Tim, 2026-10-18). The fixture dist carries the
// current release number, because src/release-artifact.mjs replaces that exact number.
const N = sourceRelease(new URL('..', import.meta.url).pathname);
const COMMIT = 'a1b2c3d4e5f6'.padEnd(40, '0'), TREE = 'f'.repeat(40), ID = `r${N}-a1b2c3d4e5f6`;
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function git(cwd: string, ...args: string[]) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
function commitAll(site: string, message: string) {
  git(site, 'add', '--all');
  git(site, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', message, '--date', '2026-10-01T00:00:00Z');
}

function candidate(commit = COMMIT) {
  const root = mkdtempSync(join(tmpdir(), 'ic-pages-'));
  const files: Record<string, string> = {
    'index.html': `<link href="./styles.css?v=${N}"><script>const release = "${N}";</script>`,
    'sw.js': `const CACHE_PREFIX="infinite-corridor-",CACHE=\`\${CACHE_PREFIX}v${N}\`,A=["./src/main.js?v=${N}"];`,
    'manifest.webmanifest': '{}', 'styles.css': 'body{}', 'icon.svg': '<svg/>', 'assets/a.png': 'px',
    'src/main.js': `const d={release:${N}};const t=\`Release ${N}\\n\`;`,
    'src/proving-ground-mobile.js': `import "./proving-ground.js?v=${N}";const rows={"Game release":"${N}"};const storageNamespace="ic-proving-ground-scratch-v1";`,
    'src/proving-ground.js': 'export const scratch=true;', 'src/persistence.js': 'export {};',
    'proving-ground/index.html': `<title>Infinite Corridor - Proving Ground</title><link rel="stylesheet" href="../styles.css?v=${N}"><strong>PROVING GROUND</strong><script>const release = "${N}"; const entry = "../src/proving-ground-mobile.js";</script>`,
    'proving-ground/manifest.webmanifest': JSON.stringify({ name: 'Lab', icons: [{ src: '../icon.svg' }] }),
    'proving-ground/sw.js': `const PREFIX="ic-proving-ground-",CACHE=\`\${PREFIX}pg1-r${N}\`,A=["../styles.css?v=${N}"];`,
  };
  for (const [file, text] of Object.entries({ 'index.html': files['index.html'] })) writeFileSync(join(root, file), text);
  for (const [file, text] of Object.entries(files)) { mkdirSync(join(root, 'dist', file, '..'), { recursive: true }); writeFileSync(join(root, 'dist', file), text); }
  const out = join(root, 'candidate');
  const frozen = freeze({ root, dist: join(root, 'dist'), out, commit, tree: TREE });
  return { root, out, frozen };
}

// A gh-pages checkout: live release at the root, a dozen older previews, the live one oldest.
function site(previews = 12) {
  const dir = mkdtempSync(join(tmpdir(), 'ic-site-'));
  git(dir, 'init', '-q');
  writeFileSync(join(dir, 'index.html'), 'live');
  writeFileSync(join(dir, 'release-identity.json'), JSON.stringify({ proposalId: 'icp_live', candidateCommit: 'c'.repeat(40), candidateTree: 'd'.repeat(40) }));
  for (const name of ['icp_live', ...Array.from({ length: previews - 1 }, (_, i) => `icp_${String(i).padStart(2, '0')}`)]) {
    mkdirSync(join(dir, 'previews', name), { recursive: true });
    writeFileSync(join(dir, 'previews', name, 'index.html'), name);
    commitAll(dir, `Preview ${name}`);
  }
  return dir;
}

test('candidate ids name the release and the commit', () => {
  assert.equal(candidateId('181', 'abcdef0123456789abcdef0123456789abcdef01'), 'r181-abcdef012345');
  assert.throws(() => candidateId('181', 'abc'), /full commit/);
  assert.throws(() => candidateId('x', 'a'.repeat(40)), /release number/);
});

test('freeze versions the release with the candidate id and binds release-identity.json', () => {
  const { out, frozen } = candidate();
  assert.equal(frozen.id, ID);
  assert.match(readFileSync(join(out, 'release/index.html'), 'utf8'), new RegExp(`const release = "${ID}"`));
  assert.match(readFileSync(join(out, 'release/src/main.js'), 'utf8'), new RegExp(`release: "${ID}"`));
  const identity = JSON.parse(readFileSync(join(out, 'release/release-identity.json'), 'utf8'));
  assert.deepEqual(Object.keys(identity), ['proposalId', 'candidateCommit', 'candidateTree']);
  assert.deepEqual(identity, { proposalId: ID, candidateCommit: COMMIT, candidateTree: TREE });
  assert.equal(verifyCandidate(out).id, ID);
  writeFileSync(join(out, 'release/styles.css'), 'tampered');
  assert.throws(() => verifyCandidate(out), /artifact changed/);
});

test('freeze refuses a release that release-artifact.mjs was not bumped for', () => {
  const root = mkdtempSync(join(tmpdir(), 'ic-pages-'));
  mkdirSync(join(root, 'dist/src'), { recursive: true });
  mkdirSync(join(root, 'dist/proving-ground'), { recursive: true });
  writeFileSync(join(root, 'index.html'), 'const release = "99999"');
  for (const file of ['index.html', 'sw.js', 'manifest.webmanifest', 'styles.css', 'icon.svg', 'src/main.js', 'src/proving-ground.js', 'proving-ground/index.html', 'proving-ground/manifest.webmanifest', 'proving-ground/sw.js']) writeFileSync(join(root, 'dist', file), file.endsWith('manifest.webmanifest') ? '{}' : 'const release = "99999"');
  writeFileSync(join(root, 'dist/src/proving-ground-mobile.js'), '"Game release":"99999"');
  mkdirSync(join(root, 'dist/assets'));
  assert.throws(() => freeze({ root, dist: join(root, 'dist'), out: join(root, 'c'), commit: COMMIT, tree: TREE }), /release-artifact\.mjs bumped/);
});

test('preview staging adds previews/<id>, keeps the newest 10 plus the live one, and leaves the live site alone', () => {
  const { out } = candidate(), dir = site(12);
  assert.equal(previewsByAge(dir)[0], 'icp_10');
  const result = stagePreview({ site: dir, candidate: out });
  assert.equal(result.url, `https://brightlineai-bot.github.io/infinite-corridor/previews/${ID}/`);
  const left = readdirSync(join(dir, 'previews')).sort();
  assert.equal(left.length, 11);
  assert.ok(left.includes(ID) && left.includes('icp_live'));
  assert.deepEqual(result.pruned.sort(), ['icp_00', 'icp_01']);
  assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), 'live');
  assert.ok(existsSync(join(dir, 'previews', ID, 'sw.js')));
  assert.ok(!existsSync(join(dir, 'previews', ID, 'src/main.js')), 'previews never carry the production entry');
});

test('preview staging is repeatable for the same commit', () => {
  const { out } = candidate(), dir = site(3);
  stagePreview({ site: dir, candidate: out });
  commitAll(dir, `Preview ${ID}`);
  stagePreview({ site: dir, candidate: out });
  assert.equal(git(dir, 'status', '--porcelain'), '');
});

test('preview staging refuses a shallow gh-pages checkout', () => {
  const { out } = candidate(), origin = site(3), dir = mkdtempSync(join(tmpdir(), 'ic-shallow-'));
  git(dir, 'clone', '-q', '--depth', '1', `file://${origin}`, '.');
  assert.throws(() => stagePreview({ site: dir, candidate: out }), /shallow/);
});

test('release staging requires the matching preview and keeps previews/', () => {
  const { out } = candidate(), dir = site(3);
  assert.throws(() => stageRelease({ site: dir, candidate: out }), /no preview on gh-pages/);
  stagePreview({ site: dir, candidate: out });
  commitAll(dir, `Preview ${ID}`);
  writeFileSync(join(dir, 'previews', ID, 'index.html'), 'something else');
  assert.throws(() => stageRelease({ site: dir, candidate: out }), /differs from the candidate/);
  git(dir, 'checkout', '-q', '--', '.');
  writeFileSync(join(dir, 'CNAME'), 'example.org');
  const result = stageRelease({ site: dir, candidate: out });
  assert.equal(result.previous.proposalId, 'icp_live');
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'release-identity.json'), 'utf8')), { proposalId: ID, candidateCommit: COMMIT, candidateTree: TREE });
  assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), readFileSync(join(out, 'release/index.html'), 'utf8'));
  assert.deepEqual(readdirSync(join(dir, 'previews')).sort(), ['icp_00', 'icp_01', 'icp_live', ID].sort());
  assert.equal(readFileSync(join(dir, 'CNAME'), 'utf8'), 'example.org', 'hand-added Pages files survive a publish');
});

test('publish resolves only candidate artifacts from preview.yml runs on main', async () => {
  const sha = (c: string) => c.repeat(40);
  const runs: Record<number, any> = {
    1: { path: '.github/workflows/preview.yml', head_branch: 'main', event: 'push' },
    2: { path: '.github/workflows/preview.yml', head_branch: 'main', event: 'push' },
    3: { path: '.github/workflows/other.yml', head_branch: 'main', event: 'push' },
    4: { path: '.github/workflows/preview.yml', head_branch: 'feature', event: 'workflow_dispatch' },
  };
  const artifacts = [
    { name: `candidate-r1-${sha('a').slice(0, 12)}`, created_at: '2026-10-01T00:00:00Z', expired: false, workflow_run: { id: 1, head_branch: 'main', head_sha: sha('a') } },
    { name: `candidate-r2-${sha('b').slice(0, 12)}`, created_at: '2026-10-02T00:00:00Z', expired: false, workflow_run: { id: 2, head_branch: 'main', head_sha: sha('b') } },
    { name: `candidate-r3-${sha('c').slice(0, 12)}`, created_at: '2026-10-03T00:00:00Z', expired: false, workflow_run: { id: 3, head_branch: 'main', head_sha: sha('c') } },
    { name: `candidate-r4-${sha('d').slice(0, 12)}`, created_at: '2026-10-04T00:00:00Z', expired: false, workflow_run: { id: 4, head_branch: 'feature', head_sha: sha('d') } },
    { name: `dryrun-r5-${sha('e').slice(0, 12)}-9`, created_at: '2026-10-05T00:00:00Z', expired: false, workflow_run: { id: 1, head_branch: 'main', head_sha: sha('e') } },
  ];
  const api = async (path: string) => {
    const run = /\/runs\/(\d+)$/.exec(path);
    if (run) return runs[Number(run[1])];
    const name = /&name=([\w-]+)/.exec(path)?.[1];
    return { artifacts: artifacts.filter(a => !name || a.name === name) };
  };
  assert.deepEqual(await resolveCandidate({ repo: 'o/r', api }), { id: `r2-${sha('b').slice(0, 12)}`, artifact: `candidate-r2-${sha('b').slice(0, 12)}`, runId: 2, commit: sha('b') });
  assert.equal((await resolveCandidate({ repo: 'o/r', candidate: 'aaaaaaa', api })).runId, 1);
  assert.equal((await resolveCandidate({ repo: 'o/r', candidate: `r1-${sha('a').slice(0, 12)}`, api })).commit, sha('a'));
  await assert.rejects(resolveCandidate({ repo: 'o/r', candidate: `r4-${sha('d').slice(0, 12)}`, api }), /no unexpired preview/);
  await assert.rejects(resolveCandidate({ repo: 'o/r', candidate: '$(rm -rf /)', api }), /must be a preview id/);
});

test('workflows are least-privilege, pinned, and share the pages concurrency group', () => {
  const workflows = Object.fromEntries(['ci', 'preview', 'publish'].map(name => [name, read(`.github/workflows/${name}.yml`)]));
  for (const [name, text] of Object.entries(workflows)) {
    assert.doesNotMatch(text, /pull_request_target|workflow_run|secrets\./, name);
    assert.match(text, /^permissions:/m, `${name} declares top-level permissions`);
    for (const use of text.matchAll(/uses:\s*(\S+)/g)) assert.match(use[1], /^[\w-]+\/[\w-]+@[0-9a-f]{40}$/, `${name}: ${use[1]} is pinned by SHA`);
    // Untrusted text reaches scripts only through environment variables.
    for (const line of text.split('\n').filter(l => /\$\{\{[^}]*\b(inputs|github\.event)\./.test(l)))
      assert.match(line, /^\s*(?:[A-Z_]+|if|run-name):/, `${name}: ${line.trim()}`);
  }
  assert.match(workflows.ci, /^permissions:\n  contents: read$/m);
  assert.match(workflows.ci, /node-version: 24/);
  for (const name of ['preview', 'publish']) {
    assert.match(workflows[name], /^permissions: \{\}$/m);
    assert.match(workflows[name], /concurrency:\n      group: pages\n      cancel-in-progress: false/);
  }
  assert.match(workflows.publish, /workflow_dispatch:/);
  assert.match(workflows.publish, /dry_run:[\s\S]*?default: true/);
  assert.match(read('.github/CODEOWNERS'), /^\/\.github\/ @BrightLineAI-Bot$/m);
});
