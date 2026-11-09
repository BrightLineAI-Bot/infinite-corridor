import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { selection, verifyMetadata, browserEnvironment, downloadArchive, checkAudit, preflight } from './preflight.mjs';
const repo = 'BrightLineAI-Bot/infinite-corridor';
const input = () => ({ candidate_id: 'r852-aaaaaaaaaaaa', candidate_commit: 'a'.repeat(40), candidate_tree: 'b'.repeat(40),
  payload_digest: 'c'.repeat(64), preview_run_id: '123', artifact_id: '456', archive_digest: 'sha256:' + 'd'.repeat(64) });
const artifact = () => ({ id: 456, name: 'candidate-r852-aaaaaaaaaaaa', expired: false, digest: 'sha256:' + 'd'.repeat(64),
  workflow_run: { id: 123, head_sha: 'a'.repeat(40), head_branch: 'main' } });
const run = () => ({ id: 123, run_attempt: 2, path: '.github/workflows/preview.yml', head_sha: 'a'.repeat(40), head_branch: 'main',
  event: 'push', status: 'completed', conclusion: 'success', html_url: `https://github.com/${repo}/actions/runs/123` });
function fixture(t) { const root = mkdtempSync(join(tmpdir(), 'ic-preflight-test-')); t.after(() => rmSync(root, { recursive: true, force: true })); return root; }
test('exact metadata preserves artifact ID, Preview run attempt and expected binding', () => {
  assert.deepEqual(selection(input()), input());
  const e = verifyMetadata(input(), artifact(), run());
  assert.equal(e.artifact.id, 456); assert.equal(e.preview.run_attempt, 2); assert.equal(e.candidate.candidateTree, 'b'.repeat(40));
});
for (const [name, change] of [
  ['wrong commit', s => s.candidate_commit = 'e'.repeat(40)], ['missing archive digest', s => delete s.archive_digest],
  ['unknown authorization field', s => s.publish = true], ['unsafe run id', s => s.preview_run_id = '1;publish'],
  ['tree abbreviation', s => s.candidate_tree = 'b'.repeat(12)],
]) test(`selection refuses ${name}`, () => { const s = input(); change(s); assert.throws(() => selection(s)); });
for (const [name, change] of [
  ['expired artifact', (a, r) => a.expired = true], ['digest mismatch', a => a.digest = null],
  ['dry-run artifact', a => a.name = 'dryrun-r852-aaaaaaaaaaaa'], ['wrong artifact id', a => a.id = 457],
  ['wrong artifact run', a => a.workflow_run.id = 124], ['wrong artifact branch', a => a.workflow_run.head_branch = 'topic'],
  ['wrong artifact commit', a => a.workflow_run.head_sha = 'e'.repeat(40)],
  ['failed Preview', (a, r) => r.conclusion = 'failure'], ['running Preview', (a, r) => r.status = 'in_progress'],
  ['wrong workflow', (a, r) => r.path = '.github/workflows/publish.yml'], ['PR run', (a, r) => r.event = 'pull_request'],
  ['wrong run URL', (a, r) => r.html_url += '?secret=invalid'], ['imprecise ID', a => a.id = 9007199254740992],
]) test(`metadata refuses ${name}`, () => { const a = artifact(), r = run(); change(a, r); assert.throws(() => verifyMetadata(input(), a, r)); });

test('browser child environment excludes all Actions credentials and injection options', () => {
  assert.deepEqual(browserEnvironment({ PATH: '/usr/bin', HOME: '/tmp/home', GH_TOKEN: 'private', GITHUB_TOKEN: 'private',
    ACTIONS_RUNTIME_TOKEN: 'private', NODE_OPTIONS: '--require inject', CHROME_DEVEL_SANDBOX: '/unsafe', EXTRA: 'private' }),
    { PATH: '/usr/bin', HOME: '/tmp/home' });
});
test('download authenticates only API redirect, hashes exact bytes, and keeps signed URL out of output', async t => {
  const root = fixture(t), bytes = Buffer.from('synthetic archive'), expected = 'sha256:' + createHash('sha256').update(bytes).digest('hex');
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url: String(url), options });
    return calls.length === 1 ? new Response(null, { status: 302, headers: { location: 'https://fixture.blob.core.windows.net/archive?sig=private' } }) : new Response(bytes);
  };
  const result = await downloadArchive('456', 'credential', join(root, 'candidate.zip'), expected, fetcher);
  assert.equal(result.sha256, expected); assert.equal(result.bytes, bytes.length);
  assert.equal(calls[0].options.headers.authorization, 'Bearer credential'); assert.equal(calls[0].options.redirect, 'manual');
  assert.equal(calls[1].options.headers, undefined); assert.equal(calls[1].options.redirect, 'error');
  assert.deepEqual(readFileSync(join(root, 'candidate.zip')), bytes);
  assert.ok(!JSON.stringify(result).includes('sig='));
});
test('download rejects digest mismatch and unexpected storage origins', async t => {
  const root = fixture(t);
  for (const location of ['http://fixture.blob.core.windows.net/x', 'https://evil.invalid/x', 'https://user:pass@fixture.blob.core.windows.net/x']) {
    await assert.rejects(downloadArchive('456', 'credential', join(root, 'unused.zip'), input().archive_digest,
      async () => new Response(null, { status: 302, headers: { location } })), /Unexpected artifact storage origin/);
  }
  let calls = 0;
  await assert.rejects(downloadArchive('456', 'credential', join(root, 'wrong.zip'), input().archive_digest, async () =>
    ++calls === 1 ? new Response(null, { status: 302, headers: { location: 'https://fixture.blob.core.windows.net/x' } }) : new Response('changed')), /digest mismatch/);
});
test('audit reconciliation rejects unavailable Git, wrong tree/digest and authorization', () => {
  const s = input(), good = { candidate: { proposalId: s.candidate_id, candidateCommit: s.candidate_commit, candidateTree: s.candidate_tree },
    payload: { digest: s.payload_digest }, git: { status: 'verified' }, archive: { status: 'matches_supplied_digest' }, publicationAuthorized: false };
  checkAudit(good, s);
  for (const mutate of [r => r.git.status = 'unavailable', r => r.candidate.candidateTree = 'e'.repeat(40), r => r.payload.digest = 'e'.repeat(64), r => r.publicationAuthorized = true]) {
    const r = structuredClone(good); mutate(r); assert.throws(() => checkAudit(r, s));
  }
});
test('preflight retains blocked receipt and logs when input or credentials are unavailable', async t => {
  const root = fixture(t), repositoryDirectory = join(root, 'repo'); mkdirSync(repositoryDirectory);
  for (const [name, s] of [['invalid', {}], ['missing-token', input()]]) {
    const directory = join(root, name), receipt = await preflight({ input: s, directory, repositoryDirectory, token: '' });
    assert.equal(receipt.status, 'blocked'); assert.equal(receipt.rendererClass, 'unknown'); assert.equal(receipt.physicalPhone, 'not_measured');
    assert.equal(receipt.publicationAuthorized, false); assert.equal(receipt.screenshots, 'unavailable');
    assert.equal(JSON.parse(readFileSync(join(directory, 'preflight-receipt.json'))).status, 'blocked');
    assert.ok(readFileSync(join(directory, 'preflight.log'), 'utf8').includes('blocked'));
  }
  await assert.rejects(preflight({ input: input(), directory: repositoryDirectory, repositoryDirectory, token: '' }), /must be a new directory/);
  await assert.rejects(preflight({ input: input(), directory: join(repositoryDirectory, 'output'), repositoryDirectory, token: '' }), /must be disjoint/);
});
test('render-lab artifact failure retains log and blocked receipt without launching a browser', t => {
  const root = fixture(t), candidate = join(root, 'invalid-candidate'), output = join(root, 'render'); mkdirSync(candidate);
  const r = spawnSync(process.execPath, ['testing/render-lab/run.mjs', '--candidate', candidate, '--digest', 'a'.repeat(64), '--out', output], { encoding: 'utf8' });
  assert.equal(r.status, 2, r.stderr);
  const receipt = JSON.parse(readFileSync(join(output, 'receipt.json')));
  assert.equal(receipt.status, 'blocked'); assert.equal(receipt.rendererClass, 'unknown'); assert.equal(receipt.scenarios.length, 0);
  assert.equal(receipt.failureScreenshot.status, 'unavailable'); assert.equal(existsSync(join(output, 'chromium.log')), true);
});

for (const [name, entry] of [['traversal', '../escape'], ['absolute', '/escape'], ['backslash', 'release\\escape'], ['extra root', 'unexpected.txt'], ['case collision', 'release/A']]) {
  test(`bounded extraction refuses ${name} without creating its destination`, t => {
    const root = fixture(t), zip = join(root, 'input.zip'), destination = join(root, 'candidate');
    const made = spawnSync('python3', ['-c', 'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],"w"); z.writestr("candidate.json","{}"); z.writestr("release/a","a"); z.writestr(sys.argv[2],"bad"); z.close()', zip, entry]);
    assert.equal(made.status, 0);
    const extracted = spawnSync('python3', ['testing/render-preflight/extract.py', zip, destination]);
    assert.notEqual(extracted.status, 0); assert.equal(existsSync(destination), false);
  });
}
test('bounded extraction creates only declared files and refuses existing destination', t => {
  const root = fixture(t), zip = join(root, 'input.zip'), destination = join(root, 'candidate');
  const made = spawnSync('python3', ['-c', 'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],"w"); z.writestr("candidate.json","{}"); z.writestr("release/a","abc"); z.writestr("preview-site/b","def"); z.close()', zip]); assert.equal(made.status, 0);
  const args = ['testing/render-preflight/extract.py', zip, destination];
  assert.equal(spawnSync('python3', args).status, 0);
  assert.equal(readFileSync(join(destination, 'release/a'), 'utf8'), 'abc'); assert.equal(readFileSync(join(destination, 'preview-site/b'), 'utf8'), 'def');
  assert.notEqual(spawnSync('python3', args).status, 0);
});

test('manual hosted preflight has read-only permissions, pinned actions, failure upload and no installs/deploys', () => {
  const workflow = readFileSync('.github/workflows/render-preflight.yml', 'utf8');
  assert.match(workflow, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^  (push|pull_request|pull_request_target|workflow_run|schedule):/m);
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.match(workflow, /permissions: \{\}/);
  assert.match(workflow, /contents: read\n      actions: read/);
  assert.doesNotMatch(workflow, /:\s*write\b|secrets\.|sudo|apt-get|npm install|workflow run|git push|pages:|id-token:/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /PREFLIGHT_INPUTS: \$\{\{ toJSON\(inputs\) \}\}/);
  assert.match(workflow, /if: always\(\)/);
  for (const line of workflow.split('\n').filter(line => line.includes('uses:'))) assert.match(line, /uses: actions\/[a-z-]+@[a-f0-9]{40} /);
  assert.match(workflow, /run\/render\/\*\.png/);
  assert.doesNotMatch(workflow, /path:.*candidate\.zip|candidate\/\*\*/);
});

test('archive download stops at the size bound before writing an oversized chunk', async t => {
  const root = fixture(t); let calls = 0;
  await assert.rejects(downloadArchive('456', 'credential', join(root, 'large.zip'), input().archive_digest, async () => {
    if (++calls === 1) return new Response(null, { status: 302, headers: { location: 'https://fixture.blob.core.windows.net/x' } });
    return { ok: true, body: (async function* () { yield { length: 512 * 1024 * 1024 + 1 }; })() };
  }), /Archive exceeds 512 MiB/);
  assert.equal(readFileSync(join(root, 'large.zip')).length, 0);
});
test('bounded extraction refuses symlink entries and excessive entry counts', t => {
  const root = fixture(t);
  for (const kind of ['link', 'count']) {
    const zip = join(root, kind + '.zip'), destination = join(root, kind);
    const source = kind === 'link'
      ? 'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],"w"); z.writestr("candidate.json","{}"); i=zipfile.ZipInfo("release/link"); i.create_system=3; i.external_attr=0o120777<<16; z.writestr(i,"/outside"); z.close()'
      : 'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],"w"); z.writestr("candidate.json","{}"); [z.writestr("release/"+str(i),"") for i in range(10000)]; z.close()';
    assert.equal(spawnSync('python3', ['-c', source, zip]).status, 0);
    const result = spawnSync('python3', ['testing/render-preflight/extract.py', zip, destination], { encoding: 'utf8' });
    assert.notEqual(result.status, 0); assert.equal(existsSync(destination), false);
  }
});
